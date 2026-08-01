// DeepBench v7.0.34 | api/prompt/db-assembly.js | LOG-121 -- handler wrapped in
// withRequestContext(). This route reaches no logActivity() call today -- wrapping it is inert now
// and means a logging site added here later cannot silently lose attribution.
// DeepBench v7.0.16 | api/prompt/db-assembly.js | HAR-02b-patch3 -- intent moved to order 5, LAST in
// the stable run, restoring the intent->task adjacency the first stable-first cut broke (live A/B:
// case 6 routing 4/4, case 5 continue-cap 2/2). Stable run is now format 1, identity 2, behavior 3,
// guardrails 4, intent 5; volatile tail unchanged. See the SKILL_ORDER comment for the full record.
// DeepBench v7.0.16 | api/prompt/db-assembly.js | HAR-02b -- stable-first prompt reorder: every
// section carries prompt_phase ('stable' = agent-constant content, 'volatile' = per-call content)
// and order values are renumbered so ALL stable sections sort before ALL volatile ones (Anthropic
// prompt caching is a byte-prefix match -- per-call content interleaved into the middle of stable
// content, the pre-7.0.16 layout, capped the cacheable prefix at Format+Intent). Intra-group
// relative order preserved exactly; VOICE stays the absolute last section (AA-127). No cache_control
// is added this session -- the reorder ships alone so S-HAR-02b's A/B isolates the behavior change.
// DeepBench v7.0.14 | api/prompt/db-assembly.js | HAR-27 -- web_search_max_uses trait read (positive
// integer only), carried on the returned llm object; merged after the profile loop so a later Format
// Skill Profile's wholesale llm rebuild can't drop it. Absent/invalid trait -> key omitted entirely.
// DeepBench v7.0.13 | api/prompt/db-assembly.js | LOO-28 -- enable_parallel_tool_use trait passthrough
// (parallelization pattern, native Anthropic parallel tool use), effective boolean computed here as
// enableParallelToolUse && !delegationRequired (a delegation_required intent never fans -- its whole
// job is one terminal hand-off). Generic trait read, no identity conditional; dormant until an Intent
// Skill Profile opts in.
// DeepBench v7.0.7 | api/prompt/db-assembly.js | AGT-54 -- AA-121's intent_allowlist gate hoisted out
// of the knowledge-only branch to fire generically for any skill type; a Guardrails Skill reaching a
// routing/classification intent was skewing its answer (channel-intelligence's ci-routing-intent).
// DeepBench v6.3.228 | api/prompt/db-assembly.js | DAT-12 -- assemblePrompt() accepts a request-level
// retrieval_scope and buildSections() stamps it onto the knowledge branch's fetch_instruction. Never
// read from traits -- see the buildSections() comment for why that distinction is the whole point.
// DeepBench v6.3.142 | api/prompt/db-assembly.js | LOG-67 -- snapshot the runtime-signature config-half into call_facts at write time
// DeepBench v6.1.40 | api/prompt/db-assembly.js | AA-121 — Knowledge Skill Profile intent_allowlist gate
// DeepBench v6.1.13 | api/prompt/db-assembly.js | AA-142 — delegationRequired passthrough
// FEATURE: AA-03 patch + AA-43 — Reads agent competency data, returns fully assembled Prompt Request

import { withRequestContext } from '../../lib/request-context.js';

export const config = { maxDuration: 30, runtime: "nodejs" };

// FEATURE: HAR-02b -- stable sections (agent-constant content) occupy orders 1-5; volatile sections
// (per-call content: prior-conversation 10, current-task/task-details 11, reflect 12, knowledge-* 13,
// voice 100) occupy 10+. knowledge moved 5 -> 13 (RAG content is fetched per call).
// FEATURE: HAR-02b-patch3 -- intent moved to 5, LAST in the stable run (John-approved regression
// fix). The pre-reorder layout had the Intent section's instructions immediately adjacent to the
// CURRENT TASK text (orders 2 -> 2.5); the first stable-first cut inserted identity/behavior/
// guardrails between them, which deterministically broke routing classification (live A/B: case 6
// upgrade-cycles routed direct instead of forecast, 4/4) and tripped the 10-continue cap (case 5
// reseller-reqs, 2/2). Intent at 5 restores the intent->task adjacency -- the volatile tail
// (prior-conversation/current-task) starts directly after it -- while staying fully
// cache-compatible: phase membership and section content are unchanged, only stable-run order.
// skill_types display_order values in Supabase are display metadata and deliberately NOT changed
// to track any of this -- SKILL_ORDER is a render-order constant, not a display-order mirror.
const SKILL_ORDER = { format: 1, identity: 2, behavior: 3, guardrails: 4, intent: 5, knowledge: 13 };

// FEATURE: HAR-02b -- prompt_phase per skill type. 'stable' renders in the cacheable prefix;
// 'volatile' renders in the per-call tail. knowledge is volatile because its content is fetched
// per call (RAG). Unknown/future types default to 'volatile' at the stamp site below -- a
// wrongly-volatile section only loses caching; a wrongly-stable one would poison the cache key.
const SKILL_PHASE = { format: "stable", intent: "stable", identity: "stable", behavior: "stable", guardrails: "stable", knowledge: "volatile" };

const DEFAULT_LLM = { provider: "anthropic", model: "claude-sonnet-4-6", max_tokens: 4000, api_key_source: "platform" };
// FEATURE: AA-44 — format_contract gains handler + guardrails for request-receivable
const DEFAULT_FORMAT_CONTRACT = {
  output_type: "html",
  skill_profile_slug: null,
  schema: null,
  handler: "store",
  guardrails: { must: [], must_not: [] }
};
const DEFAULT_SYNTHESIS = { enabled: false };

function getSupabaseHeaders(key) {
  return {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": `Bearer ${key}`,
  };
}

// FEATURE: DAT-12 -- retrievalScope is a REQUEST-level value threaded down from assemblePrompt()'s
// own caller, deliberately NOT read from `traits`. Reading it off Skill data would apply the scope to
// live CHI permanently, which is the exact outcome DAT-12's constraint forbids: the regression scopes
// its own reads, the screen keeps reading the whole corpus.
export function buildSections(skillProfiles, agentId, agentConfigs, agentRow, intentSlug, retrievalScope = null) {
  const sections = [];
  let reflectSection = null;
  let synthesisEnabled = false;
  let synthesisDeclaringSlug = null;
  let synthesisPromptText = null;
  let formatContract = { ...DEFAULT_FORMAT_CONTRACT };
  let llm = { ...DEFAULT_LLM };
  let canRequestHelp = false;
  let enableWebSearch = false;
  let webSearchMaxUses = null;
  let enableParallelToolUse = false;
  let delegationRequired = false;
  let requiresHumanConfirmation = false;
  let critiqueCapabilitySlug = null;
  let critiqueIntentSlug = null;
  let intentTechnicalServices = [];

  for (const sp of skillProfiles) {
    const typeSlug = sp.skill_type_slug;
    const order = SKILL_ORDER[typeSlug] ?? 99;
    const traits = sp.traits || {};

    // FEATURE: AA-121, hoisted AGT-54 -- optional intent_allowlist gate, now type-agnostic. Originally
    // scoped inside the knowledge branch only (RAG fetch cost on lightweight intents); AGT-44b/AGT-54
    // found the same unconditional-delivery problem on a Guardrails Skill (platform-language-guardrail
    // reaching channel-intelligence's ci-routing-intent, a 5-way classification call, skewed its answer
    // -- proven live, deterministic 3/3 both directions). A Skill Profile attaches to a Capability, not
    // an intent, so any type can carry this trait; the gate now reads it once, before the type dispatch
    // below, generic to every branch (`.claude/rules/capabilities-are-data.md`: a trait/field read, not
    // a type- or capability-keyed conditional). Opt-in: unset (every Skill Profile except this session's
    // opt-ins) is byte-identical to today -- fires on every call for its Capability, same as before.
    if (Array.isArray(traits.intent_allowlist) && traits.intent_allowlist.length > 0) {
      if (!intentSlug || !traits.intent_allowlist.includes(intentSlug)) {
        continue;
      }
    }

    let sectionType = "stored";
    let content = null;
    let fetchInstruction = null;

    if (typeSlug === "knowledge") {
      // FEATURE: AA-121 -- Knowledge Skill Profiles attach to a capability, not an intent, so
      // historically fired RAG unconditionally on every call for that capability -- including
      // lightweight, non-analytical intents that never reference retrieved content (e.g.
      // channel-intelligence's ci-routing-intent classification call, or ci-answer-display-intent's
      // pure hand-off routing). Confirmed live: ci-routing-intent was pulling ~4.3K tokens of RAG
      // context to decide a 5-way classification with a 95-token output. The intent_allowlist gate
      // itself is now hoisted above (AGT-54); this comment stays for the RAG-cost rationale specific
      // to this branch.
      sectionType = "rag";
      fetchInstruction = {
        method: "rag",
        agent_id: agentId || null,
        query_from: "task_context",
        match_count: 5,
        scope: agentId ? "agent" : "platform",
      };
      // FEATURE: AG-30 — traits.source passthrough, replaces the retired traits.broker opt-in.
      // Reads whatever source value the Skill Profile declares — never hardcoded to a name.
      if (traits.source) fetchInstruction.source = traits.source;
      // FEATURE: AG-33 -- data_room_tag passthrough, needed for any uber_access holder's the_library
      // RAG search (queryLibrary()'s uber_access branch requires an explicit tag, denies without one).
      // Generic: reads a new optional trait, not gated on any agent identity.
      if (traits.data_room_tag) fetchInstruction.data_room_tag = traits.data_room_tag;
      // FEATURE: DAT-12 -- stamped only when truthy, same style as the traits.source / data_room_tag
      // passthroughs above. Unset leaves the fetch_instruction byte-identical to today.
      if (retrievalScope) fetchInstruction.retrieval_scope = retrievalScope;
      // FEATURE: AA-173 -- optional per-profile retrieval-breadth override. Unset (every existing
      // Knowledge Skill Profile except this session's one opt-in on ci-knowledge) is byte-identical
      // to today -- match_count stays 5.
      if (Number.isInteger(traits.match_count) && traits.match_count > 0) {
        fetchInstruction.match_count = traits.match_count;
      }

    } else if (typeSlug === "identity") {
      // FEATURE: AA-66 — additive Identity assembly: agents table + all role_prompts + skill profile
      const parts = [];

      // Source 1: agents table — name, role, specialty
      if (agentRow) {
        const cardParts = [agentRow.name, agentRow.role, agentRow.specialty].filter(Boolean);
        if (cardParts.length) parts.push(cardParts.join(' · '));
      }

      // Source 2: all role_prompt entries from agent_configs (not just is_default)
      const rolePrompts = (agentConfigs || [])
        .filter(c => c.type === "role_prompt" && c.text)
        .map(c => c.text);
      parts.push(...rolePrompts);

      // Source 3: skill profile objective + method
      if (sp.objective) parts.push(sp.objective);
      if (sp.method) parts.push(sp.method);

      content = parts.filter(Boolean).join("\n") || null;

    } else if (typeSlug === "behavior") {
      const roleParts = (agentConfigs || [])
        .filter(c => c.type === "role_prompt")
        .map(c => c.text)
        .filter(Boolean);
      const traitParts = [];
      if (traits.reasoning_style) traitParts.push(`Reasoning style: ${traits.reasoning_style}`);
      if (traits.writing_style) traitParts.push(`Writing style: ${traits.writing_style}`);
      const allParts = [...roleParts, ...traitParts];
      content = allParts.length ? allParts.join("\n") : null;

    } else if (typeSlug === "intent") {
      const intentParts = [];
      if (sp.objective) intentParts.push(sp.objective);
      if (sp.method) intentParts.push(sp.method);
      if (traits.analysis_instructions) intentParts.push(traits.analysis_instructions);
      content = intentParts.length ? intentParts.join("\n") : null;

      // FEATURE: AA-75/AA-76 — Intent Skill Profiles can carry their own llm/schema data,
      // mirroring the format branch below (~line 114). Content-specialist capabilities are
      // barred from owning a Format Skill (ARCHITECTURE.md §19), so this is their only
      // data-driven path to per-call model/max_tokens/schema selection. Gated on
      // sp.slug === intentSlug (the SP the caller explicitly targeted via intent_slug) —
      // NOT just "llm_model happens to be set" — because several other Intent Skill Profiles
      // (e.g. dan-ai-enrichment's prompt-synthesis) already carry inert llm_model/max_tokens
      // values from when those columns were added platform-wide. Without this gate those
      // stray values would silently override the primary capability's llm selection whenever
      // they're loaded as one of several stacked Intent-type profiles (verified live: this
      // downgraded project-manager's Work Order flow from sonnet-4-6 to haiku-4-5 before the
      // gate was added). Byte-identical for every caller that doesn't pass intent_slug.
      if (intentSlug && sp.slug === intentSlug) {
        intentTechnicalServices = Array.isArray(sp.technical_services) ? sp.technical_services : [];
        if (sp.llm_provider || sp.llm_model) {
          llm = {
            provider: sp.llm_provider || DEFAULT_LLM.provider,
            model: sp.llm_model || DEFAULT_LLM.model,
            max_tokens: sp.max_tokens || DEFAULT_LLM.max_tokens,
            api_key_source: sp.api_key_source || DEFAULT_LLM.api_key_source,
          };
        }
        // FEATURE: AA-154 -- data-driven temperature, deliberately a separate `if`, not folded
        // into the llm_provider || llm_model gate above -- a Skill Profile may want to set only
        // temperature without also overriding model/max_tokens. Omitted entirely (not defaulted)
        // when unset, so every capability that doesn't opt in is byte-identical to today.
        if (sp.temperature !== null && sp.temperature !== undefined) {
          llm = { ...llm, temperature: sp.temperature };
        }
        if (traits.schema) {
          formatContract = {
            output_type: "json",
            skill_profile_slug: sp.slug,
            schema: traits.schema,
            handler: traits.handler || "store",
            guardrails: sp.guardrails || { must: [], must_not: [] },
          };
        }

        // FEATURE: AA-87 -- can_request_help/requires_human_confirmation passthrough,
        // ARCHITECTURE.md §19d/§19e. Read from the calling agent's own targeted Intent Skill
        // Profile, same gate as traits.schema above. Replaces the removed available_delegates
        // array -- no per-relationship data, no agent-naming, just two booleans plus (when the
        // second is true) a capability_slug/intent_slug to resolve live at dispatch time.
        if (traits.can_request_help === true) {
          canRequestHelp = true;
        }
        // FEATURE: HAR-05 -- enable_web_search passthrough, same gate/shape as can_request_help
        // directly above. Attaches Anthropic's web_search tool to this call only. Mechanical
        // pattern detection happens in request-receivable.js, never from this declaration alone
        // (ARCHITECTURE.md §19i -- a Skill Profile field may never be the sole source of a
        // logged pattern).
        if (traits.enable_web_search === true) {
          enableWebSearch = true;
        }
        // FEATURE: HAR-27 -- web_search_max_uses passthrough, same gate as enable_web_search
        // directly above. Caps Anthropic's server-side web_search searches for this call only
        // (max_uses on the tool definition, emitted in request-receivable.js). Accepted only as
        // a positive integer -- anything else (0, negative, float, string) is dropped right here
        // so an invalid value can never reach the Anthropic request body. Held in a local and
        // merged onto llm after the loop (see the pre-return merge below).
        if (Number.isInteger(traits.web_search_max_uses) && traits.web_search_max_uses > 0) {
          webSearchMaxUses = traits.web_search_max_uses;
        }
        // FEATURE: LOO-28 -- enable_parallel_tool_use passthrough, same gate/shape as
        // can_request_help above. Permits the model to emit several harness-tool calls in one
        // turn (the published parallelization pattern -- sectioning/voting -- carried natively
        // by Anthropic parallel tool use); whether sub-tasks are actually independent stays the
        // model's own per-turn judgment (§19d sniff test), never harness-forced. Read here,
        // combined with delegation_required at the return below.
        if (traits.enable_parallel_tool_use === true) {
          enableParallelToolUse = true;
        }
        // FEATURE: AA-142 -- delegation_required passthrough, same shape as can_request_help
        // directly above. Marks an intent whose entire job is completing a hand-off via
        // request_help/delegate_to_agent -- never a legitimate direct-text answer (unlike e.g.
        // hyp-stress-test-intent, which can validly answer in text). Read by execute.js's runLoop()
        // to catch the model narrating its hand-off instead of completing it.
        if (traits.delegation_required === true) {
          delegationRequired = true;
        }
        if (traits.requires_human_confirmation === true) {
          requiresHumanConfirmation = true;
          critiqueCapabilitySlug = traits.critique_capability_slug || null;
          critiqueIntentSlug = traits.critique_intent_slug || null;
        }
      }

    } else if (typeSlug === "format") {
      const outputType = traits.output_type || "html";
      const formatParts = [`Output type: ${outputType}`];
      if (traits.section_structure) formatParts.push(`Structure: ${traits.section_structure}`);
      content = formatParts.join("\n");

      // FEATURE: AA-44 — format_contract gains handler + guardrails for request-receivable
      formatContract = {
        output_type: outputType,
        skill_profile_slug: sp.slug,
        schema: traits.schema || null,
        handler: traits.handler || 'store',
        guardrails: sp.guardrails || { must: [], must_not: [] },
      };

      // LLM config from Format skill (SK-17 columns)
      if (sp.llm_provider || sp.llm_model) {
        llm = {
          provider: sp.llm_provider || DEFAULT_LLM.provider,
          model: sp.llm_model || DEFAULT_LLM.model,
          max_tokens: sp.max_tokens || DEFAULT_LLM.max_tokens,
          api_key_source: sp.api_key_source || DEFAULT_LLM.api_key_source,
        };
      }
      // FEATURE: AA-154 -- data-driven temperature, same separate-`if` pattern as the Intent
      // branch above.
      if (sp.temperature !== null && sp.temperature !== undefined) {
        llm = { ...llm, temperature: sp.temperature };
      }

    } else if (typeSlug === "guardrails") {
      const guardParts = (agentConfigs || [])
        .filter(c => c.type === "guardrail")
        .map(c => c.text)
        .filter(Boolean);
      if (sp.guardrails) {
        const g = sp.guardrails;
        if (Array.isArray(g)) guardParts.push(...g);
        else if (typeof g === "string") guardParts.push(g);
        else if (typeof g === "object") guardParts.push(JSON.stringify(g));
      }
      content = guardParts.length ? guardParts.join("\n") : null;
    }

    const section = {
      slug: typeSlug === "knowledge" ? `knowledge-${sp.slug}` : typeSlug,
      label: buildLabel(typeSlug, sp.name),
      skill_profile_slug: sp.slug,
      type: sectionType,
      content,
      fetch_instruction: fetchInstruction,
      required: sp.is_required ?? false,
      order,
      // FEATURE: HAR-02b -- unknown types default to volatile (see SKILL_PHASE comment).
      prompt_phase: SKILL_PHASE[typeSlug] ?? "volatile",
    };
    sections.push(section);

    // reflect detection
    const techServices = Array.isArray(sp.technical_services) ? sp.technical_services : [];
    if (techServices.includes("reflect") && !reflectSection) {
      reflectSection = {
        slug: "reflect",
        label: "EXECUTION PLAN",
        skill_profile_slug: sp.slug,
        type: "reflect",
        content: null,
        fetch_instruction: {
          method: "reflect",
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          // FEATURE: HAR-02b -- `inserts_after: "behavior"` removed. It was NOT display metadata:
          // ai-enrichment.js's STEP 3 spliced the generated plan into the rendered blocks right
          // after the behavior section, which would have re-interleaved per-call content into the
          // stable prefix. Placement is now order-driven (this section's own `order` below), same
          // mechanism as every other section; the field had no other consumer (grepped 2026-07-31).
          declared_by: sp.slug,
          reflect_prompt: traits.reflect_prompt || null,  // FEATURE: AA-60
        },
        required: false,
        order: 12,
        // FEATURE: HAR-02b -- generated fresh per call, so it lives in the volatile tail.
        prompt_phase: "volatile",
      };
    }

    // synthesis detection
    if (techServices.includes("intelligent-synthesis") && !synthesisEnabled) {
      synthesisEnabled = true;
      synthesisDeclaringSlug = sp.slug;
      synthesisPromptText = traits.synthesis_prompt || null;  // FEATURE: AA-61
    }
  }

  if (reflectSection) sections.push(reflectSection);

  sections.sort((a, b) => (a.order || 0) - (b.order || 0));

  const synthesis = synthesisEnabled
    ? { enabled: true, model: "claude-haiku-4-5-20251001", max_tokens: 2048, declared_by: synthesisDeclaringSlug, prompt: synthesisPromptText }
    : { enabled: false };

  // FEATURE: HAR-27 -- merged here, after the profile loop, NOT inline at the trait read: a
  // later-iterated Format Skill Profile with llm_provider/llm_model rebuilds llm wholesale
  // (~line 250 above) and would silently drop a key set mid-loop. Key omitted entirely when the
  // trait is absent/invalid -- every non-opted-in capability's llm object is byte-identical.
  if (webSearchMaxUses !== null) llm = { ...llm, web_search_max_uses: webSearchMaxUses };

  // FEATURE: LOO-28 -- the final effective boolean, computed here once from two generic trait
  // reads (design decision 3: a delegation_required intent never fans -- its entire job is a
  // single terminal hand-off, and two finals is undefined). No identity conditional anywhere
  // (.claude/rules/capabilities-are-data.md).
  return { sections, formatContract, synthesis, llm, canRequestHelp, enableWebSearch, delegationRequired, requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug, intentTechnicalServices, enableParallelToolUse: enableParallelToolUse && !delegationRequired };
}

function buildLabel(typeSlug, name) {
  const labels = {
    identity: "ROLE & IDENTITY",
    behavior: "BEHAVIOR",
    knowledge: "BACKGROUND KNOWLEDGE",
    intent: "INTENT",
    format: "OUTPUT FORMAT",
    guardrails: "CONSTRAINTS & GUARDRAILS",
  };
  return labels[typeSlug] || (name || typeSlug).toUpperCase();
}

// FEATURE: LOG-67 -- ARCHITECTURE.md §19k Log Writer, config-half. Projects the assembled skill
// set into the agent-agnostic config-half of the runtime signature. identity/behavior stripped
// (agent-agnostic, §19k rule 2); knowledge/intent/format only (rule 3). Ordered k->i->f, gaps
// removed -- the ordered jsonb array IS the "ordered projection" §19k caveat (b) requires (jsonb
// arrays preserve order; only object keys don't). Intent-type profiles arrive already scoped to
// the fired intent by assemblePrompt()'s existing S-APPLE-02b/AA-108 filter -- this function does
// not re-scope, it just projects what it's given (and includes only k/i/f, so a stray sibling
// intent could never enter anyway). Empty keys omitted; returns null when nothing to record.
const SIGNATURE_SKILL_TYPE_ORDER = ['knowledge', 'intent', 'format'];

export function buildSignatureConfig(skillProfiles = [], { capability_slug = null, execution_type = null } = {}) {
  const kept = (skillProfiles || []).filter(sp => SIGNATURE_SKILL_TYPE_ORDER.includes(sp.skill_type_slug));
  const ordered = [...kept].sort((a, b) =>
    (SIGNATURE_SKILL_TYPE_ORDER.indexOf(a.skill_type_slug) - SIGNATURE_SKILL_TYPE_ORDER.indexOf(b.skill_type_slug))
    || ((a.display_order ?? 0) - (b.display_order ?? 0)));

  const cfg = {};
  const slugs = ordered.map(sp => sp.slug).filter(Boolean);
  if (slugs.length) cfg.assembled_skill_slugs = slugs;
  if (capability_slug) cfg.capability_slug = capability_slug;

  const sources = [...new Set(ordered.map(sp => sp.traits?.source).filter(Boolean))];
  const allowlists = [...new Set(ordered.flatMap(sp => Array.isArray(sp.traits?.intent_allowlist) ? sp.traits.intent_allowlist : []).filter(Boolean))];
  const hasSchema = ordered.some(sp => sp.traits?.schema != null);
  const traits = {};
  if (sources.length) traits.source = sources;
  if (hasSchema) traits.schema = true;
  if (allowlists.length) traits.intent_allowlist = allowlists;
  if (Object.keys(traits).length) cfg.traits = traits;

  if (execution_type) cfg.execution_type = execution_type;
  return Object.keys(cfg).length ? cfg : null;
}

// FEATURE: LOG-67 -- merges the fact-half (buildCallFacts / logAgentTurn inline) with the
// config-half (buildSignatureConfig) into one call_facts object. Same "null when empty" contract
// logActivity() already relies on: {} or null both write SQL NULL. Config-half keys are disjoint
// from fact-half keys, so a flat spread is safe -- no key can collide.
export function mergeCallFacts(factHalf, configHalf) {
  const merged = { ...(factHalf || {}), ...(configHalf || {}) };
  return Object.keys(merged).length ? merged : null;
}

export async function assemblePrompt({ capability_slug, agent_id, tenant_id, task_context = {}, runtime_context = null, enrichment_capability_slug = null, intent_slug = null, retrieval_scope = null }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
  if (!supabaseKey) throw new Error("SUPABASE_SERVICE_KEY not configured");

  if (!tenant_id) throw new Error("tenant_id required");
  if (!task_context) throw new Error("task_context required");

  // Graceful degradation: no capability_slug and no agent_id → empty Prompt Request
  if (!capability_slug && !agent_id) {
    return {
      tenant_id,
      task_context,
      agent_id: null,
      capability_slug: null,
      agent_card: null,
      sections: [],
      format_contract: DEFAULT_FORMAT_CONTRACT,
      synthesis: DEFAULT_SYNTHESIS,
      llm: DEFAULT_LLM,
      canRequestHelp: false,
      enableWebSearch: false,
      enableParallelToolUse: false,
      delegationRequired: false,
      requiresHumanConfirmation: false,
      critiqueCapabilitySlug: null,
      critiqueIntentSlug: null,
      // FEATURE: LOG-67 -- no capability config on the degraded path; null keeps the field shape
      // consistent for the enrichment passthrough / write-path readers (never undefined).
      signature_config: null,
    };
  }

  const headers = getSupabaseHeaders(supabaseKey);

  let agentConfigs = [];
  let skillProfiles = [];
  // FEATURE: LOG-67 -- near-zero-variance signature field #14; sourced from the FK embed on the
  // primary-capability select below (no extra round trip). Stays null if PostgREST can't resolve
  // the embed -- the write is never blocked on it.
  let executionType = null;

  // 1. Load agent_configs if agent_id provided
  if (agent_id) {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/agent_configs?tenant_id=eq.${encodeURIComponent(tenant_id)}&agent_id=eq.${encodeURIComponent(agent_id)}&select=id,type,name,text,is_default`,
      { headers }
    );
    if (r.ok) agentConfigs = await r.json() || [];
  }

  // 2. Load skill_profiles for the given capability_slug
  if (capability_slug) {
    const spR = await fetch(
      // FEATURE: LOG-67 -- embed the capability row via FK capability_skill_profiles_capability_slug_fkey
      // to source execution_type without a second fetch.
      `${supabaseUrl}/rest/v1/capability_skill_profiles?capability_slug=eq.${encodeURIComponent(capability_slug)}&select=level,is_required,display_order,skill_profiles(*),capabilities(execution_type)&order=display_order.asc`,
      { headers }
    );
    if (spR.ok) {
      const rows = await spR.json() || [];
      // FEATURE: LOG-67 -- capture execution_type off the first row before the map discards row.capabilities.
      executionType = rows[0]?.capabilities?.execution_type ?? null;
      skillProfiles = rows.map(row => ({
        ...row.skill_profiles,
        level: row.level,
        is_required: row.is_required,
        display_order: row.display_order,
      }));
    }

  } else if (agent_id) {
    // No capability_slug — load all capabilities assigned to agent, then their skill_profiles
    const assignR = await fetch(
      `${supabaseUrl}/rest/v1/agent_capability_assignments?tenant_id=eq.${encodeURIComponent(tenant_id)}&agent_id=eq.${encodeURIComponent(agent_id)}&select=capability_slug`,
      { headers }
    );
    if (assignR.ok) {
      const assignments = await assignR.json() || [];
      for (const a of assignments) {
        const spR = await fetch(
          `${supabaseUrl}/rest/v1/capability_skill_profiles?capability_slug=eq.${encodeURIComponent(a.capability_slug)}&select=level,is_required,display_order,skill_profiles(*)&order=display_order.asc`,
          { headers }
        );
        if (spR.ok) {
          const rows = await spR.json() || [];
          skillProfiles.push(...rows.map(row => ({
            ...row.skill_profiles,
            source_capability_slug: a.capability_slug,
            level: row.level,
            is_required: row.is_required,
            display_order: row.display_order,
          })));
        }
      }
    }
  }

  // FEATURE: S-APPLE-02b — per-call Intent Skill Profile filter (ARCHITECTURE.md §2 known
  // gap). A Capability may have more than one Intent-type Skill Profile (e.g.
  // channel-intelligence's ci-routing-intent + ci-answer-intent) — without this, every call
  // would load both and both would render as a collided "intent" section. Filtered here,
  // before the enrichment_capability_slug merge below, so Dan's own Intent Skill Profile
  // (prompt-synthesis, loaded via enrichment_capability_slug) is never accidentally caught
  // by a filter meant for the primary capability. intent_slug unset (every existing caller)
  // is byte-identical to today's behavior.
  // FEATURE: AA-108 -- fail loudly instead of silently degrading. Before this fix, an intent_slug
  // that didn't match any loaded Intent Skill Profile filtered the set down to zero intent
  // profiles with no error -- the downstream call proceeded with no schema/handler at all, which
  // let a model free-write a fully fabricated "success" response with nothing actually enforced.
  // Checked against the pre-filter set (every skill profile loaded for this capability_slug), so
  // this only fires when intent_slug genuinely doesn't exist for this capability -- byte-identical
  // for every existing caller, which always passes a real, matching intent_slug.
  if (intent_slug) {
    const matchedIntent = skillProfiles.some(sp => sp.skill_type_slug === 'intent' && sp.slug === intent_slug);
    if (!matchedIntent) {
      throw new Error(`assemblePrompt: intent_slug "${intent_slug}" does not match any Intent Skill Profile for capability "${capability_slug}"`);
    }
    skillProfiles = skillProfiles.filter(sp => sp.skill_type_slug !== 'intent' || sp.slug === intent_slug);
  } else {
    // FEATURE: AA-188 -- intent_slug is null when the routing agent legitimately couldn't map
    // the request to one specific intent (project-manager.js's own roster prompt explicitly
    // instructs this rather than risk a hallucinated guess, per AA-108's postmortem). Stacking
    // every intent-type Skill Profile's objective/method/analysis_instructions together would
    // produce a contradictory, garbled prompt (confirmed live: Nadia's data-analysis capability
    // received all 4 of her intents' instructions at once, no schema, no can_request_help).
    // Skip all intent-type profiles entirely instead -- same coherent baseline mode a capability
    // with zero declared intents already runs in, just Identity/Behavior/Knowledge/Guardrails.
    skillProfiles = skillProfiles.filter(sp => sp.skill_type_slug !== 'intent');
  }

  // FEATURE: LOG-67 -- snapshot BEFORE the enrichment merge below; the signature is the PRIMARY
  // capability's own config only (agent-agnostic), never the enrichment capability's skills. Taken
  // after the fired-intent filter above so it inherits the correct intent scoping for free.
  const signatureConfig = buildSignatureConfig(skillProfiles, { capability_slug, execution_type: executionType });

  // FEATURE: BUG-17 — load enrichment capability skill profiles (e.g. dan-ai-enrichment)
  // These profiles contribute technical_services triggers (reflect, synthesis) with Dan's authored prompts.
  // They produce null section content by design and do not add visible text to the assembled prompt.
  if (enrichment_capability_slug) {
    const enrichR = await fetch(
      `${supabaseUrl}/rest/v1/capability_skill_profiles?capability_slug=eq.${encodeURIComponent(enrichment_capability_slug)}&select=level,is_required,display_order,skill_profiles(*)&order=display_order.asc`,
      { headers }
    );
    if (enrichR.ok) {
      const enrichRows = await enrichR.json() || [];
      skillProfiles.push(...enrichRows.map(row => ({
        ...row.skill_profiles,
        source_capability_slug: enrichment_capability_slug,
        level: row.level,
        is_required: row.is_required,
        display_order: row.display_order,
      })));
    }
  }

  // FEATURE: AA-58 — fetch agent professional card from agents table
  let agentRow = null;
  if (agent_id) {
    const agR = await fetch(
      `${supabaseUrl}/rest/v1/agents?id=eq.${encodeURIComponent(agent_id)}&select=name,role,specialty,bio&limit=1`,
      { headers }
    );
    if (agR.ok) {
      const agRows = await agR.json() || [];
      agentRow = agRows[0] || null;
    }
  }

  const { sections, formatContract, synthesis, llm, canRequestHelp, enableWebSearch, delegationRequired, requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug, intentTechnicalServices, enableParallelToolUse } = buildSections(skillProfiles, agent_id, agentConfigs, agentRow, intent_slug, retrieval_scope);

  // FEATURE: AA-62 + AA-67 — CURRENT TASK section: goal + deliverable_type always present when goal
  // exists. Renamed from "WORK ORDER" (AA-136) -- this label is generic assemblePrompt() output used
  // by every capability (Q&A, hypothesis tests, quality-gate, actual Work Orders via api/plan.js),
  // not specific to the Work Order screen/feature; the old name read as a direct reference to that
  // unrelated feature.
  const goalText = typeof task_context === 'object' && task_context !== null
    ? (task_context.goal || null)
    : (typeof task_context === 'string' ? task_context : null);
  const deliverableType = typeof task_context === 'object' && task_context !== null
    ? (task_context.deliverable_type || null)
    : null;

  if (goalText && goalText.trim()) {
    const workOrderParts = [`Goal: ${goalText.trim()}`];
    if (deliverableType) workOrderParts.push(`Deliverable type: ${deliverableType}`);
    // FEATURE: HAR-06 -- generic task_context pass-through. Any field beyond goal/deliverable_type is
    // appended here, same key/value serialization TASK DETAILS (AI-44) already uses one branch below --
    // extends that existing generic mechanism to the .goal-present path instead of duplicating it.
    // Additive only: every existing .goal-only caller (api/plan.js Work Orders, ordinary qa/theory/
    // forecast/correct calls) carries zero extra keys, so this filters to nothing and output stays
    // byte-identical. A future capability that wants to pass something new (CHI-33's article_content
    // today, anything else tomorrow) just adds a key to the task_context object it already builds --
    // no change to this file required ever again.
    const extraEntries = Object.entries(task_context)
      .filter(([k, v]) => k !== 'goal' && k !== 'deliverable_type' && v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
    workOrderParts.push(...extraEntries);
    sections.push({
      slug: 'current-task',
      label: 'CURRENT TASK',
      skill_profile_slug: null,
      type: 'stored',
      content: workOrderParts.join('\n'),
      fetch_instruction: null,
      required: true,
      order: 11,  // FEATURE: HAR-02b -- was 2.5; per-call content renders after the stable run
      prompt_phase: 'volatile',
    });
    sections.sort((a, b) => (a.order || 0) - (b.order || 0));
  } else if (typeof task_context === 'object' && task_context !== null && Object.keys(task_context).length > 0) {
    // FEATURE: AI-44 -- TASK DETAILS: generic fallback for any capability whose task_context is a
    // plain object without a .goal field (e.g. Nadia's {disputed_chunk_id, correction, ...}, Sam's
    // {intent, hypothesis, correction_text, ...}). Without this, a capability with neither a RAG
    // section nor a Reflect section never sees its own specific task at all -- confirmed live
    // 2026-07-03 during S-APPLE-04b QA (data-patch-intent returned a generic, input-blind response
    // regardless of task_context content). Fires only when the .goal path above does NOT -- never
    // both, no duplicate task text for existing .goal-shaped callers (api/plan.js Work Orders).
    // Shape-driven, not identity-driven -- AR-1.1.
    const taskDetailsText = Object.entries(task_context)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join('\n');
    if (taskDetailsText) {
      sections.push({
        slug: 'task-details',
        label: 'TASK DETAILS',
        skill_profile_slug: null,
        type: 'stored',
        content: taskDetailsText,
        fetch_instruction: null,
        required: true,
        order: 11,  // FEATURE: HAR-02b -- was 2.5; per-call content renders after the stable run
        prompt_phase: 'volatile',
      });
      sections.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  }

  // FEATURE: AA-136 — runtime_context (prior conversation) must render BEFORE CURRENT TASK/TASK
  // DETAILS, not silently after. Previously this section had no `order` (landed at array-push end,
  // after the sort above -- i.e. after the actual current-turn goal, closest of anything to the
  // always-final VOICE section, read by the model as most current) and no `label` (rendered as a
  // literal "=== undefined ===" header via ai-enrichment.js's renderSection()). Both stemmed from
  // this section never being built as a first-class section like every other one in this function --
  // fixed together. FEATURE: HAR-02b -- order renumbered 2.4 -> 10: this section still renders just
  // before CURRENT TASK/TASK DETAILS (11), but the whole per-call group now renders AFTER the
  // agent's stable sections (1-5) instead of before them, so the stable prefix stays cacheable.
  if (runtime_context && typeof runtime_context === 'string' && runtime_context.trim()) {
    sections.push({
      slug: 'prior-conversation',
      label: 'PRIOR CONVERSATION (context only — see CURRENT TASK for what to actually do)',
      skill_profile_slug: null,
      type: 'stored',
      content: runtime_context.trim(),
      fetch_instruction: null,
      required: false,
      order: 10,
      prompt_phase: 'volatile',
    });
    sections.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // FEATURE: AA-127 — VOICE section, always appended last, every call, every agent. Fixes
  // third-person bleed-through ("the user should...") into generated output — the model was
  // mirroring third-person framing from its own instructional text (see AA-127 in
  // docs/FEATURES.md). Platform-wide constant, not sourced from any Skill Profile row — same
  // unconditional-append pattern as the CURRENT TASK/TASK DETAILS/runtime_context sections above,
  // deliberately placed after all of them so it is always the final thing the model reads.
  sections.push({
    slug: 'voice',
    label: 'VOICE',
    skill_profile_slug: null,
    type: 'stored',
    content: `Speak directly to the user — the human you are working with — in second person ("you") or first person for your own analysis ("I recommend", "I'd flag", "Worth confirming"). Never refer to them in third person (e.g. "the user should..."). This applies to every piece of text you generate, including structured fields like "consider"/"complicates"/"supports", not just conversational replies.`,
    fetch_instruction: null,
    required: true,
    order: 100,
    // FEATURE: HAR-02b -- VOICE's text is constant, but it must stay the absolute last thing the
    // model reads (AA-127), which puts it after every per-call section -- so it lives in the
    // volatile tail by position, deliberately trading its own few cached bytes for that invariant.
    prompt_phase: 'volatile',
  });

  return {
    tenant_id,
    task_context,
    agent_id: agent_id || null,
    capability_slug: capability_slug || null,
    agent_card: agentRow,   // FEATURE: AA-58 — exposes fetched agent row for audit/debug
    sections,
    format_contract: formatContract,
    synthesis,
    llm,
    canRequestHelp,
    enableWebSearch,
    // FEATURE: LOO-28 -- already the effective boolean (trait && !delegation_required), computed
    // in buildSections(). Read by execute.js's runCapability() off this raw output, same as
    // canRequestHelp/enableWebSearch (ai-enrichment.js drops unknown fields from `enriched`).
    enableParallelToolUse,
    delegationRequired,
    requiresHumanConfirmation,
    critiqueCapabilitySlug,
    critiqueIntentSlug,
    intent_technical_services: intentTechnicalServices,
    // FEATURE: LOG-67 -- the config-half of the runtime signature, frozen at write time. Carried
    // through enrichPrompt() (passthrough) to the sendRequest() model-call write path, and read
    // directly off this object at the agent-turn write path in execute.js's runCapability().
    signature_config: signatureConfig,
  };
}

async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const result = await assemblePrompt(req.body || {});
    return res.status(200).json(result);
  } catch (e) {
    console.error('[db-assembly] error:', e);
    return res.status(500).json({ error: e.message });
  }
}

export default withRequestContext(handler);
