// DeepBench v5.2.15 | api/plan.js | Planning agent + title generation (merged from title.js)
// FEATURE: AW-04 — Planning agent structured output
// FEATURE: AA-44 — title.js merged into plan.js; taskTitle added to tool schema

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
