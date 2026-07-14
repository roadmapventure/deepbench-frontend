// DeepBench v6.1.40 | api/prompt/db-assembly.js | AA-121 — Knowledge Skill Profile intent_allowlist gate
// DeepBench v6.1.13 | api/prompt/db-assembly.js | AA-142 — delegationRequired passthrough
// FEATURE: AA-03 patch + AA-43 — Reads agent competency data, returns fully assembled Prompt Request

export const config = { maxDuration: 30, runtime: "nodejs" };

const SKILL_ORDER = { format: 1, intent: 2, identity: 3, behavior: 4, knowledge: 5, guardrails: 6 };

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

export function buildSections(skillProfiles, agentId, agentConfigs, agentRow, intentSlug) {
  const sections = [];
  let reflectSection = null;
  let synthesisEnabled = false;
  let synthesisDeclaringSlug = null;
  let synthesisPromptText = null;
  let formatContract = { ...DEFAULT_FORMAT_CONTRACT };
  let llm = { ...DEFAULT_LLM };
  let canRequestHelp = false;
  let delegationRequired = false;
  let requiresHumanConfirmation = false;
  let critiqueCapabilitySlug = null;
  let critiqueIntentSlug = null;
  let intentTechnicalServices = [];

  for (const sp of skillProfiles) {
    const typeSlug = sp.skill_type_slug;
    const order = SKILL_ORDER[typeSlug] ?? 99;
    const traits = sp.traits || {};

    let sectionType = "stored";
    let content = null;
    let fetchInstruction = null;

    if (typeSlug === "knowledge") {
      // FEATURE: AA-121 -- optional intent_allowlist gate. Knowledge Skill Profiles attach to a
      // capability, not an intent, so historically fired RAG unconditionally on every call for that
      // capability -- including lightweight, non-analytical intents that never reference retrieved
      // content (e.g. channel-intelligence's ci-routing-intent classification call, or
      // ci-answer-display-intent's pure hand-off routing). Confirmed live: ci-routing-intent was
      // pulling ~4.3K tokens of RAG context to decide a 5-way classification with a 95-token output.
      // Opt-in via traits.intent_allowlist (array of intent_slugs) -- when set, this section (and its
      // RAG fetch) is skipped entirely unless the current call's intent_slug is in the list. Unset
      // (every existing Knowledge Skill Profile except this session's one opt-in on ci-knowledge) is
      // byte-identical to today -- fires on every call, same as before.
      if (Array.isArray(traits.intent_allowlist) && traits.intent_allowlist.length > 0) {
        if (!intentSlug || !traits.intent_allowlist.includes(intentSlug)) {
          continue;
        }
      }
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
          inserts_after: "behavior",
          declared_by: sp.slug,
          reflect_prompt: traits.reflect_prompt || null,  // FEATURE: AA-60
        },
        required: false,
        order: 4.5,
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

  return { sections, formatContract, synthesis, llm, canRequestHelp, delegationRequired, requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug, intentTechnicalServices };
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

export async function assemblePrompt({ capability_slug, agent_id, tenant_id, task_context = {}, runtime_context = null, enrichment_capability_slug = null, intent_slug = null }) {
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
      delegationRequired: false,
      requiresHumanConfirmation: false,
      critiqueCapabilitySlug: null,
      critiqueIntentSlug: null,
    };
  }

  const headers = getSupabaseHeaders(supabaseKey);

  let agentConfigs = [];
  let skillProfiles = [];

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
      `${supabaseUrl}/rest/v1/capability_skill_profiles?capability_slug=eq.${encodeURIComponent(capability_slug)}&select=level,is_required,display_order,skill_profiles(*)&order=display_order.asc`,
      { headers }
    );
    if (spR.ok) {
      const rows = await spR.json() || [];
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
  }

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

  const { sections, formatContract, synthesis, llm, canRequestHelp, delegationRequired, requiresHumanConfirmation, critiqueCapabilitySlug, critiqueIntentSlug, intentTechnicalServices } = buildSections(skillProfiles, agent_id, agentConfigs, agentRow, intent_slug);

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
    sections.push({
      slug: 'current-task',
      label: 'CURRENT TASK',
      skill_profile_slug: null,
      type: 'stored',
      content: workOrderParts.join('\n'),
      fetch_instruction: null,
      required: true,
      order: 2.5,
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
        order: 2.5,
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
  // fixed together. order: 2.4 places it just before CURRENT TASK/TASK DETAILS (2.5) and before the
  // agent's own identity/behavior/knowledge sections (3/4/5) -- background context first, agent's own
  // instructions next, current task last before RAG/VOICE.
  if (runtime_context && typeof runtime_context === 'string' && runtime_context.trim()) {
    sections.push({
      slug: 'prior-conversation',
      label: 'PRIOR CONVERSATION (context only — see CURRENT TASK for what to actually do)',
      skill_profile_slug: null,
      type: 'stored',
      content: runtime_context.trim(),
      fetch_instruction: null,
      required: false,
      order: 2.4,
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
    delegationRequired,
    requiresHumanConfirmation,
    critiqueCapabilitySlug,
    critiqueIntentSlug,
    intent_technical_services: intentTechnicalServices,
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
    const result = await assemblePrompt(req.body || {});
    return res.status(200).json(result);
  } catch (e) {
    console.error('[db-assembly] error:', e);
    return res.status(500).json({ error: e.message });
  }
}
