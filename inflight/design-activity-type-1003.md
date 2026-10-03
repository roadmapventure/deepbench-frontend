# design-activity-type-1003

Worktree: `.claude/worktrees/design-activity-type-1003` (branch `session/design-activity-type-1003`, from `origin/dev` @ 356a2266).
Started 2026-10-03. Design + build session for `AGT-350`: the Activity tab's CONNECTED FROM card (`AGT-339`, delivered `v7.0.758`) gets a Type column in place of its note. Supervised cycle `c9568d08`, version `v7.0.769`. Regression baseline on 356a2266 is running in `.claude/worktrees/activity-type-baseline-1003` (detached, throwaway).

Layout John approved 2026-10-03 (direct "yes, add the type column" to the mock as shown):
1. CONNECTED FROM becomes a four-column table: Network | Type | Count | Last.
2. Type is "AI tool server" when the network owner is a known data-centre owner, else "Home or office".
3. The note "These are the AI tool's servers, not the person's location." is removed.
4. Mock rows: Google LLC · Columbus, Ohio | AI tool server | 11 | 2:44 PM — Microsoft Corporation · Des Moines, Iowa | AI tool server | 2 | 12:56 PM — Google Fiber Inc. · Austin, Texas | Home or office | 1 | 3:26 PM.
5. John was told: the category comes from a short list of known data-centre owners held with the tab, and an owner missing from it reads "Home or office" until added.

Not decided by John (the Designer's to call, reversibly): the exact list of data-centre owners; how the Last column prints its date once connections span more than one day (the mock showed time only, on a one-day sample); the column layout on a phone-width screen.
