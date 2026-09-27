-- DeepBench v7.0.652 | docs/design/agt-173-card-citation-guard.sql | AGT-173 -- A CYCLE CARD AND A
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

--
-- R1 (v7.0.648, cycle ece180eb, migration `agt173_commit_sha_guard`) ADDS A SECOND BLOCK TO THE SAME
-- GUARD FUNCTION AND THE SAME TRIGGER PAIR -- no new trigger, no new column, nothing duplicated: the
-- record may not quote a commit sha the board cannot resolve. MEASURED, not reasoned: of the commit
-- shas in `runner_cycles.notes` over five days, 19 of 42 are ancestors of no remote branch, because
-- the pre-push rebase rewrites every artifact commit; while 40 of 40 `push_sha` values in that window
-- ARE ancestors of `origin/dev` and step 7 asserts `push_sha = runner_verdicts.graded_sha`
-- (`SES-345`). That asymmetry is what makes refusing the rest safe -- the remedy the message
-- prescribes (name the artifact's PATH, or this cycle's push sha) is always reachable.
-- `\b` IS BACKSPACE IN POSIX ARE, NOT A WORD BOUNDARY: the design's first form used it and returned
-- 0 rows on a board full of offenders. The shipped form ends the token with `(?![0-9a-f])`.
-- Down captured FIRST: `capture_migration_down('ece180eb-…', 'agt173_commit_sha_guard', …)` over both
-- functions -> `auto-downable`, 2 objects captured, 0 refusals. Both bodies below are
-- `pg_get_functiondef` read back live after the migration and byte-identical to it (md5, live -> file:
-- note_unverifiable_commit_shas de66e9d032ce7dd932adaccbcd281d89 / 2,231 B;
-- runner_record_citation_guard 1a98a3cc133aef96dcf3d058e02f63d8 / 3,307 B).
--
-- R3+R4 (v7.0.652, cycle c6110394, migration `agt173_handle_completion`) ADDS A THIRD BLOCK TO THE
-- SAME GUARD FUNCTION AND THE SAME TRIGGER PAIR -- no new trigger, no new column, nothing
-- duplicated: THE RECORD COMPLETES ITS OWN HANDLE LIST AT WRITE TIME RATHER THAN BEING GRADED AFTER.
-- MEASURED THIS CYCLE, not reasoned: of the reversal handles belonging to ship cards from the last
-- four days, 77 of 133 are unlisted across 43 of 59 cards; over runner_cycles.notes in the same
-- window, 67 of 172 across 37 of 81 cycles. `cycle_reversal_handles()` shipped at v7.0.644 with NO
-- caller anywhere in the repo and nothing in scripts/, api/ or lib/ writes either surface, so the
-- completion sits in the table (pattern:8, pattern:10) -- appending, never refusing.
-- BLOCK ORDER IS LOAD-BEARING and is asserted live, not argued: blocks 1-2 grade the writer's own
-- text, block 3 appends last. 3 of 285 runner_decisions.summary rows in seven days cite a REMOVED
-- ticket (4df45c61/SES-378, 2ddefc51/AGT-138, 99e15850/SES-424), so appending first would refuse a
-- card over the renderer's own words; appended text then sits in OLD and is grandfathered by both
-- earlier clauses on every later update.
-- INSERT TIME IS THE RIGHT MOMENT: 52 of 54 omitted decision handles already existed when their card
-- was inserted. The 2 later ones are caught by a later text update and by nothing else -- named here,
-- not fixed.
-- RETURN-TYPE CHANGE => DROP FIRST (.claude/rules/supabase-function-signature.md): CREATE OR REPLACE
-- cannot add an OUT column, so cycle_reversal_handles is dropped by its exact identity argument list
-- and recreated with the seventh column `handle_token` -- `left(d.id::text, 8)` on the decision branch
-- and `m.up_name` on the migration-down branch, the token each sentence carries, which is what makes
-- the append idempotent by construction. Its body, comment and ORDER BY 5 are otherwise byte-identical
-- to the v7.0.644 text. The recreated function is re-REVOKEd and re-GRANTed BY NAME, because a DROP +
-- CREATE restores pg_default_acl's EXECUTE for anon and authenticated.
-- Down captured FIRST: `capture_migration_down('c6110394-ccf9-426d-b874-69ef431c5dd3',
-- 'agt173_handle_completion', both functions)` -> auto-downable, 2 objects captured, 0 refusals,
-- 6,312 B. Both bodies below are `pg_get_functiondef` read back live after the migration and
-- byte-identical to it (md5, live -> file: runner_record_citation_guard
-- d7d2de456994110bfe00b07601e2596e / 5,882 B; cycle_reversal_handles
-- bb42f2f094e2dcf91000ab8d7d78475e / 1,555 B). Blocks 1-2 of the guard were proven verbatim in the
-- new text against the down's own captured prior definition (1,651 B region, found intact), so
-- nothing above block 3 was retyped.
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

CREATE OR REPLACE FUNCTION public.note_unverifiable_commit_shas(p_new text, p_old text)
 RETURNS TABLE(token text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
-- AGT-173 R1 (v7.0.648). THE ALLOWLIST IS THE JOIN, exactly as card_removed_citations() does it with
-- backlog_items: a token is offending only when NO push_sha and NO graded_sha on the board can
-- resolve it. 40 of 40 push_sha values in the last five days ARE ancestors of origin/dev, while 19 of
-- 42 shas quoted in runner_cycles.notes are ancestors of no remote branch at all -- the pre-push
-- rebase rewrote them -- so the graded sha is the only always-true one and that is what makes
-- refusing the rest safe.
-- PREFIX EITHER WAY, so an abbreviation and a full 40 both resolve: a 7-char token matching a stored
-- 40, and a 40-char token matching a stored 7, are both known.
-- \b IS BACKSPACE IN POSIX ARE, NOT A WORD BOUNDARY -- written with \b this returned 0 rows in design
-- and looked like a clean board. The trailing (?![0-9a-f]) is the boundary that actually works.
-- p_old IS THE GRANDFATHER CLAUSE, as in part 1: correcting a row that quotes a dead sha means
-- quoting it while you correct it, so a token already in the row being updated is subtracted before
-- the check. Pass '' for a fresh INSERT -- OLD is NULL there, so an insert is judged whole.
  with new_toks as (
    select distinct m[1] as tok
      from regexp_matches(coalesce(p_new, ''),
             '(?:commit(?:ted)?(?: as)?)[[:space:]]+([0-9a-f]{7,40})(?![0-9a-f])', 'g') as m
  ),
  old_toks as (
    select distinct m[1] as tok
      from regexp_matches(coalesce(p_old, ''),
             '(?:commit(?:ted)?(?: as)?)[[:space:]]+([0-9a-f]{7,40})(?![0-9a-f])', 'g') as m
  ),
  known as (
    select c.push_sha as sha from public.runner_cycles c where coalesce(c.push_sha, '') <> ''
    union
    select v.graded_sha from public.runner_verdicts v where coalesce(v.graded_sha, '') <> ''
  )
  select n.tok
    from new_toks n
   where not exists (select 1 from old_toks o where o.tok = n.tok)
     and not exists (select 1 from known k
                      where k.sha like n.tok || '%' or n.tok like k.sha || '%')
   order by n.tok;
$function$;

CREATE OR REPLACE FUNCTION public.runner_record_citation_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
-- AGT-173 (v7.0.644, extended v7.0.648 R1). Nothing in scripts/, api/ or lib/ composes a cycle card
-- or a cycle's notes -- `grep -rn runner_items scripts/ api/ lib/` finds no writer;
-- decide-gated-card.js:337 only PRINTS one -- so both are hand-composed SQL at step 9 and the only
-- place a guard can sit is the table.
-- BEFORE INSERT OR UPDATE, one function for both tables, the column set chosen per table below.
-- THREE BLOCKS, ONE FUNCTION AND ONE TRIGGER PAIR (v7.0.648 R1 and v7.0.652 R3+R4 extend, never
-- duplicate): block 1 is the removed-ticket citation, block 2 the unresolvable commit sha, block 3
-- the reversal-handle completion. All three read the same v_new/v_old.
-- BLOCK ORDER IS LOAD-BEARING: blocks 1-2 grade the WRITER'S OWN text and refuse; block 3 appends
-- afterwards, so the sentences this function adds are never graded by the rules above. Appending
-- first would refuse a card over the renderer's own words -- 3 of 285 runner_decisions.summary rows
-- in seven days cite a removed ticket -- and the appended text then sits in OLD on any later update,
-- grandfathered by both clauses.
declare
  v_new       text;
  v_old       text;
  v_offenders text;
  v_count     integer;
  v_append    text;
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

  select string_agg(s.token, ', ' order by s.token), count(*)::integer
    into v_offenders, v_count
    from public.note_unverifiable_commit_shas(v_new, v_old) s;

  if coalesce(v_count, 0) > 0 then
    raise exception
      'runner_record_citation_guard: this % on %.% records a commit sha no push_sha or graded_sha on '
      'the board can resolve: %. The pre-push rebase rewrites every artifact commit, so a sha quoted '
      'from before the push is an ancestor of no remote branch and can never be fetched -- name the '
      'artifact''s PATH instead, or this cycle''s push sha (runner_verdicts.graded_sha), the one sha '
      'that is always true. A sha ALREADY in the row you are updating is grandfathered, so correcting '
      'a wrong one in place is always allowed. AGT-173.',
      TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_offenders
      using errcode = 'check_violation';
  end if;

  -- BLOCK 3 (v7.0.652, R3+R4). THE HANDLE LIST COMPLETES ITSELF, IT IS NEVER REFUSED. Measured this
  -- cycle over four days: 77 of 133 reversal handles belonging to ship cards are unlisted, across 43
  -- of 59 cards, and 67 of 172 across 37 of 81 runner_cycles.notes -- cycle_reversal_handles()
  -- shipped at v7.0.644 with NO caller anywhere in the repo and nothing in code writes either
  -- surface, so the completion has to sit where the write happens (pattern:8, pattern:10: a correct
  -- value that already exists deterministically is never left to a writer to remember). 52 of 54
  -- omitted decision handles already existed when their card was inserted, so INSERT time is the
  -- right moment; the 2 later ones are caught by a later text update and by nothing else.
  -- IDEMPOTENT BY CONSTRUCTION: each sentence carries its own handle_token, and the token is what is
  -- searched for in v_new -- so a handle already named is never appended twice, whoever named it.
  -- NO EXCEPTION PATH ANYWHERE IN THIS BLOCK: a completion that could raise would abort the writer's
  -- own record, which is the one thing this ticket must not do.
  if TG_TABLE_NAME = 'runner_items' then
    if NEW.kind = 'ship' and NEW.cycle_id is not null and NEW.backlog_id is not null then
      select string_agg(h.handle_sentence, ' ' order by h.decided_at) into v_append
        from public.cycle_reversal_handles(NEW.cycle_id, NEW.backlog_id) h
       where position(h.handle_token in v_new) = 0;
      if v_append is not null then
        NEW.plain_worth := btrim(concat_ws(' ', NEW.plain_worth, v_append));
      end if;
    end if;
  elsif TG_TABLE_NAME = 'runner_cycles' then
    if NEW.item_id is not null then
      select string_agg(h.handle_sentence, ' ' order by h.decided_at) into v_append
        from public.cycle_reversal_handles(NEW.id, NEW.item_id) h
       where position(h.handle_token in v_new) = 0;
      if v_append is not null then
        NEW.notes := btrim(concat_ws(E'\n\n', NEW.notes, v_append));
      end if;
    end if;
  end if;

  return NEW;
end
$function$;

DROP FUNCTION IF EXISTS public.cycle_reversal_handles(uuid, text);

CREATE OR REPLACE FUNCTION public.cycle_reversal_handles(p_cycle_id uuid, p_backlog_id text)
 RETURNS TABLE(handle_kind text, id text, kind text, summary text, decided_at timestamp with time zone, handle_sentence text, handle_token text)
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
         format('Reversible through decision handle %s (%s): %s.', d.id::text, d.kind, d.summary),
         left(d.id::text, 8)
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
                m.up_name, m.classification, length(m.down_sql)),
         m.up_name
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
REVOKE ALL ON FUNCTION public.note_unverifiable_commit_shas(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.card_removed_citations(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.runner_record_citation_guard() TO service_role;
GRANT EXECUTE ON FUNCTION public.cycle_reversal_handles(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.note_unverifiable_commit_shas(text, text) TO service_role;

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
  v_toks   text[];
  v_full   text;
begin
  -- 1. ONE OVERLOAD EACH (.claude/rules/supabase-function-signature.md). Never the success flag.
  foreach v_name in array array['card_removed_citations', 'runner_record_citation_guard',
                               'cycle_reversal_handles',
                               'note_unverifiable_commit_shas'] loop
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
                                 'public.cycle_reversal_handles(uuid, text)',
                                 'public.note_unverifiable_commit_shas(text, text)'] loop
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
  -- 5. R1 (v7.0.648): THE COMMIT-SHA BLOCK DISCRIMINATES, both halves, and the remedy the message
  --    prescribes is itself accepted. A rule that returns NOTHING -- which is exactly what the
  --    design's first \b form did, because \b is BACKSPACE in POSIX ARE -- passes 1-3 above too.
  select coalesce(array_agg(t.token order by t.token), array[]::text[]) into v_toks
    from public.note_unverifiable_commit_shas(
      'research doc committed as bcba265c at docs/research/x.md', '') t;
  if v_toks is distinct from array['bcba265c'] then
    raise exception 'agt173 R1 gate: the unresolvable sha returned %, expected {bcba265c}', v_toks;
  end if;

  select c.push_sha into v_full from public.runner_cycles c where c.push_sha like '3586c345%' limit 1;
  if v_full is null then
    raise exception 'agt173 R1 gate: premise gone -- no push_sha starts 3586c345, so the allowlist '
                    'half cannot be graded here';
  end if;
  select count(*)::integer into v_rows
    from public.note_unverifiable_commit_shas('research doc committed as 3586c345 at docs/x.md', '');
  if v_rows <> 0 then
    raise exception 'agt173 R1 gate: a 7-char abbreviation of a real push sha returned % row(s), '
                    'expected 0', v_rows;
  end if;
  select count(*)::integer into v_rows
    from public.note_unverifiable_commit_shas(
      'research doc committed as ' || v_full || ' at docs/x.md', '');
  if v_rows <> 0 then
    raise exception 'agt173 R1 gate: the full 40 of a real push sha returned % row(s), expected 0',
                    v_rows;
  end if;

  -- The grandfather clause, both directions -- without the second half it is indistinguishable from
  -- "UPDATE is never checked."
  select count(*)::integer into v_rows
    from public.note_unverifiable_commit_shas('kickoff committed 776af675 and more',
                                             'kickoff committed 776af675');
  if v_rows <> 0 then
    raise exception 'agt173 R1 gate: a sha already in the row returned % row(s), expected 0 -- no '
                    'cycle could correct its own record', v_rows;
  end if;
  select count(*)::integer into v_rows
    from public.note_unverifiable_commit_shas('kickoff committed 776af675', '');
  if v_rows <> 1 then
    raise exception 'agt173 R1 gate: the same text as a fresh INSERT returned % row(s), expected 1',
                    v_rows;
  end if;

  -- The remedy is reachable: naming the PATH passes, and so does a bare 'sha <value>' that makes no
  -- commit claim at all.
  select count(*)::integer into v_rows
    from public.note_unverifiable_commit_shas(
      'kickoff committed at docs/kickoffs/v7.0.648-AGT-173-record-names-paths.md', '');
  if v_rows <> 0 then
    raise exception 'agt173 R1 gate: naming the PATH returned % row(s), expected 0 -- the remedy the '
                    'message prescribes must itself be accepted', v_rows;
  end if;

  -- 6. R3 (v7.0.652): THE NEW COLUMN CARRIES A REAL TOKEN, read-only over closed history (cycle
  --    7ff68b47 / AGT-140, the finding this renderer exists for): both decision handles and the
  --    captured down, each with the token the completion searches for. A column that came back NULL
  --    would pass 1-5 above too, and the completion would then append every handle on every write.
  select coalesce(array_agg(h.handle_token order by h.handle_token), array[]::text[]) into v_toks
    from public.cycle_reversal_handles('7ff68b47-0639-4f1c-9cd7-c366feb69e60'::uuid, 'AGT-140') h;
  if v_toks is distinct from array['59e5e346', 'agt140_project_priority_pick', 'ea1c27fc'] then
    raise exception 'agt173 R3 gate: AGT-140 handle_token came back %, expected the two decision '
                    'prefixes and the captured down name', v_toks;
  end if;
end
$gate$;
