// DeepBench v7.0.538 | tests/regression/ses-424f-executor-citations.test.mjs | SES-424 slice 6 --
// the EXECUTOR's half of the citation path: lib/activity-log.js writes
// public.decision_pattern_citations rows for a turn that cited, writes nothing and changes nothing
// for a turn that did not, and never lets a refused citation cost the turn its mandatory audit row.
//
// WHAT WOULD BREAK SILENTLY WITHOUT THIS FILE, which is the only reason it is permanent.
//
// (1) THE UNCITED PATH IS THE ONE WITH 45 CALL SITES ON IT. `patternsApplied` defaults to [], and
// every existing caller of logActivity() takes that default. If a later edit made the
// `return=representation` header or the id read unconditional, every one of those 45 writes would
// start pulling a full row body back on a path that runs inside waitUntil() -- and nothing would
// fail, nothing would error, and no row would look wrong. Arm A counts the fetches and reads the
// Prefer header on BOTH branches, so "one request, return=minimal" is asserted rather than assumed.
//
// (2) "THE EXECUTOR CITES" IS SATISFIED BY A BUILD THAT PARSES AND WRITES NOTHING. That is exactly
// the state this slice found: slice 5 shipped the table, the view and the flag, and
// decision_pattern_citations held 0 rows because no executor path fed it. So arm A asserts the
// SECOND request -- its URL, its method and its BODY, both rows, each carrying agent_id and
// capability_slug -- not merely that a citing call resolved.
//
// (3) A CITATION FAILURE MUST NEVER UNWRITE A TURN. The audit row is mandatory (`.claude/rules/
// capability-logging.md`); the citations are best-effort attribution. A build that awaited the
// citation insert and rejected on a 400 would turn every bad pattern number into a lost audit row
// -- SES-423's defect wearing a new flag, and invisible until the day a number is wrong. Arm A
// drives the 400 and asserts { ok: true, citationError } with nothing thrown.
//
// (4) THE CAPTURE LINE IN execute.js IS ONE LINE AND HAS NO RUNTIME TEST WITHOUT A MODEL CALL.
// Arm C reads the source, and it reads it WITH A CONTROL MUTATION: the same predicate is run
// against a copy with the line removed and must fail there, so a regex that matches anything
// cannot pass for coverage.
//
// (5) THE RUNBOOK FLAG IS WHAT MAKES THE CITATIONS HAPPEN AT ALL on the session route -- a command
// nobody is told to pass cites nothing, which is measured fact: `grep -c -- '--patterns-applied'`
// was 0 in both runbooks with the whole mechanism already shipped. Arm D pins all five call sites
// and the runbook's byte ceiling, which this slice's additions had to make room under.
//
// NO MODEL CALL, NO SPEND, AND NO LIVE ROW. Arms A-D are entirely offline: arm A stubs global
// fetch, arms B-D read source and exported functions. Nothing here writes to Supabase, so nothing
// here needs cleaning up (pattern:76) -- the live round trip is ses-424e's, deliberately not
// duplicated here.
//
// ONE VOCABULARY (STANDARDS.md Section 13): selfRun()/notRun() from _lib/self-run.js.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

import { logActivity } from "../../lib/activity-log.js";
import { coercePatternNumbers, parsePatternsApplied as parseFromLib } from "../../lib/pattern-citations.js";
import { parsePatternsApplied } from "../../scripts/agent-log.js";
import { BYTES_AT_SHIP, RUNBOOK_CEILING } from "./ses-413d-questions-scoreboard.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const EXECUTE = "api/capabilities/execute.js";
const CYCLE = "docs/runbooks/runner-cycle.md";
const SETUP = "docs/runbooks/session-setup.md";

// The flag exactly as it must appear in both runbooks, and the number of blocks in each. Measured
// at this ship, not recalled: 0 and 0 before, 3 and 2 after (§2's own before/after ladder).
const FLAG = "--patterns-applied=<answer.patterns_applied>";
const CYCLE_BLOCKS = 3;
const SETUP_BLOCKS = 2;

// The turn under test. The two numbers are ses-424e's CITED pair, so both halves of the one path
// are graded on the same citation.
const CITED = [1, 163];
const AGENT = "designer";
const FEATURE = "design-kickoff:ds-kickoff-intent:depth0";
const CAPABILITY = "design-kickoff";

const FAKE_URL = "https://ses424f.invalid";
const FAKE_KEY = "ses424f-not-a-real-key";
const INSERTED_ID = 987654;

// One fetch stub for the whole arm. Records every call, answers the ai_activity_log POST with the
// inserted row (so the representation path has an id to find) and the citation POST per `citeStatus`.
function withFetchSpy(citeStatus, fn) {
  const calls = [];
  const realFetch = global.fetch;
  const realUrl = process.env.SUPABASE_URL;
  const realKey = process.env.SUPABASE_SERVICE_KEY;
  // The env is faked so this arm cannot reach a real database even if the suite is run WITH
  // credentials -- an offline arm that quietly went live would write rows nobody cleans up.
  process.env.SUPABASE_URL = FAKE_URL;
  process.env.SUPABASE_SERVICE_KEY = FAKE_KEY;
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || "GET", headers: init.headers || {}, body: init.body });
    if (String(url).includes("/rest/v1/ai_activity_log")) {
      return new Response(JSON.stringify([{ id: INSERTED_ID }]), { status: 201, headers: { "Content-Type": "application/json" } });
    }
    if (String(url).includes("/rest/v1/decision_pattern_citations")) {
      return citeStatus === 201
        ? new Response(JSON.stringify(CITED.map(n => ({ activity_log_id: INSERTED_ID, pattern_no: n }))), { status: 201, headers: { "Content-Type": "application/json" } })
        : new Response('{"code":"23503","message":"insert violates foreign key constraint"}', { status: citeStatus, headers: { "Content-Type": "application/json" } });
    }
    throw new Error(`ses-424f: unexpected outbound request to ${url} -- this arm is offline`);
  };
  return Promise.resolve()
    .then(() => fn(calls))
    .finally(() => {
      global.fetch = realFetch;
      if (realUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = realUrl;
      if (realKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = realKey;
    });
}

const preferOf = call => (call.headers.Prefer ?? call.headers.prefer ?? null);

export default async function run_() {
  // ---- (A) the fetch seam, offline ------------------------------------------------------------

  // A1. THE UNCITED TURN -- every one of the 45 existing call sites. One request, return=minimal,
  // and a result carrying nothing but ok/status.
  const uncited = await withFetchSpy(201, async calls => {
    const r = await logActivity({ aiType: "agent-turn", agentId: AGENT, feature: FEATURE, model: "claude-opus-5" });
    assert.equal(calls.length, 1,
      `an uncited turn must make EXACTLY ONE request, got ${calls.length} (${calls.map(c => c.url).join(", ")}) ` +
      "-- 45 call sites take this path inside waitUntil(), and a second round trip added to all of " +
      "them would be invisible in every other assertion");
    assert.equal(preferOf(calls[0]), "return=minimal",
      "the uncited POST must still ask for return=minimal -- that header IS the byte-identical " +
      "contract SES-331's fetch-seam proof compares before and after");
    assert.deepEqual(Object.keys(r).sort(), ["ok", "status"],
      `an uncited result must carry ok/status and nothing else, got ${JSON.stringify(r)}`);
    return r;
  });
  assert.equal(uncited.ok, true);

  // A2. THE CITED TURN -- the control for A1's "exactly one": the counter must be able to see TWO,
  // or "got 1" above proves nothing about whether a second request can be detected at all.
  await withFetchSpy(201, async calls => {
    const r = await logActivity({
      aiType: "agent-turn", agentId: AGENT, feature: FEATURE, model: "claude-opus-5", patternsApplied: CITED,
    });
    assert.equal(calls.length, 2,
      `a citing turn must make TWO requests (the log row, then its citations), got ${calls.length} ` +
      "-- a build that parses patternsApplied and writes nothing would make ONE and satisfy every " +
      "assertion about the returned object");
    assert.equal(preferOf(calls[0]), "return=representation",
      "a citing POST must ask for the row back: activity_log_id is a foreign key, so there is " +
      "nothing to cite until the insert reports its id");
    const cite = calls[1];
    assert.ok(cite.url.includes("/rest/v1/decision_pattern_citations"),
      `the second request must be the citation insert, got ${cite.url}`);
    assert.equal(cite.method, "POST");
    const rows = JSON.parse(cite.body);
    assert.deepEqual(rows.map(x => x.pattern_no).sort((a, b) => a - b), CITED,
      "the citation body must carry ONE ROW PER CITED PATTERN -- both, not the first");
    assert.ok(rows.every(x => x.activity_log_id === INSERTED_ID),
      `every citation row must point at the id the insert returned (${INSERTED_ID})`);
    assert.ok(rows.every(x => x.agent_id === AGENT && x.capability_slug === CAPABILITY),
      "each citation must carry the agent and the capability that cited it -- the weekly view " +
      "groups by agent, and the capability is parsed from the feature's own first segment, so a " +
      "citation with either missing cannot be read back as anyone's");
    assert.equal(r.ok, true);
    assert.equal(r.id, INSERTED_ID, "the result must carry the id the row was written under");
    assert.equal(r.citations, CITED.length,
      "the result must report the citations the DATABASE accepted, read off the insert's own " +
      "representation -- never the length of what was asked for");
    assert.ok(!("citationError" in r), `a successful citation must leave no citationError: ${JSON.stringify(r)}`);
  });

  // A3. THE REFUSAL. A 400 on the citations must leave the audit row standing, resolve { ok: true }
  // with a citationError, and throw nothing -- this promise is handed to waitUntil().
  await withFetchSpy(400, async calls => {
    let threw = null;
    let r = null;
    try {
      r = await logActivity({
        aiType: "agent-turn", agentId: AGENT, feature: FEATURE, model: "claude-opus-5", patternsApplied: CITED,
      });
    } catch (e) { threw = e; }
    assert.equal(threw, null,
      `a refused citation must not throw (${threw && threw.message}) -- the promise goes to ` +
      "waitUntil(), and a rejection there is an unhandled rejection in production");
    assert.equal(calls.length, 2, "the log row must still have been POSTed before the citations were tried");
    assert.equal(r.ok, true,
      `the turn must still report ok:true -- the ai_activity_log row is MANDATORY and is not ` +
      `rolled back to punish a bad citation, got ${JSON.stringify(r)}`);
    assert.equal(r.id, INSERTED_ID);
    assert.ok(typeof r.citationError === "string" && r.citationError.includes(String(INSERTED_ID)),
      `the refusal must be REPORTED and must name the standing log row, got ${JSON.stringify(r.citationError)} ` +
      "-- a silently swallowed citation failure is indistinguishable from a turn that cited nothing");
    assert.ok(!("citations" in r),
      "a refused citation must not also report a count: the two are different answers");
  });

  // ---- (B) the two parsers, and the difference between them -----------------------------------

  assert.deepEqual(coercePatternNumbers([1, "163", 0, "x", 163]), [1, 163],
    "coercePatternNumbers() must keep the positive integers (as numbers OR numeric strings), drop " +
    "0, drop the junk, and dedupe -- this is what a MODEL wrote, and the unique " +
    "(activity_log_id, pattern_no) constraint would refuse the repeat");
  assert.deepEqual(coercePatternNumbers("163,1,x,163"), [1, 163],
    "a csv string must coerce identically -- the same key arrives as a string from a flag and as " +
    "an array from an Intent schema");
  assert.deepEqual(coercePatternNumbers(undefined), [], "an absent answer cites nothing");
  assert.deepEqual(coercePatternNumbers(null), []);
  assert.deepEqual(coercePatternNumbers("nonsense"), [],
    "an unreadable answer must coerce to [] and NOT to an error -- attribution is best-effort and " +
    "must never cost the turn its mandatory audit row (SES-423)");
  // THE CONTROL, and the whole reason there are two functions: the SAME junk that coerces silently
  // must still be REFUSED by the strict CLI parser, where a human typed it and the fix is to retype
  // it. A build that pointed both entry points at one lenient function would pass every assertion
  // above and silently drop a driver's typo.
  assert.ok(parsePatternsApplied("x").error,
    "the CLI parser must still REFUSE what the coercer drops -- a typed flag is a driver bug, " +
    "refused loudly before the audit row is written");
  assert.ok(parsePatternsApplied("0").error,
    "the CLI parser must still refuse 0 -- public.decision_patterns is numbered from 1");
  assert.deepEqual(parsePatternsApplied("163,1,163"), [1, 163],
    "and it must still dedupe and sort exactly as it did before the move");
  assert.equal(parsePatternsApplied, parseFromLib,
    "scripts/agent-log.js must RE-EXPORT lib/pattern-citations.js's parser, not keep a copy: " +
    "ses-424e-patterns-cited.test.mjs imports it from the script's path, and two copies of a rule " +
    "are two rules (docs/STANDARDS.md Section 4)");

  // ---- (C) the capture and the forward, in api/capabilities/execute.js -------------------------

  const executeSrc = read(EXECUTE);
  // The predicate is a named function so the CONTROL below runs the identical check against a
  // mutated copy. A source assertion with no control is a regex that may match anything.
  const capturesAndForwards = src => ({
    captures: /patternsApplied:\s*coercePatternNumbers\(\s*turn\.tool_input\?\.patterns_applied\s*\)/.test(src),
    imports: /import\s*\{[^}]*coercePatternNumbers[^}]*\}\s*from\s*['"][^'"]*lib\/pattern-citations\.js['"]/.test(src),
    accepts: /export async function logAgentTurn\(\{[^}]*patternsApplied\s*=\s*\[\][^}]*\}\)/.test(src),
    forwards: /\n\s*patternsApplied,\n\s*\}\);/.test(src),
  });
  const live = capturesAndForwards(executeSrc);
  assert.ok(live.imports, `${EXECUTE} must import coercePatternNumbers from lib/pattern-citations.js`);
  assert.ok(live.captures,
    `${EXECUTE}'s heldTurnLog must read patterns_applied off turn.tool_input through ` +
    "coercePatternNumbers() -- that is the model's own answer, and it is the only place the " +
    "executor ever sees it");
  assert.ok(live.accepts,
    "logAgentTurn() must accept patternsApplied with an EMPTY DEFAULT -- every pre-existing caller " +
    "and the failure seam omit it, and [] must mean 'writes nothing, changes nothing'");
  assert.ok(live.forwards, "logAgentTurn() must pass patternsApplied on to logActivity()");
  // CONTROL: strip the capture line and the same predicate must go false. Without this, a regex
  // that happened to match any file would read as coverage.
  const mutated = executeSrc.replace(/\n\s*patternsApplied: coercePatternNumbers\([^\n]*\n/, "\n");
  assert.notEqual(mutated, executeSrc, "the control mutation must actually change the source");
  assert.equal(capturesAndForwards(mutated).captures, false,
    "the capture check must FAIL against a copy with the capture removed -- otherwise it is not " +
    "checking anything");

  // THE FAILURE SEAM CITES NOTHING, on purpose: a refused, aborted or rejected call produced no
  // answer, so it has no criteria to cite. Asserted structurally -- the failure-path logAgentTurn()
  // call is the one that passes costUsd off mc.billed, and it must not name patternsApplied.
  const failureCall = executeSrc.slice(
    executeSrc.indexOf("if (e?.modelCall?.sent)"),
    executeSrc.indexOf("const hopOrdinal = conversationHistory.length;"));
  assert.ok(failureCall.includes("costUsd: mc.billed === false ? 0 : undefined"),
    "sanity: the slice must really be the failure-path write");
  assert.ok(!failureCall.includes("patternsApplied"),
    "the failure-path write must pass NO citations -- a turn that never answered has nothing to " +
    "cite, and a citation invented for it would be a claim about a turn that did not speak");

  // ---- (D) the five commands, and the ceiling they had to fit under ---------------------------

  const cycleSrc = read(CYCLE);
  const setupSrc = read(SETUP);
  const countFlag = src => src.split("\n").filter(l => l.includes(FLAG)).length;
  assert.equal(countFlag(cycleSrc), CYCLE_BLOCKS,
    `${CYCLE} must carry \`${FLAG}\` on ${CYCLE_BLOCKS} lines -- one per scripts/agent-log.js ` +
    `block (devmanager, designer, builder), got ${countFlag(cycleSrc)}. It was 0 before this ` +
    "slice: a command nobody is told to pass cites nothing, which is why the table held 0 rows " +
    "with the whole mechanism already shipped.");
  assert.equal(countFlag(setupSrc), SETUP_BLOCKS,
    `${SETUP} must carry \`${FLAG}\` on ${SETUP_BLOCKS} lines (designer, builder), got ${countFlag(setupSrc)}`);
  // CONTROL: the counter must be able to report 0, or "got 3" says nothing about what it can see.
  assert.equal(countFlag(cycleSrc.split(FLAG).join("")), 0,
    "the flag counter must report 0 against a copy with the flag stripped");
  // Each flagged line must be an agent-log command line, not prose that happens to name the flag.
  for (const [rel, src] of [[CYCLE, cycleSrc], [SETUP, setupSrc]]) {
    for (const line of src.split("\n").filter(l => l.includes(FLAG))) {
      assert.ok(line.includes("--cycle="),
        `${rel}: \`${FLAG}\` must be appended to a command's own --cycle= line, not written in ` +
        `prose -- got: ${line.trim()}`);
    }
  }

  // THE CEILING. SES-336's byte cap is the reason 296 B of superseded measurement came out of the
  // runbook before these three flags went in, in the same commit. Both directions: the file is
  // exactly what the pin says, and the pin is under the ceiling.
  const bytes = Buffer.byteLength(fs.readFileSync(path.join(ROOT, CYCLE)));
  assert.equal(bytes, BYTES_AT_SHIP,
    `${CYCLE} is ${bytes} B but ses-413d pins BYTES_AT_SHIP at ${BYTES_AT_SHIP} -- re-measure with ` +
    "wc -c and re-pin in the SAME commit that edits the runbook");
  assert.ok(BYTES_AT_SHIP <= RUNBOOK_CEILING,
    `the pin (${BYTES_AT_SHIP}) must stay under SES-336's ceiling (${RUNBOOK_CEILING}) -- the ` +
    "ceiling is never raised to make an edit fit; something comes out instead");

  console.log(`  [SES-424f] the executor cites: uncited = 1 request/return=minimal, cited = 2 ` +
    `requests with ${CITED.length} citation rows carrying agent_id/capability_slug, a 400 leaves ` +
    `{ok:true, citationError} and throws nothing; ${EXECUTE} captures and forwards (control ` +
    `mutation red); the flag is on ${CYCLE_BLOCKS} + ${SETUP_BLOCKS} command lines; ${CYCLE} is ` +
    `${bytes} B of ${RUNBOOK_CEILING}.`);
}

selfRun(import.meta.url, run_);
