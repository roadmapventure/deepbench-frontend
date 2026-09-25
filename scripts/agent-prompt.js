#!/usr/bin/env node
// DeepBench v7.0.587 | scripts/agent-prompt.js | AGT-129 -- the task may come from a FILE or STDIN,
// not only from one argv entry. Linux caps a single argv entry at MAX_ARG_STRLEN = 131,072 B, so
// `--task=$(cat big.json)` dies E2BIG before node starts -- measured 2026-09-25: 127 KB spawns,
// 129 KB does not, and the auditor routine's own 155 KB worklist and 245 KB board-health task are
// both past the wall. `--task-file=<path>` reads the file, `--task-file=-` reads stdin, and both
// take the SAME JSON-object check as `--task=`, which is unchanged so runner-cycle.md steps 4b/6/7
// keep working.
// DeepBench v7.0.486 | scripts/agent-prompt.js | SES-395 -- the judgment lane falls back to the
// orchestrator model when Fable is past its daily share. resolveJudgmentModel() asks
// public.judgment_model() and the printed model is the one the call actually runs on; the header
// gains a `# lane:` line and `--json` an `llm.lane_note` only where the lane moved.
// DeepBench v7.0.457 | scripts/agent-prompt.js | SES-367 -- renderAssembly() now renders the
// ASSEMBLED output contract as text. The executor states the contract by handing the schema to the
// model as the tool `input_schema` (request-receivable.js buildCallBody); a session sub-agent has no
// tool, so before this the prompt named none of its required keys and the answer came back without
// the `account` receipt (LAV-28b) the drivers then refused.
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
//   --task-file=<path>         optional; task_context from a file, or stdin when <path> is -
//                              (argv caps at 128 KB on Linux -- use this for a big task_context)
//   --tenant=<id>              optional, default 'global'
//   --json                     print the raw assembly object instead of the rendered prompt
//
// EXIT CODES: 0 ok; 2 any missing/invalid input or missing credential.

import fs from 'fs';
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

// FEATURE: SES-395 -- the judgment lane DEGRADES instead of the gate refusing. John, 2026-09-14:
// "The self governance meter should also see if Fable is past its daily limit, drop down to Opus."
//
// WHY THIS SEAM IS HERE AND NOT IN THE ASSEMBLY. `assembly.llm.model` is the Skill rows' answer to
// "which model does this capability run on" -- a STORED fact, correct at every moment, and all six
// governance agents store `claude-fable-5-1`. What it cannot know is whether Fable has any share of
// the week left RIGHT NOW, which is a reading, not a configuration. So the stored answer stays
// untouched in the database and this script -- the one place a session learns which model to spawn
// a sub-agent on -- asks `public.judgment_model()` and prints the model actually in force. Nothing
// else in the pipeline changes: the executor's own prompt is byte-identical, because this touches
// only `llm`, never a section.
//
// THE OVERRIDE IS FENCED TO THE JUDGMENT LANE BY EQUALITY, never by agent id or capability slug.
// An assembly whose model is the orchestrator's (the Builder's own, say) is left exactly alone --
// degrading it would "drop" it to the model it is already on, and a fence keyed on a slug would
// need editing every time an agent moves lane.
//
// FEATURE: AGT-143 -- a capability's own row in public.model_assignments answers first. The
// trigger trg_model_assignments_sync_skills keeps the Skill rows in step with it, so this read is
// the belt to that brace: the candidate is the table's answer, and the lane/degrade step below runs
// on the candidate, never on a slug. No capability_slug -> no read (ses-331's stub never sees it).
export async function resolveJudgmentModel(assembly, { supabaseUrl, headers, fetchImpl = fetch } = {}) {
  const assemblyModel = assembly?.llm?.model;
  const base = { model: assemblyModel, reason: 'lane' };
  const root = String(supabaseUrl || '').replace(/\/+$/, '');
  try {
    const slug = assembly?.capability_slug;
    let candidate = assemblyModel;
    let fromCapability = false;
    if (slug) {
      const aRes = await fetchImpl(`${root}/rest/v1/model_assignments?select=job_kind,job_key,model_id`
        + `&job_kind=eq.capability&job_key=eq.${encodeURIComponent(slug)}&limit=1`, { headers });
      if (!aRes.ok) throw new Error(`model_assignments returned HTTP ${aRes.status}`);
      const aRows = await aRes.json();
      const row = Array.isArray(aRows) ? aRows[0] : null;
      if (row && row.job_kind === 'capability' && row.job_key === slug && row.model_id) {
        candidate = row.model_id;
        fromCapability = true;
      }
    }
    const capAnswer = () => (candidate !== assemblyModel
      ? { model: candidate, reason: 'capability', from: assemblyModel }
      : { model: candidate, reason: 'capability' });

    const lanesRes = await fetchImpl(`${root}/rest/v1/runner_model_lanes?select=lane,model_id`, { headers });
    if (!lanesRes.ok) throw new Error(`runner_model_lanes returned HTTP ${lanesRes.status}`);
    const lanes = await lanesRes.json();
    const judgment = Array.isArray(lanes) ? lanes.find(l => l.lane === 'judgment') : null;
    if (!judgment?.model_id) throw new Error('runner_model_lanes carries no `judgment` row');
    // Not a judgment-lane call -- nothing to degrade, and no reason to spend the RPC.
    if (candidate !== judgment.model_id) return fromCapability ? capAnswer() : base;

    const rpcRes = await fetchImpl(`${root}/rest/v1/rpc/judgment_model`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!rpcRes.ok) throw new Error(`rpc/judgment_model returned HTTP ${rpcRes.status}`);
    const rows = await rpcRes.json();
    const answer = Array.isArray(rows) ? rows[0] : rows;
    if (!answer?.model_id) throw new Error('rpc/judgment_model returned no model_id');
    // The function agreeing with the lane is the ordinary case, not a degrade.
    if (answer.model_id === candidate) {
      return fromCapability ? capAnswer() : { model: assemblyModel, reason: answer.reason || 'lane' };
    }
    return { model: answer.model_id, reason: answer.reason || 'degraded', from: candidate };
  } catch (e) {
    // FAIL TO THE STORED ANSWER, LOUDLY. An unreachable REST surface must not stop a session running
    // an agent -- the lane's own model is still a correct model to run on, just possibly an expensive
    // one. Exit 2 here would make a governance outage out of a meter outage. The caller prints this.
    return { ...base, warning: `judgment-lane check failed (${e.message}); using the assembly's own model "${assemblyModel}"` };
  }
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
      // `?? ''` so a BARE `--task-file` (no `=`) is refused for want of a path rather than
      // silently meaning `{}` -- the regex above yields undefined for a valueless flag.
      case 'task-file': out.taskFile = value ?? ''; break;
      case 'json': out.json = true; break;
      default: return { error: `unrecognized flag "--${key}"` };
    }
  }
  if (!out.agent) return { error: '--agent=<agents.id> is required' };
  if (!out.capability) return { error: '--capability=<slug> is required' };
  // AGT-129. Two flags, ONE source of task text and ONE validity check below -- a second copy of
  // the JSON check is how the two paths would drift into disagreeing about what a task is.
  if (out.task !== undefined && out.taskFile !== undefined) {
    return { error: 'pass one of --task / --task-file, not both' };
  }

  let taskText;
  let taskFlag;
  if (out.taskFile !== undefined) {
    if (!out.taskFile) return { error: '--task-file=<path> needs a path (- for stdin)' };
    taskFlag = '--task-file';
    try {
      // fd 0 rather than '/dev/stdin': readFileSync(0) reads a PIPE to EOF, which is what a
      // spawning caller hands us, and it needs no such path to exist.
      taskText = out.taskFile === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(out.taskFile, 'utf8');
    } catch (e) {
      return { error: `--task-file: ${e.message}` };
    }
  } else if (out.task !== undefined) {
    taskFlag = '--task';
    taskText = out.task;
  }

  if (taskText === undefined) {
    out.taskContext = {};
    return out;
  }
  let parsed;
  try {
    parsed = JSON.parse(taskText);
  } catch (e) {
    // The flag NAMES ITSELF in the message: a caller piping stdin must not be sent to read --task.
    return { error: `${taskFlag} must be valid JSON: ${e.message}` };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: `${taskFlag} must be a JSON object` };
  }
  out.taskContext = parsed;
  return out;
}

// FEATURE: SES-367 -- the assembled (post-injection) contract as text; the executor sends it as the
// tool input_schema and a session sub-agent has no tool. Keyed on shape, never on a slug.
export function renderFormatContract(formatContract) {
  if (formatContract?.output_type !== 'json') return null;
  const schema = formatContract.schema;
  if (!schema || typeof schema !== 'object' || Array.isArray(schema) || !schema.properties) return null;
  const required = Array.isArray(schema.required) ? schema.required : [];
  return [
    'OUTPUT CONTRACT. Return ONE JSON object and nothing else, matching this schema exactly -- the same schema the',
    `executor hands its model as the tool definition; the driver refuses any missing required key. Required: ${required.map(k => `"${k}"`).join(', ') || '(none)'}.`,
    JSON.stringify(schema, null, 2),
  ].join('\n');
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
  const contract = renderFormatContract(assembly.format_contract);
  if (contract) {
    // Inside INTENT (keeps HAR-02b-patch3's intent->task adjacency); else format; else its own stable block.
    const host = entries.find(e => e.slug === 'intent') || entries.find(e => e.slug === 'format');
    if (host) host.text = `${host.text}\n\n${contract}`;
    else entries.push({ slug: 'format-contract', order: 5, prompt_phase: 'stable', text: `=== OUTPUT CONTRACT ===\n${contract}` });
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

  // FEATURE: SES-395 -- applied BEFORE either output path, so `--json` and the text header can
  // never disagree about which model the call runs on. Sections are untouched either way.
  const key = process.env.SUPABASE_SERVICE_KEY;
  const lane = await resolveJudgmentModel(assembly, {
    supabaseUrl: process.env.SUPABASE_URL,
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (lane.warning) console.error(`agent-prompt: ${lane.warning}`);
  const degraded = Boolean(lane.from);
  if (assembly.llm) {
    assembly.llm.model = lane.model;
    assembly.llm.lane_note = lane.reason;
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(assembly, null, 2) + '\n');
    return;
  }

  if (!assembly.agent_card) fail(`no agents row for --agent=${args.agent}`);
  const { system_prompt, omitted } = renderAssembly(assembly);
  if (!system_prompt) fail(`capability "${args.capability}" assembled zero renderable sections for agent "${args.agent}"`);

  const header = `# ${assembly.agent_card.name} — ${assembly.agent_card.role} · capability ${assembly.capability_slug} · model ${assembly.llm?.model}`;
  // Only when it actually moved. A note on every run is a note nobody reads.
  // AGT-143: a capability assignment that moved the model gets its own line; the degrade line is
  // byte-identical to SES-395's.
  const laneLine = lane.reason === 'capability' && lane.from
    ? `\n# lane: capability assignment ${assembly.capability_slug} -> ${lane.model}`
    : degraded ? `\n# lane: judgment degraded to ${lane.model} (${lane.reason})` : '';
  process.stdout.write(header + laneLine + '\n' + system_prompt + '\n');
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
