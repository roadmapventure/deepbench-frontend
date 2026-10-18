-- AGT-488 (v7.0.863) -- VICTORIA'S DUTY ROW AND SEVERITY TREE BECOME THE FILL RULES.
--
-- THE DEFECT, re-measured live by this build on 2026-10-18 before the apply (kickoff §2 agreed).
-- `skill_profiles.method` on `vc-prioritization-duty` was 3,079 bytes, md5 355e65d7044ae289549cbd6ee5db9365;
-- on `vc-john-severity-tree` 16,212 bytes, md5 d693cd9c15684170399f96242f710796. Neither carried a floor,
-- `filed_at`, an order inside a score, a freshness rule, the only-her-own-grades rule, or any
-- precedence over the reorganization runbook; lane A still read `(today: "the mcp server")`; and BOTH
-- rows still ordered a parked ticket scored 1 "until the checker accepts 0" -- which
-- `ck_backlog_need_score` (CHECK need_score >= 0 and <= 5) and `apply_requirement_verdict()` have
-- accepted since v7.0.826. So John's 2026-10-13 decisions reached nothing she actually reads.
--
-- WHAT THIS MIGRATION SHIPS. DATA only (pattern:2, pattern:8), two rows, five `replace()` UPDATEs:
-- three on `vc-prioritization-duty` (R1-R3) and two on `vc-john-severity-tree` (R4-R5). Every
-- `<from>`/`<to>` pair is VERBATIM from docs/harvests/AGT-488.md §RULES and was re-measured against
-- the live rows at build time: each `<from>` stood exactly once in its named row and zero times in
-- the other. No DDL, no function, no column, no grant. `objective`, `traits`, `guardrails`,
-- `skill_type_slug` and the five `requirement-check` bindings are untouched. Nothing is retired and
-- no John wording is removed: a wholesale rewrite was rejected for exactly that reason (harvest
-- §ALTERNATIVES, pattern:166, pattern:90) -- five exact substrings can be PROVEN not to have dropped
-- his words, and the guard asserts two of his sentences still stand. Decision 31 is deliberately
-- absent: project fit lives in the charters AGT-486 hands her, and a project slug in an agent's row
-- is a Rule #1 violation (§19d/§19e).
--
-- WHY THE BEFORE-IMAGE IS THIS MIGRATION'S DOWN. `public.capture_migration_down()` RAISES on an empty
-- object array and this migration creates no object at all, so there is nothing for it to capture.
-- The undo is the pair below, taken BEFORE the first UPDATE and in this order: one
-- `record_decision` of kind `agent-row` under AGT-488, then one FULL-ROW `runner_before_images`
-- insert per row carrying `to_jsonb(sp)` under that decision's id, with `cycle_id` set and
-- `session_name` NULL -- never both (`ck_before_image_attribution` refuses it).
-- `select * from public.reverse_decision('<handle>', 'John', '<why>');` puts both rows back whole.
--
-- A MIGRATION'S SUCCESS FLAG PROVES NOTHING (.claude/rules/supabase-column-grants.md), and
-- `replace()` is silent on a miss, so every statement asserts three things about its own work: one
-- row updated, the row's md5 MOVED off the value it held one statement earlier, and its own
-- `<from>` left standing exactly as many times as its own `<to>` re-includes it.
--
-- THE GATE. The trailing `do $gate$` RAISEs unless ALL of: each of task 1's nine markers stands
-- EXACTLY ONCE in the row that owns it (once, not "contains" -- a second apply would read as a pass
-- on an `includes()` check) and zero times in the other; the three withdrawn strings are gone from
-- both; both md5s have moved off the values above; and exactly two `runner_before_images` rows name
-- `skill_profiles` under this cycle.
--
-- TWO DEVIATIONS FROM THE KICKOFF'S §4, both measured and reported rather than silently taken.
-- (1) §4 asks the gate to assert `position('the mcp server' in method) = 0` on the tree row. Live,
-- that bare substring stands TWICE: in lane A (which R4 removes) and inside John's own verbatim
-- AGT-398 quotation, "setting up the mcp server usage to scale correctly", which this build must not
-- touch (pattern:166 -- a John wording is never removed without his words). The assertion as
-- literally written is unsatisfiable within R1-R5, so the gate asserts the LANE-A literal
-- `(today: "the mcp server")` is gone instead -- the exact byte range R4 removes. The tooth is
-- intact: drop R4 and this RAISEs. The guard's arm A uses the same literal for the same reason.
-- (2) §4 asks each statement to assert its `<from>` is "gone". R3's `<to>` ENDS with its own
-- `<from>` -- the header `WHAT HER TOOLS DO TODAY (not John's words):`, which the row keeps, with
-- the new rules block inserted ABOVE it -- so after R3 that string legitimately still stands once.
-- The first apply of this migration RAISED on precisely that assertion and rolled back whole
-- (0 decisions, 0 before-images, 0 migration rows, both md5s unmoved), which is the assertion
-- earning its keep rather than a theory about it. The shipped form expects what each `<to>`
-- re-includes -- 0 for R1/R2/R4/R5, 1 for R3 -- computed from the pair itself, never hand-set.

do $$
declare
  d uuid;
  v_duty_id uuid;
  v_tree_id uuid;
  v_n integer;
  v_hits integer;
  v_m text;
  v_pre text;
  v_from text;
  v_to text;
begin
  select sp.id into v_duty_id from public.skill_profiles sp where sp.slug = $s$vc-prioritization-duty$s$;
  select sp.id into v_tree_id from public.skill_profiles sp where sp.slug = $s$vc-john-severity-tree$s$;
  if v_duty_id is null or v_tree_id is null then
    raise exception 'AGT-488: both skill_profiles rows must exist; duty % tree %', v_duty_id, v_tree_id;
  end if;

  -- THE DOWN, first and in this order: the decision, then one full-row image per row under it.
  d := public.record_decision(
    $c$28640099-593d-437e-90ad-3e4aa70a289f$c$, NULL, 'agent-row', 'AGT-488',
    $sum$vc-prioritization-duty and vc-john-severity-tree carry John's 2026-10-13 fill rules: ten is a floor filled 5s then 4s then 3s, filed_at as the creation date, an order inside a score, a 14-day freshness check, only her own grades counting, a parked ticket scored 0, lane A naming no project, and the duty row winning over the runbook$sum$,
    $why$AGT-488, JOHN-0925-DESIGNER-DECIDES (reversible, harvest §CALLS): five exact replace() substitutions, never a rewrite, so no John wording can be dropped (pattern:166, pattern:90). Lane A gets no announce sensor -- john_pinned_at is set on 2 of the 3 executing projects and priority always has a lowest member, so neither marks a top project; the rule is written inert until a run announces one, and the sensor is a finding (pattern:68). docs/runbooks/victoria-reorg.md is NOT edited: its §(c) is the byte-source the live victoria-reorg routine copies, so the duty row carries the precedence sentence instead and only John re-words the routine. The 14-day validator is named by ticket (AGT-493), never by agent -- Rule #1.$why$);

  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  select $c$28640099-593d-437e-90ad-3e4aa70a289f$c$, NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), d
  from public.skill_profiles sp where sp.slug in ($s$vc-prioritization-duty$s$, $s$vc-john-severity-tree$s$);
  get diagnostics v_n = ROW_COUNT;
  if v_n <> 2 then raise exception 'AGT-488: expected 2 before-images, inserted %', v_n; end if;

  -- R1 -- vc-prioritization-duty. The pair is harvest §RULES byte for byte; its <to> re-includes its
  -- <from> 0 time(s), which is what is expected to stand afterwards.
  v_from := $r1f$WHAT SHE KEEPS. Ten tickets scored 3 or greater in each active (executing) project, at any time. Count a project's open or partial tickets with need_score 3 or greater.$r1f$;
  v_to := $r1t$WHAT SHE KEEPS. TEN IS A FLOOR, not a cap (John, 2026-10-13): ten countable tickets in each active (executing) project, at any time. Countable is what public.countable_tickets_per_project() counts -- an open or partial ticket scored 3 or greater that carries her own unreversed requirement-check grade, is not blocked, not parked, not claimed and not waiting on John. She fills to ten with the 5s, then 4s, then 3s. A 5 that fits an active project moves in even when that project already holds ten, and the project then holds eleven or more. Nothing is swapped out to make room for it, and a 3 already in is never swapped out.$r1t$;
  select md5(sp.method) into v_pre from public.skill_profiles sp where sp.slug = $s$vc-prioritization-duty$s$;
  update public.skill_profiles set method = replace(method, v_from, v_to), updated_at = now()
  where slug = $s$vc-prioritization-duty$s$;
  get diagnostics v_n = ROW_COUNT;
  if v_n <> 1 then raise exception 'AGT-488 R1: expected 1 row updated, got %', v_n; end if;
  select sp.method into v_m from public.skill_profiles sp where sp.slug = $s$vc-prioritization-duty$s$;
  if md5(v_m) = v_pre then
    raise exception 'AGT-488 R1: replace() was silent -- vc-prioritization-duty is byte-identical to its pre-statement value';
  end if;
  v_hits := (length(v_m) - length(replace(v_m, v_from, ''))) / length(v_from);
  if v_hits <> 0 then
    raise exception 'AGT-488 R1: the from-string must stand 0 time(s) in vc-prioritization-duty afterwards; stands %', v_hits;
  end if;

  -- R2 -- vc-prioritization-duty. The pair is harvest §RULES byte for byte; its <to> re-includes its
  -- <from> 0 time(s), which is what is expected to stand afterwards.
  v_from := $r2f$carry a parked 0 in the reason ("PARKED (0) until <project> is active") and score the ticket 1, which the pick skips.$r2f$;
  v_to := $r2t$score a parked ticket 0 and keep "PARKED (0) until <project> is active" first in its reason. Both validators, apply_requirement_verdict() and the ck_backlog_need_score CHECK all take a whole number 0-5 (v7.0.826, v7.0.844), so the old instruction to score it 1 is withdrawn; the pick skips anything under 3 either way, and the PARKED prefix is what the floor's own sensor reads.$r2t$;
  select md5(sp.method) into v_pre from public.skill_profiles sp where sp.slug = $s$vc-prioritization-duty$s$;
  update public.skill_profiles set method = replace(method, v_from, v_to), updated_at = now()
  where slug = $s$vc-prioritization-duty$s$;
  get diagnostics v_n = ROW_COUNT;
  if v_n <> 1 then raise exception 'AGT-488 R2: expected 1 row updated, got %', v_n; end if;
  select sp.method into v_m from public.skill_profiles sp where sp.slug = $s$vc-prioritization-duty$s$;
  if md5(v_m) = v_pre then
    raise exception 'AGT-488 R2: replace() was silent -- vc-prioritization-duty is byte-identical to its pre-statement value';
  end if;
  v_hits := (length(v_m) - length(replace(v_m, v_from, ''))) / length(v_from);
  if v_hits <> 0 then
    raise exception 'AGT-488 R2: the from-string must stand 0 time(s) in vc-prioritization-duty afterwards; stands %', v_hits;
  end if;

  -- R3 -- vc-prioritization-duty. The pair is harvest §RULES byte for byte; its <to> re-includes its
  -- <from> 1 time(s), which is what is expected to stand afterwards.
  v_from := $r3f$WHAT HER TOOLS DO TODAY (not John's words):$r3f$;
  v_to := $r3t$THE 2026-10-13 RULES (John, decisions 4, 6, 7, 8 and 30 of the Victoria fill requirements; the sentences outside quotations are not John's words). Where one of these differs from the 2026-10-09 text above, the 2026-10-13 rule wins and the older sentence is history, not an alternative.
DATES. The creation date is filed_at, never created_at: created_at is the database insert time, and two bulk loads on 2026-08-20 carry 308 tickets actually filed between 2026-06-07 and 2026-08-12. Every window in this row -- the seven days, the thirty days, the fourteen -- is measured on filed_at.
ORDER WITHIN A SCORE. Filed 14 days or less: oldest first. Filed more than 14 days ago: newest first, and that whole group comes after the first.
FRESHNESS. A ticket filed more than 14 days ago is validated first (AGT-493) -- is the problem still real, is there prior art, does the cause still hold -- before it moves into a project, and she re-grades it only when that validation changed the ticket's text or the finding behind it. That validation step is not built yet: until it is, leave such a ticket where it is and name the ticket and the gap in the run's line.
ONLY HER OWN GRADES count. A need_score with no unreversed requirement-check decision of hers is ungraded, whatever the column says, and is graded before it can move.
WHICH PROJECT a ticket belongs to is not written in this row: she reads it from the charters the run hands her, which carry that test themselves.
THIS DUTY ROW WINS OVER THE RUNBOOK. Where this row and the reorganization runbook differ -- including its "score it 1" sentence -- this row is the rule and the runbook's wording is stale.

WHAT HER TOOLS DO TODAY (not John's words):$r3t$;
  select md5(sp.method) into v_pre from public.skill_profiles sp where sp.slug = $s$vc-prioritization-duty$s$;
  update public.skill_profiles set method = replace(method, v_from, v_to), updated_at = now()
  where slug = $s$vc-prioritization-duty$s$;
  get diagnostics v_n = ROW_COUNT;
  if v_n <> 1 then raise exception 'AGT-488 R3: expected 1 row updated, got %', v_n; end if;
  select sp.method into v_m from public.skill_profiles sp where sp.slug = $s$vc-prioritization-duty$s$;
  if md5(v_m) = v_pre then
    raise exception 'AGT-488 R3: replace() was silent -- vc-prioritization-duty is byte-identical to its pre-statement value';
  end if;
  v_hits := (length(v_m) - length(replace(v_m, v_from, ''))) / length(v_from);
  if v_hits <> 1 then
    raise exception 'AGT-488 R3: the from-string must stand 1 time(s) in vc-prioritization-duty afterwards; stands %', v_hits;
  end if;

  -- R4 -- vc-john-severity-tree. The pair is harvest §RULES byte for byte; its <to> re-includes its
  -- <from> 0 time(s), which is what is expected to stand afterwards.
  v_from := $r4f$A = John's top project, which he names (today: "the mcp server")$r4f$;
  v_to := $r4t$A = John's announced top project, and this lane A names no project: the tie-break applies only to a project the run itself announces as his top one, and when no run announces one she drops to the next lane (John, 2026-10-13). She never reads a top project out of a project's priority or its pinned date$r4t$;
  select md5(sp.method) into v_pre from public.skill_profiles sp where sp.slug = $s$vc-john-severity-tree$s$;
  update public.skill_profiles set method = replace(method, v_from, v_to), updated_at = now()
  where slug = $s$vc-john-severity-tree$s$;
  get diagnostics v_n = ROW_COUNT;
  if v_n <> 1 then raise exception 'AGT-488 R4: expected 1 row updated, got %', v_n; end if;
  select sp.method into v_m from public.skill_profiles sp where sp.slug = $s$vc-john-severity-tree$s$;
  if md5(v_m) = v_pre then
    raise exception 'AGT-488 R4: replace() was silent -- vc-john-severity-tree is byte-identical to its pre-statement value';
  end if;
  v_hits := (length(v_m) - length(replace(v_m, v_from, ''))) / length(v_from);
  if v_hits <> 0 then
    raise exception 'AGT-488 R4: the from-string must stand 0 time(s) in vc-john-severity-tree afterwards; stands %', v_hits;
  end if;

  -- R5 -- vc-john-severity-tree. The pair is harvest §RULES byte for byte; its <to> re-includes its
  -- <from> 0 time(s), which is what is expected to stand afterwards.
  v_from := $r5f$Your answer format does not accept 0 yet, so put "PARKED (0) until <project> is active" first in your reason. Until the checker accepts 0, SCORE a parked ticket 1: the pick skips anything below 3, so it waits, and the PARKED (0) prefix is what marks it to be re-scored when the project is active.$r5f$;
  v_to := $r5t$Put "PARKED (0) until <project> is active" first in your reason and give it a 0: the checker now takes 0-5 (v7.0.826, v7.0.844), the pick skips anything below 3 so it waits, and the PARKED (0) prefix is what marks it to be re-scored when the project is active.$r5t$;
  select md5(sp.method) into v_pre from public.skill_profiles sp where sp.slug = $s$vc-john-severity-tree$s$;
  update public.skill_profiles set method = replace(method, v_from, v_to), updated_at = now()
  where slug = $s$vc-john-severity-tree$s$;
  get diagnostics v_n = ROW_COUNT;
  if v_n <> 1 then raise exception 'AGT-488 R5: expected 1 row updated, got %', v_n; end if;
  select sp.method into v_m from public.skill_profiles sp where sp.slug = $s$vc-john-severity-tree$s$;
  if md5(v_m) = v_pre then
    raise exception 'AGT-488 R5: replace() was silent -- vc-john-severity-tree is byte-identical to its pre-statement value';
  end if;
  v_hits := (length(v_m) - length(replace(v_m, v_from, ''))) / length(v_from);
  if v_hits <> 0 then
    raise exception 'AGT-488 R5: the from-string must stand 0 time(s) in vc-john-severity-tree afterwards; stands %', v_hits;
  end if;

  raise notice 'AGT-488: decision %, before-images on % and %, five replacements applied', d, v_duty_id, v_tree_id;
end $$;

do $gate$
declare
  v_duty text;
  v_tree text;
  v_hits integer;
  v_images integer;
  k text;
  v_duty_markers text[] := array[
    $k$TEN IS A FLOOR$k$,
    $k$5s, then 4s, then 3s$k$,
    $k$creation date is filed_at$k$,
    $k$14 days or less: oldest first$k$,
    $k$validated first (AGT-493)$k$,
    $k$ONLY HER OWN GRADES$k$,
    $k$score a parked ticket 0$k$,
    $k$DUTY ROW WINS OVER THE RUNBOOK$k$];
  v_tree_markers text[] := array[
    $k$lane A names no project$k$];
  v_withdrawn text[] := array[
    $k$Until the checker accepts 0$k$,
    $k$(today: "the mcp server")$k$,
    $k$score the ticket 1$k$];
begin
  select sp.method into v_duty from public.skill_profiles sp where sp.slug = $s$vc-prioritization-duty$s$;
  select sp.method into v_tree from public.skill_profiles sp where sp.slug = $s$vc-john-severity-tree$s$;

  -- Eight markers belong to the duty row: exactly once there, and never in the tree.
  foreach k in array v_duty_markers loop
    v_hits := (length(v_duty) - length(replace(v_duty, k, ''))) / length(k);
    if v_hits <> 1 then
      raise exception 'AGT-488 gate: vc-prioritization-duty must hold % exactly once; holds % time(s)', k, v_hits;
    end if;
    if position(k in v_tree) <> 0 then
      raise exception 'AGT-488 gate: % belongs to vc-prioritization-duty and must not stand in vc-john-severity-tree', k;
    end if;
  end loop;

  -- The ninth belongs to the tree row, the same way round.
  foreach k in array v_tree_markers loop
    v_hits := (length(v_tree) - length(replace(v_tree, k, ''))) / length(k);
    if v_hits <> 1 then
      raise exception 'AGT-488 gate: vc-john-severity-tree must hold % exactly once; holds % time(s)', k, v_hits;
    end if;
    if position(k in v_duty) <> 0 then
      raise exception 'AGT-488 gate: % belongs to vc-john-severity-tree and must not stand in vc-prioritization-duty', k;
    end if;
  end loop;

  -- The three withdrawn strings, gone from BOTH rows.
  foreach k in array v_withdrawn loop
    if position(k in v_duty) <> 0 or position(k in v_tree) <> 0 then
      raise exception 'AGT-488 gate: the withdrawn string % still stands', k;
    end if;
  end loop;

  -- Both md5s have moved off the pre-apply values measured above.
  if md5(v_duty) = $h$355e65d7044ae289549cbd6ee5db9365$h$ then
    raise exception 'AGT-488 gate: vc-prioritization-duty md5 did not move off %', $h$355e65d7044ae289549cbd6ee5db9365$h$;
  end if;
  if md5(v_tree) = $h$d693cd9c15684170399f96242f710796$h$ then
    raise exception 'AGT-488 gate: vc-john-severity-tree md5 did not move off %', $h$d693cd9c15684170399f96242f710796$h$;
  end if;

  select count(*) into v_images from public.runner_before_images i
  where i.cycle_id = $c$28640099-593d-437e-90ad-3e4aa70a289f$c$ and i.table_name = 'skill_profiles';
  if v_images <> 2 then
    raise exception 'AGT-488 gate: exactly TWO runner_before_images rows name skill_profiles under this cycle; found %', v_images;
  end if;

  raise notice 'AGT-488 gate: duty % chars md5 %, tree % chars md5 %, nine markers once each in their own row, three withdrawn strings gone, % before-images',
    length(v_duty), md5(v_duty), length(v_tree), md5(v_tree), v_images;
end $gate$;
