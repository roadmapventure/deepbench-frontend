Worktree `design-live-agent-dash-0731` — design session: Live Agent View screen (`LAV-1`, v8 prototype `docs/channel-intelligence-v8-promptbox.html` + integration brief). Step 0 mapping table verified against v6.3.237. **v7.0.0 claimed (7.x era starts with this screen, John's call). IDs claimed: LAV-1 / LOO-28 / MOB-3, rows filed. Kickoff `docs/kickoffs/v7.0.0-LAV-1a-foundations.md` written; automated loop running the 5 sub-sessions S-LAV-1a..1e (Opus 5), plan a → b → (c ∥ e) → d.**

Decisions confirmed by John 2026-07-31 (persist into kickoff doc when written):
- Dual naming, deliberate: page title (open) = "Live Multi-Agent Routing (Beta)", Work-dropdown label = "Live Agent View (Beta)". Two different names on purpose.
- Channel Intelligence moves off `/` to `/channel-intelligence`; new screen takes `/` (transitional until LA-01 Home ships).
- Right rail ("Request Hopper" in prototype) = the existing Agent Routing drawer, same shared feed (`pipelineEvents` → `useHarnessStream()`), not a new hopper.
- Everything binds to real CHI-screen backend; nothing fabricated; simulator decoration (MISSIONS/auto-cycle/ambient pulses) deleted.

Key verified corrections vs the brief: brown pill ← ai_call_patterns view (LOG-79/§19p, reuse src/lib/tracePatterns.js), not patterns_used; LOG-95 + AA-171 already closed §8 gaps 1-2; durable_hops already persists system_prompt (execute.js createDurableHopRow :516) — prompt box likely fillable with a client read, no new emit (verify per-hop coverage + client read access). Within-trace execution is sequential (no Promise.all in execute.js) — sibling concurrency never >1; "concurrency" meter must be defined as open (nested) spans.
