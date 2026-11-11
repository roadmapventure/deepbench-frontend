-- DeepBench v7.0.1001 | docs/design/agt-297-mcp-caller-gate.sql | AGT-297, migration UP (agt297_mcp_caller_gate)
create table public.mcp_caller_gates (
 caller_name text primary key,
 permission text not null default 'trial' check (permission in ('blocked','trial','unlimited')),
 spend_limit_usd numeric not null default 5.00 check (spend_limit_usd >= 0),
 note text, updated_at timestamptz not null default now());
revoke all on public.mcp_caller_gates from public, anon, authenticated;
insert into public.mcp_caller_gates (caller_name, permission, note)
values ('MCP_API_KEY', 'unlimited', 'AGT-297: the platform''s own caller');
create index ai_activity_visitor_id_idx on public.ai_activity_log (visitor_id) where visitor_id is not null;
create function public.mcp_caller_gate(p_key_sha256 text)
returns table(caller_name text, permission text, spend_limit_usd numeric, llm_calls bigint, total_tokens bigint, cost_usd numeric)
language sql stable set search_path = public, pg_catalog as $f$
 select s.name, coalesce(g.permission,'trial'), coalesce(g.spend_limit_usd,5.00), st.n, st.t, st.c
 from public.runner_secrets s
 left join public.mcp_caller_gates g on g.caller_name = s.name
 cross join lateral (
  select count(*)::bigint n, coalesce(sum(i + o + cw + cr),0)::bigint t,
   coalesce(sum((i/1000.0) * p.input_per_1k + (cw/1000.0) * p.input_per_1k * 1.25
    + (cr/1000.0) * p.input_per_1k * 0.10 + (o/1000.0) * p.output_per_1k),0)::numeric c
  from (select model, coalesce(input_tokens,0) i, coalesce(output_tokens,0) o,
    coalesce(cache_creation_input_tokens,0) cw, coalesce(cache_read_input_tokens,0) cr
   from public.ai_activity_log where visitor_id = s.name) l
  join public.model_pricing p on p.model = l.model) st
 where s.name like 'MCP\_%' and s.value <> ''
  and encode(sha256(convert_to(s.value,'UTF8')),'hex') = lower(p_key_sha256)
 order by s.name limit 1;
$f$;
revoke all on function public.mcp_caller_gate(text) from public, anon, authenticated;
grant execute on function public.mcp_caller_gate(text) to service_role;
do $$
declare f text := 'public.mcp_caller_gate(text)';
begin
 if has_function_privilege('anon', f, 'EXECUTE') or has_function_privilege('authenticated', f, 'EXECUTE')
  or not has_function_privilege('service_role', f, 'EXECUTE')
  or not has_table_privilege('service_role', 'public.mcp_caller_gates', 'SELECT')
  or exists (select 1 from information_schema.role_table_grants where table_schema = 'public'
   and table_name = 'mcp_caller_gates' and grantee in ('anon','authenticated'))
  or exists (select 1 from public.mcp_caller_gate(repeat('0', 64)))
  or (select g.permission from public.mcp_caller_gate((select encode(sha256(convert_to(value,'UTF8')),'hex')
   from public.runner_secrets where name = 'MCP_API_KEY')) g) is distinct from 'unlimited'
 then raise exception 'AGT-297 gate: a grant or the lookup is wrong'; end if;
end $$;
