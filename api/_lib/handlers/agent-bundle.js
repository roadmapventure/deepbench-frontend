// DeepBench v7.0.682 | api/_lib/handlers/agent-bundle.js | AGT-162 -- one DeepBench agent's whole
// knowledge bundle, handed to an outside model with NO model call on DeepBench's side.
//
// WHY THIS EXISTS. Every `tools/call` on the MCP server reaches runCapability() -- a model call.
// That is right for a capability whose product IS a model turn, and wrong for the one thing an
// outside platform actually wants from DeepBench: the agent's scaffold, so ITS model can reason as
// that agent. This handler is that read. `no_inference: true` in the return is the contract, and
// the absent `model` on this call's ai_activity_log row is the proof of it.
//
// HOW IT IS REACHED -- named in data, never by a slug conditional. The Intent Skill row
// `agent-bundle-intent` carries `traits.handler = 'agent-bundle'`; api/_lib/mcp.js's
// DETERMINISTIC_HANDLERS is keyed on that NAME, exactly as api/prompt/request-receivable.js's
// HANDLERS is keyed on `format_contract.handler`. Nothing here and nothing there knows the string
// `dan-db-assembly` (.claude/rules/capabilities-are-data.md).
//
// WHY IT READS THE PRIMITIVES AND NOT JUST THE ASSEMBLED PROMPT. buildSections() renders the agents
// row and the `role_prompt` configs only inside an identity-type Skill's branch, so an agent with no
// Skill rows assembles to no identity at all. The Teach screen writes `knowledge_entries` (never
// `the_library`), and role prompts / guardrails are `agent_configs` rows. A bundle built from
// assemblePrompt() alone would silently omit all three for exactly the agents that have nothing else.
//
// §19c, AND WHY THIS IS NOT A CROSS-AGENT READ. The target id comes from the CALLER, and the
// requester IS the target: every read below is that agent's own row (`requestingAgentId: t`), the
// same posture api/plan.js and lib/agent-run.js take for the agent they are running. No Skill row of
// Dan's names any agent (§19d/§19e Rule #1). The Library is reached only through Eleanor Voss's
// broker, so an agent with no data-room credential gets `denied-no-access` REPORTED rather than a
// Library invented for it.
//
// THE LANE RULE IS THE TARGET'S, and it is the same predicate visibleRows() applies to the tool
// list: product lane is open to anyone past the HAR-33 gate, everything else needs the governance
// key. A hidden agent and an agent that does not exist get the IDENTICAL message on purpose -- a
// distinct "exists but hidden" would make this tool an agent-inventory oracle.

import { assemblePrompt } from '../../prompt/db-assembly.js';
import { queryContent } from '../../../lib/search-harness.js';
import { logActivity } from '../../../lib/activity-log.js';

// The four sections that describe THIS call rather than the agent. A bundle is the agent's standing
// scaffold, so the per-call task/voice tail is dropped: assemblePrompt() is handed an empty
// task_context, and these render empty or templated regardless.
const PER_CALL_SLUGS = Object.freeze(['current-task', 'task-details', 'prior-conversation', 'voice']);

async function sbSelect(pathAndQuery) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not configured');
  const res = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase read failed (${pathAndQuery.split('?')[0]}): HTTP ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error(`Supabase read returned a non-array for ${pathAndQuery.split('?')[0]}`);
  return rows;
}

/**
 * @param agent_id         the HOLDER of the capability (Dan) -- who executed, for the audit row.
 * @param tenant_id        the capability row's tenant.
 * @param content          the CALLER's task_context. `content.agent_id` is the TARGET agent.
 * @param handler_context  { governance_unlocked } -- the MCP key's scope, decided in mcp.js.
 */
export async function handle({ agent_id, tenant_id, content, handler_context }) {
  const startTime = Date.now();
  const tenant = tenant_id || 'global';
  const t = content && content.agent_id;

  if (typeof t !== 'string' || !t.trim()) {
    throw new Error('agent_bundle requires task_context.agent_id -- the id of the agent whose bundle you want');
  }

  const agentRows = await sbSelect(
    `agents?id=eq.${encodeURIComponent(t)}&select=id,name,role,specialty,bio,lane,is_active,data_room_access&limit=1`,
  );
  const agentRow = agentRows[0];
  // ONE MESSAGE FOR THREE FACTS -- absent, retired, and governance-lane-without-the-key. See the
  // header: distinguishing them would publish the inventory this tool deliberately does not publish.
  if (
    !agentRow ||
    agentRow.is_active !== true ||
    (agentRow.lane !== 'product' && handler_context?.governance_unlocked !== true)
  ) {
    throw new Error(`Unknown agent: ${t}`);
  }

  const agent = {
    id: agentRow.id,
    name: agentRow.name,
    role: agentRow.role,
    specialty: agentRow.specialty,
    bio: agentRow.bio,
  };

  const configs = await sbSelect(
    `agent_configs?agent_id=eq.${encodeURIComponent(t)}&tenant_id=eq.${encodeURIComponent(tenant)}` +
      '&select=type,name,text&order=type,name',
  );
  const ofType = type => configs.filter(c => c.type === type).map(c => ({ name: c.name, text: c.text }));
  const role_prompts = ofType('role_prompt');
  const guardrails = ofType('guardrail');
  const output_formats = ofType('output_format');

  // No capability_slug: assemblePrompt() loads every capability assigned to the agent, which is
  // exactly "everything this agent knows how to do" -- the bundle's subject.
  const assembled = await assemblePrompt({ agent_id: t, tenant_id: tenant, task_context: {} });
  const sections = (assembled.sections || [])
    .filter(s => !PER_CALL_SLUGS.includes(s.slug))
    // Projected field by field, never spread: `order`/`prompt_phase`/`required` are assembly
    // internals, and a spread would publish whatever column a future section gains.
    .map(s => ({
      slug: s.slug,
      label: s.label,
      type: s.type,
      content: s.content,
      fetch_instruction: s.fetch_instruction,
    }));

  // The Teach screen's own corpus (api/load-entries.js -> lib/knowledge-write.js), oldest first so
  // the calling model reads it in the order it was taught.
  const knowledge_entries = await sbSelect(
    `knowledge_entries?agent_id=eq.${encodeURIComponent(t)}&tenant_id=eq.${encodeURIComponent(tenant)}` +
      '&status=eq.active&select=id,title,category,content,teaching_note,source,created_at&order=created_at.asc',
  );

  // Eleanor Voss's query-free brokered catalog read -- no embedding, no model, and reached through
  // the ONE public broker by its generic `store` field (`the_library_catalog`, AA-162), never by
  // importing lib/librarian.js's primitives: .claude/rules/library-access.md gives the_library a
  // single access path, and scripts/check-library-access.js enforces it. This file is not Eleanor's
  // own dispatch path, so it goes through the front door like every other caller.
  //
  // An agent with no data-room credential comes back `denied-no-access`, and the bundle SAYS SO
  // rather than omitting the key and letting the caller read absence as "no Library exists".
  const catalog = await queryContent({ requestingAgentId: t, store: 'the_library_catalog', tenantId: tenant });
  const library = {
    data_room_access: agentRow.data_room_access || [],
    catalog: catalog.context || '',
    records: catalog.matchCount || 0,
    // The catalog branch reports its verdict as `_librarian`; every other branch of the broker
    // reports `_access`. Both are read so the bundle never publishes a null tier for a real denial.
    tier: catalog._librarian?.tier || catalog._access?.tier || null,
  };

  // .claude/rules/capability-logging.md: deterministic work logs execution and latency, never tokens,
  // never a model, never a cost. `agentId` is the HOLDER -- the capability that executed -- with the
  // target carried in call_facts, so the AI Audit never shows deterministic plumbing as the target
  // agent taking a turn. `call_source`/`screen_origin` ride in from mcp.js's runWithCallSource().
  logActivity({
    tenantId: tenant,
    agentId: agent_id,
    aiType: 'deterministic',
    feature: 'dan-db-assembly',
    latencyMs: Date.now() - startTime,
    callFacts: {
      target_agent_id: t,
      role_prompts: role_prompts.length,
      guardrails: guardrails.length,
      sections: sections.length,
      knowledge_entries: knowledge_entries.length,
      library_records: library.records,
      library_tier: library.tier,
    },
  });

  return { agent, role_prompts, guardrails, output_formats, sections, knowledge_entries, library, no_inference: true };
}

export default handle;
