#!/usr/bin/env node
// DeepBench v7.0.426 | scripts/agent-log.js | SES-331 -- the other half of the one path: a session
// that ran a governance agent itself writes the ai_activity_log row the executor would have written.
//
// WHY THIS EXISTS. scripts/agent-prompt.js makes a session's prompt the executor's prompt. This
// makes the session's RUN visible to the platform's own audit. Without it, running the governance
// agents on subscription tokens would silently empty the AI Audit of exactly the calls the Selfbuild
// project makes most -- which is not a saving, it is unmeasured spend. `.claude/rules/
// capability-logging.md` says every Layer-3 execution logs, no exceptions; a session is not an
// exception, it is a different runner.
//
// IT WRITES THROUGH logActivity(), NEVER A HAND-ROLLED POST. That function is the single
// choke point every server-side row goes through (AA-190), and going around it is how the nine
// bespoke payload shapes it replaced came to exist. SES-331's one change to it is that it now
// RETURNS the write promise, so this script can await the write and exit 2 on a real failure --
// see that file's header.
//
// call_source = 'session'. MEASURED, not assumed (2026-09-09, the whole log): null 30,351 / ui 4,110
// / regression 1,055 / script 19 / session-test 6. None of the four means "a session ran the agent":
// `script` is the inferred catch-all for any non-browser caller, `regression` is the suite driver,
// `session-test` is a Category L test. These rows carry real tokens and NO API dollars, and that
// distinction has to survive into the data. Added to lib/request-context.js's allowlist -- the only
// gate the value passes, since ai_activity_log has no CHECK constraint on the column.
//
// cost_usd IS NULL, NOT 0 (SES-383). The two are different assertions and the difference is the
// whole ticket: NULL means "not billable -- do not price this row, and do not count it", while 0
// would mean "billable and it happened to be free". A session turn runs on John's subscription, so
// no API dollar exists to record. NULL is also what makes the §19v dollar wall ONE number: the wall
// sums cost_usd over the whole table with no call_source filter, and NULL adds nothing -- so a
// non-billable row is excluded by its own value rather than by a filter someone has to remember to
// keep in step. Passing `costUsd: null` explicitly is required: lib/activity-log.js defaults it to
// `undefined`, which means "price it from my tokens" and is exactly the behaviour being fixed.
//
// AN OMITTED TOKEN PAIR IS "UNMEASURED", AND IT MUST STILL WRITE (SES-423). Until v7.0.530 this
// script refused an absent --input-tokens/--output-tokens outright -- parseCount() rejected
// `undefined` and parseArgs() called it unconditionally -- so a run nobody could measure exited 2
// and wrote NOTHING. The header below used to justify that refusal as "the DB's own CHECK
// constraint", which was FALSE, and re-read from pg_constraint this session rather than recalled:
//
//   ai_activity_log_tokens_nonneg_chk
//     CHECK ((COALESCE(input_tokens,0) >= 0) AND (COALESCE(output_tokens,0) >= 0)
//            AND (COALESCE(cache_creation_input_tokens,0) >= 0)
//            AND (COALESCE(cache_read_input_tokens,0) >= 0)) NOT VALID
//
// COALESCE means NULL PASSES BY CONSTRUCTION. Both columns are `is_nullable = YES`, 16,502 of
// 44,033 existing rows already hold a NULL input_tokens, and lib/activity-log.js:90-91 defaults
// both to null. The constraint bars a NEGATIVE count; it never required a count to exist. One
// validator, invented here and attributed to the database, was the whole blocker -- measured
// 2026-09-19: 11 runner cycles since 2026-09-18 18:00Z, 0 agent-turn rows for designer/builder/
// devmanager in that window, 33 mandatory rows unwritten.
//
// THE SHAPE IS scripts/rank-backlog.js's usageFromArgs() (SES-386), PORTED, NOT REINVENTED, and
// for that file's stated reason: "an unreported pair still stores NULL, never 0". The three cases
// are distinct on purpose and collapsing any two throws away a fact:
//   both absent            -> both NULL. UNMEASURED. It is not zero -- a stored 0 asserts the run
//                             was free, which is the SES-147 / SES-383 distinction this project
//                             has already paid for twice.
//   either malformed       -> exit 2, unchanged message. A bad number is a driver error, still.
//   exactly one present    -> exit 2 naming the missing half. A half-measured pair is not a
//                             measurement: storing one side and NULLing the other would read back
//                             as a turn that consumed input and produced nothing.
//
// --cycle GOES TO visitor_id, ON PURPOSE, and an editor must not "promote" it into call_facts.
// call_facts is the base of the §19k runtime signature; a per-cycle uuid there would make every row's
// signature distinct -- the measured LOG-91 failure, 720 -> 24,826 distinct signatures. visitor_id is
// LOG-130's slot for exactly this: the self-declared identity a non-browser caller has no other way
// to fill, a plumbing column, never a criteria key.
//
// USAGE
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/agent-log.js \
//     --agent=owen --capability=bench-report-card --model=claude-opus-5 \
//     --ai-type=bench-report-card --feature=bench-report-card:report-card-intent:depth0 \
//     --input-tokens=8123 --output-tokens=642 --latency-ms=19400 --cycle=<runner_cycles.id>
//
//   ...and the same command with NO token flags at all, for a turn whose usage the caller could
//   not observe. It writes the row with input_tokens/output_tokens NULL. That is the supported
//   path, not a degraded one: a mandatory row that says "unmeasured" is worth strictly more than
//   no row at all, and an invented 0 would be worth less than either.
//
// FLAGS (all required unless marked optional)
//   --agent=<agents.id>        who ran
//   --capability=<slug>        what was run; also the tenant-visible half of the audit
//   --model=<id>               THE MODEL THAT ACTUALLY SERVED THE SUB-AGENT. For a session run that
//                              is the session's own model, which is deliberately NOT validated
//                              against shared/models.js -- that file is the canonical list for calls
//                              the PLATFORM makes through the Anthropic API, a different question.
//   --ai-type=<slug>           must be a real SERVICE_CATALOG slug (shared/ai-patterns.js). Not
//                              negotiable and not inventable here: the audit's By-Service view reads
//                              this. Most capabilities' ai_type IS their capability_slug.
//   --feature=<text>           the platform's own `capability:intent:depthN` shape for an agent turn
//   --input-tokens / --output-tokens   optional, BUT ALL-OR-NOTHING. Give both as non-negative
//                              integers, or give neither and the row records NULL = "unmeasured".
//                              One without the other is refused. The non-negative bar IS the DB's
//                              CHECK constraint; the requirement that they be PRESENT never was --
//                              see the header's quotation of the live constraint.
//   --latency-ms=<int>         optional
//   --trace=<id>               optional; one is minted when absent, and is what the row is read back by
//   --cycle=<uuid>             optional runner_cycles.id -> visitor_id
//   --json                     optional machine-readable single-line result
//
// EXIT CODES: 0 the row is in the table and its id is printed; 2 anything else.

import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { logActivity } from '../lib/activity-log.js';
import { runWithCallSource } from '../lib/request-context.js';
import { SERVICE_CATALOG } from '../shared/ai-patterns.js';

export const CALL_SOURCE = 'session';
const DEFAULT_TENANT = 'global';

function fail(message) {
  console.error(`agent-log: ${message}`);
  process.exit(2);
}

function parseCount(value, flag) {
  if (!/^\d+$/.test(String(value ?? ''))) return { error: `--${flag} must be a non-negative integer` };
  return { value: Number(value) };
}

/**
 * FEATURE: SES-423 -- the token pair, with "absent" as a THIRD outcome rather than an error.
 *
 * Ported from scripts/rank-backlog.js's usageFromArgs() (SES-386) so the two entry points into the
 * same table agree on what an unreported pair means. The difference in return shape is deliberate
 * and small: usageFromArgs() omits absent keys because it merges over an answer file that may
 * itself carry the pair, whereas here there is no second source -- absent is final, so it is
 * spelled `null` (the value the column takes) instead of an absent key.
 *
 * Pure and exported so tests/regression/ses-423-self-observation.test.mjs drives the real
 * validator rather than a copy of its rules (docs/STANDARDS.md Section 4).
 *
 * Returns { inputTokens, outputTokens } or { error }.
 */
export function tokenPairFrom(inputRaw, outputRaw) {
  const given = [['input-tokens', inputRaw], ['output-tokens', outputRaw]].filter(([, v]) => v !== undefined);

  // UNMEASURED. Both NULL, and NOT 0 -- see the header. This is the case that used to exit 2.
  if (given.length === 0) return { inputTokens: null, outputTokens: null };

  // A HALF-MEASURED PAIR IS NOT A MEASUREMENT. Refused loudly and by name, because the alternative
  // -- storing the half that arrived and NULLing the other -- reads back as a real asymmetric turn
  // and is indistinguishable afterwards from one that truly was.
  if (given.length === 1) {
    const [presentFlag] = given[0];
    const missing = presentFlag === 'input-tokens' ? 'output-tokens' : 'input-tokens';
    return { error: `--${missing} is required when --${presentFlag} is given: a half-measured pair is not a measurement. Pass both, or omit both to record the run as unmeasured.` };
  }

  // Both present: today's validation, unchanged. A malformed count is still a hard error.
  const inTok = parseCount(inputRaw, 'input-tokens');
  if (inTok.error) return inTok;
  const outTok = parseCount(outputRaw, 'output-tokens');
  if (outTok.error) return outTok;
  return { inputTokens: inTok.value, outputTokens: outTok.value };
}

export function parseArgs(argv, catalogSlugs = SERVICE_CATALOG.map(s => s.slug)) {
  const out = { json: false };
  for (const raw of argv) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(raw);
    if (!m) return { error: `unrecognized argument "${raw}"` };
    const [, key, value] = m;
    switch (key) {
      case 'agent': out.agent = value; break;
      case 'capability': out.capability = value; break;
      case 'model': out.model = value; break;
      case 'ai-type': out.aiType = value; break;
      case 'feature': out.feature = value; break;
      case 'input-tokens': out.inputTokensRaw = value; break;
      case 'output-tokens': out.outputTokensRaw = value; break;
      case 'latency-ms': out.latencyRaw = value; break;
      case 'trace': out.trace = value; break;
      case 'cycle': out.cycle = value; break;
      case 'tenant': out.tenant = value; break;
      case 'json': out.json = true; break;
      default: return { error: `unrecognized flag "--${key}"` };
    }
  }
  for (const [field, flag] of [['agent', 'agent'], ['capability', 'capability'], ['model', 'model'],
                               ['aiType', 'ai-type'], ['feature', 'feature']]) {
    if (!out[field]) return { error: `--${flag} is required` };
  }
  // The AI-audit rule, enforced structurally rather than by convention: an ai_type outside the
  // catalog would land in By-Service as an unnamed slug. Say which file to add it to -- never
  // invent one here, and never let the write proceed on a guess.
  if (!catalogSlugs.includes(out.aiType)) {
    return { error: `--ai-type "${out.aiType}" is not a SERVICE_CATALOG slug. Add the entry to shared/ai-patterns.js in the same commit as the capability, or pass an existing slug.` };
  }
  const usage = tokenPairFrom(out.inputTokensRaw, out.outputTokensRaw);
  if (usage.error) return usage;
  out.inputTokens = usage.inputTokens;
  out.outputTokens = usage.outputTokens;
  if (out.latencyRaw !== undefined) {
    const r = parseCount(out.latencyRaw, 'latency-ms');
    if (r.error) return r;
    out.latencyMs = r.value;
  }
  return out;
}

async function readBackRowId(traceId) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/ai_activity_log`
    + `?trace_id=eq.${encodeURIComponent(traceId)}&select=id,call_source,visitor_id&order=id.desc&limit=1`;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return { error: `read-back failed: HTTP ${r.status} ${await r.text().catch(() => '')}` };
  const rows = await r.json();
  return rows[0] ? { row: rows[0] } : { error: 'read-back found no row for this trace id' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) fail(args.error);
  if (!process.env.SUPABASE_URL) fail('SUPABASE_URL not set');
  if (!process.env.SUPABASE_SERVICE_KEY) fail('SUPABASE_SERVICE_KEY not set');

  const traceId = args.trace || randomUUID();

  // The write. runWithCallSource() establishes the same AsyncLocalStorage context a real request
  // would -- this is the in-process seam lib/request-context.js already documents for callers that
  // never make an HTTP request, not a new mechanism invented for scripts.
  const result = await runWithCallSource(CALL_SOURCE, () => logActivity({
    tenantId: args.tenant || DEFAULT_TENANT,
    agentId: args.agent,
    aiType: args.aiType,
    feature: args.feature,
    model: args.model,
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
    latencyMs: args.latencyMs ?? null,
    // FEATURE: SES-383 -- see the header note. NULL = "not billable", and it must be passed
    // explicitly: the default is `undefined`, which prices the row from its tokens.
    costUsd: null,
    traceId,
  }), args.cycle ? { visitorId: args.cycle } : {});

  // NEVER SILENTLY SUCCEEDS. logActivity() is fire-and-forget on the request path by design; here
  // the returned promise is the only thing standing between "wrote a row" and "printed nothing and
  // exited 0", which is what a hand-rolled version of this script would do.
  if (!result || !result.ok) fail(`write failed: ${result?.error || 'unknown error'}`);

  const back = await readBackRowId(traceId);
  if (back.error) fail(back.error);

  if (args.json) {
    process.stdout.write(JSON.stringify({ id: back.row.id, trace_id: traceId, call_source: back.row.call_source, visitor_id: back.row.visitor_id }) + '\n');
  } else {
    process.stdout.write(`ai_activity_log id=${back.row.id} trace_id=${traceId} call_source=${back.row.call_source}\n`);
  }
}

// Entry-point guard (see scripts/agent-prompt.js's own note): the regression guard imports
// parseArgs from here and must not run the script.
if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => fail(e.message));
}
