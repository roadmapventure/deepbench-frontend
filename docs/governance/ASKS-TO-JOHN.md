<!-- DeepBench v7.0.544 | docs/governance/ASKS-TO-JOHN.md | AGT-86 slice 1c — A-27: the Auditor's ruling moves to the manager (SES-413 census, 27 rows) -->
# Asks to John — the inventory `MANAGER-DECIDES-BY-DEFAULT` is measured against

Rule `MANAGER-DECIDES-BY-DEFAULT` (`public.governance_rules`, canonical home
`docs/WORKING-WITH-JOHN.md#decision-autonomy-tiers`) says anything that would come to John goes to
The Development Manager (GV-01) first. This file is the census that claim is checkable against: one
row for every place in the platform — doc, rule, runbook, table comment or column — that puts a
question to John as things stand on 2026-09-18, plus A-27 added 2026-09-23 (AGT-86).

**Mark** carries one of exactly two literals, spelled in the rows themselves rather than restated
here so the counts below stay greppable. **20 rows** are the manager's to decide under the rule
above, recorded with `record_decision()` and its before-images so each one can be reversed.
**7 rows** stay John's, and every one of those names its reserved call in **Why** — *money*,
*production*, *hire*, *switch*, *ruling* or *undo*.

Slice 1 (this ship) only *marks* the rows. **Slice 2 routes the moved ones**: the mechanics of the
20 — which surface replaces each ask, and on whose decision row — are `SES-413` slice 2's work and
wait on `SES-378` / `SES-402`. Nothing in this file changes behaviour by itself.

| Row | Where | The ask today | Mark | Why |
|---|---|---|---|---|
| A-01 | `docs/WORKING-WITH-JOHN.md`, retired Tier 3 + "Terminology Discipline" | Terminology or naming that becomes canonical; "don't invent terminology solo … ask first" | moved-to-manager | Naming sits inside his standing rules, and a recorded naming decision can be reversed as cheaply as it was made. |
| A-02 | `docs/WORKING-WITH-JOHN.md`, retired Tier 3 | Anything touching shared state other sessions depend on — pushing to `dev`, deleting a worktree, renaming a cross-referenced ID | moved-to-manager | Shared-state writes are already covered by before-images and revert-forward; none of the three reserved calls is engaged. |
| A-03 | `docs/WORKING-WITH-JOHN.md`, retired Tier 3 | Reversing or contradicting a decision John already made | kept | His ruling is his to change: the manager decides *within* his standing rules and never rewrites one, so this is filed as a `runner_questions` row and counted. |
| A-04 | `docs/WORKING-WITH-JOHN.md`, "Before Writing a Kickoff Doc" | Explicit approval of the walkthrough's scope before the kickoff doc is written | moved-to-manager | The yes becomes a recorded scope decision; an unattended cycle still gets a real yes, just not John's. |
| A-05 | `docs/WORKING-WITH-JOHN.md`, "Approval Gates" | Never remove, change or add a visual element unilaterally — state it and ask | moved-to-manager | An appearance call is revisable in one commit and costs no money, no release and no agent. |
| A-06 | `docs/WORKING-WITH-JOHN.md`, "Approval Gates" | File merges or deletions — which files, why, consequences — wait for explicit approval | moved-to-manager | Code reverses forward and the full-content read before deleting is unchanged; the gate was the ask, not the discipline. |
| A-07 | `docs/WORKING-WITH-JOHN.md`, retired Tier 3 | Anything John told this session directly he wants to be involved in, for that topic | kept | A standing instruction of his is a ruling; the manager cannot decide it away, only file against it. |
| A-08 | `governance_rules` `AGENT-ROW-AGREED-TICKET`, `.claude/rules/agent-roster-inert.md` | Any agent-row write no agreed ticket names | moved-to-manager | That rule's own second limb already accepts an unreversed decision row naming the ticket and the change; the manager's row is exactly that. |
| A-09 | `.claude/rules/agent-roster-inert.md:11`, same rule | Creating an agent John has not seen, and flipping `agents.is_active` on | kept | Hiring: flipping `is_active` on is John signing the hire card, never automated. |
| A-10 | `docs/ARCHITECTURE.md` §19v, gated lane | Terminology, architecture supersessions, LOCKED-section changes, schema-destructive migrations, §19e-owned work, active-agent edits, the four harness files | moved-to-manager | Every limb of the gated lane except the last is reversible platform work inside his standing rules. |
| A-11 | `docs/ARCHITECTURE.md` §19v, and `governance_rules` `HR-MERGE` | `dev` → `main` | kept | Releasing to production is one of the three; `HR-MERGE` stands unchanged. |
| A-12 | `.claude/rules/capabilities-are-data.md:18` | An Automated-mode session may diagnose and draft the diff, but it lands as a proposal for John | moved-to-manager | The diff is data with a before-image; the proposal becomes a decision the manager records. |
| A-13 | `docs/runbooks/runner-cycle.md:4092`, `public.runner_questions` | Every question a cycle wants to ask John is INSERTed here — 17 `status='open'` today | moved-to-manager | The table survives as the counted channel for a ruling change (A-03); asking it by default does not. |
| A-14 | `public.runner_card_asks`, `docs/runbooks/briefing-page.md:1157` | John's free-text ask on a card, answered on its own card next cycle | moved-to-manager | His ask is an instruction to answer, not a decision to route back to him. |
| A-15 | `public.briefing_comments`, `docs/runbooks/runner-cycle.md:1154` | Briefing comments routed as questions rather than as requirements | moved-to-manager | A comment is input to a decision; the manager makes the decision and lists it. |
| A-16 | `docs/runbooks/runner-cycle.md:2015`, heal engine | Exit 1 means "new findings for John to read" and is never a signal to `--apply` — only John's hand | moved-to-manager | Heal findings are reversible repairs with before-images; the hand can be the manager's. |
| A-17 | `docs/runbooks/runner-cycle.md:2699`, `john-paced` | No gated card carries `john-paced`, and assigning it is John's call | moved-to-manager | Pacing a ticket is a scheduling judgment inside his standing rules, and it is undone by reassigning. |
| A-18 | `public.epics` table comment | "Epic creation is ask-first (John, 2026-08-22); only Automation is pre-authorized" | moved-to-manager | An epic is a reporting lens, never a queue sort key, so a wrong one costs a rename. |
| A-19 | `public.visitor_labels` table comment | Any new `visitor_id` first seen after 2026-08-10: never auto-attribute, ask John per visitor | moved-to-manager | Attribution is a recorded, reversible row; the standing rules in that comment are what the manager decides within. |
| A-20 | `docs/runbooks/routine-prompt.md:15` | Commit, then — on John's word — push the block verbatim | moved-to-manager | The push is to `dev`, not to production, and revert-forward covers it. |
| A-21 | `public.runner_settings.scheduler_on` | Turning the routine on or off | kept | Switching the routine on or off is the switch half of his hiring-or-switching call. |
| A-22 | `docs/runbooks/briefing-page.md:958` | "Open questions for John" imported as `low`-confidence rows | moved-to-manager | A low-confidence import is a candidate to resolve, not a question that needs him. |
| A-23 | `.claude/skills/discovery/SKILL.md:19-21` | Never rewrite a `[LOCKED]` section without John's explicit approval; a supersession is John's call to state | moved-to-manager | Same limb as A-10: a LOCKED rewrite is recorded, reversible doc work, and the discovery skill should cite the rule rather than carry its own gate. |
| A-24 | `docs/runbooks/runner-cycle.md:2345` | A late drain member "waits for John" | moved-to-manager | Waiting is the failure this rule exists to end; the manager drains and lists what it drained. |
| A-25 | `budget_override` / `max_usd` — `governance_rules` `B32`, `OD-24` | Raising the day's token or dollar cap; the override is John's word alone | kept | Spending money is one of the three: the system surfaces the approaching wall, John grants the raise. |
| A-26 | The Reverse handle — `governance_rules` `M6-02` | John's Reverse on a decision inside the 72-hour window | kept | The undo is what makes the manager's authority safe to grant; only John reverses. |
| A-27 | docs/runbooks/runner-cycle.md:2025, step 4d (AGT-70) | "only John's hand ingests, and only he rules" — the Auditor's ledger: the --ingest line is a dry run, and status, ruling, ruled_by, ruled_at are John's alone to write | moved-to-manager | The Development Manager reviews the Auditor's work list and rules on every finding within John's standing rules (AGT-86 section 5, John 2026-09-23); a ruling is a recorded row, reversible once AGT-86 slice 1b (v7.0.543) ships, and the five calls he keeps (rules, money, production, hiring, switch) route to john_alerts. The heal engine's identical rule is A-16. |

**How to read a `kept` row.** It is not a residue slice 2 will clear. Each one is either one of the
three calls the rule reserves, or the ruling/undo machinery that keeps the other 20 reversible —
which is why a `kept` row's **Why** always names which of those it is.
