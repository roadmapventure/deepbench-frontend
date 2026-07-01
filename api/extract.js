// DeepBench v5.3.7 | api/extract.js | S-APPLE-02c — SH-11 second merge slice: upload-csv.js absorbed
// FEATURE: SH-11 — api/upload-csv.js merged into api/extract.js (action dispatch) to free a Vercel Hobby serverless slot
// FEATURE: MI-12 — both branches now call logDeterministic() (AI Audit §13.3 gap closed — deterministic routes must log too)

import { Buffer } from "buffer";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

function getSupabaseHeaders(key) {
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

function logDeterministic({ supabaseUrl, supabaseKey, tenantId, feature, latencyMs }) {
  if (!supabaseUrl || !supabaseKey) return;
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: 'POST',
    headers: { ...getSupabaseHeaders(supabaseKey), Prefer: 'return=minimal' },
    body: JSON.stringify({
      tenant_id: tenantId || 'global',
      ai_type: 'deterministic',
      feature,
      model: null,
      agent_id: null,
      latency_ms: latencyMs,
      created_at: new Date().toISOString(),
    }),
  }).catch(e => console.warn('[extract] activity log failed:', e.message));
}

async function handleExtract(req, res, startTime) {
  const { fileData, fileType, fileName, tenantId } = req.body;

  if (!fileData) {
    return res.status(400).json({ error: "fileData is required" });
  }

  // fileData is base64-encoded file content from the browser
  const buffer = Buffer.from(fileData, "base64");

  let extractedText = "";
  let wordCount = 0;

  if (fileType === "application/pdf" || fileName?.toLowerCase().endsWith(".pdf")) {
    // ── PDF extraction using pdf-parse ──────────────────────────────────
    // pdf-parse handles FlateDecode, font encoding, and all PDF internals
    // It returns only the actual readable text content
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;

    const data = await pdfParse(buffer, {
      // Normalise whitespace — join hyphenated line breaks
      pagerender: function(pageData) {
        return pageData.getTextContent({
          normalizeWhitespace: true,
          disableCombineTextItems: false,
        }).then(function(textContent) {
          let lastY, text = "";
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += "\n" + item.str;
            }
            lastY = item.transform[5];
          }
          return text;
        });
      }
    });

    // Clean up extracted text
    extractedText = data.text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Remove lines that are purely numbers/coordinates (PDF artifacts)
      .replace(/^\s*[\d\.\-]+\s*$/gm, "")
      // Collapse 3+ blank lines to 2
      .replace(/\n{3,}/g, "\n\n")
      // Remove lines shorter than 3 chars (usually noise)
      .split("\n")
      .filter(line => line.trim().length > 2 || line.trim() === "")
      .join("\n")
      .trim();

  } else if (fileName?.toLowerCase().endsWith(".docx")) {
    // ── DOCX extraction ─────────────────────────────────────────────────
    // For DOCX, extract the XML content from the zip
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const wordDoc = zip.file("word/document.xml");

    if (wordDoc) {
      const xml = await wordDoc.async("string");
      // Strip XML tags, keep text content
      extractedText = xml
        .replace(/<w:br[^>]*\/>/g, "\n")
        .replace(/<w:p[ >]/g, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#x[0-9A-Fa-f]+;/g, " ")
        .replace(/\s{3,}/g, "  ")
        .trim();
    } else {
      return res.status(400).json({ error: "Could not find document content in DOCX file" });
    }

  } else {
    // ── Plain text (TXT) ─────────────────────────────────────────────────
    extractedText = buffer.toString("utf-8");
  }

  if (!extractedText || extractedText.length < 10) {
    return res.status(400).json({ error: "Could not extract readable text from this file. The document may be scanned or image-based." });
  }

  // Final clean pass — ensure only printable characters
  const cleaned = extractedText
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/[ \t]{3,}/g, "  ")
    .trim();

  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  wordCount = words.length;

  logDeterministic({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_KEY,
    tenantId: tenantId || null,
    feature: 'document-extraction',
    latencyMs: Date.now() - startTime,
  });

  return res.status(200).json({
    text: cleaned,
    wordCount,
    preview: words.slice(0, 200).join(" "), // first 200 words for the UI preview
  });
}

async function handleUploadCsv(req, res, startTime) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) return res.status(500).json({ error: "SUPABASE_URL not configured" });
  if (!supabaseKey) return res.status(500).json({ error: "SUPABASE_SERVICE_KEY not configured" });

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

  logDeterministic({
    supabaseUrl,
    supabaseKey,
    tenantId,
    feature: 'csv-upload',
    latencyMs: Date.now() - startTime,
  });

  return res.status(200).json({ success: true, path: storagePath });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const startTime = Date.now();
  const action = req.body?.action === 'upload-csv' ? 'upload-csv' : 'extract';

  try {
    if (action === 'upload-csv') return await handleUploadCsv(req, res, startTime);
    return await handleExtract(req, res, startTime);
  } catch (err) {
    console.error(`[extract:${action}] error:`, err);
    return res.status(500).json({ error: err.message, ...(action === 'extract' ? { hint: "If this is a scanned PDF, text extraction is not supported — use a text-based PDF or DOCX instead." } : {}) });
  }
}
