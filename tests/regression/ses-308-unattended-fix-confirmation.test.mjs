// DeepBench v7.0.389 | tests/regression/ses-308-unattended-fix-confirmation.test.mjs | SES-308 (M5 required set)
//
// THE LOOP'S LAST THIRD HAD NEVER RUN UNATTENDED. `SES-277` made heal-engine's `--apply` path
// persist fix-confirmation verdicts on a run with nothing new to file. Step 8b of
// `docs/runbooks/runner-cycle.md` then made that path unreachable: re-run with `--apply` ONLY on
// exit 1, exit 1 meant "signatures to file", and a confirmed fix is by definition a run with
// nothing to file -- the failure stopped, so there is no detection. The verdict was computed,
// printed in `confirmLine`, and discarded on every cycle. Measured at the ship: every row in
// `public.runner_heal_signatures` carried `updated_at = 2026-09-02T16:14:42Z`, the single
// supervised `SES-277` drill cycle. No unattended cycle had ever written signature state.
//
// Arms (every content arm fails against unchanged source -- verified by reading the pre-change
// bodies, not assumed):
//   * PURE -- pendingVerdictCount(): confirmed + recurred, 0 when both are empty. Fails today: the
//     export does not exist.
//   * PURE -- recurrence idempotence: a row already in state `recurred` whose newest sighting is no
//     LATER than its stored `last_recurrence_at` yields no new `recurred` verdict, one
//     `stillWatching` with the "already recorded" reason, and KEEPS the hash in `suppressed` (the
//     duplicate-filing guard must not weaken as a side effect). A sighting an hour later still
//     recurs, with the count incremented. Control: a `confirmed_fixed` row recurs on any sighting.
//     The first half fails today -- assessConfirmations() re-reported the same reappearance on
//     every run while the signature stayed in the 14-day window, and verdictPatches() would
//     re-increment recurrence_count each time.
//   * SOURCE SHAPE: the nothing-to-file branch's non-APPLY path exits 1 guarded by
//     pendingVerdictCount(), mutation-controlled; the top-of-main() `--apply` && no-ids hard gate
//     is gone (it ran BEFORE that branch, so the verdict-only re-run this ship instructs would have
//     exited 2 every time) while parseBacklogIds() still guards the filing path; and
//     persistSignatureState() still has exactly two call sites -- the SES-277 invariant survives.
//   * DOC: step 8b of the runbook cites SES-308, its exit-1 sentence says "verdict", and the old
//     "Only then" clause no longer immediately precedes the id-block claim.
//   * LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, declared NOT RUN otherwise): spawns the real dry
//     run and grades the exit-code contract on real data, writing nothing.
//
// Invocation: node tests/regression/ses-308-unattended-fix-confirmation.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { pendingVerdictCount, assessConfirmations } from "../../scripts/heal-engine.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENGINE_REL = "scripts/heal-engine.js";
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// The nothing-new-to-file branch of main(), extracted the same way SES-277's guard extracts it so
// the two tests cannot disagree about where the branch ends.
const nothingBranchOf = src => {
  const m = src.match(/if \(detections\.length === 0\) \{([\s\S]*?)\n  \}\n/);
  assert.ok(m, "main()'s nothing-new-to-file branch must be findable");
  return m[1];
};

async function run(ctx = {}) {
  const results = [];

  // ---- PURE arm 1: the pending count
  assert.strictEqual(
    pendingVerdictCount({ confirmed: [{ sigHash: "a" }], recurred: [], stillWatching: [{ sigHash: "z" }] }), 1,
    "a confirmed verdict is one pending verdict; stillWatching is not pending work");
  assert.strictEqual(
    pendingVerdictCount({ confirmed: [{ sigHash: "a" }], recurred: [{ sigHash: "b" }], stillWatching: [] }), 2);
  assert.strictEqual(
    pendingVerdictCount({ confirmed: [], recurred: [], stillWatching: [{ sigHash: "z" }, { sigHash: "y" }] }), 0,
    "nothing decided is nothing pending -- this is the quiet exit-0 case the runbook calls normal");
  assert.strictEqual(pendingVerdictCount(undefined), 0, "an absent confirmation must not throw");
  results.push("pending-verdict-count-is-confirmed-plus-recurred-and-zero-when-nothing-decided");

  // ---- PURE arm 2: a recurrence is recorded once
  const T1 = new Date("2026-09-01T12:00:00.000Z");
  const NOW = new Date("2026-09-02T12:00:00.000Z");
  const recurredRow = {
    sig_hash: "h", state: "recurred", backlog_id: "LOO-1",
    last_recurrence_at: T1.toISOString(), recurrence_count: 2,
    last_seen_at: T1.toISOString(), confirmation_window_days: 7,
  };
  const seenAt = at => new Map([["h", { count: 4, lastSeen: at }]]);

  const same = assessConfirmations([recurredRow], seenAt(T1), { now: NOW });
  assert.deepStrictEqual(same.recurred, [],
    "a sighting no later than last_recurrence_at is the recurrence ALREADY on the row, not a new one");
  assert.strictEqual(same.stillWatching.length, 1);
  assert.strictEqual(same.stillWatching[0].sigHash, "h");
  assert.ok(/^recurrence already recorded at /.test(same.stillWatching[0].reason),
    `stillWatching must say why, got: ${same.stillWatching[0].reason}`);
  assert.ok(same.stillWatching[0].reason.includes(T1.toISOString()),
    "the reason must name the timestamp already recorded, so the verdict is checkable against the row");
  assert.ok(same.suppressed.has("h"),
    "the hash must STAY suppressed: the duplicate-filing guard must not weaken because the verdict went quiet");

  const later = assessConfirmations(
    [recurredRow], seenAt(new Date(T1.getTime() + 3600000)), { now: NOW });
  assert.strictEqual(later.recurred.length, 1, "a sighting LATER than last_recurrence_at is a new recurrence");
  assert.strictEqual(later.recurred[0].recurrenceCount, 3, "the count increments from the row's stored 2");
  assert.strictEqual(later.recurred[0].lastRecurrenceAt, new Date(T1.getTime() + 3600000).toISOString());
  assert.ok(later.suppressed.has("h"));

  // Control: confirmed_fixed keeps today's behaviour -- ANY sighting is a recurrence, because such
  // a row has no last_recurrence_at to have already recorded one.
  const fixedRow = {
    sig_hash: "h", state: "confirmed_fixed", backlog_id: "LOO-1",
    last_recurrence_at: null, recurrence_count: 0,
    last_seen_at: T1.toISOString(), confirmation_window_days: 7,
  };
  const fixed = assessConfirmations([fixedRow], seenAt(T1), { now: NOW });
  assert.strictEqual(fixed.recurred.length, 1, "control: a confirmed_fixed row still recurs on any sighting");
  assert.strictEqual(fixed.recurred[0].previousState, "confirmed_fixed");
  results.push("a-recurrence-is-recorded-once-not-on-every-run-inside-the-window");

  // ---- SOURCE SHAPE arm
  const src = read(ENGINE_REL);
  const branch = nothingBranchOf(src);
  const PENDING_EXIT = /if \(!APPLY && pendingVerdictCount\(confirmation\) > 0\) \{\n      finish\(\n        1,/;
  assert.ok(PENDING_EXIT.test(branch),
    "the nothing-to-file branch's DRY-RUN path must exit 1 when a verdict is pending -- the whole of SES-308");
  assert.ok(/pendingVerdicts:/.test(branch), "pendingVerdicts must ride the JSON summary on this branch");
  {
    // Mutation control: the exit code is what the assertion grades, not the mere presence of the if.
    const mutated = src.replace(PENDING_EXIT, m => m.replace("finish(\n        1,", "finish(\n        0,"));
    assert.notStrictEqual(mutated, src, "control: mutation changed nothing");
    assert.ok(!PENDING_EXIT.test(nothingBranchOf(mutated)),
      "control: the shape assertion cannot fail -- it would pass on an engine that exits 0 on a pending verdict");
  }
  assert.strictEqual((src.match(/await persistSignatureState\(/g) || []).length, 2,
    "SES-277's invariant must survive: exactly two call sites share the one write path");
  // The top-of-main() gate is gone; the requirement lives only where filing actually needs it.
  assert.ok(!/if \(APPLY && !argValue\("backlog-ids", null\)\)/.test(src),
    "the top-of-main() --apply-needs-ids gate must be gone: it ran BEFORE the nothing-to-file branch, " +
    "so the verdict-only re-run step 8b now instructs would have exited 2 every time");
  assert.ok(/const claim = parseBacklogIds\(argValue\("backlog-ids", null\)\);\n  if \(claim\.error\) fail\(2,/.test(src),
    "filing without ids must STILL exit 2 -- the requirement moved, it was not dropped");
  results.push("dry-run-exits-1-on-a-pending-verdict-and-apply-no-longer-demands-ids-up-front");

  // ---- DOC arm
  const doc = read(RUNBOOK_REL);
  const stepStart = doc.indexOf("**8b. Heal sweep");
  const stepEnd = doc.indexOf("**8b-bis.");
  assert.ok(stepStart > 0 && stepEnd > stepStart, "step 8b must be findable in the runbook");
  const step8b = doc.slice(stepStart, stepEnd);
  assert.ok(step8b.includes("SES-308"), "step 8b must cite SES-308");
  // Bounded by the NEXT exit code's sentence, never by the first ".": version literals like
  // `v7.0.389` are full of them, and a period-terminated match would truncate the claim mid-word.
  const exitOne = step8b.split("\n").join(" ").match(/Exit \*\*1\*\*[\s\S]*?(?=Exit \*\*0\*\*)/);
  assert.ok(exitOne, "step 8b must still state what exit 1 means, ahead of what exit 0 means");
  assert.ok(/verdict/.test(exitOne[0]),
    `step 8b's exit-1 sentence must say a pending verdict is one of the two things it means, got: ${exitOne[0]}`);
  assert.ok(!/Only then,\s*claim an id block/.test(step8b.split("\n").join(" ")),
    "the old 'Only then, claim an id block' clause must be gone -- it is exactly what stopped the " +
    "verdict-only re-run from ever happening");
  assert.ok(/only\*\* when[\s\S]{0,200}detections/.test(step8b) || /--backlog-ids[\s\S]{0,200}\*\*only\*\*/.test(step8b),
    "step 8b must say --backlog-ids is needed only when the dry run listed signatures to file");
  results.push("step-8b-reruns-apply-on-any-exit-1-and-claims-ids-only-when-filing");

  // ---- LIVE arm: grade the exit-code contract on real data, writing nothing.
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live dry-run exit-code contract (exit 1 iff there are detections or pendingVerdicts, never 2)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Run with `node --env-file-if-exists=.env.local " +
      "tests/regression/ses-308-unattended-fix-confirmation.test.mjs`, or export both from " +
      "public.runner_secrets. The four arms above grade the contract without credentials.");
    return results;
  }
  const out = await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(REPO, "scripts", "heal-engine.js"), "--json"], {
      cwd: REPO,
      env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key },
    });
    let stdout = "", stderr = "";
    p.stdout.on("data", d => { stdout += d; });
    p.stderr.on("data", d => { stderr += d; });
    p.on("error", reject);
    p.on("close", code => resolve({ code, stdout, stderr }));
  });
  assert.notStrictEqual(out.code, 2,
    `a dry run against live Supabase must not be an exit 2 (could-not-run): ${out.stdout}${out.stderr}`);
  assert.ok(out.code === 0 || out.code === 1, `dry run exited ${out.code}, expected 0 or 1`);
  const summary = JSON.parse(out.stdout.trim().split("\n").filter(Boolean).pop());
  assert.strictEqual(typeof summary.pendingVerdicts, "number",
    "every dry-run exit path must carry pendingVerdicts -- a cycle reading its absence as a zero is the same defect");
  const expected = (summary.pendingVerdicts > 0 || summary.detections.length > 0) ? 1 : 0;
  assert.strictEqual(out.code, expected,
    `exit 1 must mean unfinished work and nothing else: pendingVerdicts=${summary.pendingVerdicts}, ` +
    `detections=${summary.detections.length}, exit=${out.code}`);
  assert.strictEqual(summary.stateRowsWritten, 0, "a dry run writes nothing -- exit 1 is a signal, never a side effect");
  results.push("live-dry-run-exit-code-matches-its-own-pending-work");
  return results;
}

selfRun(import.meta.url, run);
export default run;
