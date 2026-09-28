#!/usr/bin/env node
// DeepBench v7.0.671 | scripts/model-assignment.js | AGT-150 -- the model assignment driver: one
// command that reviews the watch window, runs the trials the answer will have to cite, assembles the
// Development Manager's turn, and applies his answer as a client of public.apply_model_assignment().
// Spec: docs/kickoffs/v7.0.671-AGT-150-model-assignment-driver.md sections 4 and 5.
//
// WHY THIS EXISTS. AGT-144 shipped the write path (`apply_model_assignment()`), AGT-148 shipped the
// evidence producer (`scripts/model-trial.js`), and AGT-146 -- the routine that would sequence them --
// is still `open`. Measured live 2026-09-28 04:00Z: 5 `model_assignments` rows, 6 `model_catalog`,
// 9 `model_pricing`, and NOTHING that runs watch -> trial -> assign in order. Driving it by hand is
// three commands in a fixed sequence whose middle step spends real usage, which is exactly the shape
// that belongs in one script rather than in a human's memory (pattern:9, pattern:17).
//
// THREE DOORS, ONE VALIDATOR -- scripts/decide-gated-card.js's skeleton, and deliberately so
// (pattern:17): the shape is already proven, so only the four things AGT-150 actually changes differ.
//   --prepare (--cycle-id=<uuid> | --session-name=<name>) [--trials=<pairs>] [--out=<path>] [--json]
//       (1) POSTs rpc/review_model_watch -- THE WATCH IS A WRITE, which is why --prepare carries
//           attribution just like --apply does: a revert images rows under `runner_before_images`
//           and that table's ck_before_image_attribution CHECK demands exactly one of the two.
//       (2) runs `node scripts/model-trial.js` once per --trials pair, IN ORDER, as a child process.
//           THE CHILD OWNS THE ROOM RULE: its exit 3 stops the queue here, it is never second-guessed.
//       (3) GETs the three assignment tables and assembles the manager's prompt through the SAME
//           assemblePrompt() the executor calls, rendered with agent-prompt.js's renderAssembly().
//           THIS FILE BUILDS NO PROMPT TEXT (Section 19b, one assembly path). `--intent` is never a
//           flag here: the intent comes off `capabilities.default_intent_slug` (`dm-model-assign-intent`).
//       Exit 3 -- awaiting the answer.
//   --dry-run=<answer.json> --context=<prepare.json>
//       runs validateAnswer() over the manager's answer and prints ok or every refusal. No network.
//   --apply=<answer.json> --context=<prepare.json> (--cycle-id=<uuid> | --session-name=<name>)
//       runs the SAME validateAnswer() first (a refusal exits 1 and sends nothing), then POSTs
//       rpc/apply_model_assignment. THE FUNCTION OWNS THE WRITE, its before-images and its decisions;
//       this file writes no table ITSELF, and there is no re-settle leg -- a model assignment settles
//       no ticket.
//
// NOTHING IS RE-READ BETWEEN --prepare AND --apply, and that is a property rather than an oversight:
// the validator judges the answer against the rows the manager was SHOWN, so a row that changed in
// between is unseen here and the function -- which locks `model_assignments ... for update` and
// re-derives pricing itself -- stays the authority. A validator that re-read would disagree with the
// function it mirrors and would refuse answers the function accepts.
//
// EXIT CODES: 0 ok; 1 refused / a request or a trial failed; 2 could not run (missing credentials or
// arguments -- never a pass); 3 the prompt is printed and the answer is awaited (including when the
// trial queue stopped for no room: no room is not a failure, it is a reading).

import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { assemblePrompt } from "../api/prompt/db-assembly.js";
import { renderAssembly, resolveJudgmentModel } from "./agent-prompt.js";
// The room rule has ONE home: AGT-148's own exported function, over the same reading the child reads
// (pattern:14). This file never restates the wall, the pace line or fable_share -- it only names the
// reason the child already acted on, so the two can never drift into disagreeing.
import { roomFor } from "./model-trial.js";

// --- pure half (imported by tests/regression/agt-150-model-assignment.test.mjs; no network) -------

export const AGENT = "devmanager";
export const CAPABILITY = "model-assignment";
export const TENANT = "global";

// The action vocabulary public.apply_model_assignment() enforces (k_actions), in its own order.
export const ACTIONS = Object.freeze(["switch", "keep", "money", "file-ticket"]);

export const AWAITING_ANSWER =
  "prompt assembled and printed; exit 3 = awaiting the manager's answer, then --dry-run and --apply";

const blank = v => String(v ?? "").trim() === "";
const nullable = v => (v === undefined || v === null || v === "" ? "<NULL>" : String(v));
const num = v => (v === null || v === undefined || v === "" ? NaN : Number(v));

// `--trials=<kind>/<key>:<candidate>,…` -> the queue, IN THE ORDER GIVEN (pattern:127: a fixed
// order makes two runs of the same queue comparable). Pure, and a malformed list returns
// { error } rather than throwing: the caller turns that into exit 2, never a partial queue.
export function parsePairs(s) {
  const text = String(s ?? "").trim();
  if (text === "") return { error: "--trials=<kind>/<key>:<candidate>,… is empty" };
  const out = [];
  for (const raw of text.split(",")) {
    const pair = raw.trim();
    if (pair === "") return { error: `--trials has an empty pair in "${text}"` };
    const m = /^(lane|capability)\/([^:/]+):([^:,]+)$/.exec(pair);
    if (!m) return { error: `--trials pair "${pair}" is not <lane|capability>/<key>:<candidate>` };
    out.push({ jobKind: m[1], jobKey: m[2], candidate: m[3] });
  }
  return out;
}

export const pairLabel = p => `${p.jobKind}/${p.jobKey}:${p.candidate}`;
export const trialFileName = p => `trial-${p.jobKind}-${p.jobKey}-${p.candidate}.json`;

// THE TWENTY REFUSALS of public.apply_model_assignment(), read live from
// pg_get_functiondef('public.apply_model_assignment'::regproc) on 2026-09-28 (count asserted: 20) and
// never from memory. Nineteen are visible to validateAnswer() below, which collects EVERY one rather
// than stopping at the first -- a dry-run shows the manager the whole list, where the function shows
// him one refusal per round trip. The twentieth (`exactly one of p_cycle_id / p_session_name`) is a
// property of the CALL, not of the answer, so its home is the door: both write doors exit 2 on
// neither-or-both, before a byte is read. Each entry here is the function's own wording with its
// `apply_model_assignment: ` prefix dropped.
export const REFUSAL_LINES = Object.freeze([
  "exactly one of p_cycle_id / p_session_name (runner_before_images CHECK ck_before_image_attribution)",
  "p_answer must be a JSON object",
  "catalog and actions must be arrays",
  "nothing to apply -- catalog and actions are both empty",
  "catalog row % refused -- Claude models only",
  "catalog row % needs family",
  "catalog row % is new to model_pricing and needs input_per_1k and output_per_1k",
  "% -- no model_assignments row",
  "% -- action % is not one of switch, keep, money, file-ticket",
  "% -- the % action needs a reason",
  "% -- to_model % refused: Claude models only",
  "% -- to_model % is not in model_catalog",
  "% -- to_model % is deprecated (deprecated_on %)",
  "% -- trial_evidence must be an array",
  "% -- a switch needs at least 3 trials, got %",
  "% -- % of % trials: candidate did not pass; every trial must pass",
  "% -- switch up to %: % trials lost an approve the baseline had (match-or-beat)",
  "% -- switch up to %: candidate tokens % exceed baseline % by more than 10%",
  "% -- a money ask needs weekly_cost_usd",
  "% -- file-ticket needs ticket_title",
]);

const rowsOf = v => (Array.isArray(v) ? v : []);

// Mirrors apply_model_assignment()'s validation, in the function's order and with its own message
// texts, against the rows --prepare put in the context. TWO checks need those rows and not just the
// answer, and both are the up/down split: `input_per_1k` from `pricing` decides whether the switch
// is UP (only an up switch faces match-or-beat and the 10% token ceiling), and `complexity_band`
// from `assignments` decides whether the ceiling can be waived. Everything else the function checks
// -- that the row is still there, that it is still on that model -- stays the function's, under its
// own `for update` lock.
export function validateAnswer(answer, ctx) {
  const refusals = [];
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    refusals.push("p_answer must be a JSON object");
    return { ok: false, refusals };
  }
  const catalog = answer.catalog ?? [];
  const actions = answer.actions ?? [];
  if (!Array.isArray(catalog) || !Array.isArray(actions)) {
    refusals.push("catalog and actions must be arrays");
    return { ok: false, refusals };
  }
  if (catalog.length === 0 && actions.length === 0) {
    refusals.push("nothing to apply -- catalog and actions are both empty");
    return { ok: false, refusals };
  }

  const c = ctx && typeof ctx === "object" ? ctx : {};
  const assignments = new Map(rowsOf(c.assignments).map(r => [`${r.job_kind}/${r.job_key}`, r]));
  const knownCatalog = new Map(rowsOf(c.catalog).map(r => [String(r.model_id), r]));
  const pricing = new Map(rowsOf(c.pricing).map(r => [String(r.model), r]));

  // 1. Catalog rows, in the function's order: Claude only, family, then pricing completeness.
  for (const row of catalog) {
    const id = row && typeof row === "object" ? row.model_id : undefined;
    const shown = nullable(id);
    if (typeof id !== "string" || !id.startsWith("claude-")) {
      refusals.push(`catalog row ${shown} refused -- Claude models only`);
      continue;
    }
    if (blank(row.family)) refusals.push(`catalog row ${shown} needs family`);
    const known = pricing.has(shown);
    const hasBoth = row.input_per_1k !== undefined && row.input_per_1k !== null
      && row.output_per_1k !== undefined && row.output_per_1k !== null;
    if (!known && !hasBoth) {
      refusals.push(`catalog row ${shown} is new to model_pricing and needs input_per_1k and output_per_1k`);
    }
  }

  // 2. Actions, one per model_assignments row.
  for (const a of actions) {
    const act = a && typeof a === "object" ? a.action : undefined;
    const kind = a && typeof a === "object" ? a.job_kind : undefined;
    const key = a && typeof a === "object" ? a.job_key : undefined;
    const ref = `${nullable(kind)}/${nullable(key)}`;
    const row = assignments.get(ref);
    // The function raises here and rolls back, so nothing downstream of a missing row is reachable:
    // its band and its current model are exactly what the remaining checks would need.
    if (!row) { refusals.push(`${ref} -- no model_assignments row`); continue; }
    if (!ACTIONS.includes(act)) {
      refusals.push(`${ref} -- action ${nullable(act)} is not one of ${ACTIONS.join(", ")}`);
    }
    if (blank(a.reason)) refusals.push(`${ref} -- the ${nullable(act)} action needs a reason`);

    const to = a.to_model;
    if (act === "switch" || act === "money") {
      if (typeof to !== "string" || !to.startsWith("claude-")) {
        refusals.push(`${ref} -- to_model ${nullable(to)} refused: Claude models only`);
      } else {
        const cat = knownCatalog.get(to);
        if (!cat) refusals.push(`${ref} -- to_model ${to} is not in model_catalog`);
        else if (cat.deprecated_on !== null && cat.deprecated_on !== undefined) {
          refusals.push(`${ref} -- to_model ${to} is deprecated (deprecated_on ${cat.deprecated_on})`);
        }
      }
    }

    if (act === "switch") {
      const t = a.trial_evidence ?? [];
      if (!Array.isArray(t)) { refusals.push(`${ref} -- trial_evidence must be an array`); continue; }
      if (t.length < 3) refusals.push(`${ref} -- a switch needs at least 3 trials, got ${t.length}`);
      const bad = t.filter(e => (e?.candidate?.passed ?? false) !== true).length;
      if (bad > 0) {
        refusals.push(`${ref} -- ${bad} of ${t.length} trials: candidate did not pass; every trial must pass`);
      }
      // The up/down split: strictly greater input_per_1k is UP. A price the context does not carry
      // leaves the comparison undecided, which the function reads as NOT up (its `if v_up` over a
      // NULL is false) -- so a down switch and an unpriced one both skip the two up-only rules.
      const oldIn = num(pricing.get(String(row.model_id))?.input_per_1k);
      const newIn = num(pricing.get(String(to))?.input_per_1k);
      const up = Number.isFinite(oldIn) && Number.isFinite(newIn) && newIn > oldIn;
      if (up) {
        const lost = t.filter(e => (e?.baseline?.verdict ?? "none") === "approve"
          && (e?.candidate?.verdict ?? "none") !== "approve").length;
        if (lost > 0) {
          refusals.push(`${ref} -- switch up to ${to}: ${lost} trials lost an approve the baseline had (match-or-beat)`);
        }
        const sum = (e, side) => Number(e?.[side]?.tokens ?? 0) || 0;
        const cand = t.reduce((n, e) => n + sum(e, "candidate"), 0);
        const base = t.reduce((n, e) => n + sum(e, "baseline"), 0);
        // The waiver is the hard-judgment band's alone, and it needs a trial that BOTH passed and
        // was called clearly better -- one flag on a failed trial waives nothing.
        const waived = row.complexity_band === "hard-judgment"
          && t.some(e => (e?.candidate?.passed ?? false) === true && (e?.clearly_better ?? false) === true);
        if (cand > 1.10 * base && !waived) {
          refusals.push(`${ref} -- switch up to ${to}: candidate tokens ${cand} exceed baseline ${base} by more than 10%`);
        }
      }
    } else if (act === "money") {
      if (a.weekly_cost_usd === undefined || a.weekly_cost_usd === null) {
        refusals.push(`${ref} -- a money ask needs weekly_cost_usd`);
      }
    } else if (act === "file-ticket") {
      if (blank(a.ticket_title)) refusals.push(`${ref} -- file-ticket needs ticket_title`);
    }
  }

  return { ok: refusals.length === 0, refusals };
}

// --- CLI -----------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "usage: model-assignment.js --prepare (--cycle-id=<uuid> | --session-name=<name>) "
  + "[--trials=<kind>/<key>:<candidate>,…] [--out=<path>] [--json] | --dry-run=<answer.json> "
  + "--context=<prepare.json> | --apply=<answer.json> --context=<prepare.json> "
  + "(--cycle-id=<uuid> | --session-name=<name>)";

function parseArgs(argv) {
  const a = {};
  for (const s of argv) {
    const m = /^--([^=]+)(?:=([\s\S]*))?$/.exec(s);
    if (m) a[m[1]] = m[2] === undefined ? true : m[2];
  }
  return a;
}

class Exit extends Error {}
let fetched = false;
function die(code, msg) {
  (code === 0 ? process.stdout : process.stderr).write(msg.endsWith("\n") ? msg : msg + "\n");
  if (!fetched) process.exit(code);
  process.exitCode = code;
  throw new Exit(String(code));
}

function readJson(p, what) {
  if (typeof p !== "string" || !p) die(2, `model-assignment: ${what} path missing`);
  try { return JSON.parse(fs.readFileSync(path.resolve(p), "utf8")); }
  catch (e) { die(2, `model-assignment: cannot read ${what} ${p}: ${e.message}`); }
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    die(2, "model-assignment: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
  }
  return { base, key };
}

// Exactly one of the two, on BOTH write doors: --prepare reverts through review_model_watch() and
// --apply writes through apply_model_assignment(), and each images rows under the
// runner_before_images CHECK that refuses neither-or-both.
function attribution(args, door) {
  const hasCycle = typeof args["cycle-id"] === "string" && args["cycle-id"] !== "";
  const hasSession = typeof args["session-name"] === "string" && args["session-name"] !== "";
  if (hasCycle === hasSession) {
    die(2, `model-assignment ${door}: exactly one of --cycle-id=<uuid> / --session-name=<name>`);
  }
  return {
    cycleId: hasCycle ? args["cycle-id"] : null,
    sessionName: hasSession ? args["session-name"] : null,
  };
}

async function rest(base, key, method, q, body) {
  fetched = true;
  const res = await fetch(`${base}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json };
}

const undoLine = id => `select * from public.reverse_decision('${id}', '<actor>', '<reason>');`;

async function prepare(args) {
  const { cycleId, sessionName } = attribution(args, "--prepare");
  const pairs = args.trials === undefined ? [] : parsePairs(args.trials);
  if (pairs.error) die(2, `model-assignment --prepare: ${pairs.error}`);
  const { base, key } = creds();
  const get = async q => {
    const r = await rest(base, key, "GET", q);
    if (!r.ok) die(1, `model-assignment: GET ${q} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  };
  const post = async (q, body) => {
    const r = await rest(base, key, "POST", q, body);
    if (!r.ok) die(1, `model-assignment: POST ${q} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  };

  // Context rows first, silently: the trial queue needs the same reading the child will read, and
  // the watch line must be the first thing printed.
  const assignments = await get("model_assignments?select=*&order=job_kind,job_key");
  const catalog = await get("model_catalog?select=*&order=model_id");
  const pricing = await get("model_pricing?select=*&order=model");
  const boot = await post("rpc/runner_should_boot", {});
  const detail = (Array.isArray(boot) ? boot[0] : boot)?.detail ?? null;

  // (1) THE WATCH -- AGT-146 step 2. This is the write that makes --prepare a write door.
  const watch = await post("rpc/review_model_watch", { p_cycle_id: cycleId, p_session_name: sessionName });
  const watched = rowsOf(watch?.watched);
  const reverted = rowsOf(watch?.reverted);
  console.log(`watch reviewed ${watched.length}, reverted ${reverted.length}`);
  for (const r of reverted) {
    console.log(`revert ${r.job}: ${r.from} -> ${r.to} (decision ${r.decision_id})`);
    console.log(`  ${undoLine(r.decision_id)}`);
  }

  // (2) THE TRIALS, in the order given. The child spends the usage and owns the room rule; this
  // loop only reads its exit code. Its output is inherited rather than captured -- a trial's own
  // progress belongs on the operator's screen as it happens, not in a buffer printed afterwards.
  const outDir = typeof args.out === "string" && args.out ? path.dirname(path.resolve(args.out)) : os.tmpdir();
  const kept = [];
  let noRoom = null;
  for (const p of pairs) {
    const file = path.join(outDir, trialFileName(p));
    const child = spawnSync(process.execPath, [
      path.join(ROOT, "scripts", "model-trial.js"),
      `--job-kind=${p.jobKind}`, `--job-key=${p.jobKey}`, `--candidate=${p.candidate}`,
      `--out=${file}`, ...(cycleId ? [`--cycle-id=${cycleId}`] : []),
    ], { cwd: ROOT, stdio: "inherit" });
    if (child.status === 0) { kept.push({ pair: p, file }); continue; }
    if (child.status === 3) {
      // The child already refused for room and said so. Name the same reason off the same reading,
      // through AGT-148's own roomFor() -- and stop the queue: a second pair would meet the same wall.
      noRoom = roomFor(detail, p.candidate)?.reason ?? "no room";
      console.log(`no-room: ${noRoom}`);
      break;
    }
    if (child.status === 4) { console.log(`skipped: ${pairLabel(p)}`); continue; }
    die(1, `model-assignment: trial-failed: ${pairLabel(p)} exit ${child.status}`);
  }

  const trials = [];
  for (const k of kept) {
    try { trials.push(JSON.parse(fs.readFileSync(k.file, "utf8"))); }
    catch (e) { die(1, `model-assignment: cannot read trial evidence ${k.file}: ${e.message}`); }
  }

  // (3) THE PROMPT. Context is rows -- the manager reads the tables he is about to move.
  const task_context = { assignments, catalog, pricing, room: detail, trials, watch: watch ?? null };

  const caps = await get(`capabilities?slug=eq.${CAPABILITY}&tenant_id=eq.${TENANT}&select=default_intent_slug&limit=1`);
  const intentSlug = caps[0]?.default_intent_slug;
  if (!intentSlug) die(1, `model-assignment: capability "${CAPABILITY}" has no capabilities row or no default_intent_slug`);

  let assembly;
  try {
    assembly = await assemblePrompt({
      capability_slug: CAPABILITY, agent_id: AGENT, tenant_id: TENANT, task_context,
      intent_slug: intentSlug,
    });
  } catch (e) { die(1, `model-assignment: ${e.message}`); }
  if (!assembly.agent_card) die(1, `model-assignment: no agents row for ${AGENT}`);

  const lane = await resolveJudgmentModel(assembly, {
    supabaseUrl: base, headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (lane.warning) console.error(`model-assignment: ${lane.warning}`);
  if (assembly.llm) { assembly.llm.model = lane.model; assembly.llm.lane_note = lane.reason; }

  const { system_prompt, omitted } = renderAssembly(assembly);
  if (!system_prompt) die(1, `model-assignment: capability "${CAPABILITY}" assembled zero renderable sections`);
  const header = `# ${assembly.agent_card.name} — ${assembly.agent_card.role} · capability ${assembly.capability_slug} · model ${assembly.llm?.model}`;
  const laneLine = lane.from ? `\n# lane: judgment degraded to ${lane.model} (${lane.reason})` : "";
  const text = `${header}${laneLine}\n${system_prompt}\n`;

  if (typeof args.out === "string" && args.out) fs.writeFileSync(path.resolve(args.out), text, "utf8");
  if (args.json) {
    process.stdout.write(`${JSON.stringify({
      assignments: assignments.length, trials: trials.length, model: assembly.llm?.model,
      prompt_bytes: Buffer.byteLength(text, "utf8"), context: task_context,
    }, null, 2)}\n`);
  } else if (!args.out) {
    process.stdout.write(text);
  }
  if (omitted.length) console.error(`model-assignment: sections omitted (no stored content): ${omitted.join(", ")}`);
  die(3, noRoom
    ? `model-assignment --prepare: ${trials.length} trial(s) of ${pairs.length} pair(s) — the queue stopped at ${noRoom}; ${AWAITING_ANSWER}`
    : `model-assignment --prepare: ${trials.length} trial(s), ${watched.length} watched — ${AWAITING_ANSWER}`);
}

function refuse(refusals) {
  die(1, refusals.map(r => `refused: ${r}`).join("\n"));
}

// --prepare --json wraps its context; a caller may also hand the bare context object.
function contextOf(ctx) {
  if (ctx && typeof ctx === "object" && ctx.context && typeof ctx.context === "object") return ctx.context;
  return ctx && typeof ctx === "object" ? ctx : {};
}

function dryRun(args) {
  const answer = readJson(args["dry-run"], "answer");
  const ctx = readJson(args.context, "context");
  const v = validateAnswer(answer, contextOf(ctx));
  if (!v.ok) refuse(v.refusals);
  die(0, "ok");
}

async function apply(args) {
  const { cycleId, sessionName } = attribution(args, "--apply");
  const answer = readJson(args.apply, "answer");
  const ctx = readJson(args.context, "context");
  const v = validateAnswer(answer, contextOf(ctx));
  if (!v.ok) refuse(v.refusals); // nothing is sent

  const { base, key } = creds();
  const r = await rest(base, key, "POST", "rpc/apply_model_assignment", {
    p_answer: answer, p_cycle_id: cycleId, p_session_name: sessionName,
  });
  if (!r.ok) die(1, `model-assignment --apply: HTTP ${r.status} ${r.text}`);
  const { catalog_rows, actions, reverse } = r.json ?? {};

  console.log(`catalog rows: ${catalog_rows ?? 0}`);
  for (const a of rowsOf(actions)) {
    console.log(`${a.job} ${a.action} -> decision ${a.decision_id ?? "(none)"}`);
  }
  // Every undo line the function returned, verbatim: a reader handed a partial list cannot put the
  // catalog and the switches back separately, which is the only way to reverse them.
  for (const line of rowsOf(reverse)) console.log(String(line));

  const alerts = await rest(base, key, "GET",
    "john_alerts?source=eq.model-assignment&acknowledged_at=is.null&select=id");
  if (!alerts.ok) die(1, `model-assignment --apply: john_alerts read HTTP ${alerts.status} ${alerts.text.slice(0, 200)}`);
  console.log(`MONEY waiting on John: ${rowsOf(alerts.json).length}`);
  process.exitCode = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.prepare) return prepare(args);
  if (args["dry-run"]) return dryRun(args);
  if (args.apply) return apply(args);
  die(2, USAGE);
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`model-assignment: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
