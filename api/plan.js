// DeepBench v5.2.18 | api/plan.js | suggest-goal (AW-27) + prompt-service (SK-20) actions
// FEATURE: AW-04 — Planning agent structured output
// FEATURE: AA-44 — title.js merged into plan.js; taskTitle added to tool schema

import { assemblePrompt } from './prompt/db-assembly.js';
import { enrichPrompt } from './prompt/ai-enrichment.js';
import { sendRequest } from './prompt/request-receivable.js';
import { queryRAG } from '../lib/rag.js';

export const config = { maxDuration: 60, runtime: "nodejs" };

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

  // FEATURE: SK-20 — Prompt Service pipeline orchestration for Create Work Order
  if (action === 'prompt-service') {
    try {
      const { agent_id, capability_slug, tenant_id = 'global', goal, deliverable_type, runtime_context } = req.body;

      if (!goal) return res.status(400).json({ error: 'goal required' });

      // Step 1: DB Assembly
      const promptRequest = await assemblePrompt({
        capability_slug: capability_slug || 'cap-pm-01',
        agent_id: agent_id || 'michelle',
        tenant_id,
        task_context: { goal, deliverable_type },
        runtime_context: runtime_context || null,
      });

      // Step 2: AI Enrichment
      const enriched = await enrichPrompt({
        prompt_request: promptRequest,
        agent_id: agent_id || 'michelle',
        capability_slug: capability_slug || 'cap-pm-01',
      });

      // Step 3: Request & Receivable
      const result = await sendRequest({
        prompt_request: enriched,
        agent_id: agent_id || 'michelle',
        capability_slug: capability_slug || 'cap-pm-01',
        tenant_id,
      });

      return res.status(200).json(result);
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
        tool_choice: { type: "auto" },
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
