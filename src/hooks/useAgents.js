// src/hooks/useAgents.js — v5.0.0
// Returns the agent roster. Swap internals for Supabase query when auth arrives.
// All components use this hook — never import AGENTS directly from data/agents.js.

import { useMemo } from "react";
import { AGENTS } from "../data/agents.js";

export function useAgents() {
  // TODO: replace with Supabase query when Phase 0 complete + Clerk auth arrives
  // const { data, isLoading } = useQuery(['agents', TENANT_ID], () =>
  //   supabase.from('agents').select('*').eq('tenant_id', TENANT_ID)
  // );
  return useMemo(() => AGENTS, []);
}
