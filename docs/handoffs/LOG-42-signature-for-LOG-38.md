# Handoff — The Log Event "Signature" (element B), for LOG-38

**From:** `design-log-42-0724` (LOG-42 anomaly discovery)
**To:** the LOG-38 session (Layer B — read-time pattern classification / display)
**Date:** 2026-07-24
**Status:** INPUT/FINDING. LOG-42's remediation is **blocked** on the LOG-38 decision below — do not scope LOG-42 remediation until LOG-38 lands it.

---

## Why this exists

LOG-38 began with one basis for naming a pattern at read time: **element A = intent + facts**. This session produced a second candidate basis: **element B = the "signature."** LOG-38 now has a fork it did not have at kickoff, and should decide it **before locking element A**.

## Element B — the "signature"

**Definition:** *the aggregation of platform data that deterministically decodes a row's AI patterns* — **agent-agnostic**. Composed of:

- **capability** (e.g. `project-manager`)
- **intent** (e.g. `agent-selection-intent`)
- **assembled skill profiles + their traits** (e.g. `pm-roster-knowledge` / `source: roster`; `capability-registry-knowledge` / `source: null`)
- **resulting retrieval methods** (direct-lookup / similarity-search / mixed)
- **output mechanism** (forced-schema-tool ⇒ function-calling)

**Key properties:**
- Derivable from **intent + current config** (intent → capability → skills → traits → methods), so it needs no per-row storage.
- **Agent-agnostic** — one signature can match rows across many agents (strip the agent, match the rest).

## Worked example — agent-selection (the 622-row LOG-42 anomaly)

**Signature:** `project-manager · agent-selection-intent · (roster-direct + knowledge_entries-vector) · mixed-retrieval · forced-schema-tool`

**Patterns this signature resolves to (Susan-confirmable):**
- **Request Routing** *(primary)* — the intent's `objective` matches the governed definition almost verbatim ("who should do this," `no_match` valid, does not do the downstream work).
- **Function Calling** — **not** Constrained Decoding. Mechanism is a forced schema tool (`tool_choice: {type:'tool'}`, `request-receivable.js:90–109`) **plus post-hoc required-field validation + retry** (AA-147) — which constrained decoding, by definition, would make unnecessary.
- **Retrieval-Augmented Generation** — **real.** `capability-registry-knowledge` (source `null`, no `intent_allowlist`) fires on every call (`db-assembly.js:64`) → `queryRAG` embeds the query and vector-searches `knowledge_entries.embedding` (`match_knowledge` RPC, threshold 0.3, scope agent — `lib/rag.js:7–61`). The roster read is **not** RAG (the `agents` table has no embedding column). **Honest caveat:** the vector search is over Michelle's **4** personal `knowledge_entries` at threshold 0.3, so it **often returns nothing** — "a vector search fired" is provable; "RAG augmented the answer" is Susan's adjudication.

**Evidence (all verified live this session):** `db-assembly.js:64` (AA-121 allowlist gate — both PM knowledge profiles have `intent_allowlist: null` ⇒ both fire); `skill_profiles.traits`; `lib/rag.js:7–61`; `agents` has no vector column; `knowledge_entries.embedding` exists, michelle = 4 embedded rows.

## The decision LOG-38 must make

1. **Runtime vs storage** to name a pattern.
2. **Which element:** A (intent + facts), **B (signature)**, or **both**.
   - *A alone:* works, but per-fact rule logic.
   - *B:* one `signature → pattern` rule covers all matching rows across all agents; derived live from current config ⇒ **self-healing** (behavior changes ⇒ new signature ⇒ no rule matches ⇒ re-adjudication).
   - *Both:* signature as the primary key, facts as the run-dependent refinement (e.g. task-intents like `ci-answer` where the signature alone does **not** pin the pattern and only per-call facts can).

## Open sub-question raised by LOG-42 (for LOG-38 to decide)

Should the `signature → pattern` rules be **Susan-curated** — i.e. Susan authors/owns the **Layer B rule store**, not only the Layer C vocabulary? §19i currently gives Susan **Layer C** (vocabulary/definitions) but is **silent on who authors Layer B rules**. Making Susan the rule-curator is a genuine architectural extension — a **new Susan capability**, sibling to her existing candidate-review — and likely its **own feature/item**, not automatically inside LOG-38's evaluator scope. LOG-38 should decide whether Layer B adopts this model; if yes, the Susan-rule-authoring capability is scoped separately.

## Dependency back to LOG-42

LOG-42's remediation of agent-selection — and every other structural-intent anomaly — is **blocked on LOG-38's runtime-vs-storage + element decision.** The remediation shape (stored rule vs runtime derivation vs per-row backfill) is entirely downstream of it.
