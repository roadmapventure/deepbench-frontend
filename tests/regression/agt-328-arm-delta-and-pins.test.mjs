// DeepBench v7.0.1065 | tests/regression/agt-328-arm-delta-and-pins.test.mjs | AGT-328 -- the ship
// delta counts FAILING ARMS inside a standing-red file, and a pinned literal is re-pinned in the
// ship that changes it.
//
// FEATURE: AGT-328 T1/T2/T3. Measured on tree 56b90a9: `regressionDelta()` compared failing FILE
// NAMES only, so a file red on 1 arm before a ship and on 3 after it was `standing`, `newlyRed []`,
// and the gate read `green` -- a new failure inside an already-red file was free. The count was on
// disk all along: a multi-arm test throws `N arm(s) failed:`, `run-all.js` prints it after
// `[FAIL] <file> -- `, 63 tests in the suite throw it, and BOTH baseline instruments already carry
// that line. Separately, 23 of the 138 anchors in the 35 kickoffs since v7.0.1000 are held by a
// `tests/regression/` file, and no clause made a ship that changes such a literal re-pin the test
// that holds it -- the re-pin was owed to a later ship, which is how a standing red set grows by
// omission.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (A) THE PARSER, pure, over a BASE and a POST capture in the two shapes the instruments actually
//     write -- `run-all.js`'s indented `[FAIL] <file> -- ` line (doubled, as the suite really does
//     print it) and `scripts/baseline-red-set.js`'s `- <path> — RED (exit 1): ...` block line. The
//     controls are the two directions a count may NOT be invented: a bare `AssertionError` line is
//     `null`, never 1, and a NESTED `[FAIL]` quoted inside another test's own message
//     (`[arm A] FAIL -- [FAIL] x ... 9 arm(s) failed`) must not overwrite the file's real count.
//
// (B) THE DELTA ITSELF, and it is the DISCRIMINATOR of the whole ship: one call, three arms, the
//     SAME baseline and post sets. With both arm maps it is `red` and names x; with the two keys
//     ABSENT it is `green` with no `grown` at all (which is exactly how `scripts/regrade-delivered.js`
//     and every other four-key caller must keep grading, byte for byte, limit L5); and with both
//     keys set to POST's own counts it is `green` again, because an equal count is not growth
//     (call D1, limit L1). A clause that charged growth off one side would fail arms two and three.
//
// (C) BOTH BASELINE READERS carry `arms` off the SAME read of the SAME bytes that gave `names` --
//     the defect `scripts/baseline-red-set.js`'s own header records, applied one level down: two
//     facts read from two reads can describe two baselines.
//
// (D)/(E) THE PINS CLAUSE and its ship half, pure. (D)'s first two arms are the stamp boundary
//     (call D4): the SAME bytes stamped v7.0.1065 are NOT GRADED and stamped v7.0.1066 refuse, which
//     is what keeps the 1,100-kickoff corpus green (pattern:162 -- a check grades the change, never
//     the live world). (E) is 7a: a `repin` test absent from the delivery's changed files blocks the
//     ship, `null` changed files fail CLOSED, and no pins block is never this clause's business.
//
// (F) THE SPAWNED CLI, uncredentialed, because the helper being right proves nothing about the
//     branch calling it: `--check-kickoff` is what runbook step 6 runs and its exit code is what the
//     cycle acts on. One fixture, two outcomes, one word of difference -- `maybe` refuses with
//     clause `pins`, `keep` exits 0 and carries `pins_note` in the payload.
//
// (G) THE WIRING AND THE REGISTER: the ship-half call exists exactly once in the source (a pure
//     function nobody calls grades nothing), and the register the Designer reads carries the rule
//     once, in the same sentence the clause enforces (pattern:93, call D5).
//
// MEASURED PRE-BUILD, so this file is a change-grader and not a world-grader: on 56b90a9 (B)'s
// first arm is `green` with `grown` undefined, and (F)'s `maybe` fixture exits 0 -- neither
// `failingArmsFrom` nor `kickoffPinsFinding` exists on that tree.
//
// NO CREDENTIALS, no network, no Supabase, no model call, no writes to the repo: pure helpers, temp
// files under os.tmpdir(), one read of the committed register, one grep of the committed source.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  ARM_COUNT_RE, failingArmsFrom, armGrowth, armGrowthVerdict, regressionDelta, failingTestsFrom,
  readRegressionBaseline, readKickoffBaseline,
  PINS_CLAUSE, PINS_BLOCK_FROM, PIN_DISPOSITIONS, pinsBlockLines, kickoffPinsFinding, pinsShipFinding,
} from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFIER = path.join(ROOT, "scripts/verifier.js");
const REGISTER_REL = "docs/runbooks/environment-facts.md";
const REGISTER_PREFIX = "- 2026-11-20 | AGT-328 | ";
const SHIP_CALL = "pinsShipFinding({ text: kickoffText, changedFiles })";

const x = "x.test.mjs", y = "y.test.mjs", z = "z.test.mjs";
const N = [x, y, z];
const H = "tests/regression/holds.test.mjs";

// The two captures, in the instruments' own vocabulary.
//   x: `run-all.js`'s DOUBLED prefix, which is how the suite really prints a thrown message.
//   y: `scripts/baseline-red-set.js`'s block line, a `check` count rather than an `arm` count.
//   z: a bare assertion with NO declared count at all.
const BASE_LINES = [
  `  [FAIL] ${x} -- [FAIL] ${x} -- 1 arm(s) failed:`,
  `- tests/regression/${y} — RED (exit 1): [FAIL] ${y} -- 2 checks failed`,
  `  [FAIL] ${z} -- AssertionError: boom`,
];
const POST_LINES = [
  `  [FAIL] ${x} -- 3 arm(s) failed:`,
  `    [arm A] FAIL -- [FAIL] ${x} -- 9 arm(s) failed`,
  `  [FAIL] ${y} -- 2 checks failed`,
  `  [FAIL] ${z} -- 4 arm(s) failed:`,
];
const BASE = BASE_LINES.join("\n");
const POST = POST_LINES.join("\n");

// == (A) the parser ==============================================================================
function theParserReadsADeclaredCountAndNeverInventsOne() {
  assert.deepStrictEqual(failingArmsFrom(BASE), { [x]: 1, [y]: 2, [z]: null },
    "BASE: x declares 1 arm behind a DOUBLED `[FAIL] <file> -- ` prefix (which is how run-all.js " +
    "really prints a thrown message), y declares 2 `checks` inside a baseline-red-set block line, " +
    "and z declares NOTHING -- so z is null. `null`, never 1: a count nobody could parse must not " +
    "manufacture a red (pattern:162, limit L2)");
  assert.deepStrictEqual(failingArmsFrom(POST), { [x]: 3, [y]: 2, [z]: 4 },
    "POST: the same three files, x grown to 3 and z now declaring 4. The second line quotes " +
    "ANOTHER test's `[FAIL] x ... 9 arm(s) failed` inside its own arm message -- if that were " +
    "harvested x would read 9 and the delta would charge a growth that never happened");
  assert.strictEqual(failingArmsFrom(POST)[x], 3,
    "CONTROL, stated alone because it is the mutant that matters: the nested 9 must NOT win");

  // A count is read ONLY off a line that names its own file, and only after the prefix is stripped.
  assert.deepStrictEqual(failingArmsFrom(`  [FAIL] ${x} -- 2 arm(s) failed:`), { [x]: 2 }, "one line, one count");
  assert.deepStrictEqual(failingArmsFrom("3 arm(s) failed:"), {},
    "a bare count line names no file, so it is no file's count");
  assert.deepStrictEqual(failingArmsFrom(""), {}, "and an empty capture claims nothing");
  assert.deepStrictEqual(failingArmsFrom(null), {}, "nor does an absent one -- never a throw");
  assert.ok(ARM_COUNT_RE.test("4 cases failed") && ARM_COUNT_RE.test("1 assertion failed")
    && ARM_COUNT_RE.test("2 checks failed") && !ARM_COUNT_RE.test("boom failed"),
    "the vocabulary is arm/check/case/assertion, singular or plural, and a word that is not a count " +
    "is not one");

  // armGrowth: only a pair of NUMBERS on a STANDING name, and only upward.
  const b = failingArmsFrom(BASE), p = failingArmsFrom(POST);
  assert.deepStrictEqual(armGrowth(N, b, p), [`${x} (1 -> 3 failing arms)`],
    `only x grew: y is equal (2 -> 2, not graded -- call D1) and z had no baseline count at all ` +
    `(null -> 4 is not growth, limit L2). Both counts are rendered so the block says WHAT grew`);
  assert.deepStrictEqual(armGrowth(N, p, p), [], "POST against itself: equal counts are never growth (limit L1)");
  assert.deepStrictEqual(armGrowth(N, p, b), [], "and a count that SHRANK is not growth either");
  assert.deepStrictEqual(armGrowth(N, null, p), [], "no baseline arms -> nothing to compare -> no growth");
  assert.deepStrictEqual(armGrowth(N, b, null), [], "and no post arms likewise -- absent is never zero");
  assert.deepStrictEqual(armGrowth([y, z], b, p), [],
    "CONTROL: growth is charged only over the names handed in as STANDING -- x excluded, nothing found");
  assert.strictEqual(armGrowthVerdict({ standing: N, newlyRed: [], unverifiedInBaseline: [], neverMeasured: [], baselineArms: b, postArms: p }).status, "red",
    "and the verdict built from a growth is RED");
  assert.strictEqual(armGrowthVerdict({ standing: N, newlyRed: [], unverifiedInBaseline: [], neverMeasured: [], baselineArms: null, postArms: null }), null,
    "while no growth is NULL -- which is what leaves every existing caller grading as before");
}

// == (B) the delta: one call, three arms, THE DISCRIMINATOR ======================================
function theDeltaChargesArmGrowthInsideAStandingRedFile() {
  const baselineArms = failingArmsFrom(BASE);
  const postArms = failingArmsFrom(POST);
  const post = failingTestsFrom(POST);
  assert.deepStrictEqual(post, [...N].sort(),
    "CONTROL: by NAME this run's failing set is exactly the baseline's, so every arm below grades " +
    "the SAME names -- the only thing that moves is the arm counts");
  const call = extra => regressionDelta({ absolute: "red", baseline: N, post, unverified: [], measured: N, ...extra });

  // ARM 1 -- both maps: RED, and it names what grew.
  const grown = call({ baselineArms, postArms });
  assert.strictEqual(grown.status, "red",
    `the SHIP-BLOCKING arm: every red is standing BY NAME, yet x fails 3 arms where the unchanged ` +
    `tree failed 1, and a new failure inside an already-red file is this delivery's to answer for. ` +
    `got ${grown.status}: ${grown.reason}`);
  assert.deepStrictEqual(grown.newlyRed, [], "with ZERO newly red names -- the name-level rule saw nothing");
  assert.deepStrictEqual(grown.grown, [`${x} (1 -> 3 failing arms)`],
    `and the red must NAME the file and both counts, or it is unactionable. got: ${JSON.stringify(grown.grown)}`);
  assert.deepStrictEqual(grown.standing, [...N].sort(), "the standing list is unchanged and still published");
  assert.ok(grown.reason.includes(`${x} (1 -> 3 failing arms)`) && grown.reason.includes("MORE ARMS"),
    `the prose carries the same fact the list does. got: ${grown.reason}`);

  // ARM 2 -- THE KEYS ABSENT: byte-for-byte the old answer. This is limit L5's guarantee.
  const byName = call({});
  assert.strictEqual(byName.status, "green",
    `the SAME names and the SAME absolute red, with the two arm keys ABSENT, must grade EXACTLY as ` +
    `before: a four-key caller (scripts/regrade-delivered.js, limit L5) made no claim about arms ` +
    `and must not be re-graded by accident. got ${byName.status}: ${byName.reason}`);
  assert.strictEqual(byName.grown, undefined,
    "and it carries no `grown` key at all -- not an empty list, which would assert a measurement " +
    "nobody took");
  assert.deepStrictEqual(byName.newlyRed, [], "0 newly red, as on the unchanged tree");

  // ARM 3 -- both maps POST's: GREEN. An equal count is not growth, so the clause cannot be a wall.
  const equal = call({ baselineArms: postArms, postArms });
  assert.strictEqual(equal.status, "green",
    `POST graded against ITSELF must be green: equal counts are not growth (call D1), and a clause ` +
    `that reddened here would block every ship with a standing multi-arm red. got ${equal.status}: ${equal.reason}`);
  assert.strictEqual(equal.grown, undefined, "with no grown list");

  // The growth check sits AFTER the newly-red partition and BEFORE the greens, so a genuinely new
  // name still reports as newly red rather than being relabelled as a grown arm.
  const newName = regressionDelta({ absolute: "red", baseline: [x], post: [x, y], unverified: [], measured: [x, y],
    baselineArms: { [x]: 1 }, postArms: { [x]: 1, [y]: 2 } });
  assert.strictEqual(newName.status, "red", "a newly red NAME is still red");
  assert.deepStrictEqual(newName.newlyRed, [y],
    `and still reported as newly red by name -- the arm clause must not relabel AGT-170's own ` +
    `finding. got: ${JSON.stringify(newName.newlyRed)}`);

  // And the fail-closed exits above it are untouched: no baseline is still no verdict.
  assert.strictEqual(call({ baselineArms, postArms, baseline: null }).standing, null,
    "CONTROL: a null baseline still fails closed ahead of every delta rule (AGT-170)");
  assert.strictEqual(regressionDelta({ absolute: "green", baseline: N, post, unverified: [], measured: N, baselineArms, postArms }).status,
    "green", "and a non-red absolute is never moved by the delta, arms or no arms");
}

// == (C) both baseline readers carry `arms` off the same read =====================================
function bothBaselineReadersCarryTheArmCounts() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt328-baseline-"));
  try {
    const p = path.join(dir, "baseline.txt");
    fs.writeFileSync(p, BASE + "\nRed set: 3 of 39\n", "utf8");
    const reg = readRegressionBaseline(p);
    assert.deepStrictEqual(reg.arms, failingArmsFrom(BASE),
      `readRegressionBaseline must return the arm counts off the SAME read that gave names -- two ` +
      `facts read from two reads can describe two baselines. got: ${JSON.stringify(reg.arms)}`);
    assert.deepStrictEqual(reg.names, [x, z], "CONTROL: that read named the two files whose `[FAIL] ` " +
      "lines `failingTestsFrom` parses -- `arms` covers y as well, off the SAME bytes, because the " +
      "block-line form carries its count there and nowhere else");

    const kick = readKickoffBaseline("BASELINE (x):\n" + BASE_LINES[1] + "\nRed set: 1 of 1");
    assert.deepStrictEqual(kick.arms, { [y]: 2 },
      `readKickoffBaseline must do the same off the BASELINE paragraph -- the kickoff block is the ` +
      `baseline on every cycle that passes no --regression-baseline. got: ${JSON.stringify(kick.arms)}`);
    assert.deepStrictEqual(kick.names, [y], "CONTROL: off a block naming exactly that one red");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// == (D) the pins clause, pure, and the stamp boundary ===========================================
const LANES = "- **Lanes:** session `orchestrator`; executor none.";
const TASK = "\n**T1 -- a.** one\n";
const RISK = "\n```risk\nT1 | a | b | c\n```\n";
const ANCHORS = "\n```anchors\nscripts/a.js | 2 | LIT one\n```\n";
const K = (v, pins) => `<!-- DeepBench v${v} | kickoff | FIXTURE -->\n` + LANES + TASK + RISK + ANCHORS
  + (pins ? "\n```pins\n" + pins + "\n```\n" : "");
// The anchors clause's own resolver, stubbed: the anchored literal lives in the file the kickoff
// declares AND in H, so H PINS it.
const resolve = () => ({ files: ["scripts/a.js", H] });

function thePinsClauseRefusesAnUndeclaredPinOnlyFromTheBoundary() {
  // 1. THE BOUNDARY. The same bytes, below it: NOT GRADED, exit code untouched.
  let out = {};
  assert.strictEqual(kickoffPinsFinding(K("7.0.1065"), resolve, out), null,
    "below v7.0.1066 a kickoff whose anchor resolves into a regression test is NOT GRADED -- every " +
    "kickoff in the corpus predates the rule, and refusing them would wedge runbook step 6 " +
    "everywhere (pattern:162)");
  assert.ok(out.note.startsWith("NOT GRADED (AGT-328)"), `and the green SAYS it did not grade. got: ${out.note}`);
  assert.ok(out.note.includes("v7.0.1065"), `naming the stamp it read. got: ${out.note}`);

  // 2. THE DEFECT ITSELF, one digit of stamp later.
  out = {};
  let r = kickoffPinsFinding(K("7.0.1066"), resolve, out);
  assert.ok(r, "at v7.0.1066 the SAME bytes must be REFUSED -- a test holding an anchored literal " +
    "that no pins line names is exactly the omission that grows the standing red set");
  assert.strictEqual(r.clause, PINS_CLAUSE, "the refusal names its clause so the cycle can route it");
  assert.strictEqual(PINS_CLAUSE, "pins", "and that clause is `pins` -- the string the cycle switches on");
  assert.ok(r.reason.includes(H), `and it must NAME the undeclared test. got: ${r.reason}`);
  assert.ok(r.reason.includes("LIT one"), `and the literal it holds, or the Designer cannot act. got: ${r.reason}`);
  assert.ok(r.reason.includes("repin") && r.reason.includes("keep"),
    `quoting the two dispositions that fix it. got: ${r.reason}`);
  assert.strictEqual(r.remedy_owner, "designer",
    "the remedy is the Designer's re-assembly -- the caller never writes the pins block itself");

  // 3. DECLARED: green, and the note says what it graded.
  out = {};
  assert.strictEqual(kickoffPinsFinding(K("7.0.1066", `${H} | repin | count`), resolve, out), null,
    "the SAME bytes plus one pins line naming the holder are green -- a clause that refuses either " +
    "way is not a gate, it is a wall");
  assert.ok(out.note.endsWith("1 repin (AGT-328)."),
    `and the green must COUNT what it graded (19v). got: ${out.note}`);

  // 4. A BAD DISPOSITION is refused -- COVERAGE, never the decision (the risk clause's rule).
  out = {};
  r = kickoffPinsFinding(K("7.0.1066", `${H} | maybe | x`), resolve, out);
  assert.ok(r && r.clause === PINS_CLAUSE,
    `\`maybe\` is not a disposition: the clause grades whether every holder is DECLARED, and an ` +
    `unparseable line declares nothing. got: ${JSON.stringify(r)}`);
  assert.deepStrictEqual(PIN_DISPOSITIONS, ["repin", "keep"], "and the two dispositions are exactly these");
  assert.ok(Object.isFrozen(PIN_DISPOSITIONS), "frozen, so a caller cannot widen the vocabulary at runtime");

  // 5. A PRESENT BLOCK IS GRADED WHATEVER THE STAMP, and declaring the WRONG test does not discharge
  //    the holder -- this is the arm a clause that merely counted lines would pass.
  out = {};
  r = kickoffPinsFinding(K("7.0.1065", "tests/regression/other.test.mjs | keep | x"), resolve, out);
  assert.ok(r && r.clause === PINS_CLAUSE,
    `a kickoff that WRITES a pins block is graded even below the boundary, and a line naming some ` +
    `OTHER test leaves the real holder undeclared. got: ${JSON.stringify(r)}`);
  assert.ok(r.reason.includes(H), `the refusal still names the holder, not the line that was written. got: ${r.reason}`);

  // 6. The resolver answering NULL is NOT GRADED per anchor, never a manufactured refusal: "git is
  //    unavailable in this container" must not become "your test holds nothing".
  out = {};
  assert.strictEqual(kickoffPinsFinding(K("7.0.1066"), () => null, out), null,
    "an anchor the resolver could not answer for is NOT GRADED -- a refusal made out of the " +
    "runner's own environment is not a measurement");
  assert.ok(out.note.includes("NOT GRADED"), `and the green says which anchors it skipped. got: ${out.note}`);

  // The block reader and the constant, so (D) cannot pass against a boundary that drifted.
  assert.deepStrictEqual(PINS_BLOCK_FROM, [7, 0, 1066],
    "the boundary is the version AFTER this build (call D4) -- moving it would re-grade the corpus");
  assert.strictEqual(pinsBlockLines(K("7.0.1066")), null, "no pins block reads as null, never []");
  assert.deepStrictEqual(pinsBlockLines(K("7.0.1066", `${H} | keep | why`)),
    [{ raw: `${H} | keep | why`, test: H, disposition: "keep", why: "why" }],
    "and a block reads as one parsed row per line");
}

// == (E) 7a: the re-pin rides THIS ship ==========================================================
function aRepinLeftOutOfTheDeliveryBlocksTheShip() {
  const text = K("7.0.1066", `${H} | repin | count`);

  const left = pinsShipFinding({ text, changedFiles: ["scripts/a.js"] });
  assert.ok(left, "a kickoff declaring `repin` whose delivery does not touch that test must BLOCK: " +
    "the re-pin rides the ship that changes the literal, it is never owed to a later one");
  assert.strictEqual(left.kind, "pin-left-behind", "and the finding names itself so the row can route it");
  assert.deepStrictEqual(left.tests, [H], `naming the test left behind. got: ${JSON.stringify(left.tests)}`);
  assert.ok(left.reason.includes("never owed to a later one"), `and saying why. got: ${left.reason}`);

  assert.strictEqual(pinsShipFinding({ text, changedFiles: ["scripts/a.js", "./" + H] }), null,
    "the SAME kickoff with that test IN the delivery is green -- and `./`-prefixed, because a path " +
    "spelled two ways is one file and a clause that missed that would block a correct ship");

  const closed = pinsShipFinding({ text, changedFiles: null });
  assert.deepStrictEqual(closed && closed.tests, [H],
    "an UNREADABLE changed-file list FAILS CLOSED -- a delivery least able to prove it re-pinned " +
    "the test is exactly where this must not pass");
  assert.ok(closed.reason.includes("fail closed"), `saying so in words. got: ${closed.reason}`);

  assert.strictEqual(pinsShipFinding({ text: K("7.0.1066"), changedFiles: ["scripts/a.js"] }), null,
    "a kickoff with NO pins block is not this clause's business -- nearly every shipped kickoff");
  assert.strictEqual(pinsShipFinding({ text: K("7.0.1066", `${H} | keep | why`), changedFiles: ["scripts/a.js"] }), null,
    "and `keep` is a DECLARATION, never a ship requirement (limit L3): only `repin` is held to");
  assert.strictEqual(pinsShipFinding({}), null, "no text, nothing to grade -- never a throw");
}

// == (F) the spawned CLI, uncredentialed =========================================================
function theCliRefusesAnUndeclaredPinAndGreensADeclaredOne() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt328-pins-"));
  // `--json` on purpose: `emit()` prints the PAYLOAD only with that flag, and the payload is what
  // the cycle routes on. Grading the prose alone would pass against a clause that reached the right
  // exit code with an empty payload.
  const run = p => {
    const env = { ...process.env };
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_KEY;
    const r = spawnSync(process.execPath, [VERIFIER, `--check-kickoff=${p}`, "--json"], { encoding: "utf8", env, cwd: ROOT });
    return { status: r.status, out: String(r.stdout || "") + String(r.stderr || "") };
  };
  // NO anchors block here: this fixture proves the CLI reaches and grades the pins block itself,
  // with no dependence on what `git grep` can see from a temp directory.
  const CLI = pins => `<!-- DeepBench v7.0.1066 | kickoff | FIXTURE -->\n` + LANES + TASK + RISK
    + "\n```pins\n" + pins + "\n```\n";
  const write = (name, text) => { const p = path.join(dir, name); fs.writeFileSync(p, text, "utf8"); return p; };

  try {
    const bad = run(write("bad.md", CLI(`tests/regression/${x} | maybe | y`)));
    assert.strictEqual(bad.status, 1,
      `an unparseable pins line must exit 1 at the CLI -- the exit code is the only thing runbook ` +
      `step 6 reads. got ${bad.status}:\n${bad.out}`);
    assert.strictEqual(JSON.parse(bad.out.trim()).clause, PINS_CLAUSE,
      `and the refusal payload must name clause "${PINS_CLAUSE}":\n${bad.out}`);

    // THE DISCRIMINATOR, the pair the ship turns on: the same fixture, one word changed.
    const good = run(write("good.md", CLI(`tests/regression/${x} | keep | y`)));
    assert.strictEqual(good.status, 0,
      `the SAME fixture with \`keep\` must exit 0. got ${good.status}:\n${good.out}`);
    const note = JSON.parse(good.out.trim()).pins_note;
    assert.ok(typeof note === "string" && note.startsWith("pins: 0 regression test(s)"),
      `and that green must carry pins_note in its payload, so the cycle sees WHICH clause passed ` +
      `rather than inferring it from a bare 0 (19v). got: ${note}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// == (G) the wiring and the register =============================================================
function theShipHalfIsWiredOnceAndTheRegisterCarriesTheRuleOnce() {
  const src = fs.readFileSync(VERIFIER, "utf8");
  assert.strictEqual(src.split(SHIP_CALL).length - 1, 1,
    `\`${SHIP_CALL}\` must occur EXACTLY ONCE in scripts/verifier.js -- a pure 7a clause nobody ` +
    `calls grades nothing, and two call sites would be two rules`);

  const lines = fs.readFileSync(path.join(ROOT, REGISTER_REL), "utf8")
    .split("\n").filter(l => l.startsWith(REGISTER_PREFIX));
  assert.strictEqual(lines.length, 1,
    `${REGISTER_REL} must carry EXACTLY ONE line starting "${REGISTER_PREFIX}" -- the register is ` +
    `append-only and goes into every Designer prompt, so a second copy is a second rule (call D5). ` +
    `got ${lines.length}`);
  assert.ok(lines[0].includes("repin or keep"),
    `and the fact must quote the two dispositions, so the sentence the Designer reads and the ` +
    `vocabulary the verifier matches cannot drift apart (pattern:93). got: ${lines[0]}`);
  assert.ok(lines[0].includes("pins"), `naming the block. got: ${lines[0]}`);
}

export default async function run() {
  theParserReadsADeclaredCountAndNeverInventsOne();              // (A)
  theDeltaChargesArmGrowthInsideAStandingRedFile();               // (B)
  bothBaselineReadersCarryTheArmCounts();                         // (C)
  thePinsClauseRefusesAnUndeclaredPinOnlyFromTheBoundary();       // (D)
  aRepinLeftOutOfTheDeliveryBlocksTheShip();                      // (E)
  theCliRefusesAnUndeclaredPinAndGreensADeclaredOne();            // (F)
  theShipHalfIsWiredOnceAndTheRegisterCarriesTheRuleOnce();       // (G)

  console.log("  [AGT-328] the delta counts failing ARMS inside a standing-red file: the same " +
    "names and the same absolute red grade `red` with `" + x + " (1 -> 3 failing arms)` when both " +
    "arm maps are handed over, `green` with no `grown` key when they are absent (every four-key " +
    "caller unchanged), and `green` again when both sides declare the same count; a nested `[FAIL]` " +
    "and a bare assertion never manufacture a count; both baseline readers carry `arms` off the " +
    "same read. And a pinned literal is re-pinned in its own ship: from v7.0.1066 a kickoff whose " +
    "anchor resolves into a regression test refuses with clause `pins` unless a pins line names it, " +
    "the same bytes stamped v7.0.1065 stay NOT GRADED, `repin` left out of the delivery blocks 7a " +
    "and an unreadable changed-file list fails closed -- asserted through the spawned " +
    "uncredentialed CLI as well as the pure helpers, and against the one register line the " +
    "Designer reads.");
}

selfRun(import.meta.url, run);
