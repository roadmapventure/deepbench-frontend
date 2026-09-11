# AGT-70 — The Auditor: a governance agent that reviews agent data, governance docs, rules, directives and tooling configuration every week for duplication, contradiction, redundancy, irrelevance and competing purpose, and files what it finds

<!-- DeepBench | docs/harvests/AGT-70.md | Filed 2026-09-10 by attended session review-govtooling-0910
     on John's word (verbatim in the first paragraph). This file is the full ticket text, moved here
     under CLAUDE-DESIGN.md step 9's over-cap rule (session-hygiene check 3d, 2000-char cap); the
     backlog_items.description row is a pointer to it. Move, never delete: this text landed here before
     the row was trimmed. -->

**P10 - Tooling.** JOHN-NAMED 2026-09-10, verbatim: "create a ticket to create an agent that is a data and code auditor - it reviews agents data, content, and all the tooling, configuration, governance .md files and searches for duplication, disagreements, redundant, irrelevancy, competing, and contridictary statements, purpose, and intention. It checks weekly".

## Use case

The platform's rules live in five places that drift apart: Skill rows on the six governance agents, `governance_rules` and their canonical docs, the standing directives, the runbooks and `CLAUDE*.md` files, and the tooling configuration (scripts headers, `.claude/rules`, settings, `vercel.json`, `ci.yml`, the routine prompt). The byte-level tripwire (`check-session-docs.js` checks 9/10/11) catches a rule statement that no longer matches its registry row; nothing catches two statements that are each internally consistent and contradict each other.

Found by hand on 2026-09-10 alone: `runner_settings.interval_hours = 1` while every doc says a 3-hour grid; the Prioritizer's rank order vs `recompute_backlog_queue()`'s key order (OD-43 vs OD-01); the cloud routine's prompt ordering work by FEATURES.md while the runbook says the queue function's first row; `OFF_BENCH_AGENT_IDS` gating the Bench on an exit review that already passed; `pz-*` Skill rows storing temperature 0 for a model that rejects temperature; the charter's own "Execution status: Awaiting John's mark" a month after M0-M7 ran. The charter's exit criterion 3 ("re-running the founding five-auditor governance audit returns no stale statements, contradictions, or unfollowable rules") has no standing instrument; Selfbuild M1 ran that audit once by hand.

## The agent

The Auditor, GV-07, lane governance, hidden from the Bench like the other six (AGT-69 rules how governance agents appear), built complete in one session per the AGT-63..68 precedent: `agents` row with all fields, `AVATAR_CFG` + `AGENT_PRONOUNS` entries, `OFF_BENCH_AGENT_IDS` membership, five Skill types (no Format Skill), one write handler, seed SQL under `docs/design/`. Rule #1 holds: its Skill rows name no other agent; it reads `agents` / `capabilities` / `skill_profiles` / `capability_skill_profiles` generically as tables. Charter premise 3 holds the other way too: it never edits, never certifies a ship, and never resolves what it finds; it files.

## Capabilities (two, so the corpus is bounded per call)

1. **`audit-agent-data`**: every governance and product agent's Skill rows, capability links and assignments. Finds: duplicated method text across Skills (verbatim or near), guardrails that contradict another Skill on the same capability or another agent, purposes that compete (two agents whose objectives claim the same decision), stale references (a Skill citing a retired rule, a deleted route, a passed review, a model parameter the lane rejects), irrelevant content (knowledge no capability on that agent can use).
2. **`audit-governance-corpus`**: `governance_rules` (live), `runner_directives` (queued standing decisions), `docs/SELFBUILD-CHARTER.md`, `docs/GOVERNANCE-MODES.md`, `docs/ARCHITECTURE.md` §19, `docs/RUNNER-GOV-*.md`, `docs/runbooks/*.md`, `CLAUDE*.md`, `.claude/rules/*.md`, `.claude/settings.json`, `vercel.json`, `.github/workflows/ci.yml`, `scripts/*.js` headers, and `docs/runbooks/routine-prompt.md` (SES-355). Finds: two live statements that disagree on one governing fact (a number, a key order, a lane, who clears a flag), a rule stated in live voice that a later ship retired, a default with two homes, a document whose stated purpose another document now serves, a passage kept RETIRED IN PLACE whose live twin has since drifted from it.

## Method (design decides the exact shape; these are the constraints)

A weekly diff-driven pass on the session lane (subscription), never the executor, run from runner-cycle step 4d once per ISO week on the first scheduled cycle that passes the walls, or from an attended session while the routine is off. Pass one extracts governing statements per source into a statement table with source, location and verbatim text (the mechanical lane may do extraction; the judgment lane does the comparison); pass two compares within topic clusters, never the whole corpus in one prompt. Every finding carries: kind (`duplicate` | `contradiction` | `redundant` | `stale-or-irrelevant` | `competing-purpose`), the two or more locations verbatim, the governing fact in dispute, a confidence, and a one-line proposed resolution that names which home should win and why, citing the retirement ledger or the decision that made one side true. It never proposes a resolution that retires B20, HR-MERGE, or any John-standing power.

## Where findings land

A findings ledger (`public.audit_findings`, append-only, with a fingerprint so a finding seen last week is the same finding, not a new one) rendered as a block on the standing brief; the top findings by confidence become backlog rows through `scripts/tripwire-to-backlog.js`'s dedupe path, capped per week so the board is not flooded; the full report lands at `docs/audits/<ISO-week>.md` and is committed at the next ship point. A finding John rules "not a defect" is recorded with the ruling and never re-filed.

## Lanes declared (SES-359 scope)

Extraction on the mechanical lane or session, comparison on the judgment lane, both session-billed; executor: none. Dollar band: $0 at build and per run.

## QA that discriminates

The first run over today's corpus must report at least the six hand-found contradictions above, each with both locations verbatim; a second run over a fixture corpus with those six resolved reports none of them and no false positive on the RETIRED IN PLACE passages that are supposed to differ from their live twins (the negative control); week-two findings dedupe against week-one by fingerprint; the agent's own Skill rows pass the agent-data audit (it audits itself and finds nothing, or finds something and files it). Guarded by `tests/regression/agt-70-auditor.test.mjs` on fixtures, plus one live arm that declares not-run without credentials.

## Not in scope

Fixing anything it finds (each finding is a ticket for a builder); auditing product data such as `the_library` or customer content (a later capability); code review of `src/` and `api/` logic (the Verifier's territory at ship time). Design session first, kickoff per CLAUDE-DESIGN.md Step 4 with the lane declaration.
