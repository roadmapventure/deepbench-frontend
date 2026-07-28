# RUNBOOK — 23-Question End-to-End Regression (post-HAR-17 baseline)

> **Scope note (2026-07-28, John):** this runbook is **superseded as the general CHI regression** by `CHI-TRUE-REGRESSION.md` (`SES-29`) — this one measures harness survival (a question "routed to Forecast" counts as terminal), which is not an acceptance test. It remains valid only as the HAR-17-specific recovery-census procedure and the record of the 2026-07-28 baseline run.

**Purpose.** First measured baseline after HAR-17 (Task Success Rate) shipped (v6.3.181–183, 2026-07-28): run John's standing acceptance test — the 23 CHI questions — against the dev deploy and census three things: (1) user-visible failures (expected ≈ 0), (2) automatic recoveries fired (countable for the first time via `durable_hops.recovery_ledger`), (3) HAR-14-class present-but-empty holes in this run's own deliverables (becomes the opening evidence for HAR-14's design session — read that row's **binding design constraint** before drawing conclusions). Platform token cost ≈ $3 (mostly Haiku input). This is an execution/census session — **no code changes**; any driver model is fine (Sonnet recommended).

**Setup.** Normal session start per `CLAUDE.md` → `session-setup` skill (own worktree from `origin/dev`, `.env.local` copy, inflight marker staged). Read this runbook from your worktree, then execute.

## 1. The 23 questions

They are the CHI screen's example-question set: the constant in `src/screens/MarketIntelligenceScreen.jsx` backing the 3 visible suggestions + the "BROWSE 20 MORE EXAMPLE QUESTIONS" list (grep `BROWSE` / the array near it). Use all 23 verbatim, sequentially.

## 2. What "end-to-end" means here

Mirror the server-call sequence the screen's own `runIntentPipeline`/`runQaWithQualityGate` makes — read those functions first and replicate their calls faithfully (routing → qa → gate → display, with the same params, `format_skill_profile_slug`, `display_agent_id`, `tenant_id: 'global'`), **including the continue loop**: any `{status:'in_progress', job_id}` body → POST `{action:'continue', job_id}` until terminal; recovery continues carry a `recovery` payload — count each one (that is census #2, question-attributable). Endpoint: `POST https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app/api/capabilities/execute` with header `x-vercel-protection-bypass` (value in `docs/ENV-VARS.md`; also present in prior kickoffs' test sections — grep the repo). Record per question: terminal status, wall time, `trace_id`, recoveries seen, error text if any. Sequential, one at a time (~1–3 min each, ~45–75 min total); do not parallelize (would distort the overload/recovery census). This measures the harness pipeline end to end; the client-render dimension was QA'd separately in S-HAR-17c.

## 3. Post-run censuses (SQL via Supabase MCP, project `rallojeqnkgtxgsdsnqm`, window = run start → end)

```sql
-- (a) surfaced failures by class
SELECT left(error,80) AS err, count(*) FROM durable_hops
WHERE status='failed' AND created_at BETWEEN :run_start AND :run_end
GROUP BY 1 ORDER BY 2 DESC;

-- (b) recoveries fired (should reconcile with the recovery payloads counted in §2)
SELECT count(*) AS rows_with_recovery, sum(jsonb_array_length(recovery_ledger)) AS total_recoveries
FROM durable_hops
WHERE created_at BETWEEN :run_start AND :run_end AND jsonb_array_length(recovery_ledger) > 0;

-- (c) HAR-14 empty-leaf scan on this run's deliverables (top-level + one nested level)
WITH recent AS (
  SELECT id, content FROM deliverables
  WHERE created_at BETWEEN :run_start AND :run_end AND jsonb_typeof(content)='object'
), leaves AS (
  SELECT r.id, kv.key, kv.value FROM recent r, LATERAL jsonb_each(r.content) kv
), empties AS (
  SELECT id, key || ' (top)' AS k FROM leaves WHERE value='null'::jsonb OR value='""'::jsonb
  UNION ALL
  SELECT l.id, l.key || '.' || kv2.key FROM leaves l, LATERAL jsonb_each(l.value) kv2
  WHERE jsonb_typeof(l.value)='object' AND (kv2.value='null'::jsonb OR kv2.value='""'::jsonb)
) SELECT k, count(*) FROM empties GROUP BY k ORDER BY 2 DESC;
```

Census (c) caveat — most empties are **legitimate** optionals, measured 2026-07-28: `missing_skillset`, `extracted_hypothesis`, `guardrail.rule_violated/reason`, `review_reason`, `recommended_capability_slug/agent_id`, `eval.critique`, `triage*`, and `final_answer` on the quality-gate echo shape (null on pass, by design). The HAR-14-class signal is empties in **user-rendered** fields — the 14-day precedents were `complicates.text`, null citation `chunk_id`, empty `key_data_points`. Judge each hit by whether it renders as a hole, and screenshot-equivalent it (deliverable id + field) rather than just counting.

## 4. Filing results (before the session ends)

- Append a dated run-report section to `docs/SESSIONS.md`: per-question outcomes table (one line each), the three censuses, reconciliation of §2's counted recoveries vs census (b).
- Any HAR-14-class hit: append the evidence (deliverable id, field, question) to the `HAR-14` row in `docs/FEATURES.md` — respect its binding design constraint's framing; do NOT propose a validator patch here.
- Any genuinely new failure class: new row via the atomic `feature_id_counter` (`session-setup` skill §3b) — never read-and-increment.
- Expected-result yardstick (from `S-HAR-17-design`'s live math): ≈85–90% odds of zero surfaced failures; a couple of silent recoveries would be normal; ~1-in-5 odds of one HAR-14-class hole. A surfaced failure is not automatically a bug — check its class honestly (a real 400 SHOULD surface).
- Close out per `session-setup` (push `HEAD:dev`, delete inflight marker, remove worktree).
