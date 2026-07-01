// DeepBench v5.1.30 | TeachScreen.jsx | AI-18 — susan agentId on extraction call
// FEATURE: TC-01 — Upload + ingest + RAG
// src/screens/TeachScreen.jsx — v5.0.0
// DeepBench v5 — Teach an agent (/bench/:agentId/teach)
// Upload doc → extract text → AI metadata → form → save to Supabase via /api/load-entries

import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { T, display, body, mono, skillLabel } from "../tokens.js";
import { TENANT_ID } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Corners, AgentAvatar, Toast } from "../components/SharedUI.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { AGENT_PRONOUNS, STANDARD_CATEGORIES, BRENT_CATEGORIES, JURISDICTIONS, FLAG_TRIGGERS } from "../data/agents.js";
import { priorityInfo } from "../utils.js";
import { logAICall } from "../hooks/useAIActivity.js";

// ── Extract text from uploaded file via /api/extract ─────────────────────────
// FEATURE: PE-10 patch 2 — readAsArrayBuffer → Uint8Array → btoa (binary-safe, no readAsDataURL)
async function extractTextFromFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bytes = new Uint8Array(e.target.result);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData: base64, fileType: file.type, fileName: file.name }),
        });
        const data = await res.json();
        if (!res.ok) { resolve({ text: "", wordCount: 0, error: data.error || "Extraction failed" }); return; }
        resolve({ text: data.text, wordCount: data.wordCount, error: null });
      } catch (err) {
        resolve({ text: "", wordCount: 0, error: err.message });
      }
    };
    reader.onerror = () => resolve({ text: "", wordCount: 0, error: "File read failed" });
    reader.readAsArrayBuffer(file);
  });
}

// ── Generate metadata from extracted text via /api/brief ─────────────────────
async function generateMetadata(filename, extractedText, agentId) {
  try {
    const snippet = extractedText.slice(0, 3000);
    const prompt = `You are a procurement knowledge management system. Analyze this document and return ONLY a JSON object with these fields:
{"title":"short descriptive title","category":"one of: Compliance,Jurisdiction,Best Practice,Internal,Standards,Methodology,Playbook,Template,Statute,Portal Navigation,Data Schema,Export Method,Auth Pattern,State Portal,Open Records,Research Method,Data Dictionary","jurisdiction":"one of: All,Federal,Texas,California,Florida,New York,Illinois","priority":50,"triggers":["array","of","flag","ids","from","maverick,po-split,spike,single-source,vendor-hhi,long-tail"]}

Document filename: ${filename}
Document text: ${snippet}

Return ONLY the JSON. No explanation.`;
    const res = await fetch("/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        agent_id: agentId,
        tenant_id: TENANT_ID,
        skipRag: true,
      }),
    });
    const data = await res.json();
    const raw = data.content?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    // FEATURE: AI-18 — susan owns document extraction capability
    logAICall({type:"extraction",model:"claude-haiku-4-5",location:"Teach Agent screen",agentId:"susan"});
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}

// ── TeachScreen ───────────────────────────────────────────────────────────────
export default function TeachScreen() {
  const { agentId } = useParams();
  const navigate    = useNavigate();
  const agents      = useAgents();
  const agent       = agents.find(a => a.id === agentId) || agents[0];
  const pronouns    = AGENT_PRONOUNS[agentId] || { object: "them" };
  const categories  = agentId === "brent"
    ? [...STANDARD_CATEGORIES, ...BRENT_CATEGORIES]
    : STANDARD_CATEGORIES;

  const [uploadState,    setUploadState]    = useState("idle"); // idle | uploading | ready
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile,   setUploadedFile]   = useState(null);
  const [extractedText,  setExtractedText]  = useState("");
  const [wordCount,      setWordCount]      = useState(0);
  const [extractedOpen,  setExtractedOpen]  = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [toast,          setToast]          = useState(null);
  const [form, setForm] = useState({
    title: "", category: "Standards", jurisdiction: "All",
    priority: 50, triggers: [], status: "active", teaching_note: "",
  });
  const fileRef = useRef(null);
  const locked  = uploadState !== "ready";
  const pInfo   = priorityInfo(form.priority);

  const showToast = (msg, icon = "✓") => {
    setToast({ msg, icon });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploadState("uploading"); setUploadProgress(0); setUploadedFile(file);
    // Fake progress ticker while extraction runs
    let prog = 0;
    const ticker = setInterval(() => {
      prog += Math.random() * 18 + 8;
      if (prog >= 90) { clearInterval(ticker); prog = 90; }
      setUploadProgress(Math.min(90, prog));
    }, 180);
    const result = await extractTextFromFile(file);
    clearInterval(ticker); setUploadProgress(100);
    if (result.error || !result.text) {
      setUploadState("idle");
      showToast(result.error || "Could not extract text", "⚠");
      return;
    }
    setExtractedText(result.text); setWordCount(result.wordCount);
    await new Promise(r => setTimeout(r, 400));
    setUploadState("ready");
    showToast("✨ Claude is analyzing your document…", "✨");
    const meta = await generateMetadata(file.name, result.text, agentId);
    if (meta) {
      setForm(f => ({
        ...f,
        title:        meta.title        || f.title,
        category:     meta.category     || f.category,
        jurisdiction: meta.jurisdiction || f.jurisdiction,
        priority:     meta.priority     ?? f.priority,
        triggers:     Array.isArray(meta.triggers) ? meta.triggers : f.triggers,
      }));
      showToast("Metadata generated — review before saving");
    } else {
      showToast("Could not auto-generate metadata — fill in manually", "⚠");
    }
  };

  const toggleTrigger = (id) => {
    if (id === "all") {
      setForm(f => ({ ...f, triggers: f.triggers.includes("all") ? [] : ["all"] }));
      return;
    }
    setForm(f => {
      const base = f.triggers.filter(t => t !== "all");
      return { ...f, triggers: base.includes(id) ? base.filter(t => t !== id) : [...base, id] };
    });
  };

  const handleSave = async () => {
    if (!form.title || !extractedText) { showToast("Title and document text are required", "⚠"); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/load-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, content: extractedText,
          tenant_id: TENANT_ID, agent_id: agentId,
          teaching_note: form.teaching_note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Save failed", "⚠"); setIsSaving(false); return; }
      showToast("Document indexed ✦");
      setTimeout(() => navigate(`/bench/${agentId}`), 900);
    } catch (err) {
      showToast("Network error: " + err.message, "⚠");
    }
    setIsSaving(false);
  };

  return (
    <AppShell toast={toast} headerProps={{ backLabel: agent.name.split(" ")[0], onBack: () => navigate(`/bench/${agentId}`) }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 60px", background: T.paperDeep }}>

        {/* Header */}
        <div style={{ fontFamily: mono, fontSize: 9.5, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 4 }}>Training Session · Add Training</div>
        <div style={{ fontFamily: display, fontSize: 28, fontWeight: 500, color: T.navy, letterSpacing: "-.5px", marginBottom: 5 }}>You're teaching {agent.name.split(" ")[0]}.</div>
        <div style={{ fontFamily: body, fontStyle: "italic", fontSize: 13, color: T.mutedDeep, marginBottom: 16 }}>Upload a document, tell {pronouns.object} how to weight it, and mark which flags it helps trigger.</div>
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
          <button onClick={() => navigate(`/bench/${agentId}`)} style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.mutedDeep, padding: "7px 18px", fontFamily: body, fontSize: 13, cursor: "pointer" }}>← Cancel</button>
        </div>
        <div style={{ height: 2, background: T.brass, marginBottom: 20 }} />

        {/* Agent identity strip */}
        <div style={{ background: `linear-gradient(135deg,${T.navy},${T.navyMid})`, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 18, borderBottom: `2px solid ${T.brass}` }}>
          <AgentAvatar who={agentId} size={52} ring={true} />
          <div style={{ marginRight: 24 }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: "#8fa3bf", letterSpacing: 1.2, marginBottom: 2 }}>{agent.code} · {agent.role.toUpperCase()}</div>
            <div style={{ fontFamily: display, fontSize: 17, fontWeight: 600, color: T.card, lineHeight: 1.1 }}>{agent.name}</div>
            <div style={{ fontFamily: mono, fontSize: 10.5, color: "#b8c5d8", marginTop: 3 }}>Currently <span style={{ color: T.brassLight, fontWeight: 600 }}>{skillLabel(agent.skill)} · {agent.skill}/100</span></div>
          </div>
          <div style={{ display: "flex", gap: 0 }}>
            {[["Documents", agent.docs], ["Class Hours", agent.classes], ["Chunks", agent.chunks.toLocaleString()], ["Tokens", agent.chunks > 0 ? `${(agent.chunks * 0.74).toFixed(1)}k` : "0"], ["Skill", `${agent.skill}/100`]].map(([k, v], i) => (
              <div key={k} style={{ padding: "0 16px", borderRight: i < 4 ? `1px solid rgba(255,255,255,.12)` : "none" }}>
                <div style={{ fontFamily: mono, fontSize: 8, color: "#8fa3bf", textTransform: "uppercase", letterSpacing: 1.3, marginBottom: 2 }}>{k}</div>
                <div style={{ fontFamily: display, fontSize: k === "Skill" ? 20 : 18, fontWeight: 600, color: k === "Skill" ? T.brassLight : T.card, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

          {/* LEFT: Form */}
          <div>
            {/* Exhibit A: File upload */}
            <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "16px 20px", marginBottom: 14, position: "relative" }}>
              <Corners />
              <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 12 }}>Exhibit A · Course Material</div>

              {/* Idle: drop zone */}
              {uploadState === "idle" && (
                <div onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                  style={{ border: `2px dashed ${T.brass}55`, padding: "32px", textAlign: "center", cursor: "pointer", background: T.cardAlt, transition: "all .2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = `rgba(182,135,58,0.08)`}
                  onMouseLeave={e => e.currentTarget.style.background = T.cardAlt}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                  <div style={{ fontFamily: display, fontSize: 15, fontWeight: 600, color: T.navy, marginBottom: 4 }}>Drop a document here</div>
                  <div style={{ fontFamily: body, fontSize: 12, color: T.muted, marginBottom: 14 }}>PDF, DOCX, TXT · Max 20MB</div>
                  <div style={{ display: "inline-block", background: T.brass, color: T.navy, padding: "8px 20px", fontFamily: body, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>↑ Browse File</div>
                  <input ref={fileRef} type="file" accept=".pdf,.txt,.docx" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
                </div>
              )}

              {/* Uploading: progress bar */}
              {uploadState === "uploading" && (
                <div style={{ border: `1px solid ${T.brass}40`, padding: "24px", textAlign: "center", background: T.cardAlt }}>
                  <div style={{ fontFamily: display, fontSize: 15, fontWeight: 600, color: T.navy, marginBottom: 12 }}>Extracting document text…</div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: T.muted, marginBottom: 10 }}>{uploadedFile?.name}</div>
                  <div style={{ background: T.paperDeep, height: 4, width: "100%", maxWidth: 320, margin: "0 auto 8px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: T.brass, width: `${uploadProgress}%`, transition: "width .2s" }} />
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: T.brassDeep }}>{Math.round(uploadProgress)}% complete</div>
                </div>
              )}

              {/* Ready: file confirmed */}
              {uploadState === "ready" && (
                <div style={{ border: `1px solid ${T.moss}50`, padding: "12px 14px", background: `${T.moss}05`, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 52, background: T.flag, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ fontFamily: mono, fontSize: 9, color: T.card, fontWeight: 700 }}>DOC</div>
                    <div style={{ fontFamily: mono, fontSize: 8, color: `${T.card}80`, marginTop: 2 }}>{uploadedFile ? `${(uploadedFile.size / 1e6).toFixed(1)}MB` : ""}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: display, fontSize: 14, fontWeight: 600, color: T.navy }}>{uploadedFile?.name}</div>
                    <div style={{ fontFamily: body, fontSize: 11.5, color: T.moss, marginTop: 2 }}>✓ {wordCount.toLocaleString()} words extracted</div>
                  </div>
                  <button onClick={() => { setUploadState("idle"); setUploadedFile(null); setExtractedText(""); }} style={{ fontFamily: body, fontSize: 11.5, color: T.brassDeep, background: "transparent", border: `1px solid ${T.line}`, padding: "5px 12px", cursor: "pointer" }}>✎ Replace</button>
                </div>
              )}
            </div>

            {/* Exhibit B: Weighting form */}
            <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "16px 20px", position: "relative", opacity: locked ? .38 : 1, pointerEvents: locked ? "none" : "auto", transition: "opacity .3s" }}>
              <Corners />
              <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 16 }}>Exhibit B · How {agent.name.split(" ")[0]} Should Weight This</div>

              {/* Title */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  Document Title
                  {!locked && <span style={{ fontFamily: mono, fontSize: 8, background: "rgba(155,110,243,0.12)", border: "1px solid rgba(155,110,243,0.3)", padding: "1px 5px", color: "#9b6ef3" }}>AI SUGGESTED</span>}
                </label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Document title…"
                  style={{ width: "100%", padding: "9px 12px", fontFamily: body, fontSize: 13, color: T.ink, background: T.cardAlt, border: `1px solid ${form.title ? T.brass : T.line}`, outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Category + Jurisdiction */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {[{ key: "category", label: "Category", options: categories }, { key: "jurisdiction", label: "Jurisdiction", options: JURISDICTIONS }].map(({ key, label, options }) => (
                  <div key={key}>
                    <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      {label}
                      {!locked && <span style={{ fontFamily: mono, fontSize: 8, background: "rgba(155,110,243,0.12)", border: "1px solid rgba(155,110,243,0.3)", padding: "1px 5px", color: "#9b6ef3" }}>AI</span>}
                    </label>
                    <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", fontFamily: body, fontSize: 13, color: T.ink, background: T.cardAlt, border: `1px solid ${T.line}`, outline: "none", cursor: "pointer" }}>
                      {options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Priority slider */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600 }}>Priority Weight</label>
                  <span style={{ fontFamily: mono, fontSize: 12, color: pInfo.color, fontWeight: 700 }}>{pInfo.label} · {form.priority}/100</span>
                </div>
                <input type="range" min={0} max={100} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))} style={{ width: "100%", accentColor: T.brass, marginBottom: 4 }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 9, color: T.muted }}>
                  <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
                </div>
              </div>

              {/* Flag triggers */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  Flag Triggers
                  {!locked && <span style={{ fontFamily: mono, fontSize: 8, background: "rgba(155,110,243,0.12)", border: "1px solid rgba(155,110,243,0.3)", padding: "1px 5px", color: "#9b6ef3" }}>AI</span>}
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
                  {FLAG_TRIGGERS.map(f => {
                    const on = form.triggers.includes("all") || form.triggers.includes(f.id);
                    return (
                      <button key={f.id} onClick={() => toggleTrigger(f.id)}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: on ? `${T.flag}10` : "transparent", border: `1px solid ${on ? T.flag : T.line}`, cursor: "pointer", fontFamily: mono, fontSize: 10.5, color: on ? T.flag : T.muted, textAlign: "left", transition: "all .15s" }}>
                        <span style={{ width: 12, height: 12, border: `1.5px solid ${on ? T.flag : T.line}`, background: on ? T.flag : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: T.card, flexShrink: 0 }}>{on ? "✓" : ""}</span>
                        ⚑ {f.label}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => toggleTrigger("all")}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: form.triggers.includes("all") ? `${T.flag}08` : "transparent", border: `1px dashed ${form.triggers.includes("all") ? T.flag : T.line}`, cursor: "pointer", fontFamily: mono, fontSize: 10.5, color: form.triggers.includes("all") ? T.flag : T.muted, transition: "all .15s" }}>
                  <span style={{ width: 12, height: 12, border: `1.5px solid ${form.triggers.includes("all") ? T.flag : T.line}`, background: form.triggers.includes("all") ? T.flag : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: T.card, flexShrink: 0 }}>{form.triggers.includes("all") ? "✓" : ""}</span>
                  ⚑ All Flags — always retrieve for every briefing
                </button>
              </div>

              {/* Teaching note */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 6, display: "block" }}>Teaching Note for {agent.name.split(" ")[0]}</label>
                <textarea value={form.teaching_note} onChange={e => setForm(f => ({ ...f, teaching_note: e.target.value }))}
                  placeholder={`Optional. Shapes how ${agent.name.split(" ")[0]} phrases findings that cite this document…`}
                  style={{ width: "100%", padding: "9px 12px", fontFamily: body, fontSize: 12.5, color: T.ink, background: T.cardAlt, border: `1px solid ${T.line}`, outline: "none", resize: "vertical", minHeight: 80, lineHeight: 1.5, fontStyle: "italic", boxSizing: "border-box" }} />
              </div>

              {/* Extracted text preview */}
              {uploadState === "ready" && (
                <div style={{ marginBottom: 14 }}>
                  <button onClick={() => setExtractedOpen(o => !o)}
                    style={{ width: "100%", padding: "9px 12px", background: T.cardAlt, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: mono, fontSize: 10, color: T.muted, letterSpacing: .5 }}>
                    <span>▾ View extracted document text</span>
                    <span style={{ fontFamily: mono, fontSize: 9, color: T.flag }}>READ ONLY · {wordCount.toLocaleString()} words</span>
                  </button>
                  {extractedOpen && (
                    <div style={{ background: T.navyDeep, border: `1px solid rgba(255,255,255,.1)`, borderTop: "none", padding: "12px 14px", fontFamily: mono, fontSize: 11, color: "#8fa3bf", lineHeight: 1.7, maxHeight: 180, overflowY: "auto", whiteSpace: "pre-wrap", userSelect: "none" }}>
                      {extractedText.split(/\s+/).slice(0, 300).join(" ")}{"\n\n[Read-only · Stored in Supabase]"}
                    </div>
                  )}
                </div>
              )}

              {/* Save action */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.lineSoft}` }}>
                <button onClick={() => navigate(`/bench/${agentId}`)} style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.mutedDeep, padding: "9px 20px", fontFamily: body, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSave} disabled={!form.title || isSaving || locked}
                  style={{ background: !form.title || locked ? T.line : `linear-gradient(135deg,${T.brass},${T.brassDeep})`, border: "none", color: !form.title || locked ? T.muted : T.navy, padding: "10px 24px", fontFamily: display, fontSize: 14, fontWeight: 700, cursor: !form.title || locked ? "not-allowed" : "pointer", opacity: isSaving ? .7 : 1 }}>
                  {isSaving ? "⏳ Saving…" : `▸ Teach ${agent.name.split(" ")[0]} this document`}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Projected impact */}
          <div>
            {/* Skill delta */}
            <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "16px 18px", marginBottom: 14, position: "relative" }}>
              <Corners />
              <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 14 }}>Projected Impact</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", marginBottom: 14 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Before</div>
                  <div style={{ fontFamily: display, fontSize: 40, fontWeight: 700, color: T.mutedDeep, lineHeight: 1 }}>{agent.skill}</div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{skillLabel(agent.skill)}</div>
                </div>
                <div style={{ fontFamily: display, fontSize: 22, color: T.brassDeep }}>→</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>After</div>
                  <div style={{ fontFamily: display, fontSize: 40, fontWeight: 700, color: T.moss, lineHeight: 1 }}>{Math.min(100, agent.skill + 3)}</div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: T.moss, fontWeight: 600 }}>▸ {skillLabel(Math.min(100, agent.skill + 3))}</div>
                </div>
              </div>
              <div style={{ fontFamily: body, fontSize: 12, color: T.mutedDeep, lineHeight: 1.5, fontStyle: "italic", padding: "8px 10px", background: `${T.moss}08`, border: `1px solid ${T.moss}30` }}>Mock projected impact. Live skill computation in v5.</div>
            </div>

            {/* What changes */}
            <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 10 }}>What Changes</div>
              {[
                ["Documents",         agent.docs,            agent.docs + 1,           true],
                ["Class hours",       agent.classes,         agent.classes + 1,         false],
                ["Chunks in RAG",     agent.chunks,          agent.chunks + "+ new",    true],
                ["Tokens indexed",    "—",                   "+ new chunks",            true],
                ["Flag coverage",     "—",                   "—",                       false],
                ["Training invested", `$${agent.classes * 1000}`, `$${(agent.classes + 1) * 1000}`, false],
              ].map(([k, before, after, live]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.lineSoft}`, fontSize: 12, alignItems: "baseline" }}>
                  <span style={{ color: T.mutedDeep, display: "flex", alignItems: "center", gap: 5 }}>
                    {k}
                    {live && <span style={{ fontFamily: mono, fontSize: 8, color: T.moss, border: `1px solid ${T.moss}40`, padding: "0 4px", letterSpacing: .5 }}>LIVE</span>}
                  </span>
                  <div style={{ fontFamily: mono, fontSize: 11, display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ color: T.muted }}>{before} →</span>
                    <span style={{ color: T.navy, fontWeight: 700 }}>{after}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Onboarding checklist */}
            <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 10 }}>Onboarding Checklist</div>
              {[
                ["File uploaded & extracted",  uploadState === "ready",          "just now"],
                ["Priority & flags assigned",  !locked && form.title !== "",     "just now"],
                ["Chunked into passages",      false,                            "starting…"],
                ["Indexed into RAG",           false,                            "queued"],
                ["Quality check",              false,                            "scheduled"],
                ["Available in next briefing", false,                            "after index"],
              ].map(([label, done, status]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.lineSoft}` }}>
                  <div style={{ width: 14, height: 14, border: `1.5px solid ${done ? T.moss : T.line}`, background: done ? T.moss : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {done && <span style={{ color: T.card, fontSize: 9, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ flex: 1, fontFamily: body, fontSize: 12, color: done ? T.ink : T.muted }}>{label}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{status}</span>
                </div>
              ))}
            </div>

            {agent.trainableBy === "NIGP" && (
              <div style={{ padding: "10px 14px", background: `${T.moss}08`, border: `1px solid ${T.moss}30`, fontFamily: body, fontSize: 11.5, color: T.mutedDeep, lineHeight: 1.5 }}>
                <strong style={{ color: T.moss }}>NIGP-funded training.</strong> This class hour is charged against NIGP's subscription.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
