-- DeepBench v7.0.1082 | docs/design/agt-618-skill-rules.sql | AGT-618, migration `agt618_skill_rules`
-- THE REVIEW CARRIES JOHN'S NEED, AND THE WHOLE SYMPTOM.
--
-- APPLIED as `agt618_skill_rules` (20261111081308) through apply_migration; this file is its text.
-- Decisions 2b0a3fae-0909-4635-a728-40164ea68786 (ga-review-intent) and
-- 74f0f0cf-e582-47ec-9886-afe81939e2b3 (ds-kickoff-intent) carry the two full-row before-images.
--
-- WHY THE BEFORE-IMAGES ARE THIS MIGRATION'S DOWN, and not capture_migration_down().
-- public.capture_migration_down() RAISES on an empty object array -- asserted against the live
-- function body this cycle: `if p_objects is null or jsonb_typeof(p_objects) <> 'array' or
-- jsonb_array_length(p_objects) = 0 then raise exception` -- and this migration creates and changes
-- NO database object (no table, no view, no function), so it has nothing to capture. The undo is
-- the pair below, taken BEFORE each UPDATE and in this order: one public.record_decision() of kind
-- `agent-row` under AGT-618, then a FULL-ROW public.runner_before_images insert carrying
-- to_jsonb(sp) under that decision's id, cycle_id set and session_name NULL -- never both.
-- `pk_value` is the row's own uuid and `skill_profiles` is in public.reversible_tables() (read live
-- this cycle), so the promise is keepable (pattern:169): two rows, two decisions, two images, two
-- INDEPENDENT undos -- `select * from public.reverse_decision('<decision id>', 'John', '<why>');`
-- puts either row back whole. Same shape as AGT-424 (v7.0.887).
--
-- AGENT-ROW-AGREED-TICKET: AGT-618 is an agreed, designed ticket whose own text names these two
-- edits, so they are BUILD work with a before-image -- not a card for John to decide.
--
-- THE GATE. The trailing `do $gate$` RAISEs unless N sits EXACTLY ONCE in ga-review-intent and ZERO
-- times in ds-kickoff-intent, E sits EXACTLY ONCE in EACH, ga-review-intent's traits now offer both
-- `need_source` and `home` at {schema,properties,groups,items,properties}, and exactly two AGT-618
-- `agent-row` decisions of this cycle carry exactly two skill_profiles before-images. Exactly once,
-- never "contains": a second apply would read as a pass on an .includes() check. A migration's own
-- success flag proves nothing (.claude/rules/supabase-column-grants.md).

do $$
declare
  c_cycle constant uuid := '9b120fd4-7a07-4fed-979a-cbafde6c9a2b';
  c_ga    constant uuid := '84c096ec-0c5a-41a7-abef-e51ee440a4d9';
  c_ds    constant uuid := '3203e5c9-8804-4fc1-82a7-c47577b4bb75';
  c_n     constant text := $n$THE NEED SOURCE AND THE HOME (AGT-309, AGT-480, AGT-618). When a root-cause group's findings trace to a statement of John's -- a runner_directives or runner_decisions row, or any pair in runner_settings.need_source_kinds -- put two keys on the group, filing or reuse alike: need_source, the who:table:id of the row you read, and home, an executing project's slug from task_context.projects. Both or neither, root-cause only. They move nothing; --apply prints one next: requirement-check line per such group, the ticket's way to the build queue without John. Never cite an id you did not read.$n$;
  c_e     constant text := $e$THE WHOLE SYMPTOM (AGT-618). When the work starts from a stated symptom -- John's problem statement, a failing check, a count -- enumerate EVERY occurrence in the window with a read-only query before naming a cause. Each occurrence gets a reproduced cause; the per-cause counts add up to the total, and any remainder is written as unexplained with its count. Real or expected, without reading why, is unexplained. Search the board once per cause and reuse the open ticket that covers it. A chore for John is never a cause or a fix: a John chore is a platform gap.$e$;
  c_path  constant text[] := array['schema', 'properties', 'groups', 'items', 'properties'];
  v_id    text;
  v_slug  text;
  v_m     text;
  v_t     jsonb;
  d       uuid;
begin
  -- THE STOP LINE (kickoff section 7): N or E already in a row is not an idempotent re-apply, it is
  -- a row somebody else edited, and this migration refuses to append a second copy to it.
  foreach v_id in array array[c_ga::text, c_ds::text] loop
    select sp.slug, sp.method into v_slug, v_m
    from public.skill_profiles sp where sp.id = v_id::uuid;
    if v_slug is null then
      raise exception 'AGT-618: no skill_profiles row reads id %', v_id;
    end if;
    if position(c_n in v_m) > 0 then
      raise exception 'AGT-618: row % already holds THE NEED SOURCE AND THE HOME -- refusing to append a second copy', v_slug;
    end if;
    if position(c_e in v_m) > 0 then
      raise exception 'AGT-618: row % already holds THE WHOLE SYMPTOM -- refusing to append a second copy', v_slug;
    end if;
  end loop;

  -- ---- ga-review-intent: both paragraphs, and the two keys the Architect must be able to fill ----
  d := public.record_decision(
    c_cycle, NULL, 'agent-row', 'AGT-618',
    'ga-review-intent: the review carries John''s need source and the whole symptom',
    $why$AGT-618 (agreed, designed): scripts/audit-review.js has accepted need_source and home on a root-cause group since AGT-309 and prints the `next: requirement-check` line from them, but `need_source` occurred 0 times in this method and its traits schema offered the model neither key -- so every ticket landed in dev-mgr-findings (planned, capture-only) with no path to an executing project, and AGT-280's gate refused the placement for want of a traceable need. `symptom` occurred 0 times as well: the cycle on directive e6eeed58 named one of five causes and left 69 of 100 failed runs unexplained. Two paragraphs appended, and the two keys added to the group schema. Narrowest layer that works -- Supabase content, not the harness (pattern:8); the whole-symptom rule lands in every home it has (pattern:163); the rule lives in the agent's own Skill, not the loop (pattern:7).$why$,
    public.ladder_work_class('P10 - Tooling'));

  insert into public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  select c_cycle, NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), d
  from public.skill_profiles sp where sp.id = c_ga;

  select sp.traits into v_t from public.skill_profiles sp where sp.id = c_ga;
  if v_t #> c_path is null or jsonb_typeof(v_t #> c_path) <> 'object' then
    raise exception 'AGT-618: ga-review-intent traits has no object at {schema,properties,groups,items,properties} -- refusing to invent the path';
  end if;

  update public.skill_profiles
  set method = method || E'\n\n' || c_n || E'\n\n' || c_e,
      traits = jsonb_set(
        jsonb_set(traits, c_path || array['need_source'],
          '{"type":"string","pattern":"^[a-z]+:[a-z_]+:[^:]+$","maxLength":160}'::jsonb, true),
        c_path || array['home'],
        '{"type":"string","pattern":"^[a-z0-9-]+$","maxLength":60}'::jsonb, true),
      updated_at = now()
  where id = c_ga;

  raise notice 'AGT-618: ga-review-intent decision %, before-image taken, N + E appended, traits gained need_source + home', d;

  -- ---- ds-kickoff-intent: the whole-symptom rule alone ----
  d := public.record_decision(
    c_cycle, NULL, 'agent-row', 'AGT-618',
    'ds-kickoff-intent: the kickoff explains the whole symptom',
    $why$AGT-618 (agreed, designed): `symptom` occurred 0 times in this method, so the Designer's premise check required no completeness over a stated symptom -- the POC measured the Architect and the Designer each finding 1 of 5 causes (28 of 87 failed runs), calling the other reds real, and handing John a setting to change. THE WHOLE SYMPTOM is appended verbatim; John's own ruling rides in it (a John chore is a platform gap). N is the Architect's filing rule and has no subject in a kickoff turn, so this row does not take it. One change, every home it has, one ship (pattern:163).$why$,
    public.ladder_work_class('P10 - Tooling'));

  insert into public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  select c_cycle, NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), d
  from public.skill_profiles sp where sp.id = c_ds;

  update public.skill_profiles
  set method = method || E'\n\n' || c_e, updated_at = now()
  where id = c_ds;

  raise notice 'AGT-618: ds-kickoff-intent decision %, before-image taken, E appended', d;
end $$;

do $gate$
declare
  c_cycle constant uuid := '9b120fd4-7a07-4fed-979a-cbafde6c9a2b';
  c_ga    constant uuid := '84c096ec-0c5a-41a7-abef-e51ee440a4d9';
  c_ds    constant uuid := '3203e5c9-8804-4fc1-82a7-c47577b4bb75';
  c_n     constant text := $n$THE NEED SOURCE AND THE HOME (AGT-309, AGT-480, AGT-618). When a root-cause group's findings trace to a statement of John's -- a runner_directives or runner_decisions row, or any pair in runner_settings.need_source_kinds -- put two keys on the group, filing or reuse alike: need_source, the who:table:id of the row you read, and home, an executing project's slug from task_context.projects. Both or neither, root-cause only. They move nothing; --apply prints one next: requirement-check line per such group, the ticket's way to the build queue without John. Never cite an id you did not read.$n$;
  c_e     constant text := $e$THE WHOLE SYMPTOM (AGT-618). When the work starts from a stated symptom -- John's problem statement, a failing check, a count -- enumerate EVERY occurrence in the window with a read-only query before naming a cause. Each occurrence gets a reproduced cause; the per-cause counts add up to the total, and any remainder is written as unexplained with its count. Real or expected, without reading why, is unexplained. Search the board once per cause and reuse the open ticket that covers it. A chore for John is never a cause or a fix: a John chore is a platform gap.$e$;
  c_path  constant text[] := array['schema', 'properties', 'groups', 'items', 'properties'];
  v_ga_n  integer;
  v_ga_e  integer;
  v_ds_n  integer;
  v_ds_e  integer;
  v_keys  integer;
  v_decs  integer;
  v_imgs  integer;
begin
  select (length(sp.method) - length(replace(sp.method, c_n, ''))) / length(c_n),
         (length(sp.method) - length(replace(sp.method, c_e, ''))) / length(c_e)
    into v_ga_n, v_ga_e
  from public.skill_profiles sp where sp.id = c_ga;
  if v_ga_n is null then
    raise exception 'AGT-618 gate: ga-review-intent row is missing';
  end if;
  if v_ga_n <> 1 then
    raise exception 'AGT-618 gate: N must sit exactly once in ga-review-intent; sits % time(s)', v_ga_n;
  end if;
  if v_ga_e <> 1 then
    raise exception 'AGT-618 gate: E must sit exactly once in ga-review-intent; sits % time(s)', v_ga_e;
  end if;

  select (length(sp.method) - length(replace(sp.method, c_n, ''))) / length(c_n),
         (length(sp.method) - length(replace(sp.method, c_e, ''))) / length(c_e)
    into v_ds_n, v_ds_e
  from public.skill_profiles sp where sp.id = c_ds;
  if v_ds_e is null then
    raise exception 'AGT-618 gate: ds-kickoff-intent row is missing';
  end if;
  -- N is the Architect's filing rule. A copy in the Designer's row would be a widened edit, not a
  -- harmless extra, so the gate asserts its ABSENCE as hard as it asserts E's presence.
  if v_ds_n <> 0 then
    raise exception 'AGT-618 gate: N must NOT appear in ds-kickoff-intent; sits % time(s)', v_ds_n;
  end if;
  if v_ds_e <> 1 then
    raise exception 'AGT-618 gate: E must sit exactly once in ds-kickoff-intent; sits % time(s)', v_ds_e;
  end if;

  select count(*) into v_keys
  from public.skill_profiles sp
  where sp.id = c_ga
    and (sp.traits #> c_path) ? 'need_source'
    and (sp.traits #> c_path) ? 'home';
  if v_keys <> 1 then
    raise exception 'AGT-618 gate: ga-review-intent traits must offer BOTH need_source and home on a group; matched % row(s)', v_keys;
  end if;

  select count(*) into v_decs
  from public.runner_decisions d
  where d.cycle_id = c_cycle and d.kind = 'agent-row' and d.backlog_id = 'AGT-618';
  if v_decs <> 2 then
    raise exception 'AGT-618 gate: exactly TWO agent-row decisions under AGT-618 for this cycle; found %', v_decs;
  end if;

  select count(*) into v_imgs
  from public.runner_before_images i
  join public.runner_decisions d on d.id = i.decision_id
  where i.cycle_id = c_cycle and i.table_name = 'skill_profiles'
    and d.kind = 'agent-row' and d.backlog_id = 'AGT-618'
    and i.pk_value in (c_ga::text, c_ds::text);
  if v_imgs <> 2 then
    raise exception 'AGT-618 gate: exactly TWO skill_profiles before-images under those decisions; found %', v_imgs;
  end if;

  raise notice 'AGT618_OK: N 1/0 (ga/ds), E 1/1, traits need_source + home present, % decisions, % before-images',
    v_decs, v_imgs;
end $gate$;
