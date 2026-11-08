-- DeepBench v7.0.978 | docs/design/agt-609-regrade-current-rules.sql | AGT-609 -- a blocked ship is re-graded under current rules
--
-- Mirror of migration `agt609_regrade_current_rules` (applied 2026-11-08, cycle
-- 7195393f-a13c-4e6b-8731-9b8185c33a64). Byte-identical to what was applied.
--
-- WHAT IT ADDS. Three things, and the third is the only one that is read by a screen:
--   1. `runner_verdicts.rules_fingerprint` -- the sha256 of `scripts/verifier.js`'s RULE_FILES as
--      they were on the tree that graded the verdict (`rulesFingerprint()`). NULL means graded
--      before the stamp existed, which the sweep reads as stale.
--   2. `runner_regrades` -- the ledger of re-grade attempts. `unique (prior_verdict_id,
--      rules_fingerprint)` IS the rule "once per rule set, again after the rules change".
--      `ungradable` lives HERE and never in `runner_verdicts.verdict`: that column's own CHECK is
--      approve|block and every reader of it assumes two values (§A call 5).
--   3. `stale_blocked_verdicts(p_fingerprint)` -- the sweep's one question: which `delivered`
--      tickets' LATEST verdict is a block graded under rules that are no longer current, have no
--      standing ship decision, and have not already been re-graded under this fingerprint.
--
-- DOWN. Captured BEFORE the up by `public.capture_migration_down()` (auto-downable, 3 objects, 0
-- refusals) over the table, the function and the CHECK constraint. The COLUMN has no derivable
-- down -- a `table` object that already exists is refused (AGT-264 precedent) -- so its down is
-- card-only and recorded here:
--
--   alter table public.runner_verdicts drop column rules_fingerprint;
--
-- GRANTS. `.claude/rules/supabase-column-grants.md`: a new table is born with public SELECT and a
-- new function is born EXECUTE-able by `anon`/`authenticated` BY NAME, so both are revoked by name
-- and `service_role` is granted back. The trailing DO block is the gate: it asserts both
-- directions (denied AND still-working), one overload only
-- (`.claude/rules/supabase-function-signature.md`), the column present, zero public grant rows,
-- and that a fresh fingerprint actually returns stale rows -- never the migration's success flag.

alter table public.runner_verdicts add column rules_fingerprint text;
alter table public.runner_verdicts add constraint ck_runner_verdicts_rules_fingerprint
  check (rules_fingerprint is null or rules_fingerprint ~ '^[0-9a-f]{64}$');
comment on column public.runner_verdicts.rules_fingerprint is
  'AGT-609: sha256 of scripts/verifier.js RULE_FILES as they were when this verdict was graded (rulesFingerprint()). NULL = graded before the stamp existed, which the sweep reads as stale.';

create table public.runner_regrades (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  cycle_id         uuid not null,
  backlog_id       text not null check (backlog_id ~ '^[A-Z]+-[0-9]+[a-z]?$'),
  prior_verdict_id uuid not null references public.runner_verdicts(id),
  prior_fingerprint text,
  rules_fingerprint text not null check (rules_fingerprint ~ '^[0-9a-f]{64}$'),
  mode             text not null check (mode in ('pair','dev-head')),
  mode_reason      text not null check (length(btrim(mode_reason)) > 0),
  outcome          text not null check (outcome in ('approve','block','ungradable')),
  verdict_id       uuid references public.runner_verdicts(id),
  ship_decision_id uuid,
  base_sha         text check (base_sha is null or base_sha ~ '^[0-9a-f]{7,40}$'),
  ship_sha         text check (ship_sha is null or ship_sha ~ '^[0-9a-f]{7,40}$'),
  graded_sha       text check (graded_sha is null or graded_sha ~ '^[0-9a-f]{7,40}$'),
  reason           text not null check (length(btrim(reason)) > 0),
  constraint ck_rr_verdict_presence check ((outcome = 'ungradable') = (verdict_id is null)),
  constraint ck_rr_pair_shas check (mode <> 'pair' or (base_sha is not null and ship_sha is not null)),
  unique (prior_verdict_id, rules_fingerprint)
);
create index on public.runner_regrades (backlog_id);

create or replace function public.stale_blocked_verdicts(p_fingerprint text)
returns table(backlog_id text, verdict_id uuid, version text, graded_sha text, verdict_at timestamptz,
              rules_fingerprint text, gate_build text, gate_regression text, gate_hygiene text,
              epic_name text, priority_class text)
language plpgsql stable security definer set search_path = public, pg_catalog
as $fn$
begin
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'check_violation',
      message = 'stale_blocked_verdicts: p_fingerprint must be the 64-hex rules fingerprint of the tree doing the re-grading (AGT-609) -- a sweep with no fingerprint cannot say what current means';
  end if;
  return query
  with latest as (
    select distinct on (v.backlog_id) v.* from public.runner_verdicts v
     where v.backlog_id is not null order by v.backlog_id, v.created_at desc)
  select l.backlog_id, l.id, l.version, l.graded_sha, l.created_at, l.rules_fingerprint,
         l.gate_build, l.gate_regression, l.gate_hygiene, l.epic_name, l.priority_class
    from latest l join public.backlog_items b on b.backlog_id = l.backlog_id
   where l.verdict = 'block' and b.status = 'delivered'
     and l.rules_fingerprint is distinct from p_fingerprint
     and not exists (select 1 from public.runner_decisions d
                      where d.backlog_id = l.backlog_id and d.kind = 'ship' and d.status <> 'reversed')
     and not exists (select 1 from public.runner_regrades r
                      where r.prior_verdict_id = l.id and r.rules_fingerprint = p_fingerprint)
   order by l.created_at asc;
end $fn$;

revoke all on table public.runner_regrades from public, anon, authenticated;
grant select, insert on table public.runner_regrades to service_role;
revoke all on function public.stale_blocked_verdicts(text) from public, anon, authenticated;
grant execute on function public.stale_blocked_verdicts(text) to service_role;

do $$
declare n integer;
begin
  if has_function_privilege('anon', 'public.stale_blocked_verdicts(text)', 'execute') then raise exception 'anon can execute stale_blocked_verdicts'; end if;
  if has_function_privilege('authenticated', 'public.stale_blocked_verdicts(text)', 'execute') then raise exception 'authenticated can execute stale_blocked_verdicts'; end if;
  if not has_function_privilege('service_role', 'public.stale_blocked_verdicts(text)', 'execute') then raise exception 'service_role cannot execute stale_blocked_verdicts'; end if;
  select count(*) into n from information_schema.role_table_grants where table_schema='public' and table_name='runner_regrades' and grantee in ('anon','authenticated');
  if n <> 0 then raise exception 'runner_regrades: % public grant rows', n; end if;
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname='public' and p.proname='stale_blocked_verdicts';
  if n <> 1 then raise exception 'stale_blocked_verdicts: % overloads, expected 1', n; end if;
  select count(*) into n from information_schema.columns where table_schema='public' and table_name='runner_verdicts' and column_name='rules_fingerprint';
  if n <> 1 then raise exception 'runner_verdicts.rules_fingerprint missing'; end if;
  select count(*) into n from public.stale_blocked_verdicts(repeat('0', 64));
  if n < 1 then raise exception 'stale_blocked_verdicts returned no row on a board holding 94 blocked deliveries'; end if;
  raise notice 'AGT-609 gate green: % stale rows for a fresh fingerprint', n;
end $$;
