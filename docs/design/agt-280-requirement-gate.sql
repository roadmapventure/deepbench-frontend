-- AGT-280 slice 1 (v7.0.729) -- THE REQUIREMENT GATE: a ticket reaches an executing project's list
-- only when it cites a need source that names a row that actually exists.
-- MIRROR of the applied migration `agt280_requirement_gate`. Applied via mcp Supabase
-- apply_migration (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT here).
--
-- (a) DOWN, CAPTURED FIRST, before any of this ran (kickoff §5 T1 (a)):
--   select * from public.capture_migration_down(
--     '2b5b44da-eb76-424f-b6a9-dd05107ec49f'::uuid, 'agt280_requirement_gate',
--     '[{"kind":"function","identity":"public.need_source_is_traceable(text)"},
--       {"kind":"function","identity":"public.requirement_gate()"},
--       {"kind":"function","identity":"public.apply_requirement_verdict(uuid, text, jsonb)"}]'::jsonb);
--   -> (agt280_requirement_gate, auto-downable, 3 captured, 0 refusals)
-- Only the three functions are auto-downable. Naming `public.backlog_items` / `public.runner_settings`
-- as `table` objects, or the trigger, would make the WHOLE capture `refused` (AGT-161 D1), so the
-- rest of the down is CARD-ONLY and recorded here, in reverse order:
--   1. drop trigger if exists requirement_gate on public.backlog_items;
--   2. alter table public.runner_settings drop column need_source_kinds;
--   3. alter table public.backlog_items drop constraint ck_backlog_need_score;
--   4. alter table public.backlog_items drop column need_score, drop column need_source;
--
-- WHAT WAS BROKEN, measured live 2026-09-29 on the unchanged tree. Nothing checked whether a
-- requirement was NEEDED before it became a ticket: `backlog_requires_finding()` only demands an
-- `audit_findings` row and exempts `scope_origin IN ('john-named','enhancement')`;
-- `epic_lock_guard()` only refuses a LOCKED epic; neither reads a source. `backlog_items` held 44
-- columns, none naming a source or a need score (`select=need_source,need_score` -> 400 42703, and
-- so did `runner_settings?select=need_source_kinds`). 94 open tickets sat in epics of `executing`
-- projects with no source; 29 `john-named` and 14 `discovered` rows were filed into one in 14 days,
-- and the `discovered` 14 are the AGT-141 class this gate stops.
--
-- THE FIVE PAIRS ARE DATA, NOT CODE (pattern:2): changing them is John's, a `runner_settings`
-- UPDATE, never a migration. WHETHER THE CITED ROW EXISTS IS A LOOKUP, so no model owns it
-- (pattern:10) -- her judgment of whether the source SUPPORTS the claim is the `requirement-check`
-- capability, shipping in slice 2 WITH its caller through `api/capabilities/execute.js`.
--
-- Guard: `tests/regression/agt-280-requirement-gate.test.mjs`. Architecture: §19v Operations.
-- AGT-280 stays `partial` -- slice 2 carries her three capabilities and their callers.
--
-- TWO NAMED ADDITIONS the kickoff's SQL does not spell out, both fail-closed and both small:
--   * `need_source_is_traceable()` checks `to_regclass()` before the dynamic EXECUTE. An allowlist
--     entry naming a dropped table would otherwise raise 42P01 inside a BEFORE trigger and brick
--     every filing path; unresolvable now means "not traceable", which is the safe direction.
--   * `audit_findings.proposed_resolution` is NOT NULL and the kickoff's field list does not name
--     it, so the `not-needed` branch writes the same one-line reason there that it writes to
--     `ruling`. The row is refused outright otherwise.

-- 1. THE TWO COLUMNS (kickoff §4). `need_source` is the text `who:table:id`; `need_score` is hers,
--    1-5, and the CHECK is the column's own so no writer can disagree with it.
alter table public.backlog_items add column need_source text;
alter table public.backlog_items add column need_score smallint;
alter table public.backlog_items add constraint ck_backlog_need_score
  check (need_score is null or need_score between 1 and 5);

comment on column public.backlog_items.need_source is
  'AGT-280 (v7.0.729): the need this ticket answers, as `who:table:id` -- one of the five who:table pairs in runner_settings.need_source_kinds, naming a row that EXISTS. requirement_gate refuses a row without one into an epic whose project is executing (john-named excepted, copied from epic_lock_guard).';
comment on column public.backlog_items.need_score is
  'AGT-280 (v7.0.729): how strongly the cited source supports this ticket, 1-5, written only by apply_requirement_verdict().';

-- 2. WHERE A NEED MAY COME FROM IS DATA (pattern:2). The five who:table pairs John's words,
--    Nathan's market records and Jerry's shared needs live in. Changing them is John's, an
--    UPDATE of this row -- not a migration and not a constant in code.
alter table public.runner_settings add column need_source_kinds text[];

update public.runner_settings
   set need_source_kinds = array[
         'john:runner_directives',
         'john:runner_decisions',
         'john:napkin_ideas',
         'nathan:market_records',
         'jerry:knowledge_entries'
       ]::text[]
 where id = 1;

comment on column public.runner_settings.need_source_kinds is
  'AGT-280 (v7.0.729): the who:table pairs a backlog_items.need_source may cite. Data, not code -- John changes it with an UPDATE. need_source_is_traceable() fails CLOSED on a NULL or empty array.';

-- 3. IS THE CITED SOURCE REAL? A lookup, never a judgment (pattern:10). False on NULL, blank, a bad
--    shape, a who:table outside the allowlist -- and, the whole point, on a WELL-FORMED citation of
--    a row that does not exist.
create or replace function public.need_source_is_traceable(p_source text)
 returns boolean
 language plpgsql
 stable
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_src   text := btrim(coalesce(p_source, ''));
  v_parts text[];
  v_who   text;
  v_table text;
  v_id    text;
  v_kinds text[];
  v_ok    boolean;
begin
  if v_src = '' then return false; end if;

  -- `who:table:id`, exactly three parts, none of them blank.
  v_parts := string_to_array(v_src, ':');
  if coalesce(array_length(v_parts, 1), 0) <> 3 then return false; end if;
  v_who   := btrim(v_parts[1]);
  v_table := btrim(v_parts[2]);
  v_id    := btrim(v_parts[3]);
  if v_who = '' or v_table = '' or v_id = '' then return false; end if;

  -- The allowlist decides which pairs exist at all, and it is a column, not a literal.
  select s.need_source_kinds into v_kinds from public.runner_settings s where s.id = 1;
  if v_kinds is null then return false; end if;
  if not ((v_who || ':' || v_table) = any (v_kinds)) then return false; end if;

  -- Fail closed rather than raise: a pair naming a table that no longer exists must read
  -- "not traceable" inside a BEFORE trigger, never 42P01.
  if to_regclass('public.' || quote_ident(v_table)) is null then return false; end if;

  execute format('select exists(select 1 from public.%I where id::text = $1)', v_table)
    into v_ok using v_id;
  return coalesce(v_ok, false);
end
$function$;

-- 4. THE GATE. Three guards VERBATIM from epic_lock_guard(), each returning NEW -- including the
--    UPDATE guard, because reverse_decision() rewrites every column of a row it restores and must
--    not trip this. Then the gate itself, on epic_project_executing(): the pick predicate's own
--    buildable clause, so intake and findings lists keep taking rows and no filing path breaks
--    today (the Designer's recorded call (b)).
create or replace function public.requirement_gate()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
BEGIN
  IF NEW.epic_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.epic_id IS NOT DISTINCT FROM OLD.epic_id THEN RETURN NEW; END IF;
  IF coalesce(NEW.scope_origin, '') = 'john-named' THEN RETURN NEW; END IF;
  IF public.epic_project_executing(NEW.epic_id) AND NOT public.need_source_is_traceable(NEW.need_source) THEN
    RAISE EXCEPTION 'AGT-280: % has no traceable need source; it waits on the intake list', NEW.backlog_id
      USING errcode = 'check_violation';
  END IF;
  RETURN NEW;
END
$function$;

drop trigger if exists requirement_gate on public.backlog_items;
create trigger requirement_gate before insert or update of epic_id on public.backlog_items
  for each row execute function requirement_gate();

-- 5. THE ONE WRITER. `pass` images the ticket under its own decision handle BEFORE the UPDATE, so
--    reverse_decision() can undo it; `not-needed` writes NO ticket row at all, only the listed
--    proposal. Every refusal below raises BEFORE anything is written.
create or replace function public.apply_requirement_verdict(p_cycle uuid, p_session text, p jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
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
      raise exception 'AGT-280: need_score must be a whole number 1-5; got %',
        coalesce(p ->> 'need_score', '(none)') using errcode = 'check_violation';
    end;
    if v_score is null or v_score < 1 or v_score > 5 then
      raise exception 'AGT-280: need_score must be 1-5; got %',
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

-- 6. THE MIGRATION ASSERTS ITS OWN QA, never its success flag (kickoff §5 T1 (f); §6.1 and §6.3).
do $agt280$
declare
  v_cols int;
  v_kinds int;
  v_n int;
  v_trg int;
begin
  select count(*) into v_cols from information_schema.columns
   where table_schema = 'public' and table_name = 'backlog_items'
     and column_name in ('need_source', 'need_score');
  if v_cols <> 2 then
    raise exception 'AGT-280 §6.1: backlog_items must carry both need_source and need_score; got %', v_cols;
  end if;

  select coalesce(array_length(s.need_source_kinds, 1), 0) into v_kinds
    from public.runner_settings s where s.id = 1;
  if v_kinds <> 5 then
    raise exception 'AGT-280 §6.1: runner_settings id=1 must hold 5 need_source_kinds; got %', v_kinds;
  end if;

  -- §6.3, and .claude/rules/supabase-function-signature.md: exactly one overload each, no stale one.
  select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and p.proname in ('need_source_is_traceable', 'requirement_gate', 'apply_requirement_verdict');
  if v_n <> 3 then
    raise exception 'AGT-280 §6.3: public must hold exactly 3 rows over the three functions (one each); got %', v_n;
  end if;

  select count(*) into v_trg from pg_trigger t
   where t.tgrelid = 'public.backlog_items'::regclass and not t.tgisinternal and t.tgname = 'requirement_gate';
  if v_trg <> 1 then
    raise exception 'AGT-280: backlog_items must carry exactly one requirement_gate trigger; got %', v_trg;
  end if;

  -- BOTH DIRECTIONS, never one (the supabase-column-grants lesson): the allowlist admits a real
  -- row and refuses a well-formed citation of nothing.
  if not public.need_source_is_traceable(
       'nathan:market_records:' || (select m.id::text from public.market_records m order by m.id limit 1)) then
    raise exception 'AGT-280: a live market_records row cited under an allowlisted pair must be traceable';
  end if;
  if public.need_source_is_traceable('nathan:market_records:00000000-0000-0000-0000-000000000000') then
    raise exception 'AGT-280: a well-formed citation of a row that does not exist must NOT be traceable';
  end if;
  if public.need_source_is_traceable(null) then
    raise exception 'AGT-280: NULL must not be traceable';
  end if;
end
$agt280$;
