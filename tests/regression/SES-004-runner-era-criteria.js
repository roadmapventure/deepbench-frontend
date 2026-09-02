// DeepBench v7.0.400 | tests/regression/SES-004-runner-era-criteria.js | SES-004, SES-311
//
// FEATURE: SES-004's runner-era half -- the criteria mined from the 2026-08-15 -> 2026-08-29
// corpus (John's taps, directives, answered questions, card asks and comments), which live in
// Supabase and therefore could not be cited by the ship gate until this pass wrote them into
// docs/harvests/SES-004.md.
//
// WHAT THIS GUARDS, and why each clause is here rather than being obvious:
//
//   1. The append did not renumber. Criteria are cited by NUMBER (docs, kickoffs, ARCHITECTURE
//      §19v's criteria-source clause), so a renumber silently retargets every citation. The
//      clause asserts 1..N contiguous with no duplicates AND that every pre-existing number
//      1..137 is still present -- a test that only counted entries would pass a renumber.
//
//   2. Every runner-era entry carries a quoted kernel of at least MIN_QUOTE_LEN characters.
//      The ship gate IGNORES quotes shorter than that (too generic to discriminate), so an
//      entry whose only quote is short is one the gate silently does not check -- it would
//      pass clause 4 while being ungrounded. This is the hole clause 4 cannot see.
//
//   3. The harvest covers every runner-era entry. A criterion whose provenance is not in the
//      harvest is one no later reader can trace back to the row it came from.
//
//   4. The REAL ship gate passes, spawned rather than reimplemented. Re-deriving its matching
//      rules here would be "a second implementation agreeing with itself" (SES-45): the two
//      would drift and this test would keep passing against its own copy of the rules.
//
//   5. THE NEGATIVE CONTROL, and it is the clause that makes the other four worth running:
//      run the same gate against a tree identical in every way EXCEPT that
//      docs/harvests/SES-004.md is absent. It must FAIL, and at least one quote it reports
//      missing must belong to a criterion >= 138. Without this clause the suite would stay
//      green if the runner-era criteria were grounded entirely in corpora that already
//      existed -- i.e. if this pass had added nothing the gate could not already check, which
//      is precisely "would it still pass if the change did nothing?"
//
// No network, no credentials. Everything is read off the tree; the control tree is symlinked
// rather than copied so a 3.3 MB corpus is not duplicated per run -- with a copy fallback on
// Windows accounts that lack the symlink privilege (see linkOrCopy below).

import assert from "assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const DOC = path.join(REPO, "docs", "JOHN-DECISION-PATTERNS.md");
const HARVEST = path.join(REPO, "docs", "harvests", "SES-004.md");
const GATE = path.join(REPO, "scripts", "check-decision-pattern-quotes.js");

// The first runner-era criterion. 1..137 predate this pass (SES-79 v7.0.110, SES-90 v7.0.126,
// criterion 137 from p1p3-now-review v7.0.136); this pass appends from 138.
const FIRST_RUNNER_ERA = 138;
// Mirrors scripts/check-decision-pattern-quotes.js's own MIN_QUOTE_LEN. Asserted equal to the
// gate's literal below, so the two cannot drift apart silently.
const MIN_QUOTE_LEN = 8;

const ENTRY_RE = /^\*\*(\d+)\.\s/gm;

function readDoc() {
  return fs.readFileSync(DOC, "utf8");
}

// FEATURE: SES-311 -- symlink, or copy when the OS refuses to let us.
// `fs.symlinkSync` raises EPERM on a Windows account without SeCreateSymbolicLinkPrivilege
// (and EISDIR/EEXIST in a few edge cases), which used to abort clause 5 outright and turn a
// whole verifier run red on John's machine -- a false `block`, which since SES-122a resets the
// class's autonomy streak. The fallback is safe for THIS fixture specifically: every entry in
// the control tree is a read-only control (the gate only ever reads these corpora, and the tree
// is rmSync'd in the same `finally`), so a copy is behaviourally identical to a link -- the link
// was only ever an optimisation to avoid duplicating a 3.3 MB corpus per run. No assertion
// changes; on a privileged account the symlink path still runs.
function linkOrCopy(src, dest) {
  try {
    fs.symlinkSync(src, dest);
  } catch (e) {
    if (!["EPERM", "EISDIR", "EEXIST", "EACCES", "ENOSYS", "UNKNOWN"].includes(e.code)) throw e;
    fs.cpSync(src, dest, { recursive: true, force: true });
  }
}

// Split the doc into one text block per criterion, keyed by number.
function entries(doc) {
  const starts = [];
  for (const m of doc.matchAll(ENTRY_RE)) starts.push({ n: Number(m[1]), at: m.index });
  const out = new Map();
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].at : doc.length;
    out.set(starts[i].n, doc.slice(starts[i].at, end));
  }
  return out;
}

// The doc marks a verbatim kernel with double quotes (straight or curly). Same character class
// the ship gate's extractQuotes() uses, written with escapes so an editor's quote-smartening
// cannot silently change what this matches.
function quotesIn(block) {
  const found = [];
  for (const m of block.matchAll(/[“"]([^“”"]+)[”"]/g)) {
    found.push(m[1].replace(/^[\s.,;:!?…—-]+|[\s.,;:!?…—-]+$/g, ""));
  }
  return found;
}

// ---------------------------------------------------------------------------
// 1. The append did not renumber
// ---------------------------------------------------------------------------
function numberingIsIntactAndAppendOnly() {
  const map = entries(readDoc());
  const nums = [...map.keys()];

  assert.strictEqual(
    new Set(nums).size,
    nums.length,
    "a criterion number appears twice -- two entries now answer to one citation",
  );

  const max = Math.max(...nums);
  assert.ok(
    max >= FIRST_RUNNER_ERA,
    `the runner-era pass did not land: highest criterion is ${max}, expected >= ${FIRST_RUNNER_ERA}`,
  );

  for (let i = 1; i <= max; i++) {
    assert.ok(map.has(i), `criterion ${i} is missing -- the numbering is no longer contiguous`);
  }

  // The append-only guarantee, stated as its own assertion rather than implied by contiguity:
  // every number that existed before this pass must still exist.
  for (let i = 1; i <= FIRST_RUNNER_ERA - 1; i++) {
    assert.ok(map.has(i), `pre-existing criterion ${i} was renumbered or removed`);
  }
}

// ---------------------------------------------------------------------------
// 2. Every runner-era entry carries a kernel the gate will actually check
// ---------------------------------------------------------------------------
function everyRunnerEraEntryIsCheckable() {
  const gateSrc = fs.readFileSync(GATE, "utf8");
  const declared = /const\s+MIN_QUOTE_LEN\s*=\s*(\d+)/.exec(gateSrc);
  assert.ok(declared, "cannot read MIN_QUOTE_LEN out of the ship gate");
  assert.strictEqual(
    Number(declared[1]),
    MIN_QUOTE_LEN,
    "the gate's MIN_QUOTE_LEN moved; this test's idea of 'checkable' is now wrong",
  );

  const map = entries(readDoc());
  const runnerEra = [...map.keys()].filter((n) => n >= FIRST_RUNNER_ERA);
  assert.ok(runnerEra.length > 0, "no runner-era criteria found");

  for (const n of runnerEra) {
    const block = map.get(n);
    // \s+ not a literal space, for the gate's own documented reason: the doc hard-wraps at
    // ~100 cols and can split "*Seen in:*" across a line break. Entry #112 fell out of BOTH
    // the gate's checked and skipped sets that way; a stricter regex here would have reported
    // a well-formed entry as evidence-less, which is what the first run of this test did.
    assert.ok(/\*Seen\s+in:/.test(block), `criterion ${n} has no "Seen in:" evidence`);
    const long = quotesIn(block).filter((q) => q.replace(/\s+/g, " ").trim().length >= MIN_QUOTE_LEN);
    assert.ok(
      long.length > 0,
      `criterion ${n}'s only quotes are shorter than ${MIN_QUOTE_LEN} chars -- the ship gate ignores those, so this entry is unchecked`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. The harvest covers every runner-era entry
// ---------------------------------------------------------------------------
function harvestCoversEveryRunnerEraEntry() {
  assert.ok(fs.existsSync(HARVEST), "docs/harvests/SES-004.md is missing -- the quotes have no in-repo corpus");
  const harvest = fs.readFileSync(HARVEST, "utf8");
  const map = entries(readDoc());
  for (const n of [...map.keys()].filter((k) => k >= FIRST_RUNNER_ERA)) {
    assert.ok(
      new RegExp(`(^|[^0-9])${n}([^0-9]|$)`, "m").test(harvest),
      `criterion ${n} has no provenance entry in docs/harvests/SES-004.md`,
    );
  }
}

// ---------------------------------------------------------------------------
// 4. No runner-era criterion is among the ship gate's misses
// ---------------------------------------------------------------------------
// SCOPED DELIBERATELY, AND THE REASON IS A MEASUREMENT RATHER THAN CAUTION. The obvious
// assertion is `exit === 0`, and it cannot be made: measured on origin/dev at v7.0.326, BEFORE
// this pass touched anything, check-decision-pattern-quotes.js already exits 1 with 60 ungrounded
// quotes across criteria 6-137 -- the doc's own footer calls this script "the ship gate; run it
// after any edit here", and nothing in tests/regression runs it, so the red went unnoticed. That
// is a real pre-existing defect and it is filed as its own ticket; absorbing it into this test
// (by asserting exit 0 and then "fixing" 60 unrelated citations) would widen this ticket, and
// asserting a failure COUNT would make this test fail the day someone repairs one of them.
// So the assertion is the one this pass is actually responsible for: of the gate's own reported
// misses, none may be a criterion this pass added.
function runGate(repoRoot) {
  return spawnSync(process.execPath, [GATE, "--repo", repoRoot], { encoding: "utf8" });
}

// The gate reports each miss as `  #<num>: "<quote>"`. Reading its real output rather than
// re-deriving which entries "should" have failed is the SES-45 boundary: a second implementation
// of the matching rules would drift and then agree with itself.
function missedCriteria(res) {
  const out = `${res.stdout}\n${res.stderr}`;
  return [...out.matchAll(/^\s*#(\d+):/gm)].map((m) => Number(m[1]));
}

function noRunnerEraQuoteIsUngrounded() {
  const res = runGate(REPO);
  const runnerEraMisses = [...new Set(missedCriteria(res).filter((n) => n >= FIRST_RUNNER_ERA))];
  assert.deepStrictEqual(
    runnerEraMisses,
    [],
    `the ship gate cannot ground these runner-era quotes: ${runnerEraMisses.join(", ")}\n${res.stdout}\n${res.stderr}`,
  );
}

// ---------------------------------------------------------------------------
// 5. NEGATIVE CONTROL -- the harvest is load-bearing
// ---------------------------------------------------------------------------
function withoutTheHarvestTheGateFails() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ses004-control-"));
  try {
    const docsDir = path.join(tmp, "docs");
    const harvestsDir = path.join(docsDir, "harvests");
    fs.mkdirSync(harvestsDir, { recursive: true });

    // The doc under test, and every corpus the gate reads -- EXCEPT SES-004.md.
    fs.copyFileSync(DOC, path.join(docsDir, "JOHN-DECISION-PATTERNS.md"));
    for (const f of ["SESSIONS.md", "FEATURES-ARCHIVE.md"]) {
      linkOrCopy(path.join(REPO, "docs", f), path.join(docsDir, f));   // FEATURE: SES-311
    }
    for (const f of fs.readdirSync(path.join(REPO, "docs", "harvests"))) {
      if (!f.endsWith(".md") || f === "SES-004.md") continue;
      linkOrCopy(path.join(REPO, "docs", "harvests", f), path.join(harvestsDir, f));   // FEATURE: SES-311
    }

    // The DIFFERENCE is the assertion, not the exit code: the gate exits 1 on both trees
    // because of the 60 pre-existing misses clause 4 documents, so an exit-code comparison
    // would prove nothing at all. What must differ is WHICH criteria it cannot ground.
    const control = [...new Set(missedCriteria(runGate(tmp)).filter((n) => n >= FIRST_RUNNER_ERA))];
    assert.ok(
      control.length > 0,
      "with docs/harvests/SES-004.md removed the gate still grounds every runner-era quote -- the harvest is decorative, and this pass added nothing the gate could not already check",
    );

    const live = [...new Set(missedCriteria(runGate(REPO)).filter((n) => n >= FIRST_RUNNER_ERA))];
    assert.deepStrictEqual(
      live,
      [],
      `the control is only meaningful against a clean live tree, and the live tree already misses: ${live.join(", ")}`,
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export default async function run() {
  numberingIsIntactAndAppendOnly();
  everyRunnerEraEntryIsCheckable();
  harvestCoversEveryRunnerEraEntry();
  noRunnerEraQuoteIsUngrounded();
  withoutTheHarvestTheGateFails();
}

selfRun(import.meta.url, run);
