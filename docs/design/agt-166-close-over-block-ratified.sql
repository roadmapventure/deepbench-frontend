-- DeepBench v7.0.639 | docs/design/agt-166-close-over-block-ratified.sql | AGT-166 slice 1, Migration B
-- `agt166_close_over_block_ratified` -- apply via apply_migration AFTER capture_migration_down (kickoff §4).
-- Replace :C with '667738d4-89e8-4765-b368-e71c6783ca41'::uuid.
-- Same `()` identity as SES-311's function, so CREATE OR REPLACE replaces it and exactly one
-- overload remains (.claude/rules/supabase-function-signature.md). SES-311's message is byte-identical.

create or replace function public.backlog_done_requires_verdict() returns trigger language plpgsql as $function$
declare v_homed boolean; v record;
begin
  if new.status = 'done' and coalesce(old.status, '') <> 'done' then
    select exists (select 1 from public.epics e where e.id = new.epic_id and e.project_id is not null /* SES-340 */) into v_homed;
    if v_homed then
      select id, verdict, created_at into v
        from public.runner_verdicts where backlog_id = new.backlog_id
       order by created_at desc limit 1;
      if v.id is null then
        raise exception using errcode = 'check_violation',
          message = format('SES-311: %s cannot be written done — no runner_verdicts row exists for it. Run scripts/verifier.js --cycle-id=<supervised cycle> --ticket=%s first (docs/runbooks/session-setup.md step 3e).', new.backlog_id, new.backlog_id);
      end if;
      -- AGT-166: a close over a standing block is legal only when RATIFIED -- a non-reversed
      -- ship/ticket-status decision, or John's Accept on a ship card, dated at or after the verdict.
      if v.verdict = 'block' and not (
           exists (select 1 from public.runner_decisions d
                    where d.backlog_id = new.backlog_id and d.kind in ('ship', 'ticket-status')
                      and d.status <> 'reversed' and d.decided_at >= v.created_at)
        or exists (select 1 from public.runner_items i
                    where i.backlog_id = new.backlog_id and i.kind = 'ship'
                      and i.decision = 'accept' and i.decided_at >= v.created_at)) then
        raise exception using errcode = 'check_violation',
          message = format('AGT-166: %s cannot be written done over its latest verdict block (%s) — record a ship/ticket-status decision or harvest John''s Accept dated at or after it first.', new.backlog_id, v.id);
      end if;
    end if;
  end if;
  return new;
end $function$;

-- The 6 legacy closes (measured 2026-09-27: 34 done-over-block, 23 ratified by Accept, 5 by decision,
-- 6 by neither) get one reversible ticket-status decision each. Selected by the predicate, never by name.
do $$
declare r record;
begin
  for r in
    select b.backlog_id, v.id as vid
      from public.backlog_items b
      join lateral (select id, verdict, created_at from public.runner_verdicts
                     where backlog_id = b.backlog_id order by created_at desc limit 1) v on true
     where b.status = 'done' and v.verdict = 'block'
       and not exists (select 1 from public.runner_decisions d
                        where d.backlog_id = b.backlog_id and d.kind in ('ship', 'ticket-status')
                          and d.status <> 'reversed' and d.decided_at >= v.created_at)
       and not exists (select 1 from public.runner_items i
                        where i.backlog_id = b.backlog_id and i.kind = 'ship'
                          and i.decision = 'accept' and i.decided_at >= v.created_at)
  loop
    perform public.record_decision(:C, null, 'ticket-status', r.backlog_id,
      format('AGT-166: close of %s over verdict %s (block) ratified — shipped, on dev', r.backlog_id, r.vid),
      'The block was a pre-existing regression-suite red the ship proceeded past (verdict text: a block is the status quo). Re-opening shipped code is the lie; a fabricated approve is another. Reverse this decision to return the row to the auditor''s census.',
      null);
  end loop;
end $$;
