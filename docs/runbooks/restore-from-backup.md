<!-- DeepBench v7.0.317 | docs/runbooks/restore-from-backup.md | SES-220 — THE LOADER-SIDE HALVES ARE RUN AGAINST A REAL DATABASE FOR THE FIRST TIME, and the thing to read twice is WHICH CLAUSE THIS SHIP RETIRED: this file has been telling whoever is mid-outage, unconditionally, that "5 tables and 67% of the rows still will not load" and that "Defects (3) and (4) are untouched" — and tests/regression/SES-220-loadable-columns.js was PINNING that sentence with a negative control. Both were true at v7.0.298 and both went false when SES-223 (v7.0.303) and SES-230 (v7.0.312) landed. A doc guard that outlives its fact does not fail safe; it enforces the stale reading in the one document somebody reads during an outage. SELECTION: Prime Directive §2(a), John's mission directive 6acd590e ("finish its remainder — the loader-side verification its ship notes left open"). WHAT WAS ACTUALLY UNVERIFIED, measured rather than assumed: NOTHING HAS EVER RUN THE REAL LOADER AGAINST A REAL DATABASE. SES-230's guard drives restore-supabase.mjs against an HTTP STUB that hardcodes the strings 428C9 and 23502 — it proves control flow and cannot prove that Postgres produces those codes on those shapes, nor that dropping the generated column makes the real INSERT succeed; SES-223's loader arm was a DRY RUN over an invented computed_x column and there is no tests/regression/SES-223-*.js at all. So both loader-side halves were asserted and never executed. THE MEASUREMENT, on drill project itcimllfniypelrxsuoh with two sets whose .ndjson is BYTE-IDENTICAL (diff -r clean) and whose manifests differ in loadable_cols ALONE — one variable, and the NEGATIVE CONTROL IS THE PRE-SES-223 SET rather than a reimplementation agreeing with itself: manifest WITH loadable_cols -> the GENERATED ALWAYS table loads 40 of 40 and the mask RECOMPUTES on all 40 (attgenerated='s', 0 NULL, 10.0.0.7 -> 10.0.0.0), which is the LOG-124 trap facing the other way and the assertion that makes this more than a row count; manifest WITHOUT it -> 0 of 40, reported TABLE-WIDE after 25 individual retries with the REAL 428C9. The jsonb arm is VINTAGE-INDEPENDENT and that is the finding an operator most needs: SES-230's fallback needs no manifest key, so BOTH vintages load 28 of 30 and NAME the 2 with real pk + 23502 + the server's own message. A jsonb scalar null is still never restored — reported, not represented. THE EDIT THIS SHIP FORBIDS: wiring jsonb_notnull_cols into restore-supabase.mjs on the strength of §9's published contract. That column is populated on 5 tables and has NO READER, deliberately — SES-230 put five arms through the real PostgREST and no request body produces a jsonb scalar null (a JSON null IS the defect; "null" and bare CSV null both store the jsonb type string; CSV corrupts every other jsonb value on the way past). Half a contract shipped and the other half is unimplementable over this transport; saying so is why the next cycle does not spend itself rediscovering it. §5b now carries TWO one-line vintage tests (grep -c '^GRANT ' schema.sql for SES-216; grep -c '"loadable_cols"' manifest.json for SES-223) because the two repairs landed independently and a set can be on either side of each — the SES-216 §5b shape applied to defects (3) and (4). NOT CLAIMED, AND NAMED RATHER THAN LEFT TO BE FOUND: neither repair reaches a set already on disk, so BOTH sets stored offsite still lose the same 34,909 rows and the honest recovery for them is still 32.8%; the only action that changes it is a fresh dump, which is SES-191's re-drill under John's standing authorisation 1c9609de, not this ticket. ALSO CONFIRMED SHIPPED, having been an open imperative in §9 since v7.0.292: the stall now prints the server's own error (SES-223 (c)) — watched live on pass 1 printing both real causes where the retired build printed a phantom-FK sentence and no error. One cosmetic remainder named and deliberately NOT fixed: the stall heading still reads "no table made progress" when the LAST table standing fails on a pass where others loaded (failed.length === pending.length, pending having already shrunk) — misleading wording, never a wrong outcome, and it lives in the offsite repo where a fix needs a push John must authorise. NO OFFSITE PUSH WAS TAKEN (directive c98048a5 as narrowed by 1c9609de: pushing there needs his word each time; drill DUMPS are pre-authorised, pushes are not). Fixtures created in the drill project and dropped afterwards, 0 left, before-images written for both. Guarded by tests/regression/SES-220-loadable-columns.js, whose central clause is SPLIT rather than deleted — what changed and what did not are load-bearing in OPPOSITE directions, and quoting either alone is a way to be wrong. Doc + test; no src/api/lib change, no migration, no site change. -->
<!-- DeepBench v7.0.312 | docs/runbooks/restore-from-backup.md | SES-230 — A FAILED BATCH IS RETRIED ROW BY ROW, and the thing to read twice is WHERE the split fires: AFTER all six batch passes, deliberately not on the first batch failure the directive literally describes. John picked route 1 (directive 23d5fbae, attended architect session 2026-08-29, his word "1" on card c2470d0b) after option B was measured unimplementable, and his sentence is the spec: "when a batch POST fails, retry the batch row-by-row, load every loadable row, and emit a named report of each row that could not load (table, pk, SQLSTATE, reason); exit non-zero only per the runbook’s existing contract, never silently drop." THE LITERAL READING IS WRONG AND THE FILE ITSELF SAYS WHY: the multi-pass loop exists because a table can fail on pass 1 and load on pass 3 with nothing wrong with any row — foreign-key ordering — so a first-failure split issues one doomed request per row for a table whose only problem is order. The split therefore runs over exactly the tables no pass could load, on BOTH exit paths (the stall break and pass-6 exhaustion). THE DEFECT, MEASURED LIVE ON THE OFFSITE SET rather than quoted from the ticket: refresh-2026-08-28/data/pending_confirmations.ndjson holds 312 rows and exactly TWO serialise proposed_action to JSON null (ab097416-ecd5-4fa9-8c75-6c619aad3410, f98c74f1-2ed9-4b82-8af8-b00f90fb85bc) — the ticket’s figure, re-measured, unmoved. A POST is all-or-nothing, so 2 rows cost 312. After this ship the same run loads 310 and NAMES the 2, with pk + HTTP status + SQLSTATE + the server’s own message. THE SECOND DECISION, and it is what makes the fallback usable rather than theoretical: ai_activity_log is 34,761 rows and fails TABLE-wide (SES-220’s generated columns, 428C9), so splitting it is 34,761 doomed requests. PROBE_LIMIT=25 — if the first 25 individually-retried rows all fail with ONE SQLSTATE and none loads, the failure is declared table-wide and the split stops, reported as TABLE-WIDE with its row count, SQLSTATE and reason. That is a bound on wasted requests and NEVER a silent drop: it prints strictly more than the pre-change output did. THE EDIT THIS SHIP FORBIDS: moving the split into the batch loop to match the directive’s literal wording. It fights the FK multi-pass, which is the one thing in this file older than the defect. EXIT CODE unchanged in MEANING and finer in GRAIN: non-zero if anything could not load; and ZERO when the fallback rescued every row, because a table the batch loop called stuck is not stuck when all its rows load one at a time — the one case that turns a 1 back into a 0. NOT DONE, NAMED RATHER THAN LEFT TO BE FOUND: no wire format is chosen for the jsonb scalar null (SES-230’s A/B/C question is still open and still John’s — the 2 rows are REPORTED, not represented), SES-220’s generated-column defect is untouched, and nothing was re-dumped (directive c98048a5: an offsite refresh needs John’s word each time). QA WAS THE REAL SCRIPT AGAINST A STUB POSTGREST, one variable, and the NEGATIVE CONTROL IS THE PRE-CHANGE BEHAVIOUR RUNNING INSIDE THE SAME RUN: the shipped batch loop still fails on the fixture and still prints "Stalled on pass 1", and only then does the fallback load 310 — so the control is the real implementation failing rather than a reimplementation agreeing with itself (SES-45) or a grep of source text (SES-191 Part 3’s own warning). Assertions are keyed on the BATCH/SINGLE split the stub records — batch successes 0 AND single-row successes 310 — so a no-op change reads 0 and fails. FILE-LEVEL CONTROL: the guard run against origin/main’s own restore-supabase.mjs FAILS ("the stub recorded 0"); against the shipped one it PASSES. Arm 2 pins the rescue-everything case at exit 0 with ONE batch request and ZERO single-row requests, so the fallback cannot turn a healthy restore into one request per row. Build green; suite 105/106 before the CLAUDE-STATE render, the one red being SES-177’s known render drift (SES-213), green after. Verifier APPROVE (runner_verdicts 0610fbfe), auto-done ineligible — no epic on the ticket — so the ticket ships delivered and cards John. Guarded by tests/regression/SES-230-row-level-fallback.js. Stamp count held at 5 per session-hygiene check 7: v7.0.285 moved VERBATIM to docs/SESSIONS.md’s appendix, checked FIRST by grep rather than recollection — all four of its editor warnings survive in this file’s body (scoring exit criterion 5 on the structural half; the scratch-host egress allowlist as an environment fact rather than a decision John owes; the redaction bar with NAMES kept and the manifest re-hashed, §7; §5c’s new/empty-project precondition). Doc + test + one file in the offsite tooling repo; no src/api/lib change, no site change, no schema change. -->
<!-- DeepBench v7.0.298 | docs/runbooks/restore-from-backup.md | SES-220 — THE INVENTORY PUBLISHES WHICH COLUMNS A LOADER MAY SUPPLY, and the thing to read twice is that THIS IS THE IN-REPO HALF AND NOT THE FIX. Migration ses220_backup_inventory_loadable_columns appends loadable_cols and jsonb_notnull_cols to public._backup_inventory — the view the offsite dump-supabase.mjs reads its table list from. THE TICKET'S OWN ROOT CAUSE IS HALF WRONG AND IT WAS MEASURED, NOT ARGUED: SES-220 says both defects live "in public._backup_schema_ddl / the dump's column selection … NOT in dump-supabase.mjs", and read live this cycle that view ALREADY emits `caller_ip_masked text GENERATED ALWAYS AS (…) STORED` faithfully, so the restored TABLE is correct and there is nothing to repair on the schema path. The failing statement is the INSERT, and both the over-wide SELECT and the INSERT are issued by the OFFSITE scripts, which are not in this repo. So the database now publishes the machine-readable truth those scripts need, and the defects STAY LIVE in every existing set — SES-220 ships `partial`, and SES-191.blocked_by is deliberately NOT cleared, because directive b3475af4 conditions that on SES-220 reaching `done`. THE EDIT THIS SHIP FORBIDS, and it is the one that would make today's sets load: emitting caller_ip_masked as a plain column. That converts a computed privacy control into frozen data and lands a NULL mask on every post-restore insert — the LOG-124 leak rebuilt from the other side — and it also breaks v7.0.285's pinned drill criterion that the column restores as GENERATED ALWAYS with no DEFAULT. CREATE OR REPLACE with the three original columns FIRST and the new two APPENDED is the one shape Postgres accepts without a DROP, so the view's grants survive untouched and no second definition can linger; .claude/rules/supabase-function-signature.md's stale-overload hazard cannot arise because no new identity is created, asserted anyway at view_count=1, and grants asserted BOTH directions per SES-101 (service_role true, anon/authenticated FALSE — this view was never public and stays that way). QA WAS A SIX-ARM DELIBERATELY FAILING DO BLOCK (the SES-147/SES-196 rolled-back pattern) on two fixture tables, one variable each: a brand-new table is covered the instant it exists (loadable=id,caller_ip,payload — the generated column dropped with no session remembering, which is the self-healing property stated as a measurement); the NEGATIVE CONTROL is a fixture with no generated column, whose loadable_cols is ALL its columns, so the list is not merely "drop a column"; the defect reproduced at SQLSTATE 428C9 on a full-column insert; the insert driven BY loadable_cols succeeded AND recomputed the mask to xxx.0.9, which is the proof the generated semantics survive rather than freeze; SQL NULL into the jsonb NOT NULL column reproduced 23502; and 'null'::jsonb was accepted and round-tripped equal. Board re-counted afterwards: 0 fixture tables, 66 inventory rows, 312 pending_confirmations rows, zero production rows mutated — the 2 poisoned rows were deliberately NOT patched, because that hides a tooling defect in application data and leaves the class armed for durable_hops (73 MB, 3 jsonb NOT NULL columns). NAMED UNHANDLED SHAPE with an empty population: GENERATED ALWAYS AS IDENTITY needs OVERRIDING SYSTEM VALUE rather than omission, and this schema has zero of them. Guarded by tests/regression/SES-220-loadable-columns.js. Stamp count held at 5 per session-hygiene check 7: v7.0.250 moved VERBATIM to docs/SESSIONS.md's appendix, checked first by grep rather than recollection — its warnings on sequences emitted START WITH last_value+1, the raw dump's plaintext credentials and §7 redaction, and the M4 manual-refresh rule are all already restated in this file's body, and its "the root cause is the VIEW, not the script" is carried by the surviving v7.0.294 stamp and restated in §9's new block. Doc + test + migration; no src/api/lib change, no site change. -->
<!-- DeepBench v7.0.294 | docs/runbooks/restore-from-backup.md | SES-216 — schema.sql CARRIES EXECUTABLE GRANTS NOW, AND THE MANUAL RECONSTRUCTION IS KEPT RATHER THAN RETIRED, WHICH IS THE HALF A LATER EDITOR WILL GET WRONG. John's directive 07dea95e (2026-08-28T21:15Z, attended architect session, verbatim "run it", two builds in order one per cycle ahead of all board work): "(1) SES-216 … make dump-supabase.mjs emit executable grants, and remember .claude/rules/supabase-column-grants.md: production carries COLUMN-level ACLs on ai_activity_log (27 cols, caller_ip excluded, LOG-124) and ip_org_cache (7) that must survive the round trip." THE FIX IS IN THE VIEW, NOT THE SCRIPT, and that is the thing v7.0.250 already paid for: schema DDL is generated server-side by public._backup_schema_ddl and pulled verbatim, so patching dump-supabase.mjs — which lives in the offsite repo, not this one — would have changed nothing. Migration ses216_backup_schema_ddl_executable_grants, CREATE OR REPLACE with an identical column list so the view's own grants survive: 224 executable statements now emit where 0 did — 220 relation-level (one per relation/grantee/is_grantable) and 4 column-level — and acl-raw goes 68 -> 70. TWO MEASURED FINDINGS THE TICKET DID NOT NAME, both kept because its own success condition fails without them: acl-raw's relkind filter ('r','p','v','m') captured the 2 SEQUENCES in no form either, yet ai_activity_log_id_seq carries anon=rwU, without which anon's INSERT fails on a restored platform WITH the table grants already correct; and PG17's MAINTAIN is invisible to information_schema.role_table_grants (DAT-20), so the emission is derived by aclexplode() — a repair built on the information_schema views would silently drop a privilege the live ACL holds. THE EDIT THIS SHIP FORBIDS, and it is the tempting tidy-up: deleting §5b's and §9's grant-reconstruction workaround because the defect is "fixed". The EMISSION is fixed; sets are not. BOTH sets stored offsite today (selfbuild-step0-2026-08-23, refresh-2026-08-28) predate this ship and still 403 on every table, so §5b is now CONDITIONAL on when the set was dumped — one operator command, grep -c '^GRANT ' schema.sql — rather than flatly "works now", which would be true for a set nobody is holding and false for both that exist. tests/regression/SES-216-schema-grants.js pins that with manualPathSurvives, its load-bearing clause, over three independent traces of the path. THE PROPERTY AN EDITOR MUST PRESERVE ABOVE THE OTHERS: a grant is emitted ONLY for an object some other section creates, and the _backup% exclusion mirrors the views section byte-for-byte because this view never defines the two _backup_* views (SES-214, carded, deliberately not fixed here) — a GRANT on a relation the set never creates does NOT degrade gracefully, it ABORTS the restore on "relation does not exist", strictly worse than the missing grant it was meant to fix. The guard asserts the INVARIANT (grants ⊆ created, measured 68/68/0 orphans) rather than the literal filter, so it survives SES-214 moving it. QA IS A ROLLED-BACK ROUND TRIP ON PRODUCTION with one variable (the SES-147/SES-196 deliberately-failing DO block): capture the emitted statements from the healthy view, strip anon/authenticated/service_role off five relations, replay, compare an EXPLODED-ACL fingerprint (aclexplode over relacl AND attacl, sorted — not the ACL text, so a faithful restore cannot pass on aclitem[] ordering luck). baseline 2848348fbcb76545fc3c3f643e51dcb9 -> stripped 3762ac49… -> restored 2848348f…, byte-identical, with anon's table-level SELECT on ai_activity_log still FALSE, its column SELECTs exactly 27, and raw caller_ip FALSE — the LOG-124 boundary surviving the round trip rather than being argued about. THE NEGATIVE CONTROL IS THE EMISSION THIS REPLACED: replaying what it produced — nothing — leaves the stripped fingerprint unmoved, which is the defect stated as a measurement; before-image 38cf2914 records grant_rows 0 and a pre-change viewdef with no GRANT in it at all. Production re-read after the block, fingerprint unchanged. Grants asserted BOTH directions per SES-101 (service_role true, anon/authenticated false) and the column list confirmed unchanged. Four of the five Part-A predicates return false on origin/dev's runbook and true on this one; the fifth (keepsTheLog124Trap) is true on both BY DESIGN — this cycle preserved that warning rather than adding it — and its non-vacuity comes from its own inline control. Verifier verdict BLOCK (runner_verdicts 25a080d2) on a red suite, and the red is INHERITED not caused: the same two tests fail identically at origin/dev (90/92) with this diff stashed — LOG-41, already carded TWICE as SES-215/SES-217 (a placeholder anon key leaking between in-process tests; it passes standalone on the same env), and SES-177's CLAUDE-STATE drift, the close-out artifact this cycle regenerates. Per step 7a a block is not a wall: delivered, and John gets the card. NOT DONE AND NAMED RATHER THAN LEFT TO BE FOUND: SES-216 defects (3) and (4) are untouched — generated columns dumped and unrestorable (34,909 rows) and a JSON scalar null in a jsonb NOT NULL column (312 rows lost to 2) — so 5 tables and 67% of the rows still will not load, and this ship must not be read as "the restore works now"; no set is re-dumped, because John's standing rule is that offsite refresh is a manual step and the M4 gate's open question ("do not schedule, do not repeat without John's word"); and the restore-supabase.mjs diagnostic hole the ticket also names lives in the offsite repo, not this file set. Stamp count held at 5 per session-hygiene check 7: v7.0.249 moved VERBATIM to docs/SESSIONS.md's appendix, checked first by grep rather than recollection — all four of its editor warnings (the branch-not-merged claim, already explicitly corrected in this body by v7.0.291; the second tooling copy at C:/Projects/deepbench-backups; the two restore-supabase.mjs reader sites, former lines 68 and 102, the second insufficient alone; and the unscored exit criterion 5, superseded by v7.0.292) are already restated in this file's own body. Doc + test + migration; no src/api/lib change, no site change. -->
<!-- DeepBench v7.0.292 | docs/runbooks/restore-from-backup.md | SES-191 — THE DRILL RAN END TO END FOR THE FIRST TIME AND THE ANSWER IS 32.8%. John cleared the last blocker himself at 20:27Z (runner_secrets row SCRATCH_SUPABASE_SERVICE_KEY, card 528ab5ba, his own words: "read the key by that NAME, load the data half, score exit criterion 5"). It was read by name, the data half ran, and CHARTER EXIT CRITERION 5 IS STILL NOT SCORED — because "executed successfully" is not true and writing it would be the same falsehood as scoring it on the structural half. WHAT ACTUALLY HAPPENED, every number from a command run this cycle against itcimllfniypelrxsuoh with refresh-2026-08-28: the documented §5b command failed on ALL 56 tables with 403 / 42501, because schema.sql emits ZERO executable GRANT statements — it records all 68 relation ACLs as COMMENTS. THE REPAIR IS DERIVABLE FROM THE SET ITSELF (148 GRANTs reconstructed from those 68 comment lines), which is what let the drill continue and is why this is an emission-form defect and not lost data. After the repair: 51 of 56 tables loaded, 17,177 rows, EVERY loadable table matching its manifest count EXACTLY, zero mismatches — the arithmetic closes (52,403 manifest − 35,226 unrestorable = 17,177 restored), which is the proof that nothing partially loaded. FOUR DEFECTS, all new, all filed as SES-216: no executable grants; no column-level grants in any form (production's ai_activity_log column ACL is the LOG-124 privacy fix and the set does not carry it); generated columns dumped and therefore unrestorable (34,761 + 24 rows, plus 124 cascading); and a jsonb NOT NULL column holding the JSON scalar null, which cannot survive the NDJSON round trip (312 rows lost to 2). THE ONE AN EDITOR MUST READ BEFORE FIXING ANY OTHER: the obvious repair for the dark AI Audit screen is GRANT SELECT ON ai_activity_log TO anon, and that REBUILDS THE LOG-124 LEAK. The correct restore is the column list. QA IS THE DRILL, with two negative controls rather than one: the same eight app projections through the app's OWN client, production vs restored, agreeing on 6 including a 42501 that production also returns (backlog_active — a denial faithfully reproduced is evidence, not a failure); and the pre-repair 403 against the post-repair load, one variable. Doc only; no src/api/lib change, no migration, no schema change to PRODUCTION, no site change. Stamp count held at 5 per session-hygiene check 7: v7.0.245 moved VERBATIM to docs/SESSIONS.md's appendix, checked first by grep rather than recollection — all four of its editor warnings (the misleading message is the expensive part; the tooling lives in the backups repo not this one; the scratch project is John's last free slot and is not deletable by the runner; the two reader sites, line 68 being insufficient alone) are already restated in this file's own body. -->

# Platform Restore — from a backup set

**Who this is for:** anyone with (1) access to this repo, (2) access to the Supabase
project, and (3) access to the offsite backup location. It deliberately assumes
**nothing about the machine you are on** — not Windows, not `C:/Projects`, not any
prior DeepBench setup. If you are John on John's machine, everything here still works;
the machine-specific paths appear only as the *legacy defaults*.

**Why it exists:** the Supabase project (`rallojeqnkgtxgsdsnqm`, org `roadmapventure`)
is on the **free** plan — no automated backups, no PITR, no restore button. The backup
sets this runbook restores from are the only recovery net. Charter context:
`docs/SELFBUILD-CHARTER.md` §Rollback plan; provenance: `SES-169` (M0 snapshot),
gate-review card `a458c50a` (found the whole restore path was one machine deep),
`SES-193` (this runbook), `SES-192` (the offsite copy).

---

## 1. What a backup set is

One directory per snapshot, named `<label>-<YYYY-MM-DD>` (e.g.
`selfbuild-step0-2026-08-23`), containing:

| Path | What it holds |
|---|---|
| `data/<table>.ndjson` | Every base table, one JSON object per line (52 tables as of 2026-08-23; the list is **dynamic** — read from `public._backup_inventory` at dump time, so new tables are never silently skipped — `SES-81`) |
| `schema.sql` | Full schema (tables, constraints, indexes, views, functions, triggers, policies, ACLs) generated from `pg_catalog` |
| `migrations.sql` | The complete migration history — these exist **only in the database**; the repo has no `.sql` files |
| `manifest.json` | Per-table row counts, byte sizes, sha256 checksums, and dump-time PK-set verification results |
| `machine-local/` | The 7 governance hook scripts + `settings.json` + `settings.local.json` from the session machine's `.claude/` directory — **not git-tracked anywhere** |
| `RESTORE-PROCEDURE.md` | That snapshot's own restore notes (snapshot-specific; this runbook is the canonical procedure) |

The tooling (`dump-supabase.mjs`, `restore-supabase.mjs`, `verify-backup.mjs`,
`README.md`) lives in the backup location root, alongside the set directories, and is
included in the offsite copy — you do not need any of it pre-installed.

## 2. Where backup sets live

- **Primary (where dumps are taken):** `C:/Projects/deepbench-backups` on John's
  machine.
- **Offsite:** see §7 — location, contents, and refresh cadence are recorded there.
  If John's machine is gone, start from the offsite copy.

## 3. Prerequisites

- **Node.js 18+** (the scripts use global `fetch`; no Docker, no `psql`, no DB
  password).
- **Repo access:** `github.com/roadmapventure/deepbench-frontend`.
- **Supabase credentials:** the project URL and the `service_role` key, from the
  Supabase dashboard → project `rallojeqnkgtxgsdsnqm` → Settings → API. (If the
  dashboard itself is unreachable, these are exactly the credentials that cannot be
  recovered from a backup — see §6.)
- **The backup set** — copied local from the offsite location (or already on disk).

**Handing the scripts your credentials** — three ways, first match wins:

```bash
# 1. Environment variables (works anywhere)
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_SERVICE_KEY="<service_role key>"

# 2. Any env file, pointed at explicitly
export DEEPBENCH_ENV_FILE="/path/to/some.env"   # file with the two lines above

# 3. Legacy default (John's machine only): C:/Projects/deepbench-frontend/.env.local
```

Never commit these values anywhere, and never paste them into chat, docs, or tickets.

## 4. Always first: verify integrity (read-only)

```bash
node restore-supabase.mjs <backup-set-dir> --verify-only
```

Every file is re-hashed against `manifest.json`. Anything altered or missing is named
and the script exits non-zero. The restore path **refuses to run** from an altered set.

> ### History: on a machine that is not the one the dump was taken on, this step used to fail — with a misleading message
>
> **`SES-191`, `v7.0.245`, measured 2026-08-25** — the first time the recovery net was
> exercised from somewhere other than John's machine, which is the whole reason the
> offsite copy (§7) exists.
>
> **What you would have seen.** Every table reported `FILE MISSING`, then
> `Integrity: 52 problem(s).` and exit 1. Running the restore itself aborted on its own
> guard: **`Refusing to restore from an altered backup.`** The set was never altered.
>
> **Why.** `manifest.json` stores each data file's path with the **dumping machine's**
> separator: `dump-supabase.mjs` built it with `path.relative()` (lines 159 and 204),
> which on Windows yields `data\<table>.ndjson`. Both readers then resolved it with
> `path.join(dir, rec.file)` (`restore-supabase.mjs:68`, `verify-backup.mjs:28`), and on
> Linux or macOS `data\agents.ndjson` is not a directory and a file — it is one filename
> containing a literal backslash, which exists nowhere.
>
> **This is fixed — the command above now just works, no manual step.** `SES-191`,
> `v7.0.249`, measured 2026-08-25, same `selfbuild-step0-2026-08-23` set:
>
> ```
> node verify-backup.mjs
> -> files 62 | lines 51718 | malformed 0 | bad checksums 0 | PASS, exit 0
>
> node restore-supabase.mjs --verify-only
> -> "Integrity: all 52 files match their checksums", exit 0
>
> node restore-supabase.mjs --all   (dry run)
> -> exit 0, every data file read and planned
> ```
>
> Both readers now resolve either path separator on their own. **The manifest-rewriting
> workaround that used to be documented here is retired — do not hand-edit
> `manifest.json`.** It isn't just optional now, it does nothing the readers don't already
> handle themselves.
>
> The fix is on `main` of `roadmapventure/deepbench-backups-offsite` (verified live
> 2026-08-28, `DIR-c98048a5`), so a fresh clone already has it. See §9 for the one
> remaining copy that does not.

## 5. The restore, by layer

Restore only the layers you actually lost. The common case is **one table back the way
it was**, not "everything burned down."

### 5a. One table (or one row) — the common case

```bash
# Dry run (default — nothing is written):
node restore-supabase.mjs <backup-set-dir> --tables=agents

# Apply:
node restore-supabase.mjs <backup-set-dir> --tables=agents --confirm
```

Writes are **upserts on the primary key**: idempotent, re-runnable, and rows added
since the backup are left alone — this restores, it does not delete. For a single row
or just reading old values, the `.ndjson` files are plain text — grep them.

### 5b. Full data restore

```bash
node restore-supabase.mjs <backup-set-dir> --all --confirm
```

Foreign-key ordering is handled by multi-pass retry; a genuinely stuck table (parent
not in the restore set) is named at the end and exits non-zero.

**Since `SES-230` (`v7.0.312`) a stuck table is retried ROW BY ROW before that verdict is
written, so one unloadable row no longer costs the 499 it travelled with.** A POST is
all-or-nothing, and on the live offsite set that meant **2** rows of `pending_confirmations`
(the two carrying a jsonb scalar `null`) lost all **312**. The same run now loads **310** and
names the 2. What to expect in the output, and how to read it:

- `Row-level fallback: N table(s) no batch pass could load.` — the split runs **after** all six
  batch passes, never during them: a table that fails on pass 1 and loads on pass 3 is an
  ordering problem, not a row problem, and splitting it would be one doomed request per row.
- `<table>: 310 of 312 rows loaded, 2 could not load` — a row-level defect. Every unloaded row
  is then listed with its **primary key, HTTP status, SQLSTATE and the server's own message**.
  Take those keys to the `.ndjson` — it is plain text, grep it.
- `<table>: 0 of N rows loaded -- the failure is table-wide, not row-level` — the first 25 rows
  retried individually all failed with one SQLSTATE, so the split stops there and the table is
  reported whole (`TABLE-WIDE, N rows`). This is what `ai_activity_log`'s generated-column
  defect (`SES-220`, `428C9`) looks like. **Nothing is dropped silently** — the count, the
  SQLSTATE and the reason are all printed; the split simply stops buying information.
- **Exit code is unchanged in meaning:** non-zero if anything could not load, and **zero if the
  fallback rescued every row** — a table the batch loop called stuck is not stuck when all of its
  rows load one at a time.

This picks **no wire format** for the jsonb scalar `null` (`SES-230`'s A/B/C question is still
open and still John's). The 2 rows are reported, not represented.

> **HOW MUCH THIS COMMAND RECOVERS DEPENDS ENTIRELY ON WHEN YOUR SET WAS DUMPED.** Two independent
> repairs landed on 2026-08-28/29 and **neither one repairs a set already on disk** — they change
> what a *future* dump contains. So before you do anything else, ask the set you are holding which
> vintage it is. Two commands, run in the set's own directory, and they are the whole test:
>
> ```bash
> grep -c '^GRANT ' schema.sql                      # test 1 — grants  (SES-216, v7.0.294)
> grep -c '"loadable_cols"' manifest.json           # test 2 — columns (SES-223, v7.0.303)
> ```
>
> **Test 1 — `grep -c '^GRANT ' schema.sql`**
>
> - **`0` — dumped before `v7.0.294` (2026-08-28). This includes BOTH sets stored offsite today**
>   (`selfbuild-step0-2026-08-23` and `refresh-2026-08-28`), so mid-outage this is still the likely
>   answer. `schema.sql` grants nothing, every table comes back `403 / 42501`. **Do §9's grant
>   reconstruction first.**
> - **A few hundred (224 on the board as of `v7.0.294`) — dumped after it.** The grants are in
>   `schema.sql` and execute as part of §5c; **skip the reconstruction.** `SES-216` fixed the
>   emission in `public._backup_schema_ddl` (migration
>   `ses216_backup_schema_ddl_executable_grants`), and it carries the column-level grants too, so
>   the `LOG-124` trap in §9's defect (2) does not arise on such a set.
>
> **Test 2 — `grep -c '"loadable_cols"' manifest.json`**
>
> - **`0` — dumped before `v7.0.303` (2026-08-29). Again, BOTH sets stored offsite today.** The
>   manifest never says which columns a loader may supply, so `narrow()` cannot fire and every
>   generated column is sent as dumped. **Expect `ai_activity_log` (34,761 rows), `ip_org_cache`
>   (24) and `pattern_candidates` (124, cascading) to come back `TABLE-WIDE … 428C9`** — 34,909
>   rows, the 67%. §9's defect (3) has the causes. There is no repair for this from inside the set:
>   the columns are in the `.ndjson` and the manifest cannot tell the loader to ignore them.
> - **One line per table (56 on a current set) — dumped after `v7.0.303`.** The loader drops the
>   generated columns and those tables load.
>
> **WHAT A CURRENT SET ACTUALLY RECOVERS, measured through the real loader against a real Postgres
> rather than reasoned from the diff (`SES-220`, `v7.0.317` — the drill project
> `itcimllfniypelrxsuoh`, two sets whose `.ndjson` is byte-identical and whose manifests differ in
> `loadable_cols` alone):**
>
> | | manifest **has** `loadable_cols` | manifest **lacks** it (both sets on disk) |
> |---|---|---|
> | table with a `GENERATED ALWAYS` column | **40 of 40 rows restored** | **0 of 40** — `TABLE-WIDE … HTTP 400 / 428C9` |
> | its generated column afterwards | recomputed on all 40, `attgenerated = 's'`, **0 NULL** | — |
> | table with a `jsonb NOT NULL` scalar `null` | 28 of 30, **2 named** with pk + `23502` | 28 of 30, **2 named** — identical |
> | exit code | `1` | `1` |
>
> Three things to read off that table, because each is load-bearing and none is obvious:
>
> - **Defect (3) is fixed for a current set and unfixable for an old one.** The discriminator is one
>   manifest key, so the *only* action that recovers those 34,909 rows is taking a fresh dump.
> - **The generated column comes back GENERATED, not frozen.** That is the `LOG-124` trap facing the
>   other way (§9's forbidden edit): a restore that loaded the column as plain data would land a
>   `NULL` mask on every post-restore insert. It does not — the mask recomputes.
> - **Defect (4)'s fallback is vintage-INDEPENDENT.** `SES-230`'s row-level retry needs no manifest
>   key, so both vintages lose exactly the 2 poisoned rows and keep the other 310 (30-row fixture:
>   28 of 30). **A `jsonb` scalar `null` is still never restored** — it is reported, not
>   represented. Do not read "the restore works now" off this table.
>
> **So `5 tables and 67%` is the OLD-SET number and must not be quoted for a current one; and
> "the restore works now" must never be quoted for an old one.** Which sentence applies to you is
> the two commands above, never a recollection of which ship landed.

### 5c. Schema — new/empty project only

Run `schema.sql` against the new project (Supabase dashboard SQL editor works; paste
in sections if it times out). Then compare against `migrations.sql` — schema.sql is
the *current* structure, migrations.sql is the *history with rationale*. Never run
`schema.sql` against a live populated project.

### 5d. Repo — the Selfbuild rollback point

```bash
git clone https://github.com/roadmapventure/deepbench-frontend
git checkout governance-pre-selfbuild-0823   # tag on origin, dev commit 47000427 —
                                             # the last commit before any Selfbuild change
```

For an ordinary (non-rollback) rebuild, current `dev` is the state to use. Pushing a
rollback to the shared `dev` branch follows branch discipline: John's sign-off,
`push origin HEAD:dev`.

### 5e. Machine-local governance hooks

On whatever machine will run Claude Code sessions, copy `machine-local/settings.json`
and `machine-local/hooks/*.js` into the `.claude/` directory of the **parent** of the
repo checkout (on John's machine that is `C:/Projects/.claude/`; on another machine,
whatever directory you clone under — the hooks guard the session, not the repo).
`settings.local.json` is permission-allowlist state; copy it too if rebuilding John's
own machine, skip it for a fresh contributor. The hooks are a **backstop, not the
source of truth** — the written rules in `CLAUDE.md` bind even where hooks are absent.

### 5f. Resume the platform

Scheduler back on via the briefing page §2b Automation panel; re-declare any drain
John wants (drains are John-declared rows in `runner_directives`, never
self-activated).

## 6. What is NOT in a backup set (know before you need it)

- **Secret values.** The offsite copy's `data/runner_secrets.ndjson` is **redacted**
  (names and notes kept, values nulled), and the Vercel bypass secret embedded in
  `machine-local/settings.local.json`'s permission entries is replaced with
  `<REDACTED-SES-192>`. After a restore, re-enter the five named secrets from their
  sources (Anthropic console, Supabase dashboard, Vercel dashboard). **Never run a
  restore of `runner_secrets` from the offsite copy** — the upsert would overwrite
  live values with nulls. On machine loss, rotating these keys is prudent anyway.
- **Storage object contents** — bucket metadata is dumped, file contents are not.
- **Custom role passwords** — not retrievable.
- **`.env.local`** — deliberately never in any backup set; rebuild it from the same
  dashboards as above.

## 7. Offsite copy — location, contents, cadence (SES-192)

- **Location:** private GitHub repo
  **`github.com/roadmapventure/deepbench-backups-offsite`** (first upload
  2026-08-24, commit `8d608a6` — John's call, switched from the Google Drive
  candidate because Drive had no automatable upload path from this tooling).
- **Contents:** one directory per backup set, **named with its snapshot date**
  (`selfbuild-step0-2026-08-23/`), holding `data/`, `schema.sql`, `migrations.sql`,
  `manifest.json`, `machine-local/`, and the set's `RESTORE-PROCEDURE.md` — **with
  secrets redacted as described in §6** (`runner_secrets` values nulled;
  the Vercel bypass secret in `machine-local/settings.local.json` replaced with
  `<REDACTED-SES-192>`; the set's `manifest.json` re-hashed for the redacted file so
  `--verify-only` passes as-is) — plus the tooling at the repo root
  (`dump-supabase.mjs`, `restore-supabase.mjs`, `verify-backup.mjs`,
  `TOOLING-README.md`). A `.gitattributes` (`* -text`) pins byte-for-byte fidelity
  so the manifest sha256s survive a clone on any OS.
- **THE REDACTION SCAN MUST PROVE IT LOOKED, NOT ONLY THAT IT FOUND NOTHING (`v7.0.291`, found in
  the scanner itself before the real run; relocated here from that ship's retiring header stamp by
  `v7.0.317`, being the one warning in it with no copy in this body).** A raw dump carries
  `ANTHROPIC_API_KEY`, `VERCEL_TOKEN`, `SUPABASE_SERVICE_KEY` and the Vercel bypass secret as live
  plaintext, so this scan is the only thing standing between a refresh and a credential leak. The
  defect: a directory the scanner could not walk scanned **zero files and still printed PASS** —
  **"nothing matched" and "nothing was looked at" must never render the same**, so a file count of
  `0` exits `2`, not `0`. And run it in **both** directions, the second being the load-bearing one:
  a clean scan of the redacted set proves nothing on its own, because a one-directional scan passes
  on a set nobody redacted. The negative control is the same scanner against the **un-redacted**
  `runner_secrets.ndjson` a raw dump produces — at `v7.0.291` that returned **6 hits and exit 1**
  against **0 hits** over all 81 files / 155.7 MB of the redacted set.
- **Point-in-time copy.** Each set is a snapshot as of its named date. Anyone restoring
  must expect to lose everything written after that date unless a fresher set exists.
  **The CURRENT set is `refresh-2026-08-28/`** (offsite commit `5a99272`, taken
  `2026-08-28T19:47:48Z`, 56 base tables / 53,609 rows / 155.2 MB, POSIX manifest paths).
  `selfbuild-step0-2026-08-23/` is **kept alongside** it, not replaced — it is the
  Selfbuild rollback point §5d names, and a rollback point you delete is not one.
  **Restore from the newer set unless you specifically want the pre-Selfbuild platform:**
  the 2026-08-23 set's `schema.sql` cannot rebuild the database at all (§9's first bullet),
  so for structure it is not a fallback, only a data source.
- **Refresh cadence:** after every new snapshot (a snapshot is taken **before any
  session that moves data around**), commit and push the new set the same day. Each
  refresh must re-run the redaction + leak scan before committing — never push a raw
  set. Watch the per-file size: GitHub hard-rejects files over 100 MB and
  `durable_hops.ndjson` is already 73 MB; if a table dump approaches the limit,
  split it or move it to LFS (raise at the M4 gate).
- **Automated refresh is deliberately NOT solved here** (John, 2026-08-24): a cloud
  cycle re-dumping to the offsite location on a schedule, versus Supabase paid PITR,
  is the M4 gate's design question per the charter's open budget item
  (`docs/SELFBUILD-CHARTER.md` §Open questions). Until that decision, the refresh in
  the bullet above is a manual step.

## 8. Taking a new backup

```bash
node dump-supabase.mjs <backup-root>/<label>-<YYYY-MM-DD>
```

Same credential rules as §3. Keyset-paginated against a live database and PK-set
verified per table (`manifest.json` records `verified` / `missing_count` /
`extra_count`; `missing_count > 0` is the real failure and exits non-zero). Then
refresh the offsite copy per §7.

## 9. Known standing gaps

- **YOUR STANDING BACKUP SET CANNOT REBUILD THE DATABASE, AND RE-DUMPING IS THE ONLY FIX
  (`SES-191`, `v7.0.250`, measured 2026-08-25 by restoring into a scratch project).** Read this
  before you rely on `selfbuild-step0-2026-08-23` in an outage. Its `schema.sql` fails on a clean
  project for **two** independent reasons, either of which is fatal on its own:
  1. **Two sequences are referenced and never created.** `ai_activity_log.id` and `tasks.id`
     default to `nextval(...)`, and no `CREATE SEQUENCE` exists anywhere in the set. Applying it
     dies with `relation "ai_activity_log_id_seq" does not exist`.
  2. **Two generated columns are emitted as `DEFAULT`s.** `ai_activity_log.caller_ip_masked` and
     `ip_org_cache.caller_ip_masked` are `GENERATED ALWAYS AS (…) STORED` in the live database but
     were written as `DEFAULT <expr>`. Postgres refuses the whole statement:
     `cannot use column reference in DEFAULT expression`.

  **Both are fixed at source** — in `public._backup_schema_ddl`, the view the dumper pulls
  verbatim, so `dump-supabase.mjs` needed no change. The view's `CASE` handled `attidentity` and
  never `attgenerated`, and it had no sequences section at all. Proven by round trip: the DDL it
  now emits applies to a clean project, a row inserts, `caller_ip_masked` computes
  (`203.0.113.47` → `xxx.xx.113.47`, so the IP-masking privacy control survives a restore), and
  the sequence hands out **38249** — production's next value, so restored rows do not collide.
  Sequences are emitted with `START WITH last_value + 1` for exactly that reason; a bare
  `CREATE SEQUENCE` restores at 1 and looks fine until the first insert.

  **What that leaves you: A FRESH SET NOW EXISTS AND IS THE ONE TO RESTORE FROM (`DIR-c98048a5`,
  `v7.0.291`, 2026-08-28).** This bullet used to end *"until you take a fresh set, the standing one
  restores data but not structure"* — that fresh set was taken, redacted, proven and pushed on John's
  authorisation, and is `refresh-2026-08-28/` (§7). **The defect above is therefore FIXED IN THE
  ARTIFACT, not merely at source**, which is the only form of that claim worth having, since the
  artifact is what a person restores from. Proven with one variable rather than argued:
  `tests/regression/SES-191-backup-path-portability.js` Part 4, same command, `DEEPBENCH_BACKUP_SET`
  pointed at each — **PASS on `refresh-2026-08-28`, FAIL on `selfbuild-step0-2026-08-23`**, on
  `ai_activity_log_id_seq` exactly as this bullet predicts. The 2026-08-23 set keeps failing that
  test on purpose and is kept anyway as §5d's rollback point; **do not "fix" it by editing it** —
  re-dumping is the only repair, and it has now been done.

- **Refreshing the offsite copy is still a MANUAL step, and an unattended cycle must not do it
  WITHOUT JOHN'S WORD — now with a measured reason, not just §7's rule.** §7 already says automated
  refresh is John's M4 gate decision. **One cycle has done it, once, and only because he said so:**
  directive `c98048a5`, 2026-08-25, attended architect session, verbatim *"authorize the refresh"* —
  which also says *"recurring/automated refresh remains the M4 gate's open question — do not
  schedule, do not repeat without John's word."* So the rule below is unchanged for every cycle after
  that one; a later cycle finding this paragraph must not read the precedent as standing permission.
  The drill found the reason the rule exists at all: **a raw dump contains every live credential in
  plaintext.** `data/runner_secrets.ndjson` in a fresh dump carries `ANTHROPIC_API_KEY`,
  `VERCEL_TOKEN`, `SUPABASE_SERVICE_KEY` and the Vercel bypass secret as real values; the committed
  set has all five `NULL` because §7's redaction step nulls them. So "just re-dump and push it" —
  the obvious next move, and the one this cycle was one command from making — **publishes the
  platform's credentials to a git repo.** The redaction + leak scan in §7 is not bookkeeping; it is
  the only thing standing between a refresh and a credential leak. Automate the refresh only
  together with the redaction, never before it.

- **The path separator in `manifest.json` (`SES-191`) — the two-edit fix is written, measured,
  AND NOW MERGED TO `main`.** `v7.0.249`, measured 2026-08-25: `dump-supabase.mjs` now
  writes POSIX separators (new `relPosix()` helper, at the former lines 159 and 204), so
  future sets come out clean. Both readers now tolerate either separator (new `entryPath()`
  helper): `restore-supabase.mjs` needed it at **two** sites, its former line 68 *and* its
  former line 102 — that second site was not named in the original ticket and was found this
  cycle; fixing only the integrity check at line 68 would have passed `--verify-only` and
  then failed the actual data read. `verify-backup.mjs` needed it at its former line 28. Same
  `selfbuild-step0-2026-08-23` set, before/after: `verify-backup.mjs` went from files 0 / bad
  checksums 62 / FAIL to files 62 / lines 51718 / malformed 0 / bad checksums 0 / PASS, both
  exit 0; `restore-supabase.mjs --verify-only` went from "Integrity: 52 problem(s)" exit 1 to
  "Integrity: all 52 files match their checksums" exit 0; `--all` now dry-runs clean, every
  data file read and planned. **THE "NOT MERGED" HALF OF THIS BULLET IS RETIRED — it was true
  when written and is false now (`DIR-c98048a5`, `v7.0.291`, read live 2026-08-28 rather than
  recalled).** `refs/heads/main` of `roadmapventure/deepbench-backups-offsite` carries
  `relPosix()` in `dump-supabase.mjs` (lines 24 / 163 / 208) and `entryPath()` in **both**
  readers, and this cycle's fresh set was dumped and verified with exactly that `main` tooling —
  56 of 56 manifest entries POSIX. So anyone cloning the backups repo mid-outage now gets the
  **fixed** readers, and the sentence that used to sit here would have sent them looking for a
  branch to merge that is already merged. **What is still open** is only the second tooling copy
  at `C:/Projects/deepbench-backups` on John's machine, untouched and diverging until someone
  updates it — a machine-local step, not an unattended one.
- **The full restore drill** (schema + data into a clean project, end to end) is `SES-191`
  (Selfbuild M3) and is **`partial`, not done — charter exit criterion 5 is not yet scored.**
  **BOTH HALVES HAVE NOW RUN (`v7.0.292`, 2026-08-28), and the answer is 32.8%.** The structural
  half was executed at `v7.0.285`; the data half ran this cycle, after John supplied the scratch
  project's `service_role` key by name (`runner_secrets.SCRATCH_SUPABASE_SERVICE_KEY`, card
  `528ab5ba`). **The egress blocker this bullet used to carry is CLEARED** — John added
  `itcimllfniypelrxsuoh.supabase.co` to the environment's allowed domains at `19:12Z`, and
  `restore-supabase.mjs` reached the target on the first attempt afterwards.

  **What a documented full restore actually restores, measured not estimated:**

  | | |
  |---|---|
  | tables in the set | 56 |
  | tables restored | **51** |
  | tables that could not load at all | **5** |
  | rows in the set | 52,403 |
  | rows restored | **17,177 (32.8%)** |
  | rows unrestorable | **35,226 (67.2%)** |
  | loadable tables whose count did **not** match the manifest | **0** |

  That last row is the good news and it is worth reading twice: **every table that loaded, loaded
  completely.** The arithmetic closes exactly (52,403 − 35,226 = 17,177), which is what proves
  nothing loaded halfway and left a plausible-looking partial table behind.

  **Why exit criterion 5 is still NOT scored.** The criterion's own words are *"executed
  **successfully**"*. A restore that returns a third of the rows and a platform whose largest audit
  table is empty has not succeeded; writing the criterion green here would be the same falsehood as
  scoring it on the structural half was. The five stoppers are `SES-216` and are the bullet below.

  **What the restored platform can and cannot do**, measured with the app's **own** Supabase client
  and each project's publishable key, the same eight projections against production and against the
  restored copy:

  | projection | production | restored | |
  |---|---|---|---|
  | `agents`, `capabilities`, `the_library`, `platform_stats`, `skill_profiles` | ok | **ok, same counts** | ✓ |
  | `backlog_active` | `42501` denied | **`42501` denied** | ✓ *faithful* |
  | `ai_call_patterns` | 1 row | 0 rows | ✗ *its source table is empty* |
  | `ai_activity_log` | 1 row | **`42501` denied** | ✗ *the column grant is missing* |

  The `backlog_active` row is a **denial faithfully reproduced**, which is evidence the grant
  restore is right, not a failure — production denies `anon` there too. The `ai_activity_log` row
  is the real divergence and is defect (2) below.

  **What was executed.** A dump taken from live production **this cycle** was redacted, verified
  (`66 files | 53,380 lines | malformed 0 | bad checksums 0 | duplicate PKs 0 | missing PKs 0 |
  row-count mismatches 0 | PASS`) and its `schema.sql` applied to `deepbench-restore-drill`
  (`itcimllfniypelrxsuoh`) after that project's `public` schema was dropped and asserted empty —
  **0 relations, 0 functions, 0 sequences** — so §5c's *"new/empty project only"* precondition was
  met by measurement rather than assumed. Compared against live production afterwards:

  | | production | restored | |
  |---|---|---|---|
  | base tables | 56 | **56**, name-for-name identical | ✓ |
  | base-table columns | 628 | **628** | ✓ |
  | indexes | 101 | **101** | ✓ |
  | sequences | 2 | **2**, `START WITH` 38339 / 34 — production's next values | ✓ |
  | `caller_ip_masked` ×2 | `GENERATED ALWAYS` | **`GENERATED ALWAYS`**, no `DEFAULT` | ✓ |

  Those last two rows are the `v7.0.250` defects, confirmed fixed **on a set dumped today**
  rather than inferred from the view's diff — which is the only form of that claim worth having,
  since the artifact is what a person restores from.

  **The two blockers that used to sit here are both CLEARED, by John, on 2026-08-28** — the
  network egress allowlist at `19:12Z` (card `599e76bb`) and the scratch `service_role` key at
  `20:27Z` (card `528ab5ba`, entered straight into the Supabase dashboard so the value never
  transited a transcript). Neither is an open ask any more, and a later cycle finding this bullet
  must not re-card either one. **What remains is not an authorization and not an environment
  setting — it is four defects in the backup set itself**, below.

  **Still true and unchanged:** the scratch project consumes John's remaining free slot, holds a
  second full copy of platform data, and is **not deletable by the runner's own tooling**
  (`pause_project` exists; delete does not).

- **THE RESTORED PLATFORM CANNOT TAKE ANOTHER BACKUP, AND FIVE VIEWS DO NOT SURVIVE AN IN-ORDER
  RESTORE (`SES-214`, found live 2026-08-28 by the `v7.0.285` drill).** Two more defects in
  `schema.sql`, found the same way the `v7.0.250` pair was — by applying it and reading what came
  back, not by reading the file. Neither is visible from a manifest, a checksum, or a `--verify-only`.

  1. **`schema.sql` never defines `public._backup_inventory` or `public._backup_schema_ddl`.** It
     carries only their two `relacl` comment lines (`schema.sql:3743` and `:3745`). `dump-supabase.mjs`
     hard-depends on both — the table/view list comes from `_backup_inventory` (its line 46) and the
     schema DDL is pulled verbatim from `_backup_schema_ddl` (line 235) — and it exits
     **`FATAL: _backup_inventory returned no tables`** (line 265) without the first. So a platform
     rebuilt from a set can be restored **once** and can then never back itself up again. The root
     cause is one clause in the inventory view's own predicate, read from `pg_get_viewdef`:
     `AND c.relname !~~ '\_backup%'` — it excludes every relation named `_backup%`, which is exactly
     itself and its sibling. **Both definitions do survive in `migrations.sql`**, so this is
     recoverable by hand; but §5c tells you to run `schema.sql`, and nothing tells you to then go
     and hand-restore two views out of the migration history. Do that, or your next dump dies.
  2. **`schema.sql` emits VIEWS before FUNCTIONS**, so five views cannot be created at all on a
     clean in-order apply. Measured: the `VIEWS` section opens at line 1258 and `FUNCTIONS` at line
     1404, while `ai_call_patterns` (1261), `ai_pattern_classification_rollup` (1272),
     `ai_pattern_reclassification_count` (1300), `backlog_active` (1319) and `ip_spend_report` (1348)
     call `log_row_signature` (2642), `backlog_mode` (1510) and `get_ip_stats` (2287). All five failed
     live with `function … does not exist`; **all five then applied cleanly when re-run after the
     functions existed**, which is what proves the definitions are sound and the *ordering* is the
     defect. A clean in-order restore therefore yields **6 of 11 views**, with `backlog_active` —
     which the board reads — among the missing.

  **Both are fixed in the same place and neither was fixed by the drill**, deliberately: they live in
  `public._backup_schema_ddl`, the view the dumper pulls verbatim, so the fix changes what **every**
  future dump contains and deserves its own revalidation rather than riding along inside a ticket
  claimed for the drill. `SES-214` carries them, including the design question the second one raises —
  what the correct dependency-respecting emission order is, and whether a backup should back up its
  own backup views. **Until it lands, a restore is a two-step job:** run `schema.sql`, then re-run its
  `VIEWS` section a second time (idempotent — every statement is `CREATE OR REPLACE`) and restore the
  two `_backup_*` views from `migrations.sql`.
- **`schema.sql` CARRIES NO EXECUTABLE GRANTS, SO A RESTORED PLATFORM CAN NEITHER BE WRITTEN TO NOR
  READ BY THE BROWSER — plus three more stoppers (`SES-216`, found live 2026-08-28 by the
  `v7.0.292` drill).** Four defects, each fatal on its own, none of them visible from a manifest, a
  checksum, or `--verify-only`. All four were found the same way `SES-214`'s pair was: by running
  the documented restore and reading what came back.

  **Defects (1) and (2) are FIXED IN THE EMISSION as of `v7.0.294` (`SES-216`, migration
  `ses216_backup_schema_ddl_executable_grants`) — and that fixes only sets dumped AFTER it.**
  `public._backup_schema_ddl` now emits 224 executable `GRANT` statements: 220 relation-level (56
  tables + 10 views + **the 2 sequences the old `acl-raw` section missed entirely**, without which
  `anon`'s `INSERT` into `ai_activity_log` fails even with the table grants right) and 4
  column-level, carrying the `LOG-124` column list intact. Proven by a rolled-back fixture on
  production: strip `anon`/`authenticated`/`service_role` off five relations, replay the emitted
  statements, and the exploded-ACL fingerprint returns **byte-identical** to baseline
  (`2848348fbcb76545fc3c3f643e51dcb9`), with `anon`'s table-level `SELECT` on `ai_activity_log`
  still **false** and its column `SELECT`s exactly **27**. The negative control is the emission
  this replaced: replaying what it produced — nothing — leaves the stripped fingerprint unmoved.
  **Both sets stored offsite today predate the fix and still need the manual reconstruction
  below**, which is why it is kept rather than retired. Defects (3) and (4) are **fixed for a set
  dumped after `v7.0.303`/`v7.0.312` and untouched in every set on disk** — §5b's two vintage tests
  say which you are holding, and the same "the emission is fixed; the sets are not" boundary applies
  to all three defects.

  1. **No table grants.** `schema.sql` records all 68 relation ACLs as **comments**
     (`-- relacl for public.X: {…}`) and emits **zero** `GRANT` statements — `grep -c GRANT
     schema.sql` is `0`. On the restored project only the owner `postgres` holds any privilege;
     `service_role`, `anon` and `authenticated` hold none. So §5b's own command fails on **every**
     table with `HTTP 403` / `42501 permission denied for table agents`, and the browser cannot
     read anything either. **The good news, and the reason this is an emission-form bug and not
     lost data: the information is all there.** This cycle reconstructed **148 `GRANT` statements
     from those 68 comment lines** — nothing external — applied them, and the restore then ran.
     That reconstruction is the manual repair below.
  2. **No column grants, in any form.** Production carries **column-level** ACLs on exactly the two
     tables `.claude/rules/supabase-column-grants.md` governs — `ai_activity_log` (27 columns
     granted to `anon`, `caller_ip` deliberately excluded: the `LOG-124` privacy fix) and
     `ip_org_cache` (7 columns). `schema.sql` reads `pg_class.relacl` only and never
     `pg_attribute.attacl`, so **no set contains them at all** and the restored platform serves the
     AI Audit screen a `42501`. **READ THIS BEFORE YOU FIX ANYTHING ELSE HERE.** The obvious repair
     for that dark screen is `GRANT SELECT ON ai_activity_log TO anon` — and that **rebuilds the
     `LOG-124` leak**, making every visitor's IP publicly readable again. The correct restore is the
     column list, and defect (1) must be fixed in a form that carries column ACLs or it will be
     "fixed" that way by whoever is mid-outage.
  3. **Generated columns are dumped and therefore cannot be restored.** `dump-supabase.mjs` writes
     `caller_ip_masked` into the `.ndjson` for `ai_activity_log` and `ip_org_cache`; both are
     `GENERATED ALWAYS AS (…) STORED`, so PostgREST refuses the insert —
     `428C9 cannot insert a non-DEFAULT value into column "caller_ip_masked"`. **This is the direct
     cost of `v7.0.250`'s fix** that made those columns correctly generated: the two halves of the
     recovery net now contradict each other. It loses `ai_activity_log` (**34,761 rows**, the
     platform's largest table), `ip_org_cache` (24), and `pattern_candidates` (124) cascading on its
     FK — **34,909 of the 35,226 lost rows.**
  4. **A JSON `null` in a `jsonb NOT NULL` column cannot survive the NDJSON round trip.**
     `pending_confirmations.proposed_action` is `jsonb NOT NULL`, and 2 of its 312 rows hold the
     **JSON scalar `null`** (`pg_typeof` `jsonb`, `length(…::text)` = 4) — a perfectly legal value
     that satisfies `NOT NULL`. The dump serialises it as `"proposed_action": null`; the restore
     reads that back as **SQL `NULL`** and dies with
     `23502 null value in column "proposed_action" violates not-null constraint`. The whole table is
     lost to two rows. Production has **zero** SQL `NULL`s there, so nothing in the manifest, the
     checksums, or `--verify-only` can see this — **only a real restore can.**

  **THE DATABASE NOW PUBLISHES WHAT A LOADER NEEDS IN ORDER TO GET (3) AND (4) RIGHT — and that is
  the in-repo HALF of the fix, not the fix (`SES-220`, `v7.0.298`, migration
  `ses220_backup_inventory_loadable_columns`).** `public._backup_inventory` — the view
  `dump-supabase.mjs` reads its table list from — carries two appended columns:

  - **`loadable_cols`** — every live column of that relation **except** `STORED GENERATED` ones, as a
    comma-joined `quote_ident()` list. These are the columns a loader may supply a value for.
  - **`jsonb_notnull_cols`** — that relation's `jsonb NOT NULL` columns. For these, and **only** these,
    an NDJSON `null` is **unambiguous**: SQL `NULL` could never have been dumped *out of* a `NOT NULL`
    column, so the value must have been the JSON scalar `null`, and the loader may coerce it back with
    `'null'::jsonb` instead of dying on `23502`.

  **THE CONTRACT, so the offsite half has something exact to build against:** the dumper selects
  `loadable_cols` per table rather than `*`; the loader drops any key not in `loadable_cols` and coerces
  a `null` on any column in `jsonb_notnull_cols`. Live values at this ship: `ai_activity_log` **27
  loadable of 28**, `ip_org_cache` **13 of 14**, and `pending_confirmations` /
  `durable_hops` listing `proposed_action, prompt_request` / `conversation_history, llm,
  recovery_ledger` respectively — `durable_hops` being the 73 MB table, which is why the fix is generic
  rather than a two-row data patch.

  **HALF OF THAT CONTRACT SHIPPED AND THE OTHER HALF TURNED OUT TO BE UNIMPLEMENTABLE — say so here,
  because `jsonb_notnull_cols` is populated and a later reader will otherwise assume the loader uses
  it (`SES-230`, `v7.0.312`; verified again at `v7.0.317`).** The key-dropping half is live and
  measured. The coercion half is not, and cannot be over this transport: `SES-230` put **five arms**
  through the real PostgREST and **no request body produces a `jsonb` scalar `null`** — a JSON `null`
  is the defect itself (`23502`), the string `"null"` and a bare CSV `null` both store the jsonb type
  `string`, and CSV corrupts every other jsonb value on the way past. So John took **route 1**
  (directive `23d5fbae`): the two rows are **isolated and named**, never coerced. `jsonb_notnull_cols`
  therefore has **no reader today** — it is correct, published metadata waiting on a transport that
  can carry the value (a direct `psql` path would, PostgREST does not). Do not "wire it up" in
  `restore-supabase.mjs` on the strength of this paragraph; the arms are on `SES-230`'s ship card and
  they all lose.

  **NAMED DEVIATION FROM `SES-220`'s OWN TEXT, disclosed rather than buried.** The ticket says both
  defects live *"in `public._backup_schema_ddl` / the dump's column selection … NOT in
  `dump-supabase.mjs`"*. Read live this cycle, **the first half of that is false and the fix is not
  there**: `_backup_schema_ddl` already emits `caller_ip_masked text GENERATED ALWAYS AS (…) STORED`,
  faithfully, so the restored *table* is correct and there is nothing to repair in the schema path. The
  failing statement is the **INSERT**, issued by the offsite scripts. Making the DDL emit the column as
  plain — the change that would make today's sets load — is the one edit this ship forbids, because it
  converts a computed privacy control into frozen data:
  every post-restore insert lands a `NULL` mask, and that
  is the `LOG-124` leak rebuilt from the other side. **The `v7.0.317` measurement is the standing
  proof that the honest path works and this shortcut is not needed:** with the column merely omitted,
  all 40 fixture rows loaded **and the mask recomputed on every one of them**, `attgenerated` still
  `'s'`.

  **TWO 27s THAT ARE NOT THE SAME 27.** `ai_activity_log` grants `anon` **27 columns** (`caller_ip`
  excluded — the `LOG-124` fix) and has **27 loadable columns** (`caller_ip_masked` excluded). Different
  sets, same size, one coincidence. A future edit that derives either from the other breaks whichever it
  did not measure.

  **WHAT `v7.0.298` DELIBERATELY DID NOT DO, because a half named is cheaper than a half discovered.**
  It restored nothing and re-dumped nothing, and at that ship the offsite `dump-supabase.mjs` /
  `restore-supabase.mjs` still selected `*` and still inserted every key. **Both of those have since
  landed** — `SES-223` (`v7.0.303`) made the dumper select `loadable_cols` and the loader drop any key
  not in it, and `SES-230` (`v7.0.312`) added the row-level fallback — so the sentence that used to
  stand here is retired rather than deleted, because its *other* half is permanent and is now the whole
  of the caveat: **both defects remain live in every set that already exists**, including both stored
  offsite, since neither repair reaches a set already on disk. `GENERATED ALWAYS AS
  IDENTITY` is a **named unhandled shape**: such a column also rejects a supplied value, but it needs
  `OVERRIDING SYSTEM VALUE` rather than omission — omitting it would drop primary keys and break every
  FK, strictly worse than the bug — and this schema contains **zero** of them, so it is an empty
  population rather than a silent gap. The columns are computed live from `pg_attribute` at dump time,
  so a generated column added tomorrow is excluded automatically and no session has to remember.

  **AND THE DIAGNOSTIC HOLE THAT HID ALL FOUR, which is not a defect in the set but cost this drill
  the most time.** `restore-supabase.mjs` prints the underlying HTTP error only on **pass 6**, while
  its stall guard `break`s at the first pass that makes no progress. So a total failure reports one
  sentence — *"likely a foreign key whose parent is not in this restore set"* — and never shows the
  `403` that actually happened. That sentence was wrong about all five tables. Every root cause above
  had to be re-derived by hand, outside the tool, by replaying its own batching. **Print the error on
  the stall too**; mid-outage that sentence sends the person restoring after a phantom FK.

  **THAT ONE IS DONE — `SES-223` (`v7.0.303`) fixed it, and `v7.0.317` watched it work.** The stall
  now prints the server's own words for every stuck table. Measured on the drill project rather than
  read off the diff: a stalled restore printed
  `ses220_qa_gen: HTTP 400: cannot insert a non-DEFAULT value into column "caller_ip_masked"` and
  `ses220_qa_jsonb: HTTP 400: null value in column "proposed_action" … violates not-null constraint`
  — the two real causes, on pass 1, where the retired build printed the phantom-FK sentence and no
  error at all. **One cosmetic remainder, named rather than filed:** the stall's own heading still
  reads *"Stalled on pass N — no table made progress"* whenever the **last** table standing fails,
  even on a pass where other tables loaded (the guard compares `failed.length === pending.length`,
  and `pending` has already shrunk). Misleading wording, never a wrong outcome — the fallback still
  runs and still reports. It lives in the offsite repo, so fixing it needs a push John has to
  authorise; it is not worth one on its own.

  **UNTIL `SES-216` LANDS, A FULL RESTORE IS A FOUR-STEP JOB** (on top of `SES-214`'s two):
  run `schema.sql`; re-run its `VIEWS` section and restore the two `_backup_*` views from
  `migrations.sql` (`SES-214`); **reconstruct the grants from `schema.sql`'s own `relacl` comment
  lines and apply them, then re-add the two column-grant lockdowns by hand from
  `.claude/rules/supabase-column-grants.md`**; then `--all --confirm`, and expect the five tables
  above to fail. **Restore `runner_secrets` from a set only if the set is not the redacted offsite
  copy** — §6 already says never to, and `--all` does not honour that: the redacted values are
  `NULL` against a `NOT NULL` column, so the documented full-restore command exits non-zero on the
  offsite copy **by construction**, every time.

- View data can fail to dump (e.g. `ai_call_patterns`, server-side timeout) —
  harmless; views are derived and rebuild from `schema.sql`.
