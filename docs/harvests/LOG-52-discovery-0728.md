# LOG-52 Discovery 0728 — Verdict Evidence + Ready-to-Paste Session Prompts

> Companion to `ARCHITECTURE.md` §19l (the verdict + the four John-approved scopes, 2026-07-28).
> This file: the working evidence and the exact prompts to start each wave session.
> Read §19l first; it is the authority. This file is the convenience copy.

## Pre-authorization (John, 2026-07-28, verbatim: "approved — all four scopes")

Each session below runs design→code→verify→push **without a fresh walkthrough**, citing
`ARCHITECTURE.md` §19l — provided it stays inside its written scope. Anything outside the scope:
stop and ask John. Wave 1 = prompt 1 alone. Wave 2 = prompts 2, 3, 4 in parallel (no file/data overlap).

---

> **Reconciliation (2026-07-28, this session's rebase):** `LOG-38` shipped mid-discovery
> (v6.3.155 — view + AI Audit By Pattern; drawer split to `LOG-79`). Scope 1 is claimed as
> **`LOG-85`**; scope 2's remaining vehicle is **`LOG-79`**. Prompts below already reflect this.
> Every session: fetch/rebase dev first — this area has multiple concurrent sessions.

## Prompt 1 — Wave 1: LOG-85 — complete the shipped Displayer view

```
Work LOG-85 (Architecture): complete the shipped ai_call_patterns view per ARCHITECTURE.md §19l
scope 1 + the LOG-85 FEATURES.md row (pre-approved — no walkthrough needed; stop and ask only if
something outside that scope surfaces). LOG-38 itself is done (v6.3.155) — this is a completion
patch on its shipped view, not a rebuild.

Scope: the ai_call_patterns view (Supabase project rallojeqnkgtxgsdsnqm) currently assembles only
call_facts + derived model_modality. Add the two missing §19k derivations, nothing else:
(a) intent — parsed from ai_activity_log.feature, format `capability:intent-slug:depthN` (agent-turn
rows); rows whose feature carries no intent slug (e.g. the literal 'request-receivable', 802 rows)
get NO intent key (sparse-fact behavior, never a fabricated value).
(b) sub_calls_chained — true when the row's parent_span_id is not null OR its span_id appears as
another row's parent_span_id.
Matching stays pattern_criteria_matches(), unchanged. No pattern name may appear anywhere in the
view SQL (generic fact rules only). The view stays a plain view, never materialized (§19k locked).
Also update the two rollup views if they read the same assembly, and re-verify LOG-76's premise
(the matcher's `in` already does array membership — proven live: agent-handoff 105 rows via
{in:[delegate_to_agent]}); if confirmed, close LOG-76 with that evidence.

Verify (Category L, live): RAG count unchanged (~301 baseline, organic growth ok); prompt-chaining
becomes evaluable (its criteria references sub_calls_chained — expect a large over-broad count
(~827 baseline), which is CORRECT here; tightening its criteria is scope 3, NOT this session);
request-routing stays 0 until scope 3 re-authors it (its current criteria ANDs a tool_calls conjunct
that never co-occurs on classify rows — do not "fix" it here, that is Susan's, scope 3);
a spot-check row shows intent parsed correctly from feature.
Baseline numbers and evidence: docs/harvests/LOG-52-discovery-0728.md.
```

## Prompt 2 — Wave 2: LOG-79 — the Agent Routing drawer + capture-start boundary

```
Work LOG-79 (Architecture) per its FEATURES.md row + ARCHITECTURE.md §19l scope 2 (pre-approved —
no walkthrough needed; stop and ask only outside scope). Run only after LOG-85 (the view
completion) has shipped — verify that first. Note LOG-38-done (v6.3.155) already delivered the AI
Audit By Pattern slice; do not redo it.

Scope: the Agent Routing drawer reads pattern names from the ai_call_patterns view — completed
hops named by joining via trace_id/span_id; live in-flight hops show no pattern name (names exist
only once rows are written; by design, not a bug). Plus: both audit surfaces (drawer + the shipped
AI Audit section) state the capture-start boundary — fact classification begins 2026-07-23; rows
before it show the honest unclassified state (§19i corollary: generic fallback, no special-casing,
no alias mapping). The other legacy consumers (LOG-70's remaining 3) stay on patterns_used until
LOG-40 — do not touch them.
UI copy/visual treatment of the boundary label: propose it to John before shipping (UI appearance
is an explicit approval gate — the pre-approval covers the rewiring, not new visual language).
```

## Prompt 3 — Wave 2: Pattern Definer cleanup run (continues LOG-72)

```
Run Susan Smith — Trainer's criteria cleanup per ARCHITECTURE.md §19l scope 3 (pre-approved — no
walkthrough needed; stop and ask only outside scope). Run only after §19l scope 1 has shipped.

Scope, two patterns, via the amend path (lib/pattern-vocabulary.js reviewCandidate, live against
the dev preview with the x-vercel-protection-bypass header), definition-grounded ONLY:
(a) request-routing — re-author to the Shape B intent-list LOG-65 already locked
(intent in [agent-selection-intent, ci-routing-intent] — §19k "Merged patterns = Shape B"); the
current criteria's tool_calls conjunct never co-occurs with the classify row and must go. Requires
LOG-85's intent derivation to be live, else the criteria still matches 0.
(b) prompt-chaining — tighten: span-participation alone over-matches (~827 rows = every delegation
tree participant); Susan decides the distinguishing conjunct from the definition (candidate signal:
input_references_other_deliverable, the written integrate fact — but the choice is hers).
Hard rules: Susan receives ONLY the pattern's gold definition + the signature vocabulary — never
values sampled from ai_activity_log (the log never shapes criteria); direct criteria PATCHes are
forbidden (the two reverts noted in §19l were a breach, not a precedent); confirm web_search
actually fired on her turn (server_tool_use.web_search_requests >= 1) before trusting a citation.
Verify: request-routing matches >0 real rows via the completed view; prompt-chaining's new count is
bounded and disjoint-or-overlapping-for-stated-reasons vs agent-handoff; RAG/guardrails/handoff
counts unchanged.
```

## Prompt 4 — Wave 2: Historic backfill (LOG-69)

```
Run the historic signature backfill per ARCHITECTURE.md §19l scope 4 (pre-approved — no walkthrough
needed; stop and ask only outside scope) and LOG-69's own FEATURES.md row.

Scope: the intent-provability route (§19i extension, John-ruled 2026-07-24): backfill config-half
facts onto historical rows ONLY where the row's intent structurally pins them (e.g.
agent-selection-intent rows are structurally Request Routing). Contingent facts are NEVER invented
(no retrieved_chunk_ids, no retrieval_method on history — a lost retrieval stays lost). Provenance
marked per §19i (proven vs authorized-by-judgment). State the permanent floor (~300 legacy/test
rows, never governed-named) in the close-out. Verify: post-backfill, the view names the recovered
history; no contingent pattern (RAG) asserts on any backfilled-only row.
```

---

## Evidence captured this discovery (2026-07-28, all verified live)

- Live view def: `ai_call_patterns` = JOIN on `pattern_criteria_matches(call_facts || {model_modality}, criteria)` — modality derived in-view (`text-embedding-%` → embedding, null → none, else generative). Missing: intent, sub_calls_chained.
- `pattern_criteria_matches()` (IMMUTABLE plpgsql): bare scalar → `@>`; `{in:[...]}` → membership for BOTH scalar and array signature fields; `{">":N}` → numeric, array length for arrays. **LOG-76's "array-contains inexpressible" premise is disproven at match time** — agent-handoff matches 105 via `{tool_calls:{in:[delegate_to_agent]}}`.
- Side-by-side (current view sig vs. spec-complete sig, 1,751 fact rows): agent-handoff 105/105, output-guardrails 193/193, RAG 301/301, prompt-chaining 0/**827**, request-routing 0/0 (its tool_calls conjunct never co-occurs with the classify row — criteria defect, scope 3, not a view defect).
- `feature` values on fact rows: `request-receivable` (802), else `capability:intent:depthN` composites (e.g. `channel-intelligence:ci-routing-intent:depth0` ×37, `project-manager:agent-selection-intent:depth1` ×118). `feature` never equals a bare intent slug → §19k drift recorded in §19l.
- Coverage: 21,618 total rows; 1,751 with call_facts; capture start 2026-07-23.
- Consumers on legacy naming (grep, none read the view): `src/aiPatterns.js`, `AboutPanel.jsx`, `AIActivityPanel.jsx`, `useAgents.js`, `useAIActivity.js`, `MarketIntelligenceScreen.jsx`.
- Capturability pass (per-pattern buckets + code evidence file:line): bucket A (existing fields suffice) — RAG, prompt-chaining, react-loop, function-calling, llm-as-judge, request-routing; bucket B (one new generic fact, honestly available) — constrained-decoding (`output_schema_forced` from forced tool_choice, request-receivable.js:104/117); bucket C (platform does not perform; stays unclassified) — parallel-tool-calling (`disable_parallel_tool_use:true` unconditional, request-receivable.js:117), token-streaming (non-streaming Anthropic calls), hypothetical-document-embeddings, adaptive-retrieval-depth, browser-agent, self-consistency, self-verification-via-claim-questions, reflection, multi-agent-debate, persistent-advice-storage, persistent-user-context-memory, case-based-reasoning, few-shot-prompting; bucket D (would require a pattern flag — breaks guardrail) — none.
- Governance breaches this week, acknowledged for the record: 3 direct criteria PATCH reverts (bypassing Susan); 1 log-shaped criteria (request-routing's capability_slug version — since removed); agent-handoff's citation overwritten by an amend run (original promotion citation: OpenAI Agents SDK "Agent orchestration"; the promotion history in pattern_candidates preserves it). The orchestration/routing/handoff naming question stays Susan's/John's — LOG-51's path, not any session's unilateral call.
