# AGT-168 slice 6 — harvest (v7.0.621, cycle b873597f, 2026-09-27)

Reasoning, measurements and rejected alternatives for `docs/kickoffs/v7.0.621-AGT-168-last-two-personal-path-lines.md`. Not required reading; every fact a task depends on is in the kickoff.

**No value is quoted anywhere in this file.** It is tracked in the same public repo the scanner grades, and `--base=<rev>` reads added lines.

## 1. Premise revalidation — ALIVE

Measured this cycle on the unchanged tree at `dcf2136b`, with the shipped module, not from memory:

- `trackedFiles('/home/user/deepbench-frontend')` → **1,807** files.
- `scanText(rel, text)` over all of them → `personal_path` **4 lines in 3 files**, `vercel_bypass` **48 lines in 46 files**, `secret_assignment` **4 lines in 4 files**, `personal_email` **1 line in 1 file** (`public/Austin_2025Data_.csv:5529`).
- The four `personal_path` locations: `DeepBench-Session-Init.md:196`; `docs/kickoffs/v7.0.63-S-LAV-28c-receipt-display-and-content-qa.md:12`; `docs/vision/evidence-sources.md:40`; `docs/vision/evidence-sources.md:48`.

This reproduces slice 5's closing prediction exactly (`v7.0.619` STOP LINE named these same two non-governed files), and it confirms the manager's assignment without relying on it. The gap is live: the repo is public and both lines publish an account name.

`class_autonomy('P9 - Bug Fixes')` read live → `bug_fix`, rung 2, streak 0, `extra_files` 0, `extra_tasks` 0, `auto_done` false → 3 files / 4 tasks. `runner_model_lanes` read live → `orchestrator` = `claude-opus-5`.

## 2. The design call — ONE transform, not slice 5's two

Slice 5 shipped two replacement forms and was right to. Its third file, `v7.0.550…:39`, is a **task spec that asserts the scanner flags every value it lists**; `%USERPROFILE%` is *not* a hit, so writing it there would have made the line assert something false. That file got a bracketed value-class token instead.

I read both of my lines rather than assuming which form applies:

- **`DeepBench-Session-Init.md:196`** — a Claude Desktop setup instruction. It states where the config file lives, alongside a `C:\Projects\…` path that is not a hit. It **names a real location**.
- **`v7.0.63-S-LAV-28c…:12`** — prose in the CONTEXT section, naming where two captured `.jsonl` frame-evidence files sat when 28b's diagnosis was made. Also **names a real location**; nothing on it asserts scanner behaviour.

So both take the `%USERPROFILE%` form: the sentence keeps its meaning and still resolves for a reader on Windows. The bracketed form would be a loss here — it would turn two precise location statements into vague ones for no gain, since neither line has a truth claim about detection to protect. Recorded, reversible, mine (JOHN-0925-DESIGNER-DECIDES); flagged in the STOP LINE.

## 3. Transform verified before the kickoff was written

The `personal_path` row of `DETECTORS` applied to scratch copies of both files, then re-scanned with `scanText`:

| file | hits before | raw matches | lines changed | hits after |
|---|---|---|---|---|
| `DeepBench-Session-Init.md` | 1 (`personal_path:196`) | 1, on line 196 | 1 | **0, every detector** |
| `docs/kickoffs/v7.0.63-S-LAV-28c-…md` | 1 (`personal_path:12`) | 1, on line 12 | 1 | **0, every detector** |

One match per file means no collateral edit is possible. The match ends at the account segment, so the remainder of each path survives byte-for-byte — on line 12 that remainder is forward-slashed, producing a mixed-separator result which is correct and must not be tidied.

The kickoff instructs importing that regex from `DETECTORS` rather than retyping it (pattern:3): the edited domain is then the detected domain by construction, which is what makes the after-scan a proof instead of a coincidence.

## 4. Baseline and the gate ordering

`node scripts/baseline-red-set.js --tests=tests/regression/AGT-168-private-scan-change-scoped.js` → **green, 0 of 1**. There is no red-to-green target this slice; the guard is prophylactic (it stops the next added line, it removes none of the standing ones) and must still be green at the end.

`node scripts/audit-private-scan.js --base=origin/dev` on the unchanged tree → `0 hits`, exit 0 — and that is exactly the structural false green to avoid. `origin/dev` is `dcf2136b`, which **is** HEAD right now, so `addedLines()` diffs an empty range. Run before the commit it would pass no matter what the edits said. The kickoff therefore pins the order: gate the counts, commit, **then** `--base=dcf2136b`, then fetch/rebase and re-run `--base=origin/dev` before pushing. A peer cycle is pushing to `dev` this cycle, which is why the base is pinned to a revision for the proof rather than left as a moving ref.

## 5. Alternatives rejected

- **Also redact `docs/vision/evidence-sources.md:40`/`:48`** — 3 files, still inside the cap. Rejected: governed content, pattern:98. It routes to the governed reviewer as an evidence-only candidate, and has been held back twice already for this reason. Redacting it inline would be the exact move the rule forbids.
- **Add a regression test pinning `personal_path` at 0 for non-governed files** — rejected: a 3rd file, and it would encode a live-world count, which pattern:162 rules out. `AGT-168-private-scan-change-scoped.js` already grades the change.
- **Sweep the 48 `vercel_bypass` lines in the same session** — rejected: ~46 files, needs John's own cap waiver (pattern:72).
- **Combine the two edits into one task** — rejected: they are in different files with different surrounding content to preserve, and the 4-task cap leaves room for the per-file re-read.

## 6. What this slice leaves

Zero non-governed `personal_path` lines remain after it. AGT-168 stays `partial`, and everything still open on it is John's or governed: the live Vercel bypass rotation, the 48-line literal purge, the 4 `secret_assignment` literals, `public/Austin_2025Data_.csv` (the Analyzer screen fetches it at four call sites), `docs/vision/evidence-sources.md:40`/`:48`, and the pre-commit half. Named as never-done in the STOP LINE rather than refiled under new IDs (pattern:95, pattern:132).
