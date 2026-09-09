// DeepBench v7.0.431 | tests/regression/agt-65-designer.test.mjs | AGT-65 -- The Designer:
// the seed rows are real, the Intent's contract still parses, and the ONE database rule the
// Designer's handoff depends on -- ck_design_status_kickoff -- is still enforced.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (1) THE FIVE SKILL TYPES AS A SET, NOT A COUNT. `capability_skill_profiles.length === 5` passes
// against five copies of one type. The 2026-09-09 amendment removed the Format Skill (the
// executor's Format branch overwrites the Intent's output contract, so the contract lives on the
// Intent traits), so `design-kickoff` carries FIVE types over FIVE links. The kickoff doc's Task 1
// sentence said "six ds-* profiles"; the SEED is the authority and it carries five -- the same
// wording drift AGT-64's test recorded. The set assertion is what makes a half-applied seed red.
//
// (2) THE KNOWLEDGE SKILL'S traits.source MUST BE "inline", AND THAT IS NOT DECORATION. SES-341:
// api/prompt/db-assembly.js only puts a knowledge-type Skill's own stored text into the prompt when
// its traits say the text is inline; without it the section is treated as fetched-per-call, renders
// empty, and is OMITTED. The Designer would then run with no design standard at all and still
// return a confident, well-formed kickoff -- the exact silent degradation that has no visible
// symptom. Asserted because it is invisible in every other arm of this file.
//
// (3) ck_design_status_kickoff IS TESTED BY A DISCRIMINATING PAIR, NOT BY ONE REFUSAL. The
// Designer's handoff is: write docs/kickoffs/..., then set kickoff_link AND design_status =
// 'designed'. The constraint is the only thing stopping a Designer that returned a kickoff it never
// wrote from marking the ticket designed anyway. A single "PATCH without a link is refused"
// assertion cannot tell that constraint apart from a blanket refusal of the whole PATCH (a
// permission error, a bad column, a typo in the fixture id -- all of which also 4xx). So the arm
// runs the SAME patch twice against the SAME row: once without the link, which must be refused BY
// NAME, and once with the link added and nothing else changed, which must SUCCEED. Only the pair
// shows the link is the operative difference. Between them the row is re-read and asserted
// unchanged -- a constraint that returned an error after having already written would pass the
// first half and fail that.
//
// THE FIXTURE IS INSERTED AND DELETED, and its id is outside every live prefix (ZZ...). Its
// before-image -- the row as inserted -- is printed, so a run that leaves the board dirty is
// readable in the log rather than inferred. The finally block deletes by primary key.
//
// NO MODEL CALL AND NO SPEND. Whether this Skill text actually produces a kickoff -- and refuses to
// produce one for a dead premise -- is the kickoff's attended two-fixture QA, whose outputs live in
// the v7.0.431 commit body. A permanent regression test must not bill an Anthropic call every run.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

const AGENTS_REL = "src/data/agents.js";

const AGENT_ID = "designer";
const CAPABILITY = "design-kickoff";
const INTENT_SLUG = "ds-kickoff-intent";
const KNOWLEDGE_SLUG = "ds-knowledge-standard";
const SKILL_SLUGS = ["ds-identity", KNOWLEDGE_SLUG, "ds-behavior", INTENT_SLUG, "ds-guardrails"];
// Named as a SET rather than counted -- `length === 5` passes against five copies of one type.
const SKILL_TYPES = ["identity", "knowledge", "behavior", "intent", "guardrails"];

// The Intent keys the handoff and the runner both read back off the Designer's return.
const INTENT_REQUIRED = [
  "backlog_id", "premise", "kickoff_path", "kickoff_markdown", "files", "tasks", "model", "qa_discriminator",
];

const FIXTURE_BACKLOG_ID = "ZZDESIGN-65";
const FIXTURE_KICKOFF_LINK = "docs/kickoffs/ZZ-fixture-never-a-real-kickoff.md";
const CONSTRAINT = "ck_design_status_kickoff";

export default async function run() {
  // -- Source arm: the bench completeness entries (STANDARDS.md Section 11) ---------------------
  const agentsSrc = read(AGENTS_REL);
  assert.ok(/designer:\s*\{[^}]*skin:[^}]*hair:[^}]*collar:[^}]*extra:[^}]*border:/.test(agentsSrc),
    "AVATAR_CFG.designer must exist in src/data/agents.js with all five keys (STANDARDS.md Section 11)");
  assert.ok(/designer:\s*\{\s*subject:\s*"they",\s*object:\s*"them",\s*possessive:\s*"their"\s*\}/.test(agentsSrc),
    "AGENT_PRONOUNS.designer must be they/them/their");

  const { AGENTS, OFF_BENCH_AGENT_IDS } = await import("../../src/data/agents.js");
  assert.ok(!AGENTS.some(a => a && a.id === AGENT_ID),
    "the Designer must NOT be in the static AGENTS list (AGT-65 Task 2) -- governance agents stay " +
    "off the Bench until the exit review rules on how they render");
  assert.ok(OFF_BENCH_AGENT_IDS.includes(AGENT_ID),
    "the Designer must be in OFF_BENCH_AGENT_IDS, or SE-03 reports its avatar/pronoun entries as " +
    "stale orphans -- a false red, and the list is also SE-03's obligation to check them harder");

  // -- Live arm --------------------------------------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-65 live arm (seed rows + the inline-knowledge trait + the ck_design_status_kickoff pair)",
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
  assert.ok(agent, "no agents row for 'designer' -- apply the AGT-65 section of docs/design/ga-agents-seed.sql");
  assert.equal(agent.code, "GV-04");
  assert.equal(agent.lane, "governance", "the Designer must be in the governance lane (SES-330)");
  assert.equal(agent.is_active, true);
  const productRoster = await rest("agents?is_active=eq.true&lane=eq.product&select=id");
  assert.ok(!productRoster.some(a => a.id === AGENT_ID),
    "the Designer must not appear in the product roster the delegation broker reads " +
    "(lib/project-manager.js filters lane=eq.product)");

  const profiles = await rest(`skill_profiles?slug=in.(${SKILL_SLUGS.join(",")})&select=slug,skill_type_slug,traits,llm_model`);
  assert.equal(profiles.length, SKILL_SLUGS.length, `expected ${SKILL_SLUGS.length} ds-* skill_profiles, got ${profiles.length}`);
  const typesPresent = new Set(profiles.map(p => p.skill_type_slug));
  for (const t of SKILL_TYPES) assert.ok(typesPresent.has(t), `Skill type "${t}" missing from the Designer's profiles`);

  const links = await rest(`capability_skill_profiles?capability_slug=eq.${CAPABILITY}&select=skill_profile_slug`);
  assert.equal(links.length, SKILL_SLUGS.length,
    `${CAPABILITY} must link ${SKILL_SLUGS.length} Skill profiles (five types, no Format Skill), got ${links.length}`);
  assert.deepEqual(links.map(l => l.skill_profile_slug).sort(), [...SKILL_SLUGS].sort());

  const assigns = await rest(`agent_capability_assignments?agent_id=eq.${AGENT_ID}&select=capability_slug`);
  assert.deepEqual(assigns.map(a => a.capability_slug), [CAPABILITY]);
  const cap = (await rest(`capabilities?slug=eq.${CAPABILITY}&select=slug,execution_type,default_intent_slug`))[0];
  assert.equal(cap.default_intent_slug, INTENT_SLUG, "the capability must default to the kickoff Intent");
  assert.equal(cap.execution_type, "ai");

  const intent = profiles.find(p => p.slug === INTENT_SLUG);
  const schema = intent.traits && intent.traits.schema;
  assert.ok(schema && schema.type === "object" && Array.isArray(schema.required),
    "the Intent's traits.schema must parse as an object schema with a `required` array");
  for (const k of INTENT_REQUIRED) {
    assert.ok(schema.required.includes(k), `the Intent's schema must require "${k}"`);
  }
  assert.deepEqual(schema.properties.premise.enum, ["alive", "dead"],
    "premise must be a two-value enum -- a free-text premise cannot be graded, and 'dead' is the " +
    "whole point of revalidation (a Designer that can only say 'alive' always designs)");

  // See header note (2): without this the design standard never reaches the model.
  const knowledge = profiles.find(p => p.slug === KNOWLEDGE_SLUG);
  assert.equal(knowledge.traits && knowledge.traits.source, "inline",
    `${KNOWLEDGE_SLUG}.traits.source must be "inline" (SES-341) -- db-assembly.js otherwise treats ` +
    "the section as fetched-per-call, renders it empty and omits it, and the Designer runs with no " +
    "design standard while still returning a well-formed kickoff");

  // -- ck_design_status_kickoff, the discriminating pair (header note 3) ------------------------
  let fixtureUuid = null;
  try {
    await rest(`backlog_items?backlog_id=eq.${FIXTURE_BACKLOG_ID}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const inserted = await rest("backlog_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        backlog_id: FIXTURE_BACKLOG_ID,
        tier: "later",
        status: "open",
        type: "Tooling",
        priority_class: "P10 - Tooling",
        title: "AGT-65 regression fixture -- inserted and deleted by this test",
        description: "Fixture row for tests/regression/agt-65-designer.test.mjs. Never a real ticket.",
        source_file: "tests/regression/agt-65-designer.test.mjs",
        row_ordinal: 999998,
        design_status: null,
        kickoff_link: null,
      }),
    });
    fixtureUuid = inserted[0].id;
    console.log(`[AGT-65] fixture before-image ${FIXTURE_BACKLOG_ID} (${fixtureUuid}): ` +
      `design_status=${JSON.stringify(inserted[0].design_status)} kickoff_link=${JSON.stringify(inserted[0].kickoff_link)} ` +
      `status=${inserted[0].status} tier=${inserted[0].tier}`);

    // HALF 1 -- designed with no link. Must be refused, and the constraint must be named.
    const noLink = await fetch(`${url}/rest/v1/backlog_items?id=eq.${fixtureUuid}`, {
      method: "PATCH", headers: H, body: JSON.stringify({ design_status: "designed" }),
    });
    const noLinkBody = await noLink.text();
    assert.ok(!noLink.ok,
      `${CONSTRAINT} must refuse design_status='designed' with a NULL kickoff_link (got ${noLink.status}) -- ` +
      "if this ever succeeds, a Designer that returned a kickoff it never wrote can still mark the ticket designed");
    assert.ok(noLinkBody.includes(CONSTRAINT),
      `the refusal must be ${CONSTRAINT}'s own, not some other error that also 4xxs; got: ${noLinkBody}`);

    // ...and nothing was written by the refused PATCH.
    const midway = (await rest(`backlog_items?id=eq.${fixtureUuid}&select=design_status,kickoff_link`))[0];
    assert.equal(midway.design_status, null, "the refused PATCH must not have written design_status");
    assert.equal(midway.kickoff_link, null, "the refused PATCH must not have written kickoff_link");

    // HALF 2 -- the SAME patch with the link added and nothing else changed. Must succeed.
    // Without this half, half 1 cannot be told apart from a blanket refusal of the whole PATCH.
    const withLink = await rest(`backlog_items?id=eq.${fixtureUuid}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ design_status: "designed", kickoff_link: FIXTURE_KICKOFF_LINK }),
    });
    assert.equal(withLink[0].design_status, "designed",
      "adding the kickoff_link must make the identical PATCH succeed -- otherwise half 1 measured " +
      "nothing about this constraint");
    assert.equal(withLink[0].kickoff_link, FIXTURE_KICKOFF_LINK);

    console.log(`[AGT-65] ${CONSTRAINT} discriminating pair confirmed live: ` +
      `PATCH{design_status} refused by name, PATCH{design_status,kickoff_link} accepted on the same row`);
  } finally {
    if (fixtureUuid) {
      await fetch(`${url}/rest/v1/backlog_items?id=eq.${fixtureUuid}`, { method: "DELETE", headers: H }).catch(() => {});
    }
  }

  const strays = await rest(`backlog_items?backlog_id=eq.${FIXTURE_BACKLOG_ID}&select=backlog_id`);
  assert.equal(strays.length, 0, `the fixture ${FIXTURE_BACKLOG_ID} must be gone from the board, found ${strays.length}`);
}

selfRun(import.meta.url, run);
