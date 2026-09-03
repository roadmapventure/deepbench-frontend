#!/usr/bin/env node
// DeepBench v7.0.410 | scripts/render-standing-brief.js | SES-004 — THE JOHN-MODEL REPORTS ITS SIGNAL,
// AND REPORTS A COUNT UNTIL 30 DECISIONS EARN A RATE. A second fact group, `John-model`, lands AFTER
// `Judgment classes` and BEFORE the provenance footer: how often a decision that leaned on a standing
// criterion of John's (`public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md` by
// `scripts/export-decision-patterns.js`) stood unreversed through its reversal window.
//
// THE FLOOR LIVES IN THE VIEW, NOT HERE, and that is the one thing to read twice. The M7 gate
// (decision 05cc2722, ruling iii) set 30 finalised-or-reversed decisions as the point a rate means
// anything; `public.john_model_signal` returns `agreement_rate = NULL` below it, and
// renderJohnModel() branches on that NULL rather than on its own comparison. So the constant printed
// in the prose is a LABEL, never the decision — move the floor in the view and the brief follows with
// no edit here. A renderer that applied the floor itself would be a second home for it.
// THE EDIT THIS FORBIDS: dividing in this file. Live at this ship: 10 open decisions, 0 finalised,
// 0 reversed, 0 of them citing a pattern — every one of which is a count, and none of which is a rate.
//
// DeepBench v7.0.409 | scripts/render-standing-brief.js | SES-84 — THE PER-CLASS CENSUS OF THE VISION
// CORPUS IS ON THE PAGE, AND RATIFICATION IS A STANDING METRIC, NOT A FINISH LINE. The M7 design gate
// (decision 05cc2722, ruling ii) re-scoped SES-84: every live vision_claims row carries a judgment
// class (P1–P4) or an explicit class-neutral mark, and the standing brief renders, per class, the
// ratified / proposed / rejected counts and the newest proposed root claim. John ruled 2026-08-23 that
// there is no terminal "understood" state for a class, so the counts are reported, never gated on.
//
// THE NUMBERS COME FROM A VIEW, NOT FROM THIS FILE. `public.judgment_class_census` is the one home for
// the census (SES-159's class-understanding loop reads the same view); this script names its columns
// and renders what comes back. Nothing here re-derives a count from vision_claims rows, because two
// implementations of one census is how "two surfaces, two numbers" starts.
//
// ONE FACT GROUP, `Judgment classes`, AFTER Open decisions and BEFORE the provenance footer. The view
// joins fetchFacts() and its rows join the factsSha() payload, so a claim being classed, ratified,
// rejected or a new root claim MOVES THE SHA and --check reports it. `unclassed` is printed ONLY when
// it is non-zero, as a FLAG line: after SES-84's recorded classification decision it is zero by
// construction, and a non-zero is drift (a claim inserted without a classing decision), not a state
// to report calmly. A MISSING census KEY IS NOT "ZERO CLAIMS" — same rule as the decisions group:
// the SES-177b / SES-286c fixtures predate this ship, and a render whose facts carried no census says
// so rather than publishing zeros it never measured.
//
// DeepBench v7.0.396 | scripts/render-standing-brief.js | SES-286 (c) — OPEN DECISIONS ARE ON THE
// PAGE JOHN READS, WITH THE LINE THAT UNDOES EACH. Parts (a) (v7.0.394) and (b) (v7.0.395) gave a
// decision a row, an expiry and a handle, and told the cycle and the attended close-out where to
// record it and when to sweep it. The handle then lived in a cycle's notes and a ticket description
// — two places John does not read. This block is the one surface every attended session and John
// both read, and it is regenerated at every ship (SES-265), so this is where "reverse is always one
// tap away" (charter goal 5) becomes, for a decision, one line he can copy.
//
// WHAT IS NEW AND WHERE IT IS NOT: one fact group, `Open decisions`, between the drain census and
// the provenance footer; runner_decisions in fetchFacts(); and the open ids, their expiries and both
// weekly counts in the factsSha() payload, so a decision opening, finalising or being reversed MOVES
// THE SHA and --check reports it. Nothing outside the markers moves — the head/tail assertion below
// is untouched, and if a change here made it fire, the change would be wrong, not the assertion.
//
// THE HANDLE IS THE FULL UUID, never the 8-char prefix the bullet displays. The prefix is for
// reading; reverse_decision() takes the whole id, and a bullet that printed only the prefix would
// hand John a line that cannot run — which is worse than no line at all, because it looks like one.
//
// "THIS WEEK" IS A ROLLING 7 DAYS AND SAYS SO. The kickoff offered the Friday-07:00Z weekly reset
// "the file already uses for its census" — measured this session, no such helper exists anywhere in
// scripts/ or docs/runbooks/, and this file's census is a point-in-time count with no week boundary
// at all. Inventing one here would be a number nobody else in the platform computes, so the counts
// are a rolling 7 days back from render time and the block labels them as that rather than leaving
// "this week" to be read as a calendar week.
//
// A MISSING decisions KEY IS NOT "NONE OPEN". renderBlock() tolerates a facts object built without
// one (the SES-177b fixtures predate this ship) and SAYS the ledger was not read. Reporting a zero
// it never measured would be the stale-number defect this whole script exists against, in the one
// place John would trust it most.
//
// DeepBench v7.0.393 | scripts/render-standing-brief.js | SES-310 — the drain census says which
// members are the FINISH LINE (milestone_required), not just how many are named; SES-177 (b) — the
// standing brief's DERIVABLE facts become a generated block; its judgment prose is never touched.
//
// SES-310 (v7.0.393). The drain bullet used to report "N of M named members still open", which is the
// number drain_epic_next() stopped retiring on: since this ship the finish line is the members the
// GATE ruled required (backlog_items.milestone_required, SES-304 / M5-04) whenever the list carries
// such a ruling. Measured live 2026-09-02: the M5 drain 238aa9ca had 9 required members, 0 of them
// open, and 3 open non-required ones — so "3 of 18 named still open" read as unfinished work when the
// milestone was in fact complete. The bullet now leads with requiredOpen-of-required and reports the
// rest as explicitly NOT the finish line; with no gate ruling (required === 0) the old wording is
// unchanged, the same fail-closed direction the function takes.
//
// WHY THIS IS ADDITIVE AND NOT AN EXTRACTION, which is the whole design and the thing an editor will
// undo by habit. SES-177 part (a) (v7.0.228) split CLAUDE-STATE.md and moved the standing judgment
// paragraph VERBATIM into docs/runbooks/standing-brief.md. It then named its own remainder and
// REFUSED it, correctly: "splitting the board census / drain state / scheduler settings back OUT of
// that prose ... is deliberately not attempted here — the paragraph interleaves those facts with
// judgment, and a surgical extraction is the same destroy-what-you-cannot-see risk this script exists
// to refuse." That refusal stands. This script does not extract anything. It renders the live facts
// into a marked block ABOVE the paragraph and is structurally incapable of writing outside it.
//
// MEASURED BEFORE A LINE CHANGED, because "the numbers drift" is a claim and not evidence. Live at
// 2026-08-24T23:2xZ, every derivable number in that hand-maintained paragraph was wrong: open tickets
// 561 -> 581, numbered 561 -> 591, rows 611 -> 670, designed 16 -> 15, needs-desktop 0 -> 2,
// needs-john 1 -> 9, NULL 546 -> 549, drain 11-of-18 open -> 3-of-10. One of them is not merely stale
// but operationally wrong: the paragraph says the scheduler runs every 3 hours (12/3/6/9 on John's
// clock) and runner_settings.interval_hours has been 1 since 22:03Z that day. Every session reads
// that sentence at start.
//
// THE GUARANTEE, and it is asserted rather than intended: only the region between the two markers may
// change. The script splices, then compares the head (before BEGIN) and the tail (after END)
// byte-for-byte with what it read; one byte of difference outside the markers and it exits 2 having
// written nothing. The v7.0.197 briefing wipe — a rebuild from a source that did not cover the whole
// file, publishing a tidy skeleton over real content — is not mitigated here by care. It is
// unreachable.
//
// THE "AS OF" STAMP IS JOHN'S, AND IT OVERRODE THIS SCRIPT'S FIRST DESIGN. His Accept on gated card
// 8c0f2bf9 (attended architect session, 2026-08-24T23:08:29Z) is the operative build spec, verbatim:
// "option RENDER-FROM-TABLES — board census from backlog_items, drain state from
// runner_directives/runner_drain_scope, scheduler line from runner_settings, all generated at build
// time; judgment prose in docs/runbooks/standing-brief.md stays byte-for-byte untouched; EVERY
// GENERATED LINE CARRIES AN 'as of <timestamp>'."
//
// The first build of this script omitted the stamp deliberately, borrowing
// export-backlog-snapshot.js's determinism convention (no clock in the body, provenance is a payload
// sha256) so that --check stayed meaningful. That reasoning is sound and it is NOT the decision: John
// asked for the stamp, and a cycle's own preference does not outrank his word. So the stamp ships.
//
// WHAT KEEPS --check MEANINGFUL ANYWAY, since the obvious consequence of a clock in the body is a
// check that fires on every run and is therefore ignored within a day: --check compares the FACTS,
// never the stamp. The payload sha256 is embedded in the block, and drift is `the sha moved`. A
// refreshed stamp over identical facts is reported as exactly that and is not drift. Two questions,
// two answers: the stamp says WHEN this was last read, the sha says WHETHER it still matches the
// tables. Do not collapse them by making --check diff the whole block.
//
// renderBlock() takes the timestamp as an ARGUMENT rather than reading the clock itself, so it stays
// deterministic under test — a function that reads `new Date()` internally cannot be asserted.
//
// Exit 0 = rendered, or --check found no drift. Exit 1 = --check found drift. Exit 2 = COULD NOT RUN
// (missing env, REST failure, missing/!unique markers, missing judgment sentinel, or a head/tail that
// moved). Exit 2 is never a pass — the export-backlog-snapshot.js / heal-engine.js convention.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRIEF_REL = "docs/runbooks/standing-brief.md";
const BRIEF_ABS = path.join(ROOT, BRIEF_REL);

export const BEGIN = "<!-- BEGIN GENERATED — scripts/render-standing-brief.js — do not hand-edit inside this block -->";
export const END = "<!-- END GENERATED — scripts/render-standing-brief.js -->";

// The judgment prose part (a) moved here verbatim. Its opening is the sentinel: if it is gone, the
// file is not the standing brief any more and this script must not write a block into whatever it is.
export const JUDGMENT_SENTINEL = "**Next session:**";

function die(msg, code = 2) {
  console.error(`render-standing-brief: ${msg}`);
  process.exit(code);
}

// --- pure helpers (imported directly by tests/regression/SES-177b-standing-brief-block.js, per
//     John's "never throw away tests" rule and the DIR-603f44ea / SES-176 precedent: the guard must
//     assert the REAL predicate, never a copy that passes forever while the shipped file rots) ------

/** Split a file into [head, body, tail] around the markers. Throws with a precise reason otherwise. */
export function splitOnMarkers(text) {
  const b = text.indexOf(BEGIN);
  const e = text.indexOf(END);
  if (b === -1) throw new Error(`the BEGIN marker is missing from ${BRIEF_REL}`);
  if (e === -1) throw new Error(`the END marker is missing from ${BRIEF_REL}`);
  if (e < b) throw new Error("the END marker precedes the BEGIN marker");
  if (text.indexOf(BEGIN, b + 1) !== -1) throw new Error("the BEGIN marker appears more than once");
  if (text.indexOf(END, e + 1) !== -1) throw new Error("the END marker appears more than once");
  return [text.slice(0, b), text.slice(b + BEGIN.length, e), text.slice(e + END.length)];
}

/**
 * The fail-closed predicate: the hand-maintained judgment prose must still be in the file.
 *
 * IT IS LINE-ANCHORED, AND THAT IS NOT TIDINESS. Found while building this: the first form was
 * `text.includes(JUDGMENT_SENTINEL)`, and this file's own header comment QUOTES the sentinel while
 * explaining the rule -- so the predicate was satisfied by the explanation of itself, and would have
 * returned true for a brief whose judgment paragraph had been deleted entirely. That is the SES-180
 * self-flagging failure in a second costume: a checker that matches its own documentation. Only a
 * line that STARTS with the sentinel is the paragraph.
 */
export function keepsJudgmentProse(text) {
  return typeof text === "string" && text.split("\n").some(l => l.startsWith(JUDGMENT_SENTINEL));
}

export function pct(n, total) {
  return total > 0 ? `${Math.round((n / total) * 1000) / 10}%` : "—";
}

/** Census of one column over rows, rendered as a stable `key n` list ordered by count then key. */
export function census(rows, key, nullLabel = "NULL") {
  const m = new Map();
  for (const r of rows) {
    const k = r[key] == null ? nullLabel : String(r[key]);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const CLOSED = new Set(["done", "removed"]);

/** The payload sha over the FACTS only — never the stamp. This is what --check compares. */
export function factsSha(facts) {
  const payload = JSON.stringify({
    items: facts.items.map(r => [r.id, r.status, r.design_status, r.queue]).sort(),
    settings: facts.settings || null,
    drain: facts.drain || null,
    // FEATURE: SES-286 (c) — the open ids, their EXPIRIES and both counts, so a decision opening, a
    // sweep finalising one, or a reversal each move the sha and --check reports the drift. The
    // 7-day cutoff itself is deliberately ABSENT from this payload: it advances with the clock, so
    // including it would report drift on every single run and the check would be ignored inside a
    // day — the same reason the "as of" stamp is not in here either.
    decisions: facts.decisions
      ? {
          open: facts.decisions.open.map(d => [d.id, d.expires_at]).sort(),
          finalWeek: facts.decisions.finalWeek,
          reversedWeek: facts.decisions.reversedWeek,
        }
      : null,
    // FEATURE: SES-84 — the per-class census rows, so a claim being classed, ratified, rejected, a
    // new root claim, or an `unclassed` row appearing each move the sha. The claim TEXT is
    // deliberately absent: the ref identifies the newest root claim, and a text edit that keeps the
    // same ref is not a census change.
    census: Array.isArray(facts.census)
      ? facts.census.map(r => [r.judgment_class, r.ratified, r.proposed, r.rejected, r.total, r.newest_root_claim_ref || null])
      : null,
    // FEATURE: SES-004 — the John-model rows, so a decision citing a pattern, one finalising, one
    // being reversed, or the rate crossing the floor each move the sha and --check reports the
    // drift. The IMPERATIVE is deliberately absent for the same reason the claim TEXT is above: the
    // number identifies the criterion, and re-wording one in the md is not a change in the signal.
    // agreement_rate is stringified because PostgREST returns a numeric as a string and a
    // fixture-driven test writes a JS number — the sha must not depend on which one produced it.
    johnModel: Array.isArray(facts.johnModel)
      ? facts.johnModel.map(r => [
          r.scope, r.pattern_no == null ? null : Number(r.pattern_no),
          Number(r.citing_decisions), Number(r.finalised_unreversed), Number(r.reversed), Number(r.open),
          r.agreement_rate == null ? null : String(Number(r.agreement_rate)),
        ]).sort()
      : null,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/** The sha embedded in an already-rendered block, or null. Lets --check compare facts, not bytes. */
export function shaFromBlock(block) {
  const m = /sha256:([0-9a-f]{16})/.exec(String(block || ""));
  return m ? m[1] : null;
}

/**
 * FEATURE: SES-286 (c) — ONE CST formatter, two callers. The stamp's CST half and a decision's
 * "finalises …" time are the same display rule (John, 2026-08-20, and register B35's second ruling:
 * a time he reads is CST and is labelled), so they must not be two format strings that can drift
 * apart. EXTRACTED from asOf() rather than copied out of it — asOf() now calls this, so there is
 * exactly one place the format lives.
 */
export function cst(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`cst: not a date: ${iso}`);
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }) + " CST";
}

/**
 * FEATURE: SES-286 (c) — a decision summary, safe to put in a markdown bullet.
 *
 * THE BACKTICK IS THE ONE THAT MATTERS, and it is not tidiness: the bullet ENDS with an inline code
 * span carrying the reverse_decision() line, so a single backtick anywhere in a free-text summary
 * opens a span early and swallows the handle John came to copy. Summaries are written by cycles into
 * runner_decisions.summary, which carries no format constraint at all (SES-286a: NOT NULL and
 * non-blank, nothing more), so this is untrusted text landing on John's page. Newlines collapse for
 * the same reason — one bullet has to stay one line.
 */
export function summarise(s, max = 120) {
  const flat = String(s == null ? "" : s).replace(/`/g, "'").replace(/\s+/g, " ").trim();
  if (!flat) return "—";
  return flat.length > max ? flat.slice(0, max - 1).trimEnd() + "…" : flat;
}

/**
 * FEATURE: SES-84 — the four judgment classes in the fixed order the census view emits them
 * (`ord` 1–4). Named form always (John, 2026-08-20: `P10 - Tooling`, never a bare `P9`).
 */
export const CLASS_ORDER = [
  "P1 - Improves John's Skills",
  "P2 - Inventive",
  "P3 - Investor Value",
  "P4 - New Customers",
];

/**
 * FEATURE: SES-84 — the `Judgment classes` fact group. PURE: (census rows, stamp) in, markdown out,
 * so tests/regression/ses-84-claims-classed.test.mjs drives it from a fixture the same way the
 * SES-177b / SES-286c guards drive renderBlock(). `census` is exactly what fetchFacts() reads from
 * `public.judgment_class_census` — one row per class in P1→P4 order, then `neutral`, then
 * `unclassed` — and nothing here counts anything: the view is the census, this is its rendering.
 *
 * THREE BRANCHES, AND THE DIFFERENCE BETWEEN THEM IS THE POINT:
 *   - no census at all (the key is absent or not an array) — SAID, never rendered as zeros;
 *   - a class row missing from the six — an em-dash row, an honest gap rather than an invented 0;
 *   - `unclassed` > 0 — a FLAG line, because after SES-84's recorded decision it is zero by
 *     construction and a non-zero is drift; at zero the row is not printed at all, so the table is
 *     five rows and a sixth row appearing is itself the signal.
 *
 * The claim text goes through summarise(): it is corpus text drafted by agents, some of it quoting
 * file names in backticks, and this bullet ends inside a markdown line — same untrusted-text rule as
 * the decision bullets above.
 */
export function renderJudgmentClasses(census, stamp) {
  const L = [];
  L.push(`**Judgment classes** — *${stamp}.* What the corpus currently holds per pull test, live from ` +
    "`public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a " +
    "standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.");
  L.push("");
  if (!Array.isArray(census)) {
    L.push("- *The class census was not read for this render* — which is **not** the same as *zero " +
      "claims*. Re-run `scripts/render-standing-brief.js` with a service key.");
    L.push("");
    return L.join("\n");
  }
  const byClass = new Map(census.map(r => [r.judgment_class, r]));
  L.push("| class | ratified | proposed | rejected | total |");
  L.push("|---|---:|---:|---:|---:|");
  for (const k of [...CLASS_ORDER, "neutral"]) {
    const r = byClass.get(k);
    if (!r) { L.push(`| \`${k}\` | — | — | — | — |`); continue; }
    L.push(`| \`${k}\` | ${r.ratified} | ${r.proposed} | ${r.rejected} | ${r.total} |`);
  }
  L.push("");
  for (const k of CLASS_ORDER) {
    const r = byClass.get(k);
    const short = k.split(" - ")[0];
    if (r && r.newest_root_claim_ref) {
      L.push(`- Newest proposed root claim for ${short}: \`${r.newest_root_claim_ref}\` — ` +
        summarise(r.newest_root_claim, 160));
    } else {
      L.push(`- Newest proposed root claim for ${short}: *no proposed root claim*.`);
    }
  }
  const un = byClass.get("unclassed");
  const unTotal = un ? Number(un.total) : 0;
  if (unTotal > 0) {
    L.push("");
    L.push(`- **FLAG: ${unTotal} live claim${unTotal === 1 ? "" : "s"} still \`unclassed\`** — after ` +
      "`SES-84` this is zero by construction; a non-zero here is drift (a claim inserted without a " +
      "classing decision) and needs one recorded decision, never a default.");
  }
  L.push("");
  return L.join("\n");
}

/**
 * FEATURE: SES-004 — the floor a rate binds from (M7 gate, decision 05cc2722, ruling iii). It is
 * printed in the prose AND enforced in `public.john_model_signal`, which is why the renderer branches
 * on `agreement_rate === null` rather than on this number: the VIEW decides whether a rate exists,
 * this constant only says the same thing to John in words. A renderer that applied the floor itself
 * would be a second home for it, and the two would drift the first time the gate moves it.
 */
export const JOHN_MODEL_FLOOR = 30;

/** How many patterns the rate branch lists. The five most-cited, never all 162. */
export const JOHN_MODEL_TOP_N = 5;

/**
 * FEATURE: SES-004 — the `John-model` fact group. PURE: (signal rows, stamp) in, markdown out, so
 * tests/regression/ses-004-decision-patterns.test.mjs drives it from fixtures the same way the
 * SES-84 guard drives renderJudgmentClasses(). `signal` is exactly what fetchFacts() reads from
 * `public.john_model_signal`: one `overall` row, then one row per cited criterion.
 *
 * NOTHING HERE COUNTS ANYTHING, and nothing here divides. The view is the census and the view applies
 * the floor; this function reports what came back. **The `overall` row's `agreement_rate` is the ONLY
 * thing that decides which branch prints** — so if the gate ever moves the floor, the brief follows
 * the database without an edit here.
 *
 * THREE BRANCHES, and the difference between them is the point:
 *   - no signal at all (absent or not an array) — SAID, never rendered as zeros, exactly as the class
 *     census does it: a render that could not read the ledger must not publish a number it never
 *     measured;
 *   - below the floor — the COUNTS and an explicit "no rate below N" line. A rate over three
 *     decisions is not a small signal, it is a wrong one;
 *   - at or above the floor — the rate, then the five most-cited criteria with their own counts.
 *
 * Imperatives go through summarise(): they are John's own words copied out of
 * docs/JOHN-DECISION-PATTERNS.md, and several of them quote identifiers in backticks — an unbalanced
 * backtick inside a table cell opens a code span that swallows the rest of the row.
 */
export function renderJohnModel(signal, stamp) {
  const L = [];
  L.push(`**John-model** — *${stamp}.* How often a decision that leaned on a standing pattern of ` +
    "John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; " +
    "the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). " +
    `A rate binds only from ${JOHN_MODEL_FLOOR} finalised-or-reversed decisions (M7 gate, ruling iii).`);
  L.push("");

  if (!Array.isArray(signal)) {
    L.push("- *The John-model signal was not read for this render* — which is **not** the same as " +
      "*no pattern-citing decisions*. Re-run `scripts/render-standing-brief.js` with a service key.");
    L.push("");
    return L.join("\n");
  }

  const overall = signal.find(r => r.scope === "overall");
  if (!overall) {
    // An honest gap, never invented zeros — the same rule as a missing class row in the census.
    L.push("- *The signal returned no `overall` row* — the view is present but did not report a " +
      "total, so there is nothing to state here. Read `public.john_model_signal` directly.");
    L.push("");
    return L.join("\n");
  }

  const n = Number(overall.citing_decisions);
  const f = Number(overall.finalised_unreversed);
  const r = Number(overall.reversed);
  const o = Number(overall.open);

  if (overall.agreement_rate == null) {
    L.push(`- **${n} pattern-citing decision${n === 1 ? "" : "s"} so far** (${f} finalised ` +
      `unreversed, ${r} reversed, ${o} open) — no rate below ${JOHN_MODEL_FLOOR}.`);
    L.push("");
    return L.join("\n");
  }

  L.push(`- **${pct(f, f + r)} agreement** over ${f + r} finalised-or-reversed decisions (${f} ` +
    `finalised unreversed, ${r} reversed; ${o} still open, ${n} citing in total). A reversal is the ` +
    "strongest negative signal the ladder takes, so the second number is the one to read first.");
  L.push("");

  const top = signal
    .filter(x => x.scope === "pattern")
    .sort((a, b) => Number(b.citing_decisions) - Number(a.citing_decisions) ||
                    Number(a.pattern_no) - Number(b.pattern_no))
    .slice(0, JOHN_MODEL_TOP_N);
  if (top.length === 0) {
    L.push("- *No criterion has been cited yet* — the overall rate is above the floor with no " +
      "per-pattern rows, which is a shape the view should not produce; read it directly.");
    L.push("");
    return L.join("\n");
  }
  L.push("| criterion | citing | final unreversed | reversed | open | rate |");
  L.push("|---|---:|---:|---:|---:|---:|");
  for (const p of top) {
    L.push(`| \`pattern:${p.pattern_no}\` ${summarise(p.imperative, 80)} | ${p.citing_decisions} | ` +
      `${p.finalised_unreversed} | ${p.reversed} | ${p.open} | ` +
      `${p.agreement_rate == null ? "—" : pct(Number(p.finalised_unreversed), Number(p.finalised_unreversed) + Number(p.reversed))} |`);
  }
  L.push("");
  L.push(`- A per-pattern \`—\` is not a zero: that criterion has not reached ${JOHN_MODEL_FLOOR} ` +
    "finalised-or-reversed citations of its own, so it carries counts and no rate.");
  L.push("");
  return L.join("\n");
}

/** John's stamp: UTC for the ledger, CST labelled for him (times he reads are CST — 2026-08-20). */
export function asOf(nowIso) {
  const d = new Date(nowIso);
  if (Number.isNaN(d.getTime())) throw new Error(`asOf: not a date: ${nowIso}`);
  const utc = d.toISOString().slice(0, 16).replace("T", " ") + "Z";
  return `as of ${utc} (${cst(nowIso)})`;
}

/**
 * The block body. Deterministic for a given (facts, nowIso) — the clock is an ARGUMENT, never read
 * in here, so the guard can assert this function directly. `facts` is exactly what fetchFacts()
 * returns, so the test can drive it from a fixture.
 */
export function renderBlock(facts, nowIso) {
  // FEATURE: SES-286 (c) — decisions joins the destructure; it may be absent (see the header note).
  // FEATURE: SES-84 — the class census joins it on the same terms: absent means "not read", never
  // "zero". Renamed on the way in: `census` in this scope is the column-census helper above.
  // FEATURE: SES-004 — johnModel joins the destructure on the same terms as census: absent means
  // "not read", never "no pattern-citing decisions".
  const { items, settings, drain, decisions, census: classCensus, johnModel } = facts;
  const stamp = asOf(nowIso);
  const open = items.filter(r => !CLOSED.has(r.status));
  const numbered = items.filter(r => r.queue != null);
  const openUnnumbered = open.filter(r => r.queue == null);

  const L = [];
  L.push("");
  L.push(`## Live board state — generated, do not hand-edit — *${stamp}*`);
  L.push("");
  L.push(
    "> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number " +
    "below is derived; nothing here is maintained by hand.** The judgment prose beneath this block " +
    "is the opposite — hand-maintained, deliberately, and this script never writes outside these " +
    "markers. Where the two disagree about a number, this block is right and the sentence below is " +
    "stale: say so rather than reconciling them by hand."
  );
  L.push("");

  L.push(`**Board census** — *${stamp}.* ` +
    `**${open.length} open tickets**, ${numbered.length} numbered, ` +
    `**${openUnnumbered.length} open-but-unnumbered**, ${items.length} rows total.`);
  L.push("");

  L.push("| `status` | rows | share of board |");
  L.push("|---|---:|---:|");
  for (const [k, n] of census(items, "status")) L.push(`| \`${k}\` | ${n} | ${pct(n, items.length)} |`);
  L.push("");

  L.push("**`design_status` among OPEN tickets** — *" + stamp + ".* Reads for selection (`SES-114`);" +
    " `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.");
  L.push("");
  L.push("| `design_status` | open rows | selection effect |");
  L.push("|---|---:|---|");
  const EFFECT = {
    "needs-john": "skipped, `record_skip()` — John decides on a card",
    "needs-desktop": "skipped, `record_skip()` — needs a session John attends (B39)",
    "john-paced": "skipped **silently** — his ratification, already on a card (`SES-166`)",
    designed: "**not a skip** — build from `kickoff_link` (step 6 fast path)",
    auto: "full ceremony",
    NULL: "full ceremony — not yet triaged",
  };
  for (const [k, n] of census(open, "design_status")) L.push(`| \`${k}\` | ${n} | ${EFFECT[k] || "—"} |`);
  L.push("");

  L.push("**Scheduler and automation settings** — *" + stamp + ".* §2b of the briefing, John's own" +
    " switches, binding via `scheduler_gate()` at step 1b:");
  L.push("");
  if (!settings) {
    L.push("- *No `runner_settings` row.* `scheduler_gate()` fails **open** on every unknown, so the " +
      "runner runs — that is by design, not a fault to repair here.");
  } else {
    L.push(`- Scheduler: **${settings.scheduler_on ? "on" : "OFF"}**, every ` +
      `**${settings.interval_hours} hour${settings.interval_hours === 1 ? "" : "s"}** on John's ` +
      "clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).");
    L.push(`- Cron minute **${settings.cron_minute}**, manual-fire tolerance ` +
      `**±${settings.grid_tolerance_min} min** (a start outside it is treated as a manual fire and is ` +
      "never paced).");
    L.push("- Standing daily max: " + (settings.daily_max_tokens_millions == null
      ? "**not set** — a blank box means *no standing cap*, budget as before `SES-147`; it is never `0`."
      : `**${settings.daily_max_tokens_millions}M tokens**. This is rung 3 of five, **below** the 48h ` +
        "stale floor: a standing number must not defeat the staleness brake."));
  }
  L.push("");

  L.push("**Standing epic drain** — *" + stamp + ".* Created only by John; the runner may read one," +
    " never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he" +
    " **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list" +
    " it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`)" +
    " whenever the list carries such a ruling, every named member otherwise.");
  L.push("");
  if (!drain || !drain.directive_id) {
    L.push("- **No drain standing.** Selection is the class-sorted board exactly as it is with no " +
      "drain declared.");
  } else if (drain.required > 0) {
    // SES-310: this list HAS a gate ruling, so the finish line is the required set and the bullet
    // says so. The non-required and deferred members are named too, and named as NOT the finish
    // line — they stay on the board and stay pickable under Prime Directive §2(c) once the drain
    // retires; omitting them would read as if they had disappeared.
    const fmt = t => `\`${t}\``;
    L.push(`- **${drain.epic_name || "(unnamed epic)"}** — **${drain.requiredOpen} of ` +
      `${drain.required} required members still open** (${drain.named} named). It retires when every ` +
      "required member is `done`/`removed` (`SES-310`); `delivered` is deliberately absent from that " +
      "side, because a drain retires on the gate's ruling and never on the runner's own say-so.");
    if (drain.requiredOpenIds.length) {
      L.push(`- Still open (required): ${drain.requiredOpenIds.map(fmt).join(", ")}.`);
    }
    if (drain.nonRequiredOpenIds.length) {
      L.push(`- Open but not on the finish line: ${drain.nonRequiredOpenIds.map(fmt).join(", ")}.`);
    }
    if (drain.deferredIds.length) {
      L.push(`- Deferred: ${drain.deferredIds.map(fmt).join(", ")}.`);
    }
  } else {
    // SES-310 fail-closed branch: no member of this list carries a gate ruling, so every named
    // member IS the finish line and the wording is unchanged from before this ship.
    L.push(`- **${drain.epic_name || "(unnamed epic)"}** — **${drain.open} of ${drain.named} named ` +
      "members still open**. It retires when every named member is `done`/`removed`; `delivered` is " +
      "deliberately absent from that side, because a drain retires on John's acceptance and never on " +
      "the runner's own say-so.");
    if (drain.openIds.length) {
      L.push(`- Still open: ${drain.openIds.map(t => `\`${t}\``).join(", ")}.`);
    }
  }
  L.push("");

  // ---- Open decisions (FEATURE: SES-286 (c) — M6-02, M6-06) ---------------------------------
  // The window is READ OFF runner_settings, never written as "72". M6-02's prose says 72 hours, but
  // the column is what record_decision() actually computed every live expires_at from (SES-146's
  // rule: every cadence number is a column), so if John changes the column this sentence changes
  // with it instead of becoming the next stale number in a file that exists to have none.
  const windowHours = settings && settings.reversal_window_hours != null
    ? `${settings.reversal_window_hours}h` : "not set";
  L.push(`**Open decisions** — *${stamp}.* Decisions made under \`M6-02\` that are still inside ` +
    `their reversal window (\`runner_settings.reversal_window_hours\` = ${windowHours}). Silence ` +
    "finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § " +
    "Reversing a decision).");
  L.push("");
  if (!decisions) {
    // NOT the same statement as "none open", and the difference is the whole point: a render whose
    // facts carried no decision ledger says so rather than publishing a zero it never measured.
    L.push("- *The decision ledger was not read for this render* — which is **not** the same as " +
      "*none open*. Re-run `scripts/render-standing-brief.js` with a service key.");
  } else if (decisions.open.length === 0) {
    L.push("- **None open.**");
  } else {
    for (const d of decisions.open) {
      // The DISPLAYED id is the 8-char prefix John reads by; the id inside the call is the FULL
      // uuid, because that is what reverse_decision() takes.
      L.push(`- \`${String(d.id).slice(0, 8)}\` · ${d.kind || "—"} · ` +
        `${d.backlog_id ? `\`${d.backlog_id}\`` : "—"} · ${summarise(d.summary)} · ` +
        `finalises ${d.expires_at ? cst(d.expires_at) : "—"} · ` +
        `\`select public.reverse_decision('${d.id}','John','<why>');\``);
    }
  }
  if (decisions) {
    L.push("");
    L.push(`**${decisions.finalWeek} final this week, ${decisions.reversedWeek} reversed this ` +
      "week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not " +
      "a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in " +
      "`scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the " +
      "strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read " +
      "first.");
  }
  L.push("");

  // ---- Judgment classes (FEATURE: SES-84 — M7 gate ruling ii) ------------------------------
  // After Open decisions, before the provenance line. The group is a pure helper so the guard can
  // assert it from a fixture; it renders what the view returned and counts nothing itself.
  L.push(renderJudgmentClasses(classCensus, stamp));

  // ---- John-model (FEATURE: SES-004 — M7 gate ruling iii) ----------------------------------
  // After Judgment classes, before the provenance line. Same contract as the group above it: a pure
  // helper the guard can assert from a fixture, rendering what the view returned and counting
  // nothing itself.
  L.push(renderJohnModel(johnModel, stamp));

  const sha = factsSha(facts);
  L.push(`*Provenance: ${items.length} board rows, payload \`sha256:${sha.slice(0, 16)}\`, ${stamp}. ` +
    "The stamp says when this was last read; the sha says whether it still matches the tables. " +
    "`--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*");
  L.push("");
  return L.join("\n");
}

/** Splice a rendered block in, refusing if anything outside the markers would move. */
export function spliceBlock(original, block) {
  const [head, , tail] = splitOnMarkers(original);
  const next = head + BEGIN + block + END + tail;
  const [head2, body2, tail2] = splitOnMarkers(next);
  if (head2 !== head || tail2 !== tail) {
    throw new Error("the splice would change bytes OUTSIDE the markers — refusing to write");
  }
  if (body2 !== block) throw new Error("the spliced block did not round-trip — refusing to write");
  if (!keepsJudgmentProse(next)) {
    throw new Error("the result does not carry the hand-maintained judgment prose — refusing to write");
  }
  return next;
}

// --- data ------------------------------------------------------------------------------------------

async function rest(base, key, pathAndQuery) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let res;
  try {
    res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, { headers });
  } catch (e) {
    die(`could not reach the Supabase REST endpoint: ${e.message}`);
  }
  if (!res.ok) die(`Supabase REST returned HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  return res.json();
}

export async function fetchFacts(url, key) {
  // SES-310: milestone_required and defer_status join the projection — the drain census below needs
  // the gate's finish-line ruling and the SES-305 deferral state. `select=*` is deliberately still
  // not used: the anon key's column-list grants make a star select a 403 waiting to happen
  // (.claude/rules/supabase-column-grants.md), and naming columns keeps this readable under a
  // service key too.
  const items = await rest(url, key,
    "backlog_items?select=id,backlog_id,status,design_status,queue,milestone_required,defer_status&limit=5000");
  if (!Array.isArray(items) || items.length === 0) die("backlog_items came back empty — refusing to render a board census from nothing");

  const settingsRows = await rest(url, key, "runner_settings?select=*&id=eq.1");
  const settings = Array.isArray(settingsRows) && settingsRows[0] ? settingsRows[0] : null;

  // The standing drain: the single oldest QUEUED drain-epic directive, the same row drain_epic_next()
  // reads. `cancelled` and `done` are excluded — a withdrawn or finished order is not standing.
  const dirs = await rest(url, key,
    "runner_directives?select=id,epic_id,created_at&type=eq.drain-epic&status=eq.queued&order=created_at&limit=1");
  let drain = null;
  if (Array.isArray(dirs) && dirs[0]) {
    const d = dirs[0];
    const scope = await rest(url, key, `runner_drain_scope?select=item_id,backlog_id&directive_id=eq.${d.id}&limit=1000`);
    const byId = new Map(items.map(r => [r.id, r]));
    // item_id is the FK and the ONLY thing joined on: backlog_id carries no unique constraint
    // (CHI-48 occupies two rows, SES-97), so joining on it silently pulls in both.
    const openRows = scope.filter(s => { const r = byId.get(s.item_id); return r && !CLOSED.has(r.status); });
    const epics = await rest(url, key, `epics?select=id,name&id=eq.${d.epic_id}`);
    // SES-310: the finish line. `required` counts the named members the GATE ruled required, over the
    // whole named list (not just the open ones) — it is what decides whether this drain HAS a ruled
    // finish line at all, which is the same test drain_epic_next()'s v_req_n makes. `=== true` and not
    // a truthiness check: NULL and false both mean "not ruled required", and the fail-closed branch
    // below depends on telling those apart from true.
    const reqRows = scope.filter(s => { const r = byId.get(s.item_id); return r && r.milestone_required === true; });
    const requiredOpenRows = reqRows.filter(s => !CLOSED.has(byId.get(s.item_id).status));
    // Open but NOT on the finish line, and open-and-deferred. These are two INDEPENDENT censuses, not
    // a partition: a non-required deferred member is reported in both, exactly as the function's
    // blocked_detail buckets do it.
    const nonReqOpenRows = openRows.filter(s => byId.get(s.item_id).milestone_required !== true);
    const deferredRows = openRows.filter(s => ["yes", "stuck"].includes(byId.get(s.item_id).defer_status));
    const ids = rows => rows.map(s => byId.get(s.item_id).backlog_id).filter(Boolean).sort();
    drain = {
      directive_id: d.id,
      epic_name: Array.isArray(epics) && epics[0] ? epics[0].name : null,
      named: scope.length,
      open: openRows.length,
      openIds: ids(openRows),
      required: reqRows.length,
      requiredOpen: requiredOpenRows.length,
      requiredOpenIds: ids(requiredOpenRows),
      nonRequiredOpenIds: ids(nonReqOpenRows),
      deferredIds: ids(deferredRows),
    };
  }
  // FEATURE: SES-286 (c) — the decision ledger. runner_decisions is service_role only (SES-286a's
  // explicit REVOKE), which is the same key everything else in this script already needs; there is
  // no anon path to fall back to and none is wanted. rest() dies with exit 2 on any non-2xx, so a
  // checkout run against a database predating the SES-286a migration REFUSES rather than rendering a
  // brief with this group silently missing.
  //
  // THREE READS, NOT ONE WITH A COUNT HEADER: rest() sends no Prefer header and returns parsed JSON,
  // so the counts are array lengths. At this ledger's size (0 rows live at this ship) that is free,
  // and the limit keeps a runaway ledger from being read wholesale.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const openDecisions = await rest(url, key,
    "runner_decisions?select=id,kind,backlog_id,summary,expires_at&status=eq.open&order=expires_at&limit=1000");
  const finalWeek = await rest(url, key,
    `runner_decisions?select=id&status=eq.final&finalized_at=gte.${since}&limit=1000`);
  const reversedWeek = await rest(url, key,
    `runner_decisions?select=id&status=eq.reversed&reversed_at=gte.${since}&limit=1000`);
  const decisions = {
    open: Array.isArray(openDecisions) ? openDecisions : [],
    finalWeek: Array.isArray(finalWeek) ? finalWeek.length : 0,
    reversedWeek: Array.isArray(reversedWeek) ? reversedWeek.length : 0,
  };

  // FEATURE: SES-84 — the per-class census, read from the VIEW and never re-derived here.
  // judgment_class_census is service_role only (its migration revokes anon/authenticated by name,
  // the SES-78a rule), the same key everything above needs. Columns are named rather than `*` —
  // this file's own rule — and `order=ord` pins the P1→P4, neutral, unclassed order the view
  // defines so the block never churns between renders. rest() dies with exit 2 on any non-2xx, so
  // a checkout run against a database predating the ses84_claim_classing migration REFUSES rather
  // than rendering a brief with this group silently missing.
  const classCensus = await rest(url, key,
    "judgment_class_census?select=judgment_class,ord,ratified,proposed,rejected,total,newest_root_claim_ref,newest_root_claim&order=ord");
  if (!Array.isArray(classCensus) || classCensus.length === 0) die("judgment_class_census came back empty — refusing to render a class census from nothing");

  // FEATURE: SES-004 — the John-model signal, read from the VIEW and never re-derived here; the view
  // is also where the 30-decision floor lives, so this script never divides. john_model_signal is
  // service_role only (its migration revokes anon/authenticated by name, the SES-78a rule), the same
  // key everything above needs. Columns are named rather than `*` — this file's own rule — and the
  // order pins overall-first, then the most-cited criteria, so the block never churns between
  // renders. The view ALWAYS returns its `overall` row (an aggregate with no GROUP BY), so an empty
  // array means the read itself is wrong and this refuses rather than publishing a silent gap.
  const johnModel = await rest(url, key,
    "john_model_signal?select=ord,scope,pattern_no,imperative,citing_decisions,finalised_unreversed,reversed,open,agreement_rate&order=ord,citing_decisions.desc,pattern_no");
  if (!Array.isArray(johnModel) || johnModel.length === 0) die("john_model_signal came back empty — refusing to render the John-model from nothing (the view always returns its overall row)");

  return { items, settings, drain, decisions, census: classCensus, johnModel };
}

async function main() {
  const check = process.argv.includes("--check");

  // FAIL CLOSED, first thing and before any network call, exactly as render-claude-state.js refuses
  // without the standing brief. A machine with no credentials still exercises this branch.
  if (!fs.existsSync(BRIEF_ABS)) die(`${BRIEF_REL} is missing — refusing to render.`);
  const original = fs.readFileSync(BRIEF_ABS, "utf8");
  if (!keepsJudgmentProse(original)) {
    die(`${BRIEF_REL} no longer carries its hand-maintained judgment prose (the "${JUDGMENT_SENTINEL}" `
      + "sentinel). Refusing to write a generated block into a file whose reason for existing is that prose.");
  }
  try { splitOnMarkers(original); } catch (e) { die(e.message); }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) die(`missing ${[!url && "SUPABASE_URL", !key && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ")}`);

  const facts = await fetchFacts(url, key);

  // DRIFT IS A FACTS QUESTION, NOT A BYTE QUESTION. John's spec puts an "as of" stamp in the body,
  // so a whole-block diff would report drift on every single run and the check would be worthless
  // within a day. Compare the payload sha instead: the stamp says when this was last read, the sha
  // says whether it still matches the tables.
  const [, currentBlock] = splitOnMarkers(original);
  const factsMoved = shaFromBlock(currentBlock) !== factsSha(facts).slice(0, 16);

  if (check) {
    if (factsMoved) {
      console.log(`render-standing-brief --check: DRIFT — ${BRIEF_REL}'s generated block no longer matches the tables.`);
      process.exit(1);
    }
    console.log("render-standing-brief --check: no drift — the block's facts match the tables (stamp age is not drift).");
    process.exit(0);
  }

  let next;
  try { next = spliceBlock(original, renderBlock(facts, new Date().toISOString())); } catch (e) { die(e.message); }

  fs.writeFileSync(BRIEF_ABS, next);
  console.log(`render-standing-brief: wrote ${BRIEF_REL} (${Buffer.byteLength(next)} bytes; `
    + `${facts.items.length} board rows; facts ${factsMoved ? "MOVED" : "unchanged"}, stamp refreshed; `
    + "judgment prose untouched).");
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] || "")) {
  main();
}
