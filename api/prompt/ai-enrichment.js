// DeepBench v5.2.22 | api/prompt/ai-enrichment.js | enrichPrompt named export
// FEATURE: AA-43 — Takes Prompt Request, fetches runtime data, renders assembled system prompt

import { queryRAG } from "../../lib/rag.js";

export const config = { maxDuration: 60, runtime: "nodejs" };

const RAG_TIMEOUT_MS = 10000;

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

async function fetchSection(section, taskContext, tenantId) {
  if (section.type === "stored") return { ...section };

  if (section.type === "rag") {
    const fi = section.fetch_instruction;
    try {
      const result = await fetchWithTimeout(
        queryRAG({
          queryText: taskContext,
          agentId: fi.agent_id || null,
          tenantId,
          matchCount: fi.match_count || 5,
          scope: fi.scope || "agent",
        }),
        RAG_TIMEOUT_MS
      );
      return {
        ...section,
        content: result.context || "",
        _rag_chunks: result.matchCount || 0,
        _rag_scope_effective: (fi.scope === "agent" && fi.agent_id) ? "agent" : "platform",
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

function assembleSystemPrompt(renderedBlocks) {
  return renderedBlocks.filter(Boolean).join("\n\n---\n\n");
}

export async function enrichPrompt({ prompt_request, agent_id, capability_slug }) {
  const promptRequest = prompt_request;
  if (!promptRequest || typeof promptRequest !== "object") {
    throw new Error("Prompt Request body required");
  }

  const { sections = [], task_context = "", tenant_id = "global", format_contract, synthesis, llm, agent_id: pr_agent_id, capability_slug: pr_capability_slug } = promptRequest;
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
      sections: {},
      format_contract: format_contract || { output_type: "html", skill_profile_slug: null, schema: null },
      llm: llm || { provider: "anthropic", model: "claude-sonnet-4-6", max_tokens: 4000, api_key_source: "platform" },
      agent_id: effectiveAgentId,
      capability_slug: effectiveCapabilitySlug,
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
    nonReflectSections.map(s => fetchSection(s, taskContextStr, tenant_id))
  );

  // STEP 2 — RENDER: assemble text blocks in section order
  const orderedFetched = [...fetchedSections].sort((a, b) => (a.order || 0) - (b.order || 0));
  const renderedMap = {};
  const omitted = [];
  const fetchErrors = [];
  const ragChunksBySection = {};

  for (const s of orderedFetched) {
    if (s._fetch_error) fetchErrors.push({ slug: s.slug, error: s._fetch_error });
    if (!s.content) { omitted.push(s.slug); continue; }
    renderedMap[s.slug] = s.content;
    if (s._rag_chunks !== undefined) ragChunksBySection[s.slug] = s._rag_chunks;
  }

  const renderedBlocks = orderedFetched
    .filter(s => renderedMap[s.slug])
    .map(s => renderSection({ ...s, content: renderedMap[s.slug] }));

  let assembledPrompt = assembleSystemPrompt(renderedBlocks);

  // STEP 3 — REFLECT
  const reflectSection = sections.find(s => s.type === "reflect");
  let reflectRan = false;
  let reflectTokensUsed = 0;
  let reflectModel = null;

  if (reflectSection) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      try {
        const fi = reflectSection.fetch_instruction;
        const identityText = renderedMap["identity"] || renderedMap["behavior"] || "";
        const knowledgeText = renderedMap["knowledge"] || Object.entries(renderedMap).find(([k]) => k.startsWith("knowledge-"))?.[1] || "";

        const reflectPrompt = `You are ${identityText ? identityText.split("\n")[0] : "an AI agent"}. Review your background knowledge and the task below. Write a numbered execution plan that reflects your role, incorporates relevant knowledge, and addresses this specific task concretely.

${identityText ? `## YOUR ROLE & IDENTITY\n${identityText}\n` : ""}${knowledgeText ? `## YOUR BACKGROUND KNOWLEDGE\n${knowledgeText}\n` : ""}
## SPECIFIC TASK
${taskContextStr}

Write a numbered execution plan. Be concrete — reference specific knowledge where it applies.`;

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
          reflectTokensUsed = (reflectData.usage?.input_tokens || 0) + (reflectData.usage?.output_tokens || 0);
          reflectModel = fi.model || "claude-haiku-4-5-20251001";

          if (executionPlan) {
            const insertAfterSlug = fi.inserts_after || null;
            const insertAfterIndex = insertAfterSlug
              ? renderedBlocks.findIndex(b => b && b.includes(`=== ${(orderedFetched.find(s => s.slug === insertAfterSlug) || {}).label} ===`))
              : -1;

            const reflectBlock = `=== ${reflectSection.label || "EXECUTION PLAN"} ===\n${executionPlan}`;
            if (insertAfterIndex >= 0) {
              renderedBlocks.splice(insertAfterIndex + 1, 0, reflectBlock);
            } else {
              renderedBlocks.push(reflectBlock);
            }

            renderedMap[reflectSection.slug || "reflect"] = executionPlan;
            assembledPrompt = assembleSystemPrompt(renderedBlocks);
            reflectRan = true;
          }
        }
      } catch (e) {
        console.warn("[ai-enrichment] REFLECT failed:", e.message);
      }
    }
  }

  // STEP 4 — INTELLIGENT SYNTHESIS
  let synthesisRan = false;
  let synthesisTokensUsed = 0;
  let synthesisModel = null;
  const tokenEstimatePreSynthesis = Math.round(assembledPrompt.length / 4);

  if (synthesis?.enabled) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      try {
        const synthPrompt = `You are a prompt optimization engine. The prompt below will be sent to an AI agent to complete a task. Rewrite it to be maximally clear, coherent, and efficient. Remove redundancy. Tighten language. Preserve all factual content, all constraints, and all output format instructions exactly. The rewritten prompt must be under ${synthesis.max_tokens || 2048} tokens. Do not add new instructions. Do not remove guardrails or format requirements.

${assembledPrompt}`;

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
          synthesisTokensUsed = (synthData.usage?.input_tokens || 0) + (synthData.usage?.output_tokens || 0);
          synthesisModel = synthesis.model || "claude-haiku-4-5-20251001";
          if (rewritten) {
            assembledPrompt = rewritten;
            synthesisRan = true;
          }
        }
      } catch (e) {
        console.warn("[ai-enrichment] Synthesis failed:", e.message);
      }
    }
  }

  return {
    system_prompt: assembledPrompt,
    sections: renderedMap,
    format_contract: format_contract || { output_type: "html", skill_profile_slug: null, schema: null },
    llm: llm || { provider: "anthropic", model: "claude-sonnet-4-6", max_tokens: 4000, api_key_source: "platform" },
    agent_id: effectiveAgentId,
    capability_slug: effectiveCapabilitySlug,
    debug: {
      sections_assembled: Object.keys(renderedMap).length,
      sections_omitted: omitted,
      fetch_errors: fetchErrors,
      rag_retrieved: Object.keys(ragChunksBySection).length > 0,
      rag_chunks_by_section: ragChunksBySection,
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
