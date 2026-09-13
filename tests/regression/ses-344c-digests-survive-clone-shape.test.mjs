// DeepBench v7.0.476 | tests/regression/ses-344c-digests-survive-clone-shape.test.mjs | SES-344
// slice 3 -- THE FIXTURE DIGESTS ARE A FACT ABOUT THE TREE, NOT ABOUT THE CLONE, and the thing to
// read twice is WHY (b) CARRIES A NEGATIVE CONTROL INSTEAD OF JUST ASSERTING THAT THE DIGEST MATCHES.
//
// THE DEFECT THIS PINS, measured 2026-09-13 in a shallow 926-commit clone (8,672 packed objects)
// rather than reasoned about: `materializeInputs()` reported "the diff at 7e4d4cb2 no longer hashes
// to the one this verdict was judged on (96854 bytes now, 96862 then) -- history moved under the
// fixture" on 27/27 usable fixtures, `materializeMutant()` on 3/3, and ses-344b was red at its first
// assertion. History had NOT moved. `git diff` abbreviates the blob ids on its `index a..b` lines by
// `core.abbrev=auto`, which git derives from how many objects the repository holds -- 8 hex digits
// in the clone the fixture was recorded in, 7 in a clone under 16,384 objects. Every recorded diff
// came back exactly 2 characters shorter per changed file. So every recording, every `--judge-live`
// entry and the whole false-approve arm failed in any small clone, for a reason that has nothing to
// do with the deliveries being replayed.
//
// (b) IS THE WHOLE POINT, AND ITS NEGATIVE CONTROL IS WHAT MAKES IT AN ASSERTION RATHER THAN A
// TAUTOLOGY. "The digest matches" is true of any rendering as long as nobody changes clones -- it
// was true the day the fixture was built, on the plain rendering, which is exactly the bug. So this
// part renders the SAME commit twice under two different `core.abbrev` settings and requires the two
// to be byte-identical UNDER `--full-index`; then it renders the same pair WITHOUT `--full-index`
// and requires them to DIFFER (96854 vs 96894 characters, measured). If that control ever stops
// differing, this suite has stopped measuring abbreviation at all -- the clone grew past the
// threshold, or git changed -- and the guard would go quietly vacuous rather than red.
//
// A COMMIT THIS CLONE CANNOT READ IS `NOT RUN`, NEVER A FAIL. A shallow clone that lacks a base
// commit is missing evidence about ITS OWN depth, not evidence that a digest rotted, and failing on
// it would make this guard unrunnable in the very environment it was written for. Each one is named
// in the declaration, and the two counts are printed together, so a run where everything skipped
// cannot be mistaken for a run where everything passed.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  materializeInputs,
  materializeMutant,
  cap,
  sha256,
} from "../../scripts/build-verdict-fixture.js";
import { DIFF_CAP } from "../../scripts/verifier.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const readJson = p => JSON.parse(fs.readFileSync(p, "utf8"));
const FIXTURE = readJson(path.join(REPO, "tests", "fixtures", "verdicts-30.json"));
const MUTANTS = readJson(path.join(REPO, "tests", "fixtures", "verdicts-30-mutants.json"));
const JUDGMENTS = readJson(path.join(REPO, "tests", "fixtures", "verdicts-30-judgments.json"));

// The first usable row, pinned by its short sha: (b)'s three measured character counts belong to
// THIS commit, and a fixture rebuild that reordered the rows would otherwise compare them against a
// different delivery and report a rot that is really a re-ordering.
const PINNED_SHA8 = "7e4d4cb2";
const PLAIN_SHORT = 96854;   // `git -c core.abbrev=7  diff` (no --full-index)
const PLAIN_LONG = 96894;    // `git -c core.abbrev=12 diff` (no --full-index)

// `-c` beats GIT_CONFIG_PARAMETERS (git appends command-line settings last and the last one wins),
// so these two renderings are the two clone shapes regardless of how the suite was invoked --
// asserted by running this file both with and without GIT_CONFIG_PARAMETERS="'core.abbrev=12'".
function diffAt(sha, abbrev, fullIndex) {
  const r = spawnSync("git", [
    "-c", `core.abbrev=${abbrev}`, "diff", ...(fullIndex ? ["--full-index"] : []), `${sha}^`, sha,
  ], { cwd: REPO, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
  if (r.error || r.status !== 0) return null;
  return String(r.stdout);
}

const unreadable = e => /could not be read/.test(String(e));

async function run() {
  // ---- (a) every usable fixture materialises, or is named as unreadable ----------------------
  const usable = FIXTURE.fixtures.filter(f => f.available);
  assert.strictEqual(usable.length, 27, `this guard is written against 27 usable fixtures; the fixture has ${usable.length}`);

  let ok = 0;
  const skipped = [];
  for (const f of usable) {
    const mat = materializeInputs(REPO, f);
    if (mat.errors.length && mat.errors.every(unreadable)) {
      skipped.push(`${f.backlog_id} ${f.version} ${String(f.sha).slice(0, 8)}`);
      notRun(`ses-344c (a) ${f.backlog_id} ${f.version} ${String(f.sha).slice(0, 8)}`,
        `this clone cannot read the commit: ${mat.errors.join("; ")}. That is this checkout's depth, not a rotted digest.`);
      continue;
    }
    assert.deepStrictEqual(mat.errors, [],
      `${f.backlog_id} ${f.version} (${String(f.sha).slice(0, 8)}) does not materialise: ${mat.errors.join("; ")}`);
    ok++;
  }
  assert.strictEqual(ok + skipped.length, usable.length, "a usable fixture was neither materialised nor declared");
  assert.ok(ok > 0,
    `every usable fixture was declared unreadable (${skipped.join(", ")}) -- this clone can replay nothing, so a green here would be vacuous`);
  console.log(`  SES-344c (a) ${ok}/${usable.length} usable fixtures materialise with no errors${skipped.length ? `; ${skipped.length} unreadable in this clone, named: ${skipped.join(", ")}` : ", 0 unreadable in this clone"}`);

  // ---- (b) the rendering is stable across clone shapes, with its control ---------------------
  const first = usable[0];
  assert.ok(String(first.sha).startsWith(PINNED_SHA8),
    `(b)'s measured character counts belong to ${PINNED_SHA8}; the first usable fixture is now ${String(first.sha).slice(0, 8)} (${first.backlog_id} ${first.version})`);

  const full7 = diffAt(first.sha, 7, true);
  const full12 = diffAt(first.sha, 12, true);
  assert.ok(full7 !== null && full12 !== null, `${PINNED_SHA8} could not be diffed in this clone, so (b) has nothing to compare`);
  assert.strictEqual(full7, full12,
    `under --full-index the same commit rendered differently at core.abbrev=7 (${full7.length} chars) and =12 (${full12.length} chars) -- the digest is a fact about the clone again`);
  assert.strictEqual(sha256(cap(full7, DIFF_CAP, "diff")), first.inputs.diff_sha256,
    `the --full-index rendering of ${PINNED_SHA8} does not hash to the recorded diff_sha256 (${String(first.inputs.diff_sha256).slice(0, 12)}) -- run node scripts/build-verdict-fixture.js --redigest, or history really did move`);

  // THE CONTROL. Without --full-index the two renderings MUST differ, or this part is comparing
  // two things that were never going to disagree and (b) above proves nothing.
  const plain7 = diffAt(first.sha, 7, false);
  const plain12 = diffAt(first.sha, 12, false);
  assert.notStrictEqual(plain7, plain12,
    `the negative control has stopped controlling: without --full-index, core.abbrev=7 and =12 rendered ${PINNED_SHA8} identically, so this suite is no longer measuring blob-id abbreviation at all`);
  assert.strictEqual(plain7.length, PLAIN_SHORT, `the plain core.abbrev=7 rendering is ${plain7.length} chars, measured ${PLAIN_SHORT}`);
  assert.strictEqual(plain12.length, PLAIN_LONG, `the plain core.abbrev=12 rendering is ${plain12.length} chars, measured ${PLAIN_LONG}`);
  assert.notStrictEqual(sha256(cap(plain7, DIFF_CAP, "diff")), first.inputs.diff_sha256,
    "the plain rendering hashes to the recorded digest, so the fixture was re-digested onto the unstable form");

  console.log(`  SES-344c (b) ${PINNED_SHA8}: --full-index identical at core.abbrev 7/12 (${full7.length} chars, hashes to ${String(first.inputs.diff_sha256).slice(0, 12)}); control without it differs, ${plain7.length} vs ${plain12.length}`);

  // ---- (c) the mutants, whose base evidence is the same diff --------------------------------
  let mOk = 0;
  for (const m of MUTANTS.mutants) {
    const got = materializeMutant(REPO, FIXTURE.fixtures, m);
    assert.deepStrictEqual(got.errors, [],
      `${m.mutant_id} does not materialise: ${got.errors.join("; ")}`);
    mOk++;
  }
  assert.strictEqual(mOk, MUTANTS.mutants.length, "a mutant was skipped");
  assert.strictEqual(mOk, 3, `this guard is written against 3 mutants; the file holds ${MUTANTS.mutants.length}`);
  console.log(`  SES-344c (c) ${mOk}/${MUTANTS.mutants.length} mutants materialise with no errors`);

  // ---- (d) the fixture says which rendering it was digested under ---------------------------
  assert.ok(FIXTURE.diff_form, "tests/fixtures/verdicts-30.json carries no diff_form -- nothing records which rendering its digests belong to");
  assert.ok(String(FIXTURE.diff_form).includes("--full-index"),
    `diff_form is "${FIXTURE.diff_form}", which does not name --full-index`);
  assert.strictEqual(JUDGMENTS.fixture_generated_by, FIXTURE.generated_by,
    `the judgments pin fixture_generated_by "${JUDGMENTS.fixture_generated_by}" but the fixture says "${FIXTURE.generated_by}" -- --redigest must not touch generated_by: the 27 recorded judgments were given on these same deliveries`);
  console.log(`  SES-344c (d) diff_form "${FIXTURE.diff_form}"; judgments still pin fixture_generated_by "${FIXTURE.generated_by}"`);
}

export default run;

selfRun(import.meta.url, run);
