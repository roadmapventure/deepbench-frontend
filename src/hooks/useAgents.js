// DeepBench v5.2.37 | useAgents.js | Agent roster hook — wraps AGENTS data array
// DeepBench v6.0.36 | useAgents.js | MI-17 — Learned Context drawer data hook
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

export function useAgents() {
  // TODO: replace with Supabase query when Phase 0 complete + Clerk auth arrives
  // const { data, isLoading } = useQuery(['agents', TENANT_ID], () =>
  //   supabase.from('agents').select('*').eq('tenant_id', TENANT_ID)
  // );
  return useMemo(() => AGENTS, []);
}
