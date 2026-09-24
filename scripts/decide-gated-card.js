#!/usr/bin/env node
// DeepBench v7.0.585 | scripts/decide-gated-card.js | AGT-127 -- The Development Manager rules every
// undecided `gated_before_build` card, as a client of public.apply_gate_rulings().
// Spec: docs/kickoffs/v7.0.585-AGT-127-devmanager-rules-gated-cards.md sections 4 and 5.
//
// WHY THIS EXISTS. `prime_directive_queue()` drops any ticket carrying an undecided gate card
// (SES-424 slice 1), and `runner_should_boot()` answered `nothing_pickable` when every ticket was
// gated -- the refusal the runbook names as the UNBOUNDED one, because a refusing fire never boots
// and therefore never rules anything. Measured 2026-09-24 19:40Z: 16 undecided cards, 2026-09-16 to
// 2026-09-24, and `agent_capability_assignments` for `devmanager` held nothing that could rule one.
// This ship gives the authority he already has (MANAGER-AUTHORITY-MATRIX row 3) a capability, and
// pairs it with the boot branch that makes the all-gated board fire to use it.
//
// THREE DOORS, ONE VALIDATOR:
//   --prepare [--out=<path>] [--json]
//       reads every rulable card, the ticket each one names, and that ticket's kickoff and harvest
//       text where the repo holds them, then assembles the manager's prompt through the SAME
//       assemblePrompt() the executor calls and renders it with agent-prompt.js's renderAssembly().
//       THIS FILE BUILDS NO PROMPT TEXT (Section 19b, one assembly path). `--intent` is never a flag
//       here: the intent comes off `capabilities.default_intent_slug`, which is the row's own answer.
//       Exit 3 -- awaiting the answer. Exit 3 ALSO when there is nothing to rule, with its own line:
//       no cards, no Dev Manager run, no cost.
//   --dry-run=<answer.json> --context=<prepare.json>
//       runs validateRulings() over the manager's answer and prints ok or every refusal. No network.
//   --apply=<answer.json> --context=<prepare.json> (--cycle-id=<uuid> | --session-name=<name>)
//       runs the SAME validateRulings() first (a refusal exits 1 and sends nothing), then POSTs
//       rpc/apply_gate_rulings. THE FUNCTION OWNS THE WRITE, its before-images and its one decision;
//       this file writes no table. It then prints BOTH undo lines -- see the note on Guard B below.
//
// THE TWO UNDO LINES, AND WHY ONE IS NOT ENOUGH. `reverse_decision()` restores the TICKET side of a
// ruling and REFUSES the card stamp by name: a `kind='gated_before_build'` card survives every
// reversal (Guard B, SES-364 -- it is the evidence a gate review happened, and SES-312 makes an
// unreversed review the precondition for a drain declaration). So a reader handed only the
// `reverse_decision(...)` line would put the ticket back and leave the card decided, and the ticket
// would go straight back into the pick path ungated. The re-gate INSERT is printed beside it.
//
// EXIT CODES: 0 ok; 1 refused / request failed; 2 could not run (missing credentials or arguments --
// never a pass); 3 nothing to rule, or the prompt is printed and the answer is awaited.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { assemblePrompt } from "../api/prompt/db-assembly.js";
import { renderAssembly, resolveJudgmentModel } from "./agent-prompt.js";

// --- pure half (imported by tests/regression/agt-127-decide-gated-card.test.mjs; no network) ------

export const AGENT = "devmanager";
export const CAPABILITY = "decide-gated-card";
export const TENANT = "global";
export const GATE_KIND = "gated_before_build";

// The ruling vocabulary public.apply_gate_rulings() enforces, in its own order.
export const RULINGS = Object.freeze(["accept", "rework", "retired", "needs-desktop", "john"]);

// The FOUR calls John keeps, verbatim from docs/WORKING-WITH-JOHN.md's MANAGER-AUTHORITY-MATRIX,
// last row: "Money, production (dev -> main), hiring or switching on agents (agents.is_active, the
// routine switch) and ratifying a bar he set (the 20-assignment promotion bar): John's." A card
// whose SUBJECT is one of these is ruled `john` and is not decided here.
export const JOHN_CALLS = Object.freeze({
  money: "money — nothing spends beyond what he approved",
  production: "production releases — dev to main",
  agents: "hiring or switching an agent on or off (agents.is_active, the routine switch)",
  ratify: "ratifying a bar he set (the 20-assignment promotion bar)",
});

export const NOTHING_TO_RULE =
  "no undecided gated_before_build card without an open question — no Dev Manager run, no cost (AGT-127 §4)";
export const AWAITING_ANSWER =
  "prompt assembled and printed; exit 3 = awaiting the manager's answer, then --dry-run and --apply";

// The question id apply_gate_rulings() writes for a `john` ruling, and the one runner_should_boot()
// reads to stop re-firing on that card. ONE definition, because two would drift and the drift would
// present as a fire that rules the same card every hour.
export const qidFor = cardId => `gate-card-${String(cardId).slice(0, 8)}`;

const blank = v => String(v ?? "").trim() === "";

// A card is RULABLE when it is an undecided gate card AND no OPEN question already names it --
// exactly runner_should_boot()'s new `gate_cards` CTE, restated over rows the caller already read.
export function rulableCards(cards, questions) {
  const open = new Set(
    (Array.isArray(questions) ? questions : [])
      .filter(q => q && q.status === "open")
      .map(q => String(q.qid)),
  );
  return (Array.isArray(cards) ? cards : [])
    .filter(c => c && c.kind === GATE_KIND && (c.decision === null || c.decision === undefined))
    .filter(c => !open.has(qidFor(c.id)));
}

// The manager's task_context. `tickets` is keyed by backlog_id; `docs` carries the kickoff and
// harvest TEXT the caller read off the repo (never a path the model cannot open).
export function buildTaskContext({ cards, questions, tickets, docs }) {
  const rulable = rulableCards(cards, questions);
  if (rulable.length === 0) return null;
  const byId = new Map((Array.isArray(tickets) ? tickets : []).map(t => [String(t.backlog_id), t]));
  const text = Object(docs) === docs ? docs : {};
  return {
    cards: rulable.map(c => ({
      card_id: c.id,
      title: c.title,
      value_case: c.value_case ?? null,
      before_after: c.before_after ?? null,
      qa_evidence: c.qa_evidence ?? null,
      flag_slug: c.flag_slug ?? null,
      backlog_id: c.backlog_id ?? null,
      created_at: c.created_at ?? null,
      filed_by_cycle: c.cycle_id ?? null,
      ticket: c.backlog_id && byId.has(String(c.backlog_id))
        ? (() => {
            const t = byId.get(String(c.backlog_id));
            return {
              backlog_id: t.backlog_id, title: t.title, description: t.description,
              status: t.status, tier: t.tier, priority_class: t.priority_class,
              design_status: t.design_status ?? null, scope_rationale: t.scope_rationale ?? null,
              kickoff_link: t.kickoff_link ?? null, defer_status: t.defer_status ?? null,
              blocked_by: t.blocked_by ?? null,
            };
          })()
        : null,
      kickoff: c.backlog_id ? (text[`kickoff:${c.backlog_id}`] ?? null) : null,
      harvest: c.backlog_id ? (text[`harvest:${c.backlog_id}`] ?? null) : null,
    })),
    john_calls: { ...JOHN_CALLS },
  };
}

// Mirrors apply_gate_rulings()'s validation, in the function's own order and with its own message
// texts (without the function's "apply_gate_rulings: " prefix), and collects EVERY refusal rather
// than stopping at the first -- a dry-run shows the manager the whole list. The two rules it cannot
// see offline stay the function's: that the card exists, and that it is still undecided.
export function validateRulings(answer, cards) {
  const refusals = [];
  const rulings = answer && answer.rulings;
  if (!Array.isArray(rulings) || rulings.length === 0) {
    refusals.push("p_rulings must be a non-empty array");
    return { ok: false, refusals };
  }
  const known = new Map((Array.isArray(cards) ? cards : []).map(c => [String(c.card_id ?? c.id), c]));
  const seen = [];
  for (const r of rulings) {
    const id = r && typeof r === "object" ? r.card_id : undefined;
    const shown = id === undefined || id === null ? "<NULL>" : String(id);
    if (blank(id)) { refusals.push("every ruling needs a card_id"); continue; }
    const ruling = r.ruling;
    if (!RULINGS.includes(ruling)) {
      refusals.push(`ruling ${ruling ?? "<NULL>"} on card ${shown} is not one of ${RULINGS.join(", ")}`);
    }
    if (blank(r.reason)) refusals.push(`the ruling on card ${shown} needs a reason`);
    if (seen.includes(shown)) refusals.push(`card ${shown} appears twice in one call`);
    else seen.push(shown);
    if (known.size > 0 && !known.has(shown)) refusals.push(`card ${shown} is not one of the rulable cards`);
  }
  // COVERAGE LAST, and it is not optional: a card left out of the answer is a card the next fire
  // meets again, which is the loop this ticket exists to close.
  for (const c of known.keys()) {
    if (!seen.includes(c)) refusals.push(`card ${c} not covered`);
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
  if (typeof p !== "string" || !p) die(2, `decide-gated-card: ${what} path missing`);
  try { return JSON.parse(fs.readFileSync(path.resolve(p), "utf8")); }
  catch (e) { die(2, `decide-gated-card: cannot read ${what} ${p}: ${e.message}`); }
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    die(2, "decide-gated-card: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
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

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Bounded on purpose: a gate card's ticket can name a 40 KB kickoff, and 16 of them would be the
// 473 KB briefing read this whole gate exists not to pay.
const DOC_BYTES = 12000;

function readDoc(rel) {
  if (!rel) return null;
  const abs = path.resolve(REPO, String(rel).replace(/^\/+/, ""));
  if (!abs.startsWith(REPO)) return null;
  try {
    const t = fs.readFileSync(abs, "utf8");
    return t.length > DOC_BYTES ? `${t.slice(0, DOC_BYTES)}\n…(truncated at ${DOC_BYTES} chars)` : t;
  } catch { return null; }
}

async function prepare(args) {
  const { base, key } = creds();
  const get = async q => {
    const r = await rest(base, key, "GET", q);
    if (!r.ok) die(1, `decide-gated-card: GET ${q} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  };
  const cards = await get(`runner_items?kind=eq.${GATE_KIND}&decision=is.null&select=id,cycle_id,backlog_id,kind,title,value_case,before_after,qa_evidence,flag_slug,decision,created_at&order=created_at`);
  const questions = await get("runner_questions?qid=like.gate-card-*&select=qid,status");
  const ids = [...new Set(cards.map(c => c.backlog_id).filter(Boolean))];
  const tickets = ids.length
    ? await get(`backlog_items?backlog_id=in.(${ids.join(",")})&select=backlog_id,title,description,status,tier,priority_class,design_status,scope_rationale,kickoff_link,defer_status,blocked_by`)
    : [];

  const docs = {};
  for (const t of tickets) {
    const k = readDoc(t.kickoff_link);
    if (k) docs[`kickoff:${t.backlog_id}`] = k;
    const h = readDoc(`docs/harvests/${t.backlog_id}.md`);
    if (h) docs[`harvest:${t.backlog_id}`] = h;
  }

  const task_context = buildTaskContext({ cards, questions, tickets, docs });
  if (task_context === null) die(3, NOTHING_TO_RULE);

  const caps = await get(`capabilities?slug=eq.${CAPABILITY}&tenant_id=eq.${TENANT}&select=default_intent_slug&limit=1`);
  const intentSlug = caps[0]?.default_intent_slug;
  if (!intentSlug) die(1, `decide-gated-card: capability "${CAPABILITY}" has no capabilities row or no default_intent_slug`);

  let assembly;
  try {
    assembly = await assemblePrompt({
      capability_slug: CAPABILITY, agent_id: AGENT, tenant_id: TENANT, task_context,
      intent_slug: intentSlug,
    });
  } catch (e) { die(1, `decide-gated-card: ${e.message}`); }
  if (!assembly.agent_card) die(1, `decide-gated-card: no agents row for ${AGENT}`);

  const lane = await resolveJudgmentModel(assembly, {
    supabaseUrl: base, headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (lane.warning) console.error(`decide-gated-card: ${lane.warning}`);
  if (assembly.llm) { assembly.llm.model = lane.model; assembly.llm.lane_note = lane.reason; }

  const { system_prompt, omitted } = renderAssembly(assembly);
  if (!system_prompt) die(1, `decide-gated-card: capability "${CAPABILITY}" assembled zero renderable sections`);
  const header = `# ${assembly.agent_card.name} — ${assembly.agent_card.role} · capability ${assembly.capability_slug} · model ${assembly.llm?.model}`;
  const laneLine = lane.from ? `\n# lane: judgment degraded to ${lane.model} (${lane.reason})` : "";
  const text = `${header}${laneLine}\n${system_prompt}\n`;

  if (typeof args.out === "string" && args.out) fs.writeFileSync(path.resolve(args.out), text, "utf8");
  if (args.json) {
    process.stdout.write(`${JSON.stringify({ cards: task_context.cards.length, model: assembly.llm?.model, prompt_bytes: Buffer.byteLength(text, "utf8"), context: task_context }, null, 2)}\n`);
  } else if (!args.out) {
    process.stdout.write(text);
  }
  if (omitted.length) console.error(`decide-gated-card: sections omitted (no stored content): ${omitted.join(", ")}`);
  die(3, `decide-gated-card --prepare: ${task_context.cards.length} rulable card(s) — ${AWAITING_ANSWER}`);
}

function refuse(refusals) {
  die(1, refusals.map(r => `refused: ${r}`).join("\n"));
}

function contextCards(ctx) {
  return Array.isArray(ctx && ctx.cards) ? ctx.cards : Array.isArray(ctx && ctx.context && ctx.context.cards) ? ctx.context.cards : [];
}

function dryRun(args) {
  const answer = readJson(args["dry-run"], "answer");
  const ctx = readJson(args.context, "context");
  const v = validateRulings(answer, contextCards(ctx));
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
  if (hasCycle === hasSession) die(2, "decide-gated-card --apply: exactly one of --cycle-id=<uuid> / --session-name=<name>");
  const answer = readJson(args.apply, "answer");
  const ctx = readJson(args.context, "context");
  const cards = contextCards(ctx);
  const v = validateRulings(answer, cards);
  if (!v.ok) refuse(v.refusals); // nothing is sent

  const { base, key } = creds();
  const patterns = Array.isArray(answer.patterns_applied) ? answer.patterns_applied : [];
  const rulings = answer.rulings.map(r => ({ ...r, patterns_applied: patterns }));
  const r = await rest(base, key, "POST", "rpc/apply_gate_rulings", {
    p_rulings: rulings,
    p_cycle_id: hasCycle ? args["cycle-id"] : null,
    p_session_name: hasSession ? args["session-name"] : null,
  });
  if (!r.ok) die(1, `decide-gated-card --apply: HTTP ${r.status} ${r.text}`);
  const { decision_id: id, counts, cards_stamped, tickets_written, pushed_to_john, questions } = r.json ?? {};
  const d = await rest(base, key, "GET", `runner_decisions?id=eq.${id}&select=expires_at`);
  const expires = d.ok && Array.isArray(d.json) && d.json[0] ? d.json[0].expires_at : null;

  console.log(`Decision ${id} — reversible until ${chicago(expires)}: select * from public.reverse_decision('${id}', 'John', '<why>');`);
  // Guard B: that call restores the TICKET side and refuses the card stamp by name. Re-gating is a
  // second, explicit write, so it is printed rather than implied.
  console.log("The card stamps SURVIVE that reversal (Guard B, SES-364). To re-gate a ticket, file a fresh card:");
  console.log("  insert into public.runner_items (cycle_id, kind, title, backlog_id) values ('<cycle id>', 'gated_before_build', '<why it is gated again>', '<TICKET>');");
  console.log(`Cards stamped: ${cards_stamped ?? 0}; tickets written: ${tickets_written ?? 0}; pushed to John: ${pushed_to_john ?? 0}`);
  console.log(`Counts: ${JSON.stringify(counts ?? {})}`);
  console.log(`Questions opened: ${Array.isArray(questions) && questions.length ? questions.join(", ") : "(none)"}`);
  process.exitCode = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.prepare) return prepare(args);
  if (args["dry-run"]) return dryRun(args);
  if (args.apply) return apply(args);
  die(2, "usage: decide-gated-card.js --prepare [--out=<path>] [--json] | --dry-run=<answer.json> --context=<prepare.json> | --apply=<answer.json> --context=<prepare.json> (--cycle-id=<uuid> | --session-name=<name>)");
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`decide-gated-card: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
