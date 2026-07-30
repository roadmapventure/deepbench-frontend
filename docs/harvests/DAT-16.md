# DAT-16 — Case 9 (`vitrine-tech`) joins the `honest-gap` class

**🚨 Beta-gate (bucket 1).** Case 9 `vitrine-tech` asks for a compliance *gap* against a threshold that is not in the corpus, and was scored by a rubric that requires the gap be stated — so it could not pass however good the prose was. Found 2026-07-29 (`S-AGT-44-design` QA, 3 runs).

The question is *"the training compliance gap at Vitrine Tech in Brazil and the risk to certification."* Computing a gap needs Apple's required completion threshold; verified live that no `active` `the_library` row carries one — the only matches are a European merchandising scenario and two agent-authored `consolidated` rows (`is_baseline: false`) restating Vitrine's own 40%. Owen Marsh — The Proofreader was therefore right every time: *"never names Brazil, never states Apple's compliance threshold, and never calculates or states what the actual gap is."* Failed 3/3 runs on his holistic verdict with **zero scored criteria failing**, while `platform_language_detected` was false throughout — so this was not `AGT-44` and not fixable by prose. Structurally identical to what `D7`/§5b exists for, on a case never tagged: `HONEST_GAP_IDS` held only `vietnam-reseller` and `south-korea-coop`.

Three candidate resolutions were on the table: **(a)** seed Apple's threshold as a real sourced/simulated Library fact — best for a demo, makes the question answerable; **(b)** tag `vitrine-tech` into `HONEST_GAP_IDS` — a runbook §8 baseline change requiring John's approval, and it concedes the case rather than answering it; **(c)** reword the question.

## Part 1 — membership widened (`S-DAT-16`, v6.3.234, `58e2cb4`)

**Decided 2026-07-30 (`design-dat-16`, John's approval): resolution (b).** `HONEST_GAP_IDS` widened to include `vitrine-tech`; `tests/regression/AGT-36-honest-gap-scoring.js` and the runbook's §2/§5b/§0 D7 text updated to match. Coding session shipped 24/24 on the persisted suite, build clean. Kickoff `docs/kickoffs/v6.3.234-DAT-16-vitrine-tech-honest-gap.md`.

**Found on the design session's own live QA, before close-out:** Part 1 alone was insufficient. A live `--only vitrine-tech` run showed the direct-answer artifact passing cleanly, but case 9 also produces a `forecast_draft` artifact — because the answer gets flagged for review, and the runbook's locked `D2` rule always forces the review fork (Priya's Theory → Nadia's forecast). Both artifacts inherit the case's `honest-gap` class. Nadia Farouk — Data Expert's `forecast_draft` failed `asked_metric_present`: she presented Vitrine's real 40% completion figure as if it resolved the compliance gap, when the actual gap needs Apple's threshold (still absent from the corpus). Trace `af20ec89-35ed-4ae7-b5e1-645460aeb43e`.

## Part 2 — Nadia's forecast-draft Skill (`S-DAT-16b`, v6.3.236)

**Root cause, verified live in Supabase:** `data-patch-intent.method` was `NULL` — not one missing instruction, the field had never been set. `api/prompt/db-assembly.js` only pushes `sp.method` into her prompt when truthy, so every forecast draft she has ever written ran on `objective` alone (a one-line decision-framing sentence) plus `platform-language-guardrail` (attached by `AGT-44`).

**John's call, narrowly scoped:** give her the same discipline `AGT-36b` gave Marcus — real numbers are fine as context, never presented as the resolved answer to a specific value the record doesn't establish. Deliberately **not** worded as "declare a fact unavailable whenever unsure" — that shape risks giving her an easy-sounding out that could mask `AGT-47` (case 6's `forecast_draft` *dropping* real upstream figures) instead of fixing it. Because the field was previously empty, this change reaches every forecast draft on the platform, not just case 9's — Section 11 of the `DAT-16b` kickoff requires re-checking cases 6, 10, 20, and 22 live, not just case 9, precisely because there is no prior baseline to diff against.

**`AGT-47` is explicitly not fixed by this session** — different mechanism (content dropped entirely vs. an adjacent number substituted for the asked-for one) — and stays open regardless of this fix's outcome. Kickoff `docs/kickoffs/v6.3.236-DAT-16b-nadia-forecast-draft-no-standin-value.md`.

**Status:** Part 2 QA pending — results to be recorded here once the live re-runs (case 9 closure gate, plus the required 6/10/20/22 checks) complete.
