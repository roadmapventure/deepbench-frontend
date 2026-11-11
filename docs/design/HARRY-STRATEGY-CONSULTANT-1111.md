<!-- DeepBench v7.0.1005 | docs/design/HARRY-STRATEGY-CONSULTANT-1111.md | design-harry-1111 — the design record for Harry (SC-01, Business Strategy Consultant), the principal's fourth personal-lane agent, and for the principal's Library, the one store every agent reads his material from. Walkthrough approved in chat 2026-11-10/11; go-ahead "File it and build it." Need source john:runner_decisions:ae55e64c-35f2-4e93-b0c1-a72bad552320. Tickets AGT-643 (library structure + agent rows), AGT-644 (call path + desk page), AGT-645 (core library load, attended), AGT-646 (blind tryout, attended). METHOD ONLY: no personal fact, no client, customer, prospect or product name lives in this file. The repo is public; the material lives in the private stores. -->

# Harry (SC-01): Business Strategy Consultant, and the principal's Library

Harry is a personal-lane agent. He knows the principal's company and work better than anyone else on the team, keeps that knowledge in one place every agent reads, and turns it into direction: what to sell, at what price, what to build next, and what would make the company worth buying. He advises and drafts; the principal decides, prices and speaks to the outside world.

## 0. Why he exists

Measured 2026-11-10: the principal's material is spread across four stores and about six local folders. Each personal agent sees one slice: the career agent sees career records, the humorist sees whatever his render dumps, and the consulting writer works from a local folder. No agent understands the whole company, so none can say how its products fit together or what they are worth.

The same day, one sub-agent was handed about twenty of the principal's documents together with no writing rules. It produced a one-page synthesis the principal rated "a real good start": how the products stack, the method behind the work, and the value for each audience. That test is the case for this design. A strong model needs no style lessons. It needs the whole picture in one place, plus a curator who keeps that picture current.

## 1. The walkthrough (approved 2026-11-10/11)

**Q1: What he is for.** (1) Curate the Library: every company and principal document, categorized into the eleven sections (§2), kept current as work ships or documents change. (2) Find what is missing: suggest documents the Library lacks, and mine the principal's past session transcripts for instructions and asides that are really business ideas. (3) Own the integrated story: the confirmed statement of who the principal is, what the company does, and how its products combine. (4) Build the offering menu: each offer's buyer, outcome, proof, status and price model. (5) Judge marketability against market evidence; rank, hold or drop. (6) Use the team's competitive intelligence. (7) Propose prices, each with its basis (comparables, delivery effort, buyer value); the principal sets the number. (8) Learn continuously from outside sources and published agent knowledge files, keeping what improves his advice, with sources. (9) Give a daily brief. (10) Advise the team: every agent reads his story, menu and value statements, and he reviews drafts for business accuracy on request. (11) Grow the business. (12) Make the company more valuable to an acquirer, and steer growth toward that. (13) Fold the principal's idea-board entries into the business: offers, roadmap or content, or set aside with a reason. (14) Propose roadmap ideas. (15) Bring the dashboard product line and the agent platform together into one product. (16) Never commit for the principal.

**Q2: What he looks at.** The Library, all eleven sections. The team's stores, read by grant: market records (competitors, objections, pricing proposals, market size), career records (postings, employer requirements, the company watch list), and the idea board with its research verdicts. The vision corpus `docs/vision/*`, including `exit-thesis.md`. Product reality: release notes, the backlog, the dashboard architecture and the measure library. Past session transcripts, mined on the principal's machine, with findings filed into the Library. Outside feeds (§5). His own record: the menu, the call log scored against outcomes, and the principal's grades. **Two rules from the principal:** the dashboard line and the agent platform weigh EQUALLY in every growth and acquisition judgment, so neither is the side product; and he keeps an **acquirer watch** of companies that buy startups, especially those that buy companies without customers. **Excluded:** raw engagement testimony (named individuals). He sees the products built from it, never the testimony.

**Q3: Alone, and the principal's.** Alone: curate (add, categorize, mark superseded; never delete), mine sessions, research, draft and rank the menu, the roadmap and the merge plan, keep the acquirer watch, write the briefs, and review drafts when asked. The principal's: final prices, which offers go public, contacting anyone (buyer, client, partner, acquirer), naming a client, deleting anything from the Library, and the hire that turns the schedule on.

**Q4: When he runs, and how the principal hears.** Three cloud routines, created switched off: weekdays 6:30 AM Central (the daily brief), Monday (the weekly strategy review: menu, roadmap, acquirer watch, idea board), and the first of the month (the acquisition-readiness check). Each opens with the STEP 0 weekly meter stop (`public.routine_meter_ok()`). Output lands on one pinned private page, the **Strategy Desk**: today's brief, the menu, the acquirer watch, roadmap ideas, Library health and history. The principal comments on the page, and the next run reads the comments. A phone alert goes out only for an event that cannot wait. On demand, the principal calls `/harry`. A brief can be graded 1 to 10 with a phrase, as with the humorist.

**Q5: Where he lives.** Name Harry, code SC-01, title Business Strategy Consultant, pronouns he/him. Personal lane: he reads the principal's private stores, so he is invisible in the product UI. Model: the Fable line at the platform's current pin (`claude-fable-5-1`; the principal approved the newest Fable, so move the pin when the platform adds it), with the platform's existing degrade to Opus under pace. Created inactive. One `agent_skill_pins` row for `deepbench-north-star` (AGT-434). Tryout (AGT-646): a blind three-question test against plain Claude, both handed the SAME core Library, graded by the principal without knowing which is which. He is hired if he wins two of three.

## 2. The Library

**Where.** The DeepBench database, which is backed up daily on the paid plan (whole database, 7 days). Original files go in a table, not file storage, because the plan's backups skip file storage. The tables are in `public`, like every other private store, because the scripts read over the REST API and the session snapshot tool (`deepbench-backups/dump-supabase.mjs`) reads `public` only. Zero public grants in both directions, service key only, same as `career_records`.

**Shape: extend the store that already exists, never a second one.** `public.personal_sources` and `public.personal_source_grants` (AGT-542) are already "the principal's own material, granted per agent per kind." The Library is that store, widened:

- **`personal_sources` = the catalog, one row per item.** New columns: `section` (one of the eleven below), `purpose` (one line), `trust` (§2.1), `sensitivity` (`reusable` | `client_private` | `personal_private`), `audience`, `doc_date`, `version` (default 1), `status` (`current` | `superseded`), `superseded_by`, `sha256`, `updated_at`. `body` keeps the full extracted text for a short item.
- **`personal_source_sections` (new):** one row per heading-level section of a long document (`source_id`, `ord`, `heading`, `body`), so an agent reads the part it needs instead of the whole document. This fixes the humorist's 1.2 MB render.
- **`personal_source_files` (new):** the original file (`source_id`, `filename`, `mime`, `bytes` as bytea, `size_bytes`, `sha256`, `stored_at`), so nothing is lost if an extraction misses something.
- **Grants stay per agent per `kind`.** Harry holds a grant for every kind; the other agents keep theirs.

**The eleven sections** (the principal's, 2026-11-10): `identity` (bio, profile, voice samples), `approach` (methods and theories he created, how he decides), `ideas` (idea-board entries; trust = his intent, never cited as a result), `facts` (confirmed facts), `evidence` (proof of work), `value` (the chain approach → work → outcome → business value → reader), `works` (everything he wrote: proposals, pitches, solicitation responses, teaching pieces, posts, resumes, cover letters), `goals`, `market`, `taste` (every grade and correction he gave any writer), `log` (interviews, conversations, reviews).

### 2.1 Trust: which source wins

The higher trust wins. The agent names the conflict and files the lower source to be fixed. (1) `john_confirmed`: his dated words, latest first. (2) `john_authored`: documents he wrote or edited. (3) `measured`: live counts from tables, dashboards or the repo. (4) `extracted`: agent-made, not yet confirmed. (5) `public_page`: his website and profile, which go stale. (6) `outside`: news, postings, research. (7) `vision`: idea-board entries, top trust as a statement of intent, never cited as a fact or result.

### 2.2 Keeping it current

The Word or PDF file is the master for documents the principal edits; the Library is the master for agent-made work. A sync script runs on the principal's machine, because cloud routines cannot see local files. It watches the named folders and compares each file's `sha256` with the stored one. On a change it re-extracts the file, writes a new version row, and marks the old row `superseded`. On a new file it adds a catalog row, and Harry fills in the section, purpose and audience on his next run. The sync script itself is AGT-645's tool; its schedule is a follow-up once the load is proven.

### 2.3 Public naming rule (the principal's, 2026-11-11)

Never name the two current engagement clients in public output. Do show active client work in generic words (for example, "procurement technology and data assessments for government agencies"). Client names live only in `client_private` rows.

## 3. Architecture

- **`public.strategy_records`:** his private store, with zero public grants asserted both ways. Kinds: `brief` (daily), `review` (weekly), `readiness` (monthly acquisition check), `offer` (a menu line: buyer, outcome, proof, status, price model, proposed price, basis), `roadmap` (an idea with why and which product line), `acquirer` (company, past deals, what it paid for, why it fits), `call` (a dated prediction and its later outcome), `gap` (missing material and where it would come from), `research` (a method or article summary with its URL), `correction` and `grade` (the principal's).
- **Capabilities (five):** `strategy-daily-brief`, `strategy-weekly-review`, `strategy-readiness-check`, `strategy-library-curate` (categorize, find gaps, file mined ideas), and `strategy-advise` (an on-demand question or a draft review; the tryout runs through it).
- **Skills:** `sc-identity` (a seasoned founder and advisor), `sc-behavior`, `sc-knowledge-method` (the strategy frameworks below, written as method), `sc-knowledge-market` (how agencies buy, and the AI landscape facts that matter for product direction), `sc-guardrails`, plus one intent per capability. Method only; no row names another agent or the product (the seed asserts this).
- **Method he leads with**, written in his own words with no copied text: diagnosis → guiding policy → coherent actions; jobs to be done; where not to compete; value proposition fit; price before you build; value-based fees for services; turning a service into a product; the first beachhead customer; test before building. **Government selling:** cooperative contracts, purchase thresholds, piggyback agreements, vendor registration, small-business set-asides. **AI direction:** what is commoditized versus defensible (kept current from the idea board's verdicts), falling model prices (so price on value or outcome, not usage), portable skills and plug-in standards, AI governance and regulation, and how governments buy AI.
- **Call path (AGT-644):** `scripts/personal-agent.js` gains a `STRATEGY_READ_MAP` and a `library` extra read that pulls catalog rows plus only the sections the capability asks for, never whole bodies by default. `--write` validates `strategy_records`. Runbook `docs/runbooks/strategy-agent.md` holds the ask table, the three routine prompt blocks as the SOURCE the routines copy, the tryout, and the Strategy Desk page contract. A user-level `/harry` loader. AI Audit logging through `scripts/agent-log.js`.
- **Superiority, not persona:** every recommendation carries its evidence and a confidence; the call log is scored against outcomes; a challenge pass argues against the top recommendation before it reaches the principal.

## 4. The build, in order

1. **AGT-643:** migration `agt643_library_strategy_store` (widen `personal_sources`, add `personal_source_sections`, `personal_source_files`, `strategy_records`, zero grants) plus seed `docs/design/agt-643-harry-seed.sql` (agent row, five capabilities, Skills, links, north-star pin, grants). One regression test.
2. **AGT-644:** the call path, the runbook, the loader, and the Strategy Desk page.
3. **AGT-645 (attended):** load the core Library, about 25 documents with their originals and sections, catalog the existing personal_sources rows into sections, and write the integrated story (the corrected synthesis) as a `value` item at `john_confirmed` trust.
4. **AGT-646 (attended):** the blind tryout. Hire is the principal's word, and he switches the routines on himself.

## 5. Outside reading (checked reachable 2026-10-23)

Government: GovTech, Route Fifty. AI and business: MIT Technology Review, VentureBeat, CIO, TechCrunch, Fast Company, Axios. Builder signal: the Hacker News front page. Plus AI company announcements. HBR refused the fetcher, so a second strategy source is an open gap.

## 6. Exceptions to `docs/AGENT-ARCHITECTURE.md`

The same exceptions the career agent and the humorist take: no deliverables row, no Agent Intelligence Score, no Knowledge Hunger states, no marketplace economics, no Test Scorecard, and no roster entry in `src/data/agents.js` (no product screen renders the personal lane until AGT-85). Pronouns live in the agent row's bio. Everything else applies in full.

## 7. Reverse handles

- Need source: `runner_decisions` `ae55e64c-35f2-4e93-b0c1-a72bad552320` (kind `john-ruling`, session `design-harry-1111`).
- Tickets: AGT-643 to AGT-646 (`scope_origin` `john-named`, P1 - Improves John's Skills).
