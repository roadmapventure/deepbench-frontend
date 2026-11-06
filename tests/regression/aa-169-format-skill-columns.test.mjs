// DeepBench v7.0.965 | tests/regression/aa-169-format-skill-columns.test.mjs | AA-169 -- A FORMAT
// SKILL'S objective/method/output_desc/guardrails REACH THE MODEL, THROUGH ONE RENDER.
//
// Before this ship the `format` branch of buildSections() rendered only `traits.output_type` and
// `traits.section_structure`, and the same two lines were hand-copied at three more sites
// (execute.js's fetchFormatOverride(), api/plan.js twice). Every Format Skill row's `objective`,
// `method`, `output_desc` and `guardrails` columns -- all five live rows carry them -- were
// assembled into nothing: riley/html-display's rendered format section was 1,520 B with ZERO hits
// for its objective, and the two rows with no `section_structure` handed the model 17 characters.
// AA-169 gives the render ONE home, `renderFormatSection()` in db-assembly.js (pattern:14, 163),
// and the three other sites import it.
//
// FOUR ARMS, and what each is here to catch:
//
//   1. PURE (always runs): renderFormatSection() over three fixtures. FULL carries all four columns
//      and must render every line in order; BARE is FULL minus the four columns and must render
//      BYTE-IDENTICALLY to the pre-AA-169 traits-only build -- that equality is the whole backward
//      -compatibility claim of §4 call (3), and it is an assertion here, not a comment. NONE has
//      empty traits, so the default output type is the only line, and the default is a PARAMETER
//      (`"json"` at the three api/ sites, `"html"` in buildSections()), proven by calling it both
//      ways rather than trusting the signature.
//
//   2. DISCRIMINATOR (always runs): the real buildSections() over the same fixtures. Measured on
//      the unchanged tree at 2d8fd26, FULL's section content was exactly
//      "Output type: html\nStructure: titled-sections" -- so the `Objective:`/`Method:`/`Output:`/
//      `Must:`/`Must not:` assertions below are RED before this build and green after. The
//      formatContract is asserted alongside: the Haiku check still reads `format_contract.guardrails`
//      (§4 call (2)), so rendering the lists must not move them out of the contract.
//
//   3. SOURCE TEETH (always runs): the ONE-HOME claim, read off the repo. Both api/ callers must
//      import the helper by name from db-assembly.js, the hand-copied `Structure:` push must occur
//      ZERO times in all three api/ files, and plan.js's title line must still occur TWICE --
//      byte-identical at both sites is the kickoff's own stop line, and a render that swallowed it
//      would otherwise be invisible.
//
//   4. LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, DECLARED not-run otherwise): the end-to-end
//      business outcome (pattern:73) -- html-display-format's real `objective`/`method` values are
//      fetched from skill_profiles, then assemblePrompt() is run for riley/html-display and the
//      assembled `format` section must contain BOTH, as the row wrote them. This is the arm that
//      measured 0 hits before the ship.
//
// Invocation: node --env-file-if-exists=.env.local tests/regression/aa-169-format-skill-columns.test.mjs
// (STANDARDS.md Section 2 rule 5 for the credentialed form.)

import assert from "assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { buildSections, renderFormatSection, assemblePrompt } from "../../api/prompt/db-assembly.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8");

const API_FILES = ["api/prompt/db-assembly.js", "api/capabilities/execute.js", "api/plan.js"];

// The four columns AA-169 puts on the wire, and the two trait lines that were already there.
const FULL = {
  slug: "fx",
  skill_type_slug: "format",
  traits: { output_type: "html", section_structure: "titled-sections" },
  objective: "OBJ-aa169",
  method: "METH-aa169",
  output_desc: "DESC-aa169",
  guardrails: { must: ["m1", "m2"], must_not: ["n1"] },
};
// FULL minus the four columns: the pre-AA-169 world, and the row shape §4 call (3) protects.
const BARE = { slug: "fx", skill_type_slug: "format", traits: { output_type: "html", section_structure: "titled-sections" } };
const NONE = { slug: "fx", traits: {} };

const TRAITS_ONLY = "Output type: html\nStructure: titled-sections";
const FULL_RENDER = [
  "Output type: html",
  "Structure: titled-sections",
  "Objective: OBJ-aa169",
  "Method: METH-aa169",
  "Output: DESC-aa169",
  "Must: m1; m2",
  "Must not: n1",
].join("\n");

// ---------------------------------------------------------------------------
// Arm 1 -- PURE.
// ---------------------------------------------------------------------------
function theHelperRendersEveryColumnAndNothingElse() {
  assert.strictEqual(renderFormatSection(FULL), FULL_RENDER,
    `renderFormatSection() must render the two trait lines then objective/method/output_desc/guardrails, in that order; got:\n${JSON.stringify(renderFormatSection(FULL))}`);

  // THE BACKWARD-COMPATIBILITY CLAIM, as an assertion: a row that lacks the four columns renders
  // exactly what the pre-AA-169 traits-only build rendered, to the byte.
  assert.strictEqual(renderFormatSection(BARE), TRAITS_ONLY,
    "a Format Skill row without the four columns must render BYTE-IDENTICALLY to the pre-AA-169 traits-only build");
  assert.notStrictEqual(renderFormatSection(FULL), renderFormatSection(BARE),
    "control: the two fixtures must really render differently, or the equality above proves nothing");

  // The default output type is a PARAMETER, not a constant: buildSections() passes "html", the
  // three api/ sites pass "json". Both are exercised rather than read off the signature.
  assert.strictEqual(renderFormatSection(NONE), "Output type: html",
    "with empty traits and no columns, the defaulted output type is the only line");
  assert.strictEqual(renderFormatSection(NONE, "json"), "Output type: json",
    "the default output type must come from the caller's argument -- the api/ sites pass 'json'");
  assert.strictEqual(renderFormatSection(FULL, "json"), FULL_RENDER,
    "a row that declares its own output_type must ignore the caller's default");
}

// The guardrails branch is object-only on purpose: `guardrails` is also written as an array and as
// a string elsewhere in this schema (the `guardrails`-type branch handles those), and feeding one
// of those shapes through `.must` would render "undefined".
function theGuardrailsBranchIsObjectOnlyAndSkipsEmptyLists() {
  for (const shape of [["m1", "m2"], "a string", 7, null]) {
    const r = renderFormatSection({ ...BARE, guardrails: shape });
    assert.strictEqual(r, TRAITS_ONLY,
      `a non-object \`guardrails\` (${JSON.stringify(shape)}) must render no Must/Must not line at all; got ${JSON.stringify(r)}`);
  }
  assert.strictEqual(renderFormatSection({ ...BARE, guardrails: { must: [], must_not: [] } }), TRAITS_ONLY,
    "empty must/must_not lists render no line -- an empty `Must:` label is noise in the prompt");
  assert.strictEqual(renderFormatSection({ ...BARE, guardrails: { must_not: ["n1"] } }),
    `${TRAITS_ONLY}\nMust not: n1`,
    "must_not alone renders alone -- the two lists are independent");
}

// ---------------------------------------------------------------------------
// Arm 2 -- DISCRIMINATOR: the real assembler. RED at 2d8fd26.
// ---------------------------------------------------------------------------
function theAssembledFormatSectionCarriesTheColumns() {
  const r = buildSections([FULL], "test-agent", [], null, null);
  const section = r.sections.find(s => s.slug === "format");
  assert.ok(section, "buildSections() rendered no `format` section for a format-type Skill Profile");
  assert.strictEqual(r.sections[0].slug, "format",
    "the format section stays FIRST in the bundle (SKILL_ORDER format: 1) -- the stable cached head");

  // The pre-AA-169 content, still exactly where it was, still first.
  assert.ok(section.content.startsWith(TRAITS_ONLY),
    `the two trait lines must still open the section unchanged; got ${JSON.stringify(section.content.slice(0, 80))}`);

  // THE FOUR COLUMNS. Measured 0 hits for every one of these on the unchanged tree.
  for (const line of ["Objective: OBJ-aa169", "Method: METH-aa169", "Output: DESC-aa169", "Must: m1; m2", "Must not: n1"]) {
    assert.ok(section.content.includes(line),
      `the assembled format section does not carry "${line}" -- the column never reaches the model. Section:\n${section.content}`);
  }
  assert.strictEqual(section.content, FULL_RENDER,
    "buildSections() must render the format section through renderFormatSection() and add nothing of its own");

  // The contract is unmoved: the Haiku check reads `format_contract.guardrails`, and rendering the
  // lists into the prompt must not have taken them out of the contract (§4 call (2)).
  assert.strictEqual(r.formatContract.output_type, "html", "format_contract.output_type must still be read off traits");
  assert.deepStrictEqual(r.formatContract.guardrails, FULL.guardrails,
    "format_contract.guardrails must still carry the row's object -- request-receivable's check reads it there");

  // And the BARE row through the real assembler: byte-identical to the old build, end to end.
  const bare = buildSections([BARE], "test-agent", [], null, null).sections.find(s => s.slug === "format");
  assert.strictEqual(bare.content, TRAITS_ONLY,
    "through the real assembler, a row without the four columns must render byte-identically to the pre-AA-169 build");
}

// ---------------------------------------------------------------------------
// Arm 3 -- SOURCE TEETH: one home, no hand copies, the title line intact.
// ---------------------------------------------------------------------------
function everyCallerImportsTheOneHomeAndNoHandCopySurvives() {
  for (const rel of ["api/capabilities/execute.js", "api/plan.js"]) {
    const importLine = read(rel)
      .split("\n")
      .find(l => /^import\s*\{/.test(l.trim()) && l.includes("db-assembly.js") && l.includes("renderFormatSection"));
    assert.ok(importLine,
      `${rel} does not import renderFormatSection from db-assembly.js -- it is either still hand-copying the render or reaching for it another way`);
  }

  // ZERO hand copies of the pushed `Structure:` line anywhere in api/.
  for (const rel of API_FILES) {
    const hits = read(rel).split("formatParts.push(`Structure:").length - 1;
    assert.strictEqual(hits, 0,
      `${rel} still holds ${hits} hand-copied \`formatParts.push(\`Structure:\` line(s) -- the render has more than one home`);
  }

  // plan.js's title line: TWO sites, byte-identical, both surviving the rewrite. The kickoff's own
  // stop line is that this string cannot change.
  const TITLE = 'Also return a "title" field (max 8 words)';
  const titleHits = read("api/plan.js").split(TITLE).length - 1;
  assert.strictEqual(titleHits, 2,
    `api/plan.js must still carry the title instruction at BOTH format-override sites; found ${titleHits}`);
}

// ---------------------------------------------------------------------------
// Arm 4 -- LIVE: the real row's prose reaches the real assembled prompt.
// ---------------------------------------------------------------------------
async function rest(url, key, q) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`REST ${q} -> HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  return res.json();
}

async function rileysLiveFormatSectionCarriesItsOwnObjectiveAndMethod(url, key) {
  const [row] = await rest(url, key, "skill_profiles?slug=eq.html-display-format&select=objective,method");
  assert.ok(row, "skill_profiles has no `html-display-format` row -- the live arm has nothing to measure");
  assert.ok(row.objective && row.method,
    `html-display-format carries no objective/method prose to assemble: ${JSON.stringify(row)}`);

  // DEVIATION from the kickoff's literal call: assemblePrompt() throws `tenant_id required` with
  // only { agent_id, capability_slug }, so the tenant every agent_configs row actually carries is
  // passed -- the literal string "global" (scripts/agent-prompt.js's DEFAULT_TENANT, and the same
  // value nine sibling regression tests use). The assertions are the kickoff's, unchanged.
  const prompt = await assemblePrompt({ agent_id: "riley", capability_slug: "html-display", tenant_id: "global", task_context: {} });
  const section = (prompt.sections || []).find(s => s.slug === "format");
  assert.ok(section, "riley/html-display assembled no `format` section");

  assert.ok(section.content.includes(`Objective: ${row.objective}`),
    `riley's assembled format section does not carry its row's objective -- this is the 0-hit measurement AA-169 fixes. Section:\n${section.content}`);
  assert.ok(section.content.includes(`Method: ${row.method}`),
    `riley's assembled format section does not carry its row's method. Section:\n${section.content}`);
  return section.content.length;
}

export default async function run(ctx = {}) {
  const results = [];

  theHelperRendersEveryColumnAndNothingElse();
  theGuardrailsBranchIsObjectOnlyAndSkipsEmptyLists();
  results.push("pure-full-bare-none-defaults-and-guardrail-shapes");

  theAssembledFormatSectionCarriesTheColumns();
  results.push("discriminator-buildSections-renders-four-columns-contract-unmoved");

  everyCallerImportsTheOneHomeAndNoHandCopySurvives();
  results.push("teeth-two-imports-zero-hand-copies-title-line-twice");

  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (html-display-format's real objective/method, fetched from skill_profiles, must appear in " +
      "riley/html-display's assembled `format` section)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent; run with --env-file-if-exists=.env.local or export the two " +
      "names read from public.runner_secrets. Measured at this ship (2026-11-06, v7.0.965): 0 hits for riley's " +
      "objective before, both lines present after.",
    );
  } else {
    const chars = await rileysLiveFormatSectionCarriesItsOwnObjectiveAndMethod(url, key);
    results.push(`live-riley-html-display-format-section-${chars}-chars-carries-objective-and-method`);
  }

  return results;
}

selfRun(import.meta.url, run);
