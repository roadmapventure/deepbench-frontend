#!/usr/bin/env node
// DeepBench v7.0.677 | scripts/model-trial.js | AGT-151 -- the orchestrator lane's recorded job is a
// BUILD, so a trial of it has to re-run the Builder turn, not a design turn wearing its name.
// REPLAYABLE gains `build-ticket:bd-build-intent:depth0` and every entry now declares its `lane` and
// its `kind`; `pickJobs` honours the lane (before this, `lane/mechanical` and `lane/orchestrator`
// both picked the judgment lane's design turns, grading a candidate on a job it does not hold).
//
// A BUILD REPLAY IS SCORED ON THE SHIP'S OWN CONTRACT, not on a kickoff it writes itself. It starts
// at `<push_sha>^` -- the tree the real Builder started from -- is handed the kickoff READ OUT OF THE
// SHIPPED TREE (`git show <push_sha>:<path>`, never the working tree, which a later cycle may have
// rewritten), and passes only when its changed files sit inside that kickoff's own named set and
// `verifier.js --dry-run` exits 0. The scratch worktree gets `node_modules` symlinked in so the build
// and the suite can actually run, and gets NO Supabase credentials: push, agent-log.js, the heartbeat
// and every database write are UNREACHABLE there, not merely forbidden (§19v, pattern 165).
//
// NO LIVE BUILD REPLAY SHIPPED WITH THIS -- AGT-151 proves the machinery by `--dry-run` only; the
// first real trial runs when the gate says so, and the verify-ship slice is AGT-158.
//
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
// `lane` is the lane the turn is RECORDED on (runner-cycle.md step 7), so a lane key can select its
// own jobs; `kind` picks the replay shape -- "turn" re-assembles the recorded turn and scores its
// answer, "build" re-runs the ship at its parent commit and scores the diff.
export const REPLAYABLE = {
  "design-kickoff:ds-kickoff-intent:depth0": { agent: "designer", capability: "design-kickoff", intent: "ds-kickoff-intent", lane: "judgment", kind: "turn" },
  "build-ticket:bd-build-intent:depth0": { agent: "builder", capability: "build-ticket", intent: "bd-build-intent", lane: "orchestrator", kind: "build" },
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
    // AGT-151: a lane key selects the features recorded ON THAT LANE. A lane that holds no
    // replayable feature picks nothing and falls out at the `< 3` gate, which is the honest answer
    // -- it is not the same claim as `capability`'s `not-replayable`, which says the KEY names
    // nothing replayable at all.
    allowed = Object.keys(REPLAYABLE).filter(f => REPLAYABLE[f].lane === jobKey);
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

// A repo-relative path token, whole: `node tests/regression/run-all.js` is a COMMAND and
// `agt-127-decide-gated-card.test.mjs` is a bare filename -- neither is a file this kickoff names.
const KICKOFF_FILE = /^(api|docs|lib|scripts|shared|src|supabase|tests|\.claude)\/[\w./-]+\.[a-z]+$/;

// The files a kickoff NAMES, read out of §4 STUB DEFINITIONS through §5 TASKS only. The window is
// the point: §1 cites the harvest (`docs/harvests/<ID>.md`) and §2 cites whatever it measured, and
// a citation is not a licence to edit that file. Sorted and unique so the set is comparable.
export function kickoffFiles(md) {
  const text = String(md ?? "");
  const start = text.search(/^## 4\./m);
  if (start < 0) return [];
  const rest = text.slice(start);
  const end = rest.search(/^## 6\./m);
  const section = end < 0 ? rest : rest.slice(0, end);
  const out = new Set();
  for (const m of section.matchAll(/`([^`\n]+)`/g)) {
    const tok = m[1].trim();
    if (KICKOFF_FILE.test(tok)) out.add(tok);
  }
  return [...out].sort();
}

// A build replay's score. passed iff the envelope is not an error, every `required` key is present
// in its answer, the replay CHANGED something, everything it changed sits inside the kickoff's own
// named set, and `verifier.js --dry-run` exited 0.
//
// EMPTY IS NOT A PASS, and that is the whole reason this is not `scoreAnswer`: a candidate that
// edited nothing trivially satisfies "inside the named set" and would collect a green for doing no
// work. The `outside-kickoff:` reason names the offending paths, because "it went out of scope" is
// unactionable without them.
export function scoreBuild({ envelope, required, changed, kickoff, dryRunExit }) {
  if (!envelope || envelope.is_error) return { passed: false, why: "is_error" };
  const answer = answerOf(envelope);
  if (!answer) return { passed: false, why: "no-answer-object" };
  const missing = (required ?? []).filter(k => !Object.prototype.hasOwnProperty.call(answer, k));
  if (missing.length) return { passed: false, why: `missing ${missing.join(",")}` };
  const files = (changed ?? []).map(f => String(f).replace(/\\/g, "/").replace(/^\.\//, ""));
  if (files.length === 0) return { passed: false, why: "no-changed-files" };
  const named = kickoffFiles(kickoff);
  const outside = files.filter(f => !named.includes(f));
  if (outside.length) return { passed: false, why: `outside-kickoff: ${outside.join(",")}` };
  if (dryRunExit !== 0) return { passed: false, why: `dry-run-exit-${dryRunExit}` };
  return { passed: true, why: "build-within-kickoff" };
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
const gitIn = (dir, args) => spawnSync("git", ["-C", dir, ...args], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const lines = s => String(s ?? "").split("\n").map(l => l.trim()).filter(Boolean);

// What the baseline turn cost, over whichever token columns its row actually carries.
const baselineTokens = job => Number(job.input_tokens ?? 0) + Number(job.output_tokens ?? 0)
  + Number(job.cache_creation_input_tokens ?? 0) + Number(job.cache_read_input_tokens ?? 0);

// The kickoff a ship was built from: the newest `docs/kickoffs` entry naming the item, ordered by
// the version in the filename rather than lexically (v7.0.9 is older than v7.0.10, not newer).
function newestKickoffPath(names, itemId) {
  const hits = (names ?? []).filter(n => n.includes(`-${itemId}-`));
  if (!hits.length) return null;
  const ver = n => {
    const m = /v(\d+)\.(\d+)\.(\d+)/.exec(n);
    return m ? Number(m[1]) * 1e8 + Number(m[2]) * 1e4 + Number(m[3]) : -1;
  };
  return hits.sort((a, b) => (ver(a) - ver(b)) || a.localeCompare(b)).at(-1);
}

// Where a replay would START, for the dry run only, resolved locally and best-effort: `?` when the
// commit is not in this clone yet. A dry run reads, fetches nothing and spends nothing.
function baseShaFor(job, cycle) {
  const spec = REPLAYABLE[job.feature];
  if (!cycle) return "?";
  const ref = spec?.kind === "build"
    ? (cycle.push_sha ? `${cycle.push_sha}^` : null)
    : null;
  const sha = ref
    ? git(["rev-parse", "--short", ref]).stdout.trim()
    : (cycle.started_at ? git(["rev-list", "-1", "--abbrev-commit", `--before=${cycle.started_at}`, "origin/dev"]).stdout.trim() : "");
  return sha || "?";
}

function assemblePrompt(spec, taskFile) {
  const p = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "agent-prompt.js"), `--agent=${spec.agent}`, `--capability=${spec.capability}`,
    `--intent=${spec.intent}`, `--task-file=${taskFile}`,
  ], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (p.status !== 0) throw new Error(`agent-prompt.js exited ${p.status}: ${(p.stderr ?? "").slice(0, 300)}`);
  return p.stdout;
}

// THE ONE PLACE A TRIAL REACHES THE MODEL, so §19k's log row cannot be forgotten on the new branch:
// both kinds come through here and every call that produced an envelope is logged, parsed or not.
// `credFree` strips the Supabase variables from the CHILD's environment only -- agent-log.js still
// runs from ROOT with this process's own credentials, which is how the trial stays logged while the
// candidate it is trialling cannot write anything at all.
function runCandidate({ prompt, scratch, candidate, cycleId, allowedTools, maxTurns, credFree }) {
  const t0 = Date.now();
  const env = { ...process.env };
  if (credFree) {
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_KEY;
    delete env.SUPABASE_ANON_KEY;
  }
  const c = spawnSync("claude", [
    "-p", "--model", candidate, "--allowedTools", allowedTools,
    "--output-format", "json", "--max-turns", String(maxTurns),
  ], { cwd: scratch, input: prompt, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env });

  let envelope = null;
  try { envelope = JSON.parse(c.stdout); } catch { /* scored as is_error by the caller */ }
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
  return { c, envelope, inTok, outTok, durationMs };
}

async function replay(job, { candidate, cycleId }) {
  const [cycle] = await pg(`runner_cycles?id=eq.${job.visitor_id}&select=id,started_at,version,outcome,item_id,push_sha`);
  if (!cycle) throw new Error(`no runner_cycles row ${job.visitor_id}`);
  const spec = REPLAYABLE[job.feature];
  const jobRef = `${cycle.id}/${job.id}`;

  const f = git(["fetch", "origin", "dev"]);
  if (f.status !== 0) throw new Error(`git fetch origin dev exited ${f.status}: ${f.stderr}`);

  return spec.kind === "build"
    ? replayBuild({ job, cycle, spec, jobRef, candidate, cycleId })
    : replayTurn({ job, cycle, spec, jobRef, candidate, cycleId });
}

// kind "turn" (AGT-148, unchanged): re-assemble the recorded turn from the tree its cycle started
// on, run it read-only, score the ANSWER.
async function replayTurn({ job, cycle, spec, jobRef, candidate, cycleId }) {
  const [ticket] = cycle.item_id
    ? await pg(`backlog_items?backlog_id=eq.${encodeURIComponent(cycle.item_id)}&select=backlog_id,title,description,priority_class,type,tier,size_stamp,scope_origin,scope_rationale,enhancement_claim,epic_id,predicted_cycles,supports_class`)
    : [];

  const base = git(["rev-list", "-1", `--before=${cycle.started_at}`, "origin/dev"]).stdout.trim();
  if (!base) throw new Error(`no origin/dev commit before ${cycle.started_at}`);
  const scratch = path.join(os.tmpdir(), `trial-${job.id}`);
  const add = git(["worktree", "add", scratch, "--detach", base]);
  if (add.status !== 0) throw new Error(`git worktree add exited ${add.status}: ${add.stderr}`);

  try {
    const taskFile = path.join(os.tmpdir(), `trial-${job.id}.task.json`);
    fs.writeFileSync(taskFile, JSON.stringify({
      ticket: ticket ?? null, version: cycle.version, cycle_id: cycle.id,
      caps: { files: 3, tasks: 4 }, worktree: scratch,
    }, null, 2), "utf8");
    const prompt = assemblePrompt(spec, taskFile);
    const required = requiredKeys(prompt);

    const { c, envelope, inTok, outTok, durationMs } = runCandidate({
      prompt, scratch, candidate, cycleId,
      allowedTools: "Read,Grep,Glob,Bash(node scripts/baseline-red-set.js:*)",
      maxTurns: 60, credFree: false,
    });

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
      job_ref: jobRef,
      run_at: new Date().toISOString(),
      baseline: {
        passed: cycle.outcome !== "failed", verdict: "none",
        tokens: baselineTokens(job),
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

// kind "build" (AGT-151): re-run the Builder turn at the SHIP'S PARENT commit and score the DIFF.
// No `--out`, no push tool, no credentials in the child -- the only thing this proves is whether the
// candidate can produce the same ship from the same kickoff.
async function replayBuild({ job, cycle, spec, jobRef, candidate, cycleId }) {
  const runAt = new Date().toISOString();
  const minutes = job.latency_ms ? job.latency_ms / 60000 : null;
  // The 30-day history's `input_tokens` are the runner's own round hand-entered estimates whenever
  // `latency_ms` is null (kickoff §2). The comparison is still worth making; it is not worth making
  // silently, so the trial carries the caveat next to the number.
  const note = job.latency_ms ? null : "baseline tokens are the runner's logged estimate";

  if (!cycle.push_sha) {
    return {
      job_ref: jobRef, run_at: runAt,
      baseline: { passed: false, verdict: "none", tokens: baselineTokens(job), minutes },
      candidate: { passed: false, verdict: "none", why: "no-push-sha", tokens: 0, minutes: 0 },
      ...(note ? { note } : {}),
    };
  }

  const base = git(["rev-parse", `${cycle.push_sha}^`]).stdout.trim();
  if (!base) throw new Error(`no parent commit for push_sha ${cycle.push_sha}`);

  const ls = git(["ls-tree", "-r", "--name-only", cycle.push_sha, "docs/kickoffs"]);
  if (ls.status !== 0) throw new Error(`git ls-tree exited ${ls.status}: ${ls.stderr}`);
  const kickoffPath = newestKickoffPath(lines(ls.stdout), cycle.item_id);
  if (!kickoffPath) throw new Error(`no docs/kickoffs entry for ${cycle.item_id} at ${cycle.push_sha}`);
  const kickoff = git(["show", `${cycle.push_sha}:${kickoffPath}`]).stdout;
  const named = kickoffFiles(kickoff);

  // The baseline's own score, on the same rule the candidate is held to: it shipped, and what it
  // pushed is inside the kickoff it was given.
  const shipped = lines(git(["diff-tree", "--no-commit-id", "--name-only", "-r", cycle.push_sha]).stdout);
  const baselinePassed = cycle.outcome === "shipped" && shipped.length > 0 && shipped.every(p => named.includes(p));

  const scratch = path.join(os.tmpdir(), `trial-${job.id}`);
  const add = git(["worktree", "add", scratch, "--detach", base]);
  if (add.status !== 0) throw new Error(`git worktree add exited ${add.status}: ${add.stderr}`);

  try {
    // Without this the candidate cannot run `npm run build` or the suite, and would fail the gate
    // for the harness's reason instead of its own. Symlinked, never installed: a fresh install per
    // replay is minutes of wall clock and a different dependency tree than the one that shipped.
    fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(scratch, "node_modules"), "junction");

    const taskFile = path.join(os.tmpdir(), `trial-${job.id}.task.json`);
    fs.writeFileSync(taskFile, JSON.stringify({
      kickoff_path: kickoffPath, worktree: scratch, branch: `trial/${job.id}`,
      version: cycle.version, cycle_id: cycle.id, caps: { files: 3, tasks: 4 }, heartbeat: "true",
    }, null, 2), "utf8");
    const prompt = assemblePrompt(spec, taskFile);
    const required = requiredKeys(prompt);

    const { c, envelope, inTok, outTok, durationMs } = runCandidate({
      prompt, scratch, candidate, cycleId,
      allowedTools: "Read,Grep,Glob,Edit,Write,MultiEdit,Bash(npm run build),Bash(node tests/regression/:*),"
        + "Bash(node scripts/baseline-red-set.js:*),Bash(node scripts/verifier.js --check-kickoff:*),"
        + "Bash(git status:*),Bash(git diff:*),Bash(git add:*),Bash(git commit:*)",
      maxTurns: 200, credFree: true,
    });

    // Committed-vs-base AND the working tree: a candidate that commits and one that leaves the
    // edits staged or loose have both changed the same files, and neither view alone sees both.
    const diff = lines(gitIn(scratch, ["diff", "--name-only", base]).stdout);
    const status = String(gitIn(scratch, ["status", "--porcelain"]).stdout ?? "").split("\n").filter(Boolean)
      .map(l => l.slice(3).trim())
      .map(p => (p.includes(" -> ") ? p.split(" -> ").at(-1) : p))
      .map(p => p.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
    const changed = [...new Set([...diff, ...status])].sort();

    const changedFile = path.join(os.tmpdir(), `trial-${job.id}.changed.json`);
    fs.writeFileSync(changedFile, JSON.stringify(changed), "utf8");
    const dryRunExit = spawnSync(process.execPath, [
      path.join(ROOT, "scripts", "verifier.js"), "--dry-run", `--repo=${scratch}`, `--base=${base}`,
      `--changed-files=${changedFile}`,
    ], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).status;

    const score = scoreBuild({ envelope, required, changed, kickoff, dryRunExit });
    const trial = {
      job_ref: jobRef, run_at: runAt,
      baseline: { passed: baselinePassed, verdict: "none", tokens: baselineTokens(job), minutes },
      candidate: { passed: score.passed, verdict: "none", why: score.why, tokens: inTok + outTok, minutes: durationMs / 60000 },
    };
    if (note) trial.note = note;
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
    // AGT-151: what this run would COST and where each replay would start from, before it is run.
    // A trial states tokens and minutes and lets the gate decide -- never a computed pct, because
    // derive_token_allowance().tokens_per_pct is NULL and no live token->pct rate exists.
    const cycles = new Map((await pg(
      `runner_cycles?id=in.(${picked.jobs.map(j => j.visitor_id).join(",")})&select=id,started_at,push_sha`,
    )).map(c => [c.id, c]));
    let totalTokens = 0, totalMinutes = 0, timed = 0;
    for (const j of picked.jobs) {
      console.log(`job_ref: ${j.visitor_id}/${j.id} (${j.feature}, ${j.created_at})`);
      const tokens = baselineTokens(j);
      const min = j.latency_ms ? j.latency_ms / 60000 : null;
      totalTokens += tokens;
      if (min !== null) { totalMinutes += min; timed += 1; }
      console.log(`est: ${tokens} tokens, ${min === null ? "?" : min.toFixed(1)} min, base ${baseShaFor(j, cycles.get(j.visitor_id))}`);
    }
    console.log(`est total: ${totalTokens} tokens, ${timed ? totalMinutes.toFixed(1) : "?"} min over ${picked.jobs.length} jobs`);
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
