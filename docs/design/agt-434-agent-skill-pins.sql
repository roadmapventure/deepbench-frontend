-- AGT-434 (v7.0.829), slice 1 of 2 -- THE NORTH STAR IS PINNED ONCE PER AGENT. John's directive
-- 3c1cc23d: "it should only be pinned once to each agent and they know it intametly". The Skill row
-- `deepbench-north-star` was reaching its 11 agents as 48 `capability_skill_profiles` links -- one per
-- capability -- and api/prompt/db-assembly.js's agent-wide path pushes every assigned capability's
-- links with no slug check, so the SAME knowledge rendered as 12 sections in Jerry's prompt and 11 in
-- Nathan's (measured live 2026-10-09). This slice creates `public.agent_skill_pins`, pins the row to
-- the 11 agents once each, and the assembler reads the pin after the signature snapshot. Slice 2 is
-- the Dev Manager's: reverse_decision()'s k_allowed + reversible_tables() gain the table,
-- agent-bundle.js and PersonnelScreen.jsx list a pinned Skill (SS19w), and the SS19b sentence.
--
-- MIRROR of the migration `agt434_agent_skill_pins`, applied via mcp Supabase `apply_migration`
-- (which wraps the whole file in ONE transaction, so no BEGIN/COMMIT here -- and so the trailing
-- GATE's RAISE rolls every statement below back). Kickoff:
-- docs/kickoffs/v7.0.829-AGT-434-agent-skill-pins.md; reasoning: docs/harvests/AGT-434.md.
--
-- =================================================================================================
-- THE DOWN, CAPTURED FIRST -- before any statement below ran (runbook step 6).
-- =================================================================================================
--
--   select * from public.capture_migration_down('b36e7a5a-5e30-4ad6-a213-6bed11822a34',
--     'agt434_agent_skill_pins', '[{"kind":"table","identity":"public.agent_skill_pins"}]'::jsonb);
--   -- expect (agt434_agent_skill_pins, auto-downable, 1 captured, 0 refusals,
--   --         'drop table if exists public.agent_skill_pins;')
--
-- The table does not exist yet -- asserted live this cycle, information_schema.tables holds 0 rows
-- for it -- so capture_migration_down() takes its not-yet-there branch for kind 'table' and the
-- derived down is the one DROP. A `refused` classification would mean the table already exists and
-- this migration must not run at all: the refusal branch for an existing table is deliberate, since
-- a lossless down for an in-place alteration is not derivable from the object's current state.
-- THE DOWN DOES NOT UNDO THE DECISION. Dropping the table removes the 11 pins; the 11 before-images
-- and the decision row stay, and `agent_skill_pins` is NOT in reverse_decision()'s k_allowed until
-- slice 2 -- so a Reverse of THIS decision today reports the 11 as `refused` and the DROP is the
-- undo. That is stated here rather than implied by the capture's count of 1.
--
-- =================================================================================================
-- WHAT WAS READ LIVE THIS CYCLE, BEFORE WRITING A BYTE OF THIS FILE (no value below is recalled)
-- =================================================================================================
--
--   skill_profiles 'deepbench-north-star': id 8fcbb3fa-baab-4d67-b9f1-b5bde0e1cd8a, type knowledge,
--     md5(method) bf8ea1d7697b17c2ea189b2ea64241ea (2540 chars), md5(objective)
--     091d1c65cb5b5c7c941ac78f7040cf8e, updated_at NULL.
--   capability_skill_profiles for it: 48 rows, every one display_order 0; by agent, through
--     agent_capability_assignments (tenant global): jerry 12, nathan 11, auditor 8, devmanager 5,
--     victoria 4, designer 2, prioritizer 2, builder 1, researcher 1, ticketowner 1, verifier 1 = 48.
--     susan 0 -- she is NOT pinned (pattern:90, the directive's own list).
--   runner_decisions 5b4f3dd2-d072-434f-bef4-edfc7494812e: kind agent-row, session
--     victoria-calibration-1008, status open, ladder_work_class NULL, decided_at 2026-10-09T06:17:47Z;
--     49 runner_before_images under it, ALL row_data NULL -- 48 capability_skill_profiles + 1
--     skill_profiles (the north star row itself).
--   public.reverse_decision(uuid, text, text, uuid), read with pg_get_functiondef: walks one image
--     per row, newest-first, and for row_data NULL executes `delete ... where <pk> = ...`. NO table
--     filter. Both skill_profiles and capability_skill_profiles are on its k_allowed list. Each row
--     runs in its own sub-block, so a schema refusal counts `refused` and the loop continues.
--   public.reversible_tables(): 17 names, `agent_skill_pins` not among them (slice 2).
--   public.ladder_work_class('P6 - Agent Enhancement') -> NULL. The function maps P2 invention,
--     P5 enhancement, P7 agent_creation, P8 determinism_removal, P9 bug_fix, P10 tooling and returns
--     NULL for anything else. P6 therefore carries NO ladder grant -- which is also why this slice's
--     3-file / 4-task cap has no ladder room to borrow: a fourth file would be a breach, not a fix.
--   pg_default_acl, objtype 'r': anon=rm/postgres, authenticated=rm/postgres -- a NEW table is
--     publicly SELECTable (and MAINTAINable) the moment it is created. SELECT fails OPEN
--     (.claude/rules/supabase-column-grants.md, SES-78a addendum; MAINTAIN is DAT-20's latent 'm').
--   The four sibling tables the Personnel page reads with the anon key (skill_profiles,
--     capability_skill_profiles, agent_capability_assignments, knowledge_entries) hold exactly
--     anon/authenticated SELECT in information_schema.role_table_grants -- and MAINTAIN as well in
--     pg_class.relacl. This table's REVOKE ALL drops that MAINTAIN too, so its public surface is
--     SELECT and nothing else: deliberately one notch tighter than its siblings, in the fail-closed
--     direction, and the GATE asserts the complete ACL rather than only the information_schema view.
--   Only ONE foreign key referenced skill_profiles before this migration
--     (capability_skill_profiles_skill_profile_slug_fkey, ON DELETE NO ACTION); skill_profiles has no
--     triggers and RLS disabled. runner_before_images' only trigger (before_image_key_is_pk) branches
--     on table_name = 'backlog_items' and does not touch these images.
--
-- =================================================================================================
-- THE DANGEROUS PART, AND WHY THIS FILE IS SHAPED THE WAY IT IS
-- =================================================================================================
--
-- Decision 5b4f3dd2 images 49 INSERTs, and the 49th is the north star row ITSELF. reverse_decision()
-- deletes an INSERT-imaged row by primary key and has no table filter, so a bare reversal of that
-- decision would DELETE the north star -- directly against John's "Do not change the text of the
-- north star row". Nothing in the function stops it. What stops it is the FK below: 11 pins exist
-- BEFORE the reversal runs, `skill_profile_slug references skill_profiles(slug)` with NO cascade, so
-- Postgres refuses that one delete with 23503, the function counts it `refused`, and the row stays.
-- The expected reversal result is therefore `applied, restored 0, restored_unverified 48, refused 1`
-- -- the refusal is the north star surviving and is a SUCCESS, not an error (pattern:19: gate the
-- dangerous operation through an atomic correct path instead of hard-blocking it).
-- GATE arm 6 proves this rather than arguing it: it deletes the 48 links and then the row INSIDE a
-- sub-block, requires the refusal to name `agent_skill_pins`, and rolls both deletes back (arm 7
-- re-reads the 48 links and the md5 to prove the rollback). With the 48 links still present the
-- delete is refused by the LINKS, which would prove nothing about this ticket -- so the probe removes
-- them first, in the only place where doing so is free.
--
-- =================================================================================================
-- THE MIGRATION, BYTE-IDENTICAL TO WHAT WAS APPLIED
-- =================================================================================================

-- DeepBench v7.0.829 | migration agt434_agent_skill_pins | AGT-434 slice 1 of 2
-- A Skill every call of an agent must carry is pinned ONCE at agent level. Creates
-- public.agent_skill_pins, sets its public grant set deliberately (SELECT only -- a new table is
-- auto-granted SELECT+MAINTAIN to anon/authenticated by pg_default_acl, so the grant is REVOKEd and
-- re-granted, never left as created), and pins `deepbench-north-star` to the directive's 11 agents
-- under one recorded decision with one before-image per pin. Rolls back unless the trailing GATE
-- passes. DOWN captured first (/tmp/agt434-down.sql -- drop table, auto-downable).
-- Directive 3c1cc23d. Kickoff: docs/kickoffs/v7.0.829-AGT-434-agent-skill-pins.md.

-- (a) THE TABLE. `skill_profile_slug references public.skill_profiles(slug)` with NO `on delete
--     cascade`, and that is the whole safety design of this ticket, not a style choice: decision
--     5b4f3dd2 carries 49 INSERT before-images -- the 48 capability links AND the north star
--     skill_profiles row itself -- and public.reverse_decision() deletes an INSERT-imaged row by
--     primary key with no table filter. The 11 pins below are inserted BEFORE that reversal runs, so
--     this FK is what REFUSES (23503) the one delete that would destroy the north star's text.
--     An `on delete cascade` here would delete the pins and let the row go (pattern:10/19 -- a
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
--     latent MAINTAIN is DAT-20). The four sibling tables the Personnel page reads with the anon key
--     hold exactly anon/authenticated SELECT, so that is what this table holds -- and REVOKE ALL
--     first is what makes it exactly that, dropping the auto-granted MAINTAIN as well. No public
--     write of any kind (DAT-18).
revoke all on public.agent_skill_pins from anon, authenticated;
grant select on public.agent_skill_pins to anon, authenticated;

-- (c) THE DECISION AND THE 11 PINS, one DO block, one transaction, image before write.
--     ladder_work_class('P6 - Agent Enhancement') evaluates to NULL -- read live this cycle from
--     pg_get_functiondef: the function maps P2/P5/P7/P8/P9/P10 and returns NULL for everything else,
--     so P6 carries NO ladder grant. It is passed as the function call the kickoff names rather than
--     as a literal NULL so the class, not a guess about it, is what decides; record_decision()
--     accepts a NULL work class (its own default) and sweep/demote simply have no rung to move.
do $pins$
declare
  k_cycle   constant uuid := 'b36e7a5a-5e30-4ad6-a213-6bed11822a34';
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
    'AGT-434 slice 1: the north star Skill is pinned once per agent (agent_skill_pins, 11 rows) instead of being linked to every one of those agents'' capabilities',
    'John''s directive 3c1cc23d: "it should only be pinned once to each agent and they know it intametly". Measured live 2026-10-09: skill_profiles deepbench-north-star held 48 capability_skill_profiles links at display_order 0 across the 11 agents below (jerry 12, nathan 11, auditor 8, devmanager 5, victoria 4, designer 2, prioritizer 2, builder 1, researcher 1, ticketowner 1, verifier 1 = 48; susan 0), and api/prompt/db-assembly.js''s agent-wide path pushes every assigned capability''s links with no slug check, so the same Skill rendered as 12 sections for Jerry and 11 for Nathan. An agent-level pin is the narrowest mechanism that eliminates the duplication rather than bounding it (pattern:1, pattern:8), extends the Skill structure buildSections() already renders instead of standing up a parallel store (pattern:17), and keeps one edit of the row reaching every pinned agent on the next call. The FK to skill_profiles(slug) with no cascade is also the atomic correct path that lets decision 5b4f3dd2 be reversed WITHOUT deleting the north star row reverse_decision() would otherwise delete by pk (pattern:19). 11 agents exactly, Susan excluded, as the directive names them (pattern:90).',
    public.ladder_work_class('P6 - Agent Enhancement'));

  foreach v_agent in array k_agents loop
    -- The uuid is minted HERE so the image can name it: pk_value is the uuid, never a text key
    -- (pattern:169), and row_data NULL is the SES-89 INSERT convention -- "this row does not exist
    -- right now", whose undo is a delete by primary key. agent_skill_pins is NOT in
    -- reverse_decision()'s k_allowed yet (slice 2 widens it and public.reversible_tables()), so
    -- until then these 11 images are a promise the captured migration down keeps, and a Reverse of
    -- THIS decision would report them `refused` rather than silently doing nothing.
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
-- (.claude/rules/supabase-column-grants.md).
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
  --    carries a latent m. Readable: yes. Writable or maintainable: no.
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
  if has_table_privilege('anon', 'public.agent_skill_pins', 'INSERT')
     or has_table_privilege('anon', 'public.agent_skill_pins', 'UPDATE')
     or has_table_privilege('anon', 'public.agent_skill_pins', 'DELETE')
     or has_table_privilege('authenticated', 'public.agent_skill_pins', 'INSERT')
     or has_table_privilege('authenticated', 'public.agent_skill_pins', 'UPDATE')
     or has_table_privilege('authenticated', 'public.agent_skill_pins', 'DELETE') then
    raise exception 'AGT-434 GATE: the public key holds a write privilege on agent_skill_pins (DAT-18)';
  end if;
  if not has_table_privilege('anon', 'public.agent_skill_pins', 'SELECT') then
    raise exception 'AGT-434 GATE: anon cannot read agent_skill_pins -- the Personnel page reads it with that key (ARCHITECTURE.md 19w)';
  end if;

  -- 3. THE NORTH STAR IS UNTOUCHED. John: "Do not change the text of the north star row."
  select md5(method) into v_md5 from public.skill_profiles where slug = k_ns;
  if v_md5 is distinct from k_md5 then
    raise exception 'AGT-434 GATE: north star md5(method) reads % (expected %)', coalesce(v_md5, '(no row)'), k_md5;
  end if;

  -- 4. THE INTERIM LINKS ARE STILL ALL 48. This migration removes none of them: the reversal of
  --    decision 5b4f3dd2 does that, after this ship, and it must find all 48 to undo.
  select count(*) into v_links from public.capability_skill_profiles where skill_profile_slug = k_ns;
  if v_links <> 48 then
    raise exception 'AGT-434 GATE: % interim capability link(s) (expected 48)', v_links;
  end if;

  -- 5. THE FK IS NO-ACTION, not a cascade. A cascade here would delete the pins on the very delete
  --    they exist to refuse.
  select c.confdeltype into v_cascade
    from pg_constraint c
   where c.conrelid = 'public.agent_skill_pins'::regclass
     and c.confrelid = 'public.skill_profiles'::regclass;
  if v_cascade is distinct from 'a' then
    raise exception 'AGT-434 GATE: the skill_profiles FK on agent_skill_pins has ON DELETE "%" (expected a = NO ACTION)', coalesce(v_cascade::text, '(no constraint)');
  end if;

  -- 6. THE DISCRIMINATOR -- the pin FK really is what will refuse the reversal's delete, proven
  --    against the case that matters rather than today's. With the 48 links present the delete is
  --    already refused BY THE LINKS, so that proves nothing about this ticket; so the probe deletes
  --    the 48 first, inside this sub-block, and then attempts the row. The refusal must name
  --    agent_skill_pins. The sub-block's implicit savepoint takes BOTH deletes back out with the
  --    exception, so the 48 links and the north star are exactly as they were -- arm 7 re-reads them
  --    to prove it. If the delete SUCCEEDS, P0434 escapes this handler and rolls the migration back:
  --    a migration that cannot show its own guard working does not ship.
  begin
    delete from public.capability_skill_profiles where skill_profile_slug = k_ns;
    delete from public.skill_profiles where slug = k_ns;
    raise exception using errcode = 'P0434',
      message = 'AGT-434 GATE: with the 48 interim links removed, the north star row DELETED without refusal -- the pin FK is not guarding it and a Reverse of 5b4f3dd2 would destroy the row';
  exception when foreign_key_violation then
    if position('agent_skill_pins' in sqlerrm) = 0 then
      raise exception 'AGT-434 GATE: the north star delete was refused, but not by the pin table: %', sqlerrm;
    end if;
  end;

  -- 7. THE PROBE LEFT NOTHING BEHIND. Both rolled-back deletes re-read.
  select count(*) into v_links from public.capability_skill_profiles where skill_profile_slug = k_ns;
  select md5(method) into v_md5 from public.skill_profiles where slug = k_ns;
  if v_links <> 48 or v_md5 is distinct from k_md5 then
    raise exception 'AGT-434 GATE: the probe did not roll back -- % link(s), md5 %', v_links, coalesce(v_md5, '(no row)');
  end if;

  raise notice 'AGT-434 GATE: passed -- 11 pins over 11 system agents; public ACL exactly anon/authenticated SELECT and no write; north star md5 %; 48 interim links intact; FK NO ACTION and proven to refuse the delete by name.', k_md5;
end
$gate$;
