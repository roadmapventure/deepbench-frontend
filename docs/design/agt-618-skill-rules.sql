-- DeepBench v7.0.999 | docs/design/agt-618-skill-rules.sql | AGT-618, migration `agt618_skill_rules`
-- THE REVIEW CARRIES JOHN'S NEED, AND THE WHOLE SYMPTOM.
--
-- THE DEFECT, measured live 2026-11-11 on the unchanged tree (kickoff section 2). Two holes in the
-- text that renders into every review and every kickoff turn:
--   (a) AGT-309 (v7.0.743) taught scripts/audit-review.js to ACCEPT `need_source` (who:table:id) and
--       `home` (an executing projects.slug) on a root-cause group and to print the
--       `next: requirement-check` line from them, and runner_settings.need_source_kinds already
--       admits john:runner_directives and john:runner_decisions -- but `need_source` occurs ZERO
--       times in public.skill_profiles.method for ga-review-intent (84c096ec, 12,838 chars) and
--       ds-kickoff-intent (3203e5c9, 1,848 chars), and ga-review-intent's `traits` schema offers the
--       reviewing model neither key. So no review carries either, every ticket lands in
--       dev-mgr-findings (a `planned`, capture-only project), and AGT-280's requirement gate is
--       right to refuse a placement that cites no traceable need. The mechanism exists; only the
--       Skill text fails to invoke it.
--   (b) Nothing in either row requires that every occurrence of a stated symptom be accounted for.
--       `symptom` occurs ZERO times in either method. The cycle that acted on directive e6eeed58
--       found the meter-reader cause, closed the directive carded, and left the CI reds -- 69 of the
--       last 100 failed runs -- unexplained and unticketed, with a setting for John to change.
--
-- WHAT THIS MIGRATION SHIPS. DATA only (pattern:2, pattern:8), two rows, one UPDATE each, NO DDL --
-- no table, no view, no function is created or changed here. The two paragraphs are the kickoff
-- section 4's own text, verbatim, APPENDED (two newlines) rather than replacing any sentence:
--   84c096ec-0c5a-41a7-abef-e51ee440a4d9  ga-review-intent   -- N then E, and the two traits keys
--   3203e5c9-8804-4fc1-82a7-c47577b4bb75  ds-kickoff-intent  -- E alone
-- N is the Architect's own filing rule and has no subject in the Designer's kickoff turn, so it
-- lands in ONE row; E governs both turns, so one migration carries it to every home it has
-- (pattern:163). No other skill row is touched (kickoff section 7).
--
-- WHY THE BEFORE-IMAGES ARE THIS MIGRATION'S DOWN, and not capture_migration_down().
-- public.capture_migration_down() RAISES on an empty object array -- asserted against the live
-- function body this cycle: `if p_objects is null or jsonb_typeof(p_objects) <> 'array' or
-- jsonb_array_length(p_objects) = 0 then raise exception` -- and this migration creates and changes
-- no database object, so it has nothing to capture. The undo is the pair below, taken BEFORE each
-- UPDATE and in this order: one public.record_decision() of kind `agent-row` under AGT-618, then a
-- FULL-ROW public.runner_before_images insert carrying to_jsonb(sp) under that decision's id, with
-- cycle_id set and session_name NULL -- never both. `pk_value` is the row's own uuid and
-- `skill_profiles` is in public.reversible_tables() (read live this cycle), so the promise below is
-- keepable (pattern:169): two rows, two decisions, two images, two INDEPENDENT undos --
-- `select * from public.reverse_decision('<decision id>', 'John', '<why>');` puts either row back
-- whole, and reversing one leaves the other standing. Same shape as AGT-424 (v7.0.887), which
-- edited this same ga-review-intent method row once before.
--
-- AGENT-ROW-AGREED-TICKET: AGT-618 is an agreed, designed ticket whose own text names these two
-- edits, so they are BUILD work with a before-image -- not a card for John to decide.
--
-- No function is created or changed here, so .claude/rules/supabase-column-grants.md's EXECUTE
-- revoke (PUBLIC, anon, authenticated by name) has no subject in this migration.
--
-- THE GATE. It stands at the foot of this file and asserts what shipped: N exactly ONCE in
-- ga-review-intent and ZERO times in ds-kickoff-intent, E exactly ONCE in EACH, both edits
-- APPEND-ONLY against their own before-images, ga-review-intent's traits offering both
-- `need_source` and `home` at {schema,properties,groups,items,properties}, and exactly two AGT-618
-- `agent-row` decisions of this cycle carrying exactly two skill_profiles before-images. Exactly
-- once, never "contains": a second apply would read as a pass on an .includes() check. A
-- migration's own success flag proves nothing (.claude/rules/supabase-column-grants.md) -- which is
-- why every one of those facts was ALSO re-read live, from outside the migration, after it applied.
--
-- ONE DIFFERENCE BETWEEN THE APPLIED TEXT AND THIS FILE, stated so nobody diffing the two is
-- misled. `agt618_skill_rules` applied 2026-11-11 from this file; the gate block as applied carried
-- a second full copy of each paragraph as its own constants, and the gate block below names them by
-- heading plus E's closing sentence instead, adding the append-only check against each
-- before-image. The asserted facts are the same (and strictly stronger with the append check); the
-- reason for the change is that each paragraph must be stated EXACTLY ONCE in this file so the
-- shipped text and the checked text cannot drift, which is the property
-- tests/regression/agt-618-skill-rules.test.mjs part A pins. The edit blocks are byte-identical.

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

-- THE GATE. It names the two paragraphs by their HEADING and by E's closing sentence rather than
-- restating either in full, for one reason: each paragraph is stated EXACTLY ONCE in this file (the
-- `c_n` / `c_e` constants above), so the text that ships and the text a reader checks can never
-- drift apart, and tests/regression/agt-618-skill-rules.test.mjs asserts that one-occurrence
-- property statically. A heading count alone would pass a truncated paragraph, so the gate adds the
-- two assertions that close that hole: each method must START WITH its own before-image's method
-- byte-for-byte (nothing was replaced or lost -- this edit is an APPEND) and END WITH E's last
-- sentence. Together: nothing removed, nothing duplicated, nothing cut short.
do $gate$
declare
  c_cycle  constant uuid := '9b120fd4-7a07-4fed-979a-cbafde6c9a2b';
  c_ga     constant uuid := '84c096ec-0c5a-41a7-abef-e51ee440a4d9';
  c_ds     constant uuid := '3203e5c9-8804-4fc1-82a7-c47577b4bb75';
  c_n_head constant text := 'THE NEED SOURCE AND THE HOME (AGT-309, AGT-480, AGT-618).';
  c_e_head constant text := 'THE WHOLE SYMPTOM (AGT-618).';
  c_e_tail constant text := 'A chore for John is never a cause or a fix: a John chore is a platform gap.';
  c_path   constant text[] := array['schema', 'properties', 'groups', 'items', 'properties'];
  v_id     text;
  v_slug   text;
  v_m      text;
  v_before text;
  v_n      integer;
  v_e      integer;
  v_keys   integer;
  v_decs   integer;
  v_imgs   integer;
begin
  foreach v_id in array array[c_ga::text, c_ds::text] loop
    select sp.slug, sp.method into v_slug, v_m
    from public.skill_profiles sp where sp.id = v_id::uuid;
    if v_slug is null then
      raise exception 'AGT-618 gate: skill_profiles row % is missing', v_id;
    end if;

    v_n := (length(v_m) - length(replace(v_m, c_n_head, ''))) / length(c_n_head);
    v_e := (length(v_m) - length(replace(v_m, c_e_head, ''))) / length(c_e_head);

    -- N is the ARCHITECT's filing rule and has no subject in a kickoff turn. A copy in the
    -- Designer's row would be a widened edit, not a harmless extra, so its ABSENCE there is
    -- asserted as hard as its presence in the Architect's row.
    if v_id = c_ga::text then
      if v_n <> 1 then
        raise exception 'AGT-618 gate: N must sit exactly once in %; sits % time(s)', v_slug, v_n;
      end if;
    elsif v_n <> 0 then
      raise exception 'AGT-618 gate: N must NOT appear in %; sits % time(s)', v_slug, v_n;
    end if;

    if v_e <> 1 then
      raise exception 'AGT-618 gate: E must sit exactly once in %; sits % time(s)', v_slug, v_e;
    end if;

    -- APPEND-ONLY, PROVEN AGAINST THIS MIGRATION'S OWN DOWN: the row's before-image is the text
    -- that stood a moment ago, so a method that does not start with it has lost or rewritten
    -- something no heading count would notice.
    select i.row_data->>'method' into v_before
    from public.runner_before_images i
    join public.runner_decisions d on d.id = i.decision_id
    where i.cycle_id = c_cycle and i.table_name = 'skill_profiles' and i.pk_value = v_id
      and d.kind = 'agent-row' and d.backlog_id = 'AGT-618';
    if v_before is null then
      raise exception 'AGT-618 gate: no before-image for % -- the undo is missing', v_slug;
    end if;
    if left(v_m, length(v_before)) <> v_before then
      raise exception 'AGT-618 gate: %''s method no longer starts with its before-image -- this edit must APPEND, never replace', v_slug;
    end if;
    if right(v_m, length(c_e_tail)) <> c_e_tail then
      raise exception 'AGT-618 gate: %''s method must END with E''s closing sentence; a cut-short paragraph is not the rule', v_slug;
    end if;
  end loop;

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

  raise notice 'AGT618_OK: N 1/0 (ga/ds), E 1/1, append-only against both before-images, traits need_source + home present, % decisions, % before-images',
    v_decs, v_imgs;
end $gate$;
