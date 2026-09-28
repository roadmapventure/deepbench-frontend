#!/usr/bin/env node
// DeepBench v7.0.698 | scripts/regrade-delivered.js | AGT-245 slice 3 of 5 -- ONE delivered ticket,
// re-graded on the DELTA between its own before/after trees.
//
// THE THREE THINGS A LATER READER MUST NOT UNDO.
//
// 1. THE PAIR COMES FROM THE FROZEN COHORT, NEVER FROM `runner_verdicts.graded_sha`. Since SES-336
//    the Builder pushes BEFORE the verifier runs, so `graded_sha` is dev HEAD at grade time -- a
//    moving target belonging to whoever pushed last. `AGT-199`'s latest verdict records `351e2aff`,
//    whose subject is `v7.0.653 AGT-186 ...`: a peer's commit, filed under this ticket. A re-grade
//    that checked out `graded_sha` would run the suite on somebody else's tree and record the
//    answer against this ticket. `docs/design/agt-245-regrade-cohort.json` (slice 1) resolved every
//    pair from commit SUBJECTS and refused the 15 it could not; `pairFor` reads that file and
//    refuses anything it refused. `graded_sha` is evidence here, never an input.
//
// 2. ONE TEST SLOT PER PAIR, HELD ACROSS BOTH LEGS. `public.test_slots` capacity is 1 and a
//    regression suite is the heaviest thing a cycle does (scripts/test-slot.js). The two legs of one
//    pair are back to back INSIDE a single `withTestSlot`, so a pair never releases the line between
//    its base and its ship and never races a peer cycle's suite. A slot that is not granted is
//    `slot-not-granted` and exit 2 -- never a leg run anyway. The legs themselves get
//    `DEEPBENCH_TEST_SLOT=held`, which is how `run-all.js:151` is told its parent already holds the
//    line rather than queueing behind itself (a tree older than v7.0.689 has no slot line at all and
//    ignores the variable, which is harmless: the parent is holding it).
//
// 3. `--suite=` NEVER RECORDS. An overridden suite command is a probe of this script's own
//    plumbing -- which tree each leg ran on -- and a probe's output must never reach the verdict
//    ledger. Any `--suite=` other than the default without `--dry-run` exits 2
//    `suite-override-requires-dry-run`, checked BEFORE the credentials, before the cohort, before
//    anything: the refusal must not depend on a board being reachable.
//
// WHAT THE DELTA ACTUALLY ASKS, and why it is not the suite's exit code. All 77 cohort tickets are
// `delivered` with a single `block` whose only red gate is `regression` -- the suite has never been
// green on `dev`, so grading these on an absolute exit code re-blocks all 77 forever. AGT-170's
// `regressionDelta` is the rule: a red test NAMED in the base leg is standing (somebody else's), a
// red test absent from it is this delivery's. Both legs come from THIS pair's own trees, so the
// comparison is about this delivery and nothing else -- unlike `--regression-baseline=`, which
// compares a delivery against whatever the cycle's unchanged clone happened to be.
//
// THE ONE PLACE THIS IS STRICTER THAN `regressionDelta`: a test file THIS DELIVERY CHANGED. A red
// whose file is in the pair's own diff cannot be excused as standing even when a test of the same
// NAME also failed on the base tree -- the base tree ran a different file. So every name in
// `ownTests` that fails on the ship leg moves to `newlyRed` and the gate is red. Fail closed, in the
// one direction where a "standing" claim would launder a ship (docs/ARCHITECTURE.md §19v -- the
// verdict is the ladder's input).
//
// NO MODEL CALL, NO SPEND, NO MIGRATION. On `ok` it writes exactly ONE `runner_verdicts` row through
// `insertVerdict` -- the same insert both verifier lanes go through -- and on `approve` the
// `record_ship_decision()` the block made unwritable. `--dry-run` builds the identical payload and
// writes nothing.
//
// Usage:
//   node scripts/regrade-delivered.js --ticket=AGT-101 --cycle-id=<uuid> [--dry-run] [--json]
//                                    [--suite=<cmd>] [--scratch=<dir>] [--cohort=<path>] [--repo=<dir>]
//
// Exit codes, the verifier's table exactly:
//   0  approve -- recorded, with its ship decision written (or `recorded:false` under --dry-run).
//   1  a VERDICT of block, or a refusal that leaves the prior block standing (`not-regression-only`).
//   2  THE RE-GRADE COULD NOT RUN -- and it is NOT a verdict. No row is ever written on a 2.

import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

import { COHORT_PATH } from "./regrade-cohort.js";
import { withTestSlot } from "./test-slot.js";
import {
  gateStatus, verdictFor, regressionDelta, failingTestsFrom, notRunTestsFrom,
  insertVerdict, rest,
} from "./verifier.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

export const DEFAULT_SUITE = "node tests/regression/run-all.js";
export const LEGS = Object.freeze(["base", "ship"]);

// --- the pure core -----------------------------------------------------------------------------

// The pair for one ticket, out of the frozen cohort. A row the cohort REFUSED is refused here under
// its own reason -- `no-version`, `no-own-commit`, `interleaved: <shas>` -- rather than
// re-derived: slice 1 measured those refusals against the git log, and a second opinion formed here
// would be exactly the approximation that file exists to prevent. A ticket the cohort never held is
// `not-in-cohort`, which is a different fact from a refusal and says so.
export function pairFor(cohort, ticket) {
  const rows = cohort && Array.isArray(cohort.rows) ? cohort.rows : [];
  const id = ticket === null || ticket === undefined ? "" : String(ticket).trim();
  if (!id) return { refuse: "not-in-cohort" };
  const row = rows.find(r => r && String(r.backlog_id) === id) || null;
  if (!row) return { refuse: "not-in-cohort" };
  if (row.status !== "resolved") {
    // An empty `reason` beside a non-resolved status is a cohort bug, not a pass: naming it is the
    // only way a reader can tell it from a refusal that explained itself.
    return { refuse: String(row.reason || "").trim() || "refused-without-reason" };
  }
  return row;
}

// One leg's capture, read three ways. `ran` is the question the exit code CANNOT answer: a suite
// that died in its own startup (`[NOT RUN] regression suite -- transport: ...`, run-all.js:153)
// exits 2 with no test result at all, and an empty failing set off that run is "nobody looked",
// never "nothing failed" -- so the delta must never be computed over it. The marker test is
// LINE-ANCHORED for `failingTestsFrom`'s reason: a failing test that asserts about this very suite's
// output prints `[FAIL]` inside its own message body, and a scan for the marker anywhere in the line
// would read that as proof the suite ran.
export function legNames(output) {
  const text = String(output ?? "");
  let ran = false;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("[PASS]") || line.startsWith("[FAIL]")) { ran = true; break; }
  }
  const fails = failingTestsFrom(text);
  // AGT-170 slice 2's partition, and the subtraction is the load-bearing half: run-all.js:157-162
  // drains the not-run buffer on the FAIL arm too, so a test that failed AND skipped a part is a
  // PROVEN red and must not be demoted to unverified.
  const notRun = notRunTestsFrom(text).filter(n => !fails.includes(n));
  return { ran, fails, notRun };
}

// A test path's comparable name. `[FAIL]` lines carry the BASENAME (run-all.js prints the file name
// it imported), while a git diff carries `tests/regression/<file>` -- so an intersection taken
// without this normalisation is always empty, and an always-empty intersection is a guard that
// silently stops guarding.
function leafName(name) {
  const s = String(name ?? "").trim();
  if (!s) return "";
  const parts = s.split(/[\\/]/);
  return parts[parts.length - 1];
}

// The delta's one stricter clause -- see the header's fence 3. Never widens `standing`; only ever
// moves a name INTO `newlyRed`, and only a name this delivery's own diff touched.
function chargeOwnTests(delta, ownTests, shipFails) {
  const own = (Array.isArray(ownTests) ? ownTests : []).map(leafName).filter(Boolean);
  const fails = (Array.isArray(shipFails) ? shipFails : []).map(n => String(n));
  const charged = fails.filter(n => own.includes(leafName(n)));
  if (!charged.length) return delta;
  const without = list => (Array.isArray(list) ? list : []).filter(n => !charged.includes(n));
  const newlyRed = [...new Set([...(Array.isArray(delta.newlyRed) ? delta.newlyRed : []), ...charged])].sort();
  return {
    status: "red",
    standing: without(delta.standing),
    newlyRed,
    unverifiedInBaseline: without(delta.unverifiedInBaseline),
    reason: `${delta.reason} AGT-245: ${charged.length} of this run's red ${charged.length === 1 ? "test is" : "tests are"} ` +
      `a file THIS DELIVERY CHANGED (${charged.join(", ")}), so ${charged.length === 1 ? "it is" : "they are"} charged as ` +
      `NEWLY RED whatever the base leg said -- the base tree ran a different file under that name, and a ` +
      `same-name red there is not evidence about this one. Regression RED.`,
  };
}

// The whole grade, pure, so its guard is four assertions rather than two 25-minute suite runs.
//
//   prior     the prior verdict's gate statuses: { build, regression, hygiene }.
//   base/ship `legNames` of each leg's capture.
//   shipExit  the ship leg's process exit status (null for a signal kill -- `gateStatus` reads that
//             as `skipped`, which is why it is passed through rather than defaulted to a number).
//   ownTests  the pair's own diff names under tests/regression/.
//
// `ok:false` IS A REFUSAL, NOT A VERDICT. This lane re-grades ONE gate. A prior block whose build or
// hygiene was anything but green is blocked on something this script never ran, and carrying those
// forward as green would vouch for a gate nobody looked at -- the cohort's predicate says all 71
// rows are regression-only, and this is the assertion of that rather than the assumption of it.
export function deltaVerdict({ prior, base, ship, shipExit, ownTests } = {}) {
  const p = prior || {};
  const b = base || {};
  const s = ship || {};
  if (p.build !== "green" || p.hygiene !== "green") {
    return {
      ok: false, kind: "not-regression-only", gateResults: null, delta: null, verdict: null,
      reason: `not-regression-only: the prior verdict records build=${p.build ?? "null"}, hygiene=${p.hygiene ?? "null"} — ` +
        `this lane re-grades the REGRESSION gate alone, so a block resting on either of those is a block on ` +
        `something no leg here ran. The prior block stands and nothing is recorded.`,
    };
  }
  const absolute = gateStatus({ ran: true, exitCode: shipExit });
  const raw = regressionDelta({
    absolute,
    baseline: Array.isArray(b.fails) ? b.fails : null,
    post: Array.isArray(s.fails) ? s.fails : null,
    unverified: Array.isArray(b.notRun) ? b.notRun : null,
  });
  const delta = chargeOwnTests(raw, ownTests, s.fails);
  const gateResults = { build: "green", hygiene: "green", regression: delta.status };
  const { verdict, reasoning } = verdictFor(gateResults);
  return { ok: true, kind: "regrade-delta", gateResults, delta, verdict, reason: `${reasoning} ${delta.reason}` };
}

// --- the io half -------------------------------------------------------------------------------

function git(repo, args) {
  const r = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return { status: r.status, out: String(r.stdout || "").trim(), err: String(r.stderr || "").trim() };
}

function emit({ code, payload, prose, json }) {
  if (json) console.log(JSON.stringify(payload));
  else if (code === 0) console.log(prose);
  else console.error(prose);
  return code;
}

// One leg: a detached worktree at that sha, the clone's node_modules borrowed, the suite run there,
// the capture kept on disk. The worktree is removed in `finally` -- a leaked worktree makes the NEXT
// pair's `git worktree add` fail on a path that already exists, which would present as a slot the
// backfill can never use again.
function runLeg({ repo, scratch, ticket, leg, sha, suite, env, out }) {
  const dir = path.join(scratch, `regrade-${ticket}-${leg}`);
  const capture = path.join(scratch, `regrade-${ticket}-${leg}.txt`);
  const add = git(repo, ["worktree", "add", "--detach", dir, sha]);
  if (add.status !== 0) {
    return { error: `git worktree add ${leg} at ${sha}: ${add.err || add.out || `exit ${add.status}`}` };
  }
  try {
    // A 0.5 GB instance cannot afford `npm ci` per leg, and an install would also change the tree
    // being graded. The symlink is the same dependency set for both legs BY CONSTRUCTION, which is
    // what makes the two captures comparable at all.
    const link = path.join(dir, "node_modules");
    if (!fs.existsSync(link)) {
      fs.symlinkSync(path.join(repo, "node_modules"), link, process.platform === "win32" ? "junction" : "dir");
    }
    out(`regrade-delivered: ${leg} leg — ${suite} in ${dir} (${String(sha).slice(0, 8)})`);
    const r = spawnSync(suite, {
      cwd: dir,
      shell: true,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      env: { ...env, DEEPBENCH_TEST_SLOT: "held" },
    });
    const text = `${r.stdout || ""}\n${r.stderr || ""}`;
    try { fs.writeFileSync(capture, text, "utf8"); } catch { /* the capture is evidence, not the grade */ }
    if (r.error) return { error: `${leg} leg could not run: ${r.error.message}`, capture };
    return { names: legNames(text), exitCode: r.status, capture, sha, dir };
  } finally {
    git(repo, ["worktree", "remove", "--force", dir]);
  }
}

function argOf(argv, name) {
  const hit = argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

export async function main(argv, { env = process.env, out = null } = {}) {
  const json = argv.includes("--json");
  // UNDER --json, STDOUT IS THE PAYLOAD AND NOTHING ELSE. The legs and the slot line are progress,
  // and a caller that has to strip prose off the front of a JSON document before parsing it is a
  // caller that will one day parse the prose instead -- slice 4/5 reads this payload.
  const say = out ?? (s => (json ? console.error(s) : console.log(s)));
  const dryRun = argv.includes("--dry-run");
  const ticket = argOf(argv, "ticket");
  const cycleId = argOf(argv, "cycle-id");
  const suite = argOf(argv, "suite") ?? DEFAULT_SUITE;
  const repo = path.resolve(argOf(argv, "repo") || REPO);
  const scratch = path.resolve(argOf(argv, "scratch") || env.DEEPBENCH_SCRATCH || os.tmpdir());
  const cohortAbs = path.resolve(repo, argOf(argv, "cohort") || COHORT_PATH);
  const cannot = (kind, prose, extra = {}) => emit({
    code: 2, json, payload: { ok: false, exitCode: 2, kind, ticket: ticket || null, recorded: false, ...extra },
    prose: `regrade-delivered: ${prose}\n  Exiting 2 — the re-grade COULD NOT RUN. This is NOT a verdict; the prior block stands and nothing was recorded.`,
  });

  // ---- FENCE 3, AND IT IS FIRST ON PURPOSE. ---------------------------------------------------
  // Before the credentials, before the cohort file, before git. A probe suite must be unable to
  // reach the ledger even on a machine where every other input is present and valid.
  if (suite !== DEFAULT_SUITE && !dryRun) {
    return cannot("suite-override-requires-dry-run",
      `--suite=${JSON.stringify(suite)} is not the default suite (${DEFAULT_SUITE}), and an overridden suite is a probe of this ` +
      `script's plumbing rather than a regression run. A probe NEVER records: pass --dry-run, or drop --suite.`,
      { suite });
  }
  const missing = [!ticket && "--ticket", !cycleId && "--cycle-id"].filter(Boolean);
  if (missing.length) return cannot("missing-args", `missing ${missing.join(", ")}.`, { missing });

  // ---- (a) THE PAIR, FROM THE FROZEN COHORT. --------------------------------------------------
  let cohort;
  try {
    cohort = JSON.parse(fs.readFileSync(cohortAbs, "utf8"));
  } catch (e) {
    return cannot("cohort-unreadable", `${cohortAbs} could not be read (${e.message}).`);
  }
  const pair = pairFor(cohort, ticket);
  if (pair.refuse) {
    return cannot(pair.refuse,
      `the frozen cohort refuses ${ticket}: ${pair.refuse}. Slice 1 measured that refusal against the git log; a pair ` +
      `guessed here would be the approximation ${COHORT_PATH} exists to prevent.`,
      { refuse: pair.refuse });
  }

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  // No --dry-run relaxation on the READS: every fact this grade rests on is a row. --dry-run means
  // "write nothing", never "invent the board".
  const noCreds = [!supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY"].filter(Boolean);
  if (noCreds.length) return cannot("no-credentials", `missing ${noCreds.join(", ")}.`, { missing: noCreds });

  // ---- (b) THE COHORT ROW IS STILL THE BOARD'S ANSWER. ----------------------------------------
  // The cohort was frozen 2026-09-28 against a LIVE predicate, and the board moves under it. If a
  // newer verdict has landed for this ticket since, the block being re-graded is not the current one
  // and re-grading it would file an answer about a superseded row. `superseded` is exit 2, not a
  // verdict: nothing is wrong with the delivery, the cohort is simply stale for it.
  const latest = await rest(supabaseUrl, supabaseKey,
    `runner_verdicts?select=id,created_at,version,verdict,gate_build,gate_regression,gate_hygiene,epic_name,priority_class` +
    `&backlog_id=eq.${encodeURIComponent(ticket)}&order=created_at.desc&limit=1`);
  if (latest.error) return cannot("verdict-unreadable", `runner_verdicts could not be read (${latest.error}).`);
  const priorRow = Array.isArray(latest.rows) ? latest.rows[0] : null;
  if (!priorRow) return cannot("no-prior-verdict", `${ticket} has no runner_verdicts row at all.`);
  if (String(priorRow.id) !== String(pair.verdict_id)) {
    return cannot("superseded",
      `${ticket}'s latest verdict is ${priorRow.id} (${priorRow.version ?? "no version"}), not the cohort's ${pair.verdict_id}. ` +
      `The cohort is stale for this ticket and the block it names is no longer the current one.`,
      { prior_verdict_id: priorRow.id, cohort_verdict_id: pair.verdict_id });
  }
  const item = await rest(supabaseUrl, supabaseKey,
    `backlog_items?select=backlog_id,status&backlog_id=eq.${encodeURIComponent(ticket)}&limit=1`);
  if (item.error) return cannot("backlog-unreadable", `backlog_items could not be read (${item.error}).`);
  const status = Array.isArray(item.rows) && item.rows[0] ? item.rows[0].status : null;
  if (status !== "delivered") {
    return cannot("not-delivered",
      `${ticket} is ${status ?? "absent from backlog_items"}, not \`delivered\` — this lane re-grades a delivery that is ` +
      `waiting on a verdict, and anything else is a different question.`, { status });
  }

  // ---- (c) THE DEPENDENCY FENCE. --------------------------------------------------------------
  // Both legs share ONE `node_modules` by symlink (see runLeg), so a pair that changed
  // `package.json`/`package-lock.json` would run its ship tree against the base tree's dependency
  // set -- a comparison of two things neither of which is the real ship. Refused rather than
  // installed: an install per leg is 100+ MB and minutes on a 0.5 GB instance, and slice 4/5 can
  // decide that trade with the numbers in hand.
  const deps = git(repo, ["diff", "--name-only", pair.base_sha, pair.ship_sha, "--", "package.json", "package-lock.json"]);
  if (deps.status !== 0) return cannot("git-unreadable", `git diff for the dependency fence failed: ${deps.err || `exit ${deps.status}`}.`);
  if (deps.out) {
    return cannot("deps-changed",
      `${ticket} changed ${deps.out.split("\n").join(", ")} between ${String(pair.base_sha).slice(0, 8)} and ` +
      `${String(pair.ship_sha).slice(0, 8)}. Both legs share one node_modules, so this pair cannot be graded here.`,
      { deps_changed: deps.out.split("\n") });
  }
  const changed = git(repo, ["diff", "--name-only", pair.base_sha, pair.ship_sha]);
  if (changed.status !== 0) return cannot("git-unreadable", `git diff --name-only failed: ${changed.err || `exit ${changed.status}`}.`);
  const ownTests = changed.out.split("\n").map(s => s.trim())
    .filter(f => f.startsWith("tests/regression/") && /\.m?js$/.test(f));

  // ---- (d) ONE SLOT, BOTH LEGS, BACK TO BACK. -------------------------------------------------
  fs.mkdirSync(scratch, { recursive: true });
  const held = await withTestSlot(env, async () => {
    const legs = {};
    for (const leg of LEGS) {
      legs[leg] = runLeg({
        repo, scratch, ticket, leg, suite, env, out: say,
        sha: leg === "base" ? pair.base_sha : pair.ship_sha,
      });
      if (legs[leg].error) break;
    }
    return legs;
  }, { out: say });
  if (held.ran === false) {
    return cannot("slot-not-granted",
      `no test slot for ${ticket} (${held.notRun}). Capacity is 1 and the database gates it on db_health_level(); a leg run ` +
      `without the slot would race a peer cycle's suite, which is the one thing that line exists to stop.`,
      { slot: held.notRun });
  }
  const legs = held.value || {};
  for (const leg of LEGS) {
    const r = legs[leg] || {};
    if (r.error) return cannot(`${leg}-leg-failed`, r.error, { leg, capture: r.capture ?? null });
    if (!r.names || !r.names.ran) {
      return cannot(`${leg}-leg-did-not-run`,
        `the ${leg} leg produced no [PASS] or [FAIL] line, so it never ran a test — its empty failing set is "nobody looked", ` +
        `not "nothing failed", and a delta computed over it would be manufactured. Capture: ${r.capture ?? "(none)"}.`,
        { leg, exit_code: r.exitCode ?? null, capture: r.capture ?? null });
    }
  }

  // ---- (e) THE GRADE. -------------------------------------------------------------------------
  const graded = deltaVerdict({
    prior: { build: priorRow.gate_build, regression: priorRow.gate_regression, hygiene: priorRow.gate_hygiene },
    base: legs.base.names,
    ship: legs.ship.names,
    shipExit: legs.ship.exitCode,
    ownTests,
  });
  const common = {
    ticket, version: pair.version ?? null, cycle_id: cycleId,
    prior_verdict_id: pair.verdict_id, prior_version: priorRow.version ?? null,
    base_sha: pair.base_sha, ship_sha: pair.ship_sha, own_tests: ownTests,
    suite, dry_run: dryRun,
    base_leg: { exit_code: legs.base.exitCode ?? null, ran: legs.base.names.ran, fails: legs.base.names.fails, not_run: legs.base.names.notRun, capture: legs.base.capture },
    ship_leg: { exit_code: legs.ship.exitCode ?? null, ran: legs.ship.names.ran, fails: legs.ship.names.fails, not_run: legs.ship.names.notRun, capture: legs.ship.capture },
  };
  if (!graded.ok) {
    return emit({ code: 1, json,
      payload: { ...common, ok: false, exitCode: 1, kind: graded.kind, recorded: false, verdict: null, reason: graded.reason },
      prose: `regrade-delivered: REFUSED on ${ticket} — ${graded.reason}\n  Exiting 1: the prior block (${pair.verdict_id}) STANDS and NOTHING was recorded.` });
  }

  const { verdict, gateResults, delta } = graded;
  const reasoning =
    `AGT-245 delta re-grade of ${ticket}: prior ${pair.verdict_id} (${pair.version}); ` +
    `base ${pair.base_sha}, ship ${pair.ship_sha}. ${delta.reason}`;
  const autoDoneReason =
    `auto-done does not apply to a delta re-grade: this is a second look at an existing delivery, graded on the ` +
    `difference between its own base and ship trees, not a fresh delivery — the trust ladder was never asked (AGT-245).`;
  const payload = {
    ...common,
    ok: verdict === "approve", exitCode: verdict === "approve" ? 0 : 1, kind: "regrade-delta",
    verdict, gates: gateResults, reasoning,
    standing: delta.standing, newlyRed: delta.newlyRed, unverifiedInBaseline: delta.unverifiedInBaseline,
    delta_status: delta.status, delta_reason: delta.reason,
    auto_done_eligible: false, auto_done_reason: autoDoneReason,
    epic_name: priorRow.epic_name ?? null, priority_class: priorRow.priority_class ?? null,
  };
  const prose =
    `regrade-delivered ${verdict.toUpperCase()} on ${ticket} (${pair.version}) — base ${String(pair.base_sha).slice(0, 8)} → ship ${String(pair.ship_sha).slice(0, 8)}\n` +
    `  build=green [carried from ${pair.verdict_id}] hygiene=green [carried] regression=${gateResults.regression} [delta of two legs]\n` +
    `  newly red: ${(delta.newlyRed || []).join(", ") || "none"}\n` +
    `  standing:  ${(delta.standing || []).join(", ") || "none"}\n` +
    `  ${delta.reason}`;

  if (dryRun) {
    return emit({ code: payload.exitCode, json,
      payload: { ...payload, recorded: false, verdict_id: null, ship_decision_id: null },
      prose: `${prose}\n  --dry-run: nothing recorded.` });
  }

  const ins = await insertVerdict({
    supabaseUrl, supabaseKey, cycleId, ticket, version: pair.version, verdict, gateResults, reasoning,
    eligible: false, autoDoneReason,
    epicName: priorRow.epic_name ?? null, priorityClass: priorRow.priority_class ?? null,
    gradedSha: pair.ship_sha,
  });
  if (ins.error) {
    return emit({ code: 2, json, payload: { ...payload, ok: false, exitCode: 2, kind: "insert-failed", recorded: false, error: ins.error },
      prose: `${prose}\n  RECORDING FAILED: ${ins.error}\n  Exiting 2 — the grade above was reached but is not in the ledger, so it is not assertable.` });
  }
  // A BLOCK EMITS AND STOPS. Its row is the record; manufacturing a ship decision for a delivery
  // that still does not pass is the one thing record_ship_decision()'s first refusal exists to
  // prevent, and routing around it here would be that refusal defeated.
  if (verdict !== "approve") {
    return emit({ code: 1, json, payload: { ...payload, recorded: true, verdict_id: ins.rowId, ship_decision_id: null },
      prose: `${prose}\n  recorded as runner_verdicts ${ins.rowId}\n  Still a block: no ship decision written.` });
  }
  const ship = await rest(supabaseUrl, supabaseKey, "rpc/record_ship_decision", {
    method: "POST",
    body: JSON.stringify({
      p_cycle_id: cycleId, p_backlog_id: ticket, p_version: pair.version,
      p_push_sha: pair.ship_sha, p_verdict_id: ins.rowId,
    }),
  });
  if (ship.error) {
    return emit({ code: 2, json, payload: { ...payload, ok: false, exitCode: 2, kind: "ship-decision-failed", recorded: true, verdict_id: ins.rowId, ship_decision_id: null, error: ship.error },
      prose: `${prose}\n  recorded as runner_verdicts ${ins.rowId}\n  record_ship_decision FAILED: ${ship.error}\n  Exiting 2 — the approve is in the ledger but the ship it authorises is not, which is a half-written handoff rather than a verdict.` });
  }
  const shipId = Array.isArray(ship.rows) ? ship.rows[0] : ship.rows;
  return emit({ code: 0, json, payload: { ...payload, recorded: true, verdict_id: ins.rowId, ship_decision_id: shipId ?? null },
    prose: `${prose}\n  recorded as runner_verdicts ${ins.rowId}\n  ship decision: ${shipId ?? "(none returned)"} — SES-320's sweep moves the ticket to done.` });
}

// SES-176: importing this module for its exports must never run the CLI, and exitCode rather than
// exit() so a pending write is never cut off mid-flight.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = await main(process.argv.slice(2)).catch(err => {
    console.error(`regrade-delivered: ${err && err.stack ? err.stack : err}`);
    return 2;
  });
}
