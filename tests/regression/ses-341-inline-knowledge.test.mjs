// DeepBench v7.0.430 | tests/regression/ses-341-inline-knowledge.test.mjs | SES-341 -- a Knowledge
// Skill can carry its own text (traits.source = "inline") instead of being turned into a RAG fetch.
//
// WHAT IS BEING PINNED, and the shape a lazier guard would pass vacuously.
//
// (1) THE DEFECT WAS AN EMPTY SECTION, SO ASSERTING ON THE OUTPUT ALONE CANNOT DISCRIMINATE. Before
// this ticket, every Knowledge Skill Profile got `fetch_instruction.method = "rag"`; the
// Prioritizer's two profiles hold no Library chunks, so the retrieval could only ever return
// nothing and both BACKGROUND KNOWLEDGE sections were omitted from all six of AGT-63's QA prompts
// (measured 2026-09-09: `scripts/agent-prompt.js --agent=prioritizer --capability=classify-ticket`
// printed four sections and named both knowledge slugs omitted on stderr). A guard that only checks
// "the legend text is present" would go green again the day someone re-routes that text through a
// retrieval that happens to be seeded -- which is a different mechanism with the same output. So
// part (b) is a SEAM PROOF (STANDARDS.md Section 4's labelled third option): globalThis.fetch is
// intercepted and the assertion is that the inline section issues ZERO requests. The path taken is
// the claim, not the bytes produced.
//
// (2) EVERY ARM CARRIES ITS NEGATIVE CONTROL. "Zero fetches" means nothing unless the same harness
// can SEE a fetch, so (b) runs the identical section with the ordinary RAG fetch_instruction and
// requires at least one request. (a) runs the identical fixture with the trait REMOVED and requires
// `method === "rag"` with null content -- if the branch fired unconditionally, that assertion fails.
//
// (3) ONE RENDERER, ASSERTED AS ONE RENDERER. The inline text reaches the model down two paths --
// db-assembly.js fills `content` at assembly time (so scripts/agent-prompt.js, which performs no
// retrieval, shows the executor's bytes) and ai-enrichment.js's fetchSection() renders it again for
// the executor. Two copies would agree today and drift silently later, so part (d) reads the
// shipped ai-enrichment.js source and requires that it IMPORTS renderInlineKnowledge rather than
// declaring one of its own.
//
// WHICH BRANCH FIRED IS ANNOUNCED. Parts (a), (b) and (d) are in-process/source and always run.
// Part (c) reads Supabase and declares itself NOT RUN via notRun() when credentials are absent,
// rather than passing quietly -- an invisible gap is indistinguishable from coverage.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import { buildSections, renderInlineKnowledge } from "../../api/prompt/db-assembly.js";
import { enrichPrompt } from "../../api/prompt/ai-enrichment.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ENRICHMENT_SRC = path.join(ROOT, "api/prompt/ai-enrichment.js");

const AGENT = "prioritizer";
const CAPABILITY = "classify-ticket";
const TENANT = "global";
const LEGEND_MARKER = "THE TEN CLASSES";
const PATTERN_MARKER = "Pattern 137";

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

// One fixture builder, so the inline arm and its negative control differ in exactly one field --
// the trait. A control assembled from a separately-typed literal could differ somewhere else and
// pass for the wrong reason.
function knowledgeProfile({ source, method = "FIXTURE BODY line one.\nFIXTURE BODY line two." } = {}) {
  return {
    slug: "ses341-fixture-knowledge",
    name: "SES-341 fixture knowledge",
    skill_type_slug: "knowledge",
    objective: "FIXTURE HEADING",
    method,
    traits: source ? { source } : {},
    technical_services: [],
  };
}

function knowledgeSection(profiles) {
  const { sections } = buildSections(profiles, AGENT, [], null, null);
  const found = sections.filter(s => s.slug.startsWith("knowledge-"));
  assert.strictEqual(found.length, 1, `expected exactly one knowledge section, got ${found.length}`);
  return found[0];
}

// Drives the REAL enrichPrompt() over one handed-in section with globalThis.fetch intercepted, and
// reports both what came out and how many requests it took to get there.
async function enrichWithFetchCount(section) {
  const realFetch = globalThis.fetch;
  const saved = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
    openai: process.env.OPENAI_API_KEY,
  };
  const requests = [];
  try {
    // Fake credentials on purpose: without them lib/rag.js short-circuits before it fetches, and
    // the negative control below would show zero requests for a reason unrelated to this change.
    process.env.SUPABASE_URL = "https://seam.example";
    process.env.SUPABASE_SERVICE_KEY = "seam-key";
    process.env.OPENAI_API_KEY = "seam-openai-key";
    globalThis.fetch = async (url, init) => {
      requests.push(String(url));
      return { ok: false, status: 503, text: async () => "", json: async () => ({}) };
    };
    const enriched = await enrichPrompt({
      prompt_request: {
        sections: [section],
        task_context: { goal: "classify a ticket" },
        tenant_id: TENANT,
        agent_id: AGENT,
        capability_slug: CAPABILITY,
      },
      agent_id: AGENT,
      capability_slug: CAPABILITY,
    });
    return { enriched, requests };
  } finally {
    globalThis.fetch = realFetch;
    for (const [envName, value] of [
      ["SUPABASE_URL", saved.url], ["SUPABASE_SERVICE_KEY", saved.key], ["OPENAI_API_KEY", saved.openai],
    ]) {
      if (value === undefined) delete process.env[envName]; else process.env[envName] = value;
    }
  }
}

async function run() {
  // ---------------------------------------------------------------------------------------------
  // (a) buildSections() -- the inline branch, and the same fixture without the trait as control.
  // ---------------------------------------------------------------------------------------------
  const inline = knowledgeSection([knowledgeProfile({ source: "inline" })]);
  assert.strictEqual(inline.fetch_instruction.method, "inline",
    "traits.source=inline must produce an inline fetch_instruction, not a RAG one");
  assert.strictEqual(inline.fetch_instruction.source, "inline");
  assert.strictEqual(inline.fetch_instruction.text, knowledgeProfile().method,
    "the instruction must carry the profile's own method text verbatim");
  assert.strictEqual(inline.fetch_instruction.heading, "FIXTURE HEADING",
    "the profile's objective is the section's first line");
  assert.ok(!("agent_id" in inline.fetch_instruction) && !("match_count" in inline.fetch_instruction),
    "an inline instruction must carry no RAG fields -- there is nothing to retrieve");
  assert.ok(inline.content && inline.content.includes("FIXTURE BODY line one."),
    "content must be filled at assembly time so a non-enriching reader (scripts/agent-prompt.js) sees it");
  assert.ok(inline.content.startsWith("FIXTURE HEADING\n"),
    "the heading must be the first line of the rendered section");
  assert.strictEqual(inline.label, "BACKGROUND KNOWLEDGE",
    "an inline knowledge section keeps the ordinary knowledge label");

  // NEGATIVE CONTROL -- one field different, and the old behaviour must be exactly intact.
  const rag = knowledgeSection([knowledgeProfile({})]);
  assert.strictEqual(rag.fetch_instruction.method, "rag",
    "without the trait the knowledge branch must still build a RAG fetch_instruction");
  assert.strictEqual(rag.content, null,
    "a RAG knowledge section still carries no content at assembly time");
  assert.strictEqual(rag.fetch_instruction.match_count, 5);

  // Ordering, slug shape and phase are the §19k-visible surface -- unchanged by the trait.
  assert.strictEqual(inline.slug, rag.slug, "the knowledge-<slug> shape must not change");
  assert.strictEqual(inline.order, rag.order, "an inline knowledge section keeps knowledge's order");
  assert.strictEqual(inline.prompt_phase, rag.prompt_phase, "and keeps knowledge's prompt_phase");
  assert.strictEqual(inline.type, rag.type, "and keeps its sectionType");

  // Empty method -- the omit path, not a heading over nothing.
  const emptyInline = knowledgeSection([knowledgeProfile({ source: "inline", method: "" })]);
  assert.strictEqual(emptyInline.fetch_instruction.method, "inline");
  assert.strictEqual(emptyInline.content, null,
    "an inline Skill with no method renders nothing -- never a bare heading");
  assert.strictEqual(renderInlineKnowledge({ text: "   ", heading: "H" }), null,
    "whitespace-only text is empty text");
  assert.strictEqual(renderInlineKnowledge({ text: "body", heading: null }), "body",
    "no objective means no heading line, not an empty one");
  console.log("  (a) buildSections: inline instruction + content, rag control intact -- PASS");

  // ---------------------------------------------------------------------------------------------
  // (b) SEAM PROOF over the real enrichPrompt(): the inline path performs NO retrieval.
  // ---------------------------------------------------------------------------------------------
  const inlineRun = await enrichWithFetchCount(inline);
  assert.strictEqual(inlineRun.requests.length, 0,
    `an inline knowledge section must issue zero requests, saw ${JSON.stringify(inlineRun.requests)}`);
  assert.ok(inlineRun.enriched.system_prompt.includes("=== BACKGROUND KNOWLEDGE ==="),
    "the enriched prompt must carry the BACKGROUND KNOWLEDGE header");
  assert.ok(inlineRun.enriched.system_prompt.includes("FIXTURE HEADING\nFIXTURE BODY line one."),
    "the enriched prompt must carry heading-then-text, rendered by the shared renderer");
  assert.deepStrictEqual(inlineRun.enriched.debug.sections_omitted, [],
    "a non-empty inline section must not be omitted");
  assert.deepStrictEqual(inlineRun.enriched.debug.rag_chunks_by_section, {},
    "no chunk count may be reported for a section that never fetched");

  // NEGATIVE CONTROL #1 -- the same harness, the ordinary RAG instruction. It MUST fetch, or the
  // "zero requests" above is measuring a broken interceptor rather than the inline branch.
  const ragRun = await enrichWithFetchCount(rag);
  assert.ok(ragRun.requests.length > 0,
    "the RAG control issued no request either -- the fetch interception proves nothing");

  // NEGATIVE CONTROL #2 -- empty inline text is omitted and named, exactly as an empty RAG result is.
  const emptyRun = await enrichWithFetchCount(emptyInline);
  assert.strictEqual(emptyRun.requests.length, 0);
  assert.deepStrictEqual(emptyRun.enriched.debug.sections_omitted, [emptyInline.slug],
    "an empty inline section must be NAMED in sections_omitted, never silently dropped");
  assert.ok(!emptyRun.enriched.system_prompt.includes("BACKGROUND KNOWLEDGE"),
    "an empty inline section must not leave a bare heading in the prompt");
  console.log(`  (b) enrichPrompt seam: inline 0 requests, rag control ${ragRun.requests.length}, empty omitted -- PASS`);

  // ---------------------------------------------------------------------------------------------
  // (d) ONE renderer. The enrichment file must import it, never declare its own.
  // ---------------------------------------------------------------------------------------------
  const enrichmentSrc = fs.readFileSync(ENRICHMENT_SRC, "utf8");
  assert.ok(/import\s*\{[^}]*renderInlineKnowledge[^}]*\}\s*from\s*["']\.\/db-assembly\.js["']/.test(enrichmentSrc),
    "api/prompt/ai-enrichment.js must import renderInlineKnowledge from db-assembly.js");
  assert.ok(!/function\s+renderInlineKnowledge/.test(enrichmentSrc),
    "api/prompt/ai-enrichment.js must not declare a second inline renderer -- that is the drift this guards");
  console.log("  (d) one inline renderer, imported not recreated -- PASS");

  // ---------------------------------------------------------------------------------------------
  // (c) LIVE -- the Prioritizer's real assembled prompt carries the legend and the patterns.
  // ---------------------------------------------------------------------------------------------
  if (!hasCreds()) {
    notRun("SES-341 (c) the Prioritizer's assembled prompt carries its inline knowledge", CRED_HINT);
    console.log("  (c) NOT RUN -- no Supabase credentials in this environment");
    return;
  }

  const { assemblePrompt } = await import("../../api/prompt/db-assembly.js");
  const assembly = await assemblePrompt({
    capability_slug: CAPABILITY, agent_id: AGENT, tenant_id: TENANT, task_context: {},
  });
  const knowledge = assembly.sections.filter(s => s.slug.startsWith("knowledge-"));
  assert.ok(knowledge.length >= 2,
    `the Prioritizer must assemble its two Knowledge Skills, found ${knowledge.length}`);
  for (const s of knowledge) {
    assert.strictEqual(s.fetch_instruction.method, "inline",
      `${s.slug} is still a RAG section -- the traits.source=inline conversion is missing from the row`);
    assert.ok(s.content, `${s.slug} assembled empty -- the defect SES-341 exists to remove`);
  }
  const knowledgeText = knowledge.map(s => s.content).join("\n");
  assert.ok(knowledgeText.includes(LEGEND_MARKER),
    `the assembled prompt is missing "${LEGEND_MARKER}" -- the ten-class legend never reached the model`);
  assert.ok(knowledgeText.includes(PATTERN_MARKER),
    `the assembled prompt is missing "${PATTERN_MARKER}" -- John's decision patterns never reached the model`);
  console.log(`  (c) LIVE: ${knowledge.length} inline knowledge sections, legend + patterns present -- PASS`);
}

export default run;
selfRun(import.meta.url, run);
