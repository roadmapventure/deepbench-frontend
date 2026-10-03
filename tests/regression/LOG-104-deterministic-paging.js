// DeepBench v7.0.306 | tests/regression/LOG-104-deterministic-paging.js | LOG-104
// FEATURE: LOG-104 — Category M (cross-reference consistency), persisted per SES-009a.
//
// THE RULE THIS LOCKS IN: a paged Supabase read (`.range()` in a loop) must sort on a key that is
// UNIQUE, or the page window is undefined. `ai_activity_log.created_at` is not unique — measured
// live 2026-08-29, 320 of 34,812 rows share a created_at with another row — so ordering by it
// alone lets Postgres order a tie group differently between two `.range()` calls. A row straddling
// a page boundary can then be served twice, or never. Silently: no error, no warning, and the
// figure on the screen is simply short.
//
// THE TWO SITES, and they failed differently, which is why the matcher checks every `.range()`
// rather than two hardcoded line numbers:
//   - src/hooks/useAIActivity.js  hydrateFromSupabase() ordered by created_at DESC only.
//   - src/hooks/useAgents.js      useAgentActivitySummary()'s fetchAll() had NO .order() AT ALL,
//                                 across ~17 pages, feeding the whole CHI Agents drawer.
//
// WHY THE OBVIOUS TEST IS NOT THE ONE WRITTEN HERE, stated so the next editor does not "improve"
// this into theatre: the tempting test is "page the live table twice and diff the two row sets."
// That would be vacuous. The reordering this ticket prevents is PERMITTED, not GUARANTEED —
// LOG-104's own text records that on the day it was QA'd "every agent's rows matched SQL exactly …
// but that is the planner happening to be stable, not a guarantee." A green from that test says
// the planner was stable this minute, never that the window is defined. So the guard asserts the
// two things that ARE decidable: the code pairs every paged read with a unique tiebreak, and the
// key it now sorts on is genuinely unique in the live table.
//
// Asserts:
//   1. Every `.range(` call in src/hooks/useAIActivity.js sits in a query chain that also orders
//      by `id`. Fails verbatim on the pre-change source (L1130).
//   2. Same for src/hooks/useAgents.js. Fails verbatim on the pre-change source (L183).
//   3. NEGATIVE CONTROL, pure: the SAME matcher applied to both RETIRED forms — held below as
//      fixtures — must report them BROKEN. Without this, assertions 1–2 would also pass against a
//      matcher that accepted anything, and the guard would prove a property rather than a change.
//
// THERE IS DELIBERATELY NO CREDENTIALED HALF, and that is a decision rather than an omission. The
// premise this fix rests on — created_at is non-unique, id is not — IS measured, but by the cycle
// that shipped it (v7.0.306: 320 of 34,812 rows share a created_at; `id` is an integer primary
// key), recorded in docs/kickoffs/v7.0.306-LOG-104-deterministic-paging.md and on the ship card.
// A first draft of this file asserted it here too and had to declare itself NOT RUN on every
// invocation: PostgREST cannot express `group by … having count(*) > 1` and this repo exposes no
// exec_sql RPC to reach it through. A half that can never run prints a gap notice on every suite
// run forever, and noise is how a real signal stops being read (self-run.js's own rule, stated at
// its announce-once latch). The uniqueness of a primary key is not the sort of fact a regression
// suite needs to re-derive nightly; the code pairing every paged read with it is.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const TARGETS = ["src/hooks/useAIActivity.js", "src/hooks/useAgents.js"];

// Strip comments so the explanatory comment next to each fix — which names `.order('id')` — can
// never be mistaken for the code doing it. Same technique as LOG-36 / LOG-70 / LOG-112.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

// A Supabase query chain always begins at `.from(`. For a given `.range(` we take the text back to
// the nearest preceding `.from(` — that is exactly this query's chain and nothing else's.
function chainFor(code, rangeIdx) {
  const start = code.lastIndexOf(".from(", rangeIdx);
  return start === -1 ? code.slice(0, rangeIdx) : code.slice(start, rangeIdx);
}

const ORDERS_BY_ID = /\.order\(\s*['"]id['"]/;

// Returns the 0-based indexes of every `.range(` whose chain lacks a unique tiebreak.
// PURE, and exported in spirit for assertion 3 — the negative control runs the same function.
function unguardedRangeCalls(code) {
  const bad = [];
  let i = code.indexOf(".range(");
  while (i !== -1) {
    if (!ORDERS_BY_ID.test(chainFor(code, i))) bad.push(i);
    i = code.indexOf(".range(", i + 1);
  }
  return bad;
}

// ---- The two retired forms, verbatim in shape. Assertion 3 runs the matcher over these.
const RETIRED_CREATED_AT_ONLY = `
  let q = supabase
    .from('ai_activity_log')
    .select('id,created_at')
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
`;
const RETIRED_NO_ORDER_AT_ALL = `
  const { data, error } = await supabase
    .from('ai_activity_log')
    .select('id,agent_id,created_at')
    .eq('tenant_id', tenantId)
    .range(from, from + PAGE_SIZE - 1);
`;

async function run() {
  // ---- Assertions 1 and 2: every paged read carries a unique tiebreak.
  for (const target of TARGETS) {
    const full = path.join(ROOT, target);
    assert.ok(fs.existsSync(full), `${target} not found — has the hook moved?`);

    const code = stripComments(fs.readFileSync(full, "utf8"));
    const rangeCount = (code.match(/\.range\(/g) || []).length;
    assert.ok(
      rangeCount > 0,
      `${target} contains no .range() call at all. This guard exists to constrain paged reads in ` +
      "this file; if the paging moved elsewhere, retarget the test rather than deleting it."
    );

    const bad = unguardedRangeCalls(code);
    assert.strictEqual(
      bad.length, 0,
      `${target} pages with .range() on a sort key that is not unique (${bad.length} of ` +
      `${rangeCount} call site(s)). created_at is NOT unique in ai_activity_log, so the page ` +
      "window is undefined and rows can be silently skipped or duplicated across a page " +
      "boundary. Add .order('id', { ascending: false }) to the chain (LOG-104)."
    );
  }

  // ---- Assertion 3: NEGATIVE CONTROL. The matcher must reject what actually shipped before.
  assert.strictEqual(
    unguardedRangeCalls(RETIRED_CREATED_AT_ONLY).length, 1,
    "NEGATIVE CONTROL FAILED: the retired created_at-only chain — the exact form that shipped in " +
    "useAIActivity.js before v7.0.306 — was accepted by the matcher. Assertions 1–2 therefore " +
    "prove nothing about the change. Fix the matcher before trusting them."
  );
  assert.strictEqual(
    unguardedRangeCalls(RETIRED_NO_ORDER_AT_ALL).length, 1,
    "NEGATIVE CONTROL FAILED: the retired no-order-at-all chain — the form that shipped in " +
    "useAgents.js before v7.0.306, and the worse of the two — was accepted by the matcher."
  );

  // ---- Assertion 4: the tiebreak is the PRIMARY KEY, not merely some second column. A chain
  // ordered by (created_at, model) would satisfy a laxer matcher and still be non-unique, which is
  // this bug wearing one more column. Pinned here so the matcher's own key cannot be widened
  // without a test change.
  assert.ok(
    ORDERS_BY_ID.test(".order('id', { ascending: false })"),
    "the matcher no longer recognises the shipped tiebreak form"
  );
  assert.ok(
    !ORDERS_BY_ID.test(".order('model', { ascending: false })"),
    "MATCHER TOO LAX: it accepts a non-unique column as the tiebreak, so assertions 1–2 would " +
    "pass on a chain that is still ambiguous. The tiebreak must be the unique primary key."
  );
}

selfRun(import.meta.url, run);
export default run;
