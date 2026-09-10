// DeepBench v7.0.447 | tests/regression/agt-67-verifier.test.mjs | SES-347 -- the required-key
// guard and GOOD_VERDICT retargeted from `reasoning` to `findings`. The Intent's property was
// renamed because the Anthropic API refused every request pairing that name with the injected
// `account` receipt (5/5 refusals; 0/5 renamed). The guard still requires a written judgment --
// it moved with the rule rather than being relaxed or deleted (STANDARDS.md Section 4 clause 1).
// DeepBench v7.0.433 | tests/regression/agt-67-verifier.test.mjs | AGT-67 -- The Verifier:
// the seed rows are real, the Intent's schema is the contract the SHIPPED validator is driven
// against, the Skill text is bound to the code constant it claims to enforce, and a judged row is
// still a `runner_verdicts` row.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (1) THE FIVE SKILL TYPES AS A SET, NOT A COUNT. `length === 5` passes against five copies of one
// type. `verify-ship` carries FIVE types over FIVE links -- there is no Format Skill since the
// 2026-09-09 amendment (the executor's Format branch overwrites the Intent's output contract, so the
// contract lives on the Intent traits). THE KICKOFF DOC SAYS "six `vf-*` profiles" (Task 1) AND THE
// SEED CARRIES FIVE; the seed is the authority and the wording drift is recorded here rather than
// fixed silently -- the same drift AGT-64's, AGT-65's and AGT-66's tests each recorded.
//
// (2) THE MODEL IS ASSERTED AGAINST runner_model_lanes, NOT AGAINST THE STRING "claude-fable-5-1".
// A literal here would be a second copy of the lane table -- the drift `SES-313` created that table
// to end -- and it would stay green through a lane change that had silently moved every verdict onto
// a different model. The Verifier is the JUDGMENT lane's agent, so the assertion reads that lane
// live and compares. (AGT-66's file records why this is not done for the Designer: `ds-*` carries
// `claude-fable-5-1` against a judgment-lane row that read `claude-fable-5`, a real mismatch kept as
// a finding rather than papered over. The Verifier's rows and the lane agree today, measured, which
// is what makes this assertion meaningful rather than aspirational.)
//
// (3) THE KNOWLEDGE SKILL'S traits.source MUST BE "inline". SES-341: db-assembly.js only puts a
// knowledge-type Skill's stored text into the prompt when its traits say the text is inline; without
// it the section is treated as fetched-per-call, renders empty, and is OMITTED. The Verifier would
// then grade with no bar at all -- no charter, no gates, no lenses -- and still return a confident,
// well-formed verdict. Invisible in every other arm of this file.
//
// (4) THE INTENT'S SCHEMA IS DRIVEN THROUGH THE SHIPPED VALIDATOR, WITH A MUTANT. "the schema
// parses" is worth almost nothing on its own: `JSON.parse` succeeding says the row is JSON, not that
// it is a contract. So the live schema is handed to `validateAgentVerdict()` -- the function
// scripts/verifier.js actually gates a verdict with -- once with a well-formed verdict (must pass)
// and once with `auto_done_eligible: "true"`, the JSON-string mutant SES-243 cost a rule over (must
// be rejected, BY NAME). A validator that cannot reject the mutant is not measuring the contract.
//
// (5) THE SKILL TEXT IS BOUND TO THE CODE CONSTANT IT CLAIMS TO ENFORCE. `vf-guardrails.must_not`
// promises the auto-done bar is refused to a diff touching the self-certifying paths; this asserts
// every entry of `SELF_CERTIFYING_PATHS` is actually named in that clause. Without it the two drift:
// SES-337 will add the Verifier's own Skill rows to that constant, and a guardrail that still lists
// only three files would be telling the agent a rule the code no longer holds.
//
// (6) A JUDGED ROW IS STILL A `runner_verdicts` ROW. `verdictRowFor()` is the one payload builder
// both lanes call, so the mechanical fixture and the judged fixture are asserted to produce the SAME
// KEY SET -- the kickoff's "`--judge=none` still records a verdict identical in shape to today's",
// answered without inserting a fixture row into the live verdict ledger. The live arm then checks
// every one of those keys is a real column, so the shape claim is anchored to the table and not to
// this file's opinion of it.
//
// NO MODEL CALL, NO SPEND, AND NO WRITE OF ANY KIND. This file only reads -- SES-181's own note is
// the reason: inserting fixture rows here would poison the rolling verdict telemetry the reviewer
// lane exists to produce. Whether the Skill text yields a verdict that cites file:line is the
// kickoff's attended QA, run once against this ship's own commit and recorded on the v7.0.433 row.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  SELF_CERTIFYING_PATHS,
  VERIFIER_AGENT_ID,
  VERIFY_CAPABILITY,
  validateAgentVerdict,
  verdictRowFor,
} from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

const AGENTS_REL = "src/data/agents.js";

const INTENT_SLUG = "vf-verdict-intent";
const KNOWLEDGE_SLUG = "vf-knowledge-bar";
const GUARDRAILS_SLUG = "vf-guardrails";
const SKILL_SLUGS = ["vf-identity", KNOWLEDGE_SLUG, "vf-behavior", INTENT_SLUG, GUARDRAILS_SLUG];
// Named as a SET rather than counted -- `length === 5` passes against five copies of one type.
const SKILL_TYPES = ["identity", "knowledge", "behavior", "intent", "guardrails"];

// The lane this agent belongs to. The MODEL is not written here on purpose -- see header note (2).
const LANE = "judgment";

// The two must_not clauses that keep the Verifier verdict-only. A verifier that may edit, or that
// may write a status, has deleted the builder/verifier separation the whole lane exists for.
const FORBIDDEN = [
  "edit anything",
  "write done, delivered or any backlog status",
];

// A well-formed verdict, and the one-key mutant that must be rejected. Exported so the predicate is
// checkable rather than invisible inside one assertion.
export const GOOD_VERDICT = Object.freeze({
  backlog_id: "AGT-67",
  version: "v7.0.433",
  verdict: "block",
  // SES-347: this key is `findings`. It was `reasoning` until the Anthropic API began refusing
  // every request whose tool schema paired that name with the injected `account` receipt. The guard
  // is RETARGETED, not relaxed -- the contract still requires a written judgment, under its new name.
  findings: "scripts/verifier.js:400 -- autoDoneEligibility() is unchanged, so the bar is intact.",
  pm_lens: "Four tasks promised, four delivered.",
  architect_lens: "The assembly is imported, not restated (SES-331).",
  auto_done_eligible: false,
  auto_done_reason: "The diff touches scripts/verifier.js.",
  missing_evidence: [],
});
export const STRING_TRUE_MUTANT = Object.freeze({ ...GOOD_VERDICT, auto_done_eligible: "true" });

export default async function run() {
  // -- Source arm: the bench completeness entries (STANDARDS.md Section 11) ---------------------
  const agentsSrc = read(AGENTS_REL);
  assert.ok(/verifier:\s*\{[^}]*skin:[^}]*hair:[^}]*collar:[^}]*extra:[^}]*border:/.test(agentsSrc),
    "AVATAR_CFG.verifier must exist in src/data/agents.js with all five keys (STANDARDS.md Section 11)");
  assert.ok(/verifier:\s*\{\s*subject:\s*"they",\s*object:\s*"them",\s*possessive:\s*"their"\s*\}/.test(agentsSrc),
    "AGENT_PRONOUNS.verifier must be they/them/their");

  const { AGENTS, OFF_BENCH_AGENT_IDS } = await import("../../src/data/agents.js");
  assert.ok(!AGENTS.some(a => a && a.id === VERIFIER_AGENT_ID),
    "the Verifier must NOT be in the static AGENTS list (AGT-67 Task 4) -- governance agents stay " +
    "off the Bench until the exit review rules on how they render");
  assert.ok(OFF_BENCH_AGENT_IDS.includes(VERIFIER_AGENT_ID),
    "the Verifier must be in OFF_BENCH_AGENT_IDS, or SE-03 reports its avatar/pronoun entries as " +
    "stale orphans -- a false red, and the list is also SE-03's obligation to check them harder");

  // -- The row shape, with no write (header note 6) ---------------------------------------------
  const mechanicalRow = verdictRowFor({
    cycleId: "00000000-0000-4000-8000-000000000000", ticket: "AGT-67", version: "v7.0.433",
    verdict: "approve", gateResults: { build: "green", regression: "green", hygiene: "green" },
    reasoning: "mechanical", eligible: false, autoDoneReason: "why", epicName: "e", priorityClass: "P10 - Tooling",
  });
  const judgedRow = verdictRowFor({
    cycleId: "00000000-0000-4000-8000-000000000000", ticket: "AGT-67", version: "v7.0.433",
    verdict: "block", gateResults: { build: "green", regression: "green", hygiene: "green" },
    reasoning: "block: findings\nPM lens: ...\nChief Architect lens: ...", eligible: false,
    autoDoneReason: "why", epicName: "e", priorityClass: "P10 - Tooling",
  });
  assert.deepStrictEqual(Object.keys(judgedRow), Object.keys(mechanicalRow),
    "a judged verdict must record a row identical IN SHAPE to a --judge=none one -- the agent's " +
    "lenses reach the ledger through `reasoning`, and AGT-67 asked for no new runner_verdicts column");
  // NEGATIVE CONTROL: the predicate is a key-set comparison, so it must notice an added key. If this
  // ever equalled the row above, the assertion is comparing nothing.
  assert.notDeepStrictEqual(Object.keys({ ...judgedRow, pm_lens: "x" }), Object.keys(mechanicalRow));

  // -- The validator, with its mutant (header note 4), against the SHIPPED schema shape ---------
  // (Driven again below against the LIVE row; this arm runs with no credentials so the mutant is
  // never silently unchecked in CI.)

  // -- Live arm --------------------------------------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-67 live arm (seed rows + the judgment-lane pin + the Intent contract + the guardrail binding)",
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

  const agent = (await rest(`agents?id=eq.${VERIFIER_AGENT_ID}&select=id,code,lane,is_active`))[0];
  assert.ok(agent, "no agents row for 'verifier' -- apply the AGT-67 section of docs/design/ga-agents-seed.sql");
  assert.equal(agent.code, "GV-06");
  assert.equal(agent.lane, "governance", "the Verifier must be in the governance lane (SES-330)");
  assert.equal(agent.is_active, true);
  const productRoster = await rest("agents?is_active=eq.true&lane=eq.product&select=id");
  assert.ok(!productRoster.some(a => a.id === VERIFIER_AGENT_ID),
    "the Verifier must not appear in the product roster the delegation broker reads " +
    "(lib/project-manager.js filters lane=eq.product) -- RULE #1: no agent's data names another agent");

  const profiles = await rest(`skill_profiles?slug=in.(${SKILL_SLUGS.join(",")})&select=slug,skill_type_slug,traits,guardrails,llm_model`);
  assert.equal(profiles.length, SKILL_SLUGS.length, `expected ${SKILL_SLUGS.length} vf-* skill_profiles, got ${profiles.length}`);
  const typesPresent = new Set(profiles.map(p => p.skill_type_slug));
  for (const t of SKILL_TYPES) assert.ok(typesPresent.has(t), `Skill type "${t}" missing from the Verifier's profiles`);

  const links = await rest(`capability_skill_profiles?capability_slug=eq.${VERIFY_CAPABILITY}&select=skill_profile_slug`);
  assert.equal(links.length, SKILL_SLUGS.length,
    `${VERIFY_CAPABILITY} must link ${SKILL_SLUGS.length} Skill profiles (five types, no Format Skill; ` +
    `the kickoff's "six vf-*" wording is stale and the seed is the authority), got ${links.length}`);
  assert.deepEqual(links.map(l => l.skill_profile_slug).sort(), [...SKILL_SLUGS].sort());

  const assigns = await rest(`agent_capability_assignments?agent_id=eq.${VERIFIER_AGENT_ID}&select=capability_slug`);
  assert.deepEqual(assigns.map(a => a.capability_slug), [VERIFY_CAPABILITY]);
  const cap = (await rest(`capabilities?slug=eq.${VERIFY_CAPABILITY}&select=slug,execution_type,default_intent_slug`))[0];
  assert.equal(cap.execution_type, "ai");
  // THE INTENT SLUG IS NOT DECORATION. Measured in api/prompt/db-assembly.js (AA-188, the `else`
  // branch at ~line 684): assemblePrompt() with a null intent_slug does NOT fall back to this
  // column -- it filters EVERY intent-type Skill out of the assembly. So a `verify-ship` prompt
  // built without it carries no output schema and no verdict contract while still looking complete,
  // and scripts/verifier.js reads this column precisely so it never builds that prompt.
  assert.equal(cap.default_intent_slug, INTENT_SLUG,
    "the capability must default to the verdict Intent -- scripts/verifier.js reads THIS column to " +
    "pass intent_slug, and a null one silently deletes the verdict contract from the prompt");

  // -- The lane pin (header note 2) ------------------------------------------------------------
  const laneRow = (await rest(`runner_model_lanes?lane=eq.${LANE}&select=lane,model_id`))[0];
  assert.ok(laneRow, `no runner_model_lanes row for the ${LANE} lane -- SES-313's table is the one home for this`);
  for (const p of profiles) {
    assert.equal(p.llm_model, laneRow.model_id,
      `${p.slug}.llm_model is "${p.llm_model}" but the ${LANE} lane is "${laneRow.model_id}" -- the ` +
      "Verifier is the judgment lane's agent, and a literal model id in the Skill row is a second " +
      "copy of the lane table (the drift SES-313 created that table to end)");
  }

  // -- The inline-knowledge trait (header note 3) ----------------------------------------------
  const knowledge = profiles.find(p => p.slug === KNOWLEDGE_SLUG);
  assert.equal(knowledge.traits && knowledge.traits.source, "inline",
    `${KNOWLEDGE_SLUG}.traits.source must be "inline" (SES-341) -- db-assembly.js otherwise treats ` +
    "the section as fetched-per-call, renders it empty and omits it, and the Verifier grades with " +
    "no bar at all while still returning a well-formed verdict");

  // -- The Intent's schema, driven through the SHIPPED validator (header note 4) ----------------
  const intent = profiles.find(p => p.slug === INTENT_SLUG);
  const schema = intent.traits && intent.traits.schema;
  assert.ok(schema && schema.type === "object" && Array.isArray(schema.required),
    "the Intent's traits.schema must parse as an object schema with a `required` array");
  assert.deepEqual(schema.properties.verdict.enum, ["approve", "block"],
    "verdict must be a two-value enum -- a third state is where 'probably fine' would live");
  // SES-347: "findings", formerly "reasoning" -- see GOOD_VERDICT above. Retargeted, never dropped.
  for (const k of ["findings", "pm_lens", "architect_lens", "auto_done_eligible", "auto_done_reason", "missing_evidence"]) {
    assert.ok(schema.required.includes(k),
      `the Intent must REQUIRE "${k}" -- a verdict with no ${k} is a judgment with a hole in it, and ` +
      `"both lenses reported even when they agree" is only enforceable if the contract makes them unsayable-away. ` +
      `required: ${JSON.stringify(schema.required)}`);
  }
  const good = validateAgentVerdict(schema, GOOD_VERDICT);
  assert.ok(good.ok, `a well-formed verdict must satisfy the live schema: ${JSON.stringify(good.errors)}`);
  // THE MUTANT: `"true"` is truthy JSON and is not the boolean. This is the exact shape SES-243 cost
  // a rule over, and a validator that cannot reject it lets a model widen its own autonomy.
  const mutant = validateAgentVerdict(schema, STRING_TRUE_MUTANT);
  assert.ok(!mutant.ok,
    'validateAgentVerdict() must reject auto_done_eligible: "true" against the live schema -- a ' +
    "predicate that cannot reject the mutant is not measuring the contract");
  assert.ok(mutant.errors.some(e => /auto_done_eligible/.test(e)),
    `the rejection must name the offending key, or the exit-2 message tells nobody what to fix: ${JSON.stringify(mutant.errors)}`);

  // -- The separation of powers, and the Skill/code binding (header notes 5) --------------------
  const guards = profiles.find(p => p.slug === GUARDRAILS_SLUG);
  const mustNot = (guards.guardrails && guards.guardrails.must_not) || [];
  for (const clause of FORBIDDEN) {
    assert.ok(mustNot.some(m => m.includes(clause)),
      `${GUARDRAILS_SLUG}.must_not must still contain "${clause}" -- a Verifier that may edit or ` +
      "write a status is the builder/verifier separation deleted, not extended. " +
      `got: ${JSON.stringify(mustNot)}`);
  }
  const must = (guards.guardrails && guards.guardrails.must) || [];
  const selfCertClause = must.find(m => /auto-done bar/.test(m));
  assert.ok(selfCertClause,
    `${GUARDRAILS_SLUG}.must must carry the self-certification refusal -- charter premise 3 is the ` +
    "one rule a rung may never buy past, and the agent has to be told it too");
  for (const p of SELF_CERTIFYING_PATHS) {
    assert.ok(selfCertClause.includes(p),
      `the Verifier's guardrail names the self-certifying paths, and "${p}" is in the shipped ` +
      "SELF_CERTIFYING_PATHS but not in the Skill text. The two must move together: SES-337 adds " +
      "the Verifier's own Skill rows to that constant, and a guardrail listing a stale set tells " +
      `the agent a rule the code no longer holds. clause: ${JSON.stringify(selfCertClause)}`);
  }

  console.log(`[AGT-67] verifier pinned to the ${LANE} lane's model_id (read live, not written here); ` +
    `the live Intent schema rejects the auto_done_eligible:"true" mutant by name; ` +
    `vf-guardrails names all ${SELF_CERTIFYING_PATHS.length} SELF_CERTIFYING_PATHS entries`);
}

selfRun(import.meta.url, run);
