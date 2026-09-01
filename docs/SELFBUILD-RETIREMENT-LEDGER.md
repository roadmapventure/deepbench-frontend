<!-- DeepBench | SELFBUILD-RETIREMENT-LEDGER.md | SES-170/SES-145/SES-93 consolidation sweep, 2026-08-23 -->
# Selfbuild Retirement Ledger

**Contract:** every rule, statement, or file removed or rewritten by the Selfbuild project gets
an entry here: what it said, where it lived, why it was retired, where the content survives
(if anywhere), and the restore path. Git preserves everything — nothing in this ledger is
lost, only moved out of the live rulebase. This file exists so removals are *findable with
reasons*: if you are looking for a rule you remember and can't find it, check here before
concluding it never existed. Entries are append-only; newest at the bottom of each section.

Restore path for any entry, unless stated otherwise: `git log --follow -- <path>` in
`deepbench-frontend`, then `git show <commit>:<path>` to recover the exact prior text.

---

## Entries

<!-- Entries appended below by the sweep; one per removal/rewrite. -->

### 1. CLAUDE.md — governance-mode blockquote (rewrite)
- **Said:** Automated mode "exists only in a session launched by the approved runner (`SES-78`,
  not yet built), which stamps its identity into the session's inflight file".
- **Lived:** `CLAUDE.md`, governance-mode blockquote after the router steps.
- **Why retired:** the runner shipped and went live 2026-08-20 (100+ cycles); the stamp is
  echoed into `runner_cycles` rows, not the inflight file; chained continuation cycles exist
  (`SES-140`). The "not yet built" claim was 3 days stale and wrong on the stamp mechanism.
- **Survives:** rewritten in place (LIVE + `runner_cycles` stamp + SES-140 chaining); full
  detail in `docs/GOVERNANCE-MODES.md`.
- **Restore:** git history of `CLAUDE.md` (pre-2026-08-23 sweep commit).

### 2. docs/GOVERNANCE-MODES.md — "## Automated" pre-live body (rewrite)
- **Said:** "Nothing runs under this mode until a follow-up design session builds the runner
  against §19v's constraints and John approves it — structurally enforced: the stamp that
  proves the mode cannot exist before the runner does."
- **Lived:** `docs/GOVERNANCE-MODES.md`, `## Automated` section body.
- **Why retired:** contradicted the file's own registry table, which already said LIVE
  2026-08-20 with the SES-151 clock-grid cadence and SES-140 in-session chaining.
- **Survives:** rewritten in place with the live description (LIVE 2026-08-20; hourly cron +
  `scheduler_gate()` per SES-151; in-session chaining per SES-140), consistent with the
  registry row.
- **Restore:** git history of `docs/GOVERNANCE-MODES.md`.

### 3a. docs/WORKING-WITH-JOHN.md — BETA/NON-BETA close-out split (rewrite)
- **Said:** "Every close-out splits its open items into a BETA section and a NON-BETA section
  (added 2026-07-29, `design-loo-013`) … Never name a ticket ID in chat before its beta status
  is established … Classify each one yourself against `docs/BETA.md` §1 … read that file, never
  infer the bar."
- **Lived:** `docs/WORKING-WITH-JOHN.md`, Lead With the Verdict section, third bullet.
- **Why retired:** the beta axis was retired 2026-08-19; `docs/BETA.md` is historical. The
  current prioritization signal is the named P1–P10 priority class.
- **Survives:** rewritten in place — every close-out ticket carries named P1–P10 class + ID +
  stored title; the never-name-unclassified principle carries over intact. Inline supersession
  note added under the bullet.
- **Restore:** git history of `docs/WORKING-WITH-JOHN.md`.

### 3b. docs/WORKING-WITH-JOHN.md — 2026-08-21 "ID + TITLE" bullet (superseded strike)
- **Said:** ID + TITLE together on every backlog reference (John, 2026-08-21).
- **Lived:** Communication Pacing section, immediately before the 2026-08-22 bullet.
- **Why retired:** subsumed by the 2026-08-22 "ID + TITLE + Type" rule directly below it; two
  near-duplicate consecutive bullets read as conflicting rules.
- **Survives:** kept in place with a strikethrough supersession note; the 2026-08-22 bullet is
  the live rule.
- **Restore:** git history of `docs/WORKING-WITH-JOHN.md`.

### 4a. docs/FEATURES.md — beta-gate filing instruction (rewrite)
- **Said:** "When filing any new row, declare `Beta-gate (<bucket>)` or `Post-beta` in the row
  per that file's [`docs/BETA.md`] maintenance rules."
- **Lived:** `docs/FEATURES.md` header pointer block.
- **Why retired:** beta retired 2026-08-19; filing now requires a named P1–P10
  `priority_class` (register B9) on the `public.backlog_items` row.
- **Survives:** rewritten in place with the current filing rule.
- **Restore:** git history of `docs/FEATURES.md`.

### 4b. docs/FEATURES.md — "Done rows are still archived in FEATURES-ARCHIVE.md" (rewrite)
- **Said:** "`✅ Done` rows are still archived in `docs/FEATURES-ARCHIVE.md`, which this trim
  did not touch."
- **Lived:** `docs/FEATURES.md`, closing line of "Where the rows are now".
- **Why retired:** the archive is frozen since 2026-08-19; done tickets stay in
  `public.backlog_items` with `status='done'` and are filtered, never moved (`SES-115`
  keep-and-filter).
- **Survives:** rewritten in place.
- **Restore:** git history of `docs/FEATURES.md`.

### 4c. docs/FEATURES.md — P-GATED legend row (marked RETIRED, legend-only)
- **Said:** `P-GATED` presented as a live class marker for the gated lane.
- **Lived:** `docs/FEATURES.md`, Priority Class legend table.
- **Why retired:** the gated lane is a boolean flag on the backlog row now (register B15), not
  a priority-class value. Row kept for history, prefixed RETIRED.
- **Survives:** in place, marked retired; the gated-lane semantics live in §19v /
  GOVERNANCE-MODES.md / runner-cycle.md.
- **Restore:** git history of `docs/FEATURES.md`.

### 5. docs/BETA-TRIAGE.md — read as a live queue (retirement banner added)
- **Said:** working-triage language throughout (per-bucket execution queues) with no
  retirement notice; only a pointer to `docs/BETA.md`.
- **Lived:** `docs/BETA-TRIAGE.md`, whole file.
- **Why retired:** beta retired 2026-08-19; the file read as a live queue. Banner added at top
  mirroring `docs/BETA.md`'s ⛔ RETIRED banner; body untouched.
- **Survives:** entire file kept as history below the banner.
- **Restore:** n/a — nothing removed.

### 6a. docs/runbooks/runner-cycle.md — two "45-minute TTL" mentions (rewrite)
- **Said:** the publish-lease properties bullet and step 0b both cited a "45-minute TTL".
- **Lived:** `docs/runbooks/runner-cycle.md` (lease properties bullet; step 0b silent-cycle
  paragraph).
- **Why retired:** B42 repurposed the `runner_lease` singleton at a **10-minute** TTL over the
  serial tail; B31's cycle-level 45-minute lease is retired. The 45-minute figures
  contradicted the SQL and GOVERNANCE-MODES.md.
- **Survives:** both corrected to 10-minute with (B42) cites.
- **Restore:** git history of `docs/runbooks/runner-cycle.md`.

### 6b. docs/runbooks/runner-cycle.md — invention Reverse → rejected-paths.md (rewrite)
- **Said:** step 4b(5): "Reverse kills it and records the rejection in
  `vision/rejected-paths.md`."
- **Why retired:** `SES-157`: a rejection is a `vision_claims` row with `status='rejected'`;
  `vision/rejected-paths.md` is a retired stub, never appended.
- **Survives:** corrected in place.
- **Restore:** git history of `docs/runbooks/runner-cycle.md`.

### 6c. docs/runbooks/runner-cycle.md — "no forward view of the queue" window (rewrite)
- **Said:** step 9: "between `SES-124` and `SES-126` the page carries no forward view of the
  queue at all", stated as a live condition.
- **Why retired:** the window closed when `SES-126` shipped (`v7.0.161`) — §8's queue matrix
  and §11's now-tier census carry the forward view now.
- **Survives:** corrected in place; the window kept as a parenthetical historical note.
- **Restore:** git history of `docs/runbooks/runner-cycle.md`.

### 6d. docs/runbooks/runner-cycle.md — "Three different flags" / "Each one is a record_skip()" (rewrite)
- **Said:** step 5's blocked-prefix intro counted "Three different flags" before a six-row
  table, and asserted "Each one is a `record_skip()` call" — contradicted two paragraphs later
  by the `delivered`/`john-paced` no-skip exemptions.
- **Why retired:** count corrected to five skip flags (sixth row `designed` is not a skip);
  the record_skip sentence now names the three that record a skip and the two stepped past
  silently, folding the exemptions into one accurate sentence.
- **Survives:** rewritten in place; the detailed exemption paragraphs unchanged.
- **Restore:** git history of `docs/runbooks/runner-cycle.md`.

### 7. docs/RUNNER-GOV-0820-REQUIREMENTS.md — register A2 fixed cron (supersession banner)
- **Said:** "A2. Schedule (John): fires 12/3/6/9 AM/PM CST (UTC cron `0 2,5,8,11,14,17,20,23
  * * *`; re-align one hour when DST ends in November)."
- **Why retired:** superseded by `SES-151` (`v7.0.196`): hourly cron at :40 permanent +
  `scheduler_gate()` pacing by John's America/Chicago clock grid; DST-proof, no realign ever.
- **Survives:** strikethrough + dated supersession banner in the file's standard style;
  original wording preserved below it.
- **Restore:** n/a — original text kept in place.

### 8a. docs/SES-78-RUNNER-DESIGN.md — phase table "❌ Missing" rows (rewrite)
- **Said:** 78b/78c/78d rows showed "❌ Missing" while the header banner said all four phases
  shipped v7.0.97.
- **Why retired:** internal contradiction; all three shipped v7.0.97 (78d go-live approved
  2026-08-20).
- **Survives:** rows flipped to ✅ Done (shipped v7.0.97).
- **Restore:** git history of `docs/SES-78-RUNNER-DESIGN.md`.

### 8b. docs/SES-78-RUNNER-DESIGN.md — ladder rule without gated-card exception (note added)
- **Said:** decision 4's cycle anatomy stated the ladder mechanics (Accept = streak+1 /
  Reverse = demote) with no gated-lane exception, and the runbook cites this file.
- **Why changed:** gated-lane cards are decided by John on the briefing; the ladder governs
  build autonomy only and no rung unlocks the gated lane. One-line exception note + pointer to
  the operative homes (GOVERNANCE-MODES.md / runner-cycle.md) added; nothing removed.
- **Restore:** n/a — addition only.

### 9a. docs/runbooks/session-hygiene.md — "CLAUDE.md rule 6c / rule 7 / rule 8" citations (rewrite)
- **Said:** checks 5/5b/5d cited numbered CLAUDE.md rules (6c = In-flight bullet, 7 = worktree
  cleanup, 8 = bullet removal).
- **Why retired:** the current CLAUDE.md has no numbered rules — it has named hard rules and a
  two-step router; the setup/cleanup procedures live in the `session-setup` runbook.
- **Survives:** repointed in place to CLAUDE.md router step 1 and the session-setup runbook's
  setup/cleanup steps.
- **Restore:** git history of `docs/runbooks/session-hygiene.md`.

### 9b. docs/runbooks/session-hygiene.md — duplicate check number "6" (renumber)
- **Said:** both the STANDARDS.md drift set and the SES-164 runbook header-stamp cap were
  numbered check 6.
- **Why changed:** stamp cap renumbered to check 7 with a renumber note. Live pointers to
  "check 6" meaning the stamp cap fixed: `docs/runbooks/runner-cycle.md` header stamp and two
  `docs/SESSIONS.md` pointer lines (13265/13375 area). Historical narratives (CLAUDE-STATE
  prior entry, kickoff `v7.0.210-SES-164-runbook-header-trim.md`, BACKLOG-SNAPSHOT generated
  row) left as-is — the renumber note in session-hygiene.md disambiguates them.
- **Restore:** git history.

### 9c. docs/runbooks/session-hygiene.md — "DeepBench-Session-Init.md Step 10c" (rewrite)
- **Said:** check 1 pointed at Session-Init Step 10c for the close-out trim.
- **Why retired:** the SES-120 rewrite of DeepBench-Session-Init.md has steps 0–9 and no
  close-out step; close-out lives in CLAUDE-DESIGN.md.
- **Survives:** repointed in place.
- **Restore:** git history.

### 9d. docs/runbooks/session-hygiene.md — CLAUDE-STATE bullet as "authoritative liveness signal" (rewrite)
- **Said:** check 5 prose treated the CLAUDE-STATE.md "In flight now" bullet as the
  authoritative liveness signal.
- **Why retired:** the mechanism moved to inflight marker files (`SES-011`; repo-root
  `inflight/` since 2026-08-21, register B41) — which is what `scripts/check-session-docs.js`
  actually reads (fetched `origin/dev` `inflight/` + legacy `.claude/inflight/`, plus 5e's
  unpushed on-disk markers).
- **Survives:** rewritten in place to match the script.
- **Restore:** git history.

### 11a. DeepBench-Session-Init.md — "Michelle avatar | MichelleAvatar.jsx" row (removed)
- **Said:** Step 6 table row: "Michelle avatar | MichelleAvatar.jsx | Wired to Supabase since
  S-BENCH-01 (2026-06-19)".
- **Why retired:** no `MichelleAvatar.jsx` (or any *ichelle* file) exists under `src/` —
  verified by Glob 2026-08-23. Pointing sessions at a nonexistent file.
- **Survives:** nowhere (the fact was false); avatar config lives with the roster in
  `src/data/agents.js`.
- **Restore:** git history of `DeepBench-Session-Init.md`.

### 11b. DeepBench-Session-Init.md — restated scope sentence (rewrite)
- **Said:** Step 3: "Initially targeting government procurement intelligence, now generalizing
  to any business domain."
- **Why retired:** a restated fact in a pointer doc (the file's own rule: restated facts
  drift). Replaced with a pointer to `docs/ARCHITECTURE.md` §0.
- **Restore:** git history.

### 11c. DeepBench-Session-Init.md — start-prompt template without model line (rewrite)
- **Said:** Step 7.6's Claude Code start-prompt block had no model line.
- **Why changed:** CLAUDE-DESIGN.md standing rule (2026-07-28): a prompt without a model line
  is incomplete. Model line added to the template; nothing removed.
- **Restore:** n/a — addition only.

### 10a. docs/STANDARDS.md — §7 "add to docs/FEATURES.md" (rewrite)
- **Said:** "If NEW REQUIREMENT: add to `docs/FEATURES.md`."
- **Why retired:** the FEATURES files are legend-only stubs (v7.0.113); new requirements are
  filed as `public.backlog_items` rows per `docs/runbooks/session-setup.md` step 3c.
- **Survives:** repointed in place.
- **Restore:** git history of `docs/STANDARDS.md`.

### 10b. docs/STANDARDS.md — §1 "commit directly to dev, no feature branches" (rewrite)
- **Said:** "Branch: commit directly to `dev`. No feature branches."
- **Why retired:** predates the 2026-07-07 worktree discipline; the live rule is
  `session/<name>` worktree branches + `git push origin HEAD:dev` (CLAUDE.md hard rules).
- **Survives:** rewritten in place with a dated correction note.
- **Restore:** git history of `docs/STANDARDS.md`.

### 10c. docs/STANDARDS.md — versioned/dated H1 header (rewrite)
- **Said:** "# DeepBench v5.1 — Session Standards & Testing … Last updated: 2026-07-15".
- **Why retired:** hardcoded version/date in a title is the stale-version-in-prose pattern —
  the file was current while its header claimed v5.1/July.
- **Survives:** version-free header; current version lives in CLAUDE-STATE.md; change history
  in git log.
- **Restore:** git history of `docs/STANDARDS.md`.

### 12a. CLAUDE-DESIGN.md — freshness-check pointer "see CLAUDE.md" (rewrite)
- **Said:** "(no separate fetch+`git show` freshness check is needed (retired 2026-07-15 —
  see `CLAUDE.md`))".
- **Why retired:** CLAUDE.md no longer carries the bootstrap-check note the pointer aimed at.
- **Survives:** repointed to `docs/SESSIONS.md` with a note the CLAUDE.md note is gone.
- **Restore:** git history of `CLAUDE-DESIGN.md`.

### 12b. CLAUDE-DESIGN.md — verbatim version-claim SQL block (removed, pointer left)
- **Said:** the `UPDATE dev_version_counter … RETURNING major, minor, patch;` block, verbatim.
- **Why retired:** duplicated `docs/runbooks/session-setup.md` step 3 (one home per fact; the
  runbook is canonical — a future SQL change would have had to land twice).
- **Survives:** pointer to session-setup step 3; the SQL itself lives there.
- **Restore:** git history of `CLAUDE-DESIGN.md`.

### 13a. docs/AUTONOMY-SORT-2026-07-31.md — read as live (retirement banner added)
- **Said:** SAFE/JOHN autonomy classification of 226 FEATURES.md rows against BETA.md.
- **Why retired:** superseded 3×: beta axis retired 2026-08-19, FEATURES rows moved to
  `public.backlog_items` (v7.0.113), live autonomy axes are B27's (auto/gated lane + trust
  ladder). Zero inbound references found.
- **Survives:** whole file kept below the banner.
- **Restore:** n/a — nothing removed.

### 13b. docs/S-PM-07-QA-FINDINGS.md — read as live (historical banner added)
- **Why:** June-era (2026-06-23), pre-CHI; the screens/pipelines it describes were rebuilt.
- **Survives:** whole file kept below the banner. **Restore:** n/a.

### 13c. docs/runbooks/HAR-17-23q-regression.md — read as the regression (historical banner added)
- **Why:** superseded as the CHI regression by `CHI-TRUE-REGRESSION.md`; its FEATURES.md
  row-refs are stub-dead. Kept as the HAR-17 recovery-census procedure + 2026-07-28 baseline
  record (its own scope note already said this; the banner makes it unmissable).
- **Survives:** whole file kept below the banner. **Restore:** n/a.

### 13d. docs/REPO-SNAPSHOT.md — staleness warning added
- **Why:** generated 2026-06-07, ~2.5 months stale, describes the pre-CHI codebase; fallback
  use only, prefer live fetch (`SES-120`).
- **Survives:** whole file kept below the warning. **Restore:** n/a.

### 13e. docs/README.md — full rewrite
- **Said:** "DeepBench v5.1 — Documentation"; claimed `docs/FEATURES.md` "is the source of
  truth, not a snapshot of anything else"; listed 6 files; described CLAUDE.md as a "compact
  briefing".
- **Why retired:** the backlog is `public.backlog_items`; FEATURES files are stubs; the doc
  set reorganized around runbooks/, GOVERNANCE-MODES.md, SELFBUILD-CHARTER.md.
- **Survives:** rewritten as a one-page index (CLAUDE.md router, backlog table + snapshot,
  runbooks/, GOVERNANCE-MODES.md, SELFBUILD-CHARTER.md, ARCHITECTURE.md, STANDARDS.md,
  WORKING-WITH-JOHN.md, SESSIONS.md, this ledger). The Google-Drive-retired rule and the
  John-doesn't-manage-tracking-docs note carried forward.
- **Restore:** git history of `docs/README.md`.

### 13f. scripts/check-kickoff-doc.js + scripts/check-version-headers.js — DELETED (orphans)
- **Were:** SES-010 Tier 2 lint scripts — 11-required-section kickoff-doc check
  (`check-kickoff-doc.js`, `--latest` mode via git log) and version-header/`FEATURE:` tag
  check on changed .js/.jsx (`check-version-headers.js`).
- **Why deleted:** orphans — nothing invokes them (no package.json script, no hook, no
  runbook step; verified by repo-wide grep 2026-08-23 and by the audit run the same night;
  remaining mentions are comments in sibling scripts and historical SESSIONS/kickoff text).
- **Survives:** nowhere in the working tree; both fully preserved in git.
- **Restore:** `git log --follow -- scripts/check-kickoff-doc.js` (likewise
  `scripts/check-version-headers.js`), then `git show <commit>:<path> > <path>`.

### 14. scripts/export-backlog-snapshot.js — "markdown files remain AUTHORITATIVE" header (rewrite)
- **Said:** header comment: the markdown backlog files "remain AUTHORITATIVE … until SES-83
  phases (d) and (e) land and flip authority to the table itself."
- **Why retired:** they landed (v7.0.113+); the script's own emitted file header already said
  the table is authoritative — the source comment contradicted its own output.
- **Survives:** rewritten in place to match reality; the never-hand-edit/`--check` rules kept.
- **Restore:** git history of `scripts/export-backlog-snapshot.js`.

### 15a. docs/runbooks/CHI-TRUE-REGRESSION.md — Prereq 1 "Check docs/FEATURES.md's AGT-35 row" (rewrite)
- **Why retired:** the stub holds no rows; repointed to `public.backlog_items` (SQL or
  BACKLOG-SNAPSHOT.md search). §5's "slugs from its FEATURES row" fixed the same way.
- **Restore:** git history.

### 15b. docs/runbooks/CHI-TRUE-REGRESSION.md — Prereq 2 "build it in your scratchpad / until then" (rewrite)
- **Why retired:** `scripts/chi-true-regression.mjs` exists and is committed; the runbook
  still framed the driver as unbuilt. Now: run the committed script, never rebuild it.
- **Restore:** git history.

### 15c. CHI-TRUE-REGRESSION prereqs + scripts/chi-true-regression.mjs — HAR-33 gate header (addition)
- **What:** since 2026-08-08 live API tests need `x-db-gate-bypass` (= `GATE_BYPASS_SECRET`
  via `vercel env pull`) or an `unlimited` IP row, else 403. Added to the script's `HDRS`
  (non-fatal loader mirroring `loadBypassSecret()`, warns when absent) and to the runbook's
  Prereq 3. Syntax-checked (`node --check` OK).
- **Restore:** n/a — addition only.

### 16. .claude/rules/platform-services-directory.md — "LOG-89 (docs/FEATURES-LATER.md)" (rewrite)
- **Why retired:** FEATURES-LATER.md is a retired stub holding no rows; LOG-89 is a
  `public.backlog_items` row. Repointed in place.
- **Restore:** git history.

### 17. docs/BRIEFING-REDESIGN-0822.md — "chained sessions (SES-141) run regardless" (rewrite)
- **Why retired:** `SES-140` FINAL superseded the SES-141 session-spawning form; chaining is
  in-session continuation cycles. Fixed to "chained continuation cycles (`SES-140` FINAL)";
  semantics of the scheduler/drain toggle unchanged.
- **Restore:** git history.

### 18. C:/Projects/.claude/settings.local.json — two `cd … && …` permission entries (removed; machine-local)
- **Were:**
  `"Bash(cd /mnt/c/Projects/deepbench-frontend && node test-s-migrate-01b.mjs)"` and
  `"Bash(cd \"C:/Projects/deepbench-frontend\" && rm test-s-apple-03a-2-api.mjs && rm -f /tmp/t.mjs && git status --short)"`.
- **Why removed:** they pre-approved the exact `cd … && …` compound the CLAUDE.md hard rule
  and the `block-cd-and.js` hook prohibit. Nothing else in either settings file changed;
  `C:/Projects/.claude/settings.json` holds only hooks (no permission allowlist — nothing to
  remove there). JSON validity re-verified after the edit.
- **Restore:** the exact strings are quoted above (these files are NOT git-tracked — this
  ledger entry is the only record).

### 19. docs/runbooks/runner-cycle.md step 9 + briefing-page.md regeneration step 2 — the mandatory republish (rewrite)
- **Said:** the briefing republish is mandatory and **"a cycle must never end without it"** — step 9
  of `runner-cycle.md`, restated in `briefing-page.md`'s regeneration step 2.
- **Lived:** both files, in the two homes named above.
- **Why retired:** John's bridge ruling `27b5d8cb` (attended architect session 2026-08-31, his word
  verbatim *"b with the bridge"*) **forbids an unattended cycle making the republish**, so the
  runbook and a standing directive were both law and directly opposed for twenty-six hours, and
  every cycle after 16:16Z that day reconciled the pair by hand — the one-fact-two-homes defect
  this platform has already paid for at `SES-116`, `SES-113` and `SES-86` phase 3. `SES-244`
  (`v7.0.348`) rewrote both homes **in one commit**, because fixing one is exactly how the two
  files drift.
- **Survives:** rewritten in place in both files as THE BRIDGE — (b), a briefing that is a pure
  render of the database, is the durable fix and is what gets built; (a), a standing permission for
  unattended sessions on the `.claude/` path, is **rejected** and must not be re-proposed as a
  shortcut; until (b) ships the attended session republishes whenever John is present, and an
  unattended cycle **builds the page, records the build in its own `runner_cycles.notes`, and stops
  there**. The tail's `SES-127` `briefed_at` stamp is bound to the same condition: a cycle that did
  not publish must not stamp it at all.
- **Filed by:** runner cycle `00b02a29-3e4e-4951-bcd3-fcadd7dded84` (`v7.0.355`), on the *Present*
  finding of the **Selfbuild M4 gate review** (`runner_items` card `7d3b1fb3`, accepted by John
  2026-09-01T02:19:39Z, verbatim *"accept m4"*). Both lenses raised it independently: the rewrite
  landed in both homes and got no entry here, which this ledger's own contract requires for a
  rewrite. This is that entry — written when the review that found it was accepted, not at the
  rewrite, and said plainly rather than backdated.
- **Restore:** `git log --follow -- docs/runbooks/runner-cycle.md` (likewise
  `docs/runbooks/briefing-page.md`), then `git show <commit>:<path>` at or before `v7.0.347`.

### 20. `public.governance_rules` B3 — backlog queue ordering (superseded)
<!-- FEATURE: SES-280 — B3's retirement entry. Written in the same commit that inserts M5-02 and
     flips B3 to `superseded`, per the SELFBUILD-CHARTER transition rule: no commit may exist in
     which neither ordering is in force. -->
- **Said:** *"Order the backlog queue by tier (now/next/later), then priority class P1→P10, then
  beta-first, then newest-to-oldest within class."* (registry `statement`; the register entry it
  renders is `docs/RUNNER-GOV-0820-REQUIREMENTS.md` **B3**, which words the same rule as *"within a
  class, tie order beta-marked first → newest filed → oldest"*.)
- **Lived:** `public.governance_rules` row `B3` (`source_group = 'runner-gov-register'`,
  `enforcement = 'script'`), canonical home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B3`.
- **Retired:** 2026-09-01, by `SES-280` (`v7.0.358`), kickoff
  `docs/kickoffs/v7.0.358-SES-280-m5-governance-rules.md`.
- **Superseded by:** `M5-02` — *"Order the pickable board by filing lane first: tickets with
  `filed_at` before 2026-08-21 take the priority lane, tickets filed on or after it enter a review
  bucket that requires explicit promotion before pick; within a lane, order by tier then priority
  class P1→P10. Supersedes B3."*
- **Why retired:** **newest-to-oldest ordering within class is the direct inverse of the
  pre-2026-08-21 priority lane John set; both cannot be live.** B3 sorts the *newest* filing to the
  front of a class; M5-02's filing lane sends everything filed before 2026-08-21 to the front of the
  board and everything filed on or after it into a review bucket that needs explicit promotion. There
  is no ordering that satisfies both, and B3 is script-enforced, so leaving it live would have left
  two contradictory sort keys in the same pick path. Beta, B3's other tie-break, was itself retired
  2026-08-19 — so that clause had already stopped meaning anything.
- **Survives:** the tier-then-priority-class half of B3 is carried forward verbatim in M5-02's second
  clause ("within a lane, order by tier then priority class P1→P10"); only the beta and
  newest-to-oldest tie-breaks are gone. B3's row is **not deleted** — it stays in the registry with
  `status = 'superseded'` and `superseded_by = 'M5-02'` (register B1's never-delete discipline applies
  to rules as it does to tickets), and its register entry stays in place in
  `docs/RUNNER-GOV-0820-REQUIREMENTS.md` under a dated supersession note in that file's usual style.
- **Not yet true, said plainly:** M5-02 ships with `enforcement = 'script'` **recorded, not
  executed**. Phase 2 (a follow-up ticket) wires the filing lane into `drain_epic_next()` and
  `recompute_backlog_queue()`; until it lands, the pick path still sorts the way B3 described. The
  rule is retired in the registry and in the docs, which is what the transition rule governs; the
  code change is the second half and is tracked as its own ticket.
- **Restore:** `git log --follow -- docs/governance/RULES-SNAPSHOT.md`, then
  `git show <commit>:docs/governance/RULES-SNAPSHOT.md` at or before `v7.0.357` for the row as it
  stood; the register prose is in the git history of `docs/RUNNER-GOV-0820-REQUIREMENTS.md`. To make
  it live again: flip the row back to `status = 'live'`, clear `superseded_by`, retire `M5-02` in the
  same commit, and re-export the snapshot.

## SES-171 — briefing-page.md header trim (2026-08-23, same session)

Trim in the SES-164 shape; full stamp-by-stamp detail in the SES-171 delivery record. Summary entries:

| What | Where it lived | Why retired | Where content survives |
|---|---|---|---|
| 29 version stamps, v7.0.99 → v7.0.206 (40,843 bytes, 32.5% of the file) | `docs/runbooks/briefing-page.md` header, lines 1–30 (all but the newest, v7.0.208) | SES-171 header trim, SES-164 shape (session-hygiene stamp-cap check); every stamp probed for stamp-only warnings — none found, all restated in the body sections they correspond to | VERBATIM in `docs/SESSIONS.md` "Appendix — retired `briefing-page.md` header stamps" (29/29 present, 0 missing) + git; body proven sha256-identical across the trim (`20445487a5c91162…`) |
| "masthead … carries a one-tap '▶ Run a cycle now' link" | briefing-page.md, regeneration step 1 | Superseded by SES-143 (v7.0.182): the link lives on §2b; John's explicit do-not-reinstate for the masthead copy | Rewritten in place as a §2b pointer (SES-102 provenance kept) + git |
| "Always three rows … **No** deletes it and records it in vision/rejected-paths.md" | briefing-page.md, §12 SHAPE (SES-125 paragraph) | Superseded by SES-157 (v7.0.206): rejection = kept `status='rejected'` row; rejected-paths.md is a retired stub; drip contract's 1–3 rows is current | Rewritten in place to the SES-157 tap table + git |
| "fires exactly one successor run" / "A wall-stopped cycle fires nothing" | briefing-page.md, regeneration step 6 | Superseded by SES-140 FINAL (v7.0.195): in-session continuation cycles; session-spawning platform-refused | Rewritten in place ("continues nothing"; runner-cycle.md tail step (8) deferral kept) + git |
