// DeepBench v5.2.13 | api/rag-query.js | RAG query handler — thin wrapper over api/lib/rag.js
// FEATURE: AA-43 — delegates to shared queryRAG module. External/frontend callers use this endpoint.
import { queryRAG } from "../lib/rag.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { queryText, agent_id, tenant_id, matchCount = 5, scope = "agent" } = req.body || {};
  if (!queryText) return res.status(400).json({ error: "queryText is required" });

  try {
    const result = await queryRAG({ queryText, agentId: agent_id, tenantId: tenant_id, matchCount, scope });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
