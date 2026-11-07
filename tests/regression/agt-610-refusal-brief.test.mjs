// DeepBench v7.0.977 | tests/regression/agt-610-refusal-brief.test.mjs | AGT-610 -- the attempt
// ledger reaches the brief, in its place, without moving the facts sha.
//
// FEATURE: AGT-610 T4. John's clause 6, verbatim: a ticket that parks after two refusals "appears
// in John's daily brief as information, not as a card he must act on". The whole directive exists to
// take him OUT of the loop, so a group that handed him a button would be the loop he asked to leave.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (1) THE ROWS, WITH THE PARKED ONES COUNTED SEPARATELY. Three tickets in, three table rows out, and
//     the lead counting how many have spent both attempts. `attempts` and `state` are the only two
//     cells a reader acts on: a ticket at 1 attempt is still in the team's hands, one `parked` is
//     history. A render that printed all three the same way would say nothing about either.
//
// (2) THE FEEDBACK CELL NEVER CLAIMS A FILING IT DID NOT SEE (the design's call 5, pattern:33).
//     `/feedback` from an unattended cycle is unproven, so `not sent (--no-send)` and
//     `spawn error: ...` print the text PASTE-READY and only a real result reads `sent`. Asserted in
//     all three directions, because the dangerous one is the cell that says `sent` on a spawn error.
//
// (3) ABSENT IS NOT ZERO, asserted as two sentences that must not overlap -- the same rule every
//     group in `render-standing-brief.js` keeps, and the same assertion shape
//     `agt-607-stalled-cycles-brief.test.mjs` uses for the stalls.
//
// (4) IT IS IN THE BRIEF, AND IN ITS PLACE: after `**Wasted cycles**`, before `**Human gates**`
//     (which stays last deliberately, SES-386). Asserting the helper alone would pass against a
//     helper nothing calls -- which is exactly the state `runner_cycles.stall_notified_at` was in
//     before AGT-607, and the failure this clause exists to prevent repeating.
//
// (5) OUTSIDE factsSha(), asserted BOTH directions. `AGT-281`'s rule for a group that moves on its
//     own: an attempt opening is not drift in what John has to look at twice. And so that clause
//     cannot pass by hashing nothing at all, the sha must still MOVE when a fact that IS in the
//     payload moves.
//
// (6) THE READ AND THE PUSH ORDER, out of the source. A group placed correctly in the renderer but
//     read from nothing renders "was not read" forever; a read with no `L.push` between the two
//     neighbours is a group in the wrong place. Both are source facts, so both are grepped.
//
// NO CREDENTIALS, no network, no Supabase, no model call, no writes: pure helpers driven from
// fixtures, plus one read-only source grep.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  renderBlock, renderRefusalLedger, factsSha, asOf, cst,
} from "../../scripts/render-standing-brief.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_REL = "scripts/render-standing-brief.js";
const READ = "rpc/refusal_ledger_brief";

const T1 = "2026-11-07T18:20:00.000Z";
const STAMP = asOf(T1);

// Three tickets, deliberately uneven: one diagnosed and parked (with a feedback result that is NOT
// a filing), one mid-redesign, one never attempted and carrying no refusal at all.
const LEDGER = [
  {
    backlog_id: "AGT-590", attempts: 2, state: "parked (diagnosed)",
    last_label: "[Production Deploy]", last_refused_at: "2026-11-06T07:21:28Z",
    unknowns: "u", feedback_text: "f", feedback_result: "not sent (--no-send)",
  },
  {
    backlog_id: "AGT-017", attempts: 1, state: "redesign open",
    last_label: "[Credential Exploration]", last_refused_at: "2026-09-29T14:07:22Z",
  },
  {
    backlog_id: "DAT-23", attempts: 0, state: "awaiting redesign",
    last_label: null, last_refused_at: null,
  },
];

// agt-607's FACTS() shape, plus the key this ticket adds.
const ITEMS = [{ id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 }];
const FACTS = (over = {}) => ({
  items: ITEMS, settings: null, drain: null,
  decisions: { open: [], finalWeek: 0, reversedWeek: 0 },
  census: [{ judgment_class: "P1 - Improves John's Skills", ord: 1, ratified: 0, proposed: 0, rejected: 0, total: 0, newest_root_claim_ref: null, newest_root_claim: null }],
  johnModel: [{ ord: 0, scope: "overall", pattern_no: null, imperative: null, citing_decisions: 0, finalised_unreversed: 0, reversed: 0, open: 0, agreement_rate: null }],
  inventionUse: [{ window: "all", ord: 3, judge_runs: 1, judge_runs_real_visitors: 0, distinct_real_visitors: 0, first_real_visitor_at: null, last_real_visitor_at: null }],
  staff: [], stalls: [], waste: [],
  ledger: LEDGER,
  ...over,
});

const ledgerRows = out => [...out.matchAll(/^\| (?:AGT|DAT|SES)-[0-9]+ \|/gm)];

// == (1) the rows, the parked count, the cells a reader acts on ===================================
function theGroupRendersEveryTicketAndCountsTheParkedOnes() {
  const out = renderRefusalLedger(LEDGER, STAMP);

  assert.strictEqual(ledgerRows(out).length, 3,
    `three ledger tickets must render three table rows, got ${ledgerRows(out).length}:\n${out}`);
  assert.ok(out.split("\n")[0].endsWith("**3 ticket(s) in the ledger, 1 parked after two attempts.**"),
    `the lead must count the rows and the PARKED ones separately -- "two attempts spent" is the ` +
    `state that means the team is done with it. got:\n${out.split("\n")[0]}`);

  // The two cells a reader acts on, per row.
  for (const r of LEDGER) {
    const row = out.split("\n").find(l => l.startsWith(`| ${r.backlog_id} |`));
    assert.ok(row, `${r.backlog_id} must have a row:\n${out}`);
    assert.ok(row.includes(`| ${r.attempts} |`), `${r.backlog_id}'s row must print its attempt count: ${row}`);
    assert.ok(row.includes(`| ${r.state} |`),
      `and its state EXACTLY as refusal_ledger_brief() derived it -- nothing here re-decides a ` +
      `state (pattern:12). got: ${row}`);
  }

  // The null label is a dash, never the string "null", and a present one prints its time in CST.
  const parked = out.split("\n").find(l => l.startsWith("| AGT-590 |"));
  assert.ok(parked.includes("[Production Deploy]") && parked.includes(cst(LEDGER[0].last_refused_at)),
    `a refused ticket's row must name the label and when it was refused, in CST. got: ${parked}`);
  const never = out.split("\n").find(l => l.startsWith("| DAT-23 |"));
  assert.ok(never.includes("—") && !/null|undefined|NaN/.test(never),
    `a ticket with no refusal yet prints a dash, never "null" -- it is parked by design_status and ` +
    `has met no classifier. got: ${never}`);

  assert.ok(!out.includes("%"), `no '%' anywhere -- counts only, never a rate:\n${out}`);
  assert.ok(/information, never a card/.test(out),
    `the lead must say what the group IS: John's clause 6 makes it information, not a card he must ` +
    `act on, and a reader who cannot tell will treat it as a queue:\n${out}`);
}

// == (2) the feedback cell, all three directions ==================================================
function theFeedbackCellNeverClaimsAFilingItDidNotSee() {
  const one = (over) => renderRefusalLedger([{ ...LEDGER[0], ...over }], STAMP);

  const notSent = one({ feedback_result: "not sent (--no-send)" });
  assert.ok(notSent.includes("paste-ready: /feedback") && !/\| sent \|/.test(notSent),
    `a '--no-send' result is NOT a filing: the cell must print the text paste-ready, never 'sent'. got:\n${notSent}`);

  const spawnErr = one({ feedback_result: "spawn error: claude ENOENT" });
  assert.ok(spawnErr.includes("paste-ready: /feedback") && !/\| sent \|/.test(spawnErr),
    `and a spawn error is the DANGEROUS direction -- the CLI was never reached, so a 'sent' here ` +
    `would be the brief asserting a filing nobody made. got:\n${spawnErr}`);

  const filed = one({ feedback_result: "Thanks, your feedback has been recorded." });
  assert.ok(/\| sent \|/.test(filed) && !filed.includes("paste-ready"),
    `CONTROL: a real result MUST read 'sent' -- otherwise the two clauses above would pass against ` +
    `a cell that can only ever say paste-ready. got:\n${filed}`);

  const noText = one({ feedback_text: null, feedback_result: null });
  assert.ok(!noText.includes("paste-ready") && !/\| sent \|/.test(noText),
    `a ticket with no diagnostic at all has no feedback cell to fill -- neither 'sent' nor a ` +
    `paste-ready prompt for text that does not exist. got:\n${noText}`);
}

// == (3) absent is not zero ======================================================================
function absentIsNotZero() {
  const notRead = renderRefusalLedger(undefined, STAMP);
  const zero = renderRefusalLedger([], STAMP);

  assert.notStrictEqual(notRead, zero,
    "the control is vacuous unless the unread and measured-zero renders really differ");
  assert.ok(/was not read/i.test(notRead), `an unread ledger must SAY it was not read, got:\n${notRead}`);
  assert.ok(!/measured zero/i.test(notRead),
    `an unread ledger must NOT print the measured-zero sentence -- "the read did not happen" and ` +
    `"no ticket was refused" are opposite facts and the brief must not blur them. got:\n${notRead}`);
  assert.strictEqual(ledgerRows(notRead).length, 0, `an unread ledger renders no table rows:\n${notRead}`);

  assert.ok(/measured zero/i.test(zero) && /No refused ticket/i.test(zero),
    `an empty ledger must say so in the words of a measurement, got:\n${zero}`);
  assert.ok(!/was not read/i.test(zero),
    `a measured zero must not also claim the ledger went unread, got:\n${zero}`);

  for (const bad of [null, {}, "", 0]) {
    const out = renderRefusalLedger(bad, STAMP);
    assert.ok(/was not read/i.test(out) && !/measured zero/i.test(out),
      `renderRefusalLedger(${JSON.stringify(bad)}) must take the unread branch, got:\n${out}`);
  }
}

// == (4) it is in the brief, between the two groups it was placed between =========================
function theGroupSitsBetweenWastedCyclesAndHumanGates() {
  const block = renderBlock(FACTS(), T1);
  const at = s => block.indexOf(s);

  assert.ok(at("**Wasted cycles**") > -1, "renderBlock() must carry the Wasted cycles lead");
  assert.ok(at("**Redesign after refusal**") > -1,
    "renderBlock() must carry the Redesign-after-refusal lead. A helper nothing calls is exactly " +
    "the state runner_cycles.stall_notified_at was in before AGT-607 -- written every sweep, " +
    "rendered nowhere.");
  assert.ok(at("**Human gates**") > -1, "renderBlock() must carry the Human gates lead");

  assert.ok(at("**Wasted cycles**") < at("**Redesign after refusal**"),
    "Redesign after refusal must come AFTER Wasted cycles (kickoff T4): `gated` is one of the " +
    "causes that table counts, and this group is what became of those cycles' tickets");
  assert.ok(at("**Redesign after refusal**") < at("**Human gates**"),
    "and BEFORE Human gates -- Human gates is the LAST group deliberately (SES-386)");
  assert.ok(at("**Human gates**") < at("*Provenance:"), "and all of it before the provenance line");
  assert.strictEqual(ledgerRows(block).length, 3, "the three rows reach the assembled block, not just the helper");

  const unread = renderBlock(FACTS({ ledger: undefined }), T1);
  assert.ok(/\*\*Redesign after refusal\*\*/.test(unread) && /was not read/i.test(unread),
    "renderBlock() must still carry the group and say the ledger was not read when it is absent");
  assert.ok(unread.includes(STAMP), "every generated group carries the as-of stamp");
}

// == (5) outside factsSha(), both directions =====================================================
function theLedgerIsOutsideTheFactsSha() {
  const withLedger = FACTS();
  const without = FACTS();
  delete without.ledger;

  assert.strictEqual(factsSha(withLedger), factsSha(without),
    "the ledger must be OUTSIDE factsSha() (AGT-281, the call AGT-607 and AGT-367 made before it): " +
    "an attempt opening is not drift in what John has to look at twice");
  assert.strictEqual(factsSha(FACTS({ ledger: [] })), factsSha(without),
    "and an empty ledger hashes the same as an absent one, for the same reason");

  // CONTROL: the sha is not simply blind.
  assert.notStrictEqual(
    factsSha(FACTS({ staff: [{ agent_id: "builder", fingerprint: "f1", cycle_id: "c1" }] })),
    factsSha(withLedger),
    "CONTROL: a staff finding IS in the payload and must move the sha -- otherwise clause (5) would " +
    "pass against a factsSha() that hashes nothing at all");
}

// == (6) the read, and the push order, out of the source =========================================
function theReadExistsAndThePushSitsBetweenItsNeighbours() {
  const src = fs.readFileSync(path.join(ROOT, SOURCE_REL), "utf8");

  assert.ok(src.includes(READ),
    `${SOURCE_REL} must read the ledger from \`${READ}\` -- every state is DERIVED there ` +
    "(service_role only; the anon key can neither call it nor SELECT the table). A group placed in " +
    "the renderer but read from nothing renders \"was not read\" forever.");
  assert.ok(src.includes("runner_refusal_attempts?select=*") === false,
    "columns are NAMED, never select=* (.claude/rules/supabase-column-grants.md)");
  assert.ok(/refusing to render the redesign-after-refusal group from nothing/.test(src),
    "and a non-array read must DIE rather than publish an unmeasured zero");

  const iWaste = src.indexOf("L.push(renderWastedCycles(waste, stamp));");
  const iLedger = src.indexOf("L.push(renderRefusalLedger(ledger, stamp));");
  const iGates = src.indexOf("L.push(renderHumanGates(humanGates, stamp));");
  assert.ok(iWaste > -1 && iLedger > -1 && iGates > -1, "all three pushes must exist in the source");
  assert.ok(iWaste < iLedger && iLedger < iGates,
    `the new group's L.push must sit BETWEEN the Wasted-cycles push and the Human-gates push in ` +
    `source order (${iWaste} < ${iLedger} < ${iGates}) -- the rendered order asserted in (4) is ` +
    `produced by this index order, and nothing else fixes it`);

  // CONTROL: the greps can see their needles go away.
  assert.ok(!src.split(READ).join("REMOVED").includes(READ),
    "CONTROL: the read clause fired on the file's real bytes");
}

export default async function run() {
  theGroupRendersEveryTicketAndCountsTheParkedOnes();   // (1)
  theFeedbackCellNeverClaimsAFilingItDidNotSee();       // (2)
  absentIsNotZero();                                    // (3)
  theGroupSitsBetweenWastedCyclesAndHumanGates();       // (4)
  theLedgerIsOutsideTheFactsSha();                      // (5)
  theReadExistsAndThePushSitsBetweenItsNeighbours();    // (6)

  console.log("  [AGT-610] three ledger tickets render three rows with their attempts and derived state, " +
    "the lead counts `1 parked after two attempts`, the feedback cell says `sent` ONLY for a real " +
    "result and prints the text paste-ready for `not sent` and `spawn error`, an unread ledger says so " +
    "without saying \"measured zero\", renderBlock() places the group after Wasted cycles and before " +
    `Human gates, factsSha() is equal with and without it while a staff finding still moves it, and ` +
    `the source reads \`${READ}\` with its L.push between the two neighbours -- each clause with a ` +
    "control that flips it.");
}

selfRun(import.meta.url, run);
