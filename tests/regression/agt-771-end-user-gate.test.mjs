// DeepBench v7.0.1097 | tests/regression/agt-771-end-user-gate.test.mjs | AGT-771
//
// FEATURE: AGT-771 -- a KNOWN site key may pass the person's address (`x-deepbench-end-user-ip`)
// and country (`x-deepbench-end-user-country`); the per-address rules then run on that person, not
// on the site server. The gate vouches for the address to the route with
// `x-deepbench-end-user-proof` (HMAC-SHA256 under SUPABASE_SERVICE_KEY over `agt771:<ip>`), and
// lib/request-context.js logs the person in caller_ip only on a matching proof, keeping the site
// server's own address in server_ip.
//
// NO NETWORK. middleware() and logActivity() run against a stubbed globalThis.fetch; every call is
// recorded so the arms assert WHICH address the gate decided on.
//
// DISCRIMINATION: on the unchanged tree this file exits 1 at import (`endUserProofHex` is not
// exported by lib/request-context.js). Wrong builds it catches: gate ignores the pair (a1 no proof
// header, a2 decided on S); an `unlimited` row honoured for a passed address (a3); CA still geo
// (a7 direct CA); headers honoured without a key (a8); key budget skipped (a9); route trusts the
// header without the proof (b1 forged); `server_ip: ctx.serverIp ?? null` (c1 hasOwn).

import assert from "assert";
import crypto from "crypto";
import { selfRun } from "./_lib/self-run.js";
import middleware from "../../middleware.js";
import { endUserProofHex, withRequestContext, getRequestContext } from "../../lib/request-context.js";
import { logActivity } from "../../lib/activity-log.js";

const S = "160.79.106.1";
const A = "203.0.113.7";
const B = "2001:db8::7";
const KEY_HEADER = "x-deepbench-mcp-key";
const IP_HEADER = "x-deepbench-end-user-ip";
const COUNTRY_HEADER = "x-deepbench-end-user-country";
const PROOF_HEADER = "x-deepbench-end-user-proof";
const sha = s => crypto.createHash("sha256").update(s, "utf8").digest("hex");

const GATE_ROWS = {
  "key-a": { caller_name: "MCP_KEY_a", permission: "trial", spend_limit_usd: 5, llm_calls: 12, total_tokens: 3400, cost_usd: 6.5 },
  "key-b": { caller_name: "MCP_KEY_b", permission: "trial", spend_limit_usd: 5, llm_calls: 1, total_tokens: 90, cost_usd: 0.25 },
  "key-c": { caller_name: "MCP_KEY_c", permission: "unlimited", spend_limit_usd: 5, llm_calls: 9, total_tokens: 9, cost_usd: 999 },
  "key-d": { caller_name: "MCP_KEY_d", permission: "blocked", spend_limit_usd: 5, llm_calls: 0, total_tokens: 0, cost_usd: 0 },
};
const BY_HASH = new Map(Object.entries(GATE_ROWS).map(([key, row]) => [sha(key), row]));

const TRIAL = { permission: "trial", block_reason: null, spend_limit_usd: 5, blocked_attempts: 0, blocked_at: null, country: "US" };
const OVER = { llm_calls: 30, total_tokens: 9000, cost_usd: 6 };
const SPENT = c => ({ llm_calls: 1, total_tokens: 10, cost_usd: c });
const ZERO = { llm_calls: 0, total_tokens: 0, cost_usd: 0 };

// ---------------------------------------------------------------------------------------------
// Harness: stubbed fetch, stub credentials, no bypass secret, silent console.error -- all four and
// fetch restored in `finally`.
// ---------------------------------------------------------------------------------------------
async function withEnv(fn) {
  const saved = {
    fetch: globalThis.fetch,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
    bypass: process.env.GATE_BYPASS_SECRET,
    error: console.error,
  };
  process.env.SUPABASE_URL = "https://sb.test";
  process.env.SUPABASE_SERVICE_KEY = "service-test";
  delete process.env.GATE_BYPASS_SECRET;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    globalThis.fetch = saved.fetch;
    console.error = saved.error;
    if (saved.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = saved.url;
    if (saved.key === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = saved.key;
    if (saved.bypass === undefined) delete process.env.GATE_BYPASS_SECRET; else process.env.GATE_BYPASS_SECRET = saved.bypass;
  }
}

async function withGate({ rows = {}, stats = {} } = {}, fn) {
  return withEnv(async () => {
    const calls = [];
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
        const posted = JSON.parse(body || "{}").p_key_sha256;
        const row = BY_HASH.get(posted);
        return answer(row ? [row] : []);
      }
      if (url.includes("/rpc/get_ip_stats")) {
        const p = JSON.parse(body || "{}").p_ip;
        return answer([stats[p] || ZERO]);
      }
      if (method === "GET" && url.includes("/ip_org_cache")) {
        for (const [ip, row] of Object.entries(rows)) {
          if (url.includes(`caller_ip=eq.${encodeURIComponent(ip)}&`)) return answer([row]);
        }
        return answer([]);
      }
      return answer({}, 201);
    };
    return fn(calls);
  });
}

async function call({ key = null, ip, country, vercelCountry = "US" } = {}) {
  const headers = { "x-forwarded-for": S };
  if (vercelCountry !== null) headers["x-vercel-ip-country"] = vercelCountry;
  if (key) headers[KEY_HEADER] = key;
  if (ip !== undefined) headers[IP_HEADER] = ip;
  if (country !== undefined) headers[COUNTRY_HEADER] = country;
  const res = await middleware(new Request("https://deepbench.test/api/mcp", { method: "POST", headers }), {});
  const text = await res.text();
  let body = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: res.status, res, next: res.headers.get("x-middleware-next"), cors: res.headers.get("access-control-allow-origin"), body };
}

const ipReads = calls => calls.filter(c => c.url.includes("/ip_org_cache") || c.url.includes("get_ip_stats")).length;
const statsIps = calls => calls.filter(c => c.url.includes("get_ip_stats")).map(c => JSON.parse(c.body).p_ip);

function assertPass(out, label) {
  assert.strictEqual(out.status, 200, `${label}: expected PASS (200), got ${out.status} body ${JSON.stringify(out.body)}`);
  assert.strictEqual(out.next, "1", `${label}: 200 without x-middleware-next: 1`);
}

const SPEND_CAP_A = { deepbench_gate: true, reason: "spend_cap", ip: A, stats: { llm_calls: 30, total_tokens: 9000, cost_usd: 6 } };

async function a1() {
  await withGate({ rows: { [A]: TRIAL }, stats: { [A]: SPENT(1) } }, async calls => {
    const out = await call({ key: "key-b", ip: A, country: "US" });
    assertPass(out, "a1");
    const proof = out.res.headers.get("x-middleware-request-" + PROOF_HEADER);
    assert.strictEqual(proof, endUserProofHex("service-test", A), "a1: the forwarded proof is not the HMAC of A");
    assert.strictEqual(proof, "bb924efe05107c0ee22ccc5226d0519fd34eccf40931ef92b0e8da0295b69e09", "a1: the proof is not the harvest's pinned value");
    const override = (out.res.headers.get("x-middleware-override-headers") || "").split(",");
    assert.ok(override.includes(PROOF_HEADER), `a1: override list lacks ${PROOF_HEADER}: ${override.join(",")}`);
    assert.strictEqual(calls.filter(c => c.url.includes(`caller_ip=eq.${S}`)).length, 0, "a1: the server address S was read -- the gate decided on S");
    assert.deepStrictEqual(statsIps(calls), [A], "a1: get_ip_stats must be asked about A only");
  });
  return "a1-keyed-address-under-ceiling-passes-with-proof";
}

async function a2() {
  await withGate({ rows: { [A]: TRIAL }, stats: { [A]: OVER } }, async () => {
    const out = await call({ key: "key-b", ip: A, country: "US" });
    assert.strictEqual(out.status, 403, `a2 A: expected 403, got ${out.status}`);
    assert.deepStrictEqual(out.body, SPEND_CAP_A, "a2 A: refusal body is not A's spend_cap");
  });
  await withGate({ stats: { [B]: ZERO } }, async calls => {
    const out = await call({ key: "key-b", ip: B, country: "CA" });
    assertPass(out, "a2 B");
    assert.deepStrictEqual(statsIps(calls), [B], "a2 B: get_ip_stats must be asked about B");
  });
  return "a2-a-over-ceiling-refused-b-passes";
}

async function a3() {
  await withGate({ rows: { [A]: { ...TRIAL, permission: "unlimited" } }, stats: { [A]: OVER } }, async () => {
    const out = await call({ key: "key-b", ip: A, country: "US" });
    assert.strictEqual(out.status, 403, `a3: an unlimited row must not be honoured for a passed address, got ${out.status}`);
    assert.strictEqual(out.body.reason, "spend_cap", `a3: reason ${out.body.reason}`);
    assert.strictEqual(out.body.ip, A, `a3: ip ${out.body.ip}`);
  });
  return "a3-unlimited-row-ignored-for-passed-address";
}

async function a4() {
  await withGate({ rows: { [A]: { ...TRIAL, spend_limit_usd: 10 } }, stats: { [A]: OVER } }, async () => {
    assertPass(await call({ key: "key-b", ip: A, country: "US" }), "a4");
  });
  return "a4-raised-ceiling-lets-a-through";
}

async function a5() {
  await withGate({ rows: { [A]: { ...TRIAL, permission: "blocked", block_reason: "spend_cap" } }, stats: { [A]: OVER } }, async () => {
    const out = await call({ key: "key-b", ip: A, country: "US" });
    assert.strictEqual(out.status, 403, `a5: expected 403, got ${out.status}`);
    assert.deepStrictEqual(out.body, SPEND_CAP_A, "a5: stored-blocked refusal body is not A's");
  });
  return "a5-stored-blocked-address-refused-with-its-ip";
}

async function a6() {
  const cases = [
    { label: "999.1.1.1/US", ip: "999.1.1.1", country: "US" },
    { label: "A/no-country", ip: A },
    { label: "A/USA", ip: A, country: "USA" },
    { label: "no-ip/US", country: "US" },
    { label: "zone-id/US", ip: "fe80::1%eth0", country: "US" },
  ];
  for (const c of cases) {
    await withGate({}, async calls => {
      const out = await call({ key: "key-b", ip: c.ip, country: c.country });
      assert.strictEqual(out.status, 400, `a6 ${c.label}: expected 400, got ${out.status}`);
      assert.deepStrictEqual(out.body, { deepbench_gate: true, reason: "end_user_invalid" }, `a6 ${c.label}: body`);
      assert.strictEqual(out.cors, "*", `a6 ${c.label}: cors ${out.cors}`);
      assert.strictEqual(ipReads(calls), 0, `a6 ${c.label}: no ip read allowed, saw ${ipReads(calls)}`);
    });
  }
  return "a6-invalid-end-user-refused-400";
}

async function a7() {
  await withGate({}, async () => {
    const out = await call({ key: "key-b", ip: A, country: "MX" });
    assert.strictEqual(out.status, 403, `a7 MX: expected 403, got ${out.status}`);
    assert.deepStrictEqual(out.body, { deepbench_gate: true, reason: "geo", ip: A }, "a7 MX: body");
  });
  await withGate({ stats: { [S]: ZERO } }, async () => {
    assertPass(await call({ vercelCountry: "CA" }), "a7 keyless CA");
  });
  await withGate({}, async () => {
    const out = await call({ vercelCountry: "DE" });
    assert.strictEqual(out.status, 403, `a7 DE: expected 403, got ${out.status}`);
    assert.deepStrictEqual(out.body, { deepbench_gate: true, reason: "geo", ip: S }, "a7 DE: body");
  });
  return "a7-us-ca-allowed-others-geo";
}

async function a8() {
  await withGate({ rows: { [S]: { ...TRIAL, permission: "blocked", block_reason: "spend_cap" } } }, async calls => {
    const out = await call({ ip: A, country: "US" });
    assert.strictEqual(out.status, 403, `a8 keyless: expected 403, got ${out.status}`);
    assert.strictEqual(out.body.reason, "spend_cap", `a8 keyless: reason ${out.body.reason}`);
    assert.strictEqual(out.body.ip, S, `a8 keyless: ip ${out.body.ip}`);
    const holdsA = calls.filter(c => c.url.includes(A) || c.url.includes(encodeURIComponent(A)) || (c.body || "").includes(A)).length;
    assert.strictEqual(holdsA, 0, `a8 keyless: ${holdsA} recorded call(s) hold A -- headers honoured without a key`);
  });
  await withGate({}, async () => {
    const out = await call({ key: "key-zzz", ip: A, country: "US" });
    assert.strictEqual(out.status, 401, `a8 key-zzz: expected 401, got ${out.status}`);
    assert.deepStrictEqual(out.body, { deepbench_gate: true, reason: "unknown_key" }, "a8 key-zzz: body");
  });
  return "a8-headers-ignored-without-known-key";
}

async function a9() {
  await withGate({}, async calls => {
    const out = await call({ key: "key-a", ip: A, country: "US" });
    assert.strictEqual(out.status, 403, `a9 key-a: expected 403, got ${out.status}`);
    assert.deepStrictEqual(out.body, { deepbench_gate: true, reason: "site_cap", stats: { llm_calls: 12, total_tokens: 3400, cost_usd: 6.5 } }, "a9 key-a: body");
    assert.strictEqual(ipReads(calls), 0, `a9 key-a: no ip read allowed, saw ${ipReads(calls)}`);
  });
  await withGate({}, async () => {
    const out = await call({ key: "key-d", ip: A, country: "US" });
    assert.strictEqual(out.status, 403, `a9 key-d: expected 403, got ${out.status}`);
    assert.deepStrictEqual(out.body, { deepbench_gate: true, reason: "site_blocked" }, "a9 key-d: body");
  });
  return "a9-site-key-budget-checked-first";
}

async function a10() {
  await withGate({}, async calls => {
    const out = await call({ key: "key-b" });
    assertPass(out, "a10");
    assert.strictEqual(out.res.headers.get("x-middleware-override-headers"), null, "a10: a keyed call without end-user headers must not override headers");
    assert.strictEqual(ipReads(calls), 0, `a10: no ip read allowed, saw ${ipReads(calls)}`);
  });
  return "a10-keyed-call-without-headers-unchanged";
}

async function a11() {
  await withGate({ rows: { [A]: TRIAL }, stats: { [A]: OVER } }, async () => {
    const out = await call({ key: "key-c", ip: A, country: "US" });
    assert.strictEqual(out.status, 403, `a11: an unlimited key must still meter the person, got ${out.status}`);
    assert.strictEqual(out.body.reason, "spend_cap", `a11: reason ${out.body.reason}`);
    assert.strictEqual(out.body.ip, A, `a11: ip ${out.body.ip}`);
  });
  return "a11-unlimited-key-still-meters-the-person";
}

const ctxOf = headers => withRequestContext(async () => getRequestContext())({ headers }, {});

async function b1() {
  await withEnv(async () => {
    const valid = { "x-forwarded-for": S, [IP_HEADER]: A, [PROOF_HEADER]: endUserProofHex("service-test", A) };
    const ctx = await ctxOf(valid);
    assert.strictEqual(ctx.callerIp, A, `b1 valid: callerIp ${ctx.callerIp}`);
    assert.strictEqual(ctx.serverIp, S, `b1 valid: serverIp ${ctx.serverIp}`);
    const bad = [
      ["zero proof", { ...valid, [PROOF_HEADER]: "0".repeat(64) }],
      ["proof for B", { ...valid, [PROOF_HEADER]: endUserProofHex("service-test", B) }],
      ["no proof", { "x-forwarded-for": S, [IP_HEADER]: A }],
    ];
    for (const [label, headers] of bad) {
      const c = await ctxOf(headers);
      assert.strictEqual(c.callerIp, S, `b1 ${label}: callerIp ${c.callerIp}`);
      assert.strictEqual(Object.hasOwn(c, "serverIp"), false, `b1 ${label}: serverIp present`);
    }
    delete process.env.SUPABASE_SERVICE_KEY;
    const c = await ctxOf(valid);
    assert.strictEqual(c.callerIp, S, `b1 no secret: callerIp ${c.callerIp}`);
    assert.strictEqual(Object.hasOwn(c, "serverIp"), false, "b1 no secret: serverIp present");
  });
  return "b1-route-trusts-only-a-valid-proof";
}

async function c1() {
  await withEnv(async () => {
    let posted = null;
    globalThis.fetch = async (input, init = {}) => {
      const url = String(input);
      if (String(init.method || "GET").toUpperCase() === "POST" && url.endsWith("/rest/v1/ai_activity_log")) posted = init.body;
      return { ok: true, status: 201, json: async () => [], text: async () => "" };
    };
    const valid = { "x-forwarded-for": S, [IP_HEADER]: A, [PROOF_HEADER]: endUserProofHex("service-test", A) };
    await withRequestContext(async () => logActivity({ aiType: "agt771-seam" }))({ headers: valid }, {});
    assert.ok(posted, "c1 valid: no ai_activity_log POST recorded");
    let body = JSON.parse(posted);
    assert.strictEqual(body.caller_ip, A, `c1 valid: caller_ip ${body.caller_ip}`);
    assert.strictEqual(body.server_ip, S, `c1 valid: server_ip ${body.server_ip}`);
    posted = null;
    await withRequestContext(async () => logActivity({ aiType: "agt771-seam" }))({ headers: { "x-forwarded-for": S, [IP_HEADER]: A } }, {});
    assert.ok(posted, "c1 no proof: no ai_activity_log POST recorded");
    body = JSON.parse(posted);
    assert.strictEqual(body.caller_ip, S, `c1 no proof: caller_ip ${body.caller_ip}`);
    assert.strictEqual(Object.hasOwn(body, "server_ip"), false, "c1 no proof: server_ip key must be absent, not null");
  });
  return "c1-log-row-keeps-server-ip";
}

export default async function run() {
  const results = [];
  for (const arm of [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, b1, c1]) results.push(await arm());
  return results;
}

selfRun(import.meta.url, run);
