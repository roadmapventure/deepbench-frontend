#!/usr/bin/env node
// DeepBench v7.0.446 | scripts/rank-backlog.js | SES-346 -- the Prioritizer's board re-rank, moved off
// a Vercel cron and onto the session path. This file IS `api/cron/rank-backlog.js`'s job; it is not a
// new capability, a new schedule, or a second ranking. `docs/SELFBUILD-RETIREMENT-LEDGER.md` entry 53
// carries what the route said and how to restore it.
//
// WHY IT MOVED, AND IT IS NOT A PREFERENCE. Vercel's Hobby plan caps a deployment at 12 serverless
// functions. `api/cron/rank-backlog.js` was the 13th and MCP-3's `api/mcp.js` the 14th, so from
// v7.0.437 the platform stopped deploying AT ALL -- dev served v7.0.434 while ten later commits were
// refused at build. Two functions had to go and neither capability could. The MCP transport now
// rides the executor's own function (SES-346 Task 1); the re-rank did not need a function in the
// first place, because THE RUNNER IS ALREADY THE SCHEDULE. `docs/runbooks/runner-cycle.md` step 4c
// runs this once per CST day on the first scheduled cycle that passes the walls, which is the same
// clock the invention pass (step 4b) already runs on. John ruled the free tier stays (2026-08-31,
// `SES-47` "option 1", `SES-183` part 1 "no cost option"), so an upgrade was never the fix.
//
// WHAT CHANGED ABOUT THE RUN ITSELF, stated rather than left to be discovered: the model call moves
// from the executor (API dollars, `call_source = 'scheduled'`) to a session sub-agent (subscription
// tokens, `call_source = 'session'` -- `SES-331`'s path). NOTHING ELSE. The candidate read is the
// same `prime_directive_queue()` read with the same 60-candidate cap, the prompt is the same
// `assemblePrompt()` the executor calls, the handler is the same `prioritizer-write`, and the cycle
// row still carries `trigger = 'scheduled'` with the `SCHEDULED-AGENT: rank-backlog` notes prefix
// `SES-334` wrote -- which is what keeps `tests/regression/ses-334-served-class-block.test.mjs`'s
// live arm finding these runs.
//
// TWO PASSES AND AN EXIT CODE, THE AGT-67 / AGT-68 SHAPE (scripts/verifier.js `--judge=session`,
// scripts/run-project.js). A session sub-agent is not a function a script can call, so one re-rank is
// two invocations:
//
//   pass one   node scripts/rank-backlog.js --cycle=<runner_cycles.id>
//                -> reads the executing project and its candidates, assembles the Prioritizer's
//                   prompt through the EXECUTOR'S OWN assembly, writes the state JSON, prints the
//                   prompt, exit 3 = AWAITING THE RANKING. No row is touched.
//   ...run that prompt as a `prioritizer` sub-agent on the judgment lane, save its JSON...
//   pass two   node scripts/rank-backlog.js --cycle=<id> --answer=<path>
//                -> validates against the Intent's OWN stored schema, refuses any id that was not a
//                   candidate, hands the ranking to prioritizer-write.js IN-PROCESS, writes the
//                   audit row and the cycle row. exit 0/2.
//
// FOUR THINGS THIS FILE REFUSES TO DO, each one a defect this project has already paid for:
//
// (1) IT NEVER ASSEMBLES A PROMPT ITSELF (`SES-331`). `assemblePrompt()` -- the function
//     `api/capabilities/execute.js` calls -- and `renderAssembly()` from scripts/agent-prompt.js are
//     imported. A hand-built prompt is a second copy of the executor's assembly.
//
// (2) IT NEVER RE-DERIVES THE BOARD. The candidates come from `prime_directive_queue()` itself, not
//     from a re-written "open/partial, queued, not deferred, unclaimed" filter -- `SES-333`'s rule
//     and the retired route's own note. Measured 2026-09-09 when that route shipped: the queued
//     board was 567 rows and the buildable lanes 27. Ordering 567 tickets the picker will never
//     reach is not an ordering, it is a bill.
//
// (3) IT NEVER TRUSTS AN ANSWER ABOUT A DIFFERENT BOARD. `answerErrors()` refuses any `backlog_id`
//     that was not in this run's candidate set -- the verifier's `5f414763` finding applied here: a
//     ranking file left in the scratch directory from an earlier run satisfies the schema perfectly
//     and lands on the wrong rows.
//
// (4) IT NEVER WRITES A RANKING IT COULD NOT WHOLLY VALIDATE. A truncated ranking is worse than a
//     refused one, because the handler would apply the half it received as if it were the whole
//     order. That is also why MAX_CANDIDATES is 60 and not a round number: `pz-rank-intent`'s
//     `max_tokens` is 4000 and each ranked entry costs roughly 30 output tokens.
//
// USAGE
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/rank-backlog.js --cycle=<uuid> \
//     [--scratch=<dir>] [--state-file=<path>] [--dry-run] [--json]
//   ... --answer=<path to the Prioritizer's JSON>   (pass two)
//
// EXIT CODES -- three states, and collapsing any two throws away a distinction:
//   0  the run completed. Either the ranking was written, or there was honestly nothing to order
//      (no executing project / no candidates) and the cycle row says so.
//   2  the driver could not run, or the answer was REFUSED -- schema, an id outside the candidate
//      set, or the handler's own refusal. Nothing was written to backlog_items.
//   3  AWAITING THE RANKING (pass one). The state was written to disk, the prompt was printed, and
//      no row was touched. It is NOT 2: the driver ran its half correctly.
//
// Env (process.env only -- never hardcoded, never printed):
//   SUPABASE_URL / SUPABASE_SERVICE_KEY   the instruments hold no anon grants.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { assemblePrompt } from '../api/prompt/db-assembly.js';
import { renderAssembly } from './agent-prompt.js';
import { handle as prioritizerWrite } from '../api/_lib/handlers/prioritizer-write.js';
// IMPORTED, NOT RESTATED. `validateAgentVerdict` reads whatever schema it is handed and names the
// offending key -- generic despite the noun in its name, and already driven by AGT-67's own mutant
// guard. A second copy here would be a second contract to keep in step.
import { validateAgentVerdict } from './verifier.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// The cycle row's own vocabulary, carried over from api/cron/rank-backlog.js VERBATIM. `trigger` is
// 'scheduled' (the runner_cycles check constraint's value for a clock-driven fire, which the runner
// still is) and the notes PREFIX is what makes these rows findable as this job's, separately from
// the runner's own scheduled cycles. ses-334's live arm reads exactly this prefix.
export const NOTES_PREFIX = 'SCHEDULED-AGENT: rank-backlog';
export const CAPABILITY = 'rank-backlog';
export const INTENT = 'pz-rank-intent';
export const AGENT = 'prioritizer';
export const TENANT = 'global';

// See the exit-code table in the header. Named rather than literal so a caller can import the
// distinction instead of re-deriving it from a number.
export const EXIT_OK = 0;
export const EXIT_CANNOT_RUN = 2;
export const EXIT_AWAITING_ANSWER = 3;

// THE CAP IS AN OUTPUT-BUDGET FACT, NOT A ROUND NUMBER -- see item (4) in the header. Carried over
// from the retired route unchanged; `public.governance_rules` OD-44 states it.
export const MAX_CANDIDATES = 60;

function fail(message) {
  console.error(`rank-backlog: ${message}`);
  process.exit(EXIT_CANNOT_RUN);
}

// ---------------------------------------------------------------------------------------------
// Pure helpers -- exported so the regression suite drives every branch with no network, the same
// seam-proof convention scripts/verifier.js and scripts/run-project.js keep.
// ---------------------------------------------------------------------------------------------

export function parseArgs(argv) {
  const out = { json: false, dryRun: false };
  for (const raw of argv) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(raw);
    if (!m) return { error: `unrecognized argument "${raw}"` };
    const [, name, value] = m;
    switch (name) {
      case 'cycle': out.cycle = value; break;
      case 'answer': out.answer = value; break;
      case 'scratch': out.scratch = value; break;
      case 'state-file': out.stateFile = value; break;
      case 'dry-run': out.dryRun = true; break;
      case 'json': out.json = true; break;
      default: return { error: `unrecognized argument "--${name}"` };
    }
  }
  return out;
}

/**
 * Where pass one leaves the state for pass two, DERIVED so the two invocations find the same file
 * without the caller having to carry a path between them. Keyed on the cycle id, because two cycles
 * on the same day are two different boards.
 */
export function statePathFor(scratchDir, cycleId) {
  const key = String(cycleId || 'no-cycle').replace(/[^A-Za-z0-9_-]/g, '');
  return path.join(scratchDir, `rank-backlog-${key}.json`);
}

/**
 * THE ANSWER MUST BE ABOUT THIS BOARD. Schema validity is necessary and not sufficient: a ranking
 * file left over from an earlier run validates perfectly and writes an automation_rank onto rows
 * this run never looked at. Returns a list of English problems; empty means accept.
 */
export function answerErrors(answer, state, schema) {
  const errors = [];
  const verdict = validateAgentVerdict(schema, answer);
  if (!verdict.ok) errors.push(...verdict.errors);
  if (errors.length) return errors;

  const candidates = new Set((state?.candidates || []).map(c => c.backlog_id));
  if (candidates.size === 0) {
    errors.push('the state file names no candidates, so no ranking can be about it -- re-run pass one');
    return errors;
  }
  for (const entry of answer.ranked) {
    if (!entry || typeof entry !== 'object') {
      errors.push('every ranked entry must be an object');
      continue;
    }
    if (!candidates.has(entry.backlog_id)) {
      errors.push(`ranked names "${entry.backlog_id}", which was not a candidate in this run -- the `
        + 'answer is about a different board');
    }
  }
  return errors;
}

/** Non-negative integers only, and `null` (never 0) when the sub-agent reported nothing. */
export function tokensFrom(answer) {
  const inTok = Number.isInteger(answer?.input_tokens) && answer.input_tokens >= 0 ? answer.input_tokens : null;
  const outTok = Number.isInteger(answer?.output_tokens) && answer.output_tokens >= 0 ? answer.output_tokens : null;
  // `null`, NOT `0`, when the sub-agent reported nothing. This project has paid for that distinction
  // twice (SES-147's "NULL is not zero"): a stored 0 says the run was free.
  if (inTok === null && outTok === null) return { input: null, output: null, total: null };
  return { input: inTok || 0, output: outTok || 0, total: (inTok || 0) + (outTok || 0) };
}

// ---------------------------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------------------------

function headers() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` };
}

async function sb(pathAndQuery, init = {}) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`supabase ${init.method || 'GET'} ${pathAndQuery}: ${r.status} ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

/**
 * The candidates handed to the Prioritizer: the tickets the PICKER can actually reach, read from
 * `prime_directive_queue()` itself rather than re-derived from a `backlog_items` filter here (item
 * (2) in the header).
 */
async function candidates() {
  const lanes = await sb('rpc/prime_directive_queue', { method: 'POST', body: '{}' });
  const refs = (lanes || [])
    .filter(r => r.lane !== 'board' && r.qnum != null && r.ref)
    .sort((a, b) => a.pos - b.pos)
    .slice(0, MAX_CANDIDATES)
    .map(r => r.ref);
  if (refs.length === 0) return [];

  const cols = 'backlog_id,title,description,priority_class,supports_class,supports_reason,'
    + 'type,tier,queue,automation_rank,predicted_cycles,milestone';
  const rows = await sb(`backlog_items?backlog_id=in.(${refs.map(encodeURIComponent).join(',')})`
    + `&select=${cols}&limit=${MAX_CANDIDATES}`);
  // Handed to the model in the FUNCTION's order, not PostgREST's: the existing order is the thing the
  // ruling is being asked to revise, and shuffling it first would hide what changed.
  const byId = new Map((rows || []).map(r => [r.backlog_id, r]));
  return refs.map(id => byId.get(id)).filter(Boolean);
}

/** One cycle row per completed run, written at the end because a session IS the crash evidence. */
async function writeCycle({ startedAt, outcome, notes, tokens, cycleId }) {
  const [row] = await sb('runner_cycles', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      trigger: 'scheduled',
      stamp: `session rank-backlog${cycleId ? ` (in cycle ${cycleId})` : ''}`,
      model: 'claude-fable-5-1',
      outcome,
      item_id: null,
      est_tokens_dev: tokens,
      notes: `${NOTES_PREFIX} — ${notes}`,
    }),
  });
  return row;
}

// ---------------------------------------------------------------------------------------------
// Pass one
// ---------------------------------------------------------------------------------------------

async function passOne(args) {
  const startedAt = new Date().toISOString();
  const scratch = args.scratch || os.tmpdir();
  fs.mkdirSync(scratch, { recursive: true });
  const stateFile = args.stateFile || statePathFor(scratch, args.cycle);

  const projects = await sb('projects?status=eq.executing&select=id,name&order=name');
  if (!Array.isArray(projects) || projects.length === 0) {
    // Not a failure: no project is executing, so there is no board to order. A cycle row is still
    // written, because "the job ran and correctly did nothing" and "the job did not run" must be
    // distinguishable in the record.
    if (!args.dryRun) {
      await writeCycle({ startedAt, outcome: 'did_not_run', tokens: null, cycleId: args.cycle,
        notes: 'no project is executing; nothing to order' });
    }
    process.stdout.write(JSON.stringify({ ok: true, ranked: 0, reason: 'no executing project' }) + '\n');
    return EXIT_OK;
  }
  const project = projects[0];

  const rows = await candidates();
  if (rows.length === 0) {
    if (!args.dryRun) {
      await writeCycle({ startedAt, outcome: 'did_not_run', tokens: null, cycleId: args.cycle,
        notes: 'no queued candidates' });
    }
    process.stdout.write(JSON.stringify({ ok: true, ranked: 0, reason: 'no candidates' }) + '\n');
    return EXIT_OK;
  }

  // THE EXECUTOR'S OWN ASSEMBLY -- item (1) in the header. `intent_slug` is passed explicitly and
  // never omitted: db-assembly.js filters out EVERY Intent-type Skill when it is null (AA-188), so
  // the prompt would assemble, render, and carry no schema, no handler and no output contract.
  const assembly = await assemblePrompt({
    capability_slug: CAPABILITY,
    agent_id: AGENT,
    tenant_id: TENANT,
    task_context: { project: project.name, candidates: rows },
    intent_slug: INTENT,
  });
  const { system_prompt, omitted } = renderAssembly(assembly);
  if (omitted && omitted.length) {
    console.error(`rank-backlog: sections omitted (empty at assembly time): ${omitted.join(', ')}`);
  }

  const state = {
    version: 1,
    started_at: startedAt,
    cycle_id: args.cycle || null,
    project: project.name,
    capability: CAPABILITY,
    intent: INTENT,
    agent: AGENT,
    model: assembly.llm?.model || null,
    schema: assembly.format_contract?.schema || null,
    candidates: rows.map(r => ({ backlog_id: r.backlog_id, automation_rank: r.automation_rank ?? null })),
  };
  if (!state.schema) {
    fail(`the assembly carried no format contract for ${INTENT} -- refusing to print a prompt whose `
      + 'ranking could not be validated');
  }
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');

  process.stdout.write(system_prompt.endsWith('\n') ? system_prompt : `${system_prompt}\n`);
  console.error(`\nrank-backlog: pass one complete -- ${rows.length} candidate(s) on "${project.name}", `
    + `model ${state.model || 'unknown'}.`);
  console.error(`rank-backlog: state written to ${stateFile}`);
  console.error('rank-backlog: run the prompt above as a `prioritizer` sub-agent on the judgment lane, '
    + 'save its JSON, then re-run with --answer=<that file>.');
  return EXIT_AWAITING_ANSWER;
}

// ---------------------------------------------------------------------------------------------
// Pass two
// ---------------------------------------------------------------------------------------------

async function passTwo(args) {
  const scratch = args.scratch || os.tmpdir();
  const stateFile = args.stateFile || statePathFor(scratch, args.cycle);
  if (!fs.existsSync(stateFile)) {
    fail(`no state file at ${stateFile} -- run pass one first (without --answer)`);
  }
  let state;
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); }
  catch (e) { fail(`state file ${stateFile} is not readable JSON: ${e.message}`); }

  let answer;
  try { answer = JSON.parse(fs.readFileSync(args.answer, 'utf8')); }
  catch (e) { fail(`--answer file ${args.answer} is not readable JSON: ${e.message}`); }

  const problems = answerErrors(answer, state, state.schema);
  if (problems.length) {
    // REFUSED, not written. A partially-applied ranking is worse than a refused one.
    console.error(`rank-backlog: the ranking was REFUSED and nothing was written:\n  - ${problems.join('\n  - ')}`);
    if (!args.dryRun) {
      await writeCycle({ startedAt: state.started_at, outcome: 'failed', tokens: null, cycleId: args.cycle,
        notes: `ranking refused: ${problems[0]}` }).catch(() => {});
    }
    return EXIT_CANNOT_RUN;
  }

  const tokens = tokensFrom(answer);
  const content = {
    ranked: answer.ranked.map(e => ({
      backlog_id: e.backlog_id,
      automation_rank: e.automation_rank,
      reason: e.reason,
    })),
  };

  if (args.dryRun) {
    process.stdout.write(JSON.stringify({ ok: true, dry_run: true, would_rank: content.ranked.length,
      project: state.project, tokens: tokens.total }) + '\n');
    return EXIT_OK;
  }

  // THE SAME HANDLER THE EXECUTOR CALLS, in-process. It performs its own per-entry refusals
  // (backlog-id form, integer rank >= 1, duplicates), writes the decision row, and recomputes the
  // queue -- none of which is restated here.
  const result = await prioritizerWrite({
    agent_id: AGENT,
    tenant_id: TENANT,
    content,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseHeaders: headers(),
    handler_context: { cycle_id: state.cycle_id || args.cycle || null, trace_id: `ses-346-${state.cycle_id || 'session'}` },
  });
  const hr = result.handler_result || {};
  const written = hr.ranked?.length ?? 0;

  // The audit row, through the real script (§3f: "the log row is mandatory, not a courtesy"). The
  // retired route deliberately wrote NO row because the EXECUTOR had already logged the turn; on the
  // session path no executor call happens, so this run is invisible to the AI Audit without it.
  // `ai_type` is the capability slug, which shared/ai-patterns.js's SERVICE_CATALOG already names.
  try {
    execFileSync(process.execPath, [
      path.join(HERE, 'agent-log.js'),
      `--agent=${AGENT}`, `--capability=${CAPABILITY}`, '--model=claude-fable-5-1',
      `--ai-type=${CAPABILITY}`, `--feature=${CAPABILITY}:${INTENT}:depth0`,
      `--input-tokens=${tokens.input ?? 0}`, `--output-tokens=${tokens.output ?? 0}`,
      `--trace=ses-346-${state.cycle_id || 'session'}`,
      ...(state.cycle_id || args.cycle ? [`--cycle=${state.cycle_id || args.cycle}`] : []),
    ], { stdio: 'pipe', env: process.env });
  } catch (e) {
    // A missing audit row is a real finding and is SAID, but it must not un-write a ranking that is
    // already on the board -- reporting a failure that did not happen is its own defect.
    console.error(`rank-backlog: the ranking was written but the ai_activity_log row FAILED: ${e.message}`);
  }

  const cycle = await writeCycle({
    startedAt: state.started_at,
    outcome: written > 0 ? 'shipped' : 'did_not_run',
    tokens: tokens.total,
    cycleId: args.cycle,
    notes: `${written} ticket(s) given an automation_rank on ${state.project}`
      + `; decision ${hr.decision_id || 'none'}`
      + `; ${tokens.total === null ? 'tokens unreported by the sub-agent' : `${tokens.total} tokens`}`,
  });

  process.stdout.write(JSON.stringify({
    ok: hr.written !== false, ranked: written, project: state.project,
    cycle_id: cycle?.id || null, decision_id: hr.decision_id || null, tokens: tokens.total,
  }) + '\n');
  return written > 0 ? EXIT_OK : EXIT_CANNOT_RUN;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) fail(args.error);
  if (!process.env.SUPABASE_URL) fail('SUPABASE_URL not set');
  if (!process.env.SUPABASE_SERVICE_KEY) fail('SUPABASE_SERVICE_KEY not set');
  return args.answer ? passTwo(args) : passOne(args);
}

if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().then(code => process.exit(code)).catch(e => fail(e.message));
}
