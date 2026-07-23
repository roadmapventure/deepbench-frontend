# design-har-9-0723

**Started:** 2026-07-23
**Worktree:** `C:/Projects/deepbench-frontend/.claude/worktrees/design-har-9-0723`
**Branch:** `session/design-har-9-0723`
**Type:** Design
**Version claimed:** v6.3.131

**Topic:** `HAR-9` (Task Success Rate) + `HAR-11` (Observability) — Eleanor Voss — The Librarian's `library-catalog-intent` failing structured-output validation, surfacing to John as "Something went wrong reaching Marcus."

**Status:** Kickoff doc written — `docs/kickoffs/v6.3.131-HAR-9-truncation-aware-parse-retry.md`. Coding session not yet spawned.

**Key finding this session (reshaped the fix):** there are two failure modes behind one identical error. Verified live in `durable_hops` — `library-catalog-intent` (28) and `agent-selection-intent` (2) are `max_tokens` truncation; `qg-review-intent` (5) is a genuine omission with complete, well-formed output. `AA-182`'s corrective retry ("include every field") is right for the second and actively harmful for the first, re-issued into the same ceiling — 0 recoveries in 30. Fix = generic `stop_reason` read (zero references existed platform-wide) + branch the correction text + `library-catalog-intent.max_tokens` 1500→3000. So `HAR-11` is not a separate session; it re-merges with `HAR-9`.

**IDs claimed this session (atomic):** `HAR-12` (self-healing retry at raised ceiling, deferred), `HAR-13` (11 profiles sit at `max_tokens` 1500 — right-size *after* `HAR-9` produces truncation labels), `SCA-3` (Owen Marsh — The Proofreader omits `final_answer`, separate root cause), `SCA-4` (redundant `citations` re-emission in `library-catalog-intent`'s schema).

**Open:** coding session, then this session self-verifies the Manual QA checklist (two-phase live test: pre-bump proves the truncation label, post-bump proves the answer succeeds).
