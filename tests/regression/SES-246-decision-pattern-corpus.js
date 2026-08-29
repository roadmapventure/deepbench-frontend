// DeepBench v7.0.328 | tests/regression/SES-246-decision-pattern-corpus.js | SES-246
//
// FEATURE: the decision-pattern ship gate reads docs/SESSIONS.md's OWN ARCHIVED HALF.
//
// THE DEFECT, measured on an unedited origin/dev@3864a154 rather than recalled from the ticket:
// scripts/check-decision-pattern-quotes.js exited 1 with 60 ungrounded quotes across criteria
// 6-137, and NOTHING in this suite ran it -- the doc's own footer calls it "the ship gate; run it
// after any edit here", so it was a gate only in the sense that a human is told to run it by hand.
// Root cause is not fabrication: commit 0de0ea57 (v7.0.213, "SESSIONS.md rotated") moved the
// pre-2026-06-07 history into docs/SESSIONS-ARCHIVE-2026-0607.md AFTER SES-79 and SES-90 cited
// those passages, and CORPORA was never updated with it. 55 of the 60 live in that file; 2 more
// resolve through the gate's existing inner-kernel fallback once it is readable. 60 -> 3.
//
// WHAT THIS GUARDS, and why each clause rather than one "exit 0":
//
//   1. The archive is in the corpus, BY PATTERN. A literal second path would fix today and lose
//      the next rotation the same way. Asserted behaviourally -- a quote that exists ONLY in the
//      archive must ground -- never by grepping the script for a filename, which would pass on a
//      line that was commented out.
//
//   2. THE CORPUS DID NOT WIDEN INTO SELF-GROUNDING, and this is the clause that matters most.
//      The tempting version of this fix is "read every .md under docs/". That admits
//      JOHN-DECISION-PATTERNS.md itself, and then EVERY quote grounds trivially in the file that
//      wrote it -- the gate exits 0 forever while checking nothing. This is not hypothetical: the
//      cycle that shipped this fix had its own first diagnostic report "all 60 findable in the
//      repo" because it counted the doc as a hit, and the real answer was 57. A fabricated quote
//      is planted in the doc and must still FAIL.
//
//   3. The residue is exactly the three criterion-137 quotes, and they are still RED. They exist
//      nowhere in the repo but the doc citing them, so the honest state is a failing gate and a
//      question to John -- not a manufactured harvest. Asserting the identity of the residue
//      (rather than its count) means this test fails loudly if the set changes in either
//      direction: someone grounding them, or a new ungrounded quote arriving.
//
// No network, no credentials. Corpora are symlinked into the fixture trees, never copied.

import assert from "assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const DOCS = path.join(REPO, "docs");
const GATE = path.join(REPO, "scripts", "check-decision-pattern-quotes.js");
const ARCHIVE = "SESSIONS-ARCHIVE-2026-0607.md";

// The known residue after the corpus fix: three quotes on criterion 137 (p1p3-now-review,
// v7.0.136) that exist nowhere in this repository outside the entry that cites them.
const RESIDUE = [137, 137, 137];

function runGate(repoRoot) {
  return spawnSync(process.execPath, [GATE, "--repo", repoRoot], { encoding: "utf8" });
}

function missed(res) {
  return [...`${res.stdout}\n${res.stderr}`.matchAll(/^\s*#(\d+):/gm)].map((m) => Number(m[1]));
}

// Build a minimal tree the gate accepts: a doc plus whichever corpora we choose to expose.
function fixture({ doc, withArchive = true, extraDocs = [] }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ses246-"));
  const d = path.join(tmp, "docs");
  fs.mkdirSync(path.join(d, "harvests"), { recursive: true });
  fs.writeFileSync(path.join(d, "JOHN-DECISION-PATTERNS.md"), doc);
  for (const f of ["SESSIONS.md", "FEATURES-ARCHIVE.md"]) {
    fs.symlinkSync(path.join(DOCS, f), path.join(d, f));
  }
  if (withArchive) fs.symlinkSync(path.join(DOCS, ARCHIVE), path.join(d, ARCHIVE));
  for (const f of fs.readdirSync(path.join(DOCS, "harvests"))) {
    if (f.endsWith(".md")) fs.symlinkSync(path.join(DOCS, "harvests", f), path.join(d, "harvests", f));
  }
  for (const [name, body] of extraDocs) fs.writeFileSync(path.join(d, name), body);
  return tmp;
}

// A quote that lives ONLY in the archive -- read out of the archive itself so the fixture cannot
// drift from the real file, and asserted absent from the other two corpora before it is used.
function anArchiveOnlyQuote() {
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const archive = norm(fs.readFileSync(path.join(DOCS, ARCHIVE), "utf8"));
  const others = ["SESSIONS.md", "FEATURES-ARCHIVE.md"]
    .map((f) => norm(fs.readFileSync(path.join(DOCS, f), "utf8")));
  for (const line of fs.readFileSync(path.join(DOCS, ARCHIVE), "utf8").split("\n")) {
    const s = norm(line);
    if (s.length < 60 || s.length > 140) continue;
    if (/["“”]/.test(s)) continue;                      // keep the fixture's own quoting clean
    if (!archive.includes(s)) continue;
    if (others.some((o) => o.includes(s))) continue;
    return s;
  }
  throw new Error("no archive-only line found to build the fixture from");
}

const entry = (n, quote) =>
  `## Mechanism and architecture\n\n**${n}. A fixture criterion.** Body. *Seen in:* an exchange — "${quote}".\n`;

// ---------------------------------------------------------------------------
// 1. A quote that lives only in the archive now grounds
// ---------------------------------------------------------------------------
function theArchiveIsInTheCorpus() {
  const q = anArchiveOnlyQuote();
  const withIt = fixture({ doc: entry(900, q), withArchive: true });
  const without = fixture({ doc: entry(900, q), withArchive: false });
  try {
    assert.strictEqual(missed(runGate(withIt)).length, 0, `an archive-only quote did not ground: "${q}"`);
    // The negative control IS the pre-change corpus list: same quote, archive removed.
    assert.deepStrictEqual(
      missed(runGate(without)),
      [900],
      "with the archive removed the quote still grounds -- the fixture is not testing the corpus",
    );
  } finally {
    fs.rmSync(withIt, { recursive: true, force: true });
    fs.rmSync(without, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// 2. The corpus did NOT widen into self-grounding
// ---------------------------------------------------------------------------
function aFabricatedQuoteStillFails() {
  const invented = "this sentence was invented by a regression test and John never said it";
  const tmp = fixture({
    doc: entry(901, invented),
    // A decoy in docs/ that is NOT session history: if the corpus ever widens to "every .md
    // under docs/", this file grounds the fabrication and the clause fails, which is the point.
    extraDocs: [["DECOY-NOT-A-CORPUS.md", `# decoy\n\n${invented}\n`]],
  });
  try {
    assert.deepStrictEqual(
      missed(runGate(tmp)),
      [901],
      "a fabricated quote grounded -- the corpus has widened past session history and the gate is now vacuous",
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function theDocCannotGroundItself() {
  // The self-match trap, asserted directly: the entry's own text contains the quote, so a corpus
  // that admitted JOHN-DECISION-PATTERNS.md would report zero misses on a pure fabrication.
  const src = fs.readFileSync(GATE, "utf8");
  const corpusBlock = src
    .slice(src.indexOf("const CORPORA"), src.indexOf("function readOrDie"))
    // Strip comments before matching. The first run of this clause failed on the fix's OWN
    // explanatory comment, which names the file precisely to warn against adding it -- a check
    // that cannot tell code from the prose warning about it is checking the wrong thing.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.ok(
    !/JOHN-DECISION-PATTERNS/.test(corpusBlock),
    "the doc under test has been added to its own corpus -- every quote would ground trivially",
  );
}

// ---------------------------------------------------------------------------
// 3. The residue is exactly criterion 137's three quotes, and still red
// ---------------------------------------------------------------------------
function theResidueIsNamedAndUnchanged() {
  const res = runGate(REPO);
  assert.deepStrictEqual(
    missed(res).sort((a, b) => a - b),
    RESIDUE,
    `the gate's ungrounded set changed. Expected only criterion 137's three quotes.\n${res.stdout}\n${res.stderr}`,
  );
  assert.strictEqual(res.status, 1, "the gate must still exit 1 while the residue stands");
}

export default async function run() {
  theArchiveIsInTheCorpus();
  aFabricatedQuoteStillFails();
  theDocCannotGroundItself();
  theResidueIsNamedAndUnchanged();
}

selfRun(import.meta.url, run);
