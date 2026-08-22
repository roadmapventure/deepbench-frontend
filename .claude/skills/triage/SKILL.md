---
name: triage
description: Decides whether a surprise dependency discovered mid-session actually blocks the current work, or is a separate item wearing a dependency costume. Use the moment something unexpected surfaces that seems to require fixing before the session can continue — a missing table, an unlogged event, an untagged call, an anomaly, a doc contradiction, or any "we can't do X until we fix Y" reasoning. Use it before investigating, not after. Prevents a scoped session from silently becoming an unscoped one.
---

# Dependency Triage

Something surprising surfaced. Before going near it, classify it. Most rabbit holes
are adjacent work misfiled as blocking.

**Do not investigate yet. Do not propose a fix.** Answer the three questions first.

## The three questions

1. **What decision in *this* session changes depending on the answer?** Be specific
   and name the decision. If nothing in this session changes, the honest answer is
   "nothing."
2. **What is the minimum *fact* needed to proceed?** A fact, not a fix. Usually one
   yes/no or one number.
3. **Can that fact be established in three tool calls or fewer?** If not, say what it
   would actually take.

Report the three answers and wait.

## Classification

File any new item straight into `public.backlog_items` per `CLAUDE-DESIGN.md`'s Backlog
Capture rule — the canonical INSERT is `session-setup` skill step 3c; the now/next/later
choice is the row's `tier` column (the three `FEATURES*.md` files are legend-only stubs
since `v7.0.113` and hold no rows). Claim its ID atomically from Supabase per `CLAUDE.md`'s
feature-ID-counter rule — never by reading the highest existing number. When unsure
between now and next, that's Tier 1 if the criterion clearly applies, otherwise ask.

- **Adjacent** — nothing in this session changes. File it with enough detail to be
  picked up cold, and continue. Do not design the fix.
- **Blocking** — a decision here genuinely depends on it. Get the *fact only*, within
  the tool-call budget, then continue the original work. File the fix as its own ID in
  the same turn, while context is fresh. Do not solve it now.
- **Invalidating** — this session's premise is wrong. Stop. Say so directly. Write
  what's settled, file the correction as the next session's item, and close out.
  Continuing produces a decision built on a false foundation.

## After filing

For anything blocking or invalidating, ask one more question:

> What constraint, written down, would have made this visible at session start instead
> of mid-session?

Sometimes there isn't one. Often it's a single line — a property of the system that is
true and has never been written anywhere. When it exists and maps to specific files,
add it as a path-scoped rule in `.claude/rules/`; otherwise put it as a one-line
invariant in the governing `ARCHITECTURE.md` section. The ticket captures the work;
the constraint prevents the next surprise of the same shape.
