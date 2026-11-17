// DeepBench v7.0.1050 | tests/regression/agt-637-price-read-once.test.mjs | AGT-637 -- the boot gate reads the price of a cycle once.
//
// THE DEFECT, measured 2026-11-17: `public.runner_should_boot()`'s `pickable` CTE multiplies every
// queue row by `public.runner_pct_per_cycle()`, a STABLE sql function holding an aggregate the
// planner cannot inline, so it ran once PER ROW -- 238 ms a call, 81 pickable rows, 20,890 ms a
// gate call. PostgREST's role carries `statement_timeout=8s`, so every REST read of the gate
// answered HTTP 500 `57014` at ~8.4 s, `scripts/run-project.js` exited 2 before pass one, and six
// regression files that read the live gate reported NOT RUN. Read once into a MATERIALIZED CTE the
// same body gives the same `should_boot`, `reason` and every `detail` key but `checked_at`, in
// 3,103 ms against 21,431 ms side by side.
//
// TWO ARMS, and the split is the AGT-570 precedent.
//   A  repo -- the committed mirror of the migration carries BOTH md5 guards (the body it was
//      written against and the body it produces), the one reading, and the time bar that makes a
//      change which did not make the gate affordable roll itself back. What ships is the guarded
//      form, never a draft.
//   B  live, READ-ONLY -- 3 POSTs, body `{}`, service key; writes nothing. It is the
//      DISCRIMINATOR: against the pre-change body B1's own call is the HTTP 500 `57014` the ticket
//      is about, so this file cannot pass until the migration is applied. Declared NOT RUN without
//      credentials (SES-180 notRun()), never silently skipped.
//
// WHY B2 COUNTS THE CALLS IN THE SHIPPED BODY and does not merely time the gate: a timing
// assertion grades the live world -- a quiet board with few pickable rows answers fast with the
// defect still in place (pattern:162). The count of `runner_pct_per_cycle()` in
// `pg_get_functiondef` is a fact about the change. The time is printed as evidence, never asserted.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR = path.join(ROOT, "docs/design/agt-637-price-read-once.sql");

// The body the migration was written against, and the body it produces. Held as the mirror's own
// guard literals so arm A fails if either is dropped from what ships.
const GUARDS = [
  ["4e2611ce347baf21db33753996efa463", "the md5 of the body this migration was written against"],
  ["269eba5a36ca5cde76fbc7462f3344e5", "the md5 of the body it must produce"],
  ["ppc AS MATERIALIZED (", "the one reading of the price, materialized so the planner keeps it one"],
  ["(SELECT k.v FROM ppc k)", "each priced row reading that one row instead of calling the function"],
  ["ms >= 6000", "the time bar whose raise rolls the replacement back"],
];

const PCT_CALL = "runner_pct_per_cycle()";
const MATERIALIZED = "ppc AS MATERIALIZED (";

const countOf = (haystack, needle) => String(haystack).split(needle).length - 1;

function armA() {
  const sql = fs.readFileSync(MIRROR, "utf8");
  for (const [needle, why] of GUARDS) {
    assert.ok(sql.includes(needle), `${MIRROR} is missing ${JSON.stringify(needle)} -- ${why}`);
  }
  console.log("    [AGT-637 arm A] the mirror carries both md5 guards, the one reading and the time bar");
}

// Read-only POST. The message shape matches the AGT-116 transport watcher's own incident string, so
// a gate that still times out reads the same whichever of the two reports it first.
async function rpc(base, key, name) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const text = await res.text();
  if (!res.ok) {
    let code = null;
    try { code = JSON.parse(text).code; } catch { /* not JSON: the status alone is the finding */ }
    throw new Error(`HTTP ${res.status}${code ? ` ${code}` : ""} on /rest/v1/rpc/${name}`);
  }
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function armB() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "AGT-637 arm B (live gate)",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent, so the gate's answer, the call count " +
        "in its shipped body and the price it reports could not be read. Arm A above still graded " +
        "the committed migration's two md5 guards, its one reading and its time bar. Canonical " +
        "invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // B1 -- the gate answers at all, which is the whole ticket.
  const t0 = Date.now();
  const gate = await rpc(url, key, "runner_should_boot");
  const ms = Date.now() - t0;
  assert.equal(gate.status, 200, "the gate must answer 200 over REST");
  const rows = Array.isArray(gate.body) ? gate.body : [gate.body];
  assert.equal(rows.length, 1, `runner_should_boot() returned ${rows.length} rows, expected exactly 1`);
  const v = rows[0];
  assert.equal(typeof v.should_boot, "boolean", `should_boot must be a boolean, got ${typeof v.should_boot}`);
  assert.ok(typeof v.reason === "string" && v.reason.length > 0, "reason must be a non-empty string");
  const detail = v.detail ?? {};

  // B2 -- the shipped body reads the price ONCE. The fact about the change, not about the board.
  const fns = await rpc(url, key, "rule_enforcing_functions");
  const listed = Array.isArray(fns.body) ? fns.body : [];
  const gateFn = listed.find(r => r && r.proname === "runner_should_boot");
  assert.ok(gateFn, "rule_enforcing_functions did not list runner_should_boot");
  const calls = countOf(gateFn.definition, PCT_CALL);
  assert.equal(calls, 1,
    `the shipped body calls ${PCT_CALL} ${calls} times, expected exactly 1 -- the per-row call is what cost 20,890 ms`);
  assert.ok(String(gateFn.definition).includes(MATERIALIZED),
    `the shipped body must hold ${JSON.stringify(MATERIALIZED)} -- an un-materialized CTE lets the planner inline the call back to once per row`);

  // B3 -- the price the gate reports is the function's own, and every priced row used it.
  const priced = await rpc(url, key, "runner_pct_per_cycle");
  const price = Number(Array.isArray(priced.body) ? priced.body[0] : priced.body);
  assert.ok(Number.isFinite(price), `runner_pct_per_cycle() returned ${JSON.stringify(priced.body)}, expected a number`);
  assert.equal(Number(detail.pct_per_cycle), price,
    `detail.pct_per_cycle ${detail.pct_per_cycle} is not runner_pct_per_cycle() ${price} -- the one reading must be the reading it reports`);
  const pick = detail.pick ?? {};
  if (pick.predicted_cycles != null) {
    const want = Number(pick.predicted_cycles) * price;
    assert.ok(Math.abs(Number(pick.predicted_pct_of_week) - want) <= 0.01,
      `detail.pick.predicted_pct_of_week ${pick.predicted_pct_of_week} is not ${pick.predicted_cycles} x ${price} = ${want} (within 0.01) -- the priced row read something other than the one reading`);
  }

  console.log(
    `    [AGT-637 arm B] live: ${gate.status} in ${ms} ms, reason ${v.reason}; ` +
      `the body reads the price ${calls} time; detail.pct_per_cycle ${detail.pct_per_cycle} = runner_pct_per_cycle()`,
  );
}

export default async function run() {
  armA();
  await armB();
}

selfRun(import.meta.url, run);
