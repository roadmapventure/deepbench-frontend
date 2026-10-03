// DeepBench v7.0.371 | tests/regression/ses-282-typed-cycle-reference.test.mjs | SES-282 —
// runner_cycles gains a TYPED link to the ticket it worked, and ticket_cost joins on THAT rather
// than on the free-text item_id label. Guards both halves plus the exporter's path default.
//
// FEATURE: SES-282
//
// Why the typed column rather than an FK on item_id, restated so a later cycle does not "simplify"
// it: measured over all 365 cycles, 130 carry a null item_id and 52 carry a value that is not a
// backlog_id — and those 52 are not malformed, they are prose ("wall: day cap"), runner_items card
// UUIDs, directive refs ("DIR-60d35b49") and rule ids ("B31"). An FK on item_id would force every
// one of them to be nulled or rewritten, destroying the record of what those cycles did.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

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
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function run(ctx = {}) {
  const results = [];

  // ---------------------------------------------------------------- doc arm (always runs)
  const src = fs.readFileSync(path.join(REPO, "scripts/export-governance-snapshot.js"), "utf8");

  // The exporter must default its repo root to ITS OWN location, never the caller's cwd. Found
  // live 2026-09-01: invoked by absolute path from C:\Projects it wrote the snapshot OUTSIDE the
  // repo and reported success.
  assert.ok(
    /SCRIPT_REPO_ROOT\s*=\s*path\.resolve\(\s*path\.dirname\(\s*fileURLToPath\(\s*import\.meta\.url/.test(src),
    "export-governance-snapshot.js must derive its repo root from its own module URL -- without " +
    "that it resolves against the caller's cwd and writes the snapshot wherever it was invoked from",
  );
  assert.ok(
    !/arg\("worktree",\s*process\.cwd\(\)\)/.test(src),
    "export-governance-snapshot.js must not default --worktree to process.cwd() -- that is the " +
    "exact defect that put RULES-SNAPSHOT.md outside the repo while reporting success",
  );
  // Negative control: the assertion above must be capable of failing.
  assert.ok(
    /arg\("worktree",\s*SCRIPT_REPO_ROOT\)/.test(src),
    "control: the worktree arg must still exist and now fall back to SCRIPT_REPO_ROOT -- if this " +
    "clause cannot be found the two assertions above are matching against a file that no longer " +
    "has the setting at all, and would pass vacuously",
  );
  results.push("exporter-path-default-is-its-own-repo");

  // ---------------------------------------------------------------- live arm
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the schema and cost-view arms",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured when this shipped: 365 cycles, 183 " +
      "with a resolvable backlog_item_id, 52 carrying a non-ticket label, 130 with no label, and " +
      "55 shipped/gated cycles still unattributable. ticket_cost reported 145 tickets with a " +
      "measured cost after the join moved to the typed column.",
    );
    return results;
  }

  // The typed column exists and actually references backlog_items -- a plain uuid column would
  // satisfy a naive "column exists" check while referencing nothing.
  // PostgREST cannot read pg_constraint, so the referential half is asserted through BEHAVIOUR:
  // every non-null backlog_item_id must resolve to a real backlog_items row. A dangling value
  // would prove the FK is absent or NOT VALID.
  const cycles = await pg(url, key,
    "runner_cycles?select=id,item_id,backlog_item_id,outcome&backlog_item_id=not.is.null&limit=1000");
  assert.ok(cycles.length > 0,
    "no cycle carries a backlog_item_id -- the backfill did not run, so every per-ticket cost is " +
    "still zero and this test would otherwise pass by having nothing to check");

  const ids = [...new Set(cycles.map(c => c.backlog_item_id))];
  const found = await pg(url, key,
    `backlog_items?select=id&id=in.(${ids.slice(0, 200).join(",")})&limit=200`);
  const foundSet = new Set(found.map(r => r.id));
  const dangling = ids.slice(0, 200).filter(i => !foundSet.has(i));
  assert.deepStrictEqual(dangling, [],
    `${dangling.length} backlog_item_id values resolve to no ticket -- the reference is not ` +
    "enforced, which is the whole point of moving off the free-text label");

  // The DISCRIMINATING one: a cycle whose item_id is NOT a ticket id but whose backlog_item_id IS
  // set must still be counted by ticket_cost. Under the old item_id join it contributed zero.
  const mislabelled = cycles.find(c => c.item_id && !/^[A-Z]+-[0-9]+[a-z]?$/.test(c.item_id));
  if (mislabelled) {
    const [row] = await pg(url, key,
      `backlog_items?select=backlog_id&id=eq.${mislabelled.backlog_item_id}&limit=1`);
    const [cost] = await pg(url, key,
      `ticket_cost?select=backlog_id,actual_cycles&backlog_id=eq.${encodeURIComponent(row.backlog_id)}&limit=1`);
    assert.ok(cost && cost.actual_cycles > 0,
      `cycle ${mislabelled.id} has the non-ticket label ${JSON.stringify(mislabelled.item_id)} but ` +
      `a real backlog_item_id, and ticket_cost still reports ${cost?.actual_cycles} cycles for ` +
      `${row.backlog_id} -- the view is still joining on item_id, so every cycle whose label is ` +
      "prose, a card UUID, a directive or a rule id counts for nothing");
    results.push("cost-view-counts-a-cycle-whose-label-is-not-a-ticket-id");
  } else {
    notRun(
      "the mislabelled-cycle discrimination",
      "no cycle currently pairs a non-ticket item_id with a set backlog_item_id; the other arms " +
      "still ran. This is data-dependent, not a skip of the assertion.",
    );
  }

  results.push("typed-reference-resolves-for-every-cycle-that-carries-one");
  return results;
}

selfRun(import.meta.url, run);
export default run;
