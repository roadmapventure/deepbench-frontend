// DeepBench v7.0.1032 | tests/regression/agt-017-brent-db-assembly.test.mjs | AGT-017 -- Brent's fetch route reads his Skill Profiles through the one prompt assembler
//
// FEATURE: AGT-017 (P8 - Determinism Removal), stage 1 of 3. api/web-memory.js's GET -- the only
// door Brent's portal fetch runs enter through -- assembled its prompt with lib/agent-run.js's
// assembleContext(), which reads agent_configs and knowledge_entries and NEVER reads
// skill_profiles. Brent's Identity, Guardrails and Knowledge therefore came from a code path with
// its own hardcoded layer list instead of from his own Skill Profile rows, which is the
// determinism docs/ARCHITECTURE.md Section 19 Founding Principle / Section 19b exists to remove.
// This stage moves the ASSEMBLY only: the GET now calls the one prompt assembler
// (assemblePrompt + enrichPrompt) against capability `portal-data-fetch`.
//
// TWO ARMS:
//   (A) STATIC, always runs -- no env, no database, no model. Reads the TEXT of api/web-memory.js
//       and grades THE CHANGE, not the live world (pattern:162): the route must call
//       `assemblePrompt(` and `enrichPrompt(` and must no longer mention `assembleContext` at all.
//       This is the DISCRIMINATOR: on the unchanged tree it FAILS (the route still holds two
//       `assembleContext` occurrences), so a no-op build cannot pass this file.
//   (B) LIVE READ (SUPABASE_URL + SUPABASE_SERVICE_KEY, else `notRun("B", ...)`) -- the real
//       assemblePrompt() call the route now makes, asserted on the STORED ROWS it returns: the
//       three Skill Profile sections are present; the knowledge section is a `rag` section whose
//       fetch_instruction carries Brent's own retrieval breadth (match_count 10, scope agent);
//       and identity really carries his agent-card name. Read-only -- this file writes nothing to
//       Supabase (pattern:76) and calls no model, so it costs nothing to run.
//
// BOTH DIRECTIONS, deliberately. Arm B asserts what must be THERE (the three sections, the rag
// fetch_instruction, the name in identity) AND what must NOT be (no `reflect` section): REFLECT is
// unchanged in this stage -- it stays on lib/agent-run.js's exported callReflect(), the same
// unlogged Haiku call the route made before -- so a `reflect` section appearing here would mean
// the enrichment path had quietly taken it over, which is stage B's work, not this one's.
//
// NO MODEL CALL, NO SPEND, NO API KEY READ.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import { assemblePrompt } from "../../api/prompt/db-assembly.js";

const ROUTE = path.resolve(fileURLToPath(import.meta.url), "../../../api/web-memory.js");

const CRED_HINT =
  "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and " +
  "export them inline, per docs/STANDARDS.md Section 2 rule 5.";

function armA_static() {
  const results = [];
  const src = fs.readFileSync(ROUTE, "utf8");

  assert.ok(src.includes("assemblePrompt("),
    "api/web-memory.js must call assemblePrompt( -- Brent's GET assembles from his Skill Profiles");
  assert.ok(src.includes("enrichPrompt("),
    "api/web-memory.js must call enrichPrompt( -- the assembled sections are rendered and retrieved by the one enrichment path");

  const stale = src.split("assembleContext").length - 1;
  assert.strictEqual(stale, 0,
    `api/web-memory.js must no longer mention assembleContext -- that is the hardcoded layer path AGT-017 removes from this route -- found ${stale} occurrence(s)`);

  console.log("  [AGT-017] arm A: api/web-memory.js calls assemblePrompt( + enrichPrompt(, 0 assembleContext");
  results.push("route-text-assembles-through-the-one-prompt-assembler");
  return results;
}

async function armB_live() {
  const results = [];
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    notRun(
      "B (the live read: a real assemblePrompt() for brent/portal-data-fetch -- three Skill Profile sections, the rag fetch_instruction at match_count 10 scope agent, no reflect section)",
      CRED_HINT,
    );
    return results;
  }

  const pr = await assemblePrompt({
    capability_slug: "portal-data-fetch",
    agent_id: "brent",
    tenant_id: "global",
    task_context: { goal: "download FY25 payments from mdview" },
  });

  const sections = pr.sections || [];
  const slugs = sections.map(s => s.slug);

  for (const needed of ["identity", "guardrails", "knowledge-brent-knowledge"]) {
    assert.ok(slugs.includes(needed),
      `brent/portal-data-fetch must assemble a "${needed}" section from his Skill Profiles -- got [${slugs.join(", ")}]`);
  }

  const reflects = sections.filter(s => s.type === "reflect").map(s => s.slug);
  assert.deepStrictEqual(reflects, [],
    `no assembled section may be type "reflect" in this stage -- REFLECT stays on callReflect() until part B -- got [${reflects.join(", ")}]`);

  const knowledge = sections.find(s => s.slug === "knowledge-brent-knowledge");
  assert.strictEqual(knowledge.type, "rag",
    `knowledge-brent-knowledge must be a "rag" section, got "${knowledge.type}"`);

  const fi = knowledge.fetch_instruction || {};
  assert.strictEqual(fi.method, "rag", `its fetch_instruction.method must be "rag", got "${fi.method}"`);
  assert.strictEqual(fi.agent_id, "brent", `its fetch_instruction.agent_id must be "brent", got "${fi.agent_id}"`);
  assert.strictEqual(fi.match_count, 10,
    `its fetch_instruction.match_count must be 10 -- Brent's own retrieval breadth, the number the retired assembleContext() call passed as options.matchCount, now carried by his Skill Profile row -- got ${fi.match_count}`);
  assert.strictEqual(fi.scope, "agent", `its fetch_instruction.scope must be "agent", got "${fi.scope}"`);

  const identity = sections.find(s => s.slug === "identity");
  assert.ok((identity.content || "").includes("Brent Matthews"),
    `the identity section's content must carry his agent-card name "Brent Matthews" -- got "${String(identity.content || "").slice(0, 80)}"`);

  console.log(`  [AGT-017] arm B: ${slugs.length} sections [${slugs.join(", ")}] / 0 reflect / knowledge rag match_count ${fi.match_count} scope ${fi.scope}`);
  results.push("live-brent-portal-data-fetch-assembles-identity-guardrails-and-rag-knowledge-from-stored-rows");
  return results;
}

async function run() {
  const results = [];
  results.push(...armA_static());
  results.push(...(await armB_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
