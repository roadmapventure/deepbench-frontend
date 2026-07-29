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

## 3. Per-bucket queues (triage 2026-07-28, `beta-doc-0728`)

Full-row-text triage of every open row in `FEATURES.md` + `FEATURES-NEXT.md` against the §2
buckets (statuses verified same day, `origin/dev` @ v6.3.195). **Order within each bucket is a
recommendation, not a decision** (maintenance rule 3). Everything not listed here or in §5/§6
is Post-beta and stays where it is in the FEATURES files.

### Bucket 1 — full 24-case regression pass

`SES-29` (Task Success Rate) is the bucket itself — the runbook run. Everything below is a
known defect that would break or dirty that run:

| # | ID (Type) | Why it breaks the run |
|---|---|---|
| 1 | `LOO-013` (Task Success Rate) | News flow routes to capability-less Brent — **fails case 24 outright**, drawer stuck. |
| 2 | `CHI-78` (Task Success Rate) | Turns silently stall or throw post-Marcus; 3 of 5 runs affected. |
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
| 16 | `DAT-8` (Tech Debt) | Test-artifact rows inflate Compliance counts a catalog question can surface. *(triage call)* |

### Bucket 2 — UX/UI: chat + column 2

| # | ID (Type) | Defect |
|---|---|---|
| 1 | `AA-153` (Task Success Rate) | Raw HTML tags shown as literal text in the chat answer card. |
| 2 | `CHI-72` (UI) | Genuine block leaks raw triage text and `the_library` UUIDs into chat. |
| 3 | `AA-161` (Speed) | Column 2 charts render in <10% of runs (token budget). |
| 4 | `CHI-47` (Architecture) | Second question discards first answer's evidence; chat pointer links to nothing. |
| 5 | `CHI-85` (UI) | Stray late completion can stamp an old drawer into the new journey numbering. |
| 6 | `CHI-86` (Tech Debt) | Stale news chain writes chat lines and drawer events after Clear. |
| 7 | `MI-53` (Architecture) | Raw unformatted markdown renders in the chat ConfirmationCard (patch flow). |
| 8 | `CHI-19` (Feature) | Answers never name the resolved entity; question and answer read disconnected. |
| 9 | `AA-146` (Task Success Rate) | Missing "Formatted by" byline on the chat answer card. |
| 10 | `MI-70` (Architecture) | Two confidence badges on related cards use mismatched vocabularies. |
| 11 | `CHI-83` (Feature) | Marcus Webb — GEO CSO Expert says "thesis"/"hypothesis" inconsistently in chat. |
| 12 | `CHI-22` (Feature) | Abbreviations never expanded on first use. |
| 13 | `CHI-48` (Data) | Analysis drawer hop-range badge always empty (`hopStart`/`hopEnd` never wired). ⚠️ ID collision — see `SES-30` (Tooling). |
| 14 | `CHI-29` (UI) | Column 2 scrollable content lacks any scroll affordance. |
| 15 | `CHI-26` (UI) | Column 2 duplicates column 1's live status strip. |
| 16 | `CHI-28` (UI) | Column 3 header rename to "Focus Area Audit." |
| 17 | `CHI-62` (Architecture) | Escalate confirmation card would dump raw JSON — reachability unconfirmed, verify first. |
| 18 | `CHI-67` (Observability) | CHI Agent Reasoning drawer mislabels reasoning entries as "patterns." |
| 19 | `MI-41` (UI) | Column 3 drawers blow past the viewport. *(triage call — nearest bucket)* |
| 20 | `LOO-26` (Tech Debt) + `CHI-87` (Observability) | Console errors on every CHI question / on load — devtools assumed open (§1). *(triage call)* |

### Bucket 3 — mobile

**Empty — and that is the finding.** There are **zero open `MOB-*` rows anywhere** (the only
two ever filed are done/archived). Nothing tracked says mobile is broken, but nothing has
tested it either. **Bucket 3 needs a dedicated mobile QA sweep of CHI + Bench to either green
the bucket or populate it** — that sweep is the queue.

### Bucket 4 — AI Audit Log screen accuracy

Absorbs the still-open items of the recovered 2026-07-24 Anomalies/Audit lists (§7) plus new
rows:

| # | ID (Type) | Defect |
|---|---|---|
| 1 | `LOG-60` (Observability) | By Pattern counts don't reconcile to the raw log — measure before theorizing. |
| 2 | `LOG-91` (Observability) | 4,489 paired duplicate rows inflate call counts at the source. |
| 3 | `LOG-104` (Data) | Non-deterministic paging can skip rows — audit totals inexact. |
| 4 | `LOG-102` (Observability) | Fetch failure renders "Patterns Logged 0" as fact — observed live. |
| 5 | `LOG-101` (Observability) | By Pattern renders empty on the rollup timeout (correct data, false display). |
| 6 | `LOG-42` → `LOG-63` → `LOG-59` → `LOG-53` (Architecture) | The false-`rag` family — 63 is the write-path gate that stops new bad rows accruing; 42 unblocked via `LOG-69`-done's read-time re-derivation. |
| 7 | `LOG-48` (Architecture) | Invented `intelligent-synthesis` pattern name + ungoverned `embeddings` slug. |
| 8 | `LOG-56` (Architecture) 🔶 | Zero-call services fall back to declared catalog patterns — one site left (`useAIActivity.js:585`). |
| 9 | `LOG-61` (Observability) | "By Pattern · Industry Catalog" header is factually false. |
| 10 | `LOG-82` (Tech Debt) | Stale hardcoded model ids mislabel model/provider rows. |
| 11 | `AA-177` (Architecture) | `the_reasoning` reads/writes have zero `ai_activity_log` attribution — audit undercounts. |
| 12 | `CHI-15` (Observability) | Two adjacent Audit drawers label unrelated counts "patterns." |
| 13 | `LOG-81` (Observability) | Total Calls/By Agent inflated by non-model ops — needs John's counting decision. |
| 14 | `LOG-01` (Architecture) | Standing end-to-end audit accuracy sweep — run **last**, as this bucket's own QA gate. |

### Bucket 5 — Agent Routing drawer

`LOG-95`-done (v6.3.184/186) shipped per-hop pattern lines for every hop shape; these rows are
what's still between that and "every agent shows ≥1 pattern, accurately":

| # | ID (Type) | Defect |
|---|---|---|
| 1 | `CHI-11` (Observability) | Per-hop AI-pattern tags never audited for accuracy (John's own doubt) — this bucket's acceptance check, run **last**. |
| 2 | `LOG-88` (Observability) | Child hops lack span identity → drawer shows no pattern. |
| 3 | `LOG-71` + `LOG-103` (Architecture/Observability) | Resumed hops/rows lack the config-half → their hop shows no pattern (same family). |
| 4 | `LOG-39` (Architecture) | Routing's own call gets a Layer A fact → routing hops carry a pattern. |
| 5 | `LOG-72` (Architecture) 🔶 | Remaining criteria authoring → pattern coverage for still-unnamed patterns. |
| 6 | `LOO-005` (Observability) | Pre-delegation reasoning never logged; routing card opens with a missing hop. |
| 7 | `CHI-17` (UI) | Michelle Manning — Project Manager's raw unsummarized reasoning dumped into the `agent_selection` row. |
| 8 | `CHI-27` (UI) | Panel reads newest-first and oldest-first simultaneously. |
| 9 | `CHI-24` (Architecture) | Agent-id-only placeholder matching can silently undercount hops. |
| 10 | `CHI-64` (Observability) | News delegation hops resolve null durations + console errors on load. |
| 11 | `LOO-003` (Observability) | Multi-hop delegation reason overwritten — drawer shows the wrong why. *(triage call)* |
| 12 | `AI-52` (Observability) | Verify two legacy intents' `patterns_used` — the "if appropriate" check. *(triage call)* |
| ~~13~~ | ~~`AA-179` (Architecture)~~ | Dropped from beta 2026-07-28 — its blocker `AA-178`'s ruling was deferred post-beta (§4 Q4). |

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
5. **`MI-69` (Architecture)** — hardcoded routing-row narration "looks scripted" (the exact
   anti-claim of §1), but the fix is a screen-wide redesign. Scope call.

---

## 5. Bonus — "re-classify patterns below 10K" (post-gate)

The reclassification population levers, largest first: `LOG-45` (Architecture — 12,679 Group A
old-name rows; needs John's §19i freeze-rule authorization), `LOG-47` (Architecture — 7,606
`structured-output` rows, no vocabulary destination yet), `LOG-46` (Architecture — 5,576
`tool-use` rows, honest-hide precedent), `LOG-44` (Architecture — 2,796 `agent-delegation`
rows; largely answered by `LOG-51`-done, re-scope), `LOG-73` (Architecture — embedding
orphans), `LOG-77` (Architecture — capture-roadmap tail), `LOG-55` (Architecture — likely
already closed by `LOG-37a-patch`, verify then close). Measure the live "needing
reclassification" count first — it shares `LOG-60`'s reconciliation ground.

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
