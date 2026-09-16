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


---

# AGT-79 — slice 2 of 3: the write pass, harvested

<!-- DeepBench v7.0.475 | docs/harvests/AGT-79.md (appended section) | Written by the Designer (design-kickoff, unattended cycle eb001bcd-66c9-4731-ae5b-3ee4d7ac5dd5, 2026-09-13). Overflow for docs/kickoffs/v7.0.475-AGT-79-ticket-owner-write-pass.md, linked once from its §1. The build reads this section ONLY at the four blocks the kickoff names: ## Slice 2 write sequence and ## Slice 2 decision text (§4, task 2), ## Slice 2 fixture rows and ## Slice 2 test parts (§4, task 3). The slice-1 blocks above are unchanged and still cited by v7.0.474's kickoff. Everything else here is reasoning. -->

## Premise revalidation (measured 2026-09-13 02:4xZ, live Supabase: `execute_sql` for catalog reads, the shipped census over PostgREST with the service key)

- **Slice 1 is live and the write pass is not.** `scripts/ticket-owner.js` at `b70ebadd` exports `classifyBoard`, `renderCensus`, `CHECKS`, `TYPE_TAXONOMY`, `TYPE_MAP`, `FENCES` and refuses `--apply` as an unknown flag (`ALLOWED_FLAGS = census, board, out, json`); `public.ticket_owner_findings` exists (9 columns, `ticket_owner_findings_open_one` partial unique index, FK `cycle_id → runner_cycles`), holds **0 rows**, and its `relacl` is `postgres=arwdDxtm, anon=m, authenticated=m, service_role=arwdDxtm` — no public read or write (migration `agt79_findings_no_public_read`, both directions asserted last cycle). `capabilities where slug = 'audit-board'` = 0; governance `agents` still `GV-01`..`GV-06`; the seed is a file.
- **The derivable cells are still unwritten.** `node scripts/ticket-owner.js --census` (exit 0, read-only): `855 rows · 210 findings (40 derivable · 170 judgment) · behind the fences: quote 526 · size 494 · cost 45 · verdict 97 · unrevalidated>30d 427 · attended-actual null 260`. Derivable by check: `cost-snapshot-missing` 37, `claim-on-closed` 1 (`SES-141`, `claimed_by design-briefing-redesign`, `claimed_at 2026-08-23T04:27Z`, `updated_at 2026-08-23T04:28Z`), `type-off-taxonomy` 2 (`SES-131` feature, `SES-208` Bug Fixes). SQL cross-check: closed rows with `cost_pct_snapshot` null, `updated_at ≥ 2026-09-01T16:41:41Z` and `ticket_matrix.actual_cycles > 0` = **37**; `runner_pct_per_cycle()` = 0.444444444444444. Judgment by check: quote-missing 3, size-missing 16, actual-unknown 63, verdict-missing 41, designed-closed 28, type-off-taxonomy 13, delivered-unaccepted 4, cycles-over-quote 2.
- **The instruments the write pass leans on, read from the catalog tonight, not from memory:** `record_decision(p_cycle_id uuid, p_session_name text, p_kind text, p_backlog_id text, p_summary text, p_reasoning text, p_ladder_work_class text default null) → uuid`; it raises unless exactly one of cycle/session is set, reads `runner_settings.reversal_window_hours` (72) and inserts the row with `expires_at = now() + 72h`. **`runner_decisions` has no CHECK on `kind`** — the six constraints are attribution, reversed-needs-stamps, `backlog_id ~ '^[A-Z]+-[0-9]+[a-z]?$'`, non-empty summary/reasoning, `status in (open, final, reversed)`; 14 kinds live (`classification` 576, `directive` 54, `ship` 50, `rollback` 6, `ticket-scope` 6, `ticket-status` 6, `gate` 5, `invention` 3, `learning` 2, and singletons). `reverse_decision(p_decision, p_actor, p_reason, p_actor_cycle default null)`: `k_allowed` = `backlog_items, runner_directives, runner_drain_scope, runner_settings, governance_rules, epics, vision_claims`; for a `backlog_items` image with non-null `row_data` it runs `update … set (<every non-generated column>) = (select … from jsonb_populate_record(null::backlog_items, row_data))` — **a partial image nulls every column it lacks**; it refuses (`refused_written_since`) any row whose live `updated_at > decided_at`; the reversal row's attribution is `p_actor_cycle` or, when null, `session_name = p_actor`. `runner_before_images`: `ck_before_image_attribution` (exactly one of `cycle_id` / `session_name`), `pk_value` and `table_name` not null, FKs to `runner_cycles` and `runner_decisions`. `backlog_items` triggers: only `backlog_done_requires_verdict` (BEFORE UPDATE OF status) — nothing writes `updated_at` on a PATCH that omits it. `backlog_items` NOT NULL without default: `backlog_id, tier, title, status, source_file, row_ordinal`; `ck_backlog_type_when_promoted` wants `type` unless `tier = 'later'`; `size_stamp in (S, M, L)`; `predicted_cycles ≥ 1`. No `ZZ%` rows exist tonight.
- **Premise alive.** Forty derivable cells sit one join away from their values, the ledger is empty, and every instrument the write needs exists and behaves as the kickoff states.

## The size ruling — what slice 2 is, and what it deliberately is not

Slice 1's harvest scoped slice 2 as "the write pass and the judgment run". Two facts found this cycle split that in half:

1. **The judgment run cannot run tonight without John.** `assemblePrompt({capability_slug: 'audit-board', …})` reads `capabilities`, `capability_skill_profiles` and `skill_profiles` live; all three have zero `audit-board` / `to-*` rows because the seed is gated (`.claude/rules/agent-roster-inert.md` bullet 3: a governance agent lands `is_active = true`, so the INSERT is an active-agent write). Hand-assembling the prompt from the seed file would be SES-331's forbidden second copy of the executor's assembly, and reading the Intent schema out of the SQL file would be a third home for it. So the two-pass `exit 3` shape (`rank-backlog.js`, `run-project.js`) is designed here only as a named remainder — `--judge`, pass one prints the assembled prompt with the census JSON as `task_context`, pass two validates the answer against the Intent's stored schema and hands `fixes[].apply = false` back as judgment findings — and built once the seed is applied.
2. **The API-dollar day cap is nearly spent** ($3.52 of $5, resetting 05:00Z). This slice makes **zero** model calls of any kind: the write pass is arithmetic, the column's own rule and a two-entry map, all computed by `classifyBoard()` already; the test is Node against Supabase; the Builder runs on subscription tokens.

So slice 2 = the write pass, proved on a rolled-back live fixture and then run once on the real board; slice 3 = step 4e + card + brief; the judgment run is a fourth item gated on the seed. Applying derivable fixes without a model's confirmation is what slice 1's harvest already ruled ("the census and the fixes need no model") and what the ticket's own DERIVABLE definition means: the value is held by another column, so there is nothing to judge. Every write is reversible by one call, and the worst wrong write is a cost stamp or a cleared claim, both re-derivable the next night.

## Governing architecture

- **§19b / Rule #1 (§19d, §19e):** the script reads and writes `backlog_items`, `runner_decisions`, `runner_before_images`, `ticket_owner_findings` as tables through one `rest()`; no row it writes names an agent (`p_summary` says "Ticket Owner", the capability's own display name, never another agent); the ledger's `detail` sentences are the census's, which name columns and values only.
- **§19v (reversibility, lane routing):** P10 tooling ships live. ONE `record_decision` row per night with fixes, `ladder_work_class` NULL so a nightly hygiene pass never promotes a class by streak; every `backlog_items` write imaged as the FULL row under that decision, so `reverse_decision()` restores every cell and answers `applied`; every ledger insert imaged with `row_data: null` (the SES-89 convention: a Reverse of a filing is a delete) attributed to the cycle, not the decision — see the decisions below for why. The handle line is printed in the runbook's exact words (`Decision <id> — reversible until <expires_at>: select public.reverse_decision(...)`) so slice 3's step 4e can copy it into `runner_cycles.notes`.
- **SES-316 (the written-since guard):** PostgREST cannot run a `DO` block, so the "one transaction" the runbook prescribes is replaced by its actual invariant — no write the decision makes may leave `updated_at > decided_at`. The PATCH body is the fix's columns only; `backlog_items` has no trigger that touches `updated_at`; the claim/release paths stopped writing it (SES-316). `agt-63-prioritizer.test.mjs` pins the same rule for `prioritizer-write.js`.
- **§19k:** no model call, no `ai_activity_log` row; the run is visible through its decision row and (slice 3) its cycle row.
- **`.claude/rules/supabase-column-grants.md` + SES-384:** no new table, so no grant to revoke; the only reader and writer is the service key; every read names its columns except the one deliberate `select=*` that builds a restorable image.
- **SES-376:** every number a task asserts is in the kickoff; the four byte-for-byte blocks live here under the names §4 cites.

## Design decisions, with the alternatives they beat

- **A REST sequence in the script, not a SQL function.** Alternative: `public.ticket_owner_apply(p_cycle_id, p_fixes jsonb)` doing decision + images + updates in one transaction. Rejected for this slice: it is a migration (down-capture, `SES-384`'s cousin for functions — `EXECUTE` is granted to `PUBLIC` by default, so the RPC would be callable with the anon key until revoked), it moves the write logic out of the file whose pure half already computes it, and the invariant the transaction buys (`updated_at = decided_at`) is obtained more simply by never writing `updated_at`. `audit-ledger.js` (before-image then insert, over REST) and `prioritizer-write.js` (decision, image, PATCH without `updated_at`) are the two shipped precedents; this follows both.
- **The image is the whole row, re-read with `select=*` immediately before the PATCH.** The census projection is 18 columns of 43; `reverse_decision()` populates every non-generated column from `row_data`, so imaging the projection would restore a row with 25 NULLs. The kickoff states this as the one place `select=*` is correct: the service key holds table-wide SELECT, and the point is completeness, not a column list.
- **One image per distinct row, even when a row carries two fixes** (a closed row can lack both a cost stamp and a clean claim). `reverse_decision()` restores from the OLDEST image under the decision, so a second image of the same row would be harmless but pointless; the sequence dedupes ids before the read and asserts the read returned exactly that many rows.
- **Judgment findings are NOT written under the decision.** The decision is "these cells were fixed"; a Reverse must undo exactly that and answer `applied`. `ticket_owner_findings` is outside `k_allowed`, so images pointing at it under the decision would be counted `refused` on every Reverse and the reason line would carry the "READ THE COUNTS" warning forever. Ledger inserts are imaged with `row_data: null` and the cycle's (or session's) attribution only — the `audit_findings` shape (`audit-ledger.js` 388-393). Re-seen (`last_seen_at`) and cleared (`cleared_at`) touches are the ledger's own bookkeeping and are not imaged: `first_seen_at` is never rewritten, and the row's history is its own three timestamps.
- **`kind = 'hygiene'`, not `ticket-scope`.** No CHECK constrains `kind`; `render-standing-brief.js` groups open decisions by `kind` (lines 971-995), so a nightly hygiene row under `ticket-scope` would be indistinguishable from a real scope ruling on John's card. A new word costs nothing and reads correctly.
- **`p_ladder_work_class` NULL.** `record_decision` finalises a NULL class without moving a rung; passing `ladder_work_class('P10 - Tooling')` would let 40 nightly cell fixes count toward P10's promotion streak — exactly the inflation the ladder's "one decision per real ruling" assumes away.
- **`p_backlog_id = 'AGT-79'`.** The decision needs a ticket for the brief's grouping and for `reverse_decision`'s `reason` line; the fixes span forty tickets, and naming the owner's own ticket is the honest join. The alternative — one decision per fixed row — is forty Reverse handles for one act, which the ticket's "ONE runner_decisions row" forbids.
- **No decision when there is nothing to fix.** An empty decision every quiet night is noise on John's card and a promotion-streak entry for nothing. The ledger still updates (`reseen` moves, `clear` sets) on such a night.
- **The fixture is live rows with a session attribution, not a `--board` file.** `--apply` never accepts `--board` (a fixture file is never written), so part G inserts four `ZZTO-79x` rows (the `ZZPRIOR-63` precedent), builds the board from a live projection of exactly those rows plus empty joins, and calls `applyPlan` in-process with `sessionName = 'agt-79-qa:<Date.now()>'`. The same string is the reversal's `p_actor`, so every row the test leaves — decision, reversal, images — shares one `session_name` and one `DELETE` each removes them. `ticket_owner_findings.cycle_id` is NULL on the session path; the FK allows it.
- **The live apply is a build task, once.** The proof that the pass works on the real board is the real board; the run is reversible for 72 hours by the handle the build reports, and the second run's `fixed 0 · +0` is the idempotence proof the ticket asks for. The nightly schedule is slice 3's.

## Slice 2 write sequence

`applyPlan(base, key, plan, { cycleId, sessionName, now })` — `plan` from `planWrites`; exactly one of `cycleId` / `sessionName` (else throw before any request); `A = { cycle_id: cycleId ?? null, session_name: sessionName ?? null }`; every request through the file's `rest()`; the module's `fail()` exits 2 on any non-2xx and the message names the step (`record_decision`, `image rows`, `patch <backlog_id>`, `image findings`, `insert findings`, `reseen`, `clear`) and `decision <id>` once one exists. `ids = [...new Set(plan.fixes.map(f => f.id))]`.

1. **Decision** — only if `plan.fixes.length > 0`: `POST rpc/record_decision` body `{ p_cycle_id: cycleId ?? null, p_session_name: sessionName ?? null, p_kind: 'hygiene', p_backlog_id: 'AGT-79', p_summary, p_reasoning, p_ladder_work_class: null }` (strings: `## Slice 2 decision text`) → `decision` (a uuid string). Then `GET runner_decisions?id=eq.<decision>&select=expires_at` → `expires_at`.
2. **Image the rows** — `GET backlog_items?id=in.(<ids>)&select=*` → `rows`; `rows.length` must equal `ids.length` else exit 2 (`image rows: read <n> of <m>`). `POST runner_before_images` body = `rows.map(r => ({ ...A, table_name: 'backlog_items', pk_value: r.id, row_data: r, decision_id: decision }))`, header `Prefer: return=minimal`.
3. **Patch** — for each fix in order: `PATCH backlog_items?id=eq.<fix.id>` body `fix.patch`, headers `Prefer: return=representation` → `[row]`; for every key `k` of `fix.patch`: `String(row[k] ?? null) === String(fix.patch[k] ?? null)` OR (both numeric and `Number(row[k]) === Number(fix.patch[k])`) OR (`k === 'cost_snapshot_at'` and `Date.parse(row[k]) === Date.parse(fix.patch[k])`) — else exit 2 (`patch <backlog_id>: <k> read <v>`). Never include `updated_at`.
4. **Ledger inserts** — if `plan.ledger.insert.length`: `POST runner_before_images` body = `insert.map(f => ({ ...A, table_name: 'ticket_owner_findings', pk_value: f.id, row_data: null }))` (no `decision_id`), then `POST ticket_owner_findings` body = `insert.map(f => ({ id: f.id, backlog_id: f.backlog_id, check_slug: f.check_slug, verdict: 'judgment', detail: f.detail, first_seen_at: now, last_seen_at: now, cycle_id: cycleId ?? null }))`.
5. **Ledger touches** — if `reseen.length`: `PATCH ticket_owner_findings?id=in.(<reseen>)` body `{ last_seen_at: now }`; if `clear.length`: `PATCH ticket_owner_findings?id=in.(<clear>)` body `{ cleared_at: now }`.

Returns `{ decision: decision ?? null, expires_at: expires_at ?? null, fixed: plan.fixes.length, inserted: insert.length, reseen: reseen.length, cleared: clear.length }`.

`planWrites(result, prior, items)`: `byId = new Map(items.map(i => [i.backlog_id, i.id]))`; `fixes = result.findings.filter(f => f.verdict === 'derivable').map(f => ({ backlog_id: f.backlog_id, id: byId.get(f.backlog_id), check: f.check, patch: f.fix }))` (a missing id throws — a fix without a pk is not a write); `key = f => f.backlog_id + ' ' + (f.check ?? f.check_slug)`; `tonight = new Set(judgment findings' keys)`; `priorKeys = new Set(prior keys)`; `insert` = judgment findings whose key is not in `priorKeys` → `{ id: randomUUID(), backlog_id, check_slug: check, verdict: 'judgment', detail }`; `reseen` = `prior.filter(p => tonight.has(key(p))).map(p => p.id)`; `clear` = `prior.filter(p => !tonight.has(key(p))).map(p => p.id)`.

CLI (`main()`): `ALLOWED_FLAGS` gains `apply` and `cycle-id`; `--apply` with `--board` → `fail('--apply writes the live board; a --board fixture is never written.')`; `--apply` without `--cycle-id=<uuid>` (36-char uuid) → `fail('--apply needs --cycle-id=<uuid> — every write is attributed to a cycle.')`; under `--apply`, after the census: `prior = await readAll(base, key, 'ticket_owner_findings', 'ticket_owner_findings?select=id,backlog_id,check_slug&cleared_at=is.null&limit=10000', 10000)`; `plan = planWrites(result, prior, board.items)`; `apply = await applyPlan(base, key, plan, { cycleId, now })`; `out.apply = apply`; stdout gains ONE line after `renderCensus`: `ticket-owner apply: fixed <fixed> · findings +<inserted> ~<reseen> −<cleared> · decision <id> — reversible until <expires_at>: select public.reverse_decision('<id>','John','<why>');` or, with no decision, `ticket-owner apply: fixed 0 · findings +<i> ~<r> −<c> · no decision (nothing to fix)`. With `--json` the JSON object (now carrying `apply`) is printed instead, as today.

## Slice 2 decision text

```
p_summary   = `Ticket Owner: ${fixes.length} derivable cell fix(es) on ${ids.length} row(s) — cost ${nCost} · claim ${nClaim} · type ${nType}`
p_reasoning = `Nightly census ${now}: ${counts.rows} rows read, ${counts.findings} findings (${counts.derivable} derivable, ${counts.judgment} judgment). Each fix is arithmetic (cost_pct_snapshot = round(actual_cycles × runner_pct_per_cycle(), 2) at rate ${rate}), the claim column's own rule (a closed row, or 24 h past with no live cycle), or a one-to-one type spelling (feature → Feature, Bug Fixes → Bug). Whole rows imaged under this decision; no status, quote or design_status written; judgment findings filed in ticket_owner_findings, not here. pattern:0`
```

`nCost` / `nClaim` / `nType` = fixes whose `check` is `cost-snapshot-missing` / `claim-on-closed` or `claim-expired` / `type-off-taxonomy`. `applyPlan` receives `counts` and `rate` through `plan.meta = { counts: result.counts, rate }` set by `planWrites`'s caller (the CLI and the test both pass `rate`); `planWrites(result, prior, items, { rate })` stores it. `pattern:0` is the runbook's "no standing pattern applied".

## Slice 2 fixture rows

Part G `POST backlog_items` body (one array, `Prefer: return=representation`); `T49 = new Date(Date.now() - 49 * 3600 * 1000).toISOString()` computed at run time; everything else literal. `source_file` and `row_ordinal` satisfy the NOT NULLs; `tier: 'later'` keeps the rows off every queue; `type: 'Tooling'` keeps them on-taxonomy.

```json
[
  { "backlog_id": "ZZTO-791", "tier": "later", "type": "Tooling", "priority_class": "P10 - Tooling", "status": "done",
    "title": "AGT-79 fixture: done row still claimed — inserted and deleted by agt-79-ticket-owner.test.mjs",
    "description": "Fixture. Never a real ticket.", "source_file": "tests/regression/agt-79-ticket-owner.test.mjs", "row_ordinal": 999791,
    "claimed_by": "zz-stale", "claimed_at": "2026-09-01T00:00:00+00:00", "predicted_cycles": 1, "size_stamp": "S",
    "cost_pct_snapshot": 0.44, "cost_cycles_snapshot": 1, "cost_snapshot_rate": 0.444444444444444, "cost_snapshot_at": "2026-09-10T00:00:00+00:00" },
  { "backlog_id": "ZZTO-792", "tier": "later", "type": "Tooling", "priority_class": "P10 - Tooling", "status": "delivered",
    "title": "AGT-79 fixture: delivered 49 h ago, never accepted — inserted and deleted by agt-79-ticket-owner.test.mjs",
    "description": "Fixture. Never a real ticket.", "source_file": "tests/regression/agt-79-ticket-owner.test.mjs", "row_ordinal": 999792,
    "predicted_cycles": 1, "size_stamp": "S", "cost_pct_snapshot": 0.44, "cost_cycles_snapshot": 1,
    "cost_snapshot_rate": 0.444444444444444, "cost_snapshot_at": "2026-09-10T00:00:00+00:00", "updated_at": "<T49>" },
  { "backlog_id": "ZZTO-793", "tier": "later", "type": "Tooling", "priority_class": "P10 - Tooling", "status": "open",
    "title": "AGT-79 fixture: open, quoted nothing — inserted and deleted by agt-79-ticket-owner.test.mjs",
    "description": "Fixture. Never a real ticket.", "source_file": "tests/regression/agt-79-ticket-owner.test.mjs", "row_ordinal": 999793,
    "size_stamp": "S" },
  { "backlog_id": "ZZTO-794", "tier": "later", "type": "Tooling", "priority_class": "P10 - Tooling", "status": "open",
    "title": "AGT-79 fixture: filed before the fences — inserted and deleted by agt-79-ticket-owner.test.mjs",
    "description": "Fixture. Never a real ticket.", "source_file": "tests/regression/agt-79-ticket-owner.test.mjs", "row_ordinal": 999794,
    "filed_at": "2026-08-01T00:00:00+00:00", "created_at": "2026-08-01T00:00:00+00:00", "updated_at": "2026-08-01T00:00:00+00:00" }
]
```

Expected classification of these four rows over an otherwise empty board (`matrix`, `verdicts`, `accepts`, `decisions`, `openCycles` all `[]`; `now` = the wall clock; `rate` 0.444444444444444): `counts {rows 4, findings 5, derivable 1, judgment 4}`; `claim-on-closed [ZZTO-791]` with fix `{claimed_by: null, claimed_at: null}`; `verdict-missing [ZZTO-791, ZZTO-792]`; `delivered-unaccepted [ZZTO-792]`; `quote-missing [ZZTO-793]`; `backlog {quote_prefence 1, size_prefence 1, cost_prefence 0, verdict_prefence 0, unrevalidated_30d 1, attended_actual_null 2}`. (791 and 792 carry a cost stamp so `actual-unknown` stays out of the way; 794 sits behind both filing fences and inside the 30-day count.)

## Slice 2 test parts

Same file, same helpers as parts A–E (`F`, `run`, `byCheck`, `only`, `spawnCli`, `restCount`); header becomes `// DeepBench v7.0.475 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-79 slices 1-2`; import `planWrites, applyPlan` alongside the existing six exports. Part C's `--apply` arm changes ONE assertion: `cApply.stderr.includes("never written")` replaces `includes("unknown flag")` (exit 2 unchanged). Everything else in A–E is byte-identical.

- **F — the plan, pure.** `r = run({})`; `P = [{id:'p1', backlog_id:'QA-79-01', check_slug:'quote-missing'}, {id:'p2', backlog_id:'QA-79-06', check_slug:'claim-expired'}, {id:'p3', backlog_id:'QA-79-03', check_slug:'cost-snapshot-missing'}]`; `plan = planWrites(r, P, F.board.items, { rate: F.rate })`. Assert: `plan.fixes.map(f => f.backlog_id)` deep-equals `["QA-79-03", "QA-79-05", "QA-79-07", "QA-79-12"]`; their `id`s end `…0003, …0005, …0007, …0012` (the fixture uuids); each `patch` deep-equals the corresponding finding's `fix` (the four objects part A already pins); `plan.ledger.insert` has 6 entries whose `[backlog_id, check_slug]` pairs, sorted, deep-equal `[["QA-79-04","actual-unknown"],["QA-79-08","verdict-missing"],["QA-79-10","delivered-unaccepted"],["QA-79-13","type-off-taxonomy"],["QA-79-14","cycles-over-quote"],["QA-79-14","designed-closed"]]`, every `id` matches `/^[0-9a-f-]{36}$/`, every `verdict === 'judgment'`, every `detail` is a non-empty string; `plan.ledger.reseen` deep-equals `["p1"]`; `plan.ledger.clear` deep-equals `["p2", "p3"]`; `plan.meta.counts` deep-equals `r.counts` and `plan.meta.rate === 0.5`. Controls: (i) empty board (`run({board: {items: [], matrix: [], verdicts: [], accepts: [], decisions: [], openCycles: []}})`) with the same `P` → `fixes []`, `insert []`, `reseen []`, `clear ["p1","p2","p3"]`; (ii) `P` with a fourth entry `{id:'p4', backlog_id:'QA-79-04', check_slug:'actual-unknown'}` → `insert` has 5 entries and `reseen` deep-equals `["p1","p4"]`; (iii) `planWrites(r, [], [])` (no items) throws, message includes `QA-79-03`; (iv) `applyPlan('x', 'y', plan, {})` and `applyPlan('x', 'y', plan, {cycleId: 'a', sessionName: 'b'})` both reject before any fetch (assert with `assert.rejects`, message includes `exactly one`).
- **G — live, rolled back** (after E; same credential gate — `notRun("write pass (part G)", …)` without creds). `S = \`agt-79-qa:${Date.now()}\``; `now = new Date().toISOString()`; `H`/`rest` as in E. `try {` (1) `DELETE backlog_items?backlog_id=like.ZZTO-79*` (a stale run's residue), then `POST backlog_items` with the `## Slice 2 fixture rows` array (`T49` substituted) → `inserted` (4 rows); `id791 = inserted.find(r => r.backlog_id === 'ZZTO-791').id`, `upd791 = …updated_at`. (2) `readFixture = () => rest('backlog_items?backlog_id=like.ZZTO-79*&order=backlog_id&select=' + <the census projection's 18 columns, verbatim from readBoard()>)`; `board = { items: await readFixture(), matrix: [], verdicts: [], accepts: [], decisions: [], openCycles: [] }`; `r1 = classifyBoard(board, { now, rate: 0.444444444444444 })`; assert `r1.counts` deep-equals `{rows: 4, findings: 5, derivable: 1, judgment: 4}` and `byCheck(r1, 'claim-on-closed')` deep-equals `["ZZTO-791"]`. (3) `plan1 = planWrites(r1, [], board.items, { rate: 0.444444444444444 })`; assert `plan1.fixes.length === 1`, `plan1.fixes[0].id === id791`, `plan1.ledger.insert.length === 4`. (4) `res1 = await applyPlan(url, key, plan1, { sessionName: S, now })`; assert `res1.fixed === 1`, `res1.inserted === 4`, `res1.reseen === 0`, `res1.cleared === 0`, `typeof res1.decision === 'string'`, `typeof res1.expires_at === 'string'`. (5) `after = (await readFixture()).find(r => r.backlog_id === 'ZZTO-791')`: `claimed_by === null`, `claimed_at === null`, `status === 'done'`, `updated_at === upd791` (SES-316: the write must not bump it); `ZZTO-792.status === 'delivered'`; `ZZTO-793.predicted_cycles === null`. `dec = (await rest(\`runner_decisions?id=eq.${res1.decision}&select=kind,backlog_id,session_name,cycle_id,ladder_work_class,status,summary,reasoning\`))[0]`: `kind 'hygiene'`, `backlog_id 'AGT-79'`, `session_name S`, `cycle_id null`, `ladder_work_class null`, `status 'open'`, `summary` starts `Ticket Owner: 1 derivable cell fix(es) on 1 row(s)`, `reasoning` includes `pattern:0`. `imgs = await rest(\`runner_before_images?decision_id=eq.${res1.decision}&select=table_name,pk_value,row_data\`)`: length 1, `table_name 'backlog_items'`, `pk_value === id791`, `row_data.claimed_by === 'zz-stale'`, `typeof row_data.title === 'string'` (the FULL row). `nullImgs = await rest(\`runner_before_images?session_name=eq.${encodeURIComponent(S)}&table_name=eq.ticket_owner_findings&select=pk_value,row_data,decision_id\`)`: length 4, every `row_data === null` and `decision_id === null`. `led = await rest('ticket_owner_findings?backlog_id=like.ZZTO-79*&order=backlog_id,check_slug&select=id,backlog_id,check_slug,verdict,first_seen_at,last_seen_at,cleared_at,cycle_id')`: `map(x => [x.backlog_id, x.check_slug])` deep-equals `[["ZZTO-791","verdict-missing"],["ZZTO-792","delivered-unaccepted"],["ZZTO-792","verdict-missing"],["ZZTO-793","quote-missing"]]`; every `verdict 'judgment'`, `cleared_at null`, `cycle_id null`, `first_seen_at === last_seen_at` (as instants). (6) **Second night, unchanged board.** `now2 = new Date(Date.now() + 1000).toISOString()`; `board2 = { ...board, items: await readFixture() }`; `r2 = classifyBoard(board2, { now: now2, rate: 0.444444444444444 })`; assert `r2.counts.derivable === 0` and `r2.counts.findings === 4`; `plan2 = planWrites(r2, led.map(x => ({ id: x.id, backlog_id: x.backlog_id, check_slug: x.check_slug })), board2.items, { rate: 0.444444444444444 })`; assert `fixes []`, `insert []`, `reseen.length 4`, `clear []`; `res2 = await applyPlan(url, key, plan2, { sessionName: S, now: now2 })` → `{ decision: null, expires_at: null, fixed: 0, inserted: 0, reseen: 4, cleared: 0 }` (deep-equal); `(await rest(\`runner_decisions?session_name=eq.${encodeURIComponent(S)}&select=id\`)).length === 1`; re-read `led2`: every `last_seen_at` later than its `first_seen_at`, `cleared_at` still null, ids unchanged. (7) **Clear control, pure only:** `planWrites(r2, [...prior, { id: 'ghost', backlog_id: 'ZZTO-791', check_slug: 'claim-on-closed' }], board2.items, { rate })`.ledger.clear deep-equals `["ghost"]`. (8) **Reverse.** `rev = (await rest('rpc/reverse_decision', { method: 'POST', body: JSON.stringify({ p_decision: res1.decision, p_actor: S, p_reason: 'fixture rollback' }) }))[0]`: `outcome 'applied'`, `restored 1`, `refused 0`, `refused_written_since 0`, `typeof reversal_id === 'string'`; `ZZTO-791` re-read: `claimed_by === 'zz-stale'`, `Date.parse(claimed_at) === Date.parse('2026-09-01T00:00:00+00:00')`, `status 'done'`. `passed = true`. `} finally {` in this order, each `.catch(() => {})`: `DELETE ticket_owner_findings?backlog_id=like.ZZTO-79*`; `DELETE runner_before_images?session_name=eq.<S>`; `DELETE runner_decisions?session_name=eq.<S>&kind=eq.reversal`; `DELETE runner_decisions?session_name=eq.<S>`; `DELETE backlog_items?backlog_id=like.ZZTO-79*`. `}` Then, only if `passed`: the four counts (`ticket_owner_findings` and `backlog_items` by `like.ZZTO-79*`, `runner_before_images` and `runner_decisions` by `session_name=eq.<S>`) are each 0 — asserted with `restCount`-style `Prefer: count=exact` reads.

DRY-RUN against the tree before this slice (v7.0.474): the import of `planWrites`/`applyPlan` fails, so A–G all fail at module load; run part C's mutated arm alone against the old script and it fails on `never written` (the old stderr says `unknown flag`).

## What this slice does not do

- It runs no model, assembles no prompt, creates no agent/Skill/Capability row, registers no handler, touches no harness file, no `runner-cycle.md`, no `render-cycle-card.js`, no `render-standing-brief.js`, nothing under `.claude/`, and applies no migration.
- It does not write `runner_cycles.notes` (the handle line is printed; step 4e — slice 3 — copies it), does not write anything on `AGT-79`'s own row, and does not mark the ticket.
- It does not confirm or refuse a derivable fix by judgment; every fix `classifyBoard` computes is written. The `--judge` pass that lets the Skills refuse a fix is the gated remainder.

## Residue for the orchestrator (not the build's)

- **Card items for John:** (1) apply `docs/design/agt-79-ticket-owner-seed.sql` attended (unchanged from slice 1's card) — until then the judgment run cannot be built; (2) after the live apply, the first `hygiene` decision appears on the brief's open-decisions list with its 72-hour handle — that is the ticket's design working, not a defect; (3) slice 1's two taxonomy/design_status card items stand.
- **Slice 3 facts the next Designer needs:** step `4e`, not `4d` (`4d` is AGT-70's weekly audit); a runbook edit means `node scripts/render-cycle-card.js --write` in the same commit and a `NOTES["4e"]` entry or the renderer exits 2; the step's precondition reads `runner_cycles.notes like 'SCHEDULED-AGENT: audit-board%'` with `ended_at` in the current America/Chicago day (the 4c shape); the brief block reads `ticket_owner_findings` open counts by `check_slug` and the night's `hygiene` decision, `undefined` = not read, never zeros; the "joins OFF_BENCH_AGENT_IDS" clause in the ticket is moot (AGT-69: governance agents render from the live `lane = 'governance'` row).
- **The judgment run (`--judge`), gated on the seed:** two-pass exit 3 through `assemblePrompt({ capability_slug: 'audit-board', agent_id: 'ticketowner', tenant_id: 'global', intent_slug: 'to-audit-intent', task_context: { census, window, prior } })`, pass two validates with `validateAgentVerdict(state.schema, answer)` and turns `fixes[].apply === false` into judgment findings before `applyPlan`; the audit row through `scripts/agent-log.js` (SES-331). Its kickoff must re-measure `capabilities where slug = 'audit-board'` = 1 first.
- **Two small findings, filed as facts not tickets:** `TYPE_TAXONOMY`'s comment in `scripts/ticket-owner.js` says `Tooling (235 rows) and Bug (43)`; the live census says 250 and 44 — a stale comment, not a defect. `runner_decisions.kind` has no CHECK constraint at all; the runbook's `-- kind:` comment lists seven values and the live table holds fourteen — whether that wants a CHECK is a discovery question, not this ticket's.


---

# AGT-79 — slice 3 of 3: the landing, harvested

<!-- DeepBench v7.0.477 | docs/harvests/AGT-79.md (appended section) | Written by the Designer (design-kickoff, unattended cycle a8434575-ff7d-4d43-b547-572f8d5e61e2, 2026-09-13). Overflow for docs/kickoffs/v7.0.477-AGT-79-ticket-owner-nightly-landing.md — the measurements, the alternatives and the byte-for-byte blocks the kickoff's tasks name. Not required reading for the build except where a task names a block here by its `## Slice 3 …` heading. -->

## Premise revalidation (measured 2026-09-13 04:0xZ, live Supabase over PostgREST with the service key; files read in the clone at `bc58ea34`)

- **Slices 1-2 are live; the landing is not.** `scripts/ticket-owner.js` (header `v7.0.475`) exports `classifyBoard, renderCensus, planWrites, applyPlan, CHECKS, TYPE_TAXONOMY, TYPE_MAP, FENCES`; `ALLOWED_FLAGS = census, board, out, json, apply, cycle-id` — no nightly mode, no cycle-row write. `--apply --cycle-id` attributes the decision to the cycle you name and prints the handle line; nothing records the run as a row of its own.
- **No nightly step exists.** `docs/runbooks/runner-cycle.md` (369,470 B, 4,462 lines) parses to **26** steps; `4d` (AGT-70's weekly audit) is at line 1931 and `**5. Pick ONE item.**` at 1964; there is no `4e`. `scripts/render-cycle-card.js` `NOTES` has 26 keys and no `"4e"`; `docs/runbooks/cycle-card.md` is 7,678 B (cap 10,240; floor 5,120). `tests/regression/agt-70-auditor.test.mjs` line 965 pins `labels.length === 26` (and says so at lines 4 and 1427) — a new step reds it until that number is 27. The runbook header carries exactly **5** stamps (`v7.0.472`, `.467`, `.462`, `.459`, `.452`) and `ses-297-pre-boot-pickability.test.mjs` caps it at 5; the previous rotation (`v7.0.446`) sits in `docs/SESSIONS.md` at line 13704 directly after the `v7.0.438` stamp, with `v7.0.452` (2,870 B, `SES-352`) being line 5 and therefore the one to rotate.
- **No brief group exists.** `scripts/render-standing-brief.js` has zero occurrences of `hygiene`, `ticket_owner_findings` or `Ticket hygiene`; `fetchFacts()` returns `{ items, settings, drain, decisions, census, johnModel, inventionUse, served, governance, audit }`; `renderBlock()` pushes `renderAuditLedger(audit, stamp)` last before the Provenance line (lines 1041-1050). The only place the hygiene decision appears today is the `Open decisions` list (`standing-brief.md` line 163: `77afdcbc · hygiene · AGT-79 · Ticket Owner: 40 derivable cell fix(es) …`).
- **The tables the group will read, tonight:** `ticket_owner_findings` holds **170** rows, all open (`cleared_at` null), all with `first_seen_at = 2026-09-13T03:31:46.538Z` and `cycle_id = eb001bcd…`; by `check_slug`: actual-unknown 63, verdict-missing 41, designed-closed 28, size-missing 16, type-off-taxonomy 13, delivered-unaccepted 4, quote-missing 3, cycles-over-quote 2. `runner_decisions where kind = 'hygiene'` = **1** (`77afdcbc-32dc-4505-bfda-724acc1f8b07`, status `open`, `expires_at 2026-09-16T03:31:48Z`, 40 `runner_before_images` under it). `runner_cycles where notes like 'SCHEDULED-AGENT: audit-board%'` = **0**; the `rank-backlog` rows (6) show the 4c shape a nightly row must take: `trigger 'scheduled'`, `stamp 'session rank-backlog (in cycle <parent>)'`, `outcome 'shipped' | 'did_not_run' | 'failed'`, `notes` = prefix + ` — ` + the run's own sentence with the decision id. `model` is non-null on all 446 cycle rows. `runner_model_lanes`: orchestrator `claude-opus-5`, mechanical `claude-sonnet-5`, judgment `claude-fable-5-1`.
- **Premise alive.** The census and the write pass exist and are proven; nothing fires them nightly, nothing records the night, and John's page shows the decision but not the findings.

## The size ruling — what slice 3 is, and what it deliberately is not

Slice 2's residue named slice 3 exactly: step `4e` + `NOTES["4e"]` + the regenerated card in one commit, plus the brief block. One fact found this cycle widens it by one small piece and narrows it by one: the ticket's own QA (the tail of `runner_cycles` shows one row per night under `SCHEDULED-AGENT: audit-board`) needs the script to WRITE that row — nothing else can, because the row's notes carry the census line and the four counts only the script knows. So `--nightly` is in: the precondition, the run, the cycle row, in `scripts/ticket-owner.js`. Out, as before: the `--judge` judgment run (`capabilities where slug = 'audit-board'` is still 0 — the seed is John's to apply, `.claude/rules/agent-roster-inert.md`), any roster/Skill/Capability row, any migration, and any model call. The day cap stands at $3.52 of $5 (America/Chicago, resets 05:00Z); this slice spends $0 on that track — every task is Node, SQL-over-REST and docs on the Builder's subscription tokens.

## Governing architecture

- **§19v (operations, reversibility):** the runbook is the one home of the procedure and the card is its generated view (`SES-377`); a new step is three edits in one commit or the suite is red. The nightly row makes the run visible in the record the way 4c's is; every cell write stays under slice 2's one `hygiene` decision with full-row images; `--nightly` adds no new write to `backlog_items`.
- **§19b / Rule #1 (§19d, §19e):** `ticket_owner_findings`, `runner_decisions`, `runner_cycles` are read and written as tables through one `rest()`; the cycle row names a capability's display name (`audit-board` in the prefix, the 4c convention) and no agent; the brief group prints table rows and never a rule of its own.
- **§19k:** no model call, no `ai_activity_log` row; the run is visible through its cycle row and decision.
- **`.claude/rules/supabase-column-grants.md`:** every new read names its columns; no new table, no grant change.
- **SES-376:** every number a task asserts is in the kickoff; the byte-for-byte blocks live here under the headings §4 names.

## Design decisions, with the alternatives they beat

- **The script writes its own cycle row (`--nightly`), not the runbook by hand.** Alternative: the step tells the cycle to `INSERT INTO runner_cycles …` before and `UPDATE … notes` after. Rejected: the notes need the census line and the apply counts, which only the process has; a hand-copied line is the second home the runbook's own `SES-164` history warns about, and `rank-backlog.js` `writeCycle()` (lines 235-252) is the shipped precedent for a script recording itself as a `trigger = 'scheduled'` row inside a parent cycle.
- **The precondition lives in the script and is stated in the runbook.** 4c states its precondition as prose and leaves the check to the cycle; 4d gives SQL. Here the script does the check itself (one GET for the newest `audit-board` row, one pure `sameChicagoDay`), so running the command IS the check and a cycle cannot fire twice by mis-reading a date. The runbook still states the rule so the card line carries the verdict.
- **America/Chicago by `toLocaleDateString("en-CA", { timeZone })`, never a UTC offset.** CDT midnight is 05:00Z, CST midnight 06:00Z; a hard-coded offset is wrong for half the year. The brief already keys days this way (line 970). Pinned at four fixed instants in the test.
- **`model` on the nightly row is the PARENT cycle's model, read live.** `rank-backlog.js` writes the literal `claude-fable-5-1` because it calls that model; this pass calls none, and the honest value is the session that ran it. `model` is non-null on every live row, so `null` is not tried.
- **`outcome 'shipped'` on every completed run, `0` fixes included.** A night with nothing to fix still moved the ledger (re-seens, clears) and produced a census; `did_not_run` is reserved for the precondition path, which writes no row at all (the row that already exists is the record). Exit 2 writes no row: a session IS the crash evidence (rank-backlog's words).
- **The brief reads the cycle row's notes verbatim for the census line.** Alternative: recompute fence counts in the brief. Rejected: a second home for the eleven checks and four fences. The census computes, the cycle row records, the brief displays — one home each.
- **`renderTicketHygiene(hygiene, stamp, nowIso)` takes the clock as a third argument.** "Nights open" needs a now; the siblings need none. Pure by construction (the clock is an argument, `SES-177b`'s rule), and the sha payload excludes it, so `--check` sees no drift from a day passing.
- **The sha carries open counts by check, the decision's id+status and the run's id+ended_at.** A finding cleared, a night run, a decision finalised each move it; a re-seen touch does not (its count is unchanged), and that is correct: nothing John reads changed.
- **`agt-70-auditor.test.mjs` 26 → 27 is a fact update, not a loosening.** The pin exists to catch an accidental step marker; this step is deliberate and its own test pins 27 the same way.
- **The retiring stamp's zero-hit facts are RELOCATED into step 4a's body, not left to `docs/SESSIONS.md` alone** — `SES-164` step 2, the `v7.0.467` precedent. Measured this cycle by grep over the runbook body (line 5 excluded), `docs/` and `scripts/`: `trg_anchor_green_from_ci` 2 body hits, `ses352_green_anchor_from_ci` 1, `rangeIsCodeOnly` 0 body / 1 script / 2 docs, `0125a062` 3 docs, `af981b16` 2 docs; **zero hits anywhere** for `trg_prune_runner_green_states`, the "81 greens with no anchor, 63 newer than the newest anchor" measurement, and the rejected callers (`verifier.js`, `record_ship_decision()`). Those three go into the paragraph below; the build re-greps before moving and drops any sentence that has since found a home.

## Slice 3 step 4e

Insert byte-for-byte between the line `never this cycle's build.` that ends step 4d (line 1962 at `bc58ea34`) and `**5. Pick ONE item.**`, keeping one blank line on each side (the outer fence here is four backticks only so the step's own three-backtick block survives inside it):

````
<!-- FEATURE: AGT-79 slice 3 — the Ticket Owner's nightly pass fires here; the census classifies, the write pass fixes cells under one decision, the cycle row is the record. -->
**4e. Ticket hygiene — once per CST night, before selection (`AGT-79` slice 3, `v7.0.477`).** The Ticket
Owner's pass (`scripts/ticket-owner.js`, `v7.0.474`-`475`) fires on the first cycle of the America/Chicago
day that passes the walls — the step-4c shape. Precondition: no `runner_cycles` row whose `notes` start
`SCHEDULED-AGENT: audit-board` has an `ended_at` in the current America/Chicago day. The script checks
this itself, so running the command IS the check:

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/ticket-owner.js --nightly --cycle-id=<your cycle id>
```

`already run today` on exit 0 is the precondition answered — go to step 5. Otherwise one run reads the
whole board once, writes every DERIVABLE fix (a cost stamp from `ticket_matrix`, a stale claim cleared, a
one-to-one type spelling) under ONE `kind = 'hygiene'` decision with full-row before-images, files the
JUDGMENT gaps in `ticket_owner_findings` (new rows inserted, re-seen rows touched, closed gaps cleared),
and records itself as one `trigger = 'scheduled'` cycle row whose `notes` carry the census line, the four
counts and the decision handle. Three rules, none tunable here: (1) it never writes `status`,
`predicted_cycles` or `design_status` — a verdict's, a quote-owner's and a designer's words; (2) no model
is called — the pass is arithmetic and the column's own rule, on this session's subscription tokens;
(3) exit **2** is a refusal and names the step that stopped — write it in `notes` and **continue to step 5
normally**; the hygiene pass is bookkeeping, never this cycle's build. The decision's handle appears on the
standing brief's `Open decisions` and `Ticket hygiene, last night` groups for the reversal window; one
`reverse_decision()` restores every cell.
````

(The inner fence is the step's only block, 107 bytes, so the card carries it in full under `block: 1`.)

## Slice 3 runbook stamp

New line 1 of `docs/runbooks/runner-cycle.md`, one line, replacing nothing (line 5's `v7.0.452` stamp moves out — see the kickoff):

```
<!-- DeepBench v7.0.477 | runbooks/runner-cycle.md | AGT-79 slice 3 — NEW STEP 4e: THE TICKET OWNER'S NIGHTLY PASS FIRES ON THE FIRST CYCLE OF THE AMERICA/CHICAGO DAY THAT PASSES THE WALLS, and the thing to read twice is that the PRECONDITION IS THE COMMAND — `ticket-owner.js --nightly` reads the newest `SCHEDULED-AGENT: audit-board` cycle row itself and answers `already run today` on exit 0, so a cycle never compares dates by hand (CDT midnight is 05:00Z and CST midnight 06:00Z; the script keys the day with `toLocaleDateString("en-CA", { timeZone: "America/Chicago" })`, never an offset). Measured 2026-09-13 before the edit: 0 such rows, 170 open `ticket_owner_findings`, one `hygiene` decision (`77afdcbc`) with 40 images. THE STEP WRITES CELLS AND THAT IS SLICE 2'S DESIGN, NOT THIS STEP'S: every derivable fix lands under ONE `kind = 'hygiene'` decision with FULL-ROW before-images (`reverse_decision()` rewrites every column from the image), no PATCH names `updated_at` (SES-316), and `status` / `predicted_cycles` / `design_status` are never written. The run records itself as a `trigger = 'scheduled'` cycle row in the parent cycle (the `rank-backlog.js` `writeCycle()` shape) whose `notes` carry the census line, `fixed n · findings +i ~r −c` and the decision handle — the standing brief's `Ticket hygiene, last night` group prints that row verbatim rather than recomputing a fence. Stamp count held at 5 per session-hygiene check 7: `v7.0.452` (`SES-352`) moved VERBATIM to `docs/SESSIONS.md` directly after the `v7.0.446` (`SES-346`) line; `SES-164` step 2 run FIRST by grep — `trg_anchor_green_from_ci` and `ses352_green_anchor_from_ci` have body homes in step 4a, `rangeIsCodeOnly` lives in `scripts/rollback-on-red.js`, but the retention-50 prune of the backfill (`trg_prune_runner_green_states`), the 2026-09-11 measurement (81 greens with no anchor, 63 newer than the newest) and the two rejected anchor writers had ZERO hits, so they were RELOCATED to the end of step 4a rather than lost to the rotation. THE COUPLING STANDS: this file has a GENERATED VIEW, `docs/runbooks/cycle-card.md` (`SES-377`), so this step is three things in ONE commit — `NOTES["4e"]` in `scripts/render-cycle-card.js`, `node scripts/render-cycle-card.js --write`, the regenerated card. Doc + 3 scripts + 2 tests; no `src/`/`api/`/`lib/` change, no schema change, no migration, no site change, no model call. -->
```

## Slice 3 relocation paragraph

Append to the END of step 4a's body — directly above the `**4a-bis.` marker (and above any `<!-- FEATURE` comment immediately preceding it), one blank line on each side. Grep each fact first; drop a sentence whose fact has a body home:

```
**RELOCATED HERE FROM THE RETIRING `v7.0.452` STAMP (`SES-352`) BY `SES-164` STEP 2, because these were the
facts that stamp carried with ZERO hits in this body, `docs/`, or `scripts/`.** (1) The `SES-352` backfill
of `runner_green_states` (189 rows, all verified `dev` ancestors) was PRUNED ON THE WAY IN by
`trg_prune_runner_green_states` — retention is 50 and there were 91 green `dev` conclusions — so the
oldest greens, including `77cca03a`, are not in the table; the surviving invariant is that ZERO retained
anchors carry a NULL or non-conclusion-time watermark. (2) The measurement that motivated the trigger,
2026-09-11: 81 all-success CI conclusions had no anchor at all, 63 of them newer than the newest anchor
(`0125a062`, 2026-09-02), because this step recorded a green only when a cycle was up at that minute.
(3) `scripts/verifier.js` (verdict-only, writes exactly one row) and `record_ship_decision()` (runs before
CI has concluded) were both considered as anchor writers and rejected — the anchor is CI's own conclusion.
```

## Slice 3 nightly

`scripts/ticket-owner.js`, header `v7.0.477`, `AGT-79 slices 1-3`. Existing exports unchanged; new exports `censusLine`, `sameChicagoDay`, `nightlyNotes`, `NIGHTLY_PREFIX = "SCHEDULED-AGENT: audit-board"`.

- `censusLine(result)` → the string renderCensus's first line carries after `ticket-owner census <iso>: ` — `${c.rows} rows · ${c.findings} findings (${c.derivable} derivable · ${c.judgment} judgment) · behind the fences: quote ${b.quote_prefence} · size ${b.size_prefence} · cost ${b.cost_prefence} · verdict ${b.verdict_prefence} · unrevalidated>30d ${b.unrevalidated_30d} · attended-actual null ${b.attended_actual_null}`. `renderCensus` builds its first line as `` `ticket-owner census ${nowIso}: ${censusLine(result)}` `` — byte-identical output (part B's byte-stability arm is the proof).
- `sameChicagoDay(aIso, bIso)` → `new Date(aIso).toLocaleDateString("en-CA", { timeZone: "America/Chicago" }) === new Date(bIso).toLocaleDateString(…same…)`; throws on an unparseable date.
- `nightlyNotes(line, applied)` → `` `${NIGHTLY_PREFIX} — ${line} · fixed ${applied.fixed} · findings +${applied.inserted} ~${applied.reseen} −${applied.cleared}` `` + (`applied.decision` ? `` ` · decision ${applied.decision} — reversible until ${applied.expires_at}` `` : ` · no decision (nothing to fix)`).
- CLI: `ALLOWED_FLAGS` gains `nightly`; the unknown-flag message names it. `--nightly` implies `--census --apply` (both may also be passed; `--board` with it hits the existing `never written` refusal; a missing `--cycle-id` hits the existing gate, whose message becomes `--apply/--nightly needs --cycle-id=<uuid> — every write is attributed to a cycle.`). Under `--nightly`, after the credential check and before `readRate`: `startedAt = new Date().toISOString()`; `prev = await rest(base, key, "runner_cycles?select=id,ended_at&notes=like." + encodeURIComponent(NIGHTLY_PREFIX + "%") + "&ended_at=not.is.null&order=ended_at.desc&limit=1")`; if `prev[0]` and `sameChicagoDay(prev[0].ended_at, startedAt)` → stdout `ticket-owner nightly: already run today (America/Chicago) — cycle ${prev[0].id} ended ${prev[0].ended_at}; board not read, nothing written\n`, exit 0. Otherwise the census and the write pass run exactly as `--census --apply` do today; then `recordNightly(base, key, { cycleId, startedAt, line: censusLine(result), applied })`: `GET runner_cycles?id=eq.<cycleId>&select=model` → exactly one row else `fail("record cycle: parent cycle <id> not found")`; `POST runner_cycles` body `{ started_at: startedAt, ended_at: new Date().toISOString(), stamp: \`session ticket-owner (in cycle ${cycleId})\`, trigger: "scheduled", model: parent.model, outcome: "shipped", item_id: null, notes: nightlyNotes(line, applied) }`, `Prefer: return=representation`, label `record cycle` → `[row]`; `out.nightly = { cycle: row.id, notes: row.notes }`; stdout (non-`--json`) gains ONE line after the apply line: `ticket-owner nightly: cycle ${row.id} recorded\n`. Exit 2 anywhere before the POST writes no cycle row.

## Slice 3 brief group

`scripts/render-standing-brief.js`, header stamp `v7.0.477 | AGT-79 slice 3`. `fetchFacts()` after the `audit` reads: `hygOpen = await rest(url, key, "ticket_owner_findings?select=check_slug,first_seen_at&cleared_at=is.null&order=check_slug,first_seen_at&limit=10000")` (non-array → `die`); `hygDec = await rest(url, key, "runner_decisions?select=id,status,summary,expires_at,decided_at&kind=eq.hygiene&order=decided_at.desc&limit=1")`; `hygRun = await rest(url, key, "runner_cycles?select=id,ended_at,outcome,notes&notes=like." + encodeURIComponent("SCHEDULED-AGENT: audit-board%") + "&ended_at=not.is.null&order=ended_at.desc&limit=1")`; `hygiene = { open: hygOpen, decision: hygDec[0] ?? null, run: hygRun[0] ?? null }`; returned alongside `audit`. `renderBlock` destructures `hygiene` and pushes `renderTicketHygiene(hygiene, stamp, nowIso)` directly after `renderAuditLedger`, before Provenance. `factsSha` adds `hygiene: facts.hygiene ? { open: <[check_slug, count] pairs sorted>, decision: d ? [d.id, d.status] : null, run: r ? [r.id, r.ended_at] : null } : null`.

`renderTicketHygiene(hygiene, stamp, nowIso)` — pure; lines joined with `\n`, each group ends with `""`:

1. lead = `` **Ticket hygiene, last night** — *${stamp}.* What the Ticket Owner (`AGT-79`) left on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision and the newest nightly cycle row. Counts only, never a rate. ``
2. `!hygiene || !Array.isArray(hygiene.open)` → lead, `""`, `- *The hygiene ledger was not read for this render* — which is **not** the same as *a clean board*. Re-run \`scripts/render-standing-brief.js\` with a service key.`, `""`; return.
3. Group `open` by `check_slug` → `[{slug, n, oldest}]` (`oldest` = min `first_seen_at`), sorted by `n` desc then `slug` asc. Push `` `${lead} **${open.length} open findings** across ${groups.length} check(s).` ``, `""`.
4. If `open.length === 0`: `- **No open findings** — a measured zero: the ledger was read and holds no open row.`, `""`. Else the table `| check | open | oldest | nights open |` / `|---|---:|---|---:|` then per group `` `| \`${slug}\` | ${n} | ${cst(oldest)} | ${Math.floor((Date.parse(nowIso) - Date.parse(oldest)) / 86400000)} |` ``, then `""`.
5. run line: `hygiene.run` ? `` `- Last run: \`${String(run.id).slice(0, 8)}\` · ${run.outcome} · ${cst(run.ended_at)} · ${String(run.notes).replace(/^SCHEDULED-AGENT: audit-board — /, "")}` `` : `- *No nightly run on record yet* — runbook step 4e has not fired; the counts above are the ledger as it stands.`
6. decision line: `hygiene.decision` ? `` `- Decision \`${String(d.id).slice(0, 8)}\` · ${d.status} · ${summarise(d.summary)} · finalises ${d.expires_at ? cst(d.expires_at) : "—"} · \`select public.reverse_decision('${d.id}','John','<why>');\`` `` : `- *No hygiene decision on record.*`
7. `""`; return.

## Slice 3 test parts

`tests/regression/agt-79-ticket-owner.test.mjs` — header `// DeepBench v7.0.477 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-79 slices 1-3`; imports gain `censusLine, sameChicagoDay, nightlyNotes, NIGHTLY_PREFIX` from ticket-owner.js, `renderTicketHygiene, factsSha, cst, BEGIN, END` from `../../scripts/render-standing-brief.js`, `parseSteps, render, NOTES, CARD_REL, RUNBOOK_REL` from `../../scripts/render-cycle-card.js`. Parts A–G byte-identical except part C gains the three `--nightly` spawns below.

- **H — the brief group, pure + doc.** `HYG = () => ({ open: [ {check_slug:"quote-missing", first_seen_at:"2026-09-13T03:31:46.538+00:00"} ×3, {check_slug:"delivered-unaccepted", first_seen_at:"2026-09-10T03:00:00+00:00"} ], decision: { id:"77afdcbc-32dc-4505-bfda-724acc1f8b07", status:"open", summary:"Ticket Owner: 40 derivable cell fix(es) on 40 row(s) — cost 37 · claim 1 · type 2", expires_at:"2026-09-16T03:31:48+00:00", decided_at:"2026-09-13T03:31:48+00:00" }, run: { id:"11111111-2222-4333-8444-555555555555", outcome:"shipped", ended_at:"2026-09-13T03:40:00+00:00", notes:"SCHEDULED-AGENT: audit-board — 855 rows · 170 findings (0 derivable · 170 judgment) · behind the fences: quote 526 · size 494 · cost 45 · verdict 97 · unrevalidated>30d 427 · attended-actual null 260 · fixed 0 · findings +0 ~170 −0 · no decision (nothing to fix)" } })`; `NOW = "2026-09-14T04:00:00Z"`; `out = renderTicketHygiene(HYG(), "as of X", NOW)`. Assert: `out.startsWith("**Ticket hygiene, last night** — *as of X.*")`; includes `**4 open findings** across 2 check(s)`; table rows (lines starting `| \``) = 2, the first starts `| \`quote-missing\` | 3 |` and ends `| 1 |`, the second starts `| \`delivered-unaccepted\` | 1 |` and ends `| 4 |`; includes `- Last run: \`11111111\` · shipped ·` and `· 855 rows · 170 findings` and NOT `SCHEDULED-AGENT`; includes `- Decision \`77afdcbc\` · open ·` and `reverse_decision('77afdcbc-32dc-4505-bfda-724acc1f8b07','John','<why>')`; `!out.includes("%")`; `renderTicketHygiene(HYG(), "as of X", NOW) === out`. Branches: `renderTicketHygiene(undefined, "as of X", NOW)` includes `was not read for this render` and not `0 open`; `{...HYG(), open: []}` includes `**0 open findings**` and `No open findings`; `{...HYG(), run: null}` includes `No nightly run on record yet`; `{...HYG(), decision: null}` includes `No hygiene decision on record`. Sha (`F = over => ({ items: [{ id: 1, status: "open", design_status: null, queue: 1 }], ...over })`): `factsSha(F({hygiene: HYG()})) === factsSha(F({hygiene: HYG()}))`; differs when `open` drops one `quote-missing` row; differs when `run.ended_at` becomes `"2026-09-14T03:40:00+00:00"`; differs when `decision.status` becomes `"final"`; equals when only `first_seen_at` of a row changes (a re-seen touch is not a change John reads). Doc: `docs/runbooks/standing-brief.md` has `**Ticket hygiene, last night**` after `**Auditor's ledger**`, before `*Provenance:`, inside `BEGIN`/`END`.
- **I — step 4e and the card (source).** `md = runbook`; `labels = parseSteps(md).map(s => s.label)`; `i = labels.indexOf("4e")`; `labels[i-1] === "4d"`, `labels[i+1] === "5"`, `labels.length === 27`, `labels.length === Object.keys(NOTES).length`; `NOTES["4e"].outcome.length <= 90`, `NOTES["4e"].block === 1`; `body = md.slice(md.indexOf("**4e. "), md.indexOf("**5. ", …))` includes `ticket-owner.js --nightly --cycle-id=`, `SCHEDULED-AGENT: audit-board`, `already run today`, `continue to step 5 normally`, and does NOT include `--judge`; `card = read(CARD_REL)`; `card === render(md)`; card has a line starting `**4e.** Ticket hygiene · L` and a fenced block whose body includes `--nightly --cycle-id=`; runbook header stamps (`lines.filter(l => l.startsWith("<!-- DeepBench v")).length`) `<= 5`; `docs/SESSIONS.md` includes `<!-- DeepBench v7.0.452 | runbooks/runner-cycle.md | SES-352`. Control: `render(md + "\n**10. Nothing.**\n")` throws.
- **J — the nightly, pure + CLI.** `sameChicagoDay("2026-09-13T04:59:00Z","2026-09-13T05:01:00Z") === false`; `("2026-09-13T05:01:00Z","2026-09-14T04:59:00Z") === true`; `("2026-01-13T05:59:00Z","2026-01-13T06:01:00Z") === false`; `("2026-01-13T06:01:00Z","2026-01-14T05:59:00Z") === true`; `assert.throws(() => sameChicagoDay("x","2026-01-01T00:00:00Z"))`. `r = run({})`: `renderCensus(r, F.now).split("\n")[0] === \`ticket-owner census ${F.now}: ${censusLine(r)}\``; `censusLine(r).startsWith("14 rows · 11 findings (4 derivable · 7 judgment) · behind the fences: quote ")`. `n1 = nightlyNotes(censusLine(r), {fixed:1, inserted:4, reseen:0, cleared:0, decision:"d1", expires_at:"2026-09-16T00:00:00Z"})`: starts `${NIGHTLY_PREFIX} — 14 rows · 11 findings`, ends ` · fixed 1 · findings +4 ~0 −0 · decision d1 — reversible until 2026-09-16T00:00:00Z`; `nightlyNotes(censusLine(r), {fixed:0, inserted:0, reseen:170, cleared:0, decision:null, expires_at:null})` ends ` · fixed 0 · findings +0 ~170 −0 · no decision (nothing to fix)`; `NIGHTLY_PREFIX === "SCHEDULED-AGENT: audit-board"`. CLI (creds deleted): `spawnCli(["--nightly"])` → exit 2, stderr includes `needs --cycle-id`; `spawnCli(["--nightly", "--cycle-id=00000000-0000-4000-8000-000000000000", "--board=" + FIXTURE_REL])` → exit 2, stderr includes `never written`; `spawnCli(["--nightly", "--cycle-id=00000000-0000-4000-8000-000000000000"])` → exit 2, stderr includes `SUPABASE_URL`.

`tests/regression/agt-70-auditor.test.mjs` — lines 4, 965 and 1427: `26` → `27` (the message text updated to match); nothing else.

DRY-RUN against the tree before this slice (`bc58ea34`): H fails at import (`renderTicketHygiene` is not exported); I fails on `labels.indexOf("4e") === -1`; J fails at import (`censusLine`). Part C's three new spawns against the old script: `--nightly` exits 2 with `unknown flag`, so the `needs --cycle-id` and `never written` assertions fail.

## What this slice does not do

- No model call, no prompt assembly, no agent/Skill/Capability row, no handler, no harness file, nothing under `.claude/`, no migration, no grant change, no `src/`/`api/`/`lib/` change.
- No new write to `backlog_items`: the cells written are exactly slice 2's, by the same `applyPlan`.
- It does not mark the ticket. `AGT-79` stays `partial`: the `--judge` judgment run remains, gated on John applying `docs/design/agt-79-ticket-owner-seed.sql`.

## Residue for the orchestrator (not the build's)

- **Card items for John:** (1) apply `docs/design/agt-79-ticket-owner-seed.sql` attended — until then the judgment run cannot be built; (2) the first nightly row and the `Ticket hygiene, last night` group appear tonight — that is the design working; (3) slice 1's taxonomy/design_status items stand.
- **The judgment run (`--judge`), the fourth and last item, gated on the seed:** two-pass exit 3 through `assemblePrompt({ capability_slug: 'audit-board', agent_id: 'ticketowner', tenant_id: 'global', intent_slug: 'to-audit-intent', task_context: { census, window, prior } })`, pass two `validateAgentVerdict(state.schema, answer)`, `fixes[].apply === false` → judgment findings before `applyPlan`; its audit row via `scripts/agent-log.js` (SES-331); step 4e's command gains `--judge` then, and only then. Its kickoff re-measures `capabilities where slug = 'audit-board'` = 1 first.
- **Two facts, not tickets:** `TYPE_TAXONOMY`'s comment still says `Tooling (235 rows) and Bug (43)` against a live 250 / 44 — a stale comment. The three regression guards red on `origin/dev` (`SES-386`) grade live board state; this slice's suite run is judged on its own files' PASS lines, not on an all-green summary.



---

# AGT-79 — slice 4: the judgment pass, code half, harvested

<!-- DeepBench v7.0.480 | docs/harvests/AGT-79.md (APPENDED section — the slice 1-3 blocks above are unchanged and still cited byte-for-byte by v7.0.474/475/477) | Written by the Designer (design-kickoff, unattended cycle c46eb099-5634-423d-bfc9-7bd1adf29b13, 2026-09-13). Overflow for docs/kickoffs/v7.0.480-AGT-79-ticket-owner-judge-code-half.md. The build reads this section ONLY at the four blocks the kickoff names: ## Slice 4 ingest rules, ## Slice 4 CLI, ## Slice 4 fixture, ## Slice 4 test part K. Everything else here is reasoning. -->

## Premise revalidation (measured 2026-09-13 06:5xZ, live Supabase over PostgREST with the service key; files read in the clone at `4743bbf3`)

- `capabilities?slug=eq.audit-board` → `[]` (0 rows). `agents?id=in.(ticketowner,auditor)` → `[]`. `skill_profiles?slug=like.to-*` → `[]`. The seed `docs/design/agt-79-ticket-owner-seed.sql` is written and unapplied, as the ticket's remaining scope says; piece (A) is John's by `.claude/rules/agent-roster-inert.md` and is not designed here.
- `scripts/ticket-owner.js` (`v7.0.477`, 39,829 B): `ALLOWED_FLAGS = census, board, out, json, apply, cycle-id, nightly` — `--judge` is an unknown flag (exit 2). No import of `db-assembly.js`, `agent-prompt.js` or `verifier.js`. Premise ALIVE: the code half of the judgment pass does not exist.
- `runner_model_lanes`: orchestrator `claude-opus-5`, mechanical `claude-sonnet-5`, judgment `claude-fable-5-1`.
- Nightly rows (`notes like 'SCHEDULED-AGENT: audit-board%'`): 2 — `3cd2c80e` (04:19Z) and `27cef94a` (05:11Z), both `856 rows · 170 findings (0 derivable · 170 judgment)`. Open `ticket_owner_findings`: 170. Live `--census --json` this session: 857 rows, 170 findings (quote-missing 3, size-missing 16, actual-unknown 63, verdict-missing 41, designed-closed 28, type-off-taxonomy 13, delivered-unaccepted 4, cycles-over-quote 2), **35,784 bytes** of JSON, findings alone 35,320.
- `getconf PAGESIZE × 32 = 131,072` = Linux `MAX_ARG_STRLEN`, the cap on ONE argv string. `audit-cluster.js --run` passes `--task=<json>` on argv (scripts/audit-cluster.js:607-610); the Ticket Owner's task_context is the whole census plus 170 prior rows (~56 KB today) — a 2.3× board would exceed the cap on that shape. `rank-backlog.js` calls `assemblePrompt()` in-process (line 291) and has no such cap.
- `db-assembly.js:681` throws `assemblePrompt: intent_slug "to-audit-intent" does not match any Intent Skill Profile for capability "audit-board"` when the rows are absent — so without an explicit gate `--judge` would already refuse, but with a message naming an intent rather than the seed file and the rule.
- `SERVICE_CATALOG` (shared/ai-patterns.js) has no `audit-board`; `audit-agent-data` / `audit-governance-corpus` entered at `v7.0.465` for exactly this reason (line 1 of that file). `scripts/agent-log.js` refuses an `--ai-type` outside the catalog (its header, lines 44-46). `tests/regression/SES-016-service-catalog.js` asserts only three named slugs and uniqueness — adding one is safe.
- `ai_activity_log` row 42629: `agent_id 'auditor'`, `call_source 'session'`, `model 'claude-fable-5-1'` — written while `agents` has no `auditor` row, so `agent_id` carries no FK and a `ticketowner` log row can be written the day the seed lands. Row 43662 is `prioritizer`, `feature rank-backlog:pz-rank-intent:depth0`, `visitor_id` = the cycle id — the shape agent-log.js writes.
- Importing `scripts/ticket-owner.js`, `scripts/agent-prompt.js` and `scripts/verifier.js` with `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` deleted: all three load, 40 ms, no throw — static imports keep the fixture path credential-free. `tests/regression/ses-334-served-class-block.test.mjs:49` already imports `rank-backlog.js` (which imports `db-assembly.js` and `agent-prompt.js`) in the suite.
- The seed's `to-audit-intent` traits: `schema` with `required [window, fixes, findings, report, account]`; `fixes.items.required [backlog_id, check, apply, reason]` (`reason` maxLength 200); `findings.items.required [backlog_id, check, detail]` (`detail` maxLength 300); `report` maxLength 6000; `account` maxLength 100. `JSON.stringify(JSON.parse(...))` of that schema is 663 bytes and is a substring of the seed file — the fixture can carry it byte-identical and the test can prove it.
- `validateAgentVerdict(schema, value)` (scripts/verifier.js:868) checks required keys, top-level types, enums, maxLength and `items.type` only — it does NOT descend into array item properties. So `fixes[].apply` being a boolean and `reason ≤ 200` are the ingest's own checks, stated in `## Slice 4 ingest rules`.
- Fixture `tests/fixtures/agt-79/board.json` (`now` 2026-09-13T02:00:00Z = 21:00 CDT 2026-09-12): 11 findings, derivable `QA-79-03 cost-snapshot-missing`, `QA-79-05 claim-on-closed`, `QA-79-07 claim-expired`, `QA-79-12 type-off-taxonomy`; judgment `QA-79-01 quote-missing`, `QA-79-04 actual-unknown`, `QA-79-08 verdict-missing`, `QA-79-14 designed-closed`, `QA-79-13 type-off-taxonomy`, `QA-79-10 delivered-unaccepted`, `QA-79-14 cycles-over-quote`.
- Baseline counts for the live gate arm: `runner_cycles` 457, `runner_decisions` 726, `ticket_owner_findings` 170, `runner_before_images` 6612 (Prefer: count=exact). The build re-takes them; the kickoff's numbers are design-time.
- Cycle `724b1d1b` (05:09Z) recorded that (B) is buildable unattended and declined it on a usage-window judgment; this cycle's window is clear (its own notes). The ticket row: `partial`, `claimed_by` this cycle, `predicted_cycles 3`, `size_stamp L`, `design_status null`, `kickoff_link` v7.0.477.

## The size ruling — what slice 4 is, and what it deliberately is not

Piece (B) only. The two-pass driver, its refusal grammar, the catalog slug, one fixture and one test part. It ships a capability gate that answers exit 2 today and exit 3 the day the seed lands, with no code edit between — that is the "ahead of its seed" property AGT-70 proved, and it is the whole of what can be built without John's word. Not in it: the seed apply (A); the step-4e landing (runbook + `NOTES["4e"]` + regenerated card — a runbook edit is three things in one commit and belongs to the slice that can also prove the command live); storing `report` anywhere; any change to the brief. 4 files / 8 tasks against caps 14 / 15.

## Governing architecture

- **§19b** — capabilities are data; the prompt is `assemblePrompt()`'s output rendered by `renderAssembly()`, the executor's own two functions (SES-331's one path). This script composes no prompt text. The one hand-composed sentence in `audit-cluster.js` (`EXCEPTION_PROMPT`) is NOT copied here — see decision C.
- **§19d/§19e, Rule #1** — the script names its own agent id (`ticketowner`) as `rank-backlog.js` names `prioritizer`; no row, finding, note or report names another agent. The Intent's own text tells the model to name a capability, never an agent; the ingest carries the model's sentence into `detail` verbatim, so a Rule #1 breach in an answer would be visible on the ledger — a later slice may grep for it; this one does not invent a second guardrail.
- **§19k** — one `ai_activity_log` row per judged night through `scripts/agent-log.js` (`call_source 'session'`, the cycle id in `visitor_id`), written BEFORE the board write and fatal when refused — `audit-cluster.js`'s rule, not `rank-backlog.js`'s "say it and carry on".
- **§19v** — P5: an automated session never creates or edits roster rows; the gate reads one row and never writes one. Lane routing: no surface changes, no flag. The unit of John's judgment is the same one `hygiene` decision slice 2 designed; a judged night reverses with the same `reverse_decision()` call.

## Design decisions, with the alternatives they beat

- **A. In-process assembly (`rank-backlog.js`'s shape), not a spawn of `scripts/agent-prompt.js` (`audit-cluster.js`'s shape).** Both are "the sanctioned path" — `renderAssembly` IS agent-prompt.js. The spawn passes task_context on argv, capped at 131,072 bytes per string; the census is 35,784 B today and grows with the board. In-process has no cap, and the state file carries the same census pass two validates against. Measured, not assumed.
- **B. An explicit capability gate before the board read, not `assemblePrompt`'s own throw.** The throw comes after the rate, the board and the ledger were read (three reads wasted on a night that cannot be judged) and names an intent slug. The gate is one indexed read of one row and its message names the seed file and the rule that holds it — the one sentence an operator needs. And it is what makes "provably degrades while the row is absent" a one-line assertion in the test.
- **C. No exception prompt.** `audit-cluster.js` ships a seed-file orientation prompt because its answer never writes: `--collect` writes a candidates file John reads. The Ticket Owner's answer CONFIRMS CELL WRITES. Running a writer under a prompt no `capabilities` row sanctioned is the §19v P5 write the roster rule exists to hold, wearing an "orientation only" label. So: no row, no run. This is the plain statement the orchestrator asked for — until John applies the seed, the built code cannot judge a night.
- **D. Fail closed on silence.** A derivable fix the answer does not mention is NOT applied; it becomes a judgment finding `judge: not confirmed -- <census detail>`. The Intent says "return an empty fixes array rather than a doubtful one"; reading absence as consent would make the empty array the most permissive answer. Tested by the control arm (drop one fix → derivable 2, unconfirmed 1, errors `[]`).
- **E. Whole-answer refusal, never partial.** `rank-backlog.js` rule 4: a half-validated answer applied by halves is worse than none. Any schema miss, a fix naming a non-derivable pair, a finding naming a non-judgment pair, a duplicate, a wrong window → exit 2, nothing written, every problem listed.
- **F. The state carries `census`, `prior` and `items`; pass two never re-reads the board.** The judgment was about ONE census; a fresh board read would validate today's answer against tomorrow's rows (`rank-backlog.js` rule 3; the verifier's `5f414763` finding). `--cycle-id` must match the state's for the same reason.
- **G. The log row first.** The tokens were spent when the sub-agent ran; the row is about that spend, not about the write. A refused row stopping before any write keeps §19k strict and leaves nothing to undo.
- **H. `report` is printed and carried on `--out`/`--json`, not stored.** Nothing on the brief renders it yet and no column exists; storing it is a schema decision for the landing slice, with John's card in view. `nightlyNotes` gains the four-number summary only, so the brief's `Last run:` line says a night was judged.
- **I. `--dry-run` on pass two needs no creds and no `--cycle-id`.** It is the one way to drive the CLI's pass-two wiring in a clean checkout, and it is `rank-backlog.js`'s own flag. It reads two files and prints one line.

## Slice 4 ingest rules

`ingestJudgment(answer, state)` → `{ errors, result, judged }`. Pure: no fetch, no disk, no clock, and `state` is never mutated. `state` is pass one's state file (`census`, `prior`, `items`, `schema`, `window`, `model`, `now`, `rate`). `errors` is an array of plain-English refusals; when it is non-empty, `result` and `judged` are `null` and the caller writes NOTHING. Every failing check appends its own line (the operator sees all of them), and the families run in this order:

1. `validateAgentVerdict(state.schema, answer)` with no truncation; its `errors` are carried verbatim. If it fails, stop here (the shape is not trustworthy enough to inspect further).
2. `answer.window !== state.window` → `the answer is about window "<answer.window>", this state is "<state.window>" -- run pass one again`.
3. `fixes[]`, each entry: not an object → `fixes[<i>] is not an object`; `backlog_id`/`check` not strings → `fixes[<i>] must carry backlog_id and check`; `apply` not a boolean → `fixes[<i>] apply must be a boolean`; `reason` not a string or longer than 200 → `fixes[<i>] reason must be a string of at most 200 chars`; the pair `(backlog_id, check)` not a `state.census.findings` entry with `verdict === "derivable"` → `fixes names <id> <check>, which is not a derivable finding of this census`; the pair seen before in `fixes` → `fixes names <id> <check> twice`.
4. `findings[]`, each entry: not an object → `findings[<i>] is not an object`; `backlog_id`/`check` not strings → `findings[<i>] must carry backlog_id and check`; `detail` not a non-empty string of at most 300 → `findings[<i>] detail must be a non-empty string of at most 300 chars`; the pair not a census finding with `verdict === "judgment"` AND not a pair this answer's `fixes[]` refused (`apply === false`) → `findings names <id> <check>, which is neither a judgment finding of this census nor a fix this answer refused`; seen before in `findings` → `findings names <id> <check> twice`.

The merge (only when `errors` is empty), over `state.census.findings` in its existing order, never re-sorted, each finding shallow-copied:
- derivable + a fix with `apply: true` → unchanged (`verdict "derivable"`, `fix` kept).
- derivable + a fix with `apply: false` → `verdict "judgment"`, `fix` key deleted, `detail = "judge refused: " + reason`.
- derivable + no fix entry → `verdict "judgment"`, `fix` key deleted, `detail = "judge: not confirmed -- " + census detail`. Fail closed: silence is not consent.
- judgment + a findings entry → `detail` = the answer's sentence; otherwise the census detail stands.

`result = { findings, backlog: state.census.backlog, counts: { rows: state.census.counts.rows, findings, derivable, judgment } }` recounted — the shape `classifyBoard` returns, so `planWrites(result, state.prior, state.items, { rate: state.rate })` runs unchanged (prior rows carry `check_slug`; `planWrites` already reads `check ?? check_slug`).
`judged = { confirmed, refused, unconfirmed, sentences: answer.findings.length, model: state.model, report: answer.report }` where `confirmed` = fixes with `apply true`, `refused` = fixes with `apply false`, `unconfirmed` = derivable census findings with no fix entry.

## Slice 4 CLI

Flags: `ALLOWED_FLAGS` gains `judge`, `answer`, `state-file`, `dry-run`; the unknown-flag message lists all eleven. Exit codes: 0 ran; 2 could not run or REFUSED (nothing written); **3 AWAITING THE JUDGMENT** — pass one wrote the state, printed the prompt and touched no row. Export `EXIT_AWAITING_ANSWER = 3` as `rank-backlog.js` does.

Gating: `--judge` sets the same `applyArg` the `--apply`/`--nightly` gates read, so `--board` → the existing `--apply writes the live board; a --board fixture is never written.` and a missing/short `--cycle-id` → the existing `--apply/--nightly needs --cycle-id=<uuid> — every write is attributed to a cycle.` — EXCEPT when `--answer` and `--dry-run` are both present, which skips both gates and the creds check (two files are read, nothing else). `--answer` or `--state-file` or `--dry-run` without `--judge` → exit 2 `--answer/--state-file/--dry-run belong to --judge`. `--dry-run` without `--answer` → exit 2 `--dry-run belongs to --judge --answer=<json>`.

State path: `--state-file=<p>` (resolved against `process.cwd()`), else `statePathFor(os.tmpdir(), cycleId)` = `path.join(dir, "ticket-owner-judge-" + String(cycleId).replace(/[^A-Za-z0-9_-]/g, "") + ".json")`.

PASS ONE — `[--nightly] --judge --cycle-id=<uuid> [--state-file=<p>]`, in this order and no other:
1. Creds (the existing `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` messages).
2. If `--nightly`: the existing precondition read; `already run today` → the existing stdout line, exit 0.
3. THE GATE: `rest(base, key, "capabilities?slug=eq.audit-board&tenant_id=eq.global&select=slug&limit=1")`. Non-array → exit 2 `the capability gate read came back non-array`. Empty → stderr `ticket-owner: --judge: capabilities has no audit-board row — apply docs/design/agt-79-ticket-owner-seed.sql (John's word, .claude/rules/agent-roster-inert.md); board not read, nothing written`, exit 2. One row in one table is the switch; no code edit flips it.
4. `now`, `readRate`, `readBoard`, `classifyBoard` — byte-identical to the census path — then `out` as today, then `prior = readAll(..., "ticket_owner_findings", "ticket_owner_findings?select=id,backlog_id,check_slug,first_seen_at&cleared_at=is.null&limit=10000", 10000)`.
5. `assemblePrompt({ capability_slug: "audit-board", agent_id: "ticketowner", tenant_id: "global", intent_slug: "to-audit-intent", task_context: judgeTask(out, prior, now) })` in try/catch — a throw is exit 2 with its message (AA-108: an intent that did not load is a stop). `!assembly.agent_card` → exit 2 `no agents row for ticketowner — the seed is half applied`. `const { system_prompt, omitted } = renderAssembly(assembly)`; `omitted.length` → stderr `ticket-owner judge: sections omitted (empty at assembly time): <list>`; `!system_prompt` → exit 2 `audit-board assembled zero renderable sections`. `schema = assembly.format_contract?.schema`; none → exit 2 `the assembly carried no format contract for to-audit-intent — refusing to print a prompt whose answer could not be validated`. `model = assembly.llm?.model`; none → exit 2 `the assembly names no model`.
6. State file `{ version: 1, started_at, cycle_id: cycleId, nightly: <bool>, capability: "audit-board", intent: "to-audit-intent", agent: "ticketowner", model, schema, now, rate, window: chicagoDay(now), census: out, prior, items: board.items.map(i => ({ id: i.id, backlog_id: i.backlog_id })) }`, `mkdirSync` the directory; unwritable → exit 2 naming the path.
7. stdout: `system_prompt` newline-terminated. stderr, three lines: `ticket-owner judge: pass one complete — <rows> rows · <derivable> derivable · <judgment> judgment · model <model>`; `ticket-owner judge: state written to <path>`; `ticket-owner judge: run the prompt above as a ticketowner sub-agent on the judgment lane, save its JSON, then re-run with --answer=<that file>`. `--out`/`--json` are ignored on pass one. Exit 3.

PASS TWO — `[--nightly] --judge --cycle-id=<uuid> --answer=<json> [--state-file=<p>] [--dry-run] [--out=<json>] [--json]`:
1. State file missing → exit 2 `no state file at <p> — run pass one first (without --answer)`; either file not readable JSON → exit 2 naming it.
2. `const { errors, result, judged } = ingestJudgment(answer, state)`; `errors.length` → stderr `ticket-owner: the judgment was REFUSED and nothing was written:` then one `  - <error>` line each, exit 2.
3. `plan = planWrites(result, state.prior, state.items, { rate: state.rate })` in try/catch (throw → exit 2).
4. `--dry-run`: stdout ONE line `JSON.stringify({ ok: true, dry_run: true, confirmed, refused, unconfirmed, fixes: plan.fixes.length, insert: plan.ledger.insert.length, reseen: plan.ledger.reseen.length, clear: plan.ledger.clear.length })`, exit 0. No creds read, no network.
5. Creds. `cycleId !== state.cycle_id` → exit 2 `--cycle-id <a> is not the state's <b> — a judgment is about one night`.
6. THE LOG ROW FIRST: `const t = tokensFrom(answer)`; `spawnSync(process.execPath, [path.join(ROOT, "scripts", "agent-log.js"), "--agent=ticketowner", "--capability=audit-board", "--model=" + state.model, "--ai-type=audit-board", "--feature=audit-board:to-audit-intent:depth0", "--input-tokens=" + (t.input ?? 0), "--output-tokens=" + (t.output ?? 0), "--cycle=" + cycleId, "--json"], { encoding: "utf8" })`. Non-zero status → exit 2 `agent-log.js refused the row (exit <n>): <stderr, 400 chars> — nothing written`. `loggedId = JSON.parse(stdout).id`.
7. `applied = await applyPlan(base, key, plan, { cycleId, now: state.now, judged })`.
8. If `--nightly`: `recordNightly(base, key, { cycleId, startedAt: state.started_at, line: censusLine(result), applied, judged })` — `recordNightly` passes `judged` through to `nightlyNotes(line, applied, judged)`.
9. Output as today (`renderCensus(result, state.now)`, the apply line), then `ticket-owner judge: confirmed <c> · refused <r> · unconfirmed <u> · sentences <n> · model <m> · log <id>` (`tokens unreported` appended when `t.total === null`), then `answer.report` verbatim, newline-terminated, then the nightly line. `out.judge = { confirmed, refused, unconfirmed, sentences, model, logged_id, report }`; `out.measured_at` is `state.now`. Exit 0.

`applyPlan(base, key, plan, { cycleId, sessionName, now, judged })`: when `judged` is given, `p_reasoning` gains ` Judged by capability audit-board on <model>: <c> fix(es) confirmed, <r> refused, <u> unconfirmed.` inserted immediately before ` pattern:0`; `p_summary` unchanged (part G's prefix assertion stands). `nightlyNotes(line, applied, judged)`: byte-identical output when `judged` is undefined (part J's exact endings stand); otherwise ` · judged <c>/<r>/<u> on <model>` is appended at the end.

## Slice 4 fixture

`tests/fixtures/agt-79/judge.json` — one file, three members:

- `schema`: the `schema` member of the seed's `to-audit-intent` traits (`'{"schema":{...},"can_request_help":false}'::jsonb`, the seed's line 48), pasted compact so that `seed.includes(JSON.stringify(fixture.schema))` is true (663 bytes; key order as in the seed).
- `prior`: `[{ "id": "00000000-0000-4000-8000-0000000000a1", "backlog_id": "QA-79-08", "check_slug": "verdict-missing", "first_seen_at": "2026-09-10T02:00:00+00:00" }, { "id": "00000000-0000-4000-8000-0000000000a2", "backlog_id": "QA-79-02", "check_slug": "quote-missing", "first_seen_at": "2026-09-09T02:00:00+00:00" }]` — the first is re-seen tonight; the second (`QA-79-02` sits behind the quote fence) is cleared.
- `answer`:

```json
{
  "window": "2026-09-12",
  "fixes": [
    { "backlog_id": "QA-79-03", "check": "cost-snapshot-missing", "apply": true,  "reason": "ticket_matrix.actual_cycles 2 at rate 0.5 is 1.00; the column contract yields it." },
    { "backlog_id": "QA-79-05", "check": "claim-on-closed",       "apply": false, "reason": "The close-out may still be in flight; the capability that closes tickets decides whether the claim is live." },
    { "backlog_id": "QA-79-07", "check": "claim-expired",         "apply": true,  "reason": "claimed_at is past 24 hours and no open cycle holds cyc-dead." },
    { "backlog_id": "QA-79-12", "check": "type-off-taxonomy",     "apply": true,  "reason": "feature to Feature is the one-to-one spelling." }
  ],
  "findings": [
    { "backlog_id": "QA-79-01", "check": "quote-missing",   "detail": "The row carries no predicted_cycles; the capability that quotes tickets decides it." },
    { "backlog_id": "QA-79-05", "check": "claim-on-closed", "detail": "A done row is still claimed; the capability that closes tickets decides whether the claim is live." }
  ],
  "report": "Cells fixed: QA-79-03 — cost_pct_snapshot — null → 1; QA-79-07 — claimed_by — cyc-dead → null; QA-79-12 — type — feature → Feature.\nFindings by check: quote-missing QA-79-01 — 0 nights; claim-on-closed QA-79-05 — 0 nights; verdict-missing QA-79-08 — 3 nights.\nBacklog behind the fences: quote 1 · size 1 · cost 1 · verdict 1.",
  "account": "Confirmed three cell fixes, refused one",
  "input_tokens": 12000,
  "output_tokens": 800
}
```

Expected over `board.json`'s census (`now` 2026-09-13T02:00:00Z → window `2026-09-12`): confirmed 3, refused 1, unconfirmed 0, sentences 2; `result.counts` `{ rows: 14, findings: 11, derivable: 3, judgment: 8 }`; `planWrites` → `fixes` `QA-79-03`, `QA-79-07`, `QA-79-12`; `ledger.insert` 7 (the eight judgment pairs — `QA-79-01 quote-missing`, `QA-79-04 actual-unknown`, `QA-79-05 claim-on-closed`, `QA-79-08 verdict-missing`, `QA-79-14 designed-closed`, `QA-79-13 type-off-taxonomy`, `QA-79-10 delivered-unaccepted`, `QA-79-14 cycles-over-quote` — minus the re-seen `QA-79-08`), `reseen` `[…a1]`, `clear` `[…a2]`.

## Slice 4 test part K

Placement: the pure and no-creds CLI arms go after part J and BEFORE part E's credential gate (a clean checkout runs them); the live arm goes after part E's `census` read, under its creds, and is declared `notRun("judge gate (part K live)", why)` in the no-creds branch. The header comment gains a `(K)` paragraph. Imports gain `chicagoDay, judgeTask, ingestJudgment, statePathFor, EXIT_AWAITING_ANSWER` from the script and `SERVICE_CATALOG` from `../../shared/ai-patterns.js`. Setup: `J = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/agt-79/judge.json"), "utf8"))`; `ZERO = "00000000-0000-4000-8000-000000000000"`; `out = { measured_at: F.now, rate: F.rate, fences: FENCES, counts: r.counts, backlog: r.backlog, findings: r.findings }` (`r = run({})`); `state = { version: 1, started_at: F.now, cycle_id: ZERO, nightly: false, capability: "audit-board", intent: "to-audit-intent", agent: "ticketowner", model: "claude-fable-5-1", schema: J.schema, now: F.now, rate: F.rate, window: "2026-09-12", census: out, prior: J.prior, items: F.board.items.map(i => ({ id: i.id, backlog_id: i.backlog_id })) }`.

- **Catalog and seed control:** `SERVICE_CATALOG.find(s => s.slug === "audit-board")` exists, `serviceType === "ai"`, `patterns.includes("Structured Output")`. `seed.includes(JSON.stringify(J.schema))` is true; `seed.includes(JSON.stringify({ ...J.schema, required: [] }))` is false (the control proves the substring check discriminates). `EXIT_AWAITING_ANSWER === 3`.
- **chicagoDay:** `chicagoDay("2026-09-13T04:59:00Z") === "2026-09-12"`; `("2026-09-13T05:01:00Z") === "2026-09-13"`; `("2026-01-13T05:59:00Z") === "2026-01-12"`; `("2026-01-13T06:01:00Z") === "2026-01-13"`; `assert.throws(() => chicagoDay("x"))`. `statePathFor("/t", "a-b/../c")` ends with `ticket-owner-judge-a-bc.json` and starts with `/t` (path.join'd, sanitized).
- **judgeTask:** `t = judgeTask(out, J.prior, F.now)`: `t.window === "2026-09-12"`; `t.census === out` (same reference); `t.prior` deep-equals `[{ backlog_id: "QA-79-08", check: "verdict-missing", first_seen_at: "2026-09-10T02:00:00+00:00" }, { backlog_id: "QA-79-02", check: "quote-missing", first_seen_at: "2026-09-09T02:00:00+00:00" }]` (no `id`; `check`, not `check_slug`).
- **ingest, accept:** `g = ingestJudgment(J.answer, state)`: `g.errors` deep-equals `[]`; `g.judged` deep-equals `{ confirmed: 3, refused: 1, unconfirmed: 0, sentences: 2, model: "claude-fable-5-1", report: J.answer.report }`; `g.result.counts` deep-equals `{ rows: 14, findings: 11, derivable: 3, judgment: 8 }`; `g.result.findings.map(f => f.backlog_id + " " + f.check)` deep-equals the same map over `r.findings` (order kept); `g.result.backlog` deep-equals `r.backlog`; `only(g.result, "QA-79-05", "claim-on-closed")` has `verdict "judgment"`, `!("fix" in it)`, `detail.startsWith("judge refused: ")`; `only(g.result, "QA-79-03", "cost-snapshot-missing").fix` deep-equals `only(r, "QA-79-03", "cost-snapshot-missing").fix`; `only(g.result, "QA-79-01", "quote-missing").detail === J.answer.findings[0].detail`; `only(g.result, "QA-79-04", "actual-unknown").detail === only(r, "QA-79-04", "actual-unknown").detail`. `p = planWrites(g.result, J.prior, F.board.items, { rate: F.rate })`: `p.fixes.map(f => f.backlog_id)` deep-equals `["QA-79-03", "QA-79-07", "QA-79-12"]`; `p.ledger.insert.length === 7`; `p.ledger.reseen` deep-equals `["00000000-0000-4000-8000-0000000000a1"]`; `p.ledger.clear` deep-equals `["00000000-0000-4000-8000-0000000000a2"]`. `JSON.stringify(state)` is byte-equal before and after the call (no mutation); `only(r, "QA-79-05", "claim-on-closed").fix` still exists (the census object was not touched).
- **ingest, fail closed (control):** `a2 = clone(J.answer); a2.fixes = a2.fixes.filter(f => f.backlog_id !== "QA-79-12")`; `g2 = ingestJudgment(a2, state)`: `g2.errors` deep-equals `[]`, `g2.judged.unconfirmed === 1`, `g2.judged.confirmed === 2`, `g2.result.counts.derivable === 2`, `only(g2.result, "QA-79-12", "type-off-taxonomy")` is `judgment`, no `fix`, `detail.startsWith("judge: not confirmed")`.
- **ingest, refused** — for each mutation of `clone(J.answer)`: `errors.length >= 1`, `result === null`, `judged === null`, and `errors.join("\n")` includes the fragment: delete `account` → `missing required key "account"`; `window = "2026-09-13"` → `about window`; `fixes.push({ backlog_id: "QA-79-01", check: "quote-missing", apply: true, reason: "x" })` → `not a derivable finding`; `fixes.push({ backlog_id: "QA-79-99", check: "claim-expired", apply: true, reason: "x" })` → `not a derivable finding`; `findings.push({ backlog_id: "QA-79-03", check: "cost-snapshot-missing", detail: "x" })` → `neither a judgment finding`; `fixes.push(clone(fixes[2]))` → `twice`; `fixes[0].reason = "r".repeat(201)` → `at most 200`; `fixes[0].apply = "yes"` → `apply must be a boolean`; `findings[0].detail = ""` → `detail must be a non-empty string`; `fixes = "none"` → `"fixes" must be`.
- **CLI, no creds** (`spawnCli`): `["--judge"]` → 2, stderr includes `needs --cycle-id` and not `unknown flag`; `["--judge", "--cycle-id=" + ZERO, "--board=" + FIXTURE_REL]` → 2, `never written`; `["--judge", "--cycle-id=" + ZERO]` → 2, `SUPABASE_URL`; `["--answer=x.json"]` → 2, `belong to --judge`; `["--judge", "--cycle-id=" + ZERO, "--dry-run"]` → 2, `belongs to --judge --answer`. Then `D = fs.mkdtempSync(path.join(os.tmpdir(), "agt79k-"))`, write `D/state.json` (the `state` object) and `D/answer.json` (`J.answer`): `["--judge", "--answer=" + D/answer.json, "--state-file=" + D/state.json, "--dry-run"]` → 0, `JSON.parse(stdout)` deep-equals `{ ok: true, dry_run: true, confirmed: 3, refused: 1, unconfirmed: 0, fixes: 3, insert: 7, reseen: 1, clear: 1 }`; the same with `--state-file=D/missing.json` → 2, `run pass one first`; the same with `D/bad.json` (the answer minus `account`) → 2, stderr includes `REFUSED and nothing was written` and `"account"`.
- **Live** (after part E's census, `withCreds: true`): `g1 = spawnCli(["--judge", "--cycle-id=" + ZERO], { withCreds: true })`. `assert.ok(!g1.stderr.includes("unknown flag"))`. Branch on the row: `if (g1.status === 2)` — stderr includes `no audit-board row` and `agt-79-ticket-owner-seed.sql`, `g1.stdout === ""`, `!fs.existsSync(statePathFor(os.tmpdir(), ZERO))`; `else` — `g1.status === 3` (the seed has landed: the same command now assembles), `g1.stdout.length > 1000`, stderr includes `pass one complete`, the state file exists and is deleted in a `finally`. Either way `restCount` of `runner_cycles`, `runner_decisions`, `ticket_owner_findings`, `runner_before_images` is equal before and after (pass one never writes a row). Print `[AGT-79] part K live: gate answered <status>`.

DRY-RUN against the tree before this slice (`4743bbf3`): K fails at import (`chicagoDay` is not exported); the catalog arm fails on `find` returning `undefined`; the CLI arm's `["--judge"]` exits 2 with `unknown flag`, which the `not unknown flag` assertion catches first.

## What this slice does not do

- No `agents`/`skill_profiles`/`capabilities`/`capability_skill_profiles`/`agent_capability_assignments` row; no migration; no grant; nothing under `.claude/`; no `src/`/`api/`/`lib/` change (`shared/ai-patterns.js` is data both sides import, the SES-338/AGT-70 precedent).
- No runbook, `NOTES`, cycle-card or standing-brief edit. Step 4e still runs `--nightly` alone; a judged night is not on the schedule until the landing slice that follows the seed.
- No model call in the build. The judgment sub-agent runs only from a cycle, only after the seed, and this cycle's window is not spent on one.
- It cannot run a judged night today. Pass one exits 2 at the gate on the live board (task 7 proves it); the fixture and `--dry-run` are the only ways the two-pass wiring executes before John's word.
- It does not mark the ticket. `AGT-79` stays `partial`.

## Residue for the orchestrator (not the build's)

- **Card items for John:** (1) apply `docs/design/agt-79-ticket-owner-seed.sql` attended — one transaction, a `record_decision('directive','AGT-79',…)` row, a null-row `runner_before_images` row per insert (its own header says so); rule `GV-07` vs `GV-08` while there; (2) then, attended, `node scripts/ticket-owner.js --nightly --judge --cycle-id=<cycle>` → exit 3 → the prompt as a `ticketowner` sub-agent on the judgment lane → `--answer=<file>`: the first judged night, reversible by one `reverse_decision()`; (3) slice 1's taxonomy/design_status items stand.
- **The landing slice (after the seed, one cycle):** step 4e's command becomes `--nightly --judge --cycle-id=<id>` with the exit-3 sentence step 4c already uses; `NOTES["4e"].outcome` mentions the judgment; `node scripts/render-cycle-card.js --write`; the brief's `Ticket hygiene, last night` group reads the ` · judged c/r/u` suffix from the notes it already prints; part K's live arm becomes a `--nightly --judge` arm; decide whether `report` gets a home (a column on the nightly cycle row, or a `docs/` file per night like `docs/audits/<W>.md`).
- **Two facts, not tickets:** `scripts/rank-backlog.js:396` passes `--model=claude-fable-5-1` to `agent-log.js` as a literal while `state.model` sits beside it — a stale literal on the SES-331 path, worth one line in a later hygiene pass. `validateAgentVerdict` does not descend into array item properties (verifier.js:868-916), which is why every two-pass driver re-checks its item shapes; a shared `items.properties` walk would retire three copies of that check (rank-backlog's `answerErrors`, audit-cluster's `validateFindings`, this ingest).

<!-- DeepBench v7.0.512 | AGT-79 harvest — APPEND-ONLY INCREMENT for docs/harvests/AGT-79.md. This
     section is slice 6's reasoning (design cycle 6739fa7f-22ae-444c-95c8-9577633739c1, 2026-09-16).
     The file already carries slices 1-5 (147,711 B at the time of writing); append this, do not
     overwrite. Linked once from docs/kickoffs/v7.0.512-AGT-79-unjudged-night-visible.md §1. -->

---

## Slice 6 (v7.0.512, 2026-09-16) — the unjudged night says so

### 1. Premise revalidation

The ticket's `kickoff_link` points at `docs/kickoffs/v7.0.505-AGT-79-ticket-owner-judged-night-landing.md`.
That slice HAS shipped: `docs/runbooks/runner-cycle.md` step 4e (L2031-2060) now reads
`node scripts/ticket-owner.js --nightly --judge --cycle-id=<your cycle id>` with the exit-3 ceremony and the
fallback rule (4). That kickoff is spent history and was not rebuilt.

All five of the ticket's SHIPS items are present in the tree and working:

| SHIPS item | Evidence |
|---|---|
| (1) agent + capability + skills | `capabilities.audit-board` = 1, `capability_skill_profiles` = 5, one governance agent row |
| (2) derivable fixes written | nights of 2026-09-15 and 2026-09-16 each report `fixed 3` under a `hygiene` decision handle |
| (3) `public.ticket_owner_findings` | 217 rows, 209 open, 8 distinct `check_slug` values |
| (4) runner-cycle step 4e | present, and now judged |
| (5) standing-brief block | `renderTicketHygiene` at `scripts/render-standing-brief.js:878` |

So the premise is NOT "build the Ticket Owner." It is what slice 5's own STOP LINE left open:

> Write no status — **`AGT-79` stays `partial`** until a cycle actually runs a judged night and
> `ai_activity_log` holds a `ticketowner` row.

**Premise alive.**

### 2. The live measurement

Taken 2026-09-16 in cycle `6739fa7f-22ae-444c-95c8-9577633739c1`, against Supabase and this tree.

```sql
select count(*) from ai_activity_log where agent_id = 'ticketowner';           -- 0
select count(*) from public.ticket_owner_findings;                             -- 217 (209 open)
select count(*) filter (where notes like '%· judged %') as judged,
       count(*) as nights
  from public.runner_cycles where notes like 'SCHEDULED-AGENT: audit-board%';  -- judged 0, nights 5
```

The five nights, newest first: `63fb1536` (2026-09-16 06:47:03Z), `7dffdf5f` (09-15), `8b87c407` (09-14),
`27cef94a` and `3cd2c80e` (09-13). **None carries the `· judged a/b/c on model` tail.** The newest ran AFTER
slice 5 shipped and still went arithmetic-only.

The code is not the blocker. Run on the unchanged tree (read-only — pass one writes no DB row):

```
$ node scripts/ticket-owner.js --judge --cycle-id=6739fa7f-… --state-file=<scratch>
EXIT=3
ticket-owner judge: pass one complete — 882 rows · 0 derivable · 296 judgment · model claude-fable-5-1
stdout: 92,910 bytes of assembled prompt
```

Two things fell out of that run that the census had not seen before:

- `remainder-stranded` (`SES-385`, check 12) yields **85** findings live but holds **0** rows in the ledger.
  Not a bug: `scripts/ticket-owner.js` is stamped `v7.0.506`, i.e. the check landed AFTER the 06:47Z night.
  The next night files them. Left alone deliberately.
- `derivable` is now **0** — this morning's night fixed the three that existed.

### 3. The argument for this slice

Five nights ran unjudged and nobody noticed, because an unjudged night is *silent by construction*:

- `nightlyNotes` (`scripts/ticket-owner.js:461-470`) appends the judged tail when pass two ran and appends
  the empty string otherwise. The comment above it defends that byte-identity on purpose ("an unjudged
  night's notes are byte-identical to what slice 3 wrote"). That was right when there was no judgment pass.
  It is the hole now.
- `fetchFacts` reads the nightly cycle row at `limit=1` (`scripts/render-standing-brief.js:1529-1531`) and
  `renderTicketHygiene` prints its `notes` verbatim (`:923-927`). One night, no history, no streak.
- Step 4e rule (4) tells the CYCLE to "write which happened in `notes`" — a fact carried by a cycle
  remembering to type it. That is the defect John's central-service-before-hardcoding rule names.

So the condition the whole ticket now hangs on is measurable only by hand query. This slice makes it legible
on the board. It does NOT judge a night — no build can; a judged night needs a cycle to run the sub-agent.

### 4. Alternatives considered and rejected

1. **Have the build run a judged night.** Rejected twice over: the night is already spent for 2026-09-16
   (the precondition answers `already run today`), and a design session writing live judgment rows under a
   `hygiene` decision is a build, not a design. It also would not fix the silence for the next unjudged night.
2. **Read `ai_activity_log` for the `ticketowner` count in the brief.** Rejected on a measured constraint:
   the brief's `rest()` neither pages nor forwards a Range header, and `ai_activity_log` exceeds a REST page
   (its own comment, `:1471-1473`, measured 2026-09-11). Unnecessary anyway — pass two writes the audit row
   FIRST and aborts the run if it is refused (`:1072-1081`), then calls `recordNightly` (`:1101-1104`), so
   `· judged ` in the notes implies the log row. The notes are the cheaper, sound proxy. (The kickoff carries
   this argument in one compressed sentence; the full form is here.)
3. **Use `governance_agent_usage`.** It is already read by the brief, but its window is 7 days; the streak
   wanted is "has a night EVER been judged." Rejected.
4. **Edit step 4e to press the ceremony harder.** Rejected on the byte wall: `runner-cycle.md` is
   **380,915 B** against the `SES-336` ceiling of **381,000** — 85 bytes free, so any addition must first
   remove. And the step already says the right thing; the gap is reporting, not instruction.
5. **Derive judged/unjudged purely from the absence of the tail, changing no writer.** Nearly chosen — it is
   one file. Rejected because a fact worth reporting should be written, not inferred: the explicit
   `· unjudged` marker makes every future night self-describing in `runner_cycles` for any reader, not just
   the brief. Both are shipped together and agree, because the predicate stays "contains `· judged `", which
   is correct for the five legacy rows that carry neither marker.

### 5. What this slice does not do

- It does not judge a night, does not write `ai_activity_log`, and does not move `AGT-79` off `partial`.
- It does not make the ceremony fire. A cycle that gets exit 3 with no Agent tool still falls back, by
  design (rule (4) — a hygiene pass must never wall a cycle). It will now be *visible* that it did.
- It does not touch `factsSha`, so `render-standing-brief.js --check` behaviour is unchanged — and `--check`
  already exits 1 (DRIFT) on the unchanged tree, because it hashes facts rather than rendered text.
- It does not file the 85 `remainder-stranded` findings; the next nightly run does that on its own.

### 6. The re-assembly (SES-359 / SES-376, this cycle)

The first draft of this kickoff was refused by `scripts/verifier.js --check-kickoff`: 8,182 bytes — inside
the 8,192 cap — but carrying **no `Lanes:` line**, which `kickoffLaneFinding` (`verifier.js:1490-1500`)
grades on the LINE, not the document. The draft's `runner_model_lanes` mention did not satisfy it: the match
is case-sensitive `\bLanes\b` followed by a colon on the same line, so `runner_model_lanes` is correctly not
a declaration. Adding `Lanes: session (Builder) | executor none |` to the Model bullet costs 43 bytes and
would have carried the draft to 8,225, over the cap — the two checks had to be satisfied at once.

Paid for by moving reasoning out of CONTEXT, never a task's facts (SES-376): the `rest()`-paging argument
was compressed to one clause (its full form is alternative 2 above); the QA "before" grep line and the
streak restatement in QA were tightened against §4's definition; three phrases were shortened. Re-measured
at **8,144 bytes**, and `--check-kickoff` exits 0 with `kickoff 8144 bytes, within 8192 (SES-376)`.

Two line-number corrections were made against the live tree while re-assembling, so the kickoff's read list
is exact: the nightly read is `:1529-1531` (not 1530-1532), the pass-two log/record pair is `:1072-1081` and
`:1101-1104`, and the variable the brief holds the nightly rows in is `hygRun`, not `hygRuns`.

### 7. Follow-on worth watching (not filed)

If the streak the brief now prints keeps climbing, the finding is about step 4e's ceremony being skipped by
cycles, not about the Ticket Owner's code — that would be a separate ticket against the runner's step-4e
discipline, with the streak as its evidence. Nothing to file until there are nights to point at.
