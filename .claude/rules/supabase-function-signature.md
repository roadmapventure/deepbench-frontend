# Changing a Supabase function's signature — CREATE OR REPLACE does not replace it

Adding, removing, or retyping a parameter on an existing Postgres function creates a **new
overload**; `CREATE OR REPLACE FUNCTION` only replaces the *exact* identity argument list it
already matches. Both versions then exist, and PostgREST can no longer resolve a call that
omits the new parameter — it returns an ambiguity error, which surfaces to callers as an
empty result, not a crash.

Whenever a session changes any `match_*` / RPC signature:

- Drop the stale overload in the **same** migration, by its full identity argument list:
  `DROP FUNCTION IF EXISTS public.match_x(vector, double precision, integer, text);`
- Then assert exactly one remains before declaring the migration done:
  `select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where p.proname = 'match_x' and n.nspname = 'public';` → must be `1`.
- Verify the **omitted-parameter** path returns real rows, not just that the new path works.
  An overload break is invisible from the new call and total from the old one.
- A "parameter appended last, existing callers unaffected" argument is about *positional
  compatibility* and says nothing about overload resolution. It is not a reason to skip the drop.

Found live 2026-07-29 (`DAT-12`, `v6.3.228`): appending `p_retrieval_scope` to
`match_the_library` left both signatures present and returned **0 chunks** on every unscoped
retrieval — all live CHI answers — for ~90 seconds until the stale overload was dropped. The
kickoff doc's own SQL carried the incomplete form. Tracked as `SES-59`.
