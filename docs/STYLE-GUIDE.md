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

**Primary/confirm CTA fill (Locked 2026-07-27, `S-CHI-80`):** decision and confirmation primary buttons use `T.navy`, not `T.brass` — the shared `DecisionFooter` primary ("Create Forecast" etc.), `ConfirmationCardActions`' Accept, and the Edit-mode "Resubmit" all fill navy. `T.brass` is an accent/border color, not a primary-action fill; a brass primary button is the outlier to fix, not a variant.

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

### 5b. Live Agent View canvas — assembly work tint (Locked 2026-07-31, `S-AA-179-design`, John)

The LAV canvas's color vocabulary is semantic and closed — one meaning per tint, never reused:
brass family = routing, `ACTION_TEXT_COLORS_FETCH.CLICK` blue = orchestrating, `T.moss` = complete,
`T.flag` = error/recovery, and (this session) **`T.mutedDeep` ring / `T.muted` caption = assembly
work** — the quiet-infrastructure register for prompt-assembly frames (`assembly_work`/
`assembly_work_complete`, `ARCHITECTURE.md` §19h extension). Hard rules, same bar as §19d's sniff
test: **assembly work never draws an edge, an arrow, or an edge-pulse** (arrows mean agent-reasoned
routing and nothing less — a worker's ring with no arrow touching it *is* the statement "contributing
to the prompt, nobody routed to them"); the ring reuses `lavRipple`, no new keyframes; bubble/rail
copy comes only from the frame's own fields (real counts, `—` when absent, never invented); the
legend's `Assembly work` entry renders a **ring** swatch, not a bar, because a bar would imply an
assembly edge exists. Any future non-delegation frame class added to the stream picks its own tint
from unclaimed tokens rather than reusing one of these six meanings.

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

**Existing render sites this rule already applies to** (found during `S-MI-15-design`'s Architect Review — do not add a second, inconsistent mapping): the Pipeline Log's `confidence_tier` summary text (previously raw, e.g. `confidence_tier: inferred`), and the Data Sources drawer (`MI-15`). **(`MI-59`, 2026-07-14: the Evidence column's own static layer legend — the 3rd former render site — was removed outright, a dummy display with no click handler or flow tie; `describeDataType()` itself is unchanged, still used by the 2 remaining sites above.)**

---

## Section 20 — Chat Card Conventions: Actor-First Headers + Human Attribution (Locked 2026-07-07 · S-MI-27-design)

**AI-generated card headers are actor-first, always.** Any Market Intelligence chat card attributing content to a specific agent renders `<Agent Name> · <Capability/Label>` — name before label — so the header reads like a real chat participant, not a capability log line. Locked after `MI-28` corrected the Hypothesis Test card's header (`AI - Hypothesis Test · Priya Nair`) to match the Q&A card's pre-existing order (`Marcus Webb · Channel Intelligence`). Any future AI-card header on this screen follows this order; the Q&A card's shape is the reference, not the exception.

**`UserAvatar` (`SharedUI.jsx`) is the canonical human/non-agent attribution component — deliberately outside Section 17's scope.** Section 17's avatar-mandatory rule requires `AgentAvatar` for any *agent* attribution; it does not apply to content the human themselves authored (e.g. a submitted hypothesis). `UserAvatar` is a plain navy circle + simple silhouette — never an illustrated `AgentAvatar` portrait, and never backed by `AVATAR_CFG`/a roster entry — so it reads unmistakably as "not an agent" at a glance. Use it for any future human-authored chat content that needs attribution; do not extend `AgentAvatar`/`AVATAR_CFG` with a fake "you" entry to solve this instead.

---

## Section 21 — Mobile Composition: Chat/Evidence Tab Shell (Locked 2026-07-14 · S-MI-51-design — supersedes the 2026-07-13 `S-MI-45-design` full-screen-overlay version)

Below `MOBILE_BREAKPOINT` (768px, `useIsMobile()` — Section 22), `MarketIntelligenceScreen.jsx` renders a **different composition of the same shared components**, not a CSS reflow of the desktop grid. Desktop (`>= 768px`) renders the existing `InteractColumn` / `EvidenceColumn` / `AuditColumn` 3-column grid completely unchanged — this rule governs the mobile branch only, by construction.

- **Chat and Evidence are a permanent tab bar**, not a hidden overlay behind a small corner button. The tab bar replaces `InteractColumn`'s own static avatar/name/caption header on mobile (a `bare` prop drops it there — desktop's `InteractColumn` call keeps the header, unchanged). Evidence is **disabled** (unclickable, visually de-emphasized) until it has content (`!!qaEvidence || !!hypFlow` — corrected `CHI-03c`, was `!!hypFlow` alone); once active, whichever tab has content the user hasn't looked at **flashes** on its own tab (reuses the existing `aiBlink` pulse). **Corrected 2026-07-16 (`CHI-03c`):** Evidence flashes for new `qaEvidence` **or** `hypFlow` content landing (an answer or a theory result) while on Chat; Chat flashes for new conversational content (pointer sentences, flags, `CHI-03b` acks) landing while on Evidence — matching what's actually implemented, not the pre-`CHI-03` hypFlow-only behavior this line previously described.
- **Elapsed/expect/agent-status is a permanent strip**, visible under either tab regardless of which is active. This directly fixes a real bug the prior (overlay) composition had: the one progress indicator that existed lived inside chat's scrollback, invisible the instant the Evidence overlay covered it. Promoting it out of the tab-content area to a shared, tab-independent strip means it's never hidden again.
- **Question box, Send, and a Clear link are permanent**, reachable regardless of active tab — not embedded inside the Chat tab's own content. Clear resets chat + any active flow to the seed-question empty state, same end state as a refresh, no confirm dialog.
- **Agent Routing feed stays exactly where it was** — pinned, bottom, unchanged content/behavior, not part of the tab switch. Its bottom-edge scroll-hint (fade gradient + bouncing chevron, shown only when `scrollHeight - scrollTop - clientHeight > 4`, reuses the `dbounce` keyframe) was already shipped (`MI-50`) but never documented here until this session — noted now as part of its permanent placement, unchanged by this session.
- **"Agent & Data Info" (renamed from "Activity") moves to the page-title row**, not the tab bar — a small button top-right, next to "Channel Sales Intelligence," mobile-only. Still a full-screen overlay, still dismissed via "← Back to Chat" only (unchanged interaction convention). Carries the same four non-routing drawers (Agents, Data Sources, Analysis, Agent Reasoning) as before.
- **Header/nav mobile treatment remains out of scope for this rule** — `AppShell.jsx`'s own header is a separate concern (Section 24).

**Historical note (superseded, kept for reference):** the original `S-MI-45-design` composition — both Evidence and "Activity" as full-screen overlays triggered by small corner buttons, no tab bar, no permanent status/input/Clear strip — is fully replaced by the above. Do not resurrect the overlay-only pattern for Evidence or for routing/status content.

**Amended 2026-07-14 (`S-MI-50-design`, `MI-50`) — pinned Agent Routing feed needs a visible scroll affordance.** John's live report: the pinned feed's plain `overflowY:"auto"` gave no visual signal it was scrollable — easy to miss on mobile where native scrollbars are thin/auto-hiding. Fix: a bottom-edge fade gradient (`linear-gradient` from transparent to `T.cardAlt`, matching the panel's own background) plus a small bouncing chevron, both rendered only when there's genuinely more content below the visible area (`scrollHeight - scrollTop - clientHeight > 4px`, re-checked on scroll and whenever the event list grows) — never a static decoration shown when the feed is already fully visible or already scrolled to the bottom. Reuses the existing `dbounce` keyframe (`tokens.js` `GLOBAL_CSS`) for the chevron's motion — no new keyframe added. Scoped to this one panel only, not applied to the Evidence/Activity overlays (not reported as an issue there).

**Amended 2026-07-18 (`S-CHI-25-design`, `CHI-25`) — pinned Agent Routing feed grows from 118px to 176px so its own scrollability isn't missed.** John's live report: the old 118px height only ever showed roughly one hop card (often not even a full one), so the `MI-50` fade/chevron above sat below something that already read as a complete, finished unit rather than visibly cut off. 176px was chosen so a real hop card renders in full and the next one is visibly truncated by the existing fade — the cut-off card itself is now part of the scroll affordance, not just the fade/chevron alone. The `MI-50` mechanism (`routingCanScrollMore` state, `checkRoutingScroll()`, the fade/chevron JSX) is completely unchanged — this amendment only changes the outer container `height` value it operates inside of. Desktop's `AuditColumn` drawer (`maxHeight={280}`) is unrelated and unchanged.

**Amended 2026-07-18 (`S-CHI-26-design`, `CHI-29`) — `MI-50`'s fade/chevron mechanism is extracted into a shared `SharedUI.jsx` piece (`useScrollFadeHint`/`ScrollFadeHint`), no longer a mobile-only inline copy.** This mobile feed's own behavior, exact values (26px height, 4px threshold, `dbounce` chevron), and appearance are byte-identical after the extraction — pure refactor, not a redesign. See Section 38 for the second call site (Column 2's analysis scroll box) this extraction now also serves.

**Amended 2026-07-14 (`S-MI-56-design`, `MI-56`) — Question box/Send/Clear collapses to one row.** John's live screenshot report: the permanent Send/Clear strip this section describes above was actually rendered as **two stacked rows** — input+Send on one line, then a second nearly-empty full-width row underneath containing only the right-aligned "Clear" link — which read as a stray, disconnected element rather than a cohesive control group. Fixed by merging into a single row: input (`flex:1`) — Send — a thin `1px` `T.lineSoft` vertical divider — Clear, in that order, with the divider doing double duty as both a visual grouping cue and a deliberate small gap before the destructive, no-confirm-dialog Clear action (mitigates accidental taps landing on Clear right after tapping Send, without adding a confirm step — that "no confirm dialog" decision from `S-MI-51-design` is unchanged, out of scope for this fix). Purely a layout change — `onClear`'s behavior, the input's `id`/`onKeyDown` handling, and every other permanent-strip element (elapsed/expect status, Agent Routing feed) are untouched.

**Amended 2026-07-17 (`MOB-001`, `mobile-ui-audit-0717`) — Clear's touch target was too small to reliably tap.** The merged-row Clear button (added by the `S-MI-56-design` amendment above) reused desktop's mouse-oriented `padding:"0 2px"` verbatim, rendering at 36×13px on mobile — confirmed live via `getBoundingClientRect()`, well under any reasonable touch-target size. Padding changed to `"9px 10px"`, matching Send's own vertical padding in the same row for a consistent row height (~30px+). Font size, color, the divider, and the no-confirm-dialog behavior are all unchanged — this is a touch-target fix only, not a redesign.

**Amended 2026-07-28 (`S-CHI-88-design`, `CHI-88`/`CHI-88a`, v6.3.198+v6.3.200) — minimalist mobile pass, John's Option A; six locked changes to this composition:**
- **Title chrome:** one-line 17px title with "(Beta)" inline, then a right-justified boxless text CTA `Agent & Data Info ›` (12px `body`, `T.brassDeep`, touch padding) on its own line. The subtitle string (`CHI_SUBTITLE`, single module-scope source) renders only inside the Agent & Data Info overlay on mobile; desktop title block unchanged.
- **`CHI-40`'s news hint banner is SUPERSEDED (removed, John-approved):** the flashing Steps & Evidence tab is the only at-rest news signal. Do not reintroduce a banner/loading line in that slot.
- **Input row (input/Send/divider/Clear) renders on the Chat tab only** — it is inside the chat branch, not shared chrome. Steps & Evidence has no input. Input font is **16px** (locked: any mobile text input must be ≥16px — below that, iPhone browsers auto-zoom the page on focus and never zoom back; confirmed on John's phone), and both submit paths blur the input so the keyboard drops.
- **Working status is one soft line, not a box:** `AgentWorkingIndicator compact` (nowrap, ellipsizing activity text, diamond → activity → `elapsed | expect`; per-agent time dropped on mobile only — §19o requires the expectation to stay). It renders globally between the tab body and the routing feed: under the input row on Chat, directly above the feed on Steps & Evidence.
- **The pinned routing feed shows no agent task text on mobile** (`describePipelineEvent(…, {terse:true})` falls through to `Completed <service>`); desktop keeps task text (John's explicit call). Feed height/fade (`CHI-25`/`MI-50`) unchanged.
- **Steps & Evidence tab wrapper is a bounded flex parent (`overflow:"hidden"`), never a scroller** — an `overflowY:"auto"` wrapper unbounds `EvidenceColumn` and silently disables its own `CHI-13`/`MI-54` scroll-body + pinned-footer anatomy (found live: 2,236px column inside a 210px scroller). The pinned `DecisionFooter` renders `compact` on mobile (`compact={bare}`): one-line ellipsized prompt, side-by-side buttons with a ≥30px `minHeight` floor. `ConfirmationCardActions` not yet compacted — `CHI-89`.

## Section 22 — `useIsMobile()` / Responsive Breakpoint (Locked 2026-07-13 · S-MI-45-design)

`src/hooks/useIsMobile.js` is the platform's single breakpoint source — `MOBILE_BREAKPOINT = 768`, a `matchMedia`-backed hook returning a boolean, re-evaluated on resize/orientation change. Any future responsive branch imports this hook; never re-derive a breakpoint constant or a second `window.innerWidth`/`matchMedia` check inline in a screen file — one source, cross-referenced everywhere it's used (Category M).

**QA device — locked 2026-08-01 (John's explicit call, `design-lav-mobile-0801`): iPhone 16 Pro, `402 × 874` CSS px (DPR 3).** Every mobile design and every mobile Manual QA item is checked at that viewport unless the item is specifically about another width. Root cause this closes: the breakpoint was the *only* responsive number ever written down, so each mobile session picked its own test width and none of them agreed — mobile QA evidence was not comparable across sessions. The breakpoint (768) is where the branch flips; this is where it gets judged. Note when mocking in a device frame: the bezel must be `content-box` or outside the element, or the viewport actually under test is smaller than 402×874.

## Section 23 — Splash Modal: Mobile Sizing (Locked 2026-07-13 · S-MI-45-design)

`WelcomeSplash.jsx`'s overlay/panel mechanic (navy blur backdrop, brass-bordered panel, dismiss-on-backdrop-click + × button, `sessionStorage` gate) is unchanged on mobile — same component, same copy, same dismiss logic, zero behavior change. Only the panel's sizing branches on `useIsMobile()`: desktop keeps `width: 80vw, maxWidth: 960, maxHeight: 88vh`; mobile uses `width: 75vw, height: 75vh` (no `maxWidth` cap needed — 75vw of a phone viewport is always well under 960px). Internal padding and the headline's `clamp()` type scale reduce proportionally on mobile so hero content doesn't overflow the smaller panel; content and structure are otherwise identical to desktop.

**Amended 2026-07-13 (`S-SPLASH-03-design`, `SH-22`) — no internal scroll on mobile, ever.** John's explicit call: the mobile splash must never be a scrollable panel — every element (logo, eyebrow, headline, subhead, CTA, capability strip) fits inside the fixed `75vh` without the user having to scroll to see any of it. `panelMobile` overrides `overflowY` to `"hidden"` (not `"auto"`, unlike desktop's `panel`) — this is a structural guarantee, not just a sizing target, so a future content addition that doesn't fit gets silently clipped rather than silently starting to scroll again; treat a clipped mobile splash as a bug to fix by shrinking further, not by reverting to scroll. Achieved by a full mobile-specific typography/spacing scale for every style object in the hero body (roughly 40-60% of desktop's padding/font-size/margin values) — **no copy was shortened or removed**, the math worked out with real margin to spare at realistic phone heights (~630px panel from an ~844px-tall device). Panel `width`/`height` (`75vw`/`75vh`) and every interaction (backdrop-click, × button, `sessionStorage` gate) are unchanged — this amendment is content-fit only.

---

## Section 24 — Mobile Header: Hamburger Drawer (Locked 2026-07-13 · S-MOBILE-NAV-01-design)

Below `MOBILE_BREAKPOINT` (Section 22), `AppShell.jsx`'s header collapses to **logo + shrunk subtitle + a single hamburger trigger**, replacing the desktop Work-dropdown/Bench-tab/AI-Audit-button/About-button row entirely (that row is unchanged on desktop — this rule governs the mobile branch only, gated by `useIsMobile()`, same construction as Section 21).

- **Subtitle shrinks, does not drop.** "AI Workforce Platform" stays under the "DeepBench" wordmark at a much smaller size (~5.5px) rather than being removed — confirmed by John over dropping it.

  **Amended 2026-07-17 (`MOB-001`, `mobile-ui-audit-0717`) — 5.5px measured genuinely illegible on a real device.** The original `~5.5px` figure above was confirmed by John at design time (`S-MOBILE-NAV-01-design`) but never checked against actual rendered legibility. Live measurement this session (`mobile-ui-audit-0717`) confirmed it renders as a barely-visible smear — well under every other mono micro-label on the platform (8-9.5px range: KPI strip labels, Agent Routing "LIVE" tag, this exact label's own 9.5px desktop value). Bumped to **7.5px** — still meaningfully smaller than the "DeepBench" wordmark (13px) and the desktop subtitle (9.5px), so "shrinks, does not drop" still holds, just no longer below the platform's own established micro-label floor. Surfaced to John live as a locked-section contradiction before changing it, per `CLAUDE-DESIGN.md`'s locked-section-staleness-check rule — his explicit call to revise, not just patch the code silently.
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

**Amended 2026-07-21 (`S-CHI-43-design`/`CHI-43`) — optional controlled-open mode.** `Drawer` gains two new opt-in props, `open` (boolean) and `onToggle` (fn, called with the next boolean on header click) — when `open` is `undefined` (every existing call site), behavior is byte-identical to before (internal `useState` still owns open/closed). When `open` is passed, `Drawer` becomes controlled: it renders exactly `open`'s value and calls `onToggle` on header click instead of managing its own state — the caller decides what happens next (including choosing not to change it). `resizable`/`maxHeight`/`defaultOpen`/`onOpen` are all unaffected and compose normally with either mode. First application: `EvidenceColumn`'s 2-drawer stack (`CHI-43`) — whichever of `qaEvidence`/`hypFlow` is "currently in play" auto-opens (and the column auto-scrolls to it) via this controlled mode, while the user can still freely toggle either drawer by hand; that manual choice persists until the next genuine state transition (a new `hypFlow` starting or ending), at which point the auto-computed default takes back over. Any future call site needing the same "the app decides the default, the user can still override it in the moment" pattern reuses controlled mode rather than re-deriving open/closed state externally and fighting `Drawer`'s own internal state.

**Amended 2026-07-21 (`S-CHI-45-design`/`CHI-45`) — optional `headerRight` slot.** `Drawer` gains a third opt-in prop, `headerRight` (a `ReactNode`, default `undefined`), rendered in the header's right-side group between `count` and the open/closed chevron — visible regardless of open/closed state, same as `count` already is. Default `undefined` is a no-op in JSX, so every pre-existing call site (7, as of this session) is byte-unaffected. First application: `EvidenceColumn`'s 2 drawers (`CHI-45`) each pass their own `HopBadge` here, relocated out of the open body content — see §40's `CHI-45` amendment for the full rationale.

**Amended 2026-07-22 (`S-CHI-59-design`/`CHI-59`) — `headerRight` can carry 2 badges at once.** When a drawer needs to show both `NeedsDecisionBadge` (§35's amendment, below) and `HopBadge` simultaneously, `headerRight` receives a small `<div style={{display:"flex",alignItems:"center",gap:6}}>` wrapping both — still a single `ReactNode`, no change to `Drawer` itself. First application: "Analysis & Narrative" and "Result" (`CHI-59`), each showing the decision badge only while a choice is pending, alongside their existing `HopBadge`.

---

## Section 30 — Stage-Status Copy Accuracy (Locked 2026-07-14 · S-MI-62-design)

Any stage-transition or working-status copy that names a specific mechanism or data source (e.g. "…from the Data Room") must be verified against the underlying Skill Profile's real `method` text before being written — never inferred from stage order, proximity, or what "sounds right" for that point in the flow. A claim that isn't backed by the real method text is a trust bug on the same footing as a fabricated AI-pattern tag (`MI-67`).

First application: `EvidenceColumn`'s hypothesis generating/testing stage sentences (`MI-62`) — the "generating" stage (`hyp-generation-intent`) doesn't mandate a Data Room query (plausibility-grounded only) and lost its Data Room claim; the "testing" stage (`hyp-hypothesis-test-intent`) does query the Data Room fresh and gained the claim it was previously missing.

---

## Section 31 — Agent Routing Log: Activity-Narration Copy + Same-Agent Continuation Rows (Locked 2026-07-14 · S-MI-68-design)

**Every `describePipelineEvent()` case (`MarketIntelligenceScreen.jsx`) describes what the agent is accomplishing, in plain language a first-time user would understand — never raw field names (`confidence_tier`, `self-flag`), never outcome content (the answer text, a citation, an eval critique, a version note). Real per-event data only surfaces where it was already load-bearing before this rule (`agent_selection`'s `reasoning`, `error`'s `message`) — trailing a generic activity label, not replacing it.** Locked after `S-MI-15-design`'s `confidence_tier` display-label rule (Section 19) turned out to still read as jargon once actually shown on this log — traced and confirmed live that this specific line can only ever show "Sourced"/"Analysis"/"—" (never "Source Simulation"/"Learned" — those require an `isBaseline`/`the_library`-row context this call site never passes), then John's call: drop the field-driven phrasing entirely rather than add a legend to explain it.

**Same-agent consecutive rows never repeat the avatar/name/role header.** When two or more adjacent Agent Routing rows share the same `agentId`, only the first renders the full header block — every following same-agent row shows just its row index + service/pattern line + activity line, reading as "more work by the same agent" rather than a hand-off. The header returns in full the instant `agentId` changes. This is computed by the caller (both `AuditColumn`'s drawer and the mobile pinned feed, `MarketIntelligenceScreen.jsx`) comparing each event to the previous one in `ordered` — `RoutingEventRow` itself has no neighbor awareness, it only renders whatever `sameAgentAsPrevious` boolean it's given.

**Real per-event detail (a revision critique, an escalation recommendation, a version note, `agent_selection`'s reasoning, `error`'s message) trails its case's activity label after an em dash when there's something substantive to say — it is never dropped silently.** The only exception is purely mechanical plumbing with no user-facing meaning (e.g. `proofreader`'s old "(Owen retried via Marcus)" note) — confirmed with John this is the one piece of detail intentionally cut, everything else real stays. When adding a new case to this switch, follow the same shape: a plain activity line for the common/clean outcome, with real `shapeForLog()`-truncated detail appended only when the underlying data has something worth saying.

**Amended 2026-07-16 (`S-CHI-AUDIT-GROUPING-01-design`, `CHI-01`) — consecutive same-agent rows now merge into one card, not just a suppressed header.** The `sameAgentAsPrevious` header-suppression mechanism described above is superseded: `RoutingHopCard` now groups every consecutive same-agent event into a single bordered card (one header, N stacked activity lines), and the visible number counts *hops* (hand-offs) instead of raw events — John's explicit call: "a new line should mean a hand-off happened, not an activity." The paragraph above's *intent* (a hand-off always gets a fresh header, same-agent continuation never repeats one) is unchanged; only the visual container changed, from N separate bordered rows to 1 bordered card per hop.

**Amended 2026-07-16 (`S-CHI-03c-design`, `CHI-03c`) — "turn"/"turns" renamed to "hop"/"hops" throughout this mechanism.** "Turn" already means a conversation exchange (one user+assistant round trip) in AI/chat systems generally, distinct from what this codebase's Agent Routing log counts — one internal agent-to-agent delegation. "Hop" is the term already established elsewhere in this codebase (`durable_hops` table, the platform-level hop-budget ceiling) — this is a terminology correction, not a new concept. `RoutingTurnCard` → `RoutingHopCard`, `groupEventsIntoTurns()` → `groupEventsIntoHops()`, `turnNumber` → `hopNumber`, drawer count label "N turns" → "N hops". Zero change to the underlying grouping logic (still: boundary = genuine `agentId` change, oldest=1 ascending) — pure rename.

**Also added 2026-07-16 (`CHI-03c`) — hop-range cross-reference badges.** A small mono-font chip reading `Hop N` (single hop) or `Hops N–M` (range) now appears on `QaEvidenceCard`, the `hypothesis_test` result block in `EvidenceColumn`, the chat pointer sentence, and both `CHI-03b` ack messages — each badge's border/text color reuses that card's existing `borderLeft` accent color, no new color introduced. **Placement corrected 2026-07-21 (`CHI-45`):** the `QaEvidenceCard` and `hypothesis_test`-result-block badges named here moved out of the open body content into their wrapping `Drawer`'s `headerRight` slot (§29's `CHI-45` amendment) — visible in the collapsed header now, not just when expanded. The chat pointer sentence and `CHI-03b` ack-message badges are untouched by that move, still exactly as described here. The badge cites the exact hop range (from the Agent Routing log's own numbering) that produced that piece of content, computed via `currentHopCount(ordered)` snapshotted immediately before/after each traced operation's `onEvent`/`logEvent` calls. **Known accepted approximation:** if an operation's first hop shares `agentId` with the immediately preceding operation's last hop, `groupEventsIntoHops()` merges them into one hop card — the boundary capture attributes that shared hop to whichever operation's range captures it second. Same granularity limit the underlying log already has; not solved here.

**Amended 2026-07-17 (`S-AI-AUDIT-TRIAGE-01-design` / `LOG-15`) — capability display permanently removed; the per-event line is pattern-only, not "the service/pattern line."** John's direct, hard rule from a live screenshot review: no capability may ever display anywhere in the Agent Routing drawer, period — not the correct capability, not any capability. `SERVICE_LABEL` (the capability-slug → human-label dictionary) and `describePipelineEvent()`'s per-case `capability` field are deleted entirely, not corrected. The per-event line under each hop card's header now shows exactly one thing: real, industry-named AI patterns already computed by the shared write-side mechanism (`buildPatternsUsed()`, `request-receivable.js`, `ARCHITECTURE.md §19i`), formatted `"AI patterns used: [names]"`. A hop with no real pattern data legitimately shows no line at all — never a placeholder, never a capability substituted in its place — same "real data or nothing" principle `MI-67` already established for this exact field. Agent identity (who did the hop) is unaffected — that's the hop-card header (`agentId`/`agentById()`), a separate mechanism this rule doesn't touch. Three narrower-slice/wrapper bugs were fixed alongside the display change so every event type's pattern line has real data to show: `lastHelpSelection` (`execute.js`) now threads `patterns_used` from `delegateResult`; `failure_triage`'s event data hoists `patterns_used` from `gate` itself (`gate.triage` never carried it); `patch_resolved`'s event data hoists `patterns_used` from the nested `result` object (both call sites). The `delegation`/`delegation_return` event type is explicitly unaffected — it has no `patterns_used` field in its payload at all, a separate architectural gap tracked as `LOG-23`/`LOG-26`, not this session's scope.

**Amended 2026-07-18 (`S-CHI-26-design`, `CHI-27`) — within-hop activity order reverts to newest-first, matching the hop-to-hop direction.** `CHI-09` (shipped v6.3.48, never documented in this section) deliberately reversed a hop's own activity lines to chronological order (oldest first) for narrative readability, while hop-to-hop order (which hop card sits above which) stayed newest-first. John's live review of a real screenshot found this direction-mismatch reads as confusing — applying the same "top = most recent" rule a reader naturally uses for the rest of the panel to a hop's own internal lines makes a causally-correct chronological order look backwards. John's explicit call: **one consistent direction throughout the whole panel**, newest on top at every level. `groupEventsIntoHops()`'s per-hop reversal is removed; `RoutingHopCard`'s border-color source and the hop-card React key (both `AuditColumn` and the mobile pinned feed) swap which index they read (newest = index 0, oldest/stable-key = last index) to match. This locks in the opposite framing from `CHI-09`'s own comment — do not re-introduce chronological within-hop ordering without a fresh, explicit call from John, same as any other reversal of a locked rule.

---

## Section 32 — Truncated Log Text: Line-Clamp + Click-to-Expand (Locked 2026-07-16 · S-CHI-AUDIT-GROUPING-01-design)

**Any Agent Routing activity line long enough to need truncation clamps visually (3 lines, CSS `-webkit-line-clamp`) rather than being hard-cut server-side or in a display helper.** The underlying text is never discarded — `describePipelineEvent()`'s summary strings carry the full value through unchanged; only the rendering component (`RoutingActivityLine`) decides how much is visible. Locked after a real case (Michelle's `agent_selection.reasoning`) showed the failure mode of hard-truncating first: the appended `…` had nowhere reliable to land (wrapped alone onto its own line as often as not, depending on where the cut fell relative to word boundaries) and, once cut, there was no way to recover the rest of the text at all.

**A clamped line is clickable ("Read more" / "Show less") whenever its full text exceeds 160 characters** — this is a length heuristic, not a measured overflow check (no `ResizeObserver`), chosen for simplicity; it may occasionally show the toggle on a line that happens to fit in 3 lines at a given viewport width, which is a harmless false positive (clicking "Read more" on an already-fully-visible line is a no-op in appearance). The toggle reuses the existing understated link style already established by `EvidenceColumn`'s "...or write your own explanation" affordance (`T.brassDeep`, italic, underlined, no new visual pattern introduced).

**This convention is generic to any future long-text log line, not specific to `agent_selection`.** When a future case in `describePipelineEvent()` embeds a real, potentially-long field, do not truncate the string before it reaches the row — pass it through in full and let this rendering layer handle length.

---

## Section 33 — Chat vs. Evidence Content Split: `qaEvidence`/`hypFlow` Two-Slot Mechanism (Locked 2026-07-16 · S-CHI-03-design / CHI-03a)

**John's rule, verbatim:** any document, written analysis, or narrative an agent produces is **evidence** and belongs in Column 2 ("Evidence & Interaction"), never Column 1 ("Chat"). Chat is pure agent-to-user conversation; when Marcus has findings, he *says so* in chat rather than the full analysis rendering as a chat bubble. Not everything agent-authored is "evidence," though — status/commentary *about* the deliverable (a self-flag + reason, a "routed to Priya" note, an elapsed-time caption) is conversation and stays in chat exactly as it rendered before this rule; only the deliverable itself (headline/body/tables/byline, a submitted theory's text, review-choice buttons) moves to Evidence.

**Columns renamed:** "Interact" → **"Chat"**, "Evidence" → **"Evidence & Interaction"** (the review/resolve actions live there now too, not just read-only content) — every user-facing occurrence (desktop headers, mobile tab bar, this doc's own prose) uses the new names.

**Two-slot mechanism (`MarketIntelligenceScreen.jsx`):** `EvidenceColumn` used to render exclusively off `hypFlow` — a plain Q&A the user never escalated into a hypothesis flow left Evidence permanently empty, since nothing else ever populated it. A new `qaEvidence` state slot, set the moment Marcus answers (independent of whether a hypothesis flow ever starts), fixes this: `EvidenceColumn` now renders `qaEvidence`'s `QaEvidenceCard` (extracted verbatim from the old chat `qa` card) whenever it exists, and `hypFlow`'s existing stage-driven body whenever *that* exists — both can be visible at once (a qa answer escalated into a running/resolved theory test shows the original answer stacked above the submitted-theory block, both bordered cards, top to bottom, oldest work first). The true empty state only shows when neither slot has content. `onGoodThanks`/`onReview` (the review-choice buttons, now living in `QaEvidenceCard`) operate on `qaEvidence` directly, not a chat message index — there is only ever one "most recent" Q&A answer tracked this way, not an indexable history. `qaEvidence` is cleared only by the existing Clear action, never implicitly replaced by a new `hypFlow`.

**Interim placeholder, not final UX (`CHI-03a` → `CHI-03b`):** the submitted-theory resolution actions (`onDiscard`/`onResolveConfirmation`) now push a short static placeholder line to chat ("Got it — noted as info only...", "Got it — that's been stored as a forecast...", "Got it — that proposal was rejected...") instead of the old rich `hypothesis_test` chat card (deleted from `MessageBubble` — that content lives in `EvidenceColumn` now). This is a deliberate, accepted interim state for one deploy cycle: `CHI-03b` (separate session) replaces the static placeholder with a real Marcus-authored live acknowledgment, same precedent as `MI-01a`→`01d`'s incremental sub-sessions.

**Known gap, deliberately not fixed here, tracked for `CHI-03c`:** on mobile, the Evidence tab's disabled-until-active gate and its unseen-content flash (Section 21) still key off `hypFlow` alone — a plain Q&A that sets `qaEvidence` but never starts a hypothesis flow leaves the mobile Evidence tab reachable-but-still-gated the same way it always was, unlike desktop where `EvidenceColumn` is always visible. Out of `CHI-03a`'s scope by the kickoff's explicit SCOPE RULES (Section 21's flash-direction logic needs its own re-examination, not a narrow patch) — see `docs/FEATURES.md`'s `CHI-03` row.

---

## Section 34 — Clear-Resets-Everything, Stale-Request Guard, and Question-Boundary Divider (Locked 2026-07-16 · S-CHI-04-design / CHI-04)

**Clear is the canonical full-reset action for `MarketIntelligenceScreen.jsx` — every piece of screen state renders from must be reset by `onClear()`, with no exceptions carved out for a specific column.** Found live (John's screenshot): Clear reset `messages`/`hypFlow`/`qaEvidence`/`workingStatus` but left the Agent Routing drawer (Column 3, driven by `pipelineEvents`) untouched — a partial reset that reads as a bug regardless of intent. `onClear()` now also resets `pipelineEvents` (`setPipelineEvents([])`) and `pendingDelegationsRef` (`new Map()`, MI-52's in-flight delegation bookkeeping) — this is the rule going forward: any future state this screen adds must be added to `onClear()` in the same session it's introduced, not left for a later bug report to catch.

**Stale-generation guard — the durable pattern for any async call this screen adds.** `clearGenerationRef` (a `useRef(0)`, not React state — never read for rendering) is bumped by `onClear()`. Every top-level entry point that starts an async chain (`submit`, `enterHypothesisFlow`, `onSelectHypothesis`, `onCommit`, `onResolveConfirmation`) opens with the identical 3-line preamble, copy-pasted verbatim (deliberately not factored into a shared hook — STANDARDS.md Category M, five call sites is well within the "don't prematurely abstract" guard, and inlining keeps it visible exactly which functions participate):
```jsx
const myGeneration = clearGenerationRef.current;
const isStale = () => clearGenerationRef.current !== myGeneration;
const onProgress = (evt) => { if (!isStale()) onDelegationProgress(evt); };
```
`isStale` then threads one level deeper through every function in the call graph it reaches (`resolveInProgress`, `callCapability`, `resolveConfirmation`, `runIntentPipeline`, `runQaWithQualityGate`, `generateHypotheses`, `runHypothesisTest`), each accepting it as an optional param (`isStale = () => false` default, safe for any caller that doesn't care). Every one of those functions checks `isStale()` immediately after each `await` that reaches the network, before any further `onEvent`/`logEvent`/state mutation or subsequent call — a Clear fired mid-chain stops that chain's own next hop from firing and stops its already-resolved result from ever reaching `setMessages`/`setQaEvidence`/`setHypFlow`/`logEvent`. **Any future async flow added to this screen must follow this same convention** — capture `myGeneration`/`isStale`/`onProgress` at the entry point, thread `isStale` through every helper it calls, check it after every await before touching state — rather than reinventing a different cancellation mechanism.

**Scope of the guard (frontend-only, by design):** this stops the *client* from continuing a chain or displaying a stale result — every continuation hop (`resolveInProgress()`'s `{action:"continue"}` loop) is its own client-issued `fetch()`, so a client-side check genuinely suffices to prevent further hops or display. It does **not** kill the one hop already executing server-side at the instant Clear fires — that needs a real `api/capabilities/execute.js` change (harness-level, touches the shared execution path every capability goes through), tracked separately as `HAR-03` (`docs/FEATURES.md`), deliberately not folded into this guard.

**Question-boundary divider.** `groupEventsIntoHops()` (renamed from `groupEventsIntoTurns()`, `CHI-03c`) gains a `question_boundary` marker-event case: a synthetic event (`{ type: "question_boundary", agentId: null, data: { timestamp } }`, built via `buildTransactionBoundaryEvent("start", ts)`, `src/lib/turnTracking.js`, `CHI-56`) pushed by `submit()` right after its stale-guard preamble, but only when `pipelineEvents.length > 0` (skips the very first question of a session and is naturally skipped right after Clear too, since Clear already empties `pipelineEvents`). A marker always starts its own hop-grouping entry, never merging into a neighboring hop regardless of `agentId` (`!last.isBoundary` guard) — structurally distinct from a real agent hop, so it is excluded from hop numbering (`total`/`seen` in `groupEventsIntoHops` only count non-boundary hops) and from the Agent Routing drawer's "N hops" count badge. Rendered via a new `QuestionDivider` component (a thin `T.line` rule either side of a `T.muted`/`mono` "New question · HH:MM:SS" caption, `formatClockTime()`) in place of a `RoutingHopCard` wherever a hop is marked `isBoundary`. No new colors or typography scale — reuses tokens already established by Section 32's log-line pairing.

**Amended 2026-07-22 (`S-CHI-57-design`/`CHI-57`) — 5 call sites, not 1.** The same marker now also fires from `onReview` (deeper-theories request), `onSelectHypothesis` (theory selection), `onCommit` (forecast request), and each of `onResolveConfirmation`'s 3 branches (forecast accept/reject/edit) — any user-action bubble that starts a fresh chain of real agent hops, not just a typed question. Mechanism, event shape, and rendering are unchanged from the paragraph above; this is a widened caller list only. The rendered label stays the literal string **"New question"** at every call site, deliberately not varied per trigger (John's explicit call, `design-chi-57-0722`) — do not generalize the copy without asking first, per this doc's own Approval Gates discipline.

**Accepted scope limit, same precedent as `CHI-03c`'s hop-range badges:** solving turn-merging across a boundary beyond the `isBoundary`/`!last.isBoundary` guard already provides is out of scope — a marker event structurally can never merge with a neighboring real turn, so there's no remaining approximation to design around.

---

## Section 35 — Gradient Action Card: "Needs Your Input" Pattern (Locked 2026-07-16 · S-CHI-05-design)

A distinct visual pattern for any moment that requires an explicit user decision before the flow can continue — first application: `QaEvidenceCard`'s review-choice prompt ("Good with this analysis, or would you prefer deeper theories?"). Deliberately not a variant of the flat-fill card family (Section 3) or `ConfirmationCard` (Section 16) — those stay unchanged for their own use cases; this is a new pattern reserved for genuine action-required moments, not a general card restyle.

- **Card fill:** `linear-gradient(180deg, T.brassGlow 0%, T.white 50%)` — new tokens (`#f0d99a`, `#ffffff`), added specifically for this pattern. `T.white` is the only pure-white surface anywhere in the app; every other "light" surface uses `T.card`/`T.cardAlt` (off-white cream). Do not substitute `T.brassLight` (`#e4c786`) — visually close but not the approved color.
- **Corners:** sharp, squared (`borderRadius:0`) everywhere in this pattern, including the badge — brass `<Corners/>` bracket ornament (Section 3) still applies, on its own `position:"relative"` wrapper.
- **Badge:** `● Needs your input` — mono, 9px, uppercase, `letterSpacing:0.05em`, solid `T.brass` fill, `T.navy` text (reuses the same brass-fill/navy-text pairing as Section 7's Primary CTA), squared.
- **Question text:** `body` font (Inter), 14px, weight 700, `T.navy` — bold and dark, not the italic/muted treatment used for ordinary status copy elsewhere.
- **Secondary action ("Good, thanks"):** white box (`T.white` fill), 1px `T.line` border — deliberately styled to read like the chat input field's own box treatment, not a ghost button.
- **Primary action:** solid `T.navy` fill, `T.card` text, bold, squared — **scoped exception to Section 7's locked brass-gradient Primary CTA rule.** This exception applies only to this "needs your input" pattern; every other Primary CTA in the app stays brass-gradient per Section 7, unchanged.

First application: `QaEvidenceCard`'s and `MessageBubble`'s (dormant) review-choice blocks, `MarketIntelligenceScreen.jsx` (`CHI-05`). Any future "you must decide before continuing" moment reuses this pattern rather than inventing a fourth card variant.

**Amended 2026-07-22 (`S-CHI-59-design`/`CHI-59`) — Badge bullet superseded for every `EvidenceColumn` drawer instance.** John's explicit call: every drawer with a pending HITL decision must signal it the same way, visible whether the drawer is open or collapsed — a footer-only pill (this section's original Badge bullet) fails that, since it's invisible until the drawer is already open. The Badge bullet above no longer applies to `QaEvidenceCardFooter`'s rendering (the pill is removed there entirely, `CHI-59`) — the signal moved to the wrapping `Drawer`'s own `headerRight` slot instead, as the shared `NeedsDecisionBadge` component (§29's amendment, above), reworded "Needs Your Decision" to match the pattern `CHI-50`'s Draft Forecast drawer already established. Every other property of this section (card fill, corners, question text, both action buttons' styling) is unchanged — this amendment touches the Badge bullet only, and only for the `QaEvidenceCardFooter` instance. `MessageBubble`'s dormant non-qa variant still renders the original full pattern, badge included, unchanged — it's dead code today (no message reaches it), tracked separately as `CHI-63` rather than reconciled here.

---

## Section 36 — Chat Bubble Speaker Label (Locked 2026-07-16 · S-CHI-08-design)

Every `MessageBubble` (both the qa branch and the default/non-qa branch) renders a small, subtle label directly above the bubble, matching the bubble's own alignment: "You" for the user's own message (right-aligned), "Marcus" for every assistant message (left-aligned) — `fontFamily:mono, fontSize:9, color:T.muted`, no bold, no uppercase, no letter-spacing. Deliberately quieter than Section 28's agent+role CTA pairing (this is a persistent identity label on every bubble, not a one-time introduction moment) and deliberately *not* derived from `qaEvidence.displayAgentCard` — that field names whichever agent *formatted* the answer (e.g. Alex Reeves), a different agent than who's *speaking* in Chat. Chat is architecturally always Marcus's own voice (`CHI-03a`), so the assistant label is a static string, not per-message agent data. If a future session ever makes Chat's speaker something other than Marcus, revisit this section — it does not generalize to "whichever agent is attached to this message" today.

Also locked in this session: the "⚑ {review_reason}" flagged-narrative caption lives *inside* the bubble now (first, before the bubble's main text, `marginBottom:8`), in the bubble's own body font — not a separate mono-font caption below the bubble as in prior sessions. The "Marcus flagged this —" prefix is dropped (redundant inside Marcus's own bubble); the ⚑ icon and `T.brassDeep` color are kept as the visual flag signal.

**Amended 2026-07-21 (`S-CHI-42-design`/`CHI-42`) — third bubble variant: user-action narration.** Chat previously had exactly two bubble identities, both driven by `msg.role`: "You" (real typed input, solid `T.navy` fill) and "Marcus" (every assistant message, `T.card` fill). This adds a third, visually distinct from both: a **user-action bubble** — right-aligned and labeled "You" like real input (same label mechanics, same alignment), but filled `T.navyMid` (already an established, reused lighter-navy token — see `tokens.js` — not a new color) instead of solid `T.navy`. It narrates the *moment the user clicks/decides* (e.g. "You asked for deeper theories," "You requested a forecast"), pushed synchronously at the top of the relevant handler, before any network call — never a value the user actually typed. **Critical distinction, not just visual:** this bubble carries `kind:"user_action"` and is deliberately **excluded from `conversationContext()`** (`MarketIntelligenceScreen.jsx`) — unlike real `role:"user"` input, it must never be replayed into Marcus's own prompt history as fabricated user speech. `isUser` (drives alignment/label) now checks `msg.role === "user" || msg.kind === "user_action"`; only the fill color branches further to distinguish the two. First application: `CHI-42`'s six action points (`onGoodThanks`, `onReview`, `onSelectHypothesis` both branches, `onCommit`, `onDiscard`, `onResolveConfirmation`'s three resolutions). Any future "narrate what the user just did" moment reuses this exact `kind:"user_action"` mechanism rather than inventing a fourth bubble identity.

---

## Section 37 — Evidence Column: Scroll-Body + Pinned-Footer Anatomy (Locked 2026-07-16 · S-CHI-13-design)

`EvidenceColumn`'s card (Column 2, "Evidence & Interaction") follows the same anatomy as `InteractColumn`'s card (Column 1, "Chat"): scrollable read-only content above (`flex:1,overflowY:"auto"`, no fixed `maxHeight` on any inner section), one pinned footer row below (`padding:"10px 14px",borderTop:`1px solid ${T.line}``, matching `InteractColumn`'s own footer row exactly, for visual parity between the two columns), rendering whichever decision `selectEvidenceFooterKind(qaEvidence, hypFlow)` reports currently active — `"qa-review"`, `"hyp-result"`, or `"hyp-confirmation"`. No footer renders when nothing is pending (`null`). Priority order when more than one could theoretically be live: confirmation > hypothesis result > qa review.

Any future decision point added to Evidence reuses this pinned footer slot rather than flowing its CTA inline into the scrollable body — that's exactly the bug this section closes (a CTA's Y position used to depend on how much read-only content rendered above it, instead of being fixed).

Cross-references: Section 35 (the brass "needs your input" gradient card's own styling is unchanged — `QaEvidenceCardFooter` is a pure relocation of that markup into the pinned footer slot, not a restyle). `ConfirmationCard` (`SharedUI.jsx`) itself is also unchanged — only its render location moved from inline scroll-body content to the pinned footer.

**Amended 2026-07-17 (`S-CHI-18-design`/`CHI-18`, John's live approval this session is the authority for the amendment):** the scroll-body-to-footer separation is now a real, fixed `gap:14` on the outer card (`EvidenceColumn`'s bordered card, previously implicit/absent — content directly touched the footer's hairline border when it filled the available space). `QaEvidenceCard` (and any future sole scroll-body child in the `"qa-review"` case) now stretches (`flex:1`) to fill the scroll body's available height, so the gap stays a fixed 14px regardless of content length, rather than a variable leftover amount. This 14px value matches `AuditColumn`'s (Column 3) drawer-stack gap — reused, not a new value. The footer's own anatomy (`padding:"10px 14px",borderTop`, matching `InteractColumn`'s footer) is explicitly unchanged — the parity claim in this section's opening paragraph still holds exactly as written.

---

## Section 38 — Evidence Duplicate-Status Removal, Column 3 Header Rename, Evidence Scroll-Fade (Locked 2026-07-18 · S-CHI-26-design)

**Column 2 (`EvidenceColumn`) no longer renders its own copy of `AgentWorkingIndicator`.** `MI-64` had deliberately duplicated it there (John's own ask at the time) so someone watching Evidence during a hypothesis-test flow could see live progress without looking at Chat. John's live review found this reads as a plain duplicate now that analysis-report UX has been reworked since — Column 1 (`InteractColumn`) is the single remaining source of this status strip; Column 2 shows only evidence content again. `workingStatus` is no longer threaded into `EvidenceColumn` at all (prop removed from both the component signature and its desktop call site).

**Column 3's section header reads "Focus Area Audit", not "Audit".** Text-only rename, `AuditColumn`'s header label. Does not touch or rename the unrelated global-nav "AI Audit" button (`AppShell.jsx`) — a different screen entirely.

**Column 2's analysis scroll box (the region holding `QaEvidenceCard`/hypothesis-flow content inside `EvidenceColumn`'s populated state) now shows the same bottom-edge fade + bouncing chevron affordance as the mobile Agent Routing feed (`MI-50`/Section 21), via the shared `ScrollFadeHint`/`useScrollFadeHint` extraction (`SharedUI.jsx`).** Same exact values as the existing mobile instance — 26px fade height, 4px scroll-remaining threshold, `dbounce` chevron — no new visual pattern introduced, only a second call site. Scoped to the populated state only; the empty state has no scrollable list and gets no fade.

---

## Section 39 — Shimmer Sweep Overlay (Locked 2026-07-20 · S-CHI-38-39-design)

For any "this content is loading or about to change" motion cue — skeleton placeholders or a periodic idle-motion signal — reuse the pre-existing `shimmer` keyframe (`tokens.js`, already used once by `TaskInstructionsScreen.jsx`'s step-loading progress bar) via a small shared overlay component, rather than deriving the gradient/animation properties inline a third time:

```jsx
function ShimmerSweep() {
  return (
    <div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,transparent 0%,rgba(182,135,58,0.28) 50%,transparent 100%)`,backgroundSize:"200% 100%",animation:"shimmer 1.2s linear infinite",pointerEvents:"none"}}/>
  );
}
```

Parent element needs `position:"relative"` (and usually `overflow:"hidden"` so the sweep doesn't bleed past a bordered edge). No new keyframe, no new color token — reuses `T.brass` at 28% opacity, matching the existing brass-shimmer usage. First shipped by `CHI-38` (news-card loading skeletons, `MarketIntelligenceScreen.jsx`'s `EvidenceColumn`) and `CHI-39` (idle 10-second auto-rotation cue on the example-question blocks, same file's `InteractColumn`) — any future loading-skeleton or idle-motion cue reuses `ShimmerSweep` rather than a bespoke animation.

**Scoping rule, not just a style rule:** if the element the shimmer overlays is itself a shared component reused elsewhere on the same screen (e.g. `Drawer`/`SharedUI.jsx`, reused by 6 different drawers on the Channel Intelligence screen alone), wrap only the specific call site that should shimmer in a local `position:"relative"` container — never bake the shimmer into the shared component itself, or every other reuse of that component starts shimmering too.

---

## Section 40 — Evidence Column: 2-Drawer Stack, Auto-Current + Auto-Scroll (Locked 2026-07-21 · S-CHI-43-design)

**Restyle only, John's explicit scope call (2026-07-21) — does not change what data Evidence can show, only how it's presented.** `EvidenceColumn`'s populated state (both `qaEvidence` and `hypFlow` are still single, overwritten state slots — see `CHI-47`, deliberately deferred, for the separate "should past entries persist as real history" question) renders as exactly 2 `Drawer` cards instead of one flat scroll: an Analysis drawer (`qaEvidence`) and a Theory drawer (`hypFlow`, only rendered when `hypFlow` is truthy — same gate as before). Neither drawer gets a `maxHeight` — the outer `evidenceScrollRef` container remains the single scroll region for the whole stack, unchanged from before this session; drawers hold their natural content height.

**Which drawer is open, by default:** `autoCurrent` = `"hyp"` if `hypFlow` exists, else `"qa"` if `qaEvidence` exists, else `null` (the true-empty state, unchanged, out of `Drawer` entirely). Whichever key matches `autoCurrent` opens; the other collapses to its title-only header. This is `Drawer`'s new controlled-open mode (§29 amendment, same session) — `EvidenceColumn` passes `open`/`onToggle` explicitly rather than letting `Drawer` manage its own state.

**Manual override, and when it resets.** The user can still click either drawer's header to open/close it by hand at any time — that choice is tracked as a small local override and takes priority over `autoCurrent` until the next genuine state transition. The override resets (reverting to the auto-computed default) whenever `autoCurrent` itself changes **or** `hypFlow.stage` changes — i.e., a new drawer appearing/disappearing, or the same Theory drawer's content genuinely advancing (generating → choosing → ready → testing → result), both force the relevant drawer back open. A user reading an old, manually-reopened Analysis drawer doesn't get yanked away by an unrelated event — only a real new arrival takes back the default view.

**Auto-scroll.** The same `[autoCurrent, hypFlow?.stage]` transition that resets the manual override also scrolls `evidenceScrollRef` to the bottom (`scrollTo({top: scrollHeight, behavior:"smooth"})`) — covers both a brand-new drawer opening and new content landing inside the drawer that's already open (e.g. a theory test's result arriving), directly answering "I had to scroll down to see what happened."

**Drawer titles are short labels, not the existing descriptive sentences.** `Drawer`'s own title styling (mono/9.5px/bold/uppercase) matches Column 3's short 1-3-word drawer titles ("AGENT ROUTING," "DATA SOURCES") — the Analysis drawer's title is `QaEvidenceCard`'s former internal header text ("Analysis & Narrative — based on your question..."), moved out of the card body and into `Drawer`'s `title` prop (`QaEvidenceCard` no longer renders its own header row — see below); the Theory drawer's title is the short intent label (`INTENT_LABEL[hypFlow.intent]`, e.g. "Theory"). The existing longer descriptive sentence (`getEvidencePanelSentence()`) is unchanged and still renders as the first line of the Theory drawer's own body content — it was never a title, just relocated into the new wrapper.

**`QaEvidenceCard`'s own header row is removed, not duplicated.** Wrapping it in `Drawer` (which always renders its own header) would have produced two stacked headers for the same content. `QaEvidenceCard`'s title text moved to `Drawer`'s `title` (above); its `HopBadge` moved to the top of the card's own body content (still visible whenever the drawer is open, same visual weight, just one level lower) — this is a structural necessity of removing the duplicate header, not `CHI-45`'s later hop-badge-into-collapsed-metadata relocation, which is still a separate, not-yet-built future session.

Any future Evidence entry type (`CHI-46`'s news/web-finding cards, a future `CHI-47` history entry) reuses this exact `Drawer` + controlled-open + auto-scroll pattern rather than inventing a parallel one.

**Amended 2026-07-21 (`S-CHI-44-design`/`CHI-44`) — theory selection auto-advances; the intermediate "ready" stage is retired.** Reverses `MI-51`'s deliberate "no longer auto-fired on selection" choice — John's direct call (his live walkthrough's #4, confirmed 2026-07-21): selecting a theory (a candidate click, or the "write your own" Save button) now starts the test immediately, same auto-fire precedent already established by the news-card flow. The `"ready"` stage (a "Theory selected" review screen requiring a separate "test this theory" click) is deleted, not just unreachable — `onSelectHypothesis()` no longer takes a `{startTest}` option; every call always starts the test. `CHI-42`'s 2 narration bubbles for this flow (a select-time bubble, a separate test-button-click bubble) collapse to 1, since it's now one physical click. **Separately, the Theory drawer's submitted-theory block now also stays visible during `onCommit()`'s `"committing"` stage** — narrowed from an originally-proposed new placeholder/status line after John pointed out Column 1's existing elapsed-timer strip (`setStatus()`, unchanged) already narrates live progress; Column 2 only needed to stop going blank, not gain a second copy of the same status.

**Amended 2026-07-21 (`S-CHI-45-design`/`CHI-45`) — `CHI-03c`'s hop-range badge relocated from open body content into each drawer's own header.** Both `HopBadge`s this cluster's drawers carry (`QaEvidenceCard`'s, previously repositioned into the body by `CHI-43` as a structural necessity of removing the duplicate header; the Theory drawer's `"result"`-stage badge) now render in their wrapping `Drawer`'s new `headerRight` slot (§29 amendment, same session) instead — visible whether the drawer is open or collapsed, quieter than competing with the primary content for attention. Not a reversal of `CHI-03c`'s trace-back value, John confirmed 2026-07-21 — purely a relocation, completing what §40's `CHI-43` entry already flagged as this session's planned follow-up.

**Amended 2026-07-21 (`S-CHI-46-design`/`CHI-46`) — News becomes a 3rd, persistent drawer, titled "News."** Previously News only rendered inside `EvidenceColumn`'s true-empty-state early return — the instant `qaEvidence` was set (by asking a question, or by clicking a headline, which itself calls `submit()`), that whole branch stopped rendering and the other headlines were gone with no way back. `computeAutoCurrent()` extends from 2 keys to 3 — priority order `"hyp"` > `"qa"` > `"news"` (News is the natural default: it's what's on screen at page load, before anything else has happened) — and the true-empty-state branch is deleted, merged into the same populated-state return every other drawer already uses. Same collapse/manual-override/auto-scroll mechanics as Analysis/Theory, no new mechanism. **Drawer titles are fixed, hardcoded strings, not agent-generated** — confirmed with John (2026-07-21): this is a UI container label describing which structural slot a drawer is, same as Column 3's existing "Agents"/"Data Sources" titles, not a Rule #1 (`§19d`) routing concern — the actual *content* inside each drawer stays exactly as agent-generated as it already was.

**Amended 2026-07-21 (`S-CHI-49-design`/`CHI-49`) — Theory splits into 2 drawers, titled `{intentLabel} Candidates`/`{intentLabel} Result`.** First build-out of the taxonomy decision record below. Candidates covers `generating`/`choosing` (the offered choice); Result covers `testing` onward (the test's own findings) — `computeAutoCurrent()` gains a stage-aware split (`hyp-candidates`/`hyp-result` replacing the single `"hyp"` key), driven by a new shared `isHypInResultPhase()` helper. Candidates renders whenever `hypFlow` exists and never disappears once a pick is made — it collapses and its title gains a chosen-summary (`"Theory Candidates — 4 offered, chose: \"...\""`); reopening it shows a read-only recap of every candidate offered, the chosen one marked, rather than going empty. **Unlike `CHI-46`'s fixed-string News/Analysis titles, these two stay intent-dynamic** (`INTENT_LABEL[hypFlow.intent]` — Theory/Forecast/Correct) — confirmed with John: this pair represents a flow that can genuinely be classified as any of the three by Marcus's own live reasoning, unlike News/Analysis which only ever hold one kind of content regardless of context. Kickoff: `docs/kickoffs/v6.3.106-CHI-49-theory-candidates-result-split.md`.

**Amended 2026-07-21 (`S-CHI-50-design`/`CHI-50`) — Draft Forecast becomes the 5th drawer, split out of the pinned footer.** Nadia's `data-patch-intent` proposal (`proposed_action`/critique) moves out of the old monolithic `ConfirmationCard` (rendered whole in the footer) into its own drawer — readable content that came back from an action, the same shape as every other drawer here, not a decision control itself. Title is a **fixed** string, "Draft Forecast" — deliberately not intent-dynamic like Candidates/Result, since Nadia's write is always a forecast record regardless of which intent (theory/forecast/correct) started the flow; reuses the platform's locked `INTENT_LABEL.forecast` vocabulary rather than inventing new wording. `computeAutoCurrent()` gains a 3rd hyp-key, `hyp-draft` (highest priority, ahead of `hyp-result`), via a new `isHypAwaitingConfirmation()` helper. `ConfirmationCard` (`SharedUI.jsx`) splits into `ConfirmationCardContent` (header/fields/critique — the drawer) and `ConfirmationCardActions` (Reject/Edit/Accept + edit textarea — stays in the footer); the monolithic export is deleted outright (confirmed zero callers beyond this one). The "Needs Your Decision" badge relocates from inline content into the drawer's `headerRight` — same treatment `CHI-45` gave the hop-range badge, visible collapsed or open. **Also closes a real narration gap found this session:** no chat message existed when Nadia's draft landed — a static Marcus-voiced pointer now fires the instant `hypFlow.confirmation` is set, distinct from `MI-65`'s deliberate no-chat-push precedent for the (read-only, non-decision) theory-result landing. Kickoff: `docs/kickoffs/v6.3.108-CHI-50-draft-forecast-drawer.md`.

**Amended 2026-07-21 (`S-CHI-51-design`/`CHI-51`) — drawer-open mechanism consolidates into `useDrawerStack()`; drawers persist through resolution.** Closes the taxonomy decision record's one remaining piece (below). The 5 previously-separate pieces of `EvidenceColumn` state that decided "which drawer is open" — `computeAutoCurrent()`, `manualOverride`, the reset/auto-scroll effect, `isDrawerOpen()`, `handleDrawerToggle()`, grown incrementally across `CHI-43`/`44`/`45`/`46`/`49`/`50` — consolidate into one generic hook, `useDrawerStack(priorityChecks, scrollRef, transitionDeps, resolved, freshDeps)`. `EvidenceColumn` calls it once and gets back `{isOpen, toggle}`; a future 6th drawer type extends `priorityChecks`, not five call sites. **New lifecycle rule, built as a first-class hook input, not a special case:** once `resolved` transitions true (today: `isHypResolved(hypFlow)`, i.e. `hypFlow.resolution` set — the only flow with a resolution concept right now, but the hook itself takes any caller's own resolved-signal, not a hyp-specific hardcode), auto-open suppresses entirely until `freshDeps` (`[qaEvidence, newsCards]`) next changes — a brand-new question or new content arriving, not just the same flow advancing a stage. This distinction (found live this session, via the Architect Review's generalization counter-example check, `SES-012`) is what stops "nothing auto-opens once resolved" from also permanently blocking Analysis from ever auto-opening again for a later, unrelated question. **Drawer persistence:** `onDiscard()`/`onResolveConfirmation()` stop nulling `hypFlow` on resolve, setting `hypFlow.resolution` (`"info_only"`/`"stored"`/`"rejected"`) instead — Candidates/Result/Draft Forecast are all gated on `hypFlow`/`hypothesisTest`/`confirmation` presence, never on `resolution`, so they keep rendering collapsed/reopenable with zero drawer-JSX changes; `selectEvidenceFooterKind()` and the Result drawer's own instructional line both gain a `!hypFlow.resolution` guard so stale decision controls/copy don't resurface. Deliberately scoped to *within one theory cycle only* — `CHI-47` (cross-question persistence, a materially bigger scope) stays separately deferred. Kickoff: `docs/kickoffs/v6.3.111-CHI-51-drawer-persistence-resolution.md`.

**Note, 2026-07-21 — taxonomy decision record, now fully built (`CHI-49`/`50`/`51` above).** John's "papers on a desk" principle generalizes further than `CHI-42`–`46` alone: each drawer should be a container of *one kind of thing*. The confirmed target taxonomy (5 drawer types: **News, Analysis, Theory Candidates, Theory Result, Draft Forecast** — "Forecast" reuses the platform's own locked `INTENT_LABEL` vocabulary, not an invented term) and the confirmed lifecycle rule (newest-defaults-open/previous-collapses, except a fully-resolved flow suppresses auto-open entirely) are both shipped as of `CHI-51` above.

**Amended 2026-07-22 (`S-CHI-58-design`/`CHI-58`) — Result no longer collapses when Draft Forecast arrives; a new governing principle for drawer copy.** Reverses `CHI-50`'s own documented choice ("once Nadia's proposal lands, Draft Forecast is the new arrival that should auto-open — Result still exists underneath, just collapses") — confirmed live with John: a new drawer *arriving* isn't itself a reason to collapse content the user may still be reading; that "something new happened" signal belongs to chat (Column 1), not to visually closing Column 2. Implemented generically — `useDrawerStack()` gains an optional `alsoOpenWhen` pairing (a key also counts as open whenever its named partner is the effective current key; manual override still wins either way) — not a hyp-specific special case, same precedent as Part B/C's `resolved`/`freshDeps` generic inputs (`CHI-51` above). Today's only pairing: `{"hyp-result": ["hyp-draft"]}`. **Governing principle established this session, applies beyond this one pairing:** Column 2 (Evidence) shows content; live status/progress narration belongs in chat, not a drawer — Column 1's `AgentWorkingIndicator` already covers "something is happening" (same precedent `CHI-44` used for the committing-stage submitted-theory block). Also this session: Candidates' collapsed title no longer bakes in the full chose-summary sentence (moved to a separate body line); the "Priya is generating/testing..." narration boxes and the generic `getEvidencePanelSentence()` subhead are removed outright from the Candidates drawer, not shortened; Result's "Submitted Theory" recap and "Theory Evidence" title are removed (redundant with Candidates' own persisted recap and the drawer's own title, respectively); the elapsed-time status line moves to chat. Kickoff: `docs/kickoffs/v6.3.123-CHI-58-drawer-copy-cleanup.md`.

**Amended 2026-07-28 (discovery `ui-updates-0727`) — `CHI-49`'s intent-dynamic titles OVERTURNED (John's explicit supersession); journey-relative step numbering added.** The settled product model (John, this session): Theory and Forecast are *sequential steps*, not synonyms — the user requests theories, then forms a forecast on the theory of their choice — so a drawer titled "Forecast Candidates" while chat said "You have 4 theories to choose from" was naming the *intent*, not the *step*, and read as a missing drawer in John's live screenshot. Candidates/Result titles become **fixed** — "Theories" / "Theory Result" — regardless of `INTENT_LABEL[hypFlow.intent]` (the intent survives internally for routing; it no longer names drawers). Every drawer serving the active journey gains a leading step number assigned by **arrival order** (first drawer of the journey = 1; a new journey resets; ambient drawers — News at rest — stay unnumbered and sort below the journey's steps), rendered as a brass number chip; the same chip renders inline in chat, and any message handing control back to the user names **exactly one** step (number + name together, never bare). One noun per object on this screen: Theory / Forecast / Analysis / News — *hypothesis*, *thesis*, *candidate* retired from all screen copy ("Ready to act on this hypothesis?" → "…this theory?"); model-generated vocabulary is `CHI-83`'s separate Supabase-side scope. Also in scope: column header "News & Evidence" → "Steps & Evidence", breadcrumb highlights the current stage. Ruled out: pre-rendered ghost drawers (§19j posture) and a muted "Up next" caption after the active step (killed in verification, John's call — it must predict a not-yet-arrived drawer, contradicting arrival-order numbering, and can name a step that never arrives; chat's step chip carries the directive job). Full decision record: `ARCHITECTURE.md` §19n; enforceable subset: `.claude/rules/chi-vocabulary.md`. Build: `CHI-82` — **shipped and live-QA'd 2026-07-28** (v6.3.162 + membership patches v6.3.168/v6.3.169; a step number/badge/stage-highlight belongs to content of the *current* journey only — a previous journey's persisted drawers render plain, unnumbered, below ambient News).

---

## Change Log

| Date | Session | Rule Added / Changed |
|------|---------|---------------------|
| 2026-07-28 | ui-updates-0727 (discovery) | Section 40 amended — `CHI-49`'s intent-dynamic Candidates/Result titles overturned (John's explicit call): fixed "Theories"/"Theory Result" titles, journey-relative step numbering (arrival order, brass step chips echoed in chat, exactly one step named per handoff), single vocabulary (Theory/Forecast/Analysis/News — hypothesis/thesis/candidate retired). Decision record `ARCHITECTURE.md` §19n; rule `.claude/rules/chi-vocabulary.md`; build `CHI-82`/`CHI-83`. |
| 2026-07-22 | S-CHI-58-design | Section 40 amended — Result drawer no longer collapses when Draft Forecast arrives (`useDrawerStack()` gains a generic `alsoOpenWhen` pairing), reversing `CHI-50`'s original choice. New governing principle recorded: Column 2 shows content, chat shows status — drives Candidates' title split + narration removal and Result's redundant-block removal in the same session. Kickoff: `docs/kickoffs/v6.3.123-CHI-58-drawer-copy-cleanup.md`. |
| 2026-07-21 | S-CHI-51-design | Section 40 amended — drawer-open mechanism consolidates from 5 scattered `EvidenceColumn` pieces into one generic `useDrawerStack()` hook; resolution-aware auto-open suppression built in as a first-class input (suppresses until the next genuinely new `qaEvidence`/`newsCards` arrival, not just any transition). Drawers persist through resolution (`hypFlow.resolution` replaces nulling `hypFlow`), scoped within one theory cycle. Taxonomy decision record (added by `CHI-46`) now fully built. Kickoff: `docs/kickoffs/v6.3.111-CHI-51-drawer-persistence-resolution.md`. |
| 2026-07-21 | S-CHI-50-design | Section 40 amended — Draft Forecast becomes the 5th drawer (fixed title, not intent-dynamic), split out of the pinned footer's old monolithic `ConfirmationCard`. `computeAutoCurrent` gains `hyp-draft` (highest priority). `ConfirmationCard` splits into `ConfirmationCardContent`/`ConfirmationCardActions` (`SharedUI.jsx`); monolithic export deleted. "Needs Your Decision" badge relocates to `headerRight`. Closes a real chat-narration gap (no pointer message existed for this decision point). Taxonomy decision record (added by `CHI-46`) now fully built. Kickoff: `docs/kickoffs/v6.3.108-CHI-50-draft-forecast-drawer.md`. |
| 2026-07-21 | S-CHI-49-design | Section 40 amended — Theory splits into `{intentLabel} Candidates`/`{intentLabel} Result` (2 drawers, intent-dynamic titles — a deliberate departure from News/Analysis's fixed strings). `computeAutoCurrent` gains a stage-aware split (`hyp-candidates`/`hyp-result`). Candidates persists collapsed with a chosen-summary title + read-only recap on reopen, rather than disappearing. Kickoff: `docs/kickoffs/v6.3.106-CHI-49-theory-candidates-result-split.md`. |
| 2026-07-21 | S-CHI-46-design | Section 40 amended — News becomes a 3rd persistent drawer, `computeAutoCurrent` extended to 3 keys (`hyp` > `qa` > `news`), true-empty-state branch merged away. Drawer titles confirmed as fixed/hardcoded, not agent-generated (not a Rule #1 concern). Decision record added for a larger, not-yet-built taxonomy (5 drawer types, `CHI-49`/`50`/`51`, logged in `FEATURES.md`). Kickoff: `docs/kickoffs/v6.3.103-CHI-46-news-drawer.md`. |
| 2026-07-21 | S-CHI-45-design | Section 29 amended — `Drawer` gains optional `headerRight` slot, backward-compatible. Section 40 amended — `CHI-03c`'s hop-range badges relocated from open body content into each drawer's own `headerRight` (visible open or collapsed), quieter without losing trace-back value. Section 31 amended — cross-reference note that `QaEvidenceCard`/`hypothesis_test`-result-block badge placement moved. Kickoff: `docs/kickoffs/v6.3.100-CHI-45-hop-badge-header-relocation.md`. |
| 2026-07-21 | S-CHI-44-design | Section 40 amended — theory selection auto-advances into the test (reverses `MI-51`), "ready" stage deleted, `CHI-42`'s 2 select-flow bubbles collapse to 1. Submitted-theory block also stays visible during `onCommit()`'s "committing" stage (narrowed scope — Column 1's existing status strip already covers live-progress narration). Kickoff: `docs/kickoffs/v6.3.97-CHI-44-auto-advance-committing-gap.md`. |
| 2026-07-21 | S-CHI-43-design | Section 40 added — Evidence Column restructured to a 2-drawer stack (`qaEvidence`/`hypFlow`), auto-current + auto-scroll on genuine state transitions, manual override in between. Section 29 amended — `Drawer` gains optional controlled `open`/`onToggle` props, backward-compatible. Restyle only (`CHI-47` split out for the separate history-persistence question). Kickoff: `docs/kickoffs/v6.3.93-CHI-43-evidence-drawer-stack.md`. |
| 2026-07-21 | S-CHI-42-design | Section 36 amended — third chat bubble variant locked: user-action narration (`kind:"user_action"`), right-aligned/"You"-labeled like real input but `T.navyMid` fill instead of solid `T.navy`, and deliberately excluded from `conversationContext()` so it's never replayed into Marcus's own prompt history as fabricated user speech. First application: `CHI-42`'s six action points. Kickoff: `docs/kickoffs/v6.3.90-CHI-42-chat-narrates-user-actions.md`. |
| 2026-07-20 | S-CHI-38-39-design | Section 39 added — Shimmer Sweep Overlay locked: reusable `ShimmerSweep` component wraps the pre-existing `shimmer` keyframe (no new keyframe/color) for any loading-skeleton or idle-motion cue. Scoping rule: never bake into a shared component reused elsewhere (e.g. `Drawer`) — wrap only the specific call site. First application: `CHI-38` (news-card loading skeletons), `CHI-39` (idle auto-rotation shimmer on example-question blocks). Kickoff: `docs/kickoffs/v6.3.69-CHI-38-CHI-39-shimmer-motion.md`. |
| 2026-07-18 | S-CHI-26-design | Section 38 added — Evidence duplicate-status removal (`CHI-26`), Column 3 header renamed "Audit"→"Focus Area Audit" (`CHI-28`), Evidence scroll-fade via shared `ScrollFadeHint` extraction (`CHI-29`). Section 31 amended — within-hop activity order reverts to newest-first, matching hop-to-hop direction (`CHI-27`, reverts `CHI-09`). Section 21 amended — `MI-50`'s fade mechanism extracted to `SharedUI.jsx`, mobile behavior unchanged. Kickoff: `docs/kickoffs/v6.3.59-CHI-26-evidence-audit-panel-ux-fixes.md`. |
| 2026-07-17 | S-AI-AUDIT-TRIAGE-01-design / LOG-15 | Section 31 amended — capability display permanently removed from the Agent Routing drawer (John's hard rule); per-event line is pattern-only now, format `"AI patterns used: [names]"`, no placeholder when no real pattern data exists. `SERVICE_LABEL` deleted (dead code once the capability field was removed). Kickoff: `docs/kickoffs/v6.3.55-LOG-15-agent-routing-patterns-only.md`. |
| 2026-07-17 | S-CHI-18-design / CHI-18 | Section 37 amended — Evidence footer locked-spacing fix: outer Evidence card gains `gap:14` (matches `AuditColumn`'s drawer gap), `QaEvidenceCard` gains `flex:1` to stretch and fill available height, scroll body's bottom padding dropped to 0 (top/sides unchanged) so the two changes combine to a fixed 14px gap instead of a variable one. Footer's own anatomy untouched. Kickoff: `docs/kickoffs/v6.3.54-CHI-18-evidence-footer-spacing.md`. |
| 2026-07-16 | S-CHI-13-design | Section 37 added — Evidence Column scroll-body + pinned-footer anatomy locked: `EvidenceColumn` now matches `InteractColumn`'s card structure (scrollable content, no fixed `maxHeight`, one pinned footer row below). New `selectEvidenceFooterKind()` centralizes the mutual exclusion across the 3 decision points (qa review / hypothesis result / confirmation). `QaEvidenceCard`'s brass "needs your input" card (Section 35) extracted to `QaEvidenceCardFooter`, byte-identical styling. `ConfirmationCard` (`SharedUI.jsx`) unchanged, only relocated. Kickoff: `docs/kickoffs/v6.3.44-CHI-13-evidence-column-pinned-decision-footer.md`. |
| 2026-07-16 | S-CHI-08-design | Section 36 added — Chat Bubble Speaker Label locked: subtle mono/9px/muted "You"/"Marcus" label above every `MessageBubble` (both branches), always static ("Marcus" for Chat, never `qaEvidence.displayAgentCard`). Flagged-narrative caption ("⚑ {review_reason}") merged inside the bubble (was a separate caption below it); "Marcus flagged this —" prefix dropped, ⚑ icon + brass color kept. Kickoff: `docs/kickoffs/v6.3.38-CHI-08-chat-bubble-consolidation.md`. |
| 2026-07-16 | S-CHI-05-design | Section 35 added — Gradient Action Card "needs your input" pattern locked: new `T.brassGlow`/`T.white` tokens, gold-to-white gradient fill, sharp corners + brass Corners bracket, solid-brass/navy badge, bold navy question text, navy primary CTA (scoped exception to Section 7). First application: `QaEvidenceCard`/`MessageBubble`'s review-choice prompt. Kickoff: `docs/kickoffs/v6.3.32-CHI-05-evidence-review-choice-action-styling.md`. |
| 2026-07-16 | S-CHI-04-design / CHI-04 | Section 34 added — Clear now resets `pipelineEvents`/`pendingDelegationsRef` (Column 3 used to survive Clear untouched); stale-generation guard (`clearGenerationRef`/`isStale`) locked as the durable cancellation pattern for any future async call this screen adds; question-boundary divider (`question_boundary` marker event + `QuestionDivider`) marks where one question's Agent Routing hops end and the next begin when Clear isn't used in between. Kickoff: `docs/kickoffs/v6.3.29-CHI-04-clear-reset-stale-guard-question-divider.md`. |
| 2026-07-16 | S-CHI-03-design / CHI-03a | Section 33 added — Chat vs. Evidence content split locked: any document/analysis/narrative is evidence (Column 2), conversational commentary about it stays in chat. New `qaEvidence` state slot (independent of `hypFlow`) fixes a real bug where a plain Q&A never escalated left Evidence permanently empty. Columns renamed "Interact"→"Chat", "Evidence"→"Evidence & Interaction". Kickoff: `docs/kickoffs/v6.3.22-CHI-03a-chat-evidence-architecture-move.md`. |
| 2026-07-16 | S-CHI-AUDIT-GROUPING-01-design | Section 31 amended — same-agent consecutive rows now merge into one turn-numbered card (was header-suppression only). Section 32 added — long log text clamps visually (3 lines) with click-to-expand, replacing hard string truncation. |
| 2026-07-16 | S-CHI-03c-design / CHI-03c | Section 31 amended — "turn"/"turns" renamed to "hop"/"hops" throughout (`RoutingTurnCard`→`RoutingHopCard`, `groupEventsIntoTurns()`→`groupEventsIntoHops()`), hop-range cross-reference badges added on `QaEvidenceCard`, `hypothesis_test` result block, chat pointer sentence, and both `CHI-03b` ack messages. Section 21 amended — Evidence tab enabled/flash gate corrected to include `qaEvidence`, not just `hypFlow`; flash-direction line corrected to match implementation. Kickoff: `docs/kickoffs/v6.3.24-CHI-03c-hop-rename-cross-reference-mobile-fix.md`. |
| 2026-07-14 | S-MI-68-design | Section 31 added — Agent Routing log rewritten to activity-narration copy (drops confidence_tier/self-flag jargon and per-event outcome detail), same-agent consecutive rows collapse to index-only continuation lines. |
| 2026-07-14 | S-MI-62-design | Section 30 added — Stage-Status Copy Accuracy locked: any stage/status copy naming a specific mechanism or data source must be verified against the real Skill Profile `method` text first. First application: `EvidenceColumn`'s generating/testing stage sentences swapped which one claims Data Room usage, to match `hyp-generation-intent`/`hyp-hypothesis-test-intent`'s actual methods. Kickoff: `docs/kickoffs/v6.2.39-MI-62-evidence-stage-copy-accuracy.md`. |
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
| 2026-08-07 | S-LAV-33-design | Section 41 bullet added — Deliverable drawer run-complete cue locked: brass `borderPulse` until first open, reduced-motion static-border fallback, chrome only. |
| 2026-08-07 | S-MOB-17-design | Section 42 tabs bullet amended — mobile Answer tab run-complete cue locked (same `borderPulse` idiom + predicate as `LAV-33`); tab label locked as "Answer" per John. |
| 2026-08-08 | S-LAV-37-design | Section 41 bullet added — first-draw layout invariants locked: home grid y-span 0.22–0.74 clears chrome bands; `.lav-role` wraps; waterfall pane tinted; trace console noted as a shared (not desktop-only) surface. |
| 2026-08-07 | S-LAV-34-design | Section 41 bullet added — status strip live-narration brass pill locked (`LAV-34`): brass wash + border, brassDeep 12.5px semibold, dot pulses `aiBlink` only while live, reduced-motion static, empty message = bare spacer. |
| 2026-08-08 | S-CHI-100-design | Global rule locked (`CHI-100`, John's call): **desktop renders at 80%** — `zoom: 0.8` on `#root` at `min-width: 769px` (always `MOBILE_BREAKPOINT + 1`), every `100vh` inside the zoomed root must compensate via `calc(100vh / 0.8)` (currently the `GLOBAL_CSS` `#root` rule + `AppShell`'s `--shell-h`; a NEW `100vh`/`vh`-unit style anywhere in `src/` must consume the same compensation or it will render 80% tall with a blank band). Mobile is never zoomed. `zoom` may appear exactly once in `src/`. |

## Section 41 — Live Agent View: Round-1 UX Rules (Locked 2026-07-31 · S-LAV-5-design)

- **Time format, LAV-wide (`formatLavDuration()`, exported from `HarnessTraceConsole.jsx`):** `<10s` one decimal (`5.9s`, `0.6s`); `10–59s` whole seconds (`42s`); `≥60s` `Xm Ys` (`1m 5s`); null → `—`. Every duration on the page uses it; raw `ms` never renders. Cost renders `$0.00` (2 decimals). Deliberately NOT CHI's `formatDuration` (different contract; changing it would alter CHI).
- **Question picker is the page CTA:** `T.white` background (the only white input on the cream title bar). The submitted question renders nowhere else — the status strip carries the live activity line + elapsed + the four meters as a 2×2 grid at its right end (above the rail).
- **Routing lines (rewritten 2026-08-02 · `LAV-20`, John's calls — supersedes both the original single-lit-line rule and `LAV-9`'s colours-persist/2-label-cap rules):** **while a run is live**, every edge that has carried traffic renders solid (`strokeWidth 2.2`) in its last meaning colour, and **every solid line carries its legend word at full opacity** — an in-flight delegation reads "Delegate"; there is no most-recent-N label cap. Label typography unchanged: 9.5px body font in `T.muted`, parallel along the top of the line, angle folded to `(-90°, 90°]` so it never renders upside-down. **The moment the run terminates, every line settles to the dashed tan trace** — `T.line`, `2 7` dash, 1.6 width, no word, no arrow — "so the user sees how much communication was carried" (John). No colours persist, no exceptions: the brass Hand-off state (a delegation unreturned at terminal) is removed entirely — `HANDOFF_COLOR` and its map entry no longer exist. **Legend is exactly three entries, desktop and mobile: `Delegate` (blue) / `Result` (green, renamed from "Report back") / `Iterate` (red, renamed from "Re-dispatch")** — the desktop row iterates `EDGE_MEANING_LABEL` so legend and line words can never disagree. Link/Hand-off/Assembly left the legend but their canvas behaviors stay (the tan trace, the assembly ring on cards). Assembly work still never gets an edge, pulse, or label.
- **Canvas model tag:** family name parsed from the real model id (`modelFamily()` — `claude-haiku-…` → "Haiku"); non-Claude ids render verbatim; full id in `title`. No model lookup table.
- **Pattern pills persist:** an agent's card keeps its latest *classified* span's pattern(s), joined across ALL of the turn's trace_ids (never just the first), from run start until the next question boundary. Unclassified stays empty (§19l) — no fallback copy.
- **Trace console anatomy:** 172px tall; header shows the 8-char first id segment (no "trace" word) + `+N`; both panes scroll with `scrollbar-width:thin` + `ScrollFadeHint` (`bg: CON_BG` — reuse from `SharedUI.jsx`, never reimplement); every line numbered oldest = 1 top → newest highest at bottom; sticky field-label headers (`# / time / event / call id / detail`; waterfall `agent · intent / timeline / duration`). Event type strings still print verbatim — headers label columns, they rename nothing. Model-call lines label the token split: `in X / out Y tok`.
- **Prompt box:** 4-line clamp; the preview starts after a leading `=== OUTPUT FORMAT ===` block (`promptPreviewText()`); the popover always renders the full untouched streamed text — the record is never altered, only where the preview window starts.
- **Right rail:** the Agent Routing feed only — CHI's row components (`RoutingHopCard`/`QuestionDivider`, imported from `MarketIntelligenceScreen.jsx`), full-height scroll, slim uppercase `Agent Routing · N hops` header; no Drawer chrome, no other drawers on this screen.
- **Status strip live-narration pill (`LAV-34`, locked 2026-08-07):** the working-status line (§19s content — asker's task words / doer's account) renders inside a brass-tinted pill: `rgba(T.brass,0.14)` wash, `1px T.brass` border, radius 16, text `mono` 12.5px weight-600 `T.brassDeep`, never italic; 8px `T.brass` dot at its left pulsing `aiBlink` **only while the run is live** (`.lav-status-dot-live`, `LAV_STATUS_PILL_CSS`; `prefers-reduced-motion` → static dot). Empty/cleared message renders a bare `flex:1` spacer — an empty capsule never appears (the stream nulls `status` at terminal). The `awaiting` "Needs Your Decision" branch outranks the pill and keeps its own styling. `T.brassGlow` stays reserved for needs-your-input surfaces (CHI-05) — the pill never uses it. The pill must stay shorter than the ModeBadge so the strip height never changes. Chrome only — the words are agent-authored, verbatim (§19s).
- **First-draw layout invariants (`LAV-37`, locked 2026-08-08):** the idle home grid's vertical span is **0.22–0.74 of canvas height** so no card slot can sit under the px-fixed chrome overlays (legend/toggle cluster top-right, prompt box bottom) — never re-widen the span without re-checking both bands. `.lav-role` carries `overflow-wrap:anywhere` — an unbreakable role token wraps inside the 132px card, the role text itself is never shortened for layout. Trace console: the Span Waterfall pane is tinted `rgba(T.navyDeep,0.5)` against the event list, divider kept — and note the trace console is a shared surface (mobile mounts it in the Harness Trace overlay), not desktop-only chrome.
- **Deliverable drawer run-complete cue (`LAV-33`, locked 2026-08-07):** from run-completion until the user first opens it, the Deliverable drawer's frame carries the existing brass `borderPulse` idiom (tokens.js — same keyframe as the Console Boot Dial frame and `.upload-blink`; never a second attention animation). Opening clears it; the next run's answer re-arms it. Never while a run is live. `prefers-reduced-motion`: animation off, static `T.brass` border instead (same pattern as `MOB-11`'s mobile breath states). Chrome only — drawer content untouched (§19s).

**Everything in this section describes the DESKTOP composition.** Mobile is a different composition, not a reflow of it — Section 42.

---

## Section 42 — Live Agent View: Mobile Composition (Locked 2026-08-01 · `design-lav-mobile-0801` / `MOB-4`)

Below `MOBILE_BREAKPOINT` (768px, `useIsMobile()` — Section 22), `LiveAgentViewScreen.jsx` and `AgentNetwork.jsx` render **a different composition of the same shared components**, not a CSS reflow of the desktop grid — the same construction Section 21 locked for CHI, and for the same reason: the desktop canvas is a 1200×640 viewBox with 132px fixed-pixel node cards, and eleven `mi`-roster cards cannot coexist on a 402px screen. Desktop (`≥768px`) renders Section 41's composition completely unchanged; this rule governs the mobile branch only, by construction.

**Shell — the CHI mobile shell with the canvas in chat's slot:**
- **Title row:** one 17px `display` line with the focus-area status tag inline; `PAGE_SUBTITLE` is **not** rendered here (Section 21's CHI-88 treatment) — it renders at the top of the Harness Trace overlay instead. Beneath it, a right-justified boxless `Harness Trace ›` CTA (`body` 12px, `T.brassDeep`), mirroring CHI's `Agent & Data Info ›`.
- **Tabs:** `Canvas` | `Answer`. Canvas is default. **Answer is a tab and only a tab — there is no Answer pill on the mobile canvas** (John's explicit call, 2026-08-01; desktop keeps its `LAV-7b` drawer). **(Amended 2026-08-07, `MOB-17`, John's call:** the Answer tab button carries the brass `borderPulse` run-complete cue — underline + glow — from run-completion until first visited, reusing `LAV-33`'s `deliverableCueNext()` predicate verbatim; `prefers-reduced-motion` holds a static `T.brass` underline. **The tab label stays "Answer"** — the Deliverable rename was offered and declined; do not rename it without John.**)**
- **Picker + Run renders on the Canvas tab only**, not as shared chrome (Section 21's locked rule). Picker font is **16px** — the standing mobile-input floor.
- **Status strip is permanent and tab-independent:** ONE row — mode badge · short elapsed · Tokens · Est. Cost. **(Amended 2026-08-07, `MOB-15`, John's call:** the status/narration line is no longer beneath the strip — it renders in the bottom text cluster, see below.**)** **Active Spans and Agents Engaged are suppressed on mobile** — four 8px labels across 402px are unreadable. Elapsed uses `formatElapsedShort`/`formatExpectationShort` (`m:ss · >Nm`); §19o's expectation is shortened, never dropped.
- **Bottom text cluster (locked 2026-08-07, `MOB-15`, John's spec):** below the tab body, visible under both tabs, three fixed-height pieces top to bottom — the **Assembly tracker band** (mono "Assembly" label + one tappable chip per `buildAssemblyStages` section, chronological L→R; ✓ moss when filled, brass `aiBlink` dot while a live ghost, `T.flag` for error; NO placeholder/upcoming chips ever — the fold's real stages only, §19r/§19j), then a **fixed-height swap region**: resting it shows the §19s narration line (`awaiting` branch outranking `status?.message`, both moved verbatim from the strip) above the Agent Routing feed; tapping a chip swaps the region's *children* to that stage's own `StageSection` (exported, rendered verbatim), tapping the same chip restores resting. **App-static invariant, John's explicit requirement: no element on the screen changes size or position between the two states — the swap is content-only.** A stale chip key (new run, ghost re-keyed on fill) self-heals to resting via key-derived resolution, no effect.
- **Harness Trace overlay** carries the trace console, the span waterfall and the assembled-prompt box; `← Back to Canvas` is the only dismissal (Section 21's unchanged convention).

**Canvas — two user-picked views of one canvas:**
- **`Single | Bench` toggle sits hard right of the top chrome row, with the legend immediately to its left — one right-aligned cluster (amended 2026-08-07, `MOB-15`, John's call; was "legend hard left"; mirrors desktop's `.lav-topright` arrangement).** Measured at 375px with all 3 legend chips lit: no wrap, no overflow. (Renamed from `Active | Bench` 2026-08-01, `MOB-8`, John's call — `Single` because this file already uses "active" for the *currently-working agent* (`net.activeId`, `is-active`), so the view sharing that word was ambiguous on two axes. The internal `mobileView` key was renamed with it.) Toggle matches the legend's visual height (19px); a transparent `::after` extends its touch box to ~36px so that costs nothing in tappability. The Choreographed/Static toggle is **not** rendered on mobile.
- **`Bench` is the default view** and renders **only the agents the run actually called**. An uncalled agent's slot stays empty — the gap is the information. Nodes are avatar + code + first name; no role, model tag or pattern pill at that size. Edges are the real observed set (`sessionEdges`), never a decorative star.
- **Every agent holds a permanent slot, derived from its index in the roster** (`mobileSlot(index, total)`) — never from engagement order. Same agent, same place, every run, so the user learns where to look. `roster[0]` takes the hub. No hand-authored position table and no hand-listed agent id, exactly as `homeLayout()`'s standing rule at `AgentNetwork.jsx` L281 requires; a new agent joining the bench group claims the next slot with no code change.
- **This deliberately diverges from desktop**, where `computeTargets()` moves the lead agent to a fixed `LEAD` anchor and arcs the engaged around it. Mobile holds still on purpose. Do not "fix" it to match.
- **`Single`** shows the current hand-off as two full-size cards with the connector and its own legend word between them; idle renders one card or nothing, never a placeholder.
- **No auto-switch.** An earlier pass had the view widen automatically on the first `delegation_return`; Bench-as-default supersedes it. The toggle is the only thing that moves the view.
- **Decision panel:** a confirmation gate renders as a panel anchored to the bottom edge of the **canvas** — not the screen — so the status strip and routing feed stay visible while deciding. Carries `ConfirmationCardContent` verbatim plus Reject/Accept at ≥44px. It replaces desktop's "You" canvas node, which mobile cannot use: Bench nodes are 38px and the human has no roster index, so `mobileSlot` has no slot for one.

**Known limitation — resolved structurally 2026-08-02 (`LAV-20`, closed `MOB-5`):** the chrome row fits 3 legend items at 402px with ~23px of slack. When there were 6 possible edge meanings, more than three lighting at once wrapped the legend to a second line (tracked as `MOB-5`). `LAV-20` reduced the legend vocabulary to exactly 3 entries (`EDGE_MEANING_LABEL`: Delegate/Result/Iterate; assembly chip deleted), so the wrap is now impossible by construction — the maximum legend row is the measured-fitting 3.

**Mobile mini-node pulse (`MOB-11`, 2026-08-02):** the Bench view's three live states (`is-active`/`is-assembly`/`is-orch`) carry a continuous avatar-glow breathing animation (component-scoped `lavMobBreath*` keyframes) mirroring desktop's live-state semantics; `is-done`/`is-recovering`/resting stay static, and `prefers-reduced-motion` disables all three. The static drop-shadow glow remains as each state's baseline so state still reads without motion.

Mock of record: `docs/mocks/lav-mobile-mock.html` (three 402×874 frames — Bench, Active, decision panel).

## Section 43 — Live Agent View: Assembly Drawer (Locked 2026-08-04 · design-lav-21 / LAV-21)

- **Left column (desktop only, 280px):** **Deliverable** drawer (the renamed Answer drawer — behavior, height cap, default-closed all unchanged; guardrail-demo variant title `Deliverable: Agent guardrail catch`) above the **Assembly** drawer, which takes the Run Assembly feed's slot. The feed (`RunTasks.jsx`) is hidden, not deleted — restoring it is one mount line.
- **Header idiom:** `Assembly · N stages` (the Run Assembly/Agent Routing count-in-title family). Open by default; body fills to the harness trace console's top edge, scrolls inside with `ScrollFadeHint` + thin scrollbar; **scroll pinned to top on every new entry** — with newest-on-top order this keeps the latest event always visible (John's spec).
- **Order:** sections newest-first by open time; terminal cap `Question answered · build complete` (mono uppercase, `T.line`, dashed border — the LAV-20 settle register) tops the stack; the next run resets the drawer (run-scoped).
- **Stage derivation (§19r, never re-derive casually):** declared work only — typed completions (`qa_answer`→Draft, `proofreader`/`failure_triage`→Verification, `display_format`→Final form, fetch→Evidence, reflect/synthesis→Draft, `error`→Error), `STAGE_OF_INTENT` (4 entries incl. `qa-answer-format`→final), and `delegation_complete` **only** with `viaTool === 'delegate_to_agent'` (a `request_help` completion is brokerage — routing, no section). Ghost sections open on start signals (`prompt_assembled`/delegation starts); an unmapped slug ghosts as unlabeled `IN PROGRESS`, never a guessed stage; unresolved ghosts drop at terminal. A fetch nests under the open section its `parent_span_id`/`forAgentId` serves, else top-level Evidence.
- **States:** live+empty → `Assembly under way…`; at rest → `No build yet — run a question and watch the answer assemble here.` Both chrome-register only — agent content is never screen-authored (§19j).
- **Question picker:** options numbered `1.`-`N.` from the list index, desktop and mobile call sites — never hand-numbered.
- Mock of record: `docs/mocks/lav-21-build-view-mock.html` (v3). Shipped-vs-mock deltas pending John's call: see the `LAV-21` archive row.
