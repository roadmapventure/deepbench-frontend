// DeepBench v5.2.40 | AboutPanel.jsx | S-ABOUT-ARCH-01 Architecture tab refresh
// FEATURE: SH-05 — About panel replacing Help modal

import { useState } from "react";
import { T, display, body, mono } from "../tokens.js";
import { APP_VERSION } from "../config.js";

// ── Tab definitions ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "purpose",      label: "Purpose"      },
  { id: "architecture", label: "Architecture" },
  { id: "quickstart",   label: "Quick Start"  },
  { id: "revenue",      label: "Revenue"      },
  { id: "roadmap",      label: "Roadmap"      },
  { id: "showcase",     label: "Showcase"     },
  { id: "john",         label: "Who is John"  },
];

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

function BuzzRow({ term, desc, status }) {
  const isLive     = status === "✅ Live";
  const isDesigned = status === "🔶 Designed";
  const bg  = isLive ? `${T.moss}18` : isDesigned ? `${T.brass}15` : T.lineSoft;
  const col = isLive ? T.moss : isDesigned ? T.brassDeep : T.muted;
  return (
    <div style={{ display: "flex", gap: 8, padding: "5px 8px", border: `1px solid ${T.lineSoft}`, marginBottom: 3, alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: T.navy }}>{term}</div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 1, lineHeight: 1.3 }}>{desc}</div>
      </div>
      <div style={{ fontFamily: mono, fontSize: 7, color: col, background: bg, padding: "2px 5px", whiteSpace: "nowrap", flexShrink: 0, borderRadius: 2 }}>{status}</div>
    </div>
  );
}

function DecisionItem({ title, desc }) {
  return (
    <div style={{ padding: "7px 10px", border: `1px solid ${T.lineSoft}`, marginBottom: 5, borderLeft: `3px solid ${T.brass}` }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: T.navy, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

function AIStackDiagram() {
  return (
    <svg viewBox="0 0 520 292" style={{ width: "100%", display: "block", margin: "10px 0 14px" }} role="img">
      {/* Layer 6 — Governance */}
      <rect x={8} y={8} width={440} height={42} fill="#1e3556"/>
      <rect x={8} y={8} width={440} height={2} fill="#b6873a"/>
      <text x={20} y={23} fontFamily="monospace" fontSize={8} fontWeight="700" fill="#c4953e" letterSpacing="1.5">&#x2465;  GOVERNANCE LAYER  &#x25C0; DeepBench AI Audit</text>
      <text x={20} y={38} fontFamily="monospace" fontSize={9} fill="#b8c5d8">Audit  ·  Guardrails Enforcement  ·  Cost Controls  ·  Behavioral Prompts</text>

      {/* Layer 5 — Platform */}
      <rect x={8} y={56} width={440} height={42} fill="#1e3556"/>
      <rect x={8} y={56} width={440} height={2} fill="#b6873a"/>
      <text x={20} y={71} fontFamily="monospace" fontSize={8} fontWeight="700" fill="#c4953e" letterSpacing="1.5">&#x2464;  PLATFORM LAYER  &#x25C0; DeepBench agent workforce</text>
      <text x={20} y={86} fontFamily="monospace" fontSize={9} fill="#b8c5d8">Named Agents  ·  Skill Profiles  ·  Capabilities  ·  Orchestration  ·  HITL</text>

      {/* Layer 4 — Harness */}
      <rect x={8} y={104} width={440} height={42} fill="#1e3556"/>
      <rect x={8} y={104} width={440} height={2} fill="#b6873a"/>
      <text x={20} y={119} fontFamily="monospace" fontSize={8} fontWeight="700" fill="#c4953e" letterSpacing="1.5">&#x2463;  HARNESS LAYER  &#x25C0; DeepBench Prompt Service</text>
      <text x={20} y={134} fontFamily="monospace" fontSize={9} fill="#b8c5d8">DB Assembly  ·  AI Enrichment  ·  Grounding  ·  Context Assembly</text>

      {/* Layer 3 — Patterns */}
      <rect x={8} y={152} width={440} height={42} fill="#162840"/>
      <text x={20} y={167} fontFamily="monospace" fontSize={8} fontWeight="700" fill="#4a6278" letterSpacing="1.5">&#x2462;  PATTERN LAYER</text>
      <text x={20} y={182} fontFamily="monospace" fontSize={9} fill="#3d5060">RAG  ·  ReAct  ·  Prompt Chaining  ·  Reflection  ·  Streaming  ·  Tool Use</text>

      {/* Layer 2 — Tooling */}
      <rect x={8} y={200} width={440} height={42} fill="#162840"/>
      <text x={20} y={215} fontFamily="monospace" fontSize={8} fontWeight="700" fill="#4a6278" letterSpacing="1.5">&#x2461;  TOOLING LAYER</text>
      <text x={20} y={230} fontFamily="monospace" fontSize={9} fill="#3d5060">Function Calling  ·  MCP  ·  Browser Automation  ·  External APIs</text>

      {/* Layer 1 — Foundation */}
      <rect x={8} y={248} width={440} height={42} fill="#162840"/>
      <text x={20} y={263} fontFamily="monospace" fontSize={8} fontWeight="700" fill="#4a6278" letterSpacing="1.5">&#x2460;  FOUNDATION LAYER</text>
      <text x={20} y={278} fontFamily="monospace" fontSize={9} fill="#3d5060">Models (Claude · GPT-4)  ·  Embeddings  ·  pgvector</text>

      {/* DeepBench bracket — layers 4–6, y=8 to y=146 */}
      <line x1={456} y1={8} x2={456} y2={146} stroke="#b6873a" strokeWidth={2}/>
      <line x1={456} y1={8} x2={462} y2={8} stroke="#b6873a" strokeWidth={2}/>
      <line x1={456} y1={146} x2={462} y2={146} stroke="#b6873a" strokeWidth={2}/>
      <text x={474} y={77} fontFamily="monospace" fontSize={7} fontWeight="700" fill="#b6873a"
        transform="rotate(-90, 474, 77)" textAnchor="middle" letterSpacing="2">DEEPBENCH</text>

      {/* Infrastructure label */}
      <text x={474} y={221} fontFamily="monospace" fontSize={7} fill="#2d4050"
        transform="rotate(-90, 474, 221)" textAnchor="middle" letterSpacing="1.5">INFRASTRUCTURE</text>
    </svg>
  );
}

function GlossaryRow({ term, definition }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: `1px solid ${T.lineSoft}` }}>
      <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: T.navy, width: 120, flexShrink: 0 }}>{term}</div>
      <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.45, flex: 1 }}>{definition}</div>
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

function ArchitectureTab() {
  return (
    <>
      <SH mt={0}>The DEEP / BENCH Model</SH>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div style={{ background: "#1a2e4a", padding: "11px 13px", borderTop: `3px solid ${T.brass}` }}>
          <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: T.brassLight, letterSpacing: 1.5, marginBottom: 8 }}>DEEP</div>
          <div style={{ fontFamily: mono, fontSize: 9, color: "#8fa3bf", marginBottom: 4 }}>① Services</div>
          <div style={{ fontFamily: mono, fontSize: 9, color: "#8fa3bf", marginBottom: 4 }}>② Skills</div>
          <div style={{ fontFamily: mono, fontSize: 9, color: "#8fa3bf" }}>③ Capabilities</div>
          <div style={{ fontSize: 9, color: T.muted, marginTop: 8, lineHeight: 1.4 }}>The engine — builds and trains expertise</div>
        </div>
        <div style={{ background: "#1a2e4a", padding: "11px 13px", borderTop: `3px solid ${T.moss}` }}>
          <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: "#7ec8a0", letterSpacing: 1.5, marginBottom: 8 }}>BENCH</div>
          <div style={{ fontFamily: mono, fontSize: 9, color: "#8fa3bf", marginBottom: 4 }}>④ Agents</div>
          <div style={{ fontFamily: mono, fontSize: 9, color: "#8fa3bf" }}>⑤ Deliverables</div>
          <div style={{ fontSize: 9, color: T.muted, marginTop: 8, lineHeight: 1.4 }}>The workforce — deployed and producing</div>
        </div>
      </div>
      <p style={{ fontSize: 11, color: T.navy, lineHeight: 1.6, margin: "0 0 12px" }}>
        <strong style={{ fontWeight: 500 }}>Skills are the atomic unit.</strong> Skill Profiles — configured instances of a Skill — are independent of agents. An agent is authorized to use a Skill Profile at a specific depth; it does not own it. The same Skill Profile can be shared, upgraded, and priced independently of any individual agent.
      </p>

      <SH>Platform Architecture</SH>
      <div style={{ background: "#1a2e4a", padding: "11px 13px", fontFamily: mono, fontSize: 9, lineHeight: 1.7, marginBottom: 10, borderRadius: 2 }}>
        <div style={{ color: T.brassLight }}>Layer 4 — Platform Services &nbsp;&nbsp;&nbsp;Auth · Multi-tenancy · Security</div>
        <div style={{ color: "#8fa3bf" }}>Layer 2 — Product Modules &nbsp;&nbsp;&nbsp;&nbsp;Work Dashboard · Bench Dashboard</div>
        <div style={{ color: "#8fa3bf" }}>Layer 3 — Capability Services &nbsp;Planning · RAG · Chat · Analysis · Web…</div>
        <div style={{ color: "#8fa3bf" }}>Layer 1 — Shared Foundation &nbsp;&nbsp;&nbsp;Tokens · Agents · Supabase · Config</div>
      </div>
      <AIStackDiagram />
      <SH>AI Industry Glossary</SH>
      <GlossaryRow term="Platform"       definition="Infrastructure that wraps LLMs — handles routing, memory, governance, and output. DeepBench is a platform, not a model." />
      <GlossaryRow term="Pattern"        definition="A reusable AI architectural approach: RAG, ReAct, Prompt Chaining, etc. Patterns are how you use models, not which model." />
      <GlossaryRow term="Loop"           definition="The agent execution cycle: Perceive → Reason → Act → Observe → Repeat. Brent's ReAct loop is the live example." />
      <GlossaryRow term="Harness"        definition="Scaffolding around an LLM call: prompt assembly, tool definitions, response parsing, error handling. DeepBench's Prompt Service is a harness." />
      <GlossaryRow term="Grounding"      definition="Connecting a model to factual, domain-specific knowledge at call time — what RAG does. Without grounding, models hallucinate on domain questions." />
      <GlossaryRow term="Governance"     definition="Audit trails, guardrails, cost controls, and accountability over AI decisions. The 'can we trust this output?' layer." />
      <GlossaryRow term="Tooling"        definition="External capabilities an agent can invoke mid-reasoning — web search, database queries, APIs. Claude's tool use schema is the mechanism." />
      <GlossaryRow term="Orchestration"  definition="One agent coordinating other agents — delegating subtasks and synthesizing results. Michelle delegating to Brent is the live example." />
      <GlossaryRow term="Context Window" definition="How much text a model can process in one call. Prompt engineering is largely the art of fitting the right information into this space efficiently." />
      <GlossaryRow term="Embeddings"     definition="Vector representations of text for semantic search. The foundation of RAG — find knowledge chunks closest in meaning to the query." />
      <GlossaryRow term="Chain"          definition="Sequential prompts where output of one feeds as input to the next. DeepBench's Prompt Service pipeline (DB Assembly → AI Enrichment → Request) is a chain." />
      <GlossaryRow term="HITL"           definition="Human-in-the-Loop — agent pauses at a defined step gate and waits for human review before continuing." />

      <Divider />
      <SH>By the Numbers</SH>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 12 }}>
        {[["40","Source files"],["~19,000","Lines of code"],["12","API routes"],["11","DB tables"],["23","Arch docs"],["61","Session specs"],["20","AI Patterns"],["19","AI Services"],["13","Bench agents"]].map(([n, l]) => (
          <div key={l} style={{ background: T.cardAlt, border: `1px solid ${T.line}`, padding: 7, textAlign: "center" }}>
            <div style={{ fontFamily: display, fontSize: 17, fontWeight: 600, color: T.brass }}>{n}</div>
            <div style={{ fontFamily: mono, fontSize: 7, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: T.navy, lineHeight: 1.5, marginBottom: 3 }}><strong style={{ fontWeight: 500 }}>Frontend:</strong> React 18 + Vite · React Router 6 · Recharts · PapaParse · PDF-parse</div>
      <div style={{ fontSize: 10, color: T.navy, lineHeight: 1.5, marginBottom: 3 }}><strong style={{ fontWeight: 500 }}>API:</strong> 12 Vercel serverless routes — task planning, RAG query, doc extraction + ingestion, agent configs, self-learning write-back, Prompt Service (DB Assembly · AI Enrichment · Request &amp; Receivable) · Railway (Node.js + Playwright) for browser automation only</div>
      <div style={{ fontSize: 10, color: T.navy, lineHeight: 1.5, marginBottom: 3 }}><strong style={{ fontWeight: 500 }}>Database:</strong> Supabase Postgres + pgvector · 11 tables · tenant_id on every table · Storage bucket for CSV · tasks (16 cols) · skill_profiles (21) · deliverables (21) · ai_activity_log (13) · agent_configs (10) · agents (8) · capabilities (7) · capability_skill_profiles (7) · agent_capability_assignments (5) · knowledge_entries · agent_run_log</div>
      <div style={{ fontSize: 10, color: T.navy, lineHeight: 1.5 }}><strong style={{ fontWeight: 500 }}>AI:</strong> Anthropic claude-haiku-4-5-20251001 (routing, classification, reflection, guardrails) · claude-sonnet-4-6 (planning, enrichment, ReAct loops) · OpenAI text-embedding-3-small (RAG embeddings)</div>

      <Divider />
      <SH>AI Capability Status</SH>
      <BuzzRow term="RAG + Vector Embeddings"             desc="pgvector · Supabase · OpenAI text-embedding-3-small — live at query time"      status="✅ Live"     />
      <BuzzRow term="ReAct Agent Loop"                    desc="Brent — Railway/Playwright — reason + act + observe cycles"                     status="✅ Live"     />
      <BuzzRow term="Guardrails"                          desc="Per-agent always/never rules in Supabase + post-generation Haiku enforcement check in Request & Receivable"  status="✅ Live"     />
      <BuzzRow term="AI Cost Audit"                       desc="Per-call: model, tokens, cost, latency → Supabase ai_activity_log"             status="✅ Live"     />
      <BuzzRow term="Self-Learning / Knowledge Reinforcement" desc="Brent writes back fetch results as training entries automatically"          status="✅ Live"     />
      <BuzzRow term="Structured Tool Use"                 desc="Claude tool use everywhere — no free-text JSON parsing anywhere"                status="✅ Live"     />
      <BuzzRow term="Prompt Caching"                      desc="Anthropic caching on system prompts — up to 90% cost reduction"                status="✅ Live"     />
      <BuzzRow term="Prompt Service Pipeline"   desc="DB Assembly → AI Enrichment → Request & Receivable — full 3-stage prompt construction pipeline"  status="✅ Live" />
      <BuzzRow term="Reflection"                desc="Dan Bingham (PS-01) self-review pass — Haiku critiques assembled prompt before synthesis"           status="✅ Live" />
      <BuzzRow term="Per-Agent Behavioral Prompts"        desc="Personality, tone, reasoning style stored in Supabase — not in code"           status="✅ Live"     />
      <BuzzRow term="Capability Depth Spectrum"           desc="4-level model — General → Trained → Expert → Proprietary"                      status="🔶 Designed" />
      <BuzzRow term="HITL (Human-in-the-Loop)"            desc="Step execution gates — agent pauses for human review"                          status="🔶 Designed" />
      <BuzzRow term="BYOK + Per-Agent LLM"                desc="Tenant API keys, per-agent model assignment"                                   status="🔶 Later"    />
      <BuzzRow term="Multi-tenancy"                       desc="tenant_id on every table · Clerk auth stub in place"                           status="🔶 Later"    />

      <Divider />
      <SH>My Product Architectural Decisions</SH>
      <DecisionItem title="Skills are the atomic unit — independent of agents"   desc="The single most important call. Skill Profiles are not hardwired to agents — they are configurable instances that can be shared, priced, and exposed via MCP independently of any individual agent." />
      <DecisionItem title="No AI logic inside React components"      desc="Every AI call lives in a serverless route named for the capability. Prevents agent-specific tangle; enables independent pricing and reuse." />
      <DecisionItem title="Supabase as behavioral prompt storage"    desc="Agent prompts live in a database, not code. Versioned, auditable, tenant-scoped. No deployment needed to change agent behavior." />
      <DecisionItem title="tenant_id on every table from day one"    desc="Multi-tenancy stubs in place with one tenant today. Adding Clerk in v6 is a wrapping layer — not a schema rewrite." />
      <DecisionItem title="Treasury design system from day one"      desc="Single tokens.js — every color, font, and spacing value. Zero hardcoded hex in the codebase. The V1 call most solo builders skip." />
      <DecisionItem title="17 written session specs before any code" desc="Each kickoff doc covers scope, constraints, data contracts, and QA checklist. What keeps 20,000 lines coherent across 50+ sessions." />
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

function RoadmapTab() {
  const accentColor = (label) => {
    if (label.startsWith("Now"))   return T.moss;
    if (label.startsWith("Next"))  return T.brass;
    return T.muted;
  };
  const cols = [
    { label: "Now · v5.x",  sub: "POC coded · porting", items: ["Capability Registry", "Live Step Execution", "Test Team", "Auto-Training Service"] },
    { label: "Next · v6.x", sub: "",                     items: ["Multi-tenancy + Clerk Auth", "Agent Marketplace"] },
    { label: "Later · v7.x",sub: "",                     items: ["BYOK + Per-Agent LLM", "MCP — Agent Integration"] },
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {cols.map(c => (
          <div key={c.label} style={{ background: T.cardAlt, border: `1px solid ${T.line}`, borderTop: `3px solid ${accentColor(c.label)}`, padding: 11 }}>
            <div style={{ fontFamily: mono, fontSize: 8, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, color: accentColor(c.label), marginBottom: 4 }}>{c.label}</div>
            {c.sub && <div style={{ fontFamily: mono, fontSize: 7, color: T.muted, marginBottom: 8 }}>{c.sub}</div>}
            {c.items.map(i => <div key={i} style={{ fontSize: 9, color: T.navy, padding: "4px 6px", border: `1px solid ${T.lineSoft}`, marginBottom: 3, background: T.card, lineHeight: 1.3 }}>{i}</div>)}
          </div>
        ))}
      </div>

      <SH>Skills — The Heart of the Platform</SH>
      <p style={{ fontSize: 11, color: T.navy, lineHeight: 1.6, margin: "0 0 8px" }}>
        Skills are the atomic unit of DeepBench. Five types — Identity, Behavior, Knowledge, Intent, Format — are configured into Skill Profiles: proprietary, measurable, deployable instances that agents hold Seniority in at specific depth levels (1–4). Skills combine into Capabilities, which assemble into Agents. Every level is independently configurable, priceable, and MCP-accessible. This is what makes the marketplace, depth pricing, and measurable output quality possible.
      </p>
      <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.5, padding: "8px 10px", border: `1px solid ${T.lineSoft}`, background: T.cardAlt }}>
        Phase 1: Task Planning · Title Generation · Agent Routing · RAG Query · Chat Response · Data Analysis · Document Extraction · Web Research (ReAct) · Knowledge Reinforcement · Capability Audit · Procurement Flags · Vendor Concentration · Column Detection / NIGP Lookup · Identity / Persona Replication
      </div>

      <SH>MCP — Agent Integration (v7.x)</SH>
      <p style={{ fontSize: 11, color: T.navy, lineHeight: 1.6, margin: 0 }}>
        Model Context Protocol support: expose DeepBench agents and capability services as MCP servers callable by external AI tools, IDEs, and orchestrators. A DeepBench-trained procurement agent becomes callable from Claude Desktop, Cursor, or any MCP-compatible environment — a distribution channel that doesn't require the DeepBench UI at all.
      </p>
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
  const [tab, setTab] = useState("purpose");

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(18,36,60,0.75)", backdropFilter: "blur(4px)", zIndex: 2000, animation: "hModalFadeIn 0.2s ease" }}
      />
      {/* Panel */}
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "75vw", background: T.card, borderLeft: `2px solid ${T.brass}`, zIndex: 2001, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,.22)" }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg,${T.navy},${T.navyMid})`, padding: "13px 20px", borderBottom: `2px solid ${T.brass}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 8, color: T.brassLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>
                Portfolio · DeepBench v{APP_VERSION}
              </div>
              <div style={{ fontFamily: display, fontSize: 18, fontWeight: 600, color: T.card }}>About DeepBench</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,.2)", color: "rgba(255,255,255,.6)", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono }}
            >✕</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.line}`, flexShrink: 0, background: T.cardAlt }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, minWidth: 0, padding: "9px 4px",
                fontFamily: mono, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.8,
                border: "none", background: t.id === tab ? T.card : T.cardAlt,
                cursor: "pointer", color: t.id === tab ? T.navy : T.muted,
                fontWeight: t.id === tab ? 700 : 400,
                borderBottom: `2px solid ${t.id === tab ? T.brass : "transparent"}`,
                marginBottom: -1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", minHeight: 0 }}>
          {tab === "purpose"      && <PurposeTab />}
          {tab === "architecture" && <ArchitectureTab />}
          {tab === "quickstart"   && <QuickStartTab />}
          {tab === "revenue"      && <RevenueTab />}
          {tab === "roadmap"      && <RoadmapTab />}
          {tab === "showcase"     && <ShowcaseTab />}
          {tab === "john"         && <JohnTab />}
        </div>

      </div>
    </>
  );
}
