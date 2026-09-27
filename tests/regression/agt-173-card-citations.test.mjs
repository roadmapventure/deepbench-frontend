// DeepBench v7.0.652 | tests/regression/agt-173-card-citations.test.mjs | AGT-173 — A CYCLE CARD AND A
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
// NINE ARMS as of v7.0.652 R3+R4. Arm 0 grades the committed SQL and needs no credentials — the suite must stay runnable
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
//   E  v7.0.648 R1 — THE SECOND BLOCK IN THE SAME FUNCTION: the record may not quote a commit sha no
//      push_sha and no graded_sha can resolve. Measured premise, not a reasoned one: 19 of the 42
//      commit shas in runner_cycles.notes over five days are ancestors of no remote branch, because
//      the pre-push rebase rewrites every artifact commit, while 40 of 40 push_sha values in that
//      window ARE ancestors of origin/dev. The allowlist is asserted in BOTH prefix directions (a
//      7-char abbreviation of a real push sha and its full 40 both pass) and the remedy the refusal
//      message prescribes — naming the artifact's PATH — is asserted to be accepted, because a guard
//      whose remedy is itself refused is a wall. §6's "part 1 holds" is discharged by arms A–D: this
//      ship changed none of them, they run on every suite pass, and arm D still asserts AGT-140's two
//      decision handles plus its captured down.
//
//   F  v7.0.652 R3+R4 — THE COMPLETION: a ship card and a cycle's notes complete their own reversal
//      handle list at write time, appending, never refusing. Measured premise, not a reasoned one:
//      of the reversal handles belonging to ship cards from the last four days, 77 of 133 were
//      unlisted across 43 of 59 cards, and 67 of 172 across 37 of 81 runner_cycles.notes, while
//      cycle_reversal_handles() had shipped at v7.0.644 with NO caller anywhere in the repo. Arm F
//      reads the card this ticket names — 1 of 3 handles unlisted at 419 B on origin/dev, 0 of 3 at
//      532 B after — and computes "listed" exactly as block 3 does, by handle_token.
//   G  IDEMPOTENT, AND THE BLOCK ORDER THAT KEEPS IT SAFE: each token appears exactly once in a card
//      that was written twice, and a real handle sentence that cites a REMOVED ticket (decision
//      4df45c61, whose summary names SES-378) proves why the append has to come AFTER the two refusal
//      blocks — 3 of 285 runner_decisions.summary rows in seven days are like it.
//   H  THE NOTES HOME (R4) reads the same renderer through a cycle row's own id and item_id. The
//      WRITE half is labelled ship-time evidence, not repeated live: a rolled-back UPDATE of cycle
//      7ff68b47's notes gained 114 B, a second gained 0 B (pattern:77).
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

// Arms F/G/H (v7.0.652 R3+R4). THE TOKEN IS WHAT MAKES THE COMPLETION IDEMPOTENT: left(id, 8) for a
// decision handle, the up_name for a captured migration-down. Frozen here, exactly as AGT140_HANDLES
// is, because a test that re-derives its own expectation grades nothing.
export const AGT140_TOKENS = ["59e5e346", "ea1c27fc", AGT140_DOWN];
// The card task 3 of v7.0.652 completed: 419 B with 1 of 3 handles unlisted before, 532 B with 0 after.
export const COMPLETED_CARD = "7c55bf10-3aba-44fe-a561-20d2cbed4683";
// Block order, over live text rather than argument: decision 4df45c61 is a real handle of cycle
// 4370e9cb / SES-378 and its own summary cites SES-378, which the board reads as 'removed'.
export const BLOCK_ORDER_CYCLE = "4370e9cb-cc9e-4292-88bd-c38028298cbc";
export const BLOCK_ORDER_TICKET = "SES-378";
export const BLOCK_ORDER_HANDLE = "4df45c61";

// Arm E / arm 0(f). THE REGEX, VERBATIM FROM THE SHIPPED SQL. \b is BACKSPACE in a POSIX ARE, not a
// word boundary: the design's first form used it, matched nothing, and made a board full of dead shas
// read clean. The token therefore ends with a negative lookahead, and arm 0(f) pins the literal so a
// later "simplification" back to \b is a red rather than a silent no-op.
export const SHA_REGEX_LITERAL =
  "'(?:commit(?:ted)?(?: as)?)[[:space:]]+([0-9a-f]{7,40})(?![0-9a-f])'";
// The one sha in the AGT-140 card that was always resolvable, and the prefix arm E drives it by.
export const GRADED_PREFIX = "3586c345";
// Two shas quoted in real records that are ancestors of no remote branch — checked with git, not
// recalled: `git cat-file -e` does not know either one.
export const DEAD_SHA = "bcba265c";
export const DEAD_SHA_2 = "776af675";

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

  // (f) v7.0.648 R1 — THE COMMIT-SHA HALF, in the SAME function and the SAME trigger pair. Each
  //     assertion names a line whose loss turns the second block into a no-op or into a wall.
  assert.ok(
    sql.includes("CREATE OR REPLACE FUNCTION public.note_unverifiable_commit_shas(p_new text, p_old text)"),
    `${SQL_REL} no longer creates note_unverifiable_commit_shas by its exact identity argument list`,
  );
  assert.strictEqual(
    (sql.split(SHA_REGEX_LITERAL).length - 1), 2,
    "the p_new and p_old scans must BOTH carry the lookahead-terminated sha pattern verbatim — " +
      "one of them was reworded, so the two halves no longer read the same text",
  );
  assert.ok(!sql.includes("{7,40})\\b"),
    "a scan went back to \\b, which is BACKSPACE in a POSIX ARE — the rule would match nothing and " +
      "every dead sha would read clean");

  // THE ALLOWLIST IS THE JOIN, over both columns, and PREFIX EITHER WAY.
  assert.ok(sql.includes("select c.push_sha as sha from public.runner_cycles c where coalesce(c.push_sha, '') <> ''"),
    "the allowlist stopped reading runner_cycles.push_sha");
  assert.ok(sql.includes("select v.graded_sha from public.runner_verdicts v where coalesce(v.graded_sha, '') <> ''"),
    "the allowlist stopped reading runner_verdicts.graded_sha — the one always-true sha");
  assert.ok(sql.includes("where k.sha like n.tok || '%' or n.tok like k.sha || '%'"),
    "the prefix match lost a direction — a 7-char abbreviation or a full 40 of a real push sha would " +
      "now be refused although the board holds it");

  // THE GRANDFATHER CLAUSE, the R1 half of it.
  assert.ok(sql.includes("where not exists (select 1 from old_toks o where o.tok = n.tok)"),
    "the p_old subtraction is gone from the sha rule — a cycle could not correct a record that " +
      "quotes a dead sha, because correcting it means quoting it");

  // EXTENDED, NEVER DUPLICATED: one guard function, two blocks in order, the same two triggers.
  assert.strictEqual(
    (sql.match(/CREATE OR REPLACE FUNCTION public\.runner_record_citation_guard\(\)/g) || []).length, 1,
    "two definitions of the guard in one file — a stale body would ship beside the live one (§19v, " +
      "one home per fact)",
  );
  assert.strictEqual((sql.match(/^CREATE TRIGGER /gm) || []).length, 2,
    "R1 extends the existing trigger pair; a third trigger means the guard was duplicated");
  const guardBody = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.runner_record_citation_guard()"));
  const iRemoved = guardBody.indexOf("from public.card_removed_citations(v_new, v_old) c;");
  const iShas = guardBody.indexOf("from public.note_unverifiable_commit_shas(v_new, v_old) s;");
  const iReturn = guardBody.indexOf("\n  return NEW;\nend");
  assert.ok(iRemoved > 0 && iShas > iRemoved && iReturn > iShas,
    "the sha block must sit AFTER the removed-ticket block and BEFORE the final return NEW — " +
      `got removed=${iRemoved}, shas=${iShas}, return=${iReturn}`);

  // GRANTS BY NAME for the new function, and the trailing gate asserting its single overload.
  assert.ok(sql.includes("REVOKE ALL ON FUNCTION public.note_unverifiable_commit_shas(text, text) FROM PUBLIC, anon, authenticated;"),
    "note_unverifiable_commit_shas is not revoked from PUBLIC, anon AND authenticated by name");
  assert.ok(sql.includes("GRANT EXECUTE ON FUNCTION public.note_unverifiable_commit_shas(text, text) TO service_role;"),
    "note_unverifiable_commit_shas does not grant EXECUTE to service_role — the trigger's own reader " +
      "would fail for the step 9 writer");
  assert.ok(sql.includes("'note_unverifiable_commit_shas'"),
    "the trailing DO gate no longer asserts exactly one pg_proc row for the new function " +
      "(.claude/rules/supabase-function-signature.md)");
  // (g) v7.0.652 R3+R4 — THE THIRD BLOCK: THE HANDLE LIST COMPLETES ITSELF AT WRITE TIME, in the
  //     SAME function and the SAME trigger pair, appending and never refusing. Each assertion names
  //     a line whose loss turns the completion into a no-op, a duplicator, or a refusal.
  //     THE RETURN TYPE CHANGED, so the recreate needs a DROP by the exact identity argument list:
  //     CREATE OR REPLACE cannot add an OUT column, and without the DROP the migration reports
  //     success and leaves the old six-column function live
  //     (.claude/rules/supabase-function-signature.md).
  const dropLine = "DROP FUNCTION IF EXISTS public.cycle_reversal_handles(uuid, text);";
  assert.ok(sql.includes(dropLine),
    `${SQL_REL} recreates cycle_reversal_handles with a seventh OUT column but no longer DROPs the ` +
      "old one first — CREATE OR REPLACE cannot change a function's return type");
  assert.ok(sql.indexOf(dropLine) <
              sql.indexOf("CREATE OR REPLACE FUNCTION public.cycle_reversal_handles(p_cycle_id uuid"),
    "the DROP must come BEFORE the CREATE it makes room for");
  assert.ok(sql.includes(
    " RETURNS TABLE(handle_kind text, id text, kind text, summary text, decided_at timestamp with time zone, handle_sentence text, handle_token text)"),
    "cycle_reversal_handles lost the handle_token column — the completion has nothing to search for " +
      "and would append every handle on every write");
  assert.ok(/\n {9}left\(d\.id::text, 8\),?\n/.test(sql),
    "the decision branch no longer emits left(d.id::text, 8) as its handle_token");
  assert.ok(/\n {9}m\.up_name\n/.test(sql),
    "the migration-down branch no longer emits m.up_name as its handle_token");

  //     THE COMPLETION ITSELF, in the guard: declared, token-keyed, both homes, no exception path.
  assert.ok(/\n {2}v_append {4}text;\n/.test(sql), "v_append is no longer declared in the guard");
  assert.strictEqual((sql.match(/where position\(h\.handle_token in v_new\) = 0;/g) || []).length, 2,
    "both homes must skip a handle whose TOKEN is already in the row — that is the whole of the " +
      "idempotence, and a count other than 2 means one home lost it or gained a second copy");
  assert.ok(sql.includes("NEW.plain_worth := btrim(concat_ws(' ', NEW.plain_worth, v_append));"),
    "the card home no longer appends the missing handle sentences to plain_worth");
  assert.ok(sql.includes("NEW.notes := btrim(concat_ws(E'\\n\\n', NEW.notes, v_append));"),
    "the notes home (R4) no longer appends the missing handle sentences to runner_cycles.notes");
  assert.ok(sql.includes("if NEW.kind = 'ship' and NEW.cycle_id is not null and NEW.backlog_id is not null then"),
    "the card home stopped scoping the completion to a ship card carrying both keys");
  assert.ok(sql.includes("if NEW.item_id is not null then"),
    "the notes home stopped scoping the completion to a cycle that names a ticket");

  //     BLOCK ORDER IS THE SHIP: blocks 1-2 grade the writer's own text and refuse, block 3 appends
  //     LAST. Reversed, a card would be refused over the renderer's own words — 3 of 285
  //     runner_decisions.summary rows in seven days cite a removed ticket (arm G proves one live).
  const iBlock3 = guardBody.indexOf("-- BLOCK 3 (v7.0.652, R3+R4).");
  assert.ok(iBlock3 > iShas && iBlock3 < guardBody.indexOf("\n  return NEW;\nend"),
    "the completion must sit AFTER both refusal blocks and BEFORE the final return NEW — " +
      `got shas=${iShas}, block3=${iBlock3}`);
  const block3 = guardBody.slice(iBlock3, guardBody.indexOf("\n  return NEW;\nend"));
  assert.ok(!/raise\s+exception/i.test(block3),
    "block 3 grew an exception path — a completion that can raise aborts the writer's own record, " +
      "which is the one thing this ticket must not do");

  //     AND THE TRAILING GATE STILL ASSERTS ONE OVERLOAD PER NAME, cycle_reversal_handles included:
  //     the DROP above is what makes that true, and the success flag is never the proof.
  assert.ok(sql.includes("'cycle_reversal_handles',"),
    "the trailing DO gate no longer names cycle_reversal_handles in its overload loop");
  assert.ok(sql.includes("expected exactly 1"),
    "the trailing DO gate no longer asserts exactly one pg_proc row per function name " +
      "(.claude/rules/supabase-function-signature.md)");
  assert.ok(sql.includes("array['59e5e346', 'agt140_project_priority_pick', 'ea1c27fc']"),
    "the trailing DO gate no longer proves handle_token comes back populated for AGT-140 — a NULL " +
      "column passes every other assertion in that gate");
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

async function restGet(url, key, query) {
  const res = await fetch(`${base(url)}/rest/v1/${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${query} returned HTTP ${res.status}`);
  return res.json();
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
      "arms A-E: card_removed_citations() refusing the real wrong sentence by name and passing its " +
        "correction, two whole real cards and the 'removal proposed' distinction passing, the " +
        "grandfather clause in both directions, notes-shaped text under the same rule, and " +
        "cycle_reversal_handles() returning exactly the two AGT-140 handles plus its captured down, and arm E: a commit sha no push_sha or graded_sha resolves coming back BY NAME while a real push sha passes as both a 7-char abbreviation and a full 40, the grandfather clause both ways, and the PATH the refusal prescribes accepted, and arms F/G/H: the card this ticket completed naming all three of its reversal handles by token with each appearing exactly once, a real handle sentence citing a removed ticket proving why the append comes last, and the notes home rendering the same handle set through a cycle row's own id and item_id",
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

  // ---- E. R1: A COMMIT SHA THE BOARD CANNOT RESOLVE -----------------------------------------
  // Premise first, from the board, so a changed world reads as a premise failure and never as a pass.
  const anchor = await restGet(url, key,
    `runner_cycles?select=push_sha&push_sha=like.${GRADED_PREFIX}*&limit=1`);
  assert.strictEqual(anchor.length, 1,
    `premise gone: no runner_cycles.push_sha starts ${GRADED_PREFIX}, so the allowlist half of this ` +
      "arm grades nothing");
  const gradedFull = anchor[0].push_sha;
  assert.strictEqual(gradedFull.length, 40,
    `the anchor push_sha is ${gradedFull.length} chars, not a full 40 — the prefix arms below need both`);

  const shas = async (p_new, p_old) =>
    (await rpc(url, key, "note_unverifiable_commit_shas", { p_new, p_old })).map(r => r.token).sort();

  // The refusal, BY NAME, on the sentence shape a research or kickoff artifact actually carries.
  assert.deepStrictEqual(
    await shas(`research doc committed as ${DEAD_SHA} at docs/research/x.md`, ""),
    [DEAD_SHA], `a commit sha no push_sha or graded_sha resolves must come back named: ${DEAD_SHA}`);

  // The allowlist, BOTH prefix directions. Same sentence, only the sha moves.
  assert.deepStrictEqual(
    await shas(`research doc committed as ${GRADED_PREFIX} at docs/research/x.md`, ""),
    [], "a 7-char abbreviation of a real push sha must be accepted");
  assert.deepStrictEqual(
    await shas(`research doc committed as ${gradedFull} at docs/research/x.md`, ""),
    [], "the full 40 of a real push sha must be accepted");

  // The grandfather clause, BOTH directions — without the second half this is indistinguishable
  // from "UPDATE is never checked", and correcting a record means quoting the dead sha while you do.
  assert.deepStrictEqual(
    await shas(`kickoff committed ${DEAD_SHA_2} — CORRECTION: name the path instead.`,
               `kickoff committed ${DEAD_SHA_2}`),
    [], "a sha already in the row being updated must be grandfathered");
  assert.deepStrictEqual(await shas(`kickoff committed ${DEAD_SHA_2}`, ""), [DEAD_SHA_2],
    "the same text as a fresh INSERT must still refuse — nothing is grandfathered there");

  // THE REMEDY THE MESSAGE PRESCRIBES IS ITSELF ACCEPTED. A guard whose only remedy also refuses is
  // a wall, and this one's remedy is the whole point of the ticket: name the PATH.
  assert.deepStrictEqual(
    await shas("kickoff committed at docs/kickoffs/v7.0.648-AGT-173-record-names-paths.md", ""),
    [], "naming the artifact's PATH must be accepted — it is the remedy the refusal prescribes");

  // SCOPE, PINNED DELIBERATELY: the rule reads a COMMIT CLAIM, not every hex token. A card that
  // quotes `sha <value>` without claiming a commit is out of scope by construction; widening that
  // is a later decision, not a silent one.
  assert.deepStrictEqual(await shas(`graded at sha ${DEAD_SHA_2}`, ""), [],
    "the rule is scoped to a commit claim — a bare 'sha <value>' is out of scope by construction");
  // ---- F. THE COMPLETION IS LIVE, ON THE CARD THIS TICKET NAMES --------------------------------
  // Read-only, over the row v7.0.652's own task 3 completed (pattern:76 — a permanent regression
  // test never mutates working data, and PostgREST cannot open a transaction to roll a write back,
  // SES-310). The invariant is computed EXACTLY as block 3 computes it: a handle is listed when its
  // handle_token appears in the text. On origin/dev this same read returned 1 unlisted of 3.
  const withTokens = await rpc(url, key, "cycle_reversal_handles",
    { p_cycle_id: AGT140_CYCLE, p_backlog_id: "AGT-140" });
  assert.deepStrictEqual([...new Set(withTokens.map(h => h.handle_token))].sort(), [...AGT140_TOKENS].sort(),
    "cycle_reversal_handles must hand back one handle_token per handle — left(id,8) for a decision, " +
      "the up_name for a captured down; without it the completion has nothing to search for");
  const card = await restGet(url, key,
    `runner_items?select=id,cycle_id,backlog_id,plain_worth&id=eq.${COMPLETED_CARD}`);
  assert.strictEqual(card.length, 1, `premise gone: card ${COMPLETED_CARD} is no longer on the board`);
  assert.strictEqual(card[0].cycle_id, AGT140_CYCLE,
    `card ${COMPLETED_CARD} no longer belongs to cycle ${AGT140_CYCLE}`);
  const worth = card[0].plain_worth || "";
  const unlisted = withTokens.filter(h => !worth.includes(h.handle_token)).map(h => h.handle_token);
  assert.deepStrictEqual(unlisted, [],
    `card ${COMPLETED_CARD} names ${withTokens.length - unlisted.length} of ${withTokens.length} of ` +
      `its reversal handles — ${unlisted.join(", ")} unlisted. Before v7.0.652 that count was 1 of 3 ` +
      "(419 B); the completion made it 0 (532 B) and every later write keeps it 0");

  // ---- G. IDEMPOTENT, AND THE BLOCK ORDER THAT MAKES IT SAFE -----------------------------------
  // The card was UPDATEd after it was completed, so a completion that appended unconditionally would
  // show two copies. Each token appears EXACTLY once — counted, never "at least one".
  for (const token of AGT140_TOKENS) {
    const hits = worth.split(token).length - 1;
    assert.strictEqual(hits, 1,
      `handle ${token} appears ${hits} times in card ${COMPLETED_CARD} — the completion is keyed on ` +
        "the token precisely so a re-write cannot duplicate a sentence it already wrote");
  }
  // BLOCK ORDER, PROVEN OVER LIVE TEXT rather than argued: a real handle sentence cites a REMOVED
  // ticket, so if block 3 appended BEFORE block 1 graded, block 1 would refuse the writer's card over
  // the renderer's own words. Arm 0(g) pins the order in the SQL; this half proves the offending
  // sentence is real. The premise is asserted first, so a board change reads as a premise failure.
  const orderHandles = await rpc(url, key, "cycle_reversal_handles",
    { p_cycle_id: BLOCK_ORDER_CYCLE, p_backlog_id: BLOCK_ORDER_TICKET });
  const offending = orderHandles.filter(h => h.handle_token === BLOCK_ORDER_HANDLE);
  assert.strictEqual(offending.length, 1,
    `premise gone: decision ${BLOCK_ORDER_HANDLE} is no longer a handle of ` +
      `${BLOCK_ORDER_CYCLE}/${BLOCK_ORDER_TICKET}, so the block-order half grades nothing`);
  const orderBoard = await statusesOf(url, key, [BLOCK_ORDER_TICKET]);
  assert.strictEqual(orderBoard[BLOCK_ORDER_TICKET], "removed",
    `premise gone: ${BLOCK_ORDER_TICKET} reads '${orderBoard[BLOCK_ORDER_TICKET]}', not 'removed'`);
  assert.deepStrictEqual(
    removed(await rpc(url, key, "card_removed_citations", { p_new: offending[0].handle_sentence, p_old: "" })),
    [BLOCK_ORDER_TICKET],
    `handle ${BLOCK_ORDER_HANDLE}'s own sentence cites the removed ${BLOCK_ORDER_TICKET}: appended ` +
      "AFTER block 1 it is accepted and grandfathered thereafter, appended BEFORE it the guard would " +
      "refuse a card over its own renderer's words");

  // ---- H. THE NOTES HOME (R4) READS THE SAME RENDERER ------------------------------------------
  // The notes branch calls cycle_reversal_handles(NEW.id, NEW.item_id) — a cycle row's OWN id and
  // ticket, not a card's two columns — so this arm proves that call resolves over a real cycle row.
  // The WRITE half was measured at this ship inside a rolled-back subtransaction and is labelled as
  // such rather than repeated here (pattern:77): UPDATE of cycle 7ff68b47's notes gained 114 B (the
  // one missing 112 B sentence plus the blank-line separator), a second UPDATE gained 0 B, and the
  // probe was undone by RAISE 'AGT173_UNDO' — a permanent test must not write to this ledger
  // (SES-196/SES-218/SES-275) and PostgREST cannot roll one back (SES-310).
  const cycleRow = await restGet(url, key,
    `runner_cycles?select=id,item_id,notes&id=eq.${AGT140_CYCLE}`);
  assert.strictEqual(cycleRow.length, 1, `premise gone: cycle ${AGT140_CYCLE} is no longer on the board`);
  assert.strictEqual(cycleRow[0].item_id, "AGT-140",
    `cycle ${AGT140_CYCLE} no longer names AGT-140, so its notes branch would render a different set`);
  const byCycleRow = await rpc(url, key, "cycle_reversal_handles",
    { p_cycle_id: cycleRow[0].id, p_backlog_id: cycleRow[0].item_id });
  assert.deepStrictEqual([...new Set(byCycleRow.map(h => h.handle_token))].sort(), [...AGT140_TOKENS].sort(),
    "the notes home's own call — (cycle.id, cycle.item_id) — must render the same handle set the card " +
      "home renders, or R4 completes a different list from R3");
  for (const h of byCycleRow) {
    assert.ok(typeof h.handle_token === "string" && h.handle_token.length >= 8,
      `handle ${h.id} came back with no token for the notes home to search for`);
    assert.ok(h.handle_sentence.includes(h.handle_token),
      `handle ${h.id}'s sentence does not carry its own token — the append would repeat itself on ` +
        "every later write, because idempotence is exactly 'the sentence carries its token'");
  }
}

export default async function run() {
  theShippedSqlCarriesTheRule();
  await theLiveArms();
}

selfRun(import.meta.url, run);
