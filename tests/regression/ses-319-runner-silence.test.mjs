// DeepBench v7.0.423 | tests/regression/ses-319-runner-silence.test.mjs | SES-319 -- the runner's
// silence is measured WHILE it is open, on the database's clock, and recorded beside every finaliser run.
//
// WHAT IS BEING PINNED. SES-269's check-cycle-cadence.js can only report a hole at the first fire
// after it (its own header: a detector hosted inside the runner cannot fire during a silence). Since
// v7.0.422 something on this platform runs DURING a silence -- the runner-window-finaliser job -- and
// this ship gives it a reading: public.runner_silence() measures the age of the newest UNATTENDED fire
// against John's cadence (runner_settings.interval_hours) with the cadence script's own threshold, and
// reads runner_should_boot() beside it, so `alarm` is literally "silent while the pre-boot gate says
// boot" -- the ticket's title. The finaliser stores that reading in runner_finaliser_runs.silence.
//
// ONE THRESHOLD, TWO HOMES, BOUND HERE. GAP_MULTIPLE and MIN_ALERT_HOURS are imported from the REAL
// script (STANDARDS.md Section 4, SES-45: never a recreation), and the live arm asserts the deployed
// function's threshold_hours equals max(MIN_ALERT_HOURS, interval_hours x GAP_MULTIPLE) computed from
// the interval_hours it returned. Change either home alone and this goes red.
//
// AN ALARM IS PRINTED, NEVER FAILED. Turning the routine off is John's switch; a suite that went red
// on his own order would be handing him a chore. The reading reaches him through his watchdog routine,
// which is his to edit -- the kickoff says so rather than pretending otherwise.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { GAP_MULTIPLE, MIN_ALERT_HOURS } from "../../scripts/check-cycle-cadence.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// origin/dev immediately before this ship (the v7.0.422 finaliser ship). A SHA, never a branch name.
const PRE_CHANGE_SHA = "3e181af727a348b7a61a58c3a1d0d5e60a0eab4b";

const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";

export const norm = s => s.replace(/\s+/g, " ");

// ---------------------------------------------------------------------------------------------
// THE PURE HALF: the threshold formula, graded against the cadence script's real constants.
// ---------------------------------------------------------------------------------------------

export function thresholdHours(intervalHours) {
  return Math.max(MIN_ALERT_HOURS, Number(intervalHours) * GAP_MULTIPLE);
}

// The triggers that count as the ROUTINE firing. A supervised row is a person in the room.
export const UNATTENDED_TRIGGERS = ["scheduled", "on_demand", "chained (drain continuation)"];

function theThresholdIsTheCadenceScripts() {
  assert.strictEqual(typeof GAP_MULTIPLE, "number");
  assert.strictEqual(typeof MIN_ALERT_HOURS, "number");
  assert.strictEqual(thresholdHours(1), Math.max(MIN_ALERT_HOURS, GAP_MULTIPLE),
    "at John's live 1-hour cadence the floor binds: one full period of the independent watchdog");
  assert.strictEqual(thresholdHours(3), Math.max(MIN_ALERT_HOURS, 3 * GAP_MULTIPLE),
    "at the pre-08-28 3-hour cadence the multiple binds");
  assert.ok(!UNATTENDED_TRIGGERS.includes("supervised"),
    "a supervised cycle is a person, not the routine -- it must never reset the silence clock");
}

// ---------------------------------------------------------------------------------------------
// THE DOC HALF.
// ---------------------------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "4a-quinquies-names-the-reading",
    file: RUNBOOK_REL,
    detail: "the step that owns the cadence alarm names the live-during-the-hole reading",
    test: t => norm(t).includes("`public.runner_silence()`"),
    breaks: t => t.replaceAll("`public.runner_silence()`", "`public.runner_silence_x()`"),
  },
  {
    id: "4a-quinquies-names-the-column",
    file: RUNBOOK_REL,
    detail: "where the reading is recorded, so a hole has a series a later reader can find",
    test: t => norm(t).includes("row's `silence` column"),
    breaks: t => t.replaceAll("row's `silence` column", "row's `silencex` column"),
  },
  {
    id: "4a-quinquies-annotates-the-attended-half",
    file: RUNBOOK_REL,
    detail:
      "'That half needs a session John attends' was true and is now historical; it is annotated in " +
      "place (SES-289 shape), never deleted, and the paragraph says what STILL needs John",
    test: t => norm(t).includes("That half needs a session John attends") &&
               norm(t).includes("this was that session") &&
               norm(t).includes("What still needs John, unchanged"),
    breaks: t => t.replaceAll("What still needs John, unchanged", "Nothing still needs John"),
  },
];

function readRel(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function theDocsCarryTheRuling() {
  for (const c of CLAUSES) assert.ok(c.test(readRel(c.file)), `${c.id} -- ${c.detail}`);
}

function everyClauseHasTeeth() {
  for (const c of CLAUSES) {
    const text = readRel(c.file);
    const broken = c.breaks(text);
    assert.notStrictEqual(broken, text, `${c.id}: breaks() changed nothing`);
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
    notRun("the file-level control: every DOC clause fails against the pre-change runbook",
      `${PRE_CHANGE_SHA.slice(0, 8)} is not reachable from this clone (shallow checkout).`);
    return;
  }
  for (const c of CLAUSES) {
    assert.ok(!c.test(before), `${c.id} passes on the PRE-CHANGE runbook -- it does not pin this ship`);
  }
}

// ---------------------------------------------------------------------------------------------
// THE LIVE HALF -- read-only over PostgREST: the STABLE function, and the finaliser's record.
// ---------------------------------------------------------------------------------------------

const base = url => url.replace(/\/+$/, "");

export const SILENCE_COLUMNS = [
  "measured_at", "last_fire_at", "last_fire_trigger", "silence_hours", "interval_hours",
  "threshold_hours", "should_boot", "boot_reason", "next_pick", "alarm",
];

async function theDeployedReadingMatchesTheScript() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arms: runner_silence() returns one row with the ten columns and a threshold equal " +
        "to the cadence script's formula; the newest finaliser run carries the reading",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. Canonical invocation: STANDARDS.md " +
        "Section 2 rule 5.",
    );
    return;
  }
  const res = await fetch(`${base(url)}/rest/v1/rpc/runner_silence`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.ok(res.ok, `rpc/runner_silence returned HTTP ${res.status}`);
  const rows = await res.json();
  assert.strictEqual(rows.length, 1, "runner_silence() returns exactly one row, always -- even before the first fire");
  const r = rows[0];
  for (const c of SILENCE_COLUMNS) assert.ok(c in r, `runner_silence() row lacks column ${c}`);
  assert.strictEqual(Number(r.threshold_hours), thresholdHours(r.interval_hours),
    "the deployed threshold must equal max(MIN_ALERT_HOURS, interval_hours x GAP_MULTIPLE) from " +
      "scripts/check-cycle-cadence.js -- one threshold, two homes, bound here");
  assert.strictEqual(typeof r.alarm, "boolean");
  assert.strictEqual(r.alarm, Boolean(r.should_boot) && (r.silence_hours == null || Number(r.silence_hours) >= Number(r.threshold_hours)),
    "alarm is exactly: the pre-boot gate says boot AND the silence is at or past the threshold");
  if (r.alarm) {
    console.log(`  [ALARM] runner_silence(): the routine has been silent ${r.silence_hours}h (threshold ${r.threshold_hours}h) ` +
      `while runner_should_boot() says ${r.boot_reason}. This is SES-319's title, live. The reading reaches John ` +
      `through his deepbench-staleness-watchdog routine; a cycle may not edit it.`);
  }

  const runs = await fetch(
    `${base(url)}/rest/v1/runner_finaliser_runs?select=ran_at,silence&order=ran_at.desc&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  assert.ok(runs.ok, `runner_finaliser_runs read returned HTTP ${runs.status}`);
  const newest = await runs.json();
  if (!newest.length || newest[0].silence == null) {
    notRun("the newest finaliser run carries the silence reading",
      "no run since this migration yet -- the job fires at :17; re-run after the next hour.");
    return;
  }
  for (const c of ["silence_hours", "threshold_hours", "should_boot", "alarm"]) {
    assert.ok(c in newest[0].silence, `the recorded reading lacks ${c}`);
  }
}

// ---------------------------------------------------------------------------------------------

export default async function run() {
  theThresholdIsTheCadenceScripts();
  theDocsCarryTheRuling();
  everyClauseHasTeeth();
  theClausesFailOnThePreChangeTree();
  await theDeployedReadingMatchesTheScript();

  notRun(
    "pg_proc and grant facts, and run_window_finaliser()'s write of the reading",
    "the suite reaches Supabase over PostgREST only. MEASURED AT THIS SHIP over the MCP instead: the " +
      "migration's own trailing DO block asserted one overload of each function, EXECUTE closed to " +
      "anon/authenticated and open to service_role on runner_silence(), the silence column present, " +
      "and one live row with threshold_hours >= 6; one hand call of run_window_finaliser() wrote a " +
      "run row whose silence carried the reading.",
  );
}

selfRun(import.meta.url, run);
