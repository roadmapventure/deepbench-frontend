// DeepBench v7.0.16 | api/prompt/ai-enrichment.js | HAR-02b -- render split: stable-phase sections
// render into system_prompt_stable, volatile-phase into system_prompt_volatile (missing prompt_phase
// defaults volatile -- a wrongly-volatile section only loses caching; a wrongly-stable one would
// poison the cache key). system_prompt remains and equals stable + separator + volatile (no dangling
// separator on an empty half) -- every existing consumer keeps working, and the concatenation IS the
// reordered prompt. REFLECT insertion is now order-driven (fetch_instruction.inserts_after retired:
// splicing after 'behavior' would re-interleave per-call content into the stable prefix). A
// synthesis rewrite collapses the whole prompt to volatile (no stable byte-prefix survives it).
// DeepBench v7.0.10 | api/prompt/ai-enrichment.js | AA-179c -- the assembly event family
// (`assembly_work` / `assembly_work_complete`) emitted on the same opt-in onEvent seam execute.js's
// delegation + prompt_assembled frames already use, plus §19p span identity onto Dan Bingham's two
// logActivity rows and Michelle Manning's roster fetch. Default handler passes no onEvent -- no-op,
// byte-identical for every non-streaming caller.
// DeepBench v6.3.228 | api/prompt/ai-enrichment.js | DAT-12 -- forward fetch_instruction.retrieval_scope
// into queryContent(). One added argument, no logic.
// DeepBench v6.3.142 | api/prompt/ai-enrichment.js | LOG-67 -- forward the config-half signature snapshot through enrichPrompt()
// DeepBench v6.3.136 | api/prompt/ai-enrichment.js | LOG-37a-patch -- gate chunk ids on real retrieval, capture the retrieval method
// FEATURE: LOG-37a-patch -- ARCHITECTURE.md §19i Layer A fact 7: record *how* context was fetched,
// not just that it was. LOG-37a (v6.3.132) populated _rag_chunk_ids from `result.chunks` for every
// source, but a plain table read returns a field literally named `chunks` too -- getRosterCandidates()
// (lib/project-manager.js) yields `chunks: [{ id: <agent_id> }]`. Agent ids were therefore about to
// land in a column that is supposed to hold retrieved-document ids. The fix is not a roster special
// case: the method is derived generically from fi.source and recorded as its own fact, and chunk ids
// are kept only when that method is a real similarity search.
// DeepBench v6.3.132 | api/prompt/ai-enrichment.js | LOG-37 -- stop discarding real retrieved chunk ids
// FEATURE: LOG-37 -- ARCHITECTURE.md §19i Layer A. Every retrieval path (queryRAG, queryContent's
// the_library/the_reasoning/the_library_catalog branches) already returns `chunks` with real row
// ids; fetchSection() kept only `result.matchCount` and dropped `result.chunks` on the floor one
// line from where it could be saved. The ids are now threaded upward exactly the way the existing
// `_rag_chunks` count already is, so request-receivable.js can record which chunks actually came
// back rather than only how many. Additive: `rag_chunks_by_section` and every other debug field
// keep their existing shape and meaning.
// DeepBench v6.1.32 | api/prompt/ai-enrichment.js | AA-107 -- the_library + the_reasoning both route through lib/search-harness.js
// FEATURE: AA-43 — Takes Prompt Request, fetches runtime data, renders assembled system prompt

import { queryRAG } from "../../lib/rag.js";
import { queryContent } from "../../lib/search-harness.js";
import { getRosterCandidates } from "../../lib/project-manager.js";
import { logActivity } from '../../lib/activity-log.js';

export const config = { maxDuration: 60, runtime: "nodejs" };

const RAG_TIMEOUT_MS = 10000;

// FEATURE: LOG-37a-patch -- the two sources whose fetch is a plain table read: `roster` goes to
// getRosterCandidates() (a Supabase select over the agent roster) and `the_library_catalog` to
// describeLibraryCatalog() (a catalog listing). Neither embeds anything, so neither can produce a
// retrieved chunk. Every other source -- the_library / the_reasoning via queryContent(), and the
// null/unknown fallthrough via queryRAG() -- runs a real embedding similarity search.
const DIRECT_LOOKUP_SOURCES = new Set(['roster', 'the_library_catalog']);

// FEATURE: AA-179c -- who owns each brokered assembly source (§19e's LOCKED registry: Eleanor
// owns the_library, Michelle the roster directory; §19 rule 16 precedent for naming a service
// owner at its call site). Attribution label only -- nothing may ever branch on these values
// (.claude/rules/capabilities-are-data.md). Sources absent here are the requesting agent's own
// work (§19f Content-Owner Access) and attribute to requestingAgentId.
const ASSEMBLY_ATTRIBUTION = { the_library: "eleanor", the_library_catalog: "eleanor", roster: "michelle" };

// FEATURE: LOG-37a-patch -- derived from the same generic fi.source trait fetchSection() already
// branches on, never from who the agent is or which capability is running
// (.claude/rules/capabilities-are-data.md). Unknown/absent sources fall through to
// 'similarity-search' because that is where fetchSection() itself routes them (queryRAG).
function retrievalMethodFor(source) {
  return DIRECT_LOOKUP_SOURCES.has(source) ? 'direct-lookup' : 'similarity-search';
}

async function fetchWithTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("RAG fetch timeout")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// FEATURE: AA-179c -- `spanId` joins the existing `traceId` positional so the two brokered fetches
// below can stamp the run's §19p identity on the rows they write. No emit lives in here: the
// completion frame is attached at the STEP 1 call site instead (see there for why).
async function fetchSection(section, taskContext, tenantId, requestingAgentId, traceId = null, spanId = null) {
  if (section.type === "stored") return { ...section };

  if (section.type === "rag") {
    const fi = section.fetch_instruction;
    try {
      // FEATURE: AA-107 -- fi.source === "the_library" and "the_reasoning" both route through
      // lib/search-harness.js's queryContent() -- the single public entry point for either store
      // (ARCHITECTURE.md §19f). "the_library" behavior is unchanged: search-harness.js's the_library
      // branch is a thin pass-through to lib/librarian.js's existing queryLibrary(), proven
      // byte-identical by S-ARCH-REASONING-LAYER-01a's M1/M2 regression test. There is no fallback
      // branch for either value -- same "exactly one path" posture AG-30 established for the_library.
      const result = fi.source === "roster"
        // FEATURE: AA-179c -- Michelle Manning's roster read already writes an `agent-directory`
        // row per fetch; it just had no way to say which run it belonged to. Both values are the
        // requesting execution's own (§19p: identity travels with the work it credits).
        ? await fetchWithTimeout(getRosterCandidates({ requestingAgentId, traceId, spanId }), RAG_TIMEOUT_MS)
        : (fi.source === "the_library" || fi.source === "the_reasoning" || fi.source === "the_library_catalog")
        ? await fetchWithTimeout(
            queryContent({
              requestingAgentId,
              store: fi.source,
              queryText: taskContext,
              tenantId,
              matchCount: fi.match_count || 5,
              data_room_tag: fi.data_room_tag || undefined,
              // FEATURE: DAT-12 -- read off the fetch_instruction the same way data_room_tag above
              // already is. A request-level value stamped by db-assembly.js, never inferred from who
              // is calling or which capability is running (.claude/rules/capabilities-are-data.md).
              retrieval_scope: fi.retrieval_scope || undefined,
              // FEATURE: AA-179c -- deliberate pre-wiring for AA-179d (Eleanor Voss's library
              // linkage): queryContent() destructures a fixed set of named options, so these two
              // are inert extras today and become the identity d stamps on the Librarian's own
              // rows without needing a second api/ change. Verified against lib/search-harness.js
              // this session -- plain destructuring, no rest capture, no schema validation.
              traceId,
              spanId,
            }),
            RAG_TIMEOUT_MS
          )
        : await fetchWithTimeout(
            queryRAG({
              queryText: taskContext,
              agentId: fi.agent_id || null,
              tenantId,
              matchCount: fi.match_count || 5,
              scope: fi.scope || "agent",
            }),
            RAG_TIMEOUT_MS
          );
      // FEATURE: LOG-37a-patch -- computed once here so the ids below can be gated on it.
      const ragMethod = retrievalMethodFor(fi.source);
      return {
        ...section,
        content: result.context || "",
        _rag_chunks: result.matchCount || 0,
        // FEATURE: LOG-37a-patch -- how this section's context was fetched. Sibling of the count
        // and the ids, threaded the same way.
        _rag_method: ragMethod,
        // FEATURE: LOG-37 -- real ids of the chunks this section actually retrieved. Sibling of
        // the count above, threaded the same way; empty array when a path returns no chunks.
        // FEATURE: LOG-37a-patch -- and empty whenever nothing was actually retrieved. A direct
        // lookup's `chunks` are table rows whose ids are agent ids / catalog ids, not chunk ids;
        // they are discarded rather than renamed, because they have no Layer A home here.
        _rag_chunk_ids: ragMethod === 'similarity-search'
          ? (result.chunks || []).map(c => c && c.id).filter(Boolean)
          : [],
        _rag_scope_effective: fi.source === "roster" ? "roster" : (fi.source === "the_library" || fi.source === "the_reasoning" || fi.source === "the_library_catalog") ? fi.source : ((fi.scope === "agent" && fi.agent_id) ? "agent" : "platform"),
        _librarian_tier: result._librarian?.tier || result._access?.tier || null,
      };
    } catch (e) {
      console.warn(`[ai-enrichment] RAG fetch failed for section ${section.slug}:`, e.message);
      return { ...section, content: "", _fetch_error: e.message };
    }
  }

  // reflect and synthesis sections: skip in Step 1, handled in Steps 3+4
  return { ...section };
}

// FEATURE: AA-44 — Format section gains title instruction for deliverable title generation
function renderSection(section) {
  if (!section.content) return null;
  let content = section.content;
  if (section.slug === 'format') {
    content = content + '\n\nAlso return a "title" field (max 8 words) that describes the actual content you produced — not the task goal, but what you actually generated.';
  }
  return `=== ${section.label} ===\n${content}`;
}

// FEATURE: HAR-02b -- the one separator both halves and the concatenation use.
const SECTION_SEPARATOR = "\n\n---\n\n";

// FEATURE: HAR-02b -- the real split helper, exported so the Node test imports THIS implementation
// rather than a hand-copied one (tests/regression convention). Takes rendered entries
// ({ prompt_phase, text }) in final section order and returns the two phase halves plus their
// concatenation. Invariants: system_prompt === system_prompt_stable + SECTION_SEPARATOR +
// system_prompt_volatile when both halves are non-empty; an empty half never leaves a dangling
// separator; an entry with a missing/unknown prompt_phase lands in volatile (defensive: a
// wrongly-volatile section only loses caching, a wrongly-stable one would poison the cache key).
// Because db-assembly.js orders all stable sections before all volatile ones, the concatenation is
// byte-identical to joining the entries in their given order.
export function assemblePhaseSplit(renderedEntries) {
  const stableBlocks = [];
  const volatileBlocks = [];
  for (const e of renderedEntries) {
    if (!e || !e.text) continue;
    (e.prompt_phase === "stable" ? stableBlocks : volatileBlocks).push(e.text);
  }
  const system_prompt_stable = stableBlocks.join(SECTION_SEPARATOR);
  const system_prompt_volatile = volatileBlocks.join(SECTION_SEPARATOR);
  const system_prompt = (system_prompt_stable && system_prompt_volatile)
    ? system_prompt_stable + SECTION_SEPARATOR + system_prompt_volatile
    : (system_prompt_stable || system_prompt_volatile);
  return { system_prompt, system_prompt_stable, system_prompt_volatile };
}

// FEATURE: AA-179c -- `span_id`/`parent_span_id`/`onEvent` are all optional and all default to the
// pre-AA-179c behavior: no caller that omits them (api/plan.js's two calls, this file's own default
// handler) changes by a single byte. `onEvent` is normalized to a no-op exactly the way
// execute.js's runCapability() normalizes its own `_onEvent`, so the emit sites below never branch
// on whether anyone is listening.
export async function enrichPrompt({ prompt_request, agent_id, capability_slug, trace_id = null,
  span_id = null, parent_span_id = null, onEvent = null }) {
  const emit = onEvent || (() => {});
  const promptRequest = prompt_request;
  if (!promptRequest || typeof promptRequest !== "object") {
    throw new Error("Prompt Request body required");
  }

  const { sections = [], task_context = "", tenant_id = "global", format_contract, synthesis, llm, agent_id: pr_agent_id, capability_slug: pr_capability_slug, intent_technical_services = [] } = promptRequest;
  // FEATURE: AA-57 — task_context may be an object {goal, deliverable_type}; extract string for RAG + Reflect
  const taskContextStr = typeof task_context === 'object' && task_context !== null
    ? (task_context.goal || JSON.stringify(task_context))
    : (task_context || "");
  const effectiveAgentId = agent_id || pr_agent_id || null;
  const effectiveCapabilitySlug = capability_slug || pr_capability_slug || null;

  // Guard: empty sections
  if (!sections.length) {
    return {
      system_prompt: "",
      // FEATURE: HAR-02b -- same shape as the main return; both halves empty on the guard path.
      system_prompt_stable: "",
      system_prompt_volatile: "",
      sections: {},
      format_contract: format_contract || { output_type: "html", skill_profile_slug: null, schema: null },
      llm: llm || { provider: "anthropic", model: "claude-sonnet-4-6", max_tokens: 4000, api_key_source: "platform" },
      agent_id: effectiveAgentId,
      capability_slug: effectiveCapabilitySlug,
      intent_technical_services,
      // FEATURE: LOG-67 -- forward the config-half snapshot from assemblePrompt() untouched, even on
      // the empty-sections guard path; enrichment neither reads nor changes it.
      signature_config: promptRequest.signature_config ?? null,
      debug: {
        sections_assembled: 0,
        sections_omitted: [],
        fetch_errors: [],
        warn: "no_sections_assembled",
        rag_retrieved: false,
        reflect_ran: false,
        synthesis_ran: false,
      },
    };
  }

  // STEP 1 — FETCH: run stored pass-through + RAG fetches in parallel
  const nonReflectSections = sections.filter(s => s.type !== "reflect");
  const fetchedSections = await Promise.all(
    // FEATURE: AA-179c -- completion-only, one frame per RAG fetch, attached as each individual
    // fetch resolves: this .then() runs before Promise.all's barrier, so the stream shows real
    // arrival order rather than a batch dumped after the slowest fetch. Attached HERE rather than
    // inside fetchSection() for two reasons: (1) fetchSection()'s success path lives inside its own
    // try/catch, where a throwing handler would be swallowed and would silently turn a successful
    // fetch into an omitted section -- exactly the kind of quiet corruption LAV-1d's guard lesson
    // was about; (2) every field the frame needs (the worker, the requesting agent, the capability,
    // the run's identity) is already in scope out here, so nothing has to be threaded inward.
    // A failed fetch emits nothing -- it already surfaces to the caller as an omitted section plus
    // a fetch_errors entry, and inventing a failure frame here would be a second, softer claim
    // about the same event. `stored` sections emit nothing either: no work happened.
    nonReflectSections.map(s => fetchSection(s, taskContextStr, tenant_id, effectiveAgentId, trace_id, span_id).then(fetched => {
      if (s.type === "rag" && !fetched._fetch_error) {
        const source = s.fetch_instruction?.source ?? 'knowledge';
        emit({ type: 'assembly_work_complete', work: 'fetch',
          agentId: ASSEMBLY_ATTRIBUTION[source] ?? effectiveAgentId ?? null,
          forAgentId: effectiveAgentId ?? null, toCapabilitySlug: effectiveCapabilitySlug ?? null,
          source, matchCount: fetched._rag_chunks || 0,
          trace_id, span_id, parent_span_id });
      }
      return fetched;
    }))
  );

  // STEP 2 — RENDER: assemble text blocks in section order
  const orderedFetched = [...fetchedSections].sort((a, b) => (a.order || 0) - (b.order || 0));
  const renderedMap = {};
  const omitted = [];
  const fetchErrors = [];
  const ragChunksBySection = {};
  // FEATURE: LOG-37 -- parallel to ragChunksBySection above, ids instead of counts.
  const ragChunkIdsBySection = {};
  // FEATURE: LOG-37a-patch -- same shape again, method instead of ids/counts.
  const ragMethodBySection = {};
  // FEATURE: S-APPLE-02b — fetchSection() sets _librarian_tier per-section when the broker
  // engages, but it was never captured before this loop discards non-render fields. Additive,
  // opt-in: stays null for every call that doesn't route through the Librarian broker.
  let librarianTier = null;

  for (const s of orderedFetched) {
    if (s._fetch_error) fetchErrors.push({ slug: s.slug, error: s._fetch_error });
    if (s._librarian_tier) librarianTier = s._librarian_tier;
    if (!s.content) { omitted.push(s.slug); continue; }
    renderedMap[s.slug] = s.content;
    if (s._rag_chunks !== undefined) ragChunksBySection[s.slug] = s._rag_chunks;
    // FEATURE: LOG-37 -- same guard shape as the count above; empty arrays are skipped so a
    // section that retrieved nothing adds no key, matching rag_chunks_by_section's behavior of
    // only carrying sections that actually went through a fetch.
    if (s._rag_chunk_ids !== undefined && s._rag_chunk_ids.length > 0) ragChunkIdsBySection[s.slug] = s._rag_chunk_ids;
    // FEATURE: LOG-37a-patch -- same guard shape again, minus the length check (a method is a
    // scalar and is always meaningful when a fetch ran, even when it retrieved nothing).
    if (s._rag_method !== undefined) ragMethodBySection[s.slug] = s._rag_method;
  }

  // FEATURE: HAR-02b -- rendered entries carry order + prompt_phase alongside the text so the
  // phase split (and REFLECT's order-driven insertion below) never re-derives either. Entries are
  // already in final section order (orderedFetched is order-sorted, and all stable orders sort
  // before all volatile orders as of db-assembly.js's renumbering).
  const renderedEntries = orderedFetched
    .filter(s => renderedMap[s.slug])
    .map(s => ({
      slug: s.slug,
      order: s.order || 0,
      prompt_phase: s.prompt_phase === "stable" ? "stable" : "volatile",
      text: renderSection({ ...s, content: renderedMap[s.slug] }),
    }));

  let { system_prompt: assembledPrompt, system_prompt_stable: stablePrompt, system_prompt_volatile: volatilePrompt } = assemblePhaseSplit(renderedEntries);

  // STEP 3 — REFLECT
  const reflectSection = sections.find(s => s.type === "reflect");
  let reflectRan = false;
  let reflectTokensUsed = 0;
  let reflectModel = null;
  let reflectUsage = null;

  if (reflectSection) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      // FEATURE: AA-179c -- the model this step is about to request, read off the same
      // fetch_instruction the request body below reads, hoisted out of the try so the start and
      // the complete frame carry one identical real value rather than two separate reads.
      const reflectModelRequested = reflectSection.fetch_instruction?.model || "claude-haiku-4-5-20251001";
      // FEATURE: AA-179c -- gates the finally below so a complete frame can only ever follow a
      // start frame: if prompt assembly throws before the call is made, no work started and
      // neither frame fires.
      let reflectStarted = false;
      try {
        // FEATURE: AA-60 — use traits.reflect_prompt from fetch_instruction when present
        const fi = reflectSection.fetch_instruction;
        const identityText = renderedMap["identity"] || renderedMap["behavior"] || "";
        const knowledgeText = renderedMap["knowledge"] || Object.entries(renderedMap).find(([k]) => k.startsWith("knowledge-"))?.[1] || "";

        const reflectPrompt = fi.reflect_prompt
          ? `${fi.reflect_prompt}\n\n${identityText ? `## YOUR ROLE & IDENTITY\n${identityText}\n\n` : ""}${knowledgeText ? `## YOUR BACKGROUND KNOWLEDGE\n${knowledgeText}\n\n` : ""}## SPECIFIC TASK\n${taskContextStr}\n\nWrite a numbered execution plan. Be concrete — reference specific knowledge where it applies.`
          : `You are ${identityText ? identityText.split("\n")[0] : "an AI agent"}. Review your background knowledge and the task below. Write a numbered execution plan that reflects your role, incorporates relevant knowledge, and addresses this specific task concretely.\n\n${identityText ? `## YOUR ROLE & IDENTITY\n${identityText}\n` : ""}${knowledgeText ? `## YOUR BACKGROUND KNOWLEDGE\n${knowledgeText}\n` : ""}\n## SPECIFIC TASK\n${taskContextStr}\n\nWrite a numbered execution plan. Be concrete — reference specific knowledge where it applies.`;

        // FEATURE: AA-179c -- Dan Bingham's REFLECT is a real model call by a real agent, and it is
        // the first thing this seam does that a user would recognize as work. Emitted here, at the
        // last possible moment before the call goes out, so the frame means "this started" and not
        // "this was contemplated".
        emit({ type: 'assembly_work', work: 'reflect', agentId: 'dan',
          forAgentId: effectiveAgentId, toCapabilitySlug: effectiveCapabilitySlug,
          model: reflectModelRequested,
          trace_id, span_id, parent_span_id });
        reflectStarted = true;

        const reflectRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: fi.model || "claude-haiku-4-5-20251001",
            max_tokens: fi.max_tokens || 1024,
            messages: [{ role: "user", content: reflectPrompt }],
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (reflectRes.ok) {
          const reflectData = await reflectRes.json();
          const executionPlan = reflectData.content?.[0]?.text || "";
          reflectUsage = reflectData.usage || null;
          reflectTokensUsed = (reflectData.usage?.input_tokens || 0) + (reflectData.usage?.output_tokens || 0);
          reflectModel = fi.model || "claude-haiku-4-5-20251001";

          if (executionPlan) {
            // FEATURE: HAR-02b -- placement is order-driven now (fetch_instruction.inserts_after
            // retired at its source, db-assembly.js): the entry is inserted before the first
            // rendered entry with a higher order, honoring the reflect section's own order (12 --
            // volatile tail, after the task sections, before knowledge/VOICE). The old splice
            // targeted "right after behavior", which would have re-interleaved this per-call text
            // into the stable prefix. Fallback push covers only an entry set with no higher order
            // (impossible for assemblePrompt() output -- VOICE at 100 is always present).
            const reflectBlock = `=== ${reflectSection.label || "EXECUTION PLAN"} ===\n${executionPlan}`;
            const reflectEntry = {
              slug: reflectSection.slug || "reflect",
              order: reflectSection.order ?? 12,
              prompt_phase: reflectSection.prompt_phase === "stable" ? "stable" : "volatile",
              text: reflectBlock,
            };
            const insertIndex = renderedEntries.findIndex(e => (e.order || 0) > reflectEntry.order);
            if (insertIndex >= 0) {
              renderedEntries.splice(insertIndex, 0, reflectEntry);
            } else {
              renderedEntries.push(reflectEntry);
            }

            renderedMap[reflectSection.slug || "reflect"] = executionPlan;
            ({ system_prompt: assembledPrompt, system_prompt_stable: stablePrompt, system_prompt_volatile: volatilePrompt } = assemblePhaseSplit(renderedEntries));
            reflectRan = true;
          }
        }
      } catch (e) {
        console.warn("[ai-enrichment] REFLECT failed:", e.message);
      } finally {
        // FEATURE: AA-179c -- exactly one complete frame per started step, whichever way the step
        // ended: model returned, model returned non-ok, or the call threw. The step ENDING is the
        // fact; whether it produced usable output is not restated here as an invented ok/status
        // field (design rule: real fields only). `tokens` appears only when a real usage figure
        // came back -- a step that failed before usage exists reports no token count rather than 0.
        if (reflectStarted) {
          emit({ type: 'assembly_work_complete', work: 'reflect', agentId: 'dan',
            forAgentId: effectiveAgentId, toCapabilitySlug: effectiveCapabilitySlug,
            model: reflectModelRequested,
            ...(reflectTokensUsed > 0 ? { tokens: reflectTokensUsed } : {}),
            trace_id, span_id, parent_span_id });
        }
      }
    }
  }

  // STEP 4 — INTELLIGENT SYNTHESIS
  let synthesisRan = false;
  let synthesisTokensUsed = 0;
  let synthesisModel = null;
  let synthesisUsage = null;
  const tokenEstimatePreSynthesis = Math.round(assembledPrompt.length / 4);

  if (synthesis?.enabled) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      // FEATURE: AA-179c -- same shape as REFLECT above: the requested model hoisted so both
      // frames read one real value, and a started-flag so a complete can never appear alone.
      const synthesisModelRequested = synthesis.model || "claude-haiku-4-5-20251001";
      let synthesisStarted = false;
      try {
        // FEATURE: AA-61 — use traits.synthesis_prompt from synthesis object when present
        const baseInstruction = synthesis.prompt ||
          "You are a prompt optimization engine. The prompt below will be sent to an AI agent to complete a task. Rewrite it to be maximally clear, coherent, and efficient. Remove redundancy. Tighten language. Preserve all factual content, all constraints, and all output format instructions exactly. Do not add new instructions. Do not remove guardrails or format requirements.";

        const synthPrompt = `${baseInstruction} The rewritten prompt must be under ${synthesis.max_tokens || 2048} tokens.\n\n${assembledPrompt}`;

        // FEATURE: AA-179c -- Dan Bingham's second real model call at this seam. Same placement
        // rule as REFLECT: emitted immediately before the request goes out.
        emit({ type: 'assembly_work', work: 'synthesis', agentId: 'dan',
          forAgentId: effectiveAgentId, toCapabilitySlug: effectiveCapabilitySlug,
          model: synthesisModelRequested,
          trace_id, span_id, parent_span_id });
        synthesisStarted = true;

        const synthRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: synthesis.model || "claude-haiku-4-5-20251001",
            max_tokens: synthesis.max_tokens || 2048,
            messages: [{ role: "user", content: synthPrompt }],
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (synthRes.ok) {
          const synthData = await synthRes.json();
          const rewritten = synthData.content?.[0]?.text || "";
          synthesisUsage = synthData.usage || null;
          synthesisTokensUsed = (synthData.usage?.input_tokens || 0) + (synthData.usage?.output_tokens || 0);
          synthesisModel = synthesis.model || "claude-haiku-4-5-20251001";
          if (rewritten) {
            assembledPrompt = rewritten;
            // FEATURE: HAR-02b -- a synthesis rewrite is a fresh per-call text; no stable byte
            // prefix survives it, so the whole rewritten prompt is volatile (defensive direction:
            // wrongly-volatile only loses caching). The split-join invariant holds via the
            // empty-stable case: system_prompt === system_prompt_volatile, no dangling separator.
            stablePrompt = "";
            volatilePrompt = rewritten;
            synthesisRan = true;
          }
        }
      } catch (e) {
        console.warn("[ai-enrichment] Synthesis failed:", e.message);
      } finally {
        // FEATURE: AA-179c -- one complete per started step, same three exit paths as REFLECT.
        if (synthesisStarted) {
          emit({ type: 'assembly_work_complete', work: 'synthesis', agentId: 'dan',
            forAgentId: effectiveAgentId, toCapabilitySlug: effectiveCapabilitySlug,
            model: synthesisModelRequested,
            ...(synthesisTokensUsed > 0 ? { tokens: synthesisTokensUsed } : {}),
            trace_id, span_id, parent_span_id });
        }
      }
    }
  }

  // FEATURE: AA-190c -- migrated onto the shared logActivity() service (AA-190 site 1);
  // fixed the stale 'reflection' slug (AI-50c renamed the catalog to 'reflect' 2026-07-14,
  // this write site was never updated -- 18 real calls were invisible), the wrong
  // 'prompt-chaining' tag on synthesis (correct slug is 'intelligent-synthesis', confirmed
  // AA-190 site 2), and the summed-into-input_tokens/output_tokens:0 mispricing bug (real
  // split usage was already being computed and then discarded -- now passed through).
  if (reflectRan && reflectTokensUsed > 0) {
    logActivity({
      agentId: 'dan', aiType: 'reflect', feature: 'ai-enrichment',
      model: reflectModel,
      inputTokens: reflectUsage?.input_tokens ?? null,
      outputTokens: reflectUsage?.output_tokens ?? null,
      patternsUsed: ['reflect'],
      traceId: trace_id,
      // FEATURE: AA-179c -- §19p: these rows already carried the trace but not the span, so Dan's
      // enrichment work could not be tied to the specific execution that requested it. Both values
      // are the requesting execution's own -- REFLECT runs inside it, it is not a delegate with a
      // span of its own, so attaching the caller's span here credits the right call, not a
      // fabricated child (the rule's "never attach the outer requester's span to a delegate's row"
      // is about delegates; this is the same execution's own pre-loop work).
      spanId: span_id, parentSpanId: parent_span_id,
    });
  }
  if (synthesisRan && synthesisTokensUsed > 0) {
    logActivity({
      agentId: 'dan', aiType: 'synthesis', feature: 'ai-enrichment',
      model: synthesisModel,
      inputTokens: synthesisUsage?.input_tokens ?? null,
      outputTokens: synthesisUsage?.output_tokens ?? null,
      patternsUsed: ['intelligent-synthesis'],
      traceId: trace_id,
      // FEATURE: AA-179c -- same §19p linkage as the reflect row above.
      spanId: span_id, parentSpanId: parent_span_id,
    });
  }

  return {
    system_prompt: assembledPrompt,
    // FEATURE: HAR-02b -- the stable/volatile boundary, threaded outward so S-HAR-02c can place
    // cache_control breakpoints on it. system_prompt above remains the single source every current
    // consumer reads and always equals the two halves joined (see assemblePhaseSplit()).
    system_prompt_stable: stablePrompt,
    system_prompt_volatile: volatilePrompt,
    sections: renderedMap,
    format_contract: format_contract || { output_type: "html", skill_profile_slug: null, schema: null },
    llm: llm || { provider: "anthropic", model: "claude-sonnet-4-6", max_tokens: 4000, api_key_source: "platform" },
    agent_id: effectiveAgentId,
    capability_slug: effectiveCapabilitySlug,
    intent_technical_services,
    // FEATURE: LOG-67 -- forward the config-half snapshot from assemblePrompt() untouched; enrichment
    // neither reads nor changes it. Every sendRequest() caller passes the enriched object through as
    // prompt_request, so this one line carries the config-half to the request-receivable write path.
    signature_config: promptRequest.signature_config ?? null,
    debug: {
      sections_assembled: Object.keys(renderedMap).length,
      sections_omitted: omitted,
      fetch_errors: fetchErrors,
      rag_retrieved: Object.keys(ragChunksBySection).length > 0,
      rag_chunks_by_section: ragChunksBySection,
      // FEATURE: LOG-37 -- Layer A source for call_facts.retrieved_chunk_ids. Flattening,
      // de-duplication and the 50-id cap happen in request-receivable.js's buildCallFacts(),
      // which is the single place that assembles the written fact object.
      rag_chunk_ids_by_section: ragChunkIdsBySection,
      // FEATURE: LOG-37a-patch -- Layer A source for call_facts.retrieval_method. Collapsing the
      // per-section methods into the single written fact ('mixed' when both appear) happens in
      // request-receivable.js's buildCallFacts(), same division of labour as the ids above.
      rag_method_by_section: ragMethodBySection,
      librarian_tier: librarianTier,
      rag_scope_requested: sections.find(s => s.type === "rag")?.fetch_instruction?.scope || null,
      rag_scope_effective: Object.keys(ragChunksBySection).length > 0
        ? (sections.find(s => s.type === "rag")?.fetch_instruction?.agent_id ? "agent" : "platform")
        : null,
      reflect_ran: reflectRan,
      reflect_model: reflectModel,
      reflect_tokens_used: reflectTokensUsed,
      synthesis_ran: synthesisRan,
      synthesis_model: synthesisModel,
      synthesis_tokens_used: synthesisTokensUsed,
      token_estimate_pre_synthesis: tokenEstimatePreSynthesis,
      token_estimate_post_synthesis: Math.round(assembledPrompt.length / 4),
      token_budget: llm?.max_tokens || 4000,
    },
  };
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const result = await enrichPrompt({ prompt_request: req.body });
    return res.status(200).json(result);
  } catch (e) {
    console.error('[ai-enrichment] error:', e);
    return res.status(500).json({ error: e.message });
  }
}
