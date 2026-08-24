<!-- DeepBench v7.0.223 | docs/runbooks/session-hygiene.md | SES-188 — NEW CHECK 12: the briefing-template provenance-chain cap, and check 11's own text corrected. John's Accept on gated card f6c7c54a chose candidate 4 FIRST (trim the chain the way SES-164 trimmed runner-cycle.md's stamps) with candidate 2 — a Supabase-side tap buffer, designed jointly with SES-155/SES-156 — as the DURABLE fix; candidates 1 and 3 he rejected. Check 12 is the tripwire that keeps the trim from silently regrowing, and its honest bound is stated in the check itself: a trim only MOVES THE CEILING, because the page grows on every rebuild. THE TWO THINGS AN EDITOR MUST NOT TREAT AS PROVENANCE AND DELETE: the title-guard block (the Artifact publisher scans only the first 8192 bytes for a title tag, guarded by tests/regression/SES-138-briefing-title-window.js) and the seed sentinel above the briefing-state line (v7.0.197 — it is deliberately not a valid empty state). Check 11's text is corrected in the same edit under feature-owns-its-bugs: it said zero real {{rule:ID}} markers exist, which SES-175 made false ~40 minutes earlier in this same session. It now states the narrow boundary — check 11 asserts a marker's ID resolves, scripts/render-rule-blocks.js asserts the text under it still matches — and names marker coverage (2 of 84) as the number to watch. -->
<!-- DeepBench v7.0.218 | docs/runbooks/session-hygiene.md | SES-176 — checks 9/10/11, the truth tripwire, documented alongside checks 1-8. They read the SES-174 rule registry through its repo-side snapshot docs/governance/RULES-SNAPSHOT.md (a live read is refused for the reason check-session-docs.js's own header gives: a checker that silently no-ops without credentials is a false all-clear). Recorded here because a tripwire's first catch is its justification: B25 (retired) and B31 (superseded by B42) are BOTH still stated in present tense in docs/RUNNER-GOV-0820-REQUIREMENTS.md while runner-cycle.md says B25/B26 were struck by John's explicit removal — reported, never auto-fixed, because a governance register is not something an unattended cycle edits. The known bound is stated in the check body rather than left to be found: check 9 decides on vocabulary within a block, so B26 does NOT flag (its entry ends "until SES-85 retires it", about the unclassed remainder, not about B26). -->
<!-- DeepBench v7.0.198 | docs/runbooks/session-hygiene.md | SES-121 — body moved verbatim from .claude/skills/session-hygiene/SKILL.md (which remains as a thin loader); .claude/ is not writable by unattended cycles (register B39), this runbook is. This file is the canonical copy. -->

# Session Hygiene Check

**Mechanized 2026-07-21 (`SES-010`, extended same day).** Checks 1, 1b, 2, 3, 3c, 5, 5b, 5c, 5d, 6, 6b, and 6c below are now a single script: `node scripts/check-session-docs.js [--worktree=<path>]` (defaults to `process.cwd()`). Run that instead of re-deriving each grep by hand — it's the same logic, verified against this exact list. Checks 4 (kickoff doc boilerplate) and 3b (now/next/later misclassification) stay manual/judgment calls, not mechanized. On John's own machine this also runs automatically via a `PostToolUse:Bash` hook right after any `git worktree add` call (`C:/Projects/.claude/hooks/run-hygiene-after-worktree-add.js`) — but that hook lives in local, non-git-tracked `C:/Projects/.claude/settings.json`, not this repo, so it's machine-specific and not guaranteed present in every environment. Still run the script (or the full checklist below) explicitly at Step 1 rather than assuming the hook already covered it.

**(Corrected 2026-08-21 — the retargeted script emits more checks than this list names; see `SES-83` (d), `v7.0.124`.)** The mechanized set is 1, 1b, 2, 3, 3c, 3d, 3e, 3f, 3s, 5, 5b, 5c, 5d, 6, 6b, and 6c — this skill's own header had fallen behind `scripts/check-session-docs.js` after the backlog-snapshot retarget (`v7.0.115`) added 3s/3d/3e/3f and 5e. **Known discrepancy, not fixed here:** the script's own header comment (line 6 of `scripts/check-session-docs.js`) lists "1, 1b, 2, 3, 3c, 3d, 5, 5b, 5c, 5d, 5e, 6, 6b, 6c" — it names 3d and 5e but still omits 3s, 3e, and 3f, so even the script's self-description is slightly stale relative to what it actually runs. Flagging it here rather than editing the script, which is out of scope for this pass.

A tripwire, not an audit. The 2026-07-01 cleanup fixed the root causes of doc bloat by making two files self-maintaining (a rolling window on `CLAUDE-STATE.md`, an archive split for `FEATURES.md`) and eliminating a third problem entirely (deleted the hardcoded agent-roster tables instead of trying to keep them in sync). This skill exists to catch it if those rules stop being followed — not to redo the full audit every time. Keep every check here cheap: sizes and greps, never a full read of a file that's supposed to stay small. If this skill itself starts taking meaningful time or tokens, that's a sign it's grown past its job — trim it back to checks, not fixes.

## What to check

Run these against your session's own worktree path (`C:\Projects\deepbench-frontend\.claude\worktrees\<your-session-name>\`), never the shared checkout at `C:\Projects\deepbench-frontend` directly — per `CLAUDE.md`'s router, that worktree should already exist and be freshly branched from `origin/dev` before this skill ever runs, so it's the correct, current copy. Use size/grep tools, not the Read tool, for steps 1–3 — the whole point is these checks cost near-nothing.

**1. `CLAUDE-STATE.md` size.**
Flag if it exceeds ~10 KB (the post-cleanup baseline is ~4.6 KB). Growth past that usually means the rolling-window close-out step isn't happening — check whether `CLAUDE-DESIGN.md`'s close-out steps actually ran at the end of the last few sessions. (`DeepBench-Session-Init.md` no longer carries a close-out step — its `SES-120` rewrite is a pointer doc with steps 0–9; close-out lives in `CLAUDE-DESIGN.md`.)

**1b. Per-entry character cap (added 2026-07-21, `SES-010` Tier 1 item, built same day John asked).** Check 1 only catches the *whole file* growing past baseline — a technically-under-cap file can still hide one paragraph-length bullet, exactly the bloat pattern the 2026-07-01/07-07 cleanups fixed. Flag any single "In flight now" or "Last 3 sessions" bullet over ~800 characters (calibrated against this file's own real entries — generous enough for a genuinely detailed 3-4 sentence bullet, tight enough to catch a paragraph). Report only, same as every other check here — don't auto-trim a flagged entry.

**2. `CLAUDE-STATE.md` "Last 3 sessions" list.**
Grep for the `**Last 3 sessions:**` line and count the bullet entries under it. More than 3 means the rolling window isn't being enforced — the oldest entry should have been moved into `docs/SESSIONS.md` and dropped from `CLAUDE-STATE.md`.

**3 / 3s. Feature inventory size, Done-row, and stub-purity checks.**
**(Superseded 2026-08-21 — `docs/FEATURES.md`/`FEATURES-NEXT.md`/`FEATURES-LATER.md` were emptied to legend-only stubs in `v7.0.113`; the real ticket store is `public.backlog_items`, with an in-repo copy at `docs/backlog/BACKLOG-SNAPSHOT.md`. `scripts/check-session-docs.js` was retargeted to the snapshot in `v7.0.115`. Split below into the two checks the script now actually runs. `SES-83` (d), `v7.0.124`.)**

**3s. Stub-purity assertion (new, `SES-83` (d), `v7.0.124`).** Each of the three `FEATURES*.md` files is asserted to contain **zero** ticket rows — they're legend-only now, by design, since work selection reads `public.backlog_items` directly by SQL. Fires per stray row found; fires zero times today by construction, and is meant to be silent until it matters. A hit means a session filed a ticket into a stub instead of the table — invisible to work selection, since selection never reads these files' contents, only their legend.

**3. Backlog snapshot checks — done-row, Type, length, unclassed, duplicate-id (against `public.backlog_items` via `docs/backlog/BACKLOG-SNAPSHOT.md`).** Five sub-checks, all reading the snapshot rather than the old three markdown files — with one exception called out in the first bullet, where the size baselines still measure the stub files on disk:
- **3 (size + done-on-open-board).** Two unrelated things share the label `3`, so read them separately. **The size half still measures the three stub files themselves on disk, NOT the snapshot** — `FEATURES.md` ~40 KB and `FEATURES-LATER.md` ~150 KB (`FEATURES-NEXT.md` has no baseline and is skipped). Post-trim those files are ~5 KB of legend, so this half is effectively dormant; it survives as a tripwire that would fire if a stub ever refilled. Verified against `scripts/check-session-docs.js` `checkTrimmedStubs()`, which is where the baselines live. **The done-on-open-board half** is the one that reads the snapshot: any ticket with a `done` status still on the open board. Live: **5** — `AA-199`, `DAT-22`, `SES-79`, `HAR-41`, `LOO-37`, each named individually, not aggregated.
- **3c (Type coverage).** Tickets with a blank `Type` cell, read from the snapshot, reported as **one aggregated WARN line** so it cannot bury the actionable flags. Type is tier-scoped, not universal: a `later` ticket owes no Type, and since `SES-117` `ck_backlog_type_when_promoted` rejects a blank Type on any now/next row — so a non-zero count here is later-tier rows (compliant) unless the snapshot predates that repair. Live: **228 of 613**, all 228 `later`-tier (measured 2026-08-23).
- **3d (description length cap).** Ticket `description` over a 2000-char cap. Live: **3** — `AGT-50`, `HAR-37`, `LOO-37`.
- **3e (unpickable — no `priority_class`).** Tickets with no `priority_class`, therefore unpickable by work selection. Live: **458 of 556**, one aggregated WARN line. This is `SES-85`'s known classification-sweep scope, not new drift — the line says so.
- **3f (duplicate ticket ids).** Live: **1** — `CHI-48` appears twice. Deliberately report-only: choosing which of the two real tickets gets renumbered is a judgment call, not a lint's.

The four gotchas below are kept verbatim as historical rationale from the markdown-file era — they're why the row-matching regex looks the way it does, and the same shape of trap (status-string matching, legend-line false positives, literal-pipe parsing, bundled multi-ID rows) is exactly what the snapshot-reading checks above still have to avoid, just against a different source file:
- **Match any `✅`-prefixed Status text, not just the literal string `✅ Done`** (found 2026-07-16 — descriptive completion phrasing like `✅ Fixed and verified`, `✅ Closed`, `✅ Root cause fixed and measured` evaded a literal `✅ Done` grep for weeks; 12 rows across `FEATURES.md`/`FEATURES-NEXT.md` sat un-archived across multiple hygiene passes before a broadened sweep caught them). Per the 2026-07-16 standardization (`docs/STANDARDS.md`), all three status values going forward should be exactly `✅ Done` / `🔶 Partial` / `❌ Missing` with no appended descriptive text — additional detail belongs in the Feature cell, which already carries full narrative detail in every row. Until every row is fully migrated, keep matching on the `✅` prefix rather than the exact string, and treat any non-conforming Status cell you find (extra text after `Done`/`Partial`/`Missing`, or a status prefixed with `✅` but not literally `✅ Done`) as its own drift flag, separate from the archival check.
- A bare grep for `✅ Done` also matches the legend line and rows whose *description text* mentions another already-shipped feature in passing (e.g. a `❌ Missing` row that says "Depends on: PE-04 ✅ Done" in its description) — that's not drift, don't flag it. Check the actual Status column, not just whether the string appears anywhere on the line. (Found during this skill's first smoke test, 2026-07-01.)
- A description containing a literal `|` character (e.g. a code snippet like `` `'structural' | 'reasoning'` ``) will throw off naive `split('|')` column counting if you're scripting this rather than eyeballing it. If in doubt on a specific row, read that one line directly rather than trusting a quick parse. (Found during this skill's first smoke test, 2026-07-01.)
- **Bundled multi-ID rows evade a `\s*\|` pattern entirely** (found 2026-07-15 — `MI-32 / MI-34 / MI-35 / MI-37 / MI-38 / MI-39 / MI-40`, a single row covering 7 IDs, sat un-archived and undetected through 4 separate hygiene passes because its ID cell is `MI-32 / MI-34 / ...`, not a bare ID, so `\s*\|` right after the first ID never matched). Use `[^|]*` between the first ID and the closing pipe, not `\s*`, so anything up to the next real pipe counts as the ID cell, single or bundled.

Total live output today (2026-08-21): **9 flagged, 3 warning** — 3s: 0; 3: 5 done-on-open-board; 3d: 3; 3f: 1 (nine flags), then 3c: one aggregated WARN covering 228 and 3e: one aggregated WARN covering 458. **The third warning is environmental, not drift:** run from a cloud cycle there is no shared checkout at `C:/Projects/deepbench-frontend`, so `git worktree list` fails and checks 5/5b/5c/5d skip with a WARN. On John's laptop that warning is absent and the expected line is **9 flagged, 2 warning**.

**3b. Now/next/later misclassification (soft check, spot only).**
**(Retargeted 2026-08-21 — this is no longer a row sitting in the wrong FILE; the three files are legend-only stubs now. It's a wrong `tier` column value (`now` / `next` / `later`) on a row in `public.backlog_items`. `SES-83` (d), `v7.0.124`.)** Not mechanically checkable cheaply — if a ticket tagged `tier: now` reads as clearly not about MI speed/loop/harness/charts, or a ticket tagged `tier: later` is actually MI-relevant, flag it as a one-off drift note rather than trying to re-audit the whole classification.

**3c. Type-tag coverage (added 2026-07-08).**
**(Retargeted 2026-08-21 — `docs/FEATURES.md`/`FEATURES-NEXT.md` no longer carry rows to check; this now reads `docs/backlog/BACKLOG-SNAPSHOT.md`'s Type column. `SES-83` (d), `v7.0.124`. Rule restated 2026-08-23, `SES-117`.)** Type is tier-scoped, not universal: a `now`/`next` row must have a `Type` cell filled in (Task Success Rate/Speed/Architecture/Feature/Tech Debt/Data/Observability, or a justified new one — presence, not membership, is what's enforced), and since `SES-117` (v7.0.178) the database constraint `ck_backlog_type_when_promoted` rejects a blank Type on any now/next row, so this fills self-enforcingly at the `later → now/next` promotion. A `later` row owes no Type. Live: **228 of 613** blank, all 228 `later`-tier (compliant, nothing to do), reported as one aggregated WARN line (see check 3 above) — that volume is exactly why it's aggregated rather than named row-by-row.

**6. `docs/STANDARDS.md` drift checks (added 2026-07-21, `SES-009b`).**
`docs/STANDARDS.md` had zero mechanized coverage until this check — `scripts/check-session-docs.js` previously only watched `CLAUDE-STATE.md` and the 3 `FEATURES*.md` files. Three sub-checks, same cost discipline as everything else here (regex/size only, no full parse):
- **Size baseline** — flag if the file exceeds ~34 KB by more than 25%. Unlike `FEATURES.md`, growth here isn't automatically bloat (new standing rules are expected content) — the slack is deliberately generous.
- **6b. Duplicate category-letter definitions.** `SES-005` (2026-07-21) found and hand-fixed a real duplicate `Category K/M/L` definition in Section 4/5 that nothing had caught for weeks. This check catches a recurrence of exactly that bug shape automatically.
- **6c. Dangling `Section N` cross-references.** Extracts every real `## Section N:` heading, then flags any prose mention of `Section N` where `N` doesn't match a real heading — catches a stale reference left behind after a section is renumbered or removed.

**4. Kickoff doc boilerplate spot-check.**
**(Fixed 2026-07-16 — was "sort `docs/kickoffs/` by modification time," which is unreliable now that this check always runs from a freshly-created worktree: `git worktree add` checks out every file at once, so every file's mtime is the checkout instant — "most recent by mtime" is meaningless there and will pick the wrong file.)** Find the true most recent kickoff doc via `git log --oneline --name-only -20 -- docs/kickoffs | grep "docs/kickoffs/" | head -1`, then open that file. Look at its "AI PATTERN CHECK" and "CLAUDE CODE VERIFICATION CHECKLIST" sections. Under the 2026-07-01 "standing rules by reference" rule, an N/A pattern check should be one line, and the verification checklist should reference standing categories by name (e.g. "STANDARDS.md Section 11 applies") rather than re-deriving them in full — see `docs/STANDARDS.md` Section 3. If the most recent kickoff doc restates a standing rule in full prose instead of referencing it, boilerplate is creeping back in. This is a soft check (one doc, recent-ness matters more than exhaustiveness) — don't read more than one or two kickoff docs for this.

**5. Stale worktree check (added 2026-07-08).** `git -C "C:/Projects/deepbench-frontend" worktree list`, then for each worktree path (other than the shared checkout itself) run `git -C "<worktree-path>" merge-base --is-ancestor HEAD origin/dev`. If that succeeds (exit 0), the worktree has zero commits it hasn't already pushed to `dev` — check **first** whether its name has an inflight marker: `inflight/<name>.md` on a freshly fetched `origin/dev` (repo root since 2026-08-21, register B41; legacy location `.claude/inflight/` also checked — retargeted from `CLAUDE-STATE.md` bullets by `SES-011`). Per `CLAUDE.md`'s router step 1 / the `session-setup` runbook, every active session creates its marker right after worktree setup, specifically so this check can tell the two cases apart. A marked worktree is exempt from this check regardless of merge/dirty state — a genuinely active design conversation that hasn't committed anything yet looks identical on disk to a finished-and-forgotten one (both zero-ahead, zero-dirty); the inflight marker, not the git state, is the authoritative liveness signal, and that is exactly what `scripts/check-session-docs.js` reads (the fetched `origin/dev` listing of `inflight/` + `.claude/inflight/`, plus check 5e's on-disk-but-unpushed markers). Only flag a worktree with **no** matching marker — that's the real "session finished but skipped the `session-setup` runbook's worktree-removal cleanup" case. (Found live 2026-07-21: this check previously flagged 7 genuinely in-progress worktrees as stale purely because none had committed anything since branching — the liveness-marker requirement is the fix.) Flag each unbulleted stale one by name; removing them (`git worktree remove` + `git branch -D`) is safe once confirmed merged, but per this skill's own rule, report first rather than auto-fixing unless asked.

**5b. Orphaned (never-registered) directory check (added 2026-07-17).** Check 5 above only ever iterates `git worktree list`'s output — which means it is structurally blind to any directory sitting under `.claude/worktrees/` that git itself never registered. That gap is real, not theoretical: 28 empty orphaned directories were found live 2026-07-16/17, invisible to every prior hygiene sweep specifically because they never appeared in `git worktree list` in the first place. These are not stale-but-real worktrees (check 5's case) — they're empty directory shells, most likely from `git worktree add` invocations that failed or were aborted before checkout populated them, never getting far enough to register with git at all. Zero data-loss risk either way since there's nothing in them. **Why this is guaranteed, not just observed (added 2026-07-21, John asked how to tell a stray from a genuinely open design session):** `git worktree add` is mandated as the literal first action of any session, before any read or write (`CLAUDE.md` router step 1), and the same setup step requires the `inflight/<name>.md` marker immediately after (session-setup runbook). So a session that's actually done anything already has both a registered worktree and an inflight marker — there's no valid sequence where a real, currently-open session has neither. Confirm no orphan branch exists either (`git branch --list | grep <name>` — a branch without a live checkout would still carry real committed work, unlike a bare empty directory) before treating a flagged name as a pure stray; if that also comes back empty, deletion is unconditionally safe, not just low-risk. To catch this class, cross-reference a raw directory listing against `git worktree list`, not just walk the latter: list every entry under `.claude/worktrees/` on disk, then flag any name present in that raw listing but absent from `git -C "C:/Projects/deepbench-frontend" worktree list`'s paths. Report each flagged name; deleting them is safe (nothing git-tracked, nothing registered) but per this skill's own rule, report first rather than auto-fixing unless asked.

**5c. "In flight now" narrative staleness (added 2026-07-17).** Check 5 only verifies whether a bullet's *worktree* is stale — it doesn't verify whether the bullet's own *prose* is still accurate. Found live 2026-07-17: a bullet read "`continuity-ux-0716` (design session) — ... CHI-09 (Agent Routing narration accuracy, next up)" while the worktree itself was already fully merged (caught by check 5) *and* the two features that actually shipped next in that same track (`CHI-13`, `CHI-14`) had done so through two entirely different, already-cleaned-up worktrees — the bullet's "next up" claim was stale on top of the worktree being stale, a second independent failure mode. For each "In flight now" bullet, grep every feature ID it names against `docs/FEATURES-ARCHIVE.md` — if a named ID is already archived there, the bullet is describing already-completed work as pending and should be flagged (or corrected, if asked) regardless of what check 5 found about the worktree.

**5d. Phantom bullet check (added 2026-07-21, `SES-010`).** Check 5 only catches a *worktree* with no bullet. The inverse gap is just as real: an inflight marker naming a worktree that was already cleaned up (the session-setup runbook's worktree-removal step ran) without the marker being deleted (the marker-removal half of close-out skipped) — the marker outlives the worktree it describes. Found live 2026-07-21, twice independently in the same day: `design-loo-013-broker-fallback-0721` had an active "In flight now" bullet with no matching directory and no `git worktree list` entry at all. To catch this: for every worktree name mentioned in an "In flight now" bullet, confirm it actually appears in `git -C "C:/Projects/deepbench-frontend" worktree list`'s output. Flag any marker/bullet whose named worktree is absent from that list — that's a session that ran the worktree-removal cleanup but skipped deleting its inflight marker (session-setup runbook close-out). Report first, same as every other check here; removing a confirmed-phantom bullet is safe once flagged, but don't auto-edit `CLAUDE-STATE.md` without asking.

**7. Runbook header-stamp cap (added 2026-08-23, `SES-164`; renumbered from a duplicate "6" 2026-08-23 — check 6 is the STANDARDS.md drift set above).** The version-stamp comment every ship
prepends to a runbook is a good convention with no upper bound, and it had quietly become the single
most expensive thing an Automated cycle reads. **Measured before the fix, not estimated:**
`docs/runbooks/runner-cycle.md` carried **45 stamps — 69,918 of its 205,135 characters, 34.1% of the
file — ahead of the first instruction at line 46**, re-read in full by every cycle and past the size
a single `Read` call returns. The stamp convention **stays**; what it now has is a ceiling.

For each file in `docs/runbooks/`, count the leading `<!-- DeepBench v… -->` comment lines. **Flag any
runbook carrying more than ~5**, and report the count plus what share of the file it is — the share
is the number that makes the case, since a long runbook can carry more stamps than a short one before
it matters. The trim is the `SES-164` shape and it is not a judgement call:

1. Keep the **newest** stamp, plus one stamp recording the trim.
2. **Before moving anything, check each retired stamp for an editor warning that exists nowhere
   else.** This is the step that makes the trim safe and it is the one that will be skipped: on
   `runner-cycle.md`, nine of ten spot-checked warnings were already restated in the body, and the
   tenth (`SES-154`'s pick-vs-retirement predicate warning) appeared **zero** times outside its
   stamp. Relocate that kind into the body **next to the step it protects** — never delete it.
3. Move the rest **verbatim** to `docs/SESSIONS.md` under a clearly-named appendix. They are in git
   history too, but git history is not where anyone looks.
4. **Prove the body is otherwise byte-identical** — `sha256` over everything below the header,
   before and after, differing only by the deliberate insertions from (2). A restructure that
   cannot show this is not content-preserving, whatever the diff looks like by eye.

Report first, like every other check here — don't trim a runbook without being asked.

**8. `docs/SESSIONS.md` rotation tripwire (`SES-172`, Selfbuild M1).** Flags the live sessions log
past ~1.5 MB; entries older than the previous month rotate **verbatim** to a dated
`docs/SESSIONS-ARCHIVE-*.md`.

**9 / 10 / 11. The truth tripwire (added 2026-08-24, `SES-176`, Selfbuild M2).** Checks 1–8 ask
*"is this file too big, is this row shaped right?"*. These three ask the different question the M2
epic exists for: **do two files still tell the same story?** They read the rule registry `SES-174`
built (`public.governance_rules`) through its repo-side snapshot,
`docs/governance/RULES-SNAPSHOT.md`, regenerated by
`node scripts/export-governance-snapshot.js` and committed into every ship commit set.

*Why a snapshot and not a live read* — the same reason checks 3/3c/3d read `BACKLOG-SNAPSHOT.md`,
and it is stated in `scripts/check-session-docs.js`'s own header: a network round trip does not
belong in a session-start tripwire, and **a checker that silently no-ops without credentials is a
false all-clear.** `governance_rules` is additionally `service_role`-only (`SES-174` locked
`anon`/`authenticated` to zero privileges), so a session-start read could not work here even in
principle. A **missing** snapshot is therefore a loud FLAG naming the regeneration command.

- **Check 9 — a retired rule still stated in live voice.** For each rule whose `status` is not
  `live`, every mention of its **rule ID** is read in its enclosing block (one bullet, one
  paragraph). A block carrying retirement vocabulary (`retired`, `superseded`, `struck`,
  `replaced`, `no longer`, `do not reinstate`, …) is a doc correctly *recording* the retirement and
  passes; a block with none is the doc still *asserting* it, and flags.
  **It is ID-anchored on purpose**: the registry's `statement` is `SES-174`'s paraphrase, not the
  doc's literal sentence, so matching the statement against prose finds nothing and ships a check
  that passes forever. HTML provenance comments are excluded — they quote retired ids constantly,
  and findings about a file's history are noise.
- **Check 10 — every `canonical_doc` pointer resolves.** A missing file is a **FLAG** (those rules
  have no authoritative text at all); a file that exists whose `#anchor` cannot be located is a
  **WARN** (a stale anchor, not a missing home). Findings are aggregated per target, so forty rules
  pointing at one deleted file is one finding, not forty.
- **Check 11 — every `{{rule:ID}}` marker resolves** to a registry row. **It stopped being a
  forward guard on 2026-08-24** (`SES-175`, `v7.0.222`): the first real markers now exist — `B40`
  above the claim SQL in `runner-cycle.md` and `session-setup.md` — so a clean run finally means
  something. It remains a **narrow** check, and the boundary matters: it asserts a marker's **id
  resolves**, never that the text under it still matches the registry. That second check is
  `scripts/render-rule-blocks.js`, run separately. **Marker coverage is the number to watch** —
  2 of 84 rules at the time of writing, so for the other 82 the doc prose and the registry's
  paraphrase remain two unreconciled homes of the same rule.

**What they found on the first live run, recorded because a tripwire's first catch is its
justification:** `B25` (`retired`) and `B31` (`superseded by B42`) are both still stated in present
tense in `docs/RUNNER-GOV-0820-REQUIREMENTS.md` (lines 201 and 280) with no retirement marker in
their entries — while `runner-cycle.md` records that B25/B26 were *"struck by John's explicit
removal"* and says **"Do not reinstate the struck B25/B26 sections."** The canonical register and
the runbook disagree, and a session reading only the register would rebuild sections John removed.
Two `#B31` / `#B32` anchors in `runner-cycle.md` are also stale. **Reported, not auto-fixed** — a
governance register is not something an unattended cycle edits.

**Known bound, stated rather than discovered later:** check 9 decides on vocabulary within a block,
so a block containing retirement vocabulary about a *different* subject can mask a live-voice
assertion. Measured live: `B26`'s entry ends *"until `SES-85` retires it"* — about the unclassed
remainder, not about B26 — and B26 therefore does **not** flag, though it is as retired as B25. The
check is a tripwire, not a proof.

**12. `briefing-template.html` provenance-chain cap (added 2026-08-24, `SES-188`, John's Accept on
gated card `f6c7c54a`).** The same unbounded-growth shape check 7 caps on the runbooks, on the one
file where it had a second, worse consequence. Count the HTML comment blocks sitting **above** the
`<script type="application/json" id="briefing-state">` line in `docs/runbooks/briefing-template.html`.
**Flag more than ~4**, and report the count plus what share of the file they are.

**Why this one is not cosmetic, measured rather than argued.** A cycle harvests John's taps by
reading the *published* page and parsing that `briefing-state` block, and the read is served
head-first under a size budget. Every comment above the block pushes it further down. Measured
2026-08-24: **20 comment blocks holding 42,025 chars — 24.7% of the file — all of them above the
block**, while the served page crossed the threshold where the block stops being returned at all
(reached at 198.3 KB, missed at 250 KB, 25 minutes apart, the variable being a republish). A cycle
that cannot verify its harvest must decline to republish, so the page goes stale and John's
decisions pile up behind it — three consecutive cycles did exactly that.

The trim is check 7's shape with one addition, and **the addition is not optional**:

1. Keep the **newest** stamp, plus one stamp recording the trim.
2. **Keep the title-guard block at the top of the file and the seed sentinel above the
   `briefing-state` line — neither is a provenance stamp.** The title guard exists because the
   Artifact publisher scans only the **first 8192 bytes** for a title tag
   (`tests/regression/SES-138-briefing-title-window.js` fails if it leaves the window); the seed
   sentinel is what stops a rebuild publishing a plausible-looking empty state (`v7.0.197`).
   New comments go **below** the title-guard block, never above it.
3. Check each retired comment for an editor warning that exists nowhere else, and relocate that
   kind into the body next to what it protects — never delete it. This is the step that makes the
   trim safe and the one that will be skipped.
4. Move the rest **verbatim** to `docs/SESSIONS.md` under a named appendix.
5. Prove the body below the header is otherwise byte-identical (`sha256` before and after).

**Honest bound, and it is the reason this is a tripwire and not the fix:** trimming only **moves
the ceiling**. The page still grows on every rebuild. The durable fix John chose is a Supabase-side
buffer the page writes taps into directly, designed jointly with `SES-155`/`SES-156` — this check
is what keeps the harvest working until that lands.

## Reporting the result

**If everything's within bounds:** say so briefly — a one- or two-line "all clear," not a report. Don't elaborate on checks that passed. This should read like a quick status ping, not a deliverable.

**If something's flagged:** name exactly what and by how much — e.g. "`CLAUDE-STATE.md` is 14 KB, over the 10 KB baseline — the last session's close-out likely skipped the rolling-window trim" — and stop there. Do not restructure, prune, or edit anything automatically. This mirrors how the original 2026-07-01 cleanup worked: findings first, explicit go-ahead before any file gets rewritten. If the user wants the fix applied, that's a separate, deliberate step — possibly worth using the full audit prompt (below) if more than one thing is flagged at once, since a single flag might just need a two-line edit but multiple flags together might mean the underlying rule needs revisiting, not just a one-off patch.

If asked for the deeper version instead of the tripwire, fall back to this prompt (from the original 2026-07-01 audit conversation) rather than improvising a new one:

> Run a session-efficiency audit: check file sizes for CLAUDE-STATE.md, FEATURES.md, STANDARDS.md, and any docs read unconditionally at session start. Flag anything that's grown past its intended size (unbounded logs, done+active items mixed together, hardcoded tables duplicating a source-of-truth file). For each finding, show before/after size impact and ask before restructuring. Also spot-check whether the "standing rules by reference" pattern in recent kickoff docs is actually holding, or whether boilerplate has crept back in.
