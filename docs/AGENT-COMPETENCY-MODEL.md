# DeepBench — Agent Competency Model
# Version: v6.2.46 (draft, rev.3) | Created: 2026-07-15 | Sessions: S-ARCH-COMPETENCY-MODEL-design, S-ARCH-COMPETENCY-MODEL-design-0715b

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
> retired; new ones added.
>
> **Rev.3 changes (2026-07-15, same-day follow-up session):** corrected a real error in rev.2's own
> Part 1 — it had reintroduced a "Skill Type/Skill Profile as two layers" split under a different
> name (Identity/Knowledge as "lenses"), the same error `ARCHITECTURE.md` §2 had. Both docs rewritten
> same session to state the real model: Skill is the atomic unit, type is a tag, two many-to-many
> joins (Skill↔Capability, Capability↔Agent), no Skill Profile layer, no Competency table. Knowledge
> redefined ("domain and industry-specific background") and all 7 real Knowledge rows audited against
> it. New governing principle locked: Competency vs. Instructions is the real dividing line for every
> Skill's type tag, not just Knowledge's. Every open question from Part 7 (rev.2) is now resolved,
> scoped into a later bucket, or explicitly triaged — see Part 7 below for the full accounting.
> **Status: still DRAFT** — the resolved decisions in Part 7 are locked, but several later-bucket
> items reference designs that don't exist yet (Level-based execution depth, the "agent's wisdom"
> routing, semantic dedup) and need their own sessions before this doc is fully final.

---

## Part 0 — Provenance (unchanged from rev.1)

| Doc | Date | Status |
|---|---|---|
| `AGENT-ARCHITECTURE.md` | v5.1.35, 2026-06-13 | Superseded — "Five-Layer Agent Anatomy" / "Three Competencies." |
| `PLATFORM-ENTITIES.md`, `INTENT-MODEL.md`, `FORMAT-MODEL.md` | v5.2, 2026-06-15/16 | Superseded — modeled Intent/Format as standalone entities; `ARCHITECTURE.md` §2 collapsed them into Skill types two days later. |
| `ARCHITECTURE.md` §2 "The Platform Model" | Rewritten 2026-07-15 | Locked, current — the real hierarchy and vocabulary. **Superseded its own 2026-06-18 version**, which wrongly split Skill into two layers (Skill Type / Skill Profile) and invented a Competency table — that error recurred ~20 times across sessions before John corrected it directly this session. Part 1 below is rebuilt on the corrected version. |
| `SKILL-PROFILE-MODEL.md` | v5.2, 2026-06-18 | Right shape, stale content — predates the Agent Loop build (v6.0+); names three "Standard Traits" the harness never reads. |

This doc is the Part-3/Part-6 replacement for `SKILL-PROFILE-MODEL.md`, reconciled a second time
against John's own working mental model (this session), not just against shipped code.

---

## Part 1 — The Hierarchy, reconciled

**Rebuilt 2026-07-15** on `ARCHITECTURE.md` §2's same-day rewrite. The previous version of this
Part was itself built on the *wrong* version of §2 (Skill Type / Skill Profile as two layers, a
Competency table) and had to be thrown out, not patched — see Part 0's provenance row. Two things
are now settled, not open questions:

1. **Skill is the atomic unit, full stop.** There is no layer above it called "Skill Type" that
   Skills are "configured instances of" — `skill_type_slug` is a plain tag from a 6-row lookup.
   One table (`skill_profiles`), one layer.
2. **Competency and Agent are not stored rows — they are real-time constructs** the harness
   assembles at call time, exactly as §2's "Machine" vision already said. Both are **product
   naming for the same underlying construct**: Competency is the technical/internal name (a
   Capability-set with no persona), Agent is the same thing with a persona attached.

**John's formula for what a Competency actually aggregates:**

```
Competency  =  Profile  +  Training (RAG)  +  Capabilities (an aggregation of Skills)
Agent       =  Competency  +  persona (name, avatar, quip)
```

**What this formula means, now that the hierarchy is corrected:** "Profile" and "Training" are
**not** a separate architectural layer sitting beneath Skill, and Identity/Knowledge Skills are
**not** a distinct "lens" tier mediating between raw sources and Capabilities. There is only one
layer (Skill) and two joins (Skill↔Capability, Capability↔Agent). What's true is narrower and
purely mechanical, verified in `db-assembly.js`:

- **Profile** = the human-facing Personnel Page record (`agents` table + `agent_configs` role-prompt
  rows). Not a Skill, not a layer — an external data source.
- **Training (RAG)** = the knowledge connection (`the_library`/`knowledge_entries`). Also an
  external data source, not a Skill or a layer.
- **Identity-type Skills** are simply Skills whose assembly logic is configured to pull from
  Profile (agents table + role_prompts) *plus* their own authored `objective`/`method` text, and
  render all of it as one static section.
- **Knowledge-type Skills** are Skills whose assembly logic is configured to run a live search
  against Training (or, for one profile, a deterministic aggregate query) at call time and render
  the *result* as the section — never their own `objective`/`method` text, which is inert
  documentation only.
- **Behavior / Intent / Format-type Skills** hold their own authored content directly, no external
  source at all.

So "Profile + Training + Capabilities" is a true description of what ultimately feeds a Competency,
but it's not three peer inputs at the same structural level as Capability — Capability is the one
real aggregation point (Skill↔Capability↔Agent), and Profile/Training are just two external
sources that specific Skills, by their own configuration, happen to read from. This resolves what
rev.2 flagged as an open question (Q1 below) — retired, not still open.

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

## Part 3 — The Six Skill Types, terminology corrected

| Skill Type | What it captures | Assembly behavior (per Part 1) |
|---|---|---|
| **Identity** | Who the agent is | Pulls from **Profile** (agents table + role_prompts) + own authored text, rendered as one static section |
| **Behavior** | How the agent thinks/communicates | Native — "to be determined per Skill," your words — this is deliberately the least pre-specified type |
| **Knowledge** | Domain and industry-specific background — terminology, risks, signals, and patterns | Runs a live search against **Training (RAG)** at call time; own authored text never rendered. Conceptually should include lessons-learned (Part 2) |
| **Intent** | What task the agent performs | Native — authored directly as Skills |
| **Format** | What output the agent produces | Native — authored directly as Skills |
| **Guardrails** | Must / must-not rules the agent operates under | Native — static rules injected directly, no fetch |

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
- ~~What does Knowledge mean?~~ — **resolved 2026-07-15, John's explicit call:** Knowledge = the
  original `SKILL-PROFILE-MODEL.md` "domain lens" intent, restated — **"Domain and industry-specific
  background: terminology, risks, signals, and patterns."** This is a return to the original vision,
  not a new one — the live Supabase audit this session found only 1 of 7 real Knowledge rows
  (`capability-registry-knowledge`) still carries authored content in that shape; the other 6 drifted
  into pure RAG search-config with zero authored domain prose. Remediation for the misfit rows is
  being scoped now, this session — see new finding below, not yet resolved.

**Resolved this pass, retired (continued):**
- ~~Part 1's reconciliation (Identity/Knowledge as lenses vs. native)~~ — resolved: there's no
  separate lens layer at all, that framing was an artifact of the wrong hierarchy. See Part 1's
  rebuild above.

**New this pass, closed:**
- ~~Identity field completeness~~ — **resolved 2026-07-15.** Identity fields, confirmed: `name` +
  `role` + `specialty` + `bio` (a real, authored `agents` column, confirmed dead — never read
  anywhere in `api/`) + all `role_prompt` entries (Resume tab — already correctly wired, not a
  gap) + the Identity Skill's own `objective`/`method`. `architecture` column excluded — unused
  anywhere in the UI or harness, origin unknown, not counted as identity. Governing rule locked
  **(generalized to all Skill types, not Identity-specific — see Knowledge finding below):** a
  Skill renders only when it's actually attached to the Capability being called, but when it is,
  every field on it must render — no cherry-picking, no per-type exceptions. Second rule locked:
  **Identity should be attached wherever the agent exercises real judgment in its own voice** (the
  "act like a CTO" framing) — not restricted to agents that happen to have one built already. Scoped audit (not
  platform-wide) against the real Channel Intelligence loop roster (`marcus, priya, nadia, owen,
  sam, elena, michelle, alex, dan, eleanor, riley` — `MarketIntelligenceScreen.jsx`
  `PROPOSED_MI_AGENT_IDS`): 7 of 11 agents have an Identity Skill (`elena`'s `reasoner-identity` is
  missing its `objective`); `michelle` (`project-manager`), `dan` (`dan-db-assembly`,
  `dan-ai-enrichment`), `alex` (`screen-controls`), `riley` (`html-display`) have none. Fix not yet
  scoped into a kickoff — captured here for the next pass.

**New this pass, closed — scope decided:** shared agent-level content (`role_prompt` rows in
`agent_configs`) re-fetches independently for *every* same-type Skill a Capability has attached,
with no dedup — verified live on Michelle's `project-manager` Capability: her one `role_prompt`
row renders twice in a real prompt today, once triggered by `capability-assignment` and once by
`planning-behavior` (both Behavior-type). **Confirmed ground rules, not up for debate:** multiple
Skills of the same type on one agent is legal and intended — the fix is dedup, not "prevent
duplicate types." Same-type Skills can also live across an agent's different Capabilities —
doesn't change this fix's scope, since one real call only ever assembles one Capability's Skill
list at a time (confirmed in `db-assembly.js`). **Scope locked, John's explicit call:** two
different problems were hiding in "organize/dedupe/summarize" — (1) label each source (job title,
bio, role_prompt, the Skill's own text) and dedupe *exact*-duplicate text across same-type Skills —
a deterministic assembly-code fix, **in scope now**; (2) catching content that says the same thing
in *different words* (e.g. `bio` and `role_prompt` both describing "orchestrates work" differently)
needs real judgment — a genuine new Technical Service (LLM step at assembly time), **not in scope,
logged for a later session.**

**New backlog item, logged not scoped:** semantic dedup/summarization across multi-source identity
content (the "different words, same meaning" case above) — would need its own Technical Service,
not a `db-assembly.js` tweak. No session claimed yet.

**New this pass, closed:** Knowledge's own `objective`/`method` — **resolved 2026-07-15, John's
explicit call: should render, same universal rule as above, no exception for Knowledge.** Confirmed
what that content should actually contain: expertise-framing, not instructions — e.g. *"you're a
data analyst for government spend data with 20 years of experience"* (John's example), the same
kind of priming Identity gives, just domain-specific. Checked the real rows against that bar:
`capability-registry-knowledge` ("know the registry well enough to match capability names...") and
`pm-roster-knowledge` ("provide the roster as context...") are both instruction-shaped, not
expertise-shaped — wrong content regardless of what their type tag ends up being. `reasoner-knowledge`
is closer to real framing (already flagged for likely Behavior reclassification, Q7 below). The
other four Knowledge rows have no `objective`/`method` yet to judge. Rewriting the two
instruction-shaped rows is real content work, not yet scoped into a kickoff.

**New this pass, closed — governing principle locked:** **Competency vs. Instructions is the real
dividing line, John's explicit call, 2026-07-15.** Competency (Identity, Knowledge, Behavior) =
background/expertise/approach an agent draws on. Instructions (Intent, Format, Guardrails) = a
directive about what task to perform or how output must be shaped. **Intent is duties** — checked
against its own original definition (`SKILL-PROFILE-MODEL.md`: "WHAT the agent is instructed to
do... what sections to produce, what questions to answer, what to analyze") — already matches "job
duties" near-verbatim. **No 7th Skill type needed for duties; Intent is confirmed as the single
home for them.** This resolves two mistags at once, both retagged/merged into Intent, not kept
where they were:
- `capability-assignment` (was `behavior`) — task instructions, not a reasoning style. Retag to
  `intent`, or merge into `agent-selection-intent` if the overlap flagged below turns out to be
  real duplication — that implementation detail (new row vs. merge) is still open, not this
  decision.
- `capability-registry-knowledge` / `pm-roster-knowledge` (were `knowledge`) — task-support
  lookups, not competency. Retag to `intent` (or merge into the Intent Skill they support), same
  open implementation detail as above. `eleanor-catalog-knowledge` is genuinely a Knowledge-type
  competency question still (it has no instruction-shaped text, unlike the other two) — stays in
  Q7 below, not resolved by this decision.

**New backlog item, logged not scoped — "Load a Job Description":** John's stated platform vision —
build an agent's full Skillset by uploading/pasting a real job description, auto-mapping Duties →
Intent Skills, Required Skills/Qualifications → Knowledge, Role/Title → Identity, etc. Marked next
bucket, not this session. Worth using a real JD as a completeness test of the 6-type model later —
if any real JD line doesn't map cleanly onto one of the six types, that's the actual evidence for a
7th type, not a decision to make abstractly.

**Q1 now fully closed, both halves:**
- ~~(a) Part 1's mechanical shape~~ — resolved across 4 sub-pieces this pass: role_prompt dedup
  scoped (see above), Knowledge's `objective`/`method` confirmed should render like all other
  Skills (universal rule, no per-type exceptions — see Knowledge-content-shape finding above), and
  `eleanor-catalog-knowledge` folded into the Q7 misfit question rather than treated as a separate
  exception.
- ~~(b) Does Profile/Training ever bypass the Skill layer for some purposes?~~ — **resolved,
  John's explicit call: no, and the one place it currently does is being fixed, not kept.** Found a
  second, fully separate prompt-assembly pipeline live today — `lib/agent-run.js`'s
  `assembleContext()`, used for Brent (web-fetch/portal-automation) — that does not touch
  `skill_profiles` at all: Role/Format/Guardrails come from hardcoded fallback text in
  `agent_configs` lookups, and Knowledge/RAG fires directly and unconditionally, with zero Skill
  gating. **Decision: retire this pipeline, migrate Brent onto the single Skill-based
  `db-assembly.js` system — the platform should have exactly one prompt-assembly mechanism, not
  two. Logged for a later bucket, not this session** (related to, but distinct from, the earlier-
  deferred Trainer/Brent post-run-save alignment item — that one's about extending Brent's *save*
  pattern to Susan; this one's about retiring Brent's *own* separate assembly pipeline).

**Still open — need your confirmation:**

7. **Knowledge redefined** (2026-07-15): "Domain and industry-specific background — terminology,
   risks, signals, and patterns." Live audit found 6 of 7 real Knowledge-type Skills carry zero
   authored content (pure fetch config); only `capability-registry-knowledge` matches the original
   `domain`/`source_types` shape. Two genuine domain fits (`ci-knowledge`, `hyp-knowledge`) just
   need authored content filled in. **`reasoner-knowledge` is a likely reclassification to
   Behavior** — its authored `method` text describes a reasoning disposition, not domain facts,
   and is currently dead (Knowledge-type never renders `objective`/`method` into the prompt).
   **Resolved (see Competency-vs-Instructions finding above): `capability-registry-knowledge` /
   `pm-roster-knowledge` are retagged/merged to `intent` — task-support lookups, not competency.**
   **`eleanor-catalog-knowledge` — resolved 2026-07-15, John's explicit call: stays `knowledge`,
   not retagged.** John's librarian analogy is the deciding test, sharper than the instruction-text
   check that resolved the other two: **would a real professional in this role call it their own
   expertise, or a tool they consult?** A real librarian's actual professional expertise *is*
   comprehensive catalog awareness — knowing what's shelved where, across every subject, is the
   job itself, not incidental plumbing. That's genuinely different from Michelle consulting the
   capability registry, which isn't "what a PM knows" — it's a tool she checks. Eleanor's domain is
   library science/cataloging itself (a structural domain, not a topical one like Marcus's
   channel-sales), which the redefined Knowledge type already covers. Confirmed this also explains
   the rest of her skillset coherently: her "security guard" duty (checking content in/out,
   avoiding duplicates) maps to `eleanor-knowledge`'s semantic write-decision check plus the
   `data_room_tag`/`uber_access` credential gating already on both her Knowledge Skills — access
   control, not cataloging. **Still scope it to `library-catalog-intent` via
   `traits.intent_allowlist`** — staying Knowledge doesn't mean it should keep firing on every
   `data-room-custody` call; same live cost fix as the other two, same waste pattern `AA-121`
   already found and fixed elsewhere.

**Q7 fully closed — Knowledge redefinition complete for all real rows audited this session.**

**Still open from rev.2, unchanged:**

~~2. **Personnel Page ↔ Skill merge**~~ — **triaged 2026-07-15, John's explicit call: not a
   Continuity-priority item, safe to defer.** UI/authoring-visibility gap, not a correctness bug —
   content already reaches the right Skill sections correctly (especially once the `role_prompt`
   dedup fix lands), it's only that the Personnel Page gives no on-screen indicator of the fan-out.
   Different category from today's actual Continuity fixes (dead fields, duplicate rendering,
   missing render), where something was silently wrong. Stays open, low priority, no session
   claimed.
~~3. **Knowledge + lessons-learned unification**~~ — **superseded 2026-07-15 by a more precise
   diagnosis, logged as its own backlog item below.** Susan/Trainer post-training summary alignment
   (the Brent `web-memory.js` pattern) stays a separate, later-bucket item, unchanged from before.

**New backlog item, logged not scoped — "Apply reasoning to theories and agent's wisdom":**
Diagnosed this session, not built. The extraction half works and is live — every real theory commit
(`MarketIntelligenceScreen.jsx`'s `onCommit`, "Track as Assumption"/"Make Permanent") already calls
Elena (`memory-consolidation`/`reasoner-intent`) unconditionally, and she correctly writes
data-vs-theory reasoning to `the_reasoning` when warranted (18 real active rows, real content, not
test debris — e.g. *"co-op utilization softness in EMEA looks like a partner-onboarding backlog,
not demand-side softness"*). **Everything downstream is missing:** (1) no bifurcation — the schema
has no field distinguishing "this lesson corrects `the_library`'s domain facts" from "this lesson
should improve how an agent itself reasons" (agent's wisdom/Behavior), every row lands in one
undifferentiated table; (2) the one built reuse path, `promoted_to_library_id`, has a 0% activation
rate (0 of 18 active rows ever promoted); (3) no Knowledge Skill searches `the_reasoning` at all,
not even Elena's own — so none of these 18 real lessons reach any agent's prompt today, including
the exact EMEA co-op example above, which Marcus would clearly benefit from and has no path to.
Scope for later: decide the library-vs-wisdom routing, wire actual promotion/inclusion, decide
storage/access shape for the "agent's wisdom" side once it's named. No session claimed.
~~4/5. **Plumbing fields** (`tone`, `confidence`, `notes` — "Standard Traits" per
`SKILL-PROFILE-MODEL.md` §3 — plus `capability_skill_profiles.level`, a "Universal Property")~~ —
**resolved 2026-07-15, John's explicit call: keep all four, wire none in now.** Live data checked:
`tone`/`confidence` populated on 11 of 52 real Skills, `notes` on 10 — sparse but real, not
abandoned. `level` populated on all 52 (2×L1, 35×L2, 15×L3) — fully maintained, just never read
during prompt assembly. Not vestigial — this honors `level`'s own original spec ("L1 General · L2
Trained · L3 Expert · L4 Proprietary") which was already defined, just never wired to execution
behavior. **Later-bucket vision, not this session:** `level` becomes a real execution-depth lever —
a Level 1 Skill runs a shallow/junior pass, a Level 4 runs deep/expert-rigor (e.g. one agent
searches as a junior generalist, another as a highly detailed expert/manager) — with
`tone`/`confidence` likely riding along as part of that same mechanism once designed. No session
claimed.
~~6. Does this doc formally supersede `SKILL-PROFILE-MODEL.md`?~~ — **answered 2026-07-15: neither
   fully supersede nor leave as-is — genuinely mixed, confirmed section by section.** Still
   accurate: the Domain-Agnostic Principle (matches today's Knowledge redefinition word for word),
   the DB schema (Section 6, matches the live schema verified this session), the Sprint Template
   (Section 9, terminology aside). Confirmed stale/wrong today: the Skill Type/Skill Profile split
   language throughout (same error `ARCHITECTURE.md` §2 had), "Five Skill Types" (missing
   Guardrails), and Knowledge's documented type-specific traits (`domain`/`jurisdiction`/
   `source_types`/`source_priority`) — only 1 of 7 real Knowledge rows actually uses that shape; the
   other six use `source`/`match_count`/`data_room_tag`/`intent_allowlist` instead, a pattern this
   doc never caught up to (same drift in Section 10's Knowledge/RAG mapping). **Queued as its own
   backlog item — needs a real update pass (terminology + Knowledge trait-shape correction), not a
   full rewrite and not neglect. Own session, not this one. No session claimed.**
