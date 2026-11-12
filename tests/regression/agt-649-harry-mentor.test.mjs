// DeepBench v7.0.1009 | tests/regression/agt-649-harry-mentor.test.mjs | AGT-649 -- Harry's mentor memory store: 20 kinds, full-text + vector search, two capabilities, the starter source registry
//
// FEATURE: AGT-649 -- migration agt649_harry_mentor_store (strategy_records gains 9 kinds; STORED tsvector + GIN on
// personal_sources, personal_source_sections, strategy_records; nullable vector(1536) on sections and records;
// public.library_search and public.strategy_memory_search, service_role only) plus seed
// docs/design/agt-649-harry-mentor-seed.sql (strategy-weekly-study, strategy-mentor-review, sc-mentor, sc-study-method,
// two intents, 16 + 5 links, three Library grants, one `source` record per reachable starter source).
// OFFLINE arms parse the seed: (a) 20 kinds in the CHECK + control; (b) exactly the 2 new capabilities; (c) 2 Skills +
// 2 Intents, each intent's kind enum names only store kinds; (d) every source row carries url/topics/status, >= 40 rows
// + control; (e) both functions revoked from anon by name; (f) no personal marker, product or other agent named + controls.
// LIVE arms (credentialed; NOT RUN without keys): library_search('acquirer', 5) >= 1 row; strategy_memory_search(
// 'government', ['source'], 5) >= 1 row; anon cannot execute either, with the service-key call as the positive control.
// BASELINE: new file; on unchanged origin/dev (4e851cf3) the seed file is absent and the RPCs answer 404.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const SEED_REL = "docs/design/agt-649-harry-mentor-seed.sql";
const SELF_ID = "harry";
const NEW_KINDS = ["decision", "commitment", "study", "source", "method", "case", "kpi", "target", "fact"];
const NEW_CAPS = ["strategy-mentor-review", "strategy-weekly-study"];
const NEW_SKILLS = { "sc-mentor": "behavior", "sc-study-method": "knowledge", "sc-study-intent": "intent", "sc-mentor-review-intent": "intent" };

// ---------------------------------------------------------------------------------------------
// Seed parsing
// ---------------------------------------------------------------------------------------------
function migrationBlock(seed) {
  const m = seed.match(/=== MIGRATION agt649_harry_mentor_store: BEGIN =+\n([\s\S]*?)\n-- === MIGRATION agt649_harry_mentor_store: END/);
  assert.ok(m, `${SEED_REL} has no marked MIGRATION agt649_harry_mentor_store block`);
  return m[1];
}

function kindsInCheck(seed) {
  const m = migrationBlock(seed).match(/ADD CONSTRAINT strategy_records_kind_check CHECK \(kind IN\s*\(([^)]*)\)\)/);
  assert.ok(m, "the migration block does not re-add strategy_records_kind_check");
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]);
}

function seedBody(seed) {
  const i = seed.indexOf("\nBEGIN;\n");
  const j = seed.lastIndexOf("\nCOMMIT;");
  assert.ok(i !== -1 && j > i, `${SEED_REL} has no BEGIN; ... COMMIT; seed transaction`);
  return seed.slice(i, j);
}

function newCapabilities(seed) {
  const m = seedBody(seed).match(/INSERT INTO public\.capabilities[^\n]*VALUES\n([\s\S]*?);\n/);
  assert.ok(m, "no capabilities INSERT in the seed");
  return [...m[1].matchAll(/^\s*\('(strategy-[\w-]+)',/gm)].map(x => x[1]).sort();
}

// One chunk per sc- skill_profiles VALUES tuple (agt-643's hwRows).
function scRows(seed) {
  const body = seedBody(seed);
  const start = /^\s*\('(sc-[\w-]+)',\s*'((?:[^']|'')*)',\s*'([a-z_]+)'/gm;
  const hits = [...body.matchAll(start)];
  return hits.map((m, i) => {
    const from = m.index;
    const nextRow = i + 1 < hits.length ? hits[i + 1].index : body.length;
    // Exact statement terminators: a bare `\nCOMMIT` would stop at sc-mentor's "COMMITMENTS:" line (found by the control).
    const tail = body.slice(from).search(/\n(?:INSERT INTO |-- |DO \$\$|COMMIT;)/);
    const to = Math.min(nextRow, tail === -1 ? body.length : from + tail);
    return { slug: m[1], type: m[3], text: body.slice(from, to) };
  });
}

// One parsed object per starter source VALUES tuple.
function sourceRows(seed) {
  const re = /^\s*\('((?:[^']|'')+)',\s*'(https?:\/\/[^']+)',\s*ARRAY\[([^\]]*)\],\s*'([^']+)',\s*'([a-z]+)',/gm;
  return [...seedBody(seed).matchAll(re)].map(m => ({
    title: m[1], url: m[2], topics: m[3].split(",").map(s => s.trim()).filter(Boolean).map(Number), type: m[4], reachable: m[5],
  }));
}

function badSources(rows) {
  return rows.filter(r => !/^https:\/\/\S+$/.test(r.url) || r.topics.length === 0 ||
    r.topics.some(t => !Number.isInteger(t) || t < 1 || t > 6) || !["yes", "partial"].includes(r.reachable) || !r.type)
    .map(r => r.title);
}

const PERSONAL_MARKERS = [/512\./i, /@yahoo/i, /SOVRA/i, /Periscope/i, /\bmdf\b/i, /Deverus/i, /Fluid Innovation/i];
const personalMarkersIn = text => PERSONAL_MARKERS.filter(re => re.test(text)).map(String);
const productNamedIn = seed => scRows(seed).filter(r => /\bdeepbench\b/i.test(r.text)).map(r => r.slug);
function agentIdsNamed(seed, ids) {
  const out = [];
  for (const row of scRows(seed)) for (const id of ids) {
    if (!id || id.toLowerCase() === SELF_ID) continue;
    const re = new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(row.text)) out.push(`${row.slug}~${id}`);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// OFFLINE
// ---------------------------------------------------------------------------------------------
function partA_kinds(seed) {
  const kinds = kindsInCheck(seed);
  assert.strictEqual(kinds.length, 20, `strategy_records_kind_check lists ${kinds.length} kinds (${kinds.join(", ")}), expected 20`);
  assert.strictEqual(new Set(kinds).size, 20, `strategy_records_kind_check repeats a kind: ${kinds.join(", ")}`);
  const missing = NEW_KINDS.filter(k => !kinds.includes(k));
  assert.deepStrictEqual(missing, [], `new kinds missing from the CHECK: ${missing.join(", ")}`);
  const mutated = seed.replace("'kpi',", "");
  assert.notStrictEqual(mutated, seed, "control setup failed: 'kpi', not found in the CHECK");
  assert.strictEqual(kindsInCheck(mutated).length, 19, "control: dropping 'kpi' did not change the parsed kind count");
  return ["seed-kind-check-20", "control-dropped-kind-caught"];
}

function partB_capabilities(seed) {
  const caps = newCapabilities(seed);
  assert.deepStrictEqual(caps, NEW_CAPS, `seed inserts capabilities ${JSON.stringify(caps)}, expected exactly ${JSON.stringify(NEW_CAPS)}`);
  for (const [cap, intent] of [["strategy-weekly-study", "sc-study-intent"], ["strategy-mentor-review", "sc-mentor-review-intent"]]) {
    assert.ok(new RegExp(`\\('${cap}',[\\s\\S]*?'${intent}'\\)`).test(seedBody(seed)), `${cap} does not default to ${intent}`);
  }
  return [`seed-new-capabilities (${caps.length})`];
}

function partC_skills(seed) {
  const rows = scRows(seed);
  const got = Object.fromEntries(rows.map(r => [r.slug, r.type]));
  assert.deepStrictEqual(got, NEW_SKILLS, `sc- rows parsed ${JSON.stringify(got)}, expected ${JSON.stringify(NEW_SKILLS)}`);
  const intents = rows.filter(r => r.type === "intent");
  assert.strictEqual(intents.length, 2, `expected 2 intents, parsed ${intents.length}`);
  const kinds = kindsInCheck(seed);
  for (const r of intents) {
    const m = r.text.match(/"records_to_write"[\s\S]*?"kind":\{"type":"string","enum":\[([^\]]*)\]\}/);
    assert.ok(m, `${r.slug} output contract has no records_to_write kind enum`);
    const allowed = [...m[1].matchAll(/"([a-z_]+)"/g)].map(x => x[1]);
    assert.ok(allowed.length > 0, `${r.slug} kind enum is empty`);
    const unknown = allowed.filter(k => !kinds.includes(k));
    assert.deepStrictEqual(unknown, [], `${r.slug} may write kinds the CHECK refuses: ${unknown.join(", ")}`);
  }
  const knowledge = rows.filter(r => r.type === "knowledge");
  assert.ok(knowledge.every(r => /"source"\s*:\s*"inline"/.test(r.text)), "a knowledge sc- row is not inline");
  const links = seedBody(seed);
  assert.ok(/\('sc-mentor', 6\)[\s\S]*\('sc-study-method', 8\)[\s\S]*WHERE c\.slug IN \('strategy-weekly-study', 'strategy-mentor-review'\)/.test(links),
    "sc-mentor and sc-study-method are not linked to both new capabilities");
  assert.ok(/SELECT c\.slug, 'sc-mentor'[\s\S]*?'strategy-daily-brief', 'strategy-weekly-review', 'strategy-readiness-check', 'strategy-library-curate', 'strategy-advise'/.test(links),
    "sc-mentor is not linked to the five existing strategy capabilities");
  return ["seed-2-skills-2-intents", "seed-intent-kind-enums-in-check", "seed-links-present"];
}

function partD_sources(seed) {
  const rows = sourceRows(seed);
  assert.ok(rows.length >= 40, `parsed ${rows.length} starter source rows, expected >= 40`);
  const bad = badSources(rows);
  assert.deepStrictEqual(bad, [], `source rows without a https url, topics 1..6, reachable yes|partial or a type: ${bad.join(" | ")}`);
  assert.strictEqual(new Set(rows.map(r => r.url)).size, rows.length, "two source rows share a url");
  assert.ok(/'status', 'active'/.test(seedBody(seed)) && /'origin', 'starter'/.test(seedBody(seed)) && /'score', 0, 'uses', 0/.test(seedBody(seed)),
    "source data does not set status active, origin starter, score 0 and uses 0");
  const mutated = seed.replace("ARRAY[1,3,5], 'News'", "ARRAY[], 'News'");
  assert.notStrictEqual(mutated, seed, "control setup failed: splice anchor not found");
  assert.ok(badSources(sourceRows(mutated)).length > 0, "control: a source row with no topics was not caught");
  return [`seed-source-rows (${rows.length})`, "control-empty-topics-caught"];
}

function partE_functionGrants(seed) {
  const mig = migrationBlock(seed);
  for (const fn of ["library_search(text, int, vector)", "strategy_memory_search(text, text[], int, vector)"]) {
    const esc = fn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.ok(new RegExp(`REVOKE ALL ON FUNCTION public\\.${esc} FROM public, anon, authenticated;`).test(mig), `${fn} is not revoked from public, anon, authenticated by name`);
    assert.ok(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${esc} TO service_role;`).test(mig), `${fn} is not granted to service_role`);
    assert.ok(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn.split("(")[0]}\\([^\\n]*\\nRETURNS [^\\n]*\\nLANGUAGE sql STABLE SECURITY INVOKER`).test(mig), `${fn} is not STABLE SECURITY INVOKER`);
  }
  return ["seed-functions-service-role-only"];
}

async function liveAgentIds() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/agents?select=id`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) assert.fail(`agents?select=id failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).map(r => r.id);
}

async function partF_methodOnly(seed) {
  const results = [];
  const found = personalMarkersIn(seed);
  assert.deepStrictEqual(found, [], `${SEED_REL} carries personal-fact markers: ${found.join(", ")}`);
  results.push("seed-carries-no-personal-fact-marker");
  const product = productNamedIn(seed);
  assert.deepStrictEqual(product, [], `sc- rows name the product: ${product.join(", ")}`);
  results.push("seed-sc-rows-name-no-product");

  let ids = await liveAgentIds(), source = "live agents?select=id";
  if (!ids) { const { AGENTS } = await import("../../src/data/agents.js"); ids = AGENTS.map(a => a.id); source = "src/data/agents.js AGENTS"; }
  assert.ok(ids.length > 0, `no agent ids from ${source}`);
  const named = agentIdsNamed(seed, ids);
  assert.deepStrictEqual(named, [], `sc- Skill text names another agent (Rule #1), ids from ${source}: ${named.join(", ")}`);
  results.push(`seed-sc-rows-name-no-other-agent (${ids.length} ids, ${source})`);

  const ANCHOR = "label every inference as yours.";
  const other = ids.find(id => id.toLowerCase() !== SELF_ID);
  const withId = seed.replace(ANCHOR, `${ANCHOR} Ask ${other}.`);
  assert.notStrictEqual(withId, seed, "control setup failed: splice anchor not found in sc-mentor");
  assert.ok(agentIdsNamed(withId, ids).length > 0, `control: a spliced agent id "${other}" was not caught`);
  assert.ok(productNamedIn(seed.replace(ANCHOR, `${ANCHOR} DeepBench`)).length > 0, "control: a spliced 'DeepBench' was not caught");
  assert.ok(personalMarkersIn(seed.replace(ANCHOR, `${ANCHOR} mdf`)).length > 0, "control: a spliced 'mdf' marker was not caught");
  results.push("control-spliced-agent-product-marker-caught");
  return results;
}

// ---------------------------------------------------------------------------------------------
// LIVE
// ---------------------------------------------------------------------------------------------
const CALLS = [
  ["library_search", { p_query: "acquirer", p_limit: 5 }, r => typeof r.source_id === "string" && typeof r.score === "number"],
  ["strategy_memory_search", { p_query: "government", p_kinds: ["source"], p_limit: 5 }, r => typeof r.id === "string" && typeof r.score === "number"],
];

async function partG_live() {
  const results = [];
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (library_search / strategy_memory_search rows, anon refused)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-11-12): library_search('acquirer', 5) " +
      "returned 5 rows, strategy_memory_search('government', ['source'], 5) returned 5, 43 starter source rows.");
    return results;
  }
  const base = url.replace(/\/+$/, "");
  const rpc = (fn, body, k) => fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: "POST", headers: { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });

  for (const [fn, body, shape] of CALLS) {
    const r = await rpc(fn, body, key);
    if (r.status !== 200) assert.fail(`${fn} with the service key: HTTP ${r.status} ${await r.text()}`);
    const rows = await r.json();
    assert.ok(Array.isArray(rows) && rows.length >= 1 && rows.length <= 5, `${fn}(${JSON.stringify(body)}) returned ${JSON.stringify(rows).slice(0, 200)} -- expected 1..5 ranked rows`);
    assert.ok(rows.every(shape), `${fn} rows lack the declared columns: ${JSON.stringify(rows[0])}`);
    assert.ok(rows.every((x, i) => i === 0 || rows[i - 1].score >= x.score), `${fn} rows are not ranked by score descending`);
    results.push(`live-${fn}-service-${rows.length}-rows`);
  }

  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anon || anon === "regression-placeholder") {
    notRun("the anon half (both search functions refused)", "no real SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY in env. The service half above ran.");
    return results;
  }
  const ctl = await fetch(`${base}/rest/v1/agents?select=id&limit=1`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
  if (ctl.status !== 200) {
    notRun("the anon half (both search functions refused)", `the anon key in env is not a working anon key (agents?select=id answered HTTP ${ctl.status}). The service half above ran.`);
    return results;
  }
  results.push("live-anon-key-positive-control-200");
  for (const [fn, body] of CALLS) {
    const r = await rpc(fn, body, anon);
    const text = await r.text();
    assert.ok(r.status >= 400, `${fn} answered the public anon key with HTTP ${r.status} -- it must be refused (body: ${text.slice(0, 200)})`);
    assert.ok(!/PGRST202/.test(text) || /permission/i.test(text), `${fn} anon refusal is a missing-function 404, not a privilege refusal: ${text.slice(0, 200)}`);
    results.push(`live-${fn}-anon-refused (${r.status})`);
  }
  return results;
}

async function run() {
  const seed = read(SEED_REL);
  const results = [];
  results.push(...partA_kinds(seed));
  results.push(...partB_capabilities(seed));
  results.push(...partC_skills(seed));
  results.push(...partD_sources(seed));
  results.push(...partE_functionGrants(seed));
  results.push(...(await partF_methodOnly(seed)));
  results.push(...(await partG_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
