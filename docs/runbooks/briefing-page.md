<!-- DeepBench v7.0.168 | runbooks/briefing-page.md | directive bee71cf4 — §4a, the DAILY OUTPUT card: a default-closed card under the reading card showing what John's meter moved between the first and last reading of each CST day, beside what the runner alone estimates it spent inside that same window. His line is quoted in the section. HE ASKED WHETHER THE DATA EVEN EXISTS AND IT DOES, measured rather than recalled: all 8 runner_usage_readings rows carry a real taken_at across three CST days (8/20 → 3 readings, 8/21 → 4, 8/22 → 1). THE ROW THAT WOULD HAVE SHIPPED A LIE: 8/22 has exactly ONE reading, and the obvious implementation renders its delta 0 — which says the day produced nothing, when the truth is there is nothing to measure from. It renders an em dash; the function returns NULL. Four rules live in public.daily_reading_output() (migration dirbee71cf4_daily_reading_output) rather than in the render, for the seventh time this platform has made the prose→code correction: the CST day boundary (B35), the one-reading NULL, a negative delta being a weekly meter RESET rather than negative work, and window-scoped rather than day-scoped token counting (9 cycles in 8/21's window against 12 in the day). Stated in the section so no cycle infers otherwise: this card CALIBRATES NOTHING — derive_token_allowance() still reads a night→morning bracket only, and a first→last window inside one day is precisely the mixed window SES-128 refuses to calibrate from. -->
<!-- DeepBench v7.0.166 | runbooks/briefing-page.md | John's directive 2026-08-22, verbatim: "The last recording for today's reading should be used and shown on the card as this mornings reading for 8/22". §4's rebuild rules gain the ONE thing that may move a reading out of `adhoc` — his own declaration — stated so that it cannot be read as softening SES-128's ban on inferring a slot from the clock. MEASURED BEFORE A LINE CHANGED, not recalled: all 8 rows in runner_usage_readings carried slot='adhoc', and the §4 card renders EXACTLY TWO rows, readingSlot('night') and readingSlot('morning') — there is no adhoc row — so John's 13:50Z reading was invisible on the card except for the derived "(adhoc)" tag in the acknowledgement line. He typed a number and the card showed him nothing; that is the defect, and his directive is the authorisation SES-128 said only he could give (its own header: slotting it "would manufacture a bracketing pair John never declared"). THE HALF THAT WOULD HAVE SHIPPED INVISIBLE: the slot lives in TWO homes — the ledger column and briefing-state.reading, which is what readingSlot() actually reads (it never queries Supabase) — so a DB-only update passes every SQL assertion and leaves the Morning row empty, i.e. passes QA while failing the only thing he asked for. Both homes moved, adhoc entry DELETED not copied, `at` preserved at 13:50Z rather than restamped. THE OTHER HALF THAT WOULD HAVE SHIPPED WRONG is a claim, not a line of code: this changes NOTHING about today's allowance. derive_token_allowance() still returns guard='no bracketing pair: no night reading' (asserted after the move), and tonight's night reading cannot pair with 8/22's morning either — the function takes the latest night then the earliest morning AFTER it, so the bracket runs forward. QA was discriminating rather than merely complete: a fixture night reading at 04:00Z inside a deliberately rolled-back transaction makes the real function return guard='ok' against morning_id=a7d31f60 (9.83h, delta 6, 2,540,000 tokens, 423,333.33 per pct) — a result that is IMPOSSIBLE if the reslot did nothing, since an adhoc row returns 'night reading has no morning after it'. Fixture rolled back, 8 readings restored, tokens_per_pct still NULL. The standing-rule half is NOT assumed and NOT built: filed as q-adhoc-morning-standing, because a Yes re-authorises the clock-time inference SES-128 refused. -->
<!-- DeepBench v7.0.164 | runbooks/briefing-page.md | SES-129 — §7 gains its data contract and the LOCKED SECTION ORDER marks the LAST unbuilt section built: every one of the fourteen is now live and the briefing redesign epic closes. The contract's hard parts are all in the split between STORED and DERIVED, and each is wrong in a way that looks fine. A consumed directive's verdict is READ from the new runner_directives.outcome/.outcome_note because it cannot be derived — measured live, runner_cycles.item_id holds a runner_items uuid, the directive's own id, and free prose across the 24 closed rows, the same backlog_items.title trap SES-91 tracks, and item_ref covers 3 of 24. Every LIVE state is DERIVED from type+status+expires_at instead, and the one that carries the ticket is `standing`: SES-111 property (2) makes a drain-epic sit at status='queued' forever BY DESIGN, so the natural render tells John the standing order currently serving him is "waiting to be picked up". The word under the textarea is "recorded", not the spec's "saved", and the reason is stated on the page as well as here — briefing-state's `directive` carries no timestamp where `reading` carries an `at`, so created_at is the HARVEST time and can lag his typing by a full cycle; the fix is named on the card rather than guessed. NULL outcome on a done row is a defect that renders red in `td.missing` (the page's existing vocabulary, not a second class), derived from stateOf() returning null so the flag cannot drift from the fact. And the to_char format is HH12:MI, never h:MI — a bare `h` is a literal and renders "Aug 22, h:23 PM", caught in this ticket's QA before it reached the page. -->
<!-- DeepBench v7.0.163 | runbooks/briefing-page.md | SES-128 — §4 gains its data contract and the LOCKED SECTION ORDER marks its readings half built. The card asks for TWO readings now, Night and Morning, each with its own Save, and the reason is the one thing a rebuilding cycle must not re-derive: John's meter is spent by his own manual sessions AND the runner, so a rate measured over any mixed window is confidently wrong, and only a night→morning bracket is runner-only by construction. The derivation, its four guards and the precedence of John's own budget_override over any derived number live in runner-cycle.md step 3 and are CITED here rather than restated — this file has already had to be resynchronised with that runbook twice (v7.0.118, SES-107) after a one-line summary drifted. Four rebuild rules ride with it: briefing-state.reading is slot-keyed and a legacy flat object migrates to `adhoc` rather than being dropped (John typed those numbers) but NEVER to a slot inferred from its clock time; the harvest stores slot on the row; an unslotted reading still feeds the rest and staleness walls and is not "ignored", it just cannot calibrate; and the card's "✓ latest reading" line is DERIVED from whichever slot holds the newest timestamp, never from a stored latest field — the same derive-don't-maintain rule as §1's counter and §10's resolution, for the same reason. -->
<!-- DeepBench v7.0.162 | runbooks/briefing-page.md | SES-127 — §10 gets its data contract and the LOCKED SECTION ORDER marks it built. The contract exists because the section's hard parts are all in the QUERY, not the markup, and each is wrong in a way that looks fine: the backlog_items join is LATERAL … LIMIT 1 (backlog_id is NOT unique — CHI-48 holds two rows, SES-86 phase 2's own QA found it, and a plain join silently doubles any skip on a duplicated ticket); "still skipped" is DERIVED from b.status NOT IN ('done','removed') rather than a maintained flag, so a shipped ticket leaves the section with no write and no rule for a cycle to forget; the sort is question-unblockable first because that is the difference between a thumb and a keyboard; and briefed_at is stamped AFTER the republish returns, never before, because stamping first eats the NEW chip on rows a failed publish never showed him. The Unblock column's live buttons record under a new briefing-state key `unblocks`, harvested in the tail like `answers` and `asks`; a `card` row's button is DISABLED and names the card that already carries the decision, because a second way to decide one thing is how two half-decisions get made. §10 rows carry no data-awaits — a skipped ticket is information, not a decision owed. Divergence from the mock is stated rather than left to be found: .tscroll, not .tblwrap, because nine columns with no min-width crush on a phone. -->
<!-- DeepBench v7.0.161 | runbooks/briefing-page.md | SES-126 — the LOCKED SECTION ORDER table marks §§8/11/13/14 built, and the page gains the four board tables' data contracts. The forward view of the queue is BACK: SES-124 struck “Next up — top 5” and the “Next 3” line and disclosed on its own card that the page would carry NO forward view until this ticket landed, so the gap runner-cycle.md step 9 describes is now closed — and the struck sections stay struck, the matrix is the forward view. Four contracts written down because each was MEASURED here rather than reasoned about, and each is wrong in a way that looks fine: §8's Queue is the DB's stored `queue` and its Title is the `gist` extract (imported tickets keep the class string in `title`, so a matrix keyed on it shows class names and no titles, until SES-91); §11 groups on the class DIGIT — by string the live now tier returns SEVEN rows for six classes, splitting P9 into 120 + 27 FLAGGED against a true 147 — and sorts zero-padded because P10 sorts before P2 lexically; §13's work_class→P-class mapping is fixed here, and P6 - Agent Enhancement has NO rung (six work classes, ten board classes) which is stated as a note rather than rendered as a blank row that would read “rung 0, not yet trusted”; §14 filters to the one production host (the dev URL is John, and 12,212 pre-LOG-134 rows carry no host at all), counts one use = one trace_id with model IS NOT NULL per LOG-81, resolves Name through visitor_labels → the FIRST CLAUSE of ip_org_cache.user_label → org because one live label is a 130-character paragraph, and renders Cost as — because cost_usd is NULL and a NULL shown as $0.00 claims the run was free. Plus: the two six-column tables scroll themselves (.tscroll) so the phone's page body never does, the two narrow ones deliberately do not, and none of the four folds. -->
<!-- DeepBench v7.0.160 | runbooks/briefing-page.md | SES-125 — the More-info contract is REVERSED and the ask box leaves the panel. v7.0.145 required the three plain-language fields and then put them behind a button while the technical record was the card's body — backwards against the directive that created them (edab5908: "you are giving too much technical jargon. I need a business value statement"). John's redesign settles it: plain language IS the body, `More info — the technical record` holds Value case / Before → after / QA evidence / meta / links, and nothing is deleted. The ask box moves out of the panel to sit under the buttons, always visible, with a "✓ Received <ts>" line, because a typed line counts the same as a tap and may not be hidden behind a second button; the button-meaning lines move with it and render under the buttons like §9's Yes/No consequences. §§5/6/9/12 are default-closed and numbered, a collapsed card carries number · kind · TICKET ID · title · decision state, and §12 vision claims are the SAME renderer as §9 with a class chip — one function, because "formatted exactly like Questions" is the spec's word and two near-copies drift. NEW RULE with teeth: a vision row's briefing-state key MUST start `vision-`, since claims and questions both land under `answers` and nothing else distinguishes them at harvest. Unchanged and restated because reversing which half is hidden changes neither: `plain_*` are READ from the row and NULL still draws the red defect line; both Yes/No consequence lines stay required; `data-awaits` still comes from state, and §12's rows now feed §1's counter. -->
<!-- DeepBench v7.0.148 | runbooks/briefing-page.md | SES-107 — the read-back contract's one-line ladder summary said "Accept → streak+1, 5 promotes", carrying the identical undefined-after-promotion blank as `runner-cycle.md` step 2 and in nearly the identical words. It now states the same rule John ruled on (`q-ladder-streak-reset` NO, 22:04Z): promote on every 5th Accept, `streak % 5 = 0`, streak never reset on promotion. CITED, not restated — this exact sentence drifting out of sync with the runbook is the failure `v7.0.118` fixed here once already, so the full rule (and the promote-every-tap runaway that removing the reset alone would cause) lives in step 2 and this line points at it. -->
<!-- DeepBench v7.0.146 | runbooks/briefing-page.md | directive dda69acb (+ twin 6b6cdd71) — the More-info panel's fields 1-3 are READ FROM runner_items.plain_cant/.plain_after/.plain_worth instead of being composed fresh at render time. Read them, do not re-author them; NULL renders the red defect line and is never coerced to ''. -->
<!-- DeepBench v7.0.159 | runbooks/briefing-page.md | SES-124 — the LOCKED SECTION ORDER section is added and the regeneration contract's ad-hoc structure list ("stat strip, Shipped, Gated, Needs-your-call, Trust ladder, Directive textarea") is replaced by it. Source of truth for the redesign is docs/BRIEFING-REDESIGN-0822.md (behavior) + docs/design/briefing-redesign-mock-0822.html (look/feel), John-approved 2026-08-22; the table names which of SES-124..129 builds each of the 14 sections, so a rebuilding cycle stops re-deriving the page's shape from prose. Three rules every later section must honour ride with it: §1's counter is COMPUTED from `data-awaits`, never typed by a cycle (the masthead may not be able to disagree with the cards beneath it; singular at 1, "Nothing needs you ✓" at 0); §2's day is the CST day, stated in the heading, matching the budget arithmetic's boundary and not a UTC day; and §3 is the ONLY place narrative prose belongs. The collapse framework's contract is written down here (fold()/.item.fold/.secwrap, one handler, and the rule that a fold NEVER publishes and never enters briefing-state — it is a view state, not a decision). John's explicit removals are listed as do-not-reinstate, and the one real cost is stated rather than left to be discovered: striking "Next up — top 5" and "Next 3" leaves the page with NO forward view of the queue until SES-126 ships §8/§11, which is the spec's own sequencing and is on SES-124's card so he can reverse it in one tap. -->
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
   page is already on his phone every morning)** **plus the `N decisions waiting` counter, and
   then the LOCKED SECTION ORDER below (`SES-124`, `v7.0.159`)**. **Language (John,
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

## The locked section order (`SES-124`, `v7.0.159` — spec: `docs/BRIEFING-REDESIGN-0822.md`)

John iterated this section by section in the `design-briefing-redesign` session and approved the
mock ("this is good"). **The spec doc is canonical for behavior; the mock
(`docs/design/briefing-redesign-mock-0822.html`) is canonical for look and feel; where they
disagree the spec wins.** Every rebuild renders these, in this order, with the section number
shown:

| # | Section | Built by |
|---|---------|----------|
| 1 | Masthead + `N decisions waiting` | `SES-124` ✔ |
| 2 | Daily activity (CST day) | `SES-124` ✔ |
| 3 | Today's findings | `SES-124` ✔ |
| 4 | Budget & usage (3 cards) + `4.1` Daily output, closed | `SES-124` ✔ frame · `SES-128` ✔ readings · dir `bee71cf4` ✔ daily output |
| 5 | Shipped | `SES-125` ✔ |
| 6 | Gated before build | `SES-125` ✔ |
| 7 | Directive queue | `SES-124` ✔ position · `SES-129` ✔ follow-through card |
| 8 | The queue (matrix) | `SES-126` ✔ |
| 9 | Questions | `SES-125` ✔ |
| 10 | Skipped — waiting on your input | `SES-127` ✔ |
| 11 | Now-tier by class | `SES-126` ✔ |
| 12 | Vision claims | `SES-125` ✔ |
| 13 | Trust ladder | `SES-126` ✔ class column |
| 14 | Who used DeepBench | `SES-126` ✔ |

**The forward view of the queue is BACK (`SES-126`, `v7.0.161`).** `SES-124` struck "Next up —
top 5" and the "Next 3" line and disclosed, on its own card, that the page would carry no forward
view of the queue at all until this ticket landed. §8 and §11 are that replacement and they are
now live, so the gap paragraph in `runner-cycle.md` step 9 describes a window that has closed.
**The struck sections stay struck** — do not reinstate them; the matrix is the forward view now.

### The four board tables' data contracts (`SES-126`)

Sections 8, 11, 13 and 14 are regenerated from live tables on **every** rebuild. Four rules, each
measured against the live board/log when this shipped rather than reasoned about — a rebuild that
re-derives any of them will get it wrong in a way that looks fine:

- **§8's Queue column is `backlog_items.queue`** — the DB's own stored number (`SES-86` phase 2),
  never a position the render counted out. **Its Title column is the `gist` extract, not
  `title`:** for imported tickets `title` holds the class string (`'P9 - Bug Fixes.'`), so a
  matrix keyed on it renders a column of class names and no titles. True until `SES-91` repairs
  the column, and it is the same rule the runbook already applies to anything that *displays* the
  queue. The heading states the window ("top N of M numbered") because a 12-row view of 565
  tickets that does not say so reads as the whole board.
- **§11 groups on the class DIGIT, never the `priority_class` string.** Measured live: grouped by
  string the now tier returns **seven** rows for six classes, because `P9 - Bug Fixes · FLAGGED`
  (27) is a different string from `P9 - Bug Fixes` (120) — John would read 120 bug fixes against a
  true now-tier **147**. The sort is zero-padded (`P01…P10`) for the same reason the queue's class
  sort is numeric: lexically `P10` comes before `P2`. The next/later footnote counts are live from
  the same table, never carried forward from the previous rebuild.
- **§13's class column uses a fixed mapping, written down so it is not re-derived:** `invention`
  → P02, `enhancement` → P05, `agent_creation` → P07, `determinism_removal` → P08, `bug_fix` →
  P09, `tooling` → P10. `runner_ladder` holds six work classes and the board has ten, so
  **`P6 - Agent Enhancement` has no rung**; the section says so in a note. Do not render it as a
  blank row — that reads as "rung 0, not yet trusted", which is a different and untrue claim.
  (`SES-122`, next bucket, is where rungs start unlocking autonomy.)
- **§14 is PRODUCTION only, and one use is one `trace_id`.**
  `request_host = 'deepbench.roadmapventure.com'` is the only production host in
  `ai_activity_log`; the dev URL is John himself under the standing dev-URL=John attribution rule,
  and `request_host IS NULL` covers 12,212 pre-`LOG-134` rows with no host recorded — so a looser
  filter files the runner's own traffic under "who used DeepBench". Calls are counted
  `FILTER (WHERE model IS NOT NULL)`, which is `LOG-81`'s standing rule that "AI calls" means real
  model calls and never raw rows. Name resolves `visitor_labels.user_label` → the **first clause**
  of `ip_org_cache.user_label` → `org`: one live cache label is a 130-character provenance
  paragraph that would otherwise become the Name column. **Cost renders `—` and must:** `cost_usd`
  is NULL on every production row today, and a NULL shown as `$0.00` claims the run was free,
  which is not the same as not knowing — the same rule that makes a NULL `plain_*` draw a red
  defect line instead of an empty string.

**Wide tables scroll themselves.** §8 and §14 are six-column matrices and this page is read on a
phone; both sit in a `.tscroll` wrapper so the table scrolls sideways and the page body never
does. §11 and §13 are narrow and deliberately do **not** get it — a scroll affordance on a table
that already fits reads as a table that is cut off. **None of these four sections folds:**
`SES-124` built the section-fold framework for §§5/6/9/10/12 and the spec marks only §10
default-closed.

### §4 — the reading card's two slots (`SES-128`, `v7.0.163`)

The reading card asks for **two** readings now, not one: a **Night** row and a **Morning** row,
each three percentages with its own Save button. Both render on every rebuild, in that order,
whether or not either is filled — a slot that disappears when empty is a slot John stops
remembering to fill.

**Why two, and it is the whole point of the ticket.** John's weekly meter is spent by his own
manual sessions *and* by the runner. A rate measured across any window that mixes the two is
confidently wrong. A window bracketed by his last reading of the night and his first of the
morning is **runner-only by construction**, and that pair — nothing else — is what
`public.derive_token_allowance()` reads. Full derivation, guards and precedence live in
`runner-cycle.md` step 3; they are **cited here, not restated**, because this exact sentence
drifting out of sync with the runbook is the failure `v7.0.118` and `SES-107` each had to fix in
this file already.

Four rules for the rebuild:

- **`briefing-state.reading` is slot-keyed** — `{night:{fable,all,h5,at}, morning:{…},
  adhoc:{…}}`. It used to be one flat object. A page published before `SES-128` carries that old
  shape, and the template **migrates it to `adhoc` rather than dropping it** — John typed those
  numbers. It migrates to `adhoc` and never to a slot: a reading whose slot was inferred from its
  clock time would manufacture a bracketing pair he never declared.
- **The harvest writes `slot` on the row it stores** (`runner_usage_readings.slot`, one of
  `morning` / `night` / `adhoc`). A reading harvested from anywhere that is not one of the two
  slot rows is `adhoc`.
- **An unslotted reading still counts for the walls.** It feeds the rest wall
  (`all_models_pct ≥ 85`) and the 48-hour staleness check exactly as before. It simply cannot
  calibrate. Do not treat `adhoc` as "ignored".
- **The card-level "✓ Your latest reading was recorded" line is derived** from whichever slot
  holds the newest `at`, never from a stored "latest" field — a second copy of the same fact goes
  out of step the first time a cycle forgets to update it. Same rule as §1's counter and §10's
  resolution: derive it, do not maintain it.
- **A reading leaves `adhoc` ONLY on John's explicit declaration — never on a cycle's inference
  (`v7.0.166`, John's directive 2026-08-22).** `SES-128`'s rule above says a cycle may not slot a
  reading from its clock time, and that is unchanged and not softened here. What this adds is the
  one thing that *does* authorise a move: **John saying so.** His line, verbatim — *"The last
  recording for today's reading should be used and shown on the card as this mornings reading for
  8/22"* — is a declaration about **one row on one day** (`a7d31f60`, `2026-08-22 13:50Z`), and
  `v7.0.166` moved that row to `morning` on it. Three boundaries travel with the rule, because the
  next cycle to read this will be tempted by all three:
  - **The move is in BOTH homes or it is invisible.** The slot lives in
    `runner_usage_readings.slot` (the ledger) *and* in `briefing-state.reading` (what
    `readingSlot()` actually renders — it reads the JSON block, never Supabase). A DB-only update
    passes every SQL assertion and leaves John's Morning row **empty**, which is the one thing he
    asked for. Assert on the **served page**, not just the row.
  - **MOVE, never copy, and never restamp `at`.** The `adhoc` entry is deleted in the same act;
    two homes for one fact is what `readingRecordedLine()`'s strict `>` comparison turns into a
    coin-flip. `at` stays the time the reading was **taken** — restamping it to rebuild time makes
    a morning reading claim it was taken in the evening, which looks identical today and poisons
    the width and direction checks of the first real bracket that includes it.
  - **The other seven `adhoc` rows stay `adhoc`.** He spoke about 8/22. Extending his sentence to
    rows he did not mention is the inference `SES-128` banned, wearing a permission slip.
  Whether this should become a *standing* rule — last un-slotted reading of each day is that day's
  Morning — is **his call and is not assumed here**; asked as a yes/no in `runner_questions`
  (`q-adhoc-morning-standing`), and a Yes would re-authorise exactly the clock-time inference
  `SES-128` refused, which is why it goes to him rather than being read into his line.

### §4a — the daily-output card (`v7.0.168`, directive `bee71cf4`)

A **default-closed** card numbered `4.1`, sitting directly under the reading card — John's ask,
verbatim: *"Create a card underneath readings that showcase daily out based on the first and last
readings of the day. Have the card collapsed by default."* One row per CST day that has at least
one reading, newest first. Regenerate it on every rebuild from **one call**:

```sql
SELECT * FROM public.daily_reading_output();   -- migration dirbee71cf4_daily_reading_output
```

**His first question was whether the data was even there, and it is** — measured before a line
changed: all 8 rows of `public.runner_usage_readings` carry a real `taken_at`, spanning three CST
days (8/20 → 3 readings, 8/21 → 4, 8/22 → 1). Nothing was reconstructed and nothing was lost.

Five rules for the rebuild. The first four are **inside the function on purpose** — a per-day
window each cycle re-derives by hand is a window that gets re-derived differently, which is the
same correction `SES-127`/`SES-128`/`SES-129` each made:

- **The day is an America/Chicago day** (register B35). The CST day begins at `05:00Z`, so a UTC
  grouping files most of a night's cycles under the wrong date.
- **A day with ONE reading renders an em dash, never `0`.** This is the rule that would have been
  got wrong, and 8/22 is the live row that would have carried the error: a zero says the day
  produced nothing, when the truth is there is nothing to measure *from*. Same vocabulary as a
  `NULL` `plain_*` drawing a red defect line and §14's `NULL` `cost_usd` never printing `$0.00`.
- **A negative all-models delta is a weekly meter RESET inside the window, not negative work.**
  `delta_all_pct` comes back `NULL` with `guard = 'meter reset in window'`; render the word, never
  the number. No such day exists in the eight readings that predate this card — the guard is there
  because a weekly meter resets by construction, not because one was observed.
- **`est_tokens_in_window` counts only cycles that STARTED inside the window**, which is not the
  whole CST day. Measured 2026-08-21: **9** cycles in-window against **12** in the day, so the
  scoping is not cosmetic.
- **The two figures on a row measure different things, and the headings must keep saying so.** The
  meter delta is John's whole account — his own manual sessions included; the token figure is the
  runner's own estimate. Presenting them as one number would be the confounding `SES-128` built
  the night→morning bracket to avoid, arriving through the back door.

**This card does not calibrate anything and must not be read as doing so.** `derive_token_allowance()`
still reads a night→morning bracket and nothing else (`runner-cycle.md` step 3); this card is a
report on what a day looked like, and a first→last window inside one day is exactly the mixed
window that function refuses to calibrate from.

### §7 — the directive follow-through card (`SES-129`, `v7.0.164`)

Two pieces sit under the directive textarea: an acknowledgement line, and the default-closed
card **"Your last 3 directives — what became of them"**. Both regenerate on every rebuild from
`public.runner_directives`; the migration is `ses129_directive_outcome`.

```sql
SELECT left(d.id::text,8) AS id8, d.type, d.status, d.outcome, d.outcome_note,
       to_char(d.created_at AT TIME ZONE 'America/Chicago','Mon DD, HH12:MI AM') AS recorded_cst,
       to_char(d.expires_at AT TIME ZONE 'America/Chicago','Mon DD, HH12:MI AM') AS expires_cst,
       (d.expires_at IS NOT NULL AND d.expires_at > now()) AS override_live,
       left(coalesce(d.acted_cycle::text,''),8) AS acted8,
       left(split_part(d.body, E'\n', 1), 76) AS john_line
  FROM public.runner_directives d
 ORDER BY d.created_at DESC
 LIMIT 3;
```

**Use `HH12:MI`, never `h:MI`.** In `to_char` a bare `h` is a literal, so `h:MI AM` renders
`Aug 22, h:23 PM` — caught in this ticket's own QA, before it reached the page.

Five things here are not style:

- **STORED vs DERIVED is the whole design.** A **consumed** directive's verdict is READ from
  `outcome` / `outcome_note`; every **live** state is DERIVED from `type` + `status` +
  `expires_at`. Do not add a stored value for a live state — those three columns cannot go stale,
  and a fourth copy of the same fact would.
- **Why the verdict had to become a column.** The natural derivation — join `acted_cycle` →
  `runner_cycles` and read `item_id` — cannot work: measured live when this shipped, that `text`
  column holds a `runner_items` uuid, the directive's *own* id, and free prose (one value is a
  96-character sentence) across the 24 closed rows. It would render John a column of uuids and
  half-sentences, the `backlog_items.title` trap (`SES-91`) again. `item_ref` is populated on 3
  of 24 and is no fallback either.
- **A standing drain-epic must NOT render as "waiting".** `SES-111` property (2): a drain is
  never consumed, so it sits at `status='queued'` **by design** while it is actively serving
  John every cycle. "Waiting to be picked up" would be the opposite of the truth about the
  directive he is currently being run by. Same for an unexpired `budget_override`: it renders
  *active until `<ts>`*.
- **The word is "recorded", not "saved" — and the limit is stated on the page itself.**
  `briefing-state`'s `directive` is a bare string with **no timestamp** (where `reading` carries
  an `at`), so the only time available is `created_at`, i.e. when a **cycle harvested** it — up
  to one cycle's cadence (~3h) after John typed it. Telling him "saved 4:23 PM" for a line he
  typed at 2:10 PM is confidently wrong in the exact place the page is acknowledging him. The
  fix — give `directive` an `at`, the shape `reading` already has — is named on `SES-129`'s card.
- **`NULL outcome` on a `status='done'` row is a DEFECT and renders red** (`td.missing`, the same
  vocabulary `.more .missing` already uses — not a second class meaning the same thing).
  `close_directive()` makes recording it unskippable, so a NULL there means the function was
  bypassed. The render derives the defect from `stateOf()` returning `null`, never from a
  separate flag — two copies of that one fact would drift, and the copy that drifts decides
  whether John sees the problem at all.

**The 24 pre-existing rows read "outcome not recorded", deliberately.** They were backfilled
uniformly to `closed_unrecorded` rather than reconstructed. Three sit beside a real shipped SHA
and their `outcome` could have been inferred — but the **note** is the half John reads and there
is no stored wording to recover, only wording a migration would invent. Same call `SES-128` made
for the eight unslotted readings. Stamping the value uniformly is also what lets `NULL` mean
*defect* from here on rather than *old row*. The card says this in John's register rather than
leaving him to wonder.

### §10 — Skipped, waiting on your input (`SES-127`, `v7.0.162`)

The section is the visible half of `SES-127`; the half that makes it possible is
`public.runner_skips` + `public.record_skip()` (migration `ses127_skip_records`, whose header
carries the six load-bearing properties). **Cycles record skips there — never as prose** —
see `runner-cycle.md` step 5. Regenerate §10 on every rebuild from this query, verbatim:

```sql
SELECT s.id, s.backlog_id, b.priority_class, b.queue,
       coalesce(b.design_status,'—') AS design_status, b.status,
       left(regexp_replace(coalesce(b.description,''),'^\*\*P[0-9]+[^*]*\*\*\s*',''),70) AS gist,
       s.reason, s.unblock_kind, s.unblock_ref, (s.briefed_at IS NULL) AS is_new,
       to_char(s.last_skipped_at AT TIME ZONE 'America/Chicago','Mon DD') AS skipped_cst,
       s.skip_count
  FROM public.runner_skips s
  JOIN LATERAL (SELECT bi.* FROM public.backlog_items bi
                 WHERE bi.backlog_id = s.backlog_id ORDER BY bi.id LIMIT 1) b ON true
 WHERE s.resolved_at IS NULL AND b.status NOT IN ('done','removed')
 ORDER BY (s.unblock_kind = 'question') DESC, s.last_skipped_at DESC;
```

Five things in it are not style, and each is wrong in a way that looks fine:

- **The join is `LATERAL … LIMIT 1`, not a plain join.** `backlog_id` carries no unique
  constraint and **`CHI-48` occupies two rows** (found by `SES-86` phase 2's own QA), so a plain
  join silently doubles any skip on a duplicated ticket. The `ORDER BY bi.id` matches the
  queue function's own final tie-break, so both readers pick the same row.
- **`resolved_at IS NULL AND b.status NOT IN ('done','removed')` — resolution is DERIVED.** A
  ticket that ships leaves this section with no write at all and no rule for a cycle to
  remember; `resolved_at` covers only the other case (ticket still open, blocker gone). This is
  the `SES-86` phase 3 / `SES-101` / `SES-111` prose→code correction applied by *deleting* a rule
  rather than writing one.
- **The sort puts `unblock_kind = 'question'` first**, then newest skip. It is the difference
  between rows John clears with one thumb and rows that need him at a keyboard.
- **The count chip is `N · M new`, both halves from this same query** — `N` is the row count,
  `M` is `is_new`. They are written into the template's one `SKIPS` object so the chip cannot
  disagree with the rows beneath it.
- **Stamp `briefed_at` AFTER the republish returns, never before:**
  `UPDATE public.runner_skips SET briefed_at = now() WHERE briefed_at IS NULL AND resolved_at IS
  NULL;`. Stamping first means a failed publish silently eats the NEW chip on rows John never saw.

**The Unblock column, and the one thing it must not become.** `question` and `prep` rows render a
live button that records into `briefing-state` under a new **`unblocks`** key
(`{ "<runner_skips.id>": {kind, at} }`), harvested in the step-9 tail exactly like `answers` and
`asks`. `card` rows render the button **disabled**, naming the card that already carries the
decision — a second way to decide the same thing is how two half-decisions get made about one
ticket. **A §10 row carries no `data-awaits`:** a skipped ticket is information, not a decision
owed, and inflating §1's counter with rows that need no tap is the masthead-disagrees-with-the-
page failure `countWaiting()` exists to prevent.

**Divergence from the mock, stated rather than left to be discovered.** The mock wraps §10 in
`.tblwrap`; the template uses `SES-126`'s `.tscroll`. Nine columns under `.tblwrap` have no
`min-width` and crush on a phone — `.tscroll` is the wrapper `SES-126` built for exactly this,
and it preserves the mock's look (a rounded, horizontally scrolling table) while keeping the
page body from scrolling sideways. The spec is canonical for behavior and it is unchanged.

**The three rules `SES-124` adds, which every later section must honour:**

- **§1's counter is computed, never typed.** Each undecided card / unanswered question / undecided
  vision row renders `data-awaits="1"`; `countWaiting()` counts them. A cycle must never write the
  number itself — the masthead is the first thing John reads and it may not be able to disagree
  with the cards beneath it. Singular at 1; `Nothing needs you ✓` at 0.
- **§2's day is the CST day** — 12:00 AM–11:59 PM America/Chicago, the same boundary the budget
  arithmetic uses (`runner-cycle.md` step 3), and it is stated **in the heading**, not assumed.
  Every stat is labeled and the tokens stat carries the **percentage as well as the absolute**.
- **§3 is the only place narrative prose belongs.** John removed the stray paragraphs that sat
  between sections; a cycle with something to say says it in Today's findings or not at all.

**Collapse framework (`SES-124`).** One card folds as `.item.fold` + `.head[data-toggle="<id>"]`
+ `.bodyc`, via the `fold(id, num, title, body, headExtra)` helper; a whole section folds as
`h2.clickable[data-toggle="<id>"]` over a `.secwrap`. One handler drives both. **A fold never
publishes and is never written to `briefing-state`** — it is a view state, not a decision, and
publishing reloads the view, which would shut whatever John just opened (the same reason More info
does not publish). `fold` is a modifier rather than a restyle of `.item`, so cards not yet
converted are untouched; that one word is the only difference from the mock's markup.

**Removed, on John's explicit instruction** — do not reinstate any of these without a fresh
ruling: the need-you stat pair, the footer note, the standalone "Needs your call" budget-override
section (**an override renders as a §9 question now**), the `Next 3` line, `Next up — top 5`, and
stray narrative outside §3.

> **Known gap, stated rather than discovered later.** `Next up — top 5` and the `Next 3` line are
> struck here, but their replacement — **§8's queue matrix and §11's now-tier census — ships in
> `SES-126`**. Until `SES-126` lands, the page carries **no forward view of the queue**. That is
> the spec's own sequencing, not an oversight, and it is on `SES-124`'s briefing card so John can
> reverse the order in one tap if losing that view for a few cycles is not acceptable to him.

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

**§12's SHAPE, since `SES-125` (`v7.0.160`) — a claim is a question row, not a card.** John's
spec word is *"formatted exactly like Questions"*, so the template renders §12 through the **same
`question()` function** as §9 rather than a second near-copy that has to be kept in step:
`visionClaim()` is a thin wrapper that adds a **class chip** (the `P1`–`P4` judgment class the
claim sets criteria for; "All classes" when broader) and swaps the ask box's three strings, since
John's own wording **replaces** a claim rather than asking about it. **Always three rows, always
default closed**, and a claim reappears every rebuild until it is decided — only silence carries
it forward. The three taps are unchanged: **Yes** ratifies to `HIGH`, **No** deletes it and
records it in `vision/rejected-paths.md`, a **typed line** replaces the claim in John's words and
resolves it.

**The one new rule, and it is load-bearing: a vision row's id MUST start `vision-`.** Claims and
questions both land in `briefing-state` under the **same `answers` key**, so at harvest time the
id prefix is the *only* thing that says whether an answer belongs to `public.runner_questions` or
to a claim in `docs/vision/*.md`. A vision row published with a bare slug would be harvested as a
question against a `qid` that does not exist — a silent no-op on John's tap, which is the one
failure a decision surface may never have. Use `vision-<doc>-<claim id>`
(e.g. `vision-thesis-C-thesis-30`).

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

**REVERSED BY `SES-125` (`v7.0.160`), on John's redesign — read this before the list below, which
now describes the card, not a panel.** `v7.0.145` made these three fields required and then put
them *behind the button* while the technical record stayed the card's body. That is backwards
against the directive that created them, and the mock John approved fixes it. The shape now:

- **Fields 1–3 are the card's DEFAULT BODY** — the first thing on an opened card, in `.plain`.
- **`More info — the technical record`** holds what used to be the body: Value case,
  Before → after, QA evidence, the meta line, the links. **Nothing is deleted** — the record is
  still on the card, one tap away, which is what makes the reversal a re-ordering rather than a
  removal.
- **Field 4 (what each button does here) leaves the panel** and renders as consequence lines
  directly under the buttons, in the same `.ynmean` row §9's Yes/No rows have carried since
  `v7.0.145`. A consequence John has to open a panel to read is one he decides without.
- **Field 5 (the thread, then the ask box) leaves the panel too** and sits under the buttons,
  **always visible**, with a **"✓ Received `<ts>`" line** once anything has been recorded for
  that target. John's typed line counts the same as a tap, so it may not be hidden behind a
  second button, and a line that vanishes with no acknowledgement reads as a line that was lost.
- **Cards and rows are default CLOSED and numbered** (`5.1`, `6.1`, `9.1`, `12.1`). A collapsed
  card carries **number · kind chip · ticket ID · ticket title · decision state** — enough to
  decide whether to open it, which is the whole point of closing it.

**Every card gets a `More info` button**, rendered between the plain-language body and the
decision buttons, opening the technical record. The three plain-language fields, in order, are:

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
   **Since `SES-125` this renders under the buttons, not in the panel** (`decideMeans()`).
5. **The conversation log**, then **the ask box** — **since `SES-125` both sit under the buttons,
   outside the panel, always visible** (`thread()` then `askBox()`).

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
