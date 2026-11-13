-- DeepBench v7.0.1018 | docs/design/agt-570-own-row-exemption.sql | AGT-570 -- the asking cycle is not its own peer.
-- Migration `agt570_own_row_exemption`.
--
-- THE DEFECT, measured 2026-11-13: runner_should_boot()'s lanes CTE counts every open runner-stamped
-- cycle, the caller's own row included, so at max_lanes 1 the driver's two reads answer lanes_full
-- about the cycle that is asking. record_leverage() admits only a ref still on
-- prime_directive_queue(), and rule B40's claim is exactly what takes the cycle's own pick off it.
--
-- THE CHANGE. One predicate and one clause, each a guarded single replacement of the live body:
--   (1) a caller that names its own runner_cycles id in the `x-deepbench-cycle` request header is
--       not counted as a live lane. No header (the pre-boot gate, every SQL caller) -> unchanged.
--   (2) record_leverage() also admits a row whose ONLY pick exclusion is the calling cycle's claim.
-- No signature change, no new function, no grant change, no COMMENT change.
-- STAGED, NOT APPLIED by the build that committed it (redesign attempt 2): the driver's header ships
-- first and is inert until this runs. Applying it is a separate, guarded step.
-- DOWN: capture_migration_down() on both functions BEFORE this is applied (the call is in the kickoff's BLOCKED paragraph).

do $agt570$
declare
  boot text := pg_get_functiondef('public.runner_should_boot()'::regprocedure);
  lev  text := pg_get_functiondef('public.record_leverage(uuid, jsonb)'::regprocedure);
  boot_from text := E'     AND coalesce(rc.heartbeat_at, rc.started_at) > now() - interval ''20 minutes''\n),';
  boot_to   text := E'     AND coalesce(rc.heartbeat_at, rc.started_at) > now() - interval ''20 minutes''\n'
    || E'     -- AGT-570: the asking cycle is not its own peer. A caller that names its own runner_cycles id in\n'
    || E'     -- the x-deepbench-cycle request header is not counted; no header, every row counts as before.\n'
    || E'     AND rc.id::text IS DISTINCT FROM (nullif(current_setting(''request.headers'', true), '''')::json ->> ''x-deepbench-cycle'')\n),';
  lev_from text := 'IF NOT (v_id = ANY (COALESCE(v_queue, ARRAY[]::text[]))) THEN';
  lev_to   text := E'IF NOT (v_id = ANY (COALESCE(v_queue, ARRAY[]::text[])))\n'
    || E'       -- AGT-570: the calling cycle''s own claim is not a reason to refuse its own mark.\n'
    || E'       AND NOT EXISTS (SELECT 1 FROM public.pick_exclusions() x\n'
    || E'                        WHERE x.backlog_id = v_id\n'
    || E'                          AND x.reasons = ARRAY[''claimed by '' || p_cycle_id::text]) THEN';
  hits int;
  t text; c uuid := gen_random_uuid(); own text; peer text; msg text;
begin
  if md5(boot) <> '292753ec6c445b5938344d8038d98c4e' then
    raise exception 'AGT-570: runner_should_boot() is not the body this migration was written against (md5 %); re-read it before applying', md5(boot);
  end if;
  if md5(lev) <> '71bbcc5623ac4dd3efbd498d03380bb9' then
    raise exception 'AGT-570: record_leverage() is not the body this migration was written against (md5 %); re-read it before applying', md5(lev);
  end if;
  hits := (length(boot) - length(replace(boot, boot_from, ''))) / length(boot_from);
  if hits <> 1 then raise exception 'AGT-570: the lanes replacement matched % times, expected exactly 1', hits; end if;
  hits := (length(lev) - length(replace(lev, lev_from, ''))) / length(lev_from);
  if hits <> 1 then raise exception 'AGT-570: the leverage replacement matched % times, expected exactly 1', hits; end if;

  execute replace(boot, boot_from, boot_to);
  execute replace(lev, lev_from, lev_to);

  -- Never trust the success flag: one overload each, and the public key still cannot call either.
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname in ('runner_should_boot', 'record_leverage')) <> 2 then
    raise exception 'AGT-570: expected exactly one overload each of runner_should_boot and record_leverage';
  end if;
  if has_function_privilege('anon', 'public.runner_should_boot()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.runner_should_boot()', 'EXECUTE')
     or has_function_privilege('anon', 'public.record_leverage(uuid, jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.record_leverage(uuid, jsonb)', 'EXECUTE') then
    raise exception 'AGT-570: a public role can execute one of the two functions';
  end if;

  -- BOTH DIRECTIONS, in a sub-transaction that always rolls back. A queue row is claimed for a
  -- made-up cycle; that cycle naming it TWICE must get past the queue check and stop at "named
  -- twice" (validation precedes every write, so nothing is recorded), and a DIFFERENT cycle naming
  -- it once must still be refused as off the queue.
  begin
    select q.ref into t
      from public.prime_directive_queue() q
      join public.backlog_items b on b.backlog_id = q.ref
     where b.claimed_by is null
     limit 1;
    if t is null then raise exception 'AGT-570 probe: no unclaimed queue row to probe with'; end if;
    update public.backlog_items set claimed_by = c::text, claimed_at = now() where backlog_id = t;
    begin
      perform public.record_leverage(c, jsonb_build_array(
        jsonb_build_object('backlog_id', t, 'improves', 'probe', 'why', 'probe'),
        jsonb_build_object('backlog_id', t, 'improves', 'probe', 'why', 'probe')));
      own := 'NO ERROR';
    exception when others then own := sqlerrm;
    end;
    begin
      perform public.record_leverage(gen_random_uuid(), jsonb_build_array(
        jsonb_build_object('backlog_id', t, 'improves', 'probe', 'why', 'probe')));
      peer := 'NO ERROR';
    exception when others then peer := sqlerrm;
    end;
    raise exception 'AGT570-PROBE own=[%] peer=[%]', own, peer;
  exception when others then
    if sqlerrm not like 'AGT570-PROBE%' then raise; end if;
    msg := sqlerrm;
  end;
  if msg not like '%own=[%is named twice]%' or msg not like '%peer=[%is not a ref of prime_directive_queue()%' then
    raise exception 'AGT-570: the leverage probe failed, nothing applied: %', msg;
  end if;
  raise notice '%', msg;
end
$agt570$;
