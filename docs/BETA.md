# DeepBench Beta — Definition, Buckets, Execution Queue

> **Why this file exists (2026-07-28):** John's beta definition and bucket prioritization were
> stated live in the 2026-07-23/24 "beta prioritization" session, but that session never
> committed its output — the content lived only in the conversation transcript until it was
> recovered and committed here (`beta-doc-0728`). This file is the durable answer to two
> questions: **what does beta mean**, and **what should be executed next to get there**.
>
> **Maintenance rules:**
> 1. Any session filing a new backlog row while this file exists must declare, in the row it
>    files, either `Beta-gate (<bucket>)` or `Post-beta` — so the queue below stays current
>    without a periodic re-triage.
> 2. Any session that ships an item listed below updates its status here in the same close-out
>    commit that updates `FEATURES*.md`.
> 3. Ranking changes are John's call (Tier 3) — sessions update *statuses* freely, *order* only
>    with John.

---

> ## ✅ Cleared 2026-07-29 08:45 CST — `SES-33` (Tooling), kept as a recurrence warning
>
> **Was:** the GitHub→Vercel `dev` auto-deploy stopped firing 2026-07-28 ~21:55, leaving
> `origin/dev` **14 commits** past its last build. Production (`main`) was never affected.
> Every bucket's ship bar is confirmed by live QA against the dev preview, so while it was
> down, no session could honestly close an item on deployed evidence.
>
> **Now:** firing again, one deployment per commit, backlog drained (verified via the Vercel
> API, 2026-07-29 08:45).
>
> **Root cause — the Vercel free-tier cap of 100 deployments/day.** Not a broken integration.
> Confirmed by counting deployments per UTC day: **2026-07-28 = 120**, against 21/34/28/40 on
> the surrounding days. Recovery ~24h after the burst rather than at a calendar reset points to
> a **rolling** window — which is why it looked like it "self-healed" and why sessions
> re-measuring it got contradictory answers.
>
> **What this means for this board.** The constraint is *push frequency*, and 5-7 concurrent
> sessions is exactly what burns 120 deploys in a day — so expect this again on a heavy day.
> A poke commit spends quota and fixes nothing. **Before trusting any live-QA result run
> `node scripts/check-deploy-current.js` (`SES-015`); when the preview is stale, verify at the
> true seam** (import the repo's own exported functions against the real upstream API) rather
> than waiting out the window — that is how `HAR-20` and `LOG-71` were both verified while the
> preview was stale. A seam proof is not an end-to-end deployed proof; say which one you have.

> ## ✅ Cleared 2026-07-30 — `SES-66` (Tooling), same class as `SES-33`, different upstream
>
> **Was:** every live regression call failed instantly with `Anthropic call failed: 400` —
> an account-wide Anthropic usage cap (*"You have reached your specified API usage limits.
> You will regain access on 2026-08-01 at 00:00 UTC"*), confirmed cross-cutting via an
> unrelated case failing identically. Found live 2026-07-30 (`design-dat-16`).
>
> **Now:** John raised the account limit directly; live calls resumed within the same session.
>
> **What this means for this board.** Unlike `SES-33`'s deploy-quota gate, there is currently
> no pre-flight check for this — a session only discovers it mid-run, after already spending
> wall-clock on a call that was going to fail regardless. If this recurs, check for this
> failure signature (`upstreamStatus: 400`, `faultCode: 'anthropic-request-rejected'` in Vercel
> function logs) before assuming a code or deploy problem.

## 1. What beta means (John, verbatim)

Stated 2026-07-22, restated 2026-07-23 — never previously captured in any doc:

> "I am trying to get the beta version of deepbench out there. Especially so i can send the
> link over to apple. My goal is to send them the concept it is in beta, but if they have a
> chief ai architect or developer look at my product, they will see that it is a true agentic
> multi-agent platform and has real ai patterns running and not a deterministic platform or
> software. I want them to know I would be a great agent product manager for them. I am only
> going to have them concentrate on the chi screen and the sub screens under bench."

> "…beta means sending deepbench over to apple to see my work building a multi-agent platform
> and they will want to hire me, nothing will be embarassing bug or lieing that i can build an
> multi-agent agentic platform"

**Operationally:** the audience is an Apple chief AI architect / developer; the surface is the
**CHI screen + the Bench sub-screens**; the bar is **no embarrassing bug, nothing that
undermines the claim of a real (non-deterministic) agentic multi-agent platform**. Because the
audience is a developer, an open devtools console is assumed part of the surface.

---

## 2. The five beta buckets (John, 2026-07-28 — CANONICAL)

Restated and settled by John 2026-07-28, superseding the four-bucket list from the 2026-07-24
session. Verbatim:

> "The buckets are 1. full 24 regression pass 2. UX/UI is clean for chat, column 2 and the
> user knows how to operate with minimal difficulty, 3. mobile works well, 4. AI Audit Log
> screen is accurate, 5. Agent routing drawer works well, accurate, and all agents are
> displaying at least 1 pattern in their hop - if appropriate. We can ship after that, but if
> we have time, the extra bonus would be to get re-classify patterns below 10K"

| # | Bucket | Ship bar |
|---|---|---|
| 1 | **Full 24-case regression pass** | The CHI true end-to-end regression runbook (`SES-29` (Task Success Rate), 23 questions + case 24 news door) completes clean. |
| 2 | **UX/UI: chat + column 2** | Chat (column 1) and the numbered journey-step drawers (column 2, §19n) are clean, and a user can operate them with minimal difficulty. |
| 3 | **Mobile works well** | The beta surfaces behave well on mobile. |
| 4 | **AI Audit Log screen is accurate** | What the audit screen renders is true — counts reconcile, labels aren't invented or hardcoded. |
| 5 | **Agent Routing drawer** *(renamed "Agent Patterns" on all surfaces, `LAV-39` 2026-08-10 — bucket name kept as John's verbatim)* | Works well, accurate, and every agent displays ≥1 pattern in its hop — where appropriate. *(2026-08-10, `LOG-133`: a live 9-hop run showed ≥1 pattern on all 9 hops after Susan's "Brokered Delegation" promotion closed the broker-path gap.)* |

**Ship rule:** all five buckets green → ship beta.
**Bonus (only if time remains after the five):** get the AI Audit "re-classify patterns"
count below 10,000. Explicitly not a ship-gate.

---

## 2b. Pre-regression prep (John-approved 2026-07-28)

These items protect the regression run's *evidence* and run **before** bucket 1 — they were
triaged Post-beta on the "reviewer never sees it" test, which is the wrong test for tooling the
ship-gate itself depends on. (Opened with three; the list has grown as sessions found more of
the same class — 4 done, 2 open as of 2026-07-29. Don't restate a count in this sentence again.)

1. **`SES-28` (Tooling) — ✅ DONE 2026-07-28 (`S-SES-28`, v6.3.208, `e96f2ee`).** Plain
   `node tests/regression/<file>.js` used to pass vacuously (exit 0 testing nothing — only
   `run-all.js` called the exported function), which would have faked the entire bucket-1
   ship bar. Every test file now carries a shared self-run guard, so a direct invocation is
   real and a failure is loud; a meta-test fails the suite if any test file lacks its guard.
   Suite 13/13, self-verified QA 7/7. **Runbook note, still standing:** invoke via
   `run-all.js` — it is the only thing that runs *all* of them — and run `npm install` in the
   worktree first, because a worktree resolves `node_modules` up to a shared tree that may
   predate `package-lock.json` and produce a false RED (that exact false red was live tonight).
   Both rules are now in `STANDARDS.md` Section 2 rule 5.
2. **`SES-015` (Tooling) — ✅ DONE 2026-07-28 (`S-SES-015`, v6.3.209, `ba3232a`).** A push to
   `dev` is not a deploy, so a stale-preview pass is indistinguishable from a real one — in
   *either* direction, which is what makes it a ship-bar risk and not just a nuisance.
   Measured across 156 `dev` commits that day: median lag 37 s, but **p90 852 s, max 2,973 s,
   20% waited over 10 minutes.** `scripts/check-deploy-current.js` now gates it — exit `0`
   the serving deployment contains your commit, `1` stale, `2` couldn't check (**exit 2 is
   not a pass**). It compares by **ancestor, not equality**, so a tip pushed ahead by a
   concurrent session still passes. Wired as step 0 of `STANDARDS.md` Section 6 and of the
   CHI regression runbook. Self-verified QA 10/10.
   **This item's original prescription was wrong and is superseded — do not follow it.** It
   said "fetch the served bundle, grep for a string unique to the build," which cannot work
   for the run it was listed to protect: the regression driver posts to
   `/api/capabilities/execute`, a serverless function with no static asset to grep. Verified
   live, the two paths differ — `api/` responses are never edge-cached (`X-Vercel-Cache:
   MISS`), so the commit-SHA gate is sufficient on its own for bucket 1; frontend HTML *is*
   cached (`HIT`, `Age: 298`, and `Cache-Control: no-cache` does not bust it), so visual QA
   still needs the bundle-grep as a second layer. Both are written into Section 6.
   **Related:** `SES-33` — same symptom, different half. The gate *detects* a stale preview;
   it does not produce deploys. Keep that row's recurrence warning in mind before a long run.
   ⚠️ **Unresolved contradiction inside `SES-33`'s own row, flagged 2026-07-29 by
   `S-SES-015-design`, not silently edited — someone should rule on it.** The row asserts both
   *"ROOT CAUSE MEASURED (`ses29-fix-kickoffs`): Vercel's free-tier cap of 100 deployments/day
   is exhausted"* — with a verbatim API error, `Resource is limited - try again in 24 hours
   (api-deployments-free-per-day)` — **and** *"self-resolved; no fix was applied and no root
   cause was established."* Both were written by different sessions. They are not equally
   supported: the quota finding carries hard evidence, and an 08:45 self-recovery is precisely
   what a daily quota rolling over looks like, so the recovery corroborates that cause rather
   than contradicting it. **Why it matters for beta:** if it is the quota, recurrence is
   *predictable* — a heavy multi-session day will re-exhaust it — and the mitigation is to
   spend fewer deploys or upgrade the plan, not to wait and hope. `SES-015`'s measurement that
   day (fast median, long evening tail) fits the quota explanation. Detail:
   `docs/harvests/SES-33.md`.
3. **`SES-18` (Tooling) — ✅ DONE 2026-07-28, both halves.** Reseed (`beta-doc-0728f`): all
   15 `feature_id_counter` prefixes audited against the real doc maxima; only `ABT` was
   desynced (counter 1 vs real max `ABT-2`) — reseeded to 2 via `GREATEST`. Bypass closure
   (`design-ses-18`): root-caused to the claim rule living only in the session-*setup*
   skill while `CLAUDE-DESIGN.md`'s filing rules covered the prefix and not the number,
   plus a one-ID-per-call claim that made hand-counting the easy path for multi-row
   filings. Claims now take an `<N>` and return a contiguous block; the rule moved to the
   point of filing; `next_number` renamed `last_issued_number`. Collision risk for the
   high-volume regression filing window is cleared. Drift *detection* was deliberately
   scoped out and is now **`SES-38`** (Tooling, post-beta).
4. **`SES-25` (Tech Debt) — ✅ DONE 2026-07-29, both halves** (`SES-25a` v6.3.207, `SES-25b`
   v6.3.212; final residue `LOG-37` closed by `design-log-37`). Nothing outstanding here
   before the regression run. Original framing kept below because the correction is the
   useful part. — `FEATURES.md` is ~290 KB vs the 40 KB baseline.
   **Corrected 2026-07-28 (`design-ses-25`): the "archive pass" this item used to prescribe
   does not work** — only **7 of 175** rows are `✅ Done`, so sweeping them recovers almost
   nothing. The 278 KB lives inside *open* rows (175 rows averaging 1.6 KB, against
   `FEATURES-LATER.md`'s 229 rows in 83 KB). The growth-stop half already shipped as
   `SES-25a` (v6.3.207 — `check-session-docs.js` check 3d, a per-row 2,000-char cap, 38 rows
   flagged). **`SES-25b` ran 2026-07-29 (v6.3.212): `FEATURES.md` 298.7 → 282.4 KB**, moving
   the historical blocks out of the 4 worst rows (`LOO-21` 5383→2283, `LOG-23` 10491→6945,
   `LOG-37` 11008→7160, `LOG-72` 8656→2582) into `docs/harvests/` — **a move, never a delete;
   0 of 95 substantive clauses lost, verified per-clause.** Residue: `LOG-37`'s own status
   chain, still over cap. Efficiency, not
   correctness — still skippable for beta.
5. **`SES-57` (Tech Debt) — ✅ DONE + archived 2026-07-29 (v6.3.230 `bb60703`; gate verified by `S-SES-62` QA, v6.3.231). Nothing outstanding here before the regression run.** Updated 2026-07-29
   (`design-ses-57`).** The fix landed as a new platform service, **Article Context Resolver**
   (`src/lib/newsCardContext.js`, §19m row 33) — the CHI screen and the test engine now call one
   function, so the payload cannot diverge again. Suite 23/23, build clean, live-proven at the seam
   (real 400 → a classified reason object; unreachable endpoint → fails open instead of recording an
   infra death). **Two corrections this session measured, both of which change this item's story:**
   the "one line" fix below was a **no-op** (the test engine never read the error body, and
   `db-assembly.js` filters empty values, so adding the key alone changes nothing); and the item's
   live impact is **latent, not live** — it needs a non-OK article fetch, which `CHI-95` shows
   practically never happens. **Its own gate cannot run yet — blocked on `SES-62` then `CHI-95`
   (both new, both below).** Original framing kept because the recurrence is the useful part:
   The regression driver stopped matching the screen the moment `CHI-91` shipped:
   `scripts/chi-true-regression.mjs:540` spreads 3 `extraFields` into case 24's answer/gate/display
   calls, and `analyzeNewsCard()` now spreads 4 — `article_unavailable_reason` is missing. On a
   failed article fetch the run therefore asks Marcus Webb — GEO CSO Expert a question the product
   would never ask: no reason reaches him, so he cannot produce the gap acknowledgment
   `ci-answer-intent` now instructs, and the judge scores an answer the shipped screen does not
   generate. **Belongs here on exactly the §2b test** — it doesn't change the product, it
   silently invalidates a bucket-1 gate's evidence, and case 24 *is* a bucket-1 gate. Same drift
   `SES-31` (regression-driver-payload-parity) was created to prevent, recurring because nothing
   structurally couples the two payloads; the fix should consider a shared helper so the next
   added field cannot diverge. **Self-caught by the session that introduced it, same day.**
6. **`SES-58` (Tooling) — ❌ OPEN, filed 2026-07-29 (`S-DAT-12-design`), cheap.** The half
   `SES-015` above left open: its gate runs **once, before case 1**, and the driver never calls it
   again, so nothing detects a build landing during cases 2-24. Measured — the only
   full-run-length attempt on record ran **134 minutes** (2026-07-28 18:07-20:22 CST) and **38
   commits landed on `dev` inside that window**, 3 touching `src`/`api`/`lib`; `dev` takes 11–30
   commits/hour during working hours. So a run's 24 cases can straddle several builds while the
   report attributes them all to one commit. **Belongs here on the §2b test** — it changes nothing
   about the product and silently invalidates the bucket-1 gate's evidence, exactly like `SES-57`
   above. Fix is small: the driver already resolves the serving commit at start; record it per case
   and flag a change in `REPORT_JSON`. Not to be confused with `SES-33` (Vercel producing no build
   at all) or `DAT-12` (which *data* a run read).
7. **`SES-62` (Task Success Rate) — ✅ DONE + archived 2026-07-29 (v6.3.231, `462e5ac`). The news door mirrors the screen two calls; the first run since `CHI-92` to reach a judged verdict.** Original framing kept — it is why #24 was unmeasurable. Was: DO THIS FIRST —
   nothing about regression test #24 can be measured until it lands.** The news-door gate has been
   failing **100% of the time, unconditionally, since `CHI-92` shipped this morning** (v6.3.227):
   that session split the news flow into a search call returning `stories` and a display call
   returning `cards`, and the test engine still makes only the first call and reads a `cards` key
   that no longer exists. The case throws "news door: Jordan returned zero cards" before it reaches
   the article, the answer, or the judge. Confirmed by a direct deployed call — `ws-news-search-intent`
   returns `content.stories` with 3 real headlines and **no** `cards` key. **The product is fine**
   (verified live: Jordan Ellsworth — Web Search Expert → Michelle Manning — Project Manager →
   Alex Reeves — Screen Controls Editor all complete, drawer populates). Test engine only —
   textbook §2b. **Third recurrence of this exact drift** after `SES-31` and `SES-57`.
8. **`CHI-95` (Task Success Rate) — ❌ OPEN, filed 2026-07-29 (`design-ses-57`). Not a §2b evidence
   item — this one is the product.** `api/fetch-article.js` returns **200 with a conversational
   refusal as the article text** (`:114` only checks non-emptiness), so the honest-gap path
   `CHI-91`/`SES-57` built can never fire. Measured against the deployed route: a paywalled
   `wsj.com` URL returned a summary of *adjacent* reporting Claude guessed was "likely the subject
   of that article"; a nonexistent `ft.com` path returned "I'm sorry, but I'm unable to access that
   URL… How would you like to proceed?" — both `res.ok`, both with `article_unavailable_reason:
   null`. Marcus Webb — GEO CSO Expert then analyzes that as if it were the article. **Bucket 1
   because the judge would score content founded on a guess, and §1's "nothing lying" bar because a
   reviewer clicking a paywalled card gets undisclosed guesswork.**
   **Corrected 2026-07-29 (`S-SES-62` QA) — narrower than filed, and it no longer blocks anything.**
   My "the honest-gap path can never fire" claim was an overgeneralization from two samples; a live
   run supplied the counter-example. The Apple newsroom card returned a real `401`, the reason
   reached Marcus Webb — GEO CSO Expert, and the ARTICLE UNAVAILABLE clause fired verbatim. So the
   route *does* classify failures correctly when the AI fallback also fails. What stands is the
   narrower defect: **when the fallback returns something, a refusal or a guess passes as article
   text.** Still a §1 bar, no longer a blocker for `SES-57`. Size the fix by measuring how often
   each branch actually occurs.
9. **`SES-64` (Task Success Rate) — ❌ OPEN, filed 2026-07-29 (`S-SES-62` QA). Do before the next
   bucket-1 run.** Regression test #24 is hardcoded `outcome_class: "rich-answer"`
   (`chi-true-regression.mjs:191`), but when its card's article cannot be read the *correct* answer
   is an honest gap — so the run **fails a correct answer on the wrong rubric.** Measured on the
   first #24 run to reach a verdict since `CHI-92`: Marcus produced a textbook honest gap and Owen
   — Proofreader failed it on `actionable_guidance_present` against the rich-answer bar,
   `case_pass: false`. This is exactly what `AGT-36` built the `honest-gap` class (§5b) to fix;
   #24 is the one case never wired to it, because its class predates the class. Fix: derive #24's
   class from that run's `article_degraded` instead of hardcoding it.
10. **`SES-67` (Observability) — ✅ DONE + archived 2026-07-31 (`S-SES-67`, v7.0.22, `56935bd`).**
   Confirmation-gate (and `depth_exceeded`) returns now carry `trace_id`/`span_id` (§19p); the
   driver needed zero changes. Closure gate passed discriminating: case 6 report carries **10**
   trace ids vs 8 on every pre-fix run, the 2 new ids verified in `ai_activity_log` as the
   forecast-patch chains. Guard test proven to fail on pre-fix source. The QA run's own
   `case_pass: false` is `HAR-30` (bucket-1 table below), A/B-proven independent. Original
   framing kept: The driver's
   `REPORT_JSON` `trace_ids` list misses the two mid-journey forecast-patch chains on the edit
   journey — measured on case 6, both runs this session: the `patch` and edit-`resolve` calls each
   ran a full `data-analysis:data-patch-intent` chain (~80–100 s, 5 calls apiece) under trace ids
   the report never captured; only a time-window `ai_activity_log` query finds them. Suspected
   mechanism (verify before scoping): both calls return through `call()`'s `job_id`/`continue`
   path and the continued response's trace id isn't collected. Verdicts are unaffected — **belongs
   here on the §2b test** because it weakens bucket-1 *diagnosis* evidence: an RCA working from a
   report's trace list sees idle time where real chains ran, which is exactly how `CHI-96` first
   presented.

---

## 4. Contested — John's call, nothing proceeds on these without him

1. ~~The Bench fabrication group~~ — **RESOLVED 2026-07-28, John: "those go in the later
   bucket and not for beta."** `LOG-57` (Architecture), `LOG-70` (Architecture), `AGR-01`
   (Architecture), `AGR-001`/`AGR-002` (Architecture/Data), `MI-03` (Feature) are all
   post-beta; the Bench fabrications are accepted risk for the beta send. (Interpretation
   note, Tier 2: recorded as a beta-gate ruling only — the rows stay in their current
   FEATURES tier files; no physical re-tier done.)
2. ~~`CHI-70` (Architecture)~~ — **RESOLVED 2026-07-28, John: "later bucket not beta."**
   Refresh-loses-conversation is post-beta; accepted for the beta send.
3. ~~`HAR-14` (Task Success Rate)~~ — **RESOLVED 2026-07-28, John: conditional.** "Wait and
   see if regression uncovers this. If not, it goes into next bucket - after beta release."
   → Not queued now; if any 24-case run failure root-causes to an accepted empty required
   field, `HAR-14` enters bucket 1 at that point. Otherwise post-beta (Next tier).
4. ~~`AA-178` (Architecture)~~ — **RESOLVED for beta 2026-07-28, John: defer the ruling
   post-beta.** Fresh code read this session: the direct `queryLibrary()` call no longer
   exists — since `AA-106`/`AA-107`, `ai-enrichment.js` routes `the_library` fetches through
   `queryContent()`'s single broker path, credential-checked per requesting agent. No live
   failure, no regression impact; the caller-identity-vs-code-path meaning question stays
   open but unscheduled. Consequence: `AA-179` (Architecture) **drops out of bucket 5** for
   beta (it was item 13, blocked on this ruling).
5. ~~`MI-69` (Architecture)~~ — **RESOLVED 2026-07-28, John: "move to next bucket no beta."**
   Post-beta (Next tier); the narration-polish redesign waits. `CHI-17` (bucket 5 #7) remains
   the beta-side answer to the canned-vs-real impression.

**All five contested calls are now ruled — §3's queues plus the rulings above are the
complete beta board.**

---

## 3. Per-bucket queues — moved to docs/BETA-TRIAGE.md
## 5. Bucket 6 (Bonus) — "re-classify patterns below 10K" — moved to docs/BETA-TRIAGE.md
## 6. Notable Post-beta calls made in this triage — moved to docs/BETA-TRIAGE.md
## 7. Provenance — the recovered 2026-07-24 rankings — moved to docs/BETA-TRIAGE.md
## 8. Open items — moved to docs/BETA-TRIAGE.md
