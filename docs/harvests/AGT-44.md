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

## Resolved by detachment, not by code — and the `format` type cannot carry this

John challenged the code change and proposed the **`format`** Skill type instead. It cannot be used, for two specific reasons:

- **`ARCHITECTURE.md` rule 14 (LOCKED, `S-PM-08-design`):** *"Content specialists (planners, researchers, analysts) never own Format Skills. Format Skill ownership belongs exclusively to display/editor agents."* All three agents here are content specialists.
- **It would clobber the answer.** The format branch overwrites `formatContract` — `output_type`, **`schema`**, `handler` — unconditionally, and Skills are processed in `display_order`, so a format Skill ordered after `ci-answer-intent` destroys that intent's own schema (the `AA-75`/`AA-76` class). The branch also renders only `Output type:`/`Structure:` into the prompt, never prose, so the rule text would not reach the model at all.

**But the instinct was right and the code change was the wrong fix.** Going back to what actually leaked: **all four measured failures were Priya Nair's `theory_test` and Nadia Farouk's `forecast_draft`. Marcus Webb — GEO CSO Expert's `answer` never failed `platform_language_detected` — not at baseline, not in either run.** The `channel-intelligence` attachment was scope on assumption, not evidence, and it was the sole cause of the routing regression.

**Fix applied: detach `channel-intelligence`.** One row deleted, zero code. Attachments 4 → 2 (`hypothesis-evaluation`, `data-analysis` — exactly where leaks were measured). Marcus is covered by `AGT-41`, the row that owns catching a live leak.

### The A/B that proves the causation

Same question, same model, deterministic in both directions, one variable:

| | `input_tokens` | classification |
|---|---|---|
| Guardrail on `channel-intelligence` | 1988 | `qa` (3/3) |
| After detachment | **1801** | **`forecast`** (3/3) |

The 187-token delta is the guardrails section, and `forecast` is what case 6 expects. **A writing standard attached to a five-way classification call changed its answer** — that is the generalizable finding, and it is why `traits.intent_allowlist` was never needed here: the right scope was fewer attachments, not a finer filter.

**Case 9's `answer` also reproduced 2/2** (Owen: the answer states Apple's enforcement threshold is unknown, so certification risk is unanswerable). Same Capability, and both answer-side intents now carry clause 3's instruction on how to report missing information — a plausible bias toward foregrounding a gap. Not isolated: unlike the routing call, there is no stored pre-change output to compare against.

---

# Reopen, 2026-07-30/31 (`design-arch-beta-0729` → `S-AGT-44b`) — the missing attachment, the regression it reproduces, and the fix that finally scopes it

## Why it reopened

`design-arch-beta-0729`'s pre-regression round 3 failed case 24 `news-first-card`'s `answer` on `platform_language_detected`. Checked live in `capability_skill_profiles`: `channel-intelligence` never received the attachment — the v6.3.229 close-out's "every artifact-producing agent" claim covered 2 of 5 (`hypothesis-evaluation`, `data-analysis`), not the third one that was actually measured to leak nothing at the time (see the original re-run table above: Marcus's `answer` never failed `platform_language_detected`, at baseline or in either 2026-07-29 run) but was never re-measured after `AGT-47`/`DAT-16` changed what ran through it.

## First attempt (v7.0.5) — content right, delivery wrong, reproducing the exact 2026-07-29 finding

Plain attach: `capability_skill_profiles` row, `channel-intelligence` + `platform-language-guardrail`, no allowlist. Same shape as the two existing rows.

**Reproduced this doc's own "routing regression, measured" section (above) almost exactly**, just a different destination class:

- **This session's live A/B**, case 6 `upgrade-cycles`'s real question, direct `ci-routing-intent` calls: row in → `direct`/`qa`-family classification, not `forecast`. Confirmed via a full case-6 regression run too: `journey_deviation (expected forecast, got direct)`, both artifacts otherwise clean (zero `failed_criteria`).
- **Root cause, re-confirmed in source, not just re-inferred:** `db-assembly.js`'s `AA-121` `intent_allowlist` gate (added by the original `AGT-44` session specifically to solve this class of problem) lived **inside** the `skill_type_slug === "knowledge"` branch only. A guardrails-type Skill was never eligible for the gate, so once re-attached to a capability that also carries a routing intent, it reached that intent unconditionally — same mechanism this doc's original "third error" section found, just never generalized into a fix at the time (deliberately deferred, see that section: *"the allowlist hoist is the fix and gets its own row and ID... if it does reproduce"*).
- **What the attempt proved and kept:** with the row live, case 24 passed end-to-end for the first time ever recorded — all three artifacts, `platform_language_detected` clean, under a genuinely degraded article (401, headline-only). The guardrail's *content* (clause 3's honest-gap carve-out) works on Marcus. Only capability-wide delivery was the defect.
- A same-window confound theory (an unrelated commit, `S-LAV-1d`, touching the same file) was raised and checked directly against source — an additive-only `onEvent` emit reading already-computed `enriched.system_prompt`, no change to what's sent to the model — and withdrawn; the live A/B held it constant regardless.

**Interim: reverted the insert.** Priya's and Nadia's existing attachments (live since 2026-07-29, no allowlist) were left untouched — no A/B evidence they cause any equivalent harm on `hypothesis-evaluation`/`data-analysis`, both of which lack a routing/classification intent for the guardrail to reach.

## The fix (v7.0.7) — generalize the gate, then scope the delivery

**`AGT-54`:** hoisted the `AA-121` check out of the knowledge-only branch to fire once per skill profile, before the type-dispatch branches — a generic `traits.intent_allowlist` read, unconditional on `skill_type_slug`. Unset (every Skill Profile except the ones below) stays byte-identical. One file, `api/prompt/db-assembly.js`.

**Then `platform-language-guardrail.traits.intent_allowlist`** was set on the shared `skill_profiles` row to the union of every intent it should reach across all three attached capabilities:

```
["hyp-generation-intent", "hyp-hypothesis-test-intent", "hyp-hypothesis-test-display-intent",
 "data-escalate-intent", "data-patch-intent", "data-patch-execute-intent", "data-escalate-execute-intent",
 "ci-answer-intent"]
```

`ci-routing-intent` is not on the list — the whole point. Nor are `ci-answer-display-intent`, `ci-submission-ack-intent`, `ci-resolution-ack-intent` — never measured to need the guardrail (Marcus's `answer` is the one artifact this row was ever about), added narrowly rather than by default. `channel-intelligence` re-attached with this allowlist already in place.

**Two accepted risks, named rather than silently taken (John's ask):**

1. **The trait lives on the one shared Skill row, not per-attachment.** A single `traits.intent_allowlist` filters every capability the Skill is attached to — there is no per-attachment scoping mechanism, and building one was out of this session's scope (one feature, one file). Enumerating every currently-served intent across all three capabilities into one list was the deliberate choice over leaving the Skill unscoped again.
2. **Silent rot.** If `hypothesis-evaluation`, `data-analysis`, or `channel-intelligence` ever gains a new content-producing intent, this allowlist does not know about it automatically — the guardrail will silently not reach it until someone adds it here. No detection mechanism exists for this yet.

## Re-verification

- **3/3 direct `ci-routing-intent` calls**, case 6's real question (`src/data/chiQuestions.js`, `upgrade-cycles`): `forecast` all three, matching the pre-regression baseline exactly.
- **Full `--only upgrade-cycles`:** `case_pass: true`, both artifacts `failed_criteria: []`, no `journey_deviation`.
- **Full `--only news-first-card`:** a *different* live card than the v7.0.5 proof run (case 24 pulls a rotating live article). `answer`'s `platform_language_detected` read clean again. Overall `case_pass: false` this run — but on `AGT-52`'s already-tracked, separately-filed rejection-jargon leak (`confidence_tier`, `citations array`, `rule codes` in the rejection's own reason text) plus `holistic_verdict`/`actionable_guidance_present` (the answer stops at naming the gap) — neither criterion this row owns. `AGT-52`'s row updated with this run's corroborating evidence.
- **Coverage query, all six candidate capabilities:** `hypothesis-evaluation`/`data-analysis`/`channel-intelligence` → `true`; `quality-gate`/`project-manager`/`memory-consolidation` → `false`, unchanged.
