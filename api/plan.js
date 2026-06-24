// DeepBench v5.2.35 | api/plan.js | BUG-17 wire dan-ai-enrichment into prompt-service + preview-prompt
// FEATURE: AW-04 — Planning agent structured output
// FEATURE: AA-44 — title.js merged into plan.js; taskTitle added to tool schema

import { assemblePrompt } from './prompt/db-assembly.js';
import { enrichPrompt } from './prompt/ai-enrichment.js';
import { sendRequest } from './prompt/request-receivable.js';
import { queryRAG } from '../lib/rag.js';

export const config = { maxDuration: 60, runtime: "nodejs" };

// FEATURE: AA-69 — Supabase header builder for format routing lookups
function getSupabaseHeaders(key) {
  return {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": `Bearer ${key}`,
  };
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const action = req.body.action || 'plan';

  // FEATURE: AW-27 — AI goal suggestion: streaming Haiku call with RAG context
  if (action === 'suggest-goal') {
    try {
      const { agent_id, capability_slug, deliverable_label, deliverable_description, tenant_id = 'global' } = req.body;

      if (!deliverable_label) return res.status(400).json({ error: 'deliverable_label required' });

      // RAG: fetch relevant context from Michelle's knowledge entries
      let ragContext = '';
      try {
        const ragResults = await queryRAG({
          queryText: `${deliverable_label}: ${deliverable_description || ''}`,
          agentId: agent_id || 'michelle',
          tenantId: tenant_id,
          matchCount: 3,
          scope: 'agent',
        });
        if (ragResults?.context) {
          ragContext = ragResults.context;
        }
      } catch (ragErr) {
        console.warn('[suggest-goal] RAG fetch failed — proceeding without context:', ragErr.message);
      }

      const systemPrompt = `You are Michelle Manning (PP-01), a Project Manager. Generate a concise, specific work order goal (2–3 sentences) for the deliverable type requested. Be practical and action-oriented. Do not include preamble — output the goal text only.${ragContext ? `\n\nRelevant context from your knowledge base:\n${ragContext}` : ''}`;
      const userMsg = `Deliverable type: ${deliverable_label}\n${deliverable_description ? `Description: ${deliverable_description}\n` : ''}Write a suggested goal for this work order.`;

      // SSE streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });

      if (!anthropicRes.ok) {
        res.write('data: [DONE]\n\n');
        return res.end();
      }

      const reader = anthropicRes.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim());
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
              }
            } catch {}
          }
        }
      }

      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (e) {
      console.error('[suggest-goal] error:', e);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
  }

  // FEATURE: AW-28 — preview-prompt: Prompt Service returns 4-stage breakdown for Prompt Evolution Modal
  if (action === 'preview-prompt') {
    try {
      const { agent_id, capability_slug, tenant_id = 'global', goal, deliverable_type, runtime_context, format_skill_profile_slug, display_agent_id } = req.body;
      if (!goal) return res.status(400).json({ error: 'goal required' });

      // Stage 1: raw goal only
      const stage1Text = goal.trim();

      // DB Assembly
      // FEATURE: BUG-17 — wire Dan's enrichment capability alongside PM capability
      const promptRequest = await assemblePrompt({
        capability_slug: capability_slug || 'project-manager',
        agent_id: agent_id || 'michelle',
        tenant_id,
        task_context: { goal, deliverable_type },
        runtime_context: runtime_context || null,
        enrichment_capability_slug: 'dan-ai-enrichment',
      });

      // Stage 2: stored sections only (DB Assembly output, no RAG, no Reflect)
      const storedSections = (promptRequest.sections || [])
        .filter(s => s.type === 'stored' && s.content)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const stage2Text = storedSections
        .map(s => `=== ${s.label} ===\n${s.content}`)
        .join('\n\n---\n\n');

      // AI Enrichment — single call, all stages derived from result
      const enriched = await enrichPrompt({ prompt_request: promptRequest, agent_id, capability_slug });
      const enrichedMap = enriched.sections || {};
      const debug = enriched.debug || {};

      // Helper: build ordered section list from enriched map
      const orderedSections = [...(promptRequest.sections || [])]
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      function buildStage(excludeReflect) {
        const pairs = [];
        for (const s of orderedSections) {
          if (excludeReflect && s.type === 'reflect') continue;
          const content = enrichedMap[s.slug];
          if (!content) continue;
          const source = s.slug.startsWith('knowledge') ? 'RAG' : s.type === 'reflect' ? 'REFLECT' : 'DB';
          pairs.push({ slug: s.slug, label: s.label, content, source });
        }
        return pairs;
      }

      // Stage 3: stored + RAG (no Reflect)
      const stage3Pairs = buildStage(true);
      const stage3Text = stage3Pairs
        .map(p => `=== ${p.label} ===\n${p.content}`)
        .join('\n\n---\n\n');

      // Stage 4: full enriched prompt (stored + RAG + Reflect)
      const stage4Pairs = buildStage(false);
      const stage4Text = enriched.system_prompt || stage4Pairs
        .map(p => `=== ${p.label} ===\n${p.content}`)
        .join('\n\n---\n\n');

      const patterns = {
        rag: debug.rag_retrieved || false,
        rag_chunks: debug.rag_chunks_by_section
          ? Object.values(debug.rag_chunks_by_section).reduce((a, b) => a + b, 0)
          : 0,
        rag_scope: debug.rag_scope_effective || null,
        reflect: debug.reflect_ran || false,
        synthesis: debug.synthesis_ran || false,
        synthesis_tokens_saved: debug.synthesis_ran
          ? (debug.token_estimate_pre_synthesis || 0) - (debug.token_estimate_post_synthesis || 0)
          : 0,
        model: enriched.llm?.model || 'claude-sonnet-4-6',
        skill_profile: enriched.format_contract?.skill_profile_slug || null,
      };

      // FEATURE: AA-69 — Append Alex's format section to Column 4 (format-last pattern)
      let displayAgentCard = null;
      let stage4WithFormat = stage4Text;
      if (format_skill_profile_slug) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        if (supabaseUrl && supabaseKey) {
          const headers = getSupabaseHeaders(supabaseKey);
          try {
            const fspRes = await fetch(
              `${supabaseUrl}/rest/v1/skill_profiles?slug=eq.${encodeURIComponent(format_skill_profile_slug)}&select=*&limit=1`,
              { headers }
            );
            if (fspRes.ok) {
              const [fsp] = await fspRes.json();
              if (fsp) {
                const traits = fsp.traits || {};
                const outputType = traits.output_type || 'json';
                const formatParts = [`Output type: ${outputType}`];
                if (traits.section_structure) formatParts.push(`Structure: ${traits.section_structure}`);
                formatParts.push('\n\nAlso return a "title" field (max 8 words) that describes the actual content you produced — not the task goal, but what you actually generated.');
                const formatSection = `=== OUTPUT FORMAT ===\n${formatParts.join('\n')}`;
                stage4WithFormat = (stage4Text || '') + '\n\n---\n\n' + formatSection;
              }
            }
            if (display_agent_id) {
              const agRes = await fetch(
                `${supabaseUrl}/rest/v1/agents?id=eq.${encodeURIComponent(display_agent_id)}&select=name,role,specialty,bio&limit=1`,
                { headers }
              );
              if (agRes.ok) {
                const [agRow] = await agRes.json();
                displayAgentCard = agRow || null;
              }
            }
          } catch (e) {
            console.warn('[preview-prompt] format append failed:', e.message);
          }
        }
      }

      return res.status(200).json({
        stage1: { text: stage1Text, tokens: Math.ceil(stage1Text.length / 4) },
        stage2: { text: stage2Text, tokens: Math.ceil(stage2Text.length / 4), sections: storedSections.map(s => ({ slug: s.slug, label: s.label, source: 'DB' })) },
        stage3: { text: stage3Text, tokens: Math.ceil(stage3Text.length / 4), sections: stage3Pairs },
        stage4: { text: stage4WithFormat, tokens: Math.ceil(stage4WithFormat.length / 4), sections: stage4Pairs },
        patterns,
        // FEATURE: AA-65 — primary agent card for collaboration indicator in PromptEvolutionModal
        agent_card: promptRequest.agent_card,
        display_agent_card: displayAgentCard,
        display_agent_id: display_agent_id || null,
      });
    } catch (e) {
      console.error('[preview-prompt] error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // FEATURE: SK-20 — Prompt Service pipeline orchestration for Create Work Order
  if (action === 'prompt-service') {
    try {
      const { agent_id, capability_slug, tenant_id = 'global', goal, deliverable_type, runtime_context, format_skill_profile_slug, display_agent_id } = req.body;

      if (!goal) return res.status(400).json({ error: 'goal required' });

      // Step 1: DB Assembly
      // FEATURE: BUG-17 — wire Dan's enrichment capability alongside PM capability
      const promptRequest = await assemblePrompt({
        capability_slug: capability_slug || 'project-manager',
        agent_id: agent_id || 'michelle',
        tenant_id,
        task_context: { goal, deliverable_type },
        runtime_context: runtime_context || null,
        enrichment_capability_slug: 'dan-ai-enrichment',
      });

      // Step 2: AI Enrichment
      const enriched = await enrichPrompt({
        prompt_request: promptRequest,
        agent_id: agent_id || 'michelle',
        capability_slug: capability_slug || 'project-manager',
      });

      // FEATURE: AA-69 — Step 2b: Format append (format-last pattern)
      // After enrichment, fetch display agent's Format Skill and append as final system_prompt section.
      // format_skill_profile_slug and display_agent_id come from the deliverable tile's routing config.
      let displayAgentCard = null;
      if (format_skill_profile_slug) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        if (supabaseUrl && supabaseKey) {
          const headers = getSupabaseHeaders(supabaseKey);
          try {
            const fspRes = await fetch(
              `${supabaseUrl}/rest/v1/skill_profiles?slug=eq.${encodeURIComponent(format_skill_profile_slug)}&select=*&limit=1`,
              { headers }
            );
            if (fspRes.ok) {
              const [fsp] = await fspRes.json();
              if (fsp) {
                const traits = fsp.traits || {};
                const outputType = traits.output_type || 'json';
                const formatParts = [`Output type: ${outputType}`];
                if (traits.section_structure) formatParts.push(`Structure: ${traits.section_structure}`);
                formatParts.push('\n\nAlso return a "title" field (max 8 words) that describes the actual content you produced — not the task goal, but what you actually generated.');
                const formatSection = `=== OUTPUT FORMAT ===\n${formatParts.join('\n')}`;
                enriched.system_prompt = (enriched.system_prompt || '') + '\n\n---\n\n' + formatSection;
                enriched.format_contract = {
                  output_type: outputType,
                  skill_profile_slug: fsp.slug,
                  schema: traits.schema || null,
                  handler: traits.handler || 'store',
                  guardrails: fsp.guardrails || { must: [], must_not: [] },
                };
              }
            }
            if (display_agent_id) {
              const agRes = await fetch(
                `${supabaseUrl}/rest/v1/agents?id=eq.${encodeURIComponent(display_agent_id)}&select=name,role,specialty,bio&limit=1`,
                { headers }
              );
              if (agRes.ok) {
                const [agRow] = await agRes.json();
                displayAgentCard = agRow || null;
              }
            }
          } catch (e) {
            console.warn('[prompt-service] format append failed — using default format_contract:', e.message);
          }
        }
      }

      // Step 3: Request & Receivable
      const result = await sendRequest({
        prompt_request: enriched,
        agent_id: agent_id || 'michelle',
        capability_slug: capability_slug || 'project-manager',
        tenant_id,
      });

      return res.status(200).json({ ...result, display_agent_card: displayAgentCard, display_agent_id: display_agent_id || null });
    } catch (e) {
      console.error('[prompt-service] error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── Title action (merged from title.js) ─────────────────────────────────────
  if (action === 'title') {
    try {
      const { goal, steps } = req.body;

      if (!goal || !Array.isArray(steps)) {
        return res.status(200).json({ taskTitle: null, stepTitles: [] });
      }

      const stepsText = steps
        .map((s, i) => `${i + 1}. ${s.label}: ${s.description || s.text || ""}`)
        .join("\n");

      const systemPrompt = `You are Michelle Manning (PP-01), a Project Planner.
Generate a concise task title (max 8 words) and a clear name
for each step based on the goal and plan provided. The task
title should be action-oriented and specific — not the raw
goal text. Step names should be title-case noun phrases
(e.g. 'Data Access & Scope Confirmation', 'Vendor Risk Analysis').
Return JSON only, no markdown fences, no explanation.`;

      const userMsg = `Goal: ${goal}\n\nSteps:\n${stepsText}\n\nReturn JSON in this exact format:\n{"taskTitle":"string","stepTitles":["string","string"]}`;

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: userMsg }],
        }),
      });

      if (!anthropicRes.ok) {
        return res.status(200).json({ taskTitle: null, stepTitles: [] });
      }

      const data = await anthropicRes.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(200).json({ taskTitle: null, stepTitles: [] });

      const parsed = JSON.parse(jsonMatch[0]);
      return res.status(200).json({
        taskTitle: typeof parsed.taskTitle === "string" ? parsed.taskTitle : null,
        stepTitles: Array.isArray(parsed.stepTitles) ? parsed.stepTitles : [],
      });
    } catch (e) {
      console.error("[plan/title] handler error:", e);
      return res.status(200).json({ taskTitle: null, stepTitles: [] });
    }
  }

  // ── Plan action (default) ────────────────────────────────────────────────────
  try {
    const {
      messages,
      systemPrompt,
      tools,
      max_tokens = 1200,
      tenant_id = "global",
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:       "claude-haiku-4-5-20251001",
        max_tokens,
        system:      systemPrompt,
        messages,
        tools,
        tool_choice: { type: "any" },
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[plan] Anthropic error:", errText);
      return res.status(anthropicRes.status).json({ error: "Anthropic API error: " + errText.slice(0, 300) });
    }

    const anthropicData = await anthropicRes.json();
    return res.status(200).json(anthropicData);
  } catch (e) {
    console.error("[plan] handler error:", e);
    return res.status(500).json({ error: e.message });
  }
}
