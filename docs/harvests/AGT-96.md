# AGT-96 — premise dead: the re-pin already writes the decision row the rule asks for

**Verdict: removal proposed.** Every sentence of AGT-96's fix is already live on `origin/dev`
and in the ledger. Measured this cycle (v7.0.574, cycle 56e70f5e), not recalled.

## What the ticket claims, and what is actually there

The ruling on finding `00477906-e44b-4dfe-8eae-c2882e186159` (filed 2026-09-23 20:53Z by
`devmanager`) rests on one falsifiable sentence: *"The re-pin path writes no such row, so the two
rules state different conditions."* It is false.

**1. The re-pin step already calls `record_decision()` naming the ticket and the change.**
`scripts/render-cycle-card.js:368-390` (`repinKnowledge()`), on `origin/dev` since commit
`46f8cb2` — *v7.0.537 SES-424 slice 5, "the cycle card can be re-pinned"*, i.e. three days
**before** the auditor filed the contradiction. The body posts to `rpc/record_decision` with
`p_kind: "agent-row"`, `p_backlog_id: <ticket>`, and
`p_summary: "<ticket>: re-pin dm-knowledge-cycle-card <from> → <to>"` — the ticket and the change,
in one string. My working tree is byte-identical to `origin/dev` (`git rev-list --count
origin/dev..HEAD` = 0 and the reverse = 0, clean status), so this is dev's code, not a local draft.

**2. The before-image already hangs on that `decision_id`, and the decision precedes the write.**
`render-cycle-card.js:392-403`: image first (`table_name "skill_profiles"`, `pk_value live.id`,
`row_data: live` — the FULL prior row, because an UPDATE's undo is a restore), then the PATCH, then
a read-back that must classify `current` or it throws naming the standing decision to reverse.
Live proof of ordering rather than a reading of the code:

```
select d.id, d.decided_at, i.created_at, (i.created_at > d.decided_at) as decision_first ...
→ decision_first = true for all 6 most recent; row_data not null for all 6;
  pk_value = a3c42311-25da-431f-b96c-59ce2df53cd6 (the dm-knowledge-cycle-card row) for all 6
```

**3. The ledger, not the code, says the same thing.**
```
select count(*) ... from runner_decisions
where kind='agent-row' and summary ilike '%re-pin dm-knowledge-cycle-card%'
→ 18 rows, 18 unreversed, 0 reversed, 17 of 18 carry a full-row skill_profiles before-image,
  first 2026-09-18 09:04Z, last 2026-09-24 03:40:46Z (AGT-87, ~3h before this cycle).
  5 of them are since SES-424 slice 5 shipped; all 5 carry the script's exact summary template.
```
The one without an image is `106f5338` (SES-287, 2026-09-18, hand-run, pre-script) — evidence for
the script, not against it.

**4. MANAGER-AUTHORITY-MATRIX row 1 already cites that shape.** Live registry read
(`governance_rules.id = 'MANAGER-AUTHORITY-MATRIX'`, status `live`, `updated_at` 2026-09-20
09:43Z), row 1 verbatim: *"...under the ticket whose edit moved the card, in that commit, **as an
agent-row decision with a full-row before-image (AGENT-ROW-AGREED-TICKET, second limb)**..."* It
names the decision, the image, and the limb it satisfies. `docs/governance/RULES-SNAPSHOT.md:29`
carries the identical text, so registry and snapshot agree (SES-400) — there is no divergence to
repair either.

**5. The regression the ticket asks for exists.**
`tests/regression/ses-424e-patterns-cited.test.mjs` arm (B) drives the ladder on a drifted copy:
bare `--sync-knowledge` must exit 1 and must name `--repin`; `--repin` with no `--cycle-id` exits
2; `--repin --cycle-id=<uuid>` with no `--ticket` exits 2 — and then asserts **the live pin is
unchanged after all three refusals**, which is the control that separates "it exited 2" from "it
wrote and then exited 2". Below that, `runner_before_images_decision_id_fkey` (read from
`pg_constraint` this cycle) FOREIGN KEYs `decision_id` to `runner_decisions`, and the image is
written *before* the PATCH — so a re-pin hung on a decision that does not exist is refused by the
database before the row can move. Fail-closed, both layers.

## So the two rules state one condition, not two

`AGENT-ROW-AGREED-TICKET` (live, `updated_at` 2026-09-15 18:59Z) admits the edit when the ticket is
`scope_origin = 'john-named'` **or** *"an unreversed runner_decisions row names both the ticket and
the change"*. The re-pin writes exactly that row, before the write, unreversed, with the image. The
auditor's `governing_fact` paraphrases the limb as *"a prior decision row"* — even on that stricter
reading the script complies, because `record_decision()` is the first network call in
`repinKnowledge()` and the image and PATCH follow it.

## What I did NOT propose, and why

- **Adding a line to row 1 anyway.** The line the ticket wants is already the clause quoted in §4.
  A second sentence restating it would be doc bloat against a rule already at 3,666 B, and editing
  a John-sourced governance statement with no live gap is exactly what pattern:166 and pattern:94
  forbid without his words.
- **Hardening `--decision=<uuid>`.** The flag lets a slice share one handle (the rule's own "under
  one decision handle"), so the shared decision's summary may name a sibling change rather than the
  re-pin. The FK still guarantees a real, addressable decision. This is a hairline, it is not
  AGT-96's premise, and it would be a new row if anyone wants it — I am not filing it, because the
  rule's own text blesses the shared handle.
- **Any code change at all.** Nothing to change: pattern:95 — a ticket closes when every sentence
  of its own text is satisfied, and all four are.

## Baseline (step 3b), run on the unchanged tree

`node scripts/baseline-red-set.js --tests=tests/regression/ses-424e-patterns-cited.test.mjs,tests/regression/ses-424b-authority-matrix.test.mjs`

```
- tests/regression/ses-424e-patterns-cited.test.mjs — RED (exit 1): [FAIL] ses-424e-patterns-cited.test.mjs -- the real --sync-knowledge must exit 0, got 1
- tests/regression/ses-424b-authority-matrix.test.mjs — green
Red set: 1 of 2
```

Read that red correctly (pattern:162 — a check grades the change, never the live world): `424e`'s
control arm runs the real `--sync-knowledge` against the live row, and the live row is **drifted
right now** — `skill_profiles.dm-knowledge-cycle-card.traits.source_sha256` = `fbe7fb2b340fd4f8`
(live read) while `docs/runbooks/cycle-card.md` on dev renders `1a7a4c740ccaa0ba`
(`knowledgeRow()` computed locally on the committed card; both methods 8,468 B). That is an
outstanding re-pin owed by whichever ticket last moved the card — the mechanism working as
designed, flagging drift instead of self-healing — not a defect in the decision-row shape and not
AGT-96's subject. It is the pre-existing red the runner already sees on dev's "Tripwire +
regression (blocking)". `424b`, which asserts row 1's clauses and floors the re-pin population, is
**green**.

## Recommended disposition

Close AGT-96 as **already delivered** (not "won't fix"): its four build sentences were satisfied by
SES-424 slice 5 (`v7.0.537`, code) and by the 2026-09-20 row-1 amendment (`governance_rules`
`updated_at` 09-20 09:43Z, text). Set `audit_findings.status` on
`00477906-e44b-4dfe-8eae-c2882e186159` to resolved-by-evidence with this harvest as its citation,
and — the part worth more than the ticket — the finding's own ruling was written against rule text
only, never against `render-cycle-card.js` or the ledger, three days after the code shipped. If the
Auditor's contradiction pass gains one habit from this cycle, it is that a ruling asserting *"the
path writes no such row"* must cite the path.

Model for the removal write, per `runner_model_lanes`: **`claude-sonnet-5`** (mechanical lane —
a board status write and a finding status write, no judgment left in it). The judgment lane
(`claude-fable-5-1`) is not needed; this cycle's designer ran degraded on `claude-opus-5`.

Patterns applied: pattern:164 (know the environment before designing), pattern:95 (a ticket closes
only when every sentence of its own text is satisfied), pattern:162 (a check grades the change,
never the live world), pattern:94 (live evidence contradicting a rule is surfaced, not silently
patched), pattern:166 (a John rule is not amended without his words).
