# DAT-30 — harvest (redesign attempt 2 of 2, cycle 19f836cc, v7.0.1063, tree 369060e, 2026-11-19)

Reasoning behind `docs/kickoffs/v7.0.1063-DAT-30-secret-age-on-the-brief-from-updated-at.md`. The build does not need this file. Attempt 1's reasoning was the previous content of this file (git history, v7.0.1046).

## 1. Premise — alive, and now past the ticket's own deadline

Measured 2026-11-19T23:16Z with `runner_secrets?select=name,updated_at` over REST. The `value` and `note` columns were never selected, by me or by any script I ran.

| key | updated_at (UTC) | whole days |
|---|---|---|
| ANTHROPIC_API_KEY | 2026-08-20 03:14:32 | 91 |
| SUPABASE_SERVICE_KEY | 2026-08-20 03:14:32 | 91 |
| SUPABASE_URL | 2026-08-20 03:14:32 | 91 |
| VERCEL_AUTOMATION_BYPASS_SECRET | 2026-08-20 03:14:32 | 91 |
| VERCEL_TOKEN | 2026-08-20 04:21:20 | 91 |
| SCRATCH_SUPABASE_SERVICE_KEY | 2026-08-28 20:27:49 | 83 |
| MCP_API_KEY | 2026-09-10 00:25:52 | 70 |
| YAHOO_IMAP_APP_PASSWORD | 2026-09-25 19:37:56 | 55 |
| YAHOO_IMAP_USER | 2026-09-25 19:38:40 | 55 |
| MCP_KEY_interviewquestions | 2026-10-23 18:41:07 | 27 |
| OPENAI_API_KEY | 2026-11-12 22:11:14 | 7 |
| MCP_KEY_maricopa_dashboard | 2026-11-19 21:25:01 | 0 |

Twelve rows (the ticket says ten, attempt 1 measured eleven; one was added today). Twelve accounted for, no remainder. One cause covers every row at or past 90: nothing in the platform rotates a key, records a rotation, or shows an age.

Other live facts, each checked this turn:

- `select=rotated_at` answers `42703 column runner_secrets.rotated_at does not exist`.
- Catalog read (one read-only query over the Supabase connector, catalog tables only): 0 user triggers on `runner_secrets`; columns `name text, value text, note text, updated_at timestamptz default now()`; `relacl` `{postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres}` — `anon` and `authenticated` hold nothing, as the ticket says.
- 0 `governance_rules` statements match `secret` or `rotat`.
- `scripts/render-standing-brief.js` holds 0 occurrences of `secret`; `docs/runbooks/standing-brief.md` holds 0 lines starting `**Secret age**`.
- `runner_refusal_attempts` holds one DAT-30 row: attempt 1, `differs: staging`, refused 2026-11-16T17:30Z, the migration sent twice in that run (`earlier_refusals` 1).
- `runner_model_lanes.orchestrator` is `claude-opus-5`.

## 2. What attempt 1 was refused on, and what I did with that

The refusal was not a labelled safety-check decision. The Supabase connector asked for an interactive confirmation of the migration and nobody was there to answer within 60 seconds. An unattended cycle cannot answer that question, so the same migration sent again meets the same silence. I do not know which statement in it raised the confirmation, and I did not try to find out by sending variants: that would be probing the check.

So attempt 2 sends no migration at all. It is not the same change through another door: the columns, the trigger and the function are simply not in this build. The part that only a schema change on `runner_secrets` can deliver is named in the kickoff as blocked (D1) and stays open on the ticket.

## 3. Why scope, and why this scope

The ticket's own discriminating QA is "the standing brief shows an oldest-key age". That needs a read of two columns that already exist and one render function. It does not need the stamp. Attempt 1 bundled the two; they carry different risk:

| part | touches | reach | undo |
|---|---|---|---|
| age on the brief | one script, one test, one generated doc | a read by name and stamp; no database write | `git revert` |
| rotation stamp | DDL on the table holding every credential | every row; every later write passes a trigger | by hand only — `capture_migration_down()` refuses an in-place ALTER, so no automatic rollback |

Separating them is the risk rule's ordinary staging call, not a cap split: the kickoff is 3 files and 3 tasks against caps of 51 and 52.

What the smaller scope costs, stated plainly:

1. **The age is weaker evidence than a stamp would be.** `updated_at` is only a column default. A value pasted with an UPDATE that omits `updated_at` leaves the age unchanged (the key looks older than it is); a note edit that sets `updated_at` makes a key look fresh. The group prints this in one line and labels the column "row last written", never "rotated" (pattern:33, pattern:39).
2. **No per-row cadence.** `SUPABASE_URL` is an address and `YAHOO_IMAP_USER` a username; neither can be rotated, and both are counted. Today that makes the count 5 of 12 where the credentials alone are 4 of 10. I did not hardcode a list of non-credential names into the script: which row is a credential is a judgment about data and belongs in data (pattern:11), and the data home for it is the blocked column. The state cell says "at or past 90" / "under 90" — a fact about the row — rather than "overdue", which would be a wrong word for an address.
3. **The ticket's closing condition cannot be met by this build.** "Oldest-key age under 90" needs keys rotated and, because of item 2, a way to exclude the address row. DAT-30 stays open; the kickoff's STOP LINE says so.

## 4. Alternatives I weighed and dropped

- **A side table (`name`, `rotated_at`, `rotation_days`) instead of columns.** A new table can be rolled back automatically, which answers the undo problem. But keeping it true needs a trigger on `runner_secrets` anyway, or a writer nobody has; without one it is a second place to forget. And it is a migration on the last attempt this ticket gets, for a part the display does not need. Worth its own ticket once someone can answer a confirmation.
- **A `runner_settings` knob for the 90.** `runner_settings` is one wide row; a new knob is a new column, which is a migration. A constant is honest here: 90 is the ticket's number and no row carries its own cadence yet (pattern:18).
- **The `governance_rules` cadence row.** Still deferred, for attempt 1's first reason, now stronger: four credentials are already past 90 days and no cycle can cure that, so the rule would be born breached by a cause the platform cannot act on.
- **Parking as attended-only.** The runbook forbids parking a ticket whose `parked_why` is `refused`; and the display half genuinely needs nobody.
- **The briefing page (`scripts/build-briefing.mjs`).** The ticket names it; that page is published. A list of key names and ages does not belong on a published page (pattern:139). The standing brief is a repo document.

## 5. Dry runs (scratch copy of 369060e; the clone itself was not edited)

- T1 applied exactly as worded, by script, each from-string asserted to occur once.
- The T2 test as worded: exit 0 after T1; on the unchanged script exit 1, `4 of 4 arms failed`, first line `rows: renderSecretAge must be exported`.
- `node scripts/render-standing-brief.js` with credentials, writing the scratch copy's brief: `**Secret age**` line count 0 → 1; the line read `**Oldest row: 91 days (`ANTHROPIC_API_KEY`)**, 5 of 12 at or past 90 days.`, placed directly above `**Human gates**`.
- The 20 related tests (`scripts/related-tests.js` over the script and the brief) on the unchanged clone, uncredentialed: red set 0 of 20. The same 20 plus the new test on the changed, re-rendered scratch copy: 0 of 21.
- `node scripts/verifier.js --check-kickoff=<draft>`: exit 0, 7,824 bytes.
- The Redesign line parsed with `scripts/redesign-pickup.js`'s own regex: attempt 2, `scope`.
- The JS block in the kickoff is byte-identical to the code the dry run used.

## 6. What I did not verify

- **BASELINE is uncredentialed.** Credentialed arms write fixtures and cycles run in parallel; step 7 measures the credentialed set.
- **Whether a write path exists that sets `updated_at` on a value change.** No script in `scripts/` or `api/` writes `runner_secrets`; rows arrive by hand or by connector. So I cannot say how often the stamp is wrong, only that nothing prevents it.
- **Whether the service key is a legacy key with an end-of-2026 date** (attempt 1's finding): telling them apart means looking at a value. Still unverified, still belongs with `AGT-675`.

## 7. Found on the way, not designed here

- The ticket text is stale on three counts: twelve rows, not ten; the oldest is 91 days, not 78; the 90-day line it warns about is crossed.
- `MCP_KEY_maricopa_dashboard` was added today: keys are still being minted on the shared-key model `AGT-675` describes.
- If this attempt is also refused, the remaining step is the diagnostic. The unknown worth writing there: which statement of attempt 1's migration raised the connector's confirmation, since 30 other migrations applied without one.

## 8. Sources opened

Ticket row `DAT-30`; `runner_secrets` (names and stamps only), `runner_refusal_attempts`, `runner_model_lanes`, `governance_rules`, `runner_settings`, `backlog_items` (`AGT-673`, `AGT-675`), `pg_trigger` / `pg_attribute` / `pg_class.relacl` for `runner_secrets`; attempt 1's kickoff and harvest; `docs/runbooks/redesign-after-refusal.md`; `scripts/render-standing-brief.js`; `tests/regression/agt-607-stalled-cycles-brief.test.mjs`; `scripts/redesign-pickup.js`, `related-tests.js`, `baseline-red-set.js`, `pre-build-baseline.js`, `verifier.js`; `docs/kickoffs/v7.0.448-SES-368-weekly-pace-gate.md`. Each fact a task needs from them is in the kickoff.
