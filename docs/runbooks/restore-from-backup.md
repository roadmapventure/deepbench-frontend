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

> ### ⚠ On a machine that is not the one the dump was taken on, this step fails — and the message it fails with is wrong
>
> **`SES-191`, `v7.0.245`, measured 2026-08-25** — the first time the recovery net was
> exercised from somewhere other than John's machine, which is the whole reason the
> offsite copy (§7) exists.
>
> **What you will see.** Every table reported `FILE MISSING`, then
> `Integrity: 52 problem(s).` and exit 1. Run the restore itself and it aborts on its own
> guard: **`Refusing to restore from an altered backup.`**
>
> **The set is not altered, and do not go looking for a fresher one.** Measured on the
> `selfbuild-step0-2026-08-23` offsite set from a Linux container, both directions:
> **0 of 52** manifest entries resolved as stored; **52 of 52** resolved after normalizing
> one path separator, with **0 checksum mismatches** across **50,841 rows**.
> `verify-backup.mjs` then returned `PASS — snapshot is complete and internally
> consistent` over 62 files and 51,718 lines, and a full `--all` dry run planned every
> table. The backup is fine.
>
> **Why.** `manifest.json` stores each data file's path with the **dumping machine's**
> separator: `dump-supabase.mjs` builds it with `path.relative()` (lines 159 and 204),
> which on Windows yields `data\<table>.ndjson`. Both readers then resolve it with
> `path.join(dir, rec.file)` (`restore-supabase.mjs:68`, `verify-backup.mjs:28`), and on
> Linux or macOS `data\agents.ndjson` is not a directory and a file — it is one filename
> containing a literal backslash, which exists nowhere.
>
> **Do this first, before §4's command and before anything in §5.** It edits **your local
> copy** of the set only, needs no re-dump, and invalidates no checksum — nothing hashes
> `manifest.json` itself. Verbatim, tested as written:
>
> ```bash
> node -e 'const fs=require("fs"),f=process.argv[1],m=JSON.parse(fs.readFileSync(f,"utf8"));let n=0;for(const g of [m.tables,m.views,m.auth_storage])for(const r of Object.values(g||{}))if(r&&r.file&&r.file.includes("\\")){r.file=r.file.split("\\").join("/");n++}fs.writeFileSync(f,JSON.stringify(m,null,2));console.log("normalized "+n+" entries")' <backup-set-dir>/manifest.json
> ```
>
> It printed `normalized 62 entries`, after which `--verify-only` returned
> `Integrity: all 52 files match their checksums.` and exit 0. On Windows it is a no-op —
> the separators are already native, which is exactly why this went unseen: the one machine
> that takes the dumps is the one machine that cannot reproduce it.
>
> **Do not commit the rewritten manifest back to the offsite repo.** The real fix is on the
> writer (`dump-supabase.mjs` must emit POSIX separators) plus a tolerant read on both
> readers, and it lands in `roadmapventure/deepbench-backups-offsite` — see §9.

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

- **The path separator in `manifest.json` (`SES-191`, `v7.0.245`) — the recovery net does
  not open on a non-Windows machine without §4's workaround.** Root-caused, reproduced and
  worked around above; **not fixed**, because the fix is not in this repo. It is two edits in
  `roadmapventure/deepbench-backups-offsite`: `dump-supabase.mjs` must write POSIX separators
  (`path.relative(...).split(path.sep).join('/')` at lines 159 and 204), so future sets are
  clean; and both readers must tolerate either separator
  (`path.join(dir, ...rec.file.split(/[\\/]/))` at `restore-supabase.mjs:68` and
  `verify-backup.mjs:28`), which is the half that repairs **sets already taken** — including
  the one currently standing as the offsite recovery net. A tooling copy also lives at
  `C:/Projects/deepbench-backups` on John's machine and would diverge if only one is patched.
  Carded for John; an unattended cycle does not push to the backup repo.
- **The full restore drill** (schema + data into a clean project, end to end) is `SES-191`
  (Selfbuild M3) and is **`partial`, not done — charter exit criterion 5 is not yet scored.**
  What `v7.0.245` did establish, from a machine that is not John's: the offsite copy clones,
  every file in it is byte-intact against the manifest, all 52 tables parse, and the full
  restore plan builds. What it did **not** do is write into a target or boot the platform
  against one. That step needs a scratch Supabase project — measured: org `roadmapventure` is
  on the **free** plan, a new project costs **$0/month**, a branch costs **$0.01344/hour** and
  needs a paid plan — and it would consume John's remaining free project slot, hold a second
  full copy of platform data, and be un-deletable by the runner's own tooling (`pause_project`
  exists; delete does not). That is his call, not an unattended one.
- View data can fail to dump (e.g. `ai_call_patterns`, server-side timeout) —
  harmless; views are derived and rebuild from `schema.sql`.
