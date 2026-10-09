#!/usr/bin/env node
// DeepBench v7.0.840 | scripts/rule-cap-case.js | AGT-449 -- a cap case reaches the Development Manager.
// Spec: docs/kickoffs/v7.0.840-AGT-449-cap-case-reaches-the-manager.md sections 4 and 5 (T2).
//
// WHY THIS EXISTS. pattern:172 (John 2026-10-09): when the file or task cap would force a split, the
// design step stops and sends a CAP CASE -- premise alive, kickoff_markdown and kickoff_path null, the
// parts in build order in harvest_markdown (AGT-448). The Development Manager rules it split or waive
// with ONE call to public.rule_capped_ticket() (AGT-445, AGT-447). Until this ship, runbook step 5a had
// the cycle make that call itself: devmanager held five capabilities and none of them took a cap case.
// This file is the Manager's door, the same shape as decide-gated-card.js (Section 19b: one assembly
// path, the prompt is assembled by assemblePrompt() and rendered by renderAssembly(), never here).
//
// THREE DOORS, ONE VALIDATOR:
//   --prepare --case=<design answer.json> [--out=<path>]
//       refuses anything that is not a cap case (exit 1); reads the ticket the case names; assembles
//       the Manager's rule-cap-case prompt with task_context {ticket, cap_case: harvest_markdown};
//       prints the paste-ready agent-log.js line on stderr. Exit 3 = awaiting the Manager's answer.
//   --apply=<answer.json> --case=<case.json> --dry-run
//       runs validateRuling() over the answer and prints ok or every refusal. No network.
//   --apply=<answer.json> --case=<case.json> --cycle-id=<uuid>
//       runs the SAME validateRuling() first (a refusal exits 1 and sends nothing), then POSTs
//       rpc/rule_capped_ticket. THE FUNCTION OWNS EVERY WRITE and its one decision; this file writes
//       no table. A split the function refuses with its own `rule_capped_ticket: ` word (HTTP 400) is
//       re-sent ONCE as a waive whose reason carries the refusal -- a refused split is a waive
//       (pattern:172; the Designer's reversible call recorded in the kickoff's STOP LINE). Prints the
//       ruling, the next action and the undo line.
//
// EXIT CODES: 0 ok; 1 refused / request failed; 2 could not run (missing credentials or arguments --
// never a pass); 3 the prompt is printed and the answer is awaited.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { assemblePrompt } from "../api/prompt/db-assembly.js";
import { renderAssembly, resolveJudgmentModel } from "./agent-prompt.js";

// --- pure half (imported by tests/regression/agt-448-cap-split-guard.test.mjs arm D; no network) --

export const AGENT = "devmanager";
export const CAPABILITY = "rule-cap-case";
export const TENANT = "global";
export const RULINGS = Object.freeze(["split", "waive"]);

const blank = v => String(v ?? "").trim() === "";

/** A cap case: premise alive, no kickoff (markdown or path), the parts in harvest_markdown. */
export function isCapCase(c) {
  return Boolean(c) && typeof c === "object" && c.premise === "alive" &&
    blank(c.kickoff_markdown) && blank(c.kickoff_path) && !blank(c.harvest_markdown);
}

/**
 * Mirrors public.rule_capped_ticket()'s offline rules, collecting EVERY refusal: the ruling, the
 * reason, a waive's empty parts, a split's two-or-more distinct parts none of which is the ticket.
 * The rules it cannot see offline (the ticket's status and need_score, each part's status and epic)
 * stay the function's.
 */
export function validateRuling(answer, ticket) {
  const refusals = [];
  const a = answer && typeof answer === "object" ? answer : {};
  const parts = a.parts;
  if (!RULINGS.includes(a.ruling)) refusals.push(`ruling ${a.ruling ?? "<NULL>"} is not one of ${RULINGS.join(", ")}`);
  if (blank(a.reason)) refusals.push("a cap ruling needs a reason");
  if (!Array.isArray(parts)) refusals.push("parts must be an array");
  if (!Array.isArray(a.patterns_applied) || a.patterns_applied.some(n => !Number.isInteger(n) || n < 1)) {
    refusals.push("patterns_applied must be an array of pattern numbers (1 or more)");
  }
  if (Array.isArray(parts)) {
    if (a.ruling === "waive" && parts.length > 0) refusals.push(`waive takes no parts; got ${parts.join(", ")}`);
    if (a.ruling === "split") {
      if (parts.length < 2) refusals.push("a split names at least two parts");
      if (parts.some(blank)) refusals.push("a split part is blank");
      if (new Set(parts).size !== parts.length) refusals.push("a split names a part twice");
      if (parts.includes(ticket)) refusals.push(`a split never names the ticket ${ticket} as its own part`);
    }
  }
  return { ok: refusals.length === 0, refusals };
}

/** The one line that says what the cycle does next, from the function's answer. */
export function nextAction(res) {
  if (res && res.ruling === "waive") return `next: re-assemble design-kickoff with "cap_waived":"${res.decision_id}"`;
  return `next: build ${res.parts[0]} (drain ${res.directive_id})`;
}

/** The waive reason a refused split is re-sent with. */
export function refusedSplitReason(why, message) {
  return `split refused (${message}); a refused split is a waive (pattern:172): ${why}`;
}

// --- CLI -----------------------------------------------------------------------------------------

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
  if (typeof p !== "string" || !p) die(2, `rule-cap-case: ${what} path missing`);
  try { return JSON.parse(fs.readFileSync(path.resolve(p), "utf8")); }
  catch (e) { die(2, `rule-cap-case: cannot read ${what} ${p}: ${e.message}`); }
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    die(2, "rule-cap-case: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
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

function readCase(args) {
  const c = readJson(args.case, "case");
  if (!isCapCase(c)) {
    die(1, "rule-cap-case: refused: not a cap case -- it needs premise alive, kickoff_markdown and kickoff_path null, and the parts in harvest_markdown");
  }
  if (blank(c.backlog_id)) die(1, "rule-cap-case: refused: the cap case names no backlog_id");
  return c;
}

async function prepare(args) {
  const c = readCase(args);
  const { base, key } = creds();
  const get = async q => {
    const r = await rest(base, key, "GET", q);
    if (!r.ok) die(1, `rule-cap-case: GET ${q} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  };
  const rows = await get(`backlog_items?backlog_id=eq.${encodeURIComponent(c.backlog_id)}&select=backlog_id,title,description,status,priority_class,need_score,epic_id`);
  if (!Array.isArray(rows) || rows.length !== 1) die(1, `rule-cap-case: no backlog_items row reads backlog_id ${c.backlog_id}`);
  const task_context = { ticket: rows[0], cap_case: c.harvest_markdown };

  const caps = await get(`capabilities?slug=eq.${CAPABILITY}&tenant_id=eq.${TENANT}&select=default_intent_slug&limit=1`);
  const intentSlug = caps[0]?.default_intent_slug;
  if (!intentSlug) die(1, `rule-cap-case: capability "${CAPABILITY}" has no capabilities row or no default_intent_slug`);

  let assembly;
  try {
    assembly = await assemblePrompt({
      capability_slug: CAPABILITY, agent_id: AGENT, tenant_id: TENANT, task_context,
      intent_slug: intentSlug,
    });
  } catch (e) { die(1, `rule-cap-case: ${e.message}`); }
  if (!assembly.agent_card) die(1, `rule-cap-case: no agents row for ${AGENT}`);

  const lane = await resolveJudgmentModel(assembly, {
    supabaseUrl: base, headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (lane.warning) console.error(`rule-cap-case: ${lane.warning}`);
  if (assembly.llm) { assembly.llm.model = lane.model; assembly.llm.lane_note = lane.reason; }

  const { system_prompt, omitted } = renderAssembly(assembly);
  if (!system_prompt) die(1, `rule-cap-case: capability "${CAPABILITY}" assembled zero renderable sections`);
  const header = `# ${assembly.agent_card.name} — ${assembly.agent_card.role} · capability ${assembly.capability_slug} · model ${assembly.llm?.model}`;
  const laneLine = lane.from ? `\n# lane: judgment degraded to ${lane.model} (${lane.reason})` : "";
  const text = `${header}${laneLine}\n${system_prompt}\n`;

  if (typeof args.out === "string" && args.out) fs.writeFileSync(path.resolve(args.out), text, "utf8");
  else process.stdout.write(text);
  if (omitted.length) console.error(`rule-cap-case: sections omitted (no stored content): ${omitted.join(", ")}`);
  console.error("rule-cap-case: after the Manager's turn, log it (mandatory Layer-3 row):\n" +
    `  node scripts/agent-log.js --agent=${AGENT} --capability=${CAPABILITY} --model=${assembly.llm?.model} ` +
    `--ai-type=${CAPABILITY} --feature=${CAPABILITY}:${intentSlug}:depth1 --cycle=<runner_cycles.id> --patterns-applied=<csv>`);
  die(3, `rule-cap-case --prepare: cap case on ${c.backlog_id} -- prompt assembled (${Buffer.byteLength(text, "utf8")} bytes); exit 3 = awaiting the Manager's answer, then --apply --dry-run and --apply`);
}

async function apply(args) {
  const answer = readJson(args.apply, "answer");
  const c = readCase(args);
  const ticket = String(c.backlog_id);
  const v = validateRuling(answer, ticket);
  if (!v.ok) die(1, v.refusals.map(r => `refused: ${r}`).join("\n")); // nothing is sent
  if (args["dry-run"]) die(0, "ok");

  const cycle = typeof args["cycle-id"] === "string" ? args["cycle-id"] : "";
  if (!cycle) die(2, "rule-cap-case --apply: --cycle-id=<uuid> is required -- a ruling has exactly one author");
  const { base, key } = creds();
  const send = (ruling, reason, parts) => rest(base, key, "POST", "rpc/rule_capped_ticket", {
    p_backlog_id: ticket, p_ruling: ruling, p_reason: reason,
    p_parts: ruling === "split" ? parts : null, p_cycle_id: cycle, p_session_name: null,
  });

  let r = await send(answer.ruling, answer.reason, answer.parts);
  if (!r.ok && answer.ruling === "split" && r.status === 400 && r.text.includes("rule_capped_ticket: ")) {
    const message = r.json?.message ?? r.text;
    const reason = refusedSplitReason(answer.reason, message);
    console.log(`split refused (${message}); re-sending once as waive`);
    r = await send("waive", reason, null);
  }
  if (!r.ok) die(1, `rule-cap-case --apply: HTTP ${r.status} ${r.text}`);
  const res = r.json ?? {};
  console.log(`ruling ${res.ruling} decision ${res.decision_id}`);
  console.log(nextAction(res));
  console.log(`undo: select public.reverse_decision('${res.decision_id}','John','<why>',NULL);`);
  process.exitCode = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.prepare) return prepare(args);
  if (args.apply) return apply(args);
  die(2, "usage: rule-cap-case.js --prepare --case=<design answer.json> [--out=<path>] | --apply=<answer.json> --case=<case.json> (--dry-run | --cycle-id=<uuid>)");
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`rule-cap-case: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
