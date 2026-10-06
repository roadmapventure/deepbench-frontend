// DeepBench v7.0.782 | tests/regression/agt-176b-cost-basis.test.mjs | AGT-304 slice 5 -- the three AGT-204 qa figures are pinned BY ID, not by "every cycle with qa cost today".
// DeepBench v7.0.626 | tests/regression/agt-176b-cost-basis.test.mjs | AGT-176 (part c) --
// THE CLOSE-OUT RESOLVES ITS OWN COST, AND THIS FILE IS WHAT STOPS IT RESOLVING WRONG.
//
// THE DEFECT, measured 2026-09-27 on this tree rather than recalled. `runner_cycles.api_cost_dev_usd`
// had NO deterministic writer: `grep -ln cost_usd scripts/*.js` returned agent-log.js and verifier.js
// only, and scripts/settle-ship.js -- which AGT-176's own text said wrote the cost -- did not touch
// it. The single writer was docs/runbooks/runner-cycle.md:4069-4070, a MODEL typing the figure at the
// end of a long run under an instruction reading "$0 is the normal value". The eight newest cycle rows
// all read 0, so a cycle that measured nothing and a cycle that cost nothing published the same 0.
//
// THE BUG WAS LATENT, NOT LIVE, and this file is deliberately built so that stays true. `ai_activity_log`
// has never carried a `call_source = 'executor'` row (0 rows, any date) and 955 of the newest 1,000
// rows carry `call_source` NULL. So a POSITIVE `executor` filter would match nothing platform-wide: it
// would ship green, sum zero and keep publishing 0 forever. Arm (C) is the assertion that catches that
// implementation -- an unknown lane must land on NULL, not on 0.
//
// WHAT IS PINNED, and why each arm can actually go red:
//
// (A) THE FOUR BRANCHES BY VALUE, on hand-built row arrays. Pure: no network, no disk, no env.
//     `no-calls` and `subscription-lane` are the two HONEST zeros (nothing ran / the lane bills
//     nothing by construction); `measured` is a real sum that MAY legitimately be 0; `unpriced-rows`
//     is the absence. Each arm names the basis as well as the dollars, because two branches return
//     the same 0 and only the basis tells them apart.
//
// (B) THE PAIR THAT IS THE WHOLE TICKET, asserted SIDE BY SIDE in one arm on purpose.
//     `[{ui, 0}]` -> `{usd: 0, basis: 'measured'}` and `[{ui, null}]` -> `{usd: null, basis:
//     'unpriced-rows'}`. A resolver that zeroes everything passes the first and fails the second; one
//     that NULLs everything fails the first and passes the second. NEITHER assertion is sufficient
//     alone, which is exactly why they are not in separate arms: a future edit that deletes one of
//     them deletes the discrimination.
//
// (C) THE NEGATIVE CONTROL: an UNKNOWN lane. `[{call_source: null, cost_usd: null}]` must read `usd`
//     null, never 0 -- the aggregate takes its weakest contributing tier, so an unrecognised lane
//     fails to absence. This is the live shape (955 of the newest 1,000 rows), not a hypothetical.
//
// (D) THE SOURCE, by text. scripts/settle-ship.js must IMPORT resolveCycleCost and must contain no
//     second sum of `cost_usd` of its own -- a local `reduce`/`+=` over the column would be the
//     duplicated-arithmetic defect the shared export exists to remove (pattern:14/:15), and it would
//     pass every value arm above while drifting from them forever.
//
// (E) THE WRITE IS UNCONDITIONAL, so the absence reaches the column instead of stopping at `notes`.
//     INVERTED AT AGT-204 (v7.0.637) AND THAT INVERSION IS THE TICKET. Through v7.0.626-v7.0.636 this
//     arm asserted the OPPOSITE -- `api_cost_dev_usd` was NOT NULL (HTTP 400 / 23502), so settle-ship
//     could only skip the cell and record `cost_basis: unpriced-rows` in `notes`, leaving the default 0
//     in the one place a reader looks. AGT-204 dropped NOT NULL on both cost columns, so the guard is
//     now the defect: this arm asserts the bare write is PRESENT and the old `if (cost.usd !== null)`
//     guard is GONE from the comment-stripped body. Both halves are needed -- a file that deleted the
//     write entirely would pass an absence-only check.
//
// (F) LIVE (Supabase credentials, else NOT RUN): the migration landed and took nothing with it.
//     READ-ONLY BY CONSTRUCTION, and that is a correction to this ticket's own kickoff. §6 proposed
//     proving the NULL lands with a `PATCH {api_cost_dev_usd: null}` under `Prefer: tx=rollback`, the
//     same mechanism AGT-204's ticket text and the v7.0.626 headers call "proven without writing
//     anything." MEASURED THIS SESSION, IT IS NOT: this project's PostgREST does not enable
//     `db-tx-end = rollback-allowed`, so the header is silently IGNORED and the PATCH COMMITS. It went
//     unnoticed for eleven versions because every earlier probe was rejected by the very NOT NULL
//     constraint it was probing -- the error aborted the transaction, so nothing persisted and the
//     ignored header looked honoured. The moment the column went nullable the same "safe" probe wrote
//     to a live cycle row. A permanent suite test must never carry that (pattern:76), so this arm
//     proves nullability from the catalog instead: PostgREST's OpenAPI document lists every NOT NULL
//     column of a table in `definitions.runner_cycles.required`. Neither cost column may appear there;
//     `est_subscription_cost_usd`, still NOT NULL, MUST -- it is the in-arm positive control that stops
//     this passing vacuously if the spec ever stops reporting requireds at all. `default` must still
//     read 0 on both: AGT-204 changed nullability and nothing else.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { resolveCycleCost, SUBSCRIPTION_LANES } from "../../lib/activity-log.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SETTLE_REL = "scripts/settle-ship.js";

// --- (F)'s read-only live plumbing. Every call here is a GET. Nothing in this file writes. ---------
function hasCreds() { return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY); }
const CRED_HINT = "export SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets by name) to run the live arm";

function authHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function supabaseRows(query) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${query}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`Supabase read failed: HTTP ${r.status} ${await r.text().catch(() => "")}`);
  return r.json();
}

// The count comes from PostgREST's `content-range` header, not from pulling the rows.
async function supabaseCount(query) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${query}`, {
    headers: { ...authHeaders(), Prefer: "count=exact", Range: "0-0" },
  });
  if (!r.ok) throw new Error(`Supabase count failed: HTTP ${r.status} ${await r.text().catch(() => "")}`);
  const total = Number(String(r.headers.get("content-range") || "").split("/")[1]);
  if (!Number.isFinite(total)) throw new Error(`Supabase count: unreadable content-range ${r.headers.get("content-range")}`);
  return total;
}

// PostgREST's OpenAPI document is the only column-metadata reader reachable on this project:
// `information_schema` is not an exposed schema and there is no raw-SQL RPC (`public.exec_readonly_sql`
// answers PGRST202 — probed again at this ship, as SES-378c/AGT-138 found before it).
async function openApiDefinition(table) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
    headers: { ...authHeaders(), Accept: "application/openapi+json" },
  });
  if (!r.ok) throw new Error(`OpenAPI read failed: HTTP ${r.status}`);
  const spec = await r.json();
  const def = spec?.definitions?.[table];
  if (!def) throw new Error(`OpenAPI document carries no definition for ${table} — the arm cannot judge nullability`);
  return def;
}

// Only the two keys the ledger publishes. `billable`/`priced` are reported separately so a wrong
// count cannot hide behind a right dollar figure.
const money = r => ({ usd: r.usd, basis: r.basis });
const row = (call_source, cost_usd) => ({ call_source, cost_usd });

async function run() {
  // ---- (A) the four branches, by value ------------------------------------------------------
  assert.deepStrictEqual(money(resolveCycleCost([])), { usd: 0, basis: "no-calls" },
    "no rows at all is a measured zero: nothing ran, so nothing cost anything");
  assert.deepStrictEqual(
    money(resolveCycleCost([row("session", null), row("session", null)])),
    { usd: 0, basis: "subscription-lane" },
    "rows that are ALL on a subscription lane are a measured zero — that lane bills nothing by construction");
  assert.deepStrictEqual(
    money(resolveCycleCost([row("ui", 0.03), row("ui", null)])),
    { usd: 0.03, basis: "measured" },
    "one priced billable row beside an unpriced one sums the priced one and reads `measured`");
  assert.deepStrictEqual(money(resolveCycleCost([row("ui", null)])), { usd: null, basis: "unpriced-rows" },
    "a billable row carrying no cost is an ABSENCE — NULL, never 0");

  // The counts, so a resolver cannot get the dollars right off the wrong set.
  const mixed = resolveCycleCost([row("ui", 0.03), row("ui", null), row("session", 9.99)]);
  assert.strictEqual(mixed.billable, 2, "the two `ui` rows are billable; the `session` row is not");
  assert.strictEqual(mixed.priced, 1, "exactly one of the billable rows carried a cost");
  assert.strictEqual(mixed.usd, 0.03,
    "the subscription row's 9.99 must NOT enter the sum — a subscription seat bills nothing however it is priced");

  // ---- (B) THE PAIR THAT IS THE WHOLE TICKET, asserted together --------------------------------
  const pricedZero = resolveCycleCost([row("ui", 0)]);
  const unpriced = resolveCycleCost([row("ui", null)]);
  assert.deepStrictEqual(money(pricedZero), { usd: 0, basis: "measured" },
    "a priced ZERO stays 0 and reads `measured` — an explicit 0 is a fact, and NULLing it would lose a real measurement");
  assert.deepStrictEqual(money(unpriced), { usd: null, basis: "unpriced-rows" },
    "an UNPRICED row goes NULL — asserted beside the priced zero above, so a resolver that zeroes everything or NULLs everything fails one of these two");
  assert.notStrictEqual(pricedZero.usd, unpriced.usd,
    "the two answers must not be the same value: `0` and `null` are the distinction this ticket exists to create");
  assert.notStrictEqual(pricedZero.basis, unpriced.basis,
    "...and they must not share a basis either — the basis is what a reader uses to tell them apart");

  // ---- (C) the negative control: an unknown lane fails to ABSENCE ------------------------------
  const unknownLane = resolveCycleCost([row(null, null)]);
  assert.strictEqual(unknownLane.usd, null,
    "an unknown lane (`call_source` NULL — 955 of the newest 1,000 rows) must read NULL, never 0");
  assert.strictEqual(unknownLane.basis, "unpriced-rows",
    "an unknown lane is BILLABLE-until-proven-otherwise: it must not be sorted into `subscription-lane`");
  assert.strictEqual(unknownLane.billable, 1,
    "a NULL lane counts as billable — that is what makes it fall to NULL instead of to a measured 0");
  assert.strictEqual(SUBSCRIPTION_LANES.has(null), false,
    "NULL is not a subscription lane; if it ever becomes one, every unknown row silently becomes a measured $0");
  assert.strictEqual(SUBSCRIPTION_LANES.has("executor"), false,
    "`executor` is the BILLABLE lane — putting it in this set would zero the only dollars the ledger exists to carry");
  // An unreadable figure is an absence too, in the same direction.
  assert.strictEqual(resolveCycleCost([row("ui", "not-a-number")]).basis, "unpriced-rows",
    "a cost that is present but not a finite number is unreadable, and an unreadable measurement is an absence");

  // ---- (D) the source: one sum, imported, not a second copy -------------------------------------
  const settle = fs.readFileSync(path.join(ROOT, SETTLE_REL), "utf8");
  assert.ok(/import\s*\{[^}]*\bresolveCycleCost\b[^}]*\}\s*from\s*["']\.\.\/lib\/activity-log\.js["']/.test(settle),
    `${SETTLE_REL} must IMPORT resolveCycleCost from lib/activity-log.js — it read 0 mentions of cost on the unchanged tree`);
  const body = settle.split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  assert.ok(!/cost_usd\s*(\+=|\)\s*=>\s*s\s*\+)/.test(body) && !/reduce\([^)]*cost_usd/.test(body),
    `${SETTLE_REL} must contain no second sum of cost_usd — the arithmetic lives in resolveCycleCost() and nowhere else`);

  // ---- (E) the write is UNCONDITIONAL: the NULL reaches the column ------------------------------
  // Both halves, because either alone passes on a file that is wrong in the other direction: a file
  // that dropped the write altogether satisfies the absence, and a file that kept the guard AND added
  // a bare write satisfies the presence. AGT-204 inverted this arm; see the header.
  assert.ok(/cyclePatch\.api_cost_dev_usd\s*=\s*cost\.usd;/.test(body),
    `${SETTLE_REL}: the cycle patch must set \`api_cost_dev_usd = cost.usd\` UNCONDITIONALLY — since AGT-204 the column is nullable, so the \`unpriced-rows\` NULL belongs in the cell, not only in \`notes\``);
  assert.ok(!/if\s*\(cost\.usd\s*!==\s*null\)/.test(body),
    `${SETTLE_REL}: the \`if (cost.usd !== null)\` guard must be GONE — it was correct only while the column was NOT NULL, and it is now the thing that leaves a default 0 standing where nothing was measured`);
  assert.ok(/cost_basis: \$\{cost\.basis\}/.test(settle),
    `${SETTLE_REL}: the basis must still be recorded in \`notes\` — the cell says THAT the cost is unknown, the basis says WHICH branch decided it, and two branches can produce the same cell`);

  // ---- (F) LIVE: the migration landed, read-only from the catalog -------------------------------
  if (!hasCreds()) {
    notRun("AGT-176b (F) runner_cycles cost columns are nullable and their defaults are untouched", CRED_HINT);
    console.log("  (F) NOT RUN — no Supabase credentials in this environment");
  } else {
    const def = await openApiDefinition("runner_cycles");
    const required = Array.isArray(def.required) ? def.required : [];
    assert.ok(required.includes("est_subscription_cost_usd"),
      "POSITIVE CONTROL: `est_subscription_cost_usd` is still NOT NULL, so it must appear in the OpenAPI `required` list — if it does not, this document is not reporting NOT NULL at all and the two assertions below would pass vacuously");
    assert.ok(!required.includes("api_cost_dev_usd"),
      "`api_cost_dev_usd` must NOT be NOT NULL — AGT-204's migration drops it, and while it stands the `unpriced-rows` branch cannot store its absence");
    assert.ok(!required.includes("api_cost_qa_usd"),
      "`api_cost_qa_usd` must NOT be NOT NULL either — both cost columns went nullable in the same migration");
    assert.strictEqual(def.properties?.api_cost_dev_usd?.default, 0,
      "the column DEFAULT must still be 0 — AGT-204 changed nullability and nothing else; a dropped default would make every unwritten cell NULL and destroy the distinction");
    assert.strictEqual(def.properties?.api_cost_qa_usd?.default, 0,
      "the `qa` column default must still be 0 for the same reason");

    // Nothing was backfilled. The three real `qa` figures are the discriminating half: a migration that
    // rewrote or defaulted the column away loses them, and no count assertion would notice.
    const qa = await supabaseRows("runner_cycles?select=id,api_cost_qa_usd&id=in.(56357816-51f0-43d6-9f17-1059e74d7a76,04a3ac3b-3d09-4f0b-8fb1-abcaf5866ebb,611599f8-364d-4bec-b4f7-d7a0c6b667e3)&order=api_cost_qa_usd.asc");
    assert.deepStrictEqual(qa.map(r => Number(r.api_cost_qa_usd)), [1.2537, 2.2656, 3.5144],
      `the three measured \`api_cost_qa_usd\` figures must read back byte-identical — AGT-204 backfills NOTHING, so these survive the migration unchanged (pinned BY ID, AGT-304 slice 5: later cycles measure their own qa cost); got ${JSON.stringify(qa)}`);
    const total = await supabaseCount("runner_cycles?select=id");
    assert.ok(total >= 729, `cycle history never shrinks: ${total} rows, and 729 were present when AGT-204 shipped`);
    console.log(`      (F) both cost columns nullable, defaults still 0, 3 measured qa figures intact, ${total} cycle rows`);
  }

  console.log(`[AGT-176b] resolveCycleCost: 4 branches by value · the pair asserted together (measured 0 vs unpriced NULL) · unknown lane → NULL · ${SETTLE_REL} imports the one sum · api_cost_dev_usd written UNCONDITIONALLY (AGT-204) · subscription lanes: ${[...SUBSCRIPTION_LANES].join(", ")}`);
  return ["four-branches", "the-pair", "unknown-lane-control", "one-sum-imported", "unconditional-null-write", "live-columns-nullable"];
}

selfRun(import.meta.url, run);
export default run;
