-- DeepBench v7.0.676 | docs/design/agt-253-design-only-lane.sql | AGT-253 — migration agt253_design_only_lane, mirrored byte-identical
--
-- FEATURE: AGT-253 -- A DESIGN-ONLY LANE THAT STOPS BEFORE THE BUILD. John, verbatim 2026-09-26:
-- "I don't want it to code until I see it first from the designer". Slice 1 of 2.
--   D1 no seventh `design_status`: `designed` + an undecided card + an OPEN question IS the
--      approval state, so nothing new has to be taught to the six predicates that already read it.
--   D2 his yes/no is applied by a TRIGGER on runner_questions, never by a manager turn -- the
--      answer is the act (pattern:9, never a model call where a deterministic mechanism serves).
--   D3 he sees the kickoff and the harvest through the card's dev_link; the Designer's schema has
--      no mock field -- REPORTED as a finding if AGT-252 turns out to need one.
--
-- Down captured FIRST by public.capture_migration_down('8645c247-15b6-4784-9a58-a27bed325673',
-- 'agt253_design_only_lane', [...]) over the three NEW functions and the ONE new trigger -- all four
-- absent at capture time, so the derived down is four DROPs and the classification is auto-downable.
-- NOT in that down, by construction of the capture (naming an existing table refuses the whole
-- capture and nulls the down -- AGT-238's precedent, AGT-240 followed it), so their undo is named
-- here:
--   ALTER TABLE public.projects DROP COLUMN design_only;
--   the data writes of section (2): their runner_before_images rows (cycle 8645c247) carry the
--   prior projects row and the prior AGT-250/251/252 rows under ONE runner_decisions id --
--   reverse_decision() on that id restores all four (projects and backlog_items are both in
--   public.reversible_tables()).
--
-- New functions: SECURITY DEFINER, search_path public, pg_catalog, EXECUTE revoked from PUBLIC,
-- anon and authenticated BY NAME, granted to service_role only
-- (.claude/rules/supabase-column-grants.md). `projects` already carries a TABLE-level SELECT grant
-- to anon and authenticated, measured this session, so the new boolean column is readable by the
-- browser key by construction and needs no column-grant work -- it is a lane flag, not a secret.
-- Governing: docs/ARCHITECTURE.md §19v, §19b.

-- ---------------------------------------------------------------------------------------------
-- (1) The column.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS design_only boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.projects.design_only IS
  'AGT-253 D1: this project''s tickets stop after the design. A cycle that reaches step 6''s kickoff write on a member of a design-only project calls public.design_only_stop() instead and never reaches step 7.';

-- ---------------------------------------------------------------------------------------------
-- (2) The flag, the three tickets, and ONE decision covering both -- images first.
-- ---------------------------------------------------------------------------------------------
do $seed$
declare
  k_cycle  constant uuid := '8645c247-15b6-4784-9a58-a27bed325673';
  v_dec    uuid;
  v_queue  int;
begin
  v_dec := public.record_decision(
    k_cycle, NULL, 'ticket-status', NULL,
    'AGT-253: trainer-authored-agents becomes design-only and AGT-250/251/252 lose needs-desktop',
    'John 2026-09-26: "I don''t want it to code until I see it first from the designer". The three '
    || 'members carried needs-desktop, which pick_blocking_flags() reads, so prime_directive_queue() '
    || 'returned 0 of them and every other predicate already passed. The flag is what was blocking '
    || 'them, and the design-only lane is what replaces it. pattern:8 pattern:9 pattern:17 pattern:19',
    public.ladder_work_class('P10 - Tooling'));

  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data, decision_id)
  select k_cycle, 'projects', p.id::text, to_jsonb(p), v_dec
    from public.projects p where p.slug = 'trainer-authored-agents';

  update public.projects set design_only = true, updated_at = now()
   where slug = 'trainer-authored-agents';

  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data, decision_id)
  select k_cycle, 'backlog_items', b.id::text, to_jsonb(b), v_dec
    from public.backlog_items b where b.backlog_id in ('AGT-250', 'AGT-251', 'AGT-252');

  update public.backlog_items set design_status = NULL, updated_at = now()
   where backlog_id in ('AGT-250', 'AGT-251', 'AGT-252');

  perform public.recompute_backlog_queue();

  -- THE ASSERTION, not the migration's success flag: all three must now be IN the queue. Before
  -- this migration prime_directive_queue() returned 0 of them.
  select count(*)::int into v_queue
    from public.prime_directive_queue() q
   where q.ref in ('AGT-250', 'AGT-251', 'AGT-252');
  if v_queue <> 3 then
    raise exception 'agt253: prime_directive_queue() returns % of AGT-250/251/252, expected 3 -- the flag clear did not reach the pick path', v_queue;
  end if;
end
$seed$;

-- ---------------------------------------------------------------------------------------------
-- (3) ticket_design_only() -- the ticket's project's flag, one home for the predicate.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ticket_design_only(p_backlog_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  -- AGT-253 D1. A ticket reaches its project the one way every other predicate reaches it:
  -- backlog_items.epic_id -> epics.project_id -> projects. coalesce(...,false) so an unfiled
  -- ticket, an epic-less ticket and a project-less epic all read false -- the lane is opt-in.
  SELECT coalesce((
    SELECT pj.design_only
      FROM public.backlog_items b
      JOIN public.epics e ON e.id = b.epic_id
      JOIN public.projects pj ON pj.id = e.project_id
     WHERE b.backlog_id = p_backlog_id
  ), false);
$function$;

REVOKE ALL ON FUNCTION public.ticket_design_only(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ticket_design_only(text) TO service_role;

-- ---------------------------------------------------------------------------------------------
-- (4) design_only_stop() -- ONE call replaces step 6's kickoff write on a design-only ticket.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.design_only_stop(
  p_cycle_id uuid, p_backlog_id text, p_kickoff_path text,
  p_plain_cant text, p_plain_after text, p_plain_worth text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_bi    public.backlog_items%ROWTYPE;
  v_card  uuid;
  v_ruled jsonb;
  v_img   uuid;
  v_dec   uuid;
  v_qid   text;
begin
  -- 1. VALIDATION, ALL OF IT BEFORE ANY WRITE (apply_gate_rulings' own rule): a half-applied stop
  --    would leave a ticket `designed` with no card to answer, which is the state this lane exists
  --    to make impossible.
  select * into v_bi from public.backlog_items b where b.backlog_id = p_backlog_id;
  if not found then
    raise exception 'design_only_stop: no backlog_items row %', p_backlog_id;
  end if;
  if not public.ticket_design_only(p_backlog_id) then
    raise exception 'design_only_stop: % is not on a design-only project -- step 6 writes the kickoff itself and step 7 builds it', p_backlog_id;
  end if;
  if v_bi.claimed_by is distinct from p_cycle_id::text then
    raise exception 'design_only_stop: % is claimed by % , not by cycle % -- a cycle stops only its own ticket',
      p_backlog_id, coalesce(v_bi.claimed_by, '<nobody>'), p_cycle_id;
  end if;
  if p_kickoff_path is null or p_kickoff_path not like 'docs/kickoffs/%.md' then
    raise exception 'design_only_stop: kickoff path % is not docs/kickoffs/<name>.md -- the card''s link is what John opens', coalesce(p_kickoff_path, '<NULL>');
  end if;
  if coalesce(btrim(p_plain_cant), '') = '' or coalesce(btrim(p_plain_after), '') = ''
     or coalesce(btrim(p_plain_worth), '') = '' then
    raise exception 'design_only_stop: all three plain-language texts are required (pattern:154 -- what you cannot do today, what you could do after, why it is worth it)';
  end if;
  if exists (select 1 from public.runner_items ri
              where ri.backlog_id = p_backlog_id
                and ri.kind = 'gated_before_build' and ri.decision is null) then
    raise exception 'design_only_stop: % already carries an undecided gated_before_build card -- it is already on John''s desk', p_backlog_id;
  end if;

  -- 2. THE CARD. An INSERT, so its before-image is row_data NULL (SES-150): there is no prior row,
  --    and reverse_decision() reads a NULL image as "delete this row again".
  insert into public.runner_items
    (cycle_id, backlog_id, kind, title, value_case, dev_link, plain_cant, plain_after, plain_worth)
  values
    (p_cycle_id, p_backlog_id, 'gated_before_build',
     p_backlog_id || ' — design ready for John',
     p_kickoff_path,
     'https://github.com/roadmapventure/deepbench-frontend/blob/dev/' || p_kickoff_path,
     btrim(p_plain_cant), btrim(p_plain_after), btrim(p_plain_worth))
  returning id into v_card;

  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data)
  values (p_cycle_id, 'runner_items', v_card::text, NULL)
  returning id into v_img;

  -- 3. THE RULING. `john` writes no card stamp on purpose (AGT-127 3a): the card stays undecided,
  --    and the OPEN gate-card-<8> question is what stops runner_should_boot() firing this branch
  --    again. apply_gate_rulings() mints the one decision handle both sides hang off.
  v_ruled := public.apply_gate_rulings(
    jsonb_build_array(jsonb_build_object(
      'card_id', v_card::text,
      'ruling', 'john',
      'reason', format('AGT-253: %s is on a design-only project, so the design stops here for John to see first.', p_backlog_id),
      'ticket_note', 'yes = build it next pick; no = the Designer redoes it with your note',
      'patterns_applied', jsonb_build_array(9, 19, 154))),
    p_cycle_id, NULL);
  v_dec := (v_ruled ->> 'decision_id')::uuid;
  v_qid := (v_ruled -> 'questions' ->> 0);

  update public.runner_before_images set decision_id = v_dec where id = v_img;

  -- 4. THE TICKET SIDE, image first. `designed` + kickoff_link in ONE write -- SES-112's
  --    ck_design_status_kickoff refuses `designed` without a link, so the two are one act or
  --    neither.
  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data, decision_id)
  values (p_cycle_id, 'backlog_items', v_bi.id::text, to_jsonb(v_bi), v_dec);

  update public.backlog_items
     set kickoff_link = p_kickoff_path, design_status = 'designed', updated_at = now()
   where id = v_bi.id;

  perform public.recompute_backlog_queue();

  return jsonb_build_object(
    'backlog_id', p_backlog_id,
    'card_id', v_card,
    'decision_id', v_dec,
    'question_qid', v_qid,
    'kickoff_path', p_kickoff_path,
    'design_status', 'designed',
    'next', 'close the cycle gated_before_build; never step 7');
end
$function$;

REVOKE ALL ON FUNCTION public.design_only_stop(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.design_only_stop(uuid, text, text, text, text, text) TO service_role;

-- ---------------------------------------------------------------------------------------------
-- (5) The trigger -- John's yes/no IS the act (D2). No manager turn, no model call.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.design_only_answer_applies()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_card public.runner_items%ROWTYPE;
  v_bi   public.backlog_items%ROWTYPE;
  v_dec  uuid;
  v_note text;
begin
  -- FIRES ON THE TRANSITION ONLY, never on a re-save of an already-answered row, and never on a
  -- question that is not a gate card's. Everything else returns untouched -- this trigger sits on
  -- a table every ruling path writes, so a broad match here would fire on other people's rows.
  if NEW.status <> 'answered' or coalesce(OLD.status, '') = 'answered' then
    return NEW;
  end if;
  if NEW.qid not like 'gate-card-%' or NEW.answer is null then
    return NEW;
  end if;

  select * into v_card from public.runner_items ri
   where ri.kind = 'gated_before_build'
     and ri.decision is null
     and left(ri.id::text, 8) = substring(NEW.qid from 11);
  if not found or v_card.backlog_id is null then
    return NEW;
  end if;
  if not public.ticket_design_only(v_card.backlog_id) then
    return NEW;   -- AGT-127's own gate cards keep their manager ruling; this lane takes only its own.
  end if;

  v_note := coalesce(nullif(btrim(NEW.answer_note), ''), '(no note)');

  -- ONE decision, attributed to the cycle that acted if there is one and to John's own answer if
  -- there is not (ck_decision_attribution: exactly one of the two).
  v_dec := public.record_decision(
    NEW.acted_cycle,
    case when NEW.acted_cycle is null then 'john-answer:' || NEW.qid end,
    'ticket-status', v_card.backlog_id,
    format('AGT-253: John answered %s on %s — %s', NEW.answer, v_card.backlog_id,
           case when NEW.answer = 'yes' then 'the design is approved; the build picks it up next'
                else 'the Designer redoes it' end),
    format('Gate card %s (%s) on question %s. John: %s. Applied by the trigger, not by a manager turn (AGT-253 D2). pattern:9 pattern:10 pattern:19',
           v_card.id, v_card.title, NEW.qid, v_note),
    public.ladder_work_class('P10 - Tooling'));

  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  values (NEW.acted_cycle, case when NEW.acted_cycle is null then 'john-answer:' || NEW.qid end,
          'runner_items', v_card.id::text, to_jsonb(v_card), v_dec);

  if NEW.answer = 'yes' then
    update public.runner_items
       set decision = 'accept',
           decision_reason = format('AGT-253: John said yes on %s — build it next pick. %s', NEW.qid, v_note),
           decided_at = now()
     where id = v_card.id;
  else
    update public.runner_items
       set decision = 'rework',
           decision_reason = format('AGT-253: John said no on %s — the Designer redoes it. %s', NEW.qid, v_note),
           decided_at = now()
     where id = v_card.id;

    select * into v_bi from public.backlog_items b where b.backlog_id = v_card.backlog_id;
    if found then
      insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
      values (NEW.acted_cycle, case when NEW.acted_cycle is null then 'john-answer:' || NEW.qid end,
              'backlog_items', v_bi.id::text, to_jsonb(v_bi), v_dec);

      update public.backlog_items
         set design_status = NULL,
             scope_rationale = ltrim(coalesce(v_bi.scope_rationale, '') || E'\n' ||
               format('AGT-253 John declined %s: %s', to_char(now(), 'YYYY-MM-DD'), v_note), E'\n'),
             updated_at = now()
       where id = v_bi.id;
    end if;
  end if;

  perform public.recompute_backlog_queue();
  return NEW;
end
$function$;

REVOKE ALL ON FUNCTION public.design_only_answer_applies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.design_only_answer_applies() TO service_role;

DROP TRIGGER IF EXISTS trg_runner_questions_design_only ON public.runner_questions;
CREATE TRIGGER trg_runner_questions_design_only
  AFTER UPDATE OF status ON public.runner_questions
  FOR EACH ROW EXECUTE FUNCTION public.design_only_answer_applies();

-- ---------------------------------------------------------------------------------------------
-- (6) TWO PROBES, in a nested block ending in the sentinel `agt253-probe-rollback` so every
--     fixture row rolls back to the savepoint. The migration ABORTS on any mismatch: the probes
--     are the assertion, never the success flag (.claude/rules/supabase-function-signature.md's
--     "never trust the migration's success flag").
-- ---------------------------------------------------------------------------------------------
do $probes$
declare
  k_cycle constant uuid := '8645c247-15b6-4784-9a58-a27bed325673';
  k_path  constant text := 'docs/kickoffs/v7.0.999-AGT-250-probe.md';
  v_res   jsonb;
  v_qid   text;
  v_n     int;
  v_dec   text;
  v_ds    text;
  v_sr    text;
begin
  begin
    -- ---- PROBE 1: the stop, then `yes`. -----------------------------------------------------
    -- THE CONTROL COMES FIRST, BEFORE THE CLAIM, and that ordering is the probe's whole point.
    -- A claimed ticket is already out of prime_directive_queue() on the claim predicate, so
    -- measuring the queue while this probe holds the claim would read 0 for a reason that has
    -- nothing to do with the card and would pass even if the card did nothing (pattern:74/75 --
    -- a green that cannot go red is not evidence). Measured here on the first run: the original
    -- ordering read 0 BEFORE the stop.
    select count(*)::int into v_n from public.prime_directive_queue() q where q.ref = 'AGT-250';
    if v_n <> 1 then raise exception 'agt253 probe 1: AGT-250 is not in the queue before the stop (got %)', v_n; end if;

    update public.backlog_items set claimed_by = k_cycle::text, claimed_at = now()
     where backlog_id = 'AGT-250';

    v_res := public.design_only_stop(k_cycle, 'AGT-250', k_path,
      'John cannot see a design before the runner builds it.',
      'John sees the kickoff first and says yes or no on his own card.',
      'A wrong design costs one design, not one design plus one build.');
    v_qid := v_res ->> 'question_qid';

    select decision into v_dec from public.runner_items where id = (v_res ->> 'card_id')::uuid;
    if v_dec is not null then raise exception 'agt253 probe 1: the card must stay UNDECIDED after a john ruling (got %)', v_dec; end if;

    select count(*)::int into v_n from public.runner_questions where qid = v_qid and status = 'open';
    if v_n <> 1 then raise exception 'agt253 probe 1: the gate-card question must be OPEN (got % row(s))', v_n; end if;

    select design_status into v_ds from public.backlog_items where backlog_id = 'AGT-250';
    if v_ds is distinct from 'designed' then raise exception 'agt253 probe 1: AGT-250 must read designed (got %)', coalesce(v_ds, '<NULL>'); end if;

    -- RELEASE THE CLAIM, exactly as step 1's close-out does, so the next two queue readings
    -- isolate the CARD as the only remaining exclusion. Without this the readings are vacuous.
    update public.backlog_items set claimed_by = NULL, claimed_at = NULL where backlog_id = 'AGT-250';

    select count(*)::int into v_n from public.prime_directive_queue() q where q.ref = 'AGT-250';
    if v_n <> 0 then raise exception 'agt253 probe 1: the undecided card must take AGT-250 OUT of the queue with the claim released (got %)', v_n; end if;

    update public.runner_questions
       set status = 'answered', answer = 'yes', answered_at = now(),
           answer_note = 'probe yes', acted_cycle = k_cycle
     where qid = v_qid;

    select decision into v_dec from public.runner_items where id = (v_res ->> 'card_id')::uuid;
    if v_dec is distinct from 'accept' then raise exception 'agt253 probe 1: `yes` must stamp the card accept (got %)', coalesce(v_dec, '<NULL>'); end if;

    select count(*)::int into v_n from public.prime_directive_queue() q where q.ref = 'AGT-250';
    if v_n <> 1 then raise exception 'agt253 probe 1: AGT-250 must RETURN to the queue once the card is decided (got %)', v_n; end if;

    raise exception 'agt253-probe-rollback';
  exception when others then
    if SQLERRM <> 'agt253-probe-rollback' then raise; end if;
  end;

  begin
    -- ---- PROBE 2: the stop, then `no`. ------------------------------------------------------
    update public.backlog_items set claimed_by = k_cycle::text, claimed_at = now()
     where backlog_id = 'AGT-250';

    v_res := public.design_only_stop(k_cycle, 'AGT-250', k_path,
      'John cannot see a design before the runner builds it.',
      'John sees the kickoff first and says yes or no on his own card.',
      'A wrong design costs one design, not one design plus one build.');
    v_qid := v_res ->> 'question_qid';

    update public.backlog_items set claimed_by = NULL, claimed_at = NULL where backlog_id = 'AGT-250';

    update public.runner_questions
       set status = 'answered', answer = 'no', answered_at = now(),
           answer_note = 'the mock is missing', acted_cycle = k_cycle
     where qid = v_qid;

    select decision into v_dec from public.runner_items where id = (v_res ->> 'card_id')::uuid;
    if v_dec is distinct from 'rework' then raise exception 'agt253 probe 2: `no` must stamp the card rework (got %)', coalesce(v_dec, '<NULL>'); end if;

    select design_status, scope_rationale into v_ds, v_sr from public.backlog_items where backlog_id = 'AGT-250';
    if v_ds is not null then raise exception 'agt253 probe 2: `no` must NULL the design flag (got %)', v_ds; end if;
    if v_sr is null or v_sr not like '%AGT-253 John declined%the mock is missing%' then
      raise exception 'agt253 probe 2: `no` must append John''s note to scope_rationale (got %)', coalesce(right(v_sr, 120), '<NULL>');
    end if;

    raise exception 'agt253-probe-rollback';
  exception when others then
    if SQLERRM <> 'agt253-probe-rollback' then raise; end if;
  end;
end
$probes$;

-- ---------------------------------------------------------------------------------------------
-- (7) Catalog assertion in the SAME transaction that wrote the objects -- exactly ONE overload of
--     each new function and exactly ONE trigger, so no stale overload can survive
--     (.claude/rules/supabase-function-signature.md).
-- ---------------------------------------------------------------------------------------------
do $assert$
declare
  v_n int;
  v_name text;
begin
  foreach v_name in array array['ticket_design_only', 'design_only_stop', 'design_only_answer_applies'] loop
    select count(*)::int into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = v_name and p.prokind = 'f';
    if v_n <> 1 then raise exception 'agt253: public.% has % overload(s), expected exactly 1', v_name, v_n; end if;
    -- BY OID, never by the identity-argument TEXT: pg_get_function_identity_arguments() returns
    -- `p_backlog_id text` (parameter names included), which is not a valid type list for the text
    -- form of has_function_privilege and raises 42601. Measured here on the first run.
    if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 cross join unnest(array['anon', 'authenticated']) g
                where n.nspname = 'public' and p.proname = v_name and p.prokind = 'f'
                  and has_function_privilege(g, p.oid, 'execute')) then
      raise exception 'agt253: public.% is executable by anon or authenticated -- these are service_role only', v_name;
    end if;
  end loop;

  select count(*)::int into v_n from pg_trigger
   where tgname = 'trg_runner_questions_design_only'
     and tgrelid = 'public.runner_questions'::regclass and not tgisinternal;
  if v_n <> 1 then raise exception 'agt253: trg_runner_questions_design_only is present % time(s), expected 1', v_n; end if;

  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'projects' and column_name = 'design_only') then
    raise exception 'agt253: public.projects.design_only did not land';
  end if;
end
$assert$;
