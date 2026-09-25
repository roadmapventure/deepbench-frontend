-- DeepBench v7.0.590 | docs/design/agt-144-model-assignment.sql | AGT-144 (P10 - Tooling)
-- Migration agt144_model_assignment: The Development Manager gains the Model Assignment capability.
--
-- TWO FUNCTIONS, both new, one identity each (.claude/rules/supabase-function-signature.md):
--   public.apply_model_assignment(p_answer jsonb, p_cycle_id uuid, p_session_name text) returns jsonb
--       owns EVERY write the capability makes: the catalog upsert, a switch, a keep, a money ask,
--       a filed ticket. The switch rule (harvest section B.4) is arithmetic the function enforces,
--       so a misapplied rule is refused rather than written (patterns 10, 19).
--   public.review_model_watch(p_cycle_id uuid, p_session_name text) returns jsonb
--       grades the 5-run watch window after a switch and reverts it itself when blocks,
--       escalations or failures rise above the baseline (harvest section C).
-- ROWS (one `agent-row` decision, every row imaged): 3 skill_profiles, 1 capabilities,
--   9 capability_skill_profiles, 1 agent_capability_assignments = 14 inserts, plus the
--   dm-guardrails.must_not edit imaged with its full row = 15 before-images.
--
-- runner_model_lanes is never written here: AGT-142's guard refuses it; a model_assignments write
-- reaches it through trg_model_assignments_sync_lanes and the Skill rows through
-- trg_model_assignments_sync_skills (AGT-143). A switch therefore images, under its own decision,
-- every skill_profiles row that trigger will move.
--
-- MEASURED AT BUILD (2026-09-25, not recalled):
--   * dm-guardrails.must_not held SIX entries, not [] as the kickoff's context line says; the five
--     below are APPENDED, the six are kept.
--   * reverse_decision()'s k_allowed and reversible_tables() do NOT carry model_assignments,
--     model_catalog or model_pricing: their images are written (the record of the prior row), and a
--     reverse_decision() over a switch restores the skill_profiles half and reports the
--     model_assignments image as refused. The designed undo of a switch is review_model_watch()'s
--     self-revert, or a new switch through this function. Reported as a discovery at this ship.
--   * judgment -> claude-opus-5-5 is a DOWN switch (input_per_1k 0.004 < 0.010), so the token limb
--     cannot be proved on it; the proof drives the 10% refusal on lane/mechanical
--     (claude-sonnet-5 0.002 -> claude-opus-5-5 0.004, UP).
--
-- Down captured FIRST by capture_migration_down('2ff54656-e599-4866-b309-8e04b4f0a900',
-- 'agt144_model_assignment', 2 function objects): expect auto-downable, 2 captured, 0 refused.
-- The data rows are imaged under the agent-row decision and reversible by reverse_decision().

-- =====================================================================================
-- 1. apply_model_assignment
-- =====================================================================================
create or replace function public.apply_model_assignment(
  p_answer jsonb, p_cycle_id uuid, p_session_name text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  k_actions  constant text[] := array['switch','keep','money','file-ticket'];
  v_by       text := coalesce(p_session_name, 'cycle ' || p_cycle_id::text);
  v_catalog  jsonb;
  v_actions  jsonb;
  c          jsonb;
  a          jsonb;
  t          jsonb;
  v_patterns text;
  v_cat_dec  uuid;
  v_cat_n    int := 0;
  v_pr       public.model_pricing%rowtype;
  v_mc       public.model_catalog%rowtype;
  v_row      public.model_assignments%rowtype;
  v_kind     text;
  v_key      text;
  v_act      text;
  v_to       text;
  v_ref      text;
  v_to_cat   public.model_catalog%rowtype;
  v_old_in   numeric;
  v_new_in   numeric;
  v_up       boolean;
  v_n        int;
  v_bad      int;
  v_cand_tok numeric;
  v_base_tok numeric;
  v_waived   boolean;
  v_dec      uuid;
  v_runs     uuid[];
  v_b_runs   int;
  v_b_blocks int;
  v_b_esc    int;
  v_b_fail   int;
  v_baseline jsonb;
  v_rc       int;
  v_last     int;
  v_bid      text;
  v_ord      int;
  v_new_uuid uuid;
  v_tickets  int := 0;
  v_out      jsonb := '[]'::jsonb;
  v_reverse  jsonb := '[]'::jsonb;
begin
  -- 0. Attribution and shape.
  if not ((p_cycle_id is not null) <> (p_session_name is not null)) then
    raise exception 'apply_model_assignment: exactly one of p_cycle_id / p_session_name (runner_before_images CHECK ck_before_image_attribution)';
  end if;
  if p_answer is null or jsonb_typeof(p_answer) <> 'object' then
    raise exception 'apply_model_assignment: p_answer must be a JSON object';
  end if;
  v_catalog := coalesce(p_answer -> 'catalog', '[]'::jsonb);
  v_actions := coalesce(p_answer -> 'actions', '[]'::jsonb);
  if jsonb_typeof(v_catalog) <> 'array' or jsonb_typeof(v_actions) <> 'array' then
    raise exception 'apply_model_assignment: catalog and actions must be arrays';
  end if;
  if jsonb_array_length(v_catalog) = 0 and jsonb_array_length(v_actions) = 0 then
    raise exception 'apply_model_assignment: nothing to apply -- catalog and actions are both empty';
  end if;
  select coalesce(string_agg('pattern:' || x, ' '), 'pattern:0') into v_patterns
    from jsonb_array_elements_text(case when jsonb_typeof(p_answer -> 'patterns_applied') = 'array'
                                        then p_answer -> 'patterns_applied' else '[]'::jsonb end) x;

  -- 1. Catalog: model_pricing first (model_catalog FKs it), then model_catalog; first_seen kept,
  --    last_checked = now(). Every row touched is imaged under ONE `model-catalog` decision.
  if jsonb_array_length(v_catalog) > 0 then
    v_cat_dec := public.record_decision(
      p_cycle_id, p_session_name, 'model-catalog', null,
      format('Model catalog: %s Claude model rows checked', jsonb_array_length(v_catalog)),
      coalesce(p_answer ->> 'summary_for_john', 'catalog refresh') || E'\n' || v_patterns,
      null);
    for c in select value from jsonb_array_elements(v_catalog) loop
      v_to := c ->> 'model_id';
      if v_to is null or v_to not like 'claude-%' then
        raise exception 'apply_model_assignment: catalog row % refused -- Claude models only', coalesce(v_to, '<NULL>');
      end if;
      if coalesce(btrim(c ->> 'family'), '') = '' then
        raise exception 'apply_model_assignment: catalog row % needs family', v_to;
      end if;

      select * into v_pr from public.model_pricing p where p.model = v_to;
      if found then
        insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
        values (p_cycle_id, p_session_name, 'model_pricing', v_to, to_jsonb(v_pr), v_cat_dec);
        if c ? 'input_per_1k' or c ? 'output_per_1k' then
          update public.model_pricing
             set input_per_1k  = coalesce((c ->> 'input_per_1k')::numeric,  input_per_1k),
                 output_per_1k = coalesce((c ->> 'output_per_1k')::numeric, output_per_1k),
                 updated_at    = now()
           where model = v_to;
        end if;
      else
        if (c ->> 'input_per_1k') is null or (c ->> 'output_per_1k') is null then
          raise exception 'apply_model_assignment: catalog row % is new to model_pricing and needs input_per_1k and output_per_1k', v_to;
        end if;
        insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
        values (p_cycle_id, p_session_name, 'model_pricing', v_to, null, v_cat_dec);
        insert into public.model_pricing (model, input_per_1k, output_per_1k)
        values (v_to, (c ->> 'input_per_1k')::numeric, (c ->> 'output_per_1k')::numeric);
      end if;

      select * into v_mc from public.model_catalog m where m.model_id = v_to;
      insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
      values (p_cycle_id, p_session_name, 'model_catalog', v_to,
              case when found then to_jsonb(v_mc) else null end, v_cat_dec);
      insert into public.model_catalog
        (model_id, family, released_on, retire_not_before, deprecated_on, plan_availability,
         stated_strengths, source_url, first_seen, last_checked)
      values
        (v_to, c ->> 'family', (c ->> 'released_on')::date, (c ->> 'retire_not_before')::date,
         (c ->> 'deprecated_on')::date, c -> 'plan_availability', c ->> 'stated_strengths',
         c ->> 'source_url', now(), now())
      on conflict (model_id) do update
         set family            = excluded.family,
             released_on       = coalesce(excluded.released_on,       public.model_catalog.released_on),
             retire_not_before = coalesce(excluded.retire_not_before, public.model_catalog.retire_not_before),
             deprecated_on     = coalesce(excluded.deprecated_on,     public.model_catalog.deprecated_on),
             plan_availability = coalesce(excluded.plan_availability, public.model_catalog.plan_availability),
             stated_strengths  = coalesce(excluded.stated_strengths,  public.model_catalog.stated_strengths),
             source_url        = coalesce(excluded.source_url,        public.model_catalog.source_url),
             last_checked      = now();
      v_cat_n := v_cat_n + 1;
    end loop;
    v_reverse := v_reverse || to_jsonb(format('select * from public.reverse_decision(%L, ''<actor>'', ''<reason>'');', v_cat_dec));
  end if;

  -- 2. Actions, one per model_assignments row. Any refusal raises naming the job and rolls back
  --    the WHOLE call, catalog included: the answer and the tables never half-agree.
  for a in select value from jsonb_array_elements(v_actions) loop
    v_kind := a ->> 'job_kind';
    v_key  := a ->> 'job_key';
    v_act  := a ->> 'action';
    v_to   := a ->> 'to_model';
    v_ref  := coalesce(v_kind, '<NULL>') || '/' || coalesce(v_key, '<NULL>');

    select * into v_row from public.model_assignments m
     where m.job_kind = v_kind and m.job_key = v_key for update;
    if not found then
      raise exception 'apply_model_assignment: % -- no model_assignments row', v_ref;
    end if;
    if v_act is null or not (v_act = any (k_actions)) then
      raise exception 'apply_model_assignment: % -- action % is not one of switch, keep, money, file-ticket', v_ref, coalesce(v_act, '<NULL>');
    end if;
    if coalesce(btrim(a ->> 'reason'), '') = '' then
      raise exception 'apply_model_assignment: % -- the % action needs a reason', v_ref, v_act;
    end if;

    if v_act in ('switch', 'money') then
      if v_to is null or v_to not like 'claude-%' then
        raise exception 'apply_model_assignment: % -- to_model % refused: Claude models only', v_ref, coalesce(v_to, '<NULL>');
      end if;
      select * into v_to_cat from public.model_catalog m where m.model_id = v_to;
      if not found then
        raise exception 'apply_model_assignment: % -- to_model % is not in model_catalog', v_ref, v_to;
      end if;
      if v_to_cat.deprecated_on is not null then
        raise exception 'apply_model_assignment: % -- to_model % is deprecated (deprecated_on %)', v_ref, v_to, v_to_cat.deprecated_on;
      end if;
    end if;

    if v_act = 'switch' then
      -- 2a. The rule (harvest B.4), enforced.
      t := coalesce(a -> 'trial_evidence', '[]'::jsonb);
      if jsonb_typeof(t) <> 'array' then
        raise exception 'apply_model_assignment: % -- trial_evidence must be an array', v_ref;
      end if;
      v_n := jsonb_array_length(t);
      if v_n < 3 then
        raise exception 'apply_model_assignment: % -- a switch needs at least 3 trials, got %', v_ref, v_n;
      end if;
      select p.input_per_1k into v_old_in from public.model_pricing p where p.model = v_row.model_id;
      select p.input_per_1k into v_new_in from public.model_pricing p where p.model = v_to;
      v_up := v_new_in > v_old_in;

      select count(*) into v_bad from jsonb_array_elements(t) e
       where coalesce((e.value -> 'candidate' ->> 'passed')::boolean, false) is not true;
      if v_bad > 0 then
        raise exception 'apply_model_assignment: % -- % of % trials: candidate did not pass; every trial must pass', v_ref, v_bad, v_n;
      end if;

      if v_up then
        select count(*) into v_bad from jsonb_array_elements(t) e
         where coalesce(e.value -> 'baseline' ->> 'verdict', 'none') = 'approve'
           and coalesce(e.value -> 'candidate' ->> 'verdict', 'none') <> 'approve';
        if v_bad > 0 then
          raise exception 'apply_model_assignment: % -- switch up to %: % trials lost an approve the baseline had (match-or-beat)', v_ref, v_to, v_bad;
        end if;
        select coalesce(sum((e.value -> 'candidate' ->> 'tokens')::numeric), 0),
               coalesce(sum((e.value -> 'baseline'  ->> 'tokens')::numeric), 0)
          into v_cand_tok, v_base_tok
          from jsonb_array_elements(t) e;
        select v_row.complexity_band = 'hard-judgment' and exists (
                 select 1 from jsonb_array_elements(t) e
                  where coalesce((e.value -> 'candidate' ->> 'passed')::boolean, false)
                    and coalesce((e.value ->> 'clearly_better')::boolean, false))
          into v_waived;
        if v_cand_tok > 1.10 * v_base_tok and not coalesce(v_waived, false) then
          raise exception 'apply_model_assignment: % -- switch up to %: candidate tokens % exceed baseline % by more than 10%%', v_ref, v_to, v_cand_tok, v_base_tok;
        end if;
      end if;

      -- 2b. Watch baseline (harvest C): the last 5 real runs on the OLD model.
      if v_kind = 'lane' then
        select coalesce(array_agg(x.id), array[]::uuid[]) into v_runs from (
          select rc.id from public.runner_cycles rc
           where rc.model = v_row.model_id and rc.outcome is not null and rc.outcome <> 'did_not_run'
             and rc.started_at > coalesce(v_row.since, '-infinity'::timestamptz)
           order by rc.started_at desc limit 5) x;
        v_b_runs := coalesce(array_length(v_runs, 1), 0);
        select count(*) into v_b_blocks from public.runner_verdicts v where v.verdict = 'block' and v.cycle_id = any (v_runs);
        select count(*) into v_b_esc    from public.runner_questions q where q.asked_cycle = any (v_runs);
        select count(*) into v_b_fail   from public.runner_cycles rc where rc.id = any (v_runs) and rc.outcome <> 'shipped';
      else
        select count(*) into v_b_runs from (
          select l.id from public.ai_activity_log l
           where l.feature like v_key || ':%' and l.model = v_row.model_id
             and l.created_at > coalesce(v_row.since, '-infinity'::timestamptz)
           order by l.created_at desc limit 5) x;
        v_b_blocks := 0; v_b_esc := 0; v_b_fail := 0;
      end if;

      -- 2c. The decision, then images of the row and of every Skill row AGT-143's trigger moves.
      v_dec := public.record_decision(
        p_cycle_id, p_session_name, 'model-assignment', null,
        format('%s/%s %s -> %s', v_kind, v_key, v_row.model_id, v_to),
        (a ->> 'reason') || E'\n' ||
        format('%s switch, %s trials; tokens candidate %s vs baseline %s', case when v_up then 'up' else 'down' end,
               v_n, coalesce(v_cand_tok::text, '-'), coalesce(v_base_tok::text, '-')) || E'\n' || v_patterns,
        null);
      v_baseline := jsonb_build_object(
        'prior_model', v_row.model_id, 'prior_decision_id', v_row.decision_id,
        'runs', v_b_runs, 'blocks', v_b_blocks, 'escalations', v_b_esc, 'failures', v_b_fail);

      insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
      values (p_cycle_id, p_session_name, 'model_assignments', v_kind || '/' || v_key, to_jsonb(v_row), v_dec);
      if v_kind = 'lane' then
        insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
        select p_cycle_id, p_session_name, 'skill_profiles', sp.id::text, to_jsonb(sp), v_dec
          from public.skill_profiles sp where sp.llm_model = v_row.model_id;
      else
        insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
        select p_cycle_id, p_session_name, 'skill_profiles', sp.id::text, to_jsonb(sp), v_dec
          from public.skill_profiles sp
         where sp.slug = (select cap.default_intent_slug from public.capabilities cap where cap.slug = v_key);
      end if;

      update public.model_assignments
         set model_id = v_to, since = now(), decision_id = v_dec, trial_evidence = t,
             watch_runs_observed = 0, watch_baseline = v_baseline,
             updated_at = now(), updated_by = v_by
       where job_kind = v_kind and job_key = v_key;

      v_out := v_out || jsonb_build_object('job', v_ref, 'action', 'switch', 'from', v_row.model_id, 'to', v_to,
                                           'direction', case when v_up then 'up' else 'down' end, 'decision_id', v_dec);
      v_reverse := v_reverse || to_jsonb(format('select * from public.reverse_decision(%L, ''<actor>'', ''<reason>'');', v_dec));

    elsif v_act = 'keep' then
      v_dec := public.record_decision(
        p_cycle_id, p_session_name, 'model-keep', null,
        format('%s/%s keeps %s', v_kind, v_key, v_row.model_id),
        (a ->> 'reason') || E'\n' || v_patterns, null);
      v_out := v_out || jsonb_build_object('job', v_ref, 'action', 'keep', 'model', v_row.model_id, 'decision_id', v_dec);

    elsif v_act = 'money' then
      if (a ->> 'weekly_cost_usd') is null then
        raise exception 'apply_model_assignment: % -- a money ask needs weekly_cost_usd', v_ref;
      end if;
      -- Harvest D: the apply_audit_review() alert shape; no model_assignments write.
      insert into public.john_alerts (source, john_call, summary, detail, ref_table, ref_id, fingerprint)
      values ('model-assignment', 'money',
              format('%s/%s -> %s: needs money — about $%s/week', v_kind, v_key, v_to, a ->> 'weekly_cost_usd'),
              a ->> 'reason', 'model_assignments', v_kind || '/' || v_key,
              'model:' || v_key || ':' || v_to)
      on conflict (fingerprint) do nothing;
      get diagnostics v_rc = row_count;
      v_out := v_out || jsonb_build_object('job', v_ref, 'action', 'money', 'to', v_to, 'alerts', v_rc);

    elsif v_act = 'file-ticket' then
      if coalesce(btrim(a ->> 'ticket_title'), '') = '' then
        raise exception 'apply_model_assignment: % -- file-ticket needs ticket_title', v_ref;
      end if;
      -- apply_audit_review()'s filing block: one claimed id, the row, a NULL before-image.
      v_dec := public.record_decision(
        p_cycle_id, p_session_name, 'filing', null,
        format('Model assignment: %s has no passing replacement -- ticket filed', v_ref),
        (a ->> 'reason') || E'\n' || v_patterns, public.ladder_work_class('P10 - Tooling'));
      insert into public.feature_id_counter (prefix, last_issued_number, updated_by_session)
      values ('AGT', 1, v_by)
      on conflict (prefix) do update
        set last_issued_number = greatest(public.feature_id_counter.last_issued_number,
              (select coalesce(max(split_part(b.backlog_id, '-', 2)::int), 0)
                 from public.backlog_items b where b.backlog_id ~ '^AGT-[0-9]+$')) + 1,
            updated_at = now(),
            updated_by_session = excluded.updated_by_session
      returning last_issued_number into v_last;
      v_bid := 'AGT-' || v_last;
      select coalesce(max(b.row_ordinal), 0) + 1 into v_ord from public.backlog_items b;
      insert into public.backlog_items
        (backlog_id, tier, type, priority_class, title, description, status, epic_id,
         source_file, session_ref, row_ordinal, filed_at, scope_origin, size_stamp, predicted_cycles,
         defer_status, scope_rationale, milestone, enhancement_claim, gate_count)
      values
        (v_bid, 'next', 'Tooling', 'P10 - Tooling', btrim(a ->> 'ticket_title'),
         '**P10 - Tooling.** ' || (a ->> 'reason'), 'open', null,
         'model-assignment', v_by || ' ' || current_date, v_ord, now(), 'discovered', 'M', 1,
         'no', 'AGT-144: ' || v_ref || ' runs a retiring model and no candidate passed its trials',
         null, 'none: model retirement move', 0)
      returning id into v_new_uuid;
      insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
      values (p_cycle_id, p_session_name, 'backlog_items', v_new_uuid::text, null, v_dec);
      v_tickets := v_tickets + 1;
      v_out := v_out || jsonb_build_object('job', v_ref, 'action', 'file-ticket', 'ticket', v_bid, 'decision_id', v_dec);
      v_reverse := v_reverse || to_jsonb(format('select * from public.reverse_decision(%L, ''<actor>'', ''<reason>'');', v_dec));
    end if;
  end loop;

  if v_tickets > 0 then
    perform public.recompute_backlog_queue();
  end if;

  return jsonb_build_object(
    'catalog_decision_id', v_cat_dec, 'catalog_rows', v_cat_n,
    'actions', v_out, 'reverse', v_reverse);
end
$function$;

-- =====================================================================================
-- 2. review_model_watch
-- =====================================================================================
create or replace function public.review_model_watch(p_cycle_id uuid, p_session_name text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_by      text := coalesce(p_session_name, 'cycle ' || p_cycle_id::text);
  r         public.model_assignments%rowtype;
  v_n       int;
  v_runs    uuid[];
  v_w_blocks int;
  v_w_esc   int;
  v_w_fail  int;
  v_b       jsonb;
  v_b_runs  numeric;
  v_rise    boolean;
  v_prior   text;
  v_dec     uuid;
  v_watched jsonb := '[]'::jsonb;
  v_reverts jsonb := '[]'::jsonb;
begin
  if not ((p_cycle_id is not null) <> (p_session_name is not null)) then
    raise exception 'review_model_watch: exactly one of p_cycle_id / p_session_name (runner_before_images CHECK ck_before_image_attribution)';
  end if;

  for r in
    select * from public.model_assignments m
     where m.decision_id is not null and m.watch_runs_observed < 5 and m.watch_baseline is not null
     order by m.job_kind, m.job_key
     for update
  loop
    -- Harvest C: real runs on the NEW model since the switch; the watch takes the FIRST five.
    if r.job_kind = 'lane' then
      select coalesce(array_agg(x.id), array[]::uuid[]) into v_runs from (
        select rc.id from public.runner_cycles rc
         where rc.model = r.model_id and rc.started_at > r.since
           and rc.outcome is not null and rc.outcome <> 'did_not_run'
         order by rc.started_at asc limit 5) x;
      v_n := coalesce(array_length(v_runs, 1), 0);
      select count(*) into v_w_blocks from public.runner_verdicts v where v.verdict = 'block' and v.cycle_id = any (v_runs);
      select count(*) into v_w_esc    from public.runner_questions q where q.asked_cycle = any (v_runs);
      select count(*) into v_w_fail   from public.runner_cycles rc where rc.id = any (v_runs) and rc.outcome <> 'shipped';
    else
      select count(*) into v_n from (
        select l.id from public.ai_activity_log l
         where l.feature like r.job_key || ':%' and l.model = r.model_id and l.created_at > r.since
         order by l.created_at asc limit 5) x;
      v_w_blocks := 0; v_w_esc := 0; v_w_fail := 0;
    end if;

    if least(5, v_n) <> r.watch_runs_observed then
      update public.model_assignments set watch_runs_observed = least(5, v_n)
       where job_kind = r.job_kind and job_key = r.job_key;
    end if;
    v_watched := v_watched || jsonb_build_object('job', r.job_kind || '/' || r.job_key, 'observed', least(5, v_n));

    if v_n >= 5 then
      v_b := r.watch_baseline;
      v_b_runs := nullif(coalesce((v_b ->> 'runs')::numeric, 0), 0);
      v_rise := (v_w_blocks / 5.0) > coalesce((v_b ->> 'blocks')::numeric      / v_b_runs, 0)
             or (v_w_esc    / 5.0) > coalesce((v_b ->> 'escalations')::numeric / v_b_runs, 0)
             or (v_w_fail   / 5.0) > coalesce((v_b ->> 'failures')::numeric    / v_b_runs, 0);
      v_prior := v_b ->> 'prior_model';
      if v_rise and v_prior is not null then
        v_dec := public.record_decision(
          p_cycle_id, p_session_name, 'model-revert', null,
          format('%s/%s %s -> %s (watch window rose)', r.job_kind, r.job_key, r.model_id, v_prior),
          format('Watch over the first 5 runs on %s: blocks %s, escalations %s, failures %s of 5. '
                 || 'Baseline on %s: blocks %s, escalations %s, failures %s of %s runs. A rate rose, so the switch '
                 || '(decision %s) reverts itself.',
                 r.model_id, v_w_blocks, v_w_esc, v_w_fail, v_prior,
                 coalesce(v_b ->> 'blocks', '0'), coalesce(v_b ->> 'escalations', '0'),
                 coalesce(v_b ->> 'failures', '0'), coalesce(v_b ->> 'runs', '0'), r.decision_id)
          || E'\npattern:16',
          null);
        -- Image the row as it stands (observed = 5) and every Skill row AGT-143's trigger moves back.
        insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
        select p_cycle_id, p_session_name, 'model_assignments', m.job_kind || '/' || m.job_key, to_jsonb(m), v_dec
          from public.model_assignments m where m.job_kind = r.job_kind and m.job_key = r.job_key;
        if r.job_kind = 'lane' then
          insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
          select p_cycle_id, p_session_name, 'skill_profiles', sp.id::text, to_jsonb(sp), v_dec
            from public.skill_profiles sp where sp.llm_model = r.model_id;
        else
          insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
          select p_cycle_id, p_session_name, 'skill_profiles', sp.id::text, to_jsonb(sp), v_dec
            from public.skill_profiles sp
           where sp.slug = (select cap.default_intent_slug from public.capabilities cap where cap.slug = r.job_key);
        end if;
        update public.model_assignments
           set model_id = v_prior, decision_id = v_dec, since = now(),
               updated_at = now(), updated_by = v_by
         where job_kind = r.job_kind and job_key = r.job_key;
        v_reverts := v_reverts || jsonb_build_object(
          'job', r.job_kind || '/' || r.job_key, 'from', r.model_id, 'to', v_prior, 'decision_id', v_dec,
          'watch', jsonb_build_object('runs', 5, 'blocks', v_w_blocks, 'escalations', v_w_esc, 'failures', v_w_fail),
          'baseline', v_b);
      end if;
    end if;
  end loop;

  return jsonb_build_object('watched', v_watched, 'reverted', v_reverts);
end
$function$;

-- =====================================================================================
-- 3. Grants: pg_default_acl opens new functions to anon/authenticated -- close them.
-- =====================================================================================
revoke all on function public.apply_model_assignment(jsonb, uuid, text) from public, anon, authenticated;
revoke all on function public.review_model_watch(uuid, text)            from public, anon, authenticated;
grant execute on function public.apply_model_assignment(jsonb, uuid, text) to service_role;
grant execute on function public.review_model_watch(uuid, text)            to service_role;

-- =====================================================================================
-- 4. The rows: 3 Skills, 1 capability, 9 links, 1 assignment, the dm-guardrails edit.
--    One `agent-row` decision (AGENT-ROW-AGREED-TICKET, john-named ticket); every row imaged.
-- =====================================================================================
do $rows$
declare
  k_cycle constant uuid := '2ff54656-e599-4866-b309-8e04b4f0a900';
  v_dec   uuid;
  v_model text;
  v_id    uuid;
  v_links text[] := array['dm-identity','dm-knowledge-platform','dm-behavior','dm-model-assign-intent',
                          'dm-release-watch-intent','dm-knowledge-model-trial','dm-guardrails',
                          'dm-knowledge-patterns','dm-knowledge-cycle-card'];
  v_five  jsonb := jsonb_build_array(
    'Claude models only',
    'never a routine''s on/off',
    'never crons',
    'never budget walls, pace stop or the API walls',
    'a switch needing a plan upgrade, paid extra usage or API dollars beyond the walls is a money ask, no switch until answered');
  v_catalog_item jsonb := '{"type":"object","required":["model_id","family","source_url"],"properties":{
      "model_id":{"type":"string"},"family":{"type":"string"},
      "released_on":{"type":"string","format":"date"},"retire_not_before":{"type":"string","format":"date"},
      "deprecated_on":{"type":"string","format":"date"},
      "input_per_1k":{"type":"number"},"output_per_1k":{"type":"number"},
      "plan_availability":{"type":"object"},"stated_strengths":{"type":"string"},"source_url":{"type":"string"}}}'::jsonb;
  v_side jsonb := '{"type":"object","required":["passed","verdict","tokens","minutes"],"properties":{
      "passed":{"type":"boolean"},"verdict":{"type":"string","enum":["approve","block","none"]},
      "tokens":{"type":"number"},"minutes":{"type":"number"}}}'::jsonb;
  v_patterns jsonb := '{"type":"array","items":{"type":"integer","minimum":1},"description":"The decision patterns you applied this turn, by number (pattern:N). Empty when none; every number must exist in the library."}'::jsonb;
  v_watch_schema  jsonb;
  v_assign_schema jsonb;
  i int;
begin
  select m.model_id into v_model from public.model_assignments m where m.job_kind = 'lane' and m.job_key = 'orchestrator';
  if v_model is null then raise exception 'AGT-144: no orchestrator lane row in model_assignments'; end if;

  v_watch_schema := jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array('catalog', 'new_models', 'retirements', 'summary_for_john', 'patterns_applied'),
    'properties', jsonb_build_object(
      'catalog', jsonb_build_object('type', 'array', 'items', v_catalog_item),
      'new_models', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
      'retirements', jsonb_build_object('type', 'array', 'items', jsonb_build_object(
        'type', 'object', 'required', jsonb_build_array('model_id', 'date', 'source_url'),
        'properties', jsonb_build_object('model_id', jsonb_build_object('type', 'string'),
                                         'date', jsonb_build_object('type', 'string', 'format', 'date'),
                                         'source_url', jsonb_build_object('type', 'string')))),
      'summary_for_john', jsonb_build_object('type', 'string', 'maxLength', 600),
      'patterns_applied', v_patterns));

  v_assign_schema := jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array('catalog', 'actions', 'summary_for_john', 'patterns_applied'),
    'properties', jsonb_build_object(
      'catalog', jsonb_build_object('type', 'array', 'items', v_catalog_item),
      'actions', jsonb_build_object('type', 'array', 'items', jsonb_build_object(
        'type', 'object',
        'required', jsonb_build_array('job_kind', 'job_key', 'action', 'reason'),
        'properties', jsonb_build_object(
          'job_kind', jsonb_build_object('type', 'string', 'enum', jsonb_build_array('lane', 'capability')),
          'job_key', jsonb_build_object('type', 'string'),
          'action', jsonb_build_object('type', 'string', 'enum', jsonb_build_array('switch', 'keep', 'money', 'file-ticket')),
          'to_model', jsonb_build_object('type', 'string'),
          'reason', jsonb_build_object('type', 'string', 'maxLength', 1200),
          'trial_evidence', jsonb_build_object('type', 'array', 'items', jsonb_build_object(
            'type', 'object', 'required', jsonb_build_array('job_ref', 'run_at', 'baseline', 'candidate'),
            'properties', jsonb_build_object(
              'job_ref', jsonb_build_object('type', 'string'),
              'run_at', jsonb_build_object('type', 'string'),
              'hard', jsonb_build_object('type', 'boolean'),
              'clearly_better', jsonb_build_object('type', 'boolean'),
              'baseline', v_side, 'candidate', v_side))),
          'weekly_cost_usd', jsonb_build_object('type', 'number'),
          'ticket_title', jsonb_build_object('type', 'string', 'maxLength', 200)))),
      'summary_for_john', jsonb_build_object('type', 'string', 'maxLength', 600),
      'patterns_applied', v_patterns));

  v_dec := public.record_decision(
    k_cycle, null, 'agent-row', 'AGT-144',
    'AGT-144: the Development Manager gains the model-assignment capability — 3 Skills (2 Intent, 1 Knowledge), '
      || '1 capability, 9 capability_skill_profiles links, 1 assignment, dm-guardrails must_not +5',
    'AGENT-ROW-AGREED-TICKET second limb: AGT-144 is john-named; its seed and guardrails edit are build work '
      || 'with a before-image, not a card. Skill types: dm-release-watch-intent Intent (reads pages, answers a '
      || 'contract), dm-knowledge-model-trial Knowledge (the protocol and switch rule the manager reads; the '
      || 'trial script is its hands), dm-model-assign-intent Intent (the decision contract). '
      || 'pattern:2 pattern:7 pattern:17 pattern:136',
    public.ladder_work_class('P10 - Tooling'));

  -- 4a. dm-release-watch-intent (Intent)
  insert into public.skill_profiles
    (slug, name, skill_type_slug, objective, method, traits, guardrails, technical_services, execution_type,
     tenant_id, llm_provider, llm_model, max_tokens, api_key_source, temperature)
  values
    ('dm-release-watch-intent', 'Watch Claude Model Releases', 'intent',
     'Record every Claude model Anthropic ships or retires, from Anthropic''s own pages, into the catalog.',
     'Read the model list, the release-notes overview, the model-deprecations status table, the pricing page and '
       || 'the plan/limits page (WebFetch/WebSearch; the four URLs the W39 finding 961caae922b0381a cites are the '
       || 'starting set). For every Claude model id seen, return a catalog row: model_id, family, released_on, '
       || 'retire_not_before, deprecated_on, input_per_1k, output_per_1k, plan_availability, stated_strengths and '
       || 'the source_url you read it on. Ids that are not claude-* are ignored. A model with a retire_not_before or '
       || 'deprecated_on earlier than any current assignment''s is a retirement to name in retirements, with its date '
       || 'and source_url. A model absent from the catalog in task_context is a new model to name in new_models. '
       || 'summary_for_john is plain sentences: what shipped, what retires and when, and which job types that touches.',
     jsonb_build_object('schema', v_watch_schema, 'can_request_help', false),
     '{"must":[],"must_not":[]}'::jsonb, '["structured-output"]'::jsonb, 'ai',
     null, 'anthropic', v_model, 8000, 'platform', 0)
  returning id into v_id;
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (k_cycle, null, 'skill_profiles', v_id::text, null, v_dec);

  -- 4b. dm-knowledge-model-trial (Knowledge) -- harvest B, steps 1-6, verbatim (step 2 as amended).
  insert into public.skill_profiles
    (slug, name, skill_type_slug, objective, method, traits, guardrails, technical_services, execution_type,
     tenant_id, llm_provider, llm_model, max_tokens, api_key_source, temperature)
  values
    ('dm-knowledge-model-trial', 'Development Manager Knowledge — the model trial protocol and switch rule', 'knowledge',
     'The trial protocol and the switch rule, verbatim.',
     '1. A job type is a `model_assignments` row. A trial of a candidate model takes the 3 most recent real jobs of that type: for a lane row, the last 3 `runner_cycles` on that lane''s model with an outcome other than `did_not_run` and an `item_id`; for a capability row, the last 3 `ai_activity_log` rows whose `feature` starts `<job_key>:`.' || E'\n'
     || '2. Each job is the lane''s recorded agent turn for that cycle, re-assembled and run once on the candidate in a scratch worktree with read-only tools: no push, no `runner_cycles`, no `runner_decisions`, no `backlog_items` write, no ship. Tokens and minutes are measured; `passed` means the answer met the turn''s own contract (every required key; a kickoff within the byte cap); `verdict` is `none` on both sides for a turn trial.' || E'\n'
     || '3. Room: a trial runs only when `runner_should_boot().detail` says `all_models_pct < pace_limit_pct` and `all_models_pct < wall_pct` (`weekly_rest_pct`, `final_day_rest_pct` on the last day), and never on a Fable model when `fable_pct >= fable_share`. Every trial run is logged with `scripts/agent-log.js --capability=model-assignment`.' || E'\n'
     || '4. Switch UP (candidate priced higher on `model_pricing.input_per_1k`): all 3 match-or-beat — `candidate.passed` and (`baseline.verdict <> ''approve''` or `candidate.verdict = ''approve''`) — and `sum(candidate.tokens) <= 1.10 * sum(baseline.tokens)`; on a `hard-judgment` row a clearly better result on one passed trial wins even at higher cost. Switch DOWN (candidate cheaper): all 3 `candidate.passed`. Otherwise keep, and record why.' || E'\n'
     || '5. Evidence shape, one entry per trial: `{ "job_ref", "run_at", "hard"?, "clearly_better"?, "baseline": { "passed", "verdict", "tokens", "minutes" }, "candidate": { "passed", "verdict", "tokens", "minutes" } }`.' || E'\n'
     || '6. After a switch, the first 5 real runs are the watch window; if blocks, escalations or failures rise above the baseline the switch reverts itself with a recorded reason. A retiring model''s jobs move before its date; if no candidate passes, a ticket is filed.',
     '{"source":"inline"}'::jsonb,
     '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, 'ai',
     null, 'anthropic', v_model, 8000, 'platform', 0)
  returning id into v_id;
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (k_cycle, null, 'skill_profiles', v_id::text, null, v_dec);

  -- 4c. dm-model-assign-intent (Intent, the capability's default)
  insert into public.skill_profiles
    (slug, name, skill_type_slug, objective, method, traits, guardrails, technical_services, execution_type,
     tenant_id, llm_provider, llm_model, max_tokens, api_key_source, temperature)
  values
    ('dm-model-assign-intent', 'Assign the Models', 'intent',
     'Decide every model switch, keep, money ask and retirement move for the job types in task_context, one action per row, each with its evidence.',
     'For each model_assignments row in task_context, with its trial evidence (from scripts/model-trial.js), the '
       || 'catalog and the room numbers, apply the trial Knowledge''s rule and answer one action: switch (to_model '
       || 'and the trial_evidence that passes the rule), keep (the reason the rule or the evidence does not move it), '
       || 'money when the candidate needs a plan upgrade, paid extra usage or API dollars beyond the walls '
       || '(weekly_cost_usd required; the row stays on its model until John answers), file-ticket when a retiring '
       || 'model has no passing replacement (ticket_title required). Return any catalog rows you checked in catalog. '
       || 'Every action needs a reason in plain language. public.apply_model_assignment() enforces the rule and '
       || 'refuses an answer that breaks it, naming the job. summary_for_john is plain sentences: what moved, what '
       || 'stayed, and what waits on him.',
     jsonb_build_object('schema', v_assign_schema, 'can_request_help', false),
     '{"must":[],"must_not":[]}'::jsonb, '["structured-output"]'::jsonb, 'ai',
     null, 'anthropic', v_model, 8000, 'platform', 0)
  returning id into v_id;
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (k_cycle, null, 'skill_profiles', v_id::text, null, v_dec);

  -- 4d. The capability.
  insert into public.capabilities (slug, name, description, execution_type, tenant_id, display_phrase, default_intent_slug)
  values ('model-assignment', 'Model Assignment',
          'Watches Anthropic''s Claude releases and retirements into the model catalog, trials a candidate model on '
            || 'recent real jobs, and switches, keeps, asks John for money or files a ticket for each job type -- every '
            || 'write through public.apply_model_assignment(), which enforces the switch rule, and a 5-run watch that '
            || 'reverts a switch itself.',
          'ai', 'global', 'assigning the models', 'dm-model-assign-intent')
  returning id into v_id;
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (k_cycle, null, 'capabilities', v_id::text, null, v_dec);

  -- 4e. Nine links, AGT-127's order with the three in positions 4-6.
  for i in 1 .. array_length(v_links, 1) loop
    insert into public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order)
    values ('model-assignment', v_links[i], 2, true, i)
    returning id into v_id;
    insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    values (k_cycle, null, 'capability_skill_profiles', v_id::text, null, v_dec);
  end loop;

  -- 4f. The assignment.
  insert into public.agent_capability_assignments (tenant_id, agent_id, capability_slug)
  values ('global', 'devmanager', 'model-assignment')
  returning id into v_id;
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (k_cycle, null, 'agent_capability_assignments', v_id::text, null, v_dec);

  -- 4g. dm-guardrails: image the full row, then APPEND the five (the six standing entries kept).
  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  select k_cycle, null, 'skill_profiles', sp.id::text, to_jsonb(sp), v_dec
    from public.skill_profiles sp where sp.slug = 'dm-guardrails';
  update public.skill_profiles
     set guardrails = jsonb_set(guardrails, '{must_not}', coalesce(guardrails -> 'must_not', '[]'::jsonb) || v_five)
   where slug = 'dm-guardrails';

  if (select count(*) from public.runner_before_images b where b.decision_id = v_dec) <> 15 then
    raise exception 'AGT-144: the agent-row decision carries % of 15 before-images',
      (select count(*) from public.runner_before_images b where b.decision_id = v_dec);
  end if;
end
$rows$;

-- =====================================================================================
-- 5. Assert grants, then the proof in a nested block rolled back by 'agt144-proof'.
-- =====================================================================================
do $proof$
declare
  k_cycle constant uuid := '2ff54656-e599-4866-b309-8e04b4f0a900';
  n       int;
  v_res   jsonb;
  v_dec   uuid;
  v_row   jsonb;
  v_mech  jsonb;
  v_model text;
  v_ids   uuid[];
  i       int;
  v_err   text;
  pass3   jsonb := '[
    {"job_ref":"proof-1","run_at":"2026-09-25","baseline":{"passed":true,"verdict":"none","tokens":1000,"minutes":10},"candidate":{"passed":true,"verdict":"none","tokens":1050,"minutes":10}},
    {"job_ref":"proof-2","run_at":"2026-09-25","baseline":{"passed":true,"verdict":"none","tokens":1000,"minutes":10},"candidate":{"passed":true,"verdict":"none","tokens":1050,"minutes":10}},
    {"job_ref":"proof-3","run_at":"2026-09-25","baseline":{"passed":true,"verdict":"none","tokens":1000,"minutes":10},"candidate":{"passed":true,"verdict":"none","tokens":1050,"minutes":10}}]'::jsonb;
  over3   jsonb := '[
    {"job_ref":"proof-1","run_at":"2026-09-25","baseline":{"passed":true,"verdict":"none","tokens":1000,"minutes":10},"candidate":{"passed":true,"verdict":"none","tokens":1110,"minutes":10}},
    {"job_ref":"proof-2","run_at":"2026-09-25","baseline":{"passed":true,"verdict":"none","tokens":1000,"minutes":10},"candidate":{"passed":true,"verdict":"none","tokens":1110,"minutes":10}},
    {"job_ref":"proof-3","run_at":"2026-09-25","baseline":{"passed":true,"verdict":"none","tokens":1000,"minutes":10},"candidate":{"passed":true,"verdict":"none","tokens":1110,"minutes":10}}]'::jsonb;
begin
  if has_function_privilege('anon', 'public.apply_model_assignment(jsonb, uuid, text)', 'execute')
     or has_function_privilege('authenticated', 'public.apply_model_assignment(jsonb, uuid, text)', 'execute')
     or has_function_privilege('anon', 'public.review_model_watch(uuid, text)', 'execute')
     or has_function_privilege('authenticated', 'public.review_model_watch(uuid, text)', 'execute') then
    raise exception 'AGT-144: a function is executable by anon/authenticated';
  end if;
  if not has_function_privilege('service_role', 'public.apply_model_assignment(jsonb, uuid, text)', 'execute')
     or not has_function_privilege('service_role', 'public.review_model_watch(uuid, text)', 'execute') then
    raise exception 'AGT-144: service_role cannot execute the functions';
  end if;
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname in ('apply_model_assignment', 'review_model_watch');
  if n <> 2 then raise exception 'AGT-144: % overloads of the two functions, expected 2', n; end if;

  begin
    select to_jsonb(m) into v_mech from public.model_assignments m where job_kind = 'lane' and job_key = 'mechanical';

    -- P1. judgment -> claude-opus-5-5 (DOWN), 3 passing trials at 1.05x: moved, images 1 + 54.
    v_res := public.apply_model_assignment(jsonb_build_object('actions', jsonb_build_array(jsonb_build_object(
      'job_kind', 'lane', 'job_key', 'judgment', 'action', 'switch', 'to_model', 'claude-opus-5-5',
      'reason', 'agt144 proof', 'trial_evidence', pass3))), k_cycle, null);
    v_dec := (v_res -> 'actions' -> 0 ->> 'decision_id')::uuid;
    select model_id into v_model from public.model_assignments where job_kind = 'lane' and job_key = 'judgment';
    if v_model <> 'claude-opus-5-5' then raise exception 'AGT-144 P1: judgment on % after the switch', v_model; end if;
    select count(*) into n from public.runner_before_images where decision_id = v_dec and table_name = 'model_assignments';
    if n <> 1 then raise exception 'AGT-144 P1: % model_assignments images, expected 1', n; end if;
    select count(*) into n from public.runner_before_images where decision_id = v_dec and table_name = 'skill_profiles';
    if n <> 54 then raise exception 'AGT-144 P1: % skill_profiles images, expected 54', n; end if;
    select count(*) into n from public.runner_decisions where id = v_dec and kind = 'model-assignment';
    if n <> 1 then raise exception 'AGT-144 P1: no model-assignment decision'; end if;
    select count(*) into n from public.skill_profiles where llm_model = 'claude-opus-5-5';
    if n <> 54 then raise exception 'AGT-144 P1: % Skill rows on claude-opus-5-5, expected 54', n; end if;
    select watch_baseline into v_row from public.model_assignments where job_kind = 'lane' and job_key = 'judgment';
    if not (v_row ?& array['prior_model','prior_decision_id','runs','blocks','escalations','failures'])
       or v_row ->> 'prior_model' <> 'claude-fable-5-1' then
      raise exception 'AGT-144 P1: watch_baseline %', v_row;
    end if;

    -- P2. lane/mechanical UP (sonnet-5 -> opus-5-5) at 1.11x: refused naming 10%.
    v_err := null;
    begin
      perform public.apply_model_assignment(jsonb_build_object('actions', jsonb_build_array(jsonb_build_object(
        'job_kind', 'lane', 'job_key', 'mechanical', 'action', 'switch', 'to_model', 'claude-opus-5-5',
        'reason', 'agt144 proof', 'trial_evidence', over3))), k_cycle, null);
    exception when others then v_err := sqlerrm;
    end;
    if v_err is null or position('10%' in v_err) = 0 or position('lane/mechanical' in v_err) = 0 then
      raise exception 'AGT-144 P2: 1.11x not refused naming 10%% (%)', v_err;
    end if;

    -- P3. 2 trials: refused naming 3.
    v_err := null;
    begin
      perform public.apply_model_assignment(jsonb_build_object('actions', jsonb_build_array(jsonb_build_object(
        'job_kind', 'lane', 'job_key', 'mechanical', 'action', 'switch', 'to_model', 'claude-opus-5-5',
        'reason', 'agt144 proof', 'trial_evidence', pass3 - 2))), k_cycle, null);
    exception when others then v_err := sqlerrm;
    end;
    if v_err is null or position('3 trials' in v_err) = 0 then
      raise exception 'AGT-144 P3: 2 trials not refused naming 3 (%)', v_err;
    end if;

    -- P4. gpt-5: refused.
    v_err := null;
    begin
      perform public.apply_model_assignment(jsonb_build_object('actions', jsonb_build_array(jsonb_build_object(
        'job_kind', 'lane', 'job_key', 'mechanical', 'action', 'switch', 'to_model', 'gpt-5',
        'reason', 'agt144 proof', 'trial_evidence', pass3))), k_cycle, null);
    exception when others then v_err := sqlerrm;
    end;
    if v_err is null or position('Claude models only' in v_err) = 0 then
      raise exception 'AGT-144 P4: gpt-5 not refused (%)', v_err;
    end if;

    -- P5. money: one alert, row unchanged.
    v_res := public.apply_model_assignment(jsonb_build_object('actions', jsonb_build_array(jsonb_build_object(
      'job_kind', 'lane', 'job_key', 'mechanical', 'action', 'money', 'to_model', 'claude-opus-5-5',
      'reason', 'agt144 proof', 'weekly_cost_usd', 12))), k_cycle, null);
    select count(*) into n from public.john_alerts where fingerprint = 'model:mechanical:claude-opus-5-5' and john_call = 'money';
    if n <> 1 then raise exception 'AGT-144 P5: % money alerts', n; end if;
    select to_jsonb(m) into v_row from public.model_assignments m where job_kind = 'lane' and job_key = 'mechanical';
    if v_row <> v_mech then raise exception 'AGT-144 P5: the mechanical row moved on a money ask'; end if;

    -- P6. The watch: 5 fixture cycles on the new model, 2 blocked, against a baseline of 0 -> revert.
    update public.model_assignments
       set watch_baseline = jsonb_build_object('prior_model', 'claude-fable-5-1', 'prior_decision_id', null,
                                               'runs', 5, 'blocks', 0, 'escalations', 0, 'failures', 0)
     where job_kind = 'lane' and job_key = 'judgment';
    v_ids := array[]::uuid[];
    for i in 1 .. 5 loop
      insert into public.runner_cycles (started_at, stamp, trigger, item_id, outcome, model)
      values (now() + (i || ' minutes')::interval, 'agt144-proof-' || i, 'supervised', 'AGT-144', 'shipped', 'claude-opus-5-5')
      returning id into v_dec;
      v_ids := v_ids || v_dec;
    end loop;
    for i in 1 .. 2 loop
      insert into public.runner_verdicts (cycle_id, backlog_id, verdict, gate_build, gate_regression, gate_hygiene, reasoning)
      values (v_ids[i], 'AGT-144', 'block', 'red', 'green', 'green', 'agt144 proof fixture');
    end loop;
    v_res := public.review_model_watch(k_cycle, null);
    select model_id, decision_id into v_model, v_dec from public.model_assignments where job_kind = 'lane' and job_key = 'judgment';
    if v_model <> 'claude-fable-5-1' then raise exception 'AGT-144 P6: judgment on % after the watch (%)', v_model, v_res; end if;
    select count(*) into n from public.runner_decisions where id = v_dec and kind = 'model-revert';
    if n <> 1 then raise exception 'AGT-144 P6: no model-revert decision'; end if;
    select count(*) into n from public.skill_profiles where llm_model = 'claude-fable-5-1';
    if n <> 54 then raise exception 'AGT-144 P6: % Skill rows back on fable, expected 54', n; end if;

    -- P7. The UP branch passes too: capability/bench-report-card (sonnet-4-6 -> opus-5-5) at 1.05x.
    v_res := public.apply_model_assignment(jsonb_build_object('actions', jsonb_build_array(jsonb_build_object(
      'job_kind', 'capability', 'job_key', 'bench-report-card', 'action', 'switch', 'to_model', 'claude-opus-5-5',
      'reason', 'agt144 proof', 'trial_evidence', pass3))), k_cycle, null);
    if v_res -> 'actions' -> 0 ->> 'direction' <> 'up' then raise exception 'AGT-144 P7: %', v_res; end if;
    select model_id into v_model from public.model_assignments where job_kind = 'capability' and job_key = 'bench-report-card';
    if v_model <> 'claude-opus-5-5' then raise exception 'AGT-144 P7: bench-report-card on %', v_model; end if;

    raise exception 'agt144-proof';
  exception when others then
    if sqlerrm <> 'agt144-proof' then raise; end if;
  end;

  -- Rolled back: the lanes and the Skill counts stand as AGT-143 left them.
  select count(*) into n from public.model_assignments
   where (job_kind, job_key, model_id) in (('lane','orchestrator','claude-opus-5'), ('lane','judgment','claude-fable-5-1'),
                                           ('lane','mechanical','claude-sonnet-5'),
                                           ('capability','bench-report-card','claude-sonnet-4-6'))
     and decision_id is null;
  if n <> 4 then raise exception 'AGT-144: model_assignments moved -- the proof did not roll back'; end if;
  select count(*) into n from public.skill_profiles where llm_model = 'claude-fable-5-1';
  if n <> 54 then raise exception 'AGT-144: % fable Skill rows after the proof', n; end if;
  select count(*) into n from public.john_alerts where fingerprint = 'model:mechanical:claude-opus-5-5';
  if n <> 0 then raise exception 'AGT-144: the proof alert survived'; end if;
end
$proof$;
