#!/usr/bin/env node
// DeepBench v7.0.1014 | scripts/security-inventory.js | AGT-654 -- the security advisor's inventory collector: facts only
//
// FEATURE: AGT-654 -- the facts the security advisor (SEC-01) reasons over, gathered by one deterministic script
// with no model call and no spend. Design: docs/design/TRENTON-SECURITY-ADVISOR-1112.md §1 Q2 and §2; kickoff
// docs/kickoffs/v7.0.1014-AGT-654-security-inventory.md.
//
// FACTS ONLY, THREE PROMISES, each one enforced in code below rather than by convention:
//   1. It never reads a row of user data. The database half is the service-role-only RPC
//      public.security_inventory_db() (catalog metadata: grants, RLS flags, row ESTIMATES, call counts), plus two
//      name-only selects (runner_secrets?select=name, capabilities?select=slug,execution_type).
//   2. It never prints, stores or hashes a secret VALUE. Vercel env listings pass through scrubVercelEnv(), which
//      deletes every `value` field at every depth, and are then projected to {key,target,type}; the project's
//      protection-bypass object is reduced to "present yes/no" and a count -- its KEYS are the bypass secrets, so
//      not one of them is kept. The code scan reuses scripts/audit-private-scan.js's detectors and keeps
//      {file, line, detector}: never the matched text, not even the masked form.
//   3. It never changes a system. The only write is --write's ONE security_records row (kind 'inventory').
//
// A SECTION THAT CANNOT BE COLLECTED HERE RETURNS {collected:false, reason} AND THE RUN CONTINUES. A cloud routine
// has no laptop, so the --local sections (`local`, `dashboards`, recovery's backups_root) are absent there by design.
//
// Usage: node scripts/security-inventory.js [--json] [--write] [--local --local-config=<path>] [--session-name=<name>]
//   default   one-screen summary        --json   the whole snapshot
//   --write   inserts ONE security_records row and prints {"inserted":1,"id":"..."}
// Env: SUPABASE_URL + SUPABASE_SERVICE_KEY (required), VERCEL_TOKEN (optional: hosting + Vercel env names).
// Exit: 0 ok; 2 SUPABASE_URL / SUPABASE_SERVICE_KEY missing; 1 a --write failure.

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { scanText } from "./audit-private-scan.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "scripts/security-inventory.js";
const FETCH_TIMEOUT_MS = 20000;

// --- the auth helpers a route can call ---------------------------------------------------------------------------
// Chosen by reading api/_lib/*.js and middleware.js on 2026-11-12 (v7.0.1013). The ONLY request-authenticating
// checks a handler can call are in api/_lib/mcp.js:
//   resolveCallerKey(presented, rows) -- constant-time match of the `x-deepbench-mcp-key` header against the
//                                         MCP key rows in runner_secrets; unlocks the governance lane
//   keysMatch(presented, expected)    -- the constant-time comparison resolveCallerKey() uses
//   mcpHandler(req, res)              -- the MCP transport entry; it runs resolveCallerKey() on every request, so a
//                                         handler that delegates to it is behind that check (on the delegated path)
// middleware.js is NOT a per-handler helper: it is the edge gate on every /api/* path (ip_org_cache spend cap and
// geo rule), recorded once as api.edge_gate with its GET pass-through list. A handler calling none of the helpers
// classifies as 'none' -- which means "no handler-level auth", never "no edge gate".
export const AUTH_HELPERS = Object.freeze(["resolveCallerKey", "keysMatch", "mcpHandler"]);

const stripComments = src => String(src)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/)
  .map(l => (/^\s*\/\//.test(l) ? "" : l.replace(/(^|[^:"'`\\])\/\/.*$/, "$1")))
  .join("\n");

// Pure: a handler's source in, the auth helper names it calls out (sorted), or 'none'.
export function classifyRoute(source) {
  const code = stripComments(source);
  const found = AUTH_HELPERS.filter(name => new RegExp(`\\b${name}\\s*\\(`).test(code));
  return found.length ? found.sort() : "none";
}

// --- database ------------------------------------------------------------------------------------------------------
const WRITE_PRIVS = /^(INSERT|UPDATE|DELETE|TRUNCATE)$/i;
const isTable = t => t.kind === "r" || t.kind === "p";
const isView = t => t.kind === "v" || t.kind === "m";
const has = (list, re) => Array.isArray(list) && list.some(p => re.test(String(p)));

// Pure: the RPC result in, the derived counts out.
export function summarizeDatabase(rpc) {
  const all = Array.isArray(rpc?.tables) ? rpc.tables : [];
  const tables = all.filter(isTable);
  return {
    tables: tables.length,
    tables_no_rls: tables.filter(t => t.rls !== true).length,
    anon_readable: tables.filter(t => has(t.anon, /^SELECT$/i)).length,
    anon_writable: tables.filter(t => has(t.anon, WRITE_PRIVS)).length,
    views_anon_readable: all.filter(isView).filter(t => has(t.anon, /^SELECT$/i)).length,
    definer_functions_anon: Array.isArray(rpc?.definer_functions_anon) ? rpc.definer_functions_anon.length : 0,
  };
}

// Pure: ai_use_30d rows in, the summary out. provider = the model id's prefix (text before the first '-', '/' or '.').
export function summarizeAiUse(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const uniq = xs => [...new Set(xs.filter(x => x !== null && x !== undefined && x !== ""))].sort();
  return {
    models: uniq(list.map(r => r.model)),
    providers: uniq(list.map(r => (r.model ? String(r.model).split(/[-/.]/)[0] : null))),
    agents: uniq(list.map(r => r.agent_id)),
    call_sources: uniq(list.map(r => r.call_source)),
    calls_total: list.reduce((n, r) => n + (Number(r.calls) || 0), 0),
    rows: list.length,
  };
}

// --- Vercel scrubbing ------------------------------------------------------------------------------------------------
// Pure: deletes every `value` field at every depth (and the value-carrying siblings the API also returns). Returns a
// new object; the input is not touched.
const VALUE_KEYS = /^(value|vsmValue|decryptedValue)$/;
export function scrubVercelEnv(json) {
  if (Array.isArray(json)) return json.map(scrubVercelEnv);
  if (json && typeof json === "object") {
    const out = {};
    for (const [k, v] of Object.entries(json)) {
      if (VALUE_KEYS.test(k)) continue;
      out[k] = scrubVercelEnv(v);
    }
    return out;
  }
  return json;
}

// Names and targets only, from an already-scrubbed listing.
const envNames = scrubbed => (Array.isArray(scrubbed?.envs) ? scrubbed.envs : [])
  .map(e => ({ key: e.key, target: Array.isArray(e.target) ? e.target : (e.target ? [e.target] : []), type: e.type ?? null }));

// The protection settings as the API returns them, minus every secret: the bypass object's keys ARE the secrets.
function protectionOf(p) {
  const kind = v => (v && typeof v === "object" ? (v.deploymentType ?? true) : (v ?? null));
  const bypass = p?.protectionBypass && typeof p.protectionBypass === "object" ? Object.keys(p.protectionBypass) : [];
  return {
    password_protection: kind(p?.passwordProtection),
    sso_protection: kind(p?.ssoProtection),
    trusted_ips: kind(p?.trustedIps),
    bypass_present: bypass.length > 0,
    bypass_count: bypass.length,
  };
}

// --- dashboards: data built in vs read from the database -----------------------------------------------------------
const DATA_MIN_BYTES = 256;
const LITERAL_WORDS = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);

// Pure: bytes of inline data literals in a page or bundle -- the outermost [...] / {...} literals of at least
// DATA_MIN_BYTES whose content is only strings, numbers, true/false/null and object keys (no calls, no operators,
// no identifiers). One linear pass with a stack; an impure child makes its parent impure, a pure child does not.
export function embeddedDataBytes(text) {
  const s = String(text ?? "");
  const stack = [];          // {start, open, pure}
  const kept = [];           // maximal pure literals so far: {start, end}
  let i = 0;
  const n = s.length;
  const taint = () => { if (stack.length) stack[stack.length - 1].pure = false; };
  while (i < n) {
    const c = s[i];
    if (stack.length && (c === '"' || c === "'" || c === "`")) {
      let j = i + 1;
      let tmpl = false;
      while (j < n && s[j] !== c) {
        if (s[j] === "\\") j++;
        else if (c !== "`" && s[j] === "\n") break;
        else if (c === "`" && s[j] === "$" && s[j + 1] === "{") tmpl = true;
        j++;
      }
      if (tmpl) taint();
      i = j + 1;
      continue;
    }
    if (c === "[" || c === "{") { stack.push({ start: i, open: c, pure: true }); i++; continue; }
    if (c === "]" || c === "}") {
      const f = stack.pop();
      if (f) {
        if (f.pure && (f.open === "[") === (c === "]")) {
          while (kept.length && kept[kept.length - 1].start > f.start) kept.pop();
          if (i + 1 - f.start >= DATA_MIN_BYTES) kept.push({ start: f.start, end: i + 1 });
        } else if (stack.length) {
          stack[stack.length - 1].pure = false;
        }
      }
      i++;
      continue;
    }
    if (!stack.length) { i++; continue; }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < n && /[\w$]/.test(s[j])) j++;
      const word = s.slice(i, j);
      const prev = s.slice(Math.max(0, i - 1), i);
      const isExponent = /[0-9.]/.test(prev) && /^[eE]\d*$/.test(word);
      const isKey = stack[stack.length - 1].open === "{" && /^\s*:/.test(s.slice(j, j + 8));
      if (!LITERAL_WORDS.has(word) && !isExponent && !isKey) taint();
      i = j;
      continue;
    }
    if (/[\s\d.,:+\-]/.test(c)) { i++; continue; }
    taint();
    i++;
  }
  return kept.reduce((sum, k) => sum + (k.end - k.start), 0);
}

const READS_DATABASE = /supabase\.co|\/rest\/v1\//;

export const snapshotSize = snap => Buffer.byteLength(JSON.stringify(snap), "utf8");

// --- file walking (counts and sizes, never contents -- except a dashboard page, which is measured, not kept) -------
const SKIP_DIRS = new Set(["node_modules", ".git", ".vercel", ".next", ".cache"]);
const WALK_LIMIT = 200000;
function walk(rootAbs, onFile) {
  const stackDirs = [rootAbs];
  let seen = 0;
  let truncated = false;
  while (stackDirs.length) {
    const dir = stackDirs.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) stackDirs.push(abs); continue; }
      if (!e.isFile()) continue;
      if (++seen > WALK_LIMIT) { truncated = true; return { seen: seen - 1, truncated }; }
      onFile(abs, e.name);
    }
  }
  return { seen, truncated };
}

const notCollected = reason => ({ collected: false, reason });

// --- the pure snapshot assembler -------------------------------------------------------------------------------------
// Every collected input in, the snapshot out. All the secret-dropping happens HERE, so the test can run it on fixtures
// that carry detector-shaped fake keys and prove none reaches the JSON.
export function buildSnapshot(inp = {}) {
  const snap = { collected_at: inp.collected_at ?? new Date().toISOString(), mode: inp.local ? "cloud+local" : "cloud" };

  // 1. database
  if (inp.rpc && Array.isArray(inp.rpc.tables)) {
    snap.database = { collected: true, ...summarizeDatabase(inp.rpc), detail: inp.rpc };
  } else snap.database = notCollected(inp.rpcError ?? "security_inventory_db RPC did not answer");

  // 2. secrets -- names only
  const sec = { collected: Array.isArray(inp.runnerSecrets) };
  if (Array.isArray(inp.runnerSecrets)) sec.runner_secret_names = inp.runnerSecrets.map(r => r?.name).filter(Boolean).sort();
  else sec.reason = inp.runnerSecretsError ?? "runner_secrets not readable";
  if (inp.vercel?.projects) {
    sec.vercel_env = {
      collected: true,
      projects: inp.vercel.projects.map(p => {
        const raw = inp.vercel.envByProject?.[p.id];
        if (!raw || raw.error) return { project: p.name, collected: false, reason: raw?.error ?? "no listing" };
        return { project: p.name, collected: true, envs: envNames(scrubVercelEnv(raw)) };
      }),
    };
  } else sec.vercel_env = notCollected(inp.vercelError ?? "VERCEL_TOKEN not set");
  snap.secrets = sec;

  // 3. api
  snap.api = inp.api ? { collected: true, ...inp.api } : notCollected(inp.apiError ?? "api/ not readable");

  // 4. mcp
  snap.mcp = inp.mcp
    ? { collected: true, ...inp.mcp,
        capabilities: Array.isArray(inp.capabilities)
          ? { collected: true, count: inp.capabilities.length, slugs: inp.capabilities.map(c => ({ slug: c.slug, execution_type: c.execution_type ?? null })) }
          : notCollected(inp.capabilitiesError ?? "capabilities not readable"),
        connectors: notCollected("claude.ai settings; recorded by the attended baseline") }
    : notCollected(inp.mcpError ?? "vercel.json / api/_lib/mcp.js not readable");

  // 5. hosting
  if (inp.vercel?.projects) {
    snap.hosting = {
      collected: true,
      projects: inp.vercel.projects.map(p => ({
        name: p.name, id: p.id, framework: p.framework ?? null,
        domains: (inp.vercel.domainsByProject?.[p.id]?.domains ?? []).map(d => ({ name: d.name, verified: d.verified ?? null, redirect: d.redirect ?? null })),
        protection: protectionOf(p),
      })),
    };
  } else snap.hosting = notCollected(inp.vercelError ?? "VERCEL_TOKEN not set");

  // 6. ai_use
  snap.ai_use = inp.rpc && Array.isArray(inp.rpc.ai_use_30d)
    ? { collected: true, window_days: 30, ...summarizeAiUse(inp.rpc.ai_use_30d) }
    : notCollected("ai_use_30d absent from the RPC result");

  // 7. code_secrets -- the reused detectors; {file, line, detector} only
  if (Array.isArray(inp.codeFiles)) {
    const hits = [];
    for (const f of inp.codeFiles) for (const h of scanText(f.rel, f.text)) hits.push({ file: h.rel, line: h.line, detector: h.detector });
    snap.code_secrets = { collected: true, commits: inp.codeCommits ?? null, files_scanned: inp.codeFiles.length, hits };
  } else snap.code_secrets = notCollected(inp.codeError ?? "git log not readable");

  // 8. recovery
  snap.recovery = {
    collected: true,
    backups_root: inp.local ? (inp.local.backups ?? notCollected("backups_root not set in the local config")) : notCollected("local only (--local)"),
    supabase_backups: notCollected("management API; recorded by the attended baseline"),
    restore_drill: notCollected("management API; recorded by the attended baseline"),
  };

  // 9-10. local only
  if (inp.local) {
    snap.local = inp.local.error ? notCollected(inp.local.error) : { collected: true, roots: inp.local.roots ?? [], disk_encryption: inp.local.disk_encryption };
    snap.dashboards = inp.local.error ? notCollected(inp.local.error) : { collected: true, roots: inp.local.dashboards ?? [] };
  }
  return snap;
}

// --- collectors (IO) ----------------------------------------------------------------------------------------------------
async function getJson(url, headers, init = {}) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), ...init });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return JSON.parse(text);
}

function readRel(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }

function collectApi() {
  const apiAbs = path.join(ROOT, "api");
  const routes = [];
  walk(apiAbs, abs => {
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    if (rel.startsWith("api/_lib/") || !/\.(m?js|ts)$/.test(rel)) return;
    routes.push({ route: "/" + rel.replace(/\.(m?js|ts)$/, ""), file: rel, auth: classifyRoute(fs.readFileSync(abs, "utf8")) });
  });
  routes.sort((a, b) => a.route.localeCompare(b.route));
  const vercel = JSON.parse(readRel("vercel.json"));
  const mw = readRel("middleware.js");
  const matcher = (mw.match(/matcher:\s*['"]([^'"]+)['"]/) || [])[1] ?? null;
  const passSet = (mw.match(/PASS_THROUGH_GETS\s*=\s*new Set\(\[([^\]]*)\]/) || [])[1] ?? "";
  return {
    routes,
    rewrites: vercel.rewrites ?? [],
    api_headers: (vercel.headers ?? []).filter(h => h.source === "/api/(.*)"),
    edge_gate: { file: "middleware.js", matcher, pass_through_gets: [...passSet.matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]) },
  };
}

function collectMcp() {
  const vercel = JSON.parse(readRel("vercel.json"));
  const exec = readRel("api/capabilities/execute.js");
  const lib = readRel("api/_lib/mcp.js");
  return {
    transport: (vercel.rewrites ?? []).filter(r => /transport=mcp/.test(r.destination ?? "")),
    executor_delegates_on_transport_mcp: /transport\s*===\s*["']mcp["'][^\n]*mcpHandler\s*\(/.test(stripComments(exec)),
    auth: {
      file: "api/_lib/mcp.js",
      checks: classifyRoute(lib),
      key_header: (lib.match(/GOVERNANCE_KEY_HEADER\s*=\s*['"]([^'"]+)['"]/) || [])[1] ?? null,
      keys_source: "runner_secrets (names only; values are compared in keysMatch and never leave it)",
    },
  };
}

function collectCodeFiles(commits = 50) {
  const r = spawnSync("git", ["-C", ROOT, "log", `-${commits}`, "--name-only", "--pretty=format:"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error(`git log failed: ${String(r.stderr || r.error).split("\n")[0]}`);
  const rels = [...new Set(r.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean))].sort();
  const files = [];
  for (const rel of rels) {
    let buf;
    try { buf = fs.readFileSync(path.join(ROOT, rel)); } catch { continue; }      // deleted since
    if (buf.length > 4 * 1024 * 1024 || buf.subarray(0, 8192).includes(0)) continue;
    files.push({ rel, text: buf.toString("utf8") });
  }
  return files;
}

async function collectVercel(token) {
  const h = { Authorization: `Bearer ${token}` };
  const base = "https://api.vercel.com";
  const list = await getJson(`${base}/v9/projects?limit=100`, h);
  const projects = list.projects ?? [];
  const envByProject = {};
  const domainsByProject = {};
  for (const p of projects) {
    // never decrypt=true; scrubVercelEnv() drops every value before anything is kept
    try { envByProject[p.id] = scrubVercelEnv(await getJson(`${base}/v9/projects/${encodeURIComponent(p.id)}/env`, h)); }
    catch (e) { envByProject[p.id] = { error: e.message }; }
    try { domainsByProject[p.id] = await getJson(`${base}/v9/projects/${encodeURIComponent(p.id)}/domains`, h); }
    catch (e) { domainsByProject[p.id] = { domains: [], error: e.message }; }
  }
  return { projects, envByProject, domainsByProject };
}

function newestFile(rootAbs) {
  let newest = null;
  const res = walk(rootAbs, abs => {
    try { const m = fs.statSync(abs).mtimeMs; if (!newest || m > newest.mtimeMs) newest = { mtimeMs: m }; } catch { /* unreadable */ }
  });
  return { collected: true, newest_file_date: newest ? new Date(newest.mtimeMs).toISOString() : null, files_seen: res.seen, truncated: res.truncated };
}

function diskEncryption() {
  const r = spawnSync("manage-bde", ["-status", "C:"], { encoding: "utf8", timeout: 15000 });
  if (r.error) return notCollected(`manage-bde: ${r.error.code || r.error.message}`);
  if (r.status !== 0) return notCollected(`manage-bde exited ${r.status}: ${String(r.stdout || r.stderr).split(/\r?\n/).filter(Boolean).slice(-1)[0] ?? ""}`.trim());
  const pick = label => ((r.stdout.match(new RegExp(`${label}:\\s*(.+)`)) || [])[1] ?? "").trim() || null;
  return { collected: true, volume: "C:", conversion_status: pick("Conversion Status"), protection_status: pick("Protection Status"), encryption_method: pick("Encryption Method") };
}

function collectLocal(configPath) {
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(configPath, "utf8")); }
  catch (e) { return { error: `local config not readable: ${e.code || e.message}` }; }
  const patterns = (cfg.name_patterns ?? []).map(p => { try { return new RegExp(p, "i"); } catch { return null; } }).filter(Boolean);
  const roots = (cfg.scan_roots ?? []).map(root => {
    if (!fs.existsSync(root)) return { root, collected: false, reason: "path does not exist" };
    const files_by_ext = {};
    const bytes_by_ext = {};
    let sensitive_names = 0;
    const res = walk(root, (abs, name) => {
      const ext = (path.extname(name).slice(1) || "(none)").toLowerCase();
      files_by_ext[ext] = (files_by_ext[ext] ?? 0) + 1;
      try { bytes_by_ext[ext] = (bytes_by_ext[ext] ?? 0) + fs.statSync(abs).size; } catch { /* unreadable */ }
      if (patterns.some(re => re.test(name))) sensitive_names++;
    });
    return { root, collected: true, under_sync: /onedrive/i.test(root), files_by_ext, bytes_by_ext, sensitive_names, files_seen: res.seen, truncated: res.truncated };
  });
  const dashboards = (cfg.dashboard_roots ?? []).map(root => {
    if (!fs.existsSync(root)) return { root, collected: false, reason: "path does not exist" };
    const pages = [];
    const data_files = [];
    walk(root, (abs, name) => {
      const rel = path.relative(root, abs).replace(/\\/g, "/");
      const ext = path.extname(name).toLowerCase();
      let size = 0;
      try { size = fs.statSync(abs).size; } catch { return; }
      if (ext === ".json" || ext === ".csv") { data_files.push({ file: rel, bytes: size }); return; }
      if (ext !== ".html" && ext !== ".htm" && ext !== ".js" && ext !== ".mjs") return;
      if (size > 16 * 1024 * 1024) { pages.push({ file: rel, bytes: size, collected: false, reason: "over 16 MB" }); return; }
      const text = fs.readFileSync(abs, "utf8");
      pages.push({ file: rel, bytes: size, embedded_data_bytes: embeddedDataBytes(text), reads_database: READS_DATABASE.test(text) });
    });
    const inline = pages.reduce((n, p) => n + (p.embedded_data_bytes ?? 0), 0);
    const shipped = data_files.reduce((n, f) => n + f.bytes, 0);
    return { root, collected: true, pages, data_files, embedded_data_bytes: inline + shipped, inline_bytes: inline, shipped_data_bytes: shipped,
      pages_reading_database: pages.filter(p => p.reads_database).length };
  });
  return {
    roots, dashboards,
    backups: cfg.backups_root ? (fs.existsSync(cfg.backups_root) ? newestFile(cfg.backups_root) : notCollected("backups_root does not exist")) : null,
    disk_encryption: diskEncryption(),
  };
}

export async function collect({ url, key, vercelToken, localConfig = null } = {}) {
  const base = url.replace(/\/+$/, "");
  const svc = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const inp = { collected_at: new Date().toISOString() };
  try { inp.rpc = await getJson(`${base}/rest/v1/rpc/security_inventory_db`, svc, { method: "POST", body: "{}" }); }
  catch (e) { inp.rpcError = `security_inventory_db: ${e.message}`; }
  try { inp.runnerSecrets = await getJson(`${base}/rest/v1/runner_secrets?select=name`, svc); }
  catch (e) { inp.runnerSecretsError = `runner_secrets: ${e.message}`; }
  try { inp.capabilities = await getJson(`${base}/rest/v1/capabilities?select=slug,execution_type&order=slug`, svc); }
  catch (e) { inp.capabilitiesError = `capabilities: ${e.message}`; }
  if (vercelToken) {
    try { inp.vercel = await collectVercel(vercelToken); } catch (e) { inp.vercelError = `Vercel API: ${e.message}`; }
  }
  try { inp.api = collectApi(); } catch (e) { inp.apiError = e.message; }
  try { inp.mcp = collectMcp(); } catch (e) { inp.mcpError = e.message; }
  try { inp.codeFiles = collectCodeFiles(50); inp.codeCommits = 50; } catch (e) { inp.codeError = e.message; }
  if (localConfig !== null) inp.local = localConfig ? collectLocal(localConfig) : { error: "--local needs --local-config=<path>" };
  return buildSnapshot(inp);
}

// --- CLI ------------------------------------------------------------------------------------------------------------------
function summaryLines(snap) {
  const flag = s => (s?.collected ? "collected" : `NOT collected (${s?.reason ?? "?"})`);
  const d = snap.database;
  const out = [`security inventory ${snap.collected_at} (${snap.mode}) -- ${snapshotSize(snap)} bytes`];
  out.push(`  database      ${flag(d)}${d?.collected ? ` -- ${d.tables} tables, ${d.tables_no_rls} without RLS, anon readable ${d.anon_readable}, anon writable ${d.anon_writable}, views anon-readable ${d.views_anon_readable}, definer functions anon ${d.definer_functions_anon}` : ""}`);
  out.push(`  secrets       ${flag(snap.secrets)}${snap.secrets?.runner_secret_names ? ` -- ${snap.secrets.runner_secret_names.length} runner_secrets names; Vercel env ${flag(snap.secrets.vercel_env)}` : ""}`);
  out.push(`  api           ${flag(snap.api)}${snap.api?.routes ? ` -- ${snap.api.routes.length} routes, ${snap.api.routes.filter(r => r.auth === "none").length} with no handler-level auth` : ""}`);
  out.push(`  mcp           ${flag(snap.mcp)}${snap.mcp?.capabilities?.count !== undefined ? ` -- ${snap.mcp.capabilities.count} capabilities` : ""}`);
  out.push(`  hosting       ${flag(snap.hosting)}${snap.hosting?.projects ? ` -- ${snap.hosting.projects.length} projects` : ""}`);
  out.push(`  ai_use        ${flag(snap.ai_use)}${snap.ai_use?.collected ? ` -- ${snap.ai_use.calls_total} calls, ${snap.ai_use.models.length} models, providers ${snap.ai_use.providers.join(",")}` : ""}`);
  out.push(`  code_secrets  ${flag(snap.code_secrets)}${snap.code_secrets?.collected ? ` -- ${snap.code_secrets.files_scanned} files, ${snap.code_secrets.hits.length} hits` : ""}`);
  out.push(`  recovery      backups_root ${flag(snap.recovery.backups_root)}`);
  if (snap.local) out.push(`  local         ${flag(snap.local)}`);
  if (snap.dashboards) out.push(`  dashboards    ${flag(snap.dashboards)}`);
  return out;
}

async function main(argv) {
  const args = Object.fromEntries(argv.map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("security-inventory: SUPABASE_URL and SUPABASE_SERVICE_KEY are required (read them by name from runner_secrets).");
    return 2;
  }
  const localConfig = args.local ? (typeof args["local-config"] === "string" ? args["local-config"] : "") : null;
  const snap = await collect({ url, key, vercelToken: process.env.VERCEL_TOKEN || null, localConfig });

  if (args.write) {
    const row = {
      kind: "inventory",
      title: `Inventory ${snap.collected_at.slice(0, 10)} (${snap.mode})`,
      data: snap,
      source: SOURCE,
      session_name: typeof args["session-name"] === "string" ? args["session-name"] : null,
    };
    try {
      const r = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/security_records?select=id`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(row),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const body = await r.text();
      if (!r.ok) { console.error(`security-inventory: write failed HTTP ${r.status}: ${body.slice(0, 300)}`); return 1; }
      const [ins] = JSON.parse(body);
      console.log(JSON.stringify({ inserted: 1, id: ins?.id ?? null }));
      return 0;
    } catch (e) {
      console.error(`security-inventory: write failed: ${e.message}`);
      return 1;
    }
  }
  if (args.json) console.log(JSON.stringify(snap, null, 2));
  else console.log(summaryLines(snap).join("\n"));
  return 0;
}

const isEntry = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntry) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, e => { console.error(`security-inventory: ${e.message}`); process.exitCode = 1; });
}
