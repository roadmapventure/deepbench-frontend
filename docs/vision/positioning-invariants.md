<!-- DeepBench v7.0.134 | docs/vision/positioning-invariants.md | SES-84 phase 1 — Claude's best-inference draft, 2026-08-21. NOTHING here is ratified until John's tap; confidence marks are the drip queue. -->

# Positioning Invariants — What Stays True Regardless of Feature Direction

These are the claims John treats as *identity*, not preference: violating one doesn't make a worse
feature, it makes a different platform. Mined from ARCHITECTURE.md's LOCKED sections and
`JOHN-DECISION-PATTERNS.md`. A feature idea that conflicts with any HIGH claim here should be
scored down or gated, whatever its value case. Claim IDs: `C-invar-n`.

## Intelligence is real, never staged

- [C-invar-1] (HIGH) Rule #1: no agent is dependent on another, ever, in its own data — no agent's data ever names another agent; cross-agent needs are brokered through the Project Manager's own reasoning. — *grounds:* `ARCHITECTURE.md` §19e [LOCKED]: "Rule #1 of this platform."
- [C-invar-2] (HIGH) The sniff test governs every decision point: does this show traceable, logged AI judgment, or hardcoded routing dressed up as intelligence? A static or pre-wired destination fails even as pure data. — *grounds:* §19d [LOCKED, John 2026-07-02]; `JOHN-DECISION-PATTERNS.md` #6.
- [C-invar-3] (HIGH) John enforces this under pressure, not just in design: even squashing a demo-invalidating bug, the fix must keep "routing... conducted at the model level decisions" — guardrails exist to *prevent* hardcoding, not to permit it. — *grounds:* John, 2026-07-25: "the guardrails is to make sure its not hardcoded and routing is still conducted at the model level decisions."
- [C-invar-4] (HIGH) Never display deterministic plumbing as an agent acting — if the screen credits an agent with work, the agent's model really did it. — *grounds:* `JOHN-DECISION-PATTERNS.md` #42 (Eleanor evidence-fetch made real at John's direction).
- [C-invar-5] (HIGH) The inverse also holds: never spend a model call where a deterministic mechanism serves, and when a correct value already exists deterministically, no model may be put in charge of it. — *grounds:* `JOHN-DECISION-PATTERNS.md` #9, #10 (John: "can you just pick the first intent so we dont have to do a model call?").
- [C-invar-6] (HIGH) Agent behavior is fixed in the agent's own Skill content, never in harness special cases — "make the agent smarter, not change the loop rules." — *grounds:* `JOHN-DECISION-PATTERNS.md` #7.
- [C-invar-7] (HIGH) An agent that catches bad content routes the correction back to the producing agent to fix and iterate — never patched downstream, never handed to the user. — *grounds:* John, 2026-07-22 (JDP #104); the do-the-work-for-the-human premise.

## Data-driven over code

- [C-invar-8] (HIGH) Hardcoding is the platform's premise to remove, not a convenience to weigh: prefer one data row + one generic mechanism to N special cases; adding a thing is a data insert, not a code deploy. — *grounds:* `JOHN-DECISION-PATTERNS.md` #2 (John: "if the format is the same, why per-pattern code?").
- [C-invar-9] (HIGH) Capabilities are data through one generic executor — never a hand-rolled capability route; neither harness file may contain a conditional keyed to a specific agent or capability identity (enforced by grep gate SE-02). — *grounds:* §19b [LOCKED]; §19d code/data test.
- [C-invar-10] (HIGH) Platform code is agent-agnostic and every agent speaks in its own voice: code names no agent, nobody narrates anybody else's work, the requester authors the ask and the doer authors the account. — *grounds:* John (JDP #13): "The code we create is agent agnostic — every agent must obey its functionality ask."
- [C-invar-11] (HIGH) The screen authors no content and holds no content policy — it renders what the agent returned; content judgments are never hardcoded into the repo. — *grounds:* §19j decision (John overturning signed-off fallback copy, JDP #12); JDP #11.
- [C-invar-12] (HIGH) Tracking systems are self-maintaining: new real data surfaces automatically; a hand-maintained catalog that goes blind on uncatalogued reality is the bug. Catalogs are provisional records of what is observed, never a golden standard. — *grounds:* JDP #16, #37 (John: "if another AI pattern is used, it updates our system, not hardcode to something else").
- [C-invar-13] (HIGH) The direction of travel is one-way: determinism *removal* is a standing priority class (P8 — harness and platform services become model decisions); no roadmap ever adds determinism where model judgment lives. — *grounds:* §19v priority list; 22+ P8 rows in the backlog snapshot.

## Honest display

- [C-invar-14] (HIGH) If it can't be verified, don't show it; if it can, show it. Attribution comes from what the call actually did, never from declared configuration. — *grounds:* JDP #33, #32 (both John's rulings, verbatim in #33).
- [C-invar-15] (HIGH) Render honest absence: a visible gap is correct, an invented value is a bug — never a fabricated zero, padded group, or parallel display papering over incomplete data. — *grounds:* JDP #34, #35 (John reverted a tile rather than ship a confident wrong 0).
- [C-invar-16] (HIGH) Counts are complete and semantically exact: an audit surface counts everything that really happened; never exclude real work from a user-visible count; two surfaces showing the same meaning show the identical number. — *grounds:* JDP #38, #40, #41 (John: "a hop is an instance that has work and time, no matter how brief").
- [C-invar-17] (HIGH) Failures are narrated honestly, never hidden: a self-recovered failure is told to the user in the live stream with an updated expectation; a hard failure lands in a visible, actionable state — never a silent revert. — *grounds:* JDP #116, #51 (John: "its ok to let the user know you hit a snag and selfed recovered").
- [C-invar-18] (HIGH) Every displayed content element has stateable provenance — hardcoded or agent-authored, and by whom — and real values are captured in data with masking applied only at display. — *grounds:* JDP #110, #43 (John: "make sure you are logging the real thing, you can obfuscate... in the viewer").
- [C-invar-19] (HIGH) Trust resolves to the weakest contributing tier — one synthesized citation makes the whole answer synthesized, never averaged up. — *grounds:* JDP #44 (John's ruling).
- [C-invar-20] (HIGH) Any number that leaves the platform ships verified against its source with its defense: how measured, what counts, the confidence. — *grounds:* JDP #112 (John, 2026-07-24).

## Agents with real competencies

- [C-invar-21] (HIGH) Skills are the atomic unit and the IP; Skill↔Capability and Capability↔Agent are both many-to-many; agents hold Seniority, never ownership; Model Score is always derived, never hardcoded. — *grounds:* §2 Key Rules [LOCKED] 1–5, 12.
- [C-invar-22] (HIGH) Broker reasoning must see real Skill content, not capability blurbs — the platform's differentiator (rich Skills) must be visible to the reasoning that routes work. — *grounds:* §19e AA-165 note (John: "I can't tell you enough how important this is"); memory `feedback-skills-are-the-differentiator` (gap still open).
- [C-invar-23] (HIGH) Resource ownership is structural: an owned resource (the Library under Eleanor Voss — The Librarian) is reachable only through its owner's broker — access is impossible to route around, not merely discouraged. — *grounds:* §19e [LOCKED]; §19c.
- [C-invar-24] (HIGH) Improving an agent is a content/training operation in Supabase, not a software release — this is the locked pitch's central mechanism and must survive every feature direction. — *grounds:* §0 [LOCKED] pitch; §2 (Skills/Capabilities as rows); JDP #7/#8 (fix at the data layer first).
- [C-invar-25] (MED) Corrections compound into training material: caught mistakes become stored learning so the agent improves — the feedback loop is a product feature, not an ops process. — *grounds:* John, 2026-07-22: "Later we will store that as a learning lesson for the agent"; §19e's logged-reasoning-as-training-material note.

## The experience contract

- [C-invar-26] (HIGH) Agent-voiced copy is live, tailored generation in that agent's own voice — "this has got to feel like you are talking to a person"; a static placeholder fails the premise. — *grounds:* JDP #47 (John's ruling on CHI-03a).
- [C-invar-27] (HIGH) The user sees real activity only — no back-office mechanics, no roadmap placeholders — in plain first-time-user language, with the system visibly alive while work happens and finished states actively signaled. — *grounds:* JDP #45, #46, #48, #50 (John: "it's not pulsing — the system does not look like anything is moving").
- [C-invar-28] (HIGH) A run must show what each agent tangibly delivered toward the final artifact — choreography without visible output fails the premise (the house-contractors standard). — *grounds:* John, 2026-08-04 (JDP #117); §19q–§19s.
- [C-invar-29] (HIGH) One object gets one name everywhere; canonical terminology is built live with John in his own words; AI techniques use the real published industry term, never an invented one. — *grounds:* JDP #53, #87, #88 (John: "I have been fighting claude this entire time to quit making up its own terminology").
- [C-invar-30] (HIGH) End-to-end without failure is the bar; when failures compound across a many-call pipeline, the platform recovers generically and automatically rather than per-cause. — *grounds:* John, 2026-07-28 (verbatim in mission doc); §19o; JDP #20.

## Governance identity

- [C-invar-31] (HIGH) Nothing reaches production without John: dev→main is his in every governance mode, always; spend caps and budget walls are his protections alone — a blocked session reports and waits, never routes around. — *grounds:* §19v; CLAUDE.md hard rule; JDP #80.
- [C-invar-32] (HIGH) Every autonomous change is reversible by one action of John's (revert-forward code, before-image data writes, flags off); no before-image → the write does not happen. — *grounds:* §19v reversibility [2026-08-19].
- [C-invar-33] (HIGH) The drift being designed against is not bugs — it is a hundred individually-fine decisions summing to a platform that is no longer John's; anything the decision-patterns corpus doesn't cover fails closed to the gated lane. — *grounds:* §19v vision-drift protection (verbatim).
- [C-invar-34] (HIGH) Locked architecture changes only in the open: when live evidence contradicts a locked rule, the conflict is surfaced and the section amended in the same session — never silently patched against, never silently obeyed. — *grounds:* JDP #94 (John's ruling); ARCHITECTURE.md header rule.
- [C-invar-35] (HIGH) The objective function is a platform that scales and generates fewer future tickets — never closing the current ticket; a feature owns its own bugs before it ships. — *grounds:* John, 2026-07-29 (JDP #123); John, 2026-08-19 (JDP #124); §19v feature-owns-its-bugs.
- [C-invar-36] (MED) Best practices are priors, conditioned on John's goal — before committing to a novel mechanism, research how the industry does it and say which is being proposed; the goal outranks existing code and even the architecture doc. — *grounds:* JDP #101, #102 (John: "perhaps the architecture doc is wrong").
- [C-invar-37] (MED) Privacy floor: John's personal contact details never appear on a public surface, and telemetry is best-effort — a declined cookie never blocks or errors the product path. — *grounds:* JDP #111, #105 (both John verbatim, 2026-08-08 / 2026-08-01).

## Open questions for John

1. C-invar-13 claims determinism removal is one-way (never add determinism where model judgment lives). JDP #9/#10 carve out deterministic mechanisms where the value is already known. Is the boundary "judgment stays model, mechanics stay deterministic" the invariant as you'd word it?
2. Should any invariant here be demoted to preference — i.e., is there one you'd trade away for a big enough P2/P3 win (e.g., a customer demanding a fixed routing path)?
3. C-invar-23: AA-178 still awaits your ruling on Librarian exclusivity (code-path vs caller-identity). Which reading is the invariant?
4. Is "no per-customer forks" an invariant? Multi-tenancy is a Functional Objective (§1) but nothing yet states whether a paying customer could ever get bespoke code paths.
5. C-invar-29: does one-name-everywhere extend to marketing surfaces (landing page, pitch decks), or may external copy use looser language than the product?
