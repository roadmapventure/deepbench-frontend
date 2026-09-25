-- DeepBench v7.0.597 | docs/design/agt-152-reversible-model-assignments.sql | AGT-152 (P10 - Tooling)
-- A model switch undoes in one step, and a lane switch moves only the lane's own Skill rows.
--
-- DEFECT 1 (undo). reverse_decision() over an apply_model_assignment() switch restored the Skill
-- rows and REFUSED the model_assignments row: the table was not in k_allowed, and even widened it
-- would stay refused because its primary key was composite (job_kind, job_key) and the image was
-- written as pk_value = job_kind||'/'||job_key -- unaddressable by a one-column pk lookup.
-- Fix: a single uuid pk `id` (the pair keeps a unique constraint, so every ON CONFLICT and every
-- (job_kind, job_key) reader stands), images written as pk_value = id::text, and model_assignments
-- added to reversible_tables() and reverse_decision()'s k_allowed together.
--
-- DEFECT 2 (sync scope). model_assignments_sync_skills()'s lane branch moved every skill_profiles
-- row whose llm_model equalled the lane's old model -- including a capability's default Intent
-- Skill that a capability row had put on that same model. Fix: public.lane_member_skills(model),
-- the lane's members minus every default Intent Skill a capability row owns; the trigger and both
-- imaging functions read it, so what is imaged is exactly what moves (pattern 14).
--
-- TWO UPS because capture_migration_down() nulls the WHOLE down_sql when one object is refused:
--   Up 1 agt152a_model_assignments_pk     capture: refused, 0 captured, 1 refused (card-only --
--                                          an in-place ALTER TABLE is refused by design).
--   Up 2 agt152b_reversible_model_assignments  capture over the six function identities:
--                                          expect auto-downable, 6 captured, 0 refused.
--
-- The four existing function bodies are NOT retyped: Up 2 reads pg_get_functiondef() live and
-- swaps exactly the named substrings, raising unless each occurs exactly once (the kickoff's
-- "bodies from pg_get_functiondef LIVE, never retyped", made mechanical).

-- =====================================================================================
-- UP 1 -- agt152a_model_assignments_pk
-- =====================================================================================
alter table public.model_assignments add column id uuid not null default gen_random_uuid();
alter table public.model_assignments drop constraint model_assignments_pkey;
alter table public.model_assignments add constraint model_assignments_pkey primary key (id);
alter table public.model_assignments
  add constraint model_assignments_job_kind_job_key_key unique (job_kind, job_key);
-- END UP 1

-- =====================================================================================
-- UP 2 -- agt152b_reversible_model_assignments
-- =====================================================================================

-- a. The lane's own Skill rows: on the model, minus every default Intent Skill a capability row owns.
create or replace function public.lane_member_skills(p_model text)
returns setof public.skill_profiles
language sql
stable
set search_path = public
as $fn$
  select sp.*
    from public.skill_profiles sp
   where sp.llm_model = p_model
     and sp.slug not in (
       select c.default_intent_slug
         from public.capabilities c
         join public.model_assignments m on m.job_kind = 'capability' and m.job_key = c.slug
        where c.default_intent_slug is not null);
$fn$;
revoke all on function public.lane_member_skills(text) from public, anon, authenticated;
grant execute on function public.lane_member_skills(text) to service_role;

-- b-d. Live bodies, exact swaps.
create or replace function pg_temp.agt152_swap(p_def text, p_old text, p_new text, p_what text)
returns text language plpgsql as $sw$
declare n int;
begin
  n := (length(p_def) - length(replace(p_def, p_old, ''))) / length(p_old);
  if n <> 1 then
    raise exception 'AGT-152: % -- anchor occurs % times, expected exactly 1', p_what, n;
  end if;
  return replace(p_def, p_old, p_new);
end
$sw$;

do $edit$
declare v text;
begin
  -- b. model_assignments_sync_skills(): the lane branch moves lane members only.
  v := pg_get_functiondef('public.model_assignments_sync_skills()'::regprocedure);
  v := pg_temp.agt152_swap(v,
    $o$update public.skill_profiles set llm_model = new.model_id where llm_model = old.model_id;$o$,
    $n$update public.skill_profiles set llm_model = new.model_id where id in (select id from public.lane_member_skills(old.model_id));$n$,
    'sync_skills lane branch');
  execute v;

  -- c1. apply_model_assignment(): image pk = id; lane images = the rows the trigger moves.
  v := pg_get_functiondef('public.apply_model_assignment(jsonb,uuid,text)'::regprocedure);
  v := pg_temp.agt152_swap(v,
    $o$'model_assignments', v_kind || '/' || v_key, to_jsonb(v_row), v_dec);$o$,
    $n$'model_assignments', v_row.id::text, to_jsonb(v_row), v_dec);$n$,
    'apply_model_assignment model_assignments image');
  v := pg_temp.agt152_swap(v,
    $o$from public.skill_profiles sp where sp.llm_model = v_row.model_id;$o$,
    $n$from public.lane_member_skills(v_row.model_id) sp;$n$,
    'apply_model_assignment lane skill image');
  execute v;

  -- c2. review_model_watch(): the same two edits on the self-revert.
  v := pg_get_functiondef('public.review_model_watch(uuid,text)'::regprocedure);
  v := pg_temp.agt152_swap(v,
    $o$'model_assignments', m.job_kind || '/' || m.job_key, to_jsonb(m), v_dec$o$,
    $n$'model_assignments', m.id::text, to_jsonb(m), v_dec$n$,
    'review_model_watch model_assignments image');
  v := pg_temp.agt152_swap(v,
    $o$from public.skill_profiles sp where sp.llm_model = r.model_id;$o$,
    $n$from public.lane_member_skills(r.model_id) sp;$n$,
    'review_model_watch lane skill image');
  execute v;

  -- d2. reverse_decision(): one k_allowed element after 'audit_findings'.
  v := pg_get_functiondef('public.reverse_decision(uuid,text,text,uuid)'::regprocedure);
  v := pg_temp.agt152_swap(v,
    E'so only rulings restore.\n  ];',
    E'so only rulings restore.\n'
      || $n$    , 'model_assignments' -- IN: AGT-152 -- a job type's model (switch, self-revert); has updated_at; pk id since v7.0.597.$n$
      || E'\n  ];',
    'reverse_decision k_allowed tail');
  execute v;
end
$edit$;

-- d1. reversible_tables(): the fifteen in order, model_assignments last.
create or replace function public.reversible_tables()
returns text[]
language sql
immutable
as $function$
  select array[
    'backlog_items',
    'runner_directives',
    'runner_drain_scope',
    'runner_settings',
    'governance_rules',
    'epics',
    'vision_claims',
    'skill_profiles',
    'agents',
    'capabilities',
    'capability_skill_profiles',
    'agent_capability_assignments',
    'ai_activity_log',
    'runner_items',
    'audit_findings',
    'model_assignments'
  ]::text[];
$function$;

comment on function public.reversible_tables() is
  'SES-399: the tables reverse_decision() will actually replay. This list is the twin of reverse_decision(uuid,text,text,uuid)''s k_allowed and MUST equal it -- the migration ses399_attach_fails_closed asserts every element appears as a quoted literal in that function''s prosrc. Widen k_allowed (as SES-364 did) and you widen this in the same migration; drift here presents as a loud false refusal at attach time, never as a silent unbacked reversal promise. Read by attach_before_images(uuid, uuid[]). AGT-86 slice 1b added audit_findings so a ruling (the guard''s mutable band) is reversible. AGT-152 added model_assignments (pk id since v7.0.597): a model switch reverses in one step.';

-- e. Assert the shape and the grants; then the proof, rolled back by 'agt152-proof'.
do $proof$
declare
  k_cycle constant uuid := '70d9c161-5da8-49ef-8654-8bf0533efd8f';
  k_fns   constant text[] := array['lane_member_skills', 'model_assignments_sync_skills', 'apply_model_assignment',
                                   'review_model_watch', 'reversible_tables', 'reverse_decision'];
  k_sigs  constant text[] := array['public.lane_member_skills(text)', 'public.model_assignments_sync_skills()',
                                   'public.apply_model_assignment(jsonb,uuid,text)', 'public.review_model_watch(uuid,text)',
                                   'public.reversible_tables()', 'public.reverse_decision(uuid,text,text,uuid)'];
  k_callable constant text[] := array['public.apply_model_assignment(jsonb,uuid,text)', 'public.review_model_watch(uuid,text)',
                                      'public.reversible_tables()', 'public.reverse_decision(uuid,text,text,uuid)'];
  f       text;
  t       text;
  n       int;
  v_src   text;
  v_res   jsonb;
  v_dec   uuid;
  v_id    uuid;
  v_img   uuid;
  v_rev   record;
  v_row   record;
  pass3   jsonb := '[
    {"job_ref":"proof-1","run_at":"2026-09-25","baseline":{"passed":true,"verdict":"none","tokens":1000,"minutes":10},"candidate":{"passed":true,"verdict":"none","tokens":1050,"minutes":10}},
    {"job_ref":"proof-2","run_at":"2026-09-25","baseline":{"passed":true,"verdict":"none","tokens":1000,"minutes":10},"candidate":{"passed":true,"verdict":"none","tokens":1050,"minutes":10}},
    {"job_ref":"proof-3","run_at":"2026-09-25","baseline":{"passed":true,"verdict":"none","tokens":1000,"minutes":10},"candidate":{"passed":true,"verdict":"none","tokens":1050,"minutes":10}}]'::jsonb;
begin
  foreach f in array k_fns loop
    select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
     where s.nspname = 'public' and p.proname = f;
    if n <> 1 then raise exception 'AGT-152: % overloads of %, expected 1', n, f; end if;
  end loop;
  foreach f in array k_sigs loop
    if has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute') then
      raise exception 'AGT-152: % is executable by anon/authenticated', f;
    end if;
  end loop;
  foreach f in array k_callable loop
    if not has_function_privilege('service_role', f, 'execute') then
      raise exception 'AGT-152: service_role cannot execute %', f;
    end if;
  end loop;

  if cardinality(public.reversible_tables()) <> 16 or not ('model_assignments' = any(public.reversible_tables())) then
    raise exception 'AGT-152: reversible_tables() = %', public.reversible_tables();
  end if;
  select p.prosrc into v_src from pg_proc p where p.oid = 'public.reverse_decision(uuid,text,text,uuid)'::regprocedure;
  foreach t in array public.reversible_tables() loop
    if position(quote_literal(t) in v_src) = 0 then
      raise exception 'AGT-152: % is not a quoted literal in reverse_decision', t;
    end if;
  end loop;

  select count(*) into n from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
   where i.indrelid = 'public.model_assignments'::regclass and i.indisprimary;
  if n <> 1 or not exists (
       select 1 from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
        where i.indrelid = 'public.model_assignments'::regclass and i.indisprimary and a.attname = 'id') then
    raise exception 'AGT-152: model_assignments pk is not exactly id';
  end if;
  if not exists (select 1 from pg_constraint c where c.conrelid = 'public.model_assignments'::regclass
                  and c.contype = 'u' and pg_get_constraintdef(c.oid) = 'UNIQUE (job_kind, job_key)') then
    raise exception 'AGT-152: unique (job_kind, job_key) missing';
  end if;

  begin
    -- Scoping: data-room-custody puts library-evidence-intent on fable (fable = 55).
    update public.model_assignments set model_id = 'claude-fable-5-1'
     where job_kind = 'capability' and job_key = 'data-room-custody';
    select count(*) into n from public.skill_profiles where llm_model = 'claude-fable-5-1';
    if n <> 55 then raise exception 'AGT-152 setup: % fable rows, expected 55', n; end if;

    v_res := public.apply_model_assignment(jsonb_build_object('actions', jsonb_build_array(jsonb_build_object(
      'job_kind', 'lane', 'job_key', 'judgment', 'action', 'switch', 'to_model', 'claude-opus-5-5',
      'reason', 'agt152 proof', 'trial_evidence', pass3))), k_cycle, null);
    v_dec := (v_res -> 'actions' -> 0 ->> 'decision_id')::uuid;
    select id into v_id from public.model_assignments where job_kind = 'lane' and job_key = 'judgment';

    select count(*) into n from public.skill_profiles where llm_model = 'claude-opus-5-5';
    if n <> 54 then raise exception 'AGT-152 scope: % opus-5-5 rows, expected 54', n; end if;
    select count(*) into n from public.skill_profiles where slug = 'library-evidence-intent' and llm_model = 'claude-fable-5-1';
    if n <> 1 then raise exception 'AGT-152 scope: library-evidence-intent left fable'; end if;
    select count(*) into n from public.runner_before_images
     where decision_id = v_dec and table_name = 'model_assignments' and pk_value = v_id::text;
    if n <> 1 then raise exception 'AGT-152 scope: % model_assignments images at pk %, expected 1', n, v_id; end if;
    select count(*) into n from public.runner_before_images where decision_id = v_dec and table_name = 'skill_profiles';
    if n <> 54 then raise exception 'AGT-152 scope: % skill_profiles images, expected 54', n; end if;

    -- Undo in one step.
    select * into v_rev from public.reverse_decision(v_dec, 'agt152-proof', 'proof');
    if v_rev.outcome <> 'applied' or v_rev.restored <> 1 or v_rev.restored_unverified <> 54
       or v_rev.refused <> 0 or v_rev.refused_written_since <> 0 then
      raise exception 'AGT-152 undo: %', to_jsonb(v_rev);
    end if;
    select * into v_row from public.model_assignments where job_kind = 'lane' and job_key = 'judgment';
    if v_row.model_id <> 'claude-fable-5-1' or v_row.decision_id is not null or v_row.watch_baseline is not null then
      raise exception 'AGT-152 undo: judgment row %', to_jsonb(v_row);
    end if;
    select count(*) into n from public.skill_profiles where llm_model = 'claude-opus-5-5';
    if n <> 0 then raise exception 'AGT-152 undo: % opus-5-5 rows, expected 0', n; end if;
    select count(*) into n from public.skill_profiles where llm_model = 'claude-fable-5-1';
    if n <> 55 then raise exception 'AGT-152 undo: % fable rows, expected 55', n; end if;

    -- Vocabulary: an UNATTACHED model_assignments image attaches. (apply_model_assignment writes
    -- its images already attached, and attach_before_images() only touches decision_id IS NULL
    -- rows, so its own image returns 0 before and after; a fresh unattached image is the
    -- discriminating case -- measured before Up 2: refused, "reverse_decision() cannot restore".)
    insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    select k_cycle, null, 'model_assignments', m.id::text, to_jsonb(m), null
      from public.model_assignments m where m.id = v_id
    returning id into v_img;
    n := public.attach_before_images(v_dec, array[v_img]);
    if n <> 1 then raise exception 'AGT-152 attach: returned %, expected 1', n; end if;

    raise exception 'agt152-proof';
  exception when others then
    if sqlerrm <> 'agt152-proof' then raise; end if;
  end;

  -- Residue: the proof rolled back.
  select count(*) into n from public.model_assignments where decision_id is null;
  if n <> 5 then raise exception 'AGT-152 residue: % assignment rows with NULL decision_id, expected 5', n; end if;
  select count(*) into n from public.skill_profiles where llm_model = 'claude-fable-5-1';
  if n <> 54 then raise exception 'AGT-152 residue: % fable rows', n; end if;
  select count(*) into n from public.skill_profiles where llm_model = 'claude-opus-5-5';
  if n <> 0 then raise exception 'AGT-152 residue: % opus-5-5 rows', n; end if;
  select count(*) into n from public.model_assignments
   where job_kind = 'capability' and job_key = 'data-room-custody' and model_id = 'claude-haiku-4-5-20251001';
  if n <> 1 then raise exception 'AGT-152 residue: data-room-custody moved'; end if;
  select count(*) into n from public.runner_before_images where table_name = 'model_assignments';
  if n <> 0 then raise exception 'AGT-152 residue: % model_assignments images', n; end if;
end
$proof$;
-- END UP 2
