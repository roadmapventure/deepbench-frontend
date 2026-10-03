// DeepBench v7.0.758 | personnelActivity.js | AGT-339 -- the read and the view behind a private
// agent's Activity tab (Personnel file): who connected, from which network, what knowledge was
// handed over, and what the training itself cost. Plain JS, no framework: the supabase client is a
// parameter, so the Node.js test drives activityView() directly.

import { computeCallCost } from "../../shared/models.js";
import { PATTERN_CATALOG } from "../../shared/ai-patterns.js";

// FEATURE: AGT-339 -- the columns the browser key may read (.claude/rules/supabase-column-grants.md).
// The raw address column is deliberately absent: asking for it turns the whole read into a 401.
export const ACTIVITY_COLUMNS = "agent_id,model,input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens,latency_ms,cost_usd,created_at,patterns_used,call_facts,call_source,caller_ip_masked";

const PAGE = 1000;
const TIME_ZONE = "America/Chicago";
const NONE = "—";

// A connection is a call that arrived over MCP FOR this agent -- whichever agent_id it was logged
// under. Counting by agent_id alone misses the connections logged under the executing agent.
const isConnection = (r, agentId) => r.call_source === "mcp" && r.call_facts?.target_agent_id === agentId;
// A teaching row is the agent's own non-MCP work (the Teach screen's model calls).
const isTeaching = (r, agentId) => r.agent_id === agentId && r.call_source !== "mcp";

// FEATURE: AGT-339 -- two reads: the activity rows (paged, deterministic order), then the network
// names for the connections' masked addresses. Throws on a read error; the caller owns the fallback.
export async function fetchAgentActivity(client, id) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("ai_activity_log")
      .select(ACTIVITY_COLUMNS)
      .or(`agent_id.eq.${id},call_facts->>target_agent_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  const addresses = [...new Set(rows.filter(r => isConnection(r, id)).map(r => r.caller_ip_masked).filter(Boolean))];
  if (addresses.length === 0) return { rows, orgs: [] };
  const { data: orgs, error: orgErr } = await client
    .from("ip_org_cache")
    .select("caller_ip_masked,org,city,region")
    .in("caller_ip_masked", addresses);
  if (orgErr) throw orgErr;
  return { rows, orgs: orgs || [] };
}

const centralParts = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
});
const centralDate = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

// FEATURE: AGT-339 -- "Oct 3, 2026, 11:49 AM CT". Built from parts so the spacing is the same on
// every runtime (some print a narrow no-break space before AM/PM).
export function formatCentral(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return NONE;
  const p = Object.fromEntries(centralParts.formatToParts(d).map(x => [x.type, x.value]));
  return `${p.month} ${p.day}, ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod} CT`;
}

const time = iso => new Date(iso).getTime();
const latest = list => list.reduce((best, iso) => (best == null || time(iso) > time(best) ? iso : best), null);
const earliest = list => list.reduce((best, iso) => (best == null || time(iso) < time(best) ? iso : best), null);
const fact = v => (v == null ? NONE : String(v));

// FEATURE: AGT-339 -- the whole tab as four cards of string key/value rows. The screen renders
// these and authors nothing of its own.
export function activityView({ agentId, rows = [], orgs = [], entries = [] }) {
  const connections = rows.filter(r => isConnection(r, agentId));
  const teaching = rows.filter(r => isTeaching(r, agentId));
  const empty = connections.length === 0;
  const emptyText = "No connections yet";

  // Card 1 -- Connections
  const stamps = connections.map(r => r.created_at).filter(Boolean);
  const days = new Set(stamps.map(s => centralDate.format(new Date(s))));
  const latencies = connections.map(r => r.latency_ms).filter(v => v != null);
  const meanLatency = latencies.length
    ? `${Math.round(latencies.reduce((s, v) => s + Number(v), 0) / latencies.length)} ms`
    : NONE;
  const connectionsCard = {
    title: "Connections",
    rows: empty ? [] : [
      ["Connections", String(connections.length)],
      ["Days active", String(days.size)],
      ["Average response time", meanLatency],
      ["First connection", formatCentral(earliest(stamps))],
      ["Last connection", formatCentral(latest(stamps))],
    ],
  };

  // Card 2 -- Connected from: one row per network + place, never an address.
  const orgByAddress = new Map(orgs.map(o => [o.caller_ip_masked, o]));
  const groups = new Map();
  for (const r of connections) {
    const o = r.caller_ip_masked ? orgByAddress.get(r.caller_ip_masked) : null;
    let key = "Unknown network";
    if (o && o.org) {
      const place = [o.city, o.region].filter(Boolean).join(", ");
      const name = String(o.org).replace(/^AS\d+\s+/, "");
      key = place ? `${name} · ${place}` : name;
    }
    const g = groups.get(key) || { key, count: 0, last: null };
    g.count += 1;
    if (r.created_at && (g.last == null || time(r.created_at) > time(g.last))) g.last = r.created_at;
    groups.set(key, g);
  }
  const fromCard = {
    title: "Connected from",
    rows: empty ? [] : [...groups.values()]
      .sort((a, b) => b.count - a.count || time(b.last) - time(a.last))
      .map(g => [g.key, `${g.count} · last ${formatCentral(g.last)}`]),
    note: "These are the AI tool's servers, not the person's location.",
  };

  // Card 3 -- Knowledge delivered, as the newest connection recorded it.
  const newest = connections.reduce((best, r) => (best == null || time(r.created_at) > time(best.created_at) ? r : best), null);
  const facts = newest?.call_facts || {};
  const tier = facts.library_tier;
  const knowledgeCard = {
    title: "Knowledge delivered",
    rows: empty ? [] : [
      ["Lessons", fact(facts.knowledge_entries)],
      ["Role prompts", fact(facts.role_prompts)],
      ["Guardrails", fact(facts.guardrails)],
      ["Skill sections", fact(facts.sections)],
      ["Library access", typeof tier === "string" && tier.startsWith("denied") ? "No access" : fact(tier)],
    ],
  };

  // Card 4 -- Training
  const active = entries.filter(e => e.status === "active");
  const lastTaught = latest(active.map(e => e.createdAt).filter(Boolean));
  const tokens = teaching.reduce((s, r) => s
    + (r.input_tokens || 0) + (r.output_tokens || 0)
    + (r.cache_creation_input_tokens || 0) + (r.cache_read_input_tokens || 0), 0);
  const cost = teaching.reduce((s, r) => {
    if (r.call_source === "session") return s;
    if (r.cost_usd != null) return s + Number(r.cost_usd);
    return s + (computeCallCost(r.model, r.input_tokens, r.output_tokens, r.cache_creation_input_tokens, r.cache_read_input_tokens) || 0);
  }, 0);
  const patterned = teaching
    .filter(r => Array.isArray(r.patterns_used) && r.patterns_used.length > 0)
    .sort((a, b) => time(a.created_at) - time(b.created_at));
  const slugs = [...new Set(patterned.flatMap(r => r.patterns_used))];
  const names = slugs.map(s => PATTERN_CATALOG.find(p => p.slug === s)?.name || s);
  const n = patterned.length;
  const trainingCard = {
    title: "Training",
    rows: [
      ["Lessons taught", String(active.length)],
      ["Last taught", formatCentral(lastTaught)],
      ["Model calls", String(teaching.filter(r => r.model).length)],
      ["Tokens", tokens.toLocaleString("en-US")],
      ["Cost", "$" + cost.toFixed(4)],
    ],
    note: n === 0
      ? "AI patterns used in DeepBench: none yet"
      : `AI patterns used in DeepBench: ${names.join(", ")} (${n} ${n === 1 ? "call" : "calls"})`,
  };

  const cards = [connectionsCard, fromCard, knowledgeCard, trainingCard];
  if (empty) for (const c of cards.slice(0, 3)) c.emptyText = emptyText;
  return { empty, cards };
}
