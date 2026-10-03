// DeepBench v7.0.592 | tests/regression/agt-148-model-trial.test.mjs | AGT-148 -- the model trial
// runner replays a job's recorded agent turns on a candidate model, and Opus 5.5 joins the models
// that refuse a forced tool_choice.
//
// CONTROL (kickoff §6): on origin/dev + AGT-142/143/144, supportsForcedToolChoice('claude-opus-5-5')
// is true and scripts/model-trial.js does not exist, so every part below fails there.
//
// (a) the prefix, both directions: the trailing dash keeps `claude-opus-5` forced-capable.
// (b) roomFor at the kickoff's measured reading, and each stop it names -- the wall is checked before
//     the pace line, so 85 names `weekly_rest_pct`, not `weekly_pace`.
// (c) pickJobs over 7 fixture rows -> exactly the 3 newest replayable; a non-replayable capability.
// (d) scoreAnswer: pass, a missing key, an error envelope, a dead premise with evidence.
// (e) LIVE, dry-run only -- NO MODEL CALL, NO SPEND: lane/judgment prints 3 job_refs and room ok;
//     capability/bench-report-card exits 4; no trial log row appears. When the live meter reads no
//     room the script exits 3 before picking jobs; that is declared via notRun(), never passed.

import assert from "assert";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { supportsForcedToolChoice } from "../../shared/models.js";
import { REPLAYABLE, roomFor, pickJobs, scoreAnswer } from "../../scripts/model-trial.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "model-trial.js");
const FEATURE = "design-kickoff:ds-kickoff-intent:depth0";

// The reading measured 2026-09-25 19:05Z (kickoff §2).
const READING = {
  all_models_pct: 7, pace_limit_pct: 14.29, wall_pct: 85, wall_stop: "weekly_rest_pct",
  fable_pct: 8, fable_share: 14.29, reading_age_hours: 0.24, meter_stale_hours: 2,
};

function partA() {
  assert.strictEqual(supportsForcedToolChoice("claude-opus-5-5"), false, "Opus 5.5 400s on a forced tool_choice (961caae922b0381a)");
  assert.strictEqual(supportsForcedToolChoice("claude-opus-5"), true, "the trailing dash must keep claude-opus-5 forced-capable");
  assert.strictEqual(supportsForcedToolChoice("claude-sonnet-5"), true);
  assert.strictEqual(supportsForcedToolChoice("claude-fable-5-1"), false);
  console.log("  (a) opus-5-5 false, opus-5 true, sonnet-5 true, fable-5-1 false -- PASS");
}

function partB() {
  assert.strictEqual(roomFor(READING, "claude-opus-5-5"), null);
  assert.strictEqual(roomFor(READING, "claude-fable-5-1"), null);
  assert.deepEqual(roomFor({ ...READING, all_models_pct: 14.29 }, "claude-opus-5-5"), { reason: "weekly_pace" });
  assert.deepEqual(roomFor({ ...READING, all_models_pct: 85 }, "claude-opus-5-5"), { reason: "weekly_rest_pct" },
    "past the wall names the wall's own stop, not the milder pace line");
  assert.deepEqual(roomFor({ ...READING, fable_pct: 14.29 }, "claude-fable-5-1"), { reason: "fable_share" });
  assert.strictEqual(roomFor({ ...READING, fable_pct: 14.29 }, "claude-opus-5-5"), null, "fable_share binds Fable candidates only");
  assert.deepEqual(roomFor({ ...READING, reading_age_hours: 2.5 }, "claude-opus-5-5"), { reason: "meter_stale" });
  console.log("  (b) room null at the reading; weekly_pace / weekly_rest_pct / fable_share (Fable only) / meter_stale -- PASS");
}

function partC() {
  const M = "claude-fable-5-1";
  const row = (id, min, over = {}) => ({
    id, created_at: `2026-09-25T19:${String(min).padStart(2, "0")}:00Z`, feature: FEATURE, model: M,
    input_tokens: 1000, output_tokens: 100, visitor_id: `cycle-${id}`, ...over,
  });
  const rows = [
    row(1, 1), row(2, 2), row(3, 3), row(4, 4),
    row(5, 50, { model: "claude-opus-5" }),
    row(6, 51, { model: "claude-sonnet-5" }),
    row(7, 52, { input_tokens: null }),
    row(8, 53, { feature: "build-ticket:bt-intent:depth0" }),
  ].filter(r => r.id !== 1); // 7 fixture rows
  assert.equal(rows.length, 7);
  const { jobs, reason } = pickJobs(rows, { jobKind: "lane", jobKey: "judgment", model: M });
  assert.strictEqual(reason, undefined);
  assert.deepEqual(jobs.map(j => j.id), [4, 3, 2],
    "exactly the 3 newest replayable -- two wrong-model, one null-token and one build-ticket row are all newer and all out");
  const cap = pickJobs(rows, { jobKind: "capability", jobKey: "bench-report-card", model: M });
  assert.deepEqual(cap, { jobs: [], reason: "not-replayable" });
  const own = pickJobs(rows, { jobKind: "capability", jobKey: "design-kickoff", model: M });
  assert.deepEqual(own.jobs.map(j => j.id), [4, 3, 2], "a capability key naming a REPLAYABLE feature picks the same turns");
  assert.ok(REPLAYABLE[FEATURE]?.agent === "designer");
  console.log("  (c) 3 newest replayable of 7; bench-report-card not-replayable -- PASS");
}

function partD() {
  const required = ["backlog_id", "premise", "kickoff_markdown", "qa_discriminator"];
  const env = obj => ({ is_error: false, result: `Here it is.\n${JSON.stringify(obj)}` });
  const full = { backlog_id: "X-1", premise: "live", kickoff_markdown: "# k", qa_discriminator: "q" };
  assert.strictEqual(scoreAnswer({ envelope: env(full), required, checkKickoffExit: 0 }).passed, true);
  assert.strictEqual(scoreAnswer({ envelope: env(full), required, checkKickoffExit: 1 }).passed, false, "a kickoff over cap does not pass");
  const { qa_discriminator, ...noQa } = full;
  assert.strictEqual(scoreAnswer({ envelope: env(noQa), required, checkKickoffExit: 0 }).passed, false, "missing qa_discriminator");
  assert.strictEqual(scoreAnswer({ envelope: { ...env(full), is_error: true }, required, checkKickoffExit: 0 }).passed, false, "is_error");
  const dead = { ...full, premise: "dead", premise_evidence: "measured", kickoff_markdown: null };
  assert.strictEqual(scoreAnswer({ envelope: env(dead), required, checkKickoffExit: null }).passed, true, "premise dead + evidence");
  assert.strictEqual(scoreAnswer({ envelope: env({ ...dead, premise_evidence: "" }), required, checkKickoffExit: null }).passed, false,
    "a dead premise WITHOUT evidence is not a pass");
  console.log("  (d) pass / missing key / is_error / dead premise + evidence -- PASS");
}

async function partE() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-148 (e): live --dry-run of scripts/model-trial.js", "SUPABASE_URL / SUPABASE_SERVICE_KEY not set");
    return;
  }
  const started = new Date().toISOString();
  const run = args => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8", env: process.env });

  const lane = run(["--dry-run", "--job-kind=lane", "--job-key=judgment", "--candidate=claude-opus-5-5"]);
  if (lane.status === 3) {
    notRun("AGT-148 (e): lane/judgment dry-run job list and capability exit 4",
      `the live meter read no room (${lane.stdout.trim()}); the script correctly refused with exit 3 before picking jobs`);
  } else {
    assert.equal(lane.status, 0, `lane dry-run exited ${lane.status}: ${lane.stdout}${lane.stderr}`);
    const refs = lane.stdout.split("\n").filter(l => l.startsWith("job_ref: "));
    assert.equal(refs.length, 3, `expected 3 job_refs, got:\n${lane.stdout}`);
    assert.ok(refs.every(l => /^job_ref: [0-9a-f-]{36}\/\d+ /.test(l)), "each job_ref is <cycle id>/<log id>");
    assert.ok(/^room: ok$/m.test(lane.stdout));

    const cap = run(["--dry-run", "--job-kind=capability", "--job-key=bench-report-card", "--candidate=claude-opus-5-5"]);
    assert.equal(cap.status, 4, `bench-report-card must exit 4 (not-replayable), got ${cap.status}: ${cap.stdout}${cap.stderr}`);
    assert.ok(/not-replayable/.test(cap.stdout));
    console.log(`  (e) lane/judgment dry-run: 3 job_refs, room ok; bench-report-card exit 4`);
  }

  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/ai_activity_log?feature=like.model-assignment:trial:*&created_at=gt.${encodeURIComponent(started)}&select=id`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  assert.ok(res.ok, `ai_activity_log read HTTP ${res.status}`);
  assert.deepEqual(await res.json(), [], "a dry-run must write no trial log row");
  console.log("  (e) 0 model-assignment:trial rows since the test started");
}

async function run() {
  partA();
  partB();
  partC();
  partD();
  await partE();
}

export default run;
selfRun(import.meta.url, run);
