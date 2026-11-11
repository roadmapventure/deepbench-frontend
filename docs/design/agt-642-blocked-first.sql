-- DeepBench v7.0.1004 | docs/design/agt-642-blocked-first.sql | AGT-642 -- a blocked ticket stops the line.
-- Migration `agt642_blocked_first`. John's standing decision f8e2a234 (2026-11-11): "no new tickets
-- are picked up if an existing ticket is blocked - we run until that ticket is closed, even if it
-- creates new findings or tickets", with the carve-out that John's calls and attended-only steps step
-- aside after the team's two attempts and diagnosis (standing decision 6e94edcb).
--
-- THE DEFECT, measured 2026-11-11: runner_should_boot() reached its card branch (AGT-127,
-- rule-cards-only) and the redesign lane (AGT-610, via find-work-only) ONLY at pickable_count = 0.
-- The board held 60+ pickable tickets, so 15 undecided gate cards waited (oldest 2026-11-04) and 20
-- refusal-parked tickets sat at 0 attempts; runner_refusal_attempts held 0 rows.
--
-- THE CHANGE. Two branches move ahead of `pickable`, both still BELOW every spend wall, the database
-- gate and lanes_full, so neither can boot a cycle past one of John's protections:
--   1. gate_cards_to_rule fires whenever an undecided card is rulable -- not only on an empty board --
--      unless a rule-cards cycle ran in the last 2 hours (runner_cycles.last_step 'rule-cards: ...'),
--      so a card the manager cannot rule retries every 2 hours instead of holding every fire. With
--      nothing pickable the old behaviour holds exactly: it always rules.
--   2. redesign_due (should_boot true, detail.mode 'redesign-first', detail.redesign_ticket): the
--      first refusal_parked_tickets() row that John has not been asked about (no open gate-card
--      question on its card) and that no redesign cycle was handed in the last 24 hours
--      (runner_cycles.last_step 'redesign: <id>'), so a pickup that ends without an attempt cools
--      down and the next parked ticket gets its turn.
-- The function body is edited by four exact replacements of its live text, each asserted to match
-- exactly once, under an md5 guard on the body it was written against. Nothing else in it changes.
--
-- UNDO: run the DO block below with each pair's two halves swapped (new text -> old text; the md5
--   guard then reads 292753ec6c445b5938344d8038d98c4e, the body this migration leaves), which restores
--   the prior body (md5 ada52a4efa754a8cfe6f9d0551984833) exactly; then
--   drop function public.redesign_due_ticket(); drop function public.rule_cards_cooling();

create or replace function public.rule_cards_cooling()
returns boolean
language sql
stable
as $f$
  -- AGT-642: true while a rule-cards cycle ran in the last 2 hours, so an unrulable card cannot
  -- hold every fire. The marker is the cycle's own last_step, written per the cycle card's gate line.
  select exists (
    select 1 from public.runner_cycles c
     where c.started_at > now() - interval '2 hours'
       and c.last_step like 'rule-cards:%');
$f$;

create or replace function public.redesign_due_ticket()
returns text
language sql
stable
as $f$
  -- AGT-642: the refusal-parked ticket a cycle redesigns before any new pick, in
  -- refusal_parked_tickets()'s own order (need_score desc, queue). Skipped: a ticket whose gate card
  -- was ruled John's (an open gate-card question names it -- his call, it steps aside), and a ticket
  -- a redesign cycle was handed in the last 24 hours (its last_step reads 'redesign: <id>'), so a
  -- pickup that ends without an attempt cools down instead of holding the line.
  select p.backlog_id
    from public.refusal_parked_tickets() p
   where not exists (
           select 1
             from public.runner_items ri
             join public.runner_questions q
               on q.qid = 'gate-card-' || left(ri.id::text, 8) and q.status = 'open'
            where ri.backlog_id = p.backlog_id and ri.kind = 'gated_before_build')
     and not exists (
           select 1 from public.runner_cycles c
            where c.started_at > now() - interval '24 hours'
              and c.last_step like 'redesign: ' || p.backlog_id || '%')
   limit 1;
$f$;

do $agt642$
declare
  d text := pg_get_functiondef('public.runner_should_boot'::regproc);
  n text;
  pairs text[][] := array[
    -- 1. the facts row carries the redesign candidate
    array[E'AS list_tickets\n),\nverdict AS (',
          E'AS list_tickets,\n    -- AGT-642: the refusal-parked ticket due for redesign before any new pick.\n    public.redesign_due_ticket()                                    AS redesign_due\n),\nverdict AS ('],
    -- 2. cards first, then redesign, ahead of every pick (still below every wall above)
    array[E'      WHEN f.pickable_count = 0\n       AND COALESCE(f.gate_cards_to_rule, 0) > 0                    THEN ''gate_cards_to_rule''',
          E'      -- AGT-642 (John 2026-11-11, directive f8e2a234): a blocked ticket stops the line. Cards are\n      -- ruled, then a refusal-parked ticket is redesigned, BEFORE any new pick -- not only on an empty\n      -- board. Every wall above still wins. A card that cannot be ruled retries every 2 hours\n      -- (rule_cards_cooling); on an empty board it always rules, exactly as before.\n      WHEN COALESCE(f.gate_cards_to_rule, 0) > 0\n       AND (f.pickable_count = 0 OR NOT public.rule_cards_cooling()) THEN ''gate_cards_to_rule''\n      WHEN f.redesign_due IS NOT NULL                               THEN ''redesign_due'''],
    -- 3. redesign_due boots
    array[E'v.reason IN (''pickable'', ''gate_cards_to_rule'', ''work_to_find'') AS should_boot',
          E'v.reason IN (''pickable'', ''gate_cards_to_rule'', ''redesign_due'', ''work_to_find'') AS should_boot'],
    -- 4. its mode and the ticket it names
    array[E'                                 WHEN v.reason = ''work_to_find''       THEN ''find-work-only''',
          E'                                 WHEN v.reason = ''redesign_due''       THEN ''redesign-first''\n                                 WHEN v.reason = ''work_to_find''       THEN ''find-work-only'''],
    array[E'    ''list_tickets'',         v.list_tickets,',
          E'    ''list_tickets'',         v.list_tickets,\n    ''redesign_ticket'',      v.redesign_due,']
  ];
  i int;
  hits int;
begin
  if md5(d) <> 'ada52a4efa754a8cfe6f9d0551984833' then
    raise exception 'AGT-642: runner_should_boot() is not the body this migration was written against (md5 %); re-read it before applying', md5(d);
  end if;
  n := d;
  for i in 1 .. array_length(pairs, 1) loop
    hits := (length(n) - length(replace(n, pairs[i][1], ''))) / length(pairs[i][1]);
    if hits <> 1 then
      raise exception 'AGT-642: replacement % matched % times, expected exactly 1', i, hits;
    end if;
    n := replace(n, pairs[i][1], pairs[i][2]);
  end loop;
  execute n;
end
$agt642$;
