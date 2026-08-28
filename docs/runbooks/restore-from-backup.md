<!-- DeepBench v7.0.294 | docs/runbooks/restore-from-backup.md | SES-216 — schema.sql CARRIES EXECUTABLE GRANTS NOW, AND THE MANUAL RECONSTRUCTION IS KEPT RATHER THAN RETIRED, WHICH IS THE HALF A LATER EDITOR WILL GET WRONG. John's directive 07dea95e (2026-08-28T21:15Z, attended architect session, verbatim "run it", two builds in order one per cycle ahead of all board work): "(1) SES-216 … make dump-supabase.mjs emit executable grants, and remember .claude/rules/supabase-column-grants.md: production carries COLUMN-level ACLs on ai_activity_log (27 cols, caller_ip excluded, LOG-124) and ip_org_cache (7) that must survive the round trip." THE FIX IS IN THE VIEW, NOT THE SCRIPT, and that is the thing v7.0.250 already paid for: schema DDL is generated server-side by public._backup_schema_ddl and pulled verbatim, so patching dump-supabase.mjs — which lives in the offsite repo, not this one — would have changed nothing. Migration ses216_backup_schema_ddl_executable_grants, CREATE OR REPLACE with an identical column list so the view's own grants survive: 224 executable statements now emit where 0 did — 220 relation-level (one per relation/grantee/is_grantable) and 4 column-level — and acl-raw goes 68 -> 70. TWO MEASURED FINDINGS THE TICKET DID NOT NAME, both kept because its own success condition fails without them: acl-raw's relkind filter ('r','p','v','m') captured the 2 SEQUENCES in no form either, yet ai_activity_log_id_seq carries anon=rwU, without which anon's INSERT fails on a restored platform WITH the table grants already correct; and PG17's MAINTAIN is invisible to information_schema.role_table_grants (DAT-20), so the emission is derived by aclexplode() — a repair built on the information_schema views would silently drop a privilege the live ACL holds. THE EDIT THIS SHIP FORBIDS, and it is the tempting tidy-up: deleting §5b's and §9's grant-reconstruction workaround because the defect is "fixed". The EMISSION is fixed; sets are not. BOTH sets stored offsite today (selfbuild-step0-2026-08-23, refresh-2026-08-28) predate this ship and still 403 on every table, so §5b is now CONDITIONAL on when the set was dumped — one operator command, grep -c '^GRANT ' schema.sql — rather than flatly "works now", which would be true for a set nobody is holding and false for both that exist. tests/regression/SES-216-schema-grants.js pins that with manualPathSurvives, its load-bearing clause, over three independent traces of the path. THE PROPERTY AN EDITOR MUST PRESERVE ABOVE THE OTHERS: a grant is emitted ONLY for an object some other section creates, and the _backup% exclusion mirrors the views section byte-for-byte because this view never defines the two _backup_* views (SES-214, carded, deliberately not fixed here) — a GRANT on a relation the set never creates does NOT degrade gracefully, it ABORTS the restore on "relation does not exist", strictly worse than the missing grant it was meant to fix. The guard asserts the INVARIANT (grants ⊆ created, measured 68/68/0 orphans) rather than the literal filter, so it survives SES-214 moving it. QA IS A ROLLED-BACK ROUND TRIP ON PRODUCTION with one variable (the SES-147/SES-196 deliberately-failing DO block): capture the emitted statements from the healthy view, strip anon/authenticated/service_role off five relations, replay, compare an EXPLODED-ACL fingerprint (aclexplode over relacl AND attacl, sorted — not the ACL text, so a faithful restore cannot pass on aclitem[] ordering luck). baseline 2848348fbcb76545fc3c3f643e51dcb9 -> stripped 3762ac49… -> restored 2848348f…, byte-identical, with anon's table-level SELECT on ai_activity_log still FALSE, its column SELECTs exactly 27, and raw caller_ip FALSE — the LOG-124 boundary surviving the round trip rather than being argued about. THE NEGATIVE CONTROL IS THE EMISSION THIS REPLACED: replaying what it produced — nothing — leaves the stripped fingerprint unmoved, which is the defect stated as a measurement; before-image 38cf2914 records grant_rows 0 and a pre-change viewdef with no GRANT in it at all. Production re-read after the block, fingerprint unchanged. Grants asserted BOTH directions per SES-101 (service_role true, anon/authenticated false) and the column list confirmed unchanged. Four of the five Part-A predicates return false on origin/dev's runbook and true on this one; the fifth (keepsTheLog124Trap) is true on both BY DESIGN — this cycle preserved that warning rather than adding it — and its non-vacuity comes from its own inline control. Verifier verdict BLOCK (runner_verdicts 25a080d2) on a red suite, and the red is INHERITED not caused: the same two tests fail identically at origin/dev (90/92) with this diff stashed — LOG-41, already carded TWICE as SES-215/SES-217 (a placeholder anon key leaking between in-process tests; it passes standalone on the same env), and SES-177's CLAUDE-STATE drift, the close-out artifact this cycle regenerates. Per step 7a a block is not a wall: delivered, and John gets the card. NOT DONE AND NAMED RATHER THAN LEFT TO BE FOUND: SES-216 defects (3) and (4) are untouched — generated columns dumped and unrestorable (34,909 rows) and a JSON scalar null in a jsonb NOT NULL column (312 rows lost to 2) — so 5 tables and 67% of the rows still will not load, and this ship must not be read as "the restore works now"; no set is re-dumped, because John's standing rule is that offsite refresh is a manual step and the M4 gate's open question ("do not schedule, do not repeat without John's word"); and the restore-supabase.mjs diagnostic hole the ticket also names lives in the offsite repo, not this file set. Stamp count held at 5 per session-hygiene check 7: v7.0.249 moved VERBATIM to docs/SESSIONS.md's appendix, checked first by grep rather than recollection — all four of its editor warnings (the branch-not-merged claim, already explicitly corrected in this body by v7.0.291; the second tooling copy at C:/Projects/deepbench-backups; the two restore-supabase.mjs reader sites, former lines 68 and 102, the second insufficient alone; and the unscored exit criterion 5, superseded by v7.0.292) are already restated in this file's own body. Doc + test + migration; no src/api/lib change, no site change. -->
<!-- DeepBench v7.0.292 | docs/runbooks/restore-from-backup.md | SES-191 — THE DRILL RAN END TO END FOR THE FIRST TIME AND THE ANSWER IS 32.8%. John cleared the last blocker himself at 20:27Z (runner_secrets row SCRATCH_SUPABASE_SERVICE_KEY, card 528ab5ba, his own words: "read the key by that NAME, load the data half, score exit criterion 5"). It was read by name, the data half ran, and CHARTER EXIT CRITERION 5 IS STILL NOT SCORED — because "executed successfully" is not true and writing it would be the same falsehood as scoring it on the structural half. WHAT ACTUALLY HAPPENED, every number from a command run this cycle against itcimllfniypelrxsuoh with refresh-2026-08-28: the documented §5b command failed on ALL 56 tables with 403 / 42501, because schema.sql emits ZERO executable GRANT statements — it records all 68 relation ACLs as COMMENTS. THE REPAIR IS DERIVABLE FROM THE SET ITSELF (148 GRANTs reconstructed from those 68 comment lines), which is what let the drill continue and is why this is an emission-form defect and not lost data. After the repair: 51 of 56 tables loaded, 17,177 rows, EVERY loadable table matching its manifest count EXACTLY, zero mismatches — the arithmetic closes (52,403 manifest − 35,226 unrestorable = 17,177 restored), which is the proof that nothing partially loaded. FOUR DEFECTS, all new, all filed as SES-216: no executable grants; no column-level grants in any form (production's ai_activity_log column ACL is the LOG-124 privacy fix and the set does not carry it); generated columns dumped and therefore unrestorable (34,761 + 24 rows, plus 124 cascading); and a jsonb NOT NULL column holding the JSON scalar null, which cannot survive the NDJSON round trip (312 rows lost to 2). THE ONE AN EDITOR MUST READ BEFORE FIXING ANY OTHER: the obvious repair for the dark AI Audit screen is GRANT SELECT ON ai_activity_log TO anon, and that REBUILDS THE LOG-124 LEAK. The correct restore is the column list. QA IS THE DRILL, with two negative controls rather than one: the same eight app projections through the app's OWN client, production vs restored, agreeing on 6 including a 42501 that production also returns (backlog_active — a denial faithfully reproduced is evidence, not a failure); and the pre-repair 403 against the post-repair load, one variable. Doc only; no src/api/lib change, no migration, no schema change to PRODUCTION, no site change. Stamp count held at 5 per session-hygiene check 7: v7.0.245 moved VERBATIM to docs/SESSIONS.md's appendix, checked first by grep rather than recollection — all four of its editor warnings (the misleading message is the expensive part; the tooling lives in the backups repo not this one; the scratch project is John's last free slot and is not deletable by the runner; the two reader sites, line 68 being insufficient alone) are already restated in this file's own body. -->
<!-- DeepBench v7.0.291 | docs/runbooks/restore-from-backup.md | DIR-c98048a5 — THE STANDING RECOVERY NET IS NO LONGER THE ONE THAT CANNOT REBUILD THE DATABASE. John's directive c98048a5 (2026-08-25, attended architect session, verbatim: "authorize the refresh") executed end to end from an unattended cloud container: fresh set refresh-2026-08-28 dumped from live production (56 base tables / 53,609 rows / 155.2 MB / 0 tables with missing rows / POSIX manifest paths), redacted, proven, and pushed to deepbench-backups-offsite main at 5a99272 ALONGSIDE — never replacing — selfbuild-step0-2026-08-23. THE CLAIM THIS SHIP IS ENTITLED TO MAKE, and it is measured with ONE VARIABLE rather than argued: tests/regression/SES-191-backup-path-portability.js Part 4, same command, DEEPBENCH_BACKUP_SET pointed at each set — PASS on the new one, FAIL on the standing one, on ai_activity_log_id_seq, which is the exact defect §9's first bullet said only a re-dump could repair. So v7.0.250's fix is now confirmed IN THE ARTIFACT a person restores from, not merely in the view that generates it. THE BAR THAT ACTUALLY GUARDS THIS, and the half a later cycle will be tempted to shorten: a raw dump carries ANTHROPIC_API_KEY, VERCEL_TOKEN, SUPABASE_SERVICE_KEY and the Vercel bypass secret as live plaintext, so the redaction is the only thing between a refresh and a credential leak. It was proven BEFORE the push, in both directions — a byte-level scan of all 81 files / 155.7 MB across six credential patterns AND an exact-match arm holding the four live values read straight from the running platform returned ZERO hits, while its NEGATIVE CONTROL (the same scanner against the un-redacted runner_secrets.ndjson a raw dump produces) returned 6 hits and exit 1. A one-directional scan would have passed on a set nobody had redacted. THE DEFECT THAT CONTROL FOUND IN THE SCANNER ITSELF, fixed before the real run: a directory it could not walk scanned ZERO files and still printed PASS — "nothing matched" and "nothing was looked at" must never render the same, so files==0 now exits 2. TWO STALE CLAIMS IN THIS FILE ARE CORRECTED RATHER THAN WORKED AROUND, both read live at refs/heads/main and not recalled: §4's and §9's "the fix lives only on branch ses191/backup-path-portability, not on main" is FALSE — main carries relPosix() and both readers' entryPath(), and this very set was dumped with that main tooling. Leaving it would send someone mid-outage hunting a merge that already happened. WHAT IS CARRIED FORWARD AND SAID SO: machine-local/ is John's machine state and a cloud container cannot capture it, so it is copied verbatim from the 2026-08-23 set and LABELLED as of 2026-08-23 in the new set's own RESTORE-PROCEDURE.md — included rather than omitted so the newer set is not a downgrade for hooks, labelled rather than copied silently so five-day-old machine files are not dated as fresh. NOT FIXED HERE, named rather than left to be found: SES-214's two schema.sql defects (the two _backup_* views undefined; VIEWS emitted before FUNCTIONS) are in this set as in every set dumped today — they live in public._backup_schema_ddl, they change what EVERY future dump contains, and they deserve their own revalidation rather than riding along inside a directive claimed for a refresh. The new set's procedure file carries the two-step workaround. AND THE PRECEDENT IS EXPLICITLY NOT WIDENED: the directive's own words are "recurring/automated refresh remains the M4 gate's open question — do not schedule, do not repeat without John's word", so §7's manual-step rule and §9's unattended-cycle prohibition stand unchanged for every cycle after this one. Stamp count held at 5 per session-hygiene check 7: v7.0.229 moved VERBATIM to docs/SESSIONS.md's appendix, checked first by grep rather than recollection — its one editor warning (the per-snapshot RESTORE-PROCEDURE.md is that snapshot's own record and this runbook wins where they disagree) is already restated in §1's table at the RESTORE-PROCEDURE.md row. Doc only; no src/api/lib change, no schema change, no site change. -->
<!-- DeepBench v7.0.285 | docs/runbooks/restore-from-backup.md | SES-191 — THE DRILL'S STRUCTURAL HALF IS EXECUTED AND EVIDENCED; ITS DATA HALF IS STOPPED BY A NETWORK EGRESS ALLOWLIST, WHICH IS A DIFFERENT KIND OF BLOCKER FROM THE ONE §9 CARRIED. Executed this cycle, every number from a command run: a dump taken from LIVE PRODUCTION today (64 files, 53,379 rows, 154.9 MB, 0 tables with missing rows, 0 failures, one known-harmless ai_call_patterns view warning), redacted FIRST (5 of 5 runner_secrets values nulled, names+notes kept, manifest re-hashed) and leak-scanned across all 70 files for sb_secret_/sk-ant-/eyJhbGciOiJ/the Vercel bypass secret — ZERO hits — then verified: 66 files | 53,380 lines | malformed 0 | bad checksums 0 | duplicate PKs 0 | missing PKs 0 | row-count mismatches 0 | PASS, with all 56 of 56 manifest entries POSIX, which is the v7.0.249 writer fix confirmed on a set dumped TODAY rather than argued from the diff. The scratch project's public schema was DROPPED and asserted empty (0 relations / 0 functions / 0 sequences) before schema.sql was applied, so §5c's "new/empty project only" precondition is met by measurement and not by assumption. Restored vs live production: 56/56 base tables name-for-name, 628/628 base-table columns, 101/101 indexes, both sequences present with START WITH 38339 / 34 (production's next values), and both caller_ip_masked columns GENERATED ALWAYS with no DEFAULT — i.e. v7.0.250's two fatal defects confirmed fixed on the artifact a person would actually restore from. THE BLOCKER, AND IT IS NOT A DECISION JOHN OWES: restore-supabase.mjs cannot reach the scratch project from the runner's container at all — "HTTP 403: Host not in allowlist: itcimllfniypelrxsuoh.supabase.co" — measured with a SAME-SECOND NEGATIVE CONTROL, production's host returning HTTP 200 on the identical request shape. So it is the environment's network egress settings, not a credential, a script, or a set defect. The Supabase MCP connector does reach the scratch project (that is how the schema above was applied) and can NEVER close the data half: 155 MB of row data cannot travel through tool calls. He already granted both authorizations on card a9278eca; what remains is one line of environment configuration. THE EDIT THIS SHIP FORBIDS: scoring charter exit criterion 5 on the structural half. The half that is missing is the half a real outage needs — data in the target and a platform booted against it — and this drill still has neither. SES-191 stays partial. Guarded by tests/regression/SES-191-backup-path-portability.js Part 5, NEW and aimed at the claim §9 already made with nothing behind it — that the redaction "is the only thing standing between a refresh and a credential leak" — asserting on a real set that every runner_secrets value is null, that the rows keep their NAMES (a set that nulled whole rows passes a leak check and loses the inventory of which credentials to re-enter), and that the manifest sha256 MATCHES the redacted file, because a redaction without a re-hash leaves a set that fails its own --verify-only as "file altered since backup" and the restore path then refuses to run mid-outage on the one copy that was safe to publish. Four QA arms, the decisive one being file-level: the PRE-CHANGE guard from origin/dev passes, exit 0, on a set carrying a live credential. Doc + test; no src/api/lib change, no schema change to production, no site change. -->
<!-- DeepBench v7.0.250 | docs/runbooks/restore-from-backup.md | SES-191 — THE DRILL RAN INTO A REAL SCRATCH PROJECT AND THE RECOVERY NET DID NOT REBUILD. John granted the $0 scratch slot on card a9278eca; project deepbench-restore-drill (itcimllfniypelrxsuoh) created after get_cost confirmed $0/month, so his standing dollar guard never fired. TWO INDEPENDENT FATAL DEFECTS IN schema.sql, each found by EXECUTING rather than reading: (1) ai_activity_log.id and tasks.id default to nextval() on sequences the set creates nowhere -> 'relation "ai_activity_log_id_seq" does not exist'; (2) the two GENERATED ALWAYS ... STORED columns were emitted as DEFAULT expressions -> 'cannot use column reference in DEFAULT expression', which kills the entire CREATE TABLE. Either alone makes the net un-restorable. ROOT CAUSE IS THE VIEW, NOT THE SCRIPT, and that is the thing an editor will get wrong: schema DDL is generated server-side by public._backup_schema_ddl and pulled verbatim, so patching dump-supabase.mjs would have changed nothing. The view's CASE handled a.attidentity and never a.attgenerated, and it had no sequences branch at all. Fixed in migration ses191_backup_schema_ddl_sequences_and_generated_cols, before-image first. ROUND-TRIP PROVEN, and the hand-made sequences were DROPPED first so the proof rests on the emitted DDL rather than the manual step: the new DDL applies to the clean project, a row inserts, caller_ip_masked computes 203.0.113.47 -> xxx.xx.113.47 (the LOG-124 masking control survives a restore), and id comes out 38249 — production's next value, because sequences are emitted with START WITH last_value+1; a bare CREATE SEQUENCE restores at 1 and collides with the rows the restore just loaded. THE FALSE GAP THAT WAS CHECKED AND EXCLUDED: live has 56 tables to the set's 52, but all four (briefing_comments, governance_rules, issued_versions, runner_verdicts) postdate the 2026-08-24T02:09Z snapshot — staleness, not a dumper defect, so it is not reported as one. A corrected dump was produced and verified (66 files, 52,823 lines, 0 bad checksums, all four guard parts green) and DELIBERATELY NOT COMMITTED, for two reasons the repo's own contract states and this cycle nearly walked past: John ruled automated offsite refresh is the M4 gate's open question and a manual step until then, and a RAW dump carries ANTHROPIC_API_KEY, VERCEL_TOKEN, SUPABASE_SERVICE_KEY and the Vercel bypass secret as live plaintext in data/runner_secrets.ndjson, where the committed set has all five NULL. Pushing it would have leaked every platform credential to git; §7's redaction step is the only thing preventing that, and §9 now says so with the measurement. The raw set was deleted from the container and the standing set re-verified untouched (PASS). Guarded by tests/regression/SES-191-backup-path-portability.js Part 4, whose negative control is the STANDING set — it fails there, on purpose, and passes on a post-fix set. Doc + test + migration; no src/api/lib change, no site change. -->

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

> **Whether this command works depends on WHEN your set was dumped — and the message it gives you
> when it fails is wrong either way.** Check the set you are holding before you do anything else.
> It is one command, and it is the whole test:
>
> ```bash
> grep -c '^GRANT ' schema.sql
> ```
>
> - **`0` — a set dumped before `v7.0.294` (2026-08-28). This includes BOTH sets stored offsite
>   today** (`selfbuild-step0-2026-08-23` and `refresh-2026-08-28`), so mid-outage this is still
>   the likely answer. `schema.sql` grants nothing, every table comes back `403 / 42501`, and the
>   script blames a foreign key. **Do §9's grant reconstruction first.**
> - **A few hundred (224 on the board as of this ship) — a set dumped after `v7.0.294`.** The
>   grants are in `schema.sql` and execute as part of §5c; **skip the reconstruction.** `SES-216`
>   fixed the emission in `public._backup_schema_ddl` (migration
>   `ses216_backup_schema_ddl_executable_grants`), and it carries the column-level grants too, so
>   the `LOG-124` trap in §9's defect (2) does not arise on such a set.
>
> **Either way, 5 tables and 67% of the rows still will not load** — §9's `SES-216` bullet has the
> numbers and the causes. `SES-216` defects (3) and (4) are **not** fixed, and no set is exempt
> from them.

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
  below**, which is why it is kept rather than retired. Defects (3) and (4) are untouched.

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

  **AND THE DIAGNOSTIC HOLE THAT HID ALL FOUR, which is not a defect in the set but cost this drill
  the most time.** `restore-supabase.mjs` prints the underlying HTTP error only on **pass 6**, while
  its stall guard `break`s at the first pass that makes no progress. So a total failure reports one
  sentence — *"likely a foreign key whose parent is not in this restore set"* — and never shows the
  `403` that actually happened. That sentence was wrong about all five tables. Every root cause above
  had to be re-derived by hand, outside the tool, by replaying its own batching. **Print the error on
  the stall too**; mid-outage that sentence sends the person restoring after a phantom FK.

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
