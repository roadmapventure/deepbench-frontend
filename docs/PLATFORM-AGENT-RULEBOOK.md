# Platform Agent Rulebook — v1 DRAFT

> **Purpose:** a single canonical checklist every agent/capability design gets tested against, rule by rule, before any scope is proposed. Every miss in `S-APPLE-04a-design` (2026-07-02) was a rule that already existed somewhere — `ARCHITECTURE.md`, a design doc section, a memory file — reconstructed from scratch each time instead of checked against one list. This doc exists to stop that.
>
> **Status: v1 draft, pulled from already-LOCKED `ARCHITECTURE.md` sections + `APPLE-AGENT-1-v5-DESIGN.md` §2 + corrected memories from 2026-07-02. Not yet reviewed by John — every rule below needs confirmation, correction, or removal before this is authoritative.**
>
> **How to use once finalized:** any design session proposing new agent behavior, delegation, data access, or a consequential action must check the proposal against every rule below explicitly, not just the ones that feel relevant. A rule this doc states and a design proposal contradicts is a finding to resolve before writing a kickoff doc — never something to silently pick a side on.

---

## 1. Capabilities Are Data, Not Code

**AR-1.0 — An agent has skills, assigned via capabilities.** Skills configure into Skill Profiles, Skill Profiles combine into Capabilities, an agent holds Seniority over a Capability at a given Level (`agent_capability_assignments`). An agent's effective skills are never assigned to it directly — they arrive through the capabilities it's been assigned. *Source: `ARCHITECTURE.md` §2 hierarchy.*

**AR-1.1 — No capability-specific logic in shared pipeline code.** `db-assembly.js`, `ai-enrichment.js`, `request-receivable.js`, `execute.js` may never contain a conditional keyed to an agent id, capability slug, or deliverable type (`if (agentId === 'x')`, `if (capability_slug === 'x')`). If a capability needs something the shared pipeline doesn't do yet, the fix is a new trait/field read generically — never a conditional, never a hand-rolled parallel route file. *Source: `ARCHITECTURE.md` §19 "Founding Principle" + §19b.*

**AR-1.2 — One generic executor.** A new capability requires zero new route files and zero changes to `execute.js` — only new Supabase rows (Skill Profiles + `capability_skill_profiles` + `agent_capability_assignments`). Every capability calls the same three pipeline steps: `assemblePrompt()` → `enrichPrompt()` → `sendRequest()`. *Source: `ARCHITECTURE.md` §19b.*

**AR-1.3 — Every agent is a real Competency, not a name on a log line.** An agent must have actual Skill Profiles/Capabilities behind its persona to participate in the platform model — an `agents` row alone (name, avatar, bio) with zero `skill_profiles`/`capabilities`/`agent_capability_assignments` rows is not a real agent in this model, regardless of how much hand-written JS implements its behavior elsewhere. *Source: `ARCHITECTURE.md` §2 hierarchy (Agent = persona-bearing Competency) + §19b's founding intent. Confirmed as a live gap 2026-07-02 (Eleanor Voss / `lib/librarian.js`) — not yet resolved, logged separately.*

**AR-1.4 — Content specialists never own Format Skills; an agent can only deliver content via a content/display editor.** Domain-expert agents (content specialists) produce subject-matter output only; a separate class of Display/Editor agents (Screen Controls, HTML Display, PDF Assembly) owns all presentation and is the only path a Deliverable reaches its final form through. Never mix the two roles in one agent, and never have a content specialist emit final display output itself. *Source: `ARCHITECTURE.md` §19, "Content Specialists vs. Display Specialists." Confirmed 2026-07-02, John — same rule, delivery-side phrasing.*

---

## 2. Agent-to-Agent Delegation (The Agent Loop)

**AR-2.1 — Rule #1: no agent's data ever names another agent.** No Skill Profile, tool description, or delegate declaration may contain another agent's id or a fixed capability_slug pointing at a specific relationship — not as a literal, not as a "generic" registry lookup either. Genericness does not cure it; only real agent judgment does. *Source: `ARCHITECTURE.md` §19d + memory `feedback-real-agent-loop-required`.*

**AR-2.2 — Single delegation path.** There is exactly one way to ask for help: the `request_help` tool (no `capability_slug`/`agent_id` field, no fast path). It always routes to whoever currently holds `project-manager` (Michelle Manning), resolved live at dispatch time. Michelle reasons over the roster and returns ranked candidates — she never unilaterally picks. The requesting agent then calls `delegate_to_agent`, naming only a candidate it was actually just handed. `agent_id` may appear in exactly one place in the whole mechanism: that tool-call argument. *Source: `ARCHITECTURE.md` §19d (`AA-87`).*

**AR-2.3 — Ownership brokers use the same delegation path — no shortcut for "infrastructure" agents, decided deliberately.** A resource with an exclusive owner (e.g. the Data Room / Eleanor) is not reached by calling the owner's broker function directly, and not reached by a special-cased routing rule either — no `resolveCapabilityHolder()`-style constant lookup, even though that exact pattern already exists for `request_help`'s own target (`project-manager`). An agent that needs an owned resource asks for it through the normal `request_help` → Michelle → `delegate_to_agent` mechanism like any other cross-agent need, full round trip, every time. *Source: `ARCHITECTURE.md` §19e: "An agent that needs an owned resource cannot go around the owner — it can only ask the owner, through the normal Agent Loop delegation mechanism." Missed once already in `S-APPLE-04a-design` (2026-07-02) before being caught — then explicitly re-considered and confirmed the same day (2026-07-02) after weighing a constant-resolution shortcut against the hop-budget cost. Rejected because `resolveCapabilityHolder()` as built (`&limit=1`, no ranking) carries the identical latent risk already logged as `AA-93` for `project-manager` itself: a second holder added later (e.g. a second Librarian) without remembering to migrate the shortcut back to a real delegation would silently return an arbitrary pick, no error, no reasoning trail. The full round trip costs more hops now but requires no future migration and gives every ownership hop a logged `reasoning` field from day one.*

**AR-2.4 — The sniff test for any "does X need backup/review" decision point.** Every such decision must be a traceable, logged inference the deciding agent actually makes for itself — never a static trait that fires the same way every time (even as pure data, not a hardcoded agent id), and never code/screen logic inspecting a result afterward and deciding on the agent's behalf. A second agent's own evaluative judgment (e.g. a dedicated critique/governance role) also passes, but only as its own explicit capability built in its own session — never folded silently into another agent's scope. *Source: `ARCHITECTURE.md` §19d "Design intent" + memory `agent-intelligence-sniff-test`.*

**AR-2.5 — Depth/turn caps are two-tier.** The platform-level hard ceiling on total delegate hops (`MAX_LOOP_DEPTH`) lives in the harness, never overridable by Skill Profile data. A per-relationship intended cap (e.g. "1 round per hypothesis") is data, tunable without a code change — but as of this rulebook's draft, no live field exists for it (the prior `available_delegates` shape that would have held it was deleted). Document such a cap in a `notes` field until a real mechanism exists; do not silently skip documenting it. *Source: `ARCHITECTURE.md` §19d.*

**AR-2.6 — Shared infrastructure agents are called automatically, not delegated to.** An agent that needs more than a generic baseline LLM call (i.e. anything with real Skill Profile assembly) goes through the Prompt Engineer (Dan Bingham, PS-01) — but this is unconditional, always-on infrastructure baked into every capability call (`assemblePrompt`/`enrichPrompt`), not a `request_help`/Michelle decision. This is a distinct, narrower category — "Collaborative Service Attribution" (`§19e`) — from the exclusive-ownership brokers in AR-2.3: any agent may call shared infrastructure directly, no judgment call, no delegation dance, because there's nothing to decide (there's exactly one Prompt Service, always). Do not read AR-2.1's "no hardcode routes an agent" as banning this — Dan isn't a routing decision, he's fixed platform plumbing every capability call already goes through. *Source: `ARCHITECTURE.md` §19 (Dan Bingham) + §19e's Exclusive-Broker-vs-Collaborative-Attribution table.*

**AR-2.7 — Direct agent-to-agent calling is legitimate only when the candidate came from the calling agent's own task context, never from general assumption.** An agent may call another directly (skip `request_help`/Michelle) only when it already has a legitimate candidate handed to it as part of the task it's working on — e.g. returning reviewed work to whoever originally sent it (`AA-82`'s Owen→Marcus precedent). "I'm confident X is good at this" from the agent's own general knowledge does **not** qualify — that's exactly the "known-capability delegation" path deliberately eliminated (`AA-87`): a fast path that skips real per-call judgment about *who*, even when the outcome feels predictable. If there's any doubt whether a candidate was legitimately supplied vs. assumed, route through Michelle. *Source: `ARCHITECTURE.md` §19d + `AA-82` (`S-ARCH-AGENT-LOOP-03-design`). Confirmed reading `a` of two candidates, 2026-07-02.*

---

## 3. Data Room / Library Access

**AR-3.1 — Only the Librarian touches `the_Library`. Full CRUD — create, read, update, delete — no exceptions, for any agent.** No agent's own capability code may import or call `queryLibrary()`/`writeLibrary()` directly, ever, even with its own valid credentials. "Directly" means without an actual Eleanor agent action in between. Any agent needing the Data Room read or written must delegate to Eleanor via the normal Agent Loop mechanism (AR-2.3); she alone performs the call. *Source: `ARCHITECTURE.md` §19c + memory `project-librarian-gatekeeper` (corrected 2026-07-02 — a prior version of this exact memory stated the opposite and was wrong).*

**AR-3.2 — Two RAG stores, physically separate, never sharing a code path.** `knowledge_entries` (an agent's own personal training corpus) and `the_Library` (shared client business data, fully brokered per AR-3.1) are structurally distinct — never conflate the two, never add a flag to one table instead of a real physical split. *Source: `ARCHITECTURE.md` §19c.*

**AR-3.3 — Data Rooms are a field, not a table.** `the_Library` is one physical table partitioned by `data_room_tag`, validated against a `data_rooms` registry. Never propose a table per Data Room/client. *Source: `ARCHITECTURE.md` §19c.*

**AR-3.6 — Eleanor holds both RAG stores but must never cross-contaminate them.** Eleanor is the sole broker for `the_Library` (AR-3.1) and, like every agent, has her own `knowledge_entries` corpus (AR-3.4/3.5). These stay strictly siloed even though one agent holds both keys: a request for Library data must never surface her own training content, and vice versa. Her broker logic must query only the store the request actually targets — no merged/combined retrieval across the two, ever, regardless of how trusted the caller is. *Source: John, 2026-07-02.*

**AR-3.7 — Eleanor writes only from `the_Library`'s side.** Consistent with AR-3.4 (Trainer-only writes to `knowledge_entries`) — Eleanor's own broker role covers `the_Library` writes only; she has no special write path into her own or any other agent's training corpus beyond the same Trainer-mediated path every agent uses. *Source: John, 2026-07-02.*

**AR-3.4 — An agent can only update/add to its own `knowledge_entries` via a Trainer.** Even for an agent's own personal training corpus, writes go through a Trainer agent (e.g. Susan Smith, TR-08) — an agent does not write its own training data directly, even content it generated itself (e.g. the Reasoner hands synthesized content to Susan for the actual write, `AG-24`). *Source: John, 2026-07-02. `ARCHITECTURE.md` §19c corrected to match same day — its prior text ("read/written directly by that agent's own capabilities and by Trainer agents") implied a direct-write path that never actually existed as built.*

**AR-3.5 — Only the agent itself can read its own trained files.** Self-read only, no cross-agent reads of `knowledge_entries` ever — not even for a broker/aggregator role like Michelle's roster candidate-ranking. Consistent with `AA-92`'s explicit rejection ("§19c LOCKED bars cross-agent `knowledge_entries` access entirely"). Note this still needs `AA-89`'s not-yet-built self-read broker (an agent reading its own personnel file is agent-to-agent access, distinct from the human-facing Personnel screen, which stays unrestricted UI display) — the rule is confirmed, the mechanism isn't built yet. *Source: John, 2026-07-02 + `ARCHITECTURE.md` §19c + `AA-92`.*

---

## 4. Human-in-the-Loop / Consequential Actions

**AR-4.1 — The agent reasons and argues; the human declares intent and commits.** An agent never infers or auto-selects the human's intent on their behalf — especially for any action that writes to the Data Room. Non-destructive/exploratory actions can proceed straight from agent classification; anything that writes to the Data Room always requires an explicit human click. *Source: `APPLE-AGENT-1-v5-DESIGN.md` §2 — stated as "the one hard line in an otherwise fully agent-orchestrated flow." Nearly violated in `S-APPLE-04a-design` (2026-07-02) by a proposal to have Nadia auto-write research findings with no human commit step.*

**AR-4.2 — The consequential-action gate is the one reusable mechanism for HITL, not a bespoke UX per capability.** Any tool/delegate declaration can carry `requires_human_confirmation: true` (+ optional `critique_capability_slug`). When set, the harness pauses the loop and surfaces the proposed action (plus an optional single critique pass) to the human, who resolves it as accept / reject / edit — never an iterative negotiation. Before inventing a new HITL pattern for a capability, check whether this existing gate already covers it. *Source: `ARCHITECTURE.md` §19d. As of this draft, zero live Skill Profiles actually set this trait — it exists in the harness but is unused in production; check whether a UI consumer exists before wiring it live.*

---

## 5. Agent Build Completeness

**AR-5.1 — Every agent ships fully, in one session, or not at all.** Adding an agent to `src/data/agents.js` requires all 23 listed fields, a matching `AVATAR_CFG` entry, an `AGENT_PRONOUNS` entry, and a Supabase `agents` row — together, same session. No partial entries; a missing field crashes any component that iterates `AGENTS`. *Source: `STANDARDS.md` Section 11. Root cause: Victoria Chen shipped without standard fields and crashed `RosterScreen`.*

---

## 6. Personnel File Access

**AR-6.1 — Training content follows AR-3.4/AR-3.5.** Writes to an agent's own `knowledge_entries` go through a Trainer only; reads are self-only, no cross-agent access, ever. Covered fully in Section 3 — referenced here so Section 6 is a complete picture of personnel-file access in one place.

**AR-6.2 — Everything else on the personnel file — resume, guardrails, projects, anything outside training — is full CRUD for the agent itself or its Trainer only.** No other agent may create, read, update, or delete any of it, for any reason, including a broker/aggregator role. This extends the same ownership boundary that already governs training content (`AR-3.4`/`AR-3.5`) to the rest of an agent's personnel file. *Source: John, 2026-07-02.*

---

## Open items not yet folded into a rule above

- Whether `AR-4.2`'s harness gate needs an actual UI/resolution consumer built before any capability can legitimately set `requires_human_confirmation: true` — unresolved as of this draft.
- Whether `AR-3.1`'s "only Eleanor" rule requires Eleanor to gain a real capability (per `AR-1.3`) before any agent can legitimately delegate a Data Room action to her — currently she has none; logged as a blocking gap in `S-APPLE-04a-design`, not yet scoped as its own session.
