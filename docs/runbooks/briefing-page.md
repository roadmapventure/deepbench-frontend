<!-- DeepBench v7.0.148 | runbooks/briefing-page.md | SES-107 — the read-back contract's one-line ladder summary said "Accept → streak+1, 5 promotes", carrying the identical undefined-after-promotion blank as `runner-cycle.md` step 2 and in nearly the identical words. It now states the same rule John ruled on (`q-ladder-streak-reset` NO, 22:04Z): promote on every 5th Accept, `streak % 5 = 0`, streak never reset on promotion. CITED, not restated — this exact sentence drifting out of sync with the runbook is the failure `v7.0.118` fixed here once already, so the full rule (and the promote-every-tap runaway that removing the reset alone would cause) lives in step 2 and this line points at it. -->
<!-- DeepBench v7.0.146 | runbooks/briefing-page.md | directive dda69acb (+ twin 6b6cdd71) — the More-info panel's fields 1-3 are READ FROM runner_items.plain_cant/.plain_after/.plain_worth instead of being composed fresh at render time. Read them, do not re-author them; NULL renders the red defect line and is never coerced to ''. -->
<!-- DeepBench v7.0.145 | runbooks/briefing-page.md | directive edab5908 — John: "often your wording is very confusing and does not make sense to which button to push, or i don't understand the issue." New section "More info, and asking me a question from the page": every card and question row gains a More info panel (what you can't do today / what you could do after / why that's worth something / what each button does here), Yes/No rows carry their consequences under the buttons, and John can type a question on any card — recorded to public.runner_card_asks (migration ses105_card_asks) and answered on that card by the next cycle, thread kept. The live in-page answer (his conditional "if possible") is carded, not built. -->
<!-- DeepBench v7.0.135 | runbooks/briefing-page.md | SES-99, directive 48ae1939 — John's line: "create a question list for the briefing with a radio yes/no, instead of listing a full paragraph and i have to type out the answer." The "Help me — the questions" paragraph becomes a tappable yes/no list backed by the new public.runner_questions table; answers ride the briefing-state block under a new `answers` key and are harvested exactly like card decisions. Silence is never an answer. -->
<!-- DeepBench v7.0.129 | runbooks/briefing-page.md | SES-96 — regeneration step 4 added: never shell-process the WebFetch result's saved file. John's captured permission prompt (2026-08-21) showed the rebuild sed-slicing the prior page's HTML out of ~/.claude/projects/…/tool-results/ — a permission-gated path that parks an unattended cycle exactly like a .claude/ write. Parse briefing-state in context; rebuild structurally from briefing-template.html + the runner_ tables. -->
<!-- DeepBench v7.0.121 | runbooks/briefing-page.md | directive 1d01ea85 — two changes from John's line. The read-back contract's Reverse-on-gated sentence stops calling the asymmetry an open question: he answered "leave it", so it is settled and the page stops carrying it. And the regeneration contract gains the died-mid-run line: when a cycle has gone silent since the last rebuild the page says so — which cycle, how long, what it had picked, what John needs to do — because v7.0.106 deliberately kept the lease and its `steals` counter off this page, leaving a death visible only as a stat-strip number. The push (runner-cycle.md step 0b) is the primary channel; this is the durable copy. Same honesty limit as the push: observable state and a named hypothesis, never an invented cause, and never the word "died" before something proves it. -->
<!-- DeepBench v7.0.118 | runbooks/briefing-page.md | directive fb643367 — the read-back contract's one-line ladder summary said "Accept streak+1, 5 promotes" with no card-kind distinction, which is exactly the sentence John's Q1 ruling retires. It now updates the ladder from `shipped` cards only; a `gated_before_build` Accept is permission, not a rating. The full rule is CITED from runner-cycle.md step 2 rather than restated, because this line drifting out of sync with the runbook is the failure being fixed. -->
<!-- DeepBench v7.0.99 | runbooks/briefing-page.md | S-SES-78b — the Morning Briefing page: URL, regeneration contract, decision read-back. -->
# Runbook — The Morning Briefing Page (`SES-78b`)

**Live URL (permanent — every redeploy keeps it):** `https://claude.ai/code/artifact/4c22b9b1-6b14-4092-b728-1756a59b3173`
Published 2026-08-19 (v7.0.94) with `capabilities: {artifact: {}}`, favicon 🌅, title
"DeepBench Morning Briefing". Design: Treasury tokens verbatim (`src/tokens.js` — paper/navy/
brass; Fraunces/Inter/JetBrains Mono; moss = Accept, flag = Reverse, brass = Rework).
Governing design: `docs/SES-78-RUNNER-DESIGN.md` §3; architecture `ARCHITECTURE.md` §19v.

## Regeneration contract (every cycle, step 9)

**Times rule (John, Rework 2026-08-20): every date/time DISPLAYED to John — page header, verdict
lines, cycle timestamps, "at" stamps — is converted to CST (America/Chicago) and labeled CST.**
Store UTC internally as before; the conversion is display-only.

1. Build the day's HTML from `runner_items` / `runner_cycles` / `runner_budget` /
   `runner_ladder` — same structure as the live page: masthead **(which carries a one-tap
   "▶ Run a cycle now" link to `https://claude.ai/code/routines` — `SES-102`, John's ask
   2026-08-21: the routines page works in his phone's browser and has the Run button, and this
   page is already on his phone every morning)**, stat strip (shipped /
   gated before build / reverted / day spend / month left), Shipped cards, Gated before build,
   Needs-your-call (budget overrides), Trust ladder, Directive textarea. **Language (John,
   2026-08-20):** outcomes display as "did not run" / "gated before build" (data values
   `did_not_run` / `gated_before_build`; `noop`/`proposal` retired), and every P-class is
   written named (`P10 - Tooling`, never bare `P9`) — see the Language block in
   `runner-cycle.md`. **Budget & usage cards (John, 2026-08-20):** an API-dollars card with the
   dev/QA split bar against the $5 day / $100 month walls; a subscription-tokens card with the
   same dev/QA split bar, the runner's token use by model, John's latest reading + the
   calibration sentence; and the reading-entry card (Fable % / All models % / 5-hour % + Save,
   persisted through the `briefing-state` block like the directive box) — on every rebuild.
   Mock John approved: artifact `ca23ace7-c2e3-465d-bac4-089daff812d2`. Every card carries: `id="item-<ID>"`,
   kind chip, `ID (Type · named P-class)`, title, Value case, Before → After, QA evidence, meta
   (cost / model / push SHA), links (dev URL; flagged items also the flag-ON link), the three
   buttons, hidden reason input, verdict line.
   **Went-silent line (John, 2026-08-21, directive `1d01ea85`, register B35):** whenever a
   cycle went silent since the last rebuild, the page carries it — which cycle, how long it was
   quiet, what it had picked, and what (if anything) John needs to do. The `steals` counter and
   the lease were deliberately kept off this page when `v7.0.106` built them, so the only record
   was a stat-strip number; John has since asked to be told **why it died and what to do next**.
   The push is the primary channel (`runner-cycle.md` step 0b) — this line is the durable copy,
   so a missed notification does not erase the event. **Two honesty limits, both from `B37`:**
   observable state and a named hypothesis, never an invented cause; and the page says **"went
   silent"**, never "died", because two cycles this page called dead were still working and came
   back nine hours later. If the cycle later returns and finishes, the line is **updated, not
   deleted** — John should be able to see that a silence resolved. **Also required on every
   rebuild: the open-questions list**, per "The question list (every rebuild — SES-99)" below.
2. **Republish to the SAME URL** — pass the URL above as `url` to the Artifact tool (a publish
   without `url` from a new conversation creates a stray page; never do that). Same favicon.
3. **Before rebuilding, READ the current page first** (WebFetch the URL) and harvest John's
   state — rebuilding without harvesting destroys un-acted-on taps.
4. **Never shell-process the fetched page's saved file (`SES-96`, 2026-08-21 — John captured the
   prompt).** WebFetch saves its result under `~/.claude/projects/<project>/tool-results/…`, and
   **any Bash command touching that path (sed/grep/head/cat, read or write) fires the harness
   permission prompt only a human can see** — John's screenshot caught exactly this: a cycle
   sed-slicing the prior page's HTML into head/prologue/epilogue parts, parked on
   "Allow Claude to run Extract reusable head, code prologue, code epilogue?". The safe procedure,
   which needs no shell at all: parse the `briefing-state` JSON **in context** from the WebFetch
   response, and rebuild the page **structurally from `docs/runbooks/briefing-template.html` +
   the `runner_` tables** (the contract below already says this) — never by slicing the previous
   page's HTML out of harness storage. The same rule generalizes: a cloud cycle runs **no Bash
   command against any `~/.claude/` path**, mirror of `runner-cycle.md` step 0's `.claude/` rule.

## Vision-corpus drip cards (every rebuild — `SES-84` phase 2, register B13, `v7.0.134`)

Each rebuild includes **1–3 vision claim cards** (~15 min/day of John's time max, his rule) drawn
from `docs/vision/*.md`: pick the highest-value unratified claims — `LOW` confidence first, then
`MED`, then each doc's "Open questions for John" — never more than 3, never zero while unratified
claims remain. Card face: the claim sentence phrased as "X because Y — true?", its doc + claim id
(`C-thesis-4`), and the three buttons. **Accept** ratifies: the cycle edits that claim line to
`HIGH` with `(ratified <date>)`. **Rework** replaces the claim text with John's line verbatim,
marked `HIGH (John's words, <date>)`. **Reverse** deletes the claim and records it in
`vision/rejected-paths.md` if it asserts a path. Decisions ride the same `briefing-state`
harvest as every other card; the corpus edit lands in the cycle's normal ship commit. On-demand
bursts ("I have X minutes") serve claims rapid-fire in chat, same bookkeeping.

## The question list (every rebuild — SES-99)

Every rebuild renders the **open rows of `public.runner_questions`** (`status='open'`) as a
question list, one row per question: the yes/no sentence, one clause of context, and two
buttons — **Yes** and **No**. This section **replaces** the old prose "Help me — the questions"
paragraph; register B29's daily help-me **ticket** is unchanged and stays — it is a backlog
card, not a question.

The rule that earns the section: **a question that cannot be asked as yes/no is not ready to be
asked.** It belongs on a `gated_before_build` card with a concrete proposal instead — never ask
John to compose prose to answer a question.

A tap records into the `briefing-state` block under a new `answers` key, shape:
`{"<qid>": {"a":"yes"|"no","at":"<iso>Z","note":""}}` — and self-publishes through the same
`claude.use('artifact').publish(doc)` path every card already uses. An optional one-line note
input appears after the tap and is **never required**.

Harvest: answered questions are written to `runner_questions` (before-image first) with
`status='answered'` plus `answer`/`answered_at`/`answer_note`/`acted_cycle`, and drop off the
next rebuild; unanswered ones carry forward. **Silence is never an answer**, exactly as silence
is never an Accept.

Cap it: **at most 5 open questions on the page at once, newest-asked first**, so the list never
becomes the paragraph it replaced.

The measured reason this shipped, stated as fact: the old questions section was a `<p>` with no
controls in it, so **not one question could ever be answered through it** — every answer John
has given arrived as a hand-numbered line typed into the **directive** box (`runner_directives`
`fb643367` "1.no 2. Updates every 5 hours 3.I don't know how to answer" and `1d01ea85` "1.leave
it 2. Midnight cst 3.need to know why it died"), which the next cycle then had to map back onto
the questions by guessing — and one of those answers is literally *"I don't know how to
answer"*, which is what a question costs when it is asked in prose. Meanwhile, over the same
week, **37 of 37 cards were decided by tap, none left open** (counted from `runner_items`
2026-08-21T17:0xZ, not quoted). Questions were the last thing on the page still asking for
sentences.

## More info, and asking me a question from the page (every rebuild — directive `edab5908`, `v7.0.145`)

John, 2026-08-21, directive box, verbatim: *"For each question, and each ticket accept/reject,
need another button - "More Info" - often your wording is very confusing and does not make sense
to which button to push, or i don't understand the issue. I need to be able to ask questions
about the issue. But would like to be able to solve them in the brief."* Two of the four taps on
that same page were **Rework**, and both said the same thing in different words: *"i don't
understand what you are trying to get at here - please simply your ask"* and *"You need to
summarize better what is happening. i don't understand, you are giving too much technical
jargon. I need a business value statement - what can't the user do today? What would they be
able to do after? How does this make the platform more valuable?"* Those three sentences are the
panel's three fields. They are not a suggested format; they are the format.

**Every card gets a `More info` button**, rendered above the decision buttons so the reading
comes before the choice, opening a panel with, in order:

1. **What you can't do today** — the gap, in a sentence a person outside this repo would follow.
2. **What you could do after** — the same sentence from the other side.
3. **Why that's worth something** — the platform-value claim, plainly.

   **Fields 1–3 are READ FROM THE ROW, not composed at render time (`v7.0.146`, directive
   `dda69acb`).** They live in `runner_items.plain_cant` / `.plain_after` / `.plain_worth`, written
   by the cycle that FILES the card (`runner-cycle.md` step 9). `v7.0.145` shipped them as a
   per-card JavaScript object literal, which meant the words existed only inside one rebuild's
   HTML — so **register B18 was unfollowable for this part of a card**: "build cards FROM the DB's
   undecided set, never from memory" cannot be obeyed when the DB has no column to read, and the
   next cycle to rebuild had to re-invent the wording for a card it never wrote. Read them; do not
   re-author them. **A `NULL` renders the red defect line and must never be coerced to `''`** —
   that line is the point (see "No summary, no silence" below), and an empty string would turn a
   missing summary into a convincing blank, which is the exact failure the defect line exists to
   make visible.
4. **What each button does *here*** — Accept / Reverse / Rework, spelled out **in this card's own
   terms**. Defaults differ by card kind and the difference is real, not cosmetic: a gated Accept
   is permission and never touches the ladder (John's B34 ruling), a shipped Accept is a rating.
   A cycle may override any of the three when the generic sentence would mislead.
5. **The conversation log**, then **the ask box**.

Three rules that keep this honest, each of which the template enforces rather than trusts:

- **No summary, no silence.** A card rendered without its three fields shows a red line saying
  the cycle that wrote it is at fault. A blank panel that looked plausible would be worse than
  the jargon it replaced, and this is also the negative control the QA leans on: an
  implementation that merely rendered *a* panel would pass a completeness check and fail this.
- **Opening the panel publishes nothing.** A publish reloads the view, which would slam the
  panel shut the instant it opened. Only a decision, an answer, or an ask publishes.
- **The three fields carry no ticket IDs, no table names, no register letters.** If a sentence
  needs one to make sense, it is not written yet.

**Yes/No rows carry their consequences under the buttons** (`ynMeans`): John, same directive —
*"Your yes/no did not clarify that statement. i need to you to make your yes/ no better
understood. Perhaps make a statement next to the button, so it clarifies it."* `question()`
takes `yesMeans` and `noMeans` and renders `Yes → …` / `No → …` beneath the button each one
describes. **Both are required**; a question row missing them renders the same red defect line.

**The ask box and the log — `public.runner_card_asks` (migration `ses105_card_asks`).** John
types a question in his own words on any card or question row and presses Enter. It records into
`briefing-state` under `asks`, shape
`{"<targetId>": [{"q":"…","at":"<iso>Z"}, …]}` — **an array, appended to, never replaced**,
because he asked for *"a log of the conversation if its needed to update the ticket."* `targetId`
is the card's `runner_items.id` or the question's `qid`, so the page and the ledger cannot drift.
A blank or whitespace-only Enter records nothing.

Harvest, in the step-9 tail: for each ask, INSERT into `runner_card_asks` (before-image first,
`row_data = NULL` — the INSERT convention). The insert is idempotent by the
`uniq_card_ask (target_id, asked_at, question)` constraint, which is load-bearing: **the page
keeps every ask in `briefing-state` forever, so every cycle re-reads asks it has already
stored.** Then, on the rebuild, **answer every `status='open'` row on its own card** — write
`answer`/`answered_at`/`answered_cycle`, set `status='answered'`, and render the whole thread
(his question, your answer, in order) inside that card's panel. An unanswered ask renders as
*"Not answered yet"* rather than as blank space that reads like it was ignored.

**What this is NOT, and it is the half John marked conditional.** He wrote *"b) **if possible**,
make it so i can get a response from in the brief based on my questions"* — a live answer while
he is standing there. This ships the deferred loop: he asks now, the next cycle answers on the
card. The live version needs the artifact `sample` capability (the page asking Claude directly)
and is carded, not assumed.

## Decision read-back contract (every cycle — the WRITES now run inside step 9's serial tail under the publish lease, register B42, 2026-08-21; step 2 reads only) — CORRECTED after live QA 2026-08-19

**Found live during SES-78b's own tap QA:** this artifact is a *classic* artifact, not a live
doc — DOM gestures do NOT auto-persist (the first build assumed they did; John's taps ran the
script and saved nothing). The shipped mechanism: **the page holds all mutable state in a
`<script type="application/json" id="briefing-state">` block, renders itself from that state,
and every decision self-publishes a complete replacement document via
`claude.use('artifact').publish(doc)`** (owner-authority; read-only viewers get `not_writer`
and the page degrades to read-only). Canonical implementation:
`docs/runbooks/briefing-template.html` (same directory) — regenerate structurally from it.

Read-back is therefore trivial: **WebFetch the URL and parse the `briefing-state` JSON block**
from the served document —
`{"items": {"item-<ID>": {"decision": "accept|reverse|rework", "reason": "...", "at": "<iso>Z"}},
"directive": "...", "reading": {"fable": "41", "all": "38", "h5": "12", "at": "<iso>Z"} | null}`
— a non-null `reading` newer than the last `runner_usage_readings` row becomes a new row there
(step 2), and the rebuild re-seeds the inputs from it. Proven live: John's mobile taps (`rework` + typed reason on the test card,
`accept` on SES-78a) read back verbatim. Non-empty `directive` text becomes a
`runner_directives` row (verbatim) and is cleared in the rebuild. Override approvals ride the
same state block when Needs-your-call cards exist.

Harvested decisions are written to `runner_items.decision/decision_reason/decided_at` and the
ladder is updated before any new work starts — **but only from `shipped` cards.** On a
`shipped` card: Accept → streak+1, promoting on **every 5th** Accept (`streak % 5 = 0`) with the
streak left running — **never reset on promotion** (John, `q-ladder-streak-reset` **no**,
2026-08-21T22:04Z; full rule and the runaway it avoids: `runner-cycle.md` step 2 — cited, not
restated); Reverse → streak 0, demote; Rework neutral. On a
`gated_before_build` card, **an Accept is permission to build, not a rating, and does not touch
the ladder at all** (John, 2026-08-21, directive `fb643367`, register B34) — it authorises that
one build and re-enters the ticket at queue #1 (B23). **A Reverse on a gated card still demotes,
and that is now settled** — asked directly, John answered "leave it" (2026-08-21, directive
`1d01ea85`, register B35). It is his ruling, not an unclosed asymmetry: **the page stops
carrying it as an open question.** **The full statement, including why the history is not re-derived, lives in
`runner-cycle.md` step 2 — do not restate it here, cite it**, so the two runbooks cannot drift
the way this line did. Un-decided cards carry forward to the rebuilt page —
**silence is never an Accept.**

Two consequences for the page itself, both required on every rebuild: a gated card's buttons
must not be captioned or described as rating the work (Accept there means "yes, do this"), and
the trust-ladder table's note must not attribute a rung movement to a gated tap.

## Standing facts

- Buttons write only for the page owner (John's Claude account) — this is the auth for the
  decision loop until Clerk lands, when the surface migrates into Super Admin (`ADM-1`).
- The canonical first-publish HTML lives in git at this commit alongside this runbook
  (`scratchpad` original; regenerate structurally, don't byte-copy — content is per-day).
- Page shows real numbers only — a rebuilt page must never carry invented spend/QA values;
  every figure traces to a `runner_` row or a session log (§19d sniff test applies).
