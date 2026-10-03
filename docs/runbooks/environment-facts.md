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
