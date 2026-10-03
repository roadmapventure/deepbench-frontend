-- DeepBench v7.0.662 | docs/design/agt-240-project-finish-line.sql | AGT-240 — migration agt240_project_finish_line, mirrored byte-identical
--
-- FEATURE: AGT-240 -- PROJECTS GET A FINISH LINE. John, verbatim 2026-09-27 (Q2): "a project list is
-- locked, anything found goes into a list. Once a project is finished, the auditor and dev manager
-- review the current functionality, review the auditor list, and propose a new project with ticket
-- counts and why to me. then i decide if the routine is going to pick a new project." (Q3): "it should
-- be stored in the database as proposed tickets and projects".
--   D1 a batch IS an epic (epics.locked_at).        D2 finished = every locked member done/removed.
--   D3 findings wait as `listed`.                   D4 Auditor turn, then manager turn, ONE proposal.
--   D5 only a session starts one, on John's words.  D6 a perpetual project's finish -> paused.
--   D7 the backfill cut is 2026-09-24T05:00Z.       D8 reverse_decision() may restore `projects`.
--
-- Down captured FIRST by public.capture_migration_down(cycle fe346b72, 'agt240_project_finish_line')
-- for the four edited functions (finding_group_epic, apply_audit_review, reverse_decision,
-- reversible_tables), the five new functions, the new trigger and the new view. Not in that down, by
-- construction of the capture (an in-place ALTER or a replaced CHECK is refused, and naming one would
-- null the whole down -- AGT-238's precedent), so their undo is named here:
--   ALTER TABLE public.projects DROP CONSTRAINT projects_status_check,
--     ADD CONSTRAINT projects_status_check CHECK (status IN ('planned','executing','paused','done')),
--     DROP COLUMN perpetual, DROP COLUMN proposal_reason, DROP COLUMN proposed_at;   (no `proposed` row first)
--   ALTER TABLE public.epics DROP COLUMN locked_at, DROP COLUMN finished_at;
--   ALTER TABLE public.audit_findings DROP CONSTRAINT audit_findings_status_check, ADD CONSTRAINT
--     audit_findings_status_check CHECK (status IN ('open','resolved','not-a-defect','ticketed','carried','escalated'));
--     (after every `listed` row is re-ruled)
--   the capability / link / assignment / Skill rows: their runner_before_images rows (cycle fe346b72)
--   -- NULL images are inserts (delete them), the dm-audit-review-intent image restores method/traits.
--
-- Edited functions are pg_get_functiondef() LIVE at apply time with ONLY the kickoff's edits, made by
-- exact-fragment replace: each fragment must occur exactly once or the migration refuses.
-- New functions: SECURITY DEFINER, search_path public, pg_catalog, EXECUTE revoked from PUBLIC, anon
-- and authenticated BY NAME, granted to service_role (.claude/rules/supabase-column-grants.md).
-- Governing: ARCHITECTURE.md §19v, §19b, §19d/§19e Rule #1, §19k.

-- ---------------------------------------------------------------------------------------------
-- (1) Columns and CHECKs.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.projects DROP CONSTRAINT projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check
  CHECK (status = ANY (ARRAY['planned'::text, 'executing'::text, 'paused'::text, 'done'::text, 'proposed'::text]));
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS perpetual boolean NOT NULL DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS proposal_reason text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS proposed_at timestamptz;
COMMENT ON COLUMN public.projects.perpetual IS
  'AGT-240 D6: a perpetual routine project (charter). Its finished batch sends it to paused, not done, and its next batch may be proposed under the same slug (a new epic).';
COMMENT ON COLUMN public.projects.proposal_reason IS
  'AGT-240: why The Development Manager proposed this project -- what John cannot do today, what he can do after, why now. Written by finish_project_batch().';
COMMENT ON COLUMN public.projects.proposed_at IS 'AGT-240: when finish_project_batch() proposed this project.';

INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT 'fe346b72-3e94-41e6-999c-572150456327'::uuid, 'projects', p.id::text, to_jsonb(p)
  FROM public.projects p WHERE p.slug IN ('dev-manager-capabilities', 'agent-training');
UPDATE public.projects SET perpetual = true WHERE slug IN ('dev-manager-capabilities', 'agent-training');

ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS finished_at timestamptz;
COMMENT ON COLUMN public.epics.locked_at IS
  'AGT-240 D1: when this batch''s list was fixed (the project started executing). A locked epic takes no new ticket that is not john-named (epic_lock_guard).';
COMMENT ON COLUMN public.epics.finished_at IS
  'AGT-240 D2: when every member was done or removed and finish_project_batch() proposed the next project.';

ALTER TABLE public.audit_findings DROP CONSTRAINT audit_findings_status_check;
ALTER TABLE public.audit_findings ADD CONSTRAINT audit_findings_status_check
  CHECK (status = ANY (ARRAY['open'::text, 'resolved'::text, 'not-a-defect'::text, 'ticketed'::text, 'carried'::text, 'escalated'::text, 'listed'::text]));

-- ---------------------------------------------------------------------------------------------
-- (2) The lock: a findings-born ticket cannot enter a locked epic.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.epic_lock_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_name text;
BEGIN
  -- AGT-240 (b): a project's list is locked when it starts executing. John naming a ticket into it is
  -- his own call (john-named passes); everything else waits on the findings list. An UPDATE that
  -- leaves epic_id where it was is not a move -- reverse_decision() rewrites every column of a row
  -- it restores, and that must not trip the lock.
  IF NEW.epic_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.epic_id IS NOT DISTINCT FROM OLD.epic_id THEN RETURN NEW; END IF;
  IF coalesce(NEW.scope_origin, '') = 'john-named' THEN RETURN NEW; END IF;
  SELECT e.name INTO v_name FROM public.epics e WHERE e.id = NEW.epic_id AND e.locked_at IS NOT NULL;
  IF v_name IS NOT NULL THEN
    RAISE EXCEPTION 'AGT-240: epic % is locked; the finding waits on the findings list', v_name
      USING errcode = 'check_violation';
  END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS epic_lock_guard ON public.backlog_items;
CREATE TRIGGER epic_lock_guard BEFORE INSERT OR UPDATE OF epic_id ON public.backlog_items
  FOR EACH ROW EXECUTE FUNCTION public.epic_lock_guard();

-- ---------------------------------------------------------------------------------------------
-- (3) The four edited functions, from their LIVE definitions.
-- ---------------------------------------------------------------------------------------------
DO $edit$
DECLARE
  v_def text;
  v_old text;
  v_new text;
  v_n   int;
  v_pairs text[][];
  i     int;
BEGIN
  -- (3a) finding_group_epic(): an executing/proposed/done project's list is locked; epics must be unlocked.
  v_def := pg_get_functiondef('public.finding_group_epic(jsonb)'::regprocedure);
  v_pairs := ARRAY[
    ARRAY[$o$  v_epic uuid;
BEGIN$o$, $o$  v_epic uuid;
  v_pst  text;   -- AGT-240: the routed project's status
BEGIN$o$],
    ARRAY[$o$    SELECT count(*), min(e.id::text)::uuid INTO v_rc, v_epic
      FROM public.epics e JOIN public.projects p ON p.id = e.project_id
     WHERE p.slug = v_slug;$o$, $o$    -- AGT-240 (b): an executing, proposed or done project's list is locked.
    SELECT p.status INTO v_pst FROM public.projects p WHERE p.slug = v_slug;
    IF v_pst IN ('executing', 'proposed', 'done') THEN
      RAISE EXCEPTION 'apply_audit_review: project % is % -- its list is locked; use kind list (AGT-240)', v_slug, v_pst;
    END IF;
    SELECT count(*), min(e.id::text)::uuid INTO v_rc, v_epic
      FROM public.epics e JOIN public.projects p ON p.id = e.project_id
     WHERE p.slug = v_slug AND e.locked_at IS NULL;$o$],
    ARRAY[$o$  SELECT count(*), min(e.id::text)::uuid INTO v_rc, v_epic
    FROM public.epics e JOIN public.projects p ON p.id = e.project_id
   WHERE p.slug = v_pick;$o$, $o$  -- AGT-240 (b): the manager's pick is refused into a locked list the same way.
  SELECT p.status INTO v_pst FROM public.projects p WHERE p.slug = v_pick;
  IF v_pst IN ('executing', 'proposed', 'done') THEN
    RAISE EXCEPTION 'apply_audit_review: project % is % -- its list is locked; use kind list (AGT-240)', v_pick, v_pst;
  END IF;
  SELECT count(*), min(e.id::text)::uuid INTO v_rc, v_epic
    FROM public.epics e JOIN public.projects p ON p.id = e.project_id
   WHERE p.slug = v_pick AND e.locked_at IS NULL;$o$]
  ];
  FOR i IN 1 .. array_length(v_pairs, 1) LOOP
    v_old := v_pairs[i][1];
    v_n := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
    IF v_n <> 1 THEN RAISE EXCEPTION 'agt240: finding_group_epic fragment % occurs % times, not 1', i, v_n; END IF;
    v_def := replace(v_def, v_old, v_pairs[i][2]);
  END LOOP;
  EXECUTE v_def;

  -- (3b) apply_audit_review(): kind `list` (needs a reason) -> status listed; counts gain `listed`.
  v_def := pg_get_functiondef('public.apply_audit_review(uuid, text, text, jsonb)'::regprocedure);
  v_pairs := ARRAY[
    ARRAY[$o$ARRAY['root-cause','cleanup','not-a-defect','carry','escalate'];$o$,
          $o$ARRAY['root-cause','cleanup','not-a-defect','carry','escalate','list'];  -- AGT-240: list$o$],
    ARRAY[$o$  v_c_escalated int := 0;$o$, $o$  v_c_escalated int := 0;
  v_c_listed int := 0;           -- AGT-240: findings ruled onto the findings list$o$],
    ARRAY[$o$is not one of root-cause, cleanup, not-a-defect, carry, escalate', v_kind;$o$,
          $o$is not one of root-cause, cleanup, not-a-defect, carry, escalate, list', v_kind;$o$],
    ARRAY[$o$    ELSIF v_kind = 'escalate' THEN
      IF NOT$o$, $o$    ELSIF v_kind = 'list' THEN
      -- AGT-240 D3: a finding whose project's list is locked waits on the findings list, with a reason.
      IF coalesce(btrim(g ->> 'reason'), '') = '' THEN
        RAISE EXCEPTION 'apply_audit_review: list needs a reason';
      END IF;
    ELSIF v_kind = 'escalate' THEN
      IF NOT$o$],
    ARRAY[$o$    ELSIF v_kind = 'escalate' THEN v_c_escalated := v_c_escalated + jsonb_array_length(g -> 'finding_ids');$o$,
          $o$    ELSIF v_kind = 'escalate' THEN v_c_escalated := v_c_escalated + jsonb_array_length(g -> 'finding_ids');
    ELSIF v_kind = 'list' THEN v_c_listed := v_c_listed + jsonb_array_length(g -> 'finding_ids');$o$],
    ARRAY[$o$      ELSIF v_kind = 'escalate' THEN
        UPDATE public.audit_findings SET status = 'escalated'$o$, $o$      ELSIF v_kind = 'list' THEN
        UPDATE public.audit_findings SET status = 'listed', ruling = g ->> 'reason',
               ruled_by = 'devmanager', ruled_at = now() WHERE id = f.id;
      ELSIF v_kind = 'escalate' THEN
        UPDATE public.audit_findings SET status = 'escalated'$o$],
    ARRAY[$o$'escalated', v_c_escalated, 'tickets_filed'$o$, $o$'escalated', v_c_escalated, 'listed', v_c_listed, 'tickets_filed'$o$]
  ];
  FOR i IN 1 .. array_length(v_pairs, 1) LOOP
    v_old := v_pairs[i][1];
    v_n := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
    IF v_n <> 1 THEN RAISE EXCEPTION 'agt240: apply_audit_review fragment % occurs % times, not 1', i, v_n; END IF;
    v_def := replace(v_def, v_old, v_pairs[i][2]);
  END LOOP;
  EXECUTE v_def;

  -- (3c) reverse_decision(): k_allowed gains 'projects' after 'epics' (D8).
  v_def := pg_get_functiondef('public.reverse_decision(uuid, text, text, uuid)'::regprocedure);
  v_old := $o$    'epics',               -- IN: an epic's membership or status is decided
$o$;
  v_new := $o$    'epics',               -- IN: an epic's membership or status is decided
    'projects',            -- IN: AGT-240 D8 -- a project's status and proposal are decided (has updated_at)
$o$;
  v_n := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
  IF v_n <> 1 THEN RAISE EXCEPTION 'agt240: reverse_decision k_allowed fragment occurs % times, not 1', v_n; END IF;
  EXECUTE replace(v_def, v_old, v_new);

  -- (3d) reversible_tables(): its twin, widened in the same migration (SES-399).
  v_def := pg_get_functiondef('public.reversible_tables()'::regprocedure);
  v_old := $o$    'epics',
$o$;
  v_new := $o$    'epics',
    'projects',
$o$;
  v_n := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
  IF v_n <> 1 THEN RAISE EXCEPTION 'agt240: reversible_tables fragment occurs % times, not 1', v_n; END IF;
  EXECUTE replace(v_def, v_old, v_new);
END
$edit$;

-- ---------------------------------------------------------------------------------------------
-- (4) project_batch_state(): one row per project epic; proposal_due is the finish line (D2).
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.project_batch_state()
 RETURNS TABLE(slug text, status text, perpetual boolean, epic_id uuid, epic_name text,
               locked_at timestamptz, finished_at timestamptz, members integer, "left" integer,
               proposal_due boolean)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  -- AGT-240 D2: `left` = members not done/removed. A batch is due its proposal when the project is
  -- executing, the list is locked, it has members, none is left, and it has not finished already.
  SELECT p.slug, p.status, p.perpetual, e.id, e.name, e.locked_at, e.finished_at,
         count(b.id)::integer,
         (count(b.id) FILTER (WHERE b.status NOT IN ('done', 'removed')))::integer,
         (p.status = 'executing' AND e.locked_at IS NOT NULL AND e.finished_at IS NULL
          AND count(b.id) > 0
          AND count(b.id) FILTER (WHERE b.status NOT IN ('done', 'removed')) = 0)
    FROM public.projects p
    JOIN public.epics e ON e.project_id = p.id
    LEFT JOIN public.backlog_items b ON b.epic_id = e.id
   GROUP BY p.slug, p.status, p.perpetual, e.id, e.name, e.locked_at, e.finished_at
   ORDER BY p.slug, e.name;
$function$;

-- ---------------------------------------------------------------------------------------------
-- (5) finish_project_batch(): the finish. ONE decision `proposal`, images first.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finish_project_batch(p_cycle_id uuid, p_session_name text, p_epic uuid, p_proposal jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_state    record;
  v_proj     public.projects%ROWTYPE;
  v_target   public.projects%ROWTYPE;
  v_epic     public.epics%ROWTYPE;
  f          public.audit_findings%ROWTYPE;
  v_slug     text;
  v_name     text;
  v_charter  text;
  v_reason   text;
  v_tickets  jsonb;
  t          jsonb;
  v_i        int := 0;
  v_id       text;
  v_st       text;
  v_seen     text[] := ARRAY[]::text[];
  v_eff      text;
  v_after    text;
  v_dec      uuid;
  v_by       text := coalesce(p_session_name, 'cycle ' || p_cycle_id::text);
  v_new_proj boolean;
  v_target_id uuid;
  v_epic_new uuid := gen_random_uuid();
  v_n        int;
  v_last     int;
  v_next     int;
  v_ord      int;
  v_bid      text;
  v_pc       text;
  v_lines    text;
  v_new_uuid uuid;
  v_filed    text[] := ARRAY[]::text[];
  v_found    int := 0;
  v_patterns text;
BEGIN
  -- 1. Validation, all before any write.
  IF NOT ((p_cycle_id IS NOT NULL) <> (p_session_name IS NOT NULL)) THEN
    RAISE EXCEPTION 'finish_project_batch: exactly one of p_cycle_id / p_session_name';
  END IF;
  SELECT * INTO v_state FROM public.project_batch_state() s WHERE s.epic_id = p_epic;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'finish_project_batch: epic % is not due a proposal (an executing project, a locked list, every member done or removed, not yet finished)', p_epic;
  END IF;
  IF NOT coalesce(v_state.proposal_due, false) THEN
    RAISE EXCEPTION 'finish_project_batch: epic % is not due a proposal (an executing project, a locked list, every member done or removed, not yet finished)', p_epic;
  END IF;
  SELECT * INTO v_epic FROM public.epics e WHERE e.id = p_epic FOR UPDATE;
  SELECT * INTO v_proj FROM public.projects p WHERE p.id = v_epic.project_id FOR UPDATE;

  v_slug := btrim(coalesce(p_proposal ->> 'slug', ''));
  v_name := btrim(coalesce(p_proposal ->> 'name', ''));
  v_charter := btrim(coalesce(p_proposal ->> 'charter', ''));
  v_reason := btrim(coalesce(p_proposal ->> 'reason', ''));
  IF v_slug = '' OR v_name = '' OR v_charter = '' OR v_reason = '' THEN
    RAISE EXCEPTION 'finish_project_batch: proposal needs slug, name, charter and reason';
  END IF;
  IF v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'finish_project_batch: proposal slug % is not lowercase words joined by hyphens', v_slug;
  END IF;
  v_tickets := p_proposal -> 'tickets';
  IF jsonb_typeof(v_tickets) IS DISTINCT FROM 'array' OR jsonb_array_length(v_tickets) = 0 THEN
    RAISE EXCEPTION 'finish_project_batch: proposal needs at least one ticket';
  END IF;
  FOR t IN SELECT value FROM jsonb_array_elements(v_tickets) LOOP
    v_i := v_i + 1;
    IF jsonb_typeof(t) IS DISTINCT FROM 'object'
       OR coalesce(btrim(t ->> 'title'), '') = '' OR coalesce(btrim(t ->> 'root_cause'), '') = ''
       OR coalesce(btrim(t ->> 'fix'), '') = '' OR coalesce(btrim(t ->> 'priority_class'), '') = ''
       OR jsonb_typeof(t -> 'predicted_cycles') IS DISTINCT FROM 'number'
       OR jsonb_typeof(t -> 'finding_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(t -> 'finding_ids') = 0 THEN
      RAISE EXCEPTION 'finish_project_batch: ticket % needs title, root_cause, fix, priority_class, predicted_cycles and finding_ids', v_i;
    END IF;
    IF (t ->> 'priority_class') !~ '^P([1-9]|10) - \S' THEN
      RAISE EXCEPTION 'finish_project_batch: ticket % priority_class % is not a named class (P1 - ... to P10 - ...)', v_i, t ->> 'priority_class';
    END IF;
    IF (t ->> 'predicted_cycles')::numeric < 1 OR (t ->> 'predicted_cycles')::numeric <> floor((t ->> 'predicted_cycles')::numeric) THEN
      RAISE EXCEPTION 'finish_project_batch: ticket % predicted_cycles must be a whole number of at least 1', v_i;
    END IF;
    FOR v_id IN SELECT jsonb_array_elements_text(t -> 'finding_ids') LOOP
      v_st := NULL;
      SELECT a.status INTO v_st FROM public.audit_findings a WHERE a.id::text = v_id;
      IF v_st IS NULL OR v_st NOT IN ('open', 'carried', 'listed') THEN
        RAISE EXCEPTION 'finish_project_batch: finding % is not open, carried or listed', v_id;
      END IF;
      IF v_id = ANY (v_seen) THEN
        RAISE EXCEPTION 'finish_project_batch: finding % in two tickets', v_id;
      END IF;
      v_seen := v_seen || v_id;
    END LOOP;
  END LOOP;

  -- The finishing project leaves executing in this same call (D6), so its own slug is judged by the
  -- status it is about to have.
  v_after := CASE WHEN v_proj.perpetual THEN 'paused' ELSE 'done' END;
  SELECT * INTO v_target FROM public.projects p WHERE p.slug = v_slug FOR UPDATE;
  v_new_proj := NOT FOUND;
  IF NOT v_new_proj THEN
    v_eff := CASE WHEN v_target.id = v_proj.id THEN v_after ELSE v_target.status END;
    IF v_eff NOT IN ('planned', 'paused', 'done') THEN
      RAISE EXCEPTION 'finish_project_batch: project % is %; a proposal names a new slug or a planned, paused or done project', v_slug, v_eff;
    END IF;
  END IF;

  -- 2. ONE decision. John reads the reason; the ticket counts ride the summary.
  SELECT coalesce(string_agg('pattern:' || x, ' '), 'pattern:0') INTO v_patterns
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_proposal -> 'patterns_applied') = 'array'
                                        THEN p_proposal -> 'patterns_applied' ELSE '[]'::jsonb END) x;
  v_dec := public.record_decision(
    p_cycle_id, p_session_name, 'proposal', NULL,
    format('Project %s finished batch %s (%s members); proposed %s (%s): %s ticket(s), %s finding(s)',
           v_proj.slug, v_epic.name, v_state.members, v_slug, v_name,
           jsonb_array_length(v_tickets), array_length(v_seen, 1)),
    v_reason || E'\n' || v_patterns,
    NULL);

  -- 3. Images first, in write order; created_at = clock_timestamp() so a Reverse (newest first)
  --    undoes them in reverse order: findings, tickets, the new epic, the target, the old project, the epic.
  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
  VALUES (p_cycle_id, p_session_name, 'epics', v_epic.id::text, to_jsonb(v_epic), v_dec, clock_timestamp());
  UPDATE public.epics SET finished_at = now(), updated_at = now() WHERE id = v_epic.id;

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
  VALUES (p_cycle_id, p_session_name, 'projects', v_proj.id::text, to_jsonb(v_proj), v_dec, clock_timestamp());
  UPDATE public.projects SET status = v_after, updated_at = now(), updated_by = v_by WHERE id = v_proj.id;

  IF v_new_proj THEN
    v_target_id := gen_random_uuid();
    INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
    VALUES (p_cycle_id, p_session_name, 'projects', v_target_id::text, NULL, v_dec, clock_timestamp());
    INSERT INTO public.projects (id, slug, name, status, charter, proposal_reason, proposed_at, updated_by)
    VALUES (v_target_id, v_slug, v_name, 'proposed', v_charter, v_reason, now(), v_by);
  ELSE
    v_target_id := v_target.id;
    INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
    SELECT p_cycle_id, p_session_name, 'projects', p.id::text, to_jsonb(p), v_dec, clock_timestamp()
      FROM public.projects p WHERE p.id = v_target_id;
    UPDATE public.projects SET status = 'proposed', proposal_reason = v_reason, proposed_at = now(),
           updated_at = now(), updated_by = v_by
     WHERE id = v_target_id;
  END IF;

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
  VALUES (p_cycle_id, p_session_name, 'epics', v_epic_new::text, NULL, v_dec, clock_timestamp());
  INSERT INTO public.epics (id, name, description, project_id)
  VALUES (v_epic_new, format('%s — proposal %s', v_name, left(v_dec::text, 8)),
          'AGT-240 proposal (decision ' || v_dec || '): ' || v_reason, v_target_id);

  -- 4. Tickets: ONE counter block for all n, guarded against counter drift behind the board
  --    (apply_audit_review's block). Normal backlog rows, `discovered`, `open`, under the new epic --
  --    unpicked while the project is `proposed` (epic_project_executing).
  v_n := jsonb_array_length(v_tickets);
  INSERT INTO public.feature_id_counter (prefix, last_issued_number, updated_by_session)
  VALUES ('AGT', v_n, v_by)
  ON CONFLICT (prefix) DO UPDATE
    SET last_issued_number = GREATEST(public.feature_id_counter.last_issued_number,
          (SELECT coalesce(max(split_part(b.backlog_id, '-', 2)::int), 0)
             FROM public.backlog_items b WHERE b.backlog_id ~ '^AGT-[0-9]+$')) + v_n,
        updated_at = now(),
        updated_by_session = EXCLUDED.updated_by_session
  RETURNING last_issued_number INTO v_last;
  v_next := v_last - v_n + 1;
  SELECT coalesce(max(b.row_ordinal), 0) INTO v_ord FROM public.backlog_items b;

  FOR t IN SELECT value FROM jsonb_array_elements(v_tickets) LOOP
    v_bid := 'AGT-' || v_next;
    v_next := v_next + 1;
    v_ord := v_ord + 1;
    v_pc := t ->> 'priority_class';
    SELECT string_agg('- ' || a.id::text || ' ' || a.fingerprint || ' [' || coalesce(a.check_slug, '-') || '] ' ||
                      a.locations::text || ' — ' || a.governing_fact, E'\n' ORDER BY x.ord)
      INTO v_lines
      FROM jsonb_array_elements_text(t -> 'finding_ids') WITH ORDINALITY x(fid, ord)
      JOIN public.audit_findings a ON a.id::text = x.fid;
    v_new_uuid := gen_random_uuid();
    INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
    VALUES (p_cycle_id, p_session_name, 'backlog_items', v_new_uuid::text, NULL, v_dec, clock_timestamp());
    INSERT INTO public.backlog_items
      (id, backlog_id, tier, type, priority_class, title, description, status, epic_id,
       source_file, session_ref, row_ordinal, filed_at, scope_origin, size_stamp, predicted_cycles,
       defer_status, scope_rationale, milestone, enhancement_claim, gate_count, design_status)
    VALUES
      (v_new_uuid, v_bid, 'next', 'Tooling', v_pc, t ->> 'title',
       '**' || v_pc || '.** ' || (t ->> 'root_cause') || E'\n\nFix: ' || (t ->> 'fix') ||
         E'\n\nFindings (audit_findings):\n' || coalesce(v_lines, ''),
       'open', v_epic_new,
       'project-proposal', v_by || ' ' || current_date, v_ord, now(), 'discovered',
       'M', (t ->> 'predicted_cycles')::int,
       'no', format('AGT-240: proposed project %s, root cause of audit findings %s', v_slug,
                    (SELECT string_agg(x, ', ') FROM jsonb_array_elements_text(t -> 'finding_ids') x)),
       NULL, 'none: audit root-cause fix', 0, NULL);
    v_filed := v_filed || v_bid;

    -- 5. Findings: image, then ticketed onto the proposed ticket.
    FOR v_id IN SELECT jsonb_array_elements_text(t -> 'finding_ids') LOOP
      SELECT * INTO f FROM public.audit_findings a WHERE a.id = v_id::uuid;
      INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
      VALUES (p_cycle_id, p_session_name, 'audit_findings', f.id::text, to_jsonb(f), v_dec, clock_timestamp());
      UPDATE public.audit_findings
         SET status = 'ticketed', filed_backlog_id = v_bid,
             ruling = format('AGT-240: proposed in %s as %s -- %s / %s', v_slug, v_bid, t ->> 'root_cause', t ->> 'fix'),
             ruled_by = 'devmanager', ruled_at = now()
       WHERE id = f.id;
      v_found := v_found + 1;
    END LOOP;
  END LOOP;

  PERFORM public.recompute_backlog_queue();
  RETURN jsonb_build_object(
    'decision_id', v_dec,
    'finished', jsonb_build_object('slug', v_proj.slug, 'status', v_after, 'epic_id', v_epic.id, 'members', v_state.members),
    'proposed', jsonb_build_object('slug', v_slug, 'project_id', v_target_id, 'epic_id', v_epic_new, 'new_project', v_new_proj),
    'tickets', to_jsonb(v_filed),
    'findings', v_found);
END
$function$;

-- ---------------------------------------------------------------------------------------------
-- (6) start_proposed_project(): only a session, only on John's words (D5).
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_proposed_project(p_slug text, p_john_words text, p_session_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_p   public.projects%ROWTYPE;
  e     public.epics%ROWTYPE;
  v_dec uuid;
  v_n   int := 0;
BEGIN
  IF coalesce(btrim(p_session_name), '') = '' THEN
    RAISE EXCEPTION 'start_proposed_project: only a session starts a project -- p_session_name is required (AGT-240 D5)';
  END IF;
  IF coalesce(btrim(p_john_words), '') = '' THEN
    RAISE EXCEPTION 'start_proposed_project: John''s words are required, verbatim (AGT-240 D5)';
  END IF;
  SELECT * INTO v_p FROM public.projects p WHERE p.slug = p_slug FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'start_proposed_project: no project %', p_slug;
  END IF;
  IF v_p.status <> 'proposed' THEN
    RAISE EXCEPTION 'start_proposed_project: project % is %, not proposed', p_slug, v_p.status;
  END IF;

  v_dec := public.record_decision(NULL, p_session_name, 'directive', NULL,
    format('Start proposed project %s on John''s word', p_slug), p_john_words, NULL);

  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
  VALUES (NULL, p_session_name, 'projects', v_p.id::text, to_jsonb(v_p), v_dec, clock_timestamp());
  UPDATE public.projects SET status = 'executing', updated_at = now(), updated_by = p_session_name WHERE id = v_p.id;

  -- The list locks the moment the project starts (D1).
  FOR e IN SELECT * FROM public.epics x WHERE x.project_id = v_p.id AND x.locked_at IS NULL ORDER BY x.name FOR UPDATE LOOP
    INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
    VALUES (NULL, p_session_name, 'epics', e.id::text, to_jsonb(e), v_dec, clock_timestamp());
    UPDATE public.epics SET locked_at = now(), updated_at = now() WHERE id = e.id;
    v_n := v_n + 1;
  END LOOP;
  PERFORM public.recompute_backlog_queue();
  RETURN v_dec;
END
$function$;

-- ---------------------------------------------------------------------------------------------
-- (7) apply_finish_line_backfill(): (f), once. Lock every executing project's epics; the Auditor
--     Enhancements tickets filed on or after the cut, open and not john-named, go back to the list.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_finish_line_backfill(p_cycle_id uuid, p_session_name text, p_cut timestamptz)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  k_q2 constant text := 'John, verbatim 2026-09-27 (Q2): "a project list is locked, anything found goes into a list. Once a project is finished, the auditor and dev manager review the current functionality, review the auditor list, and propose a new project with ticket counts and why to me. then i decide if the routine is going to pick a new project."';
  v_dec    uuid;
  e        public.epics%ROWTYPE;
  b        public.backlog_items%ROWTYPE;
  f        public.audit_findings%ROWTYPE;
  v_locks  int;
  v_rets   int;
  v_locked int := 0;
  v_removed int := 0;
  v_listed int := 0;
  v_minted int := 0;
  v_fid    uuid;
  v_left   int;
BEGIN
  IF NOT ((p_cycle_id IS NOT NULL) <> (p_session_name IS NOT NULL)) THEN
    RAISE EXCEPTION 'apply_finish_line_backfill: exactly one of p_cycle_id / p_session_name';
  END IF;
  IF p_cut IS NULL THEN
    RAISE EXCEPTION 'apply_finish_line_backfill: p_cut is required';
  END IF;
  IF EXISTS (SELECT 1 FROM public.epics x WHERE x.locked_at IS NOT NULL) THEN
    RAISE EXCEPTION 'apply_finish_line_backfill: an epic is already locked -- the backfill runs once, before any lock (AGT-240)';
  END IF;

  SELECT count(*) INTO v_locks
    FROM public.epics x JOIN public.projects p ON p.id = x.project_id WHERE p.status = 'executing';
  SELECT count(*) INTO v_rets
    FROM public.backlog_items x JOIN public.epics y ON y.id = x.epic_id JOIN public.projects p ON p.id = y.project_id
   WHERE p.slug = 'auditor-enhancements' AND x.status = 'open' AND x.filed_at >= p_cut
     AND coalesce(x.scope_origin, '') <> 'john-named';

  v_dec := public.record_decision(p_cycle_id, p_session_name, 'directive', 'AGT-240',
    format('AGT-240 (f): %s epic(s) of executing projects locked; %s open Auditor Enhancements ticket(s) filed on or after %s returned to the findings list',
           v_locks, v_rets, to_char(p_cut AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI"Z"')),
    k_q2, NULL);

  -- Images first, in write order (clock_timestamp), so a Reverse undoes them newest first.
  FOR e IN SELECT x.* FROM public.epics x JOIN public.projects p ON p.id = x.project_id
            WHERE p.status = 'executing' ORDER BY p.slug, x.name FOR UPDATE OF x LOOP
    INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
    VALUES (p_cycle_id, p_session_name, 'epics', e.id::text, to_jsonb(e), v_dec, clock_timestamp());
    UPDATE public.epics SET locked_at = now(), updated_at = now() WHERE id = e.id;
    v_locked := v_locked + 1;
  END LOOP;

  FOR b IN SELECT x.* FROM public.backlog_items x JOIN public.epics y ON y.id = x.epic_id JOIN public.projects p ON p.id = y.project_id
            WHERE p.slug = 'auditor-enhancements' AND x.status = 'open' AND x.filed_at >= p_cut
              AND coalesce(x.scope_origin, '') <> 'john-named'
            ORDER BY x.backlog_id FOR UPDATE OF x LOOP
    INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
    VALUES (p_cycle_id, p_session_name, 'backlog_items', b.id::text, to_jsonb(b), v_dec, clock_timestamp());
    UPDATE public.backlog_items SET status = 'removed', updated_at = now() WHERE id = b.id;
    v_removed := v_removed + 1;

    IF EXISTS (SELECT 1 FROM public.audit_findings a WHERE a.filed_backlog_id = b.backlog_id) THEN
      FOR f IN SELECT a.* FROM public.audit_findings a WHERE a.filed_backlog_id = b.backlog_id ORDER BY a.created_at, a.id LOOP
        INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
        VALUES (p_cycle_id, p_session_name, 'audit_findings', f.id::text, to_jsonb(f), v_dec, clock_timestamp());
        UPDATE public.audit_findings
           SET status = 'listed', ruling = format('AGT-240: returned from %s to the findings list', b.backlog_id),
               ruled_by = 'devmanager', ruled_at = now()
         WHERE id = f.id;
        v_listed := v_listed + 1;
      END LOOP;
    ELSE
      -- A ticket filed with no finding still goes back to the list: it gets one.
      v_fid := gen_random_uuid();
      INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id, created_at)
      VALUES (p_cycle_id, p_session_name, 'audit_findings', v_fid::text, NULL, v_dec, clock_timestamp());
      INSERT INTO public.audit_findings
        (id, fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution,
         status, ruling, ruled_by, ruled_at, found_by, cycle_id, check_slug, filed_backlog_id, finding_type)
      VALUES
        (v_fid, left(md5('agt-240-return:' || b.backlog_id), 16), to_char(now(), 'IYYY-"W"IW'), 'other',
         jsonb_build_array(jsonb_build_object('location', 'backlog_items/' || b.backlog_id, 'text', b.title)),
         'A project''s list is locked when it starts; a ticket filed into it afterwards goes back to the findings list for the next proposal (AGT-240, John 2026-09-27).',
         'medium',
         'Weigh it in the next project proposal: ' || b.title,
         'listed', format('AGT-240: returned from %s to the findings list', b.backlog_id), 'devmanager', now(),
         'runner:agt-240-return', p_cycle_id, 'agt-240-return', b.backlog_id, 'gap');
      v_minted := v_minted + 1;
    END IF;
  END LOOP;

  PERFORM public.recompute_backlog_queue();
  SELECT s."left" INTO v_left FROM public.project_batch_state() s WHERE s.slug = 'auditor-enhancements' ORDER BY s.epic_name LIMIT 1;
  RETURN jsonb_build_object(
    'decision_id', v_dec, 'epics_locked', v_locked, 'tickets_removed', v_removed,
    'findings_listed', v_listed, 'findings_minted', v_minted, 'ae_left', v_left);
END
$function$;

-- ---------------------------------------------------------------------------------------------
-- (8) proposed_projects: what John's status report lists (Q3). service_role only.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.proposed_projects AS
SELECT p.slug, p.name, p.proposal_reason, p.proposed_at,
       count(b.id)::integer AS tickets,
       coalesce((SELECT jsonb_object_agg(z.pc, z.n ORDER BY z.pc)
                   FROM (SELECT coalesce(b2.priority_class, '(no class)') AS pc, count(*)::integer AS n
                           FROM public.backlog_items b2 JOIN public.epics e2 ON e2.id = b2.epic_id
                          WHERE e2.project_id = p.id AND e2.finished_at IS NULL
                            AND b2.status NOT IN ('done', 'removed')
                          GROUP BY 1) z), '{}'::jsonb) AS by_class,
       coalesce(sum(b.predicted_cycles), 0)::integer AS cycles
  FROM public.projects p
  LEFT JOIN public.epics e ON e.project_id = p.id AND e.finished_at IS NULL
  LEFT JOIN public.backlog_items b ON b.epic_id = e.id AND b.status NOT IN ('done', 'removed')
 WHERE p.status = 'proposed'
 GROUP BY p.id, p.slug, p.name, p.proposal_reason, p.proposed_at;
COMMENT ON VIEW public.proposed_projects IS
  'AGT-240 (d): every proposed project with its ticket count, count per priority class and predicted cycles. Read by scripts/render-standing-brief.js.';
REVOKE ALL ON public.proposed_projects FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.proposed_projects TO service_role;

-- ---------------------------------------------------------------------------------------------
-- (9) Grants: new functions default OPEN -- revoke the three roles BY NAME.
-- ---------------------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.epic_lock_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.project_batch_state() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finish_project_batch(uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.start_proposed_project(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_finish_line_backfill(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.epic_lock_guard() TO service_role;
GRANT EXECUTE ON FUNCTION public.project_batch_state() TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_project_batch(uuid, text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.start_proposed_project(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_finish_line_backfill(uuid, text, timestamptz) TO service_role;

-- ---------------------------------------------------------------------------------------------
-- (10) The two turns (D4): capabilities audit-finish-review (auditor) and propose-project
--      (devmanager). Skill links are audit-run-review's / review-audit-worklist's with the Intent
--      swapped. Agent-row writes on an agreed ticket (AGENT-ROW-AGREED-TICKET): images for every row.
-- ---------------------------------------------------------------------------------------------
WITH ins AS (
  INSERT INTO public.skill_profiles
    (slug, name, skill_type_slug, objective, method, traits, guardrails, technical_services, execution_type,
     tenant_id, llm_provider, llm_model, max_tokens, api_key_source, temperature)
  SELECT 'au-finish-intent', 'Audit Finish Review', 'intent',
         'Grade what one finished project batch built -- each built area working, broken or missing, with evidence -- so The Development Manager can propose the next project. Propose nothing.',
         'FINISH LINE (AGT-240, John 2026-09-27): "Once a project is finished, the auditor and dev manager review the current functionality, review the auditor list". Your task_context is scripts/propose-project.js --prepare''s file: project (the finished project: slug, name, charter, perpetual), epic (the finished batch), members (every ticket in the locked list: backlog_id, title, status, priority_class), findings (the findings list: every open, carried or listed audit finding with id, source, finding_type, family, check_slug, locations, governing_fact, proposed_resolution) and projects. Review THE CURRENT FUNCTIONALITY the batch built: group the members into the areas they built and grade each area working (it does what its tickets say -- cite the evidence: a file:line, a table row, a test, a script''s output), broken (it exists and does not do what its tickets say -- cite what fails) or missing (a ticket closed without the thing existing, or removed while still needed). Read the findings list for evidence about those areas. You propose nothing and file nothing -- no project, no ticket, no ruling: the proposal is The Development Manager''s, and it reads your review as task_context.functionality_review. Return {areas, account}; each area: area, state, evidence, member_ids (its tickets), finding_ids (the findings that bear on it; may be empty).',
         jsonb_build_object('can_request_help', false, 'schema', jsonb_build_object(
           'type', 'object', 'required', jsonb_build_array('areas', 'account'),
           'properties', jsonb_build_object(
             'account', jsonb_build_object('type', 'string', 'maxLength', 100),
             'areas', jsonb_build_object('type', 'array', 'items', jsonb_build_object(
               'type', 'object', 'required', jsonb_build_array('area', 'state', 'evidence', 'member_ids', 'finding_ids'),
               'properties', jsonb_build_object(
                 'area', jsonb_build_object('type', 'string', 'maxLength', 200),
                 'state', jsonb_build_object('type', 'string', 'enum', jsonb_build_array('working', 'broken', 'missing')),
                 'evidence', jsonb_build_object('type', 'string', 'maxLength', 1200),
                 'member_ids', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
                 'finding_ids', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')))))))),
         '{"must": [], "must_not": []}'::jsonb, sp.technical_services, sp.execution_type,
         sp.tenant_id, sp.llm_provider, sp.llm_model, sp.max_tokens, sp.api_key_source, sp.temperature
    FROM public.skill_profiles sp
   WHERE sp.slug = 'au-run-intent'
     AND NOT EXISTS (SELECT 1 FROM public.skill_profiles x WHERE x.slug = 'au-finish-intent')
  UNION ALL
  SELECT 'dm-propose-intent', 'Propose the Next Project', 'intent',
         'At a project''s finish, turn the Auditor''s functionality review and the findings list into ONE proposed project for John: one ticket per root cause, each citing its findings, with the ticket counts and the reason. Never start it.',
         'FINISH LINE (AGT-240, John 2026-09-27): "propose a new project with ticket counts and why to me. then i decide if the routine is going to pick a new project." Your task_context carries project (the finished project, with perpetual), epic, members, findings (the findings list: open, carried and listed audit findings), projects (every project with its status) and functionality_review (the Auditor''s grading of what the finished batch built: areas working, broken or missing, with evidence). Propose ONE project. slug: a new lowercase-hyphenated slug, or an existing project whose status is planned, paused or done -- a perpetual project may take its own slug for its next batch; never an executing or proposed one. name and charter: what the project is for, in plain words. reason, three sentences in this order: what John cannot do today; what he can do after; why now. tickets: ONE ticket per ROOT CAUSE -- group findings like with like, exactly as the weekly review does -- each with title, root_cause, fix, priority_class (named, e.g. P10 - Tooling), predicted_cycles (a whole number, at least 1) and finding_ids (every finding it answers; a finding in at most one ticket). A broken or missing area in functionality_review is a root cause to answer first. LEVERAGE FIRST (AGT-238): list first the tickets that make everything after them run better, and say so in the reason. A finding you put in no ticket stays on the findings list for the next proposal -- leave it rather than force it. You never start the project: finish_project_batch() writes it as proposed, its tickets are not picked, and only a session on John''s words runs start_proposed_project(). summary_for_john is 3-6 plain sentences: what the batch built, what you propose, the ticket count per class. Return {slug, name, charter, reason, tickets, summary_for_john, patterns_applied}.',
         jsonb_build_object('can_request_help', false, 'schema', jsonb_build_object(
           'type', 'object', 'required', jsonb_build_array('slug', 'name', 'charter', 'reason', 'tickets', 'summary_for_john', 'patterns_applied'),
           'properties', jsonb_build_object(
             'slug', jsonb_build_object('type', 'string', 'pattern', '^[a-z0-9]+(-[a-z0-9]+)*$', 'maxLength', 60),
             'name', jsonb_build_object('type', 'string', 'maxLength', 120),
             'charter', jsonb_build_object('type', 'string', 'maxLength', 1200),
             'reason', jsonb_build_object('type', 'string', 'maxLength', 1200),
             'summary_for_john', jsonb_build_object('type', 'string', 'maxLength', 1200),
             'patterns_applied', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'integer', 'minimum', 1)),
             'tickets', jsonb_build_object('type', 'array', 'minItems', 1, 'items', jsonb_build_object(
               'type', 'object', 'required', jsonb_build_array('title', 'root_cause', 'fix', 'priority_class', 'predicted_cycles', 'finding_ids'),
               'properties', jsonb_build_object(
                 'title', jsonb_build_object('type', 'string', 'maxLength', 200),
                 'root_cause', jsonb_build_object('type', 'string', 'maxLength', 1200),
                 'fix', jsonb_build_object('type', 'string', 'maxLength', 1200),
                 'priority_class', jsonb_build_object('type', 'string', 'pattern', '^P([1-9]|10) - '),
                 'predicted_cycles', jsonb_build_object('type', 'integer', 'minimum', 1),
                 'finding_ids', jsonb_build_object('type', 'array', 'minItems', 1, 'items', jsonb_build_object('type', 'string')))))))),
         '{"must": [], "must_not": []}'::jsonb, sp.technical_services, sp.execution_type,
         sp.tenant_id, sp.llm_provider, sp.llm_model, sp.max_tokens, sp.api_key_source, sp.temperature
    FROM public.skill_profiles sp
   WHERE sp.slug = 'dm-audit-review-intent'
     AND NOT EXISTS (SELECT 1 FROM public.skill_profiles x WHERE x.slug = 'dm-propose-intent')
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT 'fe346b72-3e94-41e6-999c-572150456327'::uuid, 'skill_profiles', ins.id::text, NULL FROM ins;

WITH ins AS (
  INSERT INTO public.capabilities (slug, name, description, execution_type, tenant_id, display_phrase, default_intent_slug)
  SELECT v.slug, v.name, v.description, 'ai', 'global', v.phrase, v.intent
    FROM (VALUES
      ('audit-finish-review', 'Audit Finish Review',
       'At a project''s finish, grades what its locked batch built -- each area working, broken or missing, with evidence -- for The Development Manager''s proposal. Proposes and writes nothing itself.',
       'reviewing the finished project', 'au-finish-intent'),
      ('propose-project', 'Propose Project',
       'At a project''s finish, turns the Auditor''s functionality review and the findings list into ONE proposed project for John -- one ticket per root cause citing its findings, with the ticket counts and the reason. Never starts it.',
       'proposing the next project', 'dm-propose-intent')) AS v(slug, name, description, phrase, intent)
   WHERE NOT EXISTS (SELECT 1 FROM public.capabilities c WHERE c.slug = v.slug)
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT 'fe346b72-3e94-41e6-999c-572150456327'::uuid, 'capabilities', ins.id::text, NULL FROM ins;

WITH ins AS (
  INSERT INTO public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order)
  SELECT m.new_cap,
         CASE WHEN l.skill_profile_slug = m.old_intent THEN m.new_intent ELSE l.skill_profile_slug END,
         l.level, l.is_required, l.display_order
    FROM public.capability_skill_profiles l
    JOIN (VALUES ('audit-run-review', 'audit-finish-review', 'au-run-intent', 'au-finish-intent'),
                 ('review-audit-worklist', 'propose-project', 'dm-audit-review-intent', 'dm-propose-intent'))
         AS m(old_cap, new_cap, old_intent, new_intent) ON m.old_cap = l.capability_slug
   WHERE NOT EXISTS (SELECT 1 FROM public.capability_skill_profiles x WHERE x.capability_slug = m.new_cap)
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT 'fe346b72-3e94-41e6-999c-572150456327'::uuid, 'capability_skill_profiles', ins.id::text, NULL FROM ins;

WITH ins AS (
  INSERT INTO public.agent_capability_assignments (tenant_id, agent_id, capability_slug)
  SELECT 'global', v.agent, v.cap
    FROM (VALUES ('auditor', 'audit-finish-review'), ('devmanager', 'propose-project')) AS v(agent, cap)
   WHERE NOT EXISTS (SELECT 1 FROM public.agent_capability_assignments a WHERE a.capability_slug = v.cap)
  RETURNING id
)
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT 'fe346b72-3e94-41e6-999c-572150456327'::uuid, 'agent_capability_assignments', ins.id::text, NULL FROM ins;

-- dm-audit-review-intent gains kind `list`: the schema enum, and one paragraph BEFORE the upkeep
-- paragraph (agt-134 pins that one as the method's last).
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT 'fe346b72-3e94-41e6-999c-572150456327'::uuid, 'skill_profiles', sp.id::text, to_jsonb(sp)
  FROM public.skill_profiles sp WHERE sp.slug = 'dm-audit-review-intent';

DO $intent$
DECLARE
  v_method text;
  v_old    text := E'\n\nUPKEEP OF THE MANAGER''S OWN RULES';
  v_n      int;
BEGIN
  SELECT method INTO v_method FROM public.skill_profiles WHERE slug = 'dm-audit-review-intent';
  v_n := (length(v_method) - length(replace(v_method, v_old, ''))) / length(v_old);
  IF v_n <> 1 THEN RAISE EXCEPTION 'agt240: dm-audit-review-intent upkeep fragment occurs % times, not 1', v_n; END IF;
  UPDATE public.skill_profiles sp
     SET method = replace(v_method, v_old,
           E'\n\nTHE LOCKED LIST (AGT-240, John 2026-09-27: "a project list is locked, anything found goes into a list"). A project that is executing, proposed or done has a locked list: a root-cause or cleanup group that routes into one is refused (apply_audit_review: project <slug> is <status> -- its list is locked; use kind list (AGT-240)). Rule those findings kind list, with a reason: they wait as listed on the findings list, outside every later review, until the project finishes and the next proposal answers them. A security finding still routes to Security while that project is planned.'
           || v_old),
         traits = jsonb_set(sp.traits, '{schema,properties,groups,items,properties,kind,enum}',
                            (sp.traits #> '{schema,properties,groups,items,properties,kind,enum}') || '["list"]'::jsonb)
   WHERE sp.slug = 'dm-audit-review-intent'
     AND NOT (sp.traits #> '{schema,properties,groups,items,properties,kind,enum}') ? 'list';
END
$intent$;

-- ---------------------------------------------------------------------------------------------
-- (11) The gate. Rolled-back probes raise P0240 and are caught; their facts survive in variables.
-- ---------------------------------------------------------------------------------------------
DO $assert$
DECLARE
  v_name     text;
  v_n        integer;
  v_proj     uuid;
  v_epic     uuid;
  v_fid      uuid;
  v_due1     boolean;
  v_due2     boolean;
  v_fin      jsonb;
  v_old_st   text;
  v_new_st   text;
  v_bid      text;
  v_pdq      integer;
  v_exec     boolean;
  v_start    uuid;
  v_started  text;
  v_locked   integer;
  v_lockmsg  text;
  v_rev1     record;
  v_rev2     record;
  v_after1   text;
  v_after2   text;
  v_tgone    integer;
  v_fstat    text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['epic_lock_guard', 'project_batch_state', 'finish_project_batch', 'start_proposed_project',
                                'apply_finish_line_backfill', 'finding_group_epic', 'apply_audit_review',
                                'reverse_decision', 'reversible_tables'] LOOP
    SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = v_name;
    IF v_n <> 1 THEN RAISE EXCEPTION 'agt240 gate: % has % overloads, not 1', v_name, v_n; END IF;
  END LOOP;

  IF has_function_privilege('anon', 'public.project_batch_state()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.finish_project_batch(uuid, text, uuid, jsonb)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.start_proposed_project(text, text, text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.apply_finish_line_backfill(uuid, text, timestamptz)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.finish_project_batch(uuid, text, uuid, jsonb)', 'EXECUTE')
     OR has_table_privilege('anon', 'public.proposed_projects', 'SELECT') THEN
    RAISE EXCEPTION 'agt240 gate: anon/authenticated can still reach a new function or the view';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.finish_project_batch(uuid, text, uuid, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'agt240 gate: service_role cannot EXECUTE finish_project_batch()';
  END IF;
  IF NOT ('projects' = ANY (public.reversible_tables())) THEN
    RAISE EXCEPTION 'agt240 gate: reversible_tables() lacks projects';
  END IF;
  IF (SELECT count(*) FROM public.projects WHERE perpetual) <> 2 THEN
    RAISE EXCEPTION 'agt240 gate: expected 2 perpetual projects';
  END IF;
  IF (SELECT count(*) FROM public.capability_skill_profiles WHERE capability_slug IN ('audit-finish-review', 'propose-project')) <> 11
     OR (SELECT count(*) FROM public.agent_capability_assignments WHERE capability_slug IN ('audit-finish-review', 'propose-project')) <> 2
     OR NOT (SELECT (traits #> '{schema,properties,groups,items,properties,kind,enum}') ? 'list' FROM public.skill_profiles WHERE slug = 'dm-audit-review-intent') THEN
    RAISE EXCEPTION 'agt240 gate: capability links, assignments or the list enum are wrong';
  END IF;

  -- The fixture: an executing project, a locked epic, one delivered member, one listed finding.
  BEGIN
    INSERT INTO public.projects (slug, name, status, updated_by) VALUES ('agt240-probe', 'AGT-240 probe', 'executing', 'agt240-gate')
      RETURNING id INTO v_proj;
    INSERT INTO public.epics (name, project_id, description) VALUES ('AGT-240 probe batch', v_proj, 'probe')
      RETURNING id INTO v_epic;
    INSERT INTO public.backlog_items (backlog_id, tier, type, priority_class, title, status, epic_id, source_file,
                                      filed_at, scope_origin, size_stamp, defer_status, scope_rationale, enhancement_claim, row_ordinal)
    VALUES ('ZPROBE-240', 'next', 'Tooling', 'P10 - Tooling', 'AGT-240 probe member', 'delivered', v_epic, 'agt240-gate',
            now(), 'john-named', 'S', 'no', 'probe', 'none: probe',
            (SELECT coalesce(max(x.row_ordinal), 0) + 1 FROM public.backlog_items x));
    UPDATE public.epics SET locked_at = now() WHERE id = v_epic;
    INSERT INTO public.audit_findings (fingerprint, iso_week, kind, locations, governing_fact, confidence,
                                       proposed_resolution, status, found_by, finding_type)
    VALUES (left(md5(clock_timestamp()::text), 16), to_char(now(), 'IYYY-"W"IW'), 'other',
            '[{"location": "agt240-gate", "text": "probe"}]'::jsonb, 'probe', 'low', 'probe', 'listed',
            'runner:agt240-gate', 'gap')
      RETURNING id INTO v_fid;

    SELECT s.proposal_due INTO v_due1 FROM public.project_batch_state() s WHERE s.epic_id = v_epic;
    INSERT INTO public.runner_verdicts (backlog_id, verdict, gate_build, gate_regression, gate_hygiene, reasoning)
    VALUES ('ZPROBE-240', 'approve', 'green', 'green', 'green', 'agt240 gate probe');
    UPDATE public.backlog_items SET status = 'done' WHERE backlog_id = 'ZPROBE-240';
    SELECT s.proposal_due INTO v_due2 FROM public.project_batch_state() s WHERE s.epic_id = v_epic;

    v_fin := public.finish_project_batch('fe346b72-3e94-41e6-999c-572150456327'::uuid, NULL, v_epic, jsonb_build_object(
      'slug', 'agt240-probe-next', 'name', 'AGT-240 probe next', 'charter', 'probe', 'reason', 'probe reason',
      'tickets', jsonb_build_array(jsonb_build_object('title', 'AGT-240 probe ticket', 'root_cause', 'r', 'fix', 'f',
        'priority_class', 'P10 - Tooling', 'predicted_cycles', 1, 'finding_ids', jsonb_build_array(v_fid::text)))));
    SELECT status INTO v_old_st FROM public.projects WHERE id = v_proj;
    SELECT status INTO v_new_st FROM public.projects WHERE slug = 'agt240-probe-next';
    v_bid := v_fin -> 'tickets' ->> 0;
    SELECT count(*) INTO v_pdq FROM public.prime_directive_queue() q WHERE q.ref = v_bid;
    SELECT public.epic_project_executing(b.epic_id) INTO v_exec FROM public.backlog_items b WHERE b.backlog_id = v_bid;

    v_start := public.start_proposed_project('agt240-probe-next', 'yes -- agt240 gate probe', 'agt240-gate');
    SELECT p.status, count(e.id) FILTER (WHERE e.locked_at IS NOT NULL) INTO v_started, v_locked
      FROM public.projects p JOIN public.epics e ON e.project_id = p.id WHERE p.slug = 'agt240-probe-next' GROUP BY p.status;
    BEGIN
      INSERT INTO public.backlog_items (backlog_id, tier, type, priority_class, title, status, epic_id, source_file,
                                        filed_at, scope_origin, size_stamp, defer_status, scope_rationale, enhancement_claim, row_ordinal)
      SELECT 'ZPROBE-241', 'next', 'Tooling', 'P10 - Tooling', 'AGT-240 probe finding-born', 'open', e.id, 'agt240-gate',
             now(), 'discovered', 'S', 'no', 'probe', 'none: probe',
             (SELECT coalesce(max(x.row_ordinal), 0) + 1 FROM public.backlog_items x)
        FROM public.epics e JOIN public.projects p ON p.id = e.project_id WHERE p.slug = 'agt240-probe-next';
      v_lockmsg := 'ACCEPTED';
    EXCEPTION WHEN check_violation THEN v_lockmsg := SQLERRM;
    END;

    -- Reverse the start, then the finish: projects restore (D8).
    SELECT * INTO v_rev1 FROM public.reverse_decision(v_start, 'agt240-gate', 'gate probe: reverse the start', NULL);
    SELECT status INTO v_after1 FROM public.projects WHERE slug = 'agt240-probe-next';
    SELECT * INTO v_rev2 FROM public.reverse_decision((v_fin ->> 'decision_id')::uuid, 'agt240-gate', 'gate probe: reverse the finish', NULL);
    SELECT status INTO v_after2 FROM public.projects WHERE id = v_proj;
    SELECT count(*) INTO v_tgone FROM public.projects WHERE slug = 'agt240-probe-next';
    SELECT status INTO v_fstat FROM public.audit_findings WHERE id = v_fid;

    RAISE EXCEPTION USING ERRCODE = 'P0240', MESSAGE = 'agt240 probe rollback';
  EXCEPTION WHEN SQLSTATE 'P0240' THEN NULL;
  END;

  IF v_due1 IS DISTINCT FROM false OR v_due2 IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'agt240 gate: proposal_due with a delivered member %, after done %; want false, true', v_due1, v_due2;
  END IF;
  IF v_old_st IS DISTINCT FROM 'done' OR v_new_st IS DISTINCT FROM 'proposed' OR v_pdq <> 0 OR v_exec IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'agt240 gate: finish left old %, new %, ticket % in prime_directive_queue % time(s), executing %', v_old_st, v_new_st, v_bid, v_pdq, v_exec;
  END IF;
  IF v_started IS DISTINCT FROM 'executing' OR v_locked <> 1 THEN
    RAISE EXCEPTION 'agt240 gate: start left status %, % locked epic(s)', v_started, v_locked;
  END IF;
  IF v_lockmsg IS NULL OR v_lockmsg NOT LIKE 'AGT-240: epic % is locked; the finding waits on the findings list' THEN
    RAISE EXCEPTION 'agt240 gate: a discovered insert into the locked epic was %', v_lockmsg;
  END IF;
  IF v_rev1.outcome <> 'applied' OR v_rev1.refused <> 0 OR v_after1 IS DISTINCT FROM 'proposed' THEN
    RAISE EXCEPTION 'agt240 gate: reversing the start gave % (refused %, %) and status %', v_rev1.outcome, v_rev1.refused, v_rev1.reason, v_after1;
  END IF;
  IF v_rev2.outcome <> 'applied' OR v_after2 IS DISTINCT FROM 'executing' OR v_tgone <> 0 OR v_fstat IS DISTINCT FROM 'listed' THEN
    RAISE EXCEPTION 'agt240 gate: reversing the finish gave % (refused %, %), old project %, target rows %, finding %',
      v_rev2.outcome, v_rev2.refused, v_rev2.reason, v_after2, v_tgone, v_fstat;
  END IF;

  RAISE NOTICE 'agt240 gate: 9 functions x 1 overload; anon denied; due % -> %; finish: old %, new %, % in queue % time(s); start: % with % locked epic; lock: %; reverse start % (%), reverse finish % (% restored, % unverified, % refused) -> old %, target rows %, finding %',
    v_due1, v_due2, v_old_st, v_new_st, v_bid, v_pdq, v_started, v_locked, v_lockmsg,
    v_rev1.outcome, v_after1, v_rev2.outcome, v_rev2.restored, v_rev2.restored_unverified, v_rev2.refused, v_after2, v_tgone, v_fstat;
END
$assert$;
