-- DeepBench v7.0.1077 | docs/design/agt-354-taught-pieces.sql | AGT-354
-- Migration `agt354_taught_pieces` (mirror; applied by the orchestrator over the Supabase connector).
-- A long taught item is also stored as pieces, each with its own embedding, and one new search
-- function returns the matching piece. public.match_knowledge (3 overloads) is NOT touched.
-- Down: public.capture_migration_down, taken before the apply (drops the function, then the table).

create table public.knowledge_entry_pieces (
  entry_id   uuid        not null references public.knowledge_entries(id) on delete cascade,
  piece_no   integer     not null check (piece_no >= 1),
  content    text        not null check (length(content) between 1 and 12000),
  embedding  vector(1536) not null,
  created_at timestamptz not null default now(),
  primary key (entry_id, piece_no)
);

comment on table public.knowledge_entry_pieces is
  'AGT-354: the pieces of a knowledge_entries item longer than 12,000 characters. Written only by lib/knowledge-write.js writePieces(); read only by public.match_knowledge_pieces().';

-- Born closed (.claude/rules/supabase-column-grants.md): a new table is born readable by anon.
alter table public.knowledge_entry_pieces enable row level security;
revoke all on table public.knowledge_entry_pieces from public, anon, authenticated;
grant select, insert, update, delete on table public.knowledge_entry_pieces to service_role;

create function public.match_knowledge_pieces(
  query_embedding      vector(1536),
  match_threshold      double precision,
  match_count          integer,
  p_tenant_id          text default 'global',
  p_agent_id           text default null,
  p_exclude_always_for text default null
)
returns table (
  id uuid, title text, content text, category text, jurisdiction text, priority integer,
  triggers text[], status text, tenant_id text, agent_id text, teaching_note text,
  similarity double precision, piece_no integer, piece_count integer
)
language sql
stable
set search_path = public
as $fn$
  with scoped as (
    select e.id, e.title, e.content, e.category, e.jurisdiction, e.priority, e.triggers, e.status,
           e.tenant_id, e.agent_id, e.teaching_note, e.embedding,
           (select count(*)::integer from public.knowledge_entry_pieces k where k.entry_id = e.id) as piece_count
    from public.knowledge_entries e
    where e.status = 'active'
      and (e.tenant_id = p_tenant_id or e.tenant_id = 'global')
      and (p_agent_id is null or e.agent_id = p_agent_id or e.agent_id = 'legacy')
      -- an item the caller's prompt already carries whole (a user-taught item of that agent at or
      -- under 12,000 characters) is left out when the caller names the agent
      and (p_exclude_always_for is null
           or e.source is distinct from 'user'
           or e.agent_id is distinct from p_exclude_always_for
           or e.tenant_id is distinct from p_tenant_id
           or length(e.content) > 12000)
  ),
  cand as (
    -- an item with no pieces: matched on its own embedding, returned as the text that embedding
    -- was made from (its first 12,000 characters)
    select s.id, s.title, left(s.content, 12000) as content, s.category, s.jurisdiction, s.priority,
           s.triggers, s.status, s.tenant_id, s.agent_id, s.teaching_note,
           1 - (s.embedding <=> query_embedding) as similarity,
           null::integer as piece_no, s.piece_count
    from scoped s
    where s.piece_count = 0
    union all
    -- an item with pieces: each piece is a candidate, and the piece is what is returned
    select s.id, s.title, k.content, s.category, s.jurisdiction, s.priority,
           s.triggers, s.status, s.tenant_id, s.agent_id, s.teaching_note,
           1 - (k.embedding <=> query_embedding) as similarity,
           k.piece_no, s.piece_count
    from scoped s
    join public.knowledge_entry_pieces k on k.entry_id = s.id
  )
  select c.id, c.title, c.content, c.category, c.jurisdiction, c.priority, c.triggers, c.status,
         c.tenant_id, c.agent_id, c.teaching_note, c.similarity, c.piece_no, c.piece_count
  from cand c
  where c.similarity > match_threshold
  order by c.similarity desc, c.id, c.piece_no
  limit match_count;
$fn$;

-- Born closed: a new function is born executable by anon and authenticated BY NAME, and
-- REVOKE ... FROM PUBLIC alone leaves those standing (SES-315).
revoke all on function public.match_knowledge_pieces(vector, double precision, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function public.match_knowledge_pieces(vector, double precision, integer, text, text, text)
  to service_role;

-- Assert both directions; never trust the success flag. Any raise rolls the whole migration back.
do $gate$
declare
  fn  constant text := 'public.match_knowledge_pieces(vector, double precision, integer, text, text, text)';
  tbl constant text := 'public.knowledge_entry_pieces';
  r   text;
  p   text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach p in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] loop
      if has_table_privilege(r, tbl, p) then
        raise exception 'AGT354 gate: % holds % on %', r, p, tbl;
      end if;
    end loop;
    if has_function_privilege(r, fn, 'EXECUTE') then
      raise exception 'AGT354 gate: % may execute %', r, fn;
    end if;
  end loop;
  if exists (select 1 from pg_class c, aclexplode(c.relacl) a
             where c.oid = tbl::regclass and a.grantee in ('anon'::regrole::oid, 'authenticated'::regrole::oid, 0::oid)) then
    raise exception 'AGT354 gate: % still carries a public grant in relacl', tbl;
  end if;
  if not has_function_privilege('service_role', fn, 'EXECUTE')
     or not has_table_privilege('service_role', tbl, 'SELECT')
     or not has_table_privilege('service_role', tbl, 'INSERT')
     or not has_table_privilege('service_role', tbl, 'DELETE') then
    raise exception 'AGT354 gate: service_role cannot use % and %', tbl, fn;
  end if;
  if (select count(*) from pg_proc q join pg_namespace n on n.oid = q.pronamespace
      where n.nspname = 'public' and q.proname = 'match_knowledge_pieces') <> 1 then
    raise exception 'AGT354 gate: match_knowledge_pieces is not exactly one function';
  end if;
  if (select count(*) from pg_proc q join pg_namespace n on n.oid = q.pronamespace
      where n.nspname = 'public' and q.proname = 'match_knowledge') <> 3 then
    raise exception 'AGT354 gate: match_knowledge no longer has its 3 overloads';
  end if;
  if (select count(*) from public.knowledge_entry_pieces) <> 0 then
    raise exception 'AGT354 gate: the new table is not empty';
  end if;
end
$gate$;
