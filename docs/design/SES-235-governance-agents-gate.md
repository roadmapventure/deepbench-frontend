<!-- DeepBench v7.0.425 | docs/design/SES-235-governance-agents-gate.md | SES-235 — the Governance Agents design gate, decided attended 2026-09-09 (session design-runner-24h-0908, Fable 5.1). The decision row on runner_decisions outranks this file; this is the readable record. -->

# SES-235 — Governance Agents design gate

**Decided 2026-09-09, attended.** John's word, verbatim 2026-09-09: *"Let's kickoff everything we have discussed in this session and make it happen."* The four P1 rulings below were presented as recommendations on 2026-09-08 and adopted on that word; each is a ratified `vision_claims` row and sits inside the gate decision's 72-hour reversal window. Reversing the decision restores the claims to `proposed`.

## The four P1 rulings

1. **The root claim is ratified as written.** `VC-ROOT-001`: features that showcase and grow John's frontier AI / agentic-engineering skill and make him more hireable, especially for FAANG-level AI roles; the platform is his living portfolio.
2. **The hiring artifacts an evaluator sees first are two:** a live Channel Intelligence run with its reasoning trail, and the briefing page as proof of governed autonomy. A surface an evaluator cannot reach in 30 minutes is not a P1 surface. (`VC-MISSION-031`)
3. **The self-building runner counts as P1 evidence only through its inspectable parts:** the briefing, the verifier record, the trust ladder, the standing brief. Internal correctness nobody can inspect does not count. (`VC-MISSION-032`)
4. **The served-class support test for infrastructure tickets:** a ticket supports P1 if finishing it changes what an evaluator sees or can verify on one of the named artifacts — the reasoning trail, the AI-pattern evidence, a published metric, or the self-building record. If it only makes the machine more correct where nobody looks, it does not support P1 and ranks after those that do. One primary served class per ticket; ties break on the existing keys. (`VC-MISSION-033`)

## The five roles

Researcher, Prioritizer, Designer, Builder, Verifier — DeepBench agents (rows in `agents` / `capabilities` / `skill_profiles`), in a governance lane (`agents.lane = 'governance'`) hidden from the customer bench and the product broker. **Amended 2026-09-09 after the Prioritizer's first run (decision on `AGT-63`):** five Skill types, not six — no Format Skill is linked, because the executor's Format branch overwrites the Intent's output contract (the handler became `store`); the output contract lives on the Intent Skill's traits, as the Bench Report Card judge does. Knowledge Skills carry `traits.source = inline` (`SES-341`) so their text reaches the model instead of an empty RAG fetch. And a class John himself ruled on a ticket stands — the Prioritizer cites it and never overrides it (the AGT-015 finding: the artifact test had beaten his recorded word). The verifier stays separate from the builder (charter premise 3). A sixth, the Development Manager, orchestrates: it hears "complete <project>", reads `project_progress`, assigns, fires workers, reports — Michelle Manning's role on the governance side.

**Engines.** Inside the runner or an attended session: a sub-agent whose prompt is assembled from the agent's Skill rows by one script (`SES-331`), on subscription tokens, writing the activity-log row itself. With no session present (a schedule, a screen, an MCP client): the generic capability executor, on API dollars.

**Handoffs are rows, never conversation:** Prioritizer → `automation_rank` / `supports_class`; Designer → `kickoff_link`; Builder → `push_sha`; Verifier → `runner_verdicts`. The runner cycle is the broker; no agent row names another (Rule #1).

## Projects govern execution (ruled the same sitting)

A `projects` table with `status` (planned / executing / paused / done), `priority`, charter and notes; every epic carries `project_id`. **"Complete <project>" = one status change.** The pick path (`prime_directive_queue`, `drain_epic_next`, `drain_chain_gate`, `backlog_done_requires_verdict`, the verifier) reads "the epic's project is executing" instead of the literal `Selfbuild` name. The Selfbuild Prime Directive `a0ef9525` and the succession directive `0970abad` retire into the table (`SES-340`). `project_progress` answers "how many left in <project>"; `project_blockers` answers "what do you need from me to unblock <project>".

## Cost model

Build on subscription tokens (runner and attended). API dollars only where no session exists; the $5/day wall is sized when `SES-334` (scheduled re-rank) ships. Verifier split gated by `SES-337`: 30 recorded verdicts reproduced, at most 2 disagreements.

## Exit

Rulings recorded (this file + decision), `SES-235` done, members unblocked (`blocked_by` clears on done), M0 buildable. Exit review `SES-338`.
