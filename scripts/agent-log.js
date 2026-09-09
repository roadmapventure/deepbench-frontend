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
//   --input-tokens / --output-tokens   non-negative integers (the DB's own CHECK constraint)
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
  const inTok = parseCount(out.inputTokensRaw, 'input-tokens');
  if (inTok.error) return inTok;
  out.inputTokens = inTok.value;
  const outTok = parseCount(out.outputTokensRaw, 'output-tokens');
  if (outTok.error) return outTok;
  out.outputTokens = outTok.value;
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
