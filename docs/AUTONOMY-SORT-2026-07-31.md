# Autonomy Pre-Sort — 2026-07-31 (worktree `design-scaling-arch-0731`)

> ## ⛔ RETIRED 2026-08-23 (Selfbuild sweep — `docs/SELFBUILD-RETIREMENT-LEDGER.md`) — historical record only
>
> Superseded three times over: the beta axis it classifies against was retired 2026-08-19; the
> `docs/FEATURES.md` rows it sorts moved to `public.backlog_items` (v7.0.113); and the live
> autonomy axes are register B27's (auto vs. gated lane + trust ladder, §19v). Zero inbound
> references. Kept as the record of the 2026-07-31 sort; governs nothing.

Every active row in `docs/FEATURES.md` (226 rows as of `dev` v6.3.237) classified for whether an
unattended overnight session could take it, or it needs John first. Produced by 4 parallel
classifier agents, each bootstrapped on `CLAUDE.md`, `docs/WORKING-WITH-JOHN.md` (Decision
Autonomy Tiers), and `docs/BETA.md` §1/§2/§4. Merged and adjudicated by the parent design session.

**Classes**
- `SAFE` — fix-shaped, mechanism settled, fits one-feature/≤3-file scope (or Supabase-content-only),
  QA automatable, no Tier-3 trigger. An overnight session can take it unattended.
- `JOHN` — at least one Tier-3 trigger: unchosen options, canonical naming, UI appearance change,
  unsettled architecture / discovery needed, BETA.md §4 contested, file merge/deletion, or the row
  itself says "John's call."
- `DONE` — status ✅ (or retired stub); archiving/bookkeeping only.
- `BLOCKED` — explicitly sequenced behind another ticket or an external constraint.

**Totals: SAFE 81 · JOHN 106 · DONE 11 · BLOCKED 29** (81 = 85 raw minus 4 UI-flavored demotions
below). 184 of 226 rows carry **no beta declaration** — they predate the Beta-Gate-Declaration
rule — so the beta-gated queues below are a floor, not the full beta picture.

**Parent adjudication — 4 demotions SAFE→JOHN (strict no-unilateral-UI reading):**
MI-41 (UI), CHI-17 (UI), CHI-84 (Feature), CHI-89 (Feature). Their fixes are prescribed or
extend a shipped pattern, but each changes what renders on screen; under "Take Absolute Rules
Literally" that is John's approval, per instance. They are listed under JOHN below with `[UI-demoted]`.

---

## BETA-GATED (declared in the row)

### Safe for overnight (8)
| ID | Type | Bucket | Reason |
|---|---|---|---|
| SES-58 | Tooling | 1 | cheap fix stated: record serving commit per case |
| CHI-95 | Task Success Rate | 1 | root cause known (!summary check), api-only, measurable |
| AGT-51 | Architecture | 1 | diagnosable tier-assignment mismatch, fix direction stated |
| AGT-52 | Architecture | 1 | verify intent then likely data-only guardrail attachment |
| CHI-96 | Speed | 2 | measure-first; single fix direction stated (payload shape) |
| CHI-94 | Task Success Rate | 2 | structural freshness gate preferred, direction stated, testable |
| LOG-114 | Observability | 4 | fix stated: pass requestingAgentId at 17 sites, one file |
| SES-66 | Tooling | cross-cutting | cheap pre-flight usage-cap ping script; incident resolved |

### Need John (12)
| ID | Type | Bucket | Open decision |
|---|---|---|---|
| AGT-41 | Architecture | 1 | cost and failure posture |
| AGT-43 | Architecture | 1 | check itself unsound; fix mechanism unsettled |
| LOO-27 | Architecture | 1 | two escalation/budget questions |
| AGT-49 | Architecture | 1 | src/ UI fix needs John's UI call |
| AGT-50 | Architecture | 1 | candidate resolution explicitly needs John's ruling |
| AGT-39 | Task Success Rate | 1* | structural fix undesigned; ID-decoy rule bans another wording pass |
| AGT-46 | Task Success Rate | 1* | same class as AGT-39; go structural, no third wording |
| DAT-14 | Data | 1* | retire/tag/leave ruling; raw SQL not unilateral |
| CHI-93 | Speed | 2 | three levers unchosen; John may downgrade gate |
| SES-33 | Tooling | cross-cutting | plan tier vs push discipline (blocks live QA for all buckets) |
| LAV-1 | Feature | John's call | new homepage UI; queue placement flagged for John |
| CHI-89 | Feature | mobile | [UI-demoted] extends shipped compact treatment — visual change |

*non-standard wording in row ("Beta: bucket 1")

### Blocked (3)
DAT-16 (Data — behind AGT-53/AGT-50 resolution), CHI-91 (Feature — deploy cap + SES-55),
SES-64 (Task Success Rate — must land with AGT-53/AGT-50).

---

## NON-BETA or UNDECLARED

### Safe for overnight (73)
Rows 1–56 sweep: AA-177 (Architecture), AA-181 (Architecture), CHI-83 (Feature), CHI-85 (UI —
repro-confirm of prescribed shape), CHI-19 (Feature), SCA-3 (Task Success Rate), SCA-4 (Speed),
CHI-48 (Data), CHI-26 (UI — verify-and-close), CHI-27 (UI — verify-and-close), CHI-28 (UI —
verify-and-close), CHI-29 (UI — verify-and-close), CHI-63 (Tech Debt), CHI-69 (Tech Debt),
CHI-64 (Observability), LOG-82 (Tech Debt), LOG-84 (Tech Debt), LOG-27 (Observability),
LOG-24 (Architecture).
Rows 57–112 sweep: LOG-115 (Architecture), LOG-68 (Architecture), LOG-63 (Architecture),
LOG-43 (Architecture), LOG-62 (Architecture), LOG-74 (Architecture), LOG-50 (Architecture),
LOG-101 (Observability), LOG-56 (Architecture), SES-41 (Tooling — Post-beta), LOG-22
(Observability), AI-52 (Observability), LOG-108 (Data), LOG-106 (Feature), LOG-104 (Data),
LOG-100 (Tech Debt), AGT-34 (Data).
Rows 113–169 sweep: AA-119 (Tech Debt), AA-121 (Speed), AA-146 (Task Success Rate), AA-161
(Task Success Rate), LOO-003 (Observability), AGT-31 (Task Success Rate), AGT-009, AGT-010,
AGT-011 (all Task Success Rate), AGT-013 (Speed), AGT-014 (Task Success Rate), AGT-002
(Architecture — verification-only), AGT-003 (Task Success Rate), AGT-004 (Data), AA-194 (Task
Success Rate), HAR-19 (Tech Debt), LOO-25 (Task Success Rate), CHI-86 (Tech Debt), SES-008
(Feature), SES-24 (Tech Debt), SES-36 (Tooling).
Rows 170–226 sweep: SES-32 (Architecture), SES-40 (Tech Debt), LOG-94 (Architecture), LOG-96
(Architecture), SES-59 (Tooling — Post-beta), SES-61 (Tooling — Post-beta), SES-56 (Tooling —
declared not-a-gate), HAR-25 (Tech Debt), SES-55 (Tech Debt — unblocks local QA for others),
HAR-22 (Tech Debt), SES-53 (Tech Debt), SES-44 (Observability), SES-45 (Tooling), SES-50
(Tooling — declared not-a-beta-item), SES-54 (Tech Debt — Post-beta), CHI-95's sibling none.

### Need John (94)
Full per-row reasons in the classifier outputs; grouped by dominant trigger:
- **BETA.md §4 contested / row says John's call:** AA-178, AA-179 (Architecture), MI-03 (Feature),
  MI-69 (Architecture), CHI-70 (Architecture), AA-99 (Architecture), DAT-8 (Tech Debt), DAT-13,
  DAT-15 (Data), SES-47 (Tooling), SES-34 (Tech Debt), SES-29 (Task Success Rate), HAR-14 (Task
  Success Rate), SES-17→SES-017 (Architecture), SES-26 (Tooling), LOG-44/45/46 (Architecture).
- **Options not chosen / fix direction open:** MI-71 (Tech Debt), CHI-22 (Feature), CHI-68 (Tech
  Debt), AA-175 (Observability), AA-140, AA-153 (Task Success Rate), AA-159, AA-169
  (Architecture), DAT-001/002/003 (Data), LOG-59, LOG-53, LOG-73 (Architecture), HAR-23
  (Observability), HAR-24 (Tech Debt), SES-27 (Architecture), SES-37, SES-39 (Tooling), SES-63
  (Tech Debt), LOG-116 (Observability), AGT-42 (Architecture), CHI-54 (UI), LOG-88, LOG-102
  (Observability), LOG-61 (Observability), CHI-67 (Observability).
- **Unsettled architecture / discovery-shaped:** CHI-11 (Observability), CHI-16, CHI-20 (Feature),
  CHI-24, CHI-47, CHI-78, LOO-21, LOO-24, LOO-18, LOO-008, LOG-23, LOG-01 (Architecture/various),
  HAR-12 (Task Success Rate), HAR-02, HAR-03 (Speed), AGT-015 (Feature), AGT-029 (Task Success
  Rate), SES-007, SES-51 (Architecture), CHI-87 (Observability), LOG-77 (Architecture), LOG-113
  (Observability), AGT-001, AGT-012 (Architecture), LOG-70 (Architecture).
- **Canonical naming/terminology:** MI-70 (Architecture), LOG-47, LOG-48, LOG-58 (Architecture),
  AGT-25→AGT-025 (Architecture), SES-30 (Tooling), SES-60 (Tech Debt — rename exceeds 3-file scope).
- **UI appearance:** MI-08, MI-16 (Feature), CHI-72 (UI), CHI-48-UI-row (UI, rows 57–112 sweep),
  LOG-57 (Architecture — 8-screen UI decision), AI-46 (Observability), LOO-005 (Observability),
  SCA-5 (Tech Debt), [UI-demoted] MI-41 (UI), CHI-17 (UI), CHI-84 (Feature).
- **File deletion/merge approval:** SES-43 (Tech Debt, 603-line deletion), SES-52 (Tech Debt,
  ~800KB deletion).

### Blocked (26)
AA-90, MI-53, CHI-52, CHI-62, HAR-13, LOG-17, AI-35, LOG-39/40/41/42/55/78/111, AI-45, AA-70,
AA-133, AA-156, AGT-024, SES-002, SES-004, SES-014, AGT-37, AGT-48, AGT-40, DAT-16 (also listed
in beta), CHI-91 (beta), SES-64 (beta).

### Done — archive only (11)
AA-180, LOG-65, LOG-67, LOG-76, LOG-85, LOG-87, LOG-52, AA-199 (superseded), AGT-35, plus retired
stubs AGT-45 / AGT-53 (stubs kept deliberately — check cross-references before touching).

---

## Findings that fell out of the sort (not yet filed as rows)
1. **184/226 active rows have no beta declaration** — they predate the Beta-Gate-Declaration rule.
   The beta queues above are therefore a floor. A cheap sweep session could declare the backlog.
2. Five rows use non-standard beta wording ("Beta: bucket 1", "Not a beta gate") — normalization
   candidate for the same sweep.
3. 16 ✅-Done rows still sit in the active file (session-hygiene check 3 flags them) — pure
   archiving batch, autonomy-safe.
