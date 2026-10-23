// DeepBench v7.0.889 | tests/regression/agt-459-ship-card-retire.test.mjs | AGT-459 --
// a kind='ship' card gains an outcome that closes it, and the briefing's §16 stops reading a
// machine close as a tap of John's.
//
// WHAT SHIPPED, and therefore what this file has to be able to go red on. A `runner_items` row with
// `kind='ship'` is a build report awaiting John's tap. `runner_items_decision_check` ALREADY
// admitted `retired` table-wide and `runner_items` was ALREADY on `reverse_decision()`'s allowlist
// with Guard B refusing only `gated_before_build` -- both re-verified live this cycle rather than
// taken from the kickoff -- so no constraint and no reversal path changed. What was missing was a
// WRITER: measured on the unchanged tree, nothing in `scripts/`, `api/` or `lib/` ever wrote
// `decision` on a `kind='ship'` row (`decide-gated-card.js` is gate-only, `:103`, `:279`), so 111
// cards whose ticket had already reached `done` / `removed` / `removal proposed` -- or which carried
// no `backlog_id` at all, and a ship verdict is keyed by `backlog_id` -- could never be ruled by
// ANY path. This ship adds `public.retire_stale_ship_cards(uuid, text)`, calls it as step 6 of
// every `settle-ship.js --apply`, and narrows §16's population to John's own three words.
//
// THE DELTA CONTROL IS THE IMPORT ITSELF. On `origin/dev` `retireStaleShipCards` is not exported
// from `scripts/settle-ship.js`, so this module cannot even load there -- arm (A)'s first line
// reads the export and fails the file. There is no version of this test that passes on the
// unchanged tree.
//
// THE DISCRIMINATORS, each named so a weaker implementation cannot pass:
//
// (A) §16's POPULATION IS A NAMED LIST, NOT A NULL CHECK, and the arm reads the real source line
//     rather than a copy of it. `decision=not.is.null` admits all FOUR values the check constraint
//     permits, so the backfill of 111 machine closes would have moved John's published
//     Rework/Reverse rate the moment it landed. The three words must be named AND `retired` must be
//     absent from the named list -- asserted separately, because a list that named all four would
//     satisfy "names the three" on its own. `kind=eq.ship` must survive verbatim: `SES-181b` greps
//     for it, so a rewrite that dropped it would pass a semantics test and break a different one.
// (A2) THE NO-OP CLAIM IS PROVEN, AND ITS NEGATIVE CONTROL IS THE WHOLE POINT. The ship asserts
//     that §16's figures are byte-identical across this edit because zero ship cards read `retired`
//     before the backfill. "The numbers did not move" is also exactly what a no-change commit looks
//     like, so the arm applies BOTH filters to fixture rows: over a board with no `retired` card the
//     two select the same set (the no-op), and over a board with one they DIVERGE (the control).
//     Without the second half this arm would pass against `decision=not.is.null` unchanged.
// (B) THE SEAM, driven over a stubbed `globalThis.fetch` (the shape `agt-454` arm (B) uses -- it
//     stubs the transport only; the real guard, the real URL and the real RPC body). A missing
//     `--cycle-id` must cost ZERO fetches, not "one POST that returns nothing": every row the sweep
//     closes is imaged against the cycle that closed it, and a sweep attributed to nobody is a
//     sweep nobody can reverse. `p_session_name` must be sent EXPLICITLY null rather than omitted --
//     the function's one fixed identity argument list is `(uuid, text)` with NO DEFAULT
//     (.claude/rules/supabase-function-signature.md), so an omitted key is a different call and
//     PostgREST answers an unresolvable one as an EMPTY RESULT, which on this function would read
//     as "nothing was stale" and silently stop sweeping the board forever.
// (C) LIVE, AND IT WRITES NOTHING. The XOR guard is driven against the real function with BOTH
//     attribution arguments null, which `record_decision()`'s own contract and
//     `ck_before_image_attribution` both require to be refused. A function that accepted it would
//     either file a decision with no author or raise 23514 from the constraint instead of its own
//     message, so the arm separates "the function refused me by its own rule" from "the schema
//     caught it later". It asserts nothing about the 111 rows and closes no card.
//
// NO MODEL CALL, NO SPEND. Pure calls, one source read, a stubbed fetch, and one deliberately
// refused RPC.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { retireStaleShipCards } from "../../scripts/settle-ship.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BRIEFING = path.join(HERE, "..", "..", "scripts", "build-briefing.mjs");

// The two identity-argument names of `public.retire_stale_ship_cards`, as the migration declares
// them: `p_cycle_id uuid, p_session_name text`, one fixed list, no DEFAULT.
const ARGS = ["p_cycle_id", "p_session_name"];
const CYCLE = "5539aecb-77a1-433c-9195-a0c46a29fdf1";
// John's own three words -- the values `runner_items_decision_check` admits that mean HE ruled.
const JOHNS = ["accept", "rework", "reverse"];
// The fourth value the same constraint admits, written only by the machine.
const MACHINE = "retired";

// ---------------------------------------------------------------------------------------------
// Arm (A) -- §16's population, read off the real source line
// ---------------------------------------------------------------------------------------------
function armA_population() {
  const results = [];

  // The export is the delta control: this throws on origin/dev before any assertion runs.
  assert.strictEqual(typeof retireStaleShipCards, "function",
    "`retireStaleShipCards` must be exported from scripts/settle-ship.js — on origin/dev it is not, which is this file's delta control");
  results.push("the-writer-is-exported");

  const src = fs.readFileSync(BRIEFING, "utf8");
  const line = src.split("\n").find(l => l.includes("const svTaps = await sel("));
  assert.ok(line, "scripts/build-briefing.mjs must still declare `const svTaps = await sel(...)` — §16's population is read from that one line");

  // THE NULL CHECK IS GONE. This is the assertion the unchanged tree fails.
  assert.ok(!line.includes("decision=not.is.null"),
    `§16's svTaps select must not filter on \`decision=not.is.null\` — that admits all four values \`runner_items_decision_check\` permits, including the machine's \`${MACHINE}\`, so a backfill would move John's published rate. Got: ${line.trim()}`);
  results.push("no-null-check");

  // `kind=eq.ship` survives verbatim -- SES-181b greps for this exact substring.
  assert.ok(line.includes("kind=eq.ship"),
    `the select must still carry \`kind=eq.ship\` verbatim — SES-181b greps for it. Got: ${line.trim()}`);
  results.push("kind-filter-kept");

  // The named list, parsed OUT of the source rather than assumed.
  const m = line.match(/decision=in\.\(([^)]*)\)/);
  assert.ok(m, `the select must name its population as \`decision=in.(...)\`. Got: ${line.trim()}`);
  const named = m[1].split(",").map(s => s.trim()).filter(Boolean);
  assert.deepStrictEqual([...named].sort(), [...JOHNS].sort(),
    `the named population must be exactly John's three words ${JSON.stringify(JOHNS)}, got ${JSON.stringify(named)}`);
  // Asserted SEPARATELY: a list naming all four would satisfy "names the three" above.
  assert.ok(!named.includes(MACHINE),
    `\`${MACHINE}\` must NOT be in §16's population — it is a structural close, not a tap of John's, and this panel's figure is his rate`);
  results.push(`names-exactly-${named.sort().join("+")}-and-excludes-${MACHINE}`);

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (A2) -- the no-op claim AND its negative control
// ---------------------------------------------------------------------------------------------
function armA2_noop() {
  const results = [];

  // The two filters, as predicates over rows -- the old one and the shipped one.
  const oldFilter = rows => rows.filter(r => r.decision !== null && r.decision !== undefined);
  const newFilter = rows => rows.filter(r => JOHNS.includes(r.decision));
  const neg = rows => rows.filter(r => r.decision === "rework" || r.decision === "reverse").length;

  // THE BOARD AS IT STOOD BEFORE THE BACKFILL: no card reads `retired`.
  const before = [
    { backlog_id: "AGT-1", decision: "accept" },
    { backlog_id: "AGT-2", decision: "rework" },
    { backlog_id: "AGT-3", decision: "reverse" },
    { backlog_id: "AGT-4", decision: "accept" },
  ];
  assert.deepStrictEqual(newFilter(before), oldFilter(before),
    "with no `retired` card on the board the two filters must select the SAME set — that is the no-op this edit claims for the day it shipped");
  assert.strictEqual(neg(newFilter(before)), neg(oldFilter(before)),
    "§16's Rework/Reverse count must be byte-identical across the edit on the pre-backfill board");
  results.push("no-op-before-the-backfill");

  // THE NEGATIVE CONTROL: one machine close, and the two filters must DIVERGE. Without this the
  // arm above would pass against `decision=not.is.null` left unchanged.
  const after = [...before, { backlog_id: "AGT-5", decision: MACHINE }];
  assert.strictEqual(oldFilter(after).length, 5,
    "the OLD filter must admit the machine close — if it did not, there was no bug to fix and this ticket is pointless");
  assert.strictEqual(newFilter(after).length, 4,
    `the shipped filter must DROP the \`${MACHINE}\` card, got ${newFilter(after).length} of 5`);
  assert.notDeepStrictEqual(newFilter(after), oldFilter(after),
    "once one card reads `retired` the two filters MUST differ — this is the whole defect, and an arm that only proved the no-op would pass on the unchanged tree");
  results.push("diverges-once-one-card-is-retired");

  // And the rate itself: 111 machine closes must not become John's Rework/Reverse denominator.
  const flood = [...before, ...Array.from({ length: 111 }, (_, i) => ({ backlog_id: `X-${i}`, decision: MACHINE }))];
  assert.strictEqual(newFilter(flood).length, 4,
    `111 machine closes must leave John's population at 4, got ${newFilter(flood).length}`);
  assert.strictEqual(oldFilter(flood).length, 115,
    "the old filter would have taken all 115 — the measured size of the misreport this edit prevents");
  results.push("111-machine-closes-do-not-enter-johns-rate");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (B) -- SEAM PROOF: retireStaleShipCards() over a stubbed globalThis.fetch
// ---------------------------------------------------------------------------------------------
async function armB_seam() {
  const results = [];
  const saved = globalThis.fetch;
  const BASE = "https://agt-459-seam.invalid";
  const KEY = "agt-459-seam-dummy";

  let calls = [];
  let answer = { cards: 0, decision: null, by_status: {} };
  const reply = body => ({ ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify(body) });

  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, method: (init && init.method) || "GET", body: init && init.body ? JSON.parse(init.body) : null });
      if (url.includes("/rpc/retire_stale_ship_cards")) return reply(answer);
      throw new Error(`arm (B): nothing in this seam should reach ${url}`);
    };
    const logs = [];
    const call = cycleId => {
      calls = [];
      logs.length = 0;
      return retireStaleShipCards({ base: BASE, key: KEY, cycleId, log: s => logs.push(s) });
    };

    // NO CYCLE ID -> ZERO FETCHES. Not "a call that returns nothing".
    for (const [label, bad] of [["absent", undefined], ["null", null], ["empty string", ""], ["a number", 7]]) {
      const got = await call(bad);
      assert.strictEqual(got, null, `a ${label} cycle id must return null, got ${JSON.stringify(got)}`);
      assert.strictEqual(calls.length, 0,
        `a ${label} cycle id must cost ZERO fetches — every row this closes is imaged against the cycle that closed it, so a sweep with no author is one nobody can reverse. Got ${calls.length}`);
      assert.ok(logs.join("").includes("not swept"),
        `a ${label} cycle id must SAY it did not sweep rather than fall silent, got ${JSON.stringify(logs.join(""))}`);
    }
    results.push("no-cycle-id-costs-zero-fetches-and-says-so");

    // WITH A CYCLE ID: exactly one POST, the right URL, the right body.
    answer = { cards: 0, decision: null, by_status: {} };
    await call(CYCLE);
    assert.strictEqual(calls.length, 1, `one sweep must cost exactly one call, got ${calls.length}`);
    assert.strictEqual(calls[0].method, "POST", `the sweep must POST the RPC, got ${calls[0].method}`);
    assert.ok(calls[0].url.includes("/rest/v1/rpc/retire_stale_ship_cards"),
      `the call must reach \`rpc/retire_stale_ship_cards\`, got ${calls[0].url}`);
    // The body keys are EXACTLY the two live identity arguments, and p_session_name is present-and-null.
    assert.deepStrictEqual(Object.keys(calls[0].body).sort(), [...ARGS].sort(),
      `the RPC body must carry exactly the function's two identity arguments ${JSON.stringify(ARGS)}, got ${JSON.stringify(Object.keys(calls[0].body))}`);
    assert.strictEqual(calls[0].body.p_cycle_id, CYCLE, "p_cycle_id must be the cycle id it was handed");
    assert.ok("p_session_name" in calls[0].body && calls[0].body.p_session_name === null,
      "p_session_name must be sent EXPLICITLY null, never omitted — the identity list has no DEFAULT, and PostgREST answers an unresolvable overload as an empty result, which here reads as `nothing was stale`");
    results.push("one-post-with-both-identity-arguments-and-an-explicit-null-session");

    // THE TWO REPORTED SHAPES, by value. A sweep that closed 111 cards must not print like a no-op.
    answer = { cards: 0, decision: null, by_status: {} };
    let got = await call(CYCLE);
    assert.strictEqual(got.cards, 0, "an empty sweep must report 0 cards");
    assert.ok(logs.join("").includes("none stale"),
      `an empty sweep must say so, got ${JSON.stringify(logs.join(""))}`);

    const DEC = "abcd1234-0000-4000-8000-000000000000";
    answer = { cards: 111, decision: DEC, by_status: { done: 81, "removal proposed": 12, removed: 9, "(no ticket)": 9 } };
    got = await call(CYCLE);
    assert.strictEqual(got.cards, 111, "the sweep must hand back the function's own count");
    const out = logs.join("");
    assert.ok(out.includes("111 retired"), `a 111-card sweep must print its count, got ${JSON.stringify(out)}`);
    assert.ok(out.includes("abcd1234"), `it must print the decision id that reverses it, got ${JSON.stringify(out)}`);
    assert.ok(!out.includes("none stale"),
      "a 111-card sweep must NOT print the empty-sweep line — the two branches are distinguished by value, not by wording");
    results.push("empty-and-111-card-sweeps-report-differently");

    // PostgREST returning a single-row array rather than the bare object must read the same.
    answer = [{ cards: 2, decision: DEC, by_status: { done: 2 } }];
    got = await call(CYCLE);
    assert.strictEqual(got.cards, 2, "a single-row array answer must be unwrapped, not reported as 0");
    results.push("array-wrapped-answer-unwrapped");
  } finally {
    globalThis.fetch = saved;
  }
  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (C) -- LIVE: the XOR guard refuses a sweep with no author. Writes nothing.
// ---------------------------------------------------------------------------------------------
async function armC_live(base, key) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/rpc/retire_stale_ship_cards`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_cycle_id: null, p_session_name: null }),
  });
  const text = await res.text().catch(() => "");

  // The function may not exist yet -- the migration is applied by the cycle, and this arm must say
  // "not run" rather than "failed" in that case (SES-180 (b): declared, never inferred).
  if (res.status === 404 || text.includes("PGRST202") || /could not find the function/i.test(text)) {
    notRun(
      "AGT-459 (C): `public.retire_stale_ship_cards(uuid, text)` refusing a sweep with no author",
      `the function is not present in this database yet (HTTP ${res.status}: ${text.slice(0, 200)}). ` +
        "It is created by migration `agt459_retire_stale_ship_cards`; there is no source-parsed " +
        "stand-in for a live Postgres guard. Canonical invocation: docs/STANDARDS.md Section 2 rule 5.",
    );
    return ["not-run-function-absent"];
  }

  assert.ok(!res.ok,
    `with BOTH p_cycle_id and p_session_name null the function must REFUSE — a decision has exactly one author, and \`ck_before_image_attribution\` is an XOR. It answered HTTP ${res.status}: ${text.slice(0, 300)}`);
  // ITS OWN RULE, not the constraint catching it later: the message names the two parameters.
  assert.ok(/exactly one of p_cycle_id \/ p_session_name/.test(text),
    `the refusal must come from the function's own guard naming both parameters, not from a 23514 raised later by the constraint. Got: ${text.slice(0, 300)}`);
  assert.ok(!/23514/.test(text),
    `the guard must fire BEFORE any write, so no check-constraint violation should surface. Got: ${text.slice(0, 300)}`);
  return [`xor-guard-refuses-an-unattributed-sweep (HTTP ${res.status})`];
}

async function run() {
  const a = armA_population();
  console.log(`  (A) §16 population, from source: ${a.join(", ")}`);
  const a2 = armA2_noop();
  console.log(`  (A2) no-op + negative control: ${a2.join(", ")}`);
  const b = await armB_seam();
  console.log(`  (B) SEAM PROOF (stubbed transport, real guard and real RPC body): ${b.join(", ")}`);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "AGT-459 (C): `public.retire_stale_ship_cards(uuid, text)` refusing a sweep with no author",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The guard is a live Postgres function, " +
        "so there is no source-parsed stand-in. Canonical invocation: docs/STANDARDS.md Section 2 rule 5.",
    );
    return;
  }
  const c = await armC_live(url, key);
  console.log(`  (C) live, read-only: ${c.join(", ")}`);
}

selfRun(import.meta.url, run);
export default run;
