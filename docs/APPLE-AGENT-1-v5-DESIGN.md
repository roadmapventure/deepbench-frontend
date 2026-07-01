# Market Intelligence — v5 Agent-Driven Design
**Status: Design complete. Supersedes `APPLE-AGENT-1.md` (v1), `APPLE-AGENT-1-v2.md`, `APPLE-AGENT-1-v3-V5-SPEC.md` — all three retired, folded into this document.**
**Design session: Apple v5 Redesign (2026-06-30)**
**Reference mock: `docs/market-intelligence-v4.html` — center-screen content only (title, status, three columns). The simulated top/bottom nav in that file is a mockup convenience, not real — DeepBench's real nav is used instead.**

---

## WHY v5 EXISTS

v4 is a fully scripted UI mock — every "decision" in it (does an answer need review, what hypotheses get offered, does a complication override a theory, what gets learned) is a hardcoded JS conditional or static string. DeepBench's premise is that behavior comes from agent reasoning, not frontend if-statements. This document replaces every hardcoded interaction in v4 with a real, orchestrated, agent-driven pipeline — including the interaction *flow itself*, not just the content inside a fixed wizard.

---

## 1. PLACEMENT & ROUTING

- Three tabs: **Work | Bench | Market Intelligence** (additive — Work and Bench are unchanged)
- After the splash screen (SH-14), the app lands on **Market Intelligence** by default — not Work dashboard
- This supersedes `ARCHITECTURE.md` §8's routing table (`/` = Work dashboard); update at implementation to route `/` → Market Intelligence, Work dashboard moves to an explicit path
- Matches `FEATURES.md` SH-15, which already anticipated this

---

## 2. INTERACTION PHILOSOPHY

**The agent reasons and argues; the human declares intent and commits.** The agent never infers or auto-selects the human's intent on their behalf, especially for any action that writes to the Data Room. This is the one hard line in an otherwise fully agent-orchestrated flow:

- **Deterministic, by design (not "hardcoded wizard leftovers"):** intent confirmation, hypothesis selection/writing, and the final commit action (Discard / Track as Assumption / Make Permanent) — these are explicit human-decision affordances. Forcing an explicit human decision at consequential points is the entire point of HITL.
- **Agent-orchestrated:** whether an answer needs review, how many hypotheses get generated and what they say, whether a hypothesis is supported or complicated by evidence, whether a Data Room dispute is real, what gets consolidated into memory, whether a failure should suggest escalation. None of this is scripted.
- **Consequence-weighted confirmation:** non-destructive actions (Q&A, exploring a Theory) can proceed straight from agent classification. Data Room-writing actions (Forecast, Correct) always require an explicit human click.

---

## 3. THE INTENT MODEL

Five intents, classified fresh on every chat submission — this is the front door of the whole system, not a per-answer branch buried in a HITL panel:

| Intent | What it means | Consequence |
|---|---|---|
| **Q/A** | A genuine question | None — informational |
| **Run a Theory** | Director wants to test a hunch | None if discarded — exploratory |
| **Forecast** | Track a provisional assumption | Writes to the Data Room, `ingest_scope: provisional` |
| **Correct** | Assert a permanent correction to data or reasoning | Writes to the Data Room, `ingest_scope: permanent` |
| **Escalate** | Request deeper research | Writes new Data Room content |

**Approve is not a top-level intent** — it's a possible *response* within reviewing a flagged Q&A answer (the director confirms the original answer was fine), not a way of initiating a turn.

A director can enter Theory/Forecast/Correct/Escalate either by writing their own claim unprompted, or by starting from a flagged Q&A answer and picking/writing a hypothesis from there. Both paths converge on the same downstream calls.

---

## 4. THE SIX-AGENT ROSTER

All six are full DeepBench personas (agents.js entry, AVATAR_CFG, AGENT_PRONOUNS, Supabase `agents` row, Skill Profiles/Capabilities/traits — no hardcoded behavior per-agent, per the platform's founding principle in `ARCHITECTURE.md` §19).

| # | Agent | Replaces / absorbs | Job |
|---|---|---|---|
| 1 | **GEO CSO Expert** (CI-01) | Performance Strategist | Answers from the Data Room; classifies intent; conversational routing |
| 2 | **Forecast/Theory/Performance Expert** | Hypothesis Generator + Stress Test (orig. v3 spec Agents 2+3) | Generates hypotheses; stress-tests Theory/Forecast/Correct claims against evidence — "Performance" = domain scope (channel/program performance), not a distinct call |
| 3 | **Data Expert** (AG-19, expanded Data Builder) | Data Builder | Retrieval, ingestion, cleaning, updating, restoring. Owns Escalate execution and data-integrity patches |
| 4 | **The Proofreader** | Guardrail (PAT-13) + Eval (PAT-19) | Pre-display rule enforcement + quality scoring, unified |
| 5 | **The Intake Assistant** | Decision Maker (orig. Agent 6, deprecated) | Post-decision pipeline routing: commit triage, failure triage |
| 6 | **The Reasoner** (AG-20, Supreme Reasoner) | Supreme Reasoner | Memory Consolidation — synthesizes a committed correction into reusable institutional memory. Execution (embed + write) hands off to **Susan Smith (TR-08)**, the platform's existing Trainer agent — not duplicated here, see §5.10 |

**Display formatting** (Alex/Riley, existing platform Format Skill agents) renders all of the above — no new work, reuse existing pattern.

---

## 5. FULL SCHEMAS

**All 10 calls below route through the existing Prompt Service (Dan Bingham, PS-01) — DB Assembly → AI Enrichment — same as every other capability route on the platform.** Not an exception: per the founding principle (`ARCHITECTURE.md` §19), no capability route hand-assembles its own system prompt or hardcodes agent-specific conditionals — intelligence lives in Skill Profile traits (§5b), assembled generically. Dan's `agent_id` (`ps-01`) accompanies every one of these calls in `ai_activity_log`, same locked rule as everywhere else on the platform — his contribution is visible in the AI Audit for the Apple Channel build, not a silent utility.

### 5.1 GEO CSO Expert — Intent Routing (Haiku)
```json
// input
{ "message": "string", "conversation_context": "string" }
// output
{ "intent": "qa | theory | forecast | correct | escalate", "confidence": "high | medium | low", "extracted_hypothesis": "string | null" }
```
Extends the existing `checkRouting()` pattern (DB-09) to a new classification target. `extracted_hypothesis` pre-fills (never auto-submits) the hypothesis UI when a director writes a claim unprompted.

### 5.2 GEO CSO Expert — Q&A Answer (Sonnet)
```json
{ "answer": "string", "confidence_tier": "sourced | inferred | synthesized | na", "needs_review": true, "review_reason": "string | null", "citations": ["chunk_id", "..."] }
```

**The `needs_review` rule (resolved):** two independent layers, ORed together, not one call's self-report:
- CI-01 self-flags at generation time if the answer draws on synthesized/inferred data presented as an actionable recommendation (not just informational)
- Proofreader independently flags post-generation if any Eval rubric dimension scores below 3

### 5.3 Forecast/Theory/Performance Expert — Generate Hypotheses (Sonnet)
Trigger: CI-01 answer flagged `needs_review: true` and the director hasn't already supplied their own claim.
```json
// input: { "flagged_question": "string", "flagged_answer": "string", "review_reason": "string" }
// output
{ "hypotheses": [ { "id": "01", "text": "string", "rationale": "string" } ] }  // 2-4 entries, dynamic
```

### 5.4 Forecast/Theory/Performance Expert — Stress Test (Sonnet)
Trigger: director selects or writes a hypothesis — fires **before** commit (v4 bug: fired only after commit, too late to inform the decision).

**Output is a real analyst-style artifact — "Intelligence Review" — not three loose paragraphs and one fixed chart.** Routes through the existing Display Agent (Alex/Riley) via its "Recommendation mode: structured market intelligence card" format (`APPLE-DATA-ROOM-SOURCE-DATA.md`'s recovered original spec) rather than bespoke Market Intelligence screen rendering — same rule as everywhere else in the platform, display agents are the single source of truth for presentation output. This is a real dependency to build in S-APPLE-03, not just a frontend styling choice.

```json
// input
{ "hypothesis": "string", "intent": "theory | forecast | correct", "flagged_question": "string", "flagged_answer": "string", "prior_stress_test": { ... } | null }
// output
{
  "headline": "string",
  "supports":    { "text": "string", "citations": ["chunk_id", "..."] },
  "complicates": { "text": "string | null", "citations": ["chunk_id", "..."] },
  "consider":    { "text": "string", "citations": ["chunk_id", "..."] },
  "key_data_points": [ { "label": "string", "value": "string", "source": "string", "confidence": "high | medium | low" } ],
  "projected_state": [ { "metric": "string", "current": "string", "projected": "string", "unit": "string" } ],
  "override_warning": true,
  "confidence": "high | medium | low"
}
```
- `headline` — one-line bottom-line verdict, scannable before the detail
- `key_data_points` — structured, sourced stats (mirrors the Display Agent's existing `KEY DATA POINTS` field, not a new pattern)
- `projected_state` is now a **dynamic array**, not a fixed 2-metric object — the model decides which metrics matter for *this* hypothesis and how many (a training theory surfaces different numbers than a co-op-budget theory). Column 2 renders however many come back, not always three bars. Still must never say something the `supports`/`complicates`/`consider` text doesn't already say — an extension of one conclusion, not an independent guess. Closes the `chartData` gap (v4 hardcoded a lookup table keyed to hypothesis index).
- `override_warning` is the model's own judgment (not derived from `complicates != null`) — fixes v4's hardcoded index/intent-based logic
- `prior_stress_test` enables a revision loop: director revises hypothesis after pushback, same call re-fires
- `intent` calibrates evidentiary rigor via the Behavior Skill Profile/prompt (Correct held to a stricter bar than Theory) — never a code conditional
- Fresh `queryRAG({ queryText: hypothesis })` via `api/lib/rag.js` — never reuses Agent 1's original retrieval, since a hypothesis can reference evidence the original question never touched

### 5.5 Data Expert — Escalate (Sonnet)
```json
// input: { "hypothesis": "string", "flagged_question": "string", "research_request": "string" }
// output
{ "new_chunks": [ { "content": "string", "source": "string", "data_type": "sourced | inferred | synthesized", "geo": "string | null", "program_area": "string | null" } ], "summary": "string", "citations": ["chunk_id", "..."] }
```
Reuses `ingest.js`'s embed-and-upsert pattern. Hands control back to Forecast/Theory/Performance Expert to re-run Stress Test against the enriched Data Room.

### 5.6 Data Expert — Data Integrity Patch (Sonnet)
Trigger: only when Intake Assistant's Commit Triage routes to it (Correct commit disputes a specific existing chunk, not just an interpretation).
```json
// input: { "disputed_chunk_id": "string | null", "correction": "string", "director_reasoning": "string" }
// output: { "action": "patch | supersede | restore | no_action", "chunk_id": "string | null", "updated_content": "string | null", "version_note": "string" }
```
Never overwrites in place — always inserts a new row that supersedes the original (see §7, Data Room Versioning).

### 5.7 The Proofreader — combined Guardrail + Eval (Haiku)
```json
// input: { "answer": "string", "confidence_tier": "string", "citations": ["chunk_id", "..."] }
// output
{
  "guardrail": { "result": "pass | block", "rule_violated": "citation_missing | synthesized_as_fact | empty_retrieval | hallucinated_internal_data | missing_confidence | null", "reason": "string | null" },
  "eval": { "scores": { "accuracy": 1, "specificity": 1, "actionability": 1, "sourcing": 1, "responsiveness": 1 }, "result": "pass | revise", "critique": "string | null" }
}
```
- `guardrail.result: block` → silent retry to CI-01 (1 retry). If still BLOCK: hard failure, **shown honestly** with the real rule and reason — never a generic error (this is the "fail safe, never fake" principle):
  ```json
  { "status": "failed", "rule_violated": "...", "reason": "string", "attempts": 2 }
  ```
- `eval.result: revise` → merges into the visible `needs_review` flag, `eval.critique` becomes part of `review_reason`

### 5.8 The Intake Assistant — Commit Triage (Haiku)
Trigger: director commits Forecast or Correct.
```json
// input: { "intent": "forecast | correct", "hypothesis": "string", "stress_test": { ... }, "correction_text": "string | null" }
// output: { "route_to": ["reasoner", "data-expert"], "data_expert_reason": "string | null", "disputed_chunk_id": "string | null" }
```
Always routes to Reasoner on Forecast/Correct. Routes to Data Expert only when the correction disputes a *specific existing chunk's accuracy* — this is a judgment call, not a fixed rule.

### 5.9 The Intake Assistant — Failure Triage (Haiku)
Trigger: Proofreader hard-fails (§5.7).
```json
// input: { "guardrail_failure": { ... }, "original_question": "string" }
// output: { "recommend_escalate": true, "suggested_research_request": "string | null" }
```
Turns a dead-end failure into an offered next step (route to Data Expert's Escalate) rather than a wall.

### 5.10 The Reasoner — Memory Consolidation (Haiku)
Trigger: director commits Forecast or Correct only (never Theorize/Discard — nothing was decided, nothing to consolidate).
```json
// input
{
  "original_question": "string", "flagged_answer": "string", "committed_hypothesis": "string", "intent": "forecast | correct",
  "stress_test": { "supports": "string", "complicates": "string | null", "consider": "string", "override_warning": true },
  "was_override": true
}
// output
{
  "question_type": "string", "what_agent_said": "string", "what_was_wrong": "string | null",
  "correct_reasoning": "string", "pattern_applies_to": "string", "was_override": true,
  "confidence": "high | medium | low", "ingest_scope": "provisional | permanent",
  "geo": "string | null", "program_area": "string | null", "citations": ["chunk_id", "..."]
}
```
**Execution is split across two agents, not one.** The Reasoner's call above produces the synthesis only — it does not embed or write anything itself. That output hands off to **Susan Smith (TR-08, the platform's existing Trainer agent)**, who executes the actual embed-and-upsert into `knowledge_entries` — reusing her existing reinforcement pipeline (already live, `PersonnelScreen.jsx` Training tab, already attributed to `agentId: "susan"` in `ai_activity_log`) rather than The Reasoner duplicating that mechanism. `source: "hitl-consolidation"`, `data_type: "learned"` (already the planned 4th data layer — see §6), scoped to the GEO CSO Expert's `agent_id` as the knowledge owner.

This is a genuine platform-wide capability extension, not an Apple-only feature: today Susan's reinforcement pipeline only fires from a human clicking "Add Courses" in the Training tab UI. This is its first **agent-triggered** call — any future agent's synthesized output could hand off to her the same way. Both agents are visibly attributed wherever this fires (Learned Context card, `ai_activity_log`) — same pattern already locked for Dan Bingham accompanying every Prompt Service call, never a silent single-agent credit.

`technical_services` on the Reasoner's own Skill Profile (§5b) is `[structured-output]` only — `embeddings` belongs to Susan's execution, not duplicated on The Reasoner.

---

## 5b. SKILL PROFILES & CAPABILITIES

Six Capabilities, one per agent — independent of the agent per the Platform Model, the agent holds Seniority in it. **None of the six own a Format Skill** — output formatting stays exclusively with the existing Screen Controls / HTML Display / PDF Assembly agents (locked rule, `ARCHITECTURE.md` §19: content specialists never own Format Skills). Default Level: **L2 (Trained)** for all six on `capability_skill_profiles` — real domain Data Room access, not yet self-improving or proprietary. Product/pricing call, not purely technical — confirm or override per agent later.

Each Capability gets Identity + Behavior + Knowledge Skill Profiles, plus one Intent Skill Profile per distinct call (agents with two calls get two Intent Skill Profiles):

| Agent | Capability slug | Skill Profiles | Intent skill(s) — maps to §5 calls |
|---|---|---|---|
| GEO CSO Expert | `channel-intelligence` | `ci-identity`, `ci-behavior`, `ci-knowledge` | `ci-answer-intent` (§5.2, `technical_services: [rag, structured-output]`) · `ci-routing-intent` (§5.1, `technical_services: [structured-output]`) |
| Forecast/Theory/Performance Expert | `hypothesis-evaluation` | `hyp-identity`, `hyp-behavior`, `hyp-knowledge` | `hyp-generation-intent` (§5.3) · `hyp-stress-test-intent` (§5.4, `technical_services: [rag, structured-output]`) |
| Data Expert | `data-room-operations` | `data-identity`, `data-behavior`, `data-knowledge` | `data-escalate-intent` (§5.5, `technical_services: [rag, embeddings, structured-output]`) · `data-patch-intent` (§5.6) |
| The Proofreader | `quality-gate` | `proof-identity`, `proof-behavior`, `proof-knowledge` | `proof-guardrail-intent` · `proof-eval-intent` (§5.7, both `technical_services: [structured-output]`) |
| The Intake Assistant | `pipeline-triage` | `intake-identity`, `intake-behavior`, `intake-knowledge` | `intake-commit-intent` · `intake-failure-intent` (§5.8–5.9) |
| The Reasoner | `memory-consolidation` | `reasoner-identity`, `reasoner-behavior`, `reasoner-knowledge` | `reasoner-intent` (§5.10, `technical_services: [structured-output]` — synthesis only; execution hands off to Susan Smith/TR-08, see §5.10) |

**Behavior Skill Profile content, per agent (the "how it thinks" trait):**
- GEO CSO Expert: RAG-first, cite every claim, explicit gap acknowledgment, confidence tiers always attached
- Forecast/Theory/Performance Expert: evidentiary rigor calibrated by intent — stricter bar for Correct than Theory (§5.4)
- Data Expert: never overwrite, always supersede — versioning discipline (§7)
- The Proofreader: enforce-don't-evaluate for the guardrail half, score-and-critique for the eval half
- The Intake Assistant: triage judgment — when a correction needs Data Expert's patch vs. Reasoner alone (§5.8)
- The Reasoner: "logging fixes one answer, pattern synthesis improves a whole class" (§5.10)

**Knowledge Skill Profile content, per agent:** GEO CSO Expert and Forecast/Theory/Performance Expert both scope to the shared CSO's Data Room via RAG (same `knowledge_entries`, no separate Data Room per agent — Apple has only this one Data Room today, see `ARCHITECTURE.md` §3). Data Expert's knowledge is meta — the metadata schema itself, not domain facts. The Proofreader's knowledge is declarative — the 5 Guardrail rules + 5 Eval rubric dimensions. The Intake Assistant's knowledge is the pipeline topology — which agent handles what. The Reasoner's knowledge is meta-awareness of prior consolidated patterns, to relate a new correction to existing ones.

Final DB slugs may get bikeshedded at kickoff-doc time — this table is the structure, not a migration script.

---

## 6. DATA LAYERS (carried forward, unchanged)
> Full source data (Datasets 1–6, synthetic scenario outlines, question bank): `docs/APPLE-DATA-ROOM-SOURCE-DATA.md`

| Layer | data_type | Citeable | Source |
|---|---|---|---|
| 1 | `sourced` | true | Apple 10-K, SellCell, KrASIA, Counterpoint |
| 2 | `inferred` | false | Implied conclusions from public sources |
| 3 | `synthesized` | false | Authored scenarios, anchored to real industry benchmarks |
| 4 | `learned` | false | Reasoner's consolidated corrections |

---

## 7. DATA ROOM VERSIONING & DEMO RESET

**Rule: `knowledge_entries` rows are never overwritten, only ever inserted.** A correction to a baseline chunk always creates a new row superseding it; the original is untouched. This single rule delivers both requirements below without a separate log table.

**Schema additions to `knowledge_entries`** (additive, nullable/defaulted — no existing rows affected). **Corrected 2026-07-01 against live schema during S-APPLE-01b-design:** `status` already exists on the live table (default `'active'`, currently only ever `'active'` on all 34 rows) — it needs new *values* (`superseded`/`archived`), not a new column. `data_type` and `citeable` — referenced throughout this doc's §3 four-data-layer model — do **not** exist on the live table at all; that's a gap in this migration list, not a documentation-only fix, since nothing enforces or stores confidence-tier tagging today:
```sql
data_type      text default 'sourced'  -- sourced | inferred | synthesized | learned (§3) — NEW, was missing
citeable       boolean default true    -- NEW, was missing
is_baseline    boolean default false   -- true only for S-APPLE-01b seed rows
supersedes_id  uuid null                -- FK to the row this one replaces
confidence     text null                -- high/medium/low, when written from a HITL decision
override_flag  boolean null             -- true if written despite an unresolved stress-test complication
-- status (existing column, unchanged type/default) gains 'superseded' and 'archived' as valid values
```

- **Change log:** falls out for free — every correction, escalation ingestion, and Memory Consolidation write is an insert, so full history already exists as ordered rows with reasoning/confidence intact.
- **Demo Reset:** `UPDATE knowledge_entries SET status='archived' WHERE is_baseline=false` + `SET status='active' WHERE is_baseline=true`, scoped to the Apple tenant. Nothing is deleted — archived rows stay queryable for review, just excluded from live RAG retrieval (`WHERE status='active'`).
- **Scope boundary:** Demo Reset touches `knowledge_entries` (Knowledge Skill Profile layer) only. It never touches `agent_configs` (Behavior Skill Profile layer) — satisfied by construction, since nothing in this design writes to `agent_configs` at all. Agent behavior/learning is not reset.
- **UI:** visible control in Column 3 (Audit), alongside the existing "About Market Intelligence" / "Agent Build Approach" drawers. Gated behind one confirm step explaining exactly what resets and what doesn't.

---

## 8. AI PATTERN / TECHNICAL SERVICE NAMING

Three distinct, real, established terms — chosen to avoid colliding with the existing `PATTERN_CATALOG` (`useAIActivity.js`), which already has an active **"Reflection"** pattern meaning something different (Dan Bingham's pre-run self-critique, fires *before* an answer is generated):

- **Memory Consolidation** — the Reasoner turning one human correction into durable, structured long-term knowledge (the write)
- **Transfer Learning** — generalizing that correction into a pattern applicable to a class of future questions (the generalization; maps to `pattern_applies_to`)
- **Case-Based Reasoning** — the GEO CSO Expert later retrieving that consolidated case to answer a similar question (the read)

RLHF was considered and rejected as a label — it specifically means weight updates via a reward model, which nothing here does. Precision over buzzword familiarity, deliberately, for an audience of AI experts.

Scope: Memory Consolidation is built for Market Intelligence only in this pass. Generalizing it into a platform-wide Technical Service (any agent's HITL corrections, not just this screen) is a stated roadmap item, not built now.

---

## 9. LOOP CLOSURE — THE DEMO MOMENT

"Ask the same question twice, get a better answer" is not a separate mechanism — it falls out of §7 and §5.10 for free. Once the Reasoner writes into `knowledge_entries` (the same table CI-01 already queries via RAG), the next relevant question in the same session picks it up automatically through normal retrieval. No session-state plumbing required, just correct sequencing (the write must complete before the next query fires).

---

## 10. ROADMAP ITEMS LOGGED, NOT BUILT NOW

- **MI-07** (`FEATURES.md`) — per-GEO and per-GEO-per-program specialist agents, a depth path beyond this platform-wide 6-agent model
- **AG-25 / AG-26** (`FEATURES.md`) — Emerging Market Prioritization Agent (live external data via Brent) and Partner Training Readiness Agent (serves partner reps, not GEO directors) — the 2nd and 3rd agents of the original 3-agent arc, not part of this Market Intelligence build at all. Draft specs preserved in `docs/DEEPBENCH-APPLE-BUILD-PLAN.md`, not yet designed in depth
- Platform-wide generalization of Memory Consolidation beyond Market Intelligence
- Automated re-evaluation triggers for provisional (Forecast) entries beyond "the next relevant interaction picks it up" — no scheduled/background re-check job

---

## 10b. ON-LOAD STATE (Column 1)

Two elements on first load, replacing v4's three hand-authored fake chat exchanges:

1. **Intro text** — a short orientation block explaining what the chat is for and naming the 5 intents (Q/A, Run a Theory, Forecast, Correct, Escalate), so the director understands the range of activity available before typing anything. Static copy (Layer A), but must accurately describe the real intent model in §3, not placeholder text.
2. **3 curated example questions**, selectable, that fire the real pipeline (not canned text) — chosen to show the range of real agent behavior across a single click each:
   - One **clean sourced answer** (proves RAG + Proofreader working well) — e.g. "Japan is Apple's fastest-growing GEO in 2025 — what is driving that?" (cross-references Dataset 1 GEO revenue + Dataset 2 upgrade cycles)
   - One **needs_review / HITL trigger** (the differentiated moment — Stress Test + Reasoner) — maps to one of the 10 partner scenarios in `docs/APPLE-DATA-ROOM-SOURCE-DATA.md`. Candidate: scenario 3, "Large Retailer — EMEA — Co-op Budget Underutilization Q3" (55% utilization, real ambiguity between an approval-process bottleneck and an enablement problem — rich enough to support multiple genuine hypotheses)
   - One **graceful failure** (proves guardrails are real, not decorative) — e.g. "How is our authorized reseller network performing in Vietnam?"
   
   **Dependency:** whichever partner scenario is chosen for the HITL example must be fully drafted (not just the outline in `APPLE-DATA-ROOM-SOURCE-DATA.md`) before S-APPLE-01b, since it's carrying the most important single demo moment — prioritize drafting that one first and most carefully.

---

## 10c. PLATFORM LEVERAGE (new page element — Column 3, folds into "About Market Intelligence")

A real, honest stat, not decoration — proves the platform pitch ("capabilities are independent of agents, shared resources built once") with this specific build rather than asserting it abstractly. Three counts, each expandable to the underlying list:

- **10 existing platform capabilities reused as-is** — Display Agent (Alex/Riley), Dan Bingham's Prompt Service, `queryRAG()`, `checkRouting()`/Agent Routing, `web-memory.js`'s embed-upsert pipeline, `ingest.js`'s pipeline, Guardrails (PAT-13), LLM-as-Judge (PAT-19), `ai_activity_log`/HITL (PAT-10), **Susan Smith's reinforcement pipeline (PE-03, now agent-triggered for the first time — see §5.10)**
- **5 new mechanisms built here, generalizable platform-wide** — Memory Consolidation versioning (`is_baseline`/`status`/`supersedes_id`), the 5-intent front-door model, the Intake Assistant triage pattern, the Intelligence Review Display card format, the Proofreader unified-persona pattern
- **3 genuinely domain-specific, not transferable** — the CSO's Data Room content, GEO CSO Expert's Identity/Knowledge, the specific Capability slug instances (other domains would need their own instance, even reusing the same call-shape templates)

Full breakdown: see the reusability review from this design session (chat log) — worth formalizing into its own doc if this becomes a recurring pitch element beyond Apple.

---

## 11. OPEN ITEMS BEFORE CODING

- `knowledge_entries` schema migration (§7) needs to land before any Reasoner/Data Expert writes
- Data Room seed (S-APPLE-01b — 5 datasets + 3 GEO briefings + 10 partner scenarios) must exist before real RAG retrieval works; synthetic content still needs drafting
- Session split required — this design spans 6 full agent personas, a new intent-classification pipeline, a schema migration, and a screen rebuild. Cannot be one kickoff doc under the "max 3 files, max 4 tasks" rule. See `CLAUDE-STATE.md` for the proposed session queue.

### Stress test findings (2026-06-30) — resolve during the sessions tagged, not before

1. **Concurrent flagged answers** — design assumes one active flagged answer at a time. Multiple `needs_review` answers in a row: queue, drop, or force-close? — resolve in S-MARKET-INTEL-01 (screen state) / S-APPLE-02 (front door)
2. **Abandoning an in-progress theory** — director opens a hypothesis flow, then asks something unrelated before commit/discard. Persist or silently drop? — S-MARKET-INTEL-01
3. **No cap on Escalate rounds** — §5.5 hands back to Stress Test, which can re-trigger Escalate. Needs a hard cap (e.g. 2 rounds/hypothesis) to bound live-demo risk — S-APPLE-04
4. **No validity/relevance check on custom hypotheses** — free-text hypothesis box accepts anything; Stress Test (§5.4) will reason over even off-topic input, the highest hallucination-risk surface in the whole design — S-APPLE-03
5. **Curated example questions vs. Intent Routing** — should the 3 on-load examples (§10b) skip classification since intent is already known, or run the real pipeline including Intent Routing for consistency (no special-cased demo path)? Leaning toward always running it real — S-APPLE-02
6. **Provisional forecasts don't stay visibly provisional** — `confidence_tier` (§5.2) has no tier distinguishing a citation sourced from an unconfirmed Forecast vs. a permanent Correct; a stale Forecast could read as equally authoritative — S-APPLE-02
7. **Demo Reset mid-flow** — resetting the Data Room while a hypothesis flow is open leaves the UI referencing now-archived chunks; reset should probably clear any open flow too — S-APPLE-04
8. **Loop closure should extend to Stress Test, not just Q&A** (positive finding, demonstrate on purpose) — a repeat theory-test on a consolidated pattern should find stronger `supports` the second time; worth showing deliberately in the Round 4 demo script, not discovering it live — S-APPLE-05
