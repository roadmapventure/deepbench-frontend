// DeepBench v7.0.1045 | tests/regression/agt-517-victoria-meter-stop.test.mjs | AGT-517
//
// FEATURE: AGT-517 -- THE TUESDAY LIST-REORG ROUTINE'S WEEKLY METER STOP IS IN ITS REPO BLOCK.
// The runbook block is the source and the live routine the copy (ARCHITECTURE.md §19v), so a stop
// John put on the live routine but never into its block is a stop the repo cannot prove: the drift
// check has nothing to compare it against, and a future paste of the block into the routine would
// quietly REMOVE the stop. `AGT-567` closed that hole for the auditor, researcher and market
// routines; `victoria-reorg` -- the weekly Tuesday 5:00 AM Central prioritization,
// `trig_012xvmXsXAjbVxdbYhUTq6W1` -- still carried 0 occurrences of `WEEKLY METER STOP` and 0 of
// `routine_meter_ok` in docs/runbooks/victoria-reorg.md on 2026-11-16. This file is its guard.
//
// THE STOP IS JOHN'S 2026-10-14 WORDING, NOT THE AUDITOR'S 2026-10-17 ONE, and the difference is
// not cosmetic: this one carries no `threshold` column and it names the npm ci line it has to run
// before. Pasting the auditor's sibling text here would change what the live routine was told to
// do, so arm 1 pins the line by sha256 AND by byte length rather than trusting the literal to have
// survived an edit. A hash arm looks redundant next to the shape arm until someone "fixes" the em
// dash or re-wraps the paragraph, which is exactly how the 529 bytes stop matching the routine.
//
// ONE SHAPE, ASSERTED AS A SHAPE, NEVER AS A SUBSTRING. `block.text.includes(STOP)` passes on a
// block that buried the stop in the middle, which is precisely the arrangement that does not stop a
// run. Here the stop must be the block's FIRST line -- ahead of the npm ci line, because the stop's
// own text says it runs before it -- then one empty line, then the npm ci line, then one empty
// line, then the routine's own DEEPBENCH VICTORIA-PRIORITIZE header. And exactly once in the file:
// a second copy is a merge artifact.
//
// AND BOTH WAYS THROUGH THE REAL CHECKER, which is the discriminating half (STANDARDS.md Section 4,
// the LOO-013 lesson -- assert WHICH branch fired). comparePrompt() of the block against itself
// must be EMPTY; comparePrompt() of the block-without-the-stop -- the prompt a routine that never
// got the paste hands it -- must be exactly ONE finding whose repo side is the stop line at the
// block's own first line and whose live side is located by the routine's trigger id. A test that
// asserted only the empty direction would pass on a checker that had stopped finding anything, and
// a one-word edit inside the stop (`STOP` -> `HALT`) must still be caught at that same line.
//
// FOUR ARMS:
//   literal  the stop's bytes: sha256 and 529 bytes.
//   shape    lines[0..4] of the block, and one occurrence in the file.
//   checker  comparePrompt() both ways, plus the one-word edit.
//   note     the runbook's drift paragraph: "the live prompt equals it (checked 2026-10-02, exit 0)"
//            is no longer true below the stop (the live prompt is still the `v7.0.864` text there),
//            so that sentence is gone and the AGT-517 sentence stands in its place. The paragraph is
//            what a reader sees when `--routine=victoria-reorg` exits 1.
// Kickoff: docs/kickoffs/v7.0.1045-AGT-517-victoria-meter-stop-in-repo-block.md §5 task T2.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { extractBlock, comparePrompt, ROUTINES } from "../../scripts/check-routine-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NAME = "victoria-reorg";

// John's 2026-10-14 wording, byte-for-byte as the live routine carries it.
const STOP = "STEP 0 — WEEKLY METER STOP (John, 2026-10-14). This runs before everything below, including the npm ci line. Using the Supabase MCP tools, run: select ok, reason, all_models_pct from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.";
const STOP_SHA256 = "63e1fee53698c24e4795c7bf3faadfcaf2b7db49f78226c36fd1a17def299672";
const STOP_BYTES = 529;

const ROUTINE_ID_LOCATION = "routine/trig_012xvmXsXAjbVxdbYhUTq6W1/prompt";
const NPM_CI = "Before anything else, in the clone run: npm ci";
const OWN_HEAD = "DEEPBENCH VICTORIA-PRIORITIZE";
const OLD_NOTE = "the live prompt equals it (checked 2026-10-02, exit 0)";
const NEW_NOTE = "Since `AGT-517` (`v7.0.1045`)";

export default async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); } catch (e) { failures.push(`${name}: ${e.message}`); }
  };

  const r = ROUTINES[NAME];
  assert.ok(r, `check-routine-prompt.js must know a \`${NAME}\` routine`);
  const md = fs.readFileSync(path.join(ROOT, "docs", "runbooks", r.file), "utf8");
  const block = extractBlock(md, r);
  const lines = block.text.split("\n");

  // 1. THE LITERAL: the stop this file pins is the stop John worded, to the byte.
  await arm("literal", async () => {
    assert.equal(crypto.createHash("sha256").update(STOP, "utf8").digest("hex"), STOP_SHA256,
      "the pinned STEP 0 meter stop must hash to John's 2026-10-14 wording");
    assert.equal(Buffer.byteLength(STOP, "utf8"), STOP_BYTES,
      `the stop must be ${STOP_BYTES} bytes of utf8`);
  });

  // 2. THE SHAPE: the stop first, an empty line, the npm ci line, an empty line, the routine's own
  //    header -- and the stop exactly once in the file.
  await arm("shape", async () => {
    assert.equal(lines[0], STOP, "the block's first line must be the STEP 0 meter stop");
    assert.equal(lines[1], "", "one empty line must separate the stop from the npm ci line");
    assert.ok(String(lines[2]).startsWith(NPM_CI),
      `the npm ci line must follow the stop, got ${JSON.stringify(String(lines[2]).slice(0, 60))}`);
    assert.equal(lines[3], "", "one empty line must separate the npm ci line from the routine's own text");
    assert.ok(String(lines[4]).startsWith(OWN_HEAD),
      `the routine's own first line must follow, got ${JSON.stringify(String(lines[4]).slice(0, 60))}`);
    assert.equal(md.split(STOP).length - 1, 1,
      `the stop must appear exactly once in docs/runbooks/${r.file}`);
  });

  // 3. BOTH WAYS THROUGH THE CHECKER: the block agrees with itself; the pre-stop prompt is one
  //    finding whose repo side is the stop at the block's first line; a one-word edit is caught too.
  await arm("checker", async () => {
    assert.deepEqual(comparePrompt(block.text, block, r, NAME), [],
      "the block compared with itself must be no finding");

    const f = comparePrompt(lines.slice(2).join("\n"), block, r, NAME);
    assert.equal(f.length, 1, `a prompt missing the stop must be exactly one finding (got ${f.length})`);
    assert.equal(f[0].locations[1].text, STOP, "the finding's repo side must be the stop line itself");
    assert.equal(f[0].locations[1].location, `docs/runbooks/${r.file}:${block.beginLine + 1}`,
      "the finding must locate the block's own first line");
    assert.equal(f[0].locations[0].location, ROUTINE_ID_LOCATION,
      "the finding's live side must be located by the routine's own trigger id");

    const edited = comparePrompt(
      block.text.replace("WEEKLY METER STOP", "WEEKLY METER HALT"), block, r, NAME);
    assert.equal(edited.length, 1,
      `a one-word edit inside the stop must be exactly one finding (got ${edited.length})`);
    assert.equal(edited[0].locations[1].text, STOP,
      "the one-word edit must be caught at the stop line itself");
  });

  // 4. THE NOTE: the drift paragraph a reader sees now says what is true below the stop.
  await arm("note", async () => {
    assert.ok(!md.includes(OLD_NOTE),
      `docs/runbooks/${r.file} must no longer claim the live prompt equals the block`);
    assert.ok(md.includes(NEW_NOTE),
      `docs/runbooks/${r.file} must say the block opens with the live routine's own STEP 0 since AGT-517`);
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
