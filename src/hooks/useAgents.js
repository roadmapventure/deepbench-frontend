// DeepBench v7.0.154 | useAgents.js | LOG-70 — useAgentActivitySummary() stops selecting the frozen
// legacy `patterns_used` column. LOG-112 (v6.3.218) removed the only read of it on this path
// (buildActivitySummary()'s byPattern bucket); this hook is that function's other caller, so the
// column has been fetched-and-discarded on every page of every agent-activity query since. Proven
// dead against 400 live rows (305 carrying a non-empty value, 8 agents): the summary is
// deep-equal with and without it, while dropping latency_ms changes it — the negative control that
// makes the comparison discriminating. Payload-only change; no surface reads it, nothing renders
// differently. Second of LOG-70's two named consumers (src/aiPatterns.js) is NOT done — it is a
// design question, carded for John.
// DeepBench v6.3.50 | useAgents.js | CHI-10 — the "p75 latency buckets" line below is now p90; the
// actual computation lives in useAIActivity.js (moved there by LOG-21) and is only re-exported
// here — see that file's CHI-10 comment for the real change. Left as a pointer, not rewritten in
// place, so this file's own history stays intact.
// DeepBench v6.2.29 | useAgents.js | MI-58 — additive 30-day recency window on the ai_activity_log
// query + per-depth p75 latency buckets (byKind[kind].byDepth) so estimateChainMs() can compute a
// depth-weighted expected-value-per-call estimate instead of summing a single blended avgLatency.
// Every existing byKind field (avgLatency/maxLatency/calls/byModel) stays byte-identical. See
// kickoff docs/kickoffs/v6.2.29-MI-58-expected-time-estimate-fix.md.
// FEATURE: MI-58
//
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
import { computeCallCost, pairedAgentTurnIds, CAPABILITY_WRAPPER_TYPES, PAIR_WINDOW_MS, percentile, classifyRow, buildActivitySummary } from './useAIActivity.js';
// FEATURE: LOG-21 -- re-export the same imported bindings (not a second copy) so any existing
// or future caller that imports percentile()/classifyRow()/buildActivitySummary() from
// useAgents.js (as some did pre-move, since buildActivitySummary/percentile were previously
// defined and exported here) keeps working, with identical function identity to the
// useAIActivity.js originals.
export { percentile, classifyRow, buildActivitySummary };

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
// useAIActivity()'s byAgent (src/hooks/useAIActivity.js): that hook's module-level log store is
// only populated when something calls hydrateFromSupabase() (in practice, when the AI Audit panel
// mounts) — its own hook-level state doesn't depend on any caller here, so an agent used only on
// a screen that never opens AI Audit this session would still show correctly in *this* hook.
// FEATURE: LOG-19 -- previously said useAIActivity()'s byAgent was "backed by an in-memory log
// capped at 500 rows (hydrateFromSupabase()'s .limit(500))" -- stale since AI-184 rewrote
// hydrateFromSupabase() to page through the full table via .range(), no .limit(500) anywhere in
// that function anymore. Both hooks read full history from Supabase today; the real distinction
// is fetch trigger/lifecycle (this hook always fetches on its own mount; useAIActivity()'s store
// only fills when hydrateFromSupabase() is actually called), not row-count coverage.
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
// FEATURE: AI-51 — CAPABILITY_WRAPPER_TYPES/PAIR_WINDOW_MS moved to useAIActivity.js (now the
// canonical shared module for this pairing check, reused there for cost/pattern-count dedup too);
// imported above instead of defined here. Byte-identical values, no behavior change.

// FEATURE: MI-58 — bounds the activity summary to the last 30 days so both the Agents drawer's
// existing avg/max figures and this session's new per-depth estimate track current agent/model
// behavior instead of being diluted by arbitrarily old history. No visible effect today (confirmed
// live: all 4 qa-chain intents' data only goes back to 2026-07-07) — this is forward cover as
// history accumulates, not a fix for today's numbers.
const RECENCY_WINDOW_DAYS = 30;
export function recencyCutoffIso(days, nowMs = Date.now()) {
  return new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString();
}

// FEATURE: LOG-21 -- percentile()/classifyRow()/buildActivitySummary() moved to
// useAIActivity.js (now the canonical shared aggregation core for both this hook's
// useAgentActivitySummary() and useAIActivity()'s own byAgent); imported above instead of
// defined here. Byte-identical logic, no behavior change.

export function useAgentActivitySummary(agentIds, scope, tenantId = 'global', refreshKey = 0) {
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
          // FEATURE: AI-51 — 'id' added so pairedAgentTurnIds() can key its Set by real per-row
          // id instead of every row sharing `undefined` (which would falsely pair every row in
          // the batch as soon as any single agent-turn row paired).
          // FEATURE: LOG-70 -- 'patterns_used' dropped. LOG-112 (v6.3.218) rewrote
          // buildActivitySummary()'s per-agent pattern breakdown to stop reading the frozen legacy
          // field, and this hook is that function's only other caller -- so from that ship onward
          // the column was fetched on every page of every agent-activity query and read by
          // nothing. It is the last consumer named in LOG-70. Do not re-add it: pattern names are
          // derived at read time by the Log Displayer (.claude/rules/ai-pattern-signature.md,
          // ARCHITECTURE.md §19k/§19l), and LOG-112's own guard test does not cover src/hooks,
          // which is exactly how this line survived that session.
          .select('id,agent_id,ai_type,feature,model,latency_ms,cost_usd,input_tokens,output_tokens,created_at')
          .eq('tenant_id', tenantId)
          .in('agent_id', agentIds)
          .gte('created_at', recencyCutoffIso(RECENCY_WINDOW_DAYS))
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
  }, [refreshKey]); // FEATURE: MI-72b — bumping refreshKey (e.g. on Agents-drawer open) re-fetches;
  // agentIds/scope/tenantId remain page-defined constants, not real reactive deps, same precedent
  // as before for those three specifically.

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
