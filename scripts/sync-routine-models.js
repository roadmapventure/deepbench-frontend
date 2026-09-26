#!/usr/bin/env node
// DeepBench v7.0.612 | scripts/sync-routine-models.js | AGT-145 -- THE ROUTINE PIN FOLLOWS THE
// TABLE, AND THE THING TO READ TWICE IS THAT THIS SCRIPT NEVER CALLS A ROUTINE. It plans the
// change, builds the body, grades the read-back and records the decision; the one act it cannot
// perform -- the `update` itself -- belongs to an attended session.
//
// FEATURE: AGT-145 -- a routine cannot change its own model mid-run, so after a switch every cloud
// routine's pinned model must be moved or it keeps running the old one. `public.model_assignments`
// is the source (AGT-142); each routine's `job_config.ccr.session_context.model` is a copy, exactly
// the source-and-copy shape ARCHITECTURE.md §19v governs for the routine PROMPT (SES-355).
//
// VERIFY FIRST, AND THE ANSWER WAS NO (kickoff §2, measured 2026-09-25 19:06Z). From inside a cycle
// the `Claude_Code_Remote` connector's `update_trigger` REFUSED: "this routine was created via
// http_api, not by an agent. Agents can only update routines they created" (docs/SESSIONS.md:12026).
// All eight were created from attended sittings, and `RemoteTrigger` is a session tool no node
// process can reach. So the sync is an ATTENDED act, and this script is the deterministic half of
// it (pattern 9 -- never spend a model call where a mechanism serves): the session runs `get` and
// `update`, and every judgment between them is code.
//
// THE PARTIAL-CCR GOTCHA IS WHY THE BODY IS BUILT HERE AND NOT BY HAND. Found live 2026-09-11
// (docs/runbooks/routine-prompt.md): an `update` carrying only `environment_id` + `events` returned
// HTTP 200 and silently reset `session_context` -- the model pin went empty, `allowed_tools` fell
// back to a default preset, `session_request.config` read null. `update` REPLACES `job_config.ccr`
// WHOLE. So `updateBodyFor()` copies the fresh `get`'s entire `ccr` and changes exactly one leaf,
// and `--plan` REFUSES rather than build a body from a `get` that is already missing
// `session_context.allowed_tools` or `.model` -- a body built from a half-read `get` is the same
// silent reset wearing a script's clothes.
//
// ENABLED AND CRON ARE NEVER SENT, and they are never sent because they are never in the body:
// both live OUTSIDE `job_config.ccr`, and the body is `{job_config:{ccr}}` and nothing else. John's
// 2026-09-25 walkthrough (Q4) gives The Development Manager the pin and withholds the switch and
// the schedule; `verifyReadback()` then asserts both came back UNCHANGED, so an `update` that moved
// one is caught by the read-back even though this script could not have asked for it.
//
// USAGE -- exactly one mode per run.
//   node scripts/sync-routine-models.js --plan   --live=<dir> [--assignments=<file|json>]
//   node scripts/sync-routine-models.js --verify --live=<dir>
//   node scripts/sync-routine-models.js --record --live=<dir> (--session-name=<n> | --cycle-id=<uuid>)
//   node scripts/sync-routine-models.js --undo=<decision_id> --live=<dir>
//   node scripts/sync-routine-models.js --pending (--session-name=<n> | --cycle-id=<uuid>) [--assignments=...]
//
// THE ATTENDED SEQUENCE the modes are cut for: `get` each routine into `<dir>/<id>.json` verbatim ->
// `--plan` -> for each `<id>.update.json` the session sends `update` with that body -> `get` again
// into `<dir>/<id>.after.json` -> `--verify` -> `--record`. No tool in the sitting at all: `--pending`
// leaves the ask on the ledger instead. `--undo=<decision>` rebuilds the body that restores the
// imaged config -- it WRITES A FILE, never a routine, and never a ledger row (SES-399:
// reverse_decision() restores no routine, because the undo is a re-send, not a database write).
//
// FLAGS
//   --live=<dir>          the sitting's directory of `get` / `update` / `after` JSON files.
//   --assignments=<v>     a JSON file path, or inline JSON beginning `[` or `{`, of
//                         model_assignments rows. Replaces the live read (and makes --plan offline).
//   --session-name / --cycle-id   the ledger owner. Exactly one, for --record and --pending; the
//                         ledger's own xor, not a preference.
//
// ENV (process.env only; never printed, never on a command line)
//   SUPABASE_URL, SUPABASE_SERVICE_KEY -- needed by --record, --undo, --pending, and by --plan
//   unless --assignments is given. --verify needs neither.
//
// EXIT CODES
//   0  --plan: every routine already pinned as intended, nothing written. --verify: read-back green.
//      --record / --undo / --pending: done.
//   1  --verify (or the re-verify --record runs before it writes): a field came back wrong.
//   2  a usage error, an unreadable file, a missing `get`, or the partial-ccr refusal. Nothing is
//      written -- --plan validates all eight BEFORE it writes any body, so a half-planned directory
//      is not a state this script can leave behind.
//   3  --plan: at least one pin differs. NOT an error -- it is the mode's answer, and the signal
//      that `<id>.update.json` files are waiting for the session to send.
// Exit codes are set with process.exitCode, never process.exit() (Windows/Node 24 libuv abort).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The eight cloud routines, from AGT-145's own ticket text. All eight run as the orchestrator, so
// all eight read one assignment row -- but the job is carried per routine, never assumed, because
// AGT-146's `model-watch` joins this list with its own job type the moment its id exists.
export const ROUTINES = [
  { name: "deepbench-runner", id: "trig_017TZ3JZcLBK6AYH6DKURqMH", job_kind: "lane", job_key: "orchestrator" },
  { name: "deepbench-auditor", id: "trig_01BCzPdanZ1YiK956dAqU6YN", job_kind: "lane", job_key: "orchestrator" },
  { name: "jerry-market-watch", id: "trig_01Q3wHXJhzPp12czRwvgX86V", job_kind: "lane", job_key: "orchestrator" },
  { name: "jerry-growth-review", id: "trig_01Ws4TyYSD4K7znhPSz6C1mz", job_kind: "lane", job_key: "orchestrator" },
  { name: "nathan-daily-release-notes", id: "trig_01EVxzUZvLSVaUReeiwEXQ6t", job_kind: "lane", job_key: "orchestrator" },
  { name: "nathan-wednesday-market-scan", id: "trig_015K3zgtnMztuNritHxC6uSW", job_kind: "lane", job_key: "orchestrator" },
  { name: "nathan-monthly-refresh", id: "trig_01TH7LgWccUrgb8R8wvYnT16", job_kind: "lane", job_key: "orchestrator" },
  { name: "researcher-weekly-market", id: "trig_01862LsK4ZQF8PTgQoK2cgCV", job_kind: "lane", job_key: "orchestrator" },
];

export const SYNC_KIND = "routine-pin-sync";
export const PENDING_KIND = "routine-pin-pending";
export const BACKLOG_ID = "AGT-145";
export const IMAGE_TABLE = "routine";
export const PARTIAL_REFUSAL = "refused: partial ccr would reset the pin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class UsageError extends Error {}

export function routineFor(get) {
  const hit = ROUTINES.find(r => r.id === get?.id);
  if (!hit) throw new UsageError(`planFor: no ROUTINES row for ${JSON.stringify(get?.id ?? null)} -- pass the routine explicitly`);
  return hit;
}

export const assignmentFor = (assignments, routine) =>
  (assignments ?? []).find(a => a.job_kind === routine.job_kind && a.job_key === routine.job_key) ?? null;

// Pure. The whole of --plan's judgment for one routine, so the test can drive same / change /
// refusal without a directory. `action` is one of "same" | "change" | "refused".
export function planFor(get, assignments, routine = routineFor(get)) {
  const base = { name: routine.name, id: routine.id, job_kind: routine.job_kind, job_key: routine.job_key };
  const ccr = get?.job_config?.ccr;
  const sc = ccr?.session_context;
  // THE GUARD IS THE GOTCHA, not defensive tidying: a body built from a `get` that never carried
  // the tools or the pin sends a partial ccr, and a partial ccr resets both.
  if (!ccr || !sc || !Array.isArray(sc.allowed_tools) || typeof sc.model !== "string" || !sc.model) {
    return { ...base, action: "refused", reason: PARTIAL_REFUSAL, pinned: null, intended: null };
  }
  const assignment = assignmentFor(assignments, routine);
  if (!assignment?.model_id) {
    return {
      ...base, action: "refused", pinned: sc.model, intended: null,
      reason: `no model_assignments row ${routine.job_kind}/${routine.job_key}`,
    };
  }
  const intended = assignment.model_id;
  return { ...base, action: sc.model === intended ? "same" : "change", pinned: sc.model, intended, assignment };
}

// Pure. The WHOLE ccr with exactly one leaf moved -- the spread keeps every other key, and its
// order, so a round trip of an unchanged model is byte-identical to the `get`.
export function updateBodyFor(get, model) {
  const ccr = get?.job_config?.ccr;
  if (!ccr?.session_context) throw new UsageError("updateBodyFor: the get carries no job_config.ccr.session_context");
  return { job_config: { ccr: { ...ccr, session_context: { ...ccr.session_context, model } } } };
}

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const show = v => (typeof v === "string" ? v : JSON.stringify(v) ?? String(v));

// Pure. Returns the FIRST failure `{field, expected, got}`, or null when the read-back is clean.
// The order is deliberate: the pin is what the sitting set out to move, and the other three are the
// things an `update` can destroy without being asked to (the 2026-09-11 reset).
export function verifyReadback(before, after, model) {
  const checks = [
    ["derived_state.model", model, after?.derived_state?.model],
    ["session_request.config.allowed_tools",
      before?.session_request?.config?.allowed_tools, after?.session_request?.config?.allowed_tools],
    ["enabled", before?.enabled, after?.enabled],
    ["cron_expression", before?.cron_expression, after?.cron_expression],
  ];
  for (const [field, expected, got] of checks) {
    if (!deepEqual(expected, got)) return { field, expected, got };
  }
  return null;
}

// Pure. The manager's record when no tool can reach the routines: one `routine-pin-pending` row per
// routine whose assignment moved since its last recorded sync. Idempotent by construction -- an
// OPEN pending naming the routine suppresses a second one, so a manager that runs daily files once.
export function pendingRows(assignments, decisions) {
  const rows = [];
  const all = decisions ?? [];
  for (const r of ROUTINES) {
    const a = assignmentFor(assignments, r);
    if (!a?.model_id || !a.since) continue;                       // never switched: nothing is owed
    const syncs = all
      .filter(d => d.kind === SYNC_KIND && String(d.summary ?? "").includes(r.id))
      .map(d => Date.parse(d.decided_at ?? 0))
      .filter(Number.isFinite);
    const lastSync = syncs.length ? Math.max(...syncs) : null;
    const since = Date.parse(a.since);
    if (lastSync !== null && !(since > lastSync)) continue;       // the sync is already newer
    if (all.some(d => d.kind === PENDING_KIND && d.status === "open" && String(d.summary ?? "").includes(r.id))) continue;
    rows.push({
      name: r.name, id: r.id, job_kind: r.job_kind, job_key: r.job_key, model: a.model_id,
      summary: `${r.name} ${r.id}: pin sync to ${a.model_id} awaits an attended session`,
    });
  }
  return rows;
}

// ---- the sitting's directory -----------------------------------------------------------------

const liveFile = (dir, id, suffix) => path.join(dir, `${id}${suffix}.json`);

function readJson(file, what) {
  let raw;
  try { raw = fs.readFileSync(file, "utf8"); }
  catch (e) { throw new UsageError(`cannot read ${what} ${file}: ${e.code ?? e.message}`); }
  try { return JSON.parse(raw); }
  catch (e) { throw new UsageError(`${what} ${file} is not JSON: ${e.message}`); }
}

const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

// ---- Supabase (reads, plus --record's two writes) ----------------------------------------------

async function supaRest(pathAndQuery, init = {}) {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) throw new UsageError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be exported (by name, from public.runner_secrets)");
  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new UsageError(`${init.method ?? "GET"} ${pathAndQuery} -> HTTP ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function loadAssignments(arg) {
  if (arg !== undefined) {
    const value = /^\s*[[{]/.test(arg) ? JSON.parse(arg) : readJson(arg, "--assignments");
    return Array.isArray(value) ? value : [value];
  }
  return supaRest("model_assignments?select=job_kind,job_key,model_id,since,decision_id&order=job_kind,job_key");
}

const owner = a => (a["session-name"] !== undefined
  ? { p_cycle_id: null, p_session_name: a["session-name"] }
  : { p_cycle_id: a["cycle-id"], p_session_name: null });

const imageOwner = a => (a["session-name"] !== undefined
  ? { cycle_id: null, session_name: a["session-name"] }
  : { cycle_id: a["cycle-id"], session_name: null });

// ---- modes -------------------------------------------------------------------------------------

async function modePlan(a) {
  const dir = a.live;
  const assignments = await loadAssignments(a.assignments);
  const plans = [];
  let refused = 0;
  for (const r of ROUTINES) {
    const file = liveFile(dir, r.id, "");
    if (!fs.existsSync(file)) { console.log(`${r.name}: no get file`); refused++; continue; }
    const get = readJson(file, "get");
    const plan = planFor(get, assignments, r);
    plans.push({ r, plan, get });
    if (plan.action === "refused") { console.log(`${r.name} ${r.id}: ${plan.reason}`); refused++; continue; }
    console.log(`${r.name} ${r.id}: pinned ${plan.pinned} intended ${plan.intended} ${plan.action}`);
  }
  // VALIDATE ALL, THEN WRITE. A directory half-filled with bodies is a state a later --record would
  // read as the whole sitting, so the refusal path leaves nothing behind at all.
  if (refused) { console.log(`refused: ${refused} of ${ROUTINES.length} -- no update body written`); return 2; }
  let changed = 0;
  for (const { r, plan, get } of plans) {
    if (plan.action !== "change") continue;
    const out = liveFile(dir, r.id, ".update");
    writeJson(out, updateBodyFor(get, plan.intended));
    console.log(`  update body: ${out}`);
    changed++;
  }
  console.log(`plan: ${changed} change, ${plans.length - changed} same`);
  return changed ? 3 : 0;
}

// The set a --verify / --record run covers: exactly the routines --plan wrote a body for.
function changedSet(dir) {
  const set = ROUTINES
    .filter(r => fs.existsSync(liveFile(dir, r.id, ".update")))
    .map(r => {
      const before = readJson(liveFile(dir, r.id, ""), "get");
      const body = readJson(liveFile(dir, r.id, ".update"), "update body");
      const model = body?.job_config?.ccr?.session_context?.model;
      if (typeof model !== "string" || !model) throw new UsageError(`${r.name}: ${liveFile(dir, r.id, ".update")} carries no session_context.model`);
      return { r, before, body, model, was: before?.job_config?.ccr?.session_context?.model ?? null };
    });
  if (!set.length) throw new UsageError(`no <id>.update.json in ${dir} -- run --plan first (exit 0 there means there was nothing to send)`);
  return set;
}

// Shared by --verify and the gate --record runs before it writes a ledger row: a record that
// trusted a verify someone ran earlier would be a false green with a paper trail.
function gradeReadback(dir, set) {
  for (const { r, before, model } of set) {
    const after = readJson(liveFile(dir, r.id, ".after"), "after get");
    const bad = verifyReadback(before, after, model);
    if (bad) {
      console.log(`${r.name}: ${bad.field} expected ${show(bad.expected)} got ${show(bad.got)}`);
      return bad;
    }
    console.log(`${r.name} ${r.id}: read-back green -- pin ${model}, tools, enabled and cron unchanged`);
  }
  return null;
}

function modeVerify(a) {
  const set = changedSet(a.live);
  if (gradeReadback(a.live, set)) return 1;
  console.log(`verify: ${set.length} of ${ROUTINES.length} routines green`);
  return 0;
}

async function modeRecord(a) {
  const set = changedSet(a.live);
  if (gradeReadback(a.live, set)) { console.log("record: refused -- the read-back is not green, nothing was written"); return 1; }
  const assignments = await loadAssignments(a.assignments);
  for (const { r, before, model, was } of set) {
    const assignment = assignmentFor(assignments, r);
    const decision = await supaRest("rpc/record_decision", {
      method: "POST",
      body: JSON.stringify({
        ...owner(a),
        p_kind: SYNC_KIND,
        p_backlog_id: BACKLOG_ID,
        p_summary: `${r.name} ${r.id}: pin ${was} -> ${model}`,
        p_reasoning:
          `model_assignments ${r.job_kind}/${r.job_key} names ${model} (assignment decision_id ` +
          `${assignment?.decision_id ?? "null -- seeded, never switched"}), and the routine still ran ${was}. ` +
          `The routine is the copy and the table is the source (§19v). The whole job_config.ccr was re-sent ` +
          `with only session_context.model changed -- a partial ccr resets the pin and the tools ` +
          `(routine-prompt.md, found live 2026-09-11) -- and the read-back asserted derived_state.model, ` +
          `allowed_tools, enabled and cron_expression. enabled and cron were never in the body (John, Q4 2026-09-25).`,
        p_ladder_work_class: null,
      }),
    });
    if (typeof decision !== "string" || !UUID_RE.test(decision)) {
      throw new UsageError(`record_decision returned ${JSON.stringify(decision)}, which is not a decision id`);
    }
    // IMAGE CARRIES THE WHOLE `get`, because the undo is a RE-SEND of that config, not a row
    // restore: reverse_decision() puts back no routine at all (SES-399).
    await supaRest("runner_before_images", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ...imageOwner(a), table_name: IMAGE_TABLE, pk_value: r.id, row_data: before, decision_id: decision }),
    });
    console.log(`${r.name} ${r.id}: pin ${was} -> ${model}, decision ${decision}`);
    console.log(`undo: node scripts/sync-routine-models.js --undo=${decision}`);
  }
  console.log(`record: ${set.length} decision${set.length === 1 ? "" : "s"}, ${set.length} before-image${set.length === 1 ? "" : "s"}`);
  return 0;
}

async function modeUndo(a) {
  const images = await supaRest(
    `runner_before_images?decision_id=eq.${encodeURIComponent(a.undo)}&table_name=eq.${IMAGE_TABLE}&select=pk_value,row_data`);
  if (!images?.length) throw new UsageError(`no ${IMAGE_TABLE} before-image for decision ${a.undo}`);
  for (const image of images) {
    const ccr = image?.row_data?.job_config?.ccr;
    if (!ccr) throw new UsageError(`the image for ${image.pk_value} carries no job_config.ccr -- it cannot be re-sent`);
    const out = liveFile(a.live, image.pk_value, ".undo");
    writeJson(out, { job_config: { ccr } });
    const name = ROUTINES.find(r => r.id === image.pk_value)?.name ?? image.pk_value;
    console.log(`${name} ${image.pk_value}: undo body ${out} (pin ${ccr.session_context?.model ?? "?"}) -- send it with update, then get to read it back`);
  }
  return 0;
}

async function modePending(a) {
  const assignments = await loadAssignments(a.assignments);
  const decisions = await supaRest(
    `runner_decisions?select=id,kind,status,summary,decided_at&kind=in.(${SYNC_KIND},${PENDING_KIND})&order=decided_at.desc&limit=1000`);
  const rows = pendingRows(assignments, decisions);
  for (const row of rows) {
    const decision = await supaRest("rpc/record_decision", {
      method: "POST",
      body: JSON.stringify({
        ...owner(a),
        p_kind: PENDING_KIND,
        p_backlog_id: BACKLOG_ID,
        p_summary: row.summary,
        p_reasoning:
          `model_assignments ${row.job_kind}/${row.job_key} names ${row.model} and moved after this routine's last ` +
          `${SYNC_KIND}. No cloud run can send the update -- update_trigger refuses a routine created via http_api, ` +
          `and RemoteTrigger is a session tool -- so the ask is recorded for the next attended sitting: ` +
          `get -> --plan -> update -> get -> --verify -> --record.`,
        p_ladder_work_class: null,
      }),
    });
    console.log(`${row.summary} (decision ${decision})`);
  }
  console.log(`pending: ${rows.length} routine${rows.length === 1 ? "" : "s"} await an attended sitting`);
  return 0;
}

// ---- arguments ---------------------------------------------------------------------------------

const MODES = ["plan", "verify", "record", "undo", "pending"];
const FLAGS = [...MODES, "live", "assignments", "session-name", "cycle-id"];

export function parseArgs(argv) {
  const a = {};
  for (const s of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(s);
    if (!m) throw new UsageError(`unknown argument ${s}`);
    if (!FLAGS.includes(m[1])) throw new UsageError(`unknown flag --${m[1]}`);
    a[m[1]] = m[2] ?? "";
  }
  const modes = MODES.filter(m => a[m] !== undefined);
  if (modes.length !== 1) throw new UsageError(`exactly one of ${MODES.map(m => `--${m}`).join(" / ")} (got ${modes.length})`);
  const mode = modes[0];
  if (mode === "undo" && !a.undo) throw new UsageError("--undo needs a decision id");
  if (mode !== "pending" && !a.live) throw new UsageError(`--${mode} needs --live=<dir>`);
  if (a.live && !fs.existsSync(a.live)) throw new UsageError(`--live directory ${a.live} does not exist`);
  if (a.assignments !== undefined && !a.assignments) throw new UsageError("--assignments needs a file or inline JSON");
  const named = a["session-name"] !== undefined, cycled = a["cycle-id"] !== undefined;
  if (["record", "pending"].includes(mode)) {
    // The ledger's own xor (record_decision and runner_before_images both take cycle XOR session).
    if (named === cycled) throw new UsageError(`--${mode} needs exactly one of --session-name=<n> / --cycle-id=<uuid>`);
    if (named && !a["session-name"]) throw new UsageError("--session-name needs a name");
    if (cycled && !UUID_RE.test(a["cycle-id"])) throw new UsageError("--cycle-id needs a uuid");
  } else if (named || cycled) {
    throw new UsageError(`--session-name / --cycle-id go with --record or --pending only`);
  }
  if (mode !== "plan" && mode !== "pending" && a.assignments !== undefined) {
    throw new UsageError("--assignments goes with --plan or --pending only");
  }
  return { ...a, mode };
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const a = parseArgs(argv);
    const run = { plan: modePlan, verify: modeVerify, record: modeRecord, undo: modeUndo, pending: modePending }[a.mode];
    process.exitCode = await run(a);
  } catch (e) {
    console.error(`sync-routine-models: ${e instanceof UsageError ? "" : "error: "}${e.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
