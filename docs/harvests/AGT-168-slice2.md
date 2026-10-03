# AGT-168 slice 2 — reasoning harvest (v7.0.614)

## The premise, and what slice 1 actually did

Slice 1 (`e6676adc`, v7.0.613) was filed because the private-info scan sat *ahead* of the
session-docs tripwire, so a scan failure skipped the tripwire gate. It fixed that by swapping the
two steps: `git show e6676adc -- .github/workflows/ci.yml` is **7 insertions / 7 deletions**, a
pure reorder with no other content change.

That relocated the concealment rather than removing it. The `checks` job's steps and their `if:`
values, read off the shipped YAML this session:

| step | line | `if:` |
|---|---|---|
| Install | 222-223 | — |
| Session-docs tripwire (gate) | 229-230 | none |
| Private-info scan (change-scoped gate) | 236-243 | **none** |
| Regression suite (credentialed) | 254-255 | `always()` |

GitHub stops a job at its first failed step unless a later step carries an `if:`. So today a red
tripwire skips the scan entirely — the exact class of concealment `ci.yml:150-154` calls
load-bearing, only with the two steps' roles exchanged. The scan step has never carried
`if: always()` at any commit; it is not a line slice 1 deleted, it is a line neither slice wrote.

**Latent, not firing.** `node scripts/check-session-docs.js --gate` on this tree:
`GATE: clear -- no FLAG findings in the gating classes (checks 9/10/11). Exit 0.` The job's
standing red is the regression step, which already runs under `always()`. So this is a trap
waiting for the first drift finding, not a live outage — which is why it is a one-line P9 and not
an escalation.

## Alternatives considered

- **`if: '!cancelled()'` instead of `always()`.** Strictly more correct: `always()` also runs the
  step on a cancelled run, and `cancel-in-progress: true` is set on this workflow. Rejected on
  pattern:17 — the sibling step three lines below uses `always()`, the header documents that
  choice, and SES-180d's `no-continue-on-error` clause anchors on the literal string
  `"        if: always()"`. One idiom in one job beats a marginally tighter one that makes the two
  steps read as deliberately different. The cost is a `git fetch` on a cancelled run.
- **Give the scan its own CI job.** Ruled out by the Development Manager before this design, and
  it holds up: `checks` is blocking and already sits in `report-conclusion`'s `needs`, so a step
  there fails the commit exactly as a job would, while a fourth job breaks SES-255's computed-needs
  test. Recorded in the kickoff's CONTEXT as settled so a later reader does not re-derive it.
- **Assert the `if:` by re-parsing the YAML with a parser.** Rejected: the existing
  `ciRunsTheGate()` already does string-scoped extraction over the `checks` job, and pattern:17
  again — one more clause in the function that already owns this question, not a second mechanism.

## The SES-180d interaction, measured

`tests/regression/SES-180d-ci-credentialed-regression.js` clause `no-continue-on-error` (line 147)
breaks the file with `f.replace("        if: always()", "        continue-on-error: true\n        if: always()")`.
`String.prototype.replace` with a string argument replaces the **first** occurrence only. Adding
the scan step's `if:` at the same 8-space indent moves that first occurrence from the regression
step to the scan step.

Checked rather than assumed: the mutation still changes the text (so `everyClauseHasTeeth`'s
vacuity assertion passes) and the clause's `test`
(`!/continue-on-error/.test(f.replace(/^#.*$/gm, ""))`) still fails on the mutated text (so it is
still discriminating). No earlier 8-space `if: always()` exists in the file: the header mentions
are comment lines beginning `#`, and `report-conclusion`'s is at 4-space indent (`ci.yml:302`).

This is in the kickoff, not only here, because the Builder's edit is unsafe without it (SES-376).

## Governing architecture

`docs/ARCHITECTURE.md` has **no CI section** — grep for `ci.yml`, `CI workflow` and
`GitHub Actions` returns 0 hits. The governing section is **§19v, The Self-Building Platform —
Autonomous Development Governance**: CI is the only floor that grades a push from an unattended
cycle, since the six PreToolUse/PostToolUse hooks live outside the repo on one machine
(CLAUDE.md says so). A gate that a red sibling step can skip is not a floor.

That absence is worth a note of its own: the workflow's own 175-line header is currently the only
architecture record of the CI contract. Not filed as a ticket here — it is an observation, and
pattern:96 wants a real ID with real evidence, which a one-line design pass has not gathered.

## Baseline

`node scripts/baseline-red-set.js --tests=tests/regression/AGT-168-private-scan-change-scoped.js`
on the unchanged tree:

```
- tests/regression/AGT-168-private-scan-change-scoped.js — green
Red set: 0 of 1
```

Full suite carries 18 standing reds (280/298) predating the ticket.

## What slice 2 does not close

`AGT-168` stays `partial`. Three parts are named in the kickoff as never-done, deliberately not
refiled under new IDs (pattern:95 — a ticket's own acceptance criterion is not discharged by
renumbering it):

1. **Rotating the live Vercel bypass value.** A credential rotation on John's account. Not
   available unattended; pattern:91 says a close-out that ends in a credential chore written in
   jargon is unfinished work, so it is stated plainly instead.
2. **The ~46-file purge** of quoted local paths and the personal email. Exceeds the 3-file cap and
   splitting it loses the value — pattern:72: the cap is John's to waive, never Claude's.
3. **The ticket's pre-commit sentence.** Verified this session: no `.husky`, no `.githooks`, no
   `core.hooksPath` set, no `pre-commit` entry in `package.json`. There is no pre-commit surface in
   this repo to attach to, so the sentence cannot be satisfied as written — that is a fact for
   John's decision, not a task to invent a hook framework against.
