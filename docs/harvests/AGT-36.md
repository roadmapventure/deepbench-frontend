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

## `AGT-36b` — the amendment (v6.3.225, `715301a`) and the close-out QA

`S-AGT-36`'s live run failed both cases on `quantitative_content_present`, with the two originally-broken bars measured **fixed** (case 23: `platform_language_detected` false, `actionable_guidance_present` true, routing to *"your regional channel manager or the partner operations team covering that geography"*). Root cause was the criterion, not the implementation — it asks whether a number is present, not whether the agent reported a figure for the quantity it just said it could not answer. Case 23 was failing on a real industry benchmark (40–60%) and a comparable partner's rate (Nordholm, EMEA 55%).

John approved the §8 baseline change. `asked_metric_present` replaced it as the binding bar; `quantitative_content_present` became informational; Marcus's rule 4 narrowed from "carry no number" to "do not supply the missing value."

### A defect in the amendment, found and fixed during QA

The `AGT-36b` kickoff specced the new criterion into Owen's `method` **and said nothing about `traits.schema`**. That is a spec error, not a build error — the coding session followed it exactly. Owen's output schema still listed five keys, so the model structurally could not emit `asked_metric_present`; both QA calls returned it `undefined`, the vacuous-pass guard failed it, and every honest-gap case would have failed forever while every text-level check passed. Fixed in-session by adding the key to `traits.schema.properties` (cloned from `quantitative_content_present`'s shape) and to `required`.

**Process gap this closes:** a Skill's instruction text and its output schema are one change. Adding a criterion to `method` without adding it to `traits.schema` produces an instruction the model cannot obey, and every string-level verification still passes — the failure is invisible to exactly the checks a session is most likely to run. Now a standing check in `docs/STANDARDS.md` Section 5.

### Close-out QA — measured, design session, 2026-07-29

Run directly against the deployed API (`check-deploy-current`: LIVE, serving `715301a`), bypassing `qg-review-intent` because `AGT-43`'s false-positive block was intercepting the answer before it could be judged.

| Bar (§5b binding) | Case 12 `vietnam-reseller` | Case 23 `south-korea-coop` |
|---|---|---|
| `asked_metric_present` must be false | **false** ✅ | **false** ✅ |
| `actionable_guidance_present` required | **true** ✅ | **true** ✅ |
| `platform_language_detected` must be false | **false** ✅ | **true** ❌ |
| **§5b result** | **PASS** | **FAIL** (one bar) |

Case 12 is the proof the whole class works: Owen's own overall verdict was `pass: false` — the rich-answer rubric rejecting a correct refusal, exactly as `D7` predicted — while the `honest-gap` class passed it. Owen also returned `asked_metric_present: false` with real reasoning of his own (*"a qualitative health assessment, not a specific metric"*), having never been told the class exists.

Case 23's single remaining failure is Marcus opening *"I don't have data… in the retrieved context. The Data Room contains industry benchmarks…"* — rule 1 not holding. Filed as `AGT-45`, with the likely interaction noted: narrowing rule 4 to permit context citation gave him a new sentence in which to name the source.

### Residue filed — and one piece of it that was NOT residue

Filed at close-out: `AGT-41`, `AGT-42`, `AGT-43` (beta gate), `AGT-44` (beta gate), `AGT-45` (beta gate), `LOO-27` (beta gate), `SES-56`.

**Corrected the same day, John's call.** `AGT-45` — Marcus still naming "the Data Room" / "the retrieved context" — is `AGT-36`'s own acceptance criterion, verbatim from its row: *"a business-grade gap answer with escalation guidance instead of naming the CSO Data Room."* The escalation-guidance half landed; that half did not. Filing it separately let `AGT-36` close with its stated work unfinished. `AGT-36` reopened, `AGT-45` retired into it as a stub (kept, not deleted, so same-day cross-references resolve).

The other three beta gates are genuinely independent and pre-date this session's changes: `AGT-43` and `LOO-27` are Owen's production guardrail and the harness continue budget; `AGT-44` is Priya's artifact failing Owen's *ordinary* rubric under any scoring scheme. They were invisible before because the broken scorer failed cases 12 and 23 for the wrong reason, masking the right ones. **Net for beta: 3 new gates, not 4.**

**Rule this produced:** a residue ticket that restates the parent's own acceptance criterion is not residue. Before spinning one off, check whether closing the parent would leave a sentence in its own row unsatisfied — if so, it belongs to the parent.

### Reclosed the same day — and why that is not the same call as `AGT-45`

John's question — *"are we able to consider agt-36 closed and agt-41 a new ticket?"* — passes the test `AGT-45` failed, on one specific point: **`AGT-36`'s row scoped its own mechanism.** Its words: *"…instead of naming the 'CSO Data Room' — **Skill data**."* That Skill-data change exists, is deployed, and measurably works part of the time. The residue is not an unfinished Skill edit; it is a mechanism this row explicitly did not cover.

The reasoning that established that, which is worth not re-deriving:

- Rule 1 lives in `skill_profiles.method` as prose assembled into Marcus's prompt, so compliance is **model-governed** — it held on case 23 in the v6.3.220 run and holds on case 12 today. No further wording pass is permitted (`AGT-37`'s generalization).
- **A banned-phrase list was proposed by this session and rejected on John's challenge.** He asked whether `HAR-21`/`AGT-37` had hardcoded acceptable/unacceptable content. They had not: `lib/claim-resolver.js` validates by **structure** (a UUID regex) with a facts-beat-claims precedence rule — its own header reads *"Claims are format-filtered, never format-trusted"* — and `AGT-37` removed `source_chunk_ids` from Elena Cho — The Reasoner's output contract entirely because the calling code already knew the correct value. **Both work because a known-correct value existed to substitute. Generative answer text has none**, so the pattern does not transfer, and a phrase blocklist would be the content hardcode neither precedent used — visible in the repo to exactly the audience `BETA.md` is written for.
- What remains is the answer John proposed earlier in the same session: **an Agent guardrails the Agent.** `qg-content-context-intent` already detects this exact failure via `platform_language_detected`; it simply never runs outside the regression harness. That is `AGT-41`.

`AGT-41` inherited the closure gate — case 23 passing `platform_language_detected` in a real run — and was reclassified **🚨 beta-gate (bucket 1)** at the same time, since it moved onto the critical path. Net beta count is unchanged at four: `AGT-41`, `AGT-43`, `AGT-44`, `LOO-27`.

### Correction recorded

The row previously referred to "Marcus — Channel Intelligence." `src/data/agents.js` gives his role as **GEO CSO Expert** (`id: marcus`, `code: CI-01`); Channel Intelligence is the Capability he holds, not his title.
