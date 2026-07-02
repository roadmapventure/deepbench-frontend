// DeepBench v6.0.0 | lib/project-manager.js | AA-86 -- Michelle Manning's ownership broker
// FEATURE: AA-86 -- exclusive read access to the full 21-agent roster (capabilities, competency
// signal). Structural analog to lib/librarian.js: this file owns the roster-read primitive
// internally, exports only getRosterCandidates(). No other file in the platform gets a code path
// to these tables for agent-selection purposes. See ARCHITECTURE.md Section 19e.
//
// Deliberately NOT semantic/RAG retrieval -- the roster is small enough (21 agents, 12 capability
// rows) that an embedding "closest match" step would itself be a deterministic pick wearing a
// reasoning costume, the exact anti-pattern Section 19e bans. This broker's only job is "fetch
// everything in scope" -- selection is the model's job, in agent-selection-intent, not this file's.

async function isActiveAgent(requestingAgentId, supabaseUrl, supabaseKey) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/agents?id=eq.${encodeURIComponent(requestingAgentId)}&select=is_active`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return !!rows?.[0]?.is_active;
}

function logDirectoryCall({ supabaseUrl, supabaseKey, requestingAgentId, granted, agentCount }) {
  if (!supabaseUrl || !supabaseKey) return;
  fetch(`${supabaseUrl}/rest/v1/ai_activity_log`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: "return=minimal" },
    body: JSON.stringify({
      tenant_id: "global", agent_id: "michelle", ai_type: "agent-directory", feature: "agent-directory",
      patterns_used: [], created_at: new Date().toISOString(),
    }),
  }).catch(() => {});
  void requestingAgentId; void granted; void agentCount;
}

async function fetchRoster(supabaseUrl, supabaseKey) {
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  // NOTE: found in QA, 2026-07-02 -- docs/classes/chunks (kickoff's original select list) don't
  // exist on the Supabase `agents` table; that per-agent activity data is frontend-only mock
  // content in src/data/agents.js, never persisted server-side. Dropped from the select (which
  // 404'd the whole roster fetch); activity_count reports null until a real server-side source
  // exists. agent-selection-intent's schema already types this field ["number","null"].
  const [agentsRes, assignmentsRes, capabilitiesRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/agents?select=id,name,role,skill_score,situational_awareness,rating,is_active`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/agent_capability_assignments?select=agent_id,capability_slug`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/capabilities?select=slug,name,description`, { headers }),
  ]);
  if (!agentsRes.ok || !assignmentsRes.ok || !capabilitiesRes.ok) throw new Error('Roster fetch failed');
  const [agents, assignments, capabilities] = await Promise.all([agentsRes.json(), assignmentsRes.json(), capabilitiesRes.json()]);

  const capBySlug = Object.fromEntries(capabilities.map(c => [c.slug, c]));
  const assignmentsByAgent = {};
  for (const a of assignments) {
    (assignmentsByAgent[a.agent_id] ||= []).push(a.capability_slug);
  }

  return agents.map(a => ({
    agent_id: a.id, name: a.name, role: a.role,
    skill_score: a.skill_score, situational_awareness: a.situational_awareness,
    rating: a.rating, activity_count: null,
    is_active: a.is_active,
    capabilities: (assignmentsByAgent[a.id] || []).map(slug => ({
      capability_slug: slug, description: capBySlug[slug]?.description || null,
    })),
  }));
}

function rosterToContext(roster) {
  const lines = roster.map(a => {
    const caps = a.capabilities.length
      ? a.capabilities.map(c => `${c.capability_slug}${c.description ? ` (${c.description})` : ''}`).join('; ')
      : 'no assigned capability';
    return `--- ${a.agent_id} — ${a.name}, ${a.role} ---\ncapabilities: ${caps}\nskill_score: ${a.skill_score ?? 'n/a'}, situational_awareness: ${a.situational_awareness ?? 'n/a'}, rating: ${a.rating ?? 'n/a'}, activity_count: ${a.activity_count ?? 'n/a'}\nactive: ${a.is_active}`;
  });
  return `PLATFORM AGENT ROSTER (${roster.length} agents). Use agent_id exactly as shown when selecting a candidate:\n\n${lines.join('\n\n')}`;
}

// ---- Public broker API -- only exported function, mirrors queryLibrary()'s shape ----

export async function getRosterCandidates({ requestingAgentId }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!requestingAgentId) return { context: "", chunks: [], matchCount: 0, _project_manager: { granted: false, tier: "denied-no-credential" } };
  if (!supabaseUrl || !supabaseKey) return { context: "", chunks: [], matchCount: 0, _project_manager: { granted: false, tier: "denied-no-config" } };

  const active = await isActiveAgent(requestingAgentId, supabaseUrl, supabaseKey);
  if (!active) {
    logDirectoryCall({ supabaseUrl, supabaseKey, requestingAgentId, granted: false, agentCount: 0 });
    return { context: "", chunks: [], matchCount: 0, _project_manager: { granted: false, tier: "denied-inactive-or-unknown-agent" } };
  }

  const roster = await fetchRoster(supabaseUrl, supabaseKey);
  logDirectoryCall({ supabaseUrl, supabaseKey, requestingAgentId, granted: true, agentCount: roster.length });

  return {
    context: rosterToContext(roster),
    chunks: roster.map(a => ({ id: a.agent_id, title: a.name, capabilities: a.capabilities.map(c => c.capability_slug) })),
    matchCount: roster.length,
    _project_manager: { granted: true, tier: "full-roster" },
  };
}
