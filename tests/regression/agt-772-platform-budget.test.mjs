// DeepBench v7.0.1098 | tests/regression/agt-772-platform-budget.test.mjs | AGT-772
//
// FEATURE: AGT-772 -- one platform budget (runner_settings.platform_budget_{day,week,month}_usd,
// read through platform_budget_status()) refuses EVERY outside caller once a period is spent:
// 403 {deepbench_gate, reason:'budget', period, reopens_at}; the bypass header, OPTIONS and the two
// browse-safe GETs never ask; an infra error skips the check and the old gate decides.
//
// NO NETWORK: middleware() runs against a stubbed globalThis.fetch. DISCRIMINATION: on the
// unchanged tree this file exits 1 at import (`budgetCopy` is not exported by gate-intercept.js);
// with only the copy added, a1 fails (no budget RPC, the request passes).

import assert from "assert";
import crypto from "crypto";
import { selfRun } from "./_lib/self-run.js";
import middleware from "../../middleware.js";
import { budgetCopy, subscribeGate } from "../../src/lib/gate-intercept.js";

const S = "160.79.106.1";
const A = "203.0.113.7";
const sha = s => crypto.createHash("sha256").update(s, "utf8").digest("hex");
const KEYS = {
  "key-b": { caller_name: "MCP_KEY_b", permission: "trial", spend_limit_usd: 5, llm_calls: 1, total_tokens: 90, cost_usd: 0.25 },
  "key-c": { caller_name: "MCP_KEY_c", permission: "unlimited", spend_limit_usd: 5, llm_calls: 9, total_tokens: 9, cost_usd: 999 },
};
const BY_HASH = new Map(Object.entries(KEYS).map(([k, r]) => [sha(k), r]));
const TRIAL = { permission: "trial", block_reason: null, spend_limit_usd: 5, blocked_attempts: 0, blocked_at: null, country: "US" };
const ZERO = { llm_calls: 0, total_tokens: 0, cost_usd: 0 };
const BUDGET = (d, w, m) => ({
  day_spent_usd: d, week_spent_usd: w, month_spent_usd: m,
  day_limit_usd: 10, week_limit_usd: 25, month_limit_usd: 35,
  day_reopens_at: "2026-11-21T06:00:00+00:00", week_reopens_at: "2026-11-23T06:00:00+00:00", month_reopens_at: "2026-12-01T06:00:00+00:00",
});
const DAY = { deepbench_gate: true, reason: "budget", period: "day", reopens_at: "2026-11-21T06:00:00.000Z" };
const MONTH = { deepbench_gate: true, reason: "budget", period: "month", reopens_at: "2026-12-01T06:00:00.000Z" };

async function withGate({ budget = BUDGET(0, 0, 0), budgetStatus = 200, rows = {}, bypass = null } = {}, fn) {
  const saved = { fetch: globalThis.fetch, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY, bypass: process.env.GATE_BYPASS_SECRET, error: console.error };
  const calls = [];
  const errors = [];
  process.env.SUPABASE_URL = "https://sb.test";
  process.env.SUPABASE_SERVICE_KEY = "service-test";
  if (bypass) process.env.GATE_BYPASS_SECRET = bypass; else delete process.env.GATE_BYPASS_SECRET;
  console.error = (...a) => errors.push(a.join(" "));
  const answer = (payload, status = 200) => ({ ok: status < 400, status, json: async () => payload, text: async () => JSON.stringify(payload) });
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = String(init.method || "GET").toUpperCase();
    const body = init.body === undefined ? null : String(init.body);
    calls.push({ url, method, body });
    if (url.includes("/rpc/platform_budget_status")) return answer(budgetStatus < 400 ? [budget] : { message: "down" }, budgetStatus);
    if (url.includes("/rpc/mcp_caller_gate")) {
      const row = BY_HASH.get(JSON.parse(body || "{}").p_key_sha256);
      return answer(row ? [row] : []);
    }
    if (url.includes("/rpc/get_ip_stats")) return answer([ZERO]);
    if (method === "GET" && url.includes("/ip_org_cache")) {
      for (const [ip, row] of Object.entries(rows)) if (url.includes(`caller_ip=eq.${encodeURIComponent(ip)}&`)) return answer([row]);
      return answer([]);
    }
    return answer({}, 201);
  };
  try {
    return await fn(calls, errors);
  } finally {
    globalThis.fetch = saved.fetch;
    console.error = saved.error;
    for (const [k, v] of [["SUPABASE_URL", saved.url], ["SUPABASE_SERVICE_KEY", saved.key], ["GATE_BYPASS_SECRET", saved.bypass]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

async function call({ path = "/api/mcp", method = "POST", key = null, endUser = false, extra = {} } = {}) {
  const headers = { "x-forwarded-for": S, "x-vercel-ip-country": "US", ...extra };
  if (key) headers["x-deepbench-mcp-key"] = key;
  if (endUser) { headers["x-deepbench-end-user-ip"] = A; headers["x-deepbench-end-user-country"] = "US"; }
  const res = await middleware(new Request("https://deepbench.test" + path, { method, headers }), {});
  const text = await res.text();
  let body = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: res.status, next: res.headers.get("x-middleware-next"), cors: res.headers.get("access-control-allow-origin"), body };
}

const budgetCalls = calls => calls.filter(c => c.url.includes("/rpc/platform_budget_status")).length;
function assertPass(out, label) {
  assert.strictEqual(out.status, 200, `${label}: expected PASS (200), got ${out.status} body ${JSON.stringify(out.body)}`);
  assert.strictEqual(out.next, "1", `${label}: 200 without x-middleware-next: 1`);
}

async function a1() {
  await withGate({ budget: BUDGET(10, 10, 10) }, async calls => {
    const out = await call();
    assert.strictEqual(out.status, 403, `a1: expected 403, got ${out.status}`);
    assert.deepStrictEqual(out.body, DAY, "a1: refusal body is not the day budget body");
    assert.strictEqual(out.cors, "*", `a1: cors ${out.cors}`);
    assert.strictEqual(budgetCalls(calls), 1, `a1: expected 1 budget call, saw ${budgetCalls(calls)}`);
    assert.strictEqual(calls.length, 1, `a1: a budget refusal reads nothing else, saw ${calls.length} calls`);
  });
  return "a1-day-spent-refuses-budget-day";
}

async function a2() {
  await withGate({ budget: BUDGET(5.45, 35.87, 67.53) }, async () => {
    const out = await call();
    assert.deepStrictEqual(out.body, MONTH, "a2: week+month spent must report the month (reopens last)");
  });
  await withGate({ budget: BUDGET(12, 30, 1) }, async () => {
    const out = await call();
    assert.strictEqual(out.body.period, "week", `a2 day+week: period ${out.body.period}`);
    assert.strictEqual(out.body.reopens_at, "2026-11-23T06:00:00.000Z", `a2 day+week: reopens_at ${out.body.reopens_at}`);
  });
  return "a2-several-spent-reports-the-last-to-reopen";
}

async function a3() {
  const cases = [
    { label: "unlimited address", rows: { [S]: { ...TRIAL, permission: "unlimited" } }, opts: {} },
    { label: "unlimited key", rows: {}, opts: { key: "key-c" } },
    { label: "trial key", rows: {}, opts: { key: "key-b" } },
    { label: "key + end user", rows: {}, opts: { key: "key-b", endUser: true } },
    { label: "execute route", rows: {}, opts: { path: "/api/capabilities/execute" } },
  ];
  for (const c of cases) {
    await withGate({ budget: BUDGET(0, 0, 35), rows: c.rows }, async () => {
      const out = await call(c.opts);
      assert.strictEqual(out.status, 403, `a3 ${c.label}: expected 403, got ${out.status}`);
      assert.deepStrictEqual(out.body, MONTH, `a3 ${c.label}: body`);
    });
  }
  return "a3-every-outside-caller-is-refused";
}

async function a4() {
  await withGate({ budget: BUDGET(99, 99, 99), bypass: "qa-secret" }, async calls => {
    assertPass(await call({ extra: { "x-db-gate-bypass": "qa-secret" } }), "a4 bypass");
    assertPass(await call({ method: "OPTIONS" }), "a4 OPTIONS");
    assertPass(await call({ method: "GET", path: "/api/agent-configs" }), "a4 agent-configs");
    assertPass(await call({ method: "GET", path: "/api/load-entries" }), "a4 load-entries");
    assert.strictEqual(budgetCalls(calls), 0, `a4: free passes must never ask the budget, saw ${budgetCalls(calls)}`);
  });
  return "a4-bypass-options-browse-gets-never-ask";
}

async function a5() {
  await withGate({ budget: BUDGET(9.99, 24.99, 34.99) }, async (calls, errors) => {
    assertPass(await call(), "a5 under");
    assert.strictEqual(budgetCalls(calls), 1, `a5 under: expected 1 budget call, saw ${budgetCalls(calls)}`);
    assert.strictEqual(errors.length, 0, `a5 under: no error line expected, saw ${errors.length}`);
  });
  await withGate({ budgetStatus: 500 }, async (calls, errors) => {
    assertPass(await call(), "a5 down");
    assert.strictEqual(errors.filter(e => e.startsWith("[AGT-772 gate]")).length, 1, `a5 down: expected one [AGT-772 gate] line, saw ${JSON.stringify(errors)}`);
  });
  await withGate({ budget: { day_spent_usd: 50 } }, async (calls, errors) => {
    assertPass(await call(), "a5 malformed");
    assert.strictEqual(errors.filter(e => e.startsWith("[AGT-772 gate]")).length, 1, "a5 malformed: expected one [AGT-772 gate] line");
  });
  await withGate({ budgetStatus: 500, rows: { [S]: { ...TRIAL, permission: "blocked", block_reason: "geo" } } }, async () => {
    const out = await call();
    assert.deepStrictEqual(out.body, { deepbench_gate: true, reason: "geo", ip: S }, "a5 down+blocked: the old gate must still decide");
  });
  return "a5-under-passes-infra-error-skips-the-check";
}

async function a6() {
  assert.deepStrictEqual(budgetCopy("day", "2026-11-21T06:00:00.000Z"), {
    heading: "DeepBench has reached its usage limit for today.",
    body: "It reopens at midnight Central. Contact RMV if you need the limit removed.",
  }, "a6 day");
  assert.deepStrictEqual(budgetCopy("week", "2026-11-23T06:00:00.000Z"), {
    heading: "DeepBench has reached its usage limit for this week.",
    body: "It reopens Monday. Contact RMV if you need the limit removed.",
  }, "a6 week");
  assert.deepStrictEqual(budgetCopy("month", "2026-12-01T06:00:00.000Z"), {
    heading: "DeepBench has reached its usage limit for this month.",
    body: "It reopens December 1. Contact RMV if you need the limit removed.",
  }, "a6 month");
  return "a6-popup-copy-is-johns-wording";
}

async function a7() {
  const saved = globalThis.window;
  const seen = [];
  globalThis.window = { fetch: async () => new Response(JSON.stringify(MONTH), { status: 403 }) };
  try {
    const mod = await import("../../src/lib/gate-intercept.js?agt772");
    const off = mod.subscribeGate(d => seen.push(d));
    await globalThis.window.fetch("/api/mcp");
    off();
  } finally {
    if (saved === undefined) delete globalThis.window; else globalThis.window = saved;
  }
  assert.strictEqual(seen.length, 1, `a7: expected 1 gate event, saw ${seen.length}`);
  assert.strictEqual(seen[0].reason, "budget", `a7: reason ${seen[0].reason}`);
  assert.strictEqual(seen[0].period, "month", `a7: period ${seen[0].period}`);
  assert.strictEqual(seen[0].reopens_at, "2026-12-01T06:00:00.000Z", `a7: reopens_at ${seen[0].reopens_at}`);
  assert.strictEqual(typeof subscribeGate, "function");
  return "a7-intercept-hands-period-and-reopens-at";
}

export default async function run() {
  const results = [];
  for (const arm of [a1, a2, a3, a4, a5, a6, a7]) results.push(await arm());
  return results;
}

selfRun(import.meta.url, run);
