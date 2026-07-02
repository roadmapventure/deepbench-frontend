// DeepBench v5.3.8 | api/prompt/db-assembly.js | S-CAPABILITY-EXEC-01 — Intent Skill Profile llm/schema (AA-75)
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

function buildSections(skillProfiles, agentId, agentConfigs, agentRow, intentSlug) {
  const sections = [];
  let reflectSection = null;
  let synthesisEnabled = false;
  let synthesisDeclaringSlug = null;
  let synthesisPromptText = null;
  let formatContract = { ...DEFAULT_FORMAT_CONTRACT };
  let llm = { ...DEFAULT_LLM };

  for (const sp of skillProfiles) {
    const typeSlug = sp.skill_type_slug;
    const order = SKILL_ORDER[typeSlug] ?? 99;
    const traits = sp.traits || {};

    let sectionType = "stored";
    let content = null;
    let fetchInstruction = null;

    if (typeSlug === "knowledge") {
      sectionType = "rag";
      fetchInstruction = {
        method: "rag",
        agent_id: agentId || null,
        query_from: "task_context",
        match_count: 5,
        scope: agentId ? "agent" : "platform",
      };
      // FEATURE: S-APPLE-02b — broker opt-in passthrough. Closes the gap S-LIBRARIAN-01b left
      // open ("no Skill Profile sets broker: 'librarian' yet — that's S-APPLE-02/03's job").
      // Reads whatever broker value the Skill Profile declares — never hardcoded to a name.
      if (traits.broker) fetchInstruction.broker = traits.broker;

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
        if (sp.llm_provider || sp.llm_model) {
          llm = {
            provider: sp.llm_provider || DEFAULT_LLM.provider,
            model: sp.llm_model || DEFAULT_LLM.model,
            max_tokens: sp.max_tokens || DEFAULT_LLM.max_tokens,
            api_key_source: sp.api_key_source || DEFAULT_LLM.api_key_source,
          };
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

  return { sections, formatContract, synthesis, llm };
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
  if (intent_slug) {
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

  const { sections, formatContract, synthesis, llm } = buildSections(skillProfiles, agent_id, agentConfigs, agentRow, intent_slug);

  // FEATURE: AA-62 + AA-67 — WORK ORDER section: goal + deliverable_type always present when goal exists
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
      slug: 'work-order',
      label: 'WORK ORDER',
      skill_profile_slug: null,
      type: 'stored',
      content: workOrderParts.join('\n'),
      fetch_instruction: null,
      required: true,
      order: 2.5,
    });
    sections.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // FEATURE: AA-56 — runtime_context injected as Additional Context section when present
  if (runtime_context && typeof runtime_context === 'string' && runtime_context.trim()) {
    sections.push({
      source: 'task_context',
      type: 'Additional Context',
      content: runtime_context.trim(),
    });
  }

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
