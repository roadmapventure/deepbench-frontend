-- DeepBench v7.0.700 | docs/design/agt-164-brittany-seed.sql | AGT-164 — Brittany (MK-07), the
-- outside tester's blank marketing agent. Applied VERBATIM over the Supabase MCP in ONE
-- transaction, cycle 9e519233-eda3-476e-9d49-eb92fc4f044c. Data only, no DDL, so no
-- capture_migration_down. Under rule AGENT-ROW-AGREED-TICKET (§19v P7): AGT-164 is john-named, so
-- the agents INSERT is build work under one decision handle with its own before-image (row_data
-- NULL for an INSERT, cycle_id set and session_name NULL per ck_before_image_attribution) — no
-- approval card. is_active STAYS false: flipping it on is John's hire card. She gets NO other row
-- — no agent_configs, skill_profiles, capabilities, capability_skill_profiles,
-- agent_capability_assignments, knowledge_entries or the_library. Everything she knows is the
-- outside tester's to teach on her Teach screen; data_room_access '[]' is §19c's "no Library".
-- The DO block's own count is the gate: it raises AGT164 gate and rolls the transaction back.
BEGIN;
DO $$
DECLARE d uuid;
BEGIN
  d := public.record_decision('9e519233-eda3-476e-9d49-eb92fc4f044c', NULL, 'agent-row', 'AGT-164',
    'Brittany (MK-07), the outside tester''s blank marketing agent',
    'AGENT-ROW-AGREED-TICKET: john-named, so build work with a before-image; is_active stays false.');
  INSERT INTO public.agents (id, code, name, role, lane, specialty, bio, is_active, visibility, agent_origin, data_room_access, uber_access)
  VALUES ('brittany', 'MK-07', 'Brittany', 'Marketing Agent', 'product',
    'Marketing · Taught by her trainer · No seeded corpus',
    $q$A blank marketing agent: no role prompt, no guardrails, no Library access. Everything she knows was taught on her Teach screen by her trainer.$q$,
    false, 'create', 'customer', '[]'::jsonb, false);
  INSERT INTO public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  VALUES ('9e519233-eda3-476e-9d49-eb92fc4f044c', NULL, 'agents', 'brittany', NULL, d);
  IF (SELECT count(*) FROM public.agents WHERE id='brittany' AND lane='product' AND is_active=false
    AND agent_origin='customer' AND data_room_access='[]'::jsonb) <> 1 THEN RAISE 'AGT164 gate'; END IF;
END $$;
COMMIT;
