// DeepBench v7.0.1013 | tests/regression/agt-653-trenton.test.mjs | AGT-653 -- Trenton (SEC-01): rows, store, north-star pin
//
// FEATURE: AGT-653 -- Trenton (SEC-01), the principal's Government AI & Data Security Advisor, a personal-lane agent
// (migration agt653_security_store: public.security_records, RLS on, zero anon/authenticated grants). Agent rows applied
// verbatim from docs/design/agt-653-trenton-seed.sql (1 agent, 5 security-* Capabilities, 10 sec- Skills, 30 links,
// 1 north-star pin, ZERO personal_source_grants -- the principal excluded his personal Library). is_active stays false:
// hiring him is the principal's word alone.
// Same arms as agt-643-harry.test.mjs, re-prefixed: (a) 10 sec- rows parse; (b) both knowledge rows inline + control;
// (c) no personal-fact marker + control; (d) no product or other agent named + controls; (e) live rows, and the store
// service-200 and anon-refused.
// BASELINE: new file; on unchanged origin/dev (2786c2f3) the live arm reads agents?id=eq.trenton -> [] and cannot pass.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const SEED_REL = "docs/design/agt-653-trenton-seed.sql";
const SELF_ID = "trenton";
const NS = "deepbench-north-star";
const EXPECTED_HW_ROWS = 10; // 5 shared Skills + 5 Intents
const TABLES = ["security_records"];

// ---------------------------------------------------------------------------------------------
// Seed parsing -- one chunk per sec- skill_profiles VALUES tuple (agt-82's jmRows, re-prefixed)
// ---------------------------------------------------------------------------------------------
function hwRows(seed) {
  const start = /^\s*\('(sec-[\w-]+)',\s*'((?:[^']|'')*)',\s*'([a-z_]+)'/gm;
  const hits = [...seed.matchAll(start)];
  return hits.map((m, i) => {
    const from = m.index;
    const nextRow = i + 1 < hits.length ? hits[i + 1].index : seed.length;
    const tail = seed.slice(from).search(/\n(?:INSERT|-- |DO |COMMIT)/);
    const to = Math.min(nextRow, tail === -1 ? seed.length : from + tail);
    return { slug: m[1], type: m[3], text: seed.slice(from, to) };
  });
}

const PERSONAL_MARKERS = [/512\./i, /@yahoo/i, /SOVRA/i, /Periscope/i, /\bmdf\b/i, /Deverus/i, /Fluid Innovation/i];
const personalMarkersIn = text => PERSONAL_MARKERS.filter(re => re.test(text)).map(String);

function knowledgeInlineCheck(seed) {
  const knowledge = hwRows(seed).filter(r => r.type === "knowledge");
  const notInline = knowledge.filter(r => !/"source"\s*:\s*"inline"/.test(r.text)).map(r => r.slug);
  return { count: knowledge.length, notInline };
}

const productNamedIn = seed => hwRows(seed).filter(r => /\bdeepbench\b/i.test(r.text)).map(r => r.slug);

function agentIdsNamed(seed, ids) {
  const out = [];
  for (const row of hwRows(seed)) {
    for (const id of ids) {
      if (!id || id.toLowerCase() === SELF_ID) continue;
      const re = new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(row.text)) out.push(`${row.slug}~${id}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// STATIC
// ---------------------------------------------------------------------------------------------
function partA_rowCount(seed) {
  const rows = hwRows(seed);
  assert.strictEqual(rows.length, EXPECTED_HW_ROWS,
    `parsed ${rows.length} sec- skill_profiles rows from ${SEED_REL} (${rows.map(r => r.slug).join(", ")}), expected ${EXPECTED_HW_ROWS} -- the parser or the seed changed`);
  return [`seed-sc-rows (${rows.length})`];
}

function partB_knowledgeInline(seed) {
  const results = [];
  const { count, notInline } = knowledgeInlineCheck(seed);
  assert.strictEqual(count, 2, `expected both 'knowledge' sec- rows (sec-knowledge-controls, sec-knowledge-ai), parsed ${count}`);
  assert.deepStrictEqual(notInline, [], `knowledge sec- rows without "source":"inline": ${notInline.join(", ")}`);
  results.push(`seed-knowledge-rows-inline (${count})`);

  const mutated = seed.replace(`'{"source":"inline"}'::jsonb`, `'{"source":"library"}'::jsonb`);
  assert.notStrictEqual(mutated, seed, "control setup failed: the inline trait literal was not found verbatim");
  assert.ok(knowledgeInlineCheck(mutated).notInline.length > 0, "control: a knowledge row rewritten to source=library was not caught");
  results.push("control-non-inline-knowledge-caught");
  return results;
}

function partC_noPersonalFacts(seed) {
  const results = [];
  const found = personalMarkersIn(seed);
  assert.deepStrictEqual(found, [], `${SEED_REL} carries personal-fact markers: ${found.join(", ")}`);
  results.push("seed-carries-no-personal-fact-marker");

  const mutated = seed.replace("Trenton (he/him) is a personal-lane agent", "Trenton (mdf) is a personal-lane agent");
  assert.notStrictEqual(mutated, seed, "control setup failed: splice anchor not found in the seed -- fix the anchor, not the assertion");
  assert.ok(personalMarkersIn(mutated).length > 0, "control: a spliced 'mdf' marker was not caught");
  results.push("control-spliced-marker-caught");
  return results;
}

async function liveAgentIds() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/agents?select=id`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) assert.fail(`agents?select=id failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).map(r => r.id);
}

async function partD_productAndRuleOne(seed) {
  const results = [];
  const product = productNamedIn(seed);
  assert.deepStrictEqual(product, [], `sec- rows name the product: ${product.join(", ")}`);
  results.push("seed-sc-rows-name-no-product");

  let ids = await liveAgentIds();
  let source = "live agents?select=id";
  if (!ids) {
    const { AGENTS } = await import("../../src/data/agents.js");
    ids = AGENTS.map(a => a.id);
    source = "src/data/agents.js AGENTS";
  }
  assert.ok(ids.length > 0, `no agent ids from ${source}`);
  const named = agentIdsNamed(seed, ids);
  assert.deepStrictEqual(named, [], `sec- Skill text names another agent (Rule #1), ids from ${source}: ${named.join(", ")}`);
  results.push(`seed-sc-rows-name-no-other-agent (${ids.length} ids, ${source})`);

  const ANCHOR = "an independent assessor certifies, you prepare.";
  const withProduct = seed.replace(ANCHOR, `${ANCHOR} DeepBench`);
  assert.notStrictEqual(withProduct, seed, "control setup failed: splice anchor not found in sec-identity");
  assert.ok(productNamedIn(withProduct).length > 0, "control: a spliced 'DeepBench' was not caught");
  results.push("control-spliced-product-caught");

  const other = ids.find(id => id.toLowerCase() !== SELF_ID);
  const withId = seed.replace(ANCHOR, `${ANCHOR} Ask ${other}.`);
  assert.notStrictEqual(withId, seed, "control setup failed: splice anchor not found in sec-identity");
  assert.ok(agentIdsNamed(withId, ids).length > 0, `control: a spliced agent id "${other}" was not caught`);
  results.push("control-spliced-agent-id-caught");
  return results;
}

// ---------------------------------------------------------------------------------------------
// LIVE
// ---------------------------------------------------------------------------------------------
async function partE_live() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (trenton row, 5 assignments, 30 links, north-star pin, zero grants, security_records anon-refused/service-200)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-11-12): agents.trenton " +
      "is SEC-01, lane='personal', is_active=false; security_records holds zero anon/authenticated grants, RLS on.");
    return results;
  }
  const base = url.replace(/\/+$/, "");
  const svc = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: svc });
    if (!r.ok) assert.fail(`GET /rest/v1/${q} failed: HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };

  assert.deepStrictEqual(await rest(`agents?id=eq.${SELF_ID}&select=code,lane,is_active`),
    [{ code: "SEC-01", lane: "personal", is_active: false }],
    `agents row '${SELF_ID}' is not exactly [{code:'SEC-01', lane:'personal', is_active:false}] -- is_active is the principal's hire, not this build's`);
  results.push("live-trenton-sec01-personal-inactive");

  const asgn = (await rest(`agent_capability_assignments?agent_id=eq.${SELF_ID}&select=capability_slug`)).map(r => r.capability_slug).sort();
  assert.deepStrictEqual(asgn, ["security-advise", "security-deep-check", "security-document-draft", "security-exposure-scan", "security-weekly-review"], `trenton's assignments: ${JSON.stringify(asgn)}`);
  results.push("live-trenton-five-assignments");

  const links = await rest(`capability_skill_profiles?capability_slug=like.security-*&select=capability_slug,skill_profile_slug`);
  assert.strictEqual(links.length, 30, `security-* capability_skill_profiles links: expected 30, got ${links.length}`);
  results.push("live-security-links-30");

  const pins = (await rest(`agent_skill_pins?agent_id=eq.${SELF_ID}&select=skill_profile_slug`)).map(r => r.skill_profile_slug);
  assert.deepStrictEqual(pins, [NS], `trenton's pins: ${JSON.stringify(pins)} (expected exactly the north star)`);
  results.push("live-trenton-north-star-pin");

  const grants = await rest(`personal_source_grants?agent_id=eq.${SELF_ID}&select=kind`);
  assert.deepStrictEqual(grants, [], `trenton must hold no personal Library grant (the principal excluded it): ${JSON.stringify(grants)}`);
  results.push("live-trenton-no-library-grants");

  // Service half: each table exists and the platform can read it.
  for (const t of TABLES) {
    const s = await fetch(`${base}/rest/v1/${t}?select=*&limit=1`, { headers: svc });
    if (s.status !== 200) assert.fail(`${t} with the service key: HTTP ${s.status} ${await s.text()} (expected 200)`);
    assert.ok(Array.isArray(await s.json()), `${t} service read did not return a JSON array`);
    results.push(`live-${t}-service-200`);
  }

  // Anon half: refused. The key must first prove it is a real anon key (agents is anon-readable).
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anon || anon === "regression-placeholder") {
    notRun("the anon half of the store",
      "no real SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY in env (runner_secrets carries none; the browser bundle's " +
      "key lives in .env.local). The service half above ran.");
    return results;
  }
  const anonHdr = { apikey: anon, Authorization: `Bearer ${anon}` };
  const ctl = await fetch(`${base}/rest/v1/agents?select=id&limit=1`, { headers: anonHdr });
  if (ctl.status !== 200) {
    notRun("the anon half of the store",
      `the anon key in env is not a working anon key (agents?select=id answered HTTP ${ctl.status}), so a refusal ` +
      "would prove nothing. The service half above ran.");
    return results;
  }
  results.push("live-anon-key-positive-control-200");
  for (const t of TABLES) {
    const n = await fetch(`${base}/rest/v1/${t}?select=*&limit=1`, { headers: anonHdr });
    const body = await n.text();
    assert.ok(n.status >= 400, `${t} answered the public anon key with HTTP ${n.status} -- it must be refused (body: ${body.slice(0, 200)})`);
    assert.ok(!/PGRST205/.test(body), `${t} anon refusal is a 404 PGRST205 (table missing), not a grant refusal: ${body.slice(0, 200)}`);
    results.push(`live-${t}-anon-refused (${n.status})`);
  }
  return results;
}

async function run() {
  const seed = read(SEED_REL);
  const results = [];
  results.push(...partA_rowCount(seed));
  results.push(...partB_knowledgeInline(seed));
  results.push(...partC_noPersonalFacts(seed));
  results.push(...(await partD_productAndRuleOne(seed)));
  results.push(...(await partE_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
