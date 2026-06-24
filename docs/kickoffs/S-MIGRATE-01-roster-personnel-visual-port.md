# S-MIGRATE-01 — Roster + Personnel File Visual Port
> Sessions: S-MIGRATE-01a + S-MIGRATE-01b | Version: v5.1.20 (01a), v5.1.21 (01b)
> Design source: `docs/kickoffs/S-MIGRATE-UX-design-notes.md`
> Status: ⏳ READY TO CODE

---

## Session Split

| Session | Files (max 3) | Scope |
|---------|--------------|-------|
| **S-MIGRATE-01a** | `agents.js`, `SharedUI.jsx`, `RosterScreen.jsx` | AVATAR_CFG + AgentAvatar component + Roster visual port |
| **S-MIGRATE-01b** | `PersonnelScreen.jsx` | Left-sidebar nav + Profile tab 2-col layout |

Run 01a first. 01b is a separate session.

---

## Architectural Decision — AgentAvatar Lives in SharedUI

`AgentAvatar` is a shared component. Work screens (task cards, AIActivityPanel, AssignWorkScreen, Dashboard) will eventually show illustrated portraits alongside agent name. Defining it in `SharedUI.jsx` from day one avoids extraction later.

**Export from SharedUI, import everywhere needed.**

---

## Language / Brand Rules (Non-Negotiable)

- **DeepBench is an AI workforce platform** — agents have diverse roles (web agent, marketing designer, intern, consultant, analyst). Never use "analyst" as the universal term.
- **AppShell is always present** — DeepBench top nav (logo + nav links) wraps every screen. The NIGP top bar does not exist in DeepBench. Do not add or reference it.
- **DeepBench copy stays DeepBench** — do not adopt NIGP headline/subtitle text. See masthead rules below.

---

## ══════════════════════════════════════
## S-MIGRATE-01a
## ══════════════════════════════════════

**Version: v5.1.20 | Files: `agents.js`, `SharedUI.jsx`, `RosterScreen.jsx`**

### Session Rules
- Max 3 files: agents.js, SharedUI.jsx, RosterScreen.jsx
- Max 4 tasks
- Node.js test `test-s-migrate-01a.mjs` must pass before commit
- `npm run build` must pass before commit

---

### Task 1 — `src/data/agents.js`: Export AVATAR_CFG

**Version header (line 1):**
```js
// DeepBench v5.1.20 | agents.js | Add AVATAR_CFG for illustrated SVG portraits
```

**Add after the `AGENTS` array** (do not modify any existing agent properties):

```js
// FEATURE: RO-04 — Avatar config for illustrated SVG portraits
export const AVATAR_CFG = {
  chloe:  { skin:"#e8c9a8", hair:"#6b3a1e", collar:"#f0e6d2", extra:"freckles", border:T.brass  },
  mike:   { skin:"#d4a378", hair:"#3a3a3a", collar:"#24364f", extra:"glasses",  border:T.brass  },
  bob:    { skin:"#e5c19a", hair:"#5a4a3a", collar:"#2a3a52", extra:"tie",      border:T.moss   },
  christy:{ skin:"#dba77d", hair:"#2a1a1a", collar:T.brass,   extra:"bob",      border:T.brass  },
  robyn:  { skin:"#c48b62", hair:"#8a3418", collar:"#5a2f3d", extra:"bun",      border:T.brass  },
  brent:  { skin:"#d4a870", hair:"#2c3e2d", collar:"#1a2e1a", extra:"field",    border:T.moss   },
  pat:    { skin:"#e8c9a0", hair:"#8b4513", collar:"#c0c0c0", extra:"bob",      border:T.muted  },
};
```

---

### Task 2 — `src/components/SharedUI.jsx`: Add AgentAvatar export

**Version header (line 1):**
```js
// DeepBench v5.1.20 | SharedUI.jsx | Add AgentAvatar illustrated SVG portrait component
```

**Add import at top of SharedUI.jsx** (AVATAR_CFG is needed):
```js
import { AVATAR_CFG } from "../data/agents.js";
```

**Add `AgentAvatar` as an exported component** (place after `SkillBar`, before `Toast`):

```jsx
// FEATURE: RO-04 — Illustrated SVG portrait per agent; used on Roster and Work screens
export function AgentAvatar({ who, size = 68, ring = true }) {
  const c = AVATAR_CFG[who] || AVATAR_CFG.chloe;
  const uid = `av-${who}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" style={{ display:"block", flexShrink:0 }}>
      <defs><clipPath id={`clip-${uid}`}><circle cx="36" cy="36" r="34"/></clipPath></defs>
      <circle cx="36" cy="36" r="35" fill={T.card} stroke={ring ? c.border : "none"} strokeWidth={ring ? 1.5 : 0}/>
      <g clipPath={`url(#clip-${uid})`}>
        <rect x="0" y="0" width="72" height="72" fill="#ede6d5"/>
        <rect x="0" y="40" width="72" height="32" fill={T.card}/>
        <path d="M 6 72 Q 12 54 36 54 Q 60 54 66 72 Z" fill={c.collar}/>
        <rect x="31" y="48" width="10" height="8" rx="2" fill={c.skin}/>
        {c.extra === "bun"     && <circle cx="48" cy="22" r="6" fill={c.hair}/>}
        <path d="M 16 34 Q 14 18 36 15 Q 58 18 56 34 Q 56 22 36 22 Q 16 22 16 34 Z" fill={c.hair}/>
        <ellipse cx="36" cy="36" rx="14" ry="16" fill={c.skin}/>
        {c.extra === "bob"     && <path d="M 20 30 Q 20 18 36 16 Q 54 18 52 34 L 52 28 Q 46 22 36 22 Q 26 22 22 30 Z" fill={c.hair}/>}
        {c.extra === "freckles"&& <path d="M 22 26 Q 24 18 36 16 Q 48 18 50 30 Q 44 22 36 22 Q 28 22 22 28 Z" fill={c.hair}/>}
        {c.extra === "tie"     && <path d="M 22 30 Q 22 20 36 18 Q 48 20 50 28 Q 44 22 36 22 Q 28 22 24 28 Q 22 29 22 30 Z" fill={c.hair}/>}
        {c.extra === "glasses" && <path d="M 22 30 Q 24 20 36 18 Q 50 20 50 30 Q 44 24 36 24 Q 28 24 22 30 Z" fill={c.hair}/>}
        <circle cx="30" cy="35" r="1.2" fill={T.navy}/>
        <circle cx="42" cy="35" r="1.2" fill={T.navy}/>
        {c.extra === "glasses" && <g fill="none" stroke={T.navy} strokeWidth="1.2"><circle cx="30" cy="35" r="4"/><circle cx="42" cy="35" r="4"/><line x1="34" y1="35" x2="38" y2="35"/></g>}
        {c.extra === "freckles"&& <g fill={c.hair} opacity="0.45"><circle cx="28" cy="38" r="0.5"/><circle cx="31" cy="39" r="0.5"/><circle cx="41" cy="39" r="0.5"/><circle cx="44" cy="38" r="0.5"/></g>}
        <ellipse cx="28" cy="40" rx="2" ry="1" fill="#c47a5a" opacity="0.22"/>
        <ellipse cx="44" cy="40" rx="2" ry="1" fill="#c47a5a" opacity="0.22"/>
        <path d="M 32 43 Q 36 46 40 43" fill="none" stroke={T.navy} strokeWidth="1.1" strokeLinecap="round"/>
        {c.extra === "tie"  && <><path d="M 34 54 L 38 54 L 40 72 L 32 72 Z" fill={T.brass}/><path d="M 34 54 L 36 58 L 38 54 Z" fill={T.navy}/></>}
        {c.extra === "field"&& <><rect x="28" y="52" width="16" height="20" rx="1" fill={T.moss} opacity="0.8"/><rect x="30" y="54" width="12" height="2.5" rx="0.5" fill="#fff" opacity="0.35"/><rect x="30" y="58" width="8" height="2" rx="0.5" fill="#fff" opacity="0.2"/></>}
        {(c.extra === "bob" || c.extra === "bun" || c.extra === "glasses" || c.extra === "field") && <path d="M 26 58 L 36 64 L 46 58" fill="none" stroke={c.border} strokeWidth="1.5" opacity="0.7"/>}
      </g>
      {ring && <circle cx="36" cy="36" r="34.5" fill="none" stroke={c.border} strokeWidth="0.5" strokeDasharray="0.5 2" opacity="0.5"/>}
    </svg>
  );
}
```

---

### Task 3 — `src/screens/RosterScreen.jsx`: Port NIGP visual design (avatars + skill bar only)

**Version header (line 1):**
```js
// DeepBench v5.1.20 | RosterScreen.jsx | NIGP visual port — illustrated SVG avatars, stats strip + link
```

**Changes:**

#### 3a. Add AgentAvatar to imports from SharedUI
```js
import { Corners, SkillBar, AgentAvatar } from "../components/SharedUI.jsx";
```

#### 3b. In `AgentCard`: replace initial-circle avatar with `<AgentAvatar>`

Find the initial-circle `<div>` in `AgentCard`'s badge header — the `width:68,height:68,borderRadius:"50%"` div showing `agent.name[0]`. Replace it with:
```jsx
<AgentAvatar who={agent.id} size={68} ring={true}/>
```

#### 3c. Keep the DeepBench masthead — do NOT port NIGP text

The current DeepBench masthead reads:
- Heading: **"Your bench."**
- Subtitle: **"These are your agents. Click any team member to view their profile, assign them work, or add to their training. Ready to grow your bench? Add a new player and start building their expertise."**

**Keep this copy exactly as-is.** Do not replace with NIGP's "Build your analyst team." text — that copy positions DeepBench as analyst-only, which it is not.

#### 3d. Add subtle "+ Add a Player" link to stats strip

In the navy bench stats strip, add at the right end (after the flex:1 spacer or as the rightmost item):
```jsx
<button
  onClick={() => navigate("/bench/new")}
  style={{ marginLeft:"auto", fontFamily:body, fontSize:12, color:"#8fa3bf", background:"transparent", border:"none", cursor:"pointer", letterSpacing:.5 }}>
  + Add a Player
</button>
```

Remove any existing large "Add a Player" primary button from the masthead header area if one exists. The Vacancy card at end of grid remains as the primary click-target for `/bench/new`.

#### 3e. Confirm no "Test My Team" button exists
DeepBench does not currently have this button. Confirm it is absent — no action needed if so.

---

### Task 4a — Test + Build

**Write `test-s-migrate-01a.mjs`:**

```js
// test-s-migrate-01a.mjs — S-MIGRATE-01a smoke tests
import { readFileSync } from "fs";

let pass = 0, fail = 0;
function ok(label, cond) { if(cond){ console.log("✓", label); pass++; } else { console.error("✗", label); fail++; } }

const roster  = readFileSync("src/screens/RosterScreen.jsx", "utf8");
const shared  = readFileSync("src/components/SharedUI.jsx", "utf8");
const agents  = readFileSync("src/data/agents.js", "utf8");

// Version headers
ok("agents.js v5.1.20 header",       agents.startsWith("// DeepBench v5.1.20"));
ok("SharedUI.jsx v5.1.20 header",    shared.startsWith("// DeepBench v5.1.20"));
ok("RosterScreen.jsx v5.1.20 header",roster.startsWith("// DeepBench v5.1.20"));

// AVATAR_CFG
ok("AVATAR_CFG exported from agents",agents.includes("export const AVATAR_CFG"));
ok("AVATAR_CFG has all 7 agents",    ["chloe","mike","bob","christy","robyn","brent","pat"].every(id => agents.includes(id)));

// AgentAvatar in SharedUI
ok("AgentAvatar exported from SharedUI", shared.includes("export function AgentAvatar"));
ok("AgentAvatar uses AVATAR_CFG",        shared.includes("AVATAR_CFG"));
ok("AVATAR_CFG imported in SharedUI",    shared.includes("AVATAR_CFG") && shared.includes("agents.js"));

// RosterScreen
ok("AgentAvatar imported in Roster",     roster.includes("AgentAvatar"));
ok("<AgentAvatar used in AgentCard",     roster.includes("<AgentAvatar"));

// DeepBench masthead preserved — NIGP copy must NOT appear
ok("DeepBench headline preserved",       roster.includes("Your bench."));
ok("NIGP headline NOT present",          !roster.includes("Build your analyst team."));
ok("NIGP subtitle NOT present",          !roster.includes("trainable AI agent"));
ok("Test My Team NOT present",           !roster.includes("Test My Team"));

// Stats strip + link
ok("Add a Player link present",          roster.includes("Add a Player"));

// Feature ID comments
ok("RO-04 comment in agents",            agents.includes("RO-04"));
ok("RO-04 comment in SharedUI",          shared.includes("RO-04"));
ok("RO-04 comment in Roster",            roster.includes("RO-04"));

console.log(`\n${pass} passed, ${fail} failed`);
if(fail > 0) process.exit(1);
```

Run: `node test-s-migrate-01a.mjs` — all must pass.
Then: `npm run build` — zero errors.

---

### 01a Commit Message

```
feat(S-MIGRATE-01a): illustrated SVG portraits — AgentAvatar in SharedUI, Roster visual port

- agents.js: export AVATAR_CFG (skin/hair/collar/extra/border per agent id)
- SharedUI.jsx: export AgentAvatar (shared, available to Work screens and Bench)
- RosterScreen.jsx: use AgentAvatar in agent cards, + Add a Player in stats strip

v5.1.20 | Feature: RO-04
```

---

### Start Prompt for 01a Coding Session

```
Read CLAUDE.md then read docs/kickoffs/S-MIGRATE-01-roster-personnel-visual-port.md and execute S-MIGRATE-01a.
```

---

## ══════════════════════════════════════
## S-MIGRATE-01b
## ══════════════════════════════════════

**Version: v5.1.21 | Files: `PersonnelScreen.jsx` only**

### Session Rules
- 1 file: PersonnelScreen.jsx
- Max 4 tasks
- Node.js test `test-s-migrate-01b.mjs` must pass before commit
- `npm run build` must pass before commit

---

### Context

The Personnel File (`/bench/:agentId`) currently uses a horizontal tab bar with 6 tabs (Profile, Resume, Training, Playbook, Workflow, Projects). This session ports the left-sidebar nav layout from NIGP, trims to 4 tabs, and updates the Profile tab to the NIGP 2-col card layout.

**AppShell is and must remain the outer wrapper.** DeepBench top nav (logo, nav links) is provided by `<AppShell>` — do not change or remove it. The NIGP app had its own top bar; DeepBench does not need one here.

---

### Task 1 — Replace horizontal tab bar with left-sidebar nav

**Version header (line 1):**
```js
// DeepBench v5.1.21 | PersonnelScreen.jsx | NIGP visual port — left-sidebar nav, Profile tab 2-col layout
```

#### 1a. Replace `TABS` array with `NAV_GROUPS`

Remove the flat `TABS` array. Replace with:
```js
// FEATURE: PE-07 — Left-sidebar nav replaces horizontal tab bar
const NAV_GROUPS = [
  { id:"overview",  label:"OVERVIEW",  tabs:[{ id:"profile",  label:"Profile",  icon:"◈" }] },
  { id:"configure", label:"CONFIGURE", tabs:[
    { id:"resume",   label:"Resume",   icon:"▣" },
    { id:"training", label:"Training", icon:"◎" },
    { id:"playbook", label:"Playbook", icon:"⬟" },
  ]},
];
```

Remove the `workflow` and `projects` tab renders from the content area. The `StubTab` component and its renders for those two IDs can be deleted. **Active Work Assignments and Recently Completed sections inside `ProfileTab` stay — they are the replacement for those nav items, already present as `AGENT_TASKS`/`AGENT_COMPLETED` blocks.**

#### 1b. Remove "Teach" and "Test" buttons from page header

In the page header title row, delete both the `navigate(.../teach)` and `navigate(.../test?agent=...)` buttons. These routes exist for now but are accessed via Training tab directly. Do not break the `navigate` import — it is still needed elsewhere.

#### 1c. Restructure layout shell — add left sidebar

Replace the inner `<div style={{display:"flex",flex:1,overflow:"hidden",flexDirection:"column"}}>` with a two-panel layout:

```jsx
<div style={{ display:"flex", flex:1, overflow:"hidden" }}>

  {/* ── Left sidebar nav ── */}
  <div style={{ width:180, flexShrink:0, background:T.card, borderRight:`1px solid ${T.line}`, display:"flex", flexDirection:"column", overflowY:"auto" }}>

    {/* Agent identity strip */}
    <div style={{ padding:"16px 14px 14px", borderBottom:`1px solid ${T.lineSoft}` }}>
      <div style={{ width:44, height:44, borderRadius:"50%", border:`2px solid ${agent.color}`, background:T.paperDeep, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:display, fontSize:18, fontWeight:700, color:agent.color, marginBottom:8 }}>
        {agent.name[0]}
      </div>
      <div style={{ fontFamily:display, fontSize:13, fontWeight:600, color:T.navy, lineHeight:1.2 }}>{agent.name}</div>
      <div style={{ fontFamily:mono, fontSize:8, color:T.muted, marginTop:2 }}>{agent.code}</div>
    </div>

    {/* Nav groups */}
    {NAV_GROUPS.map(g => (
      <div key={g.id} style={{ paddingTop:16 }}>
        <div style={{ fontFamily:mono, fontSize:8, color:T.muted, textTransform:"uppercase", letterSpacing:1.6, fontWeight:700, padding:"0 14px 6px" }}>
          {g.label}
        </div>
        {g.tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            width:"100%", textAlign:"left", padding:"8px 14px",
            fontFamily:body, fontSize:12,
            fontWeight: activeTab === t.id ? 600 : 400,
            color: activeTab === t.id ? T.navy : T.mutedDeep,
            background: activeTab === t.id ? `${T.brass}14` : "transparent",
            border:"none",
            borderLeft: activeTab === t.id ? `2px solid ${T.brass}` : "2px solid transparent",
            cursor:"pointer", display:"flex", alignItems:"center", gap:8,
          }}>
            <span style={{ fontFamily:mono, fontSize:10, color: activeTab === t.id ? T.brassDeep : T.muted }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    ))}
  </div>

  {/* ── Right content area ── */}
  <div style={{ display:"flex", flex:1, overflow:"hidden", flexDirection:"column" }}>

    {/* Page header — keep existing JSX, minus Teach/Test buttons */}

    {/* Tab content */}
    <div style={{ flex:1, overflowY:"auto", padding:"20px 24px 64px", background:T.paperDeep }}>
      {/* FEATURE: PE-08 */}
      {activeTab === "profile"  && <ProfileTab agent={agent} entries={entries} layers={layers}/>}
      {activeTab === "resume"   && <ResumeTab agent={agent} showToast={showToast}/>}
      {activeTab === "training" && <TrainingTab agent={agent} entries={entries} setEntries={setEntries} showToast={showToast} navigate={navigate}/>}
      {activeTab === "playbook" && <PlaybookTab agent={agent}/>}
    </div>

  </div>
</div>
```

---

### Task 2 — Update page header breadcrumb (PE-09)

The existing breadcrumb reads:
```
Personnel File · {agent.code} · {agent.trainableBy} Bench · {activeTab label}
```

Update the active tab label to use `NAV_GROUPS` for lookup instead of the old `TABS` array:
```js
const activeLabel = NAV_GROUPS.flatMap(g => g.tabs).find(t => t.id === activeTab)?.label || activeTab;
```

Use `activeLabel` in place of the current tab label in the breadcrumb. No other header changes.

The subtitle line currently reads: `Tenure · {agent.hiredOn} · {skillLabel(agent.skill)}-level analyst`

**Change `-level analyst` to `-level agent`** — "analyst" is NIGP-speak. DeepBench agents include a web agent, marketing designer, and intern. Use `agent` as the universal term.

```jsx
Tenure · {agent.hiredOn} · {skillLabel(agent.skill)}-level agent
```

---

### Task 3 — Update `ProfileTab` to NIGP 2-col layout (PE-08)

Source reference for card JSX: `C:\Projects\nigp-analyzer\src\PersonnelScreen.jsx` lines 299–406.

Replace the existing `ProfileTab` body. The current layout has left (1fr) and right (300px) with readiness/intel stacked on the left. The NIGP layout is cleaner:

**Grid: `gridTemplateColumns:"1fr 1fr"`, gap:18, alignItems:"start"**

**Left column:**
- **ID Badge card** (`background:T.card, border:1px solid T.line, padding:"16px 14px 12px", textAlign:center, position:relative`)
  - `<Corners color={agent.color}/>`
  - "Bureau of Procurement Intelligence" mono label (keep — it's DeepBench flavor, not NIGP-specific)
  - Initial-circle avatar 92×92 (keep as initial circle — illustrated avatar is Roster-only per design decision)
  - Agent name (display font), role (body italic)
  - Code badge + ACTIVE badge + YOUR TRAINEE badge (if `agent.trainable`)
  - `agent.quip` in italic moss-tinted box
- **Compensation card** (existing content — Salary Equiv., Yearly Value, hourly/reportHrs/reportCost/revenueModel line items, mock data disclaimer)

**Right column:**
- **Readiness Score card** (`background:T.navy, padding:"14px 18px", border:1px solid rgba(182,135,58,.3)`)
  - `<Corners color={T.brass}/>`
  - Large `readiness` score (display 44px, `readinessColor(readiness)`)
  - `readinessLabel(readiness)` label + "weighted composite · 5 layers" note
  - Progress bar
  - 5-layer breakdown (num, label, score bar, tab name) — use existing `computeLayers` output
- **Intelligence Config card** (`background:T.card, border:1px solid T.line`)
  - "How {agent.name.split(" ")[0]}'s prompt is assembled" — keep this phrasing
  - 5-layer horizontal segments (borderRight chained) showing layer label + score
- **Quick Stats card** (`background:T.card, border:1px solid T.line`)
  - 3-col grid: Skill / Documents / Reports Run (mock)
  - Below grid (separated by `borderTop:1px solid T.lineSoft`): Situational Awareness plain bar + percentage
  - Below that: Skill Level using `<SkillBar skill={agent.skill} color={agent.color}/>`

**Below the 2-col grid (full width):** Active Work Assignments + Recently Completed sections — keep exactly as-is, no changes.

Adapting from NIGP source:
- NIGP uses `T.paper` — use `T.cardAlt` as the DeepBench equivalent
- Use existing `computeLayers()`, `readinessColor()`, `readinessLabel()` already in the file
- Use existing `fmt$` from tokens
- The "Bureau of Procurement Intelligence" label on the ID Badge is fine to keep — it's DeepBench's government procurement framing, not NIGP-specific

---

### Task 4b — Test + Build

**Write `test-s-migrate-01b.mjs`:**

```js
// test-s-migrate-01b.mjs — S-MIGRATE-01b smoke tests
import { readFileSync } from "fs";

let pass = 0, fail = 0;
function ok(label, cond) { if(cond){ console.log("✓", label); pass++; } else { console.error("✗", label); fail++; } }

const p = readFileSync("src/screens/PersonnelScreen.jsx", "utf8");

// Version header
ok("PersonnelScreen v5.1.21 header", p.startsWith("// DeepBench v5.1.21"));

// Sidebar nav
ok("NAV_GROUPS defined",             p.includes("NAV_GROUPS"));
ok("OVERVIEW group present",         p.includes('"OVERVIEW"') || p.includes("OVERVIEW"));
ok("CONFIGURE group present",        p.includes('"CONFIGURE"') || p.includes("CONFIGURE"));
ok("OPERATE section NOT present",    !p.includes('"OPERATE"') && !p.includes("OPERATE"));
ok("workflow tab NOT in nav",        !p.includes('"workflow"'));
ok("projects tab NOT in nav",        !p.includes('"projects"'));

// Teach/Test buttons removed
ok("Teach button removed",           !p.includes("/teach"));
ok("Test button removed",            !p.includes("test?agent="));

// Language — no NIGP-speak
ok("No '-level analyst' label",      !p.includes("-level analyst"));
ok("Uses '-level agent' instead",    p.includes("-level agent"));

// AppShell preserved
ok("AppShell still wraps screen",    p.includes("<AppShell"));

// Active assignments kept in ProfileTab
ok("AGENT_TASKS still present",      p.includes("AGENT_TASKS"));
ok("AGENT_COMPLETED still present",  p.includes("AGENT_COMPLETED"));

// Profile tab 2-col grid
ok("gridTemplateColumns 1fr 1fr",    p.includes('"1fr 1fr"'));

// Feature ID comments
ok("PE-07 comment present",          p.includes("PE-07"));
ok("PE-08 comment present",          p.includes("PE-08"));
ok("PE-09 comment present",          p.includes("PE-09"));

// ResumeTab not modified (import only)
ok("ResumeTab imported not inline",  p.includes("import ResumeTab"));

console.log(`\n${pass} passed, ${fail} failed`);
if(fail > 0) process.exit(1);
```

Run: `node test-s-migrate-01b.mjs` — all must pass.
Then: `npm run build` — zero errors.

---

### 01b Commit Message

```
feat(S-MIGRATE-01b): Personnel File — left-sidebar nav, Profile tab 2-col layout

- Left sidebar nav: OVERVIEW (Profile) + CONFIGURE (Resume, Training, Playbook)
- Removed horizontal tab bar, Workflow/Projects nav items, Teach/Test header buttons
- Profile tab: NIGP 2-col layout — ID Badge + Compensation left; Readiness + Intel Config + Quick Stats right
- Active Work Assignments + Recently Completed preserved below 2-col grid
- Language: -level agent (not -level analyst), AppShell preserved

v5.1.21 | Features: PE-07, PE-08, PE-09
```

---

### Start Prompt for 01b Coding Session

```
Read CLAUDE.md then read docs/kickoffs/S-MIGRATE-01-roster-personnel-visual-port.md and execute S-MIGRATE-01b.
```

---

## What S-MIGRATE-02 Will Cover (next after 01b)

- Training tab: live `/api/load-entries` wiring
- Playbook tab: live `output_format` CRUD (ConfigCard + AddConfigForm pattern from ResumeTab)
- Files: `PersonnelScreen.jsx` only (or extracted tab files if needed)
