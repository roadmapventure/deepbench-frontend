// DeepBench v7.0.752 | tests/regression/agt-164-brittany.test.mjs | AGT-164 (AGT-332 slice 1: the benchGroups pin follows her to ["private"])
//
// FEATURE: AGT-164 -- Brittany (MK-07), the outside tester's BLANK marketing agent. Two things
// landed together and this file pins both: her `public.agents` row, applied verbatim from
// docs/design/agt-164-brittany-seed.sql under rule AGENT-ROW-AGREED-TICKET with its own
// runner_before_images row, and her entry in src/data/agents.js. The roster entry IS her Teach
// access (useAgents.js returns the static AGENTS; PersonnelScreen.jsx resolves :agentId against it),
// so nothing under api/ changes.
//
// WHAT "BLANK" MEANS, AND WHY IT IS READ RATHER THAN ASSUMED: she ships with NO agent_configs,
// skill_profiles, capabilities, capability_skill_profiles, agent_capability_assignments,
// knowledge_entries or the_library row, and data_room_access '[]' (no Library, ARCHITECTURE §19c).
// Everything she knows is the outside tester's to teach on her Teach screen. A test that only
// counted what the seed HAS would pass on a seed that quietly grew a config row, so (b) asserts
// the seed writes NOTHING against those seven tables and proves the assertion can fail by
// splicing an `INSERT INTO public.agent_configs` in and catching it.
//
// STATIC (always run):
//   (a) AGENTS has `brittany` -- code MK-07, trainable true, benchGroups exactly ["private"] (no
//       "mi": the Channel Intelligence screen reads "mi"), a five-key AVATAR_CFG entry, and
//       AGENT_PRONOUNS she/her/her.
//   (b) the seed carries exactly ONE `INSERT INTO public.agents`, and that statement carries
//       'brittany', 'MK-07', `false, 'create', 'customer'` and `'[]'::jsonb`; exactly one
//       runner_before_images INSERT; and no INSERT against the seven blank-agent tables. Controls:
//       a spliced agent_configs INSERT is caught, and so is an is_active=true flip.
//   (c) Rule #1: her bio and specialty (from the seed) and her quip (from the roster) name no
//       other agent id, word-bounded, case-insensitive -- ids live when credentials are present,
//       else AGENTS ids union AVATAR_CFG keys. Control: a spliced id is caught.
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN):
//   agents?id=eq.brittany -> exactly 1 row, lane 'product', agent_origin 'customer',
//   data_room_access []; `is_active` is PRINTED and never pinned -- flipping it on is John's hire
//   card (.claude/rules/agent-roster-inert.md), so pinning it here would turn his signature red.
//   runner_before_images?table_name=eq.agents&pk_value=eq.brittany -> >= 1 row with a non-null
//   decision_id (AGENT-ROW-AGREED-TICKET's one decision handle).
//
// BASELINE: the file is new. On unchanged origin/dev every arm fails -- agents?id=eq.brittany
// answered [] (32 rows, 0 brittany, measured 2026-09-28), AGENTS.find(a => a.id === "brittany")
// was undefined, and this file did not exist.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const SEED_REL = "docs/design/agt-164-brittany-seed.sql";
const SELF_ID = "brittany";
const CODE = "MK-07";
const AVATAR_KEYS = ["skin", "hair", "collar", "extra", "border"];
// Task 1's seven tables: she gets a row in none of them -- the Teach screen is where her knowledge
// arrives, and the outside tester puts it there.
const BLANK_TABLES = ["agent_configs", "skill_profiles", "capabilities", "capability_skill_profiles",
  "agent_capability_assignments", "knowledge_entries", "the_library"];

// --- seed parsing -----------------------------------------------------------------------------
// An INSERT statement's text runs to the next INSERT, the DO block's end, or the file's end.
function insertStatements(seed) {
  const hits = [...seed.matchAll(/INSERT\s+INTO\s+(?:public\.)?([a-z_]+)/gi)];
  return hits.map((m, i) => {
    const to = i + 1 < hits.length ? hits[i + 1].index : seed.length;
    return { table: m[1].toLowerCase(), text: seed.slice(m.index, to) };
  });
}
const insertsInto = (seed, table) => insertStatements(seed).filter(s => s.table === table);
const blankTablesWritten = seed => insertStatements(seed).filter(s => BLANK_TABLES.includes(s.table)).map(s => s.table);

function agentsInsert(seed) {
  const rows = insertsInto(seed, "agents");
  assert.strictEqual(rows.length, 1, `${SEED_REL}: expected exactly one INSERT INTO public.agents, found ${rows.length}`);
  return rows[0].text;
}
function seedBio(seed) {
  const m = seed.match(/\$q\$([\s\S]*?)\$q\$/);
  assert.ok(m, `${SEED_REL}: no $q$ bio block`);
  return m[1];
}
function seedSpecialty(seed) {
  const m = agentsInsert(seed).match(/'(Marketing[^']*)'/);
  assert.ok(m, `${SEED_REL}: no specialty string in the agents INSERT`);
  return m[1];
}

// --- (a) roster entry -------------------------------------------------------------------------
async function partA_roster() {
  const results = [];
  const { AGENTS, AVATAR_CFG, AGENT_PRONOUNS, BENCH_FILTERS, BENCH_PRIVATE, isPrivateAgent } = await import("../../src/data/agents.js");
  const entry = AGENTS.find(a => a.id === SELF_ID);
  assert.ok(entry, `AGENTS has no '${SELF_ID}' entry`);
  assert.strictEqual(entry.code, CODE, `AGENTS.${SELF_ID}.code is ${entry.code}, expected ${CODE}`);
  assert.strictEqual(entry.trainable, true, `AGENTS.${SELF_ID}.trainable is ${entry.trainable} -- the tester trains her`);
  assert.deepStrictEqual(entry.benchGroups, ["private"], `AGENTS.${SELF_ID}.benchGroups is not exactly ["private"] (AGT-332: Private only)`);
  assert.ok(!entry.benchGroups.includes("mi"), `AGENTS.${SELF_ID} is in the "mi" bench group`);
  // FEATURE: AGT-332 -- Private is a benchGroups VALUE read off the agent's own entry, never an id check.
  assert.deepStrictEqual(BENCH_PRIVATE, { id: "private", label: "Private" }, `BENCH_PRIVATE is not { id: "private", label: "Private" }`);
  assert.ok(!BENCH_FILTERS.some(f => f.id === "private"), `BENCH_FILTERS lists "private" -- like "all" it is positioned, not a plain group`);
  assert.strictEqual(isPrivateAgent(entry), true, `isPrivateAgent(${SELF_ID}) is not true`);
  assert.strictEqual(isPrivateAgent(AGENTS.find(a => a.id === "nathan")), false, `isPrivateAgent(nathan) is not false -- the move bled past ${SELF_ID}`);
  assert.strictEqual(AGENTS.filter(isPrivateAgent).length, 1, `expected exactly 1 private agent at this ship, found ${AGENTS.filter(isPrivateAgent).length}`);
  assert.strictEqual(isPrivateAgent({}), false, `isPrivateAgent({}) is not false -- no benchGroups is not private`);
  results.push(`agents-brittany-${CODE}-trainable-private-only`);

  const avatar = AVATAR_CFG[SELF_ID];
  assert.ok(avatar, `AVATAR_CFG has no '${SELF_ID}'`);
  assert.deepStrictEqual(Object.keys(avatar).sort(), [...AVATAR_KEYS].sort(),
    `AVATAR_CFG.${SELF_ID} keys are ${Object.keys(avatar).join(",")}, expected ${AVATAR_KEYS.join(",")}`);
  for (const k of AVATAR_KEYS) assert.ok(avatar[k], `AVATAR_CFG.${SELF_ID}.${k} is empty`);
  assert.deepStrictEqual(AGENT_PRONOUNS[SELF_ID], { subject: "she", object: "her", possessive: "her" },
    `AGENT_PRONOUNS.${SELF_ID} is not she/her/her`);
  results.push("avatar-five-keys-and-she-her-her");
  return results;
}

// --- (b) the seed is blank, and is read to be blank -------------------------------------------
function partB_seed(seed) {
  const results = [];
  const ins = agentsInsert(seed);
  for (const needle of ["'brittany'", `'${CODE}'`, "false, 'create', 'customer'", "'[]'::jsonb"]) {
    assert.ok(ins.includes(needle), `${SEED_REL}: the agents INSERT does not carry ${needle}`);
  }
  results.push("seed-one-agents-insert-brittany-mk07-inactive-create-customer-nolibrary");

  const before = insertsInto(seed, "runner_before_images");
  assert.strictEqual(before.length, 1, `${SEED_REL}: expected exactly one runner_before_images INSERT, found ${before.length}`);
  assert.ok(/'agents'/.test(before[0].text) && /'brittany'/.test(before[0].text),
    `${SEED_REL}: the before-image INSERT does not name ('agents','brittany')`);
  results.push("seed-one-before-image-for-agents-brittany");

  assert.deepStrictEqual(blankTablesWritten(seed), [],
    `${SEED_REL} writes a row she must not have: ${blankTablesWritten(seed).join(", ")}`);
  results.push(`seed-writes-none-of-the-${BLANK_TABLES.length}-blank-tables`);

  // Control: the blank check must be able to fail. Splice a config INSERT in and catch it.
  const anchor = "  INSERT INTO public.runner_before_images";
  assert.ok(seed.includes(anchor), "control setup failed: the before-image INSERT anchor was not found");
  const spliced = seed.replace(anchor,
    "  INSERT INTO public.agent_configs (agent_id, role_prompt) VALUES ('brittany', 'be a marketer');\n" + anchor);
  assert.deepStrictEqual(blankTablesWritten(spliced), ["agent_configs"],
    "control: a spliced INSERT INTO public.agent_configs was not caught");
  results.push("control-spliced-agent-configs-insert-caught");

  // Control: an is_active=true flip must be caught too -- John's hire card is the one thing this
  // ship may not do, so the assertion that reads `false, 'create', 'customer'` is proven to bite.
  const hired = seed.replace("false, 'create', 'customer'", "true, 'create', 'customer'");
  assert.notStrictEqual(hired, seed, "control setup failed: the is_active literal was not found");
  assert.ok(!agentsInsert(hired).includes("false, 'create', 'customer'"),
    "control: an is_active=true flip in the seed was not caught");
  results.push("control-is-active-true-flip-caught");
  return results;
}

// --- (c) Rule #1 ------------------------------------------------------------------------------
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function idsNamed(sections, ids) {
  const out = [];
  for (const sec of sections) {
    for (const id of ids) {
      if (!id || id.toLowerCase() === SELF_ID) continue;
      if (new RegExp("\\b" + escapeRe(id) + "\\b", "i").test(sec.text)) out.push(`${sec.label}~${id}`);
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

async function partC_ruleOne(seed) {
  const results = [];
  const { AGENTS, AVATAR_CFG } = await import("../../src/data/agents.js");
  let ids = await liveAgentIds();
  let source = "live agents?select=id";
  if (!ids) {
    ids = [...new Set([...AGENTS.map(a => a.id), ...Object.keys(AVATAR_CFG)])];
    source = "AGENTS ids + AVATAR_CFG keys";
  }
  assert.ok(ids.length > 1, `too few agent ids from ${source}`);
  // The matcher must be a real word boundary: it finds a bare id and does not fire inside a word.
  assert.ok(new RegExp("\\bpat\\b", "i").test("ask pat now") && !new RegExp("\\bpat\\b", "i").test("pattern"),
    "word-boundary regex self-check failed");

  const quip = AGENTS.find(a => a.id === SELF_ID).quip;
  const sections = [
    { label: "seed-bio", text: seedBio(seed) },
    { label: "seed-specialty", text: seedSpecialty(seed) },
    { label: "roster-quip", text: quip },
  ];
  for (const sec of sections) assert.ok(sec.text && sec.text.trim().length > 0, `${sec.label} is empty`);
  const named = idsNamed(sections, ids);
  assert.deepStrictEqual(named, [], `her own text names another agent (Rule #1), ids from ${source}: ${named.join(", ")}`);
  results.push(`rule-one-no-other-agent-named (${ids.length} ids, ${source})`);

  const other = ids.find(id => id.toLowerCase() !== SELF_ID);
  const mutated = sections.map(s => s.label === "seed-bio" ? { ...s, text: `${s.text} Ask ${other} first.` } : s);
  assert.ok(idsNamed(mutated, ids).includes(`seed-bio~${other}`), `control: a spliced agent id "${other}" was not caught`);
  results.push("control-spliced-agent-id-caught");
  return results;
}

// --- LIVE -------------------------------------------------------------------------------------
async function partD_live() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (brittany's agents row and her before-image)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-09-28): " +
      "agents.brittany lane='product', agent_origin='customer', data_room_access=[], is_active=false, " +
      "33 agents rows; one runner_before_images row (agents/brittany) with decision_id " +
      "258c4768-29d2-4818-aac2-0cc98184cc17 and row_data NULL.");
    return results;
  }
  const base = url.replace(/\/+$/, "");
  const svc = { apikey: key, Authorization: `Bearer ${key}` };
  const getJson = async p => {
    const r = await fetch(`${base}/rest/v1/${p}`, { headers: svc });
    if (!r.ok) assert.fail(`${p} failed: HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };

  const rows = await getJson(`agents?id=eq.${SELF_ID}&select=id,lane,agent_origin,data_room_access,is_active`);
  assert.strictEqual(rows.length, 1, `agents?id=eq.${SELF_ID} returned ${rows.length} rows, expected 1`);
  const a = rows[0];
  assert.strictEqual(a.lane, "product", `agents.${SELF_ID}.lane is ${a.lane}, expected product`);
  assert.strictEqual(a.agent_origin, "customer", `agents.${SELF_ID}.agent_origin is ${a.agent_origin}, expected customer`);
  assert.deepStrictEqual(a.data_room_access, [], `agents.${SELF_ID}.data_room_access is ${JSON.stringify(a.data_room_access)}, expected [] (no Library)`);
  // is_active is REPORTED, never pinned: flipping it on is John's hire card.
  results.push(`live-brittany-product-customer-no-library (is_active=${a.is_active}, not pinned)`);

  const bi = await getJson(`runner_before_images?table_name=eq.agents&pk_value=eq.${SELF_ID}&select=id,decision_id,row_data`);
  assert.ok(bi.length >= 1, `no runner_before_images row for agents/${SELF_ID} -- AGENT-ROW-AGREED-TICKET requires one`);
  const noDecision = bi.filter(r => !r.decision_id).map(r => r.id);
  assert.deepStrictEqual(noDecision, [], `before-image rows for agents/${SELF_ID} with a null decision_id: ${noDecision.join(", ")}`);
  results.push(`live-before-image-with-decision (${bi.length} row(s))`);
  return results;
}

async function run() {
  const seed = read(SEED_REL);
  const results = [];
  results.push(...(await partA_roster()));
  results.push(...partB_seed(seed));
  results.push(...(await partC_ruleOne(seed)));
  results.push(...(await partD_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
