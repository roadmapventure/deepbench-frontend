// DeepBench v7.0.1002 | tests/regression/agt-636-behavior-objective-method.test.mjs | AGT-636 -- a behavior Skill renders its own objective and method
//
// FEATURE: AGT-636 -- a behavior Skill Profile's `objective` and `method` reach the assembled
// prompt, exactly as the identity branch (api/prompt/db-assembly.js:336-337) and the intent branch
// (351-352) have always rendered theirs. Measured live BEFORE the build on an unedited tree: the
// behavior branch read `traits.reasoning_style` and `traits.writing_style` and NOTHING else, so 5
// of the 25 live behavior rows held objective/method text that no prompt carried -- `au-behavior`
// (133 B objective + 11,796 B method) is the ONE home of the Auditor's checklist and appeared in 0
// of its 8 prompts. That is `.claude/rules/agent-data-visibility.md`'s "never add a column to
// skill_profiles ... without the assembler branch that reads it", read from the other end: a
// column every sibling branch reads, that this one drops on the floor.
//
// A GENERIC FIELD READ, never a conditional (`.claude/rules/capabilities-are-data.md`): the fix is
// `if (sp.objective) ... if (sp.method) ...` on whatever row the loop is holding -- no agent id, no
// capability slug, no skill-profile slug anywhere in the branch. A row with neither field set is
// byte-identical to the pre-change assembly, which arm B pins.
//
// ORDER IS PART OF THE CONTRACT (D1): role prompts, then objective, then method, then the trait
// lines. Asserted with `deepStrictEqual` on the whole behavior-section list rather than with
// substring presence, because a test that only asks "is the text in there somewhere" cannot tell a
// correct render from one that buried the Auditor's checklist above its own role prompt.
//
// TWO ARMS, no database, no model call, no spend:
//   (A) DISCRIMINATOR -- RED on the unchanged assembler by construction. FULL grades all four
//       parts of one behavior section in order; TWO grades the multi-Skill shape, where the role
//       prompt is claimed by the FIRST behavior section only (AGT-552) while the SECOND still
//       renders its own method -- and asserts each string occurs exactly ONCE across the whole
//       bundle, so a fix that rendered the text twice is red here too, not silently green.
//   (B) NO-REGRESSION -- green on BOTH trees. A traits-only behavior Skill is unchanged, and a
//       behavior Skill whose objective is "" and method is null still yields a null section (the
//       falsy guards, not a `!== undefined` test) with the role prompt homed on the identity Skill.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";

import { buildSections } from "../../api/prompt/db-assembly.js";

// `name` is defaulted from the slug and then overridable, so a row never has to carry a label just
// to be assembled -- buildLabel() reads it and nothing here grades the label.
const build = (...rows) =>
  buildSections(
    rows.map(r => ({ name: r.slug, ...r })),
    "test-agent",
    [{ type: "role_prompt", text: "RP-1" }],
    null,
    null,
    null,
  ).sections;

const beh = secs => secs.filter(s => s.slug === "behavior").map(s => s.content);
const occ = (secs, t) => secs.reduce((n, s) => n + (String(s.content || "").split(t).length - 1), 0);

const ID = { slug: "x-identity", skill_type_slug: "identity", objective: "OBJ-I", method: "METH-I" };
const B = r => ({ ...r, skill_type_slug: "behavior" });

// ---------------------------------------------------------------------------------------------
// Arm (A) -- DISCRIMINATOR. Red on the unchanged tree.
// ---------------------------------------------------------------------------------------------
function armA_discriminator() {
  const results = [];

  // FULL -- one behavior Skill carrying every part: the claimed role prompt, objective, method and
  // both trait lines, in D1's order. The unchanged tree renders only "RP-1\nReasoning style:
  // careful\nWriting style: plain" here, which is the measured discriminator.
  const full = build(B({
    slug: "b-full",
    objective: "OBJ-B",
    method: "METH-B",
    traits: { reasoning_style: "careful", writing_style: "plain" },
  }));
  assert.deepStrictEqual(
    beh(full),
    ["RP-1\nOBJ-B\nMETH-B\nReasoning style: careful\nWriting style: plain"],
    "FULL: the behavior section must render role prompts, then objective, then method, then the trait lines (D1)",
  );
  results.push("discriminator-full-objective-and-method-render-between-the-role-prompt-and-the-trait-lines");

  // TWO -- the multi-behavior shape. The role prompt has ONE home (AGT-552: the first behavior
  // section), and the second behavior Skill must still render its own method there.
  const two = build(
    B({ slug: "b-a", objective: "OBJ-A", method: "METH-A" }),
    B({ slug: "b-b", method: "METH-B2" }),
  );
  assert.deepStrictEqual(
    beh(two),
    ["RP-1\nOBJ-A\nMETH-A", "METH-B2"],
    "TWO: the first behavior section carries the claimed role prompt plus its own objective and method; the second carries its own method alone",
  );
  for (const t of ["RP-1", "OBJ-A", "METH-A", "METH-B2"]) {
    assert.strictEqual(
      occ(two, t),
      1,
      `TWO: ${t} must occur EXACTLY once across the bundle -- 0 is the dropped-content defect and 2 is a duplicate render (agent-data-visibility.md) -- got ${occ(two, t)}`,
    );
  }
  results.push("discriminator-two-behavior-skills-each-render-their-own-fields-once-with-the-role-prompt-homed-on-the-first");

  console.log(`  [AGT-636] seam proof (no database, no model): FULL ${JSON.stringify(beh(full))} | TWO ${JSON.stringify(beh(two))}`);
  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (B) -- NO REGRESSION. Green on both trees.
// ---------------------------------------------------------------------------------------------
function armB_unchanged() {
  const results = [];

  assert.deepStrictEqual(
    beh(build(B({ slug: "b-traits", traits: { reasoning_style: "careful" } }))),
    ["RP-1\nReasoning style: careful"],
    "TRAITS-ONLY: a behavior Skill with neither objective nor method must assemble byte-identically to the pre-change tree",
  );
  results.push("no-regression-a-traits-only-behavior-skill-is-byte-identical");

  assert.deepStrictEqual(
    beh(build(ID, B({ slug: "b-empty", objective: "", method: null }))),
    [null],
    'EMPTY: objective "" and method null are falsy and must contribute nothing -- the section stays null, and the role prompt is homed on the identity Skill (AGT-552)',
  );
  results.push("no-regression-empty-string-and-null-contribute-nothing-and-the-section-stays-null");

  return results;
}

async function run() {
  const results = [];
  results.push(...armA_discriminator());
  results.push(...armB_unchanged());
  return results;
}

selfRun(import.meta.url, run);
export default run;
