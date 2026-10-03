// DeepBench v7.0.540 | tests/regression/ses-424h-johns-three-carried.test.mjs | SES-424 close --
// the three items the ticket's own text carried for John outlive the id that carried them, and
// closing that id re-picks nothing.
//
// WHAT THIS PINS, measured 2026-09-21 rather than recalled. SES-424's description carries a
// sentence beginning "THREE ITEMS STILL NEED JOHN DIRECTLY" and names three: a line on the
// Verifier's Skill row for judged-lane attribution, the routine-prompt step 9 pointer, and
// ratifying the 20-assignment promotion bar. Before this ship their ONLY live home was that one
// description cell -- 0 runner_items titles, 0 runner_questions rows and 0 lines of
// docs/governance/ASKS-TO-JOHN.md carried any of them. Closing the id with no other home drops
// all three (pattern:92), and re-filing the ticket's own acceptance criterion under a new number
// is the other way to lose them (pattern:95). This ship puts each on its own undecided
// `gated_before_build` card, which `reverse_decision()` Guard B refuses to erase, so the cards
// outlive the id.
//
// (1) THE CLAUSES ARE READ FROM THE BOARD, NEVER WRITTEN DOWN HERE. Arm A checks that each card's
// `value_case` OPENS with its clause verbatim. If this file carried its own copy of the three
// clauses, that copy would be a second home for the text -- the very defect the ticket is about --
// and it would go green against a card quoting the copy while the board said something else. So
// the clauses are parsed out of `backlog_items.SES-424.description` at run time, and a test-side
// control asserts the parse actually produced three distinct non-empty clauses before any of them
// is used. Same reasoning as ses-424g note 4.
//
// (2) EVERY CLAUSE CARRIES A ONE-EDIT CONTROL, AND THE CONTROL NEVER TOUCHES THE BOARD. ses-424g
// could mutate its own fixture rows because it had inserted them. This file inserts nothing: the
// rows it grades are John's real cards, the live authority matrix and the real board, and a run
// that edited any of those would be mutating working data (pattern:76). So each control applies
// the SAME predicate to a one-edit-mutated in-memory COPY of what was read and requires the
// predicate to reject it. That is a control that really executes, not a comment claiming one.
//
// (3) THE DISCRIMINATING PHRASE FOR ITEM 2 IS "routine-prompt step 9", NOT "step 9". Measured on
// this board 2026-09-21: bare "step 9" appears in the descriptions of FIVE live tickets (SES-198,
// SES-225, SES-237, SES-427, SES-428) and in one open `runner_questions` row -- every one of them
// a reference to a numbered runbook step, none of them this item. A census keyed on the bare token
// would grade the live world instead of this change (pattern:162) and would be red for reasons
// that have nothing to do with SES-424. The full phrase is unique to the clause.
//
// (4) ARM B ASSERTS A SUBSET, NOT A ZERO, AND THE DIFFERENCE IS DELIBERATE. §4's wording is "0
// backlog_items rows outside {done,delivered,removed,removal proposed} hold any of the three
// phrases". SES-424 itself holds all three -- they are its own text -- and the Builder is
// forbidden to write its status (bd-guardrails), so it still reads `partial` when this file runs
// and a literal zero would be red on the change that satisfies it. The property that actually
// matters is "no OTHER live ticket has re-picked these items", so B(ii) asserts the census is a
// SUBSET of {SES-424}: green now with SES-424 live, green after the close-out writes `delivered`
// and the set empties, and red the moment any other id re-files one of the three.
//
// (5) B(i) CALLS settle-ship.js's OWN EXPORT, never a re-implementation. The cards must not hold
// SES-424 open, and "holds it open" is not a property this file gets to define: it is
// `decideStatus({ gatedOpen })` plus the `cards.some(c => c.backlog_id === ticket)` predicate the
// script computes at line 216. Both are read from the script itself, and the control flips
// `gatedOpen` to true on the same kickoff text and requires `partial`.
//
// NO MODEL CALL, NO SPEND, NO WRITE. Five REST reads, two RPC reads, one file read. Nothing in
// this file mutates anything.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TICKET = "SES-424";
const KICKOFF = "docs/kickoffs/v7.0.540-SES-424-close.md";

// The discriminating phrase for each item, in the ticket's own order. Note 3 is why item 2's is
// the long form. These are search keys, not the clause text -- the clauses themselves are read
// off the board (note 1) and never written down here.
const PHRASES = ["judged-lane", "routine-prompt step 9", "20-assignment"];

// The statuses a ticket can hold and still be off the board. Read as a set the census excludes;
// `removal proposed` is in it because the nine rows SES-424 consolidated sit there awaiting John's
// verdict and are not re-picks.
const OFF_THE_BOARD = new Set(["done", "delivered", "removed", "removal proposed"]);

// The seven text fields a card owes a reader. runner_items lets all seven be NULL, so "written"
// is a property this file has to assert rather than one the schema gives.
const TEXT_FIELDS = ["title", "value_case", "before_after", "qa_evidence", "plain_cant", "plain_after", "plain_worth"];

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const text = await res.text();
  if (text.trim() === "") return [];
  return JSON.parse(text);
}

// Every field a phrase could be hiding in, joined the same way the migration's guards join them.
const cardText = c => TEXT_FIELDS.map(f => c[f] ?? "").join(" ");

// THE PARSE, and it refuses rather than guessing. A description whose sentence has been reworded
// must fail HERE, saying so, instead of silently yielding an empty clause that then "matches" a
// card prefix trivially.
function clausesFrom(description) {
  const marker = "THREE ITEMS STILL NEED JOHN DIRECTLY";
  const at = description.indexOf(marker);
  assert.ok(at >= 0,
    `(A parse) ${TICKET}'s description must still carry "${marker}" -- the three clauses are read ` +
    `from the board at run time and never copied into this file (note 1). If the sentence was ` +
    `reworded, the cards' value_case openings must be re-read against the new wording.`);
  const seg = description.slice(at);
  const cut = (openTag, closeTag) => {
    const a = seg.indexOf(openTag);
    assert.ok(a >= 0, `(A parse) the clause marker "${openTag}" is gone from ${TICKET}'s description`);
    const rest = seg.slice(a + openTag.length);
    const b = rest.indexOf(closeTag);
    assert.ok(b > 0, `(A parse) no "${closeTag}" closes the clause opened by "${openTag}"`);
    return rest.slice(0, b).trim();
  };
  return [cut("(1) ", ", (2) "), cut("(2) ", ", (3) "), cut("(3) ", ". Consolidation")];
}

async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the whole file: the three carried cards, the settle-ship predicate and both satisfied halves",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. This ship is three Supabase rows and " +
        "two live function readings, so there is no source-parsed half to grade without them. " +
        "Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // ============================== ARM A -- THE THREE CARDS ==============================

  const ticketRows = await pg(url, key,
    `backlog_items?backlog_id=eq.${TICKET}&select=backlog_id,status,description`);
  assert.equal(ticketRows.length, 1, `${TICKET} must be exactly one row on the board, got ${ticketRows.length}`);
  const description = ticketRows[0].description ?? "";

  const clauses = clausesFrom(description);
  // The parse's own control: three clauses, all non-empty, all distinct, each carrying its phrase.
  // Without this, a parse that silently returned "" would make A(iv) pass vacuously.
  assert.equal(clauses.length, 3, "(A parse control) the parse must yield exactly three clauses");
  assert.equal(new Set(clauses).size, 3, "(A parse control) the three clauses must be distinct");
  clauses.forEach((clause, i) => {
    assert.ok(clause.length > 20,
      `(A parse control) clause ${i + 1} parsed to ${JSON.stringify(clause)} -- too short to be the ` +
      `ticket's wording, so the markers have moved and A(iv) would pass vacuously`);
    assert.ok(clause.toLowerCase().includes(PHRASES[i]),
      `(A parse control) clause ${i + 1} must carry "${PHRASES[i]}"; parsed ${JSON.stringify(clause)}`);
  });

  const openCards = await pg(url, key,
    "runner_items?select=id,backlog_id,kind,model,decision,decided_at,flag_slug,display_ref,epic_id," +
    "cost_usd,title,value_case,before_after,qa_evidence,plain_cant,plain_after,plain_worth" +
    "&kind=eq.gated_before_build&decided_at=is.null&limit=10000");
  assert.ok(openCards.length < 10000,
    "the undecided-card read came back AT its limit -- it may have left rows behind, and a census " +
    "over an unknown subset is not a census");

  // -- A (i) ONE CARD PER CLAUSE, answerable alone (pattern:82). This is the assertion that fails
  // on an unedited tree: before this ship the count is 0 for every phrase.
  const carriers = PHRASES.map((phrase, i) => {
    const hits = openCards.filter(c => cardText(c).toLowerCase().includes(phrase));
    assert.equal(hits.length, 1,
      `(A i) exactly 1 undecided gated_before_build card must carry "${phrase}" -- item ${i + 1} of ` +
      `the three ${TICKET} carried for John -- got ${hits.length}. 0 means the item has no home ` +
      `once this id closes and it is dropped (pattern:92); more than 1 means the same call is on ` +
      `John's desk twice and neither card is answerable alone (pattern:82).`);
    return hits[0];
  });
  assert.equal(new Set(carriers.map(c => c.id)).size, 3,
    `(A i) the three phrases must sit on three DIFFERENT cards, got ${JSON.stringify(carriers.map(c => c.id))} ` +
    `-- one card carrying two of John's calls cannot be accepted or rejected as a unit`);

  carriers.forEach((card, i) => {
    const which = `card ${i + 1} (${PHRASES[i]}, ${card.id})`;

    // -- A (ii) backlog_id NULL. settle-ship.js matches undecided cards on backlog_id, so a card
    // naming SES-424 would hold the very id this ship closes open. Arm B proves that consequence
    // through the script's own code; this asserts the cause.
    assert.strictEqual(card.backlog_id, null,
      `(A ii) ${which} must carry backlog_id NULL, got ${JSON.stringify(card.backlog_id)} -- a card ` +
      `naming a ticket holds that ticket open through settle-ship.js's gatedOpen predicate, and ` +
      `these three are meant to OUTLIVE ${TICKET}, not keep it alive`);

    // -- A (iii) all seven text fields written. NULL is allowed by the schema; a blank card is a
    // question John cannot answer.
    TEXT_FIELDS.forEach(f => {
      assert.ok(typeof card[f] === "string" && card[f].trim() !== "",
        `(A iii) ${which} must have a written "${f}" -- got ${JSON.stringify(card[f])}. runner_items ` +
        `permits NULL on six of the seven, so a card can be filed unreadable and nothing stops it`);
    });

    // -- A (iv) the value_case OPENS with the ticket's own clause, verbatim, read off the board.
    assert.ok(card.value_case.startsWith(clauses[i]),
      `(A iv) ${which}'s value_case must OPEN with clause ${i + 1} verbatim from ${TICKET}'s own ` +
      `description. Expected it to start with ${JSON.stringify(clauses[i])}; it starts with ` +
      `${JSON.stringify(card.value_case.slice(0, Math.max(40, clauses[i].length)))}. A paraphrase ` +
      `is a second wording of John's own item, which is how the three drifted apart before.`);

    // -- A (v) undecided, on the close's lane, and carrying none of the fields a ship card uses.
    assert.strictEqual(card.decided_at, null, `(A v) ${which} must be undecided -- the Builder writes no verdict`);
    assert.strictEqual(card.decision, null, `(A v) ${which} must carry no decision`);
    assert.equal(card.kind, "gated_before_build", `(A v) ${which} must be kind gated_before_build`);
    assert.ok(typeof card.model === "string" && card.model.includes("claude-opus-5"),
      `(A v) ${which} must name the lane model that wrote it, got ${JSON.stringify(card.model)}`);
    ["flag_slug", "display_ref", "epic_id", "cost_usd"].forEach(f => {
      assert.strictEqual(card[f], null, `(A v) ${which} must carry ${f} NULL, got ${JSON.stringify(card[f])}`);
    });

    // -- A CONTROL, one edit, on a COPY (note 2). Each of the three assertions above must be able
    // to fail: blank the field, name the ticket, or shift the opening by one word.
    const blanked = { ...card, qa_evidence: "" };
    assert.ok(!(typeof blanked.qa_evidence === "string" && blanked.qa_evidence.trim() !== ""),
      `(A control) the written-field check must reject a card whose qa_evidence was blanked`);
    const named = { ...card, backlog_id: TICKET };
    assert.notStrictEqual(named.backlog_id, null,
      `(A control) the backlog_id check must reject a copy that names ${TICKET}`);
    const shifted = { ...card, value_case: `Also, ${card.value_case}` };
    assert.ok(!shifted.value_case.startsWith(clauses[i]),
      `(A control) the verbatim-opening check must reject a value_case with one word in front of ` +
      `the clause -- if it does not, "opens with" is matching something other than the opening`);
    const dropped = openCards.filter(c => c.id !== card.id && cardText(c).toLowerCase().includes(PHRASES[i]));
    assert.equal(dropped.length, 0,
      `(A control) with ${which} removed from the census, no other undecided card may carry ` +
      `"${PHRASES[i]}" -- A(i)'s count of 1 must be THIS card and not a coincidence`);
  });

  // ================= ARM B -- THE ID CLOSES, AND NOTHING RE-PICKS THE ITEMS =================

  // -- B (i) settle-ship.js's OWN predicate and its OWN decision function (note 5). Imported, not
  // re-implemented: if the script changes how it matches a card, this moves with it.
  const { decideStatus } = await import("../../scripts/settle-ship.js");
  const settleCards = await pg(url, key,
    "runner_items?select=backlog_id,kind,decided_at&kind=eq.gated_before_build&decided_at=is.null&limit=10000");
  const gatedOpen = settleCards.some(c => c.backlog_id === TICKET);   // settle-ship.js:216, verbatim
  assert.equal(gatedOpen, false,
    `(B i) settle-ship.js's own predicate must read NO open card on ${TICKET}, so the close-out can ` +
    `write \`delivered\`. It read one, which means a card filed by this ship named the ticket and ` +
    `is holding open the id it was meant to outlive.`);

  const kickoffText = fs.readFileSync(path.join(ROOT, KICKOFF), "utf8");
  const decided = decideStatus({ kickoffText, gatedOpen, remainder: "" });
  assert.equal(decided.status, "delivered",
    `(B i) with this kickoff's text and no open card on the ticket, settle-ship.js must decide ` +
    `\`delivered\`, got \`${decided.status}\` for: ${decided.reasons.join("; ")}`);

  // -- B (i) CONTROL. One edit -- gatedOpen true -- and the same call must refuse to close.
  const held = decideStatus({ kickoffText, gatedOpen: true, remainder: "" });
  assert.equal(held.status, "partial",
    `(B i control) flipping gatedOpen to true on the same kickoff text must make settle-ship.js ` +
    `decide \`partial\`, got \`${held.status}\`. If it does not, B(i)'s green says nothing about ` +
    `whether the cards hold the ticket open.`);
  assert.ok(held.reasons.some(r => r.includes("gated_before_build")),
    `(B i control) the refusal must name the open card as its reason, got: ${held.reasons.join("; ")}`);

  // -- B (ii) NOTHING RE-PICKED THE THREE (note 4). Carried on cards, never re-filed under a new
  // number (pattern:95).
  const live = await pg(url, key,
    "backlog_items?select=backlog_id,status,description&description=not.is.null&limit=10000");
  assert.ok(live.length < 10000, "(B ii) the board read came back AT its limit -- not a census");
  const holders = PHRASES.flatMap(phrase =>
    live
      .filter(b => !OFF_THE_BOARD.has(b.status) && (b.description ?? "").toLowerCase().includes(phrase))
      .map(b => `${b.backlog_id} (${b.status}) <- ${phrase}`));
  const offenders = holders.filter(h => !h.startsWith(`${TICKET} `));
  assert.deepEqual(offenders, [],
    `(B ii) no live ticket other than ${TICKET} itself may carry one of John's three items in its ` +
    `description -- they are carried on cards now. Re-filing a ticket's own acceptance criterion ` +
    `under a new number is how it gets re-discovered every cycle (pattern:95). Offenders: ` +
    `${JSON.stringify(offenders)}`);

  // -- B (ii) CONTROL. The census must be able to COUNT before its emptiness means anything: a
  // synthetic live row carrying clause 1 must be reported. In-memory (note 2) -- nothing is filed.
  const probe = { backlog_id: "ZZZ-999", status: "open", description: `re-filed: ${clauses[0]}` };
  const probed = [...live, probe]
    .filter(b => !OFF_THE_BOARD.has(b.status) && (b.description ?? "").toLowerCase().includes(PHRASES[0]))
    .map(b => b.backlog_id)
    .filter(id => id !== TICKET);
  assert.deepEqual(probed, ["ZZZ-999"],
    `(B ii control) with one synthetic live row re-filing clause 1, the census must return exactly ` +
    `["ZZZ-999"], got ${JSON.stringify(probed)}. A census that cannot see a planted offender ` +
    `cannot be believed when it reports none.`);

  // ==================== ARM C -- BOTH HALVES OF THE TITLE STILL HOLD ====================

  // -- C (i) the authority matrix, half 1 of the ticket's title.
  const matrix = await pg(url, key,
    "governance_rules?id=eq.MANAGER-AUTHORITY-MATRIX&select=id,status,enforcement,statement");
  assert.equal(matrix.length, 1, "(C i) governance_rules MANAGER-AUTHORITY-MATRIX must be exactly one row");
  assert.equal(matrix[0].status, "live",
    `(C i) the authority matrix must read \`live\` -- it is half 1 of what ${TICKET} closes on -- got ` +
    `\`${matrix[0].status}\``);
  assert.equal(matrix[0].enforcement, "reviewer",
    `(C i) the authority matrix's enforcement must read \`reviewer\`, got \`${matrix[0].enforcement}\``);
  // The matrix is the CITED CARRIER of item 3, so its own wording has to still say so -- card 3's
  // qa_evidence quotes this sentence, and a matrix that stopped naming the ticket row would leave
  // that quote asserting something the rule no longer contains.
  assert.ok((matrix[0].statement ?? "").includes(`${TICKET}'s own board row`),
    `(C i) the matrix must still name "${TICKET}'s own board row" as where the 20-assignment bar ` +
    `sits -- that sentence is what card 3 quotes as its evidence`);
  assert.ok(!["draft", "retired", "superseded"].includes(matrix[0].status),
    "(C i control) a matrix at draft/retired/superseded must not read as satisfying half 1");

  // -- C (ii) ONE definition of "the blocker no longer blocks", half 2. Exact and in order: a
  // one-word edit to the function fails this, which is ses-424g's rule applied here too.
  const theSet = await pg(url, key, "rpc/backlog_unblocking_statuses", { method: "POST", body: "{}" });
  assert.deepStrictEqual(theSet, ["done", "removed", "delivered"],
    `(C ii) public.backlog_unblocking_statuses() must return exactly ["done","removed","delivered"] ` +
    `in that order -- it is THE definition both pick homes read. Got ${JSON.stringify(theSet)}.`);
  assert.ok(!theSet.includes("removal proposed"),
    `(C ii) "removal proposed" must NOT end a blocked_by wait -- widening the definition to admit it ` +
    `would weaken John's SES-218 directive, which is his to change`);

  // -- C (iii) and no ticket is left waiting on a blocker the definition can never admit. v7.0.539
  // took this from five to zero; the census carries its own control below.
  const waiting = await pg(url, key, "backlog_items?blocked_by=not.is.null&select=backlog_id,blocked_by&limit=10000");
  const edges = [];
  if (waiting.length) {
    const ids = [...new Set(waiting.map(w => w.blocked_by))];
    const blockers = await pg(url, key, `backlog_items?id=in.(${ids.join(",")})&select=id,backlog_id,status`);
    const byId = new Map(blockers.map(b => [b.id, b]));
    for (const w of waiting) {
      edges.push({
        ticket: w.backlog_id,
        blocker: byId.get(w.blocked_by)?.backlog_id ?? "(unreadable)",
        blockerStatus: byId.get(w.blocked_by)?.status ?? "(unreadable)",
      });
    }
  }
  const stuck = edges.filter(e => e.blockerStatus === "removal proposed");
  assert.deepEqual(stuck, [],
    `(C iii) no ticket may wait on a "removal proposed" blocker -- that wait can never end, because ` +
    `no later event moves such a blocker into the unblocking set and none moves it back to open. ` +
    `v7.0.539 cleared five. Offenders: ${JSON.stringify(stuck)}`);

  // -- C (iii) CONTROL, in memory (note 2): the same filter over a copy carrying one planted edge
  // must report it. Zero from a filter that cannot count is not a zero.
  const planted = [...edges, { ticket: "ZZZ-998", blocker: "ZZZ-997", blockerStatus: "removal proposed" }]
    .filter(e => e.blockerStatus === "removal proposed")
    .map(e => e.ticket);
  assert.deepEqual(planted, ["ZZZ-998"],
    `(C iii control) with one planted edge behind a "removal proposed" blocker the census must ` +
    `return exactly ["ZZZ-998"], got ${JSON.stringify(planted)}`);
}

export default run;
selfRun(import.meta.url, run);
