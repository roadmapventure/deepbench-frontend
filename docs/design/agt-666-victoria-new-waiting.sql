-- DeepBench v7.0.1020 | docs/design/agt-666-victoria-new-waiting.sql | AGT-666 -- the daily check prompts on a NEW waiting ticket nobody has graded
--
-- WHY (John's rule, decision 572d2b06, 2026-11-13): build it, but she only grades waiting tickets
-- created inside his window (the number is in section (1), once). Live 2026-11-13 10:50Z `victoria_daily_check()` answered `prompt
-- false, at_floor` (tooling 60, dev-manager-capabilities 13, fives 0, ungraded_active 0) while
-- AGT-637 (the runner gate timeout that stopped the 07:42 and 09:05 CT cycles) sat UNGRADED in the
-- planned project `dev-mgr-findings`. Arm 2 sees only tickets she already graded 5; arm 3 (AGT-613)
-- only executing projects. A new waiting ticket she never graded reached no arm, so no run started.
--
-- WHAT THIS FILE CHANGES (apply AFTER docs/design/agt-613-victoria-grades-in-place.sql -- the
-- pre-check (0) refuses any other starting point):
--   (1) `victoria_new_waiting()` -- the ONE home of "new": open/partial tickets on a `planned`
--       project's list, with no unreversed `requirement-check` decision, no live fit-stamp under
--       today's charter fingerprint (`victoria_charter_state().stamped`), filed inside the window.
--       THE WINDOW'S NUMBER IS WRITTEN HERE ONCE AND NOWHERE ELSE -- not in the gate below, not in
--       a script, not in the routine block, not in a test: each of them READS this function.
--   (2) `victoria_daily_verdict(p_counts, p_fives, p_ungraded_active DEFAULT 0, p_new_waiting
--       DEFAULT 0)` -- a FOURTH arm, `new_waiting`, AFTER the three existing ones, which keep their
--       priority and wording. The 3-arg overload is DROPPED here, so there is one function; the two
--       DEFAULTs keep every 2- and 3-arg call resolving to it.
--   (3) `victoria_daily_check()` -- AGT-613's body (docs/design/agt-613-victoria-grades-in-place.sql
--       section (2), live at prosrc md5 0726375de1904fc03dedaadd0328b202) VERBATIM, plus ONE CTE
--       `fresh` over `victoria_new_waiting()`, fed to the verdict, and two `detail` keys:
--       `new_waiting` (count) and `new_ids` (sorted jsonb array). Every existing key, identity,
--       RETURNS, STABLE and search_path are unchanged.
--
-- No probe function: today's board holds 9 new waiting tickets (dev-mgr-findings 8, backlog-intake
-- 1, read 2026-11-13), so a board-reading gate already discriminates a reader that never learned
-- arm 4 (kickoff section 2).
--
-- Wrapped in ONE transaction by `apply_migration` (no BEGIN/COMMIT here): the trailing GATE's RAISE
-- rolls every statement back. DOWN: drop function public.victoria_new_waiting(); drop function
-- public.victoria_daily_verdict(jsonb, integer, integer, integer); then re-apply sections (1) and (2)
-- of docs/design/agt-613-victoria-grades-in-place.sql.

-- =================================================================================================
-- (0) THE BODIES THIS FILE BUILDS ON ARE THE BODIES THAT ARE LIVE. md5(pg_get_functiondef()) as
--     measured at design time (kickoff section 2). A re-apply of this same file is admitted: it is
--     recognised by the 4-arg verdict AND a check body that already reads victoria_new_waiting().
-- =================================================================================================
DO $pre$
declare
  v_n        integer;
  v_md5      text;
  v_reapply  boolean;
  r          record;
begin
  select exists (
           select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'victoria_daily_verdict' and p.prokind = 'f'
              and pg_get_function_identity_arguments(p.oid)
                  = 'p_counts jsonb, p_fives integer, p_ungraded_active integer, p_new_waiting integer')
     and exists (
           select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'victoria_daily_check' and p.prokind = 'f'
              and position('victoria_new_waiting' in p.prosrc) > 0)
    into v_reapply;

  for r in
    select * from (values
      ('victoria_daily_check',   '6eb855a1dc0054f4975e33823a0e354d', true),
      ('victoria_daily_verdict', '17626a1442cacf18068f030f74248e1f', true),
      ('victoria_intake_lists',  '58f8f6be7349fdda871323d3fc95c588', false),
      ('victoria_charter_state', '02f0947105ec169c856c25fae13957c7', false),
      ('needs_validation',       '9bedefe20619574390e4cd1c1db068c5', false)) t(fn, want, replaced)
  loop
    select count(*), max(md5(pg_get_functiondef(p.oid))) into v_n, v_md5 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = r.fn and p.prokind = 'f';
    if v_n <> 1 then
      raise exception 'agt666: % is % overload(s), expected 1 -- STOP and re-measure', r.fn, v_n;
    end if;
    if v_md5 <> r.want and not (r.replaced and v_reapply) then
      raise exception 'agt666: % is live at md5(pg_get_functiondef) %, this file was built on % -- the body moved; STOP and re-measure, never splice an unmeasured body', r.fn, v_md5, r.want;
    end if;
  end loop;
end
$pre$;

-- =================================================================================================
-- (1) victoria_new_waiting() -- the ONE home of "a new waiting ticket nobody has graded".
-- =================================================================================================
CREATE OR REPLACE FUNCTION public.victoria_new_waiting()
 RETURNS TABLE(backlog_id text, slug text, filed_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT b.backlog_id::text, pj.slug::text, b.filed_at
    FROM public.backlog_items b
    JOIN public.epics e     ON e.id = b.epic_id
    JOIN public.projects pj ON pj.id = e.project_id
        -- WAITING: a `planned` project's list. Executing projects are arm 3's (AGT-613); a paused
        -- project's ticket is not hers to move (requirements d.10).
   WHERE pj.status = 'planned'
     AND b.status IN ('open', 'partial')
        -- NEW: John's window (decision 572d2b06). Written here and nowhere else.
     AND b.filed_at >= now() - interval '30 days'
        -- UNGRADED: no standing `requirement-check` decision.
     AND NOT EXISTS (
           SELECT 1 FROM public.runner_decisions d
            WHERE d.kind = 'requirement-check'
              AND d.backlog_id = b.backlog_id
              AND d.reversed_at IS NULL)
        -- NOT ALREADY READ: a live fit-stamp under today's charter fingerprint means she read it
        -- against every active charter and placed it nowhere (AGT-486/516) -- the door drops it, so
        -- the sensor that prompts drops it too.
     AND NOT EXISTS (SELECT 1 FROM public.victoria_charter_state() s WHERE b.backlog_id = ANY (s.stamped))
   ORDER BY b.filed_at DESC, b.backlog_id
$function$;

REVOKE ALL ON FUNCTION public.victoria_new_waiting() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.victoria_new_waiting() TO service_role;

-- =================================================================================================
-- (2) victoria_daily_verdict -- the three old arms in their order, then the new fourth. Pure.
-- =================================================================================================
DROP FUNCTION IF EXISTS public.victoria_daily_verdict(jsonb, integer, integer);

CREATE OR REPLACE FUNCTION public.victoria_daily_verdict(p_counts jsonb, p_fives integer, p_ungraded_active integer DEFAULT 0, p_new_waiting integer DEFAULT 0)
 RETURNS TABLE(prompt boolean, reason text)
 LANGUAGE sql
 IMMUTABLE
 PARALLEL SAFE
AS $function$
  WITH below AS (
    SELECT count(*)::integer AS n
      FROM jsonb_array_elements(coalesce(p_counts, '[]'::jsonb)) e
     WHERE (e->>'countable')::integer < 10
  )
  SELECT CASE WHEN b.n > 0 THEN true
              WHEN coalesce(p_fives, 0) > 0 THEN true
              WHEN coalesce(p_ungraded_active, 0) > 0 THEN true
              WHEN coalesce(p_new_waiting, 0) > 0 THEN true
              ELSE false END AS prompt,
         CASE WHEN b.n > 0 THEN 'project_below_floor'
              WHEN coalesce(p_fives, 0) > 0 THEN 'five_outside_projects'
              WHEN coalesce(p_ungraded_active, 0) > 0 THEN 'ungraded_in_active'
              WHEN coalesce(p_new_waiting, 0) > 0 THEN 'new_waiting'
              ELSE 'at_floor' END::text AS reason
    FROM below b
$function$;

REVOKE ALL ON FUNCTION public.victoria_daily_verdict(jsonb, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.victoria_daily_verdict(jsonb, integer, integer, integer) TO service_role;

-- =================================================================================================
-- (3) victoria_daily_check() -- AGT-613's body verbatim + arm 4 (the `fresh` CTE and its two keys).
-- =================================================================================================
CREATE OR REPLACE FUNCTION public.victoria_daily_check()
 RETURNS TABLE(prompt boolean, reason text, detail jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  WITH arm1 AS (
    SELECT c.project_slug, c.countable, pj.priority
      FROM public.countable_tickets_per_project() c
      JOIN public.projects pj ON pj.slug = c.project_slug
  ),
  counts AS (
    SELECT coalesce(
             jsonb_agg(jsonb_build_object('slug', a.project_slug, 'countable', a.countable)
                       ORDER BY a.priority, a.project_slug),
             '[]'::jsonb) AS js
      FROM arm1 a
  ),
  below AS (
    SELECT coalesce(
             jsonb_agg(to_jsonb(a.project_slug) ORDER BY a.priority, a.project_slug),
             '[]'::jsonb) AS js
      FROM arm1 a
     WHERE a.countable < 10
  ),
  arm2 AS (
    SELECT b.backlog_id::text AS backlog_id
      FROM public.backlog_items b
      LEFT JOIN public.epics e
             ON e.id = b.epic_id
      LEFT JOIN public.projects pj
             ON pj.id = e.project_id
          -- P1: the two statuses that still hold work.
     WHERE b.status IN ('open', 'partial')
          -- P2, CHANGED: the 5s and only the 5s (requirements d.3). `effective_need_score` is
          -- AGT-483's lift, read from its one home.
       AND public.effective_need_score(b.id) = 5
          -- THE SCOPE, CHANGED: outside the active projects means a `planned` project's list or no
          -- epic at all. A `paused` project's ticket is NOT hers to move (requirements d.10), so
          -- `planned` is named rather than "not executing".
       AND (b.epic_id IS NULL OR pj.status = 'planned')
          -- P3: Victoria has graded it and that grade still stands (AGT-280's requirement gate).
       AND EXISTS (
             SELECT 1 FROM public.runner_decisions d
              WHERE d.kind = 'requirement-check'
                AND d.backlog_id = b.backlog_id
                AND d.reversed_at IS NULL)
          -- P4: no unfinished blocker -- the PICK's rule, read from its one home.
       AND (b.blocked_by IS NULL
            OR EXISTS (
                 SELECT 1 FROM public.backlog_items bb
                  WHERE bb.id = b.blocked_by
                    AND bb.status = ANY (public.backlog_unblocking_statuses())))
          -- P5: PARKED has no column -- it lives in the newest unreversed grade's own reasoning
          -- (DL-09: `PARKED (0) until ...`).
       AND coalesce((
             SELECT d2.reasoning FROM public.runner_decisions d2
              WHERE d2.kind = 'requirement-check'
                AND d2.backlog_id = b.backlog_id
                AND d2.reversed_at IS NULL
              ORDER BY d2.decided_at DESC
              LIMIT 1), '') NOT ILIKE 'PARKED%'
          -- P6: an undecided gate card holds the ticket out of the pick (AGT-253).
       AND NOT EXISTS (
             SELECT 1 FROM public.runner_items ri
              WHERE ri.backlog_id = b.backlog_id
                AND ri.kind = 'gated_before_build'
                AND ri.decision IS NULL)
          -- P7: a `needs-` design flag means the ticket is waiting on a decision, a desktop or
          -- John. The prefix is the rule, so a new flag is covered on arrival.
       AND coalesce(b.design_status, '') NOT LIKE 'needs-%'
          -- P8: AGT-482's fence -- the 6-hour window AND John's `STOPPED-BY-JOHN` sentinel, which
          -- no elapsed time frees.
       AND public.claim_exclusion_reason(b.claimed_by, b.claimed_at) IS NULL
          -- P9 (AGT-516): a ticket holding a live `fit-stamp` taken under the CURRENT charter
          -- fingerprint has already been read against every active charter and turned down, and
          -- `AGT-486`'s `--prepare-list` already drops it -- so the sensor that PROMPTS drops it
          -- too, or the daily check asks John about a ticket the door refuses, every day, forever.
          -- `victoria_charter_state()` is that fingerprint rule's ONE home and is READ here rather
          -- than re-derived: a charter edit, a pause or a new active project moves the fingerprint,
          -- no stamp matches, and every stamped ticket returns to arm 2 by itself (pattern:14/17).
       AND NOT EXISTS (SELECT 1 FROM public.victoria_charter_state() s WHERE b.backlog_id = ANY (s.stamped))
  ),
  fives AS (
    SELECT count(*)::integer AS n,
           coalesce(jsonb_agg(to_jsonb(f.backlog_id) ORDER BY f.backlog_id), '[]'::jsonb) AS js
      FROM arm2 f
  ),
  -- ARM 3 (AGT-613): an ungraded ticket sitting in an `executing` project. The predicate is NOT
  -- restated here: `victoria_intake_lists()` is its one home and returns an executing project only
  -- for its ungraded, unstamped open/partial tickets, so this arm is the sum of those rows.
  active AS (
    SELECT coalesce(sum(l.ungraded), 0)::integer AS n
      FROM public.victoria_intake_lists() l
      JOIN public.projects pj ON pj.slug = l.slug
     WHERE pj.status = 'executing'
  ),
  -- ARM 4 (AGT-666, decision 572d2b06): a NEW waiting ticket nobody has graded. The predicate --
  -- and John's window -- is NOT restated here: `victoria_new_waiting()` is its one home.
  fresh AS (
    SELECT count(*)::integer AS n,
           coalesce(jsonb_agg(to_jsonb(w.backlog_id) ORDER BY w.backlog_id), '[]'::jsonb) AS js
      FROM public.victoria_new_waiting() w
  )
  SELECT v.prompt,
         v.reason,
         jsonb_build_object(
           'below',           below.js,
           'counts',          counts.js,
           'fives',           fives.n,
           'five_ids',        fives.js,
           'ungraded_active', active.n,
           'new_waiting',     fresh.n,
           'new_ids',         fresh.js) AS detail
    FROM counts, below, fives, active, fresh,
         public.victoria_daily_verdict(counts.js, fives.n, active.n, fresh.n) v
$function$;

REVOKE ALL ON FUNCTION public.victoria_daily_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.victoria_daily_check() TO service_role;

-- =================================================================================================
-- (4) THE GATE. Asserts, leaves nothing behind, RAISEs (rolling the whole file back) on any miss.
-- =================================================================================================
DO $gate$
declare
  v_n       integer;
  v_key     text;
  v_detail  jsonb;
  v_reason  text;
  v_prompt  boolean;
  v_fn_ids  text[];
  v_raw_ids text[];
  v_oldest  timestamptz;
  v_leak    text[];
  r         record;
begin
  -- (a) one overload of each name, and the verdict is the 4-arg one.
  foreach v_key in array array['victoria_daily_verdict', 'victoria_daily_check', 'victoria_new_waiting', 'victoria_intake_lists'] loop
    select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = v_key and p.prokind = 'f';
    if v_n <> 1 then
      raise exception 'agt666: pg_proc holds % overloads of %, expected 1', v_n, v_key;
    end if;
  end loop;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'victoria_daily_verdict'
                    and pg_get_function_identity_arguments(p.oid)
                        = 'p_counts jsonb, p_fives integer, p_ungraded_active integer, p_new_waiting integer') then
    raise exception 'agt666: victoria_daily_verdict is not (p_counts jsonb, p_fives integer, p_ungraded_active integer, p_new_waiting integer)';
  end if;
  if (select p.provolatile from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'victoria_new_waiting') <> 's' then
    raise exception 'agt666: victoria_new_waiting() is not STABLE';
  end if;

  -- (b) EXECUTE closed to anon/authenticated BY NAME, open to service_role.
  foreach v_key in array array['public.victoria_daily_verdict(jsonb, integer, integer, integer)', 'public.victoria_daily_check()', 'public.victoria_new_waiting()'] loop
    if has_function_privilege('anon', v_key, 'EXECUTE') or has_function_privilege('authenticated', v_key, 'EXECUTE') then
      raise exception 'agt666: anon or authenticated can EXECUTE % -- the named revoke did not land', v_key;
    end if;
    if not has_function_privilege('service_role', v_key, 'EXECUTE') then
      raise exception 'agt666: service_role cannot EXECUTE %', v_key;
    end if;
  end loop;

  -- (c) THE VERDICT'S DISCRIMINATOR: each old arm still wins over arm 4; arm 4 answers only alone;
  --     all zero is at_floor; the 3-arg and 2-arg calls still resolve (the DEFAULTs).
  for r in
    select * from (values
      ('[{"slug":"z","countable":9}]'::jsonb,  0, 0, 1, true,  'project_below_floor'),
      ('[{"slug":"z","countable":10}]'::jsonb, 1, 0, 1, true,  'five_outside_projects'),
      ('[{"slug":"z","countable":10}]'::jsonb, 0, 1, 1, true,  'ungraded_in_active'),
      ('[{"slug":"z","countable":10}]'::jsonb, 0, 0, 1, true,  'new_waiting'),
      ('[{"slug":"z","countable":10}]'::jsonb, 0, 0, 0, false, 'at_floor')) t(c, f, u, w, p, why)
  loop
    if not exists (select 1 from public.victoria_daily_verdict(r.c, r.f, r.u, r.w) v where v.prompt = r.p and v.reason = r.why) then
      raise exception 'agt666: victoria_daily_verdict(%, %, %, %) does not answer % / %', r.c, r.f, r.u, r.w, r.p, r.why;
    end if;
  end loop;
  if not exists (select 1 from public.victoria_daily_verdict('[{"slug":"z","countable":10}]'::jsonb, 0, 0) v where v.prompt = false and v.reason = 'at_floor') then
    raise exception 'agt666: the 3-arg call no longer answers at_floor -- the p_new_waiting DEFAULT is missing';
  end if;
  if not exists (select 1 from public.victoria_daily_verdict('[{"slug":"z","countable":10}]'::jsonb, 0, 1) v where v.prompt = true and v.reason = 'ungraded_in_active') then
    raise exception 'agt666: the 3-arg call no longer answers ungraded_in_active';
  end if;
  if not exists (select 1 from public.victoria_daily_verdict('[{"slug":"z","countable":10}]'::jsonb, 0) v where v.prompt = false and v.reason = 'at_floor') then
    raise exception 'agt666: the 2-arg call no longer answers at_floor -- a DEFAULT is missing';
  end if;

  -- (d) the reader's contract: one row, every old key, plus new_waiting and new_ids, which agree.
  select count(*) into v_n from public.victoria_daily_check();
  if v_n <> 1 then
    raise exception 'agt666: victoria_daily_check() returned % rows, expected 1', v_n;
  end if;
  select c.detail, c.reason, c.prompt into v_detail, v_reason, v_prompt from public.victoria_daily_check() c;
  foreach v_key in array array['below', 'counts', 'fives', 'five_ids', 'ungraded_active', 'new_waiting', 'new_ids'] loop
    if not (v_detail ? v_key) then
      raise exception 'agt666: victoria_daily_check().detail is missing key % -- %', v_key, v_detail;
    end if;
  end loop;
  if (v_detail->>'new_waiting')::integer <> jsonb_array_length(v_detail->'new_ids') then
    raise exception 'agt666: detail.new_waiting % but new_ids holds % ids -- %', v_detail->>'new_waiting', jsonb_array_length(v_detail->'new_ids'), v_detail;
  end if;
  if v_reason = 'at_floor' and (v_detail->>'new_waiting')::integer > 0 then
    raise exception 'agt666: the reader answered at_floor with % new waiting ticket(s) -- arm 4 is not fed to the verdict', v_detail->>'new_waiting';
  end if;

  -- (e) new_waiting EQUALS A RAW-BOARD RE-DERIVATION. The raw set R is every predicate EXCEPT the
  --     window, re-derived here from the tables (planned list, open/partial, no standing grade, no
  --     live stamp). The window's number is NOT restated (one home): instead the reader's ids must be
  --     (i) a subset of R and (ii) an AGE SUFFIX of R -- every R ticket filed at or after the oldest
  --     id the reader returned is in it. A reader that dropped a predicate fails (i); one that
  --     dropped tickets inside its own window fails (ii).
  select coalesce(array_agg(x order by x), '{}') into v_fn_ids
    from jsonb_array_elements_text(v_detail->'new_ids') x;

  create temp table agt666_raw on commit drop as
    select b.backlog_id::text as backlog_id, b.filed_at
      from public.backlog_items b
      join public.epics e     on e.id = b.epic_id
      join public.projects pj on pj.id = e.project_id
     where pj.status = 'planned'
       and b.status in ('open', 'partial')
       and not exists (select 1 from public.runner_decisions d
                        where d.kind = 'requirement-check' and d.backlog_id = b.backlog_id and d.reversed_at is null)
       and not exists (select 1 from public.victoria_charter_state() s where b.backlog_id = any (s.stamped));

  select coalesce(array_agg(f order by f), '{}') into v_leak
    from unnest(v_fn_ids) f where f not in (select backlog_id from agt666_raw);
  if cardinality(v_leak) > 0 then
    raise exception 'agt666: victoria_new_waiting() returned % which the raw board does not hold as planned, open/partial, ungraded and unstamped', v_leak;
  end if;

  if cardinality(v_fn_ids) > 0 then
    select min(r2.filed_at) into v_oldest from agt666_raw r2 where r2.backlog_id = any (v_fn_ids);
    select coalesce(array_agg(r2.backlog_id order by r2.backlog_id), '{}') into v_raw_ids
      from agt666_raw r2 where r2.filed_at >= v_oldest;
    if v_raw_ids <> v_fn_ids then
      raise exception 'agt666: new_ids % is not an age suffix of the raw board -- the raw set filed since % is %', v_fn_ids, v_oldest, v_raw_ids;
    end if;
  end if;

  -- and the check's count is the function's own, row for row.
  select coalesce(array_agg(w.backlog_id order by w.backlog_id), '{}') into v_raw_ids from public.victoria_new_waiting() w;
  if v_raw_ids <> v_fn_ids then
    raise exception 'agt666: detail.new_ids % differs from victoria_new_waiting() %', v_fn_ids, v_raw_ids;
  end if;

  drop table agt666_raw;

  raise notice 'AGT-666 GATE PASSED: one overload each, verdict 4 arms in order with 2/3-arg defaults, grants both ways, detail.new_waiting % = new_ids % (an age suffix of the raw board), reader % / %',
    v_detail->>'new_waiting', v_detail->'new_ids', v_prompt, v_reason;
end
$gate$;
