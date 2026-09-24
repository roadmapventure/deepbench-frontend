# AGT-90 — harvest (design reasoning, not required reading)

Designed 2026-09-24 for `v7.0.568`, cycle `b7ecc564-e9b6-42ff-8bc4-27d9a71b8775`.

## 1. The premise, remeasured

The ticket title says **24** rows. It is stale. Live read this hour
(`public.skill_profiles`, service key):

```sql
select llm_model, count(*) n, count(*) filter (where temperature is not null) with_temp
from public.skill_profiles group by 1 order by 2 desc;
```

| llm_model | rows | temperature not null |
|---|---|---|
| claude-fable-5-1 | 54 | **39** |
| claude-haiku-4-5-20251001 | 48 | 12 |
| claude-sonnet-4-6 | 21 | 3 |
| claude-opus-5 | 14 | 14 |

All 39 store exactly `0` (`min(temperature) = max(temperature) = 0`). 15 fable rows are already
NULL, so the UPDATE is a partial, not a sweep. **Premise: alive, and 62% larger than the ticket
claims.** The Development Manager's 39 is the number that reproduces.

The 29 non-fable rows carrying a temperature are **correct** and must not be touched. That is the
single most likely way this ticket is shipped wrong: a `SET temperature = NULL` that forgets its
WHERE clause looks identical in the diff and identical in the "0 rows now carry it" assertion.
Hence §6's second control.

## 2. What the code does today (read first-hand, not recalled)

`shared/models.js:70`

```js
export const NO_TEMPERATURE_PREFIXES = ["claude-fable-"];
export function supportsTemperature(model) {
  if (typeof model !== "string" || !model) return true; // unknown model: keep today's behaviour
  return !NO_TEMPERATURE_PREFIXES.some(p => model.startsWith(p));
}
```

`api/prompt/request-receivable.js`, inside `buildCallBody()` (the SES-334 block, ~line 274):

```js
const temperatureField = (temperature !== undefined && temperature !== null && supportsTemperature(model))
  ? { temperature }
  : {};
```

So the stored `0` is **inert at call time today**. SES-334 resolved the drop once, for all four
return branches, precisely so a fifth branch could not silently reintroduce it. That is why this
ticket is P10 Tooling and not a P1 outage: nothing is currently breaking.

It is still worth fixing, and the reason is the honest one rather than the dramatic one: the row
says something about the call that is false, and exactly one predicate stands between that false
statement and the hard 400 SES-334 measured (`invalid_request_error: 'temperature' is deprecated
for this model`, request_id `req_011CetZC6P5V2rF1Jri25YJN`, 2026-09-09). Data that is only correct
because code compensates for it is the platform's stated premise to remove (pattern:2).

## 3. Literal pattern vs. the constant (SES-45, one home)

Today `NO_TEMPERATURE_PREFIXES` has exactly one entry, so `llm_model LIKE 'claude-fable-%'` and
"every model the constant forbids" select the same 39 rows. They are the same set by coincidence,
not by construction.

- **The one-off UPDATE may use the literal.** It runs once, against a set measured this hour,
  under a before-image. Deriving a WHERE clause from a JS constant to run one DML statement buys
  nothing.
- **The tripwire must derive from the constant.** A checker with `'claude-fable-'` typed into it
  is the second home of a fact `shared/models.js` already owns — and the failure is silent: the
  day a second family is added to `NO_TEMPERATURE_PREFIXES`, the executor starts dropping
  temperature for it and the checker keeps passing rows that store it. That is precisely the drift
  `check-format-skill-exclusivity.js` refuses to accept for its own allowlist, and the same move
  applies. (pattern:14, pattern:93.)

## 4. Why the tripwire, and where it goes

**Form — decided, not open.** The ticket offered either a DB `CHECK`/trigger on `skill_profiles`
or a repo tripwire. **Take the tripwire.** An hour before this design, this container's permission
classifier refused an unattended build that applied a schema migration, so no DDL can ship from
this cycle at all. The row fix is DML and is unaffected. The `CHECK` form remains available to an
attended session if John prefers a constraint that cannot be bypassed by a writer who never runs
the checker — it is a strictly stronger guard, and this is a scheduling decision, not a design one.

**Home — deviating from the ticket's suggestion, deliberately.** The ticket suggested
`scripts/check-session-docs.js`. Rejected on two counts:

1. That script is *session hygiene* — CLAUDE-STATE bloat, the backlog snapshot, worktrees, the
   truth registry. A model-parameter invariant on agent rows is not session hygiene, and filing it
   there is how a 114,320-byte file that the hygiene skill itself watches for bloat gets bigger.
2. Its helper contract (SES-176, stated in its own footer) is "pure — findings array in, findings
   array out, **no network**, no disk, no `process.exit`". Every fact it grades comes from a
   committed file or an exported snapshot. `skill_profiles` has no in-repo snapshot, so wiring
   this check there means either a live REST call inside a deliberately offline module, or a whole
   new exported snapshot doc and its regeneration burden — both far larger than the ticket.

The structure that already fits is `scripts/check-format-skill-exclusivity.js`: a live-Supabase
invariant check **over `skill_profiles`**, with pure exported predicates, pinned by
`tests/regression/SE-04-format-skill-exclusivity.js`. The new script is that shape, one size
smaller. It is a new file rather than a branch inside SE-04 because SE-04 is named, headed and
scoped to ARCHITECTURE §13 rule 14 (Format Skill ownership); folding an unrelated model-parameter
rule into it gives that file two subjects. (pattern:17 applied to the *shape*, not to the file.)

**CI wiring costs nothing.** `.github/workflows/ci.yml` already runs
`node tests/regression/run-all.js` with `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` in the step `env:`
(SES-180 (d)). The regression test is therefore the wiring; no `ci.yml` edit is required.

## 5. The gate — the ticket's stated authority does not hold as written

The brief assumed `AGENT-ROW-AGREED-TICKET` is satisfied "because the ticket names the change".
Run live, it is not:

```
$ node scripts/agent-row-gate.js --ticket=AGT-90 --action=edit-active --json
{"ok":false,"exitCode":1,"kind":"verdict","ticket":"AGT-90","action":"edit-active",
 "scope_origin":"discovered","verdict":"gated","rule":"AGENT-ROW-AGREED-TICKET",
 "clause":"no-authority","reason":"no agreed-ticket authority — scope_origin is \"discovered\"…"}
```

and

```sql
select id from public.runner_decisions where backlog_id='AGT-90' or summary ilike '%AGT-90%';
-- 0 rows
```

The rule has two limbs: `scope_origin = 'john-named'` **or** an unreversed `runner_decisions` row
naming both the ticket and the change. AGT-90 is `scope_origin='discovered'`, and the second limb
does not exist yet. The CLI's own header is explicit that its `gated` means "no authority in
`scope_origin`", never "no authority exists" — it passes `decisionNamesTicket: false` by
construction because whether a decision names *the change* is a reading, not a column.

So the build creates the second limb first. That is not a workaround: the decision row **is** the
"one decision handle" the rule's last clause requires the before-images to hang from, so filing it
is step one of the write either way. Task 1 exists for this reason and must not be merged into
task 2.

`reverse_decision()` covers `skill_profiles` (verified live against `pg_get_functiondef`), so the
39 images are a real undo, unlike the `ai_activity_log` case in `environment-facts.md`.

## 6. Why the QA is shaped the way it is

The brief asked for `BEGIN; UPDATE …; <check>; ROLLBACK;`. Taken literally that does not work, and
saying so is cheaper than a QA step that silently proves nothing: the checker reads Supabase over
PostgREST on **its own connection**, and an uncommitted transaction in another session is invisible
to it. The script would read the unmodified table and pass, and the pass would be recorded as
"the tripwire tolerates a violation" when in fact it never saw one.

So the discrimination is split, and both halves are real:

- **(a) transactional, in SQL.** The check's exact predicate is run inside the transaction that
  reintroduces the temperature. Same connection, so it sees the dirty row: 1 violating row inside,
  0 after `ROLLBACK`. Nothing commits. This grades the *predicate*.
- **(b) offline, in the regression test.** `findTemperatureViolations()` is pure and exported, so
  the test hands it a synthetic row set: a fable row at 0 → one violation; the same set with NULL →
  none; an `claude-opus-5` row at 0 → none (the over-reach control). This grades the *script*, with
  no database write anywhere, and it is the half CI runs on every push.

Neither half alone is sufficient: (a) proves the SQL discriminates but never executes the script;
(b) proves the script discriminates but never touches the live table. Together they close it.

The row fix's own control is the second query, not the first. "39 → 0" passes just as well after a
WHERE-less UPDATE. "and the 29 non-fable rows still carry theirs" is the assertion that fails if
the statement over-reached, and it is the one that must not be dropped for brevity.

## 7. Baseline red set

Measured on the unchanged tree, `node scripts/baseline-red-set.js`:

```
- tests/regression/ses-334-served-class-block.test.mjs — green
- tests/regression/agt-79-ticket-owner.test.mjs — green
- tests/regression/SE-04-format-skill-exclusivity.js — green
- tests/regression/HAR-20-forced-toolchoice.js — green
Red set: 0 of 4
```

Chosen because each already touches either the SES-334 temperature seam, the
`skill_profiles`-invariant-checker shape, or an existing `temperature NULL` assertion
(`agt-79-ticket-owner.test.mjs:377-378` already pins "five profiles … with temperature NULL" and
"temperature 0 is not NULL — the judgment lane's API rejects it" for a seed file, which is this
ticket's intent already written down once).

The eight standing dev-head reds (`agt-68-devmanager`, `agt-70-auditor`, `agt-82-jerry-maguire`,
`ses-332-first-run`, `ses-415-role-tagged-criteria`, `ses-423b-stall-signal`,
`ses-424g-blocker-cleared`, `ses-84-claims-classed`) are untouched by this build and stay red.

## 8. Not in scope

- **`docs/runbooks/runner-cycle.md` is NOT touched.** No cycle step changes. It sits at 380,144 B
  against the 381,000 ceiling, `docs/runbooks/cycle-card.md` is generated from it, and
  `tests/regression/ses-413d-questions-scoreboard.test.mjs` pins its byte count in `BYTES_AT_SHIP`
  (imported by `ses-424f`). None of those three moves here.
- The `CHECK`/trigger form (see §4) — available to an attended session, filed nowhere because the
  ticket already carries it as the alternative.
- The 15 fable rows already at NULL, and the 29 correct non-fable temperatures — untouched.
