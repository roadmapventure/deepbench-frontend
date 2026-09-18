#!/usr/bin/env node
// DeepBench v7.0.521 | scripts/render-standing-brief.js | SES-413 slice 3 — THE DAILY DECISIONS
// LIST. `governance_rules.MANAGER-DECIDES-BY-DEFAULT` line 3 promises John "a daily list of what
// was decided, not questions; a question that still reaches him is counted weekly, target zero",
// and NOTHING RENDERED IT. The brief's only decision group was `Open decisions` — an UNDO list,
// `status=eq.open`, every bullet ending in `reverse_decision(...)`, which drops a decision the
// moment it finalises and holds no day boundary at all; and `grep -n runner_questions` over this
// file returned ZERO hits, so the counted half of the rule reached no reader. A new group,
// `Decided for you`, lands AFTER `Open decisions` and BEFORE `Judgment classes`: a seven-row CST-day
// table (decided / reversed / questions to you), the newest day's decisions one bullet each capped
// at DAILY_DECISION_LINES, and the weekly question count beside its target of zero. Days are CST
// days via cstDay(), never UTC ones — a decision recorded at 04:30Z belongs to the previous day in
// Chicago, and five hours out of every twenty-four a UTC-dated list files work under a day John had
// already stopped reading. No `reverse_decision(` in here: undo stays `Open decisions`' job.
//
// DeepBench v7.0.512 | scripts/render-standing-brief.js | AGT-79 slice 6 — WAS LAST NIGHT JUDGED?
// `Ticket hygiene, last night` printed the newest nightly row's notes verbatim and nothing else,
// which left the one fact that mattered invisible: five nights ran without the judgment pass and
// the board said nothing. The nightly read widens from 1 row to HYGIENE_NIGHTS_READ (`nights`;
// `run` stays `nights[0]`, so factsSha is untouched) and the group gains ONE bullet after
// `Last run` — judged or not, with the consecutive-unjudged streak counted newest-first. A night
// is judged IFF its notes carry `· judged`. An unread ledger says so; it never renders a zero.
//
// DeepBench v7.0.511 | scripts/render-standing-brief.js | SES-378 slice 5 — THE STAFF WATCH REACHES
// THE BRIEF. A new group, `Staff watch`, lands AFTER `Ticket hygiene, last night` and BEFORE
// `Human gates`: `public.runner_staff_findings` rows per `agent_id`, with distinct fingerprints,
// distinct cycles and the newest. Slice 3 shipped the table and slice 4 shipped the counter, and
// `grep -n runner_staff_findings scripts/render-standing-brief.js` returned ZERO hits at this ship —
// every finding the Development Manager recorded about the runner's own agents was displayed
// nowhere. The promotion bar is 3 distinct CYCLES, which is why this group prints the cycle count
// beside the row count rather than the row count alone: they are the two different numbers and only
// one of them moves a finding toward a Skill edit.
//
// DeepBench v7.0.487 | scripts/render-standing-brief.js | SES-386 — IS ANYTHING WAITING ON A HUMAN?
// A new group, `Human gates`, lands AFTER `Ticket hygiene, last night` and BEFORE the provenance
// footer: the open `needs-john` tickets and the undecided `gated_before_build` cards, counted, with
// ids up to five. Neither column is written by any code in this repo — they are board state — so
// this is where they are REPORTED. `ses-285` assertion 6 and `ses-373` assertion 1 used to read
// them live and go red on a board mid-flight; they now assert THIS block, which is a fact about the
// change rather than a fact about the day.
//
// DeepBench v7.0.477 | scripts/render-standing-brief.js | AGT-79 slice 3 — WHAT DID THE TICKET
// OWNER LEAVE ON THE BOARD LAST NIGHT? A new group, `Ticket hygiene, last night`, lands AFTER
// `Auditor's ledger` and BEFORE the provenance footer: the open `public.ticket_owner_findings`
// rows grouped by check with the age of the oldest, the newest `hygiene` decision with its
// reversal line, and the newest nightly cycle row.
//
// THE RUN LINE IS THE ROW'S OWN WORDS, NOT A SECOND COUNT. `scripts/ticket-owner.js --nightly`
// writes its census line, its four write counts and its decision handle into `runner_cycles.notes`;
// this group PRINTS that string with the `SCHEDULED-AGENT: audit-board — ` prefix stripped and
// recomputes nothing from it. A brief that re-derived the night's numbers from the board would be
// reporting the board as it is NOW against a run that happened hours ago, and the two disagreeing
// would look like drift rather than like time passing.
//
// ABSENT IS `not read`, NEVER ZERO, the same rule every group below keeps — and here it matters
// most, because "no open findings" is exactly the sentence a broken read would print. A measured
// zero says so in those words; an unread ledger says it was not read.
//
// DeepBench v7.0.454 | scripts/render-standing-brief.js | SES-360 — ARE THE PLATFORM'S OWN AGENTS
// DOING THE DEVELOPMENT WORK? The standing brief answers it as a RENDERED FACT. A new group,
// `Governance agents, last 7 days`, lands AFTER `Board by served class` and BEFORE the provenance
// footer: calls and token sums per governance-lane agent x call_source, and how many of the window's
// ships carried all four of SES-345's handoff rows.
//
// Measured 2026-09-11 before a line changed: answering it took FIVE queries, and the first silently
// TRUNCATED — PostgREST caps a page at 1,000 rows and the governance agents had written 1,311 in
// seven days. So the aggregation lives in two views, `public.governance_agent_usage` and
// `public.ship_handoff_census`, not in a GROUP BY here: rest() sends no Range header and does not
// page, and a second home for the number would be that truncated number again. The four-leg rule is
// SES-345's, so when its verdict-side sha lands, the leg moves in the VIEW, one place, not here.
//
// THE ROSTER IS READ BY LANE, NEVER BY ID (Rule #1, §19b/§19e): no agent id appears in this file, and
// no branch is keyed to one. A GROUP BY cannot return an agent with no rows and a silent Builder is
// the row John most needs to see, so the renderer walks the roster and says *no calls in the window*
// — a MEASURED zero, because the view was read. A NULL call_source prints as *unlabelled* and is
// never folded into a named source (LOG-128: an absent attribution is not evidence of automation).
// NO RATE, EVER, on the same terms as the group below: counts and token sums side by side.
// The window ROLLS (now() - 7 days in the view), so the payload sha moves as rows age out — the same
// accepted behaviour finalWeek/reversedWeek already have.
//
// DeepBench v7.0.418 | scripts/render-standing-brief.js | LOG-143 (c) — CRITERION 7 GETS ITS
// INSTRUMENT: real-visitor use of the first platform-originated feature is a view the standing
// brief renders, so the exit exam reads a number instead of an assertion. A new fact group,
// `Invention in use`, lands AFTER John-model and BEFORE the provenance footer.
//
// THE PREDICATE FOR "REAL VISITOR" LIVES IN THE VIEW, NOT HERE — public.report_card_usage (the
// LOG-143 (c) migration) decides it once: visitor_id present, request_host = the production host
// (the standing dev-URL-is-John rule), call_source outside the platform's own closed
// automated-traffic set (src/lib/callerBuckets.js AUTOMATED_NOVID_SOURCES), and the visitor not
// labelled John's own in visitor_labels. This file only prints the three window rows (7d/30d/all)
// the view returns — the same division of labour as the class census and John-model above it.
//
// NO RATE, EVER (the kickoff's own design rule, and correct at this ship's population of one
// logged judge run): judge_runs and judge_runs_real_visitors are printed as counts side by side,
// never divided. A percentage over a population this small is a confident wrong number.
//
// Measured live 2026-09-03: `report_card_usage` returns 1 judge run in every window, 0 of them by
// a real visitor — the two logged rows are both the attended QA run from John's own machine
// (visitor_id NULL, call_source 'script', the Vercel preview host), which the predicate excludes
// on three independent grounds.
//
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
    // FEATURE: LOG-143 (c) — the report-card usage rows, so a judge run, a real-visitor use, or a
    // first/last-real-visitor timestamp moving each move the sha and --check reports the drift.
    // Sorted by window rather than relying on `ord`'s presence, same defensive posture as the
    // johnModel mapping above it.
    inventionUse: Array.isArray(facts.inventionUse)
      ? facts.inventionUse.map(r => [
          r.window, Number(r.judge_runs), Number(r.judge_runs_real_visitors),
          Number(r.distinct_real_visitors), r.first_real_visitor_at || null, r.last_real_visitor_at || null,
        ]).sort()
      : null,
    // FEATURE: SES-360 — the governance rows, the ship census and the ROSTER IDS, so a new logged
    // call, a ship gaining a leg, or a seventh governance agent appearing (even before it logs)
    // each move the sha. `role` text is deliberately absent: the id identifies the agent, and a
    // retitled role is not a usage change. Numbers are coerced because PostgREST returns bigint
    // sums as strings and a fixture writes JS numbers — the sha must not depend on which.
    governance: facts.governance
      ? {
          roster: Array.isArray(facts.governance.roster) ? facts.governance.roster.map(r => r.id).sort() : null,
          usage: Array.isArray(facts.governance.usage)
            ? facts.governance.usage.map(u => [
                u.agent_id, u.call_source == null ? null : String(u.call_source),
                Number(u.calls), Number(u.input_tokens), Number(u.output_tokens), Number(u.untokened),
              ]).sort()
            : null,
          ships: facts.governance.ships
            ? ["ships", "ships_all_four", "missing_rank", "missing_kickoff", "missing_sha", "missing_verdict"]
                .map(k => Number(facts.governance.ships[k]))
            : null,
        }
      : null,
    // FEATURE: AGT-70 slice 3 — the ledger's identity, week, status and RULER, plus the filed count,
    // so a new finding, John ruling one, a status moving to resolved, or a row leaving for the board
    // each move the sha and --check reports the drift. `kind`, `confidence` and `governing_fact` are
    // deliberately absent: the fingerprint IS the identity (it is a hash over kind, the location
    // homes and the normalised fact — scripts/audit-ledger.js), so a row whose fingerprint is
    // unchanged is the same finding and a re-wrap of its text is not a ledger change. `ruled_by` is
    // stringified because it is the one field a fixture writes as a plain name and PostgREST can
    // return as null — the sha must not depend on which produced it.
    audit: facts.audit
      ? {
          rows: facts.audit.rows.map(r => [
            r.fingerprint, r.iso_week, r.status, r.ruled_by == null ? null : String(r.ruled_by),
          ]).sort(),
          filed: Number(facts.audit.filed),
        }
      : null,
    // FEATURE: AGT-79 slice 3 — the open ledger's SHAPE (per-check counts), the newest hygiene
    // decision's identity and status, and the newest nightly run's identity and end time, so a gap
    // appearing or clearing, John reversing or finalising the decision, or a night running each
    // move the sha and --check reports the drift. `first_seen_at` is deliberately ABSENT and the
    // count is what stands in its place: a RE-SEEN row is the pass touching last_seen_at on a gap
    // John already knows about — nothing he reads changed — while a row arriving or leaving moves
    // its check's count. Including the timestamps would report drift on every nightly run.
    hygiene: facts.hygiene
      ? {
          open: Array.isArray(facts.hygiene.open)
            ? [...facts.hygiene.open.reduce((m, r) => m.set(String(r.check_slug), (m.get(String(r.check_slug)) || 0) + 1), new Map())]
                .sort((a, b) => a[0].localeCompare(b[0]))
            : null,
          decision: facts.hygiene.decision ? [facts.hygiene.decision.id, facts.hygiene.decision.status] : null,
          run: facts.hygiene.run ? [facts.hygiene.run.id, facts.hygiene.run.ended_at] : null,
        }
      : null,
    // FEATURE: SES-386 — the two human-gate ID SETS, sorted, so a ticket being flagged `needs-john`,
    // a card being decided, or either set emptying moves the sha and --check reports the drift. The
    // IDS and not the counts: two tickets swapping which one waits on John is a real change to what
    // this block says, and a pair of counts would hash identically through it.
    humanGates: facts.humanGates
      ? {
          needsJohn: Array.isArray(facts.humanGates.needsJohn) ? [...facts.humanGates.needsJohn].map(String).sort() : null,
          undecidedCards: Array.isArray(facts.humanGates.undecidedCards) ? [...facts.humanGates.undecidedCards].map(String).sort() : null,
        }
      : null,
    // FEATURE: SES-378 slice 5 — the staff ledger's IDENTITY TRIPLES, sorted, so a new finding, a
    // defect recurring in a second cycle, or a row leaving each move the sha and --check reports the
    // drift. (agent, fingerprint, cycle) and NOT `created_at`: the triple IS the row's identity —
    // `unique (cycle_id, fingerprint)` makes a repeat within one cycle unwritable — while including
    // the timestamp would report drift on a re-record that changed nothing a reader sees.
    staff: Array.isArray(facts.staff)
      ? facts.staff.map(r => [String(r.agent_id), String(r.fingerprint), String(r.cycle_id)]).sort()
      : null,
    // FEATURE: SES-413 slice 3 — the week's decision IDS WITH THEIR STATUS, the week's question ids
    // with theirs, and the open-question count, so a decision arriving, one finalising, one being
    // reversed, a question being asked or one being answered each move the sha and --check reports
    // the drift. ID **AND** STATUS, not the id alone: the normal life of a row here is to arrive
    // `open` and become `final` WITHOUT ever leaving this window, so an id-only payload would hash
    // identically across the single most common change this group exists to show. `decided_at` is
    // deliberately ABSENT for the reason the 7-day cutoff is absent from `decisions` above — it is a
    // fixed property of a row that never moves, and the window itself advances with the clock, so
    // hashing the cutoff would report drift on every run and the check would be ignored within a day.
    daily: facts.daily
      ? {
          rows: Array.isArray(facts.daily.rows)
            ? facts.daily.rows.map(r => [String(r.id), String(r.status)]).sort() : null,
          questions: Array.isArray(facts.daily.questions)
            ? facts.daily.questions.map(q => [String(q.qid), String(q.status)]).sort() : null,
          openQuestions: Number(facts.daily.openQuestions || 0),
        }
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
 * FEATURE: SES-413 slice 3 — ONE CST *DAY*, for the one group that is organised by day.
 *
 * cst() above formats an INSTANT a person reads ("Sep 18, 1:20 PM CST"). This formats the DAY that
 * instant fell on in Chicago, as `en-CA` writes it — `YYYY-MM-DD`, which sorts lexically, keys a
 * bucket, heads a table row and drops straight into a SQL `::date` literal. It is a separate
 * function rather than something parsed back out of cst() because "Sep 18" carries no year and so
 * cannot be a bucket key at all.
 *
 * THE UTC DAY IS THE WRONG ANSWER, AND IT IS WRONG FOR FIVE HOURS OUT OF EVERY TWENTY-FOUR. A
 * decision recorded at `2026-09-18T04:30:00Z` happened at 11:30 PM on Sep 17 in Chicago, and a
 * daily list that files it under Sep 18 tells John something was decided on a day he had already
 * stopped reading — and hides it from the day he was working. Every boundary in the group below
 * goes through here (the bucket, the table row, the headline, the overflow query), so there is
 * exactly one place the day is decided and no second copy to drift from it.
 *
 * Throws on a bad date, exactly like cst(): a silent `Invalid Date` would become its own bucket and
 * a whole day of decisions would render under a heading John never reads.
 */
export function cstDay(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`cstDay: not a date: ${iso}`);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

/**
 * How many decision bullets the daily list prints for its newest day before it stops listing and
 * says how many are left.
 *
 * A DISPLAY CONSTANT, NOT A CADENCE. SES-146's "every cadence number is a column" does not reach
 * it, for the same reason `OPEN_DECISION_BATCH` inside renderBlock() is not a column either:
 * changing it changes how much of one day fits on a page, and changes nothing the runner does.
 */
export const DAILY_DECISION_LINES = 25;

/**
 * FEATURE: SES-413 slice 3 — THE DAILY LIST THE RULE ALREADY PROMISED. Pure, like every group in
 * this file: `daily` is exactly what fetchFacts() read, `nowIso` is the clock passed in rather than
 * read here, and nothing below goes near the network.
 *
 * IT IS NOT A COPY OF `Open decisions`, AND THE DIFFERENCE IS THE WHOLE TICKET. That group answers
 * "what can I still undo?" — `status=eq.open`, ordered by expiry, every bullet ending in a
 * `reverse_decision()` handle — so a decision DROPS OFF IT at the moment it finalises, which is the
 * moment it became a thing that was decided for John. This group answers "what was decided for me,
 * and when?" It reads by `decided_at`, keeps finalised rows, is bucketed by CST day, and carries NO
 * `reverse_decision(` at all: undo has a home one group up and putting a second copy of it here
 * would make the daily record read like a list of mistakes to correct.
 *
 * THE SEVEN ROWS ARE ALWAYS SEVEN, ZEROS INCLUDED. A day with no decisions is a fact about the
 * runner — it means a day passed in which it decided nothing for John — and a table that renders
 * only the days that happen to have rows cannot express it: six rows would read as "seven busy
 * days" to anyone not counting. Live at this ship, `2026-09-17` is exactly such a day.
 *
 * ABSENT IS NOT ZERO, and the two sentences are deliberately disjoint — neither one's words appear
 * in the other's branch. "The ledger was not read" and "nothing was decided" are opposite facts and
 * only one of them is a measurement; a group that printed the second when it meant the first would
 * publish a quiet week nobody measured, on the one page John reads to find out what happened.
 *
 * FREE TEXT GOES THROUGH summarise(). `runner_decisions.summary` is written by cycles under no
 * format constraint (SES-286a: NOT NULL and non-blank, nothing more), so a single backtick in one
 * would open a code span that swallows the rest of the line.
 */
export function renderDailyDecisions(daily, stamp, nowIso) {
  const L = [];
  const lead = `**Decided for you** — *${stamp}.* What the runner DECIDED on your behalf, by CST ` +
    "day (`governance_rules.MANAGER-DECIDES-BY-DEFAULT`: *a daily list of what was decided, not " +
    "questions*), with the questions that reached you anyway counted beside it — target zero. Not " +
    "the `Open decisions` group above: that one is the undo list and drops a decision the moment it " +
    "finalises; this one is the record of the day and keeps it.";

  if (!daily || !Array.isArray(daily.rows)) {
    L.push(lead);
    L.push("");
    L.push("- *The decision ledger was not read for this render* — which is **not** the same as *a " +
      "quiet week*. Re-run `scripts/render-standing-brief.js` with a service key.");
    L.push("");
    return L.join("\n");
  }

  const rows = daily.rows;
  const questions = Array.isArray(daily.questions) ? daily.questions : [];
  const openQuestions = Number(daily.openQuestions || 0);
  const askedLine = `**${questions.length} question(s) reached you in the last 7 days — target ` +
    `zero**; ${openQuestions} still open.`;

  if (rows.length === 0) {
    L.push(`${lead} ${askedLine}`);
    L.push("");
    L.push("- **Nothing was decided in the last 7 days — a measured zero.** The ledger was read and " +
      "holds no decision inside the window.");
    L.push("");
    return L.join("\n");
  }

  // The seven days the table names, newest first, anchored on the CST day THIS RENDER happened on.
  // Stepped from a NOON anchor rather than from `nowIso` itself: a DST boundary moves a midnight by
  // an hour, and stepping 24h from an evening instant across one would put two entries on the same
  // date and skip another. Noon ± an hour is still the same calendar day in every US zone.
  const today = cstDay(nowIso);
  const anchor = Date.parse(`${today}T12:00:00Z`);
  const days = [];
  for (let i = 0; i < 7; i++) days.push(new Date(anchor - i * 86400000).toISOString().slice(0, 10));

  // Bucket by CST day. `reversed` counts rows DECIDED on that day that now carry `reversed` — which
  // is the honest reading of a table keyed by `decided_at` and is what the lead says it is, not "a
  // reversal happened that day" (the reversal lands later, and `reversed_at` is not in this read).
  const decidedBy = new Map();
  const reversedBy = new Map();
  for (const r of rows) {
    const day = cstDay(r.decided_at);
    decidedBy.set(day, (decidedBy.get(day) || 0) + 1);
    if (String(r.status) === "reversed") reversedBy.set(day, (reversedBy.get(day) || 0) + 1);
  }
  const askedBy = new Map();
  for (const q of questions) {
    const day = cstDay(q.asked_at);
    askedBy.set(day, (askedBy.get(day) || 0) + 1);
  }

  // The newest day the ledger actually HAS rows for, which is not necessarily today: a render at
  // 6 AM CST on a quiet morning must lead with the work of the day before, not with an empty
  // "0 decided today" over a table that plainly shows otherwise.
  const newest = [...decidedBy.keys()].sort().pop();
  const newestRows = rows
    .filter(r => cstDay(r.decided_at) === newest)
    .sort((a, b) => Date.parse(b.decided_at) - Date.parse(a.decided_at));

  // READ BUT OUTSIDE THE TABLE — stated, never dropped. The read window is a rolling 7×24h back from
  // the clock; the table's window is seven CST CALENDAR days. The two disagree by however far into
  // the day the render happens, so on any render after CST midnight some rows sit before the first
  // table row. Saying how many is the difference between a table that is a stated projection and one
  // that silently loses a day's work.
  const inTable = new Set(days);
  const outside = rows.filter(r => !inTable.has(cstDay(r.decided_at))).length;

  L.push(`${lead} **${newestRows.length} decided on ${newest}**; ${askedLine}`);
  L.push("");
  L.push("| CST day | decided | reversed | questions to you |");
  L.push("|---|---:|---:|---:|");
  for (const day of days) {
    L.push(`| \`${day}\` | ${decidedBy.get(day) || 0} | ${reversedBy.get(day) || 0} | ${askedBy.get(day) || 0} |`);
  }
  L.push("");
  if (outside > 0) {
    L.push(`- *${outside} decision(s) were read but fall outside the table:* the read window is a ` +
      "rolling 7×24h back from the stamp, the table is the seven CST days ending `" + today + "`, " +
      "and any render after CST midnight sees the gap between them. They are in no column above.");
    L.push("");
  }
  L.push(`**The ${newestRows.length} decided on ${newest}** — newest first.`);
  L.push("");
  for (const d of newestRows.slice(0, DAILY_DECISION_LINES)) {
    L.push(`- \`${String(d.id).slice(0, 8)}\` · ${d.kind || "—"} · ` +
      `${d.backlog_id ? `\`${d.backlog_id}\`` : "—"} · ${summarise(d.summary)} · ${d.status || "—"}`);
  }
  if (newestRows.length > DAILY_DECISION_LINES) {
    L.push(`- …and ${newestRows.length - DAILY_DECISION_LINES} more decided that day · ` +
      "`select id, kind, backlog_id, summary, status from public.runner_decisions where " +
      "(decided_at at time zone 'America/Chicago')::date = '" + newest + "' order by decided_at desc;`");
  }
  L.push("");
  return L.join("\n");
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

/**
 * FEATURE: LOG-143 (c) — the `Invention in use` fact group, criterion 7's instrument
 * (`docs/SELFBUILD-CHARTER.md`: "at least one platform-originated feature ... is measurably used
 * by real visitors"). PURE: (usage rows, stamp) in, markdown out, the same contract as
 * renderJudgmentClasses()/renderJohnModel() above it, so the guard can drive it from a fixture.
 * NOTHING HERE COUNTS OR DECIDES ANYTHING — `public.report_card_usage` is the one home for the
 * real-visitor predicate; `rows` is exactly what fetchFacts() reads from it, one row per window
 * (`7d`, `30d`, `all`) in that order.
 *
 * NO RATE, EVER (the kickoff's design rule) — judge_runs and judge_runs_real_visitors print as
 * counts side by side, never divided into a percentage.
 *
 * TWO BRANCHES:
 *   - no usage rows at all (absent or not an array) — SAID, never rendered as zeros, the same
 *     rule the class census and John-model groups above it already follow;
 *   - the window rows — one line each, then a single first-use line read off the `all` window's
 *     `first_real_visitor_at` (the earliest real-visitor run ever, not per-window — there is only
 *     one "first" to report).
 */
export function renderInventionUse(rows, stamp) {
  const L = [];
  L.push(`**Invention in use** — *${stamp}.* Criterion 7 (\`docs/SELFBUILD-CHARTER.md\`): at ` +
    "least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is " +
    "measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.");
  L.push("");
  if (!Array.isArray(rows) || rows.length === 0) {
    L.push("- *Report Card usage was not read for this render* — which is **not** the same as " +
      "*no usage*. Re-run `scripts/render-standing-brief.js` with a service key.");
    L.push("");
    return L.join("\n");
  }
  for (const r of rows) {
    const n = Number(r.judge_runs);
    const m = Number(r.judge_runs_real_visitors);
    const k = Number(r.distinct_real_visitors);
    L.push(`- **${r.window}:** ${n} judge run${n === 1 ? "" : "s"}, ${m} by real visitor` +
      `${m === 1 ? "" : "s"} (${k} distinct).`);
  }
  L.push("");
  const all = rows.find(r => r.window === "all");
  if (all && all.first_real_visitor_at) {
    L.push(`- First real-visitor use: ${cst(all.first_real_visitor_at)}.`);
  } else {
    L.push("- *no real-visitor use yet.*");
  }
  L.push("");
  return L.join("\n");
}

/** How many ranked tickets the served-class block lists. The top of the order, never the whole board. */
export const SERVED_TOP_N = 5;

/**
 * FEATURE: SES-334 — the `Board by served class` fact group. PURE: (served facts, stamp) in, markdown
 * out, so tests/regression/ses-334-served-class-block.test.mjs drives it from a fixture the same way
 * the SES-84 / SES-004 / LOG-143 guards drive the three groups above it. `served` is exactly what
 * fetchFacts() reads: `{ counts, top, lastRankedAt }` — and NOTHING HERE COUNTS ANYTHING. The counts
 * are grouped in fetchFacts() off the rows it already reads; this renders them.
 *
 * THE THREE BRANCHES ARE THE SAME THREE THE GROUPS ABOVE USE, for the same reason:
 *   - `served` absent — SAID, never rendered as zeros;
 *   - no ticket carrying a served class — said as "none carries one yet", which is a REAL state
 *     (it was every open row until SES-332's first run) and not an error;
 *   - `lastRankedAt` null — said, and said as *never*, because a schedule that has not fired yet and
 *     a schedule that fired and wrote nothing are different facts and the brief must not blur them.
 *
 * `unserved` IS PRINTED EVEN AT ZERO, unlike SES-84's `unclassed` FLAG row. The reason they differ:
 * an unclassed CLAIM is drift by construction after SES-84, so its row appearing is itself a signal.
 * An unserved TICKET is ordinary — the served-class test (VC-MISSION-033) says most infrastructure
 * serves nothing an evaluator can see, and an honest "none" is the Prioritizer's own conservative
 * answer. Hiding the count would make the honest answer invisible.
 */
export function renderServedClass(served, stamp) {
  const L = [];
  L.push(`**Board by served class** — *${stamp}.* Which class each open ticket SERVES under the ` +
    "served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored " +
    "on `backlog_items.supports_class` — a ticket's own class is a different question and is not " +
    "restated here.");
  L.push("");
  if (!served || !Array.isArray(served.counts)) {
    L.push("- *The served-class census was not read for this render* — which is **not** the same as " +
      "*no ticket serves anything*. Re-run `scripts/render-standing-brief.js` with a service key.");
    L.push("");
    return L.join("\n");
  }

  const serving = served.counts.filter(c => c.supports_class);
  if (serving.length === 0) {
    L.push("- *No open ticket carries a served class yet* — a real state, not a gap: it was every " +
      "open row until `SES-332`'s first run.");
  } else {
    L.push("| serves | open tickets |");
    L.push("|---|---:|");
    for (const c of serving) L.push(`| \`${c.supports_class}\` | ${c.n} |`);
    const none = served.counts.find(c => !c.supports_class);
    L.push(`| *serves none* | ${none ? none.n : 0} |`);
  }
  L.push("");

  const top = Array.isArray(served.top) ? served.top.slice(0, SERVED_TOP_N) : [];
  if (top.length === 0) {
    L.push(`- *No ticket carries an \`automation_rank\`* — the order has not been written yet.`);
  } else {
    // The negatives are not a bug and a reader must not read them as one. John's own automation queue
    // was seeded with negative ranks so it sorts ahead of anything assigned later (SES-86 phase 3), so
    // the nightly re-rank's 1..N necessarily lands BELOW his order. That is the intended precedence —
    // his latest specific word outranks a standing ordering — and it is said here rather than left to
    // look like a re-rank that did not take.
    if (top.some(t => t.automation_rank < 0)) {
      L.push("- *Negative ranks are John's own automation queue, seeded to sort ahead of anything "
        + "assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — "
        + "intended precedence, not a re-rank that failed.*");
      L.push("");
    }
    L.push(`- **Top ${top.length} by \`automation_rank\`:**`);
    // The title goes through summarise() for the same reason the decision bullets do: it is text
    // past sessions wrote, some of it carrying backticks, and it ends inside a markdown line.
    for (const t of top) {
      L.push(`  ${t.automation_rank}. \`${t.backlog_id}\` — ${summarise(t.title, 90)}` +
        (t.supports_class ? ` *(serves ${t.supports_class})*` : " *(serves none)*"));
    }
  }
  L.push("");
  L.push(served.lastRankedAt
    ? `- Last scheduled re-rank: ${cst(served.lastRankedAt)}.`
    : "- Last scheduled re-rank: *never* — the daily `scripts/rank-backlog.js` pass (runner-cycle "
      + "step 4c) has written no cycle row yet. Not the same as a run that ranked nothing.");
  L.push("");
  return L.join("\n");
}

/**
 * FEATURE: SES-360 — the `Governance agents, last 7 days` fact group. PURE: (gov, stamp) in, markdown
 * out, the same contract as the four groups above it, so
 * tests/regression/ses-360-governance-agents-block.test.mjs drives it from fixtures. `gov` is exactly
 * what fetchFacts() reads: `{ roster, usage, ships }` — the roster from `agents` by LANE (never by
 * id — Rule #1, §19e), usage from `public.governance_agent_usage`, ships from
 * `public.ship_handoff_census`. NOTHING HERE COUNTS, SUMS OR DECIDES: the views are the one home for
 * the window, the join and SES-345's four-leg rule; this prints what came back.
 *
 * THREE BRANCHES, the same three the siblings use:
 *   - any of the three parts absent — SAID, never rendered as zeros;
 *   - a roster agent the view returned no row for — "no calls in the window", a MEASURED zero,
 *     because the view was read; a silent Builder is the row John most needs to see;
 *   - a NULL call_source — printed as *unlabelled*, never folded into a named source (LOG-128:
 *     an absent attribution is not evidence of automation).
 * Roles go through summarise(): they are agents-table text landing inside a markdown table row.
 * NO RATE, EVER — counts and token sums, printed side by side, never divided.
 */
export function renderGovernanceAgents(gov, stamp) {
  const L = [];
  L.push(`**Governance agents, last 7 days** — *${stamp}.* Whether the platform's own agents ` +
    "(`agents.lane = 'governance'`) are doing the development work, live from " +
    "`public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** " +
    "back from render time, like the decision counts above. Counts and token sums only, never a rate.");
  L.push("");
  if (!gov || !Array.isArray(gov.roster) || !Array.isArray(gov.usage) || !gov.ships) {
    L.push("- *The governance census was not read for this render* — which is **not** the same as " +
      "*no calls*. Re-run `scripts/render-standing-brief.js` with a service key.");
    L.push("");
    return L.join("\n");
  }
  L.push("| role | source | calls | input tokens | output tokens |");
  L.push("|---|---|---:|---:|---:|");
  for (const a of gov.roster) {
    const role = summarise(a.role, 60);
    const rows = gov.usage.filter(u => u.agent_id === a.id);
    if (rows.length === 0) { L.push(`| ${role} | *no calls in the window* | 0 | — | — |`); continue; }
    for (const u of rows) {
      const src = u.call_source == null ? "*unlabelled*" : `\`${u.call_source}\``;
      const un = Number(u.untokened) > 0 ? ` (${Number(u.untokened)} untokened)` : "";
      L.push(`| ${role} | ${src} | ${Number(u.calls)}${un} | ${Number(u.input_tokens)} | ${Number(u.output_tokens)} |`);
    }
  }
  L.push("");
  const s = gov.ships;
  L.push(`- **Ships with all four handoff rows: ${Number(s.ships_all_four)} of ${Number(s.ships)}** ships in the ` +
    "window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). " +
    `Missing per leg: kickoff_link ${Number(s.missing_kickoff)}, per-ticket sha ${Number(s.missing_sha)}, ` +
    `automation_rank ${Number(s.missing_rank)}, verdict ${Number(s.missing_verdict)}.`);
  L.push("- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation " +
    "(`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a " +
    "large call count beside a small token sum is that, not a cheap model.");
  L.push("");
  return L.join("\n");
}

/**
 * FEATURE: AGT-70 slice 3 — the `Auditor's ledger` fact group. PURE: (audit, stamp) in, markdown
 * out, the same contract as the five groups above it, so tests/regression/agt-70-auditor.test.mjs
 * drives it from fixtures. `audit` is exactly what fetchFacts() builds: `{ rows, filed }` — rows
 * from `public.audit_findings` (every week, newest first), `filed` the count of `backlog_items`
 * carrying `source_file = 'audit-ledger'`. NOTHING HERE RULES OR FILES: it prints what the ledger
 * holds and what has left it for the board.
 *
 * THE THREE BRANCHES ARE THE SIBLINGS' THREE, and the middle one is why this group exists:
 *   - `audit` absent or malformed — SAID, never rendered as zeros. "0 findings" and "I could not
 *     read the ledger" are the same bytes to a reader and opposite facts, and this group is the one
 *     John would read as "the audit found nothing wrong this week".
 *   - `rows` empty — a MEASURED zero, because the table was read. An em dash for the week, because
 *     there is no latest week when there are no rows.
 *   - rows present — the LATEST week's counts, and its `open` rows in the table. Older weeks are
 *     deliberately not listed: the ledger is cumulative and the brief is a standing page, so the
 *     whole history belongs in `docs/audits/<week>.md`, which `--report` already generates.
 *
 * NO RATE, EVER — counts side by side, never divided, the same rule the governance group keeps.
 * A `ruled` count is the interesting one: it is what `tripwire-to-backlog.js --from-ledger` will
 * file on the next cycle, so a number climbing here with `filed` flat means the cap is biting or
 * nobody has run the sweep.
 */
export function renderAuditLedger(audit, stamp) {
  const L = [];
  const lead = `**Auditor's ledger** — *${stamp}.* What \`public.audit_findings\` (\`AGT-70\`) holds ` +
    "and what has left it for the board. Counts only, never a rate.";

  if (!audit || !Array.isArray(audit.rows)) {
    L.push(lead);
    L.push("");
    L.push("- *The ledger was not read for this render* — which is **not** the same as *no findings*. " +
      "Re-run `scripts/render-standing-brief.js` with a service key.");
    L.push("");
    return L.join("\n");
  }

  const rows = audit.rows;
  // The latest week by ISO label. String compare is correct for `YYYY-Www` and is deliberately not
  // a date parse: the column IS the label, and re-deriving a date from it would be a second home
  // for the calendar rule that lives in scripts/audit-ledger.js.
  const week = rows.length ? rows.map(r => String(r.iso_week)).sort().slice(-1)[0] : null;
  const inWeek = week == null ? [] : rows.filter(r => String(r.iso_week) === week);
  const count = s => inWeek.filter(r => r.status === s).length;
  const ruled = inWeek.filter(r => r.status === "open" && r.ruled_by != null).length;

  L.push(`${lead} Latest week ${week ?? "—"}: ` +
    `**${inWeek.length} findings (${count("open")} open · ${count("resolved")} resolved · ` +
    `${count("not-a-defect")} not a defect)** — **${ruled} ruled** open findings (a ruled, open, ` +
    "`high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); " +
    `**${Number(audit.filed)} filed** to the board from the ledger so far ` +
    "(`source_file = 'audit-ledger'`).");
  L.push("");

  if (!rows.length) {
    L.push("- *The ledger holds no rows yet.*");
    L.push("");
    return L.join("\n");
  }

  const CONF = { high: 0, medium: 1, low: 2 };
  const open = inWeek
    .filter(r => r.status === "open")
    .sort((a, b) =>
      (CONF[a.confidence] ?? 99) - (CONF[b.confidence] ?? 99) ||
      String(a.fingerprint).localeCompare(String(b.fingerprint)));

  L.push("| fingerprint | kind | confidence | fact | ruled |");
  L.push("|---|---|---|---|---|");
  for (const r of open) {
    L.push(`| \`${r.fingerprint}\` | ${r.kind} | ${r.confidence} | ${summarise(r.governing_fact, 80)} | ` +
      `${r.ruled_by == null ? "—" : r.ruled_by} |`);
  }
  L.push("");
  L.push("- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled " +
    "and left `open` to file. Candidates a run found but nobody ingested live in " +
    "`docs/audits/<week>-candidates.json`, not here.*");
  L.push("");
  return L.join("\n");
}

/** How many nightly `audit-board` rows the hygiene group reads to count the unjudged streak. */
export const HYGIENE_NIGHTS_READ = 14;

/**
 * Was this nightly row JUDGED — the one predicate, used by the renderer and nothing else. The
 * positive tail only, for the reason spelled out in renderTicketHygiene's header: rows written
 * before AGT-79 slice 6 carry neither tail, and they are unjudged nights.
 */
function isJudgedNight(n) {
  return String(n?.notes ?? "").includes(" · judged ");
}

/**
 * FEATURE: AGT-79 slice 3 — `Ticket hygiene, last night`: what the Ticket Owner's nightly pass left
 * on the board. Pure, like every group above it — `hygiene` is what fetchFacts() read, and nothing
 * here goes near the network or the clock beyond the `nowIso` the caller passes.
 *
 * THREE FACTS, THREE HOMES, NO RATE. The open ledger grouped by check (with the age of the oldest
 * row in each, which is the number that says whether a gap is being ignored); the newest `hygiene`
 * decision with its reverse_decision() line ready to paste; and the newest nightly cycle row,
 * printed VERBATIM from its own notes.
 *
 * `nights open` IS A FLOOR, NOT A ROUNDING: Math.floor over whole days means a gap first seen
 * yesterday evening reads 0 until it has actually survived a night. A gap that reads 4 has been
 * looked at by four runs and left alone, which is the thing worth seeing.
 *
 * ABSENT IS NOT ZERO. A missing or non-array `open` renders "the hygiene ledger was not read",
 * never "no open findings" — the two sentences describe opposite situations and only one of them
 * is a measurement. The same rule governs `nights` below: absent renders "the night ledger was not
 * read", never a streak of 0, which would say the opposite of what was measured.
 *
 * AGT-79 slice 6 — WAS LAST NIGHT JUDGED, AND HOW LONG HAS IT NOT BEEN. The `Last run` bullet
 * prints the night's own notes verbatim, which is honest and, for the one fact that matters here,
 * invisible: five `audit-board` nights ran arithmetic-only and nothing on the board said so. This
 * group now reads the newest HYGIENE_NIGHTS_READ nights and answers the question directly.
 *
 * ONE PREDICATE, BOTH ERAS: a night is judged IFF its notes contain `" · judged "` — the tail
 * scripts/ticket-owner.js appends only when pass two wrote the audit row first (§19k), so the tail
 * standing in for the `ai_activity_log` row is a sound proxy and this file needs no second read.
 * The NEGATIVE tail (`· unjudged`) is deliberately NOT the predicate: every row written before
 * slice 6 lacks both tails, and reading the positive one classifies those correctly as unjudged.
 */
export function renderTicketHygiene(hygiene, stamp, nowIso) {
  const L = [];
  const lead = `**Ticket hygiene, last night** — *${stamp}.* What the Ticket Owner (\`AGT-79\`) left ` +
    "on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision " +
    "and the newest nightly cycle row. Counts only, never a rate.";

  if (!hygiene || !Array.isArray(hygiene.open)) {
    L.push(lead);
    L.push("");
    L.push("- *The hygiene ledger was not read for this render* — which is **not** the same as *a " +
      "clean board*. Re-run `scripts/render-standing-brief.js` with a service key.");
    L.push("");
    return L.join("\n");
  }

  const open = hygiene.open;
  const by = new Map();
  for (const r of open) {
    const slug = String(r.check_slug);
    const cur = by.get(slug);
    if (!cur) by.set(slug, { slug, n: 1, oldest: r.first_seen_at });
    else {
      cur.n++;
      if (Date.parse(r.first_seen_at) < Date.parse(cur.oldest)) cur.oldest = r.first_seen_at;
    }
  }
  const groups = [...by.values()].sort((a, b) => b.n - a.n || a.slug.localeCompare(b.slug));

  L.push(`${lead} **${open.length} open findings** across ${groups.length} check(s).`);
  L.push("");

  if (open.length === 0) {
    L.push("- **No open findings** — a measured zero: the ledger was read and holds no open row.");
    L.push("");
  } else {
    L.push("| check | open | oldest | nights open |");
    L.push("|---|---:|---|---:|");
    for (const g of groups) {
      const nights = Math.floor((Date.parse(nowIso) - Date.parse(g.oldest)) / 86400000);
      L.push(`| \`${g.slug}\` | ${g.n} | ${cst(g.oldest)} | ${nights} |`);
    }
    L.push("");
  }

  const run = hygiene.run;
  L.push(run
    ? `- Last run: \`${String(run.id).slice(0, 8)}\` · ${run.outcome} · ${cst(run.ended_at)} · ` +
      `${String(run.notes).replace(/^SCHEDULED-AGENT: audit-board — /, "")}`
    : "- *No nightly run on record yet* — runbook step 4e has not fired; the counts above are the " +
      "ledger as it stands.");

  const nights = hygiene.nights;
  if (!Array.isArray(nights)) {
    L.push("- *The night ledger was not read for this render* — which is **not** the same as *every " +
      "night judged*. Re-run `scripts/render-standing-brief.js` with a service key.");
  } else if (nights.length === 0) {
    L.push("- *No nightly run on record to judge* — a measured zero: the night ledger was read and " +
      "holds no `audit-board` row.");
  } else {
    let streak = 0;
    while (streak < nights.length && !isJudgedNight(nights[streak])) streak++;
    L.push(streak === 0
      ? `- Judgment: **the newest night was judged** — 0 unjudged nights on top, over the newest ` +
        `${nights.length} on record.`
      : `- Judgment: **the newest night ran UNJUDGED** — **${streak}** consecutive unjudged ` +
        `night(s), over the newest ${nights.length} on record. A night is judged only when its ` +
        "notes carry `· judged`; runbook step 4e is the line that fires it.");
  }

  const d = hygiene.decision;
  L.push(d
    ? `- Decision \`${String(d.id).slice(0, 8)}\` · ${d.status} · ${summarise(d.summary)} · finalises ` +
      `${d.expires_at ? cst(d.expires_at) : "—"} · \`select public.reverse_decision('${d.id}','John','<why>');\``
    : "- *No hygiene decision on record.*");

  L.push("");
  return L.join("\n");
}

/**
 * FEATURE: SES-378 slice 5 — `Staff watch`: what the Development Manager recorded about the
 * runner's own agents. Pure, like every group above it — `staff` is the array fetchFacts() read and
 * nothing here goes near the network or the clock.
 *
 * ONE ROW PER AGENT, and the grouping key is the agent because a Skill edit lands on ONE agent's
 * Skill (`tests/regression/ses-378c-staff-watch.test.mjs` (a) pins the same key on the fingerprint
 * side). Four numbers per agent: findings, distinct fingerprints, distinct cycles, newest.
 *
 * DISTINCT CYCLES IS NOT THE ROW COUNT, and printing only one of them would be the slice-4 defect
 * wearing a table. `PROMOTION_BAR` is 3 distinct CYCLES: three rows written by one chatty cycle is
 * one observation recorded three times and must never read as a defect three cycles saw. The two
 * columns sitting side by side are what let a reader see which of the two a number is.
 *
 * ABSENT IS NOT ZERO. A missing or non-array `staff` renders "the staff ledger was not read", never
 * a count — and deliberately never the words a measured zero uses, because "the read failed" and
 * "the ledger is empty" are opposite facts and only one of them is a measurement.
 */
export function renderStaffWatch(staff, stamp) {
  const L = [];
  const lead = `**Staff watch** — *${stamp}.* What the Development Manager (\`SES-378\`) recorded ` +
    "about the runner's own agents: `public.runner_staff_findings` rows per `agent_id`, with the " +
    "distinct fingerprints and the distinct CYCLES behind them. Counts only, never a rate.";

  if (!Array.isArray(staff)) {
    L.push(lead);
    L.push("");
    L.push("- *The staff ledger was not read for this render* — which is **not** the same as *an " +
      "empty ledger*. Re-run `scripts/render-standing-brief.js` with a service key.");
    L.push("");
    return L.join("\n");
  }

  const by = new Map();
  for (const r of staff) {
    const id = String(r.agent_id);
    let cur = by.get(id);
    if (!cur) by.set(id, (cur = { id, n: 0, fps: new Set(), cycles: new Set(), newest: null }));
    cur.n++;
    if (r.fingerprint != null) cur.fps.add(String(r.fingerprint));
    if (r.cycle_id != null) cur.cycles.add(String(r.cycle_id));
    if (!cur.newest || Date.parse(r.created_at) > Date.parse(cur.newest)) cur.newest = r.created_at;
  }
  const agents = [...by.values()].sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));

  L.push(`${lead} **${staff.length} finding(s)** across ${agents.length} agent(s).`);
  L.push("");

  if (staff.length === 0) {
    L.push("- **No findings — a measured zero:** the ledger was read and holds no row.");
    L.push("");
  } else {
    L.push("| agent | findings | distinct fingerprints | distinct cycles | newest |");
    L.push("|---|---:|---:|---:|---|");
    for (const a of agents) {
      L.push(`| \`${a.id}\` | ${a.n} | ${a.fps.size} | ${a.cycles.size} | ${a.newest ? cst(a.newest) : "—"} |`);
    }
    L.push("");
  }

  return L.join("\n");
}

/** How many gate ids the Human gates block names before it stops listing and says how many are left. */
export const HUMAN_GATE_IDS_SHOWN = 5;

/**
 * FEATURE: SES-386 — `Human gates`: the ONE repo-side home for "is anything waiting on John?".
 *
 * WHY IT EXISTS AT ALL, and it is a test-design fact rather than a reporting one. `M6-01`'s outcome
 * lives in two live columns — `backlog_items.design_status = 'needs-john'` and a
 * `gated_before_build` `runner_items` row with `decision IS NULL` — and NOTHING under `api/`,
 * `src/`, `shared/`, `lib/` or `scripts/` writes either of them (grep, 2026-09-15). They are board
 * state a human moves. Two regression guards (`ses-285` assertion 6, `ses-373` assertion 1) were
 * reading them live and FAILING the suite whenever the board was mid-flight: a red that grades
 * today's board, never the change under test, and that no session could act on. The counts are
 * worth SEEING, so they are rendered here and the guards assert THIS block instead.
 *
 * THREE BRANCHES, the same three every group above it uses, for the same reason:
 *   - `gates` absent — SAID, never rendered as zeros. "The reads did not happen" and "nothing is
 *     waiting on John" are opposite facts and the brief must not blur them;
 *   - both counts zero — a MEASURED zero, said as one;
 *   - either count non-zero — the count AND the ids, up to `HUMAN_GATE_IDS_SHOWN`, because a
 *     number with no handle is something a reader cannot act on.
 *
 * Pure: (gates, stamp) in, markdown out, driven from fixtures by
 * tests/regression/ses-386-board-not-gate.test.mjs.
 */
export function renderHumanGates(gates, stamp) {
  const L = [];
  const lead = `**Human gates** — *${stamp}.* The two reads that say whether anything is waiting on ` +
    "a human: open `backlog_items` carrying `design_status = 'needs-john'`, and `gated_before_build` " +
    "`runner_items` left with `decision IS NULL` (`M6-01`). Board state, written by no code in this " +
    "repo — which is why it is REPORTED here and not asserted as a gate by the regression suite.";

  if (!gates || !Array.isArray(gates.needsJohn) || !Array.isArray(gates.undecidedCards)) {
    L.push(lead);
    L.push("");
    L.push("- *The human-gate state was not read for this render* — which is **not** the same as " +
      "*nothing is waiting on a human*. Re-run `scripts/render-standing-brief.js` with a service key.");
    L.push("");
    return L.join("\n");
  }

  const tickets = gates.needsJohn;
  const cards = gates.undecidedCards;
  const list = (ids) => {
    const shown = ids.slice(0, HUMAN_GATE_IDS_SHOWN).map(id => `\`${String(id)}\``).join(", ");
    const rest = ids.length - Math.min(ids.length, HUMAN_GATE_IDS_SHOWN);
    return rest > 0 ? `${shown} …and ${rest} more` : shown;
  };

  L.push(`${lead} **${tickets.length} open \`needs-john\` ticket(s)**, ` +
    `**${cards.length} undecided \`gated_before_build\` card(s)**.`);
  L.push("");
  if (tickets.length === 0 && cards.length === 0) {
    L.push("- **Nothing blocks on a human** — a measured zero: both reads ran and both came back " +
      "empty, so `M6-01` holds on the board it governs.");
  } else {
    if (tickets.length > 0) L.push(`- **\`needs-john\` (${tickets.length}):** ${list(tickets)}`);
    if (cards.length > 0) L.push(`- **Undecided gated cards (${cards.length}):** ${list(cards)}`);
    L.push("- *Open is not wrong.* A card nobody has answered yet is a real board state; what it is " +
      "NOT is a regression, so nothing in the suite goes red for it.");
  }
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
  // FEATURE: SES-334 — served joins the destructure on the same terms as census/johnModel/inventionUse:
  // absent means "not read", never "nothing serves anything".
  // FEATURE: SES-360 — governance joins the destructure on the same terms as served/inventionUse:
  // absent means "not read", never "no governance agent called anything".
  // FEATURE: AGT-70 slice 3 — audit joins the destructure on the same terms as governance: absent
  // means "not read", never "the ledger holds no findings".
  // FEATURE: AGT-79 slice 3 — hygiene joins the destructure on the same terms as audit: absent
  // means "not read", never "the Ticket Owner found nothing".
  // FEATURE: SES-386 — humanGates joins the destructure on the same terms as hygiene: absent means
  // "not read", never "nothing is waiting on a human".
  // FEATURE: SES-378 slice 5 — staff joins the destructure on the same terms as humanGates: absent
  // means "not read", never "the Development Manager found nothing".
  // FEATURE: SES-413 slice 3 — daily joins the destructure on the same terms as staff: absent means
  // "not read", never "a quiet week in which nothing was decided for you".
  const { items, settings, drain, decisions, daily, census: classCensus, johnModel, inventionUse, served, governance, audit, hygiene, humanGates, staff } = facts;
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
    // FEATURE: SES-334 close-out (design-runner-24h-0908, 2026-09-09) — A BATCH OF DECISIONS IS ONE
    // LINE, NOT ONE LINE EACH. Measured before this shipped: the Prioritizer's first run (SES-332)
    // wrote 567 `classification` decisions, one per ticket, and this block printed all of them, so
    // the standing brief — a file every session reads at start — went from 18 KB to 149 KB in one
    // ship. A kind with more than OPEN_DECISION_BATCH open rows on one CST day collapses to a single
    // line carrying the count, the finalise span and the query that lists them; the kinds John reads
    // one by one (gate, ship, directive, invention, reversal) stay one line each. The threshold is a
    // DISPLAY constant, not a cadence — SES-146's "every cadence number is a column" does not reach it.
    const OPEN_DECISION_BATCH = 20;
    const byKindDay = new Map();
    for (const d of decisions.open) {
      const day = d.expires_at ? new Date(d.expires_at).toLocaleDateString("en-US", { timeZone: "America/Chicago" }) : "—";
      const key = `${d.kind || "—"}|${day}`;
      if (!byKindDay.has(key)) byKindDay.set(key, []);
      byKindDay.get(key).push(d);
    }
    const collapsed = new Set();
    for (const [key, rows] of byKindDay) if (rows.length > OPEN_DECISION_BATCH) collapsed.add(key);
    const printedBatch = new Set();
    for (const d of decisions.open) {
      const day = d.expires_at ? new Date(d.expires_at).toLocaleDateString("en-US", { timeZone: "America/Chicago" }) : "—";
      const key = `${d.kind || "—"}|${day}`;
      if (collapsed.has(key)) {
        if (printedBatch.has(key)) continue;
        printedBatch.add(key);
        const rows = byKindDay.get(key);
        const first = rows[0].expires_at ? cst(rows[0].expires_at) : "—";
        const last = rows[rows.length - 1].expires_at ? cst(rows[rows.length - 1].expires_at) : "—";
        L.push(`- **${rows.length} ${d.kind} decisions** finalising ${first} → ${last} · one batch, ` +
          "listed by query rather than one line each: " +
          `\`select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='${d.kind}' order by expires_at;\` · ` +
          "reverse any one with `select public.reverse_decision('<id>','John','<why>');`");
        continue;
      }
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

  // ---- Decided for you (FEATURE: SES-413 slice 3 — MANAGER-DECIDES-BY-DEFAULT line 3) --------
  // AFTER `Open decisions` and BEFORE `Judgment classes`, which puts the two decision groups next
  // to each other on the page: the undo list, then the record of what was decided. `Human gates`
  // stays last (SES-386). Same contract as every group around it — a pure helper a fixture can
  // drive, rendering what fetchFacts() read and counting nothing the tables could have counted.
  L.push(renderDailyDecisions(daily, stamp, nowIso));

  // ---- Judgment classes (FEATURE: SES-84 — M7 gate ruling ii) ------------------------------
  // After Open decisions, before the provenance line. The group is a pure helper so the guard can
  // assert it from a fixture; it renders what the view returned and counts nothing itself.
  L.push(renderJudgmentClasses(classCensus, stamp));

  // ---- John-model (FEATURE: SES-004 — M7 gate ruling iii) ----------------------------------
  // After Judgment classes, before the provenance line. Same contract as the group above it: a pure
  // helper the guard can assert from a fixture, rendering what the view returned and counting
  // nothing itself.
  L.push(renderJohnModel(johnModel, stamp));

  // ---- Invention in use (FEATURE: LOG-143 (c) — criterion 7's instrument) -------------------
  // After John-model, before the provenance line. Same contract as the two groups above it: a
  // pure helper the guard can assert from a fixture, rendering what the view returned and
  // counting nothing itself.
  L.push(renderInventionUse(inventionUse, stamp));

  // ---- Board by served class (FEATURE: SES-334) --------------------------------------------
  // After Invention in use, before the provenance line. Same contract as the three groups above it:
  // a pure helper the guard can assert from a fixture, rendering what fetchFacts() grouped and
  // counting nothing itself.
  L.push(renderServedClass(served, stamp));

  // ---- Governance agents, last 7 days (FEATURE: SES-360) ------------------------------------
  // After Board by served class, before the provenance line. Same contract as the four groups
  // above it: a pure helper the guard can assert from a fixture, rendering what the views returned
  // and counting nothing itself.
  L.push(renderGovernanceAgents(governance, stamp));

  // ---- Auditor's ledger (FEATURE: AGT-70 slice 3) -------------------------------------------
  // After Governance agents, before the provenance line. Same contract as the five groups above it:
  // a pure helper the guard can assert from a fixture, rendering what the table returned and
  // counting nothing the table could have counted itself.
  L.push(renderAuditLedger(audit, stamp));

  // ---- Ticket hygiene, last night (FEATURE: AGT-79 slice 3) ---------------------------------
  // After the Auditor's ledger, before the provenance line. Same contract as the six groups above
  // it: a pure helper the guard can assert from a fixture, rendering what the tables returned and
  // printing the night's own notes rather than recounting the board behind them.
  L.push(renderTicketHygiene(hygiene, stamp, nowIso));

  // ---- Staff watch (FEATURE: SES-378 slice 5) -----------------------------------------------
  // AFTER Ticket hygiene and BEFORE Human gates, which keeps Human gates the last group: this one
  // reports what a cycle found about the runner's own agents, and the group below it is the one
  // that says whether anything above it is waiting on a person. Same contract as the seven groups
  // above it — a pure helper a fixture can drive, rendering what fetchFacts() read and counting
  // nothing the table could have counted itself.
  L.push(renderStaffWatch(staff, stamp));

  // ---- Human gates (FEATURE: SES-386) -------------------------------------------------------
  // After Staff watch (SES-378 slice 5 landed between it and Ticket hygiene), before the provenance
  // line. The LAST group deliberately: it is the one that says whether anything above it is waiting
  // on a person rather than on a cycle. Same
  // contract as the eight groups above it — a pure helper a fixture can drive, rendering the two
  // reads fetchFacts() made and counting nothing they could have counted themselves.
  L.push(renderHumanGates(humanGates, stamp));

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

// FEATURE: SES-334 — `init` is optional and additive; every existing call passes nothing and is
// byte-identical. It exists so an RPC (`rpc/backlog_display_title`, a POST) can go through the SAME
// die-on-non-2xx path as every read here rather than getting its own hand-rolled fetch with its own
// error handling — which is the shape that lets one caller silently swallow a 403 the others refuse.
async function rest(base, key, pathAndQuery, init = {}) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, ...(init.body ? { "Content-Type": "application/json" } : {}) };
  let res;
  try {
    res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, { ...init, headers });
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

  // FEATURE: SES-413 slice 3 — the DAILY list, and the questions the rule counts against it.
  //
  // HERE, RIGHT AFTER `decisions`, BECAUSE `since` IS THE SAME WINDOW. These three reads share the
  // rolling 7-day cutoff computed above rather than recomputing one, so the weekly question count
  // and the weekly final/reversed counts one group up can never be measured over two different
  // weeks — which is the failure a second `new Date(Date.now() - …)` in this function would create
  // silently, and only at the seam of a day.
  //
  // BY `decided_at`, NOT BY `status`, and that is the whole difference from the read above it: the
  // open read answers "what can still be undone", this one answers "what was decided", and a
  // finalised decision — the normal end state — is invisible to the first and central to the second.
  //
  // THE SECOND AND THIRD READS ARE THE COUNTED HALF OF THE RULE. `runner_questions` appeared NOWHERE
  // in this file before this slice, so "a question that still reaches him is counted weekly, target
  // zero" was a promise with no instrument. Two reads and not one: `asked_at=gte.${since}` is the
  // WEEKLY count the target is about, and `status=eq.open` is the standing backlog of questions
  // still sitting on John regardless of when they were asked. Live at this ship those are 0 and 17,
  // which is exactly why both are needed — one number alone reads as "no questions" and is wrong.
  //
  // Columns are NAMED, never `select=*` (.claude/rules/supabase-column-grants.md). A read that did
  // not happen comes back non-array and REFUSES here, rather than rendering a measured-looking quiet
  // week nobody measured — the same posture as every read above.
  const dailyRows = await rest(url, key,
    `runner_decisions?select=id,kind,backlog_id,summary,status,decided_at&decided_at=gte.${since}&order=decided_at.desc&limit=2000`);
  if (!Array.isArray(dailyRows)) die("the daily decisions read came back non-array — refusing to render the daily list from nothing");
  const dailyQuestions = await rest(url, key,
    `runner_questions?select=qid,question,status,asked_at&asked_at=gte.${since}&order=asked_at.desc&limit=1000`);
  if (!Array.isArray(dailyQuestions)) die("the weekly questions read came back non-array — refusing to render the daily list from nothing");
  const openQuestionRows = await rest(url, key, "runner_questions?select=qid&status=eq.open&limit=1000");
  if (!Array.isArray(openQuestionRows)) die("the open questions read came back non-array — refusing to render the daily list from nothing");
  const daily = { rows: dailyRows, questions: dailyQuestions, openQuestions: openQuestionRows.length };

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

  // FEATURE: LOG-143 (c) — the report-card usage rows, read from the VIEW and never re-derived
  // here; the view is also where the real-visitor predicate lives, so this script never decides
  // who counts as a real visitor. report_card_usage is service_role only (mirrors
  // platform_scoreboard's own grants), the same key everything above needs. Columns are named
  // rather than `*` — this file's own rule — and `order=ord` pins the 7d/30d/all order the view
  // defines. The view ALWAYS returns its three window rows (no GROUP BY that could vanish), so an
  // empty array means the read itself is wrong and this refuses rather than publishing a silent gap.
  const inventionUse = await rest(url, key,
    "report_card_usage?select=window,ord,judge_runs,judge_runs_real_visitors,distinct_real_visitors,first_real_visitor_at,last_real_visitor_at&order=ord");
  if (!Array.isArray(inventionUse) || inventionUse.length === 0) die("report_card_usage came back empty — refusing to render invention-in-use from nothing (the view always returns its three window rows)");

  // FEATURE: SES-334 — the served-class census and the top of the automation order.
  //
  // READ HERE RATHER THAN ADDED TO THE `items` PROJECTION ABOVE, deliberately. `items` is the board
  // census every group above it counts from, and its column list is load-bearing (`.claude/rules/
  // supabase-column-grants.md`: a star select is a 403 waiting to happen, and a widened projection
  // silently changes what factsSha() hashes for every OTHER group). A separate named read keeps this
  // group's facts this group's.
  //
  // NO VIEW, AND THAT IS A CHOICE. judgment_class_census / john_model_signal / report_card_usage are
  // views because each applies a rule — a floor, a real-visitor predicate — that must have exactly one
  // home. This group applies none: it is a GROUP BY over two stored columns. Inventing a view for it
  // would add a migration and a second place to look for a number that is already on the row.
  const servedRows = await rest(url, key,
    "backlog_items?status=in.(open,partial)&select=backlog_id,title,description,supports_class,automation_rank&limit=5000");
  if (!Array.isArray(servedRows)) die("the served-class read came back non-array — refusing to render it from nothing");
  const servedCounts = new Map();
  for (const r of servedRows) {
    const k = r.supports_class || null;
    servedCounts.set(k, (servedCounts.get(k) || 0) + 1);
  }
  // Named classes in P1→P10 order, then the serves-none bucket last — the same lower-number-wins
  // order CLASS_ORDER pins for the group above, so the table never churns between renders.
  const counts = [...servedCounts.entries()]
    .map(([supports_class, n]) => ({ supports_class, n }))
    .sort((a, b) => {
      if (!a.supports_class) return 1;
      if (!b.supports_class) return -1;
      return Number(a.supports_class.match(/^P(\d+)/)[1]) - Number(b.supports_class.match(/^P(\d+)/)[1]);
    });

  // The top of the order. `backlog_display_title()` is the ONE sanctioned source for a ticket's
  // display name (`docs/runbooks/runner-cycle.md`: never the raw title column, never the gist
  // extract) — called as an RPC per row rather than reimplemented here, which is five calls and no
  // second copy of the predicate.
  const ranked = servedRows
    .filter(r => Number.isInteger(r.automation_rank))
    .sort((a, b) => a.automation_rank - b.automation_rank)
    .slice(0, SERVED_TOP_N);
  const top = [];
  for (const r of ranked) {
    const disp = await rest(url, key, "rpc/backlog_display_title", {
      method: "POST",
      body: JSON.stringify({ p_title: r.title, p_description: r.description }),
    }).catch(() => null);
    top.push({
      backlog_id: r.backlog_id,
      automation_rank: r.automation_rank,
      title: typeof disp === "string" ? disp : (r.title || r.backlog_id),
      supports_class: r.supports_class || null,
    });
  }

  // When the schedule last wrote. The NOTES PREFIX is the key, not the trigger alone: the runner's
  // own cycles are `scheduled` too, and counting one of those as a re-rank would report a re-rank
  // that never happened.
  const rankCycles = await rest(url, key,
    `runner_cycles?select=started_at&trigger=eq.scheduled&notes=like.${encodeURIComponent("SCHEDULED-AGENT: rank-backlog%")}`
    + "&order=started_at.desc&limit=1");
  const lastRankedAt = Array.isArray(rankCycles) && rankCycles[0] ? rankCycles[0].started_at : null;

  const served = { counts, top, lastRankedAt };

  // FEATURE: SES-360 — governance-agent usage and the four-row ship census, read from VIEWS and
  // never re-derived here. THE VIEW IS NOT OPTIONAL: ai_activity_log exceeds a REST page (1,311
  // governance rows in 7 days against PostgREST's 1,000-row cap, measured 2026-09-11) and rest()
  // neither pages nor forwards a Range header, so a GROUP BY in this file would be the truncated
  // number the ticket was filed to end. Both views are service_role only (the SES-78a rule), the
  // same key everything above needs. Columns are named rather than `*` — this file's own rule.
  //
  // THE ROSTER IS READ BY LANE, NEVER BY ID (Rule #1, §19e): a GROUP BY cannot return an agent
  // with no rows, and a silent agent is the row John most needs to see, so the renderer walks the
  // roster and says "no calls in the window" for one the view did not return. `order=code` pins
  // GV-01..GV-06 so the table never churns between renders.
  const govRoster = await rest(url, key, "agents?select=id,role,code&lane=eq.governance&order=code");
  if (!Array.isArray(govRoster) || govRoster.length === 0) die("no governance-lane agents came back — refusing to render the governance group from nothing (SES-338 shipped six)");
  const govUsage = await rest(url, key,
    "governance_agent_usage?select=code,agent_id,role,call_source,calls,input_tokens,output_tokens,untokened&order=code,call_source.nullslast");
  if (!Array.isArray(govUsage)) die("governance_agent_usage came back non-array — refusing to render it from nothing");
  // An EMPTY usage array is a real state (no governance call in 7 days), not a failed read.
  const shipCensus = await rest(url, key,
    "ship_handoff_census?select=ships,ships_all_four,missing_rank,missing_kickoff,missing_sha,missing_verdict");
  if (!Array.isArray(shipCensus) || shipCensus.length !== 1) die("ship_handoff_census must return exactly one row (an aggregate with no GROUP BY) — refusing to render it from nothing");
  const governance = { roster: govRoster, usage: govUsage, ships: shipCensus[0] };

  // FEATURE: AGT-70 slice 3 — the Auditor's ledger and what has left it for the board.
  //
  // NO VIEW, AND THAT IS THE SAME CHOICE SES-334 MADE ABOVE: this group applies no rule a view would
  // have to own — it is the table's own rows and one COUNT over a `source_file` — and the counting
  // that does happen (per status, per week) happens in renderAuditLedger() where a fixture can drive
  // it. Columns are NAMED, never `select=*` (.claude/rules/supabase-column-grants.md).
  //
  // AN EMPTY LEDGER IS A REAL STATE and must not die() the way the view reads above do: a fresh
  // database with no findings yet renders "the ledger holds no rows yet", which is true. What is NOT
  // a real state is a read that did not happen — that comes back non-array and refuses here, so the
  // brief never publishes a measured-looking zero it did not measure.
  const auditRows = await rest(url, key,
    "audit_findings?select=fingerprint,iso_week,kind,confidence,status,governing_fact,ruled_by" +
    "&order=iso_week.desc,fingerprint&limit=1000");
  if (!Array.isArray(auditRows)) die("the audit_findings read came back non-array — refusing to render the ledger group from nothing");
  const auditFiled = await rest(url, key,
    "backlog_items?select=id&source_file=eq.audit-ledger&limit=1000");
  if (!Array.isArray(auditFiled)) die("the audit-ledger filing read came back non-array — refusing to render the ledger group from nothing");
  const audit = { rows: auditRows, filed: auditFiled.length };

  // FEATURE: AGT-79 slice 3 — the Ticket Owner's ledger, its decision, and the night that wrote it.
  //
  // THREE READS, NO VIEW, AND NO JOIN: the group prints three independent facts and does its one
  // piece of counting (per check) in renderTicketHygiene() where a fixture can drive it. Columns are
  // NAMED, never `select=*` (.claude/rules/supabase-column-grants.md).
  //
  // The run read is `notes=like.<prefix>%` against the same NIGHTLY_PREFIX scripts/ticket-owner.js
  // writes and reads for its own precondition — one string, one meaning, both ends.
  //
  // AN EMPTY LEDGER IS A REAL STATE (it renders as a measured zero) but a read that did not happen
  // is not: a non-array refuses here rather than publishing a clean-looking board nobody measured.
  const hygOpen = await rest(url, key,
    "ticket_owner_findings?select=check_slug,first_seen_at&cleared_at=is.null&order=check_slug,first_seen_at&limit=10000");
  if (!Array.isArray(hygOpen)) die("the ticket_owner_findings read came back non-array — refusing to render the hygiene group from nothing");
  const hygDec = await rest(url, key,
    "runner_decisions?select=id,status,summary,expires_at,decided_at&kind=eq.hygiene&order=decided_at.desc&limit=1");
  if (!Array.isArray(hygDec)) die("the hygiene decision read came back non-array — refusing to render the hygiene group from nothing");
  // AGT-79 slice 6 — the same read, widened from 1 row to HYGIENE_NIGHTS_READ so the group can say
  // how MANY consecutive nights went unjudged, not just what the newest one said. `run` stays
  // `hygRun[0]`, the identical value the limit=1 read produced, so factsSha's `hygiene` member is
  // byte-for-byte what it was and --check reports no drift from this widening. The streak itself is
  // deliberately NOT in the sha: it moves every night by construction, and drift is for what John
  // has to look at, not for the clock.
  const hygRun = await rest(url, key,
    "runner_cycles?select=id,ended_at,outcome,notes&notes=like." + encodeURIComponent("SCHEDULED-AGENT: audit-board%") +
    `&ended_at=not.is.null&order=ended_at.desc&limit=${HYGIENE_NIGHTS_READ}`);
  if (!Array.isArray(hygRun)) die("the nightly cycle read came back non-array — refusing to render the hygiene group from nothing");
  const hygiene = { open: hygOpen, decision: hygDec[0] ?? null, run: hygRun[0] ?? null, nights: hygRun };

  // FEATURE: SES-378 slice 5 — the Development Manager's staff findings, one read, no view.
  //
  // THE ROWS, NOT A GROUPING: the per-agent counting happens in renderStaffWatch() where a fixture
  // can drive it, the same division every group above it keeps. Columns are NAMED, never `select=*`
  // (.claude/rules/supabase-column-grants.md) — and `detail` is deliberately absent, because the
  // group prints counts and a finding's prose belongs to `scripts/staff-watch.js`, not to a brief.
  //
  // AN EMPTY LEDGER IS A REAL STATE (it renders as a measured zero) but a read that did not happen
  // is not: a non-array refuses here rather than publishing a clean-looking staff nobody measured.
  const staff = await rest(url, key,
    "runner_staff_findings?select=agent_id,kind,fingerprint,cycle_id,created_at&order=created_at.desc&limit=10000");
  if (!Array.isArray(staff)) die("the runner_staff_findings read came back non-array — refusing to render the staff-watch group from nothing");

  // FEATURE: SES-386 — the two human-gate reads, moved here from two regression guards.
  //
  // THE FILTERS ARE THE ONES ses-285 ASSERTION 6 AND ses-373 ASSERTION 1 RAN, character for
  // character, and that is deliberate: this block REPLACES those reads as the one home, so a
  // divergence in the predicate would mean the brief and the guards were talking about different
  // boards. Columns are NAMED, never `select=*` (.claude/rules/supabase-column-grants.md).
  //
  // A NON-ARRAY REFUSES rather than rendering an unmeasured zero, same posture as every read above:
  // an empty set here is the good state, which is exactly why a failed read must never look like one.
  const gateTickets = await rest(url, key,
    "backlog_items?select=backlog_id&design_status=eq.needs-john&status=not.in.(done,delivered,removed)&limit=1000");
  if (!Array.isArray(gateTickets)) die("the needs-john read came back non-array — refusing to render the human-gate group from nothing");
  const gateCards = await rest(url, key,
    "runner_items?select=id&kind=eq.gated_before_build&decision=is.null&limit=1000");
  if (!Array.isArray(gateCards)) die("the undecided-card read came back non-array — refusing to render the human-gate group from nothing");
  const humanGates = {
    needsJohn: gateTickets.map(r => r.backlog_id),
    undecidedCards: gateCards.map(r => r.id),
  };

  return { items, settings, drain, decisions, daily, census: classCensus, johnModel, inventionUse, served, governance, audit, hygiene, humanGates, staff };
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
