# S-AI-AUDIT-TRIAGE-01 — Findings (live working doc, updated as we go, not just at close-out)

> Session: `ai-audit-triage-0717` (worktree). Started 2026-07-17. Investigation session, not a kickoff doc yet — captures the full discussion so nothing gets lost mid-thread. Referenced from `docs/FEATURES.md`/`FEATURES-NEXT.md` rows once specific fixes are scoped, same pattern as `docs/S-ARCH-AGENT-VISIBILITY-01-FINDINGS.md`.
>
> **Backlog IDs now exist for this (added after John asked "would another session see this?" — they didn't, fixed 2026-07-17):** `LOG-15` (`docs/FEATURES.md`, the actual drawer bug — items 1/3/5/6 below) · `LOG-23` (item 2, missing Routing pattern) · `LOG-24` (item 4, persistent anti-hardcoding rule) · `LOG-25` (item 7, catalog retirement question). A session that finds any of these 4 rows first can trace back here; a session that finds this doc first can trace forward to the real rows.

## Original ask

Full triage of AI Audit issues across the 3 screens (AI Audit screen, Channel Intelligence's Agent Routing drawer, Channel Intelligence's Agents drawer): what's legit vs. whack-a-mole, prioritize, and are the 3 views aligned. Scope confirmed by John: only these 3 screens, only Channel Intelligence (`CHI`) is currently making live calls — don't chase infrastructure outside that.

## Part 1 — Full backlog sweep (done, see chat log for full detail)

- Confirmed live in source (not from docs alone): `LOG-15` (Agent Routing drawer mislabels capability) and `CHI-15` (4th "Agent Reasoning" drawer's "N patterns" badge collides with real pattern data) both still reproduce in current `MarketIntelligenceScreen.jsx`.
- `LOG-01` item 1 (cost shown as $0.00 instead of "unknown" for null-token rows) confirmed live in `useAIActivity.js`'s `computeCallCost()`.
- Swept `DAT`/`HAR`/`LOO`/`AGT` platform layers + the older `AI-`/`S-INFRA-01`/`S-AI-01`/`S11` legacy infrastructure family (`FEATURES-LATER.md`) — legacy family confirmed out of scope (different screens: `/work/[taskId]/audit`, Task Instructions, Assign Work; predates the real `ai_activity_log` system).
- `CHI-15` moved `FEATURES.md` → `FEATURES-NEXT.md` (John's explicit call) — done, committed to this worktree's working tree (not yet pushed).
- New finding, not yet tracked: `ARCHITECTURE.md` §19h still says `AA-171` is "unfixed as of this session" — confirmed `AA-171` is ✅ Done/archived (v6.1.47). Stale LOCKED-section prose, not yet corrected.
- Re-scoped priority list under the "3 screens / CHI-only" constraint: `LOG-15`, `LOG-01`(item 1), `LOG-07` (shared `logActivity()` ~33% measured drop rate — stays in scope because it's the shared function CHI's own calls go through, even though the row itself sits in `FEATURES-LATER.md`). `LOG-06` correctly dropped (names `DashboardScreen.jsx`/`PersonnelScreen.jsx`, not CHI).

## Part 2 — LOG-15 deep walkthrough (paused mid-discussion, see Part 3)

Root cause confirmed by reading `execute.js` directly, not guessed:
- `lastHelpSelection` (built ~`execute.js` L451-455) = `{selected_by_agent_id, reasoning, candidates_considered}` — no capability slug, no `patterns_used`, even though the real capability (`'project-manager'`, hardcoded literal already in scope one line earlier) and Michelle's own real `patterns_used` both exist right there and just aren't threaded through.
- `buildFinalDelegationResult()` (~L310-322) receives `targetCapabilitySlug` as a real param but only writes `display_agent_id` into its return — `targetCapabilitySlug` itself is dropped. `patterns_used` (`finalPatterns`, L320) IS already correctly included here — this half isn't broken.
- Client (`MarketIntelligenceScreen.jsx`'s `describePipelineEvent()`, L725-784): `agent_selection` and `display_format` cases hardcode `capability: "channel-intelligence"` because the client has no real value to read. `intent_routing`/`qa_answer` also hardcode the same string but are **not** bugs — that capability genuinely is Marcus's own.

**Original proposed fix (now on hold pending Items 1/4 below — do not implement as originally written):**
- Thread `selected_capability_slug`/`patterns_used` into `lastHelpSelection`.
- Thread `display_capability_slug` into `buildFinalDelegationResult()`'s return.
- Client reads the real fields instead of hardcoding.
- ~~Add `SERVICE_LABEL` entries for `project-manager` + display agents~~ — **John flagged this step as rule-breaking, see Item 4.**

## Part 3 — Discussion items (numbered, working through 1-by-1)

**Status key:** 🟢 resolved this session · 🟡 partially resolved, action pending · 🔴 open, blocked on John
**Origin key:** (J) = John raised this directly · (C) = Claude-derived sub-finding while investigating a (J) item

John's own count is 4 topics — they map to items 1, 2, 4, 7 below, in the order he raised them (1&2 first message, 4&7 second/correction message). Items 3, 5, 6 are (C) sub-findings, not separate topics he raised — kept numbered inline (by discovery order) rather than renumbered, to avoid relabeling churn mid-discussion.

**Scope clarification (added after John's question — "does LOG-15 have 10+ questions?" — no, and the doc's flat numbering was blurring this):**
- **Actually `LOG-15` scope** (one bug, one root cause — thread already-computed values through instead of hardcoding): items **1** (partially — the display half), **3**, **5**, **6**. Small, normal-sized fix once items 1/4 below are resolved.
- **NOT `LOG-15` — separate architectural threads this investigation surfaced, each needs its own ID once scoped, not filed as `LOG-15` baggage:** items **2** (missing "Routing" pattern, platform-wide), **4** (persistent anti-hardcoding rule, applies to every future session), **7** (possible `SERVICE_CATALOG`/`PATTERN_CATALOG` retirement — its own redesign effort). None of these are about the Agent Routing drawer specifically.

1. (J) 🟡 **Is "Channel Intelligence" being treated as a fake AI Pattern?** (John's topic 1)
   Not a catalog/data-model violation — `channel-intelligence` is correctly only in `SERVICE_CATALOG` (a real Capability), never in `PATTERN_CATALOG`, checked directly in `shared/ai-patterns.js`. But `RoutingActivityLine`'s render (`MarketIntelligenceScreen.jsx`) prints the Capability name and real Pattern names in the same unlabeled line (`{svc?.name} · {patternLabel}`) — a genuine display-layer ambiguity, not a backend one. Needs a UI fix (visually distinguish Capability from Pattern), separate from the data-layer fix.

2. (J) 🔴 **Why isn't Michelle's routing/selection work tagged with a real AI pattern?** (John's topic 2)
   Confirmed: `PATTERN_CATALOG` (`shared/ai-patterns.js`, all 30 entries checked) has **no "Routing" pattern at all** — despite `agent-delegation`'s own description explicitly naming "agent routing (pre-call selection)" as a distinct, real concept it does *not* cover. Michelle's `agent-selection-intent` work (pre-call candidate selection) has no accurate pattern representation in the catalog today. Real published term "Routing" (Anthropic, "Building Effective Agents") appears to be genuinely missing. **Open — not yet discussed with John.**

3. (C) 🟢 **My proposed fix duplicated a hardcoded literal** (`'project-manager'`) instead of reusing the value already in scope at the call site. Folded into Item 4's fix — not a separate action.

4. (J) 🟡 **Is hand-adding `SERVICE_LABEL` entries itself a hardcoding/Rule-violation risk?** (John's topic 3 — "breaking rules" correction)
   Confirmed yes. `useAIActivity.js` already solved "slug → display label" generically and self-maintainingly via `LOG-14`'s `humanizeSlug()` fallback — no catalog entry required for a real slug to display honestly. `MarketIntelligenceScreen.jsx`'s `SERVICE_LABEL` is a **separate, older, hand-maintained dictionary that never got the `LOG-14` treatment** — a duplicate of the exact thing `LOG-14` was built to eliminate. My proposal to hand-add to it would have repeated the anti-pattern.
   **Checked for a persistent rule against this — does not exist yet, anywhere:** not in `ARCHITECTURE.md` as a named LOCKED rule (only a narrow one-sentence mention in §19i describing the mechanism, not prohibiting the anti-pattern), not in `WORKING-WITH-JOHN.md`'s Terminology Discipline (scoped to inventing fake ML *technique* names, not hand-maintained label dictionaries), not in `AI-SERVICES.md` (no mention).
   **Action pending:** draft persistent rule text, get John's sign-off (Tier 3 — canonical), then write into `ARCHITECTURE.md` (LOCKED) + `WORKING-WITH-JOHN.md` + Claude's own cross-session memory (John: "you have broke this rule for the past 5 days" — recurring, not a one-off).

5. (C) 🔴 **Display agents' (Alex/Riley/Claire) real `capability_slug` values** — referenced generically in the walkthrough, never actually verified against source/Supabase. Not yet checked.

6. (C) 🔴 **Missing `patterns_used` on Michelle's selection event** — tied directly to Item 2. Blocked on resolving what the *correct* pattern even is before wiring detection for it.

7. (J) 🔴 **Is `SERVICE_CATALOG`/`PATTERN_CATALOG` itself legacy infrastructure that should be retired**, per John's topic 4, "new rules of AI pattern assembly and naming"? Searched for an existing documented direction — found only adjacent-but-different things: `HAR-01` (detection should come from the model's self-report, not hardcoded declarations — but its own text keeps the catalog as the write-time validation source, doesn't retire it) and `AI-35` (consolidates redundant catalogs into one, doesn't eliminate the concept). **No existing "new rules" direction found — waiting on John to explain what he means**, not guessing.

## Open questions waiting on John (blocking further progress)

- Item 7: what do you mean by "new rules of ai pattern assembly and naming"?
- Item 4: sign off on persistent-rule wording once drafted.
- Item 2: how should Michelle's routing/selection work actually be classified/tagged, once we agree "Routing" is missing from the catalog?

## Not yet done (carried forward, don't lose)

- `ARCHITECTURE.md` §19h stale `AA-171` reference — small, cheap fix, not yet applied.
- `CHI-15` FEATURES.md → FEATURES-NEXT.md move — done in working tree, not yet committed/pushed.
- Display agent capability slugs — not yet verified (Item 5).
- No kickoff doc written yet — everything above is still pre-scoping discussion.
