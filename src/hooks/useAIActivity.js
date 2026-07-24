// DeepBench v6.3.134 | useAIActivity.js | LOG-36 -- pattern displays read from the log, not the static catalog
// DeepBench v6.1.43 | MarketIntelligenceScreen.jsx / useAIActivity.js | S-MI-42 -- two-tone indicator, final-timeline caption, streaming/agent-delegation catalog fixes
// DeepBench v6.0.21 | useAIActivity.js | S-MARKET-INTEL-01d — agent-delegation pattern catalog fix (replaces stale agent-orchestration), quality-gate/pipeline-triage/data-analysis patterns retrofit
// FEATURE: AI-14 — useAIActivity — byLLM + byAgent aggregations, reinforcement type, future tracking types
// FEATURE: AI-16 — logAICall Supabase persistence
// Module-level AI call log. Any component calls logAICall() to record.
// AIActivityPanel reads the same store — no context provider needed.

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase.js';
// FEATURE: LOG-36 -- PATTERN_CATALOG is no longer read by anything in this file; it is imported
// solely to keep the existing re-export alive for AIActivityPanel.jsx's Platform Roadmap section
// (LOG-56), which renders patterns precisely BECAUSE they have no logs and is out of scope here.
import { PATTERN_CATALOG, SERVICE_CATALOG, SERVICE_SLUG } from '../../shared/ai-patterns.js';
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

// FEATURE: LOG-36 -- PATTERN_NAME_BY_SLUG (AI-53, built from PATTERN_CATALOG) deleted. Every
// pattern NAME on every display now resolves through pattern_vocabulary first and humanizeSlug()
// second -- never through the static catalog. Falling back to a PATTERN_CATALOG name would be the
// legacy-slug reconciliation artifact ARCHITECTURE.md §19i's corollary bans outright.

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

// FEATURE: LOG-36 -- the log is the driver. The PATTERN_CATALOG seed loop that used to open this
// function (one zero-count bucket per static catalog entry, 24 of them, whether or not that pattern
// had ever run) is DELETED. A bucket now exists if and only if a real, trusted logged row named its
// slug -- so an empty ai_activity_log yields {} and zero rows on screen, which is exactly John's
// stated rule and ARCHITECTURE.md §19i's locked corollary ("read Layer A/log data as it currently
// exists, read Layer C as it currently exists, join them live"). `vocab` is Layer C: a
// Map<pattern_slug, name> from pattern_vocabulary (see usePatternVocabulary below), used for the
// NAME only. A slug with no vocabulary entry is humanized, never mapped, aliased, or special-cased.
export function computeByPattern(log, vocab = new Map()) {
  const byPattern = {};
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
      // FEATURE: LOG-36 -- this is now the ONLY bucket shape; every bucket is created here.
      // A governed slug (one pattern_vocabulary knows) takes its name and drops the
      // "not yet catalogued" caption; everything else is humanized and stays flagged
      // autoDetected, which is the honest signal that the WRITE path still stamps a
      // pre-2b slug (LOG-44..LOG-48), not a display defect to paper over.
      if (!byPattern[slug]) {
        const governedName = vocab.get(slug);
        byPattern[slug] = {
          slug,
          name: governedName || humanizeSlug(slug),
          desc: governedName ? null : 'Auto-detected — not yet catalogued',
          active: true,
          patternType: 'unknown',
          autoDetected: !governedName,
          total: 0,
          cost: 0,
        };
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

// FEATURE: LOG-21 -- classifyRow()/buildActivitySummary()/percentile() moved here from
// useAgents.js so both useAIActivity()'s own byAgent (all-time, unscoped) and
// useAgentActivitySummary() (MI screen's scoped/windowed drawer) run through the exact same
// aggregation core -- previously two independently hand-written implementations of the same
// per-row cost/latency/dedup math, which could silently drift out of sync (e.g. a future
// pairing-dedup fix landing in only one of the two copies). The two screens still query
// different scopes/time windows on purpose (see MI_LOOP_SCOPE/RECENCY_WINDOW_DAYS in
// useAgents.js) -- this does NOT make their totals reconcile, it only guarantees the shared
// math itself can never diverge again. Moved verbatim, byte-identical logic to before this move.

// FEATURE: MI-58 — percentile_cont-equivalent linear interpolation, matches the Postgres
// percentile_cont() semantics used to verify this fix's numbers against real data.
export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// FEATURE: S-MI-20 — classifies one ai_activity_log row into a display "kind" for the by-kind
// latency breakdown, and whether it should be counted there at all. turnTimestampsByAgent is a
// Map<agent_id, number[]> of every 'agent-turn' row's own created_at (ms) for that agent, built
// once per fetch, used only for the nearby-pairing check below.
export function classifyRow(row, turnTimestampsByAgent) {
  if (row.ai_type === 'agent-turn') {
    const intentSlug = row.feature ? row.feature.split(':')[1] : null;
    return { kind: intentSlug || row.feature || 'unknown', include: true };
  }
  if (CAPABILITY_WRAPPER_TYPES.has(row.ai_type) && row.feature === 'request-receivable') {
    const rowTime = new Date(row.created_at).getTime();
    const turnTimes = turnTimestampsByAgent.get(row.agent_id) || [];
    const paired = turnTimes.some(t => Math.abs(t - rowTime) < PAIR_WINDOW_MS);
    return { kind: row.ai_type, include: !paired };
  }
  return { kind: row.ai_type, include: true };
}

// FEATURE: AA-149 -- extracted from the fetchAll().then() callback so the aggregation math
// (now including per-model breakdown) is unit-testable without mocking Supabase/React. Same
// classifyRow()-driven kind bucketing as before, byte-identical output for every existing
// caller -- this only adds a new byModel sub-bucket inside each kind, never removes anything.
export function buildActivitySummary(scopedRows, turnTimestampsByAgent) {
  // FEATURE: AI-51 — dedup agent-turn rows paired with a same-agent capability-wrapper row
  // (see pairedAgentTurnIds()'s own comment above) before summing cost. Only
  // d.totalCost/d.costCount change below — classifyRow()'s own latency dedup is untouched.
  const paired = pairedAgentTurnIds(scopedRows);
  const map = {};
  for (const row of scopedRows) {
    if (!map[row.agent_id]) map[row.agent_id] = { calls: 0, totalCost: 0, costCount: 0, byKind: {} };
    const d = map[row.agent_id];
    d.calls++;
    const rowCost = paired.has(row.id) ? 0 : (row.cost_usd != null
      ? parseFloat(row.cost_usd)
      : computeCallCost(row.model, row.input_tokens, row.output_tokens));
    if (rowCost != null && !paired.has(row.id)) { d.totalCost += rowCost; d.costCount++; }

    const { kind, include } = classifyRow(row, turnTimestampsByAgent);
    if (!include) continue;
    if (!d.byKind[kind]) d.byKind[kind] = { calls: 0, totalLatency: 0, latencyCount: 0, maxLatency: null, byModel: {} };
    const k = d.byKind[kind];
    k.calls++;
    if (row.latency_ms) {
      k.totalLatency += row.latency_ms;
      k.latencyCount++;
      k.maxLatency = k.maxLatency == null ? row.latency_ms : Math.max(k.maxLatency, row.latency_ms);
    }

    // FEATURE: MI-72a -- parallel per-agent, per-pattern bucket (byPattern), gated by the same
    // `include` flag classifyRow() already returns so a row excluded from byKind as a duplicate
    // wrapper row is also excluded here. Unlike byKind (one row -> one kind), a single row can
    // carry multiple patterns (row.patterns_used is an array) -- it contributes to every pattern
    // bucket in that array, not just one. Zero visible effect this session -- MI-72b renders it.
    if (Array.isArray(row.patterns_used)) {
      if (!d.byPattern) d.byPattern = {};
      for (const patternSlug of row.patterns_used) {
        if (!d.byPattern[patternSlug]) {
          d.byPattern[patternSlug] = { calls: 0, totalLatency: 0, latencyCount: 0, maxLatency: null };
        }
        const p = d.byPattern[patternSlug];
        p.calls++;
        if (row.latency_ms) {
          p.totalLatency += row.latency_ms;
          p.latencyCount++;
          p.maxLatency = p.maxLatency == null ? row.latency_ms : Math.max(p.maxLatency, row.latency_ms);
        }
      }
    }

    if (row.ai_type === 'agent-turn') {
      const depthSeg = row.feature ? row.feature.split(':')[2] : null;
      if (depthSeg && /^depth\d+$/.test(depthSeg) && row.latency_ms) {
        if (!k.byDepth) k.byDepth = {};
        if (!k.byDepth[depthSeg]) k.byDepth[depthSeg] = { calls: 0, latencies: [] };
        k.byDepth[depthSeg].calls++;
        k.byDepth[depthSeg].latencies.push(row.latency_ms);
      }
    }

    const modelKey = row.model || 'unknown';
    if (!k.byModel[modelKey]) k.byModel[modelKey] = { calls: 0, totalLatency: 0, latencyCount: 0, maxLatency: null };
    const km = k.byModel[modelKey];
    km.calls++;
    if (row.latency_ms) {
      km.totalLatency += row.latency_ms;
      km.latencyCount++;
      km.maxLatency = km.maxLatency == null ? row.latency_ms : Math.max(km.maxLatency, row.latency_ms);
    }
  }
  Object.values(map).forEach(d => {
    d.avgCost = d.costCount ? d.totalCost / d.costCount : null;
    Object.values(d.byKind).forEach(k => {
      k.avgLatency = k.latencyCount ? Math.round(k.totalLatency / k.latencyCount) : null;
      Object.values(k.byModel).forEach(km => {
        km.avgLatency = km.latencyCount ? Math.round(km.totalLatency / km.latencyCount) : null;
      });
      // FEATURE: CHI-10 — bumped from p75 to p90 (John's call, found live 2026-07-16: a p75-based
      // estimate is, by definition, exceeded by ~25% of real runs — too loose for a user-facing "you'll
      // wait about this long" signal). p90 tightens that to ~10%. Same percentile_cont-equivalent
      // interpolation (percentile(), unchanged) — only the target quantile and this field's name change.
      Object.values(k.byDepth || {}).forEach(bd => {
        bd.p90 = percentile(bd.latencies, 0.90);
        delete bd.latencies;
      });
    });
    // FEATURE: MI-72a -- finalize byPattern's avgLatency, mirroring byKind's own finalization above.
    Object.values(d.byPattern || {}).forEach(p => {
      p.avgLatency = p.latencyCount ? Math.round(p.totalLatency / p.latencyCount) : null;
    });
  });
  return map;
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
  // FEATURE: CHI-33 -- api/fetch-article.js's fallback path is hand-rolled, not capability-
  // dispatched (same reason brief.js needs its own BRIEF_AI_TYPE_FEATURE map), so 'fallback-summary'
  // needs an explicit entry here rather than relying on the `|| e.type` fallback other capabilities
  // get for free.
  'fallback-summary': SERVICE_SLUG.ARTICLE_EXTRACTION,
  // FEATURE: SCA-1 -- lib/conversations.js's writeConversationTurn()/queryConversations() log
  // feature: 'conversation-memory-write'/'conversation-memory-retrieval' (aiType stays 'similarity'
  // on both calls). Mirrors knowledge-retrieval's existing entry shape per this session's kickoff doc.
  'conversation-memory-write':     'conversation-memory',
  'conversation-memory-retrieval': 'conversation-memory',
};

// FEATURE: LOG-12 -- agent-turn rows always carry their real capability as the first ':'-delimited
// segment of `feature` (logAgentTurn()'s own format, execute.js) -- reading it directly is generic
// and never goes stale, unlike a maintained list. Fixes byService dumping every non-terminal
// delegation-loop turn into the generic 'agent-turn' bucket instead of its real capability
// (found live 2026-07-16: 4 of Owen's 5 real quality-gate review calls were invisible under
// "Quality Gate," landing in "Agent Turn" instead).
export function capabilitySlugForRow({ ai_type, feature }) {
  const rawSlug = (ai_type === 'agent-turn' && feature) ? feature.split(':')[0] : ai_type;
  // FEATURE: SCA-1 -- feature-level override, checked before the ai_type-based resolution below.
  // Closes a real misattribution gap found during this session's own Task 3 verification: Conversations
  // writes/retrievals (lib/conversations.js) always log ai_type: 'similarity' (already mapped to
  // 'knowledge-retrieval'), so the two conversation-memory-* AI_TYPE_TO_SERVICE entries were unreachable
  // dead code -- real calls would misattribute to Knowledge Retrieval forever. Additive and safe for
  // every existing row: today's `feature` values ('knowledge-retrieval', 'db-assembly', etc.) are not
  // themselves keys in AI_TYPE_TO_SERVICE, so this branch only fires for feature values that already
  // have their own explicit entry -- currently only the two new conversation-memory-* rows.
  if (feature && AI_TYPE_TO_SERVICE[feature]) return AI_TYPE_TO_SERVICE[feature];
  return AI_TYPE_TO_SERVICE[rawSlug] || rawSlug;
}

// FEATURE: LOG-14 -- title-cases a kebab-case slug for an auto-detected catalog fallback label.
// Same one-line shape as MarketIntelligenceScreen.jsx's local formatKindLabel() (not imported --
// that function is screen-local and this is a different call site; duplicating one pure one-line
// formatter is not worth a new shared module for two callers).
// FEATURE: LOG-36 -- exported: it is now the platform-wide last resort for every pattern name
// (By Pattern, By Service, Channel Intelligence's routing lines and per-agent rollup), so all four
// display sites degrade identically instead of each inventing its own fallback.
export function humanizeSlug(slug) {
  if (typeof slug !== 'string' || slug.length === 0) return '';
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

// FEATURE: LOG-36 -- Layer C (the governed vocabulary) read, exposed as ONE shared hook.
// AIActivityPanel.jsx reaches it through useAIActivity(); MarketIntelligenceScreen.jsx does not call
// useAIActivity() at all and calls this directly -- a second private fetch in that screen would be
// the duplicate-functionality violation the Architect Review checks for, so there is deliberately
// only this one implementation. Selects pattern_slug + name only (the display needs nothing else).
// pattern_vocabulary has RLS off, so the ordinary anon client can read it with no policy work.
// On error: warn and resolve to an EMPTY map -- every display then degrades to humanizeSlug().
// It must never fall back to PATTERN_CATALOG names (§19i corollary).
const EMPTY_VOCAB = new Map();
let _vocabCache = null;
let _vocabPromise = null;

export function fetchPatternVocabulary() {
  if (_vocabCache) return Promise.resolve(_vocabCache);
  if (!_vocabPromise) {
    _vocabPromise = supabase
      .from('pattern_vocabulary')
      .select('pattern_slug, name')
      .then(({ data, error }) => {
        if (error) {
          console.warn('[pattern vocabulary] read failed:', error.message);
          _vocabPromise = null; // allow a later mount to retry; never cache a failure
          return EMPTY_VOCAB;
        }
        _vocabCache = new Map((data || []).map(r => [r.pattern_slug, r.name]));
        return _vocabCache;
      });
  }
  return _vocabPromise;
}

export function usePatternVocabulary() {
  const [vocab, setVocab] = useState(() => _vocabCache || EMPTY_VOCAB);
  const [loading, setLoading] = useState(() => !_vocabCache);
  useEffect(() => {
    let cancelled = false;
    fetchPatternVocabulary().then(v => {
      if (cancelled) return;
      setVocab(v);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  return { vocab, loading };
}

export function useAIActivity() {
  const [log, setLog] = useState([..._log]);
  useEffect(() => {
    _listeners.push(setLog);
    return () => { _listeners = _listeners.filter(fn => fn !== setLog); };
  }, []);
  // FEATURE: LOG-36 -- Layer C names for both pattern display sites in this hook (byPattern and
  // byService's observed-pattern list). Cached module-level, so this is one read per page load.
  const { vocab } = usePatternVocabulary();

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

  // FEATURE: LOG-21 -- byAgent now runs through the same buildActivitySummary() core
  // useAgentActivitySummary() (useAgents.js) uses for calls/cost, instead of an independently
  // hand-written loop -- so a future cost/dedup fix can never land in only one of the two
  // implementations again. Adapts this hook's already-normalized `log` entries back into the
  // raw-row shape buildActivitySummary()/pairedAgentTurnIds() expect; safe to re-run pairing on
  // already-hydrate-time-resolved cost values since the dedup result is idempotent (the same
  // rows pair the same way every time on identical input). avgLatency is still computed
  // directly here (blended across all kinds, unconditional on latency_ms) to match this flat
  // display shape exactly -- byte-identical semantics to the pre-LOG-21 inline loop, asserted
  // in the Node test below. Output shape ({agentId, calls, cost, avgLatency}) is unchanged --
  // AIActivityPanel.jsx (agentsSorted) is not touched this session.
  const rawRowsForAgentSummary = log
    .filter(e => e.agentId)
    .map(e => ({
      id: e.id, agent_id: e.agentId, ai_type: e.type, feature: e.location,
      model: e.model, latency_ms: e.latencyMs, cost_usd: e.cost,
      input_tokens: e.tokens, output_tokens: null, created_at: e.ts,
    }));
  const turnTimestampsByAgentForSummary = new Map();
  for (const row of rawRowsForAgentSummary) {
    if (row.ai_type !== 'agent-turn') continue;
    if (!turnTimestampsByAgentForSummary.has(row.agent_id)) turnTimestampsByAgentForSummary.set(row.agent_id, []);
    turnTimestampsByAgentForSummary.get(row.agent_id).push(new Date(row.created_at).getTime());
  }
  const agentSummary = buildActivitySummary(rawRowsForAgentSummary, turnTimestampsByAgentForSummary);
  const byAgent = {};
  for (const [agentId, d] of Object.entries(agentSummary)) {
    const allLatencies = rawRowsForAgentSummary.filter(r => r.agent_id === agentId && r.latency_ms).map(r => r.latency_ms);
    byAgent[agentId] = {
      agentId,
      calls: d.calls,
      cost: d.totalCost,
      avgLatency: allLatencies.length ? Math.round(allLatencies.reduce((a,b)=>a+b,0)/allLatencies.length) : null,
    };
  }

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
    // FEATURE: LOG-36 -- WHICH patterns appear here was already log-driven (AI-53, observedSlugs
    // comes from real patternsUsed); only the NAME was catalog-sourced. Same resolution order as
    // By Pattern now: pattern_vocabulary -> humanizeSlug -> raw slug.
    const observedSlugs = [...new Set(entries.flatMap(e => Array.isArray(e.patternsUsed) ? e.patternsUsed : []))];
    const observedPatterns = observedSlugs.map(slug => vocab.get(slug) || humanizeSlug(slug) || slug);
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
  // FEATURE: LOG-36 -- vocab passed in for name resolution; the log alone decides which buckets exist.
  const byPattern = computeByPattern(log, vocab);

  const servicesActive = Object.values(byService).filter(s => s.total > 0).length;
  // FEATURE: LOG-36 -- replaces patternsActiveCount/patternsCatalogTotal (both derived from the
  // static catalog, so the old "X/24" stat could never go to zero no matter what the log said).
  // This is simply how many patterns have logs right now.
  const patternsLoggedCount = Object.keys(byPattern).length;

  // FEATURE: AI-23 patch — sorted arrays for dynamic section rendering
  // Services: primary sort = type order (ai→hybrid→logic), secondary = calls desc
  const SERVICE_TYPE_ORDER = { ai: 0, hybrid: 1, logic: 2 };
  const servicesSorted = Object.values(byService).sort((a, b) => {
    const tDiff = SERVICE_TYPE_ORDER[a.serviceType] - SERVICE_TYPE_ORDER[b.serviceType];
    if (tDiff !== 0) return tDiff;
    return b.total - a.total;
  });

  // Patterns: sorted by calls desc, one flat order.
  // FEATURE: LOG-36 -- the `a.active !== b.active` tiebreak is deleted: with the catalog seed loop
  // gone, every bucket came from a real logged call, so `active` no longer distinguishes anything.
  const patternsSorted = Object.values(byPattern).sort((a, b) => b.total - a.total);

  // Agents: sorted by calls desc
  const agentsSorted = Object.values(byAgent).sort((a, b) => b.calls - a.calls);

  const modelsInUse = Object.values(byLLM).filter(d => d.calls > 0).length;
  const totalCost = log.reduce((s,e)=>s+(e.cost||0),0);
  const totalCalls = log.length;

  return { log, byType, byLLM, byAgent, byService, byPattern, servicesActive, servicesCatalogTotal: SERVICE_CATALOG.length, patternsLoggedCount, modelsInUse, totalCost, totalCalls, servicesSorted, patternsSorted, agentsSorted };
}

export { MODEL_PROVIDER };
