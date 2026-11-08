// DeepBench v7.0.978 | tests/regression/agt-609-regrade-current-rules.test.mjs | AGT-609 -- a
// blocked ship is re-graded under the rules that are current now.
//
// FEATURE: AGT-609. On 2026-11-08 the board held 94 `delivered` tickets whose LATEST verdict was a
// `block`; 38 of them were graded before 2026-09-29 under rules that have since changed, and nothing
// on a verdict row said which rules graded it. This ship adds that fact
// (`runner_verdicts.rules_fingerprint`), the question it answers
// (`public.stale_blocked_verdicts()`), one grading path both lanes call
// (`gradeDelivery()`), and the lane that walks the stale set (`scripts/regrade-current.js`).
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (A) THE FINGERPRINT IS A FUNCTION OF CONTENT, injected reader, no disk. Four properties, and three
//     of them are the ways it could be wrong in the DANGEROUS direction: a fingerprint that did not
//     move when a rule file changed would mark every old verdict current forever (nothing re-graded,
//     ever); one that moved on a line-ending difference would mark every verdict stale on John's
//     Windows checkout (everything re-graded, every cycle); and one that returned a PARTIAL hash
//     when a file was unreadable would stamp rows with a value no tree can ever reproduce. Then the
//     spawned door, because the function being right proves nothing about the branch calling it.
//
// (B) THE ROW CARRIES IT, LAST. `verdictRowFor` is the ONE row shape both verifier lanes write, and
//     agt-67's own guard compares the two LANES to each other -- so it stays green if both lose a
//     key. The position is pinned here, as SES-345 pinned `graded_sha`'s.
//
// (C) `gradeDelivery()` IS THE GRADING PATH, graded through a stub runner so the three outcomes are
//     reachable without spending three suites. The third case is the one that matters most: a
//     baseline narrower than the graded set must come back as a coverage refusal WITH THE GATES NEVER
//     SPAWNED -- a version that ran the suite first and refused afterwards would cost 20 minutes to
//     produce an answer it then throws away, and `run` never being called is how that is asserted.
//
// (D) THE LANE'S TWO PURE DECISIONS. `pickMode` says which tree can answer, `outcomeFor` maps a
//     grade onto the ledger's three outcomes. Every arm of (D) is a case where a wrong answer is
//     invisible from a green run: a dev-head red recorded as a `block` would charge a two-month-old
//     delivery for a red at today's HEAD, and a pair whose own diff moved package.json would run two
//     different dependency sets as if they were one leg pair.
//
// (E) THE LANE OWNS NO RULE, asserted at the source level. See its own header, point 1.
//
// (F) LIVE, CREDENTIALED, READ-ONLY. The database's definition of "stale" is the one the lane acts
//     on, so it is read rather than re-derived here; and every ticket this build actually re-graded
//     must have LEFT the stale set under these rules, which is the uniqueness rule doing its job.
//     notRun without credentials -- never silently green.
//
// (G) THE TAIL AND THE CARD NAME THE LANE. A script nobody is told to run is a script nobody runs.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  RULE_FILES, rulesFingerprint, verdictRowFor, gradeDelivery,
} from "../../scripts/verifier.js";
import { pickMode, outcomeFor, exitFor, REGRADE_PREFIX } from "../../scripts/regrade-current.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFIER = path.join(ROOT, "scripts/verifier.js");
const LANE_REL = "scripts/regrade-current.js";
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const CARD_REL = "docs/runbooks/cycle-card.md";
const HEX64 = /^[0-9a-f]{64}$/;

// Seven fixture texts, one per RULE_FILES entry, none of them this repo's real files: the property
// under test is "a function of the content handed to it", and reading the real files would make the
// arm a tautology about today's tree.
const fixtureTexts = () => {
  const m = new Map();
  RULE_FILES.forEach((rel, i) => m.set(rel, `// fixture ${i} for ${rel}\nexport const n = ${i};\n`));
  return m;
};
const readerOver = m => rel => {
  const key = String(rel).replace(/\\/g, "/").replace(`${ROOT.replace(/\\/g, "/")}/`, "");
  if (!m.has(key)) throw new Error(`no fixture for ${key}`);
  return m.get(key);
};

// (A) ------------------------------------------------------------------------------------------
function theFingerprintIsAFunctionOfContent() {
  const base = fixtureTexts();
  const a = rulesFingerprint(ROOT, readerOver(base));
  assert.ok(HEX64.test(a), `the fingerprint must be 64 lowercase hex. got: ${JSON.stringify(a)}`);
  assert.strictEqual(a, rulesFingerprint(ROOT, readerOver(fixtureTexts())),
    "the same seven texts must give the same fingerprint twice -- a stamp that is not reproducible " +
    "cannot be compared, which is the whole mechanism");

  // ONE BYTE, IN EVERY FILE IN TURN. A fingerprint that hashed only the first file (or only the
  // names) would pass a single-file arm and would never notice a change in the other six.
  for (const rel of RULE_FILES) {
    const m = fixtureTexts();
    m.set(rel, `${m.get(rel)}x`);
    const moved = rulesFingerprint(ROOT, readerOver(m));
    assert.notStrictEqual(moved, a,
      `one byte added to ${rel} must move the fingerprint -- otherwise a change to that grading rule ` +
      "leaves every verdict graded under the old one reading as current, and NOTHING is ever re-graded");
  }

  // CRLF-BLIND, so John's Windows checkout and the cloud agree. Without this, every verdict reads
  // stale on one of the two machines and the lane re-grades the whole board every cycle.
  const crlf = fixtureTexts();
  for (const rel of RULE_FILES) crlf.set(rel, crlf.get(rel).replace(/\n/g, "\r\n"));
  assert.strictEqual(rulesFingerprint(ROOT, readerOver(crlf)), a,
    "CRLF line endings must give the IDENTICAL fingerprint -- the rules are the same rules");

  // FAIL CLOSED, and `null` rather than a partial hash: a row stamped with a hash of six files would
  // never match any tree, so it would read as stale forever and be re-graded every cycle.
  for (const rel of RULE_FILES) {
    const m = fixtureTexts();
    m.delete(rel);
    assert.strictEqual(rulesFingerprint(ROOT, readerOver(m)), null,
      `an unreadable ${rel} must give null, never a hash of the other ${RULE_FILES.length - 1}`);
  }

  // THE DOOR. Uncredentialed on purpose -- this is what the lane and a human both call, and it must
  // hold in a cloud cycle with no secrets.
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  const r = spawnSync(process.execPath, [VERIFIER, "--rules-fingerprint", "--json"],
    { encoding: "utf8", env, cwd: ROOT });
  const all = `${r.stdout || ""}${r.stderr || ""}`;
  assert.strictEqual(r.status, 0, `--rules-fingerprint must exit 0 on a readable tree, got ${r.status}:\n${all}`);
  const payload = JSON.parse(String(r.stdout || "").trim());
  assert.strictEqual(payload.kind, "rules-fingerprint");
  assert.deepStrictEqual(payload.files, [...RULE_FILES]);
  assert.strictEqual(payload.fingerprint, rulesFingerprint(ROOT),
    "the door must print the SAME hex the exported function returns for this tree -- two answers to " +
    "one question is how a row gets stamped with a value the sweep never compares against");
  return payload.fingerprint;
}

// (B) ------------------------------------------------------------------------------------------
function theRowCarriesTheFingerprintLast() {
  const fixture = {
    cycleId: "7195393f-a13c-4e6b-8731-9b8185c33a64", ticket: "AGT-609", version: "v7.0.978",
    verdict: "block", gateResults: { build: "green", regression: "red", hygiene: "green" },
    reasoning: "fixture", eligible: false, autoDoneReason: "fixture", epicName: null,
    priorityClass: null, gradedSha: "abcdef1234567890",
  };
  const withFp = verdictRowFor({ ...fixture, rulesFingerprint: "a".repeat(64) });
  const keys = Object.keys(withFp);
  assert.deepStrictEqual(keys.slice(-2), ["graded_sha", "rules_fingerprint"],
    `the row's last two keys must be graded_sha then rules_fingerprint. got: ${keys.join(", ")}`);
  assert.strictEqual(withFp.rules_fingerprint, "a".repeat(64));
  const without = verdictRowFor(fixture);
  assert.strictEqual(without.rules_fingerprint, null,
    "an omitted fingerprint must be null on the row, never undefined -- undefined is dropped by " +
    "JSON.stringify and the column would silently never be written at all");
  assert.deepStrictEqual(Object.keys(without), keys,
    "the key SET must not depend on whether a fingerprint was handed in");
}

// (C) ------------------------------------------------------------------------------------------
function stubRunner() {
  const calls = [];
  const run = async (gate, root) => {
    calls.push({ key: gate.key, root });
    if (gate.key !== "regression") return { status: "green", fails: null, detail: "exit 0" };
    return { status: "red", fails: ["x.test.mjs"], detail: "exit 1 -- [FAIL] x.test.mjs -- m" };
  };
  return { run, calls };
}
const passthroughSlot = async (env, fn) => ({ ran: true, value: await fn() });
const baselineOf = (names, measured) => ({
  names, measured, unverified: [], instrument: "scripts/baseline-red-set.js",
  source: "fixture baseline (AGT-609 test)",
});

async function theOneGradingPathGradesAllThree() {
  // (1) THE RED IS IN THE BASELINE BY NAME -> the delta is green and the verdict is approve, over a
  // suite whose absolute exit code is still 1. This is AGT-170's whole rule, reached through the
  // extracted function rather than through main().
  const s1 = stubRunner();
  const g1 = await gradeDelivery({
    repoRoot: ROOT, cycleId: null, baselineRead: baselineOf(["x.test.mjs"], ["x.test.mjs"]),
    graded: ["x.test.mjs"], only: { path: null, names: ["x.test.mjs"] },
    run: s1.run, slot: passthroughSlot,
  });
  assert.strictEqual(g1.coverage, null);
  assert.strictEqual(g1.gateResults.regression, "green",
    `a red named in the baseline must grade green on the delta. detail: ${g1.gateDetail.regression}`);
  assert.strictEqual(g1.regressionAbsolute, "red",
    "and the ABSOLUTE answer must survive beside it -- a reader who wants to know whether the suite " +
    "passed must still be able to find out");
  assert.strictEqual(g1.verdict, "approve");
  assert.ok(g1.gateDetail.regression.includes("regression GREEN on the delta"),
    `the gate detail must carry the delta's own sentence. got: ${g1.gateDetail.regression}`);
  assert.ok(g1.reasoning.includes("Regression graded on the DELTA against the 1-name baseline"),
    "and the reasoning must say the approve was reached on the delta rather than on a green suite " +
    `(AGT-304) -- an approve that READS as a green suite is the thing that note exists to stop. got: ${g1.reasoning}`);
  assert.deepStrictEqual(s1.calls.map(c => c.key), ["build", "regression", "hygiene"],
    "all three gates must have run, in the order the gate list declares them");

  // (2) THE SAME RED, ABSENT FROM THE BASELINE -> newly red, and a block.
  const s2 = stubRunner();
  const g2 = await gradeDelivery({
    repoRoot: ROOT, cycleId: null, baselineRead: baselineOf([], ["x.test.mjs"]),
    graded: ["x.test.mjs"], only: { path: null, names: ["x.test.mjs"] },
    run: s2.run, slot: passthroughSlot,
  });
  assert.deepStrictEqual(g2.delta.newlyRed, ["x.test.mjs"],
    "a red absent from a baseline that MEASURED that test is this delivery's");
  assert.strictEqual(g2.verdict, "block");
  assert.strictEqual(g2.gateResults.regression, "red");

  // (3) A BASELINE NARROWER THAN THE GRADED SET -> a coverage refusal and NOT A SINGLE GATE SPAWNED.
  const s3 = stubRunner();
  const g3 = await gradeDelivery({
    repoRoot: ROOT, cycleId: null, baselineRead: baselineOf([], ["x.test.mjs"]),
    graded: ["y.test.mjs"], only: { path: null, names: ["y.test.mjs"] },
    run: s3.run, slot: passthroughSlot,
  });
  assert.ok(g3.coverage, "a baseline that never measured the graded test must refuse");
  assert.deepStrictEqual(g3.coverage.uncovered, ["y.test.mjs"],
    "and the refusal must NAME the uncovered test");
  assert.strictEqual(g3.gateResults, undefined,
    "a coverage refusal returns the finding ALONE -- no gate statuses, because no gate ran");
  assert.deepStrictEqual(s3.calls, [],
    "and `run` must NEVER have been called: refusing after spending the suite is a 20-minute answer " +
    "that is then thrown away, which is the cost this clause exists to avoid");

  // (4) THE DECLARED OMISSION reaches the row, which is how a dev-head re-grade says it had no
  // unchanged tree rather than only that it had no baseline.
  const s4 = stubRunner();
  const g4 = await gradeDelivery({
    repoRoot: ROOT, cycleId: null,
    baselineRead: { names: null, unverified: null, measured: null, instrument: null, source: "declared" },
    graded: null, only: { path: null, names: ["x.test.mjs"] },
    declared: { reason: "no unchanged tree exists (fixture)", source: "declared source (fixture)" },
    run: s4.run, slot: passthroughSlot,
  });
  assert.strictEqual(g4.verdict, "block", "with no baseline the absolute red stands -- fail closed");
  assert.ok(g4.reasoning.includes("Baseline omitted by declaration: no unchanged tree exists (fixture)"),
    `the declaration must reach the reasoning. got: ${g4.reasoning}`);
  assert.strictEqual(g4.delta.reason, "declared source (fixture)");
}

// (D) ------------------------------------------------------------------------------------------
const gradeStub = ({ build = "green", hygiene = "green", regression = "green", newlyRed = [] }) => ({
  coverage: null,
  gateResults: { build, regression, hygiene },
  delta: { newlyRed },
  reasoning: "stub reasoning",
});

function theLanesTwoPureDecisions() {
  // --- pickMode. The log is hand-built: both of its failure modes are invisible from a green run.
  const log = [
    { sha: "b".repeat(40), parent: "a".repeat(40), subject: "v7.0.900 AGT-700 -- the delivery" },
    { sha: "a".repeat(40), parent: "9".repeat(40), subject: "v7.0.899 AGT-699 -- a peer" },
  ];
  const row = { backlog_id: "AGT-700", version: "v7.0.900", verdict_id: "11111111-1111-1111-1111-111111111111" };
  const pair = pickMode({ row, log, haveSha: () => true, changed: () => ["src/a.js"] });
  assert.strictEqual(pair.mode, "pair");
  assert.strictEqual(pair.base, "a".repeat(40),
    "the base is the OLDEST own commit's FIRST PARENT -- the tree immediately before this delivery");
  assert.strictEqual(pair.ship, "b".repeat(40));

  const deps = pickMode({ row, log, haveSha: () => true, changed: () => ["src/a.js", "package-lock.json"] });
  assert.deepStrictEqual([deps.mode, deps.reason], ["dev-head", "deps-changed"],
    "both legs borrow ONE node_modules by symlink, so a pair whose own diff moved the lockfile would " +
    "run two different dependency sets as if they were one pair -- that is not a pair");

  const noOwn = pickMode({ row: { ...row, backlog_id: "AGT-701" }, log, haveSha: () => true, changed: () => [] });
  assert.deepStrictEqual([noOwn.mode, noOwn.reason], ["dev-head", "no-own-commit"],
    "a ticket with no commit of its own in this clone has no base tree, and the refusal must carry " +
    "AGT-245's resolver's OWN reason rather than a second opinion formed here");

  const noBase = pickMode({ row, log, haveSha: s => s !== "a".repeat(40), changed: () => [] });
  assert.deepStrictEqual([noBase.mode, noBase.reason], ["dev-head", "base-sha-missing"]);
  const noShip = pickMode({ row, log, haveSha: s => s !== "b".repeat(40), changed: () => [] });
  assert.deepStrictEqual([noShip.mode, noShip.reason], ["dev-head", "ship-sha-missing"]);

  // --- outcomeFor: the eight mappings of the ticket's own sentences.
  const cases = [
    ["coverage refusal", "pair", { coverage: { reason: "narrower" } }, "ungradable"],
    ["build red at HEAD", "pair", gradeStub({ build: "red" }), "ungradable"],
    ["hygiene red at HEAD", "dev-head", gradeStub({ hygiene: "red" }), "ungradable"],
    ["pair delta green", "pair", gradeStub({}), "approve"],
    ["pair newly red", "pair", gradeStub({ regression: "red", newlyRed: ["x.test.mjs"] }), "block"],
    ["pair red, nothing charged", "pair", gradeStub({ regression: "red", newlyRed: [] }), "ungradable"],
    ["dev-head green", "dev-head", gradeStub({}), "approve"],
    ["dev-head red", "dev-head", gradeStub({ regression: "red", newlyRed: ["x.test.mjs"] }), "ungradable"],
  ];
  for (const [label, mode, graded, want] of cases) {
    const got = outcomeFor({ mode, graded });
    assert.strictEqual(got.outcome, want, `${label} (${mode}) must map to ${want}, got ${got.outcome}`);
    assert.ok(got.reason && got.reason.trim().length > 0,
      `${label}: the ledger's reason column refuses blank, and a row nobody can read is not a record`);
  }
  // THE ONE DIRECTION THAT WOULD LAUNDER A SHIP, stated as its own assertion: a dev-head red names a
  // newly red test and is STILL ungradable, because there is no unchanged tree to charge it against.
  assert.strictEqual(
    outcomeFor({ mode: "dev-head", graded: gradeStub({ regression: "red", newlyRed: ["x.test.mjs"] }) }).outcome,
    "ungradable",
    "a dev-head red must NEVER be a block: with no base tree it cannot be shown to be this " +
    "delivery's rather than the platform's");

  // --- exitFor: the invocation takes the WORST of its attempts.
  assert.strictEqual(exitFor([]), 3, "no attempt at all is `nothing stale`, which is exit 3");
  assert.strictEqual(exitFor([0, 1]), 1);
  assert.strictEqual(exitFor([0, 2, 1]), 2,
    "an invocation that approved one ticket and could not run another has NOT finished its work");
  assert.strictEqual(exitFor([{ outcome: "approve" }, { outcome: "ungradable" }]), 1,
    "exitFor must read attempt shapes as well as raw codes -- main() hands it the shapes");
}

// (E) ------------------------------------------------------------------------------------------
function theLaneOwnsNoGradingRule() {
  const src = fs.readFileSync(path.join(ROOT, LANE_REL), "utf8");
  assert.ok(/import\s*\{[^}]*\bgradeDelivery\b[^}]*\}\s*from\s*"\.\/verifier\.js"/s.test(src),
    `${LANE_REL} must import gradeDelivery from ./verifier.js -- it is the ONE grading path, and a ` +
    "lane that reassembled the sequence itself would be a second copy of the rule");
  // DEVIATION, recorded: the kickoff's §S/§T named `newlyRed` among the forbidden tokens while §S's
  // own `outcomeFor` definition reads `delta.newlyRed?.length`, which cannot both hold. The three
  // tokens below are the ones that would mean the lane COMPUTES a grade; reading the count off the
  // delta `gradeDelivery()` returned is reading the one rule's answer, not keeping a second copy.
  for (const token of ["regressionDelta(", "chargeOwnTests", "GATES"]) {
    assert.ok(!src.includes(token),
      `${LANE_REL} must not contain \`${token}\` -- it owns no delta, no own-tests charge and no gate ` +
      "list. The first one of those it grows is the day the two lanes start grading by two rules");
  }
  assert.strictEqual(REGRADE_PREFIX, "AGT-609 re-grade under current rules of ",
    "the reasoning prefix is how a later reader tells a re-grade row from the row it re-graded");
}

// (F) ------------------------------------------------------------------------------------------
async function rest(base, key, q, init = {}) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${q}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  // The failure body is read ONLY on failure: an eagerly-evaluated assert message consumes the body
  // and the success path then throws "Body has already been read", which reads as a board outage.
  if (!res.ok) assert.fail(`${q} answered HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function theStaleSetIsTheDatabases(notRun) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun.push("(F) the live stale-set read -- SUPABASE_URL / SUPABASE_SERVICE_KEY absent, so the " +
      "database's own definition of `stale` was NOT checked this run");
    return null;
  }
  const probe = "0".repeat(64);
  const zero = await rest(base, key, "rpc/stale_blocked_verdicts",
    { method: "POST", body: JSON.stringify({ p_fingerprint: probe }) });
  assert.ok(Array.isArray(zero) && zero.length >= 1,
    "a fingerprint no tree has ever had must return the whole stale set; it returned " +
    `${Array.isArray(zero) ? zero.length : typeof zero} rows, and a board holding 94 blocked ` +
    "deliveries cannot have none");
  for (const r of zero) {
    assert.notStrictEqual(r.rules_fingerprint, probe,
      `${r.backlog_id} is returned for a fingerprint it already carries -- the function would re-grade ` +
      "a verdict under the very rules it was graded under, every cycle, forever");
  }

  // EVERY TICKET THIS BUILD RE-GRADED MUST HAVE LEFT THE SET, derived from the ledger rather than
  // pasted: the uniqueness rule `(prior_verdict_id, rules_fingerprint)` IS "once per rule set".
  const fp = rulesFingerprint(ROOT);
  assert.ok(HEX64.test(fp), "this tree must have a readable fingerprint");
  const done = await rest(base, key,
    `runner_regrades?select=backlog_id,prior_verdict_id,outcome,mode&rules_fingerprint=eq.${fp}`);
  const live = await rest(base, key, "rpc/stale_blocked_verdicts",
    { method: "POST", body: JSON.stringify({ p_fingerprint: fp }) });
  const stillStale = new Set(live.map(r => r.prior_verdict_id || r.verdict_id));
  for (const r of done) {
    assert.ok(!stillStale.has(r.prior_verdict_id),
      `${r.backlog_id} was re-graded under these rules (${r.outcome}, ${r.mode}) and is STILL in the ` +
      "stale set -- the ledger's uniqueness rule is not being read, so the lane would re-grade it every cycle");
  }
  return { all: zero.length, answered: done.length, remaining: live.length, fingerprint: fp };
}

// (G) ------------------------------------------------------------------------------------------
function theTailAndTheCardNameTheLane() {
  const md = fs.readFileSync(path.join(ROOT, RUNBOOK_REL), "utf8");
  const at = md.indexOf("**(7a-ter) RE-GRADE UNDER CURRENT RULES");
  assert.ok(at >= 0, `${RUNBOOK_REL} carries no (7a-ter) RE-GRADE UNDER CURRENT RULES paragraph`);
  const end = md.indexOf("**(7b) SWEEP", at);
  assert.ok(end > at, `${RUNBOOK_REL}'s (7a-ter) paragraph is not followed by the (7b) heading`);
  const span = md.slice(at, end).replace(/\s+/g, " ");
  for (const needle of ["scripts/regrade-current.js", "--next", "--cycle-id=", "one test slot per attempt"]) {
    assert.ok(span.includes(needle),
      `${RUNBOOK_REL}'s (7a-ter) paragraph does not name \`${needle}\` -- a step the tail cannot copy ` +
      "and run is a step nobody runs");
  }
  const card = fs.readFileSync(path.join(ROOT, CARD_REL), "utf8");
  const nine = card.split("\n").find(l => l.startsWith("**9.**"));
  assert.ok(nine, `${CARD_REL} has no **9.** line`);
  assert.ok(nine.includes("(7a-ter) regrade-current.js"),
    `${CARD_REL}'s step 9 must name the lane -- the Development Manager is assembled from this card, ` +
    `and a step missing from it is a step it never runs. got: ${nine}`);
}

export default async function run() {
  const notRun = [];
  const liveFp = theFingerprintIsAFunctionOfContent();   // (A)
  theRowCarriesTheFingerprintLast();                     // (B)
  await theOneGradingPathGradesAllThree();               // (C)
  theLanesTwoPureDecisions();                            // (D)
  theLaneOwnsNoGradingRule();                            // (E)
  const live = await theStaleSetIsTheDatabases(notRun);  // (F)
  theTailAndTheCardNameTheLane();                        // (G)

  console.log(`  [AGT-609] rulesFingerprint over 7 injected texts is 64-hex and reproducible, moves on one ` +
    `byte of ANY of the seven, is CRLF-blind and null when one is unreadable; --rules-fingerprint exits 0 ` +
    `printing ${String(liveFp).slice(0, 12)}; the verdict row ends graded_sha, rules_fingerprint (null when ` +
    `omitted); gradeDelivery grades a baselined red GREEN on the delta (approve, absolute red kept), an ` +
    `unbaselined one newly red (block), refuses a narrower baseline naming y.test.mjs with NO gate spawned, ` +
    `and carries a declared omission into the reasoning; pickMode answers pair / deps-changed / no-own-commit ` +
    `/ base-sha-missing / ship-sha-missing, outcomeFor maps all eight cases and a dev-head red is NEVER a ` +
    `block, exitFor [] 3 / [0,1] 1 / [0,2,1] 2; the lane imports gradeDelivery and owns no delta, charge or ` +
    `gate list; the tail and the card both name it.` +
    (live ? `\n       Live: ${live.all} stale for an all-zero fingerprint, ${live.answered} already answered ` +
      `under ${String(live.fingerprint).slice(0, 8)}, ${live.remaining} remaining, and every answered one has ` +
      `left the set.` : ""));
  for (const n of notRun) console.log(`       [NOT RUN] ${n}`);
}

selfRun(import.meta.url, run);
