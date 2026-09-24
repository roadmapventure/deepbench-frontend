// DeepBench v7.0.581 | tests/regression/agt-120-nathan-laan.test.mjs | AGT-120
//
// FEATURE: AGT-120 -- Nathan Laan (MK-06), Product Marketing Manager. Three things landed together
// and this file pins all three: a closed market-records store (public.market_records, migration
// agt120_market_records, zero public grants -- every market fact lives there), his agent rows
// applied verbatim from docs/design/agt-120-nathan-laan-seed.sql (1 agent, 11 pmm- Capabilities,
// 11 assignments, 15 nl- Skills, 55 links), and his roster entry in src/data/agents.js.
//
// STATIC (always run):
//   (a) AGENTS has `nathan` with benchGroups exactly ["platform"] (no "mi" -- the Channel
//       Intelligence screen reads "mi"), plus AVATAR_CFG.nathan and AGENT_PRONOUNS he/him/his.
//   (b) lib/project-manager.js's agents roster fetch carries is_active=eq.true AND lane=eq.product,
//       which is what keeps an inactive nathan out of the broker. Control: the same string with
//       `is_active=eq.true&` removed fails the check.
//   (c) the seed parses 15 nl- rows; knowledge rows carry "source":"inline"; career_records appears
//       in no nl- row but nl-guardrails (and does appear there). Control: spliced into nl-identity,
//       caught. The why-deepbench / competitors / objections / messaging Intents' schemas carry
//       "copy_tests" and "time_to_copy_months"; every verdict enum under a "lead" / "headline" /
//       "moat" property lacks "weak"; all 11 Intents require napkin_notes. Control: "weak" spliced
//       into one lead verdict enum, caught.
//   (d) Rule #1: no nl- row, no pmm- capability row and not the agents bio names an agent id
//       (word-bounded, case-insensitive, `nathan` excluded) -- ids live when creds are present,
//       else AGENTS ids union AVATAR_CFG keys. Control: a spliced id is caught.
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN):
//   agents.nathan lane 'product' (is_active deliberately NOT pinned -- John's hire flips it; see
//   agt-82's red); 11 assignments, all pmm-; market_records refused to a proven-real anon key
//   (>= 400 and not PGRST205) AND answered 200 to the service key -- both halves or fail; while
//   nathan is inactive, the broker's own filter (is_active=eq.true&lane=eq.product&id=eq.nathan)
//   returns [], else that part is declared NOT RUN.
//
// BASELINE: the file is new. On unchanged origin/dev every arm fails: no AGENTS entry, the seed
// file absent, market_records 404 PGRST205, agents?id=eq.nathan -> [].

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const SEED_REL = "docs/design/agt-120-nathan-laan-seed.sql";
const PM_REL = "lib/project-manager.js";
const SELF_ID = "nathan";
const EXPECTED_NL_ROWS = 15; // 4 shared Skills + 11 Intents
const EXPECTED_INTENTS = 11;
const COPY_TEST_INTENTS = ["nl-why-deepbench-intent", "nl-competitors-intent", "nl-objections-intent", "nl-messaging-intent"];
const LEAD_KEYS = new Set(["lead", "headline", "moat"]);

// ---------------------------------------------------------------------------------------------
// Seed parsing
// ---------------------------------------------------------------------------------------------
function tupleRows(seed, start) {
  const hits = [...seed.matchAll(start)];
  return hits.map((m, i) => {
    const from = m.index;
    const nextRow = i + 1 < hits.length ? hits[i + 1].index : seed.length;
    const tail = seed.slice(from).search(/\n(?:INSERT|-- |DO |COMMIT)/);
    const to = Math.min(nextRow, tail === -1 ? seed.length : from + tail);
    return { slug: m[1], type: m[3], text: seed.slice(from, to) };
  });
}
// skill_profiles tuples: ('nl-slug', 'Name', 'skill_type', ...
const nlRows = seed => tupleRows(seed, /^\s*\('(nl-[\w-]+)',\s*'((?:[^']|'')*)',\s*'([a-z_]+)'/gm);
// capabilities tuples: ('pmm-slug', 'Name',\n  'description', ...
const pmmRows = seed => tupleRows(seed, /^\s*\('(pmm-[\w-]+)',/gm);

function agentBio(seed) {
  const from = seed.indexOf("INSERT INTO public.agents");
  const to = seed.indexOf("INSERT INTO public.capabilities");
  assert.ok(from !== -1 && to > from, "could not locate the agents INSERT in the seed");
  return seed.slice(from, to);
}

function intentSchema(row) {
  const m = row.text.match(/\$j\$([\s\S]*?)\$j\$/);
  assert.ok(m, `${row.slug}: no $j$ traits block`);
  return JSON.parse(m[1]).schema;
}

// ---------------------------------------------------------------------------------------------
// (a) roster entry
// ---------------------------------------------------------------------------------------------
async function partA_roster() {
  const results = [];
  const { AGENTS, AVATAR_CFG, AGENT_PRONOUNS } = await import("../../src/data/agents.js");
  const entry = AGENTS.find(a => a.id === SELF_ID);
  assert.ok(entry, `AGENTS has no '${SELF_ID}' entry`);
  assert.deepStrictEqual(entry.benchGroups, ["platform"], `AGENTS.${SELF_ID}.benchGroups is not exactly ["platform"]`);
  assert.ok(!entry.benchGroups.includes("mi"), `AGENTS.${SELF_ID} is in the "mi" bench group`);
  assert.strictEqual(entry.code, "MK-06");
  results.push("agents-nathan-platform-only");
  assert.ok(AVATAR_CFG[SELF_ID], `AVATAR_CFG has no '${SELF_ID}'`);
  assert.deepStrictEqual(AGENT_PRONOUNS[SELF_ID], { subject: "he", object: "him", possessive: "his" },
    `AGENT_PRONOUNS.${SELF_ID} is not he/him/his`);
  results.push("avatar-and-pronouns-present");
  return results;
}

// ---------------------------------------------------------------------------------------------
// (b) broker roster fence
// ---------------------------------------------------------------------------------------------
function rosterFetchString(src) {
  // The roster fetch is the agents read that selects the roster columns (id,name,role,...); the
  // file has other agents reads (a single-agent is_active lookup) that are not the roster.
  const m = src.match(/rest\/v1\/agents\?[^`'"]*select=id,name,role[^`'"]*/);
  assert.ok(m, `${PM_REL}: no agents roster fetch (select=id,name,role...) found`);
  return m[0];
}
const fencesInactive = s => s.includes("is_active=eq.true") && s.includes("lane=eq.product");

function partB_rosterFence() {
  const results = [];
  const s = rosterFetchString(read(PM_REL));
  assert.ok(fencesInactive(s), `${PM_REL} roster fetch does not fence is_active=eq.true & lane=eq.product: ${s}`);
  results.push("broker-roster-fences-inactive-and-lane");
  const mutated = s.replace("is_active=eq.true&", "");
  assert.notStrictEqual(mutated, s, "control setup failed: 'is_active=eq.true&' not found in the roster fetch");
  assert.ok(!fencesInactive(mutated), "control: the roster fetch without is_active=eq.true still passed");
  results.push("control-unfenced-roster-fails");
  return results;
}

// ---------------------------------------------------------------------------------------------
// (c) seed content
// ---------------------------------------------------------------------------------------------
function careerRecordsOutsideGuardrails(seed) {
  return nlRows(seed).filter(r => r.slug !== "nl-guardrails" && /career_records/i.test(r.text)).map(r => r.slug);
}

// Every verdict enum reachable under a lead/headline/moat property.
function leadVerdictEnums(schema) {
  const out = [];
  const collectVerdicts = (node, where) => {
    if (!node || typeof node !== "object") return;
    if (node.properties && node.properties.verdict && Array.isArray(node.properties.verdict.enum)) {
      out.push({ where, enum: node.properties.verdict.enum });
    }
    for (const v of Object.values(node)) collectVerdicts(v, where);
  };
  const walk = (node, trail) => {
    if (!node || typeof node !== "object") return;
    if (node.properties && typeof node.properties === "object") {
      for (const [k, v] of Object.entries(node.properties)) {
        if (LEAD_KEYS.has(k)) collectVerdicts(v, `${trail}.${k}`);
        else walk(v, `${trail}.${k}`);
      }
    }
    if (node.items) walk(node.items, `${trail}[]`);
  };
  walk(schema, "$");
  return out;
}

function weakLeads(seed) {
  const bad = [];
  let count = 0;
  for (const row of nlRows(seed).filter(r => r.type === "intent")) {
    for (const v of leadVerdictEnums(intentSchema(row))) {
      count++;
      if (v.enum.includes("weak")) bad.push(`${row.slug}${v.where}`);
    }
  }
  return { count, bad };
}

function partC_seed(seed) {
  const results = [];
  const rows = nlRows(seed);
  assert.strictEqual(rows.length, EXPECTED_NL_ROWS, `parsed ${rows.length} nl- rows from ${SEED_REL}, expected ${EXPECTED_NL_ROWS}`);
  results.push(`seed-nl-rows (${rows.length})`);

  const knowledge = rows.filter(r => r.type === "knowledge");
  assert.ok(knowledge.length >= 1, "no knowledge nl- row");
  const notInline = knowledge.filter(r => !/"source"\s*:\s*"inline"/.test(r.text)).map(r => r.slug);
  assert.deepStrictEqual(notInline, [], `knowledge rows without "source":"inline": ${notInline.join(", ")}`);
  results.push(`seed-knowledge-inline (${knowledge.length})`);

  const guard = rows.find(r => r.slug === "nl-guardrails");
  assert.ok(guard && /career_records/.test(guard.text), "nl-guardrails does not forbid career_records");
  assert.deepStrictEqual(careerRecordsOutsideGuardrails(seed), [], "career_records named outside nl-guardrails");
  results.push("career-records-only-in-guardrails");
  const anchor = "Positioning is evidence, not adjectives.";
  const spliced = seed.replace(anchor, `${anchor} Read career_records.`);
  assert.notStrictEqual(spliced, seed, "control setup failed: nl-identity anchor not found");
  assert.deepStrictEqual(careerRecordsOutsideGuardrails(spliced), ["nl-identity"], "control: career_records spliced into nl-identity was not caught");
  results.push("control-career-records-splice-caught");

  const intents = rows.filter(r => r.type === "intent");
  assert.strictEqual(intents.length, EXPECTED_INTENTS, `expected ${EXPECTED_INTENTS} intents, got ${intents.length}`);
  for (const slug of COPY_TEST_INTENTS) {
    const row = intents.find(r => r.slug === slug);
    assert.ok(row, `intent ${slug} missing`);
    const s = JSON.stringify(intentSchema(row));
    assert.ok(s.includes('"copy_tests"') && s.includes('"time_to_copy_months"'), `${slug} schema lacks copy_tests / time_to_copy_months`);
  }
  results.push("copy-test-intents-carry-copy-tests");
  const noNapkin = intents.filter(r => !(intentSchema(r).required || []).includes("napkin_notes")).map(r => r.slug);
  assert.deepStrictEqual(noNapkin, [], `intents not requiring napkin_notes: ${noNapkin.join(", ")}`);
  results.push("all-intents-require-napkin-notes");

  const { count, bad } = weakLeads(seed);
  assert.ok(count >= 5, `found only ${count} lead/headline/moat verdict enums -- the walker or the seed changed`);
  assert.deepStrictEqual(bad, [], `lead verdict enums admitting weak: ${bad.join(", ")}`);
  results.push(`lead-verdicts-refuse-weak (${count})`);
  const leadEnum = '"verdict":{"type":"string","enum":["durable","temporary"]}';
  const weakened = seed.replace(leadEnum, '"verdict":{"type":"string","enum":["durable","temporary","weak"]}');
  assert.notStrictEqual(weakened, seed, "control setup failed: lead verdict enum not found verbatim");
  assert.strictEqual(weakLeads(weakened).bad.length, 1, "control: weak spliced into a lead verdict enum was not caught");
  results.push("control-weak-lead-caught");
  return results;
}

// ---------------------------------------------------------------------------------------------
// (d) Rule #1
// ---------------------------------------------------------------------------------------------
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function idsNamed(seed, ids) {
  const sections = [
    ...nlRows(seed).map(r => ({ label: r.slug, text: r.text })),
    ...pmmRows(seed).map(r => ({ label: r.slug, text: r.text })),
    { label: "agents-bio", text: agentBio(seed) },
  ];
  const out = [];
  for (const sec of sections) {
    for (const id of ids) {
      if (!id || id.toLowerCase() === SELF_ID) continue;
      const re = new RegExp("\\b" + escapeRe(id) + "\\b", "i");
      if (re.test(sec.text)) out.push(`${sec.label}~${id}`);
    }
  }
  return out;
}

async function liveAgentIds() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/agents?select=id`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) assert.fail(`agents?select=id failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).map(r => r.id);
}

async function partD_ruleOne(seed) {
  const results = [];
  let ids = await liveAgentIds();
  let source = "live agents?select=id";
  if (!ids) {
    const { AGENTS, AVATAR_CFG } = await import("../../src/data/agents.js");
    ids = [...new Set([...AGENTS.map(a => a.id), ...Object.keys(AVATAR_CFG)])];
    source = "AGENTS ids + AVATAR_CFG keys";
  }
  assert.ok(ids.length > 1, `too few agent ids from ${source}`);
  assert.strictEqual(pmmRows(seed).length, 11, "expected 11 pmm- capability rows in the seed");
  // The matcher must be a real word boundary: it finds a bare id and does not fire inside a word.
  assert.ok(new RegExp("\\bsam\\b", "i").test("ask sam now") && !new RegExp("\\bsam\\b", "i").test("samples"),
    "word-boundary regex self-check failed");
  const named = idsNamed(seed, ids);
  assert.deepStrictEqual(named, [], `seed text names another agent (Rule #1), ids from ${source}: ${named.join(", ")}`);
  results.push(`rule-one-no-other-agent-named (${ids.length} ids, ${source})`);

  const other = ids.find(id => id.toLowerCase() !== SELF_ID);
  const anchor = "Positioning is evidence, not adjectives.";
  const mutated = seed.replace(anchor, `${anchor} Hand this to ${other}.`);
  assert.notStrictEqual(mutated, seed, "control setup failed: nl-identity anchor not found");
  assert.ok(idsNamed(mutated, ids).includes(`nl-identity~${other}`), `control: a spliced agent id "${other}" was not caught`);
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
    notRun("the live arm (nathan lane, 11 pmm- assignments, market_records anon-refused/service-200 pair, broker filter)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-09-24): agents.nathan " +
      "lane='product', is_active=false, 11 pmm- assignments; market_records anon HTTP 401 42501, service 200.");
    return results;
  }
  const base = url.replace(/\/+$/, "");
  const svc = { apikey: key, Authorization: `Bearer ${key}` };
  const getJson = async (p, headers) => {
    const r = await fetch(`${base}/rest/v1/${p}`, { headers });
    if (!r.ok) assert.fail(`${p} failed: HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };

  const agent = await getJson(`agents?id=eq.${SELF_ID}&select=lane,is_active`, svc);
  assert.strictEqual(agent.length, 1, `agents row '${SELF_ID}' missing`);
  assert.strictEqual(agent[0].lane, "product", `agents.${SELF_ID}.lane is ${agent[0].lane}, expected product`);
  results.push(`live-nathan-product (is_active=${agent[0].is_active}, not pinned)`);

  const assignments = await getJson(`agent_capability_assignments?agent_id=eq.${SELF_ID}&select=capability_slug`, svc);
  assert.strictEqual(assignments.length, 11, `expected 11 assignments for '${SELF_ID}', got ${assignments.length}`);
  const notPmm = assignments.filter(a => !a.capability_slug.startsWith("pmm-")).map(a => a.capability_slug);
  assert.deepStrictEqual(notPmm, [], `non-pmm assignments: ${notPmm.join(", ")}`);
  results.push("live-eleven-pmm-assignments");

  // market_records: service half.
  const sRes = await fetch(`${base}/rest/v1/market_records?select=id&limit=1`, { headers: svc });
  if (sRes.status !== 200) assert.fail(`market_records with the service key: HTTP ${sRes.status} ${await sRes.text()} (expected 200)`);
  assert.ok(Array.isArray(await sRes.json()), "market_records service read did not return a JSON array");
  results.push("live-market-records-service-200");

  // market_records: anon half -- both halves or fail (kickoff section 5). The key must prove it is real first.
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  assert.ok(anon && anon !== "regression-placeholder",
    "no real SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY in env -- the market_records anon half is required, not optional");
  const anonHdr = { apikey: anon, Authorization: `Bearer ${anon}` };
  const ctl = await fetch(`${base}/rest/v1/agents?select=id&limit=1`, { headers: anonHdr });
  assert.strictEqual(ctl.status, 200, `the anon key in env is not a working anon key (agents?select=id answered HTTP ${ctl.status})`);
  results.push("live-anon-key-positive-control-200");
  const nRes = await fetch(`${base}/rest/v1/market_records?select=id&limit=1`, { headers: anonHdr });
  const nBody = await nRes.text();
  assert.ok(nRes.status >= 400, `market_records answered the public anon key with HTTP ${nRes.status} -- it must be refused (body: ${nBody.slice(0, 200)})`);
  assert.ok(!/PGRST205/.test(nBody), `market_records anon refusal is 404 PGRST205 (table missing), not a grant refusal: ${nBody.slice(0, 200)}`);
  results.push(`live-market-records-anon-refused (${nRes.status})`);

  // Broker filter: while inactive, the broker's own query must not return him.
  if (agent[0].is_active === false) {
    const broker = await getJson(`agents?is_active=eq.true&lane=eq.product&id=eq.${SELF_ID}&select=id`, svc);
    assert.deepStrictEqual(broker, [], `the broker roster filter returned inactive '${SELF_ID}'`);
    results.push("live-broker-filter-excludes-inactive-nathan");
  } else {
    notRun("the inactive-nathan broker-filter check", `agents.${SELF_ID}.is_active is ${agent[0].is_active} (John's hire) -- the inactive fence has nothing to hide.`);
  }
  return results;
}

async function run() {
  const seed = read(SEED_REL);
  const results = [];
  results.push(...(await partA_roster()));
  results.push(...partB_rosterFence());
  results.push(...partC_seed(seed));
  results.push(...(await partD_ruleOne(seed)));
  results.push(...(await partE_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
