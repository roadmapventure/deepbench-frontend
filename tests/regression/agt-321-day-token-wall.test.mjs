// DeepBench v7.0.1115 | tests/regression/agt-321-day-token-wall.test.mjs | AGT-321 -- the day token
// wall grades an unmeasured cycle as not-known and stands on it, never as 0.
//
// WHAT THIS GUARDS. runner-cycle.md step 3 had every cycle sum today's est_tokens_dev + est_tokens_qa
// by hand. NULL there means unmeasured (step 9) and a sum reads it as 0, so on 2026-11-24 six of six
// cycles that ran closed unmeasured and the wall read 0 of 196,000,000. scripts/day-token-wall.js is
// now the one grader; step 3 names it and the cycle card carries its command.
//
//   W1 pure -- THE DISCRIMINATOR: a day whose every ran cycle is NULL reads not-known, exit 1; the
//              retired hand sum over the same rows reads 0, under the cap (the control).
//   W2 pure -- measured under the cap is clear; at the cap is spent; spent outranks not-known.
//   W3 pure -- one NULL column is not-known; a 0 is a reading; did_not_run and still-running rows
//              are never not-known.
//   W4 pure -- cap_source override clears a not-known day and names the cycles; it never clears spent.
//   W5 pure -- the day is America/Chicago: 05:59Z on 24 Nov belongs to the 23rd.
//   W6 pure -- no cap, a bad cap, unread rows and a failed read are exit 2 / an error, never a pass.
//   W7 cli  -- no credentials in the environment: exit 2.
//   D1 docs -- step 3 names the script and the NULL rule and no longer says "Sum today's"; step 9
//              carries the late reading 1; the card carries the command; the runbook's size holds.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { gradeDayTokenWall, chicagoDay, fetchCycles } from "../../scripts/day-token-wall.js";
import { BYTES_AT_SHIP } from "./ses-413d-questions-scoreboard.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

const NOW = Date.parse("2026-11-24T18:00:00Z");          // noon in Chicago
const CAP = 196000000;                                   // the standing daily-max box, read live 2026-11-24
const row = (id, hhmm, outcome, dev, qa, ended = true) => ({
  id: `${id}-0000-4000-8000-000000000000`, started_at: `2026-11-24T${hhmm}:00Z`,
  ended_at: ended ? `2026-11-24T${hhmm}:59Z` : null, outcome, est_tokens_dev: dev, est_tokens_qa: qa,
});
const grade = (cycles, capSource = "daily-max-box", dayCap = CAP) =>
  gradeDayTokenWall({ cycles, dayCap, capSource, nowMs: NOW });

// The day the ticket was designed on, as its rows read: six ran, all NULL, six did not run.
const UNMEASURED_DAY = [
  row("aaaaaaa1", "08:42", "shipped", null, null), row("aaaaaaa2", "08:46", "shipped", null, null),
  row("aaaaaaa3", "08:47", "shipped", null, null), row("aaaaaaa4", "09:42", "shipped", null, null),
  row("aaaaaaa5", "10:54", "shipped", null, null), row("aaaaaaa6", "11:30", "gated_before_build", null, null),
  row("bbbbbbb1", "06:41", "did_not_run", null, null), row("bbbbbbb2", "06:52", "did_not_run", null, null),
];

async function run() {
  const results = [];

  // W1 -- the discriminator and its control.
  const w1 = grade(UNMEASURED_DAY);
  assert.strictEqual(w1.exitCode, 1, `a day nobody measured must stand the wall; got exit ${w1.exitCode} (${w1.verdict})`);
  assert.strictEqual(w1.verdict, "not-known");
  assert.strictEqual(w1.unmeasured.length, 6, "six cycles ran and closed with no reading");
  assert.strictEqual(w1.ranCount, 6, "a did_not_run row did not run");
  assert.strictEqual(w1.measuredTokens, 0);
  assert.ok(/6 of 6 cycle\(s\) that ran today closed with no token reading/.test(w1.reason), w1.reason);
  const handSum = UNMEASURED_DAY.reduce((a, c) => a + Number(c.est_tokens_dev || 0) + Number(c.est_tokens_qa || 0), 0);
  assert.ok(handSum === 0 && handSum < CAP,
    "CONTROL: the retired hand sum reads this same day as 0 of the cap -- if it did not, the fixture is not the defect");
  results.push("W1-an-unmeasured-day-is-not-known-and-the-hand-sum-called-it-free");

  // W2 -- arithmetic still works when the readings are there.
  const measured = [row("ccccccc1", "08:00", "shipped", 40000000, 5000000), row("ccccccc2", "09:00", "shipped", 60000000, 0)];
  const w2 = grade(measured);
  assert.deepStrictEqual([w2.exitCode, w2.verdict, w2.measuredTokens], [0, "clear", 105000000]);
  const atCap = grade([...measured, row("ccccccc3", "10:00", "failed", 91000000, 0)]);
  assert.deepStrictEqual([atCap.exitCode, atCap.verdict, atCap.measuredTokens], [1, "spent", 196000000]);
  const both = grade([...measured, row("ccccccc3", "10:00", "failed", 91000000, 0), row("ccccccc4", "11:00", "shipped", null, null)]);
  assert.strictEqual(both.verdict, "spent", "a day at its cap is spent whatever else is unknown");
  results.push("W2-measured-days-are-graded-by-arithmetic");

  // W3 -- what counts as unmeasured.
  assert.strictEqual(grade([row("ddddddd1", "08:00", "shipped", null, 7000000)]).verdict, "not-known", "one NULL column is not-known");
  assert.strictEqual(grade([row("ddddddd1", "08:00", "shipped", null, 7000000)]).measuredTokens, 7000000, "the reading that is there still counts");
  assert.strictEqual(grade([row("ddddddd2", "08:00", "shipped", 7000000, 0)]).verdict, "clear", "0 is a reading; NULL is not");
  assert.strictEqual(grade([row("ddddddd3", "08:00", "did_not_run", null, null)]).verdict, "clear", "a did_not_run row is never not-known");
  assert.strictEqual(grade([row("ddddddd4", "08:00", null, null, null, false)]).verdict, "clear", "a cycle still running has not closed unmeasured");
  assert.strictEqual(grade([]).verdict, "clear", "the day's first cycle meets no rows");
  results.push("W3-null-is-unmeasured-zero-is-a-reading");

  // W4 -- John's one-day number.
  const w4 = grade(UNMEASURED_DAY, "override", 50000000);
  assert.deepStrictEqual([w4.exitCode, w4.verdict], [0, "clear-on-override"]);
  assert.ok(w4.reason.includes("aaaaaaa1") && w4.unmeasured.length === 6, "the override names what it covers");
  assert.strictEqual(grade([row("eeeeeee1", "08:00", "shipped", 50000000, 0), ...UNMEASURED_DAY], "override", 50000000).verdict,
    "spent", "an override buys its own number and not one token more");
  results.push("W4-a-one-day-override-covers-not-known-never-spent");

  // W5 -- John's clock.
  assert.strictEqual(chicagoDay(Date.parse("2026-11-24T05:59:00Z")), "2026-11-23");
  assert.strictEqual(chicagoDay(Date.parse("2026-11-24T06:00:00Z")), "2026-11-24");
  assert.strictEqual(chicagoDay(Date.parse("2026-07-01T04:59:00Z")), "2026-06-30", "in summer the day starts at 05:00Z");
  const lastNight = { ...row("fffffff1", "05:30", "shipped", null, null) };
  assert.strictEqual(grade([lastNight]).verdict, "clear", "05:30Z on the 24th is yesterday in Chicago");
  results.push("W5-the-day-is-america-chicago");

  // W6 -- could not read is exit 2, never a pass.
  for (const bad of [undefined, null, "", "abc", 0, -5]) {
    assert.strictEqual(gradeDayTokenWall({ cycles: UNMEASURED_DAY, dayCap: bad, capSource: "daily-max-box", nowMs: NOW }).exitCode, 2,
      `--day-cap=${String(bad)} must be exit 2`);
  }
  assert.strictEqual(gradeDayTokenWall({ cycles: null, dayCap: CAP, nowMs: NOW }).exitCode, 2);
  const refused = await fetchCycles("https://x.invalid", "k", NOW, async () => ({ ok: false, status: 503 }));
  assert.ok(refused.error && !refused.cycles, "a refused read is an error, never an empty day");
  const thrown = await fetchCycles("https://x.invalid", "k", NOW, async () => { throw new Error("down"); });
  assert.ok(thrown.error && !thrown.cycles);
  let asked = "";
  const ok = await fetchCycles("https://x.invalid/", "k", NOW, async u => { asked = u; return { ok: true, json: async () => [] }; });
  assert.deepStrictEqual(ok, { cycles: [] });
  assert.ok(asked.includes("/rest/v1/runner_cycles?select=id,started_at,ended_at,outcome,est_tokens_dev,est_tokens_qa")
    && asked.includes("started_at=gte.2026-11-23T12:00:00.000Z"), `the read looks back 30 hours: ${asked}`);
  results.push("W6-unreadable-is-exit-2");

  // W7 -- the CLI with no credentials.
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  const cli = spawnSync(process.execPath, ["scripts/day-token-wall.js", `--day-cap=${CAP}`], { cwd: ROOT, encoding: "utf8", env });
  assert.strictEqual(cli.status, 2, `no credentials must be exit 2; got ${cli.status}: ${cli.stdout}`);
  assert.ok(cli.stdout.startsWith("day-token-wall: cannot-run -- "), cli.stdout);
  results.push("W7-cli-without-credentials-is-exit-2");

  // D1 -- the wall's one home says it, and the card carries the command.
  const md = read("docs/runbooks/runner-cycle.md");
  const COMMAND = "node scripts/day-token-wall.js --day-cap=<day_cap> --cap-source=<cap_source>";
  assert.strictEqual(md.split(COMMAND).length - 1, 1, "step 3 must carry the wall command exactly once");
  assert.ok(md.includes("A NULL `est_tokens_*` on a cycle that ran is not-known, never 0: the wall stands on\n  it, fail closed (§19v)."),
    "step 3 must say a NULL reading is not-known and the wall stands on it");
  assert.ok(!md.includes("Sum today's " + "`est_tokens_dev + est_tokens_qa`"), "the hand sum must be gone from step 3");
  const s3 = md.indexOf("**3. Check the walls"), s4 = md.indexOf("**4. Blocker sweep #1.");
  assert.ok(s3 > 0 && s3 < md.indexOf(COMMAND) && md.indexOf(COMMAND) < s4, "the command lives inside step 3");
  assert.ok(md.includes("a missed reading 1 takes reading 2's value; `notes` says\n`tokens_split: unmeasured`."),
    "step 9 must take a missed reading 1 at reading 2");
  assert.strictEqual(Buffer.byteLength(md), BYTES_AT_SHIP, "the runbook edit is byte-neutral: its size is still ses-413d's pin");
  const card = read("docs/runbooks/cycle-card.md");
  assert.ok(card.includes(COMMAND), "the cycle card must carry the wall command, or a cycle reading the card never runs it");
  assert.ok(card.includes("SELECT * FROM public.resolve_day_token_cap('<your cycle id>');"), "and the call that produces day_cap");
  results.push("D1-step-3-names-the-script-and-the-card-carries-it");

  return results;
}

selfRun(import.meta.url, run);
export default run;
