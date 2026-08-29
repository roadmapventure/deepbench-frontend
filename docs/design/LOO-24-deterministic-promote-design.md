<!-- DeepBench v7.0.302 | docs/design/LOO-24-deterministic-promote-design.md | cycle 5b58c153 —
     GATED-BEFORE-BUILD PROPOSAL, NOT A DELIVERY. Nothing in this design was implemented. It exists
     because LOO-24 lands in §19v's gated lane on THREE independent triggers (below), so an
     unattended cycle may "diagnose, write the diff, and prove it" but may never ship it. Written to
     the repo rather than left in a card because the analysis is ~150k tokens of file:line
     verification that would otherwise die with the cloud container and be re-derived by the next
     cycle — the same waste SES-114 is written from. Design produced by a Fable 5 subagent per the
     model-discipline rule (register B21); the three gate triggers were re-verified independently by
     the orchestrating cycle against ARCHITECTURE.md and live Supabase before this file was written. -->

# LOO-24 — Deterministic data-patch promote (design proposal)

**Ticket:** `LOO-24 — Make the data-patch Accept/promote deterministic instead of model-orchestrated`
**Cycle:** `5b58c153-f1ea-452c-8d59-67855d5bdbd2` · **Version:** v7.0.302 · **Status:** proposal awaiting John
**Predecessor:** `docs/kickoffs/v6.3.157-LOO-23-promote-accept-reliability.md`

---

## 0. Why this is a proposal and not a ship

LOO-24 is in the gated lane on **three independent triggers, each singly sufficient**. Verified this
cycle against the live files, not recalled:

1. **The four harness files.** The wiring change touches `api/prompt/request-receivable.js`.
   `docs/ARCHITECTURE.md:2608` names it as one of the four; `:2615-2617` puts "the four harness
   files" in **"the gated lane (never unattended, no trust rung ever unlocks it)"**.
   `.claude/rules/capabilities-are-data.md` states the mirror for this exact case: *"removing
   determinism from these four files is gated — an Automated-mode session may diagnose and draft the
   diff, but it lands as a proposal for John, never an unattended ship."*
2. **Edits to active agents.** The data half retires an active agent's capability assignment.
   Read live this cycle: `agents.is_active` is `true` for both `nadia` and `eleanor`. Same gated-lane
   sentence, `ARCHITECTURE.md:2617`.
3. **A LOCKED-section supersession.** `ARCHITECTURE.md:1248` (§19f) states, LOCKED: *"§19d's Agent
   Loop mechanism (`request_help`, `on_accept_intent_slug`) is unchanged — promotion still uses it
   exactly as built."* This design supersedes that sentence.

`ARCHITECTURE.md:2617` also closes the question for anything borderline: **"Uncertain classification
→ gated, always."**

---

## 1. Premise revalidation — ALIVE

Verified against live code and live Supabase this cycle (step 6's pick-time revalidation).

**(a) The promote is still model-orchestrated.**
`api/capabilities/execute.js:2132-2177` — `resolveAccept()` looks up
`getOnAcceptIntentSlug(row.intent_slug)` and, when set, dispatches
`runCapability({ intent_slug: onAcceptIntentSlug, task_context: row.proposed_action,
handler_context: { chunk_id: row.proposed_action?.chunk_id ?? null } })` (`:2147-2160`).
`runCapability` is the model loop; there is **no deterministic-execution branch** in `execute.js`
(`execution_type` is read only for logging signatures, `api/prompt/db-assembly.js:571-578`).
`getOnAcceptIntentSlug()` (`api/_lib/handlers/confirmation.js:131-140`) reads
`skill_profiles.traits.on_accept_intent_slug` **live at accept time**.

Live Supabase: `data-patch-intent` carries `requires_human_confirmation: true` and
`on_accept_intent_slug: "data-patch-execute-intent"`. `data-patch-execute-intent` carries
`can_request_help: true`, `execution_type: 'ai'`, `llm_model: claude-sonnet-4-6` (LOO-23's model
swap, still in place), handler `reasoning-write`. Its `traits.analysis_instructions` still instructs
the model in prose: chunk_id present ⇒ two `request_help` asks (insert-superseding, then status
update); chunk_id null ⇒ one ask, "Do NOT supersede". **Insert-vs-supersede is decided by a model
following prose** — the ticket's premise exactly.

**(b) `proposed_action` shape.** Persisted by `insertPendingConfirmation()`
(`confirmation.js:41-57`) from the consequential-action gate at `execute.js:1374-1379` as
`proposed_action: turn.tool_input`. Live keys across the 8 most recent `data-patch-intent` rows:
`action` (`promote`/`no_action`), `content`, `chunk_id`, `confidence`, `version_note`.
**`chunk_id` is present-and-null on all 8** — the null-chunk case is the live-dominant case, not an
edge. `handler_context: { chunk_id }` is derived server-side (`execute.js:2157`, the AGT-37
fact-not-model-retype rule) and consumed at `api/_lib/handlers/reasoning-write.js:50`.

**(c) The stray supersede is still reachable.** The only thing preventing it is prose in
`traits.analysis_instructions`. This repo's own record says instruction-only fixes lose to this
class — `reasoning-write.js:36-38`: *"Two instruction-only fixes have now lost to this class"*, and
the `docs/harvests/AGT-37.md` it cites forbids a third wording. When the model fires it anyway:
model's second delegation → Eleanor's `library-write-intent` → `api/_lib/handlers/library-write.js:16`
→ `writeLibrary` `update_status` branch, where LOO-23's UUID guard (`lib/librarian.js:658-662`)
returns `denied-row-not-in-data-room` and `library-write.js:26-29` converts it to a graceful 422.
**Reliability-hardened, not deterministic** — precisely as filed.

**Additional drift found, which strengthens the ticket.** The execute intent's live instructions
still command the **deprecated** two-step insert + `update_status`, while Eleanor's live
`library-write-intent` schema (DAT-11; `operation` enum `["insert","update_status","supersede"]`)
says *"Use `supersede` — never `insert` followed by `update_status`"*. The model orchestration is
running against a stale contract, so the two half-write hazards DAT-11 closed (lone flip / lone
insert, both found in production data — `lib/librarian.js:34-42`) are still open on this path.

---

## 2. The exact code path (Accept click → Supabase write)

1. **Accept** — `src/components/SharedUI.jsx:629` (`resolve("accept")`; also
   `src/components/AgentNetwork.jsx:1717,1937`) → `src/screens/MarketIntelligenceScreen.jsx:4694` →
   `resolveConfirmation()` (`:1612-1627`) → `POST /api/capabilities/execute`
   `{ action:"resolve", confirmation_id, resolution:"accept" }` (`:1616`). CHI's equivalent:
   `src/hooks/useHarnessStream.js:389-413`.
2. **Route** — `api/capabilities/execute.js:2217` → `:2250-2255` accept branch → `resolveAccept()`.
3. **`resolveAccept()`** — `execute.js:2132-2177`; `getOnAcceptIntentSlug('data-patch-intent')`
   returns `data-patch-execute-intent`; `runCapability()` on Sonnet with
   `task_context = row.proposed_action`, `handler_context = { chunk_id }` (`:2147-2160`).
4. **Model orchestration** — Sonnet loop emits `request_help` → `dispatchDelegation()`
   (`execute.js:829`) resolves `project-manager` (`resolveCapabilityHolder`, `:488`), runs
   Michelle's `agent-selection-intent`; candidates return as a tool result (`:966-967`).
5. **Delegation to Eleanor** — model emits `delegate_to_agent` → `execute.js:968-1009` →
   `runCapability(library-write-intent, agent 'eleanor')` (Haiku). For a with-chunk promote steps
   4–5 run **twice** — 4 hops of `MAX_LOOP_DEPTH=5`.
6. **§19c broker** — Eleanor's structured output → `sendRequest()` → `HANDLERS` registry
   (`api/prompt/request-receivable.js:68`), slug from `format_contract.handler` (`:911`) →
   `api/_lib/handlers/library-write.js:16` → `writeLibrary()` (`lib/librarian.js:497`; insert `:536`,
   supersede `:590`, update_status `:648`) → PostgREST → `the_library`.
7. **Nadia's reasoning row** — execute intent's terminal output → `reasoning-write.js:22` →
   `writeContent(store:'the_reasoning')`.
8. **Close-out** — `markAcceptedDelegated()` (`confirmation.js:145-153`) → DAT-003 stamp
   `stampLibraryConfirmation()` (`:23-35`) → `recordLibraryConfirmation()` (`lib/librarian.js:452`).

---

## 3. Proposed design

**The deterministic seam already exists — this design rides it rather than adding machinery.**
`resolvePendingConfirmation()` (`confirmation.js:103-123`) — the accept path for intents *without*
`on_accept_intent_slug` — calls `sendRequest()` with `precomputed_turn: row.proposed_action`, which
makes **zero model calls** (`request-receivable.js:943-955`) and dispatches straight to
`format_contract.handler`. Handler results (`entry_id`) surface on the top-level response
(`:1189-1193`), so DAT-003's stamp keeps working through its Path 1.

- **T1 — new file `api/_lib/handlers/data-patch-promote.js`.** Mirrors the `library-write.js` /
  `reasoning-write.js` idioms. Exports a **pure** `decidePromoteOps(proposed_action)` plus async
  `handle()`. Logic: `action:'no_action'` → no-op; `action:'opinion'` → `writeContent` to
  `the_reasoning` only; `action:'promote'` → if `chunk_id` is UUID-shaped, **one**
  `writeLibrary({operation:'supersede', supersedes_id: chunk_id, …})` (DAT-11's atomic op — strictly
  better than the current two-step; `checkSupersedeTarget`, `librarian.js:185-197`, already enforces
  real/resolvable/same-room and denies gracefully); if `chunk_id` is null/absent/malformed, **one**
  `writeLibrary({operation:'insert'})`. **There is no code path to a supersede in the null case** —
  the hard constraint is satisfied structurally, not by instruction. Then `writeContent` the
  reasoning row with `source_chunk_ids = [chunk_id]` iff real, else `[]`.
  §19c is preserved: writes go through the `writeLibrary()` broker export, reached exactly as
  `library-write.js` and DAT-003's `recordLibraryConfirmation` already reach it
  (`librarian.js:449-451` blesses this pattern). Credentialing runs as the confirmation row's
  `agent_id` (`nadia`; verified live `data_room_access: ['apple-cso-data-room']`, granted at
  `librarian.js:519-520`). Hardcoding `'eleanor'` in code is banned (Rule #1) and naming her in
  Nadia's data is banned ("no agent's data ever names another agent").
- **T2 — `api/prompt/request-receivable.js`.** One import + one `HANDLERS` entry (`:53-68`).
  **This is the only harness-file touch, and it is trigger #1 of the gate.**
- **T3 — Supabase data migration.** On `data-patch-intent` set `traits.handler =
  'data-patch-promote'` (becomes `format_contract.handler` via `db-assembly.js:283/348`) and
  **delete** `traits.on_accept_intent_slug`; retire `data-patch-execute-intent` by dropping its
  `capability_skill_profiles` link. The model orchestration is **deleted, not paralleled** — so no
  flag and no removal condition.
- **T4 — `tests/regression/LOO-24-deterministic-promote.js`.**

**Compatibility hazard that must be handled in the same migration — this is a John decision.**
~8 currently-`pending` `data-patch-intent` confirmations carry a frozen `prompt_request.format_contract`
with handler `'store'`. After the flip, accepting one would write a bogus deliverable instead of the
library row. The migration must expire/reject those stale pending rows, or John drains them first.

**Draft-path safety.** The new handler can never fire on the draft: the confirmation gate returns
*before* `sendRequest()` (`execute.js:1314-1391`). Edit re-runs the draft intent and re-gates
(`execute.js:2224-2244`). Reject is unchanged.

**Scope:** 3 repo files + 1 data migration, 4 tasks — within the caps.

**Deferred, and named rather than buried:** the `ARCHITECTURE.md` §19f amendment. The design
supersedes a LOCKED sentence and shifts the promote's write attribution from Eleanor-executed to
Nadia-credentialed-through-Eleanor's-broker — a LOCKED supersession plus a §19e-gatekeeper semantics
question. That belongs to the attended sign-off, not to the coding slice.

**Exposure rule:** a pure fix — no approved surface changes appearance; Accept does what it was
already supposed to do — so it would ship **live, no flag** (a flag here would be the LOO-013
vacuous-fix shape). Exposure is not the binding constraint here; the gated lane is.

---

## 4. QA plan (discriminating — each with its negative control)

- **Q1 — pure, runs anywhere.** Import `decidePromoteOps`. Assert: null / absent / `"none"` /
  non-UUID `chunk_id` → exactly `[{op:'insert'}]` with `source_chunk_ids: []`; UUID `chunk_id` →
  exactly `[{op:'supersede', supersedes_id}]`; and across a fuzzed sweep `'update_status'` never
  appears in any op list. *Negative control:* the import fails outright if the change did nothing —
  though it could still pass with the handler present but unwired, which is why Q2/Q3 exist.
- **Q2 — wiring.** Static half: assert `'data-patch-promote'` is a key in the `HANDLERS` literal in
  `request-receivable.js`. Credentialed half: SQL-assert `data-patch-intent.traits.handler =
  'data-patch-promote'` and `on_accept_intent_slug` absent, and `data-patch-execute-intent` no longer
  assigned. *Negative control:* both fail verbatim against today's live state (verified — handler is
  unset, `on_accept` present), so a do-nothing change cannot pass.
- **Q3 — SEAM PROOF (labelled as such).** Imports the repo's own `resolvePendingConfirmation` from
  `confirmation.js` against real Supabase; declares not-run without credentials, per the
  DAT-011 / SES-180 convention. Seed a synthetic pending row (null-chunk promote, new-format
  `prompt_request`), drive accept. Assert: exactly one new `the_library` row
  (`data_type:'consolidated'`); **zero** `librarian-write:update_status` / `:supersede` log rows in
  the window; **zero** `agent-turn` rows for the accept — that last one is the discriminating
  assertion, because today's path always logs Sonnet turns; and the DAT-003 stamp populated.
  With-chunk variant: seed a target, assert one `librarian-write:supersede` row, old row
  `status='superseded'`, new row `supersedes_id` = old id. *Negative control:* run today's path
  against the same assertions — the agent-turn-count and `update_status` assertions fail.
- **Cannot be proven unattended:** the real CHI/MI click against the deployed dev preview
  (LOO-23 did this with `x-vercel-protection-bypass`; whether that token reaches a cloud session is
  **not verified**), and the stale-pending-row drain decision.

---

## 5. Recommendation

**Do not ship unattended.** Three gated-lane triggers, each singly sufficient, and the urgency is
genuinely low: LOO-23 already reduced the failure mode to a rare *graceful denial*, whose worst
current cost is an unnecessary-but-denied supersede. Against that, a botched flip — the stale
pending rows alone — would break the exact Accept button John personally reported, overnight, with
nobody watching. The ticket itself anticipated this: *"Needs design — touches the `request_help`
orchestration and the gatekeeper."*

The next cycle to pick this up should start from §3 and needs John's answers to two things: the
stale-pending-row disposition, and the §19f LOCKED amendment.
