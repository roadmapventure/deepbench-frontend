# HAR-02 (Speed) — prompt caching: cost measurement 2026-07-31

Measured by `design-scaling-arch-0731` from Supabase `ai_activity_log`, last 30 days, deduplicated
per the `LOG-81` counting rule (model named; duplicate `agent-turn` halves of AI-51 pairs excluded
via same-trace/same-tokens/<10s match).

## Headline

- **Total Claude spend ≈ $195/30d** (list-price estimate from token sums; the table's own summed
  `cost_usd` was not used for this cut). Input tokens ≈ **72% of spend** (~$140), output ~28%.
- Haiku 4.5: 13,503 calls, 110.2M input / 7.1M output ≈ $110 + $35.
- Sonnet 4.6: 1,800 calls, 9.8M input / 1.3M output ≈ $29 + $19.
- Daily trend (raw rows, 10 days): busy QA days **$17–25/day** (Jul 28 ≈ $25, Jul 29–30 ≈ $17);
  quiet days $2–7. John's "$20/day" budget matches the busy-day rate, and busy days are
  regression/QA days — back-to-back identical-prefix calls inside the 5-minute cache TTL.

## Repeated-prefix floor (why caching pays)

Per capability, low-percentile input size used as proxy for the stable prompt base:

| feature (model=Haiku unless noted) | calls | input tok | avg in | p10 in |
|---|---|---|---|---|
| web-search-news:ws-news-search-intent:depth0 | 344 | 36.5M | 106K | 47K |
| request-receivable | 5,122 | 18.5M | 3.6K | 1.2K |
| project-manager:agent-selection-intent:depth1 | 1,323 | 15.1M | 11.4K | 8.7K |
| channel-intelligence:ci-answer-intent:depth0 | 771 | 6.4M | 8.3K | 3.4K |
| pattern-vocabulary-review:...:depth0 | 159 | 5.7M | 36.1K | 16.1K |
| quality-gate:qg-review-intent:depth0/1/2 | 1,488 | 8.2M | 4–7K | 3–6K |

Conservative floor: **≥⅓ of input tokens are stable repeated content** (calls × p10 across top
groups). True cacheable share is higher: multi-hop agent loops re-send the growing conversation
prefix on every hop, which prefix caching also captures. Cache reads bill ~0.1×; 5-min-TTL writes
1.25× (break-even at 2+ reads — regression runs clear that easily).

**Realistic effect of shipping HAR-02: 30–50% off the monthly bill, concentrated on heavy QA days.**

Side finding filed separately: `HAR-27` (web-search-news payload cost — 19% of total spend in 344
calls; a payload-shape fix, not a caching fix).

---

# Ship record — 2026-07-31 → 2026-08-01 (`design-har-02`, S-HAR-02a/b/c, v7.0.15–v7.0.17)

## What shipped
- **a (v7.0.15, `7a351b7`) — audit first.** `ai_activity_log` gains `cache_creation_input_tokens`/`cache_read_input_tokens` (migration `har_02a_cache_token_columns`); captured through `usage` in `request-receivable.js` (incl. retry merge + guardrails site), passed via `logActivity()`, priced at read time in `computeCallCost()` (creation 1.25×, read 0.10× input rate). Shipped before any caching so `input_tokens` (which becomes "uncached remainder only") never silently undercounts the audit.
- **b (v7.0.16, `5f051f3` + patches `474e814`/`d76cc79`/`42acc95`) — stable-first reorder.** `prompt_phase: stable|volatile` on every section; stable run = format→identity→behavior→guardrails→**intent last** (see regressions below); volatile tail = prior-conversation→current-task→reflect→RAG, VOICE always final (`AA-127` preserved). `ai-enrichment.js` renders `system_prompt_stable`/`system_prompt_volatile` (unknown phase defaults volatile — a wrongly-volatile section only loses caching); `execute.js` threads the split + completes the agent-turn row's cache fields. `inserts_after` was found to be a live mechanism, replaced with order-driven REFLECT insertion.
- **c (v7.0.17, `120d7ce` + rot-guard `3a422f9`) — the breakpoints.** `buildCallBody()`: stable run as a single `system` content block with `cache_control: {type: "ephemeral"}` (5-min TTL); second breakpoint stamped **at send time onto a copy** of the final history message (never persisted — `durable_hops` replay would accumulate markers past the 4-breakpoint limit; stray persisted markers are stripped defensively). Split absent (checkpoint-resumed hops) → byte-identical uncached fallback, by design.

## Regressions the A/B caught, root causes, fixes
1. **Routing flip, case 6 (= `HAR-30`, independently measured by `S-SES-67-design`):** first reorder put Identity/Behavior between the `ci-routing-intent` classification instructions and the question → `forecast`→`qa` flip, deterministic 4/4. Fix 1: intent moved last-in-stable (`42acc95`), restoring intent→task adjacency. Fix 2 (residual flips on cases 13/15/20/22, two systematic + two wobbling): **routing isolation** — `traits.intent_allowlist` on `ci-identity`/`ci-behavior` (both attach only to `channel-intelligence`) excluding `ci-routing-intent`, so persona text never enters the classifier at all (same `AGT-54` gate + same accepted rot-risk shape as `S-AGT-44b`; rot-guard B5 added to `tests/regression/AGT-44-platform-language-guardrail.js`). Post-fix: 10/10 discriminating runs, full gate 24/24 journeys correct, wobblers stabilized.
2. **Loop non-termination, case 5:** same adjacency root cause (intent's completion instructions far from task/history); resolved by fix 1, 3/3.

## Live verification (deployed dev, `ai_activity_log` evidence)
- `ci-answer-intent`: stable prefix 4,112 tokens — row 33590 writes it (`input=238`), next hop row 33595 **reads 4,112 + writes the 4,234-token conversation breakpoint** (`input=5`), repeat run 90s later row 33604 reads 4,112 cold. Coding session's direct L test: call 1 `cache_creation=19597`, call 2 `cache_read=19597`, `input=20`.
- Below-floor calls (routing ~1.6K, guardrails ~1.3K; Haiku 4.5 floor = 4,096 tokens) correctly no-op at zero cost — the "unconditional marking" decision holds.

## Honest coverage caveat (why realized savings start below the 30–50% ceiling)
The measured floor assumed the *repeated* content was cacheable. Two big repeated payloads are volatile-by-construction and don't cache yet: Michelle Manning — Project Manager's ~9K roster context and quality-gate's artifact context (their **stable** runs sit under the 4,096 floor; her 11.7K calls show zero cache activity live). Filed: `HAR-32` (make content-stable runtime contexts cacheable — the bulk of the remaining estimate), `HAR-31` (loop seeds `history[0]` with the concatenated prompt → stable text duplicated in messages from hop 2). `HAR-29` (plan.js/brief.js bypass the pipeline entirely) was filed at design time.

## Decisions on record
- Unconditional breakpoints, no per-capability opt-in data (John, 2026-07-31) — below-floor no-ops make per-capability judgment moot; §19b-clean.
- 5-min TTL only; 2 of 4 breakpoints used.
- Reorder + routing isolation accepted as the new baseline (John, 2026-08-01) — the old "persona after question" layout is unreachable under prefix caching; the classifier now simply doesn't receive persona text.

---

# HAR-02 — row detail harvested 2026-08-01 (SES-68)

Full `docs/FEATURES.md` row text as it stood immediately before this session's harvest-trim (verbatim):

| HAR-02 | Speed | **Found twice independently the same day (2026-07-16) — once via John's direct ask (prompted by an unrelated email about prompt caching), once via `S-CHI-03-design` while scoping CHI-03b's two new Marcus intents (logged separately at the time as `AA-197`). Merged into this one row 2026-07-17 (session-hygiene now/next/later review) — kept under the `HAR-` (harness-level) naming convention rather than `AA-`, no detail dropped.** Confirmed live: no prompt caching exists anywhere in the codebase (zero `cache_control` usage, confirmed by grep) — `api/prompt/request-receivable.js` sends `system: systemPrompt` as a plain string on every model call, and `db-assembly.js`'s `buildSections(intentSlug)` concatenates agent-level content (Identity/Behavior/Knowledge) and per-intent content into one string per call, in that order. Anthropic prompt caching (prefix-match `cache_control` breakpoints, ~90% cost reduction on cache reads) is a real, unexploited lever here because DeepBench's per-capability system prompts are large and mostly stable across calls, with only the final user question/task varying per request. Concrete example: within a single conversation, Marcus alone can be hit up to 5 times (routing, answer, submission ack, resolution ack, plus any revision loop) sharing an identical agent-level prefix each time. Michelle's `agent-selection-intent` roster context alone runs ~8.9K tokens and is sent in full on every `request_help`/delegation hop by deliberate design (`AA-170`'s own investigation confirmed trimming it would be "a deterministic pick wearing a reasoning costume" — not a candidate for removal, only for caching). Likely candidates beyond Michelle's roster context: any Intent/Format Skill Profile whose `system` content doesn't vary per-call. Fix requires splitting stable vs. dynamic sections in `buildSections()` and restructuring `system` into content blocks with `cache_control` — not a one-line add. Harness-level (touches every agent/capability platform-wide, not Marcus/CI-specific) — needs its own design session, not a quick patch: per-capability judgment is needed on where the stable/volatile boundary actually falls before placing breakpoints (get this wrong and cache writes cost more than they save, per Anthropic's own docs: a 5-minute-TTL write only breaks even after 2+ reads). Complementary to `AA-159` (that row is about call *volume*; this is per-call cost/latency on a shared prefix). **Measured 2026-07-31 (`design-scaling-arch-0731`, `ai_activity_log` 30d deduped): input tokens = 72% of ~$195/mo Claude spend; ≥⅓ of input is stable repeated prefix (floor); busy QA days $17–25/day — realistic effect of shipping this row: 30–50% off the bill. Full numbers: `docs/harvests/HAR-02.md`.** | ❌ Missing | S-future (design session required, harness-level — touches shared `db-assembly.js` prompt-assembly path) |
