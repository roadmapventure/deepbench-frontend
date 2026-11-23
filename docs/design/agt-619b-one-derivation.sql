-- DeepBench v7.0.1112 | docs/design/agt-619b-one-derivation.sql | AGT-619 stage B, the third of three applies -- public.get_ip_stats(text) and public.mcp_caller_gate(text) take the stored dollar first and price the rest with the model's own cache-read rate
--
-- THE MIRROR of migration `agt619b_one_derivation`. Everything below the VERBATIM marker is the
-- migration as designed (kickoff docs/kickoffs/v7.0.1112-AGT-619-each-dollar-names-its-rate-staged.md).
-- It needs stage A1 applied: both bodies read public.model_pricing.cache_read_per_1k.
--
-- WHAT CHANGES, in both functions and nowhere else: the dollar of one ledger row is
--   coalesce(the row's stored cost_usd,
--            its tokens x the sheet row for its model, cache reads at
--            coalesce(p.cache_read_per_1k, p.input_per_1k * 0.10))
-- which is shared/models.js computeCallCost() and the AI Audit's rule. Before, both bodies ignored
-- the stored dollar and priced every cache read at 0.10 x input (claude-fable-5-1: 0.001 against the
-- published 0.00025, 4x). Identities, return types, STABLE, search_path, grants, the join, the call
-- count and the token count are unchanged. Measured 2026-11-23 on live rows: the 64 addresses sum
-- 61.6559 before and 61.6509 after, the largest single move is 0.0023, and both keys are unchanged
-- to four places (17.5170, 2.0392).
--
-- DOWN: public.capture_migration_down(<cycle>, 'agt619b_one_derivation', the two identities) before
-- the apply; the down restores both prior bodies.
-- Guard: tests/regression/agt-619-rate-lineage.test.mjs. Governing: docs/ARCHITECTURE.md section 19t.
--
-- ---- THE MIGRATION, VERBATIM ---
CREATE OR REPLACE FUNCTION public.get_ip_stats(p_ip text)
 RETURNS TABLE(llm_calls bigint, total_tokens bigint, cost_usd numeric)
 LANGUAGE sql
 STABLE
AS $function$
  -- AGT-619 (v7.0.1112): the stored dollar first; an unpriced row is priced from the sheet with the
  -- model's own cache-read rate. One rule with shared/models.js computeCallCost().
  select count(*)::bigint,
         coalesce(sum(coalesce(l.input_tokens,0) + coalesce(l.output_tokens,0)
           + coalesce(l.cache_creation_input_tokens,0) + coalesce(l.cache_read_input_tokens,0)),0)::bigint,
         coalesce(sum(coalesce(l.cost_usd,
             (coalesce(l.input_tokens,0)/1000.0) * p.input_per_1k
           + (coalesce(l.cache_creation_input_tokens,0)/1000.0) * p.input_per_1k * 1.25
           + (coalesce(l.cache_read_input_tokens,0)/1000.0) * coalesce(p.cache_read_per_1k, p.input_per_1k * 0.10)
           + (coalesce(l.output_tokens,0)/1000.0) * p.output_per_1k)), 0)::numeric
  from public.ai_activity_log l
  join public.model_pricing p on p.model = l.model
  where l.caller_ip = p_ip;
$function$;

CREATE OR REPLACE FUNCTION public.mcp_caller_gate(p_key_sha256 text)
 RETURNS TABLE(caller_name text, permission text, spend_limit_usd numeric, llm_calls bigint, total_tokens bigint, cost_usd numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
 -- AGT-619 (v7.0.1112): the same dollar rule as public.get_ip_stats(text).
 select s.name, coalesce(g.permission,'trial'), coalesce(g.spend_limit_usd,5.00), st.n, st.t, st.c
 from public.runner_secrets s
 left join public.mcp_caller_gates g on g.caller_name = s.name
 cross join lateral (
  select count(*)::bigint n, coalesce(sum(i + o + cw + cr),0)::bigint t,
   coalesce(sum(coalesce(l.stored, (i/1000.0) * p.input_per_1k + (cw/1000.0) * p.input_per_1k * 1.25
    + (cr/1000.0) * coalesce(p.cache_read_per_1k, p.input_per_1k * 0.10) + (o/1000.0) * p.output_per_1k)),0)::numeric c
  from (select a.model, a.cost_usd stored, coalesce(a.input_tokens,0) i, coalesce(a.output_tokens,0) o,
    coalesce(a.cache_creation_input_tokens,0) cw, coalesce(a.cache_read_input_tokens,0) cr
   from public.ai_activity_log a where a.visitor_id = s.name) l
  join public.model_pricing p on p.model = l.model) st
 where s.name like 'MCP\_%' and s.value <> ''
  and encode(sha256(convert_to(s.value,'UTF8')),'hex') = lower(p_key_sha256)
 order by s.name limit 1;
$function$;

do $gate$
declare
  n integer;
  v_new numeric;
  v_old numeric;
  v_ref numeric;
begin
  -- B GATE 1: one overload each (.claude/rules/supabase-function-signature.md).
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname in ('get_ip_stats', 'mcp_caller_gate');
  if n <> 2 then raise exception 'B GATE 1: % functions named get_ip_stats / mcp_caller_gate, expected 2', n; end if;

  -- B GATE 2: neither opened to the public key.
  if has_function_privilege('anon', 'public.get_ip_stats(text)', 'execute')
     or has_function_privilege('authenticated', 'public.get_ip_stats(text)', 'execute')
     or has_function_privilege('anon', 'public.mcp_caller_gate(text)', 'execute')
     or has_function_privilege('authenticated', 'public.mcp_caller_gate(text)', 'execute') then
    raise exception 'B GATE 2: a gate function is executable by anon or authenticated';
  end if;

  -- B GATE 3: over every address, the function now returns the stored-first sum written out
  -- independently here, and it moved from the old flat derivation by less than five cents in all
  -- (measured 0.0050 on 2026-11-23). A larger move is a surprise this migration does not ship.
  select coalesce(sum(s.cost_usd), 0) into v_new
    from (select distinct caller_ip from public.ai_activity_log where caller_ip is not null) i
    cross join lateral public.get_ip_stats(i.caller_ip) s;
  select coalesce(sum(coalesce(a.cost_usd,
             (coalesce(a.input_tokens,0)/1000.0) * p.input_per_1k
           + (coalesce(a.cache_creation_input_tokens,0)/1000.0) * p.input_per_1k * 1.25
           + (coalesce(a.cache_read_input_tokens,0)/1000.0) * coalesce(p.cache_read_per_1k, p.input_per_1k * 0.10)
           + (coalesce(a.output_tokens,0)/1000.0) * p.output_per_1k)), 0),
         coalesce(sum(
             (coalesce(a.input_tokens,0)/1000.0) * p.input_per_1k
           + (coalesce(a.cache_creation_input_tokens,0)/1000.0) * p.input_per_1k * 1.25
           + (coalesce(a.cache_read_input_tokens,0)/1000.0) * p.input_per_1k * 0.10
           + (coalesce(a.output_tokens,0)/1000.0) * p.output_per_1k), 0)
    into v_ref, v_old
    from public.ai_activity_log a join public.model_pricing p on p.model = a.model
   where a.caller_ip is not null;
  if abs(v_new - v_ref) > 0.000001 then
    raise exception 'B GATE 3: get_ip_stats sums % over all addresses, the rule written out sums %', v_new, v_ref;
  end if;
  if abs(v_new - v_old) >= 0.05 then
    raise exception 'B GATE 3: the address total moved from % to %, more than the five cents designed', v_old, v_new;
  end if;
  if v_new = v_old then
    raise exception 'B GATE 3: the address total did not move (%) -- the new rule changed nothing', v_new;
  end if;
end
$gate$;
