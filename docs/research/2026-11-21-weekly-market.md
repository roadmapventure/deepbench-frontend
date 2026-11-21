<!-- DeepBench | docs/research/2026-11-21-weekly-market.md | The Researcher, capability
     research-class-lens, run kind weekly-market-review, run 2026-11-21.
     Window 2026-11-14 to 2026-11-21 (ISO week 2026-W47).
     PLAYBOOK RUN: docs/runbooks/researcher-routine.md is on origin/dev, so AGT-138 has shipped and
     its Steps 0-5 were followed in place of the live routine's INTERIM text, as that interim
     paragraph instructs. Where the playbook and the live prompt differ, both were followed: the
     playbook's Step 3 ingests proposals into the findings ledger rather than listing them only, and
     its prompt block names public.apply_claim_recheck() where the live text says only "never write
     to market_records" -- the recheck writer is the sanctioned path (before-image plus one
     reversible decision), never a direct UPDATE, and three were landed this run. The live text's
     SES-369 sentence (the invention filing gate is shut) remains true and was obeyed:
     file_invention_proposal() was NOT called.
     METER: ok -- 22% against the 28.57% Saturday ceiling, 6.57 points of headroom.
     PROMPT DRIFT: check-routine-prompt.js --routine=researcher exits 1, the EXPECTED drift the
     playbook declares (the live trigger still runs the 2026-09-25 interim text plus John's
     2026-10-17 meter stop). A finding, not a stop.
     LENS: P2 and P3 both at 0 ratified (153 vs 151 proposed), so fewest-proposed breaks the tie and
     the lens is P3 - Investor Value for the SIXTH consecutive run. The gap WIDENED from 1 claim
     last week to 2.
     NAPKIN: 0 ideas due, and this is the first genuine zero rather than a filter artifact. AGT-577
     shipped 2026-11-14 and works: text_updated_at is NULL on all 62 rows, no idea's text changed
     this week, and no new idea was created (newest was 2026-11-11, researched 2026-11-14). Last
     week's run had 43 rows matching spuriously off the 2026-10-17 metadata touch; this week, none.
     The trigger napkin_ideas_text_stamp was verified live, so the zero is a real quiescent Napkin
     and not a broken writer.
     EGRESS: ok. WebSearch worked throughout. WebFetch reached claude.com and platform.claude.com
     only; vercel.com, gartner.com, docusign.com, newsroom.ibm.com, palma.ai, govspend.com,
     opentelemetry.io, papermark.com and bdemerson.com did not resolve, so findings on those hosts
     rest on dated search-result extracts of the named page and say so. Precondition C3 was closed
     by earlier runs; this run does not claim to close it.
     TURN LOGGED: ai_activity_log id=83639, trace f8adf93b-6bdb-43bd-b70a-f836d69ca478,
     autonomous-research / research-class-lens:rs-research-intent:depth0, model claude-fable-5-1,
     latency 274,585 ms. Tokens recorded as unmeasured (NULL): the harness reported a 169,715-token
     aggregate for the sub-agent, which cannot be split into input and output honestly, and the
     playbook prefers an honest "unmeasured" to an invented split.
-->

# Weekly Market Review — 2026-11-21 (week 2026-W47)

**Lens:** P3 — Investor Value, sixth consecutive run. **Window:** 2026-11-14 → 2026-11-21.
**Filing gate:** shut (`SES-369`). `file_invention_proposal()` was not called; the one survivor
reaches the Development Manager through the findings ledger, per the playbook's Step 3.

---

## The one thing to read if you read nothing else

**The platform can now say what an answer costs, and the claim that it cannot is the single most
repeated wrong fact in this week's records.** Measured fresh on `public.ai_activity_log`
2026-11-21, over the 7 days to that date:

| Lane (`ai_type = 'agent-turn'`) | Turns | Priced | Dollars |
|---|---|---|---|
| API lanes (`call_source` `mcp` + `ui`) | 177 | **177 (100%)** | $9.6365 |
| Subscription lane (`call_source` `session`) | 269 | 0 (by design) | $0 |
| **Total** | **446** | **177** | **$9.6365** |

Three things follow, and none of them was in the week's records when they were written:

1. **The unpriced 60% is not a coverage defect.** Every one of the 269 unpriced agent turns is
   `call_source = 'session'` — the subscription lane, which prices to $0 on purpose. Every single
   API-lane generative turn carried a cost. That is the question this week's own proposal asks to
   be investigated first, and it is answered here.
2. **This is not new, it is newly visible at volume.** API-lane agent turns have been 100% priced
   since the week of 2026-10-05 (25/25), again 2026-11-02 (10/10), and 177/177 this week.
   Coverage was partial before that (3 of 21 in the week of 2026-09-07, 17 of 75 the week after).
   This is simply the first week with enough API-lane traffic to state a unit cost.
3. **There is a real per-answer figure.** 160 MCP answers served by one private agent cost
   $9.4609 — **$0.059 an answer**. Across all 177 priced turns it is $0.054.

What is still genuinely missing is the unit *above* the turn: nothing sums the calls of one answer,
one ticket or one engagement into a figure a buyer would recognise, and 522 rows all-time hold an
explicit `0` that cannot be told from a value that rounded to zero.

**The platform's own auditor lane beat this run to the measurement by one day.** `AGT-743` was
filed 2026-11-20 by cycle `3517e9fc` and already carries it: *"0 priced rows are embeddings … and
172 agent-turn rows are priced, not 77."* That is worth saying plainly — the self-building
platform corrected its own market intelligence before the weekly review did, which is itself the
best evidence this week for `VC-EXIT-011`.

---

## What changed in the market this week

**Very little, and that is the finding.** Of the week's nine competitor leads re-checked at their
primary sources, exactly one names an event inside the window:

| Lead | What it claimed | Verified date | Verdict |
|---|---|---|---|
| Claude Managed Agents | the week's most important change | **public beta 2026-04-08** | timing WRONG; only self-hosted (2026-11-12) is new |
| Vercel eve 1.0 | GA 2026-11-17 | GA confirmed, date not | partly confirmed |
| Gartner AI Agent Management MQ | reported 2026-11-02 | abstract **2026-10-27** | outside window |
| IBM + Microsoft Imagine Enterprise | announced 2026-11-10 | 2026-11-10 | **inside window** |
| Docusign / Suplari | announced 2026-11-03 | 2026-11-03 | outside window |
| Darwin AI TXShare | a lead this week | award **2026-06-03** | five months old |
| Google Gemini for government | preview 2026-10-20 | 2026-10-20 | outside window |
| GovSpend MCP server | 2026-06-16 | 2026-06-16 | five months old |
| Palma.ai pre-seed | $1.8M | **2026-09-23** (tech.eu) | two months old |

**The pattern matters more than any single row.** Eight of nine "this week's market" leads are
between three weeks and seven months old. The competitive picture did not move this week; our
*knowledge* of it moved, because the Wednesday scan reached hosts and pages it had not reached
before. That is a scanning-coverage gain being read as market velocity, and the distinction is
worth keeping: it changes whether the right response is urgency or catch-up.

**The one substantive theme that is real.** Cost-per-unit-of-work is now table stakes on the other
side of every comparison. The supplier's pricing page prints a worked single-session figure
($0.58); Gartner's first Magic Quadrant for AI Agent Management Platforms (abstract 2026-10-27)
carries FinOps tracking among its named capabilities, per a vendor in the report; and two 2026
buyer-side AI diligence guides ask for inference cost per call by model and per workflow, and tell
acquirers to allocate twelve months of provider invoices to the features that generated them. That
is why the survivor below is a cost ticket and not a governance one.

---

## Where this run confirmed or contradicted the week's market records

Read as LEADS, re-checked at the original source, cited to that source and never to the record.
Seventeen market findings and seven usage findings are in the research body below; this is the
scoreboard.

**Contradicted, and corrected in the catalog (3 reversible decisions, each with a before-image):**

| Target | Verdict | Decision | What moved |
|---|---|---|---|
| `mr:3ccd073c` | corrected | `e604f22b-b025-4fc5-9637-f7e7fcc8aa03` | "every priced log row is an embedding" was false, and was already false when written: 67 priced agent turns predated the record, the first on 2026-09-12. The second half (a rounded zero is indistinguishable from a free call) HOLDS at 522 rows and was left standing. |
| `VC-LRN-003` | corrected | `ab36d37a-e4b6-4fbc-8193-ecb1508b40df` | "0 of 12,252 ledger rows since 2026-08-01 carry a cost" was true when measured 2026-09-11, now 2,545 of 47,098 and $18.79. Its other two clauses (price books omit the provider's multipliers; no file reads the provider's cost report) were re-checked and HOLD, so the lane's test is unchanged. |
| `mr:373aa838` | corrected | `e0f79412-818a-474e-a2e9-6f05a8a8509c` | Claude Managed Agents was not this week's change: public beta 2026-04-08, with scheduled deployments, cross-session memory and Console session tracing already in the launch post. The 2026-11-12 self-hosted private beta — which the record had right — is the only change in the window. Every price and capability fact re-checked and holds. |

On `mr:373aa838` the record deserves credit as well as a correction: it explicitly **refused** to
assert the per-answer cost claim it had been handed as a shared finding — *"I did not read that
table this run, so I assert nothing about it"* — and that refusal was correct, because the shared
finding was wrong. This run read the table and the answer favours us.

**Confirmed:**

- `mr:321d531d` Docusign acquired Suplari, 2026-11-03, terms undisclosed (Docusign newsroom). The
  record's "AI agents" wording is not verified; the release says AI-native procurement intelligence.
- `mr:b992ce8d` GovSpend published an MCP server 2026-06-16, exposing purchase-order, contract and
  meeting-transcript data to Claude, ChatGPT and Copilot (PR Newswire). The record's conclusion —
  that the "central database for procurement transactions" position is already half taken at the
  aggregate layer — stands.
- `mr:0ae3965c` Darwin AI's TXShare cooperative award, announced 2026-06-03; both Darwin Govern and
  LaunchPad are sold to state and local government. "Including procurement" not verified.
- `mr:74f65a6a` The supplier objection is confirmed on price: token rates plus $0.08 per
  session-hour, metered only while running, no platform or seat fees. One caution: the record's
  per-tool approval appears in the docs only as an idle state awaiting "tool confirmation", so it
  is present but not at the strength implied.
- `mr:ccd19bb1` The investor objection — *show me what it shipped without you* — is confirmed and
  it is the week's sharpest. All 8 tickets that reached `done` this window carry an attended origin
  (4 `john-named`, 3 `victoria-placed`, 1 `discovered`); 7 are bug fixes, tooling or enhancement and
  one is P4. **No P1, P2 or P3 ticket shipped at all, attended or not.**
- `mr:4810898e` Confirmed and enlarged: 177 priced agent turns against the 77 it reported, and its
  core reading — that the session lane prices to $0 by design and this is a missing unit rather
  than a broken measurement — is exactly right. It was the most accurate cost record of the week.
- `mr:6027d148` / `mr:0d35aa2d` The OpenTelemetry export gap is confirmed, with a caution that
  argues against acting on it yet: the GenAI agent-span semantic conventions are still marked
  *Status: Development*, moved to a separate repository 2026-06-12, with no tagged release found.

**Partly confirmed, host unreachable — stated as such rather than graded:**

- `mr:08a12bc6` eve 1.0 is GA, Apache-2.0, with tracing rebuilt on OpenTelemetry showing waits on
  tool approvals and budget prompts. The 2026-11-17 date is not confirmed (one secondary says
  11-15) and cost-inside-traces is not confirmed. Its docs also qualify the tenancy claim: the
  application authenticates the user and identifies the tenant, then sets memory, credentials and
  approval policy per tenant — tenant-scoped configuration you wire, not isolation the harness
  supplies. That weakens `mr:1699bed2`'s "eve ships this as a standard feature".
- `mr:cb9d8f74` The Magic Quadrant abstract is dated 2026-10-27. The Leaders list (Microsoft, IBM,
  ServiceNow) still rests on the CX Today report alone; Gartner's own page could not be opened.
- `mr:4de1381b` Palma.ai's $1.8M pre-seed is confirmed at tech.eu (2026-09-23), led by D11Z, with
  approved MCP tools and Skills enforced at runtime and a tamper-evident audit trail. The
  Claude/Gemini/Copilot client list is not verified; palma.ai did not resolve.
- `mr:f5525d6b` The IBM/Microsoft date and build-govern framing are confirmed. **One discrepancy
  not corrected in the catalog:** the release reportedly says "more than 6,000 prebuilt AI agents
  **and assets**", not 6,000 agents, and names financial services, insurance and retail first with
  public sector a later plan. That rests on a search extract because `newsroom.ibm.com` did not
  resolve, so it is reported here and NOT written as a recheck — a record should not be retired on
  an extract.
- `mr:66f6099c` Gemini for government services checks bids against RFP, FAR and scoring rubrics and
  returns scoring justifications with citations; private preview since 2026-10-20. "Exactly one
  procurement skill" could not be verified — the page truncated.

---

## Proposals for The Development Manager

The filing gate is shut, so nothing was filed as a ticket. One survivor against an allowance of
two; the honest shortfall is deliberate and the reasons are in the research body.

**Ledger intake (playbook Step 3):** `ingest 2026-W47: 1 findings, 1 new, 0 seen, 0 recurring,
0 ruled-out`. Fingerprint `1bdd3cc2018dd196`, `finding_type` `proposal`, `kind` `other`,
confidence `medium`, status `open`, six locations, `found_by` `researcher:weekly-market`. It is the
Development Manager's to rule through `scripts/audit-review.js` like any other finding.
`public.file_invention_proposal()` was not called and `public.invention_due()` reported
`allowed = 2`.

### Survivor — `P3 - Investor Value`, predicted 2 cycles

**One answer, one dollar, and how much of it was measured: a per-answer cost that states its own
coverage.** Claim refs `VC-SYN-001`, `VC-LRN-003`, `VC-EXIT-021`, `VC-EXIT-025`, `VC-LRN-027`.

A reviewer can open one answer and read what it cost together with what share of its model turns
that cost covers — so the figure is confirmable from the product and the unmeasured part is stated
rather than hidden as a zero.

**THREE THINGS THE DEVELOPMENT MANAGER MUST WEIGH, which the research pass could not see.** Only
5 of this lane's 26 prior proposals were loaded into the pass, and the two most relevant neighbours
were filed by other lanes:

1. **`AGT-743` (P9, open, filed 2026-11-20) overlaps step 1 and already did it.** It owns pricing
   the generative turn at write time *and* the missing `basis`/unbilled column that would let a
   deliberate 0 be told from a rounded one. The survivor's own first ask — "find out why 269 agent
   turns are unpriced" — **is already answered** by this report's measurement (all 269 are the
   subscription lane, $0 by design). That removes the stated reason for the second cycle, so this
   should be ruled at **1 cycle, not 2**, or merged into `AGT-743`.
2. **`AGT-619` (P3, ticketed) owns the rate identity** on each priced row. It composes rather than
   conflicts. Note that `AGT-619`'s own filing note said there was "almost nothing to attach a rate
   to yet" — this week there is: 177 priced API-lane rows.
3. **What is left that nothing else owns** is the unit *above* the row: one derivation taking an
   answer and returning dollars plus "k of n turns priced", shown on a surface a reviewer already
   opens. No new screen. If the manager judges that too thin to stand alone, the honest outcome is
   a scope note on `AGT-743`, not a new ticket.

**Risks the pass named and this run resolved or carried:**
- `VC-LRN-071` — if C-MAP-28 (deepening something already built is P5) binds P3 as it binds P2,
  this is P5, not P3. Unresolved and it needs John, not an agent.
- `VC-LRN-026` — the per-answer figure describes the platform operating on itself. **Partly
  resolved this week:** the 162 MCP agent turns came from 2 distinct visitors with
  `caller_ip` on all 162 and `visitor_id` on 159, between 2026-11-19 and 2026-11-21. That is the
  first week in a while with identified non-runner traffic on the generative path.
- `VC-LRN-027` — the exit essay's "which single number first" question is still unanswered, and
  seven passes have each picked their own. This is the sixth consecutive P3 pass; the question is
  now the bottleneck on the class, not any individual proposal.

### Runners-up, not proposed, and why

| # | Candidate | Killed by |
|---|---|---|
| 2 | A public weekly count of what shipped without you in the room | duplicate of `AGT-579` |
| 3 | Export per-call lineage as OpenTelemetry | standard skill (pattern 149); conventions still *Development* |
| 4 | Name the provider on every ledger row | administrative expectation (pattern 137) |
| 5 | A procurement-domain trained Skill set with lineage | empty usage leg; it is the customer class's test, not this one's |

### Two board observations, not proposals

- **A premise on the board has moved and should be re-read, not rebuilt.** `AGT-297`'s governing
  fact was *"742 of 906 bundles this week carry no caller at all"* (measured 2026-10-31). Split
  fresh 2026-11-21 over the `mcp` lane: **the knowledge-bundle servings still name almost nobody —
  44 of 366 `deterministic` rows carry a caller (12%) — while the new agent-turn path names 159 of
  162.** So `AGT-297` holds for the surface it was filed against and is already solved on the
  adjacent one. Worth a scope narrowing rather than a re-measure.
- **343 runner cycles, 76 shipping, 47 pushed, 7 carrying a ticket.** In the window the unattended
  factory started 343 cycles: 222 `did_not_run`, 76 `shipped` (47 with a `push_sha`), 38
  `gated_before_build`, 1 `failed`. Only 7 shipped cycles carried a `backlog_item_id`. So there IS
  substantial unattended output and it is almost entirely unattached to a ticket a reviewer could
  read — which is the precise, measurable shape of the `mr:ccd19bb1` investor objection, and a
  cheaper thing to fix than it sounds.

---

## Napkin — ideas reviewed this run

**Zero ideas were due, and the zero is correct.**

| Idea id | Verdict |
|---|---|
| — | no idea met the due filter this run |

Per the playbook's due rule, an idea is due when `researched_at` is NULL or older than
`text_updated_at`, excluding status `done` and `parked`. On 2026-11-21 that set is empty: all 62
rows carry `text_updated_at` NULL, which `AGT-577` (shipped 2026-11-14) specifies never makes an
idea due, and every row already carries a `research_note` from an earlier run. No idea's text
changed this week and no new idea was created — the newest was created 2026-11-11 and researched
2026-11-14.

**This zero was verified rather than assumed**, because a quiescent Napkin and a broken due filter
look identical from the outside. The trigger `napkin_ideas_text_stamp` exists and fires `BEFORE
UPDATE ... WHEN new.text IS DISTINCT FROM old.text`, and `AGT-577`'s migration deliberately
excluded the 2026-10-17 14:52–15:16 metadata-touch window from its backfill — which is exactly why
these rows are NULL rather than stamped. The filter is live and the Napkin is simply quiet. Last
week 43 rows matched this filter spuriously; this week none do, which is `AGT-577` working as
designed on its first full cycle.

No `research_note` and no `researched_at` was written this run. No `text`, `status`, `note`,
`nathan_note`, `category`, `tags`, `archived` or `text_updated_at` was touched, this run or ever by
this routine.

---

## One process finding from this run

**`scripts/tail-push.js` cannot produce the commit trailer every routine prompt requires.** The
Researcher's prompt (and the playbook's own prompt block) say the commit message must end with
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. `tail-push.js` builds its message from
`--message` / `--cycle-id` alone and contains no trailer logic — grepped on this tree, there is no
`Co-Authored-By` string in the file. So commit `b90a667`, this report's own first commit, went onto
`dev` without it, and so has every routine commit made through this script since `AGT-607` routed
the routines' own files through it.

It was NOT fixed by rewriting history: `dev` is shared with 5–7 concurrent sessions and a
force-push to correct one trailer is far worse than the missing trailer. The amendment commit
carrying this section was made with plain `git commit` and pushed `HEAD:dev`, with the trailer, so
the two halves of this report sit on `dev` under different commit conventions — which is itself the
clearest evidence of the gap. Filed for the Development Manager as a separate ledger finding.

---

## The research body

What follows is the research document returned by The Researcher
(`research-class-lens` / `rs-research-intent`, model `claude-fable-5-1`), verbatim.

---

# Weekly market review - P3 - Investor Value - 2026-W47 (2026-11-14 to 2026-11-21)

Lens: P3 - Investor Value (sixth consecutive run; the class holds 0 ratified, 151 proposed, 7 rejected claims). Allowed: 2 proposals. Returned: 1. The filing gate is shut, so the survivor is returned to the findings ledger and nothing was filed.

## The pitch

For the first time your ledger prices the turns that matter. This week 177 generative agent turns carry a cost, and they account for 99.9% of every priced dollar. What the platform still cannot do is the thing the class's own root claim names: say what one answer cost. The ledger stops at the turn, and 60% of agent turns carry no cost at all.

The proposal is one number with its own honesty attached: **for one answer, the dollars, and how many of its model turns those dollars cover.** A turn with no cost is reported as unmeasured, never summed as zero. A reviewer can then confirm the figure from the rows, and the unmeasured share becomes a visible number that shrinks as pricing spreads.

I am returning one survivor, not two. The second-strongest candidate duplicates a ticket already on the board (AGT-579) and the remaining three rest on one leg only.

## What the market says (live, dated)

Every item below was re-checked this run at the vendor's page where the host could be reached. Where it could not, the row says so and the claim is graded lower.

**The supplier sells the harness, and prints the unit cost.**
- Anthropic's pricing documentation (read 2026-11-21) bills Claude Managed Agents on two dimensions: tokens at model rates plus **$0.08 per session-hour**, metered to the millisecond only while a session is running. Idle time, including waiting on a tool confirmation, is free. There is no seat line. The page carries a worked example pricing one session at $0.58. https://platform.claude.com/docs/en/about-claude/pricing
- Managed Agents is not this week's news. It launched in public beta on **2026-04-08** with scheduled deployments, built-in memory across sessions and session tracing in the Console. https://claude.com/blog/claude-managed-agents
- What is new: **self-hosted Claude Managed Agents, private beta, 2026-11-12.** The customer hosts the server, sandboxes, credentials and session history, and chooses the inference provider (Anthropic, Amazon Bedrock, Google, Microsoft Foundry or their own gateway). The step record "exports over OpenTelemetry". No price is published; the docs say to contact the account team. https://claude.com/resources/articles/self-hosted-claude-managed-agents and https://platform.claude.com/docs/en/managed-agents/self-hosted
- The whole product is still labelled beta in the docs (read 2026-11-21). https://platform.claude.com/docs/en/managed-agents/overview

**An open-source harness reached 1.0 with the same observability.**
- Vercel announced eve 1.0 as generally available: Apache-2.0, 230+ releases since the June preview, tracing rebuilt on OpenTelemetry that shows when an agent is waiting on a person (tool approvals, questions, budget prompts). On tenancy the docs say your application identifies the tenant and then sets memory, credentials and approval policy for it. https://vercel.com/blog/eve-is-now-generally-available and https://vercel.com/docs/eve/agent-runs (both read through search results on 2026-11-21; vercel.com could not be opened directly from this run). I could not confirm the 2026-11-17 date - one secondary source gives 2026-11-15 - nor that cost appears inside the traces.

**Analysts made the agent control plane a category, with cost tracking in it.**
- Gartner's abstract for the first Magic Quadrant for AI Agent Management Platforms is dated **2026-10-27**. https://www.gartner.com/doc/8557473 (abstract seen in search results; the page could not be opened).
- Gravitee, placed as a Challenger, says the report lists nine critical capabilities including an agent registry, FinOps tracking and guardrail management. https://www.gravitee.io/blog/2026/gravitee-a-challenger-in-gartner-mq-for-ai-agent-management
- The Leaders list (Microsoft, IBM, ServiceNow) still rests on a trade report only. I found no vendor press release claiming a Leader placement.

**The largest vendors bundle agents by the thousand.**
- IBM and Microsoft announced Imagine Enterprise on **2026-11-10**: build, run and govern agents, with "more than 6,000 prebuilt AI agents and assets" from IBM Consulting. First industries are financial services, insurance and retail; public sector is a stated later expansion. No pricing or availability date. https://newsroom.ibm.com/2026-11-10-ibm-and-microsoft-announce-a-new-ai-agent-platform-designed-for-industry-specific-transformation (read through search results; host unreachable).

**Procurement is being bought and built around.**
- Docusign announced it acquired Suplari on **2026-11-03**, terms undisclosed, to link contract terms to actual spend. https://www.docusign.com/company/news-center/docusign-acquires-suplari-to-accelerate-aipowered-contract-management-for-procurement (search result; host unreachable).
- Google's Gemini for government services, in private preview since **2026-10-20**, checks bids against the RFP, FAR and scoring rubrics and returns scoring justifications with citations. https://cloud.google.com/gemini-enterprise/gov (search result; the page truncated on direct read).
- GovSpend announced an MCP server on **2026-06-16**. https://www.prnewswire.com/news-releases/govspend-launches-mcp-server-to-power-custom-ai-applications-across-the-public-sector-procurement-ecosystem-302800763.html
- Darwin AI's TXShare cooperative contract was announced **2026-06-03**; it sells Darwin Govern and Darwin LaunchPad to state and local government. https://www.darwingov.com/post/darwin-ai-awarded-txshare-cooperative-contract-now-available-on-civic-marketplace
- Palma.ai raised a $1.8M pre-seed, reported **2026-09-23**, for runtime governance of approved MCP tools and Skills with a tamper-evident audit trail. https://tech.eu/2026/09/23/palmaai-raises-18m-to-bring-governed-ai-agents-to-more-enterprises (secondary; palma.ai unreachable).

**The export format everyone cites is not finished.**
- The OpenTelemetry GenAI agent-span conventions are still marked Status: Development, and the GenAI conventions moved to a separate repository on 2026-06-12 with no tagged release found. https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/ (search result; host unreachable).

**What a buyer's reviewer asks about cost.**
- 2026 buyer-side diligence guides ask for inference cost per call by model, a margin bridge and cohorts, and flag dependency on a third-party model (https://www.papermark.com/blog/ai-due-diligence); and tell acquirers to pull twelve months of model-provider invoices and allocate them to the features that generate them (https://www.bdemerson.com/article/ai-due-diligence). Both are vendor-authored guides read through search results, not standards. I found no recognised standard for "cost per answer"; the sources say per call, per workflow, per active customer.

### Where this run's evidence disagrees with the leads

| Lead | Verdict | What the source shows |
|---|---|---|
| 373aa838 Managed Agents | Confirmed on price and features; **contradicted on timing** | $0.08 per session-hour and no seat fee hold. The product launched 2026-04-08; only self-hosted is new (2026-11-12). "Per-agent tracing" is session tracing. The $0.08 rate is not published for self-hosted. |
| 08a12bc6 eve 1.0 | Partly confirmed | GA, Apache-2.0, OpenTelemetry with approval waits, nine channels listed. Date, and cost in traces, not confirmed. Tenancy is configuration your application wires. |
| cb9d8f74 Gartner | Partly confirmed | Report exists, dated 2026-10-27, cost tracking is a named capability. Leaders list is still secondary-sourced. |
| 4de1381b Palma.ai | Confirmed at a secondary source | Round and product description hold. The named client list was not verified. |
| f5525d6b Imagine Enterprise | **Contradicted on the count** | "6,000 prebuilt AI agents and assets", not 6,000 agents. |
| 321d531d Suplari | Confirmed | 2026-11-03, terms undisclosed. "AI agents" wording not verified. |
| 0ae3965c Darwin AI | Confirmed | TXShare award and both products. "Incl. procurement" not verified. |
| 66f6099c Google | Partly confirmed | Cited bid scoring and the 2026-10-20 preview hold. "Exactly one procurement skill" could not be verified. |
| b992ce8d GovSpend | Confirmed | 2026-06-16. |
| 3ccd073c every priced row is an embedding | **Contradicted** | 177 priced generative turns this week carry 99.9% of priced dollars. |
| 4810898e per-answer cost is a missing unit | Confirmed and enlarged | 177 priced agent turns against the 77 it reported. The unit above the turn is still missing. |
| 6027d148 / 0d35aa2d no OpenTelemetry export | Confirmed, with a caution | eve and the supplier both export it. The agent-span format is still Development. |
| 74f65a6a supplier objection | Confirmed on price | "Per-tool approval" was found only as a tool-confirmation wait state. |
| ccd19bb1 investor objection | Confirmed | 0 of 8 shipped tickets this week were unattended. |

## What the job postings name

Not run. Job postings are the market leg for the skills class; this lens is investor value and its market leg is the buyer's and reviewer's checklist, covered above.

## Vision-corpus grounding cited on the row

- **VC-SYN-001** - a feature adds investor value when it lets a skeptical reviewer confirm a claim from the product itself, and "today the platform cannot say what one answer cost". The second half is half-true as of this week: the inputs exist, the answer-level figure does not.
- **VC-LRN-003** - the first number a diligence checklist asks for is one the platform cannot state. The claim's count (0 of 12,252 rows with a cost) is now out of date on the generative lane; its conclusion still holds at the answer level.
- **VC-EXIT-021** - costs must reconcile because diligence trust dies on one wrong number. A total summed over a 40%-priced lane is that wrong number; a total with stated coverage is not.
- **VC-EXIT-025** - investors buy a machine whose unit costs are known.
- **VC-LRN-027** - which single number to show an acquirer first has never been answered. This proposal does not answer it; it makes one of the candidates real enough to be chosen or refused.
- Constraints honoured from the rejected paths: no fabricated zero where data is incomplete (VC-REJECTED-017), no outward number without its stated defence (VC-REJECTED-031), no narrowing a spend count to a convenient scope (VC-REJECTED-019), no reconciliation bridge or catalogue-seeded display (VC-REJECTED-018) - the derivation reads only what the ledger holds.

## The shortlist, and the runners-up and why they ranked lower

1. **Per-answer cost with stated coverage - SURVIVOR.** Both legs. Pull test: the reviewer's first cost question becomes answerable from the product, and the answer carries its own defence. Tiebreaker: a procurement director reads a price per piece of work; a product reviewer reads a team that will not print a number it cannot stand behind.
2. **A public weekly count of what shipped without you - DROPPED, already on the board as AGT-579.** Both legs are strong (0 of 8 unattended; scheduled unattended agents are now a supplier feature at $0.08 an hour). But it is a locked claim bound to a live check that may fail in public, which is exactly AGT-579. The cheapest route is to make "the platform builds itself" one of AGT-579's claims.
3. **OpenTelemetry export of lineage - KILLED as a standard skill (pattern 149).** The supplier and Vercel both ship it, so it is parity, not showcase, and the format is unfinished. Market leg only.
4. **Provider named on every ledger row - KILLED as an administrative expectation (pattern 137).** A reviewer expects it (VC-LRN-033); nobody is impressed by it. Worth doing inside another ticket, not as an investor-value proposal.
5. **A procurement-domain trained Skill set - NOT PROPOSED.** The loudest market signal of the week and an empty usage leg. It is the customer class's test (a second working domain) and it waits on a ruling the corpus names as open (VC-LRN-015).

Checked against the prior proposals supplied: AGT-323 (served-bundle identity), AGT-297 (caller identity), AGT-579 (claims bound to checks), AGT-619 (rate lineage), AGT-691 (refusal rows). The survivor is adjacent to AGT-619 and distinct from it: AGT-619 says which rate priced a row; the survivor is the unit above the row and the honesty of its total. AGT-619's own measurement note said there was "almost nothing to attach a rate to yet". This week there is.

## How it reaches the build queue

The filing gate is shut, so nothing was filed. The survivor is returned in this run's response and enters the findings intake as a proposal for the Development Manager. Predicted cycles: 2.

1. Establish why 269 agent turns carry no cost, by lane, and state for each lane whether that is by design. Nothing is built on the gap until it is explained.
2. One derivation: an answer in; dollars and "k of n model turns priced" out. Surfaced on one surface a reviewer already opens.

Out of scope: a new screen, reconciliation to the provider's invoice, rate lineage, backfilling historical cost, and any change to how a turn is priced.

## The usage signal that proves it

Source: public.ai_activity_log, last 7 days, measured 2026-11-21 (figures supplied to this run; no query was run by this pass).

| Call type | Turns | Priced | Dollars |
|---|---|---|---|
| agent-turn | 446 | 177 | 9.6365 |
| reinforcement | 443 | 443 | 0.0037 |
| deterministic | 423 | 0 | 0 |
| librarian | 307 | 2 | 0 |
| retrieval | 81 | 81 | 0.0004 |
| guardrails-check | 4 | 4 | 0.0068 |
| similarity | 3 | 3 | 0 |
| **All 26 call types** | **1,926** | **710** | **9.6475** |

- 177 of 446 agent turns priced is 39.7%; 269 are not. About $0.054 per priced agent turn.
- Agent turns are 99.9% of the week's priced dollars. A per-answer cost is, in practice, the sum of an answer's agent turns.
- Once shipped, the proof is two numbers that move: the share of answers with full coverage rises, and the count of unpriced agent turns with no stated reason falls to zero.

## What I am unsure of

- **Coverage of my own duplicate check.** 26 prior proposals exist for this lane; 5 were supplied. An earlier cost-per-deliverable survivor is recorded in the corpus as proposed in September. If it was ticketed, this survivor should be merged into it, not filed beside it.
- **The class.** If the rule that deepening something already built is an Enhancement binds this class (VC-LRN-071), this is P5.
- **Whose usage.** The traffic is largely the platform operating on itself (VC-LRN-026). The figure will describe runner work until a real visitor asks a question.
- **Why 60% is unpriced.** The supplied figures do not say. That is why step 1 exists.
- **Sources I could not open directly.** vercel.com, gartner.com, docusign.com, newsroom.ibm.com, palma.ai, govspend.com, opentelemetry.io, papermark.com and bdemerson.com did not resolve from this run; those rows rest on search-result extracts of the named page and are marked as such. The supplier's pages (claude.com, platform.claude.com) were read in full.
