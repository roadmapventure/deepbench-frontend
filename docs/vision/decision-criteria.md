<!-- DeepBench v7.0.134 | docs/vision/decision-criteria.md | SES-84 phase 1 — Claude's best-inference draft, 2026-08-21. NOTHING here is ratified until John's tap; confidence marks are the drip queue. -->

# Decision Criteria — pointer only

This file deliberately contains ZERO criteria. Duplicating even one here would create a second
copy that drifts from the canonical file and evades its verification gate.

- [C-criteria-1] (HIGH) `docs/JOHN-DECISION-PATTERNS.md` is the single canonical criteria file — 136 criteria in John's own words: seed 1–5 (`design-log-38-0724`), 6–100 mined by `SES-79` (v7.0.110) from SESSIONS.md + FEATURES-ARCHIVE.md, 101–136 mined by `SES-90` (v7.0.126) from the full local session archive — still true? — *grounds:* the file's own dated headers, read 2026-08-21.
- [C-criteria-2] (HIGH) Its verification gate is `node scripts/check-decision-pattern-quotes.js` — every in-repo `Seen in:` citation is grepped back against SESSIONS.md / FEATURES-ARCHIVE.md / harvests; run it after ANY edit to the file; local-archive citations are skipped by design (quote+date is the durable part) — still true? — *grounds:* the file's footer names it the ship gate; script present in `scripts/`.
- [C-criteria-3] (HIGH) `ARCHITECTURE.md` §19v makes that file (plus this vision corpus) the criteria source for every autonomous choice, and anything it does not cover fails closed to the gated lane — still true? — *grounds:* §19v classification-authority block + the file's own header, verbatim.
- [C-criteria-4] (HIGH) Every strategy Reverse/Rework from the briefing routes back into the criteria: the cycle acting on the tap distills John's one-line reason into a new (or amended) criterion in `docs/JOHN-DECISION-PATTERNS.md` — with a real, checkable `Seen in:` (the `runner_items` row / briefing card) — and runs the checker, same session — still true? — *grounds:* §19v: "every Reverse/Rework on a strategy call feeds back into them (`SES-79`)"; entry-format rule in the file's footer.
- [C-criteria-5] (HIGH) Admission bar, unchanged: only a criterion that would change a FUTURE decision, grounded in a real recorded instance — "If you cannot find the text, the criterion does not go in" — still true? — *grounds:* the file's footer, verbatim.

## Open questions for John

1. C-criteria-4: should a briefing-card `Seen in:` cite the `runner_items` row id, or should the checker grow a third verified source class for briefing decisions?
