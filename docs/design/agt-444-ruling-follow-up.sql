-- AGT-444 (v7.0.974) -- A FOLLOW-UP FAULT IS FILED, NEVER PROMISED.
--
-- THE DEFECT, measured live 2026-11-07 on 5017e41 (kickoff §2). Gate card `5d1f0891`'s own
-- `value_case` records that its ship point was "denied twice by the permission system
-- ("[Modify Shared Resources]" to the Builder, "[Auto-Mode Bypass]" to the orchestrator)" -- the
-- auto-mode classifier refusing the push -- and NO row but AGT-444 names that refusal today. The
-- ruling on that card said the fault was being filed separately; nothing filed it, because
-- `scripts/decide-gated-card.js` held ZERO `follow_up` handling and ZERO `ingestFindings()` calls,
-- and `validateRulings()` read the sentence as a perfectly good reason (`ok true` on decision
-- 399283ea, re-measured this cycle). A reason that promises a filing nobody makes is worse than one
-- that says nothing: the promise READS as a record and is not one (pattern:92, pattern:162).
--
-- WHAT THIS MIGRATION SHIPS. DATA only (pattern:2), one row, one UPDATE: the `skill_profiles` row
-- `dm-gate-intent` gains the paragraph A FOLLOW-UP FAULT IS FILED, NEVER PROMISED in `method`, and
-- its stored answer contract gains `follow_up` on each ruling -- `{text, finding_type}`, `text`
-- required. There is NO DDL here and no function: the mechanism is in
-- `scripts/decide-gated-card.js` (`followUpRefusals()` refuses a promise carrying no `follow_up`;
-- apply() files the finding through `scripts/audit-ledger.js`'s `ingestFindings()` BEFORE the ruling
-- is sent and appends the finding id, or the UNFILED line, to the reason). This row is the
-- instruction that tells the Development Manager to use it, and the schema that lets him
-- (pattern:7 -- the agent's behaviour is fixed in the agent's own Skill content, not in the loop).
--
-- WHY THE BEFORE-IMAGE IS THIS MIGRATION'S DOWN. `public.capture_migration_down()` RAISES on an
-- empty object array and this migration creates no object at all, so there is nothing for it to
-- capture (same shape as docs/design/agt-487-held-source-echo.sql). The undo is the pair below,
-- taken BEFORE the UPDATE and in this order: one `record_decision` of kind `agent-row` under
-- AGT-444, then a FULL-ROW `runner_before_images` insert carrying `to_jsonb(sp)` under that
-- decision's id, `cycle_id` set and `session_name` NULL -- never both.
-- `select * from public.reverse_decision('<handle>', 'John', '<why>');` puts the row back whole,
-- method and traits together.
--
-- THE GATE. The trailing `do $gate$` RAISEs unless `method` holds
-- `A FOLLOW-UP FAULT IS FILED, NEVER PROMISED` EXACTLY ONCE (once, not "contains": a second apply of
-- this patch would read as a pass on a `.includes()` check), the stored contract's
-- `rulings.items.properties.follow_up.required` reads exactly `["text"]`, and exactly one
-- `runner_before_images` row names `skill_profiles` under this cycle. A migration's success flag
-- proves nothing (.claude/rules/supabase-column-grants.md).
--
-- APPLIED 2026-11-07 as migration `agt444_ruling_follow_up`. The applied copy carries a 4-line
-- header pointing back at this file in place of the argument above; every executable statement
-- below it is byte-identical. Verified independently of the success flag, not from it: heading
-- hits 1, `follow_up.required` = ["text"], the ruling's other four properties (card_id, ruling,
-- reason, ticket_note) and its own `required` (["card_id","ruling","reason"]) untouched, method
-- 2023 -> 2384 chars, 1 `runner_before_images` row and 1 `agent-row` decision under this cycle.

do $$
declare
  d uuid;
  v_row_id uuid;
  v_para text;
  v_schema jsonb;
begin
  select sp.id into v_row_id
  from public.skill_profiles sp where sp.slug = 'dm-gate-intent';
  if v_row_id is null then
    raise exception 'AGT-444: no skill_profiles row reads slug dm-gate-intent';
  end if;

  -- The DOWN, first and in this order: the decision, then the full-row image under it.
  d := public.record_decision(
    'a86b94dc-c4fc-4f9b-99a0-00c8d7f94830', NULL, 'agent-row', 'AGT-444',
    $sum$dm-gate-intent: a ruling's follow-up fault is filed as a finding, never promised in the reason$sum$,
    $why$AGT-444 (pattern:92, pattern:162, pattern:2): card 5d1f0891's value_case recorded a ship point denied twice by the permission system (the auto-mode classifier refusing the push) and its ruling said the fault was being filed separately -- nothing filed it, and no row but AGT-444 names that refusal. decide-gated-card.js held 0 follow_up handling and 0 ingestFindings calls, so validateRulings() read the promise as a sound reason (ok true on decision 399283ea, re-measured 2026-11-07). This row now carries the instruction and the answer schema: a fault outside the card's own work travels as follow_up {text, finding_type}, the script files it into audit_findings under the cycle before the ruling is sent, and the reason carries the finding id it actually produced or says it is UNFILED and who files it.$why$);

  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  select 'a86b94dc-c4fc-4f9b-99a0-00c8d7f94830', NULL, 'skill_profiles', sp.id::text, to_jsonb(sp), d
  from public.skill_profiles sp where sp.slug = 'dm-gate-intent';

  -- THE ONE EDIT, both halves in a single UPDATE: the kickoff §5's own paragraph, verbatim, and the
  -- `follow_up` property on each ruling. `jsonb_set` on an existing parent path ADDS the key, so the
  -- other four properties (card_id, ruling, reason, ticket_note) and `required` are untouched.
  v_para := ' ' || $para$A FOLLOW-UP FAULT IS FILED, NEVER PROMISED (AGT-444): a fault outside the card's own work goes in follow_up {text, finding_type} on that ruling; the script files it as a finding under this cycle before the ruling is written and appends the finding id to reason, or that it is unfiled and who files it. A reason never claims a filing this answer does not carry.$para$;

  v_schema := $json${"type":"object","required":["text"],"properties":{"text":{"type":"string","maxLength":600},"finding_type":{"enum":["defect","gap","proposal","security"],"type":"string"}}}$json$::jsonb;

  update public.skill_profiles
  set method = method || v_para,
      traits = jsonb_set(traits, '{schema,properties,rulings,items,properties,follow_up}', v_schema),
      updated_at = now()
  where slug = 'dm-gate-intent';

  raise notice 'AGT-444: decision % , row % , paragraph appended (% chars), follow_up schema set', d, v_row_id, length(v_para);
end $$;

do $gate$
declare
  v_method text;
  v_hits integer;
  v_required jsonb;
  v_images integer;
begin
  select sp.method, sp.traits #> '{schema,properties,rulings,items,properties,follow_up,required}'
    into v_method, v_required
  from public.skill_profiles sp where sp.slug = 'dm-gate-intent';

  v_hits := (length(v_method) - length(replace(v_method, 'A FOLLOW-UP FAULT IS FILED, NEVER PROMISED', ''))) / length('A FOLLOW-UP FAULT IS FILED, NEVER PROMISED');
  if v_hits <> 1 then
    raise exception 'AGT-444 gate: method must hold A FOLLOW-UP FAULT IS FILED, NEVER PROMISED exactly once; holds % time(s)', v_hits;
  end if;

  if v_required is null or v_required::text <> '["text"]' then
    raise exception 'AGT-444 gate: rulings.items.properties.follow_up.required must read ["text"]; reads %', coalesce(v_required::text, '<none>');
  end if;

  select count(*) into v_images from public.runner_before_images i
  where i.cycle_id = 'a86b94dc-c4fc-4f9b-99a0-00c8d7f94830' and i.table_name = 'skill_profiles';
  if v_images <> 1 then
    raise exception 'AGT-444 gate: exactly ONE runner_before_images row names skill_profiles under this cycle; found %', v_images;
  end if;

  raise notice 'AGT-444 gate: method % chars, heading once, follow_up required ["text"], % before-image row', length(v_method), v_images;
end $gate$;
