// src/screens/TestTeamScreen.jsx — v5.0.0
// DeepBench v5 — Test My Team (/bench/test)
// 3 stages: pick agents → pick BEE scenario → results with prompt + RAG reveal + delta panel

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { T, display, body, mono, fmt$ } from "../tokens.js";
import { TENANT_ID } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Corners, AgentAvatar, Toast, PromptComparisonPanel } from "../components/SharedUI.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { BEE_SCENARIOS } from "../data/agents.js";
import { sanitizeBriefingHtml, computeDelta, computePromptDiff } from "../utils.js";

export default function TestTeamScreen() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const agents        = useAgents();
  const filterAgentId = params.get("agent");
  const filterAgent   = filterAgentId ? agents.find(a => a.id === filterAgentId) : null;

  const [stage,           setStage]           = useState(filterAgent ? 2 : 1);
  const [selectedAgents,  setSelectedAgents]  = useState(filterAgent ? [filterAgent.id] : []);
  const [selectedScenario,setSelectedScenario]= useState(BEE_SCENARIOS[0]);
  const [runState,        setRunState]        = useState("idle"); // idle | running | done | error
  const [results,         setResults]         = useState({});
  const [promptOpenMap,   setPromptOpenMap]   = useState({});
  const [toast,           setToast]           = useState(null);

  const showToast = (msg, icon = "✓") => { setToast({ msg, icon }); setTimeout(() => setToast(null), 3000); };

  const toggleAgent = (id) => {
    setSelectedAgents(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) { showToast("Maximum 2 agents", "⚠"); return prev; }
      return [...prev, id];
    });
  };

  const runTest = async () => {
    if (selectedAgents.length === 0) { showToast("Select at least one agent", "⚠"); return; }
    setRunState("running"); setResults({}); setStage(3);
    const scenarioMsg = `Analyze this government procurement spend scenario for the City of Austin, Texas:\n\nScenario: ${selectedScenario.title}\nDetails: ${selectedScenario.meta}\nAmount at risk: ${selectedScenario.amount}\n\nProvide: 1) Executive summary 2) Key findings 3) Three specific recommended actions.`;
    try {
      const newResults = {};
      for (const agentId of selectedAgents) {
        // Fetch RAG entries for display
        const ragRes = await fetch("/api/rag-query", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queryText: selectedScenario.queryText, jurisdiction: selectedScenario.jurisdiction, matchCount: 5, tenant_id: TENANT_ID, agent_id: agentId }),
        });
        const ragJson  = await ragRes.json();
        const ragEntries = ragJson.entries || [];
        // Run briefing — brief.js assembles full 5-layer prompt
        const briefRes = await fetch("/api/brief", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: scenarioMsg }],
            agent_id: agentId, tenant_id: TENANT_ID,
            ragContext: { queryText: selectedScenario.queryText, jurisdiction: selectedScenario.jurisdiction, triggers: [] },
          }),
        });
        const briefJson = await briefRes.json();
        const briefText = briefJson.content?.[0]?.text || briefJson.error || "No response";
        const assembledSystem = briefJson._system || "(system prompt not returned — redeploy brief.js)";
        const debugInfo = briefJson._debug || {};
        newResults[agentId] = {
          briefText, ragEntries,
          promptText: assembledSystem,
          debugInfo,
          promptChars: assembledSystem.length,
          promptTokens: Math.round(assembledSystem.length / 4),
        };
      }
      // Compute delta and prompt diff if 2 agents
      if (selectedAgents.length === 2) {
        const [a1, a2] = selectedAgents;
        const agent1 = agents.find(a => a.id === a1);
        const agent2 = agents.find(a => a.id === a2);
        newResults._delta      = computeDelta(newResults[a1].briefText, newResults[a2].briefText);
        newResults._promptDiff = computePromptDiff(newResults[a1], newResults[a2], agent1?.name.split(" ")[0] || a1, agent2?.name.split(" ")[0] || a2);
        newResults._a1 = a1;
        newResults._a2 = a2;
      }
      setResults(newResults);
      setRunState("done");
      showToast("🐝 Test complete", "🐝");
    } catch (err) {
      setRunState("error");
      showToast("Test failed: " + err.message, "⚠");
    }
  };

  const s1a = selectedAgents[0] ? agents.find(a => a.id === selectedAgents[0]) : null;
  const s2a = selectedAgents[1] ? agents.find(a => a.id === selectedAgents[1]) : null;

  return (
    <AppShell toast={toast} headerProps={{ backLabel: "The Bench", onBack: () => navigate("/bench") }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 60px", background: T.paperDeep }}>

        {/* Header */}
        <div style={{ fontFamily: mono, fontSize: 9.5, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 5 }}>Acquired Skillset · Agent Testing</div>
        <div style={{ fontFamily: display, fontSize: 28, fontWeight: 500, color: T.navy, letterSpacing: "-.5px", marginBottom: 5 }}>
          {filterAgent ? `Testing ${filterAgent.name.split(" ")[0]}.` : "Test My Team."}
        </div>
        <div style={{ fontFamily: body, fontStyle: "italic", fontSize: 13, color: T.mutedDeep, marginBottom: 16, maxWidth: 580 }}>
          Run standardized procurement scenarios against your agents. Full prompt and RAG context visible here — not available in AI Review.
        </div>
        <div style={{ height: 2, background: T.brass, marginBottom: 20 }} />

        {/* Stage tabs — hide "Pick Agents" when launched from Personnel */}
        <div style={{ display: "flex", gap: 0, marginBottom: 22, borderBottom: `2px solid ${T.brass}` }}>
          {[["① Pick Agents", 1], ["② Pick Scenario", 2], ["③ Results", 3]]
            .filter(([, n]) => !(filterAgent && n === 1))
            .map(([label, n]) => (
              <button key={n} onClick={() => stage > n && setStage(n)}
                style={{ padding: "8px 22px", fontFamily: mono, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", border: "none", background: "transparent", cursor: stage > n ? "pointer" : "default", color: stage === n ? T.navy : T.muted, fontWeight: stage === n ? 700 : 400, borderBottom: `2px solid ${stage === n ? T.navy : "transparent"}`, marginBottom: -2 }}>
                {label}
              </button>
            ))}
        </div>

        {/* ── STAGE 1: PICK AGENTS ── */}
        {stage === 1 && (
          <div>
            <div style={{ fontFamily: body, fontSize: 12, color: T.muted, fontStyle: "italic", marginBottom: 14, padding: "9px 14px", background: `${T.brass}06`, border: `1px solid ${T.brass}20` }}>
              Select 1 or 2 agents to test against the scenario. Max 2.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
              {agents.map(a => {
                const isSel = selectedAgents.includes(a.id);
                const bc = isSel ? (a.color === T.moss ? T.moss : T.brass) : T.line;
                return (
                  <div key={a.id} onClick={() => toggleAgent(a.id)}
                    style={{ background: isSel ? `${bc}08` : T.card, border: `2px solid ${bc}`, position: "relative", cursor: "pointer", padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: isSel ? `0 0 0 1px ${bc}30` : "none", transition: "all .15s" }}>
                    {isSel && <div style={{ position: "absolute", top: 7, right: 7, width: 16, height: 16, borderRadius: "50%", background: bc, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: T.card, fontSize: 8, fontWeight: 700 }}>✓</span></div>}
                    <AgentAvatar who={a.id} size={48} ring={true} />
                    <div style={{ fontFamily: display, fontSize: 12, fontWeight: 600, color: T.navy, marginTop: 6, marginBottom: 1 }}>{a.name.split(" ")[0]}</div>
                    <div style={{ fontFamily: body, fontSize: 9.5, color: T.mutedDeep, fontStyle: "italic", marginBottom: 6, lineHeight: 1.3 }}>{a.role}</div>
                    <div style={{ fontFamily: mono, fontSize: 8, padding: "1px 5px", border: `1px solid ${T.brass}40`, color: T.brassDeep, background: `${T.brass}08`, marginBottom: 6 }}>{a.arch}</div>
                    <div style={{ width: "100%", height: 4, background: T.paperDeep, border: `1px solid ${T.lineSoft}`, position: "relative", marginBottom: 5 }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${a.skill}%`, background: a.color === T.moss ? T.moss : T.brass }} />
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: a.situational >= 30 ? T.brass : T.muted }}>{a.situational}%</div>
                    <div style={{ fontFamily: body, fontSize: 9, color: T.muted, fontStyle: "italic" }}>situational awareness</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => selectedAgents.length > 0 && setStage(2)} disabled={selectedAgents.length === 0}
                style={{ background: selectedAgents.length > 0 ? `linear-gradient(135deg,${T.brass},${T.brassDeep})` : T.line, border: "none", color: selectedAgents.length > 0 ? T.navy : T.muted, padding: "11px 28px", fontFamily: display, fontSize: 14, fontWeight: 700, cursor: selectedAgents.length > 0 ? "pointer" : "not-allowed" }}>
                Next: Pick Scenario →
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE 2: PICK SCENARIO ── */}
        {stage === 2 && (
          <div>
            <div style={{ fontFamily: body, fontSize: 12, color: T.muted, fontStyle: "italic", marginBottom: 14, padding: "9px 14px", background: `${T.brass}06`, border: `1px solid ${T.brass}20` }}>
              Select a pre-built Austin 2025 scenario. Each test makes {selectedAgents.length} live API call{selectedAgents.length > 1 ? "s" : ""}. Estimated cost: ~${(selectedAgents.length * 0.03).toFixed(2)}–${(selectedAgents.length * 0.06).toFixed(2)} per run.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10, marginBottom: 16 }}>
              {BEE_SCENARIOS.map(sc => (
                <div key={sc.id} onClick={() => setSelectedScenario(sc)}
                  style={{ background: selectedScenario.id === sc.id ? `${T.brass}08` : T.card, border: `1.5px solid ${selectedScenario.id === sc.id ? T.brass : T.line}`, padding: "12px", cursor: "pointer", transition: "all .15s", position: "relative" }}>
                  {selectedScenario.id === sc.id && <Corners />}
                  <div style={{ fontSize: 16, marginBottom: 6 }}>{sc.flag}</div>
                  <div style={{ fontFamily: mono, fontSize: 8.5, color: T.brassDeep, textTransform: "uppercase", letterSpacing: .8, fontWeight: 600, marginBottom: 4 }}>{sc.flagLabel}</div>
                  <div style={{ fontFamily: display, fontSize: 12.5, fontWeight: 600, color: T.navy, lineHeight: 1.3, marginBottom: 4 }}>{sc.title}</div>
                  <div style={{ fontFamily: body, fontSize: 10, color: T.muted, lineHeight: 1.4, marginBottom: 6 }}>{sc.meta}</div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: T.flag, fontWeight: 700 }}>{sc.amount}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {!filterAgent && <button onClick={() => setStage(1)} style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.mutedDeep, padding: "9px 20px", fontFamily: body, fontSize: 13, cursor: "pointer" }}>← Back</button>}
              {filterAgent && <div />}
              <button onClick={runTest} disabled={runState === "running"}
                style={{ background: runState === "running" ? T.line : `linear-gradient(135deg,${T.brass},${T.brassDeep})`, border: "none", color: runState === "running" ? T.muted : T.navy, padding: "11px 28px", fontFamily: display, fontSize: 14, fontWeight: 700, cursor: runState === "running" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <span>{runState === "running" ? "⏳" : "🐝"}</span>{runState === "running" ? "Running…" : "Run Test →"}
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE 3: RUNNING ── */}
        {stage === 3 && runState === "running" && (
          <div style={{ textAlign: "center", padding: "80px 40px" }}>
            <div style={{ width: 52, height: 52, border: `4px solid ${T.brass}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
            <div style={{ fontFamily: display, fontSize: 20, fontWeight: 600, color: T.navy, marginBottom: 10 }}>Running analysis…</div>
            <div style={{ fontFamily: mono, fontSize: 12, color: T.muted, fontStyle: "italic", marginBottom: 6 }}>Gathering content from knowledge base…</div>
            <div style={{ fontFamily: mono, fontSize: 11, color: T.muted, fontStyle: "italic" }}>Making {selectedAgents.length} live API call{selectedAgents.length > 1 ? "s" : ""}. This may take 15–30 seconds.</div>
          </div>
        )}

        {/* ── STAGE 3: RESULTS ── */}
        {stage === 3 && runState === "done" && (
          <div>
            {/* Scenario context bar */}
            <div style={{ background: `linear-gradient(135deg,${T.navy},${T.navyMid})`, color: T.card, padding: "11px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "#8fa3bf", textTransform: "uppercase", letterSpacing: 1.2, flexShrink: 0 }}>Test Scenario</div>
              <div style={{ fontFamily: display, fontSize: 14, fontWeight: 600, color: T.card }}>{selectedScenario.flag} {selectedScenario.title}</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: "#8fa3bf" }}>{selectedScenario.meta}</div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setStage(2)} style={{ background: "transparent", border: `1px solid rgba(248,242,226,.3)`, color: "#b8c5d8", padding: "5px 12px", fontFamily: body, fontSize: 11, cursor: "pointer" }}>Change scenario</button>
            </div>

            {/* Result cards — side by side, min 560px each */}
            <div style={{ display: "grid", gridTemplateColumns: selectedAgents.length === 2 ? "repeat(2,minmax(560px,1fr))" : "1fr", gap: 16, marginBottom: 16, overflowX: "auto" }}>
              {selectedAgents.map(agentId => {
                const agent = agents.find(a => a.id === agentId);
                const r = results[agentId];
                if (!r) return null;
                const promptOpen = promptOpenMap[agentId] || { prompt: false, rag: false };
                const toggleSection = (key) => setPromptOpenMap(m => ({ ...m, [agentId]: { ...promptOpen, [key]: !promptOpen[key] } }));
                return (
                  <div key={agentId} style={{ display: "flex", flexDirection: "column" }}>
                    {/* Agent bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.cardAlt, border: `1px solid ${agent?.color === T.moss ? T.moss : T.line}`, borderBottom: "none" }}>
                      <AgentAvatar who={agentId} size={28} ring={true} />
                      <div>
                        <div style={{ fontFamily: display, fontSize: 13, fontWeight: 600, color: T.navy }}>{agent?.name}</div>
                        <div style={{ fontFamily: mono, fontSize: 9, color: T.muted }}>{agent?.code} · {agent?.arch} · {agent?.situational}% awareness</div>
                      </div>
                      <div style={{ marginLeft: "auto", fontFamily: mono, fontSize: 10, color: T.brassDeep, fontWeight: 700 }}>{agent?.reportCost === 0 ? "Free" : fmt$(agent?.reportCost)}</div>
                    </div>

                    {/* Brief body */}
                    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderTop: "none", padding: "16px 18px", flex: 1 }}>
                      <div style={{ fontFamily: body, fontSize: 12.5, color: T.mutedDeep, lineHeight: 1.7, overflowX: "auto" }}
                        dangerouslySetInnerHTML={{ __html: sanitizeBriefingHtml(r.briefText) }} />
                    </div>

                    {/* Prompt + RAG reveal */}
                    <div style={{ background: T.navyDeep, border: `1px solid rgba(255,255,255,.1)`, borderTop: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid rgba(255,255,255,.1)` }}>
                        {[["Full System Prompt", "prompt"], ["RAG Chunks", "rag"]].map(([label, key]) => (
                          <button key={key} onClick={() => toggleSection(key)}
                            style={{ padding: "7px 14px", fontFamily: mono, fontSize: 9.5, color: promptOpen[key] ? T.brassLight : "#8fa3bf", textTransform: "uppercase", letterSpacing: .8, cursor: "pointer", border: "none", background: "transparent", borderBottom: `2px solid ${promptOpen[key] ? T.brass : "transparent"}` }}>{label}</button>
                        ))}
                        <div style={{ flex: 1 }} />
                        {r.debugInfo && (
                          <div style={{ display: "flex", gap: 10, padding: "4px 12px" }}>
                            {[["Role", r.debugInfo.role_name], ["Format", r.debugInfo.format_name], ["Layers", r.debugInfo.layers_assembled], ["~Tokens", r.promptTokens]].map(([k, v]) => (
                              <div key={k}><span style={{ fontFamily: mono, fontSize: 8, color: "#8fa3bf" }}>{k}: </span><span style={{ fontFamily: mono, fontSize: 8, color: T.brassLight, fontWeight: 700 }}>{v}</span></div>
                            ))}
                          </div>
                        )}
                        <span style={{ fontFamily: mono, fontSize: 9, color: T.brassLight, padding: "7px 12px", alignSelf: "center", borderLeft: "1px solid rgba(255,255,255,.1)" }}>Admin Only</span>
                      </div>

                      {/* Prompt section breakdown */}
                      {promptOpen.prompt && (
                        <div style={{ padding: "12px 16px", maxHeight: 240, overflowY: "auto" }}>
                          {["=== ROLE & IDENTITY ===", "=== BACKGROUND KNOWLEDGE ===", "=== OUTPUT FORMAT ===", "=== CONSTRAINTS & GUARDRAILS ==="].map((header, i) => {
                            const colors = ["#9b6ef3", "#5a9b6f", T.brass, T.flag];
                            const labels = ["01 · Role", "02 · RAG", "04 · Format", "05 · Guardrails"];
                            const start = r.promptText.indexOf(header);
                            if (start === -1) return null;
                            const end = r.promptText.indexOf("\n\n---\n\n", start);
                            const section = (end === -1 ? r.promptText.slice(start) : r.promptText.slice(start, end)).replace(header, "").trim();
                            return (
                              <div key={header} style={{ marginBottom: 10, borderLeft: `3px solid ${colors[i]}`, paddingLeft: 10 }}>
                                <div style={{ fontFamily: mono, fontSize: 8.5, color: colors[i], fontWeight: 700, letterSpacing: .8, marginBottom: 4 }}>{labels[i]}</div>
                                <div style={{ fontFamily: mono, fontSize: 10.5, color: "#8fa3bf", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 80, overflowY: "auto" }}>{section}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* RAG chunks */}
                      {promptOpen.rag && (
                        <div style={{ padding: "12px 16px", maxHeight: 200, overflowY: "auto" }}>
                          {r.ragEntries.length === 0 && <div style={{ fontFamily: mono, fontSize: 11, color: T.flag, fontStyle: "italic" }}>⚠ No chunks retrieved — add training documents for this scenario type.</div>}
                          {r.ragEntries.map((e, i) => (
                            <div key={i} style={{ background: `${T.moss}10`, borderLeft: `3px solid ${T.moss}`, padding: "6px 10px", marginBottom: 6, fontSize: 10.5, color: "#8fa3bf", lineHeight: 1.5 }}>
                              <strong style={{ color: T.card }}>{e.title}</strong>
                              <span style={{ color: T.brassLight, fontFamily: mono, fontSize: 9, marginLeft: 6 }}>{Math.round((e.similarity || 0) * 100)}% match</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Prompt comparison panel — 2 agents only */}
            {selectedAgents.length === 2 && results._promptDiff && (
              <PromptComparisonPanel pd={results._promptDiff} />
            )}

            {/* Output delta panel — 2 agents only */}
            {selectedAgents.length === 2 && results._delta && (() => {
              const d = results._delta;
              const a1 = agents.find(a => a.id === results._a1);
              const a2 = agents.find(a => a.id === results._a2);
              const metrics = [
                ["Word Count",     d.beforeWords,     d.afterWords,                         d.wordDiff],
                ["Statutes Cited", d.statutesBefore,  d.statutesAfter,                      d.statutesAfter  - d.statutesBefore],
                ["$ Thresholds",   d.dollarsBefore,   d.dollarsAfter,                       d.dollarsAfter   - d.dollarsBefore],
                ["Org References", d.orgsBefore,      d.orgsAfter,                          d.orgsAfter      - d.orgsBefore],
                ["Action Items",   d.actionsBefore,   d.actionsAfter,                       d.actionsAfter   - d.actionsBefore],
              ];
              return (
                <div style={{ background: T.card, border: `1px solid ${T.line}`, marginBottom: 16, position: "relative" }}>
                  <Corners />
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.lineSoft}`, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 3 }}>Report Comparison</div>
                      <div style={{ fontFamily: display, fontSize: 14, fontWeight: 600, color: T.navy }}>Quality delta between agents</div>
                    </div>
                    <div style={{ fontFamily: body, fontSize: 11, color: T.moss, fontStyle: "italic" }}>Full prompt & RAG context visible above ↑</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", padding: "14px 18px", gap: 0, borderBottom: `1px solid ${T.lineSoft}` }}>
                    {metrics.map(([label, v1, v2, diff], i) => (
                      <div key={label} style={{ padding: `0 ${i > 0 ? "14px" : "0"} 0 ${i > 0 ? "14px" : "0"}`, borderRight: i < 4 ? `1px solid ${T.lineSoft}` : "none" }}>
                        <div style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>{label}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                          <AgentAvatar who={results._a1} size={16} ring={false} />
                          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.ink }}>{v1}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                          <AgentAvatar who={results._a2} size={16} ring={false} />
                          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.ink }}>{v2}</span>
                        </div>
                        <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: diff > 0 ? T.moss : diff < 0 ? T.flag : T.muted }}>
                          {diff > 0 ? `+${diff} ${a2?.name.split(" ")[0]}` : diff < 0 ? `+${Math.abs(diff)} ${a1?.name.split(" ")[0]}` : "No diff"}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "12px 18px", background: T.cardAlt, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.moss, flexShrink: 0 }} />
                    <div style={{ fontFamily: body, fontSize: 12, color: T.mutedDeep, lineHeight: 1.5, flex: 1 }}>
                      Comparison complete. Review the prompts and RAG chunks above to understand why the outputs differ.
                    </div>
                    {(a1?.trainable || a2?.trainable) && (
                      <button onClick={() => navigate(`/bench/${a1?.trainable ? results._a1 : results._a2}/teach`)}
                        style={{ background: T.moss, border: "none", color: "#fff", padding: "8px 18px", fontFamily: display, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, marginLeft: 16 }}>
                        + Add Training →
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.mutedDeep, padding: "9px 28px", fontFamily: body, fontSize: 13, cursor: "pointer" }}>↑ Back to Top</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
