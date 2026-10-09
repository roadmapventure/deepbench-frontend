#!/usr/bin/env node
// DeepBench v7.0.828 | scripts/requirement-check.js | AGT-432 -- John's rulings are candidates, a john: need_source is never replaced, the block is John's VICTORIA-PRIORITIZE prompt (directive 0078af4d).
// DeepBench v7.0.743 | scripts/requirement-check.js | AGT-309 -- `--prepare` gains `--home=<slug>`,
// the destination the manager's review routed this ticket to. The slug is checked HERE, before any
// model turn, against `projects` (`status = 'executing'` AND `accepts_findings` -- AGT-240's own
// condition, so a locked list that does not accept findings is refused by this file instead of by a
// trigger after the spend), and it travels in the task_context so `--apply` can hand it to the one
// writer as `p.home_project`. A `pass` then MOVES the ticket (the function's own UPDATE, both BEFORE
// triggers firing) and prints `Homed: <id> -> <slug>`; a `not-needed` sends no home at all, because
// nothing on the ticket moved. This file still writes no table.
//
// DeepBench v7.0.741 | scripts/requirement-check.js | AGT-281 -- THE LIST DOORS. The two doors below
// rule ONE ticket against ONE named citation, which is the right grain for a filing as it happens
// and the wrong grain for the work Victoria is actually waiting on: measured live 2026-10-02,
// `need_source` is NULL on all 84 open/partial tickets of `dev-mgr-findings` (77) and
// `auditor-findings` (7), her `ai_activity_log` rows are 0 and `runner_cycles notes like
// 'SCHEDULED-AGENT: victoria%'` is 0. One turn per ticket is 84 turns. `--prepare-list` and
// `--apply-list` are the list grain: ONE turn per list, on the sibling Intent `vc-reorganize-intent`
// (migration `agt281_reorganize_intent`, mirror docs/design/agt-281-reorganize-intent.sql), through
// the SAME assemblePrompt() the single-ticket door uses -- the intent is a MODE CONSTANT here, never
// a flag (§19b).
//
// WHAT THE LIST TURN IS GIVEN, and what it is deliberately NOT given (the Designer's calls (b) and
// (d)): every open/partial ticket of the named project's epics with its `description` cut at
// DESC_CHARS, and the candidate need sources as `{key, head}` -- the first HEAD_CHARS characters of
// each row, never the whole row, because a list turn over 277 candidate rows is a budget question
// before it is a judgment one.
// John's rulings (kind john-ruling) ARE candidates since AGT-432: a ruling is a need he stated.
//
// WHAT AN ANSWER CAN DO, AND THE TWO WRITERS IT REACHES. `validateListVerdict()` runs FIRST and
// offline, and it holds the three rules neither writer can see: every ticket of the list is ruled
// EXACTLY ONCE, no row rules a ticket the list did not carry, and a `pass` names one of the
// candidate keys it was handed (never a key it composed). A refusal exits 1 and sends NOTHING. Then
// a `pass` goes to `apply_requirement_verdict()` exactly as the single-ticket door sends one, and a
// `not-needed` takes `scripts/ticket-owner.js` step 3b -- its own `removal-proposal` decision, a
// FULL-row before-image under that decision, then `status = 'removal proposed'`. `removed` is never
// written here (SES-113): the row lands in John's waiting room and stops being in the drain, and one
// Reverse puts it back. The run's one record is a `runner_cycles` row whose `notes` is runLine().
//
// A HELD LIST IS REFUSED AT THE DOOR. `builder-found-tickets` is in HELD_LISTS, so
// `--prepare-list --project=builder-found-tickets` exits 1 before any read: a list the platform is
// still arguing about is not a list to reorganize on a schedule.
//
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
//   --prepare --ticket=<ID> --source=<who:table:id> [--home=<slug>] [--out=<path>] [--json]
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
// AGT-281: the decision kind a turned-down proposal is recorded under, imported rather than retyped
// -- `scripts/ticket-owner.js` step 3b is the home of this path and the two files must not be able
// to disagree about the kind John reverses a night by.
import { PROPOSAL_KIND } from "./ticket-owner.js";

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
export function buildTaskContext({ ticket, source, source_row, kinds, home }) {
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
    // AGT-309: the destination the manager's review routed this ticket to, already checked against
    // `projects` by prepare(). NULL when `--home` was not given, and NULL is the ordinary case -- a
    // ticket that is only being SCORED is not being moved, and `--apply` sends no home for it.
    home: blank(home) ? null : String(home),
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

// --- the list half, AGT-281 (also pure; same test file imports it) -------------------------------

// The sibling Intent the list turn fires. A MODE CONSTANT, not a flag (§19b, kickoff §3): the single
// -ticket door takes its intent off `capabilities.default_intent_slug` because that column is the
// row's own answer to "what does this capability do by default", and a second mode must not be able
// to change that answer for everyone else.
export const LIST_INTENT = "vc-reorganize-intent";

// The run's signature in `runner_cycles.notes`. A PREFIX, for the same reason ticket-owner's
// NIGHTLY_PREFIX is one: the brief finds the run by `notes like '<prefix>%'`, never by a column.
export const LIST_PREFIX = "SCHEDULED-AGENT: victoria-reorg";

// Lists this door refuses outright. `builder-found-tickets` is John's open question, not a list to
// reorganize unattended.
export const HELD_LISTS = Object.freeze(["builder-found-tickets"]);

// A candidate travels as a HEAD, never a body (the Designer's call (b)).
export const HEAD_CHARS = 200;
// A proposal's own description is cut here (the Designer's call (d)).
export const DESC_CHARS = 1500;
// The schema's own ceiling on a row's `reason` (`vc-reorganize-intent`, traits.schema).
export const LIST_REASON_CHARS = 400;
// How many passes runLine() names.
export const TOP_N = 3;

// WHICH `who:table` PAIRS BECOME CANDIDATES, AND WHAT OF EACH ROW IS READ. The pairs themselves are
// DATA (`runner_settings.need_source_kinds`, pattern:2) -- this map only says which column of each
// table is the head, which is a fact about the table's shape and not a content judgment. A pair the
// allowlist names and this map does not is a REFUSAL, never a silent omission: a candidate source
// the list turn cannot see would read to her as a source that does not exist.
export const CANDIDATE_HEAD = Object.freeze({
  runner_directives: "body",
  napkin_ideas: "text",
  market_records: "title",
  knowledge_entries: "title",
  runner_decisions: "summary",
});

// WHICH ROWS OF A CANDIDATE TABLE ARE CANDIDATES AT ALL (AGT-432). `runner_decisions` holds 2,500
// rows and only the `john-ruling` ones that stand are John's own words -- the rest are the agents'
// records of calls already made. Like the head column above, this is a fact about which rows ARE
// John's rulings, not a content judgment; the allowlisted pairs themselves stay DATA (pattern:2).
export const CANDIDATE_FILTER = Object.freeze({
  runner_decisions: "kind=eq.john-ruling&reversed_at=is.null",
});

// EMPTY since AGT-432 (directive 0078af4d): John's rulings were the one excluded pair and they are
// candidates now, narrowed to his own rulings by CANDIDATE_FILTER rather than shut out. The export
// and the skip below stay, so a pair that must be excluded later is one line here.
export const EXCLUDED_KINDS = Object.freeze([]);

// The status a turned-down proposal lands on. ticket-owner.js:294's own value, which is NOT exported
// there; `tests/regression/agt-281-victoria-runs.test.mjs` asserts that file still reads this exact
// string, so a rename at its home fails this suite rather than drifting silently.
export const PROPOSED_STATUS = "removal proposed";

export const AWAITING_LIST_ANSWER =
  "prompt assembled and printed; exit 3 = awaiting Victoria's one answer for the whole list, then --apply-list";

const cut = (v, n) => (v === null || v === undefined ? null : String(v).slice(0, n));

// The list task_context. The tickets' own columns and the candidates' own keys -- this file judges
// nothing about either, it only decides how much of each travels.
export function buildListContext({ project, epics, tickets, candidates, kinds }) {
  return {
    list: project ?? null,
    epics: Array.isArray(epics) ? [...epics] : [],
    proposals: (Array.isArray(tickets) ? tickets : []).map(t => ({
      backlog_id: t.backlog_id ?? null,
      title: t.title ?? null,
      description: cut(t.description, DESC_CHARS),
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
    })),
    candidates: (Array.isArray(candidates) ? candidates : []).map(c => ({
      key: c.key ?? null, head: c.head ?? null,
    })),
    need_source_kinds: Array.isArray(kinds) ? [...kinds] : [],
  };
}

// The three rules NEITHER WRITER CAN SEE, held offline and collected whole rather than stopped at the
// first: every ticket of the list ruled EXACTLY ONCE (a list half-answered is a list re-answered),
// no row ruling a ticket the list did not carry, and a `pass` naming one of the candidate keys it was
// handed. Every refusal NAMES ITS TICKET where there is one to name, and the list otherwise -- a
// refusal a reader has to go and look up is a refusal that costs another turn.
export function validateListVerdict(answer, ctx) {
  const refusals = [];
  const body = contextBody(ctx);
  const list = blank(body.list) ? null : String(body.list);
  const label = list ?? "<the list>";
  const no = (who, msg) => refusals.push(`${who}: ${msg}`);

  const want = new Map();
  for (const p of Array.isArray(body.proposals) ? body.proposals : []) {
    if (p && !blank(p.backlog_id)) want.set(String(p.backlog_id), p);
  }
  const keys = new Set((Array.isArray(body.candidates) ? body.candidates : [])
    .map(c => String(c?.key ?? "")).filter(k => k !== ""));

  const a = Object(answer) === answer && answer !== null ? answer : {};
  if (blank(a.list)) no(label, "the answer names no list");
  else if (list !== null && String(a.list) !== list) {
    no(label, `the answer names list ${String(a.list)}, which is not the one it was handed (${list})`);
  }
  if (blank(a.account)) no(label, "the answer needs an account");
  if (want.size === 0) no(label, "the context carries no proposals to rule on");
  if (!Array.isArray(a.rows)) {
    no(label, "the answer carries no rows array — one row per ticket is the whole output contract");
    return { ok: false, refusals };
  }

  const seen = new Map();
  for (const r of a.rows) {
    const row = Object(r) === r && r !== null ? r : {};
    if (blank(row.backlog_id)) { no(label, "a row names no backlog_id"); continue; }
    const id = String(row.backlog_id);
    seen.set(id, (seen.get(id) ?? 0) + 1);
    if (!want.has(id)) {
      no(id, "is not a ticket of this list — a row may only rule the tickets it was handed");
      continue;
    }
    if (!VERDICTS.includes(row.verdict)) {
      no(id, `verdict ${blank(row.verdict) ? "<NULL>" : String(row.verdict)} is not one of ${VERDICTS.join(", ")}`);
    }
    if (blank(row.reason)) no(id, "the verdict needs a reason");
    else if (String(row.reason).length > LIST_REASON_CHARS) {
      no(id, `the reason is ${String(row.reason).length} characters; the schema allows ${LIST_REASON_CHARS}`);
    }
    if (row.verdict === "pass") {
      // SHE CHOOSES FROM THE LIST, SHE NEVER COMPOSES A KEY. The single-ticket door checks byte
      // equality against the one source it handed over; here the same rule is membership of the
      // candidate set, which is the same rule over a set of one or many.
      const src = blank(row.need_source) ? null : String(row.need_source);
      if (src === null) no(id, "a pass names no need_source");
      else if (!keys.has(src)) {
        no(id, `a pass must name one of the ${keys.size} candidate source(s) it was handed; ` +
          `${JSON.stringify(src)} is not one of them`);
      }
      // AND IT NEVER REPLACES ONE OF JOHN'S (AGT-432, directive 0078af4d): 8 tickets lost a
      // John-authored need_source to a market record on 2026-10-08. A `john:` source already on the
      // ticket may only be echoed; any other existing source may still be replaced, which is the
      // only tier the directive states.
      const held = blank(want.get(id)?.need_source) ? null : String(want.get(id).need_source);
      if (held !== null && held.startsWith("john:") && src !== null && src !== held) {
        no(id, `already carries John's own source ${held}; a pass must echo it; an existing ` +
          "John-authored need_source is never replaced (directive 0078af4d)");
      }
      const score = row.need_score;
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        no(id, `need_score must be a whole number 1-5; got ${score === undefined ? "<NULL>" : JSON.stringify(score)}`);
      }
    }
  }
  for (const [id, n] of seen) {
    if (n > 1) no(id, `is ruled ${n} times; every ticket of the list is ruled exactly once`);
  }
  for (const id of want.keys()) {
    if (!seen.has(id)) no(id, "is a ticket of this list and the answer does not rule it");
  }
  return { ok: refusals.length === 0, refusals };
}

// The run's one line about itself, and the ONLY place the shape of that line lives. `M` is the
// DISTINCT sources among the passes, not the pass count: two tickets onto one directive is one need
// answered twice, and printing the pass count there would read as two. The top list is sorted by
// score then by id, so two runs over the same answer print the same line (pattern:127).
export function runLine(list, rows) {
  const all = (Array.isArray(rows) ? rows : []).filter(r => Object(r) === r && r !== null);
  const passes = all.filter(r => r.verdict === "pass");
  const down = all.filter(r => r.verdict === "not-needed");
  const needs = new Set(passes.map(r => String(r.need_source ?? ""))).size;
  const top = [...passes]
    .sort((x, y) => (Number(y.need_score) - Number(x.need_score)) ||
      String(x.backlog_id).localeCompare(String(y.backlog_id)))
    .slice(0, TOP_N)
    .map(r => `${r.backlog_id}(${r.need_score})`);
  return `${LIST_PREFIX} — ${list}: ${all.length} items into ${needs} needs, ` +
    `${down.length} turned down; top 3: ${top.length ? top.join(", ") : "none"}`;
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

async function rest(base, key, method, q, body, prefer) {
  fetched = true;
  const res = await fetch(`${base}/rest/v1/${q}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
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
  // AGT-309: OPTIONAL. Absent means "score this ticket, do not move it" -- the AGT-280 behaviour
  // unchanged, and the ordinary case.
  const home = typeof args.home === "string" ? args.home.trim() : "";
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

  // 2b. AGT-309: THE DESTINATION, BEFORE THE MODEL TOO. `--home` is where a `pass` will move the
  //     ticket, and AGT-240's condition on that is `status = 'executing' AND accepts_findings` --
  //     the same condition `finding_group_epic()` and `epic_lock_guard()` apply. Checked here so a
  //     locked list is refused for nothing rather than after a turn is spent and the function's
  //     UPDATE rolls the whole verdict back. A missing row and a present-but-wrong row are the same
  //     refusal: neither is a list a ticket may be moved onto.
  if (home !== "") {
    const projects = await get(`projects?slug=eq.${encodeURIComponent(home)}&select=slug,status,accepts_findings`);
    const proj = Array.isArray(projects) ? projects[0] : null;
    if (!proj || proj.status !== "executing" || proj.accepts_findings !== true) {
      die(1, `requirement-check --prepare: --home ${home} is not an executing project that accepts findings (AGT-240)`);
    }
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

  const task_context = buildTaskContext({ ticket, source, source_row: row, kinds, home });

  const caps = await get(`capabilities?slug=eq.${CAPABILITY}&tenant_id=eq.${TENANT}&select=default_intent_slug&limit=1`);
  const intentSlug = caps[0]?.default_intent_slug;
  if (!intentSlug) die(1, `requirement-check: capability "${CAPABILITY}" has no capabilities row or no default_intent_slug`);

  await assembleAndEmit({ base, key, args, task_context, intentSlug,
    head: { ticket: ticketId, source, home: home === "" ? null : home } });
  die(3, `requirement-check --prepare: ${ticketId} cites ${source}` +
    `${home === "" ? "" : ` and would be homed to ${home}`} — ${AWAITING_ANSWER}`);
}

// ONE ASSEMBLY PATH FOR BOTH DOORS (§19b). Extracted from prepare() by AGT-281 unchanged in every
// byte it produces -- the `--json` object still leads with whatever `head` the caller passes (the
// ticket and the source for `--prepare`, the list and its counts for `--prepare-list`), then the
// model, the prompt size and the context. This file still builds NO prompt text of its own.
async function assembleAndEmit({ base, key, args, task_context, intentSlug, head }) {
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
      ...head, model: assembly.llm?.model,
      prompt_bytes: Buffer.byteLength(text, "utf8"), context: task_context,
    }, null, 2)}\n`);
  } else if (!args.out) {
    process.stdout.write(text);
  }
  if (omitted.length) console.error(`requirement-check: sections omitted (no stored content): ${omitted.join(", ")}`);
  return { model: assembly.llm?.model ?? null, text };
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

  // AGT-309: THE HOME COMES FROM THE PREPARE CONTEXT, NEVER FROM HER ANSWER. Where the ticket goes
  // is the manager's routing call, already checked against `projects` at --prepare time; what she
  // rules is whether the need holds. So `home_project` is added to the payload here rather than
  // being a key she could name, and it is added ONLY on a `pass` -- a `not-needed` moves nothing, so
  // it sends none and the ticket stays on its list.
  const homeSlug = blank(contextBody(ctx).home) ? null : String(contextBody(ctx).home);
  const homing = answer.verdict === "pass" && homeSlug !== null;

  const { base, key } = creds();
  const r = await rest(base, key, "POST", "rpc/apply_requirement_verdict", {
    p_cycle: hasCycle ? args["cycle-id"] : null,
    p_session: hasSession ? args["session-name"] : null,
    p: homing ? { ...answer, home_project: homeSlug } : answer,
  });
  if (!r.ok) die(1, `requirement-check --apply: HTTP ${r.status} ${r.text}`);
  const handle = typeof r.json === "string" ? r.json : r.json?.id ?? null;
  if (!handle) die(1, `requirement-check --apply: the writer returned no handle; got ${r.text.slice(0, 300)}`);

  if (answer.verdict === "pass") {
    const d = await rest(base, key, "GET", `runner_decisions?id=eq.${handle}&select=expires_at`);
    const expires = d.ok && Array.isArray(d.json) && d.json[0] ? d.json[0].expires_at : null;
    console.log(`${answer.backlog_id}: pass — need_source ${answer.need_source}, need_score ${answer.need_score}`);
    // AGT-309: printed only when the ticket actually MOVED. The function's UPDATE is inside the same
    // decision as the score, so the one reverse_decision line below puts the epic back with it.
    if (homing) console.log(`Homed: ${answer.backlog_id} -> ${homeSlug}`);
    console.log(`Decision ${handle} — reversible until ${chicago(expires)}: select * from public.reverse_decision('${handle}', 'John', '<why>');`);
  } else {
    // A findings id, not a decision: nothing on the ticket moved, so there is nothing to put back.
    console.log(`${answer.backlog_id}: not-needed — no ticket row written; the proposal is listed on the findings board.`);
    console.log(`audit_findings ${handle} (status listed, ruled_by victoria) — not a decision, so no reverse_decision line: audit_findings is append-only (AGT-70) and outside reversible_tables().`);
  }
  process.exitCode = 0;
}

// --- the list doors, AGT-281 ---------------------------------------------------------------------

const enc = encodeURIComponent;

// EVERY open/partial ticket of ONE list, with the candidate sources, in ONE prompt. The refusals come
// before the reads, cheapest first: a held slug and an unknown project cost nothing.
async function prepareList(args) {
  const project = typeof args.project === "string" ? args.project : "";
  if (!project) {
    die(2, "requirement-check --prepare-list: --project=<slug> is required");
  }
  if (HELD_LISTS.includes(project)) {
    die(1, `requirement-check: ${project} is a HELD list (HELD_LISTS) — it is not reorganized on a ` +
      "schedule, and no model turn is spent on it");
  }
  const { base, key } = creds();
  const get = async q => {
    const r = await rest(base, key, "GET", q);
    if (!r.ok) die(1, `requirement-check: GET ${q} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  };

  // 1. The list itself. A slug that names no project is a refusal, never an empty run.
  const projects = await get(`projects?slug=eq.${enc(project)}&select=id,slug,name,status&limit=1`);
  const proj = Array.isArray(projects) ? projects[0] : null;
  if (!proj) die(1, `requirement-check: no projects row reads slug ${project}`);

  // 2. Its epics, or the one named. An `--epic` of another project is refused rather than silently
  //    reorganized under this list's name.
  let epicIds;
  if (typeof args.epic === "string" && args.epic) {
    const one = await get(`epics?id=eq.${enc(args.epic)}&select=id,project_id&limit=1`);
    const e = Array.isArray(one) ? one[0] : null;
    if (!e) die(1, `requirement-check: no epics row reads id ${args.epic}`);
    if (String(e.project_id) !== String(proj.id)) {
      die(1, `requirement-check: epic ${args.epic} belongs to another project, not ${project}`);
    }
    epicIds = [e.id];
  } else {
    const eps = await get(`epics?project_id=eq.${enc(proj.id)}&select=id&order=id.asc`);
    epicIds = (Array.isArray(eps) ? eps : []).map(r => r.id);
    if (epicIds.length === 0) die(1, `requirement-check: ${project} has no epics — there is no list to read`);
  }

  // 3. The tickets. `open` and `partial` only: a `done` row's need was answered by shipping it, and a
  //    `removal proposed` row is already in John's waiting room.
  const tickets = await get(
    `backlog_items?epic_id=in.(${epicIds.map(enc).join(",")})&status=in.(open,partial)` +
    "&select=backlog_id,title,description,status,tier,type,priority_class,scope_origin," +
    "scope_rationale,enhancement_claim,epic_id,need_source,need_score&order=backlog_id.asc&limit=1000");
  if (!Array.isArray(tickets) || tickets.length === 0) {
    die(1, `requirement-check: ${project} has no open or partial tickets to reorganize`);
  }

  // 4. The candidates, from the allowlist that is DATA (pattern:2). An allowlisted pair this file has
  //    no head column for is a refusal: a candidate she cannot see reads to her as one that is not there.
  const settings = await get("runner_settings?id=eq.1&select=need_source_kinds");
  const kinds = Array.isArray(settings) && Array.isArray(settings[0]?.need_source_kinds)
    ? settings[0].need_source_kinds : [];
  if (kinds.length === 0) die(1, "requirement-check: runner_settings.need_source_kinds is empty — nothing may be cited");
  const candidates = [];
  for (const pair of kinds) {
    if (EXCLUDED_KINDS.includes(pair)) continue;
    const at = String(pair).indexOf(":");
    const table = at === -1 ? "" : String(pair).slice(at + 1);
    const col = CANDIDATE_HEAD[table];
    if (!col) {
      die(1, `requirement-check: runner_settings.need_source_kinds names ${pair}, and this caller ` +
        `has no head column for ${table || "(no table)"} — add one to CANDIDATE_HEAD rather than ` +
        "letting a candidate source the list turn cannot read look like one that does not exist");
    }
    const rows = await get(`${enc(table)}?select=id,${enc(col)}${CANDIDATE_FILTER[table] ? "&" + CANDIDATE_FILTER[table] : ""}&order=id.asc&limit=5000`);
    for (const r of Array.isArray(rows) ? rows : []) {
      candidates.push({ key: `${pair}:${r.id}`, head: cut(r[col], HEAD_CHARS) });
    }
  }
  if (candidates.length === 0) {
    die(1, "requirement-check: the allowlist named no candidate rows at all — there is nothing for a " +
      "ticket to be matched against");
  }

  const task_context = buildListContext({ project, epics: epicIds, tickets, candidates, kinds });
  await assembleAndEmit({
    base, key, args, task_context, intentSlug: LIST_INTENT,
    head: { list: project, epics: epicIds.length, tickets: tickets.length, candidates: candidates.length },
  });
  die(3, `requirement-check --prepare-list: ${project} — ${tickets.length} ticket(s) against ` +
    `${candidates.length} candidate source(s) — ${AWAITING_LIST_ANSWER}`);
}

// ONE answer, TWO writers, then ONE record of the run. The validator runs first and a refusal sends
// nothing at all -- not one pass, not one proposal.
async function applyList(args) {
  const hasCycle = typeof args["cycle-id"] === "string" && args["cycle-id"] !== "";
  const hasSession = typeof args["session-name"] === "string" && args["session-name"] !== "";
  if (hasCycle === hasSession) {
    die(2, "requirement-check --apply-list: exactly one of --cycle-id=<uuid> / --session-name=<name>");
  }
  const answer = readJson(args["apply-list"], "answer");
  const ctx = readJson(args.context, "context");
  const v = validateListVerdict(answer, ctx);
  if (!v.ok) refuse(v.refusals); // nothing is sent

  const { base, key } = creds();
  const body = contextBody(ctx);
  const list = String(body.list);
  const titles = new Map((Array.isArray(body.proposals) ? body.proposals : [])
    .map(p => [String(p?.backlog_id), p?.title ?? null]));
  const cycleId = hasCycle ? args["cycle-id"] : null;
  const sessionName = hasSession ? args["session-name"] : null;
  const startedAt = new Date().toISOString();
  const rows = answer.rows;

  // --- the passes. Each one is exactly what the single-ticket door sends: the row, the proposal it
  //     passed (the ticket's own title) and her account of the turn. THE FUNCTION OWNS THE WRITE.
  for (const row of rows.filter(r => r.verdict === "pass")) {
    const p = {
      ...row,
      proposal: blank(titles.get(String(row.backlog_id)))
        ? String(row.backlog_id) : String(titles.get(String(row.backlog_id))),
      account: answer.account,
    };
    const r = await rest(base, key, "POST", "rpc/apply_requirement_verdict",
      { p_cycle: cycleId, p_session: sessionName, p });
    if (!r.ok) die(1, `requirement-check --apply-list: ${row.backlog_id} pass -> HTTP ${r.status} ${r.text}`);
    const handle = typeof r.json === "string" ? r.json : r.json?.id ?? null;
    if (!handle) die(1, `requirement-check --apply-list: ${row.backlog_id} — the writer returned no handle; got ${r.text.slice(0, 300)}`);
    const d = await rest(base, key, "GET", `runner_decisions?id=eq.${handle}&select=expires_at`);
    const expires = d.ok && Array.isArray(d.json) && d.json[0] ? d.json[0].expires_at : null;
    console.log(`${row.backlog_id}: pass — need_source ${row.need_source}, need_score ${row.need_score}`);
    console.log(`Decision ${handle} — reversible until ${chicago(expires)}: select * from public.reverse_decision('${handle}', 'John', '<why>');`);
  }

  // --- the turned-down rows, `scripts/ticket-owner.js` step 3b: its OWN `removal-proposal` decision,
  //     the FULL row imaged under that decision BEFORE the patch (an image taken afterwards restores
  //     the very status it was meant to undo), then `status = 'removal proposed'`. `removed` is never
  //     written here (SES-113) and `updated_at` is never named (a stamp later than the decision's own
  //     `decided_at` makes reverse_decision() refuse the row, SES-316).
  for (const row of rows.filter(r => r.verdict === "not-needed")) {
    const bid = String(row.backlog_id);
    const dec = await rest(base, key, "POST", "rpc/record_decision", {
      p_cycle_id: cycleId, p_session_name: sessionName,
      p_kind: PROPOSAL_KIND, p_backlog_id: bid,
      p_summary: `${bid} removal proposed: ${row.reason}`,
      p_reasoning: `AGT-281 list reorganization of ${list}, ${startedAt}: no candidate need source ` +
        `supports it — ${row.reason}.` +
        " Reverse this decision to return the row to the drain; removed stays John's (SES-113). pattern:0",
      p_ladder_work_class: null,
    });
    if (!dec.ok) die(1, `requirement-check --apply-list: ${bid} record_decision -> HTTP ${dec.status} ${dec.text}`);
    const handle = typeof dec.json === "string" ? dec.json : dec.json?.id ?? null;
    if (typeof handle !== "string" || handle.length !== 36) {
      die(1, `requirement-check --apply-list: ${bid} record_decision returned ${JSON.stringify(dec.json)}, which is not a decision id`);
    }
    const imaged = await rest(base, key, "GET", `backlog_items?backlog_id=eq.${enc(bid)}&select=*`);
    if (!imaged.ok || !Array.isArray(imaged.json) || imaged.json.length !== 1) {
      die(1, `requirement-check --apply-list: ${bid} read ${Array.isArray(imaged.json) ? imaged.json.length : 0} of 1 row to image`);
    }
    const img = await rest(base, key, "POST", "runner_before_images", [{
      cycle_id: cycleId, session_name: sessionName, table_name: "backlog_items",
      pk_value: imaged.json[0].id, row_data: imaged.json[0], decision_id: handle,
    }], "return=minimal");
    if (!img.ok) die(1, `requirement-check --apply-list: ${bid} before-image -> HTTP ${img.status} ${img.text}`);
    const back = await rest(base, key, "PATCH", `backlog_items?backlog_id=eq.${enc(bid)}`,
      { status: PROPOSED_STATUS }, "return=representation");
    if (!back.ok) die(1, `requirement-check --apply-list: ${bid} PATCH -> HTTP ${back.status} ${back.text}`);
    const patched = Array.isArray(back.json) ? back.json[0] : null;
    if (!patched || patched.status !== PROPOSED_STATUS) {
      die(1, `requirement-check --apply-list: ${bid} status read ${JSON.stringify(patched?.status)}, wanted ${JSON.stringify(PROPOSED_STATUS)}`);
    }
    console.log(`${bid}: not-needed — ${PROPOSED_STATUS}; no row removed (SES-113).`);
    console.log(`Decision ${handle} — one Reverse returns it to the drain: select * from public.reverse_decision('${handle}', 'John', '<why>');`);
  }

  // --- THE RUN'S ONE RECORD, as ticket-owner's recordNightly() writes its own: the parent row is read
  //     for its `model` and nothing else where a cycle is the author, because this door calls no model
  //     itself and `model` is how the brief says which lane ruled. With `--session-name` the model
  //     comes from the prepare context, which is the model the turn actually ran on.
  let model = typeof ctx?.model === "string" && ctx.model ? ctx.model : null;
  if (cycleId) {
    const parent = await rest(base, key, "GET", `runner_cycles?id=eq.${enc(cycleId)}&select=model`);
    if (!parent.ok || !Array.isArray(parent.json) || parent.json.length !== 1) {
      die(1, `requirement-check --apply-list: parent cycle ${cycleId} not found — a run row attributed to a cycle that does not exist is worse than no row`);
    }
    model = parent.json[0].model ?? model;
  }
  if (!model) {
    die(1, "requirement-check --apply-list: the prepare context carries no model — the run row must say which model ruled the list");
  }
  const notes = runLine(list, rows);
  const cyc = await rest(base, key, "POST", "runner_cycles", {
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    stamp: "session victoria-reorg",
    trigger: "scheduled",
    model,
    outcome: "shipped",
    item_id: null,
    notes,
  }, "return=representation");
  if (!cyc.ok) die(1, `requirement-check --apply-list: runner_cycles -> HTTP ${cyc.status} ${cyc.text}`);
  const cycRow = Array.isArray(cyc.json) ? cyc.json[0] : null;
  if (!cycRow) die(1, `requirement-check --apply-list: the runner_cycles POST returned no row; got ${cyc.text.slice(0, 300)}`);
  console.log(`${notes}`);
  console.log(`runner_cycles ${cycRow.id} — the run's one record (model ${model}).`);
  process.exitCode = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.prepare) return prepare(args);
  if (args["prepare-list"]) return prepareList(args);
  if (args["dry-run"]) return dryRun(args);
  if (args.apply) return apply(args);
  if (args["apply-list"]) return applyList(args);
  die(2, "usage: requirement-check.js --prepare --ticket=<ID> --source=<who:table:id> [--home=<slug>] [--out=<path>] [--json] | --dry-run=<answer.json> --context=<prepare.json> | --apply=<answer.json> --context=<prepare.json> (--cycle-id=<uuid> | --session-name=<name>) | --prepare-list --project=<slug> [--epic=<uuid>] [--out=<path>] [--json] | --apply-list=<answer.json> --context=<prepare.json> (--cycle-id=<uuid> | --session-name=<name>)");
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`requirement-check: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
