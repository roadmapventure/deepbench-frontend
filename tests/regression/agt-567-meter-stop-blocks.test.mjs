// DeepBench v7.0.1031 | tests/regression/agt-567-meter-stop-blocks.test.mjs | AGT-567
//
// FEATURE: AGT-567 -- THE WEEKLY METER STOP IS IN THE REPO BLOCK OF EVERY ROUTINE THAT RUNS IT.
// The runbook block is the source and the live routine the copy (ARCHITECTURE.md §19v), so a stop
// John put on a live routine but not in its block is a stop the repo cannot prove and the drift
// check reports forever as "expected". Three routines ran step 0's meter stop with no block line to
// compare against -- auditor, researcher and market -- and this file is the guard on all three.
//
// ONE SHAPE, ASSERTED AS A SHAPE, NEVER AS A SUBSTRING. `block.text.includes(STOP)` passes on a
// block that buried the stop in the middle, which is exactly the arrangement that does not stop a
// run: the stop has to be the block's FIRST line, with one empty line between it and the routine's
// own first line, and it has to appear in the file exactly once (a second copy is a merge artifact,
// and the live routine carries one). So each arm pins lines[0], lines[1], lines[2] and the count.
//
// AND BOTH WAYS THROUGH THE REAL CHECKER, which is the discriminating half (STANDARDS.md Section 4,
// the LOO-013 lesson -- assert WHICH branch fired). comparePrompt() of the block against itself
// must be EMPTY, and comparePrompt() of the block-without-the-stop -- the prompt a routine that
// never got the paste would hand it -- must be exactly ONE finding whose repo side is the stop line
// at the block's own first line. A test that only asserted the empty direction would pass on a
// checker that had stopped finding anything at all.
//
// THREE ARMS, one per routine, plus the auditor's note:
//   auditor     docs/runbooks/auditor-routine.md
//   researcher  docs/runbooks/researcher-routine.md
//   market      docs/runbooks/market-agent.md
//   note        the auditor runbook's drift paragraph: with the stop in the block the live routine
//               and the block AGREE, so "still runs the `v7.0.587` text" is false and gone, and the
//               AGT-567 sentence stands in its place. Expected drift was the whole reason an exit 1
//               on the auditor was waved past; the paragraph is what a reader sees.
// Kickoff: docs/kickoffs/v7.0.1031-AGT-567-meter-stop-in-repo-blocks.md §5 task 5.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { extractBlock, comparePrompt, ROUTINES } from "../../scripts/check-routine-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runbook = file => fs.readFileSync(path.join(ROOT, "docs", "runbooks", file), "utf8");

// The one line John's stop is, byte-for-byte (= docs/runbooks/humorist-agent.md's own step 0).
const STOP = "STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.";

const ROUTINES_UNDER_TEST = [
  ["auditor", "DEEPBENCH AUDITOR — WEEKLY AUDIT"],
  ["researcher", "DEEPBENCH — THE RESEARCHER (GV-02"],
  ["market", "DEEPBENCH — NATHAN LAAN (MK-06"],
];

export default async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); } catch (e) { failures.push(`${name}: ${e.message}`); }
  };

  for (const [name, head] of ROUTINES_UNDER_TEST) {
    await arm(name, async () => {
      const r = ROUTINES[name];
      assert.ok(r, `check-routine-prompt.js must know a \`${name}\` routine`);
      const md = runbook(r.file);
      const block = extractBlock(md, r);
      const lines = block.text.split("\n");

      // 1. THE SHAPE: the stop first, one empty line, then the routine's own first line -- and once.
      assert.equal(lines[0], STOP, "the block's first line must be the STEP 0 meter stop");
      assert.equal(lines[1], "", "one empty line must separate the stop from the routine's own text");
      assert.ok(lines[2].startsWith(head),
        `the routine's own first line must follow, got ${JSON.stringify(String(lines[2]).slice(0, 60))}`);
      assert.equal(md.split(STOP).length - 1, 1,
        `the stop must appear exactly once in docs/runbooks/${r.file}`);

      // 2. BOTH WAYS THROUGH THE CHECKER: the block agrees with itself, and the pre-stop prompt is
      //    one finding whose repo side is the stop at the block's first line.
      assert.deepEqual(comparePrompt(block.text, block, r, name), [],
        "the block compared with itself must be no finding");
      const f = comparePrompt(lines.slice(2).join("\n"), block, r, name);
      assert.equal(f.length, 1, `a prompt missing the stop must be exactly one finding (got ${f.length})`);
      assert.equal(f[0].locations[1].text, STOP, "the finding's repo side must be the stop line itself");
      assert.equal(f[0].locations[1].location, `docs/runbooks/${r.file}:${block.beginLine + 1}`,
        "the finding must locate the block's own first line");
    });
  }

  // 3. The auditor's drift paragraph: the stop is in the block, so the two AGREE now.
  await arm("note", async () => {
    const md = runbook(ROUTINES.auditor.file);
    assert.ok(!md.includes("still runs the `v7.0.587` text"),
      "the auditor runbook must no longer call its exit 1 expected drift");
    assert.ok(md.includes("agreed when `AGT-567` shipped"),
      "the auditor runbook must say the live routine and the block agreed when AGT-567 shipped");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
