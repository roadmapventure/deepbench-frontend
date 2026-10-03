<!-- DeepBench | harvest | AGT-168 slice 4 — the reasoning behind v7.0.617's kickoff. Not required reading for the build. -->

# AGT-168 slice 4 — redacting a home-directory path from three harvest files

**This file is a tracked file in a public repo, so it never quotes the string being redacted either.**
Everything below is stated as a count, a location, or a regex.

## 1. Premise revalidation — ALIVE

Run this cycle against the working tree at `2455571a`, through the same `scanText()` the Auditor uses
(`scripts/audit-private-scan.js`, the `personal_path` row of `DETECTORS`):

| file | `personal_path` hits | hits of any other detector |
|---|---|---|
| `docs/harvests/AGT-121.md` (line 18) | 1 | 0 |
| `docs/harvests/AGT-84.md` (line 33) | 1 | 0 |
| `docs/harvests/SES-90.md` (line 102) | 1 | 0 |

Tree-wide, over `trackedFiles()` with the binary probe, the detector stands on **10 lines in 9 files**:
`DeepBench-Session-Init.md`, the three harvests above, four kickoffs (`v7.0.63-S-LAV-28c`,
`v7.0.550-AGT-86`, `v7.0.561-AGT-84`, `v7.0.583-AGT-121`) and `docs/vision/evidence-sources.md`
(2 lines). Slice 4 clears 3, leaving 7 lines in 6 files — which is exactly the "remaining 6
`personal_path` files" the cycle named never-done.

So the gap is live, in tracked content, in a repo whose visibility is the whole reason the check
exists. Nothing about it has been fixed by a prior slice: slice 1 (`v7.0.613`) made the scan
change-scoped and said out loud that it "removes none of the 48" standing lines.

## 2. Why this is the slice an unattended cycle may take

The ticket's three sentences are not one job. Sentence 1 (a live Vercel bypass value on 48 lines) is
gated on John rotating the credential and on a waiver of the 3-file cap for a ~46-file purge —
neither is available to an unattended cycle. Sentence 2's hardcoded keys sit behind the same
rotation. Sentence 3 is the only one that is **no credential at all**: redacting a path publishes
nothing that has to be rotated afterwards, so the work is complete the moment the lines change.
And 3 files is exactly the live cap (`class_autonomy('P9 - Bug Fixes')` → rung 2, `extra_files` 0),
so it needs no waiver. That is the whole reason slice 4 exists as its own kickoff rather than as
residue on slice 3's.

## 3. The form of the redaction — the call, and the alternatives

Recorded under JOHN-0925-DESIGNER-DECIDES: a documentation-form question is mine, not John's.

- **`%USERPROFILE%` — taken.** It is one of the two forms the board's own remediation text already
  names (`AGT-130`: *"replace user-home paths with `~` or `%USERPROFILE%`"*), it expands on the
  platform all three records describe, and it survives the backslash line in `SES-90.md:102` without
  making that passage read as a POSIX path it never was.
- `~` — rejected, not wrong. It is the other board-named form, but it reads as POSIX and two of the
  three passages are explicitly Windows paths; `~\.claude\projects\` is a form nothing produces.
- `<REDACTED:home>` — rejected. The repo does carry a `<REDACTED:kind>` convention, and
  `audit-private-scan.js` even allowlists it (`NOT_PLACEHOLDER`), but that marker means *the
  claude-config copy job redacted a secret here* (`docs/harvests/AGT-86.md`: "a redaction marker is
  the copy job working, never a finding"). Borrowing it for a hand-edited doc path would make the
  marker mean two things.
- Deleting the sentences — rejected outright. These are records; the cycle's own constraint is that
  each passage keeps its meaning and its value as a record.

All four candidates were run through `scanText()` before choosing: `%USERPROFILE%`, `~` and
`<REDACTED:home>` are all clean under the `personal_path` row, so cleanliness did not decide it —
faithfulness to the record did.

## 4. Why the transform is a regex and not three hand-edits

The pattern handed to the Builder is the `personal_path` row itself. That is the load-bearing choice:
if the transform's domain is the detector's domain, then "the detector finds nothing afterwards" is
a property of the transform rather than a claim about three careful edits. Measured on the tree: the
pattern matches **exactly once in each of the three files**, so the transform cannot touch a line
nobody inspected. Applied to scratch copies, the three files then scan to **0 hits of every
detector**, and the three changed lines differ from the originals in nothing but the home prefix.

No test file is added. A regression test asserting these three paths stay clean would be a genuinely
useful thing to own — and it is a **fourth file**, over a cap of 3 with `extra_files` 0. It is named
in the STOP LINE's never-done list rather than smuggled in.

## 5. Baseline, and the honest shape of the QA

`node scripts/baseline-red-set.js --tests=tests/regression/AGT-168-private-scan-change-scoped.js`
on the unchanged tree returns `Red set: 0 of 1` — the guard is green before the change. This slice
therefore has **no red-to-green proof available**, and saying otherwise would be inventing one. The
discriminator is the scanner's count on the three paths (3 → 0) plus the tree-wide pair
(10 lines/9 files → 7/6), both of which are unchanged if the edit does nothing.

The second QA half exists because of a failure mode specific to this ticket: the change-scoped gate
reads **added** lines, and every line this change touches is an added line. `--base=origin/dev`
exiting 0 is the proof that the redaction did not publish the path a fourth time — in the diff, in
the kickoff, or in this harvest.

## 6. Patterns leaned on

`pattern:1` (eliminate rather than bound — the passage keeps its meaning, the personal component is
gone, not masked at display time), `pattern:66`/`pattern:65` (the minimum immediately-useful slice;
the general purge stays its own work), `pattern:72` (the 3-file cap is John's to waive, so a fourth
file is not taken), `pattern:85` (a small reversible call is decided and flagged, never escalated),
`pattern:95` (slice 4 is explicitly not a close of AGT-168, and the residue is named rather than
refiled), `pattern:162` (the gate grades the change, never the live world), `pattern:164` (the
environment facts: a peer cycle is pushing to `dev`, and CI's depth-1 clone is why the `--base`
failure mode is loud), `pattern:168` (the kickoff is a card at 7,899 bytes, not a runbook).
