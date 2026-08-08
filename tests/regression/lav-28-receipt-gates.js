// DeepBench v7.0.63 | tests/regression/lav-28-receipt-gates.js | LAV-28c
//
// The §19s receipt contract's CONTENT/CONTEXT QA, persisted (STANDARDS.md Section 4's SES-009a
// convention). John's mandate, verbatim: "The QA must test context and content of what is created,
// not simply output." Six mechanical gates over a real run's streamed frames — word caps, act-verb
// presence, a findings firewall, a jargon denylist, number-truth, and receipt presence.
//
// TWO MODES, deliberately:
//   1. `node tests/regression/lav-28-receipt-gates.js <capture.json|.jsonl>` — eat a REAL captured
//      run, print per-gate PASS/FAIL with offenders verbatim, exit non-zero on any FAIL. This is
//      the mode the ship-time QA runs; a gates file that has never eaten real frames is not done.
//   2. no argument (and how run-all.js imports it) — the fixture suite below. Every gate is
//      asserted BOTH ways: it passes a clean receipt AND fires on a crafted violation of its own
//      rule and no other. A gate that cannot fail is a vacuous gate (the LOO-013 lesson: assert on
//      the path taken, not merely on a green result).
//
// Mode 2 must stay green forever — it tests the gate FUNCTIONS. Mode 1 reports on whatever run it
// is handed and is expected to FAIL while the caps remain advisory at the API layer (S-LAV-28b
// found `maxLength` unenforced; a hard validate-and-retry is S-LAV-28d). That is the point: the
// close-out gets real measured numbers, not a reassuring green.
//
// SES-69 discipline: no display code is re-implemented here. These gates read the agents' own
// streamed `account`/`ask_line` content — the fields themselves, not any screen's rendering of
// them — so there is no fold or component to import. The one piece of real platform mechanism this
// shares with AssemblyView.jsx's fold is span parentage (§19p): a completion's hop is identified by
// its own credited span, and that hop's platform-measured numbers are the frames carrying that
// span. Reproduced over RAW SSE frames because the fold reads LEDGER rows (a different shape), and
// a wrong shared import would be worse than an honest local one.
//
// MUTATION (SES-69, stated so it can be re-run): delete `"retrieved"` from ACT_VERBS and the
// act-shape group must FAIL — its clean fixture receipt stops finding any act verb. Delete the
// 5-gram loop's `deliverable` argument and the firewall group must FAIL.

import assert from "node:assert";
import fs from "node:fs";
import { isEntryPoint, selfRun } from "./_lib/self-run.js";

// ── the contract's own constants (§19s Receipt-format amendment) ──────────────
export const MAX_ACCOUNT_WORDS = 10;   // the doer's receipt: the act performed, ten words or fewer
export const MAX_ASK_LINE_WORDS = 5;   // the asker's headline: five words or fewer
export const FIREWALL_NGRAM = 5;       // a receipt restating findings is a FAIL even when accurate

// S-LAV-28b Task 1's measured count: intents whose contract declares no `properties` have no field
// to require, so they keep the §19s template degrade — 7 of 33, counted and NOT converted. Gate 6
// hardcodes the COUNT, never the slugs (a slug list would rot into a per-intent allowlist, which is
// the per-row enforcement home §19s just removed). If a run shows more distinct intents completing
// without a receipt than this, coverage has REGRESSED and the gate says so.
export const SCHEMA_LESS_INTENT_COUNT = 7;

// Act verbs, as DATA and extendable by design (the kickoff's own instruction). The gate's real job
// is catching a receipt that performs no act — a finding, a status, a noun phrase. The base list is
// S-LAV-28c's kickoff verbatim; `reviewed` is this session's one addition, justified by real
// captured content ("Reviewed agent roster for …" is a genuine past-tense act receipt of exactly
// the same family). Extend it the same way: only for a verb real data proves is a true act.
export const ACT_VERBS = [
  "retrieved", "pulled", "drafted", "verified", "confirmed", "formatted", "selected",
  "routed", "checked", "wrote", "rewrote", "searched", "found", "flagged",
  "reviewed",
];

// Platform vocabulary that must never reach a user-facing receipt (§19s: "client language —
// passages, records, sources — never chunks, intents, schemas, tokens"). Stored as stems so plural
// and possessive forms are caught by the same entry.
export const JARGON_DENYLIST = [
  "chunk", "intent", "schema", "token", "capability", "delegation", "slug", "payload", "endpoint",
];

// Spelled-out integers count as spoken numbers: real receipts say "four records", not "4 records",
// and a digits-only gate would never fire on live content — a vacuous gate (SES-29's lesson).
const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

const COMPLETION_TYPES = new Set(["delegation_return", "delegation_complete"]);
const START_TYPES = new Set(["delegation"]);

// ── shared helpers ────────────────────────────────────────────────────────────
const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
export const wordsOf = (s) => (str(s) ? str(s).split(/\s+/).length : 0);
const normalize = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// §19p, the same credit convention pickCreditedSpan applies: a `delegation_complete` credits the
// span that finished (to_span_id); every other delegation-family frame credits from_span_id.
export function hopSpanOf(frame) {
  if (!frame) return null;
  return (frame.type === "delegation_complete" ? frame.to_span_id : frame.from_span_id) ?? null;
}

// An execution's own declared work, indexed by the span that ran it. `prompt_assembled` is the one
// frame that declares both together; a delegation START names the same slug but the REQUESTER's
// span, so indexing it would file delegated work under the asker.
export function declaredWorkBySpan(frames) {
  const bySpan = new Map();
  for (const f of frames || []) {
    if (!f || f.type !== "prompt_assembled") continue;
    const span = f.span_id ?? null;
    const slug = str(f.toIntentSlug);
    if (span == null || !slug || bySpan.has(span)) continue;
    bySpan.set(span, slug);
  }
  return bySpan;
}

// Every number the PLATFORM measured on this hop's own frames: the completion frame's own numeric
// fields, plus the numeric fields (matchCount, tokens, …) and array lengths of every frame sharing
// its span. Never widened to the whole run — a count is true "on that hop's own frames" or it is
// not true (the gate names the hop when it is not).
export function platformNumbersForHop(frames, span, completion) {
  const nums = new Set();
  const harvest = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const v of Object.values(obj)) {
      if (typeof v === "number" && Number.isFinite(v)) nums.add(v);
      else if (Array.isArray(v)) nums.add(v.length);
    }
  };
  harvest(completion);
  if (span != null) {
    for (const f of frames || []) {
      if (!f || f === completion) continue;
      if ((f.span_id ?? null) === span || (f.parent_span_id ?? null) === span) harvest(f);
    }
  }
  return nums;
}

// Digits and spelled-out integers alike. Returns [{ token, value }].
export function spokenNumbers(text) {
  const out = [];
  for (const m of String(text ?? "").matchAll(/\d+/g)) out.push({ token: m[0], value: Number(m[0]) });
  for (const w of normalize(text).split(" ")) {
    if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, w)) out.push({ token: w, value: NUMBER_WORDS[w] });
  }
  return out;
}

function ngrams(text, n) {
  const w = normalize(text).split(" ").filter(Boolean);
  const out = new Set();
  for (let i = 0; i + n <= w.length; i += 1) out.add(w.slice(i, i + n).join(" "));
  return out;
}

// Each receipt, tagged with the hop it belongs to so an offender can be NAMED rather than merely
// counted. `who` is frame identity, never a roster lookup — this file resolves no agent names.
export function receiptsOf(frames) {
  const bySpan = declaredWorkBySpan(frames);
  const accounts = [];
  const askLines = [];
  for (const f of frames || []) {
    if (!f) continue;
    if (COMPLETION_TYPES.has(f.type)) {
      const span = hopSpanOf(f);
      accounts.push({
        frame: f, span, text: str(f.account),
        intent: bySpan.get(span) ?? null,
        hop: `${f.type} ${f.fromAgentId ?? "?"}→${f.toAgentId ?? "?"} (${bySpan.get(span) ?? "unknown intent"})`,
      });
    }
    if (START_TYPES.has(f.type)) {
      askLines.push({
        frame: f, text: str(f.ask_line),
        hop: `${f.type} ${f.fromAgentId ?? "?"}→${f.toAgentId ?? "?"} (${str(f.toIntentSlug) ?? "unknown intent"})`,
      });
    }
  }
  return { accounts, askLines };
}

// ── the six gates ─────────────────────────────────────────────────────────────
// Every gate returns { name, pass, offenders[] }. Offenders quote the receipt VERBATIM: a caps
// report that paraphrases what the agent wrote is useless for fixing the Skill that wrote it.
const gate = (name, offenders) => ({ name, pass: offenders.length === 0, offenders });

export function gateLength({ accounts, askLines }) {
  const offenders = [];
  for (const a of accounts) {
    if (a.text && wordsOf(a.text) > MAX_ACCOUNT_WORDS) {
      offenders.push(`account ${wordsOf(a.text)} words (>${MAX_ACCOUNT_WORDS}) — ${a.hop} — "${a.text}"`);
    }
  }
  for (const q of askLines) {
    if (q.text && wordsOf(q.text) > MAX_ASK_LINE_WORDS) {
      offenders.push(`ask_line ${wordsOf(q.text)} words (>${MAX_ASK_LINE_WORDS}) — ${q.hop} — "${q.text}"`);
    }
  }
  return gate("1. Length caps (account ≤10 words, ask_line ≤5 words)", offenders);
}

export function gateActShape({ accounts }) {
  const offenders = [];
  for (const a of accounts) {
    if (!a.text) continue;
    const words = new Set(normalize(a.text).split(" "));
    if (!ACT_VERBS.some(v => words.has(v))) {
      offenders.push(`no past-tense act verb — ${a.hop} — "${a.text}"`);
    }
  }
  return gate("2. Act shape (every account performs a past-tense act)", offenders);
}

export function gateFindingsFirewall({ accounts }, deliverable) {
  const deliverableGrams = ngrams(deliverable, FIREWALL_NGRAM);
  const offenders = [];
  for (const a of accounts) {
    if (!a.text) continue;
    for (const g of ngrams(a.text, FIREWALL_NGRAM)) {
      if (deliverableGrams.has(g)) {
        offenders.push(`restates the deliverable ("${g}") — ${a.hop} — "${a.text}"`);
        break;
      }
    }
  }
  return gate(`3. Findings firewall (no ${FIREWALL_NGRAM}-word sequence shared with the deliverable)`, offenders);
}

export function gateJargon({ accounts, askLines }) {
  const offenders = [];
  const check = (kind, r) => {
    if (!r.text) return;
    const words = normalize(r.text).split(" ");
    const hits = JARGON_DENYLIST.filter(j => words.some(w => w === j || w === `${j}s`));
    if (hits.length) offenders.push(`${kind} uses platform jargon [${hits.join(", ")}] — ${r.hop} — "${r.text}"`);
  };
  for (const a of accounts) check("account", a);
  for (const q of askLines) check("ask_line", q);
  return gate("4. Jargon denylist (client language only)", offenders);
}

export function gateNumberTruth({ accounts }, frames) {
  const offenders = [];
  for (const a of accounts) {
    if (!a.text) continue;
    const measured = platformNumbersForHop(frames, a.span, a.frame);
    for (const { token, value } of spokenNumbers(a.text)) {
      if (!measured.has(value)) {
        offenders.push(`speaks "${token}" (=${value}), not measured on this hop [platform measured: ${
          [...measured].sort((x, y) => x - y).join(", ") || "nothing"}] — ${a.hop} — "${a.text}"`);
      }
    }
  }
  return gate("5. Number truth (every count spoken was measured on that hop's own frames)", offenders);
}

export function gatePresence({ accounts, askLines }) {
  const offenders = [];
  const missingIntents = new Set();
  for (const a of accounts) {
    if (a.text) continue;
    missingIntents.add(a.intent ?? "unknown intent");
    offenders.push(`completion carries no account — ${a.hop}`);
  }
  for (const q of askLines) {
    if (!q.text) offenders.push(`start carries no ask_line — ${q.hop}`);
  }
  // The schema-less exceptions are allowed to exist; they are NOT allowed to grow. Distinct intents
  // completing without a receipt above 28b's measured count means coverage regressed.
  if (missingIntents.size > SCHEMA_LESS_INTENT_COUNT) {
    offenders.push(`${missingIntents.size} distinct intents completed with no account, above the ${
      SCHEMA_LESS_INTENT_COUNT} schema-less intents S-LAV-28b measured — coverage regressed`);
  }
  return gate("6. Presence (every schema-carrying completion has an account; every start an ask_line)", offenders);
}

// Missing receipts are reported by gate 6 alone; gates 1–5 judge the receipts that exist, so an
// absent one can never be counted as two separate failures.
export function runGates(frames, deliverable) {
  const receipts = receiptsOf(frames);
  return [
    gateLength(receipts),
    gateActShape(receipts),
    gateFindingsFirewall(receipts, deliverable),
    gateJargon(receipts),
    gateNumberTruth(receipts, frames),
    gatePresence(receipts),
  ];
}

// ── capture loading (mode 1) ──────────────────────────────────────────────────
// Accepts { frames, deliverable }, a bare frame array, or JSONL (one frame per line). The
// deliverable falls back to every string inside the terminal result frame's own `content`, which is
// where the run's real answer lives — the firewall is meaningless against an empty deliverable.
export function harvestDeliverable(frames) {
  const parts = [];
  const walk = (v) => {
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  for (const f of frames || []) if (f && f.type === "result") walk(f.result?.content);
  return parts.join("\n");
}

export function loadCapture(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  let frames = null;
  let deliverable = null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) frames = parsed;
      else { frames = parsed.frames ?? []; deliverable = parsed.deliverable ?? null; }
    } catch { /* fall through to JSONL */ }
  }
  if (!frames) {
    frames = [];
    for (const line of raw.split("\n")) {
      const l = line.trim();
      if (!l) continue;
      try { frames.push(JSON.parse(l)); } catch { /* not a frame line */ }
    }
  }
  if (deliverable == null) deliverable = harvestDeliverable(frames);
  return { frames, deliverable };
}

function reportCapture(filePath) {
  const { frames, deliverable } = loadCapture(filePath);
  const { accounts, askLines } = receiptsOf(frames);
  console.log(`LAV-28 receipt gates — ${filePath}`);
  console.log(`  ${frames.length} frames · ${accounts.length} completion receipts · ${
    askLines.length} dispatch headlines · deliverable ${deliverable.length} chars\n`);
  const results = runGates(frames, deliverable);
  let failed = 0;
  for (const r of results) {
    console.log(`  [${r.pass ? "PASS" : "FAIL"}] ${r.name}`);
    if (!r.pass) failed += 1;
    for (const o of r.offenders) console.log(`         · ${o}`);
  }
  console.log(`\n  ${results.length - failed}/${results.length} gates passed`);
  process.exit(failed > 0 ? 1 : 0);
}

// ── fixture suite (mode 2) ────────────────────────────────────────────────────
// A clean run every gate passes, then one crafted violation per gate. Frame shapes are the real
// ones captured on S-LAV-28b's live runs (2026-08-07): a delegation start carrying task+ask_line, a
// `prompt_assembled` declaring the delegate's own span+intent, an `assembly_work_complete` fetch,
// and a `delegation_return` carrying the account. No `delegation_complete` appears anywhere,
// because none streams live — that absence IS the bug this contract had to survive.
const CLEAN_DELIVERABLE =
  "Smartphone upgrade cycles vary by country: Japan sits near 26 months while Mexico runs longer.";

function cleanFrames() {
  return [
    { type: "prompt_assembled", agentId: "requester", toIntentSlug: "ci-answer-intent", span_id: "SPAN-A" },
    { type: "delegation", fromAgentId: "requester", toAgentId: "doer", viaTool: "delegate_to_agent",
      toIntentSlug: "library-evidence-intent", task: "Retrieve the full set of records covering upgrade cycles",
      ask_line: "Upgrade cycles by country", from_span_id: "SPAN-A", to_span_id: null },
    { type: "prompt_assembled", agentId: "doer", toIntentSlug: "library-evidence-intent",
      span_id: "SPAN-B", parent_span_id: "SPAN-A" },
    { type: "assembly_work_complete", agentId: "doer", work: "fetch", source: "the_library",
      matchCount: 10, span_id: "SPAN-B", parent_span_id: "SPAN-A" },
    { type: "delegation_return", fromAgentId: "doer", toAgentId: "requester",
      account: "Retrieved ten sourced records on upgrade cycles",
      from_span_id: "SPAN-B", to_span_id: "SPAN-A" },
  ];
}

// Replace the run's single account (or ask_line) with a crafted violation.
function withReceipt(patch) {
  const frames = cleanFrames();
  const ret = frames.find(f => f.type === "delegation_return");
  const start = frames.find(f => f.type === "delegation");
  if ("account" in patch) ret.account = patch.account;
  if ("ask_line" in patch) start.ask_line = patch.ask_line;
  return frames;
}

const byName = (results, n) => results[n - 1];

export default async function run() {
  // ── group 1: the clean run passes all six ───────────────────────────────────
  const clean = runGates(cleanFrames(), CLEAN_DELIVERABLE);
  assert.strictEqual(clean.length, 6, "six gates must run");
  for (const r of clean) {
    assert.ok(r.pass, `clean run must pass ${r.name} — offenders: ${r.offenders.join(" | ")}`);
  }

  // ── group 2: each gate fires on ITS OWN violation and no other ──────────────
  // The discriminating half. A gate that only ever passes proves nothing (LOO-013).
  const cases = [
    { n: 1, frames: withReceipt({ account: "Retrieved ten sourced records covering upgrade cycles across every surveyed country today" }),
      why: "eleven-word account must break the 10-word cap" },
    { n: 1, frames: withReceipt({ ask_line: "Upgrade cycles by country and by carrier" }),
      why: "seven-word ask_line must break the 5-word cap" },
    { n: 2, frames: withReceipt({ account: "Ten sourced records on upgrade cycles" }),
      why: "an account with no act verb must fail act shape" },
    // Deliberately a WELL-FORMED receipt in every other respect — act verb present, inside the cap,
    // no jargon, no number — so the only thing wrong with it is that it restates findings. §19s:
    // "a receipt that restates findings is a FAIL even when accurate."
    { n: 3, frames: withReceipt({ account: "Confirmed upgrade cycles vary by country" }),
      why: "an account restating the deliverable must trip the firewall" },
    { n: 4, frames: withReceipt({ account: "Retrieved ten chunks from the library" }),
      why: "platform jargon must be denied" },
    { n: 5, frames: withReceipt({ account: "Retrieved forty sourced records on upgrade cycles" }),
      why: "a count the platform never measured must fail number truth" },
    { n: 6, frames: withReceipt({ account: null }),
      why: "a completion with no account must fail presence" },
  ];
  for (const c of cases) {
    const results = runGates(c.frames, CLEAN_DELIVERABLE);
    const target = byName(results, c.n);
    assert.ok(!target.pass, `${c.why} (gate ${c.n}: ${target.name})`);
    assert.ok(target.offenders.length > 0, `gate ${c.n} must name its offender`);
    for (const other of results) {
      if (other === target) continue;
      assert.ok(other.pass,
        `gate ${c.n}'s violation must not also trip ${other.name} — offenders: ${other.offenders.join(" | ")}`);
    }
  }

  // ── group 3: the mechanism helpers, asserted directly ──────────────────────
  // Span credit follows §19p's convention, not the frame's position.
  assert.strictEqual(hopSpanOf({ type: "delegation_return", from_span_id: "X", to_span_id: "Y" }), "X");
  assert.strictEqual(hopSpanOf({ type: "delegation_complete", from_span_id: "X", to_span_id: "Y" }), "Y");
  // A delegation START must never define its span's declared work (it carries the ASKER's span).
  const idx = declaredWorkBySpan(cleanFrames());
  assert.strictEqual(idx.get("SPAN-A"), "ci-answer-intent", "the asker's span keeps its own intent");
  assert.strictEqual(idx.get("SPAN-B"), "library-evidence-intent", "the doer's span declares the delegated work");
  // Spelled-out integers are spoken numbers; a digits-only reader would never fire on live content.
  assert.deepStrictEqual(spokenNumbers("Retrieved four records").map(s => s.value), [4]);
  assert.deepStrictEqual(spokenNumbers("Retrieved 74 records").map(s => s.value), [74]);
  // Word counting is whitespace-based and null-safe (CHI-65 class: never assume a string arrived).
  assert.strictEqual(wordsOf(null), 0);
  assert.strictEqual(wordsOf("   "), 0);
  assert.strictEqual(wordsOf("Upgrade cycles by country"), 4);
}

// A capture path turns this into mode 1; otherwise it is the fixture suite (and run-all.js's
// import reaches neither branch, calling the default export directly).
if (isEntryPoint(import.meta.url, process.argv[1]) && process.argv[2]) {
  reportCapture(process.argv[2]);
} else {
  selfRun(import.meta.url, run);
}
