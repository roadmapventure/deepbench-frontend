<!-- DeepBench v7.0.974 | docs/research/2026-11-07-weekly-market.md | The Researcher, capability
     research-class-lens, run kind weekly-market-review, run 2026-11-07.
     Window 2026-10-31 to 2026-11-07 (ISO week 2026-W45).
     PLAYBOOK RUN: docs/runbooks/researcher-routine.md is on origin/dev, so its Steps 0-5 were
     followed in place of the live routine's INTERIM text, as that interim paragraph instructs.
     Three places where the playbook and the live prompt differ mattered this run: Step 3 ingests
     proposals into the findings ledger rather than listing them only; the playbook's prompt block
     names public.apply_claim_recheck() and the live text does not; and the live text still carries
     the SES-369 "filing gate is shut" sentence, which remains true and was obeyed.
     METER: ok -- 22% against the 28.57% Saturday ceiling, 6.6 points of headroom.
     LENS: P2 and P3 tie at 0 ratified (137 vs 135 proposed), so NOT a full tie -- fewest proposed
     breaks it and the lens is P3 - Investor Value, for the FOURTH consecutive run. The gap widened
     from 1 claim last week to 2.
     NAPKIN: 42 rows matched the due filter; exactly 1 was genuinely unresearched and was researched
     and written. The other 41 carry current notes and re-qualify only because of a 2026-10-17
     metadata touch of updated_at -- AGT-577, already open, is that filter.
-->

# Weekly Market Review — 2026-11-07 (week 2026-W45)

**Lens:** P3 — Investor Value, fourth consecutive run. **Window:** 2026-10-31 → 2026-11-07.
**Filing gate:** shut (`SES-369`). `file_invention_proposal()` was not called.
**Proposals reach the Development Manager through the findings ledger**, per the playbook's Step 3.

---

## The three facts that frame this run

**1. I could read one vendor page this week, and it had two wrong facts on it.**

This environment's outbound fetch is domain-allowlisted and the allowlist is narrow. Measured
directly on 2026-11-07, one request per host:

| Host | Result |
|---|---|
| `claude.com` | 200 |
| `www.anthropic.com` | 200 |
| `raw.githubusercontent.com` | 301 (reachable) |
| `github.com` | 400 (reachable) |
| `www.sec.gov` | no DNS |
| `docs.netskope.com` | no DNS |
| _(one further vendor host, withheld — it names a private Napkin idea's subject)_ | no DNS |
| `www.hostinger.com` | no DNS |
| `www.sia-partners.com` | no DNS |

Anthropic's own properties and GitHub resolve. **No vendor host does.** That single fact explains
the shape of the whole competitor set: the 2026-11-04 scan recorded that
`raw.githubusercontent.com` "was the only vendor host that resolved from here this run, so this is
the one record in the set read at a primary source," and every other record in the fortnight rests
on dated search text with an explicit UNVERIFIED flag.

It is not a cosmetic limitation. `claude.com/pricing` was inside the allowlist, so I opened it —
the one primary-source read available to me — and **two facts in the matching record were wrong**
(below, §"Where I contradict the records"). One page, two errors. The unverified rate across the
rest of the set is therefore a measure of unexamined risk, not of diligence.

`AGT-324` is open and already carries this, filed in `2026-W40` and again in `2026-W42`. I have
**not** re-filed it; what is new is the exact host list above, which an implementer can act on.

**2. Twenty-one tickets shipped and not one was buyer-visible — the third consecutive measured week.**

| Class | Count |
|---|---|
| P9 — Bug Fixes | 13 |
| P10 — Tooling | 6 |
| P6 — Agent Enhancement | 1 |
| P9 — Bug Fixes (Architecture) | 1 |
| **P1–P4** | **0** |

Twelve were `victoria-placed`, nine `john-named`; every row is type Tooling except `AA-169`. Under
the P3 lens this is the standing question and it has not moved: three measured weeks of delivery
with nothing an outside reviewer could open. Last week's report said the same of its seven, and the
week before of its five.

Two of this week's rows are worth naming because they are this routine's own plumbing and both were
used here: `AGT-566` (delivered 2026-11-03) stops a corrected fact rendering back into the
marketing prompt, and `AGT-444` (delivered 2026-11-07) makes a ruling attach the filing it claims.

**3. The platform priced an answer for the first time this week — and the record that says it cannot is now wrong.**

A `feature_signal` filed 2026-11-04 reads "cost_usd is NULL on every model-call row, so the price
conversation has no number." Queried 2026-11-07: **`cost_usd` is non-null on 205 of 68,547 rows**
(0.3%), the first dated **2026-06-08**, totalling $9.14 ever recorded. In the seven-day window, 11
of 1,248 turns carry a cost.

The genuinely new part landed inside this window. On **2026-11-06** six capability turns on
`claude-fable-5-1` each recorded their own cost — $0.1804 to $0.2801, **$1.3159 together** — with
input and output tokens on the same rows. On 2026-11-04 five more did, across `claude-sonnet-4-6`,
`claude-fable-5-1` and `text-embedding-3-small`.

So the executor *can* price a turn and on at least one lane now does. What remains true is the part
that matters to a buyer: 99.7% of turns carry no cost, every priced row arrived through
`call_source` `mcp`, and **nothing totals cost per ticket or per deliverable**. "We cannot price a
turn" is now falsifiable from the table in one query. "We cannot price a deliverable" is still true.
That distinction is the difference between asking for instrumentation and asking for coverage plus
a rollup, and it is why I corrected the record rather than softening it.

---

## Napkin — ideas reviewed this run

The due filter (`researched_at` NULL or older than `updated_at`, excluding `done` and `parked`)
returned **42 rows**. It should have returned 1. **Ids and verdicts only — this repository is
public and the ideas are not.**

| Idea id | Verdict |
|---|---|
| `n_c2d62798af5e4658badc211a91bbbdd6` | GO DEEPER |

**Why one and not forty-two.** Of the 42, exactly **one** had never been researched (`research_note`
empty, `researched_at` NULL, created 2026-11-06). The other **41** all carry research notes written
between 2026-09-26 and 2026-10-17 and re-qualify for one reason: a metadata write on
**2026-10-17** between 14:52 and 15:15 UTC bumped `updated_at` on 41 rows without changing any idea.
Since the rule compares `researched_at` to `updated_at`, every one of them is permanently due.
`AGT-577` is open and is exactly this filter; last week's run filed it and researched its own 7
genuine rows on the same reasoning. I did not re-file it.

**A second defect in the same filter, not previously recorded.** A `nathan_note` write does **not**
touch `updated_at`. Twenty-nine of the 42 rows carry a `nathan_note` newer than their
`researched_at` — four of them written 2026-11-04, inside this window — and **none** of those notes
would have made its idea due on its own. So the filter is wrong in both directions: it re-opens
ideas nothing changed, and it stays silent when a second writer adds real material. That belongs
with `AGT-577` and is named in the findings below rather than filed as a separate ticket.

**The one idea researched this run, stated without its content.** Its verdict is GO DEEPER and the
deciding question is in its private `research_note`, where you read it. Two things about it are worth
your attention at this level, because neither is the idea:

1. **It resolved a licensing constraint that two other standing ideas are blocked on.** The research
   found that the vendor the idea concerns now owns the licensor of a reference dataset two earlier
   Napkin verdicts named as their blocker. That is a single conversation, not a build, and it is the
   cheapest thing on the Napkin right now.
2. **Half of it is crowded and half is open.** One half competes with the named vendor's own core
   product and is not a gap; the other half is a category with real commercial vendors but **no
   public-sector-specific tool found**, which is the open space. The verdict reflects that split
   rather than averaging it.

The market evidence behind both, with its sources and dates, is in the private note. None of it was
read at a vendor page — the hosts do not resolve from here (fact 1) — so all of it is cited there as
dated search text.

---
## Where I confirmed, and where I contradict, the week's market records

Sixty-two `market_records` rows were written since my last run (2026-10-31): 14 competitor, 14
feature_benefit, 5 feature_signal, 13 objection, 12 release_note, 1 ip_asset, 3 Grok/Hazel
back-fills. I treated every one as a lead and re-checked what was checkable. **Five rechecks were
written through `public.apply_claim_recheck()`** — the handle the playbook's prompt block names and
`AGT-470` shipped on 2026-10-25. Each writes a before-image and one reversible decision; a
`corrected` verdict retires the wrong row and files a same-kind replacement carrying `supersedes`.
I wrote nothing to `market_records` directly.

### Corrected (2)

**1. The Claude Team seat — two wrong facts, and the comparison moves the wrong way.**
Record: *"Do-it-yourself: agents built inside your own Claude account."* Its 2026-11-04 body said
`claude.com` did not resolve, that third-party guides split the Team seat between **$25 and $30 per
user per month with a five-seat minimum**, and closed: *"treat Team as unverified until someone opens
the vendor's own pricing page."*

I opened it. Read at `https://claude.com/pricing` on 2026-11-07:

| Plan | Published price |
|---|---|
| Pro | $17/mo on annual ($200 up front); "$20 if billed monthly" |
| Max | $100/mo |
| Team — standard seat | "$20 Per seat / month if billed annually. $25 if billed monthly" |
| Team — premium seat | "$100 Per seat / month if billed annually. $125 if billed monthly" |
| Team size | "For teams of 2 to 150" |

**The $30 figure is not on the page at any billing period.** **There is no five-seat minimum** — the
floor is two. Pro and Max both hold as recorded. (The $200/20x Max tier the record also carried was
not visible in what I read, so it should not be cited to this page.)

This makes the do-it-yourself path **cheaper** than the record had it: two seats at $20 annual is
$40/month against an implied five seats at $25–$30. Any pitch priced against the old number is
priced against a switching cost three seats too high. Decision `104bbb88`; the old row is retired
and the replacement carries `supersedes`.

**2. The per-answer cost signal — overstated as an absolute, and overtaken by this week's own data.**
Record: *"No per-answer cost exists: cost_usd is NULL on every model-call row."* Measured
2026-11-07: non-null on **205 of 68,547 rows since 2026-06-08**, and six capability turns priced
themselves on 2026-11-06 (fact 3 above). Corrected to the accurate shape — 0.3% covered, one lane
priced, no per-deliverable rollup — because a claim a reviewer disproves in one query costs the
whole set its credibility, and because the accurate version is the sharper ask. Decision `ef6210c4`.

### Holds, confirmed rather than assumed (3)

**Workday / C1.ai.** Record: definitive agreement 2026-10-12, not closed, terms undisclosed, close
expected Q4 FY2027 ending 2027-01-31. Re-checked against the Workday 8-K text on 2026-11-07:
**every particular holds**, and no report of a close since. The record cites `sec.gov` as a primary
source; `www.sec.gov` does not resolve from here, so I confirmed via the filing's indexed text, not
by opening it. Decision `7950c6a9`.

**Microsoft Agent 365 at $15/user/month.** Record's core distinction — the $15 is Agent 365
standalone, not Copilot — **holds**. Two facts to add rather than correct: it is licensed **per user,
not per agent**, and **agent runtime is metered separately under Copilot Studio on top** of the $15.
GA 2026-05-01; also available inside Microsoft 365 E7 at $99/user/month. Both additions weaken the
"Microsoft already governs agents and the seat is cheaper" objection more than the record does: the
$15 sits on top of a qualifying base license and does not cover the consumption. Decision `08e7423b`.

**Caller attribution.** Record: "770 of 880 connector servings last week named no caller." Re-measured
over my own window to 2026-11-07: **388 of 455 `mcp` servings (85.3%)** carry neither `visitor_id`
nor `caller_ip`, and **1,049 of 1,248 logged turns (84.1%)** name nobody. Different window, same
ratio — it holds. One thing to add: there was **no `ui` call at all** in the seven days. Decision
`e6ae4571`.

### Left unresolved, and honestly so

The 2026-11-04 scan flagged four claims it could not reach a source for. I could not reach them
either — the hosts do not resolve from here (fact 1) — so they stay flagged rather than being
promoted on secondary text:

- **Sia Agent Store**: 800+ agents (2026-04-14 release) versus the company's own later "over 1,000"
  headline. Nothing reconciles them; the record's instruction to quote 800+ as sourced and name
  1,000 as the company's unconfirmed figure is the right handling and I did not change it.
- **Meta Muse for Small Business**: whether the bundle is seat-counted. Still unverified.
- **Virtana Agentic Observability Enterprise Management** (announced 2026-10-28): nothing read at
  source. Its A2A-plus-MCP agent-to-agent orchestration is the in-window item most likely to come up
  in a technical review, and it is the one I can say least about.
- **Netskope AgentSkope credit rollover**: stated on no page found.
- **Hostinger Agent**: the record's own UNVERIFIED flag was right and is now weaker still. The
  seven-specialist $6.99 bundle is a **launch** price that Hostinger's own September 2026 update says
  no longer describes the product, and dated sources disagree on whether it is **$6.99 or €6.99** —
  a currency ambiguity the record did not carry. Not corrected, because correcting it would mean
  replacing one unverified figure with another; reported here instead.

**A note on the method, since it recurs.** Four of the five rechecks above were possible only because
the claim could be tested against something inside the allowlist (Anthropic's own page) or against
DeepBench's own tables. The competitor set's accuracy is therefore bounded by a network policy, not
by effort — which is the argument for `AGT-324` and the reason I measured the host list precisely.

---
## How this run was performed

**Step 0 — meter, clone, drift.** `public.routine_meter_ok()` returned `ok = true`, 22% against the
28.57% Saturday ceiling, reason `ok`. Branch `session/researcher-20261107` off `origin/dev` at
`1e17228`. `node scripts/check-routine-prompt.js --routine=researcher` exited **1**, naming
`docs/runbooks/researcher-routine.md:23` — the live routine still runs its 2026-09-25 INTERIM text
plus John's 2026-10-17 STEP 0 meter block, against the playbook's canonical block. The playbook's
own paragraph says this exit is **expected** until John runs the `RemoteTrigger update`, and
`AGT-517` is open for the half of it that is a real gap (the canonical block does not carry the
meter stop). Not a stop, not re-filed.

**No `runner_cycles` row and no version claim** — this is not a builder cycle. Every ledger write and
every before-image this run carries the session name `researcher-2026-W45`.

**Step 1 — the Napkin, first.** One `UPDATE` scoped to one id, touching exactly `research_note` (594
characters, under the 600 ceiling) and `researched_at`. `text`, `status`, `note` and `nathan_note`
were not touched. `updated_at` was deliberately **not** written: there is no trigger on the table, and
bumping it is precisely what created the 41-row sweep this report describes.

**Step 2 — the market leg.** The prompt was assembled only through
`node scripts/agent-prompt.js --agent=researcher --capability=research-class-lens
--intent=rs-research-intent --prior-proposals=researcher:weekly-market --task-file=<file>`, never by
hand — 25,431 bytes rendered, on the model that command printed: **`claude-fable-5-1`**, the judgment
lane. Run as **one** sub-agent with web search. `--prior-proposals` returned this lane's three
already-filed proposals (`AGT-323`, `AGT-297`, `AGT-579`), which the turn was told to drop rather
than re-propose. `egress` was reported `ok` — search works here; see fact 1 for what fetch does not.

**Lens arithmetic, shown.** P1 has 7 ratified and P4 has 1, so both are out. P2 and P3 both have **0**
ratified — a tie, but not a *full* tie, so fewest proposed breaks it: P3 at 135 against P2 at 137.
Lens is **P3 — Investor Value**, the fourth consecutive run. Worth noting for whoever reads the
sequence: the margin was 1 claim last week and is 2 now, so P3 will keep winning this tiebreak until
something ratifies in either class, and nothing has ratified in either since the census began.

**Step 3 — proposals reach the intake; nothing was filed as a ticket.** `SES-369`'s filing gate is
shut and `public.file_invention_proposal()` was **not** called, nor was `public.invention_due()`
acted on beyond reading `allowed = 2`. Proposals were ingested as findings through
`scripts/audit-ledger.js`, which is where the Development Manager rules on them.

**Five rechecks, not direct writes.** `public.apply_claim_recheck(NULL, 'researcher-2026-W45', …)`
five times — two `corrected`, three `holds`. Decisions `104bbb88`, `ef6210c4`, `7950c6a9`,
`08e7423b`, `e6ae4571`. Each carries a before-image and is reversible by its own handle. No `UPDATE`
touched `market_records` or `vision_claims` directly.

**What I did not do.** No push, email or Slack (the routine's three notification switches are all
`false`). No `agents.is_active` or routine flipped, created or edited. `career_records` not read.
No personal fact written into this repository — the Napkin section above carries ids and verdicts only.

**Token split not logged.** The sub-agent's input/output token counts are not available to the
orchestrating session, so the `ai_activity_log` row for this turn records no split rather than a
fabricated one. That is the standing `2026-W42` finding ("a sub-agent turn cannot log its own token
split"), already ticketed; the three runs before this one recorded NULL for the same reason.

---
## The week's market — what actually moved

The pass ran 18 searches, reported `egress = 'ok'`, and returned **one** survivor against an
`allowed` of 2. Fewer than permitted is the honest answer here and I am keeping it: four of its five
shortlisted candidates were killed for stated reasons, three of them because the thing was already
on the board or already barred.

**On DeepBench's own shape, nothing launched this week.** The in-window items are Virtana's AOEM
(2026-10-28 — cross-vendor agent teams over A2A plus MCP, select customers now, GA Q1 2027, no
pricing published anywhere) and, as background rather than news, Claude Code routines. Neither is a
rival for this buyer; the Virtana item matters only as the agent-to-agent-over-an-open-protocol
example a technical reviewer is most likely to raise.

**Where the market has moved is in how AI cost is expected to be shown, and it has moved toward us.**

- **A dated price sheet beside the usage row is becoming the open standard.** FOCUS 1.4 was approved
  2026-06-04; FOCUS 1.5 — roadmap December 2026 — adds native AI token tracking and a **Price Sheet
  dataset** (Flexera FinOps X recap; SiliconANGLE 2026-06-08). One secondary source places token
  tracking in 1.4 and is treated as the outlier.
- **Pricing at query time rewrites history.** A 2026-05-01 attribution guide names the failure
  precisely: pricing from the latest list restates last month and makes the invoice irreconcilable.
  The named fix is a versioned price table keeping the rate that applied at each call's timestamp.
- **The biggest LLM cost errors are measurement errors, not usage** — double-logged calls,
  double-counted cached tokens, model names matching no price entry, and trackers that know only
  input/output rates mispricing models with cached and reasoning tiers (Langfuse, undated page).
- **The provider treats its own bill as the ledger of record.** Anthropic's cost report is daily-only
  and revisable for up to 30 days, and a Spend Limits Admin API shipped 2026-07-02. This is why the
  "reconcile our ledger to the provider's invoice" idea is barred rather than merely unbuilt.
- **Per-run cost shown to the user is now table stakes in coding agents.** Devin exposes per-session
  ACU cost to any user via Session Insights. That is the shape of the *held* cost-per-deliverable
  payload — which is why a "cost receipt on the answer" was killed as a re-coat rather than proposed.
- **And the white space is unchanged.** Datadog, Honeycomb, Grafana, Vantage and Finout all sell
  Anthropic cost visibility as a **developer bolt-on behind an Admin key**. Searched again this week
  and still not found: an agent-workforce product that shows its buyer, in-product, the rate each
  call was priced at.

**The job-posting leg, substituted honestly.** Postings are the P1 pull test, not P3's, so the pass
used the nearest hired-for discipline instead of pretending otherwise: a Director, FinOps and AI
Cost Engineering posted 2026-07-11 ("not a traditional cloud cost management role"), and FinOps
Foundation listings asking for token-based LLM pricing and unit-economics modelling per transaction,
agent or product. Cost lineage is a director-level discipline in 2026.

**One market-record flag the pass did resolve.** Sia's "over 1,000" rests on a **single
French-language release**; every English and Italian source says over 800 (BusinessWire 2026-04-09).
That is exactly what the existing record already instructs, so it stands unchanged and is now
better evidenced. Meta Muse and the Netskope rollover question surfaced nothing new and stay flagged.

---

## Proposals for The Development Manager

**The filing gate is shut (`SES-369`) and `file_invention_proposal()` was not called.** All three rows
below entered `public.audit_findings` for `2026-W45` under `found_by` `researcher:weekly-market`
through `scripts/audit-ledger.js --apply`, attributed to session `researcher-2026-W45`. The ledger
printed: **`ingest 2026-W45: 3 findings, 3 new, 0 seen, 0 recurring, 0 ruled-out`**. The `researcher`
row in `finding_routes` (precedence 30, `project_slug` NULL) routes them to your own pick of project.

### 1. Proposal — Every dollar names its rate (P3, 1 cycle)

A dated price sheet, the rate row stamped on every priced ledger row, and one derivation shared by
the IP gate and the AI Audit. The mechanism: `effective_from`/`retired_at` on `public.model_pricing`
(or a versions table) plus a nullable `pricing_row_id` on `ai_activity_log` stamped at write;
`get_ip_stats()` prefers the stored `cost_usd` and otherwise prices at the rate in force at
`created_at`; the AI Audit row detail renders the rate and the sheet date. An unpriced row reads
**"unpriced"**, never `$0`.

Why it is P3 and not a dashboard: `model_pricing` is `(model, input_per_1k, output_per_1k)` keyed on
model with **no effective dates**, so no row can say which rate applied when; and `get_ip_stats()`
recomputes from the **live** table using flat 1.25x/0.10x cache multipliers while `shared/models.js`
carries per-model cache-read rates SQL has no column for. The same row therefore yields two dollars
by construction on cache-read tokens, and the first rate change restates every gate dollar in
history while frozen rows stand still.

**It cleared the anti-P3 clause** (`VC-EXIT-026`) because it changes what a priced row *is* in the
data model rather than adding a view over existing numbers. Serves `VC-SYN-001`, `VC-EXIT-021`,
`VC-EXIT-012`, `VC-EXIT-025`.

**The pass's own honest risk, which I am passing through rather than smoothing:** the cache-rate
disagreement half is defect-shaped and you may well class it P9. The dated sheet and the
rate-on-the-row are the part that makes it P3.

**And one correction I attached to it.** The proposal's premise says rows "carry a `cost_usd` frozen
at write time." Measured 2026-11-07, that is about **2% true on the one lane it fires at all** — see
finding 2. This makes the ask more urgent, not less: there is almost nothing yet to attach a rate to.

### 2. Defect — write-time cost pricing reaches about 1% of turns, and the largest lane is unlabelled

`cost_usd` is non-null on **205 of 68,547** rows all-time (0.3%), first dated 2026-06-08. By lane,
all-time: `call_source` NULL **44/55,758 (0.08%)**, `mcp` **82/4,862 (1.69%)**, `ui`
**66/4,346 (1.52%)**, `session` **0/2,477** (zero by design — subscription, no API dollars), `script`
13/43. In the last seven days: **11 of 1,034** non-session rows priced (**1.06%**), and **579 of the
week's 1,246 rows carry no `call_source` at all** — the single largest lane, which therefore cannot
even be classified as API-dollar or subscription.

This contradicts the code's apparent intent (`lib/activity-log.js` prices every row at write since
`LOG-149`) and it is **not** explained by the session-rows-are-NULL-by-design rule, which accounts
for only 2,477 of roughly 68,300 unpriced rows. The research pass read the code, reached the opposite
conclusion, and said plainly that it could not re-measure without database access; I measured, and
the data wins.

**Recommended order, on John's own ruling.** `AGT-250` says do not stack a feature on something
unknown that is broken. Find out why the write-time price is not being stored *before* building rate
lineage on top of it. `AGT-249` is already open on the neighbouring hole — `settle-ship` leaves
`runner_cycles.api_cost_dev_usd` NULL — so the per-cycle cost is broken today too. Same cost surface,
three holes.

### 3. Defect — the Napkin's due filter is wrong in both directions

`AGT-577` is open for the half that over-selects. The half that **under**-selects is new: a
`nathan_note` write does not touch `updated_at`, so a note from the second writer never makes its
idea due on its own. Twenty-nine of the 42 due rows carry a `nathan_note` newer than their
`researched_at` — four written 2026-11-04, inside this window — and every one of those rows has an
`updated_at` *earlier* than the note. Suggested shape: key the rule on
`greatest(updated_at, nathan_noted_at)` against `researched_at`.

### Killed, with the reason, so they are not re-proposed next week

| Candidate | Why it did not survive |
|---|---|
| Factory unit cost per delivered ticket | `AGT-249` (open) leaves `api_cost_dev_usd` NULL, so the base is known-broken — `AGT-250` forbids stacking on it. Fix `AGT-249`; this then becomes one view. |
| Per-run cost receipt on the answer (Devin style) | It is the **held** cost-per-deliverable payload in a new coat; the lane's 2026-10-17 ruling bars re-coating a held item. Release the held payload instead. |
| A rights column on the deliverable | Ownership is set by contract and copyright may not subsist at all — an administrative expectation (pattern 137) belonging to `DL-09`'s marketplace design. |
| Agent jobs on a cadence | Buy-pull by function (`VC-ROOT-004`) and already filed as `AGT-604` (P4, 2026-11-04). |
| Sign-in for the NDA objection | Pattern 137; the readable-knowledge half is `AGT-438` (P9, open). |

**Dropped as already on the board**, via `--prior-proposals`: bundle identity → `AGT-323`; caller
identity on servings → `AGT-297`; locked claims bound to live checks → `AGT-579`. **Barred:** ledger
reconciled to the provider's bill (refused at filing twice; the lane's own rulings bar a third
return). That flag working is worth noting — `AGT-504` shipped the `--prior-proposals` read on
2026-10-31 and this is the first run where it demonstrably stopped three re-proposals.

**The pacing point, repeated because it has not changed.** The P3 shelf already holds six open,
unbuilt tickets (`AGT-72`, `AGT-73`, `AGT-74`, `AGT-302`, `AGT-323`, `AGT-579`), and the window
delivered 21 tickets with zero P1–P4 for the third consecutive measured week. A seventh row does not
fix a shelf nobody draws from. The one proposal above is filed because it is a single cycle and it is
the precondition for every cost number the shelf already promises.

---
## Appendix — the `research_doc` returned by the pass, unedited

The pass reported `lens: "P3 - Investor Value"`, `egress: "ok"`, 19 findings (13 market, 6 usage),
5 shortlisted, 1 survivor, and the account *"Ran eighteen web searches, read repo pricing code,
shortlisted five."* Its research document follows verbatim. Where it disagrees with the body of this
report — specifically on whether `cost_usd` is written on every row — the body's measurement stands
and the disagreement is named in both places on purpose.

<!-- DeepBench | docs/research/2026-11-07-weekly-market.md | The Researcher, capability research-class-lens, run kind weekly-market-review, run 2026-11-07. Window 2026-10-31 to 2026-11-07 (ISO week 2026-W45). Lens P3 - Investor Value, fourth consecutive run (P2 137 proposed vs P3 135, both 0 ratified). egress ok: WebSearch worked for all 18 queries; WebFetch was not used because the orchestrator measured it domain-narrow, so every market source below is cited as search text unless it says otherwise. No database access this run: the usage leg is the task context plus the worktree's code and backlog snapshot. -->

# Weekly Market Review - 2026-11-07 (week 2026-W45)

**Lens:** P3 - Investor Value. **Window:** 2026-10-31 to 2026-11-07. **Allowed:** 2. **Returned:** 1 survivor.

## The pitch

A skeptical reviewer picks any priced row in `ai_activity_log` and recomputes its dollar from the row alone: tokens times the rate row it names, under a price sheet with a date on it. The IP gate and the AI Audit read the same stored figure instead of deriving it twice. Today neither is true. `public.model_pricing` is `(model, input_per_1k, output_per_1k)` keyed on `model` with no effective dates (`docs/design/agt-142-model-catalog.sql:18`). Rows carry a `cost_usd` frozen at write time from `shared/models.js` (LOG-149, v7.0.450) but not the rate they were priced at. `get_ip_stats()` recomputes spend from the live table with flat 1.25x/0.10x cache multipliers (`docs/ARCHITECTURE.md` section 19t), while the JS book carries per-model cache-read rates (Fable 5.1 at $0.25/MTok) that SQL has no column for (`scripts/sync-model-pricing.js` header, v7.0.877). So the same row yields two dollars by construction on cache-read tokens, and the first rate change restates every gate dollar in history while frozen rows stand still, with no record of which rate applied to which row.

This is the sentence in `VC-SYN-001`: investor value is a reviewer confirming from the product *where a number came from*. It is `VC-EXIT-021`'s "costs that reconcile - diligence trust dies on one wrong number". It is not the barred bill-reconciliation (ledger to Anthropic's invoice), not the held cost-per-deliverable payload (a cost line per deliverable), not LOG-149 (which froze the price and did not name it), and not AGT-531 (re-running the JS mirror). It is the lineage on the rows those three would sum.

Cheapest variant: one migration dating the price sheet (`effective_from`/`retired_at`, or a `model_pricing_versions` table) and adding a nullable `pricing_row_id` to `ai_activity_log`, with the explicit public SELECT grant the column-grants rule requires; `lib/activity-log.js` stamps the rate row it priced from; `get_ip_stats()` prefers stored `cost_usd` and otherwise prices at the rate in force at `created_at`; the AI Audit row detail renders rate and sheet date. An unpriced row reads **unpriced**, never $0 (`VC-REJECTED-017`, `VC-INVAR-015`). No model call anywhere (`VC-REJECTED-007`). One cycle.

Honest risk: the cache-rate disagreement half is defect-shaped and the Development Manager may class it P9. The dated sheet and the rate on the row are the mechanism that makes it P3, and they are what a diligence architect would ask for first.

## What the market says (live, dated)

- **The provider treats its bill as the ledger of record.** Anthropic's Usage and Cost Admin API returns daily cost buckets that can be revised for up to 30 days, and a Spend Limits Admin API shipped 2026-07-02 with org and per-user caps (search text: dev.to/claudeguide, ecorpit.com; the platform.claude.com page was not read at source this run).
- **A dated price sheet beside usage is becoming the open standard.** FOCUS 1.4 was approved 2026-06-04; FOCUS 1.5, roadmap December 2026, adds native AI token tracking and a Price Sheet dataset ([Flexera FinOps X 2026 recap](https://www.flexera.com/blog/finops/finops-x-2026-recap); [SiliconANGLE 2026-06-08](https://siliconangle.com/2026/06/08/ai-token-economics-focus-specification-updates-finopsx/)). One secondary source places token tracking in 1.4 and is treated as the outlier.
- **Pricing at query time rewrites history.** A 2026-05-01 attribution guide names the failure exactly: pricing from the latest list restates last month and makes the invoice irreconcilable; the fix is a versioned price table keeping the rate that applied at each call's timestamp (amtocsoft.blogspot.com, search text).
- **Measurement, not usage, is where LLM cost goes wrong.** Langfuse's cost-management page (undated, surfaced 2026-11-07) lists double-logged calls, double-counted cached tokens, model names matching no price entry, and trackers that know only input/output rates mispricing modern models.
- **The market sells this as a developer bolt-on, not to the buyer in-product.** Datadog (per-user cost data from 2026-01-01, 1-3h latency, Admin key), Honeycomb, Grafana, Vantage and Finout all integrate the Admin API (docs.datadoghq.com, honeycomb.io, search text). Searched and still not found: an agent-workforce product that shows its buyer the rate each call was priced at. That is the `C-MAP-18` whitespace, unchanged since 2026-09-11.
- **Per-run cost shown to the user is table stakes in coding agents.** Devin exposes per-session ACU cost to any user via Session Insights (Fast.io guide, reviewed July 2026; docs.devin.ai); Manus sells credits with no upfront task cost. This is what the *held* cost-per-deliverable payload answers; it is not re-proposed.
- **Investors now ask for inference-adjusted margin.** Vendor guides list inference-adjusted gross margin and a falling token-cost-per-active-user as 2026 seed-stage diligence metrics, citing ICONIQ at ~52% AI gross margin against 70-85% SaaS (hub.causo.ai, undated 2026; secondary, figures do not reconcile across sources).
- **What the skeptical reviewer actually tests.** Gartner's ~130 genuinely agentic vendors is a June 2025 *estimate*, not a product test (pymnts.com, appstudio.ca); its tests are autonomy with a verifiable record, decision logging, and a kill switch.
- **In-window launches:** none on DeepBench's shape. Virtana AOEM (2026-10-28, HPCwire/SiliconANGLE/vmblog) is A2A plus MCP cross-vendor agent teams, select customers now, GA Q1 2027, no pricing anywhere. Claude Code routines (2026-04-14, tessl.io 2026-04-16) are the context for AGT-604, already filed P4.
- **Market-record flags:** Sia's over-1,000 rests on a single French-language release; every English and Italian source says over 800 (BusinessWire 2026-04-09). Reinventing.AI: Trendshift says 60 routines on 11 harnesses, Product Hunt says 59; the COST.md table was read at the primary file on 2026-10-31 and not re-fetched. Meta Muse and Netskope rollover: nothing new surfaced; both stay unverified.

## What the job postings name

Job postings are the P1 pull test (pattern 149), so for a P3 run this section carries the hired-for discipline nearest the proposal, stated as a substitution. UnitedHealth Group posted a Director, FinOps and AI Cost Engineering on 2026-07-11 ("not a traditional cloud cost management role"); FinOps Foundation listings ask for cost pipelines and attribution models for AI workloads with token-based LLM pricing and unit-economics modelling per transaction, agent or product (jobs.finops.org, search text). Cost lineage is a director-level discipline in 2026, not a finance chore.

## Vision-corpus grounding cited on the row

- `VC-SYN-001` - a feature adds investor value when a reviewer can confirm from the product where a number came from and what a piece of work cost.
- `VC-EXIT-021` - complete lineage, zero unexplained rows, costs that reconcile.
- `VC-EXIT-012` - the audit surface is the acquirer's due-diligence surface.
- `VC-EXIT-025` - investors buy a machine whose unit costs are known.
- `VC-EXIT-026` - cleared: this changes what a priced row *is* in the data model; it is not a view over existing numbers.
- `VC-EXIT-027` - value travels with the asset: the dated sheet and the stamped rows are the asset's, not John's.
- `VC-REJECTED-007`, `VC-REJECTED-017`, `VC-INVAR-015` - no model call for a known value; no fabricated zero; honest absence.
- `VC-THESIS-021` tiebreaker: a procurement director sees a price sheet with dates; a VP of Product sees a ledger that recomputes.

## The runners-up and why they ranked lower

1. **Factory unit cost per delivered ticket, with its cost basis stated.** The strongest investor number in principle (`VC-EXIT-025`, `C-EXIT-11`): the free rival publishes ~$500/month at API list and $0 on a subscription, and the self-building factory cannot say what one delivered ticket cost. Killed: AGT-249 (open) records that settle-ship leaves `runner_cycles.api_cost_dev_usd` NULL, and John's AGT-250 ruling forbids stacking a feature on a known-broken base. Fix AGT-249 first; this then becomes one view.
2. **A per-run cost receipt on the answer, Devin style.** `C-MAP-59` ranks it top of the unfiled ideas. Killed: it is the held cost-per-deliverable payload (2026-09-11 18:20Z, pending SES-369) in a new coat, which the lane's 2026-10-17 ruling bars. Release the held payload rather than accept a duplicate.
3. **A rights column on the deliverable.** The 2026-11-04 signal is right that `deliverables` has `price_usd` and no rights field. Killed: 2026 commentary agrees ownership is set by contract and copyright may not subsist at all (Kingsley Napley 2026-07-23; terms.law FAQ 2026), so this is a contract term - an administrative expectation by pattern 137 - that belongs to DL-09's marketplace design.
4. **Agent jobs on a cadence.** Buy-pull by function (`VC-ROOT-004`) and already AGT-604 (P4, 2026-11-04). Dropped.
5. **Sign-in for the NDA objection.** Pattern 137; the readable-knowledge half is AGT-438 (P9, open). Dropped.

**Dropped as already on the board (prior_proposals):** knowledge-bundle identity -> AGT-323 (row cf3d80b5, 2026-W40); caller identity on servings -> AGT-297 (row 4228f23f, 2026-W44); locked claims bound to live checks -> AGT-579 (row 7fd1e757, 2026-W44). **Barred:** ledger reconciled to the provider's bill (refused at filing 2026-09-11 and 2026-09-19; the lane's 2026-09-20 and 2026-10-03 rulings bar a third return). **Held:** cost per deliverable.

**The pacing signal, repeated because it is still true:** the P3 shelf holds six open, unbuilt tickets (AGT-72, AGT-73, AGT-74, AGT-302, AGT-323, AGT-579) and the window delivered 21 tickets with zero P1-P4 and zero buyer-visible, the third consecutive measured week. A seventh row does not fix a shelf nobody draws from; this survivor is filed because it is one cycle and it is the precondition for every cost number the shelf already promises.

## How it reaches the build queue

`file_invention_proposal()` files it as a `backlog_items` row: `scope_origin enhancement`, class `P3 - Investor Value`, `enhancement_claim` in the `none:` form, `predicted_cycles 1`, description citing the VC refs above and this file. Per the LOG-143 record an admitted enhancement is served only once linked to a Selfbuild epic (SES-321); the Development Manager picks the epic. The migration must grant `anon`/`authenticated` SELECT on any new column or table explicitly and assert both directions, per `.claude/rules/supabase-column-grants.md`.

## The usage signal that proves it

Two numbers, both readable with the anon key once built: the share of priced `ai_activity_log` rows in a rolling window that name a `pricing_row_id` (target: every row written after the ship; rows before it read unpriced-by-sheet, never backfilled with today's rate), and the delta between `get_ip_stats()` and the sum of stored `cost_usd` for the same IP and window (target: zero, rendered as a defended number on `ip_spend_report`). A third, not provable until a rate changes: the first `retired_at` on `model_pricing` with history intact on both sides of it.

**Caveats carried from this run.** The 2026-11-04 signal says `cost_usd` is NULL on every model-call row; the code says every row has been priced at write since LOG-149 and the AGT-304 slices, with `call_source='session'` rows NULL by design. I could not re-measure without database access, so the disagreement is filed here rather than resolved. `rejected-paths.md` is a retired pointer and the repo history is shallow, so the 51 `VC-REJECTED` rows were checked only through their citations across `docs/`; none of the cited ones is re-proposed.

---

*End of the pass's returned document. The orchestrating session resolved its final caveat: see
finding 2 above — write-time pricing reaches about 1% of turns, measured against the table.*
