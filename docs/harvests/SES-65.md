# SES-65 — the regression scorer can report a failure with an empty reason list

Type: Task Success Rate. Beta-gate (bucket 1). Found live 2026-07-30 by two pre-regression rounds
(`design-arch-beta-0729`), measured on real runs, not read from source. Designed 2026-07-29
(`S-SES-65-design`, v6.3.233).

---

## As filed — the two claims

Two independent behaviors in `scoreVerdict()` (`scripts/chi-true-regression.mjs:344`), rich-answer
branch only:

1. The criteria loop at `:360` covers `named_entities_present`, `quantitative_content_present`,
   `actionable_guidance_present` — **`asked_metric_present` is not in the list**, so it can never
   enter `failed_criteria`.
2. `:364` returns `pass: verdict?.pass === true` — Owen Marsh — The Proofreader's own holistic flag —
   rather than `failed_criteria.length === 0`, so `pass` and `failed_criteria` are independently
   sourced and can disagree.

The honest-gap branch (`:349`–`:357`) has neither property: it gates on `asked_metric_present`
(inverted, deliberately — an honest gap *should* lack the asked figure) and derives `pass` from
`failed_criteria`.

## Evidence

**The symptom in one direction was already found independently.** `DAT-16` (`S-AGT-44-design` QA,
3 runs) records case 9 `vitrine-tech` failing *"on his holistic verdict with zero scored criteria
failing"*; `design-arch-beta-0729`'s round 2 is a 4th confirmation, not a discovery.

**The other direction:** case 24 `news-first-card` passed all three artifacts (`case_pass: true`)
with `asked_metric_present: false` on each, and case 6 `upgrade-cycles`'s `forecast_draft` carried an
unlisted `asked_metric_present: false` in both rounds. 6 rich-answer artifacts across the two rounds
evaluated it false; none surfaced it. (The two honest-gap artifacts that also read `false` are
**correct** — that branch inverts the criterion deliberately — and are excluded from that count.)

---

## Design ruling, 2026-07-29 (`S-SES-65-design`, John approved)

### Claim 1 is not a defect — it is §5b's own locked table

`asked_metric_present` is absent from the rich-answer loop **deliberately**. Runbook §5b states it
outright — *"Rich-answer class (default): not scored"* — locked under `AGT-36b` (v6.3.225) with
John's §8 approval on 2026-07-29. The row's speculation that *"the omission may be inherited rather
than intended"* is wrong; it is written down as intended.

**And it cannot become a rich-answer gate as written.** The criterion's own Skill instruction
(`skill_profiles.qg-content-context-intent`, verified live) says *"If the question does not ask for a
quantity at all, this is false."* On the rich-answer path most questions ask for no quantity, so
`false` is the **correct** reading and carries no quality signal. Gating on it would fail correct
answers — the exact failure `AGT-36b` removed when it replaced `quantitative_content_present`. Case
24 `news-first-card` is the live example: it asks for analysis of a news story, not a figure.

The single boolean conflates *"the answer omitted the asked-for number"* with *"no number was
asked for."* Separating those is a prerequisite to any future gate, and is itself a §8 baseline
change. A genuine miss on a question that **does** ask for a figure — case 6 `upgrade-cycles` — is
tracked as content on `AGT-47`, not as a scorer defect.

Recorded in runbook §5b so it is not refiled a third time.

### Claim 2 is real, but it is a summary defect — not data loss

The row's framing (*"bucket 1's own output undiagnosable"*, and `BETA.md` row 24's *"a gate that can
fail without saying why … cannot establish nothing embarrassing"*) **overstates it.**

`judgeArtifact()` already returns the full verdict as `evidence` (`:380`), and Owen's Skill schema
carries a `critique` string (≤300 chars, verified live in Supabase) plus a quoted `evidence` field on
every criterion. `DAT-16` is the proof a reader can recover the reason from the existing output —
that row quotes Owen verbatim on case 9: *"never names Brazil, never states Apple's compliance
threshold, and never calculates or states what the actual gap is."*

What is genuinely broken is that the field which summarizes *why* comes back empty, so anything
reading `failed_criteria` — a human skimming a run, or tooling built on it — sees a failure with no
cause. Worth fixing; does not block ship on its own. **Beta status left unchanged at John's
direction (2026-07-29) — he was offered the drop and declined to change it.**

### The mirror direction is knowingly left open

`pass: true` alongside a failing **scored** criterion would be a false green. Never observed — the
"false green" recorded above is entirely `asked_metric_present`, i.e. the not-scored criterion, which
is correct behavior. Closing it means sourcing `pass` from `failed_criteria` instead of Owen's flag,
which is a scoring change under §8 and could flip currently-green cases red. Deliberately out of
scope; pinned by test and recorded in runbook §7.

---

## What v6.3.233 ships

Kickoff: `docs/kickoffs/v6.3.233-SES-65-scorer-names-its-cause.md`. 4 tasks, 3 files
(`scripts/chi-true-regression.mjs`, `tests/regression/AGT-36-honest-gap-scoring.js`,
`docs/runbooks/CHI-TRUE-REGRESSION.md`). **Scoring is byte-unchanged** — nothing that passes today
starts failing, nothing that fails today starts passing.

1. `scoreVerdict()` cannot return `pass: false` with an empty `failed_criteria` — the list carries
   `holistic_verdict` when Owen fails an artifact as a whole with no scored criterion failing.
   `holistic_verdict` is a driver-side reporting marker, never a sixth criterion, never in Owen's
   Skill schema.
2. Owen's `critique` rides the case record and the run's own FAIL line — using the inline-detail
   shape `infra_death:` and `journey_deviation (…)` already use in `fail_causes`, rather than a
   parallel reporting channel. `judge_fail` was the one bare token on that list.
3. A discriminating test: assertion 1 must fail on unmodified `origin/dev` before Task 1 is written.
4. Runbook §5b + §7 carry the ruling, the invariant, and the known gap.
