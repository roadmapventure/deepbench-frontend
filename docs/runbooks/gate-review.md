<!-- DeepBench v7.0.401 | runbooks/gate-review.md | SES-312 — THE REVIEW DECIDES: THE ROW IT FILES CARRIES `decision = 'accept'` AND A 72-HOUR REVERSAL HANDLE, ITS NAMED SUCCESSORS ARE FILED IN THE SAME TRANSACTION, AND THE NEXT MILESTONE'S DRAIN DECLARES ITSELF THERE TOO. THE THING TO READ TWICE IS WHY THIS IS NOT THE EDIT THE `v7.0.367` STAMP FORBIDS. That stamp forbids *"rewriting the gate review to stop filing a card"* and says the rewrite *"belongs to `SES-286`'s reversal window and is a separate ticket"* — both conditions are met and neither is bent: `SES-286` is `done` (verified live, not recalled), `SES-312` IS that separate ticket, and the row is STILL FILED. § *The card* became § *The record* because what changed is that the row arrives already decided, not that it stops arriving; `ck_runner_items_epic_id_review_only` still admits `epic_id` only on this shape, which is exactly why step 8d can keep keying on it. THE DEFECT, and it had already stopped the platform: this file filed the review *"for John's Accept"* and prohibition 1 said the review *"writes no `backlog_items` row"* because *"his Accept on the card is what files them"*, while directive `0970abad` declares the next drain only once the review is ACCEPTED — and `SES-285` retired the card/tap surface, so no review could be accepted, no successor filed, no drain declared. The M5 review ran attended on 2026-09-02 and left NO `runner_items` row at all; the M6 gate wrote `18500000-…-a5` BY HAND so step 8d would not re-run it. A hand-written row is not a mechanism. WHY `accept` IS A RECORD AND NOT A RATING, asserted rather than assumed: `runner_items_decision_check` admits exactly `accept`/`reverse`/`rework`/`retired`, so "decided" has to be spelled in one of four words, and `public.apply_ladder_decision()` short-circuits every `gated_before_build` row before it reaches a rung — register `B34`'s reasoning, which `M6-07` is built on rather than reversing. So this write grades nothing and grants no autonomy. WHAT A REVERSAL ACTUALLY UNDOES, measured in a rolled-back fixture at this ship rather than reasoned about (two successors, next epic holding five open members): `applied`, 2 restored, 8 restored-but-unverifiable (the directive and its seven scope rows carry no `updated_at`), and **1 refused — the review's own `runner_items` record**, because `reverse_decision()`'s allowlist deliberately excludes the runner's evidence tables. A reversal therefore undoes everything the review FILED and leaves the fact that the review HAPPENED standing, and re-running a review after one is a NEW review with its own window. NAMED DEVIATION from the kickoff, which says *"prohibitions 2–4 unchanged"*: prohibition 2 as written (*"nothing creates a drain row but John's own declaration… it may never start it"*) forbids exactly what § *The decision and the successors* (4) does. That is the identical unreconciled-prohibition defect `runner-cycle.md`'s tail fixed at `v7.0.337`, so prohibition 2 now cites `0970abad`'s carve-out and states what is still John's alone; its substance is unchanged, and 3 and 4 are byte-identical. New prohibition 5 forbids the remaining escape hatch: ending without a decision. A split between the lenses is recorded VERBATIM and then ruled NARROW — the members both lenses named — never parked, because a split that parks the platform is the retired `B23` failure wearing the reviewers' clothes (`M6-06`). John's standing powers are stated once and unchanged: Reverse inside the window, the §2b switches, his pins and holds, and a human in chat outranking the queue. The two-lens paragraph and the `B34` annotation are kept exactly as annotated. Stamp count 3 of 5 per session-hygiene check 7, so no rotation was owed here. Doc-only in this file; guarded by `tests/regression/ses-312-succession-without-cards.test.mjs`. -->
<!-- DeepBench v7.0.367 | runbooks/gate-review.md | SES-289 — THE ONE B34 CITATION IN THIS FILE IS ANNOTATED, and the thing to read twice is THAT NOTHING ABOUT THE GATE REVIEW'S OWN PROCEDURE CHANGED. SES-285 superseded B34 by M6-07 on 2026-09-01; the card block's claim — an Accept on a gated_before_build card is permission, not a rating, and touches no ladder rung — is still true, still John's "no", and still enforced in SQL by public.apply_ladder_decision(), which short-circuits every gated row. B34 was right and stays right; what the supersession changed is that its subject no longer arrives, and M6-07 is built on B34's reasoning rather than reversing it. So this marker records the rule's STATE, not a change of instruction. THE EDIT THIS FORBIDS: reading the marker as licence to rewrite the gate review to stop filing a card. That rewrite belongs to SES-286's reversal window and is a separate ticket; annotating says "this rule is withdrawn, M6-07 replaces it", rewriting says "here is what to do instead", and only the first is safe today. Before this ship the truth tripwire read this file's line 94 as a withdrawn rule stated in live voice — one of 14 gating FLAGs across three runbooks that turned CI red on every push. After: "GATE: clear", exit 0. Stamp count 2 of 5 per session-hygiene check 7, so no rotation was owed here. Doc-only: no src/api/lib change, no site change, no schema change, no migration, no registry write. -->
<!-- DeepBench v7.0.220 | runbooks/gate-review.md | SES-179 — NEW FILE: the milestone gate review, John's directive 2026-08-23. Two governance-lane reviewer agents (PM lens + Chief Architect lens) run with fresh context at each epic retirement and file ONE joint verdict as a gated card. FOUND LIVE while building it, and it is why this is not a mechanism built ahead of need: TWO milestone drains had ALREADY retired ungated — 01758f26 (Selfbuild M0, done, retired by cycle e42f8d4e) and 69e61a6c (Selfbuild M1, done, 4b874066), both 2026-08-24 — while docs/SELFBUILD-CHARTER.md named SES-179 gate reviews in nine places, including as the project's own exit exam. THE ONE THING AN EDITOR MUST NOT COLLAPSE: a review PROPOSES successor members and John's Accept FILES them (charter §Closure discipline item 3, verbatim: "never a cycle's solo close-out call"). A review that filed its own successors would turn a check ON the runner into a widening OF it, and drain_epic_next() property 5 — nothing creates a drain row but John — stands untouched behind it. The trigger is a SWEEP over evidence, never a branch on drain_epic_next()'s return value: that function has two call sites (step 5 and step 9 Gate B) and since SES-189 one call may retire more than one directive while returning only the last, so a call-site branch misses retirements by construction and could never have caught M0/M1 at all. -->

# Milestone Gate Review — the procedure (`SES-179`)

**What it is.** At every epic retirement, two governance-lane reviewer agents read the retiring
milestone with **fresh context** and file **one** joint verdict as a `gated_before_build` record on
John's briefing — **already decided, and reversible for 72 hours** (`SES-312`, `v7.0.401`). <!-- FEATURE: SES-312 — the file's own definition stops describing a request for permission. -->
It is the charter's item 7 under *Multi-agent verification*, and the mechanism
its §Closure discipline depends on.

**Who triggers it:** `runner-cycle.md` **step 8d**, a Phase-3 sweep. That step owns *when*; this
file owns *what* — cited there, never restated, so the two cannot drift the way step 5 and step 7
did before `v7.0.114`.

**Governance-lane roles, never product roster agents** (charter §7, verbatim). These reviewers are
runner-lane lenses. Do not reach for `src/data/agents.js`; nothing here touches the bench.

---

## The three directions — all mandatory

A review that skips one is not a review. Charter §Multi-agent verification item 7:

| Direction | The question | Evidence it must cite |
|---|---|---|
| **Backward** | Does the retired milestone's shipped work actually satisfy the charter sections it claimed to satisfy? | Ship SHAs, `runner_items` ship cards, the charter section by name — a charter-conformance audit of completed work (John, 2026-08-23) |
| **Present** | Does every rule retired this milestone have its replacement **live and green**? Net burndown reported. | `docs/SELFBUILD-RETIREMENT-LEDGER.md`, test/CI output, the burndown query below |
| **Forward** | Does the next milestone's design still fit **measured** reality? | The next epic's members, and what this milestone actually measured |

The **backward** direction is the one most easily reduced to a checklist of "did the tickets
close". It is not that question. Tickets closing is `open_now = 0`, which the drain already proved
before it retired; the review asks whether the *charter claim* those tickets stood for is now true.

## The two lenses

Run both, **in parallel, with fresh context**, via the `Agent` tool. Model per `runner-cycle.md`'s
model discipline (register B21): this is judgment-dense work — **Fable 5** (`claude-fable-5`).
State the clone's absolute path in each prompt (a subagent given a bare task defaults to the
discoverable-but-wrong shared checkout), and tell each to read `docs/SELFBUILD-CHARTER.md` and
`CLAUDE.md` as part of its own bootstrap rather than hand-enumerating today's decisions into the
prompt.

- **PM lens** — members delivered vs. named, slippage, whether the estimates that shaped the next
  milestone still hold, net burndown.
- **Chief Architect lens** — does the next milestone's design still fit what this milestone
  measured; which of its assumptions were disproved; what should change before it is drained.

**A reviewer cannot edit and cannot approve.** Verdict-only, fresh context, never the author's
conversation (charter §Multi-agent verification item 1). **A subagent that has not returned is not
a result** (`SES-83` (d) cycle 4): either wait for both lenses or file the card saying which lens
is missing and why — never convert a silent agent into a finding.

**Disagreement between the lenses is a result, not a problem to resolve.** Put both positions on
the card in their own words. A synthesized consensus that papers over a real split is worth less to
John than the split itself, and he is the one who decides it.

## Net burndown — the number the review must report

Closed vs. filed for the retiring milestone. `runner_drain_scope` holds the members John **named**
at declaration time (`SES-142`), so "filed" is exactly the epic's rows that are not in that scope:

```sql
-- Net burndown for a retiring milestone. Pass the retired drain's directive id.
SELECT e.name AS milestone,
       count(*) FILTER (WHERE s.item_id IS NOT NULL)                          AS named,
       count(*) FILTER (WHERE s.item_id IS NOT NULL
                          AND b.status IN ('done','removed'))                 AS named_closed,
       count(*) FILTER (WHERE s.item_id IS NULL)                              AS filed_since_naming,
       count(*) FILTER (WHERE s.item_id IS NULL
                          AND b.status NOT IN ('done','removed'))             AS filed_still_open
  FROM public.backlog_items b
  JOIN public.epics e            ON e.id = b.epic_id
  JOIN public.runner_directives d ON d.epic_id = e.id AND d.id = '<retired directive id>'
  LEFT JOIN public.runner_drain_scope s
         ON s.item_id = b.id AND s.directive_id = d.id
 GROUP BY e.name;
```

**Filing faster than closing is a flag on John's page** (charter §Closure discipline item 4) — so
report `filed_since_naming` even when it is zero, and never net it away against `named_closed`.
Two figures, not one: they measure different things, and a single "net" number hides which.

**`delivered` is deliberately not counted as closed.** It means the runner finished and John has
not yet accepted (`SES-154`), and a review that counted it would be scoring the milestone on the
runner's own say-so — the same authorisation boundary that keeps `delivered` out of
`drain_epic_next()`'s retirement predicate.

## The record

<!-- FEATURE: SES-312 — the review's runner_items row keeps its shape and stops waiting for a tap. -->
**One record per retirement, and it is a record of a decision rather than a request for one**
(`SES-312`, `v7.0.401`). It is still built exactly like any other `runner_items` row
(`runner-cycle.md` step 9), with the same three fields specific to this kind:

- **`kind = 'gated_before_build'`.** Forced, not chosen: `runner_items_kind_check` admits exactly
  `'ship'` and `'gated_before_build'`. The semantics are also the right ones — an Accept on a gated
  card is **permission, not a rating**, and touches no ladder rung (register B34 — superseded
  2026-09-01 by `M6-07`, `SES-285`, annotated `SES-289`; B34's reasoning is what `M6-07` is built on
  and `apply_ladder_decision()` still enforces it, so this semantics claim is unchanged — John's
  "no"). A
  gate review is precisely that transaction: the runner did not build the next milestone's members
  and is asking whether they may be filed.
- **`backlog_id = NULL`, `display_ref = '<Epic name> — milestone gate review'`.** A gate review is
  not about one ticket, and `ck_runner_items_backlog_id_bare` rejects a composed string outright
  (`SES-116`).
- **`epic_id` = the retiring epic.** This is the key step 8d's sweep joins on; without it the record
  is invisible to the sweep and the same review is filed every cycle, forever.
  `ck_runner_items_epic_id_review_only` admits `epic_id` only on this shape, which is why the row
  survives even as the tap that used to decide it does not.

**And it is written already decided:** `decision = 'accept'`, `decided_at = now()`, and
`decision_reason` = **both lenses' verdicts in their own words** — the three directions' findings,
the burndown figures, and, separately and explicitly labelled, the successor members the review
names, each with the evidence that earns it a place. Where the lenses **disagree**, both positions
go in verbatim and the ruling is **the narrower scope** — the members both lenses named. A split
that parks the platform is the retired `B23` failure with a new face (`M6-06`), so the review
records the split and still rules.

**Why `accept` is the value, and it is a record rather than a rating.** It is the constraint's own
vocabulary — `runner_items_decision_check` admits exactly `accept` / `reverse` / `rework` /
`retired`, so "decided" has to be spelled in one of those four — and the trust ladder never reads
it: `public.apply_ladder_decision()` short-circuits every `gated_before_build` row before it reaches
a rung (register B34's reasoning, which `M6-07` is built on rather than reversing). So writing
`accept` here grades nothing and grants no autonomy. It records that this review reached a verdict,
which is exactly what directive `0970abad` asks the next drain's declaration to stand on.

The plain-language columns are required like any card (`plain_cant` / `plain_after` /
`plain_worth`, `v7.0.146`), and a ticket named anywhere John reads it carries **ID + title** via
`public.backlog_display_title()`, never a bare id (`SES-119`). `plain_worth` additionally carries
the decision's handle sentence, in `runner-cycle.md` 7b's exact words:
`Decision <id> — reversible until <expires_at, CST>: select public.reverse_decision('<id>', 'John', '<why>');`

**John's standing powers are unchanged by any of this** — Reverse on any decision inside its window,
the §2b settings switches, his pins and holds, and a human in the chat outranking the queue
entirely. What changed is only that the platform no longer *waits* on him between a review ending
and the next milestone starting.

**The M5 precedent, and why it is a precedent rather than a mechanism.** `runner_items`
`18500000-…-a5` (`Selfbuild M5 - Closed-Loop Healing — milestone gate review`, `decision = 'accept'`)
was written **by hand** at the M6 gate, after the M5 review ran attended on 2026-09-02 and left no
row at all — so step 8d would not re-run it and `0970abad` had provenance to cite. A hand-written
row is not a mechanism; this section is what makes the next one arrive by itself.

## The decision and the successors, one transaction

<!-- FEATURE: SES-312 — the review decides, files its named successors and declares the next
     drain inside one recorded decision, and the handle is what makes over-filing safe. -->
**Everything below happens in ONE `DO` block, and that is load-bearing rather than tidy.**
`runner-cycle.md` 7b carries the reason in full: `now()` is frozen for the length of a transaction,
and `reverse_decision()` refuses any row whose live `updated_at` is **later** than the image it
would restore from. Record the decision in one statement and file in the next, and the reversal
counts every row `refused`, restores nothing, and **still returns `outcome = 'applied'`** — the
decision is silently un-undoable, which is the one failure this whole mechanism exists to prevent.

**Write order is fixed: decision → record → successors → drain → recompute.** The decision comes
first because it is the only thing that hands out an id, and **every before-image below carries
that `decision_id`** (§19v: no before-image, no write). Each filing is an INSERT, so each image
carries `row_data = NULL` — step 8b's convention, meaning *"this row did not exist; Reverse is a
DELETE of this pk."* That pair — a `NULL` image per filed row, all pointing at one decision — **is
the anti-widening handle:** a review that over-files is one `reverse_decision()` from undone.

```sql
DO $$
DECLARE
  k_retiring uuid := '<the retiring epic''s id>';
  k_next     uuid := '<the next milestone''s epic id>';
  v_dec  uuid;   v_item uuid;   v_dir uuid;   v_row uuid;
  v_ord  integer;  v_exp timestamptz;  r record;
BEGIN
  -- (1) THE DECISION. Attended: (NULL, '<short-session-name>'). Unattended cycle: ('<cycle id>',
  -- NULL). record_decision() raises unless EXACTLY ONE is set (ck_decision_attribution), and the
  -- 72-hour window is read from runner_settings.reversal_window_hours — a column, never a literal.
  -- The ladder work class is NULL: a review is about no single ticket, so it moves no rung.
  v_dec := public.record_decision(
    NULL, '<short-session-name>',
    'gate', NULL,
    '<Epic name> — milestone gate review: decided, N successor members filed, <next epic> drain declared',
    '<the three directions'' findings, both lenses in their own words, the burndown figures, and the ruling — verbatim on a split, narrower scope>',
    NULL);

  -- THE SECTION'S OWN ASSERT, and it is the negative control this procedure is graded by: nothing
  -- below may be filed outside the decision (M6-05). ck_before_image_attribution catches a
  -- mis-attributed image; only this line catches a filing with no decision at all.
  IF v_dec IS NULL THEN
    RAISE EXCEPTION 'no decision id — a review files nothing outside its own decision (M6-05)';
  END IF;
  SELECT d.expires_at INTO v_exp FROM public.runner_decisions d WHERE d.id = v_dec;

  -- (2) THE RECORD (§ The record above). Image first, row_data NULL, decision_id set.
  v_item := gen_random_uuid();
  INSERT INTO public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  VALUES (NULL, '<short-session-name>', 'runner_items', v_item::text, NULL, v_dec);

  INSERT INTO public.runner_items
    (id, cycle_id, kind, backlog_id, epic_id, display_ref, title,
     decision, decided_at, decision_reason, plain_cant, plain_after, plain_worth, model)
  VALUES (v_item, '<cycle id>', 'gated_before_build', NULL, k_retiring,
          '<Epic name> — milestone gate review', '<Epic name> — milestone gate review',
          'accept', now(),
          '<PM lens, in its words. Chief Architect lens, in its words. On a split: both, then the narrower ruling.>',
          '<plain_cant>', '<plain_after>',
          format('<plain_worth>. Decision %s — reversible until %s CST: select public.reverse_decision(''%s'', ''John'', ''<why>'');',
                 v_dec, to_char(v_exp AT TIME ZONE 'America/Chicago', 'YYYY-MM-DD HH24:MI'), v_dec),
          '<model>');

  -- (3) THE SUCCESSORS — ONLY members this review named in its own findings (§ What a review must
  -- never do, 1). Full FILE-MATRIX field set; ids claimed as ONE atomic block per prefix
  -- (CLAUDE.md's atomic-counter rule — never one id plus hand-counting), and passed in here.
  SELECT coalesce(max(b.row_ordinal), 0) INTO v_ord FROM public.backlog_items b;
  FOR r IN SELECT * FROM (VALUES
      ('<SES-NNN>', '<title>', '<the evidence that earns it a place>', '<S|M|L>', 1::smallint, true),
      ('<SES-NNN>', '<title>', '<the evidence that earns it a place>', '<S|M|L>', 2::smallint, false)
    ) AS t(bid, ttl, descr, stamp, cycles, required)
  LOOP
    v_ord := v_ord + 1;
    v_row := gen_random_uuid();
    INSERT INTO public.runner_before_images
      (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    VALUES (NULL, '<short-session-name>', 'backlog_items', v_row::text, NULL, v_dec);

    INSERT INTO public.backlog_items
      (id, backlog_id, title, description, tier, type, priority_class, status,
       source_file, row_ordinal, epic_id, milestone, milestone_required,
       scope_origin, size_stamp, predicted_cycles, defer_status, scope_rationale, filed_at)
    VALUES (v_row, r.bid, r.ttl, r.descr, 'now', '<type>', '<P1–P10 class>', 'open',
            'session-<short-session-name>', v_ord, k_next, '<next milestone, M0–M9>', r.required,
            'gate-review', r.stamp, r.cycles, 'no',
            '<which charter goal it advances and why it is not scope creep>', now());
  END LOOP;

  -- (4) THE DRAIN — directive 0970abad, drain_epic_next() property 5's ONE pre-authorised
  -- exception, cited by id in the body along with this review's record and this decision.
  v_dir := gen_random_uuid();
  INSERT INTO public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  VALUES (NULL, '<short-session-name>', 'runner_directives', v_dir::text, NULL, v_dec);

  INSERT INTO public.runner_directives (id, type, status, epic_id, body)
  VALUES (v_dir, 'drain-epic', 'queued', k_next,
          format('STANDING DRAIN SUCCESSION under directive 0970abad (John, 2026-08-29, "run both"): '
                 || '<next epic> declared by its predecessor''s gate review. Provenance: runner_items %s, '
                 || 'runner_decisions %s (reversible until %s CST). Scope is the fixed member list below '
                 || '(SES-142 form); nothing joins it after this naming.', v_item, v_dec,
                 to_char(v_exp AT TIME ZONE 'America/Chicago', 'YYYY-MM-DD HH24:MI')));

  -- The scope: the next epic's OPEN members — which now INCLUDES the successors filed at (3),
  -- because they were filed into that epic as `open` in this same transaction. ONE query, not two
  -- lists to reconcile. Already-`done` members are deliberately not named (naming a closed ticket
  -- adds nothing and only moves the retirement predicate's finish line).
  FOR r IN SELECT b.id, b.backlog_id FROM public.backlog_items b
            WHERE b.epic_id = k_next AND b.status NOT IN ('done','removed')
  LOOP
    v_row := gen_random_uuid();
    INSERT INTO public.runner_before_images
      (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    VALUES (NULL, '<short-session-name>', 'runner_drain_scope', v_row::text, NULL, v_dec);
    INSERT INTO public.runner_drain_scope (id, directive_id, item_id, backlog_id)
    VALUES (v_row, v_dir, r.id, r.backlog_id);
  END LOOP;

  PERFORM public.recompute_backlog_queue();

  RAISE NOTICE 'gate review decided: decision % reversible until %; record %; drain %',
    v_dec, v_exp, v_item, v_dir;
END $$;
```

**Composition was settled by precedent, not by judgment** (`runner-cycle.md`'s tail passage): the
M3 drain (`6810599f`) named the epic's then-open members **plus** the tickets filed straight after
the preceding gate review — 19 + 4; the M4 declaration (`4583bdc1`) followed the same shape, 4 + 4;
the M5 declaration (`238aa9ca`) named 18. The single query at (4) reproduces exactly that shape,
because (3) filed the successors into the same epic in the same transaction. Do not re-derive it.

**What the reversal actually undoes, measured in a rolled-back fixture at this ship rather than
reasoned about** (retiring epic → next epic, two successors, next epic holding five open members):
`reverse_decision()` returned `applied`, **2 restored** (the two `backlog_items`, which carry
`updated_at`), **8 restored-but-unverifiable** (the directive and its seven scope rows — neither
table has an `updated_at` column, so the engine writes and *reports* the doubt rather than refusing
it), and **1 refused: the review's own `runner_items` record.** That refusal is by design and is
worth reading twice — `reverse_decision()`'s allowlist admits `backlog_items`, `runner_directives`,
`runner_drain_scope`, `runner_settings`, `governance_rules` and `epics`, and deliberately excludes
the runner's own evidence tables, because replaying them rewrites the record of the decision instead
of its effect. So **a reversal undoes everything the review filed and leaves the fact that the
review happened standing** — the successors, the drain and its scope rows are gone, `decision`
becomes `reversed`, and step 8d's idempotence key survives, so the reversal does not silently
re-queue the same review. Re-running a review after a reversal is a **new** review with its own
decision and its own window.

## What a review must never do

1. **File a successor it did not name in its own findings, or file anything outside the decision's
   transaction.** Charter §Closure discipline item 3: gate reviews are the only path for adding
   members to a later milestone, *"batched and visible to John, never a cycle's solo close-out
   call."* That promise is now kept by the **decision row and the standing brief's *Open decisions*
   block** (`SES-286c`) rather than by a tap — batched, visible, and reversible for 72 hours. What
   the prohibition still forbids is **widening**: a member absent from the review's own text, or a
   row filed in a second statement where no `decision_id` can reach it.
2. **Create, activate, or extend a drain — outside the one succession John pre-authorised.**
   `drain_epic_next()` property 5 stands untouched: nothing creates a drain row but John's own
   declaration, **and its single pre-authorised exception is directive `0970abad`** — the next
   milestone's drain, declared by this review with the scope this review named, per § *The decision
   and the successors* (4) and `runner-cycle.md`'s *"THE ONE DRAIN A CYCLE MAY WRITE"*. <!-- FEATURE: SES-312 — the carve-out is cited here instead of contradicted here. -->
   Reconciled here for the same reason the runbook's tail reconciled the identical sentence at
   `v7.0.337`: this line predates `0970abad`, and a review reading only the bare prohibition would
   refuse the one declaration John explicitly pre-authorised. **Any drain outside that exact shape
   is still John's alone to write** — a second epic, a widened scope, a lifted hold, a re-activated
   drain. A review may never start a milestone whose scope it did not name.
3. **Adjudicate the retirement.** The drain retired because every **named** member closed. A review
   that re-argues whether it should have retired is re-deciding a settled predicate; what it may
   say is that the milestone's charter claim is *not* satisfied — which is a finding for the card,
   and John's to act on.
4. **Run more than one review per cycle.** Step 8d takes the oldest un-reviewed retirement and
   stops. Two reviews in one cycle is two builds.
5. **End without a decision.** <!-- FEATURE: SES-312 — a split is recorded, then ruled, never parked. -->
   A split between the lenses is **recorded verbatim and then ruled narrow** — the members both
   lenses named — never parked (`M6-06`). There is no state in which a review finishes and the next
   milestone is waiting on somebody: no card, no escalation, no wait. A review that could not reach
   a verdict on one lens because that lens **never returned** says so in `decision_reason` and rules
   on the lens it has (`SES-83` (d): a subagent that has not returned is not a result, and it is
   never converted into a finding). Parking is the retired `B23` failure inverted, and it is the one
   outcome this whole mechanism exists to remove.
