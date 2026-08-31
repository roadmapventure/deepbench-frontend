// DeepBench v7.0.348 | tests/regression/SES-244-briefing-bridge-contract.js | SES-244
//
// Guards John's briefing-republish BRIDGE (directive 27b5d8cb, attended architect session
// 2026-08-31, his word verbatim "b with the bridge") in BOTH files that carry the republish
// instruction: docs/runbooks/runner-cycle.md step 9 and docs/runbooks/briefing-page.md
// regeneration step 2.
//
// WHY BOTH FILES, and why that is the whole point rather than thoroughness: until v7.0.348 step 9
// said the republish is mandatory and "a cycle must never end without it", while 27b5d8cb forbids
// an unattended cycle making it. Both were law and they were directly opposed, so every cycle
// after 2026-08-31T16:16Z reconciled the pair by hand -- the one-fact-two-homes defect this
// platform has already paid for at SES-116, SES-113 and SES-86 phase 3. Reconciling ONE of the two
// files is how they drift, which is the failure both files already warn about ("so these two files
// cannot drift the way step 5 and step 7 did before v7.0.114"). So a clause missing from either
// file fails here.
//
// THE RULE IS READ OUT OF THE DOCS, never restated here (John's rule 2026-08-23, "you should never
// be throwing away tests"; the SES-136 / SES-158 / SES-176 precedent). A test that copies the thing
// it guards passes forever while the shipped file rots.
//
// TWO LAYERS OF CONTROL, because each catches a different way this test could be worthless:
//   1. PER-CLAUSE controls (everyClauseHasTeeth) -- mutate the shipped text to remove exactly the
//      thing a clause checks and assert the clause then FAILS. Plus the SES-158 meta-assertion,
//      because that ticket shipped a control that changed nothing and only a checked control
//      caught it.
//   2. A FILE-LEVEL NEGATIVE CONTROL (theSameAssertionsFailOnOriginDev) -- run the identical clause
//      set against origin/dev's copies of both files. They MUST fail there. This is the clause that
//      answers "would this test still pass if the change did nothing?" with a measurement instead
//      of a promise: a presence-only test passes vacuously on any file containing the word
//      "republish". It is declared not-run rather than passing vacuously when git or the ref is
//      unavailable (a fresh shallow clone), because a control that silently no-ops is the SES-158
//      failure wearing a different hat.
//
// THE CLAUSE THIS FILE EXISTS FOR is `no-unattended-publish` in runner-cycle.md. An editor
// "restoring" step 9's unconditional republish -- which reads like repairing a weakened rule --
// re-arms the contradiction and sends the next unattended cycle at the publish guard, whose own
// message names its remedy as reading the served page out of ~/.claude/.../tool-results/. That is
// register B39's gate: measured parks of ~8h05m, ~9h20m, and one that never returned, every
// clearance happening only while John was at his desk, and his standing word on his clearing one is
// "That should not be happening" (34865f07). `gate-not-entered` is its twin and is load-bearing in
// the other direction: the bridge must not be written in a way that leaves the gate as a fallback.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied (the SES-180 (b) convention): that an
// unattended publish is actually refused. Observing that needs an attempted publish to John's live
// briefing URL, which 27b5d8cb forbids -- so the refusal is unobservable from an unattended cycle by
// construction, and this file asserts the CONTRACT, never the platform behaviour. The measurement
// behind the prose (473.1 KB / 2302 lines, and the guard's own "counts as viewed only once you have
// Read every line of that file") is on SES-244's ship card.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const CYCLE_REL = "docs/runbooks/runner-cycle.md";
const PAGE_REL = "docs/runbooks/briefing-page.md";

// Bounded slices, so a clause cannot be satisfied by unrelated prose elsewhere in a 2900-line file.
const CYCLE_START = "**THE BRIDGE — AN UNATTENDED CYCLE BUILDS THE PAGE AND DOES NOT PUBLISH IT";
const CYCLE_END = "**THE SERIAL TAIL (register B42)";
const PAGE_START = "**FIRST, THE BRIDGE: THIS STEP IS NOT AN UNATTENDED CYCLE'S TO RUN";
const PAGE_END = "5. **AFTER the republish returns";

// Pure: slice a bounded block out of a doc. Returns "" when absent -- itself a finding rather than
// a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// Pure: the load-bearing clauses, kept as data so a control can name exactly which one it removed.
// A clause earns its place only if REMOVING it would change what a cycle does.
export const CLAUSES = {
  [CYCLE_REL]: {
    start: CYCLE_START,
    end: CYCLE_END,
    clauses: [
      {
        id: "no-unattended-publish",
        detail:
          "THE CLAUSE THIS FILE EXISTS FOR: step 9 must say an unattended cycle does NOT publish. "
          + "Without it the step's mandatory republish stands against directive 27b5d8cb and every "
          + "cycle reconciles two opposed laws by hand -- or worse, obeys the older one",
        test: s => /unattended.{0,80}(does not publish|publishes nothing|stops there)/is.test(s),
        breaks: s => s.replace(/publishes nothing, and it \*\*must NOT\*\* re-file/g, "publishes, and re-files")
          .replace(/does not publish/gi, "publishes")
          .replace(/stops there/gi, "publishes"),
      },
      {
        id: "attended-session-is-the-publisher",
        detail:
          "the bridge is only a bridge because somebody still publishes -- naming the ATTENDED "
          + "session as that somebody is what stops a reader concluding the page is simply abandoned",
        test: s => /attended.{0,60}session.{0,80}republish/is.test(s),
        breaks: s => s.replace(/attended/gi, "some"),
      },
      {
        id: "gate-not-entered",
        detail:
          "the bridge must forbid satisfying the publish guard by reading the served page out of "
          + "the permission-gated tool-results path. Without this the guard's own message ('counts "
          + "as viewed only once you have Read every line') reads as an instruction, and register "
          + "B39's unbounded park is the cost",
        test: s => /tool-results/.test(s) && /B39/.test(s),
        breaks: s => s.replace(/tool-results/g, "some path"),
      },
      {
        id: "do-not-re-file",
        detail:
          "John's ruling explicitly says the publish failure is not a defect to re-file. Without "
          + "this a cycle files a fourth ticket for a defect SES-244/SES-257 already carry, onto a "
          + "board whose bottleneck is already his reading",
        test: s => /re-file/i.test(s),
        breaks: s => s.replace(/re-file/gi, "record"),
      },
      {
        id: "shrinking-is-refused-with-numbers",
        detail:
          "the tempting wrong fix is shrinking the page. The refusal must carry the MEASUREMENT "
          + "(every observed size already on the file-save branch, so the inline threshold is below "
          + "198.3 KB and unlocated) -- an unevidenced 'do not shrink' is a story a later cycle "
          + "will re-litigate",
        test: s => /198\.3/.test(s) && /per-conversation/i.test(s),
        breaks: s => s.replace(/198\.3/g, "some"),
      },
      {
        id: "durable-fix-is-b-and-a-is-rejected",
        detail:
          "John rejected option (a), a standing permission on the gated path. A bridge that did not "
          + "record the rejection invites the next cycle to propose it as the obvious shortcut",
        test: s => /REJECTED/.test(s) && /pure render of the\s+database/is.test(s),
        breaks: s => s.replace(/REJECTED/g, "available"),
      },
    ],
  },
  [PAGE_REL]: {
    start: PAGE_START,
    end: PAGE_END,
    clauses: [
      {
        id: "page-doc-carries-the-bridge",
        detail:
          "regeneration step 2 is the OTHER home of the republish instruction. A cycle that reaches "
          + "step 2 without the bridge publishes, because that is exactly what step 2 tells it to do",
        test: s => /unattended cycle/i.test(s) && /publishes nothing/i.test(s),
        breaks: s => s.replace(/publishes nothing/gi, "publishes"),
      },
      {
        id: "cites-rather-than-restates",
        detail:
          "the clause must CITE runner-cycle.md rather than restate the rule -- two prose copies of "
          + "one rule is the drift both files already warn about (step 5 / step 7 before v7.0.114)",
        test: s => /runner-cycle\.md/.test(s) && /cited here, not restated/i.test(s),
        breaks: s => s.replace(/cited here, not restated/gi, "restated here"),
      },
      {
        id: "names-the-directive",
        detail:
          "the ruling's id must be present so a later reader can check the source rather than trust "
          + "the paraphrase -- and so a cycle can tell a standing ruling from a cycle's own opinion",
        test: s => /27b5d8cb/.test(s),
        breaks: s => s.replace(/27b5d8cb/g, "a directive"),
      },
    ],
  },
};

function blockFrom(text, spec, where) {
  const block = extractBlock(text, spec.start, spec.end);
  assert.ok(block, `${where} no longer carries the bridge block (looked for "${spec.start}")`);
  return block;
}

function readShipped(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function theShippedContractIsClean() {
  for (const [rel, spec] of Object.entries(CLAUSES)) {
    const block = blockFrom(readShipped(rel), spec, rel);
    for (const c of spec.clauses) {
      assert.ok(c.test(block), `${rel} fails bridge clause "${c.id}": ${c.detail}`);
    }
  }
}

function everyClauseHasTeeth() {
  for (const [rel, spec] of Object.entries(CLAUSES)) {
    const block = blockFrom(readShipped(rel), spec, rel);
    for (const c of spec.clauses) {
      const mutated = c.breaks(block);
      assert.notStrictEqual(mutated, block,
        `control for "${c.id}" (${rel}) changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`);
      assert.ok(!c.test(mutated),
        `clause "${c.id}" (${rel}) still passes after its own control removed the thing it checks -- the check is vacuous`);
    }
  }
}

// META-ASSERTION: prove the control-checking above can actually fail. Without this, a future clause
// whose `breaks` is a no-op sails through everyClauseHasTeeth's first assert only because nobody
// ever exercised the failure path.
function aVacuousMutationFailsItsOwnControl() {
  const block = blockFrom(readShipped(CYCLE_REL), CLAUSES[CYCLE_REL], CYCLE_REL);
  assert.throws(
    () => assert.notStrictEqual(block, block, "control changed NOTHING"),
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// THE FILE-LEVEL NEGATIVE CONTROL. The same clause set, run against origin/dev's copies of both
// files: they MUST fail there, or this whole file proves nothing about the change that shipped.
function theSameAssertionsFailOnOriginDev() {
  let before;
  try {
    before = Object.fromEntries(Object.keys(CLAUSES).map(rel => [
      rel,
      execFileSync("git", ["show", `origin/dev:${rel}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }),
    ]));
  } catch {
    notRun(
      "the file-level negative control against origin/dev",
      "git or the origin/dev ref is not available here (a shallow clone, or a checkout with no "
      + "remote). The per-clause controls above still ran and still have teeth; this arm is declared "
      + "not-run rather than passed, because a control that silently no-ops is the SES-158 failure.",
    );
    return;
  }

  const proof = [];
  for (const [rel, spec] of Object.entries(CLAUSES)) {
    const block = extractBlock(before[rel], spec.start, spec.end);
    if (!block) {
      // The strongest possible failure: the pre-change file carries no bridge block at all. This is
      // ASSERTED as the control's result, never skipped -- a `continue` here would make the whole
      // arm pass while checking nothing, which is the SES-158 vacuous-control failure this file's
      // own header names.
      proof.push(`${rel}: no bridge block on origin/dev at all`);
      continue;
    }
    const failures = spec.clauses.filter(c => !c.test(block));
    assert.ok(failures.length > 0,
      `origin/dev's ${rel} already satisfies EVERY bridge clause, so this test cannot distinguish `
      + `the shipped change from its predecessor. If this ship has since merged to dev, re-point the `
      + `control at the pre-change commit rather than deleting it.`);
    proof.push(`${rel}: ${failures.length}/${spec.clauses.length} clauses fail on origin/dev `
      + `(${failures.map(f => f.id).join(", ")})`);
  }

  // The control must have produced a positive result for EVERY guarded file. Without this, a file
  // silently dropped from CLAUSES -- or a `continue` added later -- leaves the arm reporting
  // success on an empty loop.
  assert.strictEqual(proof.length, Object.keys(CLAUSES).length,
    `the negative control produced ${proof.length} result(s) for ${Object.keys(CLAUSES).length} `
    + `guarded file(s); it must prove the difference for every one of them, not skip any`);
  return proof;
}

// The bridge is only correct while John's ruling stands. If the durable (b) fix ships and the
// directive is closed, this contract should be REVISITED rather than silently kept -- so the file
// says so where a later reader will find it, instead of leaving a stale rule enforced by a test.
function theRulingIsNamedSoItCanBeRetired() {
  const cycle = readShipped(CYCLE_REL);
  assert.ok(/27b5d8cb/.test(cycle),
    `${CYCLE_REL} no longer names directive 27b5d8cb. The bridge is John's standing ruling and is `
    + `meant to lapse when the durable (b) fix ships -- an unattributed rule cannot be retired, only `
    + `argued about.`);
}

function run() {
  theShippedContractIsClean();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  theRulingIsNamedSoItCanBeRetired();

  const proof = theSameAssertionsFailOnOriginDev();
  if (proof) console.log("         [CONTROL] " + proof.join(" | "));

  notRun(
    "an actual unattended publish proven refused",
    "observing the refusal requires attempting a publish to John's live briefing URL, which "
    + "directive 27b5d8cb forbids an unattended cycle from doing -- so it is unobservable from here "
    + "by construction. This file asserts the CONTRACT, never the platform behaviour; the "
    + "measurement (473.1 KB / 2302 lines, and the guard's own \"counts as viewed only once you have "
    + "Read every line of that file\") is on SES-244's ship card.",
  );
}

selfRun(import.meta.url, run);
export default run;
