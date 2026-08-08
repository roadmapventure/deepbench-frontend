# `SES-57` — Article Context Resolver / news-card payload parity

Detail moved out of `docs/FEATURES.md`'s row 2026-07-29 (`design-ses-57`) per `CLAUDE-DESIGN.md`
step 9's 2,000-char cap. Session narrative: `docs/SESSIONS.md`, `S-SES-57-design / S-SES-57`
(v6.3.230). Kickoff: `docs/kickoffs/v6.3.230-SES-57-article-context-resolver.md`.

## Original finding (filed 2026-07-29, `log-109-followup`, self-caught same day)

`Beta-gate (bucket 1)`. The test engine stopped matching the screen the moment `CHI-91` shipped —
`scripts/chi-true-regression.mjs:540` sent 3 `extraFields`, the screen sent 4. The test engine
spread `{article_content, article_source, article_url}` into regression test #24's
answer/gate/display calls; `analyzeNewsCard()` also spread `article_unavailable_reason`. So on a
failed article fetch the test engine asked Marcus Webb — GEO CSO Expert a question the product would
never ask: he got no reason, so he could not produce the gap acknowledgment `ci-answer-intent`
instructs, and the judge scored an answer the shipped screen does not generate. Bucket 1 because
regression test #24 **is** a bucket-1 gate. Same drift `SES-31` (regression-payload-parity) was
created to prevent, recurring because nothing structurally coupled the two payloads.

## Two corrections to the row's own stated fix (measured 2026-07-29, before any code)

1. **"Add the field to `extraFields` (one line)" was a no-op.** The test engine's non-OK branch
   (`:535–537`) never read the response body, so it never captured the route's `primary_failure` —
   there was nothing to put in the field. And `api/prompt/db-assembly.js` filters
   `null`/`undefined`/`''` out of `task_context` before the prompt is assembled, so an empty field
   is byte-identical to an absent one. Adding the key alone changed nothing while looking fixed.
2. **A second divergence, same path.** On an outright throw the screen fails open and still submits
   with a reason (`MarketIntelligenceScreen.jsx:4060–4061`); the test engine had no `try` around its
   fetch (`:526`), so the case died as an infra death and Marcus was never graded.

## Scope as shipped

New platform service **Article Context Resolver** — `src/lib/newsCardContext.js`,
`platform_services` slug `article-context-resolver`, layer `frontend`, `utilizes_model: false`,
`tracking_status: machinery` (executions are already counted under Article Extractor; a second
count would double-count), `match_keys: []`, `sort_order: 87`,
`display_note: "Counted under Article Extractor"`.

It owns **all five** steps both copies duplicated — POST, read response, decide success, determine
*why* on failure, assemble payload — not just payload assembly. Centralizing assembly alone would
have left steps 3–4 duplicated, which is exactly where the drift happened. John's *"you are
creating a service and still have to update 4 files? what are you centralizing then?"* is what
caught that. The endpoint is a parameter (screen relative, test engine absolute).

3 files: the new module, `MarketIntelligenceScreen.jsx`, `scripts/chi-true-regression.mjs`. Net less
code; the fail-open divergence was deleted rather than fixed. A per-module source-scan guard was
**considered and dropped** — enforcement, not centralization, and the narrow-symptom version of
`LOG-116`'s drift sweep.

## QA result — 8 PASS / 2 BLOCKED / 2 partial, row deliberately left open

Verified: suite **23/23**; build clean; `platform_services` 33 rows with the row as specified; both
callers import the resolver and neither retains a payload copy; no `api/` file touched. Live at the
seam against the deployed route (deploy gate PASSED first): success → `reason: null`; a real 400
with no `primary_failure` → the `{http_status: 400, extraction_outcome: "not_attempted"}` fallback,
a real classified object not a bare boolean; an unreachable endpoint → `{http_status: null, …}`
returned rather than thrown.

**Blocked:** QA 6 (Marcus states the gap) and QA 7 (no `infra_death`). `CHI-95` means the route
practically never returns non-OK, so the ARTICLE UNAVAILABLE clause is unreachable; `SES-62` means
regression test #24 dies before the article step. **So this fix is correct but its live impact is
latent — a prerequisite for a valid bucket-1 news-door gate, not by itself a restoration of one.**
Close when `SES-62` then `CHI-95` land and QA 6/7 can actually run.

## Three spec errors of mine, all caught in QA rather than shipped

1. `platform_services.functions` renders as visible product copy (`AIActivityPanel.jsx:71`'s
   `functions.join(' · ')`), so a raw JS identifier there is the `AGT-38` defect class. All 32
   existing rows use prose; the coding agent used prose and was right.
2. `finalizeCase`'s **third** call site (`:645`) also needed the new field, or it would have been
   `undefined` forever — my verification checklist named only two locations. Same "no-op that looks
   fixed" class the kickoff's own correction 1 warned about.
3. My DESIGN RULES said the new row renders "Not tracked at this time." `machinery` renders
   `displayNote` → "Counted under Article Extractor"; the "Not tracked" string is the `untracked`
   branch.
