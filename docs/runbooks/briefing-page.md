<!-- DeepBench v7.0.199 | runbooks/briefing-page.md | directive 16b3ff73 — new regeneration step 1c: the §5/§6 card set is `SELECT * FROM public.briefing_open_cards()` (migration dir_16b3ff73_gated_card_retire), and a GATED card retires itself the moment its ticket reaches done/removed. JOHN FOUND THIS AND REPORTED IT BY PASTING A §6 ROW BACK AT US, verbatim: "6.6 Gated CHI-84 Tapping a step chip in chat jumps you to that step — built, but it needs a session you are in" — a card asking his permission to build something that had already shipped (CHI-84 closed done at 15:18Z in an attended session while its gated card sat undecided). MEASURED BEFORE A LINE CHANGED and it was not one card: of the 8 undecided cards carrying a ticket id, SEVEN had a ticket already done, and FOUR of the FIVE gated cards were dead questions (SES-121, SES-118, SES-117, CHI-84) — only AGT-015 was a live ask. Four of the five things §6 asked him to decide were moot, which is how an actionable section stops being read. THE ONE THAT WOULD HAVE SHIPPED WRONG IS THE TIDIER-LOOKING ONE: hiding every undecided card whose ticket is done. Run live on identical rows that renders 3 where the shipped rule renders 6 and kills ALL THREE of the night's ship cards — hiding the work from John and starving the trust ladder, whose only input is his verdict on shipped work. A gated card asks "may I build this?" (permission, moot once built); a ship card asks "was this good?" (a rating, meaningful forever). Only the first retires. NOTHING VANISHES SILENTLY: the call LABELS rather than hides — `render` is the filter, `retired_reason` says why — and the retired count is reported on the page. A retired card is NOT SHOWN, never ANSWERED: `decision` stays NULL and stays John's (§19v). "Still needed" is DERIVED from backlog_items.status, never a maintained flag — the same self-retiring shape as §10's skip filter (SES-127), so a ticket that ships drops its dead card with no write from any cycle. Ninth prose→code correction. LATERAL … LIMIT 1 because backlog_id is not unique (CHI-48, SES-97). Grants asserted both directions; 1 overload. Guarded by tests/regression/DIR-16b3ff73-gated-card-retire.js, whose assertion 1 fails on the pre-change tree. -->
<!-- DeepBench v7.0.197 | runbooks/briefing-page.md | directive b8d5ea7e — new regeneration step 1b: the `briefing-state` block is the VERBATIM output of `SELECT public.briefing_state_seed()`, never the template's sentinel and never hand-composed. THE CONTRACT HAD A HOLE THE SHAPE OF THIS STEP, found by reading all 835 lines: step 3 says READ and harvest, step 1 says build from the runner_ tables, and NOTHING anywhere said write the stored asks back into the rebuilt page. The one sentence that touches it — "the page keeps every ask in briefing-state forever" — ASSERTS that as a fact it relies on for insert idempotency while nothing made it true, so a cycle following this file literally published the template's empty block. MEASURED: thread(), orphanThreads(), readingSlot() and readingRecordedLine() read `state` and ONLY `state`; the served artifact carried PAGE_BUILT='2026-08-23T15:57Z' with asks:{} and reading:{} against 8 answered threads (one on item-chi84-gate, a card still awaiting John's decision) and 10 readings — two hours INSIDE the test window he announced at 13:57Z. SES-132's §9.1 orphan renderer shipped and was INERT: the wipe is upstream of it. THE HALF MOST LIKELY TO BE GOT WRONG LATER, so it is stated as a rule rather than left to inference: the seed MANUFACTURES the `at` strings the harvest parses back, and that harvest is idempotent only through uniq_card_ask (target_id, asked_at, question) — so they are UTC, minute precision, literal Z. Emit CST (this file's own display-times rule tempts exactly that) or seconds and every rebuild+harvest silently DOUBLES every ask; proven at ship, shipped form 8/8 round-trips, CST and seconds controls 0/8. Only `asks` and `reading` are seeded: the page is their only render home, while items/directive/answers/unblocks/settings are blank BY DESIGN because each re-derives from its durable table and seeding them would give one fact two homes. Guarded by tests/regression/DIR-b8d5ea7e-briefing-state-seed.js. -->
<!-- DeepBench v7.0.184 | runbooks/briefing-page.md | SES-119 — §8's Title column stops being a workaround and §10 becomes John's two lists. His standing instruction 2026-08-22, total scope: "across every session, display or anything that references work you perform for the backlog" — always ID + title, "he does not memorize IDs". §8's contract bullet used to read "its Title column is the `gist` extract, not `title`", written by SES-126 because imported tickets held the CLASS STRING in `title`. SES-91 repaired that — MEASURED 2026-08-23, not recalled: 0 of 562 open numbered tickets carry a class string, title IS NULL on 0 of 610 — so the rule now guards a defect that is gone while rendering description PROVENANCE in its place (queue 1 read "FOUND LIVE 2026-08-23T03:31Z by cycle b9201486 while exercising the st"). THE OBVIOUS FIX IS THE ONE THAT WOULD HAVE SHIPPED WRONG: a straight gist->title swap passes any check that asks "does Title come from title now?", but 46 open numbered tickets carry a bare retired declaration as their title (38 literally `Post-beta`) and TWO — LOG-134, LAV-30 — are in §8's live top 12, so the swap renders "`Post-beta`" as their title, strictly worse than the workaround. The rule is a FALLBACK, not a swap, and it lives in SQL (public.backlog_display_title, migration ses119_display_title) rather than in prose each cycle re-derives — the eighth precedent. A length heuristic was REJECTED ('Landing screen', 14 chars, is a terse title, not a marker) and the predicate matches only when the WHOLE title is the marker, so CHI-97 ("Beta-gate (bucket 2) — a red console error…") is kept. §10 splits into 10.1 Needs your decision / 10.2 Needs your desktop on John's own cut ("because they trigger different actions"), mapped on reason_kind with `other` falling to DECISION so an unclassified row never invents a chore, both lists rendering even at zero, and a 10.2 row with a kickoff_link carrying a "Kickoff ready" line. THE HALF THE TICKET'S WORDING DID NOT SETTLE: it says kickoff_link shows on entries "already designed", but design_status holds ONE value and for these rows it holds needs-desktop, so it can never also read `designed` — the observable fact is the presence of kickoff_link, and that is what the render keys on. Guarded permanently by tests/regression/SES-119-display-title.js. -->
<!-- DeepBench v7.0.182 | runbooks/briefing-page.md | SES-143 — the LOCKED SECTION ORDER gains §2b, the Automation panel, and its data contract. EXTENDED, never renumbered: §3–§14 keep their numbers exactly as §4.1/§7.1/§9.1 already work, because a renumber silently invalidates every §-reference in this file, in runner-cycle.md and in the spec. Three rules written down here rather than left to each rebuild: the panel carries NO data-awaits (a switch is a control, not a decision owed — SES-127's call for §10, and §1's counter must be able to reach zero); the drain status label renders ALWAYS, running or not, per the spec verbatim; and the "Run a cycle now" link now lives on §2b and is REMOVED from the masthead on John's explicit instruction — do not reinstate the second copy. The AUTOMATION object's five sources are tabulated because two of them are wrong in a way that looks fine: drain_named is John's NAMED list (SES-142), never the epic's live now tier, so a ticket filed after naming counts in neither number; and runner_settings must be read AFTER the tail's settings harvest, since the render deliberately shows his un-harvested tap over the stored value and the acknowledgement line is the only thing telling him the tap was picked up. -->
<!-- DeepBench v7.0.181 | runbooks/briefing-page.md | SES-144 — §8's data contract gains the Epic column rule: epics.name resolved through backlog_items.epic_id, blank (never an em-dash) for a ticket in no epic, third from the left per docs/BRIEFING-REDESIGN-0822.md §8. The scroll paragraph is corrected with it — §8 is a SEVEN-column matrix now, §14 is still six. -->
<!-- DeepBench v7.0.176 | runbooks/briefing-page.md | SES-139 — new regeneration step 6: the republish is no longer the last thing a cycle does. A cycle that actually ran one (outcome shipped/gated_before_build/reverted) and whose standing drain still returns `pick` fires exactly one successor after the lease release; runner-cycle.md's tail step (8) owns the gates and the reasoning, and nothing about the rebuild changes. Recorded HERE because two of its effects land on this page and would otherwise read as defects: John's "page rebuilt" stamp can move again in minutes rather than on the 3h cron (a suspiciously fresh masthead is the chain working, not a double-publish), and #lastact's "Not picked up by a run yet" clears far sooner after a tap. The third is the one that matters most for not re-root-causing a solved problem: a WALL-STOPPED cycle fires nothing, so a page that stops refreshing overnight is the budget wall doing its job. -->
<!-- DeepBench v7.0.175 | runbooks/briefing-page.md | SES-138 — the regeneration contract gains the page's NAME, which it has never mentioned at all. Found live 2026-08-23 by cycle 702aa2db on the SERVED artifact, not reasoned about: after the v7.0.173 rebuild the page came back named "briefing-out" — the build file's filename — instead of "DeepBench Morning Briefing". John finds this page by its name in his gallery and by its browser tab. CAUSE, measured: the Artifact tool scans only the first 8192 BYTES for a title tag, and briefing-template.html opens with a provenance block that grows by one comment on every ship, so the tag was present, correct, and never seen — at byte 24,770. THE MEASUREMENT MOVED WHILE BEING TAKEN, which is what decided the fix: the offset was 24,537 when SES-138 was filed at 02:20Z and 24,770 when it was revalidated at 02:34Z — 233 bytes in fourteen minutes, from one ship. It is a ratchet, so the fix is structural (the tag now sits at byte 0 of the template, above the provenance block, with the invariant stated in place) rather than the ticket's option (a), "pass title: on every publish" — that alone is a rule every future cycle must REMEMBER, the exact class of forgetting SES-86 phase 3 / v7.0.146 / SES-101 / SES-111 / SES-127 / SES-128 / SES-129 each had to convert from prose into structure. Seven precedents is enough. title: is still passed, as belt-and-braces, and new step 5 asserts the name on the SERVED artifact afterwards — never on the publish result, which reported success on BOTH wrong-named publishes (the v7.0.166 lesson). NOT CHANGED because it was measured and is already right: doc()'s self-publish head emits its own title inside the first ~150 bytes, so John's own taps have never been able to rename the page; only a cycle publishing the template-derived file hits the window. THE FLAW THE QA CAUGHT IN THE FIX ITSELF, worth recording because it would have shipped a guard that guarded nothing: the first draft of the template's guard comment wrote the literal markup when explaining the rule, which put tag-shaped strings ahead of the real tag and collapsed the regression test's negative control from 24,770 to 262 bytes. The comment now says "title tag" in words, and the test fails if anyone writes the markup back. Guarded permanently by tests/regression/SES-138-briefing-title-window.js, whose negative control asserts the pre-change shape WOULD have failed — two of its four assertions fail on the pre-change tree, which is what makes it QA rather than a presence check. -->
<!-- DeepBench v7.0.174 | runbooks/briefing-page.md | SES-116 — regeneration step 1 names the id chip's source, because the column it used to read is now enforced bare and two live undecided cards no longer have anything in it. `runner_items.backlog_id` is a JOIN KEY; it had been carrying the Language block's display string ('SES-115 (Tooling · P10 - Tooling)'), so every card→ticket join returned nothing. ses116_backlog_id_bare_check repaired 63 of 80 non-NULL rows and added a VALID CHECK, moving each raw string to the new `display_ref` rather than nulling it — 22 rows carry the ONLY copy of a real non-ticket reference (eleven a directive uuid), and §19v does not permit destroying that to satisfy a constraint. THE CONSEQUENCE FOR THIS FILE, which is the whole reason it is amended in the same commit rather than a later one: the chip must read coalesce(backlog_id, display_ref). Card 477454d7 (directive 603f44ea) and card 8a86d9d4 (the reading-card question) are UNDECIDED and now hold backlog_id = NULL, so a rebuild reading backlog_id alone renders two blank chips on cards awaiting John's tap — a user-visible regression caused by a tooling fix, shipped in the gap between two commits. Nothing in the template changes: card() already takes `tid`/`idLine` as composed arguments, so this is a contract the rebuilding cycle honours, not a code path. -->
<!-- DeepBench v7.0.172 | runbooks/briefing-page.md | directive 603f44ea — the regeneration contract gains the masthead's last-action stamp, and names the ONE line of it a rebuild must write: `var PAGE_BUILT`, the UTC minute you published, in the #code script that survives John's self-publishes. Everything else on the stamp is derived from briefing-state (SES-124's countWaiting() rule), so the only way to get it wrong is to forget PAGE_BUILT — which ships a page claiming to be older than it is and tells him a run has not picked his tap up when one has. §1's row in the LOCKED SECTION ORDER updated with it. -->
<!-- DeepBench v7.0.170 | runbooks/briefing-page.md | SES-132 — the ask contract gains the rule it could not follow, and the LOCKED SECTION ORDER gains §9.1. "Answer every open ask on its own card" has been the written rule since v7.0.145 and was structurally unfollowable for most asks: thread() is reachable from exactly two call sites, card() and question() (visionClaim() delegates to it), so a thread renders ONLY inside a still-live target — and the very act John performs removes that target from the next rebuild. MEASURED AGAINST THE PUBLISHED PAGE this cycle rather than quoted from the ticket, which said three of seven: SIX of EIGHT ask targets were orphaned, carrying ELEVEN of his thirteen entries, with only item-chi84-gate and q-adhoc-morning-standing still rendering. §9.1 is a sub-block under §9 like §4.1 and §7.1, so the locked order is EXTENDED, never renumbered — John approved these fourteen sections and a fifteenth is not this cycle's to add. The half a later editor will get wrong if it is not written down: the orphan set is computed AFTER the whole page is built, because §12 renders after §9.1's position and an in-place computation calls every vision thread an orphan and prints it twice; the substitution is a FUNCTION replacement because $&/$1 are special in String.replace and the text is John's prose. Rows carry no data-awaits (SES-127's §10 call, same reason). §9.1 is where a thread SURVIVES a decision, not a second place to hold a live conversation — a cycle still answers an open ask on its live card when there is one. -->
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
1c. **THE §5/§6 CARD SET IS ONE CALL, AND A GATED CARD RETIRES ITSELF WHEN ITS TICKET FINISHES
   (`v7.0.199`, directive `16b3ff73`; migration `dir_16b3ff73_gated_card_retire`).**

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

   - **Only GATED cards retire. Ship and test cards never do.** A gated card asks *"may I build
     this?"* — permission, and permission for work that already exists is not a question. A ship
     card asks *"was this good?"* — a **rating**, which stays meaningful after the ticket closes and
     is the trust ladder's only input. **This is the negative control, run live on identical rows:**
     the obvious implementation — hide any undecided card whose ticket is `done` — renders **3** rows
     where the shipped one renders **6**, and it kills **all three** of tonight's ship cards, hiding
     the night's work from John and starving the ladder. Getting this wrong looks tidier and is worse.
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

6. **The republish is no longer the last thing a cycle does (`SES-139`, `v7.0.176`).** After the
   republish, the name assertion, the cycle-row close and the lease release, a cycle whose own
   outcome was `shipped` / `gated_before_build` / `reverted` **and** whose standing drain still
   returns `pick` fires exactly one successor run — `runner-cycle.md`'s tail step (8) owns the
   gates and the reasoning; nothing about the rebuild itself changes. Two consequences that show up
   **on this page** and would otherwise read as bugs: John's *"page rebuilt"* stamp can now move
   again within **minutes** rather than on the 3-hour cron, so a masthead time that looks
   suspiciously fresh is the chain working, not a double-publish; and the `#lastact`
   *"Not picked up by a run yet"* line clears far sooner after he taps, because the next cycle is
   minutes away instead of hours. **A wall-stopped cycle fires nothing** — so a page that stops
   refreshing overnight is the budget wall doing its job, and is not a stall to root-cause again.

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

**The forward view of the queue is BACK (`SES-126`, `v7.0.161`).** `SES-124` struck "Next up —
top 5" and the "Next 3" line and disclosed, on its own card, that the page would carry no forward
view of the queue at all until this ticket landed. §8 and §11 are that replacement and they are
now live, so the gap paragraph in `runner-cycle.md` step 9 describes a window that has closed.
**The struck sections stay struck** — do not reinstate them; the matrix is the forward view now.

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
| `drain_left`, `drain_named` | `runner_drain_scope` for that directive, joined to `backlog_items` | `drain_named` is John's **named** list (`SES-142`), never the epic's live `now` tier; `drain_left` counts those not yet `done`/`removed`. A ticket filed into the epic after naming is **not** in either number. |
| `drain_history` | closed `drain-epic` directives | One line per completed drain: `"<epic> completed — N tickets at <time CST>"`. |
| `last_cycle`, `next_fire` | `runner_cycles` (most recent closed) and the routine's cron | Times in **CST and labeled**, per the page's standing times rule. |

Three rules a rebuild must not re-derive differently:

- **No `data-awaits` anywhere in the panel.** A switch is a control, not a decision owed — the same
  call `SES-127` made for §10 and `SES-132` for §9.1. §1's counter must be able to reach zero, and
  a checkbox is always there to be tapped.
- **The drain status label is shown ALWAYS**, running or not (spec, verbatim) — `"X of N tickets
  left"` while running, the completion line when done.
- **The `"▶ Run a cycle now"` link lives here now and NOT in the masthead** (John, explicit, in the
  §2b spec). Do not reinstate the masthead copy: two copies of one control is how a page starts
  contradicting itself.

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
