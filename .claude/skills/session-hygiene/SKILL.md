---
name: session-hygiene
description: Checks the DeepBench session-management files (CLAUDE-STATE.md, docs/FEATURES.md, recent kickoff docs) for the unbounded-growth drift that caused CLAUDE-STATE.md to reach 45 KB and FEATURES.md to reach 128 KB before the 2026-07-01 cleanup — both were "read every session" files that nobody was actively pruning. Use this at the start of a design or coding session, or whenever John asks about session efficiency, token usage, doc bloat, file cleanup, "am I good to go," or wants a quick sanity check before starting new work. Also trigger on explicit requests like "run the hygiene check" or "audit the docs." This is a fast, cheap check — file sizes and greps, not full-file reads — so it's safe to run proactively; it must never become expensive itself.
---

# Session Hygiene Check

A tripwire, not an audit. The 2026-07-01 cleanup fixed the root causes of doc bloat by making two files self-maintaining (a rolling window on `CLAUDE-STATE.md`, an archive split for `FEATURES.md`) and eliminating a third problem entirely (deleted the hardcoded agent-roster tables instead of trying to keep them in sync). This skill exists to catch it if those rules stop being followed — not to redo the full audit every time. Keep every check here cheap: sizes and greps, never a full read of a file that's supposed to stay small. If this skill itself starts taking meaningful time or tokens, that's a sign it's grown past its job — trim it back to checks, not fixes.

## What to check

Run these against `C:\Projects\deepbench-frontend`. Use size/grep tools, not the Read tool, for steps 1–3 — the whole point is these checks cost near-nothing.

**1. `CLAUDE-STATE.md` size.**
Flag if it exceeds ~10 KB (the post-cleanup baseline is ~4.6 KB). Growth past that usually means the rolling-window close-out step isn't happening — check whether `CLAUDE-DESIGN.md` Step 5c / `DeepBench-Session-Init.md` Step 10c actually ran at the end of the last few sessions.

**2. `CLAUDE-STATE.md` "Last 3 sessions" list.**
Grep for the `**Last 3 sessions:**` line and count the bullet entries under it. More than 3 means the rolling window isn't being enforced — the oldest entry should have been moved into `docs/SESSIONS.md` and dropped from `CLAUDE-STATE.md`.

**3. `docs/FEATURES.md` size and Done-row check.**
Flag if the file exceeds ~90 KB (post-cleanup baseline was ~66.6 KB, but it'll grow slowly as active items get added — that's expected). More diagnostic: check for table rows (lines matching `^\| [A-Z]{2,4}-[0-9]+[a-z]?\s*\|` — note the optional trailing letter, IDs like `AG-04a`/`AG-04b` exist) whose **Status column** is `✅ Done`. There should be none — every Done row is supposed to move to `docs/FEATURES-ARCHIVE.md` at close-out (`CLAUDE-DESIGN.md` Step 5c). Two things to watch for, both found during this skill's first smoke test on 2026-07-01:
- A bare grep for `✅ Done` also matches the legend line and rows whose *description text* mentions another already-shipped feature in passing (e.g. a `❌ Missing` row that says "Depends on: PE-04 ✅ Done" in its description) — that's not drift, don't flag it. Check the actual Status column, not just whether the string appears anywhere on the line.
- A description containing a literal `|` character (e.g. a code snippet like `` `'structural' | 'reasoning'` ``) will throw off naive `split('|')` column counting if you're scripting this rather than eyeballing it. If in doubt on a specific row, read that one line directly rather than trusting a quick parse.

**4. Kickoff doc boilerplate spot-check.**
List `docs/kickoffs/` sorted by modification time and open the single most recent file. Look at its "AI PATTERN CHECK" and "CLAUDE CODE VERIFICATION CHECKLIST" sections. Under the 2026-07-01 "standing rules by reference" rule, an N/A pattern check should be one line, and the verification checklist should reference standing categories by name (e.g. "STANDARDS.md Section 11 applies") rather than re-deriving them in full — see `docs/STANDARDS.md` Section 3. If the most recent kickoff doc restates a standing rule in full prose instead of referencing it, boilerplate is creeping back in. This is a soft check (one doc, recent-ness matters more than exhaustiveness) — don't read more than one or two kickoff docs for this.

## Reporting the result

**If everything's within bounds:** say so briefly — a one- or two-line "all clear," not a report. Don't elaborate on checks that passed. This should read like a quick status ping, not a deliverable.

**If something's flagged:** name exactly what and by how much — e.g. "`CLAUDE-STATE.md` is 14 KB, over the 10 KB baseline — the last session's close-out likely skipped the rolling-window trim" — and stop there. Do not restructure, prune, or edit anything automatically. This mirrors how the original 2026-07-01 cleanup worked: findings first, explicit go-ahead before any file gets rewritten. If the user wants the fix applied, that's a separate, deliberate step — possibly worth using the full audit prompt (below) if more than one thing is flagged at once, since a single flag might just need a two-line edit but multiple flags together might mean the underlying rule needs revisiting, not just a one-off patch.

If asked for the deeper version instead of the tripwire, fall back to this prompt (from the original 2026-07-01 audit conversation) rather than improvising a new one:

> Run a session-efficiency audit: check file sizes for CLAUDE-STATE.md, FEATURES.md, STANDARDS.md, and any docs read unconditionally at session start. Flag anything that's grown past its intended size (unbounded logs, done+active items mixed together, hardcoded tables duplicating a source-of-truth file). For each finding, show before/after size impact and ask before restructuring. Also spot-check whether the "standing rules by reference" pattern in recent kickoff docs is actually holding, or whether boilerplate has crept back in.
