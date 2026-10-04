// DeepBench v7.0.760 | tests/regression/agt-165-connect-page.test.mjs | AGT-165 -> AGT-334 slice 2 -- /connect
// is now the redirect into the Connect popup on Brittany's personnel file.
//
// Red on the unchanged tree: src/screens/ConnectScreen.jsx is still the AGT-165 page -- it carries no
// Navigate line (arm a) and all 14 retired strings (arm a2).
//
// ARMS (kickoff docs/kickoffs/v7.0.760-AGT-334-connect-redirect.md §5 task 2), read as text -- no
// DOM and no git history (CI clones at depth 1):
//   a  the screen carries every STRINGS entry verbatim: the Navigate import and the one
//      <Navigate to="/bench/brittany?connect=1" replace /> element.
//   a2 THE RETIRED-PAGE GATE: the screen carries none of the 14 REMOVED strings (the AGT-165 steps,
//      the prompt box, the Teach link, the typed /api/mcp). Control: the same text with one REMOVED
//      string appended MUST yield one stale hit, so a revert of the removal turns this red.
//   b  THE NO-SECRET GATE: the screen matches none of the key header, the key's name, the bypass
//      headers, a vercel.app host or a literal hex colour. Control: the same text with a key header
//      spliced in MUST be caught, which proves the gate reads the file rather than passing vacuously.
//   c  src/main.jsx imports ConnectScreen and routes path="/connect" to it. Control: the same text
//      with the Route line removed MUST fail.
//   LIVE (else declared not-run): Brittany is still an active product-lane agent, and no MCP*
//      secret NAME appears in the screen source. Secret VALUES are never read.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCREEN = path.join(ROOT, "src", "screens", "ConnectScreen.jsx");
const MAIN = path.join(ROOT, "src", "main.jsx");

const REMOVED = [
  "Connect Brittany to Claude",
  "Open Claude's settings and go to Connectors.",
  "Choose Add custom connector and paste this URL:",
  "Leave the key or authentication field blank — Brittany needs no key. The one key DeepBench holds unlocks its internal governance agents, so it is never shown on a page.",
  "Start a new chat and paste this:",
  'Use the Agent Knowledge Bundle tool with task_context.agent_id "brittany", then answer as Brittany: what do you know about my product?',
  "Teaching Brittany",
  "Brittany starts blank: no role prompt, no guardrails, no library access. She knows only what you give her.",
  "Teach Brittany",
  "Comparison test",
  "Ask the same question in a chat with the connector switched off. Brittany answers from what you taught her; the other answer is the model's own general knowledge. The difference is what your training bought.",
  "window.location.origin",
  '"/api/mcp"',
  "/bench/brittany/teach",
];

const STRINGS = [
  'import { Navigate } from "react-router-dom";',
  '<Navigate to="/bench/brittany?connect=1" replace />',
];

const FORBIDDEN = [
  /x-deepbench-mcp-key/i,
  /MCP_API_KEY/,
  /x-db-gate-bypass/i,
  /x-vercel-protection-bypass/i,
  /vercel\.app/i,
  /#[0-9a-fA-F]{6}\b/,
];

const secretHits = text => FORBIDDEN.filter(re => re.test(text)).map(String);

const ROUTE_RE = /<Route\s+path="\/connect"\s+element=\{<ConnectScreen\s*\/>\}\s*\/>/;
const IMPORT_RE = /import\s+ConnectScreen\s+from\s+"\.\/screens\/ConnectScreen\.jsx";/;
const routed = text => ROUTE_RE.test(text) && IMPORT_RE.test(text);

async function run() {
  assert.ok(fs.existsSync(SCREEN), "src/screens/ConnectScreen.jsx must exist -- /connect renders an empty body without it");
  const screen = fs.readFileSync(SCREEN, "utf8");
  const main = fs.readFileSync(MAIN, "utf8");

  // (a) every §4 string, verbatim
  const missing = STRINGS.filter(s => !screen.includes(s));
  assert.deepEqual(missing, [], `the screen must carry every §4 string verbatim; missing: ${JSON.stringify(missing)}`);

  // (a2) the retired AGT-165 page is gone, both directions
  const stale = REMOVED.filter(s => screen.includes(s));
  assert.deepEqual(stale, [], `the screen must carry none of the retired AGT-165 strings; found: ${JSON.stringify(stale)}`);
  const reverted = screen + "\n// " + REMOVED[0];
  assert.deepEqual(REMOVED.filter(s => reverted.includes(s)), [REMOVED[0]],
    "CONTROL: one retired string appended must yield one stale hit, or the gate reads nothing");

  // (b) the no-secret gate, both directions
  assert.deepEqual(secretHits(screen), [], "the screen must carry no key, bypass header, host string or literal hex");
  const spliced = screen.replace("export default", "// x-deepbench-mcp-key: abc123\nexport default");
  assert.ok(secretHits(spliced).length > 0, "CONTROL: a spliced key header must be caught, or the gate reads nothing");

  // (c) the route, both directions
  assert.ok(routed(main), 'src/main.jsx must import ConnectScreen and route path="/connect" to it');
  const unrouted = main.split("\n").filter(l => !ROUTE_RE.test(l)).join("\n");
  assert.notEqual(unrouted, main, "CONTROL: the Route line must be found to be removed");
  assert.equal(routed(unrouted), false, "CONTROL: main.jsx without the Route line must fail the route check");

  // LIVE
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-165 live arm (Brittany's lane and the MCP secret names)",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- step 3's \"no key\" copy is true only while " +
      "Brittany is an active product-lane agent, and that is a row, not a file. Arms a-c ran.");
    return;
  }
  const get = async q => {
    const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    assert.ok(res.ok, `GET ${q} -> HTTP ${res.status}`);
    return res.json();
  };
  const agents = await get("agents?id=eq.brittany&select=lane,is_active");
  assert.deepEqual(agents, [{ lane: "product", is_active: true }],
    "Brittany must be an active product-lane agent, or the page's \"needs no key\" step is false");
  const names = (await get("runner_secrets?select=name&name=like.MCP*")).map(r => r.name);
  assert.ok(names.length > 0, "at least one MCP* secret name must read back, or this arm measures nothing");
  const leaked = names.filter(n => screen.includes(n));
  assert.deepEqual(leaked, [], `no MCP secret name may appear in the screen source; found ${JSON.stringify(leaked)}`);
  console.log(`    [AGT-165 live] brittany lane=product is_active=true; MCP secret names checked: ${names.length}`);
}

selfRun(import.meta.url, run);
export default run;
