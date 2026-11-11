// DeepBench v7.0.1001 | tests/regression/agt-297-mcp-caller-gate.test.mjs | AGT-297
//
// FEATURE: AGT-297 -- on an MCP route, a KNOWN `x-deepbench-mcp-key` is gated on that key's own
// permission, cap and ledger, never on the caller's IP. MCP connectors share an egress pool, so the
// IP is not the caller there: one address is thousands of them, and the first to cross the $5 trial
// cap refuses the rest. No key, an unknown key, or a failed gate lookup fall through to the
// unchanged per-IP gate -- this narrows nothing.
//
// NO NETWORK. Every arm runs middleware() against a stubbed globalThis.fetch and stub credentials,
// so nothing here reads or writes the database. The stub records each call's url, headers and body,
// which is what lets the arms assert WHICH gate decided -- a 403 alone cannot tell the key gate's
// refusal from the IP gate's, and both are 403 `spend_cap` here by construction (the fixture IP row
// is itself blocked for spend_cap). The discriminators are the recorded calls and the stats numbers:
// the key gate's stats come from the key's row (12 / 3400 / 6.5), the IP gate's from get_ip_stats
// (40 / 1000 / 1), and a decision taken on the key reads no IP row at all.
//
// BASELINE: the file is new. On the unchanged middleware.js it exits 1 -- arm 1's key-a refusal
// carries the IP's stats (40 / 1000 / 1) instead of the key's, because no keyed path exists yet. It
// exits 1 again if fetchCallerGate() returns null for a known key, or if B drops its
// isMcpRequest(url) guard (arm 5's unparameterised /api/capabilities/execute would then be gated on
// the key and pass).

import assert from "assert";
import crypto from "crypto";
import { selfRun } from "./_lib/self-run.js";
import middleware from "../../middleware.js";

const IP = "160.79.106.1";
const KEY_HEADER = "x-deepbench-mcp-key";
const sha = s => crypto.createHash("sha256").update(s, "utf8").digest("hex");

// The gate rows mcp_caller_gate() would return, keyed by the SHA-256 the edge posts for each key.
const GATE_ROWS = {
  "key-a": { caller_name: "MCP_KEY_a", permission: "trial", spend_limit_usd: 5, llm_calls: 12, total_tokens: 3400, cost_usd: 6.5 },
  "key-b": { caller_name: "MCP_KEY_b", permission: "trial", spend_limit_usd: 5, llm_calls: 1, total_tokens: 90, cost_usd: 0.25 },
  "key-c": { caller_name: "MCP_KEY_c", permission: "unlimited", spend_limit_usd: 5, llm_calls: 9, total_tokens: 9, cost_usd: 999 },
  "key-d": { caller_name: "MCP_KEY_d", permission: "blocked", spend_limit_usd: 5, llm_calls: 0, total_tokens: 0, cost_usd: 0 },
};
const BY_HASH = new Map(Object.entries(GATE_ROWS).map(([key, row]) => [sha(key), row]));

const IP_ROW_BLOCKED = {
  permission: "blocked", block_reason: "spend_cap", spend_limit_usd: 5,
  blocked_attempts: 1, blocked_at: "2026-11-01T00:00:00Z", country: "US",
};
const IP_ROW_TRIAL = { ...IP_ROW_BLOCKED, permission: "trial", block_reason: null };
const IP_STATS = { llm_calls: 40, total_tokens: 1000, cost_usd: 1 };

// ---------------------------------------------------------------------------------------------
// Harness: stubbed fetch, stub credentials, no bypass secret, silent console.error -- all restored
// in `finally` so one arm can never leak its stub into the next test in the suite.
// ---------------------------------------------------------------------------------------------
async function withGate({ ipRow = IP_ROW_BLOCKED, gateDown = false } = {}, fn) {
  const saved = {
    fetch: globalThis.fetch,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
    bypass: process.env.GATE_BYPASS_SECRET,
    error: console.error,
  };
  const calls = [];
  process.env.SUPABASE_URL = "https://sb.test";
  process.env.SUPABASE_SERVICE_KEY = "service-test";
  delete process.env.GATE_BYPASS_SECRET;   // an honoured bypass would pass every arm vacuously
  console.error = () => {};                // B logs one line on a DOWN lookup; keep the suite readable
  const answer = (payload, status = 200) => ({
    ok: status < 400, status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  });
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = String(init.method || "GET").toUpperCase();
    const body = init.body === undefined ? null : String(init.body);
    calls.push({ url, method, headers: JSON.stringify(init.headers || {}), body });
    if (url.includes("/rpc/mcp_caller_gate")) {
      if (gateDown) return answer({ message: "gate down" }, 500);
      const posted = JSON.parse(body || "{}").p_key_sha256;
      const row = BY_HASH.get(posted);
      return answer(row ? [row] : []);
    }
    if (url.includes("/rpc/get_ip_stats")) return answer([IP_STATS]);
    if (method === "GET" && url.includes("/ip_org_cache")) return answer([ipRow]);
    return answer({}, 201);
  };
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = saved.fetch;
    console.error = saved.error;
    if (saved.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = saved.url;
    if (saved.key === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = saved.key;
    if (saved.bypass === undefined) delete process.env.GATE_BYPASS_SECRET; else process.env.GATE_BYPASS_SECRET = saved.bypass;
  }
}

async function call(path, key) {
  const headers = { "x-forwarded-for": IP, "x-vercel-ip-country": "US" };
  if (key) headers[KEY_HEADER] = key;
  const res = await middleware(new Request("https://deepbench.test" + path, { method: "POST", headers }), {});
  const text = await res.text();
  let body = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: res.status, next: res.headers.get("x-middleware-next"), body };
}

const gateCalls = calls => calls.filter(c => c.url.includes("/rpc/mcp_caller_gate")).length;
const ipReads = calls => calls.filter(c => c.url.includes("/ip_org_cache") || c.url.includes("get_ip_stats")).length;

function assertPass(out, label) {
  assert.strictEqual(out.status, 200, `${label}: expected PASS (200), got ${out.status} body ${JSON.stringify(out.body)}`);
  assert.strictEqual(out.next, "1", `${label}: 200 without x-middleware-next: 1 -- not the continue response`);
}

// ---------------------------------------------------------------------------------------------
// 1. A keyed MCP route is decided on the key alone: no IP row is ever read.
// ---------------------------------------------------------------------------------------------
async function arm1() {
  const results = [];
  await withGate({}, async calls => {
    const out = await call("/api/mcp/harlan", "key-a");
    assert.strictEqual(out.status, 403, `arm1 key-a: expected 403 on the key's own cap, got ${out.status}`);
    assert.deepStrictEqual(out.body, {
      deepbench_gate: true, reason: "spend_cap", ip: IP,
      stats: { llm_calls: 12, total_tokens: 3400, cost_usd: 6.5 },
    }, "arm1 key-a: the refusal body is not the key's own row -- stats 40/1000/1 means the IP gate decided");
    assert.strictEqual(gateCalls(calls), 1, `arm1 key-a: expected exactly 1 gate call, saw ${gateCalls(calls)}`);
    assert.strictEqual(ipReads(calls), 0, `arm1 key-a: the key decided, so no IP read may happen -- saw ${ipReads(calls)}`);
  });
  results.push("arm1-key-a-refused-on-its-own-cap-no-ip-read");
  await withGate({}, async calls => {
    const out = await call("/api/mcp/harlan", "key-b");
    assertPass(out, "arm1 key-b");
    assert.strictEqual(gateCalls(calls), 1, `arm1 key-b: expected exactly 1 gate call, saw ${gateCalls(calls)}`);
    assert.strictEqual(ipReads(calls), 0, `arm1 key-b: passed on its key, so no IP read may happen -- saw ${ipReads(calls)}`);
  });
  results.push("arm1-key-b-under-its-own-cap-passes-over-a-blocked-ip");
  return results;
}

// ---------------------------------------------------------------------------------------------
// 2. The raw key never leaves the request: only its hash is posted.
// ---------------------------------------------------------------------------------------------
async function arm2() {
  await withGate({}, async calls => {
    await call("/api/mcp/harlan", "key-a");
    const blob = c => `${c.url}${c.headers}${c.body || ""}`;
    const raw = calls.filter(c => blob(c).includes("key-a")).length;
    const hashed = calls.filter(c => blob(c).includes(sha("key-a"))).length;
    assert.strictEqual(raw, 0, `arm2: ${raw} recorded call(s) carry the raw key -- it must never leave the edge`);
    assert.strictEqual(hashed, 1, `arm2: expected exactly 1 recorded call carrying the key's sha256, saw ${hashed}`);
  });
  return ["arm2-only-the-hash-is-posted"];
}

// ---------------------------------------------------------------------------------------------
// 3. No key: the IP gate decides, exactly as before this ticket.
// ---------------------------------------------------------------------------------------------
async function arm3() {
  await withGate({}, async calls => {
    const out = await call("/api/mcp/harlan", null);
    assert.strictEqual(out.status, 403, `arm3: expected the IP gate's 403, got ${out.status}`);
    assert.strictEqual(out.body && out.body.reason, "spend_cap", `arm3: expected reason spend_cap, got ${out.body && out.body.reason}`);
    assert.strictEqual(out.body && out.body.stats && out.body.stats.llm_calls, 40,
      "arm3: the stats are not the IP's (40) -- a keyless request must be decided by the IP gate");
    assert.strictEqual(gateCalls(calls), 0, `arm3: a keyless request must cost 0 gate calls, saw ${gateCalls(calls)}`);
  });
  return ["arm3-keyless-falls-to-the-ip-gate"];
}

// ---------------------------------------------------------------------------------------------
// 4. Unknown key and a DOWN lookup both fall through -- the IP gate still runs, both ways.
// ---------------------------------------------------------------------------------------------
async function arm4() {
  const results = [];
  await withGate({}, async calls => {
    const out = await call("/api/mcp", "key-zzz");
    assert.strictEqual(out.status, 403, `arm4 unknown: expected the IP gate's 403, got ${out.status}`);
    assert.strictEqual(gateCalls(calls), 1, `arm4 unknown: expected 1 gate call, saw ${gateCalls(calls)}`);
    assert.ok(ipReads(calls) > 0, "arm4 unknown: an unknown key must fall through to the IP gate, which reads the IP");
  });
  results.push("arm4-unknown-key-falls-through");
  await withGate({ gateDown: true }, async calls => {
    const out = await call("/api/mcp", "key-b");
    assert.strictEqual(out.status, 403, `arm4 down-blocked: a failed lookup must not fail open past a blocked IP, got ${out.status}`);
    assert.strictEqual(gateCalls(calls), 1, `arm4 down-blocked: expected 1 gate call, saw ${gateCalls(calls)}`);
  });
  results.push("arm4-down-lookup-is-not-a-fail-open");
  await withGate({ gateDown: true, ipRow: IP_ROW_TRIAL }, async calls => {
    const out = await call("/api/mcp", "key-a");
    assertPass(out, "arm4 down-trial");
    assert.ok(ipReads(calls) > 0, "arm4 down-trial: a failed lookup must hand the decision to the IP gate, which reads the IP");
  });
  results.push("arm4-down-lookup-hands-the-decision-to-the-ip-gate");
  return results;
}

// ---------------------------------------------------------------------------------------------
// 5. The key is honoured on MCP routes only -- /api/capabilities/execute needs transport=mcp.
// ---------------------------------------------------------------------------------------------
async function arm5() {
  const results = [];
  await withGate({}, async calls => {
    const out = await call("/api/capabilities/execute", "key-b");
    assert.strictEqual(out.status, 403, `arm5 no-transport: a non-MCP route must stay on the IP gate, got ${out.status}`);
    assert.strictEqual(gateCalls(calls), 0, `arm5 no-transport: expected 0 gate calls, saw ${gateCalls(calls)}`);
  });
  results.push("arm5-execute-without-transport-stays-on-the-ip-gate");
  await withGate({}, async calls => {
    const out = await call("/api/capabilities/execute?transport=mcp", "key-b");
    assertPass(out, "arm5 transport=mcp");
    assert.strictEqual(gateCalls(calls), 1, `arm5 transport=mcp: expected 1 gate call, saw ${gateCalls(calls)}`);
    assert.strictEqual(ipReads(calls), 0, `arm5 transport=mcp: the key decided, so no IP read may happen -- saw ${ipReads(calls)}`);
  });
  results.push("arm5-execute-with-transport-mcp-is-gated-on-the-key");
  return results;
}

// ---------------------------------------------------------------------------------------------
// 6. The key's permission decides alone: unlimited passes, blocked refuses `manual`, no stats.
// ---------------------------------------------------------------------------------------------
async function arm6() {
  const results = [];
  await withGate({}, async () => {
    assertPass(await call("/api/mcp", "key-c"), "arm6 key-c unlimited");
  });
  results.push("arm6-unlimited-key-passes");
  await withGate({}, async () => {
    const out = await call("/api/mcp", "key-d");
    assert.strictEqual(out.status, 403, `arm6 key-d: expected 403, got ${out.status}`);
    assert.deepStrictEqual(out.body, { deepbench_gate: true, reason: "manual", ip: IP },
      "arm6 key-d: a blocked key's refusal must be reason `manual` and carry no stats");
  });
  results.push("arm6-blocked-key-refuses-manual");
  return results;
}

export default async function run() {
  const results = [];
  for (const arm of [arm1, arm2, arm3, arm4, arm5, arm6]) results.push(...(await arm()));
  return results;
}

selfRun(import.meta.url, run);
