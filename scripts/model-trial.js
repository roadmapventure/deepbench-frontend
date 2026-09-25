#!/usr/bin/env node
// DeepBench v7.0.592 | scripts/model-trial.js | AGT-148 -- the model trial runner: replay a job's
// three newest RECORDED AGENT TURNS on a candidate model and write the evidence shape
// apply_model_assignment() demands (>= 3 trials, dm-knowledge-model-trial step 5).
//
// THE UNIT IS THE RECORDED TURN, NOT A RE-BUILD (kickoff §2 Decision, harvest AGT-148 §Why). A trial
// re-assembles the same agent turn through the one assembly path (scripts/agent-prompt.js, §19b),
// starts it from the tree `origin/dev` held when the original cycle started, runs it once on the
// candidate with READ-ONLY tools, and scores it on the turn's own mechanical contract: every
// `Required:` key present, and either a dead premise with evidence or a kickoff that passes
// `verifier.js --check-kickoff`. No push, no runner_cycles / runner_decisions / backlog_items write,
// no ship (§19v, pattern 165) -- the tool allowlist makes writes and pushes impossible, not merely
// forbidden. Every replay that reaches the model is logged (§19k) as `agent-turn` under capability
// `model-assignment`, feature `model-assignment:trial:depth0`.
//
// ROOM FIRST. A trial spends real usage, so it runs only when runner_should_boot().detail says there
// is room -- the same meter the runner obeys. Fable candidates also respect fable_share. The wall is
// checked BEFORE the pace line: a reading past the wall must name the wall, not the milder pace stop.
//
// Usage:
//   node scripts/model-trial.js --job-kind=lane|capability --job-key=<k> --candidate=<model_id>
//                               [--out=<path>] [--dry-run] [--cycle-id=<uuid>]
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (read by name, never printed).
// Exit: 0 ok (or dry-run) | 1 a replay's `claude` exited non-zero (after all three) |
//       2 missing creds / args | 3 no room (reason printed) | 4 fewer than 3 replayable jobs.

import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The recorded turns a trial can replay: ai_activity_log.feature -> the assembly that produced it.
// A feature not listed here has no known assembly and is `not-replayable` (never guessed).
export const REPLAYABLE = {
  "design-kickoff:ds-kickoff-intent:depth0": { agent: "designer", capability: "design-kickoff", intent: "ds-kickoff-intent" },
};

const num = v => (v === null || v === undefined || v === "" ? NaN : Number(v));

// null = room to run; else { reason }.
export function roomFor(detail, candidate) {
  if (!detail || typeof detail !== "object") return { reason: "no_reading" };
  if (num(detail.reading_age_hours) > num(detail.meter_stale_hours)) return { reason: "meter_stale" };
  if (num(detail.all_models_pct) >= num(detail.wall_pct)) return { reason: String(detail.wall_stop ?? "wall") };
  if (num(detail.all_models_pct) >= num(detail.pace_limit_pct)) return { reason: "weekly_pace" };
  if (typeof candidate === "string" && candidate.startsWith("claude-fable-")
      && num(detail.fable_pct) >= num(detail.fable_share)) return { reason: "fable_share" };
  return null;
}

// The 3 newest replayable recorded turns on the job's current model. Returns { jobs } or
// { jobs: [], reason: 'not-replayable' } when the job key names no replayable feature at all.
export function pickJobs(rows, { jobKind, jobKey, model }) {
  let allowed;
  if (jobKind === "capability") {
    allowed = Object.keys(REPLAYABLE).filter(f => f.startsWith(`${jobKey}:`));
    if (allowed.length === 0) return { jobs: [], reason: "not-replayable" };
  } else {
    allowed = Object.keys(REPLAYABLE);
  }
  const jobs = (rows ?? [])
    .filter(r => r && r.model === model
      && r.input_tokens !== null && r.input_tokens !== undefined
      && r.output_tokens !== null && r.output_tokens !== undefined
      && r.visitor_id
      && allowed.includes(r.feature))
    .sort((a, b) => (Date.parse(b.created_at) - Date.parse(a.created_at)) || (Number(b.id) - Number(a.id)))
    .slice(0, 3);
  return { jobs };
}

// The CLI envelope's `result` carries the answer; cut first `{` to last `}` (audit-cluster.js shape).
export function answerOf(envelope) {
  const text = String(envelope?.result ?? "");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  try { return JSON.parse(text.slice(first, last + 1)); } catch { return null; }
}

// passed iff not an error envelope, every required key present, and either a dead premise with
// evidence or a kickoff that passed --check-kickoff (exit 0).
export function scoreAnswer({ envelope, required, checkKickoffExit }) {
  if (!envelope || envelope.is_error) return { passed: false, why: "is_error" };
  const answer = answerOf(envelope);
  if (!answer) return { passed: false, why: "no-answer-object" };
  const missing = (required ?? []).filter(k => !Object.prototype.hasOwnProperty.call(answer, k));
  if (missing.length) return { passed: false, why: `missing ${missing.join(",")}` };
  if (answer.premise === "dead" && answer.premise_evidence) return { passed: true, why: "premise-dead" };
  if (answer.kickoff_markdown && checkKickoffExit === 0) return { passed: true, why: "kickoff-within-cap" };
  return { passed: false, why: "no-kickoff-exit-0" };
}

export function requiredKeys(prompt) {
  const m = /Required:\s*((?:"[^"]+"\s*,?\s*)+)/.exec(String(prompt ?? ""));
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]) : [];
}

export function parseArgs(argv) {
  const out = { dryRun: false };
  for (const raw of argv) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(raw);
    if (!m) return { error: `unrecognized argument "${raw}"` };
    const [, k, v] = m;
    if (k === "job-kind") out.jobKind = v;
    else if (k === "job-key") out.jobKey = v;
    else if (k === "candidate") out.candidate = v;
    else if (k === "out") out.out = v;
    else if (k === "cycle-id") out.cycleId = v;
    else if (k === "dry-run") out.dryRun = true;
    else return { error: `unrecognized flag "--${k}"` };
  }
  if (out.jobKind !== "lane" && out.jobKind !== "capability") return { error: "--job-kind=lane|capability is required" };
  if (!out.jobKey) return { error: "--job-key=<k> is required" };
  if (!out.candidate) return { error: "--candidate=<model_id> is required" };
  return out;
}

function fail(code, msg) {
  console.error(`model-trial: ${msg}`);
  process.exit(code);
}

async function pg(pathAndQuery, init) {
  const base = process.env.SUPABASE_URL.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${pathAndQuery.split("?")[0]} returned HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const t = await res.text();
  return t.trim() ? JSON.parse(t) : [];
}

const git = (args, opts = {}) => spawnSync("git", ["-C", ROOT, ...args], { encoding: "utf8", ...opts });

async function replay(job, { candidate, cycleId }) {
  const [cycle] = await pg(`runner_cycles?id=eq.${job.visitor_id}&select=id,started_at,version,outcome,item_id`);
  if (!cycle) throw new Error(`no runner_cycles row ${job.visitor_id}`);
  const spec = REPLAYABLE[job.feature];
  const [ticket] = cycle.item_id
    ? await pg(`backlog_items?backlog_id=eq.${encodeURIComponent(cycle.item_id)}&select=backlog_id,title,description,priority_class,type,tier,size_stamp,scope_origin,scope_rationale,enhancement_claim,epic_id,predicted_cycles,supports_class`)
    : [];

  const f = git(["fetch", "origin", "dev"]);
  if (f.status !== 0) throw new Error(`git fetch origin dev exited ${f.status}: ${f.stderr}`);
  const base = git(["rev-list", "-1", `--before=${cycle.started_at}`, "origin/dev"]).stdout.trim();
  if (!base) throw new Error(`no origin/dev commit before ${cycle.started_at}`);
  const scratch = path.join(os.tmpdir(), `trial-${job.id}`);
  const add = git(["worktree", "add", scratch, "--detach", base]);
  if (add.status !== 0) throw new Error(`git worktree add exited ${add.status}: ${add.stderr}`);

  const t0 = Date.now();
  try {
    const taskFile = path.join(os.tmpdir(), `trial-${job.id}.task.json`);
    fs.writeFileSync(taskFile, JSON.stringify({
      ticket: ticket ?? null, version: cycle.version, cycle_id: cycle.id,
      caps: { files: 3, tasks: 4 }, worktree: scratch,
    }, null, 2), "utf8");
    const p = spawnSync(process.execPath, [
      path.join(ROOT, "scripts", "agent-prompt.js"), `--agent=${spec.agent}`, `--capability=${spec.capability}`,
      `--intent=${spec.intent}`, `--task-file=${taskFile}`,
    ], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (p.status !== 0) throw new Error(`agent-prompt.js exited ${p.status}: ${(p.stderr ?? "").slice(0, 300)}`);
    const prompt = p.stdout;
    const required = requiredKeys(prompt);

    const c = spawnSync("claude", [
      "-p", "--model", candidate,
      "--allowedTools", "Read,Grep,Glob,Bash(node scripts/baseline-red-set.js:*)",
      "--output-format", "json", "--max-turns", "60",
    ], { cwd: scratch, input: prompt, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

    let envelope = null;
    try { envelope = JSON.parse(c.stdout); } catch { /* scored as is_error below */ }
    const usage = envelope?.usage ?? {};
    const inTok = Number(usage.input_tokens ?? 0) + Number(usage.cache_creation_input_tokens ?? 0) + Number(usage.cache_read_input_tokens ?? 0);
    const outTok = Number(usage.output_tokens ?? 0);
    const durationMs = Number(envelope?.duration_ms ?? (Date.now() - t0));

    // §19k: log every call that reached the model, parsed or not.
    if (envelope) {
      const log = spawnSync(process.execPath, [
        path.join(ROOT, "scripts", "agent-log.js"), "--agent=devmanager", "--capability=model-assignment",
        `--model=${candidate}`, "--ai-type=agent-turn", "--feature=model-assignment:trial:depth0",
        `--input-tokens=${inTok}`, `--output-tokens=${outTok}`, `--latency-ms=${Math.round(durationMs)}`,
        ...(cycleId ? [`--cycle=${cycleId}`] : []),
      ], { cwd: ROOT, encoding: "utf8" });
      if (log.status !== 0) throw new Error(`agent-log.js refused the trial row (exit ${log.status}): ${(log.stderr ?? "").slice(0, 300)}`);
    }

    let checkKickoffExit = null;
    const answer = answerOf(envelope);
    if (answer?.kickoff_markdown) {
      const kf = path.join(scratch, "trial-kickoff.md");
      fs.writeFileSync(kf, String(answer.kickoff_markdown), "utf8");
      checkKickoffExit = spawnSync(process.execPath, [path.join(ROOT, "scripts", "verifier.js"), `--check-kickoff=${kf}`],
        { cwd: ROOT, encoding: "utf8" }).status;
    }
    const score = scoreAnswer({ envelope, required, checkKickoffExit });
    const trial = {
      job_ref: `${cycle.id}/${job.id}`,
      run_at: new Date().toISOString(),
      baseline: {
        passed: cycle.outcome !== "failed", verdict: "none",
        tokens: Number(job.input_tokens ?? 0) + Number(job.output_tokens ?? 0)
          + Number(job.cache_creation_input_tokens ?? 0) + Number(job.cache_read_input_tokens ?? 0),
        minutes: job.latency_ms ? job.latency_ms / 60000 : null,
      },
      candidate: { passed: c.status === 0 && score.passed, verdict: "none", tokens: inTok + outTok, minutes: durationMs / 60000 },
    };
    if (c.error || c.status !== 0) {
      trial.error = `claude -p exited ${c.status}: ${c.error?.message ?? (c.stderr ?? "").slice(0, 300)}`;
    }
    return trial;
  } finally {
    git(["worktree", "remove", "--force", scratch]);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) fail(2, args.error);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    fail(2, "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
  }

  // (1) room
  const [boot] = await pg("rpc/runner_should_boot", { method: "POST", body: "{}" });
  const detail = boot?.detail ?? null;
  const room = roomFor(detail, args.candidate);
  if (room) {
    console.log(`room: ${room.reason}`);
    process.exit(3);
  }

  // (2) jobs
  const [assignment] = await pg(`model_assignments?job_kind=eq.${args.jobKind}&job_key=eq.${encodeURIComponent(args.jobKey)}&select=model_id`);
  if (!assignment) fail(2, `no model_assignments row ${args.jobKind}/${args.jobKey}`);
  const baselineModel = assignment.model_id;
  const rows = await pg(`ai_activity_log?model=eq.${encodeURIComponent(baselineModel)}&input_tokens=not.is.null&output_tokens=not.is.null&visitor_id=not.is.null`
    + `&select=id,created_at,feature,model,input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens,latency_ms,visitor_id`
    + `&feature=in.(${Object.keys(REPLAYABLE).map(f => `"${f}"`).join(",")})&order=created_at.desc&limit=50`);
  const picked = pickJobs(rows, { jobKind: args.jobKind, jobKey: args.jobKey, model: baselineModel });
  if (picked.jobs.length < 3) {
    console.log(`jobs: ${picked.jobs.length} of 3 needed${picked.reason ? ` (${picked.reason})` : ""}`);
    process.exit(4);
  }
  if (args.dryRun) {
    console.log(`job: ${args.jobKind}/${args.jobKey} baseline ${baselineModel} -> candidate ${args.candidate}`);
    for (const j of picked.jobs) console.log(`job_ref: ${j.visitor_id}/${j.id} (${j.feature}, ${j.created_at})`);
    console.log("room: ok");
    process.exit(0);
  }

  // (3) replays
  const trials = [];
  let anyError = false;
  for (const job of picked.jobs) {
    try {
      const t = await replay(job, { candidate: args.candidate, cycleId: args.cycleId });
      if (t.error) anyError = true;
      trials.push(t);
    } catch (e) {
      anyError = true;
      trials.push({ job_ref: `${job.visitor_id}/${job.id}`, run_at: new Date().toISOString(), candidate: { passed: false, verdict: "none" }, error: e.message });
    }
    console.log(`trial ${trials.at(-1).job_ref}: ${trials.at(-1).candidate.passed ? "passed" : "not passed"}${trials.at(-1).error ? ` (${trials.at(-1).error})` : ""}`);
  }

  // (4) evidence
  const out = args.out ?? path.join(os.tmpdir(), `trial-${args.jobKind}-${args.jobKey}-${args.candidate}.json`);
  fs.writeFileSync(out, JSON.stringify({
    job_kind: args.jobKind, job_key: args.jobKey, baseline_model: baselineModel, candidate: args.candidate,
    room: detail, tools: "read-only, no database", trials,
  }, null, 2), "utf8");
  console.log(`evidence: ${out}`);
  process.exit(anyError ? 1 : 0);
}

if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => fail(2, e.message));
}
