// DeepBench v7.0.422 | tests/regression/ses-320b-window-finaliser.test.mjs | SES-320 follow-up --
// the decision-window finaliser: a pg_cron job closes expired windows on the database's own clock.
//
// WHAT IS BEING PINNED. SES-320 built the delivered exit inside sweep_decision_windows(), and the
// only thing that ever called the sweep was a cycle's tail or an attended close-out. Measured at this
// ship: 28 open decisions, 0 ever finalised, last unattended cycle 2026-09-02 15:33Z. So the exit
// existed and had never fired. This ship adds ONE caller with its own clock -- cron.job
// `runner-window-finaliser` -> public.run_window_finaliser() -> the same sweep -- and a liveness
// record, public.runner_finaliser_runs, one row per run.
//
// THREE ARMS. PURE: the job sits OFF the runner's own minute (runner_settings.cron_minute = 40), so a
// promotion the sweep writes lands where the NEXT cycle's step 4b reads it -- runner-cycle.md (7b)'s
// "not at step 1" argument, kept rather than re-argued. DOC: the runbook's (7b) names the job, the
// function and the record, each clause graded by its own mutation and by the pre-change tree. LIVE
// (credentialed): the newest runner_finaliser_runs row is read over PostgREST and must carry no
// error and be younger than three hours. THAT LAST ARM IS THE ALARM: a stalled or erroring finaliser
// turns CI red, which is the one thing a silence never did before. The writer
// run_window_finaliser() is never called by this suite (the SES-196 / SES-218 / SES-275 refusal).

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// origin/dev immediately before this ship. A SHA, never the branch name (SES-215).
const PRE_CHANGE_SHA = "efa5e379ff3275831456cceff9f129ad7a8f644e";

const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";

export const norm = s => s.replace(/\s+/g, " ");

// ---------------------------------------------------------------------------------------------
// THE PURE HALF: the job's placement against the runner's grid, and its attribution.
// ---------------------------------------------------------------------------------------------

// The schedule as shipped in migration ses320b_window_finaliser.
export const JOB_NAME = "runner-window-finaliser";
export const JOB_SCHEDULE = "17 * * * *";
// runner_settings.cron_minute at this ship -- the routine's own grid. A finaliser ON that minute
// would race the cycle that reads its promotion; one 23 minutes before it does not.
export const RUNNER_CRON_MINUTE = 40;
// The p_actor_session the finaliser passes. sweep_decision_windows() raises unless exactly one of
// cycle / session is set, and every before-image on this path carries this string.
export const FINALISER_ACTOR = "pg-cron finaliser";

export function scheduleMinute(schedule) {
  const m = String(schedule).trim().split(/\s+/)[0];
  return /^\d+$/.test(m) ? Number(m) : null;
}

function theJobSitsOffTheRunnersOwnMinute() {
  const minute = scheduleMinute(JOB_SCHEDULE);
  assert.ok(Number.isInteger(minute) && minute >= 0 && minute < 60,
    `the finaliser's schedule must fix a literal minute; got ${JSON.stringify(JOB_SCHEDULE)}`);
  assert.notStrictEqual(minute, RUNNER_CRON_MINUTE,
    "the finaliser must not share the runner's own minute (runner_settings.cron_minute): a sweep on " +
      "the same minute races the cycle that should be READING its promotion at step 4b");
  assert.strictEqual(JOB_SCHEDULE.split(/\s+/).slice(1).join(" "), "* * * *",
    "hourly, every hour -- the runner's cadence is a column John owns; the finaliser has no cadence " +
      "of its own to drift");
  assert.ok(FINALISER_ACTOR.trim().length > 0,
    "the actor string must be non-empty: ck_before_image_session_name_nonempty rejects an empty " +
      "session_name, and the sweep's attribution guard needs the session half set");
}

// ---------------------------------------------------------------------------------------------
// THE DOC HALF.
// ---------------------------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "7b-names-the-job",
    file: RUNBOOK_REL,
    detail:
      "(7b) is the one paragraph a cycle reads about finalisation; without the job's name there a " +
      "later editor 'tidies' the tail call away as the only caller, or re-argues placement",
    test: t => norm(t).includes("`runner-window-finaliser`"),
    breaks: t => t.replaceAll("`runner-window-finaliser`", "`runner-window-finaliser-x`"),
  },
  {
    id: "7b-names-the-function",
    file: RUNBOOK_REL,
    detail: "the function the job calls, so a reader can find the one home of what the job does",
    test: t => norm(t).includes("`public.run_window_finaliser()`"),
    breaks: t => t.replaceAll("`public.run_window_finaliser()`", "`public.run_window_finaliser_x()`"),
  },
  {
    id: "7b-names-the-record",
    file: RUNBOOK_REL,
    detail: "the liveness record, so 'did the finaliser run' is a query and not a guess",
    test: t => norm(t).includes("`public.runner_finaliser_runs`"),
    breaks: t => t.replaceAll("`public.runner_finaliser_runs`", "`public.runner_finaliser_runs_x`"),
  },
  {
    id: "7b-keeps-the-tail-call",
    file: RUNBOOK_REL,
    detail:
      "the tail sweep stays: it closes what expired mid-cycle and is idempotent. The sentence that " +
      "says so is what stops the next editor deleting the call now that a cron exists",
    test: t => norm(t).includes("KEEP THE TAIL CALL"),
    breaks: t => t.replaceAll("KEEP THE TAIL CALL", "DROP THE TAIL CALL"),
  },
  {
    id: "7b-annotates-the-cron-that-may-be-off",
    file: RUNBOOK_REL,
    detail:
      "the (7b) sentence 'wait for a cron that may be off' was true and is now historical; it is " +
      "annotated in place (SES-289 shape), never deleted",
    test: t => norm(t).includes("wait for a cron that may be off") &&
               norm(t).includes("the finaliser catches it at :17 regardless"),
    breaks: t => t.replaceAll("the finaliser catches it at :17 regardless", "the finaliser catches it at :17 sometimes"),
  },
];

function readRel(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function theDocsCarryTheRuling() {
  for (const c of CLAUSES) {
    assert.ok(c.test(readRel(c.file)), `${c.id} -- ${c.detail}`);
  }
}

function everyClauseHasTeeth() {
  for (const c of CLAUSES) {
    const text = readRel(c.file);
    const broken = c.breaks(text);
    assert.notStrictEqual(broken, text, `${c.id}: breaks() changed nothing -- the mutation misses its target`);
    assert.ok(!c.test(broken), `${c.id} is VACUOUS -- it still passes after its own breaks() mutation`);
  }
}

function theClausesFailOnThePreChangeTree() {
  let before;
  try {
    before = execFileSync("git", ["show", `${PRE_CHANGE_SHA}:${RUNBOOK_REL}`], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    notRun(
      "the file-level control: every DOC clause fails against the pre-change runbook",
      `${PRE_CHANGE_SHA.slice(0, 8)} is not reachable from this clone (shallow checkout). ` +
        "The clauses were still graded against the committed tree and their own mutations.",
    );
    return;
  }
  for (const c of CLAUSES) {
    assert.ok(!c.test(before), `${c.id} passes on the PRE-CHANGE runbook -- it does not pin this ship`);
  }
}

// ---------------------------------------------------------------------------------------------
// THE LIVE HALF -- the finaliser's own record, over PostgREST. Read-only.
// ---------------------------------------------------------------------------------------------

const base = url => url.replace(/\/+$/, "");

export const MAX_AGE_HOURS = 3; // hourly job; two missed fires is a stall, not a hiccup.

export function gradeNewestRun(row, nowMs = Date.now()) {
  if (!row) return { ok: false, reason: "no run recorded yet" };
  if (row.error) return { ok: false, reason: `newest run carries an error: ${row.error}` };
  const ageHours = (nowMs - Date.parse(row.ran_at)) / 36e5;
  if (!Number.isFinite(ageHours)) return { ok: false, reason: `unreadable ran_at ${row.ran_at}` };
  if (ageHours > MAX_AGE_HOURS) return { ok: false, reason: `newest run is ${ageHours.toFixed(1)}h old` };
  return { ok: true, reason: `newest run ${ageHours.toFixed(2)}h ago, no error` };
}

function theGraderIsDiscriminating() {
  const fresh = new Date(Date.now() - 20 * 60e3).toISOString();
  assert.ok(gradeNewestRun({ ran_at: fresh, error: null }).ok);
  assert.ok(!gradeNewestRun({ ran_at: fresh, error: "boom" }).ok, "an error must fail");
  assert.ok(!gradeNewestRun({ ran_at: new Date(Date.now() - 5 * 36e5).toISOString(), error: null }).ok,
    "a five-hour-old newest run must fail: that is a stalled scheduler");
  assert.ok(!gradeNewestRun(null).ok);
}

async function theFinaliserIsAliveAndClean() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm: the newest public.runner_finaliser_runs row carries no error and is younger " +
        `than ${MAX_AGE_HOURS} hours`,
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The pure and doc arms above still ran. " +
        "Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }
  const res = await fetch(
    `${base(url)}/rest/v1/runner_finaliser_runs?select=ran_at,finalized,promoted,closed,error,actor&order=ran_at.desc&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  assert.ok(res.ok, `runner_finaliser_runs read returned HTTP ${res.status} -- the table or its service_role grant is missing`);
  const rows = await res.json();
  if (!rows.length) {
    notRun(
      "the live arm: the newest runner_finaliser_runs row",
      "no run has been recorded yet -- the job fires at :17; re-run after the first hour. A table " +
        "that exists with zero rows is the state between the migration and the first fire, not a defect.",
    );
    return;
  }
  const grade = gradeNewestRun(rows[0]);
  assert.ok(grade.ok,
    `the decision-window finaliser is NOT healthy: ${grade.reason}. Read cron.job (jobname ` +
      `'${JOB_NAME}') and cron.job_run_details over the MCP; a red here is the silence alarm working.`);
  assert.strictEqual(rows[0].actor, FINALISER_ACTOR, "the record's actor is the sweep's attribution string");
}

// ---------------------------------------------------------------------------------------------

export default async function run() {
  theJobSitsOffTheRunnersOwnMinute();
  theGraderIsDiscriminating();
  theDocsCarryTheRuling();
  everyClauseHasTeeth();
  theClausesFailOnThePreChangeTree();
  await theFinaliserIsAliveAndClean();

  notRun(
    "the WRITE path -- run_window_finaliser() itself, its exception branch, the cron.job row and " +
      "every pg_proc / grant fact",
    "run_window_finaliser() is a WRITER (it finalises the decision ledger through the sweep and " +
      "records a run row); a permanent regression test never writes the live board. MEASURED AT " +
      "THIS SHIP instead, over the MCP: the migration's own trailing DO block asserted exactly one " +
      "overload, EXECUTE false for anon/authenticated and true for service_role, SELECT on " +
      "runner_finaliser_runs false for both public roles, and exactly one active cron.job named " +
      "runner-window-finaliser; one hand call returned (0, 0, 0) with nothing expired and wrote one " +
      "run row with error null -- and that first hand call finalised ONE decision whose window had " +
      "already lapsed unnoticed (46685148, a reversal record, expired 2026-09-03 14:45Z), the first " +
      "finalisation in the platform's life; the exception branch was exercised in a rolled-back DO " +
      "block that renamed sweep_decision_windows away for the length of the transaction: the call " +
      "returned (0, 0, 0) and left exactly one error row naming the missing function, then rolled back.",
  );
}

selfRun(import.meta.url, run);
