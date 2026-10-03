#!/usr/bin/env node
// DeepBench v7.0.696 | scripts/design-ruling.js | AGT-136 slice 2 -- The Designer rules every OPEN
// question on the board AND every Knowledge ask recorded against HER, as a client of
// public.apply_design_rulings().
// Spec: docs/kickoffs/v7.0.696-AGT-136-designer-knowledge-loop.md sections 4 and 5
// (slice 1: docs/kickoffs/v7.0.611-AGT-136-designer-ruling-desk.md).
//
// THE SECOND DESK (slice 2). `staff-watch.js --promote` files a `runner_card_asks` row of kind
// `skill-edit` when one fingerprint reaches the 3-cycle bar, and that row was routed to John --
// measured live 2026-09-28: FOUR unanswered, three of them the Designer's own fingerprints, the
// oldest asked 2026-09-25. A miss in the Designer's text is hers to fix (pattern:104 -- the
// correction routes back to the producing agent; pattern:7 -- it lands in the agent's own Skill
// content, not in the harness loop), so `--prepare` now carries those asks and a `yes` writes the
// Designer's own sentence into `ds-knowledge-standard.method`. ANOTHER AGENT'S ASK IS NEVER
// OFFERED (Rule #1): an ask names a fingerprint, and only a fingerprint with a
// `runner_staff_findings` row of `agent_id='designer'` is hers. The devmanager ask stays John's.
//
// WHY THIS EXISTS. `apply_gate_rulings()`'s `john` ruling opens a `gate-card-<id8>` row in
// `runner_questions` and leaves the card undecided -- a parking lot with exactly ONE addressee.
// Measured live 2026-09-28: 21 rows sit `open` there, the oldest a gate-card question from
// 2026-09-24, and `agent_capability_assignments` for `designer` held exactly ONE row
// (`design-kickoff`), which can rule nothing. `governance_rules:JOHN-0925-DESIGNER-DECIDES` makes
// those the Designer's calls, not John's: he keeps money, production (dev -> main), and hiring or
// switching an agent on. This ship gives that authority a capability, and this file is its door.
//
// THREE DOORS, ONE VALIDATOR -- decide-gated-card.js's shape, because the Development Manager's
// ruling desk and the Designer's are the same mechanism pointed at a different row (pattern:17:
// extend a structure that already fits rather than standing up a parallel one):
//   --prepare [--out=<path>] [--json]
//       reads every OPEN question, pairs the ones a gate ruling opened back to the card they name
//       through qidFor() -- IMPORTED from decide-gated-card.js, never re-derived, because two
//       copies of that id format would drift and the drift would present as a question nobody can
//       trace to its card -- then assembles the Designer's prompt through the SAME assemblePrompt()
//       the executor calls and renders it with agent-prompt.js's renderAssembly().
//       THIS FILE BUILDS NO PROMPT TEXT (Section 19b, one assembly path). `--intent` is never a
//       flag here: the intent comes off `capabilities.default_intent_slug`, the row's own answer.
//       Exit 0 -- the prompt is written. Exit 3 when there is NOTHING OPEN: no Designer run, no
//       cost. (The two exits differ from decide-gated-card.js's on purpose -- section 4 of the
//       kickoff sets them, and a prepare that wrote a prompt is a step that succeeded.)
//   --dry-run=<answer.json> --context=<prepare.json>
//       runs validateRulings() over the Designer's answer and prints ok or every refusal. No
//       network, no spend.
//   --apply=<answer.json> --context=<prepare.json> (--cycle-id=<uuid> | --session-name=<name>)
//       runs the SAME validateRulings() first (a refusal exits 1 and sends nothing), then POSTs
//       rpc/apply_design_rulings. THE FUNCTION OWNS THE WRITE, its before-images and its one
//       decision; this file writes no table ITSELF. It then prints the `reverse_decision(...)` line.
//
// ONE UNDO LINE, AND IT REALLY UNDOES. `reverse_decision()`'s `k_allowed` omitted
// `runner_questions` until this same ship, so a ruling written against today's `dev` came back
// `refused=1, restored=0` while the call still reported itself `applied`. Migration
// `agt136_apply_design_rulings` adds the table (it has pk `id` and an `updated_at`, so a restore
// lands `restored`, not `restored_unverified`). That is why exactly one line is printed here and
// decide-gated-card.js prints two: there is no surviving-evidence half to re-file.
//
// EXIT CODES: 0 ok (including a written prepare); 1 refused / request failed; 2 could not run
// (missing credentials or arguments -- never a pass); 3 nothing open to rule.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { assemblePrompt } from "../api/prompt/db-assembly.js";
import { renderAssembly, resolveJudgmentModel } from "./agent-prompt.js";
// qidFor() has ONE home (decide-gated-card.js) and this file is a reader of it, never a second
// author: the `gate-card-<id8>` format is the join between a question and the card that opened it.
import { qidFor, GATE_KIND } from "./decide-gated-card.js";

// --- pure half (imported by tests/regression/agt-136-design-ruling.test.mjs; no network) ---------

export const AGENT = "designer";
export const CAPABILITY = "design-ruling";
export const TENANT = "global";

// The ruling vocabulary public.apply_design_rulings() enforces, in its own order. It is read off
// the LIVE CHECKs on runner_questions -- `answer` admits only ('yes','no') and `status` only
// ('open','answered','withdrawn') -- so `withdrawn` and `john` write no answer and every reason
// lands in `answer_note`.
export const RULINGS = Object.freeze(["yes", "no", "withdrawn", "john"]);

// A KNOWLEDGE ASK ADMITS TWO WORDS, and the two it leaves out are the point. `withdrawn` has no
// meaning here -- the staff finding that opened the ask is a measured fact, not a premise that can
// lapse -- and `john` is REFUSED: the Designer's own Knowledge is hers, which is the whole of what
// slice 2 moves off his desk.
export const ASK_RULINGS = Object.freeze(["yes", "no"]);
// THE TARGET IS FIXED, never read off the ask and never a flag: an ask names a fingerprint, not a
// Skill row, and letting the answer choose the row would let one ruling rewrite any Skill on the
// platform. public.apply_design_rulings() holds the same constant, and this is its mirror.
export const KNOWLEDGE_SLUG = "ds-knowledge-standard";
export const KNOWLEDGE_LINE_MAX = 400;

// The THREE calls John keeps, verbatim from governance_rules:JOHN-0925-DESIGNER-DECIDES (live,
// written 2026-09-26 08:24:24Z). EVERY OTHER SUBJECT IS THE DESIGNER'S -- that is the whole rule,
// and it is why this list is three and not longer.
//
// DECLARED FINDING, NOT AN EDIT (the kickoff's own stop line): decide-gated-card.js:59's
// JOHN_CALLS holds FOUR entries and scripts/audit-review.js:57's holds FIVE, both written before
// JOHN-0925-DESIGNER-DECIDES narrowed the list to three. Those two lists govern a DIFFERENT
// vocabulary (a card's subject, an audit finding's escalation) and re-pointing them is its own
// ticket with its own before-images; this file states the three and files the discrepancy rather
// than editing two other agents' rule sets from inside a third's ship.
export const JOHN_CALLS = Object.freeze({
  money: "money — nothing spends beyond what he approved",
  production: "production releases — dev to main",
  agents: "hiring or switching an agent on or off (agents.is_active, the routine switch)",
});

// EXIT 3 IS BOTH LISTS EMPTY, never either one (§4): a board with nothing open but a Knowledge ask
// standing is still a Designer run, and a prepare that exited on the question count alone is how
// the asks reached four unanswered.
export const NOTHING_OPEN =
  "nothing open to rule — no question and no Knowledge ask — no Designer run, no cost (AGT-136 §4)";
export const PROMPT_WRITTEN =
  "prompt assembled and written; now --dry-run the answer, then --apply it";

const blank = v => String(v ?? "").trim() === "";

// An OPEN question is rulable. There is no second condition -- unlike a gate card, a question
// carries its own state, and `status='open'` IS the whole predicate apply_design_rulings() re-reads.
export function openQuestions(questions) {
  return (Array.isArray(questions) ? questions : []).filter(q => q && q.status === "open");
}

// THE DESIGNER'S OWN ASKS, AND NOBODY ELSE'S (Rule #1). A `skill-edit` ask carries the FINGERPRINT
// in `target_id`, never an agent id, so the roster question is answered by the findings: a
// fingerprint with a `runner_staff_findings` row of `agent_id='designer'` is hers to rule and any
// other is not. The findings also carry the EVIDENCE the ruling is made on -- how many cycles saw
// it, and what they actually wrote -- because an ask's own question text is a summary of them.
// Sorted by `asked_at` then `ask_id`: the two board reads are ordered by the server and this one
// is ordered here, so one prepare over one board always assembles the same prompt (pattern:3).
export function knowledgeAsks({ asks, findings }) {
  const byFingerprint = new Map();
  for (const f of Array.isArray(findings) ? findings : []) {
    if (!f || blank(f.fingerprint)) continue;
    // The GET filters `agent_id=eq.designer`, so these rows are hers by construction. This second
    // read of the column is not belt-and-braces: a caller that hands this function an unfiltered
    // list would otherwise offer her another agent's ask, which is the ONE thing Rule #1 forbids.
    if (f.agent_id !== undefined && f.agent_id !== AGENT) continue;
    const e = byFingerprint.get(String(f.fingerprint))
      ?? { kinds: [], cycles: new Set(), examples: [] };
    if (!blank(f.kind) && !e.kinds.includes(f.kind)) e.kinds.push(f.kind);
    if (!blank(f.cycle_id)) e.cycles.add(String(f.cycle_id));
    if (!blank(f.detail) && !e.examples.includes(f.detail)) e.examples.push(f.detail);
    byFingerprint.set(String(f.fingerprint), e);
  }
  return (Array.isArray(asks) ? asks : [])
    .filter(a => a && !blank(a.id) && byFingerprint.has(String(a.target_id)))
    .sort((a, b) => String(a.asked_at ?? "").localeCompare(String(b.asked_at ?? ""))
                    || String(a.id).localeCompare(String(b.id)))
    .map(a => {
      const e = byFingerprint.get(String(a.target_id));
      return {
        ask_id: a.id,
        fingerprint: a.target_id,
        kind: e.kinds.join(", "),
        cycles: e.cycles.size,
        question: a.question ?? null,
        examples: e.examples.slice(0, 3),
      };
    });
}

// The Designer's task_context. `cards` is keyed by qid through qidFor(), so a question a gate
// ruling opened arrives WITH the card it is about -- the evidence the ruling has to be made on.
// `knowledge_asks` is the second desk and `knowledge_method` is the text a `yes` appends to, so
// she can see whether the sentence she is about to write is already there.
export function buildTaskContext({ questions, cards, asks, findings, method }) {
  const open = openQuestions(questions);
  const myAsks = knowledgeAsks({ asks, findings });
  if (open.length === 0 && myAsks.length === 0) return null;
  const byQid = new Map(
    (Array.isArray(cards) ? cards : [])
      .filter(c => c && c.kind === GATE_KIND)
      .map(c => [qidFor(c.id), c]),
  );
  return {
    questions: open.map(q => {
      const card = byQid.get(String(q.qid)) ?? null;
      return {
        qid: q.qid,
        question: q.question,
        context: q.context ?? null,
        asked_at: q.asked_at ?? null,
        asked_cycle: q.asked_cycle ?? null,
        card: card === null ? null : {
          card_id: card.id,
          title: card.title,
          value_case: card.value_case ?? null,
          before_after: card.before_after ?? null,
          qa_evidence: card.qa_evidence ?? null,
          backlog_id: card.backlog_id ?? null,
          created_at: card.created_at ?? null,
        },
      };
    }),
    knowledge_asks: myAsks,
    knowledge_method: typeof method === "string" ? method : null,
    john_calls: { ...JOHN_CALLS },
  };
}

// Mirrors apply_design_rulings()'s validation, in the function's own order and with its own message
// texts (without the function's "apply_design_rulings: " prefix), and collects EVERY refusal rather
// than stopping at the first -- a dry-run shows the Designer the whole list. The two rules it
// cannot see offline stay the function's: that the question exists, and that it is still open.
export function validateRulings(answer, questions, asks, method) {
  const refusals = [];
  const rulings = answer && answer.rulings;
  if (!Array.isArray(rulings) || rulings.length === 0) {
    refusals.push("p_rulings must be a non-empty array");
    return { ok: false, refusals };
  }
  const known = new Map(
    (Array.isArray(questions) ? questions : []).map(q => [String(q.qid), q]),
  );
  // Keyed on `ask_id` (the context's own shape) and on `id` (a raw runner_card_asks row), so a
  // caller that passes either list gets the membership check rather than silently losing it.
  const knownAsks = new Map(
    (Array.isArray(asks) ? asks : [])
      .filter(a => a && (!blank(a.ask_id) || !blank(a.id)))
      .map(a => [String(blank(a.ask_id) ? a.id : a.ask_id), a]),
  );
  const standard = typeof method === "string" ? method : "";
  const seen = [];
  const seenAsks = [];
  const pending = [];   // the knowledge lines this call has already validated
  const calls = Object.keys(JOHN_CALLS);
  for (const r of rulings) {
    const qid = r && typeof r === "object" ? r.qid : undefined;
    const askId = r && typeof r === "object" ? r.ask_id : undefined;
    const shown = qid === undefined || qid === null ? "<NULL>" : String(qid);
    // EXACTLY ONE ID, and the refusal says why: two desks, one element. A ruling carrying both
    // would have to be applied to a question AND an ask, and neither answer would be the one the
    // Designer wrote.
    if (!blank(qid) && !blank(askId)) {
      refusals.push(`a ruling carries BOTH a qid (${shown}) and an ask_id (${String(askId)}) — exactly one, they are different desks`);
      continue;
    }
    if (blank(qid) && blank(askId)) {
      refusals.push("every ruling needs exactly one of qid or ask_id");
      continue;
    }

    // --- the Knowledge-ask half (slice 2) ------------------------------------------------------
    if (!blank(askId)) {
      const ask = String(askId);
      const askRuling = r.ruling;
      if (!ASK_RULINGS.includes(askRuling)) {
        refusals.push(`ruling ${askRuling ?? "<NULL>"} on ask ${ask} is not one of ${ASK_RULINGS.join(", ")} — a Knowledge ask is never withdrawn and never john: your own Knowledge is yours (Rule #1)`);
      }
      if (blank(r.reason)) refusals.push(`the ruling on ask ${ask} needs a reason`);
      if (seenAsks.includes(ask)) refusals.push(`ask ${ask} appears twice in one call`);
      else seenAsks.push(ask);
      if (knownAsks.size > 0 && !knownAsks.has(ask)) {
        refusals.push(`ask ${ask} is not one of the Knowledge asks recorded against you — another agent's ask is never yours to rule (Rule #1)`);
      }
      if (askRuling === "yes") {
        const line = typeof r.knowledge_line === "string" ? r.knowledge_line.trim() : "";
        if (line === "") {
          refusals.push(`a yes on ask ${ask} needs a knowledge_line — the ONE sentence that would have prevented the miss`);
        } else if (/[\n\r]/.test(line)) {
          refusals.push(`the knowledge_line on ask ${ask} carries a newline — ONE line is appended to ${KNOWLEDGE_SLUG}.method`);
        } else if (line.length > KNOWLEDGE_LINE_MAX) {
          refusals.push(`the knowledge_line on ask ${ask} is ${line.length} characters — the cap is ${KNOWLEDGE_LINE_MAX}`);
        } else if (standard.includes(line) || pending.includes(line)) {
          // A line the standard already carries teaches nothing, and two identical lines in one
          // call would land twice -- so `pending` is checked as well as the stored text.
          refusals.push(`the knowledge_line on ask ${ask} is already in ${KNOWLEDGE_SLUG}.method — a line that is already there teaches nothing`);
        } else {
          pending.push(line);
        }
      }
      continue;
    }

    // --- the question half, unchanged ----------------------------------------------------------
    const ruling = r.ruling;
    if (!RULINGS.includes(ruling)) {
      refusals.push(`ruling ${ruling ?? "<NULL>"} on question ${shown} is not one of ${RULINGS.join(", ")}`);
    }
    if (blank(r.reason)) refusals.push(`the ruling on question ${shown} needs a reason`);
    // A `john` ruling NAMES which of the three it is. Without this the word `john` becomes the
    // escape hatch from every hard call -- which is the parking lot this capability exists to
    // empty, refilled under a new name.
    if (ruling === "john" && !calls.includes(String(r.john_call ?? ""))) {
      refusals.push(`a john ruling on question ${shown} must name one of ${calls.join(", ")} in john_call (got ${blank(r.john_call) ? "<NULL>" : String(r.john_call)}) — every other subject is the Designer's (JOHN-0925-DESIGNER-DECIDES)`);
    }
    // A FREE-TEXT `answer` IS REFUSED, and it is not pedantry: runner_questions_answer_check admits
    // only 'yes' and 'no', so a sentence here reaches the database as a 23514 AFTER the decision
    // row is written. The reason is the free text, and it goes to answer_note.
    if (r && Object.prototype.hasOwnProperty.call(r, "answer") && !blank(r.answer)) {
      refusals.push(`the ruling on question ${shown} carries a free-text answer — runner_questions.answer admits only yes or no; put the words in reason, which becomes answer_note`);
    }
    if (seen.includes(shown)) refusals.push(`question ${shown} appears twice in one call`);
    else seen.push(shown);
    if (known.size > 0 && !known.has(shown)) refusals.push(`question ${shown} is not one of the open questions`);
  }
  // COVERAGE LAST, and it is not optional: a question left out of the answer is a question that
  // stays open, which is the parking lot this ticket exists to drain. IT IS THE QUESTIONS ONLY --
  // §4 sets four rules for an ask and coverage is not among them, and an unruled ask keeps its own
  // row (`answer is null`) rather than disappearing, so the next prepare offers it again.
  for (const q of known.keys()) {
    if (!seen.includes(q)) refusals.push(`question ${q} not covered`);
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
  if (typeof p !== "string" || !p) die(2, `design-ruling: ${what} path missing`);
  try { return JSON.parse(fs.readFileSync(path.resolve(p), "utf8")); }
  catch (e) { die(2, `design-ruling: cannot read ${what} ${p}: ${e.message}`); }
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    die(2, "design-ruling: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
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
  const { base, key } = creds();
  const get = async q => {
    const r = await rest(base, key, "GET", q);
    if (!r.ok) die(1, `design-ruling: GET ${q} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  };
  const questions = await get("runner_questions?status=eq.open&select=qid,question,context,asked_at,asked_cycle,status&order=asked_at");
  const cards = await get(`runner_items?kind=eq.${GATE_KIND}&decision=is.null&select=id,cycle_id,backlog_id,kind,title,value_case,before_after,qa_evidence,decision,created_at&order=created_at`);

  // THE SECOND DESK's three reads, and all three happen BEFORE the exit-3 decision: an ask
  // standing with nothing open is still a run (§4).
  const asks = await get("runner_card_asks?target_kind=eq.skill-edit&answer=is.null&select=id,target_id,question,asked_at");
  const findings = await get("runner_staff_findings?agent_id=eq.designer&select=fingerprint,kind,cycle_id,detail");
  const knowledge = await get(`skill_profiles?slug=eq.${KNOWLEDGE_SLUG}&select=method`);
  const method = Array.isArray(knowledge) && knowledge[0] ? knowledge[0].method : null;

  const task_context = buildTaskContext({ questions, cards, asks, findings, method });
  if (task_context === null) die(3, NOTHING_OPEN);

  const caps = await get(`capabilities?slug=eq.${CAPABILITY}&tenant_id=eq.${TENANT}&select=default_intent_slug&limit=1`);
  const intentSlug = caps[0]?.default_intent_slug;
  if (!intentSlug) die(1, `design-ruling: capability "${CAPABILITY}" has no capabilities row or no default_intent_slug`);

  let assembly;
  try {
    assembly = await assemblePrompt({
      capability_slug: CAPABILITY, agent_id: AGENT, tenant_id: TENANT, task_context,
      intent_slug: intentSlug,
    });
  } catch (e) { die(1, `design-ruling: ${e.message}`); }
  if (!assembly.agent_card) die(1, `design-ruling: no agents row for ${AGENT}`);

  const lane = await resolveJudgmentModel(assembly, {
    supabaseUrl: base, headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (lane.warning) console.error(`design-ruling: ${lane.warning}`);
  if (assembly.llm) { assembly.llm.model = lane.model; assembly.llm.lane_note = lane.reason; }

  const { system_prompt, omitted } = renderAssembly(assembly);
  if (!system_prompt) die(1, `design-ruling: capability "${CAPABILITY}" assembled zero renderable sections`);
  const header = `# ${assembly.agent_card.name} — ${assembly.agent_card.role} · capability ${assembly.capability_slug} · model ${assembly.llm?.model}`;
  const laneLine = lane.from ? `\n# lane: judgment degraded to ${lane.model} (${lane.reason})` : "";
  const text = `${header}${laneLine}\n${system_prompt}\n`;

  if (typeof args.out === "string" && args.out) fs.writeFileSync(path.resolve(args.out), text, "utf8");
  if (args.json) {
    process.stdout.write(`${JSON.stringify({ questions: task_context.questions.length, asks: task_context.knowledge_asks.length, model: assembly.llm?.model, prompt_bytes: Buffer.byteLength(text, "utf8"), context: task_context }, null, 2)}\n`);
  } else if (!args.out) {
    process.stdout.write(text);
  }
  if (omitted.length) console.error(`design-ruling: sections omitted (no stored content): ${omitted.join(", ")}`);
  // THE STATUS LINE GOES TO stderr, NOT stdout, even though this is the SUCCESS exit: stdout is the
  // PRODUCT (the prompt, or the --json context) and a reader pipes it. Appending a human sentence
  // to it made `--prepare --json` unparseable -- found by running it, not by reading it.
  process.stderr.write(`design-ruling --prepare: ${task_context.questions.length} open question(s), ${task_context.knowledge_asks.length} Knowledge ask(s) — ${PROMPT_WRITTEN}\n`);
  process.exitCode = 0;
}

function refuse(refusals) {
  die(1, refusals.map(r => `refused: ${r}`).join("\n"));
}

function contextQuestions(ctx) {
  return Array.isArray(ctx && ctx.questions)
    ? ctx.questions
    : Array.isArray(ctx && ctx.context && ctx.context.questions) ? ctx.context.questions : [];
}

// Both readers take the prepare's `--json` envelope OR the bare task_context, exactly as
// contextQuestions() does: the one file that writes the context and the one that reads it back
// must not disagree about which layer the keys are on.
function contextAsks(ctx) {
  return Array.isArray(ctx && ctx.knowledge_asks)
    ? ctx.knowledge_asks
    : Array.isArray(ctx && ctx.context && ctx.context.knowledge_asks) ? ctx.context.knowledge_asks : [];
}

function contextMethod(ctx) {
  if (typeof (ctx && ctx.knowledge_method) === "string") return ctx.knowledge_method;
  if (typeof (ctx && ctx.context && ctx.context.knowledge_method) === "string") return ctx.context.knowledge_method;
  return "";
}

function dryRun(args) {
  const answer = readJson(args["dry-run"], "answer");
  const ctx = readJson(args.context, "context");
  const v = validateRulings(answer, contextQuestions(ctx), contextAsks(ctx), contextMethod(ctx));
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
  // BOTH IDS IS EXIT 2, not a silent preference for one: runner_before_images'
  // ck_before_image_attribution admits exactly one, and a caller that passed both does not know
  // which attribution it is asking for.
  if (hasCycle === hasSession) die(2, "design-ruling --apply: exactly one of --cycle-id=<uuid> / --session-name=<name>");
  const answer = readJson(args.apply, "answer");
  const ctx = readJson(args.context, "context");
  const questions = contextQuestions(ctx);
  const v = validateRulings(answer, questions, contextAsks(ctx), contextMethod(ctx));
  if (!v.ok) refuse(v.refusals); // nothing is sent

  const { base, key } = creds();
  const patterns = Array.isArray(answer.patterns_applied) ? answer.patterns_applied : [];
  const rulings = answer.rulings.map(r => ({ ...r, patterns_applied: patterns }));
  const r = await rest(base, key, "POST", "rpc/apply_design_rulings", {
    p_rulings: rulings,
    p_cycle_id: hasCycle ? args["cycle-id"] : null,
    p_session_name: hasSession ? args["session-name"] : null,
  });
  if (!r.ok) die(1, `design-ruling --apply: HTTP ${r.status} ${r.text}`);
  const { decision_id: id, answered, withdrawn, pushed_to_john, asks, knowledge_lines, questions: left } = r.json ?? {};
  const d = await rest(base, key, "GET", `runner_decisions?id=eq.${id}&select=expires_at`);
  const expires = d.ok && Array.isArray(d.json) && d.json[0] ? d.json[0].expires_at : null;

  console.log(`Decision ${id} — reversible until ${chicago(expires)}: select * from public.reverse_decision('${id}', 'John', '<why>');`);
  console.log(`Answered: ${answered ?? 0}; withdrawn: ${withdrawn ?? 0}; left for John: ${pushed_to_john ?? 0}`);
  // The function's own counts for the second desk. A number the function returns and nobody prints
  // is a number nobody reads: `asks` and `knowledge_lines` differ whenever a `no` was ruled.
  console.log(`Knowledge asks ruled: ${asks ?? 0}; line(s) appended to ${KNOWLEDGE_SLUG}: ${knowledge_lines ?? 0}`);
  console.log(`Still open for John: ${Array.isArray(left) && left.length ? left.join(", ") : "(none)"}`);
  process.exitCode = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.prepare) return prepare(args);
  if (args["dry-run"]) return dryRun(args);
  if (args.apply) return apply(args);
  die(2, "usage: design-ruling.js --prepare [--out=<path>] [--json] | --dry-run=<answer.json> --context=<prepare.json> | --apply=<answer.json> --context=<prepare.json> (--cycle-id=<uuid> | --session-name=<name>)");
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`design-ruling: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
