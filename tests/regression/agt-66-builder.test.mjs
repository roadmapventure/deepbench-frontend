// DeepBench v7.0.456 | tests/regression/agt-66-builder.test.mjs | AGT-69 — the off-bench clause is retired: OFF_BENCH_AGENT_IDS no longer exists, so the import drops it and the assertion that the Builder was ON that list is deleted outright. The surviving NOT-in-AGENTS clause now reads for the AGT-69 reason: the governance agents render on the Bench's Governance section from live lane=governance rows, never from the static list.
// DeepBench v7.0.432 | tests/regression/agt-66-builder.test.mjs | AGT-66 -- The Builder:
// the seed rows are real, the Builder is pinned to the ORCHESTRATOR lane rather than to a literal,
// and the Intent's return shape cannot express "it went green" without the output that says so.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (1) THE FIVE SKILL TYPES AS A SET, NOT A COUNT. `capability_skill_profiles.length === 5` passes
// against five copies of one type. Since the 2026-09-09 amendment there is no Format Skill (the
// executor's Format branch overwrites the Intent's output contract, so the contract lives on the
// Intent traits), so `build-ticket` carries FIVE types over FIVE links. The kickoff doc's Task 3
// sentence said "six bd-*"; the SEED is the authority and it carries five -- the same wording drift
// AGT-64's and AGT-65's tests recorded. The set assertion is what makes a half-applied seed red.
//
// (2) THE MODEL IS ASSERTED AGAINST runner_model_lanes, NOT AGAINST THE STRING "claude-opus-5".
// A literal here would be a second copy of the lane table, which is exactly the drift
// `SES-313` created that table to end -- and it would stay green through a lane change that had
// silently moved every builder run onto a different model. So the assertion reads the orchestrator
// lane live and compares. This is deliberately NOT done for the Designer: `ds-*` carries
// `claude-fable-5-1` while the judgment lane row reads `claude-fable-5`, a real mismatch recorded
// as a finding at the AGT-65 ship rather than papered over by a weaker assertion here.
//
// (3) THE KNOWLEDGE SKILL'S traits.source MUST BE "inline". SES-341: db-assembly.js only puts a
// knowledge-type Skill's stored text into the prompt when its traits say the text is inline;
// without it the section is treated as fetched-per-call, renders empty, and is OMITTED. The Builder
// would then run with no build standard -- no run-all.js, no caps, no capture-the-down rule -- and
// still return a confident, well-formed result. Invisible in every other arm of this file.
//
// (4) THE "GREEN WITHOUT OUTPUT" FINDING IS A SCHEMA FACT, AND IT IS TESTED WITH A MUTANT. The
// kickoff's QA bar says: a build that reports green without pasted output is a finding. That bar is
// only enforceable if the Intent's own contract makes it unsayable -- `outcome` a two-value enum
// (no third "probably fine" state) and `build` + `regression_summary` REQUIRED alongside it. So the
// predicate below is `provesItsClaim(required)`: outcome present AND build present AND
// regression_summary present. Asserting `required.length === 8` would pass against eight wrong
// keys; asserting each key separately would not say WHY those three travel together. The negative
// control runs the same predicate over a COPY of the live required list with `regression_summary`
// removed and demands rejection -- a predicate that cannot reject the mutant measures nothing.
//
// (5) THE TWO GUARDRAILS THAT ARE THE WHOLE SEPARATION OF POWERS. `must_not` has to still forbid
// pushing to main and still forbid the Builder writing its own verdict (the Verifier does that,
// AGT-67). Those two are not decoration: a Builder that may grade itself is the self-certification
// the charter's premise 3 refuses. Asserted by substring on the stored text.
//
// NO MODEL CALL AND NO SPEND, AND NO WRITE OF ANY KIND. This file only reads. Whether the Skill
// text actually produces a build that pastes its output is the kickoff's attended QA, run once in a
// scratch LF export of the worktree and recorded in the v7.0.432 commit body. A permanent
// regression test must not bill an Anthropic call, and must never run a Builder against a real tree.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

const AGENTS_REL = "src/data/agents.js";

const AGENT_ID = "builder";
const CAPABILITY = "build-ticket";
const INTENT_SLUG = "bd-build-intent";
const KNOWLEDGE_SLUG = "bd-knowledge-standards";
const GUARDRAILS_SLUG = "bd-guardrails";
const SKILL_SLUGS = ["bd-identity", KNOWLEDGE_SLUG, "bd-behavior", INTENT_SLUG, GUARDRAILS_SLUG];
// Named as a SET rather than counted -- `length === 5` passes against five copies of one type.
const SKILL_TYPES = ["identity", "knowledge", "behavior", "intent", "guardrails"];

// The lane this agent belongs to. The MODEL is not written here on purpose -- see header note (2).
const LANE = "orchestrator";

// The three keys that together make "green" unsayable without the evidence for it.
const EVIDENCE_KEYS = ["outcome", "build", "regression_summary"];

// The two must_not clauses that keep the Builder from grading itself or reaching main.
const FORBIDDEN = [
  "push to main",
  "write done or a verdict on the ticket",
];

// Exported so the predicate itself is checkable rather than invisible inside one assertion.
export function provesItsClaim(requiredKeys) {
  const have = new Set(requiredKeys);
  return EVIDENCE_KEYS.every(k => have.has(k));
}

export default async function run() {
  // -- Source arm: the bench completeness entries (STANDARDS.md Section 11) ---------------------
  const agentsSrc = read(AGENTS_REL);
  assert.ok(/builder:\s*\{[^}]*skin:[^}]*hair:[^}]*collar:[^}]*extra:[^}]*border:/.test(agentsSrc),
    "AVATAR_CFG.builder must exist in src/data/agents.js with all five keys (STANDARDS.md Section 11)");
  assert.ok(/builder:\s*\{\s*subject:\s*"they",\s*object:\s*"them",\s*possessive:\s*"their"\s*\}/.test(agentsSrc),
    "AGENT_PRONOUNS.builder must be they/them/their");

  const { AGENTS } = await import("../../src/data/agents.js");
  assert.ok(!AGENTS.some(a => a && a.id === AGENT_ID),
    "the Builder must NOT be in the static AGENTS list (AGT-66 Task 4) -- governance agents " +
    "render on the Bench's Governance section from live rows (AGT-69), never from the static list");

  // -- Live arm --------------------------------------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-66 live arm (seed rows + the orchestrator-lane pin + the evidence-keys contract)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name " +
      "(docs/runbooks/session-setup.md step 1b) and re-run: " +
      "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js");
    return;
  }

  const H = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
  const rest = async (p, init = {}) => {
    const r = await fetch(`${url}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
    if (!r.ok) throw new Error(`${init.method || "GET"} ${p} -> ${r.status} ${await r.text()}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };

  const agent = (await rest(`agents?id=eq.${AGENT_ID}&select=id,code,lane,is_active`))[0];
  assert.ok(agent, "no agents row for 'builder' -- apply the AGT-66 section of docs/design/ga-agents-seed.sql");
  assert.equal(agent.code, "GV-05");
  assert.equal(agent.lane, "governance", "the Builder must be in the governance lane (SES-330)");
  assert.equal(agent.is_active, true);
  const productRoster = await rest("agents?is_active=eq.true&lane=eq.product&select=id");
  assert.ok(!productRoster.some(a => a.id === AGENT_ID),
    "the Builder must not appear in the product roster the delegation broker reads " +
    "(lib/project-manager.js filters lane=eq.product)");

  const profiles = await rest(`skill_profiles?slug=in.(${SKILL_SLUGS.join(",")})&select=slug,skill_type_slug,traits,guardrails,llm_model`);
  assert.equal(profiles.length, SKILL_SLUGS.length, `expected ${SKILL_SLUGS.length} bd-* skill_profiles, got ${profiles.length}`);
  const typesPresent = new Set(profiles.map(p => p.skill_type_slug));
  for (const t of SKILL_TYPES) assert.ok(typesPresent.has(t), `Skill type "${t}" missing from the Builder's profiles`);

  const links = await rest(`capability_skill_profiles?capability_slug=eq.${CAPABILITY}&select=skill_profile_slug`);
  assert.equal(links.length, SKILL_SLUGS.length,
    `${CAPABILITY} must link ${SKILL_SLUGS.length} Skill profiles (five types, no Format Skill), got ${links.length}`);
  assert.deepEqual(links.map(l => l.skill_profile_slug).sort(), [...SKILL_SLUGS].sort());

  const assigns = await rest(`agent_capability_assignments?agent_id=eq.${AGENT_ID}&select=capability_slug`);
  assert.deepEqual(assigns.map(a => a.capability_slug), [CAPABILITY]);
  const cap = (await rest(`capabilities?slug=eq.${CAPABILITY}&select=slug,execution_type,default_intent_slug`))[0];
  assert.equal(cap.default_intent_slug, INTENT_SLUG, "the capability must default to the build Intent");
  assert.equal(cap.execution_type, "ai");

  // -- The lane pin (header note 2) ------------------------------------------------------------
  const laneRow = (await rest(`runner_model_lanes?lane=eq.${LANE}&select=lane,model_id`))[0];
  assert.ok(laneRow, `no runner_model_lanes row for the ${LANE} lane -- SES-313's table is the one home for this`);
  for (const p of profiles) {
    assert.equal(p.llm_model, laneRow.model_id,
      `${p.slug}.llm_model is "${p.llm_model}" but the ${LANE} lane is "${laneRow.model_id}" -- the ` +
      "Builder is the orchestrator lane's agent, and a literal model id in the Skill row is a second " +
      "copy of the lane table (the drift SES-313 created that table to end)");
  }

  // -- The inline-knowledge trait (header note 3) ----------------------------------------------
  const knowledge = profiles.find(p => p.slug === KNOWLEDGE_SLUG);
  assert.equal(knowledge.traits && knowledge.traits.source, "inline",
    `${KNOWLEDGE_SLUG}.traits.source must be "inline" (SES-341) -- db-assembly.js otherwise treats ` +
    "the section as fetched-per-call, renders it empty and omits it, and the Builder runs with no " +
    "build standard at all while still returning a well-formed result");

  // -- The evidence contract, with its mutant (header note 4) ----------------------------------
  const intent = profiles.find(p => p.slug === INTENT_SLUG);
  const schema = intent.traits && intent.traits.schema;
  assert.ok(schema && schema.type === "object" && Array.isArray(schema.required),
    "the Intent's traits.schema must parse as an object schema with a `required` array");
  assert.deepEqual(schema.properties.outcome.enum, ["pushed", "blocked"],
    "outcome must be a two-value enum -- a third state is where 'probably green' would live");
  assert.ok(provesItsClaim(schema.required),
    "the Intent must require outcome AND build AND regression_summary together, or a Builder can " +
    "return outcome 'pushed' with no output backing it -- the finding the kickoff's QA bar names. " +
    `required: ${JSON.stringify(schema.required)}`);

  // NEGATIVE CONTROL: drop one evidence key from a COPY of the live list -- must be rejected.
  const mutant = schema.required.filter(k => k !== "regression_summary");
  assert.ok(!provesItsClaim(mutant),
    "provesItsClaim() must reject a contract with regression_summary removed -- a predicate that " +
    "cannot reject the mutant is not measuring the evidence rule");

  // -- The separation of powers (header note 5) ------------------------------------------------
  const guards = profiles.find(p => p.slug === GUARDRAILS_SLUG);
  const mustNot = (guards.guardrails && guards.guardrails.must_not) || [];
  for (const clause of FORBIDDEN) {
    assert.ok(mustNot.some(m => m.includes(clause)),
      `${GUARDRAILS_SLUG}.must_not must still contain "${clause}" -- a Builder that may grade its ` +
      "own work or reach main is the self-certification the Selfbuild charter's premise 3 refuses. " +
      `got: ${JSON.stringify(mustNot)}`);
  }

  console.log(`[AGT-66] builder pinned to the ${LANE} lane's model_id (read live, not written here); ` +
    `evidence contract requires ${EVIDENCE_KEYS.join(" + ")} and rejects the mutant without regression_summary`);
}

selfRun(import.meta.url, run);
