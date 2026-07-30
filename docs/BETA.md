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
| 5 | **Agent Routing drawer** | Works well, accurate, and every agent displays ≥1 pattern in its hop — where appropriate. |

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

---

## 3. Per-bucket queues (triage 2026-07-28, `beta-doc-0728`)

Full-row-text triage of every open row in `FEATURES.md` + `FEATURES-NEXT.md` against the §2
buckets (statuses verified same day, `origin/dev` @ v6.3.195). **Order within each bucket is a
recommendation, not a decision** (maintenance rule 3). Everything not listed here or in §5/§6
is Post-beta and stays where it is in the FEATURES files.

### Bucket 1 — full 24-case regression pass

`SES-29` (Task Success Rate) is the bucket itself — the runbook run. Everything below is a
known defect that would break or dirty that run:

> **Bucket-1 strategy — regression-first (John, 2026-07-28):** no bucket-1 fix sessions until
> the `SES-29` run produces its failure list. The rows below are **suspects, not a queue** —
> most of their failure rates were measured before `HAR-17`-done's auto-recovery (v6.3.181–183)
> and may no longer reproduce. Run first; schedule fixes only for what actually fires, with
> the run's evidence attached. Expected: the first run will NOT be clean — that is the diagnosis
> working, not a surprise. Same logic as the `HAR-14` conditional ruling in §4.
>
> **Amended 2026-07-29 (`design-loo-013`):** this note originally named `LOO-013`'s case-24
> misroute as the guaranteed failure ("structural and recovery-proof"). That is no longer true —
> `LOO-013` is fixed and verified 5/5. The prediction was also based on the wrong root cause: the
> misroute was never about a capability-less candidate, it was a hardcoded delegation target in
> Jordan Ellsworth — Web Search Expert's own Skill. The "expect failures" framing still stands on
> the remaining 15 rows; case 24 specifically is no longer the known-bad one.
>
> **Corrected 2026-07-29 (`S-CHI-92-design`) — the sentence above is wrong, and this is a QA
> lesson worth keeping.** `LOO-013`'s routing fix was real, but its "3 cards, no errors"
> verification **counted cards without reading them**: all three were `<UNKNOWN>` in every field
> then, and still were when reproduced live today. **Case 24 remains a known-bad case** until
> `CHI-92` (Task Success Rate, kickoff `v6.3.227`) ships. Rule this re-proves
> (`STANDARDS.md` §7): an assertion that would pass unchanged if the fix did nothing is not a
> gate. `CHI-92`'s own QA asserts on card *contents* and on the delegate's input-token count.

| # | ID (Type) | Why it breaks the run |
|---|---|---|
| 1 | ~~`LOO-013` (Task Success Rate)~~ **✅ Fixed 2026-07-29 (`design-loo-013`, v6.3.219) — no longer a bucket-1 risk.** | ~~News flow routes to capability-less Brent — fails case 24 outright, drawer stuck.~~ Root cause was not the capability-less-candidate question at all: Jordan Ellsworth — Web Search Expert's `ws-news-search-intent.method` hardcoded `delegate_to_agent targeting agent_id "alex"`, so Michelle Manning — Project Manager was never called and the roster was never consulted. Fixed in Skill data; verified live 5/5 (`jordan → michelle → michelle → alex`, 3 cards, no errors). **Case 24 should now pass — confirm it in the `SES-29` run rather than assuming.** |
| 1b | ~~`CHI-92` (Task Success Rate)~~ ✅ | **DONE 2026-07-29 (`S-CHI-92`, v6.3.227, `61a941c`) — QA 12/12 PASS, off the queue.** Case 24's news door renders real cards for the first time: 3 real headlines, real publications, real dates, 0 `UNKNOWN`, and a card click drove the full journey to a rendered answer in 10 hops. Cause was `delegation_required` auto-dispatch forwarding only the help-request text; Alex Reeves — Screen Controls Editor was never the defect. Fixed with the existing display-request pattern — 3 Supabase rows + 1 screen file, **no harness change**. **Confirm case 24 in the `SES-29` run rather than assuming** — that is exactly the mistake `LOO-013` made above. Left behind: `CHI-93` (Speed) and `CHI-94` (Task Success Rate), both bucket 2. |
| 2 | `CHI-78` (Task Success Rate) | Turns silently stall or throw post-Marcus; 3 of 5 runs affected. **Amended 2026-07-30 (`design-agt-47`): this is two defects, not one, and its stated blocker is void.** `CHI-77` shipped 2026-07-27 (v6.3.152) — but its fix is a **catch**-based reporter, and 2 of the 3 occurrences never threw (silent stall, clean console). A catch cannot observe a non-throwing stall, so "needs a real captured reason first" can never clear. Split into the stall (liveness — needs a per-hop watchdog) and the hop-24 gate throw (already tied to `LOO-21`) before scoping. Confirm first which build the 2026-07-28 runs used — the 07-28 deploy stall may mean they predate `CHI-77`. Detail: `docs/harvests/CHI-78.md`. |
| 3 | `AA-194` (Task Success Rate) | Null `output_desc` misroutes agent selection — caused a live "went wrong reaching Marcus." |
| 4 | `HAR-13` (Task Success Rate) | Owen's 1500-token gate vs 9,601-char method truncates, failing turns. |
| 5 | `SCA-3` (Task Success Rate) | `qg-review-intent` omitted required `final_answer` 5×; turn fails validation. |
| 6 | `AGT-31` (Task Success Rate) | 40–60% of Priya Nair — Forecast/Theory/Performance Expert's hypothesis-test displays fail. |
| 7 | `AGT-028` (Task Success Rate) | Owen Kim — Compliance/QG ends turn handing the raw guardrail failure to the user. |
| 8 | `CHI-54` (UI) | Silent news-fetch timeout leaves a blank state — the case-24 news door again. |
| 9 | `MI-71` (Tech Debt) | Stated-theory phrasing dead-ends: chat points right, nothing renders. |
| 10 | `CHI-68` (Tech Debt) | Claim-phrased theory routes correctly, then renders an empty Theory Candidates dead end. |
| 11 | `LOO-21` (Architecture) | Double Eleanor Voss — Librarian verification doubles latency + failure exposure per catalog question. |
| 12 | `AA-156` (Task Success Rate) | Citations unvalidated — an invented UUID rendering as a citation is the "lying" bar. *(triage call — was CONTESTED)* |
| 13 | `AI-45` (Task Success Rate) | Verify CHI capability actually reasons over `task_context`; answer-correctness risk. |
| 14 | `AA-78` (Task Success Rate) | Off-topic hypothesis accepted silently; a probing reviewer hits it. *(triage call)* |
| 15 | `AGT-34` (Data) | Contradictory `final_answer` rule could blank a blocked answer — rare path, verify first. *(triage call)* |
| 16 | `DAT-8` (Tech Debt) | Test-artifact rows inflate Compliance counts a catalog question can surface. *(triage call)* **Escalated 2026-07-29 (`S-DAT-12-design`): 2 of them are `status='active'` and the CHI Data Sources drawer renders their titles — `DAT-7 End-to-End Live Test`, `DAT-11 atomicity target` — verbatim to the Apple audience. Same class as `AGT-38`-done, so no longer a triage call on the surface test.** |
| 17 | ~~`DAT-12` (Data)~~ **✅ Fixed 2026-07-29 (`S-DAT-12-design`/`S-DAT-12`, v6.3.228, `9706ce4`), QA 8/8 — no longer a bucket-1 risk.** | ~~The run isn't repeatable: 4 of the 20 seed scenarios unreachable, 15 leftover rows retrievable, five of them copies of one prior answer.~~ `retrieval_scope: "baseline"` ships — the driver now scopes every call, so the run reads the 20 seed rows by tag and **writes nothing**. Verified live: scoped retrieval reaches the superseded Elevate Mobility scenario (unreachable before), unscoped is byte-identical, zero rows changed. **Two consequences for whoever runs `SES-29`:** the old §1 item 4 prerequisite ("verify every baseline row is active — stop and repair") is gone, replaced; and **concurrent sessions may write to The Library during a run**, so the run no longer needs the demo taken offline. Ordering note: this had to land before the first meaningful run, because a clean run against a corpus that changes every run was never evidence. |
| 17 | `AGT-39` (Task Success Rate) | Nadia Farouk — Data Expert writes 8-character pseudo-ids into her drafted patch prose ("entries, with IDs 2479db72, 9e3c8eb8"), rendered on the CHI screen. Same bar as row 12 — an id-shaped string that is not an id. *(added 2026-07-29, `S-AGT-37`)* |
| 18 | `AGT-46` (Task Success Rate) | Priya Nair — Forecast/Theory/Performance Expert does the same in theory-test prose — the original decoy source behind `AGT-37`. Correctness is now handled (`HAR-21` + `AGT-37`); what remains is a reviewer reading `(id: 0cecd001)` and seeing a fabricated citation. *(added 2026-07-29, `S-AGT-37`)* |
| 19 | `DAT-14` (Data) | ~10 QA-authored rows written into `the_reasoning` / `apple-cso-data-room` by this session's own live tests. Same class as row 16 — synthetic content a catalog question can surface. *(added 2026-07-29, `S-AGT-37`)* |
| 20 | `AGT-47` (Task Success Rate) | A `forecast_draft` renders hollow while the `theory_test` one step earlier in the same case holds the exact figures it needed. Measured live on case 6; fails `named_entities_present`, `quantitative_content_present`, `asked_metric_present`. Survives any fix to row 21's narration leak. ~~Not root-caused.~~ **ROOT-CAUSED 2026-07-30 (`design-agt-47`): Skill instruction, not content loss — ready to scope.** Nadia Farouk — Data Expert *does* receive the theory-test figures (threaded as `task_context.user_reasoning` at `MarketIntelligenceScreen.jsx:4286`/`:4246`; the React-state candidate is ruled out — that path passes no `runtime_context`). Fix is `skill_profiles`/`data-patch-intent.traits.analysis_instructions` (**corrected 2026-07-30 — `.method` is `NULL` on this row and unused, the original field claim was wrong**), zero code, one agent and one Capability, so none of row 21's shared-Skill blast radius. **Residue corrected 2026-07-30 (pre-regression round 2):** both `named_entities_present` and `quantitative_content_present` still fail, not `quantitative_content_present` alone — see `SES-65` for why `asked_metric_present`/aggregate `pass` cannot be trusted here. Figures must land in `proposed_action.content` — the only field `AGT-35`'s contract judges. **Kicked off 2026-07-30:** `docs/kickoffs/v6.3.232-AGT-47-carry-forward-theory-figures.md`. Detail: `docs/harvests/AGT-47.md`. *(added 2026-07-29, `design-arch-beta-0729` pre-regression check)* |
| 21 | ~~`AGT-44` (Architecture)~~ **✅ Fixed 2026-07-29 (`S-AGT-44`, v6.3.229) — no longer a bucket-1 risk.** | ~~Artifact-producing Skills narrate platform mechanics into user-facing prose. The single dominant bucket-1 blocker.~~ One shared Guardrails Skill (`platform-language-guardrail`) now carries the business-content standard to Priya Nair — Forecast/Theory/Performance Expert and Nadia Farouk — Data Expert, and the worked example that *instructed* the violation is deleted from Priya's Skill. **`platform_language_detected` failures 4 → 0, held across 3 independent runs.** Two rows spun out of the QA rather than staying hidden inside this one: `AGT-49` (row 23) and `DAT-16` (row 22). |
| 22 | `DAT-16` (Data) | Case 9 `vitrine-tech` asks for a compliance **gap** against Apple's required completion threshold, and no `active` Library row contains one — so the rubric requires a figure the corpus cannot supply. Failed 3/3 runs on Owen Marsh — The Proofreader's holistic verdict with **zero** scored criteria failing and `platform_language_detected` false throughout. Same structural problem `D7`/§5b exists for, on a case never tagged into `HONEST_GAP_IDS`. **Blocks a clean 24-case run on its own.** John's call between seeding the threshold, tagging the case (a §8 baseline change), or rewording the question. *(added 2026-07-29, `S-AGT-44-design` QA)* |
| 23 | `AGT-49` (Architecture) | The Personnel File screen renders the platform's first Guardrails Skill as an **INTENT** badge with all four rule clauses blank, on four agents' files — `PersonnelScreen.jsx` has no `guardrails` entry in its skill-type colour map and reads `guardrails.must`/`.must_not`, which don't exist on the jsonb array shape. Introduced by `AGT-44` the same day; same class as `AGT-38`-done. Needs John's UI approval. Confirmed by reading both code paths, not seen rendered. *(added 2026-07-29, `S-AGT-44-design`)* |
| 24 | `SES-65` (Task Success Rate) | **The scorer itself.** `asked_metric_present` is judged and stored but dropped on the rich-answer path (`:360`), and rich-answer `pass` comes from Owen's holistic flag rather than the scored list (`:364`) — so bucket 1 can report a failure with an empty reason list *or* go green with a recorded criterion failing. Both directions measured. Explains `DAT-16`'s "zero scored criteria failing"; needs a ruling before a fix. *(added 2026-07-30, `design-arch-beta-0729` pre-regression round 2)* |

> **Pre-regression round 2 — 2026-07-30, `design-arch-beta-0729` (John: "do i still run that test?").** Same 3 cases
> as round 1 **plus case 24** (`news-first-card`), newly able to reach a verdict after `CHI-92`/`SES-57`/`SES-62`.
> Ran against deployed preview `f9824e8`; `check-deploy-current` STALE again and again **deliberately overridden** —
> the 3 commits the preview lacked (`75e0161`, `4c975a7`, `bb668e0`) are all docs-only, and `DAT-12` (`9706ce4`),
> `AGT-44` (`cd4bbdd`) and `SES-62`'s engine fix (`462e5ac`) were each verified as ancestors of the serving commit.
> Note the driver runs **locally** from the worktree, so the engine-side fix is present by checkout, not by deploy.
> **Result: 2 PASS / 2 FAIL, 16 min** (round 1: 1 PASS / 2 FAIL, 9 min for 3).
>
> | Case | Round 1 | Round 2 |
> |---|---|---|
> | 12 `vietnam-reseller` | ✅ PASS | ✅ PASS |
> | 24 `news-first-card` | *not run — could not reach a verdict* | ✅ **PASS** (article degraded — see `SES-64` amendment) |
> | 9 `vitrine-tech` | FAIL — `theory_test` + `forecast_draft` on `platform_language_detected` | FAIL — **both now pass**; `answer` fails, empty scored list (`DAT-16` + `SES-65`) |
> | 6 `upgrade-cycles` | FAIL — 4 criteria across 2 artifacts | FAIL — `theory_test` **now passes**; `forecast_draft` on `named_entities_present` + `quantitative_content_present` (`AGT-47`) |
>
> **`AGT-44` independently confirmed: `platform_language_detected` went 4 failing artifacts → 0.** Verified here by a
> session that did not do the fix, on the deployed build, which is the check the fixing session could not perform on
> itself. **Every remaining failure is now attributable to a specific open row** — `AGT-47` (case 6's
> `forecast_draft`), `DAT-16` (case 9's missing threshold), `SES-65` (why case 9's failure prints no reason). No
> unexplained failure remains in the pre-regression set.
>
> **`AGT-47` residue is wider than its own row claims.** That row says only `quantitative_content_present` still
> fails post-`AGT-44`; measured here, `named_entities_present` fails too. Two criteria, not one.

> **Pre-regression check — 2026-07-29 16:05 CST (`design-arch-beta-0729`, John's request).** Purpose: buy an
> evidence-based expectation for the next full run without spending the full run. Method: the real driver
> (`scripts/chi-true-regression.mjs --only <case>`) on **3 cases chosen one per failure class** from the 0/24
> run — case 9 `vitrine-tech` (Data Room write-denial class), case 6 `upgrade-cycles` (`[object Object]`
> serialization class, and the *edit* resolution `SES-31a` never verified), case 12 `vietnam-reseller`
> (hollow-answer class). `smartphone-growth` deliberately excluded — already known to pass, would add nothing.
> **Ran against the deployed dev preview `1ad2ed3` (v6.3.216).** `check-deploy-current` reported STALE and was
> **deliberately overridden**: the single commit the preview lacked (`8b7549f`) is docs-only (verified
> `--name-only`: `CLAUDE-STATE.md`, 3 `docs/` files, 1 harvest — no `src/`/`api/`/`lib/`/`scripts/`), and all four
> fixes under test (`v6.3.219` `LOO-013`, `v6.3.222` `HAR-21`, `v6.3.224` `AGT-37`, `SES-31a`) were verified
> present as ancestors of `1ad2ed3`. **Result: 1 PASS / 2 FAIL (9 min total, vs 2 h 2 m for the 0/24 run).**
>
> | Case | 0/24 outcome | Now | Failing criteria |
> |---|---|---|---|
> | 12 `vietnam-reseller` | fail | ✅ **PASS** (79 s) | — |
> | 9 `vitrine-tech` | **`infra_death`** (write denial) | reached `display`, `judge_fail` (267 s) | `answer` **passed**; `theory_test` + `forecast_draft` failed `platform_language_detected` **only** |
> | 6 `upgrade-cycles` | **`[object Object]`** | completed full `edit_then_accept`, `judge_fail` (193 s) | `theory_test` failed `platform_language_detected` only; `forecast_draft` also failed `named_entities_present`, `quantitative_content_present`, `asked_metric_present` |
>
> **The two mechanical failure classes that accounted for 22 of the 24 cases did not reproduce.** Zero write
> denials, zero `[object Object]`, zero infra deaths; both previously-crashing cases now run start-to-finish and
> emit real quantitative business content. **What remains is one writing defect and one content-loss defect**:
> all 4 failing artifacts failed `platform_language_detected` (row 21 / `AGT-44`, **since fixed — 4 → 0**), 3 of them failed nothing else,
> and the sole survivor of fixing that is row 20 / `AGT-47`. Owen — Proofreader verbatim: *"Platform back-office
> narration dominates."*
>
> **Consequence for this bucket's strategy:** the regression-first rule above is unchanged, but the pre-regression
> check is now the cheap instrument that decides *whether a full run is worth starting* — ~9 min for 3 cases
> against ~70 min for 24 at the observed per-case rate. **Re-run these same 3 cases after each bucket-1 fix
> before committing to a full run.** It is also the bounded test for what counts as beta: a newly-found row is
> bucket-1 only if it fails a pre-regression case, Post-beta otherwise.

> **Bucket-1 note added 2026-07-29 (`S-AGT-37`):** `AGT-37`'s own crash — **Store as Forecast failing outright** with "Something went wrong committing that" whenever an answer's prose carried a truncated id — was a live bucket-1 defect on the beta surface that was never listed here. It is **fixed** (`HAR-21` v6.3.222 + `AGT-37` v6.3.224) and is recorded for the run's history rather than as an open row. What it left behind is rows 17–19: the *correctness* problem is closed, the *credibility* problem (agents writing id-shaped strings that are not ids) is not.

### Bucket 2 — UX/UI: chat + column 2

**Source-verified 2026-07-28 evening (`beta-doc-0728c`, John's ask):** every row's claim was
re-traced through current source + Supabase. 12 confirmed live, 4 likely already fixed
(rows never updated — verify on screen, then close), 4 only decidable live.

**Confirmed still valid (the real queue):**

| # | ID (Type) | Defect (evidence in current source) |
|---|---|---|
| 1 | `AA-153` (Task Success Rate) | Raw HTML tags as literal text — body packed raw, rendered escaped; no sanitizer in the repo. |
| 2 | `CHI-72` (UI) | Block path returns before the Display hop and pushes raw triage text + `the_library` UUIDs to chat. |
| 3 | `CHI-47` (Architecture) | Evidence is a single replace-on-write state slot — second answer overwrites the first's evidence. |
| 4 | `CHI-85` (UI) | Three chat handlers still call `ensureStep` unguarded — a late completion can stamp an old drawer. |
| 5 | `CHI-86` (Tech Debt) | The news `onProgress` callback is the one site not wrapped in `isStale()` (comment in file defers to this row). |
| 6 | `MI-53` (Architecture) | ConfirmationCard still `String(v)`/`JSON.stringify(v)`-dumps fields; the display-intent fix was fully reverted. |
| 7 | `AA-146` (Task Success Rate) | `fetchAgentCard()` still swallows failure to `null` with no retry — byline drops intermittently. |
| 8 | `CHI-48` (Data) | Hop-range badge: `setQaEvidence` still omits `hopStart`/`hopEnd`; badge renders null. ⚠️ ID collision — `SES-30` (Tooling). |
| 9 | `MI-70` (Architecture) | Confirmed in live Supabase: `high/medium/low` vs `sourced/inferred/synthesized/na`. Caveat: only one badge currently has a render site — data-model inconsistency more than a visible dual-badge bug. |
| 10 | `CHI-67` (Observability) | Agent Reasoning drawer still renders "`N` patterns" / "No patterns synthesized yet." |
| 11 | `MI-41` (UI) | Column 3 root still has no `overflowY`/`minHeight` — column 2's fix was never copied over. |
| 12 | `CHI-87` (Observability) | Mount-path news fetch still unseeded → null duration → `console.error`. **`LOO-26` (Tech Debt) is effectively a duplicate** — its chat-path trigger was already seeded; propose merging into `CHI-87` (John's call per merge precedent). **Re-confirmed live 2026-07-29 (`CHI-92` QA): still the only console error on a full CHI page load + news-door journey.** |
| 13 | `CHI-93` (Speed) | **New 2026-07-29, from `CHI-92`-done's own QA.** The News drawer now takes ~58 s to populate on page load, up from ~22 s — Jordan Ellsworth — Web Search Expert's search turn went 49,770 → 261,284 input tokens once he had to emit structured stories. Honestly narrated (skeletons + live timer), so this placement is a **judgment call John can downgrade**; do not revert the split to recover the 22 s, it produced `<UNKNOWN>` cards. |
| 14 | `CHI-94` (Task Success Rate) | **New 2026-07-29, from `CHI-92`-done's own QA.** A story dated `MAR 21, 2026` renders under the heading "Today's top channel sales news." Newly *visible*, not newly broken — every `published_at` was null before. The drawer's own copy asserts "today," so this is the §1 "nothing lying" bar. Prefer a structural freshness gate over stronger `method` wording. |
| 13 | `CHI-91` (Feature) | 🔶 **Mostly shipped** v6.3.216 — a failed news-card article fetch now explains itself in chat instead of producing a blank non-answer, and Marcus Webb — GEO CSO Expert names the gap in his own words (both live-verified). **Remaining: nobody has seen the fault bubble actually render** — `SES-47`'s deploy cap blocked it (129 deploys/24h, zero builds) and a local Vite server has no `/api`, so no news cards load (`SES-55`). One news-card click on the dev URL after any future build closes items 6/7/11 together. *(promoted into this queue 2026-07-29, `log-109-followup` — the row's `Beta-gate (bucket 2)` declaration was missing at filing time and is now added.)* |

**Likely already fixed — verify on screen, then close the row (5-minute pass):**
`CHI-29` (UI — `ScrollFadeHint` shipped and wired into column 2 + mobile), `CHI-26` (UI —
duplicate status strip removed from `EvidenceColumn`, removal noted in comments), `CHI-28`
(UI — header already renders "Focus Area Audit"), `AA-161` (Speed — Supabase now has
`intelligence-review-format.max_tokens = 3000`, the row's named cause; re-measure chart
render-rate during regression).

**Only decidable live — fold into the regression run's observation list, no separate sessions:**
`CHI-19` (Feature — weakened: `ci-answer-intent` now instructs entity naming; watch compliance),
`CHI-83` (Feature — vocabulary consistency in real answers), `CHI-22` (Feature — abbreviation
expansion), `CHI-62` (Architecture — the escalate path has **zero traversals ever** in
`durable_hops`; lowest priority in the bucket).

### Bucket 3 — mobile

**Empty — and that is the finding.** There are **zero open `MOB-*` rows anywhere** (the only
two ever filed are done/archived). Nothing tracked says mobile is broken, but nothing has
tested it either. **Bucket 3 needs a dedicated mobile QA sweep of CHI + Bench to either green
the bucket or populate it** — that sweep is the queue.

### Bucket 4 — AI Audit Log screen accuracy

**Source + Supabase verified 2026-07-28 late evening (`beta-doc-0728e`, John's ask):** every
row re-traced through current source and live data. 8 confirmed (one escalated), 3 likely
fixed, 2 re-scoped, 1 standing gate.

**Confirmed still valid (the real queue):**

| # | ID (Type) | Defect (verified evidence) |
|---|---|---|
| 1 | `LOG-91` (Observability) | **ESCALATED — the double-write is active:** 1,186 new `agent-turn`+`request-receivable` pairs in the last 24 h (4,291 total by trace-pairing). Entangled with `LOG-81` (its zero-token halves are part of that population). **Update 2026-07-28: `LOG-81`-done makes the display immune** — every AI Audit count now excludes the duplicate half, so this is no longer distorting an on-screen number. It remains #1 as a **write-path/data-hygiene** defect (the DB keeps accruing double rows), not a reporting one. Designed, kickoff v6.3.204. |
| ~~2~~ | ~~`LOG-81` (Observability)~~ | ✅ **DONE 2026-07-28 (`S-LOG-81`, v6.3.203) — off the queue.** John's Option A: every AI Audit count (header Total Calls, By Agent, By LLM, both By Pattern numbers) means real model calls only, via one shared `isCountableCall` predicate; By Service deliberately keeps operations semantics (§12). Live-QA verified against SQL: header 15,405 === SQL countable 15,405, By Pattern 2,110 + 13,295 = 15,405 exactly. **`LOG-60` closed on the same gate.** |
| 3 | `LOG-42`→`63`→`59`→`53` (Architecture) | False-`rag` family, all write sites confirmed live: ungated `rag_retrieved` flag; `conversations.js`/`rag.js` stamp `rag` on pure writes / pre-search; catalog reads tagged `rag` with zero chunk ids; **380 false-tagged agent-selection rows in the last 7 days** (latest 20 min before the check). Write-time stamping was never replaced — it runs parallel to the §19k signature track. |
| 4 | `LOG-102` (Observability) | Dishonest catch (`0` / "No classified patterns yet." as fact) confirmed in source — **now unblocked**, its "after `LOG-99`" gate cleared today. |
| 5 | `LOG-106` (Feature) | By Service raw-render confirmed (no rolling counters; skeleton gate releases at directory load). By Agent confirmed already covered (gated on `logLoaded`). |
| 6 | `LOG-104` (Data) | Pagination still `.order('created_at')` with no tie-break and no dedup on append. **Scope grew 2026-07-29 (`S-LOG-112` QA): a second call site, and worse — `useAgentActivitySummary()` (`useAgents.js`) pages ~16.4k rows over 17 `.range()` calls with NO `.order()` at all, feeding the whole CHI Agents drawer. Fix both sites together.** |
| 7 | `LOG-82` (Tech Debt) | Stale model ids confirmed (`claude-sonnet-4-5` literal; private cost/provider maps that never import `shared/models.js`). |
| 8 | `CHI-15` (Observability) | Still valid — **near-duplicate of `CHI-67` (bucket 2), same drawer, same label collision; merge proposed, John's call.** |

**Likely already fixed — verify on screen, then close:**
`LOG-101` (Observability — `LOG-99`-done shipped its exact proposed fix, rollup ~289 ms),
`LOG-61` (Observability — header now plain "By Pattern"; "Industry Catalog" absent from
source), `AA-177` (Architecture — `the_reasoning` reads/writes now log via `logActivity`
(LOG-09c); small residue noted on the row).

**Re-scoped (cheaper than their rows describe):**
~~`LOG-60`~~ (Observability — ✅ **DONE 2026-07-28, closed by `LOG-81`'s QA gate**, per `SES-32`'s
secondary-ID discharge rule; the denominator question is settled — By Pattern and the header now
count the same countable-call set, verified live at 2,110 + 13,295 = 15,405 = header),
`LOG-56` (Architecture — visible defect gone; close as a small dead-code
deletion), `LOG-48` (Architecture — catalog half done: "Prompt Compression" rename shipped
(AA-190b) and `pattern_vocabulary` has a governed "Generative Prompt Compression"; remaining:
map 25 frozen historical rows, decide `embeddings`' vocabulary destination — 2,191 rows,
still accruing).

**Standing gate:** `LOG-01` (Architecture) — the end-to-end audit accuracy sweep, run
**last**, after the counting conversation settles what the numbers should mean.

### Bucket 5 — Agent Routing drawer

**Source + Supabase verified 2026-07-28 night (`beta-doc-0728g`, John's ask) — the last
bucket swept; every queue on this board now carries verified-current evidence.** Foundation:
`LOG-95`-done (v6.3.184/186) shipped per-hop pattern lines for every hop shape.

**Confirmed still valid (the real queue):**

| # | ID (Type) | Defect (verified evidence) |
|---|---|---|
| 1 | ~~`LOG-71` (Architecture)~~ ✅ | **DONE 2026-07-28 (`S-LOG-71`, v6.3.205, `eab4b46`) — Category L PASS against real Supabase + real Anthropic.** Resume paths passed no `signatureConfig` — **three** `resumeCapability`→`runLoop` re-entries, not two as this table said. Measured before: 221 of 1,979 `agent-turn` rows since 07-26 (11.2%) lacked the config-half, 214 (97%) resume-caused. John's call: persist the frozen snapshot on `durable_hops`, never recompute. Live proof: resumed row `#24861` carries the config-half byte-identical to the frozen original. **This bucket's own bar — "every agent displays ≥1 pattern in its hop" — is what this closed for resumed hops**; the remaining blank hops were attributed here to `LOG-72`'s criteria gap (item 2) — **corrected 2026-07-29 (`design-log-72`): they are a capture gap after all**, owned by `LOG-77` (Architecture), since every criteria-less pattern has now been adjudicated and turned down. **`LOG-103` merged in** (John approved). Historical rows split to `LOG-111` (Post-beta, bucket 6). |
| 2 | ~~`LOG-72` (Architecture)~~ ✅ | **CLOSED 2026-07-29 (`design-log-72`, v6.3.226) — closed as *exhausted*, not delivered; no new beta row.** Verified live: 25 active vocabulary entries, 7 with criteria, 18 without — and **0 of the 18 are unadjudicated.** Susan Smith — Trainer Agent has already turned all 18 down (15 formally `discarded` for MISSING SIGNAL or behavior-the-platform-doesn't-perform; 3 are the `§19l` PATCH-revert residue → `LOG-115`). There is no authoring run left to schedule. **This bucket's bar is still met:** all six agents that appear in Channel Intelligence traces have named rows (Marcus Webb — GEO CSO Expert 285, Michelle Manning — Project Manager 119, Alex Reeves — Screen Controls Editor 82, Owen Marsh — The Proofreader 54, Eleanor Voss — The Librarian 21, Nadia Farouk — Data Expert 5); the three agents with zero named rows ever appear in no CHI trace. Remaining blank hops (~4 in 10) are a **capture** gap owned by `LOG-77` (Architecture), bonus/post-beta. |
| 3 | `LOG-39` (Architecture) | Shrunk: the Layer A fact half largely exists (`tool_calls` records `request_help`); remaining work is the Layer B criteria row for routing. |
| 4 | `LOO-005` (Observability) | Pre-delegation *reasoning* still uncaptured — `LOG-77`-item-9's provenance capture is deliberately facts-only (`delegation_target`/`task_provenance`, no reasoning field). First routing hop still missing. |
| 5 | `LOO-003` (Observability) | `delegation_task` is still a fixed scalar key on both delegation paths — later hop clobbers earlier hop's reason. |
| 6 | `CHI-17` (UI) | `agent_selection` still renders raw verbatim reasoning (truncation moved to render layer, text never shaped). |
| 7 | `CHI-24` (Architecture) | Placeholder matching still keys on agent id only; the stored `replaces.key` is written but never read back. |
| 8 | `CHI-64` (Observability) | Confirmed — and **one root with `CHI-87` + `LOO-26` (bucket 2)**: the mount-path news fetch never seeds `lastEventAtRef`. One fix closes all three rows; consolidation awaiting John. |
| 9 | `CHI-11` (Observability) | The bucket's acceptance audit, run **last** — re-anchored: tags now come from the `ai_call_patterns` view (`tracePatterns.js`), not `patterns_used`. **`AI-52` folds in** (its verification ran 2026-07-28: both hyp intents uniformly write `["rag","structured-output"]`, 190+ rows — per-row legitimacy is this audit's judgment). |
| 10 | `LOG-112` (Observability) | **New 2026-07-28 (`design-chi-90`), same defect class as item 9, one drawer over.** The CHI **Agents** drawer's per-agent pattern breakdown still reads `patterns_used` directly, not the `ai_call_patterns` view. Made visible by `CHI-90`-done: Eleanor Voss — The Librarian's card now reads `1801 CALLS` above a `Rag — (3450 calls)` row, because 1,925 of her 2,411 deterministic `librarian` rows carry legacy `patterns_used`. Sub-rows were never a decomposition of the headline and always sat below it before, so nothing looked wrong until now. **✅ CLOSED 2026-07-29 — shipped v6.3.218 (`S-LOG-112`, `496723c`), QA 13/13, row archived.** John's call on the open question: **deterministic latency does NOT stay visible** — 0 of 4,283 no-model rows are classified platform-wide and never will be, so a proposed "Operations" group was rejected rather than build a parallel display papering over incomplete classification (§19l keeps unclassified an honest gap). Sub-rows now join the Displayer rollup's `log_ids`; all 11 agents matched SQL exactly live, counts and avg latencies. Eleanor Voss — The Librarian 4 rows → 1; 4 agents correctly render none. |

**Likely already fixed — verify, then close:**
`LOG-88` (Observability — `LOG-95`-done shipped both halves the row asks for; residual is
span-write *timing* only, settled by the §19k span-less-delegation count on recent rows),
`CHI-27` (UI — the within-hop reversal was reverted in-code; both levels newest-first).

**Dropped/absorbed:** `AA-179` (blocked ruling deferred post-beta, §4 Q4), `LOG-103` (dup of
`LOG-71` — **merge confirmed by John 2026-07-28**), `AI-52` (folds into `CHI-11`).

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

## 5. Bucket 6 (Bonus) — "re-classify patterns below 10K" (post-gate, John 2026-07-28)

**Metric grounded + levers verified 2026-07-28 night (`beta-doc-0728h`).** The screen's
number is `ai_pattern_reclassification_count`: **log rows with no match in
`ai_call_patterns`** — i.e. *signature-classification coverage*, not legacy naming.
Measured live: **20,727** (of 24,689 log rows; 4,538 classified). Goal <10,000 → clear
~10,700+.

**Correction to this section's earlier draft:** the original lever list (`LOG-45` Group A
renames, `LOG-46` `tool-use`, `LOG-47` `structured-output` destinations) was aimed at
*display naming* — renaming `patterns_used` slugs moves NONE of this metric. Those rows stay
real backlog for label honesty, but they are **out of bucket 6**. `LOG-44` likewise
(largely answered by `LOG-51`-done anyway).

**The floor:** 6,818 of the 20,727 carry no `call_facts` — honestly unclassifiable forever
under §19k's no-backfill rule. The count cannot go below ~6.8K without a counting-rule
change. ~~The goal is reachable: the other **13,909 rows carry signature material** and fail
only for lack of matching criteria.~~ **Corrected 2026-07-29 (`design-log-72`, v6.3.226):** those
rows carry signature material but do **not** fail merely for lack of authored criteria — every
criteria-less pattern has been adjudicated and turned down for a *missing captured fact*. The goal
is reachable only through new capture (`LOG-77`), not authoring; re-derive the arithmetic against
whichever facts actually ship before restating any target here.

**Verified levers, in order:**

| # | Lever | Moves the count by |
|---|---|---|
| 1 | ~~**Criteria authoring through Susan Smith — Trainer's governed path**~~ — **LEVER EXHAUSTED, corrected 2026-07-29 (`design-log-72`, v6.3.226).** The original entry assumed patterns were merely un-authored. They are not: all 18 criteria-less vocabulary entries have already been adjudicated and turned down, so **no Susan run can move this count at all** and the "top-6 populations" arithmetic below never had a mechanism behind it. Kept visible rather than deleted — this claim was bucket 6's stated path to the goal, and a future session would otherwise re-scope it. | **0 rows.** (Was claimed: top-6 = 12,776 → ~7,951 ✓ under 10K. That number was never reachable by authoring.) |
| 2 | `LOG-71` (Architecture, bucket 5 #1) — resumed hops regain the config-half. **Designed, kickoff v6.3.205.** | Stops the unclassifiable pool *growing*; small immediate effect. |
| 2b | **`LOG-111`** (Architecture, new 2026-07-28) — backfill the **2,738** all-time rows `LOG-69` structurally missed (fact-half present, so outside its null-`call_facts` `WHERE`). 657 recover from a same-`span_id` sibling holding the genuine frozen original. | Direct one-for-one reduction; run **after** `LOG-71` or it refills. |
| 3 | ~~The counting conversation~~ — **RESOLVED 2026-07-28.** John ruled non-model ops out of the *count* (not the log — they stay logged per §12): `LOG-81`-done + `LOG-60`-done shipped it, `LOG-91` still open for the write path. **The floor did drop:** "needing reclassification" went 20,729 → **13,295** live, because the denominator is now countable model calls only. Note the remaining pool is all real model calls, incl. John's ~2,571 empty-signature backfill set (`LOG-42`/`LOG-111` thread). | Done — the <10K target is now measured against 13,295, not 20,729. |
| 4 | Minor: `LOG-73` (embedding-orphan naming decision), `LOG-77` (future capture facts), `LOG-55` (verify-then-close, likely mooted by `LOG-37a-patch`). | Marginal. |

**One session shape, mostly data:** lever 1 is Susan's promote/criteria runs (Supabase data
work per §19i/§19l, model per ticket at kickoff), not code. Ship rule unchanged: bucket 6
starts only after the five ship-gate buckets are green.

---

## 6. Notable Post-beta calls made in this triage (Tier 2 — flagged, reversible)

- `AA-175` (Observability — credit-balance alerting): post-beta as a build, **but check the
  Anthropic credit balance immediately before sending Apple the link** — exhaustion mid-review
  is the worst-case failure and the check is free.
- `AA-191` (Architecture — unrestricted `delegate_to_agent` writes): John explicitly
  deprioritized this earlier; that call is respected, not re-litigated.
- `MI-08` (Feature — Demo Reset): post-beta as a control, but do one manual demo-data hygiene
  pass before the link goes out.
- `HAR-12` (Task Success Rate), `SCA-4` (Speed), `LOG-58` (Architecture — display half already
  shipped; taxonomy adoption decision still owed), `LOG-40`/`LOG-41` (Architecture — analytics
  beyond current screens): post-beta.
- All `SES-*` (session ops), `AGT-00x` competency-content work, `DAT-*` seeding, and
  `FEATURES-NEXT.md`'s roadmap features: post-beta (full row list stays in the FEATURES files).

---

## 7. Provenance — the recovered 2026-07-24 rankings

The original four-bucket rankings (Anomalies + AI Audit Log top-10s, general top-5) recovered
from the uncommitted beta-prioritization session are superseded by §3. What they ranked that
has since shipped: `HAR-9`-done, `CHI-65`-done, `CHI-66`-done (v6.3.137 error boundary),
`LOG-51`-done (v6.3.178), `LOG-52`-done (v6.3.149), `LOG-38`-done (v6.3.155 Layer B),
`LOG-49`-done (v6.3.153). Items that ranked high there but fell to §5/Post-beta here
(`LOG-47`, `LOG-46`, `LOG-44`, `LOG-50`) fell because the canonical bucket-4 bar is "what the
screen renders is accurate," and those rows' remaining work no longer changes anything
rendered — their population sizes moved them to the §5 bonus instead.

---

## 8. Open items

1. ~~The fifth bucket~~ — RESOLVED 2026-07-28: John restated all five canonically (§2).
2. ~~Row-mapping triage for buckets 2/3/5~~ — DONE 2026-07-28 (§3), pending John's
   ratification of the recommended order (maintenance rule 3).
3. **§4's five contested calls** — open, John's.
4. **Bucket 3 mobile QA sweep** — needs scheduling; the bucket is untested, not green.
5. **Source-verify buckets 4 and 5 before scheduling sessions from them** — the bucket-2
   sweep (2026-07-28) found 4 of 20 rows already fixed and 1 duplicate, all dead the same
   way: a session fixed the thing and never updated the row (the `SES-27` (Architecture)
   drift class). Assume the same ~25% staleness in buckets 4/5 until swept; the sweep is
   cheap (read-only sub-agents, ~1 hour) and prevents whole wasted fix sessions.
