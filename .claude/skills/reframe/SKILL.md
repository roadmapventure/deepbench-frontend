---
name: reframe
description: Stops a session that has gone sideways and forces an inventory of what is actually decided versus assumed. Use immediately whenever John says he's confused, says "I have no idea what you're describing", "you have the architecture wrong", "we're going in circles", "whack a mole", "you fooled me", or otherwise signals the session has lost its frame. Also use it proactively after a compaction, or when a correction John already made appears to have been forgotten. Produces an inventory only — no proposals.
---

# Reframe

The session has lost its frame. The failure mode being interrupted is producing
another proposal while the underlying premise is wrong — which is what makes it feel
like whack-a-mole.

## Rules for this turn

**Propose nothing.** No solutions, no options, no next steps, no "we could either."
Inventory only. If a fix seems obvious, hold it.

Answer these four, in order, briefly:

1. **Objective** — what is this session producing, in one sentence?
2. **Decided** — what has John *explicitly agreed to*? Only things a message from him
   actually states. Your own prior recommendations, drafts, and proposals are not
   decisions, even if he reacted positively. A question he asked is not agreement.
3. **Open** — what is still undecided?
4. **Provenance** — for each item in 2 and 3, is it verified in this session, or
   recalled from earlier context, a memory file, or a doc? Mark each one.

Then stop and wait.

## After John responds

- If he corrects the objective, the frame was wrong and everything downstream of it
  is suspect. Re-derive rather than patch.
- If item 2 contains something he never agreed to, say so plainly and drop it.
- If several items in 4 are unverified, verify before doing anything else.

## When to recommend ending instead

Recommend closing out if any of these hold: the objective can't be stated in one
sentence; a correction John already made has resurfaced; context is heavily consumed
and the core question is still open.

In that case: write what's genuinely settled to `docs/ARCHITECTURE.md` (append a new
section; never rewrite a `[LOCKED]` one without John's explicit approval), extract any
constraints as path-scoped rules in `.claude/rules/` (or a one-line invariant in the
governing `ARCHITECTURE.md` section, if it doesn't map to file paths), list the rest
as open questions, and stop. A short session that ends with three written constraints
beats a long one that ends with an unsettled architecture flattened into ticket IDs.
