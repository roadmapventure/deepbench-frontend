-- AGT-783 (v7.0.1107) -- the weekly review's Intent Skill row gains the company records check. MIRROR of the
-- migration `agt783_weekly_records_check`, applied by the orchestrator over the Supabase connector (apply_migration
-- wraps the text above the down marker in ONE transaction, so the trailing GATE's RAISE rolls every statement back).
-- Kickoff: docs/kickoffs/v7.0.1107-AGT-783-weekly-records-check.md; reasoning: docs/harvests/AGT-783.md.
--
-- GENERATED, NEVER TYPED. The step is the one line of docs/design/RMV-COMPANY-PROFILE-1121.md section 11a that opens
-- with its own name, taken by the generator in the harvest (S2), approved verbatim by the principal 2026-11-21.
--
-- WHAT IT WRITES: one full-row before-image of public.skill_profiles row 95901d98-e0f8-4b62-9593-df26b5534734
-- (sc-weekly-review-intent, type intent, read by one capability) under the decision the orchestrator recorded just before the
-- apply, then ONE update that appends a blank line and the step to that row's method. Nothing else: no other row,
-- no Library item, no record, no pin, no switch.
--
-- THE md5 GATE. Both statements act only while md5(method) is 502b11cbb80b21c000ad39a8b819c978 (the 1,596 characters
-- read live at design). A row somebody edited since matches nothing, the GATE raises and nothing applies; a second
-- apply matches nothing for the same reason, so the step can never be appended twice.
--
-- THE UNDO. public.skill_profiles is in public.reversible_tables():
--   select * from public.reverse_decision('<the decision id>', '<who>', '<why>');
-- restores the row whole from the before-image. The statement under the down marker is the hand fallback.

-- 1. The before-image first.
insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
select d.cycle_id, d.session_name, 'skill_profiles', sp.id::text, to_jsonb(sp), d.id
  from (select id, cycle_id, session_name from public.runner_decisions
         where backlog_id = 'AGT-783' and kind = 'agent-row' and status = 'open' and summary like 'AGT-783 step:%'
           and decided_at > now() - interval '2 hours'
         order by decided_at desc limit 1) d
 cross join public.skill_profiles sp
 where sp.slug = 'sc-weekly-review-intent' and sp.id = '95901d98-e0f8-4b62-9593-df26b5534734' and md5(sp.method) = '502b11cbb80b21c000ad39a8b819c978';

-- 2. The step, appended.
update public.skill_profiles
   set method = method || E'\n\n' || $step$COMPANY RECORDS CHECK: compare your three pinned company records (company profile, offerings, consulting automation) with the Library's live public wording items and the newest KPI Library release. A mismatch is a difference in substance only: a number differs; a product, service or practice name differs; a claim contradicts; or the live text breaks one of the record's wording rules. Phrasing, length, order and synonyms are not mismatches. For each mismatch write one gap naming the record, its line and the live text, unless an open gap already names it or a correction records that the principal accepted it. When a gap you filed no longer holds, say it is resolved. Never edit a record and never state it differently; the record wins until the principal changes it.$step$,
       updated_at = now()
 where slug = 'sc-weekly-review-intent' and id = '95901d98-e0f8-4b62-9593-df26b5534734' and md5(method) = '502b11cbb80b21c000ad39a8b819c978';

-- 3. GATE: reads only. Any RAISE applies nothing.
do $gate$
declare
  c_step constant text := $step$COMPANY RECORDS CHECK: compare your three pinned company records (company profile, offerings, consulting automation) with the Library's live public wording items and the newest KPI Library release. A mismatch is a difference in substance only: a number differs; a product, service or practice name differs; a claim contradicts; or the live text breaks one of the record's wording rules. Phrasing, length, order and synonyms are not mismatches. For each mismatch write one gap naming the record, its line and the live text, unless an open gap already names it or a correction records that the principal accepted it. When a gap you filed no longer holds, say it is resolved. Never edit a record and never state it differently; the record wins until the principal changes it.$step$;
  n integer;
  m text;
begin
  select count(*) into n from public.skill_profiles where slug = 'sc-weekly-review-intent';
  if n <> 1 then raise exception 'GATE 1 rows named sc-weekly-review-intent: % of 1', n; end if;
  select method into m from public.skill_profiles where slug = 'sc-weekly-review-intent' and id = '95901d98-e0f8-4b62-9593-df26b5534734';
  if m is null then raise exception 'GATE 2 the row is gone'; end if;
  if (length(m) - length(replace(m, c_step, ''))) / length(c_step) <> 1 then
    raise exception 'GATE 3 the step must sit exactly once, found % time(s) -- was the row edited since design?',
      (length(m) - length(replace(m, c_step, ''))) / length(c_step);
  end if;
  if md5(left(m, 1596)) <> '502b11cbb80b21c000ad39a8b819c978' or m <> left(m, 1596) || E'\n\n' || c_step then
    raise exception 'GATE 4 the method is not the previous text, a blank line, the step';
  end if;
  select count(*) into n from public.runner_before_images b join public.runner_decisions d on d.id = b.decision_id
   where d.backlog_id = 'AGT-783' and d.kind = 'agent-row' and b.table_name = 'skill_profiles'
     and b.pk_value = '95901d98-e0f8-4b62-9593-df26b5534734' and md5(b.row_data->>'method') = '502b11cbb80b21c000ad39a8b819c978';
  if n <> 1 then raise exception 'GATE 5 before-images: % of 1 -- was the decision recorded first?', n; end if;
end
$gate$;

-- down
-- The hand fallback; public.reverse_decision() above is the first choice.
update public.skill_profiles
   set method = replace(method, E'\n\n' || $step$COMPANY RECORDS CHECK: compare your three pinned company records (company profile, offerings, consulting automation) with the Library's live public wording items and the newest KPI Library release. A mismatch is a difference in substance only: a number differs; a product, service or practice name differs; a claim contradicts; or the live text breaks one of the record's wording rules. Phrasing, length, order and synonyms are not mismatches. For each mismatch write one gap naming the record, its line and the live text, unless an open gap already names it or a correction records that the principal accepted it. When a gap you filed no longer holds, say it is resolved. Never edit a record and never state it differently; the record wins until the principal changes it.$step$, ''), updated_at = now()
 where slug = 'sc-weekly-review-intent' and id = '95901d98-e0f8-4b62-9593-df26b5534734';
