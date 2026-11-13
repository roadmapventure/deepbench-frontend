// DeepBench v7.0.1014 | tests/regression/agt-654-security-inventory.test.mjs | AGT-654 -- the security inventory collector: facts only, no secret value out
//
// FEATURE: AGT-654 -- scripts/security-inventory.js, the facts the security advisor reasons over. Arms (kickoff
// docs/kickoffs/v7.0.1014-AGT-654-security-inventory.md §5 T3), each with its control:
//   (A) scrubVercelEnv drops every `value` at every depth, keeps names/targets (control: a nested value is caught)
//   (B) summarizeDatabase counts match a fixture (control: flip one rls and the count moves)
//   (C) classifyRoute names the real auth helper (exported by api/_lib/mcp.js) and says 'none' for a bare handler
//   (D) embeddedDataBytes: a 5 KB inline array > 0; a page that only fetches -> 0
//   (E) no secret VALUE reaches the snapshot: fixtures carry a fake key shaped like every private-scan detector; the
//       JSON holds none of them (control: the raw inputs do, and the detectors do fire on them)
//   (F) Rule #1: no agent id in the script's non-comment lines (control: a spliced `const a = '<id>';` is caught)
//   (G) LIVE (credentials, else notRun): --json exits 0, database collected, > 100 tables, < 500 KB; --write inserts
//       ONE row and the test reads it back by id. It deletes nothing.
// The fake keys are ASSEMBLED AT RUNTIME from fragments, so no line of this file is itself detector-shaped (the
// change-scoped private scan, AGT-168, grades added lines).
// BASELINE: new file; on the unchanged tree scripts/security-inventory.js does not exist and every arm is red.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { allowlistReason } from "../../scripts/audit-private-scan.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT_REL = "scripts/security-inventory.js";
const SCRIPT_ABS = path.join(ROOT, SCRIPT_REL);
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const deepHasKey = (o, key) => Array.isArray(o) ? o.some(x => deepHasKey(x, key))
  : (o && typeof o === "object") ? Object.entries(o).some(([k, v]) => k === key || deepHasKey(v, key)) : false;

// ---------------------------------------------------------------------------------------------------------------------
async function partA_scrub(mod) {
  const results = [];
  const fixture = {
    envs: [
      { key: "FIRST_NAME", target: ["production", "preview"], type: "encrypted", value: "v-one" },
      { key: "SECOND_NAME", target: ["development"], type: "plain", value: "v-two", nested: { value: "v-three", deeper: [{ value: "v-four" }] } },
    ],
    pagination: { value: "v-five" },
  };
  const out = mod.scrubVercelEnv(fixture);
  assert.ok(!deepHasKey(out, "value"), `scrubVercelEnv left a value field: ${JSON.stringify(out)}`);
  for (const v of ["v-one", "v-two", "v-three", "v-four", "v-five"]) assert.ok(!JSON.stringify(out).includes(v), `scrubbed output still carries ${v}`);
  assert.deepStrictEqual(out.envs.map(e => [e.key, e.target, e.type]),
    [["FIRST_NAME", ["production", "preview"], "encrypted"], ["SECOND_NAME", ["development"], "plain"]], "names/targets/types not kept");
  assert.ok(deepHasKey(fixture, "value"), "scrubVercelEnv mutated its input");
  results.push("A-scrub-drops-every-value-keeps-names-targets");
  // control: the detector used above does see a nested value
  assert.ok(deepHasKey({ a: [{ b: { value: 1 } }] }, "value"), "control: deepHasKey missed a nested value");
  const shallow = o => ({ ...o, envs: o.envs.map(({ value, ...rest }) => rest) });   // a top-level-only scrub
  assert.ok(deepHasKey(shallow(fixture), "value"), "control: a shallow scrub's nested value was not caught");
  results.push("A-control-nested-value-caught");
  return results;
}

// ---------------------------------------------------------------------------------------------------------------------
const T = (name, kind, rls, anon = []) => ({ schema: "public", name, kind, rls, rls_forced: false, policies: 0, policy_roles: [], anon, authenticated: [], row_estimate: 1 });
const RPC_FIXTURE = () => ({
  collected_at: "2026-11-12T00:00:00Z",
  tables: [
    T("t1", "r", true), T("t2", "r", false, ["SELECT"]), T("t3", "r", false, ["SELECT", "INSERT"]), T("t4", "p", true, ["DELETE"]),
    T("v1", "v", false, ["SELECT"]), T("v2", "v", false), T("m1", "m", false, ["SELECT"]),
  ],
  definer_functions_anon: ["public.f1", "public.f2"],
  buckets: [{ id: "b", public: false }], extensions: ["plpgsql"], auth_users: 0,
  ai_use_30d: [{ model: "claude-x-1", agent_id: "a1", call_source: "mcp", calls: 3 }, { model: "text-embed-1", agent_id: null, call_source: null, calls: 4 }],
});

async function partB_database(mod) {
  const results = [];
  const rpc = RPC_FIXTURE();
  assert.deepStrictEqual(mod.summarizeDatabase(rpc),
    { tables: 4, tables_no_rls: 2, anon_readable: 2, anon_writable: 2, views_anon_readable: 2, definer_functions_anon: 2 }, "fixture counts");
  results.push("B-summarize-counts-match");
  rpc.tables[0].rls = false;
  assert.strictEqual(mod.summarizeDatabase(rpc).tables_no_rls, 3, "control: flipping one rls did not move tables_no_rls");
  results.push("B-control-flip-rls-moves-count");
  const ai = mod.summarizeAiUse(RPC_FIXTURE().ai_use_30d);
  assert.deepStrictEqual([ai.calls_total, ai.providers], [7, ["claude", "text"]], `ai_use summary: ${JSON.stringify(ai)}`);
  results.push("B-ai-use-summary");
  return results;
}

// ---------------------------------------------------------------------------------------------------------------------
async function partC_routes(mod) {
  const results = [];
  const lib = read("api/_lib/mcp.js");
  const realExported = mod.AUTH_HELPERS.filter(h => new RegExp(`export\\s+(?:async\\s+)?(?:function\\s+${h}\\b|const\\s+${h}\\b)`).test(lib));
  assert.ok(realExported.includes("resolveCallerKey"), `resolveCallerKey is not an export of api/_lib/mcp.js: ${realExported}`);
  assert.deepStrictEqual(realExported.sort(), [...mod.AUTH_HELPERS].sort(), `AUTH_HELPERS names a helper api/_lib/mcp.js does not export: ${mod.AUTH_HELPERS} vs ${realExported}`);
  const guarded = [
    "import { resolveCallerKey } from './_lib/mcp.js';",
    "export default async function handler(req, res) {",
    "  const { governanceUnlocked } = resolveCallerKey(req.headers['x-deepbench-mcp-key'], await keys());",
    "  if (!governanceUnlocked) return res.status(401).end();",
    "  res.json({ ok: true });",
    "}",
  ].join("\n");
  assert.deepStrictEqual(mod.classifyRoute(guarded), ["resolveCallerKey"], "a handler calling the real helper");
  results.push("C-guarded-handler-names-resolveCallerKey");
  const bare = "export default async function handler(req, res) {\n  // resolveCallerKey(req) is only mentioned in a comment\n  res.json({ ok: true });\n}";
  assert.strictEqual(mod.classifyRoute(bare), "none", "a bare handler (helper only named in a comment)");
  results.push("C-bare-handler-none");
  assert.deepStrictEqual(mod.classifyRoute(read("api/capabilities/execute.js")), ["mcpHandler"], "the real executor delegates to mcpHandler");
  results.push("C-real-executor-mcpHandler");
  return results;
}

// ---------------------------------------------------------------------------------------------------------------------
async function partD_embedded(mod) {
  const results = [];
  const rows = [];
  for (let i = 0; rows.join(",").length < 5200; i++) rows.push(`{"id":${i},"name":"Vendor ${i}","amount":${(i * 13.7).toFixed(2)},"active":${i % 2 === 0}}`);
  const inline = `<!doctype html><html><body><div id="app"></div><script>\nconst DATA = [${rows.join(",")}];\nrender(DATA.filter(d => d.active));\n</script></body></html>`;
  const n = mod.embeddedDataBytes(inline);
  assert.ok(n >= 5000, `a 5 KB inline array measured ${n} bytes (expected >= 5000)`);
  results.push(`D-inline-5kb-array-${n}-bytes`);
  const fetching = `<!doctype html><html><body><script>\nfetch("https://example.supabase.co/rest/v1/items?select=*", { headers: { apikey: KEY, Authorization: "Bearer " + KEY } })\n  .then(r => r.json()).then(items => { for (const it of items) render(it); });\n</script></body></html>`;
  assert.strictEqual(mod.embeddedDataBytes(fetching), 0, "a page that only fetches must measure 0");
  results.push("D-fetch-only-page-0");
  return results;
}

// ---------------------------------------------------------------------------------------------------------------------
// One fake value per detector in scripts/audit-private-scan.js, assembled from fragments.
function fakeKeys() {
  const r = (ch, k) => ch.repeat(k);
  return {
    pem_private_key: ["-----", "BEGIN RSA ", "PRIVATE KEY", "-----"].join(""),
    anthropic_key: ["sk", "-ant-", "api03", r("Q", 24)].join(""),
    openai_key: ["sk", "-proj", r("W", 26)].join(""),
    supabase_secret: ["sb", "_secret_", r("E", 22)].join(""),
    github_token: ["gh", "p_", r("R", 30)].join(""),
    jwt: ["ey", "J", r("T", 12), ".", r("Y", 12), ".", r("U", 12)].join(""),
    aws_key: ["AK", "IA", r("I", 16)].join(""),
    vercel_bypass: r("Zq", 16),
    secret_assignment: ["Lmn", r("o", 10), "7", r("p", 8)].join(""),
    personal_email: ["fake.person", "@", "gmail", ".com"].join(""),
    personal_path: ["C:", "/", "Users", "/", "fakeperson"].join(""),
  };
}

async function partE_noSecretOut(mod) {
  const results = [];
  const K = fakeKeys();
  const values = Object.values(K);
  const codeText = [
    `const a = "${K.pem_private_key}";`,
    `const b = "${K.anthropic_key}";`,
    `const c = "${K.openai_key}";`,
    `const d = "${K.supabase_secret}";`,
    `const e = "${K.github_token}";`,
    `const f = "${K.jwt}";`,
    `const g = "${K.aws_key}";`,
    `const h = { "x-vercel-protection-bypass": "${K.vercel_bypass}" };`,
    `API_SECRET = "${K.secret_assignment}"`,
    `contact ${K.personal_email}`,
    `home ${K.personal_path}/docs`,
  ].join("\n");
  const inputs = {
    collected_at: "2026-11-12T00:00:00Z",
    rpc: RPC_FIXTURE(),
    runnerSecrets: values.map((v, i) => ({ name: `SECRET_${i}`, value: v })),
    capabilities: [{ slug: "s1", execution_type: "ai" }],
    vercel: {
      projects: [{ id: "prj_1", name: "p1", framework: "vite", ssoProtection: { deploymentType: "preview" }, protectionBypass: { [K.vercel_bypass]: { scope: "automation-bypass" } } }],
      envByProject: { prj_1: { envs: values.map((v, i) => ({ key: `ENV_${i}`, target: ["production"], type: "plain", value: v, decrypted: true })) } },
      domainsByProject: { prj_1: { domains: [{ name: "p1.example.com", verified: true }] } },
    },
    api: { routes: [], rewrites: [], api_headers: [], edge_gate: {} },
    mcp: { transport: [] },
    codeFiles: [{ rel: "fixture/leaky.js", text: codeText }],
    codeCommits: 1,
  };
  // controls first: the raw inputs carry every fake, and the detectors fire on every fake
  const raw = JSON.stringify(inputs);
  for (const [k, v] of Object.entries(K)) assert.ok(raw.includes(v), `control setup: fake ${k} absent from the raw inputs`);
  const snap = mod.buildSnapshot(inputs);
  const hitKinds = new Set(snap.code_secrets.hits.map(h => h.detector));
  // aws_key CANNOT fire through the reused module today: every AKIA/ASIA key is upper-case alphanumeric, so the
  // ALLOWLIST's identifier row (/^[A-Z][A-Z0-9_]+$/) accepts it as a variable name. That is audit-private-scan.js's
  // own behaviour, reported at the AGT-654 stop line, not patched here; pinned so a fix to it is noticed.
  assert.ok(allowlistReason(K.aws_key), "aws_key is no longer allowlisted -- drop it from UNREACHABLE below");
  const UNREACHABLE = new Set(["aws_key"]);
  for (const k of Object.keys(K)) if (!UNREACHABLE.has(k)) assert.ok(hitKinds.has(k), `control: detector ${k} did not fire on its fake (hits: ${[...hitKinds]})`);
  results.push(`E-control-raw-inputs-carry-all-${values.length}-and-${hitKinds.size}-detectors-fire`);

  const out = JSON.stringify(snap);
  const leaked = Object.entries(K).filter(([, v]) => out.includes(v)).map(([k]) => k);
  assert.deepStrictEqual(leaked, [], `secret values reached the snapshot JSON: ${leaked}`);
  // the masked prefix must not appear either (the snapshot keeps {file,line,detector}, never text)
  assert.ok(!snap.code_secrets.hits.some(h => "text" in h), "a code_secrets hit carries text");
  assert.ok(!deepHasKey(snap, "value"), "a `value` field survived into the snapshot");
  assert.deepStrictEqual(snap.secrets.runner_secret_names.length, values.length, "runner_secrets names not kept");
  assert.strictEqual(snap.hosting.projects[0].protection.bypass_present, true, "bypass presence not recorded");
  results.push("E-no-secret-value-in-snapshot-json");
  return results;
}

// ---------------------------------------------------------------------------------------------------------------------
const codeLines = src => src.split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const idsIn = (src, ids) => ids.filter(id => new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(codeLines(src)));

async function agentIds() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (url && key) {
    const r = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/agents?select=id`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) assert.fail(`agents?select=id failed: HTTP ${r.status}`);
    return { ids: (await r.json()).map(x => x.id), source: "live agents?select=id" };
  }
  const { AGENTS } = await import("../../src/data/agents.js");
  return { ids: AGENTS.map(a => a.id), source: "src/data/agents.js AGENTS" };
}

async function partF_ruleOne() {
  const results = [];
  const src = read(SCRIPT_REL);
  const { ids, source } = await agentIds();
  assert.ok(ids.length > 0, `no agent ids from ${source}`);
  assert.deepStrictEqual(idsIn(src, ids), [], `the script names an agent id in a code line (Rule #1), ids from ${source}`);
  results.push(`F-no-agent-id-in-code (${ids.length} ids, ${source})`);
  const spliced = `${src}\nconst a = '${["tren", "ton"].join("")}';\n`;
  assert.ok(idsIn(spliced, ids.includes("trenton") ? ids : [...ids, "trenton"]).length > 0, "control: a spliced agent id was not caught");
  results.push("F-control-spliced-id-caught");
  return results;
}

// ---------------------------------------------------------------------------------------------------------------------
async function partG_live() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (--json snapshot over the real RPC, --write one security_records row read back by id)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured when this shipped (2026-11-12): 104 tables, 96 without RLS.");
    return results;
  }
  const run = args => spawnSync(process.execPath, [SCRIPT_ABS, ...args], { encoding: "utf8", env: process.env, maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
  const j = run(["--json"]);
  assert.strictEqual(j.status, 0, `--json exited ${j.status}: ${String(j.stderr).slice(0, 300)}`);
  const bytes = Buffer.byteLength(j.stdout, "utf8");
  assert.ok(bytes < 500 * 1024, `--json output is ${bytes} bytes (limit 500 KB)`);
  const snap = JSON.parse(j.stdout);
  assert.strictEqual(snap.database?.collected, true, `database not collected: ${JSON.stringify(snap.database?.reason)}`);
  assert.ok(snap.database.tables > 100, `database.tables = ${snap.database.tables} (expected > 100)`);
  for (const v of [key, process.env.VERCEL_TOKEN].filter(Boolean)) assert.ok(!j.stdout.includes(v), "a credential value reached --json output");
  results.push(`G-live-json (${bytes} bytes, ${snap.database.tables} tables, ${snap.database.tables_no_rls} without RLS)`);

  const w = run(["--write", "--session-name=agt-654-regression"]);
  assert.strictEqual(w.status, 0, `--write exited ${w.status}: ${String(w.stderr).slice(0, 300)}`);
  const ack = JSON.parse(w.stdout.trim().split("\n").pop());
  assert.strictEqual(ack.inserted, 1, `--write ack: ${w.stdout}`);
  assert.ok(/^[0-9a-f-]{36}$/.test(String(ack.id)), `--write returned no id: ${w.stdout}`);
  const r = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/security_records?id=eq.${ack.id}&select=id,kind,source,title`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  assert.strictEqual(r.status, 200, `read-back HTTP ${r.status}`);
  const rows = await r.json();
  assert.strictEqual(rows.length, 1, `read-back by id found ${rows.length} rows`);
  assert.strictEqual(rows[0].kind, "inventory");
  assert.strictEqual(rows[0].source, SCRIPT_REL);
  assert.ok(/^Inventory \d{4}-\d{2}-\d{2} \(cloud(\+local)?\)$/.test(rows[0].title), `title: ${rows[0].title}`);
  results.push(`G-live-write-one-row-read-back (${ack.id})`);
  return results;
}

async function run() {
  assert.ok(fs.existsSync(SCRIPT_ABS), `${SCRIPT_REL} does not exist`);
  const mod = await import("../../scripts/security-inventory.js");
  const results = [];
  results.push(...(await partA_scrub(mod)));
  results.push(...(await partB_database(mod)));
  results.push(...(await partC_routes(mod)));
  results.push(...(await partD_embedded(mod)));
  results.push(...(await partE_noSecretOut(mod)));
  results.push(...(await partF_ruleOne()));
  results.push(...(await partG_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
