# SES-33 — harvested detail

## Re-measurement 2026-07-28 22:42-22:55 CST (`S-LOG-91-design`)

The row's premise ("the GitHub→Vercel `dev` integration has fired no build since `b309da8`, so recent
commits are undeployed") was **false at this measurement**. Evidence, in the order it was taken:

1. `vercel ls deepbench-frontend` — 14 `● Ready` Preview deployments, newest **56 s old**, durations
   24-35 s. Deploys are firing.
2. **The decisive check, not deploy status** (per the standing rule to grep the served bundle rather
   than trust a deployment list): fetched the dev alias, extracted its single asset
   `/assets/index-C0E_8UVv.js`, and grepped it for `LOG-91`'s frontend constant
   `2026-07-16T00:00:00Z` — **present**. So the dev URL serves post-`LOG-81`, post-`LOG-91` code.
3. The `api/` half confirmed independently of any deploy metadata, from the log data itself: paired
   double-writes stop mid-traffic at the cutover — last pair `03:42:51Z`, first merged single-row
   write `03:43:31Z`. The two pairs written between deployment-created (`03:42:17Z`) and that point
   both carry `dispatch_latency_ms` NULL (old-code signature), i.e. old lambdas still serving during
   the alias switch — expected cutover behaviour, not a defect.

**What this does NOT establish.** Whether the trigger self-healed, or a config change fixed it, or it
is intermittent — the root cause this row exists for is unproven either way. Do not close `SES-33` on
this evidence; re-measure first. Sequence with `SES-015` (v6.3.209, deploy-current gate), which is
live on the same topic, and note worktree `design-ses-33` was active at the time of writing.

## Reconciliation 2026-07-28 23:00-23:07 CST (`S-SES-015-design`) — both prior readings were right

This row said "no build since `b309da8`." `S-LOG-91-design` re-measured and called that premise
false. **Neither was wrong** — which is why hand spot-checks keep contradicting each other, and why
the answer has to come from an instrument rather than another manual look. (This section first
called the behaviour "intermittent." The root cause found the same night — an exhausted daily
deploy quota — is sharper and is recorded at the end of this file; read that first.)

Measured across all 156 commits on `origin/dev` since 2026-07-28 12:00 CST, scored by lag to the
first build *containing* each commit (not to a build *of* it — a later commit's build carries the
earlier one, and missing that distinction inflates the apparent failure rate from 20% to 38%):

| Metric | Value |
|---|---|
| Median | 37 s |
| p90 | 852 s (14 min) |
| Max | 2,973 s (49.5 min) |
| > 5 min | 44 / 156 (28%) |
| > 10 min | 31 / 156 (20%) |

A median of 37 s with a 46-minute tail produces exactly the observed pattern: most checks find it
healthy, and a minority find it apparently dead. Confirmed again during `SES-015`'s own QA — its
coding session's push (`ba3232a`) and the then-current `dev` tip were both undeployed at 23:00 CST,
with zero builds queued, while the alias served `fefbe79`.

**`SES-015` shipped the instrument** (`scripts/check-deploy-current.js`, v6.3.209): it answers
"is what I am about to test actually deployed?" on demand and exits non-zero when it is not. That
does **not** close this row — the gate detects the condition rather than fixing it.

**Corrected 2026-07-29, same night:** the paragraph above originally said the root cause was still
unproven. It is not — `ses29-fix-kickoffs` measured it concurrently with this pass: **Vercel's
free-tier cap of 100 deployments/day is exhausted** (`vercel deploy` → `Resource is limited - try
again in 24 hours (api-deployments-free-per-day)`).

That cause and this measurement corroborate each other, and it is a better explanation than the
"intermittent" framing above. A spent daily quota is not random: builds fire normally until the
cap is hit and then stop until the window rolls. That is exactly the distribution measured here —
a 37 s median (the early, under-quota commits) with a 46-minute tail concentrated in the evening
(the post-exhaustion ones), and it explains why a poke commit sometimes appears to work and
sometimes cures nothing. **Read the 20%-over-10-min figure as "the share of the day's commits
pushed after the quota ran out," not as a random failure rate** — the shape will move with how
many deploys the day's concurrent sessions have already spent, so re-measure rather than treating
20% as a constant.
