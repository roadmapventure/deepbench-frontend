# LAV-22 — typed-hop gap for internally-delegated completions: measured findings

## Original filing (2026-08-04, `design-lav-21` / S-LAV-21b live QA)

A capability completion that resolves via internal delegation (`LOO-010`) streams NO typed hop
event — the work's verdict is invisible to every stream consumer. Observed live on the
guardrail-demo run: Owen Marsh — The Proofreader's quality gate ran, internally delegated
(request_help → data verification), and finished — and no `proofreader` hop ever landed; the
Agent Routing drawer showed no Owen hop at all (bucket 5's "every agent displays ≥1 pattern in
its hop" cannot hold for a hop that doesn't exist), and the Assembly drawer's Verification stage
honestly dropped. Mechanism: `LOO-010` removed client-side crediting when a delegation resolves
the call; the delegation hops ARE visible, but the resolving capability's own typed completion
(verdict, critique) never streams. Fix belongs at the executor's event seam (§19q family — the
frame should carry what the execution produced), NOT client-side.

2026-08-04 (`design-lav-25`): also the missing carrier for §19s's narration accounts on
delegated resolutions — `LAV-25`'s clean run streamed zero `delegation_complete` frames, so
every account from a delegated completion has no frame to ride until this closes.

## S-LAV-28 (v7.0.61, 2026-08-07) — emit shipped, row NOT closed. Measured reason:

- The critique-path `delegation_complete` emit is now in `api/capabilities/execute.js` (correct
  §19p shape — credits the critique agent's own span, carries `account`, `viaTool: 'critique'`),
  added immediately after the critique dispatch resolves. It fixed a real pairing defect: that
  dispatch emitted a start frame with no matching completion anywhere in its resolution block.
- **But that dispatch is dead code against current data:** 0 of 65 `skill_profiles` rows set
  `traits.critique_capability_slug`. It is only sourced behind the
  `requires_human_confirmation` gate, and the only two rows with that gate
  (`data-escalate-intent`, `data-patch-intent` — Nadia Farouk — Data Expert's write path) both
  leave it null. So the new emit cannot fire on any run today's data can produce.
- **Owen's own path is not that path:** his review runs as its own top-level client call
  (`quality-gate` / `qg-review-intent`) from `runQaWithQualityGate()`
  (`MarketIntelligenceScreen.jsx` ~L1516), which streams typed hops normally — verified live
  on both 2026-08-07 QA runs (Console question 1 + CHI guardrail demo): Owen's hop appeared in
  the Agent Routing drawer with his critique text, and his §19s `account` rendered in the
  Assembly Verification stage and on the status line.
- **The 2026-08-04 symptom did not reproduce** on either 2026-08-07 run. The S-LAV-21b run's
  shape (a completion resolving via `LOO-010` internal delegation) has to be reproduced
  deliberately to (a) confirm which emit seam it actually misses, and (b) verify a fix streams
  the completion. The kickoff's own stop-line ("if Owen's case flows through a different
  uncredited resolution path, stop and report rather than patching a second site blind") fired
  correctly — the coding session stopped instead of guessing at a second site.

## What closing this now requires

1. Construct/trigger a run where a capability's `request_help` resolves the call internally
   (`LOO-010`'s path) — the S-LAV-21b guardrail-demo shape.
2. Observe whether its typed completion streams (it should now, if the path flows through the
   `delegationRequired` early-final emits at ~L742/~L761 — those carry `account` since
   S-LAV-28; if it flows elsewhere, that elsewhere is the real seam).
3. Bucket 5's bar: the resolving agent's hop appears with ≥1 pattern; the account rides it.
