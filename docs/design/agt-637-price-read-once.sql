-- DeepBench v7.0.1050 | docs/design/agt-637-price-read-once.sql | AGT-637 -- the boot gate reads the price of a cycle once.
-- Migration `agt637_price_read_once`.
--
-- THE DEFECT, measured 2026-11-17: runner_should_boot()'s `pickable` CTE multiplies every queue row
-- by public.runner_pct_per_cycle(), a STABLE sql function holding an aggregate (a median over
-- usage_window_cycles), which the planner cannot inline and therefore runs once PER ROW. One call
-- costs 238 ms and the board held 81 pickable rows, so the gate took 20,890 ms. PostgREST runs as
-- authenticator (statement_timeout 8s; service_role inherits it), so every REST read of the gate
-- answered HTTP 500 57014 after 8.4 s and scripts/run-project.js exited 2 before pass one.
--
-- THE CHANGE. Three exact replacements of the live body, each asserted to match exactly once, under
-- an md5 guard on the body this was written against. The price is read once into a MATERIALIZED CTE
-- (`ppc`) and the two places that called the function read that row instead. No signature, grant,
-- owner, volatility or COMMENT change; no other function is touched. Measured on the live board
-- before shipping: the same answer (should_boot, reason, and every detail key but checked_at) in
-- 3,103 ms instead of 21,431 ms.
--
-- UNDO: public.capture_migration_down() on public.runner_should_boot(), called BEFORE this is
--   applied, holds the prior body (md5 4e2611ce347baf21db33753996efa463). By hand: run this block
--   with each pair's two halves swapped and the two md5 literals swapped.

do $agt637$
declare
  d text := pg_get_functiondef('public.runner_should_boot()'::regprocedure);
  n text;
  pairs text[][] := array[
    -- 1. the price of one cycle, read once
    array[E'pickable AS (\n  SELECT q.pos, q.lane, q.ref, q.title,',
          E'-- AGT-637: the price of one cycle, read ONCE per call. Written inline it ran once per pickable row.\nppc AS MATERIALIZED (\n  SELECT public.runner_pct_per_cycle() AS v\n),\npickable AS (\n  SELECT q.pos, q.lane, q.ref, q.title,'],
    -- 2. each row is priced from that one reading
    array[E'round(bi.predicted_cycles::numeric * public.runner_pct_per_cycle(), 2) AS pct_of_week',
          E'round(bi.predicted_cycles::numeric * (SELECT k.v FROM ppc k), 2) AS pct_of_week'],
    -- 3. and the detail reports the same reading
    array[E'    ''pct_per_cycle'',        public.runner_pct_per_cycle(),',
          E'    ''pct_per_cycle'',        (SELECT k.v FROM ppc k),']
  ];
  i int;
  hits int;
  t0 timestamptz;
  ms numeric;
  r record;
begin
  if md5(d) <> '4e2611ce347baf21db33753996efa463' then
    raise exception 'AGT-637: runner_should_boot() is not the body this migration was written against (md5 %); re-read it before applying', md5(d);
  end if;
  n := d;
  for i in 1 .. array_length(pairs, 1) loop
    hits := (length(n) - length(replace(n, pairs[i][1], ''))) / length(pairs[i][1]);
    if hits <> 1 then
      raise exception 'AGT-637: replacement % matched % times, expected exactly 1', i, hits;
    end if;
    n := replace(n, pairs[i][1], pairs[i][2]);
  end loop;
  hits := (length(n) - length(replace(n, 'runner_pct_per_cycle()', ''))) / length('runner_pct_per_cycle()');
  if hits <> 1 then
    raise exception 'AGT-637: the new body calls runner_pct_per_cycle() % times, expected exactly 1', hits;
  end if;
  if md5(n) <> '269eba5a36ca5cde76fbc7462f3344e5' then
    raise exception 'AGT-637: the edited body reads md5 %, expected 269eba5a36ca5cde76fbc7462f3344e5', md5(n);
  end if;
  execute n;

  -- Never trust the success flag: one overload, and the public key still cannot call it.
  if (select count(*) from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
       where ns.nspname = 'public' and p.proname = 'runner_should_boot') <> 1 then
    raise exception 'AGT-637: expected exactly one overload of runner_should_boot';
  end if;
  if has_function_privilege('anon', 'public.runner_should_boot()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.runner_should_boot()', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.runner_should_boot()', 'EXECUTE') then
    raise exception 'AGT-637: the grants on runner_should_boot() moved';
  end if;

  -- BOTH DIRECTIONS. The new body must answer, with the price it reports equal to the function's
  -- own, and inside the budget the REST path allows (8 s) with room to spare. A raise here rolls
  -- the replacement back, so a change that did not make the gate affordable is never left applied.
  t0 := clock_timestamp();
  select * into r from public.runner_should_boot();
  ms := round(extract(epoch from clock_timestamp() - t0)::numeric * 1000);
  if r.reason is null or r.detail is null then
    raise exception 'AGT-637: the new body returned no verdict';
  end if;
  if (r.detail ->> 'pct_per_cycle')::numeric is distinct from public.runner_pct_per_cycle() then
    raise exception 'AGT-637: detail.pct_per_cycle % is not runner_pct_per_cycle() %', r.detail ->> 'pct_per_cycle', public.runner_pct_per_cycle();
  end if;
  if ms >= 6000 then
    raise exception 'AGT-637: the new body took % ms, not under 6000 -- the gate is still not affordable over REST (8 s)', ms;
  end if;
  raise notice 'AGT-637: runner_should_boot() answered % in % ms', r.reason, ms;
end
$agt637$;
