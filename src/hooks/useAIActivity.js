// DeepBench v5.2.35 | useAIActivity.js | BUG-17 add Reflection to ai-enrichment SERVICE_CATALOG
// FEATURE: AI-14 — useAIActivity — byLLM + byAgent aggregations, reinforcement type, future tracking types
// FEATURE: AI-16 — logAICall Supabase persistence
// Module-level AI call log. Any component calls logAICall() to record.
// AIActivityPanel reads the same store — no context provider needed.

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase.js';

// FEATURE: AI-23 — AI Services catalog (14 services, client-side until S-INFRA-01 creates ai_services table)
export const SERVICE_CATALOG = [
  { slug: 'prompt-assembly',         name: 'Prompt Assembly',          serviceType: 'hybrid', patterns: ['Prompt Chaining','RAG'],                                      roadmap: 'next' },
  // FEATURE: AA-43 — ai-enrichment service catalog entry (logAICall wired in S-PM-04)
  // FEATURE: BUG-17 — Reflection is live (BUG-15 active:true); surface it in AI Audit By Service view
  { slug: 'ai-enrichment',           name: 'AI Enrichment',            serviceType: 'hybrid', patterns: ['RAG','Prompt Chaining','Reflection'],                                roadmap: 'next' },
  // FEATURE: AA-44 — request-receivable SERVICE_CATALOG entry
  { slug: 'request-receivable',      name: 'Request & Receivable',     serviceType: 'ai',     patterns: ['Structured Output','Tool Use','Streaming','Prompt Chaining','Guardrails / Output Filtering'], roadmap: 'next' },
  // FEATURE: AW-27 — goal suggestion: streaming Haiku + RAG
  { slug: 'goal-suggestion',         name: 'Goal Suggestion',          serviceType: 'ai',     patterns: ['Streaming', 'RAG'],                                                                           roadmap: 'now'  },
  // FEATURE: AW-28 — preview-prompt: DB Assembly + AI Enrichment without LLM call
  { slug: 'preview-prompt',          name: 'Prompt Preview',           serviceType: 'preview', patterns: ['RAG'],                                                                                        roadmap: 'now'  },
  { slug: 'knowledge-retrieval',     name: 'Knowledge Retrieval',      serviceType: 'hybrid', patterns: ['RAG','Embeddings'],                                           roadmap: 'now'  },
  { slug: 'autonomous-research',     name: 'Autonomous Research',       serviceType: 'ai',     patterns: ['ReAct','Browser Automation','Tool Use','Streaming'],           roadmap: 'now'  },
  { slug: 'knowledge-reinforcement', name: 'Knowledge Reinforcement',   serviceType: 'ai',     patterns: ['Embeddings','Structured Output'],                             roadmap: 'next' },
  { slug: 'pre-run-planning',        name: 'Pre-Run Planning',          serviceType: 'ai',     patterns: ['RAG'],                                                        roadmap: 'next' },
  { slug: 'task-planning',           name: 'Task Planning',             serviceType: 'ai',     patterns: ['Tool Use','Structured Output','Streaming'],                   roadmap: 'now'  },
  { slug: 'title-generation',        name: 'Title Generation',          serviceType: 'ai',     patterns: ['Structured Output'],                                          roadmap: 'now'  },
  { slug: 'agent-routing',           name: 'Agent Routing',             serviceType: 'ai',     patterns: ['RAG','Structured Output'],                                    roadmap: 'now'  },
  { slug: 'chat-response',           name: 'Chat / Consultative',       serviceType: 'ai',     patterns: ['RAG','Prompt Chaining','Streaming'],                          roadmap: 'now'  },
  { slug: 'document-extraction',     name: 'Document Extraction',       serviceType: 'ai',     patterns: ['Structured Output'],                                          roadmap: 'now'  },
  { slug: 'persona-replication',     name: 'Persona Replication',       serviceType: 'ai',     patterns: ['RAG','Prompt Chaining'],                                     roadmap: 'later'},
  { slug: 'procurement-flags',       name: 'Procurement Flags',         serviceType: 'logic',  patterns: [],                                                             roadmap: 'now'  },
  { slug: 'vendor-concentration',    name: 'Vendor Concentration',      serviceType: 'logic',  patterns: [],                                                             roadmap: 'now'  },
  { slug: 'column-detection',        name: 'Column Detection',          serviceType: 'logic',  patterns: [],                                                             roadmap: 'now'  },
  // FEATURE: AG-13 — DB Assembly service catalog entry (Dan's deterministic capability, AA-59)
  { slug: 'db-assembly',             name: 'DB Assembly',               serviceType: 'logic',  patterns: [],                                                             roadmap: 'now'  },
];

// FEATURE: AI-23 — AI Patterns catalog (10 industry patterns)
// FEATURE: AI-30 — PATTERN_CATALOG expanded to 20 entries (PAT-11–20); hitlSpecial + partial flags added
// FEATURE: AI-36 — patternType: structural | reasoning on every PATTERN_CATALOG entry
export const PATTERN_CATALOG = [
  { slug: 'rag',                name: 'RAG',                desc: 'Retrieval-Augmented Generation — embed query, search vector store, inject retrieved chunks into context before LLM call',             active: true,  patternType: 'structural' },
  { slug: 'react',              name: 'ReAct',              desc: 'Reasoning + Acting — LLM reasons about state, selects action, executes, observes result, repeats until terminal state',               active: true,  patternType: 'reasoning'  },
  { slug: 'tool-use',           name: 'Tool Use',           desc: 'Structured function calling — LLM selects from a declared tool schema and returns a structured response',                              active: true,  patternType: 'reasoning'  },
  { slug: 'prompt-chaining',    name: 'Prompt Chaining',    desc: 'Sequential prompt assembly — output of one prompt feeds as input to the next; multiple calls form a pipeline',                        active: true,  patternType: 'reasoning'  },
  // FEATURE: BUG-15 — reflection is live since S-PROMPT-ARCH-01; flip active: false → true
  { slug: 'reflection',         name: 'Reflection',         desc: 'Agent critiques and improves its own prior output — self-review pass before returning result',                                         active: true,  patternType: 'reasoning' },
  { slug: 'streaming',          name: 'Streaming',          desc: 'Token-by-token output delivery via SSE — response arrives progressively where UX latency matters',                                    active: true,  patternType: 'structural' },
  { slug: 'structured-output',  name: 'Structured Output',  desc: 'Constrained generation — response conforms to a declared schema; no free-text JSON parsing required',                                 active: true,  patternType: 'structural' },
  { slug: 'embeddings',         name: 'Embeddings',         desc: 'Vector generation — text converted to dense vector for similarity search or storage in pgvector',                                     active: true,  patternType: 'structural' },
  { slug: 'browser-automation', name: 'Browser Automation', desc: 'Playwright-controlled browser execution — agent drives a real browser instance on Railway infrastructure',                            active: true,  patternType: 'structural' },
  { slug: 'hitl',               name: 'HITL',               desc: 'Human-in-the-Loop — agent pauses at a defined step gate and waits for human input before continuing',                                 active: false, patternType: 'reasoning',  hitlSpecial: true, roadmap: 'later', roadmapNote: 'Requires step execution (S11) to ship first, then HITL step gate (TI-18, unscheduled)' },
  { slug: 'agent-orchestration',      name: 'Agent Orchestration',          desc: 'One agent delegates work to a peer agent mid-execution; subagent output feeds back into the orchestrating task. Distinct from agent routing (pre-call selection): orchestration happens inside a running execution loop.', active: false, patternType: 'reasoning',  roadmap: 'next',  roadmapNote: 'Becomes live in S11 (step execution) + AW-17 (multi-agent step assignment)' },
  { slug: 'few-shot-prompting',       name: 'Few-Shot Prompting',           desc: 'Providing worked examples inside the prompt to guide output format, style, and reasoning before the model generates its response. In use implicitly inside system prompts — not yet a named, tracked service call.', active: false, patternType: 'reasoning',  roadmap: 'next',  roadmapNote: 'Formal tracking when Prompt Assembly extracted as discrete service (S-INFRA-01)' },
  // FEATURE: AA-44 — PAT-13 Guardrails active: true (runtime enforcement ships S-PM-04b)
  { slug: 'guardrails',               name: 'Guardrails / Output Filtering', desc: 'Post-generation safety and quality enforcement — checking model output against declared rules (always/never constraints, topic boundaries, format requirements) before returning to caller. Data concept exists in Playbook tab.', active: true,  patternType: 'structural' },
  { slug: 'parallelization',          name: 'Parallelization',              desc: 'Multiple LLM calls executed simultaneously; results combined or compared. Test Team (TT-01/02) runs two agents on the same query in parallel and displays results side-by-side with a diff metric dashboard.', active: false, patternType: 'structural', partial: true, roadmap: 'next',  roadmapNote: 'Test Team (TT-01/02) is partial implementation; full wiring deferred to AW-17 (multi-agent step assignment)' },
  { slug: 'llm-as-judge',             name: 'LLM-as-Judge / Verifier',      desc: 'A second model evaluates the quality, accuracy, or compliance of a first model\'s output. Distinct from Reflection (self-critique): the judge is a separate call, often a different model or persona.', active: false, patternType: 'reasoning',  roadmap: 'later', roadmapNote: 'Natural fit for PE-12 Test Agent scoring and AI-24 routing feedback loop' },
  { slug: 'multi-agent-debate',       name: 'Multi-Agent Debate',           desc: 'Two agents take opposing positions and argue against each other\'s output; a synthesis agent reads both arguments and produces a reconciled final answer. Agents are adversarially aware — each sees the other\'s response.', active: false, patternType: 'reasoning',  roadmap: 'later', roadmapNote: 'Extends Test Team (TT-01/02); adds critique pass + synthesis agent. TT-03 design session required.' },
  { slug: 'chain-of-verification',    name: 'Chain-of-Verification (CoVe)', desc: 'After generating an answer, the model generates a checklist of verification questions about its own factual claims, answers each independently, then revises the original answer. Targets factual accuracy claim by claim.', active: false, patternType: 'reasoning',  roadmap: 'later', roadmapNote: 'High compliance relevance for government procurement deliverables. No implementation planned yet.' },
  { slug: 'episodic-memory',          name: 'Episodic Memory',              desc: 'Agents recall the context of prior interactions with a specific user, task, or organization — separate from factual knowledge in RAG. RAG retrieves facts; episodic memory retrieves experience.', active: false, patternType: 'reasoning',  roadmap: 'later', roadmapNote: 'Differentiates AI workforce (colleagues with history) from AI tools (stateless responders). Phase 3+.' },
  { slug: 'hyde',                     name: 'HyDE',                         desc: 'Before retrieving from the knowledge base, generate a hypothetical ideal answer to the query, embed that hypothetical, and use the resulting vector for retrieval — significantly improves RAG quality for domain-specific terminology.', active: false, patternType: 'structural', roadmap: 'next',  roadmapNote: 'One-model change inside SVC-02 Knowledge Retrieval — no schema changes required' },
  { slug: 'adaptive-rag',             name: 'Adaptive RAG',                 desc: 'Dynamically adjusts retrieval depth and strategy based on query complexity. Simple queries: shallow retrieval (3 chunks). Complex analysis: deep retrieval (20+ chunks) with keyword fallback. Prevents over-retrieval cost waste.', active: false, patternType: 'structural', roadmap: 'next',  roadmapNote: 'Complexity classifier inside SVC-02 Knowledge Retrieval — no schema changes required' },
];

// FEATURE: AI-23 — Remap old ai_type strings to service slugs (DB rows keep old values; remapped at read time)
const AI_TYPE_TO_SERVICE = {
  rag_briefing:   'prompt-assembly',
  planning:       'task-planning',
  routing:        'agent-routing',
  chat:           'chat-response',
  similarity:     'knowledge-retrieval',
  summarization:  'knowledge-reinforcement',
  react_loop:     'autonomous-research',
  extraction:     'document-extraction',
  reinforcement:  'knowledge-reinforcement',
  ai_enrichment:        'ai-enrichment',
  request_receivable:   'request-receivable',
  goal_suggestion:      'goal-suggestion',
  preview_prompt:       'preview-prompt',
  db_assembly:          'db-assembly',
  // FEATURE: BUG-12 — reflect and synthesis attributed to ai-enrichment service
  reflect:              'ai-enrichment',
  synthesis:            'ai-enrichment',
};

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
// FEATURE: BUG-13 — correct model IDs for cost lookup (old short-form keys kept for safety)
const COST_PER_1K = {
  "claude-haiku-4-5": 0.00025,
  "claude-haiku-4-5-20251001": 0.00025,
  "claude-sonnet-4-5": 0.003,
  "claude-sonnet-4-6": 0.003,
  "text-embedding-3-small": 0.00002,
};

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
// FEATURE: AA-44 — logAICall gains optional patterns_used param
export function logAICall({ type, model, tokens = 0, latencyMs = 0, tier = null, location = null, agentId = null, taskId = null, patterns_used = [] }) {
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
    patterns_used:  patterns_used.length > 0 ? patterns_used : null,
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

  // FEATURE: AI-23 — Aggregate by Service (remaps old ai_type to service_slug)
  const byService = {};
  for (const svc of SERVICE_CATALOG) {
    const entries = log.filter(e => (AI_TYPE_TO_SERVICE[e.type] || e.type) === svc.slug);
    const cost    = entries.reduce((s,e) => s + (e.cost||0), 0);
    const latencies = entries.filter(e=>e.latencyMs).map(e=>e.latencyMs);
    byService[svc.slug] = {
      ...svc,
      total:      entries.length,
      cost,
      avgLatency: latencies.length ? Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length) : null,
    };
  }

  // FEATURE: AI-23 — Aggregate by Pattern (roll up from services that declare the pattern)
  const byPattern = {};
  for (const pat of PATTERN_CATALOG) {
    const svcsUsingPattern = new Set(SERVICE_CATALOG.filter(s => s.patterns.includes(pat.name)).map(s => s.slug));
    const entries = log.filter(e => svcsUsingPattern.has(AI_TYPE_TO_SERVICE[e.type] || e.type));
    const cost    = entries.reduce((s,e) => s + (e.cost||0), 0);
    byPattern[pat.slug] = { ...pat, total: entries.length, cost };
  }

  const servicesActive      = Object.values(byService).filter(s => s.total > 0).length;
  const patternsActiveCount = PATTERN_CATALOG.filter(p => p.active).length;

  // FEATURE: AI-23 patch — sorted arrays for dynamic section rendering
  // Services: primary sort = type order (ai→hybrid→logic), secondary = calls desc
  const SERVICE_TYPE_ORDER = { ai: 0, hybrid: 1, logic: 2 };
  const servicesSorted = Object.values(byService).sort((a, b) => {
    const tDiff = SERVICE_TYPE_ORDER[a.serviceType] - SERVICE_TYPE_ORDER[b.serviceType];
    if (tDiff !== 0) return tDiff;
    return b.total - a.total;
  });

  // Patterns: sorted by calls desc; inactive patterns always at bottom
  const patternsSorted = Object.values(byPattern).sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return b.total - a.total;
  });

  // Agents: sorted by calls desc
  const agentsSorted = Object.values(byAgent).sort((a, b) => b.calls - a.calls);

  const modelsInUse = Object.values(byLLM).filter(d => d.calls > 0).length;
  const totalCost = log.reduce((s,e)=>s+(e.cost||0),0);
  const totalCalls = log.length;

  return { log, byType, byLLM, byAgent, byService, byPattern, servicesActive, patternsActiveCount, patternsCatalogTotal: PATTERN_CATALOG.length, modelsInUse, totalCost, totalCalls, servicesSorted, patternsSorted, agentsSorted };
}

export { MODEL_PROVIDER };
