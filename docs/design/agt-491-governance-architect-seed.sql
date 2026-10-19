-- AGT-491 — The Governance Architect (GV-09): one `agents` row and two `agent_skill_pins` rows. No
-- capability, no Skill profile, no assignment: this ticket creates the agent and pins the two Skills
-- John named, and nothing else (pattern:90).
-- Written by the Builder, unattended cycle 67a5115a-d572-49b1-83bf-630ed6d12639, 2026-10-19 (v7.0.868).
-- JOHN'S WORDS, decisions 27/29 of docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md: a NEW agent
-- "Governance Architect", industry title Solutions Architect; its "Chief Architect lens" Skill pinned
-- "without removing it from the Verifier"; "all fields, avatar config, pronouns, DB row".
-- is_active = true per the SES-338 lane carve-out (.claude/rules/agent-roster-inert.md): a
-- governance-lane agent never reaches the product roster or the product broker (SES-330 fences the
-- roster fetch on lane = 'product'), so there is no selection prompt for it to be a trap in and no
-- hire card for John to sign. `node scripts/agent-row-gate.js --ticket=AGT-491 --action=create`
-- answered, on this tree, this cycle:
--   agent-row-gate: AGT-491 · action=create · scope_origin="john-named" → BUILD — action 'create' under scope_origin = 'john-named' AND an unreversed runner_decisions row names this ticket — AGENT-ROW-AGREED-TICKET makes this build work under the ticket, no approval card. It still owes its own runner_before_images row under one decision handle. · need_source=john:runner_decisions:57894411-de47-4718-9d2a-f3426a43cebc (unreversed John decision)
-- so the write is build work under the ticket, and it still owes its per-row before-image.
-- THE LENS is the EXISTING `vf-knowledge-bar` skill_profiles row — the Chief Architect lens the
-- Verifier already carries. It is PINNED here, never copied and never moved: its one
-- capability_skill_profiles link to `verify-ship` is untouched, which is what "without removing it
-- from the Verifier" means. A pin names a slug, never an agent (Rule #1), and a pinned Skill never
-- enters signature_config.assembled_skill_slugs (AGT-434, .claude/rules/ai-pattern-signature.md).
-- NOT IN `AGENTS` (src/data/agents.js): a governance agent stays off the Bench array (AGT-69) and
-- the Bench's Governance section renders it from the live lane = 'governance' row, so no screen
-- changes. Its AVATAR_CFG / AGENT_PRONOUNS entries are added in that file so every surface that
-- already draws a governance id resolves a portrait instead of a blank.
-- MONEY AND TRAINING COLUMNS ARE NULL, the eight governance peers' profile exactly.
--
-- THIS FILE IS THE MIRROR OF THE APPLIED MIGRATION, NOT THE APPLY PATH. The rows were applied with
-- apply_migration `agt491_governance_architect`, which wraps these same two INSERTs in the decision
-- handle and the three before-images the gate's verdict owes, and ends in a read-only GATE block.
-- capture_migration_down('67a5115a-d572-49b1-83bf-630ed6d12639','agt491_governance_architect', …) ran
-- BEFORE the apply, per docs/runbooks/runner-cycle.md step 6.

BEGIN;

INSERT INTO public.agents (id, code, name, role, lane, specialty, bio, is_active, visibility, agent_origin, sharing, skill_score, rating, usage_count, data_room_access, uber_access)
VALUES ('architect', 'GV-09', 'The Governance Architect', 'Governance — Architect', 'governance',
  'Finding Root-Cause Grouping · Reproduced-Cause Testing · Ticket Validation',
  'The Governance Architect is this platform''s Solutions Architect. A finding is a hypothesis: nothing becomes a ticket until its cause has been reproduced. It groups findings by cause, checks prior art and competing fixes, tests each cause once per group, and writes one tested ticket naming every finding behind it.',
  true, 'config', 'system', 'public', 0, 0, 0, '[]'::jsonb, false);

INSERT INTO public.agent_skill_pins (tenant_id, agent_id, skill_profile_slug, display_order) VALUES
 ('global', 'architect', 'deepbench-north-star', 0),
 ('global', 'architect', 'vf-knowledge-bar',     1);

COMMIT;

-- After applying, verify (read-only, both directions):
--   select lane, is_active, sharing, code from public.agents where id = 'architect';           → governance, true, public, GV-09
--   select count(*) from public.agents where lane = 'governance';                              → 9 (GV-01..GV-09, distinct)
--   select skill_profile_slug, display_order from public.agent_skill_pins where agent_id = 'architect' order by display_order;
--                                                                                              → deepbench-north-star 0, vf-knowledge-bar 1
--   select count(*) from public.capability_skill_profiles where skill_profile_slug = 'vf-knowledge-bar';  → 1 (still verify-ship)
--   select count(*) from public.agent_capability_assignments where agent_id = 'architect';      → 0
-- then add AVATAR_CFG.architect and AGENT_PRONOUNS.architect (they/them/their, // FEATURE: AGT-491)
-- in src/data/agents.js — tests/regression/SE-03-agent-fields.js turns red on an active governance
-- id with no portrait entry, and tests/regression/agt-491-governance-architect.test.mjs pins the
-- whole shape. No handler and no capability: AGT-492/493/494 are separate, unfiled by this build.
