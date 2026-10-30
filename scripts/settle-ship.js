#!/usr/bin/env node
// DeepBench v7.0.924 | scripts/settle-ship.js | AGT-506 -- the close-out records its own ship
// decision; a `delivered` status is refused before the first write when no verdict backs it.
// DeepBench v7.0.852 | scripts/settle-ship.js | AGT-454 -- directive link column
// ticket_ref; the five of 2026-10-08/09 linked and closed.
// DeepBench v7.0.851 | scripts/settle-ship.js | AGT-454 -- directive closes with its ticket's
// delivered settle; closed stays closed.
// DeepBench v7.0.654 | scripts/settle-ship.js | AGT-128 -- TRIGGER 2 FIRES ONLY WHEN THE STOP LINE
// SAYS **THIS** TICKET CLOSES `partial`. The measurement that found it, and the four ordered steps
// that decide it, live at `stopLineClosesPartial()` below -- the one home for both.
// DeepBench v7.0.626 | scripts/settle-ship.js | AGT-176 (part c) -- THE CLOSE-OUT RESOLVES ITS OWN
// COST, AND AN ABSENT MEASUREMENT IS NOT A ZERO.
//
// THE DEFECT, measured 2026-09-27 rather than recalled. NOTHING in scripts/, api/ or lib/ wrote
// `runner_cycles.api_cost_dev_usd`: `grep -ln cost_usd scripts/*.js` returned agent-log.js and
// verifier.js only, and this script -- which the ticket said already did it -- did not touch cost at
// all. The single writer was docs/runbooks/runner-cycle.md:4069-4070, a MODEL hand-typing the figure
// at the end of a long run, under an instruction that says "$0 is the normal value". So a cycle that
// measured nothing and a cycle that genuinely cost nothing published the identical 0, and the eight
// newest cycle rows all read 0. A number that is derivable is never a model's to type (pattern:9/:10).
//
// THE BUG IS LATENT, NOT LIVE, AND THAT IS DELIBERATELY RECORDED HERE. `ai_activity_log` has never
// carried a `call_source = 'executor'` row (0 rows, any date), and every row at
// `visitor_id = <cycle id>` across the eight newest cycles is `call_source = 'session'` -- John's
// subscription seat, unbillable BY CONSTRUCTION. So every 0 on this chain was HONEST and no published
// number is being corrected. This ships the resolver that keeps it honest the first time a billable
// call actually happens.
//
// THE SUM IS NOT RE-IMPLEMENTED HERE. lib/activity-log.js's resolveCycleCost() is the one shared
// copy (pattern:14/:15) -- the same module that already prices a SINGLE row NULL-never-0 at its
// :209-213. This file reads rows and writes cells; it owns no arithmetic.
//
// WHY `runner_cycles` AND NOT THE SHIP CARD. This script runs at runner-cycle.md step 7 (:3248) and
// step 9 files the `kind = 'ship'` card at :4007 -- so at the moment this runs the card does not
// exist yet. The cycle row always does. The card PATCH is therefore CONDITIONAL on finding one, and
// on the ordinary cycle it finds none and says so.
//
// `api_cost_dev_usd` WAS NOT NULL UNTIL AGT-204 (v7.0.637); IT IS NULLABLE NOW AND THE BRANCH WRITES
// THE NULL. HISTORY, kept because it explains the shape of the code below rather than describing it:
// through v7.0.626-v7.0.636 a `PATCH {api_cost_dev_usd: null}` answered HTTP 400 / 23502, "null value
// in column \"api_cost_dev_usd\" of relation \"runner_cycles\" violates not-null constraint", so the
// `unpriced-rows` answer had nowhere to go. v7.0.626 took the only honest option left to it -- LEAVE
// THE CELL ALONE and record the absence as `cost_basis: unpriced-rows` in `notes` -- and filed the
// constraint as finding e5922187-882d-4d02-b37c-3ca3303cc2c1 rather than patching around it. AGT-204
// dropped NOT NULL on BOTH cost columns (migration `agt204_cost_columns_nullable`), so `:241` is now
// unconditional: the absence is stored AS the absence. The `notes` clause stays -- it is what says
// WHICH branch produced the NULL, which the cell alone cannot.
//
// NOTHING WAS BACKFILLED, AND THAT IS A DESIGN DECISION, NOT AN OMISSION. All 729 cycle rows read 0
// on `api_cost_dev_usd` and 726 of them on `api_cost_qa_usd` (three carry real figures: 1.2537,
// 2.2656, 3.5144). Those zeros are not KNOWN wrong, and NULLing them would destroy the very
// distinction this ticket creates. The column default also stays `0`. NULL means "we could not tell"
// from AGT-204 forward; a historical 0 keeps saying exactly what it said before.
// DeepBench v7.0.519 | scripts/settle-ship.js | SES-385 slice 2 -- THE CLOSE-OUT SETTLES ITSELF.
//
// THE DEFECT, measured on the live board rather than argued. `SES-385` slice 1 (`v7.0.506`) put the
// rule in prose: when the cycle's own record names unbuilt work the status is `partial`, the
// `design_status` flag is cleared, and the `kickoff_link` is kept. The runbook has carried that
// clause at L3272-3278 since, and check 12 (`remainder-stranded`) has been live to find the rows
// where it was not followed. IT FAILED TWICE ON THE SAME DAY ANYWAY: `SES-413`, whose kickoff says
// "slice 1 of 4" in its own first section, and `SES-415`, whose STOP LINE says to close `partial`
// in so many words, both read `status = 'delivered'` with `kickoff_link` NULL -- so
// `ship_handoff_census.missing_kickoff` read 4. A prose rule a human has to remember at the end of
// a long cycle is a rule that gets forgotten at the end of a long cycle. Slice 1 wrote the rule
// down; this slice makes it a command, so the close-out settles itself.
//
// WHY THE VERDICT IS NOT AN INPUT, AND THAT IS THE LOAD-BEARING PART. The obvious shape for this
// script is "approve -> delivered, block -> partial", and it is wrong in the exact direction the
// two live failures went. `SES-413` and `SES-415` both had sound work behind them; what made them
// `partial` was their OWN RECORD naming work that was not built -- a slice count, a STOP LINE, an
// undecided card, a declared remainder. A `delivered` on a kickoff that names a remainder is a BUG,
// never an override, so `decideStatus()` does not take a verdict at all and there is no argument
// that can be passed to make it ignore one of its four triggers. The verdict decides whether the
// ship is accepted; this decides whether the ship is FINISHED. They are different questions.
//
// FIVE TRIGGERS, ANY ONE OF WHICH IS ENOUGH (`partial` iff any):
//   1. the kickoff says `slice N of M` with N < M      -- the document admits its own remainder
//   2. its STOP LINE closes THIS ticket `partial`      -- the design already decided this
//   3. an undecided `gated_before_build` card is open  -- something was gated and never answered
//   4. `--remainder=` is non-empty                     -- the operator names work left behind
//   5. a `gated_before_build` card on it was ruled `rework` -- AGT-167: the gate answered, and the
//      answer was "not finished". Trigger 3 stops firing the instant the card is stamped, and
//      `public.apply_gate_rulings()` section 3b writes `scope_rationale` and `design_status` and
//      NEVER `status` -- so without this trigger a row that went `delivered` under an open card
//      keeps reading `delivered` after the card says otherwise. `k_stamp` maps `needs-desktop` onto
//      the SAME `rework` stamp, so one word covers both rulings and there is no second branch here.
//
// THE WRITE PATH IS COPIED, NOT REINVENTED: `rest()` (scripts/ticket-owner.js:653) and the
// decision -> full-row image -> read-back-PATCH order of `applyPlan()` (:729). The ORDER is the
// safety property -- the decision row exists before the image, the image exists before the cell it
// images moves, so one `reverse_decision()` puts the row back whatever failed halfway. The PATCH is
// read back key by key because PostgREST answers 200 with the OLD value when the role cannot write
// a column, and a write that silently did not land would otherwise report success.
//
// `select=*` on the row read is deliberate and is not a `select` to tighten: `reverse_decision()`
// restores every column from `row_data`, so an image built from a column list would restore a
// partial row. Same reasoning as `applyPlan()` step 2.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// AGT-176 (part c) -- the ONE cost resolver, imported rather than copied. scripts/ importing lib/ is
// the same crossing scripts/agent-log.js already makes for logActivity(); the module is pure at the
// point this file touches it (no network, no disk, no process.env in resolveCycleCost()).
import { resolveCycleCost, SUBSCRIPTION_LANES } from "../lib/activity-log.js";

// ---------------------------------------------------------------------------------------------
// The pure half. Nothing below this block reads the network, the disk, or process.env, so
// tests/regression/ses-385b-settle-ship.test.mjs asserts every branch by value.
// ---------------------------------------------------------------------------------------------

const SLICE_RE = /\bslice\s+(\d+)\s+of\s+(\d+)\b/i;
const STOP_LINE_RE = /^##\s*7\.?\s*STOP LINE/im;

// AGT-128 -- THE PATTERNS THE STOP LINE READER IS WRITTEN IN. Each is named rather than inlined
// because each one is the whole reason one of `stopLineClosesPartial()`'s ordered steps can go red
// on its own, and a test that mutates one must have something to point at.
const SECTION_END_RE = /^##\s/m;                 // the section ends at the NEXT `## ` heading, not at EOF
const SENTENCE_SPLIT_RE = /(?<=[.;!?])\s+|\n+/;  // one decision per sentence; `;` splits -- a STOP LINE writes clauses
const PARTIAL_RE = /\bpartial\b/i;               // the word itself: necessary, and since this ship never sufficient
const CONDITIONAL_RE = /\b(?:if|unless|in case)\b/i;
const CLOSE_AS_PARTIAL_RE = /\bclose\s+as\s*:\s*[`*_]*partial\b/i;
const TICKET_ID_RE = /\b[A-Z]{2,6}-\d{1,4}[a-z]?\b/g;

// A status this script must never touch. `done` is John's word (`SES-154`) and `removed` /
// `removal proposed` are a different lifecycle entirely; settling one of those from a close-out
// would overwrite a human decision with a mechanical one.
export const UNSETTLEABLE = new Set(["done", "removed", "removal proposed"]);

// stopLineClosesPartial(text, ticketId = null) -> boolean
//
// THE DEFECT, measured 2026-09-27 by running `decideStatus()` over the live kickoffs rather than
// recalled. The reader this replaces was `/\bpartial\b/i.test(s.slice(stop.index))`: ANY occurrence
// of the word anywhere after the `## 7. STOP LINE` heading, with no ticket scope and no section end.
// A STOP LINE reading "Mark `AGT-88` done -- slice 1 was left `partial` pending this" is reporting
// ANOTHER ticket's status, and one reading "if arm E had no credentials, write `partial: ...`" is
// naming a branch that did not happen -- and each settled its OWN finished ship `partial`. That is
// not cosmetic: a wrongly-`partial` row stays in the pick path (`scripts/ticket-owner.js:227` and
// `scripts/audit-board.js:59` both read `["open","partial"]`), so the runner can re-pick and
// rebuild work that already shipped. Of the 46 live kickoffs the old reader fired on, 3 were this
// shape and 43 were the ship speaking about itself.
//
// THE UNIT IS A SENTENCE, NOT THE SECTION, because a sentence is the smallest span that carries a
// subject -- a STOP LINE routinely names this ticket, another ticket and a conditional in three
// consecutive ones. Every sentence carrying the word is judged in this ORDER, and the order is the
// design: step 1 runs BEFORE step 2 so that `Close as: partial` inside an `if` stays a branch.
//
//   1. CONDITIONAL (`if` / `unless` / `in case`) -> SKIP. An instruction is not a declaration that
//      this ticket closed partial; the branch that actually happened arrives at this script as
//      trigger 4, `--remainder=`, which is a fact about the run and not a sentence about a plan.
//   2. `Close as: partial` -> TRUE. The explicit form fires whatever else the section names.
//   3. NAMES NO ID -> TRUE. The ship speaking about itself, which is how 11 of the 43 that still
//      fire are written -- requiring an id would strand 11 real remainders to catch 2.
//   4. ITS IDS INCLUDE `ticketId` -> TRUE. Any other id and the sentence is about someone else,
//      so the loop CONTINUES rather than returning: one sentence's silence is not the section's.
//
// A NULL `ticketId` reads step 3 and can never reach step 4 -- a caller that will not say which
// ticket it is asking about gets the id-blind answer, never a guess at which id is "its own".
export function stopLineClosesPartial(text, ticketId = null) {
  const s = typeof text === "string" ? text : "";
  const stop = s.match(STOP_LINE_RE);
  if (!stop) return false;                    // no STOP LINE heading: no section to have said it
  const after = s.slice(stop.index);
  const nl = after.indexOf("\n");
  let section = after;                        // no newline at all: the heading line IS the section
  if (nl !== -1) {
    const body = after.slice(nl + 1);         // searched past the heading, which itself starts `## `
    const end = body.search(SECTION_END_RE);
    section = after.slice(0, nl + 1 + (end === -1 ? body.length : end));
  }
  const want = typeof ticketId === "string" && ticketId.trim() !== "" ? ticketId.trim().toUpperCase() : null;
  for (const sentence of section.split(SENTENCE_SPLIT_RE)) {
    if (!PARTIAL_RE.test(sentence)) continue;
    if (CONDITIONAL_RE.test(sentence)) continue;                              // 1
    if (CLOSE_AS_PARTIAL_RE.test(sentence)) return true;                      // 2
    const ids = sentence.match(TICKET_ID_RE) ?? [];
    if (ids.length === 0) return true;                                        // 3
    if (want !== null && ids.some(id => id.toUpperCase() === want)) return true; // 4
  }
  return false;
}

// readRemainder(text, ticketId = null) -> { slice: {n, m} | null, stopPartial: boolean }
//
// Both halves read the kickoff's OWN words. `slice` is the FIRST match in the whole document,
// because the declaration lives in section 1 and later sections quote it; taking the last would
// pick up the "REMAINING, slice 3" line that describes what is NOT being built.
//
// `stopPartial` is scoped to the STOP LINE section and not the whole file, and that scope is the
// discriminator rather than tidiness: the word `partial` appears in ordinary kickoff prose about
// OTHER tickets' statuses all over sections 2 and 5. A kickoff with no STOP LINE heading reads
// false -- there is no section to have said it. Since AGT-128 the section scope is necessary but no
// longer sufficient: `stopPartial` is true only when a sentence in that section says THIS ticket
// closes `partial`, which is `stopLineClosesPartial()` above and `ticketId` is how it knows which
// ticket that is.
export function readRemainder(text, ticketId = null) {
  const s = typeof text === "string" ? text : "";
  const m = s.match(SLICE_RE);
  const slice = m ? { n: Number(m[1]), m: Number(m[2]) } : null;
  const stopPartial = stopLineClosesPartial(s, ticketId);
  return { slice, stopPartial };
}

// decideStatus({ kickoffText, ticketId, gatedOpen, gateReworked, remainder }) -> { status, reasons[] }
//
// `reasons` is every trigger that fired, not the first: an operator reading the plan needs to know
// the ticket is partial for three reasons, because clearing one of them does not settle it.
// THERE IS NO VERDICT PARAMETER. See the header.
//
// AGT-167 -- `gateReworked` IS OPTIONAL AND DEFAULTS `false` ON PURPOSE. Both callers that existed
// before this ship (`main()` below and `scripts/ticket-owner.js` check 12) keep byte-identical
// answers until they pass it, so adding trigger 5 cannot move a single existing verdict; the new
// trigger reaches the board only through `resettleTicket()`, which reads the ruled card itself.
export function decideStatus({ kickoffText = "", ticketId = null, gatedOpen = false, gateReworked = false, remainder = null } = {}) {
  const { slice, stopPartial } = readRemainder(kickoffText, ticketId);
  const reasons = [];
  if (slice && slice.n < slice.m) reasons.push(`the kickoff declares slice ${slice.n} of ${slice.m}`);
  if (stopPartial) reasons.push("the kickoff's STOP LINE names `partial`");
  if (gatedOpen) reasons.push("an undecided `gated_before_build` card is open on this ticket");
  if (gateReworked) reasons.push("a `gated_before_build` card on this ticket was ruled `rework`");
  if (typeof remainder === "string" && remainder.trim() !== "") reasons.push(`a remainder was declared: ${remainder.trim()}`);
  if (reasons.length > 0) return { status: "partial", reasons };
  return { status: "delivered", reasons: ["the record names no unbuilt work: no slice remainder, no STOP LINE `partial`, no open card, no card ruled `rework`, no declared remainder"] };
}

// planSettle(row, kickoffPath, status) -> { id, patch: { status, design_status, kickoff_link } }
//
// THREE CELLS, ALWAYS THE SAME THREE, whichever status was decided -- that is slice 1's rule in
// full and the reason the flag and the link are not conditional. `design_status` is cleared so a
// spent kickoff stops advertising a design that is already built (this is check 12's whole
// subject); `kickoff_link` is SET rather than cleared because `ship_handoff_census` reads it and
// `ck_design_status_kickoff` allows the cleared flag beside a live link, never the reverse.
export function planSettle(row, kickoffPath, status) {
  if (!row || typeof row !== "object" || row.id == null) {
    throw new Error("planSettle: no row to settle — the ticket was not found on the board");
  }
  if (UNSETTLEABLE.has(row.status)) {
    throw new Error(`planSettle: ${row.backlog_id ?? row.id} reads \`${row.status}\` — settling it would overwrite a decision this script does not get to make`);
  }
  if (status !== "partial" && status !== "delivered") {
    throw new Error(`planSettle: ${JSON.stringify(status)} is not a status a close-out writes — expected \`partial\` or \`delivered\``);
  }
  if (typeof kickoffPath !== "string" || kickoffPath.trim() === "") {
    throw new Error("planSettle: the kickoff path is the link this write sets — it cannot be empty");
  }
  return { id: row.id, patch: { status, design_status: null, kickoff_link: kickoffPath } };
}

// AGT-506 -- THE SHIP DECISION IS THIS SCRIPT'S TO RECORD, NOT A LINE A MODEL HAND-TYPES AT THE
// FOOT OF A LONG RUN.
//
// THE DEFECT, measured on tree 3a42e3f on 2026-10-30 rather than recalled. `grep -c
// record_ship_decision scripts/settle-ship.js` read 0; the only code callers were the two RE-GRADE
// paths (`scripts/verifier.js`, `scripts/regrade-delivered.js`), which record a handle for a ship
// somebody already recorded wrong. The only writer of a FORWARD ship decision was PROSE: the SQL
// block at `docs/runbooks/runner-cycle.md` step 7, asked of a model at the end of the cycle. The
// cost of that is countable, and was counted: 19 `delivered` tickets hold an `approve` verdict and
// NO `kind = 'ship'` decision, so 19 accepted deliveries shipped with no Reverse handle at all --
// and `reverse_decision()` being the only demote, none of them could cost the ladder a rung. Same
// shape, same file, same lesson as `AGT-454`'s directive close two versions ago: a rule a human has
// to remember at the end of a long cycle is a rule that gets forgotten at the end of a long cycle.
//
// IT IS A SECOND DOOR OF THIS SCRIPT, NOT THE SAME STATEMENT AS THE STATUS WRITE, and that is the
// deviation this ship declares rather than buries (the `SES-196` convention). AGT-506's text asks
// for "the same statement as the delivered status"; that is NOT buildable. The runbook's own
// **IT GOES HERE, AT THE FOOT OF THE CLOSE-OUT** block forbids moving the call up beside the status
// write -- the `decision_id IS NULL` adoption would pick up none of the cycle's later writes, and
// `reverse_decision()`'s written-since guard would refuse every one of them -- and
// `tests/regression/ses-315-ship-reverse.test.mjs` pins that ordering with a break-mutation whose
// text is literally "IT GOES BESIDE THE STATUS WRITE". So `--ship` runs where the hand-typed line
// stood, after the push, and the ordinary settle gets the ticket's OTHER half instead: an `approve`
// carrying no verdict row is refused BEFORE the first write.
//
// THE VERDICT IS STILL NOT AN INPUT TO THE STATUS -- see `decideStatus()`'s header, which says so
// in full, and nothing here weakens it. It is an input to the SHIP DECISION, a different write with
// a different subject: `record_ship_decision()` takes the verdict id as an ARGUMENT, so a ship
// decision with no verdict cannot be recorded at all, and the refusals below are its refusals read
// out of the function body rather than guessed at.
//
// planShip({ status, ticket, verdict, cycleRow, existing }) -> { action, reason, args?, id? }
//
// FIVE ACTIONS, EACH WITH ITS OWN `reason`, because the operator reading a line that wrote nothing
// has to know WHICH nothing it was: a `partial` ship (`skip`) is correct and final, a `block`
// (`none`) is `SES-402`/`SES-403`'s subject and belongs to the re-grade, and a missing verdict or a
// sha that does not match (`refuse`) is a MISTAKE that must stop the run rather than pass quietly.
// `existing` is read before anything is planned rather than relying on the function's idempotence:
// the runbook STATES it is idempotent per (cycle, ticket) and this session did not probe it, so the
// script asks the ledger instead of trusting a sentence (CLAUDE.md: verify, never assert from memory).
export function planShip({ status, ticket, verdict = null, cycleRow = null, existing = null } = {}) {
  if (status !== "delivered") {
    return {
      action: "skip",
      reason: `${ticket} reads \`${status}\` — only a \`delivered\` ticket has an accepted delivery to hand a Reverse for; a \`partial\` records none`,
    };
  }
  if (existing && typeof existing === "object" && typeof existing.id === "string" && existing.id !== "") {
    return {
      action: "done",
      id: existing.id,
      reason: `a \`ship\` decision for ${ticket} already exists on this cycle — a second one would adopt no before-images (the sweep is \`decision_id IS NULL\`) and report a Reverse that restores nothing`,
    };
  }
  if (!verdict || typeof verdict !== "object" || typeof verdict.id !== "string" || verdict.id === "") {
    return {
      action: "refuse",
      reason: `this cycle holds no \`runner_verdicts\` row for ${ticket} — the verdict id is an ARGUMENT of record_ship_decision(), so there is nothing to attach the handle to`,
    };
  }
  if (verdict.verdict !== "approve") {
    return {
      action: "none",
      reason: `verdict ${verdict.id} reads \`${verdict.verdict}\` — a ship decision is the handle on an ACCEPTED delivery, and record_ship_decision() raises on anything but \`approve\` (SES-402/SES-403 read that refusal)`,
    };
  }
  const sha = typeof cycleRow?.push_sha === "string" ? cycleRow.push_sha.trim() : "";
  if (sha === "" || sha !== verdict.graded_sha) {
    return {
      action: "refuse",
      reason: sha === ""
        ? `the cycle row carries no \`push_sha\` — before the push has landed there is no sha to pass (\`SES-345\`)`
        : `push_sha ${sha} is not verdict ${verdict.id}'s graded_sha ${verdict.graded_sha} — the tree graded is not the tree pushed: re-run 7a on the pushed HEAD, never pass the sha through (\`SES-345\`)`,
    };
  }
  return {
    action: "record",
    reason: `${ticket} settled \`delivered\` on \`approve\` verdict ${verdict.id}, whose graded_sha is the pushed sha`,
    args: {
      p_cycle_id: cycleRow.id ?? null,
      p_backlog_id: ticket,
      p_version: verdict.version,
      p_push_sha: sha,
      p_verdict_id: verdict.id,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The CLI half (credentials, disk, exit codes).
// ---------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ALLOWED_FLAGS = new Set(["ticket", "kickoff", "cycle-id", "remainder", "apply", "resettle", "ship"]);

// AGT-167 -- ONE DIRECTION, and the constant is here rather than inline so the guard has a name a
// test can point at. `resettleTicket()` moves a row OFF `delivered` and nothing else: `partial` is
// already the safe side of this decision (a wrongly-`partial` row is merely re-pickable, a wrongly-
// `delivered` one is out of the pick path entirely), and `done` / `removed` / `removal proposed`
// are `UNSETTLEABLE` above. The reverse move, `partial -> delivered`, needs a done-predicate this
// ticket's own gate ruling parked, so it is not written here on a guess.
export const RESETTLE_FROM = "delivered";
export const canResettle = row => Boolean(row) && typeof row === "object" && row.status === RESETTLE_FROM;

// AGT-454 -- A DIRECTIVE OF JOHN'S CLOSES WHEN THE TICKET THAT CARRIES IT SETTLES `delivered`.
//
// THE DEFECT, measured live 2026-10-12 rather than recalled. `close_directive()` has existed since
// SES-129 and the ONLY thing that called it was PROSE: runbook step 9 (`runner-cycle.md:4136`) asked
// a model at the end of a long cycle to notice that the ticket it just shipped was John's directive
// and to run the RPC by hand. `grep -c 'close_directive\|item_ref\|runner_directives'` over this
// file read 0 before this ship. So John's own queued words stayed `in_progress` after the work that
// discharged them was on `dev`, and the board he reads could not tell a live instruction from a
// finished one. A rule a human has to remember at the end of a long cycle is a rule that gets
// forgotten at the end of a long cycle (the SES-385 slice-2 lesson, same shape, same file).
//
// THE TRIGGER IS `delivered`, NOT `done` (pattern:89). The ticket's own words say "settles that
// ticket done"; this script NEVER writes `done` -- `done` is `UNSETTLEABLE` at :122 and belongs to
// `sweep_decision_windows` (runbook :4285). `delivered` is the finished state `applySettle()`
// actually writes, so `delivered` is the trigger. `partial` names unbuilt work and closes NOTHING:
// a directive whose ticket is half-built is still live, and that is the whole discrimination.
//
// THE LINK IS `ticket_ref`, AND `item_ref` IS NEVER READ (D1 -- card `1d100088`, option B). The
// gate that parked this one version ago is ruled. `item_ref` was polysemous in shipped data:
// measured live 2026-10-12, 8 of 109 rows set it, SEVEN resolving to `runner_items` (briefing card
// ids -- `lib/briefing-automation.mjs` reads the column that way) and exactly ONE (`009eeb7a`) to
// `backlog_items` (AGT-264), so a ticket link read from there could only ever be a guess checked
// against two tables. `v7.0.852` gave the link a column of its own instead:
// `runner_directives.ticket_ref uuid`, constraint `runner_directives_ticket_ref_fkey` ->
// `backlog_items(id)` ON DELETE RESTRICT, proven both directions in the migration's own gate. The
// database now refuses a wrong answer, so this file stops reading `item_ref` ENTIRELY -- not in the
// SELECT, not in the filter, not in the match -- and asks the FK-enforced question: "is this row's
// `ticket_ref` THIS ticket's `backlog_items.id`?" It writes neither column: the only write here is
// `close_directive()`.
export const DIRECTIVE_OPEN = new Set(["queued", "in_progress"]);
export const DIRECTIVE_CLOSES_AT = "delivered";

// The pure half: rows in, a plan out, no I/O and no clock. The `type` / `status` filter lives HERE
// and not only in the PostgREST query, so the one rule has one home -- a caller that widens its
// read (or a test that hands in a row by hand) cannot close a `standing` row or a `drain-epic` by
// reaching this function through a different door.
export function planDirectiveClose({ directives = [], ticket, ticketRowId, status, kickoffPath } = {}) {
  if (status !== DIRECTIVE_CLOSES_AT) return [];
  if (typeof ticketRowId !== "string" || ticketRowId === "") return [];
  const note = `Shipped as ${ticket}: the close-out settled it delivered (kickoff ${kickoffPath}).`;
  return (Array.isArray(directives) ? directives : [])
    .filter(d =>
      Boolean(d) && typeof d === "object" &&
      d.type === "directive" &&
      DIRECTIVE_OPEN.has(d.status) &&
      typeof d.ticket_ref === "string" && d.ticket_ref === ticketRowId)
    .map(d => ({ id: d.id, outcome: "shipped", note }));
}

// AGT-167 -- `fail()` THROWS; only the CLI entry point turns it into an exit code. It used to call
// `process.exit(2)` directly, which was correct while this file was a command and nothing else.
// `scripts/decide-gated-card.js` now calls `resettleTicket()` IN PROCESS after
// `apply_gate_rulings()` has already committed, and its contract is that a failed re-settle never
// fails the ruling -- a `process.exit()` inside `rest()` would take the ruling's own exit code and
// its undo lines with it, which is exactly the failure that contract forbids. The CLI behaviour is
// unchanged: same `settle-ship: <message>` on stderr, same exit 2.
export class SettleShipError extends Error {}

function fail(message) {
  throw new SettleShipError(message);
}

function arg(argv, name) {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (hit === undefined) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
}

// Copied from scripts/ticket-owner.js:653 -- one fetch path every read AND every write goes
// through, so no caller gets its own error handling and its own chance to swallow a 403.
async function rest(base, key, pathAndQuery, init = {}, label = null) {
  const at = label ? `${label}: ` : "";
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers ?? {}),
  };
  let res;
  try {
    res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, { ...init, headers });
  } catch (e) {
    fail(`${at}could not reach the Supabase REST endpoint: ${e.message}`);
  }
  const body = await res.text().catch(() => "");
  if (!res.ok) fail(`${at}Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}`);
  if (body.trim() === "") return null;
  try {
    return JSON.parse(body);
  } catch (e) {
    fail(`${at}Supabase REST returned a body that is not JSON: ${e.message}`);
  }
}

function renderPlan({ ticket, kickoffRel, row, decided, plan, gatedOpen }) {
  let out = `settle-ship: ${ticket} — ${row.status} → ${plan.patch.status}\n`;
  out += `  kickoff      ${kickoffRel}\n`;
  out += `  design_status ${JSON.stringify(row.design_status)} → null\n`;
  out += `  kickoff_link  ${JSON.stringify(row.kickoff_link)} → ${JSON.stringify(plan.patch.kickoff_link)}\n`;
  out += `  open gated_before_build card: ${gatedOpen ? "yes" : "no"}\n`;
  for (const r of decided.reasons) out += `  · ${r}\n`;
  return out;
}

// AGT-506 -- THE THREE READS THE SHIP DECISION IS PLANNED FROM, in one place so the ordinary
// settle's precondition and the `--ship` door ask the ledger the SAME question (pattern:14). All
// three go through `rest()` like everything else, so none of them gets its own chance to swallow a
// 403. The verdict read is `order=created_at.desc&limit=1`: a cycle that was re-graded holds more
// than one row for the ticket and the NEWEST is the one the ship attaches to.
export async function readShipInputs({ base, key, cycleId, ticket } = {}) {
  const c = encodeURIComponent(cycleId);
  const t = encodeURIComponent(ticket);
  const verdicts = await rest(base, key,
    `runner_verdicts?select=id,verdict,graded_sha,version&cycle_id=eq.${c}&backlog_id=eq.${t}&order=created_at.desc&limit=1`,
    {}, "read verdict");
  const cycles = await rest(base, key, `runner_cycles?select=id,push_sha&id=eq.${c}`, {}, "read cycle row");
  const decisions = await rest(base, key,
    `runner_decisions?select=id&kind=eq.ship&cycle_id=eq.${c}&backlog_id=eq.${t}&limit=1`, {}, "read ship decision");
  if (!Array.isArray(verdicts) || !Array.isArray(cycles) || !Array.isArray(decisions)) {
    fail("read ship inputs: one of the three reads came back non-array — refusing to plan a ship decision on a set that was not read.");
  }
  return { verdict: verdicts[0] ?? null, cycleRow: cycles[0] ?? null, existing: decisions[0] ?? null };
}

// AGT-506 -- THE WRITE, AND IT IS THE ONLY BRANCH THAT POSTS. `done`, `none` and `skip` report
// themselves and return, so this function is safe to call on a dry run for those three: that is
// how the no-write path prints the SAME words it would print under `--apply`, instead of a second
// copy of the sentence living in `main()`. `refuse` never reaches here under `--apply` -- `main()`
// turns it into exit 2 before any write, which is the ticket's own second half.
export async function recordShip({ base, key, plan, log = s => process.stdout.write(s) } = {}) {
  if (!plan || typeof plan !== "object") {
    fail("recordShip: no plan — planShip() decides and this function only writes what it decided.");
  }
  if (plan.action === "done") {
    log(`  already recorded ${plan.id}\n`);
    return { recorded: null, id: plan.id };
  }
  if (plan.action !== "record") {
    log(`  ${plan.action} — ${plan.reason}\n`);
    return { recorded: null, id: null };
  }
  const id = await rest(base, key, "rpc/record_ship_decision", {
    method: "POST",
    body: JSON.stringify(plan.args),
  }, "record_ship_decision");
  if (typeof id !== "string" || id.length !== 36) {
    fail(`record_ship_decision: returned ${JSON.stringify(id)}, which is not a decision id`);
  }
  log(`  ship decision: ${id}\n`);
  return { recorded: id, id };
}

// AGT-176 (part c) -- the write half. Two targets, one decision: the cycle row (always present at
// step 7) and this cycle's ship card (usually absent at step 7, so conditional).
//
// THE NULL BRANCH WRITES THE NULL, AND THAT IS THE POINT OF THE TICKET. Since AGT-204 (v7.0.637)
// `api_cost_dev_usd` is nullable, so `unpriced-rows` is stored there as NULL — the cell now says "we
// could not tell" in its own right instead of keeping a default 0 that reads as a measurement. This
// script still asserts no dollar figure it cannot stand behind; the difference is that the absence
// is no longer invisible to anything that reads only the column. `notes` keeps `cost_basis: <basis>`
// because two different branches can produce the same cell and only the basis separates them.
// `runner_items.cost_usd` was already nullable, so the card takes the NULL directly when one exists.
//
// THE BEFORE-IMAGE ON `runner_cycles` IS A RECORD OF THE PRIOR VALUE, NOT A ONE-COMMAND UNDO:
// `reversible_tables()` lists 16 tables and `runner_cycles` is not among them (`runner_items` IS), so
// `reverse_decision()` will restore the card but not the cycle row. The image is still written —
// the prior value must be recoverable by hand — and the reasoning below says so rather than implying
// an undo that does not exist.
async function writeCost({ base, key, cycleId, cost }) {
  const cycleRows = await rest(base, key, `runner_cycles?select=*&id=eq.${encodeURIComponent(cycleId)}`, {}, "read cycle row");
  if (!Array.isArray(cycleRows) || cycleRows.length !== 1) {
    process.stdout.write(`  cost: cycle ${cycleId} matched ${Array.isArray(cycleRows) ? cycleRows.length : 0} rows — no cost written\n`);
    return;
  }
  const cycleRow = cycleRows[0];
  const cards = await rest(base, key,
    `runner_items?select=id,cost_usd&cycle_id=eq.${encodeURIComponent(cycleId)}&kind=eq.ship`, {}, "read ship card");
  const card = Array.isArray(cards) && cards.length === 1 ? cards[0] : null;

  const clause = `cost_basis: ${cost.basis}`;
  const prior = typeof cycleRow.notes === "string" ? cycleRow.notes : "";
  // Never appended twice. A second run of the close-out must not stack the same clause onto `notes`.
  const notes = prior.includes(clause) ? prior : (prior.trim() === "" ? clause : `${prior} | ${clause}`);

  const cyclePatch = { notes };
  // AGT-204: UNCONDITIONAL. The NULL is the answer, so it is written as the answer. See the block above.
  cyclePatch.api_cost_dev_usd = cost.usd;

  const reasoning =
    `settle-ship.js resolved this cycle's own API cost with lib/activity-log.js's resolveCycleCost() over ` +
    `${cost.billable} billable ai_activity_log row(s) at visitor_id=${cycleId} (${cost.priced} priced): ` +
    `cost_usd=${cost.usd === null ? "null" : cost.usd}, cost_basis=${cost.basis}. The set is NOT-subscription ` +
    `(lanes billing nothing: ${[...SUBSCRIPTION_LANES].join(", ")}), never a positive \`executor\` match — that ` +
    `matches 0 rows platform-wide and would sum nothing while looking green. ` +
    (cost.usd === null
      ? `\`api_cost_dev_usd\` was SET TO NULL — the column became nullable in AGT-204 (v7.0.637), so the absence is now stored as the absence rather than left at the default 0, and \`${clause}\` in notes says which branch decided it. `
      : `\`api_cost_dev_usd\` = ${cost.usd}. `) +
    `The before-image on runner_cycles records the prior value but is NOT reversible by reverse_decision() — ` +
    `runner_cycles is not in reversible_tables(). AGT-176 part c. pattern:9 pattern:14`;

  const decision = await rest(base, key, "rpc/record_decision", {
    method: "POST",
    body: JSON.stringify({
      p_cycle_id: cycleId,
      p_session_name: null,
      p_kind: "resolve",
      p_backlog_id: null,
      p_summary: `Close-out cost resolved: cost_usd=${cost.usd === null ? "null" : cost.usd}, cost_basis=${cost.basis}`,
      p_reasoning: reasoning,
      p_ladder_work_class: null,
    }),
  }, "cost record_decision");
  if (typeof decision !== "string" || decision.length !== 36) {
    fail(`cost record_decision: returned ${JSON.stringify(decision)}, which is not a decision id`);
  }

  const images = [{
    cycle_id: cycleId, session_name: null, table_name: "runner_cycles",
    pk_value: cycleRow.id, row_data: cycleRow, decision_id: decision,
  }];
  if (card) {
    const full = await rest(base, key, `runner_items?select=*&id=eq.${encodeURIComponent(card.id)}`, {}, "image ship card");
    if (Array.isArray(full) && full.length === 1) {
      images.push({ cycle_id: cycleId, session_name: null, table_name: "runner_items", pk_value: card.id, row_data: full[0], decision_id: decision });
    }
  }
  await rest(base, key, "runner_before_images", {
    method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(images),
  }, `cost image (decision ${decision})`);

  const back = await rest(base, key, `runner_cycles?id=eq.${encodeURIComponent(cycleId)}`, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(cyclePatch),
  }, `cost patch (decision ${decision})`);
  const afterCycle = Array.isArray(back) ? back[0] : null;
  if (!afterCycle) fail(`cost patch (decision ${decision}): the PATCH returned no row`);
  for (const k of Object.keys(cyclePatch)) {
    const got = afterCycle[k], want = cyclePatch[k];
    const same = (typeof want === "number" && got !== null && got !== undefined)
      ? Number(got) === Number(want)
      : String(got ?? null) === String(want ?? null);
    if (!same) fail(`cost patch (decision ${decision}): ${k} read ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
  }

  let cardNote = "no `kind=ship` card exists for this cycle yet (step 7 runs before step 9 files it) — card not patched";
  if (card) {
    const cb = await rest(base, key, `runner_items?id=eq.${encodeURIComponent(card.id)}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ cost_usd: cost.usd }),
    }, `cost card patch (decision ${decision})`);
    const afterCard = Array.isArray(cb) ? cb[0] : null;
    if (!afterCard) fail(`cost card patch (decision ${decision}): the PATCH returned no row`);
    const got = afterCard.cost_usd;
    const ok = cost.usd === null ? (got === null) : Number(got) === Number(cost.usd);
    if (!ok) fail(`cost card patch (decision ${decision}): cost_usd read ${JSON.stringify(got)}, expected ${JSON.stringify(cost.usd)}`);
    cardNote = `card ${card.id} cost_usd ${JSON.stringify(card.cost_usd)} → ${JSON.stringify(afterCard.cost_usd)}`;
  }

  process.stdout.write(
    `  cost applied: decision ${decision}, ${images.length} before-image(s) · ` +
    `cost_usd=${cost.usd === null ? "null" : cost.usd} cost_basis=${cost.basis} · ` +
    `runner_cycles.api_cost_dev_usd → ${afterCycle.api_cost_dev_usd === null ? "null" : afterCycle.api_cost_dev_usd} · ${cardNote}\n`);
}

// AGT-167 -- THE ONE HOME FOR THE `backlog_items.status` WRITE. This block was inline in `main()`
// until this ship, which made it reachable only by running the close-out command with a `--kickoff`
// path in hand. `resettleTicket()` below needs the identical decision -> before-image ->
// read-back-PATCH sequence from a different entry door, and a second copy of it is exactly the
// drift `pattern:14`/`pattern:15` exist to stop -- so the block was LIFTED, not re-implemented, and
// `main()` now calls it like everyone else.
//
// THE ORDER IS THE SAFETY PROPERTY, unchanged: the decision row exists before the image, and the
// image exists before the cell it images moves, so one `reverse_decision()` puts the row back
// whatever failed halfway. The PATCH is read back key by key because PostgREST answers 200 with the
// OLD value when the role cannot write a column.
//
// EXACTLY ONE OF `cycleId` / `sessionName` IS SENT, refused here rather than at the 400:
// `ck_decision_attribution` on `runner_decisions` and `ck_before_image_attribution` on
// `runner_before_images` each take one attribution, never both and never neither.
export async function applySettle({
  base, key, cycleId = null, sessionName = null, ticket, row, kickoffPath, status, reasons = [],
  log = s => process.stdout.write(s),
} = {}) {
  const hasCycle = typeof cycleId === "string" && cycleId !== "";
  const hasSession = typeof sessionName === "string" && sessionName !== "";
  if (hasCycle === hasSession) {
    fail("applySettle: exactly one of cycleId / sessionName — `ck_decision_attribution` takes one attribution, never both and never neither.");
  }
  const plan = planSettle(row, kickoffPath, status);

  // 1 -- the decision. It exists before the image, and the image before the cell.
  const summary = `Close-out: ${ticket} settles \`${plan.patch.status}\``;
  const reasoning =
    `settle-ship.js read ${kickoffPath} and the undecided \`gated_before_build\` cards, and decided \`${plan.patch.status}\`: ` +
    `${(Array.isArray(reasons) ? reasons : []).join("; ")}. The verdict is not an input — a \`delivered\` on a record naming unbuilt work is a bug, never an override. ` +
    `Writing status, \`design_status\` NULL (a spent kickoff stops advertising a built design) and \`kickoff_link\` = this kickoff (\`ship_handoff_census\` reads it). SES-385 slice 2. pattern:0`;

  const decision = await rest(base, key, "rpc/record_decision", {
    method: "POST",
    body: JSON.stringify({
      p_cycle_id: hasCycle ? cycleId : null,
      p_session_name: hasSession ? sessionName : null,
      p_kind: "ticket-status",
      p_backlog_id: ticket,
      p_summary: summary,
      p_reasoning: reasoning,
      p_ladder_work_class: null,
    }),
  }, "record_decision");
  if (typeof decision !== "string" || decision.length !== 36) {
    fail(`record_decision: returned ${JSON.stringify(decision)}, which is not a decision id`);
  }
  const where = step => `${step} (decision ${decision})`;

  // 2 -- the FULL row imaged, before a single cell moves. `row` is already a select=* read.
  await rest(base, key, "runner_before_images", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{
      cycle_id: hasCycle ? cycleId : null,
      session_name: hasSession ? sessionName : null,
      table_name: "backlog_items",
      pk_value: row.id,
      row_data: row,
      decision_id: decision,
    }]),
  }, where("image row"));

  // 3 -- the PATCH, READ BACK key by key. A PATCH PostgREST accepted and silently did not apply
  // answers 200 with the old value, so the representation is compared rather than trusted.
  const back = await rest(base, key, `backlog_items?id=eq.${row.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(plan.patch),
  }, where("patch"));
  const after = Array.isArray(back) ? back[0] : null;
  if (!after) fail(`${where("patch")}: the PATCH returned no row`);
  for (const k of Object.keys(plan.patch)) {
    const got = after[k];
    const want = plan.patch[k];
    if (String(got ?? null) !== String(want ?? null)) {
      fail(`${where("patch")}: ${k} read ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
  }

  log(`  applied: decision ${decision}, 1 before-image, ${ticket} now \`${after.status}\` · design_status ${JSON.stringify(after.design_status)} · kickoff_link ${JSON.stringify(after.kickoff_link)}\n`);

  return { decision, plan, after };
}

// AGT-167 -- `--resettle`: NOTHING RE-SETTLED A ROW WHEN ITS CARD WAS RULED, AND THIS IS THAT WRITE.
//
// THE DEFECT, measured this cycle rather than recalled. One script, one kickoff, one ticket, one
// cycle, 23 minutes apart, opposite answers, and the only input that moved was the card census:
// `runner_decisions 0555f4f6` (12:08:05Z) settled `AGT-167` `delivered` -- "no open card" -- three
// minutes before `runner_items e221020c` was filed against it; the same script re-run by hand at
// 12:31:39Z (`1d6a2bb4`) settled it `partial`. It sat `delivered` under an open card for 23 minutes,
// out of the pick path (`scripts/ticket-owner.js:227` reads `["open","partial"]`). The card was then
// stamped `rework` at 13:00:24Z and `public.apply_gate_rulings()` section 3b, read live, writes
// `scope_rationale` and `design_status` for that ruling and NEVER `status` -- only `retired` moves a
// status. `updated_at` moved; `status` did not. Detection already existed and could not write:
// `ticket-owner.js` check 12 re-derives the same answer with the same exported `decideStatus()` and
// is `judgment` with no `fix`.
//
// ONE DIRECTION, AND IT IS THE LOAD-BEARING CONSTRAINT. This acts only on `RESETTLE_FROM`
// (`delivered`); every other status prints and returns having written nothing. `partial -> delivered`
// is the move that needs a done-predicate nothing here owns, and writing it on a guess would push a
// row OUT of the pick path -- the exact harm the ticket exists to undo.
//
// THE KICKOFF COMES FROM THE ROW, NEVER THE COMMAND LINE. The status is read from the document the
// row itself links, so `--kickoff` is refused beside `--resettle`: a re-settle that let the operator
// hand in a different document would be deciding against a record the board does not hold. A NULL or
// unopenable `kickoff_link` is an HONEST ABSENCE -- it throws (exit 2 at the CLI) and writes nothing,
// rather than settling a status from a document nobody could read.
//
// THE CENSUS HAS NO `decided_at` FILTER, which is the whole difference from `main()`'s read. `main()`
// asks "is a card still open?" and a stamped card correctly drops out of that question. This asks
// BOTH questions of the same rows: `gatedOpen` = `decided_at` is NULL (trigger 3), `gateReworked` =
// `decision` is `rework` (trigger 5). `k_stamp` maps `needs-desktop` onto the `rework` stamp too, so
// the one word covers both rulings.
export async function resettleTicket({
  base, key, ticket, cycleId = null, sessionName = null, apply = false,
  log = s => process.stdout.write(s),
} = {}) {
  if (typeof ticket !== "string" || ticket.trim() === "") {
    fail("resettle: --ticket=<ID> is required — a re-settle acts on exactly one ticket.");
  }
  const rows = await rest(base, key, `backlog_items?backlog_id=eq.${encodeURIComponent(ticket)}&select=*`, {}, "resettle read row");
  if (!Array.isArray(rows) || rows.length !== 1) {
    fail(`resettle read row: ${ticket} matched ${Array.isArray(rows) ? rows.length : 0} rows — one is the only number that can be re-settled.`);
  }
  const row = rows[0];

  if (!canResettle(row)) {
    log(`settle-ship --resettle: ${ticket} reads \`${row.status}\` — no change. ONE DIRECTION: only \`${RESETTLE_FROM}\` is re-settled here.\n`);
    return { ticket, from: row.status, to: row.status, changed: false, decision: null, note: `reads \`${row.status}\`, not \`${RESETTLE_FROM}\`` };
  }

  const link = typeof row.kickoff_link === "string" ? row.kickoff_link.trim() : "";
  if (link === "") {
    fail(`resettle: ${ticket} carries no \`kickoff_link\` — the status is read from the document, so an absent one is an honest absence and nothing is written.`);
  }
  const abs = path.isAbsolute(link) ? link : path.join(ROOT, link);
  let kickoffText;
  try {
    kickoffText = fs.readFileSync(abs, "utf8");
  } catch (e) {
    fail(`resettle: ${ticket}'s kickoff_link ${link} could not be read: ${e.message} — nothing is written.`);
  }

  const cards = await rest(base, key,
    `runner_items?select=id,kind,decision,decided_at,backlog_id&kind=eq.gated_before_build&backlog_id=eq.${encodeURIComponent(ticket)}&limit=10000`,
    {}, "resettle read cards");
  if (!Array.isArray(cards)) {
    fail("resettle read cards: the card census came back non-array — refusing to decide a status on a census that was not read.");
  }
  const gatedOpen = cards.some(c => c.decided_at === null || c.decided_at === undefined);
  const gateReworked = cards.some(c => c.decision === "rework");

  const decided = decideStatus({ kickoffText, ticketId: ticket, gatedOpen, gateReworked });

  log(`settle-ship --resettle: ${ticket} — ${row.status} → ${decided.status}\n`);
  log(`  kickoff (from the row) ${link}\n`);
  log(`  gated_before_build cards on this ticket: ${cards.length}\n`);
  log(`  open gated_before_build card: ${gatedOpen ? "yes" : "no"}\n`);
  log(`  card ruled rework: ${gateReworked ? "yes" : "no"}\n`);
  for (const r of decided.reasons) log(`  · ${r}\n`);

  if (decided.status === row.status) {
    log(`  no change — the record still settles \`${row.status}\`; nothing was written.\n`);
    return { ticket, from: row.status, to: row.status, changed: false, decision: null, note: "the record still settles the same way" };
  }
  if (!apply) {
    log("  (no --apply; nothing was written)\n");
    return { ticket, from: row.status, to: decided.status, changed: false, decision: null, note: "plan only — no --apply" };
  }

  // `kickoffPath` is the row's OWN link, so `planSettle()` writes `kickoff_link` back unchanged.
  const { decision } = await applySettle({
    base, key, cycleId, sessionName, ticket, row,
    kickoffPath: link, status: decided.status, reasons: decided.reasons, log,
  });
  return { ticket, from: row.status, to: decided.status, changed: true, decision, note: "re-settled" };
}

// AGT-454 -- the write half. One GET, one RPC per planned row, and NOTHING on the `partial` side.
//
// IT RUNS AFTER THE STATUS WRITE AND AFTER THE COST WRITE, on purpose and in that order: settling
// the ticket is this script's primary job (`applySettle()`), and a directive close that failed must
// never take the status or the ledger figure with it.
//
// CLOSED STAYS CLOSED (SES-129). `close_directive()` is itself idempotent -- a row already `done`
// WITH an outcome comes back untouched carrying `already_closed = true` -- and the plan above
// filters those rows out before the RPC is ever reached. Both guards are kept: the plan is what
// makes a second settle cost ZERO calls, and `already_closed` is what keeps a row that closed
// between the GET and the POST from having its verdict overwritten. Neither one reopens anything;
// this file has no path that moves a directive OFF `done`.
export async function closeDirectives({
  base, key, cycleId, ticket, row, status, kickoffPath, log = s => process.stdout.write(s),
} = {}) {
  if (status !== DIRECTIVE_CLOSES_AT) {
    log(`  directives: not read — ${ticket} settles \`${status}\`, and only \`${DIRECTIVE_CLOSES_AT}\` closes a directive\n`);
    return [];
  }
  if (typeof cycleId !== "string" || cycleId === "") {
    log("  directives: not read — no --cycle-id, and `close_directive()` images the row against the cycle that closed it\n");
    return [];
  }
  if (!row || typeof row.id !== "string" || row.id === "") {
    log("  directives: not read — the ticket row carries no id to match `ticket_ref` against\n");
    return [];
  }

  const rows = await rest(base, key,
    `runner_directives?select=id,type,status,outcome,ticket_ref&ticket_ref=eq.${encodeURIComponent(row.id)}&limit=100`,
    {}, "read directives");
  if (!Array.isArray(rows)) fail("read directives: the runner_directives read came back non-array — refusing to close a directive on a set that was not read.");

  const plans = planDirectiveClose({ directives: rows, ticket, ticketRowId: row.id, status, kickoffPath });
  if (plans.length === 0) {
    log(`  directives: none open (${rows.length} row(s) link \`ticket_ref\` = ${row.id})\n`);
    return [];
  }

  const closed = [];
  for (const plan of plans) {
    const answer = await rest(base, key, "rpc/close_directive", {
      method: "POST",
      body: JSON.stringify({
        p_cycle: cycleId,
        p_directive: plan.id,
        p_outcome: plan.outcome,
        p_note: plan.note,
      }),
    }, `close_directive ${plan.id}`);
    const back = Array.isArray(answer) ? answer[0] : answer;
    const already = Boolean(back && back.already_closed);
    log(`  directive ${String(plan.id).slice(0, 8)}: ${already ? "already closed, untouched" : "closed shipped"}\n`);
    closed.push({ id: plan.id, already_closed: already, outcome: back ? back.outcome ?? null : null });
  }
  return closed;
}

async function main() {
  const argv = process.argv.slice(2);
  for (const a of argv) {
    const name = a.startsWith("--") ? a.slice(2).split("=")[0] : a;
    if (!a.startsWith("--") || !ALLOWED_FLAGS.has(name)) {
      fail(`unknown flag ${a} — this script takes --ticket=<ID>, --kickoff=<path>, --cycle-id=<uuid>, --remainder=<text>, --resettle, --ship and --apply.`);
    }
  }

  const ticket = arg(argv, "ticket");
  const kickoffArg = arg(argv, "kickoff");
  const cycleId = arg(argv, "cycle-id");
  const remainderArg = arg(argv, "remainder");
  const applyArg = arg(argv, "apply");
  const resettleArg = arg(argv, "resettle");
  const shipArg = arg(argv, "ship");

  if (typeof ticket !== "string" || ticket === "") fail("--ticket=<ID> is required — this script settles exactly one ticket.");

  // AGT-506 -- THE THIRD DOOR, and the one the runbook's step 7 SQL block now points at. It takes
  // no `--kickoff`: the ship decision is keyed by (cycle, ticket) and reads the ticket's SETTLED
  // status off the board, so a kickoff path handed in here would invite a reader to think this door
  // re-decides the status. It does not -- it records a handle for a status the first door already
  // wrote. `--resettle` is refused for the mirror reason: that door moves a row OFF `delivered`,
  // and recording a ship decision for a delivery in the same breath as un-delivering it is two
  // answers to one question. Both refusals raise before any read.
  if (shipArg !== undefined) {
    if (kickoffArg !== undefined) {
      fail("--kickoff is refused beside --ship — the ship decision is keyed by (cycle, ticket) and reads the status the close-out already wrote; it never re-decides it from a document.");
    }
    if (resettleArg !== undefined) {
      fail("--resettle is refused beside --ship — one moves the row OFF `delivered` and the other records the handle for a delivery; they are two answers to one question.");
    }
    if (typeof cycleId !== "string" || cycleId === "") {
      fail("--ship needs --cycle-id=<uuid> — the decision is keyed by (cycle, ticket) and the cycle row carries the push sha it records.");
    }
    const sbase = process.env.SUPABASE_URL;
    const skey = process.env.SUPABASE_SERVICE_KEY;
    if (!sbase) fail("SUPABASE_URL is not set — the ship decision is planned and recorded over REST.");
    if (!skey) fail("SUPABASE_SERVICE_KEY is not set — the ship decision is planned and recorded over REST.");
    const shipRows = await rest(sbase, skey,
      `backlog_items?backlog_id=eq.${encodeURIComponent(ticket)}&select=id,backlog_id,status`, {}, "ship read row");
    if (!Array.isArray(shipRows) || shipRows.length !== 1) {
      fail(`ship read row: ${ticket} matched ${Array.isArray(shipRows) ? shipRows.length : 0} rows — one is the only number whose delivery can be handed a Reverse.`);
    }
    const shipInputs = await readShipInputs({ base: sbase, key: skey, cycleId, ticket });
    const shipPlan = planShip({ status: shipRows[0].status, ticket, ...shipInputs });
    process.stdout.write(`settle-ship: ${ticket} — ship decision on cycle ${cycleId}\n`);
    process.stdout.write(`  would ${shipPlan.action} — ${shipPlan.reason}\n`);
    if (applyArg === undefined) {
      // The three non-writing actions report themselves through `recordShip()` on the dry run too,
      // so the words a reader sees here are the words `--apply` would print rather than a second
      // copy of them (pattern:14). It cannot write: only the `record` branch POSTs.
      if (shipPlan.action !== "record" && shipPlan.action !== "refuse") {
        await recordShip({ base: sbase, key: skey, plan: shipPlan });
      }
      process.stdout.write("  (no --apply; nothing was written)\n");
      process.exit(0);
    }
    // A `refuse` under `--apply` is exit 2 BEFORE the write, never a warning over one.
    if (shipPlan.action === "refuse") fail(`ship: ${shipPlan.reason}`);
    await recordShip({ base: sbase, key: skey, plan: shipPlan });
    process.exit(0);
  }

  // AGT-167 -- THE SECOND DOOR, and it takes no `--kickoff`. A re-settle reads the document the ROW
  // links, so a path handed in on the command line would decide a status against a record the board
  // does not hold; the two flags are refused together rather than one quietly winning.
  if (resettleArg !== undefined) {
    if (kickoffArg !== undefined) {
      fail("--kickoff is refused beside --resettle — a re-settle reads the row's OWN `kickoff_link`, never a path handed in on the command line.");
    }
    if (applyArg !== undefined && (typeof cycleId !== "string" || cycleId === "")) {
      fail("--apply needs --cycle-id=<uuid> — every write is attributed to the cycle that made it.");
    }
    const rbase = process.env.SUPABASE_URL;
    const rkey = process.env.SUPABASE_SERVICE_KEY;
    if (!rbase) fail("SUPABASE_URL is not set — the ticket row is read over REST.");
    if (!rkey) fail("SUPABASE_SERVICE_KEY is not set — the ticket row is read over REST.");
    await resettleTicket({
      base: rbase, key: rkey, ticket,
      cycleId: typeof cycleId === "string" && cycleId !== "" ? cycleId : null,
      sessionName: null,
      apply: applyArg !== undefined,
    });
    process.exit(0);
  }

  if (typeof kickoffArg !== "string" || kickoffArg === "") fail("--kickoff=<path> is required — the kickoff's own words decide the status, and its path is the link this write sets.");
  // The attribution constraint (`ck_decision_attribution`) takes exactly one of cycle_id /
  // session_name and this script is always a cycle. Refusing here beats a 400 after the read.
  if (applyArg !== undefined && (typeof cycleId !== "string" || cycleId === "")) {
    fail("--apply needs --cycle-id=<uuid> — every write is attributed to the cycle that made it.");
  }
  const remainder = typeof remainderArg === "string" ? remainderArg : null;

  const kickoffAbs = path.isAbsolute(kickoffArg) ? kickoffArg : path.join(ROOT, kickoffArg);
  let kickoffText;
  try {
    kickoffText = fs.readFileSync(kickoffAbs, "utf8");
  } catch (e) {
    fail(`could not read the kickoff at ${kickoffArg}: ${e.message} — the status is read from the document, so a missing one is never settled as \`delivered\`.`);
  }

  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base) fail("SUPABASE_URL is not set — the ticket row is read over REST.");
  if (!key) fail("SUPABASE_SERVICE_KEY is not set — the ticket row is read over REST.");

  const rows = await rest(base, key, `backlog_items?backlog_id=eq.${encodeURIComponent(ticket)}&select=*`, {}, "read row");
  if (!Array.isArray(rows) || rows.length !== 1) {
    fail(`read row: ${ticket} matched ${Array.isArray(rows) ? rows.length : 0} rows — one is the only number that can be settled.`);
  }
  const row = rows[0];

  const cards = await rest(base, key,
    "runner_items?select=backlog_id,kind,decided_at&kind=eq.gated_before_build&decided_at=is.null&limit=10000", {}, "read cards");
  if (!Array.isArray(cards)) fail("read cards: the undecided-card read came back non-array — refusing to decide a status on a board that was not read.");
  const gatedOpen = cards.some(c => c.backlog_id === ticket);

  // AGT-128 -- the `--ticket` value read at :404, so trigger 2 knows which ticket the STOP LINE
  // has to be talking about. Without it the reader is id-blind and settles on anyone's `partial`.
  const decided = decideStatus({ kickoffText, ticketId: ticket, gatedOpen, remainder });
  let plan;
  try {
    plan = planSettle(row, kickoffArg, decided.status);
  } catch (e) {
    fail(e.message);
  }

  process.stdout.write(renderPlan({ ticket, kickoffRel: kickoffArg, row, decided, plan, gatedOpen }));

  // AGT-506 -- A `delivered` SETTLE NEEDS THE VERDICT ITS SHIP DECISION ATTACHES TO, and that is
  // the half of the ticket that DOES belong in this statement's path. The verdict is still not an
  // input to the STATUS (`decideStatus()` has no verdict parameter and keeps none): a `delivered`
  // decided off a record that names no unbuilt work stays `delivered`. What is refused is writing
  // it while the evidence the ship decision requires does not exist -- an `approve` carrying no
  // verdict row, in the ticket's own words. The refusal raises BEFORE `applySettle()`, so the
  // decision row, the before-image and the PATCH have not happened when it fires. `partial` is
  // untouched: it records no ship decision and needs no verdict.
  if (decided.status === "delivered") {
    if (typeof cycleId === "string" && cycleId !== "") {
      const { verdict: settleVerdict } = await readShipInputs({ base, key, cycleId, ticket });
      process.stdout.write(settleVerdict
        ? `  verdict ${settleVerdict.id} \`${settleVerdict.verdict}\` ${settleVerdict.version} graded_sha ${settleVerdict.graded_sha}\n`
        : "  verdict (none on this cycle for this ticket)\n");
      if (applyArg !== undefined && !settleVerdict) {
        fail(`a \`delivered\` settle needs the verdict its ship decision attaches to — this cycle holds no \`runner_verdicts\` row for ${ticket}, so nothing is written.`);
      }
    } else {
      process.stdout.write("  verdict (not read — no --cycle-id given)\n");
    }
  }

  // AGT-176 (part c) -- the cycle's OWN cost, resolved from the log rows it wrote, printed on the
  // dry run too so `cost_usd` can be read before anything is written. `visitor_id` is the column
  // lib/request-context.js puts the cycle id in, so it is the cycle's own row set.
  // NOT-subscription, never a positive `executor` filter: an `executor` match reads 0 rows
  // platform-wide and would ship green while summing nothing. See lib/activity-log.js.
  let cost = null;
  if (typeof cycleId === "string" && cycleId !== "") {
    const logRows = await rest(base, key,
      `ai_activity_log?select=call_source,cost_usd&visitor_id=eq.${encodeURIComponent(cycleId)}`, {}, "read cost rows");
    if (!Array.isArray(logRows)) fail("read cost rows: the ai_activity_log read came back non-array — refusing to resolve a cost from a set that was not read.");
    cost = resolveCycleCost(logRows);
    process.stdout.write(`  cost_usd=${cost.usd === null ? "null" : cost.usd} cost_basis=${cost.basis}\n`);
    process.stdout.write(`  · ${logRows.length} ai_activity_log row(s) at visitor_id=${cycleId}; ${cost.billable} billable (lanes billing nothing: ${[...SUBSCRIPTION_LANES].join(", ")}), ${cost.priced} priced\n`);
  } else {
    process.stdout.write("  cost_usd=(not read) cost_basis=(no --cycle-id given)\n");
  }

  if (applyArg === undefined) {
    process.stdout.write("  (no --apply; nothing was written)\n");
    process.exit(0);
  }

  await applySettle({
    base, key, cycleId, sessionName: null, ticket, row,
    kickoffPath: kickoffArg, status: plan.patch.status, reasons: decided.reasons,
  });

  // 4 -- AGT-176 (part c): the ledger figure, its own decision and its own before-images, in the same
  // decision -> image -> read-back-PATCH order as the status write above. It runs AFTER the status
  // write on purpose: settling the ticket is this script's primary job, and a cost write that failed
  // must not take the status with it.
  if (cost) await writeCost({ base, key, cycleId, cost });

  // 5 -- AGT-454: John's directive closes with the ticket that carried it. `delivered` only.
  await closeDirectives({ base, key, cycleId, ticket, row, status: plan.patch.status, kickoffPath: kickoffArg });

  process.exit(0);
}

// SES-176's contract: importing this module for its exports must never run the CLI.
// AGT-167: `fail()` throws now (see its header), so the exit code it used to take itself is taken
// HERE -- exit 2 for a refusal this script recognises, exit 1 with a stack for one it does not.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch(e => {
    if (e instanceof SettleShipError) {
      process.stderr.write(`settle-ship: ${e.message}\n`);
      process.exit(2);
    }
    process.stderr.write(`settle-ship: ${e.stack || e.message}\n`);
    process.exit(1);
  });
}
