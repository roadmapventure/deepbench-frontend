# LOG-64 — POC 1: Signature → Pattern Join (working finding, IN PROGRESS)

**Session:** `design-log-64-0724` · POC/discovery · John live. De-risks the LOG-38 signature model
(`ARCHITECTURE.md §19k`) before the build. Spike/throwaway — no production code ships; POC SQL is
temp-only and cleaned up. At close-out: append the locked field order to `§19k` + record the join result.

---

## 1. LOCKED this session — signature field order (full-attribution ranking)

**Principle (John, decided live):** rank fields by **intrinsic telling-ness assuming full attribution** —
"*if* this field is present, how much does it collapse the pattern space?" — NOT telling × coverage.
Rationale: a null field **drops out of the signature entirely**, so coverage is already handled by
removal; penalizing sparsity again in the stored order double-counts the same absence. Under full
attribution, **facts are proof, config is only propensity → facts rank above config** (below the intent
anchor). This is why John's original facts-high instinct was right; the earlier errors were field-level,
not placement.

| Rank | Field | Zone | Rationale |
|---|---|---|---|
| 1 | `intent` (from `feature`) | anchor | Pins the **primary** pattern. Always #1. |
| 2 | `retrieval_method` | fact | Proves RAG in/out — dissolves false-`rag` (LOG-42). Highest marginal value in our data. |
| 3 | `tool_calls` | fact | Proves tool-use / delegation / function-calling. |
| 4 | `gated_subroutine_fired` | fact | Proves Guardrails. |
| 5 | `sub_calls_chained` | fact | Proves Prompt Chaining. |
| 6 | `retrieved_chunk_ids` (count) | fact | Refines RAG (augmented vs empty). |
| 7 | `assembled_skill_slugs` (k→i→f) | config | Structural backbone; supporting patterns; survives history. |
| 8 | `capability_slug` | config | Container / context. |
| 9 | `traits.schema` | config | Structured-output propensity. |
| 10 | `traits.source` | config | RAG propensity (redundant-ish with #2). |
| 11 | `input_references_other_deliverable` | fact | Cross-deliverable; niche contingent. |
| 12 | `self_reported_claims` | fact | Softest evidence — lowest trust even when present. |
| 13 | `traits.intent_allowlist` | config | Weak constraint. |
| 14 | `execution_type` | config | Near-zero variance. |
| 15 | `trace_id` | plumbing | Join key only. |

**Two locked caveats on the order:**
1. "Attributed fields move up by default" **requires the stored signature be an ordered projection**
   (canonical-ordered, gaps-removed array/tuple of present fields) — NOT a bare `jsonb` object, which has
   no user-visible key order. This is a concrete **LOG-67** representation decision, separate from the
   `jsonb` matched by `@>`.
2. The order is a **diagnostic + canonical-aggregation-key aid, not the matcher.** `@>` is
   order-independent (proven in §3 below). Get it directionally right (facts-before-propensity, plumbing
   last); do not over-perfect — no single global order is optimal for every pattern.
3. Facts-over-config holds for **contingent** patterns only; the **primary/structural** pattern is
   provable from `intent` + config alone (backfill/history) — which is why `intent` is #1 and
   `assembled_skill_slugs` stays upper-middle, not at the bottom.

## 2. Grounding — signature built on a real row (id=19329)

`ai_activity_log.id=19329` · `feature='project-manager:agent-selection-intent:depth1'` · `agent_id=michelle`
· `ai_type=agent-turn` · `patterns_used=['rag','structured-output']` (the false `rag`) ·
`call_facts={'tool_calls':['agent-selection-intent']}` (thin — agent-turn rows carry only `tool_calls`).

Real config-half (capability `project-manager`, behavior/identity stripped, skills k→i→f):
`capability-registry-knowledge` (k), `pm-roster-knowledge` (k, `traits.source=roster`),
`agent-selection-intent` (i, `traits.schema` present). `execution_type=ai`.

Fact-half is null except `tool_calls` — **expected**: Request Routing is a structural/config-pinned
pattern, so it must decode from the config-half alone. That is exactly what the POC proves.

## 3. POC RESULT (run 2026-07-24, row 19329, all inline CTEs — nothing persisted)

Criteria attached to the real `request-routing` gold row: `{"intent":"agent-selection-intent"}`.

| Check | Result |
|---|---|
| derived_pattern | **Request Routing** |
| `sig @> criteria` (match) | **true** |
| order-independence (2-key criteria, both textual orders) | **true / true**, and the two jsonb literals compare `=` |
| RAG negative (`sig @> {"retrieval_method":"similarity-search"}`) | **false** (null fact-half → false-`rag` dissolves) |

**Conclusion: mechanism de-risked.** signature→pattern join works; `@>` is empirically order-independent
(confirms §1 caveat 2); a structural pattern resolves from the config-half anchor alone on an all-null
fact-half — which is the false-`rag` fix in miniature.

## 4. REQUIREMENT FOUND BY THE POC (feeds LOG-67 — "did we miss a requirement" gate)

The naive signature-builder pulled **every** skill profile on the capability, so `assembled_skill_slugs`
leaked **`work-order-decomposition`** — the *sibling intent* on `project-manager` that did NOT fire on this
agent-selection call. Two consequences:
1. **Incorrect** — records a skill not assembled for this call.
2. **Non-discriminating** — `agent-selection-intent` and `work-order-decomposition` calls would produce an
   identical `assembled_skill_slugs`; only the `intent` anchor keeps their signatures apart.

**LOG-67 requirement:** the signature's intent-type skill must be scoped to the **fired** intent (match on
the call's `intent` slug); knowledge/format skills all included; behavior/identity stripped. Corrected value
here: `[capability-registry-knowledge, pm-roster-knowledge, agent-selection-intent]`. Join still matches
(anchor untouched).

**Corrected re-run confirms it (2026-07-24, row 19329):** with the intent-type skill filtered to the fired
intent (`where skill_type in ('knowledge','format') or (skill_type='intent' and slug = <fired intent>)`),
`assembled_skill_slugs = [capability-registry-knowledge, pm-roster-knowledge, agent-selection-intent]`,
`sibling_intent_leaked = false`, `match_routing = true`. Fix is one WHERE clause; zero effect on the match.
This is the concrete scoping LOG-67's config-snapshot must implement.
