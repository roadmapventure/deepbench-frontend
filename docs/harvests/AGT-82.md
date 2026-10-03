# AGT-82 — Jerry Maguire: harvest (reasoning, measurements, alternatives)

Kickoff: `docs/kickoffs/v7.0.560-AGT-82-jerry-maguire.md`. This file is not required reading for the build; every fact a task depends on is in the kickoff. Written by The Designer, 2026-09-23, from the attended design session `jerry-maguire-design` (decision handle `20e4130d-eb0d-494f-ade2-034f6b2640c6`).

## 1. Premise revalidation (measured, not recalled)

All over PostgREST with the browser (anon) key from the worktree's `.env.local`, project `rallojeqnkgtxgsdsnqm`, 2026-09-23:

| Probe | Result | Meaning |
|---|---|---|
| `agents?id=eq.jerry&select=id,lane` | HTTP 200, `[]` | no agent row yet |
| `agents?select=lane` (all rows) | `product` 22, `governance` 8 | no third lane in data |
| `capabilities?slug=like.career-*` | `[]` | none of the eleven exist |
| `skill_profiles?slug=like.jm-*` | `[]` | none of the fifteen exist |
| `career_records?select=id&limit=1` | HTTP 404 `PGRST205` "Could not find the table" | table absent |
| `runner_model_lanes` | HTTP 401 `42501` | not anon-readable; the lane facts come from the design session's MCP read (judgment lane = `claude-fable-5-1`, as `docs/design/ga-agents-seed.sql` also records) |

The constraint text `ck_agents_lane CHECK (lane = ANY (ARRAY['product','governance']))` cannot be read over REST; it was measured over the MCP by the design session the same day and the anon probe above (only two lane values in 30 rows) is consistent with it.

Premise: **alive**. Nothing the ticket ships exists.

## 2. The lane fence, file by file

The ticket's risk is a `personal` row leaking into a product surface. Every reader was read today:

- `lib/project-manager.js:51` — broker roster read is `lane=eq.product`.
- `src/screens/CreateWorkOrderScreen.jsx:309` — `.eq('lane','product')`.
- `src/components/GovernanceSection.jsx` — renders `lane=governance` rows only.
- `scripts/run-project.js:516` — `lane=eq.governance`.
- `api/_lib/mcp.js:207-213` — `visibleRows(rows, { governanceUnlocked })` returns `rows.filter(r => r.lane === 'product' || governanceUnlocked === true)`. The comment at 207-211 says it is written as "is it product?" on purpose so an unknown lane fails closed. That means a `personal` row IS visible to a caller holding the governance key — acceptable: the governance key is John's, and the ticket's isolation target is the public/anon surface, not John's own governance channel. Stated, left unchanged.

Because every fence is positive, the ticket needs no `src/`, `api/` or `lib/` change. That is the cheapest variant that proves the claim: a DDL migration, a seed, a test.

## 3. Why the table is closed the way it is

`.claude/rules/supabase-column-grants.md` (SES-78a addendum): SELECT default privileges are open — a new table comes up anon-readable. Write defaults are closed (DAT-18). So the migration REVOKEs ALL from `anon, authenticated` and asserts in its own trailing DO block: zero rows in `information_schema.role_table_grants` AND `role_column_grants` for both roles (the column view shows per-column rows for table-level grants too, so both views are checked), and `has_table_privilege('service_role', …, 'SELECT')` true. The rule's own history (LOG-124: a migration "reported success" and left the data exposed) is why the success flag is never trusted.

Over REST the grant views cannot be read, so the regression test asserts the observable pair instead: anon GET refused (status ≥ 400) AND service GET 200. One half alone would pass on a wrong table name (404 both ways) — hence the pair.

## 4. Migration-down capture

`capture_migration_down()` (runner-cycle.md, SES-182 slice 2) refuses in-place ALTERs and ACL changes by design; the CHECK constraint swap is one. The kickoff lists only `{"kind":"table","identity":"public.career_records"}` and says the red range is card-only. A hand-written down is forbidden ("authored from memory").

## 5. Before-images under AGENT-ROW-AGREED-TICKET

`.claude/rules/agent-roster-inert.md` renders the rule: creating an agent's rows under a `john-named` ticket takes no approval card, and every row is written with its own `runner_before_images` row (`row_data` NULL for an INSERT) under one decision handle. Row count = 1 agent + 11 capabilities + 11 assignments + 15 skills + 55 links = 93. `runner_before_images` has a CHECK refusing `cycle_id` and `session_name` together (environment fact, cycle 601227fb) — pass `cycle_id` only. `capability_skill_profiles` and `agent_capability_assignments` carry a uuid `id` (measured over REST today); the three slug/id-keyed tables' primary keys are to be read from `pg_constraint` in the same MCP session rather than assumed.

## 6. Seed checks run today (static, on the untracked file)

- Personal-fact markers (`512.`, `@yahoo`, `SOVRA`, `Periscope`, `mdf`, `Deverus`, `Fluid Innovation`, case-insensitive): 0 hits.
- AGENTS ids from `src/data/agents.js` (chloe … jordan, 22 ids) word-matched against the seed: 0 hits. The seed's own DO block repeats this check live against `agents.id`.
- Knowledge rows: one (`jm-knowledge-method`) with `{"source":"inline"}` (SES-341).
- No Format Skill linked (AGT-63 measured the executor's Format branch overwriting the Intent contract).
- Counts the DO block asserts: 1 / 11 / 11 / 15 / 55.

## 7. Baseline

`node scripts/baseline-red-set.js --tests=tests/regression/agt-82-jerry-maguire.test.mjs` on the unchanged tree: "these paths do not exist, so no baseline was measured" (exit 0). The test is new; its entire red set is the file itself.

## 8. Alternatives considered

- **Put jerry in the product lane with `is_active=false`.** Rejected: the product-lane stores (`skill_profiles`, `knowledge_entries`, `the_library`, `the_reasoning`, `tasks`, `deliverables`, `durable_hops`) are anon-SELECT (measured 2026-09-18); the Skills would be public regardless. The third lane plus a closed store is the only shape where the facts are unreadable and the method is harmless if read.
- **Store personal facts in Knowledge Skills with method text.** Rejected for the same reason; the settled rule is method only in `skill_profiles`, facts only in `career_records`.
- **Row-level security on `career_records`.** Not needed: no browser path reads it; REVOKE at table level is simpler and is the pattern SES-78a already proved. RLS filters rows, never grants.
- **A `lane` filter added to `visibleRows()`.** Unnecessary; the fence is already positive. Changing it would widen the shared harness for a data-level change (pattern:8).

## 9. Patterns leaned on

pattern:2 (data-driven — agent as rows, no code), pattern:8 (narrowest layer: Supabase content, no harness change), pattern:11 (no personal content in the repo), pattern:13 (platform code agent-agnostic — no `src/` entry for jerry), pattern:17 (extend `agents.lane` rather than a parallel structure), pattern:64/66 (one item, minimum slice), pattern:92 (before-images and decision handle persisted), pattern:111 (no personal details on a public surface), pattern:134 (model named), pattern:162 (the test grades the change), pattern:168 (kickoff under 8,192 bytes).

## 10. Open, not blocking

The build runs the seed's live Rule #1 check against `agents.id` — it will also match a future agent whose id is an English word appearing in the method text (e.g. an agent named `log`). Today no id collides. If one is ever added, the seed's DO block will refuse, which is the fail-closed direction.
