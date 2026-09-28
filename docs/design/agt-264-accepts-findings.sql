-- AGT-264 (v7.0.692) -- Agent Training accepts findings while executing.
-- MIRROR of the applied migration `agt264_accepts_findings`. Applied via mcp Supabase apply_migration
-- (which wraps the whole file in one transaction, so no BEGIN/COMMIT here).
--
-- DOWN, captured FIRST, before this ran (kickoff task 1 / harvest D12):
--   select public.capture_migration_down(
--     'f4d1d272-1d2b-4e2b-a637-2f1331754b2b','agt264_accepts_findings',
--     '[{"kind":"function","identity":"public.finding_group_epic(jsonb)"},
--       {"kind":"function","identity":"public.epic_lock_guard()"}]'::jsonb);
--   -> (agt264_accepts_findings, auto-downable, 2 captured, 0 refusals)
-- Only the two functions are auto-downable. Naming public.projects or public.finding_routes as
-- `table` objects would make the WHOLE capture `refused` (AGT-161 D1), so the other three downs are
-- CARD-ONLY and recorded here:
--   1. alter table public.projects drop column accepts_findings;
--   2. delete from public.finding_routes where precedence = 30 and source = 'session';
--   3. select public.reverse_decision('<the agent-row decision id>');  -- restores the 5 imaged rows

-- 1. THE FLAG (kickoff §4). Data, not a status: a fifth projects.status would collide with AGT-238's
--    concurrency count and AGT-240's finish logic. No slug in code (§19b, pattern:2).
alter table public.projects add column accepts_findings boolean not null default false;

comment on column public.projects.accepts_findings is
  'AGT-264 (John 2026-09-28): true = this project keeps taking approved findings while it is executing, proposed or done -- finding_group_epic() and epic_lock_guard() skip the AGT-240 list lock for it. A perpetual routine project (Agent Training) that never reaches a finish line. Data, not a status: status=''executing'' IS AGT-238''s concurrency count.';

-- 2. finding_group_epic(jsonb) -- CREATE OR REPLACE from the LIVE text, identity (p_group jsonb)
--    UNCHANGED (no new overload; asserted anyway in D1 per .claude/rules/supabase-function-signature.md).
--    Three edits at each of the two lock sites (3a route slug, 3b manager pick); every RAISE sentence
--    byte-unchanged, because scripts/audit-review.js mirrors the lock sentence byte-for-byte.
CREATE OR REPLACE FUNCTION public.finding_group_epic(p_group jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_kind text := coalesce(p_group ->> 'kind', '(no kind)');
  v_id   text;
  v_src  text;
  v_prec int;
  v_slug text;
  v_srcs text;
  v_pick text;
  v_rc   int;
  v_epic uuid;
  v_pst  text;   -- AGT-240: the routed project's status
  v_acc  boolean; -- AGT-264: ... and whether it accepts findings anyway
BEGIN
  -- 1. Every finding must be routable. An unmapped source STOPS the review and names itself; adding
  --    the row (or the project) is John's, never this function's guess.
  FOR v_id, v_src IN
    SELECT x.fid, split_part(a.found_by, ':', 1)
      FROM jsonb_array_elements_text(p_group -> 'finding_ids') x(fid)
      JOIN public.audit_findings a ON a.id::text = x.fid
     WHERE NOT EXISTS (
       SELECT 1 FROM public.finding_routes r
        WHERE (r.source = split_part(a.found_by, ':', 1) OR r.source = '*')
          AND (r.finding_type = a.finding_type OR r.finding_type = '*'))
     ORDER BY x.fid
  LOOP
    RAISE EXCEPTION 'apply_audit_review: finding % has unmapped source % — add a finding_routes row; project creation is John''s', v_id, v_src;
  END LOOP;

  -- 2. The group's route is the LOWEST precedence over its findings, deterministically (precedence,
  --    then source): one security finding makes the whole group a Security ticket however it was
  --    grouped, and a root cause that crosses sources is still one ticket.
  SELECT r.precedence, r.project_slug INTO v_prec, v_slug
    FROM jsonb_array_elements_text(p_group -> 'finding_ids') x(fid)
    JOIN public.audit_findings a ON a.id::text = x.fid
    JOIN public.finding_routes r
      ON (r.source = split_part(a.found_by, ':', 1) OR r.source = '*')
     AND (r.finding_type = a.finding_type OR r.finding_type = '*')
   ORDER BY r.precedence, r.source
   LIMIT 1;
  IF v_prec IS NULL THEN
    RAISE EXCEPTION 'apply_audit_review: a % group has no known findings to route', v_kind;
  END IF;

  -- 3a. The route names the project: its ONE epic, resolved by slug, never a hardcoded uuid.
  IF v_slug IS NOT NULL THEN
    -- AGT-240 (b): an executing, proposed or done project's list is locked.
    -- AGT-264: unless it accepts findings -- then the lock does not apply and its ONE epic counts
    -- even though that epic is locked (Agent Training's only epic is locked, so the OR is load-bearing).
    SELECT p.status, p.accepts_findings INTO v_pst, v_acc FROM public.projects p WHERE p.slug = v_slug;
    IF v_pst IN ('executing', 'proposed', 'done') AND NOT v_acc THEN
      RAISE EXCEPTION 'apply_audit_review: project % is % -- its list is locked; use kind list (AGT-240)', v_slug, v_pst;
    END IF;
    SELECT count(*), min(e.id::text)::uuid INTO v_rc, v_epic
      FROM public.epics e JOIN public.projects p ON p.id = e.project_id
     WHERE p.slug = v_slug AND (e.locked_at IS NULL OR v_acc);
    IF v_rc <> 1 THEN
      RAISE EXCEPTION 'apply_audit_review: % epics under project %; need exactly one', v_rc, v_slug;
    END IF;
    RETURN v_epic;
  END IF;

  -- 3b. The route says the manager picks, so the pick is EXPLICIT: a live projects.slug or the
  --     literal 'general' (the general backlog, no epic). Missing is refused, never read as general.
  v_pick := btrim(coalesce(p_group ->> 'project', ''));
  SELECT string_agg(s, ', ') INTO v_srcs FROM (
    SELECT DISTINCT split_part(a.found_by, ':', 1) AS s
      FROM jsonb_array_elements_text(p_group -> 'finding_ids') x(fid)
      JOIN public.audit_findings a ON a.id::text = x.fid
     ORDER BY 1) z;
  IF v_pick = '' THEN
    RAISE EXCEPTION 'apply_audit_review: a % group from source(s) % needs project (a projects.slug or general)', v_kind, coalesce(v_srcs, '(none)');
  END IF;
  IF v_pick = 'general' THEN
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.slug = v_pick) THEN
    RAISE EXCEPTION 'apply_audit_review: project % is not a projects row; project creation is John''s', v_pick;
  END IF;
  -- AGT-240 (b): the manager's pick is refused into a locked list the same way.
  -- AGT-264: ... unless the project he picked accepts findings.
  SELECT p.status, p.accepts_findings INTO v_pst, v_acc FROM public.projects p WHERE p.slug = v_pick;
  IF v_pst IN ('executing', 'proposed', 'done') AND NOT v_acc THEN
    RAISE EXCEPTION 'apply_audit_review: project % is % -- its list is locked; use kind list (AGT-240)', v_pick, v_pst;
  END IF;
  SELECT count(*), min(e.id::text)::uuid INTO v_rc, v_epic
    FROM public.epics e JOIN public.projects p ON p.id = e.project_id
   WHERE p.slug = v_pick AND (e.locked_at IS NULL OR v_acc);
  IF v_rc <> 1 THEN
    RAISE EXCEPTION 'apply_audit_review: % epics under project %; need exactly one', v_rc, v_pick;
  END IF;
  RETURN v_epic;
END
$function$;

-- 3. epic_lock_guard() -- identity () UNCHANGED. One edit: the locked-epic lookup now joins the
--    epic's project, so a flagged project's locked epic is not a refusal.
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
  -- AGT-264: a project that accepts findings keeps taking them while it executes, so its locked
  -- epic does not refuse. The lock sentence itself is byte-unchanged.
  SELECT e.name INTO v_name FROM public.epics e JOIN public.projects p ON p.id = e.project_id
   WHERE e.id = NEW.epic_id AND e.locked_at IS NOT NULL AND NOT p.accepts_findings;
  IF v_name IS NOT NULL THEN
    RAISE EXCEPTION 'AGT-240: epic % is locked; the finding waits on the findings list', v_name
      USING errcode = 'check_violation';
  END IF;
  RETURN NEW;
END
$function$;

-- 4. The `session` route row (kickoff §4). Two of the five items the ticket names cannot be
--    ticketed without it, in their own rulings' words. project_slug NULL = the manager picks.
insert into public.finding_routes (precedence, source, finding_type, project_slug, note)
values (30, 'session', '*', NULL, 'AGT-264: found_by session:<name> — an attended session''s finding. NULL: the manager picks, as for staff-watch.');

-- 5. THE FIVE AGENT-ROW WRITES, under ONE decision handle, each IMAGED BEFORE it is written.
--    AGENT-ROW-AGREED-TICKET: an agreed ticket's seed/Skill edit is build work with a before-image,
--    not a card. `reverse_decision(<id>)` is the single undo for all five (k_allowed covers
--    backlog_items, projects, skill_profiles and audit_findings' ruling band).
do $agt264w$
declare
  v_cyc    uuid := 'f4d1d272-1d2b-4e2b-a637-2f1331754b2b';
  v_dec    uuid;
  v_anchor text := 'A security finding still routes to Security while that project is planned.';
  v_s      text := ' EXCEPTION (AGT-264, John 2026-09-28): a project whose task_context.projects row carries accepts_findings true keeps taking tickets while it executes -- a finding an agent files about how it itself works (its access, data, Skills, Capabilities or routine) is filed there on your pick; a product proposal an agent makes for customers keeps your ordinary project pick.';
  v_r      text := ' / AGT-264 (v7.0.692): returned to the worklist -- Agent Training accepts findings while executing and source session now routes.';
  v_n      int;
begin
  -- D8 (first half): the anchor must occur EXACTLY ONCE before the replace, or replace() would
  -- write the sentence twice / nowhere and nothing downstream would notice.
  select (length(sp.method) - length(replace(sp.method, v_anchor, ''))) / length(v_anchor)
    into v_n from public.skill_profiles sp where sp.id = 'a6d3568f-3a39-44ff-a2b9-0aa62035281e';
  if v_n is distinct from 1 then
    raise exception 'AGT-264 D8: the anchor sentence occurs % time(s) in dm-audit-review-intent.method; need exactly 1', v_n;
  end if;

  v_dec := public.record_decision(
    v_cyc, NULL, 'agent-row', 'AGT-264',
    'AGT-264 (v7.0.692): Agent Training accepts findings while executing -- projects.accepts_findings true for agent-training, the manager''s Intent gains the exception sentence, AGT-106 moves to the Agent Training epic, and findings f7d0f975 / 07a7d637 go back to the worklist.',
    'John 2026-09-28 (directive 009eeb7a): "if the dev manager approves jerry''s and nathan''s request - move their tickets into the agent training project. That way they get picked up." AGT-240 locked every executing project''s list, so the manager''s pick of agent-training was refused and approved agent findings fell to Backlog Intake. Five rows change under this one handle, each imaged first: projects (the flag), skill_profiles dm-audit-review-intent (the judgment lives where the picker reads it, pattern:7), backlog_items AGT-106 (a ticket he already approved, in Intake only because the lock refused the pick), and the two findings the manager could not file. Routing stays his pick, not a rule on finding_type: agent:designer d08082a4 and agent:builder 2ab3c28c are product defects typed `defect` and would be misrouted.',
    NULL);

  -- (i) projects -- the flag itself. Imaged, then written.
  insert into public.runner_before_images (created_at, cycle_id, table_name, pk_value, row_data, decision_id)
  select clock_timestamp(), v_cyc, 'projects', p.id::text, to_jsonb(p), v_dec
    from public.projects p where p.id = '6b7a9757-4e40-486c-a422-e20c60858208';
  update public.projects
     set accepts_findings = true, updated_at = now(), updated_by = 'AGT-264'
   where id = '6b7a9757-4e40-486c-a422-e20c60858208';

  -- (ii) skill_profiles -- sentence S into the manager's own Intent, right after the anchor.
  insert into public.runner_before_images (created_at, cycle_id, table_name, pk_value, row_data, decision_id)
  select clock_timestamp(), v_cyc, 'skill_profiles', sp.id::text, to_jsonb(sp), v_dec
    from public.skill_profiles sp where sp.id = 'a6d3568f-3a39-44ff-a2b9-0aa62035281e';
  update public.skill_profiles
     set method = replace(method, v_anchor, v_anchor || v_s)
   where id = 'a6d3568f-3a39-44ff-a2b9-0aa62035281e';

  -- (iii) backlog_items -- AGT-106 into the Agent Training epic. scope_origin is `discovered`, so
  --       this move is refused by epic_lock_guard() unless the flag above is already true: the
  --       migration's own proof that the new guard works.
  insert into public.runner_before_images (created_at, cycle_id, table_name, pk_value, row_data, decision_id)
  select clock_timestamp(), v_cyc, 'backlog_items', b.id::text, to_jsonb(b), v_dec
    from public.backlog_items b where b.id = '095b7782-1aec-486f-a3f4-a4a99a73241f';
  update public.backlog_items
     set epic_id = 'e7d2c90d-6443-4779-8233-ead389dbbaff', updated_at = now()
   where id = '095b7782-1aec-486f-a3f4-a4a99a73241f';

  -- (iv, v) audit_findings -- the two the manager could not file, back on the worklist with R.
  insert into public.runner_before_images (created_at, cycle_id, table_name, pk_value, row_data, decision_id)
  select clock_timestamp(), v_cyc, 'audit_findings', a.id::text, to_jsonb(a), v_dec
    from public.audit_findings a where a.id = 'f7d0f975-80b4-458b-aac8-546bce13fc5f';
  update public.audit_findings set status = 'open', ruling = ruling || v_r
   where id = 'f7d0f975-80b4-458b-aac8-546bce13fc5f';

  insert into public.runner_before_images (created_at, cycle_id, table_name, pk_value, row_data, decision_id)
  select clock_timestamp(), v_cyc, 'audit_findings', a.id::text, to_jsonb(a), v_dec
    from public.audit_findings a where a.id = '07a7d637-920f-4e78-8d79-dad7926e012e';
  update public.audit_findings set status = 'open', ruling = ruling || v_r
   where id = '07a7d637-920f-4e78-8d79-dad7926e012e';
end
$agt264w$;

-- 6. TRAILING ASSERTIONS D1-D11, in the SAME transaction that wrote everything above. A migration's
--    success flag is never evidence (.claude/rules/supabase-column-grants.md); these are.
do $agt264a$
declare
  v_cyc   uuid := 'f4d1d272-1d2b-4e2b-a637-2f1331754b2b';
  v_def   text;
  v_dec   uuid;
  v_n     int;
  v_txt   text;
  v_fid   uuid;
  v_epic  uuid;
  v_ok    boolean;
  v_af0   int;
  v_bi0   int;
  v_tabs  text;
begin
  -- D1 EXACTLY ONE OVERLOAD EACH. CREATE OR REPLACE with an unchanged identity adds no overload,
  --    but the rule says assert it, never assume it (.claude/rules/supabase-function-signature.md).
  select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'finding_group_epic' and p.prokind = 'f';
  if v_n <> 1 then raise exception 'AGT-264 D1: finding_group_epic has % overload(s), need exactly 1', v_n; end if;
  select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'epic_lock_guard' and p.prokind = 'f';
  if v_n <> 1 then raise exception 'AGT-264 D1: epic_lock_guard has % overload(s), need exactly 1', v_n; end if;
  select pg_get_function_identity_arguments(p.oid) into v_txt from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'finding_group_epic';
  if v_txt <> 'p_group jsonb' then raise exception 'AGT-264 D1: finding_group_epic identity is (%), need (p_group jsonb)', v_txt; end if;

  -- D2 both lock sites really changed, and the mirrored sentence did not.
  select pg_get_functiondef(p.oid) into v_def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'finding_group_epic';
  v_n := (length(v_def) - length(replace(v_def, 'AND NOT v_acc THEN', ''))) / length('AND NOT v_acc THEN');
  if v_n <> 2 then raise exception 'AGT-264 D2: "AND NOT v_acc THEN" appears % time(s), need 2 (route slug + manager pick)', v_n; end if;
  v_n := (length(v_def) - length(replace(v_def, 'OR v_acc)', ''))) / length('OR v_acc)');
  if v_n <> 2 then raise exception 'AGT-264 D2: "OR v_acc)" appears % time(s), need 2 -- the epic filter is load-bearing, Agent Training''s only epic is locked', v_n; end if;
  v_n := (length(v_def) - length(replace(v_def, 'its list is locked; use kind list (AGT-240)', ''))) / length('its list is locked; use kind list (AGT-240)');
  if v_n <> 2 then raise exception 'AGT-264 D2: the lock sentence appears % time(s), need 2 -- scripts/audit-review.js mirrors it byte-for-byte', v_n; end if;

  -- D3 the insert guard joins the project and still raises the same sentence.
  select pg_get_functiondef(p.oid) into v_def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'epic_lock_guard';
  v_n := (length(v_def) - length(replace(v_def, 'AND NOT p.accepts_findings', ''))) / length('AND NOT p.accepts_findings');
  if v_n <> 1 then raise exception 'AGT-264 D3: "AND NOT p.accepts_findings" appears % time(s), need 1', v_n; end if;
  v_n := (length(v_def) - length(replace(v_def, 'AGT-240: epic % is locked', ''))) / length('AGT-240: epic % is locked');
  if v_n <> 1 then raise exception 'AGT-264 D3: the epic lock sentence appears % time(s), need 1', v_n; end if;

  -- D4 nine routes, one `session` row, still no catch-all.
  select count(*) into v_n from public.finding_routes;
  if v_n <> 9 then raise exception 'AGT-264 D4: finding_routes holds % row(s), need 9', v_n; end if;
  select count(*) into v_n from public.finding_routes
   where source = 'session' and precedence = 30 and finding_type = '*' and project_slug is null;
  if v_n <> 1 then raise exception 'AGT-264 D4: the session route (30, *, NULL) matched % row(s), need 1', v_n; end if;
  select count(*) into v_n from public.finding_routes where source = '*' and finding_type = '*';
  if v_n <> 0 then raise exception 'AGT-264 D4: a (*,*) catch-all route exists (% row(s)) -- an unmapped source must still STOP the review', v_n; end if;

  -- D5 exactly one flagged project, and it is Agent Training.
  select count(*) into v_n from public.projects where accepts_findings;
  if v_n <> 1 then raise exception 'AGT-264 D5: % project(s) carry accepts_findings, need exactly 1', v_n; end if;
  select slug into v_txt from public.projects where accepts_findings;
  if v_txt <> 'agent-training' then raise exception 'AGT-264 D5: the flagged project is %, need agent-training', v_txt; end if;

  -- D6 AGT-106 is under the Agent Training epic.
  select epic_id into v_epic from public.backlog_items where id = '095b7782-1aec-486f-a3f4-a4a99a73241f';
  if v_epic is distinct from 'e7d2c90d-6443-4779-8233-ead389dbbaff'::uuid then
    raise exception 'AGT-264 D6: AGT-106 sits under epic %, need e7d2c90d-6443-4779-8233-ead389dbbaff', v_epic;
  end if;

  -- D7 both findings are back on the worklist, each ruling carrying R.
  select count(*) into v_n from public.audit_findings
   where id in ('f7d0f975-80b4-458b-aac8-546bce13fc5f','07a7d637-920f-4e78-8d79-dad7926e012e')
     and status = 'open'
     and ruling like '%/ AGT-264 (v7.0.692): returned to the worklist -- Agent Training accepts findings while executing and source session now routes.';
  if v_n <> 2 then raise exception 'AGT-264 D7: % of 2 findings are open AND end with the AGT-264 clause', v_n; end if;

  -- D8 (second half) sentence S landed exactly once.
  select sp.method into v_txt from public.skill_profiles sp where sp.id = 'a6d3568f-3a39-44ff-a2b9-0aa62035281e';
  v_n := (length(v_txt) - length(replace(v_txt, 'EXCEPTION (AGT-264', ''))) / length('EXCEPTION (AGT-264');
  if v_n <> 1 then raise exception 'AGT-264 D8: sentence S appears % time(s) in dm-audit-review-intent.method, need exactly 1', v_n; end if;
  if position('A security finding still routes to Security while that project is planned. EXCEPTION (AGT-264' in v_txt) = 0 then
    raise exception 'AGT-264 D8: sentence S is not immediately after the anchor sentence';
  end if;

  -- D9 ONE decision handle, FIVE images, each holding the BEFORE state (which is what proves the
  --    image was written before its UPDATE, not merely that a row exists).
  select count(*) into v_n from public.runner_decisions
   where kind = 'agent-row' and backlog_id = 'AGT-264' and cycle_id = v_cyc and reversed_at is null;
  if v_n <> 1 then raise exception 'AGT-264 D9: % unreversed agent-row decision(s) for AGT-264 in this cycle, need exactly 1', v_n; end if;
  select id into v_dec from public.runner_decisions
   where kind = 'agent-row' and backlog_id = 'AGT-264' and cycle_id = v_cyc and reversed_at is null;
  select count(*) into v_n from public.runner_before_images where decision_id = v_dec;
  if v_n <> 5 then raise exception 'AGT-264 D9: the decision carries % image(s), need exactly 5', v_n; end if;
  select count(*) into v_n from public.runner_before_images where decision_id = v_dec and row_data is null;
  if v_n <> 0 then raise exception 'AGT-264 D9: % image(s) carry a null row_data -- an UPDATE image must hold the row', v_n; end if;
  select string_agg(table_name, ',' order by table_name, pk_value) into v_tabs
    from public.runner_before_images where decision_id = v_dec;
  if v_tabs <> 'audit_findings,audit_findings,backlog_items,projects,skill_profiles' then
    raise exception 'AGT-264 D9: the imaged tables are [%], need audit_findings,audit_findings,backlog_items,projects,skill_profiles', v_tabs;
  end if;
  select count(*) into v_n from public.runner_before_images
   where decision_id = v_dec and table_name = 'projects' and (row_data ->> 'accepts_findings') = 'false';
  if v_n <> 1 then raise exception 'AGT-264 D9: the projects image does not hold accepts_findings=false -- it was imaged AFTER the write'; end if;
  select count(*) into v_n from public.runner_before_images
   where decision_id = v_dec and table_name = 'backlog_items'
     and (row_data ->> 'epic_id') = '4d060063-e49c-430a-9d89-5bba7060fc5a' and (row_data ->> 'backlog_id') = 'AGT-106';
  if v_n <> 1 then raise exception 'AGT-264 D9: the backlog_items image does not hold AGT-106 in the Intake epic -- reverse_decision could not put it back'; end if;
  select count(*) into v_n from public.runner_before_images
   where decision_id = v_dec and table_name = 'skill_profiles' and (row_data ->> 'method') like '%EXCEPTION (AGT-264%';
  if v_n <> 0 then raise exception 'AGT-264 D9: the skill_profiles image already carries sentence S -- it was imaged AFTER the write'; end if;
  select count(*) into v_n from public.runner_before_images
   where decision_id = v_dec and table_name = 'audit_findings' and (row_data ->> 'status') in ('listed','escalated');
  if v_n <> 2 then raise exception 'AGT-264 D9: % of 2 audit_findings images hold the pre-reopen status (listed/escalated)', v_n; end if;

  -- D11 (before) the fixture must leave no residue.
  select count(*) into v_af0 from public.audit_findings;
  select count(*) into v_bi0 from public.backlog_items;

  -- D10 THE ROLLED-BACK FIXTURE. It pins the status it depends on, so the proof is independent of
  --     whatever the live world does to project statuses (auditor-enhancements was paused mid-day).
  begin
    update public.projects set status = 'executing' where slug = 'agent-training';

    insert into public.audit_findings
      (fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution,
       status, found_by, finding_type, family)
    values ('agt264fixture0001', '2000-W01', 'other', '[{"path":"agt-264-fixture"}]'::jsonb,
            'AGT-264 migration fixture', 'high', 'rolled back', 'open', 'agent:qa-agt264', 'defect', 'other')
    returning id into v_fid;

    -- (b) ACCEPTED while executing, and it returns the locked epic.
    v_epic := public.finding_group_epic(jsonb_build_object(
      'kind', 'root-cause', 'project', 'agent-training', 'finding_ids', jsonb_build_array(v_fid::text)));
    if v_epic is distinct from 'e7d2c90d-6443-4779-8233-ead389dbbaff'::uuid then
      raise exception 'AGT-264 D10b: a flagged executing project returned epic %, need e7d2c90d-6443-4779-8233-ead389dbbaff', v_epic;
    end if;

    -- (d, flag true) a `discovered` ticket lands in the flagged project's locked epic.
    insert into public.backlog_items
      (backlog_id, tier, type, priority_class, title, status, epic_id, source_file, scope_origin,
       size_stamp, defer_status, scope_rationale, enhancement_claim, row_ordinal)
    values ('ZFIX-2640', 'next', 'Tooling', 'P10 - Tooling', 'AGT-264 migration fixture', 'open',
            'e7d2c90d-6443-4779-8233-ead389dbbaff', 'agt-264-fixture', 'discovered', 'S', 'no',
            'fixture', 'none: fixture', 999999901);

    -- (c) CONTROL: clear the flag ONLY, and the very same pick is refused with the same sentence.
    update public.projects set accepts_findings = false where slug = 'agent-training';
    v_ok := false;
    begin
      perform public.finding_group_epic(jsonb_build_object(
        'kind', 'root-cause', 'project', 'agent-training', 'finding_ids', jsonb_build_array(v_fid::text)));
      v_ok := true;
    exception when others then
      if SQLERRM <> 'apply_audit_review: project agent-training is executing -- its list is locked; use kind list (AGT-240)' then
        raise exception 'AGT-264 D10c: refused, but not with the byte-identical lock sentence: %', SQLERRM;
      end if;
    end;
    if v_ok then
      raise exception 'AGT-264 D10c: an UNFLAGGED executing project was ACCEPTED -- the flag is not what gates this';
    end if;

    -- (d, flag false) CONTROL: the same insert is refused by the epic lock.
    v_ok := false;
    begin
      insert into public.backlog_items
        (backlog_id, tier, type, priority_class, title, status, epic_id, source_file, scope_origin,
         size_stamp, defer_status, scope_rationale, enhancement_claim, row_ordinal)
      values ('ZFIX-2641', 'next', 'Tooling', 'P10 - Tooling', 'AGT-264 migration fixture 2', 'open',
              'e7d2c90d-6443-4779-8233-ead389dbbaff', 'agt-264-fixture', 'discovered', 'S', 'no',
              'fixture', 'none: fixture', 999999902);
      v_ok := true;
    exception when others then
      if SQLERRM !~ 'AGT-240: epic' then
        raise exception 'AGT-264 D10d: refused, but not by the AGT-240 epic lock: %', SQLERRM;
      end if;
    end;
    if v_ok then
      raise exception 'AGT-264 D10d: an UNFLAGGED project''s locked epic accepted a discovered ticket';
    end if;
    update public.projects set accepts_findings = true where slug = 'agent-training';

    -- (e) the new `session` route resolves, and the manager's pick is still EXPLICIT.
    insert into public.audit_findings
      (fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution,
       status, found_by, finding_type, family)
    values ('agt264fixture0002', '2000-W01', 'other', '[{"path":"agt-264-fixture"}]'::jsonb,
            'AGT-264 migration fixture', 'high', 'rolled back', 'open', 'session:qa-agt264', 'defect', 'other')
    returning id into v_fid;
    if public.finding_group_epic(jsonb_build_object(
         'kind', 'root-cause', 'project', 'general', 'finding_ids', jsonb_build_array(v_fid::text))) is not null then
      raise exception 'AGT-264 D10e: a session finding picked to general did not return NULL';
    end if;
    v_ok := false;
    begin
      perform public.finding_group_epic(jsonb_build_object(
        'kind', 'root-cause', 'finding_ids', jsonb_build_array(v_fid::text)));
      v_ok := true;
    exception when others then
      if SQLERRM !~ 'needs project' or SQLERRM !~ 'session' then
        raise exception 'AGT-264 D10e: a session finding with no pick was refused for the wrong reason: %', SQLERRM;
      end if;
    end;
    if v_ok then
      raise exception 'AGT-264 D10e: a session finding with NO project was accepted -- missing must never read as general';
    end if;

    raise exception 'AGT264_OK';
  exception when others then
    if SQLERRM <> 'AGT264_OK' then raise; end if;
  end;

  -- D11 the fixture left nothing behind (rolled back by construction).
  select count(*) into v_n from public.audit_findings;
  if v_n <> v_af0 then raise exception 'AGT-264 D11: audit_findings moved from % to % -- fixture residue', v_af0, v_n; end if;
  select count(*) into v_n from public.backlog_items;
  if v_n <> v_bi0 then raise exception 'AGT-264 D11: backlog_items moved from % to % -- fixture residue', v_bi0, v_n; end if;
  if exists (select 1 from public.backlog_items where backlog_id like 'ZFIX-264%') then
    raise exception 'AGT-264 D11: a ZFIX-264* fixture ticket survived';
  end if;
  -- and the live flag is the one the ticket asks for, not the fixture's last write.
  if not (select accepts_findings from public.projects where slug = 'agent-training') then
    raise exception 'AGT-264 D11: agent-training ended with accepts_findings false';
  end if;

  raise notice 'AGT-264: D1-D11 all passed';
end
$agt264a$;
