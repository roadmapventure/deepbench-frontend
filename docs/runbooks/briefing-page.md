<!-- DeepBench v7.0.231 | runbooks/briefing-page.md | SES-178 — NEW §15, the Project panel: the locked section order gains its first new top-level section since §2b, APPENDED and never a renumber (John's placement call on gated card a8eaee1d, the SES-132/§2b precedent — renumbering silently invalidates every §-reference in this file, runner-cycle.md and the spec). It renders docs/SELFBUILD-CHARTER.md's CANONICAL progress query, which the charter itself introduces as ‘answers how close are we any time, BEFORE SES-178 renders it’. FOUR RULES AN EDITOR WILL BE TEMPTED TO COLLAPSE, all in §15's data contract below: (1) done is status='done' and NOT delivered — the same boundary §2's Shipped-today keeps (SES-154); folding delivered in reports the project further along than John has agreed it is, the one direction this number must never err. (2) AN EPIC'S COMPLETION IS NOT ITS DRAIN'S COMPLETION and the footnote saying so is mandatory — a drain retires on the members John NAMED (runner_drain_scope, SES-142) and a ticket filed into the epic afterwards never joins it; MEASURED at this ship, M0's and M1's drains are BOTH retired while M1 reads 46.7%, which is correct rather than a gap, and without the footnote a reader infers retired=100% and the charter's own finish line becomes unreadable. (3) The charter's keystone metrics (verifier catch rate vs John's Rework rate, John-minutes/week, drift findings/week) are NAMED ABSENT, never rendered as zero — none is online, they wait on SES-181's verifier lane, and a zero would be a claim about performance where the truth is absence; same rule as §14's cost showing ‘—’. (4) NO NEW CSS, which is not thrift: every rule added to #s sits ABOVE the briefing-state block in the served document and pushes it further out of a size-bounded read — the live SES-188 defect, which truncated this very cycle's harvest on the 235.7 KB page. DISCLOSED RATHER THAN SMUGGLED: the builder derives the three numbers from two flat PostgREST selects because PostgREST cannot run the charter's GROUP BY join and this builder has no generic exec by design; that is a SECOND EXPRESSION of the query, not a second source of truth, and the one-executable-home fix (a selfbuild_progress() function the charter cites) is the ticket's named remainder, not done here because the migration plus the charter edit would put SES-178 at five files against CLAUDE.md's ≤3 cap. QA was discriminating rather than merely complete: the builder was run against a template copy whose §15 sample values were POISONED, and the output carried the live values with zero poison surviving; separately the anchor-missing arm fired for real (exit 2, ‘ANCHOR MISSING: §15 rows’) when the anchor itself was broken, proving the builder refuses rather than publishing a changed template — the SES-162 defect it exists to prevent. Guarded by tests/regression/SES-178-project-panel.js: 12 of 12 clauses fail on origin/dev's files, 12 of 12 pass on these. -->
<!-- DeepBench v7.0.216 | runbooks/briefing-page.md | SES-188 — the decision read-back contract gains the TRUNCATION TEST. The harvest is not blind, it is truncation-dependent: both documented read paths are the SAME artifact-reader interception (WebFetch on a claude.ai/code/artifact URL returns the identical wrapper the Artifact read action does) and differ only in how much head each returns. Measured live 2026-08-24 03:22–03:23Z on the 198.3 KB served page, four seconds apart: Artifact read stopped inside the frame-runtime script and never reached briefing-state; WebFetch cleared the head, the COMPLETE briefing-state block, and ran on into <script id="code">. THE THING A LATER EDITOR WILL BE TEMPTED TO WRITE HERE AND MUST NOT: "use WebFetch, it works". That is one observation against a same-night cycle reporting the opposite; the cut-off is a SIZE BUDGET and this page grows every rebuild, so a cycle that trusted the tool and rebuilt from a short read would publish the empty skeleton and destroy John's un-harvested taps — the exact failure v7.0.197's seed sentinel exists to prevent. Hence a test on the RESULT (block present, parseable, and carrying a value provably live) with two branches: verified → rebuild; unverified → decline the republish, still mandatory and still what 598a9b81 and e42f8d4e correctly did. Cost of declining is stated rather than hidden (18 undecided cards by 03:2xZ). SES-188 stays OPEN for the durable fix; none of its three candidates is chosen here. -->
<!-- DeepBench v7.0.213 | runbooks/briefing-page.md | SES-171 (Selfbuild M1) -- the 30-stamp header pile is TRIMMED to the newest stamp, the SES-164 shape applied verbatim: 29 stamps (40,843 bytes, 32.5% of the file) moved VERBATIM to docs/SESSIONS.md 'Appendix -- retired briefing-page.md header stamps'; every stamp probed for stamp-only warnings (none found -- all restated in body); body sha256-identical across the trim (20445487a5c91162). Three stale contracts fixed same pass: step 1 masthead run-now link (SES-143 owns it in 2b), 12's SES-125 rejected-paths paragraph (SES-157 form), step 6 successor-run wording (SES-140 in-session chain). Cap: session-hygiene stamp-cap check. -->
<!-- DeepBench v7.0.208 | runbooks/briefing-page.md | SES-165 (2026-08-23) — step 1c's boundary rule is REWRITTEN and the v7.0.199 / directive 16b3ff73 gated-only carve-out is SUPERSEDED: a card now retires when its ticket is TERMINAL (done/removed), whatever its kind, and `delivered` always renders. The old rule was right for exactly one day. It reasoned that a gated card asks PERMISSION (moot once built) while a ship card asks for a RATING (the trust ladder's only input, "meaningful forever") — sound while a ship wrote `done` itself. SES-154 (v7.0.205) moved the rating one stage earlier: a ship now writes `delivered` and ONLY John's Accept writes `done`, so a rating-in-waiting sits on a `delivered` ticket and never on a `done` one. A ship card on a `done` ticket therefore means the verdict already happened — retiring it starves nothing. MEASURED LIVE BEFORE A LINE CHANGED: of the 10 undecided non-gated cards, 7 sat on tickets already `done` (SES-101 9cdf840b, SES-121 8c421bf3, SES-140 bfd7598b, SES-146 b1ca9305, SES-147 6ce64ed2, SES-149 9a5e922b, SES-162 c1af750f); the 3 live rows were 5c220f71 (SES-154, `delivered`), 1f68482a (SES-157, `delivered`) and edb78e0c (no backlog_id). John approved 2026-08-23 with the trade stated aloud: those 7 straggler ships leave his page unrated and never feed the trust ladder, because a pre-SES-154 cycle already closed them under the old rule. Migration ses165_ship_card_retire; the other three rules of step 1c are unchanged. -->
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
   `runner_ladder` — same structure as the live page: masthead **(the one-tap
   "▶ Run a cycle now" link to `https://claude.ai/code/routines` — `SES-102`, John's ask
   2026-08-21 — now lives on §2b and NOT here: `SES-143`, `v7.0.182`, John's explicit
   instruction; do not reinstate the masthead copy — see §2b's data contract below)**
   **plus the `N decisions waiting` counter, and
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
   **The id chip's source is `coalesce(backlog_id, display_ref)`, never `backlog_id` alone
   (`SES-116`, `v7.0.174`).** `runner_items.backlog_id` is a **join key** to
   `backlog_items.backlog_id` and is now enforced bare by `ck_runner_items_backlog_id_bare` — the
   `ID (Type · named P-class)` string above is composed **at render time**, from the ticket's own
   row, and is never what the column stores. A card that names something other than a board ticket
   — a directive uuid, a governance register, an invention proposal, `"no ticket yet"` — carries
   `backlog_id = NULL` and its reference in **`display_ref`**; two such cards are live and
   undecided right now (`477454d7` directive `603f44ea`, `8a86d9d4` the reading-card question), so
   a rebuild that reads `backlog_id` alone renders **two blank chips on cards John has not
   decided**. Filing rule and the measured history: `runner-cycle.md` step 9.
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
   **THE MASTHEAD'S LAST-ACTION STAMP — and the one line of it a rebuild must write (directive
   `603f44ea`, `v7.0.172`).** John: *"Need a timestamp of the last action on this page at the very
   top next to the count of decisions. I can't tell what time my last action was compared to if the
   page has refreshed yet."* `#lastact` sits under `#waiting` and carries three things: his newest
   action, this page's rebuild time, and — only when his action is strictly newer — **"Not picked
   up by a run yet"**. The first is **derived in `stampLastAction()` from `briefing-state`**, never
   typed by a cycle, for the same reason `#waiting` is (`SES-124`); a cycle-typed value could not
   be right in principle, because the page self-publishes on every tap and no cycle is running
   between rebuilds. **The one value a rebuild MUST set is `var PAGE_BUILT` at the top of the
   `#code` script — the UTC minute you published, `YYYY-MM-DDTHH:MMZ`.** It lives in `#code`
   because `doc()` carries that script's `textContent` through a self-publish verbatim, so John's
   taps cannot move it; a rebuild that forgets it ships a page claiming to be older than it is,
   which tells him a run has **not** picked his tap up when one has — worse than no stamp at all.
   Two rules inside the derivation, both load-bearing: a `state.asks[…]` entry whose `q` begins
   `[runner,` is the **runner's** action, not John's, and is skipped (counting it renders the
   runner's own reply as "your last action"); and an unparseable `at` is skipped rather than
   rendered as `Invalid Date`. Guarded by `tests/regression/DIR-603f44ea-last-action-stamp.js`,
   which reads the functions out of the template itself so a rebuild cannot quietly replace them
   with a literal. `state.directive_at` (stamped by the directive box's blur handler, same ship)
   is what finally lets the box he most often uses last count as an action — **forward only**:
   a directive typed before `v7.0.172` has no stamp and contributes nothing rather than a guess.
1a. **THE REBUILD HAS A BUILDER NOW — USE IT (`SES-149`, `v7.0.200`): `scripts/build-briefing.mjs`.**

   ```
   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/build-briefing.mjs \
     --template docs/runbooks/briefing-template.html --data <cycle.json> --out briefing-out.html
   ```

   **Until this shipped there was no script at all** — `grep -rln briefing-template scripts/`
   returned nothing, while this file and `runner-cycle.md` step 9 had told every cycle since
   `v7.0.99` to rebuild the page *"structurally from the template + the `runner_` tables"*. Every
   cycle did that **by hand**: ~14 queries re-derived into hardcoded literals inside a 1,700-line
   file. Two cycles in a row hit that wall, which is what turned a cost into a ticket.

   **It derives what is derivable and refuses to invent the rest** — the split is stated in the
   script's own header and guarded by its test:

   | Derived from SQL (no cycle judgment) | Supplied by the cycle in `--data` |
   |---|---|
   | the `briefing-state` seed (step 1b), the §5/§6 card set (step 1c), `PAGE_BUILT`, §2, §8, §10, §11, §13, §14 | §3 findings, §4's calibration sentence, §4.1 rows, §7/§7.1 directive lines, §9 questions, §12 vision claims |

   Three properties that are not style:

   - **Every substitution is anchored, and a moved anchor is a HARD STOP (exit 2).** The builder
     edits a template it does not own, by string match. If the template moves under it the honest
     outcome is a refusal, never a page with one section still reading *"Sample value"*. Exit 2 is
     the same "could not run" convention `export-backlog-snapshot.js` and `heal-engine.js` use, and
     it is **never a pass**.
   - **§8's Title is `public.backlog_display_title()`, never the raw `title` column** (`SES-119`).
     The builder got this wrong on its own first run and it was caught by looking: reading the
     column directly rendered `LOG-134` and `LAV-30` as `` `Post-beta` `` — both are in the live
     top 12, so it is not hypothetical.
   - **`--data` is required.** There is no default for the narrative sections. A builder that
     guessed §3 or John's directive lines would be writing his briefing for him.

   Guarded by `tests/regression/SES-149-briefing-builder.js`.
1b. **SEED THE `briefing-state` BLOCK — it is the verbatim output of one call, never the
   template's sentinel and never hand-composed (`v7.0.197`, directive `b8d5ea7e`; John's Rework
   2026-08-23T13:57Z on card `9eacb4d5`/`SES-132`, repeated 13:59Z on `8c8deaae`/`SES-133`).**

   ```sql
   SELECT public.briefing_state_seed();
   ```

   Paste that jsonb verbatim between the `<script type="application/json" id="briefing-state">`
   tags. **`briefing-template.html` ships `{"__unseeded":true}` — a sentinel, deliberately not a
   valid empty state.** Publish it unseeded and the page draws a red banner at the very top saying
   so; that is by design and is the loud half of this fix.

   **Why this step exists, measured rather than reasoned about.** `thread()`, `orphanThreads()`,
   `readingSlot()` and `readingRecordedLine()` read `state` and **only** `state` — not one of them
   queries Supabase. The template used to ship a hardcoded *empty* state, so a cycle rebuilding
   structurally from it published that blank block and **John's entire ask history and every meter
   reading left the page**, while the page still looked finished. His own taps were never the
   problem: `doc()` serialises the live state, so a tap preserves its own thread; only a **rebuild**
   wiped. The served artifact carried `PAGE_BUILT = '2026-08-23T15:57Z'` with `asks:{}` and
   `reading:{}` against a ledger holding **8 answered threads across 8 targets** — one on
   `item-chi84-gate`, a card **still awaiting his decision** — and **10 readings**, latest 13:51Z.
   That rebuild landed **two hours inside the window he had announced for testing this**. `SES-132`
   had already shipped §9.1's orphan renderer and was **inert**, because the wipe is upstream of it.

   Four things about the call, each of which prevents a real failure:

   - **Only `asks` and `reading` are seeded with data.** `items` / `directive` / `answers` /
     `unblocks` / `settings` come back blank **by design** — each is harvested to a durable table
     and its section re-derives from the DB (a decided card drops off `WHERE decision IS NULL`, an
     answer lands in `runner_questions`, an unblock in `runner_skips`). Seeding those would give one
     fact two homes. The page is the **only** render home for the other two, which is exactly why a
     blank state damages them and nothing else.
   - **THE TIMESTAMP FORMAT IS LOAD-BEARING AND FAILS SILENTLY.** The seed *manufactures* the `at`
     strings the ask harvest parses back, and that harvest stays idempotent **only** through
     `uniq_card_ask (target_id, asked_at, question)`. They are emitted in **UTC, at minute
     precision, with a literal `Z`** — the page's own shape. Emit CST (the display-times rule below
     tempts precisely this), or seconds, or drop the `Z`, and **every rebuild + harvest silently
     doubles every ask**. Proven at ship: the shipped form round-trips **8 of 8**; the CST and
     seconds forms each match **0 of 8**. Display-CST conversion happens in the render, never in
     state.
   - **A never-answered ask omits `a` entirely rather than carrying `null`** — `thread()` tests
     `t.a` and renders its *"Not answered yet"* line on a falsy value, so a `null` would read as an
     answered thread with a blank answer.
   - **John's un-landed tap outranks the seed.** The `sessionStorage` stash recovery runs *after*
     the block is parsed and deliberately wins, so a tap that was mid-publish is never overwritten
     by a rebuild's seed.

   Guarded permanently by `tests/regression/DIR-b8d5ea7e-briefing-state-seed.js`, whose assertions
   1, 2 and 4 fail on the pre-change tree.
1c. **THE §5/§6 CARD SET IS ONE CALL, AND A CARD RETIRES ITSELF WHEN ITS TICKET GOES TERMINAL
   (`v7.0.199`, directive `16b3ff73`; boundary rewritten `v7.0.208`, `SES-165`, migration
   `ses165_ship_card_retire`).**

   ```sql
   SELECT * FROM public.briefing_open_cards();
   ```

   Render the rows where `render` is true — §5 from `kind IN ('ship','test')`, §6 from
   `kind = 'gated_before_build'`. **Do not re-derive `WHERE decision IS NULL` by hand:** that is
   what this call is, plus the one filter it was missing.

   **John found this, and he found it by pasting a §6 row back at us.** His Rework, verbatim:
   *"6.6 Gated CHI-84 Tapping a step chip in chat jumps you to that step — built, but it needs a
   session you are in"*. That card was asking his permission to build something that had **already
   shipped** — `CHI-84` closed `done` at 15:18Z in an attended session while its gated card sat
   undecided. **Measured before a line changed, and it was not one card:** of the 8 undecided cards
   carrying a ticket id, **7** had a ticket already `done`, and **4 of the 5 gated cards were dead
   questions** (`SES-121`, `SES-118`, `SES-117`, `CHI-84`). Only `AGT-015` was a live ask.

   Four rules, each of which prevents a real failure:

   - **A card retires when its ticket is TERMINAL (`done`/`removed`), whatever its kind — and
     `delivered` ALWAYS renders.** The predicate keys on terminal status alone: `ship`, `test` and
     `gated_before_build` are treated identically, and every non-terminal status — `delivered`,
     `open`, `partial`, `removal proposed` — renders. **The `delivered` carve-out is the load-bearing
     half:** since `SES-154` that card *is* the Accept mechanism, so a predicate that reached into
     `delivered` would reopen the acceptance-gating defect `SES-154` was filed to end.

     **This SUPERSEDES the `v7.0.199` rule, deliberately and with John's approval — it is not
     drift.** That rule retired **gated cards alone** and exempted ship/test cards by name, on a
     rationale that was correct on the day it was written: a gated card asks *"may I build this?"* —
     **permission**, and permission for work that already exists is not a question — while a ship
     card asks *"was this good?"* — a **rating**, which the `v7.0.199` contract called *"meaningful
     forever"* because it is the trust ladder's only input. **That rationale outlived its premise by
     one day.** It assumed a ship card sits on a ticket the ship itself closed `done`. `SES-154`
     (`v7.0.205`, 2026-08-23) broke that assumption on purpose: a ship now writes **`delivered`**,
     and **only John's Accept writes `done`**. So a rating-in-waiting now sits on a `delivered`
     ticket and never on a `done` one — which means a ship card on a `done` ticket is a card whose
     verdict **already happened**, and retiring it starves nothing.

     **Measured live before a line changed (`SES-165`, 2026-08-23):** of the 10 undecided non-gated
     cards, **7** sat on tickets already `done` — `SES-101` `9cdf840b`, `SES-121` `8c421bf3`,
     `SES-140` `bfd7598b`, `SES-146` `b1ca9305`, `SES-147` `6ce64ed2`, `SES-149` `9a5e922b`,
     `SES-162` `c1af750f`. The only live rows were `5c220f71` (`SES-154`) and `1f68482a`
     (`SES-157`), both `delivered` — real asks — and `edb78e0c`, which carries no `backlog_id` and
     so always renders. **The trade John accepted with it stated aloud, 2026-08-23:** those 7
     stragglers are a pre-`SES-154` transition artefact, they leave his page unrated, and they never
     feed the trust ladder. Under the new rule no future ship card can be orphaned this way, because
     it retires only after his Accept has already written `done`.
   - **Nothing vanishes silently.** The call does not hide rows, it **labels** them: `render` is the
     filter and `retired_reason` says why. Report the retired count on the page rather than quietly
     dropping cards John saw yesterday.
   - **A card is never decided on his behalf.** `decision` stays `NULL` and stays his (§19v). A
     retired card is *not shown*, not *answered* — if he ever wants it back, the row is intact.
   - **"Still needed" is DERIVED, never a maintained flag** — the same self-retiring shape as §10's
     skip filter (`SES-127`). A ticket that ships drops its dead card with **no write from any cycle**
     and no rule for anyone to remember. Ninth prose→code correction on this platform.

   Guarded by `tests/regression/DIR-16b3ff73-gated-card-retire.js`.
2. **Republish to the SAME URL** — pass the URL above as `url` to the Artifact tool (a publish
   without `url` from a new conversation creates a stray page; never do that). Same favicon.
   **Also pass `title: "DeepBench Morning Briefing"` on every publish, and assert the name
   afterwards — step 5 below (`SES-138`, `v7.0.175`).**
2b. **THE PAGE'S NAME IS PART OF THE PUBLISH, AND IT HAS BEEN LOST ONCE (`SES-138`, `v7.0.175`;
   found live 2026-08-23 by cycle `702aa2db` on the served artifact).** After the `v7.0.173`
   rebuild the artifact came back named **"briefing-out"** — the build file's *filename* — instead
   of "DeepBench Morning Briefing". John finds this page by its name in his gallery and by its
   browser tab, so this is a real defect, not cosmetic. **Cause:** the Artifact tool scans only the
   **first 8192 bytes** of a file for a `<title>`, and `briefing-template.html` opens with its
   provenance comment block, which grows by one comment on every ship — so the tag was present,
   correct, and never seen, at byte **24,770**. Three defences, and they are deliberately not
   interchangeable:
   - **Structural, and the one that actually fixes it:** `<title>` now sits at **byte 0** of
     `briefing-template.html`, above the provenance block, with the invariant stated in place.
     **Never prepend a comment above it** — new provenance comments go below that guard block.
   - **Belt-and-braces:** pass `title:` on the publish call anyway (step 2). This alone was
     rejected as the whole fix: it is a rule every future cycle must *remember*, which is the exact
     class of forgetting `SES-86` phase 3, `v7.0.146`, `SES-101`, `SES-111`, `SES-127`, `SES-128`
     and `SES-129` each had to convert from prose into structure. Seven precedents is enough.
   - **Assertion, in step 5.** A publish that reports success can still leave the thing John looks
     at wrong — that is the `v7.0.166` lesson, and it is exactly what happened here: both
     wrong-named publishes reported success.
   **Not changed, because it was measured and is already right:** `doc()`'s self-publish head emits
   its own `<title>` inside the first ~150 bytes, so John's own taps have never been able to rename
   the page. Only a cycle publishing the template-derived file hits the window. Guarded permanently
   by `tests/regression/SES-138-briefing-title-window.js`.
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
5. **AFTER the republish returns, ASSERT THE NAME ON THE SERVED ARTIFACT (`SES-138`,
   `v7.0.175`).** Call the Artifact `list` action and check that this URL's row reads
   **`DeepBench Morning Briefing`**. Assert on what is **served**, never on the publish result:
   both of the wrong-named publishes on 2026-08-23 reported success (the `v7.0.166` lesson — a
   publish that reports success can still leave the thing John actually looks at wrong). A wrong
   name is recoverable in one call — republish passing `title:` — so this check costs one read and
   saves John looking for a page that has been renamed out from under him. If the name is wrong,
   fix it in the same cycle and say so on the briefing rather than carding it.

6. **The republish is no longer the last thing a cycle does (`SES-139`, `v7.0.176`; chain
   mechanism replaced by `SES-140` FINAL, `v7.0.195`).** After the republish, the name assertion,
   the cycle-row close and the lease release, a cycle whose own outcome was `shipped` /
   `gated_before_build` / `reverted` **and** whose standing drain still returns `pick` continues
   the drain **in-session** — the same session runs the next cycle as an in-session continuation
   cycle (`SES-140` FINAL: session-spawning is platform-refused and retired; nothing fires a
   successor run) — `runner-cycle.md`'s tail step (8) owns the gates and the reasoning; nothing
   about the rebuild itself changes. Two consequences that show up **on this page** and would
   otherwise read as bugs: John's *"page rebuilt"* stamp can now move again within **minutes**
   rather than on the 3-hour cron, so a masthead time that looks suspiciously fresh is the chain
   working, not a double-publish; and the `#lastact` *"Not picked up by a run yet"* line clears
   far sooner after he taps, because the next cycle is minutes away instead of hours. **A
   wall-stopped cycle continues nothing** — so a page that stops refreshing overnight is the
   budget wall doing its job, and is not a stall to root-cause again.

## The locked section order (`SES-124`, `v7.0.159` — spec: `docs/BRIEFING-REDESIGN-0822.md`)

John iterated this section by section in the `design-briefing-redesign` session and approved the
mock ("this is good"). **The spec doc is canonical for behavior; the mock
(`docs/design/briefing-redesign-mock-0822.html`) is canonical for look and feel; where they
disagree the spec wins.** Every rebuild renders these, in this order, with the section number
shown:

| # | Section | Built by |
|---|---------|----------|
| 1 | Masthead + `N decisions waiting` + last-action stamp | `SES-124` ✔ · dir `603f44ea` ✔ stamp |
| 2 | Daily activity (CST day) | `SES-124` ✔ |
| 2b | **Automation — scheduler + drain switches, status line** | `SES-143` ✔ |
| 3 | Today's findings | `SES-124` ✔ |
| 4 | Budget & usage (3 cards) + `4.1` Daily output, closed | `SES-124` ✔ frame · `SES-128` ✔ readings · dir `bee71cf4` ✔ daily output |
| 5 | Shipped | `SES-125` ✔ |
| 6 | Gated before build | `SES-125` ✔ |
| 7 | Directive queue | `SES-124` ✔ position · `SES-129` ✔ follow-through card |
| 8 | The queue (matrix) | `SES-126` ✔ |
| 9 | Questions + `9.1` Answered — your past questions, closed | `SES-125` ✔ questions · `SES-132` ✔ kept threads |
| 10 | Skipped — waiting on your input | `SES-127` ✔ |
| 10.1 | ↳ Needs your decision — answerable from here | `SES-119` ✔ |
| 10.2 | ↳ Needs your desktop — a session you attend | `SES-119` ✔ |
| 11 | Now-tier by class | `SES-126` ✔ |
| 12 | Vision claims | `SES-125` ✔ |
| 13 | Trust ladder | `SES-126` ✔ class column |
| 14 | Who used DeepBench | `SES-126` ✔ |
| 15 | **Project — Selfbuild milestones** | `SES-178` ✔ |

**The forward view of the queue is BACK (`SES-126`, `v7.0.161`).** `SES-124` struck "Next up —
top 5" and the "Next 3" line and disclosed, on its own card, that the page would carry no forward
view of the queue at all until this ticket landed. §8 and §11 are that replacement and they are
now live, so the gap paragraph in `runner-cycle.md` step 9 describes a window that has closed.
**The struck sections stay struck** — do not reinstate them; the matrix is the forward view now.

### §2's "Shipped today" keys on ACCEPTANCE, not on the push (`SES-154`, `v7.0.205`)

**Read this before you regenerate §2, because there is nothing here to copy from.** `SES-154` was
filed to "re-key the scoreboard (daily shipped) on acceptance", and the honest finding — surveyed
across `briefing-template.html`, `briefing-page.md`, `tests/` and `scripts/` — is that **there was
no key to re-key.** The template's stat box is a **hardcoded sample value** (`<b>1</b>`) under a
comment that says *"Figures below are sample values — regenerate from `runner_cycles` over the CST
day"*, and no file in the repo defines the query that would produce it. So this ticket ships the
contract rather than a changed predicate, and says so rather than reporting a fix it did not make.

The rule for whoever builds that query:

- **"Shipped today" counts tickets John ACCEPTED today, not cycles that pushed today.** The count
  is over `backlog_items` reaching `done` — i.e. his tap — inside the CST day, never over
  `runner_cycles.outcome = 'shipped'` and never over `status = 'delivered'`. A ship the runner is
  proud of that John has not looked at is **not** a shipped item on his scoreboard; that is the
  whole of decision 1, applied to the number he reads first.
- **`delivered` needs its own box, not a share of this one.** Collapsing the two hides exactly the
  queue this ticket exists to make visible — work finished and waiting on him. Until that box
  exists, a rebuild must not quietly fold delivered tickets into "Shipped today".
- The CST-day window is register B35's, unchanged, and is the same boundary step 3 uses.

### §15's data contract (`SES-178`, `v7.0.231`)

**§15 is APPENDED, never a renumber** — John's own placement call on gated card `a8eaee1d`
(Accept, attended decision-drain 2026-08-24): *"appended as the NEXT section number at the END of
the locked section order — extend the list, never renumber it"*, the same rule that gave us §2b,
§4.1, §7.1 and §9.1.

It renders **`docs/SELFBUILD-CHARTER.md`'s canonical progress query**, which the charter itself
introduces as *"answers 'how close are we' any time, before `SES-178` renders it"*. Per milestone:
name, `done`, `total`, `%`; then an overall bar and count.

Four rules, each of which is how this panel gets rendered wrong:

- **`done` is `status = 'done'` and nothing else.** `delivered` is deliberately **not** counted —
  the same boundary §2's "Shipped today" keeps (`SES-154`): work the runner finished and John has
  not looked at is not progress on his scoreboard. A panel that folded `delivered` in would report
  the project further along than John has agreed it is, which is the one direction this number
  must never err.
- **AN EPIC'S COMPLETION IS NOT ITS DRAIN'S COMPLETION, and the footnote saying so is mandatory.**
  A drain retires on the members John **named** (`runner_drain_scope`, `SES-142`); a ticket filed
  into the epic *after* that naming never joins it. Measured at this ship: **M0's and M1's drains
  are both retired** while M1 reads **46.7%** here. That is correct, not a gap — the difference is
  work added since he named the scope. Without the footnote a reader infers "retired = 100%" and
  the charter's own finish line becomes unreadable.
- **The keystone metrics are NAMED ABSENT, never rendered as zero.** The charter's measurement
  table points verifier catch rate vs John's Rework rate, John-minutes/week and drift findings/week
  at this panel, and the ticket scopes them *"as they come online"*. None is: the verifier lane is
  `SES-181` — *reviewer lane*, still open. A zero would read as "the verifier caught nothing" — a
  claim about performance where the truth is absence. Same rule as §14's cost showing "—" and a
  `NULL` `plain_*` drawing a red defect line.
- **No new CSS.** The panel is built from `table` / `td.num` / `td.dim` / `.bar` / `.barlbl` /
  `.tnote`, all already shipped. This is not thrift: every rule added to `#s` sits **above** the
  `briefing-state` block in the served document and pushes it further out of a size-bounded read —
  the live `SES-188` defect, which was truncating the harvest again on the 235.7 KB page the day
  this shipped.

**Known debt, disclosed rather than smuggled:** the builder derives these numbers from two flat
PostgREST selects because PostgREST cannot run the charter's `GROUP BY` join and this builder has
no generic exec by design. That is a **second expression** of the charter's query, not a second
source of truth, and the right end state is one executable home — a `selfbuild_progress()` function
the charter cites and the builder calls. It is not done here because the migration plus the charter
edit would put `SES-178` at five files against `CLAUDE.md`'s ≤3 cap; it is the ticket's named
remainder.

### §2b's data contract (`SES-143`, `v7.0.182`)

`§2b` is **extended into** the locked order, never a renumber of §3–§14 — the same rule that gave
us §4.1, §7.1 and §9.1. Renumbering would silently invalidate every §-reference in this file, in
`runner-cycle.md` and in the spec itself.

Every rebuild regenerates the `AUTOMATION` object in `#code` — it is the half of the panel the page
cannot know — from live tables, exactly as `SKIPS` and `PAGE_BUILT` are:

| Key | Source | Rule |
|---|---|---|
| `scheduler_on`, `interval_hours` | `public.runner_settings` (`id = 1`) | The DB's values. John's un-harvested tap in `briefing-state.settings` **outranks them in the render** (`settingsNow()`), so read this *after* the tail's settings harvest, never before. |
| `drain_on`, `drain_epic` | a `queued` `runner_directives` row with `type='drain-epic'`, `epic_id` resolved through `epics.name` | Unticked means no queued drain — not "a drain that finished". |
| `drain_left`, `drain_named` | `runner_drain_scope` for that directive, joined to `backlog_items` | `drain_named` is John's **named** list (`SES-142`), never the epic's live `now` tier; `drain_left` counts those not yet `done`/`removed`. A ticket filed into the epic after naming is **not** in either number. **`SES-154` re-keys this figure on ACCEPTANCE for free, and it needed no edit — verified, not assumed:** `done`/`removed` is already the acceptance test, and `delivered` is deliberately absent from it, so a member the runner has shipped but John has not yet accepted still counts as left. X-of-N therefore falls only when he taps Accept, which is what decision 1 asks. Do **not** "fix" this by adding `delivered` here — that would report the drain finished on the runner's own say-so. |
| `drain_history` | closed `drain-epic` directives | One line per completed drain: `"<epic> completed — N tickets at <time CST>"`. |
| `last_cycle`, `next_fire` | `runner_cycles` (most recent closed) and the routine's cron | Times in **CST and labeled**, per the page's standing times rule. |
| `daily_max_millions` (`SES-147`) | `public.runner_settings.daily_max_tokens_millions` | John's **standing** day cap in millions. **`null` is the blank box and is not zero** — blank means "no standing cap, budget exactly as before `SES-147`", and a `0` in this box would read as "no tokens allowed today", a number he never typed. Same tap-outranks-DB rule as `scheduler_on`. |
| `daily_max_effective` (`SES-147`) | `SELECT day_cap, cap_source, cap_reason FROM public.resolve_day_token_cap('<your cycle id>')` | **The cap the next cycle will actually use, and never the box multiplied out here.** Render the number plus the reason in John's register — `"25,000,000 today (your override for today)"`. |

Four rules a rebuild must not re-derive differently:

- **No `data-awaits` anywhere in the panel.** A switch is a control, not a decision owed — the same
  call `SES-127` made for §10 and `SES-132` for §9.1. §1's counter must be able to reach zero, and
  a checkbox is always there to be tapped.
- **The drain status label is shown ALWAYS**, running or not (spec, verbatim) — `"X of N tickets
  left"` while running, the completion line when done.
- **The `"▶ Run a cycle now"` link lives here now and NOT in the masthead** (John, explicit, in the
  §2b spec). Do not reinstate the masthead copy: two copies of one control is how a page starts
  contradicting itself.
- **THE DAILY-MAX BOX IS NOT THE CAP, AND THE ROW MUST NOT IMPLY IT IS (`SES-147`, `v7.0.201`).**
  The box is one of **five** rungs, resolved by `public.resolve_day_token_cap()` — a `budget_override`
  for one particular day and the 48h stale-reading floor both outrank it (`runner-cycle.md` step 3
  has the ladder). So the row renders the stored number **and** an *"In force now"* line carrying
  `day_cap` + `cap_reason`. A rebuild that drops that line, or that computes `box × 1,000,000` as
  the effective cap, is wrong on **precisely the days a higher rung fires** — which are the days
  John is looking at this panel. Live proof of the discrimination, on fixtures inside a rolled-back
  transaction: box `4` + a live override → `25,000,000 / override`; box `4` + every reading aged
  past 48h → `3,000,000 / stale-floor`, **not** `4,000,000`; blank box → `10,000,000 / calibrated`,
  the pre-`SES-147` number exactly.

### The four board tables' data contracts (`SES-126`)

Sections 8, 11, 13 and 14 are regenerated from live tables on **every** rebuild. Four rules, each
measured against the live board/log when this shipped rather than reasoned about — a rebuild that
re-derives any of them will get it wrong in a way that looks fine:

- **§8's Queue column is `backlog_items.queue`** — the DB's own stored number (`SES-86` phase 2),
  never a position the render counted out. The heading states the window ("top N of M numbered")
  because a 12-row view of 562 tickets that does not say so reads as the whole board.
- **§8's Title column is `public.backlog_display_title(b.title, b.description)` — NOT the raw
  `title` and NOT the `gist` extract (`SES-119`, `v7.0.184`, migration `ses119_display_title`).**
  This bullet used to read *"its Title column is the `gist` extract, not `title`"*, which `SES-126`
  wrote because for imported tickets `title` held the class string (`'P9 - Bug Fixes.'`).
  **`SES-91` repaired that** — measured 2026-08-23: **0** of the 562 open numbered tickets carry a
  class string, and `title IS NULL` on 0 of 610 rows — so that rule now guards a defect that no
  longer exists, while the `gist` it renders instead is the first 70 characters of the
  *description*, which on this board is provenance (queue 1 rendered *"FOUND LIVE
  2026-08-23T03:31Z by cycle b9201486 while exercising the st"*).
  **The obvious fix is the one that would have shipped wrong.** A straight `gist` → `title` swap
  reads as the whole change and passes any check that merely asks "does Title come from `title`
  now?" — but **46** open numbered tickets carry a bare *retired declaration* as their title (38
  of them literally `` `Post-beta` ``), and **two of them, `LOG-134` and `LAV-30`, are in §8's live
  top 12**, so the swap renders `` `Post-beta` `` as their title: strictly worse than the
  workaround it replaced. The rule is therefore a **fallback, not a swap** — prefer the stored
  title, fall back to the gist when the stored title is a marker rather than a title — and it
  lives **in SQL**, because a rule each cycle re-derives is one that gets re-derived differently
  (the eighth precedent: `SES-86` phase 3, `v7.0.146`, `SES-101`, `SES-111`, `SES-127`, `SES-128`,
  `SES-129`, `SES-143`). Two boundaries worth knowing before you edit the function: a **length
  heuristic was rejected** (it silently reclassifies rows as titles are edited, and `Landing
  screen` at 14 characters is a terse title, not a marker), and the predicate matches only when the
  **whole** title is the marker plus an optional short parenthetical — `CHI-97`, whose title opens
  *"Beta-gate (bucket 2) — a red console error…"* and continues into a real title, is kept.
  **Everything that displays a ticket uses this**, not just §8: §10's rows, the help-me ticket, and
  any future surface. John's standing instruction, 2026-08-22, is the whole scope — *"across every
  session, display or anything that references work you perform for the backlog"*: always **ID +
  title**, because he does not memorize IDs.
- **Fitting the column is the render's job, not the projection's.** Trim to ~70 at a **word
  boundary** with an ellipsis when cut; the contract's `left(…, 70)` is the canonical projection.
  And note the asymmetry between the two row helpers, which a sweeper will want to "harmonise" and
  must not: `queueRow()` interpolates its title **raw** because §8's call sites carry HTML entities
  (`&rsquo;`, `&mdash;`), while `skipRow()` **`esc()`s** its own because §10's call sites pass raw
  ticket prose. Entities in §8, plain text in §10.
- **§8's Epic column is `epics.name` resolved through `backlog_items.epic_id`, and it renders
  BLANK when the ticket belongs to no epic** (`SES-144`, `v7.0.181`; John, 2026-08-23: *"on the
  queue, add a column epic"*). Two things about it. It resolves through the **FK, never prose in
  the ticket body** — the same standing property `SES-111` fixed the drain's epic under. And the
  empty value is `''`, **not `—`**: this table already spends the em-dash on Design status, where
  it means a real absence, so a dash here would read as a *value* ("epic: —") rather than as
  "belongs to no epic". Measured live when it shipped: of §8's top 12 rows, 10 were `Automation`
  and 2 (`SES-131`, `AGT-015`) belonged to no epic — a distinction the page had rendered nowhere
  while John was running the board as an epic-scoped drain.
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

**Wide tables scroll themselves.** §8 (**seven** columns since `SES-144`) and §14 (six) are wide
matrices and this page is read on a phone; both sit in a `.tscroll` wrapper so the table scrolls
sideways and the page body never does. §11 and §13 are narrow and deliberately do **not** get it —
a scroll affordance on a table that already fits reads as a table that is cut off. **None of these four sections folds:**
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
       left(public.backlog_display_title(b.title, b.description),70) AS title,
       s.reason, s.unblock_kind, s.unblock_ref, (s.briefed_at IS NULL) AS is_new,
       to_char(s.last_skipped_at AT TIME ZONE 'America/Chicago','Mon DD') AS skipped_cst,
       s.skip_count,
       -- SES-119: which of John's two lists this row belongs in, and the kickoff for 10.2.
       CASE WHEN s.reason_kind IN ('needs-desktop','permission-gate')
            THEN 'desktop' ELSE 'decision' END AS which_list,
       b.kickoff_link
  FROM public.runner_skips s
  JOIN LATERAL (SELECT bi.* FROM public.backlog_items bi
                 WHERE bi.backlog_id = s.backlog_id ORDER BY bi.id LIMIT 1) b ON true
 WHERE s.resolved_at IS NULL AND b.status NOT IN ('done','removed')
 ORDER BY which_list, (s.unblock_kind = 'question') DESC, s.last_skipped_at DESC;
```

**§10 RENDERS AS TWO LISTS, NOT ONE (`SES-119`, `v7.0.184`).** John's own cut, 2026-08-22:
*"needs your decision"* vs *"needs your desktop"* — **two** lists, in his words *"because they
trigger different actions (answer vs open an attended session)"*. They are sub-blocks **10.1** and
**10.2** inside §10's existing fold, so the LOCKED SECTION ORDER is *extended*, never renumbered —
the same call `SES-132` made for §9.1. Four rules:

- **The mapping is on `reason_kind`, and the default is not arbitrary.** `needs-desktop` and
  `permission-gate` → **10.2 Needs your desktop**; `needs-john`, `removal-proposed`, `gated` and
  **`other`** → **10.1 Needs your decision**. `other` falls to *decision* deliberately: the
  fallback must be the list John can clear with a thumb, and defaulting an unclassified row into
  "open a session" invents a chore out of a row nobody classified.
- **Both lists render even when empty.** An empty *Needs your desktop* is the good news that
  nothing is waiting on him at a keyboard; a list that disappears when empty makes its own absence
  unreadable — he cannot tell "none" from "the section broke".
- **A 10.2 row with a `kickoff_link` carries a "Kickoff ready" line** naming the path. That is the
  difference between sitting down to design and sitting down to *paste*, which is why the ticket
  asked for it. Note what the test for it actually is: the ticket says *"already designed"*, but
  `design_status` holds **one** value and for these rows it holds `needs-desktop`, so it can never
  also read `designed` — the observable fact is the **presence of `kickoff_link`**, and that is
  what the render keys on.
- **The count chip stays a single total across both lists.** It sits on the §10 heading, which
  still names one section; two chips would let the heading disagree with itself the moment one
  list emptied. Each list's own size is legible from its rows.

Five things in the query are not style, and each is wrong in a way that looks fine:

- **The join is `LATERAL … LIMIT 1`, not a plain join.** `backlog_id` carries no unique
  constraint and **`CHI-48` occupies two rows** (found by `SES-86` phase 2's own QA), so a plain
  join silently doubles any skip on a duplicated ticket. The `ORDER BY bi.id` matches the
  queue function's own final tie-break, so both readers pick the same row.
- **`resolved_at IS NULL AND b.status NOT IN ('done','removed')` — resolution is DERIVED.** A
  ticket that ships leaves this section with no write at all and no rule for a cycle to
  remember; `resolved_at` covers only the other case (ticket still open, blocker gone). This is
  the `SES-86` phase 3 / `SES-101` / `SES-111` prose→code correction applied by *deleting* a rule
  rather than writing one. **It proved itself live at `v7.0.184`**, which is worth recording
  because this is the kind of design only time can test: of the six unresolved `runner_skips` rows,
  `SES-106` and `SES-110` had gone `done` and `CHI-89` `removed`, and all three dropped out of the
  section with **no write from any cycle**. Three of six retired themselves. Do not "tidy"
  `resolved_at` to match them.
- **The sort is `which_list` first, then `unblock_kind = 'question'`, then newest skip.** Within a
  list, question-unblockable first is still the difference between rows John clears with one thumb
  and rows that need him at a keyboard; `which_list` leads only so both renders can be sliced from
  one query rather than run twice.
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

**THE SOURCE IS `public.vision_claims`, NOT THE MARKDOWN (`SES-157`, `v7.0.206`, migration
`ses157_vision_claims`).** Spec `docs/design/BRIEFING-COMMENTS-0823-DRAFT.md` decision 5, John-approved
2026-08-23: *"Claims live in a Supabase table (single source); vision md essays keep prose only."* The
nine essays under `docs/vision/` are still the corpus a cycle **reads for context**; they are no longer
where a claim's **state** lives, and a cycle must never again edit a claim line to record a decision.

Each rebuild includes **1–3 vision claim cards** (~15 min/day of John's time max, his rule), selected
from the table by one read:

```sql
SELECT claim_ref, source_doc, claim_text, judgment_class, confidence, is_root
  FROM public.vision_claims
 WHERE status = 'proposed'
 ORDER BY is_root DESC,                                   -- the four root claims first (decision 7)
          array_position(ARRAY['low','medium','high'], confidence),
          claim_ref
 LIMIT 3;
```

`is_root DESC` leads because the four roots are the `ARCHITECTURE.md` §19v judgment-class purposes and
**every later claim is scored against them** — a corpus whose roots are still the doc's paraphrase is
one John never actually ratified. `LOW` confidence before `MED` before `HIGH` is register B13's
existing rule, unchanged; each doc's *"Open questions for John"* imported as `low`-confidence rows and
needs no separate pass. Never more than 3, never zero while `proposed` rows remain.

Card face: the claim sentence phrased as *"X because Y — true?"*, its `claim_ref` (`VC-THESIS-004`) and
`source_doc`, the class chip, and the three taps. **Every tap is a row write; none of them edits a
markdown file:**

| Tap | What it writes | Why |
|---|---|---|
| **Accept** | `status='ratified'`, `confidence='high'`, `decided_at=now()`, `provenance` = his tap | ratification is a state, and it now has one home |
| **Reverse** | `status='rejected'`, `decided_at`, `provenance` = his tap | **a rejected claim is a KEPT ROW, never a deletion** — see below |
| **typed line** | INSERT a new `ratified`/`high` row carrying his words verbatim, then set the old row `status='rewritten'`, `superseded_by` = the new row's id | his wording **replaces** the claim; the old text stays readable, so the corpus gets richer rather than overwritten |

**A Reverse no longer deletes anything, and that is decision 5, not a softening.** John's reason,
verbatim: *"`vision/rejected-paths.md` retires — a rejected claim is a kept row, since rejections teach
what not to build."* A deleted claim is re-invented; a `rejected` row is what stops the invention pass
proposing it again. `ck_vision_claim_decided` enforces the discipline structurally — a row that is not
`proposed` **must** carry a `provenance`, so no cycle can record a verdict without saying what decided
it. `docs/vision/rejected-paths.md` is retired to a pointer stub in the same ship; do not append to it.

Every write is `runner_before_images`-first like any other Supabase write (§19v); an INSERT writes
`row_data = NULL`, the `SES-142` precedent. Decisions ride the same `briefing-state` harvest as every
other card. On-demand bursts ("I have X minutes") serve claims rapid-fire in chat, same bookkeeping.

**The four ROOT claims are simultaneously questions, and that is the whole of decision 7.** John's
ruling: *"The four §19v purpose statements are seeded as root claims AND simultaneously presented as
§12 questions for him to clarify, correct, or restate in his own words — his answer is the ratified
root, not the doc's paraphrase."* They are seeded `status='proposed'`, `is_root=true`, so §12 serves
them like any other unratified claim and his tap ratifies or rewrites them in place. **They are
deliberately NOT `runner_questions` rows** — §9 caps the page at 5 open questions, so four roots filed
there would have evicted John's live operational questions to ask him something §12 already asks
better, with a class chip and his own wording accepted as the answer. One ask, one home.

**§12's SHAPE, since `SES-125` (`v7.0.160`) — a claim is a question row, not a card.** John's
spec word is *"formatted exactly like Questions"*, so the template renders §12 through the **same
`question()` function** as §9 rather than a second near-copy that has to be kept in step:
`visionClaim()` is a thin wrapper that adds a **class chip** (the `P1`–`P4` judgment class the
claim sets criteria for; "All classes" when broader) and swaps the ask box's three strings, since
John's own wording **replaces** a claim rather than asking about it. **1–3 rows per rebuild (the
drip contract above — `SES-125`'s original "always three" is superseded by it), always default
closed**, and a claim reappears every rebuild until it is decided — only silence carries it
forward. The three taps write what the `SES-157` table above says, nothing else (`v7.0.206`):
**Yes** ratifies the row (`status='ratified'`, `confidence='high'`); **No** writes
`status='rejected'` — **a rejected claim is a KEPT ROW, never a deletion**, and
`vision/rejected-paths.md` is a retired pointer stub that must not be appended to; a **typed
line** INSERTs a new ratified row in John's words and points the old row at it via
`superseded_by`.

**The one new rule, and it is load-bearing: a vision row's id MUST start `vision-`.** Claims and
questions both land in `briefing-state` under the **same `answers` key**, so at harvest time the
id prefix is the *only* thing that says whether an answer belongs to `public.runner_questions` or
to a claim in `public.vision_claims`. A vision row published with a bare slug would be harvested as a
question against a `qid` that does not exist — a silent no-op on John's tap, which is the one
failure a decision surface may never have. **Since `SES-157` (`v7.0.206`) the form is
`vision-<claim_ref>`** (e.g. `vision-VC-THESIS-030`), replacing the retired `vision-<doc>-<claim id>`
form (`vision-thesis-C-thesis-30`) — the prefix rule is unchanged and still the discriminator; what
changed is that the suffix is now a **unique key into a table** (`uniq_vision_claim_ref`) rather than a
doc-plus-line coordinate that only a text search could resolve. Harvest by `claim_ref`, never by
matching the claim's text: John's typed line rewrites that text, which is exactly when a text match
would silently stop finding the row it is meant to update.

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

**EVERY ASK IS CARRIED FORWARD — a decided target does not take John's words off the page with it
(`SES-132`, `v7.0.170`).** The rule above ("answer every open row on its own card") was
unfollowable for most of his asks, and the reason is structural rather than a forgetting:
`thread()` is reachable from exactly two call sites, `card()` and `question()` (which
`visionClaim()` delegates to), so a thread renders **only inside a still-live target** — while the
very act John performs removes that target from the next rebuild (§§5/6 rebuild `WHERE decision IS
NULL`, §9 `WHERE status='open'` capped at 5, §12 drops a decided claim). His line and the runner's
reply then sat in `runner_card_asks` displayed nowhere. His words for it, 2026-08-23T00:37Z: *"I
could swear i have wrote comments in the gated questions, and most are not showing. shouldn't the
thread show each page refresh and what your answers are?"*

**Measured against the published page when this shipped, and worse than the ticket estimated:**
**6 of 8** ask targets were orphaned, carrying **11 of his 13** recorded entries — only
`item-chi84-gate` and `q-adhoc-morning-standing` still rendered. So the rebuild rule is now:

- **§9.1 renders every ask target no section rendered**, default closed, one fold per target.
  It is a sub-block under §9 exactly like §4.1 and §7.1 — the LOCKED SECTION ORDER is *extended*,
  never renumbered.
- **The orphan set is computed after the whole page is built, never in place.** §12's vision
  claims render *after* §9.1's position, so an in-place computation calls every vision thread an
  orphan and prints it twice. The template emits a marker and `render()` substitutes the block at
  the end — with a **function** replacement, because `$&`/`$1` are special in `String.replace` and
  thread text is John's prose.
- **§9.1 rows carry no `data-awaits`.** A kept thread is information, not a decision owed; the
  same call `SES-127` made for §10, for the same masthead-may-not-disagree reason.
- **A cycle answering an open ask still answers it on the live card when there is one.** §9.1 is
  where the thread *survives* the decision, not a second place to hold a live conversation.

Guarded by `tests/regression/SES-132-orphan-ask-threads.js`, which renders this repo's real
template through a DOM stub and carries the negative control: the pre-change script renders **0**
orphan rows from the fixture the shipped script renders **1** from.

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
**but the read can come back TRUNCATED, and you must TEST that yours reached the block rather
than assume it from which tool you used (`SES-188`, `v7.0.216`).** Both documented read paths
are the *same* artifact-reader interception — `WebFetch` on a `claude.ai/code/artifact/…` URL
returns the identical `[Artifact … full HTML saved to /root/.claude/…]` wrapper the `Artifact`
`read` action does — and they differ only in **how much head each returns**. Measured live
2026-08-24 03:22–03:23Z against the 198.3 KB served page: the `Artifact` `read` arm stopped
inside the frame-runtime script and **never reached** `briefing-state`; `WebFetch` returned a
longer head that cleared `</style></head><body>`, the **complete** `briefing-state` block, and
ran on into `<script id="code">`. The block sits immediately after `<body><div id="page"></div>`,
which is what makes the longer read clear it.

**Do not turn that into "use WebFetch, it works."** That is one observation, and `SES-188` was
filed at 02:5xZ the same night by a cycle reporting the opposite. Both can be true: the cut-off
is a **size budget**, this page is 198.3 KB and **grows every rebuild**, and nothing has
established where the threshold sits or that it is stable. Replacing one unverified belief with
another is worse than the bug — a cycle that trusted the tool and rebuilt from a short read
would publish the empty skeleton and **destroy John's un-harvested taps**, which is the exact
failure the seed sentinel (`v7.0.197`) exists to prevent.

**So branch on the test, every harvest:**

- **Verified** — the `briefing-state` block is present, parses as JSON, **and** carries a value
  you can point at as live (the cheapest is a `reading` newer than the latest stored
  `runner_usage_readings` row; a decision, ask or directive you have not yet harvested does just
  as well). Proceed to the rebuild normally.
- **Unverified** — the block is absent, unparseable, or indistinguishable from an empty seed.
  **Decline the republish** and say so in the cycle row. That is already the correct behaviour
  and it stays mandatory; cycles `598a9b81` and `e42f8d4e` did exactly this on 2026-08-24 and
  were right to. Note the cost honestly rather than hiding it: declining leaves the page stale
  while John's decisions pile up behind it (18 undecided cards by 03:2xZ that night), so a
  cycle that declines twice in a row should say so on the next page it *does* publish.

**A truncated read is never evidence that the harvest is impossible** — only that *this* read
was short. `SES-188` stays open for the durable fix (a size-bounded read returning a named
block; a Supabase-side buffer the page writes taps into directly, retiring the page-as-buffer
design; or a sanctioned exception to the `~/.claude/` rule for this one read — the third needs a
§19v change). None of those is chosen here, and this test is not a substitute for choosing one.

The block's shape —
`{"items": {"item-<ID>": {"decision": "accept|reverse|rework", "reason": "...", "at": "<iso>Z"}},
"directive": "...", "reading": {"fable": "41", "all": "38", "h5": "12", "at": "<iso>Z"} | null}`
— a non-null `reading` newer than the last `runner_usage_readings` row becomes a new row there
(step 2), and the rebuild re-seeds the inputs from it. Proven live: John's mobile taps (`rework` + typed reason on the test card,
`accept` on SES-78a) read back verbatim. Non-empty `directive` text becomes a
`runner_directives` row (verbatim) and is cleared in the rebuild. Override approvals ride the
same state block when Needs-your-call cards exist.

**An Accept on a `shipped` card also writes the TICKET `done`, and is the only thing that ever does
(`SES-154`, `v7.0.205`; spec `docs/design/BRIEFING-COMMENTS-0823-DRAFT.md` decision 1, John "yes"
2026-08-23).** A cycle's ship writes `backlog_items.status = 'delivered'`; completion is conferred
here, at his tap, before-image first, followed by `SELECT public.recompute_backlog_queue();` — this
is the call site that releases the ticket's queue number, which the ship deliberately no longer
does. A `delivered` ticket keeps its number and stays in §8 while he decides, exactly as a
`removal proposed` one does. Reverse is unchanged and already correct: reopening the backlog row
restores the prior open state, which is what decision 1 asks of a rejection. **The full statement
lives in `runner-cycle.md` step 2 and step 7 — cited, not restated**, so these two files cannot
drift. Note honestly: decision 2 renames Reverse to "Reject" and **has not shipped**, so this page
still says Reverse.

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
