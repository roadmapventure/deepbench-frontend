// DeepBench v5.2.12 | db-assembly.js | Prompt Service — DB Assembly
// FEATURE: AA-03 — Reads agent competency data from Supabase, returns Prompt Request

export const config = { maxDuration: 30, runtime: "nodejs" };

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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl) return res.status(500).json({ error: "SUPABASE_URL not configured" });
  if (!supabaseKey) return res.status(500).json({ error: "SUPABASE_SERVICE_KEY not configured" });

  const { tenant_id, task_context, agent_id, capability_slug } = req.body || {};

  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });
  if (!task_context) return res.status(400).json({ error: "task_context required" });

  const headers = getSupabaseHeaders(supabaseKey);

  try {
    const promptRequest = {
      tenant_id,
      task_context,
      agent_id: agent_id || null,
      capability_slug: capability_slug || null,
      agent_configs: null,
      capabilities: null,
      skill_profiles: null,
    };

    // 1. Load agent_configs if agent_id provided
    if (agent_id) {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/agent_configs?tenant_id=eq.${encodeURIComponent(tenant_id)}&agent_id=eq.${encodeURIComponent(agent_id)}&select=id,type,name,text,is_default`,
        { headers }
      );
      if (r.ok) promptRequest.agent_configs = await r.json();
    }

    // 2. Load capability + skill_profiles if capability_slug provided
    if (capability_slug) {
      // Load capability record
      const capR = await fetch(
        `${supabaseUrl}/rest/v1/capabilities?or=(tenant_id.eq.${encodeURIComponent(tenant_id)},tenant_id.is.null)&slug=eq.${encodeURIComponent(capability_slug)}&select=*&limit=1`,
        { headers }
      );
      if (capR.ok) {
        const caps = await capR.json();
        promptRequest.capabilities = caps?.[0] || null;
      }

      // Load skill_profiles for this capability, ordered by display_order
      const spR = await fetch(
        `${supabaseUrl}/rest/v1/capability_skill_profiles?capability_slug=eq.${encodeURIComponent(capability_slug)}&select=level,is_required,display_order,skill_profiles(*)&order=display_order.asc`,
        { headers }
      );
      if (spR.ok) {
        const rows = await spR.json();
        promptRequest.skill_profiles = (rows || []).map(row => ({
          ...row.skill_profiles,
          level: row.level,
          is_required: row.is_required,
          display_order: row.display_order,
        }));
      }
    }

    // 3. If agent_id but no capability_slug — load all capabilities assigned to agent
    if (agent_id && !capability_slug) {
      const assignR = await fetch(
        `${supabaseUrl}/rest/v1/agent_capability_assignments?tenant_id=eq.${encodeURIComponent(tenant_id)}&agent_id=eq.${encodeURIComponent(agent_id)}&select=capability_slug`,
        { headers }
      );
      if (assignR.ok) {
        const assignments = await assignR.json();
        if (assignments?.length) {
          const slugs = assignments.map(a => a.capability_slug);

          // Load capability records
          const slugFilter = slugs.map(s => `"${s}"`).join(",");
          const capsR = await fetch(
            `${supabaseUrl}/rest/v1/capabilities?or=(tenant_id.eq.${encodeURIComponent(tenant_id)},tenant_id.is.null)&slug=in.(${slugFilter})&select=*`,
            { headers }
          );
          if (capsR.ok) promptRequest.capabilities = await capsR.json();

          // Load skill_profiles for each capability
          const allSPs = [];
          for (const slug of slugs) {
            const spR = await fetch(
              `${supabaseUrl}/rest/v1/capability_skill_profiles?capability_slug=eq.${encodeURIComponent(slug)}&select=level,is_required,display_order,skill_profiles(*)&order=display_order.asc`,
              { headers }
            );
            if (spR.ok) {
              const rows = await spR.json();
              allSPs.push(...(rows || []).map(row => ({
                ...row.skill_profiles,
                source_capability_slug: slug,
                level: row.level,
                is_required: row.is_required,
                display_order: row.display_order,
              })));
            }
          }
          promptRequest.skill_profiles = allSPs;
        }
      }
    }

    return res.status(200).json(promptRequest);

  } catch (err) {
    console.error("[db-assembly]", err);
    return res.status(500).json({ error: err.message });
  }
}
