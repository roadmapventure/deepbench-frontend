// DeepBench v5.1.22 | knowledge-entry.js | PATCH + DELETE for knowledge_entries
// FEATURE: PE-03 — Training tab live wiring

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "PATCH,DELETE,OPTIONS");
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
    // ── PATCH — update status field only ─────────────────────────────────────
    if (req.method === "PATCH") {
      const { id, tenant_id = "global", status } = req.body;
      if (!id) return res.status(400).json({ error: "id required" });
      if (!["active", "disabled"].includes(status)) {
        return res.status(400).json({ error: "status must be 'active' or 'disabled'" });
      }

      const r = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_entries?id=eq.${id}&tenant_id=eq.${encodeURIComponent(tenant_id)}`,
        {
          method: "PATCH",
          headers: { ...headers, "Prefer": "return=representation" },
          body: JSON.stringify({ status }),
        }
      );
      if (!r.ok) {
        const err = await r.text();
        return res.status(500).json({ error: "Supabase patch failed: " + err.slice(0, 200) });
      }
      const updated = await r.json();
      return res.status(200).json({ entry: Array.isArray(updated) ? updated[0] : updated });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const { id, tenant_id = "global" } = req.body;
      if (!id) return res.status(400).json({ error: "id required" });

      const r = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_entries?id=eq.${id}&tenant_id=eq.${encodeURIComponent(tenant_id)}`,
        { method: "DELETE", headers: { ...headers, "Prefer": "return=minimal" } }
      );
      if (!r.ok) {
        const err = await r.text();
        return res.status(500).json({ error: "Supabase delete failed: " + err.slice(0, 200) });
      }
      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[knowledge-entry]", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
