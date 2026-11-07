// DeepBench v7.0.977 | tests/regression/agt-610-risk-block.test.mjs | AGT-610 -- the risk
// declaration is graded for COVERAGE and only from v7.0.977.
//
// FEATURE: AGT-610 T3. John's standing decision 6e94edcb (2026-11-05) says the Designer re-designs
// a ticket BY RISK -- "what each part touches, how far it reaches, how it is undone". Before this
// ship nothing read a risk declaration at all: `scripts/verifier.js --check-kickoff` graded cap,
// Lanes, Builder model, anchors and attestation, and a kickoff could name eight tasks without
// saying what a single one of them would do to the platform or how it would come back.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (A) THE EIGHT WORKED CASES, against the exported helpers, pure. Each one is a different way the
//     clause can be wrong, and three of them are the ways it would be wrong in the DANGEROUS
//     direction: a missing task silently covered, a three-field line accepted as a declaration, and
//     a block invented by a line that names no task at all.
//
// (B) THE SPAWNED CLI, because the helper being right proves nothing about the branch calling it.
//     `--check-kickoff` is what runbook step 6 runs, and the exit code is what the cycle acts on.
//     The fixtures are written under os.tmpdir() with BOTH credentials deleted from the child env,
//     exactly as `ses-376` / `ses-359` / `agt-187` spawn it: this clause must hold in an
//     uncredentialed cloud cycle, which is the only place it ever runs unattended.
//
// (C) THE SHIPPED KICKOFF, its own block, graded by the tool it ships. 8 tasks, 8 lines: a clause
//     whose first customer is its own kickoff cannot be green by accident.
//
// THE STAMP BOUNDARY IS THE CLAUSE'S WHOLE SAFETY (pattern:162 -- a check grades the change, never
// the corpus). Thirteen shipped tests spawn `--check-kickoff` on fixtures and on SHIPPED kickoffs
// demanding 0; every kickoff in the corpus predates the block. So (B)'s fifth arm restamps the
// SAME no-block fixture to v7.0.448 and demands exit 0 with the NOT GRADED note -- without that
// arm, "absence is refused" would be a change that turns the whole corpus red and wedges step 6.
//
// NO CREDENTIALS, no network, no Supabase, no model call, no writes: pure helpers, four temp files
// under os.tmpdir(), and one read of a committed kickoff.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  RISK_CLAUSE, RISK_BLOCK_FROM, kickoffStampVersion, kickoffTaskParts,
  riskBlockLines, kickoffRiskFinding,
} from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFIER = path.join(ROOT, "scripts/verifier.js");
const SHIPPED_REL = "docs/kickoffs/v7.0.977-AGT-610-refusal-redesign-ledger.md";

// The fixture kickoff: a real stamp, a real Lanes: line, three tasks, NO anchors block (so the
// anchors clause stays NOT GRADED and this file grades the risk clause alone).
const LANES = "- **Lanes:** session `orchestrator`; executor none.";
const TASKS = "\n**T1 -- a.** one\n**T2 -- b.** two\n**T3 -- c.** three\n";
const FULL = ["T1 | f | 1 row | git revert", "T2 | g | nothing | delete it", "T3 | h | kickoffs | git revert"];

const stamp = v => `<!-- DeepBench v${v} | kickoff | FIXTURE -->\n`;
const block = lines => "\n```" + RISK_CLAUSE + "\n" + lines.join("\n") + "\n```\n";
const fixture = (v, lines) => stamp(v) + LANES + TASKS + (lines ? block(lines) : "");

// == (A) the eight worked cases, pure ============================================================
function theHelperGradesCoverageAndNothingElse() {
  // 1. three tasks, a full block -> green, 3 of 3.
  let out = {};
  assert.strictEqual(kickoffRiskFinding(fixture("7.0.977", FULL), out), null,
    "a block covering every task is green");
  assert.deepStrictEqual({ parts: out.parts, covered: out.covered }, { parts: 3, covered: 3 },
    "and the green SAYS how much it graded (19v) -- a note is how the caller distinguishes " +
    "'graded 3 of 3' from 'graded nothing'");
  assert.ok(out.note.includes("risk: 3 of 3 parts covered"), `the note names the coverage, got: ${out.note}`);

  // 2. T3's line removed -> refused, naming the uncovered task AND the count.
  out = {};
  let r = kickoffRiskFinding(fixture("7.0.977", FULL.slice(0, 2)), out);
  assert.ok(r, "a task with no risk line is REFUSED -- an undeclared part is the whole defect");
  assert.strictEqual(r.clause, RISK_CLAUSE, "the refusal names its clause, so the caller can route it");
  assert.ok(r.reason.includes("T3") && r.reason.includes("2 of 3 covered"),
    `the refusal must name WHICH task and how far it got -- 'your block is wrong' is not actionable. got: ${r.reason}`);
  assert.strictEqual(out.covered, 2, "and the out object carries the partial coverage");

  // 3. a three-field line is not a declaration.
  r = kickoffRiskFinding(fixture("7.0.977", ["T1 | f | revert"]), {});
  assert.ok(r && r.reason.includes("does not split on three pipes"),
    `a line missing a field must be named rather than dropped -- a silently skipped line is a ` +
    `declaration nobody checked. got: ${r && r.reason}`);

  // 4. no block, stamped BELOW the boundary -> NOT GRADED, exit code untouched.
  out = {};
  assert.strictEqual(kickoffRiskFinding(fixture("7.0.448", null), out), null,
    "below v7.0.977 the absence of a block is NOT GRADED -- refusing it would wedge the corpus");
  assert.ok(/NOT GRADED \(AGT-610\)/.test(out.note) && out.note.includes("v7.0.448"),
    `and the green must SAY it did not grade, naming the stamp it read. got: ${out.note}`);

  // 5. no block, stamped AT the boundary -> refused. (4) and (5) are the same bytes but the stamp.
  r = kickoffRiskFinding(fixture("7.0.977", null), {});
  assert.ok(r && r.reason.includes("carries no fenced risk block"),
    `at v7.0.977 the absence IS the refusal -- otherwise the clause never binds anything. got: ${r && r.reason}`);

  // 6. no stamp at all -> NOT GRADED, never refused: an unstamped file may not be a kickoff yet.
  out = {};
  assert.strictEqual(kickoffRiskFinding(LANES + TASKS, out), null, "an unstamped file is not graded");
  assert.ok(out.note.includes("absent"), `and the note says the stamp was absent, got: ${out.note}`);

  // 7. a line naming a task that does not exist -> refused. The dangerous direction: coverage would
  //    read 3 of 3 and the block would still be describing work the kickoff does not do.
  out = {};
  r = kickoffRiskFinding(fixture("7.0.977", FULL.concat(["T4 | i | j | k"])), out);
  assert.ok(r && r.reason.includes("T4") && r.reason.includes("name no task"),
    `a risk line for a task TASKS does not carry must be refused. got: ${r && r.reason}`);
  assert.strictEqual(out.covered, 3, "CONTROL: coverage was complete -- the refusal is about the EXTRA line");

  // 8. `undo` keeps any further pipes: the split is on the FIRST THREE only.
  const lines = riskBlockLines(stamp("7.0.977") + block(["T1 | f | 1 row | a | b"]));
  assert.strictEqual(lines.length, 1, "one non-blank line, one parsed line");
  assert.strictEqual(lines[0].undo, "a | b",
    `undo must keep its own pipes -- 'git revert; decision reverse | re-pin' is one undo, not two ` +
    `fields. got: ${JSON.stringify(lines[0].undo)}`);
  assert.strictEqual(kickoffRiskFinding(stamp("7.0.977") + "\n**T1 -- a.** x\n" + block(["T1 | f | 1 row | a | b"]), {}),
    null, "and such a line is green");

  // The parse's own two ends, so (A) cannot pass against a parser that returns [] for everything.
  assert.strictEqual(riskBlockLines(fixture("7.0.977", null)), null,
    "NO BLOCK must be null, never [] -- `null` is 'there was nothing to grade' and `[]` is 'the " +
    "block was empty', and the first is NOT GRADED while the second is a malformed declaration");
  assert.deepStrictEqual(kickoffTaskParts(TASKS).sort(), ["T1", "T2", "T3"],
    "the parts come from the `**T<n>` markers TASKS already uses");
  assert.deepStrictEqual(kickoffTaskParts("**T1 -- a.** **T1 -- again.**"), ["T1"],
    "a task named twice is ONE part -- coverage counts parts, not mentions");
  assert.deepStrictEqual(kickoffStampVersion(stamp("7.0.977")), [7, 0, 977], "the stamp parses as a triple");
  assert.strictEqual(kickoffStampVersion("no stamp here"), null, "and an absent stamp is null, not a zero");
  assert.deepStrictEqual(RISK_BLOCK_FROM, [7, 0, 977],
    "the boundary is the version this clause shipped in -- moving it would re-grade the corpus");
}

// == (B) the spawned CLI, uncredentialed, on four temp fixtures ===================================
function theCliRefusesAndGreensOnTheRightSideOfTheStamp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt610-risk-"));
  const write = (name, text) => { const p = path.join(dir, name); fs.writeFileSync(p, text, "utf8"); return p; };
  // `--json` on purpose: `emit()` prints the PAYLOAD only with that flag, and the payload is what
  // the cycle routes on (`clause`, `risk_parts`, `risk_covered`, `risk_note`). Grading the prose
  // alone would pass against a clause that reached the right exit code with an empty payload.
  const run = p => {
    const env = { ...process.env };
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_KEY;
    const r = spawnSync(process.execPath, [VERIFIER, `--check-kickoff=${p}`, "--json"], { encoding: "utf8", env, cwd: ROOT });
    return { status: r.status, out: String(r.stdout || "") + String(r.stderr || "") };
  };

  try {
    const full = run(write("full.md", fixture("7.0.977", FULL)));
    assert.strictEqual(full.status, 0, `a full block must exit 0 at the CLI, got ${full.status}:\n${full.out}`);
    assert.ok(full.out.includes("risk: 3 of 3"),
      `and the green payload must carry the coverage note -- a green that says nothing about what it ` +
      `graded is the gate AGT-187 and 19v exist to stop. got:\n${full.out}`);

    const missing = run(write("missing.md", fixture("7.0.977", FULL.slice(0, 2))));
    assert.strictEqual(missing.status, 1, `an uncovered task must exit 1, got ${missing.status}:\n${missing.out}`);
    assert.ok(JSON.parse(missing.out.trim()).clause === RISK_CLAUSE,
      `the refusal payload must name clause "${RISK_CLAUSE}" so the cycle routes it to the Designer:\n${missing.out}`);
    assert.ok(missing.out.includes("T3") && missing.out.includes("2 of 3 covered"),
      `and name the task and the coverage:\n${missing.out}`);

    const short = run(write("short.md", fixture("7.0.977", ["T1 | f | revert", "T2 | g | h | i", "T3 | j | k | l"])));
    assert.strictEqual(short.status, 1, `a three-field line must exit 1, got ${short.status}:\n${short.out}`);

    const noBlockPath = write("noblock.md", fixture("7.0.977", null));
    const noBlock = run(noBlockPath);
    assert.strictEqual(noBlock.status, 1, `no block at v7.0.977 must exit 1, got ${noBlock.status}:\n${noBlock.out}`);

    // THE CONTROL THAT KEEPS THE CORPUS GREEN: the same bytes, restamped below the boundary.
    const old = run(write("old.md", fixture("7.0.448", null)));
    assert.strictEqual(old.status, 0,
      `the SAME no-block fixture restamped v7.0.448 must exit 0 -- every kickoff in the corpus ` +
      `predates the block, and refusing them would wedge runbook step 6. got ${old.status}:\n${old.out}`);
    assert.ok(/NOT GRADED \(AGT-610\)/.test(old.out),
      `and that green must declare what it did not grade (19v):\n${old.out}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// == (C) the shipped kickoff, graded by the tool it ships ========================================
function theShippedKickoffGradesItsOwnBlock() {
  const p = path.join(ROOT, SHIPPED_REL);
  assert.ok(fs.existsSync(p), `${SHIPPED_REL} must be committed -- it is this clause's first customer`);
  const text = fs.readFileSync(p, "utf8");
  const out = {};
  assert.strictEqual(kickoffRiskFinding(text, out), null,
    `${SHIPPED_REL} must pass its own clause`);
  assert.strictEqual(out.parts, out.covered,
    `every task in ${SHIPPED_REL} must carry a risk line (${out.covered} of ${out.parts})`);
  assert.ok(out.parts >= 8, `and it declares at least its 8 tasks, got ${out.parts}`);

  // THE CLI ARM RUNS OVER A COPY WITH THE `anchors` BLOCK STRIPPED, and that is a declared
  // deviation from the kickoff's own §T, taken for a reason the kickoff could not have known:
  // anchors are resolved against the TREE and are measured at runbook step 6, BEFORE the build. T4
  // of this very ticket rewrites one of the five literals this kickoff anchors
  // (`proposedProjects, victoria, stalls, waste } = facts;`), so from the moment the build lands,
  // `--check-kickoff` on this file refuses at the ANCHORS clause -- a clause that ran and was right.
  // A permanent suite asset that spawned the whole CLI here would be red forever (pattern:150:
  // tests are permanent assets). Stripping the anchors block puts that clause back on its own
  // NOT-GRADED escape (AGT-226) and leaves the RISK block exactly as shipped, which is what this
  // file grades. The uncovered/short/absent CLI paths are graded on fixtures in (B).
  const stripped = text.replace(/\n```anchors\n[\s\S]*?\n```\n/, "\n");
  assert.ok(!stripped.includes("```anchors") && stripped.includes("```" + RISK_CLAUSE),
    "CONTROL: the copy must have lost its anchors block and KEPT its risk block -- otherwise this " +
    "arm would be spawning the CLI over a file with no declaration in it at all");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt610-shipped-"));
  try {
    const copy = path.join(dir, "shipped-no-anchors.md");
    fs.writeFileSync(copy, stripped, "utf8");
    const env = { ...process.env };
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_KEY;
    const r = spawnSync(process.execPath, [VERIFIER, `--check-kickoff=${copy}`, "--json"], { encoding: "utf8", env, cwd: ROOT });
    const all = String(r.stdout || "") + String(r.stderr || "");
    assert.strictEqual(r.status, 0, `the CLI must exit 0 on the shipped risk block, got ${r.status}:\n${all}`);
    assert.ok(all.includes(`risk: ${out.covered} of ${out.parts} parts covered`),
      `and the green payload must carry this kickoff's own coverage note:\n${all}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export default async function run() {
  theHelperGradesCoverageAndNothingElse();              // (A)
  theCliRefusesAndGreensOnTheRightSideOfTheStamp();     // (B)
  theShippedKickoffGradesItsOwnBlock();                 // (C)

  console.log("  [AGT-610] the risk clause grades COVERAGE only: a full block greens with `risk: 3 of 3`, " +
    "an uncovered task refuses naming T3 and `2 of 3 covered`, a three-field line and a line naming no " +
    "task both refuse, `undo` keeps its own pipes, and the SAME no-block fixture refuses at v7.0.977 " +
    "while exiting 0 with the NOT GRADED note at v7.0.448 -- asserted through the spawned " +
    "uncredentialed CLI as well as the pure helper, and over this ticket's own shipped kickoff.");
}

selfRun(import.meta.url, run);
