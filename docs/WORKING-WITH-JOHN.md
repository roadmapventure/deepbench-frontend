# Working With John — Design Session Reference

> Read every session (`CLAUDE-DESIGN.md` Step 1) — short, and it shapes everything downstream, not just kickoff-doc content.

**Scope:** this file is about *how a session interacts with John* — pacing, approval gates, terminology discipline, decision-making. It is not:
- **Architecture/technical facts** — those live in `ARCHITECTURE.md` / `STANDARDS.md`, untouched by this doc.
- **Session lifecycle mechanics** (branch discipline, worktrees, QA-gate automation, version claiming) — those live in `CLAUDE.md` / `CLAUDE-DESIGN.md`'s own standing rules.
- **Per-feature history** — that lives in `docs/SESSIONS.md` / `docs/FEATURES-ARCHIVE.md`.

If a pattern here ever conflicts with a fresher read of `CLAUDE-DESIGN.md`/`ARCHITECTURE.md`, the repo doc wins — this file is the index, not a substitute for reading current state (`feedback-verify-never-assert-from-memory` applies here too).

---

## Decision Autonomy Tiers

*(moved here 2026-07-17 from `CLAUDE-DESIGN.md` — same content, this is just its proper home now that a dedicated interaction-patterns doc exists)*

John's own framing: design sessions had been checking in on too many small decisions — not because each individual ask was unreasonable, but because the *default* was tilted too far toward asking, when most of what gets asked about here is cheap to revise if wrong (this repo is mostly markdown; a bad call is a two-minute fix, not a production incident). Three tiers, so "should I ask" stops being a fresh judgment call every time:

**Tier 1 — decide and report, no check-in required:**
- Which backlog file/tier (`FEATURES.md`/`FEATURES-NEXT.md`/`FEATURES-LATER.md`) a new item goes in, when the current criterion clearly applies.
- Whether to fold a finding into an existing row or give it its own ID, when the scope reasoning is clear-cut.
- Wording/phrasing choices in docs that don't touch already-locked terminology.
- Any documentation change that's cheap to revise later with zero downstream cost if it turns out wrong.

**Tier 2 — decide, but flag the call clearly in the close-out report (no need to wait for a response before proceeding):**
- Judgment calls that could reasonably go either way, where the cost of either choice is low. John sees the call made and can redirect after the fact instead of gating the work on approval before it happens.

**Tier 3 — ask first, always:**
- Terminology or naming decisions that become canonical and get referenced by every future session (the specific risk: sessions "talking past" John with invented language).
- Anything touching shared state other sessions or people depend on — pushing to `dev`, deleting a worktree, renaming a heavily cross-referenced ID.
- Reversing or contradicting a decision John already made.
- Anything John has told this session directly he wants to be involved in, for that topic specifically.

**When genuinely unsure which tier a call falls into, default to Tier 2** (decide, flag clearly) rather than Tier 3 (ask and wait) — the cost of a wrong Tier-2 call is a correction after the fact; the cost of defaulting to Tier 3 on everything is the exact fatigue this rule exists to fix.

---

## Before Writing a Kickoff Doc: Walk Through It Live

A design session is a conversation, not solo research-then-document-production. After Architect Review, stop and summarize the problem + proposed approach in plain language (not kickoff-doc prose) — what's broken, what the fix does, tradeoffs or open questions — and wait for explicit approval before writing the kickoff doc file. This is the Tier-3 case of the tiers above: kickoff-doc scope becomes the thing a coding session executes unattended, so it needs a real yes, not an inferred one.

**A vague "keep going" / "sounds good" only approves continuing the topic, not the specific scope just shown** — especially once other exchanges (side questions, tangents) have happened in between and it's no longer obviously the very next reply to the exact proposal. Before writing/committing anything, restate the specific thing about to be built (exact copy, exact scope) in one line and get a direct yes to *that*.

*(Two incidents this pattern is drawn from — `AA-171` went straight from backlog pick to committed kickoff doc with no walkthrough; `MI-62` treated "keep going" after an intervening tangent as approval of specific copy that was never actually re-confirmed. Full detail: `feedback-design-session-walkthrough-required` memory.)*

---

## Read Architecture Before Proposing Scope

Once a session names which Product Focus Area/Screen/Platform Layer it touches (`CLAUDE-DESIGN.md` Step 1's closing question), reading the relevant `ARCHITECTURE.md` sections is mandatory before proposing any scope — not a self-assessed "does this sound architectural" judgment call. That mechanism is fully specified in `CLAUDE-DESIGN.md` Step 1/2; this entry exists so the discipline shows up in the interaction-pattern index too, not just the procedural steps.

Two sharp edges worth keeping in mind, not just the mandatory-read mechanism itself:
- **LOCKED doesn't mean current.** A locked section can go stale when a same-day follow-up session changes the decision without looping back to amend the earlier prose. If a locked section contradicts a fact already sitting in this session's own context (a `CLAUDE-STATE.md` summary, an earlier message), the contradiction itself is the finding — stop and reconcile before proposing scope.
- **Citing that a mechanism exists isn't the same as confirming this specific use of it passes muster.** Run the actual test (e.g. `ARCHITECTURE.md` §19d's sniff test) against the specific relationship being spec'd, not the abstract fact that the doc describes something that could apply.

---

## Design & Coding Discipline (pointers)

These two are the "architecture/code" checkpoints that follow the use case, per the Explanation Order above — the actual mechanisms live elsewhere, indexed here so they're not only findable via memory:

- **No duplicate functionality; spot when something should be a shared platform service.** Before writing new logic, grep for whether it already exists — reuse it, don't build a parallel implementation. If the same bug/gap shape shows up at 2+ call sites, the default hypothesis is a missing/incomplete migration onto an existing shared service, not N independent bugs needing N independent patches. Full mechanism: `CLAUDE-DESIGN.md` Step 4's Architect Review ("Duplicate functionality" + "Multi-site bug pattern → shared-service check" bullets).
- **No hardcoded agent/capability routing, ever.** No agent's Skill, tool description, or delegate declaration may name another agent by id, and no harness-level deterministic `capability_slug → agent_id` lookup either — genericness doesn't cure it, only real agent judgment does. This is the platform's Rule #1. Full mechanism: `ARCHITECTURE.md` §19d/§19e (LOCKED).

---

## Skill/Capability Disclosure When Updating Agent Competencies

*(moved here 2026-07-17 from `CLAUDE-DESIGN.md` — same consolidation as Decision Autonomy Tiers; this is a disclosure/communication discipline, not a technical mechanism, so it belongs in this doc.)*

Before proposing or writing any content that creates, edits, or touches a Skill (`skill_profiles` row) or an agent's competency, state the answers to these explicitly — as part of the conversational walkthrough with John, not buried in a kickoff doc:

- Is this creating a **new** Skill record, or editing an existing one? If new: what are you naming it (slug), and what Skill type (Identity/Behavior/Knowledge/Intent/Format/Guardrails)?
- What **Capability** (`capability_slug`) is it assigned to — name it.
- Does that Capability already have other Skills attached? List them.
- Who (which Agent(s)) is that Capability assigned to (`agent_capability_assignments`) — name them.

**Verify every answer live against Supabase, every time — never from memory, a prior session's finding, or `AGENT-COMPETENCY-MODEL.md`'s own examples.** A wrong assumption here silently mis-scopes the edit (e.g. editing a Skill shared across Capabilities/Agents without realizing the blast radius). Applies to every session touching `skill_profiles`/`capability_skill_profiles`/`agent_capability_assignments` — content-authoring sessions and structural/code sessions alike.

---

## Terminology Discipline

- **Use the real, published AI/ML/agentic-systems term for any technique** — never a DeepBench-invented gloss or a loosely-borrowed term. John: "I have been fighting Claude this entire time to quit making up its own terminology." Before naming a new pattern or mechanism, verify the literature term first (WebSearch if unsure) — don't guess or paraphrase into something more "product-friendly." A rename sweeps every place the term is cited by string, not just one file.
- **Explain DeepBench mechanics using DeepBench's own domain vocabulary** — Skill, Capability, Agent, Intent, Product Focus Area, Layer — never layperson analogies ("form," "checkbox," "option"), even in a plain-language walkthrough for accessibility. **Corrected 2026-07-17:** "Skill Profile," "schema," and "enum" are not examples of this — `Skill Profile` is just the table name (`skill_profiles`) for the same thing the product calls a **Skill** (per the corrected data model), and `schema`/`enum` are generic technical terms any codebase has, not DeepBench-specific concepts. Use them accurately when a field genuinely is a schema or enum column, but don't hold them up as "the real vocabulary" — that's what caused the original confusion this rule exists to fix. John thinks in the platform's own domain model; a layperson analogy forces an unwanted translation step. Simplify *pacing*, never *vocabulary*.
- **Don't invent terminology solo for anything that becomes canonical** — that's Tier 3 above, ask first.

---

## Explanation Order: Use Case → Data Model/Architecture → Code

Whenever explaining a problem, a proposed fix, or a design decision, always follow this order — never lead with mechanism or implementation:

1. **What is the problem** — plain language, grounded in a real scenario, not an abstract description of a mechanism.
2. **What needs to be fixed** — the specific change, described in terms of the use case, not the code that implements it.
3. **What should I expect after the fix** — what's different from John's perspective once it ships.
4. **A real-life example** — walk that same use case through the fix concretely (this agent, this data, this before/after).

**Only after that:** data model / architecture — which tables, which Skill/Capability/Agent relationships, which `ARCHITECTURE.md` section governs it.

**Code comes last**, and in a design-session conversation often shouldn't appear at all — implementation detail belongs in the kickoff doc, not the live walkthrough with John.

This defines the internal structure of each single explanation. It pairs with "one issue at a time" below, which governs pacing *between* separate issues — don't bundle multiple use-case-to-code walkthroughs into one message either.

---

## Communication Pacing

- **One issue at a time, with a concrete use case.** John processes one issue at a time and needs a concrete story — specific agent, specific data, specific before/after — to reason about a proposal; an abstract mechanism description isn't enough even when technically accurate. When there are multiple findings or options, present exactly one and stop for his reaction before moving to the next — don't bundle 3-4 into one message, even related ones.
- **Agent name + role together, every mention** — format `FirstName — Role` (e.g. "Nadia — Data Analyst"), no surname, no agent code. Name alone forces John to context-switch to look up who it is. No "same tight exchange" carve-out — a long multi-topic conversation doesn't stay tight, and bare names creep back in within a few messages of a fresh mention if the discipline lapses. Source of truth for role: `src/data/agents.js`, read fresh, not from memory of who exists.
- **Backlog item ID + Type together, every reference** — format `ID (Type)` or `ID — Type` (e.g. "AA-191 (Architecture)"), in conversation, not just formal doc rows. For legacy area-prefix IDs, add which new screen-code bucket it maps to (or "not yet mapped" if genuinely unmapped) — never silently rename the ID itself. For anything fully shipped/archived, suffix `-done` (e.g. "AA-195-done") so status is visible without a lookup.

---

## Take Absolute Rules Literally

When John states a rule in absolute terms — "only X," "no one but X," "never," "always" — apply it to every sub-case you can think of *before* responding, not after being asked. Don't propose a narrower reading, don't carve out an exception for a sub-case, don't ask "does this also apply to Y?" when Y is obviously covered by the same statement — asking that is itself a sign the rule wasn't actually accepted yet. If a sub-case is genuinely ambiguous, say so once and move on with the strict reading as the working assumption. Cross-check existing shipped code against the full-scope rule immediately, not as a follow-up.

---

## Approval Gates

- **UI appearance decisions** — never remove, change, or add a visual element (animations, icons, colors, labels) unilaterally, even when it seems like the obviously-correct call technically. State what's changing and ask before writing it into a kickoff doc.
- **File merges or deletions** — surface explicitly during design, before the kickoff doc is written: which files, why (e.g. Vercel file-count limit), and the consequences (callers affected, behavior changes, risk). Wait for explicit approval. **Getting approval to delete a file is not the same as having verified everything inside it is safe to lose** — read a file's full content before deleting or overwriting it if it hasn't already been fully read in the conversation, even under blanket approval; "approved for deletion" may rest on a shared understanding of the file's *purpose* that doesn't account for everything actually inside it. Check `git log --all -- <path>` first — an untracked file has no safety net.

---

## Scope & Judgment Discipline

- **Deadlines are never a silent driver of scope or architecture.** A stated deadline anywhere in memory or docs is not automatic license to bias recommendations toward speed or a "good enough for now" scope — present the full-quality option as the default; only weight toward speed if John says so explicitly, for that decision.
- **Persist confirmed decisions into the relevant doc the same turn** they're confirmed — a naming call, an architecture split, a process rule. Don't wait to be asked "now write it down" a second time. If unclear which doc it belongs in, make a reasonable call and say so briefly rather than asking John to decide something he doesn't have context to evaluate.
- **Log session-only findings to the tracked backlog before the session ends** — a side discovery, an unconfirmed hypothesis, a "worth checking later" note that exists only in this conversation's context is knowledge that's lost the moment the conversation ends. Give it a real `FEATURES.md`/`FEATURES-NEXT.md`/`FEATURES-LATER.md` row (even a `❌ Missing` placeholder), not a mention buried in a kickoff doc's CONTEXT section.
- **After root-causing an incident down to its mechanism, ask what upstream process gap let the precondition exist — and propose closing it in the same pass**, not after being asked a second time. Fixing the specific instance and adding a detection rule for the narrow symptom pattern is necessary but not sufficient; a genuinely thorough pass also asks whether a missing rule, required field, or structural anchor would prevent the precondition from existing at all.

---

## Source Memories

Each pattern above originated as a Claude cross-session memory file. Kept here for the eventual `SES-002` sweep (full memory-vs-repo consistency pass) — not needed for day-to-day use, this doc is now the operative version:

`feedback-decision-autonomy-tiers`, `feedback-design-session-walkthrough-required`, `feedback-architecture-first`, `feedback-standard-ai-terminology`, `feedback-deepbench-native-terminology`, `feedback-one-issue-at-a-time-use-cases`, `feedback-use-case-first-explanation-order`, `feedback-agent-name-title-role`, `feedback-show-id-and-type-when-referencing`, `feedback-take-absolute-rules-literally`, `feedback-no-ui-decisions`, `feedback-file-merge-approval`, `feedback-deadline-not-driver`, `feedback-persist-confirmed-decisions`, `feedback-log-session-only-findings`, `feedback-generalize-root-cause-to-process-gap`.

Two related memories deliberately stay memory-only, not folded in here: `feedback-cst-timestamps` (explicitly cross-project, not DeepBench-specific) and `feedback-memory-repo-sync` (explicitly Claude's own discipline, not a repo rule other sessions/models could act on).
