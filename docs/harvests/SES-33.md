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

---

# SES-33 — row detail harvested 2026-08-01 (SES-68)

Full `docs/FEATURES.md` row text as it stood immediately before this session's harvest-trim (verbatim):

| SES-33 | Tooling | **✅ RESOLVED 2026-07-29 08:45 CST (`design-log-71`, verified) — auto-deploy is firing again, per-commit, and the 14-commit backlog drained.** Confirmed live via the Vercel API: `5248667` (08:24), `0cb3b63` (08:42), `05f079b` (08:43) all READY with real git metadata, `579651a` BUILDING — one deployment per commit, which is the healthy pattern. **ROOT CAUSE ESTABLISHED — correcting this row's own first close-out, which wrongly said "no root cause."** It is the **Vercel free-tier cap of 100 deployments/day**, found by `ses29-fix-kickoffs` (`vercel deploy` returned `Resource is limited - try again in 24 hours (api-deployments-free-per-day)`). **Independently confirmed here by counting deployments per UTC day via the Vercel API: 2026-07-28 = 120 deployments, against 21/34/28/40 on the surrounding days.** The cap was exceeded by 20. Recovery ~24h after the burst (not at a calendar reset) fits a **rolling** 24h window, which is also why the outage looked like it "self-healed" and why sessions re-measuring it got contradictory answers. **Prevention, not a new ticket:** 5-7 concurrent sessions each pushing is what burns 120 deploys in a day — the constraint is push frequency, and a poke commit makes it worse, not better. Before any live QA run `node scripts/check-deploy-current.js` (`SES-015`); when the preview is stale, verify at the true seam (import the repo's own exported functions against the real upstream API) rather than waiting out the window — that is how `HAR-20` was verified 6/6 and how `LOG-71` was verified while stale. Outage window 2026-07-28 ~21:55 → 2026-07-29 ~08:24 CST. — Prior state below. **`Beta-gate` — cross-cutting, blocks buckets 1-5 (`BETA.md` §0 banner).** Not a product defect: it blocks the *verification* every bucket's ship bar depends on. Production (`main`) is unaffected and current. **GitHub→Vercel `dev` auto-deploy has stopped firing. Found live 2026-07-28 (`design-log-71`, during `LOG-71` QA).** The newest git-triggered `dev` deployment is `b309da8` (21:55 CST); `origin/dev` has since advanced through 9 commits (`5c69eb0`…`84e4db8`) with **no build**. Not new — `8fbfdd4`'s own commit message ("no build fired for 5c69eb0/94acad9/c74715a") shows another session already hit it and worked around it with a manual poke, which produced the 22:10 deployment carrying **no git metadata at all**. Consequence: every concurrent session's live-QA step is testing a stale build, and a manual poke deploy cannot be traced to a commit. Needs the integration re-checked at the Vercel/GitHub end, not another poke. **Corroborated independently 2026-07-28 (`design-log-81` QA, which had claimed `SES-35` for the same symptom before finding this row — that ID is retired unused, not renamed).** Two things that narrow it: **(a) it is not a build failure** — `vercel deploy` from a worktree at the dev tip built cleanly in 35 s and produced asset `index-B723nKf9.js` **containing** v6.3.203's `isCountableCall`, while the dev URL still served `index-CQJJJvbU.js` (carries `CHI-88`'s v6.3.200 markers, not `LOG-81`'s) — so the source builds fine and only the trigger is broken; **(b) the empty poke commit produced no deployment at all**, ruling out a slow queue. `LOG-81`'s live QA was therefore run against that CLI preview, documented as such in its archive row. **⚠️ RECOVERED 2026-07-28 (`S-LOG-91-design`): deploys firing, dev bundle serves current code — this row's "undeployed" premise is false today. Root cause unproven; re-measure before closing. Evidence + caveats: `docs/harvests/SES-33.md`.** **ROOT CAUSE MEASURED 2026-07-29 (`ses29-fix-kickoffs`): Vercel's free-tier cap of 100 deployments/day is exhausted.** `vercel deploy` returns `Resource is limited - try again in 24 hours (api-deployments-free-per-day)`, and the Vercel API (`v6/deployments`, `meta.githubCommitSha`) shows builds firing for every `dev` commit through `b309da8` and none after — the integration is not broken, the quota is spent, which is why a poke-commit cures nothing and why it appears to "recover" once the window rolls. Consequence to state plainly on the gate: **the dev preview serves stale code, so any live QA run against it silently tests an old build** (the `LOG-105` failure mode, platform-wide across 5–7 concurrent sessions). Complements `SES-015`'s deploy-current gate, which detects the symptom; this is the cause. Remaining decision for John: plan tier vs. deploy-rate discipline. Duplicate row `SES-34` folded in here — **merge proposed, John to confirm**. | ❌ Missing | S-future (re-measure first) |
