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
