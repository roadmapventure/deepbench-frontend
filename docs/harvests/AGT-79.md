# AGT-79 — The Ticket Owner: the Designer's reasoning for slice 1 of 3, harvested

<!-- DeepBench v7.0.474 | docs/harvests/AGT-79.md | Written by the Designer (design-kickoff, unattended cycle dde4670d-e87f-4538-9b56-e920ff00ba64, 2026-09-13). Overflow for docs/kickoffs/v7.0.474-AGT-79-ticket-owner-census.md, linked once from its §1. The build reads this file ONLY at the blocks the kickoff names: ## Reads and ## Checks (§4 and task 2), ## Findings DDL (task 1), ## Census format (§4), ## Fixture board (task 3), ## Test parts (task 4), ## Seed (task 5). Everything else here is reasoning. -->

## Premise revalidation (measured 2026-09-13 01:5xZ, live Supabase over PostgREST with the service key, plus `execute_sql` for catalog reads)

- **The instrument does not exist:** `GET /rest/v1/ticket_owner_findings` → 404 `PGRST205` ("Could not find the table"); `to_regclass('public.ticket_owner_findings')` NULL. `agents where lane = 'governance'` = `devmanager GV-01, researcher GV-02, prioritizer GV-03, designer GV-04, builder GV-05, verifier GV-06`, all `is_active = true`; no `ticketowner`; `agents where code = 'GV-07'` → 0 rows; `skill_profiles where slug like 'to-%'` → 0; `capabilities where slug = 'audit-board'` → 0; `ai_activity_log where agent_id = 'ticketowner'` → 0. `backlog_items.AGT-79`: `open`, `claimed_by` this cycle, `predicted_cycles 3`, `size_stamp L`, `kickoff_link NULL`, `design_status NULL`, `revalidated_at NULL`.
- **The gaps the ticket measured on 2026-09-11 are still live, re-measured tonight** (status CHECK is `open | partial | delivered | done | removal proposed | removed`; in-scope = the first four):
  - Board: open 546, partial 47, done 244, delivered 16 (= 853 in scope); 892 rows total.
  - QUOTE: `predicted_cycles` NULL on 486 of 546 open, 43 of 47 partial, 165 of 244 done. The column was born in `ses_ticket_governance_matrix` (`20260901155603`); 481 of the 486 open NULLs were filed before it — **3 after**. `size_stamp` NULL on 467 open; born `ses_burndown_size_stamps` (`20260828213427`); 448 before — **16 after**.
  - ACTUAL: `actual_tokens_attended` NULL on all 892 rows (the comment: "NULL means none recorded, not zero-cost"). `cost_pct_snapshot` NULL on 145 of 260 closed; the four `cost_*` columns were born in `ses_cost_snapshot_durable` (`20260901164141`); of the closed rows updated after that birth, **37** have `ticket_matrix.actual_cycles > 0` (the value is derivable) and **63** have 0 cycles (attended work with no `runner_cycles` row — unknowable, a finding, never a number). **No function and no trigger writes `cost_*`**: `pg_proc` has none whose body mentions `cost_pct_snapshot`; the only non-internal trigger on `backlog_items` is `backlog_done_requires_verdict`. The 118 existing stamps were written by hand, all at `cost_snapshot_rate = 0.444444…`, which is exactly `select runner_pct_per_cycle()` tonight (RPC over REST returns `0.444444444444444`). The view computes `predicted_pct_of_week = round(predicted_cycles * runner_pct_per_cycle(), 2)` and `cycle_pct_of_week` from the same rate, so `round(actual_cycles × rate, 2)` reproduces every existing stamp (`SES-140`: 2 cycles → 0.89; `SES-132`: 1 → 0.44).
  - STATUS: closed rows with no `runner_verdicts` row 138; the first verdict is `2026-08-25T03:50:04Z` (201 rows since); **41** closed rows updated after that carry none. `backlog_done_requires_verdict` (SES-311) refuses `done` without a verdict — but only when the epic has a `project_id` (SES-340), so the gap can still open. `done` with `claimed_by` set: **1** (`SES-141`, claimed by `design-briefing-redesign` 2026-08-23). Expired open claims (older than 24 h, holder not a live cycle): 0 — the one open claim is this cycle's own on `AGT-79`; `runner_cycles where ended_at is null` = 2. Closed with `design_status = 'designed'`: **28** (`AGT-69, AGT-80, CHI-84, LOG-149, SES-008, SES-112, SES-113, SES-124, SES-125, SES-127, SES-129, SES-146, SES-165, SES-184, SES-185, SES-343, SES-345, SES-348, SES-352, SES-353, SES-354, SES-359, SES-360, SES-367, SES-371, SES-373, SES-377, SES-381`) — mostly the recent ships: closing does not clear it. `type` census: Tooling 250, Feature 161, Architecture 139, Tech Debt 67, Observability 61, Data 51, UI 50, Bug 44, Task Success Rate 35, Speed 17, NULL 6, Admin 4, Automation 3, `—` 1, Loop 1, Bug Fixes 1, feature 1. In scope (four statuses) the off-taxonomy rows are 15: `SES-131` (feature) and `SES-208` (Bug Fixes) map one-to-one; NULL 5 (`SE-01..04, SE-06`), Admin 4 (`ADM-2, ADM-5, FM-06, SK-08`), Automation 3 (`SES-275, SES-276, SES-277`), Loop 1 (`LOO-37`) do not.
  - CLOSE-OUT: `delivered` rows older than 48 h with no `runner_items.decided_at` (the Accept) and no `runner_decisions` row after `updated_at`: **4** (`LOG-149`, `SES-273`, `SES-275`, `SES-360`; the ticket counted 2 on 09-11). `done` with `ticket_matrix.actual_cycles > predicted_cycles`: **2** (`LOG-143` 6 > 3, `SES-245` 2 > 1). Open rows filed more than 30 days ago (`filed_at`) with `revalidated_at` NULL: 427 of 437 (the ticket's 485 used a different clock; either way step 8c's one-per-cycle reach cannot drain it).
- **Premise alive.** Nobody owns the row after filing; the derivable cells (`cost_*`, stale claims, two `type` values) sit unwritten with their values one join away, and every check above is decidable from columns that exist tonight.

## The size ruling — why this slice and no more

The ticket is `L`, 3 cycles by its own estimate; caps 14 files / 15 tasks. The AGT-70 precedent on this epic ran four slices, each its own kickoff and cycle, and each shipping something testable on its own. The same shape here:

1. **Slice 1 (this kickoff):** `public.ticket_owner_findings`; `scripts/ticket-owner.js` as the mechanical census — pure `classifyBoard()` with the eleven checks, their fences and the DERIVABLE/JUDGMENT classification, fix objects computed exactly as slice 2 will write them, a DRY CLI that writes to no table; a 14-row fixture with one variable per row and controls; the seed written, not applied. 4 files, 7 tasks.
2. **Slice 2 — the write pass and the judgment run:** `--apply --cycle-id` applies every derivable fix under ONE `record_decision('ticket-scope' or a new kind, 'AGT-79', …)` row with a `runner_before_images` row per touched `backlog_items` row (`backlog_items` is on `reverse_decision()`'s allowlist, so one Reverse restores every cell); findings upserted into the table — re-seen moves `last_seen_at`, gone sets `cleared_at`, new inserts (before-image `row_data: null`); the two-pass `exit 3` shape (`rank-backlog.js`) for the judgment lane: pass one prints the assembled `audit-board` prompt with the census JSON as `task_context`, pass two validates against the Intent's stored schema and renders the report; the ticket's rolled-back QA (a done row with `claimed_by` cleared and restored by `reverse_decision()`; a 49-hour delivered row that lands one finding and no status change; a NULL quote that stays NULL; a pre-fence row in the count and not in findings; the second run inserting zero rows). Until John applies the seed, the judgment pass runs as a hand-composed sub-agent (the SES-359 exception form) or is skipped — the census and the fixes need no model.
3. **Slice 3 — the landing:** runbook step **4e** (`4d` is AGT-70's weekly audit, `v7.0.467`) — once per CST night before selection, the 4c precondition shape over `runner_cycles.notes like 'SCHEDULED-AGENT: audit-board%'` with `ended_at` in the current America/Chicago day; the card: `NOTES["4e"]` in `scripts/render-cycle-card.js` (the renderer exits 2 without it) and `node scripts/render-cycle-card.js --write` committed in the same commit as the runbook edit (`tests/regression/ses-377-cycle-card.test.mjs` holds the card byte-identical to a fresh render); the "Ticket hygiene, last night" group in `scripts/render-standing-brief.js` (findings by check, cells fixed, backlog counts, byte-identical across unchanged runs, `undefined` = not read, never zeros); the Bench ruling per AGT-69 (governance agents render from live `lane = 'governance'` rows — `OFF_BENCH_AGENT_IDS` no longer exists, so "joins OFF_BENCH_AGENT_IDS" in the ticket is already moot).

## The gating ruling — the roster rows are John's

`.claude/rules/agent-roster-inert.md` bullet 3 (SES-338): a `lane = 'governance'` agent lands `is_active = true`; bullet 4: automated sessions never edit rows belonging to an active agent (§19v P5). So the INSERT that creates `ticketowner` is itself an active-agent write, and no unattended cycle may make it — AGT-70 is deferred on exactly this boundary, and its harvest (`docs/harvests/AGT-70-design.md` § The gating ruling) read the same four sources. This slice therefore ships the instruments (table, script, fixture, test) and WRITES the seed as a file under `docs/design/` (a file is not a row; AGT-63's seed was authored as a file and applied attended). The kickoff's STOP LINE puts the apply on John's card.

**The code collision, stated rather than resolved silently:** the ticket names `GV-07`. `docs/design/agt-70-auditor-seed.sql` (unapplied) already carries `'auditor', 'GV-07'`. Live codes stop at `GV-06`. The seed here says `GV-08` so the two files do not collide if John applies both in the order they were written; if he applies this one first or renumbers, the code is one literal in one file. A code is a display label, not a key (`agents.id` is the key), so nothing else depends on it.

## Governing architecture

- **§19b (capabilities as data) and Rule #1 (§19d/§19e):** the script reads `backlog_items`, `ticket_matrix`, `runner_verdicts`, `runner_items`, `runner_decisions`, `runner_cycles` as tables; nothing is keyed to an agent id; the seed's Skill text names no other agent — a missing quote is "for the capability that quotes tickets", a status is "a verdict's word or John's". Task 5's grep is the control. The Intent carries no `traits.handler`: pass two of the script (slice 2) is the writer, in-process, as `rank-backlog.js` hands its ranking to its handler — so no harness file is touched in any slice.
- **§19v (lane routing, reversibility):** P10 tooling ships live; the census writes nothing, so this slice needs no before-image; slice 2's every write is before-imaged under one decision, and `backlog_items` is on `reverse_decision()`'s `k_allowed` (`runner-cycle.md` 4444-4452), so the Reverse restores every cell rather than reporting `refused`. The migration captures its down first (`capture_migration_down(p_cycle_id uuid, p_up_name text, p_objects jsonb)`; `runner-cycle.md` 2795-2800). The table's writer never sets a status, a quote or `design_status` (the ticket's guardrails), so the worst wrong write is a cleared claim or a cost stamp — both reversible, both derivable again the next night.
- **§19k:** no model call in this slice; slice 2's judgment run logs through the SES-331 path like every governance run.
- **`.claude/rules/supabase-column-grants.md`:** default privileges are closed (DAT-18), so the new table gets no public grant and none is granted; every read names its columns (`select=*` is a 403 waiting to happen); the only reader is the service key.
- **SES-376:** every number a task asserts is in the kickoff; the byte-for-byte blocks live here under the names the tasks cite.

## Design decisions, with the alternatives they beat

- **Slice 1 is a census that writes nothing, not a smaller write pass.** Alternative: ship the two cheapest derivable fixes (clear `SES-141`'s claim, normalise two `type` values) tonight. Rejected: the write pass needs the decision + before-image + findings-upsert machinery, which is slice 2's whole content, and a write pass without the fixture QA the ticket demands is the "blind fix" John's rules forbid. A DRY census that prints exact ids (`SES-141`, `LOG-143`, `SES-245`, `SES-131`, `SES-208`) is falsifiable tonight and is the input slice 2's fixture is checked against.
- **Fences are per column birth, read from `supabase_migrations.schema_migrations` tonight, and stored as constants.** Alternative: read the births live from the migrations table each run. Rejected: `supabase_migrations` is not exposed over PostgREST, and a birth date never moves. `FENCES` is exported so the test can assert the four values and slice 3's brief can print them.
- **A fence compares the row's filing time for filing-time checks and its `updated_at` for close-out checks.** A ticket filed in July and closed yesterday can and should carry a cost stamp; a ticket filed yesterday cannot be blamed for a NULL `size_stamp` the filer had no column for — the two clocks are different questions. `T = filed_at ?? created_at` because `filed_at` is the ticket's own date (0 NULLs live) and `created_at` is the import date on the older rows.
- **`actual-unknown` is its own check, not a flavour of `cost-snapshot-missing`.** 63 closed rows have 0 cycles in `ticket_matrix` — attended work whose only record would be `actual_tokens_attended`, which nothing has ever written. Writing `cost_pct_snapshot = 0` there would be a lie in live voice (the column comment says NULL means "none recorded, not zero-cost"). It is a finding with a plain detail: the actual is unknowable until the attended half is recorded.
- **`claim-expired` reads liveness off `runner_cycles.ended_at IS NULL`, not off "shipped work".** The column comment's rule is "older than 24h with no shipped work"; on an `open` or `partial` row, shipped work would have moved the status, so the one thing that can legitimately hold a claim past 24 h is a cycle that is still running. Tonight that is 2 rows, one of them this cycle.
- **`unrevalidated_30d` and `attended_actual_null` are counts, never findings.** 427 and 260 rows respectively; a finding per row is board flooding wearing an auditor's clothes, and neither is a cell the owner can fill. Step 8c already owns revalidation one ticket per cycle.
- **`TYPE_TAXONOMY` is the FEATURES.md table plus `Tooling` and `Bug`.** The written taxonomy (`docs/FEATURES.md` §Type Taxonomy, 8 rows) does not contain `Tooling` (250 live rows) or `Bug` (44), which the ticket itself treats as canonical (`'Bug Fixes' → Bug`). Hard-coding the 8 alone would flag 294 rows the board agrees on; the list is exported and the drift is on John's card (an Auditor-shaped finding about the taxonomy's home, not this ticket's to fix). `Admin`, `Automation`, `Loop` stay findings: the ticket says one-to-one mappings only, and none of the three has a home in the table.
- **`check_slug`, not `check`.** `check` is a reserved word in Postgres; quoting it in every query for the life of the table is the mistake `ses_ticket_governance_matrix` avoided with `defer_status`. The ticket's meaning is kept; the column name is disclosed.
- **A partial unique index `(backlog_id, check_slug) where cleared_at is null`, not a full UNIQUE.** A finding cleared in September may legitimately re-open in October as a new row with its own `first_seen_at`; only the OPEN finding is one-per-(ticket, check). This is what makes "re-seen not re-inserted" a constraint rather than a convention.
- **The fixture's `now` and `rate` are arguments, never the clock.** `classifyBoard(board, {now, rate})` is pure so the test can hold 11 findings byte-stable and run the three time controls; the CLI passes the clock and the RPC value only in `--census` mode.
- **The Intent has no handler and asks for no help.** The mechanical pass computes the fixes; the model confirms or refuses them against the contract and writes the judgment sentences and the report. Putting the write behind a `traits.handler` would land in `request-receivable.js`, a harness file, and gate every slice on John — the shape AGT-70 is stuck on. The script is the hands; the Skills are the judgment; neither knows the other's name.
- **`temperature` NULL on every seed row.** AGT-70's self-audit found `temperature = 0` stored on 22 `claude-fable-*` rows that the API rejects; a new agent must not add five more.

## Reads

The six REST reads (service key; every column named; each must come back an array whose length is below its `limit`, else exit 2 — a truncated board is not a census) and the one RPC. `board = {items, matrix, verdicts, accepts, decisions, openCycles}` holds exactly what they return.

```
items       backlog_items?select=id,backlog_id,status,type,tier,claimed_by,claimed_at,predicted_cycles,size_stamp,design_status,kickoff_link,cost_pct_snapshot,cost_cycles_snapshot,revalidated_at,filed_at,created_at,updated_at,actual_tokens_attended&status=in.(open,partial,done,delivered)&order=backlog_id&limit=5000
matrix      ticket_matrix?select=backlog_id,actual_cycles,predicted_cycles&limit=5000
verdicts    runner_verdicts?select=backlog_id&limit=10000
accepts     runner_items?select=backlog_id,decided_at&decided_at=not.is.null&backlog_id=not.is.null&limit=10000
decisions   runner_decisions?select=backlog_id,decided_at&backlog_id=not.is.null&limit=10000
openCycles  runner_cycles?select=id&ended_at=is.null&limit=1000
rate        POST rpc/runner_pct_per_cycle  body {}  → a number (live tonight 0.444444444444444)
```

Live counts tonight: items 853, openCycles 2, rate 0.4444.

## Checks

`classifyBoard(board, {now, rate})`. Definitions: `closed` = status `done` or `delivered`; `live` = `open` or `partial`; `T` = `filed_at ?? created_at`; `U` = `updated_at`; `c` = the row's `ticket_matrix.actual_cycles` (0 when no matrix row); `hasVerdict` = a `verdicts` row with the id; `hasAccept` = an `accepts` row with the id; `laterDecision` = a `decisions` row with the id and `decided_at > U`; `liveClaim` = `claimed_by` equals some `openCycles[i].id`; `H24 = now − 24 h`, `H48 = now − 48 h`, `D30 = now − 30 d`. One finding per (row, check); `findings` sorted by `check` (CHECKS order) then `backlog_id`; `detail` is one plain sentence naming the column(s) and the value(s) read; `fix` is present only on a derivable finding and holds exactly the columns slice 2 will write. `CHECKS`, in order:

| # | check | when | verdict | fix | before the fence |
|---|---|---|---|---|---|
| 1 | `quote-missing` | live · `predicted_cycles` null · `T ≥ FENCES.predicted_cycles` | judgment | — | `backlog.quote_prefence++` |
| 2 | `size-missing` | live · `size_stamp` null · `T ≥ FENCES.size_stamp` | judgment | — | `backlog.size_prefence++` |
| 3 | `cost-snapshot-missing` | closed · `cost_pct_snapshot` null · `U ≥ FENCES.cost_pct_snapshot` · `c > 0` | derivable | `{cost_cycles_snapshot: c, cost_pct_snapshot: round(c × rate, 2), cost_snapshot_rate: rate, cost_snapshot_at: now}` | `backlog.cost_prefence++` (whatever `c`) |
| 4 | `actual-unknown` | closed · `cost_pct_snapshot` null · `U ≥ FENCES.cost_pct_snapshot` · `c = 0` | judgment | — | (counted under 3) |
| 5 | `claim-on-closed` | closed · `claimed_by` not null | derivable | `{claimed_by: null, claimed_at: null}` | no fence |
| 6 | `claim-expired` | live · `claimed_by` not null · `claimed_at < H24` · not `liveClaim` | derivable | `{claimed_by: null, claimed_at: null}` | no fence |
| 7 | `verdict-missing` | closed · not `hasVerdict` · `U ≥ FENCES.runner_verdicts` | judgment | — | `backlog.verdict_prefence++` |
| 8 | `designed-closed` | closed · `design_status = 'designed'` | judgment | — | no fence |
| 9 | `type-off-taxonomy` | `type` null or not in `TYPE_TAXONOMY` | derivable when `type` is a key of `TYPE_MAP`, else judgment | `{type: TYPE_MAP[type]}` | no fence |
| 10 | `delivered-unaccepted` | status `delivered` · `U < H48` · not `hasAccept` · not `laterDecision` | judgment | — | no fence |
| 11 | `cycles-over-quote` | closed · `predicted_cycles` not null · `c > predicted_cycles` | judgment | — | no fence |

(Eleven slugs: the ticket's "ten checks" split `cost-snapshot-missing` from `actual-unknown`, which is the derivable/judgment line inside one gap.) Counts only, never findings: `backlog.unrevalidated_30d` = open rows with `T < D30` and `revalidated_at` null; `backlog.attended_actual_null` = closed rows with `actual_tokens_attended` null. `counts = {rows: items.length, findings, derivable, judgment}`. `round(x, 2)` = `Math.round(x * 100) / 100`. Dates compare as ISO strings parsed by `Date.parse`.

## Findings DDL

```sql
-- AGT-79 slice 1 (v7.0.474): the Ticket Owner's findings. One OPEN row per (ticket, check); re-seen moves last_seen_at,
-- a gap that closes sets cleared_at, a gap that re-opens later is a new row. Written only by scripts/ticket-owner.js (slice 2).
CREATE TABLE public.ticket_owner_findings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_id     text NOT NULL,
  check_slug     text NOT NULL CHECK (check_slug IN ('quote-missing','size-missing','cost-snapshot-missing','actual-unknown','claim-on-closed','claim-expired','verdict-missing','designed-closed','type-off-taxonomy','delivered-unaccepted','cycles-over-quote')),
  verdict        text NOT NULL CHECK (verdict IN ('derivable','judgment')),
  detail         text NOT NULL,
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  cleared_at     timestamptz,
  cycle_id       uuid REFERENCES public.runner_cycles(id),
  CHECK (last_seen_at >= first_seen_at),
  CHECK (cleared_at IS NULL OR cleared_at >= first_seen_at)
);
CREATE UNIQUE INDEX ticket_owner_findings_open_one ON public.ticket_owner_findings (backlog_id, check_slug) WHERE cleared_at IS NULL;
COMMENT ON TABLE public.ticket_owner_findings IS 'AGT-79: the Ticket Owner''s findings — one open row per (backlog_id, check_slug); re-seen, not re-inserted; cleared_at set the night the gap closes. check_slug because check is reserved. Rows filed before the column they lack existed are a count in the nightly report, never a row here.';
-- No GRANT to anon / authenticated: default privileges are closed (DAT-18) and the only reader is the service key.
```

## Census format

`renderCensus(result, nowIso)` — pure; `result` is what `classifyBoard` returns. Line 1, then one line per `CHECKS` slug in order (always all eleven, even at 0), then a trailing newline:

```
ticket-owner census <nowIso>: <counts.rows> rows · <counts.findings> findings (<counts.derivable> derivable · <counts.judgment> judgment) · behind the fences: quote <quote_prefence> · size <size_prefence> · cost <cost_prefence> · verdict <verdict_prefence> · unrevalidated>30d <unrevalidated_30d> · attended-actual null <attended_actual_null>
  <check, padded right to 22>  derivable <d>  judgment <j>  <ids>
```

`<ids>` = the finding ids for that check sorted ascending, the first 8 joined by `, `, then ` +N` when more; `—` when none. The CLI prints this to stdout in both modes; with `--json` it prints the JSON object instead (`{measured_at, rate, fences, counts, backlog, findings}`); `--out=<path>` writes that object pretty-printed (2 spaces) regardless. `measured_at` = `nowIso`.

## Fixture board

`tests/fixtures/agt-79/board.json` — byte-for-byte. Fourteen rows, one variable each; `now` is `2026-09-13T02:00:00Z`, `rate` 0.5. Expected: 11 findings — derivable 4 (`QA-79-03` cost `{2, 1, 0.5, now}`, `QA-79-05` claim, `QA-79-07` claim, `QA-79-12` type → `Feature`), judgment 7 (`QA-79-01` quote, `QA-79-04` actual-unknown, `QA-79-08` verdict, `QA-79-10` delivered-unaccepted, `QA-79-13` type, `QA-79-14` designed-closed AND cycles-over-quote); backlog `quote_prefence 1, size_prefence 1, cost_prefence 1, verdict_prefence 1, unrevalidated_30d 1, attended_actual_null 2`. `QA-79-02` (filed before both fences), `QA-79-06` (claim held by a live cycle), `QA-79-09` (closed before the cost and verdict fences) and `QA-79-11` (accepted) produce no finding.

```json
{
  "now": "2026-09-13T02:00:00Z",
  "rate": 0.5,
  "board": {
    "items": [
      { "id": "00000000-0000-4000-8000-000000000001", "backlog_id": "QA-79-01", "status": "open", "type": "Tooling", "tier": "next", "claimed_by": null, "claimed_at": null, "predicted_cycles": null, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": null, "cost_cycles_snapshot": null, "revalidated_at": null, "filed_at": "2026-09-10T00:00:00+00:00", "created_at": "2026-09-10T00:00:00+00:00", "updated_at": "2026-09-10T00:00:00+00:00", "actual_tokens_attended": null },
      { "id": "00000000-0000-4000-8000-000000000002", "backlog_id": "QA-79-02", "status": "open", "type": "Tooling", "tier": "next", "claimed_by": null, "claimed_at": null, "predicted_cycles": null, "size_stamp": null, "design_status": null, "kickoff_link": null, "cost_pct_snapshot": null, "cost_cycles_snapshot": null, "revalidated_at": null, "filed_at": "2026-08-01T00:00:00+00:00", "created_at": "2026-08-01T00:00:00+00:00", "updated_at": "2026-08-01T00:00:00+00:00", "actual_tokens_attended": null },
      { "id": "00000000-0000-4000-8000-000000000003", "backlog_id": "QA-79-03", "status": "done", "type": "Tooling", "tier": "next", "claimed_by": null, "claimed_at": null, "predicted_cycles": 2, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": null, "cost_cycles_snapshot": null, "revalidated_at": null, "filed_at": "2026-09-05T00:00:00+00:00", "created_at": "2026-09-05T00:00:00+00:00", "updated_at": "2026-09-10T00:00:00+00:00", "actual_tokens_attended": null },
      { "id": "00000000-0000-4000-8000-000000000004", "backlog_id": "QA-79-04", "status": "done", "type": "Tooling", "tier": "next", "claimed_by": null, "claimed_at": null, "predicted_cycles": 1, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": null, "cost_cycles_snapshot": null, "revalidated_at": null, "filed_at": "2026-09-05T00:00:00+00:00", "created_at": "2026-09-05T00:00:00+00:00", "updated_at": "2026-09-10T00:00:00+00:00", "actual_tokens_attended": null },
      { "id": "00000000-0000-4000-8000-000000000005", "backlog_id": "QA-79-05", "status": "done", "type": "Tooling", "tier": "next", "claimed_by": "stale-session", "claimed_at": "2026-09-01T00:00:00+00:00", "predicted_cycles": 1, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": 0.44, "cost_cycles_snapshot": 1, "revalidated_at": null, "filed_at": "2026-09-05T00:00:00+00:00", "created_at": "2026-09-05T00:00:00+00:00", "updated_at": "2026-09-10T00:00:00+00:00", "actual_tokens_attended": 0 },
      { "id": "00000000-0000-4000-8000-000000000006", "backlog_id": "QA-79-06", "status": "open", "type": "Tooling", "tier": "next", "claimed_by": "cyc-live", "claimed_at": "2026-09-11T20:00:00+00:00", "predicted_cycles": 1, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": null, "cost_cycles_snapshot": null, "revalidated_at": null, "filed_at": "2026-09-11T00:00:00+00:00", "created_at": "2026-09-11T00:00:00+00:00", "updated_at": "2026-09-11T20:00:00+00:00", "actual_tokens_attended": null },
      { "id": "00000000-0000-4000-8000-000000000007", "backlog_id": "QA-79-07", "status": "open", "type": "Tooling", "tier": "next", "claimed_by": "cyc-dead", "claimed_at": "2026-09-11T20:00:00+00:00", "predicted_cycles": 1, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": null, "cost_cycles_snapshot": null, "revalidated_at": null, "filed_at": "2026-09-11T00:00:00+00:00", "created_at": "2026-09-11T00:00:00+00:00", "updated_at": "2026-09-11T20:00:00+00:00", "actual_tokens_attended": null },
      { "id": "00000000-0000-4000-8000-000000000008", "backlog_id": "QA-79-08", "status": "done", "type": "Tooling", "tier": "next", "claimed_by": null, "claimed_at": null, "predicted_cycles": 1, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": 0.44, "cost_cycles_snapshot": 1, "revalidated_at": null, "filed_at": "2026-09-05T00:00:00+00:00", "created_at": "2026-09-05T00:00:00+00:00", "updated_at": "2026-09-10T00:00:00+00:00", "actual_tokens_attended": 0 },
      { "id": "00000000-0000-4000-8000-000000000009", "backlog_id": "QA-79-09", "status": "done", "type": "Tooling", "tier": "next", "claimed_by": null, "claimed_at": null, "predicted_cycles": 1, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": null, "cost_cycles_snapshot": null, "revalidated_at": null, "filed_at": "2026-07-01T00:00:00+00:00", "created_at": "2026-07-01T00:00:00+00:00", "updated_at": "2026-08-01T00:00:00+00:00", "actual_tokens_attended": 0 },
      { "id": "00000000-0000-4000-8000-000000000010", "backlog_id": "QA-79-10", "status": "delivered", "type": "Tooling", "tier": "next", "claimed_by": null, "claimed_at": null, "predicted_cycles": 1, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": 0.44, "cost_cycles_snapshot": 1, "revalidated_at": null, "filed_at": "2026-09-05T00:00:00+00:00", "created_at": "2026-09-05T00:00:00+00:00", "updated_at": "2026-09-11T01:00:00+00:00", "actual_tokens_attended": 0 },
      { "id": "00000000-0000-4000-8000-000000000011", "backlog_id": "QA-79-11", "status": "delivered", "type": "Tooling", "tier": "next", "claimed_by": null, "claimed_at": null, "predicted_cycles": 1, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": 0.44, "cost_cycles_snapshot": 1, "revalidated_at": null, "filed_at": "2026-09-05T00:00:00+00:00", "created_at": "2026-09-05T00:00:00+00:00", "updated_at": "2026-09-11T01:00:00+00:00", "actual_tokens_attended": 0 },
      { "id": "00000000-0000-4000-8000-000000000012", "backlog_id": "QA-79-12", "status": "done", "type": "feature", "tier": "next", "claimed_by": null, "claimed_at": null, "predicted_cycles": 1, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": 0.44, "cost_cycles_snapshot": 1, "revalidated_at": null, "filed_at": "2026-09-05T00:00:00+00:00", "created_at": "2026-09-05T00:00:00+00:00", "updated_at": "2026-09-10T00:00:00+00:00", "actual_tokens_attended": 0 },
      { "id": "00000000-0000-4000-8000-000000000013", "backlog_id": "QA-79-13", "status": "done", "type": null, "tier": "later", "claimed_by": null, "claimed_at": null, "predicted_cycles": 1, "size_stamp": "S", "design_status": null, "kickoff_link": null, "cost_pct_snapshot": 0.44, "cost_cycles_snapshot": 1, "revalidated_at": null, "filed_at": "2026-09-05T00:00:00+00:00", "created_at": "2026-09-05T00:00:00+00:00", "updated_at": "2026-09-10T00:00:00+00:00", "actual_tokens_attended": 0 },
      { "id": "00000000-0000-4000-8000-000000000014", "backlog_id": "QA-79-14", "status": "done", "type": "Tooling", "tier": "next", "claimed_by": null, "claimed_at": null, "predicted_cycles": 1, "size_stamp": "S", "design_status": "designed", "kickoff_link": "docs/kickoffs/v0.0.0-QA-79-14-fixture.md", "cost_pct_snapshot": 1.33, "cost_cycles_snapshot": 3, "revalidated_at": null, "filed_at": "2026-09-05T00:00:00+00:00", "created_at": "2026-09-05T00:00:00+00:00", "updated_at": "2026-09-10T00:00:00+00:00", "actual_tokens_attended": 0 }
    ],
    "matrix": [
      { "backlog_id": "QA-79-01", "actual_cycles": 0, "predicted_cycles": null },
      { "backlog_id": "QA-79-02", "actual_cycles": 0, "predicted_cycles": null },
      { "backlog_id": "QA-79-03", "actual_cycles": 2, "predicted_cycles": 2 },
      { "backlog_id": "QA-79-04", "actual_cycles": 0, "predicted_cycles": 1 },
      { "backlog_id": "QA-79-05", "actual_cycles": 1, "predicted_cycles": 1 },
      { "backlog_id": "QA-79-06", "actual_cycles": 0, "predicted_cycles": 1 },
      { "backlog_id": "QA-79-07", "actual_cycles": 0, "predicted_cycles": 1 },
      { "backlog_id": "QA-79-08", "actual_cycles": 1, "predicted_cycles": 1 },
      { "backlog_id": "QA-79-09", "actual_cycles": 1, "predicted_cycles": 1 },
      { "backlog_id": "QA-79-10", "actual_cycles": 1, "predicted_cycles": 1 },
      { "backlog_id": "QA-79-11", "actual_cycles": 1, "predicted_cycles": 1 },
      { "backlog_id": "QA-79-12", "actual_cycles": 1, "predicted_cycles": 1 },
      { "backlog_id": "QA-79-13", "actual_cycles": 1, "predicted_cycles": 1 },
      { "backlog_id": "QA-79-14", "actual_cycles": 3, "predicted_cycles": 1 }
    ],
    "verdicts": [
      { "backlog_id": "QA-79-03" }, { "backlog_id": "QA-79-04" }, { "backlog_id": "QA-79-05" }, { "backlog_id": "QA-79-10" },
      { "backlog_id": "QA-79-11" }, { "backlog_id": "QA-79-12" }, { "backlog_id": "QA-79-13" }, { "backlog_id": "QA-79-14" }
    ],
    "accepts": [
      { "backlog_id": "QA-79-11", "decided_at": "2026-09-12T00:00:00+00:00" }
    ],
    "decisions": [],
    "openCycles": [
      { "id": "cyc-live" }
    ]
  }
}
```

## Seed

`docs/design/agt-79-ticket-owner-seed.sql` — byte-for-byte. HELD: applied only by a session John attends (the gating ruling above). Run `node scripts/check-model-ids.js` over it before applying; never edit the Skill text without a decision.

```sql
-- AGT-79 — The Ticket Owner (GV-08): agent row, one Capability, five Skill profiles (five types, no Format row), links, assignment.
-- Written by the design-kickoff capability, unattended cycle dde4670d-e87f-4538-9b56-e920ff00ba64, 2026-09-13 (v7.0.474). HELD FOR JOHN:
-- a governance-lane agent lands is_active = true (SES-338 carve-out), so creating these rows is an active-agent write —
-- gated under §19v and .claude/rules/agent-roster-inert.md. Apply from an attended session, one transaction, with a
-- record_decision('directive','AGT-79', ...) row and a runner_before_images row (row_data null) per inserted row.
-- CODE: the ticket says GV-07; AGT-70's unapplied seed file under docs/design/ already carries GV-07, so this file
-- says GV-08 — one literal, John's to change. temperature is NULL on every row on purpose: the judgment lane's API
-- rejects it (request-receivable.js:274-279). Rule #1: no Skill text names another agent; a gap is filed for the
-- capability that decides it.

BEGIN;

INSERT INTO public.agents (id, code, name, role, lane, specialty, bio, is_active, visibility, agent_origin, skill_score, rating, usage_count, data_room_access, uber_access)
VALUES ('ticketowner', 'GV-08', 'The Ticket Owner', 'Governance — Ticket Owner', 'governance',
  'Nightly Board Census · Derivable-Cell Repair · Ticket Hygiene Findings',
  'The Ticket Owner owns every ticket''s row after it is filed — its quote, its actual, its status and its close-out. Once a night it reads the whole board, fills the cells whose value another column already holds, files the rest as findings for the capability that decides them, and reports what it fixed and what is still open. It owns rows, never work: it never changes a status, never grades a ship, never invents a number.',
  true, 'config', 'system', 0, 0, 0, '[]'::jsonb, false);

INSERT INTO public.capabilities (slug, name, description, execution_type, tenant_id, display_phrase, default_intent_slug) VALUES
 ('audit-board', 'Audit Board',
  'Reviews one night''s mechanical census of the ticket board — every row''s quote, actual, status and close-out, date-fenced at each column''s birth — confirms or refuses each derivable cell fix against the column contract, writes one plain sentence per judgment gap naming the capability that decides it, and renders the nightly report. Returns structured output; the census script writes.',
  'ai', 'global', 'auditing the board', 'to-audit-intent');

INSERT INTO public.agent_capability_assignments (agent_id, capability_slug, tenant_id) VALUES ('ticketowner', 'audit-board', 'global');

INSERT INTO public.skill_profiles (slug, name, skill_type_slug, objective, method, output_desc, description, traits, guardrails, technical_services, execution_type, llm_provider, llm_model, max_tokens, temperature, api_key_source) VALUES

 ('to-identity', 'Ticket Owner Identity', 'identity',
  'Be The Ticket Owner: you own every ticket''s row after it is filed — its quote, its actual, its status and its close-out — and you fix only what the columns themselves can tell you.',
  'A ticket''s row tells a story: what it was expected to cost, what it cost, where it stands and whether it closed the way it said it would. You read the whole board once a night. You fill a cell only when another column already holds its value; you file everything else as a finding for the capability that decides it; you report. You own rows, never work: you never change a status, never grade a ship, never invent a number, and a row older than the column it lacks is a count you report once, not a fault you flag nightly.',
  NULL, NULL, '{}'::jsonb, '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 6000, NULL, 'platform'),

 ('to-knowledge-board', 'Ticket Owner Knowledge — the column contract, the fences and the ledger', 'knowledge',
  'Hold what each cell of a ticket row means, which cells are derivable from which, the six status words and what each requires, the fences, the taxonomy and the findings ledger.',
  E'THE QUOTE: backlog_items.predicted_cycles is THE cost driver (predicted_ticket_tokens() derives the token figure; it is never stored) and size_stamp is S | M | L. A missing quote is a finding for the capability that quotes tickets — never a number you supply.\nTHE ACTUAL: public.ticket_matrix derives actual_cycles, cycle_pct_of_week and actual_tokens from runner_cycles at read time; backlog_items.actual_tokens_attended is the only stored half (attended and desktop sessions write no cycle row; NULL means none recorded, not zero); cost_pct_snapshot, cost_cycles_snapshot, cost_snapshot_rate and cost_snapshot_at freeze the cost when a ticket closes, at the rate public.runner_pct_per_cycle() returns that night — derivable exactly when actual_cycles > 0; unknowable when it is 0.\nTHE STATUS WORDS (the CHECK): open | partial | delivered | done | removal proposed | removed. delivered needs an Accept (a runner_items row with decided_at) or a later decision within 48 hours; done needs a runner_verdicts row and no claimed_by; design_status = designed needs kickoff_link and is stale on a closed row; a NULL design_status is not auto (SES-114). claimed_by / claimed_at: a claim older than 24 hours whose holder is not a running cycle is expired (the column''s own rule).\nTHE FENCES (column births): size_stamp 2026-08-28T21:34Z; predicted_cycles 2026-09-01T15:56Z; the cost_* columns 2026-09-01T16:41Z; runner_verdicts 2026-08-25T03:50Z. A filing-time gap is fenced on the ticket''s filed_at; a close-out gap on its updated_at.\nTHE TAXONOMY: docs/FEATURES.md section Type Taxonomy (Task Success Rate, Speed, Architecture, Feature, Tech Debt, Data, Observability, UI) plus the two live majorities Tooling and Bug; the only normalisations are one-to-one: feature → Feature, Bug Fixes → Bug.\nTHE LEDGER: public.ticket_owner_findings — one open row per (backlog_id, check_slug); a finding re-seen moves last_seen_at, a gap that closes sets cleared_at; "still open after N nights" is now() minus first_seen_at.',
  NULL, 'The column contract, the fences, the taxonomy and the ledger, held so every finding names a real column and a real date.',
  '{"source":"inline"}'::jsonb, '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 6000, NULL, 'platform'),

 ('to-behavior', 'Ticket Owner Behavior', 'behavior',
  NULL, NULL, NULL, NULL,
  '{"reasoning_style":"Read the whole census once. For every finding ask two questions in this order: is the correct value already held by a column the contract names, and would writing it change a status, a quote or a judgment? Yes then no is a cell to fix; anything else is a finding. Count what sits behind a fence and stop there. Prefer an empty fix list to a doubtful one.","writing_style":"Three blocks, in this order: cells fixed (ticket — column — from → to), findings by check (ticket — one plain sentence — nights open), backlog behind the fences (one line per fence). IDs verbatim, counts side by side, never a rate, no adjectives. No prose outside the JSON."}'::jsonb,
  '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 6000, NULL, 'platform'),

 ('to-audit-intent', 'Audit Board', 'intent',
  'Review one night''s mechanical census of the board and return the fix verdicts, the judgment findings and the report.',
  E'Your task_context carries census (the mechanical pass''s JSON: measured_at, rate, fences, counts, backlog, and findings — each with backlog_id, check, verdict derivable | judgment, detail and, on a derivable one, the fix object naming the columns and values to write), window (the CST night) and prior (the open ticket_owner_findings rows as {backlog_id, check, first_seen_at}). (1) For every derivable finding confirm or refuse its fix against the column contract you hold — refuse when the fix would touch status, design_status or a quote, or when the row''s own story contradicts it; a refused fix is returned with apply false and a reason and becomes a judgment finding. (2) For every judgment finding write one plain sentence: what the row fails to tell and which capability decides it — by capability, never by an agent''s name. (3) Render the report in the three blocks, with "still open after N nights" read from prior. Return an empty fixes array rather than a doubtful one.',
  NULL, NULL,
  '{"schema":{"type":"object","required":["window","fixes","findings","report","account"],"properties":{"window":{"type":"string"},"fixes":{"type":"array","items":{"type":"object","required":["backlog_id","check","apply","reason"],"properties":{"backlog_id":{"type":"string"},"check":{"type":"string"},"apply":{"type":"boolean"},"reason":{"type":"string","maxLength":200}}}},"findings":{"type":"array","items":{"type":"object","required":["backlog_id","check","detail"],"properties":{"backlog_id":{"type":"string"},"check":{"type":"string"},"detail":{"type":"string","maxLength":300}}}},"report":{"type":"string","maxLength":6000},"account":{"type":"string","maxLength":100}}},"can_request_help":false}'::jsonb,
  '{"must":[],"must_not":[]}'::jsonb, '["structured-output"]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 6000, NULL, 'platform'),

 ('to-guardrails', 'Ticket Owner Guardrails', 'guardrails',
  NULL, NULL, NULL, 'Constraints every nightly pass must respect.',
  '{}'::jsonb,
  '{"must":["date-fence every check at the column''s birth and report the older rows once, as a count","classify every gap as derivable or judgment before anything is written","confirm a derivable fix only when the column contract itself yields the value","name the deciding capability for every judgment finding","render counts side by side, never a rate"],"must_not":["write status, done or delivered — a status is a verdict''s word or John''s","write design_status — NULL is not auto","mint a quote: never invent predicted_cycles or size_stamp","fix a ticket — only a cell whose value is derivable, under one reversible decision","name another agent in a row, a finding or the report","re-flag a row filed before the column it lacks existed"]}'::jsonb,
  '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 6000, NULL, 'platform');

INSERT INTO public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order) VALUES
 ('audit-board', 'to-identity', 2, true, 1),
 ('audit-board', 'to-knowledge-board', 2, true, 2),
 ('audit-board', 'to-behavior', 2, true, 3),
 ('audit-board', 'to-audit-intent', 2, true, 4),
 ('audit-board', 'to-guardrails', 2, true, 5);

COMMIT;
-- After applying, verify: select count(*) from capability_skill_profiles where capability_slug = 'audit-board' → 5;
-- select lane, is_active from agents where id = 'ticketowner' → governance, true; then add AVATAR_CFG.ticketowner and
-- AGENT_PRONOUNS.ticketowner (they/them/their, // FEATURE: AGT-79) in src/data/agents.js — the Governance section renders
-- from the live row (AGT-69). No handler: scripts/ticket-owner.js pass two (slice 2) is the writer, in-process.
```

## Test parts

`tests/regression/agt-79-ticket-owner.test.mjs` — `selfRun(import.meta.url, fn)` from `./_lib/self-run.js`; header `// DeepBench v7.0.474 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-79`. `F` = the parsed fixture; `run(over)` = `classifyBoard(over.board ?? F.board, {now: over.now ?? F.now, rate: over.rate ?? F.rate})`; `byCheck(r, c)` = the sorted `backlog_id`s of `r.findings` with `check === c`. Every arm that could pass vacuously carries a control that goes red on the mutation.

- **A — the census, pure.** `r = run({})`: `r.counts` deep-equals `{rows: 14, findings: 11, derivable: 4, judgment: 7}`; `byCheck` for each of the eleven slugs equals exactly: `quote-missing [QA-79-01]`, `size-missing []`, `cost-snapshot-missing [QA-79-03]`, `actual-unknown [QA-79-04]`, `claim-on-closed [QA-79-05]`, `claim-expired [QA-79-07]`, `verdict-missing [QA-79-08]`, `designed-closed [QA-79-14]`, `type-off-taxonomy [QA-79-12, QA-79-13]`, `delivered-unaccepted [QA-79-10]`, `cycles-over-quote [QA-79-14]`; the `QA-79-03` fix deep-equals `{cost_cycles_snapshot: 2, cost_pct_snapshot: 1, cost_snapshot_rate: 0.5, cost_snapshot_at: "2026-09-13T02:00:00.000Z"}` (`cost_snapshot_at` = `new Date(now).toISOString()`); the `QA-79-05` and `QA-79-07` fixes deep-equal `{claimed_by: null, claimed_at: null}`; the `QA-79-12` fix deep-equals `{type: "Feature"}`; `QA-79-13` has verdict `judgment` and no `fix`; `r.backlog` deep-equals `{quote_prefence: 1, size_prefence: 1, cost_prefence: 1, verdict_prefence: 1, unrevalidated_30d: 1, attended_actual_null: 2}`; every finding's `detail` is a non-empty string; findings are sorted by `CHECKS` index then `backlog_id`. Controls: (i) `QA-79-02` with `filed_at` and `created_at` set to `2026-09-10T00:00:00+00:00` → `quote-missing [QA-79-01, QA-79-02]`, `size-missing [QA-79-02]`, `quote_prefence 0`, `size_prefence 0`, `unrevalidated_30d 0`; (ii) `openCycles` with `{id: "cyc-dead"}` appended → `claim-expired []`, `counts.derivable 3`; (iii) `now = "2026-09-12T23:00:00Z"` → `delivered-unaccepted []`, `claim-expired [QA-79-07]` still; (iv) `rate = 0.444444444444444` → the `QA-79-03` fix has `cost_pct_snapshot 0.89`; (v) `QA-79-11` with `accepts` emptied → `delivered-unaccepted [QA-79-10, QA-79-11]`; (vi) `QA-79-05` with `status: "open"` (claim from 2026-09-01, holder not live) → `claim-on-closed []`, `claim-expired [QA-79-05, QA-79-07]`.
- **B — the render and the constants, pure.** `renderCensus(r, F.now)` equals itself on a second call; its first line starts `ticket-owner census 2026-09-13T02:00:00Z: 14 rows · 11 findings (4 derivable · 7 judgment) · behind the fences: quote 1 · size 1 · cost 1 · verdict 1 · unrevalidated>30d 1 · attended-actual null 2`; it has exactly 12 lines plus a trailing newline; the `size-missing` line ends with `—`; `renderCensus(run({board: {items: [], matrix: [], verdicts: [], accepts: [], decisions: [], openCycles: []}}), F.now)` still has 12 lines and reads `0 rows · 0 findings`. `CHECKS.length === 11` and `CHECKS[0] === "quote-missing"`, `CHECKS[10] === "cycles-over-quote"`; `TYPE_TAXONOMY` has 10 entries and includes `Tooling` and `Bug`; `Object.keys(TYPE_MAP)` deep-equals `["feature", "Bug Fixes"]`; `FENCES` deep-equals the four ISO strings in the kickoff §4.
- **C — the CLI over the fixture (spawn, no creds).** `node scripts/ticket-owner.js --board=tests/fixtures/agt-79/board.json --json` with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` deleted from the child env → exit 0, stdout parses to an object whose `counts` deep-equal A's and whose `measured_at` is `2026-09-13T02:00:00Z`; the same without `--json` → exit 0 and stdout equals `renderCensus(r, F.now)` byte-for-byte; `--census` with the same empty env → exit 2 and stderr names `SUPABASE_URL`; `--board=… --apply` → exit 2 and stderr contains `unknown flag`; `--board=<nonexistent>` → exit 2.
- **D — the seed file (source, always runs).** Read `docs/design/agt-79-ticket-owner-seed.sql`: contains `'ticketowner'` and `'audit-board'`; `/auditor|prioritizer|designer|builder|verifier|researcher|devmanager/i` has 0 matches (Rule #1 control: append `'designer'` to a copy in memory and the same regex matches); `'format'` 0 matches; `6000, NULL` exactly 5 matches and `6000, 0` 0 matches; `is_active` line carries `true` exactly once; the first 12 lines contain `HELD`; `'GV-08'` present and `'GV-07'` absent from any `VALUES` line (the comment may name it).
- **E — live (`SUPABASE_URL` + `SUPABASE_SERVICE_KEY`; `notRun("live census (part E)", …)` otherwise).** Count `backlog_items` (`select=id`, `Prefer: count=exact`, `Range: 0-0`) and `ticket_owner_findings` the same way → the latter is 0. Spawn `node scripts/ticket-owner.js --census --out=<tmp>/census.json --json` → exit 0; the JSON's `counts.rows ≥ 800`; `findings` filtered to `claim-on-closed` deep-equals one entry for `SES-141` with fix `{claimed_by: null, claimed_at: null}`; `cycles-over-quote` ids include `LOG-143` and `SES-245`; `type-off-taxonomy` derivable ids deep-equal `["SES-131", "SES-208"]`; `delivered-unaccepted` has ≥ 4 ids; `rate` is a number between 0.1 and 1; every `fix` on a `cost-snapshot-missing` finding satisfies `cost_pct_snapshot === Math.round(cost_cycles_snapshot * rate * 100) / 100`. Re-count both tables → `ticket_owner_findings` still 0 and `backlog_items` unchanged.

DRY-RUN against the tree before this ticket (v7.0.473): A, B fail at import (`classifyBoard`, `renderCensus`, `CHECKS`, `TYPE_TAXONOMY`, `TYPE_MAP`, `FENCES` do not exist); C fails at the first spawn (no such script); D fails (no such file); E fails at the `ticket_owner_findings` count (`PGRST205`).

## What this slice does not do

- It creates no agent, Skill or Capability row, registers no handler, runs no model, writes no `backlog_items` cell and no `ticket_owner_findings` row, touches no harness file, no `runner-cycle.md`, no `render-cycle-card.js`, no `render-standing-brief.js`, nothing under `.claude/`.
- It fixes none of the gaps it counts. `SES-141`'s stale claim, the 37 derivable cost stamps and the two `type` values stay as they are until slice 2's decision writes them with before-images.
- It does not decide step 4e's precondition wording or the brief block's exact shape (slice 3), nor the `record_decision` kind slice 2 uses (`ticket-scope` is the closest existing kind; a new `hygiene` kind is a one-line CHECK widening and John's call).

## Residue for the orchestrator (not the build's)

- Card items for John: (1) apply `docs/design/agt-79-ticket-owner-seed.sql` attended, with `record_decision` and before-images, and rule the code (`GV-07` per the ticket vs `GV-08` per the file; AGT-70's unapplied seed also holds `GV-07`); (2) `docs/FEATURES.md` §Type Taxonomy lists 8 types; the board's two largest — `Tooling` (250) and `Bug` (44) — are not among them, and `Admin` (4), `Automation` (3), `Loop` (1) have no home either: the taxonomy's one home is stale against its own board; (3) closing a ticket does not clear `design_status = 'designed'` — 28 closed rows carry it, 13 of them ships from the last three days; the ticket's guardrail says the owner never writes `design_status`, so either the close path clears it or `designed` is redefined as "was designed" — his call before slice 2 would touch it (it will not).
- `actual_tokens_attended` has never been written on any of 892 rows. Slice 2 cannot derive it; the attended session ceremony (`session-setup.md`) is the only place it could be captured, and that is a separate ticket.
- The runbook's step numbering: the ticket says "step 4d"; `4d` shipped as AGT-70's weekly audit in `v7.0.467`. Slice 3 adds `4e`, and its kickoff must say that `node scripts/render-cycle-card.js --write` runs and the regenerated card is committed in the same commit, and that `NOTES["4e"]` is added or the renderer exits 2.
