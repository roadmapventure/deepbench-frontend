-- AGT-487 (v7.0.862) -- A TICKET'S OWN JOHN SOURCE IS CITABLE ON ITS OWN ROW.
--
-- THE DEFECT, measured live 2026-10-18 before the apply (kickoff §2). `tooling` holds exactly two
-- open/partial tickets. AGT-237 carries `need_source = john:runner_decisions:2c38d860-9cf8-40d9-8c05
-- -86e806c32d9c`, `need_score 5`; that `runner_decisions` row reads `kind = 'scope'`, `reversed_at`
-- null -- John's own scope decision, not a `john-ruling`. `CANDIDATE_FILTER` hands the list turn only
-- `kind = eq.john-ruling & reversed_at = is.null`, so the key AGT-237 already carries was never in
-- the candidate pool, and `validateListVerdict()` refused BOTH answers left for that ticket: the
-- membership rule (a pass must name a candidate it was handed) and AGT-432's echo rule (a `john:`
-- source is echoed, never replaced). A refusal sends NOTHING, so one unanswerable ticket failed the
-- whole list -- 2026-10-12 and 2026-10-13, no write either day. AGT-304, whose `john:` key IS a
-- `john-ruling`, passed on both days and is the control half of every arm of the guard.
--
-- WHAT THIS MIGRATION SHIPS. DATA only (pattern:2), one row, one UPDATE: the `skill_profiles` row
-- `vc-reorganize-intent` gains the step `3a. A TICKET'S OWN SOURCE IS ALWAYS CITABLE`, so the agent
-- reading it echoes a source the ticket already carries instead of turning the ticket down for want
-- of a candidate. There is NO DDL here and no function: the two halves of the mechanism itself are
-- `scripts/requirement-check.js` (the head travels on the proposal; the validator accepts the held
-- key), and this row is the instruction that tells her to use it.
--
-- THE DESIGNER'S CALL (JOHN-0925-DESIGNER-DECIDES, reversible, argued in docs/harvests/AGT-487.md):
-- the held source travels PER PROPOSAL, on its own row's head, and an ECHO of it is accepted. It is
-- NEVER appended to the shared `candidates` pool -- that would let ANY ticket cite a non-ruling
-- decision and would weaken AGT-432's rule without John's words (pattern:166). The exemption is for
-- one row on one ticket; every other value she could name is still a candidate she was handed.
--
-- WHY THE BEFORE-IMAGE IS THIS MIGRATION'S DOWN. `public.capture_migration_down()` RAISES on an empty
-- object array and this migration creates no object at all, so there is nothing for it to capture.
-- The undo is the pair below, taken BEFORE the UPDATE and in this order: one `record_decision` of
-- kind `agent-row` under AGT-487, then a FULL-ROW `runner_before_images` insert carrying
-- `to_jsonb(sp)` under that decision's id, with `cycle_id` set and `session_name` NULL -- never both.
-- `select * from public.reverse_decision('<handle>', 'John', '<why>');` puts the row back whole.
--
-- THE GATE. The trailing `do $gate$` RAISEs unless the row now holds
-- `A TICKET'S OWN SOURCE IS ALWAYS CITABLE` EXACTLY ONCE (once, not "contains": a second apply of
-- this patch would read as a pass on a `.includes()` check), still holds `0. FIT BEFORE GRADE`
-- (AGT-486's step, which this one must not have disturbed), carries `traits` byte-identical to the
-- before-image's own copy of it, and is covered by exactly one `runner_before_images` row naming
-- `skill_profiles` under this cycle. A migration's success flag proves nothing
-- (.claude/rules/supabase-column-grants.md).

do $$
declare
  d uuid;
  v_row_id uuid;
  v_step text;
begin
  select sp.id into v_row_id
  from public.skill_profiles sp where sp.slug = 'vc-reorganize-intent';
  if v_row_id is null then
    raise exception 'AGT-487: no skill_profiles row reads slug vc-reorganize-intent';
  end if;

  -- The DOWN, first and in this order: the decision, then the full-row image under it.
  d := public.record_decision(
    '5f505885-0b0f-439c-99f8-1b6b227e0b32', NULL, 'agent-row', 'AGT-487',
    $sum$vc-reorganize-intent gains step 3a: a ticket's own held need_source is citable on its own row$sum$,
    $why$AGT-487, JOHN-0925-DESIGNER-DECIDES (reversible): AGT-237 held john:runner_decisions:2c38d860-9cf8-40d9-8c05-86e806c32d9c, a kind=scope decision CANDIDATE_FILTER never hands over, so the tooling list was refused whole on 2026-10-12 and 10-13. The held source is accepted PER TICKET and is never added to the shared candidate pool, which stays John's unreversed rulings (pattern:166, pattern:2).$why$);

  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  select '5f505885-0b0f-439c-99f8-1b6b227e0b32', NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), d
  from public.skill_profiles sp where sp.slug = 'vc-reorganize-intent';

  -- THE ONE EDIT. The paragraph is the kickoff §4's own text, verbatim, appended after a blank line.
  v_step := E'\n\n' || $step$3a. A TICKET'S OWN SOURCE IS ALWAYS CITABLE. A ticket already carrying a need_source is handed that key on the ticket itself, with the first 200 characters of the row behind it as need_source_head, whether or not it also appears in the candidate list. A john: key was John naming the ticket: echo it back exactly as given and score it -- never replace it, and never turn a ticket down for want of a candidate when it already carries one.$step$;

  update public.skill_profiles
  set method = method || v_step, updated_at = now()
  where slug = 'vc-reorganize-intent';

  raise notice 'AGT-487: decision % , before-image row % , step appended (% chars)', d, v_row_id, length(v_step);
end $$;

do $gate$
declare
  v_method text;
  v_hits integer;
  v_fit integer;
  v_images integer;
  v_traits_now jsonb;
  v_traits_img jsonb;
begin
  select sp.method, sp.traits into v_method, v_traits_now
  from public.skill_profiles sp where sp.slug = 'vc-reorganize-intent';

  v_hits := (length(v_method) - length(replace(v_method, 'A TICKET''S OWN SOURCE IS ALWAYS CITABLE', ''))) / length('A TICKET''S OWN SOURCE IS ALWAYS CITABLE');
  if v_hits <> 1 then
    raise exception 'AGT-487 gate: method must hold A TICKET''S OWN SOURCE IS ALWAYS CITABLE exactly once; holds % time(s)', v_hits;
  end if;

  v_fit := (length(v_method) - length(replace(v_method, '0. FIT BEFORE GRADE', ''))) / length('0. FIT BEFORE GRADE');
  if v_fit <> 1 then
    raise exception 'AGT-487 gate: AGT-486''s step 0. FIT BEFORE GRADE must still stand exactly once; holds % time(s)', v_fit;
  end if;

  select (i.row_data -> 'traits') into v_traits_img
  from public.runner_before_images i
  where i.cycle_id = '5f505885-0b0f-439c-99f8-1b6b227e0b32' and i.table_name = 'skill_profiles'
  order by i.created_at desc limit 1;
  if v_traits_img is null or v_traits_img::text <> v_traits_now::text then
    raise exception 'AGT-487 gate: traits must be byte-identical to the before-image''s copy; before % after %',
      left(coalesce(v_traits_img::text, '<none>'), 80), left(v_traits_now::text, 80);
  end if;

  select count(*) into v_images from public.runner_before_images i
  where i.cycle_id = '5f505885-0b0f-439c-99f8-1b6b227e0b32' and i.table_name = 'skill_profiles';
  if v_images <> 1 then
    raise exception 'AGT-487 gate: exactly ONE runner_before_images row names skill_profiles under this cycle; found %', v_images;
  end if;

  raise notice 'AGT-487 gate: method % chars, new step once, 0. FIT BEFORE GRADE once, traits unchanged, % before-image row', length(v_method), v_images;
end $gate$;
