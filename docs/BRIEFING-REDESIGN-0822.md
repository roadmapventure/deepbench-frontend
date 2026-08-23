<!-- DeepBench | docs/BRIEFING-REDESIGN-0822.md | design-briefing-redesign 2026-08-22 — John-approved redesign of the Morning Briefing page. Locked spec for epic tickets SES-124..SES-129 + ADM-2 (Automation epic). Mock: docs/design/briefing-redesign-mock-0822.html (repo copy) / https://claude.ai/code/artifact/0e97104e-7e74-4869-ab9b-fb20cd69c28c (interactive). -->

# Morning Briefing Redesign — Locked Spec (2026-08-22)

John iterated this section-by-section in the `design-briefing-redesign` session and approved the
final mock ("this is good"). This doc is the build contract for the Automation-epic tickets
**SES-124 through SES-129 (Tooling · P10 - Tooling)** and **ADM-2 (Admin · P5 - Enhancements,
attended)**. The interactive mock is canonical for look/feel; this doc is canonical for behavior.
Where they disagree, this doc wins. All prior contracts in `runbooks/briefing-page.md` stay in
force unless a line here supersedes them (times in CST, republish-same-URL, harvest-before-rebuild,
read `plain_*` from the row, silence never decides anything).

## Final section order

| # | Section | Behavior |
|---|---------|----------|
| 1 | Masthead | + **"N decisions waiting"** counter (counts every undecided card/question/vision row); at zero shows "Nothing needs you ✓". |
| 2 | **Daily activity** (was stat strip) | Scope: 12:00 AM–11:59 PM CST only, stated in the title. Every number labeled. Tokens stat shows absolute AND **% of the daily max**. One-line definitions of "gated before build" and "did not run" under the strip. |
| 3 | **Today's findings** | Latest cycle's finding open on top, labeled with its time; **"Earlier today — N cycles"** default-closed card with one line per prior cycle of the CST day. |
| 4 | Budget & usage | 3 cards. "✓ Your latest reading was recorded — <ts>" line moves to the reading card. Reading card has **Morning and Night input rows** (see SES-128). Bars carry a one-line label of what they measure. |
| 5 | Shipped | Cards numbered 5.1…, **default closed**; collapsed row = number + kind chip + **ticket ID** + ticket title + decision state. Open card: plain-language 3 fields (`plain_cant/after/worth`) are the **default body**; the technical record (Value case, Before→After, QA evidence, meta, links) moves **under More info** (display reversed vs. today). Ask box always visible under the Accept/Reverse/Rework buttons, with a "✓ Received <ts>" label once text is entered; threads render above it. Card stays undecided + carries forward until a button is tapped. |
| 6 | Gated before build | Same card treatment as Shipped, **default closed**. Accept = permission (never touches ladder). |
| 7 | Directive queue | Textarea + "✓ Last directive saved <ts> — picked up by cycle <id>" beneath. + **"Your last 3 directives — what became of them"** default-closed card (SES-129). |
| 8 | The queue | Matrix only (no prose, replaces old "Next 3" + "Next up top 5"): **Queue (the DB's own queue number) · ID · Class · Status · Design status · Title**. |
| 9 | Questions | Yes/No rows, numbered 9.1…, **default closed**; collapsed row shows the question text + answer state. Consequence lines under both buttons (required). Ask box under the buttons, same as Shipped. |
| 10 | **Skipped — waiting on your input** (new) | Whole section default closed with count badge, e.g. "5 · 2 new" (**new = skipped since the last brief**, NEW chip per row). Columns, Unblock first: **Unblock · ID · Class · Queue · Design status · Status · Title · Reason skipped · Date skipped**. Sort: question-unblockable rows first, then the rest newest-skip-first. Unblock kinds: "Answer as a question" (files the blocking decision into §9 next rebuild), "Prep our session" (next cycle packages a kickoff-ready prompt; the page cannot launch sessions), or a pointer to an existing card. |
| 11 | Now-tier by class | Sorted by **zero-padded class id** (P01…P10). Footnote with live counts: "Beyond the now bucket: N in next · N in later". |
| 12 | Vision claims | **Formatted exactly like Questions**: Yes/No + open text, **always 3 rows**, default closed. Each row leads with a **class chip** (P1–P4 judgment class it sets criteria for; "All classes" when broader). Yes = ratify (HIGH), No = reject (delete + rejected-paths), typed line = replace in John's words (resolves). A claim reappears daily until decided — only silence carries it forward. |
| 13 | Trust ladder | + **Class column, sorted by zero-padded class id** (P02 Inventive, P05 Enhancements, P07 Agent Creation, P08 Determinism Removal, P09 Bug Fixes, P10 Tooling). Note: no ladder row exists for P6 - Agent Enhancement (see SES-122, next bucket, for making rungs actually unlock autonomy). |
| 14 | Who used DeepBench | **Last 5 production uses**: Time (CST) · IP · Location · Name · What they did · Cost. Source: activity log + visitor ledger, same rules as the standing usage report (`reference-deepbench-usage-report`). |

## §2b — Automation panel (added by John 2026-08-23; ticket SES-143)

New section directly AFTER Daily activity: how automation is running, and the controls. Three rows:

1. **Scheduler** — checkbox (currently ON) + editable hours box: "Scheduler on — runs every
   [N] hours" (default 3; platform floor is 1). The trigger's cron stays at hourly permanently;
   the cycle itself honors N: a scheduled cycle whose predecessor started less than N hours ago
   closes immediately as "did not run — paced by your scheduler setting". Scheduler OFF → every
   scheduled cycle closes immediately as "did not run — scheduler off". This cycle-side gate is
   what makes the panel binding without touching the trigger (cycles cannot edit a routine they
   did not create — SES-140), and it retires SES-140's restore obligation: hourly cron is now
   permanent by design, paced down to N by this gate.
2. **Drain** — checkbox: "Complete epic [epic box, current: Automation] until done." Checking it
   IS John naming a drain (runbook already recognizes a briefing tap as drain creation): the
   harvest writes the drain-epic directive and captures the named scope per SES-142. Unchecking
   cancels the standing drain (status cancelled). Status label underneath, always: while running
   "X of <named> tickets left"; when complete the box shows done with "✓ <epic> completed —
   <N> tickets at <time CST>", and completed drains keep one history line each.
3. **Status line** (addition, per John's "add what's needed"): last cycle — time, ticket, outcome;
   next scheduled fire time; and the "▶ Run a cycle now" link (SES-102's masthead link lives
   here now).

State: taps ride `briefing-state` and harvest into a new `runner_settings` row (scheduler_on,
interval_hours, drain lifecycle read from `runner_directives`). **Honoring needs no trigger-prompt
edit**: the prompt already says "execute runner-cycle.md EXACTLY", so the runbook gains a step-0
settings gate and every future cycle honors the panel automatically. Semantics locked: the
scheduler toggle/interval governs SCHEDULED cycles only; a standing drain's chained sessions
(SES-141) run regardless of interval; scheduler OFF + drain ON = the chain still runs; both off =
nothing runs, and the panel says so plainly.

**Removed** (John, explicit): the need-you stat pair, the footer note, the standalone
"Needs your call" budget-override section (an override renders as a §9 question), the "Next 3"
line, "Next up — top 5", and stray narrative paragraphs outside §3.

**No new notifications** (John, 2026-08-22): morning-check is the ritual; routines notifications
are broken anyway — `SES-123` (later bucket) tracks that.

## Rulings recorded during design

- Shipped/Gated cards are about **tickets**; Questions are **rules**; Vision claims are
  **judgment criteria for P1–P4**. Titles on cards are the board's ticket titles; ID always shown
  while collapsed.
- Directives command **priorities and budgets** ("run all automation epics to completion",
  "overwrite max daily to 15M" are both valid); they never suspend **gates**.
- Shipped-not-yet-accepted: ticket is `done` on the board, live on dev (FLAGGED items dark behind
  their flag), card undecided until tapped.
- Auto-recalibration: the **night → morning reading pair** brackets a runner-only window; the
  next cycle computes tokens-per-percent from it and sets the day's max automatically; an
  explicit directive number always overrides.

## Ticket map (all in the Automation epic, ranked to run next)

- **SES-124** (rank −21) — template restructure: section frame §§1–4 + removals + collapse framework.
- **SES-125** (rank −20) — decision-card overhaul: §§5, 6, 9, 12 (reversed More info, closed+numbered, ask boxes, vision→Yes/No).
- **SES-126** (rank −19) — board tables on the page: §§8, 11, 13, 14.
- **SES-127** (rank −18) — structured skip records + §10 with unblock actions.
- **SES-128** (rank −17) — morning/night readings + auto-recalibration (§4).
- **SES-129** (rank −16) — directive follow-through card (§7).
- **ADM-2** (attended, unranked) — briefing opens from a real button right of "About DeepBench" on desktop, same button type (site change; the briefing cannot *be* an in-app page until login lands — owner-auth is what protects the buttons; migration into Super Admin stays the plan of record per `runbooks/briefing-page.md`).
