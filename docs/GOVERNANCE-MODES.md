<!-- DeepBench v7.0.403 | GOVERNANCE-MODES.md | SES-316 — THE SHARED-BOARD CLAIM STOPS BUMPING `updated_at`, and the thing to read twice is THAT THIS PAGE WAS THE THIRD COPY AND THE KICKOFF NAMED ONLY TWO. `SES-316` fixed the claim and release in `runbooks/runner-cycle.md` step 5 / step 7's tail and `runbooks/session-setup.md` 2c; a grep AFTER those two landed found this page's own copy still writing it, and `CLAUDE.md`'s hard-rule block sends a session HERE for the full rule — so a cycle copying from this page would have reopened the defect on its next claim. THE DEFECT, measured at the M6 milestone gate review (decision `c3e86310`, 2026-09-02): `reverse_decision()` refuses a row whose live `updated_at` postdates the decision, and a claim landing minutes later is indistinguishable from somebody else's later write, so every decision that touched a ticket became un-restorable the moment the continuous drain picked it up — while the function still answered `outcome = \'applied\'`. A claim is coordination, not a judgment write; that boundary is this page's own *"name what it protects"* list, and it is now honoured in the SQL rather than contradicted by it. All three copies are pinned together by `tests/regression/ses-286a-reversal-window.test.mjs` (five sites, each with a negative control that puts the bump back), so the next editor who syncs two of them is told about the one they forgot. Authority boundaries, the release-after-push order and the three "does NOT serialize" clauses are untouched. -->
<!-- DeepBench v7.0.198 | GOVERNANCE-MODES.md | SES-121 — one reference repointed: manual-session claim SQL now cited at docs/runbooks/session-setup.md step 2c (the session-setup skill body moved there verbatim; SKILL.md is a thin loader). Authority boundaries untouched. -->
<!-- DeepBench v7.0.195 | GOVERNANCE-MODES.md | SES-140 FINAL (John's 6-requirement order, 2026-08-23, attended session successional-review) — chained sessions become chained CYCLES: the platform refuses every session-spawning actuator (3x create_session, 1x fire_trigger, 1 silent dead create_trigger spawn, all ledger-proven), so a draining cycle continues IN-SESSION via a new runner_cycles row carrying the chained (drain continuation) trigger. The Automated-mode row's cadence cell rewritten to the SES-151 clock-grid model: hourly cron + scheduler_gate() admitting only America/Chicago hours divisible by interval_hours (3 = 12/3/6/9 on John's clock, DST-proof). Authority boundaries unchanged: drain creation John-only, stamp required, one continuation cycle at a time. -->
<!-- DeepBench v7.0.144 | GOVERNANCE-MODES.md | SES-100, directive 48ae1939 line 2 ("update governance rules that the new backlog status enables sessions from overwriting on top of each other") — the shared-invariants section gains the TICKET CLAIM as a named invariant covering manual and scheduled sessions alike, with what it does and does not protect spelled out (it serializes ticket selection; it does NOT serialize the dev branch or the briefing republish) and the 24h expiry stated as the reason a dead session cannot strand a ticket. Claim-on-pick shipped in SES-86 phase 1 (v7.0.127) and was documented only in runner-cycle.md step 5 and the session-setup skill; the governance docs still described worktree isolation as the whole coordination story, which is exactly the gap that let e36d4379 and 4da5a7bd both build ADM-1. Second drift corrected in passing, inside the same sentence: "FEATURES row" is retired — the close-out is a Supabase write on backlog_items (SES-83 (d) cycle 3, v7.0.114). -->
<!-- DeepBench v7.0.99 | GOVERNANCE-MODES.md | SES-78 series -- governance-mode registry, created by discovery design-selfbuilding-0819 (2026-08-19). Extensible by rows, never rewrites. -->
# Governance-Mode Registry

> Created by discovery `design-selfbuilding-0819` (John, 2026-08-19). Governing architecture:
> `docs/ARCHITECTURE.md` §19v. **This registry is extensible by rows** — a future mode is a new
> row and a new section, never a rewrite of an existing one. Renaming a mode is John's call
> (Tier 3).

Every session on this repo runs under exactly one governance mode. The mode decides **when
John's judgment is exercised** — during the work, the morning after on evidence, or not at all
(non-DeepBench work). It never changes the shared invariants.

## The registry

| Mode | Judgment point | Selection | Status |
|---|---|---|---|
| **Manual Design & Build** | During the work — design conversation, walkthrough gates, kickoff docs, John's approvals live | **Default.** A human in the chat *is* the selection; no session is ever asked "which mode?" | Active (today's process) |
| **Automated** | The morning after, on evidence — the daily briefing's Accept / Reverse / Rework | **Cannot be chosen — must be proven.** Only a session launched by the approved runner (routine `trig_017TZ3JZcLBK6AYH6DKURqMH`, "deepbench-runner"), whose prompt carries the stamp `DEEPBENCH-RUNNER-AUTOMATED-…`, echoed into the session's `runner_cycles` row — including every in-session `chained (drain continuation)` cycle that session opens. No stamp → Manual Design & Build. | **LIVE — approved by John 2026-08-20** (`S-SES-78d` go-live). Cadence (John, 2026-08-23, `SES-151` `v7.0.196`): the cron fires **hourly at :40** and cannot be edited by a cycle; `scheduler_gate()` admits scheduled fires only on John's clock grid — an **America/Chicago hour divisible by `interval_hours`** (3 → **12, 3, 6, 9 AM/PM on his clock**, DST-proof, no cron realign ever). Chained drain continuations are exempt — while a drain stands, the chain sets the pace. Pause = the §2b scheduler checkbox, or disable the routine at claude.ai/code/routines |
| **"Open Workspace"** *(placeholder name — John's to set, Tier 3)* | None — non-DeepBench work (research, documents, anything John runs as Claude Desktop projects today) | John says so at session start | Defined, available |

## Shared invariants — identical in every DeepBench mode

Worktree isolation, **the ticket claim (below)**, branch discipline (`HEAD:dev`, dev→main is
John's always), atomic version/ID counters, full session ceremony (design-before-code, kickoff
docs, self-QA with discriminating assertions, the Supabase close-out write on the ticket's
`backlog_items` row, close-out), verify-never-assert-from-memory. The modes differ **only** in
when John judges — never in what the ceremony requires.

> The close-out used to be "a `FEATURES` row". It is not, and has not been since `SES-83` (d)
> cycle 3 (`v7.0.114`) — the ticket board is `public.backlog_items`, and `FEATURES*.md` holds no
> ticket rows to edit. A session that edits one is writing to a stub.

### The ticket claim — the shared-board rule (`SES-86` phase 1, `v7.0.127`; written down here by `SES-100`)

Worktree isolation keeps two sessions from overwriting each other's **files**. It does nothing
to stop them building the **same ticket** — and that failure is what actually happened: cycles
`e36d4379` and `4da5a7bd` started 17 seconds apart on 2026-08-20, both picked `ADM-1`, and both
built it. Version `7.0.103` is the permanent counter gap where the discarded build used to be.

So the claim is the coordination point across **every** session, manual and scheduled alike. The
moment a session picks a ticket it claims it, in one atomic write, before any work — never
check-then-claim in two statements, because the write *is* the reservation:

```sql
UPDATE public.backlog_items
   SET claimed_by = '<your cycle id or session name>', claimed_at = now()
 WHERE backlog_id = '<TICKET-ID>'
   AND status <> 'done'
   AND (claimed_by IS NULL OR claimed_at < now() - INTERVAL '24 hours')
RETURNING backlog_id;
```

<!-- FEATURE: SES-316 — the third copy of the claim SQL, found by grep at that ship. -->
**No `updated_at`, and the omission is load-bearing (`SES-316`, `v7.0.403`).** A claim is
coordination, not a judgment write — the boundary this file's own *"name what it protects"* list
draws. Bumping `updated_at` made every decision on a picked ticket un-restorable, because
`reverse_decision()` refuses a row written after the decision and could not tell a claim from
somebody else's later write. **This is the THIRD copy of this statement** (`runner-cycle.md` step 5
and `session-setup.md` 2c are the others) and it was the one `SES-316` nearly missed: all three are
pinned together by `tests/regression/ses-286a-reversal-window.test.mjs`, so the next editor who
syncs two of them is told about the one they forgot.

**1 row → the ticket is yours. 0 rows → another session holds it; take the next queued ticket
and keep going** (John's rule, verbatim: *"self administered and fixes itself if it happens to
notice it is about to overwrite another session"*). Release it AFTER the push, in its own
holder-guarded `UPDATE` — never in the status write (John, `q-claim-release-order`, yes,
2026-08-21, `SES-106`: a session that releases at the status write has nothing left to
re-assert at the push gate).

**Name what it protects, because a half-understood coordination rule is worse than none:**

- **It serializes ticket selection.** That is the whole of its job, and it does it completely.
- **It does NOT serialize the `dev` branch.** Two sessions still land on one branch: fetch →
  rebase → push, retried up to 3 times under parallel cycles (register B42).
- **It does NOT serialize the briefing republish.** That is a separate lock — the `runner_lease`
  singleton, repurposed at a 10-minute TTL over the serial tail, plus re-fetch-and-re-harvest
  before publishing so a concurrent republish cannot eat John's un-harvested taps (`SES-98`).
- **A claim is a starting gun, not a standing guarantee.** Re-assert it immediately before any
  irreversible act — the push, and every counter claim. A cycle that lost its claim and kept
  working came one command short of pushing a duplicate to `dev` (`v7.0.123`).

**The 24-hour expiry is why a dead session cannot strand a ticket.** A session that vanishes
mid-build holds its claim for at most 24 hours; after that the ticket is re-claimable and the
board heals with nobody intervening. That bar is the same evidence bar used for calling a cycle
silent — derived from the longest observed resurrection gap (~9h20m), not chosen for neatness.

Mechanics and the exact SQL for a manual session: `docs/runbooks/session-setup.md`
step 2c. Runner-cycle specifics: `docs/runbooks/runner-cycle.md` step 5.

## Manual Design & Build

Today's model, byte-for-byte — everything in `CLAUDE.md`, `CLAUDE-DESIGN.md`, and
`docs/WORKING-WITH-JOHN.md` as written. Untouched by the Automated build. Appropriate whenever
John is present and directing; it is the default absent any explicit selection, forever.

## Automated

The three-engine 24×7 pipeline (Execute / Heal / Invent) governed by §19v: lane routing
(auto vs. gated), the P1–P10 priority order, feature-flag exposure rules, the budget governor,
the trust ladder, and the daily briefing. Appropriate for unattended work only. **LIVE since
2026-08-20** (`S-SES-78d` go-live, approved by John) — the mode remains structurally enforced:
the runner's stamp, echoed into each cycle's `runner_cycles` row, is the only thing that proves
it; no stamp, no Automated. Cadence (`SES-151`, `v7.0.196`): the cron fires **hourly at :40**
and `scheduler_gate()` admits scheduled fires only on John's America/Chicago clock grid — an
hour divisible by `interval_hours` (3 → 12/3/6/9 AM/PM on his clock, DST-proof). A draining
cycle continues **in-session** via a `chained (drain continuation)` `runner_cycles` row
(`SES-140` FINAL — the session-spawning form is retired and platform-refused). John's manual
sessions always take deploy-quota precedence over Automated cycles.

**Chained cycles are in-session continuations (`SES-140` FINAL, `v7.0.195`, John 2026-08-23 —
supersedes the `SES-141`/`v7.0.180` session-spawning form).** A draining cycle does not spawn a
new session — the platform refuses every actuator for that (three `create_session` refusals, one
`fire_trigger` refusal, and one `create_trigger` one-shot whose launched session booted without
repo or tools and never wrote a row; ledger-proven 2026-08-23). Instead the **same**
runner-launched session opens its next `runner_cycles` row with the `chained (drain
continuation)` trigger marker and runs the full ceremony again, one ticket per cycle row.
Automated mode legitimately covers every such cycle: the session itself was launched by the
approved runner, and its stamp rides every row it writes. The boundary that matters is
unchanged: only John creates a drain, so every chained cycle traces its authority to a drain he
declared; a cycle opens at most one continuation cycle, only through tail step (8)'s two gates,
and the chain ends at Gate A, Gate B, or the session's own end — the cron resumes it.

## "Open Workspace" (placeholder name)

Non-DeepBench work done in Claude Code for its tooling (files, Artifacts, memory) — none of the
DeepBench ceremony applies, because worktrees/counters/rows exist to protect the shared repo
and this work never touches it. **One hard boundary: the moment a session in this mode would
read or write `deepbench-frontend` or its Supabase, it stops and restarts under a DeepBench
mode.**
