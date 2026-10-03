<!-- DeepBench v7.0.716 | harvest | SCA-4 | cycle 22af13eb-813e-450f-a135-71604da4a59a | Designer premise revalidation and design reasoning, 2026-09-29 -->
# SCA-4 -- premise revalidation: ALIVE on its cost half, DEAD on its truncation half

## Verdict
Kickoff written. The ticket's structural claim holds live: `library-catalog-intent`'s output schema still requires a top-level `citations` array as its last field while its `method` still requires the same ids inline in `answer`, and every completed output carries both. The ticket's second argument -- that truncation eats the array first -- is no longer true and is not the reason for the change: `HAR-9-done` raised `max_tokens` 1500 -> 3000 and `HAR-9` added the concision retry, and no truncation has been recorded since. The fix is a data-only Skill edit under rule `AGENT-ROW-AGREED-TICKET`'s second limb, the `AGT-155` shape.

## Live measurements (Supabase via MCP, 2026-09-29; file:line on session clone `0277a86`)
1. `skill_profiles` where `slug='library-catalog-intent'`: `skill_type_slug=intent`, `llm_model=claude-haiku-4-5-20251001`, `max_tokens=3000`, `temperature=0`, `output_desc=NULL`, `traits.schema = {type:object, required:["answer","citations"], properties:{answer:{type:string}, citations:{type:array, items:{type:string}, description:"the_library [id: ...] values referenced in the answer"}}}`, `traits.handler='store'`. `method` (469 chars) ends: "Cite the [id: ...] value of at least one representative entry per category you mention."
2. The schema is assembled into the tool definition by `api/prompt/db-assembly.js:310-314` (`if (traits.schema)` -> `format_contract.schema`) and `injectAccountField()` (`db-assembly.js:110-123`) appends `account` at runtime, so live `required` becomes `["answer","citations","account"]`; `citations` is the last model-authored field.
3. `durable_hops` where `intent_slug='library-catalog-intent'`: 33 rows -- `failed` 16 (first 2026-07-20, last 2026-08-01), `in_progress` 12 (stale, 07-08 -> 07-17), `complete` 5 (07-17 -> 07-31). Zero hops since 2026-08-01.
4. The 5 complete rows, newest first (`result->'content'`): array length / array text chars / inline `[id: uuid]` regex matches / array ids also present in the answer text / output_tokens / cap:
   - `702f519a` 07-31: 23 / 920 / 26 / 22 / 2626 / 3000
   - `5738120f` 07-28: 22 / 880 / 12 / 14 / 1822 / 3000 (8 array ids never cited in the answer; the answer used a "[id: a through b]" range, off the schema's own description)
   - `84afcaee` 07-20: 4 / 160 / 4 / 4 / 1103 / 1500
   - `0152c417` 07-20: 6 / 240 / 6 / 6 / 893 / 1500
   - `5fe5f32c` 07-17: 2 / 80 / 2 / 2 / 867 / 1500
   Token cost is an estimate from chars (a 36-char UUID is roughly 20-25 Haiku tokens): ~500 of 2626 and ~480 of 1822 on the two post-cap rows, i.e. roughly a fifth to a quarter of the output. Not measured per field -- the log records whole-call tokens only.
5. Failures: 15 at cap 1500 are the `HAR-9` truncation class (`Parse failed and retry also failed ... missing required field(s): citations` / `truncated at the model's max_tokens limit before required field(s): answer, citations`); the one post-cap failure (`1378cfd5`, 2026-08-01, cap 3000) is `The operation was aborted due to timeout`. Post-cap: 0 truncations.
6. `ai_activity_log` where `feature like '%library-catalog-intent%'`: 389 rows, first 2026-07-08, last 2026-08-08, p50 output 822.5, max 5269. Eleanor's last call on any intent: 2026-09-29 08:19Z -- the agent is live; this intent is dormant.
7. `deliverables` where `skill_profile_slug='library-catalog-intent'`: 389 rows, 0 with `task_id`. `ai_activity_log` rows for the feature carrying `call_facts.self_reported_claims.citations`: 38; carrying `retrieved_chunk_ids`: 12.
8. `agents`: eleanor `lane=product`, `is_active=true`; marcus `product`/`true`; jerry (the AGT-155 precedent) `personal`/`true`. `backlog_items.SCA-4.scope_origin` = NULL. `reversible_tables()` includes `skill_profiles`. `record_decision(p_cycle_id uuid, p_session_name text, p_kind text, p_backlog_id text, p_summary text, p_reasoning text, p_ladder_work_class text)`. `runner_before_images` columns: id, created_at, cycle_id, table_name, pk_value, row_data, session_name, decision_id.
9. `model_assignments`: lane orchestrator -> `claude-opus-5`, judgment -> `claude-fable-5-1`, mechanical -> `claude-sonnet-5`; capability `data-room-custody` -> `claude-haiku-4-5-20251001`. `scripts/verifier.js:2000-2006` (`kickoffBuilderModelFinding`) requires the kickoff's Model line to carry the orchestrator model.
10. `class_autonomy('P9 - Bug Fixes')`: rung 1, extra_files 0, extra_tasks 0 -> caps 3 / 4.

## The downstream trace the ticket asked for (readers of Eleanor's `citations` array)
- **Marcus (`ci-answer-intent`), the only consumer of the value.** `api/capabilities/execute.js:1121-1123` folds the ENTIRE delegate result into his `tool_result` as `JSON.stringify(delegateResult)`. His `method` (read live) for CATALOG/INVENTORY QUESTION says: "write your own answer citing the real [id: ...] values you were given and set confidence_tier: sourced yourself" -- it names the inline markers, never a `citations` field. His own schema keeps its `citations` (`chunk_id values the answer draws on`); that is his output, not hers.
- **`store` handler** (`api/_lib/handlers/store.js:16-47`) writes the whole `content` object to `deliverables`. No reader of `deliverables.content.citations` by this slug exists; `src/components/RunTasks.jsx:189` counts `d.citations` on the `qa_answer` EVENT (Marcus's answer), not on a deliverable.
- **LOG-49 self-reported claims** (`api/prompt/request-receivable.js:920`, `SELF_REPORTED_CLAIM_FIELDS` includes `citations`; extracted at `:1433` and `execute.js:1356`) -- a capture of what the model DECLARED, quarantined, "never trusted alone". With no declaration there is nothing to capture; `api/prompt/ai-enrichment.js:226-227` renders `SELF-REPORTED CLAIMS ... (none recorded)` -- honest absence (pattern:34). The fact-half (`retrieved_chunk_ids`) is untouched.
- **LOG-54 `extractEmptyDeclaredSections`** (`request-receivable.js:1440`) reads the declared schema; a removed field is no longer a declared section.
- **`parseModelTurn`** (`request-receivable.js:429-436`) enforces `required` from the schema tool; with `citations` gone from `required`, the `missing required field(s): citations` error class (15 recorded rows, all pre-cap) can no longer occur.
- Tests: `tests/regression/LOG-70-agent-summary-column-set.js:87` and `LOG-112-drawer-pattern-source.js:95` use the feature string as a fixture only. No test asserts the schema. No tracked doc restates it (`git grep -F 'the_library [id: ...] values referenced in the answer'` -> 0 files outside kickoffs/harvests).

## Alternatives weighed
- **Harness regex derivation** (the ticket's "mechanically derivable" hint made into code: a data-gated trait that fills `citations` from `answer` after parse). Rejected: no reader wants the array (above), so it preserves nothing anyone reads; it touches `request-receivable.js`, one of the four harness files §19v P8 gates for an automated cycle; and it would put a deterministic value into `self_reported_claims`, mislabelling a fact as a claim (pattern:32). pattern:8, pattern:65, pattern:67.
- **Method rewrite** ("your inline ids are your citations"). Not needed: with the property gone from the tool schema the model has no field to fill. pattern:90 -- no unrequested wording.
- **Drop `required` only, keep the property.** Rejected: an optional property in the tool schema is still emitted most of the time; the cost the ticket names would persist.

## The gate, and why this is build work
§19v P6: no unattended edit to an active agent's Skills EXCEPT under rule `AGENT-ROW-AGREED-TICKET` -- `scope_origin='john-named'` OR an unreversed `runner_decisions` row naming both the ticket and the change, written with its own before-image under one handle. `scripts/agent-row-gate.js:229-241` judges on `scope_origin` alone and says so ("an unreversed runner_decisions row naming this ticket AND this change would still make it build work"). `AGT-155` (`docs/design/agt-155-competitors-intent-leads.sql`, cycle `5a3d7118`) shipped exactly this: `record_decision(... 'agent-row', 'AGT-155', ...)` + `runner_before_images` of the `skill_profiles` row + the UPDATE + a DO block asserting the end state and the pre-state image. The Designer's own call is recorded there (JOHN-0925-DESIGNER-DECIDES), reversible 72 h. The rule's list names identity/behavior/knowledge/guardrails rows; an intent row is a Skill row of an active agent and the P6 blast-radius reasoning applies identically, so the same handle is used rather than arguing the list.

## Why the executor arm, and its bound
The intent has had no live call in 52 days, so nothing but a call shows the new contract's output. One direct `runCapability()` call on `data-room-custody`/`library-catalog-intent` (Haiku, temp 0, cap 3000) costs about $0.02 and proves the three things the ticket is about: inline ids still present, no array, tokens below the cap. Marcus's end-to-end chain is proven statically (his method text) and not spent on -- a full CHI chain runs Michelle, Eleanor, Owen and a display hop for a claim the static trace already settles. Band `$0-1`; the arm sits behind `SCA4_LIVE_EXECUTOR=1` per STANDARDS §2 rule 5 (credentials are not spend).

## Residue (evidence only; this turn writes no tables)
- `library-evidence-intent` (read live): `required = ["evidence","citations","account","citation_types"]`, ids inline in `evidence` "preserved EXACTLY", again in `citations`, again in `citation_types` -- and Marcus's method says "the caller reads citation_types first". Three emissions of one list, the middle one unread by name. Same shape as this ticket; a separate row if wanted.
- The 07-28 row's 8 array-only ids: the schema said "referenced in the answer", so those were off-contract; the method's "at least one representative entry per category" is the bar that matters and the inline text meets it.

## Revival test for the truncation half (already dead)
Any `durable_hops` row with `intent_slug='library-catalog-intent'`, `llm->>'max_tokens'='3000'` and error containing `truncated at the model's max_tokens limit`. Count today: 0.

## Patterns applied
1, 8, 10, 32, 34, 64, 65, 67, 85, 90, 92, 95, 96, 102, 162, 164, 168.
