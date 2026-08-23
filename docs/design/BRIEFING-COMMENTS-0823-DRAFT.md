<!-- DeepBench v7.0.202 | design/BRIEFING-COMMENTS-0823-DRAFT.md | session briefing-sections — approved spec; 7 tickets filed (SES-154..160). Filename keeps -DRAFT because the 7 ticket descriptions cite this exact path; the Status line, not the filename, is authoritative. -->
# Briefing unified-card redesign — spec walkthrough draft (session briefing-sections, 2026-08-23)

Status: APPROVED BY JOHN 2026-08-23 (mock "looks good"; plan + epic "yes this has the epic
automation"). Behavior spec — canonical with the mock
(`docs/design/briefing-comments-mock-0823.html`, look/feel). Tickets filed same session, see
the Filing section at the end.

## Purpose (John, 2026-08-23, his framing)

The briefing's decision sections work like Jira issues: he can (a) accept/reject ticket
completion, (b) ask questions about functionality before deciding, (c) add requirements that
extend a ticket before acceptance, (d) see the whole history of comments between him and the
runner. All open text is **Comments**, stored in Supabase; every card renders its content from
Supabase — not md files, not the page's embedded JSON. Vision specifically exists to keep
Claude's understanding of DeepBench's business rich enough to **invent features John hasn't
thought of**, whose proposals become tickets automation picks up.

## Confirmed decisions

1. **Acceptance-gated completion (John: "yes").** Runner ship = ticket `delivered` (new
   status); only John's Accept writes `done`; his Reject reverts the work (forward revert +
   before-image restore) and reopens the ticket. Scoreboard counts (daily shipped, drain
   X-of-N) key on acceptance, not push. The runner never stalls waiting — it moves on.

2. **Two buttons: Accept / Reject (John: "yes keep reject").** Rework is not a button.
   Reject stays because a destructive revert must fire from a tap, never from prose; it is
   also the only terminal "don't build" on a gated card and the only exit from the board on
   the page.

3. **Comments carry a kind: Question / Requirement, default Question.** A Question changes
   no state; the next run answers it on the card and the card waits. A Requirement on an
   undecided card sends the ticket back for rework and re-delivery; a Requirement on/with an
   Accept files a follow-up ticket. Unlabeled = Question (cheap failure direction).

4. **Thread = spec context (John's Q→requirement flow).** When the runner acts on a
   Requirement it reads the whole thread, not just the flagged comment — a question, its
   answer, and "do that" are one requirement. Applies to every section. Optional UI later:
   a one-tap "make this a requirement" on an answer (John to rule during mock review).

5. **Vision is a knowledge loop, not a queue (John's purpose statement + adoption).**
   - Claims live in a Supabase table (single source); vision md essays keep prose only;
     `vision/rejected-paths.md` retires — a rejected claim is a kept row, since rejections
     teach what not to build.
   - The runner routes a vision comment into corpus update / research ticket / feature
     ticket, and **reports the routing back on the card** ("your comment became SES-xxx");
     a misroute costs John one correcting comment. John does not pre-label the route.
   - The section is two-directional: it also surfaces Claude's **invention proposals**
     (grounded in ratified claims, justification shown). Accept files the ticket into the
     queue; Reject stores it as a rejected path so it is not re-invented.
   - Every interaction must leave the corpus richer: the harvest writes what the thread
     taught back into the claims table, never just a status flip.

6. **The invention loop is class-driven across P1–P4 — John out of the product-manager loop
   (John, 2026-08-23).** The four judgment classes' locked purposes (ARCHITECTURE.md §19v
   priority order: P1 hireability/FAANG showcase · P2 hard-to-replicate uniqueness · P3
   investor/buyout value · P4 buy-pull "I have to buy this") become the ROOT claims of the
   vision table, seeded together with docs/JOHN-DECISION-PATTERNS.md. Per class the runner:
   (a) measures where its ratified criteria are thin and generates questions/research to
   thicken understanding — the "gathering information" half; (b) invents feature proposals
   that pass that class's pull test, surfaced as §12 invention cards with the class chip and
   justifying claims. John's only roles: accept/reject proposals and answer questions. This
   extends the existing §19v classification-authority delegation (Claude assigns and
   recommends, John governs after the fact via the briefing; Reverse/Rework feeds back into
   the corpus per SES-79) from classifying work to SOURCING it.

7. **The class purposes themselves are questions to John (John, 2026-08-23).** The four
   §19v purpose statements are seeded as root claims AND simultaneously presented as §12
   questions for him to clarify, correct, or restate in his own words — his answer is the
   ratified root, not the doc's paraphrase.

8. **Learning about the classes never finishes (John, 2026-08-23: "I don't think you can
   ever be done learning about them").** The drip always carries class-understanding
   questions; and the runner periodically presents a FINDINGS CHECKPOINT per class — its
   current synthesis of what the class means, asked as "is my understanding going down the
   right path for P<n>?" — as a card John confirms or corrects. Cadence: whenever new
   ratified material accumulates for a class, and John can demand one any time with a
   comment. There is no terminal "understood" state for a class.

## Proposed build shape (mine — for John's approval, not yet his)

- **Status:** `backlog_items` check constraint gains `delivered`
  (open · partial · delivered · done · removal proposed · removed). Runner ship writes
  `delivered`; harvest of Accept writes `done`; Reject restores prior open state.
- **One comments table** (working name `briefing_comments`): target_kind
  (ticket | question | vision | invention), target_ref, author (john | runner), kind
  (question | answer | requirement | routing | note), body, created_at, harvested_cycle,
  routed_to (ticket id a requirement became, nullable). Absorbs and retires:
  `runner_card_asks`, the card reason input, the question note input. Idempotent harvest,
  before-image convention unchanged (§19v).
- **`vision_claims` table:** claim ref, source doc, text, judgment class (P1–P4),
  confidence, status (proposed | ratified | rejected | rewritten), decided_at, provenance
  (comment/thread that produced or changed it).
- **Render source = DB.** Cycles rebuild threads from `briefing_comments`; the page's
  embedded briefing-state stays only as the un-harvested buffer for taps/comments made
  since the last rebuild (same tap-outranks-DB precedence the page already uses for
  settings). History never lives in the page.
- **Fixes riding along:** the Reject/require-without-typed-line silent-loss bug (every tap
  and every comment publishes immediately, comment box commits on blur too); §9.1 orphan
  threads retire — history is per-ticket in the DB and renders titled ID + title.
- **Trust ladder: settled rulings untouched.** Accept of delivered shipped work = rating
  (streak % 5 promotion, no reset); gated Accept = permission, no ladder (B34); Reject
  demotes and zeroes streak on both card kinds (B35 "leave it"). Acceptance-gating changes
  *when* the rating lands (at his tap, as today), not the arithmetic.

## Filing (2026-08-23, this session — all in epic Automation, John: "yes this has the epic automation")

Chain A: `SES-154` acceptance-gated completion → `SES-155` briefing_comments table →
`SES-156` unified card template (all Tooling · `P10 - Tooling`).
Chain B: `SES-157` vision claims to DB + class-purpose seeding → `SES-158` comment routing
(both Tooling · `P10 - Tooling`) → `SES-159` perpetual class-understanding loop → `SES-160`
class-driven invention engine (both Feature · `P1 - Improves John's Skills`).
Chains independent; order binds within a chain and is stated in each description.
NOTE: queue sorts P1 above P10, so SES-159/160 hold queue 5/6 ahead of their prerequisites
(245–249 at filing). A cycle reaching them early must honour the stated dependencies; John
can pin the chain heads with a directive line if he wants the chains served first.
None are drain members (filed after the b74009ea naming). design_status left NULL —
per-ticket kickoffs are the building cycle's job; this spec is the shared design source.

## Mock review — RESOLVED (John, "looks good", 2026-08-23)

- Mock `docs/design/briefing-comments-mock-0823.html` approved as shown. Per precedent the
  mock is canonical for look and feel; this file is canonical for behavior.
- §9 runner-question rows keep **Yes / No** button wording (uniform anatomy, per-kind verbs).
- The **"→ make this a requirement"** tap on an answer is kept.
- Answer latency stays next-run; a live in-page answer is a separate future capability
  ticket, out of this scope.
