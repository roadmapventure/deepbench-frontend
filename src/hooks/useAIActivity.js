// DeepBench v6.1.43 | MarketIntelligenceScreen.jsx / useAIActivity.js | S-MI-42 -- two-tone indicator, final-timeline caption, streaming/agent-delegation catalog fixes
// DeepBench v6.0.21 | useAIActivity.js | S-MARKET-INTEL-01d — agent-delegation pattern catalog fix (replaces stale agent-orchestration), quality-gate/pipeline-triage/data-analysis patterns retrofit
// FEATURE: AI-14 — useAIActivity — byLLM + byAgent aggregations, reinforcement type, future tracking types
// FEATURE: AI-16 — logAICall Supabase persistence
// Module-level AI call log. Any component calls logAICall() to record.
// AIActivityPanel reads the same store — no context provider needed.

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase.js';
import { PATTERN_CATALOG } from '../../shared/ai-patterns.js';
export { PATTERN_CATALOG };

// FEATURE: AI-51 — moved from useAgents.js (S-MI-20 origin) so this canonical shared cost/pattern
// module can also reuse the same nearby-timestamp pairing check for cost/pattern-count dedup, not
// just latency. Byte-identical values; useAgents.js now imports these instead of defining them.
export const CAPABILITY_WRAPPER_TYPES = new Set([
  "channel-intelligence", "hypothesis-evaluation", "quality-gate", "pipeline-triage",
  "memory-consolidation", "data-analysis", "project-manager", "screen-controls",
  "html-display",
]);
export const PAIR_WINDOW_MS = 2000;

// FEATURE: AI-23 — AI Services catalog (14 services, client-side until S-INFRA-01 creates ai_services table)
export const SERVICE_CATALOG = [
  // FEATURE: BUG-22 — prompt-assembly is live; move off roadmap
  { slug: 'prompt-assembly',         name: 'Prompt Assembly',          serviceType: 'hybrid', patterns: ['Prompt Chaining','RAG'],                                      roadmap: 'now'  },
  // FEATURE: AA-43 — ai-enrichment service catalog entry (logAICall wired in S-PM-04)
  // FEATURE: BUG-17 — Reflection is live (BUG-15 active:true); surface it in AI Audit By Service view
  // FEATURE: BUG-22 — ai-enrichment is live (16 calls); move off roadmap
  { slug: 'ai-enrichment',           name: 'AI Enrichment',            serviceType: 'hybrid', patterns: ['RAG','Prompt Chaining','Reflection','Prompt Compression'],                                roadmap: 'now'  },
  // FEATURE: AA-44 — request-receivable SERVICE_CATALOG entry
  // FEATURE: BUG-22 — request-receivable shipped in S-PM-04b
  { slug: 'request-receivable',      name: 'Request & Receivable',     serviceType: 'ai',     patterns: ['Structured Output','Tool Use','Streaming','Prompt Chaining','Guardrails / Output Filtering'], roadmap: 'now'  },
  // FEATURE: AW-27 — goal suggestion: streaming Haiku + RAG
  { slug: 'goal-suggestion',         name: 'Goal Suggestion',          serviceType: 'ai',     patterns: ['Streaming', 'RAG'],                                                                           roadmap: 'now'  },
  // FEATURE: AW-28 — preview-prompt: DB Assembly + AI Enrichment without LLM call
  { slug: 'preview-prompt',          name: 'Prompt Preview',           serviceType: 'preview', patterns: ['RAG'],                                                                                        roadmap: 'now'  },
  { slug: 'knowledge-retrieval',     name: 'Knowledge Retrieval',      serviceType: 'hybrid', patterns: ['RAG','Embeddings'],                                           roadmap: 'now'  },
  { slug: 'autonomous-research',     name: 'Autonomous Research',       serviceType: 'ai',     patterns: ['ReAct','Browser Automation','Tool Use','Streaming'],           roadmap: 'now'  },
  // FEATURE: BUG-22 — knowledge-reinforcement live via TeachScreen + FetchContext
  { slug: 'knowledge-reinforcement', name: 'Knowledge Reinforcement',   serviceType: 'ai',     patterns: ['Embeddings','Structured Output'],                             roadmap: 'now'  },
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
  // FEATURE: AG-27 — The Librarian (Eleanor Voss) Data Room broker service catalog entry
  { slug: 'librarian',               name: 'The Librarian',             serviceType: 'hybrid', patterns: ['RAG'],                                                       roadmap: 'now'  },
  // FEATURE: MI-10/MI-11 — Channel Intelligence (Marcus/CI-01): Intent Routing + Q&A Answer
  // FEATURE: MI-42 — Agent Delegation added (pre-existing gap: Marcus's own ci-answer-intent/
  // ci-answer-display-intent already use it via AA-164/S-ARCH-DISPLAY-LOOP-01, the catalog just
  // never reflected it) + Streaming (this session wires opt-in SSE streaming into every capability
  // this service exposes).
  { slug: 'channel-intelligence',    name: 'Channel Intelligence',      serviceType: 'ai',     patterns: ['Structured Output', 'RAG', 'Case-Based Reasoning', 'Orchestrator-Workers', 'Streaming'],          roadmap: 'now'  },
  // FEATURE: MI-12 — Quality Gate (Owen/CI-04): combined Guardrail + Eval pre-display review
  // FEATURE: MI-01d — Agent Delegation added: Owen's own delegate_to_agent retry (Task 3) is this
  // service's first live delegating caller.
  // FEATURE: MI-42 — Streaming added (opt-in SSE streaming wired into every capability this service exposes).
  { slug: 'quality-gate',            name: 'Quality Gate',              serviceType: 'ai',     patterns: ['Structured Output', 'Guardrails / Output Filtering', 'LLM-as-Judge / Verifier', 'Orchestrator-Workers', 'Streaming'], roadmap: 'now'  },
  // FEATURE: AG-28 — hypothesis-evaluation capability (Priya Nair, Generate Hypotheses call).
  // RAG listed at capability level even though this specific call's design doc technical_services
  // don't name it — hyp-knowledge fires a RAG fetch unconditionally, same accepted behavior as
  // channel-intelligence's ci-routing-intent (Section 2 above). No AI_TYPE_TO_SERVICE entry needed:
  // ai_type will equal capability_slug ('hypothesis-evaluation') exactly, resolved by the existing
  // `|| e.type` fallback (line 280) — same pattern as channel-intelligence/quality-gate.
  { slug: 'hypothesis-evaluation',   name: 'Hypothesis Evaluation',     serviceType: 'ai',     patterns: ['Structured Output', 'RAG', 'Case-Based Reasoning'], roadmap: 'now'  },
  // FEATURE: AG-29 — pipeline-triage capability (Sam Reyes, Commit Triage + Failure Triage).
  // No AI_TYPE_TO_SERVICE entry needed: ai_type will equal capability_slug ('pipeline-triage')
  // exactly, resolved by the existing `|| e.type` fallback (line ~280) — same pattern as
  // channel-intelligence/quality-gate/hypothesis-evaluation.
  // FEATURE: MI-01d — Agent Delegation added: Sam's intake-failure-intent gets its first live
  // caller this session (Task 2).
  // FEATURE: MI-42 — Streaming added (opt-in SSE streaming wired into every capability this service exposes).
  { slug: 'pipeline-triage', name: 'Pipeline Triage', serviceType: 'ai', patterns: ['Structured Output', 'Orchestrator-Workers', 'Streaming'], roadmap: 'now' },
  // FEATURE: AA-86 -- Michelle's roster broker (lib/project-manager.js). Deterministic read, no
  // LLM call of its own -- mirrors db-assembly's shape, not librarian's (no RAG/embedding step).
  { slug: 'agent-directory', name: 'Agent Directory', serviceType: 'logic', patterns: [], roadmap: 'now' },
  // FEATURE: AG-32 -- data-analysis capability (Nadia Farouk, Data Analyst, CI-03, Escalate).
  // No AI_TYPE_TO_SERVICE entry needed: ai_type will equal capability_slug ('data-analysis')
  // exactly, resolved by the existing `|| e.type` fallback -- same pattern as
  // channel-intelligence/quality-gate/hypothesis-evaluation/pipeline-triage.
  // FEATURE: MI-01d — Agent Delegation added: live since S-APPLE-04b (Escalate delegates via
  // request_help/delegate_to_agent) but never retrofitted onto this catalog entry until now.
  { slug: 'data-analysis', name: 'Data Analysis', serviceType: 'ai', patterns: ['Structured Output', 'Orchestrator-Workers'], roadmap: 'now' },
  // FEATURE: AG-33 -- data-room-custody capability (Eleanor Voss, The Librarian, LB-01). The only
  // capability whose execution performs a real the_library write, via the existing writeLibrary()
  // broker -- not a new access path, the same one S-LIBRARIAN-02 already built. patterns gained
  // 'RAG' (Task 2b/4e) -- she now genuinely retrieves Library context before deciding.
  { slug: 'data-room-custody', name: 'Data Room Custody', serviceType: 'ai', patterns: ['Structured Output', 'RAG'], roadmap: 'now' },
  // FEATURE: SK-22 — Display/Format specialist capabilities (Alex Reeves, Riley Torres, Claire
  // Sutton). Previously dormant (zero live call sites); now legitimate live candidates for any
  // capability's request_help call once display routing is agent-reasoned (S-ARCH-HITL-RESUME-01).
  // No AI_TYPE_TO_SERVICE entry needed for any of the three: each capability_slug already equals
  // its own ai_type exactly (same `|| e.type` fallback pattern as data-analysis/quality-gate/etc.)
  { slug: 'screen-controls', name: 'Screen Controls (Alex Reeves)', serviceType: 'ai', patterns: ['Structured Output'], roadmap: 'now' },
  { slug: 'html-display',    name: 'HTML Display (Riley Torres)',   serviceType: 'ai', patterns: [], roadmap: 'now' },
  { slug: 'pdf-assembly',    name: 'PDF Assembly (Claire Sutton)',  serviceType: 'ai', patterns: [], roadmap: 'now' },
  // FEATURE: AG-24 -- memory-consolidation capability (Elena Cho, The Reasoner, CI-06). No
  // AI_TYPE_TO_SERVICE entry needed: ai_type will equal capability_slug ('memory-consolidation')
  // exactly, resolved by the existing `|| e.type` fallback -- same pattern as
  // channel-intelligence/quality-gate/hypothesis-evaluation/pipeline-triage/data-analysis.
  { slug: 'memory-consolidation', name: 'Memory Consolidation (Elena Cho)', serviceType: 'ai', patterns: ['Structured Output', 'Memory Consolidation', 'Case Retention'], roadmap: 'now' },
  // FEATURE: AA-122 -- Agent Turn (Delegation Loop Reasoning) service catalog entry. Logged by
  // AA-120's logAgentTurn() (execute.js) for every delegation-loop callModel() turn, any capability
  // -- generic and agent-agnostic, not Marcus-specific. No AI_TYPE_TO_SERVICE entry needed: ai_type
  // will equal this slug ('agent-turn') exactly, resolved by the existing `|| e.type` fallback --
  // same pattern as pipeline-triage/agent-directory/data-analysis/screen-controls/etc. above. Carries
  // no cost_usd/input_tokens by design (the real billed cost is already attributed to the capability-
  // level row sendRequest() writes separately) -- real call count + avg latency, $0 cost, as intended.
  { slug: 'agent-turn', name: 'Agent Turn (Delegation Loop Reasoning)', serviceType: 'ai', patterns: ['Tool Use', 'Orchestrator-Workers'], roadmap: 'now' },
];

// FEATURE: AI-50c — real per-call pattern attribution, replacing the old SERVICE_CATALOG static
// rollup (which summed a call's FULL cost into every one of that service's declared patterns,
// causing ~3x over-counting). Splits each call's cost EVENLY across however many real patterns
// that specific call exercised (patternsUsed), so bucket sums reconcile exactly to Total Cost —
// John's confirmed design. `total` (call count) is NOT split — a call legitimately counts once
// toward each pattern it used; only cost needs to reconcile to the whole. Entries with no
// patternsUsed (pre-AI-50a rows, or a slug not yet in PATTERN_CATALOG) contribute nothing to any
// bucket — invisible rather than mis-attributed, matching what real data is actually available.
export function computeByPattern(log) {
  const byPattern = {};
  for (const pat of PATTERN_CATALOG) {
    byPattern[pat.slug] = { ...pat, total: 0, cost: 0 };
  }
  for (const e of log) {
    const used = Array.isArray(e.patternsUsed) ? e.patternsUsed : [];
    if (used.length === 0) continue;
    const splitCost = (e.cost || 0) / used.length;
    for (const slug of used) {
      if (byPattern[slug]) {
        byPattern[slug].total += 1;
        byPattern[slug].cost += splitCost;
      }
    }
  }
  return byPattern;
}

// FEATURE: AI-51 -- agent-turn rows are written for EVERY turn in the delegation loop
// (logAgentTurn()); sendRequest() ALSO writes a second row for the SAME turn when it's
// terminal (non-delegating) -- both carry identical tokens/patterns_used, describing the
// same real call from two logging vantage points. A pure delegating turn has no such
// sibling and is the sole record of that spend/pattern-use -- must not be zeroed. Reuses
// the exact same nearby-timestamp pairing check useAgents.js's classifyRow() already
// proved live for LATENCY dedup (S-MI-20), applied here to cost + pattern-count instead.
// Returns the Set of row `id`s for every agent-turn row that has a same-agent capability-
// wrapper row (feature === 'request-receivable') within PAIR_WINDOW_MS -- callers should
// treat those specific rows as already-counted via their paired sibling.
export function pairedAgentTurnIds(rows) {
  const wrapperTimesByAgent = new Map();
  for (const row of rows) {
    if (CAPABILITY_WRAPPER_TYPES.has(row.ai_type) && row.feature === 'request-receivable') {
      const t = new Date(row.created_at).getTime();
      if (!wrapperTimesByAgent.has(row.agent_id)) wrapperTimesByAgent.set(row.agent_id, []);
      wrapperTimesByAgent.get(row.agent_id).push(t);
    }
  }
  const paired = new Set();
  for (const row of rows) {
    if (row.ai_type !== 'agent-turn') continue;
    const rowTime = new Date(row.created_at).getTime();
    const wrapperTimes = wrapperTimesByAgent.get(row.agent_id) || [];
    if (wrapperTimes.some(t => Math.abs(t - rowTime) < PAIR_WINDOW_MS)) {
      paired.add(row.id);
    }
  }
  return paired;
}

// FEATURE: AI-23 — Remap old ai_type strings to service slugs (DB rows keep old values; remapped at read time)
export const AI_TYPE_TO_SERVICE = {
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
  librarian:            'librarian',
  ci_routing:           'channel-intelligence',
  ci_answer:            'channel-intelligence',
  quality_gate_review: 'quality-gate',
  // FEATURE: AI-41 — plan.js's capability_slug defaults to 'project-manager' (api/plan.js line 130),
  // which now flows through as ai_type per request-receivable.js's Task 2 fix. No SERVICE_CATALOG
  // slug named 'project-manager' exists — its calls belong under the existing 'task-planning' entry.
  // channel-intelligence and quality-gate need no new entry here: their capability_slug values
  // already equal their SERVICE_CATALOG slugs exactly, resolved by the existing `|| e.type` fallback.
  'project-manager': 'task-planning',
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

// FEATURE: AA-181 -- real Anthropic per-model input/output rates (verified 2026-07-14
// against published Claude pricing: Haiku 4.5 $1/$5 per 1M tokens, Sonnet 4.6 $3/$15 per
// 1M). Split input/output replaces the old single blended rate, which understated Haiku
// cost 4x and ignored Sonnet's 5x output premium entirely.
const COST_PER_1K_INPUT = {
  "claude-haiku-4-5": 0.001,
  "claude-haiku-4-5-20251001": 0.001,
  "claude-sonnet-4-5": 0.003,
  "claude-sonnet-4-6": 0.003,
  "text-embedding-3-small": 0.00002,
};
const COST_PER_1K_OUTPUT = {
  "claude-haiku-4-5": 0.005,
  "claude-haiku-4-5-20251001": 0.005,
  "claude-sonnet-4-5": 0.015,
  "claude-sonnet-4-6": 0.015,
  "text-embedding-3-small": 0.00002,
};

// FEATURE: BUG-20 — add canonical versioned model IDs; keep legacy short-form for historical rows
const MODEL_PROVIDER = {
  "claude-haiku-4-5":            "Anthropic",
  "claude-haiku-4-5-20251001":   "Anthropic",
  "claude-sonnet-4-5":           "Anthropic",
  "claude-sonnet-4-6":           "Anthropic",
  "text-embedding-3-small":      "OpenAI",
};

// ── Module-level store ────────────────────────────────────────────────────────
let _log    = [];
let _listeners = [];

const notify = () => _listeners.forEach(fn => fn([..._log]));

// FEATURE: BUG-20 — normalize short-form model IDs to canonical versioned IDs at write time
const MODEL_ID_NORMALIZE = {
  'claude-haiku-4-5':  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5': 'claude-sonnet-4-6',
};

// FEATURE: AA-181 -- single source of truth for call cost, used at both write time
// (logAICall(), for the legacy client-driven AI types) and read time
// (hydrateFromSupabase() below, and useAgents.js's buildActivitySummary()). Root cause
// this closes: every server-side ai_activity_log insert (execute.js, request-receivable.js,
// ai-enrichment.js) writes input_tokens/output_tokens but never a cost_usd value, so
// 99.5% of real rows had no dollar figure. Deriving cost from tokens at read time prices
// every existing and future row with no backfill migration.
export function computeCallCost(model, inputTokens, outputTokens) {
  const resolvedModel = MODEL_ID_NORMALIZE[model] || model;
  const inRate = COST_PER_1K_INPUT[resolvedModel] ?? COST_PER_1K_INPUT[model];
  const outRate = COST_PER_1K_OUTPUT[resolvedModel] ?? COST_PER_1K_OUTPUT[model];
  if (inRate == null && outRate == null) return null;
  return ((inputTokens || 0) / 1000) * (inRate || 0) + ((outputTokens || 0) / 1000) * (outRate || 0);
}

// FEATURE: AI-16 — logAICall Supabase persistence
// FEATURE: AA-44 — logAICall gains optional patterns_used param
export function logAICall({ type, model, tokens = 0, latencyMs = 0, tier = null, location = null, agentId = null, taskId = null, patterns_used = [] }) {
  // FEATURE: BUG-20 — normalize + canonical fallback
  const resolvedModel = MODEL_ID_NORMALIZE[model] || model || MODEL_ID_NORMALIZE[AI_TYPES[type]?.model] || AI_TYPES[type]?.model || "claude-haiku-4-5-20251001";
  const entry = {
    id:        Date.now() + Math.random(),
    type,
    model:     resolvedModel,
    tokens,
    latencyMs,
    tier,
    location:  location || AI_TYPES[type]?.location || "—",
    agentId,
    cost:      computeCallCost(resolvedModel, 0, tokens),
    patternsUsed: patterns_used,
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

// FEATURE: AA-184 -- page through the full result set instead of capping at 500, so
// Total Cost and every by-type/by-service/by-pattern/by-LLM rollup reflect true history
// instead of just the most recent 500 rows. AA-183 fixed HOW cost is computed per row;
// this fixes HOW MANY rows are read -- confirmed live the two are independent bugs
// (last-500-rows total was $3.56 vs $42.18 across the real ~9,300-row history). Same
// PAGE_SIZE/.range() loop already proven in useAgents.js's fetchAll() -- not a new pattern.
const PAGE_SIZE = 1000;

// FEATURE: AI-16 — Hydrate in-memory store from Supabase on panel mount
export async function hydrateFromSupabase(tenantId = 'global') {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('ai_activity_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.warn('[AI log] Hydration failed:', error.message);
      return;
    }
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // FEATURE: AI-51 — dedup agent-turn rows paired with a same-agent capability-wrapper row
  // (see pairedAgentTurnIds()'s own comment) before mapping cost/patternsUsed.
  const paired = pairedAgentTurnIds(rows);

  // Replace store entirely with DB state — DB is authoritative on every panel open
  _log = rows.map(row => ({
    id:        row.id,
    type:      row.ai_type,
    model:     row.model || 'claude-haiku-4-5',
    tokens:    row.input_tokens || 0,
    latencyMs: row.latency_ms || 0,
    tier:      row.knowledge_tier || null,
    location:  row.feature || '—',
    agentId:   row.agent_id || null,
    cost:      paired.has(row.id) ? 0 : (row.cost_usd != null
      ? parseFloat(row.cost_usd)
      : computeCallCost(row.model, row.input_tokens, row.output_tokens)),
    patternsUsed: paired.has(row.id) ? [] : (row.patterns_used || []),
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
    // FEATURE: BUG-20 — only aggregate real LLM model strings; filter service names and junk values
    if (!m.startsWith('claude-') && !m.startsWith('text-embedding-')) continue;
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

  // FEATURE: AI-50c — real per-call pattern attribution (see computeByPattern's own comment)
  const byPattern = computeByPattern(log);

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

  return { log, byType, byLLM, byAgent, byService, byPattern, servicesActive, servicesCatalogTotal: SERVICE_CATALOG.length, patternsActiveCount, patternsCatalogTotal: PATTERN_CATALOG.length, modelsInUse, totalCost, totalCalls, servicesSorted, patternsSorted, agentsSorted };
}

export { MODEL_PROVIDER };
