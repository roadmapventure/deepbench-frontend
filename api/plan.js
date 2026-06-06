// DeepBench v5.1.3 | plan.js | Planning agent endpoint
// FEATURE: AW-04 — Planning agent structured output
// Dedicated endpoint that passes tools + tool_choice to the Anthropic API
// so the planning agent returns a tool_use block, not plain text.

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
