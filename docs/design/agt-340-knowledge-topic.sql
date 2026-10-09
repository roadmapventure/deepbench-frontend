-- AGT-340 (v7.0.831) -- THE KNOWLEDGE TOOL ANSWERS A TOPIC. The two Intent rows behind every
-- private agent's `<id>-knowledge` tool (`agent-bundle-intent`, and `agent-bundle-any-intent` on the
-- admin address) gain ONE OPTIONAL INPUT, `topic`. api/_lib/mcp.js publishes
-- `traits.input_schema.properties` as the tool's task_context schema and validateToolInput() enforces
-- only `required`, so this is a DATA edit and no mcp.js change: without it the handler would accept a
-- topic that no connected AI client could ever discover (measured this cycle, harvest §2).
--
-- WHY IT IS BUILD WORK AND NOT A CARD. The live ticket row reads scope_origin `john-named`, and
-- `node scripts/agent-row-gate.js --ticket=AGT-340 --action=edit-active` returns `build` under clause
-- `agreed-ticket` (AGENT-ROW-AGREED-TICKET): an agreed ticket's agent-row edit ships with a
-- before-image per row under one decision handle, not a card. Both verified live 2026-10-09.
--
-- MIRROR of the migration `agt340_knowledge_topic`, applied via mcp Supabase `apply_migration`
-- (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT here -- and so the trailing
-- GATE's RAISE rolls every statement below back). Kickoff:
-- docs/kickoffs/v7.0.831-AGT-340-knowledge-topic-lookup.md; reasoning: docs/harvests/AGT-340.md,
-- whose §7 is this body verbatim.
--
-- =================================================================================================
-- THE DOWN -- DATA ONLY, SO IT IS A REVERSAL AND NOT DERIVED DDL (runbook step 6).
-- =================================================================================================
--
-- This up creates, drops and alters NOTHING. It rewrites one jsonb key on two EXISTING
-- `skill_profiles` rows, so `capture_migration_down()` has no object whose prior state is
-- recoverable from the catalog: naming the table classifies `refused` with a null down_sql, by its
-- own rule ("the table already exists, so the up ALTERs it -- a lossless down for an in-place
-- alteration is not derivable from the object's current state alone"). That is the precedented
-- outcome for a data-only up, not a failure -- `agt390_teach_tool`, `agt336_agent_sharing`,
-- `agt392_identity_editor` and `agt393_teach_identity_kinds` all carry classification `refused`
-- (read live 2026-10-09).
--
-- THE REAL DOWN is the before-image this migration writes for each of the two rows, replayed by:
--
--   select * from public.reverse_decision('<the uuid the NOTICE below prints>',
--     'builder', 'AGT-340 rolled back: the optional topic input is withdrawn from both Intent rows',
--     'c88577ce-4285-474a-ba87-06ff19b1b19a');
--
-- It works because `skill_profiles` IS in `reversible_tables()` (asserted live this cycle) and
-- because the before-images are written under this decision's own handle, keyed by `pk_value` =
-- the row's uuid. Full call and its pre-flight: /tmp/agt340-down.sql.
--
-- DECISION HANDLE: recorded at apply time -- the trailing `raise notice` prints it. It is NOT
-- written here in advance, because a handle this file asserted but the apply never produced would
-- be a false record of a reversal path (CLAUDE.md: verify, never assert from memory).
--
-- PRE-FLIGHT, read-only, run against live this cycle before any apply: the before-image select
-- images 2 rows, the guarded UPDATE touches 2 rows, and the GATE's exact predicate -- evaluated
-- over a CTE that applied the same jsonb_set in memory -- counts 2 of 2. All three RAISE guards
-- therefore pass. Two rows of a 180-row table with no DDL: it runs in milliseconds, well inside the
-- connector's 60s ceiling.
--
-- DeepBench v7.0.831 | migration agt340_knowledge_topic | AGT-340
-- The Knowledge tool's two Intent rows gain the optional input `topic`. Data only, no DDL; rolls
-- back unless the trailing GATE passes. Down: reverse_decision(<the decision the NOTICE prints>).
do $agt340$
declare
  k_cycle constant uuid := 'c88577ce-4285-474a-ba87-06ff19b1b19a';
  k_slugs constant text[] := array['agent-bundle-intent', 'agent-bundle-any-intent'];
  v_dec uuid;
  n int;
begin
  v_dec := public.record_decision(
    k_cycle, null, 'agent-row', 'AGT-340',
    'AGT-340: the Knowledge tool''s two Intent rows (agent-bundle-intent, agent-bundle-any-intent) gain the optional input topic, so an AI tool can ask what the agent was taught about one subject',
    'John 2026-10-03 (private-agent-metrics-1003): "anything that shows its intelligence was used", then "add all". Ticket scope_origin john-named; scripts/agent-row-gate.js --action=edit-active -> build (AGENT-ROW-AGREED-TICKET). Measured 2026-10-09: 0 ai_activity_log rows with call_source mcp and feature knowledge-retrieval; tools/call enforces only input_schema.required, so an optional property is a data edit and no mcp.js change (pattern:2, pattern:17). One tool, not two: without a topic the handover is byte-identical (pattern:65). Before-image per row under this decision; skill_profiles is in reversible_tables().',
    public.ladder_work_class('P4 - New Customers'));

  insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  select k_cycle, null, 'skill_profiles', sp.id::text, to_jsonb(sp), v_dec
    from public.skill_profiles sp
   where sp.slug = any(k_slugs);
  get diagnostics n = row_count;
  if n <> 2 then raise exception 'AGT-340: imaged % Intent rows, expected 2', n; end if;

  update public.skill_profiles
     set traits = jsonb_set(traits, '{input_schema,properties,topic}',
         '{"type": "string", "description": "Optional. Only the lessons matching this topic or question are returned, and the framing says so."}'::jsonb)
   where slug = any(k_slugs)
     and not (traits->'input_schema'->'properties' ? 'topic');
  get diagnostics n = row_count;
  if n <> 2 then raise exception 'AGT-340: updated % Intent rows, expected 2', n; end if;

  -- GATE: both directions, never the success flag.
  select count(*) into n
    from public.skill_profiles
   where slug = any(k_slugs)
     and traits->'input_schema'->'properties'->'topic'->>'type' = 'string'
     and traits->'input_schema'->'properties' ? 'agent_id'
     and traits->>'handler' = 'agent-bundle'
     and traits->'input_schema'->'required' = (case slug when 'agent-bundle-any-intent' then '["agent_id"]'::jsonb else '[]'::jsonb end);
  if n <> 2 then raise exception 'AGT-340 gate: % of 2 Intent rows carry topic with required unchanged', n; end if;

  raise notice 'AGT-340: decision %, 2 Intent rows imaged and updated', v_dec;
end
$agt340$;
