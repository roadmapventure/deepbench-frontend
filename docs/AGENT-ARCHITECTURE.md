# DeepBench — Agent Architecture Model
# Version: v5.1.35 | Created: 2026-06-13 | Session: S-AGENT-ARCH-01

> This document captures all decisions made in the S-AGENT-ARCH-01 design session.
> It is the north star for all future agent-related sessions.
> Locked decisions are marked **[LOCKED]**.

---

## 0. The Positioning Statement [LOCKED]

> "We sell intelligence. Agents are how you access it. The persona is how you trust it."

**What this means:**
- The product is not AI agents. The product is intelligence at measurable depth.
- Agents are named access profiles over a set of capability dimensions.
- The persona (name, voice, avatar, character) is what makes an agent trustworthy — not just useful.

**How DeepBench differs from chatbots:**
- Chatbots answer questions. DeepBench agents do work.
- Chatbots know it or they don't. DeepBench measures HOW WELL an agent knows something.
- Chatbots have a system prompt. DeepBench agents have a philosophy, epistemology, and calibrated confidence.
- Chatbots are single-agent. DeepBench is a workforce.
- Chatbots consume training material. DeepBench makes training material into tradeable IP.

---

## 1. The Five-Layer Agent Anatomy [LOCKED]

Every agent in DeepBench — Chloe, Mike, Bob, John — is a configuration of five layers.
No agent is a special case. All share the same model.

```
┌─────────────────────────────────────────────────────┐
│  MARKET LAYER                                       │
│  Pricing tier · margin sharing · access tags ·      │
│  BYOK · marketplace publishing                      │
├─────────────────────────────────────────────────────┤
│  OUTPUT LAYER                                       │
│  Deliverable types · format rules · storage ·       │
│  supervised training feedback · sharing / selling   │
├─────────────────────────────────────────────────────┤
│  DIMENSION LAYER  (what the agent has and can do)   │
│  Capability · Knowledge · Reasoning · Behavioral    │
│  → each dimension at L1–L4, each tradeable as IP    │
├─────────────────────────────────────────────────────┤
│  CHARACTER LAYER  (how the agent governs itself)    │
│  Philosophy · Epistemology · Skeptic Level ·        │
│  Confidence Calibration · Peter Principle Awareness │
│  Autonomy Level · Collaboration Role ·              │
│  Temporal Stance · Ethical Constraints ·            │
│  Learning Stance                                    │
├─────────────────────────────────────────────────────┤
│  IDENTITY LAYER                                     │
│  Name · avatar · voice · quip · persona depth       │
└─────────────────────────────────────────────────────┘
```

---

## 2. The Dimension Layer [LOCKED]

Four dimensions. Each at L1–L4. Each independently trainable. Each tradeable as IP.

| Dimension | What it captures | L1 | L4 |
|-----------|-----------------|----|----|
| **Capability** | What tasks the agent can execute | One tool, basic | Full capability suite, deep authorization |
| **Knowledge** | What the agent knows about a domain | General LLM only | Private IP and past work |
| **Reasoning** | How the agent thinks through problems | General LLM inference | Proprietary decision logic and diagnostic arcs |
| **Behavioral** | How the agent communicates and prioritizes | Default tone | Mirror of a specific person's voice |

### Training Material by Dimension [LOCKED]

| Dimension | Training material | What it teaches |
|-----------|------------------|-----------------|
| Knowledge | Domain documents, regulations, reference material | The facts. What it knows. |
| Behavioral | Writing samples, emails, style guides, persona descriptions | The voice. How it sounds. |
| Reasoning | Annotated transcripts, decision logs with why-not documented, case studies showing process | The arc. How it thinks. |
| Character | Philosophical stance documents, behavioral profiles | The firmware. How it governs itself. |

**Critical distinction:**
- A briefing document says WHAT the answer is → Knowledge
- A decision log says HOW you got there and WHAT you ruled out → Reasoning
- A session transcript where you go from vague problem to named architecture, annotated with thinking at each step → Reasoning (most valuable, hardest to replicate)

### Lock / Adaptive / Supervised States [LOCKED]

Every dimension and character setting carries one of three states:

| State | Meaning | Use case |
|-------|---------|----------|
| **Locked** | Fixed. No training, no drift, no self-learning changes it. | Ethical constraints, philosophy for compliance agents, government audit requirements |
| **Adaptive** | Evolves automatically through training uploads and self-learning | Knowledge base, behavioral nuances, reasoning patterns |
| **Supervised Adaptive** | Can change, but changes require human approval before taking effect | Character settings the user wants to develop but not drift without review |

---

## 3. The Character Layer [LOCKED]

The Character Layer is the meta-cognitive firmware of an agent. It governs how all dimensions express — same knowledge, same reasoning, same capabilities, but different character settings produce measurably different outputs.

**Implementation: Option C — Configured baseline, training deepens** [LOCKED]

| Level | How you get there | What it means |
|-------|------------------|---------------|
| L1 | Configure via settings panel | "This agent is compliance-first" |
| L2 | Upload behavioral docs, persona descriptions | Nuanced application of the philosophy |
| L3 | Upload annotated decision transcripts | Reasoning through real conflicts in this philosophical stance |
| L4 | Sustained training + self-learning from task outputs | Proprietary philosophical stance that cannot be replicated |

Fast path uses L1 only. Deep path retrieves L2–L4 via RAG.

### Character Settings [LOCKED]

| Setting | Description | Example values |
|---------|-------------|----------------|
| **Philosophy** | What the agent optimizes for before it reasons | Compliance-first, Efficiency-first, Risk-averse, Stewardship |
| **Epistemology** | How it forms and holds beliefs | Evidence-first, Inference-based, Consensus-based |
| **Skeptic Level** | How much it challenges premises (1–10) | 1=accepts framing, 10=adversarial stress-tester |
| **Confidence Calibration** | Perceived vs. actual confidence alignment | High=declares uncertainty clearly, Low=sounds confident always |
| **Peter Principle Awareness** | Knows its depth ceiling, declares when out of depth | On/Off + HITL trigger threshold |
| **Autonomy Level** | HITL dial — check-in frequency vs. act-and-report | Low / Medium / High |
| **Collaboration Role** | Role in multi-agent workflows | Lead / Execute / Challenge / Synthesize |
| **Temporal Stance** | Default time orientation | Historical / Current / Strategic |
| **Ethical Constraints** | Non-negotiable refusals regardless of instruction | Freeform text, always Locked |
| **Learning Stance** | How it handles contradicting evidence | Anchored / Open / Adaptive |

### Confidence Tier Model [LOCKED]

| Internal tier | Agent signals | What triggers it |
|--------------|--------------|-----------------|
| I know this | Cited from training | RAG retrieval, high similarity, trained domain |
| I believe this | Inference from patterns | General LLM reasoning, no RAG hit |
| I suspect this | Needs verification | Low similarity RAG or weak signal |
| I don't know this | Explicit declaration | No signal at all |

---

## 4. The Two-Speed Technical Architecture [LOCKED]

| Mode | Latency target | User state | What loads |
|------|---------------|------------|-----------|
| **Fast path (chat)** | < 2 sec to first token | Actively waiting | DB only — L1 character + L1 behavioral + top 3 RAG chunks. Haiku model. |
| **Deep path (tasks)** | Seconds to minutes, async | Not blocking | Full assembly — all layers, full RAG (top 10+ chunks, all training types), Sonnet model. Streams to UI. |

**Routing rule:** Agent's depth level sets the default path. Task complexity classification (Haiku, cheap pre-call) can override upward — never downward.

- L1–L2 agents: fast path default
- L3–L4 agents: deep path default
- Complex task + L1 agent: fast path still (agent ceiling, not task ceiling)
- Simple task + L3 agent: deep path still (don't waste the depth)

**Cost implication:** depth level IS the pricing tier. No separate pricing logic needed.

---

## 5. Prompt Assembly [LOCKED]

New capability route: `api/capabilities/prompt-assembly.js`

Assembled at call time from:
```
[Identity block]        agents.js (~50 tokens)
[Character L1 block]    agent_character table (~150 tokens)
[Behavioral L1 block]   agent_configs table (~200 tokens)
[Capability context]    agent_capability_assignments (~100 tokens)
[Character L2–L4]       RAG, character-tagged (~300 tokens, deep path only)
[Behavioral L2–L4]      RAG, behavioral-tagged (~300 tokens, deep path only)
[Reasoning patterns]    RAG, reasoning-tagged (~500 tokens, deep path only)
[Knowledge chunks]      RAG, knowledge-tagged (~800 tokens, deep path only)
[Task context]          Current task (~200 tokens)
```

Fast path total: ~700 tokens. Deep path total: ~2,600 tokens.

**Token budget rule:** every block has a hard cap. No block may exceed its cap regardless of available content. Caps are configurable per capability type, not per call.

---

## 6. The Agent Intelligence Score (AIS) [LOCKED]

Two separate scores, both visible on the Personnel File and Roster cards.

### AIS — Agent Intelligence Score (0–100)
Measures how intelligent the agent IS.

```
Identity:    10 pts  (persona depth L1–L4)
Character:   15 pts  (settings configured + training depth)
Behavioral:  15 pts  (L1 config + L2–L4 training material)
Reasoning:   20 pts  (annotated transcripts, decision arcs)
Knowledge:   40 pts  ← double-weighted (see below)
  - Volume:     10 pts  (documents ingested)
  - Freshness:  10 pts  (decays over time)
  - Coverage:   10 pts  (domain breadth)
  - Activity:   10 pts  (training streak)
```

### CS — Capability Score (0–100)
Measures what the agent CAN DO.
- Breadth: capabilities assigned / total available
- Depth: average depth level across assigned capabilities

### Why Knowledge is 40% [LOCKED]
Knowledge is the dimension that makes the product irreplaceable. An agent with deep, current, proprietary knowledge is an asset no competitor can copy. The AIS weighting reflects this — you cannot fake a high AIS without feeding the agent continuously.

---

## 7. The Knowledge Hunger Mechanic [LOCKED]

Knowledge has three properties the other dimensions don't: it goes stale, gaps are specific and nameable, and feeding it is a clear satisfying action.

### Freshness Decay Curve [LOCKED]

| Age of document | Score multiplier |
|----------------|-----------------|
| Day 0–30 | 100% |
| Day 31–60 | 85% |
| Day 61–90 | 70% |
| Day 91–180 | 50% |
| Day 181+ | 30% — flagged as "stale, verify still current" |

### Hunger States [LOCKED]

| State | Trigger | Color | Message |
|-------|---------|-------|---------|
| Fed | Trained within 7 days, no stale docs | Green | "Well fed — knowledge current" |
| Peckish | 8–14 days since training | Yellow | "Getting hungry — consider adding recent updates" |
| Hungry | 15–30 days, or stale docs | Orange | "Hungry — knowledge drifting" |
| Starving | 30+ days, multiple stale | Red | "Starving — significantly behind" |

### Training Streak [LOCKED]
Train any agent at least once per 7 days to maintain the streak.
- 4-week streak: +2 Knowledge AIS points
- 12-week streak: +5 Knowledge AIS points
- 52-week streak: +10 Knowledge AIS points + "Master Trainer" badge

### Domain Coverage Map
Visual grid showing topic area coverage vs. gaps. Gaps are named and specific.
Named gaps generate specific upgrade prompts — not generic "upload more docs."
Optional: competitive comparison ("Top NIGP agents have 47 sources. You have 12.") — user can disable.

---

## 8. The Deliverables Model [LOCKED]

### Deliverable Types
Briefing · Report · Recommendation · Data Output · Research Summary · Decision Log · Step Output · Training Artifact

### Storage: Dedicated `deliverables` Table [LOCKED]
```sql
deliverables (
  id, tenant_id, task_id, agent_id, step_id,
  type, title, content (jsonb), format,
  is_shared, share_token, price_usd,
  created_at
)
```
Deliverables are first-class objects, not JSONB on tasks. They outlive the task.

### Training Feedback Loop: Supervised [LOCKED]
Agent flags deliverables it thinks should become training material. User approves before ingestion. Prevents bad outputs from reinforcing bad behavior.

### Selling Deliverables [LOCKED]
User explicitly marks a deliverable for sale. Access tiers: public preview (partial) → paid full access.
Shareable via signed URL (Supabase Storage pattern already in use for CSVs).

---

## 9. Revenue Model [LOCKED]

### Pricing Tiers

| Tier | Who | How |
|------|-----|-----|
| Free | Try before you buy | L1 unlimited (capped/month) + 3 one-time L2 trials |
| Pay-per-use | One-off users | ~2x subscription per-use rate. No subscription required. |
| Subscription | Regular users | Monthly fee, usage allowance, lower per-use rate, overage billed |
| Enterprise | Government, large orgs | Custom pricing, SLA, locked character layers, full audit trail |

### Marketplace Split [LOCKED]
When Tenant A's trained capability is used by Tenant B:
- Platform fee: 30% (Roadmap Venture)
- IP owner: 60% (Tenant A)
- Infrastructure: 10% (actual API cost passthrough)

### Marketplace Rules [LOCKED]
- Minimum L4 price: $0.10 per use
- Exclusivity premium: 2x shared rate
- Private L4 capabilities: never visible in marketplace, tenant keeps 100%

### BYOK Economics [LOCKED]
- No BYOK: Roadmap Venture provides API access at cost + 40% markup
- BYOK: Platform subscription fee only, no per-call markup

### Try Before You Buy [LOCKED]
- Free tier: L1 unlimited (capped), 3 one-time L2 trials (never resets)
- After every task: Depth Delta Panel shows what next depth level would have added (specific, not generic)
- L3 preview: first 30% of output shown free; rest gated
- Upgrade prompt is specific: what was missed, why it matters, what it would have found

### BYOK Discount Display [LOCKED]
Shown at moment of payment. Real number dynamically calculated from actual API cost differential. Not a fixed percentage, not buried in settings.

---

## 10. The Test Architecture [LOCKED]

Two locations, shared infrastructure — mirrors NIGP's "Bee" testing pattern:
- **PE-12 (Personnel File)** — single-agent testing, inline sub-view
- **Test Team screen (Roster)** — cross-agent, cross-depth comparison

### Test Types [LOCKED]

| Type | What it tests |
|------|--------------|
| Output Test | Does the answer look right? |
| Character Test | Does philosophy/skeptic level/confidence calibration express correctly? |
| Depth Test | Is the difference between L1 and L3 measurable and explainable? |

### Test Scenarios — One Per Dimension [LOCKED]

| Scenario | Dimension targeted |
|----------|-------------------|
| Ambiguous procurement goal | Skeptic level — does it ask the right questions? |
| Sole-source justification review | Knowledge depth + philosophy |
| Vendor concentration flag | Reasoning pattern — does it follow the diagnostic arc? |
| Out-of-domain question | Confidence calibration — declares uncertainty or hallucinates? |
| Conflicting stakeholder priorities | Philosophy + autonomy level |

### Test Scorecard [LOCKED]
Per run: Output Quality · Character Alignment · Confidence Calibration · RAG chunks retrieved · Reasoning depth detected · Depth vs. L1 delta · Verdict + suggested next training action.

Passed tests can become training artifacts (supervised feedback loop).
Failed tests flag which dimension needs work.

---

## 11. Database Changes Required

All additive. No existing data deleted or migrated.

| Change | Type |
|--------|------|
| `knowledge_entries` + `training_type` column | Extend existing |
| `agent_configs` + `capability_slug` column | Already planned (S-INFRA-01) |
| `capabilities` table | Already designed (S-INFRA-01) |
| `agent_capability_assignments` table | Already designed (S-INFRA-01) |
| `tenant_api_keys` table | Already designed (S-INFRA-01) |
| `agent_character` table | **New from this session** |
| `deliverables` table | **New from this session** |

---

## 12. Release Phases

### Phase 1 — Foundation (nothing else works without this)
1. `agent_character` table + Character Layer L1 settings panel
2. `training_type` column on `knowledge_entries`
3. `api/capabilities/prompt-assembly.js`
4. Two-speed routing (fast path / deep path)
5. Capability routes restructure (S-INFRA-01)

### Phase 2 — Make It Feel Alive (first demoable differentiation)
6. AIS display on Personnel File + Roster cards
7. Knowledge hunger mechanic (freshness decay, hunger states)
8. Domain coverage map
9. Training streak
10. PE-12 Test Agent console — full dimension testing

### Phase 3 — Revenue
11. Free tier (L1 unlimited, 3 L2 trials)
12. Pay-per-use pricing
13. Depth Delta Panel (suggestive selling)
14. BYOK discount display at payment
15. Deliverables table + first-class output objects
16. Deliverable sharing (signed URLs)

### Phase 4 — Marketplace
17. Lock/Adaptive/Supervised controls
18. Access tags (exclusive/shared, public/private)
19. Capability Score (CS) display
20. Deliverable marketplace — publish, price, sell
21. Margin sharing — 30/60/10 split engine
22. Subscription tiers

### Phase 5 — Scale and Enterprise
23. Multi-agent workflow roles (Lead/Execute/Challenge/Synthesize)
24. Agent versioning + rollback
25. Government audit trail
26. Notification architecture (hunger alerts, streak reminders)
27. John-as-agent (JL-01) implementation
28. Competitive comparison notifications

**v1 line: Phase 1 complete = foundation. Phase 1 + 2 = demoable product. Phase 1 + 2 + 3 = fundable company.**

---

## 13. The John Leonard Agent Blueprint (JL-01)

Reference implementation for the Identity/Persona Replication capability. Validates the entire model against a real human.

**Identity**
- Name: John Leonard | Code: JL-01 | Role: Product Strategist / AI Workforce Architect
- Quip: "I map the intelligence before anyone builds it."
- Persona depth target: L4

**Character (locked settings)**
- Philosophy: Product-first, dual-audience — "Does this impress a procurement director AND a VP of Product?" [Locked]
- Skeptic Level: 8 [Supervised Adaptive]
- Autonomy: Medium [Supervised Adaptive]
- Temporal Stance: Strategic [Supervised Adaptive]
- Epistemology: Evidence-first [Supervised Adaptive]
- Confidence Calibration: Honest — declares uncertainty rather than inflating confidence [Supervised Adaptive]
- Collaboration Role: Initiator + Synthesizer [Supervised Adaptive]
- Ethical Constraints: Never ship something that looks impressive but misleads the buyer [Locked]
- Learning Stance: Adaptive [Supervised Adaptive]

**Training Material Priority**
1. Session transcripts annotated with decision arcs (Reasoning — highest value)
2. ARCHITECTURE.md and design docs with "why" documented (Reasoning + Knowledge)
3. Written communications and product framing (Behavioral)
4. Domain documents — procurement, AI architecture, go-to-market (Knowledge)

**Use cases**
- Demo: "This is me, trained into the platform I built."
- Strategic review: run architectural decisions through the John-agent for validation
- Portfolio proof: the agent IS the resume — a VP of Product who can converse with it will remember it
- Blueprint: first production instance of the persona replication capability

---

## 14. Items Left on the Table (Future Design Sessions Required)

1. Multi-agent workflow handoff design — how agents with different collaboration roles pass work
2. Deliverables marketplace UI — discovery, preview, purchase flow
3. Notification architecture — hunger alerts, streak reminders, competitive comparison
4. Agent versioning — retrain creates a new version, rollback available
5. Government audit trail — who trained what, when, with what material, what was produced
6. "Create from Person" guided flow — setup wizard for persona replication
7. Training provenance display — deliverables show which training material influenced the output
8. Competitive comparison notifications — optional, shows how your agent ranks vs. category peers
