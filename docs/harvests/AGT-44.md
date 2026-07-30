# `AGT-44` (Architecture) — artifact-producing agents narrate platform mechanics into user-facing prose

🚨 Beta-gate, `docs/BETA.md` bucket 1 row 21. Designed `S-AGT-44-design` (v6.3.229).
Kickoff: `docs/kickoffs/v6.3.229-AGT-44-platform-language-guardrail.md`.

---

## How it was found, and how the scope widened

**Filed 2026-07-29 (`S-AGT-36-design` QA)** as *"Priya's theory-test artifact narrates platform internals to the user."* On case 12's review extension, Owen — Proofreader failed the `theory_test` artifact on his **ordinary rich-answer rubric** (`pass: false`) — not the `honest-gap` class — quoting synthesized/simulated-scenario narration and `task_context carries artifact_type`. Independent of any scoring change: it failed under every rubric, and it was what kept case 12 red even once Marcus Webb — GEO CSO Expert's own answer passed §5b cleanly.

**Widened the same day by the pre-regression check** (`design-arch-beta-0729`, 3 cases, 9 min — full result in `docs/BETA.md` §3 bucket 1). Of the 4 failing artifacts across cases 9 and 6, **all 4 failed `platform_language_detected` and 3 failed *nothing else*** — every other criterion (`named_entities_present`, `quantitative_content_present`, `actionable_guidance_present`, `asked_metric_present`) passed with real quoted business content. The leak is confined neither to Priya Nair — Forecast/Theory/Performance Expert nor to `theory_test`: `forecast_draft` leaked identically on both cases, and case 9 `vitrine-tech` is a direct question, not case 12. Owen's verbatim critique: *"Platform back-office narration dominates."*

That made it **the single dominant bucket-1 blocker** and promoted it into `BETA.md`'s queue as row 21 — it had declared `Beta-gate (bucket 1)` earlier the same day and was never listed there.

## Root cause (design session, verified live in Supabase — not inferred from the row)

**The standard exists in exactly one place on the platform, and it is the grader.** *"Write business content, not platform narration"* lives inside Owen's `qg-content-context-intent` judging criteria and appears in **no** producing agent's Skill. The writers are graded on a rule they were never given.

Two producers were read in full:

- **Priya's `hyp-hypothesis-test-intent`** goes further than silence — its `NEVER LEAVE A SECTION EMPTY` paragraph hands her a worked sentence that *commits* the violation: *"I checked for contradicting figures, missing agreements, and timing gaps, and found none in the Data Room."* That fires exactly when a section is empty, which is the intermittent trigger.
- **Nadia Farouk — Data Expert's `data-patch-intent` has no `method` at all** — `objective` + `output_desc` only, both describing pure platform mechanics (opinion/promote/no_action, human confirmation, routing onward to `data-patch-execute-intent`). Her `proposed_action.content` is judged as user-facing business prose with nothing telling her it is user-facing.

## Why this is not the banned-phrase list rejected the same morning

`AGT-36`/`AGT-41` recorded a rejection of a banned-phrase list in Skill data, reasoning from `HAR-21`/`AGT-37`: both worked because a **known-correct value existed to substitute** (a UUID validated by structure), and generative answer text has none, so a blocklist would be a content hardcode.

**John's distinction, 2026-07-29:** that rejection was about verifying whether *a number is real*. This is a **writing standard** — who the reader is and what good content looks like for them. Two separate problems.

The precedent that actually governs it was not considered in that rejection and is directly on point: the **VOICE** section in `api/prompt/db-assembly.js` (`AA-127`) — a platform-wide register instruction appended to every call for every agent, created for the identical failure shape (*the model mirroring third-person framing from its own instructional text*), and explicitly covering the same structured fields (`supports`/`complicates`/`consider`). `AGT-44`'s Skill is that pattern expressed as data instead of a hardcoded string.

## The mechanism — John's call

**One shared Guardrails Skill, `platform-language-guardrail`, attached to every Capability whose output a user reads.** Not per-agent copies of the same prose: one row, four attachments, zero lines of code. `db-assembly.js` already composes multiple Skills per Capability and already renders a `guardrails`-type Skill as a `CONSTRAINTS & GUARDRAILS` section, second-to-last, just before VOICE.

| Capability | Agent | The artifact the user reads |
|---|---|---|
| `hypothesis-evaluation` | Priya Nair — Forecast/Theory/Performance Expert | the theory test |
| `data-analysis` | Nadia Farouk — Data Expert | the draft correction |
| `channel-intelligence` | Marcus Webb — GEO CSO Expert | the answer |
| `quality-gate` | Owen Marsh — The Proofreader | the rejection text |

**`memory-consolidation` / Elena Cho — The Reasoner deliberately excluded — John's explicit call.** Her output is not judged by Owen, so no leak has ever been measured on it. Recorded so a later session does not re-widen the scope by assuming it was an oversight.

## Three live facts that shaped the tasks

1. **No Capability on the platform has a Guardrails Skill today** — every one is identity + behavior + knowledge + intents. This is the first.
2. **`skill_types` has no `guardrails` row**, and `skill_profiles.skill_type_slug` carries an FK to it (`skill_profiles_skill_type_slug_fkey`), so the type row must be inserted first or the Skill insert fails. `db-assembly.js`'s `SKILL_ORDER` already expects the slug (`guardrails: 6`).
3. **No Skill is currently attached to more than one Capability.** `capability_skill_profiles` is many-to-many in shape; this is the platform's first shared Skill — deliberate, not accidental.

Also verified: `capability_skill_profiles.level` is an **integer** (2 on every Skill of all four Capabilities bar one `null`-ordered intent at 1), not a label.

## The trap the kickoff pins deliberately

**The rule text must live in the `guardrails` column, not `method` or `objective`.** `buildSections()`'s `guardrails` branch reads only `sp.guardrails` (plus `agent_configs` guardrail entries) — text in `method` is **silently dropped**, the model never sees it, and every text-level check still passes. That is precisely what `AGT-36b` shipped into QA and is now `STANDARDS.md` Section 5's standing check. The persisted test (`tests/regression/AGT-44-platform-language-guardrail.js`) asserts both directions: the array in `guardrails` reaches the section, and the same text in `method` does not.

## Deliberately out of scope

- **Owen's `qg-content-context-intent` is frozen this session.** Changing the writers and the grader in the same run means a green result cannot distinguish improved prose from a relaxed grader. His criteria list and the new Skill's clause 2 overlap on purpose for now — collapsing them into one source is `AGT-48`.
- **`AGT-41` (Architecture) 🚨 is not settled by this and does not close it.** This session gives the writers the standard; `AGT-41` is what makes anything *catch* a breach live — Owen's content check currently runs **only** from `scripts/chi-true-regression.mjs`, verified by grep (zero callers in `src/`, `api/`, `lib/`). The live guardrail on the screen is `qg-review-intent`, whose `rule_violated` enum is citations/groundedness only (`citation_missing`, `synthesized_as_fact`, `empty_retrieval`, `hallucinated_internal_data`, `missing_confidence`) — it does not look for platform language at all. Both rows are needed; neither closes the other.
- **`AGT-42` (Architecture)** — whether an agent may name another agent to the end user. The Skill text is deliberately silent on agent names so it cannot pre-empt that decision; Owen's current criterion already permits conversational first names.
- **`AGT-47` (Task Success Rate) 🚨** — case 6's `forecast_draft` rendering hollow while its own upstream `theory_test` holds the figures. Fails `asked_metric_present` and survives this fix entirely. Not root-caused.
- **No wording pass on Marcus's `ci-answer-intent`.** `AGT-37`'s generalization stands. He receives the standard via `channel-intelligence`; his own `method` is untouched.
- **Priya's `objective` keeps the phrase "CSO Data Room".** It instructs her what to *query* — legitimate operational instruction, not output prose. The new Skill governs what she writes, not what she reads.

## Closure gate

Case 9 `vitrine-tech`: **both** `theory_test` and `forecast_draft` clear `platform_language_detected`. That case failed on that criterion only, on both artifacts, in the pre-regression check. Case 6's `theory_test` clears it too; its `forecast_draft` is expected to still fail on the three `AGT-47` criteria. Case 12 must stay PASS.

---

# QA run, 2026-07-29 (`S-AGT-44-design`, self-verified) — the fix works and the one survivor is a measurement defect I introduced

Deploy gate **LIVE on `cd4bbdd`** before the run. Suite **22/22** including the credential-gated data half (proven running by a negative control: without credentials it prints SKIPPED and the file still reports `[PASS]` — that gap is `SES-61`). Live assembler verified independently on all four Capabilities: one `guardrails` section, both pinned phrases, VOICE still last.

**Full `REPORT_JSON` for all three cases captured to files** — the first run of this driver whose judge evidence survives it (`SES-56`'s gap).

## Scoreboard against the pre-regression baseline

Baseline: 4 artifacts failed `platform_language_detected`, 3 of them failed nothing else.

| Case | Artifact | Baseline | After | Read |
|---|---|---|---|---|
| 9 `vitrine-tech` | `theory_test` | fail — platform language only | ✅ **PASS**, clean | Priya's deletion worked |
| 9 | `forecast_draft` | fail — platform language only | ❌ still `platform_language_detected` | **contaminated evidence, see below** |
| 9 | `answer` | pass | ❌ Owen's overall `pass: false`, **zero** scored criteria failed | regression on his holistic flag, not on platform language |
| 6 `upgrade-cycles` | `theory_test` | fail — platform language only | ✅ **PASS**, clean | fixed |
| 6 | `forecast_draft` | fail — platform language + 3 others | `platform_language_detected` **false**; fails `quantitative_content_present` only | **exactly what the kickoff predicted** — the residue is `AGT-47` |
| 12 `vietnam-reseller` | all 3 artifacts | PASS (79 s) | ✅ **PASS** (234 s), `platform_language_detected` false on `answer`, `theory_test` **and** `forecast_draft` | held, and the artifact `AGT-44` was originally filed against is clean |

**Case-level count is unchanged at 1 PASS / 2 FAIL. Criterion-level, `platform_language_detected` failures went 4 → 1**, and that one has contaminated evidence. **`AGT-44` is not closable on this run**, for two reasons beyond the contamination:

- **Case 9's `answer` regressed** — it passed in the baseline; now Owen's overall `pass` is `false` with **zero** scored criteria failing. His critique: the answer reports Vitrine's Q3 completion (40%) but never states Brazil's target or the actual gap. A content miss, not platform language.
- **Case 6 gained `journey_deviation`** (`expected forecast, got direct`).

Both new failures are on `channel-intelligence` — the one Capability where the Skill reaches routing, display and ack intents as well as the answer. That is the correlation behind the allowlist finding below; `CHI-78`'s known run-to-run variance means it is not proof.

**3 of the 4 baseline `platform_language_detected` failures cleared, including a `forecast_draft`** — which is what makes the fourth readable as contamination rather than as Nadia Farouk — Data Expert being unfixable.

## The measurement defect — two design errors, both mine

Owen Marsh — The Proofreader's three quoted "offending phrases" on case 9's `forecast_draft`:

> `task_context carries artifact_type… Per-type calibration: for rejection artifacts, criteria 1-2 apply to what the rejection references… the Data Room contains no record`

1. **The first two are verbatim from Owen's own `qg-content-context-intent.method`** — it opens *"Your task_context carries artifact_type (one of: answer, theory_test, forecast_draft, rejection)"* and contains *"Per-type calibration: for rejection artifacts, criteria 1-2 apply to what the rejection references…"*. Neither string is in Nadia's prompt. **He is quoting his own instructions as evidence against the artifact.**
2. **The third is verbatim from this session's own new Skill.** Clause 3 read: *never "the Data Room contains no record of this"*. Attaching that Skill to `quality-gate` put the banned phrase into the judge's prompt as a literal string, and attaching it to `data-analysis` handed Nadia the exact sentence to copy — **the `AA-127` failure mode this fix cited as its own precedent.**

**This also retroactively invalidates `AGT-44`'s original evidence.** The row cited `task_context carries artifact_type` as proof of Priya's leak on case 12; that string is Owen quoting himself. The design session raised this suspicion before building and dropped it — the controlled before/after has now reproduced it.

**Corrective design, data-only:** state clause 3 positively with no quoted bad sentence, and **detach the Skill from `quality-gate`** — the agent policing the vocabulary must not be fed it.

## Third error — the Skill fires on non-prose intents

A Skill attaches to a **Capability**, so it reaches every intent of that Capability. Verified live: `ci-routing-intent` (a 5-way classification with a ~95-token output), `ci-answer-display-intent` (pure hand-off routing), `ci-resolution-ack-intent` and `data-patch-execute-intent` **all** receive the full 836-char guardrails section.

`AA-121` already solved exactly this for Knowledge Skills — `traits.intent_allowlist` — for the same stated reason (*"Knowledge Skill Profiles attach to a capability, not an intent, so historically fired RAG unconditionally on every call for that capability — including lightweight, non-analytical intents"*). But that gate lives **inside** `buildSections()`'s `if (typeSlug === "knowledge")` branch, so it does not apply to a guardrails-type Skill. Hoisting the check above the type branches is a generic trait read, not a conditional — the shape `.claude/rules/capabilities-are-data.md` requires.

## Corrections applied, 2026-07-29 (John's approval) — data-only, plus one test line

1. **Clause 3 restated positively.** Was: *…what would resolve it. "No comparable partner has reported this" -- never "the Data Room contains no record of this".* Now: *…what would resolve it -- describe the absent information itself, never where you looked for it.* A prohibition list (clause 2) names vocabulary; a counter-example supplies a whole sentence **in the artifact's own voice**, which is the part that gets copied — and quoted back as a finding. New assertion `B2b` pins its absence.
2. **Detached from `quality-gate`.** Verified live afterwards: Owen Marsh — The Proofreader's assembled prompt now contains **zero** guardrails sections, while Priya's still carries the rule with the counter-example gone. Attachments 4 → 3.

The one non-data edit: the persisted test asserted the four-Capability attachment set, so detaching made the suite red until that line changed — recorded because the change was approved as "data-only" and was not quite.

**#3 (hoisting `traits.intent_allowlist` out of the Knowledge branch) was deliberately NOT done.** John's call, and the better sequencing: the two breakages it would address are unproven from a single run against `CHI-78`'s known variance. Measure whether they reproduce before editing a shared harness file on a suspicion. If they do reproduce, the allowlist hoist is the fix and gets its own row and ID claimed at that point; if not, they were variance and no code change was ever needed. (No ID is minted here on purpose — an unclaimed id-shaped string in prose gets copied.)

**Candidate cause of a new failure, not proven:** case 6 picked up `journey_deviation (expected forecast, got direct)` that the baseline did not have — Marcus Webb — GEO CSO Expert's routing classification now carries 836 chars of writing instruction it has no use for. `CHI-78` documents real run-to-run variance on this screen, so this is a suspicion to test, not a conclusion. **Since measured — see the re-run section below.**

---

# Re-run after the corrections, 2026-07-29 — the target criterion is fully met; two regressions are mine

**Zero `platform_language_detected` failures across every artifact judged, down from 4 at baseline.** `AGT-44`'s own defect is gone.

| Case | Result | Platform language | Residue |
|---|---|---|---|
| 12 `vietnam-reseller` | ✅ **PASS** (96 s) | false | — |
| 9 `vitrine-tech` | ❌ FAIL (58 s) | **false** | `answer` fails Owen's holistic verdict with **zero** scored criteria failing |
| 6 `upgrade-cycles` | ❌ FAIL (236 s) | **false** on both artifacts | `journey_deviation` + `forecast_draft` fails 3 content criteria (`AGT-47`) |

Case-level count unchanged at 1 PASS / 2 FAIL. What changed is *why*: the platform-language defect is gone from all of them, and what remains is `AGT-47`'s content loss plus two regressions this session introduced.

## The routing regression, measured

The Skill is attached to `channel-intelligence`, so it also reaches `ci-routing-intent` — the five-way classification whose output the driver turns into `actual_journey`.

- **Pre-change:** the pre-regression run's three routing calls (2026-07-29 20:55 / 20:59 / 21:02 UTC, in case order 9 → 6 → 12) returned `qa` / **`forecast`** / `qa` — case 6 classified correctly.
- **Post-change:** `qa`, `confidence: high`, **3/3 identical direct calls** plus 2/2 in the full runs. `input_tokens` 1988, of which the guardrails section is ~200.

*One inferential step, stated plainly:* routing deliverables carry a null `title`, so the pre-change rows are matched to their cases by timestamp order within that run's window, not by stored question text.

**Conclusion:** adding a writing standard to a classification call changed its answer. This is the third design error and the one that needs code — `AA-121`'s `traits.intent_allowlist`, hoisted out of `buildSections()`'s Knowledge-only branch so a Guardrails Skill can scope itself to `ci-answer-intent` + `ci-answer-display-intent`. Hoisting is behaviour-identical for the only two Skills that set the field today (`ci-knowledge`, `hyp-knowledge` — both Knowledge type, verified live).

**Case 9's `answer` also reproduced 2/2** (Owen: the answer states Apple's enforcement threshold is unknown, so certification risk is unanswerable). Same Capability, and both answer-side intents now carry clause 3's instruction on how to report missing information — a plausible bias toward foregrounding a gap. Not isolated: unlike the routing call, there is no stored pre-change output to compare against.
