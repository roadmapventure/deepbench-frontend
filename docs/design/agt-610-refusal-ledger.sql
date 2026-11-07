-- DeepBench v7.0.977 | docs/design/agt-610-refusal-ledger.sql | AGT-610 -- a refused ticket is redesigned twice, then diagnosed.
--
-- MIRROR of the migration `agt610_refusal_ledger`, applied byte-identical through apply_migration.
-- Spec: docs/kickoffs/v7.0.977-AGT-610-refusal-redesign-ledger.md task T1 (section 4, §M).
--
-- THE DECISION THIS IMPLEMENTS is John's standing directive `runner_directives`
-- 6e94edcb-d857-423e-af4d-233cc2c290c6 (status `standing`, 2026-11-05): a ticket whose build the
-- platform's auto-mode safety check REFUSED is redesigned by the team, at most twice, the second
-- attempt differing from the first in staging, scope or mechanism for an engineering reason; after
-- the second refusal one DIAGNOSTIC pass runs that changes nothing and the ticket parks for good.
-- Clause 7 stays John's alone -- spending money, dev->main, and creating or changing agents and
-- their permissions -- so nothing here widens an agent's capabilities: the redesign runs on the
-- `design-kickoff` capability the Designer already holds, with a `redesign` key in task_context.
--
-- THE DOWN WAS CAPTURED BEFORE THIS RAN, never after (a down taken afterwards restores the bug):
--   capture_migration_down('b5243878-8b1a-46fb-a01c-37f6462305dc', 'agt610_refusal_ledger',
--                          <(a) and the six functions, {kind, identity} as the live function's own
--                           header documents -- read with pg_get_functiondef, never guessed>)
--   -> classification `auto-downable`, 7 objects captured, 0 refusals, 4,280 bytes of down SQL.
--
-- THE SIGNATURE CHANGE IS THE RISK HERE, and it is handled as .claude/rules/supabase-function-signature.md
-- requires: `p_refusal jsonb` APPENDED to record_skip() creates a NEW OVERLOAD -- CREATE OR REPLACE
-- only replaces the exact identity argument list it already matches -- and with both present
-- PostgREST cannot resolve a call that omits the new parameter: it returns an ambiguity error that
-- reaches the caller as an EMPTY RESULT, not a crash (found live at DAT-12: 0 chunks on every live
-- answer for ~90 seconds). So (e) DROPS the stale 6-arg identity in THIS migration, the gate below
-- asserts exactly one `record_skip` row remains in pg_proc, and QA 4 runs the OMITTED-PARAMETER
-- path (`p_reason_kind 'other'`, four named params, as scripts/run-project.js posts it) to prove it
-- still returns a real row. "A parameter appended last leaves existing callers unaffected" is an
-- argument about POSITIONAL compatibility and says nothing about overload resolution.
--
-- FUNCTIONS AND TABLE SELECT BOTH DEFAULT OPEN IN THIS PROJECT (.claude/rules/supabase-column-grants.md,
-- addendum SES-315): pg_default_acl grants EXECUTE to anon, authenticated and service_role BY NAME
-- the instant a function is created, and `REVOKE ALL ON FUNCTION ... FROM PUBLIC` removes only the
-- PUBLIC grant while reporting success. So (i) revokes PUBLIC, anon and authenticated BY NAME on
-- every one of the six functions and SELECT on the new table, then grants service_role -- and the
-- trailing DO asserts BOTH directions (7 denials false, 7 service_role true) rather than trusting
-- this migration's own success flag.

-- ---------------------------------------------------------------------------------------------
-- (a) the ledger: one row per ATTEMPT, never one per ticket.
--
-- ONE ROW PER ATTEMPT is the whole point: `runner_skips` already holds one row per (ticket, kind)
-- with a bumping `skip_count`, and that shape cannot hold two attempts' DISTINCT refusals, which is
-- exactly the "more data why it got blocked" John asked for. attempt 0 is the original build, 1 and
-- 2 the two redesigns, 3 the diagnostic -- so `unique (backlog_id, attempt_no)` is the structural
-- form of "at most two redesign attempts" and `ck_rra_kind_no` pins the two ends of the range to
-- their kinds.
--
-- THE NINE REFUSAL FACTS (clause 5) are required ONCE `refused_at` IS SET and not before: an
-- attempt is opened before it runs, when none of them exists yet. A CHECK, not application code --
-- a refusal recorded with half its context is the thing that teaches nothing.
create table public.runner_refusal_attempts (
  id               uuid primary key default gen_random_uuid(),
  backlog_id       text not null,
  attempt_no       smallint not null check (attempt_no between 0 and 3),
  kind             text not null check (kind in ('original','redesign','diagnostic')),
  opened_at        timestamptz not null default now(),
  opened_cycle     uuid,
  reason           text,
  differs          text check (differs is null or differs in ('staging','scope','mechanism')),
  diff_from_prior  text,
  kickoff_path     text,
  refused_at       timestamptz,
  refused_cycle    uuid,
  refusal_text     text,
  refusal_label    text,
  action_sent      text,
  run_minutes      numeric,
  run_turns        integer,
  earlier_refusals integer,
  model            text,
  reach            text,
  undo             text,
  identical_to     uuid references public.runner_refusal_attempts(id),
  unknowns         text,
  feedback_text    text,
  feedback_result  text,
  diagnostic       jsonb,
  outcome          text not null default 'open' check (outcome in ('open','refused','parked')),
  unique (backlog_id, attempt_no),
  constraint ck_rra_kind_no check ((attempt_no = 0) = (kind = 'original') and (attempt_no = 3) = (kind = 'diagnostic')),
  constraint ck_rra_redesign check (kind <> 'redesign' or (btrim(coalesce(reason,'')) <> '' and differs is not null and btrim(coalesce(diff_from_prior,'')) <> '')),
  constraint ck_rra_refusal check (refused_at is null or (btrim(coalesce(refusal_text,'')) <> '' and btrim(coalesce(refusal_label,'')) <> '' and btrim(coalesce(action_sent,'')) <> '' and run_minutes is not null and run_turns is not null and earlier_refusals is not null and btrim(coalesce(model,'')) <> '' and btrim(coalesce(reach,'')) <> '' and btrim(coalesce(undo,'')) <> '')),
  constraint ck_rra_diagnostic check (kind <> 'diagnostic' or (btrim(coalesce(unknowns,'')) <> '' and btrim(coalesce(feedback_text,'')) <> '' and diagnostic is not null))
);
create index on public.runner_refusal_attempts (backlog_id);

-- ---------------------------------------------------------------------------------------------
-- (b) what is parked and still has a redesign left in it.
--
-- THE FUNCTION DECIDES PICKABILITY, NOT THE CALLER: `never_send` travels WITH the candidate, so the
-- Designer that picks the ticket up cannot design a task that re-sends an action already refused
-- (clause 4 / CLAUDE.md SES-019) without ignoring a column it was handed. `basis` is the latest
-- unresolved skip's own reason text, so the refusal the ticket actually met is what the redesign
-- reads -- never a recollection of it.
create or replace function public.refusal_parked_tickets()
returns table(backlog_id text, title text, need_score smallint, queue integer,
              design_status text, kickoff_link text, attempts integer,
              basis text, never_send text[])
language sql
stable
as $fn$
  select b.backlog_id,
         b.title,
         b.need_score,
         b.queue,
         b.design_status,
         b.kickoff_link,
         (select count(*)::integer from public.runner_refusal_attempts a
           where a.backlog_id = b.backlog_id and a.kind = 'redesign') as attempts,
         coalesce(
           (select s.reason from public.runner_skips s
             where s.backlog_id = b.backlog_id
               and s.resolved_at is null
               and s.reason_kind in ('permission-gate','needs-desktop')
             order by s.last_skipped_at desc nulls last
             limit 1),
           'design_status needs-desktop') as basis,
         coalesce(
           (select array_agg(a.action_sent order by a.attempt_no)
              from public.runner_refusal_attempts a
             where a.backlog_id = b.backlog_id and a.refused_at is not null),
           '{}'::text[]) as never_send
    from public.backlog_items b
   where b.status in ('open','partial')
     and (b.design_status = 'needs-desktop'
          or exists (select 1 from public.runner_skips s
                      where s.backlog_id = b.backlog_id
                        and s.resolved_at is null
                        and s.reason_kind in ('permission-gate','needs-desktop')))
     and not exists (select 1 from public.runner_refusal_attempts a
                      where a.backlog_id = b.backlog_id
                        and (a.outcome = 'open' or a.kind = 'diagnostic'
                             or a.identical_to is not null or a.outcome = 'parked'))
     and (select count(*) from public.runner_refusal_attempts a
           where a.backlog_id = b.backlog_id and a.kind = 'redesign') < 2
   order by b.need_score desc nulls last, b.queue nulls last, b.backlog_id;
$fn$;

-- ---------------------------------------------------------------------------------------------
-- (c) opening a redesign attempt -- BEFORE the build runs, never after it.
--
-- THE THIRD ATTEMPT IS REFUSED BY THE FUNCTION, in the function's own words, and that is the whole
-- AMENDMENT: John rejected a third try that uses another tool or rewords a step to dodge the check,
-- so the only step left after two refusals is close_refusal_diagnostic(). A guard that lived in a
-- script would be one `--force` away from a third attempt.
--
-- ATTEMPT 2 MUST DIFFER FROM ATTEMPT 1 and the comparison is MECHANICAL -- the lowered, trimmed
-- (reason, differs, diff_from_prior) triple -- because "state why it differs" graded by nobody is a
-- sentence a session can copy from its own previous attempt.
create or replace function public.open_redesign_attempt(
  p_cycle_id uuid, p_backlog_id text, p_reason text, p_differs text,
  p_diff_from_prior text, p_kickoff_path text default null)
returns public.runner_refusal_attempts
language plpgsql
as $fn$
declare
  v_n     integer;
  v_prior record;
  v_open  integer;
  v_diag  integer;
  v_ident integer;
  v_park  integer;
  v_row   public.runner_refusal_attempts;
  v_cand  integer;
  v_item  integer;
begin
  if p_cycle_id is null then
    raise exception 'open_redesign_attempt: p_cycle_id is required -- every attempt has one owner and owes a before-image'
      using errcode = '23514';
  end if;

  -- (2) THE SPECIFIC REASON, never a bare "not eligible": the caller is a cycle, and a cycle that
  -- cannot tell "this ticket was never refused" from "this ticket has spent both attempts" will
  -- retry the wrong one.
  select count(*) into v_item from public.backlog_items b
   where b.backlog_id = p_backlog_id and b.status in ('open','partial');
  if v_item = 0 then
    raise exception 'open_redesign_attempt: % has no open or partial backlog_items row -- a redesign is for a live ticket', p_backlog_id
      using errcode = '23514';
  end if;

  select count(*) into v_open from public.runner_refusal_attempts a
   where a.backlog_id = p_backlog_id and a.outcome = 'open';
  if v_open > 0 then
    raise exception 'open_redesign_attempt: an attempt is still open on % -- record its refusal with record_refusal() (or ship it) before opening another', p_backlog_id
      using errcode = '23514';
  end if;

  select count(*) into v_diag from public.runner_refusal_attempts a
   where a.backlog_id = p_backlog_id and a.kind = 'diagnostic';
  select count(*) into v_n from public.runner_refusal_attempts a
   where a.backlog_id = p_backlog_id and a.kind = 'redesign';
  if v_diag > 0 or v_n >= 2 then
    raise exception 'open_redesign_attempt: two redesign attempts exist -- the only step left is close_refusal_diagnostic() (% on %; John''s AMENDMENT of 6e94edcb: the third step is DIAGNOSIS, never a third try)', v_n, p_backlog_id
      using errcode = '23514';
  end if;

  select count(*) into v_ident from public.runner_refusal_attempts a
   where a.backlog_id = p_backlog_id and a.identical_to is not null;
  if v_ident > 0 then
    raise exception 'open_redesign_attempt: % is parked after a guard breach (identical_to) -- an action already refused was re-sent byte-identically (CLAUDE.md SES-019)', p_backlog_id
      using errcode = '23514';
  end if;

  select count(*) into v_park from public.runner_refusal_attempts a
   where a.backlog_id = p_backlog_id and a.outcome = 'parked';
  if v_park > 0 then
    raise exception 'open_redesign_attempt: % is parked -- its attempt history is closed', p_backlog_id
      using errcode = '23514';
  end if;

  select count(*) into v_cand from public.refusal_parked_tickets() t where t.backlog_id = p_backlog_id;
  if v_cand = 0 then
    raise exception 'open_redesign_attempt: % carries no refusal basis -- no unresolved permission-gate or needs-desktop skip and no needs-desktop design_status', p_backlog_id
      using errcode = '23514';
  end if;

  v_n := v_n + 1;

  if v_n = 2 then
    select a.reason, a.differs, a.diff_from_prior into v_prior
      from public.runner_refusal_attempts a
     where a.backlog_id = p_backlog_id and a.kind = 'redesign' and a.attempt_no = 1;
    if v_prior.reason is not null
       and (lower(btrim(p_reason)), p_differs, lower(btrim(p_diff_from_prior)))
         = (lower(btrim(v_prior.reason)), v_prior.differs, lower(btrim(v_prior.diff_from_prior))) then
      raise exception 'open_redesign_attempt: attempt 2 must differ from attempt 1 in staging, scope or mechanism, with its own engineering reason'
        using errcode = '23514';
    end if;
  end if;

  -- The image FIRST, and its success is what authorises the write (ARCHITECTURE.md §19v). row_data
  -- is NULL because the undo of an INSERT is a DELETE.
  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
  values (p_cycle_id, 'runner_refusal_attempts', p_backlog_id || '/' || v_n, null);

  insert into public.runner_refusal_attempts
    (backlog_id, attempt_no, kind, opened_cycle, reason, differs, diff_from_prior, kickoff_path)
  values (p_backlog_id, v_n, 'redesign', p_cycle_id, p_reason, p_differs, p_diff_from_prior, p_kickoff_path)
  returning * into v_row;

  return v_row;
end
$fn$;

-- ---------------------------------------------------------------------------------------------
-- (d) recording a refusal -- all nine facts or none.
--
-- GUARD 4 IS STRUCTURAL HERE, not advice: an `action_sent` byte-identical (after btrim) to one this
-- ticket has already had refused sets `identical_to` and parks the row. Clause 4 forbids retrying
-- the identical refused action, and a rule whose only enforcement is a sentence in a runbook is a
-- rule a cycle under pressure re-reads as a suggestion.
--
-- AN ORIGINAL IS CREATED ON DEMAND (attempt 0): the first refusal a ticket ever meets arrives from
-- step 7 with no attempt open, and refusing to record it would throw away the very sample the
-- directive exists to collect.
create or replace function public.record_refusal(p_cycle_id uuid, p_backlog_id text, p_refusal jsonb)
returns public.runner_refusal_attempts
language plpgsql
as $fn$
declare
  v_keys  text[] := array['refusal_text','refusal_label','action_sent','run_minutes','run_turns',
                          'earlier_refusals','model','reach','undo'];
  v_key   text;
  v_tgt   public.runner_refusal_attempts;
  v_dup   uuid;
  v_row   public.runner_refusal_attempts;
begin
  if p_cycle_id is null then
    raise exception 'record_refusal: p_cycle_id is required -- every refusal has one owner and owes a before-image'
      using errcode = '23514';
  end if;
  if p_refusal is null or jsonb_typeof(p_refusal) <> 'object' then
    raise exception 'record_refusal: p_refusal must be a JSON object carrying all nine refusal facts (6e94edcb clause 5)'
      using errcode = '23514';
  end if;

  foreach v_key in array v_keys loop
    if not (p_refusal ? v_key) or btrim(coalesce(p_refusal->>v_key, '')) = '' then
      raise exception 'record_refusal: p_refusal lacks % -- every refusal carries all nine (6e94edcb clause 5)', v_key
        using errcode = '23514';
    end if;
  end loop;

  select * into v_tgt from public.runner_refusal_attempts a
   where a.backlog_id = p_backlog_id and a.outcome = 'open'
   order by a.attempt_no desc
   limit 1;

  if v_tgt.id is null then
    insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
    values (p_cycle_id, 'runner_refusal_attempts', p_backlog_id || '/0', null);

    insert into public.runner_refusal_attempts (backlog_id, attempt_no, kind, opened_cycle)
    values (p_backlog_id, 0, 'original', p_cycle_id)
    returning * into v_tgt;
  end if;

  select a.id into v_dup from public.runner_refusal_attempts a
   where a.backlog_id = p_backlog_id
     and a.id <> v_tgt.id
     and a.refused_at is not null
     and btrim(a.action_sent) = btrim(p_refusal->>'action_sent')
   order by a.attempt_no
   limit 1;

  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
  values (p_cycle_id, 'runner_refusal_attempts', v_tgt.id::text, to_jsonb(v_tgt));

  update public.runner_refusal_attempts
     set refusal_text     = p_refusal->>'refusal_text',
         refusal_label    = p_refusal->>'refusal_label',
         action_sent      = p_refusal->>'action_sent',
         run_minutes      = (p_refusal->>'run_minutes')::numeric,
         run_turns        = (p_refusal->>'run_turns')::integer,
         earlier_refusals = (p_refusal->>'earlier_refusals')::integer,
         model            = p_refusal->>'model',
         reach            = p_refusal->>'reach',
         undo             = p_refusal->>'undo',
         refused_at       = now(),
         refused_cycle    = p_cycle_id,
         identical_to     = v_dup,
         outcome          = case when v_dup is null then 'refused' else 'parked' end
   where id = v_tgt.id
  returning * into v_row;

  return v_row;
end
$fn$;

-- ---------------------------------------------------------------------------------------------
-- (e) record_skip(), re-created with `p_refusal jsonb` -- and the 6-arg identity DROPPED here.
--
-- THE DROP IS IN THIS MIGRATION, by its full identity argument list, because CREATE OR REPLACE
-- would leave both overloads standing and PostgREST would stop resolving the four-named-parameter
-- call scripts/run-project.js makes -- surfacing as an empty result, not an error
-- (.claude/rules/supabase-function-signature.md; DAT-12).
--
-- THE REFUSAL SITS ABOVE THE BEFORE-IMAGE, exactly where the AGT-195 needs-john refusal sits and
-- for the same reason: a refused call must leave no image behind. It names the nine keys and the
-- runbook, so a cycle that meets it knows the next call without reading anything else -- which is
-- why this design needs no edit to runner-cycle.md (380,973 of 381,000 bytes; 27 bytes is not a
-- step).
drop function if exists public.record_skip(uuid, text, text, text, text, text);

create or replace function public.record_skip(
  p_cycle_id uuid, p_backlog_id text, p_reason_kind text, p_reason text,
  p_unblock_kind text default null, p_unblock_ref text default null,
  p_refusal jsonb default null)
returns public.runner_skips
language plpgsql
as $fn$
DECLARE
  v_old  public.runner_skips;
  v_new  public.runner_skips;
  v_kind text;
  v_ds   text;
BEGIN
  -- AGT-195. 'needs-john' is a LEGACY-ROW path only: M6-01/SES-315 retired it as a blocking
  -- state, and drain_chain_gate's c_flagged has been ARRAY['needs-desktop'] alone since SES-281,
  -- so a NEW needs-john skip parks a ticket nothing is waiting to un-park -- and, as AGT-168
  -- showed, lists one ticket twice with two different ask lists. This block sits ABOVE the
  -- before-image INSERT on purpose: a refusal must leave no image behind.
  IF p_reason_kind = 'needs-john' THEN
    SELECT design_status INTO v_ds FROM public.backlog_items WHERE backlog_id = p_backlog_id;
    IF COALESCE(v_ds,'') <> 'needs-john' THEN
      RAISE EXCEPTION 'record_skip: ''needs-john'' is a LEGACY-ROW path only (M6-01/SES-315; runner-cycle.md:2162-2163) -- % carries design_status % (NULL also means no such ticket). File a gated_before_build card and record the decision with its step-(7b) handle instead.',
        p_backlog_id, COALESCE(v_ds,'NULL') USING ERRCODE = '23514';
    END IF;
  END IF;

  -- AGT-610. A permission-gate skip IS a refusal, and a refusal with no data teaches nothing --
  -- which is the whole of John's clause 5. Above the image, like the AGT-195 block: nothing is
  -- written and the message names the next call.
  IF p_reason_kind = 'permission-gate' AND p_refusal IS NULL THEN
    RAISE EXCEPTION 'record_skip: a permission-gate skip carries the refusal since AGT-610 -- re-call with p_refusal {refusal_text, refusal_label, action_sent, run_minutes, run_turns, earlier_refusals, model, reach, undo}; docs/runbooks/redesign-after-refusal.md'
      USING ERRCODE = '23514';
  END IF;

  -- Default the unblock action from the reason, so a cycle that just says WHY it skipped still
  -- gives John a button. An explicit argument always wins.
  v_kind := COALESCE(p_unblock_kind, CASE p_reason_kind
              WHEN 'needs-john'       THEN 'question'
              WHEN 'other'            THEN 'question'
              WHEN 'gated'            THEN 'card'
              WHEN 'removal-proposed' THEN 'card'
              WHEN 'needs-desktop'    THEN 'prep'
              WHEN 'permission-gate'  THEN 'prep'
            END);

  SELECT * INTO v_old FROM public.runner_skips
   WHERE backlog_id = p_backlog_id AND reason_kind = p_reason_kind AND resolved_at IS NULL;

  -- Before-image FIRST, and its success is what authorises the write (section 19v).
  INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
  VALUES (p_cycle_id, 'runner_skips',
          COALESCE(v_old.id::text, p_backlog_id||'/'||p_reason_kind),
          CASE WHEN v_old.id IS NULL THEN NULL ELSE to_jsonb(v_old) END);

  IF v_old.id IS NULL THEN
    INSERT INTO public.runner_skips
      (backlog_id, reason_kind, reason, last_cycle_id, unblock_kind, unblock_ref)
    VALUES (p_backlog_id, p_reason_kind, p_reason, p_cycle_id, v_kind, p_unblock_ref)
    RETURNING * INTO v_new;
  ELSE
    UPDATE public.runner_skips
       SET last_skipped_at = now(),
           skip_count      = skip_count + 1,
           reason          = p_reason,
           last_cycle_id   = p_cycle_id,
           unblock_kind    = COALESCE(p_unblock_kind, unblock_kind, v_kind),
           unblock_ref     = COALESCE(p_unblock_ref, unblock_ref)
           -- briefed_at deliberately untouched: property (3).
     WHERE id = v_old.id
    RETURNING * INTO v_new;
  END IF;

  -- AGT-610. The ledger row is the refusal's own home; the skip row stays what it has always been.
  IF p_refusal IS NOT NULL THEN
    PERFORM public.record_refusal(p_cycle_id, p_backlog_id, p_refusal);
  END IF;

  RETURN v_new;
END $fn$;

-- ---------------------------------------------------------------------------------------------
-- (f) the diagnostic -- the third step, and it CHANGES NOTHING.
--
-- IT TOUCHES NO TICKET ROW, deliberately and assertably: the body references
-- runner_refusal_attempts and runner_before_images and nothing else, so QA 4 can prove the fixture
-- ticket's `backlog_items.updated_at` is unchanged after it ran. `shipped` and `parked` are DERIVED
-- in (g) from status and from this ledger; writing `design_status` here would make "the diagnostic
-- changes nothing" false by construction.
create or replace function public.close_refusal_diagnostic(
  p_cycle_id uuid, p_backlog_id text, p_unknowns text, p_feedback_text text,
  p_feedback_result text default null)
returns public.runner_refusal_attempts
language plpgsql
as $fn$
declare
  v_n    integer;
  v_has  integer;
  v_diag jsonb;
  v_row  public.runner_refusal_attempts;
  v_old  public.runner_refusal_attempts;
begin
  if p_cycle_id is null then
    raise exception 'close_refusal_diagnostic: p_cycle_id is required -- every write owes a before-image'
      using errcode = '23514';
  end if;

  select count(*) into v_n from public.runner_refusal_attempts a
   where a.backlog_id = p_backlog_id and a.kind = 'redesign' and a.outcome in ('refused','parked');
  if v_n <> 2 then
    raise exception 'close_refusal_diagnostic: the diagnostic runs after the second refusal, never before (% redesign refusal(s) on %)', v_n, p_backlog_id
      using errcode = '23514';
  end if;

  select count(*) into v_has from public.runner_refusal_attempts a
   where a.backlog_id = p_backlog_id and a.kind = 'diagnostic';
  if v_has > 0 then
    raise exception 'close_refusal_diagnostic: % is already diagnosed -- the diagnostic runs once and the ticket is parked', p_backlog_id
      using errcode = '23514';
  end if;

  select jsonb_agg(jsonb_build_object(
           'attempt_no', a.attempt_no, 'kind', a.kind,
           'refusal_label', a.refusal_label, 'refusal_text', a.refusal_text,
           'action_sent', a.action_sent, 'run_minutes', a.run_minutes,
           'run_turns', a.run_turns, 'earlier_refusals', a.earlier_refusals,
           'model', a.model, 'reach', a.reach, 'undo', a.undo,
           'diff_from_prior', a.diff_from_prior, 'refused_cycle', a.refused_cycle,
           'refused_at', a.refused_at) order by a.attempt_no)
    into v_diag
    from public.runner_refusal_attempts a
   where a.backlog_id = p_backlog_id and a.refused_at is not null;

  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
  values (p_cycle_id, 'runner_refusal_attempts', p_backlog_id || '/3', null);

  insert into public.runner_refusal_attempts
    (backlog_id, attempt_no, kind, opened_cycle, unknowns, feedback_text, feedback_result,
     diagnostic, outcome)
  values (p_backlog_id, 3, 'diagnostic', p_cycle_id, p_unknowns, p_feedback_text,
          p_feedback_result, v_diag, 'parked')
  returning * into v_row;

  for v_old in
    select * from public.runner_refusal_attempts a
     where a.backlog_id = p_backlog_id and a.kind = 'redesign'
  loop
    insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
    values (p_cycle_id, 'runner_refusal_attempts', v_old.id::text, to_jsonb(v_old));
    update public.runner_refusal_attempts set outcome = 'parked' where id = v_old.id;
  end loop;

  return v_row;
end
$fn$;

-- ---------------------------------------------------------------------------------------------
-- (g) the brief's one read -- information, never a card (clause 6).
--
-- STATE IS DERIVED, NEVER A SECOND WRITTEN COLUMN: `shipped` comes from backlog_items.status and
-- every other state from this ledger, so nothing can disagree with itself. The join is a LEFT join
-- because a ticket row may be gone (removed, renamed) while its attempt history stays -- and the
-- history is the thing John asked for.
create or replace function public.refusal_ledger_brief()
returns table(backlog_id text, title text, status text, attempts integer, state text,
              last_label text, last_refused_at timestamptz, unknowns text,
              feedback_text text, feedback_result text)
language sql
stable
as $fn$
  -- THE ORDER BY SITS OUTSIDE, on an aliased subselect, and that is not style: a `returns table`
  -- function's OUT names (`last_refused_at`, `status`, ...) are in scope inside the body, so an
  -- unqualified ORDER BY on an output column is ambiguous between the parameter and the column.
  select x.backlog_id, x.title, x.status, x.attempts, x.state,
         x.last_label, x.last_refused_at, x.unknowns, x.feedback_text, x.feedback_result
    from (
  with t as (select distinct a.backlog_id from public.runner_refusal_attempts a)
  select t.backlog_id,
         b.title,
         b.status,
         (select count(*)::integer from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.kind = 'redesign') as attempts,
         case
           when b.status in ('done','delivered') then 'shipped'
           when exists (select 1 from public.runner_refusal_attempts a
                         where a.backlog_id = t.backlog_id and a.kind = 'diagnostic') then 'parked (diagnosed)'
           when exists (select 1 from public.runner_refusal_attempts a
                         where a.backlog_id = t.backlog_id and a.identical_to is not null) then 'parked (guard)'
           when exists (select 1 from public.runner_refusal_attempts a
                         where a.backlog_id = t.backlog_id and a.outcome = 'open') then 'redesign open'
           else 'awaiting redesign'
         end as state,
         (select a.refusal_label from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.refused_at is not null
           order by a.refused_at desc limit 1) as last_label,
         (select a.refused_at from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.refused_at is not null
           order by a.refused_at desc limit 1) as last_refused_at,
         (select a.unknowns from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.kind = 'diagnostic' limit 1) as unknowns,
         (select a.feedback_text from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.kind = 'diagnostic' limit 1) as feedback_text,
         (select a.feedback_result from public.runner_refusal_attempts a
           where a.backlog_id = t.backlog_id and a.kind = 'diagnostic' limit 1) as feedback_result
    from t
    left join public.backlog_items b on b.backlog_id = t.backlog_id
    ) x
   order by x.last_refused_at desc nulls last, x.backlog_id;
$fn$;

-- ---------------------------------------------------------------------------------------------
-- (h) John's rule joins the Designer's standing Knowledge -- an agent-row write with a full image.
--
-- AGENT-ROW-AGREED-TICKET: this is an UPDATE over an ACTIVE agent's Knowledge, so it is build work
-- under a ticket that NAMES the write, carrying a FULL-ROW before-image under one
-- record_decision(kind 'agent-row') -- render-cycle-card.js repinKnowledge()'s exact shape. The
-- image holds the whole prior row, so reverse_decision() is a restore and not a guess.
--
-- IT IS NOT A design-ruling SENTENCE: scripts/design-ruling.js appends one <=400-character sentence
-- per Designer ask (AGT-136). This is 1,831 bytes and John-authored, so it travels as a migration.
do $agt610h$
declare
  v_dec uuid;
  v_n   integer;
begin
  v_dec := public.record_decision(
    'b5243878-8b1a-46fb-a01c-37f6462305dc', null, 'agent-row', 'AGT-610',
    'AGT-610: the risk rule and the redesign rule join ds-knowledge-standard',
    'John''s standing decision 6e94edcb (2026-11-05) names the Designer''s standing knowledge as the home of the risk rule; the image carries the FULL prior row, so the undo is a restore.',
    null);

  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data, decision_id)
  select 'b5243878-8b1a-46fb-a01c-37f6462305dc', 'skill_profiles', s.id::text, to_jsonb(s), v_dec
    from public.skill_profiles s
   where s.id = '0b5505cf-36c4-402c-9aa2-56351a59ad04';

  update public.skill_profiles
     set method = method || E'\n' || $k$RISK RULE (John, standing decision 6e94edcb, 2026-11-05; AGT-610). For every change in a ticket, state what it touches, how far it reaches (rows, functions, agents affected), and how it would be undone. When parts of a ticket carry different levels of risk, decide how to stage them, and say why. A part that cannot be undone, or that changes agent autonomy, ships as its own ticket. The declaration is one fenced `risk` block in the kickoff, one line per task, `T<n> | touches | reach | undo`; scripts/verifier.js --check-kickoff refuses a kickoff stamped v7.0.977 or later whose block is missing or leaves a task uncovered, and never grades what a line decides. A part that must ship alone is returned as a cap case (premise alive, kickoff null, the parts in build order in harvest_markdown) for the Development Manager's rule-cap-case door, exactly as pattern:172.
REDESIGN AFTER A REFUSAL (the same decision). When task_context carries `redesign` {attempt_no, basis, never_send, kickoff_link}, the ticket's build was refused by the platform's safety check and this is redesign attempt attempt_no of at most two. Read the prior kickoff and every refusal in basis first. Attempt 2 must differ from attempt 1 in staging, scope or mechanism, for an engineering reason (smaller reach, easier undo, risky part separated) that is never "so the check passes". Write the SESSION line `- **Redesign:** attempt N; differs: staging|scope|mechanism (attempt 1: first); because: <engineering reason>; from prior: <what changed>` -- scripts/redesign-pickup.js --open records it before the build runs. Never design a task that re-sends an action in never_send, routes it through another tool, or rewords it to dodge the check (CLAUDE.md SES-019); a part that only such an action could deliver is named as blocked in the kickoff, not disguised.$k$
   where id = '0b5505cf-36c4-402c-9aa2-56351a59ad04'
     and slug = 'ds-knowledge-standard';
  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception 'AGT-610 (h): the ds-knowledge-standard update touched % row(s), expected exactly 1', v_n;
  end if;
end
$agt610h$;

-- ---------------------------------------------------------------------------------------------
-- (i) grants, then the gate that does not believe this migration's success flag.
revoke select on public.runner_refusal_attempts from anon, authenticated;
grant select on public.runner_refusal_attempts to service_role;

revoke all on function public.refusal_parked_tickets() from public, anon, authenticated;
grant execute on function public.refusal_parked_tickets() to service_role;

revoke all on function public.open_redesign_attempt(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.open_redesign_attempt(uuid, text, text, text, text, text) to service_role;

revoke all on function public.record_refusal(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_refusal(uuid, text, jsonb) to service_role;

revoke all on function public.record_skip(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_skip(uuid, text, text, text, text, text, jsonb) to service_role;

revoke all on function public.close_refusal_diagnostic(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.close_refusal_diagnostic(uuid, text, text, text, text) to service_role;

revoke all on function public.refusal_ledger_brief() from public, anon, authenticated;
grant execute on function public.refusal_ledger_brief() to service_role;

do $agt610i$
declare
  v_fns  text[] := array[
    'public.refusal_parked_tickets()',
    'public.open_redesign_attempt(uuid, text, text, text, text, text)',
    'public.record_refusal(uuid, text, jsonb)',
    'public.record_skip(uuid, text, text, text, text, text, jsonb)',
    'public.close_refusal_diagnostic(uuid, text, text, text, text)',
    'public.refusal_ledger_brief()'];
  v_fn     text;
  v_false  integer := 0;
  v_true   integer := 0;
  v_procs  integer;
  v_len    integer;
  v_parked integer;
begin
  -- BOTH DIRECTIONS, and the denial first: a column or function that 403s for an unrelated reason
  -- is not a gate, and a gate asserted in one direction only is what left 476 caller IPs public at
  -- LOG-124 (.claude/rules/supabase-column-grants.md).
  if has_table_privilege('anon', 'public.runner_refusal_attempts', 'SELECT')
     or has_table_privilege('authenticated', 'public.runner_refusal_attempts', 'SELECT') then
    raise exception 'AGT-610 (i): the public key can still SELECT runner_refusal_attempts -- a refusal ledger is not public data';
  end if;
  v_false := v_false + 1;
  if not has_table_privilege('service_role', 'public.runner_refusal_attempts', 'SELECT') then
    raise exception 'AGT-610 (i): service_role lost SELECT on runner_refusal_attempts -- the brief could not read its own ledger';
  end if;
  v_true := v_true + 1;

  foreach v_fn in array v_fns loop
    if has_function_privilege('anon', v_fn, 'EXECUTE')
       or has_function_privilege('authenticated', v_fn, 'EXECUTE') then
      raise exception 'AGT-610 (i): % is still EXECUTEable by the public key -- pg_default_acl grants anon, authenticated and service_role BY NAME, and REVOKE ... FROM PUBLIC does not take those away (SES-315)', v_fn;
    end if;
    v_false := v_false + 1;
    if not has_function_privilege('service_role', v_fn, 'EXECUTE') then
      raise exception 'AGT-610 (i): service_role cannot EXECUTE % -- the revoke took the runner with it', v_fn;
    end if;
    v_true := v_true + 1;
  end loop;

  if v_false <> 7 or v_true <> 7 then
    raise exception 'AGT-610 (i): asserted % denial(s) and % grant(s), expected 7 and 7', v_false, v_true;
  end if;

  -- THE OVERLOAD ASSERTION (.claude/rules/supabase-function-signature.md): exactly one record_skip.
  -- Two would leave PostgREST unable to resolve the four-named-parameter call and surface as an
  -- EMPTY RESULT to every caller that omits p_refusal.
  select count(*)::integer into v_procs
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'record_skip' and p.prokind = 'f';
  if v_procs <> 1 then
    raise exception 'AGT-610 (e): record_skip has % pg_proc row(s), expected exactly 1 -- the stale 6-arg overload was not dropped (.claude/rules/supabase-function-signature.md, DAT-12)', v_procs;
  end if;

  select length(method)::integer into v_len
    from public.skill_profiles where slug = 'ds-knowledge-standard';
  if v_len <> 9132 then
    raise exception 'AGT-610 (h): ds-knowledge-standard.method is % bytes, expected 9132 (7300 + 1 + 1831) -- the addendum did not land byte-identical', v_len;
  end if;

  -- THE PREMISE, asserted rather than recalled: 26 needs-desktop tickets were measured live on
  -- 2026-11-07, so a function that returned fewer candidates than that is reading the wrong board.
  select count(*)::integer into v_parked from public.refusal_parked_tickets();
  if v_parked < 26 then
    raise exception 'AGT-610 (b): refusal_parked_tickets() returns % row(s), expected at least the 26 needs-desktop tickets measured live', v_parked;
  end if;
end
$agt610i$;
