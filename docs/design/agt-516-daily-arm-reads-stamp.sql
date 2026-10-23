-- AGT-516 (v7.0.884) -- THE DAILY ARM READS THE STAMP. `AGT-486` (v7.0.861) built the fit-stamp:
-- Victoria reads every unplaced ticket once against all the active charters, and a ticket that fits
-- none takes ONE `runner_decisions` row of kind `fit-stamp` whose summary carries the charter
-- fingerprint. `--prepare-list` already drops every ticket holding such a stamp, so the DOOR reads
-- it. Measured live 2026-10-23: `public.victoria_daily_check()` does not -- the string `fit-stamp`
-- appears in its body ZERO times. Four unreversed stamps stand (AGT-438, AGT-440, AGT-500,
-- AGT-501, fingerprint `3b09cd44c2260491b6ab6d87b55fc5c4`), all four tickets open and graded in
-- `planned` projects, and only their scores (3-4) keep them out of arm 2's five. The day one of
-- them is scored 5 -- or any stamped ticket is -- the SENSOR THAT PROMPTS asks John about a ticket
-- the DOOR has already turned down, every day, forever. That is the bug: sensor and door read the
-- same board through different rules.
--
-- ONE LINE, AND THE REASON IT IS ONE LINE (pattern:1/14/17):
--
--   Arm 2 of `victoria_daily_check()` gains a NINTH predicate beside AGT-485's P1-P8 --
--   `NOT EXISTS (... public.victoria_charter_state() s WHERE b.backlog_id = ANY (s.stamped))` --
--   and nothing else in the function moves. `victoria_charter_state()` is the fingerprint rule's
--   ONE HOME (AGT-486): it recomputes the md5 of the live `executing` charters every call and
--   returns only the stamps taken under THAT fingerprint, so a charter edit, a pause or a new
--   active project moves the fingerprint, no stamp matches, and every stamped ticket comes back
--   into arm 2 by itself. Reading that function is what makes this one line a rule rather than a
--   second copy of the rule; re-deriving the fingerprint here would be the drift AGT-486 removed.
--
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT DO (the designer's calls, reversible):
--   (1) NO NEW DECISION KIND. `placement` is "placed" and `fit-stamp` is "turned down"; arm 2 needs
--       the second, which already exists.
--   (2) NO `placement` PREDICATE. A ticket that was MOVED leaves arm 2 by its scope (it is homed in
--       an `executing` project, so `b.epic_id IS NULL OR pj.status = 'planned'` drops it) and a
--       PARKED 0 leaves by P2 and P5. Adding a third test would be a predicate with no case.
--   (3) NO HAND RE-READ of today's ten fives, and no routine created or switched: the daily routine
--       stays John's hand (requirements d.35), exactly as AGT-485 left it.
--
-- THE SECOND FUNCTION IS THE PROOF, NOT A FEATURE. `victoria_daily_probe()` is AGT-483's
-- `parent_score_probe()` form (v7.0.858): it reads the fives, stamps the FIRST of them inside a
-- sub-block that ends in a `P0516` sentinel, re-reads the fives, rolls the sub-block back and
-- returns `before` / `after` / `after_ids` / `residue`. P9 is invisible from a board where nothing
-- stamped happens to be scored 5 -- which is today's board -- so without a probe the guard would
-- assert that ten equals ten and pass on a function that never read the stamp at all
-- (pattern:75: a false green must be structurally impossible). With it, the guard grades the only
-- thing P9 changes: stamp one five and the sensor drops it. `residue` is read AFTER the sentinel
-- and must be 0, so the standing assertion never leaves a stamp on the real board (pattern:76).
--
-- THIS FILE IS THE MIRROR of the migration `agt516_daily_arm_reads_stamp`, applied via mcp Supabase
-- `apply_migration` (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT here -- and
-- so the trailing GATE's RAISE rolls every statement below back). Kickoff:
-- docs/kickoffs/v7.0.884-AGT-516-daily-arm-reads-stamp.md; reasoning: docs/harvests/AGT-516.md.
--
-- =================================================================================================
-- *** APPLIED 2026-10-23 by cycle 3a9c2d63-8d66-4eee-a2e9-e9ebdc9745bb -- THIS IS NOW THE MIRROR. ***
-- =================================================================================================
--
-- (a) THE DOWN, CAPTURED FIRST -- before any statement below ran (runbook step 6). Returned row,
--     verbatim:
--
--       captured_up_name     agt516_daily_arm_reads_stamp
--       captured_class       auto-downable
--       objects_captured     2
--       refusals             0
--       derived_down_sql     drop function if exists public.victoria_daily_probe;
--                            CREATE OR REPLACE FUNCTION public.victoria_daily_check() ... (the
--                            pre-AGT-516 body, captured in full) followed by the `do $dbdown$`
--                            stale-overload sweep and the `count(*) = 1` assertion
--                            `.claude/rules/supabase-function-signature.md` requires.
--
--     `victoria_daily_probe` did not exist, so it downs to a drop by identity;
--     `victoria_daily_check` existed, so it downs to its captured prior definition -- the body
--     WITHOUT P9. `victoria_daily_verdict`, `victoria_charter_state` and
--     `countable_tickets_per_project` are not named in it because this migration does not touch
--     them. Full row: `public.runner_migration_downs` where `up_name` =
--     `agt516_daily_arm_reads_stamp`.
--
-- (b) `apply_migration` name `agt516_daily_arm_reads_stamp` with the body below, byte for byte. The
--     trailing GATE committed with it, which is the evidence; the success flag was NOT taken as
--     proof -- every assertion was re-read independently afterwards and AGT-485's guard was run
--     against the applied state.
--
-- =================================================================================================
-- (0) THE BODY THIS MIGRATION SPLICES IS THE BODY THAT IS LIVE, asserted before it is replaced.
--
--     `CREATE OR REPLACE` would happily overwrite a body that had moved since the kickoff measured
--     it, and the splice below is one line into 83 lines carried over verbatim -- so a drifted body
--     would be silently reverted to the kickoff's copy along with the new predicate. The md5 is
--     the kickoff's own measurement (§4), and a mismatch RAISEs rather than splices (kickoff §7:
--     never splice an unmeasured body).
-- =================================================================================================
DO $pre$
declare
  v_n   integer;
  v_md5 text;
begin
  select count(*) into v_n from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_daily_check' and p.prokind = 'f';
  if v_n <> 1 then
    raise exception 'agt516: pg_proc holds % overloads of victoria_daily_check, expected 1 -- a signature change creates an overload, it does not replace one (.claude/rules/supabase-function-signature.md)', v_n;
  end if;

  select md5(p.prosrc) into v_md5 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_daily_check' and p.prokind = 'f';
  if v_md5 <> '25f350955f99f87f27abcb1c4b448116' then
    raise exception 'agt516: victoria_daily_check body reads md5 %, kickoff §4 measured 25f350955f99f87f27abcb1c4b448116 -- the body moved since the kickoff and this migration would revert it. STOP and re-measure, never splice an unmeasured body (kickoff §7)', v_md5;
  end if;
end
$pre$;

-- =================================================================================================
-- (1) victoria_daily_check() -- AGT-485's reader, lines 121-203 of
--     docs/design/agt-485-victoria-daily-check.sql VERBATIM (md5 of the body asserted above), with
--     exactly ONE predicate added to arm 2 and nothing else touched: identity, RETURNS, LANGUAGE,
--     STABLE, search_path and every `detail` key are byte-unchanged, so AGT-485's own guard still
--     grades this function and no caller's contract moves.
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
  )
  SELECT v.prompt,
         v.reason,
         jsonb_build_object(
           'below',    below.js,
           'counts',   counts.js,
           'fives',    fives.n,
           'five_ids', fives.js) AS detail
    FROM counts, below, fives,
         public.victoria_daily_verdict(counts.js, fives.n) v
$function$;

REVOKE ALL ON FUNCTION public.victoria_daily_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.victoria_daily_check() TO service_role;

-- =================================================================================================
-- (2) victoria_daily_probe() -- the STANDING ASSERTION that P9 is wired, in AGT-483's
--     `parent_score_probe()` form (v7.0.858).
--
--     WHY A PROBE AT ALL. P9 is invisible from a board where nothing stamped is scored 5, and that
--     is today's board: the four live stamps sit at scores 3-4, so `fives` reads 10 before this
--     migration and 10 after it. A guard that compared those two numbers would pass unchanged on a
--     function that never learned the word `fit-stamp` -- a false green that is structurally
--     possible, which is the one kind that is not allowed (pattern:75). So the probe MAKES the case
--     the board does not currently offer: it stamps the first of the fives under the live
--     fingerprint and demands the sensor drop exactly that ticket.
--
--     WHY IT LEAVES NOTHING BEHIND. The stamp is written inside a sub-block that always ends in the
--     `P0516` sentinel, so the write is undone whether the measurement agreed or not, and the
--     measurements survive in plpgsql variables because only the sub-block's SQL is rolled back.
--     `residue` is then read AFTER the sentinel from the real table and must be 0 -- the assertion
--     that this read-only guard stayed read-only (pattern:76). It is VOLATILE because it writes
--     before it rolls back, and `service_role` only for the same reason `victoria_daily_check()` is:
--     it reads the whole board's grading and claim state, and Postgres hands EXECUTE to anon,
--     authenticated and service_role BY NAME the instant a function is created while
--     `REVOKE ... FROM PUBLIC` leaves those named grants standing
--     (.claude/rules/supabase-column-grants.md, SES-315 addendum).
-- =================================================================================================
CREATE OR REPLACE FUNCTION public.victoria_daily_probe()
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_fp        text;
  v_before    integer;
  v_ids       jsonb;
  v_id        text;
  v_after     integer;
  v_after_ids jsonb;
  v_residue   integer;
begin
  -- The fingerprint is read from its ONE home, and read BEFORE the stamp: the summary a stamp must
  -- carry to count is `<id> fits no active project (charters <fingerprint>)` EXACTLY
  -- (victoria_charter_state()'s own equality, never a LIKE), so a probe that invented the string
  -- would write a stamp that nothing reads and measure nothing.
  select s.fingerprint into v_fp from public.victoria_charter_state() s;

  select (d.detail->>'fives')::integer, d.detail->'five_ids'
    into v_before, v_ids
    from public.victoria_daily_check() d;

  v_id := v_ids->>0;
  if v_id is null then
    -- No five on the board today, so there is nothing to stamp and nothing to measure. Said out
    -- loud rather than returned as a pass: a skip nobody can see is a skip nobody audits
    -- (pattern:77).
    return jsonb_build_object('before', 0, 'skipped', 'no five');
  end if;

  begin
    perform public.record_decision(null, 'agt516-probe', 'fit-stamp', v_id,
      v_id || ' fits no active project (charters ' || v_fp || ')',
      'AGT-516 probe fixture, rolled back by sentinel P0516', null);

    -- Re-read through the same door. This function is VOLATILE, so each statement takes a fresh
    -- snapshot and the STABLE reader above sees the stamp the statement before it wrote.
    select (d.detail->>'fives')::integer, d.detail->'five_ids'
      into v_after, v_after_ids
      from public.victoria_daily_check() d;

    raise exception sqlstate 'P0516' using message = 'AGT-516 probe: measured, rolling back';
  exception when sqlstate 'P0516' then
    null;   -- the stamp above is undone; v_after and v_after_ids survive in the variables
  end;

  -- The residue, read AFTER the sentinel from the real table: the sub-block undid the stamp, so a
  -- non-zero here means this guard is writing to the board it grades.
  select count(*)::integer into v_residue
    from public.runner_decisions d
   where d.kind = 'fit-stamp'
     and d.reversed_at is null
     and d.session_name = 'agt516-probe';

  return jsonb_build_object(
    'id',        v_id,
    'before',    v_before,
    'after',     v_after,
    'after_ids', v_after_ids,
    'residue',   v_residue);
end
$function$;

REVOKE ALL ON FUNCTION public.victoria_daily_probe() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.victoria_daily_probe() TO service_role;

-- =================================================================================================
-- (3) THE GATE. Asserts, writes nothing that survives, and RAISEs -- which rolls every statement
--     above back, because `apply_migration` wraps the file in one transaction. So a COMMITTED
--     migration is itself the proof that all four checks held; the success flag is never the
--     evidence (.claude/rules/supabase-column-grants.md: never trust the migration's success flag).
--
--     CHECK (d) IS THE DISCRIMINATOR: it drives the probe, so the committed migration asserts that
--     stamping one five DROPS THAT FIVE -- the only thing P9 changes -- rather than asserting that
--     today's unchanged count equals itself.
-- =================================================================================================
DO $gate$
declare
  v_n      integer;
  v_detail jsonb;
  v_key    text;
  v_probe  jsonb;
begin
  -- (a) exactly one overload of each name -- a signature change creates an overload, it does not
  -- replace one (.claude/rules/supabase-function-signature.md).
  foreach v_key in array array['victoria_daily_check', 'victoria_daily_probe'] loop
    select count(*) into v_n from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = v_key and p.prokind = 'f';
    if v_n <> 1 then
      raise exception 'agt516: pg_proc holds % overloads of %, expected 1', v_n, v_key;
    end if;
  end loop;

  -- (b) EXECUTE: closed to anon and authenticated BY NAME, open to service_role. Both functions,
  -- both directions -- the denial AND the legitimate call, never one of them.
  foreach v_key in array array['public.victoria_daily_check()', 'public.victoria_daily_probe()'] loop
    if has_function_privilege('anon', v_key, 'EXECUTE') then
      raise exception 'agt516: anon can EXECUTE % -- the named revoke did not land', v_key;
    end if;
    if has_function_privilege('authenticated', v_key, 'EXECUTE') then
      raise exception 'agt516: authenticated can EXECUTE % -- the named revoke did not land', v_key;
    end if;
    if NOT has_function_privilege('service_role', v_key, 'EXECUTE') then
      raise exception 'agt516: service_role CANNOT EXECUTE % -- the grant is missing', v_key;
    end if;
  end loop;

  -- (c) the reader's contract is byte-unchanged: ONE row, and `detail` still carries the four keys
  -- AGT-485's prompt steps and its guard read. P9 narrows a predicate; it must not move a key.
  select count(*) into v_n from public.victoria_daily_check();
  if v_n <> 1 then
    raise exception 'agt516: victoria_daily_check() returned % rows, expected exactly 1', v_n;
  end if;
  select d.detail into v_detail from public.victoria_daily_check() d;
  foreach v_key in array array['below', 'counts', 'fives', 'five_ids'] loop
    if not (v_detail ? v_key) then
      raise exception 'agt516: victoria_daily_check().detail is missing key % -- detail was %', v_key, v_detail;
    end if;
  end loop;

  -- (d) THE DISCRIMINATOR -- stamp one five and the sensor must drop THAT five, leaving no residue.
  -- A function that ignored the stamp answers `after` = `before` and cannot commit.
  v_probe := public.victoria_daily_probe();
  if coalesce((v_probe->>'residue')::integer, 0) <> 0 then
    raise exception 'agt516: the probe left % unreversed fit-stamp row(s) under session_name agt516-probe -- the sentinel did not roll its fixture back and this guard is writing to the board it grades. Probe: %',
      v_probe->>'residue', v_probe;
  end if;
  if coalesce((v_probe->>'before')::integer, 0) > 0 then
    -- On the MEASURED path the key must actually be there: the coalesce above is for the skip
    -- return, which writes nothing and so has no residue to report (pattern:75 -- a missing key
    -- must not read as a pass on the path that did write).
    if v_probe->>'residue' is null then
      raise exception 'agt516: the probe measured % fives and returned no residue key -- the read-only assertion has nothing to stand on. Probe: %',
        v_probe->>'before', v_probe;
    end if;
    if (v_probe->>'after')::integer <> (v_probe->>'before')::integer - 1 then
      raise exception 'agt516: the probe stamped % and the sensor still reads % fives against % before -- P9 is not reading victoria_charter_state().stamped. Probe: %',
        v_probe->>'id', v_probe->>'after', v_probe->>'before', v_probe;
    end if;
    if v_probe->'after_ids' @> to_jsonb(v_probe->>'id') then
      raise exception 'agt516: the probe stamped % and the sensor still lists it among the fives -- the count moved but the wrong ticket left. Probe: %',
        v_probe->>'id', v_probe;
    end if;
  else
    raise notice 'agt516: no five on the board, so the discriminator could not be driven this run -- probe %', v_probe;
  end if;

  -- (e) THE BODY THAT LANDED IS THE BODY IN THIS FILE, byte for byte. This file is the MIRROR of a
  -- migration whose text is handed to `apply_migration`, and 83 of its lines are carried over from
  -- AGT-485 unchanged -- so one mistyped character would ship a silently different function and
  -- leave this file claiming bytes it does not have. Both md5s were computed from this file's own
  -- function bodies before it was applied, so a transcription slip RAISEs and rolls the whole
  -- migration back instead of committing a mirror that lies (pattern:3/75).
  select md5(p.prosrc) into v_key from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_daily_check' and p.prokind = 'f';
  if v_key <> 'db8fff24c1e76a97a97a8ed9fb4ff50b' then
    raise exception 'agt516: victoria_daily_check landed with body md5 %, the mirror docs/design/agt-516-daily-arm-reads-stamp.sql reads db8fff24c1e76a97a97a8ed9fb4ff50b -- what was applied is not what the mirror says was applied', v_key;
  end if;
  select md5(p.prosrc) into v_key from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_daily_probe' and p.prokind = 'f';
  if v_key <> 'ae06a9d0f3b73ffe00ff2e67f620075f' then
    raise exception 'agt516: victoria_daily_probe landed with body md5 %, the mirror reads ae06a9d0f3b73ffe00ff2e67f620075f -- same reason', v_key;
  end if;

  raise notice 'AGT-516 GATE PASSED: 1 overload each, EXECUTE closed to anon/authenticated and open to service_role on both, detail still carries below/counts/fives/five_ids, and the probe %',
    v_probe;
end
$gate$;
