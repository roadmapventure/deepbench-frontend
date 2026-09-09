// DeepBench v7.0.429 | tests/regression/agt-64-researcher.test.mjs | AGT-64 -- The Researcher:
// the seed rows are real, leg 1 can actually reach the web from the executor, and the Intent's
// survivor shape still COVERS what file_invention_proposal() demands.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (1) THE FIVE SKILL TYPES AS A SET, NOT A COUNT. `capability_skill_profiles.length === 5` passes
// against five copies of one type. The 2026-09-09 amendment on AGT-63 removed the Format Skill
// (the executor's Format branch overwrites the Intent's output contract, so the contract lives on
// the Intent traits), so this capability carries FIVE types over FIVE links -- not AGT-63's six
// links per capability, which came from its two Knowledge Skills and its per-capability Intent.
// The kickoff doc's Task 1 sentence still said "six rs-* profiles"; the SEED is the authority and
// it carries five. The set assertion is what makes a half-applied seed red.
//
// (2) enable_web_search IS THE WHOLE OF LEG 1, AND technical_services IS NOT IT. The seed shipped
// `technical_services: ["structured-output","web-search"]` on the Intent, which reads like the
// switch and is not: api/prompt/db-assembly.js turns Anthropic's web_search tool on from
// `traits.enable_web_search === true` and NOTHING ELSE (the HAR-05 gate; `intentTechnicalServices`
// is carried for pattern accounting and never reaches buildCallBody). Without the trait the
// Researcher's own Intent instructs it to report `egress: "blocked"` and stop leg 1 -- an honest
// degradation that would look like a working agent producing thin results forever. That trait was
// added at this ship and this assertion is what stops a later editor tidying it away.
//
// (3) THE CONTRACT CHECK IS "COVERS", NOT "IDENTICAL", AND THE RENAME IS THE POINT. The Intent
// returns `priority_class`; file_invention_proposal() reads `p.class`. Every other required key
// carries its own name. So the honest predicate is: every key the function requires is reachable
// from a survivor object under ONE documented rename. Stating it as a literal subset would fail on
// `class` and tempt someone to "fix" the Skill text; stating it as `length` would pass against six
// wrong keys. The negative control drops `priority_class` from a COPY of the live schema and
// asserts covers() rejects it -- a predicate that cannot reject the mutant measures nothing.
//
// (4) THE FUNCTION'S REQUIREMENTS ARE READ LIVE, BY REFUSAL, AND CANNOT WRITE. SES-160 drew the
// line that a permanent regression test never writes backlog_items / runner_decisions /
// vision_claims on the live board, and file_invention_proposal() writes all three plus an SES id
// off feature_id_counter. There is no exec_readonly_sql / pg_proc reader exposed over PostgREST
// here (checked live at this ship), so the contract is read the only other way it can be: each
// probe sends an OTHERWISE-COMPLETE payload with exactly one key set to a value that key's own
// validation must reject. That is write-safe BY CONSTRUCTION -- an invalid value can never pass
// its check, so the function raises before the first insert on every call, and no probe is ever
// one key short of a successful filing. Measured at this ship: six probes, six P0001 refusals,
// `backlog_items` 0 / `runner_decisions` 0 / feature_id_counter.SES unchanged at 341. The arm
// re-asserts that nothing was written rather than trusting the argument.
//
// NO MODEL CALL AND NO SPEND. The Researcher's own judgment -- does this Skill text produce cited,
// dated findings and an honest survivor? -- is the kickoff's attended QA, whose output is
// docs/research/2026-09-09-invention-p3-investor-value.md and the v7.0.429 commit body. A
// permanent regression test must not bill a model call on every run.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

const AGENTS_REL = "src/data/agents.js";
const RESEARCH_DOC_REL = "docs/research/2026-09-09-invention-p3-investor-value.md";

const AGENT_ID = "researcher";
const CAPABILITY = "research-class-lens";
const INTENT_SLUG = "rs-research-intent";
const SKILL_SLUGS = ["rs-identity", "rs-knowledge-corpus", "rs-behavior", "rs-research-intent", "rs-guardrails"];
// Named as a SET rather than counted -- `length === 5` passes against five copies of one type.
const SKILL_TYPES = ["identity", "knowledge", "behavior", "intent", "guardrails"];

// The function's own two description predicates, transcribed from its body at this ship. The
// research doc has to satisfy both, because the survivor's `description` cites it by path.
const VC_REF_RE = /VC-[A-Za-z0-9]+(-[A-Za-z0-9]+)*/;
const RESEARCH_PATH_FRAGMENT = "docs/research/";

// The keys file_invention_proposal() validates, and the value that each key's OWN check must
// reject. Sending an invalid value (never an omission) is what makes the probe unable to write.
const CONTRACT_PROBES = {
  class: { bad: "P9 - Not A Class", says: /class must be one of P1\.\.P4/ },
  title: { bad: "   ", says: /title is required/ },
  description: { bad: "no refs in here", says: /description must cite at least one VC- claim ref/ },
  scope_rationale: { bad: "  ", says: /scope_rationale is required/ },
  enhancement_claim: { bad: "not-a-claim", says: /enhancement_claim must name a scoreboard metric/ },
  predicted_cycles: { bad: 0, says: /predicted_cycles must be a positive integer/ },
};

// The ONE rename between the two shapes. Anything else must match by name.
const P_KEY_TO_SURVIVOR_KEY = { class: "priority_class" };

// Exported so the predicate itself is checkable rather than invisible inside one assertion.
export function covers(requiredPKeys, survivorRequiredKeys) {
  const have = new Set(survivorRequiredKeys);
  return requiredPKeys.every(k => have.has(P_KEY_TO_SURVIVOR_KEY[k] || k));
}

export default async function run() {
  // -- Source arm: the bench entries, and the research doc the survivor cites -------------------
  const agentsSrc = read(AGENTS_REL);
  assert.ok(/researcher:\s*\{[^}]*skin:[^}]*hair:[^}]*collar:[^}]*extra:[^}]*border:/.test(agentsSrc),
    "AVATAR_CFG.researcher must exist in src/data/agents.js with all five keys (STANDARDS.md §11)");
  assert.ok(/researcher:\s*\{\s*subject:\s*"they",\s*object:\s*"them",\s*possessive:\s*"their"\s*\}/.test(agentsSrc),
    "AGENT_PRONOUNS.researcher must be they/them/their");

  const { AGENTS, OFF_BENCH_AGENT_IDS } = await import("../../src/data/agents.js");
  assert.ok(!AGENTS.some(a => a && a.id === AGENT_ID),
    "the Researcher must NOT be in the static AGENTS list (AGT-64 Task 2) -- governance agents " +
    "stay off the Bench until the exit review rules on how they render");
  assert.ok(OFF_BENCH_AGENT_IDS.includes(AGENT_ID),
    "the Researcher must be in OFF_BENCH_AGENT_IDS, or SE-03 reports its avatar/pronoun entries " +
    "as stale orphans -- a false red, and the list is also SE-03's obligation to check them harder");

  const doc = read(RESEARCH_DOC_REL);
  assert.ok(VC_REF_RE.test(doc),
    `${RESEARCH_DOC_REL} must cite at least one VC- claim ref -- the survivor's description cites ` +
    "this path, and file_invention_proposal() refuses a description with no claim ref");
  assert.ok(doc.includes(RESEARCH_PATH_FRAGMENT),
    `${RESEARCH_DOC_REL} must name its own docs/research/ path so the filed description can cite it`);

  // -- Live arm --------------------------------------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-64 live arm (seed rows + the web-search trait + the filing-contract cover check)",
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
  assert.ok(agent, "no agents row for 'researcher' -- apply the AGT-64 section of docs/design/ga-agents-seed.sql");
  assert.equal(agent.code, "GV-02");
  assert.equal(agent.lane, "governance", "the Researcher must be in the governance lane (SES-330)");
  const productRoster = await rest("agents?is_active=eq.true&lane=eq.product&select=id");
  assert.ok(!productRoster.some(a => a.id === AGENT_ID),
    "the Researcher must not appear in the product roster the delegation broker reads");

  const profiles = await rest(`skill_profiles?slug=in.(${SKILL_SLUGS.join(",")})&select=slug,skill_type_slug,traits`);
  assert.equal(profiles.length, SKILL_SLUGS.length, `expected ${SKILL_SLUGS.length} rs-* skill_profiles, got ${profiles.length}`);
  const typesPresent = new Set(profiles.map(p => p.skill_type_slug));
  for (const t of SKILL_TYPES) assert.ok(typesPresent.has(t), `Skill type "${t}" missing from the Researcher's profiles`);

  const links = await rest(`capability_skill_profiles?capability_slug=eq.${CAPABILITY}&select=skill_profile_slug`);
  assert.equal(links.length, SKILL_SLUGS.length,
    `${CAPABILITY} must link ${SKILL_SLUGS.length} Skill profiles (five types, no Format Skill), got ${links.length}`);
  assert.deepEqual(links.map(l => l.skill_profile_slug).sort(), [...SKILL_SLUGS].sort());

  const assigns = await rest(`agent_capability_assignments?agent_id=eq.${AGENT_ID}&select=capability_slug`);
  assert.deepEqual(assigns.map(a => a.capability_slug), [CAPABILITY]);
  const cap = (await rest(`capabilities?slug=eq.${CAPABILITY}&select=slug,execution_type,default_intent_slug`))[0];
  assert.equal(cap.default_intent_slug, INTENT_SLUG, "the capability must default to the research Intent");
  assert.equal(cap.execution_type, "ai");

  const intent = profiles.find(p => p.slug === INTENT_SLUG);
  const schema = intent.traits && intent.traits.schema;
  assert.ok(schema && schema.type === "object" && Array.isArray(schema.required),
    "the Intent's traits.schema must parse as an object schema with a `required` array");
  for (const k of ["lens", "egress", "findings", "shortlist", "survivors", "research_doc"]) {
    assert.ok(schema.required.includes(k), `the Intent's schema must require "${k}"`);
  }
  assert.equal(intent.traits.enable_web_search, true,
    "rs-research-intent.traits.enable_web_search must be true -- db-assembly.js's HAR-05 gate reads " +
    "THAT and nothing else; technical_services:[\"web-search\"] does not attach the tool, so without " +
    "this the Researcher reports egress 'blocked' and leg 1 silently never runs");

  const survivorRequired = schema.properties.survivors.items.required;

  // -- The filing contract, read live by refusal (see header note 4) ----------------------------
  const PROBE_SESSION = "agt64-contract-probe";
  const validBase = {
    class: "P3 - Investor Value",
    title: "AGT-64 contract probe -- never filed",
    description: `probe citing VC-ROOT-003 and ${RESEARCH_DOC_REL}`,
    scope_rationale: "probe",
    enhancement_claim: "none: probe payload, no scoreboard metric claimed",
    predicted_cycles: 1,
  };
  const requiredPKeys = [];
  for (const [k, { bad, says }] of Object.entries(CONTRACT_PROBES)) {
    const p = { ...validBase, [k]: bad };
    assert.notDeepEqual(p[k], validBase[k],
      `probe for "${k}" must actually differ from the valid base -- an unmutated payload would FILE`);
    const r = await fetch(`${url}/rest/v1/rpc/file_invention_proposal`, {
      method: "POST", headers: H,
      body: JSON.stringify({ p_cycle: null, p_session: PROBE_SESSION, p }),
    });
    const body = await r.json().catch(() => ({}));
    assert.equal(r.status, 400,
      `file_invention_proposal() must REFUSE an invalid "${k}" (got ${r.status}) -- if this ever ` +
      "returns 200 the function has stopped validating that key and this probe has just written a ticket");
    assert.ok(says.test(body.message || ""),
      `the refusal for "${k}" must be that key's own check; got: ${body.message}`);
    requiredPKeys.push(k);
  }

  // Nothing may have been written by the ladder. Asserted, not argued.
  const strayRows = await rest(`backlog_items?session_ref=like.*${PROBE_SESSION}*&select=backlog_id`);
  assert.equal(strayRows.length, 0, `the probe ladder wrote ${strayRows.length} backlog_items row(s) -- it must write none`);
  const strayDecisions = await rest(`runner_decisions?session_name=eq.${PROBE_SESSION}&select=id`);
  assert.equal(strayDecisions.length, 0, `the probe ladder wrote ${strayDecisions.length} runner_decisions row(s) -- it must write none`);

  assert.deepEqual(requiredPKeys.sort(), Object.keys(CONTRACT_PROBES).sort(),
    "every key in CONTRACT_PROBES must have been confirmed live");
  assert.ok(covers(requiredPKeys, survivorRequired),
    "the Intent's survivor keys must cover every key file_invention_proposal() requires " +
    `(under the one documented rename ${JSON.stringify(P_KEY_TO_SURVIVOR_KEY)}). ` +
    `required: ${JSON.stringify(requiredPKeys)}; survivor: ${JSON.stringify(survivorRequired)}`);

  // NEGATIVE CONTROL: drop a key from a COPY of the live survivor shape -- covers() must reject.
  const mutant = survivorRequired.filter(k => k !== "priority_class");
  assert.ok(!covers(requiredPKeys, mutant),
    "covers() must reject a survivor shape with priority_class removed -- a predicate that cannot " +
    "reject the mutant is not measuring the contract");

  console.log(`[AGT-64] filing contract confirmed live by refusal: ${requiredPKeys.join(", ")} ` +
    `-> survivor keys ${survivorRequired.join(", ")} (rename: class -> priority_class); 0 rows written`);
}

selfRun(import.meta.url, run);
