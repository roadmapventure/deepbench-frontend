// DeepBench v7.0.721 | tests/regression/agt-020-level-execution-depth.test.mjs | AGT-020 -- the
// fired intent's link level reaches the model as `Execution depth: L<n> <name> -- <directive>`.
//
// WHAT IS BEING PINNED, AND WHY EACH ARM IS SHAPED THE WAY IT IS.
//
// (1) THE DEFECT WAS A COLUMN NOBODY READ, SO THE ASSERTION IS ON THE LINE'S PRESENCE *AND* ITS
// ABSENCE. `capability_skill_profiles.level` was written on all 312 links and consumed by nothing:
// measured 2026-09-29 on the unchanged tree, both live renders below printed `Execution depth` zero
// times. So every check here reads 0 before the change -- P1/P2 and both live renders are RED on the
// pre-change tree by construction, which is what makes them discriminating rather than decorative.
// Run the pure half against `git show origin/dev:api/prompt/db-assembly.js` to see it: the intent
// section assembles `"O\nM"`, and P1's strict-equal fails on the missing third line.
//
// (2) THE GATE IS THE MECHANISM, SO IT CARRIES ITS OWN NEGATIVE CONTROLS. A guard that only proved
// "the line appears" would stay green the day the line appears on EVERY stacked Intent Profile --
// a different mechanism with a superset of the same output, and a real defect: an enrichment
// capability's L3 intent would then instruct the model at a depth the caller never asked for. So
// P3 (no directive on the link) and P4 (a profile whose slug is not the fired intent) assert the
// line is ABSENT from fixtures that differ from P1 in exactly one field. P3 also pins the
// fail-closed direction: a level with no row behind it assembles byte-identical to pre-change,
// never a half-rendered `Execution depth: L1 undefined`.
//
// (3) THE DIRECTIVE TEXT IS CONTENT, AND THE COUNT OF READ SITES IS THE DRIFT GUARD. The four
// strings live in `public.skill_levels`, not in the assembler, so S2 reads them from the migration
// mirror and L1 reads them from the live table -- two homes that must agree. S5 counts the embed in
// db-assembly.js and requires exactly THREE: a fourth `capability_skill_profiles` select added later
// without the embed would assemble with no depth line and no error, which is precisely how this
// column went unread for as long as it did.
//
// (4) WHICH HALF RAN IS ANNOUNCED, NEVER INFERRED. The pure and static arms are in-process and
// always run. The live arm reads Supabase with the service key (the new table is revoked from
// anon/authenticated, so the public key cannot see it at all) and declares itself NOT RUN via
// notRun() when credentials are absent, rather than passing quietly.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "node:child_process";

import { buildSections } from "../../api/prompt/db-assembly.js";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR = path.join(ROOT, "docs/design/agt-020-skill-levels.sql");
const ASSEMBLY = path.join(ROOT, "api/prompt/db-assembly.js");
const PROMPT = path.join(ROOT, "scripts", "agent-prompt.js");

const INTENT_SLUG = "d-intent";
const EMBED = "skill_levels(name,execution_directive)";
const EMBED_SITES = 3;
const LEVEL_NAMES = ["General", "Trained", "Expert", "Proprietary"];

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

// ONE fixture builder, so each negative control differs from P1 in exactly one field. A control
// assembled from its own literal could differ somewhere else and pass for the wrong reason.
function intentProfile(over = {}) {
  return {
    skill_type_slug: "intent",
    slug: INTENT_SLUG,
    objective: "O",
    method: "M",
    level: 1,
    skill_level: { name: "General", execution_directive: "X1" },
    ...over,
  };
}

// The assembled intent section's content, through the real buildSections() -- never a
// reimplementation of the branch under test.
function intentContent(profile) {
  const { sections } = buildSections([profile], null, [], null, INTENT_SLUG);
  const intent = sections.find(s => s.slug === "intent");
  assert.ok(intent, `no intent section assembled; got ${JSON.stringify(sections.map(s => s.slug))}`);
  return intent.content;
}

const CHECKS = [
  {
    name: "P1 L1 fired intent -> the depth line is appended verbatim after objective and method",
    run() {
      assert.strictEqual(
        intentContent(intentProfile()),
        "O\nM\nExecution depth: L1 General — X1",
        "the fired intent's section must be objective, method, then the depth line -- RED on the pre-change tree, which assembles \"O\\nM\""
      );
    },
  },
  {
    name: "P2 L3 fired intent -> the level number, name and directive all come from the link's row",
    run() {
      const content = intentContent(intentProfile({
        level: 3,
        skill_level: { name: "Expert", execution_directive: "X3" },
      }));
      assert.ok(
        content.endsWith("Execution depth: L3 Expert — X3"),
        `the depth line must be the last line and read from the row, not a constant; got ${JSON.stringify(content)}`
      );
      assert.strictEqual(content, "O\nM\nExecution depth: L3 Expert — X3",
        "nothing else may change when the level changes");
    },
  },
  {
    name: "P3 no skill_level on the link -> no depth line at all (fail closed, byte-identical)",
    run() {
      const content = intentContent(intentProfile({ skill_level: null }));
      assert.strictEqual(content, "O\nM",
        "a level with no directive behind it must assemble exactly as it did before AGT-020");
      assert.strictEqual(content.includes("Execution depth"), false,
        "no half-rendered depth line may reach the model when the directive is missing");
    },
  },
  {
    name: "P4 a profile that is NOT the fired intent -> no depth line (the stacked-profile gate)",
    run() {
      const content = intentContent(intentProfile({ slug: "other" }));
      assert.strictEqual(content.includes("Execution depth"), false,
        "only the FIRED intent contributes a depth line -- an enrichment capability's L3 intent must not instruct the model at a depth the caller never asked for");
      assert.strictEqual(content, "O\nM", "and it assembles byte-identical otherwise");
    },
  },
  {
    name: "S1-S4 the migration mirror records the table, the four levels in order, the revoke and the fkey",
    run() {
      const sql = fs.readFileSync(MIRROR, "utf8");
      assert.ok(sql.includes("CREATE TABLE public.skill_levels"),
        "the mirror must hold the CREATE TABLE that was applied live");
      let at = -1;
      for (const name of LEVEL_NAMES) {
        const next = sql.indexOf(`'${name}'`, at + 1);
        assert.ok(next > at,
          `the mirror must seed '${name}' after the level before it -- the four levels are an ordered domain`);
        at = next;
      }
      assert.ok(sql.includes("REVOKE ALL ON public.skill_levels FROM anon, authenticated"),
        "the mirror must record that the public key holds nothing on this table (.claude/rules/supabase-column-grants.md)");
      assert.ok(sql.includes("capability_skill_profiles_level_fkey"),
        "the mirror must record the fkey that makes every link's level resolve");
    },
  },
  {
    name: `S5 db-assembly.js embeds the level row at exactly ${EMBED_SITES} sites -- a fourth select without it is silent`,
    run() {
      const src = fs.readFileSync(ASSEMBLY, "utf8");
      const count = src.split(EMBED).length - 1;
      assert.strictEqual(count, EMBED_SITES,
        `expected ${EMBED_SITES} occurrences of ${EMBED}, found ${count} -- a capability_skill_profiles select without the embed assembles with no depth line and no error`);
    },
  },
];

function runChecks({ verbose } = {}) {
  const failures = [];
  for (const check of CHECKS) {
    try {
      check.run();
      if (verbose) console.log(`  [PASS] ${check.name}`);
    } catch (e) {
      failures.push(`${check.name} -- ${e.message}`);
      if (verbose) console.log(`  [FAIL] ${check.name} -- ${e.message}`);
    }
  }
  return failures;
}

// The live half: the table as the server sees it, and the two real renders the ticket was measured
// on. Both renders read 0 `Execution depth` lines on the pre-change tree.
async function runLive() {
  const url = process.env.SUPABASE_URL.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;

  // L1: the four rows, in order, as the assembler's own embed resolves them.
  const r = await fetch(`${url}/rest/v1/skill_levels?select=level,name&order=level`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  assert.strictEqual(r.status, 200, `skill_levels must be readable with the service key; got ${r.status}`);
  const rows = await r.json();
  assert.strictEqual(rows.length, 4, `skill_levels must hold exactly 4 rows; got ${rows.length}`);
  assert.deepStrictEqual(rows.map(x => x.name), LEVEL_NAMES,
    "the four levels must be General, Trained, Expert, Proprietary in level order");
  assert.deepStrictEqual(rows.map(x => x.level), [1, 2, 3, 4], "levels 1..4, no gaps");
  console.log(`  L1 LIVE: skill_levels = ${rows.map(x => `L${x.level} ${x.name}`).join(", ")} -- PASS`);

  // L2/L3: the two renders, each asserted to carry its OWN level's line EXACTLY ONCE. "Exactly
  // once" is the load-bearing part -- more than one means a stacked profile also fired.
  for (const c of [
    { agent: "marcus", capability: "channel-intelligence", intent: "ci-submission-ack-intent",
      task: '{"theory_text":"x"}', expect: "Execution depth: L1 General" },
    { agent: "eleanor", capability: "data-room-custody", intent: "library-catalog-intent",
      task: '{"question":"x"}', expect: "Execution depth: L3 Expert" },
  ]) {
    const p = spawnSync(process.execPath,
      [PROMPT, `--agent=${c.agent}`, `--capability=${c.capability}`, `--intent=${c.intent}`, `--task=${c.task}`],
      { encoding: "utf8" });
    assert.strictEqual(p.status, 0,
      `agent-prompt must exit 0 for ${c.agent}; got ${p.status} ${(p.stderr ?? "").slice(0, 400)}`);
    const own = p.stdout.split(c.expect).length - 1;
    const any = p.stdout.split("Execution depth").length - 1;
    assert.strictEqual(own, 1,
      `${c.agent}'s assembled prompt must carry "${c.expect}" exactly once; got ${own}`);
    assert.strictEqual(any, 1,
      `${c.agent}'s assembled prompt must carry exactly one depth line in total; got ${any} -- more than one means a profile other than the fired intent contributed`);
    console.log(`  LIVE ${c.agent}: "${c.expect}" x1, one depth line in total -- PASS`);
  }
}

async function run() {
  const failures = runChecks({ verbose: false });
  if (failures.length > 0) {
    throw new Error(`${failures.length}/${CHECKS.length} checks failed: ${failures.join(" | ")}`);
  }
  if (!hasCreds()) {
    notRun("AGT-020 live: the four skill_levels rows and the two agent renders carrying their depth line", CRED_HINT);
    console.log("  LIVE NOT RUN -- no Supabase credentials in this environment");
    return;
  }
  await runLive();
}

export default run;

selfRun(import.meta.url, async () => {
  const failures = runChecks({ verbose: true });
  console.log(`\nagt-020-level-execution-depth: ${CHECKS.length - failures.length}/${CHECKS.length} pure+static checks passed`);
  if (failures.length > 0) {
    throw new Error(`${failures.length}/${CHECKS.length} checks failed: ${failures.join(" | ")}`);
  }
  if (!hasCreds()) {
    notRun("AGT-020 live: the four skill_levels rows and the two agent renders carrying their depth line", CRED_HINT);
    console.log("  LIVE NOT RUN -- no Supabase credentials in this environment");
    return;
  }
  await runLive();
});
