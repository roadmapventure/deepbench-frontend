<!-- DeepBench v7.0.222 | docs/runbooks/session-setup.md | SES-175 — §2c's claim SQL gains a rendered rule block: a `{{rule:B40}}` marker comment above the committed text of rule B40, generated from `public.governance_rules` and checked by `scripts/render-rule-blocks.js`. John's call on gated card `a4e0254a` 2026-08-24: "Accept with C" — expand-in-place, so this file still carries the real sentence a session reads mid-run and the script is what stops that copy drifting from the registry. The text under the marker is NOT hand-maintained: edit the registry row, re-export `docs/governance/RULES-SNAPSHOT.md`, then `node scripts/render-rule-blocks.js --write`. Full rationale, the three options John chose between, and the QA: `docs/runbooks/runner-cycle.md`'s v7.0.222 stamp and `docs/kickoffs/v7.0.222-SES-175-rendered-rule-blocks.md` — cited here, not restated. -->
<!-- DeepBench v7.0.198 | docs/runbooks/session-setup.md | SES-121 — body moved verbatim from .claude/skills/session-setup/SKILL.md (which remains as a thin loader); .claude/ is not writable by unattended cycles (register B39), this runbook is. This file is the canonical copy. -->

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
   SET claimed_by = '<short-session-name>', claimed_at = now(), updated_at = now()
 WHERE backlog_id = '<TICKET-ID>'
   AND status <> 'done'
   AND (claimed_by IS NULL OR claimed_at < now() - INTERVAL '24 hours')
RETURNING backlog_id;
```

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
   SET claimed_by = NULL, claimed_at = NULL, updated_at = now()
 WHERE backlog_id = '<TICKET-ID>' AND claimed_by = '<your session name>';
```

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
   filed_at, scope_origin, size_stamp, predicted_cycles, defer_status, scope_rationale, milestone)
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
       '<M0..M7 the ticket serves, or NULL>'                            -- milestone (SES-304)
  FROM backlog_items
RETURNING backlog_id, priority_class;
```

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
