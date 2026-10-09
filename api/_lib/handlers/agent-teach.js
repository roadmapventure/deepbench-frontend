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
import { addCapabilityToAgent, addSkillToCapability, SKILL_TYPES } from '../../../lib/skill-write.js';
import { readAgentIdentity, updateAgentIdentity } from '../../../lib/private-agent-create.js';

// FEATURE: AGT-393 + add-capability -- specialty and bio replace the agent's own; capability and skill build new
// ones. Name and role are edited on DeepBench only.
const KINDS = Object.freeze(['taught', 'role_prompt', 'output_format', 'guardrail', 'specialty', 'bio', 'capability', 'skill']);
const IDENTITY_MAX = Object.freeze({ specialty: 200, bio: 2000 });
const SIDES = Object.freeze(['always', 'never']);
const TAB_FOR = Object.freeze({ role_prompt: 'Resume', output_format: 'Playbook', guardrail: 'Playbook' });

function restDeps() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not configured');
  return { supabaseUrl, supabaseKey };
}

// The capability a skill is being added to, named by slug or by name, among the capabilities THIS agent holds.
// Only a capability whose Intent is scoped to its own Skills (traits.scope_capability, i.e. one added on Personnel) takes
// Skills; the agent's Knowledge and Teach capabilities are refused like an unknown name.
async function findHeldCapability(agentId, ref, { supabaseUrl, supabaseKey }) {
  const get = async path => {
    const res = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/${path}`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
    if (!res.ok) throw new Error(`Supabase read failed: HTTP ${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  };
  const held = await get(`agent_capability_assignments?agent_id=eq.${encodeURIComponent(agentId)}&select=capability_slug`);
  if (held.length === 0) return null;
  const slugs = held.map(h => `"${h.capability_slug}"`).join(',');
  const caps = await get(`capabilities?slug=in.(${encodeURIComponent(slugs)})&select=slug,name,default_intent_slug`);
  const intentSlugs = [...new Set(caps.map(c => c.default_intent_slug).filter(Boolean))].map(s => `"${s}"`).join(',');
  const intents = intentSlugs ? await get(`skill_profiles?slug=in.(${encodeURIComponent(intentSlugs)})&select=slug,traits`) : [];
  const scoped = new Set(intents.filter(i => i.traits && i.traits.scope_capability === true).map(i => i.slug));
  const want = String(ref ?? '').trim().toLowerCase();
  return caps.find(c => scoped.has(c.default_intent_slug) && (c.slug.toLowerCase() === want || String(c.name).trim().toLowerCase() === want)) || null;
}

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
  let extra = {};
  if (kind === 'specialty' || kind === 'bio') {
    const value = String(input.content ?? '').trim();
    if (!value) throw new Error(`content required: the new ${kind}`);
    if (value.length > IDENTITY_MAX[kind]) throw new Error(`${kind} is at most ${IDENTITY_MAX[kind]} characters`);
    const deps = restDeps();
    const cur = await readAgentIdentity(t, deps);
    const next = await updateAgentIdentity(
      { agentId: t, name: cur.name, role: cur.role, specialty: kind === 'specialty' ? value : cur.specialty, bio: kind === 'bio' ? value : cur.bio },
      { ...deps, origin: 'mcp', originCaller: origin_caller });
    saved = { id: t, created_at: next.agent?.identity_updated_at ?? null };
  } else if (kind === 'capability') {
    const name = String(title ?? '').trim();
    if (!name) throw new Error('title required: the capability name');
    const made = await addCapabilityToAgent({ agentId: t, fields: { name, ...(String(input.content ?? '').trim() ? { description: String(input.content).trim() } : {}) } }, { ...restDeps(), actor: { type: 'ai_client', id: origin_caller } });
    saved = { id: made.capability.slug, created_at: made.capability.created_at ?? null };
  } else if (kind === 'skill') {
    const name = String(title ?? '').trim();
    if (!name) throw new Error('title required: the skill name');
    const type = input.skill_type || 'identity';
    if (!SKILL_TYPES.includes(type)) throw new Error(`skill_type must be one of: ${SKILL_TYPES.join(', ')}`);
    const deps = { ...restDeps(), actor: { type: 'ai_client', id: origin_caller } };
    const cap = await findHeldCapability(t, input.capability, deps);
    if (!cap) throw new Error('capability must name a capability this agent holds (its slug or name); add one first with kind capability');
    const fields = { name, skill_type_slug: type };
    if (String(input.content ?? '').trim()) fields.method = String(input.content).trim();
    if (String(input.objective ?? '').trim()) fields.objective = String(input.objective).trim();
    const made = await addSkillToCapability({ capabilitySlug: cap.slug, fields }, deps);
    saved = { id: made.skill.slug, created_at: made.skill.created_at ?? null };
    extra = { capability: cap.slug };
  } else if (kind === 'taught') {
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
    : kind === 'specialty' || kind === 'bio'
      ? `Change it on ${name}'s Profile page (Biography card) on DeepBench.`
      : kind === 'capability' || kind === 'skill'
        ? `Edit or remove it on ${name}'s Profile page (Capabilities card) on DeepBench.`
        : `Delete it on ${name}'s ${TAB_FOR[kind]} tab on DeepBench.`;

  return {
    saved: {
      kind,
      id: row_id,
      title: title ?? null,
      origin: 'mcp',
      origin_caller,
      created_at: saved?.created_at ?? null,
      ...extra,
    },
    undo,
    no_inference: true,
  };
}

export default handle;
