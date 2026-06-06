// DeepBench v5.1.9 | StepList.jsx | patch — color + archive approval
// FEATURE: TI-10 — Richer color treatment on new/changed steps
// FEATURE: TI-11 — Inline pending-archive approval + archived drawer
// FEATURE: TI-12 — Agent attribution on every step
// FEATURE: TI-13 — Color coding preserved through regeneration

import { useState } from "react";
import { T, display, body, mono } from "../tokens.js";
import { FeatureBadge } from "./SharedUI.jsx";
import { AGENTS } from "../data/agents.js";

// Type → visual theme
const TYPE_THEME = {
  hitl:     { border: "#a83319", bg: "#fdf4f2" },
  subagent: { border: "#3b82f6", bg: "#f0f5ff" },
  agent:    { border: "#b6873a", bg: "#fdf8f0" },
};

function getTheme(type) {
  return TYPE_THEME[type] || TYPE_THEME.agent;
}

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

// ── Pending archive row — inline warning before user approves ─────────────────
function PendingArchiveCard({ step, onArchiveStep, onKeepStep }) {
  return (
    <div style={{
      border: "1px dashed #d1d5db",
      backgroundColor: "#f9fafb",
      borderRadius: 6,
      padding: "12px 14px",
      marginBottom: 8,
      opacity: 0.85,
    }}>
      <div style={{ fontFamily: display, fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
        {step.label}
      </div>
      {step.text && (
        <div style={{ fontFamily: body, fontSize: 12, color: "#9ca3af", lineHeight: 1.5, marginBottom: 8 }}>
          {step.text}
        </div>
      )}
      {/* Warning */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 10 }}>
        <span style={{ color: "#92400e", fontSize: 13, lineHeight: 1 }}>⚠</span>
        <span style={{ fontFamily: body, fontSize: 12, color: "#92400e", lineHeight: 1.4 }}>
          This step may no longer be needed after the plan update.
        </span>
      </div>
      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={() => onKeepStep && onKeepStep(step)}
          style={{
            background: "transparent", border: "1px solid #6b7280",
            color: "#374151", padding: "5px 14px", cursor: "pointer",
            fontFamily: body, fontSize: 12, borderRadius: 3,
          }}>
          Keep
        </button>
        <button
          onClick={() => onArchiveStep && onArchiveStep(step)}
          style={{
            background: "#a83319", color: "#ffffff", border: "none",
            padding: "5px 14px", cursor: "pointer",
            fontFamily: body, fontSize: 12, fontWeight: 600, borderRadius: 3,
          }}>
          Archive
        </button>
      </div>
    </div>
  );
}

// ── Active step card ───────────────────────────────────────────────────────────
function StepCard({
  step, index, readOnly,
  answers, setAnswers, updatingPlan, onUpdatePlan,
  navigate, isCompleted, onRemoveStep,
}) {
  const [comment, setComment] = useState("");

  const isHITL = step.type === "hitl";
  const isSub  = step.type === "subagent";
  const isNew  = step.mergeStatus === "new";
  const theme  = getTheme(step.type);

  const agentRecord = AGENTS.find(a => a.id === step.agentId);
  const agentName   = step.agentName || agentRecord?.name || "";
  const agentCode   = agentRecord?.code || "";

  // ── Type badge (filled) ───────────────────────────────────────────────────
  const typeBadge = isHITL ? (
    <span style={{
      fontFamily: mono, fontSize: 10, padding: "2px 8px",
      background: "#a83319", color: "#ffffff",
      fontWeight: 700, borderRadius: 2, whiteSpace: "nowrap",
    }}>NEEDS YOUR INPUT</span>
  ) : isSub ? (
    <span style={{
      fontFamily: mono, fontSize: 10, padding: "2px 8px",
      background: "#3b82f6", color: "#ffffff",
      fontWeight: 700, borderRadius: 2, whiteSpace: "nowrap",
    }}>SUB-AGENT</span>
  ) : (
    <span style={{
      fontFamily: mono, fontSize: 10, padding: "2px 8px",
      background: "#b6873a", color: "#ffffff",
      fontWeight: 700, borderRadius: 2, whiteSpace: "nowrap",
    }}>
      {agentName && agentCode
        ? `${agentName.split(" ")[0]} · ${agentCode}`
        : "Agent"}
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
      background: theme.bg,
      border: `1px solid ${theme.border}`,
      borderLeft: `3px solid ${theme.border}`,
      borderRadius: 6,
      padding: "12px 14px",
      marginBottom: 8,
      position: "relative",
    }}>
      {/* NEW pill — top-right corner */}
      {isNew && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: "#5a7538", color: "#ffffff",
          fontFamily: mono, fontSize: 9, fontWeight: 700,
          padding: "2px 7px", borderRadius: 2, letterSpacing: 0.3,
          pointerEvents: "none",
        }}>NEW</div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Step number circle */}
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: "rgba(255,255,255,0.7)", border: `1.5px solid ${theme.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: mono, fontSize: 9, fontWeight: 700, color: theme.border,
          flexShrink: 0, marginTop: 2,
        }}>
          {String(index + 1).padStart(2, "0")}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: isNew ? 40 : 0 }}>
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

          {/* HITL questions panel (AW-13 / AW-16) — when onUpdatePlan provided */}
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
                width: "100%", background: "rgba(255,255,255,0.6)", border: `1px solid ${T.lineSoft}`,
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
              background: "rgba(255,255,255,0.6)", border: `1px solid ${T.lineSoft}`,
              padding: "8px 10px", fontFamily: body, fontSize: 11,
              color: T.mutedDeep, lineHeight: 1.5, marginTop: 6,
            }}>
              {step.output}
            </div>
          )}
        </div>

        {/* Right-side action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, marginTop: isNew ? 28 : 0 }}>
          {isSub && navigate && (
            <button onClick={() => navigate(`/bench/${step.agentId || "brent"}`)}
              style={{
                fontFamily: mono, fontSize: 8, color: "#3b82f6",
                background: "rgba(59,130,246,.15)", border: "1px solid rgba(59,130,246,.4)",
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

// ── StepList ──────────────────────────────────────────────────────────────────
export default function StepList({
  activeSteps = [],
  pendingArchive = [],
  archivedSteps = [],
  readOnly = false,
  onArchiveStep,
  onKeepStep,
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

      {/* Pending archive rows — TI-11 inline approval */}
      {pendingArchive.map((step, i) => (
        <PendingArchiveCard
          key={step.id ?? `pending-${i}`}
          step={step}
          onArchiveStep={onArchiveStep}
          onKeepStep={onKeepStep}
        />
      ))}

      {/* Archived drawer — only shown when steps have been explicitly archived */}
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
            const theme = getTheme(step.type);
            return (
              <div key={step.id ?? `archived-${i}`} style={{
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderLeft: `3px solid ${theme.border}`,
                borderRadius: 6,
                padding: "10px 14px",
                marginBottom: 6,
                opacity: 0.6,
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
                  <div style={{ fontFamily: body, fontSize: 11, color: "#9ca3af", lineHeight: 1.5, marginLeft: 28 }}>
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
