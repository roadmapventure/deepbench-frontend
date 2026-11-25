<!-- DeepBench v7.0.1119 | docs/design/BILL-GOV-SALES-1125.md | design-bill-1125 — the design record for Bill (GS-01, Government Sales Advisor), a personal-lane agent that finds open state and local government solicitations the company or the principal could win and rates each fit. Six-question walkthrough approved in chat 2026-11-25, one question per message; go-ahead "yes". Need source john:runner_decisions:b1c9ad03-8e41-49dd-a99a-06b613233120. Tickets AGT-808 (store + seed), AGT-809 (source registry), AGT-810 (call path, runbook, routine block, /bill), AGT-811 (first attended scan, Bid Board, routine on). METHOD ONLY: no client name, no secret value, no personal fact lives in this file. The repo is public; ratings, sources and the principal's offering live in the private stores. -->

# Bill (GS-01): Government Sales Advisor

Bill watches where state and local governments post solicitations, twice a week, and tells the principal which open ones the company could win as a product or service sale, and which the principal could win as a person (fractional, interim or advisory work). He rates each one strong or weak by what the agency is asking for, not by whether our words appear in it. He finds and rates; the principal decides, bids and contacts.

## 0. Why he exists

Public-sector buyers post work in thousands of places, and the company's likely clients are the small agencies: counties, cities, towns, school and special districts that cannot afford a data warehouse or an in-house IT build. Nobody on the team watches those postings today. The procurement consultant drafts responses but does not look for them; the career strategist reads job boards, not bid boards.

## 1. The walkthrough (approved 2026-11-25)

**Q1, what he is for:** twice a week, find open state and local solicitations the company or the principal could win, and say which fits: company procurement analytics (spend and sourcing dashboards, KPI selection and build, managed analytics), a KPI Library licence, the AI platform (agents, AI governance, automation); the principal's fractional or interim leadership, or advisory work. Never bids, drafts or contacts an agency. Drafting goes to the procurement consultant only on the principal's word ("send to Malcolm").

**Q2, what he looks at:** all 50 states. The principal amended the first proposal (the five largest agencies per state): most clients are small agencies, so the net is where small agencies post: the statewide portals (many host local bids), the bid aggregators, purchasing cooperatives, and category pulls by NIGP commodity code for consulting and IT and data services, so a solicitation worded differently from our keywords is still seen. A stored source registry is built once and grows from what Bill finds. Agency size counts in the rating: a small agency without its own IT shop rates higher.

Approved keywords (stored as `keyword` rows, the principal adds and drops): procurement analytics, spend analysis, spend dashboard, KPI, performance measures, procurement scorecard, contract analytics, data visualization, business intelligence, managed analytics, procurement modernization, procurement data, strategic sourcing data, strategic sourcing dashboards, procurement audit, procurement technology assessment, NIGP commodity code analysis or assessment; artificial intelligence, AI governance, AI pilot, generative AI, automation, AI readiness, AI prompt engineering; interim CIO, chief data officer, fractional, data strategy, technology roadmap, enterprise architecture, product management consultant, technology program manager, technology project manager; staff augmentation combined with any of our skills or offerings. Skipped: construction, goods-only buys, anything due in under 5 days.

**Q3, what he does with findings:** skip a solicitation already rated unless the agency amends it; rate each new one strong or weak with a one-line reason and the profile it matched (company or principal); save every rating and show the strong ones; status New, Interested, Pass, Bidding, Won, Lost is set only by the principal; a Pass reason feeds later ratings; reminders 10 and 3 days before the due date on anything marked Interested.

**Q4, alone and the principal's:** alone = the rating and its reason, adding an agency to the registry, repairing a dead link, the skip rules, retrying a source, recording unfamiliar market wording as a suggestion. The principal's = every status change, sending to the procurement consultant, registering on a portal, contacting an agency, changing the keyword list or store F.

**Ruling, cost:** Bill runs on the principal's subscription, never the API; nothing he does may cost outside the subscription. So the routine's own Claude session does the search and the rating; `scripts/personal-agent.js` only renders the task and writes the answer; no capability API call is made, and the earlier per-run dollar cap is withdrawn. The routine opens with the STEP 0 weekly meter stop like every agent routine.

**Q5, schedule and how he hears:** Monday and Thursday 4:30 AM Central (cron `30 10 * * 1,4` UTC while Central is on standard time; one hour earlier from 2027-03-14 unless shifted). Output on one pinned private page, the **Bid Board**: new strong matches by due date; buttons Interested, Pass (with a reason), Bidding, Won, Lost, Send to Malcolm; suggested keywords and vocabulary for a yes or no; portals that need an account. A phone push only when a run finds at least one new strong match, and for due reminders.

**Q6, where he lives:** Bill, he/him, code GS-01, title Government Sales Advisor, Business team, personal lane, private, created inactive. Reads the north star and the three company records through the existing pins, store F through a private Library grant (his own read, since the Library is not read the same way by every agent), and his own Skill rows. **The principal's addition:** match by meaning. When an agency names something we do in other words, Bill still rates it for a response and suggests the term for store F's market vocabulary map and for the keyword list; suggestions only.

**Added at the build go-ahead (2026-11-25, decision `1e4ff32c-2c17-47b9-b421-2b8a34f21720`):** finding new sources is a standing part of the job. Bill keeps a list of every state and local government agency and checks each off: (a) website found (yes, no, not yet), (b) searched for solicitations on it (yes, no, not yet). An agency with (b) yes becomes a source searched on every scan; an agency with (a) no or (b) no waits for the principal's later call on whether to keep looking. The fetching and the agency crawl run on the cheapest capable model; only candidate matches are rated on the stronger one; all of it inside the subscription. The first run covers the aggregators only; the full list is worked in the background over the following week.

## 2. Architecture

- **`public.sales_records`** (AGT-808): his private store, RLS on, zero public grants asserted both ways, insert-only like the other personal stores. Q6's three tables are kinds in one store, the existing pattern. Kinds: `source` (the registry: state, name, type, URL, search or category pattern, account needed, cloud-readable, last checked, still works), `solicitation` (agency, size, title, number, due date, URL, source, first seen, amended), `rating` (fit strong or weak, why, profile company or principal, offering matched), `status` (append-only; the newest row per solicitation wins, so the history is kept), `keyword` (approved or suggested), `vocabulary` (their term, what we call it, where to add it, the example solicitation), `reminder`, `correction` and `grade` (the principal's), and `agency` (migration `agt809_sales_agency_kind`: data.key state plus unit id, name, type, website found, website URL, solicitations page found, checked at, the principal's keep-looking call).
- **Two routines, both opening with the STEP 0 weekly meter stop:** `bill-solicitation-scan` (Monday and Thursday 4:30 AM Central: every `source` row) and `bill-agency-crawl` (batches of the agency list on the cheapest capable model; checks (a) and (b); promotes (b) yes to `source`).
- **Capabilities (three):** `sales-scan` (the twice-weekly run), `sales-rate` (rate one pasted solicitation), `sales-ask` (an on-demand question: "scan Texas now", "why is this weak?").
- **Skills:** `gs-identity`, `gs-guardrails`, `gs-knowledge-method` (meaning-first fit rating, the size rule, the skip rules, the vocabulary rule), one intent per capability. Method only; no row names another agent.
- **Call path (AGT-810):** `scripts/personal-agent.js` gains the sales store (`SALES_READ_MAP`), `validateSalesAnswer()` (every rating carries fit, why, profile, due date and source URL; no status write; no second rating of an unamended solicitation) and `writeSales()`. Runbook `docs/runbooks/gov-sales-agent.md` with the `bill-solicitation-scan` routine block, created switched off, and the user-level `/bill` loader. AI Audit through `scripts/agent-log.js` with no cost.
- **Sources the cloud sandbox refuses** are read by a database job (pg_cron and pg_net), the pattern the career strategist's postings already use; AGT-809 marks each source cloud-readable or not.

## 3. The build, in order

1. **AGT-808:** migration `agt808_sales_store` and seed `docs/design/agt-808-bill-seed.sql`, applied; regression test green live.
2. **AGT-809 (attended research):** the source registry, 50 states, small agencies first; the needs-an-account list for the principal.
3. **AGT-810:** the call path, the runbook, the routine block, the loader.
4. **AGT-811 (attended):** one full scan with every strong match opened by hand, the Bid Board, then the routine switched on (the principal approved the schedule in Q5).

## 4. Exceptions to `docs/AGENT-ARCHITECTURE.md`

The same as the other personal-lane agents: no deliverables row, no Agent Intelligence Score, no Knowledge Hunger states, no marketplace economics, no Test Scorecard, no roster entry in `src/data/agents.js`. Pronouns live in the agent row's bio.

## 5. Reverse handles

- Need source: `runner_decisions` `b1c9ad03-8e41-49dd-a99a-06b613233120` (kind `john-ruling`, session `design-bill-1125`).
- Requirement checks (Victoria, pass, need_score 3 each): `1dd10314` (AGT-808), `a7885446` (AGT-809), `fc04de05` (AGT-810), `a712a0a5` (AGT-811).
- Tickets: AGT-808 to AGT-811 (`scope_origin` `john-named`, P1 - Improves John's Skills).
