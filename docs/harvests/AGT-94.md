# AGT-94 — harvest (design, v7.0.572, 2026-09-24)

Reasoning behind `docs/kickoffs/v7.0.572-AGT-94-rule-quotes-get-markers.md`. Not required reading
for the build — every fact a task depends on is in the kickoff.

## Premise: ALIVE, and bigger than the ticket says

The ticket names `M5-04`, `M5-07`, `M5-14`, `EL-01` and calls them "the five quotes". That is four
distinct rules (the fifth finding is `EL-01` filed again from the other direction). Both numbers
undercount what the ticket's own sweep clause orders.

Measured this hour by decoding `docs/governance/RULES-SNAPSHOT.md` (the same parser
`render-rule-blocks.js` uses) and matching each `statement` against the file its `canonical_doc`
names:

| File | live rules | verbatim blockquote | under a marker |
|---|---|---|---|
| `docs/RUNNER-GOV-M5-REQUIREMENTS.md` | 16 (`M5-01`..`M5-16`) | 16 | 0 |
| `docs/RUNNER-GOV-ENHANCEMENT-LANE.md` | 3 (`EL-01`..`EL-03`) | 3 | 0 |

Quote line numbers on the unchanged tree — M5: 66, 90, 100, 110, 134, 143, 163, 171, 179, 194, 210,
218, 241, 249, 294, 349. EL: 37, 48, 60. Every statement is a single line; both files are LF.

`node scripts/render-rule-blocks.js` on the unchanged tree: `164 rules · 3 lanes · 8 markers in 262
scanned files` · `clean` · exit 0. The 8 are `B40` (session-setup.md:146, runner-cycle.md:2765),
`B18` (runner-cycle.md:4128, 4183), `{{lanes}}` (runner-cycle.md:2972),
`MANAGER-DECIDES-BY-DEFAULT` and `MANAGER-AUTHORITY-MATRIX` (WORKING-WITH-JOHN.md:36, 76), and
`AGENT-ROW-AGREED-TICKET` (ARCHITECTURE.md:2631). None is in the two files in scope.

## Why the build inserts a marker and then runs `--write`, rather than typing the block

`renderBlock()` produces `> **Rule <ID>** — <statement>`. Today's quotes carry the statement without
the `**Rule <ID>** — ` prefix, so inserting the marker alone leaves all 19 reading `drifted`.
Proved on scratch copies: after inserting 19 markers by content, the checker reported
`19 finding(s)`, every one `drifted` on the missing prefix; `--write` on the two paths reported
`2 file(s) rewritten`, and the re-check reported `19 markers in 2 scanned files` · `clean` · exit 0.
The M5 diff was 48 changed lines = 16 × (one removed quote, one added marker, one added quote).
Hand-typing the rendered form is the defect the ticket exists to remove (pattern:9, pattern:3).

## The failure mode the kickoff calls out

`processFile()` takes the block as the run of `>` lines beginning on the line after the comment
closes. If a blank line sits between marker and quote, the found block is zero lines, and in repair
mode `blockEnd === blockStart`, so `--write` *inserts* a rendered copy and leaves the original quote
underneath. That is a silent duplication with exit 0, not an error — which is why the kickoff pins
"immediately above, no blank line" and why QA 4 counts `>` lines before and after.

## Snapshot vs live registry: one stale row, and it is not this ticket's

`ses-280` and `ses-234` are red at dev head, both on
"`RULES-SNAPSHOT.md` does not match `public.governance_rules`". A row-by-row diff of all 164 rows
(service key, read-only) finds exactly one divergence: `FILE-MATRIX.statement`, where live adds
`/ enhancement` to the `scope_origin` enumeration. Its canonical home is `runner-cycle.md#filing`,
outside both files in scope. **All 19 in-scope statements are byte-identical between snapshot and
live**, so rendering from the snapshot is correct. Regenerating the snapshot would be a second
concern on a 60 KB generated file that concurrent cycles also write — filed, not patched inline
(pattern:64, pattern:96).

Note this supersedes AGT-92's kickoff, which attributed the same two reds to `OD-04`/`OD-19`/`OD-42`
mid-flight on AGT-91; those rows agree now.

## What no test pins

Grepped every regression file that mentions a marker: `ses-313` pins `{{lanes}}` in the runbook,
`ses-301` pins B34's *absence*, `ses-424b` and `ses-413` pin one named marker each in
`WORKING-WITH-JOHN.md`, `SES-176` pins check 11's resolve behaviour, `SES-200`/`SES-201` pin check
12's marker exemption. **None asserts a total marker count or a set of marked files**, so nothing
breaks when the count goes 8 → 19. The new guard in task 5 is what makes the count assertable, and
it derives its id set from the registry rather than hardcoding 19, so a 20th M5 rule fails it
rather than passing vacuously.

`check-session-docs.js` is unaffected by construction: check 11 flags only ids that do not resolve
(all 19 do), and check 12 skips a rule's own canonical home (which is where these markers land).
Its three check-12 WARNs today are `B20`, `M6-03`, `M6-04` — all cross-doc M6/0820 copies.

## Alternatives considered and declined

- **Fix only the four rules the ticket names.** Declined: the ticket's sweep clause orders the rest,
  and leaving 15 hand-typed copies in the same two files re-files this ticket next month
  (pattern:1, pattern:95).
- **Regenerate `RULES-SNAPSHOT.md` to clear the two reds.** Declined: different defect, different
  row, a generated file other cycles write, and the brief forbids a Supabase write.
- **Fix M6 in the same pass.** Declined: a third file with 13 more rules, and the Manager is filing
  it as its own one-file ticket (pattern:64).
- **Change the rendered form to drop the redundant `**Rule M5-01** — ` against a heading that
  already says `M5-01`.** Declined: that is a visible change to a shipped format with no John
  decision on record, and it would touch the other 8 blocks too.

## Residue for the next cycle, so it is not re-derived

- `docs/RUNNER-GOV-M6-REQUIREMENTS.md` — identical defect, 13 live `M6-*` rules verbatim-blockquoted,
  zero marked. Its own one-file ticket; the Development Manager is filing it.
- `docs/RUNNER-GOV-0820-REQUIREMENTS.md` — does **not** have the defect. Its 24 live rules are prose
  restatements with no verbatim blockquote to anchor a marker to. Nothing to do there.
- `FILE-MATRIX.statement` snapshot staleness (above).
