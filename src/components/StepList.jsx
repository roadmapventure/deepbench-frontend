// DeepBench v5.1.9 | StepList.jsx | Shared step list renderer
// FEATURE: TI-10 — Brass left border on new/changed steps
// FEATURE: TI-11 — Archived steps collapsible drawer
// FEATURE: TI-12 — Agent attribution on every step
// FEATURE: TI-13 — Color coding preserved through regeneration

import { useState } from "react";
import { T, display, body, mono } from "../tokens.js";
import { AiBadge, FeatureBadge } from "./SharedUI.jsx";
import { AGENTS } from "../data/agents.js";

const TYPE_BORDER = {
  hitl:     "#a83319",
  subagent: "#3b82f6",
  agent:    "#b6873a",
};

function AgentInitials({ name = "?", size = 18 }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: T.cardAlt, border: `1px solid ${T.lineSoft}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: mono, fontSize: 7, fontWeight: 700, color: T.muted,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function StepCard({
  step, index, readOnly,
  answers, setAnswers, updatingPlan, onUpdatePlan,
  navigate, isCompleted, onRemoveStep,
}) {
  const [comment, setComment] = useState("");

  const isHITL = step.type === "hitl";
  const isSub  = step.type === "subagent";
  const isNew  = step.mergeStatus === "new";

  const borderColor = TYPE_BORDER[step.type] || TYPE_BORDER.agent;
  const bgColor     = isNew ? "#fdf8f0" : "#ffffff";

  const agentRecord = AGENTS.find(a => a.id === step.agentId);
  const agentName   = step.agentName || agentRecord?.name || "";
  const agentCode   = agentRecord?.code || "";

  // ── Type badge ────────────────────────────────────────────────────────────
  const typeBadge = isHITL ? (
    <span style={{
      fontFamily: mono, fontSize: 7.5, padding: "1px 6px",
      background: "rgba(168,51,25,.1)", color: "#a83319",
      border: "1px solid rgba(168,51,25,.3)", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap",
    }}>NEEDS YOUR INPUT</span>
  ) : isSub ? (
    <span style={{
      fontFamily: mono, fontSize: 7.5, padding: "1px 6px",
      background: "rgba(59,130,246,.1)", color: "#3b82f6",
      border: "1px solid rgba(59,130,246,.3)", fontWeight: 700,
      whiteSpace: "nowrap",
    }}>SUB-AGENT</span>
  ) : (
    <span style={{
      fontFamily: mono, fontSize: 7.5, padding: "1px 6px",
      background: "rgba(182,135,58,.1)", color: T.brassDeep,
      border: "1px solid rgba(182,135,58,.25)", whiteSpace: "nowrap",
    }}>
      {agentName && agentCode
        ? `${agentName.split(" ")[0]} ${agentCode}`
        : <AiBadge />}
    </span>
  );

  // ── Agent attribution (TI-12) ─────────────────────────────────────────────
  const attribution = isHITL ? (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, marginBottom: 5 }}>
      <AgentInitials name="You" />
      <span style={{ fontFamily: body, fontSize: 12, color: "#6b7280" }}>You · Action Required</span>
    </div>
  ) : (agentName || agentRecord) ? (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, marginBottom: 5 }}>
      <AgentInitials name={agentName || agentRecord?.name || "?"} />
      <span style={{ fontFamily: body, fontSize: 12, color: "#6b7280" }}>
        {agentName || agentRecord?.name}
        {agentCode ? ` · ${agentCode}` : ""}
      </span>
    </div>
  ) : null;

  return (
    <div style={{
      background: bgColor,
      border: "1px solid #e5e7eb",
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 6,
      padding: "12px 14px",
      marginBottom: 8,
      position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Step number circle */}
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: T.cardAlt, border: `1.5px solid ${borderColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: mono, fontSize: 9, fontWeight: 700, color: borderColor,
          flexShrink: 0, marginTop: 2,
        }}>
          {String(index + 1).padStart(2, "0")}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Label + type badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
            <span style={{ fontFamily: display, fontSize: 13, fontWeight: 600, color: T.navy }}>
              {step.label}
            </span>
            {typeBadge}
          </div>

          {/* Agent attribution — TI-12 */}
          {attribution}

          {/* Description */}
          {step.text && (
            <div style={{ fontFamily: body, fontSize: 13, color: "#4b5563", lineHeight: 1.55, marginBottom: step.note ? 3 : 5 }}>
              {step.text}
            </div>
          )}
          {step.note && (
            <div style={{
              fontFamily: mono, fontSize: 8,
              color: isHITL ? "#a83319" : isSub ? "#3b82f6" : T.moss,
              fontStyle: "italic", marginBottom: 5,
            }}>
              {step.note}
            </div>
          )}

          {/* HITL questions panel (AW-13 / AW-16) — shown when onUpdatePlan provided */}
          {step.questions && step.questions.length > 0 && onUpdatePlan && (
            <div style={{ marginTop: 8 }}>
              <FeatureBadge id="AW-13" />
              {updatingPlan ? (
                <div style={{
                  padding: "20px 16px", background: "rgba(182,135,58,.04)",
                  border: "1px solid rgba(182,135,58,.2)",
                  fontFamily: mono, fontSize: 11, color: T.brass, textAlign: "center",
                }}>
                  ✦ Regenerating plan with your answers...
                </div>
              ) : (
                <>
                  {step.questions.map((q, qi) => (
                    <div key={q.id ?? qi} style={{
                      marginTop: 8, padding: "8px 10px",
                      background: "rgba(182,135,58,0.06)",
                      border: "1px solid rgba(182,135,58,0.2)",
                    }}>
                      <div style={{ fontFamily: mono, fontSize: 10, color: T.brass, marginBottom: 3, fontWeight: 700 }}>
                        Q{q.id || qi + 1}
                      </div>
                      <div style={{ fontFamily: body, fontSize: 12, color: T.ink, marginBottom: 6 }}>{q.q}</div>
                      {!isCompleted && (
                        <input
                          placeholder="Your answer (optional)..."
                          value={answers?.[q.id] || ""}
                          onChange={e => setAnswers && setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          style={{
                            width: "100%", padding: "6px 8px", fontSize: 12,
                            fontFamily: body, border: `1px solid ${T.line}`,
                            background: T.card, color: T.ink, boxSizing: "border-box",
                          }}
                        />
                      )}
                    </div>
                  ))}
                  {/* FEATURE: AW-16 — Update Plan button */}
                  {!isCompleted && (
                    <div style={{ position: "relative", marginTop: 10 }}>
                      <FeatureBadge id="AW-16" />
                      <button
                        onClick={() => onUpdatePlan(step.questions)}
                        style={{
                          background: T.brass, color: T.navy, border: "none",
                          padding: "7px 18px", fontFamily: display, fontSize: 12,
                          fontWeight: 700, cursor: "pointer",
                        }}>
                        Update Plan →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Comment textarea — readOnly=false */}
          {!readOnly && !isCompleted && (
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a comment or instruction for this step…"
              style={{
                width: "100%", background: T.cardAlt, border: `1px solid ${T.lineSoft}`,
                padding: "6px 10px", fontFamily: body, fontSize: 11, color: T.ink,
                resize: "none", outline: "none", lineHeight: 1.5, height: 38,
                boxSizing: "border-box", transition: "height .15s", marginTop: 6,
              }}
              onFocus={e => e.target.style.height = "64px"}
              onBlur={e => { if (!e.target.value) e.target.style.height = "38px"; }}
            />
          )}

          {/* Output area — readOnly=true */}
          {readOnly && step.output && (
            <div style={{
              background: T.cardAlt, border: `1px solid ${T.lineSoft}`,
              padding: "8px 10px", fontFamily: body, fontSize: 11,
              color: T.mutedDeep, lineHeight: 1.5, marginTop: 6,
            }}>
              {step.output}
            </div>
          )}
        </div>

        {/* Right-side action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
          {isSub && navigate && (
            <button onClick={() => navigate(`/bench/${step.agentId || "brent"}`)}
              style={{
                fontFamily: mono, fontSize: 8, color: "#3b82f6",
                background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.3)",
                padding: "5px 10px", cursor: "pointer", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap",
              }}>
              View {(agentName || "Brent").split(" ")[0]} →
            </button>
          )}
          {onRemoveStep && (
            <button onClick={() => onRemoveStep(step.id)}
              title="Remove step"
              style={{
                background: "transparent", border: "none", color: T.muted,
                cursor: "pointer", fontSize: 13, padding: "0 4px", lineHeight: 1,
              }}>
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StepList({
  activeSteps = [],
  archivedSteps = [],
  readOnly = false,
  answers,
  setAnswers,
  updatingPlan,
  onUpdatePlan,
  navigate,
  isCompleted = false,
  onRemoveStep,
}) {
  const [archivedOpen, setArchivedOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <FeatureBadge id="TI-09" />

      {/* Active steps */}
      {activeSteps.map((step, i) => (
        <StepCard
          key={step.id ?? `step-${i}`}
          step={step}
          index={i}
          readOnly={readOnly}
          answers={answers}
          setAnswers={setAnswers}
          updatingPlan={updatingPlan}
          onUpdatePlan={onUpdatePlan}
          navigate={navigate}
          isCompleted={isCompleted}
          onRemoveStep={onRemoveStep}
        />
      ))}

      {/* Archived steps drawer — TI-11 */}
      {archivedSteps.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setArchivedOpen(o => !o)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontFamily: body, fontSize: 12, color: "#9ca3af", padding: "4px 0",
              display: "flex", alignItems: "center", gap: 4,
            }}>
            Previous Steps ({archivedSteps.length}) {archivedOpen ? "▴" : "▾"}
          </button>

          {archivedOpen && archivedSteps.map((step, i) => {
            const borderColor = TYPE_BORDER[step.type] || TYPE_BORDER.agent;
            return (
              <div key={step.id ?? `archived-${i}`} style={{
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderLeft: `3px solid ${borderColor}`,
                borderRadius: 6,
                padding: "10px 14px",
                marginBottom: 6,
                opacity: 0.7,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: "#e5e7eb", border: "1px solid #d1d5db",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: mono, fontSize: 8, fontWeight: 700, color: "#9ca3af", flexShrink: 0,
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <span style={{ fontFamily: display, fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>
                    {step.label}
                  </span>
                </div>
                {step.text && (
                  <div style={{
                    fontFamily: body, fontSize: 11, color: "#9ca3af",
                    lineHeight: 1.5, marginLeft: 28,
                  }}>
                    {step.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
