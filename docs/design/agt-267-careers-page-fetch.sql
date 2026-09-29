-- DeepBench v7.0.702 | docs/design/agt-267-careers-page-fetch.sql | AGT-267 — migration
-- agt267_careers_page_fetch, mirrored byte-identical.
--
-- FEATURE: AGT-267 — every careers-page watch company is either fetched for real or says, on its
-- own row, why it cannot be. Before this migration both fetch paths knew three vendors only
-- (greenhouse, lever, ashby), so all 19 `careers-page` watch_company rows — including all six
-- big-tech rows — produced zero machine-read postings and no stated reason. The database job also
-- had no in-repo SQL home and no regression guard; this file is the home,
-- tests/regression/agt-267-careers-page-fetch.test.mjs is the guard.
--
-- MEASURED THIS CYCLE (2026-09-29, pg_net 0.20.0, from the database — this container's proxy 403s
-- every careers host, so design-time assertion was impossible and task 1 was a real probe):
--   www.amazon.jobs/en/search.json?base_query=product%20manager&result_limit=100&sort=recent
--     -> HTTP 200, parseable JSON, top-level keys content,error,facets,hits,
--        job_posting_search_request,jobs; jobs[] length 100 of 774 hits.  FETCHABLE.
--   gcsservices.careers.microsoft.com/search/api/v1/search -> no status_code, error_msg
--     "SSL peer certificate or SSH remote key was not OK".                 search_only.
--   careers.google.com/api/v3/search/ -> HTTP 404 application/json {"detail":"Not Found"}. search_only.
--   jobs.apple.com/api/role/search -> HTTP 404 text/plain (an HTML error page); the role search is
--     POST-only.                                                            search_only.
--
-- NO COMPANY NAME, URL OR FIELD NAME APPEARS IN THIS SQL (pattern:2, pattern:11). The careers-page
-- arm reads its endpoint from the row's `data.json_url` and its field map from the row's
-- `data.json_map`; the token is derived structurally from the company name (pattern:99), never
-- looked up in a CASE. Adding a company is a data write, not a migration.
--
-- Down captured FIRST by
--   select * from public.capture_migration_down('4d2c3c4e-e719-4f45-9ed3-f16a655afb07',
--     'agt267_careers_page_fetch',
--     '[{"kind":"function","identity":"public.jerry_fetch_postings_request()"},
--       {"kind":"function","identity":"public.jerry_fetch_postings_collect()"},
--       {"kind":"table","identity":"public.jerry_fetch_requests"}]'::jsonb);
-- -> classification `refused`, 2 objects captured, 1 refusal: both prior function definitions are
-- stored in runner_migration_downs.prior_ddl, but the capture refuses to derive a down for an
-- in-place ALTER of an existing table by construction. That one undo, by hand:
--   ALTER TABLE public.jerry_fetch_requests DROP COLUMN IF EXISTS map;
--
-- Both CREATE OR REPLACEs keep their existing identity argument list `()`, so no new overload is
-- created; the trailing DO asserts count(*) = 1 in pg_proc for each name anyway
-- (.claude/rules/supabase-function-signature.md — a success flag is never the proof).

-- ---------------------------------------------------------------------------------------------
-- 1. The request row carries the field map the collector will need.
-- ---------------------------------------------------------------------------------------------

alter table public.jerry_fetch_requests add column if not exists map jsonb;

-- ---------------------------------------------------------------------------------------------
-- 2. Request: the three ATS arms byte-identical, plus a careers-page arm driven by the row.
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.jerry_fetch_postings_request()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare c record; rid bigint; url text; n int := 0;
begin
  delete from public.jerry_fetch_requests;

  -- ATS boards: unchanged from v7.0.701.
  for c in
    select coalesce(data->>'company', title) company, data->>'board' board, data->>'board_token' token
    from public.career_records
    where kind = 'watch_company' and data->>'board' in ('greenhouse','lever','ashby') and coalesce(data->>'board_token','') <> ''
  loop
    url := case c.board
      when 'greenhouse' then 'https://boards-api.greenhouse.io/v1/boards/' || c.token || '/jobs?content=true'
      when 'lever' then 'https://api.lever.co/v0/postings/' || c.token || '?mode=json'
      else 'https://api.ashbyhq.com/posting-api/job-board/' || c.token end;
    rid := net.http_get(url := url, timeout_milliseconds := 60000);
    insert into public.jerry_fetch_requests(request_id, board, token, company) values (rid, c.board, c.token, c.company);
    n := n + 1;
  end loop;

  -- Careers pages that published a GET+JSON endpoint. A row marked search_only is skipped and is
  -- never counted as a failure: it already carries its measured reason on the row.
  for c in
    select coalesce(data->>'company', title) company,
           data->>'json_url' json_url,
           data->'json_map' json_map,
           btrim(lower(regexp_replace(coalesce(data->>'company', title), '[^a-z0-9]+', '-', 'gi')), '-') token
    from public.career_records
    where kind = 'watch_company'
      and data->>'board' = 'careers-page'
      and coalesce(data->>'search_only','') <> 'true'
      and coalesce(data->>'json_url','') <> ''
      and jsonb_typeof(data->'json_map') = 'object'
  loop
    rid := net.http_get(url := c.json_url, timeout_milliseconds := 60000);
    insert into public.jerry_fetch_requests(request_id, board, token, company, map)
    values (rid, 'careers-page', c.token, c.company, c.json_map);
    n := n + 1;
  end loop;

  return n;
end $function$;

-- ---------------------------------------------------------------------------------------------
-- 3. Collect: a careers-page arm that reads the map off the request row. Title filter, URL dedupe,
--    src, the inserted `data` shape and the log row are byte-identical to the ATS arms.
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.jerry_fetch_postings_collect()
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  r record; body jsonb; items jsonb; it jsonb;
  t text; u text; txt text;
  m_items text[]; m_title text[]; m_url text[]; m_text text[];
  titles text[]; fetched_at timestamptz := now(); src text := 'fetch-postings ' || to_char(now() at time zone 'utc','YYYY-MM-DD');
  n_boards int := 0; n_fetched int := 0; n_inserted int := 0; failed text[] := '{}';
begin
  select coalesce(array_agg(lower(btrim(x))), '{}') into titles
  from public.career_records, jsonb_array_elements_text(case when jsonb_typeof(data->'titles')='array' then data->'titles' else '[]'::jsonb end) x
  where kind = 'target' and btrim(x) <> '';

  for r in select q.*, resp.status_code, resp.content, resp.error_msg
           from public.jerry_fetch_requests q left join net._http_response resp on resp.id = q.request_id
  loop
    n_boards := n_boards + 1;
    if r.status_code is distinct from 200 then
      failed := failed || (r.board || ':' || r.token || ' (' || coalesce(r.status_code::text, coalesce(r.error_msg,'no response')) || ')');
      continue;
    end if;
    begin
      body := r.content::jsonb;
    exception when others then
      failed := failed || (r.board || ':' || r.token || ' (bad json)'); continue;
    end;
    if r.board = 'careers-page' then
      -- A map that cannot name the items, the title and the url is a failed request, not an empty
      -- one: nothing is guessed and nothing is inserted.
      -- coalesce, not a bare <>: jsonb_typeof of an absent key is NULL, and `NULL <> 'array'` is
      -- NULL, which would leave the whole guard un-fired and the request silently empty.
      if r.map is null or coalesce(jsonb_typeof(r.map->'items'),'') <> 'array'
         or coalesce(jsonb_typeof(r.map->'title'),'') <> 'array'
         or coalesce(jsonb_typeof(r.map->'url'),'') <> 'array' then
        failed := failed || (r.board || ':' || r.token || ' (map needs items, title and url paths)'); continue;
      end if;
      select array_agg(x order by o) into m_items from jsonb_array_elements_text(r.map->'items') with ordinality s(x, o);
      select array_agg(x order by o) into m_title from jsonb_array_elements_text(r.map->'title') with ordinality s(x, o);
      select array_agg(x order by o) into m_url   from jsonb_array_elements_text(r.map->'url')   with ordinality s(x, o);
      m_text := case when jsonb_typeof(r.map->'text') = 'array'
                     then (select array_agg(x order by o) from jsonb_array_elements_text(r.map->'text') with ordinality s(x, o))
                end;
      items := body #> m_items;
      if items is null or jsonb_typeof(items) <> 'array' then
        failed := failed || (r.board || ':' || r.token || ' (items path is not an array)'); continue;
      end if;
    elsif r.board = 'lever' then
      items := case when jsonb_typeof(body)='array' then body else '[]'::jsonb end;
    else
      items := coalesce(body->'jobs','[]'::jsonb);
    end if;
    for it in select * from jsonb_array_elements(items) loop
      n_fetched := n_fetched + 1;
      if r.board = 'greenhouse' then t := it->>'title'; u := it->>'absolute_url'; txt := public.jerry_strip_html(it->>'content');
      elsif r.board = 'lever' then t := it->>'text'; u := it->>'hostedUrl'; txt := coalesce(it->>'descriptionPlain', public.jerry_strip_html(it->>'description'));
      elsif r.board = 'careers-page' then
        t := it #>> m_title;
        u := it #>> m_url;
        if u is not null then u := coalesce(r.map->>'url_prefix','') || u; end if;
        txt := public.jerry_strip_html(it #>> m_text);
      else t := it->>'title'; u := it->>'jobUrl'; txt := coalesce(it->>'descriptionPlain', public.jerry_strip_html(it->>'descriptionHtml'));
      end if;
      continue when t is null or u is null;
      continue when not (t ~* '\mproduct\M' or exists (select 1 from unnest(titles) w where position(w in lower(t)) > 0));
      continue when exists (select 1 from public.career_records where kind = 'posting' and data->>'url' = u);
      insert into public.career_records(kind, title, source, data)
      values ('posting', t, src, jsonb_build_object('status','new','board',r.board,'url',u,'title',t,'company',r.company,
              'fetched_at', to_char(fetched_at at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'text',coalesce(txt,'')));
      n_inserted := n_inserted + 1;
    end loop;
  end loop;

  insert into public.career_records(kind, title, body, source, data)
  values ('log', 'fetch-postings ran (database job)',
          format('Boards %s, postings fetched %s, new postings stored %s, failed %s.', n_boards, n_fetched, n_inserted, coalesce(array_to_string(failed, ', '), '')),
          src, jsonb_build_object('boards',n_boards,'fetched',n_fetched,'inserted',n_inserted,'failed',to_jsonb(failed)));

  if n_boards > 0 and cardinality(failed) = n_boards
     and not exists (select 1 from public.audit_findings where check_slug = 'jerry-db-fetch-postings-all-boards-failed' and status = 'open') then
    insert into public.audit_findings(fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution, found_by, check_slug, finding_type)
    values (left(md5('jerry-db-fetch-postings-all-boards-failed'),16), to_char(now(),'IYYY-"W"IW'), 'other',
      jsonb_build_array(jsonb_build_object('location','public.jerry_fetch_postings_collect()','text','Every job board request failed: ' || array_to_string(failed, ', '))),
      'Jerry needs the weekly posting fetch to reach the public job-board APIs.', 'high',
      'Check pg_net egress from the database and the board tokens on watch_company records; rerun jerry_fetch_postings_request() then jerry_fetch_postings_collect().',
      'agent:jerry', 'jerry-db-fetch-postings-all-boards-failed', 'defect');
  end if;

  delete from public.jerry_fetch_requests;
  return jsonb_build_object('boards',n_boards,'fetched',n_fetched,'inserted',n_inserted,'failed',to_jsonb(failed));
end $function$;

-- ---------------------------------------------------------------------------------------------
-- 4. Assert, never trust the success flag: exactly one overload of each name, and the new column.
-- ---------------------------------------------------------------------------------------------

do $assert$
declare c integer; nm text;
begin
  foreach nm in array array['jerry_fetch_postings_request','jerry_fetch_postings_collect'] loop
    select count(*) into c from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = nm and p.prokind = 'f';
    if c <> 1 then
      raise exception 'public.%() has % overloads, expected 1 (.claude/rules/supabase-function-signature.md)', nm, c;
    end if;
  end loop;
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='jerry_fetch_requests' and column_name='map') then
    raise exception 'public.jerry_fetch_requests.map was not added';
  end if;
end
$assert$;
