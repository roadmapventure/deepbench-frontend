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

## 5. Pulsing AI Status Dot

A pulsing brass dot `●` appears in the header when any AI call is active. Implemented via `AIDiamond.jsx`. Do not refactor without a dedicated session.

- Color: `T.brass` (`#b6873a`)
- Size: 4×4px, `rounded-full`
- Animation: `animate-pulse`
- Shown: during active AI call
- Hidden (removed, not just opacity 0): when call resolves

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

## Change Log

| Date | Session | Rule Added / Changed |
|------|---------|---------------------|
| 2026-06-08 | S-MIGRATE-UX | Treasury palette locked, left nav pattern locked |
| 2026-06-08 | S-MIGRATE-01a | AgentAvatar, illustrated SVG avatars in SharedUI |
| 2026-06-09 | S-MIGRATE-03 | Inline sub-view pattern (PE-10) |
| 2026-06-09 | S-MIGRATE-03-patch | AiBadge color rule: match button label color. No badge on Cancel state. |
| 2026-06-09 | S-BENCH-UX-01 | AiBadge known limitation: not visually distinct on brass backgrounds — blocked pending RO-08 design in S-BENCH-UX-02. |
| 2026-06-09 | S-BENCH-UX-02 | RO-08 resolved: AiBadge on brass = navy chip override; on moss = white chip override. Badge stays inside button. No badge on non-AI actions (file browse). |
