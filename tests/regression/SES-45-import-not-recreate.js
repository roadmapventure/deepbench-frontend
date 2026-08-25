// DeepBench v7.0.257 | tests/regression/SES-45-import-not-recreate.js | SES-45
//
// Guards STANDARDS.md Section 4's opening rule: a test must assert against the REAL implementation;
// logic recreated inside the test file is not a test, it is a second implementation agreeing with
// itself.
//
// FOUND LIVE 2026-07-28 (S-LOG-91-design), and the specced test would have passed against the very
// bug it existed to prevent: LOG-91's Section 8 test rebuilt the merge rules as plain JS in the test
// file and asserted against its own recreation. It went green while the shipped logAgentTurn() did
// something different -- the SES-44 defect -- caught by diff review, not by the suite. SES-28 fixed
// tests that RUN nothing; this is the adjacent hole, a test that runs something that is not the
// subject.
//
// THIS FILE OBEYS ITS OWN RULE, which is the only honest way to ship it: it does not restate the
// rule and check its restatement. It READS docs/STANDARDS.md and asserts the shipped text, and it
// READS two of tonight's own regression files and asserts they really do reach their subjects
// rather than merely claiming to. If the rule text changed tomorrow, this notices; if either of
// those tests were rewritten into a recreation, this notices that too.
//
// THE HALF AN EDITOR WILL DELETE AS PEDANTIC: `resolves-the-pure-node-tension`. Section 4 opens with
// "Pure Node.js only -- no app imports", which reads as the opposite of this rule. It is not: that
// line governs the THROWAWAY session test, and it has never licensed recreating the subject. A
// version of this rule that does not say so gets "resolved" by the next reader deleting whichever
// half they met second.
//
// FILE-LEVEL NEGATIVE CONTROL, measured by the cycle that shipped it: against origin/dev's
// pre-change STANDARDS.md, all 5 doc clauses fail. The two live-file clauses pass on both, and are
// kept deliberately -- they guard a property tonight's tests already have, and a guard is allowed to
// protect load-bearing behaviour it did not author.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STANDARDS = path.join(ROOT, "docs/STANDARDS.md");
const HERE = path.join(ROOT, "tests/regression");

const START = "### The rule that outranks every category below";
const END = "### Test Categories";

export function extractRule(md) {
  const a = md.indexOf(START);
  if (a < 0) return "";
  const b = md.indexOf(END, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export const norm = s => s.replace(/\s+/g, " ");

export const CLAUSES = [
  {
    id: "states-the-rule",
    detail: "the block must say a test asserts against the REAL implementation and that recreated " +
            "logic is not a test -- the rule itself, in one sentence a reader cannot miss",
    test: s => /REAL implementation/i.test(s) && /recreated .{0,40}is not a test|is not a test/i.test(s),
    breaks: s => s.replace(/REAL implementation/gi, "expected behaviour"),
  },
  {
    id: "carries-the-incident",
    detail: "the rule must be attributed to LOG-91 / SES-44 -- an unattributed rule reads as taste " +
            "and gets traded away by the next reader who finds it inconvenient",
    test: s => /LOG-91/.test(s) && /SES-44/.test(s) && /diff review/i.test(s),
    breaks: s => s.replace(/LOG-91/g, "an earlier session"),
  },
  {
    id: "resolves-the-pure-node-tension",
    detail: "the block must reconcile Section 4's 'Pure Node.js only -- no app imports' with this " +
            "rule by scoping that line to the THROWAWAY session test -- otherwise the next reader " +
            "deletes whichever half they met second",
    test: s => /Pure Node\.js only/.test(s) && /throwaway session test/i.test(s),
    breaks: s => s.replace(/throwaway session test/gi, "test"),
  },
  {
    id: "names-the-three-legitimate-shapes",
    detail: "import it / read the shipped file / seam proof -- a rule that only forbids leaves the " +
            "reader with no sanctioned way to test code they cannot import, so they recreate it",
    test: s => /Import it/i.test(s) && /Read the shipped file/i.test(s) && /Seam proof/i.test(s),
    // `replace_all`, not a single replace: the block names the seam proof TWICE (once as a shape,
    // once in the labelling instruction), so a first-occurrence control left the clause passing.
    // Caught by this file's own has-no-teeth assertion, which is the third time tonight that
    // checking the controls found a defect in the guard rather than in the subject.
    breaks: s => s.replace(/seam proof/gi, "something else"),
  },
  {
    id: "not-run-beats-recreation",
    detail: "the block must say a NOT RUN declaration beats a recreation -- without it, a cycle " +
            "that cannot reach its subject reaches for a copy instead of declaring the gap",
    test: s => /NOT RUN/i.test(s) && /notRun\(/.test(s) && /false green/i.test(s),
    breaks: s => s.replace(/false green/i, "a small compromise"),
  },
];

// The two live-file clauses. These assert BEHAVIOUR of shipped tests, not prose -- this file
// practising the rule it guards.
export function tonightsTestsReachTheirSubjects() {
  const out = {};

  const ses208 = fs.readFileSync(path.join(HERE, "SES-208-briefing-escaping.js"), "utf8");
  // It must SLICE the shipped template and RUN what it sliced, never define its own esc().
  out.ses208_reads_shipped =
    /briefing-template\.html/.test(ses208) &&
    /sliceFunction\(/.test(ses208) &&
    /new Function\(/.test(ses208) &&
    !/^\s*function esc\s*\(/m.test(ses208);

  const ses135 = fs.readFileSync(path.join(HERE, "SES-135-briefing-render.js"), "utf8");
  // It must BUILD the page with the shipped builder, never read a checked-in snapshot.
  out.ses135_builds_real =
    /build-briefing\.mjs/.test(ses135) &&
    /spawnSync/.test(ses135) &&
    !/fixtures?\/.*\.html/.test(ses135);

  return out;
}

export default async function run() {
  const md = fs.readFileSync(STANDARDS, "utf8");
  const block = norm(extractRule(md));

  assert.ok(block.length > 0,
    "SES-45: STANDARDS.md Section 4's import-not-recreate rule is missing -- the anchor moved, so " +
    "this guard is checking nothing");

  for (const c of CLAUSES) {
    assert.ok(c.test(block), `SES-45 clause '${c.id}' FAILED: ${c.detail}`);
    const mutated = c.breaks(block);
    assert.notStrictEqual(mutated, block,
      `SES-45 control for '${c.id}' is VACUOUS -- it changed nothing, so it proves nothing`);
    assert.ok(!c.test(mutated),
      `SES-45 control for '${c.id}' has no teeth -- the clause still passes with its subject removed`);
  }

  const live = tonightsTestsReachTheirSubjects();
  assert.ok(live.ses208_reads_shipped,
    "SES-45: SES-208-briefing-escaping.js no longer slices and runs the SHIPPED template -- if it " +
    "now defines its own esc(), it is asserting about a copy and this rule is being broken by one " +
    "of its own examples");
  assert.ok(live.ses135_builds_real,
    "SES-45: SES-135-briefing-render.js no longer builds the page with the shipped builder -- a " +
    "render test reading a checked-in snapshot passes forever while the builder rots");

  return true;
}

selfRun(import.meta.url, run);
