<!-- DeepBench v7.0.412 | docs/runbooks/session-setup.md | SES-320 — the close-out sweep returns a THIRD number and the Reverse section says what a finalised ship's undo now covers. `sweep_decision_windows()` gained an OUT column `closed` (migration `ses320_delivered_exit`): a `kind='ship'` decision it finalises whose ticket is still `delivered` gets that ticket written `done`, any class, any epic — the finalisation IS the delivered exit, and since `SES-285` retired the Accept tap it is the only one there is. The Reverse paragraph gains the other half: the sweep's close carries a before-image under THE SHIP DECISION'S OWN id, so reversing that decision undoes the close in the same restore — the ticket comes back out of `done` to the state its oldest image records, which is what it held BEFORE the ship, not `delivered`. THE THING A LATER EDITOR MUST NOT "TIDY": the sweep's close writes `status` and NOT `updated_at`, because `reverse_decision()` refuses any row whose live `updated_at` postdates the decision's `decided_at` (`SES-316`) and the close runs 72 hours after it — measured both ways on rolled-back fixtures at this ship (`applied`/`restored 1`/`written_since 0` as shipped; `refused`/`restored 0`/`written_since 1` with the bump simulated). Stamp count held at 5 per session-hygiene check 7: `v7.0.198` (`SES-121`) moved VERBATIM to `docs/SESSIONS.md`'s appendix, `SES-164` step 2 run FIRST by grep rather than from recollection — its entire content (the body moved verbatim from `.claude/skills/session-setup/SKILL.md`, register B39, "this file is the canonical copy") is already restated in §1's own B39 paragraph and in that skill's loader sentence, so nothing was relocated. -->
<!-- DeepBench v7.0.411 | docs/runbooks/session-setup.md | SES-004 (b) — 3d gains one sentence after its `DO $$` example: an attended decision's `reasoning` also names the criteria it relied on as `pattern:N` tokens, exactly as `docs/runbooks/runner-cycle.md` step 7b requires of a cycle's own decisions (`pattern:0` = no standing pattern applied — new judgment); the same trigger on `runner_decisions` stores them in `public.runner_decision_patterns` for both paths. Part (b) of `SES-004`'s remainder — part (a) (`v7.0.410`, push `ddef954c`) shipped the rows, the trigger and 7b's own citation rule and stopped at the file cap owing this sentence and the md-header paragraph in `docs/JOHN-DECISION-PATTERNS.md`. No SQL changed, no criterion text touched. -->
<!-- DeepBench v7.0.403 | docs/runbooks/session-setup.md | SES-316 — A CLAIM IS NOT A JUDGMENT WRITE, and the thing to read twice is THAT THE WRITTEN-SINCE GUARD DID NOT GO AWAY — IT CHANGED REFERENCE POINT. 2c's claim and release both dropped `updated_at = now()`; 7b's own list of what is not a decision already said a claim isn't one, so this is that definition honoured in the SQL rather than a new rule. MEASURED AT THE M6 GATE (decision `c3e86310`, 2026-09-02), not reasoned about: `reverse_decision()` refused any row whose live `updated_at` postdated the BEFORE-IMAGE's `created_at` and still returned `outcome = 'applied'` with the row counted `refused` — so every decision that touched a ticket became un-restorable the moment the continuous drain claimed it (minutes, not days), silently. Migration `ses316_reversal_survives_claims` re-points that guard at the decision's own `decided_at` (`now()` is frozen per transaction, so every write the decision made carries exactly that stamp — the decision's own writes can therefore never trip the guard, and anything strictly later is genuinely somebody else's) and adds `refused_written_since` beside `refused`, because the two mean different things: `refused` is "that row was never this decision's to undo", `refused_written_since` is "your undo did not happen". THE ONE FACT AN EDITOR WILL GET WRONG: there is NO `updated_at` trigger on `backlog_items` (read out of `pg_trigger` before a line changed — the only trigger is `backlog_done_requires_verdict`, BEFORE UPDATE OF status), which is what makes dropping the column from these two statements actually work rather than cosmetic; and `recompute_backlog_queue()` writes `queue` and `pinned_position` ONLY, never `updated_at`, so a recompute between a decision and its reversal is harmless. The one-`DO`-block rule is UNCHANGED and still load-bearing — split the decision from its write and `decided_at` lands in the first transaction while the row lands in the second, which the new guard refuses just as the old one did (now honestly, as `refused`, instead of a silent `applied`). Guarded by `tests/regression/ses-286a-reversal-window.test.mjs`. -->
<!-- DeepBench v7.0.400 | docs/runbooks/session-setup.md | SES-311 — the attended close-out gains the verifier step it never had. New step 3e (run `scripts/verifier.js` before writing `done`, feed `verdict_ladder_signal`) plus a one-line pointer in step 4. It is not advice: migration `ses311_done_requires_verdict` puts a BEFORE UPDATE trigger on `backlog_items` that refuses `status='done'` on a Selfbuild-epic ticket with no `runner_verdicts` row. Measured 2026-09-02: 58 of 112 Selfbuild `done` tickets carried no verdict, four of them M5 required ships. Every exemption lives in that migration's header, never on this page. -->
<!-- DeepBench v7.0.222 | docs/runbooks/session-setup.md | SES-175 — §2c's claim SQL gains a rendered rule block: a `{{rule:B40}}` marker comment above the committed text of rule B40, generated from `public.governance_rules` and checked by `scripts/render-rule-blocks.js`. John's call on gated card `a4e0254a` 2026-08-24: "Accept with C" — expand-in-place, so this file still carries the real sentence a session reads mid-run and the script is what stops that copy drifting from the registry. The text under the marker is NOT hand-maintained: edit the registry row, re-export `docs/governance/RULES-SNAPSHOT.md`, then `node scripts/render-rule-blocks.js --write`. Full rationale, the three options John chose between, and the QA: `docs/runbooks/runner-cycle.md`'s v7.0.222 stamp and `docs/kickoffs/v7.0.222-SES-175-rendered-rule-blocks.md` — cited here, not restated. -->

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

First check for a name collision — multiple sessions on the same day will otherwise pick the same
generic name, so include a topic hint, not just a date:

```
git -C "C:/Projects/deepbench-frontend" worktree list
```

If your intended `<short-session-name>` already exists, pick a more specific one. Then:

```
git -C "C:/Projects/deepbench-frontend" fetch origin dev
git -C "C:/Projects/deepbench-frontend" worktree add ".claude/worktrees/<short-session-name>" -b "session/<short-session-name>" origin/dev
```

**Always branch explicitly from `origin/dev`.** This repo's remote default branch is `main`, not
`dev` — any tool that branches from "the default branch" silently branches from the wrong place.
Do **not** use the `EnterWorktree` tool: the session's working directory is `C:/Projects` (the
parent of the repo), so `EnterWorktree` can't recognize it and errors with "not in a git
repository."

### 1b. Copy `.env.local` into the new worktree

`.env.local` is gitignored, so `git worktree add` never brings it along; a worktree missing it hits
a silent blank-page failure at Supabase-client construction the first time anything reads
`import.meta.env`. Do this before any dev-server preview or Node test:

```
Copy-Item "C:/Projects/deepbench-frontend/.env.local" "C:/Projects/deepbench-frontend/.claude/worktrees/<short-session-name>/.env.local"
```

(or the Bash `cp` equivalent). Skip only for a pure-bookkeeping edit (see the exception below).

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
  **Corrected the same day it shipped (measured, not assumed):** the first form of this step said
  to `vercel env pull` a session file. Vercel marks these variables *sensitive* and a pull returns
  every one of them **empty** (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`,
  `OPENAI_API_KEY` all came back as `""` on 2026-09-02) — the names travel, the values do not. The
  Vercel project env is where the *deployment* reads them; a session cannot borrow from it.
  `runner_secrets` holds every one of the five and is the sanctioned session-time source.
- **`VERCEL_TOKEN`** → not needed on this desktop at all: the Vercel CLI is logged in
  (`vercel whoami` → `roadmapventure`), and its credential lives in your user profile.
- **`VERCEL_AUTOMATION_BYPASS_SECRET`** → not a Vercel env var; read it by name from
  `public.runner_secrets` over the Supabase MCP the moment a live-QA call needs the header, and
  put it in the process environment for that one command, never in a file.
- **The runner** reads all of these by name from `runner_secrets` (routine prompt step 3) and is
  unaffected.

### 1c. Work against the worktree path for the rest of the session

Do all Read/Edit/Write/Bash work against the worktree's absolute path
(`C:/Projects/deepbench-frontend/.claude/worktrees/<short-session-name>/…`), never the shared
checkout. For git, use `git -C "<worktree-path>" <command>`.

If this session spawns any sub-agent, state that absolute worktree path verbatim in the sub-agent's
prompt (CLAUDE.md hard rule — a sub-agent given a bare task defaults to the shared checkout).

### 2. Create your inflight file — right after the worktree, not later

```
inflight/<short-session-name>.md
```

**(Repo root — moved out of `.claude/inflight/` 2026-08-21, John-approved, register B41:
`.claude/` paths fire a harness permission prompt that parks unattended cloud sessions for
hours; the marker was the one thing forcing every session under that path. Same filename,
same one-line content, same lifecycle — only the directory changed.)**

One line: worktree name, plus a clause on the topic if known. Nothing else is required until there's
real content to report. Create it as one of your first actions, *not* when you happen to edit
something else. **Only ever edit or delete your own inflight file — never another session's**, and
never a shared list for this purpose. Why it can't wait: a worktree mid-design-conversation that hasn't committed anything
is byte-for-byte identical on disk to one that finished and was never cleaned up — both show zero
commits ahead of `origin/dev` and zero uncommitted changes. This file is the only signal that tells
`session-hygiene`'s staleness check (and other sessions) that a quiet worktree is still wanted.

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

Manual sessions and scheduled runner cycles share one board, so the ticket itself is the
coordination point. As soon as this session commits to working a specific `backlog_items` ticket
(John names it, or you pick it), claim it — one atomic write, same never-read-then-increment
principle as the counters below:

<!-- {{rule:B40}} · rendered from public.governance_rules — do not hand-edit the quoted line(s)
     below. Edit the registry row, re-export docs/governance/RULES-SNAPSHOT.md, then run
     `node scripts/render-rule-blocks.js --write`. Checked by that script's default mode (SES-175). -->
> **Rule B40** — Claim a backlog ticket atomically via claimed_by/claimed_at columns at pick time (any session, manual or scheduled); a claim expires after 24h so a dead session can't strand a ticket.

```sql
UPDATE public.backlog_items
   SET claimed_by = '<short-session-name>', claimed_at = now()
 WHERE backlog_id = '<TICKET-ID>'
   AND status <> 'done'
   AND (claimed_by IS NULL OR claimed_at < now() - INTERVAL '24 hours')
RETURNING backlog_id;
```

<!-- FEATURE: SES-316 — the claim stops bumping updated_at. -->
**A claim is coordination, not a judgment write — and it deliberately does NOT touch `updated_at`
(`SES-316`).** Bumping it made every decision on a picked ticket un-restorable: `reverse_decision()`
refuses a row written after the decision, and a claim minutes later looked exactly like somebody
else's later write. `claimed_by` / `claimed_at` are the claim's own columns; nothing reads
`updated_at` to learn about a claim. (7b's own list of what is *not* a decision already named the
claim — this is that definition honoured in the SQL.)

**1 row → yours. 0 rows → another session (possibly a scheduled cycle) holds it** — tell John
who holds it (`SELECT claimed_by, claimed_at FROM backlog_items WHERE backlog_id = '<ID>'`)
rather than working it anyway. **Release the claim AFTER you push, never in the status write**
(John, `q-claim-release-order`, yes, 2026-08-21 — `SES-106`; the old "release in the same
UPDATE that sets the final status" wording contradicted the re-assert-before-push gate: a
session that lets go at the status write has nothing left to re-assert at the push). The one
stated order: status write with the claim untouched → queue recompute → re-check the claim →
push → one guarded release:

```sql
UPDATE public.backlog_items
   SET claimed_by = NULL, claimed_at = NULL
 WHERE backlog_id = '<TICKET-ID>' AND claimed_by = '<your session name>';
```

<!-- FEATURE: SES-316 — the release stops bumping updated_at, same reason as the claim. -->
**No `updated_at` here either, and for the same reason (`SES-316`):** a release is the claim's
mirror image, so it is coordination too. A release that stamped `updated_at` would make the
decision this very session just recorded un-restorable one statement after the push.

The holder guard is the point — a session can never clear a claim that has since moved to
another session. On an abort, release at the point you stop. An unreleased claim expires after
24h, so a dead session cannot strand a ticket. Discussion-only sessions that never settle on a
ticket claim nothing.

**After any close-out write that completes/removes a ticket or files a new classed one, run
`SELECT public.recompute_backlog_queue();`** — the board's queue numbers are materialized
(`SES-86` phase 2, register B4) and completed/removed/new-ticket are recompute events. One
idempotent call; a board that didn't move changes 0 rows. (This is the manual-session call
site `v7.0.130` carded; wired here 2026-08-21.)

### 3. Claim your version number atomically (when you need one)

Never read `CLAUDE-STATE.md` and increment — that races under 5–7 concurrent sessions and has caused
real collisions (e.g. two sessions both claiming `v6.2.4`). Claim it atomically; Postgres serializes
concurrent `UPDATE`s to the same row, so the claim itself is the reservation — no re-check before
push:

```sql
UPDATE dev_version_counter
SET patch = patch + 1, updated_at = now(), updated_by_session = '<short-session-name>'
WHERE id = 1
RETURNING major, minor, patch;
```

Use the returned `major.minor.patch` as-is in the kickoff filename, the `SESSION` header, and every
file's version-header comment. `CLAUDE-STATE.md`'s "Version in dev" line is the highest *closed-out*
version (updated at close-out per `CLAUDE-DESIGN.md` Step 5c) — not the source for claiming a new one.

### 3b. Claim feature/backlog IDs atomically (when you create one)

Every new ID (`CHI-`, `LOG-`, `SES-`, `LOO-`, any prefix from `docs/SCREEN-INVENTORY.md`'s taxonomy)
is claimed the same way — never by reading the highest existing number in the `FEATURES*.md` files
and incrementing. Same race, same fix (real collisions this closed: `AA-197`/`AA-198`,
`CHI-13`/`CHI-14`, `HAR-02`/`AA-197`):

**Claim all of a prefix's IDs in one call — set `<N>` to how many rows you're about to file** (`1`
for a single row; `8` if you're logging eight `LOG-` findings at once). One call, one contiguous
block:

```sql
INSERT INTO feature_id_counter (prefix, last_issued_number, updated_by_session)
VALUES ('<PREFIX>', <N>, '<short-session-name>')
ON CONFLICT (prefix) DO UPDATE
  SET last_issued_number = feature_id_counter.last_issued_number + <N>,
      updated_at = now(),
      updated_by_session = EXCLUDED.updated_by_session
RETURNING last_issued_number;
```

The returned `last_issued_number` is the **last** ID of your block; the block is
`<PREFIX>-(returned − N + 1)` through `<PREFIX>-returned`. With `<N> = 1` that's just
`<PREFIX>-returned`. Works whether the prefix is new (lazily starts at 1) or already has rows.

**Never hand-count the second and later IDs of a multi-row filing** — claim once with the real `<N>`
instead. That is the single mechanism behind every recorded collision this counter exists to prevent
(`CHI-42`, `CHI-48`, `CHI-76`; earlier `AA-197`/`AA-198`, `CHI-13`/`CHI-14`, `HAR-02`/`AA-197`): a
session files a block of rows, claims one number, and counts up from it by hand while a concurrent
session claims the numbers it's counting into. Filing 2+ rows at once is the *normal* case, not the
exception — 51 commits in this repo's history have done it — which is exactly why the batch form is
the default shape above rather than a variant mentioned at the end.

**`last_issued_number` holds the number already handed out, not the next free one** (renamed from
`next_number` 2026-07-28, `SES-18` — the old name asserted the opposite of its contents and invited
exactly the read-and-file mistake this section forbids). Reading this table is never how you get an
ID; the `INSERT … ON CONFLICT` above is, because the write *is* the reservation.

Confirm the prefix itself is legitimate against `docs/SCREEN-INVENTORY.md`'s taxonomy first; this
table governs the number, not which prefixes are valid. Legacy area prefixes (`AA`, `MI`, `AI`, etc.)
are frozen — never claim a new legacy-prefixed ID through this or any other mechanism.

---

## Close of session

### 3c. File a new backlog ticket — the canonical INSERT (`SES-83` phase (e), 2026-08-21)

Tickets are filed straight into `public.backlog_items` — never into the `FEATURES*.md` stubs.
Claim the `backlog_id` first (step 3b, one block call per prefix), then file with this shape;
every column below is load-bearing:

```sql
INSERT INTO backlog_items
  (backlog_id, tier, type, priority_class, title, description, status, epic_id,
   source_file, session_ref, row_ordinal,
   filed_at, scope_origin, size_stamp, predicted_cycles, defer_status, scope_rationale, milestone,
   enhancement_claim)
SELECT '<PREFIX-N>', '<now|next|later>', '<Type from SCREEN-INVENTORY taxonomy>',
       '<named P-class — REQUIRED at filing, register B9>',
       '<one-line human title — never the class string>',
       '<description; convention opens with the bolded named class>',
       'open',
       (SELECT id FROM epics WHERE name = '<epic name>')::uuid,  -- or NULL for no epic
       'session-<short-session-name>', '<short-session-name> <yyyy-mm-dd>',
       coalesce(max(row_ordinal),0)+1,
       now(),                                   -- filed_at: the created date (never created_at, M5-04)
       '<original|gate-review|john-named|discovered|pre-existing>',   -- scope_origin (FILE-MATRIX)
       '<S|M|L>', <predicted cycles, >= 1>, '<no|maybe|yes>',           -- size_stamp, predicted_cycles, defer_status
       '<scope_rationale: WHY it belongs — "Goal N, <name>: …" — REQUIRED on a Selfbuild ticket, M5-03>',
       '<M0..M7 the ticket serves, or NULL>',                           -- milestone (SES-304)
       '<claim>'         -- outcome claim (SES-309): '<scoreboard column>: up|down' or 'none: <why>' — NULL reads unclaimed
  FROM backlog_items
RETURNING backlog_id, priority_class;
```

- **A Selfbuild ticket declares its outcome claim at filing (`SES-309`, 2026-09-02, `v7.0.390`).**
  `enhancement_claim` is the number the ticket says it will move — one `platform_scoreboard`
  column and a direction, `'<metric>: up|down'` — and the seven metric names are exactly
  `noship_cycles_week`, `noship_tokens_week`, `shipped_cycles_week`, `tokens_per_shipped_cycle`,
  `cycles_per_shipped_ticket`, `cron_silence_hours`, `hygiene_flags`. **`'none: <why no scoreboard
  number applies>'` is a valid and honest answer, and most chartered work is that kind** — a
  tooling ticket that records state in its own table moves nothing on the board, and saying so on
  the row is the point. `public.outcome_claim_is_valid()` is the check constraint
  (`ck_backlog_outcome_claim`), so a typo or an invented metric name is rejected at filing rather
  than discovered as a silent `unmeasurable` three days later. Leaving it NULL is still legal and
  reads **`unclaimed`** on `public.ticket_outcome` — which is a reviewer-visible filing omission,
  not a verdict.
- **`priority_class` is mandatory at filing** (register B9 — nothing enters the board
  undecided), always the full named form (`P10 - Tooling`), `· FLAGGED` suffix only on
  `P9 - Bug Fixes` pixel-moving fixes.
- **`scope_rationale` is the review bucket's promotion criterion (`M5-03`, `SES-295`, 2026-09-02):**
  a Selfbuild ticket filed on or after 2026-08-21 with no rationale is **never picked** — not by the
  drain, not by the pre-boot gate — until one is written. Name the charter goal it advances
  (`docs/SELFBUILD-CHARTER.md` "Goals"), one or two sentences. The other matrix fields
  (`scope_origin`, `size_stamp`, `predicted_cycles`, `defer_status`) are fail-LOUD (`FILE-MATRIX`):
  a missing one is flagged, not refused.
- **`row_ordinal` is NOT NULL** — omit it and the INSERT fails (found live filing `SES-96`,
  2026-08-21); the `SELECT … max+1` form above handles it.
- **`title` is the human sentence.** Phases (a)/(b) imported the class string into `title` for
  old rows — that is the trap, not the convention.
- **Then run `SELECT public.recompute_backlog_queue();`** — a new classed ticket is a queue
  recompute event (register B4), and without it the ticket has no queue number and is invisible
  to "Next up".
- **AN AUTOMATION TICKET CLAIMS THE TOP OF JOHN'S LANE, AND ONE CALL DOES IT — use it INSTEAD of
  the plain recompute above (`SES-101`, function shipped `v7.0.147`, wired in here `v7.0.203`):**

  ```sql
  SELECT public.claim_automation_lane_top('<PREFIX-N>');
  ```

  John's ruling, question `q-lane-top` answered **yes** 2026-08-21T20:47Z, from his directive
  `48ae1939` line 4: *"if you create more automation tickets keep making them top of queue."* So the
  slot is `min(open lane) − 1`, **never `max + 1`**.

  **This bullet is the half of `SES-101` that sat unfinished for two days, and the reason is worth
  one sentence:** the function has assigned `automation_rank` since `v7.0.147`, but **nothing called
  it at filing time**, so a newly filed automation ticket landed in the class-sorted backlog — the
  exact failure the lane was built to end. Measured when the function shipped: the last three
  automation tickets filed had been hand-assigned to the *bottom* of the lane (`SES-99` = 7,
  `SES-100` = 8, `SES-101` = 9), the opposite of what John answered. It could not be fixed until now
  because this procedure lived under `.claude/`, which an unattended cycle may not write
  (register B39); `SES-121` moved the body here in `v7.0.198`, and this is the first thing that move
  paid for.

  Three properties, so nobody re-derives them: it is **idempotent** (a ticket already at the open
  lane's minimum is left alone, so a second call cannot ratchet it further negative); it **runs the
  queue recompute itself**, which is why it replaces rather than follows the bullet above; and it
  reads the **open** lane only, so `done`/`removed` tickets keep their historical rank (`ADM-1` = 1)
  without competing. A ticket that is **not** automation work takes the plain recompute and nothing
  else — do not call this on an ordinary ticket to "be safe": it would put unrelated work above
  John's own queue.
- **`epic_id` is optional and defaults to no epic.** Look it up by NAME (`epics.name` is
  UNIQUE), never by pasting a uuid. Epic creation is ask-first (John, 2026-08-22) — only
  `Automation` is pre-authorized, so a session that wants a NEW epic asks first rather than
  inserting one.

### 3d. Record a decision — the attended session's own (`SES-286`, `v7.0.395`)

<!-- FEATURE: SES-286 (b) — the attended path calls the decision ledger part (a) built. -->
An attended session makes judgment writes too, and they are the same kind of thing an unattended
cycle's are: **what counts as a decision and what does not is defined once, in
`docs/runbooks/runner-cycle.md` step 7b** — read the list there rather than reasoning from this
page. When this session resolves, defers, re-tiers, re-homes, removes or re-scopes a ticket, rules
a gate or amends a directive, record it in the same transaction as the write:

```sql
DO $$
DECLARE
  v_dec uuid;
  v_img jsonb;
BEGIN
  v_dec := public.record_decision(
    NULL, '<short-session-name>',
    '<kind>',
    '<TICKET-ID or NULL>',
    '<one-sentence summary of what you decided>',
    '<the reasoning — what you read, what you ruled, why>',
    public.ladder_work_class('<the ticket''s priority_class, or NULL>')
  );

  SELECT to_jsonb(b) INTO v_img
    FROM public.backlog_items b WHERE b.backlog_id = '<TICKET-ID>';
  INSERT INTO public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  VALUES (NULL, '<short-session-name>', 'backlog_items', (v_img->>'id'), v_img, v_dec);  -- pk_value is the row's PRIMARY KEY (the uuid in v_img->>'id'), never the ticket id: reverse_decision() addresses a row by its pk and refuses one it cannot cast (SES-286b follow-up, measured: a ticket-id pk_value reversed nothing and reported refused=1)

  UPDATE public.backlog_items
     SET <the judgment>, updated_at = now()
   WHERE backlog_id = '<TICKET-ID>';
END $$;
```

<!-- FEATURE: SES-004 -->
**The `reasoning` above also names the criteria it relied on, as `pattern:N` tokens** — exactly what
`docs/runbooks/runner-cycle.md` step 7b requires of a cycle's own decisions (`pattern:0` = no
standing pattern applied — new judgment) — and the same trigger on `runner_decisions` stores them
in `public.runner_decision_patterns`, identically for both the attended and unattended path.

- **`cycle_id` NULL, `session_name` set — that is the whole difference from the unattended shape.**
  `record_decision()` raises unless exactly one of the two is present
  (`ck_decision_attribution`), and an attended session is the `session_name` half. Pass the same
  `<short-session-name>` your worktree and inflight file already carry.
- **One transaction, and it is not a style choice.** Step 7b carries the reason in full: `now()` is
  frozen for the length of a transaction, so the decision's `decided_at` and every write it makes
  carry the same stamp — and `reverse_decision()` refuses any row whose live `updated_at` postdates
  that stamp (`SES-316`; it used to compare against the *image's* `created_at`). Split this into two
  statements and `decided_at` lands in the first while the write lands in the second, so the row
  postdates its own decision and the reversal restores nothing — now reported honestly as
  `outcome = 'refused'`, but still an undo that did not happen.
- **Put the handle on the ticket and in your close-out note:**
  `Decision <id> — reversible until <expires_at, CST>: select public.reverse_decision('<id>', 'John', '<why>');`
- Before-images you already wrote without a decision id are adopted rather than re-taken:
  `public.attach_before_images('<decision id>', ARRAY['<image id>']::uuid[])` fills `decision_id`
  only where it is still NULL.

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
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/verifier.js \
  --cycle-id=<the id returned above> --ticket=<TICKET-ID> --version=<vX.Y.Z> --base=origin/dev
```

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

Before any push to `dev` (kickoff commit, close-out commit — anything), from inside the worktree:

```
git -C "<worktree-path>" fetch origin dev
git -C "<worktree-path>" rebase origin/dev
git -C "<worktree-path>" push origin HEAD:dev
```

Use `HEAD:dev`, never bare `git push origin dev` (CLAUDE.md hard rule — worktrees share local refs).
If the push is rejected as non-fast-forward, another concurrent session merged first: re-fetch,
re-rebase, retry once.

<!-- FEATURE: SES-311 -->
**`done` requires 3e's verdict (`SES-311`).**

**Then stamp the scoreboard (`SES-303`, 2026-09-02, v7.0.382)** — every ship, attended or not,
records the platform's five standing numbers at that moment, so the ticket's effect can be read
off the series later (`public.ticket_outcome`, M5-12's 72-hour window). One call over the Supabase
MCP, right after the push lands:

```sql
SELECT * FROM public.snapshot_platform_scoreboard('ship', '<TICKET-ID>', '<push sha>', <hygiene flag count or NULL>);
```

The flag count is `session-hygiene`'s "N flagged" line if you ran it this session; `NULL` means
unmeasurable, never zero. Nothing else to fill in — the other four numbers are computed from
`runner_cycles` by the function itself.

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
**`closed` is `SES-320`'s (`v7.0.412`, migration `ses320_delivered_exit`): a ticket still `delivered`
whose `kind='ship'` decision this sweep has just finalised is written `done` by the sweep itself — any
class, any epic. The finalisation IS the delivered exit, and since `SES-285` retired the Accept tap it
is the only one there is.** It is idempotent (a second
call returns `0, 0, 0`), and **run it even if this session recorded no decision of its own**: the
windows it closes are whoever's expired while it worked. That is the point of putting it here —
**every attended close-out sweeps, so a window never waits for a cron that may be off.**

### 5. Delete your inflight file in the close-out commit

When you push your close-out commit, delete your own `inflight/<short-session-name>.md` in
that same commit — it's your job to remove it, not the next session's to notice it's stale.

### 6. Remove the worktree

Once the worktree is merged into `dev` and pushed:

```
git -C "C:/Projects/deepbench-frontend" worktree remove ".claude/worktrees/<short-session-name>"
git -C "C:/Projects/deepbench-frontend" branch -D "session/<short-session-name>"
```

---

## Reversing a decision — John's handle (`SES-286`, `v7.0.395` — `M6-02`, `M6-06`)

<!-- FEATURE: SES-286 (b) — the undo is one line, and this is where it is written down. -->
One line, from any session or straight over the Supabase MCP:

```sql
select public.reverse_decision('<decision id>', 'John', '<why>');
```

**What it does.** It restores the rows the decision touched — each from the *oldest* image recorded
under that decision, i.e. the state before the decision touched it, restored in place rather than
re-created; it writes before-images of everything the reversal itself writes; it marks the decision
`reversed` with the actor and the reason; it demotes the work class the decision named (rung −1
floored at 0, streak 0); and it records the reversal as its own `kind = 'reversal'` decision row.

<!-- FEATURE: SES-320 — reversing a finalised ship also undoes the sweep's close. -->
**Reversing a FINALISED SHIP decision undoes the close the window sweep wrote, in the same restore
(`SES-320`, `v7.0.412`).** The sweep's `done` write carries a before-image under the ship decision's
OWN id, so the close is part of that one decision's undo set rather than a second decision for the
same delivery: the ticket comes back out of `done` to the state its **oldest** image under that
decision records — which is what it held **before the ship**, not `delivered` — and the
`REVERT-FORWARD REQUESTED` directive is queued exactly as before. Measured on a rolled-back fixture
at that ship: `outcome = applied`, `restored = 1`, `refused_written_since = 0`, ticket `done` →
`open`, one directive queued. **This works only because the sweep's close does not bump
`updated_at`** — it runs 72 hours after `decided_at`, so a bump would make the guard below refuse
the ticket on its own ship's Reverse.

**Read the counts, not just the outcome.** It returns `outcome`, `restored`,
`restored_unverified`, `refused`, `refused_written_since`, `demoted`, `reversal_id` and a `reason`
sentence. A row outside the allowlist of tables a decision may legitimately have changed, and a row
without a single-column primary key, are counted `refused` and left alone — and `outcome` can still
read `applied`, in which case the `reason` sentence says *"read the counts, not the outcome"* itself.
`restored_unverified` is a table with no `updated_at` column: the row was written, and the doubt is
reported rather than hidden.

<!-- FEATURE: SES-316 — the third outcome, and the counter that explains it. -->
**`outcome = 'partial'` means some rows were written after the decision and were left alone — read
`refused_written_since`** (`SES-316`). That counter is kept apart from `refused` because it means
something different: `refused` says *"that row was never this decision's to undo"*, while
`refused_written_since` says *"your undo did not happen to this row"*. The three outcomes are
exact — **`applied`** (nothing was written since), **`partial`** (something was, and something was
still restored: the decision IS marked reversed and the rung DOES demote), and **`refused`** (something
was, and *nothing* was restored: the decision is **not** marked reversed, no rung moves, and no
reversal row is left behind, so you can decide whether the later write or the undo should win and
call it again).

**Where the ids are.** The standing brief's *Open decisions* block is the page to read — it lands
in `SES-286` part (c) (`v7.0.396`, the *Open decisions* block of `docs/runbooks/standing-brief.md`); the same list is one query:

```sql
SELECT id, decided_at, kind, backlog_id, summary, expires_at
  FROM public.runner_decisions WHERE status = 'open' ORDER BY expires_at;
```

**It works inside the window and after it.** A decision already `final` still reverses, and a late
reversal still demotes — silence buys the promotion, it does not buy immunity. The one thing it
refuses is reversing a reversal: undoing one would re-apply the decision it undid, which is a new
decision and gets recorded as one, with its own window.

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
