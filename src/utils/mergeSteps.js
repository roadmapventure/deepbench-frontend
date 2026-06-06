// DeepBench v5.1.9 | mergeSteps.js | Shared step merge utility
// FEATURE: TI-09 — Shared step merge service

const HITL_KEYWORDS = ["review", "approval", "confirm", "clarify", "upload", "provide"];
const SUBAGENT_KEYWORDS = ["brent", "sub-agent", "fetch", "research"];

function deriveType(label = "") {
  const lc = label.toLowerCase();
  if (HITL_KEYWORDS.some(k => lc.includes(k))) return "hitl";
  if (SUBAGENT_KEYWORDS.some(k => lc.includes(k))) return "subagent";
  return "agent";
}

function normalizeLabel(label = "") {
  return label.toLowerCase().trim();
}

export function mergeSteps(currentSteps = [], incomingSteps = []) {
  const currentMap = new Map(
    currentSteps.map(s => [normalizeLabel(s.label), s])
  );

  const active = incomingSteps.map(incoming => {
    const key = normalizeLabel(incoming.label);
    const existing = currentMap.get(key);
    const derivedType = incoming.type ?? (existing?.type ?? deriveType(incoming.label));
    return {
      ...incoming,
      type: derivedType || "agent",
      mergeStatus: existing ? "unchanged" : "new",
    };
  });

  const incomingKeys = new Set(incomingSteps.map(s => normalizeLabel(s.label)));
  const archived = currentSteps
    .filter(s => !incomingKeys.has(normalizeLabel(s.label)))
    .map(s => ({
      ...s,
      type: s.type || "agent",
      mergeStatus: "archived",
    }));

  return { active, archived };
}
