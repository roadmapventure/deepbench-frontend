# DeepBench — Agent Competency Model
# Version: v6.2.46 (draft, rev.2) | Created: 2026-07-15 | Session: S-ARCH-COMPETENCY-MODEL-design

> **Purpose:** the canonical, code-verified reference for what makes up an agent's competency —
> every variable, where it's stored, what it's for, and whether the harness/loop actually reads it
> today. Built to test agents against (find what's lacking) and to judge whether a routing/selection
> bug needs a **structural fix** (harness-level) or a **content fix** (Skill authoring) — that
> judgment call is the whole reason this doc exists.
>
> **Rev.2 changes (this pass):** terminology corrected — "Skill Profile" → **Skill** (John's
> explicit call: Skill is the unique item; a Capability aggregates Skills). The Competency/Agent
> relationship reframed as a **real-time harness construct**, not a missing DB layer (previous draft
> wrongly flagged this as a gap). New cross-cutting axis added to the variable matrix: every field is
> now tagged **Content** (loose prose, the model reasons over it — ambiguity is a feature, not a
> gap) / **Control-flow** (the harness or cross-agent routing branches on it — must be complete,
> zero tolerance) / **Plumbing** (exists only so a code path doesn't break — not real authored
> competency, don't count it as depth). Several Part 6 questions from rev.1 are now resolved and
> retired; new ones added. **Status: still DRAFT — several points below need your confirmation
> before this is final,** flagged inline and summarized at the end.

---

## Part 0 — Provenance (unchanged from rev.1)

| Doc | Date | Status |
|---|---|---|
| `AGENT-ARCHITECTURE.md` | v5.1.35, 2026-06-13 | Superseded — "Five-Layer Agent Anatomy" / "Three Competencies." |
| `PLATFORM-ENTITIES.md`, `INTENT-MODEL.md`, `FORMAT-MODEL.md` | v5.2, 2026-06-15/16 | Superseded — modeled Intent/Format as standalone entities; `ARCHITECTURE.md` §2 collapsed them into Skill types two days later. |
| `ARCHITECTURE.md` §2 "The Platform Model" | 2026-06-18 | Locked, current — the real hierarchy and vocabulary. |
| `SKILL-PROFILE-MODEL.md` | v5.2, 2026-06-18 | Right shape, stale content — predates the Agent Loop build (v6.0+); names three "Standard Traits" the harness never reads. |

This doc is the Part-3/Part-6 replacement for `SKILL-PROFILE-MODEL.md`, reconciled a second time
against John's own working mental model (this session), not just against shipped code.

---

## Part 1 — The Hierarchy, reconciled

**What rev.1 got wrong:** it treated the absence of a `competencies` table as an architectural gap.
It isn't one. Competency and Agent are **not stored rows — they are real-time constructs the
harness assembles at call time**, exactly as `ARCHITECTURE.md` §2's own "Machine" vision already
said ("an LLM assembles Skills, Capabilities, and Competencies at runtime... without human
configuration at call time"). There is nothing to build here. Both "Competency" and "Agent" are
**product naming for the same underlying construct** — Competency is the technical/internal name,
Agent is the persona-bearing, product-facing name for it.

**John's formula for what a Competency actually aggregates:**

```
Competency  =  Profile  +  Training (RAG)  +  Capabilities (an aggregation of Skills)
Agent       =  Competency  +  persona (name, avatar, quip)
```

**Reconciling this against the locked `ARCHITECTURE.md` §2 hierarchy** (which lists Identity and
Knowledge as two of five peer Skill types bundled *inside* Capabilities, not as separate top-level
inputs to Competency) — this draft's working reconciliation, **flagged for your confirmation, not
asserted as settled:**

- **Profile** = the raw, human-facing Personnel Page record (name/role/specialty on the `agents`
  table, plus Resume/Playbook/Training subscreen content). Not itself a Skill.
- **Identity-type Skill** = a *configured lens into Profile* — verified in code (`db-assembly.js`):
  it literally pulls the `agents` table row + `agent_configs` role-prompt rows, plus its own
  authored `objective`/`method`, into one section. It doesn't hold independent content — it's a
  pointer/frame around Profile content, plus a specific angle on it.
- **Training (RAG)** = the raw knowledge connection (`the_library`/`knowledge_entries`).
  Not itself a Skill.
- **Knowledge-type Skill** = a *configured lens into Training* — verified in code: it holds no
  content of its own, only a `fetch_instruction` (scope, source, match_count) that configures
  *how* to reach into Training at call time.
- **Behavior / Intent / Format-type Skills** = genuinely independent authored content, aggregated
  directly into Capabilities — no raw/lens split the way Identity and Knowledge have.

If this reconciliation is right, the picture is: **Competency's three inputs (Profile, Training,
Capabilities) are the raw sources; Identity-type and Knowledge-type Skills are how a Capability
reaches into two of those three sources; Behavior/Intent/Format-type Skills are Capability-native
content with no external source.** That's a five-type Skill system sitting on top of a three-input
Competency formula, not two competing models. **Confirm this is the read you intended** — see
Part 6, Q1.

```
Profile ─────────┐
                  ├──── configured into ──── Identity Skill ──┐
Training (RAG) ───┤                                            │
                  └──── configured into ──── Knowledge Skill ──┤
                                                                 ├──► Capability
                        Behavior Skill (native) ─────────────────┤
                        Intent Skill (native) ────────────────────┤
                        Format Skill (native) ─────────────────────┘
                                                                 │
Capabilities ──────────────────────────────────────────────────►│
Profile ─────────────────────────────────────────────────────────┼──► Competency ──► + persona ──► Agent
Training (RAG) ────────────────────────────────────────────────────┘
```

---

## Part 2 — The Personnel Page ↔ Skill promotion path (new this pass)

You noted: *"within the Personnel Page, there could be skills found there too — such as role,
format, and guardrail — that can also be used to create a skill."*

This is already real, not aspirational — confirmed directly in `db-assembly.js`:

- `agent_configs` rows of `type: 'role_prompt'` (authored on/near the Personnel Page) are pulled
  **live, at every call**, into both the Identity section *and* the Behavior section of the
  assembled prompt. Not a one-time promotion/copy step — a standing merge.
- `agent_configs` rows of `type: 'guardrail'` feed the (currently unseeded) Guardrails Skill branch
  the same way.

So the Personnel Page isn't only the source for Identity — it's a **shared authoring surface** that
several Skill types draw from live. Worth deciding (Part 6, Q2) whether this stays an implicit
merge or becomes an explicit, visible "this Personnel Page entry feeds these N Skills" relationship
on the Page itself.

**Knowledge ↔ "lessons learned":** you noted the knowledge base should include accumulated lessons
learned, not just static facts. That mechanism already exists — Elena Cho's `memory-consolidation`
capability / `the_reasoning` entity (`ARCHITECTURE.md` §19f) — but it's built as a **separate
Competency**, not as part of the Knowledge Skill's own RAG scope. Conceptually you're describing one
unified Knowledge layer (facts + accumulated lessons); today it's two mechanically distinct paths
that happen to both count as "what the agent knows." Flagged as Part 6, Q3.

---

## Part 3 — The Five Skill Types, terminology corrected

| Skill Type | What it captures | Source (per Part 1's reconciliation) |
|---|---|---|
| **Identity** | Who the agent is | Lens into **Profile** |
| **Behavior** | How the agent thinks/communicates | Native — "to be determined per Skill," your words — this is deliberately the least pre-specified type |
| **Knowledge** | What the agent knows | Lens into **Training (RAG)**, conceptually should include lessons-learned (Part 2) |
| **Intent** | What task the agent performs | Native — authored directly as Skills |
| **Format** | What output the agent produces | Native — authored directly as Skills |

**On deliberate looseness — this is not drift, it's the correct industry pattern.** Every serious
agent framework (OpenAI Assistants `instructions`, CrewAI role/goal/backstory, Semantic Kernel
personas) draws the identical line real agent platforms draw, and it isn't "structured vs.
unstructured" — it's:

- **Content fields** (Identity philosophy, Behavior style, Knowledge framing) — deliberately loose,
  overlapping prose. The model reasons better over richer, even redundant context than over a
  rigid, non-overlapping form. Ambiguity here is intentional, not a gap to close.
- **Control-flow fields** (anything the *harness* or *cross-agent routing* branches on) — zero
  ambiguity tolerated, ever, in any real framework. A missing value here is a runtime bug, not a
  style choice.
- **Plumbing fields** — exist only so a code path has *something* to read, not because real
  authored competency lives there. Distinct from both of the above — see Part 4.

This three-way split is the organizing axis for the rest of this doc.

---

## Part 4 — Full Variable Matrix, tagged Content / Control-flow / Plumbing

**Legend — read status (unchanged from rev.1):** 🟢 read into the live prompt · 🟡 read only for
Michelle's cross-agent selection context · ⚪ stored, never read.
**New tag — what kind of field this is:** **C** Content · **F** Control-flow · **P** Plumbing.

### `skill_profiles` table (22 columns — table name unchanged; conceptually these rows are Skills)

| Variable | Purpose | Read? | Kind | Notes |
|---|---|---|---|---|
| `objective` | What this Skill is trying to accomplish | 🟢 identity/intent · 🟡 others | **C** | Loose prose is fine — this is exactly the content layer. |
| `method` | How it accomplishes it | 🟢 identity/intent only | **C** | Same — Owen's `qg-review-intent` is the richest real example of this done well. |
| `output_desc` | What shape this Skill's output takes | 🟡 any type, via Michelle's roster context | **F** | **The field behind this session's live incident.** This is the one place a "Content" field is actually load-bearing for routing — it needs the same completeness discipline as a true control-flow field, even though it reads as prose. |
| `traits.can_request_help` / `delegation_required` / `requires_human_confirmation` / `critique_*` / `schema` | Delegation/orchestration gates | 🟢 | **F** | Pure control-flow. Zero ambiguity tolerance — this is what a missing/wrong value here actually breaks. |
| `guardrails` (jsonb) | Must / must-not rules | 🟢 intent/format | **F** | Structural constraint, not reasoning material — belongs with control-flow even though it's authored as text. |
| `tone` | Communication register | ⚪ never read | **P** | Documented as a Standard Trait, dead in the harness. Not "thin content" — genuinely unused plumbing. Candidate for removal from the model (Part 6, Q4) rather than a gap to fill. |
| `confidence` | Output certainty | ⚪ never read | **P** | Same disposition as `tone`. |
| `notes` | Free-text fallback | ⚪ never read | **P** | Same. |
| `technical_services` | AI Pattern triggers | 🟢 | **F** | Drives real Reflect/Synthesis behavior — control-flow, not content. |
| `execution_type` | ai/deterministic/mixed | ⚪ not read in prompt assembly | **P** | Used for AI Audit badge display elsewhere — not competency content. |
| `llm_provider`/`llm_model`/`max_tokens`/`api_key_source`/`temperature` | Per-Skill model override | 🟢, gated | **F** | Control-flow — has its own bug history (a stray value once silently downgraded a model tier). |

### `agents` table (= Profile, per Part 1)

| Variable | Purpose | Read? | Kind |
|---|---|---|---|
| `name`, `role`, `specialty` | Feeds Identity section + Michelle's roster context | 🟢 | **C** |
| `skill_score`, `situational_awareness`, `rating` | Competency signal for ranking candidates | 🟡 | **F** — this is prose-adjacent but literally used to rank/gate a selection decision |
| `is_active` | Gate — inactive agents never surface | 🟢 | **F** |

### `agent_configs` table (Personnel Page ↔ Skill merge — Part 2)

| Variable | Purpose | Read? | Kind |
|---|---|---|---|
| `type: 'role_prompt'` | Free-text role instructions | 🟢 feeds Identity *and* Behavior | **C** |
| `type: 'guardrail'` | Free-text guardrail lines | 🟢 feeds the unseeded Guardrails branch | **F** |

---

## Part 5 — Per-Agent Completeness Matrix

Unchanged data from rev.1 (published separately as the artifact's card view) — **but re-read it
through the Content/Control-flow/Plumbing lens, not a flat null count:**

- A **Content**-field gap (e.g. `behavior`-type `objective`) is a real authoring backlog item —
  worth prioritizing, never worth force-filling with filler text just to close a checkbox.
- A **Control-flow**-field gap (`intent`-type `output_desc`, missing `can_request_help`/`schema`
  where an intent needs one) is a defect, full stop — this is the completeness gate that needs
  zero tolerance, and it's the correctly-scoped version of what caused this session's live
  incident.
- The two-tier pattern found in rev.1 (Alex/Bob/Claire/Riley/Michelle vs.
  Marcus/Eleanor/Elena/Owen/Priya/Sam/Victoria/Dan) is a **Control-flow** gap specifically — every
  agent in the thin tier is missing `output_desc` on every Intent row, not missing Behavior prose
  (which would be lower-priority Content debt).

---

## Part 6 — Standing Test Methodology (unchanged from rev.1)

**Layer 1 — Completeness sweep, now correctly scoped to Control-flow fields only** (deterministic,
cheap, run any time):
```sql
-- Flags Control-flow gaps specifically (Part 4's "F" tag) — not a blanket null check,
-- and not Content-field debt, which is a backlog priority, not a defect.
select a.id, aca.capability_slug, sp.slug, sp.skill_type_slug
from agents a
join agent_capability_assignments aca on aca.agent_id = a.id
join capability_skill_profiles csp on csp.capability_slug = aca.capability_slug
join skill_profiles sp on sp.slug = csp.skill_profile_slug
where a.is_active
  and sp.skill_type_slug = 'intent'
  and sp.output_desc is null;   -- the field that actually drives cross-agent selection
```

**Layer 2 — Live consistency test, one scenario per capability:** completeness proves data exists,
not that Michelle picks correctly. For each of the ~14 capabilities that's a legitimate
`request_help`/`delegate_to_agent` target, write one realistic task scenario that should obviously
route there, run it through the real `agent-selection-intent` call, confirm the actual pick matches
the intended owner. Never run before as its own systematic pass.

---

## Part 7 — Open Questions (revised — several from rev.1 are now resolved)

**Resolved this pass, retired:**
- ~~Competency layer / no `competencies` table~~ — resolved: by design, a real-time construct, not
  a gap. See Part 1.
- ~~Is deliberate ambiguity a problem?~~ — resolved: no, it's correct for Content fields, and the
  new axis in Part 4 makes the distinction explicit going forward.

**Still open — need your confirmation:**

1. **Part 1's reconciliation** (Identity/Knowledge Skills as lenses into Profile/Training, vs.
   Behavior/Intent/Format as native) — is this the read you intended, or did you mean something
   more direct (e.g. Profile and Training bypass the Skill layer entirely for some purposes)?
2. **Personnel Page ↔ Skill merge** (Part 2) — stay an implicit live-merge (current, working
   behavior), or make the relationship explicit/visible on the Personnel Page itself?
3. **Knowledge + lessons-learned unification** (Part 2) — worth merging Elena's
   `memory-consolidation` conceptually into the Knowledge Skill's own story, or keep them
   mechanically separate as they are today?
4. **Plumbing fields** (`tone`, `confidence`, `notes`, `execution_type` in prompt assembly) — wire
   them into the harness for real, or formally drop them from the model instead of letting them
   sit as false "Standard Traits"?
5. **`capability_skill_profiles.level`** — exists, unread by the harness. Same question as Q4.
6. Does this doc formally supersede `SKILL-PROFILE-MODEL.md`, with a pointer left there, or fully
   replace it?
