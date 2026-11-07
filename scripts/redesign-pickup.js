#!/usr/bin/env node
// DeepBench v7.0.977 | scripts/redesign-pickup.js | AGT-610 -- a refused ticket is redesigned twice, then diagnosed.
// Spec: docs/kickoffs/v7.0.977-AGT-610-refusal-redesign-ledger.md section 4 (T2, §S).
//
// WHY THIS EXISTS. John's standing decision 6e94edcb (2026-11-05, `runner_directives`, status
// `standing`): when the platform's auto-mode safety check REFUSES a build step, the team -- not John
// -- picks the ticket up, redesigns it by risk, and runs it again. At most TWO attempts, the second
// differing from the first in staging, scope or mechanism for an engineering reason. After the second
// refusal, ONE diagnostic pass that changes nothing: it captures both refusals, records what it still
// does not know about the boundary, attempts Anthropic `/feedback`, and parks the ticket for good.
// His words on the limit: "yes, but give them permission for 2 attempts, and the second attempt is
// different than the first. i want more data why it got blocked if it does not make it".
//
// THE FUNCTIONS OWN EVERY WRITE AND EVERY GUARD, and this file owns none of them. `--open` cannot
// open a third attempt because `open_redesign_attempt()` raises; `--refuse` cannot record half a
// refusal because `record_refusal()` raises on the first missing key; `--diagnose` cannot run early
// because `close_refusal_diagnostic()` counts the refusals itself. A guard that lived here would be
// one `--force` away from the third try John rejected. `validateRefusal()` below is a MIRROR of the
// function's rules so a cycle can see every problem at once before it sends anything -- never the
// authority.
//
// WHAT IT NEVER DOES (clause 4 / CLAUDE.md SES-019): re-send an action already refused, route the
// same action through a different tool, or reword a step to get past the check. `never_send` travels
// with the candidate from `refusal_parked_tickets()` and `validateRefusal()` refuses a byte-identical
// `action_sent` as `guard 4` before any POST.
//
// FOUR DOORS:
//   --next [--out=<task.json>]
//       the pickup. Row 1 of refusal_parked_tickets() (need_score desc, queue), its full ticket row
//       and a `redesign` block written to a task file for the Designer's design-kickoff. Exit 3 =
//       awaiting the Designer, the same contract rule-cap-case.js --prepare uses.
//   --open --ticket=<id> --cycle-id=<uuid> --kickoff=<path>
//       records the attempt BEFORE the build runs, from the kickoff's own `Redesign:` line.
//   --refuse --ticket=<id> --cycle-id=<uuid> --from=<json> [--dry-run] [--reason=<text>]
//       the refusal, all nine facts, through rpc/record_skip with p_reason_kind 'permission-gate'.
//       --dry-run validates and sends nothing.
//   --diagnose --ticket=<id> --cycle-id=<uuid> --unknowns-file=<path> [--no-send]
//       the third step, after the second refusal. Assembles both attempts, ATTEMPTS /feedback via
//       the Claude Code CLI and records what came back -- never asserts that it was filed.
//
// EXIT CODES: 0 ok; 1 refused / request failed; 2 could not run (missing credentials or arguments --
// never a pass); 3 the task file is written and the Designer's answer is awaited.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { spawnSync } from "child_process";

// --- pure half (imported by tests/regression/agt-610-refusal-ledger.test.mjs; no network) --------

/** The nine facts John's clause 5 requires of every refusal. The order is the message's order. */
export const REQUIRED_REFUSAL_KEYS = Object.freeze([
  "refusal_text", "refusal_label", "action_sent", "run_minutes", "run_turns",
  "earlier_refusals", "model", "reach", "undo",
]);

/** The three dimensions attempt 2 may differ in (clause 3). The CHECK on the table is the authority. */
export const DIFFERS = Object.freeze(["staging", "scope", "mechanism"]);

/** The three facts that are numbers, so "0 turns" and "no turns recorded" cannot be confused. */
const NUMERIC_REFUSAL_KEYS = Object.freeze(["run_minutes", "run_turns", "earlier_refusals"]);

const blank = v => String(v ?? "").trim() === "";

/**
 * The kickoff's own SESSION line, parsed rather than trusted:
 *   - **Redesign:** attempt 2; differs: scope; because: <engineering reason>; from prior: <what changed>
 *
 * `from prior:` IS REQUIRED BY THE REGEX, not checked afterwards, and that is the point of parsing
 * here at all: clause 3 wants what CHANGED recorded before the attempt runs, and a line that names a
 * reason but not the change is the line a session writes when it is re-running the same design.
 */
export function parseRedesignLine(md) {
  const m = String(md ?? "").match(
    /\*\*Redesign:\*\*\s*attempt\s+(\d)\s*;\s*differs:\s*([a-z]+)\s*;\s*because:\s*(.+?)\s*;\s*from prior:\s*(.+?)\s*$/m);
  if (!m) return null;
  return {
    attempt_no: Number(m[1]),
    differs: m[2],
    reason: m[3],
    diff_from_prior: m[4],
  };
}

/**
 * Every problem at once, never the first one: a cycle that has just been refused is about to lose
 * its run, and handing it one missing key per round trip costs it the rest of the data.
 *
 * GUARD 4 IS CHECKED HERE TOO, before anything is sent, although `record_refusal()` enforces it: the
 * function's answer is a parked row, and a cycle that learns "you already sent that" from a POST has
 * already spent the ticket's attempt. The comparison is the function's own -- trimmed, byte-exact --
 * so the two cannot disagree about what "identical" means.
 */
export function validateRefusal(obj, neverSend = []) {
  const refusals = [];
  const o = obj && typeof obj === "object" ? obj : {};
  for (const key of REQUIRED_REFUSAL_KEYS) {
    if (blank(o[key])) refusals.push(`missing ${key}`);
  }
  for (const key of NUMERIC_REFUSAL_KEYS) {
    if (!blank(o[key]) && !Number.isFinite(Number(o[key]))) refusals.push(`${key} is not a number`);
  }
  const sent = String(o.action_sent ?? "").trim();
  if (sent && (Array.isArray(neverSend) ? neverSend : []).some(n => String(n ?? "").trim() === sent)) {
    refusals.push("action_sent is byte-identical to an action already refused on this ticket (guard 4, SES-019)");
  }
  return { ok: refusals.length === 0, refusals };
}

/**
 * The diagnostic text -- both attempts in full, then what is still unknown about the boundary.
 *
 * IT SAYS THERE IS NO THIRD ATTEMPT, in line 1, because the text is what a reader outside DeepBench
 * (Anthropic's `/feedback`) sees: a report that looks like a request to be let through is not the
 * report John asked for. What he asked for is "more data why it got blocked".
 */
export function assembleDiagnostic(ticket, rows, unknowns) {
  const refused = (Array.isArray(rows) ? rows : [])
    .filter(r => r && r.refused_at)
    .sort((a, b) => Number(a.attempt_no) - Number(b.attempt_no));
  const labels = [...new Set(refused.map(r => String(r.refusal_label ?? "")).filter(Boolean))];
  const actions = new Set(refused.map(r => String(r.action_sent ?? "").trim()));
  const L = [];
  L.push(`DeepBench AGT-610 refusal diagnostic -- ${ticket}: ${refused.length} refusal(s), two redesign `
    + "attempts spent, no third attempt (CLAUDE.md SES-019).");
  for (const r of refused) {
    L.push(`attempt ${r.attempt_no} (${r.kind}): label ${r.refusal_label}; text: ${r.refusal_text}; `
      + `action as sent: ${r.action_sent}; context: ${r.run_minutes} min, ${r.run_turns} turns, `
      + `${r.earlier_refusals} earlier refusal(s), model ${r.model}; reach: ${r.reach}; undo: ${r.undo}; `
      + `differed from prior: ${r.diff_from_prior || "n/a (original build)"}.`);
  }
  L.push(`labels seen: ${labels.join(", ") || "(none)"}; actions ${actions.size === refused.length ? "all differed" : "repeated"}.`);
  L.push(`still unknown about the boundary: ${unknowns}`);
  return { feedback_text: L.join("\n"), refusals: refused.length, labels };
}

/** The `/feedback` call's arguments -- scripts/read-usage-meter.js's CLI_ARGS shape (SES-388). */
export function feedbackCliArgs(text) {
  return ["-p", "/feedback " + text, "--max-turns", "1", "--output-format", "text"];
}

/** The paste-ready Designer command the pickup prints, so the next step needs nothing re-derived. */
export function nextLine(row) {
  const out = row && row.out ? row.out : "<task.json>";
  return `node scripts/agent-prompt.js --agent=designer --capability=design-kickoff --intent=ds-kickoff-intent --task-file=${out}`;
}

// --- CLI ----------------------------------------------------------------------------------------

function parseArgs(argv) {
  const a = {};
  for (const s of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(s);
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
  if (typeof p !== "string" || !p) die(2, `redesign-pickup: ${what} path missing`);
  try { return JSON.parse(fs.readFileSync(path.resolve(p), "utf8")); }
  catch (e) { die(2, `redesign-pickup: cannot read ${what} ${p}: ${e.message}`); }
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    die(2, "redesign-pickup: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
  }
  return { base, key };
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

function ticketArg(args) {
  const t = typeof args.ticket === "string" ? args.ticket.trim() : "";
  if (!t) die(2, "redesign-pickup: --ticket=<backlog_id> is required");
  return t;
}

function cycleArg(args) {
  const c = typeof args["cycle-id"] === "string" ? args["cycle-id"].trim() : "";
  if (!c) die(2, "redesign-pickup: --cycle-id=<uuid> is required -- every write owes a before-image, and an image needs an owner (§19v)");
  return c;
}

const TICKET_SELECT = "backlog_id,title,description,priority_class,supports_class,predicted_cycles," +
  "scope_origin,epic_id,need_score,queue,status,design_status,kickoff_link";

async function next(args) {
  const { base, key } = creds();
  const r = await rest(base, key, "GET", "rpc/refusal_parked_tickets");
  if (!r.ok) die(1, `redesign-pickup --next: GET rpc/refusal_parked_tickets -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
  const rows = Array.isArray(r.json) ? r.json : null;
  if (rows === null) die(1, "redesign-pickup --next: refusal_parked_tickets() came back non-array -- refusing to pick from nothing");
  if (rows.length === 0) die(0, "redesign-pickup --next: nothing parked");

  const cand = rows[0];
  const t = await rest(base, key, "GET",
    `backlog_items?backlog_id=eq.${encodeURIComponent(cand.backlog_id)}&select=${TICKET_SELECT}`);
  if (!t.ok) die(1, `redesign-pickup --next: GET backlog_items -> HTTP ${t.status} ${t.text.slice(0, 400)}`);
  if (!Array.isArray(t.json) || t.json.length !== 1) {
    die(1, `redesign-pickup --next: no backlog_items row reads backlog_id ${cand.backlog_id}`);
  }

  const task = {
    ticket: t.json[0],
    redesign: {
      attempt_no: Number(cand.attempts || 0) + 1,
      basis: cand.basis,
      never_send: Array.isArray(cand.never_send) ? cand.never_send : [],
      kickoff_link: cand.kickoff_link,
    },
  };
  const out = typeof args.out === "string" && args.out
    ? path.resolve(args.out)
    : path.resolve(`redesign-${cand.backlog_id}.json`);
  fs.writeFileSync(out, JSON.stringify(task, null, 2) + "\n", "utf8");

  console.error(`redesign-pickup --next: ${cand.backlog_id} (need_score ${cand.need_score ?? "—"}, queue ` +
    `${cand.queue ?? "—"}), redesign attempt ${task.redesign.attempt_no} of 2; ${task.redesign.never_send.length} ` +
    `action(s) in never_send. Run the Designer exactly as runbook step 6:\n  ${nextLine({ out })}`);
  console.error("redesign-pickup --next: after the Designer's turn, log it (mandatory Layer-3 row):\n" +
    "  node scripts/agent-log.js --agent=designer --capability=design-kickoff --model=<judgment lane> " +
    "--ai-type=design-kickoff --feature=design-kickoff:ds-kickoff-intent:depth1 --cycle=<runner_cycles.id> --patterns-applied=<csv>");
  die(3, `redesign-pickup --next: task file ${out} written; exit 3 = awaiting the Designer, then --open with its kickoff`);
}

async function open(args) {
  const ticket = ticketArg(args);
  const cycle = cycleArg(args);
  const kp = typeof args.kickoff === "string" ? args.kickoff : "";
  if (!kp) die(2, "redesign-pickup --open: --kickoff=<path> is required -- the attempt is recorded FROM the kickoff's own Redesign: line");
  let md;
  try { md = fs.readFileSync(path.resolve(kp), "utf8"); }
  catch (e) { die(2, `redesign-pickup --open: cannot read ${kp}: ${e.message}`); }

  const line = parseRedesignLine(md);
  if (!line) {
    die(1, "redesign-pickup --open: refused -- the kickoff carries no Redesign: line in the form " +
      "`- **Redesign:** attempt N; differs: staging|scope|mechanism; because: <engineering reason>; " +
      "from prior: <what changed>`. The Designer writes it; the caller never supplies it.");
  }
  // DIFFERS IS SENT AS PARSED, never normalised: `open_redesign_attempt()`'s CHECK is the authority
  // on the three dimensions, and a value this file quietly corrected would record a dimension the
  // Designer did not choose.
  if (!DIFFERS.includes(line.differs)) {
    die(1, `redesign-pickup --open: refused -- differs \`${line.differs}\` is not one of ${DIFFERS.join(", ")} ` +
      "(attempt 1 names the dimension it changed from the ORIGINAL build, not `first`)");
  }

  const { base, key } = creds();
  const r = await rest(base, key, "POST", "rpc/open_redesign_attempt", {
    p_cycle_id: cycle, p_backlog_id: ticket, p_reason: line.reason,
    p_differs: line.differs, p_diff_from_prior: line.diff_from_prior, p_kickoff_path: kp,
  });
  if (!r.ok) die(1, `redesign-pickup --open: ${r.json?.message ?? r.text.slice(0, 600)}`);
  const row = r.json ?? {};
  console.log(`redesign-pickup --open: ${ticket} attempt ${row.attempt_no} (${row.kind}) opened, differs ` +
    `${row.differs}, outcome ${row.outcome}, row ${row.id}`);
  console.log(`undo: delete the row and its before-image (${ticket}/${row.attempt_no}); the attempt is not a decision.`);
  process.exitCode = 0;
}

async function refuse(args) {
  const ticket = ticketArg(args);
  const obj = readJson(args.from, "refusal");
  const dry = args["dry-run"] === true;

  // DRY-RUN WITHOUT CREDENTIALS VALIDATES THE NINE AND SAYS WHAT IT COULD NOT CHECK, rather than
  // exiting 2: the half it cannot do is guard 4, which needs `never_send` from the function, and a
  // silent pass over that half would be the dangerous direction.
  let neverSend = [];
  let guardChecked = true;
  const haveCreds = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
  if (!haveCreds && !dry) creds();
  if (haveCreds) {
    const { base, key } = creds();
    const r = await rest(base, key, "GET", "rpc/refusal_parked_tickets");
    if (r.ok && Array.isArray(r.json)) {
      const row = r.json.find(x => x && x.backlog_id === ticket);
      neverSend = row && Array.isArray(row.never_send) ? row.never_send : [];
    } else {
      guardChecked = false;
    }
  } else {
    guardChecked = false;
  }

  const v = validateRefusal(obj, neverSend);
  if (!guardChecked) {
    console.error("redesign-pickup --refuse: NOT CHECKED -- `never_send` was not read, so guard 4 " +
      "(an action already refused on this ticket) was not graded here. The function grades it.");
  }
  if (!v.ok) {
    const msg = v.refusals.map(r => `refused: ${r}`).join("\n");
    if (dry) die(1, msg);
    die(1, msg); // nothing is sent
  }
  if (dry) die(0, `ok -- all nine refusal facts present${guardChecked ? ", guard 4 clear" : ""}; nothing was sent (--dry-run)`);

  const cycle = cycleArg(args);
  const { base, key } = creds();
  const reason = typeof args.reason === "string" && args.reason
    ? args.reason
    : `${obj.refusal_label}: ${String(obj.refusal_text).slice(0, 200)}`;
  const r = await rest(base, key, "POST", "rpc/record_skip", {
    p_cycle_id: cycle, p_backlog_id: ticket, p_reason_kind: "permission-gate",
    p_reason: reason, p_refusal: obj,
  });
  if (!r.ok) die(1, `redesign-pickup --refuse: ${r.json?.message ?? r.text.slice(0, 600)}`);
  const skip = r.json ?? {};
  console.log(`redesign-pickup --refuse: skip ${skip.id} (${skip.reason_kind}, count ${skip.skip_count}) on ${ticket}`);

  const back = await rest(base, key, "GET",
    `runner_refusal_attempts?backlog_id=eq.${encodeURIComponent(ticket)}&select=attempt_no,kind,outcome,identical_to&order=attempt_no.desc&limit=1`);
  if (back.ok && Array.isArray(back.json) && back.json.length) {
    const a = back.json[0];
    console.log(`redesign-pickup --refuse: attempt ${a.attempt_no} (${a.kind}) outcome ${a.outcome}` +
      (a.identical_to ? ` -- PARKED on guard 4: identical_to ${a.identical_to}` : ""));
    if (a.outcome === "parked") {
      console.log("redesign-pickup --refuse: next: node scripts/redesign-pickup.js --diagnose " +
        `--ticket=${ticket} --cycle-id=${cycle} --unknowns-file=<path>`);
    }
  } else {
    console.error("redesign-pickup --refuse: NOT READ BACK -- the skip is written; the attempt row was not re-read.");
  }
  process.exitCode = 0;
}

async function diagnose(args) {
  const ticket = ticketArg(args);
  const cycle = cycleArg(args);
  const up = typeof args["unknowns-file"] === "string" ? args["unknowns-file"] : "";
  if (!up) die(2, "redesign-pickup --diagnose: --unknowns-file=<path> is required -- the diagnostic's whole product is what is still NOT known about the boundary");
  let unknowns;
  try { unknowns = fs.readFileSync(path.resolve(up), "utf8").trim(); }
  catch (e) { die(2, `redesign-pickup --diagnose: cannot read ${up}: ${e.message}`); }
  if (!unknowns) die(2, `redesign-pickup --diagnose: ${up} is empty -- a blank unknowns is not a diagnosis`);

  const { base, key } = creds();
  const r = await rest(base, key, "GET",
    `runner_refusal_attempts?backlog_id=eq.${encodeURIComponent(ticket)}&select=*&order=attempt_no`);
  if (!r.ok) die(1, `redesign-pickup --diagnose: GET runner_refusal_attempts -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
  if (!Array.isArray(r.json)) die(1, "redesign-pickup --diagnose: the attempt read came back non-array");

  const { feedback_text, refusals, labels } = assembleDiagnostic(ticket, r.json, unknowns);

  // ATTEMPTED, NEVER ASSERTED (the design's own call 5, pattern:33): `/feedback` from an unattended
  // cycle is unproven, so what came back is RECORDED as `feedback_result` and the text is printed
  // paste-ready either way. A `spawn error:` result is a result, not a failure of the diagnostic.
  let result;
  if (args["no-send"] === true) {
    result = "not sent (--no-send)";
  } else {
    const win = process.platform === "win32";
    const s = spawnSync(win ? "claude.cmd" : "claude", feedbackCliArgs(feedback_text),
      { encoding: "utf8", shell: win, timeout: 120000 });
    result = s.error ? `spawn error: ${s.error.message}` : String((s.stdout || "") + (s.stderr || "")).slice(0, 400);
  }

  const c = await rest(base, key, "POST", "rpc/close_refusal_diagnostic", {
    p_cycle_id: cycle, p_backlog_id: ticket, p_unknowns: unknowns,
    p_feedback_text: feedback_text, p_feedback_result: result,
  });
  if (!c.ok) die(1, `redesign-pickup --diagnose: ${c.json?.message ?? c.text.slice(0, 600)}`);
  const row = c.json ?? {};
  console.log(`redesign-pickup --diagnose: ${ticket} parked after ${refusals} refusal(s); labels ` +
    `${labels.join(", ") || "(none)"}; attempt ${row.attempt_no} (${row.kind}) outcome ${row.outcome}, row ${row.id}`);
  console.log(`feedback_result: ${result}`);
  console.log("paste-ready, if the CLI did not file it:\n/feedback " + feedback_text);
  console.log(`undo: delete the diagnostic row and restore the two redesign rows from their before-images (cycle ${cycle}).`);
  process.exitCode = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.next) return next(args);
  if (args.open) return open(args);
  if (args.refuse) return refuse(args);
  if (args.diagnose) return diagnose(args);
  die(2, "usage: redesign-pickup.js --next [--out=<path>]\n" +
    "       redesign-pickup.js --open --ticket=<id> --cycle-id=<uuid> --kickoff=<path>\n" +
    "       redesign-pickup.js --refuse --ticket=<id> --cycle-id=<uuid> --from=<json> [--dry-run] [--reason=<text>]\n" +
    "       redesign-pickup.js --diagnose --ticket=<id> --cycle-id=<uuid> --unknowns-file=<path> [--no-send]");
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`redesign-pickup: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
