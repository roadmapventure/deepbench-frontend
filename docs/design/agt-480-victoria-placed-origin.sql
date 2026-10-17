-- AGT-480 (v7.0.853) -- THE VICTORIA-PLACED ORIGIN. Victoria finds a scored Auditor or Development
-- Manager ticket that fits an executing project and cannot move it: `epic_lock_guard()` passes only
-- `scope_origin = 'john-named'`, an unlocked epic, or a project whose `projects.accepts_findings` is
-- true. So John's own naming had a door (AGT-450) and HERS did not -- a ticket she scored 4 from
-- Nathan, Jerry, the Auditor or the Dev Manager waited on a findings list nobody builds from.
--
-- Measured live 2026-10-17 on tree 8bdf754, not reasoned about: `ck_backlog_scope_origin` admitted
-- six values and no `victoria-placed`; `epic_lock_guard()` (md5 05432ca5c8c72907cef83d676cc9c6a2)
-- passed `john-named` only; `scripts/requirement-check.js:506` refused a non-`john:` `--home`. The
-- whole board had exactly one project a `--home` could name -- and `accepts_findings` is false on
-- every executing one, so in practice none.
--
-- THE FIX, and the one thing it is NOT: a seventh `scope_origin` value the lock accepts, written in
-- exactly ONE place -- Victoria's move door, marked by a TRANSACTION-LOCAL token. It does NOT
-- switch on `accepts_findings` (John, decision 25 of docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md),
-- and it does not widen the lock for anybody else: every other writer -- a Builder, an Auditor, a
-- hand-written PATCH with the service key -- is refused by `scope_origin_door()` before the lock is
-- even reached. Two doors, one rule (pattern:14/163), the narrowest layer that works (pattern:8).
--
-- WHY A TOKEN AND NOT A COLUMN OR A ROLE (pattern:19 -- gate a dangerous operation through an
-- atomic correct path rather than hard-blocking it): `set_config(..., true)` is scoped to the
-- transaction and cannot be sent by PostgREST, which issues no `SET`. So the door is open for the
-- one statement inside `apply_requirement_verdict()` that needs it and closed to the network,
-- without a new role, a new column, or a rule any writer could satisfy by copying a value.
--
-- THIS FILE IS THE MIRROR of the migration `agt480_victoria_placed_origin`, applied via mcp
-- Supabase `apply_migration` (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT
-- here -- and so the trailing GATE's RAISE rolls every statement below back). Kickoff:
-- docs/kickoffs/v7.0.853-AGT-480-victoria-placed-origin.md; reasoning: docs/harvests/AGT-480.md.
--
-- =================================================================================================
-- THE DOWN, CAPTURED FIRST -- before any statement below ran (runbook step 6, kickoff T1(a)).
-- =================================================================================================
--
--   select * from public.capture_migration_down('05299e3e-01f5-427b-af15-3bb60021d3ec',
--     'agt480_victoria_placed_origin',
--     '[{"kind":"function","identity":"public.scope_origin_door()"},
--       {"kind":"function","identity":"public.epic_lock_guard()"},
--       {"kind":"function","identity":"public.apply_requirement_verdict(uuid, text, jsonb)"},
--       {"kind":"trigger","identity":"scope_origin_door on public.backlog_items"},
--       {"kind":"constraint","identity":"ck_backlog_scope_origin on public.backlog_items"}]'::jsonb);
--
-- RESULT (measured this cycle, 2026-10-17T19:26:26Z, BEFORE the apply below ran, exactly as kickoff
-- T1(a) predicted): captured_up_name `agt480_victoria_placed_origin`, captured_class **refused**,
-- objects_captured **4**, refusals **1**, derived_down_sql NULL. The four captured are the two
-- existing functions (full prior definitions, plus the stale-overload drop and the `count(*)`
-- assertion `.claude/rules/supabase-function-signature.md` requires), the not-yet-existing
-- `scope_origin_door()` (`existed: false` -> downs to a drop by identity) and the not-yet-existing
-- trigger. The ONE refusal is the constraint, verbatim: *"the constraint already exists, so the up
-- replaces it -- its prior form is not recoverable losslessly by this capture."*
--
-- **CONSEQUENCE, STATED RATHER THAN HIDDEN: a red range containing this migration is CARD-ONLY.**
-- The ship is not auto-rollbackable and step 8a's card says so. That is the fail-closed direction
-- and it is NOT a reason to hand-write a down -- a hand-authored down is the "authored from memory"
-- the design forbids. The six values the constraint held before this migration are written out in
-- full in statement (b) below, which is where a human reversing this would read them.
--
-- =================================================================================================
-- MD5 OF EVERY LIVE OBJECT, as the database renders it back -- proof that this file and the
-- database state one text rather than a claim about it. Read with:
--   select md5(pg_get_functiondef('public.epic_lock_guard()'::regprocedure));
-- =================================================================================================
--
--   epic_lock_guard()
--     BEFORE (read live 2026-10-17, this cycle, unchanged database): 05432ca5c8c72907cef83d676cc9c6a2
--            -- the same value kickoff section 2 names.
--     AFTER  (measured post-apply, re-read OUTSIDE the migration): b495f574737590c67eab35a82433c1a3
--
--   apply_requirement_verdict(uuid, text, jsonb)
--     BEFORE: a162dba478ef4b742739a8b14f21eb27  -- what AGT-450 (v7.0.846) left live.
--     AFTER : 9983927cc0647a8ba5d9a104eb7e282c
--
--   scope_origin_door()
--     BEFORE: did not exist (capture_migration_down reports `existed: false`, `overloads_before` 0).
--     AFTER : bda113d1ccc688f5225dfbaf5bcc5488
--
--   requirement_gate()  -- NOT TOUCHED by this migration, pinned both ways
--     BEFORE and AFTER: 33191bd23a6f82d2cd5c630f82de1180
--
-- THE FOUR READS OF KICKOFF SECTION 6.4, taken OUTSIDE this migration after it committed and
-- independently of the GATE that had already passed inside (a migration's own success flag is never
-- the evidence -- .claude/rules/supabase-column-grants.md):
--   * pg_proc counts in `public`: apply_requirement_verdict **1**, epic_lock_guard **1**,
--     scope_origin_door **1**.
--   * requirement_gate() md5 **33191bd23a6f82d2cd5c630f82de1180** -- unchanged.
--   * ck_backlog_scope_origin now reads
--     `ARRAY['original','gate-review','john-named','discovered','pre-existing','enhancement','victoria-placed']`.
--   * has_function_privilege on scope_origin_door(): anon **false**, authenticated **false**,
--     service_role true. FILE-MATRIX carries `enhancement / victoria-placed)` at offset 158, and the
--     `scope_origin_door` trigger is on `public.backlog_items` (1 row in pg_trigger).
--
-- ONE EDIT PER EXISTING FUNCTION, AND NO OTHER BYTE CHANGED.
--   * `epic_lock_guard()` gains kickoff section 4's L1 immediately AFTER its `john-named` early
--     return. The order is the point: `john-named` is still answered first and unconditionally, so
--     AGT-240's and AGT-450's behaviour is untouched and the new clause can only ADD the one case
--     the token proves. AGT-264's `accepts_findings` branch and the lock's own sentence are
--     byte-identical.
--   * `apply_requirement_verdict()`'s anchored homing UPDATE becomes section 4's H2: the same single
--     statement, its CASE now falling to `'victoria-placed'` where it used to fall to
--     `scope_origin`, wrapped in the token. `john:` sources and rows ALREADY `john-named` still
--     write `john-named`, so AGT-450's live behaviour and `requirement_gate()`'s own `john-named`
--     early return are preserved -- and the stamp still travels in the same UPDATE as `epic_id` and
--     in the same before-image, so ONE `reverse_decision()` puts the move and the origin back.
--
-- NO DROP FUNCTION for either: both identity argument lists are unchanged, so there is no second
-- overload to strip (.claude/rules/supabase-function-signature.md). The GATE asserts the counts are
-- 1 rather than reasoning that they must be.
--
-- =================================================================================================
-- THE MIGRATION, BYTE-IDENTICAL TO WHAT WAS APPLIED
-- =================================================================================================

-- DeepBench v7.0.853 | migration agt480_victoria_placed_origin | AGT-480
-- THE VICTORIA-PLACED ORIGIN. A seventh scope_origin value the lock accepts, written only inside
-- Victoria's move door (a transaction-local token), so a scored ticket from ANY source reaches an
-- executing project's locked list on her verdict and on nothing else. Rolls back unless the
-- trailing GATE passes. DOWN captured first: classification refused, 4 objects, 1 refusal
-- (ck_backlog_scope_origin already exists, so its prior form is not losslessly recoverable) --
-- a red range containing this migration is CARD-ONLY.

-- (b) THE VALUE. Dropped and re-added under the SAME name: a column CHECK cannot be widened in
-- place, and the six existing values are carried over byte for byte with the seventh appended.
alter table public.backlog_items drop constraint ck_backlog_scope_origin;
alter table public.backlog_items add constraint ck_backlog_scope_origin
  check (scope_origin is null or scope_origin = any (array[
    'original', 'gate-review', 'john-named', 'discovered', 'pre-existing', 'enhancement',
    'victoria-placed']));

-- (c) THE DOOR. The value is legal in the column and writable in exactly one place. The token is
-- transaction-local (set_config(..., true)), so it cannot leak past the statement that set it and
-- cannot be set from outside a function the database owns -- PostgREST sends no SET.
CREATE OR REPLACE FUNCTION public.scope_origin_door()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  -- An UPDATE that leaves scope_origin where it was is not a write of it. reverse_decision()
  -- rewrites every column of a row it restores, and that must not trip this door.
  IF TG_OP = 'UPDATE' AND NEW.scope_origin IS NOT DISTINCT FROM OLD.scope_origin THEN RETURN NEW; END IF;
  -- Every other origin is unaffected: this door is about ONE value, not about the column.
  IF coalesce(NEW.scope_origin, '') <> 'victoria-placed' THEN RETURN NEW; END IF;
  -- Victoria's move door, and only inside it.
  IF coalesce(current_setting('deepbench.victoria_door', true), '') = 'apply_requirement_verdict' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'AGT-480: scope_origin victoria-placed is written only by Victoria''s move door'
    USING errcode = 'check_violation';
END
$function$;

-- Functions default OPEN in this project -- pg_default_acl grants EXECUTE to anon, authenticated
-- and service_role BY NAME the instant one is created, and REVOKE ... FROM PUBLIC does not touch
-- those named grants (.claude/rules/supabase-column-grants.md, SES-315). Revoked by name; the GATE
-- asserts anon holds no EXECUTE rather than trusting this statement's success flag. A trigger
-- function needs no role grant at all: it runs as the table's owner.
revoke all on function public.scope_origin_door() from public, anon, authenticated;

create trigger scope_origin_door
  before insert or update of scope_origin on public.backlog_items
  for each row execute function public.scope_origin_door();

-- (d) THE LOCK, from live pg_get_functiondef('public.epic_lock_guard()'::regprocedure) read
-- 2026-10-17 (md5 05432ca5c8c72907cef83d676cc9c6a2), with exactly ONE edit: kickoff section 4's L1
-- added immediately after the john-named early return. The ordering is the point -- john-named is
-- still answered first and unconditionally, so AGT-240's and AGT-450's behaviour is byte-unchanged,
-- and the new clause can only ever ADD the one case the token proves.
CREATE OR REPLACE FUNCTION public.epic_lock_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_name text;
BEGIN
  -- AGT-240 (b): a project's list is locked when it starts executing. John naming a ticket into it is
  -- his own call (john-named passes); everything else waits on the findings list. An UPDATE that
  -- leaves epic_id where it was is not a move -- reverse_decision() rewrites every column of a row
  -- it restores, and that must not trip the lock.
  IF NEW.epic_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.epic_id IS NOT DISTINCT FROM OLD.epic_id THEN RETURN NEW; END IF;
  IF coalesce(NEW.scope_origin, '') = 'john-named' THEN RETURN NEW; END IF;
  -- AGT-480: and Victoria's own placement passes, but ONLY inside her move door. The token is
  -- transaction-local, so the lock still refuses a hand-written 'victoria-placed' row -- which
  -- scope_origin_door() has already refused one statement earlier anyway. Two doors, one rule.
  IF coalesce(NEW.scope_origin, '') = 'victoria-placed'
     AND coalesce(current_setting('deepbench.victoria_door', true), '') = 'apply_requirement_verdict' THEN
    RETURN NEW;
  END IF;
  -- AGT-264: a project that accepts findings keeps taking them while it executes, so its locked
  -- epic does not refuse. The lock sentence itself is byte-unchanged.
  SELECT e.name INTO v_name FROM public.epics e JOIN public.projects p ON p.id = e.project_id
   WHERE e.id = NEW.epic_id AND e.locked_at IS NOT NULL AND NOT p.accepts_findings;
  IF v_name IS NOT NULL THEN
    RAISE EXCEPTION 'AGT-240: epic % is locked; the finding waits on the findings list', v_name
      USING errcode = 'check_violation';
  END IF;
  RETURN NEW;
END
$function$;

-- (e) THE WRITER, from live pg_get_functiondef('public.apply_requirement_verdict(uuid,text,jsonb)'
-- ::regprocedure) read 2026-10-17 (md5 a162dba478ef4b742739a8b14f21eb27), with exactly ONE edit:
-- the anchored homing UPDATE becomes kickoff section 4's H2 -- the same statement, its CASE now
-- falling to 'victoria-placed' instead of leaving scope_origin alone, wrapped in the token that
-- both doors read. No DROP FUNCTION: the identity argument list (uuid, text, jsonb) is unchanged,
-- so there is no second overload to strip (.claude/rules/supabase-function-signature.md); the GATE
-- asserts the count is 1 rather than reasoning that it must be.
CREATE OR REPLACE FUNCTION public.apply_requirement_verdict(p_cycle uuid, p_session text, p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_verdict  text := lower(btrim(coalesce(p ->> 'verdict', '')));
  v_bid      text := btrim(coalesce(p ->> 'backlog_id', ''));
  v_src      text := p ->> 'need_source';
  v_reason   text := btrim(coalesce(p ->> 'reason', ''));
  v_score    smallint;
  v_ticket   public.backlog_items%rowtype;
  v_decision uuid;
  v_finding  uuid;
  v_proposal text;
  v_week     text := to_char(now(), 'IYYY-"W"IW');
  v_fp       text;
  -- AGT-309
  v_home     text;
  v_rc       int;
  v_epic     uuid;
begin
  -- Exactly one author, the same rule record_decision() and runner_before_images both carry.
  if (p_cycle is not null) = (p_session is not null) then
    raise exception 'apply_requirement_verdict: exactly one of p_cycle / p_session must be set -- a verdict has exactly one author';
  end if;
  if v_reason = '' then
    raise exception 'AGT-280: a requirement verdict carries its one-line reason';
  end if;

  if v_verdict = 'pass' then
    if v_bid = '' then
      raise exception 'AGT-280: a pass verdict names its backlog_id';
    end if;
    select * into v_ticket from public.backlog_items b where b.backlog_id = v_bid;
    if not found then
      raise exception 'AGT-280: no backlog_items row reads backlog_id %', v_bid;
    end if;

    if not public.need_source_is_traceable(v_src) then
      raise exception 'AGT-280: % cites no traceable need source (%); it waits on the intake list',
        v_bid, coalesce(v_src, '(none)') using errcode = 'check_violation';
    end if;

    begin
      v_score := (p ->> 'need_score')::smallint;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'AGT-280: need_score must be a whole number 0-5; got %',
        coalesce(p ->> 'need_score', '(none)') using errcode = 'check_violation';
    end;
    if v_score is null or v_score < 0 or v_score > 5 then
      raise exception 'AGT-280: need_score must be 0-5; got %',
        coalesce(v_score::text, '(none)') using errcode = 'check_violation';
    end if;

    v_decision := public.record_decision(
      p_cycle, p_session, 'requirement-check', v_ticket.backlog_id, v_ticket.title, v_reason,
      public.ladder_work_class(v_ticket.priority_class));

    -- THE IMAGE COMES BEFORE THE UPDATE. pk_value is the uuid (pattern:169), and backlog_items is
    -- in reversible_tables(), so this is a promise reverse_decision() can actually keep.
    insert into public.runner_before_images
      (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    values
      (p_cycle, p_session, 'backlog_items', v_ticket.id::text, to_jsonb(v_ticket), v_decision);

    update public.backlog_items
       set need_source = v_src, need_score = v_score
     where id = v_ticket.id;

    -- AGT-309: her pass may also HOME the ticket. The image above is the full row, so one
    -- reverse restores epic_id too. Both BEFORE triggers fire on this UPDATE: epic_lock_guard
    -- (AGT-240 — a locked list that does not accept findings refuses, and that refusal rolls this
    -- whole verdict back) and requirement_gate (the decision recorded above satisfies H1).
    v_home := btrim(coalesce(p ->> 'home_project', ''));
    if v_home <> '' then
      select count(*), min(e.id::text)::uuid into v_rc, v_epic
        from public.epics e join public.projects pj on pj.id = e.project_id
       where pj.slug = v_home and pj.status = 'executing';
      if v_rc <> 1 then
        raise exception 'AGT-309: home_project % is not one executing project with one epic', v_home
          using errcode = 'check_violation';
      end if;
      -- AGT-450: a john: source is John's own naming; the lock admits it. AGT-480: EVERY OTHER
      -- source is Victoria PLACING the ticket, which the lock now admits too -- but only inside
      -- this token, which is transaction-local and set for the one statement that needs it. The
      -- stamp travels in the same UPDATE as epic_id and in the same before-image, so one
      -- reverse_decision() puts the move and the origin back together.
      perform set_config('deepbench.victoria_door', 'apply_requirement_verdict', true);
      update public.backlog_items set epic_id = v_epic, scope_origin = case when split_part(coalesce(v_src, ''), ':', 1) = 'john' or scope_origin = 'john-named' then 'john-named' else 'victoria-placed' end, updated_at = now() where id = v_ticket.id;
      perform set_config('deepbench.victoria_door', '', true);
    end if;

    return v_decision;

  elsif v_verdict = 'not-needed' then
    -- NO ticket row is written. The proposal is LISTED as her ruling, so a cold future session
    -- finds why it was refused (pattern:92).
    v_proposal := btrim(coalesce(p ->> 'proposal', p ->> 'title', ''));
    if v_proposal = '' then
      raise exception 'AGT-280: a not-needed verdict names the proposal it refused';
    end if;
    v_fp := 'agt-280:not-needed:' || encode(sha256(convert_to(v_proposal, 'utf8')), 'hex');

    insert into public.audit_findings
      (fingerprint, iso_week, kind, family, finding_type, status, confidence, locations,
       governing_fact, proposed_resolution, ruling, ruled_by, found_by, ruled_at, cycle_id)
    values
      (v_fp, v_week, 'other', 'other', 'proposal', 'listed', 'high',
       jsonb_build_array(v_proposal),
       coalesce(nullif(btrim(coalesce(v_src, '')), ''), '(no source cited)'),
       v_reason, v_reason, 'victoria', 'victoria', now(), p_cycle)
    on conflict (fingerprint, iso_week) do nothing
    returning id into v_finding;

    -- audit_findings is append-only (AGT-70), so a re-ruling of the same proposal in the same week
    -- returns the handle already on the board rather than raising.
    if v_finding is null then
      select f.id into v_finding from public.audit_findings f
       where f.fingerprint = v_fp and f.iso_week = v_week;
    end if;
    return v_finding;

  else
    raise exception 'AGT-280: verdict must be pass or not-needed; got %',
      coalesce(p ->> 'verdict', '(none)');
  end if;
end
$function$;

-- (f) THE RULE TEXT, under its own decision and its own before-image. governance_rules is in
-- reversible_tables() and its pk is `id`, so this is a promise reverse_decision() can keep
-- (pattern:169). The edit is a REPLACE of one occurrence, so the statement is idempotent in the
-- only direction that matters: run twice, the second finds nothing to replace.
do $rule$
declare
  v_decision uuid;
  v_before   jsonb;
  v_n        int;
begin
  select to_jsonb(g) into v_before from public.governance_rules g where g.id = 'FILE-MATRIX';
  if v_before is null then
    raise exception 'AGT-480: no governance_rules row reads id FILE-MATRIX';
  end if;

  v_decision := public.record_decision(
    '05299e3e-01f5-427b-af15-3bb60021d3ec'::uuid, null, 'governance', 'AGT-480',
    'FILE-MATRIX names victoria-placed as a scope_origin',
    'AGT-480 adds a seventh scope_origin, victoria-placed, written only inside Victoria''s move ' ||
    'door. The filing matrix every ticket is filed against has to name it, or the value is legal ' ||
    'in the column and absent from the rule that tells a session which values exist.',
    public.ladder_work_class('P10 - Tooling'));

  insert into public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values
    ('05299e3e-01f5-427b-af15-3bb60021d3ec'::uuid, null, 'governance_rules', 'FILE-MATRIX',
     v_before, v_decision);

  update public.governance_rules
     set statement = replace(statement, 'pre-existing / enhancement)',
                             'pre-existing / enhancement / victoria-placed)'),
         updated_at = now()
   where id = 'FILE-MATRIX';
  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception 'AGT-480: the FILE-MATRIX update touched % row(s), not 1', v_n;
  end if;
end
$rule$;

-- (g) GATE. Kickoff section 6.4's reads, asserted INSIDE the migration -- a raise here rolls every
-- statement above back. They are re-read OUTSIDE afterwards, because a migration's own success flag
-- is never the evidence (.claude/rules/supabase-column-grants.md).
do $gate$
declare
  v_n     int;
  v_gate  text;
  v_def   text;
  v_stmt  text;
begin
  -- 1. exactly ONE of each of the three functions in public (asserted, never assumed).
  for v_def in select x from unnest(array['apply_requirement_verdict','epic_lock_guard','scope_origin_door']) x loop
    select count(*) into v_n
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where p.proname = v_def and n.nspname = 'public';
    if v_n <> 1 then
      raise exception 'AGT-480 GATE: % has % overload(s) in public (expected 1)', v_def, v_n;
    end if;
  end loop;

  -- 2. requirement_gate() is NOT edited by this migration -- AGT-309's clause, including its own
  --    john-named early return, stays exactly as it is. Pinned by md5, not by assumption.
  v_gate := md5(pg_get_functiondef('public.requirement_gate()'::regprocedure));
  if v_gate <> '33191bd23a6f82d2cd5c630f82de1180' then
    raise exception 'AGT-480 GATE: requirement_gate() md5 is % (expected 33191bd23a6f82d2cd5c630f82de1180)', v_gate;
  end if;

  -- 3. the constraint admits the seventh value, and the lock and the writer carry their one edit.
  select pg_get_constraintdef(oid) into v_def from pg_constraint where conname = 'ck_backlog_scope_origin';
  if coalesce(v_def, '') not like '%victoria-placed%' then
    raise exception 'AGT-480 GATE: ck_backlog_scope_origin does not admit victoria-placed: %', coalesce(v_def, '(missing)');
  end if;
  if position('else ''victoria-placed'' end' in
      pg_get_functiondef('public.apply_requirement_verdict(uuid,text,jsonb)'::regprocedure)) = 0 then
    raise exception 'AGT-480 GATE: the live writer does not carry the victoria-placed CASE';
  end if;
  if position('''victoria-placed''' in pg_get_functiondef('public.epic_lock_guard()'::regprocedure)) = 0 then
    raise exception 'AGT-480 GATE: the live epic_lock_guard() does not carry the victoria-placed clause';
  end if;

  -- 4. the trigger is ON the table, and the door is NOT callable with the browser's key.
  if not exists (select 1 from pg_trigger t
                  where t.tgrelid = 'public.backlog_items'::regclass
                    and t.tgname = 'scope_origin_door' and not t.tgisinternal) then
    raise exception 'AGT-480 GATE: the scope_origin_door trigger is not on backlog_items';
  end if;
  if has_function_privilege('anon', 'public.scope_origin_door()', 'EXECUTE') then
    raise exception 'AGT-480 GATE: anon still holds EXECUTE on scope_origin_door()';
  end if;
  if has_function_privilege('authenticated', 'public.scope_origin_door()', 'EXECUTE') then
    raise exception 'AGT-480 GATE: authenticated still holds EXECUTE on scope_origin_door()';
  end if;

  -- 5. the rule text names the value.
  select statement into v_stmt from public.governance_rules where id = 'FILE-MATRIX';
  if position('enhancement / victoria-placed)' in coalesce(v_stmt, '')) = 0 then
    raise exception 'AGT-480 GATE: FILE-MATRIX does not name victoria-placed';
  end if;

  raise notice 'AGT-480 GATE: passed -- 1 overload each for apply_requirement_verdict/epic_lock_guard/scope_origin_door; requirement_gate md5 unchanged; the constraint admits victoria-placed; the trigger is on backlog_items and anon/authenticated hold no EXECUTE on the door; FILE-MATRIX names the value.';
end
$gate$;
