// DeepBench v5.1.0 | useAIActivity.js | AI call log — module-level store for AIActivityPanel
// src/hooks/useAIActivity.js — v5.0.0
// Module-level AI call log. Any component calls logAICall() to record.
// AIActivityPanel reads the same store — no context provider needed.

import { useState, useEffect } from "react";

// ── AI type catalog (PRD Section 9) ──────────────────────────────────────────
export const AI_TYPES = {
  rag_briefing:    { label:"RAG-Augmented Briefing",      desc:"Pulls agent role prompt + training docs, calls Claude to generate procurement briefing",  model:"claude-haiku-4-5",   location:"AI Review tab",              phase:1 },
  planning:        { label:"Task Planning Agent",          desc:"Decomposes goal into steps, suggests agents, generates clarifying questions",              model:"claude-haiku-4-5",   location:"Assign Work screen",         phase:1 },
  routing:         { label:"Agent Routing",                desc:"Classifies question against agent capabilities, suggests best-fit agent",                  model:"claude-haiku-4-5",   location:"Chat panel",                 phase:1 },
  chat:            { label:"Chat / Consultative",          desc:"Agent answers in trained voice using RAG knowledge or Claude baseline",                    model:"claude-haiku-4-5",   location:"Dashboard chat panel",       phase:1 },
  similarity:      { label:"Semantic Similarity Scoring",  desc:"Vector embedding similarity search for knowledge retrieval confidence (OpenAI)",           model:"text-embedding-3-small", location:"Chat + AI Review",        phase:1 },
  summarization:   { label:"Summarization / Synthesis",    desc:"Synthesizes Brent run history into training notes after each fetch",                       model:"claude-haiku-4-5",   location:"Post-fetch web-memory save", phase:1 },
  react_loop:      { label:"ReAct Agent Loop",             desc:"Brent takes screenshot, reasons about next action, executes browser step, loops",          model:"claude-sonnet-4-5",  location:"Fetch screen",               phase:1 },
  extraction:      { label:"Document Extraction",          desc:"Extracts structured text from uploaded PDFs before RAG ingest",                            model:"claude-haiku-4-5",   location:"Teach Agent screen",         phase:1 },
  anomaly:         { label:"Anomaly Detection",            desc:"LLM-based spend anomaly detection beyond deterministic flags",                             model:"TBD",                location:"Flags engine (planned)",     phase:2 },
  prompt_optim:    { label:"Prompt Optimization Agent",    desc:"Reviews role prompts and suggests improvements based on output quality",                   model:"TBD",                location:"Personnel > Resume (planned)",phase:2 },
  perf_scoring:    { label:"Agent Performance Scoring",    desc:"Routes tasks based on historical completion speed and quality metrics",                    model:"TBD",                location:"Assign Work (planned)",      phase:2 },
};

// Cost estimates per 1K tokens
const COST_PER_1K = { "claude-haiku-4-5":0.00025, "claude-sonnet-4-5":0.003, "text-embedding-3-small":0.00002 };

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
    const last30  = entries.filter(e => Date.now() - new Date(e.ts) < 30*24*3600*1000);
    const cost    = entries.reduce((s,e) => s + (e.cost||0), 0);
    const latencies = entries.filter(e=>e.latencyMs).map(e=>e.latencyMs);
    byType[type] = {
      ...AI_TYPES[type],
      type,
      total:    entries.length,
      last30:   last30.length,
      cost,
      avgLatency: latencies.length ? Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length) : null,
      entries,
    };
  }

  const totalCost = log.reduce((s,e)=>s+(e.cost||0),0);
  const totalCalls = log.length;

  return { log, byType, totalCost, totalCalls, clearAILog };
}
