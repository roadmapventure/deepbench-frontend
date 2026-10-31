// DeepBench v7.0.930 | tests/regression/agt-245-regrade-delivered.test.mjs | AGT-555 -- `--next` has a BOARD leg, so exit 3 is a fact about the board; clause (j) and the live clause's fall-through.
// DeepBench v7.0.799 | tests/regression/agt-245-regrade-delivered.test.mjs | AGT-304 slice 10 -- the live clause's pair must still be `delivered`, or no leg runs.
// DeepBench v7.0.705 | tests/regression/agt-245-regrade-delivered.test.mjs | AGT-245 slices 3-5 of 5
//
// FEATURE: ONE DELIVERED TICKET, RE-GRADED ON THE DELTA BETWEEN ITS OWN TWO TREES. 77 `delivered`
// tickets sit on a block whose only red gate is `regression`, and the suite has never been green on
// `dev` -- so an absolute exit code re-blocks all 77 forever. `scripts/regrade-delivered.js` runs the
// suite on the pair's base tree and on its ship tree, back to back inside ONE test slot, and grades
// the DIFFERENCE. That makes three things load-bearing, and each one is a way this can silently lie:
//
//   * WHICH TREE EACH LEG RAN ON. A script that ran both legs in the clone, or swapped them, produces
//     a perfectly well-formed payload that says nothing about the pair.
//   * WHAT COUNTS AS STANDING. A red the base leg also named is somebody else's -- UNLESS this
//     delivery changed that very test file, in which case the base tree ran a different file under
//     the same name and "standing" would launder the ship (docs/ARCHITECTURE.md §19v).
//   * THAT A PROBE CANNOT REACH THE LEDGER. `--suite=` exists to test the plumbing; if it could
//     write, the ledger would carry verdicts nobody graded.
//
// WHERE A LAZIER GUARD WOULD PASS VACUOUSLY, clause by clause.
//
// (a) THE PURE GRADE, FOUR CASES, AND THE FIRST TWO ARE EACH OTHER'S CONTROL. A red only on the ship
//     leg must be `newlyRed` and block; THE SAME red on both legs must be `standing` and approve. A
//     grader that called everything newly red passes the first alone; one that called everything
//     standing passes the second alone. The third case is the same both-legs input with the file
//     added to `ownTests` -- identical captures, opposite verdict, so the clause can only pass if
//     `ownTests` is actually read. The fourth pins the refusal: a prior block whose hygiene was red
//     rests on a gate no leg here ran, and carrying it forward as green would vouch for it.
//
// (b) `ran` IS NOT THE EXIT CODE. `run-all.js:153` prints `[NOT RUN] regression suite -- transport:
//     <why>` and exits 2 with no test result at all. An empty failing set off that run is "nobody
//     looked", never "nothing failed" -- and the delta must refuse it rather than grade it. A capture
//     carrying a `[PASS]` line is the control beside it, or "ran is always false" would pass.
//
// (c) THE PROBE FENCE, WITH THE CREDENTIALS REMOVED. `--suite=<anything but the default>` without
//     `--dry-run` must exit 2 by NAME before it reads a board -- so the child is spawned with no
//     SUPABASE_URL and no SUPABASE_SERVICE_KEY, which is how the clause proves the refusal comes
//     first rather than after a credential check that happened to also fail.
//
// (d) THE REAL TREES, AND THE SHA IS THE DISCRIMINATOR (the kickoff's §6 bar). Two `--next` dry-runs
//     on THE PAIR THAT LANE WILL ACTUALLY PICK -- which is no longer `AGT-101`, and that is a
//     consequence of slice 4 rather than a preference: fence (b) refuses a ticket whose newest verdict
//     is no longer the cohort's, and slice 4's own re-grade row IS a newer verdict for `AGT-101`. Since
//     AGT-555 it is no longer a cohort row at all: all 71 are answered, so the pick comes off the
//     BOARD leg (`AGT-432`, one of 7 pairable predicate matches outside the file on 2026-10-31), and
//     the clause walks the script's own two legs at runtime instead of pinning a ticket. `--ticket=`
//     could not reach such a pair -- `pairFor` reads the frozen file and answers `not-in-cohort` --
//     so the runs are `--next`, which is also the flag the tail runs. The supersede is asserted in its
//     own right below. Read as: two dry-runs on a real pair `<base>` → `<ship>`. The first `--suite=` prints the CHECKED-OUT
//     TREE'S OWN SHA as a failing test name: the base leg must name `tree-7bddd226.test.mjs` and the
//     ship leg `tree-119ed083.test.mjs`, so the payload can only come out `newlyRed:
//     ["tree-119ed083.test.mjs"]` / `standing: []` if each leg really ran in its own worktree -- a
//     script that ran both legs on one tree prints one sha twice (standing, approve) and one that
//     swapped them names `tree-7bddd226`. The second probe prints a CONSTANT name on both legs and
//     must therefore approve on `standing: ["same.test.mjs"]`, which is the negative control: the
//     first probe's block comes from the trees differing, not from the script blocking on anything it
//     sees. `AGT-101`'s `runner_verdicts` rows are counted before and after both runs and must be
//     EQUAL -- `--dry-run` wrote nothing, asserted rather than assumed.
//
//     DEVIATION FROM THE KICKOFF, DELIBERATE AND MEASURED: the kickoff's §5 task 4(d) probe command
//     is a bare `console.log(...)`, which exits 0. Run exactly as written it produces
//     `verdict: "approve"`, `newlyRed: null` -- because §4's own formula feeds the ship leg's exit
//     code through `gateStatus` into `regressionDelta`, which leaves any non-red absolute untouched
//     (AGT-170's fail-closed clause). §6's stated expectation ("the sha probe names the ship tree
//     newly red") is therefore unreachable with an exit-0 probe. `;process.exit(1)` is appended to
//     both probes, which is also what a real suite does when it prints a `[FAIL]` line -- the probe
//     now imitates `run-all.js` in the one respect the grade reads. §4's formula ships unchanged.
//
// (e) THE COHORT'S REFUSAL IS THE SCRIPT'S REFUSAL. `AGT-202` is `refused: no-version` in the frozen
//     cohort; the script must exit 2 naming `no-version` rather than falling back to `graded_sha` for
//     a pair -- which would hand a peer's tree to the suite wearing this ticket's id.
//
// (f) THE TAIL CARRIES THE STEP. A script nobody is told to run is a script nobody runs, so the
//     `(7a-ter)` paragraph has to sit IN the serial tail -- after `(7a-bis)` and before the
//     `sweep_decision_windows(` call whose window the ship decision it writes is for. The `SES-158`
//     control strips the command line and the arm must THROW: a clause that still passes without the
//     command is pinning prose, not the step.
//
// (g) THE ROW IS IN THE LEDGER (slice 4). `AGT-101` carried exactly ONE verdict row -- the `v7.0.563`
//     block -- and no ship decision, so a slice that ran both legs and wrote nothing leaves the count
//     at 1 and this arm goes red. The `reasoning` prefix pins WHICH lane wrote the row and WHICH pair
//     it graded, and `graded_sha` must be the pair's ship tree rather than dev HEAD: a row from the
//     ordinary verifier, or a re-grade of a different pair, fails here. Prefix and sha are DERIVED
//     from the frozen cohort, never pasted, so a re-freeze that moved the pair fails instead of
//     silently vouching for the old one.
//
// (h) THE PICKER WALKS IN ORDER (slice 5). `--next` is what lets the tail run this EVERY cycle with
//     nothing to name, and its one failure mode is invisible: a picker that re-hands a pair already
//     answered re-grades the same ticket forever, and one that walks a row too far leaves a pair
//     unrun forever, because nothing in this lane ever walks backwards. The three cases differ ONLY
//     in which ids are already re-graded and each names a DIFFERENT id, so no single wrong picker
//     passes more than one; three more mutations prove a permanently-refusable row is stepped OVER
//     with its reason reported rather than parked on, which is the whole of the drain.
//
// (i) THE SECOND ROW IS IN THE LEDGER (slice 5). Exactly ONE `AGT-245 delta re-grade of` row existed
//     board-wide before this slice; a slice whose `--next` ran both legs of `AGT-100` and wrote
//     nothing leaves that count at 1 and this arm goes red. Same shape as (g) -- prefix and
//     `graded_sha` derived from the frozen cohort, never pasted -- plus the board-wide count, which
//     is the only assertion that says the DRAIN moved rather than that one row exists.
//
// (j) THE BOARD LEG, AND BOTH DIRECTIONS OF IT (AGT-555). The frozen file was measured on
//     2026-09-28 and every one of its 71 rows is now answered or refused, so the file leg alone can
//     only return exit 3 -- while 88 delivered tickets satisfied the file's own stored predicate on
//     2026-10-31. `--next` therefore falls through to a board leg, and this clause is two pure arms
//     over a HAND-BUILT census and a hand-built log, because both of its failure modes are invisible
//     from a green run:
//       * A board leg that re-derived a pair for a row the frozen file REFUSED would loosen an
//         AGT-245 refusal without anybody deciding to -- slice 1 measured those refusals against the
//         git log. So arm (i) runs the SAME census twice, differing only in whether the file holds
//         that id among its REFUSED rows: pair, then nothing. The same census with the id already
//         carrying one of this lane's own rows must also return nothing, or a graded pair is re-graded
//         every cycle forever.
//       * A DRAINED that counted only what it could pair would be the same false sentence AGT-555
//         was filed against. So arm (ii) exhausts the board and asserts the exit-3 payload is
//         `board-drained` AND carries the census, with `board_unreachable` naming the reason class
//         and `no_verdict_row` the delivered rows the predicate never saw -- present, not dropped.
//
// NOT DONE HERE, and named rather than skipped: the WRITE path. Both live runs are `--dry-run`, and
// `--suite=` can never record by construction. A permanent regression test does not write the live
// verdict ledger (ses-315 / ses-320's standing refusal) -- slice 4 is the first real pair with the
// write, and this file asserts the row count is unchanged instead.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  deltaVerdict, legNames, pairFor, nextPair, boardPair, boardDrained, REGRADE_PREFIX, DEFAULT_SUITE,
} from "../../scripts/regrade-delivered.js";
import { COHORT_PATH, readBoardCensus, parseLog, isOwnSubject } from "../../scripts/regrade-cohort.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "regrade-delivered.js");
const CYCLE = "c0e2aa82-1940-4ac6-97bd-575d4b1d4e42";

// AGT-101's frozen pair, re-read from the cohort file rather than pasted, so a re-freeze that moved
// the pair fails here instead of silently grading a different one.
const TICKET = "AGT-101";
// Slice 5's pair: the cohort's FIRST row, which is what `--next` must reach past AGT-101.
const NEXT_TICKET = "AGT-100";

const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const TER_MARKER = "**(7a-ter) DELTA RE-GRADE";
const BIS_MARKER = "**(7a-bis) RE-GRADE";
const SWEEP_HEADING = "**(7b) SWEEP";
const norm = s => String(s).replace(/\s+/g, " ");

const PRIOR_GREEN = { build: "green", regression: "red", hygiene: "green" };
const leg = (fails, notRun = []) => ({ ran: true, fails, notRun });

// The probes. `;process.exit(1)` is the deviation clause (d) documents: a suite that names a failing
// test exits non-zero, and §4's formula reads that exit code.
const SHA_PROBE =
  `node -e "console.log('[FAIL] tree-'+require('child_process').execSync('git rev-parse --short=8 HEAD')` +
  `.toString().trim()+'.test.mjs -- probe');process.exit(1)"`;
const CONSTANT_PROBE = `node -e "console.log('[FAIL] same.test.mjs -- probe');process.exit(1)"`;

function runScript(args, { env = process.env } = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status, stdout: String(r.stdout || ""), stderr: String(r.stderr || "") };
}

// STDOUT IS THE PAYLOAD under --json (the script routes its progress lines to stderr), so this is a
// straight parse and a stray prose line on stdout is a failure rather than something to skip past.
function payloadOf(res) {
  const text = res.stdout.trim();
  assert.ok(text, `the run printed no payload on stdout; stderr was: ${res.stderr.slice(0, 500)}`);
  return JSON.parse(text);
}

async function countVerdicts(base, key, ticket) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/runner_verdicts?select=id&backlog_id=eq.${ticket}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  assert.equal(res.status, 200, `runner_verdicts count read answered HTTP ${res.status}`);
  return (await res.json()).length;
}

// (f) The tail's own paragraph. The marker is the PARAGRAPH's, not the bare label: the serial-tail
// enumeration names `(7a-ter)` too, and anchoring on that would cut a span out of the list.
export function theTailCarriesTheDeltaRegrade(md) {
  const at = md.indexOf(TER_MARKER);
  assert.ok(at >= 0,
    `${RUNBOOK_REL} carries no "${TER_MARKER}" paragraph -- AGT-245's step has to live IN the serial ` +
      "tail, not in a script nobody is told to run");
  const bis = md.indexOf(BIS_MARKER);
  assert.ok(bis >= 0 && bis < at,
    `${RUNBOOK_REL}'s (7a-bis) paragraph is at ${bis} and (7a-ter) at ${at}: the free re-grade lane is ` +
      "read first, and the delta lane is the one that runs when it returned nothing");
  const sweep = md.indexOf("sweep_decision_windows(");
  assert.ok(sweep > at,
    `${RUNBOOK_REL}'s (7a-ter) paragraph is at ${at} but the sweep call is at ${sweep}. The re-grade runs ` +
      "BEFORE the sweep: the ship decision it writes opens a window a later tail closes, and a step " +
      "placed after the sweep is one the drain's terminating cycle never reaches");
  const end = md.indexOf(SWEEP_HEADING, at);
  assert.ok(end > at, `${RUNBOOK_REL}'s (7a-ter) paragraph is not followed by the "${SWEEP_HEADING}" heading`);
  const span = norm(md.slice(at, end));
  const required = [
    ["scripts/regrade-delivered.js", "the command the cycle actually runs -- the whole point of putting the step here"],
    ["--next", "slice 5: the tail runs this EVERY cycle with nothing to name, and a step that still "
      + "spelled --ticket= would be one no unattended cycle could run"],
    ["--cycle-id=", "the verdict row and the ship decision both hang off the cycle"],
    ["ONE test slot for BOTH legs", "one acquisition across base and ship: a pair that releases the line " +
      "between its legs races a peer cycle's suite, which is the one thing that line exists to stop"],
  ];
  for (const [needle, why] of required) {
    assert.ok(span.includes(needle),
      `${RUNBOOK_REL}'s (7a-ter) paragraph does not name \`${needle}\` -- ${why}`);
  }
  return span.length;
}

// (g) The row slice 4 wrote. Credentialed; the prefix and the sha are derived from the frozen cohort.
export async function theRowIsInTheLedger(base, key) {
  const cohort = JSON.parse(fs.readFileSync(path.join(ROOT, COHORT_PATH), "utf8"));
  const pair = pairFor(cohort, TICKET);
  assert.ok(!pair.refuse, `${TICKET} must still resolve to a pair in the frozen cohort`);
  const prefix = `AGT-245 delta re-grade of ${TICKET}: prior ${pair.verdict_id} (${pair.version}); base ${pair.base_sha}`;
  const res = await fetch(
    `${base.replace(/\/+$/, "")}/rest/v1/runner_verdicts?select=id,created_at,verdict,reasoning,graded_sha` +
      `&backlog_id=eq.${TICKET}&order=created_at.desc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  assert.equal(res.status, 200, `runner_verdicts read answered HTTP ${res.status}`);
  const rows = await res.json();
  assert.ok(rows.length >= 2,
    `${TICKET} must carry at least TWO runner_verdicts rows -- the ${pair.version} block and AGT-245's delta ` +
      `re-grade of it -- and it carries ${rows.length}. A slice that ran both legs and recorded nothing leaves ` +
      "this at 1, which is exactly what this arm exists to catch");
  const row = rows[0];
  assert.ok(String(row.reasoning || "").startsWith(prefix),
    `${TICKET}'s newest verdict does not open with ${JSON.stringify(prefix)} -- so it was not written by this ` +
      `lane about this pair. It reads: ${JSON.stringify(String(row.reasoning || "").slice(0, 160))}`);
  assert.equal(row.graded_sha, pair.ship_sha,
    `the re-grade must be filed against the pair's SHIP tree ${String(pair.ship_sha).slice(0, 8)}, never dev HEAD -- ` +
      "a row from the ordinary verifier carries whatever was pushed last, which is a peer's tree");
  return { rows: rows.length, id: row.id, verdict: row.verdict };
}

// The live clause's pair, chosen on the board rather than pinned, THROUGH BOTH OF `--next`'s LEGS
// (AGT-555). `AGT-101`'s cohort row is stale for it from slice 4 onward (see the header's (d)) and
// every other cohort row is now answered too, so a clause that could only look inside the frozen file
// would have nothing left to grade -- which is precisely the BASELINE red this ticket clears. So the
// walk is the script's own: `nextPair` over the frozen file with the live board's facts, and when that
// is empty `boardPair` over the re-measured predicate. Same functions, same order, so the pick this
// clause expects and the pick the child process makes cannot drift apart; the thing that proves the
// run is real is the sha probe below, not this derivation.
async function firstEligiblePair(url, key, cohort) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${q}`, { headers });
    assert.equal(res.status, 200, `the live read \`${q.slice(0, 80)}\` answered HTTP ${res.status}`);
    return res.json();
  };
  const git = args => spawnSync("git", ["-C", ROOT, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const resolved = (cohort.rows || []).filter(r => r && r.status === "resolved");
  const ids = [...new Set(resolved.map(r => String(r.backlog_id)).filter(id => /^[A-Za-z0-9._-]+$/.test(id)))];
  const inList = `in.(${ids.join(",")})`;

  // Leg 1, the frozen file -- the script's own pre-filter, read once for every resolved id.
  const verdicts = await get(`runner_verdicts?select=id,backlog_id,created_at,reasoning&backlog_id=${inList}` +
    "&order=created_at.desc&limit=5000");
  const latestById = {};
  const regraded = new Set();
  for (const row of verdicts) {
    const id = String(row.backlog_id);
    if (!(id in latestById)) latestById[id] = String(row.id);
    if (String(row.reasoning || "").startsWith(REGRADE_PREFIX)) regraded.add(id);
  }
  const statusById = {};
  for (const row of await get(`backlog_items?select=backlog_id,status&backlog_id=${inList}&limit=5000`)) {
    statusById[String(row.backlog_id)] = row.status;
  }
  // Both legs share one node_modules, so a pair that moved `package.json` is refused by the script
  // (fence (c)) and is not a probe pair.
  const depsClean = row => {
    const d = git(["diff", "--name-only", row.base_sha, row.ship_sha, "--", "package.json", "package-lock.json"]);
    return d.status === 0 && !String(d.stdout || "").trim();
  };
  let pair = nextPair(cohort, { regraded, latestById, statusById, depsClean }).pair;
  let leg = "the frozen cohort";
  let census = null;

  // Leg 2, the board -- the live predicate re-measured, the file's ids (in ANY status) and this
  // lane's own answered ids dropped, each survivor's pair resolved from the commit subjects.
  if (!pair) {
    census = await readBoardCensus(url, key);
    const lane = await get(`runner_verdicts?select=backlog_id&reasoning=like.${encodeURIComponent(`${REGRADE_PREFIX}%`)}&limit=20000`);
    const answered = new Set(regraded);
    for (const row of lane) answered.add(String(row.backlog_id));
    const walked = git(["log", "--format=%H %P %s", "HEAD"]);
    assert.equal(walked.status, 0, "git log for the board leg must be readable in this clone");
    const board = boardPair({ census, cohort, regraded: answered, log: parseLog(String(walked.stdout || "")) });
    pair = board.pair;
    leg = "the live board";
    census = board.census;
  }
  if (!pair) return { pair: null, census };
  const diff = git(["diff", "--name-only", pair.base_sha, pair.ship_sha]);
  assert.equal(diff.status, 0, `git diff for ${pair.backlog_id}'s pair must be readable in this clone`);
  const ownTests = String(diff.stdout || "").split("\n").map(s => s.trim())
    .filter(f => f.startsWith("tests/regression/") && /\.m?js$/.test(f));
  // THE PAIR IS THIS TICKET'S OWN SHIP, asserted rather than assumed: a board pair resolved off a
  // peer's commit would grade somebody else's tree under this id, which is the one thing AGT-245's
  // subject-based resolver exists to prevent.
  const subject = git(["log", "-1", "--format=%s", pair.ship_sha]);
  assert.equal(subject.status, 0, `the ship commit ${String(pair.ship_sha).slice(0, 8)} must be in this clone`);
  assert.ok(isOwnSubject(String(subject.stdout || "").trim(), pair.version, pair.backlog_id),
    `${pair.backlog_id}'s ship commit subject ${JSON.stringify(String(subject.stdout || "").trim().slice(0, 90))} is not its OWN ` +
      `(${pair.version} + ${pair.backlog_id}) — a pair resolved off a peer's commit grades a tree this ticket never shipped`);
  return { pair: { ...pair, ownTests }, census, leg };
}

// (j) THE BOARD LEG, BOTH DIRECTIONS, PURE (AGT-555). No network and no clone: the census, the frozen
// file and the log are all hand-built, so the walk is asserted rather than whatever today's board
// happens to hold. See the header's (j) for why each arm is the control of the other.
export function theBoardLegPicksAndRefuses() {
  // Three commits, newest first, exactly `git log --format=%H %P %s HEAD` order. The root line has an
  // empty `%P`, which is the double space.
  const log = parseLog([
    "aaaa1111 bbbb2222 v9.9.9 AGT-900 the board pair's own ship",
    "bbbb2222 cccc3333 v9.9.8 AGT-899 a peer's commit — the pair's base tree",
    "cccc3333  v9.9.7 AGT-898 the root of this hand-built history",
  ].join("\n"));
  const match = (id, version) => ({
    id: `verdict-${id}`, backlog_id: id, version, created_at: "2026-10-30T00:00:00Z",
    verdict: "block", gate_build: "green", gate_hygiene: "green", gate_regression: "red",
    graded_sha: "aaaa1111",
  });
  // AGT-900 pairs (its version+id is in the log); AGT-901 cannot (nothing in the log is its own), so
  // it is the census's `board_unreachable` row. AGT-902/903 are delivered with NO verdict row at all.
  const census = {
    delivered: ["AGT-900", "AGT-901", "AGT-902", "AGT-903"],
    matches: [match("AGT-900", "v9.9.9"), match("AGT-901", "v9.9.5")],
    noVerdict: ["AGT-902", "AGT-903"],
  };

  // (i) THE PICK. An id the predicate matches, the file never held and this lane never answered.
  const picked = boardPair({ census, cohort: { rows: [] }, regraded: new Set(), log });
  assert.equal(picked.pair && picked.pair.backlog_id, "AGT-900",
    "a predicate-matching, unanswered, pairable board row IS the pick — the whole of AGT-555 is that this row has a lane");
  assert.equal(picked.pair.ship_sha, "aaaa1111", "the ship is its own commit, resolved from the subject");
  assert.equal(picked.pair.base_sha, "bbbb2222", "and the base is that commit's first parent, never `graded_sha`");
  assert.equal(picked.pair.status, "resolved");
  assert.equal(picked.pair.verdict_id, "verdict-AGT-900",
    "carrying the census row's own verdict id, which is what fence (b) re-checks the pick against");

  // THE CONTROL, and it is the load-bearing half: the SAME census, with that id among the frozen
  // file's REFUSED rows. A refusal slice 1 measured stays a refusal.
  const refused = boardPair({
    census, log, regraded: new Set(),
    cohort: { rows: [{ backlog_id: "AGT-900", status: "refused", reason: "interleaved: feedface" }] },
  });
  assert.equal(refused.pair, null,
    "a row the frozen file REFUSED must not be re-derived through the board leg — slice 1 measured that refusal against " +
      "the git log, and a board pair for it would loosen an AGT-245 refusal nobody decided to loosen");
  assert.equal(refused.census.answered_in_file, 1, "it is counted as answered, not as unreachable");

  // The same drop for a row this lane has already graded: its ledger row IS the record, so a picker
  // that ignored it would re-grade the same pair every cycle forever.
  assert.equal(boardPair({ census, cohort: { rows: [] }, regraded: new Set(["AGT-900"]), log }).pair, null,
    "a board row this lane already answered is dropped — the re-grade row is the record, and a second look at it " +
      "would be the same pair graded every cycle from now on");

  // (ii) THE DRAIN, AND ITS CENSUS. Every match answered or unpairable => no pair, and exit 3's
  // payload has to SAY what it could not reach.
  const drained = boardPair({
    census, log, regraded: new Set(),
    cohort: { rows: [{ backlog_id: "AGT-900", status: "refused", reason: "no-version" }] },
  });
  assert.equal(drained.pair, null, "with every match answered or unpairable the board is drained");
  const payload = boardDrained({ skipped: [["AGT-100", "already-regraded"]], census: drained.census });
  assert.equal(payload.kind, "board-drained",
    "and exit 3 now says BOARD — `cohort-drained` was a fact about a file frozen on 2026-09-28 while 88 board rows matched its own predicate");
  assert.equal(payload.exitCode, 3, "still a 3: the lane finished, it did not fail");
  assert.equal(payload.ticket, null);
  assert.equal(payload.recorded, false, "a drained walk records nothing");
  assert.deepEqual(payload.census.board_unreachable, { "no-own-commit": 1 },
    "the row that could not be paired is REPORTED with its reason class, never skipped silently — a DRAINED that counted " +
      "only the pairable rows is the same false sentence AGT-555 was filed against");
  assert.equal(payload.census.no_verdict_row, 2,
    "and so are the delivered rows the predicate never saw at all, which are invisible to it by construction");
  assert.equal(payload.census.delivered, 4, "the census names the whole delivered board");
  assert.equal(payload.census.predicate_matches, 2, "and how many of it the predicate matched");
  assert.equal(payload.census.answered_in_file, 1);
  return { picked: picked.pair.backlog_id, census: payload.census };
}

// (h) THE PICKER WALKS IN ORDER (slice 5). Pure, no credentials, over the REAL frozen cohort -- the
// board is hand-built so the walk is asserted rather than whatever today's ledger happens to say.
//
// WHY THE CONTROL IS THE LOAD-BEARING HALF. `AGT-101` is the one cohort row this lane has already
// answered and `AGT-100` is the row above it, so a picker that ignored `regraded` entirely returns
// `AGT-101` (grading the same pair twice), and one that skipped a row too far returns `AGT-102`
// (leaving `AGT-100` unrun forever, since nothing ever walks backwards). The three cases differ only
// in the `regraded` set and each names a DIFFERENT id, so no single wrong picker passes more than one.
export function thePickerWalksInOrder(cohort) {
  const resolved = (cohort.rows || []).filter(r => r && r.status === "resolved");
  assert.ok(resolved.length >= 3, `the frozen cohort must still hold at least three resolved rows; it holds ${resolved.length}`);
  assert.equal(resolved[0].backlog_id, NEXT_TICKET, `the cohort's first resolved row must still be ${NEXT_TICKET}`);
  assert.equal(resolved[1].backlog_id, TICKET, `and the second must still be ${TICKET}, the row slice 4 answered`);
  // The board every case starts from: every resolved row current, delivered and dependency-clean, so
  // the ONLY thing moving between the three cases below is which ids are already re-graded.
  const latestById = Object.fromEntries(resolved.map(r => [String(r.backlog_id), String(r.verdict_id)]));
  const statusById = Object.fromEntries(resolved.map(r => [String(r.backlog_id), "delivered"]));
  const board = regraded => nextPair(cohort, { regraded: new Set(regraded), latestById, statusById, depsClean: () => true });

  // CONTROL, and it runs first: with only slice 4's row on the board the pick is AGT-100, never a
  // later one. A picker that walked past an eligible row fails here while still passing the case below.
  const control = board([TICKET]);
  assert.equal(control.pair && control.pair.backlog_id, NEXT_TICKET,
    `with only ${TICKET} re-graded the pick is ${NEXT_TICKET}, the first eligible row -- a pick further down the file ` +
      "leaves an eligible pair unrun forever, because nothing in this lane ever walks backwards");
  assert.deepEqual(control.skipped, [], `and nothing above ${NEXT_TICKET} is skipped -- it IS the first row`);

  // One more answered, one row further on.
  const second = board([NEXT_TICKET, TICKET]);
  assert.equal(second.pair && second.pair.backlog_id, resolved[2].backlog_id,
    `with ${NEXT_TICKET} and ${TICKET} both re-graded the pick moves to ${resolved[2].backlog_id} -- a picker that ` +
      "ignored `regraded` would hand back a pair this lane has already answered and re-grade it every cycle");
  assert.deepEqual(second.skipped, [[NEXT_TICKET, "already-regraded"], [TICKET, "already-regraded"]],
    "and both are reported BY REASON rather than silently jumped -- a skip nobody can see is a drain nobody can audit");

  // Drained: `pair: null`, which the script turns into exit 3 rather than a refusal.
  const drained = board(resolved.map(r => r.backlog_id));
  assert.equal(drained.pair, null, "every resolved row answered is a DRAINED cohort, not a refusal");
  assert.equal(drained.skipped.length, resolved.length, "and every row is accounted for in the skip list");

  // The three permanently-refusable reasons, each skipped PAST rather than parked on (Designer's call
  // 2). Each mutation moves exactly one row out of the way and the pick must step over it.
  const one = why => {
    const latest = { ...latestById }, status = { ...statusById };
    let deps = () => true;
    if (why === "superseded") latest[NEXT_TICKET] = "a-newer-row";
    if (why === "not-delivered") status[NEXT_TICKET] = "done";
    if (why === "deps-changed") deps = row => String(row.backlog_id) !== NEXT_TICKET;
    const got = nextPair(cohort, { regraded: new Set([TICKET]), latestById: latest, statusById: status, depsClean: deps });
    assert.equal(got.pair && got.pair.backlog_id, resolved[2].backlog_id,
      `a ${why} row must be stepped OVER, not parked on: a picker that stopped there would return the same refusal ` +
        "every cycle from now on and the 48 pairs below it would never be reached");
    assert.deepEqual(got.skipped, [[NEXT_TICKET, why], [TICKET, "already-regraded"]],
      `and the skip names \`${why}\` -- the reason is the only thing that distinguishes a drained cohort from a stuck one`);
  };
  one("superseded");
  one("not-delivered");
  one("deps-changed");
  return { resolved: resolved.length, first: NEXT_TICKET };
}

// (i) THE SECOND ROW IS IN THE LEDGER (slice 5). Credentialed. Exactly ONE `AGT-245 delta re-grade of`
// row existed board-wide before this slice ran, so a slice that walked both legs of AGT-100 and wrote
// nothing leaves the count at 1 and this arm goes red. `graded_sha` must be the pair's SHIP tree, not
// dev HEAD: a row from the ordinary verifier carries whatever was pushed last, which is a peer's tree.
export async function theSecondRowIsInTheLedger(base, key) {
  const cohort = JSON.parse(fs.readFileSync(path.join(ROOT, COHORT_PATH), "utf8"));
  const pair = pairFor(cohort, NEXT_TICKET);
  assert.ok(!pair.refuse, `${NEXT_TICKET} must still resolve to a pair in the frozen cohort`);
  const prefix = `${REGRADE_PREFIX}${NEXT_TICKET}: prior ${pair.verdict_id} (${pair.version}); base ${pair.base_sha}`;
  const url = base.replace(/\/+$/, "");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const res = await fetch(
    `${url}/rest/v1/runner_verdicts?select=id,created_at,verdict,reasoning,graded_sha&backlog_id=eq.${NEXT_TICKET}` +
      "&order=created_at.desc", { headers });
  assert.equal(res.status, 200, `runner_verdicts read answered HTTP ${res.status}`);
  const rows = await res.json();
  assert.ok(rows.length >= 2,
    `${NEXT_TICKET} must carry at least TWO runner_verdicts rows -- the ${pair.version} block and AGT-245's delta ` +
      `re-grade of it -- and it carries ${rows.length}. A --next that graded both legs and recorded nothing leaves this at 1`);
  const row = rows[0];
  assert.ok(String(row.reasoning || "").startsWith(prefix),
    `${NEXT_TICKET}'s newest verdict does not open with ${JSON.stringify(prefix)} -- so it was not written by this lane ` +
      `about this pair. It reads: ${JSON.stringify(String(row.reasoning || "").slice(0, 160))}`);
  assert.equal(row.graded_sha, pair.ship_sha,
    `the re-grade must be filed against the pair's SHIP tree ${String(pair.ship_sha).slice(0, 8)}, never dev HEAD`);

  // THE COUNT IS THE DRAIN. Board-wide, this lane's rows must now be at least TWO: slice 4's AGT-101
  // and slice 5's AGT-100. One means the tail ran and wrote nothing, which is the failure this whole
  // slice exists to make impossible.
  const all = await fetch(
    `${url}/rest/v1/runner_verdicts?select=id,backlog_id&reasoning=like.${encodeURIComponent(`${REGRADE_PREFIX}%`)}`,
    { headers });
  assert.equal(all.status, 200, `the board-wide re-grade count answered HTTP ${all.status}`);
  const lane = await all.json();
  assert.ok(lane.length >= 2,
    `the board must carry at least TWO ${JSON.stringify(REGRADE_PREFIX)} rows once the cohort has drained a second pair ` +
      `-- it carries ${lane.length}. Exactly one existed before this slice, so this is the count that proves the drain moved`);
  return { rows: rows.length, id: row.id, verdict: row.verdict, lane: lane.length };
}

async function run() {
  // ---- (a) the pure grade, four cases ----------------------------------------------------------
  const shipOnly = deltaVerdict({
    prior: PRIOR_GREEN, base: leg(["standing-a.test.mjs"]), ship: leg(["standing-a.test.mjs", "fresh.test.mjs"]),
    shipExit: 1, ownTests: [],
  });
  assert.equal(shipOnly.ok, true, "a prior block that was regression-only must be gradable");
  assert.deepEqual(shipOnly.delta.newlyRed, ["fresh.test.mjs"], "a red only the SHIP leg named is this delivery's");
  assert.deepEqual(shipOnly.delta.standing, ["standing-a.test.mjs"], "and the red both legs named is standing");
  assert.equal(shipOnly.delta.status, "red");
  assert.equal(shipOnly.verdict, "block", "a newly red test blocks");
  assert.deepEqual(shipOnly.gateResults, { build: "green", hygiene: "green", regression: "red" },
    "build and hygiene are carried from the prior verdict — this lane re-grades regression alone");

  const bothLegs = deltaVerdict({
    prior: PRIOR_GREEN, base: leg(["standing-a.test.mjs"]), ship: leg(["standing-a.test.mjs"]),
    shipExit: 1, ownTests: [],
  });
  assert.deepEqual(bothLegs.delta.standing, ["standing-a.test.mjs"],
    "CONTROL: the same red on BOTH legs is standing — without this, a grader that called everything newly red passes (a)");
  assert.deepEqual(bothLegs.delta.newlyRed, [], "and nothing is newly red");
  assert.equal(bothLegs.delta.status, "green", "the delta clears the gate the absolute exit code could not");
  assert.equal(bothLegs.verdict, "approve");

  // The SAME captures as bothLegs, with the failing file in this delivery's own diff.
  const ownFile = deltaVerdict({
    prior: PRIOR_GREEN, base: leg(["standing-a.test.mjs"]), ship: leg(["standing-a.test.mjs"]),
    shipExit: 1, ownTests: ["tests/regression/standing-a.test.mjs"],
  });
  assert.deepEqual(ownFile.delta.newlyRed, ["standing-a.test.mjs"],
    "a red whose FILE this delivery changed is newly red however the base leg graded that name — the base tree ran a different file");
  assert.deepEqual(ownFile.delta.standing, [], "and it is removed from standing, never left in both lists");
  assert.equal(ownFile.verdict, "block",
    "identical captures to the approve above, opposite verdict: the clause can only pass if ownTests is read");
  assert.ok(/THIS DELIVERY CHANGED/.test(ownFile.delta.reason), "and the reason says why, by name");

  const hygieneRed = deltaVerdict({
    prior: { build: "green", regression: "red", hygiene: "red" },
    base: leg([]), ship: leg([]), shipExit: 0, ownTests: [],
  });
  assert.equal(hygieneRed.ok, false, "a prior block resting on hygiene is not this lane's to re-grade");
  assert.equal(hygieneRed.kind, "not-regression-only", "and the refusal names itself");
  assert.equal(hygieneRed.gateResults, null, "a refusal publishes no gate results — a carried-forward green would vouch for a gate nobody ran");
  assert.equal(deltaVerdict({ prior: { build: "red", regression: "red", hygiene: "green" }, base: leg([]), ship: leg([]), shipExit: 1 }).ok,
    false, "the same refusal on the build half");

  // ---- (b) `ran` is not the exit code ----------------------------------------------------------
  const transport = legNames("  [NOT RUN] regression suite -- transport: no test slot in 45 min (yellow)\n");
  assert.equal(transport.ran, false,
    "a suite that never started named no test, and an empty failing set off it is `nobody looked`, not `nothing failed`");
  assert.deepEqual(transport.fails, []);
  const real = legNames("  [PASS] agt-1.test.mjs\n  [FAIL] agt-2.test.mjs -- boom\nNOT A FULL RUN: 1 test (agt-3.test.mjs)\n");
  assert.equal(real.ran, true, "CONTROL: a capture with a [PASS] line DID run, or `ran` is just always false");
  assert.deepEqual(real.fails, ["agt-2.test.mjs"]);
  assert.deepEqual(real.notRun, ["agt-3.test.mjs"], "the not-run set is the suite's own notice");
  assert.deepEqual(legNames("  [FAIL] agt-2.test.mjs -- boom\nNOT A FULL RUN: 1 test (agt-2.test.mjs)\n").notRun, [],
    "a test that FAILED and also skipped a part is a proven red, never demoted to unverified (AGT-170 slice 2)");

  // ---- the frozen pair, and (e) the cohort's refusal -------------------------------------------
  const cohort = JSON.parse(fs.readFileSync(path.join(ROOT, COHORT_PATH), "utf8"));
  const pair = pairFor(cohort, TICKET);
  assert.ok(!pair.refuse && pair.base_sha && pair.ship_sha, `${TICKET} must still resolve to a pair in the frozen cohort`);
  assert.equal(pairFor(cohort, "AGT-202").refuse, "no-version",
    "AGT-202 is refused in the frozen cohort and the refusal carries its own reason");
  assert.equal(pairFor(cohort, "AGT-000-not-a-ticket").refuse, "not-in-cohort",
    "a ticket the cohort never held is a different fact from a refusal");

  const refused = runScript([`--ticket=AGT-202`, `--cycle-id=x`, "--dry-run", "--json"]);
  assert.equal(refused.status, 2, "a refused pair is `could not run` (exit 2), never a verdict on the delivery");
  assert.equal(payloadOf(refused).kind, "no-version",
    "and it exits under the cohort's OWN reason rather than falling back to graded_sha for a pair");

  // ---- (c) the probe fence, credentials removed ------------------------------------------------
  const stripped = { ...process.env };
  delete stripped.SUPABASE_URL;
  delete stripped.SUPABASE_SERVICE_KEY;
  const fenced = runScript(["--suite=x", `--ticket=${TICKET}`, `--cycle-id=${CYCLE}`, "--json"], { env: stripped });
  assert.equal(fenced.status, 2, "an overridden suite without --dry-run cannot run at all");
  assert.equal(payloadOf(fenced).kind, "suite-override-requires-dry-run",
    "and it refuses BY NAME with no credentials present, which is how we know the fence is before the board and not after it");
  const allowed = runScript([`--suite=${DEFAULT_SUITE}`, "--json"], { env: stripped });
  assert.equal(payloadOf(allowed).kind, "missing-args",
    "CONTROL: the DEFAULT suite passes the fence and stops at the next check — the refusal is about the override, not about --suite existing");

  // ---- (f) the tail carries the step, with the SES-158 control -------------------------------
  const runbook = fs.readFileSync(path.join(ROOT, RUNBOOK_REL), "utf8");
  const terSpan = theTailCarriesTheDeltaRegrade(runbook);
  const noCommand = runbook.split("\n").filter(l => !l.includes("scripts/regrade-delivered.js")).join("\n");
  assert.notStrictEqual(noCommand, runbook, "control for (f) changed nothing -- the mutation misses its target (the SES-158 failure)");
  assert.throws(() => theTailCarriesTheDeltaRegrade(noCommand), /does not name/,
    "CONTROL: with the command line stripped the (f) arm must THROW -- a clause that still passes without the command pins prose, not the step");

  // ---- (h) the picker walks in order (slice 5) -------------------------------------------------
  const picker = thePickerWalksInOrder(cohort);

  // ---- (j) the board leg, both directions, pure (AGT-555) --------------------------------------
  const board = theBoardLegPicksAndRefuses();

  // ---- (d) the real trees, twice ----------------------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-245 (d)", "no SUPABASE_URL / SUPABASE_SERVICE_KEY, so the two live dry-runs on the real trees of the pair " +
      "`--next` picks (the sha probe that names the ship tree newly red, and the row count before/after) are unverified here");
    return report(pair, null, terSpan, null, picker, null, board);
  }
  // The write's own consequence, asserted rather than discovered by the next slice: AGT-245's row IS
  // a newer verdict for AGT-101, so the cohort row that named the v7.0.563 block is stale for it and
  // the script refuses it BY NAME. This is also a second, independent proof that the row was written.
  const stale = runScript([`--ticket=${TICKET}`, `--cycle-id=${CYCLE}`, "--dry-run", "--json"]);
  assert.equal(stale.status, 2, `${TICKET} must now be refused as could-not-run, never re-graded a second time off a stale cohort row`);
  const stalePay = payloadOf(stale);
  assert.equal(stalePay.kind, "superseded",
    `${TICKET} must refuse as \`superseded\` once AGT-245 has re-graded it — it reads ${stalePay.kind}`);
  assert.equal(stalePay.cohort_verdict_id, pair.verdict_id, "the cohort's verdict id is the frozen one");
  assert.notEqual(String(stalePay.prior_verdict_id), String(pair.verdict_id),
    "and the board's newest verdict for it is a DIFFERENT row — the one slice 4 wrote");

  // THE PAIR `--next` WILL PICK, through the same two legs the script walks (AGT-555). Before this
  // ticket the walk stopped at the frozen file, and this is the line that went red when the last of
  // its 71 rows was answered: a lane that can only read a file frozen on 2026-09-28 has nothing to
  // grade, while the board's own predicate matched 88 delivered rows.
  const eligible = await firstEligiblePair(url, key, cohort);
  const probe = eligible.pair;
  if (!probe) {
    // A genuinely drained BOARD is a true statement, not a broken clause -- so it is DECLARED rather
    // than passed over or asserted away (`pattern:77`), with the census that backs it.
    notRun("AGT-245 (d)", "neither the frozen cohort nor the live board holds a pairable row, so there is no pair for the two " +
      `live dry-runs: ${JSON.stringify(eligible.census)}. Exit 3 \`board-drained\` is then the lane's correct answer, and the ` +
      "payload shape for it is asserted in clause (j) without a board");
    return report(pair, null, terSpan, null, picker, null, board);
  }
  const baseShort = String(probe.base_sha).slice(0, 8);
  const shipShort = String(probe.ship_sha).slice(0, 8);
  const before = await countVerdicts(url, key, probe.backlog_id);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "agt-245-regrade-"));
  // The override suite is an echo and takes no database load, so the line exists to be inherited
  // when a parent holds it (run-all.js sets `held`) and opted out of otherwise -- never jumped.
  const env = { ...process.env, DEEPBENCH_TEST_SLOT: process.env.DEEPBENCH_TEST_SLOT || "off" };
  // `--next`, NOT `--ticket=` (AGT-555). The pair the lane runs every cycle now comes off the board
  // as often as out of the file, and `--ticket=` is refused `not-in-cohort` for a board row by
  // construction -- `pairFor` reads the frozen file and nothing else. Running the flag the tail
  // actually runs is also the only way this clause sees the fall-through it exists to pin.
  const dryRun = suite => runScript(
    ["--next", `--cycle-id=${CYCLE}`, "--dry-run", "--json", `--scratch=${scratch}`, `--suite=${suite}`],
    { env });
  let shaRun, constRun;
  try {
    shaRun = dryRun(SHA_PROBE);
    constRun = dryRun(CONSTANT_PROBE);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }

  const shaPay = payloadOf(shaRun);
  assert.equal(shaPay.kind, "regrade-delta",
    `the sha probe came back ${JSON.stringify(shaPay.kind)} instead of a grade, so no leg ran: \`--next\` must reach a pair ` +
      `through one of its two legs — \`board-drained\` here would mean the lane found nothing to grade while ` +
      `${probe.backlog_id} was sitting on the board matching the predicate, which is AGT-555 itself`);
  assert.equal(shaPay.ticket, probe.backlog_id,
    `\`--next\` graded ${JSON.stringify(shaPay.ticket)} where this clause's own walk of the same two legs reached ` +
      `${probe.backlog_id} — the script's pick and the file leg/board leg order must be the same walk, or the lane is ` +
      "grading a pair nobody can predict");
  assert.deepEqual(shaPay.base_leg.fails, [`tree-${baseShort}.test.mjs`],
    `the BASE leg must have run in a worktree at ${baseShort} — a script that ran both legs on one tree names one sha twice`);
  assert.deepEqual(shaPay.ship_leg.fails, [`tree-${shipShort}.test.mjs`],
    `the SHIP leg must have run at ${shipShort} — swapped legs name ${baseShort} here`);
  assert.deepEqual(shaPay.newlyRed, [`tree-${shipShort}.test.mjs`], "so the ship tree's red is newly red");
  assert.deepEqual(shaPay.standing, [], "and nothing is standing");
  assert.equal(shaPay.verdict, "block", "which blocks");
  assert.equal(shaRun.status, 1, "a block is exit 1 — a verdict, not a failure to run");
  assert.equal(shaPay.recorded, false, "--dry-run records nothing");
  assert.equal(shaPay.verdict_id, null);
  assert.equal(shaPay.base_sha, probe.base_sha, "graded against the frozen pair, not against graded_sha or dev HEAD");
  assert.equal(shaPay.ship_sha, probe.ship_sha);
  assert.deepEqual(shaPay.own_tests, probe.ownTests,
    `${probe.backlog_id}'s own regression-test diff must be read from git rather than declared`);

  const constPay = payloadOf(constRun);
  assert.deepEqual(constPay.standing, ["same.test.mjs"],
    "CONTROL: a constant name on both legs is standing — the first probe's block comes from the trees differing, not from the script blocking on whatever it sees");
  assert.deepEqual(constPay.newlyRed, [], "nothing newly red");
  assert.equal(constPay.verdict, "approve");
  assert.equal(constRun.status, 0, "an approve is exit 0");
  assert.equal(constPay.recorded, false, "and STILL records nothing — `--suite=` never writes");
  assert.equal(constPay.ship_decision_id, null, "no ship decision either");

  const after = await countVerdicts(url, key, probe.backlog_id);
  assert.equal(after, before,
    `${probe.backlog_id} had ${before} runner_verdicts rows before the two dry-runs and ${after} after — a dry-run that wrote one would be caught here`);

  // ---- (g) the row slice 4 wrote, and (i) the row slice 5's --next wrote ------------------------
  const ledger = await theRowIsInTheLedger(url, key);
  const second = await theSecondRowIsInTheLedger(url, key);
  return report(pair, { before, after, sha: shaPay, constant: constPay, probe, leg: eligible.leg, census: eligible.census },
    terSpan, ledger, picker, second, board);
}

function report(pair, live, terSpan, ledger, picker, second, board) {
  const head =
    `  [AGT-245] delta re-grade: a red only on the ship leg is newlyRed/block, the SAME red on both legs is ` +
    `standing/approve, and those identical captures flip to block when the file is in ownTests (the base tree ran a ` +
    `different file under that name); a prior block on build or hygiene refuses not-regression-only with no gate ` +
    `results. legNames: a [NOT RUN] transport capture is ran:false, a [PASS] capture is ran:true, and a test that ` +
    `failed AND skipped a part stays a proven red. AGT-202 exits 2 no-version; --suite=x without --dry-run exits 2 ` +
    `suite-override-requires-dry-run with the credentials stripped, while the default suite passes the fence.` +
    `\n       The tail's (7a-ter) paragraph (${terSpan} B normalised) names the command, --next, --cycle-id= and ONE ` +
    `test slot for BOTH legs, sits after (7a-bis) and above the sweep call, and its arm throws with the command line stripped.` +
    (picker ? `\n       The picker walks ${picker.resolved} resolved rows in file order: with only ${TICKET} re-graded it ` +
      `picks ${picker.first} (the control), with both re-graded it steps to the next row, a superseded / not-delivered / ` +
      `deps-changed row is stepped OVER with its reason reported, and every row answered is pair:null (exit 3, drained).` : "") +
    (board ? `\n       The board leg: a predicate-matching, unanswered, pairable board row is picked (${board.picked}, base from its own ` +
      `commit's first parent), the SAME census returns nothing once the frozen file holds that id REFUSED or this lane has ` +
      `already answered it, and a drained walk is exit 3 \`board-drained\` carrying its census — ` +
      `delivered ${board.census.delivered}, ${board.census.predicate_matches} matched, ${board.census.answered_in_file} answered, ` +
      `unreachable ${JSON.stringify(board.census.board_unreachable)}, ${board.census.no_verdict_row} with no verdict row.` : "") +
    (ledger ? `\n       Ledger: ${TICKET} carries ${ledger.rows} runner_verdicts rows; the newest (${ledger.id}, ${ledger.verdict}) ` +
      `opens with AGT-245's own re-grade prefix and is graded against the pair's ship tree.` : "") +
    (second ? `\n       Drained one more: ${NEXT_TICKET} carries ${second.rows} rows, the newest (${second.id}, ${second.verdict}) ` +
      `opens with this lane's prefix and is graded against that pair's ship tree; ${second.lane} rows board-wide carry the ` +
      `re-grade prefix (exactly 1 did before this slice).` : "");
  if (!live) return console.log(head);
  const b = String(live.probe.base_sha).slice(0, 8);
  const s = String(live.probe.ship_sha).slice(0, 8);
  console.log(`${head}\n       Live, \`--next\` picked ${live.probe.backlog_id} ${b} → ${s} off ${live.leg} (` +
    `${TICKET} itself now refuses \`superseded\`, which is AGT-245's own row): the sha probe named tree-${b}.test.mjs on the base leg and ` +
    `tree-${s}.test.mjs on the ship leg → newlyRed [${live.sha.newlyRed.join(", ")}], standing [], block, recorded:false; ` +
    `the constant probe → standing [${live.constant.standing.join(", ")}], approve, recorded:false. ` +
    `runner_verdicts rows for ${live.probe.backlog_id}: ${live.before} before, ${live.after} after.`);
}

export default run;
selfRun(import.meta.url, run);
