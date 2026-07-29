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
