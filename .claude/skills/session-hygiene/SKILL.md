---
name: session-hygiene
description: Checks the DeepBench session-management files (CLAUDE-STATE.md, docs/backlog/BACKLOG-SNAPSHOT.md — the in-repo copy of the public.backlog_items ticket store, recent kickoff docs) for the unbounded-growth drift that caused CLAUDE-STATE.md to reach 45 KB and FEATURES.md to reach 128 KB before the 2026-07-01 cleanup — both were "read every session" files that nobody was actively pruning. Use this at the start of a design or coding session, or whenever John asks about session efficiency, token usage, doc bloat, file cleanup, "am I good to go," or wants a quick sanity check before starting new work. Also trigger on explicit requests like "run the hygiene check" or "audit the docs." Also watches docs/STANDARDS.md for the same class of drift (duplicate category definitions, dangling section cross-references) as of SES-009b. This is a fast, cheap check — file sizes and greps, not full-file reads — so it's safe to run proactively; it must never become expensive itself.
---

# Session Hygiene Check — loader

**The procedure lives in `docs/runbooks/session-hygiene.md` — read that file and follow it; it is the canonical copy.** (Body moved there verbatim in v7.0.198, `SES-121`: it churned too often to live under `.claude/`, which unattended cycles cannot edit — register B39. This loader exists only so the harness can discover and trigger the skill; the description above is unchanged.)
