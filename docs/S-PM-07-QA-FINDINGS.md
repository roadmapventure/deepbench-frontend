# S-PM-07 QA Findings
> Recorded at close of S-PM-07b (2026-06-23). Input for next design session.

---

## What Shipped

### S-PM-07a — AA-57 ✅ Done (415c8c6)
- `db-assembly.js`: WORK ORDER section injected from `task_context.goal` at order 2.5 — LLM now receives the actual work order goal in its system prompt.
- `ai-enrichment.js`: `taskContextStr` derived from task_context object — RAG query and Reflect prompt no longer receive `[object Object]`.
- QA: 4/5 PASS. Item 5 (TaskInstructionsScreen re-generate) FAIL — logged as BUG-11, deferred to design session.

### S-PM-07b — AW-28 ✅ Done (da0c1e1)
- `api/plan.js`: `action: 'preview-prompt'` — runs DB Assembly + AI Enrichment only, returns 4-stage prompt breakdown. No LLM call.
- `src/components/PromptEvolutionModal.jsx`: Platform-level reusable component. 4 columns: Goal Only / +DB Assembly / +RAG / +Reflect. Token deltas, RAG chunk count, Reflect ✓/✗, Synthesis badge.
- `src/screens/CreateWorkOrderScreen.jsx`: First consumer. Fires preview-prompt in parallel with prompt-service. Continue button closes modal, processes plan result.
- `src/hooks/useAIActivity.js`: preview_prompt SERVICE_CATALOG + AI_TYPE_TO_SERVICE wired.

---

## AW-28 Modal QA Results
> Tested with "Research Summary" deliverable on dev URL.

| # | Item | Result |
|---|------|--------|
| 1 | Modal opens after Generate Plan | ✅ PASS |
| 2 | Column 1 shows goal text only | ✅ PASS |
| 3 | Column 2 shows DB sections (Role & Identity present) | ❌ FAIL — Role & Identity missing; double Intent |
| 4 | Column 3 shows Background Knowledge block | ❌ FAIL — RAG returned 0 chunks |
| 5 | Column 4 shows Execution Plan block | ⚠ PARTIAL — Reflect fired but output shows wrong format for deliverable type |
| 6 | Token counts increase left to right | ✅ PASS |
| 7 | Column 3 RAG ✓ with chunk count | ❌ FAIL — shows "✗ no chunks retrieved" |
| 8 | Column 4 Reflect ✓ | ✅ PASS |
| 9 | Spinner visible while generating | ✅ PASS |
| 10 | Continue closes modal, steps appear | ✅ PASS |
| 11 | AW-28 badge visible on Generate Plan | ✅ PASS |
| 12 | Zero console errors | ✅ PASS |

**Test spec note:** Live API test `stage4.tokens >= stage3.tokens` fails by design when Synthesis fires (it compresses, reducing token count). Fix assertion to `if (!patterns.synthesis) assert(stage4 >= stage3)` in next session that touches the test.

---

## Root Cause Analysis — Each Failure

### FAIL 3 — Role & Identity missing from Column 2

**Root cause A:** `db-assembly.js` builds the Identity section from `agent_configs` (type: `role_prompt`, is_default: true). Michelle has no Playbook entries → no agent_configs rows → Identity section content is null → section filtered out of Column 2.

**Root cause B:** Resume content and profession card data are NOT read by `db-assembly.js`. They are UI-only today. The fallback chain is incomplete: db-assembly tries Playbook → Skill profile objective/method. It does not try Resume or Profession card.

**Root cause C:** Two Intent-type skill profiles exist in the project-manager capability (likely SP-PM-01 and SP-PM-02). Both render as "INTENT" sections, creating a duplicate in Column 2.

### FAIL 4 / FAIL 7 — RAG returned 0 chunks

**Root cause:** Training entries ARE vectorized — the Training tab calls `/api/ingest` which creates knowledge_entries rows with OpenAI embeddings. Michelle has 4 training entries in the vector store. However, the RAG query uses the goal text as the query string. For the "Research Summary" goal ("Conduct targeted research to answer a business question..."), the goal text did not semantically match Michelle's training entry content closely enough to score above the match threshold.

**This is not a code bug.** RAG is working correctly. The knowledge base needs more entries relevant to the deliverable types users will actually request.

### PARTIAL 5 — Wrong output format for deliverable type

**Root cause:** All 7 deliverable tiles on the Create Work Order screen (Data Analysis, Web Data Fetch, Document Draft, Research Summary, Compliance Review, Spend Analysis, Market Research) share the same Format Skill — the execution-plan schema designed for step decomposition. A Research Summary should produce a research brief (key question, methodology, findings, recommendations, sources) — not a step-decomposition execution plan. Each deliverable type needs its own Format Skill with an appropriate output schema.

**Secondary concern raised by John:** When Synthesis fires, it compresses the assembled prompt significantly (~540 tokens saved). Synthesis may be compressing out Identity and Behavior content (persona, professional judgment) in favor of the more concrete Format and Intent sections (structure, schema). The resulting prompt is more "what to produce" than "who is producing it and how they think."

---

## New Gaps Identified — Needs Design Session

### GAP-01: Resume and Profession Card not wired into db-assembly.js
**Files:** `api/prompt/db-assembly.js`
**What:** When building the Identity section, db-assembly.js tries `agent_configs` (Playbook) then falls back to `skill_profile.objective + method`. It never reads from the agent's resume or profession/bio card.
**Desired fallback chain:** Playbook role_prompt → Resume content → Profession card bio → Skill profile objective
**Impact:** Any agent with an empty Playbook has no Identity content in assembled prompt, even if they have a full resume.

### GAP-02: Duplicate Intent sections
**Files:** Supabase — project-manager capability skill profile assignments
**What:** The project-manager capability has two intent-type skill profiles (SP-PM-01 and SP-PM-02). Both render as "INTENT" sections in Column 2. This is redundant and clutters the assembled prompt.
**Desired:** Either consolidate into one Intent skill profile, or give the second one a distinct slug/label.

### GAP-03: All 7 deliverables share one Format Skill
**Files:** Supabase — skill_profiles, capability_skill_profiles, SP-PM-03
**What:** Data Analysis, Web Data Fetch, Document Draft, Research Summary, Compliance Review, Spend Analysis, Market Research all route to the same execution-plan Format Skill schema. Each produces a step-decomposition output regardless of what the deliverable type actually is.
**Desired:** Each deliverable type gets its own Format Skill with an output schema appropriate to that type.

### GAP-04: Synthesis may compress out persona content
**Files:** `api/prompt/ai-enrichment.js` — Synthesis step
**What:** Synthesis rewrites the full assembled prompt for token efficiency. It may prioritize structural format/intent instructions over persona/identity content, leaving the LLM with strong "what to produce" instructions but weak "professional judgment" context.
**Desired:** Investigate whether Synthesis should be told to preserve Identity and Behavior sections at full fidelity, or whether it should be disabled/optional until persona content is richer.

---

## Existing Open Items (context for design session)

| ID | Item | Status |
|----|------|--------|
| BUG-11 | TaskInstructionsScreen Re-generate broken | ❌ Design session required |
| S-PM-06 | Migrate TaskInstructionsScreen to Prompt Service pipeline | ❌ Design session required |

---

## Recommended Design Session Scope

**Session name:** S-PM-08-design

**Priority order:**
1. GAP-01 — Wire resume + profession card into db-assembly.js Identity fallback chain (highest impact, fixes empty identity immediately)
2. GAP-02 — Consolidate duplicate Intent sections in project-manager capability (DB change)
3. GAP-03 — Design per-deliverable Format Skills for all 7 deliverable types (larger scope — may need sub-sessions)
4. GAP-04 — Investigate Synthesis persona preservation (may be configuration only)
5. BUG-11 — Root cause TaskInstructionsScreen re-generate failure

**Note on RAG:** Not a code fix — requires knowledge entry seeding. As more training content is added for each agent and deliverable domain, RAG chunk retrieval will improve automatically. Low priority for the code side.
