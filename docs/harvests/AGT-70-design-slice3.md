# AGT-70 — The Auditor: the Designer's reasoning for slice 3 of 4, harvested

<!-- DeepBench v7.0.467 | docs/harvests/AGT-70-design-slice3.md | Written by the Designer (design-kickoff, unattended cycle c060742e-b419-4900-b856-484e3a4318b4, 2026-09-12). Overflow for docs/kickoffs/v7.0.467-AGT-70-auditor-landing.md, linked once from its §1. The build reads this file ONLY at the four blocks the kickoff names — Step 4d, Ledger ticket draft, Brief group, Test parts; everything else is reasoning. Slice 1's reasoning is docs/harvests/AGT-70-design.md, slice 2's is docs/harvests/AGT-70-design-slice2.md; the ticket's full text is docs/harvests/AGT-70.md. Move, never delete. -->

## Premise revalidation (measured 2026-09-12 22:1xZ, live Supabase + this clone at d064a2cc)

- **Slices 1 and 2 landed as their kickoffs said:** `public.audit_findings` holds 6 rows for `2026-W37` — 4 `open`, 2 `resolved`, every one `high`. `docs/audits/2026-W37.md` (6 `## ` findings) and `docs/audits/2026-W37-candidates.json` (24 candidates: 7 `redundant/medium`, 4 `duplicate/medium`, 1 `duplicate/high`, 4 `contradiction/medium`, 2 `contradiction/high`, 4 `stale-or-irrelevant/medium`, 2 `stale-or-irrelevant/high`; `found_by auditor:judgment:claude-fable-5-1`) are committed. `ai_activity_log` carries 12 rows with `agent_id = 'auditor'`, `call_source = 'session'` (11 `audit-governance-corpus`, 1 `audit-agent-data`), all created this ISO week. `backlog_items.AGT-70`: `status partial`, `design_status designed`, `predicted_cycles 4`.
- **The landing does not exist:** `scripts/tripwire-to-backlog.js` (419 lines) has exactly one finding source, `collectFindings()` from `check-session-docs.js`, and no `--from-ledger`, no ISO-week notion, no `audit_findings` read. `scripts/render-standing-brief.js` `fetchFacts()` (lines 983-1175) reads nine fact groups and never `audit_findings`; `docs/runbooks/standing-brief.md` has no ledger group (grep for `audit` inside the generated block: 0 hits; the only mentions are decision rows and the queue line). `docs/runbooks/runner-cycle.md` parses to 24 step markers (`0 0b 1 1b 2 2b 3 4 4a 4a-bis 4b 4c 5 5a 6 7 7b 8 8a 8b 8b-bis 8c 8d 9`); no `4d`; `grep -n audit` over it returns only a claim-audit trail (line 299) and the `--audit` sweep flag (line 3209). `backlog_items` with `source_file = 'audit-ledger'`: 0. `audit_findings` with `status = 'open' AND ruled_by IS NOT NULL`: 0 — nothing qualifies for filing today, which is the correct first state for a path whose default is a dry run.
- **The Auditor still does not exist:** 0 `agents` rows `auditor`/`GV-07`, 0 `au-*` Skill rows, 0 `audit-*` capabilities. Slice 1's gating ruling stands; nothing this slice does creates a row.
- **The card constraint is real and measured:** `docs/runbooks/cycle-card.md` is 7,531 bytes against `CARD_BYTE_CAP` 10,240, rendered from the runbook by `scripts/render-cycle-card.js` and held byte-identical by `tests/regression/ses-377-cycle-card.test.mjs` arm (A). `render()` throws — CLI exit 2 — for any step marker with no `NOTES` entry (`render-cycle-card.js:151-154`), and the same test's control asserts exactly that (`controlsGoRed`, `**10. Nothing.**`). `NOTES` outcomes are capped at 90 chars (`OUTCOME_MAX`). A runbook step marker is `/^\*\*(\d+[a-z]?(?:-bis)?)\. /` at column 0, so `**4d. Weekly audit — …` is parsed and titled `Weekly audit` (cut at the first ` — `).
- **The stamp constraint is real:** the runbook carries 5 header stamps (`v7.0.462`, `.459`, `.452`, `.448`, `.446`); `tests/regression/ses-297-pre-boot-pickability.test.mjs:349-353` asserts `stamps <= 5` as a red suite, and `:355-359` asserts a retired stamp is present VERBATIM in `docs/SESSIONS.md`. Prior rotated runner-cycle stamps sit in `docs/SESSIONS.md` at lines 12827 (`v7.0.423`), 13491 (`v7.0.425`), 13505 (`v7.0.438`).
- **Premise alive.** The gap is the landing: nothing reads the ledger onto the brief, nothing turns a ruled finding into a board row, and no cycle step fires the weekly run.

## Governing architecture

- **§19b / Rule #1 (§19d, §19e):** `--from-ledger` reads `audit_findings` and `backlog_items` as tables; the brief group reads `audit_findings` by columns; step 4d names scripts and a lane, never an agent as a cause. No route, no conditional keyed to an id. The `--run` model stays the `judgment` lane read live from `runner_model_lanes` (slice 2's contract; unchanged here).
- **§19v (reversibility):** every `--from-ledger --apply` INSERT is preceded by a `runner_before_images` row with `row_data: null` — the same `insertBeforeImage()` the tripwire path already uses (`tripwire-to-backlog.js:276-297`), so a Reverse is a DELETE of that pk. Ids come from ONE `feature_id_counter` block claimed by the cycle (`session-setup.md` §3b); the script never mints one. The runbook edit is a doc change; the card is a re-render; reversal of this slice is a code revert.
- **§19k:** this slice makes no model call. Step 4d's run logs every call through `agent-log.js` (slice 2), and those log rows are what 4d's precondition reads.
- **`.claude/rules/supabase-column-grants.md`:** every new read names its columns; `select=*` is avoided on `audit_findings` in the brief (the tripwire path's `audit_findings` read names 12 columns because the ticket draft needs `locations` and `proposed_resolution`).
- **`docs/runbooks/runner-cycle.md` step 8b-bis** is the shape `--from-ledger` inherits: exit 1 = "claim ids and re-run with `--apply`", exit 0 = quiet, exit 2 = never a pass.

## Design decisions, with the alternatives they beat

- **The weekly fire rule's footprint is the log, not a notes prefix and not a file.** Step 4c keys its once-per-day rule on a `runner_cycles.notes` prefix written by a separate `scheduled` row; 4d has no separate row (the run happens inside the cycle). Alternatives: (a) `docs/audits/<week>.md` exists in the clone — rejected: slice 1 wrote `2026-W37.md` by hand ingest, so the file's existence does not mean the run happened, and a cycle that ran and failed to ship would leave no file and re-run next cycle at 12 calls each; (b) a `notes` line `AUDIT: ran <week>` — rejected: notes are free text written at step 9 and a cycle that dies between 4d and 9 leaves nothing, so the next cycle re-runs. The `ai_activity_log` rows are written per call, synchronously, by the run itself (`agent-log.js`, exit 2 stops the run), and 12 already exist this week — so the rule "count of `agent_id='auditor' AND call_source='session'` rows since `date_trunc('week', now() at time zone 'utc')` is 0" is true exactly when no call has been made this ISO week. Postgres `date_trunc('week')` is ISO (Monday); `date -u +%G-W%V` is the same week in the shell (verified: `2026-W37` today). A dry `--run` logs nothing and is not the weekly run.
- **What qualifies for the board: ruled, open, high.** The caller's words. `status = 'open'` after a ruling means John read the finding and did not close it (`resolved`) or dismiss it (`not-a-defect`) — the ledger's only third outcome is "real, still open", which is a ticket. `confidence = 'high'` keeps a medium/low ruled row out of the board until the fix is certain — a rule that reads like the tripwire's "WARN never files". `ruled_by IS NOT NULL` is the rulings band's own column (the guard trigger leaves exactly `status, ruling, ruled_by, ruled_at` mutable), so the qualification needs no new column and no keyword convention in `ruling`. Alternative considered: a `ruling` verb (`file: …`) — rejected as one more thing for John to remember with a wrong-row cost when forgotten.
- **One row per finding, never aggregated.** The tripwire aggregates per check class because 45 of 48 FLAGs were one class. Ledger findings are already one dispute each with their own fingerprint (slice 1's identity), so the fingerprint is the dedupe key: substring match against `source_file = 'audit-ledger'` descriptions, the same mechanism as the tripwire's `sigHash`, so the two dedups read alike.
- **Weekly cap 3, counted from the table.** `LEDGER_WEEKLY_CAP = 3` rows per ISO week (`created_at ≥ isoWeekStart(now)` over `source_file = 'audit-ledger'` rows), plus the existing per-run `--max-filings`. Counted from the table rather than from a counter so a second cycle in the same week sees what the first filed. Three is the tripwire's `DEFAULT_MAX_FILINGS`; one number, one board discipline. The candidates file's 24 rows are exactly why the cap exists.
- **`SES` ids.** The rows are session-hygiene work (doc and data drift) and the tripwire files `SES` rows for the same class of defect; `parseBacklogIds` keeps its default prefix and the runbook text keeps one id-claim rule.
- **ISO week lives in `audit-ledger.js`.** The ledger owns `iso_week`; `tripwire-to-backlog.js` and slice 4's week-two dedupe import the same two functions. No script had one (grep `isoWeek|IYYY|getUTCDay` over `scripts/` : 0 hits before this slice).
- **The brief group is counts and a table, never a rate**, the SES-360 group's contract: pure `renderAuditLedger(audit, stamp)`, absent facts render as "not read", `factsSha` moves when a ruling lands or a row files (so `--check` sees a ruling as drift, which it is — the block's job is to show John what changed).
- **Step 4d's fenced block is longer than `FULL_BLOCK_MAX` (400 B) on purpose.** Seven commands do not fit 400 bytes without losing the flags; the card degrades the block to an `L<n>(- <n>B)` pointer, which is the card's own design for a block a cycle should open the runbook to run. The step's card line still carries its outcome. A `--weekly` orchestrating flag on `audit-cluster.js` was considered and rejected for this slice: a tenth file and new failure modes for a run that happens once a week.
- **Candidates are never ingested by a cycle.** The 4d block's `--ingest` line is a dry run whose exit 1 means "John has new reading". Slice 1 set this discipline; slice 2 held it; the step text says it in words so a later editor does not "fix" the exit code.
- **The report ships in the cycle's one commit** (`--report=$W --write`), even when it says 0 findings — a week with no ruled row is a true record, and the file is what week-two dedupe (slice 4) and John read.

## Step 4d

Insert between `runner-cycle.md` line 1915 (the last line of step 4c) and line 1917 `**5. Pick ONE item.**`, with one blank line on each side — byte-for-byte (the outer fence is four backticks only so the inner three-backtick command block survives; copy what is inside it):

````markdown
<!-- FEATURE: AGT-70 slice 3 — the weekly audit fires here; the ledger is the record and the board receives ruled rows only. -->
**4d. Weekly audit — once per ISO week, before selection (`AGT-70` slice 3, `v7.0.467`).** The Auditor's
judgment run (`scripts/audit-cluster.js`, `v7.0.465`) fires on the first cycle of the ISO week that passes
the walls — the step-4c shape, a week instead of a day. Precondition: `select count(*) from ai_activity_log
where agent_id = 'auditor' and call_source = 'session' and created_at >= date_trunc('week', now() at time
zone 'utc')` is **0**. Every live cluster call logs one such row, so a non-zero count is this week's run
already done: write `AUDIT: already run <week>` in `notes` and go to step 5. Otherwise, with
`W=$(date -u +%G-W%V)` and `S` a scratch directory:

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… sh -c '
node scripts/audit-corpus.js --out=$S/s.json &&
node scripts/audit-cluster.js --build --statements=$S/s.json --week=$W --out-dir=$S/c &&
node scripts/audit-cluster.js --run --dir=$S/c --cycle-id=<your cycle id> &&
node scripts/audit-cluster.js --collect --dir=$S/c --statements=$S/s.json --week=$W --out=docs/audits/$W-candidates.json;
node scripts/audit-ledger.js --ingest=docs/audits/$W-candidates.json --week=$W;
node scripts/tripwire-to-backlog.js --from-ledger --json;
node scripts/audit-ledger.js --report=$W --write'
```

Four rules, none tunable here: (1) **A cycle never ingests candidates.** The `--ingest` line is a dry run;
its exit **1** means "new findings for John to read" and is never a signal to `--apply` — only John's hand
ingests, and only he rules (`status`, `ruling`, `ruled_by`, `ruled_at` are the ledger's one mutable band).
(2) **The board receives ruled rows only.** `--from-ledger` files a `backlog_items` row for a finding that
is `open`, `high` and carries a `ruled_by` — John read it and left it open — deduped by fingerprint against
`source_file = 'audit-ledger'` rows and capped at **3 per ISO week**. Its exit **1** IS the 8b-bis signal:
claim that many `SES` ids in ONE `feature_id_counter` call (`session-setup.md` §3b) and re-run with
`--apply --cycle-id=<your cycle id> --backlog-ids=SES-<n>,…`. (3) The `--run` model is the `judgment` lane
read live from `runner_model_lanes`, never a literal; the log rows it writes are this step's precondition.
(4) `docs/audits/<W>-candidates.json` and `docs/audits/<W>.md` ship in this cycle's ONE commit (step 7) —
the report is the week's record even when it holds 0 findings. Exit **2** anywhere is a refusal and
nothing was filed: write it in `notes` and **continue to step 5 normally** — the audit is bookkeeping,
never this cycle's build.
````

Header stamp for line 1 (the build writes it in its own words on this shape — the stamp is prose, not a pinned block): `<!-- DeepBench v7.0.467 | runbooks/runner-cycle.md | AGT-70 slice 3 — NEW STEP 4d: THE WEEKLY AUDIT FIRES ON THE FIRST CYCLE OF THE ISO WEEK THAT PASSES THE WALLS, and the thing to read twice is the precondition — the run's own log rows, not a notes prefix and not a file … Stamp count held at 5 per session-hygiene check 7: v7.0.446 (SES-346) moved VERBATIM to docs/SESSIONS.md; SES-164 step 2 run FIRST by grep over this body — <what was found, what was relocated>. The card (docs/runbooks/cycle-card.md) re-rendered in the same commit; NOTES gained 4d. Doc + 3 scripts + test; no src/api/lib change, no schema change. -->`. The rotated `v7.0.446` stamp goes into `docs/SESSIONS.md` directly after the line that begins `<!-- DeepBench v7.0.438 | runbooks/runner-cycle.md | SES-335`.

## Ledger ticket draft

`buildLedgerTicketDraft(row, backlogId, { now })` — pure; `row` is an `audit_findings` row as PostgREST returns it. Title: `[Auditor] <kind>: <governing_fact, first clause cut at 90 chars>` (reuse `firstClause`). Description, byte-for-byte with the placeholders filled (four-backtick outer fence; copy what is inside it):

````
**P10 - Tooling.** **Auto-filed from the Auditor's ledger (`AGT-70`) on John's ruling — not yet a fix.**

`public.audit_findings` row `<fingerprint>` (<kind>, confidence <confidence>, first seen <iso_week>) was ruled by <ruled_by> on <ruled_at, first 10 chars> and left `open`, which is the ledger's "file it" state.

Ledger fingerprint: `<fingerprint>`
Ruling: <ruling>
Filed at: <now ISO>

**Fact in dispute:** <governing_fact>

**Locations (verbatim at filing):**
  - `<location>` — "<text>"          ← one line per entry of row.locations, in order

**Proposed resolution:** <proposed_resolution>

Reproduce:
```
node scripts/audit-ledger.js --report=<iso_week>
```

Filing is not fixing — this ticket rides the normal queue and the full session ceremony, as tripwire and heal tickets do. The fingerprint above is the dedupe key: the same finding files once, and a re-run files nothing. At most 3 ledger rows file per ISO week (`LEDGER_WEEKLY_CAP`).
````

Row fields: `backlog_id`, `tier 'next'`, `type 'Tooling'`, `priority_class 'P10 - Tooling'`, `title`, `description`, `status 'open'`, `source_file LEDGER_SOURCE_FILE`, `row_ordinal` (numeric part of the id), `size_stamp` (`'S'` when `row.locations.length <= SIZE_S_MAX_MEMBERS`, else `'M'`), `gate_count 0`, `session_ref` `S-<backlogId> (auto-filed from the Auditor's ledger, AGT-70)`. No `scope_origin` (the tripwire draft sets none; keep the two drafts alike).

## Brief group

`renderAuditLedger(audit, stamp)` — pure; `audit = { rows: [{fingerprint, iso_week, kind, confidence, status, governing_fact, ruled_by}], filed: <number> }` exactly as `fetchFacts()` builds it. Output, in this order:

```
**Auditor's ledger** — *<stamp>.* What `public.audit_findings` (`AGT-70`) holds and what has left it for the board. Counts only, never a rate. Latest week <week = max iso_week>: **<N> findings (<a> open · <b> resolved · <c> not a defect)** — **<r> ruled** open findings (a ruled, open, `high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); **<f> filed** to the board from the ledger so far (`source_file = 'audit-ledger'`).

| fingerprint | kind | confidence | fact | ruled |
|---|---|---|---|---|
| `<fingerprint>` | <kind> | <confidence> | <summarise(governing_fact, 80)> | <ruled_by or —> |      ← the latest week's `open` rows only; confidence high → medium → low, then fingerprint ascending

- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled and left `open` to file. Candidates a run found but nobody ingested live in `docs/audits/<week>-candidates.json`, not here.*
```

With `rows` empty: the header line reads `Latest week —: **0 findings (0 open · 0 resolved · 0 not a defect)**` and the table is replaced by `- *The ledger holds no rows yet.*`. With `audit` absent or malformed (`!audit || !Array.isArray(audit.rows)`): the header line, then `- *The ledger was not read for this render* — which is **not** the same as *no findings*. Re-run `scripts/render-standing-brief.js` with a service key.` — never a zero. One blank line closes the group, as every sibling does. `factsSha` payload key: `audit: facts.audit ? { rows: facts.audit.rows.map(r => [r.fingerprint, r.iso_week, r.status, r.ruled_by == null ? null : String(r.ruled_by)]).sort(), filed: Number(facts.audit.filed) } : null`.

## Test parts

Added to `tests/regression/agt-70-auditor.test.mjs` (header `v7.0.467`, parts A-I unchanged):

- **J — ledger filing (pure).** Import `ledgerEligible`, `ledgerDetect`, `buildLedgerTicketDraft`, `LEDGER_SOURCE_FILE`, `LEDGER_WEEKLY_CAP` from `scripts/tripwire-to-backlog.js` and `isoWeek`, `isoWeekStart` from `scripts/audit-ledger.js`. Fixture rows (fingerprints `aaaa…`/`bbbb…`/…, 16 hex): R1 `open`/`high`/`ruled_by 'john'`/`ruled_at 2026-09-13`, 2 locations; R2 `open`/`high`/`ruled_by null`; R3 `open`/`medium`/`ruled_by 'john'`; R4 `not-a-defect`/`high`/`ruled_by 'john'`; R5 `open`/`high`/`ruled_by 'john'`, 8 locations; R1′ = R1's fingerprint again with a later `ruled_at`. Assert: `ledgerEligible([R1,R2,R3,R4,R5,R1′])` → `[R1, R5]` in that order (R1′ collapsed, earliest `ruled_at` kept); `ledgerDetect(eligible, ['… ' + R5.fingerprint + ' …'], {filedThisWeek: 0, weeklyCap: 3})` → `detections [R1]`, `alreadyFiled [R5]`, `capLeft 3`; `{filedThisWeek: 3}` → `detections []`, `capLeft 0`; `{filedThisWeek: 2}` with no existing → `detections [R1]` (cut to 1), `capLeft 1`. Controls: R1 with `ruled_by null` → not eligible; R1 with `confidence 'medium'` → not eligible. `buildLedgerTicketDraft(R1, 'SES-999', {now})`: `source_file === 'audit-ledger'`, `tier 'next'`, `row_ordinal 999`, `size_stamp 'S'`; for R5 `size_stamp 'M'`; `description` includes R1's fingerprint, its `ruling`, every `location` string and `--report=` + R1.iso_week; `title` starts `[Auditor] contradiction:`. `isoWeek(new Date('2026-09-12T22:12:00Z')) === '2026-W37'`, `'2027-01-01T12:00:00Z'` → `'2026-W53'`, `'2026-01-01T12:00:00Z'` → `'2026-W01'`; `isoWeekStart(new Date('2026-09-12T22:12:00Z')) === '2026-09-07T00:00:00.000Z'`; `LEDGER_WEEKLY_CAP === 3`.
- **K — brief group (pure + doc).** `AUDIT()` = the six live fingerprints' shape (4 open, 2 resolved, `ruled_by null` on the open four, `filed 0`). `renderAuditLedger(AUDIT(), 'as of X')` starts `**Auditor's ledger** — *as of X.*`, contains `**6 findings (4 open · 2 resolved · 0 not a defect)**`, `**0 ruled**`, `**0 filed**`, exactly 4 table rows (one per open fingerprint), no `%`; byte-identical on a second call. `renderAuditLedger(AUDIT({rows: with one open row's ruled_by = 'john'}), …)` contains `**1 ruled**` and that row ends `| john |`. `renderAuditLedger(undefined, 'as of X')` contains `was not read for this render` and does not contain `0 findings`. `factsSha(F({audit: AUDIT()}))` equals itself and differs from `factsSha(F({audit: AUDIT with one ruled_by}))` and from `F({audit: {…, filed: 1}})`, where `F()` is a minimal facts object (`items` of one row, other groups undefined). Doc: `docs/runbooks/standing-brief.md` has `**Auditor's ledger**` inside the generated markers, after `**Governance agents, last 7 days**` and before `*Provenance:`.
- **L — step 4d and the card (source, always runs).** `parseSteps(readLf('docs/runbooks/runner-cycle.md'))` (import from `scripts/render-cycle-card.js`) yields labels with `4d` immediately after `4c` and before `5`, 25 in all; `NOTES['4d']` exists and `NOTES['4d'].outcome.length <= 90`; the 4d body (from the `**4d. ` marker to the `**5. ` marker) contains `tripwire-to-backlog.js --from-ledger`, contains `audit-ledger.js --ingest=` and no line containing both `--ingest=` and `--apply`, contains `date_trunc('week'`; the runbook has exactly 5 lines starting `<!-- DeepBench v` and `docs/SESSIONS.md` contains `<!-- DeepBench v7.0.446 | runbooks/runner-cycle.md | SES-346`. Control: `render(md.replace('**4d. ', '**4e. '))` throws (no NOTES entry for `4e`).
- **M — live (`SUPABASE_URL` + `SUPABASE_SERVICE_KEY`; `notRun` otherwise).** Spawn `node scripts/tripwire-to-backlog.js --from-ledger --json` → exit 0, parsed JSON has `source === 'ledger'`, `weeklyCap === 3`, `filedThisWeek === 0` and `Array.isArray(detections)`; REST: `audit_findings?select=id` length 6; `backlog_items?select=id&source_file=eq.audit-ledger` length 0.

## What this slice does not do

- It creates no row, applies no seed, registers no handler, writes nothing under `.claude/`, ingests nothing into the ledger and files nothing to the board — `--from-ledger` runs dry and finds 0 ruled rows today.
- It does not run the audit: 12 log rows this ISO week mean 4d's precondition already says "done" for `2026-W37`; the first live fire is the first cycle of `2026-W38` that passes the walls.
- It does not decide week-two semantics (slice 4), build the negative-control corpus, or the self-audit.

## Residue for the orchestrator (not the build's)

- Card items for John: (1) read `docs/audits/2026-W37-candidates.json`, ingest with `--apply` or not, and rule the ledger's open four (`update public.audit_findings set ruled_by = 'john', ruled_at = now(), ruling = '…' where fingerprint = '…'` — leave `status = 'open'` to have `--from-ledger` file it next cycle, or set `resolved` / `not-a-defect`); (2) apply `docs/design/agt-70-auditor-seed.sql` attended; (3) the `auditor-write` handler.
- The 4d block's `sh -c '…'` form is one line the cycle pastes; on John's Windows machine an attended run uses the seven commands separately (`$W`/`$S` are POSIX). Not a defect — the runbook is the unattended Linux clone's procedure — but worth a sentence in `session-setup.md` when slice 4 touches it.
- `docs/SESSIONS.md` is 1.93 MB, already over `check-session-docs.js`'s ~1.5 MB rotation threshold (check at line 1037); the rotated stamp adds ~3 KB to a file that already flags. Pre-existing, not this slice's.
