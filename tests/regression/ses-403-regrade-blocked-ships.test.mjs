// DeepBench v7.0.500 | tests/regression/ses-403-regrade-blocked-ships.test.mjs | SES-403
//
// FEATURE: SES-403 -- A SHIP BLOCKED FOR A CAUSE OUTSIDE ITSELF CAN BE GRADED AGAIN. Measured live
// 2026-09-15: SES-379/383/388/390/394/395/398 are all `delivered`, each with its latest and only
// `runner_verdicts` row a `block`, `gate_build` green on ALL SEVEN, the reds entirely `regression`
// and/or `hygiene`. `runner_decisions` holds zero `kind='ship'` rows for any of them, and
// `record_ship_decision()`'s first refusal (`verdict is distinct from 'approve' -> raise`) means
// none can ever be written. Seven deliveries permanently unshippable for somebody else's red.
//
// WHAT THIS FILE GUARDS, and where a lazier guard would pass vacuously.
//
// (a) THE MAPPING, ALL FOUR CASES, THROUGH THE SHIPPED FUNCTION. The verifier's three gate keys
//     collapse onto CI's TWO blocking jobs, and `regression` + `hygiene` must DEDUPLICATE to one
//     job -- a mapping that returned the same name twice would ask CI the same question twice and
//     read a single failure as two. An unmapped key must THROW: a fourth gate added to `GATES` and
//     not to `GATE_CI_JOBS` has to stop a re-grade dead, never contribute no job and let the
//     remaining ones vouch for the delivery.
//
// (b) THE ASYMMETRY IS THE WHOLE LANE, and it is asserted in BOTH directions. A `success` job at
//     dev head is proof about this delivery (dev head contains it); a `failure` proves nothing
//     (somebody else's commit can be the one breaking it). So a RED gate whose job is now success
//     goes green, and a gate the delivery already passed is CARRIED FORWARD even when that same
//     job is failing now. A guard that only checked the first half would pass just as well against
//     a helper that re-graded every gate from dev head -- which would import the very outside cause
//     this ticket exists to remove, and would have made this ship's own fixture block.
//
// (c) THE TWO REFUSALS, each with a positive control beside it. `regradeGateResults` must refuse a
//     `skipped` prior gate and a missing conclusion -- and must ANSWER on a good input, because a
//     helper that refused everything would satisfy both negative halves alone. The same rule is
//     driven through `scripts/run-project.js`'s shipped `answerErrors` -- including on a `report`,
//     which is where a check written below the action fork would silently pass.
//
// (d) THE PROCEDURE CARRIES THE STEP, IN THE TAIL, BEFORE THE SWEEP. A command in a script nobody
//     is told to run is a command nobody runs -- the exact class of rule this platform has watched
//     go silently unfollowed eight times (scripts/verifier.js's own SELF_CERTIFYING_PATHS note).
//
// (e) THE SES-158 NEGATIVE CONTROL. A runbook copy with the `--regrade` line removed must make (d)
//     THROW. A control that changes nothing pins nothing.
//
// (f) LIVE AND WRITE-FREE: each new function resolvable at EXACTLY ONE overload over PostgREST (an
//     overload break is invisible from the new call and total from the old one --
//     .claude/rules/supabase-function-signature.md), `regradable_ships()`'s column set read off the
//     DATABASE rather than off this file, the SQL mapping agreeing with the JS mapping on the same
//     four cases, and both of `record_regrade_assignment()`'s refusals raising BEFORE they write.
//     Bracketed by a residue check, because both of those are calls into a WRITER.
//
// The write path itself is declared NOT RUN and measured at the ship instead -- see the notRun()
// call at the bottom for the numbers. That follows ses-315 / ses-320's standing refusal: a
// permanent regression test does not write the decision ledger of the live board.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { RUNBOOK_REL } from "../../scripts/render-cycle-card.js";
import { GATES, GATE_CI_JOBS, ciJobsForGates, regradeGateResults } from "../../scripts/verifier.js";
import { answerErrors } from "../../scripts/run-project.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readLf = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const BUILD_JOB = "Build (blocking)";
const CHECKS_JOB = "Tripwire + regression (blocking)";
// The §4 return shape, named here so a column quietly dropped from the function shows up as a diff
// in THIS file as well as in the migration.
const LISTER_COLUMNS = Object.freeze([
  "backlog_id", "verdict_id", "version", "graded_sha", "red_gates", "ci_sha", "ci_run_id", "ci_concluded_at",
]);
// Not a real cycle. `record_regrade_assignment()` refuses on its list long before it would reach
// `record_decision()`, so this id never has to exist -- and if the order ever changed, the FK on
// `runner_decisions.cycle_id` would make the write fail rather than land under a stranger's cycle.
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
// The step's own heading and the heading that follows it. Both are the PARAGRAPH markers, never the
// bare labels: the serial tail's enumeration names `(7a-bis)` and `(7b)` as list items too.
const PARAGRAPH_MARKER = "**(7a-bis) RE-GRADE";
const SWEEP_MARKER = "**(7b) SWEEP";

// ---------------------------------------------------------------------------------------------
// (a) The mapping's four cases, plus the refusal that keeps a new gate key from passing silently.
// ---------------------------------------------------------------------------------------------
export function theMappingCollapsesThreeGatesOntoTwoJobs() {
  assert.deepStrictEqual(ciJobsForGates(["build"]), [BUILD_JOB],
    "case 1: `build` is decided by CI's Build job and nothing else");
  assert.deepStrictEqual(ciJobsForGates(["regression"]), [CHECKS_JOB],
    "case 2: `regression` is decided by the Tripwire + regression job");
  assert.deepStrictEqual(ciJobsForGates(["hygiene"]), [CHECKS_JOB],
    "case 3: `hygiene` is decided by that SAME job -- it runs the tripwire and the suite in one checkout");
  assert.deepStrictEqual(ciJobsForGates(["regression", "hygiene"]), [CHECKS_JOB],
    "case 4: the two share one job and the mapping must DEDUPLICATE. A list carrying it twice asks " +
      "CI one question twice, and then a single failure reads as two independent ones");
  assert.deepStrictEqual(ciJobsForGates(["build", "regression", "hygiene"]).sort(), [BUILD_JOB, CHECKS_JOB].sort(),
    "all three gates together are still exactly the two blocking jobs ci.yml declares");

  // Every key GATES declares must be mapped -- that is the pairing an added gate would break.
  for (const g of GATES) {
    assert.ok(GATE_CI_JOBS[g.key],
      `GATES declares "${g.key}" but GATE_CI_JOBS maps no CI job for it. Until it does, no ship can ` +
        "be re-graded on that gate and ciJobsForGates() throws -- which is the correct direction, " +
        "but the pairing is what has to be fixed");
  }
  assert.throws(() => ciJobsForGates(["deploy"]), /maps to no CI job/,
    "an unmapped gate key must THROW. Contributing no job would leave the remaining ones vouching " +
      "for a gate nobody checked");
  assert.throws(() => ciJobsForGates(null), /expected an array/,
    "a null gate list is \"nobody looked\", never \"no red gates\" -- an empty job list passes vacuously");
  return ciJobsForGates(["build", "regression", "hygiene"]).length;
}

// ---------------------------------------------------------------------------------------------
// (b) + (c) The asymmetry, and the two refusals with their positive control.
// ---------------------------------------------------------------------------------------------
const jobs = (build, checks) => [
  { name: BUILD_JOB, conclusion: build },
  { name: CHECKS_JOB, conclusion: checks },
];

export function greenIsEvidenceAndFailureIsNot() {
  // The shipped shape: blocked on regression only, Build FAILING at dev head for somebody else's
  // reason. The red gate clears from CI; the two gates this delivery already passed are carried.
  const cleared = regradeGateResults({
    gates: { build: "green", regression: "red", hygiene: "green" },
    jobs: jobs("failure", "success"),
  });
  assert.ok(cleared.ok, `a block on regression alone must re-grade when its job is success: ${cleared.reason}`);
  assert.deepStrictEqual(cleared.gateResults, { build: "green", regression: "green", hygiene: "green" },
    "the red gate clears from CI and the passed gates are CARRIED. A helper that re-graded every " +
      "gate from dev head would return build=red here -- importing the outside cause this ticket " +
      "exists to remove, and blocking a ship whose own build was green on its own tree");
  assert.match(cleared.source.regression, /CI job/,
    "the row must be able to say WHICH half each gate came from; `regression` came from CI");
  assert.match(cleared.source.build, /carried from the prior verdict/,
    "and `build` was carried, not re-measured -- the distinction is the verdict's honesty about its own evidence");

  // The other direction: a red gate whose job is STILL failing stays red. Without this the first
  // assertion alone would pass against a helper that greened every red gate unconditionally.
  const stillRed = regradeGateResults({
    gates: { build: "green", regression: "red", hygiene: "green" },
    jobs: jobs("success", "failure"),
  });
  assert.ok(stillRed.ok, `a still-failing job is an answer, not a refusal: ${stillRed.reason}`);
  assert.strictEqual(stillRed.gateResults.regression, "red",
    "a red gate whose CI job is still `failure` must stay RED. (In production regradable_ships() " +
      "excludes the ticket before the flag gets here -- this asserts the helper does not depend on " +
      "that for its answer.)");

  // A conclusion that names no job for a gate being re-graded: silence is not green.
  const absent = regradeGateResults({
    gates: { build: "green", regression: "red", hygiene: "green" },
    jobs: [{ name: BUILD_JOB, conclusion: "success" }],
  });
  assert.ok(!absent.ok && /carries no job for/.test(absent.reason),
    `a conclusion missing the job that decides the red gate must refuse: ${JSON.stringify(absent)}`);
  return cleared.reason;
}

export function theHelperRefusesASkippedGateAndAMissingConclusion() {
  const skipped = regradeGateResults({
    gates: { build: "green", regression: "skipped", hygiene: "green" },
    jobs: jobs("success", "success"),
  });
  assert.ok(!skipped.ok, "a SKIPPED prior gate must refuse even when every CI job is green");
  assert.match(skipped.reason, /SKIPPED/,
    `the refusal must name the skipped gate: ${JSON.stringify(skipped)}`);
  assert.strictEqual(skipped.gateResults, null,
    "a refusal must carry no gateResults at all -- a caller that read them would grade on a verdict " +
      "the helper declined to reach");

  for (const [label, value] of [["null", null], ["undefined", undefined], ["empty", []]]) {
    const missing = regradeGateResults({
      gates: { build: "green", regression: "red", hygiene: "green" },
      jobs: value,
    });
    assert.ok(!missing.ok && /no CI conclusion|empty job list/.test(missing.reason),
      `a ${label} conclusion must refuse -- the absence of evidence about dev head is never evidence ` +
        `that dev head is green. got: ${JSON.stringify(missing)}`);
  }

  // THE POSITIVE CONTROL. Without it a helper that refused every input would satisfy both refusals.
  const answered = regradeGateResults({
    gates: { build: "green", regression: "red", hygiene: "green" },
    jobs: jobs("success", "success"),
  });
  assert.ok(answered.ok && answered.gateResults.regression === "green",
    `the helper must ANSWER on a good input, or the two refusals above are vacuous: ${JSON.stringify(answered)}`);
  return skipped.reason;
}

// ---------------------------------------------------------------------------------------------
// (c2) The driver's refusal, driven through the SHIPPED answerErrors on a synthetic state. No
// network: the state is a plain object, which is exactly what it takes. The rule is the same one
// the assignment check already carries -- the lister is the authority and the manager may not name
// anything it did not return -- and it is checked ABOVE the action fork, because a `regrades` list
// can ride on a `report` as easily as on an `assign` and the early returns would skip it there.
// ---------------------------------------------------------------------------------------------
export function theManagerMayNotRegradeWhatTheListerDidNotReturn() {
  const state = {
    project: "moat-support",
    pick: { backlog_id: "SES-403" },
    roster: [{ capability_slug: "build-ticket", engines: ["session", "executor"] }],
    regradable: [{ backlog_id: "SES-388" }],
  };
  const assign = {
    project: "moat-support", action: "assign",
    assignment: { backlog_id: "SES-403", capability_slug: "build-ticket", engine: "session", reason: "x" },
  };

  assert.deepStrictEqual(answerErrors(assign, state), [],
    "an answer carrying NO regrades must still be accepted -- a driver that refused everything would " +
      "satisfy the negative halves below on its own");
  assert.deepStrictEqual(answerErrors({ ...assign, regrades: ["SES-388"] }, state), [],
    "an answer naming an id the lister DID return must be accepted");

  const unknown = answerErrors({ ...assign, regrades: ["SES-999"] }, state);
  assert.ok(unknown.some(e => e.includes("SES-999") && e.includes("SES-388") && e.includes("did not return")),
    `the refusal must name the id AND what the lister returned: ${JSON.stringify(unknown)}`);

  const notAList = answerErrors({ ...assign, regrades: "SES-388" }, state);
  assert.ok(notAList.length > 0,
    `a non-array \`regrades\` must be refused -- it cannot be checked against the lister at all: ${JSON.stringify(notAList)}`);

  // THE FORK CONTROL. On a `report` the function returns before it ever reaches the assignment
  // checks, so a `regrades` check written below that fork would silently pass here.
  const onReport = answerErrors({ project: "moat-support", action: "report", regrades: ["SES-999"] }, state);
  assert.ok(onReport.some(e => e.includes("SES-999")),
    `a \`regrades\` list riding on a \`report\` must be checked too -- it is not an assignment, and a ` +
      `check placed below the action fork would never see it: ${JSON.stringify(onReport)}`);
  return unknown[0];
}

// ---------------------------------------------------------------------------------------------
// (d) The runbook tail. A function nobody is told to call is a function nobody calls.
// ---------------------------------------------------------------------------------------------
export function theTailCarriesTheRegradeStep(md) {
  // The PARAGRAPH's own marker, not the bare label: the serial tail's enumeration names `(7a-bis)`
  // too, and anchoring on that would cut a span out of the list instead of the step.
  const at = md.indexOf(PARAGRAPH_MARKER);
  assert.ok(at >= 0,
    `${RUNBOOK_REL} carries no "${PARAGRAPH_MARKER}" paragraph -- SES-403's step has to live IN the ` +
      "serial tail, not in a script nobody is told to run");
  const sweep = md.indexOf("sweep_decision_windows(");
  assert.ok(sweep >= 0, `${RUNBOOK_REL} no longer names the sweep call at all`);
  assert.ok(at < sweep,
    `${RUNBOOK_REL}'s (7a-bis) paragraph is at ${at} but the sweep call is at ${sweep}. The re-grade ` +
      "runs BEFORE the sweep: the ship decision it writes opens a window the tail then goes on to " +
      "close on a later cycle, and a re-grade placed after the sweep is a step the drain's " +
      "terminating cycle never reaches");

  // The paragraph's own span, from its marker to the (7b) heading that follows it.
  const end = md.indexOf(SWEEP_MARKER, at);
  assert.ok(end > at, `${RUNBOOK_REL}'s (7a-bis) paragraph is not followed by the "${SWEEP_MARKER}" heading`);
  const span = md.slice(at, end);
  const required = [
    ["record_regrade_assignment(", "the ONE assignment row for the whole set; without it the re-grades are unattributed"],
    ["scripts/verifier.js --regrade", "the command the cycle actually runs -- the whole point of putting the step here"],
    ["--ticket=", "one run per id; the flag refuses a ticket the lister did not return"],
    ["--cycle-id=", "the verdict row and the ship decision both hang off the cycle"],
    ["--version=", "the ship decision records the version the ticket claimed"],
    ["ci_jobs_for_gates", "the mapping is the mechanism, and the tail has to say which job decides which gate"],
    ["No card to John", "standing ruling 2026-09-15, directive 6f33ec28 -- the re-grade is mechanical and cards nobody"],
    ["runs NO gate", "SES-352: CI is the authority on dev green, and a local re-run grades a different tree"],
  ];
  for (const [needle, why] of required) {
    assert.ok(span.includes(needle),
      `${RUNBOOK_REL}'s (7a-bis) paragraph does not name \`${needle}\` -- ${why}`);
  }
  return span.length;
}

// ---------------------------------------------------------------------------------------------
// (e) The SES-158 controls. Each mutation must turn a green arm red.
// ---------------------------------------------------------------------------------------------
function controlsGoRed(md) {
  const stripped = md.split("\n").filter(l => !l.includes("scripts/verifier.js --regrade")).join("\n");
  assert.notStrictEqual(stripped, md, "control for (d) changed nothing (the SES-158 failure)");
  assert.throws(
    () => theTailCarriesTheRegradeStep(stripped),
    /scripts\/verifier\.js --regrade/,
    "control: the tail with the --regrade command removed still passed (d) -- the arm is vacuous",
  );

  // The ordering clause has its own control: the paragraph moved BELOW the sweep must fail too,
  // or (d) is only asserting that both strings exist somewhere in a 380 KB file.
  const at = md.indexOf(PARAGRAPH_MARKER);
  const end = md.indexOf(SWEEP_MARKER, at);
  const moved = md.slice(0, at) + md.slice(end) + "\n" + md.slice(at, end);
  assert.throws(
    () => theTailCarriesTheRegradeStep(moved),
    /runs BEFORE the sweep/,
    "control: the (7a-bis) paragraph relocated after the sweep call still passed (d)'s ordering clause",
  );
}

// ---------------------------------------------------------------------------------------------

export default async function run() {
  const md = readLf(RUNBOOK_REL);

  const jobCount = theMappingCollapsesThreeGatesOntoTwoJobs();   // (a)
  const asymmetry = greenIsEvidenceAndFailureIsNot();            // (b)
  const refusal = theHelperRefusesASkippedGateAndAMissingConclusion(); // (c)
  theManagerMayNotRegradeWhatTheListerDidNotReturn();             // (c2)
  const spanBytes = theTailCarriesTheRegradeStep(md);            // (d)
  controlsGoRed(md);                                             // (e)

  // == (f) Live arms: the three functions, write-free ===========================================
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "SES-403 (f) the live arms: ci_jobs_for_gates / regradable_ships / record_regrade_assignment " +
        "each resolvable at exactly one overload, the lister's column set read off the database, " +
        "and both of record_regrade_assignment()'s refusals raising before they write",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name " +
        "(docs/runbooks/session-setup.md step 1b) and re-run: " +
        "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js",
    );
  } else {
    const H = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
    const post = (fn, body, query = "") =>
      fetch(`${url}/rest/v1/rpc/${fn}${query}`, { method: "POST", headers: H, body: JSON.stringify(body) });
    const countOf = async q => {
      const r = await fetch(`${url}/rest/v1/${q}`, { headers: { ...H, Prefer: "count=exact", Range: "0-0" } });
      const cr = r.headers.get("content-range") || "";
      return Number(cr.split("/")[1] ?? NaN);
    };

    // The residue bracket. Scoped to THIS test's own shapes rather than to whole-table counts, so a
    // concurrent cycle writing its own ship decision cannot make this arm red for something that is
    // not the thing under test.
    const before = {
      nilRegrades: await countOf(`runner_decisions?select=id&kind=eq.regrade&cycle_id=eq.${NIL_UUID}`),
      zzz: await countOf("backlog_items?select=id&backlog_id=like.ZZZ-*"),
    };

    // Exactly ONE overload each. PostgREST answers an ambiguous call with PGRST203 and an absent
    // one with PGRST202, and both surface to a caller as an empty result rather than a crash.
    const mapProbe = await post("ci_jobs_for_gates", { p_gate_keys: ["regression", "hygiene"] });
    const mapBody = await mapProbe.text();
    assert.ok(!/PGRST20[23]|Could not find the function/i.test(mapBody),
      `public.ci_jobs_for_gates(p_gate_keys) is not resolvable at exactly one overload: ${mapBody.slice(0, 300)}`);
    assert.strictEqual(mapProbe.status, 200, `rpc/ci_jobs_for_gates returned HTTP ${mapProbe.status}: ${mapBody.slice(0, 300)}`);
    assert.deepStrictEqual(JSON.parse(mapBody), ciJobsForGates(["regression", "hygiene"]),
      "the DATABASE's mapping and scripts/verifier.js's mapping disagree. They are two copies of one " +
        "table on purpose -- the lister uses the SQL one and the flag uses the JS one -- so the only " +
        "thing that makes that safe is that they answer identically");
    assert.deepStrictEqual(
      JSON.parse(await (await post("ci_jobs_for_gates", { p_gate_keys: ["build", "regression", "hygiene"] })).text()).sort(),
      ciJobsForGates(["build", "regression", "hygiene"]).sort(),
      "the two mappings disagree on the all-three case",
    );
    const badKey = await post("ci_jobs_for_gates", { p_gate_keys: ["deploy"] });
    assert.ok(!badKey.ok && /maps to no CI job/.test(await badKey.text()),
      "public.ci_jobs_for_gates() must RAISE on an unmapped gate key, exactly as the JS mapping throws");

    // The lister's column set, read off the database. `?select=` is asserted rather than the rows,
    // because the correct live answer is frequently ZERO rows (dev head red) and a shape assertion
    // over an empty array proves nothing.
    const shape = await post("regradable_ships", {}, `?select=${LISTER_COLUMNS.join(",")}`);
    const shapeBody = await shape.text();
    assert.ok(!/PGRST20[23]|Could not find the function/i.test(shapeBody),
      `public.regradable_ships() is not resolvable at exactly one overload: ${shapeBody.slice(0, 300)}`);
    assert.strictEqual(shape.status, 200,
      `public.regradable_ships() does not return all of ${LISTER_COLUMNS.join(", ")} -- HTTP ` +
        `${shape.status}: ${shapeBody.slice(0, 300)}. scripts/run-project.js hands these rows to the ` +
        "manager and scripts/verifier.js re-grades off graded_sha / ci_sha / ci_run_id / red_gates by name");
    const bogus = await post("regradable_ships", {}, "?select=backlog_id,no_such_column");
    assert.ok(!bogus.ok,
      "the column probe above passed against a column that does not exist, so it proves nothing about " +
        "the ones that do");
    const listed = JSON.parse(shapeBody);
    assert.ok(Array.isArray(listed), `regradable_ships() must return an array, got ${shapeBody.slice(0, 120)}`);

    // Both refusals, and they are reached BEFORE any write -- which is what makes calling a WRITER
    // from a permanent regression test permissible here at all.
    const empty = await post("record_regrade_assignment", { p_cycle_id: NIL_UUID, p_backlog_ids: [] });
    const emptyBody = await empty.text();
    assert.ok(!/PGRST20[23]|Could not find the function/i.test(emptyBody),
      `public.record_regrade_assignment(p_cycle_id, p_backlog_ids) is not resolvable at exactly one overload: ${emptyBody.slice(0, 300)}`);
    assert.ok(!empty.ok && /names no ticket/.test(emptyBody),
      `record_regrade_assignment() with an empty list must RAISE -- a row saying "re-grade nothing" is ` +
        `a decision handle pointing at no work. got ${empty.status}: ${emptyBody.slice(0, 300)}`);

    const unlisted = await post("record_regrade_assignment", { p_cycle_id: NIL_UUID, p_backlog_ids: ["ZZZ-994"] });
    const unlistedBody = await unlisted.text();
    assert.ok(!unlisted.ok && /did not return/.test(unlistedBody),
      `record_regrade_assignment() must RAISE on an id regradable_ships() did not return -- the lister ` +
        `is the authority, and it is re-read inside the function rather than trusted from the caller. ` +
        `got ${unlisted.status}: ${unlistedBody.slice(0, 300)}`);

    const after = {
      nilRegrades: await countOf(`runner_decisions?select=id&kind=eq.regrade&cycle_id=eq.${NIL_UUID}`),
      zzz: await countOf("backlog_items?select=id&backlog_id=like.ZZZ-*"),
    };
    assert.deepStrictEqual(after, before,
      "the guard-path probes MOVED THE LEDGER. record_regrade_assignment() is a WRITER, and these arms " +
        "are only permitted because both refusals raise above its record_decision() call -- if that is " +
        `no longer true, delete the arm rather than accepting the drift. before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);

    console.log(`  [SES-403] (f) live: three functions each resolvable at one overload; the SQL and JS ` +
      `mappings agree on both multi-gate cases and both raise on an unmapped key; regradable_ships() ` +
      `returns ${LISTER_COLUMNS.length} named columns and ${listed.length} row(s) right now; both ` +
      `record_regrade_assignment refusals raised and wrote nothing`);
  }

  notRun(
    "SES-403 the WRITE path -- regradable_ships() listing a real fixture, `--regrade` writing one " +
      "approve verdict plus one kind='ship' decision, and the pg_proc overload counts",
    "record_regrade_assignment() and record_ship_decision() are WRITERS of the decision ledger, and " +
      "this suite reaches Supabase only over PostgREST, which cannot read pg_proc and cannot open a " +
      "transaction to roll a fixture back -- the ses-315 / ses-320 refusal. MEASURED AT THIS SHIP " +
      "(v7.0.500) instead, live over the MCP with every fixture deleted afterwards and the counts " +
      "re-read. pg_proc: exactly 1 overload each of ci_jobs_for_gates(text[]), regradable_ships() and " +
      "record_regrade_assignment(uuid, text[]). BEFORE: runner_verdicts 225, runner_decisions 782, " +
      "ci_run_conclusions 306, 0 ZZZ-* tickets, regradable_ships() 0 rows (dev head 5bfe0bd1 red on " +
      "Tripwire + regression -- the fail-closed proof that a no-op ship cannot pass this). FIXTURES: " +
      "cycle ffffffff-4403-..., ZZZ-993 delivered with a block verdict (build green, regression RED, " +
      "hygiene green) and ZZZ-994 delivered with a block verdict (build RED, regression green, hygiene " +
      "green), both graded_sha a0cc5ec2 (a real ancestor), plus one ref='dev' conclusion on 3a1cf760 " +
      "concluded one minute after the verdicts with Build (blocking)=FAILURE and Tripwire + " +
      "regression (blocking)=success. regradable_ships() returned ZZZ-993 and NOT ZZZ-994 -- the " +
      "ship's-own-diff control, never listed, because the job its own block broke is still failing at " +
      "dev head. `node scripts/verifier.js --regrade --ticket=ZZZ-993 --cycle-id=... " +
      "--version=v0.0.0-ses403fx` exited 0: build=green carried, regression=green from the CI job, " +
      "hygiene=green carried; ONE runner_verdicts approve row with graded_sha=3a1cf760 (the CI tree) " +
      "and auto_done_eligible=false; ONE runner_decisions kind='ship' row, status open, window 72h " +
      "(3 days), summary 'ZZZ-993 shipped at v0.0.0-ses403fx (3a1cf760...) on verdict <id>'. " +
      "`--regrade --ticket=ZZZ-994` exited 2 naming the lister and wrote nothing. THE FLIP: with " +
      "Tripwire + regression set to failure, regradable_ships() returned 0 rows and `--regrade " +
      "--ticket=ZZZ-993` exited 2 with runner_verdicts and runner_decisions both unmoved. " +
      "record_regrade_assignment(cycle, ARRAY['ZZZ-993']) wrote exactly ONE kind='regrade' row, " +
      "backlog_id NULL, status open, window 72h. AFTER deleting every fixture row: runner_verdicts " +
      "225, runner_decisions 782, ci_run_conclusions 306, 0 ZZZ-* tickets, 0 fixture cycles, " +
      "regradable_ships() back to 0 -- zero residue.",
  );

  console.log(`  [SES-403] the mapping collapses ${GATES.length} gate keys onto ${jobCount} CI jobs and ` +
    `dedups regression+hygiene; a green job is evidence and a failure is not (${asymmetry}); the ` +
    `skipped-gate refusal reads "${refusal.slice(0, 48)}..." and the missing-conclusion refusal fires ` +
    `on null/undefined/[]; ${RUNBOOK_REL}'s ${spanBytes}B (7a-bis) paragraph carries the command ` +
    `before the sweep; both controls go red`);
}

selfRun(import.meta.url, run);
