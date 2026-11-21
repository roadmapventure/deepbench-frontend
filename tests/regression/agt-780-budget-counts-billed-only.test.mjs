// DeepBench v7.0.1105 | tests/regression/agt-780-budget-counts-billed-only.test.mjs | AGT-780
//
// FEATURE: AGT-780 -- the platform budget (public.platform_budget_status(), read by production's
// gate) sums the STORED ai_activity_log.cost_usd and skips every row where it is NULL, the
// platform's own not-billable mark. Subscription session work is never counted (John, 2026-11-21).
//
// NOTHING IS WRITTEN. ai_activity_log is append-only, so no fixture row is inserted: arm C reads
// the function's answer twice and, between the two, reads the month's own rows over PostgREST.
// Costs are never negative and rows are only ever added, so the month's stored cost must sit
// between the two answers. The function's text is not readable over PostgREST, so the proof is the
// measured comparison, never a transcription of the body.
//
// DISCRIMINATION, three ways:
//   arm A (no credentials) hands judge() the two totals measured on 2026-11-21: the retired
//         function's month, 67.5351, against a stored cost of 11.158284, must be REFUSED as
//         "a NULL-cost row is counted"; the live one, 11.158284, must pass; a total that left a
//         costed row out must be refused the other way.
//   arm B (no credentials) is red on the pre-AGT-780 tree: the migration record is absent and
//         ARCHITECTURE 19t does not say what the budget counts.
//   arm C (credentialed) is red against the retired function: it priced every row from its tokens,
//         so its month stood above the stored cost by what the NULL-cost rows price to -- $56.37 on
//         2026-11-21. Arm C requires that excluded value to be at least MIN_EXCLUDED before it
//         claims the NULL half, and declares the half NOT RUN otherwise.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

export const RECORD = "docs/design/agt-780-budget-counts-billed-only.sql";
export const EPS = 0.0001;          // dollars: float summing of numeric(…,6) values
export const MIN_EXCLUDED = 0.01;   // dollars the NULL-cost rows must price to for the NULL half to discriminate
const PAGE = 1000;

/** The instant the US Central calendar month holding the day before `reopensAt` began. */
export function monthStart(reopensAt) {
  const parts = t => Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(t)).map(p => [p.type, p.value]));
  const inMonth = parts(new Date(reopensAt).getTime() - 36 * 3600 * 1000);
  for (const utcHour of [5, 6]) {
    const t = Date.UTC(Number(inMonth.year), Number(inMonth.month) - 1, 1, utcHour);
    const p = parts(t);
    if (p.day === "01" && p.hour === "00" && p.month === inMonth.month) return new Date(t).toISOString();
  }
  throw new Error(`monthStart: no Central midnight found for the month before ${reopensAt}`);
}

/** What the retired function priced one row at (AGT-772's formula), from its tokens and its model's price row. */
export function retiredPrice(row, price) {
  if (!price) return 0;
  const n = v => Number(v ?? 0);
  return (n(row.input_tokens) / 1000) * n(price.input_per_1k)
    + (n(row.cache_creation_input_tokens) / 1000) * n(price.input_per_1k) * 1.25
    + (n(row.cache_read_input_tokens) / 1000) * n(price.input_per_1k) * 0.10
    + (n(row.output_tokens) / 1000) * n(price.output_per_1k);
}

/**
 * before / after: month_spent_usd read before and after the rows were read. storedSum: the sum of
 * the month's stored cost_usd. Throws when the budget is not exactly the stored cost.
 */
export function judge({ before, after, storedSum }) {
  for (const [k, v] of Object.entries({ before, after, storedSum })) {
    assert.ok(Number.isFinite(v) && v >= 0, `judge: ${k} is ${v}, expected a number >= 0`);
  }
  assert.ok(before <= storedSum + EPS,
    `a NULL-cost row is counted: month_spent_usd ${before} is above the month's stored cost_usd ${storedSum} ` +
    `by ${(before - storedSum).toFixed(6)} -- the budget is pricing rows the platform marked not billable`);
  assert.ok(after >= storedSum - EPS,
    `a costed row is not counted: month_spent_usd ${after} is below the month's stored cost_usd ${storedSum} ` +
    `by ${(storedSum - after).toFixed(6)}`);
  return true;
}

// ---------------------------------------------------------------------------------------------
// A -- the rule itself, on the two totals measured 2026-11-21. No credentials.
// ---------------------------------------------------------------------------------------------
function armA() {
  assert.strictEqual(judge({ before: 11.158284, after: 11.158284, storedSum: 11.158284 }), true, "A: the live total must pass");
  assert.strictEqual(judge({ before: 11.158284, after: 11.20, storedSum: 11.17 }), true, "A: a row landing between the reads must pass");
  assert.throws(() => judge({ before: 67.5351, after: 67.5351, storedSum: 11.158284 }), /a NULL-cost row is counted/,
    "A: the retired function's month (67.5351 against 11.158284 stored) must be refused");
  assert.throws(() => judge({ before: 0, after: 0, storedSum: 11.158284 }), /a costed row is not counted/,
    "A: a total that leaves the costed rows out must be refused");
  assert.strictEqual(monthStart("2026-12-01T06:00:00+00:00"), "2026-11-01T05:00:00.000Z", "A: November 2026 begins in daylight time");
  assert.strictEqual(monthStart("2026-04-01T05:00:00+00:00"), "2026-03-01T06:00:00.000Z", "A: March 2026 begins in standard time");
  assert.strictEqual(monthStart("2027-01-01T06:00:00+00:00"), "2026-12-01T06:00:00.000Z", "A: December across the year end");
  const p = { input_per_1k: 0.003, output_per_1k: 0.015 };
  const r = { input_tokens: 1000, output_tokens: 1000, cache_creation_input_tokens: 1000, cache_read_input_tokens: 1000 };
  assert.ok(Math.abs(retiredPrice(r, p) - 0.02205) < 1e-12, `A: retiredPrice ${retiredPrice(r, p)}, expected 0.02205`);
  assert.strictEqual(retiredPrice(r, undefined), 0, "A: a model with no price row priced to nothing");
  return "a-rule-refuses-the-retired-total";
}

// ---------------------------------------------------------------------------------------------
// B -- the repo's record of what was applied, and what ARCHITECTURE says. No credentials.
// ---------------------------------------------------------------------------------------------
function armB() {
  assert.ok(fs.existsSync(path.join(ROOT, RECORD)), `B: ${RECORD} is absent -- the applied migration has no repo record`);
  const sql = read(RECORD);
  for (const needle of [
    "migration UP (agt780_budget_counts_billed_only)",
    "create or replace function public.platform_budget_status()",
    "l.cost_usd as c",
    "and l.cost_usd is not null",
    "grant execute on function public.platform_budget_status() to service_role;",
  ]) assert.ok(sql.includes(needle), `B: ${RECORD} must carry ${JSON.stringify(needle)}`);
  assert.ok(!/model_pricing/.test(sql), `B: ${RECORD} names model_pricing -- the budget must not price a row from its tokens`);
  assert.ok(!/^\s*(drop|delete|truncate)\b/im.test(sql), `B: ${RECORD} holds a destructive statement`);

  const arch = read("docs/ARCHITECTURE.md");
  const bullet = arch.split("\n").filter(l => l.startsWith("- **Platform budget ("));
  assert.strictEqual(bullet.length, 1, `B: expected exactly 1 Platform budget bullet in 19t, found ${bullet.length}`);
  for (const needle of ["stored `ai_activity_log.cost_usd`", "NULL", "`AGT-780`", "never counted"]) {
    assert.ok(bullet[0].includes(needle), `B: the 19t Platform budget bullet must carry ${JSON.stringify(needle)}`);
  }
  assert.ok(arch.split("\n").some(l => l.startsWith("# Amended v7.0.1105 | 2026-11-21 | AGT-780:")),
    "B: ARCHITECTURE.md carries no AGT-780 amendment line in its header");
  return "b-record-and-architecture-say-stored-cost";
}

// ---------------------------------------------------------------------------------------------
// C -- the live function against the live rows. Read-only; NOT RUN without credentials.
// ---------------------------------------------------------------------------------------------
async function armC() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-780 arm C (the live budget against the live rows)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent, so platform_budget_status() and the month's ai_activity_log rows " +
      "could not be read. Arms A and B above still graded the rule and the repo record. Export both inline by name " +
      "from public.runner_secrets (STANDARDS.md Section 2 rule 5).");
    return "c-not-run";
  }
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const status = async () => {
    const res = await fetch(`${url}/rest/v1/rpc/platform_budget_status`, { method: "POST", headers: h, body: "{}" });
    assert.strictEqual(res.status, 200, `C: platform_budget_status() answered HTTP ${res.status}`);
    const body = await res.json();
    const row = Array.isArray(body) ? body[0] : body;
    assert.ok(row && row.month_reopens_at, "C: platform_budget_status() returned no row");
    return row;
  };
  const rows = async query => {
    const out = [];
    for (let offset = 0; ; offset += PAGE) {
      const res = await fetch(`${url}/rest/v1/${query}&order=created_at.asc,id.asc&limit=${PAGE}&offset=${offset}`, { headers: h });
      assert.strictEqual(res.status, 200, `C: HTTP ${res.status} reading ${query.split("?")[0]}`);
      const page = await res.json();
      out.push(...page);
      if (page.length < PAGE) return out;
    }
  };

  const s1 = await status();
  const m0 = monthStart(s1.month_reopens_at);
  const since = `created_at=gte.${encodeURIComponent(m0)}`;
  const costed = await rows(`ai_activity_log?select=cost_usd&${since}&cost_usd=gt.0`);
  const negative = await rows(`ai_activity_log?select=id&${since}&cost_usd=lt.0`);
  const unbilled = await rows("ai_activity_log?select=model,input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens" +
    `&${since}&cost_usd=is.null&or=(input_tokens.gt.0,output_tokens.gt.0,cache_creation_input_tokens.gt.0,cache_read_input_tokens.gt.0)`);
  const priceRes = await fetch(`${url}/rest/v1/model_pricing?select=model,input_per_1k,output_per_1k`, { headers: h });
  assert.strictEqual(priceRes.status, 200, `C: HTTP ${priceRes.status} reading model_pricing`);
  const prices = new Map((await priceRes.json()).map(p => [p.model, p]));
  const s2 = await status();

  if (s1.month_reopens_at !== s2.month_reopens_at) {
    notRun("AGT-780 arm C (the live budget against the live rows)", "the Central month rolled over between the two reads; run it again");
    return "c-not-run";
  }
  assert.strictEqual(negative.length, 0, `C: ${negative.length} row(s) this month carry a negative cost_usd, so the two reads do not bracket the sum`);
  for (const k of ["day", "week", "month"]) {
    assert.ok(Number(s2[`${k}_limit_usd`]) > 0, `C: ${k}_limit_usd is ${s2[`${k}_limit_usd`]}`);
  }

  const storedSum = costed.reduce((a, r) => a + Number(r.cost_usd), 0);
  const excluded = unbilled.reduce((a, r) => a + retiredPrice(r, prices.get(r.model)), 0);
  const before = Number(s1.month_spent_usd), after = Number(s2.month_spent_usd);
  console.log(`    [AGT-780 arm C] month since ${m0}: budget ${before} -> ${after}; stored cost ${storedSum.toFixed(6)} over ` +
    `${costed.length} costed rows; ${unbilled.length} NULL-cost rows with tokens price to ${excluded.toFixed(4)} and are not counted`);

  if (costed.length === 0) {
    notRun("AGT-780 arm C, the costed half", "no row this Central month carries a stored cost yet, so 'a costed row is counted' has nothing to measure");
  } else {
    assert.ok(after > 0, `C: ${costed.length} costed rows this month and month_spent_usd is ${after}`);
  }
  judge({ before, after, storedSum });
  if (excluded < MIN_EXCLUDED) {
    notRun("AGT-780 arm C, the NULL half",
      `the month's NULL-cost rows price to ${excluded.toFixed(4)}, under ${MIN_EXCLUDED}: a budget that counted them would read the same, so this run does not discriminate`);
    return "c-live-costed-half-only";
  }
  return "c-live-budget-is-the-stored-cost";
}

export default async function run() {
  const results = [armA(), armB()];
  results.push(await armC());
  return results;
}

selfRun(import.meta.url, run);
