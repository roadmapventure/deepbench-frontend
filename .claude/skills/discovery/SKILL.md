---
name: discovery
description: Runs a DeepBench DISCOVERY session — the session type for when an item's architecture, taxonomy, or scope is not yet settled and John needs to decide it. Use whenever a session starts with an item whose shape is unclear, whenever John says "discovery", "let's discuss", "I'm not sure what this is", or asks what an item means before building it. Also use it if a design session turns out to have no settled architecture to design against. Discovery produces decisions and constraints, never code and never a kickoff doc.
---

# Discovery Session

Discovery is a third session type alongside design and coding. Design assumes the
architecture is settled and produces a kickoff doc. Discovery is what you run when
it isn't. Set up the session worktree first, exactly as `CLAUDE.md` requires;
everything below happens inside it.

## Deliverable

Two outputs, both committed to `dev` before the session ends:

1. **The decision, in `docs/ARCHITECTURE.md`** — reasoning, current-vs-future state,
   what was ruled out. This is the descriptive record. **Append** a new section;
   never rewrite a `[LOCKED]` section without John's explicit approval (Tier 3 per
   `docs/WORKING-WITH-JOHN.md`). If a discovery genuinely overturns a LOCKED
   decision, that supersession is John's call to state, not one you make while
   writing it up.
2. **The enforceable subset, as a rule that loads only when relevant.** If the
   constraint maps to specific files, write it as a **path-scoped rule** —
   `.claude/rules/<topic>.md` with `paths:` frontmatter naming the files it governs
   (e.g. `src/tokens.js`, `api/capabilities/**`) — so it loads only when a future
   session touches those files, never always-on. Under 15 lines, prohibitions only,
   no narrative. If it doesn't map to file paths, put it as a one-line invariant in
   the governing `ARCHITECTURE.md` section instead and say so — don't force an
   always-on rule that taxes every session.

No code. No files touched in `src/` or `api/`. No kickoff doc — that's the *next*
session, run against the constraints this one produced.

If a decision can't be written as a checkable constraint, say so explicitly. That
usually means it isn't settled yet, and John needs to know before anything is built
on it.

## Stop conditions

End when the constraints are written and committed — not when context fills up.
If six turns pass without converging, stop and say so: what's settled, what's open,
and recommend either a narrower question or a separate session. Do not keep proposing.

## Conduct

General session conduct applies in full — see `docs/WORKING-WITH-JOHN.md` (one issue
at a time, use-case-first, approval gates) and `CLAUDE.md`'s hard rules (verify,
never assert from memory). Two points discovery leans on hardest, kept here because
they bite most in an unsettled session:

- **State the constraint before the solution.** When proposing anything, first name
  the property it must satisfy. If you can't name one, that's the finding.
- **Never convert an unsettled question into a ticket ID.** Open questions get
  written as questions. Turning them into IDs makes them look decided, and they
  resurface later as items nobody can explain.

## Close-out

Report, in order: (1) what was decided, (2) the constraints written and where,
(3) what's still open — as questions, not tasks, (4) any doc drift found along the
way, (5) what the next session should be.
