// DeepBench v7.0.790 | lib/private-agent-create.js | AGT-386 -- add_agent_to_team and archive_private_agent; the team rules are one resolveTeam() both callers use
// add_agent_to_team puts one existing private agent on one team (a pick moves it off any other);
// archive_private_agent sets one private agent's is_active to false and deletes nothing -- undo is one
// `update public.agents set is_active = true where id = '<id>'`. Neither writes an activity row (no
// model call, not a capability execution). The REST helpers are hoisted into restClient().
// DeepBench v7.0.762 | lib/private-agent-create.js | AGT-337 slice 1 -- THE SERVER SAVE for a blank
// private agent. ARCHITECTURE.md §19u decision 6 (John 2026-10-03): a user-created private agent
// goes live on creation. A user names an agent; this module saves it blank, private and active, and
// returns its id.
//
// WHY THE SAVE WRITES A CAPABILITY TOO. `/api/mcp/<agent id>` lists only the capabilities that agent
// holds (api/_lib/mcp.js visibleRows()), so an agents row alone would publish an address with no
// tool on it. The save therefore writes one `deterministic` knowledge capability on the existing
// agent-bundle Intent and assigns it to the new agent -- data rows on the generic path (§19b), no
// route and no handler added.
//
// NO MODEL CALL. The save logs one `deterministic` ai_activity_log row, feature `agent-create`,
// through logActivity(). The row is best-effort telemetry: a log that fails never fails the save.
//
// NO LOGIN YET (§10 Auth, `HAR-39`): `owner_id` is null until a caller can name a signed-in user.
// The visibility check (shared/agent-visibility.js) already reads the column, so the day a viewer
// exists these rows are owned by whoever created them from then on.
//
// ORDERED WRITES, COMPENSATING DELETE. PostgREST has no multi-table transaction, so the writes run
// in a fixed order and a failure after the agents row removes what this call wrote, newest first.
// `teams.address` is never selected and never returned: it is the team's secret address.
import crypto from "crypto";
import { logActivity } from "./activity-log.js";

const NAME_MAX = 60;
const SLUG_MAX = 24;
const SUFFIX_LENGTH = 6;
const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const AGENT_NAME_ERROR = "Enter an agent name";
const TEAM_NAME_ERROR = "Enter a team name";

// "Zoe Smith" -> "zoe-smith". A name with nothing in [a-z0-9] is "agent".
export function agentSlug(name) {
  const slug = String(name)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
  return slug || "agent";
}

// Six characters of [a-z0-9]. A byte at or above 252 is thrown away so every character is equally
// likely (252 is the largest multiple of 36 a byte can hold).
export function randomSuffix() {
  let out = "";
  while (out.length < SUFFIX_LENGTH) {
    for (const byte of crypto.randomBytes(SUFFIX_LENGTH * 2)) {
      if (byte >= 252) continue;
      out += SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length];
      if (out.length === SUFFIX_LENGTH) break;
    }
  }
  return out;
}

export function agentIdFor(name, suffix) {
  return agentSlug(name) + "-" + suffix;
}

// A trimmed string of 1-60 characters, or null.
function readName(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= NAME_MAX ? trimmed : null;
}

// body -> { name, team } or { error }. `team` is null (no team), { id } (join that team) or
// { name } (join the team of that name, creating it if nobody has).
export function readCreateInput(body) {
  const name = readName(body?.name);
  if (!name) return { error: AGENT_NAME_ERROR };
  const team = readTeam(body?.team);
  if (team && team.error) return { error: team.error };
  return { name, team };
}

// FEATURE: AGT-386 -- the team half of readCreateInput(): null (absent/null), { id }, { name }, or
// { error: TEAM_NAME_ERROR }.
function readTeam(team) {
  if (team === undefined || team === null) return null;
  if (typeof team === "object" && typeof team.id === "string" && team.id.trim() !== "") {
    return { id: team.id };
  }
  const teamName = typeof team === "object" ? readName(team.name) : null;
  if (!teamName) return { error: TEAM_NAME_ERROR };
  return { name: teamName };
}

// FEATURE: AGT-386 -- body.agent_id, trimmed, or the refusal.
export function readAgentIdInput(body) {
  const agentId = typeof body?.agent_id === "string" ? body.agent_id.trim() : "";
  return agentId ? { agentId } : { error: "agent_id required" };
}

// FEATURE: AGT-386 -- body -> { agentId, team } or { error }. A team is required here: "no team" is
// refused with the team-name message.
export function readAddToTeamInput(body) {
  const id = readAgentIdInput(body);
  if (id.error) return id;
  const team = readTeam(body?.team);
  if (!team || team.error) return { error: TEAM_NAME_ERROR };
  return { agentId: id.agentId, team };
}

export function agentRow({ id, name, ownerId }) {
  return {
    id,
    name,
    role: "New Agent",
    lane: "product",
    is_active: true,
    agent_origin: "customer",
    sharing: "private",
    owner_id: ownerId ?? null,
  };
}

export function knowledgeCapabilityRow({ id, name }) {
  return {
    slug: id + "-knowledge",
    name: name + "'s Knowledge",
    description: `Returns everything ${name} has been taught. Pass agent_id "${id}", then answer as ${name} using only what was taught.`,
    execution_type: "deterministic",
    tenant_id: "global",
    default_intent_slug: "agent-bundle-intent",
  };
}

function failure(message, status) {
  const error = new Error(message);
  if (status) error.status = status;
  return error;
}

// FEATURE: AGT-386 -- the PostgREST helpers every write in this module uses.
function restClient({ supabaseUrl, supabaseKey, fetchImpl = fetch }) {
  const rest = `${String(supabaseUrl).replace(/\/+$/, "")}/rest/v1/`;
  const headers = {
    "Content-Type": "application/json",
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };
  const call = (method, pathAndQuery, body, prefer = "return=minimal") =>
    fetchImpl(rest + pathAndQuery, {
      method,
      headers: method === "GET" ? headers : { ...headers, Prefer: prefer },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const refused = async (res, what) =>
    failure(`${what} failed: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`.trim());
  const insert = async (table, row) => {
    const res = await call("POST", table, row);
    if (!res.ok) throw await refused(res, `Saving ${table}`);
  };
  const firstRow = async (res, what) => {
    if (!res.ok) throw await refused(res, what);
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] || null : rows || null;
  };
  return { call, refused, insert, firstRow };
}

// The team: an id must exist; a name is joined when a shared team already carries it, else
// created. Only id and name are ever selected -- never `address`. Returns null | { id, name, created }.
async function resolveTeam(team, { call, firstRow, ownerId }) {
  let savedTeam = null;
  if (team && team.id) {
    const found = await firstRow(
      await call("GET", `teams?id=eq.${encodeURIComponent(team.id)}&select=id,name&limit=1`),
      "Reading teams");
    if (!found) throw failure("Team not found", 404);
    savedTeam = { id: found.id, name: found.name, created: false };
  } else if (team && team.name) {
    const found = await firstRow(
      await call("GET", `teams?name=eq.${encodeURIComponent(team.name)}&owner_id=is.null&select=id,name&limit=1`),
      "Reading teams");
    if (found) {
      savedTeam = { id: found.id, name: found.name, created: false };
    } else {
      const made = await firstRow(
        await call("POST", "teams?select=id,name", { name: team.name, owner_id: ownerId ?? null }, "return=representation"),
        "Saving teams");
      if (!made) throw failure("Saving teams failed: no row returned");
      savedTeam = { id: made.id, name: made.name, created: true };
    }
  }
  return savedTeam;
}

export async function createPrivateAgent(
  { name, team = null, ownerId = null },
  { supabaseUrl, supabaseKey, fetchImpl = fetch, suffix = randomSuffix, log = logActivity },
) {
  const startedAt = Date.now();
  const { call, refused, insert, firstRow } = restClient({ supabaseUrl, supabaseKey, fetchImpl });

  // 1. The team (resolveTeam above).
  const savedTeam = await resolveTeam(team, { call, firstRow, ownerId });

  // 2. The agent. An id collision (HTTP 409) is retried once with a fresh suffix.
  let id = agentIdFor(name, suffix());
  let agentRes = await call("POST", "agents", agentRow({ id, name, ownerId }));
  if (agentRes.status === 409) {
    id = agentIdFor(name, suffix());
    agentRes = await call("POST", "agents", agentRow({ id, name, ownerId }));
  }
  if (!agentRes.ok) throw await refused(agentRes, "Saving agents");

  // 3-5. The knowledge capability, its assignment, and the team membership. 6. A failure here
  // removes what this call wrote, newest first, then rethrows the original failure.
  const capability = knowledgeCapabilityRow({ id, name });
  try {
    await insert("capabilities", capability);
    await insert("agent_capability_assignments", { agent_id: id, capability_slug: capability.slug, tenant_id: "global" });
    if (savedTeam) await insert("agent_teams", { agent_id: id, team_id: savedTeam.id });
  } catch (error) {
    const undo = [
      `agent_capability_assignments?agent_id=eq.${encodeURIComponent(id)}`,
      `capabilities?slug=eq.${encodeURIComponent(capability.slug)}`,
      `agents?id=eq.${encodeURIComponent(id)}`,
    ];
    if (savedTeam && savedTeam.created) undo.push(`teams?id=eq.${encodeURIComponent(savedTeam.id)}`);
    for (const target of undo) {
      try {
        await call("DELETE", target);
      } catch {
        // Keep undoing the rest; the original failure is what the caller hears.
      }
    }
    throw error;
  }

  // 7. One deterministic activity row. It never fails the save.
  try {
    await log({ aiType: "deterministic", feature: "agent-create", latencyMs: Date.now() - startedAt });
  } catch {
    // Telemetry is best-effort.
  }

  return { agent: { id, name }, team: savedTeam };
}

// FEATURE: AGT-386 -- put one existing private agent on one team. The agent must be a live private
// customer agent; the team is resolved by resolveTeam() (the same rules as the create). The agent is
// on one team: after the membership lands, its other memberships are removed. A failed membership
// removes a team this call created. `address` is never selected or returned. No activity row.
export async function addAgentToTeam({ agentId, team }, { supabaseUrl, supabaseKey, fetchImpl = fetch }) {
  const { call, refused, firstRow } = restClient({ supabaseUrl, supabaseKey, fetchImpl });
  const id = encodeURIComponent(agentId);
  const agent = await firstRow(
    await call("GET", `agents?id=eq.${id}&sharing=eq.private&agent_origin=eq.customer&is_active=eq.true&select=id&limit=1`),
    "Reading agents");
  if (!agent) throw failure("Agent not found", 404);

  const savedTeam = await resolveTeam(team, { call, firstRow, ownerId: null });
  if (!savedTeam) throw failure(TEAM_NAME_ERROR, 400);
  try {
    const res = await call("POST", "agent_teams?on_conflict=agent_id,team_id", { agent_id: agentId, team_id: savedTeam.id },
      "resolution=ignore-duplicates,return=minimal");
    if (!res.ok) throw await refused(res, "Saving agent_teams");
  } catch (error) {
    if (savedTeam.created) {
      try {
        await call("DELETE", `teams?id=eq.${encodeURIComponent(savedTeam.id)}`);
      } catch {
        // The original failure is what the caller hears.
      }
    }
    throw error;
  }

  const moved = await call("DELETE", `agent_teams?agent_id=eq.${id}&team_id=neq.${encodeURIComponent(savedTeam.id)}`);
  if (!moved.ok) throw await refused(moved, "Removing agent_teams");

  return { agent: { id: agentId }, team: { id: savedTeam.id, name: savedTeam.name } };
}

// FEATURE: AGT-386 -- archive one private agent: ONE PATCH, is_active false, fenced to a private
// customer agent. Nothing is deleted and no before-image is taken; undo is one
// `update public.agents set is_active = true where id = '<id>'`. No activity row.
export async function archivePrivateAgent({ agentId }, { supabaseUrl, supabaseKey, fetchImpl = fetch }) {
  const { call, refused } = restClient({ supabaseUrl, supabaseKey, fetchImpl });
  const res = await call("PATCH",
    `agents?id=eq.${encodeURIComponent(agentId)}&sharing=eq.private&agent_origin=eq.customer&select=id`,
    { is_active: false }, "return=representation");
  if (!res.ok) throw await refused(res, "Saving agents");
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) throw failure("Agent not found", 404);
  return { agent: { id: agentId, is_active: false } };
}
