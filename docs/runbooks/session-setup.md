<!-- DeepBench v7.0.843 | docs/runbooks/session-setup.md | AGT-451 — §3f(b): BEFORE the Builder is spawned, an attended session measures the baseline where it CAN be measured — credentialed `node scripts/pre-build-baseline.js --kickoff=<the kickoff path> --out=$S/pre-build-baseline-<the supervised cycle id>.txt` over the kickoff's own declared files — and pastes that block into the Builder's opening line; §3e's verifier reads the SAME file as `--pre-build-baseline=`. Measured on `v7.0.827`: a Designer turn with no credentials wrote `Red set: 0 of 2` over a tree holding six standing reds, because five of the six declare their arms `notRun` and report green without a database — so all six would have graded as the Builder's own newly-red work. `scripts/verifier.js` refuses such a block when the flag is handed (`kickoff-baseline-uncredentialed`, `remedy_owner: cycle`) and says NOT GRADED when it is not. ROTATION: `v7.0.462` (`SES-359`) DROPPED, count 5, `SES-164` step 2 by grep FIRST — its facts are stated in §3f's own body: the (a)/(b)/(c) three-statement block, `--check-kickoff` before the save, `kickoff_markdown`/`harvest_markdown`, the `Agent` `model` rule and §3e's `--kickoff=` arming all live there. -->
<!-- DeepBench v7.0.793 | docs/runbooks/session-setup.md | AGT-391 — §3e: the attended verifier runs the RELATED set (`scripts/related-tests.js --diff=<your push sha>^` → `--related=`), graded against the kickoff's BASELINE block; §3f(b): the Builder runs the related set, never the full suite, which runs weekly and before a release (`docs/runbooks/release-to-main.md`). Stamp count held at 5: v7.0.455 (SES-374) dropped — its facts live in §3g's body. -->
<!-- DeepBench v7.0.545 | docs/runbooks/session-setup.md | AGT-86 slice 1d — §3d: the restorable list is fifteen (audit_findings, v7.0.543); ses-399's clause re-pinned. Stamp count held at 5 per session-hygiene check 7: v7.0.426 (SES-331) dropped rather than relocated, SES-164 step 2 run FIRST by grep over this body — agent-prompt.js 5, agent-log.js 4, call_source 1, {{rule:B40}} 1 -->
<!-- DeepBench v7.0.484 | docs/runbooks/session-setup.md | SES-388 — §3g: THE ALWAYS-ON READER READS THE METER FROM RATE-LIMIT HEADERS, NOT FROM THE CLI, AND THE REASON IS A MEASUREMENT RATHER THAN A DESIGN PREFERENCE. `.github/workflows/meter-reader.yml` now runs `node scripts/read-usage-meter.js --via-headers` every 30 minutes on GitHub with no CLI installed at all: on runner `34864955276` a `claude setup-token` token signs in but `/api/oauth/usage` answers 403 `oauth_scope_insufficient` (needs `user:profile`) and `claude -p "/usage"` prints the session cost summary instead of the three meter lines, so the CLI path cannot work off John's machine however it is installed. The SAME token does get the meter back in the headers of a one-token `POST /v1/messages` (runs `34864955276` / `34865128090`): 5h and 7d utilization plus both reset epochs on `claude-haiku-4-5-20251001`, and `-7d_oi-utilization` — the Fable week, 0.91 that day — on `claude-fable-5-1`, which is why there are TWO calls and not one. Rows from GitHub carry `source = 'meter-reader-headers'`; John's scheduled task is untouched and still writes `'meter-reader'`; `runner_should_boot()` reads the newest row whatever wrote it. Script + test + workflow + this doc; no src/api/lib change, no schema change, no site change. Stamp count held at 5 per session-hygiene check 7: `v7.0.412` (`SES-320`) **dropped rather than relocated**, with `SES-164` step 2 run FIRST by grep over this body rather than from recollection — its `closed` OUT column, the `ses320_delivered_exit` migration and the delivered→`done` exit are restated at the `<!-- FEATURE: SES-320 -->` block under the sweep in §4, its Reverse half at the second `SES-320` block, and its one EDITOR WARNING (the sweep's close must not bump `updated_at`, because `reverse_decision()` refuses a row whose live `updated_at` postdates `decided_at`) is stated in the body twice over, at that Reverse paragraph and again at the `reverse_decision()` guard paragraph — so nothing unique was lost to the rotation. -->
<!-- DeepBench v7.0.472 | docs/runbooks/session-setup.md | SES-345 — §3e's VERDICT NOW NAMES THE TREE IT GRADED, AND THE EQUALITY CHECK IS THE POINT: `<your push sha>` MUST equal `select graded_sha from public.runner_verdicts where id = '<verdict id>'`, and a mismatch means the tree graded is not the tree pushed — re-run the verifier on the pushed HEAD, never pass the sha through. `runner_verdicts.graded_sha` (migration `ses345_verdict_graded_sha`, `CHECK (graded_sha IS NULL OR graded_sha ~ '^[0-9a-f]{7,40}$')`, down classification `refused` — an in-place `ALTER`, so a red range containing it is card-only) is written by `gradedShaFor()` in `scripts/verifier.js`: ONE `git rev-parse HEAD` in the mechanical lane, beside the diff the gates ran against, carried into both judge lanes and read back out of the pass-one context file at record time rather than re-read — pass two runs after the sub-agent has spoken, and a second `rev-parse` would name the tree the JUDGMENT was filed on instead of the tree the GATES ran on. WHY AN ATTENDED SESSION NEEDS THIS SENTENCE AT ALL, measured 2026-09-13 rather than argued: of 56 verdicts in 7 days, **32 hang off the single shared attended cycle `a8000000` — 23 tickets, one `push_sha`** — so for an attended ship the cycle row's sha has never been evidence about that ticket's tree, and `ship_handoff_census`'s sha leg (now joined on `left(graded_sha,7)`, because attended cycles store short shas) could not tell the two apart. The §3e paragraph is the only body change; the exit-code convention, the `--kickoff=` arming sentence and the ladder call below it are untouched. Stamp count held at 5 per session-hygiene check 7: `v7.0.411` (`SES-004` (b)) **dropped rather than relocated**; `SES-164` step 2 run FIRST by grep over this body rather than from recollection — its whole claim about THIS file is 3d's `pattern:N` sentence, live at the `<!-- FEATURE: SES-004 -->` block (`pattern:` 2 hits, `pattern:0` 1, `public.runner_decision_patterns` 1, the `runner-cycle.md` step 7b cross-reference present), and its one zero-hit name, `docs/JOHN-DECISION-PATTERNS.md`, was a fact about THAT file's own md-header remainder and never a fact this body carried — so nothing was lost to the rotation. Doc + script + test + card + one migration; no `src/`/`api/`/`lib/` change, no site change. -->

# Session Setup — Worktree, Counters, Inflight, Push

CLAUDE.md's router points here for the commands. The **rules** (worktree isolation,
`HEAD:dev`, atomic counters, no `cd &&` compounds) are stated as hard rules in CLAUDE.md and are
not restated here — this file is the procedure that satisfies them. Run everything from step 1
onward *before* any orientation read.

All commands use `git -C "<path>" …` — never `cd "<path>" && …` (CLAUDE.md hard rule: a `cd &&`
compound triggers a non-suppressible permission prompt).

Supabase project for both counters: **`rallojeqnkgtxgsdsnqm`** (via the Supabase MCP `execute_sql`).

---

## Start of session

### 1. Create the worktree (branch explicitly from `origin/dev`)

One command runs all ten open steps, in the runbook's order:

```
node scripts/open-session.js --name=<short-session-name> --ticket=<ID> [--version] [--ids=<PREFIX>:<N>] [--dry-run] [--json]
```

It checks the name for a collision first (a generic name collides under 5-7 concurrent sessions, so
carry a topic hint, not just a date), fetches, and adds the worktree branched **explicitly from
`origin/dev`** - this repo's remote default is `main`, so any tool that branches from "the default
branch" branches from the wrong place. Exit **0** opened, **2** `no-credentials` or
`worktree-exists`, **3** `claim-held` naming the holder. Do **not** use the `EnterWorktree` tool:
the working directory is `C:/Projects` (the repo's parent), so it errors.

### 1b. Copy `.env.local` into the new worktree

`.env.local` is gitignored, so `git worktree add` never brings it along, and a worktree missing it
hits a silent blank-page failure at Supabase-client construction. Step 4 of `open-session.js` copies
it in and **filters it to the publishable names as it copies**, so a shared copy that grew a
privileged key back cannot propagate it.

**`.env.local` carries publishable values only — John's ruling `d7670e18`, enforced `SES-260`
(2026-09-02, v7.0.381).** `SUPABASE_URL`, `VITE_*`, `ALLOWED_ORIGIN` and nothing else. The
privileged keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_KEY`, `VERCEL_TOKEN`,
`VERCEL_AUTOMATION_BYPASS_SECRET`) were removed from all 25 copies on this machine; a copy that
grows one back fails `tests/regression/ses-260-env-local-publishable-only.test.mjs`. Each has one
sanctioned home, and a session that needs one borrows it for the session, **never inside the repo**:

- **Live tests / anything needing the Anthropic, OpenAI or service key** → read the value **by
  name from `public.runner_secrets` over the Supabase MCP** and export it inline for the one
  command that needs it — the runner's own convention (routine prompt step 3: *"secrets by NAME
  from runner_secrets … never print a secret value anywhere"*), exported as env, **never written to
  a file**:
  ```
  SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node tests/regression/run-all.js
  ```

Exit **2** `no-credentials` names whichever of `SUPABASE_URL` / `SUPABASE_LEAN_KEY` (or `SUPABASE_SERVICE_KEY`) is missing; the lean key's home and lane: `docs/runbooks/lean-lane.md`.
**`VERCEL_TOKEN`** is not needed on this desktop (the Vercel CLI is logged in);
**`VERCEL_AUTOMATION_BYPASS_SECRET`** is not a Vercel env var — read it by name from
`public.runner_secrets` into the environment for the one command that needs the header, never into a
file. **The runner** reads all of these by name and is unaffected.

### 1c. Work against the worktree path for the rest of the session

Do all Read/Edit/Write/Bash work against the worktree's absolute path
(`C:/Projects/deepbench-frontend/.claude/worktrees/<short-session-name>/…`), never the shared
checkout. For git, use `git -C "<worktree-path>" <command>`.

If this session spawns any sub-agent, state that absolute worktree path verbatim in the sub-agent's
prompt (CLAUDE.md hard rule — a sub-agent given a bare task defaults to the shared checkout).

### 2. Create your inflight file — right after the worktree, not later

`open-session.js` step 6 creates `inflight/<short-session-name>.md` and step 7 stages it. **(Repo
root - moved out of `.claude/inflight/` 2026-08-21, John-approved, register B41: `.claude/` paths
fire a harness permission prompt that parks unattended cloud sessions for hours. Same filename, same
content, same lifecycle - only the directory changed.)** One line: worktree name, plus a clause on
the topic if known. **Only ever edit or delete your own.** Why it can't wait: a worktree
mid-conversation that hasn't committed anything is byte-for-byte identical on disk to one that
finished and was never cleaned up, so this file is the only signal that tells `session-hygiene`'s
staleness check (and other sessions) that a quiet worktree is still wanted.

### 2b. Stage and push it in your **first** commit — creating it is not enough (`SES-23`)

```
git -C "<worktree-path>" add "inflight/<short-session-name>.md"
```

The marker only does its job once it's on `origin/dev` — that's the only copy `session-hygiene`'s
check 5 and every concurrent session can see. A marker sitting untracked in your own worktree is
invisible to all of them, so a session that creates it correctly and then commits only its actual
work files (`git add docs/FEATURES.md`) still reads to everyone else as a finished, cleanable
worktree while it's mid-flight.

**Explicitly stage it — don't rely on `git add -A`/`git commit -a` happening to sweep it up.** If your
first real commit is narrowly scoped to an explicit path list, add this path to that list. If a long
session hasn't needed a commit yet, commit the marker on its own rather than leaving it untracked for
hours; it's a pure append, so the lightweight bookkeeping path below covers it.

*Found live 2026-07-23: four worktrees simultaneously — `design-chi-beta-triage-0722`,
`design-log-23-0722`, `design-session-0723b`, `design-session-0723c` — each had a correctly-created
marker on disk that had never been staged, so all four presented to `check-session-docs.js` as
finished-and-abandoned during a housekeeping pass, two of them while under 45 minutes old. Nothing
was lost, but only because the pass checked disk before acting on the flag. Before this step existed,
every written instruction was satisfied and the marker still never reached `dev` — its only
guaranteed appearance in git history was step 5's commit deleting it.*

### 2c. Claim your ticket the moment you start working one (SES-86 phase 1, John, 2026-08-21)

`open-session.js` step 8 makes this claim, and its exit **3** `claim-held` is the 0-row answer.
Manual sessions and scheduled cycles share one board, so the ticket itself is the coordination point
- claim it the moment this session commits to a specific `backlog_items` ticket, in one atomic write:

<!-- {{rule:B40}} · rendered from public.governance_rules — do not hand-edit the quoted line(s)
     below. Edit the registry row, re-export docs/governance/RULES-SNAPSHOT.md, then run
     `node scripts/render-rule-blocks.js --write`. Checked by that script's default mode (SES-175). -->
> **Rule B40** — Claim a backlog ticket atomically via claimed_by/claimed_at columns at pick time (any session, manual or scheduled); a claim expires after 6h, never a STOPPED-BY-JOHN one, so a dead session can't strand a ticket.

```sql
UPDATE public.backlog_items
   SET claimed_by = '<short-session-name>', claimed_at = now()
 WHERE backlog_id = '<TICKET-ID>'
   AND status <> 'done'
   AND public.claim_exclusion_reason(claimed_by, claimed_at) IS NULL
RETURNING backlog_id;
```

<!-- FEATURE: SES-316 — the claim stops bumping updated_at. -->
**A claim is coordination, not a judgment write — and it deliberately does NOT touch `updated_at`
(`SES-316`).** Bumping it made every decision on a picked ticket un-restorable: `reverse_decision()`
refuses a row written after the decision, and a claim minutes later looked exactly like somebody
else's later write. **1 row → yours. 0 rows → another session holds it.** **Release the claim AFTER
you push, never in the status write** (John, `q-claim-release-order`, yes, 2026-08-21 — `SES-106`: a
session that lets go at the status write has nothing left to re-assert at the push). The one stated
order is `close-session.js`'s own: gates → re-assert → marker → push → recompute → one release:

```sql
UPDATE public.backlog_items
   SET claimed_by = NULL, claimed_at = NULL
 WHERE backlog_id = '<TICKET-ID>' AND claimed_by = '<your session name>';
```

<!-- FEATURE: SES-316 — the release stops bumping updated_at, same reason as the claim. -->
**No `updated_at` here either, same reason (`SES-316`).** The holder guard is the point — a session
can never clear a claim that has since moved. On an abort, release at the point you stop. An
unreleased claim expires after 6h, except a `STOPPED-BY-JOHN` claim, which no elapsed time frees
(`AGT-482`; only John releases it). Discussion-only sessions claim nothing. `close-session.js` step 5
then runs `SELECT public.recompute_backlog_queue();` — queue numbers are materialized (register B4),
and completed/removed/new-ticket are recompute events.

### 3. Claim your version number atomically (when you need one)

`open-session.js --version` hands you §3's statement. Never read `CLAUDE-STATE.md` and increment —
that races under 5-7 concurrent sessions and has caused real collisions (two sessions both claiming
`v6.2.4`). Postgres serializes concurrent `UPDATE`s to the same row, so the claim itself is the
reservation — no re-check before push.

```sql
UPDATE dev_version_counter
SET patch = patch + 1, updated_at = now(), updated_by_session = '<short-session-name>'
WHERE id = 1
RETURNING major, minor, patch;
```

**The script prints it rather than running it, measured rather than lazy:** PostgREST's write API
takes column values, not SQL expressions, so `patch = patch + 1` cannot go over it and this project
has no claim RPC for it — run the one statement over the Supabase connector
(`scripts/lib/session-db.mjs` carries the measurement and the `scripts/heal-engine.js` precedent).
Use the returned `major.minor.patch` as-is in the kickoff filename, the `SESSION` header and every
file's version header. `CLAUDE-STATE.md`'s "Version in dev" is the highest *closed-out* version.

### 3b. Claim feature/backlog IDs atomically (when you create one)

`open-session.js --ids=<PREFIX>:<N>` hands you §3b's statement, same connector reason as §3. Every
new ID (`CHI-`, `LOG-`, `SES-`, any prefix from `docs/SCREEN-INVENTORY.md`'s taxonomy) is claimed
this way, never by reading the highest existing number. **Claim a prefix's IDs in one call — set
`<N>` to how many rows you're about to file.** One call, one contiguous block:

```sql
INSERT INTO feature_id_counter (prefix, last_issued_number, updated_by_session)
VALUES ('<PREFIX>', <N>, '<short-session-name>')
ON CONFLICT (prefix) DO UPDATE
  SET last_issued_number = feature_id_counter.last_issued_number + <N>,
      updated_at = now(),
      updated_by_session = EXCLUDED.updated_by_session
RETURNING last_issued_number;
```

The returned `last_issued_number` is the **last** ID of your block (`<PREFIX>-(returned − N + 1)`
through `<PREFIX>-returned`); it holds the number already handed out, not the next free one.
**Never hand-count the second and later IDs of a multi-row filing** — the single mechanism behind
every recorded collision this counter exists to prevent (`CHI-42`, `CHI-48`, `CHI-76`; earlier
`AA-197`/`AA-198`, `CHI-13`/`CHI-14`). Confirm the prefix against `docs/SCREEN-INVENTORY.md`'s
taxonomy; legacy prefixes (`AA`, `MI`, `AI`, etc.) are frozen.

---

## Close of session

**Filing a ticket (§3c), recording a decision (§3d), running a governance agent (§3f), the meter
reader (§3g) and Reversing a decision live in `docs/runbooks/session-decisions.md`** — moved there
verbatim by `AGT-460`, original numbers kept, a flat sibling of this file.

### 3e. Run the verifier before you write `done` — the attended session's own verdict (`SES-311`, `v7.0.400`)

<!-- FEATURE: SES-311 — the attended close-out gains the verifier step it never had. -->
**Why this is load-bearing and not ceremony:** the trigger `backlog_done_requires_verdict`
(migration `ses311_done_requires_verdict`) **refuses** `status = 'done'` on a Selfbuild-epic ticket
that has no `runner_verdicts` row for its `backlog_id`. Without this step the write in step 4 /
`CLAUDE-DESIGN.md` 5c raises `check_violation` and the ship does not close.

**Why it exists at all — measured, not argued.** Of the 112 Selfbuild tickets `done` on
2026-09-02, **58 carried no verdict row**, four of them M5 *required* ships (`SES-184`, `SES-269`,
`SES-282`, `SES-303`). The unattended path (`docs/runbooks/runner-cycle.md` step 7a) has run the
verifier on every ship since `SES-181`; the attended path never did. `M6-07` makes the verdict the
autonomy ladder's input (`SES-122` routes it), so a ladder that never sees attended ships grades
half the work.

**First, open a supervised cycle row if this session has none** — the verdict has to belong to a
cycle. Same stamp shape the M5/M6 attended sessions used, `trigger = 'supervised'`:

```sql
INSERT INTO public.runner_cycles (id, stamp, trigger, model, item_id, backlog_item_id, last_step)
SELECT gen_random_uuid(),
       'QA-<TICKET-ID>-supervised-<short-session-name>',
       'supervised',
       '<the model named in the kickoff, e.g. claude-opus-5>',
       '<TICKET-ID>',
       b.id,
       'step 3e — attended verifier run'
  FROM public.backlog_items b WHERE b.backlog_id = '<TICKET-ID>'
RETURNING id;
```

**Then run the verifier**, from inside the worktree, with the two credentials borrowed **by name
from `runner_secrets` over the Supabase MCP for that one command** — exported inline, never
written to a file, never printed (`SES-260`; `vercel env pull` returns these EMPTY):

```
node scripts/related-tests.js --diff=<your push sha>^ > $S/related.csv
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/verifier.js \
  --cycle-id=<the id returned above> --ticket=<TICKET-ID> --version=<vX.Y.Z> --base=origin/dev \
  --kickoff=<the ticket's kickoff_link> \
  --related=$S/related.csv \
  --pre-build-baseline=$S/pre-build-baseline-<the supervised cycle id>.txt
```

`--related=` runs the regression gate on the delivery's related set only and grades it against the
kickoff's BASELINE block (`AGT-391`); the full suite runs weekly and before a release.

`--kickoff=` is not optional decoration (`SES-359`): it is what arms the verifier's delivery-side
kickoff checks — the `SES-376` size cap and this ticket's lane declaration both sit behind it, and
with the flag absent they measure nothing and the run is silently ungraded on both. The value is the
ticket's own `backlog_items.kickoff_link`, the path step 3e's cycle row already names.

The row the verifier writes carries `graded_sha` = the HEAD the gates ran on (`SES-345`). `<your
push sha>` MUST equal `select graded_sha from public.runner_verdicts where id = '<verdict id>'` —
a mismatch means the tree graded is not the tree pushed: re-run the verifier on the pushed HEAD,
never pass the sha through.

Exit codes — the same convention step 7a uses:

- **0 = `approve`.** All three gates green, the verdict row is written, and the `done` write in
  step 4 is now permitted.
- **1 = `block`.** A gate was red. Write **`delivered`, not `done`**, and say so in the report:
  **a block is a verdict, not a wall** — the row exists, the gate is satisfied, and the honest
  status is `delivered`. Never re-run hunting for a green.
- **2 = the verifier could not run** (missing env, missing `--cycle-id`, the insert failed). That
  is the *absence* of a judgement, never a pass and never a block. **Fix it first; never write
  `done` around it.**

**Then feed the ladder**, exactly as step 7a does — the moment the verifier prints
`recorded as runner_verdicts <id>`:

```sql
SELECT * FROM public.verdict_ladder_signal('<verdict id>');
```

Two notes worth reading once:

- **This step needs `SES-122b`'s Windows fix on `origin/dev` to be runnable at all.** Before
  `v7.0.398`, `runGate()` handed an unquoted `C:\Program Files\nodejs\node.exe` to `cmd`, so every
  attended run on John's machine was a **false `block`** (verdict `253aca14`, `SES-301`). Confirm
  `spawnCommandFor` is present in `scripts/verifier.js` if a run blocks on
  `'C:\Program' is not recognized`.
- **A verdict that predates the claim is still a verdict.** The trigger tests *existence* of a row
  for the `backlog_id`, never its recency or polarity — recency is the ladder's concern
  (`SES-122`), not the gate's. The complete exemption list (non-Selfbuild epics, non-`done`
  statuses, and which of the two Reverse paths can fire this) lives in the migration's own header,
  never in this page.

### 4. Fetch, rebase, then push `HEAD:dev`

`close-session.js` runs the six close steps in the one order that is correct — the gates, the
re-assert, the marker, the send, the queue recompute, the one guarded release:

```
node scripts/close-session.js --name=<short-session-name> --ticket=<ID> [--dry-run] [--json]
```

Exit **0** closed, **1** a gate was red (nothing is sent on red, and the scope is never widened to
make it green), **2** `no-credentials` or `claim-lost` — the re-assert returned 0 rows, reached
**before** anything leaves the worktree. Before any push to `dev` (kickoff commit, close-out commit
— anything), from inside the worktree:

```
git -C "<worktree-path>" fetch origin dev
git -C "<worktree-path>" rebase origin/dev
git -C "<worktree-path>" push origin HEAD:dev
```

Use `HEAD:dev`, never bare `git push origin dev` (CLAUDE.md hard rule — worktrees share local refs).
A non-fast-forward rejection means a concurrent session merged first: re-fetch, re-rebase, retry once.

<!-- FEATURE: SES-311 -->
**`done` requires 3e's verdict (`SES-311`).**

**Then stamp the scoreboard (`SES-303`, 2026-09-02, v7.0.382)** — every ship, attended or not,
records the platform's six standing numbers at that moment, so the ticket's effect can be read
off the series later (`public.ticket_outcome`, M5-12's 72-hour window). One call over the Supabase
MCP, right after the push lands:

```sql
SELECT * FROM public.snapshot_platform_scoreboard('ship', '<TICKET-ID>', '<push sha>', <hygiene flag count or NULL>);
```

The flag count is `session-hygiene`'s "N flagged" line if you ran it this session; `NULL` means
unmeasurable, never zero. Nothing else to fill in — the other five numbers are computed from
`runner_cycles` (and, since `SES-413` slice 4, `runner_questions`) by the function itself.

The verdict vocabulary `public.ticket_outcome` grades that series with is
**`held` / `did_not_hold` / `unmeasurable` / `unclaimed` / `pending`** (`unclaimed` added by
`SES-309`, `v7.0.390`). `unclaimed` means the row never declared a claim at all — a filing
omission, not a measurement — while `none: <why>` is how a ticket declares it has none and reads
`unmeasurable` honestly. Stamp on every ship, claim or not.

**Then sweep the decision windows (`SES-286`, `v7.0.395` — `M6-02`, `M6-07`)** — one call, every
close-out, right after the scoreboard stamp:

```sql
SELECT * FROM public.sweep_decision_windows(NULL, '<short-session-name>');
```

It finalises every decision whose window has closed and promotes the work class each one named,
returning `finalized, promoted, closed` — note all three in your close-out.

<!-- FEATURE: SES-320 — the third number is the delivered exit. -->
**`closed` is `SES-320`'s** (migration `ses320_delivered_exit`): a ticket still `delivered` whose
`kind='ship'` decision this sweep finalised is written `done` by the sweep, which must NOT bump
`updated_at` or every ship's own Reverse refuses its own ticket. Idempotent; **run it even if this
session recorded no decision of its own.** Both halves in full: `docs/runbooks/session-decisions.md`.

### 5. Delete your inflight file in the close-out commit

`close-session.js` step 3 deletes your own `inflight/<short-session-name>.md` and stages it, so it
lands in that same commit — it's your job to remove it, not the next session's to notice it's stale.

### 6. Remove the worktree

`close-session.js` prints these two rather than running them — `git worktree remove` runs from the
shared checkout against the worktree the script is standing in, and a script that deletes its own
working directory leaves the shell nowhere. Once merged into `dev` and pushed:

```
git -C "C:/Projects/deepbench-frontend" worktree remove ".claude/worktrees/<short-session-name>"
git -C "C:/Projects/deepbench-frontend" branch -D "session/<short-session-name>"
```

---

## Exception — lightweight bookkeeping path (`SES-011`)

A session whose only pending edit is a **pure append** — zero deleted or modified lines — confined to
a brand-new `inflight/<short-session-name>.md`, may skip part of the ceremony. (The old clause (b),
"one new row appended to a `FEATURES*.md` file," is impossible since `v7.0.113` — those files are
legend-only stubs; tickets are filed into `public.backlog_items` per step 3c, which needs no
worktree at all. Updated 2026-08-22, `design-backlog-model`.)

- If this session already has a worktree open, make the edit there — no second worktree.
- If not, create one as normal (step 1) but **skip step 1b** (`.env.local` copy — no dev server or
  Node test is involved).
- Commit, fetch/rebase, push as normal (step 4) — no shortcut on the git safety steps.
- **Skip step 6's immediate manual removal.** A worktree with zero commits ahead of `origin/dev`
  after its push holds no unmerged work — `session-hygiene`'s checks 5/5b already flag it for
  batched cleanup later.
- **Before pushing, run `git -C "<worktree-path>" diff --stat` against the previous commit.** Any
  deletion shown means this wasn't a qualifying edit — stop, and finish it as a normal
  full-ceremony session instead.

---

*Rationale and the full "found live" history behind these procedures (the version/ID collisions,
the sub-agent staleness incident, why the shared checkout is deliberately never kept in sync, the
retired read-only-bootstrap check) live in `docs/SESSIONS.md`. This skill stays procedure-first on
purpose — if it starts accumulating narrative, move the narrative there.*
