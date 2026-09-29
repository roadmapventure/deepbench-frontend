# CHI-83 — harvest (design cycle `e71c1a40-6b99-4113-bef4-01a75132469a`, 2026-09-29, v7.0.714)

Reasoning and measurements behind `docs/kickoffs/v7.0.714-CHI-83-chi-vocabulary-guardrail.md`. Not required reading for the build; every fact a task depends on is in the kickoff.

## 1. Premise revalidation — alive

The ticket's claim: Marcus's model-generated text says "thesis"; the screen sweep (`CHI-82`) cannot reach it; the fix is a vocabulary constraint in the CHI intents' Supabase instructions. Checked live 2026-09-29 with the service key (REST over `skill_profiles`, `capability_skill_profiles`, `ai_activity_log`).

**Screen side is done, model side is not.** `src/screens/MarketIntelligenceScreen.jsx:119` carries the `S-CHI-82` stamp (v6.3.162): fixed drawer titles, `.claude/rules/chi-vocabulary.md` in force for the screen. The ticket's premise is entirely on the Supabase side.

**The live rows still instruct in the retired nouns.** Quoted verbatim from the rows read this cycle:

- `hyp-generation-intent.objective`: "generate 2-4 distinct competing **hypotheses** that could explain it." `method`: "Propose **hypotheses** that are genuinely different explanations…". Schema key `hypotheses[]` (`id`, `text`, `rationale`) — `text`/`rationale` are what the Theories drawer shows.
- `hyp-hypothesis-test-intent.objective`: "Given a **hypothesis** the user selected or wrote, stress-test it…" — `supports`/`complicates`/`consider` are the Theory Result text.
- `hyp-identity.method`: "propose **hypotheses** genuinely grounded…"; `hyp-behavior.traits.writing_style`: "States each **hypothesis** as a distinct, falsifiable claim…".
- `ci-routing-intent.method`: "Extract a **candidate hypothesis** if the user wrote a claim unprompted" — schema key `extracted_hypothesis`.
- `ci-answer-intent`, `ci-submission-ack-intent`, `ci-resolution-ack-intent`: say "theory" themselves, but no row anywhere states the single vocabulary or bans the retired nouns. Nothing stops "thesis" from appearing in a generated sentence.

A platform-wide `ilike` over `objective`/`method`/`traits.analysis_instructions` for `thesis|hypothes|candidate` returned 31 rows; the ones on the two CHI-facing capabilities are the six above.

**Intervening ships checked:** no `runner_decisions` row names CHI-83 beyond its 2026-09-09 classification and two 2026-09-29 `leverage` marks (AGT-238). No `skill_profiles` row with a slug or name matching `vocab`. `platform-language-guardrail` (AGT-44, 2026-07-29) is the only guardrails-type Skill on these capabilities and says nothing about nouns. Premise alive.

## 2. Enumeration — the rows the ticket pointed at versus the rows that matter

The ticket names "the `ci-routing`/`ci-answer`/hyp-flow intent rows" as a pointer. Live `capability_skill_profiles`:

- `channel-intelligence` (Marcus, `is_active true`, lane product): `ci-identity`, `ci-behavior`, `ci-routing-intent`, `ci-answer-intent`, `ci-answer-display-intent`, `ci-submission-ack-intent`, `ci-resolution-ack-intent`, `platform-language-guardrail`.
- `hypothesis-evaluation` (Priya, `is_active true`, lane product): `hyp-identity`, `hyp-behavior`, `hyp-knowledge`, `hyp-generation-intent`, `hyp-hypothesis-test-intent`, `hyp-hypothesis-test-display-intent`, `platform-language-guardrail`.

Which intents write text the user reads (from the screen's own call map, `MarketIntelligenceScreen.jsx:761-764, 1769, 1921, 4620, 4703`):

| intent | user-facing prose? | calls (all time / since 08-30) | in the new allowlist |
|---|---|---|---|
| `hyp-generation-intent` | yes — Theories drawer | 240 / 0 | yes |
| `hyp-hypothesis-test-intent` | yes — Theory Result | 348 / 0 | yes |
| `ci-answer-intent` | yes — Analysis | — / 17 | yes |
| `ci-submission-ack-intent` | yes — "…is now being tested" ack | 39 / 0 | yes |
| `ci-resolution-ack-intent` | yes — resolution ack | 14 / 0 | yes |
| `ci-routing-intent` | no — enum + the user's own claim, pre-filled never generated | — / 1 | **no** (AGT-54) |
| `ci-answer-display-intent` | no — `request_help`/`delegate_to_agent` only | — / 4 | no |
| `hyp-hypothesis-test-display-intent` | no — same | — | no |

The ticket's screenshot sentence — "your India and SE Asia concentration **thesis** is now being tested" — is the submission ack's exact job ("acknowledging it … noting that Priya is now testing it"). The ticket's own list would have missed the row that most likely produced the defect. That is what the "enumerate live" instruction was for.

## 3. The mechanism chosen, and the alternatives

**Chosen: one `guardrails`-type Skill row, allowlisted per intent, attached to both capabilities.** `api/prompt/db-assembly.js:399-411` renders `sp.guardrails` (array of strings, one per line; also accepts `{must, must_not}`) into `=== CONSTRAINTS & GUARDRAILS ===`, `SKILL_ORDER.guardrails = 4`, before INTENT (5). Lines 171-175 (AA-121, hoisted AGT-54) skip any Skill whose `traits.intent_allowlist` does not include the call's `intent_slug`. That is exactly how `platform-language-guardrail` reaches `ci-answer-intent` and the three `hyp-*` intents today. Zero code (pattern:8, §19b), one home for the rule (pattern:14), the Skill type built for a must-not (pattern:136), the structure that already fits (pattern:17). Reversal is a delete of three rows.

Unchanged-tree renders through `scripts/agent-prompt.js` (the executor's own `assemblePrompt()`, no model call): marcus/`ci-submission-ack-intent` → sections ROLE & IDENTITY, BEHAVIOR, INTENT, TASK DETAILS, VOICE — no CONSTRAINTS section at all; priya/`hyp-generation-intent` → CONSTRAINTS present with AGT-44's four lines, 9 lines containing "hypothes", 0 lines saying "Never write hypothesis".

**Rejected A — append the rule to the five intent rows' `method`.** The ticket's literal wording. Five copies of one rule on five active-agent intent rows (pattern:14/15 against it), five full-row before-images, and a rule that then sits *inside* the instruction that says "generate hypotheses" — contradiction in the same paragraph. Also touches `ci-routing-intent`, whose prompt AGT-54 showed is sensitive.

**Rejected B — append to `platform-language-guardrail`.** Its allowlist also covers Nadia's `data-*` intents, where "candidate" may be a legitimate word; its text is the AGT-44 business-content standard and `tests/regression/AGT-44-platform-language-guardrail.js` B3 pins that row's shape; pattern:166 says append never rewrite, but a separate row keeps the reversal clean and the two standards separately reversible.

**Rejected C — rewrite `hyp-identity`/`hyp-behavior`/the intents to say Theory throughout.** The schema keys (`hypotheses`, `extracted_hypothesis`) are read by `execute.js` and the screen; renaming them is a code change and out of this ticket. Guardrail string 3 draws the line instead: field names stay, the words never reach user text. If a later measurement shows the models still leak the noun, the next step is structural (pattern:10 — never a third wording), e.g. a deterministic post-write substitution in the display path, filed as its own ticket.

**Why `ci-routing-intent` is out.** `db-assembly.js:36-38` and `:162-175` record AGT-44b/AGT-54: `platform-language-guardrail` reaching `ci-routing-intent` "skewed its answer — proven live, deterministic 3/3 both directions"; the HAR-30 fix scoped `ci-identity`/`ci-behavior` away from it for the same reason (AGT-44 test B5). The routing call emits `{intent, confidence, extracted_hypothesis}`; `extracted_hypothesis` is the user's own words pre-filled, never generated prose. A vocabulary rule buys nothing there and risks the classification.

## 4. Governance — who may write these rows

Both agents are active product agents. `.claude/rules/agent-roster-inert.md` and `public.governance_rules.AGENT-ROW-AGREED-TICKET` (read live): editing an active agent's guardrails rows or creating `skill_profiles`/`capability_skill_profiles` rows "is build work under the ticket that names it and takes no approval card, when that ticket carries `scope_origin = 'john-named'` or an unreversed `runner_decisions` row names both the ticket and the change; every such row is written with its own `runner_before_images` row (`row_data` NULL for an INSERT) under one decision handle."

CHI-83's `scope_origin` is NULL. The second limb is the live practice: `MANAGER-AUTHORITY-MATRIX` row 1 records the Builder's `dm-knowledge-cycle-card` re-pins as "an agent-row decision with a full-row before-image (AGENT-ROW-AGREED-TICKET, second limb): the manager's, never a card, never John's" — 16 unreversed by 2026-09-20, the latest `c16f4e8c` on 2026-09-29. `AGT-154`'s seed (decision `54a37934`, 2026-09-28) inserted 12 rows including seven `capability_skill_profiles` under one `agent-row` handle with `row_data NULL` images, reasoning "An agreed ticket's seed is build work with a before-image, not a card". John agreed to this ticket in the attended discovery `ui-updates-0727` (§19n records his supersession of `CHI-49` and names `CHI-83` as the follow-up). The kickoff therefore writes the rows as an `agent-row` decision under `CHI-83` and names that as one of the Designer's three recorded calls. John's reserved calls (money, `dev → main`, `is_active`) are untouched.

`reversible_tables()` (`docs/design/agt-152-reversible-model-assignments.sql`) carries `skill_profiles` and `capability_skill_profiles`, so `reverse_decision()` can honour the NULL images by deleting the rows.

## 5. Baseline and the discriminating QA

`node scripts/baseline-red-set.js --tests=tests/regression/AGT-44-platform-language-guardrail.js --worktree=/home/user/deepbench-frontend` → green, red set 0 of 1. The new test file does not exist on the unchanged tree (the script says so by name), so its baseline is by construction: its live half reads a row that is not there.

The QA that fails if the change did nothing: the `agent-prompt.js` render of marcus/`ci-submission-ack-intent` has 0 CONSTRAINTS sections and 0 `Never write hypothesis` lines today, and must have 1 and 1; marcus/`ci-routing-intent` must stay at 0 (the exclusion is the invariant, as AGT-44's B3 already treats the allowlist). REST counts 0 → 1 (`skill_profiles`), 0 → 2 (`capability_skill_profiles`), 3 NULL images on the handle.

What this ship does not prove: that Haiku (`ci-*`) and Sonnet (`hyp-*`) obey the rule in generated text. That is a paid, probabilistic check (pattern:9 — no model call where a deterministic mechanism serves the claim being made, which is "the instruction reaches the model"). The next real CHI journey's `ai_activity_log` rows, or a `DAT12_LIVE_CHI`-style opt-in run of `scripts/chi-true-regression.mjs`, are where obedience reads.

## 6. Measurements not in the kickoff

- `model_assignments` lanes, read 2026-09-29: orchestrator `claude-opus-5`, judgment `claude-fable-5-1`, mechanical `claude-sonnet-5`; `runner_model_lanes` mirrors them.
- `class_autonomy('P6 - Agent Enhancement')`: work_class null, rung null, extras 0/0 → caps 3/4.
- Anchor counts (`git grep -F -l`, excluding kickoffs/harvests): both anchors resolve to exactly 1 file, the file named.
- Since 2026-08-30 the two capabilities logged 22 calls, all Marcus (`ci-answer-intent` 17, `ci-answer-display-intent` 4, `ci-routing-intent` 1), latest 2026-09-17; the `hyp-*` and ack intents have no calls in that window — their counts above are all-time.

## 7. Residue

None filed. The idea in Rejected C (a structural noun substitution if instruction-level guarding fails a second time) is noted here, not filed: it has no measurement yet, and filing it now would be a ticket for a defect not observed.
