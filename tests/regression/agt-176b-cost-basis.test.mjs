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
// (E) THE NOT-NULL BOUNDARY, recorded so it cannot be silently "fixed" into a false 0.
//     `runner_cycles.api_cost_dev_usd` is NOT NULL (HTTP 400 / 23502 under `Prefer: tx=rollback`,
//     proven 2026-09-27), so the `unpriced-rows` answer cannot be stored in that column. settle-ship
//     must therefore write NO figure on that branch rather than writing 0. Asserted at the source: the
//     cycle patch adds `api_cost_dev_usd` only when the resolved dollars are non-null.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { resolveCycleCost, SUBSCRIPTION_LANES } from "../../lib/activity-log.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SETTLE_REL = "scripts/settle-ship.js";

// Only the two keys the ledger publishes. `billable`/`priced` are reported separately so a wrong
// count cannot hide behind a right dollar figure.
const money = r => ({ usd: r.usd, basis: r.basis });
const row = (call_source, cost_usd) => ({ call_source, cost_usd });

function run() {
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

  // ---- (E) the NOT NULL boundary: no figure, never a false 0 ------------------------------------
  assert.ok(/if\s*\(cost\.usd\s*!==\s*null\)\s*cyclePatch\.api_cost_dev_usd\s*=\s*cost\.usd;/.test(body),
    `${SETTLE_REL}: \`api_cost_dev_usd\` is NOT NULL (400/23502), so the patch must add it ONLY when the dollars are non-null — writing 0 on \`unpriced-rows\` is the phantom-dollar defect this ticket removes`);
  assert.ok(/cost_basis: \$\{cost\.basis\}/.test(settle),
    `${SETTLE_REL}: the basis must be recorded in \`notes\`, which is where the absence lives when the column cannot hold NULL`);

  console.log(`[AGT-176b] resolveCycleCost: 4 branches by value · the pair asserted together (measured 0 vs unpriced NULL) · unknown lane → NULL · ${SETTLE_REL} imports the one sum · api_cost_dev_usd written only when non-null · subscription lanes: ${[...SUBSCRIPTION_LANES].join(", ")}`);
  return ["four-branches", "the-pair", "unknown-lane-control", "one-sum-imported", "not-null-boundary"];
}

selfRun(import.meta.url, run);
export default run;
