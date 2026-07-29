# AGT-36 (Architecture) — harvest

Detail moved out of `docs/FEATURES.md`'s `AGT-36` row 2026-07-29 (`S-AGT-36-design`) when the row exceeded the 2000-char cap (`CLAUDE-DESIGN.md` step 9, `check-session-docs.js` check 3d). **Nothing here was deleted from the row — this is the long form; the row keeps the decision, the status and a pointer here.**

---

## Original intake — the problem as first filed

**Judge rubric vs designed graceful-failure questions — John decision required (runbook D3 baseline change).** Cases 12 (`vietnam-reseller`) and 23 (`south-korea-coop`) are `docs/APPLE-DATA-ROOM-SOURCE-DATA.md`'s own designed honest-gap questions (Korea rows in `the_library`: zero, ever) — Owen — Proofreader's `AGT-35` four-criteria rubric structurally fails the honest answer the spec mandates.

The decision asked for: a distinct expected-outcome class for designed-gap questions, and whether `AGT-35`'s criteria vary by artifact/outcome class (which makes the open judge-threshold question from `S-AGT-35` concrete). Either way both answers also lacked escalation guidance ("who owns it / what to do next") — a real generation gap that survives any rubric change.

## The locked decision (John, 2026-07-29) — full text

The **`honest-gap` outcome class**, locked into `docs/runbooks/CHI-TRUE-REGRESSION.md` as **D7** + a new §5b, with cases 12 and 23 tagged in the §2 table and a matching exception added to §7's scoring line.

Owen — Proofreader still judges these artifacts and the full verdict is still recorded verbatim; only the pass bar changes:

| Criterion | Rich-answer class (default) | `honest-gap` class |
|---|---|---|
| `named_entities_present` | required | informational only |
| `quantitative_content_present` | required | **must be false** |
| `actionable_guidance_present` | required | **required, unchanged** |
| `platform_language_detected` | must be false | **must be false, unchanged** |

Deliberately does **not** turn either case green: both failed the last two bars legitimately in the first run, so the generation side still has to improve. The change removes an impossible bar; it does not lower a real one.

## Design session, 2026-07-29 (`S-AGT-36-design`, v6.3.220, Fable 5)

Kickoff: `docs/kickoffs/v6.3.220-AGT-36-honest-gap-scoring-and-answer.md`. Both halves in one session — 3 files + one `skill_profiles` row, 4 tasks — because they share one verification: the scorer is only provable by running cases 12 and 23, and those runs only mean something once the answer side has changed too. Shipping either alone leaves it unverified.

### Skill/Capability disclosure (verified live against Supabase, this session)

| | |
|---|---|
| New Skill or edit? | **Edit** — `ci-answer-intent` already exists (type **Intent**, name "Q&A Answer") |
| Capability | `channel-intelligence` |
| Other Skills on that Capability | 7, all untouched: `ci-identity` (Identity), `ci-behavior` (Behavior), `ci-knowledge` (Knowledge), `ci-routing-intent`, `ci-answer-display-intent`, `ci-resolution-ack-intent`, `ci-submission-ack-intent` (Intent) |
| Agents holding that Capability | **`marcus` only** — one row in `agent_capability_assignments`. No shared-Skill blast radius |

Also verified before speccing, so the fix is not misdirected: `api/prompt/db-assembly.js:127-129` assembles `objective` + `method` + `traits.analysis_instructions` into the prompt for `skill_type_slug = 'intent'`, so a `method` edit genuinely reaches the model. And `ci-answer-intent`'s existing type-3 PLATFORM/SCOPE branch already carries the decline-and-route shape (state plainly it is outside what you can answer, note who would be the right person to ask) — the new block extends that proven instruction rather than introducing a parallel mechanism.

### Finding 1 — §5b's metric bar is stricter than it reads

The recorded case-23 answer (`durable_hops` `9237daa3-8519-40ab-ab42-6f0f08888e53`, 2026-07-29) carried an industry benchmark (40–60% typical co-op utilization) and Nordholm Retail Group's EMEA 55% — both real, both correctly sourced, both offered as *context* rather than as the Korea answer. `quantitative_content_present` asks whether a metric is **present**, not whether it was passed off as the answer, so they fail the criterion as written. The same applies to case 12, where the Data Room genuinely holds one Vietnam partner scenario (Horizon Store's zero day-one stockouts at launch).

**John's call: a gap answer carries no number at all.** A relevant partner case may still be referenced qualitatively; the figures come out. Rationale on the record: it is the strict reading of the locked criterion, it needs no baseline change, and "no number in a gap answer" is a bright line rather than a judgment call every evaluation has to re-make.

**Recorded tension, deliberately not resolved:** §5b's own regression example is narrower than its rule — it describes a regression as "an answer that suddenly reports a South Korea co-op utilization number," which is scoped to the *asked-for* metric, while the criterion itself is unscoped. Scoping the criterion to match that intent is a §8 baseline edit and was considered and declined this session. If a future session revisits it, the trade is: a narrower rule preserves legitimate adjacent context, at the cost of needing judgment on every evaluation.

### Finding 2 — Marcus never fabricated; the failure is phrasing, not groundedness

Verbatim from the same recorded hop, Marcus Webb — GEO CSO Expert opened *"South Korea co-op utilization data does not exist in the CSO Data Room,"* credited a named agent's catalog search to the user, and closed by advising the VP to confirm whether the partner's data "has been loaded into the Data Room yet" and otherwise to flag it "to whoever manages Data Room content updates."

Nothing in that is invented — the refusal half of the design works. He failed §5b's two remaining bars: the escalation routes a VP to the platform's content pipeline instead of to whoever owns partner co-op budgets, and he narrates internals by name.

This matters for scoping because it rules out a whole class of fix. Groundedness checking is **already guarded in production** by Owen — Proofreader's `qg-review-intent`: `hallucinated_internal_data` and `synthesized_as_fact` are two of its five block rules, and since `LOO-006` a `synthesized_as_fact` block must first trace the disputed claim to a real Data Room record and confirm the answer's `confidence_tier` matches what it finds. That mechanism could not have changed either case's outcome, because there was no false claim to catch.

### Risk carried into the build

The Skill half is an instruction-only fix, the same class that failed QA on `AGT-37` — where the generalization recorded was that an id-shaped decoy defeats instruction-level guards and no further wording attempt should be made. Judged legitimate here on a stated distinction: `AGT-37` failed because the model copied a decoy string sitting in its own input, whereas this governs prose style on a path the prompt genuinely controls, with no decoy present.

The mitigation is that the instruction is not trusted on its own — §5b's `quantitative_content_present` check is its verification, run by the driver every regression run. The kickoff's Section 6 also forbids the coding session from responding to a live FAIL by rewording the instruction: it reports the measured verdicts and stops, and the next move is the design session's call.

### Rows filed by this session

- **`AGT-41` (Architecture)** — Owen — Proofreader's `qg-content-context-intent` is test-scoped and never runs in production, so a badly-phrased answer only surfaces on the next regression run.
- **`AGT-42` (Architecture)** — whether any agent should ever name another agent to the end user. Scoped to gap answers only in this session's Skill edit; note that `qg-content-context-intent` explicitly rules conversational first-name mentions *not* a platform-language violation, so the judge and the proposed rule currently disagree.

### Correction recorded

The row previously referred to "Marcus — Channel Intelligence." `src/data/agents.js` gives his role as **GEO CSO Expert** (`id: marcus`, `code: CI-01`); Channel Intelligence is the Capability he holds, not his title.
