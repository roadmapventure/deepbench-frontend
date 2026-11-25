// DeepBench v7.0.1121 | tests/regression/agt-808-bill.test.mjs | AGT-808 -- Bill (GS-01): rows, store, store F grant, pins, approved keywords
//
// FEATURE: AGT-808 -- Bill (GS-01), the principal's Government Sales Advisor, a personal-lane agent (migration
// agt808_sales_store: public.sales_records, RLS on, zero anon/authenticated grants). Agent rows applied verbatim from
// docs/design/agt-808-bill-seed.sql (1 agent, 3 sales-* Capabilities, 7 gs- Skills, 15 links, 4 pins -- north star and the
// three company records -- 2 personal_source_grants for store F, 35 approved keyword rows). is_active stays false until
// AGT-811's attended scan passes. Same arms as agt-721-laura.test.mjs, re-prefixed; the deny arm becomes the store F arm.
// BASELINE: new file; on unchanged origin/dev (e7b0d119) the live arm reads agents?id=eq.bill -> [] and cannot pass.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const SEED_REL = "docs/design/agt-808-bill-seed.sql";
const SELF_ID = "bill";
const EXPECTED_PINS = ["deepbench-north-star", "rmv-company-profile", "rmv-consulting-automation", "rmv-offerings"];
const EXPECTED_ROWS = 7; // 4 shared Skills + 3 Intents
const TABLE = "sales_records";

function gsRows(seed) {
  const start = /^\s*\('(gs-[\w-]+)',\s*'((?:[^']|'')*)',\s*'([a-z_]+)'/gm;
  const hits = [...seed.matchAll(start)];
  return hits.map((m, i) => {
    const from = m.index;
    const nextRow = i + 1 < hits.length ? hits[i + 1].index : seed.length;
    const tail = seed.slice(from).search(/\n(?:INSERT|-- |DO |COMMIT)/);
    const to = Math.min(nextRow, tail === -1 ? seed.length : from + tail);
    return { slug: m[1], type: m[3], text: seed.slice(from, to) };
  });
}

const PERSONAL_MARKERS = [/512\./i, /@yahoo/i, /SOVRA/i, /Periscope/i, /\bmdf\b/i, /Deverus/i, /Fluid Innovation/i, /Maricopa/i];
const personalMarkersIn = text => PERSONAL_MARKERS.filter(re => re.test(text)).map(String);
const productNamedIn = seed => gsRows(seed).filter(r => /\bdeepbench\b/i.test(r.text)).map(r => r.slug);

function agentIdsNamed(seed, ids) {
  const out = [];
  for (const row of gsRows(seed)) {
    for (const id of ids) {
      if (!id || id.toLowerCase() === SELF_ID) continue;
      const re = new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(row.text)) out.push(`${row.slug}~${id}`);
    }
  }
  return out;
}

function partA_rows(seed) {
  const rows = gsRows(seed);
  assert.strictEqual(rows.length, EXPECTED_ROWS,
    `parsed ${rows.length} gs- skill_profiles rows from ${SEED_REL} (${rows.map(r => r.slug).join(", ")}), expected ${EXPECTED_ROWS}`);
  const knowledge = rows.filter(r => r.type === "knowledge");
  assert.strictEqual(knowledge.length, 1, `expected one knowledge gs- row, parsed ${knowledge.length}`);
  assert.ok(/"source"\s*:\s*"inline"/.test(knowledge[0].text), "gs-knowledge-method is not source=inline");
  return [`seed-gs-rows (${rows.length})`, "seed-knowledge-inline"];
}

function partB_noPersonalFacts(seed) {
  const found = personalMarkersIn(seed);
  assert.deepStrictEqual(found, [], `${SEED_REL} carries personal-fact or client markers: ${found.join(", ")}`);
  const mutated = seed.replace("Bill (he/him) is a personal-lane agent", "Bill (Maricopa) is a personal-lane agent");
  assert.notStrictEqual(mutated, seed, "control setup failed: splice anchor not found in the seed");
  assert.ok(personalMarkersIn(mutated).length > 0, "control: a spliced client marker was not caught");
  return ["seed-carries-no-personal-or-client-marker", "control-spliced-marker-caught"];
}

async function liveAgentIds() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/agents?select=id`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) assert.fail(`agents?select=id failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).map(r => r.id);
}

async function partC_productAndRuleOne(seed) {
  const results = [];
  assert.deepStrictEqual(productNamedIn(seed), [], "gs- rows name the product");
  results.push("seed-gs-rows-name-no-product");

  let ids = await liveAgentIds();
  let source = "live agents?select=id";
  if (!ids) {
    const { AGENTS } = await import("../../src/data/agents.js");
    ids = AGENTS.map(a => a.id);
    source = "src/data/agents.js AGENTS";
  }
  const named = agentIdsNamed(seed, ids);
  assert.deepStrictEqual(named, [], `gs- Skill text names another agent (Rule #1), ids from ${source}: ${named.join(", ")}`);
  results.push(`seed-gs-rows-name-no-other-agent (${ids.length} ids, ${source})`);

  const ANCHOR = "the due date, the link.$q$";
  const withProduct = seed.replace(ANCHOR, `${ANCHOR} DeepBench`);
  assert.notStrictEqual(withProduct, seed, "control setup failed: splice anchor not found in gs-identity");
  assert.ok(productNamedIn(withProduct).length > 0, "control: a spliced 'DeepBench' was not caught");
  results.push("control-spliced-product-caught");

  const other = ids.find(id => id.toLowerCase() !== SELF_ID);
  const withId = seed.replace(ANCHOR, `${ANCHOR} Ask ${other}.`);
  assert.ok(agentIdsNamed(withId, ids).length > 0, `control: a spliced agent id "${other}" was not caught`);
  results.push("control-spliced-agent-id-caught");
  return results;
}

async function partD_live() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (bill row, 3 assignments, 15 links, 4 pins, 2 grants, 35 keywords, store anon-refused/service-200)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-11-25): agents.bill is GS-01, " +
      "lane='personal', is_active=false; 7 gs- Skills, 15 links, 4 pins, 2 grants, 35 approved keywords.");
    return results;
  }
  const base = url.replace(/\/+$/, "");
  const svc = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: svc });
    if (!r.ok) assert.fail(`GET /rest/v1/${q} failed: HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };

  const row = await rest(`agents?id=eq.${SELF_ID}&select=code,lane,is_active`);
  assert.strictEqual(row.length, 1, `agents row '${SELF_ID}' missing`);
  assert.deepStrictEqual({ code: row[0].code, lane: row[0].lane }, { code: "GS-01", lane: "personal" });
  assert.strictEqual(typeof row[0].is_active, "boolean", "is_active must be a boolean");
  results.push("live-bill-gs01-personal");

  const asgn = (await rest(`agent_capability_assignments?agent_id=eq.${SELF_ID}&select=capability_slug`)).map(r => r.capability_slug).sort();
  assert.deepStrictEqual(asgn, ["sales-ask", "sales-rate", "sales-scan"], `bill's assignments: ${JSON.stringify(asgn)}`);
  results.push("live-bill-three-assignments");

  const links = await rest(`capability_skill_profiles?capability_slug=like.sales-*&select=capability_slug`);
  assert.strictEqual(links.length, 15, `sales-* links: expected 15, got ${links.length}`);
  results.push("live-sales-links-15");

  const pins = (await rest(`agent_skill_pins?agent_id=eq.${SELF_ID}&select=skill_profile_slug`)).map(r => r.skill_profile_slug).sort();
  assert.deepStrictEqual(pins, EXPECTED_PINS, `bill's pins: ${JSON.stringify(pins)}`);
  results.push("live-bill-north-star-and-company-pins");

  const grants = (await rest(`personal_source_grants?agent_id=eq.${SELF_ID}&select=kind`)).map(r => r.kind).sort();
  assert.deepStrictEqual(grants, ["career_offering", "market_term"], `bill's Library grants: ${JSON.stringify(grants)} (store F only)`);
  results.push("live-bill-store-f-grant-only");

  const kw = await rest(`${TABLE}?kind=eq.keyword&data->>status=eq.approved&select=title`);
  assert.ok(kw.length >= 35, `approved keywords: expected >= 35, got ${kw.length}`);
  const titles = new Set(kw.map(r => r.title));
  for (const must of ["staff augmentation", "AI prompt engineering", "NIGP commodity code analysis", "technology program manager"]) {
    assert.ok(titles.has(must), `approved keyword '${must}' missing`);
  }
  results.push(`live-bill-approved-keywords (${kw.length})`);

  const s = await fetch(`${base}/rest/v1/${TABLE}?select=id&limit=1`, { headers: svc });
  assert.strictEqual(s.status, 200, `${TABLE} with the service key: HTTP ${s.status}`);
  results.push(`live-${TABLE}-service-200`);

  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anon || anon === "regression-placeholder") {
    notRun("the anon half of the store", "no real anon key in env; the service half above ran.");
    return results;
  }
  const anonHdr = { apikey: anon, Authorization: `Bearer ${anon}` };
  const ctl = await fetch(`${base}/rest/v1/agents?select=id&limit=1`, { headers: anonHdr });
  if (ctl.status !== 200) {
    notRun("the anon half of the store", `the anon key in env is not a working anon key (HTTP ${ctl.status}).`);
    return results;
  }
  const n = await fetch(`${base}/rest/v1/${TABLE}?select=*&limit=1`, { headers: anonHdr });
  const body = await n.text();
  assert.ok(n.status >= 400, `${TABLE} answered the public anon key with HTTP ${n.status} -- it must be refused`);
  assert.ok(!/PGRST205/.test(body), `${TABLE} anon refusal is PGRST205 (table missing), not a grant refusal`);
  results.push(`live-${TABLE}-anon-refused (${n.status})`);
  return results;
}

async function run() {
  const seed = read(SEED_REL);
  const results = [];
  results.push(...partA_rows(seed));
  results.push(...partB_noPersonalFacts(seed));
  results.push(...(await partC_productAndRuleOne(seed)));
  results.push(...(await partD_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
