// DeepBench v7.0.644 | tests/regression/agt-173-card-citations.test.mjs | AGT-173 — A CYCLE CARD AND A
// CYCLE'S NOTES CANNOT NEWLY CITE A REMOVED TICKET, AND CORRECTING ONE THAT DOES IS STILL ALLOWED.
//
// WHAT WENT WRONG, measured live 2026-09-27 over the whole recent population rather than reasoned about:
// the rule below, run as a plain SELECT over every runner_items row created in the last 48 hours (54)
// and every runner_cycles.notes in the same window (82), returns EIGHT rows citing a backlog item whose
// status reads 'removed' — among them card 14fe8230's "agt-70-auditor keeps its pre-existing red
// (AGT-119)", where AGT-119 has been removed since 2026-09-24 as a duplicate of the delivered AGT-108.
// Nothing in scripts/, api/ or lib/ composes a card (`grep -rn runner_items scripts/ api/ lib/` finds
// no writer; decide-gated-card.js:337 only PRINTS one), so the guard is two BEFORE INSERT OR UPDATE
// triggers on the tables, and this file is what keeps them honest.
//
// THE GRANDFATHER CLAUSE IS THE PART THAT CAN QUIETLY BREAK, and breaking it is worse than the defect:
// correcting a wrongly-cited row means quoting the wrong id while you correct it, so if an id already
// present in the row refused, the remedy this ticket exists for would be unreachable and every cycle on
// the board would be unable to fix its own cards. Arm B therefore drives it in BOTH directions — an id
// carried forward from p_old is silent, a DIFFERENT removed id introduced into that same text is not —
// because without the second half the clause is indistinguishable from "UPDATE is never checked."
//
// 'removed' IS NOT 'removal proposed', and arm B pins that by name. Two of the ids on card 0b6b9048
// read `removal proposed` live; a guard written as `status like '%remov%'` would refuse that card and
// every other one mentioning a proposal, which is the false-refusal class that bricks step 9 rather
// than failing a test. The literal comparison is asserted in the shipped SQL too (arm 0c).
//
// FIVE ARMS. Arm 0 grades the committed SQL and needs no credentials — the suite must stay runnable
// without them. Arms A–D are the kickoff's four, live over PostgREST:
//   A  the refusal, discriminating: the real wrong sentence returns AGT-119 BY NAME, the same sentence
//      with AGT-108 in its place returns nothing. Its premise (AGT-119 removed, AGT-108 not) is
//      asserted first from backlog_items, so a board change reads as a premise failure, never a pass.
//   B  no false refusal: two whole real cards, the 'removal proposed' distinction, and the grandfather
//      clause both ways.
//   C  notes are covered by the same rule, on notes-shaped text.
//   D  the renderer is complete: cycle_reversal_handles('7ff68b47…','AGT-140') returns EXACTLY the two
//      decision handles 59e5e346 and ea1c27fc — finding 6136139c was a card naming one of the two —
//      plus the migration-down captured for that cycle. Two, asserted as two, never "at least one".
//
// WHAT THIS DOES NOT DO: it never inserts, updates or deletes a row. Every arm calls read-only
// functions (pattern:76 — a test run never mutates working data). The trigger wiring itself is graded
// from the committed SQL rather than from pg_catalog, which PostgREST does not expose.
//
// Invocation: node tests/regression/agt-173-card-citations.test.mjs
// (STANDARDS.md Section 2 rule 5 for the credentialed form.)

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SQL_REL = "docs/design/agt-173-card-citation-guard.sql";

// The eight runner_items columns the card trigger watches, in the order the migration names them.
export const CARD_COLUMNS = [
  "title", "value_case", "before_after", "qa_evidence",
  "plain_cant", "plain_after", "plain_worth", "decision_reason",
];

// The sentence this ticket was filed over, verbatim from runner_items 14fe8230's qa_evidence as it
// read before task 2 corrected it. AGT-119 is the removed duplicate; AGT-108 is the real tracker.
export const WRONG_SENTENCE =
  "The new agt-137-run-review.test.mjs is green on all four arms with credentials present; " +
  "agt-70-auditor keeps its pre-existing red (AGT-119).";
export const FIXED_SENTENCE = WRONG_SENTENCE.replace("AGT-119", "AGT-108");

// Verbatim clauses from the two cards the kickoff names, kept as FROZEN fixtures rather than read
// live: a test that re-reads the rows it grades would go red when somebody edits a card, which is a
// fact about the world and not about this change (pattern:162).
export const CARD_7C55BF10 =
  "Selfbuild lane pos 1 was AGT-141 (agent-training, priority 3, queue 25, 1 cycle) ahead of pos 2 " +
  "AGT-132 (dev-manager-capabilities, priority 2, queue 30, 2 cycles); runner_should_boot() would " +
  "have picked AGT-141. AFTER: pos 1 became AGT-132 (priority 2), pos 2 AGT-141, pos 3 AGT-138 — " +
  "and within agent-training AGT-141 (queue 25) still precedes AGT-138 (queue 33). AGT-132's " +
  "blocked_by resolves to AGT-131, whose delivered status is an unblocking status, so the blocker " +
  "excludes nothing. The last attended session had to pin AGT-129/131/137 by hand. Delivered at " +
  "v7.0.604 for AGT-140.";
export const CARD_0B6B9048 =
  "AGT-200 is marked removal proposed and waits on your verdict. The ticket was filed on the belief " +
  "that agt131_findings_intake's check constraint silently no-opped, and a second ticket (AGT-178) " +
  "built on a guard that was not there. AGT-132 is unaffected.";

// Arm D's expectations. Both decisions belong to cycle 7ff68b47 / AGT-140 and are closed history.
export const AGT140_CYCLE = "7ff68b47-0639-4f1c-9cd7-c366feb69e60";
export const AGT140_HANDLES = [
  "59e5e346-172d-4117-b404-0185044d48b4", // agent-row: the re-pin the first card omitted
  "ea1c27fc-f5c5-4ecf-9098-38ddaa985612", // ticket-status: the settle decision it did name
];
export const AGT140_DOWN = "agt140_project_priority_pick";

// ---------------------------------------------------------------------------------------------
// ARM 0 — THE SHIPPED SQL. No credentials, no network. Each assertion names a line whose loss
// would turn the guard into either a wall or a no-op, so this arm fails if the change is undone.
// ---------------------------------------------------------------------------------------------

function theShippedSqlCarriesTheRule() {
  const sql = fs.readFileSync(path.join(REPO, SQL_REL), "utf8");

  // (a) three functions, each by its exact identity argument list — a retyped signature is an
  //     overload, not a replacement (.claude/rules/supabase-function-signature.md).
  for (const header of [
    "CREATE OR REPLACE FUNCTION public.card_removed_citations(p_new text, p_old text)",
    "CREATE OR REPLACE FUNCTION public.runner_record_citation_guard()",
    "CREATE OR REPLACE FUNCTION public.cycle_reversal_handles(p_cycle_id uuid, p_backlog_id text)",
  ]) {
    assert.ok(sql.includes(header), `${SQL_REL} no longer creates: ${header}`);
  }

  // (b) THE GRANDFATHER CLAUSE, as the one subtraction that lets a wrong citation be corrected.
  assert.ok(
    sql.includes("and not exists (select 1 from old_ids o where o.cited = n.cited)"),
    "the p_old subtraction is gone — every correction of a wrongly-cited row would now be refused",
  );
  assert.ok(
    /old_ids as \(\s*select distinct m\[1\] as cited\s*from regexp_matches\(coalesce\(p_old, ''\)/.test(sql),
    "p_old is no longer scanned for ids, so the grandfather clause has nothing to subtract",
  );

  // (c) THE LITERAL STATUS. 'removal proposed' is a different status and must never refuse.
  assert.ok(sql.includes("where b.status = 'removed'"), "the status test is no longer the literal 'removed'");
  assert.ok(!/status\s+(?:i?like|~)/i.test(sql), "the status test became a pattern match — 'removal proposed' would refuse");

  // (d) BOTH TRIGGERS, BEFORE, on INSERT and UPDATE, each over its own column set.
  const itemsTrigger = sql.slice(sql.indexOf("CREATE TRIGGER trg_runner_items_citations"));
  assert.ok(/^CREATE TRIGGER trg_runner_items_citations\s+BEFORE INSERT OR UPDATE OF /.test(itemsTrigger),
    "trg_runner_items_citations is no longer BEFORE INSERT OR UPDATE OF");
  const itemsScope = itemsTrigger.slice(0, itemsTrigger.indexOf("ON public.runner_items"));
  for (const col of CARD_COLUMNS) {
    assert.ok(new RegExp(`\\b${col}\\b`).test(itemsScope), `trg_runner_items_citations stopped watching ${col}`);
  }
  assert.ok(/CREATE TRIGGER trg_runner_cycles_notes_citations\s+BEFORE INSERT OR UPDATE OF notes\s+ON public\.runner_cycles/.test(sql),
    "trg_runner_cycles_notes_citations is no longer BEFORE INSERT OR UPDATE OF notes on runner_cycles");
  assert.strictEqual(
    (sql.match(/EXECUTE FUNCTION public\.runner_record_citation_guard\(\)/g) || []).length, 2,
    "both triggers must run the guard function — exactly two wirings expected",
  );

  // (e) GRANTS BY NAME, per .claude/rules/supabase-column-grants.md's 2026-09-02 addendum:
  //     REVOKE ... FROM PUBLIC alone leaves the named role grants standing.
  for (const ident of [
    "public.card_removed_citations(text, text)",
    "public.runner_record_citation_guard()",
    "public.cycle_reversal_handles(uuid, text)",
  ]) {
    assert.ok(sql.includes(`REVOKE ALL ON FUNCTION ${ident} FROM PUBLIC, anon, authenticated;`),
      `${ident} is not revoked from PUBLIC, anon AND authenticated by name`);
    assert.ok(sql.includes(`GRANT EXECUTE ON FUNCTION ${ident} TO service_role;`),
      `${ident} does not grant EXECUTE to service_role — the step 9 writer would fail`);
  }
}

// ---------------------------------------------------------------------------------------------
// THE LIVE HALF — PostgREST, read-only. It calls the deployed functions and writes nothing.
// ---------------------------------------------------------------------------------------------

const base = url => url.replace(/\/+$/, "");

async function rpc(url, key, name, body) {
  const res = await fetch(`${base(url)}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`rpc/${name} returned HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function statusesOf(url, key, ids) {
  const q = `backlog_items?select=backlog_id,status&backlog_id=in.(${ids.join(",")})`;
  const res = await fetch(`${base(url)}/rest/v1/${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${q} returned HTTP ${res.status}`);
  return Object.fromEntries((await res.json()).map(r => [r.backlog_id, r.status]));
}

const citedIds = text => [...new Set((text.match(/[A-Z]{2,5}-[0-9]{1,4}[a-z]?/g) || []))];

async function theLiveArms() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "arms A-D: card_removed_citations() refusing the real wrong sentence by name and passing its " +
        "correction, two whole real cards and the 'removal proposed' distinction passing, the " +
        "grandfather clause in both directions, notes-shaped text under the same rule, and " +
        "cycle_reversal_handles() returning exactly the two AGT-140 handles plus its captured down",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. Arm 0 still graded the shipped SQL — " +
        "both triggers, the grandfather clause, the literal status test and both grant directions — " +
        "against the committed tree. Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const removed = rows => rows.map(r => r.backlog_id).sort();

  // ---- A. THE REFUSAL, and its premise asserted before its conclusion -----------------------
  const board = await statusesOf(url, key, ["AGT-119", "AGT-108"]);
  assert.strictEqual(board["AGT-119"], "removed",
    `premise gone: AGT-119 reads '${board["AGT-119"]}', not 'removed' — arm A grades nothing until it does`);
  assert.notStrictEqual(board["AGT-108"], "removed",
    "premise gone: AGT-108 is itself removed now, so the corrected sentence is no longer a correction");

  assert.deepStrictEqual(removed(await rpc(url, key, "card_removed_citations", { p_new: WRONG_SENTENCE, p_old: "" })),
    ["AGT-119"], "the real wrong sentence must return AGT-119, and only AGT-119");
  assert.deepStrictEqual(removed(await rpc(url, key, "card_removed_citations", { p_new: FIXED_SENTENCE, p_old: "" })),
    [], "the same sentence citing the live AGT-108 must return nothing");

  // ---- B. NO FALSE REFUSAL ------------------------------------------------------------------
  // Two whole real cards. The expectation is DERIVED from the board rather than hardcoded to
  // empty, so a ticket removed years from now reads as the honest refusal it is instead of a
  // mystery red: the function must agree with backlog_items, which is the whole contract.
  for (const [name, fixture] of [["7c55bf10", CARD_7C55BF10], ["0b6b9048", CARD_0B6B9048]]) {
    const ids = citedIds(fixture);
    const live = await statusesOf(url, key, ids);
    const expected = ids.filter(id => live[id] === "removed").sort();
    assert.deepStrictEqual(removed(await rpc(url, key, "card_removed_citations", { p_new: fixture, p_old: "" })),
      expected, `card ${name} disagrees with backlog_items about which of ${ids.join(", ")} is removed`);
    assert.deepStrictEqual(expected, [], `card ${name} now cites a removed ticket (${expected.join(", ")}) — ` +
      "that is a real finding about the board, not a bug in this guard");
  }
  // 'removed' is not 'removal proposed'. Pinned by name because a pattern match on the status
  // would refuse every card that mentions a proposal.
  const proposed = await statusesOf(url, key, ["AGT-178", "AGT-200"]);
  for (const id of ["AGT-178", "AGT-200"]) {
    if (proposed[id] !== "removal proposed") continue; // the board moved on; the arm above still holds
    assert.deepStrictEqual(removed(await rpc(url, key, "card_removed_citations", { p_new: `see ${id}`, p_old: "" })),
      [], `${id} reads 'removal proposed' and must NOT refuse — only 'removed' refuses`);
  }

  // THE GRANDFATHER CLAUSE, BOTH DIRECTIONS. Same p_new each time; only p_old moves.
  const corrected = `${WRONG_SENTENCE} CORRECTION: AGT-119 is removed; AGT-108 is the real tracker.`;
  assert.deepStrictEqual(removed(await rpc(url, key, "card_removed_citations", { p_new: corrected, p_old: WRONG_SENTENCE })),
    [], "an id already in the row being updated must be grandfathered — this is how a wrong citation gets corrected");
  assert.deepStrictEqual(removed(await rpc(url, key, "card_removed_citations", { p_new: corrected, p_old: "" })),
    ["AGT-119"], "the same text as a fresh INSERT must still refuse — nothing is grandfathered there");
  assert.deepStrictEqual(
    removed(await rpc(url, key, "card_removed_citations",
      { p_new: `${WRONG_SENTENCE} Also SES-369 covers this.`, p_old: WRONG_SENTENCE })),
    ["SES-369"],
    "an UPDATE that introduces a DIFFERENT removed id must refuse, naming that id and not the grandfathered one",
  );

  // ---- C. NOTES ARE COVERED BY THE SAME RULE ------------------------------------------------
  const notes = "(7b) sweep_decision_windows: closed 0, promoted 0, finalized 1.";
  assert.deepStrictEqual(removed(await rpc(url, key, "card_removed_citations", { p_new: `${notes} AGT-119 tracks it`, p_old: notes })),
    ["AGT-119"], "a notes append introducing AGT-119 must refuse");
  assert.deepStrictEqual(removed(await rpc(url, key, "card_removed_citations", { p_new: `${notes} AGT-108 tracks it`, p_old: notes })),
    [], "a notes append citing the live AGT-108 must be accepted");

  // ---- D. THE RENDERER IS COMPLETE ----------------------------------------------------------
  const handles = await rpc(url, key, "cycle_reversal_handles",
    { p_cycle_id: AGT140_CYCLE, p_backlog_id: "AGT-140" });
  const decisions = handles.filter(h => h.handle_kind === "decision").map(h => h.id).sort();
  assert.deepStrictEqual(decisions, [...AGT140_HANDLES].sort(),
    "AGT-140 has exactly two same-ticket decision handles; a card naming one of them was finding 6136139c");
  assert.strictEqual(decisions.length, 2, "two handles, asserted as two — 'at least one' is the defect this renders away");
  const downs = handles.filter(h => h.handle_kind === "migration-down").map(h => h.summary);
  assert.ok(downs.includes(AGT140_DOWN), `the captured down ${AGT140_DOWN} is missing from the handle set: ${downs.join(", ")}`);
  for (const h of handles) {
    assert.ok(typeof h.handle_sentence === "string" && h.handle_sentence.length > 20,
      `handle ${h.id} came back without a sentence a card could carry`);
  }
}

export default async function run() {
  theShippedSqlCarriesTheRule();
  await theLiveArms();
}

selfRun(import.meta.url, run);
