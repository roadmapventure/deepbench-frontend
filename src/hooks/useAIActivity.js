// DeepBench v5.1.30 | useAIActivity.js | AI-18 — agent-neutral capability descriptions
// FEATURE: AI-14 — useAIActivity — byLLM + byAgent aggregations, reinforcement type, future tracking types
// FEATURE: AI-16 — logAICall Supabase persistence
// Module-level AI call log. Any component calls logAICall() to record.
// AIActivityPanel reads the same store — no context provider needed.

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase.js';

// ── AI type catalog (PRD Section 9) ──────────────────────────────────────────
export const AI_TYPES = {
  rag_briefing:       { label:"RAG-Augmented Briefing",      desc:"Pulls agent role prompt + training docs, calls Claude to generate procurement briefing",                             model:"claude-haiku-4-5",      location:"AI Review tab",                  phase:1 },
  planning:           { label:"Task Planning Agent",          desc:"Decomposes goal into steps, suggests agents, generates clarifying questions",                                         model:"claude-haiku-4-5",      location:"Assign Work screen",             phase:1 },
  routing:            { label:"Agent Routing",                desc:"Classifies question against agent capabilities, suggests best-fit agent",                                             model:"claude-haiku-4-5",      location:"Chat panel",                     phase:1 },
  chat:               { label:"Chat / Consultative",          desc:"Agent answers in trained voice using RAG knowledge or Claude baseline",                                               model:"claude-haiku-4-5",      location:"Dashboard chat panel",           phase:1 },
  similarity:         { label:"Semantic Similarity Scoring",  desc:"Vector embedding similarity search for knowledge retrieval confidence (OpenAI)",                                     model:"text-embedding-3-small", location:"Chat + AI Review",               phase:1 },
  summarization:      { label:"Summarization / Synthesis",    desc:"Synthesizes Brent run history into training notes after each fetch",                                                 model:"claude-haiku-4-5",      location:"Post-fetch web-memory save",     phase:1 },
  react_loop:         { label:"ReAct Agent Loop",             desc:"Brent takes screenshot, reasons about next action, executes browser step, loops",                                    model:"claude-sonnet-4-5",     location:"Fetch screen",                   phase:1 },
  // FEATURE: AI-18 — agent-neutral descriptions
  extraction:         { label:"Document Extraction",          desc:"Extracts structured text from uploaded PDFs and documents before RAG ingest",                                        model:"claude-haiku-4-5",      location:"Teach Agent screen · Training tab", phase:1 },
  reinforcement:      { label:"Knowledge Reinforcement",      desc:"Embeds and writes knowledge entries to Supabase pgvector after document ingest or agent self-learning",              model:"claude-haiku-4-5",      location:"Training tab · Post-fetch self-learning", phase:1 },
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

// FEATURE: AI-16 — logAICall Supabase persistence
export function logAICall({ type, model, tokens = 0, latencyMs = 0, tier = null, location = null, agentId = null, taskId = null }) {
  const resolvedModel = model || AI_TYPES[type]?.model || "claude-haiku-4-5";
  const entry = {
    id:        Date.now() + Math.random(),
    type,
    model:     resolvedModel,
    tokens,
    latencyMs,
    tier,
    location:  location || AI_TYPES[type]?.location || "—",
    agentId,
    cost:      tokens > 0 ? (tokens / 1000) * (COST_PER_1K[resolvedModel] || COST_PER_1K["claude-haiku-4-5"]) : null,
    ts:        new Date().toISOString(),
  };
  _log = [entry, ..._log].slice(0, 500); // cap at 500
  notify();

  // Fire-and-forget Supabase write — failure must never throw or slow the caller
  supabase.from('ai_activity_log').insert({
    tenant_id:      'global',
    ai_type:        entry.type,
    feature:        entry.location,
    model:          entry.model,
    agent_id:       entry.agentId || null,
    task_id:        taskId || null,
    input_tokens:   entry.tokens || null,
    latency_ms:     entry.latencyMs || null,
    knowledge_tier: entry.tier || null,
    cost_usd:       entry.cost || null,
  }).then(({ error }) => {
    if (error) console.warn('[AI log] Supabase write failed:', error.message);
  });

  return entry;
}

// FEATURE: AI-16 — Hydrate in-memory store from Supabase on panel mount
export async function hydrateFromSupabase(tenantId = 'global') {
  const { data, error } = await supabase
    .from('ai_activity_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.warn('[AI log] Hydration failed:', error.message);
    return;
  }

  // Replace store entirely with DB state — DB is authoritative on every panel open
  _log = (data || []).map(row => ({
    id:        row.id,
    type:      row.ai_type,
    model:     row.model || 'claude-haiku-4-5',
    tokens:    row.input_tokens || 0,
    latencyMs: row.latency_ms || 0,
    tier:      row.knowledge_tier || null,
    location:  row.feature || '—',
    agentId:   row.agent_id || null,
    cost:      row.cost_usd ? parseFloat(row.cost_usd) : null,
    ts:        row.created_at,
    _fromDB:   true,
  }));
  notify();
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
