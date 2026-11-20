-- AGT-318 (v7.0.1072) -- THE MEMORY REVIEW GETS A CHECK IT CAN FAIL.
--
-- THE DEFECT, measured live 2026-11-20 on the unchanged tree (kickoff section 2). The weekly
-- Auditor reads John's Claude memory through the `claude-config` git mirror, and two rows carry the
-- checks it judges that corpus against: `au-behavior` (the approved checklist, 27 named check lines)
-- and `au-config-intent` (the config review's own four full-review checks). NEITHER names a
-- memory-against-memory check. So two memory files stating one fact twice, or stating opposite
-- facts, had no check_slug to fail: the finding was not rare, it was unnameable.
--
-- WHAT THIS MIGRATION SHIPS. DATA only (pattern:2, pattern:8), two rows, one UPDATE each, no DDL:
-- the checklist gains one line and the config intent names the check in its prose. The code half
-- (the mirror's age, and the reservation that lets a memory-only cluster reach a task file at all)
-- ships in the same commit as scripts/audit-corpus.js, scripts/audit-cluster.js and
-- docs/runbooks/auditor-routine.md -- one change, every home, one ship (pattern:163):
--   47e8bc5a-8b0b-49aa-b4bf-2a386d94ea0b  au-behavior        (the approved checklist, 27 -> 28)
--   5b7a12d1-783c-43cb-a754-dad843f436cf  au-config-intent   (four -> five full-review checks)
-- The new slug is ONE slug, `config-memory-vs-memory`, and `kind` splits duplicate from
-- contradiction rather than a second slug doing it (designer's call D5, kickoff section 2).
--
-- WHY THE BEFORE-IMAGES ARE THIS MIGRATION'S DOWN. public.capture_migration_down() RAISES on an
-- empty object array, and this migration creates and changes NO database object -- no table, no
-- view, no function. So there is nothing for it to capture and the undo is the pair below, taken
-- BEFORE each UPDATE and in this order: one public.record_decision() of kind `agent-row` under
-- AGT-318, then a FULL-ROW public.runner_before_images insert carrying to_jsonb(sp) under that
-- decision's id, cycle_id set and session_name NULL -- never both. Two rows, two decisions, two
-- images, two independent undos: `select * from public.reverse_decision('<decision id>', 'John',
-- '<why>');` puts either row back whole. Same shape as AGT-424 (v7.0.887).
--
-- No function is created or changed here, so .claude/rules/supabase-column-grants.md's EXECUTE
-- revoke (PUBLIC, anon, authenticated by name) has no subject in this migration.
--
-- THE GATE. The trailing `do $gate$` RAISEs unless each of the four replacement strings now sits in
-- its own column EXACTLY ONCE (once, not "contains": a second apply would read as a pass on an
-- .includes() check), under exactly two AGT-318 `agent-row` decisions carrying exactly two
-- skill_profiles before-images for this cycle. A migration's success flag proves nothing
-- (.claude/rules/supabase-column-grants.md).
--
-- WHY THE GATE DOES NOT ASSERT THE FROM-STRINGS ARE GONE, which is where this differs from
-- AGT-424's otherwise identical shape. Three of the four replacements consume their from-string,
-- but the checklist edit DOES NOT: `Example: both DeepBench repos are public.` is replaced by
-- ITSELF plus a newline and the new check line, so that from-string is still there once afterwards,
-- on purpose. A from-string count is therefore not the re-apply guard here -- the to-string count
-- is, in both directions: each pre-check below refuses unless its from-string sits exactly once AND
-- its to-string sits zero times, so a second apply stops at the first row instead of appending the
-- check line twice, and the gate would catch it even if it did not.

do $$
declare
  c_cycle   constant uuid := '4f03b4bc-8171-45ea-b36c-21f5f1391b91';
  c_beh     constant uuid := '47e8bc5a-8b0b-49aa-b4bf-2a386d94ea0b';
  c_cfg     constant uuid := '5b7a12d1-783c-43cb-a754-dad843f436cf';

  -- au-behavior: the spelled count in the objective, and the new check line in the checklist.
  -- agt-102's arm F derives the count from the row itself, so BOTH halves move in this one UPDATE
  -- or the row contradicts itself: `twenty-eight named checks` over 28 check lines.
  k_obj_f   constant text := $f1$twenty-seven named checks$f1$;
  k_obj_t   constant text := $t1$twenty-eight named checks$t1$;
  k_beh_f   constant text := $f2$Example: both DeepBench repos are public.$f2$;
  k_check   constant text := $ck$config-memory-vs-memory — two Claude memory files state one fact twice or state opposite facts. Example: none recorded yet.$ck$;
  k_beh_t   text;

  -- au-config-intent: the count of full-review checks, and the check itself inside the list the
  -- sentence enumerates, ahead of `Every finding:`.
  k_cf1_f   constant text := $f3$the four full-review checks$f3$;
  k_cf1_t   constant text := $t3$the five full-review checks$t3$;
  k_cf2_f   constant text := $f4$never a finding). Every finding:$f4$;
  k_cf2_t   constant text := $t4$never a finding), config-memory-vs-memory (two files under claude-config:memory/ state one fact twice or state opposite facts; quote both). Every finding:$t4$;

  v_slug    text;
  v_obj     text;
  v_method  text;
  d         uuid;
begin
  k_beh_t := k_beh_f || E'\n' || k_check;

  -- ============================ au-behavior =====================================================
  select sp.slug, sp.objective, sp.method into v_slug, v_obj, v_method
  from public.skill_profiles sp where sp.id = c_beh;
  if v_slug is null then
    raise exception 'AGT-318: no skill_profiles row reads id %', c_beh;
  end if;

  if (length(v_obj) - length(replace(v_obj, k_obj_f, ''))) / length(k_obj_f) <> 1 then
    raise exception 'AGT-318: %.objective must hold "%" exactly once; holds % time(s)',
      v_slug, k_obj_f, (length(v_obj) - length(replace(v_obj, k_obj_f, ''))) / length(k_obj_f);
  end if;
  if position(k_obj_t in v_obj) > 0 then
    raise exception 'AGT-318: %.objective already holds "%" -- already applied, nothing to do', v_slug, k_obj_t;
  end if;
  if (length(v_method) - length(replace(v_method, k_beh_f, ''))) / length(k_beh_f) <> 1 then
    raise exception 'AGT-318: %.method must hold "%" exactly once; holds % time(s)',
      v_slug, k_beh_f, (length(v_method) - length(replace(v_method, k_beh_f, ''))) / length(k_beh_f);
  end if;
  if position(k_check in v_method) > 0 then
    raise exception 'AGT-318: %.method already names config-memory-vs-memory -- already applied', v_slug;
  end if;

  -- The DOWN, first and in this order: the decision, then the full-row image under it.
  d := public.record_decision(
    c_cycle, NULL, 'agent-row', 'AGT-318',
    v_slug || ': the checklist names a memory-against-memory check (27 -> 28)',
    $why$AGT-318, JOHN-0925-DESIGNER-DECIDES (reversible): the weekly review reads John's Claude memory through the claude-config mirror, and this row's 27 named checks gave two memory files stating one fact twice -- or stating opposite facts -- no check_slug to fail, so the finding could not be named let alone filed. One new line, config-memory-vs-memory, and the objective's spelled count moves with it in the same UPDATE because agt-102 arm F derives the count from this row (pattern:162). One slug, with `kind` splitting duplicate from contradiction (designer's call D5). Narrowest layer that works: Supabase content, not the harness (pattern:8).$why$,
    public.ladder_work_class('P10 - Tooling'));

  insert into public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  select c_cycle, NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), d
  from public.skill_profiles sp where sp.id = c_beh;

  -- THE ONE EDIT per row: the kickoff section 4's own strings, nothing else touched.
  update public.skill_profiles
  set objective = replace(objective, k_obj_f, k_obj_t),
      method    = replace(method, k_beh_f, k_beh_t),
      updated_at = now()
  where id = c_beh;

  raise notice 'AGT-318: % (%) decision %, before-image taken, objective + checklist replaced', v_slug, c_beh, d;

  -- ============================ au-config-intent ================================================
  select sp.slug, sp.method into v_slug, v_method
  from public.skill_profiles sp where sp.id = c_cfg;
  if v_slug is null then
    raise exception 'AGT-318: no skill_profiles row reads id %', c_cfg;
  end if;

  if (length(v_method) - length(replace(v_method, k_cf1_f, ''))) / length(k_cf1_f) <> 1 then
    raise exception 'AGT-318: %.method must hold "%" exactly once; holds % time(s)',
      v_slug, k_cf1_f, (length(v_method) - length(replace(v_method, k_cf1_f, ''))) / length(k_cf1_f);
  end if;
  if position(k_cf1_t in v_method) > 0 then
    raise exception 'AGT-318: %.method already holds "%" -- already applied', v_slug, k_cf1_t;
  end if;
  if (length(v_method) - length(replace(v_method, k_cf2_f, ''))) / length(k_cf2_f) <> 1 then
    raise exception 'AGT-318: %.method must hold "%" exactly once; holds % time(s)',
      v_slug, k_cf2_f, (length(v_method) - length(replace(v_method, k_cf2_f, ''))) / length(k_cf2_f);
  end if;
  if position(k_cf2_t in v_method) > 0 then
    raise exception 'AGT-318: %.method already names config-memory-vs-memory -- already applied', v_slug;
  end if;

  d := public.record_decision(
    c_cycle, NULL, 'agent-row', 'AGT-318',
    v_slug || ': the config review judges five full-review checks, not four',
    $why$AGT-318, JOHN-0925-DESIGNER-DECIDES (reversible): this intent's method enumerates the full-review checks the config cluster is judged against, and config-memory-vs-memory was in neither the count nor the list -- the agent was told to judge four checks, so a memory-against-memory contradiction had nowhere to land however plainly the two statements disagreed. The sentence now names it with its own test (two files under claude-config:memory/ state one fact twice or state opposite facts; quote both), and the count moves with it. Both Auditor rows carry the same new check in one migration (pattern:163).$why$,
    public.ladder_work_class('P10 - Tooling'));

  insert into public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  select c_cycle, NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), d
  from public.skill_profiles sp where sp.id = c_cfg;

  update public.skill_profiles
  set method = replace(replace(method, k_cf1_f, k_cf1_t), k_cf2_f, k_cf2_t),
      updated_at = now()
  where id = c_cfg;

  raise notice 'AGT-318: % (%) decision %, before-image taken, both sentences replaced', v_slug, c_cfg, d;
end $$;

do $gate$
declare
  c_cycle   constant uuid := '4f03b4bc-8171-45ea-b36c-21f5f1391b91';
  c_beh     constant uuid := '47e8bc5a-8b0b-49aa-b4bf-2a386d94ea0b';
  c_cfg     constant uuid := '5b7a12d1-783c-43cb-a754-dad843f436cf';
  k_obj_t   constant text := $t1$twenty-eight named checks$t1$;
  k_check   constant text := $ck$config-memory-vs-memory — two Claude memory files state one fact twice or state opposite facts. Example: none recorded yet.$ck$;
  k_cf1_t   constant text := $t3$the five full-review checks$t3$;
  k_cf2_t   constant text := $t4$never a finding), config-memory-vs-memory (two files under claude-config:memory/ state one fact twice or state opposite facts; quote both). Every finding:$t4$;
  v_obj     text;
  v_beh_m   text;
  v_cfg_m   text;
  v_decs    integer;
  v_images  integer;
begin
  select sp.objective, sp.method into v_obj, v_beh_m
  from public.skill_profiles sp where sp.id = c_beh;
  select sp.method into v_cfg_m
  from public.skill_profiles sp where sp.id = c_cfg;
  if v_obj is null or v_cfg_m is null then
    raise exception 'AGT-318 gate: both skill_profiles rows must exist and be readable';
  end if;

  if (length(v_obj) - length(replace(v_obj, k_obj_t, ''))) / length(k_obj_t) <> 1 then
    raise exception 'AGT-318 gate: au-behavior.objective must hold the new count exactly once; holds %',
      (length(v_obj) - length(replace(v_obj, k_obj_t, ''))) / length(k_obj_t);
  end if;
  if (length(v_beh_m) - length(replace(v_beh_m, k_check, ''))) / length(k_check) <> 1 then
    raise exception 'AGT-318 gate: au-behavior.method must hold the new check line exactly once; holds %',
      (length(v_beh_m) - length(replace(v_beh_m, k_check, ''))) / length(k_check);
  end if;
  if (length(v_cfg_m) - length(replace(v_cfg_m, k_cf1_t, ''))) / length(k_cf1_t) <> 1 then
    raise exception 'AGT-318 gate: au-config-intent.method must hold "five full-review checks" exactly once; holds %',
      (length(v_cfg_m) - length(replace(v_cfg_m, k_cf1_t, ''))) / length(k_cf1_t);
  end if;
  if (length(v_cfg_m) - length(replace(v_cfg_m, k_cf2_t, ''))) / length(k_cf2_t) <> 1 then
    raise exception 'AGT-318 gate: au-config-intent.method must name the check in its list exactly once; holds %',
      (length(v_cfg_m) - length(replace(v_cfg_m, k_cf2_t, ''))) / length(k_cf2_t);
  end if;

  select count(*) into v_decs
  from public.runner_decisions d
  where d.cycle_id = c_cycle and d.kind = 'agent-row' and d.backlog_id = 'AGT-318';
  if v_decs <> 2 then
    raise exception 'AGT-318 gate: exactly TWO agent-row decisions under AGT-318 for this cycle; found %', v_decs;
  end if;

  select count(*) into v_images
  from public.runner_before_images i
  join public.runner_decisions d on d.id = i.decision_id
  where i.cycle_id = c_cycle and i.table_name = 'skill_profiles'
    and d.kind = 'agent-row' and d.backlog_id = 'AGT-318'
    and i.pk_value = any(array[c_beh::text, c_cfg::text]);
  if v_images <> 2 then
    raise exception 'AGT-318 gate: exactly TWO skill_profiles before-images under those decisions; found %', v_images;
  end if;

  raise notice 'AGT318_OK: 4 replacement strings once each, % decisions, % before-images', v_decs, v_images;
end $gate$;
