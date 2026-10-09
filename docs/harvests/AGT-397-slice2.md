# AGT-397 slice 2 — harvest (reasoning, measurements, alternatives)

Not required reading for the build. Every fact a task depends on is in `docs/kickoffs/v7.0.796-AGT-397-proposed-resume-identity-editor.md`.

## Premise revalidation (live worktree `design-agent-fields-1006b`, HEAD 02083575 = v7.0.795 shipped, 2026-10-06)

- `src/screens/personnel/ResumeTab.jsx` (19,986 bytes): `ResumeTab({ agent, showToast })` at :152; the `240px 1fr` grid at :212; Vitals :216-225 and Skill Ladder :227-239 (with `SKILL_LEVELS`/`activeLevel` :208-209) unconditional. No `arrangement` prop. `originTag(row)` :37-42 is pinned by agt-390 (f)'s regex `export function originTag(row) {\n...\n}\n` and must stay byte-identical.
- `src/screens/PersonnelScreen.jsx` (139,857 bytes): `StatBadges` defined :819-862 and mounted twice, both `arrangement === "current"` (:2247 mobile persona block, :2293 desktop header). The Future View groups :2304-2324: readiness holds ReadinessCard, IntelConfigCard, QuickStatsCard show=parked, ReportCardPanel — no StatBadges, so under Proposed the trio is shown NOWHERE (slice sentence B is alive). `<ResumeTab agent={agent} showToast={showToast}/>` :2326 passes no arrangement.
- `api/agent-configs.js` (10,222 bytes): POST actions `create_private_agent`, `add_agent_to_team`, `archive_private_agent`; GET `teams=1`. No identity read or write. `lib/private-agent-create.js`: `knowledgeCapabilityRow` :130, `teachCapabilityRow` :143, `restClient` :161, `archivePrivateAgent` :308 (one PATCH, no before-image).
- `public.agents` (information_schema, 32 columns): has `name` NOT NULL, `role`, `specialty`, `bio`, `code`; no `identity_origin`, `identity_origin_caller`, `identity_updated_at`. Constraints: pkey, `ck_agents_lane`, `ck_agents_sharing`; no triggers. anon/authenticated hold a COLUMN-LIST select grant (32 columns) — a new column is unreadable by the browser key until granted (rule `supabase-column-grants.md`), hence the grant in the migration.
- `testjohn-w50rvr`: name `testjohn`, role `New Agent`, code null, specialty null, bio null, private/customer/active; capabilities `testjohn-w50rvr-knowledge` (`testjohn's Knowledge`) and `testjohn-w50rvr-teach` (`Teach testjohn`) exist.
- `runner_model_lanes`: orchestrator `claude-opus-5`, judgment `claude-fable-5-1`, mechanical `claude-sonnet-5`. Build on the orchestrator lane.
- Tickets live: AGT-397 open P4, AGT-392 open P4, AGT-393 open P4 (out of scope), AGT-136 delivered (so the Designer calls are recorded in the kickoff and named in the STOP LINE).

Premise ALIVE.

## Migration DOWN (mirror file header carries it verbatim)

`alter table public.agents drop constraint ck_agents_identity_origin, drop column identity_origin, drop column identity_origin_caller, drop column identity_updated_at;`

`capture_migration_down(p_cycle_id, p_up_name, p_objects)` refuses an in-place ALTER of an existing table (agt-390, agt-142 precedents), so the red range is card-only and the DOWN lives in the mirror file. Applied through Supabase MCP `apply_migration` in T1 by the build session, before any code task.

## Why FutureViewTab.jsx is not edited

The slice's file list named it. It takes `groups[].items: ReactNode[]` and authors nothing; relocating Vitals, Skill Ladder and the trio is three more nodes handed to it from PersonnelScreen.jsx. Editing it would add nothing and risk its agt-397 (d) pins (no heading, no hex). The waived cap is 8 files; the build uses 7 repo files plus the migration.

## Designer calls

1. Vitals -> Subscription and status. The slice left it open ("Subscription and status / Work as the kickoff decides"). The register handoff puts the Vitals fields (f19 architecture, f28 trainer, f40 update cadence, f45 update rights, p30 visibility) under Identity/Access, which slice 1 mapped to Subscription and status; Work holds the Work Orders card. Skill Ladder (p31) and the trio -> Readiness and levels per the slice.
2. Identity save for any agent id, not fenced to private customer agents. §19w decision 1 makes Identity editable for every agent on the Personnel page; the seeded agents' names and roles are table rows too (AGT-006). A missing row is 404. Reversible: add `&sharing=eq.private&agent_origin=eq.customer` to the PATCH filter.
3. After-save display. `useRoster()` refetches on every mount and keeps a module cache without a patch export; adding one would be a 9th file (`src/hooks/useAgents.js`). The page keeps `identityPatch` state keyed by agent id and spreads it over the found row, so the header, sidebar strip and badge show the new name immediately; the next mount reads the table. `bio` is not in `ROSTER_TABLE_FIELDS`, so the editor reads the row itself (`identity=1`) rather than the roster.
4. `identityTag()` is a new sibling of `originTag()`. Reusing `originTag` would require renaming its fields or changing its output (`learned` is wrong for an identity edit) and would break agt-390 (f). The test extracts it the way agt-390 (f) extracts `originTag` (regex on `export function identityTag(row) {` ... `}`) and calls it.
5. `updateAgentIdentity` takes `origin`/`originCaller` options defaulting to `deepbench`/null so AGT-393 (Teach tool writes specialty/bio) can reuse it without a second writer; AGT-393 itself is not built.
6. Validation bounds: name and role reuse `readName` (1-60, the create bound); specialty 200, bio 2000 — John has not set these; they are generous and reversible.
7. The editor's inputs reuse ConfigCard's edit-form styles (ResumeTab.jsx :82-87) and the :218 card header, so no new visual vocabulary is introduced; the form is only reachable under Proposed on a dev host (slice 1's gate), so no production appearance changes.

## Coupled pins (grep tests/ for every string the tasks move)

- agt-397 (c) :121 `<StatBadges` x2 -> the test itself is edited to 3 (T2); :129 hex 10 unchanged (no hex moves; ResumeTab.jsx uses rgba only). HEADINGS list does not include Vitals/Skill Ladder, so those are new needles.
- agt-344 :79 hex 10 in PersonnelScreen.jsx — unchanged.
- agt-386 (i) `req.body?.action === "archive_private_agent"` x1 — a sibling branch does not change the count.
- agt-338 tests pin `if (teams === "1")` presence — untouched; the identity branch is a second `if` after it.
- agt-390 (f) `originTag` regex — untouched.
- log-143b `.from("bench_report_cards")` / `FeatureBadge id="LOG-143"` — untouched.

## Baseline

`node scripts/baseline-red-set.js --tests=agt-397-future-view,agt-390-teach-tool,agt-386-add-player,agt-344-training-tab,log-143b-report-card-surfaces,agt-337-create-private-agent --worktree=<worktree>` on the unchanged tree: six green, Red set 0 of 6 (block in the kickoff). The new agt-392 file cannot be baselined (missing path exits 2); QA 1 states its red-before.

## Residue

- Ticket item 5 (remove the switch and the Current arrangement once John approves Proposed) is John's approval first; not filed now.
- AGT-393 (Teach tool writes specialty/bio through the same `updateAgentIdentity` with origin `mcp`) is its own ticket, open.
