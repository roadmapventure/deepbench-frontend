// DeepBench v7.0.530 | tests/regression/ses-423-self-observation.test.mjs | SES-423 slice 1
//
// Guards the two places the routine's OWN governance writes were landing as silence: a run the
// caller could not measure wrote no row at all, and the Prioritizer's in-process writes wrote rows
// nobody could attribute. Both are "the platform cannot see itself" defects, which is why one file
// pins both -- they are the same class and they regress the same way, by someone restoring a
// stricter-looking validator or unwrapping a call that looks redundant.
//
// WHAT WOULD MAKE A LAZIER GUARD VACUOUS, clause by clause.
//
// (A) TOKENS. "An omitted pair is accepted" is satisfied by a build that quietly stores 0, and a
// stored 0 is the exact falsehood this ticket exists to prevent: it asserts the turn was FREE,
// where NULL asserts it was UNMEASURED (the SES-147 / SES-383 distinction, and the reason
// scripts/agent-log.js passes costUsd: null explicitly). So the assertion is not "it did not
// error" -- it is that absent yields `null` AND that an explicit `--input-tokens=0` still yields
// `0`, with the two distinguished from each other. A build that collapsed them would pass either
// assertion alone and fails the pair.
//
// The other direction matters just as much. The pre-change refusal was WRONG but it was not
// pointless: a malformed count is still a driver error, and a HALF pair is still not a measurement.
// Storing the half that arrived and NULLing the other reads back afterwards as a genuine
// asymmetric turn -- indistinguishable from a real one, and therefore worse than a refusal. Both
// refusals are asserted, with the half-pair asserted in BOTH orders so a fix that only checked
// "input present, output missing" cannot pass.
//
// (B) THE CALLERS. Proving the mechanism (clause C) says nothing about whether the two callers the
// ticket names actually use it, and an ESM import binding cannot be intercepted to observe it at
// runtime. So this arm reads the source and asserts the prioritizerWrite() call is lexically inside
// runWithCallSource('session', ...) -- and it carries its own mutation control: the SAME predicate,
// run against the un-wrapped form, must REJECT. A predicate that cannot reject the mutant is not
// measuring anything (the AGT-63 rule, applied here).
//
// (C) THE MECHANISM, LIVE AND IN BOTH DIRECTIONS. This is the clause that proves the wrapper
// changes what reaches the table rather than merely being present in the file. The REAL handler is
// called twice against one fixture ticket -- once bare, once wrapped -- and the two ai_activity_log
// rows it writes are read back and compared. Bare must land call_source NULL (the retired
// behaviour, and the negative control: it is what 1,216 of 1,216 live prioritizer rows carry), and
// wrapped must land 'session'. Asserting only the wrapped arm would pass against a build where
// call_source is 'session' for some unrelated reason -- a difference between the two arms is the
// only thing that proves the wrapper is load-bearing.
//
// FORWARD-ONLY. Nothing here back-fills the historical NULL rows (LOG-121): they are a true record
// of writes that genuinely had no attribution, and rewriting them would destroy the evidence that
// dates the fix.
//
// THE FIXTURE IS INSERTED AND DELETED, its id is outside every live prefix, and every row this
// test causes -- ticket, decision, before-image, and both log rows -- is removed in `finally`.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { tokenPairFrom, parseArgs } from "../../scripts/agent-log.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

const FIXTURE_BACKLOG_ID = "ZZSES-423";
const AGENT_ID = "prioritizer";
const LOG_FEATURE = "prioritizer:classify-write";

// The two in-process callers SES-423 names. Both call the same handler for the same reason and
// both were bare; listed as data so a third caller added later is a one-line addition here.
const IN_PROCESS_CALLERS = ["scripts/rank-backlog.js", "scripts/prioritizer-first-run.mjs"];

// A minimal well-formed argv for scripts/agent-log.js, so each token case differs from the others
// in exactly the flags under test and nothing else.
const BASE_ARGV = [
  "--agent=designer",
  "--capability=design-kickoff",
  "--model=claude-opus-5",
  "--ai-type=agent-turn",
  "--feature=design-kickoff:ds-kickoff-intent:depth0",
];
// parseArgs() validates --ai-type against the SERVICE_CATALOG; the slug list is injectable exactly
// so a guard drives the real parser without depending on today's catalog contents.
const CATALOG = ["agent-turn"];

/**
 * Exported so the predicate is checkable rather than invisible inside one assertion (and so its
 * mutation control below drives the same code the positive assertion does).
 *
 * Deliberately anchored on the OPENING of the wrapper through to the handler call, tolerating the
 * newline and indentation between them, because that is the only arrangement that actually puts
 * the call inside the AsyncLocalStorage context. A looser "both strings appear in the file" test
 * would pass against a file that wraps something else entirely.
 */
export function wrapsPrioritizerWrite(src) {
  return /runWithCallSource\(\s*['"]session['"]\s*,\s*\(\s*\)\s*=>\s*prioritizerWrite\(/.test(src);
}

function tokensAbsentMeansUnmeasuredNotFree() {
  const pair = tokenPairFrom(undefined, undefined);
  assert.ok(!pair.error, `an omitted token pair must be accepted, got: ${pair.error}`);
  assert.strictEqual(pair.inputTokens, null,
    "an omitted --input-tokens must store NULL = unmeasured");
  assert.strictEqual(pair.outputTokens, null,
    "an omitted --output-tokens must store NULL = unmeasured");

  // THE DISCRIMINATION, not just the acceptance: 0 is a different assertion from absent, and a
  // build that collapsed them would satisfy the clause above while storing "this run was free".
  const zero = tokenPairFrom("0", "0");
  assert.strictEqual(zero.inputTokens, 0, "an explicit --input-tokens=0 must survive as 0");
  assert.strictEqual(zero.outputTokens, 0, "an explicit --output-tokens=0 must survive as 0");
  assert.notStrictEqual(pair.inputTokens, zero.inputTokens,
    "absent and 0 must not be the same stored value -- NULL means unmeasured, 0 means free");

  // And through the REAL parser, not only the helper it delegates to, since parseArgs() is what
  // the CLI actually runs and it is where the unconditional validator used to sit.
  const parsed = parseArgs(BASE_ARGV, CATALOG);
  assert.ok(!parsed.error, `parseArgs must accept an argv with no token flags, got: ${parsed.error}`);
  assert.strictEqual(parsed.inputTokens, null, "parseArgs must carry the absent pair through as NULL");
  assert.strictEqual(parsed.outputTokens, null, "parseArgs must carry the absent pair through as NULL");
}

function aMalformedCountIsStillAHardError() {
  for (const bad of ["-1", "abc", "1.5", ""]) {
    const r = tokenPairFrom(bad, "5");
    assert.ok(r.error, `--input-tokens=${JSON.stringify(bad)} must still be refused`);
    assert.match(r.error, /--input-tokens must be a non-negative integer/,
      "the malformed-count message must be the one callers already parse");

    const viaParse = parseArgs([...BASE_ARGV, `--input-tokens=${bad}`, "--output-tokens=5"], CATALOG);
    assert.ok(viaParse.error, `parseArgs must refuse --input-tokens=${JSON.stringify(bad)}`);
  }

  // The same bar on the other side, so a fix that only re-validated the first flag cannot pass.
  const r = tokenPairFrom("5", "-2");
  assert.ok(r.error, "a negative --output-tokens must still be refused");
  assert.match(r.error, /--output-tokens must be a non-negative integer/);
}

function aHalfPairIsNotAMeasurement() {
  const missingOutput = tokenPairFrom("5", undefined);
  assert.ok(missingOutput.error, "--input-tokens without --output-tokens must be refused");
  assert.match(missingOutput.error, /--output-tokens is required/,
    "the refusal must name the MISSING half, not the one that arrived");

  // BOTH ORDERS. A validator that only noticed "input present, output absent" would pass the
  // assertion above and let the mirror case through.
  const missingInput = tokenPairFrom(undefined, "7");
  assert.ok(missingInput.error, "--output-tokens without --input-tokens must be refused");
  assert.match(missingInput.error, /--input-tokens is required/,
    "the refusal must name the missing half in this direction too");

  const viaParse = parseArgs([...BASE_ARGV, "--input-tokens=5"], CATALOG);
  assert.ok(viaParse.error, "parseArgs must refuse a half pair");
  assert.match(viaParse.error, /--output-tokens is required/);
}

function bothInProcessCallersRunUnderTheSessionSeam() {
  for (const rel of IN_PROCESS_CALLERS) {
    const src = read(rel);
    assert.match(src, /import \{ runWithCallSource \} from '\.\.\/lib\/request-context\.js'/,
      `${rel} must import runWithCallSource -- the defect was that neither caller did`);
    assert.ok(wrapsPrioritizerWrite(src),
      `${rel} must call prioritizerWrite() inside runWithCallSource('session', ...) or its rows ` +
      "land with call_source NULL");

    // MUTATION CONTROL: strip the wrapper and the same predicate must reject. This is the retired
    // behaviour verbatim, so it proves the predicate measures the wrapper rather than the file.
    const mutant = src.replace(
      /runWithCallSource\(\s*['"]session['"]\s*,\s*\(\s*\)\s*=>\s*prioritizerWrite\(/,
      "prioritizerWrite(",
    );
    assert.ok(!wrapsPrioritizerWrite(mutant),
      `wrapsPrioritizerWrite() must reject the un-wrapped form of ${rel} -- a predicate that ` +
      "cannot reject the mutant is not measuring anything");
  }
}

// Polls for the log row the handler writes. logActivity() is fire-and-forget by design (it is on
// the request path), so the row appears shortly AFTER handle() resolves -- waiting for it is the
// test adapting to the real contract, not papering over a race.
async function waitForLogRowAfter(rest, watermarkId) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const rows = await rest(
      `ai_activity_log?id=gt.${watermarkId}&feature=eq.${encodeURIComponent(LOG_FEATURE)}` +
      "&select=id,call_source,feature&order=id.asc&limit=1");
    if (rows.length) return rows[0];
    await new Promise(r => setTimeout(r, 250));
  }
  return null;
}

export default async function run() {
  // ── Offline arms: the token contract, and the two callers ────────────────────────────────
  tokensAbsentMeansUnmeasuredNotFree();
  aMalformedCountIsStillAHardError();
  aHalfPairIsNotAMeasurement();
  bothInProcessCallersRunUnderTheSessionSeam();

  // ── Live arm: the seam changes what reaches the table, in both directions ─────────────────
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("SES-423 live arm (call_source on the in-process prioritizer write)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name " +
      "(docs/runbooks/session-setup.md step 1b) and re-run: " +
      "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js");
    return;
  }

  const H = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
  const rest = async (p, init = {}) => {
    const r = await fetch(`${url}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
    if (!r.ok) throw new Error(`${init.method || "GET"} ${p} -> ${r.status} ${await r.text()}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };

  const { handle } = await import("../../api/_lib/handlers/prioritizer-write.js");
  const { runWithCallSource } = await import("../../lib/request-context.js");

  const sessionTag = `ses423-test-${Date.now()}`;
  const payload = klass => ({
    agent_id: AGENT_ID,
    tenant_id: "global",
    content: {
      backlog_id: FIXTURE_BACKLOG_ID,
      priority_class: klass,
      supports_class: null,
      supports_reason: null,
      type: "Tooling",
      claim_refs: ["pattern:137"],
      confidence: "high",
    },
    supabaseUrl: url,
    supabaseHeaders: { ...H },
    handler_context: { trace_id: sessionTag },
  });

  let fixtureUuid = null;
  const logRowIds = [];

  try {
    await rest(`backlog_items?backlog_id=eq.${FIXTURE_BACKLOG_ID}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const inserted = await rest("backlog_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        backlog_id: FIXTURE_BACKLOG_ID,
        tier: "later",
        status: "open",
        type: "Tooling",
        priority_class: "P5 - Enhancements",
        title: "SES-423 regression fixture -- inserted and deleted by this test",
        description: "Fixture row for tests/regression/ses-423-self-observation.test.mjs. Never a real ticket.",
        source_file: "tests/regression/ses-423-self-observation.test.mjs",
        row_ordinal: 999998,
      }),
    });
    fixtureUuid = inserted[0].id;

    // --- NEGATIVE CONTROL: the bare call, which is the retired behaviour verbatim. ---
    const beforeBare = (await rest("ai_activity_log?select=id&order=id.desc&limit=1"))[0];
    const bare = await handle(payload("P10 - Tooling"));
    assert.equal(bare.handler_result.written, true,
      `the handler refused the fixture payload: ${bare.handler_result.reason}`);
    const bareRow = await waitForLogRowAfter(rest, beforeBare.id);
    assert.ok(bareRow, "the handler must write a prioritizer:classify-write row -- without one this arm proves nothing");
    logRowIds.push(bareRow.id);
    assert.strictEqual(bareRow.call_source, null,
      "called bare, the in-process write must land call_source NULL -- that is the defect being " +
      "fixed, and if this ever stops being true the wrapped arm below no longer proves anything");

    // --- POSITIVE ARM: the same handler, same payload shape, under the seam. ---
    const wrapped = await runWithCallSource("session", () => handle(payload("P5 - Enhancements")));
    assert.equal(wrapped.handler_result.written, true,
      `the handler refused the wrapped payload: ${wrapped.handler_result.reason}`);
    const wrappedRow = await waitForLogRowAfter(rest, bareRow.id);
    assert.ok(wrappedRow, "the wrapped call must also write its log row");
    logRowIds.push(wrappedRow.id);
    assert.strictEqual(wrappedRow.call_source, "session",
      "under runWithCallSource('session', ...) the same write must land call_source 'session'");

    // The difference IS the assertion -- either arm alone would pass against a build where
    // call_source came from somewhere else entirely.
    assert.notStrictEqual(bareRow.call_source, wrappedRow.call_source,
      "the two arms must differ, or the wrapper is not what put 'session' in the column");
    console.log(`[SES-423] in-process prioritizer write: bare row ${bareRow.id} call_source=${JSON.stringify(bareRow.call_source)}, ` +
      `wrapped row ${wrappedRow.id} call_source=${JSON.stringify(wrappedRow.call_source)}`);
  } finally {
    // Order matters: runner_before_images.decision_id FKs runner_decisions.
    await fetch(`${url}/rest/v1/runner_before_images?session_name=eq.${encodeURIComponent(`${AGENT_ID}:${sessionTag}`)}`, { method: "DELETE", headers: H }).catch(() => {});
    await fetch(`${url}/rest/v1/runner_decisions?session_name=eq.${encodeURIComponent(`${AGENT_ID}:${sessionTag}`)}`, { method: "DELETE", headers: H }).catch(() => {});
    if (fixtureUuid) {
      await fetch(`${url}/rest/v1/backlog_items?id=eq.${fixtureUuid}`, { method: "DELETE", headers: H }).catch(() => {});
    }
    for (const id of logRowIds) {
      await fetch(`${url}/rest/v1/ai_activity_log?id=eq.${id}`, { method: "DELETE", headers: H }).catch(() => {});
    }
  }
}

selfRun(import.meta.url, run);
