// DeepBench v7.0.590 | tests/regression/agt-144-model-assignment.test.mjs | AGT-144 -- The
// Development Manager gains the Model Assignment capability: 3 Skills, 1 capability, 9 links, 1
// assignment, 5 new dm-guardrails prohibitions, and two SQL functions that own every write
// (public.apply_model_assignment, public.review_model_watch).
//
// THE CONTROL. On origin/dev + AGT-142/143 (before this ship) there is no `model-assignment`
// capability row, the rpc answers 404, SERVICE_CATALOG carries no slug and dm-guardrails carries
// none of the five -- every live line below fails there.
//
// THE REFUSALS ARE DRIVEN, NOT DESCRIBED (b, c). apply_model_assignment() is called with a switch
// carrying 2 trials and with a non-Claude model, and the target row plus the count of
// model-assignment decisions are re-read afterwards: a function that refused AND wrote would pass
// a message-only assertion. The anon key is refused on both functions (the default-ACL hole
// .claude/rules/supabase-column-grants.md's SES-315 addendum names).
//
// NOT RUN HERE, DECLARED: the successful switch (images 1 + 54), the 10% token refusal, the money
// alert and the watch self-revert need a transaction that rolls back, which PostgREST cannot give
// (SES-310). The migration's trailing DO block asserts all of them in the SAME transaction that
// created the functions, ending in raise 'agt144-proof'.
//
// NO MODEL CALL, NO SPEND. REST reads and three refused rpc calls; nothing is written.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { SERVICE_CATALOG } from "../../shared/ai-patterns.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION = path.resolve(HERE, "../../docs/design/agt-144-model-assignment.sql");
const CAPABILITY = "model-assignment";
const INTENT = "dm-model-assign-intent";
const LINKS = [
  "dm-identity", "dm-knowledge-platform", "dm-behavior", INTENT,
  "dm-release-watch-intent", "dm-knowledge-model-trial", "dm-guardrails",
  "dm-knowledge-patterns", "dm-knowledge-cycle-card",
];
const OWN_TYPES = { [INTENT]: "intent", "dm-release-watch-intent": "intent", "dm-knowledge-model-trial": "knowledge" };
const FIVE = [
  "Claude models only",
  "never a routine's on/off",
  "never crons",
  "never budget walls, pace stop or the API walls",
  "a switch needing a plan upgrade, paid extra usage or API dollars beyond the walls is a money ask, no switch until answered",
];
const TWO_TRIALS = [1, 2].map(i => ({
  job_ref: `agt144-test-${i}`, run_at: "2026-09-25",
  baseline: { passed: true, verdict: "none", tokens: 1000, minutes: 10 },
  candidate: { passed: true, verdict: "none", tokens: 1000, minutes: 10 },
}));

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text.trim() === "" ? [] : JSON.parse(text);
}

async function rpc(url, key, fn, body) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

// ---- (d, offline half) the migration file ------------------------------------------------
function partDFile() {
  const sql = fs.readFileSync(MIGRATION, "utf8");
  assert.ok(sql.includes("'agt144-proof'"), "the migration ends its proof in raise 'agt144-proof'");
  assert.ok(/create or replace function public\.apply_model_assignment\(\s*p_answer jsonb, p_cycle_id uuid, p_session_name text\)/.test(sql),
    "the migration holds apply_model_assignment's text with its one identity");
  assert.ok(/create or replace function public\.review_model_watch\(p_cycle_id uuid, p_session_name text\)/.test(sql),
    "the migration holds review_model_watch's text with its one identity");
  for (const s of FIVE) {
    assert.ok(sql.includes(s.replace(/'/g, "''")), `the migration carries the prohibition "${s}"`);
  }
  assert.ok(/revoke all on function public\.apply_model_assignment\(jsonb, uuid, text\) from public, anon, authenticated/.test(sql)
    && /revoke all on function public\.review_model_watch\(uuid, text\)\s+from public, anon, authenticated/.test(sql),
    "both functions are revoked from public, anon and authenticated BY NAME (SES-315 addendum)");
  console.log("  (d) migration file: proof marker, both function texts, the five, both revokes -- PASS");
}

// ---- (a, offline half) the catalog entry -------------------------------------------------
function partACatalog() {
  const entry = SERVICE_CATALOG.find(s => s.slug === CAPABILITY);
  assert.ok(entry, `SERVICE_CATALOG carries no ${CAPABILITY} entry -- scripts/agent-log.js would refuse every trial and decision log row (SES-338)`);
  assert.equal(entry.serviceType, "ai");
  assert.deepEqual(entry.patterns, ["Tool Use", "Structured Output"]);
  assert.equal(entry.roadmap, "now");
  console.log("  (a) model-assignment is in SERVICE_CATALOG as 'ai' with Tool Use + Structured Output -- PASS");
}

async function run() {
  partDFile();
  partACatalog();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "parts (a) live, (b), (c), (d) live: the capability rows, apply_model_assignment()'s refusals, the anon refusal, the one agent-row decision",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The change is rows and two Postgres functions; " +
        "there is no source-parsed stand-in. Canonical invocation: docs/STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // ---- (a) the rows ----------------------------------------------------------------------
  const cap = await pg(url, key, `capabilities?slug=eq.${CAPABILITY}&select=slug,default_intent_slug,display_phrase,execution_type,tenant_id`);
  assert.equal(cap.length, 1, `exactly one capabilities row for ${CAPABILITY}`);
  assert.equal(cap[0].default_intent_slug, INTENT);
  assert.equal(cap[0].display_phrase, "assigning the models");
  const links = await pg(url, key,
    `capability_skill_profiles?capability_slug=eq.${CAPABILITY}&select=skill_profile_slug,level,is_required,display_order&order=display_order`);
  assert.deepEqual(links.map(l => l.skill_profile_slug), LINKS, "nine links: AGT-127's six plus the three, in display_order 1..9");
  assert.deepEqual(links.map(l => l.display_order), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.ok(links.every(l => l.level === 2 && l.is_required === true), "every link is level 2, required");
  const own = await pg(url, key,
    `skill_profiles?slug=in.(${Object.keys(OWN_TYPES).join(",")})&select=slug,skill_type_slug,traits,guardrails`);
  assert.equal(own.length, 3, "the three new Skill rows exist");
  for (const r of own) {
    assert.equal(r.skill_type_slug, OWN_TYPES[r.slug], `${r.slug} is a ${OWN_TYPES[r.slug]} Skill (pattern 136)`);
    if (r.skill_type_slug === "intent") {
      const schema = r.traits?.schema;
      assert.ok(schema?.properties, `${r.slug} carries its output contract in traits.schema`);
      assert.ok(!Object.prototype.hasOwnProperty.call(schema.properties, "reasoning"),
        `${r.slug}: no Intent may declare a property named reasoning (SES-347)`);
    }
  }
  const assignSchema = own.find(r => r.slug === INTENT).traits.schema;
  assert.deepEqual(assignSchema.properties.actions.items.properties.action.enum, ["switch", "keep", "money", "file-ticket"],
    "the stored contract's action enum is the function's k_actions, in its order");
  const held = await pg(url, key, "agent_capability_assignments?agent_id=eq.devmanager&select=capability_slug");
  assert.deepEqual(held.map(h => h.capability_slug).sort(),
    ["decide-gated-card", "model-assignment", "review-audit-worklist", "run-project"],
    "devmanager holds exactly four capabilities");
  const guard = await pg(url, key, "skill_profiles?slug=eq.dm-guardrails&select=guardrails");
  const mustNot = guard[0].guardrails.must_not;
  for (const s of FIVE) assert.ok(mustNot.includes(s), `dm-guardrails.must_not carries "${s}"`);
  assert.ok(mustNot.includes("name another agent in its own rows"),
    "the six standing prohibitions were KEPT -- the five are appended, never a replacement");
  console.log(`  (a) ${CAPABILITY} -> ${INTENT}; 9 links; types intent/intent/knowledge; devmanager holds 4; must_not ${mustNot.length} incl. the five -- PASS`);

  // ---- (b) 2 trials refused naming 3, the row byte-equal, no decision written -------------
  const mechPath = "model_assignments?job_kind=eq.lane&job_key=eq.mechanical&select=*";
  const decPath = "runner_decisions?kind=in.(model-assignment,model-keep,model-catalog,model-revert)&select=id";
  const cycles = await pg(url, key, "runner_cycles?select=id&order=started_at.desc&limit=1");
  const cycleId = cycles[0].id;
  const mechBefore = await pg(url, key, mechPath);
  const decBefore = await pg(url, key, decPath);
  const r2 = await rpc(url, key, "apply_model_assignment", {
    p_answer: { actions: [{ job_kind: "lane", job_key: "mechanical", action: "switch", to_model: "claude-opus-5-5",
      reason: "agt-144 regression probe", trial_evidence: TWO_TRIALS }] },
    p_cycle_id: cycleId, p_session_name: null,
  });
  assert.ok(r2.status >= 400 && r2.status < 500, `(b) a 2-trial switch must be refused with a 4xx, got HTTP ${r2.status}`);
  assert.ok(/lane\/mechanical/.test(r2.text) && /3 trials/.test(r2.text),
    `(b) the refusal must name the job and the 3-trial floor. Got: ${r2.text.slice(0, 300)}`);

  // ---- (c) a non-Claude model refused; the anon key refused on both functions -------------
  const three = [...TWO_TRIALS, { ...TWO_TRIALS[0], job_ref: "agt144-test-3" }];
  const rg = await rpc(url, key, "apply_model_assignment", {
    p_answer: { actions: [{ job_kind: "lane", job_key: "mechanical", action: "switch", to_model: "gpt-5",
      reason: "agt-144 regression probe", trial_evidence: three }] },
    p_cycle_id: cycleId, p_session_name: null,
  });
  assert.ok(rg.status >= 400 && rg.status < 500, `(c) to_model gpt-5 must be refused, got HTTP ${rg.status}`);
  assert.ok(/Claude models only/.test(rg.text), `(c) the refusal must say why. Got: ${rg.text.slice(0, 300)}`);

  const mechAfter = await pg(url, key, mechPath);
  const decAfter = await pg(url, key, decPath);
  assert.equal(JSON.stringify(mechAfter), JSON.stringify(mechBefore),
    "(b) the lane/mechanical row must re-read byte-equal after the refusals");
  assert.equal(decAfter.length, decBefore.length, "(b) refused calls must record no model decision");

  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (anon && anon !== "regression-placeholder") {
    const a1 = await rpc(url, anon, "apply_model_assignment", { p_answer: { actions: [] }, p_cycle_id: cycleId, p_session_name: null });
    const a2 = await rpc(url, anon, "review_model_watch", { p_cycle_id: cycleId, p_session_name: null });
    for (const [name, r] of [["apply_model_assignment", a1], ["review_model_watch", a2]]) {
      assert.ok([401, 403, 404].includes(r.status),
        `(c) the anon key must not execute ${name}; got HTTP ${r.status}: ${r.text.slice(0, 200)}`);
      assert.ok(!/apply_model_assignment:|review_model_watch:/.test(r.text),
        `(c) ${name} ran its body under the anon key -- the refusal must come from the grant, not the function`);
    }
    console.log(`  (c) gpt-5 refused; anon rpc refused on both functions (HTTP ${a1.status}, ${a2.status}) -- PASS`);
  } else {
    notRun("(c) anon-key rpc on both functions",
      "VITE_SUPABASE_ANON_KEY is absent from this environment (it lives in the worktree's .env.local). " +
        "The migration's DO block asserts has_function_privilege false for anon and authenticated on both.");
  }
  console.log(`  (b) 2-trial switch refused HTTP ${r2.status} naming 3; lane/mechanical byte-equal; 0 decisions written -- PASS`);

  // ---- (d, live half) the 15 images share ONE agent-row decision ---------------------------
  const decs = await pg(url, key, "runner_decisions?backlog_id=eq.AGT-144&kind=eq.agent-row&select=id");
  assert.equal(decs.length, 1, "exactly one agent-row decision for AGT-144");
  const imgs = await pg(url, key, `runner_before_images?decision_id=eq.${decs[0].id}&select=table_name,row_data`);
  assert.equal(imgs.length, 15, "14 inserted rows + the dm-guardrails edit = 15 before-images under the one handle");
  const byTable = imgs.reduce((m, i) => ((m[i.table_name] = (m[i.table_name] ?? 0) + 1), m), {});
  assert.deepEqual(byTable, { skill_profiles: 4, capabilities: 1, capability_skill_profiles: 9, agent_capability_assignments: 1 });
  assert.equal(imgs.filter(i => i.row_data !== null).length, 1,
    "exactly one image carries a prior row -- dm-guardrails, the only edit; every insert images NULL");
  console.log(`  (d) one agent-row decision ${decs[0].id.slice(0, 8)} carries 15 images ${JSON.stringify(byTable)} -- PASS`);

  notRun(
    "AGT-144: the successful switch, the 10% token refusal, the money alert and the watch self-revert",
    "They need BEGIN/ROLLBACK, which PostgREST cannot give (SES-310). The migration agt144_model_assignment " +
      "asserts them in its trailing DO block, in the same transaction that created the functions, and rolls " +
      "them back with raise 'agt144-proof': judgment -> claude-opus-5-5 with 3 passing trials moved (images 1 + " +
      "54, one model-assignment decision); lane/mechanical UP at 1.11x refused naming 10%; 2 trials refused " +
      "naming 3; gpt-5 refused; money wrote one alert and left the row unchanged; 5 fixture cycles with 2 blocks " +
      "against a baseline of 0 reverted the judgment lane under a model-revert decision.",
  );
}

export default run;
selfRun(import.meta.url, run);
