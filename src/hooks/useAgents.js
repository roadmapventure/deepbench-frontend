// DeepBench v6.1.23 | useAgents.js | S-MI-30 — "html-display" added to CAPABILITY_WRAPPER_TYPES (Riley Torres wrapper/agent-turn dedup); useAgentActivitySummary() gains optional tenantId param (default 'global') so callers can scope to a different tenant (e.g. 'speed-baseline-test', MI-31)
// DeepBench v5.2.37 | useAgents.js | Agent roster hook — wraps AGENTS data array
// DeepBench v6.0.36 | useAgents.js | MI-17 — Learned Context drawer data hook
// DeepBench v6.0.40 | useAgents.js | MI-18 — Agent Activity drawer data hook
// DeepBench v6.0.47 | useAgents.js | S-MI-15 — useDataSources() hook, Data Sources drawer
// DeepBench v6.0.46 | useAgents.js | S-MI-20 — latency broken out by kind, blended avgLatency removed
// DeepBench v6.0.43 | useAgents.js | S-MI-18b — useAgentActivitySummary() gains optional scope filter
// FEATURE: SH-03 — Agent roster hook
// src/hooks/useAgents.js — v5.0.0
// Returns the agent roster. Swap internals for Supabase query when auth arrives.
// All components use this hook — never import AGENTS directly from data/agents.js.

import { useState, useEffect, useMemo } from "react";
import { AGENTS } from "../data/agents.js";
import { supabase } from '../lib/supabase.js';

// FEATURE: RO-09 — per-agent usage count from ai_activity_log
export function useAgentUsageCounts() {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    supabase
      .from('ai_activity_log')
      .select('agent_id')
      .eq('tenant_id', 'global')
      .not('agent_id', 'is', null)
      .then(({ data, error }) => {
        if (error || !data) return;
        const map = {};
        for (const row of data) {
          map[row.agent_id] = (map[row.agent_id] || 0) + 1;
        }
        setCounts(map);
      });
  }, []);

  return counts;
}

// FEATURE: MI-17 — Learned Context drawer data source. Direct frontend Supabase read,
// same precedent as useAgentUsageCounts() above — no api/ route, RLS is disabled platform-wide
// (AI-42, known accepted gap), this inherits that existing exposure, does not introduce a new one.
// data_room_tag is hardcoded to this demo's single tenant (confirmed live in Supabase: every
// the_library/the_reasoning row and every MI-scoped agent's data_room_access uses this one tag;
// no other data room exists in this build) — same implicit single-tenant scoping the rest of the
// MI screen already assumes without threading a param.
const APPLE_DATA_ROOM_TAG = "apple-cso-data-room";

export function useLearnedContext() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    supabase
      .from('the_reasoning')
      .select('id,agent_id,confidence,source_question,content,created_at')
      .eq('data_room_tag', APPLE_DATA_ROOM_TAG)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error || !data) return;
        setEntries(data);
      });
  }, []);

  return entries;
}

// FEATURE: MI-18 — per-agent all-time usage summary (calls/avgLatency/avgCost) for a given set of
// agent IDs. Distinct from useAgentUsageCounts() above (RO-09): deliberately not reused/modified,
// see Task 1 note in the kickoff doc — that hook's flat number shape is a direct sort-comparator
// input in RosterScreen.jsx, changing it would silently break that sort. Also distinct from
// useAIActivity()'s byAgent (src/hooks/useAIActivity.js): that aggregation is backed by an
// in-memory log capped at 500 rows (hydrateFromSupabase()'s .limit(500)) — a rolling window, not
// full history, so an occasionally-used agent could scroll out of it and be wrongly reported as
// unused. This hook queries Supabase directly, independent of that cap, so an agent's "used at
// least once, ever" status is never lost.
// FEATURE: S-MI-18b — added optional `scope` param: { aiTypes: string[], featurePrefixes: string[] }.
// When provided, only rows matching scope.aiTypes exactly OR whose `feature` starts with one of
// scope.featurePrefixes are counted — lets a caller scope metrics to "this page's real loop
// activity" instead of an agent's platform-wide total (found necessary this session: Michelle/
// Alex/Dan/Eleanor are shared broker/utility agents also used by other screens, so their raw
// all-time counts would otherwise include non-MI activity). Omitting `scope` preserves the
// original all-time-platform-wide behavior for any future non-scoped caller.
//
// BUGFIX: S-MI-18b — MI-18's original single-shot `.select()` silently truncated at Supabase/
// PostgREST's default 1000-row response cap. Invisible with the original 6-agent roster (their
// combined matching rows stayed under 1000) but confirmed live this session once the roster grew
// to 10: the unpaginated query returned only ~1000 of 1616 real rows, undercounting Michelle
// (234 vs. a true 467) and Eleanor (275 vs. a true 408) by roughly half. Root cause, not a symptom
// patch — fixed by paging through the full result set with `.range()` in PAGE_SIZE chunks until a
// short page confirms the end, same pattern needed anywhere row count isn't bounded in advance.
const PAGE_SIZE = 1000;

// FEATURE: S-MI-20 — capability-dispatch wrapper ai_types (sendRequest()'s own log write in
// request-receivable.js, feature: 'request-receivable'). These sometimes duplicate a nearby
// 'agent-turn' row's own latency for the same real call (verified live: a wrapper logged
// 34538ms next to an agent-turn logged 33928ms, ~120ms apart, same agent) — but not always: live
// data confirmed most wrapper rows for these ai_types have no nearby agent-turn at all
// (data-analysis 0/21 paired, memory-consolidation 0/13, hypothesis-evaluation 5/73) — most are
// the sole record of a simpler, single-shot dispatch that never entered execute.js's turn loop.
// A blanket "always skip" or "always keep" rule would misrepresent one case or the other; each
// row is checked individually against nearby agent-turn timestamps instead (see classifyRow).
const CAPABILITY_WRAPPER_TYPES = new Set([
  "channel-intelligence", "hypothesis-evaluation", "quality-gate", "pipeline-triage",
  "memory-consolidation", "data-analysis", "project-manager", "screen-controls",
  "html-display",
]);
const PAIR_WINDOW_MS = 2000;

// FEATURE: S-MI-20 — classifies one ai_activity_log row into a display "kind" for the by-kind
// latency breakdown, and whether it should be counted there at all. turnTimestampsByAgent is a
// Map<agent_id, number[]> of every 'agent-turn' row's own created_at (ms) for that agent, built
// once per fetch, used only for the nearby-pairing check below.
function classifyRow(row, turnTimestampsByAgent) {
  if (row.ai_type === 'agent-turn') {
    const intentSlug = row.feature ? row.feature.split(':')[1] : null;
    return { kind: intentSlug || row.feature || 'unknown', include: true };
  }
  if (CAPABILITY_WRAPPER_TYPES.has(row.ai_type) && row.feature === 'request-receivable') {
    const rowTime = new Date(row.created_at).getTime();
    const turnTimes = turnTimestampsByAgent.get(row.agent_id) || [];
    const paired = turnTimes.some(t => Math.abs(t - rowTime) < PAIR_WINDOW_MS);
    return { kind: row.ai_type, include: !paired };
  }
  return { kind: row.ai_type, include: true };
}

// FEATURE: AA-149 -- extracted from the fetchAll().then() callback so the aggregation math
// (now including per-model breakdown) is unit-testable without mocking Supabase/React. Same
// classifyRow()-driven kind bucketing as before, byte-identical output for every existing
// caller -- this only adds a new byModel sub-bucket inside each kind, never removes anything.
export function buildActivitySummary(scopedRows, turnTimestampsByAgent) {
  const map = {};
  for (const row of scopedRows) {
    if (!map[row.agent_id]) map[row.agent_id] = { calls: 0, totalCost: 0, costCount: 0, byKind: {} };
    const d = map[row.agent_id];
    d.calls++;
    if (row.cost_usd) { d.totalCost += parseFloat(row.cost_usd); d.costCount++; }

    const { kind, include } = classifyRow(row, turnTimestampsByAgent);
    if (!include) continue;
    if (!d.byKind[kind]) d.byKind[kind] = { calls: 0, totalLatency: 0, latencyCount: 0, maxLatency: null, byModel: {} };
    const k = d.byKind[kind];
    k.calls++;
    if (row.latency_ms) {
      k.totalLatency += row.latency_ms;
      k.latencyCount++;
      k.maxLatency = k.maxLatency == null ? row.latency_ms : Math.max(k.maxLatency, row.latency_ms);
    }

    const modelKey = row.model || 'unknown';
    if (!k.byModel[modelKey]) k.byModel[modelKey] = { calls: 0, totalLatency: 0, latencyCount: 0, maxLatency: null };
    const km = k.byModel[modelKey];
    km.calls++;
    if (row.latency_ms) {
      km.totalLatency += row.latency_ms;
      km.latencyCount++;
      km.maxLatency = km.maxLatency == null ? row.latency_ms : Math.max(km.maxLatency, row.latency_ms);
    }
  }
  Object.values(map).forEach(d => {
    d.avgCost = d.costCount ? d.totalCost / d.costCount : null;
    Object.values(d.byKind).forEach(k => {
      k.avgLatency = k.latencyCount ? Math.round(k.totalLatency / k.latencyCount) : null;
      Object.values(k.byModel).forEach(km => {
        km.avgLatency = km.latencyCount ? Math.round(km.totalLatency / km.latencyCount) : null;
      });
    });
  });
  return map;
}

export function useAgentActivitySummary(agentIds, scope, tenantId = 'global') {
  const [summary, setSummary] = useState({});

  useEffect(() => {
    if (!agentIds || agentIds.length === 0) { setSummary({}); return; }
    let cancelled = false;

    async function fetchAll() {
      const rows = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('ai_activity_log')
          .select('agent_id,ai_type,feature,model,latency_ms,cost_usd,created_at')
          .eq('tenant_id', tenantId)
          .in('agent_id', agentIds)
          .range(from, from + PAGE_SIZE - 1);
        if (error || !data) return null;
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return rows;
    }

    fetchAll().then((data) => {
      if (cancelled || !data) return;
      const inScope = (row) => {
        if (!scope) return true;
        if (scope.aiTypes?.includes(row.ai_type)) return true;
        if (row.feature && scope.featurePrefixes?.some(p => row.feature.startsWith(p))) return true;
        return false;
      };

      const scoped = data.filter(row => row.agent_id && inScope(row));

      const turnTimestampsByAgent = new Map();
      for (const row of scoped) {
        if (row.ai_type !== 'agent-turn') continue;
        if (!turnTimestampsByAgent.has(row.agent_id)) turnTimestampsByAgent.set(row.agent_id, []);
        turnTimestampsByAgent.get(row.agent_id).push(new Date(row.created_at).getTime());
      }

      const map = buildActivitySummary(scoped, turnTimestampsByAgent);
      setSummary(map);
    });

    return () => { cancelled = true; };
  }, []); // agentIds/scope are stable, page-defined constants — same no-deps precedent as before

  return summary;
}

// FEATURE: MI-15 — Data Sources drawer data source. Same direct-frontend-Supabase-read precedent
// as useLearnedContext() above (no api/ route, RLS is disabled platform-wide, AI-42). Dumb data
// fetcher only — label mapping (data_type -> display label/color/who-tag) happens in the
// component via describeDataType(), not here. .eq('status','active') excludes the 7 leftover
// status='archived' test-artifact rows from S-LIBRARIAN-04's write-capability tests (confirmed
// live this design session: 20 active + 7 archived rows in the_library) — filtered by the query
// itself, not client-side, per the kickoff.
export function useDataSources() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    supabase
      .from('the_library')
      .select('id,title,category,data_type,is_baseline,source,geo,program_area,partner_id,period')
      .eq('data_room_tag', APPLE_DATA_ROOM_TAG)
      .eq('status', 'active')
      .order('data_type')
      .order('title')
      .then(({ data, error }) => {
        if (error || !data) return;
        setRows(data);
      });
  }, []);

  return rows;
}

export function useAgents() {
  // TODO: replace with Supabase query when Phase 0 complete + Clerk auth arrives
  // const { data, isLoading } = useQuery(['agents', TENANT_ID], () =>
  //   supabase.from('agents').select('*').eq('tenant_id', TENANT_ID)
  // );
  return useMemo(() => AGENTS, []);
}
