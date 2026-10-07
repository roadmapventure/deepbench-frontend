// DeepBench v7.0.808 | api/agent-configs.js | AGT-409 -- the Skill editor's save: POST action `update_skill` writes the allowlisted skill_profiles columns of one skill id (lib/skill-write.js updateSkill()); bad fields are a 400, an absent skill a 404. No model call, so no logAICall().
// DeepBench v7.0.796 | api/agent-configs.js | AGT-392 -- the Identity editor: GET with `identity=1`
// answers one agent's identity row (readAgentIdentity()); POST action `update_identity` saves its name,
// role, specialty and bio (updateAgentIdentity(), origin deepbench), for any agent id, 404 when absent.
// No model call, so no logAICall().
// DeepBench v7.0.792 | api/agent-configs.js | AGT-390 -- the plain POST (a role prompt, an output format
// or a guardrail saved on the Resume or Playbook tab) is lib/knowledge-write.js's insertAgentConfig(),
// shared with the MCP Teach tool, and every row it writes carries origin `deepbench`. Same messages,
// same statuses. No model call, so no logAICall().
// DeepBench v7.0.790 | api/agent-configs.js | AGT-386 -- two more POST body actions on the same route:
// `add_agent_to_team` (one private agent onto one team) and `archive_private_agent` (is_active false,
// nothing deleted), both through lib/private-agent-create.js. No model call, so no logAICall().
// DeepBench v7.0.773 | api/agent-configs.js | AGT-338 slice 3 -- GET with `teams=1` answers the name
// and address of each team the agent is on (readAgentTeams()), so the Connect popup can offer the
// team address. Every other request takes the path it took before.
// DeepBench v7.0.762 | api/agent-configs.js | AGT-337 slice 1 -- POST carries a body `action`:
// `create_private_agent` saves a blank private agent through lib/private-agent-create.js
// (ARCHITECTURE.md §19u decision 6). Every other request takes the path it took before.
// DeepBench v7.0.34 | api/agent-configs.js | LOG-121 -- handler wrapped in withRequestContext(); the
// request-scoped context is read inside logActivity(), so no logging call site in this file changes.
// This route reaches no logActivity() call today -- wrapping it is inert now and means a logging
// site added here later cannot silently lose attribution.
import { withRequestContext } from "../lib/request-context.js";
import { insertAgentConfig } from "../lib/knowledge-write.js";
import { createPrivateAgent, readCreateInput, addAgentToTeam, readAddToTeamInput, archivePrivateAgent, readAgentIdInput, readIdentityInput, updateAgentIdentity, readAgentIdentity } from "../lib/private-agent-create.js";
import { readSkillInput, updateSkill } from "../lib/skill-write.js";

// FEATURE: AGT-338 -- the teams an agent is on, by name, each with its address. This is a
// service-key read: the browser's key cannot read `teams.address` (a column grant). With no
// logins, whoever can open the agent's Personnel file can read it. An address that is not 64
// lowercase hex is not offered. A failed read throws, and the handler answers its existing 500.
export async function readAgentTeams(agentId, { supabaseUrl, supabaseKey, fetchImpl = fetch }) {
  const r = await fetchImpl(
    `${supabaseUrl}/rest/v1/agent_teams?agent_id=eq.${encodeURIComponent(agentId)}&select=teams(name,address)`,
    { method: "GET", headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
  if (!r.ok) throw new Error(`Reading agent_teams failed: HTTP ${r.status}`);
  const rows = await r.json();
  return (Array.isArray(rows) ? rows : [])
    .map(row => row && row.teams)
    .filter(t => t && typeof t.name === "string" && /^[0-9a-f]{64}$/.test(t.address))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) return res.status(500).json({ error: "SUPABASE_URL not configured" });
  if (!supabaseKey) return res.status(500).json({ error: "SUPABASE_SERVICE_KEY not configured" });

  const headers = {
    "Content-Type": "application/json",
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
  };

  try {

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      const { tenant_id = "global", agent_id, type, teams, identity } = req.query;
      if (!agent_id) return res.status(400).json({ error: "agent_id required" });
      if (teams === "1") return res.status(200).json({ teams: await readAgentTeams(agent_id, { supabaseUrl, supabaseKey }) });
      // FEATURE: AGT-392 -- the Identity editor's read: one agent's identity row, 404 when absent.
      if (identity === "1") {
        try {
          return res.status(200).json({ identity: await readAgentIdentity(agent_id, { supabaseUrl, supabaseKey }) });
        } catch (error) {
          return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
        }
      }

      let url = `${supabaseUrl}/rest/v1/agent_configs?tenant_id=eq.${encodeURIComponent(tenant_id)}&agent_id=eq.${encodeURIComponent(agent_id)}&order=created_at.asc`;
      if (type) url += `&type=eq.${encodeURIComponent(type)}`;

      const r = await fetch(url, { method: "GET", headers });
      if (!r.ok) {
        const err = await r.text();
        return res.status(500).json({ error: "Supabase fetch failed: " + err.slice(0, 200) });
      }
      const configs = await r.json();
      return res.status(200).json({ configs: configs || [] });
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === "POST") {
      if (req.body?.action === "create_private_agent") {
        const input = readCreateInput(req.body);
        if (input.error) return res.status(400).json({ error: input.error });
        try {
          return res.status(201).json(await createPrivateAgent(input, { supabaseUrl, supabaseKey }));
        } catch (error) {
          return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
        }
      }

      // FEATURE: AGT-386 -- put one private agent on one team (lib/private-agent-create.js).
      if (req.body?.action === "add_agent_to_team") {
        const input = readAddToTeamInput(req.body);
        if (input.error) return res.status(400).json({ error: input.error });
        try {
          return res.status(200).json(await addAgentToTeam(input, { supabaseUrl, supabaseKey }));
        } catch (error) {
          return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
        }
      }

      // FEATURE: AGT-386 -- archive one private agent: is_active false, nothing deleted.
      if (req.body?.action === "archive_private_agent") {
        const input = readAgentIdInput(req.body);
        if (input.error) return res.status(400).json({ error: input.error });
        try {
          return res.status(200).json(await archivePrivateAgent(input, { supabaseUrl, supabaseKey }));
        } catch (error) {
          return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
        }
      }

      // FEATURE: AGT-392 -- the Identity editor's save: name, role, specialty, bio; DeepBench's own write.
      if (req.body?.action === "update_identity") {
        const input = readIdentityInput(req.body);
        if (input.error) return res.status(400).json({ error: input.error });
        try {
          return res.status(200).json(await updateAgentIdentity(input, { supabaseUrl, supabaseKey }));
        } catch (error) {
          return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
        }
      }

      // FEATURE: AGT-409 -- the Skill editor's save: allowlisted skill_profiles columns for one skill id.
      if (req.body?.action === "update_skill") {
        const input = readSkillInput(req.body);
        if (input.error) return res.status(400).json({ error: input.error });
        try {
          return res.status(200).json(await updateSkill(input, { supabaseUrl, supabaseKey }));
        } catch (error) {
          return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
        }
      }

      // FEATURE: AGT-390 -- one insert, shared with the MCP Teach tool; DeepBench's own write.
      try {
        const config = await insertAgentConfig({ ...req.body, origin: "deepbench", origin_caller: null });
        return res.status(201).json({ config });
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || "Internal server error" });
      }
    }

    // ── PATCH ────────────────────────────────────────────────────────────────
    if (req.method === "PATCH") {
      const { id, tenant_id = "global", ...fields } = req.body;
      if (!id) return res.status(400).json({ error: "id required" });

      // If setting as default, first fetch the row to get agent_id + type, then clear others
      if (fields.is_default === true) {
        const lookupRes = await fetch(
          `${supabaseUrl}/rest/v1/agent_configs?id=eq.${id}&select=agent_id,type`,
          { method: "GET", headers }
        );
        if (lookupRes.ok) {
          const rows = await lookupRes.json();
          const existing = rows?.[0];
          if (existing) {
            await fetch(
              `${supabaseUrl}/rest/v1/agent_configs?tenant_id=eq.${encodeURIComponent(tenant_id)}&agent_id=eq.${encodeURIComponent(existing.agent_id)}&type=eq.${encodeURIComponent(existing.type)}&id=neq.${id}`,
              { method: "PATCH", headers: { ...headers, "Prefer": "return=minimal" }, body: JSON.stringify({ is_default: false }) }
            );
          }
        }
      }

      // Strip server-only fields from the update payload
      const updatePayload = { ...fields, updated_at: new Date().toISOString() };
      delete updatePayload.id;
      delete updatePayload.agent_id;
      delete updatePayload.tenant_id;
      delete updatePayload.created_at;

      const patchRes = await fetch(
        `${supabaseUrl}/rest/v1/agent_configs?id=eq.${id}&tenant_id=eq.${encodeURIComponent(tenant_id)}`,
        {
          method: "PATCH",
          headers: { ...headers, "Prefer": "return=representation" },
          body: JSON.stringify(updatePayload),
        }
      );
      if (!patchRes.ok) {
        const err = await patchRes.text();
        return res.status(500).json({ error: "Supabase patch failed: " + err.slice(0, 200) });
      }
      const updated = await patchRes.json();
      return res.status(200).json({ config: Array.isArray(updated) ? updated[0] : updated });
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const { id, tenant_id = "global" } = req.body;
      if (!id) return res.status(400).json({ error: "id required" });

      const deleteRes = await fetch(
        `${supabaseUrl}/rest/v1/agent_configs?id=eq.${id}&tenant_id=eq.${encodeURIComponent(tenant_id)}`,
        { method: "DELETE", headers: { ...headers, "Prefer": "return=minimal" } }
      );
      if (!deleteRes.ok) {
        const err = await deleteRes.text();
        return res.status(500).json({ error: "Supabase delete failed: " + err.slice(0, 200) });
      }
      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    console.error("[agent-configs]", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

export default withRequestContext(handler);
