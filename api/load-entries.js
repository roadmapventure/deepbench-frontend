// DeepBench v5.3.5 | load-entries.js | SH-11 — merged POST (ingest) handler; ingest.js retired to stay within Vercel Hobby 12-function limit
// FEATURE: PE-03 — Training tab live wiring
// FEATURE: PE-11 — Edit Course inline sub-view
// FEATURE: SH-11 — Merged from ingest.js (2026-07-01) — second merge into this file, see history below
// Merged from knowledge-entry.js to stay within Vercel Hobby 12-function limit

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!supabaseUrl) return res.status(500).json({ error: "SUPABASE_URL not configured" });
  if (!supabaseKey) return res.status(500).json({ error: "SUPABASE_SERVICE_KEY not configured" });

  const headers = {
    "Content-Type": "application/json",
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
  };

  try {
    // ── POST — embed and upsert a new knowledge entry ─────────────────────────
    // FEATURE: SH-11 — merged from ingest.js unchanged
    if (req.method === "POST") {
      if (!openaiKey) return res.status(500).json({ error: "OPENAI_API_KEY not configured" });

      const {
        id, title, category, jurisdiction, priority,
        triggers, content, status, tenant_id,
        agent_id, teaching_note,
        data_type, citeable, is_baseline, supersedes_id, confidence, override_flag,
        geo, program_area, partner_id, period,
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "title and content are required" });
      }

      const MAX_EMBED_CHARS = 12000;
      const truncatedContent = content.length > MAX_EMBED_CHARS
        ? content.slice(0, MAX_EMBED_CHARS) + " [truncated for embedding]"
        : content;

      const cleanedContent = truncatedContent
        .replace(/[^\x20-\x7E\n\r]/g, " ")
        .replace(/\s{3,}/g, "  ")
        .trim();

      const textToEmbed = `${title}\n\n${cleanedContent}`;

      const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({ model: "text-embedding-3-small", input: textToEmbed }),
      });

      if (!embeddingRes.ok) {
        const err = await embeddingRes.text();
        return res.status(500).json({ error: "OpenAI embedding failed: " + err.slice(0, 200) });
      }

      const embeddingData = await embeddingRes.json();
      const embedding = embeddingData.data?.[0]?.embedding;
      if (!embedding) return res.status(500).json({ error: "No embedding returned from OpenAI" });

      const payload = {
        title,
        category:      category      || "Compliance",
        jurisdiction:  jurisdiction  || "All",
        priority:      priority      || 50,
        triggers:      triggers      || [],
        content,
        embedding,
        status:        status        || "active",
        tenant_id:     tenant_id     || "global",
        agent_id:      agent_id      || "legacy",
        teaching_note: teaching_note || null,
        data_type:     data_type     || "sourced",
        citeable:      citeable      === undefined ? true : citeable,
        is_baseline:   is_baseline   || false,
        supersedes_id: supersedes_id || null,
        confidence:    confidence    || null,
        override_flag: override_flag === undefined ? null : override_flag,
        geo:           geo           || null,
        program_area:  program_area  || null,
        partner_id:    partner_id    || null,
        period:        period        || null,
      };

      if (id) payload.id = id;

      const upsertRes = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_entries?on_conflict=id`,
        {
          method: "POST",
          headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify(payload),
        }
      );

      if (!upsertRes.ok) {
        const err = await upsertRes.text();
        return res.status(500).json({ error: "Supabase upsert failed: " + err.slice(0, 200) });
      }

      const saved = await upsertRes.json();
      return res.status(200).json({ success: true, entry: saved?.[0] || payload });
    }

    // ── GET — fetch and format knowledge entries for an agent ─────────────────
    if (req.method === "GET") {
      const tenant_id = req.query.tenant_id || "global";
      const agent_id  = req.query.agent_id  || null;

      const agentFilter = agent_id
        ? `&or=(agent_id.eq.${encodeURIComponent(agent_id)},agent_id.eq.legacy)`
        : "";

      const fetchRes = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_entries?tenant_id=eq.${encodeURIComponent(tenant_id)}${agentFilter}&select=id,title,category,jurisdiction,priority,triggers,content,status,tenant_id,agent_id,teaching_note,source,steps_taken,created_at&order=created_at.desc`,
        { method: "GET", headers }
      );

      if (!fetchRes.ok) {
        const err = await fetchRes.text();
        return res.status(500).json({ error: "Supabase fetch failed: " + err.slice(0, 200) });
      }

      const entries = await fetchRes.json();
      const formatted = (entries || []).map(e => ({
        id:            e.id,
        title:         e.title,
        category:      e.category,
        jurisdiction:  e.jurisdiction,
        priority:      e.priority,
        triggers:      e.triggers || [],
        status:        e.status,
        tenant_id:     e.tenant_id,
        agent_id:      e.agent_id || "legacy",
        teaching_note: e.teaching_note || "",
        source_type:   e.source || "user",
        steps_taken:   e.steps_taken || null,
        created_at:    e.created_at || null,
        content:       e.content || "",
        isDemo:        false,
        source:        e.created_at
          ? `Added ${new Date(e.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}`
          : "Knowledge base",
      }));

      return res.status(200).json({ entries: formatted, count: formatted.length });
    }

    // ── PATCH — toggle status or update metadata fields ───────────────────────
    if (req.method === "PATCH") {
      const { id, tenant_id = "global", status, title, category, jurisdiction, teaching_note, triggers, priority } = req.body;
      if (!id) return res.status(400).json({ error: "id required" });

      const patch = {};
      if (status !== undefined) {
        if (!["active", "disabled"].includes(status)) {
          return res.status(400).json({ error: "status must be 'active' or 'disabled'" });
        }
        patch.status = status;
      }
      if (title        !== undefined) patch.title        = title;
      if (category     !== undefined) patch.category     = category;
      if (jurisdiction !== undefined) patch.jurisdiction = jurisdiction;
      if (teaching_note!== undefined) patch.teaching_note= teaching_note;
      if (triggers     !== undefined) patch.triggers     = triggers;
      if (priority     !== undefined) patch.priority     = priority;

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      const r = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_entries?id=eq.${id}&tenant_id=eq.${encodeURIComponent(tenant_id)}`,
        { method: "PATCH", headers: { ...headers, "Prefer": "return=representation" }, body: JSON.stringify(patch) }
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
    console.error("[load-entries]", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
