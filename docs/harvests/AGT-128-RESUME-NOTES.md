# AGT-128 v7.0.654 — what a resumed or later cycle must NOT carry forward

Measured 14:45Z against `origin/dev` @ `058312ad`, not recalled.

## 1. THE BYTE FIGURE IN THE PRESERVED BRANCH IS STALE. RE-MEASURE, DO NOT CARRY.

`7bc002b1` was measured on base `bc2d865c`, where the runbook was 380,967 B. Peers have
since trimmed it:

| tree | runbook | `BYTES_AT_SHIP` |
|---|---|---|
| my base `bc2d865c` | 380,967 B | 380,967 |
| **current dev `058312ad`** | **380,925 B** | **380,925** |
| preserved branch `7bc002b1` | 380,974 B | 380,974 |

**After rebasing onto `058312ad` the correct pair is 380,932 B / `BYTES_AT_SHIP = 380932`**
— verified by applying the clause to dev's own file: 380,925 + 7 = 380,932, headroom **68 B**
(not the 26 B my ses-413d comment paragraph states). That paragraph's "380967 -> 380974"
and "26 B under the ceiling" are both stale and must be rewritten to 380925 -> 380932 / 68 B.

This is exactly the trap ses-413d's own v7.0.650 note documents: *"Measured ON THE REBASED
tree, not on the tree the build ran against."* Carrying 380,974 ships `ses-413d`, `agt-138`
and `ses-424f` red. `agt-138`'s `notEqual 380980` and the kickoff's `bytes < 380980` both
still hold at 380,932.

## 2. `ses-413d-questions-scoreboard.test.mjs` WILL CONFLICT ON REBASE.
Dev added 37 lines in the same `BYTES_AT_SHIP` region I added 8 to. Resolve by keeping
dev's history paragraphs and appending one AGT-128 paragraph with the 380,932 figure.

## 3. STILL SAFE ON DEV — re-verified, no action needed.
- The clause string `a STOP LINE naming `partial`), the undecided gate cards named in the`
  is present **exactly once** on dev, so the replacement still lands cleanly.
- Runbook still has **5 stamps with v7.0.650 first**, so the "add no stamp" decision and
  `ses-424c`'s `stamps[0]` pin both still hold.
- `docs/kickoffs/v7.0.648-AGT-173-record-names-paths.md` was **not** touched by dev, so the
  `(D)` row asserting AGT-173 -> `delivered` is unaffected.
- `scripts/settle-ship.js`, `scripts/ticket-owner.js` and `ses-385b` were not touched by
  dev: those four of my five files rebase clean.

## 4. THE CARD RENDER WILL ALSO REPAIR A PRE-EXISTING DRIFT. NAME IT, DON'T ABSORB IT.
`ses-424e-patterns-cited` was **already RED at baseline**, before any edit of mine:
`--sync-knowledge: DRIFTED — public.skill_profiles.dm-knowledge-cycle-card pins
"2cd36c63ee3fe3e1" but docs/runbooks/cycle-card.md renders "16fec409eb3e6f86"`. So a peer
rendered the card without re-pinning (AGT-112's own failure mode). When the resumed run
executes `render-cycle-card.js --write --cycle-id=... --ticket=AGT-128`, its gate re-pins
that row **in the same run** — a Supabase write under AGT-128's ticket that fixes residue
AGT-128 did not create, and it may turn `ses-424e` green. Report it as such so the verifier
does not read it as scope creep, and decide whether the peer's miss owes its own ID
(pattern:96). The re-pin's before-image is written by the script itself.

## 5. THE FULL-SUITE NUMBER IS UNUSABLE DURING THE OUTAGE.
One clean pre-change run gave `regression suite: 299/320 passed` (21 failures). A second
run started minutes later, as PostgREST degraded mid-run, reached **77 failures** on
gateway errors alone before I killed it. Use `scripts/baseline-red-set.js` over the nine
named tests (`Red set: 2 of 9`) as the baseline — it is the kickoff's own instrument and
the only sound one while the platform is flaky.

## 6. The card render is a ONE-LINE change.
Verified by stash test: `cycle-card.md` was byte-exact against the unchanged runbook
(exit 0), and my clause changes only line 1's sha256 pin
(`a0d2efc6cecfacb5` -> `c631ef653dd4b4e6`). The card's byte count does not change.
