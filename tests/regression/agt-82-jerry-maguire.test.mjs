// DeepBench v7.0.560 | tests/regression/agt-82-jerry-maguire.test.mjs | AGT-82
//
// FEATURE: AGT-82 -- Jerry Maguire (JM-01), John's private career agent. Three things landed
// together and this file pins all three: a third agent lane ('personal', migration
// agt82_personal_lane_and_career_records widens ck_agents_lane), a closed career-records store
// (public.career_records, zero public grants -- every personal fact lives there and nowhere else),
// and his agent rows, applied verbatim from docs/design/agt-82-jerry-maguire-seed.sql.
//
// STATIC (always run):
//   (a) api/_lib/mcp.js visibleRows() hides a 'personal' row from a caller without the governance
//       key and still shows a 'product' row. Negative control: a local "is it governance?" filter
//       (r => r.lane !== 'governance') fails the same assertion -- proving the fence asks "is it
//       product?", which is what keeps a lane added tomorrow hidden by default.
//   (b) the seed carries no personal-fact marker (512., @yahoo, SOVRA, Periscope, mdf word-bounded,
//       Deverus, Fluid Innovation; case-insensitive) -- skill_profiles is readable with the public key.
//       Mutation control: a copy with one marker spliced in is caught.
//   (c) every 'knowledge' row in the seed's jm- VALUES carries "source":"inline" (count >= 1).
//       Mutation control: a copy with the trait rewritten is caught.
//   (d) Rule #1 -- no jm- Skill text names an agents.id (word-bounded, case-insensitive, jerry's own
//       id excluded): ids from live agents?select=id when creds are present, else AGENTS from
//       src/data/agents.js. Mutation control: a copy with a real id spliced into a jm- row is caught.
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN):
//   agents?id=eq.jerry -> [{lane:'personal', is_active:false}]; 11 agent_capability_assignments;
//   career_records refused to the anon key (status >= 400) AND answered to the service key (200) --
//   both halves or fail. The anon half needs a REAL anon key (VITE_SUPABASE_ANON_KEY or
//   SUPABASE_ANON_KEY): it is proven real first by an anon read of agents answering 200, because
//   other suite members set a "regression-placeholder" key that would 401 everything and make a
//   refusal prove nothing. Without a usable anon key the anon half is declared NOT RUN.
//
// BASELINE (`node scripts/baseline-red-set.js --tests=tests/regression/agt-82-jerry-maguire.test.mjs`, unchanged tree, exit 0):
// ```
// baseline-red-set: these paths do not exist, so no baseline was measured:
//     tests/regression/agt-82-jerry-maguire.test.mjs
// ```
// The file is new; its red set is the whole file until Tasks 1-3 land. On unchanged origin/dev the
// live arms answer [] / 0 assignments / 404 PGRST205 on career_records, so they cannot pass.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { visibleRows } from "../../api/_lib/mcp.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const SEED_REL = "docs/design/agt-82-jerry-maguire-seed.sql";
const SELF_ID = "jerry";
const EXPECTED_JM_ROWS = 15; // 4 shared Skills + 11 Intents (kickoff CONTEXT)

// ---------------------------------------------------------------------------------------------
// Seed parsing -- one chunk per jm- skill_profiles VALUES tuple
// ---------------------------------------------------------------------------------------------
function jmRows(seed) {
  const start = /^\s*\('(jm-[\w-]+)',\s*'((?:[^']|'')*)',\s*'([a-z_]+)'/gm;
  const hits = [...seed.matchAll(start)];
  return hits.map((m, i) => {
    const from = m.index;
    const nextRow = i + 1 < hits.length ? hits[i + 1].index : seed.length;
    const tail = seed.slice(from).search(/\n(?:INSERT|-- |DO |COMMIT)/);
    const to = Math.min(nextRow, tail === -1 ? seed.length : from + tail);
    return { slug: m[1], type: m[3], text: seed.slice(from, to) };
  });
}

// (b)
const PERSONAL_MARKERS = [/512\./i, /@yahoo/i, /SOVRA/i, /Periscope/i, /\bmdf\b/i, /Deverus/i, /Fluid Innovation/i];
function personalMarkersIn(text) {
  return PERSONAL_MARKERS.filter(re => re.test(text)).map(String);
}

// (c)
function knowledgeInlineCheck(seed) {
  const knowledge = jmRows(seed).filter(r => r.type === "knowledge");
  const notInline = knowledge.filter(r => !/"source"\s*:\s*"inline"/.test(r.text)).map(r => r.slug);
  return { count: knowledge.length, notInline };
}

// (d)
function agentIdsNamed(seed, ids) {
  const out = [];
  for (const row of jmRows(seed)) {
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
function hidesPersonalShowsProduct(filterFn) {
  const personal = filterFn([{ lane: "personal" }], { governanceUnlocked: false });
  const product = filterFn([{ lane: "product" }], { governanceUnlocked: false });
  return Array.isArray(personal) && personal.length === 0 && Array.isArray(product) && product.length === 1;
}

function partA_visibleRowsFence() {
  const results = [];
  assert.deepStrictEqual(visibleRows([{ lane: "personal" }], { governanceUnlocked: false }), [],
    "visibleRows() showed a lane='personal' row to a caller without the governance key");
  assert.strictEqual(visibleRows([{ lane: "product" }], { governanceUnlocked: false }).length, 1,
    "visibleRows() hid a lane='product' row from an ordinary caller");
  assert.ok(hidesPersonalShowsProduct(visibleRows), "visibleRows() failed the personal/product pair");
  results.push("visible-rows-hides-personal-shows-product");

  // Negative control: an "is it governance?" fence lets 'personal' through -- the same check must fail.
  const governanceOnlyFence = rows => rows.filter(r => r.lane !== "governance");
  assert.ok(!hidesPersonalShowsProduct(governanceOnlyFence),
    "control: a lane !== 'governance' filter passed the personal/product check -- it does not discriminate");
  results.push("control-governance-only-fence-fails");
  return results;
}

function partB_noPersonalFacts(seed) {
  const results = [];
  const found = personalMarkersIn(seed);
  assert.deepStrictEqual(found, [], `${SEED_REL} carries personal-fact markers: ${found.join(", ")}`);
  results.push("seed-carries-no-personal-fact-marker");

  const mutated = seed.replace("Jerry Maguire is a personal-lane agent", "Jerry Maguire (mdf) is a personal-lane agent");
  assert.notStrictEqual(mutated, seed, "control setup failed: splice anchor not found in the seed -- fix the anchor, not the assertion");
  assert.ok(personalMarkersIn(mutated).length > 0, "control: a spliced 'mdf' marker was not caught");
  results.push("control-spliced-marker-caught");
  return results;
}

function partC_knowledgeInline(seed) {
  const results = [];
  const rows = jmRows(seed);
  assert.strictEqual(rows.length, EXPECTED_JM_ROWS,
    `parsed ${rows.length} jm- skill_profiles rows from ${SEED_REL}, expected ${EXPECTED_JM_ROWS} -- the parser or the seed changed`);
  const { count, notInline } = knowledgeInlineCheck(seed);
  assert.ok(count >= 1, `no 'knowledge' jm- row found in ${SEED_REL}`);
  assert.deepStrictEqual(notInline, [], `knowledge jm- rows without "source":"inline": ${notInline.join(", ")}`);
  results.push(`seed-knowledge-rows-inline (${count})`);

  const mutated = seed.replace(`'{"source":"inline"}'::jsonb`, `'{"source":"library"}'::jsonb`);
  assert.notStrictEqual(mutated, seed, "control setup failed: the inline trait literal was not found verbatim");
  assert.ok(knowledgeInlineCheck(mutated).notInline.length > 0, "control: a knowledge row rewritten to source=library was not caught");
  results.push("control-non-inline-knowledge-caught");
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

async function partD_ruleOne(seed) {
  const results = [];
  let ids = await liveAgentIds();
  let source = "live agents?select=id";
  if (!ids) {
    const { AGENTS } = await import("../../src/data/agents.js");
    ids = AGENTS.map(a => a.id);
    source = "src/data/agents.js AGENTS";
  }
  assert.ok(ids.length > 0, `no agent ids from ${source}`);
  const named = agentIdsNamed(seed, ids);
  assert.deepStrictEqual(named, [], `jm- Skill text names another agent (Rule #1), ids from ${source}: ${named.join(", ")}`);
  results.push(`seed-jm-rows-name-no-other-agent (${ids.length} ids, ${source})`);

  const other = ids.find(id => id.toLowerCase() !== SELF_ID);
  const mutated = seed.replace("Advocacy is evidence, not encouragement.", `Advocacy is evidence, not encouragement; ask ${other}.`);
  assert.notStrictEqual(mutated, seed, "control setup failed: splice anchor not found in jm-identity");
  assert.ok(agentIdsNamed(mutated, ids).length > 0, `control: a spliced agent id "${other}" was not caught`);
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
    notRun("the live arm (jerry lane/is_active, 11 assignments, career_records anon-refused/service-200 pair)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-09-23): " +
      "agents.jerry is lane='personal', is_active=false with 11 career-* assignments; career_records " +
      "holds zero anon/authenticated grants.");
    return results;
  }
  const base = url.replace(/\/+$/, "");
  const svc = { apikey: key, Authorization: `Bearer ${key}` };

  const aRes = await fetch(`${base}/rest/v1/agents?id=eq.${SELF_ID}&select=lane,is_active`, { headers: svc });
  if (!aRes.ok) assert.fail(`agents?id=eq.${SELF_ID} failed: HTTP ${aRes.status} ${await aRes.text()}`);
  assert.deepStrictEqual(await aRes.json(), [{ lane: "personal", is_active: false }],
    `agents row '${SELF_ID}' is not exactly [{lane:'personal', is_active:false}]`);
  results.push("live-jerry-personal-inactive");

  const cRes = await fetch(`${base}/rest/v1/agent_capability_assignments?agent_id=eq.${SELF_ID}&select=capability_slug`, { headers: svc });
  if (!cRes.ok) assert.fail(`agent_capability_assignments read failed: HTTP ${cRes.status} ${await cRes.text()}`);
  const assignments = await cRes.json();
  assert.strictEqual(assignments.length, 11, `expected 11 assignments for '${SELF_ID}', got ${assignments.length}`);
  results.push("live-jerry-eleven-assignments");

  // Service half: the table exists and the platform can read it.
  const sRes = await fetch(`${base}/rest/v1/career_records?select=id&limit=1`, { headers: svc });
  if (sRes.status !== 200) assert.fail(`career_records with the service key: HTTP ${sRes.status} ${await sRes.text()} (expected 200)`);
  assert.ok(Array.isArray(await sRes.json()), "career_records service read did not return a JSON array");
  results.push("live-career-records-service-200");

  // Anon half: refused. The key must first prove it is a real anon key (agents is anon-readable).
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anon || anon === "regression-placeholder") {
    notRun("the anon half of the career_records pair",
      "no real SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY in env (runner_secrets carries none; the " +
      "browser bundle's key lives in .env.local). The service half above ran.");
    return results;
  }
  const anonHdr = { apikey: anon, Authorization: `Bearer ${anon}` };
  const ctl = await fetch(`${base}/rest/v1/agents?select=id&limit=1`, { headers: anonHdr });
  if (ctl.status !== 200) {
    notRun("the anon half of the career_records pair",
      `the anon key in env is not a working anon key (agents?select=id answered HTTP ${ctl.status}), ` +
      "so a refusal on career_records would prove nothing. The service half above ran.");
    return results;
  }
  results.push("live-anon-key-positive-control-200");
  const nRes = await fetch(`${base}/rest/v1/career_records?select=id&limit=1`, { headers: anonHdr });
  const nBody = await nRes.text();
  assert.ok(nRes.status >= 400,
    `career_records answered the public anon key with HTTP ${nRes.status} -- it must be refused (body: ${nBody.slice(0, 200)})`);
  assert.ok(!/PGRST205/.test(nBody), `career_records anon refusal is a 404 PGRST205 (table missing), not a grant refusal: ${nBody.slice(0, 200)}`);
  results.push(`live-career-records-anon-refused (${nRes.status})`);
  return results;
}

async function run() {
  const seed = read(SEED_REL);
  const results = [];
  results.push(...partA_visibleRowsFence());
  results.push(...partB_noPersonalFacts(seed));
  results.push(...partC_knowledgeInline(seed));
  results.push(...(await partD_ruleOne(seed)));
  results.push(...(await partE_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
