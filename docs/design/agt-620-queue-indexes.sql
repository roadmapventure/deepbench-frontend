-- DeepBench v7.0.1068 | docs/design/agt-620-queue-indexes.sql | AGT-620 -- the pick queue stops scanning the whole backlog once per ticket.
-- Migration agt620_queue_indexes. UNDO: drop index if exists public.backlog_items_design_gate_idx; drop index if exists public.backlog_items_blocked_by_idx;
create index backlog_items_blocked_by_idx on public.backlog_items (blocked_by) where blocked_by is not null;
create index backlog_items_design_gate_idx on public.backlog_items (epic_id) where title ilike 'M_ design gate%';
do $agt620$
declare j json; hits bigint; ms numeric;
begin
  execute 'explain (analyze, buffers, format json) select count(*) from public.prime_directive_queue()' into j;
  hits := (j->0->'Plan'->>'Shared Hit Blocks')::bigint;
  ms := (j->0->>'Execution Time')::numeric;
  if hits >= 1200000 then
    raise exception 'AGT-620: the queue still reads % shared buffers in % ms (bar 1200000) -- rolled back', hits, ms;
  end if;
  if j::text not like '%backlog_items_design_gate_idx%' then
    raise exception 'AGT-620: the design-gate subplan does not use its index -- rolled back';
  end if;
end $agt620$;
