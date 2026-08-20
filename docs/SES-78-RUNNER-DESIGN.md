<!-- DeepBench v7.0.93 | SES-78-RUNNER-DESIGN.md | S-SES-78-design — the Automated-mode runner design record; 78b/78c/78d kickoffs execute against this. -->
# SES-78 — The Automated-Mode Runner: Design Record

> Design session `design-ses-78-0819` (John, 2026-08-19, model Fable 5 — same conversation as
> the §19v discovery). Governing constraints: `docs/ARCHITECTURE.md` §19v "Invariants for the
> runner build" + `docs/GOVERNANCE-MODES.md`. This file is the settled design; each phase's
> kickoff doc references it rather than restating it.

## Decisions (John-approved this session)

1. **Where it runs:** a **Claude Code scheduled cloud agent (routine)** — not a custom-hosted
   worker (rebuilding the session harness), not GitHub Actions (PAT lacks workflow scope), not
   John's laptop. Each firing is a fresh cloud session with the standing cycle prompt; the
   repo (rules, skills, docs) travels by clone. The local hook backstop does not travel —
   the written rules are the source of truth, as `CLAUDE.md` already states.
2. **Data model:** six `runner_`-prefixed Supabase tables (shipped, `SES-78a`, v7.0.93) —
   `runner_directives` (John's seeds + one-time budget overrides), `runner_budget` (fail
   closed: no month row → no run), `runner_cycles` (audit trail: stamp, outcome, cost, model,
   push SHA), `runner_items` (briefing source + John's decisions), `runner_ladder` (rung +
   streak per work class), `runner_before_images` (no image → no write). The prefix marks
   them as development tooling, never platform entities. **Zero public grants** (verified;
   see the migration log's found-live note).
3. **Decision transport:** the daily briefing is a published **Artifact with the `artifact`
   capability** — John's Accept / Reverse / Rework taps (plus one-line rework/reverse reasons
   and budget-override approvals with his max cost) are saved into the page, owner-only;
   shared viewers are read-only. The next cycle reads the page and writes decisions to
   `runner_items`. No new `api/` route (the 12-function Hobby cap stands); chat remains the
   plain-words fallback.
4. **Cycle anatomy — nine steps, three phases** (this is the standing prompt's skeleton):
   *(judgment)* 1 stamp in + open `runner_cycles` row; 2 read John's taps → record → act
   (Accept = streak+1 / Reverse = revert-forward + before-image restore + demote / Rework =
   directive); 3 check walls — budget (month+day) and deploy quota (yield to John's manual
   sessions) — fail → log noop, die. *(work)* 4 blocker sweep #1; 5 pick one item (directives
   → now/next/later × P1–P9; uncertain lane → gated proposal, stop); 6 full ceremony (R&D
   gate for inventions; kickoff; code on Opus 5, attempts-per-tier ≤ 1; §19v QA bar);
   7 ship at the ship point — one batched push, flags default-off, before-image precedes
   every data write. *(evidence)* 8 blocker sweep #2 — auto-revert own mess, counts as a
   Reverse; 9 finish the cycle row, write `runner_items`, redeploy the briefing to the same
   URL, die.
5. **Budget overrides (John's addition):** a cycle that projects an overrun never proceeds —
   it parks the item, sends a mobile push notification, and dies. John's tapped approval
   (with his max cost) lands as a one-time `runner_directives` row (`type='budget_override'`,
   expires when spent or at day's end). No row → the item waits.
6. **On-demand cycles (John's addition):** routines support run-now from the Claude mobile
   app — no extra build.
7. **Cadence:** every 3 hours, 8 cycles/day (Tier-2 default; one scheduler setting to tune).
   ~$3.30/day concentrates in the 1–2 cycles that actually build; most cycles no-op cheaply.

## Phase plan (each within the 3-file/4-task cap)

| Phase | Deliverable | Test that proves it | Status |
|---|---|---|---|
| `SES-78a` | The six tables + 2026-08 budget row ($100 / $3.30), zero public grants | Fail-closed query; before-image → restore round-trip byte-equal | ✅ Done v7.0.93 (SQL-only via MCP; log: `docs/SES-78a-migration-log.md`) |
| `SES-78b` | The briefing Artifact (`artifact` capability): items, three buttons, override tap, rework text box | John taps on his phone; the session reads the taps back | ❌ Missing |
| `SES-78c` | The nine-step standing prompt as `docs/runbooks/runner-cycle.md` + cloud env provisioning (secrets, Supabase MCP, repo access) | **One supervised cycle, John watching, full ceremony, against a trivial P9 item** | ❌ Missing |
| `SES-78d` | Create the routine (3h cadence); stamp becomes real; `GOVERNANCE-MODES.md` flips Automated to live | **John's explicit sign-off — §19v's gate; nothing unattended before it** | ❌ Missing |

Models: design done here (Fable 5); 78b/78c coding on Opus 5; 78c's proof runs the real cycle.

## Super Admin split (John, 2026-08-19, this session)

John's model adopted: the in-app home for runner evidence is a new **Super Admin** Product Focus
Area (`ADM-1`, screen code `ADM`, hamburger → Admin, dev-instance only) — read-only briefing
cards, cycle history, spend, ladder; future user-admin nests there. **The decision surface
stays on the owner-authenticated briefing Artifact until real auth ships** — §10 is a hardcoded
`CURRENT_USER`, so an in-app Accept button would be pressable by anyone with the dev URL against
a queue that ships code. Buttons migrate into Super Admin when Clerk lands; same `runner_`
tables under both, nothing built twice. Data-side posture stays primary: `runner_` tables keep
zero public grants; `ADM-1` reads a narrow view (no directive bodies; spend exposure John's call).

## Open questions (questions, not IDs)

- Briefing page layout/appearance — UI appearance is John's (Tier 3); 78b describes the mock
  for approval before its kickoff is written. *(Mock walked through 2026-08-19, John pivoted to
  the Super Admin question — re-confirm the mock before the 78b kickoff.)*
- Which trivial P9 item seeds 78c's supervised cycle — picked at 78c time from the live board.
- `ADM-1`'s exact public data cut (spend as % vs dollars; what a dev-URL visitor may see) —
  John's call at its design session.
