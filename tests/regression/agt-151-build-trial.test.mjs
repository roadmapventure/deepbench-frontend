// DeepBench v7.0.677 | tests/regression/agt-151-build-trial.test.mjs | AGT-151 -- the model trial
// runner can replay the ORCHESTRATOR lane's recorded job, which is a build, and a lane key picks
// only the turns recorded on that lane.
//
// CONTROL (kickoff §6, re-established against today's dev at 901e147c, v7.0.675 -- NOT the v7.0.592
// the kickoff was written against): on origin/dev `scripts/model-trial.js` exports no `kickoffFiles`
// and no `scoreBuild`, `REPLAYABLE` holds one design entry with no `lane`, and
// `--job-kind=lane --job-key=orchestrator` exits 4 with `jobs: 0 of 3`. (a) and (c) fail on the
// import there, (b)'s orchestrator and mechanical cases both return 0 rows, and (d)'s dry-run exits
// 4 instead of 0.
//
// (a) kickoffFiles over the AGT-148 kickoff -> exactly its three named files; the §1 harvest
//     citation and the `node <cmd>` tokens in §4 are NOT files it names.
// (b) pickJobs over 8 fixtures -- the discriminating pair is the newest row on each model, which is
//     on the OTHER lane: drop the lane filter and both lane queries pick it up.
// (c) scoreBuild: a pass, a path outside the kickoff, an empty diff, a red dry run, an error
//     envelope, a missing required key.
// (d) LIVE, dry-run only -- NO MODEL CALL, NO SPEND, NO BUILD REPLAY: lane/orchestrator prints 3
//     job_refs on build-ticket features and 3 `est:` lines, lane/mechanical exits 4 printing
//     `0 of 3`, no trial log row is written, and the baseline tests stay green. When the live meter
//     reads no room the script exits 3 before picking jobs; that is declared via notRun(), never
//     passed.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { REPLAYABLE, pickJobs, kickoffFiles, scoreBuild } from "../../scripts/model-trial.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "model-trial.js");
const BUILD = "build-ticket:bd-build-intent:depth0";
const DESIGN = "design-kickoff:ds-kickoff-intent:depth0";

// The baseline set this ticket is graded against. The kickoff's §2 block named ses-297 as its third;
// it is RED on today's tree for a reason that is not this ticket's (its own fixture refuses to run
// when the two live meters are equal, which they are at 7), so this part asserts the two the kickoff
// needs green plus agt-150, whose driver imports roomFor() from the file AGT-151 edits.
const BASELINE_TESTS = [
  "tests/regression/agt-148-model-trial.test.mjs",
  "tests/regression/ses-313-model-lanes.test.mjs",
  "tests/regression/agt-150-model-assignment.test.mjs",
];

function partA() {
  const md = fs.readFileSync(path.join(ROOT, "docs", "kickoffs", "v7.0.592-AGT-148-model-trial-runner.md"), "utf8");
  const files = kickoffFiles(md);
  assert.deepEqual(files, [
    "scripts/model-trial.js",
    "shared/models.js",
    "tests/regression/agt-148-model-trial.test.mjs",
  ], "exactly the three files AGT-148 names in §4/§5");
  assert.ok(!files.includes("docs/harvests/AGT-148.md"),
    "the harvest is CITED in §1, never edited -- a citation outside the §4-§5 window is not a named file");
  assert.ok(!files.some(f => f.includes(" ")), "`node tests/regression/run-all.js` is a command, not a path");
  assert.deepEqual(kickoffFiles(""), [], "no §4 heading -> no named files, never a silently empty allow-all");
  assert.deepEqual(kickoffFiles("## 4.\nedits `src/App.jsx`\n## 6.\nand `api/leak.js`\n"), ["src/App.jsx"],
    "the window closes at §6 -- a path quoted in the QA section is not a file the kickoff names");
  console.log(`  (a) kickoffFiles(AGT-148 kickoff) -> ${files.join(", ")}; harvest absent -- PASS`);
}

function partB() {
  const row = (id, feature, model, min) => ({
    id, feature, model, created_at: `2026-09-25T20:${String(min).padStart(2, "0")}:00Z`,
    input_tokens: 150000, output_tokens: 14000, visitor_id: `cycle-${id}`,
  });
  const rows = [
    row(1, BUILD, "claude-opus-5", 10), row(2, BUILD, "claude-opus-5", 11), row(3, BUILD, "claude-opus-5", 12),
    row(4, DESIGN, "claude-fable-5-1", 13), row(5, DESIGN, "claude-fable-5-1", 14), row(6, DESIGN, "claude-fable-5-1", 15),
    // The two newest rows, one per model, each on the OTHER lane: this is what the lane filter is for.
    row(7, BUILD, "claude-fable-5-1", 58),
    row(8, DESIGN, "claude-opus-5", 59),
  ];
  assert.equal(rows.length, 8);

  const orch = pickJobs(rows, { jobKind: "lane", jobKey: "orchestrator", model: "claude-opus-5" });
  assert.strictEqual(orch.reason, undefined);
  assert.deepEqual(orch.jobs.map(j => j.id), [3, 2, 1],
    "the 3 build rows -- row 8 is NEWER and on the same model, and is excluded because its lane is judgment");

  const judg = pickJobs(rows, { jobKind: "lane", jobKey: "judgment", model: "claude-fable-5-1" });
  assert.deepEqual(judg.jobs.map(j => j.id), [6, 5, 4],
    "the 3 design rows -- row 7 is NEWER on the same model and is excluded as a build");

  const cap = pickJobs(rows, { jobKind: "capability", jobKey: "build-ticket", model: "claude-opus-5" });
  assert.deepEqual(cap.jobs.map(j => j.id), [3, 2, 1], "a capability key naming the build feature picks the same 3");

  const mech = pickJobs(rows, { jobKind: "lane", jobKey: "mechanical", model: "claude-sonnet-5" });
  assert.deepEqual(mech.jobs, [], "the mechanical lane holds no replayable feature -- 0 jobs, and the caller exits 4");

  assert.strictEqual(REPLAYABLE[BUILD].lane, "orchestrator");
  assert.strictEqual(REPLAYABLE[BUILD].kind, "build");
  assert.strictEqual(REPLAYABLE[BUILD].agent, "builder");
  assert.strictEqual(REPLAYABLE[DESIGN].lane, "judgment");
  assert.strictEqual(REPLAYABLE[DESIGN].kind, "turn", "the design entry keeps its own shape -- AGT-148 is not re-scored as a build");
  console.log("  (b) orchestrator -> 3 build, judgment -> 3 design (each excluding a newer row on the other lane), capability -> 3, mechanical -> 0 -- PASS");
}

function partC() {
  const required = ["backlog_id", "outcome", "files", "tasks", "build", "regression_summary"];
  const full = {
    backlog_id: "AGT-151", outcome: "pushed", files: ["scripts/model-trial.js"], tasks: ["1"],
    build: "green", regression_summary: "308/332",
  };
  const env = obj => ({ is_error: false, result: `Done.\n${JSON.stringify(obj)}` });
  const kickoff = "## 4. STUB\n- `scripts/model-trial.js` and `tests/regression/agt-151-build-trial.test.mjs`\n## 6. QA\n";

  const ok = scoreBuild({ envelope: env(full), required, changed: ["scripts/model-trial.js"], kickoff, dryRunExit: 0 });
  assert.strictEqual(ok.passed, true, `inside the kickoff with a green dry run must pass: ${ok.why}`);

  const out = scoreBuild({ envelope: env(full), required, changed: ["scripts/x.js"], kickoff, dryRunExit: 0 });
  assert.strictEqual(out.passed, false);
  assert.ok(/^outside-kickoff: scripts\/x\.js$/.test(out.why), `the reason names the offending path, got "${out.why}"`);

  const empty = scoreBuild({ envelope: env(full), required, changed: [], kickoff, dryRunExit: 0 });
  assert.strictEqual(empty.passed, false, "a replay that changed NOTHING is trivially inside the named set and is not a pass");
  assert.strictEqual(empty.why, "no-changed-files");

  const red = scoreBuild({ envelope: env(full), required, changed: ["scripts/model-trial.js"], kickoff, dryRunExit: 1 });
  assert.strictEqual(red.passed, false, "a red --dry-run is not a pass even when every file is in scope");

  const err = scoreBuild({ envelope: { ...env(full), is_error: true }, required, changed: ["scripts/model-trial.js"], kickoff, dryRunExit: 0 });
  assert.strictEqual(err.passed, false);
  assert.strictEqual(err.why, "is_error");

  const { regression_summary, ...noSuite } = full;
  const miss = scoreBuild({ envelope: env(noSuite), required, changed: ["scripts/model-trial.js"], kickoff, dryRunExit: 0 });
  assert.strictEqual(miss.passed, false, "a build answer missing regression_summary is not a pass");
  assert.ok(miss.why.startsWith("missing regression_summary"), miss.why);

  const none = scoreBuild({ envelope: null, required, changed: ["scripts/model-trial.js"], kickoff, dryRunExit: 0 });
  assert.strictEqual(none.passed, false, "no envelope at all (the CLI printed nothing parseable) is never a pass");
  console.log("  (c) pass / outside-kickoff / empty diff / red dry run / is_error / missing key -- PASS");
}

async function partD() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-151 (d): live --dry-run of the orchestrator lane", "SUPABASE_URL / SUPABASE_SERVICE_KEY not set");
    return;
  }
  const started = new Date().toISOString();
  const run = args => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8", env: process.env });

  const lane = run(["--dry-run", "--job-kind=lane", "--job-key=orchestrator", "--candidate=claude-opus-5-5"]);
  if (lane.status === 3) {
    notRun("AGT-151 (d): lane/orchestrator dry-run job list, est lines and the mechanical exit 4",
      `the live meter read no room (${lane.stdout.trim()}); the script correctly refused with exit 3 before picking jobs`);
  } else {
    assert.equal(lane.status, 0, `lane/orchestrator dry-run exited ${lane.status}: ${lane.stdout}${lane.stderr}`);
    const refs = lane.stdout.split("\n").filter(l => l.startsWith("job_ref: "));
    assert.equal(refs.length, 3, `expected 3 job_refs, got:\n${lane.stdout}`);
    assert.ok(refs.every(l => /^job_ref: [0-9a-f-]{36}\/\d+ \(build-ticket:bd-build-intent:depth0, /.test(l)),
      `every picked job is a BUILD turn, not a design turn borrowed from the judgment lane:\n${refs.join("\n")}`);
    const est = lane.stdout.split("\n").filter(l => l.startsWith("est: "));
    assert.equal(est.length, 3, `expected 3 est lines, got:\n${lane.stdout}`);
    assert.ok(est.every(l => /^est: \d+ tokens, (\d+\.\d|\?) min, base [0-9a-f]{7,}$/.test(l)),
      `each est line states tokens, minutes and the base it would start from:\n${est.join("\n")}`);
    assert.ok(/^est total: \d+ tokens, (\d+\.\d|\?) min over 3 jobs$/m.test(lane.stdout), `no est total line:\n${lane.stdout}`);
    assert.ok(/^room: ok$/m.test(lane.stdout));

    const mech = run(["--dry-run", "--job-kind=lane", "--job-key=mechanical", "--candidate=claude-opus-5-5"]);
    assert.equal(mech.status, 4, `lane/mechanical must exit 4, got ${mech.status}: ${mech.stdout}${mech.stderr}`);
    assert.ok(/jobs: 0 of 3/.test(mech.stdout), `mechanical holds no replayable turn: ${mech.stdout}`);
    console.log(`  (d) lane/orchestrator dry-run: 3 build job_refs, 3 est lines, room ok; lane/mechanical exit 4 on 0 of 3`);
  }

  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/ai_activity_log?feature=like.model-assignment:trial:*&created_at=gt.${encodeURIComponent(started)}&select=id`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  assert.ok(res.ok, `ai_activity_log read HTTP ${res.status}`);
  assert.deepEqual(await res.json(), [], "a dry-run must write no trial log row -- and no build replay ran this cycle");
  console.log("  (d) 0 model-assignment:trial rows since the test started");

  const base = spawnSync(process.execPath, [path.join(ROOT, "scripts", "baseline-red-set.js"), `--tests=${BASELINE_TESTS.join(",")}`],
    { cwd: ROOT, encoding: "utf8", env: process.env });
  assert.equal(base.status, 0, `baseline-red-set could not run: ${base.stdout}${base.stderr}`);
  assert.ok(/^Red set: 0 of 3$/m.test(base.stdout),
    `the trial runner's own baseline tests must all stay green:\n${base.stdout}`);
  console.log(`  (d) baseline tests green: ${BASELINE_TESTS.map(t => path.basename(t)).join(", ")}`);
}

async function run() {
  partA();
  partB();
  partC();
  await partD();
}

export default run;
selfRun(import.meta.url, run);
