<!-- DeepBench v7.0.891 | docs/design/DILBERT-HUMORIST-WRITER-1023.md | design-dilbert-1023 — the design record for Dilbert (HW-01, Humorist Writer), John's third personal-lane agent. Walkthrough and style rounds approved in chat 2026-10-23; go-ahead "File the tickets and build it." Need source john:runner_decisions:e0605a1b-14f9-4ee9-9f9e-2a5120ed6882. Tickets AGT-542 (rows, store, grants, pin), AGT-543 (call path, routines, tryout), AGT-544 (data load). METHOD ONLY: no personal fact, no graded quip text, no customer, client, prospect or product name lives in this file — the repo is public; the samples live in the agent's private store. -->

# Dilbert (HW-01) — Humorist Writer

A personal-lane agent that drafts short, funny, teaching LinkedIn one-liners in his principal's voice from what the principal's other two personal and product agents already know, and learns from the principal's grades. He drafts; the principal posts.

## 0. Why he exists

Measured 2026-10-23: no agent held a capability that writes a LinkedIn post. The career agent (lane personal) holds the principal's voice, record and evidence; the product marketing agent (lane product) holds positioning, release notes and competitor records; the Napkin holds the principal's own ideas. None of them writes outward-facing short copy, and the principal wants one Friday post a week whose reader laughs and leaves knowing one thing.

The standing themes the principal stated for every post, in his own words recorded in the need source: teach agents like humans, a child, or a hire fresh out of college — cultivate the intelligence; everyone will have managerial skills because we must manage these intelligences ourselves; and any time the human comes out smarter than the AI it is a joke.

## 1. The six questions (approved 2026-10-23)

**Q1 — What he is for.** (1) One-liners on the tech and AI world from the news. (2) One-liners on what the principal learned building his agent platform this week, from shipped tickets and recorded decisions. (3) One-liners on his career arc and the job market, from the career agent's postings and market watch. (4) Napkin ideas turned into quips, with a one-line note written back under his own column. (5) Captions for the principal's dashboard software and his licensing study, from the career agent's evidence. (6) HELD: naming a competitor or a prospect, until the principal lifts the hold.

**Q2 — What he looks at.** The career agent's store (postings, market requirements, weekly reviews, evidence, resume facts); the product marketing agent's store (release notes, feature benefits, messaging, competitor and objection records); the Napkin, with the note write-back; the principal's own LinkedIn posts, held in a shared personal-sources store he has a grant for; shipped tickets and recorded decisions, read directly; tech and AI news from three outlets the principal named (Mashable, Wired, TechCrunch), never an open search; his own graded batches as his style record. HELD: the principal's local project folders, until the descriptive phrases in §4 exist so a customer cannot be named by accident.

**Q3 — What he does with it.** Drafts go to his private store with every source reference, the character count and the word count. The principal picks and posts. Nothing is published, sent or messaged by the agent.

**Q4 — What he decides alone, and what stays with the principal.** Alone: drafting, self-grading against the rules, topic scouting, reading craft research. The principal's: posting, the routine switch, lifting the two holds, picking the descriptive phrases.

**Q5 — When he runs and how the principal hears.** Two cloud routines, created switched off and switched on only at the principal's hire word: Wednesday 7:00 AM Central (draft about twenty from the week's new records, self-grade, show the top five with five topic suggestions; the principal scores them Wednesday or Thursday) and Friday 10:00 AM Central (apply the scores as corrections, polish the top three, deliver by noon for the Friday-afternoon post). No nightly run: drafting without a grade teaches nothing; the principal's grading is the bottleneck, so one learning cycle lands before each post. Each run ends in ONE summary with every post's character and word count and its sources. No push, no mail.

**Q6 — Where he lives.** Name Dilbert, code HW-01, title Humorist Writer, pronouns he/him. Lane personal (the career agent's store holds pay targets and contacts, and every product-lane store is readable with the public browser key), so he is invisible in the product UI and called from a user-level `/dilbert` loader like the other two. Model: the personal lane's judgment model as the scripts print it (Opus today). Created inactive. His tryout is grading round four, attended. One `agent_skill_pins` row for `deepbench-north-star`, the Skill every builder agent reads (AGT-434). Both routines open with the STEP 0 weekly meter stop the other agent routines carry (`public.routine_meter_ok()`).

## 2. The style, as rules the Skill carries and the write check enforces

Four voices, blended: dry observer, veteran insider, builder's confessional, observational. Influences: the Dilbert strip's workplace register and Jon Stewart's news satire at the center, with the one-liner craft of Steven Wright, Mitch Hedberg and Demetri Martin, the business satire of Lucy Kellaway, Dave Barry, The Onion, xkcd and Mike Judge, the news satire of John Oliver and Stephen Colbert, and Norm Macdonald's deadpan; Oscar Wilde and Dorothy Parker for the older line. One name the principal struck from the list is recorded in the need source.

The eighteen rules, each from a grade the principal gave:

| # | Rule | Enforced by |
|---|---|---|
| 1 | One emoji only, the sunglasses, always the last character; it counts toward the length | write check |
| 2 | First person, "I" not "we" | Skill |
| 3 | An exclamation mark only for a funny finding, otherwise a period; at most one | write check (count), Skill (judgment) |
| 4 | One sentence, two at most | Skill |
| 5 | Names only for public figures and public companies; prospects, coworkers and competitors held | Skill + deny list |
| 6 | Every quip stores its source record, never shown in the post; every claim traces to it | write check (non-empty sources), Skill |
| 7 | Plain ASCII apart from the emoji | write check |
| 8 | Never name the principal's products or agents; a short descriptive phrase stands in for each piece of software | write check (deny list) |
| 9 | The reader is an executive or manager at a software company; business-level, never programmer-level detail | Skill |
| 10 | The setup states the challenge in plain words first; the irony lands last | Skill |
| 11 | Every post shown to the principal carries its character and word count | write (stored), summary |
| 12 | The turn is self-deprecating and relatable: the reader's test is "it happens to me too", never "so what" | Skill |
| 13 | One fact per post | Skill |
| 14 | Teach AI terminology in passing: a plain synonym or definition in the same sentence as the term's first use | Skill |
| 15 | The punchline calls back to the opening line's words or image; it never introduces a new object or character | Skill |
| 16 | Never name a customer or client | write check (deny list) |
| 17 | Pop-culture callbacks welcome, especially 80s and 90s television and film | Skill |
| 18 | The principal speaks as an executive, peer to the reader, never reporting up to one | Skill |

Length: about 200 characters is the target, never a quota; the write check's hard ceiling is 280. The principal's own 2026 posts run far longer, so the short form is the agent's, not a compression of the principal's.

**The winning pattern** (the two highest-graded quips of round three share it): open on a universal management moment, swap the human for the agent on one real number from the records, close on the principal's own behavior. Of thirty graded samples the top scores were 10, 9, 8.5 and 7.5; round averages were 5.4, 4.4 and 6.15. Every technical quip failed on audience; every relatable, teaching quip had legs. The thirty samples, their scores and the principal's phrases load into the private store (AGT-544), never this file.

**Craft research as method, not copied text** (AGT-544 loads it, verified before writing): Vorhaus's comic toolbox (clash of context, tension and release, comic opposites, the wildly inappropriate response, the rule of nine); Helitzer and Shatz (reverses, pairings, triples); Dikkers's funny filters, the count read from the source, not recalled; and the LinkedIn preview cutoff, about 210 characters before "see more", which is why 200 is the target.

## 3. Architecture

- **`public.humor_records`** — his private store, zero public grants asserted both directions like `career_records`. Kinds: `draft` (text, voice, char_count, word_count, source_refs, self_grade, status), `grade` (the principal's 1–10 and his phrase, keyed to a draft or a sample), `correction` (a rule the principal stated; read before every render), `topic` (a scouted topic with its angle and rank reason), `research` (craft method summary with source URL), `phrase_set` (the descriptive phrases and the deny list).
- **`public.personal_sources`** + **`public.personal_source_grants`** — the principal's own material (kind `linkedin_post`, `style_sample`, later others), zero public grants, with one grant row per agent per kind. Dilbert → `linkedin_post`, `style_sample`; the career agent → `linkedin_post`. The principal grants by inserting a row; the shared script core reads only what the agent holds. His LinkedIn posts move here from the career agent's log records (which stay).
- **Two Capabilities:** `humor-weekly-draft` (Wednesday and, with grades applied, Friday) and `humor-topic-scout`. The Friday polish is the draft capability reading the week's grade and correction records, not a third capability.
- **Skills:** `hw-identity`, `hw-behavior`, `hw-knowledge-style` (voices, rules, themes, pattern, influences), `hw-knowledge-craft` (structure), `hw-guardrails`, `hw-weekly-draft-intent`, `hw-topic-scout-intent`. Method only; no personal fact, no product, customer or agent name in any row (the seed asserts it).
- **Topic ranking rule (the principal's, 2026-10-23):** topicality first — a hot news item with a matching quip, queued or newly made, leads; if nothing is hot, the most relevant topic in the queue.
- **North star:** one `agent_skill_pins` row for `deepbench-north-star`, rendered every run by `api/prompt/db-assembly.js`, same as the other two personal and product agents. A copy of the text is never made.
- **Call path (AGT-543):** `scripts/personal-agent.js` gains `humor-*` READ_MAP and EXTRA_READS entries (market records of the last 14 days, Napkin rows with a `dilbert_note` write-back column, granted personal sources, the week's ships and decisions, a news file the session fetched from the three named outlets) and a `--write` that refuses the whole answer when any draft breaks rules 1, 3, 6, 7, 8 or 16 or exceeds 280 characters. `docs/runbooks/humorist-agent.md` carries the ask table, the sequence, the tryout and the two routine prompt blocks as the SOURCE the routines copy.
- **AI Audit:** every run logs through `scripts/agent-log.js`, as the other two do (53 and 68 logged calls in the trailing 30 days on 2026-10-23).

## 4. Before the build and after it

- **Descriptive phrases.** The product marketing agent proposes the phrases that stand in for the agent platform and the dashboard software; the principal picks; AGT-544 loads them with the deny list. Until they exist the HELD sources in Q2 stay held.
- **Tryout.** Grading round four, attended: the principal scores 1–10 with a phrase; each score is a `grade` row, each phrase a `correction` row the next render reads. Bar: he posts one as written. Hire is his word; the routines are switched on by his hand only.
- **Personnel file.** Not visible in DeepBench until AGT-85 (sign-in plus row-level security for personal-lane agents) ships; the same limit the other two personal-lane agents have today.
- **Cost.** Both routines carry the STEP 0 meter stop. The cost review the principal asked for on 2026-09-25 for the other agent routines is still open and is a finding for the Governance Architect, not this design.

## 5. What this agent skips from `docs/AGENT-ARCHITECTURE.md`, stated as exceptions

As the career agent does: no deliverables-table row (drafts are private records, not sellable deliverables), no Agent Intelligence Score, no Knowledge Hunger states, no marketplace or BYOK economics, no Test Scorecard. **No roster entry in `src/data/agents.js`** (no AGENTS row, no AVATAR_CFG, no AGENT_PRONOUNS): measured 2026-10-23, the career agent has none either, because no product screen renders the personal lane and a pronoun entry with no AGENTS member reads as an orphan to the roster test. His pronouns (he/him) live in his agent row's bio and in this record until AGT-85 gives personal-lane agents a screen. The build therefore touches two repo files — the seed and its regression test — plus one migration applied over the Supabase MCP. Everything else — the full agent row with avatar and pronouns, the Skill/Capability data model, prompt assembly from rows, Rule #1 (no row names another agent), AI Audit logging — applies in full.

## 6. Reverse handles

- Need source: `runner_decisions` `e0605a1b-14f9-4ee9-9f9e-2a5120ed6882` (kind `john-ruling`, session `design-dilbert-1023`).
- Tickets: AGT-542, AGT-543, AGT-544 (`scope_origin` `john-named`, P1 - Improves John's Skills); each Victoria verdict carries its own decision id.
