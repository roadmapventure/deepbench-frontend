// DeepBench v5.1.2 | upload-csv.js | CSV upload to Supabase Storage
// FEATURE: SH-07 — CSV upload to Supabase Storage
// Receives base64-encoded CSV (JSON body) — avoids formidable dependency on Vercel.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) return res.status(500).json({ error: "SUPABASE_URL not configured" });
  if (!supabaseKey) return res.status(500).json({ error: "SUPABASE_SERVICE_KEY not configured" });

  try {
    const { fileBase64, taskId, tenantId } = req.body;

    if (!fileBase64) return res.status(400).json({ error: "fileBase64 is required" });
    if (!taskId)     return res.status(400).json({ error: "taskId is required" });
    if (!tenantId)   return res.status(400).json({ error: "tenantId is required" });

    const storagePath = `${tenantId}/${taskId}/file.csv`;
    const fileBuffer  = Buffer.from(fileBase64, "base64");

    // Upload to Supabase Storage (upsert: overwrite if exists)
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/task-data/${storagePath}`,
      {
        method:  "POST",
        headers: {
          "apikey":        supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type":  "text/csv",
          "x-upsert":      "true",
        },
        body: fileBuffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return res.status(500).json({ error: "Storage upload failed: " + err.slice(0, 200) });
    }

    // Update tasks table — set csv_path to the storage path
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/tasks?id=eq.${taskId}&tenant_id=eq.${tenantId}`,
      {
        method:  "PATCH",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer":        "return=minimal",
        },
        body: JSON.stringify({ csv_path: storagePath }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      return res.status(500).json({ error: "Task csv_path update failed: " + err.slice(0, 200) });
    }

    return res.status(200).json({ success: true, path: storagePath });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
