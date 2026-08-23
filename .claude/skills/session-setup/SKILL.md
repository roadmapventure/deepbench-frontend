---
name: session-setup
description: The step-by-step mechanics every DeepBench session runs at start and close — creating the isolated git worktree (branched from origin/dev) with a name-collision check, copying .env.local in, claiming a version number and feature/backlog IDs atomically from Supabase, creating and later deleting the per-session inflight file, and the fetch/rebase/push-HEAD:dev/cleanup sequence. Use this at the very start of ANY session (design, coding, audit, sweep) the moment CLAUDE.md's router says "set up your worktree," and again at close-out when pushing and removing the worktree. Also use it whenever you need the exact worktree, version-claim, feature-ID, inflight, or push commands rather than re-deriving them. The rules these procedures enforce are stated in CLAUDE.md; this skill is the how, with the why kept to a clause where it prevents a real mistake. Full "found live" history lives in docs/SESSIONS.md.
---

# Session Setup — Worktree, Counters, Inflight, Push — loader

**The procedure lives in `docs/runbooks/session-setup.md` — read that file and follow it; it is the canonical copy.** (Body moved there verbatim in v7.0.198, `SES-121`: it churned too often to live under `.claude/`, which unattended cycles cannot edit — register B39. This loader exists only so the harness can discover and trigger the skill; the description above is unchanged.)
