<!-- DeepBench v7.0.99 | runbooks/briefing-page.md | S-SES-78b — the Morning Briefing page: URL, regeneration contract, decision read-back. -->
# Runbook — The Morning Briefing Page (`SES-78b`)

**Live URL (permanent — every redeploy keeps it):** `https://claude.ai/code/artifact/4c22b9b1-6b14-4092-b728-1756a59b3173`
Published 2026-08-19 (v7.0.94) with `capabilities: {artifact: {}}`, favicon 🌅, title
"DeepBench Morning Briefing". Design: Treasury tokens verbatim (`src/tokens.js` — paper/navy/
brass; Fraunces/Inter/JetBrains Mono; moss = Accept, flag = Reverse, brass = Rework).
Governing design: `docs/SES-78-RUNNER-DESIGN.md` §3; architecture `ARCHITECTURE.md` §19v.

## Regeneration contract (every cycle, step 9)

**Times rule (John, Rework 2026-08-20): every date/time DISPLAYED to John — page header, verdict
lines, cycle timestamps, "at" stamps — is converted to CST (America/Chicago) and labeled CST.**
Store UTC internally as before; the conversion is display-only.

1. Build the day's HTML from `runner_items` / `runner_cycles` / `runner_budget` /
   `runner_ladder` — same structure as the live page: masthead, stat strip (shipped /
   gated before build / reverted / day spend / month left), Shipped cards, Gated before build,
   Needs-your-call (budget overrides), Trust ladder, Directive textarea. **Language (John,
   2026-08-20):** outcomes display as "did not run" / "gated before build" (data values
   `did_not_run` / `gated_before_build`; `noop`/`proposal` retired), and every P-class is
   written named (`P9 - Tooling`, never bare `P9`) — see the Language block in
   `runner-cycle.md`. **Budget & usage cards (John, 2026-08-20):** an API-dollars card with the
   dev/QA split bar against the $5 day / $100 month walls; a subscription-tokens card with the
   same dev/QA split bar, the runner's token use by model, John's latest reading + the
   calibration sentence; and the reading-entry card (Fable % / All models % / 5-hour % + Save,
   persisted through the `briefing-state` block like the directive box) — on every rebuild.
   Mock John approved: artifact `ca23ace7-c2e3-465d-bac4-089daff812d2`. Every card carries: `id="item-<ID>"`,
   kind chip, `ID (Type · named P-class)`, title, Value case, Before → After, QA evidence, meta
   (cost / model / push SHA), links (dev URL; flagged items also the flag-ON link), the three
   buttons, hidden reason input, verdict line.
2. **Republish to the SAME URL** — pass the URL above as `url` to the Artifact tool (a publish
   without `url` from a new conversation creates a stray page; never do that). Same favicon.
3. **Before rebuilding, READ the current page first** (WebFetch the URL) and harvest John's
   state — rebuilding without harvesting destroys un-acted-on taps.

## Decision read-back contract (every cycle, step 2) — CORRECTED after live QA 2026-08-19

**Found live during SES-78b's own tap QA:** this artifact is a *classic* artifact, not a live
doc — DOM gestures do NOT auto-persist (the first build assumed they did; John's taps ran the
script and saved nothing). The shipped mechanism: **the page holds all mutable state in a
`<script type="application/json" id="briefing-state">` block, renders itself from that state,
and every decision self-publishes a complete replacement document via
`claude.use('artifact').publish(doc)`** (owner-authority; read-only viewers get `not_writer`
and the page degrades to read-only). Canonical implementation:
`docs/runbooks/briefing-template.html` (same directory) — regenerate structurally from it.

Read-back is therefore trivial: **WebFetch the URL and parse the `briefing-state` JSON block**
from the served document —
`{"items": {"item-<ID>": {"decision": "accept|reverse|rework", "reason": "...", "at": "<iso>Z"}},
"directive": "..."}`. Proven live: John's mobile taps (`rework` + typed reason on the test card,
`accept` on SES-78a) read back verbatim. Non-empty `directive` text becomes a
`runner_directives` row (verbatim) and is cleared in the rebuild. Override approvals ride the
same state block when Needs-your-call cards exist.

Harvested decisions are written to `runner_items.decision/decision_reason/decided_at` and the
ladder is updated (§19v: Accept streak+1, 5 promotes; Reverse → streak 0, demote; Rework
neutral) before any new work starts. Un-decided cards carry forward to the rebuilt page —
**silence is never an Accept.**

## Standing facts

- Buttons write only for the page owner (John's Claude account) — this is the auth for the
  decision loop until Clerk lands, when the surface migrates into Super Admin (`ADM-1`).
- The canonical first-publish HTML lives in git at this commit alongside this runbook
  (`scratchpad` original; regenerate structurally, don't byte-copy — content is per-day).
- Page shows real numbers only — a rebuilt page must never carry invented spend/QA values;
  every figure traces to a `runner_` row or a session log (§19d sniff test applies).
