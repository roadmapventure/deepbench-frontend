#!/usr/bin/env node
// DeepBench v7.0.740 | scripts/requirement-check.js | AGT-280 slice 2 -- Victoria rules whether one
// proposed ticket's cited need source SUPPORTS it, as a client of public.apply_requirement_verdict().
// Spec: docs/kickoffs/v7.0.740-AGT-280-requirement-check-caller.md sections 4 and 5.
//
// WHY THIS EXISTS -- A GATE WITH NO DOOR. Slice 1 (v7.0.729) shipped the whole database half:
// `backlog_items.need_source` / `need_score`, `runner_settings.need_source_kinds`,
// `need_source_is_traceable()`, `apply_requirement_verdict()` and the `requirement_gate` trigger
// that RAISES `check_violation` on an untraceable row into an `executing` project's epic. Measured
// live 2026-09-29 on the unchanged tree: `need_source_is_traceable(NULL)` is false,
// `runner_decisions where kind='requirement-check'` is 0, `need_score is not null` is 0, and a grep
// of `scripts/ shared/ lib/ api/ src/` for `requirement-check|apply_requirement_verdict` hit only
// slice 1's test and docs. So every `discovered` filing into a running project's list was being
// refused with NOTHING in the repo able to satisfy the gate -- 16 such filings in 14 days. This file
// is the door: the one client that reads the cited row, puts it to Victoria, and hands her answer to
// the function that owns the write.
//
// THREE DOORS, ONE VALIDATOR -- the scripts/decide-gated-card.js shape, deliberately:
//   --prepare --ticket=<ID> --source=<who:table:id> [--out=<path>] [--json]
//       reads the ticket, the `who:table` allowlist, and -- only if the citation is TRACEABLE -- the
//       cited row itself, then assembles her prompt through the SAME assemblePrompt() the executor
//       calls and renders it with agent-prompt.js's renderAssembly(). THIS FILE BUILDS NO PROMPT
//       TEXT (§19b, one assembly path). `--intent` is never a flag here: the intent comes off
//       `capabilities.default_intent_slug`, which is the row's own answer. Exit 3 -- awaiting her
//       answer.
//   --dry-run=<answer.json> --context=<prepare.json>
//       runs validateVerdict() and prints ok or every refusal. No network at all.
//   --apply=<answer.json> --context=<prepare.json> (--cycle-id=<uuid> | --session-name=<name>)
//       runs the SAME validateVerdict() FIRST -- a refusal exits 1 and sends nothing -- then POSTs
//       rpc/apply_requirement_verdict ONCE. THE FUNCTION OWNS THE WRITE, its before-image and its
//       one decision; this file writes no table itself.
//
// EXISTENCE IS CHECKED BEFORE THE MODEL, NOT BY IT (pattern:9, pattern:10). Whether the cited row is
// there is a lookup, so `--prepare` asks `need_source_is_traceable()` BEFORE it assembles anything:
// an untraceable claim costs zero tokens. Her question is only whether what the row SAYS supports
// what the proposal asks to build -- which is why the row's own words travel in the task context
// rather than a summary of them, and why `embedding` is deleted from it (a 1536-float vector is
// bytes she cannot read).
//
// SHE ECHOES A SOURCE, SHE NEVER INVENTS ONE. validateVerdict() refuses a `pass` whose `need_source`
// is not BYTE-EQUAL to the `--source` the prepare context carries. The function would also refuse an
// untraceable one, but it would happily write a DIFFERENT traceable citation than the one the ticket
// was screened against -- so the equality is this file's to hold, and it holds it offline.
//
// THE TWO HANDLES ARE NOT THE SAME KIND OF THING. A `pass` returns a `runner_decisions` id, which is
// reversible -- its `reverse_decision()` line is printed with the expiry. A `not-needed` returns an
// `audit_findings` id: no ticket row was written, `audit_findings` is append-only (AGT-70) and is not
// in `reversible_tables()`, so printing a reverse line for it would hand the reader a promise
// nothing can keep (pattern:169). It gets the findings-board handle and no undo line.
//
// EXIT CODES: 0 ok; 1 refused / request failed; 2 could not run (missing credentials or arguments --
// never a pass); 3 the prompt is printed and her answer is awaited.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { assemblePrompt } from "../api/prompt/db-assembly.js";
import { renderAssembly, resolveJudgmentModel } from "./agent-prompt.js";

// --- pure half (imported by tests/regression/agt-280-requirement-check.test.mjs; no network) ------

export const AGENT = "victoria";
export const CAPABILITY = "requirement-check";
export const TENANT = "global";

// The verdict vocabulary public.apply_requirement_verdict() enforces, in the function's own order.
export const VERDICTS = Object.freeze(["pass", "not-needed"]);

// The three keys every verdict carries, whichever way it goes -- `vc-requirement-intent`'s schema
// marks all seven required, and a `pass` still names the proposal it passed.
export const REQUIRED_TEXT = Object.freeze(["reason", "account", "proposal"]);

export const AWAITING_ANSWER =
  "prompt assembled and printed; exit 3 = awaiting Victoria's answer, then --dry-run and --apply";

const blank = v => String(v ?? "").trim() === "";

// A need source is the text `who:table:id`. Split on the FIRST two colons only: an id may itself
// contain a colon, and re-joining a split id would quietly change the citation.
export function parseSource(source) {
  const s = String(source ?? "");
  const a = s.indexOf(":");
  const b = a === -1 ? -1 : s.indexOf(":", a + 1);
  if (a <= 0 || b <= a + 1 || b === s.length - 1) return null;
  return { who: s.slice(0, a), table: s.slice(a + 1, b), id: s.slice(b + 1), pair: s.slice(0, b) };
}

// Victoria's task_context. The cited row travels as ITS OWN COLUMNS (minus `embedding`) -- her
// objective is to read what it says, so a summary of it would be this file judging the source.
export function buildTaskContext({ ticket, source, source_row, kinds }) {
  const t = Object(ticket) === ticket ? ticket : {};
  return {
    proposal: {
      backlog_id: t.backlog_id ?? null,
      title: t.title ?? null,
      description: t.description ?? null,
      status: t.status ?? null,
      tier: t.tier ?? null,
      type: t.type ?? null,
      priority_class: t.priority_class ?? null,
      scope_origin: t.scope_origin ?? null,
      scope_rationale: t.scope_rationale ?? null,
      enhancement_claim: t.enhancement_claim ?? null,
      epic_id: t.epic_id ?? null,
      need_source: t.need_source ?? null,
      need_score: t.need_score ?? null,
    },
    need_source: source ?? null,
    need_source_row: Object(source_row) === source_row ? source_row : null,
    need_source_kinds: Array.isArray(kinds) ? [...kinds] : [],
  };
}

// The prepare context, whether it came from `--json` (wrapped) or from a hand-written task_context.
export function contextBody(ctx) {
  if (Object(ctx) !== ctx) return {};
  if (Object(ctx.context) === ctx.context && ctx.context !== null) return ctx.context;
  return ctx;
}

// Mirrors apply_requirement_verdict()'s validation and adds the one rule the function CANNOT see --
// that the `need_source` she answered is the one she was handed -- and collects EVERY refusal rather
// than stopping at the first, so a dry-run shows her the whole list. Every refusal NAMES THE TICKET:
// this runs one ticket at a time, and a refusal that does not say which one is a refusal a reader
// has to go and look up.
export function validateVerdict(answer, ctx) {
  const refusals = [];
  const body = contextBody(ctx);
  const wantId = body.proposal && !blank(body.proposal.backlog_id) ? String(body.proposal.backlog_id) : null;
  const wantSource = blank(body.need_source) ? null : String(body.need_source);
  const a = Object(answer) === answer && answer !== null ? answer : {};
  const label = wantId ?? (blank(a.backlog_id) ? "<NULL>" : String(a.backlog_id));
  const no = msg => refusals.push(`${label}: ${msg}`);

  if (!VERDICTS.includes(a.verdict)) {
    no(`verdict ${blank(a.verdict) ? "<NULL>" : String(a.verdict)} is not one of ${VERDICTS.join(", ")}`);
  }
  if (blank(a.backlog_id)) no("the verdict names no backlog_id");
  else if (wantId !== null && String(a.backlog_id) !== wantId) {
    no(`the verdict names backlog_id ${String(a.backlog_id)}, which is not the one it was handed`);
  }
  for (const k of REQUIRED_TEXT) if (blank(a[k])) no(`the verdict needs a ${k}`);

  if (a.verdict === "pass") {
    // SHE ECHOES, NEVER INVENTS. Byte-equality against the --source the prepare read, not a
    // re-parse of it: a citation that differs by one character names a different row.
    if (wantSource === null) no("the context carries no need_source to check the pass against");
    else if (String(a.need_source ?? "") !== wantSource) {
      no(`a pass must echo the need_source it was handed (${wantSource}) unchanged; got ` +
        `${a.need_source === undefined || a.need_source === null ? "<NULL>" : JSON.stringify(String(a.need_source))}`);
    }
    const score = a.need_score;
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      no(`need_score must be a whole number 1-5; got ${score === undefined ? "<NULL>" : JSON.stringify(score)}`);
    }
  }
  return { ok: refusals.length === 0, refusals };
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
  if (typeof p !== "string" || !p) die(2, `requirement-check: ${what} path missing`);
  try { return JSON.parse(fs.readFileSync(path.resolve(p), "utf8")); }
  catch (e) { die(2, `requirement-check: cannot read ${what} ${p}: ${e.message}`); }
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    die(2, "requirement-check: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
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

async function prepare(args) {
  const ticketId = typeof args.ticket === "string" ? args.ticket : "";
  const source = typeof args.source === "string" ? args.source : "";
  if (!ticketId || !source) {
    die(2, "requirement-check --prepare: --ticket=<ID> and --source=<who:table:id> are both required");
  }
  const { base, key } = creds();
  const get = async q => {
    const r = await rest(base, key, "GET", q);
    if (!r.ok) die(1, `requirement-check: GET ${q} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  };

  // 1. The ticket. One named ticket against one named claim (the Designer's call (c)) -- never a
  //    browse of the board, so a missing row is a refusal and not an empty run.
  const tickets = await get(`backlog_items?backlog_id=eq.${encodeURIComponent(ticketId)}&select=*&limit=1`);
  const ticket = Array.isArray(tickets) ? tickets[0] : null;
  if (!ticket) die(1, `requirement-check: no backlog_items row reads backlog_id ${ticketId}`);

  // 2. The allowlist, which is DATA John edits with an UPDATE (pattern:2). The `who:table` prefix is
  //    checked here so an unlisted pair is named in this file's own words before the round trip.
  const settings = await get("runner_settings?id=eq.1&select=need_source_kinds");
  const kinds = Array.isArray(settings) && Array.isArray(settings[0]?.need_source_kinds)
    ? settings[0].need_source_kinds : [];
  if (kinds.length === 0) die(1, "requirement-check: runner_settings.need_source_kinds is empty — nothing may be cited");
  const parsed = parseSource(source);
  if (!parsed) die(1, `requirement-check: --source ${JSON.stringify(source)} is not the text who:table:id`);
  if (!kinds.includes(parsed.pair)) {
    die(1, `requirement-check: ${parsed.pair} is not one of runner_settings.need_source_kinds ` +
      `(${kinds.join(", ")}) — ${ticketId} cites a source the platform does not recognise`);
  }

  // 3. EXISTENCE BEFORE THE MODEL. The function that the gate itself calls answers this, so the
  //    caller and the trigger cannot disagree about what is traceable. False here = no turn, no cost.
  const tr = await rest(base, key, "POST", "rpc/need_source_is_traceable", { p_source: source });
  if (!tr.ok) die(1, `requirement-check: rpc/need_source_is_traceable -> HTTP ${tr.status} ${tr.text.slice(0, 400)}`);
  if (tr.json !== true) {
    die(1, `requirement-check: ${source} cites no row that exists — ${ticketId} waits on the intake ` +
      "list and no model turn is spent on it (AGT-280 §4)");
  }

  // 4. The cited row's OWN WORDS. `embedding` is deleted: it is a vector, not something she reads.
  const rows = await get(`${parsed.table}?id=eq.${encodeURIComponent(parsed.id)}&select=*&limit=1`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) {
    die(1, `requirement-check: ${parsed.table} row ${parsed.id} did not read back, though ` +
      "need_source_is_traceable() called it traceable");
  }
  delete row.embedding;

  const task_context = buildTaskContext({ ticket, source, source_row: row, kinds });

  const caps = await get(`capabilities?slug=eq.${CAPABILITY}&tenant_id=eq.${TENANT}&select=default_intent_slug&limit=1`);
  const intentSlug = caps[0]?.default_intent_slug;
  if (!intentSlug) die(1, `requirement-check: capability "${CAPABILITY}" has no capabilities row or no default_intent_slug`);

  let assembly;
  try {
    assembly = await assemblePrompt({
      capability_slug: CAPABILITY, agent_id: AGENT, tenant_id: TENANT, task_context,
      intent_slug: intentSlug,
    });
  } catch (e) { die(1, `requirement-check: ${e.message}`); }
  if (!assembly.agent_card) die(1, `requirement-check: no agents row for ${AGENT}`);

  const lane = await resolveJudgmentModel(assembly, {
    supabaseUrl: base, headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (lane.warning) console.error(`requirement-check: ${lane.warning}`);
  if (assembly.llm) { assembly.llm.model = lane.model; assembly.llm.lane_note = lane.reason; }

  const { system_prompt, omitted } = renderAssembly(assembly);
  if (!system_prompt) die(1, `requirement-check: capability "${CAPABILITY}" assembled zero renderable sections`);
  const header = `# ${assembly.agent_card.name} — ${assembly.agent_card.role} · capability ${assembly.capability_slug} · model ${assembly.llm?.model}`;
  const laneLine = lane.from ? `\n# lane: judgment degraded to ${lane.model} (${lane.reason})` : "";
  const text = `${header}${laneLine}\n${system_prompt}\n`;

  if (typeof args.out === "string" && args.out) fs.writeFileSync(path.resolve(args.out), text, "utf8");
  if (args.json) {
    process.stdout.write(`${JSON.stringify({
      ticket: ticketId, source, model: assembly.llm?.model,
      prompt_bytes: Buffer.byteLength(text, "utf8"), context: task_context,
    }, null, 2)}\n`);
  } else if (!args.out) {
    process.stdout.write(text);
  }
  if (omitted.length) console.error(`requirement-check: sections omitted (no stored content): ${omitted.join(", ")}`);
  die(3, `requirement-check --prepare: ${ticketId} cites ${source} — ${AWAITING_ANSWER}`);
}

function refuse(refusals) {
  die(1, refusals.map(r => `refused: ${r}`).join("\n"));
}

function dryRun(args) {
  const answer = readJson(args["dry-run"], "answer");
  const ctx = readJson(args.context, "context");
  const v = validateVerdict(answer, ctx);
  if (!v.ok) refuse(v.refusals);
  die(0, "ok");
}

function chicago(ts) {
  if (!ts) return "(no expiry recorded)";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(ts));
}

async function apply(args) {
  const hasCycle = typeof args["cycle-id"] === "string" && args["cycle-id"] !== "";
  const hasSession = typeof args["session-name"] === "string" && args["session-name"] !== "";
  if (hasCycle === hasSession) die(2, "requirement-check --apply: exactly one of --cycle-id=<uuid> / --session-name=<name>");
  const answer = readJson(args.apply, "answer");
  const ctx = readJson(args.context, "context");
  const v = validateVerdict(answer, ctx);
  if (!v.ok) refuse(v.refusals); // nothing is sent

  const { base, key } = creds();
  const r = await rest(base, key, "POST", "rpc/apply_requirement_verdict", {
    p_cycle: hasCycle ? args["cycle-id"] : null,
    p_session: hasSession ? args["session-name"] : null,
    p: answer,
  });
  if (!r.ok) die(1, `requirement-check --apply: HTTP ${r.status} ${r.text}`);
  const handle = typeof r.json === "string" ? r.json : r.json?.id ?? null;
  if (!handle) die(1, `requirement-check --apply: the writer returned no handle; got ${r.text.slice(0, 300)}`);

  if (answer.verdict === "pass") {
    const d = await rest(base, key, "GET", `runner_decisions?id=eq.${handle}&select=expires_at`);
    const expires = d.ok && Array.isArray(d.json) && d.json[0] ? d.json[0].expires_at : null;
    console.log(`${answer.backlog_id}: pass — need_source ${answer.need_source}, need_score ${answer.need_score}`);
    console.log(`Decision ${handle} — reversible until ${chicago(expires)}: select * from public.reverse_decision('${handle}', 'John', '<why>');`);
  } else {
    // A findings id, not a decision: nothing on the ticket moved, so there is nothing to put back.
    console.log(`${answer.backlog_id}: not-needed — no ticket row written; the proposal is listed on the findings board.`);
    console.log(`audit_findings ${handle} (status listed, ruled_by victoria) — not a decision, so no reverse_decision line: audit_findings is append-only (AGT-70) and outside reversible_tables().`);
  }
  process.exitCode = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.prepare) return prepare(args);
  if (args["dry-run"]) return dryRun(args);
  if (args.apply) return apply(args);
  die(2, "usage: requirement-check.js --prepare --ticket=<ID> --source=<who:table:id> [--out=<path>] [--json] | --dry-run=<answer.json> --context=<prepare.json> | --apply=<answer.json> --context=<prepare.json> (--cycle-id=<uuid> | --session-name=<name>)");
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`requirement-check: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
