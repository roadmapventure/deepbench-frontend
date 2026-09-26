# AGT-132 slice 2 — harvest (v7.0.607, cycle 47423449-171c-4dbe-b162-48cbeca76834, Designer GV-04, 2026-09-26)

Reasoning and measurements behind `docs/kickoffs/v7.0.607-AGT-132-slice2-alert-source-and-guard.md`. Not required reading for the build; every fact a task depends on is in the kickoff.

## 1. What slice 2 actually is

Slice 1 shipped at `v7.0.605`, commit `669c6d74`, under `docs/kickoffs/v7.0.605-AGT-132-finding-routes.md`. Every task in it is discharged (the table, `finding_group_epic()`, the `apply_audit_review()` rebuild, the script's context and validator, the Intent paragraph, the test). Its section 7 defers three things. I checked all three live, plus the defect its own commit message reported.

- **`john_alerts.source` literal — ALIVE.** `pg_get_functiondef(public.apply_audit_review(uuid, text, text, jsonb))` (16,017 B) body lines 269-270: `INSERT INTO public.john_alerts (source, john_call, summary, detail, ref_table, ref_id, fingerprint) VALUES ('auditor', …)`. One occurrence of the literal. `public.john_alerts` holds 0 rows and its only CHECK is on `john_call`, so nothing constrains `source` and no existing row has to be migrated — the change is one expression.
- **The guardrails split — ALIVE.** `dm-guardrails.guardrails.must` has 6 entries; the 6th is the 1,087-byte runner-chain rule (`docs/runbooks/routine-prompt.md` line 47 minus its `"9. "` prefix). `capability_skill_profiles` shows `dm-guardrails` linked to FOUR capabilities — `decide-gated-card` (5), `model-assignment` (7), `review-audit-worklist` (5), `run-project` (6) — so the Development Manager's findings-review prompt currently instructs it to close a `runner_cycles` row and open a continuation row. That is another capability's procedure reaching this one.
- **A `researcher` route — ALIVE BUT BLOCKED.** `backlog_items.AGT-138` is `open`. No route row; nothing designed here.
- **Not deferred by slice 1, found now: source `runner` is unmapped.** 4 open findings carry `found_by` starting `runner`, and `finding_routes` (4 rows: `(10,'*','security','security')`, `(20,'auditor','*','auditor-enhancements')`, `(30,'staff-watch','*',NULL)`, `(30,'ticket-owner','*',NULL)`) has no row for it. `finding_group_epic()` RAISEs on an unmapped source, so a root-cause or cleanup group holding one stops the review. That is the designed refusal, and adding the row is John's — not invented here, reported in the STOP LINE with the exact statement.

## 2. The constraint defect — verified first hand, and where I put it

The Development Manager's report holds. Measured:

- `pg_constraint` on `public.audit_findings`: `audit_findings_found_by_single` = `CHECK ((found_by !~ ' \+ '::text)) NOT VALID` (`convalidated = false`). NOT VALID only skips the back-scan of existing rows; Postgres still runs the check on every INSERT and on every UPDATE of a row, whichever columns changed.
- 62 open/carried findings. By source: `auditor` 47 (27 joined, 20 clean), `ticket-owner` 11, `runner` 4. All 27 joined rows carry the SAME string, `'auditor:judgment:none + auditor:board-checks + auditor:private-scan + auditor:routine:board-health (assembly failed: E2BIG) + auditor:routine:work-quality + auditor:routine:advisor + check-routine-prompt:auditor + check-routine-prompt:runner + check-routine-prompt:runner'`, `finding_type` `defect`. `split_part(…, ':', 1)` = `auditor`, so once they are updatable they route cleanly to `auditor-enhancements` — routing is not the problem.
- `audit_findings_guard()` (AGT-70) is `BEFORE DELETE OR UPDATE … FOR EACH ROW` and raises unless only `status, ruling, ruled_by, ruled_at, filed_backlog_id, john_call` change; `found_by` is in the frozen list. So the values cannot be corrected either.
- `apply_audit_review()` body line 142 (`1b. Coverage LAST`) and line 158 (`RAISE … 'finding % not covered'`) require every open/carried id exactly once. There is no group kind that avoids the UPDATE: `root-cause`, `cleanup`, `not-a-defect`, `carry` and `escalate` all write `status` on each covered finding.

**Therefore every `--apply` of a real review fails at 23514 on the first of the 27**, whatever it routes. Slice 1's own commit message says the same and worked around it in QA. It is proved without a write: the predicate (`select 'a + b' !~ ' \+ '` → false) plus the constraint definition plus the row count.

**Where I put it: inside this slice, not a new ticket.** AGT-132's own sentence is that the Development Manager reviews findings from any source with one capability and routes each ticket. Slice 2 is the closing slice — there is no later slice to carry it — and until the UPDATE is allowed that sentence is untrue of every live row, so shipping the last of the routing without it ships a path that has never run on real data (pattern:95, pattern:1). It also fits: one migration, inside 20/21. The counter-argument (pattern:124: a pre-existing defect belongs in its own ticket, since AGT-131 wrote the constraint and AGT-70 the guard) is real, which is why the kickoff names it as a recorded Designer call in the STOP LINE rather than burying it in a task.

## 3. How to fix it — the option I took and the one I rejected

- **Taken: move the rule into `audit_findings_guard()` and drop the CHECK.** The real rule is "a finding names one source when written, and its `found_by` never changes afterwards". The guard already owns the second half; giving it the first half puts one rule in one home (pattern:14, pattern:15) and leaves enforcement fail-closed for every future insert. Mechanics the Builder must not get wrong: the INSERT branch has to come BEFORE the `ROW(NEW…) IS DISTINCT FROM ROW(OLD…)` compare, because on INSERT `OLD` is NULL and that compare would reject every insert.
- **Rejected: keep the CHECK and carve the legacy rows out by date** (`CHECK (found_by !~ ' \+ ' OR created_at < '<cutoff>')`). It is legal (row-local, immutable) and touches no trigger, but it bounds the problem instead of eliminating it and leaves a magic date in the schema for every later reader (pattern:1). It also splits one rule across two objects.
- **Rejected: rewrite the 27 rows' `found_by`.** It would need the guard suspended, and it destroys recorded provenance on an append-only table.

`capture_migration_down` detail that shapes task 1: reading its body, a `constraint` or `trigger` object that ALREADY EXISTS is REFUSED, and a single refusal sets `classification = 'refused'` and `down_sql = NULL` for the whole capture. So the migration names only the two functions (auto-downable) and writes the constraint and trigger down steps into the card by hand.

## 4. The guardrails split — why the Intent, not a second guardrails row

My first shape was a new `dm-guardrails-run-chain` row of type `guardrails` linked to `run-project` only. Reading `api/prompt/db-assembly.js` killed it: the guardrails branch (line 399) emits a section with `slug: typeSlug` and `order: SKILL_ORDER.guardrails` = 4, so two guardrails rows on one capability produce two sections with the same slug and the same order — undefined ordering at best, a silently dropped rule at worst. Moving the sentence into `dm-run-intent.method` avoids that entirely, adds no link (so `run-project` stays at 7 links and `ses-378d`'s `LINKS_AFTER` is untouched), and follows slice 1's own recorded decision 4, which put the review's rulings in `dm-audit-review-intent` rather than in `dm-guardrails`. `dm-run-intent` is linked to `run-project` and nothing else, so the rule reaches exactly the capability it governs.

## 5. Baseline, and two reds I did not cause

`node scripts/baseline-red-set.js --tests=agt-132-finding-routes,agt-86b-audit-review,ses-378d-manager-skill-rows,agt-68-devmanager,agt-144-model-assignment,agt-127-decide-gated-card` on the unchanged tree: red set 2 of 6.

- `ses-378d-manager-skill-rows` — RED on `dm-guardrails.guardrails.must_not must be UNCHANGED at 6`; live is 11. AGT-144 appended its five prohibitions and never re-pointed this pin. Task 3 repairs it to 11 because it is editing that file anyway; that is necessary to leave the file green, not scope creep.
- `agt-68-devmanager` — RED because its expected capability list is `[decide-gated-card, review-audit-worklist, run-project]` and live holds `model-assignment` too (AGT-144). Nothing in this slice touches it. Reported, not patched (pattern:96).

## 6. Caps, lanes, model

2 repo files + 1 migration; 5 tasks; caps 20/21. `claude-opus-5`, `orchestrator` lane per the live `runner_model_lanes` row — a SECURITY DEFINER rebuild plus a trigger on an append-only table is where a mechanical-lane slip becomes a live data defect (pattern:125). No model call in the shipped change.