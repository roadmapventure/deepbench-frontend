# AGT-168 — harvest (slice 5, v7.0.619, cycle 3c489041)

Not required reading for the build. The kickoff carries every fact a task depends on.

## The premise, revalidated live (not recalled)

Measured this cycle on `origin/dev` `a6e44fc6` by importing `scanText()` and `trackedFiles()` from
`scripts/audit-private-scan.js` — the scanner's own functions, so the measured domain is the graded
domain. 1,804 tracked files. Tree-wide, by detector:

| detector | lines | files |
|---|---|---|
| `vercel_bypass` | 48 | 46 |
| `personal_path` | 7 | 6 |
| `secret_assignment` | 4 | 4 |
| `personal_email` | 2 | 2 |

That reproduces slice 4's closing statement exactly (it left "7 lines in 6 files"), which is the
cross-check that this measurement and slice 4's describe one tree. **Premise alive.**

The 7 `personal_path` lines, by file: `DeepBench-Session-Init.md:196`,
`docs/kickoffs/v7.0.550-AGT-86-s6-full-review-roots.md:39`,
`docs/kickoffs/v7.0.561-AGT-84-personal-agent-call-path.md:11`,
`docs/kickoffs/v7.0.583-AGT-121-nathan-call-path.md:10`,
`docs/kickoffs/v7.0.63-S-LAV-28c-receipt-display-and-content-qa.md:12`,
`docs/vision/evidence-sources.md:40` and `:48`. The 2 `personal_email` lines:
`docs/kickoffs/v7.0.550-AGT-86-s6-full-review-roots.md:39` and `public/Austin_2025Data_.csv:5529`.

Slice 5 takes the three files the manager named — 4 of those 9 hits. Afterwards `personal_path` is
4 lines in 3 files and `personal_email` 1 line in 1 file, and **exactly two non-governed
`personal_path` files remain** (`DeepBench-Session-Init.md`, the `v7.0.63-S-LAV-28c` kickoff), the
third being governed content.

## Why two transforms, and why that is a decision rather than an inconsistency

The manager's assignment said to repeat slice 4's tested `%USERPROFILE%` transform. Reading the
actual lines showed that instruction is right for two of the three files and wrong for the third,
and the reason is worth recording because it will recur on the remaining files.

`v7.0.561:11` and `v7.0.583:10` each *name a real location* — an out-of-repo loader `SKILL.md` on
John's machine. `%USERPROFILE%` is exactly right: the sentence keeps its meaning and the form
expands on the platform the record describes. Slice 4's precedent applies unchanged.

`v7.0.550:39` is not a reference. It is case C of a task specification, and it lists *planted
fixture values that `scanText` must flag*, alongside negative controls it must ignore
(`noreply@anthropic.com`, a `.gov` address, `your_key_here`). Substituting `%USERPROFILE%` there
would assert that the scanner flags `%USERPROFILE%` — which is false, and false precisely *because*
slice 4 chose that form for being inert. The redaction would have written a falsehood into the
record while passing every count-based gate.

So on that line the replacement is a bracketed description of the value class —
`<a home-directory path>` and `<a personal-mail domain>` — which is the convention line 39 already
uses for its own other planted values (`<32 mixed-case>`, `'<16+>'`). The assertion stays true, and
the form is inert twice over: no detector matches it, and `<…>` is already an `ALLOWLIST` row, so it
cannot become a hit even if a future detector widened.

**The `personal_email` call was mine to make and is made here, not routed to John**
(JOHN-0925-DESIGNER-DECIDES). It is reversible — one literal on one line. It also satisfies
pattern:111 directly: a personal address must not stand on a public surface, and this repo is public.

### Alternatives considered and rejected

- **`~` instead of `%USERPROFILE%`** — rejected for the same reason slice 4 rejected it: these are
  Windows paths, and `~` does not expand there. Consistency with the shipped slice also matters.
- **Delete the sentences.** Rejected: every one of these passages is a real record of a decision,
  and the leak is the personal component of a path, not the passage. Nothing needs deleting.
- **A test asserting these three files stay clean.** That is a fourth file, over the 3-file cap, and
  the change-scoped scan already covers the regression class platform-wide. Not filed as residue —
  the existing guard is the mechanism.
- **Take all 6 remaining `personal_path` files at once.** Over cap at 3 files; `extra_files` is 0 at
  rung 2. Splitting loses nothing here because each file is an independent one-line edit.

## Verification performed before the kickoff was written

1. Both transforms applied to scratch copies of all three files and re-scanned with `scanText()`:
   **4 hits → 0, every detector**, and exactly **one line changed per file** (no collateral edits).
2. `node scripts/baseline-red-set.js --tests=tests/regression/AGT-168-private-scan-change-scoped.js`
   on the unchanged tree → `green`, `Red set: 0 of 1`. There is no red-to-green target in this
   slice; the kickoff says so explicitly so the Builder does not invent one.
3. `node scripts/audit-private-scan.js --base=origin/dev` on the unchanged tree →
   `0 hits`, exit `0`. This is the pre-state of the gate the Builder must re-assert after editing.
4. The kickoff itself run through `scanText()` → **0 hits**, confirming the doc publishes no copy of
   what it redacts (it specifies both edits as regex→literal transforms, never as values).
5. `kickoffLaneFinding()` from `scripts/verifier.js` imported and run against the kickoff markdown →
   returned `null` (lane declared). The last two slices' kickoffs failed this check and were patched
   by hand; running the real function is now the standard.
6. Kickoff size: **8,186 bytes UTF-8**, under the 8,192 cap (pattern:168).

## Never-done, named rather than filed

Rotating the live Vercel bypass value (John's alone). The 48-line bypass literal purge and the 4
`secret_assignment` literals (a ~46-file edit needing John's own waiver of the 3-file cap).
`public/Austin_2025Data_.csv:5529` — a data file, its own call, not a prose redaction.
`docs/vision/evidence-sources.md:40` and `:48` — governed content, which goes to the governed
reviewer as evidence-only candidates (pattern:98), never redacted inline by this slice. The
pre-commit half of the ticket. **AGT-168 stays `partial` after slice 5.**
