# AGT-91 — Retirements left governance_rules rows pointing at retired homes

## Premise revalidation (live, 2026-09-24, against the clone at 6642bcdd)

| Claim in the ticket | Checked how | Result |
|---|---|---|
| `api/cron/rank-backlog.js` is gone | `ls api/cron/` | **No such directory.** `api/` holds `_lib, agent-configs.js, brief.js, capabilities, extract.js, fetch-article.js, load-entries.js, plan.js, prompt, rag-query.js` |
| The cap moved to the session path | `grep -rn MAX_CANDIDATES` | `scripts/rank-backlog.js:126` — `export const MAX_CANDIDATES = 60;` |
| OD-42 still names the cron route | `select … from governance_rules` | Yes, in `statement`, `updated_at 2026-09-09` |
| OD-04 still conditions on the Prime Directive | same | Yes — "…emitted whether the Prime Directive stands or not" |
| B10 still names B3's tie-break | same | Yes — "…to support newest/oldest tie-breaking", while its own canonical doc already says the M5-02 filing lane |
| The retirement procedure has no re-point step | read `SELFBUILD-RETIREMENT-LEDGER.md` Contract, lines 4–12 | Confirmed. The Contract is also the only home of that procedure — `runner-cycle.md` only *cites* entries (6 hits, all citations) |

**Premise alive, and wider than filed.** The grep the ticket's own fix sentence prescribes ("grep governance_rules statement/canonical_doc for the retired path or predicate") returns a **fourth** live row the ticket does not name:

- **OD-19** — "The Prioritizer's nightly board re-rank is a VERCEL cron at `10 9 * * *` … canonical: `vercel.json` `crons[0]`, with the reasoning in `api/cron/rank-backlog.js`."
- `vercel.json` in the live tree declares **no `crons` key at all**, and the route it points at does not exist. OD-19's canonical home is therefore entirely gone — a worse state than OD-42's, which at least names a file whose successor exists.

It ships in this cycle rather than as a new ticket under pattern:95 (a ticket closes only when every sentence in its own text is satisfied) — the "grep … each hit … in the same ship" sentence is the ticket's own acceptance criterion, and re-filing the hit it produces would be discharging that criterion under a new number.

## The three-homes trap, checked rather than recalled

`tests/regression/ses-234-operational-defaults.test.mjs` assertion 3: each OD row's `statement` is byte-for-byte the blockquote under its anchor in `docs/design/2026-09-09-operational-defaults-census.md`. Its snapshot arm always runs and reads `docs/governance/RULES-SNAPSHOT.md`, so a forgotten `node scripts/export-governance-snapshot.js` fails there too. Three homes, one commit.

Two traps in that file the kickoff had to route around:

- **Assertion 4 (`REQUIRED_HOMES`)** demands fifteen tokens survive somewhere in the group, two of which live in rows we touch: `pz-rank-intent` and `prime_directive_queue`. Measured which rows hold them rather than assuming — `pz-rank-intent` is in OD-42 **and OD-43**; `prime_directive_queue` is in OD-04, 05, 07, 08, 11 and 42. So neither is uniquely at risk, and the new strings keep both anyway. `cron_minute` and `scheduler_gate` are held by OD-14/15/16/17, none of which we touch.
- **Assertion 6** bars duplicate live statements; all four new strings are distinct.

**B10 is a different animal and the ticket's hint was right to flag it.** Its `source_group` is `runner-gov-register` and its `canonical_doc` is `docs/RUNNER-GOV-0820-REQUIREMENTS.md#B10`, not the census. `ses-280-m5-governance-rules.test.mjs` guards byte-identity for the **M5** register only; nothing pins the B-series statement to its doc. So B10's bullet is edited for substance, not bytes. The one live constraint on it is `check-session-docs.js` check 10's `anchorResolves()`, whose fallback (d) matches `\*\*B10[.:)\s—-]` — so the `- **B10. ` bold lead-in must survive or the anchor stops resolving and check 10 emits a WARN.

## Line-number drift, verified

The ticket's audit finding cites `docs/RUNNER-GOV-0820-REQUIREMENTS.md:154` for B10's bullet. It is at **line 156**. Census anchors read live: OD-04 heading 65 / blockquote 67, OD-19 heading 204, OD-42 heading 431 / blockquote 433. The ledger Contract is lines 4–12.

## Baseline red set

`node scripts/baseline-red-set.js --tests=tests/regression/ses-234-operational-defaults.test.mjs,tests/regression/SES-176-truth-tripwire.js,tests/regression/SES-200-rule-copy-and-procedure-homes.js,tests/regression/ses-280-m5-governance-rules.test.mjs`

```
- tests/regression/ses-234-operational-defaults.test.mjs — green
- tests/regression/SES-176-truth-tripwire.js — green
- tests/regression/SES-200-rule-copy-and-procedure-homes.js — green
- tests/regression/ses-280-m5-governance-rules.test.mjs — green
Red set: 0 of 4
```

Every red the Builder sees in these four is its own. The eleven suite-wide standing failures are carried in the kickoff so the Builder can tell them apart; the suite reads 262/273.

## Why the new statements read the way they do

- **OD-42** is expressed as a *diff* rather than a full string, because the row and the census blockquote are byte-identical today (verified), so the diff is unambiguous and it saved ~240 bytes against the 8,192 cap without losing a fact. The "TRUNCATED ranking is worse than a refused one" reasoning is John's and is deliberately preserved verbatim — a byte cap is not a licence to delete governance reasoning (pattern:166).
- **OD-19** is a full rewrite because nothing of its old claim survives: the cron, its minute, its timezone argument and its canonical file are all gone. The replacement carries the *live* cadence from two sources that already agree — `runner-cycle.md` step 4c ("once per CST day … on the first scheduled cycle that passes the walls", plus the `SCHEDULED-AGENT: rank-backlog` `ended_at` day gate) and `scripts/rank-backlog.js:21`.
- **OD-04** changes one clause only. "Whether the Prime Directive stands or not" becomes "whether or not an executing project exists", which is what `SES-340` made the predicate (`EXISTS (projects WHERE status='executing')`). `prime_directive_queue()` remains canonical — that part of the row was never wrong.
- **B10** inverts the sentence: the M5-02 filing lane is the live purpose, B3's tie-break the superseded original. That is exactly what its own canonical doc bullet has said since SES-280; the registry row is the copy that never caught up.

**A self-contradiction caught during drafting, worth recording.** The first draft of the test forbade the token `newest/oldest` in any live statement — but the new B10 statement *must* mention B3's tie-break to say it was superseded. The forbidden token was narrowed to the retired phrasing `support newest/oldest`, and OD-19's replacement stopped naming `api/cron/rank-backlog.js` (it says "retired with its route"). Verified against live data that the narrowed predicate still returns exactly the same four rows.

## Alternatives considered and rejected

1. **Put the new retirement step in `runner-cycle.md`.** Rejected: that file is 380,253 bytes against a 381,000 ceiling with `ses-413d` pinning the exact count, so any edit costs a re-pin — and the step does not belong there anyway. The ledger's own Contract paragraph is the only home of the retirement procedure, so extending it is pattern:17 (extend the structure that already fits). This design touches runner-cycle.md **zero** times.
2. **Supersede the four rows instead of amending them.** Rejected: nothing about what OD-42 caps, when the re-rank runs, how the lanes are ordered, or why `filed_at` is mined has stopped being true. Only the *home* and the *condition* moved. Superseding would file four new ids for facts that never changed and would break the census manifest (assertion 5 demands exactly OD-01..OD-44).
3. **A generic "every canonical_doc path must exist on disk" check.** Rejected as scope (pattern:65): it would flag rows well outside this ticket, and the statement-level referents here (`vercel.json` `crons[0]`, a predicate name) are not paths a path-existence check could see. Worth its own ticket if anyone wants it.
4. **Apply the change as a migration.** Rejected: this is DML on four rows, not DDL. The reversal path is `record_decision()` + one `runner_before_images` row per row (`pk_value` is governance_rules' **text** `id` — confirmed from `pg_index`, not assumed), which is the mechanism `runner-cycle.md` line 2338 already requires of every retirement. `reverse_decision()`'s allowed-table list is reported to include `governance_rules` (SES-333's note); the kickoff makes the Builder confirm that from `pg_get_functiondef` this session rather than trusting the note, and write the images either way.

## Model choice

`runner_model_lanes` read live: orchestrator `claude-opus-5`, mechanical `claude-sonnet-5`, judgment `claude-fable-5-1`. The build is named to the **mechanical** lane because every string, every SQL statement and every file location is supplied in the kickoff — there is no judgment left in it. That is the lane's own stated purpose ("doc sweeps, imports, formatting"), and it is the cheaper economics under pattern:125. If the Builder finds itself *deciding* wording, that is a signal the kickoff was wrong and it should stop.

## Residue

None filed. OD-19 was absorbed rather than filed, for the reason above. No other live row matched the retired referents (the query returned exactly B10, OD-04, OD-19, OD-42 out of 147 live rules).
