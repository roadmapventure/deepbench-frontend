# AGT-70 — The Auditor: the Designer's reasoning for slice 1 of 4, harvested

<!-- DeepBench v7.0.464 | docs/harvests/AGT-70-design.md | Written by the Designer (design-kickoff, unattended cycle 2c62d37b-5711-4862-aa3c-b943acb44117, 2026-09-12). Overflow for docs/kickoffs/v7.0.464-AGT-70-auditor-ledger-and-corpus.md, linked once from its §1. The build reads this file ONLY at the four blocks the kickoff's tasks 1, 4 and 7 name (Ledger DDL, Fixture findings, Fixture corpus, Seed) plus the Report format and Corpus sources blocks its §4 points at; everything else here is reasoning. The ticket's own full text is docs/harvests/AGT-70.md — move, never delete. -->

## Premise revalidation (measured 2026-09-12, live Supabase + this clone at 947c5667)

- **The instrument does not exist:** `to_regclass('public.audit_findings')` → NULL; `ls docs/audits` → no such directory; `agents` has no `auditor` / `GV-07` row; `skill_profiles` has 0 `au-*` rows; `capabilities` has 0 of `audit-agent-data` / `audit-governance-corpus`. `backlog_items.AGT-70`: `status open`, `kickoff_link NULL`, `design_status NULL`, `claimed_by` this cycle, `size_stamp L`, `predicted_cycles 4`.
- **Four of the six hand-found contradictions are still live:**
  1. `runner_settings` (id 1): `interval_hours = 1` (`updated_at 2026-09-02`, `updated_by design-m6-build-0902`). `docs/runbooks/runner-cycle.md:626` reads "divisible by `interval_hours`** — at the standing 3 that is **12, 3, 6, 9 AM/PM"; `runner-cycle.md:3171` itself records the disagreement as a known stale sentence; the live routine `trig_017TZ3JZcLBK6AYH6DKURqMH` fires on cron `40 */3 * * *` — three homes, two numbers.
  2. `governance_rules` OD-01 and OD-43 are both `status = 'live'`; OD-43's statement says in its own words that `pz-rank-intent`'s order "does NOT agree with the one the picker actually uses"; `skill_profiles.pz-rank-intent.method` still carries the milestone → `supports_class` → `priority_class` order. The census (`docs/design/2026-09-09-operational-defaults-census.md:447`) marked it "amend — NAMED CONTRADICTION"; nothing amended it.
  3. All 7 `pz-*` rows: `llm_model = claude-fable-5-1`, `temperature = 0`; `api/prompt/request-receivable.js:274-279` (SES-334) drops `temperature` for that family because the API rejects it. Stored, never sent — a stale parameter.
  4. `docs/SELFBUILD-CHARTER.md:262-264`: "## Execution status / **Awaiting John's mark.**" — M0-M7 ran (`runner_cycles` count is in the hundreds; the standing brief's block says the runner is live).
- **Two are fixed, and that is evidence for the premise, not against it:** the live routine prompt (read from `list_triggers`) step 5 says "the queue's first admitted row is the pick" and `docs/runbooks/routine-prompt.md:53` records the FEATURES.md ordering as retired (SES-355); `src/data/agents.js:1` stamps `OFF_BENCH_AGENT_IDS deleted` at v7.0.456 (AGT-69). Neither fix is recorded anywhere as a finding that was found, ruled and closed — the fixes happened because a human noticed, and the platform has no memory of either. A ledger with fingerprints is exactly what turns "noticed" into "recorded".
- **Premise alive.** The gap is the missing instrument (ledger, extractor, weekly report), not the six examples.

## The size ruling — why this slice and no more

The ticket is `L`, 4 cycles by its own estimate; caps are 13 files / 14 tasks. A kickoff that seeds the agent, builds the comparison, wires the standing brief and the tripwire path and writes four QA arms is the four-cycle build, not a cycle. The slice was chosen by asking what ships something real and testable on its own that every later cycle stands on:

1. **Slice 1 (this kickoff):** the append-only ledger `public.audit_findings` with fingerprints; `scripts/audit-ledger.js` (ingest with dedupe, weekly report render); `scripts/audit-corpus.js` (pass one of the method — statement extraction over both corpora — plus the one finding kind that needs no judgment, `duplicate`); the six hand-found findings ingested from a fixture with today's re-measurement (4 open, 2 resolved); `docs/audits/2026-W37.md`; the GV-07 seed written to `docs/design/` and NOT applied. 8 files, 9 tasks.
2. **Slice 2:** the comparison — a judgment-lane run per topic cluster over `statements.json`, emitting findings in the ledger's input shape; run attended via `scripts/agent-prompt.js --agent=auditor` once John has applied the seed, or as a hand-composed sub-agent prompt if he has not (the SES-359 exception form); the first live run must re-find the four open contradictions by fingerprint.
3. **Slice 3:** landing — the standing-brief block (`render-standing-brief.js` reads with the service key), a `--from-ledger` path in `scripts/tripwire-to-backlog.js` with a weekly cap, runner-cycle step 4d (first cycle of the ISO week that passes the walls), the report committed at the ship point.
4. **Slice 4:** the negative-control fixture corpus with the six resolved, the self-audit of the `au-*` rows, week-two dedupe against week one, the regression test's live arm over the real corpus.

## The gating ruling — creating GV-07's rows is gated for an unattended cycle

The question put to this design: the prohibition is on editing rows *belonging to an active agent*; do rows for a *new, not-yet-active* agent fall inside it? Ruling: **inside**, for four reasons read this session, not recalled.

1. **The words.** `.claude/rules/agent-roster-inert.md` bullet 3 (SES-338): "an agent whose `agents.lane = 'governance'` lands `is_active = true`". So there is no "not-yet-active" state for GV-07 to occupy — the INSERT that creates it is the act that makes it active, and its Skill rows belong to an active agent from the first millisecond. Bullet 4: "Automated-mode sessions never edit rows belonging to an active agent (gated, §19v P5)". `docs/ARCHITECTURE.md:2622-2625` lists "edits to active agents" in the gated lane and closes with "Uncertain classification → gated, always." `runner-cycle.md:4336-4337` names "active-agent Skill/Capability edits". The caller's own framing — "a real question — do not assume either way" — is the uncertainty §19v resolves toward gated.
2. **The signing rule.** `ARCHITECTURE.md:2612-2614`: new agents are born invisible and "John flipping `is_active` is signing the hire card". The governance carve-out removed the flip because those agents never reach a roster, not because John's signature stopped mattering; the AGT-63..68 kickoffs each say "the Skill TEXT is the standard John ratified — never edit it". Skill text authored by an unattended cycle and landed active has no ratification behind it.
3. **The precedent, read from the ledger.** `runner_before_images` rows on `agents` / `skill_profiles` / `capabilities` / `capability_skill_profiles` / `agent_capability_assignments`: cycle `a8000000-…-a8` (7 + 2 rows, the AGT-63/AGT-65 amendments) has `trigger = 'supervised'`; cycle `42dfe8a9` (one `agents` row, 2026-08-20) has `trigger = 'supervised'`; the rest carry `session_name` values (`design-m7-build-0902`, `ses-333:design-runner-24h-0908`, `review-govtooling-0910`). Skill-row images by any other cycle: **0**. All six GV ship decisions (`runner_decisions` for AGT-63..68) sit on the supervised cycle. No unattended cycle has ever created or edited a governance agent's rows.
4. **Today's precedent in this same session.** The SES-359 kickoff (v7.0.462) held even a single Intent-row amendment on an existing active agent as a gated remainder with the row text in its harvest. Creating six rows plus the agent is not a smaller act than that.

What is NOT gated, and ships here: the table, the two scripts, the fixtures, the report, the test, and writing the seed SQL as a file under `docs/design/` (a file is not a row; AGT-63's seed was authored as a file by its design session and applied by the attended coding session). Also gated, named on the card: the `auditor-write` handler — its registration is a map entry in `api/prompt/request-receivable.js`, one of the four harness files (`ARCHITECTURE.md:2615-2616`), which `.claude/rules/capabilities-are-data.md` and §19v place in the gated lane regardless of the edit's size.

## Governing architecture

- **§19b (capabilities as data) and Rule #1 (§19d/§19e):** `audit-corpus.js` reads `skill_profiles`, `capabilities`, `agents`, `capability_skill_profiles` as tables, filtered by nothing agent-specific; the seed's Skill text names no other agent (it says "every agent in the governance lane", "the row that owns the capability"), and the future handler is `traits.handler` on the Intent rows, the generic mechanism. No route file, no conditional keyed to an id.
- **§19v (reversibility, before-images):** every ledger INSERT is preceded by a `runner_before_images` row with `row_data: null` — the INSERT convention `tripwire-to-backlog.js:276-279` documents and step 8b writes down. The migration captures its down first (`capture_migration_down`, `runner-cycle.md:2747-2762`). `reverse_decision()`'s allowlist does not include `audit_findings` (nor `skill_profiles`, `runner-cycle.md:4391-4399`), so a reverse of a ledger row is by hand from the image; the kickoff says so rather than implying auto-reversal.
- **§19k:** no model call in this slice; nothing to log. Slice 2's comparison logs through `agent-log.js` like every governance run (SES-359).
- **`.claude/rules/supabase-column-grants.md` addendum (DAT-18):** default privileges are closed, so the new table gets no public grant unless granted; none is granted. The only reader in this slice and the next is the service key (`render-standing-brief.js:1191`).

## Design decisions, with the alternatives they beat

- **Fingerprint = kind + location keys without line numbers + normalized governing fact.** Alternative: hash the full detail (locations with lines + texts). Rejected for the reason `tripwire-to-backlog.js:20-34` measured on its own findings — a detail hash files a new finding every time a line number moves, which is every ship. Alternative: hash only the kind + locations (the tripwire's `check|id` shape). Rejected: two different contradictions between the same two files would collapse into one. The governing fact is what a finding is *about*; the homes are *where*; both belong in the identity; the line is neither.
- **`unique (fingerprint, iso_week)` rather than `unique (fingerprint)`.** The ticket wants "a finding seen last week is the same finding, not a new one" AND week-two dedupe; one row per (finding, week) gives both: same week → `seen`, next week → a new observation row with `first_seen` derived as `min(iso_week)` over the fingerprint. No UPDATE is ever needed to record recurrence, which is what keeps the table append-only in practice.
- **Append-only by trigger, rulings as the one mutable band.** Alternative: a separate `audit_rulings` table. Rejected as a second join for slice 3's brief block; John's ruling is a property of the finding. Alternative: block DELETE too. Kept — the reverse path for a wrong INSERT is by hand from the before-image and is a John act; a DELETE by anything else is the wipe the rule exists against.
- **`duplicate` is the only detector in slice 1.** It is the one kind in the ticket's five that is decidable without judgment, and it makes the extractor's output testable on a fixture with a negative control (the RETIRED IN PLACE twin), which is the ticket's own QA shape. Its output is written to a scratch file and counted, NOT ingested: the first live count is unknown, and filing an unknown number of rows into a ledger that renders on the standing brief is board flooding wearing a script's clothes. Slice 2 reads the list with a human and decides.
- **Retirement detection reuses `RETIREMENT_VOCAB` and `enclosingParagraph` from `check-session-docs.js`** rather than a new regex — the same vocabulary check 9 already uses, so the Auditor and the tripwire agree on what "retired" looks like. The `RETIRED IN PLACE` literal is checked in the statement's own paragraph AND in the paragraph directly above it, because that is the runbook's real layout (`runner-cycle.md:4357-4373`: a marker paragraph, then the kept paragraph verbatim under it) and the marker paragraph there is longer than `RETIREMENT_WINDOW` (280 chars), so a character window would miss it. The vocabulary is checked over the first 160 characters only, so a live paragraph that merely says "no longer" mid-sentence is not silently excluded. The fixture is built so P2's exclusion can only come from this rule (texts byte-identical), with a control that removes the marker and expects the duplicate to appear.
- **Groups equal to a live `governance_rules` statement are skipped.** Rendered `{{rule:ID}}` blocks and SES-201's copies are deliberate duplicates check 12 governs; the Auditor finding them again would be the redundancy it exists to find.
- **`temperature` is NULL on the Auditor's own rows,** not 0: contradiction 3 is exactly the `pz-*` pattern, and the agent's own rows must pass its own audit (the ticket's fourth QA).
- **The seed uses the five Skill types the AGT-63 amendment settled** (identity, knowledge, behavior, intent, guardrails — no Format row; `agt-63-prioritizer.test.mjs:66-70`), with the output contract on the Intent's `traits.schema`.

## Expected live numbers (so the STOP LINE report can be read)

- Ledger after task 5: 6 rows for `2026-W37`, `status` open 4 / resolved 2, `found_by = hand:review-govtooling-0910`, `cycle_id = 2c62d37b-…`.
- Extraction: 144 live + 17 non-live `governance_rules`, 0 open `runner_directives`, 101 `skill_profiles`, 28 `agents`, 25 `capabilities`; files: 14 runbooks, 14 `.claude/rules`, 4 `RUNNER-GOV-*`, 4 `CLAUDE*.md`, charter (266 lines), modes (133), ARCHITECTURE, 3 config files, 38 script headers. Statement count is reported, not predicted.
- Duplicates: at least 1 is expected — the SES-359 lane wording is byte-identical by design in `CLAUDE-DESIGN.md:244` and `docs/STANDARDS.md:94` and is not a `governance_rules` statement. That is a real finding for John to rule (`not-a-defect: deliberate twin`) in slice 2, and a first test of the ruling path.

## Ledger DDL

```sql
-- AGT-70 slice 1 (v7.0.464): the Auditor's findings ledger. Append-only: rulings are the one mutable band.
CREATE TABLE public.audit_findings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  fingerprint         text NOT NULL,
  iso_week            text NOT NULL CHECK (iso_week ~ '^\d{4}-W\d{2}$'),
  kind                text NOT NULL CHECK (kind IN ('duplicate','contradiction','redundant','stale-or-irrelevant','competing-purpose')),
  locations           jsonb NOT NULL CHECK (jsonb_typeof(locations) = 'array' AND jsonb_array_length(locations) >= 1),
  governing_fact      text NOT NULL,
  confidence          text NOT NULL CHECK (confidence IN ('high','medium','low')),
  proposed_resolution text NOT NULL,
  status              text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','not-a-defect')),
  ruling              text,
  ruled_by            text,
  ruled_at            timestamptz,
  found_by            text NOT NULL,
  cycle_id            uuid REFERENCES public.runner_cycles(id),
  UNIQUE (fingerprint, iso_week)
);
COMMENT ON TABLE public.audit_findings IS 'AGT-70: the Auditor''s findings ledger. One row per (finding fingerprint, ISO week). Append-only: only status, ruling, ruled_by, ruled_at may change; rows are never deleted by anything but John''s hand from the before-image.';

CREATE OR REPLACE FUNCTION public.audit_findings_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_findings is append-only (AGT-70): delete refused';
  END IF;
  IF ROW(NEW.id, NEW.created_at, NEW.fingerprint, NEW.iso_week, NEW.kind, NEW.locations, NEW.governing_fact,
         NEW.confidence, NEW.proposed_resolution, NEW.found_by, NEW.cycle_id)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.created_at, OLD.fingerprint, OLD.iso_week, OLD.kind, OLD.locations, OLD.governing_fact,
         OLD.confidence, OLD.proposed_resolution, OLD.found_by, OLD.cycle_id) THEN
    RAISE EXCEPTION 'audit_findings is append-only (AGT-70): only status, ruling, ruled_by, ruled_at may change';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER audit_findings_guard
  BEFORE UPDATE OR DELETE ON public.audit_findings
  FOR EACH ROW EXECUTE FUNCTION public.audit_findings_guard();
-- No GRANT to anon / authenticated: default privileges are closed (DAT-18) and the only reader is the service key.
```

## Report format

Line 1: `<!-- GENERATED by scripts/audit-ledger.js --report=<week> --write (AGT-70) from public.audit_findings — do not edit -->`. Line 3: `# Audit <week> — <N> findings (<a> open · <b> resolved · <c> not a defect)`. Then, per row in order (status `open` first, then `resolved`, then `not-a-defect`; within a status confidence `high` → `medium` → `low`; then fingerprint ascending):

```
## <fingerprint> · <kind> · <confidence> · <status>

**Fact:** <governing_fact>

**Locations:**
- `<location>` — "<text>"

**Proposed resolution:** <proposed_resolution>

**Ruling:** <ruling> (<ruled_by>, <ruled_at date>)      ← only when ruling is set

First seen: <min iso_week for this fingerprint> · found by <found_by>
```

One blank line between findings; file ends with a newline. `renderReport(week, rows)` is pure (rows in, string out) so the test can hold it byte-stable.

## Corpus sources

Files (paths relative to the clone; `.claude/` is READ only): `docs/SELFBUILD-CHARTER.md`, `docs/GOVERNANCE-MODES.md`, `docs/ARCHITECTURE.md`, `docs/RUNNER-GOV-*.md`, `docs/runbooks/*.md`, `CLAUDE.md`, `CLAUDE-DESIGN.md`, `CLAUDE-RULES.md`, `CLAUDE-STATE.md`, `.claude/rules/*.md`. Config, flattened to `key.path=value` statements to depth 3, location `<rel>:<key.path>`: `.claude/settings.json`, `vercel.json`, `.github/workflows/ci.yml` (YAML: parse with a minimal indentation walker or treat each `key: value` line as a statement — no new dependency). Script headers: for each `scripts/*.js`, the leading run of `//` comment lines before the first non-comment line, as one statement at `<rel>:1`.

Database, `corpus = 'agent-data'`: `skill_profiles` → for every row, one statement per non-empty field among `objective`, `method`, `output_desc`, `description`, `notes`, `traits.reasoning_style`, `traits.writing_style`, each `guardrails.must[i]`, each `guardrails.must_not[i]`, at location `skill_profiles/<slug>/<field>` (index in brackets for arrays), and three scalar statements `llm_model=<v>`, `temperature=<v>`, `max_tokens=<v>` at `skill_profiles/<slug>/<name>`; `capabilities` → `description` at `capabilities/<slug>/description`; `agents` → `bio` at `agents/<id>/bio`.

Database, `corpus = 'governance'`: `governance_rules` → `statement` at `governance_rules/<id>`, `retired = (status <> 'live')`; `runner_directives` with `status = 'open'` → `body` at `runner_directives/<id>`; `runner_settings` (id 1) → one `<key>=<value>` per column at `runner_settings/1/<key>`; `runner_model_lanes` → `<lane>=<model_id>` at `runner_model_lanes/<lane>`.

`extractSkillRows(rows)` is the pure half for `skill_profiles` (rows in, statements out) so the test can feed it fixture rows; the CLI's `--no-db` skips every database source and is what the fixture-corpus test uses. For `--ingest`, the fixture file's top-level `week` and `found_by` are defaults; the `--week` / `--found-by` flags win when given.

## Fixture findings

`tests/fixtures/agt-70/findings-2026-W37.json` — byte-for-byte:

```json
{
  "week": "2026-W37",
  "found_by": "hand:review-govtooling-0910",
  "findings": [
    {
      "kind": "contradiction",
      "governing_fact": "the runner's scheduling interval in hours",
      "confidence": "high",
      "locations": [
        { "location": "runner_settings/1/interval_hours", "text": "interval_hours=1" },
        { "location": "docs/runbooks/runner-cycle.md:626", "text": "divisible by `interval_hours`** — at the standing 3 that is **12, 3, 6, 9 AM/PM on John's" },
        { "location": "routine/trig_017TZ3JZcLBK6AYH6DKURqMH/cron_expression", "text": "40 */3 * * *" }
      ],
      "proposed_resolution": "runner_settings is the one home (SES-177b: the block is right and the sentence is stale); either set interval_hours to 3 to match the cron John runs, or reword runner-cycle.md:626 to read the value from the row — John decides which number is true."
    },
    {
      "kind": "contradiction",
      "governing_fact": "the order of the board's ranking keys",
      "confidence": "high",
      "locations": [
        { "location": "governance_rules/OD-01", "text": "The pickable board's stored order is produced by exactly six ranking keys applied in this sequence: `automation_rank` nulls last, then tier (`now` before `next` before everything else), then the numeric part of `priority_class` ascending, then the M5-02 filing lane" },
        { "location": "governance_rules/OD-43", "text": "`pz-rank-intent` instructs the Prioritizer to order tickets by project milestone order, then `supports_class` (P1 first, none last), then `priority_class`, then the filing lane, then `predicted_cycles`, then queue — an order that does NOT agree with the one the picker actually uses" },
        { "location": "skill_profiles/pz-rank-intent/method", "text": "Order them: (1) project milestone order when the set spans milestones of one project; (2) supports_class, P1 first, none last; (3) priority_class, P1 first; (4) filing lane (filed before 2026-08-21 first); (5) predicted_cycles, cheapest first, unknown last; (6) queue." }
      ],
      "proposed_resolution": "OD-01 (public.recompute_backlog_queue()) is the executing home; the census already marked OD-43 'amend — NAMED CONTRADICTION'. Either the rank Intent adopts the picker's key order or OD-01 gains supports_class as a key — a John decision, then one Skill-row edit under a directive (gated)."
    },
    {
      "kind": "stale-or-irrelevant",
      "governing_fact": "temperature stored for a model whose API rejects temperature",
      "confidence": "high",
      "locations": [
        { "location": "skill_profiles/pz-identity/temperature", "text": "temperature=0" },
        { "location": "skill_profiles/pz-knowledge-classes/temperature", "text": "temperature=0" },
        { "location": "skill_profiles/pz-knowledge-john/temperature", "text": "temperature=0" },
        { "location": "skill_profiles/pz-behavior/temperature", "text": "temperature=0" },
        { "location": "skill_profiles/pz-classify-intent/temperature", "text": "temperature=0" },
        { "location": "skill_profiles/pz-rank-intent/temperature", "text": "temperature=0" },
        { "location": "skill_profiles/pz-guardrails/temperature", "text": "temperature=0" },
        { "location": "api/prompt/request-receivable.js:274-279", "text": "FEATURE: SES-334 -- the same family also REJECTS `temperature` outright (\"`temperature` is deprecated for this model\"), so the field is dropped for it rather than sent and refused." }
      ],
      "proposed_resolution": "Set temperature NULL on every claude-fable-5-1 Skill row (the executor never sends it); a stored parameter the lane rejects is a statement that is false in live voice. One Skill-row edit under a directive (gated)."
    },
    {
      "kind": "stale-or-irrelevant",
      "governing_fact": "whether the Selfbuild has started executing",
      "confidence": "high",
      "locations": [
        { "location": "docs/SELFBUILD-CHARTER.md:262-264", "text": "## Execution status — **Awaiting John's mark.** On go: SES-169 (Step 0 backup) runs first and must verify restorable;" },
        { "location": "docs/runbooks/standing-brief.md:233", "text": "**Next session:** none required — the runner is live and works **John's automation queue**" }
      ],
      "proposed_resolution": "Replace the charter's Execution status with a dated pointer to the standing brief's generated block (the one home for run state), or mark the paragraph RETIRED IN PLACE with the date M0 ran."
    },
    {
      "kind": "contradiction",
      "governing_fact": "how a cycle selects its work",
      "confidence": "high",
      "status": "resolved",
      "ruling": "Resolved before filing: SES-355 made docs/runbooks/routine-prompt.md the canonical prompt and the live routine's step 5 now reads 'the queue's first admitted row is the pick' (verified from the trigger 2026-09-12); routine-prompt.md:53 records the FEATURES.md ordering as retired.",
      "locations": [
        { "location": "docs/runbooks/routine-prompt.md:53", "text": "| Select work from FEATURES.md → FEATURES-NEXT.md → FEATURES-LATER.md, \"beta-marked first, then newest filed\" | The board moved to `public.backlog_items`; `prime_directive_queue()` orders it (`SES-333`, `SES-340`); beta retired | Step 4: the queue's first admitted row is the pick |" },
        { "location": "routine/trig_017TZ3JZcLBK6AYH6DKURqMH/prompt:5", "text": "Work selection is the runbook's step 5 read from public.prime_directive_queue(): ... the queue's first admitted row is the pick" }
      ],
      "proposed_resolution": "None needed — recorded so the ledger's first week carries the closed pair as well as the open four."
    },
    {
      "kind": "contradiction",
      "governing_fact": "whether governance agents are hidden from the Bench by a static id list",
      "confidence": "high",
      "status": "resolved",
      "ruling": "Resolved before filing: AGT-69 (v7.0.456, John's ruling 2026-09-11, decision 146256c1) deleted OFF_BENCH_AGENT_IDS; governance agents render from live lane='governance' rows (src/components/GovernanceSection.jsx).",
      "locations": [
        { "location": "src/data/agents.js:1", "text": "AGT-69 — OFF_BENCH_AGENT_IDS deleted with its comment (John's ruling 2026-09-11, decision 146256c1): the governance agents render on the Bench's Governance section from live lane=governance rows" },
        { "location": "src/data/agents.js:2", "text": "AGT-68 — AVATAR_CFG + AGENT_PRONOUNS entries for `devmanager` (The Development Manager, GV-01, lane `governance`), added to OFF_BENCH_AGENT_IDS." }
      ],
      "proposed_resolution": "None needed — the stamp history is the record; kept so week-two dedupe has a resolved fingerprint to match."
    }
  ]
}
```

## Fixture corpus

`tests/fixtures/agt-70/corpus/a.md` — byte-for-byte:

```markdown
# Fixture A (AGT-70)

The weekly audit fires on the first scheduled cycle of the ISO week that passes every wall, extracts one statement per source into a statement table, and compares within topic clusters rather than across the whole corpus in a single prompt.

Every finding carries a kind, the locations verbatim, the governing fact in dispute, a confidence, and a one-line proposed resolution naming which home should win and why, citing the retirement ledger or the decision that made one side true.
```

`tests/fixtures/agt-70/corpus/b.md` — byte-for-byte:

```markdown
# Fixture B (AGT-70)

The weekly audit fires on the first scheduled cycle of the ISO week that passes every wall, extracts one statement per source into a statement table, and compares within topic clusters rather than across the whole corpus in a single prompt.

**RETIRED IN PLACE 2026-09-01 (fixture).** The paragraph below is kept verbatim as the record of the earlier wording; the live twin is in Fixture A.

Every finding carries a kind, the locations verbatim, the governing fact in dispute, a confidence, and a one-line proposed resolution naming which home should win and why, citing the retirement ledger or the decision that made one side true.
```

Expected: paragraph P1 is a `duplicate` across `a.md:3` and `b.md:3`. P2 is byte-identical in `a.md:5` and `b.md:7` — the normalized texts match, so only the retirement rule keeps it out — and `b.md:7` is `retired` because the paragraph directly above it carries `RETIRED IN PLACE`; no finding. The test's control deletes `b.md`'s P1 paragraph and expects zero; a second control that deletes `b.md`'s marker paragraph must make P2 a duplicate (proving the exclusion is the retirement rule and not a text difference).

## Seed

`docs/design/agt-70-auditor-seed.sql` — byte-for-byte. HELD: applied only by a session John attends (see the gating ruling). Run `node scripts/check-model-ids.js` over it before applying; never edit the Skill text without a decision.

```sql
-- AGT-70 — The Auditor (GV-07): agent row, two Capabilities, six Skill profiles (five types, no Format row), links, assignment.
-- Designed by the Designer, unattended cycle 2c62d37b-5711-4862-aa3c-b943acb44117, 2026-09-12 (v7.0.464). HELD FOR JOHN:
-- a governance-lane agent lands is_active = true (SES-338 carve-out), so creating these rows is an active-agent write —
-- gated under §19v and .claude/rules/agent-roster-inert.md. Apply from an attended session, one transaction, with a
-- record_decision('directive','AGT-70', ...) row and a runner_before_images row (row_data null) per inserted row.
-- temperature is NULL on every row on purpose: the judgment lane's API rejects it (request-receivable.js:274-279).
-- Rule #1: no Skill text names another agent; the agent reads agents / capabilities / skill_profiles as tables.

BEGIN;

INSERT INTO public.agents (id, code, name, role, lane, specialty, bio, is_active, visibility, agent_origin, skill_score, rating, usage_count, data_room_access, uber_access)
VALUES ('auditor', 'GV-07', 'The Auditor', 'Governance — Auditor', 'governance',
  'Corpus Extraction · Contradiction Finding · Findings Ledger',
  'The Auditor reads the platform''s rules where they actually live — agent Skill rows, the rule registry, standing directives, runbooks, the CLAUDE files and the tooling configuration — and finds the places where two true-sounding statements disagree, repeat, compete or have gone stale. It files every finding with both locations verbatim, the fact in dispute and a proposed resolution naming which home should win. It never edits, never certifies a ship and never resolves what it finds; it files, and John rules.',
  true, 'config', 'system', 0, 0, 0, '[]'::jsonb, false);

INSERT INTO public.capabilities (slug, name, description, execution_type, tenant_id, display_phrase, default_intent_slug) VALUES
 ('audit-agent-data', 'Audit Agent Data',
  'Reviews the Skill rows, capability links and assignments of every agent for duplicated method text, guardrails that contradict another Skill on the same capability, purposes that compete, stale references and content no capability on that agent can use. Returns findings with verbatim locations and a proposed resolution; writes nothing itself.',
  'ai', 'global', 'auditing the agent data', 'au-agent-data-intent'),
 ('audit-governance-corpus', 'Audit Governance Corpus',
  'Reviews the rule registry, standing directives, charter, governance docs, runbooks, CLAUDE files and tooling configuration for two live statements that disagree on one governing fact, a retired rule stated in live voice, a default with two homes, a document whose purpose another now serves, and a RETIRED IN PLACE passage whose live twin has drifted. Returns findings with verbatim locations and a proposed resolution; writes nothing itself.',
  'ai', 'global', 'auditing the governance corpus', 'au-corpus-intent');

INSERT INTO public.agent_capability_assignments (agent_id, capability_slug, tenant_id) VALUES
 ('auditor', 'audit-agent-data', 'global'),
 ('auditor', 'audit-governance-corpus', 'global');

INSERT INTO public.skill_profiles (slug, name, skill_type_slug, objective, method, output_desc, description, traits, guardrails, technical_services, execution_type, llm_provider, llm_model, max_tokens, temperature, api_key_source) VALUES

 ('au-identity', 'Auditor Identity', 'identity',
  'Be The Auditor: you find where the platform''s written rules disagree with each other, repeat each other, compete or have gone stale, and you file what you find with the evidence attached.',
  'A finding is two or more verbatim passages and the one governing fact they disagree about — never a paraphrase, never an impression. You compare within one topic at a time and you say which home should win and why, citing the retirement ledger entry or the decision that made one side true. You are an instrument of record: you never edit a source, never certify a ship, never resolve a finding and never re-file one John has ruled not a defect. When the evidence cannot carry a finding, you say so and file nothing.',
  NULL, NULL, '{}'::jsonb, '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 6000, NULL, 'platform'),

 ('au-knowledge-homes', 'Auditor Knowledge — the homes, the kinds and the ledger', 'knowledge',
  'Hold the five homes the rules live in, the five finding kinds, what a fingerprint is, and the powers no resolution may touch.',
  E'THE FIVE HOMES (AGT-70, 2026-09-10): (1) the Skill rows of every agent in the governance lane — skill_profiles joined through capability_skill_profiles and agent_capability_assignments; (2) public.governance_rules (status live) and each row''s canonical_doc; (3) public.runner_directives with status open; (4) the runbooks under docs/runbooks/, the CLAUDE*.md files, docs/SELFBUILD-CHARTER.md, docs/GOVERNANCE-MODES.md, docs/ARCHITECTURE.md section 19 and docs/RUNNER-GOV-*.md; (5) tooling configuration — scripts/*.js headers, .claude/rules/*.md, .claude/settings.json, vercel.json, .github/workflows/ci.yml and docs/runbooks/routine-prompt.md.\n\nTHE FIVE KINDS: duplicate (the same statement in two homes, verbatim or near), contradiction (two live statements that disagree on one governing fact — a number, a key order, a lane, who clears a flag), redundant (a default or procedure with two homes where one would do), stale-or-irrelevant (a statement in live voice that a later ship retired; a parameter the lane rejects; knowledge no capability on that agent can use; a passage kept RETIRED IN PLACE whose live twin has drifted), competing-purpose (two documents or two agents whose stated objectives claim the same decision).\n\nTHE LEDGER: public.audit_findings, one row per finding per ISO week; the fingerprint is kind + the location homes without line numbers + the normalized governing fact, so the same finding seen next week is the same finding. A row with status not-a-defect carries John''s ruling and is never re-filed. Statements whose paragraph is marked RETIRED IN PLACE or carries retirement vocabulary are history, not live voice, and are never one side of a contradiction.\n\nTHE POWERS NO RESOLUTION MAY RETIRE: B20, HR-MERGE, the 72-hour reversal window, John''s Accept and Reverse, and any power the retirement ledger records as John-standing. A proposed resolution names which home should win; it never proposes removing a John-standing power.',
  NULL, 'The homes, kinds, fingerprint rule and protected powers, held so every finding can name its sources by their real identifiers.',
  '{}'::jsonb, '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 6000, NULL, 'platform'),

 ('au-behavior', 'Auditor Behavior', 'behavior',
  NULL, NULL, NULL, NULL,
  '{"reasoning_style":"Work one topic cluster at a time from the statement table you are handed; never the whole corpus in one pass. For each candidate, quote both passages verbatim with their locations, name the one governing fact, and only then decide the kind. Prefer no finding to a weak one: a difference of wording is not a contradiction; a difference of fact is. Cite the retirement ledger or the decision when you say which home should win. Grade confidence by how literally the two passages name the same fact.","writing_style":"One finding per object in the output array; locations verbatim, never summarized; the governing fact in one plain sentence; the proposed resolution in one line that names a home. No prose outside the JSON."}'::jsonb,
  '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 6000, NULL, 'platform'),

 ('au-agent-data-intent', 'Audit Agent Data', 'intent',
  'Compare one topic cluster of agent-data statements and return every finding it supports.',
  E'Your task_context carries cluster (a topic label), statements (an array of {id, source, location, text, retired}) drawn from skill_profiles, capabilities and agents rows, and prior (the fingerprints already in the ledger for this week). For the cluster: (1) find duplicated method or knowledge text across Skills or agents (verbatim or near); (2) find guardrails that contradict another Skill on the same capability or on another agent; (3) find two objectives that claim the same decision (competing-purpose); (4) find stale references — a retired rule, a deleted route, a passed review, a parameter the lane rejects — and knowledge no capability on that agent can use. Every finding: kind, the locations verbatim, governing_fact, confidence, proposed_resolution naming which home should win. Skip any statement with retired true as a side of a contradiction. Return an empty findings array when the cluster supports none.',
  NULL, NULL,
  '{"schema":{"type":"object","required":["cluster","findings","account"],"properties":{"cluster":{"type":"string"},"findings":{"type":"array","items":{"type":"object","required":["kind","locations","governing_fact","confidence","proposed_resolution"],"properties":{"kind":{"type":"string","enum":["duplicate","contradiction","redundant","stale-or-irrelevant","competing-purpose"]},"locations":{"type":"array","minItems":1,"items":{"type":"object","required":["location","text"],"properties":{"location":{"type":"string"},"text":{"type":"string"}}}},"governing_fact":{"type":"string","maxLength":300},"confidence":{"type":"string","enum":["high","medium","low"]},"proposed_resolution":{"type":"string","maxLength":400}}}},"account":{"type":"string","maxLength":100}}},"handler":"auditor-write","can_request_help":false}'::jsonb,
  '{"must":[],"must_not":[]}'::jsonb, '["structured-output"]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 6000, NULL, 'platform'),

 ('au-corpus-intent', 'Audit Governance Corpus', 'intent',
  'Compare one topic cluster of governance-corpus statements and return every finding it supports.',
  E'Your task_context carries cluster (a topic label), statements (an array of {id, source, location, text, retired}) drawn from governance_rules, runner_directives, runner_settings, runner_model_lanes and the governance files, and prior (the fingerprints already in the ledger for this week). For the cluster: (1) find two live statements that disagree on one governing fact — a number, a key order, a lane, who clears a flag; (2) find a rule stated in live voice that a retired or superseded registry row says was withdrawn; (3) find a default or procedure with two homes; (4) find a document whose stated purpose another document now serves; (5) find a RETIRED IN PLACE passage whose live twin has since drifted from it — that is a finding about the live twin, never about the retired passage. Every finding: kind, the locations verbatim, governing_fact, confidence, proposed_resolution naming which home should win and citing the retirement ledger entry or decision that made one side true. Return an empty findings array when the cluster supports none.',
  NULL, NULL,
  '{"schema":{"type":"object","required":["cluster","findings","account"],"properties":{"cluster":{"type":"string"},"findings":{"type":"array","items":{"type":"object","required":["kind","locations","governing_fact","confidence","proposed_resolution"],"properties":{"kind":{"type":"string","enum":["duplicate","contradiction","redundant","stale-or-irrelevant","competing-purpose"]},"locations":{"type":"array","minItems":1,"items":{"type":"object","required":["location","text"],"properties":{"location":{"type":"string"},"text":{"type":"string"}}}},"governing_fact":{"type":"string","maxLength":300},"confidence":{"type":"string","enum":["high","medium","low"]},"proposed_resolution":{"type":"string","maxLength":400}}}},"account":{"type":"string","maxLength":100}}},"handler":"auditor-write","can_request_help":false}'::jsonb,
  '{"must":[],"must_not":[]}'::jsonb, '["structured-output"]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 6000, NULL, 'platform'),

 ('au-guardrails', 'Auditor Guardrails', 'guardrails',
  NULL, NULL, NULL, 'Constraints every Auditor finding must respect.',
  '{}'::jsonb,
  '{"must":["quote every location verbatim from the statement handed to you, never a paraphrase","name exactly one governing fact per finding","name which home should win in every proposed resolution and cite the ledger entry or decision that makes it true","treat any statement marked retired as history, never as one side of a contradiction","return an empty findings array rather than a weak finding"],"must_not":["edit, certify, resolve or close anything — you file","propose a resolution that retires B20, HR-MERGE, the reversal window, or any John-standing power","re-file a finding whose fingerprint is in prior with a not-a-defect ruling","write to any table directly — the auditor-write handler is the only writer","name a specific agent as the cause; name the row and the field"]}'::jsonb,
  '[]'::jsonb, 'ai', 'anthropic', 'claude-fable-5-1', 6000, NULL, 'platform');

INSERT INTO public.capability_skill_profiles (capability_slug, skill_profile_slug, level, is_required, display_order) VALUES
 ('audit-agent-data', 'au-identity', 2, true, 1),
 ('audit-agent-data', 'au-knowledge-homes', 2, true, 2),
 ('audit-agent-data', 'au-behavior', 2, true, 3),
 ('audit-agent-data', 'au-agent-data-intent', 2, true, 4),
 ('audit-agent-data', 'au-guardrails', 2, true, 5),
 ('audit-governance-corpus', 'au-identity', 2, true, 1),
 ('audit-governance-corpus', 'au-knowledge-homes', 2, true, 2),
 ('audit-governance-corpus', 'au-behavior', 2, true, 3),
 ('audit-governance-corpus', 'au-corpus-intent', 2, true, 4),
 ('audit-governance-corpus', 'au-guardrails', 2, true, 5);

COMMIT;
-- After applying, verify: select count(*) from capability_skill_profiles where capability_slug like 'audit-%' → 10;
-- select lane, is_active from agents where id = 'auditor' → governance, true; then add AVATAR_CFG.auditor and
-- AGENT_PRONOUNS.auditor (they/them/their, // FEATURE: AGT-70) in src/data/agents.js — the Governance section renders
-- from the live row (AGT-69). The auditor-write handler (api/_lib/handlers/auditor-write.js, registered in
-- request-receivable.js — a harness file, same attended session) ingests through scripts/audit-ledger.js's functions.
```

## What this slice does not do

- It does not create GV-07, register a handler, run a model, edit any Skill row, write under `.claude/`, or touch `runner-cycle.md`. It files no backlog rows from the ledger — that is slice 3's `tripwire-to-backlog.js` path, deliberately after a human has read the first duplicate list.
- It does not fix any of the four open contradictions. Each is a ticket for a builder, and two of them (OD-43's rank Intent, the `pz-*` temperature) are Skill-row edits that are gated in their own right.
- It does not decide the ISO-week fire rule in the runbook (step 4d, slice 3) or the standing-brief block's shape.

## Residue for the orchestrator (not the build's)

- Card items for John, in the SES-376 / SES-359 form: (1) apply `docs/design/agt-70-auditor-seed.sql` attended, with `record_decision` and before-images; (2) the `auditor-write` handler + registration; (3) the four open contradictions above are each a filable ticket — the ledger rows carry the exact locations; slice 3 wires the filing, but nothing stops an attended session filing OD-43's or the `pz-*` temperature fix sooner.
- The `pz-*` `temperature = 0` finding applies to every `claude-fable-5-1` Skill row on the platform, not only the seven — the first live `audit-corpus.js` run will show the count under `skill_profiles/*/temperature=0`; the fixture names the seven the ticket named.
- `runner-cycle.md:3171-3174` already says the interval sentence is "a hand edit and a separate ticket"; the ledger row now gives that ticket its evidence.
