#!/usr/bin/env node
// DeepBench v7.0.265 | tests/regression/SE-04-format-skill-exclusivity.js | SE-04 -- the guard on
// the Format Skill exclusivity audit (scripts/check-format-skill-exclusivity.js).
//
// WHAT THIS TEST IS FOR, and why the obvious version of it is worthless. The obvious test runs the
// checker and asserts an exit code. That is worthless twice over here: it needs live credentials
// the suite does not always carry, and it passes on a checker whose join matches NOTHING -- which
// is exactly the failure mode of a data audit, and exactly SES-199's rubber stamp (a tripwire that
// exit(0)'d on every path). A boundary check has to be shown to FIRE before its silence means
// anything. So the assertions come in pairs: the matcher finds each planted violation shape, AND it
// stays quiet on a clean fixture.
//
// IT IMPORTS THE REAL FUNCTIONS AND NEVER RE-IMPLEMENTS THEM. That is SES-45's lesson -- "a test
// that recreates the logic under test instead of importing it passes against the bug it guards" --
// and SES-45 is itself an open member of this same Selfbuild M3 epic, so writing this file the
// other way would ship the exact defect a sibling ticket is open against. parseRuleSurfaces(),
// resolveDisplayAgents() and findViolations() all come from the shipped script.
//
// THE ALLOWLIST DERIVATION IS ASSERTED IN BOTH DIRECTIONS, which is the half most likely to be
// dropped. A parser that returned [] would make EVERY format profile look like a violation; one
// that matched too loosely would make none of them look like one. Clause 1 pins what it returns on
// the real document, clause 2 proves it THROWS rather than degrading when the rule is reworded, and
// clause 3 pins the roster resolution. Without clause 2 the parse could silently go vacuous and the
// suite would stay green.
//
// DECLARED NOT RUN: the live-data half. This audit's real subject is three Supabase tables, and a
// credentialed assertion here would either be skipped when creds are absent -- which reads as a
// pass (SES-180, SES-61, SE-03's own remainder) -- or make the suite depend on the state of the
// live board, so that fixing a violation would change a regression result. The live run is a QA
// step of the shipping cycle and is named as this test's remainder rather than half-built.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  parseRuleSurfaces,
  resolveDisplayAgents,
  findViolations,
  RULE_DOC,
  RULE_NUMBER,
} from "../../scripts/check-format-skill-exclusivity.js";
import { AGENTS } from "../../src/data/agents.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Two ways rule 14 can be reworded past recognition. Both must THROW, and they exercise different
// branches: the first still talks about Format Skills but has lost the list the allowlist is
// derived from; the second is no longer about Format Skills at all.
const LIST_DROPPED_DOC = [
  "## 13. Session Seam Line Rules [LOCKED]",
  "",
  "1. Never hardcode design tokens",
  "14. **Content specialists never own Format Skills.** Ownership belongs to the editors. See Section 19.",
  "",
  "## 14. Agent Configuration Model [LOCKED]",
].join("\n");

const REPURPOSED_DOC = [
  "## 13. Session Seam Line Rules [LOCKED]",
  "",
  "1. Never hardcode design tokens",
  "14. **Formatting is handled somewhere else now.** See Section 19.",
  "",
  "## 14. Agent Configuration Model [LOCKED]",
].join("\n");

export default async function run() {
  // --- 1. THE PARSE IS NON-VACUOUS on the real document -----------------------------------------
  // Pinned against ARCHITECTURE.md itself, not a fixture: if the rule is renumbered, moved or
  // rewritten, this fails LOUDLY here rather than the audit quietly deriving an empty allowlist.

  const realDoc = fs.readFileSync(path.join(REPO, RULE_DOC), "utf8");
  const surfaces = parseRuleSurfaces(realDoc);

  assert.deepStrictEqual(
    surfaces,
    ["Screen Controls", "HTML Display", "PDF Assembly"],
    `${RULE_DOC} rule ${RULE_NUMBER} must name exactly the three display surfaces the audit derives ` +
      `its allowlist from; got ${JSON.stringify(surfaces)}`
  );

  // --- 2. THE PARSE THROWS RATHER THAN DEGRADING ------------------------------------------------
  // This is the assertion that makes clause 1 mean something. A parser that returned [] on a
  // reworded rule would produce an empty allowlist -- under which every Format Skill is a violation
  // and the audit is noise -- while still "passing" clause 1 today.

  assert.throws(
    () => parseRuleSurfaces(LIST_DROPPED_DOC),
    /display\/editor agents/i,
    "a rule 14 that still names Format Skills but has lost its display/editor list must throw, " +
      "never return an empty allowlist"
  );
  assert.throws(
    () => parseRuleSurfaces(REPURPOSED_DOC),
    /no longer mentions Format Skills/i,
    "a §13 item 14 that is no longer about Format Skills must throw -- the audit must not derive an " +
      "allowlist from whatever sentence happens to be numbered 14"
  );
  assert.throws(
    () => parseRuleSurfaces("## 99. Something Else\n\n1. nothing here\n"),
    /not found/i,
    "a document with no §13 must throw -- the audit must not run against a section it cannot find"
  );
  assert.throws(
    () => parseRuleSurfaces(""),
    /empty or unreadable/i,
    "an empty document must throw, never yield an allowlist"
  );

  // --- 3. RESOLUTION against the real roster ----------------------------------------------------

  const { allowed, resolution } = resolveDisplayAgents(surfaces, AGENTS);
  assert.deepStrictEqual(
    [...allowed].sort(),
    ["alex", "claire", "riley"],
    `${RULE_DOC} rule ${RULE_NUMBER}'s three surfaces must resolve, through src/data/agents.js, to ` +
      `exactly the three editor agents; got ${JSON.stringify([...allowed].sort())}`
  );
  assert.strictEqual(resolution.length, 3, "every named surface must resolve to exactly one agent");

  assert.throws(
    () => resolveDisplayAgents(["Holographic Display"], AGENTS),
    /the rule and the roster disagree/i,
    "a surface with no matching roster role must throw -- the rule and the roster disagreeing is a " +
      "real inconsistency, not something to default past"
  );
  assert.throws(
    () => resolveDisplayAgents(surfaces, []),
    /roster is empty/i,
    "an empty roster must throw, never resolve to an empty allowlist"
  );

  // --- 4. THE NEGATIVE CONTROL: the matcher fires on each violation shape ------------------------
  // Each of these is a real way rule 14 has been or could be broken. A findViolations() that
  // returned [] unconditionally fails here, which is the assertion that makes clause 5's silence
  // meaningful. The first shape is the one live on the board at ship: SE-04's own finding.

  const formatProfiles = [
    { slug: "screen-controls-format", skill_type_slug: "format" },
    { slug: "analysis-report", skill_type_slug: "format" },
    { slug: "data-analysis", skill_type_slug: "intent" }, // NOT a format skill -- rule 14 is silent
  ];

  const shapes = [
    {
      what: "a content specialist owns a Format Skill (the live SE-04 finding)",
      links: [{ capability_slug: "data-analyst", skill_profile_slug: "analysis-report" }],
      assignments: [{ agent_id: "bob", capability_slug: "data-analyst" }],
      expect: [{ skillSlug: "analysis-report", capabilitySlug: "data-analyst", agentId: "bob" }],
    },
    {
      what: "a SECOND capability reaches the same Format Skill and lands on a content specialist",
      links: [
        { capability_slug: "screen-controls", skill_profile_slug: "screen-controls-format" },
        { capability_slug: "market-research", skill_profile_slug: "screen-controls-format" },
      ],
      assignments: [
        { agent_id: "alex", capability_slug: "screen-controls" },
        { agent_id: "marcus", capability_slug: "market-research" },
      ],
      expect: [
        { skillSlug: "screen-controls-format", capabilitySlug: "market-research", agentId: "marcus" },
      ],
    },
    {
      what: "TWO agents share one capability that carries a Format Skill -- both are reported",
      links: [{ capability_slug: "data-analyst", skill_profile_slug: "analysis-report" }],
      assignments: [
        { agent_id: "bob", capability_slug: "data-analyst" },
        { agent_id: "nadia", capability_slug: "data-analyst" },
      ],
      expect: [
        { skillSlug: "analysis-report", capabilitySlug: "data-analyst", agentId: "bob" },
        { skillSlug: "analysis-report", capabilitySlug: "data-analyst", agentId: "nadia" },
      ],
    },
  ];

  for (const shape of shapes) {
    const got = findViolations({
      formatProfiles,
      capabilitySkillProfiles: shape.links,
      assignments: shape.assignments,
      allowed,
    });
    assert.deepStrictEqual(
      got.violations,
      shape.expect,
      `the audit must fire on: ${shape.what}`
    );
  }

  // --- 5. QUIET ON A CLEAN BOARD, and DISCRIMINATING about what a violation is -------------------
  // The pair to clause 4. Same profiles, same shape of data -- only the owning agent differs.

  const cleanLinks = [
    { capability_slug: "screen-controls", skill_profile_slug: "screen-controls-format" },
    { capability_slug: "data-analyst", skill_profile_slug: "analysis-report" },
    { capability_slug: "data-analyst", skill_profile_slug: "data-analysis" },
  ];
  const cleanAssignments = [
    { agent_id: "alex", capability_slug: "screen-controls" },
    { agent_id: "alex", capability_slug: "data-analyst" },
  ];
  const clean = findViolations({
    formatProfiles,
    capabilitySkillProfiles: cleanLinks,
    assignments: cleanAssignments,
    allowed,
  });
  assert.deepStrictEqual(
    clean.violations,
    [],
    "a board whose Format Skills are all owned by display agents must produce zero violations"
  );
  assert.strictEqual(
    clean.examined,
    2,
    "only the two FORMAT links may be examined -- an intent profile on the same capability is not " +
      "rule 14's business, and a check that cannot tell them apart flags the whole roster"
  );

  // One variable, same fixture: swap the owner back to a content specialist and it fires again.
  const dirty = findViolations({
    formatProfiles,
    capabilitySkillProfiles: cleanLinks,
    assignments: [
      { agent_id: "alex", capability_slug: "screen-controls" },
      { agent_id: "bob", capability_slug: "data-analyst" },
    ],
    allowed,
  });
  assert.strictEqual(
    dirty.violations.length,
    1,
    "the ONLY difference from the clean fixture is who owns data-analyst -- that alone must decide it"
  );

  // A non-format profile held by a content specialist is never a violation.
  const intentOnly = findViolations({
    formatProfiles,
    capabilitySkillProfiles: [{ capability_slug: "data-analyst", skill_profile_slug: "data-analysis" }],
    assignments: [{ agent_id: "bob", capability_slug: "data-analyst" }],
    allowed,
  });
  assert.deepStrictEqual(
    intentOnly.violations,
    [],
    "an Intent Skill owned by a content specialist is the system working, never a rule 14 violation"
  );

  // --- 6. THE OBSERVATIONS are reported, and are NOT violations ----------------------------------

  const observed = findViolations({
    formatProfiles,
    capabilitySkillProfiles: [{ capability_slug: "pdf-assembly", skill_profile_slug: "analysis-report" }],
    assignments: [], // nobody assigned to pdf-assembly in this fixture
    allowed,
  });
  assert.deepStrictEqual(observed.violations, [], "an unowned capability is not yet a violation");
  assert.deepStrictEqual(
    observed.unassignedCapabilities,
    [{ skillSlug: "analysis-report", capabilitySlug: "pdf-assembly" }],
    "a capability carrying a Format Skill with no agent assigned must be reported as an observation"
  );
  assert.deepStrictEqual(
    observed.orphanProfiles,
    ["screen-controls-format"],
    "a Format Skill attached to no capability at all must be reported as an orphan, not a violation"
  );

  notRun(
    "the live-data half (the three Supabase join tables)",
    "needs SUPABASE_URL/SUPABASE_SERVICE_KEY, which this suite does not always carry, and asserting " +
      "on the live board would make a regression result change when a violation is FIXED. Run it " +
      "directly: SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/check-format-skill-exclusivity.js"
  );
}

selfRun(import.meta.url, run);
