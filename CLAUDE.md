<!-- DeepBench v6.3.129 | CLAUDE.md | SES-021 -- router + hard rules + pointers; procedures live in .claude/skills/session-setup/ -->
# DeepBench — Session Router

**Every session, first action — before any orientation read, no matter the session type:**

1. **Set up your worktree and inflight file.** Follow the **`session-setup` skill**
   (`.claude/skills/session-setup/SKILL.md`) — worktree branched fresh from `origin/dev`,
   `.env.local` copied in, your `.claude/inflight/<short-session-name>.md` created. Do this
   *first*, before reading or editing anything. A worktree freshly branched from `origin/dev`
   is a correct, current checkout by construction — which is what makes step 2 safe.
   This applies even to audit / investigation / multi-sweep sessions that don't cleanly fit
   "design" or "coding": they still need a current checkout to read from and still have to
   isolate from the 5–7 other concurrent sessions on this repo.
2. **From inside that worktree's path** — never the shared checkout at
   `C:/Projects/deepbench-frontend` directly — read this file's own copy, then ask:
   *"Design session or coding session? If coding, paste the kickoff doc path."*
   (Neither — an audit/sweep/investigation? Proceed with the worktree from step 1; there's no
   separate router branch, but the isolation and freshness requirements are identical.)

> **Governance mode (added 2026-08-19, `design-selfbuilding-0819` — registry:
> `docs/GOVERNANCE-MODES.md`, architecture: `docs/ARCHITECTURE.md` §19v):** a human in the
> chat means **Manual Design & Build** — today's process, exactly as this file describes; no
> session asks "which mode?". **Automated** mode cannot be chosen by anyone typing it: it
> exists only in a session launched by the approved runner (`SES-78`, not yet built), which
> stamps its identity into the session's inflight file — no stamp, no Automated, and the
> session proceeds as Manual and stops at its first gate. Non-DeepBench work runs under the
> registry's open mode and never touches this repo or its Supabase.

---

## If DESIGN session:
1. Read `CLAUDE-STATE.md` (current version + blockers)
2. Read `CLAUDE-DESIGN.md` (design workflow for Claude Code)

## If CODING session (kickoff doc provided):
1. Read `CLAUDE-STATE.md`
2. Read the kickoff doc — it contains everything needed for the session
3. Read `CLAUDE-RULES.md` only if you hit a pattern or rule question mid-session

## If CODING session (no kickoff doc given):
**Stop.** Every coding session requires a kickoff doc. Ask John to provide the path or run a
design session first.

---

## Hard rules

These are the always-on rules. Statements only — the *procedures* they imply live in the
`session-setup` skill; the *rationale/history* behind them lives in `docs/SESSIONS.md`.

> **Merge:** Never merge `dev → main` without John's explicit sign-off.

> **Scope:** One feature per session. Max 3 files. Max 4 tasks.

> **Kickoff-gated:** Every coding session must be preceded by a design session that produced a
> kickoff doc.

> **Self-test — no manual-QA hand-off (2026-07-15):** Per the Automated Design→Code→Verify Loop
> (`CLAUDE-DESIGN.md`), every coding session pushes to `dev` itself as part of finishing, and
> every design session verifies its own Manual QA Checklist directly against live systems. John
> is not expected to manually test and should not be asked to — *unless* he started a coding
> session himself by pasting the prompt directly, in which case he closes that loop personally.
> A session asking John to test something it could check itself is the bug to fix, not a reason
> to ask.

> **Verify, never assert from memory (2026-07-15):** Never state a fact about code, schema,
> config, or Supabase data as true because it's recalled from a memory file, an earlier message,
> or "a pattern I've seen before." If it's checkable — a file, a table, a query — check it fresh
> this session before asserting. A memory file's claim is a pointer to go verify, never
> sufficient evidence on its own. If a genuinely fresh check isn't practical, say so explicitly
> ("this is from memory, not verified this session").

> **Never route around a hook deny (2026-07-21, `SES-019`):** If a `PreToolUse` hook denies an
> action and the reason looks like a false positive, never retry the same underlying action
> through a different tool the hook doesn't match (e.g. `git commit` via PowerShell because a
> hook only matches `Bash`) — that defeats the hook regardless of whether this instance was safe.
> Stop, report the exact deny reason, and either fix the root cause or ask before proceeding.

> **No `cd && …` compounds:** Never write `cd "C:/Projects/deepbench-frontend" && <command>` in a
> Bash call. Any `cd && …` compound — not just git — can trigger a hardcoded, non-suppressible
> permission prompt with no Always-allow option. Pass the path directly as an argument instead:
> `git -C "path" <command>`, `grep -rn "pattern" "path/sub1" "path/sub2"`, etc.

> **Worktree isolation (2026-07-07, tightened 2026-07-15):** John runs 5–7 Claude Code sessions
> on this repo simultaneously. Every session — design or coding — isolates its work in its own
> git worktree, branched explicitly from `origin/dev`, as its very first action (see the router
> above and the `session-setup` skill for the commands). Never read/edit/run against the shared
> checkout at `C:/Projects/deepbench-frontend` directly. Do **not** use the `EnterWorktree` tool
> here — the session's working directory is `C:/Projects` (the parent), so it errors. If a
> session ever finds itself about to read a file from the shared checkout directly, treat that as
> a signal something upstream went wrong: `git -C "C:/Projects/deepbench-frontend" fetch origin dev`
> then read via `git … show origin/dev:<path>` instead, and flag the misdirection to John.

> **Sub-agents inherit the worktree, never nest one (2026-07-16, extended 2026-07-17):** Any
> sub-agent spawned via the `Agent` tool — coding, research, audit, or sweep — operates inside
> *this* session's worktree; do **not** pass `isolation: "worktree"`. State the worktree's
> absolute path verbatim in the sub-agent's prompt (a sub-agent given a bare task defaults to the
> discoverable-but-wrong shared checkout). For any sub-agent whose task touches naming,
> architecture, or backlog classification, tell it to read the current
> `CLAUDE.md` / `CLAUDE-DESIGN.md` / `docs/SCREEN-INVENTORY.md` as part of its own bootstrap
> rather than hand-enumerating today's decisions into the prompt.

> **Push with `HEAD:dev`, never bare `dev` (2026-07-16):** Push with
> `git -C "<worktree-path>" push origin HEAD:dev`, never `git … push origin dev`. Worktrees share
> one set of local refs — a bare `dev` refspec resolves to whichever local branch is named `dev`
> (the shared checkout's, deliberately never kept current), not this worktree's HEAD. `HEAD:dev`
> pushes the worktree's actual commit. (Fetch/rebase-before-push mechanics: `session-setup` skill.)

> **Atomic counters, never read-and-increment (2026-07-21):** Version numbers
> (`dev_version_counter`) and feature/backlog IDs (`feature_id_counter`) are both claimed
> atomically from Supabase, never by reading the highest existing value and incrementing it
> yourself — that races under concurrent sessions and has caused real version/ID collisions. Exact
> SQL and project ID: `session-setup` skill. **Filing more than one row at once claims one block of
> that size in one call — never claim a single ID and hand-count the rest (2026-07-28, `SES-18`:
> that hand-count is the mechanism behind every recorded ID collision, including one that reached
> shipped Supabase content).**

> **Hooks are a local backstop, not the source of truth (2026-07-21, `SES-010`):** Six of the
> rules above / in `STANDARDS.md` — no `cd && …` compounds, no bare `git push origin dev`, no
> writing to `src/`/`api/` from a `session/design-*` branch, no reading/editing/running non-git
> commands against the shared checkout, no committing a staged `test-*.mjs`, and no committing a
> `src/`/`api/` change that fails `npm run build` — are enforced by real `PreToolUse`/`PostToolUse`
> hooks on John's machine. **Caveat: those hooks live in `C:/Projects/.claude/settings.json` and
> `C:/Projects/.claude/hooks/*.js` — outside this repo, not git-tracked, not pushed to `dev`.**
> They exist only on the machine where `SES-010` set them up. Don't assume they're present in any
> other environment (a fresh machine, a CI runner, another contributor). The written rules here
> are the source of truth; the hooks are a backstop, not a replacement.

---

## Pointers — everything else has exactly one home

| Need | Home |
|---|---|
| **Session setup** — worktree, `.env.local`, version/ID SQL, inflight files, push/cleanup | `.claude/skills/session-setup/SKILL.md` |
| Rules & reference index (versioning, scope, tokens, roster, schema, patterns) | `CLAUDE-RULES.md` |
| Design workflow (Automated Design→Code→Verify Loop) | `CLAUDE-DESIGN.md` |
| Current version, blockers, in-flight sessions | `CLAUDE-STATE.md` + `.claude/inflight/` |
| Standards, test categories, pre-commit checklist | `docs/STANDARDS.md` |
| Architecture, stack, URLs, schema, capability model | `docs/ARCHITECTURE.md` |
| Design tokens / palette / fonts (values) | `src/tokens.js` + `docs/STYLE-GUIDE.md` |
| Agent roster (source of truth) | `src/data/agents.js` |
| Working with John — decision autonomy tiers, walkthrough gate | `docs/WORKING-WITH-JOHN.md` |
| Session history + the "found live…" rationale behind these rules | `docs/SESSIONS.md` |
| System invariants — **read** when touching the files they govern (tokens→`src/`, logging/capabilities→`api/`, library→`lib/`); don't rely on auto-scoping | `.claude/rules/` |
| Doc-bloat tripwire | `.claude/skills/session-hygiene/` |
| Architecture/scope not settled — run a discovery session (decisions + constraints, no kickoff doc) | `.claude/skills/discovery/SKILL.md` |
| Session lost its frame (wrong architecture / going in circles / after a compaction) — inventory before proposing | `.claude/skills/reframe/SKILL.md` |
| Surprise mid-session dependency ("can't do X until Y") — classify before investigating | `.claude/skills/triage/SKILL.md` |
