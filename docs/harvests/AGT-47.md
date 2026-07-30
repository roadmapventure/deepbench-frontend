# `AGT-47` — forecast draft loses the theory test's figures

**Root-caused 2026-07-30, session `design-agt-47`.** Static trace only — no live regression run.
Backlog row: `docs/FEATURES.md`. Beta-gate, bucket 1 (`docs/BETA.md` row 20).

## Use case

You commit a theory. The theory-test step says something concrete — *"Japan sits at approximately
26 months, Mexico sees roughly 33% of customers upgrading within 18 months, the US is at 3.84
years."* The next step drafts the data patch and the numbers are gone; Nadia Farouk — Data Expert
writes about "country" generically. To a reviewer it reads as an agent that cannot hold a thought
across two steps.

## The two candidates, and why (b) is dead

The row offered: **(a)** the draft-producing Skill is not instructed to carry the figures forward,
or **(b)** the content never reaches it — cross-step content re-supplied from React state
(`conversationContext()`), per `CHI-47`/`CHI-70`.

**(b) does not apply to this path.** The forecast-draft call site is
`src/screens/MarketIntelligenceScreen.jsx:4286`:

```js
capability_slug: "data-analysis", intent_slug: "data-patch-intent", agent_id: "nadia",
task_context: {
  disputed_chunk_id: disputedChunkId, correction: chosenText,
  user_reasoning: hypothesisTestText || chosenText,
},
```

Two things settle it:

1. **No `runtime_context` is passed at all.** Sibling call sites thread
   `runtime_context: conversationContext()`; this one does not. So the `conversationContext()`
   filter — which drops any message whose `.text` is not a string — is not in this path's way.
2. **The theory-test prose is threaded explicitly.** `hypothesisTestText` is built at
   `:4246`:

```js
const hypothesisTestText = hypothesisTest
  ? [hypothesisTest.supports?.text, hypothesisTest.complicates?.text, hypothesisTest.consider?.text].filter(Boolean).join(" ")
  : "";
```

That join is exactly the three sections carrying the figures. It arrives as
`task_context.user_reasoning`, and the comment at `:4270` confirms the contract: *"task_context is
prompt material — db-assembly.js serializes every non-empty key into the"* prompt.

**Conclusion: Nadia Farouk — Data Expert receives the figures.** The gap is that
`data-patch-intent`'s `method` never instructs her to carry specifics forward. Mechanism (a).

## Layer, and the fix's shape

**Skill data** — `skill_profiles`, `data-patch-intent.method`. Zero code. Same shape as `AGT-44`'s
fix, but **without** its blast radius: this Skill serves one agent and one Capability, so it cannot
reproduce the `ci-routing-intent` reach that left `AGT-44` open on a `journey_deviation` regression
of its own making.

## The row's own evidence was stale

The row claims three failing criteria: `named_entities_present`, `quantitative_content_present`,
`asked_metric_present`. After `AGT-44` shipped (v6.3.229) the measured residue is
**`quantitative_content_present` only** — see the after-table in `docs/harvests/AGT-44.md`, case 6
`forecast_draft` row. The other two now pass. Scoping off the row text would have aimed at a defect
two-thirds gone.

## Scoping constraint — where the figures must land

`AGT-35`'s judging contract (`docs/kickoffs/v6.3.192-AGT-35-owen-content-context-review.md`) states:
*"For forecast_draft, judge the proposed action text."* The regression driver implements exactly
that — `scripts/chi-true-regression.mjs:302`, `flattenForecastDraft()`, reads
`proposed_action.content` plus `critique` and nothing else.

**A fix that puts the figures in any other field will measure as failing.** The Skill instruction has
to target `proposed_action.content`.

*Correction worth recording: this session first read `flattenForecastDraft()` as a mirror-payload
defect in the driver (the `SES-57` class). It is not — it implements the documented contract, and
`sectionText()` (`:243`) already tolerates both a bare string and a `{text}` wrapper. The finding is
a scoping constraint, not a driver bug.*

## Not verified

- **No live run.** Diagnosis is static. A live `--only upgrade-cycles` belongs in the fix's QA.
- **The log cannot corroborate it.** `ai_activity_log` has no prompt or response columns — only
  tokens, latency, `call_facts`, `trace_id`/`span_id` (verified against
  `information_schema.columns`). What an agent received is not recoverable after the fact.

## Correction, 2026-07-30 (`design-arch-beta-0729` round 2, pulled in by this worktree's fast-forward)

This file's "row's own evidence was stale" section above claims the after-`AGT-44` residue is
`quantitative_content_present` only. A second, independent pre-regression round measured
`failed_criteria: [named_entities_present, quantitative_content_present]` on case 6's
`forecast_draft` — **both still fail**. `docs/FEATURES.md`'s row carries the live correction; the
kickoff doc scopes the fix (and its QA) against both criteria, not one. Also filed that round:
`SES-65` — the rich-answer scorer drops `asked_metric_present` from `failed_criteria` and sources
`pass` from Owen's holistic flag instead of the criteria list, so neither `asked_metric_present`
nor the aggregate `pass`/`case_pass` boolean is trustworthy evidence for this row until `SES-65`
is ruled on. The kickoff's QA reads `failed_criteria` directly for that reason.

## Correction, 2026-07-30 (kickoff session, before writing `docs/kickoffs/v6.3.232-AGT-47-*.md`)

**The field named above ("Fix is Skill data — `skill_profiles`, `data-patch-intent.method`") is
wrong.** Verified live: `data-patch-intent.method` (and `data-patch-execute-intent.method`) are both
`NULL`. The full instructional text this intent actually runs on lives in
`traits.analysis_instructions` — confirmed against `api/prompt/db-assembly.js`'s `intent` branch,
which concatenates `objective` + `method` + `traits.analysis_instructions`, in that order, when each
is present. The fix lands in `analysis_instructions`, inserted inline where that narrative already
talks about composing `content`, not in the empty `method` field. See the kickoff doc for the exact
inserted paragraph and the live proof. The mechanism finding above (Nadia receives the figures,
mechanism (a), not (b)) is unaffected by this correction — only the target field was wrong.
