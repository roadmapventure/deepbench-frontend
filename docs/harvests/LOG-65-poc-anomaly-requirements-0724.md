# LOG-65 — POC 2: Anomaly + Requirements Validation Gate (DONE)

**Session:** `design-log-65-0724` · POC/discovery · John live · 2026-07-24 → 2026-07-25.
De-risks the LOG-38 signature model (`ARCHITECTURE.md §19k`) before the build by running the
full anomaly set through the LOG-64 join and settling the open `criteria`-shape question.
Spike/throwaway — no production code ships; all POC SQL was inline CTEs, nothing persisted.
Outcomes appended to `§19k`; this doc is the working detail.

---

## 0. Verdict

The gate **passes.** Running the anomalies through the signature surfaced exactly one missed
requirement (the intent anchor was spec'd assuming every row is an `agent-turn` row), fixed by
adding **one signature field (`model_modality`)**. The `criteria`-shape question is settled:
**a bounded three-operator set + Shape B (one gold row per pattern, `intent in [...]`)**. Going
forward, unmatchable = **0**. Legacy pattern naming is still fully hardcoded and live (motivation).

---

## 1. The anomaly gate — result per anomaly

| Anomaly | Row class | Result |
|---|---|---|
| **LOG-42** (`agent-selection-intent` false `rag`, Michelle Manning) | agent-turn, intent in `feature` | ✅ dissolves — proven by LOG-64 (row 19329), re-confirmed |
| **LOG-53** (Eleanor Voss `library-catalog-intent` `rag`, row 19158) | router/envelope — `feature='request-receivable'`, intent in `call_facts.tool_calls` | ✅ dissolves, **but** exposed that the anchor isn't in `feature` for this class |
| **LOG-59** (`lib/rag.js`/`conversations.js` embedding rows) | raw embedding subroutine — `feature='knowledge-retrieval'`, `call_facts=null`, `trace_id=null` | ⚠️ no signature derivable at all → drove the `model_modality` fix |

**Root finding:** the signature's #1 anchor — `intent`, sourced "from `feature`" — is a real intent
slug **only for the 7,136 `agent-turn` rows**. `feature` breakdown across 19,352 rows:

| Anchor availability | Rows | tagged `rag` |
|---|---|---|
| agent-turn compound (`cap:intent:depth`) — intent in `feature` | 7,136 (37%) | 1,293 |
| router/other — intent recoverable from `call_facts.tool_calls` | 82 (0.4%) | 27 |
| no intent anchor at all | 12,134 (63%) | 4,567 |

But "63% unclassifiable" was **too alarmist** — that bucket is three different populations (see §2).

## 2. Class-3 is three populations, not one — separated by fields NOT in the original signature

`model`, `output_tokens`, `trace_id` cleanly split the 12,134:

| Signal (was not in signature) | Sub-population | Disposition |
|---|---|---|
| `model = text-embedding-*` / `output_tokens = 0` | **1,346** raw retrieval subroutines (LOG-59) | the genuine gap → **fixed by `model_modality`** |
| `trace_id` present (historical envelope) | ~7k pre-capture rows | backfill / trace-recover (`LOG-69`) |
| `model = null` | 3,635 deterministic (0 `rag` post-capture) | correctly never a pattern (`model_modality='none'`) |

Three worked class-3 examples (live rows): `19381` Michelle `similarity`/`knowledge-retrieval`
(embedding, no intent, no trace); `19374` Eleanor `librarian` (embedding, `the_library` path);
`19035` Marcus `channel-intelligence` envelope (`feature=request-receivable`, generative,
`trace_id` present → intent recoverable via the trace sibling).

## 3. The one new signature field — `model_modality` (16th field)

- **Source:** existing `ai_activity_log.model` column (already written on 100% of model-bearing
  rows: 14,391 generative + 1,346 embedding populated; 3,635 null = the deterministic calls).
- **Trigger to populate:** none new — `logActivity()` already writes `model`. `model_modality` is a
  pure **read-time derivation** (like the pattern name itself), NOT captured, NOT stored in
  `call_facts` (re-storing a derivation of a frozen column would duplicate).
- **Rule:** `text-embedding-* → 'embedding'` · `null → 'none'` · else `'generative'`. Verified total
  and unambiguous against every model value present.
- **Intention:** the deterministic discriminator between a mechanical retrieval sub-step and an
  agentic generation. Lets one gold row (`criteria: {model_modality: embedding}` → "Vector Embedding
  / Retrieval Subroutine") name the 1,346 orphans honestly AND structurally forbid any generation
  pattern from matching a non-generative row — killing false `rag` positively, not by omission.
- **Rejected candidates:** `output_tokens` (leaky — 3,468 generative rows also 0), raw `model`
  string (versioned/high-churn), `ai_type` (overlaps `capability_slug`; no marginal signal),
  `latency_ms`/`cost_usd`/`knowledge_tier`/`task_id` (performance/plumbing). `trace_id` is already
  field #15 — its issue is null *population* on orphans, not absence.
- **Edge to guard:** `model_modality='none'` assumes null `model` = deterministic; a real generation
  shipped with `model` unlogged would misbucket. Clean today; correctness rides on `model` being
  logged wherever a model runs.

## 4. Coverage with the 16-field signature (19,372 rows)

Excluding 3,635 not-applicable (`model_modality='none'`, ran no AI): **15,737 real AI calls.**

| | Post-capture (forward) | Historical | Total |
|---|---|---|---|
| A. matchable — intent anchor | 191 | 7,043 | 7,234 |
| B. matchable — embedding (NEW via `model_modality`) | 33 | 1,313 | 1,346 |
| D. **not** matchable — generative, no intent, no facts | **0** | 7,157 | 7,157 |

**Going forward: 0 unmatchable.** The 7,157 are 100% historical; of them **2,718 recover via a
`trace_id` sibling** (LOG-69 backfill), and the rest were further recovered by capability:

- **3,042** have `ai_type` = a real `capability_slug` → capability config derives their supporting
  patterns (≈ what they display today). *2,988 currently show a legacy label; blanking them without
  capability backfill is a visible regression.*
- **1,085** are `guardrails-check` → classify as Output Guardrails (going forward via the
  `tool_calls:['guardrails_check']` fact; historically via `ai_type` in backfill). All 1,085 show a
  label today.
- **~312** genuine long-tail (`goal_suggestion`, `reflect`, `synthesis`, `planning`, `test-*`) — the
  **permanent unclassifiable floor**; of these **182 are already blank today**, ~130 show a
  hand-typed literal. State it out loud in LOG-69, never silently drop.

**Net floor ≈ 300 legacy/test rows (~2% of AI history), none ever governed-named.**

## 5. Legacy naming is hardcoded AND still live (motivation, not just history)

`request-receivable.js:666` on every new row today:
```js
const patternsUsed = Array.from(new Set([
  ...buildPatternsUsed(isJson, guardrailsRan, delegation_occurred, enrichDebug.rag_retrieved === true),
  ...(enrichDebug.reflect_ran   ? ['reflect'] : []),
  ...(enrichDebug.synthesis_ran ? ['intelligent-synthesis'] : []),
  ...(usedWebSearch             ? ['tool-use'] : []),
]));
```
`buildPatternsUsed()` (`:354`) maps **real runtime booleans** to **hardcoded, coarse** names:
`isJson → ['structured-output','tool-use']`, `guardrailsRan → ['prompt-chaining','guardrails']`
(so `prompt-chaining` is asserted merely because guardrails ran), `ragRetrieved → ['rag']` (the
known-false one). The long-tail names are per-path literals (`['reflect']`, `['intelligent-synthesis']`,
`['embeddings']`). **Nothing ever named these in the governed sense.**

- **Written to:** `ai_activity_log.patterns_used`.
- **In the signature?** **No** — deliberately. The signature reads `feature` + `call_facts` + `model`
  + config tables; never `patterns_used` (§19k rule #1; `.claude/rules/ai-pattern-signature.md`).
- `call_facts` (LOG-37) was added **alongside** `patterns_used`, not replacing it (`:676`: *"the
  patternsUsed block above is deliberately untouched"*). The false `rag` is still accruing on new
  rows — the write-path fix `LOG-63` has not shipped.

## 6. Criteria-shape decision — SETTLED (three POC checks, live rows)

| Test | Row | Result |
|---|---|---|
| **1. Merged pattern** — `agent-selection-intent` AND `ci-routing-intent` → Request Routing | 19382 + 19355 | ✅ both resolve, under **both** shapes (A two-rows/`@>`: true/true; B one-row/`in`: true/true) |
| **2. RAG-positive** — real retrieval row → RAG | 19384 (`mixed`, 4 chunks) | ✅ **only via operator** — `@> {"retrieval_method":"similarity-search"}` = **false** (value is `mixed`); `chunk_count > 0` = **true** |
| **3. Multi-pattern set** — one rich row → primary + supporting | 19384 | ✅ {Request Routing (primary), Output Guardrails, RAG (supporting)}; Function-Calling negative control excluded |

**Decisions:**
1. **`criteria` is `jsonb` matched by a BOUNDED three-operator set** — not pure `@>`. Test 2 is
   decisive: real retrieval logs `retrieval_method='mixed'`, so equality misses it; RAG needs
   `retrieved_chunk_ids > 0`. Operators: **`@>`/equality (presence)**, **`in` (enumeration)**,
   **numeric `>` (contingent facts)**. Bounded is the constraint (§19k) — three operators, not an
   open expression language.
2. **Merged patterns = Shape B: one gold row per pattern, `intent in [...]`.** Both shapes are
   correct (Test 1); Shape A's only edge was "keep the matcher pure `@>`," which Test 2 already
   killed. Shape B single-sources name/definition/citation (one-edit rename) and matches Susan
   Smith — Trainer's actual merge act. Cost: the `in` operator, already in the required set.
3. **The Displayer returns a SET** (primary + supporting), matched by the generic operator matcher —
   no per-pattern code (Test 3).

## 7. Requirements handed to the build

- **`LOG-66`** (Pattern Definer / `criteria` column): implement the bounded three-operator set
  (`@>`/`in`/`>`); merged patterns authored as one gold row with `intent in [...]` (Shape B).
- **`LOG-67`** (Log Writer config-snapshot): add `model_modality` derivation (source
  `ai_activity_log.model`); plus LOG-64's two reqs (fired-intent scoping; ordered projection).
- **`LOG-69`** (backfill): capability-level naming for the 3,042 `ai_type=capability` envelopes and
  `ai_type='guardrails-check'` recovery; **explicitly state the ~300-row permanent unclassifiable
  floor** (no silent cap).
- **`LOG-63`** (write-path fix): still unshipped — false `rag` accrues on new rows until it lands.
