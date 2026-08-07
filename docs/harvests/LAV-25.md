# LAV-25 harvest — the walkthrough run and what it proved (design-lav-25, 2026-08-04)

The contract itself is `ARCHITECTURE.md` §19s. This file is the evidence: one real run walked
line-by-line with John, plus the failed-run findings around it.

## Run 4 (the clean capture) — question 1, dev cc189ce (v7.0.58 data + v7.0.57 code)

Terminal, no errors: 6 execute calls, 46 SSE frames, 8 routing hops, 4 Assembly stages, 139.3k
tok, $0.18, ~2m45s. Outcome: draft BLOCKED by the gate; failure_triage recommended escalating.

**Story:** Marcus Webb (channel-intelligence/ci-answer-intent) → request_help to Michelle
Manning (roster 22 + knowledge 4 fetches) → delegate_to_agent to Eleanor Voss,
`library-evidence-intent` (catalog 74 + library 10, prompt 46,465 chars d1) → draft (4 citations,
tier "sourced", 49s). Gate: Owen Marsh (qg-review-intent) → Michelle again → Eleanor,
`library-record-lookup-intent` (59,334 chars d2) → draft sent BACK to Marcus twice
(ci-answer-intent d3, revision rounds) → Michelle a 3rd time → verdict: block (weakest-link
confidence-tier violation: 3 consolidated + 1 sourced cited, tagged "sourced") + escalation
recommendation (→ `CHI-99`).

**No `delegation_complete` frame streamed anywhere in the run** — so no "Weighed …" lines, no
completion reasoning reached the console; every request_help/delegate_to_agent resolved through
`delegation_return` only. (The account field's carrier gap — `LAV-22`'s seam.)

**Rail at terminal (verbatim structure):** 8 hops; every delegation START line was replaced
in place by its return ("X is back — wrapping up…" attributed to the returner); Eleanor's two
visits (evidence vs record verification) render byte-identical; hop 6 is two identical "Marcus
is back — wrapping up…" lines — the only trace of two full revision rounds; the same
roster/knowledge fetch pair appears at hops 1/4/7 with a three-pattern "AI patterns used" line
over every row.

**Assembly, 11 distinct states:** Draft ghost from marcus's prompt frame (+4s) → Evidence
founded by michelle's briefing fetches (+8s) → Eleanor's evidence in an UNLABELED ghost
("Take the data-room-custody work." — `library-evidence-intent` absent from `STAGE_OF_INTENT`)
(+21s) → Draft fills "4 citations · confidence sourced" (+45s) → Verification ghost (+49s) →
michelle + eleanor gate fetches correctly nest under it by span parentage (+53/73s) → a SECOND
Draft ghost from the revision delegation (+85s) → terminal: revision ghost dropped, **Eleanor's
unlabeled evidence ghost dropped WITH her real 74+10-chunk fetches**, cap "QUESTION ANSWERED ·
BUILD COMPLETE" over a blocked answer. Terminal "Evidence" = briefing plumbing only.

## Runs 1–3 (failed, evidence for SES-74 and the timeout finding)

All three died before terminal on 2026-08-04 while `S-LAV-23`'s coding session was mid-flight —
its `library-evidence-intent` Skill row landed in Supabase (05:28 UTC) ~1h before its close-out
reached dev, so live runs took a half-migrated path. Runs 2/3 died identically: server-side
"The operation was aborted due to timeout" (500) inside Eleanor's depth-2 library call
(prompt ~45.9k chars), streamed as a terminal `error` frame mid-continue. Run 1's tail died
client-side (browser-pane network suspension — environment, not platform). Post-close-out run 4
was clean; the timeout did not recur. Assembly showed "QUESTION ANSWERED · BUILD COMPLETE" on
all three failures (→ kickoff T2's error cap).

## Decisions John made in the walkthrough (all now in §19s)

1. Assembly's in-stage content becomes the agents' own narration (per-Intent Skill instruction +
   required output-schema field, same call, no second model call); templates survive only as
   chrome + degrade. Approved against the tagged mock (real skeleton, illustrative 🔵 wording).
2. Briefing fetches out of Assembly; Library evidence into a labeled Evidence stage.
3. Revision rounds nest under the filled Draft — never a second Draft section.
4. Terminal cap keyed on the real end state (3 locked strings, kickoff T2).
5. Routing rail untouched (beta-shared copy); routing irritants split to `LAV-27`.
6. Narration is never signature/classification input (model must not grade its own homework).

## Deltas awaiting nothing / follow-ups filed

`LAV-26` (narration Skill content), `LAV-27` (routing irritants), `CHI-99` (confidence-tier
metadata gap, beta-gate bucket 1), `SES-74` (data-live-before-QA process gap). `LAV-17`'s
requirements re-measured by this walkthrough: carry task words on delegation starts (verified
absent today — run 4 start frames carry no `task` key), carry `account` on completions, record
titles for Evidence cards; `LAV-22` is the missing typed-hop carrier for delegated resolutions.
