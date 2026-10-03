<!-- DeepBench v7.0.534 | docs/harvests/SES-424-slice2.md | SES-424 slice 2 — premise revalidation, measurements, alternatives (the kickoff carries every fact a task needs) -->
# SES-424 slice 2 — harvest

## Premise revalidation (2026-09-20, cycle d244a07b, clone at dev 72e052d2)
- `public.governance_rules` read live: `MANAGER-DECIDES-BY-DEFAULT` (live, `claude-md-hard-rules`, canonical `docs/WORKING-WITH-JOHN.md#decision-autonomy-tiers`) names John's three calls — money, dev→main, hire/switch — and says everything else is the manager's. `AGENT-ROW-AGREED-TICKET` (live) covers agent rows only. `B40` is the atomic-claim rule, not an authority rule; the ticket's pointer to it is loose. No row's statement contains "re-pin" or "authority" (`ilike` over all 163 rows: 0 hits beyond the superseded B27).
- Who owns the `dm-knowledge-cycle-card` re-pin today, measured rather than recalled: `runner_decisions` holds 12 rows `kind = 'agent-row'` with summary "re-pin dm-knowledge-cycle-card" between 2026-09-18 09:54Z and 2026-09-20 08:25Z — SES-378 (580a06cf, 01e061ac), SES-385 (7a57750b, 2bfe3689), SES-287 (106f5338, 0 images), SES-413 (3e81220c), SES-423 (73ae941e, 596fa7c3, 06bd3e74, ab0a0526, afc26f77, d70ce071). All cite AGENT-ROW-AGREED-TICKET's second limb, all carry a `backlog_id`, 11 of 12 image `skill_profiles:a3c42311-…`, 0 reversed. The runbook has no procedure line for it (`grep -c "re-pin|sync-knowledge" docs/runbooks/runner-cycle.md` = 2, both header stamps); `scripts/render-cycle-card.js` L209-215 states the refusal is deliberate and L360-363 exits 1 on DRIFTED. So the owner in practice is the Builder under the editing ticket, each time re-derived from the rule's second limb; nothing writes it down as a standing answer. Alive.
- `skill_profiles.dm-knowledge-cycle-card` now pins `fcdcfe34dd6f4592`, method 8,470 chars; `dm-guardrails.must` still says "report only what John alone can unblock as needs_john".
- Runbook: 380,911 B (`wc -c`), `ses-413d` `BYTES_AT_SHIP = 380911`, `ses-423b` asserts `stamps[0]` = the v7.0.532 stamp — both re-verified on this clone, which is why (b) cannot ride in this slice.
- Registry/snapshot/marker state on the unchanged tree: `export-governance-snapshot.js --check` no drift (163 rules, sha 479d4513…); `render-rule-blocks.js --check` 163 rules · 3 lanes · 7 markers, clean. `ASKS-TO-JOHN.md` is pinned at exactly 26 rows by `ses-413-manager-decides` (`assertInventory`), so it is not touched here.
- `runner_questions`: 17 open / 23 answered all-time, 0 asked in the trailing 7 days.
- Decision kinds written in the last 30 days (`runner_decisions.kind`): classification 582, directive 83, ship 59, ticket-status 37, rollback 32, ticket-scope 19, agent-row 17, gate 8, learning 7, hygiene 6, filing 4, re-scope 4, removal 4, invention 3, rule 2, repair 2, synthesis 2, and one each of backlog-file, design-complete, reversal, rollback-backfill, settings, ship-backfill. The matrix rows name the kinds that carry authority; the bookkeeping kinds (classification, ship, rollback, learning, hygiene) are already the manager's by default.

## Why (a) and not (b)
(a) fits without a runbook byte: the rule is data, its rendered home is `docs/WORKING-WITH-JOHN.md` (28,670 B, no ceiling), and the pattern is the one SES-413 shipped at v7.0.514 (commit 8362551a: rule row + snapshot + WWJ block + test). (b) needs bytes freed from a 381,000-B file with 89 to spare and moves two pinned tests. Row 1 is also the fact the 270cf139 rebase is waiting on. Decisive, small, and it closes the ownership question that twelve decisions re-derived by hand.

## The matrix, and why each row reads as it does
- Row 1 ratifies practice: every measured re-pin was an `agent-row` decision under the editing ticket with a before-image. Making it a rule, not a repeated derivation, means the next runbook edit's Builder reads one line instead of AGENT-ROW-AGREED-TICKET's two limbs plus twelve reasonings. The "rebase owns its re-pin" clause is the 270cf139 answer.
- Rows 2-4 restate §19v and dm-guardrails (`use the pick path as computed`, `report only what John alone can unblock`) and SES-402's finding rulings by their `runner_decisions.kind` names, so a reader can grep the ledger for each row.
- Row 5 is AGENT-ROW-AGREED-TICKET's own split, unchanged.
- Row 6 keeps the Verifier's ladder out of the manager's hands (dm-guardrails `must_not`: bypass the verifier or the auto-done bar) and states the precedent for this very row: SES-413 filed MANAGER-DECIDES-BY-DEFAULT as a `rule` decision (b383cb00) and SES-394 filed AGENT-ROW-AGREED-TICKET the same way — the manager files rules that restate rulings; it never rewrites one.
- Row 7 is MANAGER-DECIDES-BY-DEFAULT's three calls plus the one bar slice 1 already reported as John-only (the 20-assignment promotion bar), so the ship's `needs_john` line and the matrix agree.

## Alternatives weighed
- Put the matrix in the runbook (step 5/6): no bytes; and a rule a cycle reads mid-run belongs under a `{{rule:ID}}` marker anyway, which any runbook home would still need. Rejected.
- Add a row to `ASKS-TO-JOHN.md`: the re-pin is not an ask to John today, and the inventory is pinned at 26. Rejected.
- Ship a `--repin` path in `render-cycle-card.js` in the same slice: a code change to a script two live tests read (`ses-378d`, `ses-378f`), and the refusal is documented as deliberate. Named in the STOP LINE for a later ticket, with this slice's evidence.
- Assert in the test that every future re-pin carries an image: vacuous at ship. The test asserts the measured population (≥ 12 rows, all with a `backlog_id`) instead, which fails today only if the ledger is rewritten.

## Not this slice, said so the next cycle does not re-discover it
SES-426 owns the standing reds (ses-332, ses-415, ses-84); `supports_class` on SES-424 is the Prioritizer's `classify-ticket` pass; the three John-only items are on slice 1's ship card 3264939c and go on this ship's `needs_john` line verbatim.
