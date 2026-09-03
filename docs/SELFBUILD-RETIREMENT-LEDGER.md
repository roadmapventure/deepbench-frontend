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

<!-- FEATURE: SES-285 — entries 21–33, one per rule the card/tap retirement withdrew: five retired
     (B13, B16, B23, B28, B29) and eight superseded by M6-01..M6-08 (B7, B12, B14, B17, B24, B27,
     B34, B35). All thirteen ship in ONE commit with docs/RUNNER-GOV-M6-REQUIREMENTS.md and the
     registry rows, per the SELFBUILD-CHARTER transition rule. Facts common to all thirteen, stated
     once here rather than thirteen times below:
       * Retired 2026-09-01 by SES-285 (v7.0.359), kickoff
         docs/kickoffs/v7.0.359-SES-285-retire-card-tap-surface.md.
       * Trigger — John, 2026-09-01, verbatim: "I no longer want to work via cards or taps. And you
         are supposed to be more self sufficient to update tickets accordingly without me."
       * Measured at decision time: 45 gated_before_build cards undecided, 42 of them older than 48
         hours, against 79 ever decided; 33 open tickets at design_status='needs-john'.
       * NO ROW IS DELETED. Every rule below keeps its governance_rules row at status='retired' or
         'superseded' (register B1's never-delete discipline), and keeps its register entry in
         docs/RUNNER-GOV-0820-REQUIREMENTS.md.
       * Restore path, identical for all thirteen: `git log --follow -- docs/governance/RULES-SNAPSHOT.md`
         then `git show <commit>:docs/governance/RULES-SNAPSHOT.md` at or before `v7.0.358` for the
         row as it stood. To make one live again: flip its row back to status='live', clear
         superseded_by, withdraw its M6 replacement in the SAME commit, and re-export the snapshot. -->

### 21. `public.governance_rules` B7 — unattended removal ban (superseded)
- **Said:** *"Revalidate ticket premises at every pick and in background for the stale tail; never remove a ticket unattended — route removal proposals to a John Accept/Reverse/Rework card."*
- **Lived:** row `B7` (`runner-gov-register`, `enforcement = 'reviewer'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B7`.
- **Superseded by:** `M6-03` — *"A ticket whose premise fails revalidation twice consecutively is removed automatically, reversible inside its window; no removal waits on a human Accept. Supersedes B7."*
- **Why:** the removal card was a gate with no timer, so a ticket whose premise had demonstrably
  evaporated stayed on the board competing for picks until John tapped — and the measured tap rate
  says he mostly did not. The revalidation half of B7 is not the problem and is not withdrawn.
- **Survives:** the *"revalidate at every pick and in background for the stale tail"* clause is
  unchanged practice; only the routing of the result changes. `M6-03` additionally hardens it —
  **twice consecutively**, never on a single failed read — and the 72-hour reversal window (`M6-02`)
  is what makes an automatic removal safe rather than final.

### 22. `public.governance_rules` B12 — daily invention card (superseded)
- **Said:** *"Run one invention cycle per day (research, score against vision corpus, R&D gate) and file results as a gated-before-build card for John's Accept."*
- **Lived:** row `B12` (`runner-gov-register`, `enforcement = 'reviewer'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B12`.
- **Superseded by:** `M6-04` — *"Invention proposals are admitted or rejected by the enhancement-lane admission test (`SES-283`), never by a card. Supersedes B12."*
- **Why:** B12 was the single highest-volume producer of the 45-card backlog — one card per day,
  every day, into a surface with a two-thirds non-response rate. The bar is not lowered by
  superseding it; it moves into `SES-283`'s admission test, where it is written down, applied
  identically every time, and can be argued with. A card is not a bar, it is a queue.
- **Survives:** the daily invention cycle itself, and the scoring against the vision corpus. Only
  the disposal route changes.

### 23. `public.governance_rules` B13 — DRIP claim cards (retired)
- **Said:** *"Draft the nine vision-corpus documents as best-inference claims, verified by John via small daily DRIP claim cards rather than a long interview."*
- **Lived:** row `B13` (`runner-gov-register`, `enforcement = 'reviewer'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B13`.
- **Why retired, with no replacement:** B13 is a *verification-by-tap* rule end to end — the card is
  not an implementation detail of it, it is the whole mechanism. With the tap surface withdrawn
  there is nothing left of B13 to restate, so it is retired rather than superseded. Retiring it does
  not delete the vision corpus or the best-inference drafting; it removes the claim that John
  ratifies those drafts one card at a time.
- **Survives:** nothing of B13 is carried into an `M6` rule. The vision-corpus documents and the
  drip mechanism live on in `docs/runbooks/briefing-page.md` §12; how a claim is confirmed without a
  tap is genuinely open and belongs to whoever next works that surface — **stated plainly as a gap,
  not papered over.**

### 24. `public.governance_rules` B14 — only John's tap ratifies a rule (superseded)
- **Said:** *"Generate business rules from declared, mined, and learned sources as proposed-rule briefing cards; only John's tap ratifies a rule."*
- **Lived:** row `B14` (`runner-gov-register`, `enforcement = 'reviewer'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B14`.
- **Superseded by:** `M6-02` — *"A decision executes immediately and is reversible for 72 hours; silence is assent, never a park. Supersedes B14 and B23's silence-parks-forever."*
- **Why:** *"only John's tap ratifies"* makes non-response the strongest possible veto, and the
  measurement says non-response was the normal case. `M6-02` inverts the default without removing
  his authority: a proposed rule takes effect now and he has 72 hours to reverse it.
- **Survives:** rule generation from declared, mined and learned sources is untouched — that half of
  B14 describes where rules come from, not who ratifies them. **What is gone is the veto-by-silence.**

### 25. `public.governance_rules` B16 — Unclassifiable escalation card (retired)
- **Said:** *"Reserve \"Unclassifiable\" for tickets whose text is too degraded to judge, with a reason note, and surface every one as a briefing card for John's Rework or removal."*
- **Lived:** row `B16` (`runner-gov-register`, `enforcement = 'reviewer'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B16`.
- **Why retired, with no replacement:** the surviving half of B16 — reserve the label for genuinely
  degraded text, and write the reason down — is already carried by register `B9` (nothing enters the
  board unclassed) and by the `Unclassifiable` class definition itself. What is withdrawn is the
  escalation: an unreadable ticket is now decided by the cycle under `M6-01`, with its reasoning
  recorded, exactly like any other decision.
- **Survives:** the reserve-it-narrowly discipline and the mandatory reason note, in the class
  definition. Only the card is gone.

### 26. `public.governance_rules` B23 — silence parks a card forever (retired)
- **Said:** *"Re-enter a gated/proposal card's ticket at queue #1 as a system pin on Accept, timestamped; a later \"move to 1\" outranks it, and silence parks a card forever."*
- **Lived:** row `B23` (`runner-gov-register`, `enforcement = 'script'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B23`.
- **Why retired — this is the load-bearing one:** *"silence parks a card forever"* is not a
  description of the 45-card backlog, **it is the mechanism that manufactured it.** An unanswered
  card was never a deferral; it was a permanent stall with no timer on it, and 42 of the 45 had been
  in that state for more than 48 hours. It is retired rather than superseded because `M6-02` is its
  exact inverse — silence is assent — and the two cannot both be live for a single second.
- **Survives:** the pin half is unaffected and stays live in register `B5` (John's *"move to N"*
  directives hold absolute slots). What is gone is the park-on-silence default and the
  Accept-triggered system pin, which had nothing left to trigger on.

### 27. `public.governance_rules` B24 — never let a card waste a cycle (superseded)
- **Said:** *"Never let a gated-before-build or removal-proposed card waste a cycle; drop to the next queued ticket and still deliver exactly one build per cycle."*
- **Lived:** row `B24` (`runner-gov-register`, `enforcement = 'prose'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B24`.
- **Superseded by:** `M6-06` — *"A cycle never ends by asking; wherever it would have escalated to a card, it decides, records the reasoning, and records the reversal handle. Supersedes B24 and B27."*
- **Why:** B24 was the *mitigation* for a surface that has now been removed — it protected the
  cycle's throughput from the card, rather than preventing the card. `M6-06` reaches the same
  outcome one step earlier: there is no card to drop past, because the cycle decides.
- **Survives:** **"exactly one build per cycle" is not withdrawn** — it is a throughput rule
  independent of cards and continues to bind through the runbook's own cycle contract.

### 28. `public.governance_rules` B27 — the build-vs-ask matrix (superseded)
- **Said:** *"Decide build-vs-ask at pick time on two axes (authority/gated, and specification completeness), escalating through build/design-then-build/gated-card/requirements-session outcomes without ever ending the cycle build-less on the middle two."*
- **Lived:** row `B27` (`runner-gov-register`, `enforcement = 'reviewer'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B27`.
- **Superseded by:** `M6-06` (statement as quoted in entry 27).
- **Why:** B27 named *"gated-card"* as a defined outcome for the ambiguous middle of its own matrix
  — so the cases where a decision was most needed were precisely the ones routed away from being
  decided. `M6-06` removes that branch and keeps the rest.
- **Survives:** **the two axes survive as a reasoning tool, not as a routing table.** Authority and
  specification completeness are still the right questions at pick time; what changes is that every
  answer now ends in a decision plus its recorded reasoning, never in an escalation.

### 29. `public.governance_rules` B28 — weekly count of John's judgments (retired)
- **Said:** *"Track on the briefing how many cards needed John's judgment this week vs last, feeding decided cards into rule-mining so repeated question-shapes stop reaching him."*
- **Lived:** row `B28` (`runner-gov-register`, `enforcement = 'prose'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B28`.
- **Why retired, with no replacement:** B28 measures a quantity that is now structurally zero. Its
  *goal* — that repeated question-shapes stop reaching John — is achieved outright rather than
  trended toward, so a week-over-week counter of it would report `0 vs 0` forever, which is a metric
  that cannot move and therefore cannot inform.
- **Survives:** **rule-mining from decided items survives and matters more, not less** — the corpus
  it mines is now the cycle's own recorded reasoning under `M6-01` and `M6-06`, which is a larger
  and better-attributed corpus than the decided cards ever were.

### 30. `public.governance_rules` B29 — the daily "help me" ticket (retired)
- **Said:** *"Nominate one \"help me\" ticket per day on the briefing, selected by the automation ordering, carrying John's specific open questions; resolving it re-enters the ticket at queue #1."*
- **Lived:** row `B29` (`runner-gov-register`, `enforcement = 'prose'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B29`.
- **Why retired, with no replacement:** it is a daily ask, which is the shape John's instruction
  removed — and it had the same failure mode as the cards, one nomination per day into a surface
  with a two-thirds non-response rate. Under `M6-01` a cycle that has an open question decides it
  and records the reasoning instead of nominating it.
- **Survives:** nothing of the daily nomination. **A genuinely stuck ticket is still visible** —
  through `M5-10`, amended in this same commit to surface a three-cycle stall with its defer reason
  in the standing brief. That is the honest successor: visibility without a question attached.

### 31. `public.governance_rules` B17 — an Accept must never evaporate (superseded)
- **Said:** *"Auto-convert an Accept on a gated-before-build card into a classed, queued backlog ticket — an Accept must never evaporate."*
- **Lived:** row `B17` (`runner-gov-register`, `enforcement = 'prose'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B17`.
- **Superseded by:** `M6-05` — *"Every decision a cycle makes files its resulting ticket in the same transaction — a decision must never evaporate. Supersedes B17."*
- **Why:** B17's promise is exactly right and its scope was too narrow — it covered *Accepts*, which
  is one kind of decision made by one person on one surface. `M6-05` keeps the promise verbatim
  (*"must never evaporate"*) and widens it to every decision a cycle makes, in the same transaction
  as the decision, so no window exists where the decision is recorded and its ticket is not.
- **Survives:** the promise, its wording, and its enforcement — **strengthened, not weakened.** The
  measured proof that the window is real: card `04d34757` (the September budget outage that stopped
  the runner) sat undecided with no ticket behind it at all, so its content lived nowhere but the card.

### 32. `public.governance_rules` B34 — an Accept is permission, not a rating (superseded)
- **Said:** *"Never count a gated-before-build Accept toward the runner's trust ladder — it authorizes one build, not a rating of unattended judgment."*
- **Lived:** row `B34` (`runner-gov-register`, `enforcement = 'reviewer'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B34`.
- **Superseded by:** `M6-07` — *"The trust ladder's inputs are verifier verdicts and post-window reversals, not Accepts; an unreversed decision past its window promotes, a reversal demotes. Supersedes B34 and B35."*
- **Why:** B34 was *correct* and is superseded only because its subject no longer arrives — with the
  card surface withdrawn there are no gated Accepts to exclude, so leaving it live would point a
  live rule at nothing. **Its reasoning is the reasoning `M6-07` is built on**, which is why the
  supersession is not a reversal of it.
- **Survives:** the principle in full — permission is not a rating — carried into `M6-07`'s choice of
  inputs. It also survives *executably*: `public.apply_ladder_decision()` still short-circuits every
  `kind = 'gated_before_build'` row with the reason *"gated card — permission is not a rating (B34),
  ladder untouched"*, which is why closing 44 cards in this migration moved the ladder by zero rungs.

### 33. `public.governance_rules` B35 — John's three rulings (superseded)
- **Said:** *"Apply John's three rulings: a Reverse on a gated card still demotes the ladder; the budget day boundary is midnight America/Chicago; a dead-cycle report must state why it died and what to do next."*
- **Lived:** row `B35` (`runner-gov-register`, `enforcement = 'reviewer'`), home `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B35`.
- **Superseded by:** `M6-07` (statement as quoted in entry 32).
- **Why:** only the **first** of B35's three rulings concerns the card surface, and B35 bundles three
  unrelated rulings into one row — so superseding the row is the only way the registry can express
  that one of them has lost its subject. `M6-07` carries the demotion forward in the form that still
  has a subject: **a reversal demotes.**
- **Survives — and this is the clause a later reader must not lose:** the other two rulings are
  **unaffected and still binding**, and neither is an `M6` matter. *The budget day boundary is
  midnight America/Chicago* — still true, still what `runner_budget` is read against. *A dead-cycle
  report must state why it died and what to do next* — still true, still the `did_not_run` contract
  in `docs/runbooks/runner-cycle.md`. Both are restated in that runbook independently of this row.
  If either is ever in doubt, they are John's rulings and they were never withdrawn; only the routing
  of the first one through a card was.

## SES-171 — briefing-page.md header trim (2026-08-23, same session)

Trim in the SES-164 shape; full stamp-by-stamp detail in the SES-171 delivery record. Summary entries:

| What | Where it lived | Why retired | Where content survives |
|---|---|---|---|
| 29 version stamps, v7.0.99 → v7.0.206 (40,843 bytes, 32.5% of the file) | `docs/runbooks/briefing-page.md` header, lines 1–30 (all but the newest, v7.0.208) | SES-171 header trim, SES-164 shape (session-hygiene stamp-cap check); every stamp probed for stamp-only warnings — none found, all restated in the body sections they correspond to | VERBATIM in `docs/SESSIONS.md` "Appendix — retired `briefing-page.md` header stamps" (29/29 present, 0 missing) + git; body proven sha256-identical across the trim (`20445487a5c91162…`) |
| "masthead … carries a one-tap '▶ Run a cycle now' link" | briefing-page.md, regeneration step 1 | Superseded by SES-143 (v7.0.182): the link lives on §2b; John's explicit do-not-reinstate for the masthead copy | Rewritten in place as a §2b pointer (SES-102 provenance kept) + git |
| "Always three rows … **No** deletes it and records it in vision/rejected-paths.md" | briefing-page.md, §12 SHAPE (SES-125 paragraph) | Superseded by SES-157 (v7.0.206): rejection = kept `status='rejected'` row; rejected-paths.md is a retired stub; drip contract's 1–3 rows is current | Rewritten in place to the SES-157 tap table + git |
| "fires exactly one successor run" / "A wall-stopped cycle fires nothing" | briefing-page.md, regeneration step 6 | Superseded by SES-140 FINAL (v7.0.195): in-session continuation cycles; session-spawning platform-refused | Rewritten in place ("continues nothing"; runner-cycle.md tail step (8) deferral kept) + git |

### 34. `CAP-SESSION-SPLIT-SIGNS` — the 20-minute split trigger (amended)
<!-- FEATURE: SES-296 — the wall-clock half of this rule is withdrawn in the same commit that lands
     M6-10, per the SELFBUILD-CHARTER transition rule: no commit may exist in which neither the old
     split trigger nor the chain rule is in force. -->
- **Said:** split a session once its kickoff doc exceeds 4 tasks or 3 files, **it runs past 20 minutes**, or compacting starts.
- **Withdrawn:** the 20-minute clause only. A chained drain (`M6-10`) runs long by design — measured, a chain ships a ticket for 809K tokens against 2.28M for a cold boot, so a wall-clock split forces the exact cost it should avoid.
- **Survives:** the 4-task / 3-file caps and the compaction trigger, unchanged. `M6-13` states that those caps bind the individual cycle, not the chained session.
- **Restore:** re-add the clause to the registry row and this file's entry; `git` history of `docs/governance/RULES-SNAPSHOT.md`.

### 35. `B22` — one session, one ticket name (amended)
<!-- FEATURE: SES-296 — amended alongside M6-10 in the same commit. -->
- **Said:** rename each cycle's own session to `<TICKET-ID> — <short name>` the moment it picks its work.
- **Withdrawn:** the implicit one-session-one-ticket assumption. A chained session covers several tickets and cannot carry one ticket's name.
- **Survives:** the rename discipline itself — a chained session is named for its drain and renamed at each pick, so a reader can still tell what a session is doing at any moment.
- **Restore:** registry row plus this entry; `git` history.

### 36. `CAP-SCOPE-FILES` — the three-file cap as a flat literal (amended)
<!-- FEATURE: SES-122 (c) — the replacement lands in the SAME commit as the amendment, per the
     SELFBUILD-CHARTER transition rule: no commit may exist in which neither the old flat cap nor
     the class-scoped one is in force. The row stays `live`; only its wording left. -->
- **Said, verbatim:** *"Modify at most 3 files per session."*
- **Lived:** row `CAP-SCOPE-FILES` (`standards-caps`, `enforcement = 'prose'`, `status = 'live'`), home `docs/STANDARDS.md#section-2-session-scope-rules` (unchanged).
- **Replaced by, verbatim:** *"Modify at most 3 files per session, plus the extra files the ticket's class has earned on the trust ladder (`public.class_autonomy(priority_class).extra_files` — one per rung above `runner_settings.cap_relax_rung`; M6, SES-122). The baseline is CLAUDE.md's hard rule; the extra is the class's, read at pick time, never assumed."*
- **Why:** charter decision 5 — *numeric file/task caps retire **only when** the verifier replaces them* — and the M6 gate's ruling on how. The verifier exists (`SES-181`, and `SES-122` (b) made it read the rung), a verdict now moves the ladder (`M6-07`, `SES-122` (a)), and `class_autonomy()` is the one home for what a rung buys. So the cap comes down exactly as fast as verification proves itself and goes back up when it does not: that is the charter's sequencing invariant satisfied **by construction rather than by a date**.
- **Survives — and this is the half a later reader must not lose:** the **3 is not gone**. It is the floor, it is still John's `CLAUDE.md` hard rule, and it is what an unclassed ticket, an untracked class or a failed lookup all fall back to (`class_autonomy()` fails closed at zero extras). Nothing was widened for anybody the ladder has not promoted.
- **Restore:** the row's prior text is in `runner_before_images` — image `1fa15afc-9ac5-419a-b825-a99970c3c66f`, `session_name = 'ses-122c-coding'`, full row as `row_data`. Restore the `statement` from that image, re-export `docs/governance/RULES-SNAPSHOT.md`, and reconcile Section 2 rule 2 in the same commit. Also in `git` history of the snapshot.

### 37. `CAP-SCOPE-TASKS` — the four-task cap as a flat literal (amended)
<!-- FEATURE: SES-122 (c) — amended in the same commit as entries 36 and 38, same transition rule. -->
- **Said, verbatim:** *"Include at most 4 tasks per kickoff doc."*
- **Lived:** row `CAP-SCOPE-TASKS` (`standards-caps`, `enforcement = 'prose'`, `status = 'live'`), home `docs/STANDARDS.md#section-2-session-scope-rules` (unchanged).
- **Replaced by, verbatim:** *"Include at most 4 tasks per kickoff doc, plus the extra tasks the ticket's class has earned (`class_autonomy(priority_class).extra_tasks`; M6, SES-122)."*
- **Why:** entry 36's reason, applied to the task half — the two extras are the *same* number (`greatest(0, rung − runner_settings.cap_relax_rung)`), read from the same function, so splitting them across two rules with two different mechanisms would be the second-home defect this project keeps closing.
- **Survives:** the **4** as the floor, on the same fail-closed terms as entry 36.
- **Restore:** image `adb56e29-5b89-4c7c-8f9e-46e59bdacb4c` (`session_name = 'ses-122c-coding'`), then re-export the snapshot and reconcile Section 2 rule 3 in the same commit.

### 38. `HR-SCOPE` — the hard-rule scope line, and its canonical home (amended + re-homed)
<!-- FEATURE: SES-122 (c) — the re-homing is recorded here because it is the one change in this
     ticket that a reader would otherwise look for in CLAUDE.md's history and never find. -->
- **Said, verbatim:** *"Keep each session to one feature, at most 3 modified files, and at most 4 tasks."*
- **Lived:** row `HR-SCOPE` (`claude-md-hard-rules`, `enforcement = 'prose'`, `status = 'live'`), home **`CLAUDE.md#hard-rules`**.
- **Replaced by, verbatim:** *"Keep each session to one feature, at most 3 modified files, and at most 4 tasks — the baseline; a class's trust-ladder rung above `runner_settings.cap_relax_rung` adds one file and one task per rung (`class_autonomy()`, M6, SES-122), and a reversal takes them back."*
- **RE-HOMED in the same UPDATE:** `canonical_doc` moved from `CLAUDE.md#hard-rules` to **`docs/STANDARDS.md#section-2-session-scope-rules`**, where the statement now sits as a blockquote under rules 1–3. **Why, and it is the whole reason this entry exists:** a rule's `canonical_doc` must carry its text byte-for-byte, and `CLAUDE.md` is **John's file** — this ticket may cite it and may not edit it. The choice was therefore between a live rule whose home contradicts it and a rule homed where a cycle is allowed to reconcile it; the second is the only one that leaves the registry and its home in agreement. **John's `Scope` hard-rule line in `CLAUDE.md` is untouched, still says "One feature per session. Max 3 files. Max 4 tasks.", and is now cited BY the amended row as the baseline** — the row widens what a promoted class may do on top of his floor, it does not overwrite his sentence.
- **Survives:** the one-feature cap in full (`CAP-SCOPE-FEATURE`, *"Scope every session to exactly one feature."*, deliberately **not** amended — a rung buys breadth of edit, never a second feature), the 3/4 floor, and John's own line.
- **Restore:** image `333ff789-be41-4d59-a2ba-35d6b1219d48` (`session_name = 'ses-122c-coding'`) carries both the prior `statement` **and** the prior `canonical_doc`; restoring the row restores the home. Then re-export the snapshot and remove the blockquote from Section 2.

### 39. `apply_ladder_decision()` — the Accept promotion, as a ladder input (retired)
<!-- FEATURE: SES-315 (a) — the replacement is ALREADY LIVE and predates this entry, so there is no
     commit in which neither the old input nor the new one is in force (SELFBUILD-CHARTER transition
     rule): `verdict_ladder_signal()` has moved the ladder off verdicts since `SES-122` (a),
     `v7.0.397`, and `sweep_decision_windows()` off decision windows since `SES-286a`, `v7.0.394`.
     This entry records the removal of the SECOND, older input, not the arrival of the first. -->
- **Did, verbatim from the retired branch:** on a `runner_items` ship card whose `decision = 'accept'`,
  `apply_ladder_decision()` set `v_streak := v_before.streak + 1`, promoted the work class on
  `v_streak % 5 = 0` (`v_rung := v_before.rung + 1`), wrote the `runner_ladder` row after its
  before-image, and returned `applied true` with *"accept on a ship card: streak N -> N+1, rung R ->
  R' (promoted — every 5th Accept)"*.
- **Lived:** `public.apply_ladder_decision(uuid, uuid)`, the `IF v_item.decision = 'accept'` arm,
  shipped by `SES-134` (`v7.0.315`, migration `ses134_ladder_executable`) and last amended by
  `SES-122` (a). Called from `docs/runbooks/runner-cycle.md` step 2 and the step-9 serial tail.
- **Why retired:** two reasons, and the second is the one that makes it unsafe rather than merely
  dead. (1) **Its input no longer exists.** The Accept it counted is a *tap on the ship card*, and
  that surface was retired by `SES-285`; the branch has been dormant since 2026-08-30 while still
  live in the database. (2) **`M6-07` gave the ladder two real inputs, and a third would double-count
  one delivery.** A ship is now graded by its verdict (`verdict_ladder_signal()`: `approve` promotes,
  `block` resets the streak and never the rung) and by its decision window
  (`sweep_decision_windows()` promotes on silence, `reverse_decision()` demotes). Leaving the
  promotion here as well meant one delivery could be counted twice — once by its verdict and once by
  a tap on the same card — which is a *manufactured* promotion: `SES-107`'s runaway with a second
  author. Measured before the change: `runner_ladder.tooling` stood at rung 13 with `cap_relax_rung`
  5 and `auto_done_rung` 3, so a manufactured rung buys real extra files, real extra tasks and the
  auto-done bar.
- **Survives — and this is the half a later editor must not lose:** the function is **not** deleted
  and its `reverse` branch **keeps its demote**. That is not an inconsistency: a Reverse on a legacy
  card **is** a reversal by John's word, and `M6-07`'s safety measure requires that a reversal always
  costs a rung. `greatest(v_before.rung - 1, 0)` and `streak := 0` are unchanged, the `B34` gated
  short-circuit and the `rework` branch are byte-identical, and the retired `accept` arm is **inert
  rather than absent** — it still stamps `runner_items.ladder_applied_at` (the idempotence guard is
  structural: an unstamped card is one a re-run or a second harvesting peer can still count) and
  returns `applied false, 'Accept is not a ladder input since M6-07 (SES-315); the ladder reads
  verdicts and decisions'`. The promotion arithmetic itself survives with **one** home,
  `ladder_apply_signal()`, which is what both live inputs drive; the migration asserts that
  `apply_ladder_decision`'s body no longer contains it at all.
- **Restore:** `git show 9eb38971:docs/SELFBUILD-RETIREMENT-LEDGER.md` for this file, and for the
  branch itself the pre-change body is in the recorded SQL of migration
  `ses122a_verdict_ladder_signals` (`supabase_migrations.schema_migrations`, version
  `20260902210032`) — the last migration to carry `apply_ladder_decision()` with the promotion in
  place. Restoring it means re-adding the `accept` arm *and* re-answering reason (2): a restored
  promotion must be paired with removing one of the two `M6-07` inputs, or the double count comes
  back with it.
