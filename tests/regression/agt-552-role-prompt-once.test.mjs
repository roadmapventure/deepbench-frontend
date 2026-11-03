// DeepBench v7.0.944 | tests/regression/agt-552-role-prompt-once.test.mjs | AGT-552 -- a role prompt renders ONCE per bundle
//
// FEATURE: AGT-552 -- a role prompt gets ONE home in an assembled bundle. Measured live this cycle
// BEFORE the build, through the real assemblePrompt(): api/prompt/db-assembly.js's identity branch
// pushed every `agent_configs` row of `type === 'role_prompt'`, and its behavior branch pushed the
// same rows again -- and because the loop runs a branch once PER Skill of its type, the live count
// was identity Skills + behavior Skills, never a flat 2. `michelle` (two behavior Skills, no
// identity Skill) rendered hers TWICE, in two separate behavior sections. That violates
// `.claude/rules/agent-data-visibility.md` ("never render a role prompt, guardrail or taught item
// into more than one assembled section") and docs/ARCHITECTURE.md §19w / §19b.
//
// THE RULE, decided from `skill_type_slug` ALONE -- never an agent id and never a capability slug
// (`.claude/rules/capabilities-are-data.md`): the home is `identity` when the bundle holds an
// identity Skill, else the FIRST `behavior` Skill, and it is claimed ONCE per bundle.
//
// THREE ARMS:
//   (A) PURE -- rolePromptHome() itself, the rule apart from the assembler: any identity row in the
//       set gives `identity` (not only a leading one), a behavior-only set gives `behavior`, and so
//       do the defensive shapes [] and null. No fetch, no env, no database.
//   (B) DISCRIMINATOR -- buildSections() over the five bundle shapes that distinguish the rule,
//       asserting both directions: each role prompt occurs exactly ONCE across the bundle AND it
//       occurs in the section that is its home and NOWHERE else, with `GUARD-B` still rendering
//       once in every fixture (a claim that ate entitled content would show there). A no-op on
//       db-assembly.js leaves this arm RED: the unchanged tree gives MULTI 3, SINGLE 2 and
//       BEHAVIOR-ONLY 2 occurrences of each role prompt, so the arm cannot pass against an
//       unchanged assembler.
//   (C) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the shipped state through a REAL
//       assemblePrompt() for `michelle` (the measured 2x case) and `brent` (identity Skill, no
//       behavior Skill -- the case that was already 1 and must stay 1). Every one of that agent's
//       own `agent_configs` role_prompt rows is read independently with the service key and must
//       occur exactly ONCE across the assembled sections, and the bundle must still hold real
//       sections. Read-only -- nothing in this file writes to Supabase (pattern:76).
//
// WHAT THIS FILE DOES NOT CLAIM. The SKILL-LESS fixture renders ZERO role prompts, and that is
// pinned as today's true value rather than fixed here: six of the 42 agents hold no identity and no
// behavior Skill at all, so they have no section to be a role prompt's home. That is the scaffold
// path (§19w R1, open) and `api/_lib/handlers/agent-bundle.js` sends those agents their role prompts
// as primitives by design -- a SEPARATE row, outside this ticket's 3-file scope.
//
// NO MODEL CALL, NO SPEND.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

import { assemblePrompt, buildSections, rolePromptHome } from "../../api/prompt/db-assembly.js";

const CAP = "cap-01";

const SK = {
  identity:   { slug: "role-identity",   skill_type_slug: "identity",   name: "Role",         objective: "OBJ", method: "METH" },
  behavior1:  { slug: "role-behavior",   skill_type_slug: "behavior",   name: "Behavior",     traits: { reasoning_style: "careful" } },
  behavior2:  { slug: "role-behavior-2", skill_type_slug: "behavior",   name: "Behavior Two", traits: { writing_style: "plain" } },
  guardrails: { slug: "role-guardrails", skill_type_slug: "guardrails", name: "Guardrails" },
  format:     { slug: "role-format",     skill_type_slug: "format",     name: "Format",       traits: { output_type: "json" } },
};

const ROLE_PROMPTS = ["RP-1", "RP-2"];
const AGENT_CONFIGS = [
  { type: "role_prompt", text: "RP-1" },
  { type: "role_prompt", text: "RP-2" },
  { type: "guardrail", text: "GUARD-B" },
];
const AGENT_ROW = { name: "Test Agent", role: "Tester", specialty: "role prompt home", bio: "b" };

// The row shape agt-429-bundle-section-dedupe.test.mjs's buildFortyFour() builds, at ONE capability:
// this ticket is about repeats ACROSS BRANCHES, so the per-capability repeat AGT-429 closed is kept
// out of the fixture deliberately.
function rows(...keys) {
  return keys.map((k, i) => ({
    ...SK[k], source_capability_slug: CAP, level: 3, skill_level: null, is_required: false, display_order: i,
  }));
}

const occurrences = (sections, needle) =>
  sections.reduce((n, s) => n + (String(s.content || "").split(needle).length - 1), 0);
const inSection = (section, needle) =>
  String(section?.content || "").split(needle).length - 1;

// ---------------------------------------------------------------------------------------------
// Arm (A) -- pure. The rule, graded apart from the assembler.
// ---------------------------------------------------------------------------------------------
function armA_pure() {
  const results = [];

  assert.strictEqual(typeof rolePromptHome, "function",
    "api/prompt/db-assembly.js must export rolePromptHome");

  assert.strictEqual(rolePromptHome(rows("identity", "behavior1", "behavior2", "guardrails", "format")), "identity",
    "a bundle holding an identity Skill must home the role prompt in `identity`");
  assert.strictEqual(rolePromptHome(rows("behavior1", "behavior2", "identity")), "identity",
    "the identity Skill is found ANYWHERE in the set, not only in the first position -- assembly order is display_order, not a guarantee");
  assert.strictEqual(rolePromptHome(rows("identity")), "identity",
    "an identity Skill alone must still home the role prompt in `identity`");
  results.push("pure-any-identity-skill-anywhere-homes-the-role-prompt-in-identity");

  assert.strictEqual(rolePromptHome(rows("behavior1", "behavior2", "guardrails")), "behavior",
    "a bundle with NO identity Skill must fall back to `behavior`");
  assert.strictEqual(rolePromptHome(rows("guardrails", "format")), "behavior",
    "a bundle with neither an identity nor a behavior Skill still reports `behavior` -- the home simply never renders (see the header)");
  results.push("pure-behavior-only-falls-back-to-behavior");

  assert.strictEqual(rolePromptHome([]), "behavior", "[] must give `behavior`");
  assert.strictEqual(rolePromptHome(null), "behavior", "null must give `behavior`");
  assert.strictEqual(rolePromptHome(undefined), "behavior", "undefined must give `behavior`");
  assert.strictEqual(rolePromptHome([null, undefined, {}]), "behavior",
    "a set of empty rows must not throw -- the row is read defensively, the same shape mergePinnedSkills() already takes");
  results.push("pure-the-defensive-shapes-never-throw-and-give-behavior");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (B) -- DISCRIMINATOR. buildSections(), no database, no model.
// ---------------------------------------------------------------------------------------------
function armB_discriminator() {
  const results = [];
  const build = keys => buildSections(rows(...keys), "test-agent", AGENT_CONFIGS, AGENT_ROW, null, null);
  const proof = [];

  // Every fixture asserts the same two directions: exactly ONE occurrence of each role prompt
  // across the whole bundle, and `GUARD-B` still exactly once (nothing entitled was dropped).
  const check = (label, out, expectedSections, expectedRoleCount, homeSlug, homeIndex) => {
    assert.strictEqual(out.sections.length, expectedSections,
      `${label}: expected ${expectedSections} sections, got ${out.sections.length} (slugs ${JSON.stringify(out.sections.map(s => s.slug))})`);
    for (const rp of ROLE_PROMPTS) {
      assert.strictEqual(occurrences(out.sections, rp), expectedRoleCount,
        `${label}: ${rp} must occur exactly ${expectedRoleCount} time(s) across the bundle, got ${occurrences(out.sections, rp)}`);
    }
    if (homeSlug) {
      const homes = out.sections.filter(s => s.slug === homeSlug);
      for (const rp of ROLE_PROMPTS) {
        assert.strictEqual(inSection(homes[homeIndex], rp), 1,
          `${label}: ${rp} must render in the ${homeSlug} section at index ${homeIndex} -- its ONE home -- got ${inSection(homes[homeIndex], rp)}`);
      }
      // And nowhere else, section by section -- a total of 1 with the wrong home would pass the
      // count above and still be the defect.
      for (const [i, s] of out.sections.entries()) {
        const isHome = s === homes[homeIndex];
        for (const rp of ROLE_PROMPTS) {
          if (!isHome) {
            assert.strictEqual(inSection(s, rp), 0,
              `${label}: ${rp} must NOT render in section ${i} (${s.slug}) -- only its home carries it -- got ${inSection(s, rp)}`);
          }
        }
      }
    }
    assert.strictEqual(occurrences(out.sections, "GUARD-B"), 1,
      `${label}: the guardrail must still render exactly ONCE -- a claim that ate entitled content shows here -- got ${occurrences(out.sections, "GUARD-B")}`);
    proof.push(`${label} ${out.sections.length}s/${occurrences(out.sections, ROLE_PROMPTS[0])}+${occurrences(out.sections, ROLE_PROMPTS[1])}`);
  };

  // MULTI -- identity + TWO behavior Skills + guardrails + format. The unchanged tree gives 3.
  const multi = build(["identity", "behavior1", "behavior2", "guardrails", "format"]);
  assert.strictEqual(multi.sections.filter(s => s.slug === "behavior").length, 2,
    "MULTI: two behavior Skills must still emit TWO behavior sections -- this ticket moves the role prompt, it never drops a section");
  check("MULTI", multi, 5, 1, "identity", 0);
  results.push("discriminator-multi-5-sections-each-role-prompt-once-in-identity-and-zero-in-either-behavior");

  // SINGLE -- identity + one behavior + guardrails + format. The unchanged tree gives 2.
  check("SINGLE", build(["identity", "behavior1", "guardrails", "format"]), 4, 1, "identity", 0);
  results.push("discriminator-single-4-sections-each-role-prompt-once-in-identity");

  // BEHAVIOR-ONLY -- michelle's live shape: two behavior Skills, NO identity Skill. The home is the
  // FIRST behavior section and the second must be empty of it. The unchanged tree gives 2.
  const behaviorOnly = build(["behavior1", "behavior2", "guardrails"]);
  assert.strictEqual(behaviorOnly.sections.filter(s => s.slug === "behavior").length, 2,
    "BEHAVIOR-ONLY: the fixture must hold two behavior sections, or it is not grading the FIRST-behavior rule");
  check("BEHAVIOR-ONLY", behaviorOnly, 3, 1, "behavior", 0);
  results.push("discriminator-behavior-only-3-sections-each-role-prompt-once-in-the-FIRST-behavior-section-zero-in-the-second");

  // IDENTITY-ONLY -- brent's live shape: identity, no behavior Skill. Already 1 before this ticket;
  // it must STAY 1, which is the no-regression direction.
  check("IDENTITY-ONLY", build(["identity", "guardrails"]), 2, 1, "identity", 0);
  results.push("discriminator-identity-only-2-sections-each-role-prompt-once-still");

  // SKILL-LESS -- guardrails only. ZERO role prompts: today's true value, pinned not fixed (header).
  check("SKILL-LESS", build(["guardrails"]), 1, 0, null, 0);
  results.push("discriminator-skill-less-1-section-zero-role-prompts-todays-pinned-value");

  console.log(`  [AGT-552] seam proof (no database, no model): ${proof.join(" | ")}`);
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
      "the live arm (a real assemblePrompt() for michelle and brent: every one of the agent's own agent_configs role prompts occurs exactly once across the assembled sections)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5.",
    );
    return results;
  }

  const base = String(url).replace(/\/+$/, "");
  const hdr = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const res = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!res.ok) assert.fail(`Supabase read failed (${q.split("?")[0]}): HTTP ${res.status} ${await res.text()}`);
    return res.json();
  };

  const report = [];
  for (const agentId of ["michelle", "brent"]) {
    // The agent's OWN rows, read independently of the assembler -- a test grades the change, never
    // frozen numbers (pattern:162).
    const configs = await get(`agent_configs?agent_id=eq.${agentId}&tenant_id=eq.global&type=eq.role_prompt&select=text`);
    const texts = configs.map(c => c.text).filter(t => t && String(t).trim());
    assert.ok(texts.length > 0,
      `${agentId} holds no agent_configs role_prompt rows -- this arm would be vacuous; re-point it at an agent that carries one`);

    const pr = await assemblePrompt({ agent_id: agentId, tenant_id: "global", task_context: {} });
    assert.ok(pr.sections.length > 1,
      `${agentId}'s bundle must still hold real sections after the claim, got ${pr.sections.length}`);

    for (const text of texts) {
      const n = occurrences(pr.sections, text);
      assert.strictEqual(n, 1,
        `${agentId}'s role prompt must occur EXACTLY ONCE across the assembled sections -- michelle rendered hers twice before AGT-552, and 0 would mean the claim dropped entitled content -- got ${n}`);
    }
    report.push(`${agentId} ${pr.sections.length} sections / ${texts.length} role prompt(s) / 1 occurrence each`);
  }
  console.log(`  [AGT-552] live: ${report.join(" | ")}`);
  results.push("live-michelle-and-brent-each-render-every-role-prompt-exactly-once");

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
