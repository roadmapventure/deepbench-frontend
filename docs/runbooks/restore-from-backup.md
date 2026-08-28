<!-- DeepBench v7.0.285 | docs/runbooks/restore-from-backup.md | SES-191 — THE DRILL'S STRUCTURAL HALF IS EXECUTED AND EVIDENCED; ITS DATA HALF IS STOPPED BY A NETWORK EGRESS ALLOWLIST, WHICH IS A DIFFERENT KIND OF BLOCKER FROM THE ONE §9 CARRIED. Executed this cycle, every number from a command run: a dump taken from LIVE PRODUCTION today (64 files, 53,379 rows, 154.9 MB, 0 tables with missing rows, 0 failures, one known-harmless ai_call_patterns view warning), redacted FIRST (5 of 5 runner_secrets values nulled, names+notes kept, manifest re-hashed) and leak-scanned across all 70 files for sb_secret_/sk-ant-/eyJhbGciOiJ/the Vercel bypass secret — ZERO hits — then verified: 66 files | 53,380 lines | malformed 0 | bad checksums 0 | duplicate PKs 0 | missing PKs 0 | row-count mismatches 0 | PASS, with all 56 of 56 manifest entries POSIX, which is the v7.0.249 writer fix confirmed on a set dumped TODAY rather than argued from the diff. The scratch project's public schema was DROPPED and asserted empty (0 relations / 0 functions / 0 sequences) before schema.sql was applied, so §5c's "new/empty project only" precondition is met by measurement and not by assumption. Restored vs live production: 56/56 base tables name-for-name, 628/628 base-table columns, 101/101 indexes, both sequences present with START WITH 38339 / 34 (production's next values), and both caller_ip_masked columns GENERATED ALWAYS with no DEFAULT — i.e. v7.0.250's two fatal defects confirmed fixed on the artifact a person would actually restore from. THE BLOCKER, AND IT IS NOT A DECISION JOHN OWES: restore-supabase.mjs cannot reach the scratch project from the runner's container at all — "HTTP 403: Host not in allowlist: itcimllfniypelrxsuoh.supabase.co" — measured with a SAME-SECOND NEGATIVE CONTROL, production's host returning HTTP 200 on the identical request shape. So it is the environment's network egress settings, not a credential, a script, or a set defect. The Supabase MCP connector does reach the scratch project (that is how the schema above was applied) and can NEVER close the data half: 155 MB of row data cannot travel through tool calls. He already granted both authorizations on card a9278eca; what remains is one line of environment configuration. THE EDIT THIS SHIP FORBIDS: scoring charter exit criterion 5 on the structural half. The half that is missing is the half a real outage needs — data in the target and a platform booted against it — and this drill still has neither. SES-191 stays partial. Guarded by tests/regression/SES-191-backup-path-portability.js Part 5, NEW and aimed at the claim §9 already made with nothing behind it — that the redaction "is the only thing standing between a refresh and a credential leak" — asserting on a real set that every runner_secrets value is null, that the rows keep their NAMES (a set that nulled whole rows passes a leak check and loses the inventory of which credentials to re-enter), and that the manifest sha256 MATCHES the redacted file, because a redaction without a re-hash leaves a set that fails its own --verify-only as "file altered since backup" and the restore path then refuses to run mid-outage on the one copy that was safe to publish. Four QA arms, the decisive one being file-level: the PRE-CHANGE guard from origin/dev passes, exit 0, on a set carrying a live credential. Doc + test; no src/api/lib change, no schema change to production, no site change. -->
<!-- DeepBench v7.0.250 | docs/runbooks/restore-from-backup.md | SES-191 — THE DRILL RAN INTO A REAL SCRATCH PROJECT AND THE RECOVERY NET DID NOT REBUILD. John granted the $0 scratch slot on card a9278eca; project deepbench-restore-drill (itcimllfniypelrxsuoh) created after get_cost confirmed $0/month, so his standing dollar guard never fired. TWO INDEPENDENT FATAL DEFECTS IN schema.sql, each found by EXECUTING rather than reading: (1) ai_activity_log.id and tasks.id default to nextval() on sequences the set creates nowhere -> 'relation "ai_activity_log_id_seq" does not exist'; (2) the two GENERATED ALWAYS ... STORED columns were emitted as DEFAULT expressions -> 'cannot use column reference in DEFAULT expression', which kills the entire CREATE TABLE. Either alone makes the net un-restorable. ROOT CAUSE IS THE VIEW, NOT THE SCRIPT, and that is the thing an editor will get wrong: schema DDL is generated server-side by public._backup_schema_ddl and pulled verbatim, so patching dump-supabase.mjs would have changed nothing. The view's CASE handled a.attidentity and never a.attgenerated, and it had no sequences branch at all. Fixed in migration ses191_backup_schema_ddl_sequences_and_generated_cols, before-image first. ROUND-TRIP PROVEN, and the hand-made sequences were DROPPED first so the proof rests on the emitted DDL rather than the manual step: the new DDL applies to the clean project, a row inserts, caller_ip_masked computes 203.0.113.47 -> xxx.xx.113.47 (the LOG-124 masking control survives a restore), and id comes out 38249 — production's next value, because sequences are emitted with START WITH last_value+1; a bare CREATE SEQUENCE restores at 1 and collides with the rows the restore just loaded. THE FALSE GAP THAT WAS CHECKED AND EXCLUDED: live has 56 tables to the set's 52, but all four (briefing_comments, governance_rules, issued_versions, runner_verdicts) postdate the 2026-08-24T02:09Z snapshot — staleness, not a dumper defect, so it is not reported as one. A corrected dump was produced and verified (66 files, 52,823 lines, 0 bad checksums, all four guard parts green) and DELIBERATELY NOT COMMITTED, for two reasons the repo's own contract states and this cycle nearly walked past: John ruled automated offsite refresh is the M4 gate's open question and a manual step until then, and a RAW dump carries ANTHROPIC_API_KEY, VERCEL_TOKEN, SUPABASE_SERVICE_KEY and the Vercel bypass secret as live plaintext in data/runner_secrets.ndjson, where the committed set has all five NULL. Pushing it would have leaked every platform credential to git; §7's redaction step is the only thing preventing that, and §9 now says so with the measurement. The raw set was deleted from the container and the standing set re-verified untouched (PASS). Guarded by tests/regression/SES-191-backup-path-portability.js Part 4, whose negative control is the STANDING set — it fails there, on purpose, and passes on a post-fix set. Doc + test + migration; no src/api/lib change, no site change. -->
<!-- DeepBench v7.0.249 | docs/runbooks/restore-from-backup.md | SES-191 — THE SEPARATOR DEFECT IS FIXED IN THE TOOLING, AND §4'S MANUAL WORKAROUND IS RETIRED. John granted both authorizations on card a9278eca (2026-08-25, attended architect session, verbatim: "BOTH AUTHORIZATIONS GRANTED — the $0 scratch-restore slot and rebuilding the offsite archive so it opens machine-free"); this ship takes only the second. Three files on branch `ses191/backup-path-portability` of roadmapventure/deepbench-backups-offsite: dump-supabase.mjs gains relPosix() so manifests store POSIX separators always (future sets clean), and BOTH readers gain entryPath() so either separator resolves (the half that repairs sets ALREADY TAKEN — including the one standing as the live recovery net, which cannot be retaken retroactively). THE SITE THE TICKET DID NOT NAME, and the reason a source-level fix list was not enough: restore-supabase.mjs resolves rec.file at TWO sites, the integrity check (was :68) and the data read (was :102). Fixing only the first produces a run that reports "Integrity: all 52 files match their checksums" and then fails the actual restore — a later failure with more confidence behind it, mid-outage. MEASURED against the real stored set, both directions: verify-backup.mjs files 0 / bad checksums 62 / FAIL exit 1 -> files 62 / lines 51718 / bad checksums 0 / PASS exit 0; --verify-only "52 problem(s)" exit 1 -> "all 52 files match" exit 0; --all dry run exit 0 with every data file read and planned (that last is what exercises the :102 site — --verify-only never touches it). The writer half is a NO-OP ON LINUX, so it is proven against the Windows path flavour and labelled as a proof of the expression rather than a Windows run: path.win32.relative(...) -> "data\agents.ndjson", relPosix -> "data/agents.ndjson". Guarded by tests/regression/SES-191-backup-path-portability.js Part 3, which RUNS the real verify-backup.mjs against a foreign-separator fixture — a source grep was rejected as the gate because it passes on a script that imports the helper and forgets to call it at one of two sites, which is the bug found here — with two negative controls: the pre-fix script fails it (exit 1), and a wrong-checksum fixture must still be rejected or an unconditional exit 0 would satisfy the first assertion. WHAT THIS SHIP IS NOT, all three named rather than left to be found: the fix is ON A BRANCH AND NOT MERGED, so a fresh clone of the backups repo mid-outage still gets the broken readers (that merge is John's call — the repo is what the platform falls back to); the second tooling copy at C:/Projects/deepbench-backups is untouched and will diverge; and THE RESTORE DRILL HAS NOT RUN, so charter exit criterion 5 is still unscored and SES-191 stays `partial`, which is the honest status rather than a cautious one. Doc + test here; the three script edits live in the backups repo. No src/api/lib change, no site change. -->
<!-- DeepBench v7.0.245 | docs/runbooks/restore-from-backup.md | SES-191 — THE DRILL RAN OFF JOHN'S MACHINE FOR THE FIRST TIME AND THE RECOVERY NET DOES NOT OPEN THERE. Measured 2026-08-25 by cycle c8c2d547 against the offsite copy from a Linux container: `restore-supabase.mjs --verify-only` reported all 52 tables FILE MISSING and exited 1, and the restore path's own guard then aborts with "Refusing to restore from an altered backup." NOTHING IS ALTERED — 52 of 52 files resolve after normalizing one path separator, with 0 checksum mismatches over 50,841 rows, `verify-backup.mjs` PASS over 62 files / 51,718 lines, and a full `--all` dry run planning every table. Root cause is one writer line-pair: dump-supabase.mjs:159/204 build each manifest entry with `path.relative()`, which emits `data\<table>.ndjson` on Windows, and both readers (restore-supabase.mjs:68, verify-backup.mjs:28) `path.join()` it, where on POSIX that is one filename containing a backslash. THE MISLEADING MESSAGE IS THE EXPENSIVE PART, which is why §4 now carries the workaround rather than a ticket reference: mid-outage it points the person restoring at the integrity of their last backup instead of at a separator. WHAT THIS SHIP IS NOT: the tooling fix and the restore into a clean target are NOT here. The scripts live in `roadmapventure/deepbench-backups-offsite`, not this repo, and a scratch target is a second Supabase project on John's org — free ($0/mo, measured) but his last free slot and not deletable by the runner's tools. Both are carded for his decision; SES-191 stays `partial` and charter exit criterion 5 is NOT scored by this cycle. Guarded by tests/regression/SES-191-backup-path-portability.js, whose negative control is the naive join itself (neuter the normalization and it fails). Also deduplicated §7's twice-pasted automated-refresh bullet, found while in the file. Doc + test; no src/api/lib change, no site change. -->
<!-- DeepBench v7.0.229 | docs/runbooks/restore-from-backup.md | SES-193 — RESTORE-PROCEDURE.md generalized into git (Selfbuild M4, pulled forward attended 2026-08-24). Canonical copy: this file. The per-snapshot RESTORE-PROCEDURE.md inside each backup set remains as that snapshot's own record; where they disagree, this file wins. -->

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
> The fix lives in `roadmapventure/deepbench-backups-offsite`, branch
> `ses191/backup-path-portability` — not yet merged. See §9 for what that leaves open.

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
- **Point-in-time copy.** Each set is a snapshot as of its named date — the current
  upload is the **2026-08-23 Step 0 set**. Anyone restoring from it must expect to
  lose everything written after that date unless a fresher set exists.
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

  **What that leaves you:** the fix helps every set dumped from now on, and **does nothing for the
  set you already have.** A corrected dump was produced and verified this cycle (66 files, 52,823
  lines, 0 bad checksums, and all four guard parts green) and was **deliberately not committed** —
  see the two blockers in the bullet below. Until you take a fresh set, the standing one restores
  data but not structure. `tests/regression/SES-191-backup-path-portability.js` Part 4 fails
  against it on purpose, and passes against a post-fix set.

- **Refreshing the offsite copy is still a MANUAL step, and an unattended cycle must not do it —
  now with a measured reason, not just §7's rule.** §7 already says automated refresh is John's M4
  gate decision. The drill found the second reason: **a raw dump contains every live credential in
  plaintext.** `data/runner_secrets.ndjson` in a fresh dump carries `ANTHROPIC_API_KEY`,
  `VERCEL_TOKEN`, `SUPABASE_SERVICE_KEY` and the Vercel bypass secret as real values; the committed
  set has all five `NULL` because §7's redaction step nulls them. So "just re-dump and push it" —
  the obvious next move, and the one this cycle was one command from making — **publishes the
  platform's credentials to a git repo.** The redaction + leak scan in §7 is not bookkeeping; it is
  the only thing standing between a refresh and a credential leak. Automate the refresh only
  together with the redaction, never before it.

- **The path separator in `manifest.json` (`SES-191`) — the two-edit fix is written and
  measured, but it is not merged.** `v7.0.249`, measured 2026-08-25: `dump-supabase.mjs` now
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
  data file read and planned. **What is still open: the fix lives only on branch
  `ses191/backup-path-portability` in `roadmapventure/deepbench-backups-offsite` — it is not
  on that repo's `main`.** Anyone who clones the backups repo fresh during an outage, before
  someone merges that branch, still gets the broken readers described in §4's history. There
  is also a second tooling copy at `C:/Projects/deepbench-backups` on John's machine that has
  not been touched and will diverge from the fixed version until someone updates it too.
  Neither the merge nor that second copy is done. Merging the branch (and updating the second
  copy) is the remaining step, and it is John's call, not an unattended one.
- **The full restore drill** (schema + data into a clean project, end to end) is `SES-191`
  (Selfbuild M3) and is **`partial`, not done — charter exit criterion 5 is not yet scored.**
  **The STRUCTURAL half is now executed and evidenced (`v7.0.285`, 2026-08-28); the DATA half is
  blocked by a network egress allowlist, and that is a different kind of blocker from the one
  this bullet used to carry.** Read both halves before planning the next attempt.

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

  **What stopped it, and it is not a decision.** `restore-supabase.mjs` cannot reach the scratch
  project from the runner's cloud container at all: `HTTP 403: Host not in allowlist:
  itcimllfniypelrxsuoh.supabase.co`. Measured with a same-second negative control —
  `rallojeqnkgtxgsdsnqm.supabase.co` (production) returns **HTTP 200** on the identical request
  shape, `itcimllfniypelrxsuoh.supabase.co` returns nothing. So the environment's **network egress
  settings** admit the production Supabase host and not the scratch one. The Supabase MCP
  connector *does* reach the scratch project — that is how the schema above was applied — but
  **155 MB of row data cannot travel through tool calls**, so that channel closes the structural
  half and can never close the data half.

  **Therefore the remaining step is one line of environment configuration, not an authorization.**
  John already granted both authorizations (card `a9278eca`, 2026-08-25) and the $0 scratch slot
  is live and now holds the restored schema. Adding the scratch project's host to the
  environment's network egress allowlist is what unblocks the data restore and the platform boot;
  until then no unattended cycle can score exit criterion 5, however much budget it has.

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
- View data can fail to dump (e.g. `ai_call_patterns`, server-side timeout) —
  harmless; views are derived and rebuild from `schema.sql`.
