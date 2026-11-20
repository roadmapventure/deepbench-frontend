// DeepBench v7.0.1066 | tests/regression/agt-522-trial-pick-replayable.test.mjs | AGT-522 -- a lane trial picks build jobs it can actually replay: a cycle that shipped a push_sha under a real ticket, never the three newest failures.
//
// FEATURE: AGT-522 -- replayableRows() is the filter between the recorded log and pickJobs().
//
// WHAT WAS WRONG, MEASURED 2026-11-20 on the live log. The orchestrator lane still reads
// `claude-opus-5` and moves only on 3 of 3 passing replays. Today's dry run picks jobs 79579,
// 79578, 79577 -- cycles that `failed` with NO push_sha, so every replay scores `no-push-sha` and
// the lane can never move. The cause is the pick itself: it demanded both token columns, and of
// 77 build rows on that model in 21 days only those three carry them, while 68 token-less rows
// sit on cycles that genuinely shipped. The pick was selecting on a bookkeeping column instead of
// on whether the job is replayable at all.
//
// THE TWO HALVES OF THE REPAIR, and both are asserted here:
//   S2  a BUILD row needs no token columns (its baseline simply reads 0 tokens). A TURN row still
//       does -- arm B's `judgment` half is the control that proves the token gate survived where
//       it belongs rather than being deleted everywhere.
//   S3  replayableRows() keeps a build row only when its cycle is `shipped`, carries a push_sha,
//       and names a real ticket -- a cycle whose item_id is a uuid is a runner artefact, not a
//       ticket a replay can be scored against.
//
// NO LIVE READ, NO LIVE WRITE, NO MODEL CALL, NO CREDENTIALS (pattern:76). Every arm drives the
// real exported pickJobs(), replayableRows() and candidateWhy() over in-memory rows shaped like
// the ai_activity_log / runner_cycles projections the trial runner actually selects. Running the
// real trial would spend `claude -p` replays, and the trial's schedule is John's gate, not this
// suite's -- the seam is proved at the boundary that was broken instead.
//
// ARMS, each discriminating (docs/STANDARDS.md Section 4, the LOO-013 lesson -- assert WHICH
// branch fired, and print what was actually got):
//   P  PREMISE: the defect is reproduced, not assumed -- the unfiltered pick really does take the
//      three newest rows (19,18,17), whose cycles failed with no push_sha. If this arm ever fails
//      the premise is dead and the filter below is guarding nothing.
//   A  THE REPAIR: pickJobs() over replayableRows() takes 15,14,13 -- the three newest build rows
//      whose cycles shipped under a real ticket. CONTROLS, both measured: without S2 this arm
//      fails `A: got []` (every shipped row is token-less); with S3's shipped/push_sha/ticket
//      return made `return true;` it fails `A: got [19,18,17]`, the live defect in the message.
//   B  WHAT THE FILTER DOES AND DOES NOT TOUCH, both directions: replayableRows() returns
//      [15,14,13,9,8] -- the three replayable build rows AND both turn rows, which it must never
//      judge, since no runner_cycles row governs a design turn. The second half is the control:
//      the same filtered rows picked for the `judgment` lane are [9] alone, so row 8 was dropped
//      by the turn-row token gate S2 deliberately kept, not by the build filter.
//   C  A FAILED BUILD TRIAL SAYS WHY IN THE ANSWER'S OWN WORDS: candidateWhy() appends the
//      replay's outcome and its deviations (capped at 200 chars) to the score's reason. The
//      2026-11-06 candidates answered in 15-25 s and no reason was kept; this is that gap closed.
//
// BASELINE: ABSENT pre-build -- on the unchanged tree scripts/model-trial.js exports neither
// replayableRows nor candidateWhy, so this file cannot even import. Related set 6 of 6 green.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";

import { pickJobs, replayableRows, candidateWhy } from "../../scripts/model-trial.js";

const MODEL = "claude-opus-5";
const BUILD = "build-ticket:bd-build-intent:depth0";
const TURN = "design-kickoff:ds-kickoff-intent:depth0";

// A runner cycle id, shaped exactly like the uuid `visitor_id` the trial runner reads back out of
// ai_activity_log and joins to runner_cycles.id.
const cid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// created_at rises with the id, so "newest three" and "highest three ids" are the same claim and a
// wrong sort cannot pass by accident.
const row = (id, feature, tokens) => ({
  id,
  created_at: new Date(Date.UTC(2026, 10, 1, 0, id)).toISOString(),
  feature,
  model: MODEL,
  input_tokens: tokens,
  output_tokens: tokens,
  cache_creation_input_tokens: null,
  cache_read_input_tokens: null,
  latency_ms: 900000,
  visitor_id: cid(id),
});

// 19-17 carry both token columns (the only rows today's pick can see); 16-11 are token-less build
// rows; 9 and 8 are turn rows, one with tokens and one without.
const ROWS = [
  row(19, BUILD, 1000), row(18, BUILD, 1000), row(17, BUILD, 1000),
  row(16, BUILD, null), row(15, BUILD, null), row(14, BUILD, null),
  row(13, BUILD, null), row(12, BUILD, null), row(11, BUILD, null),
  row(9, TURN, 1000), row(8, TURN, null),
];

const SHA = "0123456789abcdef0123456789abcdef01234567";

// The runner_cycles projection the pick joins on: {id, outcome, push_sha, item_id}. 19-17 failed
// with no sha; 16 shipped but its item_id is a uuid (a runner artefact, not a ticket); 15-13 are
// the three genuine ships; 12 never settled an outcome; 11 has no cycle row at all.
const CYCLES = [
  { id: cid(19), outcome: "failed", push_sha: null, item_id: "AGT-700" },
  { id: cid(18), outcome: "failed", push_sha: null, item_id: "AGT-701" },
  { id: cid(17), outcome: "failed", push_sha: null, item_id: "AGT-702" },
  { id: cid(16), outcome: "shipped", push_sha: SHA, item_id: cid(999) },
  { id: cid(15), outcome: "shipped", push_sha: SHA, item_id: "AGT-522" },
  { id: cid(14), outcome: "shipped", push_sha: SHA, item_id: "DAT-30" },
  { id: cid(13), outcome: "shipped", push_sha: SHA, item_id: "SES-78a" },
  { id: cid(12), outcome: null, push_sha: SHA, item_id: "AGT-703" },
];

const ORCH = { jobKind: "lane", jobKey: "orchestrator", model: MODEL };
const JUDG = { jobKind: "lane", jobKey: "judgment", model: MODEL };

const idsOf = list => (list ?? []).map(r => r.id);

async function run() {
  const ARMS = {
    P: () => {
      const got = idsOf(pickJobs(ROWS, ORCH).jobs);
      assert.deepStrictEqual(
        got, [19, 18, 17],
        `got ${JSON.stringify(got)}, want [19,18,17] -- the unfiltered pick takes the three `
        + `newest build rows, whose cycles failed with no push_sha (premise of AGT-522)`,
      );
      // The premise is only alive if those three really are unreplayable.
      const bad = CYCLES.filter(c => [cid(19), cid(18), cid(17)].includes(c.id) && !c.push_sha);
      assert.strictEqual(
        bad.length, 3,
        `got ${JSON.stringify(bad.map(c => c.push_sha))}, want three cycles with no push_sha`,
      );
    },

    A: () => {
      const got = idsOf(pickJobs(replayableRows(ROWS, CYCLES), ORCH).jobs);
      assert.deepStrictEqual(
        got, [15, 14, 13],
        `got ${JSON.stringify(got)}, want [15,14,13] -- the three newest build rows whose cycles `
        + `shipped a push_sha under a real ticket`,
      );
    },

    B: () => {
      const kept = idsOf(replayableRows(ROWS, CYCLES));
      assert.deepStrictEqual(
        kept, [15, 14, 13, 9, 8],
        `got ${JSON.stringify(kept)}, want [15,14,13,9,8] -- the replayable build rows plus both `
        + `turn rows, which the cycle filter must never judge`,
      );
      // CONTROL: the turn-row token gate S2 kept is what drops row 8, not the build filter.
      const judged = idsOf(pickJobs(replayableRows(ROWS, CYCLES), JUDG).jobs);
      assert.deepStrictEqual(
        judged, [9],
        `got ${JSON.stringify(judged)}, want [9] -- a turn row still needs both token columns`,
      );
    },

    C: () => {
      const got = candidateWhy(
        { passed: false, why: "q" },
        { outcome: "blocked", deviations: "x".repeat(300) },
      );
      const want = `q; answer outcome blocked: ${"x".repeat(200)}`;
      assert.strictEqual(
        got, want,
        `got ${JSON.stringify(got)}, want ${JSON.stringify(want)} -- a failed trial carries the `
        + `replay's own outcome and its first 200 chars of deviations`,
      );
      // CONTROL: a passing score is untouched, so the appended reason cannot mask a pass.
      const pass = candidateWhy({ passed: true, why: "build-within-kickoff" }, { outcome: "pushed" });
      assert.strictEqual(
        pass, "build-within-kickoff",
        `got ${JSON.stringify(pass)}, want "build-within-kickoff" -- a passing score keeps its why`,
      );
    },
  };

  const passed = [], failed = [];
  for (const [name, fn] of Object.entries(ARMS)) {
    try { await fn(); passed.push(name); }
    catch (e) { failed.push(`${name}: ${e.message.split("\n")[0]}`); }
  }
  console.log(`  [AGT-522] ${passed.length} of ${Object.keys(ARMS).length} arms passed: ${passed.join(",") || "none"}`);
  if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
  return passed;
}

export default run;
selfRun(import.meta.url, run);
