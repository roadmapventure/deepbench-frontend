// DeepBench v7.0.1069 | tests/regression/_lib/scoped-count.js | AGT-571 -- own-key counts.
import assert from "assert";

const SHAPING = new Set(["select", "order", "limit", "offset"]);
export function scopeOf(query) {
  const q = String(query ?? "");
  const i = q.indexOf("?");
  if (i < 0) return [];
  return q.slice(i + 1).split("&").filter(Boolean).map(p => p.split("=")[0]).filter(n => !SHAPING.has(n));
}
export function assertScoped(query) {
  const table = String(query ?? "").split("?")[0];
  if (!/^[a-z_][a-z0-9_]*$/.test(table)) throw new Error(`scoped-count: '${query}' names no table`);
  if (!scopeOf(query).length) throw new Error(`scoped-count: '${query}' counts the whole of ${table} (AGT-571)`);
  return query;
}
export async function countScoped(url, key, query, { fetchImpl = fetch } = {}) {
  assertScoped(query);
  const res = await fetchImpl(`${String(url).replace(/\/+$/, "")}/rest/v1/${query}`, {
    method: "HEAD", headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" } });
  const range = res.headers.get("content-range") || "";
  const n = Number(range.split("/")[1]);
  if (!res.ok || !Number.isInteger(n)) throw new Error(`scoped-count: ${query} -> HTTP ${res.status} content-range '${range}'`);
  return n;
}
export async function snapshot(url, key, scopes, opts) {
  const out = {};
  for (const [name, query] of Object.entries(scopes)) out[name] = await countScoped(url, key, query, opts);
  return out;
}
export async function gradeOwnWrites(url, key, scopes, probe, { owns, delta, label = "probe", fetchImpl } = {}) {
  const plus = (base, add) => Object.fromEntries(Object.keys(scopes).map(k => [k, (base?.[k] ?? 0) + (add?.[k] ?? 0)]));
  const before = await snapshot(url, key, scopes, { fetchImpl });
  assert.deepStrictEqual(before, plus(owns), `${label}: its key holds ${JSON.stringify(before)} BEFORE the probe`);
  const result = await probe();
  const after = await snapshot(url, key, scopes, { fetchImpl });
  assert.deepStrictEqual(after, plus(before, delta), `${label}: its own rows moved ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  return { before, after, result };
}
