-- DeepBench v7.0.683 | docs/design/agt-155-market-leads.sql | AGT-155 -- the competitor leads inbox.
--
-- WHAT THIS IS. public.market_leads is the ONE table both lanes may touch, and each touches it in
-- one direction only: the personal lane INSERTs a lead built by code from a job the answer marked
-- competitor === true (scripts/personal-agent.js leadsFromAnswer), and the product lane PATCHes the
-- three review columns (status, reviewer_note, reviewed_at) from lead_reviews[]
-- (scripts/market-agent.js). Neither lane reads the other's records.
--
-- PUBLIC FACTS ONLY, BY CONSTRUCTION. The row carries the company, what they sell (nullable until
-- AGT-154's intent schema gains that property), the overlap reason, the public job URL, the date
-- seen and the capability slug that filed it. It never carries a job id, a title, a fit, a verdict
-- or an act call -- leadsFromAnswer copies four named fields and nothing else.
--
-- source_capability HOLDS A CAPABILITY SLUG (data), NEVER an agents.id (§19e Rule #1, pattern:13):
-- no column here names an agent.
--
-- GRANTS (.claude/rules/supabase-column-grants.md). A new table's SELECT is NOT closed by default in
-- this project -- pg_default_acl grants anon/authenticated SELECT by name the instant the table is
-- created (SES-78a, found live) -- so the REVOKE below is mandatory, not belt-and-braces. The
-- trailing DO block asserts BOTH directions and raises on either, because a migration's success flag
-- is not evidence the grant landed. Shape copied from career_records / market_records, measured
-- 2026-09-28: relacl {postgres, service_role}, RLS off, 0 role_table_grants rows for the public roles.

create table public.market_leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  what_they_sell text,
  overlap_with_deepbench text not null,
  public_url text not null,
  seen_on date not null default current_date,
  source_capability text not null,
  status text not null default 'new' check (status in ('new','confirmed','rejected')),
  reviewer_note text,
  reviewed_at timestamptz,
  session_name text,
  created_at timestamptz not null default now()
);

revoke all on public.market_leads from public, anon, authenticated;
grant select, insert, update, delete on public.market_leads to service_role;

do $$
declare public_rows int;
begin
  if has_table_privilege('anon', 'public.market_leads', 'SELECT') then
    raise exception 'market_leads: anon still holds SELECT -- the revoke did not land';
  end if;
  if has_table_privilege('authenticated', 'public.market_leads', 'SELECT') then
    raise exception 'market_leads: authenticated still holds SELECT -- the revoke did not land';
  end if;
  if not has_table_privilege('service_role', 'public.market_leads', 'INSERT') then
    raise exception 'market_leads: service_role cannot INSERT -- the grant did not land';
  end if;
  select count(*) into public_rows
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'market_leads'
    and grantee in ('anon', 'authenticated', 'PUBLIC');
  if public_rows <> 0 then
    raise exception 'market_leads: % role_table_grants rows for the public roles, expected 0', public_rows;
  end if;
end $$;
