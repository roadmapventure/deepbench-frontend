// DeepBench v7.0.17 | tests/regression/AGT-44-platform-language-guardrail.js | HAR-02c-patch --
// B5 added: HAR-30 rot-guard. The HAR-30 fix scoped the ci-identity/ci-behavior skill_profiles
// rows away from ci-routing-intent via traits.intent_allowlist (persona text deterministically
// flipped case 6's five-way routing forecast -> qa after the stable-first reorder; verified
// restored 10/10 + full-run journeys 24/24). Same rot-prone allowlist shape B3 already guards on
// the shared guardrail Skill row -- B5 asserts non-empty, ci-routing-intent excluded, and
// ci-answer-intent included, for BOTH rows. Full record: docs/harvests/HAR-02.md.
// DeepBench v7.0.16 | tests/regression/AGT-44-platform-language-guardrail.js | HAR-02b-patch3 --
// A3/A4 re-anchored again: stable run is now format 1, identity 2, behavior 3, guardrails 4,
// intent 5 -- intent LAST in the stable phase, restoring the intent->task adjacency whose loss the
// live A/B caught as a deterministic routing regression (case 6 upgrade-cycles direct-instead-of-
// forecast 4/4; case 5 reseller-reqs 10-continue-cap breach 2/2). "Guardrails sorts last within
// stable" is superseded by "intent sorts last within stable". B1/B2/B3 untouched.
// DeepBench v7.0.16 | tests/regression/AGT-44-platform-language-guardrail.js | HAR-02b-patch2 --
// B3 re-anchored to the SHIPPED S-AGT-44b (v7.0.7) state: channel-intelligence is attached again
// (AGT-44 reopen, done + archived), and the mitigation that makes it safe is now asserted -- the
// Skill row's traits.intent_allowlist must be non-empty and must exclude ci-routing-intent (the
// exclusion is the invariant; the full list may legitimately grow, so it is deliberately not
// pinned). Records a shipped decision, not a new one. Full record: docs/harvests/AGT-44.md.
// DeepBench v7.0.16 | tests/regression/AGT-44-platform-language-guardrail.js | HAR-02b-patch --
// A3/A4 re-anchored to the stable-first layout (S-HAR-02b prompt reorder): guardrails now renders at
// order 5, prompt_phase 'stable', LAST within the stable phase -- after format/intent/identity/
// behavior, before every volatile (per-call) section, knowledge included. The pre-reorder claims
// ("after knowledge", "last among Skill-derived sections", SKILL_ORDER.guardrails === 6) encoded the
// superseded layout. B1's live skill_types.guardrails.display_order === 6 check is deliberately
// UNCHANGED -- that column is DB display metadata, not a SKILL_ORDER mirror, as of the renumbering.
// DeepBench v6.3.229 | tests/regression/AGT-44-platform-language-guardrail.js | AGT-44
// FEATURE: AGT-44 -- SES-009a persistence. One shared Guardrails Skill (`platform-language-guardrail`)
// carries the business-content standard to every artifact-producing agent: business content for a VP of
// Channel Sales, never narration of platform machinery. Zero lines of assembler change -- the mechanism
// is `capability_skill_profiles` rows plus a `guardrails`-type `skill_profiles` row whose rule text lives
// in the `guardrails` COLUMN.
//
// That column is the entire risk, and it is why this file exists. buildSections()'s guardrails branch
// reads `sp.guardrails` and nothing else. Identical text placed in `method` or `objective` is dropped
// SILENTLY: the row still exists, the section still renders, every text-level check on the Skill still
// passes, and the model never sees the rule. That is exactly the failure AGT-36b shipped into QA
// (STANDARDS.md Section 5 -- "A Skill's instruction text and its output schema change together").
//
// Two halves, split by what each can prove without credentials:
//
//   A. Assembler contract -- always runs, no network, no credentials. Pins the code side: the guardrails
//      column is the only column read, the section reaches the model AFTER the agent's own instructions
//      and BEFORE VOICE, and a Capability with no guardrails-type Skill still gets no guardrails section
//      (the addition is opt-in per Capability, so the untouched Capabilities are provably unaffected).
//   B. Live Skill row -- the real `platform-language-guardrail` row and its three attachments. Gated on
//      Supabase credentials; announces itself SKIPPED rather than passing quietly. Half A alone cannot
//      fail if the Skill row were deleted or its text moved to `method`, because AGT-44 shipped no code
//      -- a green Half A on reverted data is the vacuous pass this half exists to prevent.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { buildSections } from "../../api/prompt/db-assembly.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

const SKILL_SLUG = "platform-language-guardrail";

// The Capabilities whose output a user reads. memory-consolidation is deliberately absent
// (John's call, 2026-07-29: Elena Cho -- The Reasoner's output is not judged, so no leak has ever
// been measured on it).
//
// THREE Capabilities. The list has moved twice, each time on measurement, and this comment is the
// record of both moves -- because silently changing this set is the regression that costs the most here.
//
// SHIP + SAME-DAY DETACHES (John's calls, 2026-07-29) -- four attached at ship, two detached after
// measurement:
//
//   quality-gate -- Owen Marsh -- The Proofreader is the agent who POLICES this vocabulary. Giving him
//     a Skill that spells the vocabulary out put the banned phrases into the judge's own prompt, and he
//     quoted them back -- along with two phrases from his own qg-content-context-intent.method -- as the
//     "offending phrase" found in an artifact. The agent enforcing a word list must not be handed it.
//     STILL DETACHED -- this half of the 2026-07-29 decision stands.
//
//   channel-intelligence -- Marcus Webb -- GEO CSO Expert: detached 2026-07-29 because the plain
//     attachment reached ci-routing-intent (a Skill attaches to a Capability, so it reached every
//     intent), and case 6's five-way classification went forecast -> qa deterministically, producing
//     a journey_deviation the baseline never had.
//
// THE v7.0.7 RE-ATTACH (S-AGT-44b, AGT-44 reopen, 2026-07-31, shipped + archived): channel-intelligence
// carries the Skill again -- the v6.3.229 close-out had claimed this gap was already closed, and the
// reopen closed it for real. The routing hazard above was fixed at ROOT first (AGT-54: AA-121's
// intent_allowlist gate hoisted out of the knowledge-only branch to fire for ANY Skill type), then the
// Skill re-attached with traits.intent_allowlist scoping it AWAY from ci-routing-intent -- proven by a
// deterministic 3/3 A/B in both directions. B3 below asserts that exclusion (the accepted-risk note on
// the row: the allowlist lives on the one shared Skill row and can rot silently if a new content intent
// is added without updating it). Full record: docs/harvests/AGT-44.md.
//
// The general rule all of this teaches: attach this Skill only where a leak has actually been measured,
// and never let it reach an intent that serves classification or routing calls -- since v7.0.7 that
// scoping is carried by traits.intent_allowlist rather than by refusing the attachment outright.
const ATTACHED_CAPABILITIES = ["hypothesis-evaluation", "data-analysis", "channel-intelligence"];

// Two clauses that must survive verbatim into the assembled prompt. The first names the reader; the
// second is the store prohibition the measured failures breached.
const PINNED_PHRASES = ["Your reader is a VP of Channel Sales", "never name the Data Room"];

const RULE_CLAUSES = [
  "Your reader is a VP of Channel Sales who will act on what you write.",
  "Do not describe the machinery that produced it: never name the Data Room or any other store",
  "When something is missing, say what is missing in business terms",
  "including structured ones such as supports, complicates, consider, content and critique",
];

// The schema default for skill_profiles.guardrails -- what a row that put its text in the WRONG column
// still carries in the right one. Used by A2 so the wrong-column fixture matches real DB shape rather
// than an artificially empty one.
const GUARDRAILS_COLUMN_DEFAULT = { must: [], must_not: [] };

function guardrailsSkill(overrides = {}) {
  return {
    slug: SKILL_SLUG,
    name: "Business Content Standard",
    skill_type_slug: "guardrails",
    guardrails: RULE_CLAUSES,
    traits: {},
    technical_services: [],
    is_required: true,
    ...overrides,
  };
}

// A realistic sibling set: one Skill of every other type, so the ordering assertions compare the
// guardrails section against real neighbours rather than against nothing.
function siblingSkills() {
  return [
    { slug: "hyp-identity", name: "Identity", skill_type_slug: "identity", objective: "Be Priya.", traits: {} },
    { slug: "hyp-behavior", name: "Behavior", skill_type_slug: "behavior", traits: { writing_style: "direct" } },
    { slug: "hyp-knowledge", name: "Knowledge", skill_type_slug: "knowledge", traits: {} },
    { slug: "hyp-hypothesis-test-intent", name: "Theory Test", skill_type_slug: "intent", objective: "Stress-test it.", traits: {} },
  ];
}

function sectionBySlug(sections, slug) {
  return sections.find(s => s.slug === slug) || null;
}

async function assemblerContract() {
  // A1. Rule text in the `guardrails` column, array-of-strings shape, reaches the section verbatim.
  //     Array shape is load-bearing: the branch spreads an array into the section, while an object is
  //     JSON.stringify'd into the prompt as raw JSON the model reads as machinery, not instruction.
  const withGuardrails = buildSections(
    [...siblingSkills(), guardrailsSkill()],
    "priya", [], null, "hyp-hypothesis-test-intent"
  );
  const g = sectionBySlug(withGuardrails.sections, "guardrails");
  assert.ok(g, "no section with slug 'guardrails' was produced -- buildSections() no longer renders a guardrails-type Skill at all");
  assert.equal(g.label, "CONSTRAINTS & GUARDRAILS", `guardrails section label changed to '${g.label}'`);
  assert.equal(g.skill_profile_slug, SKILL_SLUG, "the guardrails section must be attributed to the Skill that declared it");
  for (const clause of RULE_CLAUSES) {
    assert.ok(g.content && g.content.includes(clause),
      `the guardrails section content is missing a clause declared in the guardrails column: "${clause.slice(0, 60)}..."`);
  }
  for (const phrase of PINNED_PHRASES) {
    assert.ok(g.content.includes(phrase), `the guardrails section content is missing the pinned phrase "${phrase}"`);
  }

  // A2. THE DISCRIMINATOR. The identical text in `method` instead is silently dropped. The section is
  //     still produced (that is the trap -- nothing looks broken), so this asserts the section EXISTS
  //     and the text is absent from it, never merely that assembly failed.
  const wrongColumn = buildSections(
    [...siblingSkills(), guardrailsSkill({ guardrails: GUARDRAILS_COLUMN_DEFAULT, method: RULE_CLAUSES.join("\n") })],
    "priya", [], null, "hyp-hypothesis-test-intent"
  );
  const gWrong = sectionBySlug(wrongColumn.sections, "guardrails");
  assert.ok(gWrong, "the wrong-column fixture produced no guardrails section -- this assertion must compare a rendered section, not an absent one");
  for (const clause of RULE_CLAUSES) {
    assert.ok(!(gWrong.content || "").includes(clause),
      `rule text placed in \`method\` reached the guardrails section. If buildSections() now reads \`method\` too, the wrong-column trap is gone -- but AGT-44's data still lives in \`guardrails\`, and a session that "fixes" this by loosening the reader instead of moving the text is the regression this asserts against: "${clause.slice(0, 50)}..."`);
  }
  // ...and the same text is not smuggled in through any other section either.
  for (const s of wrongColumn.sections) {
    assert.ok(!(s.content || "").includes(RULE_CLAUSES[0]),
      `rule text in \`method\` surfaced in the '${s.slug}' section -- a guardrails-type Skill's method must reach the model through no section at all`);
  }

  // A3. The guardrails section renders positioned per the platform's declared order. A constraint the
  //     model reads before the instructions it constrains is a constraint it discounts -- so it still
  //     comes AFTER the agent's own identity/behavior. Since S-HAR-02b-patch3 the stable run is
  //     format 1, identity 2, behavior 3, guardrails 4, intent 5: guardrails is the last section
  //     BEFORE intent, and every volatile per-call section renders after the whole stable run
  //     (knowledge/RAG included -- knowledge moved to the volatile tail because its content is
  //     fetched per call; "after knowledge" was the pre-reorder claim and is deliberately no
  //     longer asserted).
  assert.equal(g.order, 4, `guardrails order is ${g.order}, not 4 -- the stable-first layout moved`);
  assert.equal(g.prompt_phase, "stable",
    `guardrails prompt_phase is '${g.prompt_phase}', not 'stable' -- a volatile guardrails section would fall out of the cacheable prefix and re-order it after per-call content`);
  for (const slug of ["identity", "behavior"]) {
    const other = sectionBySlug(withGuardrails.sections, slug);
    assert.ok(other, `fixture set produced no '${slug}' section -- the ordering comparison would be vacuous`);
    assert.ok(g.order > other.order,
      `guardrails order (${g.order}) must be greater than '${slug}' order (${other.order})`);
  }
  // S-HAR-02b-patch3: "guardrails sorts last within the stable phase" is SUPERSEDED -- intent does.
  // The first stable-first cut kept intent at 2, which inserted identity/behavior/guardrails between
  // the Intent section's instructions and the CURRENT TASK text they govern; the live A/B caught
  // that as a deterministic routing regression (case 6 upgrade-cycles routed direct instead of
  // forecast, 4/4) plus a 10-continue-cap breach (case 5 reseller-reqs, 2/2). Intent instructions
  // must sit adjacent to the task tail: intent is now order 5, the LAST stable section, with
  // guardrails at 4 directly before it.
  const intentSection = sectionBySlug(withGuardrails.sections, "intent");
  assert.ok(intentSection, "fixture set produced no 'intent' section -- the adjacency assertion would be vacuous");
  assert.ok(g.order < intentSection.order,
    `guardrails order (${g.order}) must be less than intent order (${intentSection.order}) -- intent must stay the last stable section (intent->task adjacency)`);
  const stableSections = withGuardrails.sections.filter(s => s.prompt_phase === "stable");
  assert.equal(stableSections[stableSections.length - 1].slug, "intent",
    "the intent section must sort last within the stable phase -- its instructions must sit directly adjacent to the volatile task tail (S-HAR-02b-patch3, case 6 deterministic 4/4)");
  const volatileSections = withGuardrails.sections.filter(s => s.prompt_phase !== "stable");
  assert.ok(volatileSections.length > 0,
    "fixture set produced no volatile section -- the stable/volatile boundary comparison would be vacuous");
  for (const v of volatileSections) {
    assert.ok(v.order > intentSection.order,
      `volatile section '${v.slug}' (order ${v.order}) sorts before the last stable section (intent, order ${intentSection.order}) -- per-call content is interleaving into the stable prefix`);
  }

  // A4. ...and still BEFORE VOICE. VOICE is appended by assemblePrompt() at a hardcoded order and must
  //     remain the final thing the model reads (AA-127); a SKILL_ORDER value that ever reached it would
  //     displace the platform-wide register instruction on every call, for every agent.
  const src = fs.readFileSync(path.join(ROOT, "api", "prompt", "db-assembly.js"), "utf8");
  const skillOrderLiteral = src.match(/const SKILL_ORDER = \{([^}]*)\}/);
  assert.ok(skillOrderLiteral, "SKILL_ORDER literal not found in api/prompt/db-assembly.js -- the file changed shape");
  assert.ok(/guardrails\s*:\s*4/.test(skillOrderLiteral[1]),
    "SKILL_ORDER.guardrails is no longer 4 -- S-HAR-02b-patch3's stable run is format 1, identity 2, behavior 3, guardrails 4, intent 5 (intent LAST, adjacent to the task tail). NOTE: skill_types.guardrails.display_order stays 6 in Supabase (display metadata, deliberately NOT a SKILL_ORDER mirror since the renumbering)");
  const voiceOrder = Number((src.match(/slug:\s*'voice'[\s\S]*?order:\s*(\d+)/) || [])[1]);
  assert.ok(Number.isFinite(voiceOrder), "the VOICE section's order literal not found in api/prompt/db-assembly.js");
  const orderValues = [...skillOrderLiteral[1].matchAll(/:\s*(\d+)/g)].map(m => Number(m[1]));
  assert.ok(orderValues.length >= 6, `parsed only ${orderValues.length} SKILL_ORDER values -- the literal changed shape`);
  for (const v of orderValues) {
    assert.ok(v < voiceOrder, `a SKILL_ORDER value (${v}) is not less than the VOICE section's order (${voiceOrder}) -- VOICE must stay last`);
  }

  // A5. Opt-in per Capability. A Capability with no guardrails-type Skill gets no guardrails section --
  //     which is what makes "the untouched Capabilities are unaffected" a measured claim rather than an
  //     assumption. Agent-level guardrail configs are passed here too: they are read only INSIDE the
  //     guardrails branch, so without a guardrails-type Skill they must still produce nothing.
  const noGuardrails = buildSections(
    siblingSkills(), "priya",
    [{ type: "guardrail", text: "an agent_configs guardrail entry" }],
    null, "hyp-hypothesis-test-intent"
  );
  assert.equal(sectionBySlug(noGuardrails.sections, "guardrails"), null,
    "a Capability with no guardrails-type Skill produced a guardrails section -- the addition would no longer be opt-in, and every Capability on the platform would silently inherit it");

  // A6. The Skill contributes nothing but the section: it must not touch the format contract, the llm
  //     selection, or any of the passthrough booleans. skill_profiles.llm_model defaults to
  //     claude-haiku-4-5, so a guardrails Skill that leaked into llm selection would silently downgrade
  //     the model on all four Capabilities (the AA-75/AA-76 postmortem, same mechanism).
  const bare = buildSections([guardrailsSkill({ llm_model: "claude-haiku-4-5-20251001", llm_provider: "anthropic", max_tokens: 4000 })], "priya", [], null, null);
  assert.equal(bare.llm.model, "claude-sonnet-4-6",
    `a guardrails-type Skill's llm_model reached the call's llm selection (got '${bare.llm.model}') -- only Intent/Format Skills may select a model`);
  assert.equal(bare.formatContract.skill_profile_slug, null,
    "a guardrails-type Skill claimed the format contract -- only Intent/Format Skills may set it");
  assert.equal(bare.canRequestHelp, false, "a guardrails-type Skill must not set canRequestHelp");
  assert.equal(bare.delegationRequired, false, "a guardrails-type Skill must not set delegationRequired");

  // A7. It is excluded from the §19k runtime signature by construction (buildSignatureConfig keeps
  //     knowledge/intent/format only). Asserted so its absence from `assembled_skill_slugs` is read as
  //     designed rather than investigated as a miss.
  const { buildSignatureConfig } = await import("../../api/prompt/db-assembly.js");
  const cfg = buildSignatureConfig([...siblingSkills(), guardrailsSkill()], { capability_slug: "hypothesis-evaluation" });
  assert.ok(!(cfg?.assembled_skill_slugs || []).includes(SKILL_SLUG),
    "the guardrails Skill entered the runtime signature's assembled_skill_slugs -- §19k keeps knowledge/intent/format only");
}

async function liveSkillRow() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.log("  [AGT-44] live Skill-row half SKIPPED -- no SUPABASE_URL / SUPABASE_SERVICE_KEY in env " +
      "(run with `node --env-file=.env.local tests/regression/run-all.js` to include it). The assembler-contract " +
      "half above DID run, but it cannot see the data: AGT-44 shipped no code, so a green suite without this half " +
      "does NOT prove the Skill row still exists or still holds its text in the guardrails column.");
    return;
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  // B1. The type row exists. skill_profiles.skill_type_slug carries an FK to it, so its absence would
  //     have made the Skill row uninsertable in the first place.
  const tRes = await fetch(`${url}/rest/v1/skill_types?slug=eq.guardrails&select=slug,display_order`, { headers });
  assert.ok(tRes.ok, `skill_types read failed: HTTP ${tRes.status}`);
  const [typeRow] = await tRes.json();
  assert.ok(typeRow, "skill_types has no 'guardrails' row -- the FK backing every Guardrails Skill is gone");
  assert.equal(typeRow.display_order, 6, `skill_types.guardrails.display_order is ${typeRow.display_order}, not 6 (display metadata -- deliberately NOT a SKILL_ORDER mirror since S-HAR-02b's renumbering moved SKILL_ORDER.guardrails to 5)`);

  // B2. THE DATA DISCRIMINATOR. The rule text is in the `guardrails` column, array-shaped, and NOT in
  //     `method`/`objective`. A future edit that moves it is silent everywhere else on the platform.
  const sRes = await fetch(`${url}/rest/v1/skill_profiles?slug=eq.${SKILL_SLUG}&select=*`, { headers });
  assert.ok(sRes.ok, `skill_profiles read failed: HTTP ${sRes.status}`);
  const [row] = await sRes.json();
  assert.ok(row, `skill_profiles has no '${SKILL_SLUG}' row -- AGT-44's standard reaches no agent`);
  assert.equal(row.skill_type_slug, "guardrails", `${SKILL_SLUG}.skill_type_slug is '${row.skill_type_slug}' -- only a guardrails-type Skill renders as a CONSTRAINTS & GUARDRAILS section`);
  assert.ok(Array.isArray(row.guardrails),
    `${SKILL_SLUG}.guardrails is ${JSON.stringify(row.guardrails)?.slice(0, 60)} -- it must be a jsonb ARRAY of strings; an object is JSON.stringify'd into the prompt as raw JSON`);
  assert.equal(row.guardrails.length, 4, `${SKILL_SLUG}.guardrails has ${row.guardrails.length} clauses, expected 4`);
  assert.equal(row.method, null, `${SKILL_SLUG}.method is set -- a guardrails-type Skill's method is read by NOTHING and reaches no model`);
  assert.equal(row.objective, null, `${SKILL_SLUG}.objective is set -- a guardrails-type Skill's objective is read by NOTHING and reaches no model`);
  const joined = row.guardrails.join("\n");
  for (const phrase of PINNED_PHRASES) {
    assert.ok(joined.includes(phrase), `the live ${SKILL_SLUG} row no longer carries the pinned phrase "${phrase}"`);
  }

  // B2b. NO QUOTED COUNTER-EXAMPLE. The rule states what to do; it never spells out a bad sentence.
  // Clause 3 originally read: never "the Data Room contains no record of this". That handed every
  // holder of this Skill a ready-made sentence committing the violation -- exactly AA-127's failure
  // mode (the model mirroring phrasing out of its own instructional text), and it was quoted back as
  // evidence in the QA run. A prohibition list (clause 2) names vocabulary; a counter-example supplies
  // a whole sentence in the artifact's own voice, which is the part that gets copied.
  for (const banned of ["contains no record", "No comparable partner has reported this"]) {
    assert.ok(!joined.includes(banned),
      `${SKILL_SLUG} carries a quoted counter-example again ("${banned}"). State the rule positively -- a model-answer sentence in the artifact's voice is copyable, and it is also quotable by the judge as a finding.`);
  }

  // B3. Attached to exactly the recorded Capability set (see the ATTACHED_CAPABILITIES comment for
  //     both dated moves) -- and to memory-consolidation never. Elena Cho -- The Reasoner's exclusion
  //     is a decision, not an oversight; an attachment appearing or vanishing silently is what this
  //     asserts against.
  const aRes = await fetch(`${url}/rest/v1/capability_skill_profiles?skill_profile_slug=eq.${SKILL_SLUG}&select=capability_slug,level,is_required`, { headers });
  assert.ok(aRes.ok, `capability_skill_profiles read failed: HTTP ${aRes.status}`);
  const attachments = await aRes.json();
  assert.deepEqual([...attachments.map(a => a.capability_slug)].sort(), [...ATTACHED_CAPABILITIES].sort(),
    `${SKILL_SLUG} is attached to ${JSON.stringify(attachments.map(a => a.capability_slug))}, expected exactly ${JSON.stringify(ATTACHED_CAPABILITIES)}`);
  for (const a of attachments) {
    assert.equal(a.is_required, true, `${SKILL_SLUG} on '${a.capability_slug}' is not is_required -- the standard is not optional`);
  }
  //     The v7.0.7 mitigation that makes the channel-intelligence attachment safe: the Skill row's
  //     traits.intent_allowlist must exist (non-empty array) and must EXCLUDE ci-routing-intent --
  //     the deterministic 3/3 A/B proved that exclusion is what keeps case 6's five-way routing
  //     classification clean. Deliberately NOT a pin of the full intent list: the allowlist may
  //     legitimately grow as new content intents are added (that growth-without-update is the
  //     recorded rot risk; the exclusion is the invariant). An empty/missing allowlist means the
  //     Skill fires on EVERY intent of all three Capabilities -- the exact pre-AGT-54 hazard.
  const allowlist = row.traits?.intent_allowlist;
  assert.ok(Array.isArray(allowlist) && allowlist.length > 0,
    `${SKILL_SLUG}.traits.intent_allowlist is missing/empty (got ${JSON.stringify(allowlist)}) -- without it the guardrail reaches every intent, including routing/classification calls (the AGT-44b regression)`);
  assert.ok(!allowlist.includes("ci-routing-intent"),
    `${SKILL_SLUG}.traits.intent_allowlist includes "ci-routing-intent" -- the guardrail must never reach the five-way routing classification (proven deterministic 3/3: it flips case 6 forecast -> qa; see docs/harvests/AGT-44.md)`);

  // B4. The worked example Priya was handed -- a sentence that committed the very violation clause 2
  //     forbids -- stays deleted, and the rule it illustrated stays intact. Deleting the whole
  //     NEVER-LEAVE-A-SECTION-EMPTY paragraph would also make the first assertion pass.
  const pRes = await fetch(`${url}/rest/v1/skill_profiles?slug=eq.hyp-hypothesis-test-intent&select=method,objective`, { headers });
  assert.ok(pRes.ok, `hyp-hypothesis-test-intent read failed: HTTP ${pRes.status}`);
  const [priya] = await pRes.json();
  assert.ok(priya, "hyp-hypothesis-test-intent is gone");
  assert.ok(!priya.method.includes("found none in the Data Room"),
    "hyp-hypothesis-test-intent.method again instructs the violation by worked example -- it hands Priya a sentence naming the store, which is what clause 2 forbids");
  for (const kept of ["NEVER LEAVE A SECTION EMPTY", "CHART-CARRYING REQUIREMENT", "name what you looked for"]) {
    assert.ok(priya.method.includes(kept),
      `hyp-hypothesis-test-intent.method no longer contains '${kept}' -- the deletion was meant to remove one parenthetical example, not the rule around it`);
  }
  // objective legitimately names the CSO Data Room: that text instructs Priya what to QUERY, and the
  // standard governs what she writes, not what she reads. Asserted so a later sweep doesn't "clean" it.
  assert.ok(priya.objective.includes("CSO Data Room"),
    "hyp-hypothesis-test-intent.objective no longer names the CSO Data Room -- that phrase is operational instruction about what to query, deliberately left in place");

  // B5. THE HAR-30 ROT-GUARD (S-HAR-02c-patch). S-HAR-02b's stable-first prompt reorder made the
  //     persona text on Marcus Webb -- GEO CSO Expert's OWN ci-identity/ci-behavior Skill rows
  //     deterministically flip case 6's five-way routing classification forecast -> qa (3/3 in
  //     both A/B directions -- HAR-30). The fix is the same mechanism B3 asserts on the shared
  //     guardrail Skill: traits.intent_allowlist on BOTH rows scopes the persona text to the four
  //     content/ack intents and AWAY from ci-routing-intent (restored historical routing 10/10,
  //     full-run journeys 24/24). And it rots the same two silent ways: clearing the traits
  //     reintroduces the routing regression; adding a new channel-intelligence content intent
  //     without extending them strips persona from that intent with no error anywhere. The
  //     exclusion (ci-routing-intent out) and one content-intent inclusion (ci-answer-intent in)
  //     are the invariants; the full list may legitimately grow, so it is deliberately not
  //     pinned. Full record: docs/harvests/HAR-02.md.
  const ciRes = await fetch(`${url}/rest/v1/skill_profiles?slug=in.(ci-identity,ci-behavior)&select=slug,traits`, { headers });
  assert.ok(ciRes.ok, `ci-identity/ci-behavior read failed: HTTP ${ciRes.status}`);
  const ciRows = await ciRes.json();
  for (const slug of ["ci-identity", "ci-behavior"]) {
    const ciRow = ciRows.find(r => r.slug === slug);
    assert.ok(ciRow, `skill_profiles has no '${slug}' row -- Marcus Webb's persona Skill is gone, and with it the HAR-30 routing-isolation allowlist (see docs/harvests/HAR-02.md)`);
    const ciAllowlist = ciRow.traits?.intent_allowlist;
    assert.ok(Array.isArray(ciAllowlist) && ciAllowlist.length > 0,
      `${slug}.traits.intent_allowlist is missing/empty (got ${JSON.stringify(ciAllowlist)}) -- without it the persona text reaches EVERY channel-intelligence intent, including ci-routing-intent, where it deterministically flips case 6's five-way classification forecast -> qa (the HAR-30 regression; see docs/harvests/HAR-02.md)`);
    assert.ok(!ciAllowlist.includes("ci-routing-intent"),
      `${slug}.traits.intent_allowlist includes "ci-routing-intent" -- persona text must never sit adjacent to the five-way routing classification: the routing call needs the intent's own instructions next to the task, and persona content there flips case 6 forecast -> qa deterministically (HAR-30; see docs/harvests/HAR-02.md)`);
    assert.ok(ciAllowlist.includes("ci-answer-intent"),
      `${slug}.traits.intent_allowlist no longer includes "ci-answer-intent" -- the allowlist exists to scope persona AWAY from routing, not off the content path: dropping the main answer intent silently strips Marcus Webb's persona from every CHI answer (same rot class as adding a new content intent without extending the list; see docs/harvests/HAR-02.md)`);
  }
}

export default async function run() {
  await assemblerContract();
  await liveSkillRow();
}

selfRun(import.meta.url, run);
