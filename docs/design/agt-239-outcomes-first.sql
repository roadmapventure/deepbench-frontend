-- DeepBench v7.0.661 | docs/design/agt-239-outcomes-first.sql | AGT-239 — migration agt239_outcomes_first, mirrored byte-identical
--
-- FEATURE: AGT-239 -- THE AUDITOR CHECKS OUTCOMES FIRST. Measured 2026-09-27: 293 audit_findings,
-- 0 from runner:db-health; no flow check anywhere; 122 blocks in a row on gate_regression; 54
-- delivered tickets untouched > 1 day. Every finding that fired was paperwork.
--   D1 audit_findings.family (service|blocked|flow|outcome|paperwork|other), set at INSERT from
--      runner_settings.finding_families (first LIKE wins, else other), immutable after.
--   D2 flow checks = public.audit_flow_checks(), filed by scripts/audit-run-review.js --prepare.
--   D3 the per-run manager review skips `paperwork`; the weekly run passes scope weekly (all).
--   D4 rank service 0 > blocked 1 > rest 2 (scripts/audit-review.js).
--   D5 thresholds in runner_settings.flow_check_thresholds.
--   D6 db_health_tick() adds db-restarted and db-pressure-red-repeat to AGT-237's three.
--
-- Down captured FIRST by public.capture_migration_down(cycle b3105aa1, 'agt239_outcomes_first') for
-- db_health_tick(), audit_findings_guard(), apply_audit_review(uuid, text, text, jsonb), the three
-- new functions and the new trigger. Not in that down, by construction of the capture (a column is
-- an in-place ALTER it refuses, and naming one would null the whole down -- AGT-238's precedent):
-- the three columns and the Skill row -- their undo is
--   ALTER TABLE public.audit_findings DROP COLUMN family;   (after the down restores the guard)
--   ALTER TABLE public.runner_settings DROP COLUMN finding_families, DROP COLUMN flow_check_thresholds;
--   the runner_before_images row for skill_profiles au-run-intent (d88cc407) restores method/traits.
--
-- The three edited functions are pg_get_functiondef() LIVE at apply time with ONLY the kickoff's
-- edits, made by exact-fragment replace: each fragment must occur exactly once or the migration
-- refuses (so a body that drifted since design cannot be silently half-edited).
-- Governing: ARCHITECTURE.md §19v; .claude/rules/supabase-column-grants.md (functions default OPEN:
-- revoke anon/authenticated BY NAME, assert both directions); supabase-function-signature.md.

-- ---------------------------------------------------------------------------------------------
-- (1) Settings: the family map and the flow thresholds. Before-image of the settings row first.
-- ---------------------------------------------------------------------------------------------
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT 'b3105aa1-a956-4abd-a0ac-8561782ec620'::uuid, 'runner_settings', s.id::text, to_jsonb(s)
  FROM public.runner_settings s WHERE s.id = 1;

ALTER TABLE public.runner_settings
  ADD COLUMN IF NOT EXISTS finding_families jsonb NOT NULL
  DEFAULT '[["runner:db-health","service"],["auditor:flow:%","flow"],["auditor:%","paperwork"],["staff-watch:%","paperwork"],["ticket-owner:%","paperwork"],["check-routine-prompt:%","paperwork"]]'::jsonb;

ALTER TABLE public.runner_settings
  ADD COLUMN IF NOT EXISTS flow_check_thresholds jsonb NOT NULL
  DEFAULT '{"ship_open_days":1,"gate_red_days":1,"window_hours":24,"wasted_pct":25,"wasted_min_cycles":8,"filing_min":10,"filing_ratio":2}'::jsonb;

COMMENT ON COLUMN public.runner_settings.finding_families IS
  'AGT-239 D1: [[found_by LIKE pattern, family], ...] -- first match wins, else other. Read by public.finding_family() at audit_findings INSERT.';
COMMENT ON COLUMN public.runner_settings.flow_check_thresholds IS
  'AGT-239 D5: thresholds for public.audit_flow_checks(). Days, hours, percent, counts, ratio.';

-- ---------------------------------------------------------------------------------------------
-- (2) finding_family(found_by): the one home of the map.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finding_family(p_found_by text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  -- AGT-239 D1: the first pattern in runner_settings.finding_families that p_found_by is LIKE wins;
  -- no match (or a NULL found_by) is `other`.
  SELECT coalesce(
    (SELECT m.pair ->> 1
       FROM public.runner_settings s
      CROSS JOIN LATERAL jsonb_array_elements(s.finding_families) WITH ORDINALITY AS m(pair, ord)
      WHERE s.id = 1 AND p_found_by LIKE (m.pair ->> 0)
      ORDER BY m.ord
      LIMIT 1),
    'other');
$function$;

-- ---------------------------------------------------------------------------------------------
-- (3) audit_findings.family: add, backfill EVERY row, THEN NOT NULL, THEN the INSERT trigger.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.audit_findings
  ADD COLUMN IF NOT EXISTS family text
  CONSTRAINT ck_audit_findings_family CHECK (family IN ('service','blocked','flow','outcome','paperwork','other'));

COMMENT ON COLUMN public.audit_findings.family IS
  'AGT-239 D1: service|blocked|flow|outcome|paperwork|other. Set at INSERT (the writer''s value, else public.finding_family(found_by)); immutable after (audit_findings_guard).';

UPDATE public.audit_findings a SET family = public.finding_family(a.found_by) WHERE a.family IS NULL;

ALTER TABLE public.audit_findings ALTER COLUMN family SET NOT NULL;

CREATE OR REPLACE FUNCTION public.audit_findings_family()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- AGT-239 D1: a writer that names the family keeps it; otherwise the map decides.
  NEW.family := coalesce(NEW.family, public.finding_family(NEW.found_by));
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS audit_findings_family ON public.audit_findings;
CREATE TRIGGER audit_findings_family BEFORE INSERT ON public.audit_findings
  FOR EACH ROW EXECUTE FUNCTION public.audit_findings_family();

-- ---------------------------------------------------------------------------------------------
-- (4) The three edited functions, from their LIVE definitions.
-- ---------------------------------------------------------------------------------------------
DO $edit$
DECLARE
  v_def text;
  v_old text;
  v_new text;
  v_n   int;
BEGIN
  -- (4a) audit_findings_guard(): family joins both ROW lists; the messages are untouched.
  v_def := pg_get_functiondef('public.audit_findings_guard()'::regprocedure);
  FOREACH v_old IN ARRAY ARRAY['NEW.check_slug, NEW.finding_type)', 'OLD.check_slug, OLD.finding_type)'] LOOP
    v_n := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
    IF v_n <> 1 THEN RAISE EXCEPTION 'agt239: audit_findings_guard fragment % occurs % times, not 1', v_old, v_n; END IF;
    v_def := replace(v_def, v_old, replace(v_old, '_type)', '_type, ' || left(v_old, 3) || '.family)'));
  END LOOP;
  EXECUTE v_def;

  -- (4b) apply_audit_review() step 1b only: the per-run scope skips paperwork; absent = weekly = all.
  v_def := pg_get_functiondef('public.apply_audit_review(uuid, text, text, jsonb)'::regprocedure);
  v_old := $o$    FROM public.audit_findings a WHERE a.status IN ('open','carried');$o$;
  v_new := $o$    FROM public.audit_findings a WHERE a.status IN ('open','carried')
     AND (coalesce(p_review->>'scope','weekly') = 'weekly' OR a.family <> 'paperwork');  -- AGT-239 D3$o$;
  v_n := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
  IF v_n <> 1 THEN RAISE EXCEPTION 'agt239: apply_audit_review step-1b fragment occurs % times, not 1', v_n; END IF;
  EXECUTE replace(v_def, v_old, v_new);

  -- (4c) db_health_tick() block (2): db-restarted and db-pressure-red-repeat (D6).
  v_def := pg_get_functiondef('public.db_health_tick()'::regprocedure);
  v_old := $o$  v_errs     text[] := '{}';
BEGIN$o$;
  v_new := $o$  v_errs     text[] := '{}';
  v_starts_n integer;   -- AGT-239: red episode starts in 24 h
  v_starts   text;      -- AGT-239: their times and reading ids
BEGIN$o$;
  v_n := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
  IF v_n <> 1 THEN RAISE EXCEPTION 'agt239: db_health_tick DECLARE fragment occurs % times, not 1', v_n; END IF;
  v_def := replace(v_def, v_old, v_new);

  v_old := $o$(automatic restart is AGT-237 (d)).');
        END IF;
      END IF;
    END IF;
$o$;
  v_new := $o$(automatic restart is AGT-237 (d)).');
        END IF;

        -- AGT-239 (D6): a red episode START is a red reading whose previous completed reading is
        -- not red. Two or more in 24 h means the database keeps falling over, not one bad spell.
        -- Fingerprint as the others: slug + the current episode's start reading.
        SELECT count(*)::integer,
               string_agg(format('%s (reading %s)', to_char(x.fired_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI"Z"'), x.id), ', ' ORDER BY x.fired_at)
          INTO v_starts_n, v_starts
          FROM (SELECT d.id, d.fired_at, d.level,
                       lag(d.level) OVER (ORDER BY d.fired_at) AS prev_level
                  FROM public.db_health_readings d
                 WHERE d.level IS NOT NULL AND d.fired_at >= now() - interval '48 hours') x
         WHERE x.level = 'red' AND x.prev_level IS DISTINCT FROM 'red'
           AND x.fired_at >= now() - interval '24 hours';
        IF v_starts_n >= 2 THEN
          v_find := v_find || jsonb_build_object(
            'slug', 'db-pressure-red-repeat', 'reading_id', v_start.id,
            'text', format('Database health went RED %s separate times in 24 h (episode starts: %s).',
                           v_starts_n, v_starts),
            'fact', 'A database that goes red again after recovering is under standing pressure; each episode stops the runner and fails live requests.',
            'fix', 'Find what keeps pushing the instance into swap or iowait (the readings before each start) and remove it, or move to a larger compute size -- a spend decision that is John''s.');
        END IF;
      END IF;

      -- AGT-239 (D6): the grade notes a restart when a CPU counter went down.
      IF array_to_string(v_newest.reasons, '; ') LIKE '%(the database restarted)%' THEN
        v_find := v_find || jsonb_build_object(
          'slug', 'db-restarted', 'reading_id', v_newest.id,
          'text', format('The database restarted before reading %s at %s: %s since the previous completed reading; MemAvailable %s MB, swap used %s MB.',
                         v_newest.id, to_char(v_newest.fired_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI"Z"'),
                         CASE WHEN v_before.id IS NOT NULL
                              THEN round(extract(epoch FROM (v_newest.fired_at - v_before.fired_at)) / 60.0, 1)::text || ' min'
                              ELSE 'no earlier reading' END,
                         coalesce(round(v_newest.mem_available_bytes / 1048576.0)::text, 'n/a'),
                         coalesce(round((v_newest.swap_total_bytes - v_newest.swap_free_bytes) / 1048576.0)::text, 'n/a')),
          'fact', 'A database restart is a service outage: every in-flight request fails and a running build loses its connection.',
          'fix', 'Read the readings before the restart (swap, iowait, probe) for the cause; a restart made by hand from the dashboard needs nothing.');
      END IF;
    END IF;
$o$;
  v_n := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
  IF v_n <> 1 THEN RAISE EXCEPTION 'agt239: db_health_tick block-(2) fragment occurs % times, not 1', v_n; END IF;
  EXECUTE replace(v_def, v_old, v_new);
END
$edit$;

-- ---------------------------------------------------------------------------------------------
-- (5) audit_flow_checks(): the four flow checks, as findings. Numbers ONLY in locations[].text;
--     governing_fact is fixed per slug, so the same week re-files nothing (fingerprint).
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_flow_checks()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  t        jsonb;
  v_out    jsonb := '[]'::jsonb;
  v_since  timestamptz;
  r        record;
  g        text;
  v_ok     timestamptz;
  v_first  timestamptz;
  v_n      integer;
  v_appr   timestamptz;
  v_total  integer;
  v_gated  integer;
  v_dnr    integer;
  v_nosha  integer;
  v_wasted integer;
  ts       text := 'YYYY-MM-DD HH24:MI"Z"';
BEGIN
  SELECT s.flow_check_thresholds INTO t FROM public.runner_settings s WHERE s.id = 1;
  IF t IS NULL THEN
    RAISE EXCEPTION 'audit_flow_checks: runner_settings.flow_check_thresholds is null';
  END IF;
  v_since := now() - (t->>'window_hours')::numeric * interval '1 hour';

  -- (a) flow-ship-not-closed (blocked): delivered tickets untouched past ship_open_days, per project.
  FOR r IN
    SELECT p.slug, count(*)::integer AS n, min(b.updated_at) AS oldest,
           (array_agg(b.backlog_id ORDER BY b.updated_at, b.backlog_id))[1:10] AS ids
      FROM public.backlog_items b
      JOIN public.epics e ON e.id = b.epic_id
      JOIN public.projects p ON p.id = e.project_id
     WHERE b.status = 'delivered'
       AND b.updated_at < now() - (t->>'ship_open_days')::numeric * interval '1 day'
     GROUP BY p.slug
     ORDER BY p.slug
  LOOP
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'kind', 'other', 'finding_type', 'defect', 'confidence', 'high',
      'check_slug', 'flow-ship-not-closed', 'family', 'blocked',
      'locations', jsonb_build_array(jsonb_build_object(
        'location', 'projects/' || r.slug,
        'text', format('%s delivered ticket(s) untouched for more than %s day(s); oldest last updated %s; %s',
                       r.n, t->>'ship_open_days', to_char(r.oldest AT TIME ZONE 'UTC', ts),
                       array_to_string(r.ids, ', ')))),
      'governing_fact', 'A delivered ticket is built and on dev; it must be verified and closed or reopened, never left delivered.',
      'proposed_resolution', 'Grade each delivered ticket and close or reopen it, and find why the close step did not run for them.'));
  END LOOP;

  -- (b) flow-verdict-gate-red (blocked): a gate red on every verdict since its last non-red, the
  --     first of those reds older than gate_red_days.
  SELECT max(v.created_at) INTO v_appr FROM public.runner_verdicts v WHERE v.verdict = 'approve';
  FOREACH g IN ARRAY ARRAY['build', 'regression', 'hygiene'] LOOP
    EXECUTE format('SELECT max(v.created_at) FROM public.runner_verdicts v WHERE v.%I IS DISTINCT FROM ''red''', 'gate_' || g)
      INTO v_ok;
    EXECUTE format('SELECT count(*)::integer, min(v.created_at) FROM public.runner_verdicts v WHERE v.%I = ''red'' AND v.created_at > $1', 'gate_' || g)
      INTO v_n, v_first USING coalesce(v_ok, '-infinity'::timestamptz);
    IF v_n > 0 AND v_first < now() - (t->>'gate_red_days')::numeric * interval '1 day' THEN
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'kind', 'other', 'finding_type', 'defect', 'confidence', 'high',
        'check_slug', 'flow-verdict-gate-red', 'family', 'blocked',
        'locations', jsonb_build_array(jsonb_build_object(
          'location', 'runner_verdicts/gate_' || g,
          'text', format('gate_%s red on %s verdict(s) in a row since %s; last approve %s',
                         g, v_n, to_char(v_first AT TIME ZONE 'UTC', ts),
                         coalesce(to_char(v_appr AT TIME ZONE 'UTC', ts), 'never')))),
        'governing_fact', 'A verdict gate that stays red blocks every ship behind it; a gate red past its threshold is a stalled pipeline, not a per-ticket failure.',
        'proposed_resolution', 'Diagnose the shared cause the gate keeps reporting and fix it once, instead of building more tickets into it.'));
    END IF;
  END LOOP;

  -- (c) flow-wasted-cycles (flow): gated_before_build + did_not_run + shipped with no push_sha.
  SELECT count(*)::integer,
         count(*) FILTER (WHERE c.outcome = 'gated_before_build')::integer,
         count(*) FILTER (WHERE c.outcome = 'did_not_run')::integer,
         count(*) FILTER (WHERE c.outcome = 'shipped' AND c.push_sha IS NULL)::integer
    INTO v_total, v_gated, v_dnr, v_nosha
    FROM public.runner_cycles c
   WHERE c.started_at >= v_since;
  v_wasted := v_gated + v_dnr + v_nosha;
  IF v_total >= (t->>'wasted_min_cycles')::numeric
     AND v_total > 0 AND 100.0 * v_wasted / v_total >= (t->>'wasted_pct')::numeric THEN
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'kind', 'other', 'finding_type', 'defect', 'confidence', 'high',
      'check_slug', 'flow-wasted-cycles', 'family', 'flow',
      'locations', jsonb_build_array(jsonb_build_object(
        'location', 'runner_cycles/window',
        'text', format('%s of %s cycles in the last %s h were wasted (%s%%): %s gated_before_build, %s did_not_run, %s shipped with no push_sha',
                       v_wasted, v_total, t->>'window_hours', round(100.0 * v_wasted / v_total),
                       v_gated, v_dnr, v_nosha))),
      'governing_fact', 'A cycle that is gated before it builds, does not run, or ships nothing to dev spends the budget and moves no ticket.',
      'proposed_resolution', 'Read the wasted cycles'' last_step and notes for the common cause and remove it before the next run.'));
  END IF;

  -- (d) flow-filing-outpaces-closing (flow): per project, filed >= filing_min and > filing_ratio x closed.
  FOR r IN
    SELECT p.slug,
           count(*) FILTER (WHERE b.filed_at >= v_since)::integer AS filed,
           count(*) FILTER (WHERE b.status IN ('done', 'removed') AND b.updated_at >= v_since)::integer AS closed
      FROM public.backlog_items b
      JOIN public.epics e ON e.id = b.epic_id
      JOIN public.projects p ON p.id = e.project_id
     GROUP BY p.slug
     ORDER BY p.slug
  LOOP
    IF r.filed >= (t->>'filing_min')::numeric AND r.filed > (t->>'filing_ratio')::numeric * r.closed THEN
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'kind', 'other', 'finding_type', 'defect', 'confidence', 'high',
        'check_slug', 'flow-filing-outpaces-closing', 'family', 'flow',
        'locations', jsonb_build_array(jsonb_build_object(
          'location', 'projects/' || r.slug || '/filing',
          'text', format('%s ticket(s) filed and %s closed (done or removed) in the last %s h; the ratio limit is %s',
                         r.filed, r.closed, t->>'window_hours', t->>'filing_ratio'))),
        'governing_fact', 'A project that files tickets faster than it closes them grows its backlog without finishing; the review is finding the wrong things or the build is not keeping up.',
        'proposed_resolution', 'Stop filing into this project until its open tickets close, and review whether the filings are outcomes or paperwork.'));
    END IF;
  END LOOP;

  RETURN v_out;
END
$function$;

-- ---------------------------------------------------------------------------------------------
-- (6) au-run-intent: the answer names a family; the method reads service and flow first.
--     Agent-row write on an agreed ticket (AGENT-ROW-AGREED-TICKET): before-image first.
-- ---------------------------------------------------------------------------------------------
INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
SELECT 'b3105aa1-a956-4abd-a0ac-8561782ec620'::uuid, 'skill_profiles', sp.id::text, to_jsonb(sp)
  FROM public.skill_profiles sp WHERE sp.slug = 'au-run-intent';

UPDATE public.skill_profiles sp
   SET traits = jsonb_set(
                  jsonb_set(sp.traits, '{schema,properties,findings,items,required}',
                            (sp.traits #> '{schema,properties,findings,items,required}') || '["family"]'::jsonb),
                  '{schema,properties,findings,items,properties,family}',
                  '{"type":"string","enum":["outcome","paperwork"]}'::jsonb),
       method = 'OUTCOMES FIRST (AGT-239, John 2026-09-27): read `service` and `flow` before the record. `outcome` = the run broke, stalled, wasted work or left something unclosed; record/text/citation consistency is `paperwork` and waits for the weekly review. '
                || sp.method
 WHERE sp.slug = 'au-run-intent'
   AND NOT (sp.traits #> '{schema,properties,findings,items,required}') ? 'family';

-- ---------------------------------------------------------------------------------------------
-- (7) Grants: the three new functions default OPEN -- revoke the three roles BY NAME.
-- ---------------------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.finding_family(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_findings_family() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_flow_checks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finding_family(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.audit_findings_family() TO service_role;
GRANT EXECUTE ON FUNCTION public.audit_flow_checks() TO service_role;

-- ---------------------------------------------------------------------------------------------
-- (8) The gate. Rolled-back probes raise P0239 and are caught; their counts survive in variables.
-- ---------------------------------------------------------------------------------------------
DO $assert$
DECLARE
  v_name   text;
  v_n      integer;
  v_flow   jsonb;
  v_el     jsonb;
  v_tick   jsonb;
  v_rr     integer;
  v_rrfam  text;
  v_rs     integer;
  v_rsfam  text;
  v_sp     jsonb;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['finding_family', 'audit_flow_checks', 'db_health_tick', 'audit_findings_guard',
                                'apply_audit_review', 'audit_findings_family'] LOOP
    SELECT count(*) INTO v_n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = v_name;
    IF v_n <> 1 THEN RAISE EXCEPTION 'agt239 gate: % has % overloads, not 1', v_name, v_n; END IF;
  END LOOP;

  SELECT count(*) INTO v_n FROM public.audit_findings WHERE family IS NULL;
  IF v_n <> 0 THEN RAISE EXCEPTION 'agt239 gate: % audit_findings rows with NULL family', v_n; END IF;

  IF has_function_privilege('anon', 'public.audit_flow_checks()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.finding_family(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.audit_flow_checks()', 'EXECUTE') THEN
    RAISE EXCEPTION 'agt239 gate: anon/authenticated can still EXECUTE a new function';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.audit_flow_checks()', 'EXECUTE') THEN
    RAISE EXCEPTION 'agt239 gate: service_role cannot EXECUTE audit_flow_checks()';
  END IF;

  IF public.finding_family('runner:db-health') <> 'service'
     OR public.finding_family('auditor:flow:x') <> 'flow'
     OR public.finding_family('auditor:run-review:x') <> 'paperwork'
     OR public.finding_family('researcher:x') <> 'other' THEN
    RAISE EXCEPTION 'agt239 gate: finding_family() map is wrong';
  END IF;

  v_flow := public.audit_flow_checks();
  IF jsonb_typeof(v_flow) <> 'array' THEN RAISE EXCEPTION 'agt239 gate: audit_flow_checks() is not an array'; END IF;
  FOR v_el IN SELECT value FROM jsonb_array_elements(v_flow) LOOP
    IF NOT (v_el ?& ARRAY['kind','finding_type','confidence','check_slug','family','locations','governing_fact','proposed_resolution']) THEN
      RAISE EXCEPTION 'agt239 gate: flow element lacks one of the eight keys: %', v_el;
    END IF;
  END LOOP;

  SELECT traits #> '{schema,properties,findings,items}' INTO v_sp FROM public.skill_profiles WHERE slug = 'au-run-intent';
  IF NOT ((v_sp -> 'required') ? 'family') OR (v_sp #> '{properties,family,enum}') <> '["outcome","paperwork"]'::jsonb THEN
    RAISE EXCEPTION 'agt239 gate: au-run-intent schema lacks the required family enum';
  END IF;

  -- Probe 1: red(-40 m), green(-30 m), red(now) -> one db-pressure-red-repeat, family service.
  BEGIN
    INSERT INTO public.db_health_readings (fired_at, taken_at, level, reasons) VALUES
      (now() - interval '40 minutes', now() - interval '40 minutes', 'red',   ARRAY['REST probe answered HTTP 503']),
      (now() - interval '30 minutes', now() - interval '30 minutes', 'green', ARRAY[]::text[]),
      (now(),                         now(),                         'red',   ARRAY['REST probe answered HTTP 503']);
    v_tick := public.db_health_tick();
    SELECT count(*), min(family) INTO v_rr, v_rrfam FROM public.audit_findings
     WHERE check_slug = 'db-pressure-red-repeat' AND created_at >= now();
    RAISE EXCEPTION USING ERRCODE = 'P0239', MESSAGE = 'agt239 probe 1 rollback';
  EXCEPTION WHEN SQLSTATE 'P0239' THEN NULL;
  END;
  IF v_rr <> 1 OR v_rrfam IS DISTINCT FROM 'service' THEN
    RAISE EXCEPTION 'agt239 gate: probe 1 filed % db-pressure-red-repeat (family %), want 1 service; tick %', v_rr, v_rrfam, v_tick;
  END IF;

  -- Probe 2: a newest green carrying the restart note -> one db-restarted.
  BEGIN
    INSERT INTO public.db_health_readings (fired_at, taken_at, level, reasons) VALUES
      (now(), now(), 'green', ARRAY['iowait not graded: a CPU counter went down (the database restarted)']);
    v_tick := public.db_health_tick();
    SELECT count(*), min(family) INTO v_rs, v_rsfam FROM public.audit_findings
     WHERE check_slug = 'db-restarted' AND created_at >= now();
    RAISE EXCEPTION USING ERRCODE = 'P0239', MESSAGE = 'agt239 probe 2 rollback';
  EXCEPTION WHEN SQLSTATE 'P0239' THEN NULL;
  END;
  IF v_rs <> 1 OR v_rsfam IS DISTINCT FROM 'service' THEN
    RAISE EXCEPTION 'agt239 gate: probe 2 filed % db-restarted (family %), want 1 service; tick %', v_rs, v_rsfam, v_tick;
  END IF;

  RAISE NOTICE 'agt239 gate: 6 functions x 1 overload; 0 NULL family; anon denied; % flow finding(s) live; probe 1 red-repeat % (%); probe 2 restarted % (%)',
    jsonb_array_length(v_flow), v_rr, v_rrfam, v_rs, v_rsfam;
END
$assert$;
