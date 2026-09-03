// DeepBench v7.0.419 | tests/regression/log-143d1-trace-facts.test.mjs | LOG-143 (d1) -- the judge
// reads the graded run's own facts out of ai_activity_log, server-side, as one `trace_facts` prompt
// section on its own model turn.
//
// WHAT IS BEING PINNED, and the four places a lazier guard would pass vacuously.
//
// (1) THE DISPATCH CASE, WITH A MUTATION CONTROL. "ai-enrichment.js mentions trace_facts" passes
// against a file where the string appears only in a comment. The predicate below looks for the case
// in the `fi.source === "..."` chain, and is then re-run against a MUTANT with that case deleted; a
// predicate that cannot reject the mutant is measuring nothing.
//
// (2) THE SOURCE MUST BE A DIRECT LOOKUP. If `trace_facts` is absent from DIRECT_LOOKUP_SOURCES the
// section is classified as a similarity search, and LOG-37a-patch's gate then writes chunk ids for a
// path that embedded nothing -- the exact defect that ticket fixed. Asserted explicitly.
//
// (3) THE NAMED TRACE'S EXPECTATION WAS CORRECTED BY MEASUREMENT, and the correction is the point.
// The coordinator's spec expected trace 7696ec6e-... to yield "3 hops, 4 chunk ids and non-empty
// chunk text". The first two are true. THE THIRD IS NOT, and asserting it would have forced either a
// permanent red or a faked pass: all four of that run's chunk ids are `knowledge_entries` rows, not
// `the_library` rows (verified directly against both tables this session). the_library,
// the_reasoning and knowledge_entries are physically separate stores that never share a code path
// (.claude/rules/library-access.md), and only the_library's text is readable through LOG-143 (d2)'s
// primitive. So this arm asserts what is TRUE of that trace -- 3 hops, 4 ids, zero Library
// resolutions -- AND that the section says in words that this means the run grounded on a different
// store rather than that its claims are unsupported. Collapsing those two into a silent empty is how
// an honest `unknown` becomes a fabricated low score (C-rejected-17/18).
//
// (4) A ZERO-TEXT ASSERTION ALONE WOULD BE VACUOUS. Arm (3) would still pass if the chunk-text path
// were entirely broken, so it is paired with a POSITIVE CONTROL: a trace that really did retrieve
// the_library chunks, discovered at run time rather than hardcoded (a pinned uuid rots the first time
// the corpus is reseeded), asserted to produce real text in a `--- CHUNK [id: ...] ---` block.
// Neither arm proves anything without the other.
//
// NO SPEND. buildTraceFacts() runs one PostgREST select plus a by-id Library read; no embedding, no
// Anthropic call.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ENRICHMENT_REL = "api/prompt/ai-enrichment.js";

// The trace the coordinator named for this ticket.
const NAMED_TRACE = "7696ec6e-f2ab-4d21-8286-c0377ad64c56";
const NAMED_HOPS = [
  { agent: "marcus", capability: "channel-intelligence", intent: "ci-answer-display-intent" },
  { agent: "michelle", capability: "project-manager", intent: "agent-selection-intent" },
  { agent: "alex", capability: "screen-controls", intent: "qa-answer-format" },
];
const NAMED_CHUNK_ID_COUNT = 4;

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

// The predicate the mutation control must be able to REJECT. Looks for the value as a real dispatch
// case (`fi.source === "trace_facts"`), not merely as a string somewhere in the file.
export function dispatchHasSourceCase(src, sourceName) {
  return new RegExp(`fi\\.source\\s*===\\s*["']${sourceName}["']`).test(src);
}

export default async function run() {
  // ── SOURCE ARM: no credentials needed ────────────────────────────────────────
  const enrichment = read(ENRICHMENT_REL);

  assert.ok(dispatchHasSourceCase(enrichment, "trace_facts"),
    `${ENRICHMENT_REL} must dispatch fetch_instruction.source === 'trace_facts' -- without the case ` +
    "the Skill Profile's declared source falls through to queryRAG and the judge silently gets a " +
    "similarity search over its own task text instead of the run's logged facts.");

  // MUTATION CONTROL: delete the case, the predicate must say no.
  const mutant = enrichment.replace(/fi\.source === "trace_facts"/, 'fi.source === "not_trace_facts"');
  assert.notEqual(mutant, enrichment, "the mutation control could not find the case to mutate");
  assert.ok(!dispatchHasSourceCase(mutant, "trace_facts"),
    "the dispatch predicate still accepts a build with the trace_facts case removed -- it pins nothing");

  // The source runs no embedding, so it must be classified as a direct lookup (LOG-37a-patch).
  assert.match(enrichment, /DIRECT_LOOKUP_SOURCES = new Set\(\[[^\]]*'trace_facts'/,
    "'trace_facts' must be in DIRECT_LOOKUP_SOURCES -- otherwise the section is recorded as a " +
    "similarity search and chunk ids are written for a path that embedded nothing.");

  // Capabilities are data: the branch keys on the generic source field, never on who is calling.
  const branch = enrichment.slice(enrichment.indexOf('fi.source === "trace_facts"'), enrichment.indexOf('fi.source === "roster"'));
  for (const name of ["bench-report-card", "report-card", "owen", "eleanor"]) {
    assert.ok(!branch.includes(name),
      `the trace_facts dispatch branch must name no capability or agent (found "${name}") -- ` +
      ".claude/rules/capabilities-are-data.md");
  }

  // The intent parser, with its negative controls. `feature` is `<capability>:<intent>:depth<N>`;
  // anything else must return null rather than a best guess at a middle segment.
  const { parseIntentFromFeature, buildTraceFacts } = await import("../../api/prompt/ai-enrichment.js");
  assert.equal(parseIntentFromFeature("channel-intelligence:ci-routing-intent:depth0"), "ci-routing-intent");
  assert.equal(parseIntentFromFeature("request-receivable"), null, "a one-part feature has no intent");
  assert.equal(parseIntentFromFeature("a:b"), null, "a two-part feature has no intent");
  assert.equal(parseIntentFromFeature("a:b:c"), null, "a third segment that is not depth<N> is not a depth marker");
  assert.equal(parseIntentFromFeature(null), null, "a null feature has no intent");

  // A missing trace_id is a stated absence, never a silent empty section.
  const noTrace = await buildTraceFacts({ traceId: null, tenantId: "global", requestingAgentId: "eleanor" });
  assert.match(noTrace.context, /unavailable/i, "an absent trace_id must produce a section that says so");
  assert.ok(!noTrace.context.includes("HOPS ("),
    "an absent trace_id must not render a HOPS block -- an empty hop list reads as 'this run had no hops'");
  assert.equal(noTrace.matchCount, 0);

  // ── LIVE ARM ─────────────────────────────────────────────────────────────────
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "LOG-143d1 live trace_facts section",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent, so no real trace can be read back. " +
      "Re-run with credentials: node --env-file-if-exists=.env tests/regression/run-all.js"
    );
    return;
  }

  const facts = await buildTraceFacts({ traceId: NAMED_TRACE, tenantId: "global", requestingAgentId: "eleanor" });

  // Hops: count, order and content. Order is load-bearing -- delegation fit is a judgment about
  // which hop the question reached FIRST.
  assert.match(facts.context, /HOPS \(3, in execution order\)/,
    `trace ${NAMED_TRACE} must yield exactly 3 hops (agent-turn rows only; guardrail and directory ` +
    "sub-calls are not hops and must not inflate the count)");
  NAMED_HOPS.forEach((h, i) => {
    const line = new RegExp(`  ${i + 1}\\. agent_id: ${h.agent} \\| capability: ${h.capability} \\| intent: ${h.intent} \\|`);
    assert.match(facts.context, line, `hop ${i + 1} must be ${h.agent} / ${h.capability} / ${h.intent}`);
  });
  assert.match(facts.context, /assembled_skill_slugs: capability-registry-knowledge, pm-roster-knowledge, agent-selection-intent/,
    "the hop's assembled_skill_slugs must come through -- this is the field the browser cannot see " +
    "and the whole reason skill_use scored unknown before this ticket");

  assert.match(facts.context, new RegExp(`RETRIEVED CHUNK IDS \\(${NAMED_CHUNK_ID_COUNT}, distinct`),
    `trace ${NAMED_TRACE} must yield ${NAMED_CHUNK_ID_COUNT} distinct chunk ids`);
  assert.match(facts.context, /SELF-REPORTED CLAIMS[\s\S]{0,200}citations/,
    "the run's self_reported_claims must come through");

  // The corrected expectation -- see (3) in the header.
  assert.equal(facts.matchCount, 0,
    `trace ${NAMED_TRACE}'s chunk ids are knowledge_entries rows, not the_library rows, so zero ` +
    "Library chunks resolve. If this ever becomes non-zero the corpus changed; re-measure before " +
    "'fixing' it.");
  assert.match(facts.context, /THIS DOES NOT MEAN THE RUN WAS UNGROUNDED/,
    "when chunk ids resolve to no Library text the section must SAY that this means a different " +
    "store, not an unsupported claim -- otherwise the judge scores groundedness low instead of unknown");

  // POSITIVE CONTROL -- see (4). Without it the assertion above is vacuous.
  const scan = await fetch(
    `${url}/rest/v1/ai_activity_log?select=trace_id,call_facts&trace_id=not.is.null&order=id.desc&limit=400`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  assert.ok(scan.ok, `could not scan ai_activity_log for a Library-grounded trace (${scan.status})`);
  const candidates = [];
  for (const r of await scan.json()) {
    const ids = r.call_facts?.retrieved_chunk_ids;
    if (Array.isArray(ids) && ids.length > 0 && !candidates.includes(r.trace_id)) candidates.push(r.trace_id);
  }

  let grounded = null;
  for (const t of candidates.slice(0, 10)) {
    const f = await buildTraceFacts({ traceId: t, tenantId: "global", requestingAgentId: "eleanor" });
    if (f.matchCount > 0) { grounded = f; break; }
  }

  if (!grounded) {
    notRun(
      "LOG-143d1 chunk-text positive control",
      "no recent trace among the scanned candidates retrieved a the_library chunk, so the " +
      "chunk-text path could not be exercised against real data. The zero-resolution assertion " +
      "above is therefore UNPAIRED this run and proves only that the empty branch renders."
    );
    return;
  }

  assert.match(grounded.context, /RETRIEVED LIBRARY CHUNK TEXT \(\d+ of \d+ chunk id\(s\) resolved/,
    "a Library-grounded trace must render the resolved-count header");
  const chunkBlock = grounded.context.match(/--- CHUNK \[id: ([0-9a-f-]{36})\] \[TITLE: [^\]]*\] \[citeable: [^\]]*\] ---\n(.+)/);
  assert.ok(chunkBlock, "a Library-grounded trace must render at least one --- CHUNK [id: ...] --- block");
  assert.ok(chunkBlock[2].trim().length > 0,
    "the chunk block must carry real text -- an id with an empty body is the pre-LOG-143(d) state");
  assert.ok(grounded.context.includes("trimmed to 1200 characters"),
    "the section must state its own per-chunk trim, so a claim resting on trimmed text is not read " +
    "as a claim resting on nothing");
}

selfRun(import.meta.url, run);
