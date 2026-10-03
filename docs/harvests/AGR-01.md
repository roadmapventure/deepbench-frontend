# AGR-01 — design harvest (v7.0.719, cycle `a0781663-1a8e-4db9-a0e3-08f64b190ded`, 2026-09-29)

Reasoning behind `docs/kickoffs/v7.0.719-AGR-01-knowledge-training-capability.md`. Not required reading for the build; every fact a task depends on is in the kickoff.

## Premise revalidation — ALIVE, with two stale sentences

Measured live against Supabase and the clone at `97c3aaf` (v7.0.714):

- **No training capability exists.** `capabilities` matched on train/reinforc/embed/extract/course/knowledge/teach returns only `dan-db-assembly` (Dan's bundle read). `capabilities.slug='knowledge-training'` 0 rows; `skill_profiles.slug='knowledge-training-intent'` 0; `agent_capability_assignments.capability_slug='knowledge-training'` 0.
- **Susan is no longer at zero rows.** `agent_capability_assignments` for `susan`: exactly one row, `pattern-vocabulary-review` (2026-07-21, AI-35). The ticket's "zero rows" sentence is stale; the §19e registry row for the Trainer ("writes to an agent's own personnel file", broker *none*, ❌) is still exact.
- **The write is attributed to the trainee, never the executor.** `ai_activity_log` where `ai_type='reinforcement' and feature='knowledge-write'`: 36 rows — brent 27, susan 6, michelle 4, bob 3, robyn 2, priya 1 (last 2026-07-21). `knowledge_entries` holds 36 rows: one log row per write, and each carries the page's agent.
- **The `agentId: "susan"` hardcode the ticket names is gone.** `grep -rn susan src api lib` finds no call-site literal; the only trace is `src/screens/TeachScreen.jsx:1`'s v5.1.30 header comment. `/api/extract` (`api/extract.js:117-121`) logs `SERVICE_SLUG.DOCUMENT_PARSING` with no agent at all; the metadata call `/api/brief` (`PersonnelScreen.jsx:239-247`, `ai_type: "extraction"`) passes the page's agent — `extraction` rows: susan 14 (≤2026-07-16), chloe 1 and marcus 1 (2026-07-17), null 4. So the "hardcoded" half of the ticket is dead as written, and the "attributed to the page agent" half is alive in both the write and the metadata call.
- **The defect is one line.** `lib/knowledge-write.js:76-83` `logActivity({ tenantId, agentId: agent_id || null, aiType: 'reinforcement', feature: 'knowledge-write', … })` — `agent_id` is the trainee (correctly the `knowledge_entries.agent_id` at line 59). Every caller passes it through untouched: `api/load-entries.js:37` `embedAndUpsertEntry(req.body)`; `PersonnelScreen.jsx:798-806` and `TeachScreen.jsx:160-166` both POST `agent_id: agentId` (the route param).

Verdict: alive. The structural gap (no capability, no assignment, no data-resolved executor) is exactly as registered in §19e.

## Where the harness resolves a holder today

- `api/capabilities/execute.js:566-586` `resolveCapabilityHolder(capability_slug)` — unexported: `agent_capability_assignments?capability_slug=eq.<slug>&select=agent_id&limit=1`, then `agents?id=eq.<id>&select=is_active`, throws on none/inactive. Used at the two sniff-test-passing sites §19d names (`request_help` → `project-manager`; the critique-capability gate).
- `api/_lib/mcp.js:186-230` `fetchCapabilityRows()`/`assembleCapabilityRows()` — four flat reads joined in JS; a `deterministic` row with no `traits.handler` is DROPPED from tools/list (line 230), and `runDeterministic()` (line 715) runs `DETERMINISTIC_HANDLERS[row.handler]` under `runWithCallSource('mcp', …)` — the only deterministic executor path on the platform (AGT-162, v7.0.682). `runCapability()` itself has no deterministic branch and requires `agent_id` (line 1825, pinned by `SE-02-shared-pipeline.js`).
- `.claude/rules/capabilities-are-data.md` gates `execute.js`, `db-assembly.js`, `ai-enrichment.js`, `request-receivable.js`: no slug/agent conditionals, and *removing* determinism there is a proposal for John, never an unattended ship.

## The variants weighed, and why the cheapest one is the primitive

The ticket (2026-07-15) says "rewired to route through `api/capabilities/execute.js`". `execute.js` runs `assemblePrompt → enrichPrompt → sendRequest`: an Anthropic call. The training write has no model call (one OpenAI embedding + a PostgREST upsert), so forcing it through `runCapability()` would spend a model turn to do nothing (pattern:9). Since v7.0.682 the platform's home for "a capability with no model call" is `mcp.js`'s deterministic twin. Condition on the goal, not the sentence (pattern:102): the goal is *attribution falls out of the harness's own data*.

| Variant | Files | Verdict |
|---|---|---|
| A. Register a `knowledge-write` handler in `DETERMINISTIC_HANDLERS`; `load-entries.js` POST resolves the row via `fetchCapabilityRows()` and dispatches; `knowledge-write.js` takes `executed_by` | seed + `mcp.js` + handler + `load-entries.js` + `knowledge-write.js` + test = 6 | The full shape (and it makes training an MCP tool). Twice the cap. `runDeterministic()` also stamps `call_source 'mcp'`, which is false for a screen save (pattern:32) — it would need a `callSource` parameter too. |
| B. `load-entries.js` resolves the holder (copy of the two reads) and passes `executed_by`; `knowledge-write.js` logs it | seed + 2 code files + test = 4 | One over the cap; and the attribution is only as good as the one caller that remembers to resolve. |
| C. Export `resolveCapabilityHolder` from `execute.js`; `lib/knowledge-write.js` imports it | seed + `execute.js` + `knowledge-write.js` + test = 4 | Touches the gated harness file for one `export` keyword, and inverts layering (`lib/` importing `api/` — zero precedent in `lib/*.js`, measured). |
| **D. (chosen)** `lib/knowledge-write.js` resolves the active holder of `knowledge-training` itself (the same two reads) and logs the write to that agent; seed rows as an `agent-row` decision; one regression test | **seed + `knowledge-write.js` + test = 3** | Fits the cap. Attribution is structural for *every* caller of the personnel-file write (§19e: "no other file gets a second code path") — `load-entries.js`, both screens, and any future caller are unchanged and correct. The trainee stays `knowledge_entries.agent_id` (pattern:43: the real value is in the data). |

Cost of D, named rather than hidden: a third copy of the two-read holder lookup (`execute.js`, `mcp.js`, now `lib/knowledge-write.js`) — a pattern:14 seam. The normalization is `resolveCapabilityHolder()` moved to a `lib/` home and imported by all three; it touches the gated `execute.js`, so it is its own recorded item, not this slice. D also fails closed: with no active holder the write refuses before the embedding is paid for (§19o direction; `execute.js` and `mcp.js` refuse the same way). Pattern:105 (telemetry never blocks the product path) was weighed and set aside deliberately — this is not telemetry, it is the ownership rule §19e registers for this resource, and a personnel-file write with no Trainer is the misconfiguration the rule exists to surface.

## Why no `traits.handler`, no `call_facts`, and an `intent`-type Skill

- **No `traits.handler`.** With a handler NAME in data but none registered in `DETERMINISTIC_HANDLERS`, `assembleCapabilityRows()` would advertise `knowledge-training` over MCP and every `tools/call` would fail with "No deterministic handler named … is registered" — the exact "migration before code" state `mcp.js` guards. Without the key the row is dropped from tools/list and nothing is advertised. Registering a handler (making training a real MCP door: an outside platform teaching an agent) is a genuine follow-on, not this ticket's text.
- **No trainee in `call_facts`.** `.claude/rules/ai-pattern-signature.md`: never put an agent id into the §19k signature. `agent-bundle.js` writes `call_facts.target_agent_id`, but on an `ai_type 'deterministic'` row; the reinforcement row is the embedding gold pattern's input (`LOG-73`), and a per-trainee key would fan its signature out per agent. The trainee is already the `knowledge_entries.agent_id` fact.
- **Skill type `intent`** (pattern:136): it names what the capability does and its input contract (`traits.input_schema`, the same key `agent-bundle-intent` uses), and that is the Skill a roster read surfaces; `execution_type 'deterministic'`, `llm_model NULL`, mirroring `agent-bundle-intent`. No identity/behavior/knowledge rows: nothing renders a prompt for a deterministic capability, so those would be dead content.

## The rows as an `agent-row` decision

`governance_rules.AGENT-ROW-AGREED-TICKET` (live, reviewer-enforced): creating an agent's `capabilities`/`skill_profiles`/`capability_skill_profiles`/`agent_capability_assignments` rows is build work under the ticket that names it when "an unreversed `runner_decisions` row names both the ticket and the change" — the `record_decision(...,'agent-row','AGR-01',…)` call in the same transaction IS that row (CHI-83's shape, `docs/design/chi-83-vocabulary-guardrail.sql`). All four tables are in `reversible_tables()` and keyed by `id uuid`, so `reverse_decision()` on the handle deletes exactly the four inserts. `ladder_work_class('P8 - Determinism Removal')` → `determinism_removal`. Cycle `a0781663…` exists (before-images must hang on the applying cycle — `runner_before_images` refuses `cycle_id` and `session_name` together).

## Baseline and tests

`node scripts/baseline-red-set.js --tests=tests/regression/SE-01-service-boundaries.js,tests/regression/SE-02-shared-pipeline.js,tests/regression/LOG-73-embedding-unclassified-recorded.js,tests/regression/LOG-91-single-write.js` → all green, `Red set: 0 of 4`. None of the four pins `lib/knowledge-write.js`'s log shape (`LOG-91` and `scripts/check-ai-logging-coverage.js` name `/api/load-entries` only as a route string; `SE-01` is the rag-query/playwright boundary). `agt-143-assignments-readers.test.mjs` pins `scripts/agent-prompt.js`'s model resolution, not the set of assignment readers.

The new test's seam proof (SES-45 "seam proof", labelled) intercepts `globalThis.fetch`: `logActivity()` constructs its POST synchronously before any await (`lib/activity-log.js:239` "no await before the write"), so the stub sees the audit body before `embedAndUpsertEntry()` returns; `embedText()` reads `data[0].embedding` and `usage` (`lib/vector-search.js:14-27`). Fixture ids (`holder-fixture`, `trainee-fixture`) are deliberately not real agent ids.

## The live end-to-end check

`runner_secrets` holds no `OPENAI_API_KEY` (names: ANTHROPIC_API_KEY, MCP_API_KEY, SCRATCH_SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL, VERCEL_AUTOMATION_BYPASS_SECRET, VERCEL_TOKEN, YAHOO_IMAP_*), so the write cannot be exercised end-to-end from the runner's own process — QA 3 therefore POSTs to the deployed dev preview (`docs/STANDARDS.md` §6 dev URL, `x-vercel-protection-bypass` as `scripts/verifier.js:2500` sends it), under `tenant_id 'agr-01-qa'` so the row never renders on the Bench (`load-entries.js` GET filters `tenant_id=eq.global`), titled with the cycle id so parallel cycles cannot collide (SES-382), and deleted afterwards through the route's own DELETE. Today the identical POST logs the trainee; after the ship it logs the assignment's agent — that pair is the discriminator.

## What this slice does not do (AGR-01 stays `partial`)

- The `/api/brief` metadata call (`ai_type "extraction"`) still attributes to the page's agent. It is an Anthropic (Haiku) call, so its home is a second, `ai`-type intent on `knowledge-training` reached through `execute.js` with the holder resolved from data — the ticket's own remaining sentence, its next cycle. Not refiled under a new number (pattern:95).
- `knowledge-training` is not an MCP tool (no handler registered).
- The three-copy holder lookup is not unified (touches the gated `execute.js`).

Patterns applied: 2, 8, 13, 17, 32, 43, 65, 66, 95, 102, 120, 136, 162, 164.
