# RUNBOOK — CHI TRUE End-to-End Regression (`SES-29`) — 24 cases

**Purpose.** John's standing acceptance test for the CHI screen, redefined 2026-07-28: every case — the 23 seed questions plus the live news-article case (#24) — must be driven to a **final rendered outcome** — through Theories, Forecasts, review extensions, and every resolution terminal — and the content of those outcomes must be **channel-sales business content**, verified by a reviewing agent, not eyeballed. A case that dies mid-journey, gets rejected, or produces hollow content is a FAIL. This supersedes `HAR-17-23q-regression.md` as the general CHI regression (that runbook remains the HAR-17-specific recovery-census procedure).

**Who runs this:** any session, any driver model (a lower model is fine — every judgment call in this runbook is either pre-decided or delegated to Owen, Proofreader). This is an execution session — **no code changes** except building/maintaining the driver script per Appendix A. Normal session start per `CLAUDE.md` → `session-setup` skill (own worktree from `origin/dev`, `.env.local` copy, inflight marker staged+pushed). Read this runbook from your worktree.

---

## 0. The locked decisions (John, 2026-07-28 — do not re-litigate)

1. **D1 — Theory selection:** when Priya (analyst) presents generated Theories, the driver always selects the **first-listed** Theory. Never write-your-own.
2. **D2 — Review fork:** whenever a direct answer comes back flagged for review, the driver always takes the **review path** (flagged answer → Priya's Theories → first Theory → test → Forecast). Never "Good, thanks."
3. **D3 — Expected-outcome baseline:** the table in §2 is the locked contract. Any deviation from a question's expected journey = FAIL to investigate. John approves all baseline changes.
4. **D4 — Strict rejection line:** ANY rejection by Owen (Proofreader) = that question is red, and triggers the §4 five-try probe to measure why. No "majority accept" softening.
5. **D5 — Content review by agent:** content quality is judged by Owen via the `AGT-35` content-context review capability (LLM-as-judge), never by the driver model's own reading. The 2-question live-browser leg (§6) additionally proves rendering.
6. **D6 — News door (case 24, added same day):** every run also drives one **live web article** end-to-end through the news-card door — Jordan Ellsworth's (web-search agent) live card fetch → **first-listed card** (the D1 rule's analog) → article extraction → full analysis journey. The article's *content* varies run to run by nature; what's locked is the *procedure* and the *journey shape* (Direct answer — the routing rule that treats a delivered headline as an external fact is part of what this case protects). Owen judges the content as usual.

## 1. Prerequisites — check before starting, stop if missing

**Step 0 — Confirm the preview is current (added 2026-07-28, `SES-015`, v6.3.209 — do this before every step below).**

Run `node scripts/check-deploy-current.js`. It must exit 0 before invoking any case.

A non-zero exit invalidates the entire run — the 24 cases would execute against a build that does not contain the code under test, and the result would be reported against the wrong commit. Do not start the run; resolve the deploy first (the script prints the remedy). Exit 2 means the check itself could not run (no `VERCEL_TOKEN`) — that is not a pass either.

The driver posts to `/api/capabilities/execute`, which is never edge-cached — so this gate is sufficient on its own here. The bundle-grep second layer in `STANDARDS.md` Section 6 applies only to frontend visual QA, such as this runbook's own deployed-preview spot-check (§6).

1. **`AGT-35` (Owen content-context review Skill) must be live.** Check `docs/FEATURES.md`'s `AGT-35` row for Status ✅ and the shipped capability/intent slugs, and verify the rows exist in Supabase (project `rallojeqnkgtxgsdsnqm`). If not shipped: **stop** — run `AGT-35`'s design/data session first. Do not substitute your own content judgment (D5).
2. **Driver script.** `SES-29`'s row records where the committed driver lives once it ships (proposed: `scripts/chi-true-regression.mjs`). Until then, build it in your scratchpad **exactly** per Appendix A — do not improvise the call sequences.
3. **Endpoint + auth.** `POST https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app/api/capabilities/execute`, header `x-vercel-protection-bypass` (value = `VERCEL_AUTOMATION_BYPASS_SECRET` in your worktree's `.env.local`; see `docs/ENV-VARS.md`). `tenant_id: "global"` on every call.
4. **Baseline corpus integrity (added 2026-07-28, S-SES-29 root-cause findings).** Verify every `the_library` row with `is_baseline=true` has `status='active'` (Supabase, project `rallojeqnkgtxgsdsnqm`) before starting. A baseline row sitting superseded/archived is an instant retrieval hole (`match_the_library` filters `status='active'`) that fails its dependent cases — found live in the first run: the orphan-superseded Signal Mobile scenario broke case 8's designed Horizon-vs-Signal comparison. Any flipped row: **stop** — repair first (`DAT-11` owns enforcement).

## 2. The baseline table (D3) — 24 cases, expected journeys

Questions #1–23 come verbatim from `src/screens/MarketIntelligenceScreen.jsx`: `STATIC_QUESTION` (#1), `ROTATING_POOL` (#2–11), `FIXED_DRAWER_TAIL` (#12–23), in that order. Grep those constants in your worktree — never retype from this table (labels below are abbreviated). Case #24 has no fixed text — its question is built from whatever headline Jordan's first card carries that run (Appendix A4).

| # | id | Question (abbreviated) | Expected journey | Fixed resolution |
|---|---|---|---|---|
| 1 | library-catalog | Library data + how to use it | Direct answer | — |
| 2 | japan-geo | Japan fastest-growing GEO — why | Direct answer | — |
| 3 | crest-wireless | Crest Wireless promo replication | Direct answer | — |
| 4 | geo-revenue | GEO revenue trend 2023–25 | Direct answer | — |
| 5 | reseller-reqs | Apple Authorized Reseller requirements | Direct answer | — |
| 6 | upgrade-cycles | Upgrade cycles by country → planning | **Forecast journey** | **edit-then-accept** |
| 7 | at-risk-accounts | Biggest at-risk accounts + why | Direct answer | — |
| 8 | horizon-store | Horizon vs Signal Mobile NPI readiness | Direct answer | — |
| 9 | vitrine-tech | Vitrine Tech training gap + cert risk | Direct answer | — |
| 10 | smartphone-growth | Emerging-market growth → investment | **Forecast journey** | **accept** |
| 11 | coop-mdf-benchmark | Co-op/MDF vs benchmarks | Direct answer | — |
| 12 | vietnam-reseller | Vietnam reseller performance | Direct answer | — |
| 13 | meridian-electronics | Meridian digital-shelf compliance FR/IT | Direct answer | — |
| 14 | emea-coop-large-format | EMEA large-format co-op low — why | Direct answer | — |
| 15 | jinhua-digital | Jinhua recovery in Greater China | Direct answer | — |
| 16 | elevate-mobility | Elevate Mobility India expansion risks | **Forecast journey** | **accept** |
| 17 | nippo-carrier | Nippo top performer — scale it | Direct answer | — |
| 18 | altiplano-movil | Altiplano Móvil installment program | Direct answer | — |
| 19 | emea-emerging | Outlook — EMEA Emerging | **Forecast journey** | **accept** |
| 20 | southeast-asia | Outlook — Southeast Asia | **Forecast journey** | **info-only** |
| 21 | training-turnover-benchmark | Training/turnover vs benchmarks | Direct answer | — |
| 22 | latin-america | Outlook — Latin America | **Forecast journey** | **reject** |
| 23 | south-korea-coop | South Korea co-op utilization | Direct answer | — |
| 24 | news-first-card | Live news door: Jordan's first card → article → analysis (D6) | Direct answer (news door) | — |

**18 direct answers (17 typed + 1 news-door) + 6 Forecast journeys.** The six fixed resolutions deliberately cover every terminal the screen offers: accept ×3, edit-then-accept ×1, reject ×1, info-only ×1 — same question, same resolution, every run, so runs are comparable (per-question assignments are John-vetoable baseline content; corrected-baseline provenance in `docs/SESSIONS.md`, 2026-07-28 entries).

**Review extensions (D2):** any direct-answer question whose final display sets `needs_review` extends into the review path (Appendix A §A3) — that extension is **part of** its expected journey, not a deviation. **First-run duty:** record which questions actually flag, append that flagged-set to this table (new column), and get John's approval — after that, a change in the flagged-set between runs is itself a deviation (FAIL to investigate).

**Routing drift:** a question routing to a different intent than its expected journey (direct↔theory/forecast/correct) is a FAIL — routing behavior is part of what this test protects.

## 3. What the driver measures per question

Per question record: expected vs actual journey; terminal state; wall time; every `trace_id`/`span_id`; recovery payloads seen on `in_progress` continues (HAR-17 contract — count them); Owen's content verdicts (§5) for each final artifact; probe data (§4) if any rejection occurred. Sequential, one question at a time — never parallelize (distorts the overload/recovery census).

**Failure attribution (added 2026-07-28, S-SES-29 root-cause findings):** when recording a failure cause, cite the failing hop's `durable_hops` `intent_slug` — never the error string alone. The shared "reasoning-write handler" prefix is emitted by every intent reaching that handler and misattributed 2 of the first run's 8 denial deaths (Nadia — Data Analyst's `data-patch-execute-intent` deaths read as Elena — Reasoner `reasoner-intent` deaths).

## 4. The rejection probe (D4)

Trigger: Owen's quality gate blocks (`guardrail.result === "block"`) at any point in any question's journey.

Procedure: re-run **that question's full journey from routing onward, fresh, 4 more times** (5 total tries). Record per try: accepted or rejected; if rejected, `rule_violated` + `reason` verbatim; if accepted, run the content review (§5) on the accepted answer. The question is **FAIL regardless** (strict line) — the probe's output is the *why*:

- **0–1/5 accepted** → consistent gap (usually Data Room). The five captured reasons are the evidence packet; file/extend the relevant backlog row.
- **2–4/5 accepted** → guardrail instability — flakiness finding, report the ratio prominently.

A transient infrastructure death (timeout/5xx after HAR-17's one automatic recovery) is **not** a rejection: re-run that question once; a second death = FAIL (infra class), no probe.

## 5. Content review — Owen, per final artifact (D5)

For every final artifact of every question, call the `AGT-35` capability (slugs from its FEATURES row) and record the structured verdict. Artifacts in scope:

- Direct answer: final display `headline` + `body` + `key_data_points`.
- Theory test result: `supports` / `complicates` / `consider` texts.
- Forecast draft: Nadia's `proposed_action` (and `critique` if present).
- Any rejection shown to the user: guardrail `reason` + triage text (must read as business guidance — what's missing and what to do — not platform narration).

Verdict contract (the criteria live in Owen's Skill data; this is the shape the driver consumes): `named_entities_present` (≥1 real partner/GEO/region), `quantitative_content_present` (≥1 real metric), `actionable_guidance_present`, `platform_language_detected` (with offending quote), overall `pass` — each with a quoted-evidence field. **Any `pass: false` = that question FAILs on content.** Driver never overrides Owen's verdict; disputes go to John with the verdict's own quotes (every judge call is logged with a trace like any AI call — auditable).

## 6. Live-browser leg — rendering proof, every run

Server-mirror proves the content is right; this proves the screen shows it. On the deployed dev preview, drive **#12 (vietnam-reseller — direct)** and **#10 (smartphone-growth — Forecast journey: Theories drawer → click first Theory → Theory Result → Create Forecast → Accept)**. Verify: chat bubbles + Column 2 drawers render the journey's content (spot-match a couple of phrases against the server-mirror payloads); Column 3 Audit Pipeline Log shows the hops; console clean of new errors.

CHI input quirk: the screen drops keystrokes under re-render. Workaround: set the input's value via its native value setter (reset React's value tracker), dispatch a native `input` event, then a native Enter `keydown` — do not simulate per-character typing.

## 7. Scoring

- **Question PASS** = actual journey matches baseline (incl. approved flagged-set) AND all Owen content verdicts pass AND zero rejections AND no unrecovered infra death.
- **Run PASS** = all 24 cases PASS AND browser leg passes. One automatic HAR-17 recovery inside a journey does not fail a case (it's designed behavior) — but report every recovery.
- **Case 24 specifics:** the news fetch itself failing (no cards, or `fetch-article` failing on the first card) is an infra-class FAIL of case 24, not a skip — the door is part of the product. `fetch-article` failing *open* (screen behavior: proceeds without article text) = run the journey as the screen would, but report the degradation prominently; content verdicts then judge what the user actually got.
- Anything else = run FAIL, with per-question causes.

## 8. Filing results (before the session ends)

- Dated run-report section in `docs/SESSIONS.md`: per-question table (expected vs actual, terminal, wall time, recoveries, content verdict), probe blocks for any rejections, browser-leg result, run verdict.
- Genuinely new failure class → new row via atomic `feature_id_counter` (`session-setup` §3b). Never read-and-increment.
- Baseline changes (flagged-set, resolution reassignments, de-rejected questions) → proposed to John, applied to §2 only on his approval, in this runbook via normal edit+push.
- Close out per `session-setup` (push `HEAD:dev`, delete inflight marker, remove worktree).

**Budget:** ~60–95 min nominal (18 direct ≈ 1–2.5 min each incl. the news door's card-fetch + article-extraction overhead; 6 Forecast journeys ≈ 3–5 min each), plus 5× question-time per rejection probe, plus ~30 judge calls, plus browser leg. Plan ~2h, ≈$5–10 platform cost.

---

## Appendix A — Driver call sequences (verified against `MarketIntelligenceScreen.jsx` 2026-07-28, v6.3.189 tree)

**Driver-maintenance QA rule (added 2026-07-28, S-SES-29 root-cause findings):** any change to the driver script must self-test at least one full **Forecast journey** end-to-end (a §2 `accept` or `edit` case) before commit — not only a direct case. The v6.3.193 build QA'd only a direct case, so the entire A2.5 commit path shipped broken (object-vs-`.text` payload divergence) and cost the first full run 8 cases.

All calls: `POST` to the §1 endpoint, JSON body, `tenant_id: "global"`, `stream: false`, plus the bypass header. **Continue loop (every call):** any `{status:'in_progress', job_id}` response → `POST {action:'continue', job_id}` until terminal; a body carrying `recovery` is a HAR-17 recovery — record it, and it does not count against the continue cap (10). A terminal `{status:'failed'}` = throw. Terminal results unwrap as `result.status ? result : {...result.content, trace_id, span_id}`. The screen's fire-and-forget narration acks (`ci-submission-ack-intent`, `ci-resolution-ack-intent`) are **skipped** by the driver — not load-bearing, not part of any journey's gate; the browser leg covers their rendering.

### A1. Direct answer
1. `{capability_slug:"channel-intelligence", intent_slug:"ci-routing-intent", agent_id:"marcus", task_context:{goal:<question>}, runtime_context:""}` → expect `intent:"qa"`.
2. `{...ci-answer-intent..., task_context:{goal:<question>}, runtime_context:""}` → `qa` (answer, confidence_tier, citations, needs_review, review_reason).
3. `{capability_slug:"quality-gate", intent_slug:"qg-review-intent", agent_id:"owen", task_context:{question, candidate_answer:qa.answer, confidence_tier, citations, agent_id:"marcus", capability_slug:"channel-intelligence", intent_slug:"ci-answer-intent"}}` → `gate`. `gate.guardrail.result==="block"` → §4 probe. `gate.final_answer` present = Owen's retry answer wins.
4. `{...ci-answer-display-intent..., task_context:{answer, citations, confidence_tier, needs_review: qa.needs_review || gate.eval?.result==="revise", review_reason}}` → final display. `needs_review` on the final → A3 extension (D2).

### A2. Forecast journey (routing intent ∈ {theory, forecast, correct})
1. Routing as A1-1. If `extracted_hypothesis` is non-null the screen would prefill it — the driver still follows D1 semantics: treat it as candidate #1. **`<picked>` everywhere below means the picked hypothesis's `text` string (`hypotheses[0].text`) — never the hypothesis object.** The screen's own `chosenText` is that `.text`; passing the object leaks its `id` ("H1") and rationale into commit payloads, where the Data Room UUID guards correctly deny them (first-run root cause, S-SES-29 findings, `SES-31`).
2. `{capability_slug:"hypothesis-evaluation", intent_slug:"hyp-generation-intent", agent_id:"priya", task_context:{flagged_question:<question>, flagged_answer:"", review_reason:"user-initiated, no explicit claim extracted"}}` → `hypotheses[]`; pick `[0]` (D1).
3. `{...hyp-hypothesis-test-intent..., agent_id:"priya", task_context:{hypothesis:<picked>, intent:<routing intent>, flagged_question:<question>, flagged_answer:"", prior_hypothesis_test:null}}` → analysis (supports/complicates/consider/confidence).
4. `{...hyp-hypothesis-test-display-intent..., agent_id:"priya", task_context:{supports, complicates, consider, confidence}}` → Theory Result display.
5. Per the question's fixed resolution (§2):
   - **info-only:** stop here (terminal).
   - **accept / edit / reject:** commit first — `{capability_slug:"memory-consolidation", intent_slug:"reasoner-intent", agent_id:"elena", task_context:{original_question:<question>, flagged_answer:"", committed_hypothesis:<picked>, intent, hypothesis_test:<supports+complicates+consider texts joined>, was_override:false}}`, then `{capability_slug:"data-analysis", intent_slug:"data-patch-intent", agent_id:"nadia", task_context:{disputed_chunk_id:null, correction:<picked>, user_reasoning:<same joined texts or picked>}}` → `{confirmation_id, proposed_action, critique}`.
   - **accept:** `{action:"resolve", confirmation_id, resolution:"accept", edited_task_context:null}`.
   - **reject:** same with `resolution:"reject"`.
   - **edit-then-accept:** `resolution:"edit"`, `edited_task_context:{disputed_chunk_id:null, correction:<picked + " — reviewed and confirmed against current quarter data.">, user_reasoning:<same edited text>}` → returns a NEW `confirmation_id`/`proposed_action` → resolve `accept` on it. (Fixed edit string — deterministic across runs.)

### A3. Review extension (from a flagged direct answer — D2)
`{...hyp-generation-intent..., task_context:{flagged_question:<original question>, flagged_answer:<final display's plain text>, review_reason:<the flag's review_reason>}}` → then A2 steps 3–5 with `intent:"theory"`, `flagged_answer` carried through, resolution **accept**.

### A4. News door — case 24 (D6; verified against `fetchNewsCards()`/`analyzeNewsCard()` 2026-07-28, v6.3.190 tree)
1. `{capability_slug:"web-search-news", intent_slug:"ws-news-search-intent", agent_id:"jordan", task_context:{}}` → `cards[]` (Jordan real-delegates to the news-cards formatter via the ordinary harness loop — nothing special for the driver). Empty/no cards → infra-class FAIL of case 24 (§7).
2. Pick `cards[0]` (D6). Record its `headline` and `url` in the run report — that's this run's article identity.
3. `POST /api/fetch-article` `{url: cards[0].url}` → `{text, source}`. Non-OK → proceed with `article_content:null` (the screen's own fail-open) and report the degradation (§7).
4. Build the question exactly as the screen does: `` `New industry development: ${headline}. What does this mean for our channel program positioning?` ``
5. Run journey A1 with that question, spreading `{article_content:<text>, article_source:<source>, article_url:<url>}` into `task_context` of the **answer, gate, and display** calls (never the routing call — routing classifies the plain question text only). Expected: routes `qa` → full A1 → Owen content review on the final display. Flag → A3 extension as usual.
