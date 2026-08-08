// DeepBench v7.0.39 | AboutPanel.jsx | LOG-124 -- the logged-calls tile stops asking ai_activity_log for '*' (it only ever wanted the count), so a column-level revoke on caller_ip cannot 403 this panel
// DeepBench v6.3.171 | AboutPanel.jsx | ABT-1a -- About screen: single Architecture tab, live-wired rebuild
// DeepBench v6.3.134 | AboutPanel.jsx | LOG-36 -- "AI Patterns" stat tile reads the live logged count, not the static catalog length
// DeepBench v6.2.13 | AboutPanel.jsx | SH-21 mobile-responsive About DeepBench panel + scroll hint
// FEATURE: SH-05 — About panel replacing Help modal
// FEATURE: SH-21 — mobile-responsive layout (82% drawer width, scrollable tab bar, grid column drops)
// FEATURE: SH-21 — mobile tab-bar scroll hint (fade gradient + chevron, John's follow-up request)
// FEATURE: ABT-1 — Architecture is the only visible tab and the default (John's call, S-ABT-1a-design
//   2026-07-28). Purpose/Quick Start/Revenue/Showcase/Who-is-John are hidden but kept in-file (see
//   HIDDEN_TABS); Roadmap is deleted outright. The new Architecture content is a from-scratch,
//   under-5-minute read grounded in ARCHITECTURE.md §0/§0b/§1/§19d/§19k — every displayed number is
//   read live (Supabase on panel open), never hand-maintained. Resolves LOG-56 Sites 2+4 and retires
//   the LOG-70 AboutPanel consumer (the static pattern/service catalog imports are gone entirely).

import { useState, useEffect } from "react"; // was: import { useState } from "react";
import { T, display, body, mono } from "../tokens.js";
import { APP_VERSION } from "../config.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { supabase } from "../lib/supabase.js";
import { useAgents } from "../hooks/useAgents.js";

// ── Tab definitions ─────────────────────────────────────────────────────────────
// FEATURE: ABT-1 — the tab bar renders from TABS exactly as before; only Architecture is visible.
const TABS = [
  { id: "architecture", label: "Architecture" },
];

// FEATURE: ABT-1 — hidden, not deleted. Restoring one of these later is a one-line move into TABS
// above (its component function is still in this file; its render line must also be re-added to the
// content switch at the bottom). Stale facts inside these components are tracked as ABT-2
// (docs/FEATURES-LATER.md) — do not edit their content here.
const HIDDEN_TABS = [
  { id: "purpose",    label: "Purpose"     },
  { id: "quickstart", label: "Quick Start" },
  { id: "revenue",    label: "Revenue"     },
  { id: "showcase",   label: "Showcase"    },
  { id: "john",       label: "Who is John" },
];
void HIDDEN_TABS; // deliberately unreferenced — kept as the restoration manifest

// ── Shared sub-components ───────────────────────────────────────────────────────
function SH({ children, mt = 18 }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 8, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, color: T.brassDeep, marginTop: mt, marginBottom: 8 }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: `1px solid ${T.lineSoft}`, margin: "14px 0" }} />;
}

function BulletItem({ children }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "3px 0", fontSize: 12, color: T.navy, lineHeight: 1.55 }}>
      <span style={{ color: T.brass, flexShrink: 0, fontSize: 10, marginTop: 2 }}>▸</span>
      <span>{children}</span>
    </div>
  );
}

// FEATURE: ABT-1 — kept (kickoff listed LayerRow as old-Architecture-only, but PurposeTab — hidden,
// unmodified — still renders it; deleting it would break a deliberately-kept component).
function LayerRow({ name, desc, status }) {
  const dot = status === "Solved" ? T.moss : status === "Unsolved" ? T.flag : T.brass;
  const bg  = status === "Solved" ? `${T.moss}22` : status === "Unsolved" ? `${T.flag}22` : `${T.brass}22`;
  const col = status === "Solved" ? T.moss : status === "Unsolved" ? T.flag : T.brassDeep;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 10px", border: `1px solid ${T.lineSoft}`, marginBottom: 3 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 4 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: T.navy }}>{name}</div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 1, lineHeight: 1.3 }}>{desc}</div>
      </div>
      <div style={{ fontFamily: mono, fontSize: 7, padding: "2px 5px", background: bg, color: col, flexShrink: 0, borderRadius: 2, marginTop: 1 }}>{status}</div>
    </div>
  );
}

function RevenueCard({ title, desc }) {
  return (
    <div style={{ padding: "9px 12px", border: `1px solid ${T.line}`, marginBottom: 5, background: T.cardAlt }}>
      <div style={{ fontFamily: display, fontSize: 12, fontWeight: 600, color: T.navy, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

function StepItem({ n, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", borderBottom: `1px solid ${T.lineSoft}` }}>
      <div style={{ width: 20, height: 20, background: T.navy, color: T.brassLight, fontFamily: mono, fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: "50%" }}>{n}</div>
      <div style={{ fontSize: 11, color: T.navy, lineHeight: 1.4, paddingTop: 2 }}>{children}</div>
    </div>
  );
}

function NigpStep({ n, name, desc }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "5px 8px", border: `1px solid ${T.lineSoft}`, marginBottom: 3, alignItems: "flex-start" }}>
      <div style={{ fontFamily: mono, fontSize: 7, color: T.brassDeep, background: `${T.brass}22`, padding: "2px 5px", borderRadius: 2, flexShrink: 0, marginTop: 1 }}>{n}</div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 500, color: T.navy }}>{name}</div>
        <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>{desc}</div>
      </div>
    </div>
  );
}

// FEATURE: ABT-1 — fallback rule for every live-read tile: a source that errored or hasn't resolved
// renders "—" (em dash), never a hardcoded number and never 0. LOG-36's revert was caused by a
// confident wrong "0"; "—" is honest, "0" is a lie.
const fmtStat = (v) => (v == null ? "—" : Number(v) >= 1000 ? Number(v).toLocaleString() : String(v));

// ── Tab content ─────────────────────────────────────────────────────────────────
function PurposeTab() {
  return (
    <>
      <SH mt={0}>The Problem: AI Amnesia and Prompt Inefficiency</SH>
      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: "0 0 10px" }}>
        Every enterprise AI deployment shares the same invisible failure mode: <strong style={{ fontWeight: 500 }}>the model forgets.</strong> AI Amnesia — the inability to carry institutional knowledge, reasoning history, and context forward — costs enterprises millions in redundant token spend while compounding value is left untouched. A Chief AI Officer reviewing AI spend sees it everywhere: identical context re-injected on every call, no learning retained, no value accumulating.
      </p>
      <LayerRow name="LLM"         desc="Base reasoning engine — the model itself"                          status="Solved"   />
      <LayerRow name="Prompt"      desc="The instruction given to the model at call time"                   status="Solved"   />
      <LayerRow name="Memory"      desc="What the agent retains and retrieves across sessions"              status="Unsolved" />
      <LayerRow name="Reasoning"   desc="How the agent approaches a problem — domain-tuned logic"          status="Unsolved" />
      <LayerRow name="Deliverable" desc="Structured, governed, auditable output"                           status="Partial"  />
      <p style={{ fontSize: 10, color: T.muted, lineHeight: 1.5, margin: "8px 0 0", fontStyle: "italic" }}>
        Memory and Reasoning are the unsolved layers — and the highest-value ones. DeepBench is architected to solve for all five.
      </p>

      <Divider />
      <SH>The Problem with Business AI Today</SH>
      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: "0 0 8px" }}>
        Most organizations treat AI as a productivity tool bolted onto existing workflows. Costs are invisible. Outputs aren't auditable. No one can explain which model ran, at what cost, with what knowledge, or whether the answer should be trusted.
      </p>
      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: 0 }}>
        Most AI platforms hand users a text box and call it an assistant. That's not useful to a procurement director who needs to know: <em>which agent handled this? what did it know? what was it told never to do? what did it cost?</em>
      </p>

      <Divider />
      <SH>The Vision</SH>
      <BulletItem><strong style={{ fontWeight: 500 }}>A name and a role</strong> — identity that humans can reason about</BulletItem>
      <BulletItem><strong style={{ fontWeight: 500 }}>A documented reasoning style</strong> — tone, decision patterns, behavioral profile</BulletItem>
      <BulletItem><strong style={{ fontWeight: 500 }}>A pragmatic, logic-first reasoning approach</strong> — structured thinking toward a defensible conclusion, not just retrieval</BulletItem>
      <BulletItem><strong style={{ fontWeight: 500 }}>Capabilities at measured depth</strong> — what it can do, and how well, on a 1–4 spectrum</BulletItem>
      <BulletItem><strong style={{ fontWeight: 500 }}>A knowledge base you own and train</strong> — your domain, your standards, your IP</BulletItem>
      <BulletItem><strong style={{ fontWeight: 500 }}>A cost model you control and audit</strong> — no invisible spend, no ungoverned calls</BulletItem>

      <Divider />
      <SH>Why I Built This</SH>
      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: "0 0 8px" }}>
        I wanted to build something that reflects how AI should actually be deployed — not as a novelty, but as a managed workforce with accountability at every layer. Agents that can be understood, audited, and trusted by people who are not engineers.
      </p>
      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: 0 }}>
        My ultimate goal: build an agent that approaches answers the way I do — same diagnostic process, same reasoning arc, same domain priorities — and at minimum delivers outputs equivalent to mine. Ultimately: faster and smarter than I could alone. If I had the strength of a company behind this, it would be in market today. This is the proof the bones are there.
      </p>
    </>
  );
}

// FEATURE: ABT-1 — from-scratch Architecture tab for a skeptical technical audience (chief
// architects, senior developers, senior product managers). Copy is canonical from the S-ABT-1a
// kickoff doc — do not paraphrase or retitle. Every number in the metric grid is read live on
// panel open (see the stats effect in AboutPanel below); the fallback for an unresolved source is
// "—", never a hardcoded value.
function ArchitectureTab({ displayVersion, stats }) {
  const isMobile = useIsMobile();
  const agents = useAgents();

  const tiles = [
    [String(displayVersion), "Live version"],
    [String(agents.length), "Agents on bench"],
    [fmtStat(stats.loggedCalls), "Logged AI calls"],
    [fmtStat(stats.patternsUsed), "AI patterns used"],
    [stats.schema ? `${fmtStat(stats.schema.table_count)} · ${fmtStat(stats.schema.column_count)}` : "—", "DB tables · columns"],
    [fmtStat(stats.schema?.rag_table_count), "RAG databases"],
    [fmtStat(stats.services), "Platform services"],
    [fmtStat(stats.platform?.lines_of_code), "Lines of code"],
    [fmtStat(stats.platform?.governance_docs), "Governance docs"],
    [fmtStat(stats.platform?.commits_dev), "Commits to dev"],
    [fmtStat(stats.platform?.dev_toolchain_services), "Dev toolchain services"],
  ];

  return (
    <>
      {/* 1 — Pitch block */}
      <div style={{ background: T.cardAlt, borderLeft: `3px solid ${T.brass}`, padding: "12px 14px", marginBottom: 4 }}>
        <div style={{ fontFamily: display, fontStyle: "italic", fontSize: 13, color: T.navy, lineHeight: 1.6 }}>
          An AI workforce platform where improving agent quality is a training operation, not a software release — the routing, attribution, and feedback loop are built into the data model itself.
        </div>
        <div style={{ fontFamily: mono, fontSize: 8, textTransform: "uppercase", letterSpacing: 1.5, color: T.brassDeep, marginTop: 8 }}>
          Your team, without the headcount
        </div>
      </div>

      {/* 2 — The name is the architecture */}
      <SH>The name is the architecture</SH>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 4 }}>
        <div style={{ background: T.navyMid, padding: "11px 13px", borderTop: `3px solid ${T.brass}` }}>
          <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: T.brassLight, letterSpacing: 1.5, marginBottom: 6 }}>DEEP</div>
          <div style={{ fontFamily: mono, fontSize: 9, color: T.navyTextHi, marginBottom: 3 }}>Competencies &amp; Services</div>
          <div style={{ fontSize: 9, color: T.navyTextLo, lineHeight: 1.4 }}>The engine that builds and trains expertise</div>
        </div>
        <div style={{ background: T.navyMid, padding: "11px 13px", borderTop: `3px solid ${T.moss}` }}>
          <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: T.mossLight, letterSpacing: 1.5, marginBottom: 6 }}>BENCH</div>
          <div style={{ fontFamily: mono, fontSize: 9, color: T.navyTextHi, marginBottom: 3 }}>Agents · Deliverables</div>
          <div style={{ fontSize: 9, color: T.navyTextLo, lineHeight: 1.4 }}>The workforce you deploy, the work it produces</div>
        </div>
      </div>

      {/* 3 — The platform stack */}
      <SH>The platform stack — 5 layers, 1 loop</SH>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ background: T.navy, padding: "10px 12px" }}>
            <div style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: T.brassLight }}>PRODUCT FOCUS AREAS</div>
            <div style={{ fontSize: 9, color: T.navyTextLo, marginTop: 4, lineHeight: 1.45 }}>Channel Intelligence · Project Management · Spend Analysis — the human-facing dashboards</div>
          </div>
          <div style={{ background: T.navyMid, padding: "10px 12px", flex: 1 }}>
            <div style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: T.brassLight, marginBottom: 8 }}>PLATFORM</div>
            {/* FEATURE: ABT-1 — Platform grid drops 2→1 column on mobile (STYLE-GUIDE §26) */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 6 }}>
              {[
                ["Data model",        "Competency · Library · Reasoning"],
                ["Platform services", "AI Audit · knowledge plumbing"],
                ["Scaffold",          "what an agent is given, once"],
                ["Harness",           "one agent's OS for one turn"],
              ].map(([name, sub]) => (
                <div key={name} style={{ background: T.navy, padding: "8px 10px" }}>
                  <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: T.navyTextHi }}>{name}</div>
                  <div style={{ fontSize: 9, color: T.navyTextLo, marginTop: 2, lineHeight: 1.35 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Right-side full-height LOOP column — same navy as the stack boxes (John's explicit call) */}
        <div style={{ background: T.navy, width: 34, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ color: T.brassLight, fontSize: 14, lineHeight: 1 }}>⟳</div>
          <div style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, color: T.brassLight, letterSpacing: 2, writingMode: "vertical-rl" }}>LOOP</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: T.muted, fontStyle: "italic", lineHeight: 1.5 }}>
        The Loop is cross-cutting: work repeats through Scaffold + Harness until a gate passes — stop, continue, or checkpoint.
      </div>

      {/* 4 — Is it actually agentic? */}
      <SH>Is it actually agentic? Check for yourself</SH>
      {[
        ["No agent's data ever names another agent", "Delegation is a tool call the model chooses to emit, with its reasoning logged — never a hardcoded route or a static capability-to-agent lookup. Enforced by an automated code check."],
        ["A real agent loop, serverless-safe", "Each turn ends three ways: stop (a gate passed), continue, or checkpoint — state persists to a durable store and a later invocation resumes exactly where it left off."],
        ["Guardrails enforced after generation", "Every capability declares must / must-not rules as data; a separate model call checks each output against them and records the verdict."],
        ["Humans gate consequential actions", "Actions flagged as consequential pause the loop for accept, reject, or edit — with an optional critique pass by a reviewing agent first."],
      ].map(([claim, how]) => (
        <div key={claim} style={{ display: "flex", gap: 9, padding: "7px 10px", border: `1px solid ${T.lineSoft}`, marginBottom: 4, alignItems: "flex-start" }}>
          <span style={{ color: T.moss, fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.navy, lineHeight: 1.4 }}>{claim}</div>
            <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.45, marginTop: 2 }}>{how}</div>
          </div>
        </div>
      ))}

      {/* 5 — Every call is on the record */}
      <SH>Every call is on the record</SH>
      <p style={{ fontSize: 11, color: T.navy, lineHeight: 1.6, margin: "0 0 10px" }}>
        One central activity log receives every AI call the platform makes — model, tokens, cost, latency, guardrail verdict, delegation reasoning. Every number below is read live when this panel opens; none is hand-maintained.
      </p>
      {/* FEATURE: ABT-1 — metric grid drops 3→2 columns on mobile (STYLE-GUIDE §26) */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 6 }}>
        {tiles.map(([n, l]) => (
          <div key={l} style={{ background: T.cardAlt, border: `1px solid ${T.line}`, padding: 7, textAlign: "center" }}>
            <div style={{ fontFamily: display, fontSize: 17, fontWeight: 600, color: T.brass }}>{n}</div>
            <div style={{ fontFamily: mono, fontSize: 7, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* 6 — Unusual in the industry */}
      <SH>Unusual in the industry</SH>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 6 }}>
        {[
          ["Training is the release cycle", "Agent quality improves by training data, not code deploys — the same model that governs the product governs its own intelligence."],
          ["Routing bans are structural", "\"No hardcoded agent routing\" isn't a style guide — it's an enforced platform rule with an automated check."],
          ["Patterns classified at read time", "Which AI pattern a call used is derived from its logged facts by versioned rules — never stamped as a label at write time."],
          ["Skills are the atomic unit", "Expertise lives as data — shareable, priceable, independently upgradable — not welded into any one agent."],
        ].map(([title, line]) => (
          <div key={title} style={{ padding: "8px 11px", border: `1px solid ${T.lineSoft}`, borderLeft: `3px solid ${T.brass}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.navy, marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.45 }}>{line}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function QuickStartTab() {
  return (
    <>
      <SH mt={0}>How to Build Your Bench</SH>
      <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "0 0 10px" }}>
        Configure your AI workforce — each agent is a named professional with a behavioral prompt, domain knowledge, output formats, and guardrails.
      </p>
      <StepItem n={1}>Go to <strong style={{ fontWeight: 500 }}>Bench</strong> → click <strong style={{ fontWeight: 500 }}>Add a Player</strong></StepItem>
      <StepItem n={2}>Fill in name, role, and agent code</StepItem>
      <StepItem n={3}>Personnel File → <strong style={{ fontWeight: 500 }}>Resume</strong> tab → write the behavioral prompt: tone, reasoning style, domain voice</StepItem>
      <StepItem n={4}><strong style={{ fontWeight: 500 }}>Training</strong> tab → upload PDFs, markdown files, or standards docs to build the domain knowledge base</StepItem>
      <StepItem n={5}><strong style={{ fontWeight: 500 }}>Playbook</strong> tab → set output formats and guardrails (always / never rules)</StepItem>
      <StepItem n={6}>Training tab → <strong style={{ fontWeight: 500 }}>Test Agent</strong> → run live scenarios, inspect assembled system prompt + RAG chunks + response</StepItem>

      <Divider />
      {/* FEATURE: WO-01 — S-RENAME-01 UI label rename */}
      <SH>How to Run a Work Order</SH>
      <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "0 0 10px" }}>
        Assign work to your bench — your planning agent breaks it into steps, assigns the right agent, and tracks execution.
      </p>
      <StepItem n={1}>Work dashboard → <strong style={{ fontWeight: 500 }}>Assign New Work</strong></StepItem>
      <StepItem n={2}>Describe the goal in plain language — what you need, what type of task</StepItem>
      <StepItem n={3}><strong style={{ fontWeight: 500 }}>Michelle</strong> (planning agent) generates a step plan and recommends the right agent</StepItem>
      <StepItem n={4}>Review steps · swap agents if needed · answer any clarifying questions</StepItem>
      <StepItem n={5}><strong style={{ fontWeight: 500 }}>Approve Steps &amp; Launch</strong> — task enters your active queue</StepItem>
      <StepItem n={6}>Monitor from Work dashboard · HITL steps pause for your review · results appear in task deliverables when complete</StepItem>
    </>
  );
}

function RevenueTab() {
  return (
    <>
      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: "0 0 12px" }}>
        The monetization model is baked into the architecture — not an afterthought. The unit of value is <strong style={{ fontWeight: 500 }}>Skill Profile depth</strong> — not the model, not the seat count. A deeply trained Skill Profile is proprietary IP — owned by the tenant, chargeable to others. Depth is measurable, transferable, and priceable.
      </p>
      <SH mt={0}>Revenue Streams</SH>
      <RevenueCard title="Capability Depth Pricing"    desc="Level 1 (general knowledge) costs less than Level 4 (proprietary, deeply trained). Every call priced against a depth tier. Deeper capability = more value delivered = higher price." />
      <RevenueCard title="Agent Seat Pricing"          desc="More capable agents sit in higher tiers. Organizations that invest in training own a compounding asset — not a subscription they restart from zero each year." />
      <RevenueCard title="Pre-Built Agent Packages"    desc="Curated agents with capability depth pre-assigned and behavioral prompts pre-configured. A 'Senior Procurement Analyst' out of the box — premium priced, no setup required." />
      <RevenueCard title="Build-Your-Own Agents"       desc="Tenants select capabilities, assign depth, configure prompts and guardrails. Their trained configuration is their IP — owned by them, not the platform." />
      <RevenueCard title="Agent Builder Marketplace"   desc="Any tenant who builds and trains a capable agent can publish it for others to use. The builder collects a revenue share — DeepBench takes a platform margin. Training effort becomes a passive revenue stream." />
      <RevenueCard title="API Margin"                  desc="For tenants not using BYOK, Roadmap Venture provides API access at a margin. Every AI call generates revenue — a direct line on top of capability pricing." />
      <Divider />
      <div style={{ background: `${T.brass}15`, border: `1px solid ${T.brass}40`, padding: "10px 12px" }}>
        <div style={{ fontFamily: mono, fontSize: 7, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>The Moat</div>
        <div style={{ fontSize: 11, color: T.navy, lineHeight: 1.5 }}>A deeply trained agent built over 12 months is not easily replaced. Switching cost is the compounding advantage — the more a tenant trains, the more they own, and the less they want to leave.</div>
      </div>
    </>
  );
}

function ShowcaseTab() {
  return (
    <>
      <SH mt={0}>NIGP Spend Analyzer — 1 min demo</SH>
      <div style={{ background: "#000", height: 185, width: "100%", marginBottom: 14, border: `1px solid ${T.line}`, overflow: "hidden" }}>
        <iframe
          src="https://www.youtube.com/embed/U7FXpun6Kxk?rel=0"
          title="NIGP Analyzer Demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        />
      </div>

      <SH>The NIGP Task</SH>
      <p style={{ fontSize: 11, color: T.navy, lineHeight: 1.6, margin: "0 0 10px" }}>
        NIGP is the classification standard used by thousands of US government agencies. DeepBench ships pre-loaded with <strong style={{ fontWeight: 500 }}>Austin TX FY2025 procurement spend — ~17,000 real line items.</strong> Every step below is run by the agent workforce, auditably, with full cost and latency logging.
      </p>
      <NigpStep n="01" name="Column Detection"          desc="Deterministic capability maps CSV columns to NIGP fields automatically" />
      <NigpStep n="02" name="NIGP Code Classification"  desc="Maps vendor line items to 5-digit commodity codes" />
      <NigpStep n="03" name="Spend Analysis"            desc="Breakdown by category, department, vendor, and timeline" />
      <NigpStep n="04" name="Vendor Concentration (HHI)"desc="Flags monopolistic or near-monopolistic vendor relationships" />
      <NigpStep n="05" name="Compliance Flags"          desc="Sole-source contracts, missing competition, unusual amounts" />
      <NigpStep n="06" name="Local Spend Analysis"      desc="Local vs. out-of-state vendor spend ratios" />
      <NigpStep n="07" name="Vendor Diversity"          desc="Market concentration scoring per spending category" />
      <NigpStep n="08" name="AI Review"                 desc="RAG-augmented briefing — citable, layered, auditable findings" />
      <NigpStep n="09" name="Downloadable Report"       desc="Structured output ready for a procurement board presentation" />
      <p style={{ fontSize: 10, color: T.muted, fontStyle: "italic", margin: "10px 0 0", lineHeight: 1.5 }}>
        Every step logs AI calls, token counts, cost, and latency to the AI Audit panel. Nothing is invisible.
      </p>
    </>
  );
}

function JohnTab() {
  return (
    <>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.navy, color: T.brassLight, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: display, fontSize: 16, fontWeight: 600, flexShrink: 0 }}>JL</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: display, fontSize: 17, fontWeight: 600, color: T.navy, marginBottom: 2 }}>John Leonard</div>
          <div style={{ fontSize: 10, color: T.muted, marginBottom: 6 }}>Product Leader · AI Systems Architect · Principal, Roadmap Venture</div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="https://www.roadmapventure.com" target="_blank" rel="noopener noreferrer" style={{ fontFamily: mono, fontSize: 8, color: T.brass, textDecoration: "none", borderBottom: `1px solid ${T.brass}55` }}>roadmapventure.com</a>
            <a href="https://www.linkedin.com/in/leonardjohn" target="_blank" rel="noopener noreferrer" style={{ fontFamily: mono, fontSize: 8, color: T.brass, textDecoration: "none", borderBottom: `1px solid ${T.brass}55` }}>linkedin.com/in/leonardjohn</a>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: 0 }}>
        I am not an engineer. Every line of code in this product was written through AI-assisted development — but every architecture decision, every design principle, every product priority, and every session rule was mine. DeepBench is the artifact that proves what a product leader can build when they combine deep domain knowledge, strong architectural thinking, and the discipline to apply both consistently.
      </p>

      <Divider />
      <SH>Background</SH>
      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: "0 0 8px" }}>
        I've spent my career at the intersection of enterprise technology, business strategy, and applied AI — with deep roots in government procurement intelligence. NIGP standards, vendor concentration risk, spend analysis, and compliance flags aren't features I designed abstractly — they're problems I've worked from the inside.
      </p>
      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: "0 0 8px" }}>
        Before DeepBench, I built the NIGP Analyzer — a standalone spend intelligence tool in production at nigp.roadmapventure.com — which proved the domain, the AI pipeline, and the architecture. DeepBench is the full platform built on those proven bones.
      </p>
      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: 0 }}>
        I've led product strategy and growth across enterprise software, procurement technology, and AI-driven platforms — spending the last several years focused on the question most organizations haven't answered: what does it actually mean to govern, audit, and trust AI at enterprise scale? I am open to the right opportunity where these skills can be applied at full force.
      </p>

      <Divider />
      <SH>Why This Exists</SH>
      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: "0 0 8px" }}>
        My ultimate goal is to see whether I can build an agent that approaches answers the way I do — same diagnostic process, same reasoning arc, same domain priorities — and at minimum delivers outputs equivalent to mine. Ultimately: faster and smarter than I could alone.
      </p>
      <p style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, margin: 0 }}>
        If I had the strength of a company behind this, it would be in market today. This is the proof that the bones are there — and that I know exactly what to build when the team arrives.
      </p>
    </>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────────
export default function AboutPanel({ onClose }) {
  const [tab, setTab] = useState("architecture");
  // FEATURE: SH-21 — mobile-responsive layout, gated by useIsMobile(); desktop path unchanged
  const isMobile = useIsMobile();
  // FEATURE: MOB-001 -- live version read from dev_version_counter (the same table every session
  // already claims a version from), replacing the hardcoded APP_VERSION as the source of truth.
  // Falls back to APP_VERSION (config.js) while this resolves or if the query errors -- never a
  // blank header. anon role confirmed SELECT-able on this table, no RLS (verified live this session).
  const [liveVersion, setLiveVersion] = useState(null);
  useEffect(() => {
    supabase.from("dev_version_counter").select("major,minor,patch").eq("id", 1).single()
      .then(({ data, error }) => { if (data && !error) setLiveVersion(`${data.major}.${data.minor}.${data.patch}`); });
  }, []);
  const displayVersion = liveVersion || APP_VERSION;

  // FEATURE: ABT-1 -- all Architecture metric-grid sources fetched in parallel on panel open.
  // A source that errors (or hasn't resolved yet) stays null and its tile renders "—" -- never a
  // hardcoded number, never 0 (LOG-36's revert was caused by a confident wrong "0"). Tile 4
  // ("AI patterns used") deliberately reads the same ai_pattern_classification_rollup view the AI
  // Audit panel's By Pattern section reads (fetchPatternClassification(), useAIActivity.js), so
  // the two screens cannot disagree.
  // DEVIATION from the S-ABT-1a kickoff's Task 3 snippet, measured live this session: a
  // count:'exact' query on the rollup view makes PostgREST evaluate the expensive view a second
  // time for the count and deterministically hits the anon statement timeout (Postgres 57014,
  // 3/3 attempts ~3.1s), so that wiring would have rendered "—" forever. The tile instead fetches
  // the view's pattern_slug rows (the same cheap shape fetchPatternClassification() uses, ~2.3s,
  // one row per classified pattern) and counts them client-side -- identical semantics, and still
  // structurally incapable of disagreeing with By Pattern, which counts the same fetched rows.
  const [stats, setStats] = useState({ loggedCalls: null, patternsUsed: null, services: null, schema: null, platform: null });
  useEffect(() => {
    Promise.all([
      // FEATURE: LOG-124 -- this tile only ever wanted a row count, and `head: true` returns no rows
      // either way, so naming one non-sensitive column is behaviourally identical. It exists solely
      // so the column-level revoke on caller_ip cannot 403 the About panel: `*` expands server-side
      // to every column, including the one being withdrawn.
      supabase.from("ai_activity_log").select("id", { count: "exact", head: true }),
      supabase.from("ai_pattern_classification_rollup").select("pattern_slug"),
      supabase.from("platform_services").select("*", { count: "exact", head: true }),
      supabase.rpc("platform_schema_stats").single(),
      supabase.from("platform_stats").select("*").eq("id", 1).single(),
    ]).then(([calls, rollup, services, schema, platform]) => {
      setStats({
        loggedCalls: calls.error ? null : calls.count,
        patternsUsed: rollup.error || !rollup.data ? null : rollup.data.length,
        services: services.error ? null : services.count,
        schema: schema.error ? null : schema.data,
        platform: platform.error ? null : platform.data,
      });
    });
  }, []);

  return (
    <>
      {/* Backdrop — unchanged */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(18,36,60,0.75)", backdropFilter: "blur(4px)", zIndex: 2000, animation: "hModalFadeIn 0.2s ease" }}
      />
      {/* Panel — FEATURE: SH-21 — width reuses STYLE-GUIDE.md §24's 82%/maxWidth:340 drawer convention on mobile */}
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: isMobile ? "82%" : "75vw", maxWidth: isMobile ? 340 : undefined, background: T.card, borderLeft: `2px solid ${T.brass}`, zIndex: 2001, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,.22)" }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg,${T.navy},${T.navyMid})`, padding: isMobile ? "11px 16px" : "13px 20px", borderBottom: `2px solid ${T.brass}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 8, color: T.brassLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>
                Portfolio · DeepBench v{displayVersion}
              </div>
              <div style={{ fontFamily: display, fontSize: isMobile ? 15 : 18, fontWeight: 600, color: T.card }}>About DeepBench</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,.2)", color: "rgba(255,255,255,.6)", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono }}
            >✕</button>
          </div>
        </div>

        {/* Tab bar — FEATURE: SH-21 — horizontal scroll on mobile instead of flex:1 squeeze.
            FEATURE: SH-21 — mobile scroll hint: fade gradient + chevron on the trailing edge,
            static (not scroll-position-aware), same treatment as MI-44's Work-dropdown arrow hint.
            FEATURE: ABT-1 — the bar stays and keeps rendering from TABS (John's explicit call),
            now showing the single Architecture tab. */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${T.line}`, background: T.cardAlt, overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch" }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: isMobile ? "0 0 auto" : 1, minWidth: 0,
                  padding: isMobile ? "9px 13px" : "9px 4px",
                  fontFamily: mono, fontSize: isMobile ? 9 : 8, textTransform: "uppercase", letterSpacing: 0.8,
                  border: "none", background: t.id === tab ? T.card : T.cardAlt,
                  cursor: "pointer", color: t.id === tab ? T.navy : T.muted,
                  fontWeight: t.id === tab ? 700 : 400,
                  borderBottom: `2px solid ${t.id === tab ? T.brass : "transparent"}`,
                  marginBottom: -1, whiteSpace: "nowrap",
                  overflow: isMobile ? "visible" : "hidden", textOverflow: isMobile ? "clip" : "ellipsis",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {isMobile && (
            <div style={{ position: "absolute", top: 0, bottom: 1, right: 0, width: 28, background: `linear-gradient(to right, transparent, ${T.cardAlt} 70%)`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 3, pointerEvents: "none" }}>
              <span style={{ fontFamily: mono, fontSize: 10, color: T.brass }}>›</span>
            </div>
          )}
        </div>

        {/* Content — FEATURE: ABT-1 — hidden tabs' render lines removed (their ids are unreachable
            from TABS); their component functions stay in-file above for one-line restoration. */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px 16px" : "16px 24px", minHeight: 0 }}>
          {tab === "architecture" && <ArchitectureTab displayVersion={displayVersion} stats={stats} />}
        </div>

      </div>
    </>
  );
}
