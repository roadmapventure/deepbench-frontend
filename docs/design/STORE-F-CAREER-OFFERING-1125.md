# Store F — John's career offering and the market vocabulary map (design, 2026-11-25)

Need source: `john:runner_decisions:1fcf1d20-03ce-426b-855a-23f2d3fadece` (walkthrough Q1–Q6 approved in chat 2026-11-25, "Yes, approve and build"). Tickets AGT-804..807, P1 - Improves John's Skills, john-named.

## Why

John's five company documentation stores (A North Star, B RMV offerings, C product descriptions, D services, F John's career offering) exist so every agent works from one understanding, updated in one place. A–D live as pinned Skill rows. F did not exist: its pieces were scattered across the Library goals item, the Integrated Story, confirmed facts, Laura's writing corrections and Jerry's career records, and Nathan and Dilbert could reach none of them. The Business-team agents could pitch different versions of John.

F also gets a second job John added in the walkthrough: a **market vocabulary map**. When an agent sees a role or task in the market or a job description that matches John's work under words he has not used, it records it. Agents can then use the market's vocabulary or explain to a reader how the ask aligns with John's past work, in John's words.

## What F is (Q1, Q3)

F is **not a pinned Skill**: pinned rows must be public-safe, and F holds goals and a salary target. F is private Library content (`public.personal_sources`, sensitivity `personal_private`) in two kinds:

1. **`career_offering`** — ONE current record (section `goals`, trust `john_confirmed`), versioned like every Library item. Five parts:
   - Goals: a $2M+ value exit within 2 years, built on IP, technology, strategy and vision (not revenue multiples), OR a $300K/yr role by 2027-11 (RMV goes along or stays on the side); either counts; no income past December 2026.
   - Target roles: ANY product management role that manages a team, whatever the title, Head of Product included.
   - Hiring framing (gap-8 answer, 2026-11-11).
   - Proof points: confirmed facts only.
   - Public rules: never job-seeking wording; no client names; employer roles = pricing influence, never P&L ownership; "20+ years"; no past role called Head of Product; Enlyton is not an exit.
   F wins over the Integrated Story (which still says "nearly 30 years" and "Head/VP up to CPO").
2. **`market_term`** — one item per market term (section `market`, trust `extracted` until John confirms). Fields in `data`: `term`, `seen` (array of `{agent, source, date}`), `sightings` (count), `meaning`, `matches` (John's work), `in_his_words`, `how_to_use`, `strength` (`strong` | `partial`, partial names the shortfall). A repeat sighting appends to `seen` and bumps `sightings` (a new version of the same item), never a second item.

## Who feeds it, who reads it (Q4, Q6)

- Reads (fixed, full, every run — never ranked, never cut, placed like AGT-725's `profile_facts`): harry, laura, jerry, dilbert (via `scripts/personal-agent.js`), and nathan (new read path, AGT-806).
- Writes `market_term`: jerry (flagged postings, market watch), laura (each tailored posting, monthly trade-press watch), harry (outside research, acquirer watch, weekly study), nathan (DeepBench competitor/market work). Dilbert reads only. No new runs: a step inside runs that already happen.

## What changes without John (Q2, Q5)

| Agents alone | Proposal first, no effect until John's yes |
|---|---|
| add a `market_term` or bump its sightings | goals, target roles |
| set strength, naming the shortfall | hiring framing |
| add a proof point that is already a confirmed fact | a new fact about John not yet confirmed |
| fix wording to confirmed facts and public rules | any removal from F |
| add a how-to-use note | moving a market term into headline, About or master resume |

A small change is a new version of the item, logged. A big change is a `writing_records` row of kind `proposal` naming store F; the write guard refuses applying one directly.

## How John hears (Q6)

Career Desk (artifact Hx4qGpNNGbdWptRMJbFvGn) gains a Store F section: Waiting on you (proposals side by side with the current text, answered in a /laura session "yes 1, no 2"), a weekly list of small changes shown Thursday after Laura's 7:00 AM check, and the vocabulary map ordered by sightings.

## Tickets

| Ticket | Piece | Files |
|---|---|---|
| AGT-804 | the record + grants (data only) | `docs/design/agt-804-store-f-seed.sql` (mirror) |
| AGT-805 | fixed read for 4 agents + write step + guard | `scripts/personal-agent.js`, its test, the runbook |
| AGT-806 | Nathan's read and write path | Nathan's call path, its test |
| AGT-807 | Career Desk section + receipt check | the artifact datasets, one regression test |
