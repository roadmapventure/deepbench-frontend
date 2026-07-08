# DeepBench v5.2 — Feature Inventory — NOW

> Status: ✅ Done | 🔶 Partial | ❌ Missing | — N/A
> Session: DONE = built | [ID] = assigned | S-future = not yet scheduled
>
> **Split 2026-07-07 into 3 files by priority (John's criterion): "anything for the MI page to work, from backend to frontend, that is speed, loop, harness, and charts goes to now. Anything MI outside of that is next, and anything not related to making MI successful goes to later."** This file holds only **now** — read this one by default at design-session Step 1. `docs/FEATURES-NEXT.md` (other MI backlog) and `docs/FEATURES-LATER.md` (everything else) are read only when scoping work in those areas.
>
> **AI Services catalog** (14 services, 10 patterns, AI Audit sections, MCP surfaces, table schema) → `docs/AI-SERVICES.md`
> **Deliverable composition registry** (AI Services × Deliverables, sharing patterns, feedback loops, build order) → `docs/CAPABILITIES.md`
> **✅ Done rows archived:** if a feature isn't listed in any of the 3 files, check `docs/FEATURES-ARCHIVE.md` before assuming it's missing.

---

## Feature ID Format

`[AREA]-[NUMBER]`
Areas: `SH`=Shell, `DB`=Dashboard, `AW`=Assign Work, `TI`=Task Instructions, `AZ`=Analyzer, `FT`=Fetch, `RO`=Roster, `PE`=Personnel File, `TC`=Teach, `TT`=Test Team, `AI`=AI Infrastructure, `AG`=Agent Identity, `LA`=Landing, `DL`=Deliverables, `WO`=Work Order, `IN`=Intent, `FM`=Format, `SV`=Service, `SK`=Skills & Capabilities, `MI`=Market Intelligence

Full area index lives in `docs/FEATURES-LATER.md`'s copy of this same legend (unchanged) — kept here too since this file is read by default.

---

## Type Taxonomy

**Added 2026-07-08 (John's explicit call) — every row in this file and `docs/FEATURES-NEXT.md` gets a `Type` tag, so backlog items can be scanned/prioritized by kind, not just read one at a time.** When logging a new item, assign the type that actually fits — invent a new one (add it here) rather than force a row into a type that's close-but-wrong. Keep this list short; don't create a type for a single one-off row if an existing one is defensible.

| Type | Means | Doesn't mean |
|---|---|---|
| **Continuity** | The correct message, direction, prompt, or response is failing to route correctly among agents — a correctness bug. | Not "it's slow" (that's Speed) and not "the underlying data is thin" (that's Data). |
| **Speed** | How fast routing/response happens end to end — latency, wasted calls, redundant work. No correctness question. | Not a tooling gap that merely helps *measure* speed (that's Observability). |
| **Architecture** | A structural/governance rule violation or infra constraint (broker/ownership patterns, `ARCHITECTURE.md` LOCKED sections) — not necessarily producing a wrong answer today, but a compliance or scaling risk. | Not every code-quality nit — routine cleanup is Tech Debt. |
| **Feature** | Net-new capability or roadmap work. Nothing is broken; it just doesn't exist yet. | — |
| **Tech Debt** | Cosmetic drift, duplication, or non-blocking cleanup — safe to defer indefinitely without user-visible impact. | Not a live bug a user could hit today. |
| **Data** | The seeded Data Room / demo content itself is thin, ambiguous, or insufficiently sourced — the code and routing are behaving correctly given what they were handed. | Not a code fix — the fix (if any) is content curation. |
| **Observability** | Instrumentation/tooling that helps diagnose other issues (e.g. latency tracing) — doesn't fix anything itself. | — |

---

## MARKET INTELLIGENCE — MI (now: charts)
> Full design: `docs/APPLE-AGENT-1-v5-DESIGN.md` (supersedes v1/v2/v3-spec — retired)
> Third AppShell tab, default landing route after splash. Center-screen content per `market-intelligence-v4.html` (its simulated top/bottom nav is not used — real DeepBench nav applies).
> Design session: Apple v5 Redesign (2026-06-30).

| ID | Type | Feature | Status | Session |
|----|------|---------|--------|---------|
| MI-03 | Feature | Available Data / Evidence panel — Data Room charts + Theory Evidence view. Four data layers with badges: sourced / inferred / synthesized / **learned** (4th layer, new in v5 — Reasoner's consolidated corrections). Pre-built static charts carried from v4. Chart generation from live queries remains roadmap. **`01b` ✅ shipped and QA'd 2026-07-04 (v6.0.19):** Theory Evidence swap-on-hypothesis-select (dynamic `projected_state`, however many metrics the model returns) live-verified in-browser. Data Room default charts remain `S-MARKET-INTEL-03`. | 🔶 Partial (Theory Evidence swap done, default charts pending) | S-MARKET-INTEL-01b ✅ (Theory Evidence swap) · S-MARKET-INTEL-03 (Data Room default charts) |

---

## AI INFRASTRUCTURE — AI (now: MI harness/speed bugs)

| ID | Type | Feature | Status | Session |
|----|------|---------|--------|---------|
| AI-45 | Continuity | Follow-up to `AI-44` — capabilities *with* a Knowledge Skill Profile (`channel-intelligence`, `hypothesis-evaluation`, `data-room-custody`, `project-manager`) are partially masked by RAG's indirect signal but were not confirmed live as affected or unaffected by `AI-44`'s root cause (John's explicit scope call: fix the mechanism, don't turn it into a full-platform audit). Needs a verification pass once `AI-44` ships — confirm each still (or now, for the first time) reasons over its actual `task_context`, not just RAG-retrieved chunks. Also flags a testing-process gap worth its own `STANDARDS.md` consideration: every affected capability's original Category L test asserted output *shape* only, never that output was *responsive to the specific input* — that's how this went undetected since `S-APPLE-03b`/`S-APPLE-04a`. | ❌ Missing | S-future (verification pass + possible STANDARDS.md Category L rule addition) |
| AI-46 | Observability | **New, found 2026-07-07 diagnosing a live "Priya took ~2 minutes" report (John, MI screen test run).** `ai_activity_log` has no shared identifier linking every row produced by one user-triggered interaction (one Send click's full delegation chain) — confirming where time actually went required manually chaining ~10 rows by timestamp adjacency and `feature`/`agent_id` guesswork. Needs: a `trace_id` (or `request_id`) generated once per top-level `execute.js` invocation, threaded through every `logAgentTurn()`/`logAICall()` call in that chain, plus a grouped rollup view in AI Audit ("this interaction: 91.2s across 6 hops, biggest cost: X"). Natural pairing with `AI-43` (same code path, same investigation) but bigger scope — schema migration + UI, not a one-file fix. Sequence right after `AI-43`. | ❌ Missing | S-future (design required, sequence after AI-43) |

---

## AGENT ARCHITECTURE — AA (now: MI loop/harness/delegation reliability)
> Full spec: docs/AGENT-ARCHITECTURE.md (created S-AGENT-ARCH-01). `ARCHITECTURE.md` §19d/§19e (LOCKED) govern the Agent Loop and Resource Ownership Broker mechanisms these rows all touch — full track history and the many already-✅-Done items in this area live in `docs/FEATURES-ARCHIVE.md`/`docs/SESSIONS.md`. Everything else under the `AA` prefix (Phase 1–5 roadmap, MCP exposure, marketplace, revenue, BYOA, JL-01) is platform-wide, not MI-specific — see `docs/FEATURES-LATER.md`.

| ID | Type | Feature | Status | Session |
|----|------|---------|--------|---------|
| AA-90 | Architecture | GEO agent (Marcus Webb, CI-01) ownership of the Market Intelligence screen's **front-door chat/answer surface specifically** — a user asks a question, Marcus classifies intent and owns the response. **Clarified 2026-07-02 (John):** this is not blanket ownership of every HITL moment on the screen — Stress Test's `override_warning` (Priya, `APPLE-AGENT-1-v5-DESIGN.md` §5.4) and Memory Consolidation's commit gate (Elena, §5.10, deferred to `S-APPLE-05`) are separate, per-capability consequential-action gates under `§19d`'s existing generic mechanism (`requires_human_confirmation`/`critique_agent` as data on that capability's own Intent Skill Profile) — a different axis from `§19e` broker ownership entirely, and not Marcus's. Blocked structurally — the screen doesn't exist yet (`S-MARKET-INTEL-01`). Logged now so the ownership rule isn't lost before the screen ships. | ❌ Missing, blocked on S-MARKET-INTEL-01 | TBD |
| AA-99 | Architecture | **Live violation of the Librarian ownership rule.** `ARCHITECTURE.md` §19c: "no other agent's capability... touches `the_Library` directly, structurally, not by discipline" — full CRUD, not just writes (`S-APPLE-04a-design`, 2026-07-02, confirmed by John after this session initially mis-scoped the rule to writes only). `api/prompt/ai-enrichment.js` (shipped `S-LIBRARIAN-01b`) calls `queryLibrary()` directly for Marcus's and Priya's RAG fetches, passing their own `agent_id`, with zero Eleanor delegation hop — this is live in production today, not a design-time risk. Needs its own fix session: replace the direct call with a real delegation to Eleanor (LB-01), same shape as any other cross-agent ask under `§19d`. Open question for that session: whether a live agent-reasoning hop per RAG read is the right cost/latency tradeoff, or whether Eleanor's read path needs a different (still-compliant) resolution — not decided here. | ❌ Missing | S-future (fix session required, blocks Nadia's Escalate design in `S-APPLE-04a` until resolved) |
| AA-121 | Speed | **New, found during `S-ARCH-LOOP-LATENCY-02-design`'s Architect Review (2026-07-07).** Knowledge Skill Profiles attach to a *capability* in `capability_skill_profiles`, not gated by `intent_slug` — confirmed via `db-assembly.js`'s `assemblePrompt()`, whose intent filter (added by `AA-108`) only ever filters `skill_type_slug === 'intent'` rows; `knowledge`/`identity`/`behavior`/`format`/`guardrails` rows always load regardless of which intent is active. Concretely: Marcus's `ci-knowledge` Skill Profile (RAG against `the_library`) fires on every single `channel-intelligence` call, including `ci-answer-display-intent` — a hand-off-only intent with no schema and no analysis instructions that ever reference retrieved content. Not the dominant cost in `AA-120`'s reproduction (the RAG fetch itself completed in under a second), but architecturally sloppy and generalizable — likely affects any other capability with a Knowledge Skill Profile that also has a lightweight, non-analytical intent (e.g. a future hand-off-only intent on any other capability). Deliberately not fixed in `AA-120`'s session (scope/file-count discipline) — needs its own design session: does a Knowledge Skill Profile gain an optional intent allow-list, or does the RAG fetch instruction move onto the Intent Skill Profile itself instead of Knowledge? | ❌ Missing | S-future (design required) |
| AA-133 | Speed | **New, found 2026-07-07 alongside `AA-132`.** Consider swapping `html-display-format`'s `llm_model` from `claude-sonnet-4-6` to Haiku — mechanical HTML restructuring may not need Sonnet-level reasoning, and this call is currently the single largest latency contributor measured on the Q&A path (37.4s). Quality-risk tradeoff (does Haiku produce structurally correct/complete HTML as reliably on longer content?) needs John's explicit call, same class of decision as `AA-124`'s still-open structural-fix-vs-trim question — deliberately not bundled into `AA-132`'s scoped fix. | ❌ Missing | S-future (decision needed) |
| AA-146 | Continuity | **New, found 2026-07-08 during `S-ARCH-STRING-CONTENT-01`'s own live verification.** When the `AA-135` string-content fallback renders (Riley's HTML output shown as plain text), the card's "Formatted by [Agent]" attribution byline that normally appears on Alex-formatted answers doesn't show — `display_agent_card` arrives falsy on this response shape, even though `display_agent_id` is populated. Not investigated further (out of this session's scope) — needs its own session to find where the byline read happens and why the card lookup comes back empty specifically for this shape. | ❌ Missing | S-future (design required) |
| AA-140 | Continuity | **Entry-point `agent_id` staleness risk — found 2026-07-07 during MI UI-updates design session, while distinguishing screen-initiated calls from real agent-to-agent delegation.** `MarketIntelligenceScreen.jsx`'s `callCapability()`/`onCommit()`/etc. hardcode which agent owns the very first call in a flow (Marcus for Q&A, Priya for hypothesis gen/test, Elena/Nadia for commit) — correct per `§19e`'s Ownership Matrix (these are documented single-owner capabilities, not a Rule #1 violation, since the screen isn't an agent naming a peer). But `runCapability()` (`api/capabilities/execute.js`) trusts that client-supplied `agent_id` as-is for the entry call — it only calls `resolveCapabilityHolder()` for internal delegation hops (`request_help`, critique dispatch), never for the initial screen-to-agent dispatch. If the Ownership Matrix ever reassigns one of these capabilities to a different agent, the screen's hardcoded `agent_id` would not follow that change automatically — no error, just continued (wrong) attribution/prompt selection. Needs a design session: should the entry-point call re-resolve the current holder server-side (like the internal hops do), or is a build-time/manifest check enough given how rarely ownership changes? | ❌ Missing | S-future (design required) |
| AA-149 | Speed | **Live-measured 2026-07-08 (`session/speed-rootcause-0708`): hand-off/routing overhead is real but small (6-9% of wall-clock) and too noisy to be an optimization target.** Solo-baseline vs. in-chain-nested pairs for Alex (`qa-answer-format`: 2.1s/6.7s solo, 3.6s nested) and Michelle (`agent-selection-intent`: 7.4s/9.9s standalone, 6.1s/9.2s nested) show run-to-run variance as large as any solo-vs-nested gap — no separable "routing tax" line item exists to fix. The real, stable, actionable cost is raw generation time on the heaviest Sonnet hops: Marcus's `ci-answer-intent` (~18-19s) and Priya's `hyp-generation-intent`/`hyp-hypothesis-test-intent` (~22-25s each, repeatable within ~8%). Supersedes `AA-121`/`AA-124`/`AA-133` as the primary lever — those targeted hand-off/RAG-gating cost specifically; this says the bigger, more reliable win is model-tier or prompt-trim work on the heavy Sonnet calls themselves. Full per-hop data (`ai_activity_log`, `tenant_id: 'speed-baseline-test'`) available for the next session. | ❌ Missing | S-future (design required) |
| AA-150 | Continuity | **Live-found 2026-07-08 (`session/speed-rootcause-0708`): Owen's `qg-review-intent` failed to parse on a repeat call with the exact same input that succeeded cleanly moments earlier** (first run: real guardrail block, 6.1s; second run: `"Parse failed and retry also failed"`, ~4.9s, even after the harness's own automatic one-retry). Not yet root-caused — could be Haiku output variance on longer `candidate_answer` content (markdown tables present in the test payload), or something more systemic. Distinct from the Speed investigation above: this is a reliability/correctness gap, not a latency one. Needs its own investigation before concluding cause. | ❌ Missing | S-future (design required) |

---

Full session queue: `CLAUDE-STATE.md`'s Session Queue section (tracks map closely onto this file's now/next split).
Other MI backlog: `docs/FEATURES-NEXT.md`
Everything else: `docs/FEATURES-LATER.md`
Full architecture decisions: `docs/ARCHITECTURE.md`
