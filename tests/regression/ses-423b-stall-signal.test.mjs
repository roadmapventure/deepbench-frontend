// DeepBench v7.0.532 | tests/regression/ses-423b-stall-signal.test.mjs | SES-423 slices 2-3
//
// SLICE 3 (v7.0.532) AMENDED THIS FILE: the reading is a DELTA. get_session counts the whole
// SESSION, a drain chain runs many cycles in one, so charging reading 1 whole re-charges every
// cycle before it -- fd4e11f4 closed at 32,249,570 and its continuation's first reading was
// 48,608,438. chargeFor() below is the arithmetic arm: it asserts a two-cycle chain's charges
// SUM to the last reading and never more, which is exactly what the session-total rule broke.
//
// GUARDS THE TWO THINGS v7.0.531 CHANGED, and the reason both needed a guard is the same: each is
// a RULE CARRIED IN PROSE that a later editor can delete without anything going red.
//
//  (1) A STALL IS JUDGED BY THE BUILD'S OWN SIGNAL. Step 0b probe (d) pushes John when an open
//      peer's coalesce(heartbeat_at, started_at) is >20 minutes stale. Measured on the live table
//      before this ship: 13 rows carry stall_notified_at all-time and NINE of them ended `shipped`
//      -- the alert fired at a build that was working. 0e57cedd is the worked example: started
//      03:16:50Z, "stalled" 03:53:12Z, shipped v7.0.502 at 03:58:17Z. Only the orchestrator wrote
//      heartbeat_at, and `grep -rl heartbeat scripts lib` returned 0, so step 7 -- the longest step
//      and the one a sub-agent owns -- could not report. scripts/cycle-heartbeat.js is that report.
//
//  (2) THE CLOSE-OUT MEASURES INSTEAD OF ESTIMATING. Step 9 said "estimated is fine, labeled
//      estimated"; this cycle's own get_session reading was 15.27M tokens where all 15 shipped rows
//      since 2026-09-18 read est_tokens_dev <= 900,000. An estimate that is out by 17x is not a
//      labelled estimate, it is a number nobody measured.
//
// THE TIMELINE ARM IS THE DISCRIMINATING ONE and it is not a grep: it replays 0e57cedd's real
// clock through the SAME coalesce basis probe (d) uses, once WITH the Builder's heartbeats and once
// without, and asserts the sweep's answer FLIPS. Would it still pass if the change did nothing?
// No -- the no-heartbeat arm is the pre-change world and it must still push.
//
// FILE-LEVEL NEGATIVE CONTROL, run rather than claimed: every text clause below is re-tested
// against its own breaks() mutation and must fail there.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CYCLE_REL = "docs/runbooks/runner-cycle.md";
const HEARTBEAT_REL = "scripts/cycle-heartbeat.js";
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// Reflow-proof matching: the runbook is hard-wrapped, so a load-bearing phrase straddles a line
// break and a literal match fails for a reason that has nothing to do with the rule (SES-194).
export const norm = s => s.replace(/\s+/g, " ");

// A clause earns its place only if REMOVING it would change what a cycle does.
export const CLAUSES = [
  {
    id: "step-7-hands-the-builder-a-heartbeat-command",
    detail:
      "step 7's --task must carry the heartbeat key -- the Builder runs in its own sub-agent turn " +
      "and has no other way to learn the command, so a task_context without it ships a step that " +
      "cannot report",
    test: s => norm(s).includes(`"heartbeat":"node scripts/cycle-heartbeat.js --cycle=<cid> --step='7 — builder: <task>'"`),
    breaks: s => s.replace(`,"heartbeat":"node scripts/cycle-heartbeat.js --cycle=<cid> --step='7 — builder: <task>'"`, ""),
  },
  {
    id: "the-builder-turn-says-when-to-beat",
    detail:
      "a command with no cadence is a command that fires once: the turn must open by naming the " +
      "four moments (after the baseline, after every kickoff task, before run-all, before the push)",
    test: s => /Run the task's `heartbeat` command after the baseline, after every kickoff task, before run-all and before the push\./.test(norm(s)),
    breaks: s => s.replace("after the baseline, after every kickoff task,\n   before run-all and before the push", "when convenient"),
  },
  {
    id: "a-step-7-row-is-a-stopped-build",
    detail:
      "probe (d)'s reader must be told how to READ a step-7 row now that step 7 beats -- a row " +
      "still stale with heartbeats live is a build that stopped, and saying 'still running' is the " +
      "exact wrong push",
    test: s => /a \(d\) row whose `last_step` reads `7 — builder: …` is a build that STOPPED, not a long one/.test(norm(s)),
    breaks: s => s.replace("is a build that\nSTOPPED, not a long one", "may be a long build"),
  },
  {
    id: "step-9-measures-never-guesses",
    detail:
      "step 9 must say est_tokens_* are MEASURED, and the retired 'estimated is fine' clause must " +
      "be gone -- one sentence of permission is what produced 15 shipped rows at <=900,000 against " +
      "a real 15.27M",
    test: s => /\*\*measured, never guessed\*\*/.test(norm(s)) && !/estimated is fine/.test(s),
    breaks: s => s.replace("**measured, never guessed**", "estimated is fine"),
  },
  {
    id: "the-reading-names-its-tool-and-its-arithmetic",
    detail:
      "a 'measure it' rule with no named tool and no named sum is re-derived differently every " +
      "cycle: get_session with session_id OMITTED, read THREE times (v7.0.532), four usage " +
      "fields summed, dev = reading 1 minus reading 0 and qa = reading 2 minus reading 1",
    test: s => {
      const n = norm(s);
      return n.includes("`mcp__Claude_Code_Remote__get_session` with `session_id` OMITTED, three times")
        && n.includes("`input_tokens + output_tokens + cache_read_tokens + cache_write_tokens` of `external_metadata.usage`")
        && n.includes("`est_tokens_dev` = reading 1 − reading 0, `est_tokens_qa` = reading 2 − reading 1");
    },
    breaks: s => s.replace("reading 2 − reading 1", "the QA half"),
  },
  {
    id: "a-reading-is-a-delta-never-the-session-total",
    detail:
      "get_session counts the whole SESSION and a drain chain runs many cycles in one, so a " +
      "close-out that charges reading 1 whole re-charges everything its predecessors already " +
      "closed with (fd4e11f4 closed at 32,249,570 and its continuation's first reading was " +
      "48,608,438). Step 1 must take reading 0 at the INSERT and step 9 must charge DELTAS",
    test: s => {
      const n = norm(s);
      return (s.split("tokens_at_open").length - 1) >= 2
        && /DELTAS, never a session total/.test(n)
        && n.includes("`est_tokens_dev` = reading 1 − reading 0");
    },
    breaks: s => s.replace("= reading 1 − reading 0", "= reading 1"),
  },
  {
    id: "an-unmeasurable-reading-is-null-never-a-number",
    detail:
      "the fallback must be NULL, never an invented figure, and the basis must be written into " +
      "notes so a later reader can tell a measured row from a guessed one",
    test: s => {
      const n = norm(s);
      return n.includes("`tokens_basis: get_session` in `notes`")
        && /[Tt]ool unavailable → both NULL,\s*never a number/.test(n);
    },
    breaks: s => s.replace("both NULL,\nnever a number", "your best estimate"),
  },
  {
    id: "the-token-pair-is-bracketed-in-all-three-fences",
    detail:
      "all three agent-log.js fences must show the pair as [optional] -- one un-bracketed fence " +
      "re-teaches the next cycle that the flags are mandatory, which is what made a harness with " +
      "no usage figure invent one",
    test: s => (s.split("[--input-tokens=N --output-tokens=N]").length - 1) === 3
      && !s.includes("  --input-tokens=N --output-tokens=N --cycle="),
    breaks: s => s.replace("[--input-tokens=N --output-tokens=N]", "--input-tokens=N --output-tokens=N"),
  },
  {
    id: "optional-as-a-pair-never-half-a-pair",
    detail:
      "the brackets alone would read as 'either flag is optional'; the rule must say the pair is " +
      "optional AS A PAIR, that the row then lands NULL (unmeasured, never free), and that a lone " +
      "or bad flag still exits 2",
    test: s => {
      const n = norm(s);
      return n.includes("**The bracketed pair is optional AS A PAIR (`v7.0.530`):**")
        && n.includes("unmeasured, never free")
        && /a lone flag, or a negative or non-numeric value, still exits 2/.test(n);
    },
    breaks: s => s.replace("unmeasured, never free", "and that is fine"),
  },
  {
    id: "the-v7-0-505-facts-were-relocated-not-dropped",
    detail:
      "SES-164 step 2: a rotated stamp's ZERO-hit facts must survive somewhere in the body. All " +
      "five of v7.0.505's had no other home, so step 4e now carries them",
    test: s => {
      const body = s.split("\n").slice(5).join("\n");
      return ["ingestJudgment", "OUTCOME_MAX", "GV-08", "shared/ai-patterns.js:272", "`217` findings"]
        .every(f => body.includes(f));
    },
    breaks: s => s.replace("pass two's answer\nis validated whole by `ingestJudgment`; ", ""),
  },
];

function everyClauseHoldsOnTheShippedRunbook(md) {
  for (const c of CLAUSES) {
    assert.ok(c.test(md), `SES-423b clause "${c.id}" is not satisfied by the shipped runbook: ${c.detail}`);
  }
  return CLAUSES.length;
}

function everyClauseHasTeeth(md) {
  for (const c of CLAUSES) {
    const broken = c.breaks(md);
    assert.notStrictEqual(broken, md,
      `SES-423b clause "${c.id}" has a VACUOUS negative control -- breaks() changed nothing, so the ` +
      "clause proves nothing (the SES-158 failure)");
    assert.ok(!c.test(broken),
      `SES-423b clause "${c.id}" still passes with its own rule removed -- it is not discriminating`);
  }
}

// The rotation itself: the runbook keeps 5 stamps and the dropped one is in docs/SESSIONS.md.
function theStampWasMovedNotDeleted(md) {
  const stamps = md.split("\n").filter(l => l.startsWith("<!-- DeepBench v"));
  assert.strictEqual(stamps.length, 5, `session-hygiene check 7 caps the runbook at 5 header stamps; got ${stamps.length}`);
  assert.ok(stamps[0].startsWith("<!-- DeepBench v7.0.535 | runbooks/runner-cycle.md | SES-424 slice 3"),
    "this ship's own stamp must be the first line of the runbook");
  assert.ok(!md.includes("<!-- DeepBench v7.0.517 | runbooks/runner-cycle.md"),
    "v7.0.517 is the stamp SES-424 slice 3 rotated out; it must no longer be in the runbook");
  assert.ok(read("docs/SESSIONS.md").includes("<!-- DeepBench v7.0.517 | runbooks/runner-cycle.md | SES-378 slice 7"),
    "the rotated v7.0.517 stamp must land in docs/SESSIONS.md VERBATIM -- a stamp dropped instead of " +
    "moved loses the only written record of that ship");
  assert.ok(!md.includes("<!-- DeepBench v7.0.516 | runbooks/runner-cycle.md"),
    "v7.0.516 was the v7.0.532 ship's rotation; it must still be out of the runbook");
  assert.ok(read("docs/SESSIONS.md").includes("<!-- DeepBench v7.0.516 | runbooks/runner-cycle.md | SES-378 slice 6"),
    "the rotated v7.0.516 stamp must land in docs/SESSIONS.md VERBATIM -- a stamp dropped instead of " +
    "moved loses the only written record of that ship");
  assert.ok(!md.includes("<!-- DeepBench v7.0.505 | runbooks/runner-cycle.md"),
    "v7.0.505 was slice 2's rotation; it must still be out of the runbook");
  assert.ok(read("docs/SESSIONS.md").includes("<!-- DeepBench v7.0.505 | runbooks/runner-cycle.md | AGT-79 slice 5"),
    "the v7.0.505 stamp slice 2 moved must still be in docs/SESSIONS.md VERBATIM");
}

// --- the timeline arm: probe (d)'s own basis, replayed over 0e57cedd -----------------------------
//
// Deliberately re-implemented here rather than imported: this asserts that the SQL's semantics and
// the heartbeat's cadence COMPOSE, and a helper shared with the thing under test would hide a
// disagreement between them. SES-104 owns the basis itself.
export const SWEEP = Date.parse("2026-09-19T03:53:12Z");
export const STARTED = Date.parse("2026-09-19T03:16:50Z");
export const BUILDER_BEATS = ["03:31", "03:38", "03:45", "03:51"]
  .map(hm => Date.parse(`2026-09-19T${hm}:00Z`));

export function sweep({ startedAt, heartbeats }, now = SWEEP) {
  const basis = heartbeats.length ? Math.max(...heartbeats) : startedAt;   // coalesce(heartbeat_at, started_at)
  const minutesFrozen = Math.round((now - basis) / 60000);
  return { minutesFrozen, push: minutesFrozen > 20 };
}

function theHeartbeatsTurnTheFalseStallOff() {
  const alive = sweep({ startedAt: STARTED, heartbeats: BUILDER_BEATS });
  assert.strictEqual(alive.minutesFrozen, 2,
    `0e57cedd's sweep is 03:53:12Z and the Builder's last beat 03:51, so minutes_frozen is 2; got ${alive.minutesFrozen}`);
  assert.strictEqual(alive.push, false,
    "a build that reported 2 minutes ago must NOT be pushed at John -- this is the nine shipped rows " +
    "that were alerted on");

  // THE CONTROL IS THE PRE-CHANGE WORLD, on the same row and the same clock.
  const silent = sweep({ startedAt: STARTED, heartbeats: [] });
  assert.strictEqual(silent.push, true,
    "with no step-7 heartbeat at all the same row must still trip the tripwire -- if it does not, the " +
    "fixture does not reproduce the defect and the arm above proves nothing");
  assert.strictEqual(silent.minutesFrozen, 36,
    `the silent row's basis is its own started_at 03:16:50Z, so 36 minutes; got ${silent.minutesFrozen}`);

  // ...and a build that genuinely DIED after one beat must still push. The heartbeat must not be
  // able to launder a stopped build into a healthy one.
  const died = sweep({ startedAt: STARTED, heartbeats: [Date.parse("2026-09-19T03:29:00Z")] });
  assert.strictEqual(died.minutesFrozen, 24,
    `a row whose last beat was 03:29 is 24 minutes frozen at the 03:53:12Z sweep; got ${died.minutesFrozen}`);
  assert.strictEqual(died.push, true,
    "24 minutes past the last heartbeat is over the 20-minute bar and MUST still push -- a heartbeat " +
    "that suppressed a real stall would be worse than no heartbeat");
}

// --- the charge arm: a reading is a delta, never the session total (SES-423 slice 3) ------------
//
// Measured, not invented: fd4e11f4 closed `shipped` at 07:50:48Z carrying est_tokens_dev
// 32,249,570, and a6af8e56 -- the SAME session, opened 07:51:34Z -- read 48,608,438 when its
// Builder returned. The shipped v7.0.531 rule charged reading 1 whole, so this row would have
// re-charged its predecessor's whole close.
export function chargeFor({ open, returned, close }) {
  const delta = (a, b) => (a === null || a === undefined || b === null || b === undefined ? null : b - a);
  return { dev: delta(open, returned), qa: delta(returned, close) };
}

function theChargeIsADeltaNotTheSessionTotal() {
  const FD_CLOSE = 32249570;          // fd4e11f4's own est_tokens_dev, read 07:48Z
  const RETURNED = 48608438;          // this session's get_session sum at ~08:00Z

  const charged = chargeFor({ open: FD_CLOSE, returned: RETURNED });
  assert.strictEqual(charged.dev, 16358868,
    `this cycle's est_tokens_dev is the GROWTH since its own INSERT (48,608,438 - 32,249,570 = ` +
    `16,358,868); got ${charged.dev}. A number at or above 32,249,570 is the session total.`);
  assert.ok(charged.dev < FD_CLOSE,
    "the delta must land BELOW the predecessor's close -- that inequality is the live QA check on " +
    "the shipped row, and only the session-total rule can fail it");

  // THE CHAIN, which is the whole defect: two cycles in one session must together charge the last
  // reading and not one token more.
  const first = chargeFor({ open: 0, returned: FD_CLOSE });
  assert.strictEqual(first.dev + charged.dev, RETURNED,
    `a two-cycle chain's charges must sum to the last reading (${RETURNED}); got ` +
    `${first.dev + charged.dev}`);

  // THE CONTROL IS THE PRE-CHANGE WORLD: charging reading 1 whole, on the same two readings.
  const sessionTotalRule = FD_CLOSE + RETURNED;
  assert.strictEqual(sessionTotalRule, 80858008,
    "the retired rule charges 32,249,570 + 48,608,438 = 80,858,008 for a session that spent " +
    "48,608,438 -- if this arithmetic does not reproduce, the fixture is not the defect");
  assert.ok(sessionTotalRule > RETURNED,
    "the retired rule must over-charge, or the delta rule fixes nothing");

  // A missing reading NULLs the column it feeds; it never falls back to the raw reading.
  assert.strictEqual(chargeFor({ returned: RETURNED }).dev, null,
    "no reading 0 means est_tokens_dev is NULL -- charging the raw reading is the defect itself");
  assert.strictEqual(chargeFor({ open: FD_CLOSE, returned: RETURNED }).qa, null,
    "no reading 2 means est_tokens_qa is NULL, never a number");
}

// --- the script's own contract, driven through the CLI ------------------------------------------
function runHeartbeat(args, env) {
  return spawnSync(process.execPath, [HEARTBEAT_REL, ...args], {
    cwd: ROOT, encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

function theExitCodesAreTheContract() {
  const uuid = "00000000-0000-4000-8000-000000000000";

  const noCycle = runHeartbeat(["--step=7 — builder: x"]);
  assert.strictEqual(noCycle.status, 2,
    `a missing --cycle must exit 2 (cannot run), never 0; got ${noCycle.status}: ${noCycle.stderr}`);

  const badUuid = runHeartbeat(["--cycle=not-a-uuid", "--step=7 — builder: x"]);
  assert.strictEqual(badUuid.status, 2,
    `a --cycle that is not a uuid must exit 2; got ${badUuid.status}: ${badUuid.stderr}`);

  const blankStep = runHeartbeat([`--cycle=${uuid}`, "--step=   "]);
  assert.strictEqual(blankStep.status, 2,
    `a blank --step must exit 2 -- the sweep prints last_step at John; got ${blankStep.status}`);

  // THE ARM THAT MATTERS: unset credentials must be 1 (ran, did not land), never 0. A heartbeat
  // that exits 0 without writing is worse than none -- the next sweep reads the old timestamp and
  // believes it.
  const noKey = runHeartbeat([`--cycle=${uuid}`, "--step=7 — builder: x"], { SUPABASE_SERVICE_KEY: "" });
  assert.strictEqual(noKey.status, 1,
    `an unset SUPABASE_SERVICE_KEY must exit 1, never 0; got ${noKey.status}: ${noKey.stderr}`);
  assert.ok(/did NOT land/.test(noKey.stderr),
    `the failure must SAY the heartbeat did not land; got: ${noKey.stderr}`);

  // The valid-argument path must NOT be refused by the parser -- otherwise the three arms above
  // would pass for a script that rejects everything.
  const wellFormed = runHeartbeat([`--cycle=${uuid}`, "--step=7 — builder: x"], { SUPABASE_SERVICE_KEY: "" });
  assert.strictEqual(wellFormed.status, 1,
    "well-formed arguments must get PAST the parser (exit 1 on credentials), not be refused as exit 2");
}

// The script must not run its CLI on import, and the runbook must reference it by name.
async function theScriptIsImportableAndReferenced(md) {
  const mod = await import(path.join(ROOT, HEARTBEAT_REL));
  assert.strictEqual(typeof mod.parseArgs, "function", "parseArgs must be exported for this guard to drive it");
  assert.ok(mod.parseArgs(["--cycle=00000000-0000-4000-8000-000000000000", "--step=x"]).error === undefined,
    "a well-formed pair must parse");
  assert.strictEqual(mod.landed([]), null,
    "0 rows back from a PATCH is a FAILURE, not an empty success -- PostgREST answers 200 with [] for " +
    "a cycle id that names no row");
  assert.ok(mod.landed([{ id: "x" }]), "one row back is the landing");
  assert.ok((md.split("cycle-heartbeat.js").length - 1) >= 2,
    "the runbook must name the script in step 7's task AND in the prose that says when to run it");
}

async function run() {
  const md = read(CYCLE_REL);
  const n = everyClauseHoldsOnTheShippedRunbook(md);
  everyClauseHasTeeth(md);
  theStampWasMovedNotDeleted(md);
  theHeartbeatsTurnTheFalseStallOff();
  theChargeIsADeltaNotTheSessionTotal();
  theExitCodesAreTheContract();
  await theScriptIsImportableAndReferenced(md);
  console.log(`[SES-423b] ${n} runbook clauses hold, each red under its own breaks(); 0e57cedd replays ` +
    `2 min / no push with the Builder's four beats and 36 min / push with none (24 / push after a lone ` +
    `03:29 beat); the charge arm reads 48,608,438 - 32,249,570 = 16,358,868 dev, chain sum = the last ` +
    `reading (the session-total rule charges 80,858,008), a missing reading NULLs its column; ` +
    `${HEARTBEAT_REL} exits 2/2/2 on bad args and 1 (never 0) with no credentials`);
}

selfRun(import.meta.url, run);
export default run;
