# DeepBench v5 — Mock & Screen Inventory

> Migrated from Google Drive to GitHub: 2026-06-07
> This file describes the approved UI design for each screen.
> Use this when designing new features to understand existing layout conventions.

---

## Landing / Marketing Screen

**Headline:** "Build Your Parallel Workforce"
**Subheadline:** "Stop re-training humans who leave. Encode your expertise into
agents that work 24/7, get smarter with every task, and never forget what you
taught them."

Two CTAs:
- "Build Your Own" → Create Your First Agent (`/bench/new`)
- "Try an Agent" → Interact With a Live Agent (`/bench`)

Case study block: City of Austin FY2025 — $372M analyzed, 11,711 transactions.

Three audience personas:
1. Solo Consultant — "I can't take on more clients without cloning myself"
2. Business Owner — "I'm tired of re-training people who leave"
3. Enterprise / Association — "Our practice can't scale to every member"

Three-step how it works: Build Your Agent → Teach Your Agent → Assign the Work

---

## Work Dashboard (`/`)

**Header:** "Your work dashboard."
**Subheader:** "Assign tasks, track progress, and chat with your agents — all in one place."
**Primary CTA:** "+ Create a new Task" (renamed from "Assign New Work" in S15a)

**Stats strip (top):**
- Active Tasks: 6
- In Progress: 3
- Needs Review: 2
- Completed: 41
- Agents Working: 4

**Left/main area:**
- Active Work Assignments list
- "Show more tasks" drawer
- Recently Completed section

**Right panel — Chat With Agent:**
- Online status indicator
- Topic pills: Data Analysis, Web Research, Writing & Drafting, Legal & Compliance, Strategy & Advisory, Formatting & Design
- "— or select agent directly —" divider
- Agent pills (direct selection)
- Empty state: "Select a topic or agent to start chatting"
- Message input + Send button

**Nav tabs:** Work | Bench (brass column borders, active state styling — S15a)

---

## Assign New Work (`/work/new`)

**Header:** "Assign new work."
**Subheader:** "Describe what needs to be done, pick an agent, and let them work."

**Quick Templates row:** Data Analysis Briefing | Fetch portal data | Draft proposal | Compliance review | Research summary

**Two-panel layout:**
- Left: "Describe the Task" + "Assign To" fields
- Right: "Agent Instructions" — streams in as plan generates

**Bottom CTAs:** Cancel | "Approve Steps & Launch →" (renamed S15b-A)

**Planning agent behavior:**
- Michelle Manning (PP-01) humanized as planning agent (S15b-B)
- Per-step agent attribution on each step card (S15b-B)
- Hover agent info card — read-only (S15b-B)
- Brass glow on suggested agent

---

## Task Instructions (`/work/[taskId]`)

**Header:** "Steps" (renamed from "Task Instructions" in S15c)
**Nav buttons:** Removed in S15c
**Primary CTA:** "Update Steps →" (renamed, repositioned below HITL comment textarea — S15c)

**Step timeline:**
- Agent steps: brass `#b6873a` left border
- HITL steps: flag red `#a83319` — CTA repositioned below comment textarea
- Sub-agent steps: blue
- Archived steps: grey collapsible drawer

**Agent attribution:** Prominent on each step card (added S10a)
**Michelle avatar:** Silhouette placeholder (S10p) — full photo in S-BENCH-01

---

## NIGP Analyzer (`/work/[taskId]/analyze`)

**Sidebar navigation:**

Overview group:
- ▦ Dashboard (Overview)

Analysis group:
- ◈ Categories
- ⊞ Treemap
- 🏢 Vendors
- 📅 Timeline

Strategy group:
- ⚑ Concerns (with count badge)
- 📍 Local Spend
- ⚡ Vendor Diversity
- ✨ AI Review

Data group:
- ↺ Update File
- 🧹 Cleanup
- 📋 Full Table

**Dashboard KPIs:**
Total Spend | Transactions | Categories | Unique Vendors | Health Flags | Vendor HHI | Top Category % | Top Vendor %

**Concerns/Flags (deterministic — no AI badge):**
- Maverick Spend (HIGH)
- Potential PO Splitting (HIGH)
- Single-Source Vendor Concentration (MEDIUM)
- Abnormal Monthly Spend Spikes (MEDIUM)

**Sample data (Austin FY2025):**
- Total spend: $372,988,798
- Transactions: 11,711
- Top vendor: MOTOROLA SOLUTIONS INC (7.8%, $29M)
- HHI: 231 (competitive market)

---

## Column Mapping (`/work/[taskId]/map`)

**Header:** "Confirm Column Mapping"
**Subheader:** "Found 21 columns in [filename]"

Required fields (🔶): Spend Amount
Optional fields (◦): NIGP Code, Item Description, Vendor Name, Contract #, PO Number, Department, Vendor City, Vendor State, Date

Each field: icon + label + description + dropdown showing detected column

**Bottom CTAs:** ← Cancel | Run Analysis →

---

## Load Data Screen

**Three data source tiles:**
1. Demo dataset 🏙 — "Load Demo" CTA
2. Live fetch · AI Agent 🌐 — "Fetch Live Data" CTA
3. Your data 📂 — "Upload CSV" CTA

---

## Configure Fetch (`/work/[taskId]/fetch`)

**State portal options:**
- Maryland (MD-CDX · Comptroller) — SELECTED/LIVE
- Illinois (IL Comptroller) — LIVE
- Oregon — Coming soon
- Texas, California, Florida — Coming soon

**Date range:** Fiscal Year | From Date | To Date

**Bottom CTAs:** ← Cancel | 🌐 Run Fetch Agent
**Note:** "I'd rather have an intern fetch" link REMOVED — Pat is first-class agent

---

## Agent Running Screen (SSE)

**Header:** "Brent — [State] · [Portal]"
**Subheader:** date range + model + Playwright

**Left panel:** Event log with timestamps
- START event
- NAVIGATE event (with target URL)
- STEP events (with reasoning text)

**Right panel:** Live screenshot stream

**Controls:** ⬛ Stop Agent button

---

## Team Bench (`/bench`)

**Header:** "Your bench."
**Subheader:** agents overview, click to view profile or assign work

**Bench stats:** Bench Size | Annual Salary | Annual Value | Reports/Mo | Trainable Agents

**Agent cards:** All 7 agents with workload indicators
**CTA:** ＋ Add a Player

---

## New Agent Setup (`/bench/new`)

**Two-step flow:**
1. Your Domain — choose closest domain match
2. Agent Profile — name, role, years experience, skill level, specialty

**Agent preview card** shown during setup
**Final CTA:** "Launch My Agent →"

---

## AI Audit Drawer (S16 — design complete, implementation pending)

**Access:** Persistent "+ AI" button in header → right-side drawer overlay
**Scope:** Lifetime metrics only (not time-filtered in S16)

**Three sections:**
1. AI Activity Type — grouped by type, count + cost + latency per type
2. LLM Grouping — Haiku vs Sonnet breakdown
3. Future placeholder — reserved for per-task drill-down (AI-12)

**Open question:** Architect Checklist tab — in scope for S16 or deferred? (Q-S16)

---

## Design Conventions (All Screens)

- Treasury palette only — never raw hex
- Corner ornaments: 9px brass SVG, absolute positioned on cards
- `✦ AI` badge on every AI-touched element
- Pulsing brass dot `●` when any AI call active
- FeatureBadge overlay: visible with `?debug=features` URL param
- Fraunces for headers/display, Inter for body, JetBrains Mono for labels/code
