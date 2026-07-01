// DeepBench v5.3.3 | lib/librarian.js | AG-27 — ai_type fix for AI Audit attribution (S-LIBRARIAN-01b)
// FEATURE: AG-27 — credential-checked Data Room broker. Wraps queryRAG(), does not duplicate its logic.
// Called from api/prompt/ai-enrichment.js's fetchSection() when fetch_instruction.broker === "librarian" (wired S-LIBRARIAN-01b).
// Default behavior for every existing caller is unchanged — broker is opt-in per Skill Profile.

import { queryRAG } from "./rag.js";

async function getCredentials(requestingAgentId, supabaseUrl, supabaseKey) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/agents?id=eq.${encodeURIComponent(requestingAgentId)}&select=data_room_access,uber_access`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  if (!res.ok) return { data_room_access: [], uber_access: false };
  const rows = await res.json();
  if (!rows || !rows[0]) return { data_room_access: [], uber_access: false };
  return {
    data_room_access: Array.isArray(rows[0].data_room_access) ? rows[0].data_room_access : [],
    uber_access: !!rows[0].uber_access,
  };
}

function logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier, granted }) {
  if (!supabaseUrl || !supabaseKey) return;
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      tenant_id: "global",
      agent_id: "eleanor",
      ai_type: "librarian",
      feature: "librarian",
      patterns_used: ["rag"],
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {});
  // requestingAgentId/tier/granted are not yet persisted columns on ai_activity_log —
  // logged here as the call-site contract; STANDARDS.md Section 5 Category M consistency
  // check applies if a future session adds dedicated columns for them.
  void requestingAgentId; void tier; void granted;
}

export async function queryLibrary({ requestingAgentId, queryText, tenantId, matchCount = 5 }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!requestingAgentId) {
    return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-no-credential" } };
  }
  if (!supabaseUrl || !supabaseKey) {
    return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-no-config" } };
  }

  const { data_room_access, uber_access } = await getCredentials(requestingAgentId, supabaseUrl, supabaseKey);

  if (uber_access) {
    const result = await queryRAG({ queryText, tenantId, matchCount, scope: "platform" });
    logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: "uber", granted: true });
    return { ...result, _librarian: { granted: true, tier: "uber" } };
  }

  if (data_room_access.length === 1) {
    const tag = data_room_access[0];
    const result = await queryRAG({ queryText, agentId: tag, tenantId, matchCount, scope: "agent" });
    logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: `data-room:${tag}`, granted: true });
    return { ...result, _librarian: { granted: true, tier: `data-room:${tag}` } };
  }

  if (data_room_access.length > 1) {
    // FEATURES.md AA-74 — match_knowledge only accepts a single p_agent_id filter.
    // Deny rather than silently picking one tag.
    logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: "denied-multi-data-room-unsupported", granted: false });
    return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-multi-data-room-unsupported" } };
  }

  logLibrarianCall({ supabaseUrl, supabaseKey, requestingAgentId, tier: "denied-no-access", granted: false });
  return { context: "", chunks: [], matchCount: 0, _librarian: { granted: false, tier: "denied-no-access" } };
}
