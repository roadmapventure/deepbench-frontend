-- DeepBench v7.0.1118 | docs/design/agt-805-store-f-intents.sql | AGT-805 -- the STORE F VOCABULARY paragraph appended to the default intent of each STORE_F_WRITERS slug.
-- Need source: john:runner_decisions:1fcf1d20-03ce-426b-855a-23f2d3fadece (walkthrough Q4/Q5, 2026-11-25).
-- Apply over the Supabase MCP AFTER the personal-agent.js change accepting market_terms is pushed (T4).
-- Undo: restore method from the before-images written below (session_name design-store-f-1125).

with d as (
  insert into public.runner_decisions (kind, session_name, summary, reasoning, status, finalized_at, expires_at)
  values ('agent-row', 'design-store-f-1125',
    'AGT-805: ten writer intents gain the STORE F VOCABULARY paragraph',
    'Walkthrough Q4 (feeders Jerry, Laura, Harry inside runs they already make) and Q5 (agents add or bump vocabulary entries alone; a change to the record is a proposal). Need source 1fcf1d20.',
    'final', now(), now())
  returning id),
targets as (
  select s.* from public.skill_profiles s
  where s.slug in ('sc-weekly-review-intent','sc-study-intent','sc-advise-intent',
                   'cw-tailor-intent','cw-predraft-intent','cw-watch-intent',
                   'jm-posting-review-intent','jm-match-finder-intent','jm-market-watch-intent','jm-linkedin-alerts-intent')
    and position('STORE F VOCABULARY' in coalesce(s.method,'')) = 0),
b as (
  insert into public.runner_before_images (table_name, pk_value, row_data, decision_id, session_name)
  select 'skill_profiles', t.id::text, to_jsonb(t), d.id, 'design-store-f-1125' from targets t, d
  returning pk_value)
update public.skill_profiles s
set method = coalesce(s.method,'') || E'\n\nSTORE F VOCABULARY: when the posting, research or market text you read names a role, task or capability that matches the principal''s work (store_f.offering) under words he has not used, add it to market_terms with what they mean, the work it matches, how he says it, how to use it, and strength (strong, or partial with the shortfall). A term already in store_f.terms is re-sent to count the sighting. Never change store_f.offering directly: a change is a proposal.',
    updated_at = now(), updated_by_type = 'owner', updated_by_id = 'john'
where s.id::text in (select pk_value from b)
returning s.slug;
