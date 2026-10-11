-- AGT-434 (v7.0.850), Parts 1 and 2 -- THE NORTH STAR IS PINNED ONCE PER AGENT. John's directive
-- 3c1cc23d: "it should only be pinned once to each agent and they know it intametly". The Skill row
-- `deepbench-north-star` was reaching its 11 agents as 49 `capability_skill_profiles` links -- one per
-- capability -- and api/prompt/db-assembly.js's agent-wide path pushes every assigned capability's
-- links with no slug check, so the SAME knowledge rendered as 12 sections in Jerry's prompt and 11 in
-- Nathan's (measured live 2026-10-11 through the real assemblePrompt()). This migration is Part 1's
-- database half: it creates `public.agent_skill_pins`, pins the row to the 11 agents once each, and
-- the assembler reads the pin after the signature snapshot. Part 2 (the 49 links removed over
-- PostgREST under its own decision) follows in the same build, AFTER this has applied and been
-- proven -- order is safety, not preference: remove the links first and all eleven agents lose the
-- north star on their next call.
--
-- NOT this build and NOT filed by it (Development Manager's ruling fb1c4198-6557-4528-9096-626d95b823b1,
-- which waived the P6 cap of 3 files / 4 tasks to 6 / 8 for Parts 1 and 2 only): `agent_skill_pins`
-- into reverse_decision()'s k_allowed and public.reversible_tables(), and the Personnel /
-- agent-bundle visibility of a pinned Skill (ARCHITECTURE.md SS19w).
--
-- MIRROR of the migration `agt434_agent_skill_pins`, applied via mcp Supabase `apply_migration`
-- (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT here -- and so the trailing
-- GATE's RAISE rolls every statement below back). Kickoff:
-- docs/kickoffs/v7.0.850-AGT-434-agent-skill-pins.md; reasoning: docs/harvests/AGT-434.md.
--
-- =================================================================================================
-- THE DOWN, CAPTURED FIRST -- before any statement below ran (runbook step 6).
-- =================================================================================================
--
--   select * from public.capture_migration_down('5b973a33-2375-465e-8edd-142bc94e98de',
--     'agt434_agent_skill_pins', '[{"kind":"table","identity":"public.agent_skill_pins"}]'::jsonb);
--   -- returned, live this cycle: (agt434_agent_skill_pins, auto-downable, 1 captured, 0 refusals,
--   --                            'drop table if exists public.agent_skill_pins;')
--
-- The table did not exist yet -- asserted live this cycle, information_schema.tables held 0 rows
-- for it -- so capture_migration_down() took its not-yet-there branch for kind 'table' and the
-- derived down is the one DROP. A `refused` classification would mean the table already exists and
-- this migration must not run at all: the refusal branch for an existing table is deliberate, since
-- a lossless down for an in-place alteration is not derivable from the object's current state.
-- THE DOWN DOES NOT UNDO THE DECISION. Dropping the table removes the 11 pins; the 11 before-images
-- and the decision row stay, and `agent_skill_pins` is NOT in reverse_decision()'s k_allowed (the
-- ruling leaves that out of this build) -- so a Reverse of THIS decision today reports the 11 as
-- `refused` and the captured DROP is the undo. That is stated here rather than implied by the
-- capture's count of 1.
--
-- =================================================================================================
-- WHAT WAS READ LIVE THIS CYCLE, BEFORE WRITING A BYTE OF THIS FILE (no value below is recalled)
-- =================================================================================================
--
--   skill_profiles 'deepbench-north-star': md5(method) bf8ea1d7697b17c2ea189b2ea64241ea,
--     updated_at NULL -- unchanged since the ticket was filed.
--   capability_skill_profiles for it: 49 rows (the ticket says 48; the 49th is `rule-cap-case`,
--     linked 2026-10-09 by AGT-449's migration -- the ticket's own cost happened again while it
--     waited). By agent, through agent_capability_assignments (tenant global): jerry 12, nathan 11,
--     auditor 8, devmanager 6, victoria 4, designer 2, prioritizer 2, builder 1, researcher 1,
--     ticketowner 1, verifier 1 = 49. susan 0 -- she is NOT pinned (pattern:90, the directive's
--     own list).
--   BEFORE-MEASUREMENT through the real assemblePrompt(), credentialed, this cycle: jerry
--     agent-wide renders `knowledge-deepbench-north-star` 12 times, designer agent-wide 2,
--     designer + design-kickoff 1, susan 0. Those four numbers are the left-hand side of the
--     two-direction assertion this ticket owes.
--   runner_decisions 5b4f3dd2-d072-434f-bef4-edfc7494812e: kind agent-row, status open,
--     expires_at 2026-10-12T06:17:47Z; 49 runner_before_images under it, ALL row_data NULL -- 48
--     capability_skill_profiles + 1 skill_profiles (the north star row itself).
--   public.ladder_work_class('P6 - Agent Enhancement') -> NULL. P6 carries NO ladder grant, which
--     is why this build's 6 files / 8 tasks are a WAIVER (decision fb1c4198) and not ladder room.
--   pg_default_acl, objtype 'r': anon=rm/postgres, authenticated=rm/postgres -- a NEW table is
--     publicly SELECTable (and MAINTAINable) the moment it is created. SELECT fails OPEN
--     (.claude/rules/supabase-column-grants.md, SES-78a addendum; MAINTAIN is DAT-20's latent 'm').
--   The sibling tables the Personnel page reads with the anon key hold exactly anon/authenticated
--     SELECT, so that is what this table holds -- and REVOKE ALL first is what makes it exactly
--     that, dropping the auto-granted MAINTAIN as well. No public write of any kind (DAT-18).
--
-- =================================================================================================
-- THE DANGEROUS PART, AND WHY THIS FILE IS SHAPED THE WAY IT IS
-- =================================================================================================
--
-- Decision 5b4f3dd2 images 49 INSERTs, and the 49th is the north star row ITSELF. reverse_decision()
-- restores an INSERT image by deleting the row by primary key and has no table filter, so a bare
-- reversal of that decision would destroy the north star -- directly against John's "Do not change
-- the text of the north star row". Nothing in the function stops it. What stops it is the FK below:
-- the 11 pins exist BEFORE any such reversal runs, `skill_profile_slug references
-- skill_profiles(slug)` with NO cascade, so Postgres refuses that one removal with 23503, the
-- function counts it `refused`, and the row stays (pattern:19: gate the dangerous operation through
-- an atomic correct path instead of hard-blocking it). THIS BUILD NEVER REVERSES 5b4f3dd2 -- Part 2
-- removes the 49 links over PostgREST under its own decision, with full-row before-images, so the
-- undo of the removal is a restore of real rows rather than a reversal that would reach the Skill
-- row too.
--
-- THE FK IS PROVEN FROM THE CATALOG, NOT BY A PROBE (two corrections the ruling named, both carried
-- here). The v7.0.829 draft's GATE arm 6 removed the 48 links and then attempted the Skill row
-- inside a sub-block to make the refusal name `agent_skill_pins`, rolling both back; that is
-- precisely what hung `apply_migration` twice on 2026-10-09 (AGT-465). An actual row-removal or
-- object-removal statement crossing the Supabase MCP connector hangs it at exactly 60 seconds --
-- this chain measured that four times on 2026-10-11 -- and no unindexed FK on a ~370-row table
-- explains 60 seconds. Arm 5 below reads `pg_constraint.confdeltype` and requires 'a' (NO ACTION):
-- that is the complete proof that the constraint will refuse the removal of a referenced row, a
-- catalog fact rather than a behaviour to be exercised. Arm 6's probe and arm 7's rollback re-read
-- are gone with it, and so are the draft's `has_table_privilege(..., ...)` write-probe lines, so
-- the applied text below carries no such token at all. Whoever rules AGT-465 should amend its
-- stated cause from "an unindexed FK" to "the connector holds the statement".
--
-- =================================================================================================
-- THE MIGRATION, BYTE-IDENTICAL TO WHAT WAS APPLIED
-- =================================================================================================

-- DeepBench v7.0.850 | migration agt434_agent_skill_pins | AGT-434 Part 1 of 2
-- A Skill every call of an agent must carry is pinned ONCE at agent level. Creates
-- public.agent_skill_pins, sets its public grant set deliberately (SELECT only -- a new table is
-- auto-granted SELECT+MAINTAIN to anon/authenticated by pg_default_acl, so the grant is REVOKEd and
-- re-granted, never left as created), and pins `deepbench-north-star` to the directive's 11 agents
-- under one recorded decision with one before-image per pin. Rolls back unless the trailing GATE
-- passes. DOWN captured first (auto-downable, drop table). Directive 3c1cc23d.
-- Kickoff: docs/kickoffs/v7.0.850-AGT-434-agent-skill-pins.md.

-- (a) THE TABLE. `skill_profile_slug references public.skill_profiles(slug)` with NO `on delete
--     cascade`, and that is the whole safety design of this ticket, not a style choice: decision
--     5b4f3dd2 carries 49 INSERT before-images -- 48 capability links AND the north star
--     skill_profiles row itself -- and public.reverse_decision() removes an INSERT-imaged row by
--     primary key with no table filter. The 11 pins below exist BEFORE any such reversal runs, so
--     this FK is what REFUSES (23503) the one removal that would destroy the north star's text.
--     An `on delete cascade` here would take the pins out and let the row go (pattern:10/19 -- a
--     structural guard, not an instruction).
create table public.agent_skill_pins (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'global',
  agent_id text not null references public.agents(id),
  skill_profile_slug text not null references public.skill_profiles(slug),
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, agent_id, skill_profile_slug)
);

-- (b) THE PUBLIC GRANT SET, stated rather than inherited. Measured live this cycle:
--     pg_default_acl for tables carries `anon=rm/postgres,authenticated=rm/postgres`, so a new table
--     comes up PUBLICLY READABLE (SELECT) and MAINTAINable before any grant is written -- SELECT
--     fails OPEN for a new table (.claude/rules/supabase-column-grants.md, SES-78a addendum; the
--     latent MAINTAIN is DAT-20). The sibling tables the Personnel page reads with the anon key
--     hold exactly anon/authenticated SELECT, so that is what this table holds -- and REVOKE ALL
--     first is what makes it exactly that, dropping the auto-granted MAINTAIN as well. No public
--     write of any kind (DAT-18).
revoke all on public.agent_skill_pins from anon, authenticated;
grant select on public.agent_skill_pins to anon, authenticated;

-- (c) THE DECISION AND THE 11 PINS, one DO block, one transaction, image before write.
--     ladder_work_class('P6 - Agent Enhancement') evaluates to NULL -- read live this cycle: the
--     function maps P2/P5/P7/P8/P9/P10 and returns NULL for everything else, so P6 carries NO
--     ladder grant. It is passed as the function call the kickoff names rather than as a literal
--     NULL so the class, not a guess about it, is what decides; record_decision() accepts a NULL
--     work class (its own default) and sweep/demote simply have no rung to move.
do $pins$
declare
  k_cycle   constant uuid := '5b973a33-2375-465e-8edd-142bc94e98de';
  k_ns      constant text := 'deepbench-north-star';
  k_agents  constant text[] := array[
    'jerry','nathan','victoria','devmanager','auditor','designer',
    'builder','prioritizer','verifier','researcher','ticketowner'];
  v_dec     uuid;
  v_agent   text;
  v_id      uuid;
begin
  v_dec := public.record_decision(
    k_cycle, null, 'agent-row', 'AGT-434',
    'AGT-434 Part 1: the north star Skill is pinned once per agent (agent_skill_pins, 11 rows) instead of being linked to every one of those agents'' capabilities',
    'John''s directive 3c1cc23d: "it should only be pinned once to each agent and they know it intametly". Measured live 2026-10-11: skill_profiles deepbench-north-star held 49 capability_skill_profiles links at display_order 0 across the 11 agents below (jerry 12, nathan 11, auditor 8, devmanager 6, victoria 4, designer 2, prioritizer 2, builder 1, researcher 1, ticketowner 1, verifier 1 = 49; susan 0), and api/prompt/db-assembly.js''s agent-wide path pushes every assigned capability''s links with no slug check, so the same Skill rendered as 12 sections for Jerry and 11 for Nathan -- 12 / 2 / 1 / 0 measured this cycle through the real assemblePrompt() for jerry agent-wide, designer agent-wide, designer+design-kickoff and susan. An agent-level pin is the narrowest mechanism that eliminates the duplication rather than bounding it (pattern:1, pattern:8), extends the Skill structure buildSections() already renders instead of standing up a parallel store (pattern:17), and keeps one edit of the row reaching every pinned agent on the next call. The FK to skill_profiles(slug) with no cascade is also the structural guard that stops a reversal of decision 5b4f3dd2 -- which images the north star row itself as an INSERT -- from removing that row by pk (pattern:19); this build never reverses that decision, and Part 2 removes the 49 links under their own decision with full-row images instead. 11 agents exactly, Susan excluded, as the directive names them (pattern:90).',
    public.ladder_work_class('P6 - Agent Enhancement'));

  foreach v_agent in array k_agents loop
    -- The uuid is minted HERE so the image can name it: pk_value is the uuid, never a text key
    -- (pattern:169), and row_data NULL is the SES-89 INSERT convention -- "this row does not exist
    -- right now", whose undo is a removal by primary key. agent_skill_pins is NOT in
    -- reverse_decision()'s k_allowed (the ruling keeps that out of this build), so until then these
    -- 11 images are a promise the captured migration down keeps, and a Reverse of THIS decision
    -- would report them `refused` rather than silently doing nothing.
    v_id := gen_random_uuid();

    insert into public.runner_before_images
      (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    values
      (k_cycle, null, 'agent_skill_pins', v_id::text, null, v_dec);

    insert into public.agent_skill_pins (id, tenant_id, agent_id, skill_profile_slug, display_order)
    values (v_id, 'global', v_agent, k_ns, 0);
  end loop;

  raise notice 'AGT-434: decision %, 11 pins of % imaged and inserted', v_dec, k_ns;
end
$pins$;

-- GATE. Every arm must hold or this DO raises and the whole migration -- table, grants, decision,
-- images and pins -- rolls back. The success flag of a migration is never the evidence
-- (.claude/rules/supabase-column-grants.md). READS ONLY: no arm of this gate writes or removes a
-- row, which is both the AGT-465 correction and the reason the apply finishes in a second.
do $gate$
declare
  k_ns     constant text := 'deepbench-north-star';
  k_md5    constant text := 'bf8ea1d7697b17c2ea189b2ea64241ea';
  v_rows   int;
  v_agents int;
  v_alien  int;
  v_grants int;
  v_sel    int;
  v_acl    text;
  v_md5    text;
  v_links  int;
  v_cascade "char";
begin
  -- 1. ELEVEN PINS, ELEVEN AGENTS, and not one row outside the system roster.
  select count(*), count(distinct agent_id) into v_rows, v_agents
    from public.agent_skill_pins where skill_profile_slug = k_ns;
  if v_rows <> 11 or v_agents <> 11 then
    raise exception 'AGT-434 GATE: % pin row(s) over % distinct agent(s) (expected 11 and 11)', v_rows, v_agents;
  end if;
  select count(*) into v_alien
    from public.agent_skill_pins p join public.agents a on a.id = p.agent_id
   where a.agent_origin is distinct from 'system';
  if v_alien <> 0 then
    raise exception 'AGT-434 GATE: % pin(s) name an agent whose agent_origin is not system', v_alien;
  end if;

  -- 2. THE PUBLIC GRANT, BOTH DIRECTIONS. information_schema is asserted because that is the
  --    kickoff's bar, and relacl as well because information_schema.role_table_grants does not
  --    report PG17 MAINTAIN (DAT-20) -- "exactly 2 SELECT rows" there is true of a table that also
  --    carries a latent m. Readable: yes. Anything else: no -- and the complete ACL string is what
  --    says so, with no write probe of any kind.
  select count(*), count(*) filter (where privilege_type = 'SELECT') into v_grants, v_sel
    from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'agent_skill_pins'
     and grantee in ('anon', 'authenticated');
  if v_grants <> 2 or v_sel <> 2 then
    raise exception 'AGT-434 GATE: role_table_grants holds % row(s) for anon/authenticated, % of them SELECT (expected 2 and 2)', v_grants, v_sel;
  end if;
  select coalesce(string_agg(g.grantee::regrole::text || '=' || g.privilege_type, ', ' order by g.grantee::regrole::text, g.privilege_type), '(none)')
    into v_acl
    from pg_class c, aclexplode(c.relacl) g
   where c.oid = 'public.agent_skill_pins'::regclass
     and g.grantee::regrole::text in ('anon', 'authenticated');
  if v_acl <> 'anon=SELECT, authenticated=SELECT' then
    raise exception 'AGT-434 GATE: the complete public ACL reads "%" (expected "anon=SELECT, authenticated=SELECT")', v_acl;
  end if;

  -- 3. THE NORTH STAR IS UNTOUCHED. John: "Do not change the text of the north star row."
  select md5(method) into v_md5 from public.skill_profiles where slug = k_ns;
  if v_md5 is distinct from k_md5 then
    raise exception 'AGT-434 GATE: north star md5(method) reads % (expected %)', coalesce(v_md5, '(no row)'), k_md5;
  end if;

  -- 4. THE INTERIM LINKS ARE STILL ALL 49. This migration removes none of them -- Part 2 does,
  --    after this has applied and been proven, and it must find all 49 to image them.
  select count(*) into v_links from public.capability_skill_profiles where skill_profile_slug = k_ns;
  if v_links <> 49 then
    raise exception 'AGT-434 GATE: % interim capability link(s) (expected 49)', v_links;
  end if;

  -- 5. THE FK IS NO-ACTION, not a cascade -- the catalog fact that IS the proof. 'a' means Postgres
  --    will refuse the removal of a referenced skill_profiles row while a pin names it; a cascade
  --    here would instead take the pins out on the very removal they exist to refuse. Read from
  --    pg_constraint, never exercised: the probe that exercised it is what hung this migration on
  --    2026-10-09 (AGT-465).
  select c.confdeltype into v_cascade
    from pg_constraint c
   where c.conrelid = 'public.agent_skill_pins'::regclass
     and c.confrelid = 'public.skill_profiles'::regclass;
  if v_cascade is distinct from 'a' then
    raise exception 'AGT-434 GATE: the skill_profiles FK on agent_skill_pins has ON DELETE "%" (expected a = NO ACTION)', coalesce(v_cascade::text, '(no constraint)');
  end if;

  raise notice 'AGT-434 GATE: passed -- 11 pins over 11 system agents; public ACL exactly anon/authenticated SELECT; north star md5 %; 49 interim links intact; FK NO ACTION from pg_constraint.', k_md5;
end
$gate$;
