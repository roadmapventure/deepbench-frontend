// DeepBench v6.3.64 | api/fetch-article.js | CHI-33 -- on-click full-article extraction, called
// only when a user selects a news card for analysis, never on load.
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { logActivity } from "../lib/activity-log.js";

export const config = { maxDuration: 30, runtime: "nodejs" };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body || {};
  if (!url || typeof url !== "string") return res.status(400).json({ error: "url is required" });

  // -- Primary path: fetch + Readability extraction --
  try {
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DeepBenchBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const dom = new JSDOM(html, { url });
      const article = new Readability(dom.window.document).parse();
      // Treat a short/empty extraction as a paywall/bot-block signal, not a usable result.
      if (article?.textContent && article.textContent.trim().length > 500) {
        return res.status(200).json({
          source: "full_text",
          title: article.title || null,
          text: article.textContent.trim(),
        });
      }
    }
  } catch (err) {
    console.error("[fetch-article] extraction failed, falling back:", err.message);
  }

  // -- Fallback path: ask Claude to summarize from the URL, using its own web_search tool --
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  try {
    const callStart = Date.now();
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: `What is this article about? Give a factual, detailed summary of its actual content (not just the headline): ${url}` }],
      }),
    });
    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return res.status(502).json({ error: "Fallback summary failed: " + errText.slice(0, 200) });
    }
    const claudeData = await claudeRes.json();
    const usedWebSearch = (claudeData.content || []).some(b => b.type === "server_tool_use" && b.name === "web_search");
    const textBlock = (claudeData.content || []).find(b => b.type === "text");
    const summary = textBlock?.text?.trim();
    if (!summary) return res.status(502).json({ error: "Fallback summary returned no text" });

    logActivity({
      tenantId: "global", agentId: null, aiType: "fallback-summary", feature: "article-extraction",
      model: "claude-sonnet-4-6",
      inputTokens: claudeData.usage?.input_tokens ?? null,
      outputTokens: claudeData.usage?.output_tokens ?? null,
      latencyMs: Date.now() - callStart,
      patternsUsed: usedWebSearch ? ["tool-use"] : [],
    });

    return res.status(200).json({
      source: "ai_summarized",
      title: null,
      text: `(AI-summarized from search -- full text unavailable, likely paywalled or bot-blocked)\n\n${summary}`,
    });
  } catch (err) {
    console.error("[fetch-article] fallback failed:", err);
    return res.status(500).json({ error: err.message });
  }
}
