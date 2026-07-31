design-arch-beta-0729 — worktree `design-arch-beta-0729`, branch `session/design-arch-beta-0729`. **Standing role (John, 2026-07-30): architect review + pre-regression instrument ONLY — never applies fixes.** Docs-only commits.

**Pre-regression check** = `node scripts/chi-true-regression.mjs --only <case>` from THIS worktree, cases: `upgrade-cycles` (6), `vitrine-tech` (9), `vietnam-reseller` (12), `news-first-card` (24). Five rounds run; per-round tables in `docs/BETA.md` §3 bucket 1. Deploy-gate override rule and honest-gap inversion caveat: see the round-2 note in BETA.md.

**State after round 5 (2026-07-31): `AGT-44` + `AGT-54` confirmed and closed. 2 green / 2 red, every red owned:**
- Case 24 → `SES-64` (Task Success Rate; driver-only — case 24's `outcome_class` hardcoded rich-answer, 4 measured occurrences) + `CHI-95` (Task Success Rate; fetch-article 200-with-refusal).
- Case 9 → `AGT-50` (Architecture; judge consistency / figure-presented-as-gap under honest-gap) + `DAT-16` residue (Priya's `theory_test`, never in `DAT-16b`'s scope).
- `CHI-96` (Speed): case-6 timing 193 → 828 → 394 s; 828 looks like variance; measure-first, downgraded.

**Recommended next fix session: `SES-64`** (smallest, driver-only, already marked "do before the next bucket-1 run"). After it ships: round 6 verifies case 24 case-level with the fix's own bar isolated (criterion + class selection), NOT a bare case-pass bar — see the round-5 "bar accounting" lesson in SESSIONS.md: a case-level bar inherits every other defect on the case.

**When the pre-regression set goes 4/4 green: run the full 24-case regression (bucket 1's actual ship bar), ~70 min at observed rates.**
