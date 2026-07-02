// DeepBench v5.3.13 | lib/librarian.js | AG-27 — writeLibrary() write broker (S-LIBRARIAN-02)
// FEATURE: AG-27 — credential-checked Data Room broker. Wraps queryRAG(), does not duplicate its logic.
// Called from api/prompt/ai-enrichment.js's fetchSection() when fetch_instruction.broker === "librarian" (wired S-LIBRARIAN-01b).
// Default behavior for every existing caller is unchanged — broker is opt-in per Skill Profile.

import { queryRAG } from "./rag.js";
import { embedAndUpsertEntry } from "./knowledge-write.js";

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

function logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier, granted }) {
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
      ai_type: "librarian-write",
      feature: `librarian-write:${operation}`,
      patterns_used: [],
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {});
  void requestingAgentId; void tier; void granted;
}

// FEATURE: AG-27 — writeLibrary(): the only path any agent capability uses to write
// into knowledge_entries. Mirrors queryLibrary()'s credential model exactly.
export async function writeLibrary({ requestingAgentId, tenantId, operation, data_room_tag, ...params }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!requestingAgentId) {
    return { success: false, _librarian: { granted: false, tier: "denied-no-credential" } };
  }
  if (!supabaseUrl || !supabaseKey) {
    return { success: false, _librarian: { granted: false, tier: "denied-no-config" } };
  }

  const { data_room_access, uber_access } = await getCredentials(requestingAgentId, supabaseUrl, supabaseKey);

  let targetTag;
  if (operation === "bulk_reset") {
    // Demo Reset is a platform-wide admin action, never a single-Data-Room agent's job —
    // requires uber_access AND an explicit tag, regardless of the requester's data_room_access.
    if (!uber_access || !data_room_tag) {
      const tier = "denied-uber-requires-explicit-tag";
      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier, granted: false });
      return { success: false, _librarian: { granted: false, tier } };
    }
    targetTag = data_room_tag;
  } else if (uber_access) {
    if (!data_room_tag) {
      return { success: false, _librarian: { granted: false, tier: "denied-uber-requires-explicit-tag" } };
    }
    targetTag = data_room_tag;
  } else if (data_room_access.length === 1) {
    targetTag = data_room_access[0];
  } else {
    const tier = data_room_access.length > 1 ? "denied-multi-data-room-unsupported" : "denied-no-access";
    logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier, granted: false });
    return { success: false, _librarian: { granted: false, tier } };
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    if (operation === "insert") {
      const entry = await embedAndUpsertEntry({ ...params, agent_id: targetTag, tenant_id: tenantId, is_baseline: false });
      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier: `data-room:${targetTag}`, granted: true });
      return { success: true, entry, _librarian: { granted: true, tier: `data-room:${targetTag}` } };
    }

    if (operation === "update_status") {
      const { id, status } = params;
      if (!id || !status) return { success: false, _librarian: { granted: false, tier: "denied-missing-params" } };
      const r = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_entries?id=eq.${id}&agent_id=eq.${encodeURIComponent(targetTag)}`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ status }) }
      );
      if (!r.ok) throw new Error("status update failed: " + (await r.text()).slice(0, 200));
      const updated = await r.json();
      if (!updated.length) {
        return { success: false, _librarian: { granted: false, tier: "denied-row-not-in-data-room" } };
      }
      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier: `data-room:${targetTag}`, granted: true });
      return { success: true, entry: updated[0], _librarian: { granted: true, tier: `data-room:${targetTag}` } };
    }

    if (operation === "bulk_reset") {
      const archiveRes = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_entries?agent_id=eq.${encodeURIComponent(targetTag)}&is_baseline=eq.false`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ status: "archived" }) }
      );
      if (!archiveRes.ok) throw new Error("bulk archive failed: " + (await archiveRes.text()).slice(0, 200));
      const archived = await archiveRes.json();

      const restoreRes = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_entries?agent_id=eq.${encodeURIComponent(targetTag)}&is_baseline=eq.true`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ status: "active" }) }
      );
      if (!restoreRes.ok) throw new Error("bulk restore failed: " + (await restoreRes.text()).slice(0, 200));
      const restored = await restoreRes.json();

      logLibrarianWrite({ supabaseUrl, supabaseKey, requestingAgentId, operation, tier: `data-room:${targetTag}`, granted: true });
      return { success: true, archivedCount: archived.length, restoredCount: restored.length, _librarian: { granted: true, tier: `data-room:${targetTag}` } };
    }

    return { success: false, _librarian: { granted: false, tier: "denied-unknown-operation" } };
  } catch (err) {
    return { success: false, error: err.message, _librarian: { granted: false, tier: `error:${targetTag}` } };
  }
}
