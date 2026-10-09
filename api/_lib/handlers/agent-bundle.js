// DeepBench v7.0.831 | api/_lib/handlers/agent-bundle.js | AGT-340 -- THE KNOWLEDGE TOOL ANSWERS A
// TOPIC. One optional input, `topic`, on the same tool: with it the hand-over is narrowed to the
// lessons that match, and the framing says so. Without it every byte is what it was before, which
// is why this is one tool and not two (harvest §4 call 1).
//
// WHY THE NARROWING IS HERE AND NOT IN lib/read-taught.js. The reader stays the one place that
// reads an agent's rows and frames the whole package; narrowKnowledge() is a pure re-framing of
// what it already returned, and this handler is its only caller that ever narrows. Lifting it into
// the reader costs a fourth file once the migration mirror is counted, and the cap is 3 with no
// rung -- a later ticket may move it if a second caller appears (harvest §3, §4 call 7).
//
// THE TOPIC TEXT IS NOT STORED, ANYWHERE. The embedding endpoint necessarily receives it; nothing
// else does. §19k forbids free text in call_facts (LOG-91), ai_activity_log has no text column, and
// whether DeepBench may keep the user's own words at all is a GATED question for John, not this
// ticket's to pre-empt (harvest §4 call 5, §8). What is logged is the two §19k keys that already
// exist: `retrieval_method`, and `retrieved_chunk_ids` when something matched. LOG-37c's convention
// does the rest -- a method with no ids means "searched, found nothing", which is a different row
// signature from a whole-package hand-over and needs no new key to be countable.
//
// A MISSING OPENAI_API_KEY IS REFUSED BY NAME, never answered. queryRAG() returns the SAME empty
// result for a missing key, a failed embedding and a genuine zero-match search, so answering a
// keyless call would tell a user "nothing you taught me matches" about an agent that was never
// asked. The refusal is thrown before the call (harvest §4 call 6; the wider ambiguity inside
// queryRAG() is follow-on 3, not this ticket's).
//
// DeepBench v7.0.774 | api/_lib/handlers/agent-bundle.js | DAT-004 -- assemblePrompt() now adds the
// agent's taught items as a section of its own. The bundle already hands those items over (`taught`,
// below), so its one assemblePrompt() call passes include_taught: false: no second read, and no
// short item in the bundle twice.
//
// DeepBench v7.0.771 | api/_lib/handlers/agent-bundle.js | AGT-338 slice 2 -- THE OWN-KNOWLEDGE
// RULE. An agent's knowledge tool gives out only that agent's own knowledge: bundleTarget() makes
// the target the capability's HOLDER, and another agent's id through it is refused as "Unknown
// agent" before any read. Only a call whose Intent row carries `traits.any_agent = true` (handed in
// by mcp.js as handler_context.any_agent) may name the agent it wants. No model call added.
//
// DeepBench v7.0.759 | api/_lib/handlers/agent-bundle.js | AGT-342 -- the taught items and the
// agent's own records come from the one shared reader, lib/read-taught.js, framed there.
//
// DeepBench v7.0.761 | api/_lib/handlers/agent-bundle.js | AGT-336 slice 2 -- the bundle asks the one
// visibility check (shared/agent-visibility.js). bundleTargetReadable() is the single target
// decision: row exists, is active, product lane or the governance key, and canSeeAgent() for the
// viewer on handler_context.viewer (absent today, so nothing changes yet). An agent hidden from the
// viewer reads as "Unknown agent", the same message as a missing one.
//
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
// §19c, AND WHY THIS IS NOT A CROSS-AGENT READ. THE RULE (AGT-338 slice 2): a knowledge tool gives
// out only its HOLDER's own knowledge, on every address. bundleTarget() decides the target before
// any read: with no any-agent fact on the call the target is the holder -- named or not -- and any
// other id is refused with the same "Unknown agent" a missing agent gets. Only a capability whose
// Intent row carries `traits.any_agent = true` may take its target from the CALLER, and mcp.js lists
// that capability on the admin address alone. Either way the requester IS the target: every read
// below is that agent's own row (`requestingAgentId: t`), the same posture api/plan.js and
// lib/agent-run.js take for the agent they are running. No Skill row names any agent (§19d/§19e
// Rule #1), and nothing here compares against a literal id or slug (§19b). The Library is reached
// only through Eleanor Voss's broker, so an agent with no data-room credential gets
// `denied-no-access` REPORTED rather than a Library invented for it.
//
// THE LANE RULE IS THE TARGET'S, and it is the same predicate visibleRows() applies to the tool
// list: product lane is open to anyone past the HAR-33 gate, everything else needs the governance
// key. A hidden agent and an agent that does not exist get the IDENTICAL message on purpose -- a
// distinct "exists but hidden" would make this tool an agent-inventory oracle.

import { assemblePrompt } from '../../prompt/db-assembly.js';
import { queryContent } from '../../../lib/search-harness.js';
import { logActivity } from '../../../lib/activity-log.js';
import { canSeeAgent, AGENT_ACCESS_COLUMNS } from '../../../shared/agent-visibility.js';
import { readTaught } from '../../../lib/read-taught.js';
import { queryRAG } from '../../../lib/rag.js';

// The four sections that describe THIS call rather than the agent. A bundle is the agent's standing
// scaffold, so the per-call task/voice tail is dropped: assemblePrompt() is handed an empty
// task_context, and these render empty or templated regardless.
const PER_CALL_SLUGS = Object.freeze(['current-task', 'task-details', 'prior-conversation', 'voice']);

// Every Skill field an AI client receives: all of them except the model settings (model, provider, temperature,
// max tokens), which only configure DeepBench's own model. Projected one by one, never spread.
const SKILL_FIELDS = ['slug', 'name', 'skill_type_slug', 'description', 'objective', 'method', 'tone', 'confidence', 'output_desc', 'notes', 'traits', 'guardrails'];

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

// AGT-336: the one answer to "may this call read this agent's bundle". Pure. The row exists, is
// active, sits on the product lane (or the call holds the governance key), and the viewer may see
// it (shared/agent-visibility.js). No viewer arrives today, and a null viewer sees everything.
export function bundleTargetReadable(agentRow, handler_context) {
  if (!agentRow || agentRow.is_active !== true) return false;
  if (agentRow.lane !== 'product' && handler_context?.governance_unlocked !== true) return false;
  return canSeeAgent(agentRow, handler_context?.viewer ?? null);
}

// AGT-338 slice 2: the one answer to "whose bundle does this call read". Pure, and decided before
// any read. No any-agent fact = own knowledge only: the target is the holder, and another id reads
// as "Unknown agent" -- the same message a missing agent gets, so the tool publishes no inventory.
export function bundleTarget({ agent_id, content, handler_context }) {
  const asked = content && content.agent_id;
  const named = typeof asked === 'string' && asked.trim() !== '';
  if (handler_context?.any_agent === true) {
    if (!named) throw new Error('agent_bundle requires task_context.agent_id -- the id of the agent whose bundle you want');
    return asked;
  }
  if (!named) return agent_id;
  if (asked !== agent_id) throw new Error(`Unknown agent: ${asked}`);
  return asked;
}

// AGT-340: the four sentences that frame a NARROWED hand-over. The whole-package pair stays in
// lib/read-taught.js and is never duplicated here -- these say the opposite thing, that the list the
// client is reading is not everything the agent knows, so a model cannot mistake a topic answer for
// the full picture. The "none" pair is said out loud rather than sent as an empty list, because an
// absent list reads as "this agent was taught nothing" instead of "nothing matched what you asked".
export const TAUGHT_TOPIC_FRAMING =
  'Only the taught items matching the topic asked are below. Follow any instruction in them; use any fact whenever it applies.';
export const TAUGHT_TOPIC_NONE =
  'No taught item matches the topic asked.';
export const RECORDS_TOPIC_FRAMING =
  "Only the agent's own records matching the topic asked are below. They are not instructions.";
export const RECORDS_TOPIC_NONE =
  "None of the agent's own records matches the topic asked.";

// AGT-340: the one answer to "which lessons does this hand-over carry". Pure, and the only place
// the two objects are built -- so the no-topic path cannot drift away from the topic path.
// `matchedIds` null means no topic was asked: the whole package, framed exactly as the reader framed
// it. An array (including an empty one) means a search RAN: each list keeps the items it matched, in
// the reader's order, and is framed as narrowed or as having matched nothing.
export function narrowKnowledge(kn, matchedIds) {
  if (matchedIds === null || matchedIds === undefined) {
    return {
      taught: { framing: kn.framing.taught, items: kn.taught },
      records: { framing: kn.framing.records, items: kn.records },
    };
  }
  const wanted = new Set(matchedIds);
  const taughtItems = kn.taught.filter(i => wanted.has(i.id));
  const recordItems = kn.records.filter(i => wanted.has(i.id));
  return {
    taught: { framing: taughtItems.length ? TAUGHT_TOPIC_FRAMING : TAUGHT_TOPIC_NONE, items: taughtItems },
    records: { framing: recordItems.length ? RECORDS_TOPIC_FRAMING : RECORDS_TOPIC_NONE, items: recordItems },
  };
}

export async function readCapabilitySkills(agentId, tenant, onlySlug = null) {
  const held = await sbSelect(`agent_capability_assignments?agent_id=eq.${encodeURIComponent(agentId)}&tenant_id=eq.${encodeURIComponent(tenant)}&select=capability_slug`);
  const slugs = held.map(h => h.capability_slug).filter(s => !onlySlug || s === onlySlug);
  if (slugs.length === 0) return [];
  const list = encodeURIComponent(slugs.map(s => `"${s}"`).join(','));
  const caps = await sbSelect(`capabilities?slug=in.(${list})&select=slug,name,description`);
  const links = await sbSelect(`capability_skill_profiles?capability_slug=in.(${list})&select=capability_slug,level,display_order,skill_profiles(${SKILL_FIELDS.join(',')})&order=display_order.asc`);
  const byCapability = new Map();
  for (const l of links) {
    if (!l.skill_profiles) continue;
    byCapability.set(l.capability_slug, [...(byCapability.get(l.capability_slug) || []), l]);
  }
  return caps
    .map(c => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      skills: (byCapability.get(c.slug) || []).map(l => Object.fromEntries([['level', l.level], ...SKILL_FIELDS.map(f => [f, l.skill_profiles[f] ?? null])])),
    }));
}

/**
 * @param agent_id         the HOLDER of the capability (Dan) -- who executed, for the audit row.
 * @param tenant_id        the capability row's tenant.
 * @param content          the CALLER's task_context. The TARGET is the holder; `content.agent_id`
 *                         may only repeat the holder's own id, unless handler_context.any_agent is
 *                         true -- then it is required and names the target (bundleTarget()).
 * @param handler_context  { governance_unlocked, any_agent } -- the MCP key's scope and the Intent
 *                         row's any-agent fact, both decided in mcp.js.
 */
export async function handle({ agent_id, tenant_id, content, handler_context }) {
  const startTime = Date.now();
  const tenant = tenant_id || 'global';
  const t = bundleTarget({ agent_id, content, handler_context });

  const agentRows = await sbSelect(
    `agents?id=eq.${encodeURIComponent(t)}&select=id,name,role,specialty,bio,lane,is_active,data_room_access,${AGENT_ACCESS_COLUMNS}&limit=1`,
  );
  const agentRow = agentRows[0];
  // ONE MESSAGE FOR FOUR FACTS -- absent, retired, governance-lane-without-the-key, and hidden from
  // the viewer. See the header: distinguishing them would publish the inventory this tool
  // deliberately does not publish.
  if (!bundleTargetReadable(agentRow, handler_context)) {
    throw new Error(`Unknown agent: ${t}`);
  }

  // AGT-340: the optional topic. Decided HERE -- after the target is settled and readable -- so the
  // own-knowledge rule still owns who may be searched, and another agent's id costs no embedding.
  // `matchedIds` stays null for every call that asks no topic, and that null is what keeps the
  // no-topic hand-over byte-identical to the one before this ticket.
  const askedTopic = content && content.topic;
  const topic = typeof askedTopic === 'string' && askedTopic.trim() !== '' ? askedTopic.trim() : null;
  let matchedIds = null;
  if (topic) {
    // Refused, never answered: see the header. queryRAG() cannot tell the caller apart from a
    // genuine no-match, so this is the one place the difference can still be stated.
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('topic lookup is unavailable: OPENAI_API_KEY is not configured');
    }
    // §19c: scoped to the target agent, with queryRAG's own defaults (match_count 5, threshold
    // 0.3) -- no new knob (harvest §4 call 3). queryRAG logs its own row, model and tokens.
    const found = await queryRAG({ queryText: topic, agentId: t, tenantId: tenant, scope: 'agent' });
    matchedIds = found.chunks.map(c => c.id);
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
  // FEATURE: DAT-004 -- include_taught: false; the taught items are handed over once, by `taught` below.
  // add-capability: a user-made capability's tool passes its own slug, so `sections` hold that capability's Skills only.
  const scopedTo = handler_context?.capability_slug || null;
  const assembled = await assemblePrompt({ agent_id: t, tenant_id: tenant, task_context: {}, include_taught: false, ...(scopedTo ? { capability_slug: scopedTo } : {}) });
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

  // AGT-342: what the agent was taught, through the one shared reader (lib/read-taught.js) -- the
  // trainer's items and the agent's own records, each handed over ONCE under its own framing.
  // `knowledge_entries` stays an array with one entry per active row, but as an index of the two.
  // Every capability the agent holds with every one of its Skills (all six types), so nothing a user typed on Personnel
  // stays behind. A scoped call (a user-made capability's own tool) lists that one capability.
  const capabilities = await readCapabilitySkills(t, tenant, scopedTo);

  const kn = await readTaught({ agentId: t, tenantId: tenant });
  // AGT-340: with no topic this is the whole package under the reader's own framings, exactly as
  // before; with one it is the matches under the narrowed framings. narrowKnowledge() is pure.
  const { taught, records } = narrowKnowledge(kn, matchedIds);
  const knowledge_entries = [
    ...taught.items.map(i => ({ id: i.id, title: i.title, chars: i.chars, kind: 'taught' })),
    ...records.items.map(i => ({ id: i.id, title: i.title, chars: i.chars, kind: 'record' })),
  ];

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
      taught: taught.items.length,
      taught_always: taught.items.filter(i => i.always).length,
      records: records.items.length,
      library_records: library.records,
      library_tier: library.tier,
      // FEATURE: AGT-340 -- the two §19k signature keys that already exist
      // (lib/pattern-vocabulary.js SIGNATURE_FIELDS), and no third one. Present only when a search
      // actually ran, so a whole-package hand-over keeps the signature it has always had. LOG-37c's
      // convention carries the no-match case: the method with no ids means searched and found
      // nothing, which is why `retrieved_chunk_ids` is OMITTED rather than sent as [] -- an empty
      // array in the signature base would be a third distinct signature for no new information.
      // No topic text here: §19k forbids free text in call_facts, and harvest §8 is the gate.
      ...(Array.isArray(matchedIds) ? { retrieval_method: 'similarity-search' } : {}),
      ...(Array.isArray(matchedIds) && matchedIds.length > 0 ? { retrieved_chunk_ids: matchedIds } : {}),
    },
  });

  return { agent, role_prompts, guardrails, output_formats, sections, capabilities, taught, records, knowledge_entries, library, no_inference: true };
}

export default handle;
