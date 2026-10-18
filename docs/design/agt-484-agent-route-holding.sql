-- DeepBench v7.0.859 | docs/design/agt-484-agent-route-holding.sql | AGT-484, Task 1
-- `agt484_agent_route_holding` -- applied over the Supabase MCP, and this file is the BYTE-IDENTICAL
-- mirror of what was applied (kickoff v7.0.859-AGT-484 §5 task 1), so the SQL has one home a cold
-- session can read without the MCP ledger.
--
-- ORDER IS THE MECHANISM (runner-cycle.md step 6): immediately BEFORE this was applied, the cycle ran
--   select * from public.capture_migration_down(
--     '66164499-8ae5-44f4-a890-d73cf3418495', 'agt484_agent_route_holding',
--     '[{"kind":"table","identity":"public.finding_routes"}]'::jsonb);
-- returning `refused` / 0 captured / 1 refusal / down_sql NULL -- the same class AGT-161's D1 recorded
-- for this table and for the same reason: an in-place UPDATE of an EXISTING row is not losslessly
-- derivable from the table's current state, so the row is CARD-ONLY and the down on the card is
--   update public.finding_routes set project_slug = NULL where precedence = 30 and source = 'agent';
-- Stated rather than hidden -- a red range holding this migration is not auto-rollbackable, and a
-- hand-authored down_sql would be the "authored from memory" the design forbids.
--
-- WHY THE EXISTING ROW CARRIES THE ROUTE, and not a second row per agent. scripts/market-agent.js:332
-- files `foundBy: 'agent:<slug>'` and finding_group_epic(jsonb) keys on
-- split_part(a.found_by, ':', 1), so `agent:jerry` (7 rows) and `agent:nathan` (19) both resolve to
-- the ONE `agent` row -- a `jerry`/`nathan` row is a row the resolver could never match. The row's
-- project_slug was NULL (AGT-161, the staff-watch shape: the manager picks), and that pick is exactly
-- what put AGT-469 into the PAUSED `agent-training` project on 2026-10-11. John's call
-- (JOHN-0925-DESIGNER-DECIDES, reversible, decision ccab94da): agent-sourced findings land on a
-- holding list -- `dev-mgr-findings`, planned, one unlocked epic -- and only Victoria promotes them
-- (AGT-480). Routing is data (§19b), so this is a one-row UPDATE and no code moves:
-- scripts/audit-review.js:481 wants a pick only for a NULL route, and step 3a returns before reading
-- one.

update public.finding_routes
   set project_slug = 'dev-mgr-findings',
       note = 'AGT-484 (John 2026-10-13, VICTORIA-FILL-REQUIREMENTS-1013 d.25/34): found_by agent:<slug> (scripts/market-agent.js: Jerry, Nathan) files under the capture list; only Victoria promotes (AGT-480). Was NULL (AGT-161).'
 where precedence = 30 and source = 'agent' and project_slug is null;

-- The trailing assertion runs in THIS transaction, so a red arm aborts the UPDATE rather than leaving
-- a half-routed table live. Every statement below READS ONLY -- finding_group_epic() on a root-cause
-- group either RAISEs or returns the epic it resolved, so no fixture row is needed and none is
-- written. The three calls are the discriminating set: the route must now answer WITHOUT a pick (it
-- could not before), and must answer with the SAME epic when a pick is supplied -- including
-- `agent-training`, the paused project the NULL route sent AGT-469 to, which is the regression this
-- migration exists to stop.
do $$
declare
  v_total   int;
  v_agent   int;
  v_catch   int;
  v_fid     uuid;
  v_epic    uuid;
  v_got     uuid;
begin
  select count(*) into v_total from public.finding_routes;
  if v_total <> 11 then
    raise exception 'AGT-484: finding_routes holds % rows, expected 11', v_total;
  end if;

  select count(*) into v_agent from public.finding_routes
   where source = 'agent' and project_slug = 'dev-mgr-findings';
  if v_agent <> 1 then
    raise exception 'AGT-484: % finding_routes rows carry source=agent routed to dev-mgr-findings, expected exactly 1', v_agent;
  end if;

  -- Never widen into a catch-all: a (*, *) row would route every unmapped source here silently.
  select count(*) into v_catch from public.finding_routes
   where source = '*' and finding_type = '*';
  if v_catch <> 0 then
    raise exception 'AGT-484: % (*,*) catch-all finding_routes rows exist, expected 0', v_catch;
  end if;

  select id into v_fid from public.audit_findings
   where found_by = 'agent:jerry' order by created_at desc limit 1;
  if v_fid is null then
    raise exception 'AGT-484: no audit_findings row with found_by=agent:jerry -- the premise this migration routes is gone';
  end if;

  select e.id into v_epic from public.epics e
    join public.projects p on p.id = e.project_id
   where p.slug = 'dev-mgr-findings';
  if v_epic is null then
    raise exception 'AGT-484: dev-mgr-findings has no single epic to hold the findings';
  end if;

  -- (i) No pick at all. This RAISEd `needs project` (P0001) before the UPDATE; it must now resolve.
  select public.finding_group_epic(jsonb_build_object(
           'kind', 'root-cause',
           'finding_ids', jsonb_build_array(v_fid::text))) into v_got;
  if v_got is distinct from v_epic then
    raise exception 'AGT-484: an unpicked agent group resolved to %, expected the holding epic %', v_got, v_epic;
  end if;

  -- (ii) The manager picks `agent-training` -- the paused project AGT-469 landed in. The route wins.
  select public.finding_group_epic(jsonb_build_object(
           'kind', 'root-cause', 'project', 'agent-training',
           'finding_ids', jsonb_build_array(v_fid::text))) into v_got;
  if v_got is distinct from v_epic then
    raise exception 'AGT-484: pick agent-training resolved to %, expected the holding epic %', v_got, v_epic;
  end if;

  -- (iii) And any other pick reaches the same holding epic -- the route, not the picker, decides.
  select public.finding_group_epic(jsonb_build_object(
           'kind', 'root-cause', 'project', 'go-to-market',
           'finding_ids', jsonb_build_array(v_fid::text))) into v_got;
  if v_got is distinct from v_epic then
    raise exception 'AGT-484: pick go-to-market resolved to %, expected the holding epic %', v_got, v_epic;
  end if;
end $$;
