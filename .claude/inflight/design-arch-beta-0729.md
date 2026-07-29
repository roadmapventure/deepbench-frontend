design-arch-beta-0729 — worktree `design-arch-beta-0729`, branch `session/design-arch-beta-0729`. Chief-architect session on why beta close keeps receding. Created 2026-07-29 from origin/dev. Docs-only, no version bump. **PAUSED, not finished — John is running `AGT-44` in a separate session and returning here.**

**Shipped from this session (already on `dev`):** the **pre-regression check** — 3 cases via `scripts/chi-true-regression.mjs --only <case>` (case 9 `vitrine-tech`, case 6 `upgrade-cycles`, case 12 `vietnam-reseller`), 9 min, 1 PASS / 2 FAIL. Full result in `docs/BETA.md` §3 bucket 1 and `docs/SESSIONS.md` (2026-07-29 16:05 CST entry).

**Read this before starting an `AGT-44` session — its scope changed today:**
- `AGT-44` was **widened** by the pre-regression evidence. It is no longer "Priya's theory-test prose on case 12." The `platform_language_detected` leak reproduced on `forecast_draft` too, and on case 9 (a *direct* question, not case 12). Current scope: **artifact-producing Skills must not narrate Data Room / flagging / consolidation mechanics.** Row text in `docs/FEATURES.md` is authoritative.
- `AGT-44` is now **row 21 of `BETA.md` bucket 1** (it declared `Beta-gate (bucket 1)` earlier the same day but was never queued there).
- **Do not fold `AGT-47` into it.** `AGT-47` (filed here, bucket 1 row 20) is case 6's `forecast_draft` rendering hollow while its own upstream `theory_test` holds the figures. It fails `asked_metric_present` and would still fail after every trace of platform language is removed. It is **not root-caused** — either a Skill-instruction gap or cross-step content loss via React state (`CHI-47`/`CHI-70`). Diagnose before scoping.

**Standing instruction from this session:** after any bucket-1 fix, re-run the same 3 pre-regression cases (~9 min) before committing to a full 24-case run (~70 min at the observed rate). A newly-found row is bucket-1 only if it fails a pre-regression case; Post-beta otherwise.

**Known live hazard:** the free-tier 100-deploys/day cap was exhausted 2026-07-29. `check-deploy-current` reported no build was ever triggered for `8b7549f`, and manual triggers return 402 on this plan. A code fix pushed today may silently not deploy — verify with `node scripts/check-deploy-current.js --worktree=<path>` before trusting any QA result.

**Open, carried forward (observed, deliberately not filed — John scoped this session to logging the pre-regression result):** five rows declare a beta bucket but appear nowhere in `BETA.md` — `AGT-43`, `CHI-89`, `DAT-12`, `LOG-114`, `LOO-27` — and three declaration formats are live in `FEATURES.md`, so no grep returns the real beta set.
