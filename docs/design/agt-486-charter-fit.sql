-- AGT-486 (v7.0.861) -- CHARTERS REACH VICTORIA, AND A NO-FIT TICKET IS READ ONCE.
--
-- THE DEFECT, measured live 2026-10-18 on the unchanged tree (kickoff §2). Victoria's list turn
-- rules every open or partial ticket of one project's epics against the candidate need sources and
-- nothing else: `grep -c -i charter` is 0 in `scripts/requirement-check.js` and 0 in
-- `docs/runbooks/victoria-reorg.md`, `vc-reorganize-intent.method` has no fit step, and its verdict
-- enum is exactly `["pass","not-needed"]`. So she was asked which recorded need a ticket answers
-- without being told which projects are running or what each of them is FOR, and a ticket that
-- belongs to no active project had only two answers available -- `pass` (grade it) or
-- `not-needed` (propose it for removal). Neither is true of it, and every run put the same ticket
-- to her again.
--
-- WHAT THIS MIGRATION SHIPS. One read, one data edit, nothing else.
--
--   (1) `public.victoria_charter_state()` -- STABLE, `service_role` only. It answers three things
--       in ONE row: `charters`, the `{slug, charter}` of every `executing` project in
--       `priority, slug` order (`'[]'::jsonb` when there are none); `fingerprint`, the `md5` of
--       that array's own text; and `stamped`, the `backlog_id`s holding a live `fit-stamp` taken
--       under THAT SAME fingerprint. No project slug and no charter text is written into code
--       anywhere (requirements d.5, d.17) -- the list door calls this once per run and carries the
--       answer in its task context.
--
--   (2) The skill_profiles row `vc-reorganize-intent`, as DATA (pattern:2) and never as code: its
--       `traits.schema` verdict enum gains a third value, `no-fit`, and its `method` gains
--       `0. FIT BEFORE GRADE` before step 1, carrying John's scaffolding-versus-harness test
--       (requirements d.31). The paragraph is docs/harvests/AGT-486.md § SCHEMA verbatim, SPLICED
--       out of that file's own fenced block by the build rather than retyped.
--
-- WHY THE FINGERPRINT IS THE STAMP'S WHOLE LIFE (the Designer's call, harvest §2). A `fit-stamp`
-- says "this ticket fits none of THESE charters", so its summary carries the fingerprint of the
-- charter set it was taken under and the predicate below is an EXACT `=` on that text, never a
-- `LIKE`. Any charter edit, any pause, any newly `executing` project moves the fingerprint, no
-- stamp matches it any more, and every stamped ticket is offered again -- which is requirement d.5's
-- clearing condition with no job to run and no per-project rule to keep (pattern:9, pattern:16).
--
-- WHY `service_role` ONLY. Postgres grants EXECUTE to anon, authenticated and service_role BY NAME
-- the instant a function is created, and `REVOKE ... FROM PUBLIC` does not touch those named grants
-- (.claude/rules/supabase-column-grants.md, SES-315 addendum). They are revoked by name below, and
-- the GATE asserts both directions rather than trusting the migration's success flag.
--
-- WHAT THIS MIGRATION DOES NOT DO: it writes no `fit-stamp`, moves no ticket, touches no
-- `backlog_items` row, and changes no byte of `vc-requirement-intent`, of the single-ticket door's
-- `VERDICTS`, or of `docs/runbooks/victoria-reorg.md`.
--
-- THE DOWN, IN TWO HALVES, BOTH TAKEN BEFORE THIS RAN:
--   the function  `capture_migration_down('a026565b-e681-45e8-b587-51707be5fbd2',
--                 'agt486_charter_fit', '[{"kind":"function","identity":"public.victoria_charter_state()"}]')`
--                 -- auto-downable, 1 object captured, 0 refusals.
--   the row       `capture_migration_down()` has NO row kind, so the data half is hand-built:
--                 decision `2bc22f88-0bb4-45b4-b916-782257d0c71b` (kind `agent-row`, AGT-486) and
--                 the FULL-row `runner_before_images` insert under it over
--                 `skill_profiles` `89d5bbeb-e0a5-4d26-91f7-ecaf84b2c18d`, carrying `cycle_id`
--                 only -- `ck_before_image_attribution` refuses both attribution columns at once.
--                 One Reverse restores the enum and the method exactly as they read.
--
-- Mirror of migration `agt486_charter_fit`, byte-identical. Guard
-- `tests/regression/agt-486-charter-fit.test.mjs`.

create or replace function public.victoria_charter_state()
returns table(fingerprint text, charters jsonb, stamped text[])
language sql
stable
set search_path = public, pg_catalog
as $fn$
  with c as (
    select coalesce(
             jsonb_agg(jsonb_build_object('slug', p.slug, 'charter', p.charter)
                       order by p.priority nulls last, p.slug),
             '[]'::jsonb) as charters
      from public.projects p
     where p.status = 'executing'
  ), f as (
    select c.charters, md5(c.charters::text) as fingerprint from c
  )
  select f.fingerprint,
         f.charters,
         coalesce((
           -- EXACT equality on the whole summary, never a LIKE: a stamp taken under a charter set
           -- that has since moved must not count, and that is the only thing clearing it.
           select array_agg(distinct d.backlog_id order by d.backlog_id)
             from public.runner_decisions d
            where d.kind = 'fit-stamp'
              and d.reversed_at is null
              and d.backlog_id is not null
              and d.summary = d.backlog_id || ' fits no active project (charters ' || f.fingerprint || ')'
         ), '{}'::text[]) as stamped
    from f;
$fn$;

revoke all on function public.victoria_charter_state() from PUBLIC, anon, authenticated;
grant execute on function public.victoria_charter_state() to service_role;

-- THE DATA HALF (pattern:2). Guarded: the step-1 anchor must occur exactly once, and the step must
-- not already be there, or the insertion point is a guess.
do $data$
declare
  v_anchor text := '1. Read the tickets first, then the candidates.';
  v_step0  text := $para$0. FIT BEFORE GRADE. You are also handed every active project's charter. Read each ticket ONCE against all of them and say which project it belongs in, naming that project's slug first in your reason. A ticket that fits more than one: apply John's test -- is the SCAFFOLDING confused about how to DEFINE an agent (its prompts, skills, knowledge, capabilities, the code that builds its prompt, where its definition is stored)? That is Product Team Agents. Is the HARNESS confused about how to RUN or MOVE an agent (rules, governance, guardrails, gates, queues, routing)? That is Platform Reliability. A ticket that fits NO charter you were handed is a `no-fit`: do not grade it, set need_source and need_score to null, and use your reason to name the charter that came closest and why it misses. A `no-fit` is NOT a turn-down -- nothing on the ticket changes, it is not proposed for removal, and it will not be put to you again until a project becomes active or a charter changes.$para$;
  v_method text;
  v_traits jsonb;
  v_n      integer;
begin
  select s.method, s.traits into v_method, v_traits
    from public.skill_profiles s where s.slug = 'vc-reorganize-intent';
  if v_method is null then
    raise exception 'agt486: no vc-reorganize-intent row to patch';
  end if;
  v_n := (length(v_method) - length(replace(v_method, v_anchor, ''))) / length(v_anchor);
  if v_n <> 1 then
    raise exception 'agt486: the method carries the step-1 anchor % time(s), expected exactly 1', v_n;
  end if;
  if position('FIT BEFORE GRADE' in v_method) > 0 then
    raise exception 'agt486: the method already carries FIT BEFORE GRADE -- patching would duplicate it';
  end if;

  update public.skill_profiles
     set method = replace(v_method, v_anchor, v_step0 || E'\n\n' || v_anchor),
         traits = jsonb_set(v_traits,
                            '{schema,properties,rows,items,properties,verdict,enum}',
                            '["pass", "not-needed", "no-fit"]'::jsonb,
                            false)
   where slug = 'vc-reorganize-intent';
end
$data$;

-- THE GATE. Every assertion RAISES, so a false green is structurally impossible (pattern:75) and the
-- migration's own success flag is never the evidence (.claude/rules/supabase-column-grants.md).
do $gate$
declare
  v_overloads integer;
  v_row       record;
  v_slugs     text[];
  v_enum      jsonb;
  v_method    text;
  v_hits      integer;
begin
  -- ONE overload, by name (.claude/rules/supabase-function-signature.md).
  select count(*)::integer into v_overloads
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'victoria_charter_state' and p.prokind = 'f';
  if v_overloads <> 1 then
    raise exception 'agt486 gate: victoria_charter_state has % overload(s), expected 1', v_overloads;
  end if;

  -- BOTH DIRECTIONS on the grant: the two public roles denied AND service_role still allowed.
  if has_function_privilege('anon', 'public.victoria_charter_state()', 'EXECUTE') then
    raise exception 'agt486 gate: anon still holds EXECUTE on victoria_charter_state()';
  end if;
  if has_function_privilege('authenticated', 'public.victoria_charter_state()', 'EXECUTE') then
    raise exception 'agt486 gate: authenticated still holds EXECUTE on victoria_charter_state()';
  end if;
  if not has_function_privilege('service_role', 'public.victoria_charter_state()', 'EXECUTE') then
    raise exception 'agt486 gate: service_role does NOT hold EXECUTE on victoria_charter_state()';
  end if;

  -- The function's own answer, against the live board. The count and the slugs are MEASURED here,
  -- never pinned: three `executing` projects is what the board reads today.
  select * into v_row from public.victoria_charter_state();
  if jsonb_typeof(v_row.charters) <> 'array' or jsonb_array_length(v_row.charters) <> 3 then
    raise exception 'agt486 gate: charters is % element(s), expected 3 executing projects',
      coalesce(jsonb_array_length(v_row.charters), -1);
  end if;
  select array_agg(e->>'slug' order by o) into v_slugs
    from jsonb_array_elements(v_row.charters) with ordinality t(e, o);
  if v_slugs <> array['tooling','dev-manager-capabilities','go-to-market']::text[] then
    raise exception 'agt486 gate: charters name %, expected tooling, dev-manager-capabilities, go-to-market in priority order', v_slugs::text;
  end if;
  if v_row.fingerprint !~ '^[0-9a-f]{32}$' then
    raise exception 'agt486 gate: fingerprint % is not a 32-hex md5', coalesce(v_row.fingerprint, '<NULL>');
  end if;
  if v_row.stamped <> '{}'::text[] then
    raise exception 'agt486 gate: stamped reads %, expected {} -- this migration writes no fit-stamp', v_row.stamped::text;
  end if;

  -- The data half, both parts.
  select s.traits #> '{schema,properties,rows,items,properties,verdict,enum}', s.method
    into v_enum, v_method
    from public.skill_profiles s where s.slug = 'vc-reorganize-intent';
  if v_enum <> '["pass", "not-needed", "no-fit"]'::jsonb then
    raise exception 'agt486 gate: the verdict enum reads %, expected the three values', coalesce(v_enum::text, '<NULL>');
  end if;
  v_hits := (length(v_method) - length(replace(v_method, 'FIT BEFORE GRADE', ''))) / length('FIT BEFORE GRADE');
  if v_hits <> 1 then
    raise exception 'agt486 gate: the method carries FIT BEFORE GRADE % time(s), expected exactly 1', v_hits;
  end if;
  if position('0. FIT BEFORE GRADE' in v_method) >= position('1. Read the tickets first' in v_method) then
    raise exception 'agt486 gate: step 0 does not sit BEFORE step 1 in the method';
  end if;

  raise notice 'agt486 gate: 1 overload, EXECUTE closed to anon and authenticated and open to service_role, 3 charters %, fingerprint %, stamped %, enum 3 values, FIT BEFORE GRADE once',
    v_slugs::text, v_row.fingerprint, v_row.stamped::text;
end
$gate$;
