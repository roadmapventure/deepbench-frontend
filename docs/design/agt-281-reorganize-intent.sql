-- AGT-281 (v7.0.741) -- VICTORIA'S SECOND JUDGMENT: a whole findings LIST in one turn.
-- MIRROR of the applied migration `agt281_reorganize_intent`. Applied via mcp Supabase
-- apply_migration (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT here).
--
-- (a) DOWN, CAPTURED FIRST, before any of this ran (kickoff §5 T1), AND NOT WITH THE CALL THE
--     KICKOFF WROTE. The kickoff names `'[]'::jsonb`; `capture_migration_down()` RAISES on that --
--     "p_objects must be a non-empty JSON array of {kind, identity}", read live at this ship -- so
--     the kickoff's own SQL carried a form that cannot run, the same class of defect
--     .claude/rules/supabase-function-signature.md records for `DAT-12`. What ran instead, naming
--     the two tables this migration writes:
--   select * from public.capture_migration_down(
--     'e33d277d-45ea-4be8-ab30-883a0472de6d'::uuid, 'agt281_reorganize_intent',
--     '[{"kind":"table","identity":"public.skill_profiles"},
--       {"kind":"table","identity":"public.capability_skill_profiles"}]'::jsonb);
--   -> (agt281_reorganize_intent, refused, 0 captured, 2 refusals, down_sql NULL)
-- `refused` is the HONEST class and not a failure to work around: this migration creates no
-- function, view or trigger, so there is nothing auto-downable in it, and both tables already exist
-- (AGT-161 D1). The row recorded under that class is the record that the down is not derivable --
-- which is exactly true, because the down is the ONE `agent-row` decision below, and it is a real
-- one rather than a card-only note, since both rows this migration writes are INSERTs imaged
-- under it:
--   select * from public.reverse_decision('<the agent-row decision id>', 'John', '<why>');
--   -- row_data NULL on both images = "this row did not exist before" (SES-150), so the reversal
--   -- DELETES the Skill row and its binding and leaves `requirement-check` with the one intent it
--   -- has today.
--
-- WHY A SIBLING INTENT AND NOT A SECOND CAPABILITY (the Designer's recorded call (a), §19b).
-- `requirement-check` already IS the capability "does this proposal's cited need source support
-- it". AGT-280 slice 2 shipped it with exactly one intent, `vc-requirement-intent`, which rules ONE
-- named ticket against ONE named citation. Measured live 2026-10-02 on the unchanged tree:
-- `capability_skill_profiles where capability_slug='requirement-check'` is ONE row, Victoria's
-- `ai_activity_log` rows are 0, `runner_cycles notes like 'SCHEDULED-AGENT: victoria%'` is 0, and
-- `backlog_items where need_source is not null` is 0 across the 84 open/partial tickets of
-- `dev-mgr-findings` (77) and `auditor-findings` (7). One ticket per turn over 84 tickets is 84
-- turns; the work she is actually being asked for is to REORGANIZE a list. A second intent on the
-- same capability is the narrowest layer that delivers that (pattern:8, pattern:17): zero harness
-- change, zero new capability row, and `assemblePrompt()` fires whichever intent the caller names
-- while the other stays stacked context (`sp.slug === intentSlug` is the gate, api/prompt/
-- db-assembly.js).
--
-- HEADS, NOT BODIES, AND NO DECISIONS (the Designer's calls (b) and (d)). The candidate list this
-- intent chooses from carries the first 200 characters of each candidate row, never the whole row,
-- and `john:runner_decisions` is excluded from it altogether -- a decision is the record of a call
-- already made, not a need waiting to be answered. Those are the CALLER's rules
-- (`scripts/requirement-check.js`, `HEAD_CHARS` / `DESC_CHARS` / the candidate map), not this row's:
-- the Skill says what judgment to make, the script decides what reaches her.
--
-- Guard: `tests/regression/agt-281-victoria-runs.test.mjs`. Architecture: §19v Operations.
-- `AGT-281` stays `partial` -- the routine itself is attended work (kickoff §7).

do $agt281$
declare
  v_cyc  uuid := 'e33d277d-45ea-4be8-ab30-883a0472de6d';
  v_dec  uuid;
  v_sp   uuid := gen_random_uuid();
  v_bind uuid := gen_random_uuid();
  v_n    int;
begin
  -- 1. THE ONE HANDLE. Both rows below change under it, each imaged first (§19v reversibility).
  v_dec := public.record_decision(
    v_cyc, NULL, 'agent-row', 'AGT-281',
    'AGT-281 (v7.0.741): Victoria rules a whole findings list in one turn -- the sibling Intent ' ||
      'vc-reorganize-intent joins requirement-check beside vc-requirement-intent, so the 84 ' ||
      'open/partial tickets of dev-mgr-findings and auditor-findings can be reorganized against ' ||
      'the candidate need sources in one call per list instead of one call per ticket.',
    'Measured live 2026-10-02: requirement-check carries ONE intent (vc-requirement-intent, one ' ||
      'ticket against one named citation), Victoria has 0 ai_activity_log rows, 0 runner_cycles ' ||
      'notes like ''SCHEDULED-AGENT: victoria%'', and need_source is NULL on all 84 open/partial ' ||
      'tickets of the two findings lists -- so the gate AGT-280 built has a door nobody has walked ' ||
      'through, and walking it one ticket at a time is 84 turns. A SIBLING INTENT, not a second ' ||
      'capability: the judgment is the same judgment (does the cited source support this proposal), ' ||
      'only the unit changes from a ticket to a list, and assemblePrompt() already fires one named ' ||
      'intent and stacks the rest (pattern:8, pattern:17, §19b). max_tokens is 16000 rather than ' ||
      'vc-requirement-intent''s 8000 because the answer is one row per ticket over a list of up to ' ||
      '77. Both rows are INSERTs, so both before-images carry row_data NULL (SES-150) and one ' ||
      'reverse_decision() removes the intent and its binding together.',
    NULL);

  -- 2. THE IMAGES, BEFORE THE INSERTS. row_data NULL is how the reversal chain says "this row did
  --    not exist before" (SES-150); pk_value is the uuid each INSERT is about to use (pattern:169),
  --    so the promise is one reverse_decision() can actually keep.
  insert into public.runner_before_images (cycle_id, table_name, pk_value, row_data, decision_id)
  values (v_cyc, 'skill_profiles',            v_sp::text,   NULL, v_dec),
         (v_cyc, 'capability_skill_profiles', v_bind::text, NULL, v_dec);

  -- 3. THE SKILL ROW (kickoff §4). Every column but `objective`, `method`, `traits`, `max_tokens`
  --    and the three naming columns is vc-requirement-intent's own value, read live at this ship:
  --    type `intent`, tenant `global`, provider anthropic, model claude-fable-5-1, api key
  --    `platform`, execution_type `ai`, temperature NULL, guardrails the same empty pair.
  insert into public.skill_profiles (
    id, slug, name, description, skill_type_slug, objective, method, output_desc, tone, confidence,
    traits, guardrails, notes, technical_services, execution_type, tenant_id,
    llm_provider, llm_model, max_tokens, api_key_source, temperature)
  values (
    v_sp,
    'vc-reorganize-intent',
    'Reorganize a Requirement List',
    'AGT-281 (v7.0.741): Victoria rules a WHOLE findings list in one turn -- per ticket, which ' ||
      'candidate need source supports it and how strongly, or turn the ticket down. Sibling of ' ||
      'vc-requirement-intent on the same requirement-check capability (§19b).',
    'intent',
    'Per ticket of a findings list: which candidate need source supports it, how strongly, or turn it down.',
    'You are handed one findings list -- its project slug, every open or partial ticket on it, and ' ||
      'the candidate need sources the platform recognises, each as a `who:table:id` key with the ' ||
      'first 200 characters of the row behind it.' || E'\n\n' ||
    '1. Read the tickets first, then the candidates. Whether a candidate row EXISTS is already ' ||
      'settled before you are called -- a lookup decided it, and it is never your question. Your ' ||
      'question is which of those rows, if any, asks for what a ticket proposes to build.' || E'\n' ||
    '2. Answer ONE row per ticket you were handed, every ticket exactly once, and never a ticket ' ||
      'you were not handed. A ticket you cannot decide is a `not-needed`, never an omission.' || E'\n' ||
    '3. `pass` means a candidate supports it: put that candidate''s key in `need_source` exactly as ' ||
      'you were given it, and score `need_score` 1-5 -- 5 = the cited row asks for exactly this and ' ||
      'the platform is blocked without it; 3 = the row supports it and the work can wait; 1 = the ' ||
      'row touches it only in passing.' || E'\n' ||
    '4. `not-needed` means no candidate supports it -- the proposal answers a need nobody recorded, ' ||
      'or it has outgrown the one it was filed against. Set `need_source` and `need_score` to null. ' ||
      'The ticket is not deleted: it is proposed for removal and waits for John, so your reason is ' ||
      'the whole case he reads.' || E'\n' ||
    '5. `reason` is one line, at most 400 characters, in plain business language, quoting the part ' ||
      'of the candidate row (or of the ticket) you relied on.' || E'\n' ||
    '6. Several tickets may share one candidate -- say so plainly rather than inventing a different ' ||
      'source per ticket. Never invent a key, never widen one you were given, never score a ' ||
      '`not-needed`, and never rule on the ticket of another list.',
    'One JSON object: the list slug, one row per ticket (verdict, the candidate key or null, a 1-5 ' ||
      'score or null, a one-line reason) and your account of the turn.',
    'Direct and evidence-first. Quote the candidate row; never paraphrase it into agreement.',
    'State the score you actually believe. A 5 you cannot point at a sentence for is a 3. A list ' ||
      'where every ticket passes is a list you did not read.',
    jsonb_build_object(
      'can_request_help', false,
      'schema', jsonb_build_object(
        'type', 'object',
        'required', jsonb_build_array('list', 'rows', 'account'),
        'properties', jsonb_build_object(
          'list', jsonb_build_object('type', 'string', 'maxLength', 100,
            'description', 'The findings list you were handed, by its project slug -- echoed back unchanged.'),
          'account', jsonb_build_object('type', 'string', 'maxLength', 100),
          'rows', jsonb_build_object(
            'type', 'array',
            'description', 'One row per ticket you were handed, every ticket exactly once.',
            'items', jsonb_build_object(
              'type', 'object',
              'required', jsonb_build_array('backlog_id', 'verdict', 'need_source', 'need_score', 'reason'),
              'properties', jsonb_build_object(
                'backlog_id', jsonb_build_object('type', 'string', 'maxLength', 40),
                'verdict', jsonb_build_object('type', 'string',
                  'enum', jsonb_build_array('pass', 'not-needed')),
                'need_source', jsonb_build_object(
                  'type', jsonb_build_array('string', 'null'), 'maxLength', 200,
                  'description', 'The candidate key this ticket answers, as who:table:id -- echoed back unchanged, never invented. null on a not-needed.'),
                'need_score', jsonb_build_object(
                  'type', jsonb_build_array('integer', 'null'), 'minimum', 1, 'maximum', 5,
                  'description', 'How strongly the candidate supports the ticket. null on a not-needed.'),
                'reason', jsonb_build_object('type', 'string', 'maxLength', 400)
              )))))),
    jsonb_build_object('must', jsonb_build_array(), 'must_not', jsonb_build_array()),
    NULL,
    '[]'::jsonb,
    'ai',
    'global',
    'anthropic',
    'claude-fable-5-1',
    16000,
    'platform',
    NULL);

  -- 4. THE BINDING. Level 3 and display_order 2, beside vc-requirement-intent's level 3 /
  --    display_order 1: the same capability, the same depth, the second intent.
  insert into public.capability_skill_profiles
    (id, capability_slug, skill_profile_slug, level, is_required, display_order)
  values (v_bind, 'requirement-check', 'vc-reorganize-intent', 3, true, 2);

  -- 5. THE MIGRATION ASSERTS ITS OWN QA, never its success flag (kickoff §5 T1: "assert 1 and 1").
  select count(*) into v_n from public.skill_profiles where slug = 'vc-reorganize-intent';
  if v_n <> 1 then
    raise exception 'AGT-281: exactly one vc-reorganize-intent Skill row must exist; got %', v_n;
  end if;

  select count(*) into v_n from public.capability_skill_profiles
   where capability_slug = 'requirement-check' and skill_profile_slug = 'vc-reorganize-intent';
  if v_n <> 1 then
    raise exception 'AGT-281: exactly one requirement-check -> vc-reorganize-intent binding must exist; got %', v_n;
  end if;

  -- BOTH DIRECTIONS, never one (the supabase-column-grants lesson): the new intent is there AND the
  -- intent AGT-280 shipped is still bound, so a migration that replaced it rather than joining it
  -- fails here.
  select count(*) into v_n from public.capability_skill_profiles
   where capability_slug = 'requirement-check';
  if v_n <> 2 then
    raise exception 'AGT-281: requirement-check must now carry exactly 2 intents (the AGT-280 one and this sibling); got %', v_n;
  end if;

  -- The two images are under ONE decision and both say "no prior row", so the reversal is a delete.
  select count(*) into v_n from public.runner_before_images
   where decision_id = v_dec and row_data is null;
  if v_n <> 2 then
    raise exception 'AGT-281: the agent-row decision must carry exactly 2 before-images with row_data NULL; got %', v_n;
  end if;

  raise notice 'AGT-281: agent-row decision % -- vc-reorganize-intent % bound as %', v_dec, v_sp, v_bind;
end
$agt281$;
