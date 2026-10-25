// DeepBench v7.0.895 | tests/regression/agt-429-bundle-section-dedupe.test.mjs | AGT-429 -- 44->4 / 22->2 / 11->1
//
// FEATURE: AGT-429 -- each DISTINCT assembled section renders ONCE per bundle, not once per
// capability that links its Skill. Measured live this cycle BEFORE the build, through the real
// assemblePrompt() agent-wide path: an agent-wide bundle carried 44 sections of only 4 distinct
// Skill slugs, one role prompt 22 times and one guardrail 11 -- because
// api/prompt/db-assembly.js's `} else if (agent_id) {` branch pushes every assigned capability's
// `capability_skill_profiles` rows with NO slug check, and buildSections() emits one section per
// row. That violates `.claude/rules/agent-data-visibility.md` ("never render a role prompt,
// guardrail or taught item into more than one assembled section") and the LOCKED
// docs/ARCHITECTURE.md §19b. The fix is ONE pure dedupe by `sp.slug` at the END of that branch's
// load -- no agent id, no capability slug, no content judgment
// (`.claude/rules/capabilities-are-data.md`).
//
// THREE ARMS:
//   (A) PURE -- dedupeSkillProfilesBySlug() itself, the "first row per slug wins" rule: 44 rows of 4
//       distinct slugs give 4, in their original order, each keeping the FIRST capability that
//       brought it in (dropping the first copy would rewrite that provenance); a slug-less row is
//       KEPT, never collapsed; a non-array is []; and dropping NOTHING returns the SAME reference,
//       which is what makes every already-correct bundle byte-identical. No fetch, no env, no
//       database: this arm grades the rule.
//   (B) DISCRIMINATOR -- buildSections() over the exact 44-row shape, WITH its own CONTROL. Deduped:
//       4 sections, `ROLE-A` 2, `GUARD-B` 1. Un-deduped, same input: 44 / 22 / 11 -- the measured
//       live numbers. A no-op T1 leaves this arm RED on `sections=44`, so the arm cannot pass
//       against an unchanged assembler.
//   (C) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the shipped state through a REAL
//       assemblePrompt() for `nathan` and `jerry`, the two agent-wide bundles the ticket names: no
//       section slug appears twice, and `deepbench-north-star` still renders exactly ONCE (AGT-434's
//       guarantee must survive this change, and a dedupe that ate entitled content would show here).
//       Read-only -- nothing in this file writes to Supabase (pattern:76).
//
// BOTH DIRECTIONS, deliberately: arm A and arm C assert that nothing ENTITLED was dropped (4 slugs
// kept, the north star still present) as well as that the repeats are gone. A one-directional
// assertion would pass on a function that returned [].
//
// WHAT THIS FILE DOES NOT CLAIM. `ROLE-A` renders TWICE in a correct deduped bundle, and that is
// asserted as 2, not 1: the identity branch (db-assembly.js ~:288) and the behavior branch (~:300)
// both render agent_configs' role prompts, so a role prompt renders twice even at ONE capability.
// That is a SEPARATE defect, unchanged by this ticket and filed on its own row -- this arm pins
// today's true number so the separate fix is visible when it lands.
//
// NO MODEL CALL, NO SPEND.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

import { assemblePrompt, buildSections, dedupeSkillProfilesBySlug } from "../../api/prompt/db-assembly.js";

const SKILLS = [
  { slug: "role-identity", skill_type_slug: "identity", name: "Role", objective: "OBJ", method: "METH" },
  { slug: "role-behavior", skill_type_slug: "behavior", name: "Behavior", traits: { reasoning_style: "careful" } },
  { slug: "role-guardrails", skill_type_slug: "guardrails", name: "Guardrails" },
  { slug: "role-format", skill_type_slug: "format", name: "Format", traits: { output_type: "json" } },
];
const CAPS = Array.from({ length: 11 }, (_, i) => `cap-${String(i + 1).padStart(2, "0")}`);
const AGENT_CONFIGS = [{ type: "role_prompt", text: "ROLE-A" }, { type: "guardrail", text: "GUARD-B" }];
const AGENT_ROW = { name: "Test Agent", role: "Tester", specialty: "dedupe", bio: "b" };

// The exact shape the agent-wide branch builds: every assigned capability's rows, in assignment
// order, each stamped with the capability that brought it in.
function buildFortyFour() {
  const rows = [];
  for (const cap of CAPS) {
    for (const [i, sk] of SKILLS.entries()) {
      rows.push({ ...sk, source_capability_slug: cap, level: 3, skill_level: null, is_required: false, display_order: i });
    }
  }
  return rows;
}

const occurrences = (sections, needle) =>
  sections.reduce((n, s) => n + (String(s.content || "").split(needle).length - 1), 0);

// ---------------------------------------------------------------------------------------------
// Arm (A) -- pure
// ---------------------------------------------------------------------------------------------
function armA_pure() {
  const results = [];

  assert.strictEqual(typeof dedupeSkillProfilesBySlug, "function",
    "api/prompt/db-assembly.js must export dedupeSkillProfilesBySlug");

  const rows = buildFortyFour();
  assert.strictEqual(rows.length, 44, `the measured input is 44 rows, built ${rows.length}`);

  const out = dedupeSkillProfilesBySlug(rows);
  assert.strictEqual(out.length, 4,
    `44 rows of 4 distinct slugs must dedupe to 4, got ${out.length}`);
  assert.deepStrictEqual(out.map(r => r.slug), SKILLS.map(s => s.slug),
    `the 4 kept rows must be the 4 distinct Skills IN THEIR ORIGINAL ORDER, got ${JSON.stringify(out.map(r => r.slug))}`);
  for (const r of out) {
    assert.strictEqual(r.source_capability_slug, CAPS[0],
      `the kept row must be the FIRST occurrence, which carries the FIRST capability (${CAPS[0]}); ${r.slug} carries ${r.source_capability_slug}`);
  }
  // Nothing entitled was dropped: every distinct slug that went in came out.
  assert.deepStrictEqual([...new Set(rows.map(r => r.slug))].sort(), out.map(r => r.slug).sort(),
    "every DISTINCT slug in the input must survive -- a dedupe that drops entitled content is the other failure");
  results.push("pure-44-rows-of-4-slugs-dedupe-to-4-in-order-keeping-the-first-capability");

  // A slug-less row is kept, never collapsed -- two of them stay two.
  const withBlanks = [{ slug: "a" }, { name: "no slug" }, { slug: "a" }, { name: "also no slug" }, { slug: null }];
  const blanks = dedupeSkillProfilesBySlug(withBlanks);
  assert.strictEqual(blanks.length, 4,
    `a row with no slug is not "the same Skill" and must be kept: expected 4 rows, got ${blanks.length}`);
  assert.deepStrictEqual(blanks.map(r => r.slug ?? r.name ?? null), ["a", "no slug", "also no slug", null],
    `the slug-less rows must survive in order, got ${JSON.stringify(blanks.map(r => r.slug ?? r.name ?? null))}`);
  results.push("pure-a-slug-less-row-is-kept-never-collapsed");

  // Dropping nothing returns the SAME reference -- this is what makes an already-correct bundle
  // byte-identical, so it is asserted by identity, not by value.
  const already = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
  assert.strictEqual(dedupeSkillProfilesBySlug(already), already,
    "a set with no repeat must come back as the SAME array reference, not a copy");
  assert.notStrictEqual(dedupeSkillProfilesBySlug(rows), rows,
    "a set WITH repeats must come back as a new array -- the input is never mutated");
  assert.strictEqual(rows.length, 44, "the input array must not be mutated in place");
  results.push("pure-same-reference-when-nothing-is-dropped-and-the-input-is-never-mutated");

  // The defensive shape mergePinnedSkills() already takes.
  assert.deepStrictEqual(dedupeSkillProfilesBySlug([]), [], "[] must give []");
  assert.deepStrictEqual(dedupeSkillProfilesBySlug(null), [], "null must give []");
  assert.deepStrictEqual(dedupeSkillProfilesBySlug(undefined), [], "undefined must give []");
  assert.deepStrictEqual(dedupeSkillProfilesBySlug({ slug: "a" }), [], "a non-array must give []");
  results.push("pure-a-non-array-is-the-empty-set");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (B) -- DISCRIMINATOR, with its control. buildSections(), no database, no model.
// ---------------------------------------------------------------------------------------------
function armB_discriminator() {
  const results = [];
  const rows = buildFortyFour();

  // CONTROL FIRST: the same input, NOT deduped -- the measured live numbers this ticket exists to
  // close. If this half ever reads 4/2/1 the fixture has drifted and the discriminator below is
  // grading nothing.
  const control = buildSections(rows, "test-agent", AGENT_CONFIGS, AGENT_ROW, null, null);
  assert.strictEqual(control.sections.length, 44,
    `CONTROL: 44 un-deduped rows must still emit 44 sections (one per row), got ${control.sections.length}`);
  assert.strictEqual(occurrences(control.sections, "ROLE-A"), 22,
    `CONTROL: the role prompt must render 22 times un-deduped (11 identity + 11 behavior), got ${occurrences(control.sections, "ROLE-A")}`);
  assert.strictEqual(occurrences(control.sections, "GUARD-B"), 11,
    `CONTROL: the guardrail must render 11 times un-deduped, got ${occurrences(control.sections, "GUARD-B")}`);
  results.push("control-un-deduped-is-44-sections-role-22-guardrail-11");

  // THE DISCRIMINATOR: the shipped path. A no-op T1 leaves this RED at sections=44.
  const deduped = buildSections(dedupeSkillProfilesBySlug(rows), "test-agent", AGENT_CONFIGS, AGENT_ROW, null, null);
  assert.strictEqual(deduped.sections.length, 4,
    `DEDUPED: 4 distinct Skills must emit exactly 4 sections, got ${deduped.sections.length} (slugs ${JSON.stringify(deduped.sections.map(s => s.slug))})`);
  assert.deepStrictEqual([...deduped.sections.map(s => s.slug)].sort(),
    ["behavior", "format", "guardrails", "identity"],
    `DEDUPED: one section per distinct Skill type, got ${JSON.stringify(deduped.sections.map(s => s.slug))}`);
  assert.strictEqual(occurrences(deduped.sections, "ROLE-A"), 2,
    `DEDUPED: the role prompt must render 2 times -- identity + behavior, the SEPARATE defect this ticket does not own -- got ${occurrences(deduped.sections, "ROLE-A")}`);
  assert.strictEqual(occurrences(deduped.sections, "GUARD-B"), 1,
    `DEDUPED: the guardrail must render exactly ONCE, got ${occurrences(deduped.sections, "GUARD-B")}`);
  results.push("discriminator-deduped-is-4-sections-role-2-guardrail-1");

  console.log(`  [AGT-429] seam proof (no database, no model): control 44/22/11 -> deduped ${deduped.sections.length}/${occurrences(deduped.sections, "ROLE-A")}/${occurrences(deduped.sections, "GUARD-B")}`);
  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (C) -- LIVE. Read-only.
// ---------------------------------------------------------------------------------------------
async function armC_live() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (a real agent-wide assemblePrompt() for nathan and jerry: no section slug twice, and deepbench-north-star still exactly once)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5.",
    );
    return results;
  }

  const report = [];
  for (const agentId of ["nathan", "jerry"]) {
    const pr = await assemblePrompt({ agent_id: agentId, tenant_id: "global", task_context: {} });
    const slugs = pr.sections.map(s => s.slug);
    const counts = {};
    for (const s of slugs) counts[s] = (counts[s] || 0) + 1;
    const repeated = Object.entries(counts).filter(([, n]) => n > 1);
    assert.deepStrictEqual(repeated, [],
      `${agentId}'s agent-wide bundle must carry no section slug twice -- this is the path that assembled 44 of 4 -- got ${JSON.stringify(repeated)}`);
    assert.strictEqual(counts["knowledge-deepbench-north-star"], 1,
      `${agentId} must still carry deepbench-north-star EXACTLY ONCE (AGT-434) -- a dedupe that dropped entitled content shows here -- got ${counts["knowledge-deepbench-north-star"] ?? 0}`);
    assert.ok(slugs.length > 1,
      `${agentId}'s bundle must still hold real sections after the dedupe, got ${slugs.length}`);
    report.push(`${agentId} ${slugs.length} sections / 0 repeats / north star ${counts["knowledge-deepbench-north-star"]}`);
  }
  console.log(`  [AGT-429] live: ${report.join(" | ")}`);
  results.push("live-nathan-and-jerry-assemble-every-section-once-with-the-north-star-intact");

  return results;
}

async function run() {
  const results = [];
  results.push(...armA_pure());
  results.push(...armB_discriminator());
  results.push(...(await armC_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
