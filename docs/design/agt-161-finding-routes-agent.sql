-- DeepBench v7.0.681 | docs/design/agt-161-finding-routes-agent.sql | AGT-161, Task 1
-- `agt161_finding_routes_agent` -- applied over the Supabase MCP, and this file is the BYTE-IDENTICAL
-- mirror of what was applied (kickoff v7.0.681-AGT-161 §5 task 1), so the SQL has one home a cold
-- session can read without the MCP ledger.
--
-- ORDER IS THE MECHANISM (runner-cycle.md step 6): immediately BEFORE this was applied, the cycle ran
--   select * from public.capture_migration_down(
--     'c4db2bf9-969a-441c-91e7-5a6f8e3a9f2e', 'agt161_finding_routes_agent',
--     '[{"kind":"table","identity":"public.finding_routes"}]'::jsonb);
-- returning `refused` / 0 captured / 1 refusal / down_sql NULL. DEVIATION D1, recorded here because
-- the next reader will compare this against the kickoff: the kickoff's own SQL passes `'[]'::jsonb`,
-- which capture_migration_down() REFUSES outright ('p_objects must be a non-empty JSON array of
-- {kind, identity}', P0001, line 29) -- nothing would have been captured at all. Naming the one
-- object the up touches is the form the AGT-184 re-land used for exactly this shape, and it reaches
-- the same honest class: a DML insert into an EXISTING table is an in-place alteration whose lossless
-- down is not derivable from the table's current state, so the row is CARD-ONLY and the down on the
-- card is
--   delete from public.finding_routes where source = 'agent';
-- Stated rather than hidden -- a red range holding this migration is not auto-rollbackable, and a
-- hand-authored down_sql would be the "authored from memory" the design forbids.
--
-- WHY THE ROW IS NEEDED AT ALL. finding_group_epic() RAISEs on any group holding a finding whose
-- source has no finding_routes row, which STOPS the whole Development Manager review -- so the
-- moment scripts/market-agent.js files a proposal as `found_by 'agent:<agents.id>'`, an unmapped
-- `agent` source would make every group containing one unreviewable. precedence 30 / project_slug
-- NULL is the staff-watch shape: the manager picks the project explicitly, and creating one is
-- John's, never this platform's guess.

insert into public.finding_routes (precedence, source, finding_type, project_slug, note)
values (30, 'agent', '*', NULL, 'AGT-161: found_by agent:<agents.id> — the product and personal lanes'' scripts and the Builder. NULL: the manager picks, as for staff-watch.');

-- The trailing assertion runs in THIS transaction, so a red arm aborts the insert rather than leaving
-- a half-routed table live. The routing proof needs a finding to route, and audit_findings is
-- append-only (no DELETE, ever) -- so the fixture lives in a subtransaction that is rolled back BY
-- CONSTRUCTION by its own `RAISE 'AGT161_OK'`, and the count is re-read on both sides to prove it.
do $$
declare
  v_total  int;
  v_agent  int;
  v_before bigint;
  v_after  bigint;
  v_fid    uuid;
  v_epic   uuid;
  v_err    text;
  v_raised boolean;
begin
  select count(*) into v_total from public.finding_routes;
  if v_total <> 8 then
    raise exception 'AGT-161: finding_routes holds % rows, expected 8', v_total;
  end if;

  select count(*) into v_agent from public.finding_routes where source = 'agent';
  if v_agent <> 1 then
    raise exception 'AGT-161: % finding_routes rows carry source=agent, expected exactly 1', v_agent;
  end if;

  select count(*) into v_before from public.audit_findings;

  begin
    insert into public.audit_findings (
      fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution,
      found_by, finding_type)
    values (
      'agt161qa00000000', '2000-W01', 'other',
      '[{"location": "market_records:qa-agt161", "text": "AGT-161 routing fixture"}]'::jsonb,
      'AGT-161 routing fixture -- this row is rolled back before the migration commits',
      'high', 'nothing: the fixture never commits', 'agent:qa-agt161', 'proposal')
    returning id into v_fid;

    -- (i) The manager's explicit `general` pick reaches NULL (the general backlog, no epic) rather
    --     than the unmapped-source RAISE that is this migration's whole subject.
    select public.finding_group_epic(jsonb_build_object(
             'kind', 'root-cause', 'project', 'general',
             'finding_ids', jsonb_build_array(v_fid::text))) into v_epic;
    if v_epic is not null then
      raise exception 'AGT-161: the general pick returned epic %, expected NULL', v_epic;
    end if;

    -- (ii) And the NULL project_slug still DEMANDS a pick: a project-less group is refused, and the
    --      refusal names `agent` as the source it could not place. Both directions, never one
    --      (.claude/rules/supabase-column-grants.md's assert-both-ways rule, applied to a RAISE).
    v_raised := false;
    begin
      perform public.finding_group_epic(jsonb_build_object(
                'kind', 'root-cause', 'finding_ids', jsonb_build_array(v_fid::text)));
    exception when others then
      v_raised := true;
      v_err := SQLERRM;
    end;
    if not v_raised then
      raise exception 'AGT-161: a project-less agent group was ACCEPTED; expected a refusal';
    end if;
    if v_err !~ 'needs project' then
      raise exception 'AGT-161: the refusal did not say needs project: %', v_err;
    end if;
    if v_err !~ 'agent' then
      raise exception 'AGT-161: the refusal did not name the agent source: %', v_err;
    end if;

    raise exception 'AGT161_OK';
  exception when others then
    if SQLERRM <> 'AGT161_OK' then raise; end if;
  end;

  select count(*) into v_after from public.audit_findings;
  if v_after <> v_before then
    raise exception 'AGT-161: audit_findings moved from % to % -- the fixture did not roll back', v_before, v_after;
  end if;
end $$;
