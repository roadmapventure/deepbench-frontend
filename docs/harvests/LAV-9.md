# LAV-9 — LAV UX/UI round 3

John's 9-item follow-up review, 2026-08-01 (`design-ux-ui-0801`), 8 of 9 items scoped into 3 coding sub-sessions; item 9 split out as its own future design pass, filed separately as `LAV-10`.

## a (v7.0.30, `AgentNetwork.jsx`)

- Answer drawer gets a height cap + scrollbar (`maxHeight={280} resizable`, matching CHI's own Agent Routing drawer).
- A genuinely-still-open delegation now settles into its real terminal look the instant the run ends instead of sticking in the in-flight blue+arrow look forever — root cause: the settle effect only re-fired on new hops, and a run's last hop is the last thing that ever arrives, so a delegation left open at terminal had nothing left to release it.
- Every edge that carried real traffic this run now stays solid + arrow-animated simultaneously in its own real meaning color while the run is live (not just one spotlight line hopping between edges), with word labels limited to the 2 most-recent (full opacity) + 3rd-most-recent (fading). Replaces `LAV-5b`'s single-lit-edge mechanism — John's own design, confirmed live in the design session ("so the user sees 1 agent's loop requires all N amount of agents talking at once").

## b (v7.0.31, `AgentNetwork.jsx`)

- A delegation target now joins the canvas the instant it's named as a target, not only once it produces its own hop — root cause of "solid/dashed line pointing at a still-queued agent." Deliberately diverges from the separate `AGENTS ENGAGED` meter (`LiveAgentViewScreen.jsx`), which stays scoped to "actually produced a credited event" — John confirmed the two are allowed to disagree (canvas shows "addressed," counter shows "actually spoke").
- An agent's black activity bubble now hides the moment its own turn ends, instead of staying visible for the rest of the whole run.
- Canvas arc radius/bench-stack spacing retuned — not a new user-facing control, a tuning pass (John's explicit call, confirmed in the design session).

## c (v7.0.32, `LiveAgentViewScreen.jsx`)

- The mode badge's 3-second auto-revert-to-Idle after a run completes is removed — it now only clears when the next question actually starts (the existing `onRun()` reset). Previously "Complete" was only visible for 3 seconds before silently degrading to the same "Idle" look as a screen that has never run anything.
- Renamed `"Complete"` → `"Question Answered"` (John's own wording — the specific thing that finished is the question) and given a continuous pulse, matching `orch`'s existing pulse mechanism, so the user notices the ending metrics are ready to review.

## Item 9 — deferred, filed as `LAV-10`

An "orchestration mode" showcase visual: a distinct radial-burst offshoot cluster for the orchestrator + its currently-engaged delegates, plus a one-time particle/glow effect when orchestration starts. John's own "jackpot" framing — a deliberate demo moment, not a bug fix. Concept direction agreed in principle during the design session; no motion/timing/mechanism spec exists yet, so it was not folded into any of the three sub-sessions above.

Kickoffs: `docs/kickoffs/v7.0.30-LAV-9a-canvas-edge-motion.md`, `docs/kickoffs/v7.0.31-LAV-9b-node-queue-behavior.md`, `docs/kickoffs/v7.0.32-LAV-9c-status-badge.md`.
