// DeepBench v7.0.671 | tests/regression/agt-150-model-assignment.test.mjs | AGT-150 -- the model
// assignment driver sequences watch -> trial -> assign in one command, and its offline validator
// mirrors all 20 refusals of public.apply_model_assignment().
//
// CONTROL (kickoff §6): origin/dev has no scripts/model-assignment.js, so every part below fails
// module-not-found there -- the import at the top of this file is the control for the whole test.
//
// (a) parsePairs: two pairs in the order given; a pair with no candidate is { error }.
// (b) a valid answer over the live-shaped context (5 assignments, 6 catalog, 9 pricing) -> ok, no refusals.
// (c) one fixture per refusal, asserted on the function's own quoted words -- and the ACCEPTED twin of
//     the 10% ceiling: the same 1.20x tokens on the hard-judgment band with clearly_better passes.
//     A refusal list that only ever grows is not discriminating; the waiver is what proves it reads
//     `complexity_band` rather than the token ratio alone.
// (d) offline doors: a bad answer exits 1 printing `refused:`, a good one exits 0 printing `ok`, no
//     flags exits 2, and --prepare with neither or BOTH attribution flags exits 2 before any network.
// (e) LIVE, else notRun -- NO MODEL CALL, NO SPEND: --prepare reviews the watch, refuses the trial for
//     no room, and still assembles the prompt. The no-room reason is asserted against roomFor() over
//     the SAME reading rather than against a name recorded when the kickoff was written: the meter
//     moved between design (04:00Z, wall 85 -> `weekly_rest_pct`) and this ship (04:32Z, wall 100 ->
//     `weekly_pace`), and a test that pinned the earlier name would grade the live world instead of
//     this change (pattern:162 -- the mistake agt-144-model-assignment.test.mjs:143 is red for).

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { roomFor } from "../../scripts/model-trial.js";
import {
  ACTIONS, AGENT, CAPABILITY, REFUSAL_LINES, parsePairs, trialFileName, validateAnswer,
} from "../../scripts/model-assignment.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "model-assignment.js");
// The cycle AGT-150 shipped in -- the attribution the kickoff's QA (e) names. Only ever an argument.
const CYCLE = "26a05523-1386-43d2-bc02-90035e24129e";
const CANDIDATE = "claude-opus-5-5";

// The live shape, 2026-09-28: 5 model_assignments (job/model/band verbatim), 6 model_catalog,
// 9 model_pricing. Prices are the FIXTURE's, chosen so each switch below is unambiguously up or down.
function context() {
  return {
    assignments: [
      { job_kind: "lane", job_key: "orchestrator", model_id: "claude-opus-5", complexity_band: "orchestration" },
      { job_kind: "lane", job_key: "judgment", model_id: "claude-fable-5-1", complexity_band: "hard-judgment" },
      { job_kind: "lane", job_key: "mechanical", model_id: "claude-sonnet-5", complexity_band: "mechanical" },
      { job_kind: "capability", job_key: "data-room-custody", model_id: "claude-haiku-4-5-20251001", complexity_band: "mechanical" },
      { job_kind: "capability", job_key: "bench-report-card", model_id: "claude-sonnet-4-6", complexity_band: "mechanical" },
    ],
    catalog: [
      { model_id: "claude-opus-5", family: "opus", deprecated_on: null },
      { model_id: "claude-opus-5-5", family: "opus", deprecated_on: null },
      { model_id: "claude-fable-5-1", family: "fable", deprecated_on: null },
      { model_id: "claude-sonnet-5", family: "sonnet", deprecated_on: null },
      { model_id: "claude-sonnet-4-6", family: "sonnet", deprecated_on: null },
      { model_id: "claude-haiku-4-5-20251001", family: "haiku", deprecated_on: null },
    ],
    pricing: [
      { model: "claude-opus-5", input_per_1k: 15, output_per_1k: 75 },
      { model: "claude-opus-5-5", input_per_1k: 20, output_per_1k: 100 },
      { model: "claude-fable-5-1", input_per_1k: 5, output_per_1k: 25 },
      { model: "claude-sonnet-5", input_per_1k: 3, output_per_1k: 15 },
      { model: "claude-sonnet-4-6", input_per_1k: 3, output_per_1k: 15 },
      { model: "claude-haiku-4-5-20251001", input_per_1k: 1, output_per_1k: 5 },
      { model: "claude-haiku-4-5", input_per_1k: 1, output_per_1k: 5 },
      { model: "claude-fable-5", input_per_1k: 5, output_per_1k: 25 },
      { model: "claude-opus-4-1", input_per_1k: 15, output_per_1k: 75 },
    ],
  };
}

// A passing trial: candidate passed, neither side holds an approve verdict, tokens equal.
const trial = (over = {}) => ({
  job_ref: "c/1",
  baseline: { passed: true, verdict: "none", tokens: 1000 },
  candidate: { passed: true, verdict: "none", tokens: 1000 },
  ...over,
});

function partA() {
  const two = parsePairs("lane/judgment:claude-opus-5-5,capability/bench-report-card:claude-haiku-4-5");
  assert.ok(Array.isArray(two), `expected a queue, got ${JSON.stringify(two)}`);
  assert.deepEqual(two, [
    { jobKind: "lane", jobKey: "judgment", candidate: "claude-opus-5-5" },
    { jobKind: "capability", jobKey: "bench-report-card", candidate: "claude-haiku-4-5" },
  ], "both pairs, in the order given -- the queue order is the run order (pattern:127)");
  assert.ok(parsePairs("lane/judgment").error, "a pair with no candidate is an error, never a guess");
  assert.ok(parsePairs("lane/judgment:").error, "an empty candidate is an error");
  assert.ok(parsePairs("judgment:claude-opus-5").error, "a pair with no lane|capability kind is an error");
  assert.ok(parsePairs("").error, "an empty --trials is an error");
  assert.ok(parsePairs("lane/judgment:claude-opus-5,").error, "a trailing empty pair is an error, not a silent drop");
  assert.equal(trialFileName(two[0]), "trial-lane-judgment-claude-opus-5-5.json");
  console.log("  (a) 2 pairs in order; no candidate / no kind / empty / trailing comma all { error } -- PASS");
}

function partB() {
  assert.equal(REFUSAL_LINES.length, 20,
    "the mirror carries all 20 raise-exception lines read live from pg_get_functiondef (count asserted live 2026-09-28)");
  assert.deepEqual([...ACTIONS], ["switch", "keep", "money", "file-ticket"], "k_actions, in the function's order");
  assert.equal(AGENT, "devmanager");
  assert.equal(CAPABILITY, "model-assignment");
  const ctx = context();
  assert.equal(ctx.assignments.length, 5);
  assert.equal(ctx.catalog.length, 6);
  assert.equal(ctx.pricing.length, 9);
  const answer = {
    catalog: [{ model_id: "claude-opus-5-5", family: "opus", input_per_1k: 20, output_per_1k: 100 }],
    actions: [{ job_kind: "lane", job_key: "judgment", action: "keep", reason: "no candidate beat Fable 5.1 on the three replays" }],
    patterns_applied: [9],
  };
  assert.deepEqual(validateAnswer(answer, ctx), { ok: true, refusals: [] });
  console.log("  (b) 20 refusal lines mirrored; a keep-with-reason over 5/6/9 rows -> ok, no refusals -- PASS");
}

// Each fixture is refused on the function's own words, and nothing else is asserted about the text:
// the quoted fragment is the contract, the surrounding sentence is the function's to reword.
function partC() {
  const ctx = context();
  const only = (answer, fragment, label) => {
    const v = validateAnswer(answer, ctx);
    assert.equal(v.ok, false, `${label} must be refused, got ok: ${JSON.stringify(v)}`);
    assert.ok(v.refusals.some(r => r.includes(fragment)),
      `${label}: no refusal quoted "${fragment}" -- got ${JSON.stringify(v.refusals)}`);
  };
  const switchTo = (job, to, over = {}) => ({
    actions: [{
      job_kind: job[0], job_key: job[1], action: "switch", to_model: to, reason: "three replays passed",
      trial_evidence: [trial(), trial(), trial()], ...over,
    }],
  });

  // 1. fewer than three trials.
  only(switchTo(["lane", "judgment"], "claude-opus-5-5", { trial_evidence: [trial(), trial()] }),
    "at least 3 trials, got 2", "two trials");
  // 2. a trial the candidate did not pass.
  only(switchTo(["lane", "judgment"], "claude-opus-5-5",
    { trial_evidence: [trial(), trial(), trial({ candidate: { passed: false, verdict: "none", tokens: 1000 } })] }),
    "candidate did not pass", "one failed trial");
  // 3. match-or-beat: an UP switch (fable 5 -> opus 20) where one trial lost an approve the baseline had.
  only(switchTo(["lane", "judgment"], "claude-opus-5-5", {
    trial_evidence: [trial(), trial(), trial({
      baseline: { passed: true, verdict: "approve", tokens: 1000 },
      candidate: { passed: true, verdict: "block", tokens: 1000 },
    })],
  }), "match-or-beat", "a lost approve on an up switch");
  // 4. the 10% ceiling: 1.20x tokens on a mechanical band, where no waiver can apply.
  only(switchTo(["capability", "bench-report-card"], "claude-opus-5-5", {
    trial_evidence: [1, 2, 3].map(() => trial({ candidate: { passed: true, verdict: "none", tokens: 1200 } })),
  }), "more than 10%", "1.20x tokens, mechanical band");
  // 5. a catalog row that is not a Claude model.
  only({ catalog: [{ model_id: "gpt-5", family: "gpt", input_per_1k: 1, output_per_1k: 2 }], actions: [] },
    "Claude models only", "gpt-5 in the catalog");
  // 6. an action naming a job with no row.
  only({ actions: [{ job_kind: "lane", job_key: "marketing", action: "keep", reason: "why" }] },
    "no model_assignments row", "lane/marketing");
  // 7. an empty answer.
  only({ catalog: [], actions: [] }, "nothing to apply", "empty catalog and actions");

  // AND THE ACCEPTED TWIN of fixture 4: the same 1.20x on lane/judgment, whose band IS hard-judgment,
  // with one passing trial called clearly better. Same ratio, opposite outcome -- this is what makes
  // the ceiling a rule the validator reads rows for, not a constant it compares against.
  const waived = switchTo(["lane", "judgment"], "claude-opus-5-5", {
    trial_evidence: [
      trial({ candidate: { passed: true, verdict: "none", tokens: 1200 } }),
      trial({ candidate: { passed: true, verdict: "none", tokens: 1200 } }),
      trial({ candidate: { passed: true, verdict: "none", tokens: 1200 }, clearly_better: true }),
    ],
  });
  assert.deepEqual(validateAnswer(waived, ctx), { ok: true, refusals: [] },
    "hard-judgment + a passing clearly_better trial waives the 10% ceiling");
  // The flag alone is not the waiver: on a FAILED trial it waives nothing (and the failure refuses too).
  const notWaived = validateAnswer(switchTo(["lane", "judgment"], "claude-opus-5-5", {
    trial_evidence: [
      trial({ candidate: { passed: true, verdict: "none", tokens: 1200 } }),
      trial({ candidate: { passed: true, verdict: "none", tokens: 1200 } }),
      trial({ candidate: { passed: false, verdict: "none", tokens: 1200 }, clearly_better: true }),
    ],
  }), ctx);
  assert.equal(notWaived.ok, false);
  assert.ok(notWaived.refusals.some(r => r.includes("more than 10%")),
    `clearly_better on a failed trial must not waive the ceiling -- got ${JSON.stringify(notWaived.refusals)}`);

  // A down switch faces neither up-only rule: opus 15 -> sonnet 3 with 1.20x tokens and a lost approve.
  const down = validateAnswer({
    actions: [{
      job_kind: "lane", job_key: "orchestrator", action: "switch", to_model: "claude-sonnet-5",
      reason: "cheaper and it held", trial_evidence: [trial(), trial(), trial({
        baseline: { passed: true, verdict: "approve", tokens: 1000 },
        candidate: { passed: true, verdict: "none", tokens: 1200 },
      })],
    }],
  }, ctx);
  assert.deepEqual(down, { ok: true, refusals: [] },
    "match-or-beat and the 10% ceiling are UP-only -- a down switch is not held to either");

  // Every refusal at once: the door shows the manager the whole list, unlike the function.
  const many = validateAnswer({
    catalog: [{ model_id: "gpt-5" }],
    actions: [{ job_kind: "lane", job_key: "judgment", action: "teleport" }],
  }, ctx);
  assert.equal(many.ok, false);
  assert.ok(many.refusals.length >= 3,
    `a dry-run collects every refusal, not the first -- got ${JSON.stringify(many.refusals)}`);
  console.log(`  (c) 7 refusals on their quoted words; the 1.20x waiver ACCEPTED, the failed-trial flag not; a down switch free of both; ${many.refusals.length} collected at once -- PASS`);
}

function partD() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt150-"));
  const write = (name, obj) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, JSON.stringify(obj), "utf8");
    return p;
  };
  const run = args => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8", env: process.env });
  try {
    // The context as --prepare --json writes it: the wrapper, not the bare object.
    const ctxFile = write("ctx.json", { assignments: 5, trials: 0, model: "claude-opus-5", prompt_bytes: 39764, context: context() });
    const good = write("good.json", {
      actions: [{ job_kind: "lane", job_key: "judgment", action: "keep", reason: "nothing beat it" }],
    });
    const bad = write("bad.json", { catalog: [], actions: [] });

    const refused = run([`--dry-run=${bad}`, `--context=${ctxFile}`]);
    assert.equal(refused.status, 1, `a refused dry-run exits 1, got ${refused.status}: ${refused.stdout}${refused.stderr}`);
    assert.ok(/^refused: .*nothing to apply/m.test(refused.stderr),
      `each refusal prints as "refused: <the function's words>" -- got ${refused.stderr}`);

    const ok = run([`--dry-run=${good}`, `--context=${ctxFile}`]);
    assert.equal(ok.status, 0, `a clean dry-run exits 0, got ${ok.status}: ${ok.stdout}${ok.stderr}`);
    assert.equal(ok.stdout.trim(), "ok");

    const bare = run([]);
    assert.equal(bare.status, 2, `no flags is exit 2 -- could not run, never a pass; got ${bare.status}`);
    assert.ok(/^usage: model-assignment\.js/m.test(bare.stderr));

    // Attribution, on the write door, BEFORE any network: neither and both are each exit 2.
    const neither = run(["--prepare"]);
    assert.equal(neither.status, 2, `--prepare with no attribution is exit 2, got ${neither.status}: ${neither.stderr}`);
    assert.ok(/exactly one of --cycle-id/.test(neither.stderr));
    const both = run(["--prepare", `--cycle-id=${CYCLE}`, "--session-name=session/x"]);
    assert.equal(both.status, 2, `--prepare with BOTH is exit 2, got ${both.status}: ${both.stderr}`);
    assert.ok(/exactly one of --cycle-id/.test(both.stderr));
    // A malformed queue never half-runs: exit 2 before the credentials are even read.
    const badPair = run(["--prepare", `--cycle-id=${CYCLE}`, "--trials=lane/judgment"]);
    assert.equal(badPair.status, 2, `a malformed --trials is exit 2, got ${badPair.status}: ${badPair.stderr}`);
    console.log("  (d) refused 1 / ok 0 / bare 2 / no attribution 2 / both 2 / malformed --trials 2 -- PASS");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function partE() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-150 (e): live --prepare (watch, the no-room refusal, the assembled prompt)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set");
    return;
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const res = await fetch(`${url}/rest/v1/${q}`, { headers });
    assert.ok(res.ok, `GET ${q} -> HTTP ${res.status}`);
    return res.json();
  };
  // select=* rather than a column name: model_catalog and model_pricing are keyed by model_id /
  // model, so one hardcoded pk would 400 on two of the three tables.
  const count = async table => {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers: { ...headers, Prefer: "count=exact" } });
    assert.ok(res.ok, `count ${table} -> HTTP ${res.status}`);
    return Number(String(res.headers.get("content-range") ?? "").split("/")[1]);
  };

  // --prepare's watch leg is a WRITE: with a watch-eligible row it can revert a live assignment. A
  // regression run never mutates working data (pattern:76), so the eligibility is checked FIRST and a
  // live window is declared rather than driven.
  const eligible = await get("model_assignments?decision_id=not.is.null&watch_runs_observed=lt.5&watch_baseline=not.is.null&select=job_kind,job_key");
  if (eligible.length > 0) {
    notRun("AGT-150 (e): live --prepare",
      `${eligible.length} model_assignments row(s) are inside their watch window (${eligible.map(r => `${r.job_kind}/${r.job_key}`).join(", ")}), `
      + "so review_model_watch() could revert a live assignment; a regression run never mutates working data");
    return;
  }

  const boot = await (await fetch(`${url}/rest/v1/rpc/runner_should_boot`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}",
  })).json();
  const detail = (Array.isArray(boot) ? boot[0] : boot)?.detail ?? null;
  const room = roomFor(detail, CANDIDATE);

  const before = { a: await count("model_assignments"), c: await count("model_catalog"), d: await count("runner_decisions") };
  const liveAssignments = await get("model_assignments?select=job_kind");
  const started = new Date().toISOString();

  // With room, spawning model-trial.js would make real model calls -- the trial pair is dropped and
  // the gap declared (pattern:77), never paid for out of a regression run (pattern:80).
  const args = ["--prepare", `--cycle-id=${CYCLE}`, "--json"];
  if (room) args.splice(2, 0, `--trials=lane/judgment:${CANDIDATE}`);
  else {
    notRun("AGT-150 (e): the no-room refusal with a --trials pair",
      `the live meter HAS room (all_models_pct ${detail?.all_models_pct} of wall ${detail?.wall_pct}), so a trial would spend real usage; `
      + "the pair-less --prepare below still proves the watch line, the context rows and the assembled prompt");
  }
  const run = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8", env: process.env });
  assert.equal(run.status, 3, `--prepare exits 3 (awaiting the answer), got ${run.status}: ${run.stdout}${run.stderr}`);
  assert.ok(/^watch reviewed 0, reverted 0$/m.test(run.stdout),
    `the watch line comes first and reverted nothing (0 rows are eligible) -- got ${run.stdout.slice(0, 300)}`);

  if (room) {
    // The reason is the CHILD's, over the reading both read -- asserted against roomFor() rather than
    // against a name from the kickoff, so a moved wall re-grades itself instead of reddening.
    assert.ok(run.stdout.includes(`no-room: ${room.reason}`),
      `the driver must name the child's own room reason (${room.reason}) -- got ${run.stdout.slice(0, 400)}`);
    assert.ok(new RegExp(`^room: ${room.reason}$`, "m").test(run.stdout),
      "the child's own refusal line is inherited, which is what proves the driver did not restate the rule");
    assert.ok(["weekly_rest_pct", "weekly_pace", "fable_share", "meter_stale", "no_reading"].includes(room.reason),
      `an unknown room stop: ${room.reason}`);
  } else {
    assert.ok(!/no-room:/.test(run.stdout), "no --trials pair ran, so there is no room line to print");
  }

  const json = JSON.parse(run.stdout.slice(run.stdout.indexOf("{"), run.stdout.lastIndexOf("}") + 1));
  assert.equal(json.context.assignments.length, liveAssignments.length,
    `the context carries every model_assignments row (live: ${liveAssignments.length})`);
  assert.equal(json.assignments, liveAssignments.length);
  assert.equal(json.trials, 0, "no trial evidence was kept: the queue never reached a model");
  assert.ok(typeof json.model === "string" && json.model.startsWith("claude-"),
    `the lane resolved a model, got ${JSON.stringify(json.model)}`);
  assert.ok(json.prompt_bytes > 2000, `the assembled prompt is real, got ${json.prompt_bytes} bytes`);
  for (const k of ["assignments", "catalog", "pricing", "room", "trials", "watch"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(json.context, k), `context is missing ${k}`);
  }
  assert.ok(Array.isArray(json.context.watch.watched), "the watch json rides in the context");
  assert.ok(json.context.catalog.length > 0 && json.context.pricing.length > 0, "catalog and pricing rows are rows, not counts");

  // NO MODEL CALL: model-trial.js logs every replay that reaches the model under this feature prefix.
  const logged = await get(`ai_activity_log?feature=like.model-assignment:trial:*&created_at=gt.${encodeURIComponent(started)}&select=id`);
  assert.deepEqual(logged, [], "a no-room --prepare spawns no claude, so it writes no trial log row");
  const after = { a: await count("model_assignments"), c: await count("model_catalog"), d: await count("runner_decisions") };
  assert.deepEqual(after, before,
    `--prepare moved no assignment, no catalog row and no decision (before ${JSON.stringify(before)}, after ${JSON.stringify(after)})`);
  console.log(`  (e) live --prepare: exit 3, watch 0/0, ${room ? `no-room: ${room.reason}` : "no pair spawned"}, model ${json.model}, ${json.prompt_bytes} prompt bytes, 0 trial log rows, counts unchanged -- PASS`);
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
