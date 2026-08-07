# DeepBench Beta — Triage Detail

> Split out of docs/BETA.md 2026-08-01 (SES-68, John-approved). The canonical bar (§1/§2/§4)
> stays in docs/BETA.md — read that first; this file is the working triage detail.

Section numbers are the originals from `docs/BETA.md` and are deliberately not renumbered.

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
> **Added 2026-08-04 (`design-lav-25`):** `CHI-99` (Task Success Rate) joins the suspects — and
> unlike the pre-`HAR-17` rows it fired live TODAY: `ci-answer-intent` can't see `data_type`
> metadata, mis-tags the confidence tier, and the gate blocks the answer (observed on console
> question 1, post-`LAV-23`; possibly a `LAV-23` regression — diagnose before the re-baseline
> run, since a block-instead-of-answer fails this bucket's bar outright). Row: `docs/FEATURES.md`.
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
| 20 | ~~`AGT-47` (Task Success Rate)~~ **✅ Fixed 2026-07-30 (`S-AGT-47` v6.3.232 + `S-AGT-47b` v6.3.235) — no longer a bucket-1 risk.** | ~~A `forecast_draft` renders hollow while the `theory_test` one step earlier in the same case holds the exact figures it needed.~~ Two-part fix, both self-verified live and independently re-confirmed by the design session on current `dev`: (1) Nadia Farouk — Data Expert's Skill (`data-patch-intent.traits.analysis_instructions`, corrected mid-session from an initial wrong-field claim of `.method`) now carries forward every concrete figure/entity in `user_reasoning` instead of generalizing them away — live-proved with decoy markets never seen in the instruction text. (2) That alone didn't close the row's own gate: case 6 is hardcoded to the `edit` resolution, and the edit-resolve call discarded the theory-test text in favor of the reviewer's edit alone (`MarketIntelligenceScreen.jsx` + `chi-true-regression.mjs`, 2 files, no Layer 3 change) — fixed by reading the original text that was already sitting unread in state and joining it with the edit. **Final independent re-run: case 6 `case_pass: true`, both artifacts `failed_criteria: []`.** `vitrine-tech`'s unrelated `DAT-16` failure is proven structurally unreachable by this fix. Detail: `docs/harvests/AGT-47.md`. *(added 2026-07-29, `design-arch-beta-0729` pre-regression check)* |
| 21 | ~~`AGT-44` (Architecture)~~ **✅ Fixed 2026-07-29 (`S-AGT-44`, v6.3.229) — no longer a bucket-1 risk.** | ~~Artifact-producing Skills narrate platform mechanics into user-facing prose. The single dominant bucket-1 blocker.~~ One shared Guardrails Skill (`platform-language-guardrail`) now carries the business-content standard to Priya Nair — Forecast/Theory/Performance Expert and Nadia Farouk — Data Expert, and the worked example that *instructed* the violation is deleted from Priya's Skill. **`platform_language_detected` failures 4 → 0, held across 3 independent runs.** Two rows spun out of the QA rather than staying hidden inside this one: `AGT-49` (row 23) and `DAT-16` (row 22). |
| 22 | `DAT-16` (Data) | **Shipped in two parts 2026-07-30 (`design-dat-16`), still not closing.** Part 1 (`S-DAT-16`, v6.3.234): `vitrine-tech` tagged into `HONEST_GAP_IDS`, John's call between the row's 3 options. Part 2 (`S-DAT-16b`, v6.3.236, widened same session): Nadia Farouk — Data Expert's `data-patch-intent.method` (was `NULL`) now forbids both substituting an adjacent number and delivering an unsupported verdict. Both verified working — no regressions on cases 6/10/20/22, and Owen's own critique confirms Nadia's draft no longer overreaches. **Case 9 still fails** because Owen's own `asked_metric_present` criterion still flags her citing the real 40% figure even when she doesn't overreach — filed as `AGT-50`, a grading-criterion problem, not a writing problem. Full detail `docs/harvests/DAT-16.md`. |
| 23 | `AGT-49` (Architecture) | The Personnel File screen renders the platform's first Guardrails Skill as an **INTENT** badge with all four rule clauses blank, on four agents' files — `PersonnelScreen.jsx` has no `guardrails` entry in its skill-type colour map and reads `guardrails.must`/`.must_not`, which don't exist on the jsonb array shape. Introduced by `AGT-44` the same day; same class as `AGT-38`-done. Needs John's UI approval. Confirmed by reading both code paths, not seen rendered. *(added 2026-07-29, `S-AGT-44-design`)* |
| 24 | `SES-65` (Task Success Rate) | **✅ DONE 2026-07-29 (`S-SES-65`, v6.3.233, `4ea8133`) — QA 6/6.** A bucket-1 run can no longer report a failure without naming a cause: `failed_criteria` is never empty while `pass` is false (`holistic_verdict`), and Owen Marsh — The Proofreader's critique rides the FAIL line inline the way `infra_death`/`journey_deviation` always did. **Scoring byte-unchanged — 972 combinations, 0 pass-verdict differences.** The row's other half was **turned down, not deferred**: `asked_metric_present` staying unscored on the rich-answer path is §5b's own locked table, and it cannot become a gate as written (its Skill returns `false` whenever the question asks for no quantity, so gating would fail correct answers — case 24 `news-first-card`). Ruling now in runbook §5b; the never-observed mirror direction is a known gap in §7. Detail: `docs/harvests/SES-65.md`. *(added 2026-07-30, `design-arch-beta-0729` pre-regression round 2)* |
| 25 | `AGT-50` (Architecture) | Owen Marsh — The Proofreader's `asked_metric_present`/`platform_language_detected` criteria read inconsistently on `forecast_draft`/`theory_test` under the honest-gap class — measured on Nadia Farouk — Data Expert's already-fixed writing still failing on evidence that's just a real, correctly-hedged figure citation. The actual reason `DAT-16` (row 22) can't close. Not root-caused; Owen's Skill deliberately kept frozen while diagnosing. *(added 2026-07-30, `design-dat-16`)* |
| 26 | `AGT-51` (Architecture) | A citation's `confidence_tier` can read `inferred` when the Data Room classifies the same UUID as sourced-equivalent, triggering a hard case-fail via the runbook's `D4` strict-rejection rule regardless of retry outcome. Independent of any content defect. Not root-caused. *(added 2026-07-30, `design-dat-16`)* |
| 27 | `AGT-52` (Architecture) | A citation rejection's own reason text leaks platform jargon (`confidence_tier`, raw UUIDs, `Data Room`) — `AGT-44`'s exact defect class, on a Skill that guardrail apparently didn't reach. Not root-caused; verify which intent generates this text before scoping. *(added 2026-07-30, `design-dat-16`)* |
| 28 | ~~`CHI-96` (Speed)~~ **✅ CLOSED 2026-07-31 (`design-chi-96`) — measured, no regression; row archived.** | ~~The Forecast **edit** journey slowed ~4.3× after `AGT-47`.~~ Two clean dedicated re-runs of case 6 (deploy gate PASSED): **455 s and 326 s, both full PASS** — sequence 193 → 828 → 394 → 455 → 326, so the 828 s reading was top-end variance. Per-call `ai_activity_log` accounting shows zero idle time: the edit journey inherently runs the forecast-patch chain twice (draft + edit re-draft) plus the accept-execute chain, ~15–18 sequential model calls, so ~5.5–7.5 min is its construction cost. `AGT-47`'s payload exonerated (edit-leg inputs 3–12K tokens). A faster journey is a redesign ticket if ever wanted, not a regression fix. Side finding: `SES-67` (Observability), §2b item 10. *(added 2026-07-30, `design-arch-beta-0729` round 3; closed 2026-07-31, `design-chi-96`)* |
| 29 | ~~`AGT-44` (Architecture)~~ **✅ Fixed 2026-07-31 (`S-AGT-44b`, v7.0.7) — no longer a bucket-1 risk.** | ~~v6.3.229's "every artifact-producing agent" reached 2 of 5; `channel-intelligence` never got the guardrail, and case 24 failed on the standard Marcus was never given.~~ Attached, but the plain attach (v7.0.5) deterministically broke Forecast routing (case 6: `qa` instead of `forecast`, 3/3 both directions) — root cause was `AA-121`'s intent-scoping gate being Knowledge-only, fixed generically as `AGT-54`, then the guardrail re-attached with an explicit `intent_allowlist` scoping it away from `ci-routing-intent`. Re-verified: 3/3 routing calls clean, case 6 full `case_pass: true`, case 24's `answer` clean on `platform_language_detected` on a fresh run (case's remaining instability is `AGT-52`, unrelated). *(reopened 2026-07-30, `design-arch-beta-0729`; fixed 2026-07-31, `S-AGT-44b`)* |
| 30 | `AGT-54` (Architecture) | **✅ DONE 2026-07-31 (`S-AGT-44b`, v7.0.7) — no longer a live risk, kept as a beta-relevant record.** `db-assembly.js`'s `AA-121` intent-scoping gate only fired for Knowledge Skills; a Guardrails Skill reaching a routing/classification intent could silently skew its classification. Hoisted the gate to be type-agnostic — this is what unblocked `AGT-44`'s reopen. *(found + fixed live 2026-07-31, `S-AGT-44b`)* |
| 31 | `HAR-30` (Task Success Rate) | **✅ RESOLVED 2026-08-01 (`S-HAR-02b`-patch3 `42acc95` + `ci-identity`/`ci-behavior` `intent_allowlist` routing isolation, rot-guarded) — no longer a bucket-1 risk.** Case 6 `forecast` 3/3 `--only` and clean in the full judged gate (24/24 journeys correct). Root cause: persona text position relative to the routing classification, not Skill delivery. Archived to `FEATURES-ARCHIVE.md`. *(added 2026-07-31, `S-SES-67-design` QA; resolved by the `HAR-02` chain as assigned)* |

> **Pre-regression round 4 — 2026-07-31, `design-arch-beta-0729`, row live, deploy gate PASSED (`3ccf21b`).**
> Two informative results, two void: **case 24 ✅ PASS — the first pass in four rounds** (all three artifacts,
> `platform_language_detected=false`, article degraded again — the guardrail's benefit is real on Marcus); case 12 FAIL on
> **already-filed** rows (`AGT-52`'s rejection-text jargon — "confidence_tier: inferred, synthesized records" — plus one
> probe try naming the Data Room; the fix under test is not implicated); **cases 6 and 9 VOID** — `infra_death: fetch
> failed` (case 6 after a 29-min hang, case 9 in 148 ms; endpoint/network, not judged results — re-run in round 5).
> **Attribution notes, recorded against this session's own round-4 messages:** the "no routing regression" reading of
> cases 12/24 is **retracted** (neither case exercises `ci-routing-intent`'s Forecast branch — an assertion that cannot
> discriminate is not evidence), and the `S-LAV-1d` confound theory is **withdrawn** (`S-AGT-44b`'s A/B held LAV constant).
> `S-AGT-44b`'s original net-negative call was right on the delivery mechanism; what it missed was only that the benefit
> half (case 24) had in fact landed. Round 5 runs after the revert + gate hoist ship: all 4 cases, expecting case 6
> restored to `forecast` routing AND case 24's pass retained.

> **Pre-regression round 5 — 2026-07-31, `design-arch-beta-0729`, independent confirmation of `AGT-44` + `AGT-54`
> (v7.0.7, deploy gate PASSED on `72cd1b8`). Verdict: both fixes CONFIRMED — rows 29/30 stay closed.**
>
> | Case | R1 | R2 | R3 | R4 | R5 | R5 attribution |
> |---|---|---|---|---|---|---|
> | 6 `upgrade-cycles` | FAIL | FAIL | PASS | void | ✅ **PASS** | `forecast`/edit journey restored with guardrail delivered — `AGT-54`'s gate works. 394 s (see `CHI-96` note). |
> | 24 `news-first-card` | — | PASS | FAIL | PASS | ❌ FAIL | **`platform_language_detected` CLEAN — the fix's criterion holds, third consecutive run.** Fail is `holistic_verdict` with zero scored criteria: degraded article judged under the hardcoded rich-answer rubric — **`SES-64` verbatim, 4th occurrence** (green/red now brackets the same condition twice). |
> | 12 `vietnam-reseller` | PASS | PASS | FAIL | FAIL | ✅ PASS | Flaky per `AGT-50`'s judge-variance framing; `AGT-52`/`AGT-51` remain real and open. |
> | 9 `vitrine-tech` | FAIL | FAIL | FAIL | void | ❌ FAIL | `asked_metric_present` under honest-gap on `theory_test`+`forecast_draft` — exactly the predicted `DAT-16` residue / `AGT-50` class. Expected, unchanged. |
>
> **Bar accounting, stated honestly:** the round-4 bar said "case 24's pass retained." That welded this fix's verification
> to `SES-64`, an untouched, separately-filed defect whose whole point is that case 24's case-level outcome is a
> readability lottery under the wrong rubric. The correct, criterion-level reading: the guardrail's target criterion has
> now been clean on every run since the delivery landed (round 4, `S-AGT-44b`'s fresh-card check, round 5), and Marcus
> Webb — GEO CSO Expert's degraded-article answer discloses in business terms with zero platform narration. `AGT-44`/`AGT-54`
> are done; **case 24's case-level pass now depends on `SES-64` (+`CHI-95`) and nothing else.**
>
> **Remaining bucket-1 blockers for the pre-regression set, each named:** case 24 → `SES-64` (driver-only, already
> scoped "do before the next bucket-1 run") + `CHI-95`; case 9 → `AGT-50` + `DAT-16` residue (Priya's `theory_test`,
> never in `DAT-16b`'s scope). Recommended next fix: **`SES-64`** — smallest change, driver-only, and round 5 just gave
> it a fourth measured occurrence.
>
> **`CHI-96` second measurement:** case 6 completed in **394 s** (R2 193 s → R3 828 s → R5 394 s, plus a void 29-min
> network hang in R4). The 828 s reading looks like top-end variance, not a stable 4.3× regression — `CHI-96` stays
> measure-first, downgraded urgency.

> **Pre-regression round 6 — 2026-08-01, `design-arch-beta-0729`, independent confirmation of `SES-64` (v7.0.23,
> `29b2327` verified in checkout — driver-local fix). Verdict: CONFIRMED, and this run exercised the exact branch the
> fix exists for.**
>
> | Case | R5 | R6 | R6 attribution |
> |---|---|---|---|
> | 24 `news-first-card` | FAIL (`SES-64`) | ✅ **PASS** | **Article degraded again — and the driver selected `honest-gap` for all three artifacts, which passed.** The class-selection mechanism worked live on its target condition, independently of the fix session's own degraded-hit PASS. |
> | 6 `upgrade-cycles` | PASS | ✅ PASS | Stable. 392 s — `CHI-96` sequence now 193 → 828 → 394 → 392; two consecutive ~6.5-min readings, 828 increasingly isolated as top-end variance. |
> | 9 `vitrine-tech` | FAIL | ❌ FAIL | Same owned class as R5: `theory_test` + `forecast_draft` fail `asked_metric_present` under honest-gap — `AGT-50` + `DAT-16` residue. Stable, expected, no new information. |
> | 12 `vietnam-reseller` | PASS | ❌ FAIL | **New mode: `infra_death: continue loop exceeded cap (10) without recovery` at 361 s.** Consistent with **`LOO-27`** (open, bucket 1) — its recorded mechanism killed case 23, the *other* honest-gap case, the identical way at 532 s. The driver does not capture the interior hop chain on an infra death, so this is class-consistent attribution, not a proven chain. Case 12 has now failed four different ways in six rounds (platform-language R3, `AGT-52` rejection R4, pass R5, continue-cap R6) — it is the platform's canary, not a fix regression. |
>
> **Set state after six rounds: 2 stable greens (6, 24 — both former never-passers), 2 reds, both owned by open rows
> (`AGT-50`+`DAT-16` residue; `LOO-27`). No unattributed failure. The pre-regression instrument has done its job — the
> systematic crash classes from the 0/24 run are gone, and what remains is a short, named fix list. Per the bucket-1
> regression-first strategy (John, 2026-07-28: run first, schedule fixes only for what actually fires), the next step is
> the full 24-case run, not more sampling.**


> **Pre-regression round 3 — 2026-07-30, `design-arch-beta-0729` ("i have finished the 3 tickets. do you pre-test again?").** Same 4 cases.
> Nothing this round depended on a Vercel deploy: `SES-65` and `DAT-16` Part 1 are driver-local, `DAT-16b` and `AGT-44` are
> Supabase Skill data, and `AGT-47` touched **both** the screen and the driver's mirror payload (`1dce9d7`) — the
> `feedback-check-the-mirror-payload` trap was avoided by that session, so the local driver genuinely exercises the fix.
> **Result: 1 PASS / 3 FAIL, 29 min** (round 2: 2 PASS / 2 FAIL, 16 min).
>
> | Case | Round 2 | Round 3 |
> |---|---|---|
> | 6 `upgrade-cycles` | FAIL — `forecast_draft` missing entities + figures | ✅ **PASS** — both artifacts clean (`AGT-47` confirmed) |
> | 9 `vitrine-tech` | FAIL — `answer`, empty scored list | FAIL — `answer` **now passes**; `theory_test` + `forecast_draft` fail `asked_metric_present` under the new `honest-gap` class |
> | 12 `vietnam-reseller` | ✅ PASS | FAIL — `theory_test` on `platform_language_detected` |
> | 24 `news-first-card` | ✅ PASS (degraded) | FAIL — `answer` on `platform_language_detected` (degraded again) |
>
> **⚠️ Amended 2026-07-30, same session, before anyone acted on it — the "two standards contradict" reading below is wrong.**
> `platform-language-guardrail`'s **clause 3 already permits honest disclosure** (*"say what is missing in business terms and
> what would resolve it — describe the absent information itself, never where you looked for it"*), so nothing needs
> loosening and no ruling is required. The real cause of case 24 is **coverage**: verified in Supabase, that guardrail is
> attached to only `hypothesis-evaluation` (Priya) and `data-analysis` (Nadia) — **not** `channel-intelligence` (Marcus, who
> emits the `answer` on every direct question), `quality-gate` (Owen), or `project-manager` (Michelle). Case 24 was failed
> for breaking a rule Marcus never received. Also retracted: case 12's flip is **not** caused by the guardrail — it was
> attached 2026-07-29 23:48 UTC, and case 12 **passed** in round 2 (02:03 UTC) with it already in place. That flip is Owen's
> own judgment varying. **Minimal remaining work is ONE `capability_skill_profiles` row (`channel-intelligence`), no code**
> — "two rows" stood here briefly and was a slip; `quality-gate`/`project-manager` are deliberate exclusions, see the
> reopened `AGT-44` row in `FEATURES.md` for the full scope.
>
> **The score went down and the platform got better — read the composition, not the count.** `AGT-47` is confirmed on the
> hardest journey in the set. `DAT-16` Part 1 is confirmed (case 9's `answer` now passes). **Every one of the three failures
> is now the same root problem: the platform is being penalised for honest disclosure** — `AGT-50` (widened, `AGT-53`
> retired into it). Cases 12 and 24 fail for *saying* a gap exists; case 9 fails for *supplying a figure* under a class that
> requires saying it doesn't have one. `AGT-44`'s Guardrails Skill and the `honest-gap` class cannot both be satisfied by a
> gap disclosure as currently written.
>
> **Two prior-round claims are now settled by observation:** `SES-64`'s predicted false-FAIL on #24 *did* occur (green in
> round 2, red in round 3, same code and same degraded-article condition — the pair brackets it), and `DAT-16`'s pending QA
> is a **FAIL**, with Priya Nair — Forecast/Theory/Performance Expert's `theory_test` never in Part 2's scope.
>
> **Caveat stated once:** case 12's flip is 2 prior passes vs 1 fail. Suggestive of `AGT-44` as cause, not proof — a repeat
> run is what separates regression from Owen's own judgment varying. Same for `CHI-96`'s timing.

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

**No longer empty — populated 2026-08-01 by `design-lav-mobile-0801`.** The 2026-07-28 finding
below stood until Live Agent View got its first mobile treatment; that work both closed the
biggest gap and surfaced two smaller ones.

| # | ID (Type) | State |
|---|---|---|
| ~~1~~ | ~~`MOB-4` (Feature)~~ | ✅ **DONE 2026-08-01 (`S-MOB-4a` v7.0.36 + `S-MOB-4b` v7.0.37) — off the queue.** LAV had no mobile branch at all; it now has the full CHI-§21-shaped composition with a two-view canvas. 12 of 13 QA items verified live at 402×874; the stability guarantee (an agent occupies the same slot on every run) proven by diffing two different runs — zero movement across all 5 shared agents. Archived. |
| ~~1b~~ | ~~`LAV-13` (UI)~~ | ✅ **DONE 2026-08-01 (`S-LAV-13/MOB-7`, v7.0.41) — off the queue.** The Routing badge sat still through the 10+ second pre-delegation window, so the screen read as frozen at exactly the moment a first-time viewer is deciding whether anything works. `route` joined `PULSING_MODES`; `awaiting` deliberately stays steady (`LAV-1f`). Verified over 125 live samples. |
| ~~1c~~ | ~~`MOB-7` (UI)~~ | ✅ **DONE 2026-08-01 (`S-LAV-13/MOB-7`, v7.0.41) — off the queue.** `LAV-12`'s code removal left mobile nodes showing only a first name; they now carry the agent's role on one line in an 84px box (the ring's geometric ceiling). Truncation verified with real data. |
| 2 | `MOB-6` (Tech Debt) | The mobile decision panel shipped and is code-verified but **cannot be exercised from LAV** — all 303 gates in 30 days come from `data-analysis`, which LAV's 3-question picker never invokes. Post-beta (additive; nothing regressed), but it is the one unverified surface of `MOB-4`. |
| 3 | `MOB-5` (Tech Debt) | Mobile LAV's legend row wraps if more than 3 of the 6 possible edge meanings light at once (~23px slack at 402px). Cosmetic only, deliberately not worked around. Post-beta. **Resolved structurally 2026-08-02 by `LAV-20` (legend vocabulary reduced to exactly 3) — archived.** |

**Still true, and still the rest of this bucket's queue:** CHI and Bench have had **no**
dedicated mobile QA sweep. LAV is now covered; those two are not. **The sweep is still
unscheduled** — greening bucket 3 needs it.

**Device standard, new:** mobile QA runs at **402 × 874 (iPhone 16 Pro)**, locked in
`STYLE-GUIDE.md` §22 (John, 2026-08-01). Before this, the 768px breakpoint was the only
responsive number written down, so each mobile session picked its own test width and the
evidence was not comparable across sessions.

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
| 5b | `LOG-125` (Observability) | **NEW 2026-08-01, found while QA-ing `MOB-4`; measured, not inferred.** ~50 `ai_activity_log` rows in 14 days carry a model-**invented** `agent_id` *and* a model-invented `feature` slug on the display/format leg — ~35 fake ids (`display-agent-001`, `display_primary`, a raw UUID, `store`) against ~30 fake feature slugs. Several carry `call_source:'ui'`, so these are real production turns, not test debris; most recent is today. The AI Audit screen therefore gains ~35 phantom agents and ~30 phantom services, and since §19k parses `intent` from `feature`, all of them are unclassifiable. **This bucket's ship bar is literally "labels aren't invented or hardcoded," so this is a direct hit.** Same class as the `ID Decoys` pattern (`DAT-7`, `AGT-37`) but at scale and on two fields at once — fix structurally at the `logActivity()` write seam, not with another Skill-wording attempt. |
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
| 8 | ~~`LAV-22` (Observability)~~ ✅ | **CLOSED 2026-08-07 (`S-LAV-28b`+`S-LAV-28c`, v7.0.62–63, QA live).** The 2026-08-04 symptom (a completion resolving via internal delegation streams no typed hop — Owen Marsh — The Proofreader invisible) root-caused in two measured halves: the frames WERE streaming (28b's captures: every deep-leg completion present, all as `delegation_return`, zero `delegation_complete`) and the Assembly fold only filled stages on `delegation_complete` — plus the LAV-21d condition could never match a return (no `viaTool`/`toIntentSlug` on returns), so a naive type-union would have been vacuous; 28c's span-parentage pre-pass fixed it generically. Live-verified on John's exact failing run shape: both Eleanor Voss — The Librarian depth-2 legs fill their stages with ✓ and her own account; bucket 5's "≥1 hop" bar now holds for deep legs. The 28b critique-path emit also shipped (dead code against current data — no row sets `critique_capability_slug` — harmless, correct-by-construction). Archive row: `docs/FEATURES-ARCHIVE.md`. | |
| 8 | `CHI-64` (Observability) | Confirmed — and **one root with `CHI-87` + `LOO-26` (bucket 2)**: the mount-path news fetch never seeds `lastEventAtRef`. One fix closes all three rows; consolidation awaiting John. |
| 9 | `CHI-11` (Observability) | The bucket's acceptance audit, run **last** — re-anchored: tags now come from the `ai_call_patterns` view (`tracePatterns.js`), not `patterns_used`. **`AI-52` folds in** (its verification ran 2026-07-28: both hyp intents uniformly write `["rag","structured-output"]`, 190+ rows — per-row legitimacy is this audit's judgment). |
| 10 | `LOG-112` (Observability) | **New 2026-07-28 (`design-chi-90`), same defect class as item 9, one drawer over.** The CHI **Agents** drawer's per-agent pattern breakdown still reads `patterns_used` directly, not the `ai_call_patterns` view. Made visible by `CHI-90`-done: Eleanor Voss — The Librarian's card now reads `1801 CALLS` above a `Rag — (3450 calls)` row, because 1,925 of her 2,411 deterministic `librarian` rows carry legacy `patterns_used`. Sub-rows were never a decomposition of the headline and always sat below it before, so nothing looked wrong until now. **✅ CLOSED 2026-07-29 — shipped v6.3.218 (`S-LOG-112`, `496723c`), QA 13/13, row archived.** John's call on the open question: **deterministic latency does NOT stay visible** — 0 of 4,283 no-model rows are classified platform-wide and never will be, so a proposed "Operations" group was rejected rather than build a parallel display papering over incomplete classification (§19l keeps unclassified an honest gap). Sub-rows now join the Displayer rollup's `log_ids`; all 11 agents matched SQL exactly live, counts and avg latencies. Eleanor Voss — The Librarian 4 rows → 1; 4 agents correctly render none. |

**Likely already fixed — verify, then close:**
`LOG-88` (Observability — `LOG-95`-done shipped both halves the row asks for; residual is
span-write *timing* only, settled by the §19k span-less-delegation count on recent rows),
`CHI-27` (UI — the within-hop reversal was reverted in-code; both levels newest-first).

**Dropped/absorbed:** `AA-179` (blocked ruling deferred post-beta, §4 Q4 — **since shipped
✅ 2026-07-31 outside the beta queue, `S-AA-179a-e` v7.0.8–v7.0.12, John's pick at `LAV-1`'s
close; archived, see `FEATURES-ARCHIVE.md`**), `LOG-103` (dup of
`LOG-71` — **merge confirmed by John 2026-07-28**), `AI-52` (folds into `CHI-11`).

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
