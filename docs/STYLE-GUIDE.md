# DeepBench v5.1 — UI Style Guide

> **Canonical source for all design decisions.**
> Updated during session finalization whenever a style rule is added, changed, or locked.
> Last updated: 2026-06-09 | S-MIGRATE-03-patch design

---

## How to Use This File

- **Design sessions:** Reference before proposing any UI. New decisions go here at close.
- **Coding sessions:** Claude Code reads this alongside CLAUDE.md. All rules here override defaults.
- **Session finalization checklist:** If a session locks a new style rule → update this file + commit alongside FEATURES.md and CLAUDE.md.

---

## 1. Color Palette — Treasury (Locked)

All tokens live in `src/tokens.js`. **Never hardcode hex values.**

| Token | Hex | Use |
|-------|-----|-----|
| `T.paperDeep` | `#ddd5be` | Page background |
| `T.card` | `#f8f2e2` | Card background |
| `T.cardAlt` | `#f2ead4` | Secondary card / inset background |
| `T.navy` | `#12243c` | Primary text, headers |
| `T.navyMid` | `#1a2e4a` | Gradient mid |
| `T.navyDeep` | `#0b1929` | Dark panels, code blocks |
| `T.brass` | `#b6873a` | Primary accent, active borders |
| `T.brassDeep` | `#886224` | Labels, section headers |
| `T.brassLight` | `#e4c786` | Light brass, on dark backgrounds |
| `T.moss` | `#5a7538` | Success, active states |
| `T.mossLight` | `#a6bc82` | Muted success |
| `T.flag` | `#a83319` | Warning, flag indicators, delete |
| `T.muted` | `#786d52` | Secondary text |
| `T.mutedDeep` | `#58503a` | Body text on cards |
| `T.line` | `#c8bb9a` | Card borders |
| `T.lineSoft` | `#d8cbac` | Dividers, subtle borders |
| `T.ink` | (near-black) | Form input text |

---

## 2. Typography (Locked)

| Variable | Font | Use |
|----------|------|-----|
| `display` | Fraunces | Page titles, card headers, large numbers, agent names |
| `body` | Inter | Body text, form labels, CTAs, descriptions |
| `mono` | JetBrains Mono | Labels, tags, badges, codes, metadata, UI chrome |

**Size scale (common):**
- Page title: `fontSize: 26–28`, `fontWeight: 500`, `letterSpacing: "-.5px"`
- Section header (mono): `fontSize: 9`, `textTransform: "uppercase"`, `letterSpacing: 1.5–1.8`, `fontWeight: 600`
- Card body: `fontSize: 12–13`
- Badge/chip: `fontSize: 8–9`, mono

---

## 3. Corner Ornaments (Locked)

Every card uses `<Corners />` from `SharedUI.jsx`.

- Size: 9px brass SVG lines
- Position: absolute, top-left and bottom-right corners
- Color: defaults to `T.brass`; pass `color={T.flag}` for guardrail cards
- The wrapper div must have `position: "relative"`

```jsx
<div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "16px 18px", position: "relative" }}>
  <Corners />
  ...
</div>
```

---

## 4. ✦ AI Badge Rules (Updated 2026-06-09)

### When to show
`<AiBadge />` is **always visible** on any UI element that triggers an AI call. It is not a loading indicator — it permanently marks AI-powered features to showcase capabilities.

**Show on:**
- Buttons that trigger AI calls (upload, ingest, generate, analyze, chat send)
- Cards or sections whose content was produced by AI
- Form fields that receive AI-suggested values (use the separate `AI SUGGESTED` purple chip for field labels)

**Do NOT show on:**
- Cancel / close / dismiss buttons — even if the panel behind them uses AI
- Navigation buttons (back, tab switches)
- Deterministic logic outputs (flags, HHI scores, column detection)

### Color rule (Locked 2026-06-09)
`<AiBadge />` color must **match the button label color** so it's visible against the button background.

| Button background | Button label color | Badge color to use |
|-------------------|-------------------|-------------------|
| Brass (`T.brass`) | `T.navy` | Use `T.navy` — pass via style prop or AiBadge color override |
| Navy (`T.navy`) | `T.card` or `T.brassLight` | Default badge color (brass) works |
| Transparent / card | `T.navy` or `T.brassDeep` | Default badge color works |

**Implementation pattern for brass buttons:**
```jsx
{/* ✦ AI badge placed OUTSIDE the button when button bg = brass */}
<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
  {!isCancelState && <AiBadge />}
  <button style={{ background: T.brass, color: T.navy, ... }}>
    + Add Courses
  </button>
</div>
```

Or pass a color override if AiBadge supports it:
```jsx
<AiBadge style={{ color: T.navy }} />
```

### AiBadge on brass/moss backgrounds — chip override (Locked 2026-06-09, S-BENCH-UX-02)
Badge stays **inside** the button. Pass style overrides to make the chip legible:

| Button background | Style override |
|-------------------|---------------|
| Brass (`T.brass`) | `style={{ color: T.navy, background: "rgba(18,36,60,0.12)", border: "1px solid rgba(18,36,60,0.2)" }}` |
| Moss (`T.moss`) | `style={{ color: "#fff", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)" }}` |

Do NOT show AiBadge on file browse actions that do not call AI (e.g. "Browse File" in Add Courses drop zone).

### AI SUGGESTED chip (separate from AiBadge)
For form field labels where AI pre-filled a value, use the purple chip:
```jsx
<span style={{ fontFamily: mono, fontSize: 8, background: "rgba(155,110,243,0.12)", border: "1px solid rgba(155,110,243,0.3)", padding: "1px 5px", color: "#9b6ef3" }}>
  AI SUGGESTED
</span>
```

---

## 5. AI Pulse Icon — AIDiamond (Updated 2026-06-15)

The canonical AI activity indicator is `<AIDiamond />` from `src/components/AIDiamond.jsx`. It renders a small brass animated diamond (square rotated 45°, `aiDiamondBeat` animation).

**Do NOT use a raw `<span>` with `pdot` animation as a substitute — that is not the AI pulse icon.**

### Props
```jsx
<AIDiamond size="7px" color={T.brass} animationDuration="2.4s" />
```

### When to use AIDiamond
- On any button or UI element that invokes an AI call, to signal AI activity at a glance
- On step cards to mark AI-powered steps (alongside pattern label — design TBD in S-AI-AUDIT-UX-01)
- In the app header during active AI calls (existing usage — do not change)

### Pattern label display on AIDiamond (design required)
The pattern tooltip ("Tool Use · Structured Output · Streaming") should be carried by or adjacent to AIDiamond — not by a separate AiBadge chip. Exact treatment (title attribute, wrapper tooltip, hover label) to be decided in S-AI-AUDIT-UX-01 design session. **Do not ship AiBadge chips next to AIDiamond on buttons until this is specced.**

### Current exceptions (shipped, pending redesign)
- "Re-run All" and "Update Steps →" buttons currently use a raw `<span>` dot + AiBadge chip (AI-31, S-AI-BADGE-05/05p). These need to be replaced with AIDiamond + pattern tooltip in a future session — tracked as AI-31 revision.

### Header usage (existing — do not change)
A pulsing brass dot `●` appears in the header when any AI call is active. Implemented via `AIDiamond.jsx`. Do not refactor without a dedicated session.
- Shown: during active AI call
- Hidden (removed, not just opacity 0): when call resolves

**Known drift (flagged 2026-07-07, `SH-17`, not yet resolved):** the header's actual dot implementation is a hand-rolled `<span>` + its own `aiBlink` keyframe (`AppShell.jsx`), not `AIDiamond` — this doc's claim above is stale. Two more duplicate components exist as dead code (`AIStatusDot` in `ui.jsx`, `AiStatusDot` in `SharedUI.jsx`), never imported anywhere. Do not copy either pattern in new work — new AI-active indicators use real `<AIDiamond/>` (see §5a below for the first one built this way).

### 5a. Agent Working Status — `AgentWorkingIndicator` (Locked 2026-07-07, `S-MI-20-design`; `kind` field + final-timeline caption added `S-MI-42`, 2026-07-09; two-tone styling removed, total-elapsed clock + drawer logging added `S-MI-47`, 2026-07-13; two-line layout + "expect" label reverted `S-MI-49`, 2026-07-13)

Chat-embedded "agent is working" indicator — two stacked lines, live `m:ss` counting timers, appears in the Market Intelligence Interact column in place of the (now MI-suppressed) header dot. Only one agent ever runs at a time on this platform today (confirmed no concurrent dispatch anywhere in the codebase) — this swaps message and resets its per-agent timer each time control passes to a new agent, never multiple simultaneous indicators. Any future capability/screen needing a live "agent is working, here's how long" indicator reuses this pattern rather than inventing a new one.

- **Two-line layout (`S-MI-49`, 2026-07-13, John's live review of `S-MI-47`'s shipped one-line layout):** line 1 is `elapsed <total elapsed>` + optional `| <expectation>` (only when an estimate exists — omitted entirely, no dangling `|`, when `expectation` is null), its own row, no diamond. Line 2 is `<AIDiamond size="7px" color={T.brass}/>` + message text + bare `<per-agent time>` — no label on line 2 (line 1 already carries the explicit `elapsed`/`expect` labels) and no `(...this Agent)` parenthetical. Example:
  ```
  elapsed 7s | expect > 30s
  ◆ Marcus is thinking… 7s
  ```
  Outer wrapper is `flexDirection: column` (was `row`); line 2 is its own inner `flex row` (diamond + message + per-agent time).
- **`kind` field:** `workingStatus` still carries a `kind: 'scripted' | 'orchestration'` field alongside `message`/`startedAt`/`turnStartedAt`/`expectation`. `'scripted'` (the default) is the pre-existing macro-hop status line, set explicitly by the screen at known hand-off points (e.g. `"Owen is reviewing…"`). `'orchestration'` marks a live event straight from the harness's own `request_help`/`delegate_to_agent`/`critique` dispatch (via `_onEvent`/SSE, `execute.js`) or a `delegation_return`. As of `S-MI-47`, `kind` is no longer read by `AgentWorkingIndicator` for styling — its only remaining consumer is `onDelegationProgress`'s drawer-logging branch (see Drawer logging below). A `kind` change alone, without a new `startedAt`, does not remount/reset the per-agent timer — only a genuinely new hop (new `startedAt`) does, since the component still keys on `startedAt` at its call site (see Reset semantics below).
- **Two-tone styling — removed (`S-MI-47`, 2026-07-13):** `S-MI-42` had rendered `'orchestration'` kind with a bold/upright/dark-ink treatment (`<AIDiamond color={T.navy}/>`, `color: T.ink, fontStyle: normal, fontWeight: 600`) to distinguish live delegation events from scripted status lines. Live use read this as inconsistent styling rather than an intentional signal — every status line now renders in the original light/italic/muted style (`<AIDiamond color={T.brass}/>`, `color: T.muted, fontStyle: italic, fontWeight: 400`) regardless of `kind`.
- **Total-elapsed clock (`S-MI-47`, 2026-07-13):** `workingStatus.turnStartedAt` carries forward across every `setStatus()` call within one turn — set once, on the first call after `workingStatus` was `null` (a fresh turn), and otherwise inherited unchanged from the previous `workingStatus` on every subsequent hop. `startedAt` still resets on every call (per-agent clock, unchanged remount semantics). The indicator renders both: `now - turnStartedAt` (total elapsed, line 1, never resets mid-turn) and `now - startedAt` (this-agent elapsed, line 2, resets to `0s` at each new hop).
- **Timer text:** `fontFamily: mono, fontSize: 10, color: T.brassDeep`, format `Xm Ys`/`Xs` (e.g. `7s`, `1m 4s`), ticking every 1s.
- **Expectation text ("expect >", reverted from "question >" `S-MI-49` — `S-MI-47` had renamed it to "question" only because it shared a line with the per-agent timer and needed to read distinctly; now that it sits on its own line directly under the user's question bubble, "expect" is unambiguous again):** `fontFamily: mono, fontSize: 10, color: T.brassDeep` — exactly matches the timer's styling, rendered on line 1 immediately after the elapsed time with a `" | "` separator. Two-stage estimate: a generic ceiling shown immediately (`expect < 2m`) before the routing decision is known, upgraded to a real routing-chain-based figure (`expect > 15s` below 60s, `expect > 1m 30s` at/above 60s) once the chain resolves. Only rendered when a non-null `expectation` is present on `workingStatus` — triggers with no known chain (patch resolution, memory consolidation, etc.) pass `expectation: null`/omit it on a fresh turn and show no estimate, line 1 renders as just `elapsed Xs`. As of `S-MI-47`, `setStatus`'s merge semantics mean an omitted `expectation` on a mid-turn call (e.g. every live `onDelegationProgress` handoff) carries the previously-set estimate forward instead of clearing it — only an explicit `expectation: null`/a value clears or overrides it.
- **Reset semantics:** the component is mounted with `key={startedAt}` at its call site — a new hop means a new `startedAt`, which forces a full remount rather than trying to reset internal tick state. `turnStartedAt` is a plain prop, unaffected by this remount, so the total-elapsed math stays correct across every hop without needing a second, non-remounting component. This is the correct pattern for any future "resets per hop, but something else keeps counting across hops" timer, not a bespoke effect-dependency trick.
- **Ownership:** the parent screen holds a single `{ message, startedAt, turnStartedAt, expectation, kind } | null` state value (not a stack/list), written through one shared `setStatus(message, { expectation, kind })` helper so scripted macro-hop swaps and live micro-hop delegation events can never drift into two different timers — sets it fresh at the same `t0` boundary it already uses for its own event/audit logging, so the display and the logging read the same seam.
- **Drawer logging (`S-MI-47`, 2026-07-13):** every live handoff (`onDelegationProgress`) now also writes a permanent `delegation`/`delegation_return` row to the Agent Routing drawer via `logEvent()`, alongside the pre-existing coarse checkpoint events (`intent_routing`, `qa_answer`, `agent_selection`, etc.) — additive only, nothing removed. See `describePipelineEvent()`'s two new cases (reuses `T.navyMid` for `delegation`, `T.moss` for `delegation_return` — no new colors).
- **First-name-only chat copy (`S-MI-49`, 2026-07-13):** `describeDelegationEvent()`'s 4 template strings (the live handoff messages this component renders as `message`) now use each agent's first name only (derived at the display layer via the shared `firstNameFor()` helper, no change to `agents.js`'s `name` field) — saves room on the chat status line. Scoped to this one function only: the pre-existing scripted messages (`"Marcus is thinking…"`, etc.) already used first names. **Reversed by `MI-52` (2026-07-14):** the Agent Routing drawer's own row headers (`RoutingEventRow`) previously stated as explicitly out of scope, still showing full names, now also render first name only via that same `firstNameFor()` helper — John's direct instruction, matching the chat status line. `RoutingEventRow` also no longer renders a second agent/arrow at all (its `secondaryAgentId`/`AgentAvatar`-for-secondary block was removed) — every row names exactly one agent.

**Final-timeline caption (`S-MI-42`, 2026-07-09):** once a multi-hop agent turn completes, its result bubble (`kind==="qa"` and `kind==="hypothesis_test"` message cards) shows a small caption directly under the card: `Full Agent Routing & Answer Given in Xs` (or `Xm Ys`). Styling: `fontFamily: mono, fontSize: 9.5, color: T.muted, marginTop: 4` — matches the existing small-print convention already used elsewhere in this file (e.g. `AuditColumn`'s pipeline-event `svc` line), not a new text style. Reuses `formatElapsed()` unchanged. The value (`msg.totalElapsedMs`) is a simple `end - start` timestamp diff captured once at the start of the turn (`submit()`/`onSelectHypothesis()`), not a sum of individually-displayed segment durations — mathematically identical since hops are strictly sequential with zero gaps, computed the simpler way. Persists in chat history (not a transient status line) since it's stored on the message object itself, not on `workingStatus`. Reusable by any future screen showing a multi-hop agent result.

---

## 6. FeatureBadge

Visible only with `?debug=features` in the URL. Small chip in the corner of the component it wraps.

```jsx
<FeatureBadge id="PE-10" />
```

Rules:
- One badge per feature ID per file
- Place inside the outermost wrapper of the feature's JSX
- Wrapper must have `position: "relative"`
- **Never remove an existing FeatureBadge** — if a session adds a new feature to a component that already has a badge, keep both

---

## 7. Button Patterns

### Primary CTA (brass gradient)
```jsx
style={{
  background: `linear-gradient(135deg, ${T.brass}, ${T.brassDeep})`,
  border: "none",
  color: T.navy,
  padding: "10px 24px",
  fontFamily: display,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
}}
```

### Secondary / ghost
```jsx
style={{
  background: "transparent",
  border: `1px solid ${T.line}`,
  color: T.mutedDeep,
  padding: "9px 20px",
  fontFamily: body,
  fontSize: 13,
  cursor: "pointer",
}}
```

### Destructive (delete)
```jsx
style={{
  fontFamily: mono,
  fontSize: 9,
  color: T.flag,
  background: "transparent",
  border: `1px solid ${T.flag}40`,
  padding: "2px 7px",
  cursor: "pointer",
  letterSpacing: .5,
  textTransform: "uppercase",
}}
```

### Disabled state
```jsx
style={{
  background: T.line,
  color: T.muted,
  cursor: "not-allowed",
  opacity: 0.5,
}}
```

---

## 8. Card Layout Patterns

### Standard card
```jsx
<div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "16px 18px", position: "relative" }}>
  <Corners />
  ...
</div>
```

### Navy panel (stats strip, readiness score)
```jsx
<div style={{ background: T.navy, padding: "14px 18px", border: `1px solid rgba(182,135,58,.3)` }}>
  <Corners color={T.brass} />
  ...
</div>
```

### Guardrail / warning card (flag red corners)
```jsx
<div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "15px 18px", position: "relative" }}>
  <div style={{ position:"absolute",top:4,left:4,width:9,height:9,borderTop:`1.5px solid ${T.flag}`,borderLeft:`1.5px solid ${T.flag}`}}/>
  <div style={{ position:"absolute",bottom:4,right:4,width:9,height:9,borderBottom:`1.5px solid ${T.flag}`,borderRight:`1.5px solid ${T.flag}`}}/>
  ...
</div>
```

---

## 9. Status / Priority Chips

### Status chip
```jsx
<span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: .5, textTransform: "uppercase", padding: "2px 8px", background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
  {s.label}
</span>
```

### Agent code chip
```jsx
<span style={{ fontFamily: mono, fontSize: 8.5, padding: "2px 8px", background: "rgba(182,135,58,.1)", color: T.brassDeep, border: `1px solid rgba(182,135,58,.3)` }}>
  {agent.code}
</span>
```

### Active indicator
```jsx
<span style={{ fontFamily: mono, fontSize: 8.5, padding: "2px 8px", background: "rgba(90,117,56,.1)", color: T.moss, border: `1px solid rgba(90,117,56,.3)`, fontWeight: 700 }}>
  ● ACTIVE
</span>
```

---

## 10. Left Sidebar Nav Pattern (Personnel File)

**Second usage locked 2026-07-07 (`S-BENCH-FILTER-01`):** `RosterScreen.jsx` (`/bench`) reuses this exact pattern for its category filter nav (All/Market Intel/Platform Wide/Spend Analysis/Special Interests), at the same `180px` width. Confirms this is a reusable screen-level pattern, not Personnel-File-specific — any future screen needing a left filter/tab rail should reuse these same style objects rather than inventing a variant.

```jsx
// Active tab
style={{
  width: "100%", textAlign: "left", padding: "8px 14px",
  fontFamily: body, fontSize: 12, fontWeight: 600, color: T.navy,
  background: `${T.brass}14`, border: "none",
  borderLeft: `2px solid ${T.brass}`,
  cursor: "pointer",
}}

// Inactive tab
style={{
  width: "100%", textAlign: "left", padding: "8px 14px",
  fontFamily: body, fontSize: 12, fontWeight: 400, color: T.mutedDeep,
  background: "transparent", border: "none",
  borderLeft: "2px solid transparent",
  cursor: "pointer",
}}
```

Nav group label:
```jsx
style={{ fontFamily: mono, fontSize: 8, color: T.muted, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, padding: "0 14px 6px" }}
```

---

## 10a. Fixed-Label + Right-Aligned Number Pattern (Locked 2026-07-09 · `S-MI-43-design`)

Reusable for any numeric list row where values need to line up on the decimal point/units digit regardless of label length — right-justifying the whole value string (old `justifyContent:"space-between"`) does not achieve this, since different-length value strings don't share a leading-digit position even when flush against the same edge. Instead: a fixed-width label column (ellipsis-truncated, does not wrap or push the value column) immediately followed by a flex value block containing a fixed-`minWidth`, right-aligned number box, then free-flowing suffix text. Reference implementation: `LatencyStatRow` (`MarketIntelligenceScreen.jsx`, Column 3 "Agents" drawer's Baseline/byKind/`AA-149` byModel rows).

```jsx
// Label column
<span style={{ width: 110, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>

// Value block: fixed-width right-aligned number + free-flowing suffix text
<span style={{ display: "flex", color: T.navy, fontWeight: 700 }}>
  <span style={{ display: "inline-block", minWidth: 34, textAlign: "right", flexShrink: 0 }}>{valueNumber}</span>
  <span>{restText}</span>
</span>
```

---

## 11. Page Header Pattern

```jsx
<div style={{ background: T.cardAlt, padding: "16px 24px 14px", borderBottom: `2px solid ${T.brass}`, flexShrink: 0 }}>
  {/* Breadcrumb */}
  <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 4 }}>
    Section · ID · Context · Tab
  </div>
  {/* Title */}
  <div style={{ fontFamily: display, fontSize: 26, fontWeight: 500, color: T.navy, letterSpacing: "-.5px", lineHeight: 1, marginBottom: 4 }}>
    Page title here.
  </div>
</div>
```

---

## 12. Toast Notifications

Use `showToast(message, icon)` from PersonnelScreen's shared state.
- Success: `showToast("Action completed ✦")` — default icon `✓`
- Warning: `showToast("Something failed", "⚠")`
- AI action: `showToast("✨ Claude is analyzing…", "✨")`

Auto-dismisses after 3 seconds.

---

## 13. NIGP Training Card Layout (PE-03 — Locked)

Left date/timeline column + right content column. Used for `knowledge_entries` in the Training tab.

```
┌──────┬──────────────────────────────────────────────┐
│ Jun  │ [CATEGORY] [JURISDICTION]  [Active] [EDIT] [DEL] │
│ 9,   │ Run 20260609-143022                           │
│  ●   │ Document Title                                │
│      │ ⚑ Flag triggers                              │
│      │ Priority 50/100                               │
│      │ Field notes (brass left border)               │
│      │ ▸ What [Name] Learned                         │
└──────┴──────────────────────────────────────────────┘
```

- Left col: `width: 56px`, `background: T.cardAlt`, `borderRight: 1px solid T.lineSoft`
- Green node: `●` in `T.moss`
- Action buttons (right-side): Toggle Active, EDIT (disabled until PE-11), DELETE

---

## 14. Inline Sub-View Pattern (Add/Edit within Tab)

Used when a tab has an embedded form that swaps out the list view. Established in PE-10 (Training → Add Courses).

- **Trigger:** Button in the tab's stats strip or header row
- **Behavior:** Button toggles between action label and "✕ Cancel"; list view hides; sub-view appears
- **Layout:** `1fr 300px` two-column grid (form left, projected impact / checklist right)
- **Cancel:** Resets all sub-view state, returns to list view — no navigation
- **On save:** Prepend new item to list, collapse sub-view, show toast
- **AiBadge:** On the trigger button (action state only, not cancel state)

---

## 15. Create Work Order Screen — Two-Column Layout (Locked 2026-06-23, S-PM-05-design)

The Create Work Order screen uses a strict two-column layout: all user entry controls on the left, all plan output (step cards) on the right.

- **Left column:** 42% width, fixed. Contains: PM agent picker (Step 01), deliverable tiles (Step 02), goal textarea (Step 03), Generate Plan button — top to bottom in sequence.
- **Right column:** `flex: 1`. Contains: title suggestion, plan summary, step cards, clarifying questions, Approve & Launch — rendered only after plan is generated.
- **Divider:** 1px vertical line (`background: T.line`) between columns with `margin: 0 16px`.
- **Empty right state:** Show a dashed placeholder card until the first plan is generated.

### Agent Picker Cards (Step 01)
- Each card: `background: T.card`, `border: 1.5px solid T.line`, `border-radius: 2px`, `padding: 9px 12px`
- Selected state: `border-color: T.brass`, `background: rgba(182,135,58,0.07)`
- Layout: `display: flex; align-items: center; gap: 8px` — avatar left, name + code right, active dot far right
- Active dot: 7px circle, `background: T.moss`
- Unavailable agents: `opacity: 0.38`
- Filtered to agents whose `role` contains "Project Manager" (case-insensitive)

### Deliverable Tiles (Step 02)
- Grid: `repeat(2, 1fr)` within the left column (narrower than full-width 5-tile grid)
- Tile: same pattern as task type tiles — `T.card` background, 1.5px border, centered icon + label + short description
- Selected state: `border-color: T.brass`, `background: rgba(182,135,58,0.07)`
- Description text: `font-size: 9px`, `color: T.muted`, `line-height: 1.3`
- Tiles are DB-driven from SP-PM-03 Format Skill `traits.deliverables` — never hardcoded

### AI Goal Suggestion Bar (Step 03)
- Displayed above the goal textarea when a deliverable is selected
- Label: JetBrains Mono 7.5px, brass, uppercase — format: `MM · PP-01 suggested a starting point`
- Prefixed with a 5×5px brass rotated square (the AI dot pattern)
- Goal textarea border: `T.brass` when pre-populated (signals AI involvement)
- Do NOT show the suggestion bar if no deliverable is selected

### Mobile Addendum (Locked 2026-07-13, WO-07/AW-30, S-MOBILE-WO-01)
- Below `MOBILE_BREAKPOINT` (768px, `useIsMobile()`): grid collapses from `"42% 1fr"` to `"1fr"` — one JSX tree, conditional style values only, no duplicated mobile branch. Left column (Steps 1-3 + Generate Plan) renders first, right column (Step 4 output) directly below once a plan exists — same top-to-bottom order the desktop grid already implies.
- Divider (the 1px `borderRight` between columns) is omitted on mobile — nothing left to divide with a single column.
- Deliverable-tile grid (Step 01/roadmap) drops from `'1fr 1fr'` to `'1fr'` on mobile — 2-up tiles were compressing to ~78px, illegibly narrow.
- PM picker cards (Step 02) need no structural change — already `flex-wrap`, the fixed `minWidth:200` stops overflowing once its column is full-width instead of ~164px.
- **Single-PM "FYI" label (`AW-30`, desktop and mobile both):** when exactly one agent has a "Project Manager" role, Step 2's label reads `"Step 2 — FYI, Your project manager is:"` instead of `"Step 2 — Select a Project Manager"`. Condition is `pmAgents.length === 1`, evaluated live from the roster — never hardcoded to an agent name, reverts automatically once a second PM agent exists. Label text only; the card stays exactly as clickable as always.

---

## 16. ConfirmationCard — Generic `pending_confirmation` Gate (Locked 2026-07-04, S-MARKET-INTEL-01d-design)

The platform's `requires_human_confirmation` mechanism (`ARCHITECTURE.md` §19d) has exactly one frontend rendering, `ConfirmationCard` (`SharedUI.jsx`) — never a bespoke per-capability card. Any future capability that gates on human accept/reject/edit reuses this component; do not build a second one.

- **Visual family:** same as `MessageBubble`'s "Submitted Hypothesis" card — bordered card, brass-tinted header strip (`background: "#f6ecd8"`, `borderLeft: 4px solid T.brass`), agent avatar + name + role in the header.
- **Body:** every non-null key in `proposedAction` rendered generically as a label/value pair (label = key with underscores replaced by spaces, uppercase mono) — never a hand-picked subset of fields per capability. `critique`, when present, renders as a separate inset block below.
- **Do not wire a `*-display-intent` Display-Agent hop onto this gate without a target-capability restriction (found + reverted 2026-07-14, `S-MI-53`).** `MI-53` tried exactly this — a paired `data-patch-display-intent` mirroring `ci-answer-display-intent`/`hyp-hypothesis-test-display-intent` — and live-confirmed (twice) that `delegate_to_agent`'s target selection has no restriction preventing it from landing on a write-capable capability instead of a formatter: Michelle's `agent-selection-intent` routed the "format this" request to Eleanor Voss, whose `library-write-intent` executed a real `the_library` INSERT before any human saw the confirmation card. Reverted same day at John's direction; the underlying `execute.js` gap is tracked separately (`task_773e8b06`). Any future attempt at this must land after that gap is closed, not before.
- **Actions:** always exactly three — Reject (ghost), Edit (ghost, opens an inline textarea + Resubmit/Cancel), Accept (brass-filled, primary). Edit re-submits and expects a *new* proposal back (loop), never closes the card itself — only Accept/Reject close it.
- **Props:** `{ agent, proposedAction, critique, onResolve }` — `onResolve(resolution, editedText)` is the only capability-specific wiring; the component itself contains zero capability-specific strings or logic.
- **Placement:** wherever the triggering action lives (e.g. Market Intelligence's Evidence column, replacing the commit-button row while a confirmation is pending) — not a modal, not the chat.

---

---

## Section 16 — Prompt Visibility Modal (Locked 2026-06-23 · S-PM-07-design)

Triggered when user clicks Generate Plan on the Create Work Order screen. Fires in parallel with the full pipeline — does not block plan generation. Dismisses on Continue or when plan renders.

### Modal Container
- Full-screen overlay: `background: rgba(18,36,60,0.72)` (navy at 72% opacity)
- Modal card: `background: T.paperDeep`, `border: 1px solid T.line`, max-width 880px, centered, `padding: 28px 32px`
- Treasury corners component on the modal card
- Title: Fraunces 18px, `T.navy`, `"What DeepBench sent to the AI"`
- Subtitle: Inter 12px, `T.muted`, `"Compare what you typed to what the platform assembled"`

### Three-Panel Layout
- Side-by-side columns: `display: grid`, `gridTemplateColumns: 1fr 1fr 1fr`, `gap: 12px`
- Each panel: `background: T.card`, `border: 1px solid T.line`, `padding: 14px`, `borderRadius: 2`
- Panel header: JetBrains Mono 8px, uppercase, `letterSpacing: 1.5`, `T.muted`
- Panel number chip: brass background, navy text, Mono 7px
- Token count badge: bottom of each panel — Mono 8px, `T.muted` — format: `"42 words"` / `"847 tokens"` / `"2,341 tokens"`

| Panel | Header | Content |
|-------|--------|---------|
| 1 | `01 · WHAT YOU TYPED` | Goal text only. No decoration. |
| 2 | `02 · DB ASSEMBLY` | Goal + each section block labeled with source slug (e.g. `planning-behavior · behavior`, `RAG · 3 chunks`). Collapsed by default — expand on click. |
| 3 | `03 · ENRICHED PROMPT` | Full system prompt after Reflect + Synthesis. Pattern badges (RAG, Reflect, Prompt Chaining, Guardrails) as chips above the text. |

### Section Source Labels (Panel 2 + 3)
- Label format: `{skill_profile_slug} · {skill_type_slug}` — Mono 7px, `T.brassDeep`
- RAG sections: `"knowledge · RAG · {n} chunks"` — moss colored
- Reflect output: `"reflect · pre-plan · Haiku"` — brass colored
- runtime_context (if present): `"additional context · Q&A answers"` — navy colored

### Pattern Badges (Panel 3 only)
- Same chip style as AiBadge — Mono 7.5px, active color
- Only show patterns that actually fired (RAG only if chunks > 0, Reflect only if ran, etc.)
- Displayed as a horizontal wrap row above the prompt text

### Summary Line
- Between panel 3 and Continue button
- Inter 11px, `T.muted`, centered
- Format: `"Assembled from {n} skill profiles, {n} knowledge chunks, and Michelle's agent configuration"`

### Continue Button
- Full-width, brass gradient, Fraunces 14px navy — same style as Generate Plan button
- Label: `"Continue — view your plan ▸"`
- Dismisses modal. If plan is already back, renders immediately. If still processing, spinner continues behind modal.

---

## Section 17 — Agent Avatar Visibility Rule (Locked 2026-07-01 · S-LIBRARIAN-01c-design)

Any UI element that attributes an action to a specific agent — primary execution (agent picker, roster, step cards) or secondary/collaboration credit (e.g. Dan Bingham's Prompt Service chip) — must render that agent's `AgentAvatar`, never a name-only text badge.

- **Shape:** `<AgentAvatar who={agentId} size={18} ring={false} />` immediately before the text it labels, inside the same flex row.
- **Precedent:** `StepList.jsx` (~line 133/139) — avatar + text span, `gap: 5`.
- **Retrofit example:** Dan Bingham's collaboration chip in `PromptEvolutionModal.jsx` (S-LIBRARIAN-01c) — the colored `"Dan Bingham PS-01"` text badge gained an avatar to its left; the text badge itself was not removed.
- Any new agent-attribution UI must ship avatar-inclusive from day one — not retrofitted later.

---

## Section 18 — ChartRenderer / Generic Visualization (Locked 2026-07-06 · S-ARCH-VIZ-01-design)

The platform's `visualization` mechanism (`ARCHITECTURE.md` §19g) has exactly one frontend rendering path, `ChartRenderer` (`SharedUI.jsx`) — never a bespoke per-capability chart component. Any future capability whose Format Skill returns `visualization` reuses this component; do not hand-roll a second chart for a new data shape — register a new renderer in `CHART_RENDERERS` instead.

- **Props:** `{ type, data, caption }` — `type` selects the renderer from `CHART_RENDERERS` (returns `null` if unregistered), `data` is passed through untouched to that renderer, `caption` renders generically above the chart regardless of type.
- **Caption styling:** `body` font, `11px`, `T.mutedDeep`, italic — same treatment as other small explanatory text in the app (compare `VendorDiversityTab.jsx`'s benchmark-line captions).
- **`bar_pair` (first registered type):** one row per metric, label line (`metric  current → projected unit`, `body` `11.5px`, arrow in `T.brassDeep`) above a fixed-height (`46px`) two-bar `recharts` `BarChart` — current bar `T.mutedDeep`, projected bar `T.brass`, `XAxis` hidden (units vary per metric, a shared scale would mislead), `YAxis` shows only `"now"`/`"proj"` category ticks (`mono`, `9px`, `T.muted`). Each metric's bars scale against their own independent max, never a shared axis across metrics.
- **Placement:** wherever the capability's own content renders (e.g. Market Intelligence's Evidence column) — the calling screen's only job is `{result.visualization && <ChartRenderer type={result.visualization.chart_type} data={result.visualization.chart_data} caption={result.visualization.caption}/>}`, never a capability/screen conditional around it.
- **Adding a chart type:** register one more renderer in `CHART_RENDERERS`, extend the enum in whichever skill's schema opts in. Never edit `ChartRenderer` itself, never add a capability-specific branch anywhere in this file.

---

## Section 19 — Data Type / Confidence Tier Display Labels (Locked 2026-07-07 · S-MI-15-design)

The raw `data_type` (`the_library` rows) and `confidence_tier` (Q&A answers) values are **display-layer relabeled only** — the underlying enum strings (`sourced`/`inferred`/`synthesized`/`learned`/`na`) are unchanged in the DB and in every Skill Profile's LLM-facing schema (7 live profiles reference this vocabulary: `ci-answer-intent`, `data-escalate-intent`, `intelligence-review-format`, `library-write-intent`, `qa-answer-format`, `qg-review-intent`, `solution-catalog`). Never rename the stored enum value itself — only the human-facing label a component renders.

One shared mapping (name TBD by the coding session, lives in `MarketIntelligenceScreen.jsx` since every current usage site is in that file):

| Raw value | Context | Display label | Badge color | Who-tag? |
|---|---|---|---|---|
| `sourced` | any | **Sourced** | `T.moss` | No |
| `inferred` | any | **Analysis** | `T.brass` | Yes — from `the_library.source` (`user`→"Human", `agent`→"AI"). No `source` column exists on a `confidence_tier` context (a live answer) — that case has no who-tag, it's implicitly AI |
| `synthesized` | `the_library` row, `is_baseline=true` | **Source Simulation** | `T.mutedDeep` | No |
| `synthesized` | `the_library` row, `is_baseline=false` — OR any `confidence_tier` context (no baseline concept applies to a live answer) | **Analysis** | `T.brass` | Same rule as `inferred` above |
| `learned` | `the_reasoning` row | **Learned** | `T.navyMid` | No |
| `na` | `confidence_tier` only | *(no `the_library` equivalent)* | `T.muted` | No |

**Why this split exists (don't re-litigate without re-reading this):** "Analysis" is deliberately the *only* type with a who-tag — Sourced's trust comes from the external citation regardless of who entered it, Source Simulation is inherently a one-time demo-seeding action, and Learned is always the Reasoner's own automatic write. Analysis is the one type a human's own judgment and an AI's own judgment can both produce (confirmed live: the two seeded `inferred` rows have `source: 'user'`, i.e. human-authored analysis already exists today), so it's the one place the distinction changes how much a user should trust it.

**Existing render sites this rule already applies to** (found during `S-MI-15-design`'s Architect Review — do not add a second, inconsistent mapping): the Evidence column's static layer legend, the Pipeline Log's `confidence_tier` summary text (previously raw, e.g. `confidence_tier: inferred`), and the new Data Sources drawer (`MI-15`).

---

## Section 20 — Chat Card Conventions: Actor-First Headers + Human Attribution (Locked 2026-07-07 · S-MI-27-design)

**AI-generated card headers are actor-first, always.** Any Market Intelligence chat card attributing content to a specific agent renders `<Agent Name> · <Capability/Label>` — name before label — so the header reads like a real chat participant, not a capability log line. Locked after `MI-28` corrected the Hypothesis Test card's header (`AI - Hypothesis Test · Priya Nair`) to match the Q&A card's pre-existing order (`Marcus Webb · Channel Intelligence`). Any future AI-card header on this screen follows this order; the Q&A card's shape is the reference, not the exception.

**`UserAvatar` (`SharedUI.jsx`) is the canonical human/non-agent attribution component — deliberately outside Section 17's scope.** Section 17's avatar-mandatory rule requires `AgentAvatar` for any *agent* attribution; it does not apply to content the human themselves authored (e.g. a submitted hypothesis). `UserAvatar` is a plain navy circle + simple silhouette — never an illustrated `AgentAvatar` portrait, and never backed by `AVATAR_CFG`/a roster entry — so it reads unmistakably as "not an agent" at a glance. Use it for any future human-authored chat content that needs attribution; do not extend `AgentAvatar`/`AVATAR_CFG` with a fake "you" entry to solve this instead.

---

## Section 21 — Mobile Composition: Chat/Evidence Tab Shell (Locked 2026-07-14 · S-MI-51-design — supersedes the 2026-07-13 `S-MI-45-design` full-screen-overlay version)

Below `MOBILE_BREAKPOINT` (768px, `useIsMobile()` — Section 22), `MarketIntelligenceScreen.jsx` renders a **different composition of the same shared components**, not a CSS reflow of the desktop grid. Desktop (`>= 768px`) renders the existing `InteractColumn` / `EvidenceColumn` / `AuditColumn` 3-column grid completely unchanged — this rule governs the mobile branch only, by construction.

- **Chat and Evidence are a permanent tab bar**, not a hidden overlay behind a small corner button. The tab bar replaces `InteractColumn`'s own static avatar/name/caption header on mobile (a `bare` prop drops it there — desktop's `InteractColumn` call keeps the header, unchanged). Evidence is **disabled** (unclickable, visually de-emphasized) until a theory flow is active (`!!hypFlow`); once active, whichever tab has content the user hasn't looked at **flashes** on its own tab (reuses the existing `aiBlink` pulse) — symmetric in both directions (Evidence flashes if new theory content lands while on Chat; Chat flashes if a new answer lands while on Evidence).
- **Elapsed/expect/agent-status is a permanent strip**, visible under either tab regardless of which is active. This directly fixes a real bug the prior (overlay) composition had: the one progress indicator that existed lived inside chat's scrollback, invisible the instant the Evidence overlay covered it. Promoting it out of the tab-content area to a shared, tab-independent strip means it's never hidden again.
- **Question box, Send, and a Clear link are permanent**, reachable regardless of active tab — not embedded inside the Chat tab's own content. Clear resets chat + any active flow to the seed-question empty state, same end state as a refresh, no confirm dialog.
- **Agent Routing feed stays exactly where it was** — pinned, bottom, unchanged content/behavior, not part of the tab switch. Its bottom-edge scroll-hint (fade gradient + bouncing chevron, shown only when `scrollHeight - scrollTop - clientHeight > 4`, reuses the `dbounce` keyframe) was already shipped (`MI-50`) but never documented here until this session — noted now as part of its permanent placement, unchanged by this session.
- **"Agent & Data Info" (renamed from "Activity") moves to the page-title row**, not the tab bar — a small button top-right, next to "Channel Sales Intelligence," mobile-only. Still a full-screen overlay, still dismissed via "← Back to Chat" only (unchanged interaction convention). Carries the same four non-routing drawers (Agents, Data Sources, Analysis, Agent Reasoning) as before.
- **Header/nav mobile treatment remains out of scope for this rule** — `AppShell.jsx`'s own header is a separate concern (Section 24).

**Historical note (superseded, kept for reference):** the original `S-MI-45-design` composition — both Evidence and "Activity" as full-screen overlays triggered by small corner buttons, no tab bar, no permanent status/input/Clear strip — is fully replaced by the above. Do not resurrect the overlay-only pattern for Evidence or for routing/status content.

**Amended 2026-07-14 (`S-MI-50-design`, `MI-50`) — pinned Agent Routing feed needs a visible scroll affordance.** John's live report: the pinned feed's plain `overflowY:"auto"` gave no visual signal it was scrollable — easy to miss on mobile where native scrollbars are thin/auto-hiding. Fix: a bottom-edge fade gradient (`linear-gradient` from transparent to `T.cardAlt`, matching the panel's own background) plus a small bouncing chevron, both rendered only when there's genuinely more content below the visible area (`scrollHeight - scrollTop - clientHeight > 4px`, re-checked on scroll and whenever the event list grows) — never a static decoration shown when the feed is already fully visible or already scrolled to the bottom. Reuses the existing `dbounce` keyframe (`tokens.js` `GLOBAL_CSS`) for the chevron's motion — no new keyframe added. Scoped to this one panel only, not applied to the Evidence/Activity overlays (not reported as an issue there).

**Amended 2026-07-14 (`S-MI-56-design`, `MI-56`) — Question box/Send/Clear collapses to one row.** John's live screenshot report: the permanent Send/Clear strip this section describes above was actually rendered as **two stacked rows** — input+Send on one line, then a second nearly-empty full-width row underneath containing only the right-aligned "Clear" link — which read as a stray, disconnected element rather than a cohesive control group. Fixed by merging into a single row: input (`flex:1`) — Send — a thin `1px` `T.lineSoft` vertical divider — Clear, in that order, with the divider doing double duty as both a visual grouping cue and a deliberate small gap before the destructive, no-confirm-dialog Clear action (mitigates accidental taps landing on Clear right after tapping Send, without adding a confirm step — that "no confirm dialog" decision from `S-MI-51-design` is unchanged, out of scope for this fix). Purely a layout change — `onClear`'s behavior, the input's `id`/`onKeyDown` handling, and every other permanent-strip element (elapsed/expect status, Agent Routing feed) are untouched.

## Section 22 — `useIsMobile()` / Responsive Breakpoint (Locked 2026-07-13 · S-MI-45-design)

`src/hooks/useIsMobile.js` is the platform's single breakpoint source — `MOBILE_BREAKPOINT = 768`, a `matchMedia`-backed hook returning a boolean, re-evaluated on resize/orientation change. Any future responsive branch imports this hook; never re-derive a breakpoint constant or a second `window.innerWidth`/`matchMedia` check inline in a screen file — one source, cross-referenced everywhere it's used (Category M).

## Section 23 — Splash Modal: Mobile Sizing (Locked 2026-07-13 · S-MI-45-design)

`WelcomeSplash.jsx`'s overlay/panel mechanic (navy blur backdrop, brass-bordered panel, dismiss-on-backdrop-click + × button, `sessionStorage` gate) is unchanged on mobile — same component, same copy, same dismiss logic, zero behavior change. Only the panel's sizing branches on `useIsMobile()`: desktop keeps `width: 80vw, maxWidth: 960, maxHeight: 88vh`; mobile uses `width: 75vw, height: 75vh` (no `maxWidth` cap needed — 75vw of a phone viewport is always well under 960px). Internal padding and the headline's `clamp()` type scale reduce proportionally on mobile so hero content doesn't overflow the smaller panel; content and structure are otherwise identical to desktop.

**Amended 2026-07-13 (`S-SPLASH-03-design`, `SH-22`) — no internal scroll on mobile, ever.** John's explicit call: the mobile splash must never be a scrollable panel — every element (logo, eyebrow, headline, subhead, CTA, capability strip) fits inside the fixed `75vh` without the user having to scroll to see any of it. `panelMobile` overrides `overflowY` to `"hidden"` (not `"auto"`, unlike desktop's `panel`) — this is a structural guarantee, not just a sizing target, so a future content addition that doesn't fit gets silently clipped rather than silently starting to scroll again; treat a clipped mobile splash as a bug to fix by shrinking further, not by reverting to scroll. Achieved by a full mobile-specific typography/spacing scale for every style object in the hero body (roughly 40-60% of desktop's padding/font-size/margin values) — **no copy was shortened or removed**, the math worked out with real margin to spare at realistic phone heights (~630px panel from an ~844px-tall device). Panel `width`/`height` (`75vw`/`75vh`) and every interaction (backdrop-click, × button, `sessionStorage` gate) are unchanged — this amendment is content-fit only.

---

## Section 24 — Mobile Header: Hamburger Drawer (Locked 2026-07-13 · S-MOBILE-NAV-01-design)

Below `MOBILE_BREAKPOINT` (Section 22), `AppShell.jsx`'s header collapses to **logo + shrunk subtitle + a single hamburger trigger**, replacing the desktop Work-dropdown/Bench-tab/AI-Audit-button/About-button row entirely (that row is unchanged on desktop — this rule governs the mobile branch only, gated by `useIsMobile()`, same construction as Section 21).

- **Subtitle shrinks, does not drop.** "AI Workforce Platform" stays under the "DeepBench" wordmark at a much smaller size (~5.5px) rather than being removed — confirmed by John over dropping it.
- **The hamburger opens a right-side drawer, not a full-screen takeover.** This is a deliberate departure from Section 21's Evidence/Activity convention: `width: 82%`, slides from the right, with a dimmed (`rgba(18,36,60,.5)`) tappable backdrop covering the remaining viewport. **Dismiss allows both** the explicit × button **and tap-on-backdrop** — also a deliberate departure from Section 21 (back-button-only), because a navigation menu is lower-stakes than a content overlay a user might be mid-scroll through.
- **One unified list, grouped by the desktop nav's existing structure** — "Work" (Channel Sales Intelligence, Project Management, Spend Analysis — the same 3 destinations as the desktop Work dropdown), "Bench" (Agent Roster — the desktop Bench tab's single destination), "Platform" (AI Audit, About DeepBench). Current route highlighted (brass left border, matches the existing Left Sidebar Nav Pattern's active-state treatment, Section 10).
- **The "AI is thinking…" status dot is dropped entirely on mobile**, no replacement indicator. It's already suppressed on the MI route in favor of MI's own chat-embedded working-status UI (Section 21); other routes simply lose the signal on mobile for now.
- **`rightContent`/`onBack` are not rendered on mobile at all.** John's call: these don't belong in shared header chrome to begin with — they're a control that belongs in the calling screen's own body. This is **not yet fixed** for screens that rely on them (e.g. Analyzer's "← Column Mapping"); tracked as `SH-20`, a real gap, not a silent regression. Do not add a mobile-only exception back into `AppShell.jsx` to route around this — the fix belongs in the calling screen.

## Section 25 — Terminology: "Channel Sales Intelligence" / "Agent Roster" (Locked 2026-07-13 · S-MOBILE-NAV-01-design)

Display-text-only rename, same pattern as `S-RENAME-01`: only what a user reads changes. `MarketIntelligenceScreen.jsx`'s filename, the `/` route, every `MI-*`/`RO-*` feature ID, every `S-MI-*` session name, and every internal variable/constant (`MI_LOOP_SCOPE`, `SERVICE_LABEL`, etc.) are **unchanged** — this is not a backend or architecture rename.

- "Market Intelligence" → **"Channel Sales Intelligence"** everywhere a user reads it: the Work dropdown/mobile menu item, `MarketIntelligenceScreen.jsx`'s own page title, its Agent Routing empty-state copy, and `WelcomeSplash.jsx`'s capability strip.
- "Bench" → **"Agent Roster"** everywhere it names the *screen*: `RosterScreen.jsx`'s own headline ("Your bench." → "Your agent roster."), and the Bench item inside the new mobile menu. The **top-level nav tab stays "Bench"** (both desktop `NavTab` and the mobile menu's group label) — John's explicit call, the primary navigation label and the screen's own name are treated as two different things.
- `AboutPanel.jsx`'s two "Bench" mentions are **out of scope for this session** — one plausibly should rename ("Bench Dashboard" describing the module), one plausibly shouldn't (an instructional step telling the user to click the "Bench" nav tab, which isn't renaming). Deliberately deferred rather than guessed — do not touch `AboutPanel.jsx` in this session.

## Section 26 — Side-Panel Overlay Mobile Pattern (Locked 2026-07-13 · SH-21-design)

Below `MOBILE_BREAKPOINT` (Section 22), a right-side slide-over panel triggered from header/menu chrome (`AboutPanel.jsx` is the first application; `AIActivityPanel.jsx` is a known future candidate, not touched by this rule) follows this convention rather than Section 21's full-screen-overlay convention — a side panel is lower-stakes/more navigational than a content drawer, same reasoning already applied to Section 24's hamburger menu:

- **Panel width: reuse Section 24's `82%` / `maxWidth: 340` exactly**, not a separate mobile width value. One drawer-width convention platform-wide, not a per-component number.
- **Tab bars with more items than comfortably fit `flex:1`-per-tab at mobile width switch to horizontal scroll** (`overflowX:"auto"`, tabs sized to their own content via `flex:"0 0 auto"`, `whiteSpace:"nowrap"`) instead of continuing to shrink `flex:1` slices — same fix already applied to Spend Analyzer's workflow strip (`S-MOBILE-SPEND-01`) for the identical "too many items, narrow screen" shape. Do not keep flex-squeezing text below the 11px legibility floor as an alternative.
- **Multi-column content grids inside the panel body drop to fewer columns on mobile**, not a blanket single-column rule — judge by content density per grid, same as the KPI-grid precedent (`S-MOBILE-SPEND-01` Design Rules): a 2-item comparison grid can stay 2-column at mobile width, a dense numeric-tile grid drops from 3→2, a 3-way text-heavy comparison (e.g. a Now/Next/Later roadmap) drops to a single stacked column.
- **Backdrop-tap-to-dismiss stays** (this is a navigational/reference panel, not a content-entry flow) — same dismiss mechanic as Section 24, not Section 21's back-button-only rule.
- Desktop rendering is unchanged by construction — every branch above is gated by `useIsMobile()`.

---

## Section 27 — Card-Grid Screen Mobile Composition (Locked 2026-07-13 · S-MOBILE-ROSTER-01-design)

Below `MOBILE_BREAKPOINT` (Section 22), a screen built around a **left sidebar filter nav + multi-column card grid** (`RosterScreen.jsx` is the first application; any future roster/catalog-style screen with the same shape is a candidate) recomposes as follows — a distinct branch, not a CSS reflow, same construction as Section 21/24/26:

- **Left sidebar filter nav → horizontal scroll chip row**, inserted inline in the content flow (directly below the page's masthead divider, not as a separate column). Same active-state logic as the existing Left Sidebar Nav Pattern (Section 10) — brass tint background + brass accent border — but the border axis rotates from left (vertical list) to bottom (horizontal row), since a left border reads correctly only in a vertical layout.
- **A stat strip with more values than comfortably fit one row drops to a fixed-column grid** (3 columns for 5 stats, wrapping 3+2) directly below the chip row, same "reflow, don't shrink-to-illegible" principle as Section 26's tab-bar rule. Any strip-level secondary action (e.g. an "Add" button) moves to a full-width control below the grid rather than staying inline.
- **Low-priority strip metadata (e.g. a workspace/tenant label) is dropped on mobile entirely**, not shrunk or relocated — judged per-item on whether it's load-bearing for a phone-sized read, same judgment call as Section 24's AI-status-dot removal.
- **Multi-column card grid → single column, full width.** The card component itself is reused completely unchanged — do not fork or trim card content for mobile; if a card renders correctly at its desktop column width (roughly phone-width already, e.g. ~330-380px), it needs no mobile-specific treatment of its own.
- **Page scroll stays a single continuous column** (chip row + stat grid + every card), no pagination/truncation of list contents and no internal double-scroll region — this pattern does not use Section 21's fixed-viewport/pinned-pane composition, since a browsable list (unlike a live chat) has no state that scrolling away would lose.
- Desktop rendering is unchanged by construction — every branch above is gated by `useIsMobile()`.

---

## Section 28 — Guided Agent-Attributed Action (Locked 2026-07-14 · S-MI-51-design)

Any UI moment that invites a specific agent to perform a specific next step — a real button/CTA the user clicks to trigger real work, not a status tick — pairs the agent's **first name + their real role** from `src/data/agents.js` (never an invented persona, never full last name): e.g. *"Have Priya (Forecast/Theory/Performance Expert) test this theory →"*, *"Nadia (Data Expert) drafted this Data Room entry — review it before it's saved."* This lets the user see *why* that particular persona was picked for the job, not just who did it.

**Does not apply to transient status-strip ticks** — `AgentWorkingIndicator`'s live "Priya is testing…" message stays first-name-only, no role (Section 5a already locks this; adding a role there would be noise on a line that already ticks every second, not a new introduction moment).

**Does not apply to the Agent Routing drawer's own row headers** — first-name-only, no role (Section 5, `MI-52`). **Correction (`MI-55`, 2026-07-14):** this section originally said the drawer showed full names, per the carve-out that stood at the time this section was written — `MI-52` (shipped later the same day) reversed that convention; this note was stale from the moment `MI-52` landed and is corrected here.

First application: `MI-51`'s guided review→theory→decide flow (two Priya CTAs, one Nadia confirmation intro, one Nadia recall-pointer message). Any future screen inviting a specific agent to do specific work reuses this same first-name+role pairing rather than inventing a new convention.

---

## Section 29 — Resizable Drawer (Locked 2026-07-14 · S-MI-55-design)

The shared `Drawer` component (`SharedUI.jsx`) supports an opt-in `resizable` prop — a plain brass/treasury grip bar at the bottom edge of the drawer's content area (only rendered when open), drag cursor `ns-resize`. Dragging never shrinks below the drawer's own passed `maxHeight` (the floor) and never grows past `min(80vh, the drawer's real content height)` (the ceiling — refuses empty padding space, refuses to exceed 80% of the viewport). Not persisted — always resets to the default height on reload. Default off; every consumer that doesn't pass `resizable` is byte-unaffected.

First (and, as of this session, only) application: `AuditColumn`'s Agent Routing drawer, desktop only — growing it pushes Column 3's other four drawers (Agents/Data Sources/Analysis/Agent Reasoning) down in normal page flow, intentionally past the viewport fold when dragged tall enough (`AuditColumn` has no outer height cap of its own — see `MI-41`, a separate, still-open finding about the other four drawers' *unintended* version of the same growth). Mobile's pinned Agent Routing feed is a different render path (`MobileBody`), not this component — out of scope by construction. Any future Column 3 drawer that wants the same drag-resize behavior reuses this prop rather than rebuilding the handle.

---

## Change Log

| Date | Session | Rule Added / Changed |
|------|---------|---------------------|
| 2026-07-14 | S-MI-56-design | Section 21 amended — permanent Question box/Send/Clear strip (`S-MI-51-design`) was rendering as two stacked rows on mobile, Clear left orphaned alone on a near-empty second row; John's live screenshot report. Merged to one row: input — Send — thin divider — Clear, divider doubling as accidental-tap mitigation for the no-confirm-dialog Clear action. Layout only, no behavior change. Kickoff: `docs/kickoffs/v6.2.25-MI-56-mobile-chat-input-clear-row-merge.md`. |
| 2026-07-14 | S-MI-51-design | Section 21 rewritten — Chat/Evidence permanent tab bar replaces the full-screen-overlay composition (`S-MI-45-design`, superseded): Evidence disabled until active + symmetric flash, permanent status/input/Clear strip (fixes the chat-overlay dead-air bug), Agent Routing unchanged at the bottom. Section 28 added — Guided Agent-Attributed Action (first name + real role at any agent-invocation CTA, not on status ticks or routing-drawer rows). Also corrects `MI-50`'s tracking: its code and this section's prior scroll-hint amendment were already live/locked, but `FEATURES.md` still read "Kickoff written" and no kickoff file was ever actually committed — see `FEATURES.md`'s `MI-50` row and `CLAUDE-STATE.md` for the correction. Kickoff: `docs/kickoffs/v6.2.18-MI-51-guided-review-theory-flow.md`. |
| 2026-07-14 | S-MI-50-design | Section 21 amended — pinned Agent Routing feed (mobile MI) gets a visible scroll affordance: bottom-edge fade gradient + bouncing chevron, shown only when there's real unscrolled content below, reuses the existing `dbounce` keyframe. Scoped to this one panel. Kickoff: `docs/kickoffs/v6.2.15-MI-50-routing-feed-scroll-affordance.md`. |
| 2026-07-13 | S-SPLASH-03-design | Section 23 amended — mobile splash must never scroll internally (John's explicit call): `panelMobile`'s `overflowY` locked to `"hidden"` (structural, not just a sizing target), full mobile-specific typography/spacing scale added to every hero-body style object (~40-60% of desktop's values), zero copy shortened or removed. Panel size (`75vw`/`75vh`) and every interaction unchanged. Originally filed as `SH-21`, renumbered to `SH-22` after finding that ID already claimed by a concurrent session (`SH-21` = mobile About DeepBench panel) — caught before any code was written. Kickoff: `docs/kickoffs/v6.2.11-SH-22-S-SPLASH-03-mobile-splash-no-scroll.md`. |
| 2026-07-13 | SH-21-design | Section 26 added — Side-Panel Overlay Mobile Pattern locked: reuse Section 24's 82%/340px drawer width, horizontal-scroll tab bars instead of flex-squeezing, per-grid column reduction (not blanket single-column), backdrop-tap-to-dismiss retained. First applied to `AboutPanel.jsx`. Kickoff: `docs/kickoffs/v6.2.6-SH-21-about-panel-mobile-responsive.md`. |
| 2026-07-13 | S-MOBILE-NAV-01-design | Sections 24-25 added — `AppShell.jsx` mobile header locked: hamburger opens an 82%-width right-side drawer (not a full-screen takeover, deliberate departure from Section 21), dismiss allows both × and tap-outside (also a departure), subtitle shrinks not drops, AI status dot dropped on mobile, `rightContent`/`onBack` not rendered on mobile at all (tracked gap, `SH-20`). Terminology locked: "Market Intelligence" → "Channel Sales Intelligence" and "Bench" → "Agent Roster" (screen name only — top-level nav tab stays "Bench"), display-text-only per the `S-RENAME-01` pattern. `AboutPanel.jsx` explicitly excluded, deferred. Kickoff: `docs/kickoffs/v6.2.0-S-MOBILE-NAV-01-hamburger-menu-and-renames.md`. |
| 2026-07-13 | S-MI-45-design | Sections 21-23 added — Mobile Composition for `MarketIntelligenceScreen.jsx` locked: chat-primary flex 3:1 split with a pinned, full-data Agent Routing feed; Evidence/Activity as full-screen overlays (reusing `AboutPanel`/`AIActivityPanel`'s existing convention, back-button-only dismiss); Evidence live badge when `hypFlow` active. `useIsMobile()` (`src/hooks/useIsMobile.js`, `MOBILE_BREAKPOINT=768`) locked as the platform's single breakpoint source. `WelcomeSplash.jsx` mobile sizing locked (`75vw × 75vh` vs. desktop's `80vw/max960/88vh`, same mechanic/copy). Desktop composition confirmed untouched by construction — mock reviewed and approved by John (interactive HTML mock, iterated live). Kickoff: `docs/kickoffs/v6.1.46-S-MI-45-mobile-responsive-mi-splash.md`. |
| 2026-07-07 | S-MI-27-design | Section 20 added — AI-card headers locked actor-first (name before capability label); `UserAvatar` locked as the canonical human-attribution component, explicitly outside Section 17's agent-only scope. |
| 2026-07-07 | S-BENCH-FILTER-01-design | Section 10 note added — Left Sidebar Nav Pattern confirmed reusable beyond Personnel File: `RosterScreen.jsx` adopts it for the new RO-10 category filter nav, same 180px width. |
| 2026-07-07 | S-MI-15-design | Section 19 added — Data Type/Confidence Tier display-label relabel locked: `inferred`/non-baseline-`synthesized` → "Analysis" (with Human/AI who-tag from `source`), baseline-`synthesized` → "Source Simulation", `sourced`/`learned` unchanged. Display-only — zero backend/schema change. |
| 2026-06-08 | S-MIGRATE-UX | Treasury palette locked, left nav pattern locked |
| 2026-06-08 | S-MIGRATE-01a | AgentAvatar, illustrated SVG avatars in SharedUI |
| 2026-06-09 | S-MIGRATE-03 | Inline sub-view pattern (PE-10) |
| 2026-06-09 | S-MIGRATE-03-patch | AiBadge color rule: match button label color. No badge on Cancel state. |
| 2026-06-09 | S-BENCH-UX-01 | AiBadge known limitation: not visually distinct on brass backgrounds — blocked pending RO-08 design in S-BENCH-UX-02. |
| 2026-07-01 | S-LIBRARIAN-01c-design | Section 17 added — Agent Avatar Visibility Rule locked (AA-73): any agent-attribution UI, primary or collaboration credit, must render `AgentAvatar`, never name-only text. |
| 2026-06-09 | S-BENCH-UX-02 | RO-08 resolved: AiBadge on brass = navy chip override; on moss = white chip override. Badge stays inside button. No badge on non-AI actions (file browse). |
| 2026-07-06 | S-ARCH-VIZ-01-design | Section 18 added — `ChartRenderer`/`CHART_RENDERERS` generic visualization dispatch locked (`AA-117`, `ARCHITECTURE.md` §19g): one frontend rendering path for any capability's agent-chosen `visualization` output, first registered type `bar_pair`. |
