// DeepBench v5.1.9 | mergeSteps.js | patch2 — threaded replacements
// FEATURE: TI-09 — Shared step merge service
// FEATURE: TI-11 — Threaded archive approval

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

// currentSteps   — active steps currently shown (mergedSteps.active)
// incomingSteps  — new steps returned by the planner
// alreadyArchived — steps already in the drawer; passed through unchanged
//
// Returns { active, archived }
// active[] contains incoming steps, each optionally carrying a
// .pendingArchive field pointing to the currentStep it replaced.
export function mergeSteps(currentSteps = [], incomingSteps = [], alreadyArchived = []) {
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

  // Steps no longer present in incomingSteps become pending-archive
  const incomingKeys = new Set(incomingSteps.map(s => normalizeLabel(s.label)));
  const unmatched = currentSteps
    .filter(s => !incomingKeys.has(normalizeLabel(s.label)))
    .map(s => ({
      ...s,
      type: s.type || "agent",
      mergeStatus: "pending-archive",
    }));

  // Thread each unmatched step onto the nearest incomingStep by original index.
  // If all positions are taken, fall back to the last incoming step.
  for (const oldStep of unmatched) {
    const oldIdx = currentSteps.findIndex(
      s => normalizeLabel(s.label) === normalizeLabel(oldStep.label)
    );

    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < active.length; i++) {
      if (!active[i].pendingArchive) {
        const dist = Math.abs(i - oldIdx);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
    }

    if (bestIdx === -1 && active.length > 0) bestIdx = active.length - 1;
    if (bestIdx !== -1) {
      active[bestIdx] = { ...active[bestIdx], pendingArchive: oldStep };
    }
  }

  return { active, archived: [...alreadyArchived] };
}
