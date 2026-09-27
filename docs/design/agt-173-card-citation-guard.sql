-- DeepBench v7.0.644 | docs/design/agt-173-card-citation-guard.sql | AGT-173 -- A CYCLE CARD AND A
-- CYCLE'S NOTES CANNOT NEWLY CITE A REMOVED TICKET, AND CORRECTING ONE THAT DOES IS STILL ALLOWED.
--
-- WHERE THE GUARD HAD TO GO, measured rather than assumed: NOTHING composes a cycle card.
-- `grep -rn runner_items scripts/ api/ lib/` finds no writer -- scripts/decide-gated-card.js:337
-- only PRINTS one -- so cards and notes are hand-composed SQL at step 9 and the only layer that can
-- refuse a wrong sentence is the table itself (pattern:8, the narrowest layer that actually works).
--
-- THE POPULATION, MEASURED READ-ONLY BEFORE ANY TRIGGER EXISTED (2026-09-27, this cycle). The rule
-- below was run as a plain SELECT over every `runner_items` row created in the last 48 hours (54)
-- and every `runner_cycles.notes` in the same window (82): 136 rows, of which EIGHT carry an id
-- whose backlog row reads `status = 'removed'` --
--
--   runner_cycles.notes  9f616773  AGT-128  SES-369 "This is SES-369, open"          -- wrong
--   runner_cycles.notes  88c4862b  AGT-137  AGT-119 "its pre-existing red (AGT-119)" -- wrong
--   runner_items         14fe8230  AGT-137  AGT-119 same sentence, this ship's task 2 -- wrong
--   runner_cycles.notes  7ff68b47  AGT-140  SES-369 "SES-369's known-shut gate"      -- wrong
--   runner_cycles.notes  bd03a2e4  AGT-138  SES-369, SES-430 quoted from the ticket  -- a QUOTE
--   runner_items         0f29c005  AGT-138  SES-369, SES-430 "were open" (before-state) -- HISTORY
--   runner_cycles.notes  520c4add  AGT-170  SES-257 "SES-244/SES-257 already carry it" -- wrong
--   runner_cycles.notes  b3ef539b  AGT-173  AGT-119 "citation of the REMOVED AGT-119"  -- CORRECT
--
-- so the rule is real and growing (the Designer measured ONE row across three cards; over the whole
-- recent population it is eight), and it is not free: the last three rows above cite a removed id
-- LEGITIMATELY -- a quotation, a past-tense before-state, and a sentence that says "REMOVED" in
-- capitals. A FRESH write of any of those three is refused, which is a false refusal by meaning
-- rather than by shape. The grandfather clause stops it becoming a wall (the id is already in the
-- row, so an append never refuses) and it does not remove the class. Recorded here as a finding for
-- the Verifier, not patched around: the shipped rule is the kickoff's rule.
--
-- BOTH DIRECTIONS OF THE GRANDFATHER CLAUSE ARE PROVEN, not asserted -- an UPDATE carrying AGT-119
-- forward from OLD is ACCEPTED, the same text as a fresh INSERT is REFUSED, and an UPDATE that
-- introduces a DIFFERENT removed id (SES-369) into the very same row is REFUSED. Without the middle
-- case the clause would be indistinguishable from "UPDATE is never checked."
--
-- THE THREE FUNCTION BODIES BELOW ARE `pg_get_functiondef` OUTPUT, read back live after the
-- migration ran and byte-identical to it (md5, live -> file: card_removed_citations
-- 48dde9549dab3603fc2f740d87043ce8 / 1,465 B; runner_record_citation_guard
-- a45f9336897ccba80da1675810cfd3e1 / 2,178 B; cycle_reversal_handles
-- 098c8524a034f4193b26f321ac899258 / 1,486 B -- each block here is that text plus the statement's
-- own trailing semicolon). Nothing was retyped from memory.
--
-- Migration name: agt173_card_citation_guard. Down captured FIRST via
-- `capture_migration_down('b3ef539b-782f-4529-9ab4-320691706ebd', 'agt173_card_citation_guard', ...)`
-- over all five objects it creates: `auto-downable`, 5 objects captured, 0 refusals, 353 B, dropping
-- the two triggers before the three functions. Governing: ARCHITECTURE.md §19v (no write without a
-- before-image -- task 2's own UPDATE recorded one), §19k. Rules honoured:
-- .claude/rules/supabase-function-signature.md (one pg_proc row per name, asserted, never the
-- migration's success flag) and .claude/rules/supabase-column-grants.md's 2026-09-02 addendum
-- (functions default OPEN -- anon/authenticated hold EXECUTE by name the instant one is created, and
-- `REVOKE ... FROM PUBLIC` does not touch that, so all three are revoked BY NAME and both directions
-- are asserted at the foot).

CREATE OR REPLACE FUNCTION public.card_removed_citations(p_new text, p_old text)
 RETURNS TABLE(backlog_id text, status text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
-- AGT-173 (v7.0.644). THE ALLOWLIST IS THE JOIN, not a list of forbidden ids: a token that matches
-- the shape but names no backlog row cannot match anything, so an unknown id is silent by
-- construction and only a row that really exists and really reads 'removed' is returned.
-- p_old IS THE GRANDFATHER CLAUSE and it is the load-bearing half. Correcting a wrongly-cited row
-- means quoting the wrong id while you correct it; if that refused, the remedy this ticket exists
-- for would be unreachable. So an id already present in the row being updated is subtracted before
-- the join, and only a NEWLY introduced removed id is returned. Pass '' for a fresh INSERT --
-- OLD is NULL there, so an insert is judged whole.
  with new_ids as (
    select distinct m[1] as cited
      from regexp_matches(coalesce(p_new, ''), '[A-Z]{2,5}-[0-9]{1,4}[a-z]?', 'g') as m
  ),
  old_ids as (
    select distinct m[1] as cited
      from regexp_matches(coalesce(p_old, ''), '[A-Z]{2,5}-[0-9]{1,4}[a-z]?', 'g') as m
  )
  select b.backlog_id, b.status
    from new_ids n
    join public.backlog_items b on b.backlog_id = n.cited
   where b.status = 'removed'
     and not exists (select 1 from old_ids o where o.cited = n.cited)
   order by b.backlog_id;
$function$;

CREATE OR REPLACE FUNCTION public.runner_record_citation_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
-- AGT-173 (v7.0.644). Nothing in scripts/, api/ or lib/ composes a cycle card or a cycle's notes --
-- `grep -rn runner_items scripts/ api/ lib/` finds no writer; decide-gated-card.js:337 only PRINTS
-- one -- so both are hand-composed SQL at step 9 and the only place a guard can sit is the table.
-- BEFORE INSERT OR UPDATE, one function for both tables, the column set chosen per table below.
declare
  v_new       text;
  v_old       text;
  v_offenders text;
  v_count     integer;
begin
  if TG_TABLE_NAME = 'runner_items' then
    v_new := concat_ws(' ', NEW.title, NEW.value_case, NEW.before_after, NEW.qa_evidence,
                            NEW.plain_cant, NEW.plain_after, NEW.plain_worth, NEW.decision_reason);
    v_old := case when TG_OP = 'UPDATE'
                  then concat_ws(' ', OLD.title, OLD.value_case, OLD.before_after, OLD.qa_evidence,
                                      OLD.plain_cant, OLD.plain_after, OLD.plain_worth,
                                      OLD.decision_reason)
                  else '' end;
  elsif TG_TABLE_NAME = 'runner_cycles' then
    v_new := coalesce(NEW.notes, '');
    v_old := case when TG_OP = 'UPDATE' then coalesce(OLD.notes, '') else '' end;
  else
    return NEW;
  end if;

  select string_agg(c.backlog_id || ' (' || c.status || ')', ', ' order by c.backlog_id),
         count(*)::integer
    into v_offenders, v_count
    from public.card_removed_citations(v_new, v_old) c;

  if coalesce(v_count, 0) > 0 then
    raise exception
      'runner_record_citation_guard: this % on %.% newly cites a REMOVED backlog item: %. The row it '
      'names is gone, so the sentence asserts something the board does not hold -- cite the live '
      'tracker that replaced it instead. An id ALREADY in the row you are updating is grandfathered, '
      'so correcting a wrong citation in place is always allowed. AGT-173.',
      TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_offenders
      using errcode = 'check_violation';
  end if;

  return NEW;
end
$function$;

CREATE OR REPLACE FUNCTION public.cycle_reversal_handles(p_cycle_id uuid, p_backlog_id text)
 RETURNS TABLE(handle_kind text, id text, kind text, summary text, decided_at timestamp with time zone, handle_sentence text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
-- AGT-173 (v7.0.644). COMPLETENESS IS RENDERED, NEVER REFUSED: same-ticket handle omissions measure
-- 41 across ~30 ship cards over the last four days, so a BEFORE trigger enforcing them would refuse
-- every ship card on the board. This function is the remedy instead -- it hands the whole handle set
-- back so a card's plain_worth can name all of them. Finding 6136139c was one card naming one of
-- two: decision ea1c27fc present, agent-row decision 59e5e346 missing.
  select 'decision'::text,
         d.id::text,
         d.kind,
         d.summary,
         d.decided_at,
         format('Reversible through decision handle %s (%s): %s.', d.id::text, d.kind, d.summary)
    from public.runner_decisions d
   where d.cycle_id = p_cycle_id
     and d.backlog_id = p_backlog_id
  union all
  select 'migration-down'::text,
         m.id::text,
         m.classification,
         m.up_name,
         m.captured_at,
         format('Migration %s carries a captured down (%s, %s bytes) taken before it ran.',
                m.up_name, m.classification, length(m.down_sql))
    from public.runner_migration_downs m
   where m.captured_by_cycle = p_cycle_id
   order by 5;
$function$;

-- Grants, per .claude/rules/supabase-column-grants.md's 2026-09-02 addendum: pg_default_acl grants
-- EXECUTE to anon, authenticated and service_role BY NAME the instant a function is created, and
-- REVOKE ... FROM PUBLIC leaves those named grants standing. All three are revoked by name.
REVOKE ALL ON FUNCTION public.card_removed_citations(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.runner_record_citation_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cycle_reversal_handles(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.card_removed_citations(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.runner_record_citation_guard() TO service_role;
GRANT EXECUTE ON FUNCTION public.cycle_reversal_handles(uuid, text) TO service_role;

DROP TRIGGER IF EXISTS trg_runner_items_citations ON public.runner_items;
CREATE TRIGGER trg_runner_items_citations
  BEFORE INSERT OR UPDATE OF title, value_case, before_after, qa_evidence, plain_cant, plain_after,
                             plain_worth, decision_reason
  ON public.runner_items
  FOR EACH ROW EXECUTE FUNCTION public.runner_record_citation_guard();

DROP TRIGGER IF EXISTS trg_runner_cycles_notes_citations ON public.runner_cycles;
CREATE TRIGGER trg_runner_cycles_notes_citations
  BEFORE INSERT OR UPDATE OF notes
  ON public.runner_cycles
  FOR EACH ROW EXECUTE FUNCTION public.runner_record_citation_guard();

DO $gate$
declare
  v_name   text;
  v_ident  text;
  v_count  integer;
  v_tgtype smallint;
  v_cols   text[];
  v_rows   integer;
begin
  -- 1. ONE OVERLOAD EACH (.claude/rules/supabase-function-signature.md). Never the success flag.
  foreach v_name in array array['card_removed_citations', 'runner_record_citation_guard',
                               'cycle_reversal_handles'] loop
    select count(*)::integer into v_count
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = v_name;
    if v_count <> 1 then
      raise exception 'agt173 gate: public.% has % pg_proc row(s), expected exactly 1', v_name, v_count;
    end if;
  end loop;

  -- 2. BOTH GRANT DIRECTIONS, per function: the two public roles denied AND service_role allowed.
  foreach v_ident in array array['public.card_removed_citations(text, text)',
                                 'public.runner_record_citation_guard()',
                                 'public.cycle_reversal_handles(uuid, text)'] loop
    if has_function_privilege('anon', v_ident, 'EXECUTE') then
      raise exception 'agt173 gate: anon still holds EXECUTE on %', v_ident;
    end if;
    if has_function_privilege('authenticated', v_ident, 'EXECUTE') then
      raise exception 'agt173 gate: authenticated still holds EXECUTE on %', v_ident;
    end if;
    if not has_function_privilege('service_role', v_ident, 'EXECUTE') then
      raise exception 'agt173 gate: service_role lost EXECUTE on % -- step 9 could not write', v_ident;
    end if;
  end loop;

  -- 3. BOTH TRIGGERS, BEFORE, FOR EACH ROW, on INSERT and UPDATE (tgtype 1|2|4|16 = 23), each one
  --    scoped to the column NAMES it is meant to watch rather than to a count -- a count of 8 would
  --    pass on eight wrong columns.
  select t.tgtype into v_tgtype
    from pg_trigger t
   where t.tgname = 'trg_runner_items_citations' and t.tgrelid = 'public.runner_items'::regclass;
  select coalesce(array_agg(a.attname::text order by a.attname), array[]::text[]) into v_cols
    from pg_trigger t
    cross join lateral unnest(t.tgattr::int2[]) as u(attnum)
    join pg_attribute a on a.attrelid = t.tgrelid and a.attnum = u.attnum
   where t.tgname = 'trg_runner_items_citations' and t.tgrelid = 'public.runner_items'::regclass;
  if v_tgtype is distinct from 23::smallint
     or v_cols is distinct from array['before_after', 'decision_reason', 'plain_after', 'plain_cant',
                                     'plain_worth', 'qa_evidence', 'title', 'value_case'] then
    raise exception 'agt173 gate: trg_runner_items_citations is tgtype % over %; expected 23 over the '
                    'eight card text columns', v_tgtype, v_cols;
  end if;

  select t.tgtype into v_tgtype
    from pg_trigger t
   where t.tgname = 'trg_runner_cycles_notes_citations'
     and t.tgrelid = 'public.runner_cycles'::regclass;
  select coalesce(array_agg(a.attname::text order by a.attname), array[]::text[]) into v_cols
    from pg_trigger t
    cross join lateral unnest(t.tgattr::int2[]) as u(attnum)
    join pg_attribute a on a.attrelid = t.tgrelid and a.attnum = u.attnum
   where t.tgname = 'trg_runner_cycles_notes_citations'
     and t.tgrelid = 'public.runner_cycles'::regclass;
  if v_tgtype is distinct from 23::smallint or v_cols is distinct from array['notes'] then
    raise exception 'agt173 gate: trg_runner_cycles_notes_citations is tgtype % over %; expected 23 '
                    'over notes alone', v_tgtype, v_cols;
  end if;

  -- 4. THE RULE DISCRIMINATES, asserted read-only on the one real sentence this ticket was filed
  --    over, in BOTH directions -- a guard that returns nothing, or everything, passes 1-3 too.
  select count(*)::integer into v_rows
    from public.card_removed_citations(
      'agt-70-auditor keeps its pre-existing red (AGT-119)', '');
  if v_rows <> 1 then
    raise exception 'agt173 gate: the wrong-citation sentence returned % row(s), expected 1', v_rows;
  end if;
  select count(*)::integer into v_rows
    from public.card_removed_citations(
      'agt-70-auditor keeps its pre-existing red (AGT-119)',
      'agt-70-auditor keeps its pre-existing red (AGT-119)');
  if v_rows <> 0 then
    raise exception 'agt173 gate: the grandfather clause returned % row(s), expected 0 -- a cycle '
                    'could not correct a wrongly-cited row', v_rows;
  end if;
  select count(*)::integer into v_rows
    from public.card_removed_citations(
      'agt-70-auditor keeps its pre-existing red (AGT-108)', '');
  if v_rows <> 0 then
    raise exception 'agt173 gate: the CORRECTED sentence returned % row(s), expected 0', v_rows;
  end if;
end
$gate$;
