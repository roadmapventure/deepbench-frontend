// DeepBench v6.1.43 | MarketIntelligenceScreen.jsx / useAIActivity.js | S-MI-42 -- two-tone indicator, final-timeline caption, streaming/agent-delegation catalog fixes
// DeepBench v6.0.21 | useAIActivity.js | S-MARKET-INTEL-01d — agent-delegation pattern catalog fix (replaces stale agent-orchestration), quality-gate/pipeline-triage/data-analysis patterns retrofit
// FEATURE: AI-14 — useAIActivity — byLLM + byAgent aggregations, reinforcement type, future tracking types
// FEATURE: AI-16 — logAICall Supabase persistence
// Module-level AI call log. Any component calls logAICall() to record.
// AIActivityPanel reads the same store — no context provider needed.

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase.js';
import { PATTERN_CATALOG, SERVICE_CATALOG } from '../../shared/ai-patterns.js';
export { PATTERN_CATALOG, SERVICE_CATALOG };

// FEATURE: AI-51 — moved from useAgents.js (S-MI-20 origin) so this canonical shared cost/pattern
// module can also reuse the same nearby-timestamp pairing check for cost/pattern-count dedup, not
// just latency. Byte-identical values; useAgents.js now imports these instead of defining them.
export const CAPABILITY_WRAPPER_TYPES = new Set([
  "channel-intelligence", "hypothesis-evaluation", "quality-gate", "pipeline-triage",
  "memory-consolidation", "data-analysis", "project-manager", "screen-controls",
  "html-display",
]);
export const PAIR_WINDOW_MS = 2000;

// FEATURE: AI-53 -- maps a real logged pattern slug (e.g. 'embeddings') to its display name
// (e.g. 'Embeddings') for byService's self-derived patterns list, below.
const PATTERN_NAME_BY_SLUG = Object.fromEntries(PATTERN_CATALOG.map(p => [p.slug, p.name]));

// FEATURE: AI-53 -- local SERVICE_CATALOG definition removed; now imported from
// shared/ai-patterns.js (see import above) so both this Vite frontend file and the Vercel
// backend routes (api/extract.js, api/brief.js) share one source of truth for service slugs.

// FEATURE: AI-50c — real per-call pattern attribution, replacing the old SERVICE_CATALOG static
// rollup (which summed a call's FULL cost into every one of that service's declared patterns,
// causing ~3x over-counting). Splits each call's cost EVENLY across however many real patterns
// that specific call exercised (patternsUsed), so bucket sums reconcile exactly to Total Cost —
// John's confirmed design. `total` (call count) is NOT split — a call legitimately counts once
// toward each pattern it used; only cost needs to reconcile to the whole. Entries with no
// patternsUsed (pre-AI-50a rows, or a slug not yet in PATTERN_CATALOG) contribute nothing to any
// bucket — invisible rather than mis-attributed, matching what real data is actually available.
// FEATURE: LOG-16 -- historical pattern-display trust boundary. Before this session,
// rag/streaming/reflect/intelligent-synthesis on any ai_type other than librarian/librarian-write
// were spread from a declared Intent Skill Profile field onto every call of that intent, regardless
// of whether that specific call actually exercised it -- confirmed live 2026-07-16, 659 real rows
// carry this risk (see kickoff CONTEXT). This session's request-receivable.js fix makes these
// patterns genuinely per-call real going forward, but a pre-fix row's declared-but-unverified
// pattern can never be retroactively confirmed. Per John's explicit rule: if it can't be verified,
// don't show it; if it can, show it. PATTERN_VERIFICATION_CUTOFF must be set to this fix's real
// production deploy timestamp before the final push (Section 9/Manual QA) -- not an approximate or
// pre-emptive value, since any row before the real fix is actually live could still carry the old
// unverified spread.
const UNVERIFIED_BEFORE_CUTOFF = new Set(['rag', 'streaming', 'reflect', 'intelligent-synthesis']);
const ALWAYS_TRUSTED_AI_TYPES = new Set(['librarian', 'librarian-write']);
export const PATTERN_VERIFICATION_CUTOFF = '2026-07-16T18:44:00Z'; // LOG-16 real push-time cutoff (S-LOG-16, set immediately before final push)

function isPatternTrusted(slug, aiType, ts) {
  if (!UNVERIFIED_BEFORE_CUTOFF.has(slug)) return true; // mechanical/always-real patterns
  if (ALWAYS_TRUSTED_AI_TYPES.has(aiType)) return true; // hardcoded-at-real-occurrence, any age
  return new Date(ts).getTime() >= new Date(PATTERN_VERIFICATION_CUTOFF).getTime();
}

export function computeByPattern(log) {
  const byPattern = {};
  for (const pat of PATTERN_CATALOG) {
    byPattern[pat.slug] = { ...pat, total: 0, cost: 0 };
  }
  for (const e of log) {
    const used = Array.isArray(e.patternsUsed) ? e.patternsUsed : [];
    // FEATURE: LOG-16 -- filter to only patterns this row can actually stand behind before
    // splitting cost, so the displayed sum reconciles honestly across only what's shown (the
    // stripped share redistributes to this same call's remaining trusted patterns, rather than
    // silently vanishing from every bucket's total).
    const trustedUsed = used.filter(slug => isPatternTrusted(slug, e.type, e.ts));
    if (trustedUsed.length === 0) continue;
    const splitCost = (e.cost || 0) / trustedUsed.length;
    for (const slug of trustedUsed) {
      // FEATURE: LOG-14 — self-maintaining fallback: a real pattern slug the harness logged that
      // isn't yet in PATTERN_CATALOG gets its own auto-labeled bucket instead of being silently
      // dropped ("invisible rather than mis-attributed" no longer means invisible forever).
      if (!byPattern[slug]) {
        byPattern[slug] = { slug, name: humanizeSlug(slug), desc: 'Auto-detected — not yet catalogued', active: true, patternType: 'unknown', autoDetected: true, total: 0, cost: 0 };
      }
      byPattern[slug].total += 1;
      byPattern[slug].cost += splitCost;
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
  extraction:     'document-metadata-generation',
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
  'ci-submission-ack-intent': 'channel-intelligence',
  'ci-resolution-ack-intent': 'channel-intelligence',
  quality_gate_review: 'quality-gate',
  // FEATURE: AI-41 — plan.js's capability_slug defaults to 'project-manager' (api/plan.js line 130),
  // which now flows through as ai_type per request-receivable.js's Task 2 fix. No SERVICE_CATALOG
  // slug named 'project-manager' exists — its calls belong under the existing 'task-planning' entry.
  // channel-intelligence and quality-gate need no new entry here: their capability_slug values
  // already equal their SERVICE_CATALOG slugs exactly, resolved by the existing `|| e.type` fallback.
  'project-manager': 'task-planning',
};

// FEATURE: LOG-12 -- agent-turn rows always carry their real capability as the first ':'-delimited
// segment of `feature` (logAgentTurn()'s own format, execute.js) -- reading it directly is generic
// and never goes stale, unlike a maintained list. Fixes byService dumping every non-terminal
// delegation-loop turn into the generic 'agent-turn' bucket instead of its real capability
// (found live 2026-07-16: 4 of Owen's 5 real quality-gate review calls were invisible under
// "Quality Gate," landing in "Agent Turn" instead).
export function capabilitySlugForRow({ ai_type, feature }) {
  const rawSlug = (ai_type === 'agent-turn' && feature) ? feature.split(':')[0] : ai_type;
  return AI_TYPE_TO_SERVICE[rawSlug] || rawSlug;
}

// FEATURE: LOG-14 -- title-cases a kebab-case slug for an auto-detected catalog fallback label.
// Same one-line shape as MarketIntelligenceScreen.jsx's local formatKindLabel() (not imported --
// that function is screen-local and this is a different call site; duplicating one pure one-line
// formatter is not worth a new shared module for two callers).
function humanizeSlug(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

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
  // FEATURE: LOG-12 — group by capabilitySlugForRow() (resolves agent-turn rows to their real
  // capability) instead of the raw ai_type, so non-terminal delegation-loop turns land under the
  // capability they actually belong to.
  const byService = {};
  for (const svc of SERVICE_CATALOG) {
    const entries = log.filter(e => capabilitySlugForRow({ ai_type: e.type, feature: e.location }) === svc.slug);
    const cost    = entries.reduce((s,e) => s + (e.cost||0), 0);
    const latencies = entries.filter(e=>e.latencyMs).map(e=>e.latencyMs);
    // FEATURE: AI-53 -- patterns computed from real per-call patternsUsed instead of svc's static
    // array, so a service's displayed patterns can never go stale relative to what it actually
    // logs. Falls back to the static hint only when the service has zero real calls yet (nothing
    // to compute from -- roadmap/not-yet-live entries).
    const observedSlugs = [...new Set(entries.flatMap(e => Array.isArray(e.patternsUsed) ? e.patternsUsed : []))];
    const observedPatterns = observedSlugs.map(slug => PATTERN_NAME_BY_SLUG[slug] || slug);
    byService[svc.slug] = {
      ...svc,
      patterns:   entries.length > 0 ? observedPatterns : svc.patterns,
      total:      entries.length,
      cost,
      avgLatency: latencies.length ? Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length) : null,
    };
  }
  // FEATURE: LOG-14 — self-maintaining fallback: any real resolved slug not yet in SERVICE_CATALOG
  // still gets its own bucket (auto-labeled from the slug) instead of silently vanishing from
  // By-Service. A developer can later add a proper named/described SERVICE_CATALOG entry — this
  // never blocks real data from showing up in the meantime.
  const knownServiceSlugs = new Set(SERVICE_CATALOG.map(s => s.slug));
  const autoServiceSlugs = new Set();
  for (const e of log) {
    const slug = capabilitySlugForRow({ ai_type: e.type, feature: e.location });
    if (slug && !knownServiceSlugs.has(slug)) autoServiceSlugs.add(slug);
  }
  for (const slug of autoServiceSlugs) {
    const entries = log.filter(e => capabilitySlugForRow({ ai_type: e.type, feature: e.location }) === slug);
    const cost = entries.reduce((s,e) => s + (e.cost||0), 0);
    const latencies = entries.filter(e=>e.latencyMs).map(e=>e.latencyMs);
    byService[slug] = {
      slug, name: humanizeSlug(slug), serviceType: 'ai', patterns: [], roadmap: 'now', autoDetected: true,
      total: entries.length, cost,
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
