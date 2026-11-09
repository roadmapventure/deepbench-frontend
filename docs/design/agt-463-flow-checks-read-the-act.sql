-- DeepBench v7.0.981 | docs/design/agt-463-flow-checks-read-the-act.sql | AGT-463 -- the flow
-- checks grade the ACT, not the STAMP.
--
-- THE DEFECT, measured live on tree `1a9db04` rather than reasoned about. `audit_flow_checks()`
-- holds `b.updated_at` FOUR times and arm (c) counts `c.outcome = 'shipped' AND c.push_sha IS NULL`
-- with nothing excluded. Three readings come out wrong, and all three were read live:
--
--   (a) flow-ship-not-closed ages a delivered ticket from `backlog_items.updated_at`, a stamp any
--       writer touching the row moves. `scripts/settle-ship.js` writes no `updated_at` at all
--       (SES-316), so the stamp is not even the settle. Live: `projects/dev-manager-capabilities`
--       printed `oldest last updated 2026-09-25 16:26Z; AGT-134, AGT-140, AGT-131` -- the minute
--       and the first three ids both belong to whatever last touched those rows, not to the act
--       that settled them.
--   (c) flow-wasted-cycles counted `4 shipped with no push_sha` in the live 24 h window and all
--       FOUR were `SCHEDULED-AGENT:` routine runs, which ship no commit BY DESIGN
--       (`runner_waste_causes.counts_as_waste` is already false for `routine_run`, AGT-367). A
--       directive delivery is the same shape: it acts on a cycle and records its outcome on
--       `runner_directives`, leaving no `push_sha` on the cycle row. The number told a reader the
--       run was burning budget on the one day its routines all worked.
--   (d) flow-filing-outpaces-closing grades EVERY project, including `planned` ones that have
--       never executed. A project filed into before it starts cannot close anything, so the ratio
--       fires on an empty denominator and reports a backlog problem where there is no build yet.
--
-- THE CALLS, mine and reversible (JOHN-0925-DESIGNER-DECIDES): the three readings are re-keyed onto
-- the ACT. (a) ages from `coalesce(newest ticket-status decision, updated_at)` -- the decision row
-- IS the settle, and the coalesce keeps a ticket nobody decided on in the report rather than
-- dropping it (the safe direction: a stamp is a worse age, never no age). (c) excludes a routine
-- run and a directive delivery -- same line, same wrong signal, one fix. (d) grades `executing`
-- projects only. NO THRESHOLD KEY, no vocabulary row, no outcome value and no finding slug changes:
-- every reader keeps reading the same four slugs.
--
-- WHAT IS NOT HERE, deliberately. No column is written and no writer is changed. `updated_at`
-- stays exactly as unreliable as it was -- this ticket stops the CHECKS depending on it, and
-- SES-316 owns the writers. Nothing is retired.
--
-- GOVERNING: docs/ARCHITECTURE.md §19v (Operations), §19b;
-- .claude/rules/supabase-function-signature.md -- the identity argument list stays `()`, so no
-- overload is created and nothing needs dropping; the trailing DO asserts the single `pg_proc` row
-- anyway, because that rule's whole lesson is that the success flag is not the evidence.
--
-- DOWN CAPTURED BEFORE THE UP, never after (a down taken afterwards restores the bug):
--   SELECT * FROM public.capture_migration_down(
--     'f6e16925-ab20-4c74-888d-f8257e7fbb63', 'agt463_flow_checks_read_the_act',
--     '[{"kind":"function","identity":"public.audit_flow_checks()"}]'::jsonb);
--   -> classification `auto-downable`, 1 object captured, 0 refusals.
--
-- Mirror of migration `agt463_flow_checks_read_the_act`, byte-identical.

-- ---------------------------------------------------------------------------------------------
-- THE EDIT IS BUILT FROM THE LIVE BODY, never retyped. Retyping a 150-line plpgsql body to change
-- nine fragments is how an unrelated line gets lost, and this body has been amended twice already
-- (AGT-367 arm (c), AGT-496 block (e)). Each fragment is asserted to occur EXACTLY ONCE before it
-- is replaced -- so a body that drifted under this migration raises here instead of being silently
-- half-edited -- and the pairs are applied IN ORDER, which arm (a) and arm (d) both depend on:
-- pair 4 puts a line between arm (a)'s projects JOIN and its WHERE, which is what leaves pair 8's
-- JOIN-then-GROUP-BY shape matching arm (d) alone.
-- ---------------------------------------------------------------------------------------------
do $agt463$
declare
  src   text;
  pair  text[];
  f_old text;
  f_new text;
  hits  integer;
  n_b   integer;
  n_x   integer;
  n_c   integer;
  v_procs integer;
  pairs text[][] := array[
    -- (a) 1-3: the age, the ordering and the id list all read the settle, not the stamp.
    array[
      $f$min(b.updated_at) AS oldest,$f$,
      $f$min(x.settled_at) AS oldest,$f$
    ],
    array[
      $f$(array_agg(b.backlog_id ORDER BY b.updated_at, b.backlog_id))[1:10] AS ids$f$,
      $f$(array_agg(b.backlog_id ORDER BY x.settled_at, b.backlog_id))[1:10] AS ids$f$
    ],
    array[
      $f$AND b.updated_at < now() - (t->>'ship_open_days')::numeric * interval '1 day'$f$,
      $f$AND x.settled_at < now() - (t->>'ship_open_days')::numeric * interval '1 day'$f$
    ],
    -- (a) 4: where `settled_at` comes from. The newest ticket-status DECISION is the settle; the
    --        coalesce keeps an undecided ticket in the report, aged by its stamp, rather than
    --        dropping it out of a check whose whole job is to find untouched tickets.
    array[
      $f$      JOIN public.projects p ON p.id = e.project_id
     WHERE b.status = 'delivered'$f$,
      $f$      JOIN public.projects p ON p.id = e.project_id
      CROSS JOIN LATERAL (SELECT coalesce((SELECT max(d.decided_at) FROM public.runner_decisions d WHERE d.backlog_id = b.backlog_id AND d.kind = 'ticket-status'), b.updated_at) AS settled_at) x
     WHERE b.status = 'delivered'$f$
    ],
    -- (a) 5: and the sentence says which clock it read, because `oldest last updated` is now a lie
    --        about its own number.
    array[
      $f$oldest last updated %s$f$,
      $f$oldest settled %s$f$
    ],
    -- (c) 6: a routine run ships no commit by design, and a directive delivery records its outcome
    --        on runner_directives instead of a push_sha. Neither is a wasted cycle.
    array[
      $f$count(*) FILTER (WHERE c.outcome = 'shipped' AND c.push_sha IS NULL)::integer$f$,
      $f$count(*) FILTER (WHERE c.outcome = 'shipped' AND c.push_sha IS NULL AND coalesce(c.notes, '') NOT LIKE 'SCHEDULED-AGENT:%' AND NOT EXISTS (SELECT 1 FROM public.runner_directives d WHERE d.acted_cycle = c.id AND d.outcome = 'shipped'))::integer$f$
    ],
    -- (c) 7: the label says what the number now counts, so a reader is not left to assume.
    array[
      $f$%s shipped with no push_sha; by cause: %s'$f$,
      $f$%s shipped with nothing to push (routine runs and directive deliveries excluded); by cause: %s'$f$
    ],
    -- (d) 8-9: only a project that is executing can close a ticket, so only an executing project
    --          can file faster than it closes.
    array[
      $f$      JOIN public.projects p ON p.id = e.project_id
     GROUP BY p.slug$f$,
      $f$      JOIN public.projects p ON p.id = e.project_id
     WHERE p.status = 'executing'
     GROUP BY p.slug$f$
    ],
    array[
      $f$the ratio limit is %s'$f$,
      $f$the ratio limit is %s (executing projects only)'$f$
    ]
  ];
begin
  select pg_get_functiondef(p.oid) into src
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'audit_flow_checks' and p.prokind = 'f';
  if src is null then
    raise exception 'AGT-463: public.audit_flow_checks() was not found -- refusing to invent a body';
  end if;

  foreach pair slice 1 in array pairs loop
    f_old := pair[1];
    f_new := pair[2];
    hits  := (length(src) - length(replace(src, f_old, ''))) / length(f_old);
    if hits <> 1 then
      raise exception 'AGT-463: fragment %... occurs % time(s) in audit_flow_checks(), expected exactly 1',
        left(f_old, 48), hits;
    end if;
    src := replace(src, f_old, f_new);
  end loop;

  execute src;

  -- THE SHAPE OF THE RESULT, asserted rather than trusted. The migration's own success flag says
  -- nothing about whether the nine edits landed where they were meant to, so the counts are
  -- checked: `b.updated_at` survives exactly TWICE (arm (d)'s closed filter, and the coalesce
  -- fallback inside the new lateral), `x.settled_at` reads three times (the age, the ordering and
  -- the window), and AGT-367's cause list is still printed once.
  select pg_get_functiondef(p.oid) into src
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'audit_flow_checks' and p.prokind = 'f';
  n_b := (length(src) - length(replace(src, 'b.updated_at', ''))) / length('b.updated_at');
  n_x := (length(src) - length(replace(src, 'x.settled_at', ''))) / length('x.settled_at');
  n_c := (length(src) - length(replace(src, 'by cause: %s', ''))) / length('by cause: %s');
  if n_b <> 2 then
    raise exception 'AGT-463: the new body holds b.updated_at % time(s), expected exactly 2 (arm (d) closed filter + the lateral coalesce)', n_b;
  end if;
  if n_x <> 3 then
    raise exception 'AGT-463: the new body holds x.settled_at % time(s), expected exactly 3 (age, ordering, window)', n_x;
  end if;
  if n_c <> 1 then
    raise exception 'AGT-463: the new body holds `by cause: %%s` % time(s), expected exactly 1 -- AGT-367 arm (c) must survive this edit', n_c;
  end if;

  -- The signature did not move, so there must still be exactly ONE audit_flow_checks: a second
  -- pg_proc row means an overload exists and PostgREST will answer an ambiguity error that reaches
  -- every caller as an empty result (.claude/rules/supabase-function-signature.md).
  select count(*)::integer into v_procs
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'audit_flow_checks' and p.prokind = 'f';
  if v_procs <> 1 then
    raise exception 'AGT-463: audit_flow_checks has % pg_proc row(s), expected exactly 1 (.claude/rules/supabase-function-signature.md)', v_procs;
  end if;

  -- And the function still RUNS and still answers an array. A body that compiles and then raises
  -- on its first call would pass every assertion above.
  if jsonb_typeof(public.audit_flow_checks()) <> 'array' then
    raise exception 'AGT-463: audit_flow_checks() no longer answers a jsonb array';
  end if;
end
$agt463$;
