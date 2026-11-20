# Environment facts

<!-- DeepBench v7.0.495 | docs/runbooks/environment-facts.md | SES-396 slice 1 -->

What this platform has **measured** about the environment it builds itself in — the facts a cycle
would otherwise re-discover, or worse, guess at. Validated by `scripts/check-environment-facts.js`;
`--render` prints the exact body of the live `ds-knowledge-environment` Knowledge Skill Profile
(`SES-396` slice 2, `v7.0.504`). That row was gated under ARCHITECTURE §19v P5 while the sentence
here read "is gated"; rule `AGENT-ROW-AGREED-TICKET` (John 2026-09-14, amended 2026-09-15) made it
build work for a `scope_origin = 'john-named'` ticket, and slice 2 wrote it under one decision
handle with a before-image per row. `--check-row` asserts the row still matches `--render`.

**Append-only, newest last.** A line is added only for a fact **no reading of the ticket or the code
could show** — something true of the machine, the clock, the clone or the account, learned by
running into it. A fact re-readable from a ticket belongs in the ticket.

Format, exactly: `- YYYY-MM-DD | SOURCE | fact`. `SOURCE` is a ticket id (`SES-396`) that must exist
on the board, or a cycle (`cycle:601227fb`). No pipes inside the fact.

## Facts

- 2026-09-12 | SES-384 | Every new public table is born readable by anon: the default ACL grants a SELECT no migration asked for.
- 2026-09-12 | SES-374 | The usage meter is written by a scheduled reader every 30 minutes, so any reading may be that stale.
- 2026-09-13 | SES-382 | Cycles run in parallel (register B42); shared-database regression fixtures collide between them.
- 2026-09-13 | SES-393 | CI clones at depth 1 (actions/checkout@v4, no fetch-depth), so a test rebuilding evidence from git history goes NOT RUN there.
- 2026-09-15 | SES-399 | reverse_decision()'s allowed-table list excludes ai_activity_log, so a Reverse restores nothing there.
- 2026-09-15 | cycle:601227fb | The default branch is main and stale; all work is on dev. Push HEAD:dev, never bare dev, never main.
- 2026-09-15 | cycle:601227fb | runner-cycle.md is 380,902 bytes against the SES-336 ceiling of 381,000; a step edit must first remove bytes.
- 2026-09-15 | cycle:601227fb | runner_before_images has a CHECK refusing cycle_id and session_name together; pass exactly one — first home SES-150, CLAUDE-DESIGN.md:136, where an automated cycle sets cycle_id and an attended session sets session_name.
- 2026-09-15 | cycle:601227fb | feature_id_counter can drift behind the board (seen this cycle: it offered SES-389 while the board already held 398); claim with GREATEST(counter, max)+1, never the counter alone.
- 2026-09-15 | cycle:601227fb | Since SES-336 the Builder owns the push, so at step 7a origin/dev IS HEAD and a git-derived changed-file list is empty (SES-379).
- 2026-09-15 | cycle:601227fb | Several scripts still emit "cannot change to 'C:/Projects/deepbench-frontend'", a laptop path dead in the cloud clone.
- 2026-09-15 | SES-400 | check 9's retirement window is the enclosing BLOCK, and a bold lead-in on the citation's own line starts it, so a note on the line above sits outside the window and does not clear the flag.
- 2026-11-18 | AGT-673 | The safety check refused 3 Builder launches as [Production Deploy]; the one launch text kept told a sub-agent holding no Supabase connector to apply a migration over REST. No apply the orchestrator sent over the connector, down captured first, is on record as refused (30 migrations since). So the orchestrator applies, never the Builder; with no connector the step stops and the ticket parks. A kickoff naming apply_migration carries the line `**Apply:** orchestrator over the Supabase connector; Builder none`.
- 2026-11-20 | AGT-328 | A regression test that holds a literal a kickoff anchors pins it: on tree 56b90a9, 23 of the 138 anchors in the 35 kickoffs since v7.0.1000 are held by a tests/regression file (25 tests, at most 3 a kickoff). From v7.0.1066 --check-kickoff refuses a kickoff whose anchors resolve into such a test unless a fenced `pins` block names it: one line per test, three pipe-separated fields, the tests/regression path, then repin or keep, then why. A repin test is edited by a task, and the ship is blocked when it is not among the changed files.
- 2026-11-20 | AGT-326 | From v7.0.1072 --check-kickoff also counts as a holder, needing its pins line, a regression test that names an anchored file and holds a quoted string or /regex/.test( body of 20 or more characters lying inside the anchored literal: on tree 278e126 the runbook line cycle 89491155 deleted resolves whole into no test while ses-315-ship-reverse asserts a piece of it. A kickoff that anchors docs/runbooks/runner-cycle.md is refused unless it names docs/runbooks/cycle-card.md, carries the word BYTES_AT_SHIP (re-pinned in tests/regression/ses-413d-questions-scoreboard.test.mjs, or byte-neutral) and writes its cap as caps N / M in SESSION; its distinct anchored paths plus those dragged files, when more than N, are a cap case, never a narrower kickoff.
- 2026-11-20 | AGT-319 | From v7.0.1073 a card render writes no agent row: node scripts/render-cycle-card.js --write takes no flags, needs no credentials, and exits 2 when handed --cycle-id, --ticket or --decision. A kickoff whose edit moves docs/runbooks/runner-cycle.md pays for the whole drag in its own file list (the card, and BYTES_AT_SHIP unless byte-neutral; over the cap it is a cap case, and no sweep re-renders for it) and names two commands: --write as often as the build needs, then ONCE on the final card, before the commit, node scripts/render-cycle-card.js --sync-knowledge --repin --cycle-id=<uuid> --ticket=<ID>. Measured on runner_decisions: 23 re-pins since 2026-10-10 over 16 commits that changed the card, 6 of them pinning the live Development Manager to card bytes never committed to dev.
