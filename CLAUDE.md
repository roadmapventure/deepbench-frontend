# DeepBench — Session Router

**Before reading anything else, do this — every session, design or coding:**
1. Set up your session worktree (see the concurrent-sessions hard rule below for the exact commands: name-collision check, `git fetch origin dev`, `worktree add ... origin/dev`). Do this first, before any orientation reads — not deferred until you're about to edit a file. A worktree freshly branched from `origin/dev` is a correct, current checkout by construction, which is what makes step 2 safe.
2. From inside that worktree's path — never the shared checkout at `C:/Projects/deepbench-frontend` directly — read this file's own copy, then ask: "Design session or coding session? If coding, paste the kickoff doc path."

**Retired 2026-07-15 (doc-hygiene session):** this file previously specified a separate "read-only bootstrap check" (`git fetch` + `git show origin/dev:<path>`) to work around the shared checkout's disk copy going stale, applied only to this file and `CLAUDE-STATE.md`. That's now redundant — since the worktree above is created fresh from `origin/dev` before any reads happen, every file in it (this one, `CLAUDE-STATE.md`, `docs/FEATURES.md`, everything) is already correct, with one normal Read call each instead of a fetch+`git show`+scratch-file dance per file. This also fixed a real inefficiency: a design session on 2026-07-15 read `CLAUDE-STATE.md` twice — once from the stale shared checkout for a hygiene check, once again via `git show` for real content — burning ~13% of context before any actual work started.

---

## If DESIGN session:
1. Read `CLAUDE-STATE.md` (current version + blockers)
2. Read `CLAUDE-DESIGN.md` (design workflow for Claude Code)

## If CODING session (kickoff doc provided):
1. Read `CLAUDE-STATE.md`
2. Read the kickoff doc — it contains everything needed for the session
3. Read `CLAUDE-RULES.md` only if you hit a pattern or rule question mid-session

## If CODING session (no kickoff doc given):
**Stop.** Every coding session requires a kickoff doc. Ask John to provide the path or run a design session first.

---

> **Hard rule:** Never merge `dev → main` without John's explicit sign-off.
> **Hard rule:** One feature per session. Max 3 files. Max 4 tasks.
> **Hard rule:** Every coding session must be preceded by a design session that produced a kickoff doc.
> **Hard rule:** Never write `cd "C:/Projects/deepbench-frontend" && <command>` in a Bash call. Any `cd && ...` compound — not just git — can trigger a hardcoded, non-suppressible permission prompt with no Always-allow option (confirmed for `cd && git ...` and `cd && grep ... | ...`). Instead, pass the path directly as an argument to the command (`git -C "path" <command>`, `grep -rn "pattern" "path/subdir1" "path/subdir2"`, etc.) so no directory change occurs at all.
> **Hard rule (added 2026-07-07 — concurrent sessions, timing tightened 2026-07-15):** John runs multiple Claude Code sessions on this repo simultaneously. Every session — design or coding — must isolate its work in its own git worktree as its very first action, before reading or editing any file or spawning a coding agent (not deferred until the first edit — see the top of this file). Do NOT use the `EnterWorktree` tool here — the session's own working directory is `C:/Projects` (the parent of this repo), not the repo root, so `EnterWorktree` cannot recognize it and will error ("not in a git repository"). Instead, set up and use a worktree manually:
> 1. **First check for a name collision:** `git -C "C:/Projects/deepbench-frontend" worktree list` — if a worktree with your intended `<short-session-name>` already exists, pick a more specific name (include a topic hint, not just a date — multiple sessions on the same day will otherwise pick the same generic name, e.g. two unrelated sessions both trying `design-0707`). Then: `git -C "C:/Projects/deepbench-frontend" worktree add ".claude/worktrees/<short-session-name>" -b "session/<short-session-name>" origin/dev` — **always branch explicitly from `origin/dev`**, never rely on a tool's default base ref. This repo's remote default branch is `main`, not `dev` — a tool that branches from "the default branch" will silently branch from the wrong place.
> 2. Do all Read/Edit/Write/Bash work for the rest of the session against that worktree's absolute path (`C:/Projects/deepbench-frontend/.claude/worktrees/<short-session-name>/...`) — never the shared checkout at `C:/Projects/deepbench-frontend` directly. For git commands, use `git -C "<worktree-path>" <command>` (never `cd` into it, per the rule above).
> 3. If this session spawns a coding agent via the `Agent` tool, do **not** pass `isolation: "worktree"` — the coding agent should operate inside this session's own worktree (already isolated from every other concurrent session), not a second nested worktree. Point it at the same worktree path.
> 4. Before any push to `dev` (kickoff commit, close-out commit — anything) from inside the worktree: `git -C "<worktree-path>" fetch origin dev` then rebase onto it (`git -C "<worktree-path>" rebase origin/dev`) before pushing. If the push is rejected as non-fast-forward, another concurrent session merged first — re-fetch, re-rebase, and retry once.
> 5. Before assigning a version number in a kickoff doc (`CLAUDE-DESIGN.md` Step 4), re-check `CLAUDE-STATE.md`'s "Version in dev" against a fresh `git fetch origin dev` — do this again immediately before your final push, not just once at kickoff-writing time. Another concurrent session may have already claimed that version number; if so, bump to the next free one before pushing.
> 6. When editing `CLAUDE-STATE.md`: it now supports multiple concurrent entries under "In flight now" (a list, not a single line) — add your own bullet, never overwrite another session's. When picking "what's next," claim the next unclaimed item from the queue below rather than assuming you're the only session working through it.
> 7. When your session is fully done (worktree merged into `dev` and pushed), remove the worktree: `git -C "C:/Projects/deepbench-frontend" worktree remove ".claude/worktrees/<short-session-name>"` then `git -C "C:/Projects/deepbench-frontend" branch -D "session/<short-session-name>"`.
> 8. **(added 2026-07-07 — doc-cleanup session)** When your session finishes and you push its close-out commit, also delete your own bullet from `CLAUDE-STATE.md`'s "In flight now" list in that same commit — it's your job to remove it, not the next session's to notice it's stale. If two "In flight now" bullets edit unrelated lines, a rebase conflict here is just a textual adjacency collision — keep both sides' bullets (add/remove independently) rather than picking one, same resolution pattern already used for `CLAUDE-STATE.md`'s queue section.
