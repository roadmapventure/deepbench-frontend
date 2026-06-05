// DeepBench v5.1.0 | promptDiff.js | Prompt layer diff analysis for Test My Team
// src/analysis/promptDiff.js — v5.0.0
// DeepBench v5 — Prompt layer diff analysis for Test My Team
// Carried forward exactly from v4.x TeamBuilder.jsx
// This is one of the most distinctive features — do not simplify.

export function computePromptDiff(r1, r2, agent1Name, agent2Name) {
  if (!r1 || !r2) return null;
  const p1 = r1.promptText || "";
  const p2 = r2.promptText || "";
  const d1 = r1.debugInfo || {};
  const d2 = r2.debugInfo || {};

  // Extract sections by header marker
  const getSection = (text, header) => {
    const marker = `=== ${header} ===`;
    const start  = text.indexOf(marker);
    if (start === -1) return "";
    const end = text.indexOf("\n\n---\n\n", start);
    return (end === -1 ? text.slice(start) : text.slice(start, end))
      .replace(marker, "")
      .trim();
  };

  const role1   = getSection(p1, "ROLE & IDENTITY");
  const role2   = getSection(p2, "ROLE & IDENTITY");
  const rag1    = getSection(p1, "BACKGROUND KNOWLEDGE");
  const rag2    = getSection(p2, "BACKGROUND KNOWLEDGE");
  const format1 = getSection(p1, "OUTPUT FORMAT");
  const format2 = getSection(p2, "OUTPUT FORMAT");
  const guard1  = getSection(p1, "CONSTRAINTS & GUARDRAILS");
  const guard2  = getSection(p2, "CONSTRAINTS & GUARDRAILS");

  const tokEst   = s => Math.round(s.length / 4);
  const wordCount = s => s.split(/\s+/).filter(Boolean).length;

  const overlap = (a, b) => {
    if (!a || !b) return 0;
    const wa   = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const wb   = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const inter = [...wa].filter(w => wb.has(w)).length;
    const union = new Set([...wa, ...wb]).size;
    return union === 0 ? 100 : Math.round((inter / union) * 100);
  };

  return {
    agent1: agent1Name,
    agent2: agent2Name,
    total:  { t1: tokEst(p1), t2: tokEst(p2) },
    layers: [
      {
        label:  "01 · Role & Behavior",
        name1:  d1.role_name || "—",
        name2:  d2.role_name || "—",
        text1:  role1, text2: role2,
        tok1:   tokEst(role1),   tok2:   tokEst(role2),
        words1: wordCount(role1), words2: wordCount(role2),
        overlap: overlap(role1, role2),
        same:   role1 === role2,
        key:    "role",
      },
      {
        label:  "02 · Background (RAG)",
        name1:  d1.rag_retrieved ? "Retrieved" : "None",
        name2:  d2.rag_retrieved ? "Retrieved" : "None",
        text1:  rag1, text2: rag2,
        tok1:   tokEst(rag1),   tok2:   tokEst(rag2),
        words1: wordCount(rag1), words2: wordCount(rag2),
        overlap: overlap(rag1, rag2),
        same:   rag1 === rag2,
        key:    "rag",
      },
      {
        label:  "03 · Analysis Payload",
        name1:  "Same data payload",
        name2:  "Same data payload",
        text1:  "", text2: "",
        tok1:   0, tok2: 0,
        words1: 0, words2: 0,
        overlap: 100,
        same:   true,
        key:    "payload",
      },
      {
        label:  "04 · Output Format",
        name1:  d1.format_name || "—",
        name2:  d2.format_name || "—",
        text1:  format1, text2: format2,
        tok1:   tokEst(format1),   tok2:   tokEst(format2),
        words1: wordCount(format1), words2: wordCount(format2),
        overlap: overlap(format1, format2),
        same:   format1 === format2,
        key:    "format",
      },
      {
        label:  "05 · Guardrails",
        name1:  d1.guardrail_name || "—",
        name2:  d2.guardrail_name || "—",
        text1:  guard1, text2: guard2,
        tok1:   tokEst(guard1),   tok2:   tokEst(guard2),
        words1: wordCount(guard1), words2: wordCount(guard2),
        overlap: overlap(guard1, guard2),
        same:   guard1 === guard2,
        key:    "guardrail",
      },
    ],
  };
}
