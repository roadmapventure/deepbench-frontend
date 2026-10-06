// DeepBench v7.0.792 | api/_lib/handlers/agent-teach.js | AGT-390 -- the "Teach <name>" tool over MCP.
//
// WHAT IT DOES. A connected AI client teaches the agent that holds this capability one thing: a taught
// item (a fact or instruction to remember), a role prompt, an output format, or a guardrail (always or
// never). One row is written, tagged with where it came from -- origin `mcp` and the caller's MCP key
// NAME (never its value) -- and the date it was learned is that row's own created_at. No model runs
// on DeepBench's side; the one paid call is the embedding a taught item already gets on save.
//
// HOW IT IS REACHED -- named in data. The Intent Skill row `agent-teach-intent` carries
// `traits.handler = 'agent-teach'`, and api/_lib/mcp.js's DETERMINISTIC_HANDLERS is keyed on that
// name. Nothing here compares against a literal agent id or capability slug (§19b).
//
// THE OWN-KNOWLEDGE RULE (§19c, AGT-338). The target is always the capability's HOLDER: bundleTarget()
// is asked with any_agent forced false, so another agent's id is refused as "Unknown agent" before any
// write, even if a future Intent row were to set the any-agent fact. The holder must pass the same
// readability check the Knowledge tool applies (bundleTargetReadable()).
//
// WHERE THE ROWS GO. taught -> knowledge_entries through lib/knowledge-write.js embedAndUpsertEntry()
// (source user, kind note), the same write the Training tab's note form makes. The other three ->
// agent_configs through insertAgentConfig(), the same insert the Resume and Playbook tabs make, never
// as the default. A guardrail's name is its side, as the Playbook tab saves it.

import { logActivity } from '../../../lib/activity-log.js';
import { embedAndUpsertEntry, insertAgentConfig } from '../../../lib/knowledge-write.js';
import { AGENT_ACCESS_COLUMNS } from '../../../shared/agent-visibility.js';
import { bundleTarget, bundleTargetReadable } from './agent-bundle.js';

const KINDS = Object.freeze(['taught', 'role_prompt', 'output_format', 'guardrail']);
const SIDES = Object.freeze(['always', 'never']);
const TAB_FOR = Object.freeze({ role_prompt: 'Resume', output_format: 'Playbook', guardrail: 'Playbook' });

async function readAgent(id) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not configured');
  const res = await fetch(
    `${url.replace(/\/+$/, '')}/rest/v1/agents?id=eq.${encodeURIComponent(id)}&select=id,name,lane,is_active,${AGENT_ACCESS_COLUMNS}&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`Supabase read failed (agents): HTTP ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

/**
 * @param agent_id         the HOLDER of the capability -- the agent being taught.
 * @param tenant_id        the capability row's tenant.
 * @param content          the CALLER's task_context: { kind, side?, title, content, teaching_note? }.
 * @param handler_context  { governance_unlocked, any_agent, caller_key_name } from mcp.js.
 */
export async function handle({ agent_id, tenant_id, content, handler_context }) {
  const startTime = Date.now();
  const tenant = tenant_id || 'global';
  const t = bundleTarget({ agent_id, content, handler_context: { ...handler_context, any_agent: false } });

  const agentRow = await readAgent(t);
  if (!bundleTargetReadable(agentRow, handler_context)) throw new Error(`Unknown agent: ${t}`);

  const input = content || {};
  const kind = input.kind;
  if (!KINDS.includes(kind)) throw new Error(`kind must be one of: ${KINDS.join(', ')}`);
  const side = input.side;
  if (kind === 'guardrail' && !SIDES.includes(side)) throw new Error('A guardrail needs side: always or never');

  const origin_caller = handler_context?.caller_key_name || null;
  const title = input.title;
  let saved;
  if (kind === 'taught') {
    saved = await embedAndUpsertEntry({
      title,
      content: input.content,
      teaching_note: input.teaching_note,
      tenant_id: tenant,
      agent_id: t,
      source: 'user',
      kind: 'note',
      origin: 'mcp',
      origin_caller,
    });
  } else {
    saved = await insertAgentConfig({
      agent_id: t,
      tenant_id: tenant,
      type: kind,
      name: kind === 'guardrail' ? side : title,
      text: input.content,
      origin: 'mcp',
      origin_caller,
    });
  }

  const row_id = saved?.id ?? null;
  // .claude/rules/capability-logging.md: deterministic work logs execution and latency, never tokens
  // or a model. `agentId` is the holder that executed; the target rides in call_facts.
  logActivity({
    tenantId: tenant,
    agentId: agent_id,
    aiType: 'deterministic',
    feature: 'agent-teach',
    latencyMs: Date.now() - startTime,
    callFacts: { target_agent_id: t, kind, row_id, origin: 'mcp', origin_caller },
  });

  const name = agentRow.name || t;
  const undo = kind === 'taught'
    ? `Switch it off on ${name}'s Training tab on DeepBench.`
    : `Delete it on ${name}'s ${TAB_FOR[kind]} tab on DeepBench.`;

  return {
    saved: {
      kind,
      id: row_id,
      title: title ?? null,
      origin: 'mcp',
      origin_caller,
      created_at: saved?.created_at ?? null,
    },
    undo,
    no_inference: true,
  };
}

export default handle;
