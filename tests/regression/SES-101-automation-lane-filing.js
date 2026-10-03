// DeepBench v7.0.203 | tests/regression/SES-101-automation-lane-filing.js | SES-101
// FEATURE: the canonical "file a new ticket" procedure tells you to claim the automation lane top.
//
// SES-101 shipped public.claim_automation_lane_top() in v7.0.147 and then sat `partial` for two
// days, because NOTHING CALLED IT AT FILING TIME. The rule lived in runner-cycle.md; the procedure
// people actually follow when filing a ticket -- session-setup step 3c -- said only "run
// recompute_backlog_queue()". So a newly filed automation ticket landed in the class-sorted
// backlog, which is the exact failure the lane was built to end. Measured when the function
// shipped: the last three automation tickets filed had been hand-assigned to the BOTTOM of the
// lane (SES-99 = 7, SES-100 = 8, SES-101 = 9), the opposite of John's answer to q-lane-top.
//
// WHY IT COULD NOT BE FIXED UNTIL NOW, and why this test exists in the same commit: step 3c lived
// under .claude/, which an unattended cycle may not write (register B39), so the ticket was flagged
// needs-desktop and skipped every cycle. SES-121 moved the body to docs/runbooks/session-setup.md
// in v7.0.198. This is the first thing that move paid for -- and the reason to guard it is that the
// bullet is one paragraph in a 16 KB procedure, exactly the kind of thing a later tidy-up drops.
//
// The live behaviour is asserted in the ship's own QA against the real function, not here:
// SES-161 filed at open-lane min -13 -> claim -> automation_rank -14 (min MINUS one, never max+1),
// queue 1; a second call left it at -14 (idempotent, no ratchet). This test guards the WRITTEN
// procedure, which is the half that was missing.
//
// No network, no credentials, no database. It reads one repo file.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROC = path.join(HERE, "..", "..", "docs", "runbooks", "session-setup.md");

export const FN = "public.claim_automation_lane_top";

export async function run() {
  assert.ok(fs.existsSync(PROC),
    "docs/runbooks/session-setup.md is missing — SES-121 moved the procedure body here in " +
    "v7.0.198 precisely so an unattended cycle could maintain it");
  const s = fs.readFileSync(PROC, "utf8");

  // ---- 1. The call is in the filing procedure ------------------------------------------------
  // FAILS on the pre-change tree: step 3c named only recompute_backlog_queue().
  assert.ok(s.includes(FN),
    `docs/runbooks/session-setup.md must tell a filing session to call ${FN}() — without it a new ` +
    `automation ticket lands in the class-sorted backlog, which is the failure the lane exists to end`);

  // ---- 2. The direction is min-1, NEVER max+1 -------------------------------------------------
  // This is John's actual ruling (q-lane-top, yes, 2026-08-21) and the half most likely to be
  // "corrected" by someone assuming a queue appends.
  const seg = s.slice(s.indexOf(FN));
  assert.ok(/min\(open lane\)\s*[−-]\s*1/.test(seg) || /never\s*`?max \+ 1`?/i.test(seg),
    "the procedure must state that the slot is min(open lane) − 1 and NEVER max + 1 — appending " +
    "is the natural assumption and is the opposite of what John answered");

  // ---- 3. It REPLACES the plain recompute, and only for automation work -----------------------
  assert.ok(/INSTEAD of/i.test(seg) || /replaces/i.test(seg),
    "the procedure must say this call replaces the plain recompute — it runs the recompute itself, " +
    "and a caller told to do both will read that as two required statements and forget one");
  assert.ok(/not\*{0,2}\s*automation/i.test(seg) || /ordinary ticket/i.test(seg),
    "the procedure must bound the call to automation work — calling it on an ordinary ticket to " +
    "'be safe' would put unrelated work above John's own queue");

  // ---- 4. Idempotence is stated, not left to be discovered -------------------------------------
  assert.ok(/idempotent/i.test(seg),
    "the procedure must state the call is idempotent — otherwise a session that re-runs it will " +
    "assume it ratcheted the rank further negative and start hand-repairing a value that is fine");
}

export default run;
selfRun(import.meta.url, run);
