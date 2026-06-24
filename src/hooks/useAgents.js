// DeepBench v5.2.37 | useAgents.js | Agent roster hook — wraps AGENTS data array
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

export function useAgents() {
  // TODO: replace with Supabase query when Phase 0 complete + Clerk auth arrives
  // const { data, isLoading } = useQuery(['agents', TENANT_ID], () =>
  //   supabase.from('agents').select('*').eq('tenant_id', TENANT_ID)
  // );
  return useMemo(() => AGENTS, []);
}
