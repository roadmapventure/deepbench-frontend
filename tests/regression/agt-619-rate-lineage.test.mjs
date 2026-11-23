// DeepBench v7.0.1112 | tests/regression/agt-619-rate-lineage.test.mjs | AGT-619
//
// FEATURE: AGT-619 -- every dollar names its rate. public.model_pricing is a dated sheet whose rows
// have an id; lib/activity-log.js stamps that id on each row it prices (ai_activity_log.pricing_row_id);
// and public.get_ip_stats() / public.mcp_caller_gate() take the stored dollar first and price the
// rest by the same rule as shared/models.js computeCallCost(), cache reads included.
//
// WHAT HAS TO STAY TRUE: (1) the id stamped on a row is the id of the sheet row that priced it --
// one lookup, never a second one; (2) a dollar no rate row produced (a caller-supplied costUsd, an
// unpriced model) names no row; (3) the two SQL gates and the JS book return the same dollar for the
// same rows; (4) a stamped row's cost_usd recomputes from the sheet row it names.
//
// FOUR ARMS:
//   (a) OFFLINE -- the mirror carries a unique positive id and a parseable effective_from on every
//       row; pricingRowId() resolves through the same normalisation computeCallCost() uses.
//   (b) OFFLINE -- the real logActivity() with a stubbed fetch (restored in `finally`): a priced call
//       posts pricing_row_id === pricingRowId(model); an explicit costUsd and an unpriced model post null.
//   (c) OFFLINE -- the stage-B mirror holds the cache-read rule and the stored-first rule once per
//       function, and middleware.js no longer says spend is never stored.
//   (d) LIVE, read-only -- for every address that ran a model with its own cache-read rate,
//       get_ip_stats() equals the JS book over that address's rows to six places; and every stamped
//       row among the newest 200 recomputes from the sheet row it names (NOT RUN while none exists).
//
// WOULD THIS PASS IF NOTHING CHANGED? No: `pricingRowId` does not exist on the tree before this
// ticket, so the import fails; and against the unmigrated database arm (d) differs by up to 0.0023.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { logActivity } from "../../lib/activity-log.js";
import { MODEL_PRICING, MODEL_ID_NORMALIZE, computeCallCost, pricingRowId } from "../../shared/models.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PRICED = "claude-sonnet-5-5";
const UNPRICED = "zz-agt619-no-such-model";
const CACHE_RULE = "coalesce(p.cache_read_per_1k, p.input_per_1k * 0.10)";
const CRED_HINT = "export SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets by name) to run the live arm";
const hasCreds = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const count = (text, needle) => text.split(needle).length - 1;
const round6 = n => Math.round(n * 1e6) / 1e6;

function partA_mirror() {
  const ids = Object.values(MODEL_PRICING).map(p => p.id);
  assert.ok(ids.length >= 30, `the mirror holds ${ids.length} rows, expected at least 30`);
  for (const [model, p] of Object.entries(MODEL_PRICING)) {
    assert.ok(Number.isInteger(p.id) && p.id > 0, `${model}: the mirror row must carry the sheet row's id, got ${p.id}`);
    assert.ok(!Number.isNaN(Date.parse(p.effective_from)), `${model}: effective_from must be a date, got ${p.effective_from}`);
  }
  assert.strictEqual(new Set(ids).size, ids.length, "every sheet row has its own id");
  assert.strictEqual(pricingRowId(PRICED), MODEL_PRICING[PRICED].id);
  for (const [short, full] of Object.entries(MODEL_ID_NORMALIZE)) {
    assert.strictEqual(pricingRowId(short), MODEL_PRICING[full].id, `${short} is priced by ${full}'s row, so it names that row`);
  }
  assert.strictEqual(pricingRowId(UNPRICED), null, "an unpriced model names no row");
  assert.strictEqual(MODEL_PRICING["claude-fable-5-1"].cache_read_per_1k, 0.00025, "Fable 5.1's own cache-read rate arrives from the sheet");
  return ["mirror-carries-id-and-date", "one-lookup"];
}

async function partB_stamp() {
  const saved = { fetch: globalThis.fetch, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY };
  const posts = [];
  try {
    process.env.SUPABASE_URL = "https://agt619.invalid";
    process.env.SUPABASE_SERVICE_KEY = "fixture-not-a-key";
    globalThis.fetch = async (url, init) => {
      if (String(url).includes("/rest/v1/ai_activity_log") && init && init.method === "POST") posts.push(JSON.parse(init.body));
      return { ok: true, status: 201, json: async () => [], text: async () => "" };
    };
    const call = over => logActivity({ aiType: "capability", feature: "agt-619-fixture", traceId: "trace-619", ...over });
    await call({ model: PRICED, inputTokens: 12345, outputTokens: 678 });
    await call({ model: PRICED, inputTokens: 500, outputTokens: 0, costUsd: 0 });
    await call({ model: PRICED, inputTokens: 500, outputTokens: 0, costUsd: null });
    await call({ model: UNPRICED, inputTokens: 10, outputTokens: 10 });
    await call({ model: PRICED });
    assert.strictEqual(posts.length, 5, "one POST per call");
    assert.strictEqual(posts[0].pricing_row_id, MODEL_PRICING[PRICED].id, "a row priced here names the sheet row that priced it");
    assert.strictEqual(posts[0].cost_usd, computeCallCost(PRICED, 12345, 678, null, null));
    assert.strictEqual(posts[1].pricing_row_id, null, "an explicit 0 came from no rate row");
    assert.strictEqual(posts[2].pricing_row_id, null, "an explicit null came from no rate row");
    assert.strictEqual(posts[3].pricing_row_id, null, "an unpriced model names no row");
    assert.strictEqual(posts[4].cost_usd, null, "no tokens: unknown, never 0");
    assert.strictEqual(posts[4].pricing_row_id, null, "no dollar, no rate row");
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = saved.url;
    if (saved.key === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = saved.key;
  }
  return ["priced-row-stamped", "unrated-dollar-unstamped"];
}

function partC_static() {
  const sql = fs.readFileSync(path.join(ROOT, "docs", "design", "agt-619b-one-derivation.sql"), "utf8");
  const up = sql.slice(sql.indexOf("-- ---- THE MIGRATION, VERBATIM ---"));
  const [ipFn, keyFn] = [up.indexOf("FUNCTION public.get_ip_stats("), up.indexOf("FUNCTION public.mcp_caller_gate(")];
  assert.ok(ipFn > 0 && keyFn > ipFn, "the mirror defines get_ip_stats then mcp_caller_gate");
  const ipBody = up.slice(ipFn, keyFn), keyBody = up.slice(keyFn, up.indexOf("do $gate$"));
  for (const [name, body, stored] of [["get_ip_stats", ipBody, "coalesce(l.cost_usd,"], ["mcp_caller_gate", keyBody, "coalesce(l.stored,"]]) {
    assert.strictEqual(count(body, CACHE_RULE), 1, `${name} prices a cache read at the model's own rate, once`);
    assert.strictEqual(count(body, stored), 1, `${name} takes the stored dollar first`);
    assert.strictEqual(count(body, "p.input_per_1k * 1.25"), 1, `${name} keeps the cache-creation rule computeCallCost() uses`);
  }
  const gate = fs.readFileSync(path.join(ROOT, "middleware.js"), "utf8");
  assert.strictEqual(count(gate, "SPEND IS COMPUTED, NEVER STORED"), 0, "middleware.js must not say spend is never stored");
  assert.strictEqual(count(gate, "SPEND IS THE STORED DOLLAR FIRST"), 1, "middleware.js states the stored-first rule once");
  return ["sql-mirror-one-rule", "gate-header-true"];
}

async function rows(query) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${query}`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, Range: `${from}-${from + 999}` },
    });
    if (!r.ok) throw new Error(`read ${query.split("?")[0]} returned HTTP ${r.status}`);
    const page = await r.json();
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

async function partD_live() {
  const results = [];
  const COLS = "model,input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens,cost_usd";
  const own = Object.entries(MODEL_PRICING).filter(([, p]) => p.cache_read_per_1k != null).map(([m]) => m);
  const seen = await rows(`ai_activity_log?select=caller_ip&model=in.(${own.join(",")})&cache_read_input_tokens=gt.0&caller_ip=not.is.null&order=id`);
  const ips = [...new Set(seen.map(r => r.caller_ip))];
  assert.ok(ips.length > 0, "at least one address ran a model with its own cache-read rate");
  for (const [n, ip] of ips.entries()) {
    const mine = (await rows(`ai_activity_log?select=${COLS}&caller_ip=eq.${encodeURIComponent(ip)}&order=id`)).filter(r => MODEL_PRICING[r.model]);
    const js = mine.reduce((s, r) => s + (r.cost_usd != null ? Number(r.cost_usd)
      : computeCallCost(r.model, r.input_tokens || 0, r.output_tokens || 0, r.cache_creation_input_tokens || 0, r.cache_read_input_tokens || 0)), 0);
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/get_ip_stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` },
      body: JSON.stringify({ p_ip: ip }),
    });
    assert.ok(res.ok, `get_ip_stats returned HTTP ${res.status}`);
    const [stats] = await res.json();
    // The address itself is never printed: caller_ip is withheld from the public key.
    assert.strictEqual(Number(stats.llm_calls), mine.length, `address ${n + 1} of ${ips.length}: call counts agree`);
    assert.ok(Math.abs(Number(stats.cost_usd) - js) < 1e-6,
      `address ${n + 1} of ${ips.length}: get_ip_stats says ${stats.cost_usd}, the JS book says ${js.toFixed(6)} -- one row, two dollars`);
  }
  results.push(`gate-equals-book-on-${ips.length}-addresses`);

  const stamped = await fetch(`${process.env.SUPABASE_URL}/rest/v1/ai_activity_log?select=id,created_at,pricing_row_id,${COLS}&pricing_row_id=not.is.null&order=id.desc&limit=200`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` },
  });
  assert.ok(stamped.ok, `the ledger must expose pricing_row_id (HTTP ${stamped.status})`);
  const list = await stamped.json();
  if (list.length === 0) {
    notRun("AGT-619 (d) a stamped row recomputes from the sheet row it names", "no ledger row is stamped yet -- the first priced call after the deploy writes one");
    return results;
  }
  const sheet = new Map((await rows("model_pricing?select=id,input_per_1k,output_per_1k,cache_read_per_1k,effective_from&order=id")).map(p => [p.id, p]));
  let checked = 0;
  for (const r of list) {
    const p = sheet.get(r.pricing_row_id);
    assert.ok(p, `ledger row ${r.id} names sheet row ${r.pricing_row_id}, which does not exist`);
    if (Date.parse(r.created_at) < Date.parse(p.effective_from)) continue;   // the rate was changed in place since: known, counted by QA, not this arm's claim
    const cr = p.cache_read_per_1k != null ? Number(p.cache_read_per_1k) : Number(p.input_per_1k) * 0.10;
    const want = ((r.input_tokens || 0) / 1000) * Number(p.input_per_1k) + ((r.cache_creation_input_tokens || 0) / 1000) * Number(p.input_per_1k) * 1.25
      + ((r.cache_read_input_tokens || 0) / 1000) * cr + ((r.output_tokens || 0) / 1000) * Number(p.output_per_1k);
    assert.ok(Math.abs(round6(want) - Number(r.cost_usd)) < 1.5e-6, `ledger row ${r.id}: cost_usd ${r.cost_usd} does not recompute from sheet row ${p.id} (${round6(want)})`);
    checked++;
  }
  results.push(`${checked}-stamped-rows-recompute`);
  return results;
}

async function run() {
  const results = [];
  results.push(...partA_mirror());
  results.push(...(await partB_stamp()));
  results.push(...partC_static());
  if (!hasCreds()) {
    notRun("AGT-619 (d) LIVE: the gate equals the JS book; a stamped row recomputes", CRED_HINT);
  } else {
    results.push(...(await partD_live()));
  }
  return results;
}

export default run;
selfRun(import.meta.url, run);
