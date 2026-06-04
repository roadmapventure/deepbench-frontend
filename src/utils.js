// src/utils.js — v5.0.0
// DeepBench v5 — Shared utility functions

// ── sanitizeBriefingHtml ──────────────────────────────────────────────────────
// Neutralizes model-injected page layout styles that break card rendering.
// Must be applied to ALL dangerouslySetInnerHTML that renders agent briefing HTML.
export function sanitizeBriefingHtml(raw) {
  if (!raw) return "";
  const stripped = raw
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();

  if (stripped.startsWith("<")) {
    // Inject neutralizing CSS before HTML
    const neutralize = `<style>*{max-width:none!important;width:auto!important;box-sizing:border-box!important}body,html{margin:0!important;padding:0!important}</style>`;
    const fi = stripped.indexOf("\n```");
    const html = fi > -1 ? stripped.slice(0, fi).trim() : stripped;
    return neutralize + html;
  }

  // Markdown fallback
  return stripped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/## (.+)/g, "<h3 style='margin:12px 0 6px;color:#12243c'>$1</h3>")
    .replace(/# (.+)/g,  "<h2 style='margin:14px 0 8px;color:#12243c'>$1</h2>")
    .replace(/\|/g, "&nbsp;|&nbsp;")
    .replace(/\n/g, "<br/>");
}

// ── analyzeAiText ─────────────────────────────────────────────────────────────
// Used in AI Review and Test My Team for output quality metrics
export function analyzeAiText(text) {
  if (!text) return { words:0, statutes:0, dollars:0, orgs:0, claims:0, hedges:0 };
  return {
    words:    (text.split(/\s+/).filter(Boolean)).length,
    statutes: (text.match(/§\s*\d+|CFR\s+\d+|\bLGC\b|\bU\.S\.C\b/gi) || []).length,
    dollars:  (text.match(/\$[\d,]+(?:\.\d+)?/gi) || []).length,
    orgs:     (text.match(/\b(?:NIGP|NASPO|GAO|OMB|CPPO|FAR|DIR)\b/g) || []).length,
    claims:   (text.match(/\d+(?:\.\d+)?%|\d{1,3}(?:,\d{3})+/g) || []).length,
    hedges:   (text.match(/\b(?:may|might|could|possibly|potentially|appears|seems|likely|unclear|suggests)\b/gi) || []).length,
  };
}

// ── computeDelta ─────────────────────────────────────────────────────────────
// Output quality diff between two briefing texts (used in Test My Team)
export function computeDelta(beforeText, afterText) {
  const b = analyzeAiText(beforeText);
  const a = analyzeAiText(afterText);
  return {
    wordDiff:        a.words - b.words,
    statutesBefore:  b.statutes,  statutesAfter:  a.statutes,
    dollarsBefore:   b.dollars,   dollarsAfter:   a.dollars,
    orgsBefore:      b.orgs,      orgsAfter:      a.orgs,
    actionsBefore:   b.claims,    actionsAfter:   a.claims,
    beforeWords:     b.words,     afterWords:     a.words,
  };
}

// ── computePromptDiff ─────────────────────────────────────────────────────────
// 5-layer prompt comparison for PromptComparisonPanel
export function computePromptDiff(r1, r2, agent1Name, agent2Name) {
  if (!r1 || !r2) return null;
  const p1 = r1.promptText || "";
  const p2 = r2.promptText || "";
  const d1 = r1.debugInfo  || {};
  const d2 = r2.debugInfo  || {};

  const getSection = (text, header) => {
    const marker = `=== ${header} ===`;
    const start = text.indexOf(marker);
    if (start === -1) return "";
    const end = text.indexOf("\n\n---\n\n", start);
    return (end === -1 ? text.slice(start) : text.slice(start, end)).replace(marker, "").trim();
  };

  const tokEst   = s => Math.round(s.length / 4);
  const wordCount = s => s.split(/\s+/).filter(Boolean).length;
  const overlap   = (a, b) => {
    if (!a || !b) return 0;
    const wa = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const wb = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const inter = [...wa].filter(w => wb.has(w)).length;
    const union = new Set([...wa, ...wb]).size;
    return union === 0 ? 100 : Math.round((inter / union) * 100);
  };

  const role1   = getSection(p1, "ROLE & IDENTITY");
  const role2   = getSection(p2, "ROLE & IDENTITY");
  const rag1    = getSection(p1, "BACKGROUND KNOWLEDGE");
  const rag2    = getSection(p2, "BACKGROUND KNOWLEDGE");
  const format1 = getSection(p1, "OUTPUT FORMAT");
  const format2 = getSection(p2, "OUTPUT FORMAT");
  const guard1  = getSection(p1, "CONSTRAINTS & GUARDRAILS");
  const guard2  = getSection(p2, "CONSTRAINTS & GUARDRAILS");

  return {
    agent1: agent1Name,
    agent2: agent2Name,
    total:  { t1: tokEst(p1), t2: tokEst(p2) },
    layers: [
      { label:"01 · Role & Behavior",    key:"role",     name1: d1.role_name||"—",                     name2: d2.role_name||"—",                     text1: role1,   text2: role2,   tok1: tokEst(role1),   tok2: tokEst(role2),   words1: wordCount(role1),   words2: wordCount(role2),   overlap: overlap(role1,role2),   same: role1===role2 },
      { label:"02 · Background (RAG)",   key:"rag",      name1: d1.rag_retrieved?"Retrieved":"None",   name2: d2.rag_retrieved?"Retrieved":"None",   text1: rag1,    text2: rag2,    tok1: tokEst(rag1),    tok2: tokEst(rag2),    words1: wordCount(rag1),    words2: wordCount(rag2),    overlap: overlap(rag1,rag2),    same: rag1===rag2 },
      { label:"03 · Analysis Payload",   key:"payload",  name1: "Same data payload",                   name2: "Same data payload",                   text1: "",      text2: "",      tok1: 0,               tok2: 0,               words1: 0,                  words2: 0,                  overlap: 100,                    same: true },
      { label:"04 · Output Format",      key:"format",   name1: d1.format_name||"—",                   name2: d2.format_name||"—",                   text1: format1, text2: format2, tok1: tokEst(format1), tok2: tokEst(format2), words1: wordCount(format1), words2: wordCount(format2), overlap: overlap(format1,format2), same: format1===format2 },
      { label:"05 · Guardrails",         key:"guardrail",name1: d1.guardrail_name||"—",                name2: d2.guardrail_name||"—",                text1: guard1,  text2: guard2,  tok1: tokEst(guard1),  tok2: tokEst(guard2),  words1: wordCount(guard1),  words2: wordCount(guard2),  overlap: overlap(guard1,guard2),  same: guard1===guard2 },
    ],
  };
}

// ── priorityInfo ──────────────────────────────────────────────────────────────
export function priorityInfo(v) {
  if (v >= 80) return { label:"Critical", color:"#a83319" };
  if (v >= 65) return { label:"High",     color:"#b6873a" };
  if (v >= 40) return { label:"Medium",   color:"#12243c" };
  return             { label:"Low",       color:"#786d52" };
}

// ── readinessColor / readinessLabel ───────────────────────────────────────────
export const readinessColor = s => s>=80?"#5a7538":s>=55?"#b6873a":s>=30?"#c47a20":"#a83319";
export const readinessLabel = s => s>=80?"High Confidence":s>=55?"Moderate":s>=30?"Developing":"Needs Setup";
