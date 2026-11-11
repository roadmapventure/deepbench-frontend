-- DeepBench v7.0.1003 | AGT-635 | migration `agt635_zero_verdict_regrade`
-- Mirror of the applied migration, byte-identical. Cycle 4dd36240-3c9f-4cfd-8c4c-deaec96eb384.
--
-- WHY. `regradable_ships()`'s `latest` CTE reads `runner_verdicts`, so a ticket that shipped and
-- was NEVER graded has no row to be latest and is permanently invisible to the re-grade lane --
-- the one class of stuck ship the lane cannot see. AGT-552 is live proof: 0 verdicts, `partial`,
-- ship commit e016ceef8471ff8c4533b71306b31dd4df303568, an ancestor of dev. Branch 1 below is the
-- AGT-609 body byte-for-byte; `union all` branch 2 is the zero-verdict lane and nothing else.
-- `CREATE OR REPLACE` keeps all 8 result columns and types, so no second overload appears
-- (.claude/rules/supabase-function-signature.md). Governing: docs/ARCHITECTURE.md 19b, 19v.
--
-- D1 admits `delivered|partial` only -- AGT-519 is `removal proposed` (ruled not-real 2026-11-09)
-- and AGT-547 is `open` and still pickable, so neither is a victim of this bug. D2 takes the sha
-- from the `/commit/` tail only, matching ck_runner_verdicts_graded_sha. D4 closes the function's
-- `anon`/`authenticated` EXECUTE, open today with no browser caller
-- (.claude/rules/supabase-column-grants.md, SES-315 addendum: functions default OPEN by name, and
-- `REVOKE ... FROM PUBLIC` alone does not close them).

CREATE OR REPLACE FUNCTION public.regradable_ships()
 RETURNS TABLE(backlog_id text, verdict_id uuid, version text, graded_sha text, red_gates text[], ci_sha text, ci_run_id bigint, ci_concluded_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  with ci as (
    -- THE NEWEST ref='dev' CONCLUSION, and only that one. An older green run is not evidence about
    -- dev head. No row at all -> this CTE is empty -> the cross join below returns nothing, which
    -- is the "a missing conclusion excludes it" rule with no branch to forget.
    select c.commit_sha, c.run_id, c.concluded_at, c.jobs
      from public.ci_run_conclusions c
     where c.ref = 'dev'
     order by c.concluded_at desc
     limit 1
  ),
  latest as (
    -- THE LATEST VERDICT PER TICKET. An older block under a newer approve is not a blocked ship.
    select distinct on (v.backlog_id) v.*
      from public.runner_verdicts v
     where v.backlog_id is not null
     order by v.backlog_id, v.created_at desc
  ),
  candidate as (
    select l.backlog_id  as bid,
           l.id          as vid,
           l.version     as ver,
           l.graded_sha  as sha,
           l.created_at  as verdict_at,
           array_remove(array[
             case when l.gate_build      = 'red' then 'build'      end,
             case when l.gate_regression = 'red' then 'regression' end,
             case when l.gate_hygiene    = 'red' then 'hygiene'    end
           ], null) as reds,
           array_remove(array[
             case when l.gate_build      = 'skipped' then 'build'      end,
             case when l.gate_regression = 'skipped' then 'regression' end,
             case when l.gate_hygiene    = 'skipped' then 'hygiene'    end
           ], null) as skips
      from latest l
      join public.backlog_items b on b.backlog_id = l.backlog_id
     where l.verdict = 'block'
       and b.status = 'delivered'
       -- A ship already decided is not a blocked ship. `reversed` is deliberately not matched:
       -- re-shipping after a reversal is a new delivery, the same direction
       -- record_ship_decision()'s own idempotency guard takes.
       and not exists (
         select 1
           from public.runner_decisions d
          where d.backlog_id = l.backlog_id
            and d.kind = 'ship'
            and d.status <> 'reversed'
       )
  ),
  -- AGT-635: THE NEWEST SHIP ITEM PER TICKET. One row per backlog_id, newest first, and the sha is
  -- the `/commit/` tail of `dev_link` ONLY (D2) -- the same 7-40 hex shape
  -- ck_runner_verdicts_graded_sha enforces on a graded sha. A prose `dev_link` (AGT-504) yields
  -- null here and is excluded below rather than guessed at.
  ship as (
    select distinct on (i.backlog_id) i.backlog_id, i.created_at, substring(i.dev_link from '/commit/([0-9a-f]{7,40})$') as sha
      from public.runner_items i
     where i.kind = 'ship' and i.backlog_id is not null
     order by i.backlog_id, i.created_at desc
  )
  select c.bid, c.vid, c.ver, c.sha, c.reds, ci.commit_sha, ci.run_id, ci.concluded_at
    from candidate c
    cross join ci
   -- A SKIPPED GATE EXCLUDES THE TICKET ENTIRELY. `skipped` means the check never produced an exit
   -- status; CI's conclusion says nothing about a check that did not run here, so there is no job
   -- that could clear it.
   where coalesce(array_length(c.skips, 1), 0) = 0
     -- A block with no red and no skipped gate is not a state this rule understands; refusing it
     -- keeps the "every job the reds map to" test from passing over an empty list.
     and coalesce(array_length(c.reds, 1), 0) > 0
     -- THE CONCLUSION MUST POSTDATE THE VERDICT. A CI run that finished before the gates ran is
     -- evidence about an earlier tree.
     and ci.concluded_at > c.verdict_at
     -- EVERY mapped job must be `success` in that conclusion. A job absent from the run's `jobs`
     -- array is coalesced to a sentinel that is not 'success', so a missing job excludes too.
     and not exists (
       select 1
         from unnest(public.ci_jobs_for_gates(c.reds)) as j(job_name)
        where coalesce((
                select x->>'conclusion'
                  from jsonb_array_elements(ci.jobs) x
                 where x->>'name' = j.job_name
                 limit 1
              ), '(job absent from the run)') is distinct from 'success'
     )

  union all

  -- ---- AGT-635 BRANCH 2: THE SHIP THAT WAS NEVER GRADED AT ALL. ------------------------------
  -- Branch 1 asks "which block is stale". This asks "which delivery has no verdict to be stale",
  -- which branch 1 structurally cannot reach: no `runner_verdicts` row means no `latest` row.
  -- `verdict_id`, `version` and `graded_sha`-as-the-verdict's-tree are null BY CONSTRUCTION here;
  -- `graded_sha` carries the SHIP's sha instead, which is the tree the verifier's ancestry check
  -- places in dev's history. `red_gates` is all three: nothing has graded any of them, so every
  -- one must be graded from CI rather than carried forward.
  --
  -- THE ALL-GREEN TEST IS STRICTER HERE, AND DELIBERATELY. Branch 1 re-grades only its RED gates,
  -- so it tests only the jobs those map to. With no prior verdict there is no gate proven on the
  -- delivery's own tree, so EVERY job in the conclusion must be `success` -- the test AGT-274
  -- forbids relaxing. An empty job array is excluded explicitly: `not exists` over nothing is
  -- true, and "no jobs ran" must never read as "every job passed".
  select s.backlog_id, null::uuid, null::text, s.sha, array['build','regression','hygiene']::text[], ci.commit_sha, ci.run_id, ci.concluded_at
    from ship s
    join public.backlog_items b on b.backlog_id = s.backlog_id
    cross join ci
   -- A `dev_link` with no `/commit/<hex>` tail records no tree; it is not a sha to re-grade on.
   where s.sha is not null
     -- D1: a delivery, or a partial delivery. `open` is still pickable and `removal proposed` is
     -- not a delivery -- neither is a ship this lane may unstick.
     and b.status in ('delivered', 'partial')
     -- THE WHOLE POINT: zero verdicts. One verdict, of any kind, and branch 1 owns this ticket.
     and not exists (
       select 1 from public.runner_verdicts v where v.backlog_id = s.backlog_id
     )
     -- A ship already decided is not a stuck ship. Same `reversed` exclusion as branch 1.
     and not exists (
       select 1
         from public.runner_decisions d
        where d.backlog_id = s.backlog_id
          and d.kind = 'ship'
          and d.status <> 'reversed'
     )
     -- The conclusion must postdate the SHIP (there is no verdict to postdate).
     and ci.concluded_at > s.created_at
     -- "No jobs ran" is never "every job passed".
     and jsonb_array_length(ci.jobs) > 0
     and not exists (
       select 1
         from jsonb_array_elements(ci.jobs) x
        where coalesce(x->>'conclusion', '(absent)') is distinct from 'success'
     )
$function$;

-- D4. Functions in this project default to EXECUTE granted to anon/authenticated BY NAME
-- (.claude/rules/supabase-column-grants.md, SES-315 addendum), and `FROM PUBLIC` alone leaves
-- those named grants standing. Revoke the three by name; the two callers are server-side.
revoke execute on function public.regradable_ships() from public, anon, authenticated;
grant execute on function public.regradable_ships() to service_role;

-- ---- SELF-QA. Section 6 of the kickoff, every numbered item, as a gate that RAISES. ----------
-- Both directions on each: the new rows appear AND the rows that must not appear do not; the
-- privilege is false for the public roles AND true for the caller that needs it. The migration's
-- own success flag is not trusted (.claude/rules/supabase-column-grants.md).
do $$
declare
  n_null      integer;
  ids         text[];
  sha552      text;
  n_pinned    integer;
  n_b1_first  integer;
  n_b1_second integer;
  n_fn        integer;
  p_anon      boolean;
  p_auth      boolean;
  p_svc       boolean;
  r552        record;
  n_jobs      integer;
  n_notgreen  integer;
begin
  -- QA1. The zero-verdict lane returns exactly the 5 tickets that carry a `/commit/` sha and a
  -- delivered|partial status. On origin/dev this count is 0 -- the bug -- and AGT-552 was absent
  -- from its 88 rows (both measured live before this up ran).
  select count(*) into n_null from public.regradable_ships() where verdict_id is null;
  if n_null <> 5 then
    raise exception 'QA1: expected 5 null-verdict_id rows, got % (origin/dev returned 0)', n_null;
  end if;
  select array_agg(backlog_id order by backlog_id) into ids
    from public.regradable_ships() where verdict_id is null;
  if ids is distinct from array['AGT-457','AGT-464','AGT-552','LOG-70','SES-273']::text[] then
    raise exception 'QA1: the five are %, not AGT-457/AGT-464/AGT-552/LOG-70/SES-273', ids;
  end if;

  -- QA2. AGT-552 is one of them, carrying its SHIP sha as graded_sha -- the tree the verifier's
  -- ancestry check places inside dev's history, not a verdict's tree (it has no verdict).
  select graded_sha into sha552
    from public.regradable_ships() where verdict_id is null and backlog_id = 'AGT-552';
  if sha552 is distinct from 'e016ceef8471ff8c4533b71306b31dd4df303568' then
    raise exception 'QA2: AGT-552 graded_sha is %, expected e016ceef8471ff8c4533b71306b31dd4df303568', coalesce(sha552, 'null');
  end if;

  -- QA3. THE OTHER DIRECTION, and the one that proves the all-green test is real rather than
  -- decorative: the same predicate pinned to run 42994922108 -- Build (blocking)=success,
  -- Tripwire + regression (blocking)=failure -- admits NOTHING. A red job must exclude.
  with ci as (
    select c.commit_sha, c.run_id, c.concluded_at, c.jobs
      from public.ci_run_conclusions c where c.run_id = 42994922108 limit 1
  ),
  ship as (
    select distinct on (i.backlog_id) i.backlog_id, i.created_at, substring(i.dev_link from '/commit/([0-9a-f]{7,40})$') as sha
      from public.runner_items i
     where i.kind = 'ship' and i.backlog_id is not null
     order by i.backlog_id, i.created_at desc
  )
  select count(*) into n_pinned
    from ship s
    join public.backlog_items b on b.backlog_id = s.backlog_id
    cross join ci
   where s.sha is not null
     and b.status in ('delivered', 'partial')
     and not exists (select 1 from public.runner_verdicts v where v.backlog_id = s.backlog_id)
     and not exists (select 1 from public.runner_decisions d where d.backlog_id = s.backlog_id and d.kind = 'ship' and d.status <> 'reversed')
     and ci.concluded_at > s.created_at
     and jsonb_array_length(ci.jobs) > 0
     and not exists (select 1 from jsonb_array_elements(ci.jobs) x where coalesce(x->>'conclusion', '(absent)') is distinct from 'success');
  if n_pinned <> 0 then
    raise exception 'QA3: a conclusion with Tripwire+regression=failure admitted % row(s); the all-green test is not holding', n_pinned;
  end if;

  -- QA4. Branch 1 is untouched. RELATIVE, never an absolute: parallel cycles move this count, so
  -- the assertion is that two reads agree, not that they equal any number this file could name.
  select count(*) into n_b1_first  from public.regradable_ships() where verdict_id is not null;
  select count(*) into n_b1_second from public.regradable_ships() where verdict_id is not null;
  if n_b1_first <> n_b1_second then
    raise exception 'QA4: branch 1 read % then %, so this transaction cannot assert it is unchanged', n_b1_first, n_b1_second;
  end if;
  if n_b1_first = 0 then
    raise exception 'QA4: branch 1 returned 0 rows -- CREATE OR REPLACE lost the existing lane';
  end if;

  -- QA5. One function, no second overload (.claude/rules/supabase-function-signature.md), and D4's
  -- grants in BOTH directions.
  select count(*) into n_fn
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'regradable_ships';
  if n_fn <> 1 then
    raise exception 'QA5: % regradable_ships overload(s) in public, expected exactly 1', n_fn;
  end if;
  select has_function_privilege('anon', 'public.regradable_ships()', 'EXECUTE'),
         has_function_privilege('authenticated', 'public.regradable_ships()', 'EXECUTE'),
         has_function_privilege('service_role', 'public.regradable_ships()', 'EXECUTE')
    into p_anon, p_auth, p_svc;
  if p_anon or p_auth then
    raise exception 'QA5: EXECUTE still granted (anon=%, authenticated=%) -- the revoke did not land', p_anon, p_auth;
  end if;
  if not p_svc then
    raise exception 'QA5: service_role lost EXECUTE -- the two server callers are now broken';
  end if;

  -- QA6, its DB half. The verifier's --regrade dry-run on AGT-552 grades from these exact facts:
  -- a listed row with a null verdict_id (so no prior-verdict read), all three gate keys, and a CI
  -- run whose every job is `success`. The CLI half (APPROVE, three gates green, prior_verdict_id
  -- null, and exit 2 on origin/dev's verifier) is run in T4 -- SQL cannot assert a process.
  select * into r552 from public.regradable_ships() where backlog_id = 'AGT-552' and verdict_id is null;
  if r552.red_gates is distinct from array['build','regression','hygiene']::text[] then
    raise exception 'QA6: AGT-552 red_gates is %, so the verifier would not grade all three from CI', r552.red_gates;
  end if;
  if r552.ci_run_id is null or r552.ci_sha is null or r552.ci_concluded_at is null then
    raise exception 'QA6: AGT-552 carries an incomplete CI triple (run=%, sha=%, at=%)', r552.ci_run_id, r552.ci_sha, r552.ci_concluded_at;
  end if;
  select jsonb_array_length(c.jobs) into n_jobs from public.ci_run_conclusions c where c.run_id = r552.ci_run_id;
  select count(*) into n_notgreen
    from public.ci_run_conclusions c, jsonb_array_elements(c.jobs) x
   where c.run_id = r552.ci_run_id and coalesce(x->>'conclusion', '(absent)') is distinct from 'success';
  if coalesce(n_jobs, 0) = 0 or n_notgreen <> 0 then
    raise exception 'QA6: run % carries % job(s), % of them not success', r552.ci_run_id, n_jobs, n_notgreen;
  end if;

  -- QA7. The three that must NOT appear, each for its own named reason: AGT-504's dev_link is
  -- prose (no sha), AGT-519 is `removal proposed`, AGT-547 is `open` and still pickable.
  if exists (select 1 from public.regradable_ships() where verdict_id is null and backlog_id in ('AGT-504','AGT-519','AGT-547')) then
    raise exception 'QA7: one of AGT-504/AGT-519/AGT-547 is listed; D1 or the sha test has widened';
  end if;

  raise notice 'AGT-635 QA: 7/7 gates pass. 5 zero-verdict rows (%), AGT-552 sha %, pinned-failure run admits 0, branch 1 stable at %, 1 overload, EXECUTE anon=% auth=% svc=%.',
    array_to_string(ids, ','), sha552, n_b1_first, p_anon, p_auth, p_svc;
end
$$;
