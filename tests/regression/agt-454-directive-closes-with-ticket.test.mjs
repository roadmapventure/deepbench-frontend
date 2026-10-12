// DeepBench v7.0.851 | tests/regression/agt-454-directive-closes-with-ticket.test.mjs | AGT-454 --
// directive closes with its ticket's delivered settle; closed stays closed.
//
// WHAT SHIPPED, and therefore what this file has to be able to go red on. `close_directive()` has
// existed since SES-129 and nothing in `scripts/`, `api/` or `lib/` called it: measured on the
// unchanged tree at HEAD `f7be6751`, `scripts/settle-ship.js` held 0 occurrences of
// `close_directive`, `item_ref` or `runner_directives`, and the only caller was PROSE -- runbook
// step 9 (`docs/runbooks/runner-cycle.md:4136`) asking a model to notice at the end of a long cycle
// that the ticket it just shipped carried one of John's directives. This ship makes the close-out
// do it: `planDirectiveClose()` (pure) and `closeDirectives()` (the one GET and one RPC per row).
//
// THE DELTA CONTROL IS THE IMPORT ITSELF. On `origin/dev` neither `planDirectiveClose` nor
// `closeDirectives` nor `DIRECTIVE_CLOSES_AT` is exported from `scripts/settle-ship.js`, so this
// module cannot even load there -- arm (A)'s first line reads the export and fails the file. There
// is no version of this test that passes on the unchanged tree.
//
// THE DISCRIMINATORS, each named so a weaker implementation cannot pass:
//
// (A) THE TRIGGER IS `delivered`, NOT `done` AND NOT "finished". `settle-ship.js` never writes
//     `done` (`UNSETTLEABLE` :122, SES-154; `done` belongs to `sweep_decision_windows`), so an
//     implementation that waited for `done` would close nothing, forever, while looking correct.
//     `partial` is the other half of the same discrimination: a ticket that names unbuilt work
//     leaves John's instruction LIVE. Both are asserted by value, not by "it returned something".
// (A2) THE `type` / `status` FILTER IS IN THE PURE FUNCTION, not only in the PostgREST query. A
//     `standing` directive, a `drain-epic` row and an already-`done` row are each handed in
//     DIRECTLY and must each plan nothing -- an implementation that filtered only in the URL would
//     pass a URL-shaped test and close a standing instruction the first time a caller widened the
//     read.
// (A3) `item_ref` IS POLYSEMOUS IN SHIPPED DATA, so the match is identity with THIS ticket's
//     `backlog_items.id` and nothing looser. Measured live 2026-10-12 with the service key:
//     `runner_directives` carries NO foreign key on `item_ref` (its only FK is
//     `runner_directives_epic_id_fkey` → `epics(id)`), and of the 8 non-NULL values among 109 rows
//     SEVEN resolve to `runner_items` (briefing card ids -- `lib/briefing-automation.mjs` reads the
//     column that way) and exactly ONE (`009eeb7a`) resolves to `backlog_items` (AGT-264). So a
//     non-resolving value is NOT a ticket link: arm (A) hands in a card id and a second ticket's id
//     and requires both to plan nothing.
// (B) THE SEAM, DRIVEN over a stubbed `globalThis.fetch` (the shape `dat-004-taught-in-assembly`'s
//     arm (b) uses): `partial` must cost ZERO fetches -- not "one GET that returns nothing" -- the
//     RPC body's keys must be the four live identity arguments of `public.close_directive`
//     (`p_cycle, p_directive, p_outcome, p_note`, read live this cycle), and a second settle over a
//     row already `done` must cost ZERO POSTs. The `already_closed = true` answer is driven too: it
//     is the guard for a row that closes BETWEEN the GET and the POST, and it must print
//     "already closed, untouched" rather than claim a close it did not make.
// (C) LIVE, READ-ONLY, AND IT WRITES NOTHING. The live arm proves the RPC call shape against the
//     real function without moving a row: `close_directive` is invoked with the four named
//     parameters and a random non-existent directive id, which raises `no directive <uuid>` BEFORE
//     any insert (the function validates outcome and note, then `select ... into` / `if not found
//     then raise`). A signature that did not resolve by those names would answer PGRST202 instead,
//     so the arm separates "the function refused my row" from "the function does not take my
//     arguments". It also runs the CLI's own GET against this ticket's row id and requires the
//     filter to be honoured.
//
// WHAT THIS FILE DOES NOT COVER, named rather than skipped (pattern:77, STANDARDS Section 5). The
// kickoff's arm (C) asked for the five 2026-10-08/09 directives (`a738da38`, `418095d5`,
// `2458c24b`, `0078af4d`, `3c1cc23d`) to read `item_ref` non-NULL and the finished ones closed.
// Measured live this cycle, ALL FIVE read `item_ref` NULL, and the write that would link them is
// GATED, not built: `item_ref` already means "card id" on 7 of its 8 populated rows, so whether a
// governing-ticket link may live there at all is John's design call, and three of the five name no
// governing ticket anywhere in the repo. `docs/design/agt-454-directive-item-ref.sql` is therefore a
// PROPOSAL and was not applied. The arm below declares that gap with `notRun()` and prints the
// measured NULLs as its evidence rather than asserting a state nobody shipped.
//
// NO MODEL CALL, NO SPEND. Pure calls, a stubbed fetch, two REST reads and one deliberately
// refused RPC.

import assert from "assert";
import crypto from "crypto";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  DIRECTIVE_OPEN, DIRECTIVE_CLOSES_AT, planDirectiveClose, closeDirectives,
} from "../../scripts/settle-ship.js";

// The four identity-argument names of `public.close_directive`, measured live 2026-10-12:
//   pg_get_function_identity_arguments → `p_cycle uuid, p_directive uuid, p_outcome text, p_note text`
//   pg_get_function_result             → `TABLE(directive_id uuid, status text, outcome text,
//                                              outcome_note text, already_closed boolean)`
const ARGS = ["p_cycle", "p_directive", "p_outcome", "p_note"];
const TICKET = "AGT-454";
const KICKOFF = "docs/kickoffs/v7.0.851-AGT-454-directive-closes-with-ticket.md";
// A `backlog_items.id` and a `runner_items.id` shape: both are plain uuids, which is exactly why
// the match has to be identity with the ticket's own row id.
const ROW_ID = "d896d815-d17b-493e-8f7a-61dc4da0dddf";       // AGT-432's real row id
const OTHER_ROW_ID = "9888d9fc-3d50-4251-a731-f0150d9551df"; // AGT-433's real row id
const CARD_ID = "f6c7c54a-4682-4163-92a6-96a131d1d5ae";      // a real `runner_items` card id that
                                                             // a directive's `item_ref` points at
const NOTE = `Shipped as ${TICKET}: the close-out settled it delivered (kickoff ${KICKOFF}).`;
const CYCLE = "e6d95725-4e92-4643-a276-ef188301943d";

const open = (extra = {}) => ({ id: "11111111-1111-1111-1111-111111111111", type: "directive", status: "in_progress", outcome: null, item_ref: ROW_ID, ...extra });
const plan = (status, directives) => planDirectiveClose({ directives, ticket: TICKET, ticketRowId: ROW_ID, status, kickoffPath: KICKOFF });

// ---------------------------------------------------------------------------------------------
// Arm (A) -- the pure half, by value
// ---------------------------------------------------------------------------------------------
function armA_pure() {
  const results = [];

  assert.strictEqual(DIRECTIVE_CLOSES_AT, "delivered",
    `the trigger constant must be \`delivered\` — this script never writes \`done\`, so a \`done\` trigger closes nothing forever; got ${JSON.stringify(DIRECTIVE_CLOSES_AT)}`);
  assert.deepStrictEqual([...DIRECTIVE_OPEN].sort(), ["in_progress", "queued"],
    `only \`queued\` and \`in_progress\` are open; got ${JSON.stringify([...DIRECTIVE_OPEN])}`);

  // THE DISCRIMINATION: the same row, the two statuses.
  assert.deepStrictEqual(plan("partial", [open()]), [],
    "`partial` names unbuilt work, so John's instruction stays live — it must plan nothing");
  results.push("partial-plans-nothing");

  const got = plan("delivered", [open()]);
  assert.strictEqual(got.length, 1, `\`delivered\` over one open row must plan exactly one close, got ${got.length}`);
  assert.deepStrictEqual(got[0], { id: open().id, outcome: "shipped", note: NOTE },
    `the plan must carry the row id, \`shipped\` and the NOTE verbatim, got ${JSON.stringify(got[0])}`);
  results.push("delivered-plans-one-shipped-close");

  // `done` is NOT the trigger, and that is the WORDING correction this ticket carries (pattern:89).
  assert.deepStrictEqual(plan("done", [open()]), [],
    "`done` is not a status this script writes — it must not be a trigger either");
  results.push("done-is-not-the-trigger");

  // (A2) the type/status filter lives in the pure function.
  for (const [label, row] of [
    ["status done", open({ status: "done", outcome: "shipped" })],
    ["status standing", open({ status: "standing" })],
    ["status expired", open({ status: "expired" })],
    ["status cancelled", open({ status: "cancelled" })],
    ["type drain-epic", open({ type: "drain-epic" })],
    ["type budget_override", open({ type: "budget_override" })],
  ]) {
    assert.deepStrictEqual(plan("delivered", [row]), [],
      `a row at ${label} must plan nothing even on a \`delivered\` settle — the filter belongs in the pure function, not only in the URL`);
  }
  results.push("only-queued-or-in_progress-directive-rows-close");

  // (A3) `item_ref` is polysemous: identity with THIS ticket's row id, nothing looser.
  for (const [label, row] of [
    ["another ticket's item_ref", open({ item_ref: OTHER_ROW_ID })],
    ["a runner_items card id", open({ item_ref: CARD_ID })],
    ["item_ref NULL", open({ item_ref: null })],
  ]) {
    assert.deepStrictEqual(plan("delivered", [row]), [],
      `${label} is not a link to ${TICKET} — it must plan nothing`);
  }
  assert.deepStrictEqual(planDirectiveClose({ directives: [open()], ticket: TICKET, ticketRowId: null, status: "delivered", kickoffPath: KICKOFF }), [],
    "with no ticket row id there is nothing to match against — it must plan nothing rather than match everything");
  results.push("item_ref-must-be-this-tickets-own-row-id");

  // Mixed set: the one eligible row is picked out of five ineligible ones.
  const mixed = plan("delivered", [
    open({ id: "a", status: "done", outcome: "shipped" }),
    open({ id: "b", type: "drain-epic" }),
    open({ id: "c", item_ref: CARD_ID }),
    open({ id: "d", status: "queued" }),
    open({ id: "e", status: "standing" }),
  ]);
  assert.deepStrictEqual(mixed.map(p => p.id), ["d"],
    `one eligible row among five must plan exactly one close for \`d\`, got ${JSON.stringify(mixed.map(p => p.id))}`);
  assert.deepStrictEqual(plan("delivered", []), [], "no rows must plan nothing");
  results.push("mixed-set-picks-only-the-eligible-row");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (B) -- SEAM PROOF: closeDirectives() over a stubbed globalThis.fetch (stubs the transport
// only; the real plan, the real URL, the real RPC body)
// ---------------------------------------------------------------------------------------------
async function armB_seam() {
  const results = [];
  const saved = globalThis.fetch;
  const BASE = "https://agt-454-seam.invalid";
  const KEY = "agt-454-seam-dummy";

  let calls = [];
  let getRows = [];
  let rpcAnswer = [{ directive_id: open().id, status: "done", outcome: "shipped", outcome_note: NOTE, already_closed: false }];
  const reply = body => ({ ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify(body) });

  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, method: (init && init.method) || "GET", body: init && init.body ? JSON.parse(init.body) : null });
      if (url.includes("/rpc/close_directive")) return reply(rpcAnswer);
      if (url.includes("runner_directives?")) return reply(getRows);
      throw new Error(`arm (B): nothing in this seam should reach ${url}`);
    };
    const logs = [];
    const call = (status, row = { id: ROW_ID }) => {
      calls = [];
      logs.length = 0;
      return closeDirectives({
        base: BASE, key: KEY, cycleId: CYCLE, ticket: TICKET, row, status, kickoffPath: KICKOFF,
        log: s => logs.push(s),
      });
    };
    const posts = () => calls.filter(c => c.method === "POST");

    // B1 -- `partial` costs ZERO fetches. Not "a GET that finds nothing": no transport at all.
    getRows = [open()];
    assert.deepStrictEqual(await call("partial"), [], "`partial` must close nothing");
    assert.strictEqual(calls.length, 0,
      `a \`partial\` settle must not touch the network at all, made ${calls.length} call(s): ${JSON.stringify(calls.map(c => c.method + " " + c.url))}`);
    assert.ok(logs.join("").includes("directives: not read"),
      `the \`partial\` branch must say it did not read, got ${JSON.stringify(logs)}`);
    results.push("seam-partial-zero-fetches");

    // B2 -- `delivered` over one open row: one GET, one POST, the live ARGS body.
    getRows = [open()];
    const closed = await call("delivered");
    const gets = calls.filter(c => c.method === "GET");
    assert.strictEqual(gets.length, 1, `exactly one GET, made ${gets.length}`);
    assert.ok(gets[0].url.includes(`item_ref=eq.${ROW_ID}`),
      `the GET must filter \`item_ref\` to this ticket's row id, got ${gets[0].url}`);
    assert.ok(gets[0].url.includes("select=id,type,status,outcome,item_ref") && gets[0].url.includes("limit=100"),
      `the GET must name its columns and bound itself, got ${gets[0].url}`);
    assert.strictEqual(posts().length, 1, `exactly one POST rpc/close_directive, made ${posts().length}`);
    assert.ok(posts()[0].url.includes("/rpc/close_directive"), `the POST must be rpc/close_directive, got ${posts()[0].url}`);
    assert.deepStrictEqual(Object.keys(posts()[0].body), ARGS,
      `the RPC body's keys must be the live identity arguments ${JSON.stringify(ARGS)}, got ${JSON.stringify(Object.keys(posts()[0].body))}`);
    const values = ARGS.map(k => posts()[0].body[k]);
    assert.strictEqual(values[2], "shipped", `ARGS[2] (\`p_outcome\`) must be \`shipped\`, got ${JSON.stringify(values[2])}`);
    assert.strictEqual(values[0], CYCLE, "`p_cycle` must be this cycle — `close_directive()` images the row against it");
    assert.strictEqual(values[1], open().id, "`p_directive` must be the planned row's id");
    assert.strictEqual(values[3], NOTE, `\`p_note\` must be the NOTE verbatim — the function refuses a blank one; got ${JSON.stringify(values[3])}`);
    assert.deepStrictEqual(closed, [{ id: open().id, already_closed: false, outcome: "shipped" }],
      `the return must report the close it made, got ${JSON.stringify(closed)}`);
    assert.ok(logs.join("").includes("closed shipped"), `the log must say \`closed shipped\`, got ${JSON.stringify(logs)}`);
    results.push("seam-delivered-one-post-with-live-args-body");

    // B3 -- CLOSED STAYS CLOSED. The same row read back at `done`: the GET happens, the POST does not.
    getRows = [open({ status: "done", outcome: "shipped" })];
    assert.deepStrictEqual(await call("delivered"), [], "a row already `done` must be left exactly as it is");
    assert.strictEqual(calls.length, 1, `a second settle must cost its one GET and nothing more, made ${calls.length} call(s)`);
    assert.strictEqual(posts().length, 0, `a second settle must POST nothing, made ${posts().length}`);
    assert.ok(logs.join("").includes("directives: none open"), `the log must say none open, got ${JSON.stringify(logs)}`);
    results.push("seam-second-settle-zero-posts");

    // B4 -- the race guard, driven: the row closed between the GET and the POST, so the RPC answers
    // `already_closed = true`. The log must not claim a close this cycle did not make.
    getRows = [open()];
    rpcAnswer = [{ directive_id: open().id, status: "done", outcome: "carded", outcome_note: "an earlier cycle's words", already_closed: true }];
    const raced = await call("delivered");
    assert.strictEqual(posts().length, 1, "the race case still makes its one POST — `close_directive()` is the thing that decides");
    assert.deepStrictEqual(raced, [{ id: open().id, already_closed: true, outcome: "carded" }],
      `the return must carry \`already_closed\` and the verdict that stood, got ${JSON.stringify(raced)}`);
    assert.ok(logs.join("").includes("already closed, untouched"),
      `the log must say the row was untouched, not \`closed shipped\`, got ${JSON.stringify(logs)}`);
    assert.ok(!logs.join("").includes("closed shipped"), "the race case must not report a close it did not make");
    results.push("seam-already_closed-reported-not-claimed");

    // B5 -- no cycle id, no write: `close_directive()` images the row against the cycle, so a
    // missing attribution is refused here rather than at the constraint.
    rpcAnswer = [{ directive_id: open().id, status: "done", outcome: "shipped", outcome_note: NOTE, already_closed: false }];
    getRows = [open()];
    calls = [];
    logs.length = 0;
    assert.deepStrictEqual(await closeDirectives({
      base: BASE, key: KEY, cycleId: "", ticket: TICKET, row: { id: ROW_ID }, status: "delivered",
      kickoffPath: KICKOFF, log: s => logs.push(s),
    }), [], "no cycle id must close nothing");
    assert.strictEqual(calls.length, 0, `no cycle id must cost zero fetches, made ${calls.length}`);
    results.push("seam-no-cycle-id-zero-fetches");
  } finally {
    globalThis.fetch = saved;
  }

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (C) -- LIVE, read-only. Nothing below writes a row.
// ---------------------------------------------------------------------------------------------
async function rest(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(init && init.headers ? init.headers : {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}

async function armC_live(url, key) {
  const results = [];

  // C1 -- THE CALL SHAPE, against the real function, with no row moved. A uuid that is not a
  // directive: `close_directive()` validates `p_outcome` and `p_note`, then reads the row and
  // raises `no directive <uuid>` before its before-image insert. So this proves the four parameter
  // NAMES resolve (a mismatch answers PGRST202 "Could not find the function ... in the schema
  // cache") and that the function refused for the reason we expect.
  const ghost = crypto.randomUUID();
  const body = { [ARGS[0]]: CYCLE, [ARGS[1]]: ghost, [ARGS[2]]: "shipped", [ARGS[3]]: NOTE };
  const refused = await rest(url, key, "rpc/close_directive", { method: "POST", body: JSON.stringify(body) });
  assert.strictEqual(refused.ok, false, `a non-existent directive must be refused, got HTTP ${refused.status}: ${refused.text}`);
  assert.ok(!refused.text.includes("PGRST202"),
    `the four argument names must resolve against the live function — PGRST202 means our RPC body is the wrong shape: ${refused.text}`);
  assert.ok(refused.text.includes(`no directive ${ghost}`),
    `the refusal must be \`close_directive: no directive ${ghost}\` — any other refusal means the call shape, not the row, was wrong: ${refused.text}`);
  console.log(`  (C1) live close_directive(${ARGS.join(", ")}) refused a ghost id as expected; no row written`);
  results.push("live-rpc-args-resolve-and-ghost-refused");

  // C1b -- BOTH DIRECTIONS on the guard the NOTE exists for: a blank note is refused, so the plan's
  // note is load-bearing rather than decoration.
  const blank = await rest(url, key, "rpc/close_directive", {
    method: "POST", body: JSON.stringify({ ...body, [ARGS[3]]: "   " }),
  });
  assert.strictEqual(blank.ok, false, "a blank outcome_note must be refused");
  assert.ok(blank.text.includes("outcome_note is required"),
    `a blank note must be refused as \`outcome_note is required\`, got: ${blank.text}`);
  results.push("live-blank-note-refused");

  // C2 -- THE CLI'S OWN GET, run against this ticket's real row id. The filter must be honoured:
  // every row it returns carries exactly that `item_ref`.
  const mine = await rest(url, key, `backlog_items?backlog_id=eq.${TICKET}&select=id,status`);
  assert.ok(mine.ok && Array.isArray(mine.json) && mine.json.length === 1,
    `${TICKET} must read exactly one backlog row, got HTTP ${mine.status}: ${mine.text}`);
  const myRow = mine.json[0];
  const linked = await rest(url, key,
    `runner_directives?select=id,type,status,outcome,item_ref&item_ref=eq.${myRow.id}&limit=100`);
  assert.ok(linked.ok && Array.isArray(linked.json),
    `the close-out's own GET must answer, got HTTP ${linked.status}: ${linked.text}`);
  for (const r of linked.json) {
    assert.strictEqual(r.item_ref, myRow.id,
      `the \`item_ref=eq.\` filter must be honoured — row ${r.id} came back carrying ${r.item_ref}`);
  }
  // And the plan over whatever that read returns is self-consistent: every planned row is one of
  // the rows actually read, and every planned row was open.
  const planned = planDirectiveClose({
    directives: linked.json, ticket: TICKET, ticketRowId: myRow.id, status: "delivered", kickoffPath: KICKOFF,
  });
  for (const p of planned) {
    const src = linked.json.find(r => r.id === p.id);
    assert.ok(src && src.type === "directive" && DIRECTIVE_OPEN.has(src.status),
      `every planned close must come from an open \`directive\` row actually read; ${p.id} did not`);
  }
  console.log(`  (C2) live GET item_ref=eq.${myRow.id} → ${linked.json.length} row(s), ${planned.length} would close on a \`delivered\` settle`);
  results.push("live-get-filter-honoured-and-plan-self-consistent");

  // C3 -- the kickoff's five, measured and DECLARED rather than asserted. See the header: the link
  // write is gated, so there is no shipped state here to assert.
  const five = ["a738da38", "418095d5", "2458c24b", "0078af4d", "3c1cc23d"];
  const all = await rest(url, key, "runner_directives?select=id,type,status,outcome,item_ref&limit=1000");
  assert.ok(all.ok && Array.isArray(all.json), `the directive read must answer, got HTTP ${all.status}: ${all.text}`);
  const rows = five.map(p => all.json.find(r => String(r.id).startsWith(p))).filter(Boolean);
  const nulls = rows.filter(r => r.item_ref === null).map(r => String(r.id).slice(0, 8));
  notRun(
    "AGT-454 (C3): the five 2026-10-08/09 directives linked to their tickets and the finished ones closed",
    `the data half is GATED, not built. Measured live this run: ${rows.length} of the five read, ` +
      `${nulls.length} with \`item_ref\` NULL (${nulls.join(", ") || "none"}). \`item_ref\` already means ` +
      `"runner_items card id" on 7 of its 8 populated rows platform-wide, so whether a governing-ticket ` +
      `link may live there is John's design call; \`docs/design/agt-454-directive-item-ref.sql\` is a ` +
      "PROPOSAL and was not applied. The mechanism arms (A)/(B)/(C1)/(C2) above are the shipped half.",
  );
  console.log(`  (C3) the five: ${rows.map(r => `${String(r.id).slice(0, 8)}=${r.status}/${r.item_ref === null ? "item_ref NULL" : r.item_ref}`).join(" · ")}`);

  return results;
}

async function run() {
  const a = armA_pure();
  console.log(`  (A) pure: ${a.join(", ")}`);
  const b = await armB_seam();
  console.log(`  (B) SEAM PROOF (stubbed transport, real plan and real RPC body): ${b.join(", ")}`);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "AGT-454 (C): the live call shape of `public.close_directive` and the close-out's own GET",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. Both are a live Postgres function and " +
        "live rows, so there is no source-parsed stand-in. Canonical invocation: docs/STANDARDS.md " +
        "Section 2 rule 5.",
    );
    return;
  }
  const c = await armC_live(url, key);
  console.log(`  (C) live, read-only: ${c.join(", ")}`);
}

selfRun(import.meta.url, run);
export default run;
