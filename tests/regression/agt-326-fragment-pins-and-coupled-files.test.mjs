// DeepBench v7.0.1071 | tests/regression/agt-326-fragment-pins-and-coupled-files.test.mjs | AGT-326
// -- a test that asserts a PIECE of an anchored line pins it, and a runbook edit's dragged files are
// counted before the Builder runs.
//
// FEATURE: AGT-326 T1/T2/T3. Measured on tree 278e126, two holes in the pre-Builder clauses:
//
// (1) THE PINS CLAUSE (AGT-328) ASKS WHICH FILES HOLD THE WHOLE ANCHORED LITERAL, and a regression
//     test almost never holds a whole line -- it asserts a quoted piece of one, or a `/regex/.test(`
//     body carrying its own backslash escapes. The runbook line cycle 89491155's kickoff deleted is
//     held WHOLE by exactly one file (the runbook itself), while
//     tests/regression/ses-315-ship-reverse.test.mjs asserts 49 characters of it -- so the whole
//     line resolved into no test at all and a kickoff stamped v7.0.1072 anchoring it exits 0 today.
//     That cost a Designer and a Builder lane before 7a blocked the ship.
//
// (2) NOTHING READ A KICKOFF FOR THE FILES A RUNBOOK EDIT DRAGS. Any byte change to
//     docs/runbooks/runner-cycle.md needs docs/runbooks/cycle-card.md re-rendered in the same commit
//     and `BYTES_AT_SHIP` re-pinned unless the edit is byte-neutral. A Builder may not widen a
//     kickoff's file list, so a kickoff that leaves a dragged file out cannot pass 7a -- and that is
//     knowable from the kickoff's own bytes, before any lane is spent.
//
// WHAT THIS FILE GUARDS, and where a lazy version of each guard passes vacuously.
//
// (A) THE FRAGMENT PARSER, pure, over the three shapes a test file really mixes: a COMMENT line
//     naming the words (pins nothing -- the control that stops a comment manufacturing a pin), a
//     quoted PATH (29 characters, no space: a name, not an assertion about a line), and a
//     `/regex/.test(` body whose two real backslashes must come back out. A parser that skipped the
//     comment check, or kept the path, would fail this arm on the exact value.
//
// (B) THE DIRECTION ITSELF: the test that NAMES the anchored file and holds a fragment of the
//     anchored literal is a holder; its twin, identical but for the file it names, is not. And the
//     FLOOR is asserted from below -- a 19-character literal resolves to nobody, so a clause that
//     dropped FRAGMENT_MIN would fail here rather than quietly widening every kickoff's holders.
//
// (C) THE SAME CLAUSE, not a new one: `kickoffPinsFinding` refuses with clause `pins`. Arms 1 and 2
//     are the stamp boundary (call D4) -- the SAME bytes stamped v7.0.1071 are null and stamped
//     v7.0.1072 refuse, which is what keeps the shipped kickoff corpus green (pattern:162: a check
//     grades the change, never the live world). Arm 4 is the fail-OPEN-is-not-a-pass control: no
//     sources handed over adds nothing, it never throws and it never invents a holder.
//
// (D) THE COUPLED CLAUSE, pure, eight fixtures: no coupled file anchored, the stamp boundary, the
//     missing dragged file AND the missing word, a kickoff with no cap words at all, the green, the
//     cap case, the waiver, and the conditional file counted only because the kickoff names it.
//
// (E) THE SPAWNED CLI, uncredentialed, with `--repo=<temp dir>` -- the ticket's own arm. E1 is THE
//     DISCRIMINATOR: a kickoff stamped v7.0.1072 anchoring that runbook line, naming every dragged
//     file, exits 1 with clause `pins` naming tests/regression/x.test.mjs, so step 7's own command
//     refuses and no Builder is ever spawned. On tree 278e126 that same fixture exits 0.
//
// (F) THE REGISTER the Designer reads carries the rule exactly once.
//
// NO CREDENTIALS, NO NETWORK, NO WRITES to the repo: pure calls, files under os.tmpdir(), one read
// of the committed register.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  FRAGMENT_FROM, FRAGMENT_MIN, pinnedFragments, fragmentHolders,
  PINS_CLAUSE, kickoffPinsFinding,
  COUPLED_CLAUSE, COUPLED_FROM, COUPLED_FILES, kickoffCoupledFinding,
} from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFIER = path.join(ROOT, "scripts/verifier.js");
const REGISTER_REL = "docs/runbooks/environment-facts.md";
const REGISTER_PREFIX = "- 2026-11-20 | AGT-326 | ";

const RB = "docs/runbooks/runner-cycle.md";
const X = "tests/regression/x.test.mjs";
const LINE = "the line holds **second consecutive** failed revalidation and nothing a whole-line grep finds";
const FRAGMENT = "second consecutive** failed revalidation";

// Line 1 is a comment, line 2 a quoted path with no space, line 3 the regex body with its two REAL
// backslashes -- the three shapes a regression test mixes on one page.
const TEST_SRC = [
  '// a comment naming "second consecutive failed revalidation words" pins nothing',
  'const RUNBOOK = "docs/runbooks/runner-cycle.md";',
  "assert.ok(/second consecutive\\*\\* failed revalidation/.test(read(RUNBOOK)), 'x');",
].join("\n");

const tests = [
  { file: X, src: TEST_SRC },
  { file: "tests/regression/y.test.mjs", src: TEST_SRC.replace("runner-cycle.md", "other.md") },
];

const A = `${RB} | 1 | ${LINE}`;
const S1 = "scripts/a.js | 1 | x";
const S2 = "scripts/b.js | 1 | y";
const noRes = () => ({ files: [] });
const OK = "caps 3 / 4. docs/runbooks/cycle-card.md re-rendered; BYTES_AT_SHIP unchanged, byte-neutral.";

const K = (stamp, { anchors = [], pins = null, body = "" } = {}) =>
  `<!-- DeepBench v${stamp} | kickoff | FIXTURE -->\n`
  + "**Lanes:** session `orchestrator`; executor none.\n"
  + body
  + "\n**T1 -- a.** one\n\n"
  + "```risk\nT1 | a | b | c\n```\n"
  + (anchors.length ? "\n```anchors\n" + anchors.join("\n") + "\n```\n" : "")
  + (pins ? "\n```pins\n" + pins + "\n```\n" : "");

// == (A) the fragment parser =====================================================================
function theParserReadsTheAssertedPieceAndNeverTheNames() {
  assert.deepStrictEqual(pinnedFragments(TEST_SRC), [FRAGMENT],
    "pinnedFragments must return EXACTLY the asserted piece: the comment line pins nothing (a " +
    "comment naming the words is not an assertion about a line), the quoted path has no space so " +
    "it is a name, and the regex body's two real backslashes come back out");
  assert.deepStrictEqual(pinnedFragments(""), [], "no source, no fragments -- never a throw");
  assert.deepStrictEqual(pinnedFragments(null), [], "and null is not a crash either");
  assert.ok(FRAGMENT_MIN === 20, `FRAGMENT_MIN is the floor the arms below measure. got ${FRAGMENT_MIN}`);
}

// == (B) the direction, and its floor from below =================================================
function onlyTheTestThatNamesTheAnchoredFileAndHoldsAPieceIsAHolder() {
  assert.deepStrictEqual(fragmentHolders({ path: RB, literal: LINE, tests }), [X],
    "the test that NAMES the anchored file and holds a fragment of the anchored literal is a " +
    "holder; y.test.mjs holds the identical fragment and names another file, so it is not -- the " +
    "pair is the discriminator, since a clause ignoring the name would return both");
  assert.deepStrictEqual(fragmentHolders({ path: RB, literal: "failed revalidation", tests }), [],
    "and the floor is asserted FROM BELOW: a literal shorter than FRAGMENT_MIN resolves to " +
    "nobody, so dropping the minimum would widen every kickoff's holders silently");
  assert.deepStrictEqual(fragmentHolders({ path: RB, literal: LINE, tests: null }), [],
    "no sources, no holders -- never a throw");
}

// == (C) the SAME pins clause, from the stamp boundary ===========================================
function theFragmentDirectionFeedsThePinsClauseOnlyFromTheBoundary() {
  const o1 = {};
  assert.strictEqual(kickoffPinsFinding(K("7.0.1071", { anchors: [A] }), noRes, o1, () => tests), null,
    `the stamp boundary (call D4): stamped below v${FRAGMENT_FROM.join(".")} the fragment direction ` +
    "adds nothing, which is what keeps the shipped kickoff corpus green");

  const o2 = {};
  const refused = kickoffPinsFinding(K("7.0.1072", { anchors: [A] }), noRes, o2, () => tests);
  assert.ok(refused, "the SAME bytes stamped v7.0.1072 must refuse");
  assert.strictEqual(refused.clause, PINS_CLAUSE,
    `and through the EXISTING clause, not a new kind: clause must be "${PINS_CLAUSE}" (call D1). got ${refused.clause}`);
  assert.strictEqual(refused.kind, "kickoff-no-lanes",
    `kind must stay kickoff-no-lanes so runbook steps 6-7 route it unchanged (call D5). got ${refused.kind}`);
  assert.ok(refused.reason.includes(X),
    `and the refusal must NAME the holding test, or the Designer cannot write the pins line. got: ${refused.reason}`);

  const o3 = {};
  assert.strictEqual(
    kickoffPinsFinding(K("7.0.1072", { anchors: [A], pins: `${X} | keep | y` }), noRes, o3, () => tests), null,
    "declared, so the clause passes -- one word of the kickoff is the whole difference");
  assert.ok(String(o3.note).startsWith("pins: 1 regression test(s)"),
    `and that green must carry the note saying the fragment holder was COUNTED, not skipped. got: ${o3.note}`);

  assert.strictEqual(kickoffPinsFinding(K("7.0.1072", { anchors: [A] }), noRes, {}), null,
    "NOT GRADED, never a pass by invention: with no sources handed over (the old four-argument " +
    "call shape) the fragment direction adds nothing and never throws");
}

// == (D) the coupled clause ======================================================================
function theCoupledClauseCountsTheDraggedFilesAgainstTheKickoffsOwnCap() {
  const call = (stamp, opts) => { const out = {}; return { f: kickoffCoupledFinding(K(stamp, opts), out), out }; };

  const d1 = call("7.0.1072", { anchors: [S1] });
  assert.strictEqual(d1.f, null, "no anchored file drags another: nothing to grade");
  assert.strictEqual(d1.out.note, "coupled: no anchored file drags another (AGT-326).",
    `and the green says so. got: ${d1.out.note}`);

  const d2 = call("7.0.1071", { anchors: [A] });
  assert.strictEqual(d2.f, null, `the stamp boundary again: below v${COUPLED_FROM.join(".")}, NOT GRADED`);
  assert.ok(String(d2.out.note).startsWith("NOT GRADED (AGT-326): stamp v7.0.1071"),
    `and it says NOT GRADED rather than reading as a pass. got: ${d2.out.note}`);

  const d3 = call("7.0.1072", { anchors: [A] });
  assert.ok(d3.f, "the same bytes stamped v7.0.1072, naming no dragged file, must refuse");
  assert.strictEqual(d3.f.clause, COUPLED_CLAUSE, `clause ${COUPLED_CLAUSE}. got ${d3.f.clause}`);
  assert.strictEqual(d3.f.kind, "kickoff-no-lanes", `kind kickoff-no-lanes. got ${d3.f.kind}`);
  assert.ok(d3.f.reason.includes("docs/runbooks/cycle-card.md"),
    `the refusal names the file dragged by ANY edit. got: ${d3.f.reason}`);
  assert.ok(d3.f.reason.includes("BYTES_AT_SHIP"),
    `and the word the Designer must carry for the CONDITIONAL drag (call D2). got: ${d3.f.reason}`);
  assert.strictEqual(d3.out.floor, 2, `floor = the anchored path plus the dragged file. got ${d3.out.floor}`);

  const d4 = call("7.0.1072", { body: "docs/runbooks/cycle-card.md re-rendered; BYTES_AT_SHIP unchanged, byte-neutral.", anchors: [A] });
  assert.ok(d4.f, "every dragged file named but NO cap words: the count has nothing to land against");
  assert.strictEqual(d4.f.clause, COUPLED_CLAUSE, `clause ${COUPLED_CLAUSE}. got ${d4.f.clause}`);
  assert.ok(d4.f.reason.includes("states no file cap"),
    `and the refusal says which word is missing (call D3). got: ${d4.f.reason}`);

  const d5 = call("7.0.1072", { anchors: [A], body: OK });
  assert.strictEqual(d5.f, null, "named, worded and within the cap: the clause passes");
  assert.strictEqual(d5.out.floor, 2, `floor 2. got ${d5.out.floor}`);
  assert.strictEqual(d5.out.cap, 3, `and the cap is read from the kickoff's own words. got ${d5.out.cap}`);

  const d6 = call("7.0.1072", { anchors: [A, S1, S2], body: OK });
  assert.ok(d6.f, "the floor OVER the cap is a certain cap case, not a guess");
  assert.strictEqual(d6.f.clause, COUPLED_CLAUSE, `clause ${COUPLED_CLAUSE}. got ${d6.f.clause}`);
  assert.ok(d6.f.reason.includes("4 files at least"), `naming the floor. got: ${d6.f.reason}`);
  assert.ok(d6.f.reason.includes("against a file cap of 3"), `and the cap. got: ${d6.f.reason}`);
  assert.ok(d6.f.remedy.includes("CAP CASE"),
    `and the remedy is a CAP CASE, never a narrower kickoff (pattern:172). got: ${d6.f.remedy}`);

  const d7 = call("7.0.1072", { anchors: [A, S1, S2], body: "caps 3/4 WAIVED by decision d. docs/runbooks/cycle-card.md re-rendered; BYTES_AT_SHIP unchanged, byte-neutral." });
  assert.strictEqual(d7.f, null, "a kickoff that says the cap was waived is counted and not refused");
  assert.ok(String(d7.out.note).includes("waived"), `and the note says so. got: ${d7.out.note}`);
  assert.strictEqual(d7.out.floor, 4, `the floor is still counted and reported. got ${d7.out.floor}`);

  const d8 = call("7.0.1072", { anchors: [A, S1], body: "caps 3 / 4. docs/runbooks/cycle-card.md re-rendered; BYTES_AT_SHIP re-pinned in tests/regression/ses-413d-questions-scoreboard.test.mjs." });
  assert.ok(d8.f, "the conditional file is counted ONCE THE KICKOFF NAMES IT, which tips this one over");
  assert.strictEqual(d8.f.clause, COUPLED_CLAUSE, `clause ${COUPLED_CLAUSE}. got ${d8.f.clause}`);
  assert.strictEqual(d8.out.floor, 4,
    "floor 4: two anchored paths, the always-dragged card, and the re-pinned conditional test the " +
    `kickoff named -- a clause counting only the unconditional drag would read 3. got ${d8.out.floor}`);

  assert.deepStrictEqual(Object.keys(COUPLED_FILES), [RB],
    "the map is static and small on purpose (pattern:18): one entry, read off the tree, changed in " +
    "the ship that changes the coupling");
}

// == (E) the spawned CLI, uncredentialed -- the ticket's own arm ==================================
function theCliRefusesTheKickoffThatCannotPassBeforeAnyBuilderRuns() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt326-"));
  try {
    fs.mkdirSync(path.join(dir, "tests/regression"), { recursive: true });
    fs.writeFileSync(path.join(dir, X), TEST_SRC, "utf8");
    // `--json` on purpose: `emit()` prints the PAYLOAD only with that flag, and the payload is what
    // the cycle routes on. The temp dir is no git repo, so the anchors RESOLVER cannot answer and
    // those anchors are NOT GRADED -- the fragment direction reads files, not git, which is exactly
    // why this arm reaches the clause at all.
    const run = (name, text) => {
      const p = path.join(dir, name);
      fs.writeFileSync(p, text, "utf8");
      const env = { ...process.env };
      delete env.SUPABASE_URL;
      delete env.SUPABASE_SERVICE_KEY;
      const r = spawnSync(process.execPath, [VERIFIER, `--check-kickoff=${p}`, `--repo=${dir}`, "--json"],
        { encoding: "utf8", env, cwd: ROOT });
      const out = String(r.stdout || "") + String(r.stderr || "");
      let payload = null;
      try { payload = JSON.parse(String(r.stdout || "").trim()); } catch { payload = null; }
      return { status: r.status, out, payload };
    };

    // E1 -- THE DISCRIMINATOR of the whole ship. Every dragged file named, the cap written, and the
    // kickoff still cannot pass: a regression test holds a PIECE of the anchored line and has no
    // pins line. On tree 278e126 this exact fixture exits 0.
    const e1 = run("e1.md", K("7.0.1072", { anchors: [A], body: OK }));
    assert.strictEqual(e1.status, 1,
      "THE TICKET'S ARM: step 7's own command must exit 1 on a kickoff whose anchored line is " +
      `pinned only in PIECES, so no Designer and no Builder lane is spent. got ${e1.status}:\n${e1.out}`);
    assert.strictEqual(e1.payload && e1.payload.clause, PINS_CLAUSE,
      `and the payload must name clause "${PINS_CLAUSE}" -- the existing clause, no new kind:\n${e1.out}`);
    assert.ok(e1.payload.reason.includes(X),
      `naming the fragment holder so the Designer can write its line:\n${e1.out}`);

    // E2 -- the SAME fixture with one pins line added: both clauses green, and both say so.
    const e2 = run("e2.md", K("7.0.1072", { anchors: [A], body: OK, pins: `${X} | repin | T1 edits it` }));
    assert.strictEqual(e2.status, 0,
      `the same fixture with the pins line must exit 0. got ${e2.status}:\n${e2.out}`);
    assert.ok(String(e2.payload.coupled_note).startsWith("coupled: 1 anchored file(s) drag others"),
      `and the green carries coupled_note, so the cycle sees WHICH clause passed rather than ` +
      `inferring it from a bare 0 (19v). got: ${e2.payload.coupled_note}`);
    assert.ok(String(e2.payload.pins_note).startsWith("pins: 1 regression test(s)"),
      `beside pins_note. got: ${e2.payload.pins_note}`);

    // E3 -- the stamp boundary at the CLI: the corpus of shipped kickoffs stays green.
    const e3 = run("e3.md", K("7.0.1071", { anchors: [A] }));
    assert.strictEqual(e3.status, 0,
      `stamped v7.0.1071 the same anchors must still exit 0. got ${e3.status}:\n${e3.out}`);
    assert.ok(String(e3.payload.coupled_note).startsWith("NOT GRADED (AGT-326)"),
      `and the payload says NOT GRADED rather than reading as a graded pass. got: ${e3.payload.coupled_note}`);

    // E4 -- the pins line written, the dragged file NOT named: the second clause catches it.
    const e4 = run("e4.md", K("7.0.1072", { anchors: [A], pins: `${X} | repin | T1 edits it` }));
    assert.strictEqual(e4.status, 1,
      `a kickoff that drags a file it never names must exit 1. got ${e4.status}:\n${e4.out}`);
    assert.strictEqual(e4.payload && e4.payload.clause, COUPLED_CLAUSE,
      `with clause "${COUPLED_CLAUSE}" -- a DIFFERENT clause from E1, so the two halves of this ` +
      `ship are proven apart rather than one masking the other:\n${e4.out}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// == (F) the register the Designer reads =========================================================
function theRegisterCarriesTheRuleExactlyOnce() {
  const lines = fs.readFileSync(path.join(ROOT, REGISTER_REL), "utf8")
    .split("\n").filter(l => l.startsWith(REGISTER_PREFIX));
  assert.strictEqual(lines.length, 1,
    `${REGISTER_REL} must carry EXACTLY ONE line starting "${REGISTER_PREFIX}" -- the register is ` +
    `append-only and goes into every Designer prompt, so a second copy is a second rule. got ${lines.length}`);
  assert.ok(lines[0].includes("BYTES_AT_SHIP"),
    `and the fact must quote the word the coupled clause matches, so the sentence the Designer ` +
    `reads and the vocabulary the verifier matches cannot drift apart (pattern:93). got: ${lines[0]}`);
  assert.ok(lines[0].includes("caps N / M"), `and the cap words it must write. got: ${lines[0]}`);
  assert.ok(lines[0].includes("pins"), `naming the block the holder needs a line in. got: ${lines[0]}`);
}

export default async function run() {
  theParserReadsTheAssertedPieceAndNeverTheNames();                 // (A)
  onlyTheTestThatNamesTheAnchoredFileAndHoldsAPieceIsAHolder();     // (B)
  theFragmentDirectionFeedsThePinsClauseOnlyFromTheBoundary();      // (C)
  theCoupledClauseCountsTheDraggedFilesAgainstTheKickoffsOwnCap();  // (D)
  theCliRefusesTheKickoffThatCannotPassBeforeAnyBuilderRuns();      // (E)
  theRegisterCarriesTheRuleExactlyOnce();                           // (F)

  console.log("  [AGT-326] a kickoff that cannot pass is refused before the Builder runs: a test " +
    "asserting a PIECE of an anchored line (a quoted string or a /regex/.test( body of 20+ " +
    "characters, escapes removed, comments and bare paths ignored) is now a holder of that line " +
    "and needs its pins line through the SAME clause, while a kickoff anchoring " +
    "docs/runbooks/runner-cycle.md is refused unless it names docs/runbooks/cycle-card.md, carries " +
    "BYTES_AT_SHIP and writes `caps N / M` -- the anchored paths plus the dragged files counted as " +
    "a floor against that cap, a floor over it a CAP CASE; both graded only from v7.0.1072, both " +
    "proven through the spawned uncredentialed CLI (the arm that exits 0 on tree 278e126 now exits " +
    "1 with clause `pins`) as well as the pure helpers, and against the one register line the " +
    "Designer reads.");
}

selfRun(import.meta.url, run);
