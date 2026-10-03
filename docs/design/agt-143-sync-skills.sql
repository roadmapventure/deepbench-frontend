-- DeepBench v7.0.589 | docs/design/agt-143-sync-skills.sql | AGT-143 (P10 - Tooling)
-- Migration agt143_sync_skills: a switch in public.model_assignments reaches the Skill rows.
--
-- WHY A TRIGGER. api/prompt/db-assembly.js sets llm.model = skill_profiles.llm_model, and every
-- equality fence (scripts/agent-prompt.js resolveJudgmentModel(), judgment_model()'s callers) keys
-- on that stored value. Moving a lane in model_assignments without moving its member Skill rows
-- leaves 54 rows on the old judgment id, equal to no lane. The trigger moves them in the same
-- transaction, so no reader needs code (patterns 8, 10, 14, 16).
--
--   lane row, UPDATE, model_id changed -> every skill_profiles row on the OLD id moves to the new id
--                                         (lane membership = equality with the lane's model_id).
--   capability row, INSERT or UPDATE   -> the capability's default Intent Skill takes the row's id.
--
-- Fires AFTER trg_model_assignments_sync_lanes (triggers fire alphabetically; keep the name).
--
-- Down captured FIRST by capture_migration_down('142ddd9f-…','agt143_sync_skills', 2 objects):
-- auto-downable, 2 captured, 0 refused.

create or replace function public.model_assignments_sync_skills()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if new.job_kind = 'lane' and tg_op = 'UPDATE' and new.model_id <> old.model_id then
    update public.skill_profiles set llm_model = new.model_id where llm_model = old.model_id;
  elsif new.job_kind = 'capability' then
    update public.skill_profiles set llm_model = new.model_id
     where slug = (select c.default_intent_slug from public.capabilities c where c.slug = new.job_key);
  end if;
  return null;
end
$fn$;

create trigger trg_model_assignments_sync_skills
  after insert or update of model_id on public.model_assignments
  for each row execute function public.model_assignments_sync_skills();

revoke all on function public.model_assignments_sync_skills() from public, anon, authenticated;

-- Proof: switch the judgment lane and one capability, assert every reader follows, then roll back
-- by raising 'agt143-proof' inside a nested block (every write inside it is undone).
do $proof$
declare
  n int;
  v_model text;
  v_reason text;
  v_orch text;
begin
  begin
    update public.model_assignments set model_id = 'claude-opus-5-5'
     where job_kind = 'lane' and job_key = 'judgment';

    select model_id into v_model from public.runner_model_lanes where lane = 'judgment';
    if v_model is distinct from 'claude-opus-5-5' then
      raise exception 'AGT-143: runner_model_lanes.judgment = % after the switch', v_model;
    end if;

    select model_id into v_orch from public.runner_model_lanes where lane = 'orchestrator';
    select j.model_id, j.reason into v_model, v_reason from public.judgment_model() j;
    if not (v_model = 'claude-opus-5-5' or (v_reason <> 'lane' and v_model = v_orch)) then
      raise exception 'AGT-143: judgment_model() answered % (%) after the switch', v_model, v_reason;
    end if;

    select count(*) into n from public.skill_profiles where llm_model = 'claude-fable-5-1';
    if n <> 0 then raise exception 'AGT-143: % Skill rows still on claude-fable-5-1', n; end if;
    select count(*) into n from public.skill_profiles where llm_model = 'claude-opus-5-5';
    if n <> 54 then raise exception 'AGT-143: % of 54 Skill rows on claude-opus-5-5', n; end if;

    update public.model_assignments set model_id = 'claude-sonnet-5'
     where job_kind = 'capability' and job_key = 'data-room-custody';
    select llm_model into v_model from public.skill_profiles where slug = 'library-evidence-intent';
    if v_model is distinct from 'claude-sonnet-5' then
      raise exception 'AGT-143: library-evidence-intent on % after the capability switch', v_model;
    end if;

    raise exception 'agt143-proof';
  exception when others then
    if sqlerrm <> 'agt143-proof' then raise; end if;
  end;

  if has_function_privilege('anon', 'public.model_assignments_sync_skills()', 'execute')
     or has_function_privilege('authenticated', 'public.model_assignments_sync_skills()', 'execute') then
    raise exception 'AGT-143: model_assignments_sync_skills() is executable by anon/authenticated';
  end if;

  select count(*) into n from (
    select llm_model, count(*) c from public.skill_profiles group by llm_model
  ) x where (x.llm_model, x.c) in (('claude-fable-5-1', 54), ('claude-opus-5', 30),
                                   ('claude-sonnet-4-6', 21), ('claude-haiku-4-5-20251001', 48));
  if n <> 4 then raise exception 'AGT-143: Skill row counts moved -- the proof did not roll back'; end if;

  select count(*) into n from public.runner_model_lanes l
   where (l.lane, l.model_id) in (('orchestrator', 'claude-opus-5'), ('judgment', 'claude-fable-5-1'),
                                  ('mechanical', 'claude-sonnet-5'));
  if n <> 3 or (select count(*) from public.runner_model_lanes) <> 3 then
    raise exception 'AGT-143: runner_model_lanes no longer equals AGT-142''s three rows';
  end if;
end
$proof$;
