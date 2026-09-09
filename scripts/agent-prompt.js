#!/usr/bin/env node
// DeepBench v7.0.435 | scripts/agent-prompt.js | SES-331 -- ONE prompt-assembly path for an agent
// run inside a Claude session. SES-332: --intent now falls back to the capability's stored
// default_intent_slug instead of silently assembling with no Intent Skill at all.
//
// WHY THIS EXISTS. John, 2026-09-08: run the governance agents from a session over the database on
// subscription tokens instead of API dollars. The risk named at that gate is the only thing this
// script is designed against -- a session that HAND-BUILDS the prompt is a second copy of the
// executor's assembly, and a second copy of the assembly is the drift this project exists to end.
// So this script assembles NOTHING. It calls assemblePrompt() -- the same function
// api/capabilities/execute.js calls -- renders with ai-enrichment.js's own renderSection(), and
// joins with ai-enrichment.js's own assemblePhaseSplit(). Every byte of the output comes from code
// the executor runs; this file contributes argument parsing and a header line.
//
// THE ONE HONEST DIFFERENCE FROM THE EXECUTOR'S PROMPT, stated here rather than discovered later.
// api/prompt/ai-enrichment.js does more than render: it FETCHES (RAG/Library retrieval fills
// `knowledge`-type sections), and it can run REFLECT and SYNTHESIS, both of which are real model
// calls. This script makes no model call and performs no retrieval -- so a section whose content is
// fetched per call renders empty here and is omitted, exactly as enrichPrompt() omits an empty
// section (its own `if (!s.content) { omitted.push(s.slug); continue; }`). Omitted sections are
// named on stderr, never silently dropped. For every stored section -- identity, behavior,
// guardrails, format, intent, current task, voice -- this is the executor's text.
//
// USAGE
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
//     node scripts/agent-prompt.js --agent=owen --capability=bench-report-card
//   ... --intent=report-card-intent --task='{"goal":"grade trace abc"}' --json
//
// FLAGS
//   --agent=<agents.id>        required
//   --capability=<slug>        required
//   --intent=<slug>            optional; omitted falls back to the capability's own
//                              `capabilities.default_intent_slug` (SES-332 residue fix — see
//                              resolveIntentSlug below). Pass --intent=none for the deliberate
//                              no-intent assembly.
//   --task=<json>              optional JSON object, the task_context (default {})
//   --tenant=<id>              optional, default 'global'
//   --json                     print the raw assembly object instead of the rendered prompt
//
// EXIT CODES: 0 ok; 2 any missing/invalid input or missing credential.

import path from 'path';
import { fileURLToPath } from 'url';
import { assemblePrompt } from '../api/prompt/db-assembly.js';
import { assemblePhaseSplit, renderSection } from '../api/prompt/ai-enrichment.js';

// The tenant every agent_configs / agent_capability_assignments row actually carries. MEASURED
// 2026-09-09, not assumed: agent_configs 22/22 and agent_capability_assignments 18/18 are the
// literal string 'global', and agents.tenant_id is NULL on all 22 rows -- so it is text, not a uuid,
// and it cannot be read off the agent. assemblePrompt() throws without one.
const DEFAULT_TENANT = 'global';

function fail(message) {
  console.error(`agent-prompt: ${message}`);
  process.exit(2);
}

// FEATURE: SES-332 -- the one-file residue fix for the defect AGT-67 found and SES-332 hit again.
// db-assembly.js's AA-188 branch FILTERS OUT every Intent-type Skill when intent_slug is null (its
// `skillProfiles.filter(sp => sp.skill_type_slug !== 'intent')`), which is correct for the routing
// agent that genuinely could not map a request to one intent -- and silently wrong for a session
// operator who simply did not type the flag. The observable symptom is not an error: the prompt
// assembles, renders, and is missing its schema, its handler and its output contract entirely, so
// the sub-agent free-writes. `capabilities.default_intent_slug` is the capability's own stored
// answer to "which intent, if the caller names none" (classify-ticket -> pz-classify-intent,
// rank-backlog -> pz-rank-intent, MEASURED this session) and is exactly what the omitted flag
// should mean here.
//
// FIXED HERE AND NOT IN db-assembly.js ON PURPOSE. assemblePrompt() is the executor's own function;
// changing what null means there would change every existing caller's prompt, including the routing
// path AA-188 was written for, where "no intent" is a deliberate ruling and not an omission. This
// script is the session-operator surface, and the operator's omission is the only case being
// reinterpreted. `--intent=none` stays available for the deliberate no-intent assembly, so nothing
// this script could do before became unreachable.
export const NO_INTENT = 'none';

export async function resolveIntentSlug({ intent, capability, tenant, fetchImpl = fetch }) {
  if (intent === NO_INTENT) return { intentSlug: null, source: 'explicit-none' };
  if (intent) return { intentSlug: intent, source: 'flag' };

  const url = `${process.env.SUPABASE_URL}/rest/v1/capabilities`
    + `?slug=eq.${encodeURIComponent(capability)}&tenant_id=eq.${encodeURIComponent(tenant)}`
    + '&select=default_intent_slug&limit=1';
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetchImpl(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return { error: `could not read default_intent_slug for capability "${capability}": HTTP ${r.status}` };
  const rows = await r.json();
  if (!Array.isArray(rows) || !rows[0]) return { error: `no capabilities row for slug "${capability}" in tenant "${tenant}"` };

  const fallback = rows[0].default_intent_slug;
  // A capability that declares no default intent keeps AA-188's behaviour -- this fix supplies a
  // stored answer where one exists, it does not invent one where none does.
  return fallback
    ? { intentSlug: fallback, source: 'capability-default' }
    : { intentSlug: null, source: 'no-default-declared' };
}

export function parseArgs(argv) {
  const out = { json: false };
  for (const raw of argv) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(raw);
    if (!m) return { error: `unrecognized argument "${raw}"` };
    const [, key, value] = m;
    switch (key) {
      case 'agent': out.agent = value; break;
      case 'capability': out.capability = value; break;
      case 'intent': out.intent = value; break;
      case 'tenant': out.tenant = value; break;
      case 'task': out.task = value; break;
      case 'json': out.json = true; break;
      default: return { error: `unrecognized flag "--${key}"` };
    }
  }
  if (!out.agent) return { error: '--agent=<agents.id> is required' };
  if (!out.capability) return { error: '--capability=<slug> is required' };
  if (out.task !== undefined) {
    let parsed;
    try {
      parsed = JSON.parse(out.task);
    } catch (e) {
      return { error: `--task must be valid JSON: ${e.message}` };
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: '--task must be a JSON object' };
    }
    out.taskContext = parsed;
  } else {
    out.taskContext = {};
  }
  return out;
}

// The executor's own two steps, in the executor's own order, over the executor's own functions.
// Nothing about the section shape is re-derived here: `order` already sorts stable before volatile
// (db-assembly.js's HAR-02b renumbering) and `prompt_phase` is read straight off the section.
export function renderAssembly(assembly) {
  const entries = [];
  const omitted = [];
  for (const s of assembly.sections) {
    const text = renderSection(s);
    if (!text) { omitted.push(s.slug); continue; }
    entries.push({ slug: s.slug, order: s.order || 0, prompt_phase: s.prompt_phase === 'stable' ? 'stable' : 'volatile', text });
  }
  return { ...assemblePhaseSplit(entries), omitted };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) fail(args.error);
  if (!process.env.SUPABASE_URL) fail('SUPABASE_URL not set');
  if (!process.env.SUPABASE_SERVICE_KEY) fail('SUPABASE_SERVICE_KEY not set');

  const tenant = args.tenant || DEFAULT_TENANT;
  const resolved = await resolveIntentSlug({ intent: args.intent, capability: args.capability, tenant });
  if (resolved.error) fail(resolved.error);
  if (resolved.source === 'capability-default') {
    console.error(`agent-prompt: --intent omitted; using capabilities.default_intent_slug "${resolved.intentSlug}"`);
  } else if (resolved.source === 'no-default-declared') {
    console.error(`agent-prompt: --intent omitted and capability "${args.capability}" declares no default_intent_slug -- assembling with every Intent Skill skipped (AA-188)`);
  }

  let assembly;
  try {
    assembly = await assemblePrompt({
      capability_slug: args.capability,
      agent_id: args.agent,
      tenant_id: tenant,
      task_context: args.taskContext,
      intent_slug: resolved.intentSlug,
    });
  } catch (e) {
    // assemblePrompt() throws loudly on an intent_slug that matches no Intent Skill Profile
    // (AA-108). Surfacing that as exit 2 is the point: a session must not proceed to run an agent
    // whose intent silently did not load.
    fail(e.message);
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(assembly, null, 2) + '\n');
    return;
  }

  if (!assembly.agent_card) fail(`no agents row for --agent=${args.agent}`);
  const { system_prompt, omitted } = renderAssembly(assembly);
  if (!system_prompt) fail(`capability "${args.capability}" assembled zero renderable sections for agent "${args.agent}"`);

  const header = `# ${assembly.agent_card.name} — ${assembly.agent_card.role} · capability ${assembly.capability_slug} · model ${assembly.llm?.model}`;
  process.stdout.write(header + '\n' + system_prompt + '\n');
  if (omitted.length) {
    console.error(`agent-prompt: sections omitted (no stored content -- fetched per call by the executor): ${omitted.join(', ')}`);
  }
}

// Same entry-point guard shape tests/regression/_lib/self-run.js uses (isEntryPoint), restated here
// rather than imported because a shipped script must not depend on the test tree: importing this
// module -- which the regression guard does, to call the real parseArgs/renderAssembly -- must not
// run it. Windows argv[1] and import.meta.url can disagree on drive-letter case.
if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => fail(e.message));
}
