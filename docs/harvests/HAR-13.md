<!-- DeepBench v7.0.715 | harvest | HAR-13 | cycle 839040e5 | Designer premise revalidation, 2026-09-29 -->
# HAR-13 -- premise revalidation: DEAD

## Verdict
Removal proposed. Every sentence of the ticket is either already satisfied or contradicted by live data (pattern:95), and the one action it defers to -- right-size the profiles that durable_hops truncation labels show hitting their ceiling -- has zero candidates after 68 days of labels. Designing a kickoff would be the blind bulk bump the ticket itself forbids.

## Live measurements (Supabase project via MCP, 2026-09-29)
1. `select count(*), count(*) filter (where max_tokens=1500), count(*) filter (where max_tokens<1500), min(max_tokens) from skill_profiles` -> total 164, at_1500 10, below_1500 11, min 300. The ticket says 60 rows / 11 at 1500 / 1500 is the floor. All three are false today: 1500 is the 7th distinct ceiling from the bottom (300, 400, 500, 800, 1024, 1200 sit below it).
2. The ten rows at 1500 today: ci-routing-intent, data-escalate-execute-intent, data-patch-execute-intent, eleanor-behavior, eleanor-catalog-knowledge, eleanor-identity, eleanor-knowledge, library-record-lookup-intent, library-write-intent, pattern-vocabulary-review-intent. The set differs from the ticket's list: library-catalog-intent and qg-review-intent are gone (both 3000), library-record-lookup-intent is new.
3. Both subjects the ticket names are already right-sized: library-catalog-intent 3000 (HAR-9's own kickoff task, docs/kickoffs/v6.3.131-HAR-9-truncation-aware-parse-retry.md), qg-review-intent 3000 (docs/ARCHITECTURE.md:2073, "fixed same day as HAR-16, max_tokens 1500->3000"). The "standout risk" sentence is discharged.
4. HAR-9 shipped: api/prompt/request-receivable.js:85 (v6.3.131 header) and :402 (`const wasTruncated = responseData.stop_reason === 'max_tokens'`). Its label surface is the error text in durable_hops.error (HAR-9 kickoff section 3: "Truncation remains queryable via durable_hops.error, which now carries the distinguishing wording -- that is the diagnostic surface this fix delivers").
5. `select count(*) from durable_hops where error ilike '%truncated at the model''s max_tokens limit%'` -> 2 rows total, first 2026-07-23, last 2026-07-28; grouped by the profile named in the error: library-catalog-intent 1, qg-review-intent 1. Both are profiles already raised to 3000. Zero labels name any of the ten rows now at 1500, across the 68 days since HAR-9 landed.
6. No column named like truncated / stop_reason / finish_reason exists in the public schema (information_schema.columns search); `ai_activity_log.call_facts->>'stop_reason' = 'max_tokens'` -> 0 rows ever. The only stop_reason the code ever propagates into call_facts is 'refusal' (request-receivable.js:741, :848; failureFacts() at :616). So the orchestrator's pointer is half right: no column, but the durable_hops text label HAR-9 promised does exist -- it has simply accumulated nothing for these rows.
7. HAR-12 ("cannot recover from a truncation on its own") is open at queue 210, kickoff_link null. It governs recovery, not ceilings, and is not a dependency of this verdict.

## Ceiling-proximity proxy for the ten rows (ai_activity_log, last 90 days, feature like '%<slug>%')
- ci-routing-intent: 842 calls, max output 542, 0 within 50 of cap, last 2026-09-17.
- library-record-lookup-intent: 367 calls, max 1951, 1 over cap, last 2026-09-17.
- library-write-intent: 172 calls, max 1500, 1 at cap, last 2026-08-01.
- data-patch-execute-intent: 512 calls, 4 over cap, last 2026-08-01.
- pattern-vocabulary-review-intent: 186 calls, 21 over cap (11%), max 2596, last 2026-08-11.
- data-escalate-execute-intent, eleanor-behavior, eleanor-catalog-knowledge, eleanor-identity, eleanor-knowledge: 0 calls in 90 days.
An output_tokens value above max_tokens is possible only because callModel() sums a parse retry's usage into the logged row (request-receivable.js:857). It proves a retry happened, not why: a schema omission retried at 800+800 also lands over 1500. It is a proxy, never the label the ticket asked to wait for.

## Candidate discoveries (evidence only; not filed -- this turn writes no tables)
A. pattern-vocabulary-review-intent hit or crossed 1500 on 21 of 186 calls (through 2026-08-11), each recovered by a paid retry. Narrow data-only candidate: raise that single row after confirming the path is still live (last call 7 weeks ago; LOG-94 already has its method text open). Not this ticket -- it names a different profile set and a different trigger.
B. A truncation the harness recovers from leaves no record: stop_reason 'max_tokens' reaches parseModelTurn() (:402) but is never written to call_facts, so the only signal a right-sizing pass can read is the summed-token proxy above. LOG-149 wrote the failed-call facts; the recovered-call fact is the gap. Logging home is api/ (.claude/rules, §19k omit-when-empty contract).

## Why no kickoff
The ticket's own guard -- "Deliberately NOT a bulk bump. Raising ceilings blind would destroy the very evidence HAR-9 truncation labelling exists to produce" -- is the reason. The evidence has been produced; it names nothing at 1500. Model that would have carried a data-only bump had one been warranted: mechanical lane, claude-sonnet-5 (runner_model_lanes, read live).

## Decision handle

Decision `eeadcafe-c9b0-4603-8830-05ead2091d21` (`kind = removal`, work class `bug_fix`), recorded by cycle `839040e5-1031-4eeb-b949-9f6742368297` at 2026-09-29T07:57:26Z and reversible until 2026-10-02T07:57:26Z. Briefing card `5ec900f0-63a9-4606-a39d-e4921bac0bd5` carries the evidence and the revival test. `backlog_items.status` is `removal proposed` with one before-image attached to the decision — the row is not removed, and only John clears it.

### One orchestrator pointer corrected by this revalidation

The orchestrator handed the Designer "no truncation-label column exists anywhere in the public schema, so the labels the ticket waits for do not exist." Half right, and the half that is wrong matters: there is no `truncated` / `stop_reason` / `finish_reason` COLUMN, but HAR-9 delivered its label as distinguishing TEXT inside `durable_hops.error`, which does exist and is queryable. The labels were produced; they simply name nobody at 1500. The verdict rests on the label being empty for those rows, never on the label being absent.
