# LOG-89 — harvest

Detail moved out of `docs/FEATURES-LATER.md`'s `LOG-89` row 2026-07-29 by `S-HAR-21-design` (row had been over the 2000-char cap since before this session and this session's own addition worsened it — `CLAUDE-DESIGN.md` step 9). **A move, not a delete:** the bucket analysis below is the row's text verbatim.

---

## AI Audit "unregistered services" residue — full analysis 2026-07-28 (`ai-audit-q` session)

The UI line itself was removed the same day per John (`LOG-90`, v6.3.167), so `computeUnregisteredServices()` (`useAIActivity.js`) still detects this residue but nothing renders it — this ticket is the §19m tripwire's only remaining consumer until it's fixed.

All 11 slugs (48 calls) were verified live against `ai_activity_log`, `platform_services`, `capabilities`, `agent_capability_assignments`, and `skill_profiles` — none exists in any of them; every on-screen count reconciled exactly.

**Bucket 1 — Test debris, 42 calls, all 2026-07-01→03.** `test-orchestrator-v6` (31) + `test-delegate-v6` (5) from the v6 orchestration live tests, plus six capability-shaped one-call `ai_type`s written through the `request-receivable` harness (`autonomous-research`, `data-accuracy-assessment`, `data-analysis-and-forecasting`, `data-diagnostics-custom`, `data-expertise-diagnosis`, `reasoning-and-judgment`; agents nadia/brent/elena) — candidates for the archive-not-delete cleanup pattern `S-LOG-83` used.

**Bucket 2 — Match-key gap, 3 calls, one as recent as 2026-07-17.** Rows logged `ai_type:'deterministic'` with the operation in `feature` (`document-extraction` ×2, `csv-upload` ×1) never match Document Parser because its `match_keys` are ai_type-keyed (`document-parsing`/`csv-upload`) and the feature-map has no entry — fix is `platform_services` data (add `{feature:...}` keys), zero code.

**Bucket 3 — Legacy-alias artifact, 3 calls, 2026-07-01.** `ai_type:'deterministic', feature:'librarian'` rows remap through `AI_TYPE_TO_SERVICE['librarian']` to the slug `librarian`, which is neither the service slug (`library-custodian`) nor any capability — NOT Eleanor — The Librarian's real activity (her 3,196 `ai_type:'librarian'` rows attribute to Library Custodian correctly).

**Bucket 4 — Real signal, 2 calls, 2026-07-21.** Brent — Data Research Specialist executed a delegated turn logged literally as `"no assigned capability"`, and he has zero `agent_capability_assignments` rows today — same missing-capability class as `LOO-22`-done.

**Fix scope when picked up:** clean bucket 1, add the bucket-2 feature keys, retire the bucket-3 alias residue, decide Brent's capability (bucket 4), then decide whether the line returns on an admin-only surface (with the line removed, a NEW unattributed service now surfaces nowhere user-visible — accepted cost of `LOG-90`, John's call).

## Bucket 5 — Claim Resolver drop rows (added 2026-07-29, `S-HAR-21`)

`lib/claim-resolver.js` logs a `feature: 'claim-resolver'`, `ai_type: 'deterministic'` row **only when it drops a malformed reference id** — not on every execution. Those rows resolve to no directory row and count under slug `deterministic`.

`match_keys` on the `claim-resolver` `platform_services` row was deliberately left `[]`. Populating it would attribute the rows to Claim Resolver and render a "call count" that is really a *drop* count — a wrong number where §19l prefers an honest gap. The service's `tracking_status` is `machinery` (§19m: executions attributed elsewhere, so nothing double-counts) because every execution runs inside a `request-receivable` dispatch already counted under Model Gateway.

Resolve alongside the other buckets, not by patching this one row's `match_keys`.
