# Discovery Capture — LOG-38 Signature Model (Layer B) — 2026-07-24 (IN PROGRESS)

**Session:** `design-log-38-0724` · discovery · John live.
**Status:** interim capture. **Not the final deliverable.** At close-out this becomes an **appended**
section in `docs/ARCHITECTURE.md` (do **NOT** rewrite the LOCKED `§19i`; append + cross-reference) plus
a path-scoped rule under `.claude/rules/`. Read-side functional-requirements gathering still in progress.
Supersedes earlier drafts of this file (the "runtime, not stored / no backfill" version was reversed live —
see §2/§5).

---

## 1. What a "signature" IS

- A **signature** = the deterministic, **agent-agnostic** decode key for a *single* `ai_activity_log`
  row: the ordered set of elements that determine which AI pattern(s) that row used.
- Entry key from the log = `ai_activity_log.feature` (the intent slug). `agent_id` is **stripped**.
- **Two zones:** a **config-half** (the envelope — always derivable, agent-agnostic) and a **fact-half**
  (what actually happened — sparse; a null element drops out).

**Elements** (grouped; exact sort *positions* are a build detail — the constraint is "canonical +
deterministic + grouped by zone," skills ordered by `skill_types.display_order`):

| Element | Table.Column | Zone | Built? |
|---|---|---|---|
| intent (anchor) | `ai_activity_log.feature` | bridge | yes |
| capability | `capability_skill_profiles.capability_slug` | config | yes |
| assembled skills | `capability_skill_profiles.skill_profile_slug` → `skill_profiles.slug` / `.skill_type_slug` | config | yes |
| skill traits | `skill_profiles.traits` → `source` / `schema` / `intent_allowlist` | config | yes |
| execution type | `capabilities.execution_type` / `skill_profiles.execution_type` | config | yes |
| tool calls | `call_facts.tool_calls` | fact | `LOG-37`, yes |
| retrieval method | `call_facts.retrieval_method` | fact | `LOG-37`, yes |
| vector chunks returned | `call_facts.retrieved_chunk_ids` (count) | fact | `LOG-37`, yes |
| gated subroutine fired | `call_facts.gated_subroutine_fired` | fact | `LOG-37`, yes |
| input references other deliverable | `call_facts.input_references_other_deliverable` | fact | `LOG-49`, no |
| sub-calls chained | `ai_activity_log.trace_id` + `call_facts.sub_calls_chained` | fact | `LOG-49`, no |
| self-reported claims | `call_facts.self_reported_claims` | fact | `LOG-49`, no |

- **Skill types read: `knowledge`, `intent`, `format` only.** `identity` out permanently (agent-ID,
  0 pattern signal, breaks agent-agnosticism); `behavior` out for now (0 pattern-driving traits today;
  future home for reasoning-pattern traits — revisit only if such a trait is added).
- **`guardrails` is a per-skill *column*, not a skill type** (5 types, not 6). Declared-guardrails is on
  ~100% of skills (no signal); the **Guardrails pattern is decoded from the fact `gated_subroutine_fired`.**
- **Correction (found live 2026-07-24, John's catch):** `LOG-37` captures exactly 4 facts — `tool_calls`,
  `retrieved_chunk_ids`, `retrieval_method`, `gated_subroutine_fired` (verified: distinct `call_facts`
  keys). An earlier draft of this doc listed only the first two; `retrieval_method` (proves a vector
  search *ran* vs a direct lookup) and `gated_subroutine_fired` (proves Guardrails) are **both real,
  needed elements** and are now in the table above. No orphan capture — the doc was incomplete.

## 2. Storage: snapshot the values, derive the name (REVERSES the earlier "runtime, not stored")

- **Signature raw VALUES are snapshotted at write time** (frozen on the row) → the row never drifts;
  it records exactly the facts + config that applied then.
- **The pattern NAME is derived at read time** (live) → renaming a pattern or fixing a rule still flows
  to every row; the false-`rag` still self-cleanses (the frozen values are the correct raw facts; only
  the read-time *name* was ever wrong).
- **Rule: store the ingredients, derive the name.** Storing raw values is fine under `§19i` — it's the
  same kind of thing as `call_facts` (a frozen fact), not a name-mapping that must be kept in sync.

## 3. Merge with LOG-37 — one unified write-time capture (no parallel mechanism)

The signature snapshot **extends `LOG-37`'s existing `call_facts` capture**, it does not sit beside it
("no duplicate functionality"). One write-time capture, three contributors into the same structure:
1. **`LOG-37`'s 4 facts — reuse as-is** (done).
2. **`LOG-49`'s 3 facts — add** (unbuilt; can land any time — see §4's graceful-degradation).
3. **The config-snapshot — new** (assembled skills, traits, `execution_type`) — the genuinely new piece,
   and what makes the snapshot drift-proof. In `§19i` terms this is a new **Layer A** element extending
   `LOG-37`; Layer B (the view) reads the complete snapshot.
- **`LOG-38`'s realization is therefore bigger than "the read-time view"** — it spans (a) extend the
  write-time capture (config-snapshot), (b) the read-time view + naming, (c) the historic backfill. That
  exceeds one coding session's cap, so the **build** splits into an as-yet-undecided number of sessions,
  sequenced at kickoff time — some on existing IDs (`LOG-49`), some new. **Not decided in discovery.**

## 4. Decode model

- A signature → a **SET** of pattern names (a call can be several at once; deduped), **deterministic,
  read-time.**
- **Each pattern declares which element(s) prove it.** Missing/null elements disable exactly the rules
  that need them. Consequences:
  - **History** (fact-half null) asserts only **structural** patterns (config-pinned); contingent ones
    (need a fact) fall out honestly — which is why the false `rag` disappears rather than being replaced.
  - **`LOG-49` not built yet** → patterns needing its 3 facts lie **dormant**; when `LOG-49` ships, the
    write side captures them and the read-time view lights them up **automatically, zero `LOG-38` change.**
    Same mechanism as history — a missing fact is a missing fact.
- **`patterns_used` is IGNORED** for classification — frozen legacy record, never read.
- **Role:** engine emits a role-tagged set — `primary` (the `intent` pattern) + `supporting`
  (`knowledge`/`format`); aggregation flattens it (leaning yes; not locked).

## 5. History & backfill — REVERSES the earlier "no backfill / accept drift"

- **Backfill the historic null signatures** with the signature computed today. For **structural** intents
  (the `LOG-42` anomalies) this is **provable** (`§19i` intent-provability), not a guess — `agent-selection`
  *is* a routing intent, so the intent pins it. This gives every historic row its correct gold name
  (fixes `LOG-42`) **and** freezes it → **no drift.** (Freezing is what *kills* drift, not what causes it —
  the earlier draft had this backwards.)
- **Fact-half stays null on history** (genuinely unrecoverable, `LOG-46`) → contingent patterns (RAG) don't
  over-assert → false `rag` dissolves cleanly.
- **Provenance = date-based, no per-row flag.** A row's `created_at` vs the capture-start date tells us
  observed (captured live) vs derived (backfilled). One date recorded in doc/config; no new column.
  (Precise nuance: facts start at `LOG-37`, config-snapshot at `LOG-38` — two capture-start dates if we
  ever need exactness, still date-based.)

## 6. The connector — a plain Postgres view

- A **plain view** (NOT materialized) joins the row's **stored** signature → rules → gold
  (`pattern_vocabulary`) by **exact-value equality**; signature→slug is `CASE`/`WHEN` or a rules-table
  join on exact keys — **never a semantic match.** The *meaning* is set **once**, when Susan Smith —
  Trainer defines the rule; the view only matches values.
- Once rows carry a stored snapshot, the view **reads the snapshot** rather than re-walking config tables
  at read time — simpler and drift-proof.
- **Refresh: none** — a plain view stores nothing; recomputes live every query; a rule/config change shows
  on the next read. (Materialized = the avoided escape hatch.)
- **Indexing: modest, build-time.** Standard B-tree on the log-side keys (`feature`, `created_at`,
  `agent_id`); config tables are tiny. Not an architecture decision.

## 7. Read-side functional requirements (gathered)

- **When it runs:** read time, on demand. Never at write time (write time only *captures* the snapshot).
- **Summarizing / scale:** aggregate by **distinct signature** (~dozens, bounded by ~29 intents), never
  per-row; `GROUP BY` the ~19K rows onto them; contingent patterns a cheap `call_facts` read in the same
  query. **Compute in the DB**, no stored/materialized summary — the summary IS the live aggregate.
- **What it returns:** per row, a **set** of pattern objects — `slug`, `name` + `definition`/`citation`
  (Layer C `pattern_vocabulary`), `role` (primary/supporting), `evidence` (which element fired the rule).
  Three honest states: governed match / matched-slug-no-Layer-C-entry (`humanizeSlug`) / not-yet-classified
  (fires the promotion trigger). **Two call shapes:** single-row (per-hop drawer) and aggregate (rollup:
  `name` + `count` + `cost_sum`, role flattened).
- **Consumers:** 3 read use cases, **one shared engine** (per-hop `MarketIntelligenceScreen`; aggregate
  `useAIActivity`/`AIActivityPanel`/`useAgents`, `LOG-41`; catalog `AboutPanel`/`aiPatterns`, `LOG-56`/`57`).
  The 6 duplicated files collapse onto it. Heavy aggregation in the DB; a shared module orchestrates.

## 8. Anomalies

- **Dissolved:** `LOG-42` / `LOG-53` / `LOG-59` (false-label class) — historic rows now derive the correct
  gold name from the backfilled signature. `LOG-63` (write-path false-`rag` fix) moot once displays stop
  reading `patterns_used`.
- **Residue (stay tickets):** `LOG-43` (should `capability-registry-knowledge` fire a vector search over
  4 rows — config-correctness); truly-lost task-intent history (honest "not classified").

## 9. Resolved this session (were open earlier in the doc) + still-open

**RESOLVED — do not re-litigate:**
- **Assignment mechanics.** Susan Smith — Trainer (Pattern Definer) defines each gold pattern's structured
  **`criteria`** once — the semantic act happens at definition time. The Log Displayer view then matches
  `signature @> criteria` **generically** (equality/presence; a bounded operator set for `chunks > 0`), no
  per-row AI, no per-pattern code. **Rules are data (criteria on the gold pattern), not code.** New pattern
  = a data insert; the view is untouched. The unclassified-rich-signature trigger (`LOG-68`) feeds Susan.
- **Primary vs supporting.** Yes — the view returns a role-tagged set (`primary` = the `intent` pattern,
  `supporting` = `knowledge`/`format`); aggregation flattens the role.
- **Config-drift on history.** Resolved by snapshot + backfill (freeze). A structural intent that genuinely
  drifted between old runs and backfill-time is frozen at the current-config best guess (provable ones) or
  left "not classified" (non-provable) — accepted, per-anomaly if ever material. No config-versioning built.

**STILL OPEN (kept as questions, not tickets):**
- **Identity/behavior fallback** — if a real case shows the signature can't disambiguate, add the agent +
  its `identity`/`behavior` skills to infer intention. Use-only-if-needed; reintroduces agent-specificity;
  possible future item, **not a ticket yet.**
- **Exact signature sort sequence** — deterministic/grouped is locked; exact element positions are a
  build-time detail, deliberately not fixed here.

## 9b. Tickets claimed 2026-07-24 (all `LOG-`, atomic from `feature_id_counter`)

Naming (John, this session): drop "Layer A/B/C" → **Log Writer** / **Log Displayer** / **Pattern Definer**;
call backlog IDs **tickets**. POC runs FIRST to de-risk / catch missed requirements before the build.

| Ticket | Piece | New/Enhance | Depends on |
|---|---|---|---|
| `LOG-64` | POC 1 — prove signature→pattern join | new (spike) | — (run first) |
| `LOG-65` | POC 2 — anomaly + requirements validation | new (spike) | `LOG-64` |
| `LOG-66` | Pattern Definer — `criteria` field + Susan flow | enhance `AI-35 2a` | — |
| `LOG-67` | Log Writer — config-snapshot capture | enhance `LOG-37` | — |
| `LOG-68` | Self-maintenance trigger + `source_ai_activity_log_id` | new | `LOG-38` |
| `LOG-69` | Historic signature backfill (John-authorized) | new | `LOG-67` |
| `LOG-38` | Log Displayer view (narrowed to this) | new (core) | `LOG-66`+`LOG-67` |
| `LOG-70` | Rewire the 6 consumers | new | `LOG-38` |
| `LOG-49`/`40`/`41` | remaining facts / cutover / rollups | existing | per chain |

Written up: `ARCHITECTURE.md §19k` (model), `.claude/rules/ai-pattern-signature.md` (constraints),
`FEATURES.md` (7 new rows + `LOG-38` narrowed + `LOG-42`/`AI-35` pointers), `CLAUDE-STATE.md`.

## 10. Doc / memory drift found (fix at close-out)

- **`skill_types` = 5** (`identity`, `behavior`, `knowledge`, `intent`, `format`). `guardrails` is a
  per-skill **jsonb column** on `skill_profiles`, populated on ~100% of skills — so it has zero
  discriminating power in a signature (the Guardrails pattern is decoded from the *fact*
  `gated_subroutine_fired`). This **confirms** the drift already noted in Claude memory
  `feedback-skill-capability-agent-model` (which knows `skill_types` is a 5-row lookup and flags the
  guardrails-as-6th-type drift); this session just verified it fresh and pinned the "column, not type"
  characterization. No memory correction needed — it already carries the nuance.
