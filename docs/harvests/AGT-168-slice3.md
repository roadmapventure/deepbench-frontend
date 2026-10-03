# AGT-168 — harvest (slice 3, v7.0.616)

Not required reading. Every fact a task depends on is in the kickoff.

## Premise revalidation — ALIVE

The ticket's slice-3 claim is that `ciRunsTheGate()` cuts its step window too wide. Verified against
the live tree at `9de2cf5f`, not recalled.

`tests/regression/AGT-168-private-scan-change-scoped.js:219`:

```js
const step = body.slice(body.lastIndexOf("- name:", idx), idx + 200);
```

Offsets computed in-process over the shipped `.github/workflows/ci.yml`:

| quantity | value |
|---|---|
| `checks` job body length | 5,214 |
| `idx` (offset of `scripts/audit-private-scan.js`) | 1,423 |
| window start (`lastIndexOf("- name:", idx)`) | 1,140 |
| window end (`idx + 200`) | 1,623 |
| window length | 483 |
| scan step's last character | 1,471 |
| **overshoot past the step's content** | **152 chars** |
| overshoot past the matched needle (`idx+29`) | 171 chars |
| comment block `ci.yml:246-255` | 787 chars |

The window's tail today is the first two lines of that comment block. The comment's own
`` `if: always()` `` does NOT satisfy `/\n\s*if:\s*always\(\)/` — `\s*` cannot cross the `# ` — so
the overshoot is not exploitable by the comment text itself. It is exploitable by DELETION:

| input | six conditions | verdict |
|---|---|---|
| unchanged tree | all true, window 483 | PASS (correct) |
| scan step's `if: always()` deleted | `ifAlways` false, window 462 | FAIL (correct) |
| that deletion **plus** the 787-char comment block | all true, window 462 | **PASS — the defect** |

With the comment block gone, `- name: Regression suite (credentialed)` and its own `if: always()`
move inside `idx+200`, and the neighbour's line grades in the scan step's place. Slice 2's whole
shipped assertion is discharged by a step it was never about. This is the `LOO-013` vacuous-test
shape §19v names at `ARCHITECTURE.md:2608`, reached by a different route: not a flag turning the fix
off, but a window admitting the wrong evidence.

Line-bounded candidate on the same three inputs: window 338 / pass, fail, fail. Discriminating.

Independent of the mutation: five `assert.ok` calls (six conditions) all read that one string, so the
blast radius is the whole CI half of the clause, not just slice 2's line.

## Alternatives considered

1. **Narrow the constant** (`idx + 60` or similar). Rejected: `pattern:3` — a magic number tuned to
   today's step text re-breaks the moment the `run:` block gains a line, and it is the same class of
   bug one size smaller. `pattern:1` — eliminate, don't bound.
2. **Parse `ci.yml` with a YAML library.** Rejected: no such dependency is in `package.json` for the
   test lane, and `pattern:65`/`pattern:8` want the narrowest fix that works. The file is read as
   text everywhere else in this suite and in `SES-255`'s test; one parser in one clause would be a
   new seam.
3. **A separate new test file for the window.** Rejected: `pattern:17` — extend the structure that
   already fits. The file already carries a negative control (clause 1's `scanTree()` call, with its
   own comment explaining why the positive clause is worthless without it). The window guard is the
   same move and belongs beside it, inside the caps, in one file.
4. **Assert on the window's length.** Rejected: it would pass a window of the right size cut in the
   wrong place, and it grades the test's own internals rather than the behaviour.

Chosen: bound the window to the step's own `- name:` block by walking lines in both directions, drop
comment lines, and ship a permanent in-memory mutation clause so the window cannot silently widen
again (`pattern:16` — tracking systems must be self-maintaining).

## Feature call recorded here (JOHN-0925-DESIGNER-DECIDES)

The one judgment call this slice contains: the guard lands as a clause in the existing file rather
than a new test file, and the mutation is built in memory from the shipped YAML rather than from a
committed fixture. Reversible, no visual surface, no spend. Decided here; named in the STOP LINE;
not routed to John.

## Baseline

`node scripts/baseline-red-set.js --tests=tests/regression/AGT-168-private-scan-change-scoped.js`
on the unchanged tree: `Red set: 0 of 1`, the target test green. Worth stating plainly because it
inverts the usual read — the Builder's baseline is a GREEN target test, and the fix's job is to keep
it green while making a mutation red. A Builder expecting a red baseline should not go looking for
one.

## Environment notes carried into this design

- Whole-tree `node scripts/audit-private-scan.js` on this tree today prints `private-scan 17
  findings` — detector-grouped findings, a different unit from the "48 lines across 46 files" the
  slice-1 header records. Neither number is a fact any slice-3 task depends on; recorded so a later
  purge slice measures rather than inherits.
- `.husky` and `.githooks` are absent and `core.hooksPath` is unset in this clone, so sentence (4)'s
  pre-commit half has nothing to attach to. Verified this cycle, not recalled.
- Roughly 18 standing regression reds predate this ticket; the QA asks for the count, not for zero.
- A parallel cycle may move `dev` under this one, and took the `615` version. Fetch/rebase before the
  push; `HEAD:dev`, never bare `dev`.
