// DeepBench v6.0.16 | lib/project-manager.js | AA-86 -- Michelle Manning's ownership broker
// FEATURE: AA-86 -- exclusive read access to the full 21-agent roster (capabilities, competency
// signal). Structural analog to lib/librarian.js: this file owns the roster-read primitive
// internally, exports only getRosterCandidates(). No other file in the platform gets a code path
// to these tables for agent-selection purposes. See ARCHITECTURE.md Section 19e.
//
// Deliberately NOT semantic/RAG retrieval -- the roster is small enough (21 agents, 12 capability
// rows) that an embedding "closest match" step would itself be a deterministic pick wearing a
// reasoning costume, the exact anti-pattern Section 19e bans. This broker's only job is "fetch
// everything in scope" -- selection is the model's job, in agent-selection-intent, not this file's.
import { logActivity } from './activity-log.js';

async function isActiveAgent(requestingAgentId, supabaseUrl, supabaseKey) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/agents?id=eq.${encodeURIComponent(requestingAgentId)}&select=is_active`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return !!rows?.[0]?.is_active;
}

async function fetchRoster(supabaseUrl, supabaseKey) {
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  // NOTE: found in QA, 2026-07-02 -- docs/classes/chunks (kickoff's original select list) don't
  // exist on the Supabase `agents` table; that per-agent activity data is frontend-only mock
  // content in src/data/agents.js, never persisted server-side. Dropped from the select (which
  // 404'd the whole roster fetch); activity_count reports null until a real server-side source
  // exists. agent-selection-intent's schema already types this field ["number","null"].
  const [agentsRes, assignmentsRes, capabilitiesRes, linksRes, intentProfilesRes, formatProfilesRes, skillDetailsRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/agents?select=id,name,role,skill_score,situational_awareness,rating,is_active`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/agent_capability_assignments?select=agent_id,capability_slug`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/capabilities?select=slug,name,description`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/capability_skill_profiles?select=capability_slug,skill_profile_slug`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/skill_profiles?skill_type_slug=eq.intent&select=slug`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/skill_profiles?skill_type_slug=eq.format&select=slug,traits`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/skill_profiles?select=slug,objective,output_desc`, { headers }),
  ]);
  if (!agentsRes.ok || !assignmentsRes.ok || !capabilitiesRes.ok || !linksRes.ok || !intentProfilesRes.ok || !formatProfilesRes.ok || !skillDetailsRes.ok) {
    throw new Error('Roster fetch failed');
  }
  const [agents, assignments, capabilities, links, intentProfiles, formatProfiles, skillDetails] = await Promise.all([
    agentsRes.json(), assignmentsRes.json(), capabilitiesRes.json(), linksRes.json(), intentProfilesRes.json(), formatProfilesRes.json(), skillDetailsRes.json(),
  ]);

  const capBySlug = Object.fromEntries(capabilities.map(c => [c.slug, c]));
  const assignmentsByAgent = {};
  for (const a of assignments) {
    (assignmentsByAgent[a.agent_id] ||= []).push(a.capability_slug);
  }

  // FEATURE: AA-108 -- real intent slugs per capability, so agent-selection-intent's model can
  // copy an exact value instead of guessing one from the capability name. Prior to this, the
  // roster context named only capability_slug -- the schema's own intent_slug field had no
  // ground truth to draw from, confirmed as the root cause of a live silent-fabrication bug
  // (S-ARCH-HITL-RESUME-02, 2026-07-03: a hallucinated intent_slug caused a downstream write to
  // be silently skipped while every layer reported success).
  const intentSlugSet = new Set(intentProfiles.map(p => p.slug));
  const intentSlugsByCapability = {};
  for (const link of links) {
    if (intentSlugSet.has(link.skill_profile_slug)) {
      (intentSlugsByCapability[link.capability_slug] ||= []).push(link.skill_profile_slug);
    }
  }

  // FEATURE: AA-129 -- real format-output-shape per capability, mirroring AA-108's intent_slugs
  // fix exactly: give the model real declared ground truth (a candidate's Format Skill's
  // output_type) instead of letting the requesting agent choose blind on this dimension. Root
  // cause of a live empty-card bug: Marcus's own instructions already say "not a full HTML
  // document, not a PDF" but Michelle's roster context never told him which candidate produces
  // which shape, so he had no data to act on his own rule with.
  const formatOutputTypeBySlug = Object.fromEntries(
    formatProfiles.map(p => [p.slug, p.traits?.output_type || 'json'])
  );
  const formatOutputTypesByCapability = {};
  for (const link of links) {
    const outputType = formatOutputTypeBySlug[link.skill_profile_slug];
    if (outputType) {
      (formatOutputTypesByCapability[link.capability_slug] ||= new Set()).add(outputType);
    }
  }

  // FEATURE: AA-165 -- real Skill-level content (objective/output_desc) per capability, surfacing
  // the platform's actual atomic differentiator (ARCHITECTURE.md Section 2, LOCKED) to Michelle's
  // reasoning instead of stopping at the thin capabilities.description blurb. Unfiltered by Skill
  // type -- reuses the existing `links` array already grouped by capability_slug (same source
  // AA-108/AA-129 read above), not re-filtered to intent/format-only.
  const skillDetailBySlug = Object.fromEntries(
    skillDetails.map(s => [s.slug, { objective: s.objective, output_desc: s.output_desc }])
  );
  const skillSlugsByCapability = {};
  for (const link of links) {
    (skillSlugsByCapability[link.capability_slug] ||= []).push(link.skill_profile_slug);
  }

  return agents.map(a => ({
    agent_id: a.id, name: a.name, role: a.role,
    skill_score: a.skill_score, situational_awareness: a.situational_awareness,
    rating: a.rating, activity_count: null,
    is_active: a.is_active,
    capabilities: (assignmentsByAgent[a.id] || []).map(slug => ({
      capability_slug: slug, description: capBySlug[slug]?.description || null,
      intent_slugs: intentSlugsByCapability[slug] || [],
      format_output_types: formatOutputTypesByCapability[slug] ? [...formatOutputTypesByCapability[slug]] : [],
      skills: (skillSlugsByCapability[slug] || []).map(s => ({ slug: s, ...skillDetailBySlug[s] })),
    })),
  }));
}

function rosterToContext(roster) {
  const lines = roster.map(a => {
    const caps = a.capabilities.length
      ? a.capabilities.map(c => {
          const intents = c.intent_slugs.length ? `, intents: [${c.intent_slugs.join(', ')}]` : '';
          const formats = c.format_output_types.length ? `, format_output_types: [${c.format_output_types.join(', ')}]` : '';
          const skills = c.skills.filter(s => s.objective).map(s => `${s.slug}: ${s.objective}${s.output_desc ? ` Output shape: ${s.output_desc}` : ''}`).join(' | ');
          const skillsLine = skills ? `\n  skills: ${skills}` : '';
          return `${c.capability_slug}${c.description ? ` (${c.description})` : ''}${intents}${formats}${skillsLine}`;
        }).join('; ')
      : 'no assigned capability';
    return `--- ${a.agent_id} — ${a.name}, ${a.role} ---\ncapabilities: ${caps}\nskill_score: ${a.skill_score ?? 'n/a'}, situational_awareness: ${a.situational_awareness ?? 'n/a'}, rating: ${a.rating ?? 'n/a'}, activity_count: ${a.activity_count ?? 'n/a'}\nactive: ${a.is_active}`;
  });
  return `PLATFORM AGENT ROSTER (${roster.length} agents). Use agent_id exactly as shown when selecting a candidate. When a candidate's capability lists intents, intent_slug MUST be copied exactly from that list -- never invented. If a capability has no listed intents, or none clearly matches, return intent_slug: null. When a capability's format_output_types includes anything other than "json" (e.g. html, pdf), call that out explicitly in that candidate's fit_summary -- the requesting agent needs to know a candidate produces a different document shape than an ordinary structured response before choosing them. When a candidate's capability shows a "skills:" line, that Skill's own stated purpose is real, authored content describing that specific capability's fit -- weigh it the same as fit_summary reasoning, not as marketing copy to discount:\n\n${lines.join('\n\n')}`;
}

// ---- Public broker API -- only exported function, mirrors queryLibrary()'s shape ----

export async function getRosterCandidates({ requestingAgentId }) {
  const startTime = Date.now();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!requestingAgentId) return { context: "", chunks: [], matchCount: 0, _project_manager: { granted: false, tier: "denied-no-credential" } };
  if (!supabaseUrl || !supabaseKey) return { context: "", chunks: [], matchCount: 0, _project_manager: { granted: false, tier: "denied-no-config" } };

  const active = await isActiveAgent(requestingAgentId, supabaseUrl, supabaseKey);
  if (!active) {
    logActivity({ agentId: 'michelle', aiType: 'agent-directory', feature: 'agent-directory', latencyMs: Date.now() - startTime });
    return { context: "", chunks: [], matchCount: 0, _project_manager: { granted: false, tier: "denied-inactive-or-unknown-agent" } };
  }

  const roster = await fetchRoster(supabaseUrl, supabaseKey);
  logActivity({ agentId: 'michelle', aiType: 'agent-directory', feature: 'agent-directory', latencyMs: Date.now() - startTime });

  return {
    context: rosterToContext(roster),
    chunks: roster.map(a => ({ id: a.agent_id, title: a.name, capabilities: a.capabilities.map(c => c.capability_slug) })),
    matchCount: roster.length,
    _project_manager: { granted: true, tier: "full-roster" },
  };
}
