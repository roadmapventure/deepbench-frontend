// DeepBench v7.0.754 | shared/agent-visibility.js | AGT-336 - the one "who may see this agent" check.
//
// FEATURE: AGT-336 -- later a signed-in user sees only their own agents and teams, plus what
// others opened to them or to everyone. Every reader of public.agents asks this file, so the rule
// lives in one place. Pure, no imports: src/ and api/ both import it.
//
// ENFORCEMENT STARTS WHEN A CALLER PASSES A VIEWER. Nobody signs in today, so no caller has one:
// a null or undefined viewer means "no login exists" and everything is visible, which is exactly
// today's behavior. The day a caller passes a viewer, the rule below applies with no change here.

export const SHARING = Object.freeze({ PRIVATE: "private", USERS: "users", PUBLIC: "public" });

// The columns the check reads -- a reader of public.agents adds these to its select.
export const AGENT_ACCESS_COLUMNS = "owner_id,sharing,shared_with";

export function canSeeAgent(agent, viewer) {
  if (!agent) return false;
  if (viewer === null || viewer === undefined) return true;   // no login exists
  if (agent.sharing === SHARING.PUBLIC) return true;
  if (!viewer.id) return false;
  if (agent.owner_id === viewer.id) return true;
  if (agent.sharing === SHARING.USERS && Array.isArray(agent.shared_with) && agent.shared_with.includes(viewer.id)) return true;
  return false;
}

export function visibleAgents(rows, viewer) {
  return (rows || []).filter(a => canSeeAgent(a, viewer));
}
