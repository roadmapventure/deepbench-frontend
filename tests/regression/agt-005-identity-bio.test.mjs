// DeepBench v7.0.718 | tests/regression/agt-005-identity-bio.test.mjs | AGT-005 -- agents.bio was
// selected by assemblePrompt()'s AA-58 query and then discarded; it now renders in the Identity
// section as its own unlabelled line directly under the name · role · specialty card.
//
// WHAT IS BEING PINNED, and why the obvious guard would pass for the wrong reason.
//
// (1) THE DEFECT WAS A FETCHED-AND-DROPPED FIELD, SO "THE BIO APPEARS SOMEWHERE" IS NOT THE CLAIM.
// The bio text also exists in Supabase and could reach a prompt down some other path later (a
// role_prompt row someone pastes it into, a Skill objective, a future Knowledge Skill). A guard that
// only asserted `content.includes(bio)` would go green on any of those -- a different mechanism with
// the same bytes. So part (a) asserts the WHOLE section content by exact equality: the bio is on its
// own line, in position two, between the card line and the Skill's objective. Position is the claim.
//
// (2) THE CONTROL IS THE BYTE-IDENTICAL SHAPE, NOT A SECOND HAPPY PATH. 9 of 62 capabilities have no
// Identity Skill and every agent could in principle carry a blank bio, so the change's other half of
// the contract is that a blank/null/absent bio produces exactly today's string. Part (b) runs three
// blank shapes (null, whitespace-only, no agentRow at all) and requires the pre-change content
// verbatim. If the new line pushed an empty string, a stray newline, or a label, (b) is red.
//
// (3) THE LIVE ARM COUNTS, IT DOES NOT MERELY CONTAIN. Part (c) renders Eleanor's real assembled
// prompt and requires EXACTLY ONE occurrence of a verbatim sentence from her live bio -- 0 is the
// unchanged tree (measured 2026-09-29: the CONTEXT grep printed 0), and 2+ is the double-push bug a
// contains-check cannot see. It also pins the bio's index between the card line and the first
// role_prompt, so a change that rendered the bio in the wrong place is red.
//
// WHICH BRANCH FIRED IS ANNOUNCED (STANDARDS.md Section 4 / the LOO-013 lesson). Parts (a) and (b)
// are in-process and always run. Part (c) reads Supabase and DECLARES itself NOT RUN via notRun()
// when credentials are absent rather than passing quietly.
//
// READ-ONLY BY CONSTRUCTION: no takeTestSlot, no fixture rows, no writes. (a)/(b) are pure
// in-process calls to buildSections(); (c) shells scripts/agent-prompt.js, which only reads.

import assert from "assert";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import { buildSections } from "../../api/prompt/db-assembly.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const IDENTITY = {
  slug: "agt005-fixture-identity",
  name: "AGT-005 fixture identity",
  skill_type_slug: "identity",
  objective: "FIXTURE OBJECTIVE",
  method: "FIXTURE METHOD",
  traits: {},
  technical_services: [],
};

// One fixture builder, so every arm differs from its control in exactly ONE field -- the bio. A
// control assembled from a separately-typed literal could differ somewhere else and pass wrongly.
const card = (bio) => ({
  name: "Fixture Name",
  role: "Fixture Role",
  specialty: "Fixture Specialty",
  bio,
});

// A verbatim substring of Eleanor's live bio (agents row, 2026-09-29).
const BIO_SENTENCE = "She does not trust a caller to scope its own query correctly";
const ELEANOR_CARD =
  "Eleanor Voss · The Librarian · Data Room Access Control · Tenant Isolation · Retrieval Brokering";
// The first line AFTER the card in Eleanor's assembled Identity section (her first role_prompt).
const AFTER_BIO_MARKER = "Read the request as given";

// The exact pre-change content, written out once so both blank arms compare against the same string.
const WITHOUT_BIO = "Fixture Name · Fixture Role · Fixture Specialty\nFIXTURE OBJECTIVE\nFIXTURE METHOD";
const CARDLESS = "FIXTURE OBJECTIVE\nFIXTURE METHOD";

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

function identitySection(agentRow) {
  const { sections } = buildSections([IDENTITY], "fixture-agent", [], agentRow, null);
  const found = sections.find(s => s.slug === "identity");
  assert.ok(found, "buildSections() produced no section with slug 'identity'");
  return found;
}

async function run() {
  const results = [];

  // ---------------------------------------------------------------------------------------------
  // (a) The bio renders as its own line, in position two, directly under the card.
  //     EXACT equality on the whole section -- position is the claim, not mere presence.
  // ---------------------------------------------------------------------------------------------
  const withBio = identitySection(card("FIXTURE BIO sentence."));
  assert.strictEqual(
    withBio.content,
    "Fixture Name · Fixture Role · Fixture Specialty\nFIXTURE BIO sentence.\nFIXTURE OBJECTIVE\nFIXTURE METHOD",
    "the bio must be its own unlabelled line directly under the card and before the Skill's objective"
  );
  results.push("bio-renders-under-the-card");
  console.log("  (a) bio-renders-under-the-card -- PASS");

  // ---------------------------------------------------------------------------------------------
  // (b) CONTROL: every blank shape is byte-identical to the pre-change output.
  // ---------------------------------------------------------------------------------------------
  assert.strictEqual(identitySection(card(null)).content, WITHOUT_BIO,
    "a null bio must leave the section byte-identical to before AGT-005");
  assert.strictEqual(identitySection(card("  \n ")).content, WITHOUT_BIO,
    "a whitespace-only bio is an empty bio -- never a blank line in the prompt");
  assert.strictEqual(identitySection(null).content, CARDLESS,
    "a call with no agentRow (no agent_id) must be entirely unchanged");
  results.push("blank-bio-is-byte-identical-to-before");
  console.log("  (b) blank-bio-is-byte-identical-to-before -- PASS");

  // ---------------------------------------------------------------------------------------------
  // (c) LIVE: Eleanor's real assembled prompt carries her bio EXACTLY ONCE, in the right place.
  // ---------------------------------------------------------------------------------------------
  if (!hasCreds()) {
    notRun("AGT-005 (c) eleanor-live-prompt-carries-her-bio", CRED_HINT);
    console.log("  (c) NOT RUN -- no Supabase credentials in this environment");
    console.log(`  results: ${results.join(", ")}`);
    return;
  }

  const proc = spawnSync(
    process.execPath,
    ["scripts/agent-prompt.js", "--agent=eleanor", "--capability=data-room-custody"],
    { cwd: ROOT, env: process.env, encoding: "utf8" }
  );
  assert.strictEqual(proc.status, 0,
    `scripts/agent-prompt.js exited ${proc.status}: ${String(proc.stderr).slice(0, 400)}`);
  const stdout = String(proc.stdout);

  // EXACTLY ONE. 0 is the unchanged tree; 2+ is the double-push a contains-check cannot see.
  const occurrences = stdout.split(BIO_SENTENCE).length - 1;
  assert.strictEqual(occurrences, 1,
    `Eleanor's bio sentence must appear exactly once in her assembled prompt, saw ${occurrences}`);

  const cardIdx = stdout.indexOf(ELEANOR_CARD);
  assert.ok(cardIdx !== -1, "Eleanor's name · role · specialty card line is missing from the prompt");
  const bioIdx = stdout.indexOf(BIO_SENTENCE);
  const afterIdx = stdout.indexOf(AFTER_BIO_MARKER);
  assert.ok(afterIdx !== -1, `the marker "${AFTER_BIO_MARKER}" is missing -- the ordering check cannot run`);
  assert.ok(bioIdx > cardIdx,
    "the bio must render AFTER the card line, not before it");
  assert.ok(bioIdx < afterIdx,
    "the bio must render BEFORE the first role_prompt -- general to specific");

  results.push("eleanor-live-prompt-carries-her-bio");
  console.log(`  (c) eleanor-live-prompt-carries-her-bio -- PASS (bio occurrences: ${occurrences})`);
  console.log(`  results: ${results.join(", ")}`);
}

export default run;
selfRun(import.meta.url, run);
