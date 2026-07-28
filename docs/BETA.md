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
undermines the claim of a real (non-deterministic) agentic multi-agent platform**. This is
narrower than `docs/FEATURES.md`'s "Now" criterion — Now holds all CI-page work; beta-gate is
the subset a reviewer on those two surfaces could actually hit or judge.

---

## 2. The five beta buckets (John, 2026-07-28 — CANONICAL)

Restated and settled by John 2026-07-28, superseding the four-bucket list from the 2026-07-24
session (TSR / UX-UI / Anomalies / AI Audit Log — kept in §3's provenance only). Verbatim:

> "The buckets are 1. full 24 regression pass 2. UX/UI is clean for chat, column 2 and the
> user knows how to operate with minimal difficulty, 3. mobile works well, 4. AI Audit Log
> screen is accurate, 5. Agent routing drawer works well, accurate, and all agents are
> displaying at least 1 pattern in their hop - if appropriate. We can ship after that, but if
> we have time, the extra bonus would be to get re-classify patterns below 10K"

| # | Bucket | Ship bar |
|---|---|---|
| 1 | **Full 24-case regression pass** | The CHI true end-to-end regression runbook (`SES-29` (Task Success Rate), `docs/` CHI-TRUE-REGRESSION runbook, 23 questions + case 24 news door) completes clean. |
| 2 | **UX/UI: chat + column 2** | Chat (column 1) and the numbered journey-step drawers (column 2, §19n) are clean, and a user can operate them with minimal difficulty. |
| 3 | **Mobile works well** | The beta surfaces behave well on mobile (`MOB-*` rows). |
| 4 | **AI Audit Log screen is accurate** | What the audit screen renders is true — counts reconcile, labels aren't invented or hardcoded. |
| 5 | **Agent Routing drawer** | Works well, accurate, and every agent displays ≥1 pattern in its hop — where appropriate. |

**Ship rule:** all five buckets green → ship beta.
**Bonus (only if time remains after the five):** get the AI Audit "re-classify patterns"
count below 10,000. Explicitly not a ship-gate.

---

## 3. Execution queue

Provenance: recommended by the 2026-07-23/24 session; **John has not yet ratified the order**
(the session ended before close-out). Statuses refreshed live against `FEATURES*.md` /
`FEATURES-ARCHIVE.md` on **2026-07-28** (`origin/dev` @ v6.3.195). Shipped items are kept,
struck, for continuity with the original lists.

### 3a. General top-5 (2026-07-23 list, refreshed)

| # | ID (Type) | Status 2026-07-28 |
|---|---|---|
| 1 | `HAR-9` (Task Success Rate) | ✅ Done (v6.3.131) — truncation-retry shipped |
| 2 | `CHI-65` (Tech Debt) | ✅ Done — React #31 crash fixed |
| 3 | `CHI-66` (Architecture) | ✅ Done (v6.3.137) — error boundary shipped |
| 4 | `HAR-14` (Task Success Rate) | ❌ **Open** — schema validation is presence-only; §19o answered its open question 2026-07-28 (present-but-empty joins the transient class); still needs its own design session |
| 5 | `AGR-001`/`AGR-002` (Architecture/Data) | ❌ Open, in `FEATURES-LATER.md` (deliberate) — Bench Personnel mock-data landmine ("mock data" tile, fabricated Training-invested dollars). **On the Apple surface — re-tier before send.** |

### 3b. Bucket A — Anomalies (top 10 of 2026-07-24, refreshed)

Ranking principle (from the session): provable falsity outranks uncertain naming; active write
paths outrank frozen history.

| # | ID (Type) | Status 2026-07-28 | Notes |
|---|---|---|---|
| 1 | `LOG-42` (Architecture) | ❌ **Open** | False-`rag` anchor (622+ `agent-selection` rows). **Unblocked** — §19k runtime-signature model decided 2026-07-24; remediation rides `LOG-69`-done's read-time re-derivation, no LOG-42-specific backfill. |
| 2 | `LOG-59` (Architecture) | ❌ **Open** | Two more false-`rag` write sites; pairs with 42/53. |
| 3 | `LOG-53` (Architecture) | ❌ **Open** | `rag` with zero chunk ids; root cause not settled. |
| 4 | `LOG-51` (Architecture) | ✅ Done (v6.3.178, 2026-07-28) | Rename/supersede path + delegation-family adjudication shipped. |
| 5 | `LOG-52` (Architecture) | ✅ Done (v6.3.149) | Susan Smith — Trainer can correct vocabulary entries. |
| 6 | `LOG-47` (Architecture) | ❌ Open | `structured-output` (largest slug) vocabulary destination. |
| 7 | `LOG-48` (Architecture) | ❌ Open | `embeddings` + invented `intelligent-synthesis` term. |
| 8 | `LOG-50` (Architecture) | ❌ Open | Citation quality bar for vocabulary admission. |
| 9 | `LOG-46` (Architecture) | ❌ Open | `tool-use` conflation — unrecoverable history, hide-honestly fix. |
| 10 | `LOG-44` (Architecture) | ❌ Open | What is `agent-delegation` really — largely answered in practice by `LOG-51`-done's delegation-family adjudication; re-scope before scheduling. |

Below the line (still open): `LOG-45`, `LOG-43`, `LOG-62`.

### 3c. Bucket B — AI Audit Log (top 10 of 2026-07-24, refreshed)

| # | ID (Type) | Status 2026-07-28 | Notes |
|---|---|---|---|
| 1 | `LOG-60` (Observability) | ❌ **Open** | By Pattern counts don't reconcile to the raw log — measure before theorizing. NB: `LOG-97`-done (v6.3.191) fixed pattern *costs*; the *count* reconciliation question is this row. |
| 2 | `LOG-38` (Architecture) | ✅ Done (v6.3.155, 2026-07-27) | Layer B — patterns evidence-derived at read time. |
| 3 | `LOG-57` (Architecture) | ❌ **Open — needs John live** | `AI_PAT` hardcoded pattern lists on 8 screens, 3 on Bench (the Apple surface). |
| 4 | `LOG-58` (Architecture) | ❌ **Open — needs John live** | Invented "Structural vs Reasoning" taxonomy; gates `LOG-61`. |
| 5 | `LOG-56` (Architecture) | 🔶 Partial | Hardcoded names in Roadmap/About — one site left (`useAIActivity.js:585` fallback). |
| 6 | `LOG-61` (Observability) | ❌ Open | "Industry Catalog" header literally false — after `LOG-58`. |
| 7 | `LOG-39` (Architecture) | ❌ Open | Routing's own call gets a Layer A fact (task 5 of 7, see `LOG-23`). |
| 8 | `LOG-49` (Architecture) | ✅ Done (v6.3.153) | Remaining Layer A facts shipped. |
| 9 | `LOG-40` (Architecture) | ❌ Open | Migration/cutover decision (task 6 of 7). |
| 10 | `LOG-41` (Architecture) | ❌ Open | Rollup views — the "91.2s across 6 hops" demo story (task 7 of 7). |

Below the line (still open): `LOG-01`, `LOG-22`, `AI-46` (partial), `AI-52`, `CHI-67`, `LOG-27`.
Caveat carried from the session: `LOG-55`'s premise is stale (fold into `LOG-37c`); `LOG-37`
(task 3 of 7) is still the open dependency under the Layer B tail.

### 3d. How the recovered queues map to the canonical buckets

The 2026-07-24 session ranked only its Anomalies and AI Audit Log buckets. Under the
canonical §2 buckets: **3b + 3c both serve bucket 4** (an audit screen showing falsely-tagged
or invented-taxonomy data is inaccurate even when the rendering is right); routing-drawer rows
(`LOG-95`-done shipped the per-hop pattern lines 2026-07-28) serve **bucket 5**; `SES-29`
(Task Success Rate) **is bucket 1** — confirmed by John's own bucket wording. Buckets 2
(chat + column 2 UX) and 3 (mobile) have no recovered ranking and need a row-mapping triage
against the open backlog.

### 3e. Filed since 2026-07-24 — unranked, needs John's bucket/rank call

Open rows only: `LOG-77` (Architecture — signature capture roadmap, item 9 of 9 done),
`LOG-72` (Architecture, partial), `LOG-96` (Architecture), `LOG-100` (Tech Debt),
`LOG-101` (Observability), `LOG-102` (Observability), `LOG-103` (Observability),
`LOG-104` (Data), `AGT-34` (Data), `SES-29` (Task Success Rate — see 3d).

---

## 4. Open items

1. ~~The fifth bucket~~ — **RESOLVED 2026-07-28**: John restated all five canonically (§2).
2. **Ratify or reorder** the refreshed queues in 3a–3c (they are recommendations, not
   decisions), now read as the bucket-4/bucket-5 work lists.
3. **`AGR-001`/`AGR-002`** sit in `FEATURES-LATER.md` but are on the Bench surface Apple will
   see — promote to beta-gate or accept the risk? (Bench is not named in the §2 buckets —
   possibly deliberately, since §1's definition includes "the sub screens under bench.")
4. **Row-mapping triage for buckets 2, 3, and 5** — sweep the open backlog and give each
   bucket its own queue in this file.
