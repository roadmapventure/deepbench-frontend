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

## Round 2 prompts — post-wave follow-ons (John-approved 2026-07-28, `log-52-0727` close)

Written after all four §19l waves shipped and were re-verified live (3,127 named rows; breakdown
below in "Round 2 evidence"). Prompts 5/7/8 carry the walkthrough in-prompt (stop and ask only on
contradicting facts); prompt 6 is a LIVE session with John — naming is Tier 3, nothing autonomous.

### Prompt 5 — Susan: LLM-as-Judge authoring + LOG-87 cleanup (~1,300 rows, zero code)

```
Continue LOG-72 (Architecture): Susan Smith — Trainer authors LLM-as-Judge criteria, plus the
LOG-87 (Architecture) cleanup. John approved this scope 2026-07-28 (log-52-0727 close, followed
the §19l scope-3 recipe); this prompt is the walkthrough — stop and ask only if live facts
contradict it. Data-only, via the amend path live against the dev preview
(x-vercel-protection-bypass header), same mechanics as the shipped scope-3 run.

(a) llm-as-judge — Susan receives ONLY: the gold definition, the signature vocabulary, and the
CONFIG description of the quality-gate intent (qg-review-intent's own skill_profiles method/
purpose — config is definitional, never log-sampled). She adjudicates whether that intent
structurally IS LLM-as-Judge (§19i intent-provability) and authors Shape B intent-keyed criteria
(precedent: request-routing's {intent in [...]}, LOG-65 locked). If she rules the intent does not
pin the pattern, record her reason and stop — do not force it.
(b) LOG-87: the stale pending pattern_candidates row (id 0caee7d5-6084-4a38-8253-7ef47b1fbc3d,
submitted_by log-52-0727-run) — resolve it through Susan's legitimate discard decision, never a
raw delete. Close LOG-87.
Hard rules: no values sampled from ai_activity_log; no direct criteria PATCH; confirm web_search
fired before trusting any citation. Verify: llm-as-judge count in ai_call_patterns (expect
~1,300 via qg-review-intent rows if she authors it); existing five patterns' counts unchanged.
```

### Prompt 6 — LIVE with John: rename path + orchestration/routing/handoff taxonomy

```
Discovery+design session WITH John live — nothing here is pre-approved to run autonomously;
naming is Tier 3. Two halves, in order:

(1) Build path for governed renames: LOG-51 (Architecture) is blocked because pattern_vocabulary
has no rename/supersede mechanism (§19i designed superseded_by; nothing reads/writes it; §19l
names this the last unmet seal condition). Design the rename decision for reviewCandidate
(mirroring the shipped amend precedent), walk it with John, kickoff, code, verify.
(2) With the mechanism live: Susan Smith — Trainer adjudicates the delegation-family taxonomy
from primary sources — today's agent-handoff row carries an orchestration definition (delegate,
await, integrate) under a vendor name that means the opposite (LOG-51's finding). The candidate
model John raised 2026-07-28: Orchestration (delegate + integrate), Request Routing (classify +
dispatch, no synthesis), Handoff (transfer control, no synthesis) — but the names and the split
are Susan's research + John's sign-off, never the session's own invention. Data readiness: the
integrate fact (input_references_other_deliverable) is captured and live; earlier measured split
of delegation calls: 75 integrated vs 94 not. Verify after: the renamed/split patterns' counts in
ai_call_patterns, and that historical rows re-derive under the new names automatically (the
self-cleanse §19l's verdict promises).
```

### Prompt 7 — Schema-forced capture (the 52% lever) + Susan authoring

```
Work LOG-77 (Architecture)'s first item: the schema-forced output fact — the biggest unclassified
lever (6,593 of 12,567 unmatched rows are request-receivable model calls, mostly forced-schema).
John approved this scope 2026-07-28 (log-52-0727 close); this prompt is the walkthrough — stop
and ask only if live facts contradict it. Standard design→code→verify loop.

Capture: one generic fact (e.g. output_schema_forced: true) written into call_facts on the
model-call write path when the call's tool_choice was forced to the schema tool — the exact
condition is buildCallBody()'s needsAutoChoice===false branch (request-receivable.js ~L104/117).
Generic call-shape property; no pattern name anywhere in code. Add the field to SIGNATURE_FIELDS
(lib/pattern-vocabulary.js) — the dead-field rule requires writer + allowlist land together.
NOTE (Tier 3, ask John once): this is the 17th signature field — present the proposed §19k
field-order placement to John before amending the locked order (precedent: model_modality's
LOG-65 insertion).
Then Susan (amend path, definition-grounded): Constrained Decoding keyed on the new fact. Offer
her Function Calling too but flag the capturability finding that it is near-universal on this
platform (likely non-distinguishing — her call to author or discard).
Verify: new rows carry the fact; constrained-decoding names real rows in ai_call_patterns;
history correctly stays unmatched on this fact (never backfilled — it is not provable there).
```

### Prompt 8 — LOG-68: the self-maintenance trigger (make the loop self-sustaining)

```
Work LOG-68 (Architecture) per its FEATURES.md row + ARCHITECTURE.md §19k self-maintenance
trigger + §19i Layer C. John approved this scope 2026-07-28 (log-52-0727 close). Design session
first — this one has real open design decisions; walk the design with John before kickoff.

Core: an unclassified RICH signature (LEFT JOIN miss with non-trivial facts) creates a
pattern_candidates row stamped source_ai_activity_log_id and invokes Susan Smith — Trainer to
name it. Async, off the critical path, never blocking a user response (§19i).
Design decisions to settle with John (not unilaterally): (1) dedup/rate-limit — 12,567 unmatched
rows already exist; the trigger must fire on NEW distinct signatures going forward, never sweep
history into 12k candidates (dedupe by distinct signature, cap invocations); (2) what counts as
"rich" (threshold); (3) whether LOG-78's structured missing-signal outcome (defer/needs_capture
decision + missing_signal field) ships with it or after — read LOG-78's row first.
Verify: a genuinely novel rich signature produces exactly one candidate + one Susan invocation;
a repeat of the same signature does not; empty-fact rows never trigger.
```

## Round 2 evidence (2026-07-28, post-wave, verified live)

- Waves shipped: `LOG-85` v6.3.161 (view completion; closed `LOG-76`), `LOG-72` v6.3.164 (Susan:
  request-routing Shape B; prompt-chaining 833→149 keyed on the integrate fact; `LOG-87` logged),
  `LOG-69` v6.3.165 (13,841 rows recovered; floor 374 legacy + 4,884 service), `LOG-79` v6.3.166
  (drawer on the view; `LOG-88` logged; John amended seal condition 3 — no user-facing boundary label).
- Live board: Request Routing 2,565 / RAG 312 / Guardrails 201 / Prompt Chaining 149 / Handoff 116
  = 3,127 named of 21,744 total; 12,567 signatured-unmatched (all generative); 6,050 no-signature.
- Unmatched top blocks: request-receivable 6,593; ci-answer-intent ~1,207; qg-review-intent ~1,300
  (the Judge lever); display/format intents ~1,100+; ws-news-search 216.
- §19 section numbering post-concurrency: §19l (this verdict) / §19m (Platform Services directory)
  / §19n (CHI journey steps) — no collision.

## Evidence captured this discovery (2026-07-28, all verified live)

- Live view def: `ai_call_patterns` = JOIN on `pattern_criteria_matches(call_facts || {model_modality}, criteria)` — modality derived in-view (`text-embedding-%` → embedding, null → none, else generative). Missing: intent, sub_calls_chained.
- `pattern_criteria_matches()` (IMMUTABLE plpgsql): bare scalar → `@>`; `{in:[...]}` → membership for BOTH scalar and array signature fields; `{">":N}` → numeric, array length for arrays. **LOG-76's "array-contains inexpressible" premise is disproven at match time** — agent-handoff matches 105 via `{tool_calls:{in:[delegate_to_agent]}}`.
- Side-by-side (current view sig vs. spec-complete sig, 1,751 fact rows): agent-handoff 105/105, output-guardrails 193/193, RAG 301/301, prompt-chaining 0/**827**, request-routing 0/0 (its tool_calls conjunct never co-occurs with the classify row — criteria defect, scope 3, not a view defect).
- `feature` values on fact rows: `request-receivable` (802), else `capability:intent:depthN` composites (e.g. `channel-intelligence:ci-routing-intent:depth0` ×37, `project-manager:agent-selection-intent:depth1` ×118). `feature` never equals a bare intent slug → §19k drift recorded in §19l.
- Coverage: 21,618 total rows; 1,751 with call_facts; capture start 2026-07-23.
- Consumers on legacy naming (grep, none read the view): `src/aiPatterns.js`, `AboutPanel.jsx`, `AIActivityPanel.jsx`, `useAgents.js`, `useAIActivity.js`, `MarketIntelligenceScreen.jsx`.
- Capturability pass (per-pattern buckets + code evidence file:line): bucket A (existing fields suffice) — RAG, prompt-chaining, react-loop, function-calling, llm-as-judge, request-routing; bucket B (one new generic fact, honestly available) — constrained-decoding (`output_schema_forced` from forced tool_choice, request-receivable.js:104/117); bucket C (platform does not perform; stays unclassified) — parallel-tool-calling (`disable_parallel_tool_use:true` unconditional, request-receivable.js:117), token-streaming (non-streaming Anthropic calls), hypothetical-document-embeddings, adaptive-retrieval-depth, browser-agent, self-consistency, self-verification-via-claim-questions, reflection, multi-agent-debate, persistent-advice-storage, persistent-user-context-memory, case-based-reasoning, few-shot-prompting; bucket D (would require a pattern flag — breaks guardrail) — none.
- Governance breaches this week, acknowledged for the record: 3 direct criteria PATCH reverts (bypassing Susan); 1 log-shaped criteria (request-routing's capability_slug version — since removed); agent-handoff's citation overwritten by an amend run (original promotion citation: OpenAI Agents SDK "Agent orchestration"; the promotion history in pattern_candidates preserves it). The orchestration/routing/handoff naming question stays Susan's/John's — LOG-51's path, not any session's unilateral call.

### Prompt 9 — LOG-77 slice: the verdict-gated-retry fact (unlocks Evaluator-Optimizer)

*(added 2026-07-28, `design-log-72b-0728` follow-up — John approved scope and this prompt verbatim)*

```
Work LOG-77 (Architecture)'s ninth item: the evaluation-verdict-gated-retry fact — Susan
Smith — Trainer's formal MISSING SIGNAL from the Evaluator-Optimizer adjudication
(design-log-72b-0728, v6.3.185; see LOG-72's row). John approved this scope 2026-07-28.
Standard design→code→verify loop; design session first — this one has a real open design
decision (below), walk it with John before kickoff.

Capture: one generic call-shape fact written into call_facts when a turn's delegation was
triggered by that same turn's failed evaluation — the "regenerate because the verdict said
fail" link that distinguishes a gated loop from a linear chain. Generic property of the
call, no pattern name anywhere in code. Add the field to SIGNATURE_FIELDS
(lib/pattern-vocabulary.js) in the same session — the dead-field rule requires writer +
allowlist land together. Also extend the SIGNATURE FIELD VALUE REFERENCE inside Susan's
pattern-vocabulary-review-intent skill row (data) so she can legally author against it.

THE OPEN DESIGN DECISION (settle with John, not unilaterally): how the harness knows a
delegation is verdict-gated WITHOUT capability-specific logic. The retry site lives in the
agent loop (a delegate_to_agent dispatched from a review turn whose own structured output
declared a failing verdict) — but reading qg-review-intent's schema fields by name in
execute.js would violate capabilities-are-data (.claude/rules/). Candidate shapes to
evaluate against §19b/§19d, neither pre-chosen: (a) a generic trait on the Skill declaring
its evaluation contract (which output field is the verdict), read generically like
traits.schema already is; (b) a generic marker derived from loop structure alone (delegation
whose task follows a self-declared block/fail in the same turn's quarantined
self_reported_claims). If neither survives the sniff test, stop and bring it back to John.

Tier 3, ask John once: the new field's placement in §19k's locked signature field order
(precedent: model_modality's LOG-65 insertion; output_schema_forced's Prompt-7 note).

Hard rules: no pattern name in the write path; no per-capability conditional; the fact is
contingent — NEVER backfilled onto history (§19i bounds; the ~1,425 existing qg rows stay
honestly unclassified). LOG-94 (Susan's stale Skill NOTE) is adjacent but stays its own
item — do not fold in without John.

Verify: a live quality-gate run that triggers a real regeneration writes the fact
(Category L — one live proof of the novel path); a run with no retry does not; existing
patterns' counts unchanged.

Then, separate cheap data-only session (same mechanics as design-log-72b-0728): a fresh
Evaluator-Optimizer promote candidate through Susan — she authors criteria with the new
field in her vocabulary, web_search-cited; expect the new gold row to name quality-gate
retry calls going forward only.
```
