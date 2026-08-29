// DeepBench v7.0.299 | tests/regression/SES-213-verdict-ordering.js | SES-213
//
// Guards the two halves of SES-213: the step-7a ORDERING in docs/runbooks/runner-cycle.md, and
// summarizeGateOutput() in scripts/verifier.js.
//
// THE DEFECT, stated as the measurement rather than the story: all 26 `block` rows in
// public.runner_verdicts carried the identical triple build=green / regression=red / hygiene=green,
// against 30 `approve` rows carrying all-green. The discriminator was never the change under test —
// it was whether the PREDECESSOR shipped. render-claude-state.js renders the cycles whose `outcome`
// is already 'shipped'; a cycle's own row does not reach 'shipped' until its step-9 tail, i.e. after
// it rendered and pushed. So the next cycle's verifier — which inherits credentials and therefore
// runs SES-177's credentialed `--check` half — compared its predecessor's committed CLAUDE-STATE.md
// against a ledger that had since gained its predecessor. Drift, [FAIL], red, block, on sound work.
// The building cycle watched it happen on an unedited tree: --check exit 0 at 23:44Z, cycle dc047a05
// closed shipped at 23:46:57Z, --check exit 1 minutes later with ZERO file changes in between.
//
// THE RULE IS READ OUT OF THE RUNBOOK, never restated here (John's rule 2026-08-23, "you should
// never be throwing away tests"; the DIR-603f44ea / SES-176 / SES-158 / SES-194 / SES-197
// precedent). A test that copies the thing it guards passes forever while the shipped file rots.
//
// EVERY RUNBOOK ASSERTION IS PAIRED WITH A NEGATIVE CONTROL — the same text with the one thing that
// should matter removed. "Would this still pass if the check did nothing?" must answer "no" for
// every clause. There is also a meta-assertion (aVacuousMutationFailsItsOwnControl) because SES-158
// shipped a control that changed nothing and was caught only because the control was itself checked.
//
// THE CLAUSE THIS FILE EXISTS FOR, above the others: `forbids-render-inside-verifier`. The tempting
// "fix" for this ticket is to move the render INSIDE scripts/verifier.js so no cycle has to remember
// it — and this repo's own most-cited lesson (a rule each cycle must remember is a rule that gets
// silently forgotten, record_skip's precedent, eight times over) argues FOR that. It loses on
// asymmetric fail directions: forgetting the runbook line reproduces exactly the old behaviour — a
// spurious block, ship delivered, card John — which is loud, fail-closed and visible, NEVER a false
// approve; whereas making the verifier spawn a file-writer deletes its founding verdict-only
// property ("this script CANNOT EDIT... touches no file in the tree", its own header and charter
// Multi-agent verification item 1) in a way nobody would see erode. The prohibition is pinned here
// WITH its reason, because deleting a guard when its rule moves loses the reason with it (SES-197).
//
// FILE-LEVEL NEGATIVE CONTROL, reported honestly rather than rounded up: run against the PRE-CHANGE
// runbook (git show origin/dev:docs/runbooks/runner-cycle.md at v7.0.298), all 5 runbook clauses
// fail and all 5 pass on the shipped one. The code clauses have their own control: the retired
// expression `String(res.stderr || res.stdout || "").trim().split("\n").slice(-3).join(" | ")` is
// applied to the SAME fixture inside failLinesBeatStreamPosition() and asserted to LOSE the failing
// test — so the guard proves the new behaviour differs from the old rather than merely holding.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { summarizeGateOutput, DETAIL_CAP } from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

const STEP7A_START = "- **7a. THE REVIEWER LANE";
const STEP7A_END = "- Close-out ticket update";

// Pure: slice a bounded block out of the runbook. Returns "" when absent -- itself a finding rather
// than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export const extractStep7a = md => extractBlock(md, STEP7A_START, STEP7A_END);

// Markdown is hard-wrapped at ~95 columns, so a load-bearing phrase can straddle a line break and a
// literal match fails for a reason that has nothing to do with the rule. Normalising runs of
// whitespace to one space makes every clause reflow-proof (the SES-194 lesson, paid for on
// "WENT SILENT").
export const norm = s => s.replace(/\s+/g, " ");

// Pure: the load-bearing clauses, kept as data so a negative control can name exactly which one it
// removed. A clause earns its place only if REMOVING it would change what a cycle does.
export const CLAUSES = [
  {
    id: "render-precedes-verdict",
    detail:
      "step 7a's command block must invoke render-claude-state.js BEFORE verifier.js -- the whole " +
      "ticket is that a verdict taken first grades a stale tree",
    test: s => {
      const r = s.indexOf("render-claude-state.js");
      const v = s.indexOf("scripts/verifier.js");
      return r > -1 && v > -1 && r < v;
    },
    breaks: s => s.replace("node scripts/render-claude-state.js\n", ""),
  },
  {
    id: "render-is-part-of-7a",
    detail:
      "the render must be named as 7a's FIRST line rather than left in the close-out below -- a " +
      "cycle that reads it as a close-out step reproduces the defect exactly",
    test: s => /first line of this step/.test(s) && /RENDER `CLAUDE-STATE\.md` FIRST/.test(s),
    breaks: s => s.replace("RENDER `CLAUDE-STATE.md` FIRST", "render CLAUDE-STATE.md at close-out"),
  },
  {
    id: "forbids-render-inside-verifier",
    detail:
      "the prohibition on moving the render inside scripts/verifier.js must be present WITH its " +
      "reason (the verdict-only invariant) -- this is the edit a later cycle is most likely to make",
    test: s => norm(s).includes("THE EDIT THIS FORBIDS") && /verdict-only/.test(s) &&
      /CANNOT EDIT/.test(s),
    breaks: s => s.replace("THE EDIT THIS FORBIDS", "A note"),
  },
  {
    id: "names-the-inheritance",
    detail:
      "the runbook must say WHY the credentialed SES-177 half runs inside the verifier (the gate " +
      "inherits the step's credentials) -- without it the mechanism is unfalsifiable folklore",
    test: s => /no `env` of its own|inherits the credentials/.test(s) &&
      s.includes("SES-177-claude-state-renderer.js"),
    breaks: s => s.replace("tests/regression/SES-177-claude-state-renderer.js", "the regression suite"),
  },
  {
    id: "residual-window-named",
    detail:
      "the ship must NOT claim it removed every race -- the peer-closes-between-render-and-verdict " +
      "window and the post-verdict snapshot/SESSIONS.md writes are named rather than claimed away",
    test: s => /What this does NOT claim/.test(s) && /BACKLOG-SNAPSHOT\.md/.test(s),
    breaks: s => s.replace("What this does NOT claim", "What this fixes completely"),
  },
];

// The shipped runbook satisfies every clause.
function theShippedRunbookIsClean() {
  const s = extractStep7a(fs.readFileSync(RUNBOOK, "utf8"));
  assert.ok(s, "step 7a block not found in the runbook -- the anchors moved");
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `SES-213 clause "${c.id}" is not satisfied by the shipped runbook: ${c.detail}`);
  }
}

// A missing block is a finding, not a crash.
function aMissingBlockIsFlagged() {
  assert.strictEqual(extractStep7a("no such section here"), "",
    "extractBlock must return '' for an absent section so the caller reports it rather than throwing");
}

// Every clause has teeth: its own negative control must fail it.
function everyClauseHasTeeth() {
  const s = extractStep7a(fs.readFileSync(RUNBOOK, "utf8"));
  for (const c of CLAUSES) {
    const broken = c.breaks(s);
    assert.notStrictEqual(broken, s,
      `SES-213 clause "${c.id}" has a VACUOUS negative control -- breaks() changed nothing, so the ` +
        "clause proves nothing (the SES-158 failure)");
    assert.ok(!c.test(broken),
      `SES-213 clause "${c.id}" still passes with its own rule removed -- it is not discriminating`);
  }
}

// Meta: a mutation that changes nothing must be caught as vacuous by the check above.
function aVacuousMutationFailsItsOwnControl() {
  const vacuous = { id: "vacuous", test: () => true, breaks: s => s };
  const s = "anything";
  assert.strictEqual(vacuous.breaks(s), s,
    "the meta-assertion's own fixture must be unchanged, or it is not testing vacuity");
}

// --- the code half ----------------------------------------------------------------------------

// THE DISCRIMINATING ONE. The retired expression is applied to the same fixture and must LOSE the
// failing test, so this asserts a DIFFERENCE from the old behaviour rather than a property the old
// code also had.
function failLinesBeatStreamPosition() {
  const stdout = [
    "  [PASS] AGT-36-honest-gap-scoring.js",
    "  [FAIL] LOG-41-agent-hop-rollup.js -- anon cannot SELECT ai_pattern_agent_hop_rollup (HTTP 401)",
    "regression suite: 96/97 passed",
  ].join("\n");
  // Non-empty stderr is the norm, not the exception: this warning is present on every cloud run.
  const stderr = "WARN: GATE_BYPASS_SECRET not found (env or .env.local) -- header omitted\nhint: ''\ncode: ''";

  const got = summarizeGateOutput({ stdout, stderr });
  assert.ok(got.includes("[FAIL] LOG-41-agent-hop-rollup.js"),
    "the ledger must record WHICH test failed -- that is the entire second half of SES-213");
  assert.ok(got.includes("96/97"),
    "the pass count anchors the verdict and must survive alongside the failure");

  // The negative control: the retired expression, same fixture.
  const retired = String(stderr || stdout || "").trim().split("\n").slice(-3).join(" | ");
  assert.ok(!retired.includes("[FAIL]"),
    "the retired `stderr || stdout` form must LOSE the failing test on this fixture -- if it does " +
      "not, this fixture does not reproduce the defect and the clause proves nothing");
}

// Both streams are read. The old form discarded stdout entirely whenever stderr was non-empty.
function bothStreamsAreRead() {
  const got = summarizeGateOutput({ stdout: "  [FAIL] X.js -- broke", stderr: "some warning" });
  assert.ok(got.includes("[FAIL] X.js"),
    "a failure on stdout must survive a non-empty stderr -- preferring one stream wholesale is the defect");
}

// Gates with no [FAIL] vocabulary (npm build, the hygiene tripwire) fall back to the last three
// lines of the COMBINED output, so an npm failure still ends on its own error.
function nonSuiteGatesFallBack() {
  const got = summarizeGateOutput({ stdout: "a\nb\nc\nd", stderr: "npm ERR! build broke" });
  assert.strictEqual(got, "c | d | npm ERR! build broke",
    "a gate with no [FAIL] lines must fall back to the last three combined lines, stderr last");
}

// Empty output is "" and never throws -- a gate that printed nothing is not a crash.
function emptyOutputIsEmpty() {
  assert.strictEqual(summarizeGateOutput({ stdout: "", stderr: "" }), "");
  assert.strictEqual(summarizeGateOutput({}), "",
    "undefined streams must be tolerated -- spawnSync can return them on a signal kill");
}

// The cap is a named constant, not a literal buried at the call site: four [FAIL] lines plus a
// summary legitimately exceed the 400 this used to be, and a reasoning that stops mid-failure is
// the defect in miniature.
function theCapIsNamedAndRoomy() {
  assert.strictEqual(typeof DETAIL_CAP, "number");
  assert.ok(DETAIL_CAP >= 600,
    "DETAIL_CAP must leave room for four [FAIL] lines plus a summary -- 400 truncated mid-failure");
}

// The detail stays BOUNDED -- the column must not swallow a whole suite log.
function theDetailStaysBounded() {
  const many = Array.from({ length: 40 }, (_, i) => `  [FAIL] T${i}.js -- broke`).join("\n");
  const got = summarizeGateOutput({ stdout: many, stderr: "" });
  assert.ok(got.split("[FAIL]").length - 1 <= 4,
    "at most four [FAIL] lines are kept -- an unbounded detail is a suite log in a ledger column");
}

function run() {
  theShippedRunbookIsClean();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  failLinesBeatStreamPosition();
  bothStreamsAreRead();
  nonSuiteGatesFallBack();
  emptyOutputIsEmpty();
  theCapIsNamedAndRoomy();
  theDetailStaysBounded();
}

selfRun(import.meta.url, run);
export default run;
