// DeepBench v5.1.18 | useAIActivity.js | AI call log — module-level store for AIActivityPanel
// FEATURE: AI-14 — useAIActivity — byLLM + byAgent aggregations, reinforcement type, future tracking types
// Module-level AI call log. Any component calls logAICall() to record.
// AIActivityPanel reads the same store — no context provider needed.

import { useState, useEffect } from "react";

// ── AI type catalog (PRD Section 9) ──────────────────────────────────────────
export const AI_TYPES = {
  rag_briefing:       { label:"RAG-Augmented Briefing",      desc:"Pulls agent role prompt + training docs, calls Claude to generate procurement briefing",                             model:"claude-haiku-4-5",      location:"AI Review tab",                  phase:1 },
  planning:           { label:"Task Planning Agent",          desc:"Decomposes goal into steps, suggests agents, generates clarifying questions",                                         model:"claude-haiku-4-5",      location:"Assign Work screen",             phase:1 },
  routing:            { label:"Agent Routing",                desc:"Classifies question against agent capabilities, suggests best-fit agent",                                             model:"claude-haiku-4-5",      location:"Chat panel",                     phase:1 },
  chat:               { label:"Chat / Consultative",          desc:"Agent answers in trained voice using RAG knowledge or Claude baseline",                                               model:"claude-haiku-4-5",      location:"Dashboard chat panel",           phase:1 },
  similarity:         { label:"Semantic Similarity Scoring",  desc:"Vector embedding similarity search for knowledge retrieval confidence (OpenAI)",                                     model:"text-embedding-3-small", location:"Chat + AI Review",               phase:1 },
  summarization:      { label:"Summarization / Synthesis",    desc:"Synthesizes Brent run history into training notes after each fetch",                                                 model:"claude-haiku-4-5",      location:"Post-fetch web-memory save",     phase:1 },
  react_loop:         { label:"ReAct Agent Loop",             desc:"Brent takes screenshot, reasons about next action, executes browser step, loops",                                    model:"claude-sonnet-4-5",     location:"Fetch screen",                   phase:1 },
  extraction:         { label:"Document Extraction",          desc:"Extracts structured text from uploaded PDFs before RAG ingest",                                                      model:"claude-haiku-4-5",      location:"Teach Agent screen",             phase:1 },
  reinforcement:      { label:"Knowledge Reinforcement",      desc:"Brent synthesizes run output into structured embeddings written back to Supabase knowledge base",                    model:"claude-haiku-4-5",      location:"Post-fetch self-learning loop",  phase:1 },
  agent_perf_score:   { label:"Agent Performance Score",      desc:"Quality metric per agent — accuracy, completeness, citation rate across completed tasks",                            model:"TBD",                   location:"Planned",                        phase:2 },
  prompt_versioning:  { label:"Prompt Version Tracking",      desc:"Records which prompt version was active at call time for regression analysis",                                       model:"TBD",                   location:"Planned",                        phase:2 },
  cost_anomaly:       { label:"Cost Anomaly Detection",       desc:"Flags sessions where cost spikes above rolling average — triggers review",                                           model:"TBD",                   location:"Planned",                        phase:2 },
  hitl_review_rate:   { label:"Human Review Rate",            desc:"% of HITL steps that required an override — tracks agent autonomy over time",                                        model:"TBD",                   location:"Planned",                        phase:2 },
};

// Cost estimates per 1K tokens
const COST_PER_1K = { "claude-haiku-4-5":0.00025, "claude-sonnet-4-5":0.003, "text-embedding-3-small":0.00002 };

const MODEL_PROVIDER = {
  "claude-haiku-4-5":       "Anthropic",
  "claude-sonnet-4-5":      "Anthropic",
  "text-embedding-3-small": "OpenAI",
};

// ── Module-level store ────────────────────────────────────────────────────────
let _log    = [];
let _listeners = [];

const notify = () => _listeners.forEach(fn => fn([..._log]));

export function logAICall({ type, model, tokens = 0, latencyMs = 0, tier = null, location = null, agentId = null }) {
  const entry = {
    id:        Date.now() + Math.random(),
    type,
    model:     model || AI_TYPES[type]?.model || "claude-haiku-4-5",
    tokens,
    latencyMs,
    tier,
    location:  location || AI_TYPES[type]?.location || "—",
    agentId,
    cost:      tokens > 0 ? (tokens / 1000) * (COST_PER_1K[model] || COST_PER_1K["claude-haiku-4-5"]) : null,
    ts:        new Date().toISOString(),
  };
  _log = [entry, ..._log].slice(0, 500); // cap at 500
  notify();
  return entry;
}

export function clearAILog() { _log = []; notify(); }

export function useAIActivity() {
  const [log, setLog] = useState([..._log]);
  useEffect(() => {
    _listeners.push(setLog);
    return () => { _listeners = _listeners.filter(fn => fn !== setLog); };
  }, []);

  // Aggregate by type
  const byType = {};
  for (const type of Object.keys(AI_TYPES)) {
    const entries = log.filter(e => e.type === type);
    const cost    = entries.reduce((s,e) => s + (e.cost||0), 0);
    const latencies = entries.filter(e=>e.latencyMs).map(e=>e.latencyMs);
    byType[type] = {
      ...AI_TYPES[type],
      type,
      total:    entries.length,
      cost,
      avgLatency: latencies.length ? Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length) : null,
      entries,
    };
  }

  // Aggregate by LLM model
  const byLLM = {};
  for (const e of log) {
    const m = e.model || "unknown";
    if (!byLLM[m]) byLLM[m] = { model: m, calls: 0, cost: 0, tokensIn: 0, latencies: [] };
    byLLM[m].calls++;
    byLLM[m].cost += e.cost || 0;
    byLLM[m].tokensIn += e.tokens || 0;
    if (e.latencyMs) byLLM[m].latencies.push(e.latencyMs);
  }
  Object.values(byLLM).forEach(d => {
    d.avgLatency = d.latencies.length ? Math.round(d.latencies.reduce((a,b)=>a+b,0)/d.latencies.length) : null;
  });

  // Aggregate by agent
  const byAgent = {};
  for (const e of log) {
    if (!e.agentId) continue;
    if (!byAgent[e.agentId]) byAgent[e.agentId] = { agentId: e.agentId, calls: 0, cost: 0, latencies: [] };
    byAgent[e.agentId].calls++;
    byAgent[e.agentId].cost += e.cost || 0;
    if (e.latencyMs) byAgent[e.agentId].latencies.push(e.latencyMs);
  }
  Object.values(byAgent).forEach(d => {
    d.avgLatency = d.latencies.length ? Math.round(d.latencies.reduce((a,b)=>a+b,0)/d.latencies.length) : null;
  });

  const modelsInUse = Object.values(byLLM).filter(d => d.calls > 0).length;
  const totalCost = log.reduce((s,e)=>s+(e.cost||0),0);
  const totalCalls = log.length;

  return { log, byType, byLLM, byAgent, modelsInUse, totalCost, totalCalls };
}

export { MODEL_PROVIDER };
