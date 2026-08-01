// DeepBench v7.0.34 | api/fetch-article.js | LOG-121 -- handler wrapped in withRequestContext(); the
// request-scoped context is read inside logActivity(), so no logging call site in this file changes
// DeepBench v6.3.216 | api/fetch-article.js | LOG-109 -- the primary path now logs every outcome
// via the shared logActivity() service (AA-190), never just the fallback path: banded
// http_status/extraction_outcome facts in call_facts (never a raw character count -- LOG-91's
// signature blow-up), ai_type from the generated SERVICE_SLUG constant (AI-53) so it can never
// diverge from SERVICE_CATALOG. Both new failure returns and the fallback's own existing error
// returns now carry primary_failure so the screen (CHI-91) can explain why the primary path failed.
// DeepBench v6.3.64 | api/fetch-article.js | CHI-33 -- on-click full-article extraction, called
// only when a user selects a news card for analysis, never on load.
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { logActivity } from "../lib/activity-log.js";
import { SERVICE_SLUG } from "../shared/ai-patterns.js";
import { withRequestContext } from "../lib/request-context.js";

export const config = { maxDuration: 30, runtime: "nodejs" };

// FEATURE: LOG-109 -- the two Layer A facts the primary path captures, deliberately banded.
// http_status describes the REQUEST; extraction_outcome describes the EXTRACTION. Orthogonal on
// purpose: 403+not_attempted (blocked) and 200+empty (extractor found nothing) are different
// bugs with different fixes, and case 24 could not tell them apart. `text` is the already-
// trimmed Readability output, or "" when Readability never ran.
// NEVER add the raw character count here: ai_call_patterns assembles call_facts whole into the
// §19k signature and SELECT DISTINCTs it, so a per-call value adds one distinct signature per
// fetch forever -- LOG-91 measured that exact mistake at 720 -> 24,826 signatures and a blown
// 3s statement timeout. The 500 threshold below is fetch-article's own long-standing cutoff.
export function classifyExtraction(httpStatus, text) {
  if (httpStatus == null || httpStatus < 200 || httpStatus >= 300) return "not_attempted";
  const len = (text || "").length;
  if (len > 500) return "full_text";
  return len > 0 ? "below_threshold" : "empty";
}

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body || {};
  if (!url || typeof url !== "string") return res.status(400).json({ error: "url is required" });

  // -- Primary path: fetch + Readability extraction --
  // FEATURE: LOG-109 -- instrumented via the shared logActivity() service (AA-190), ai_type from
  // the generated SERVICE_SLUG constant (AI-53) so it can never diverge from SERVICE_CATALOG.
  // Equal to its own catalog slug, so capabilitySlugForRow()'s `|| rawSlug` fallback resolves it
  // with no AI_TYPE_TO_SERVICE entry -- same as channel-intelligence/quality-gate/agent-turn.
  const primaryStart = Date.now();
  let httpStatus = null;
  let extractionOutcome = "not_attempted";
  const logPrimary = () => logActivity({
    tenantId: "global",
    agentId: null,
    aiType: SERVICE_SLUG.ARTICLE_EXTRACTION,
    feature: SERVICE_SLUG.ARTICLE_EXTRACTION,
    latencyMs: Date.now() - primaryStart,
    callFacts: { http_status: httpStatus, extraction_outcome: extractionOutcome },
  });

  try {
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DeepBenchBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    httpStatus = pageRes.status;
    if (pageRes.ok) {
      const html = await pageRes.text();
      const dom = new JSDOM(html, { url });
      const article = new Readability(dom.window.document).parse();
      const text = article?.textContent?.trim() || "";
      extractionOutcome = classifyExtraction(httpStatus, text);
      // Treat a short/empty extraction as a paywall/bot-block signal, not a usable result.
      if (extractionOutcome === "full_text") {
        logPrimary();
        return res.status(200).json({
          source: "full_text",
          title: article.title || null,
          text,
        });
      }
    }
  } catch (err) {
    console.error("[fetch-article] extraction failed, falling back:", err.message);
  }
  logPrimary();

  // -- Fallback path: ask Claude to summarize from the URL, using its own web_search tool --
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured", primary_failure: { http_status: httpStatus, extraction_outcome: extractionOutcome } });

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
      return res.status(502).json({ error: "Fallback summary failed: " + errText.slice(0, 200), primary_failure: { http_status: httpStatus, extraction_outcome: extractionOutcome } });
    }
    const claudeData = await claudeRes.json();
    const usedWebSearch = (claudeData.content || []).some(b => b.type === "server_tool_use" && b.name === "web_search");
    const textBlock = (claudeData.content || []).find(b => b.type === "text");
    const summary = textBlock?.text?.trim();
    if (!summary) return res.status(502).json({ error: "Fallback summary returned no text", primary_failure: { http_status: httpStatus, extraction_outcome: extractionOutcome } });

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
    return res.status(500).json({ error: err.message, primary_failure: { http_status: httpStatus, extraction_outcome: extractionOutcome } });
  }
}

export default withRequestContext(handler);
