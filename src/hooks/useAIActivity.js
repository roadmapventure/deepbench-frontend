// DeepBench v7.0.45 | useAIActivity.js | LOG-129 -- buildByDevice(): a third cut of the SAME By Platform User row set (Desktop/Mobile/Unknown), a pure aggregate across every caller and source rather than something nested inside them, returned from the hook as `byDevice` beside bySource/byCaller and reconciling with both by construction
// DeepBench v7.0.43 | useAIActivity.js | LOG-127 -- By Platform User stops over-merging callers: the fourth, host-derived bucket is gone (exactly three -- a known caller's name, Public, Unattributed) and the hardcoded production-host constant with it; identity donation now folds a cookie-less `ui` row only into the ONE visitor seen at its address+host, never regression/script traffic and never a row carrying its own different visitor id
// DeepBench v7.0.39 | useAIActivity.js | LOG-121 -- By Platform User: buildBySource()/buildByCaller() (two reconciling cuts of one row set) + the known_callers/ip_org_cache read; LOG-124 -- hydrateFromSupabase() stops asking for '*' and reads caller_ip_masked, never the raw address
// DeepBench v7.0.15 | useAIActivity.js | HAR-02a -- computeCallCost() gains optional cache-token params (creation 1.25x input rate, read 0.1x); the two row-based read-time call sites pass the new ai_activity_log columns. Historical rows (NULL fields) and every omitting caller price byte-identically
// DeepBench v6.3.218 | useAIActivity.js | LOG-112 -- buildActivitySummary() stops reading the frozen legacy patterns_used field: its per-agent byPattern bucket is replaced by a plain `rows` list of each included row's id + latency, and the new exported buildAgentPatternRows() joins those ids to the VERIFIED pattern names the Log Displayer derived at read time (ai_pattern_classification_rollup.log_ids, LOG-97's existing read -- no new query). An agent whose rows matched no gold pattern gets no buckets at all
// DeepBench v6.3.211 | useAIActivity.js | CHI-90 -- buildActivitySummary()'s per-agent `calls` is now gated by isCountableCall(), so the CHI Agents drawer counts real model calls exactly as AI Audit's byAgent does; the raw every-logged-row count it used to hold moves to a new `operations` field (drives the drawer's active/potential split only, never rendered)
// DeepBench v6.3.204 | useAIActivity.js | LOG-91 -- AI-51 timestamp-pairing heuristic scoped to the pre-trace legacy window (PAIR_LEGACY_CUTOFF_MS); the write path no longer produces agent-turn/wrapper duplicates, so fresh rows are never paired
// DeepBench v6.3.203 | useAIActivity.js | LOG-81 -- every AI Audit count is real model calls only (isCountableCall gates Total Calls/By Agent/By LLM/By Pattern); By Service stays operations-based by design (§12)
// DeepBench v6.3.191 | useAIActivity.js | LOG-97 -- By Pattern cost summed from the hydrated log via rollup log_ids (no new query; dedup-consistent with Total Cost)
// DeepBench v6.3.188 | useAIActivity.js | LOG-98 -- honest loading state: rolling tile counters + shimmer skeletons, no false zeros/empty states
// DeepBench v6.3.170 | useAIActivity.js | LOG-92 -- hydrateFromSupabase default = all tenants (null tenantId skips the filter; audit surface shows every real model call)
// DeepBench v6.3.159 | useAIActivity.js | S-AI-AUDIT-SVCDIR -- Platform Services directory (platform_services) fetch + read-time join, unregistered detection, per-agent capability nesting (ARCHITECTURE.md §19m)
// DeepBench v6.3.158 | useAIActivity.js | LOG-80 -- By LLM: null model no longer fabricated to Haiku; computeByLLM() extracted + alias-normalized so each model appears once
// DeepBench v6.3.155 | useAIActivity.js | LOG-38 -- Log Displayer read path: classification rollup + single reclassification count
// DeepBench v6.3.134 | useAIActivity.js | LOG-36 -- pattern displays read from the log, not the static catalog
// DeepBench v6.1.43 | MarketIntelligenceScreen.jsx / useAIActivity.js | S-MI-42 -- two-tone indicator, final-timeline caption, streaming/agent-delegation catalog fixes
// DeepBench v6.0.21 | useAIActivity.js | S-MARKET-INTEL-01d — agent-delegation pattern catalog fix (replaces stale agent-orchestration), quality-gate/pipeline-triage/data-analysis patterns retrofit
// FEATURE: AI-14 — useAIActivity — byLLM + byAgent aggregations, reinforcement type, future tracking types
// FEATURE: AI-16 — logAICall Supabase persistence
// Module-level AI call log. Any component calls logAICall() to record.
// AIActivityPanel reads the same store — no context provider needed.

import { useState, useEffect, useMemo } from "react";
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

// FEATURE: LOG-91 -- the write path stopped producing agent-turn/wrapper duplicates in
// v6.3.204, and the provable historical pairs (trace era, >= this date) were merged away.
// The timestamp-pairing heuristic below only remains valid for the pre-trace era it can't
// be proven against -- scoping it here stops it from ever wrongly pairing a fresh
// single-record wrapper row (api/plan.js path) with an unrelated same-agent turn.
export const PAIR_LEGACY_CUTOFF_MS = Date.parse('2026-07-16T00:00:00Z');

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
// Map<pattern_slug, {name, description}> from pattern_vocabulary (see usePatternVocabulary below).
// A slug with no vocabulary entry is humanized, never mapped, aliased, or special-cased.
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
        const governed = vocab.get(slug);
        byPattern[slug] = {
          slug,
          name: governed?.name || humanizeSlug(slug),
          // FEATURE: LOG-36 -- a governed pattern shows Susan Smith (Trainer)'s own researched,
          // citation-backed description straight from pattern_vocabulary.description. Fixed
          // 2026-07-23 after the first cut selected only (pattern_slug, name), which left the two
          // researched patterns rendering a blank line while the UNresearched ones still showed
          // "not yet catalogued" -- exactly backwards. Never falls back to PATTERN_CATALOG.desc.
          desc: governed?.description || (governed ? null : 'Auto-detected — not yet catalogued'),
          active: true,
          patternType: 'unknown',
          autoDetected: !governed,
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
      // FEATURE: LOG-91 -- only legacy-era wrapper rows participate in pairing; a fresh wrapper
      // row (api/plan.js path) is a single record by construction and must never absorb a turn.
      if (t >= PAIR_LEGACY_CUTOFF_MS) continue;
      if (!wrapperTimesByAgent.has(row.agent_id)) wrapperTimesByAgent.set(row.agent_id, []);
      wrapperTimesByAgent.get(row.agent_id).push(t);
    }
  }
  const paired = new Set();
  for (const row of rows) {
    if (row.ai_type !== 'agent-turn') continue;
    const rowTime = new Date(row.created_at).getTime();
    // FEATURE: LOG-91 -- post-cutoff agent-turn rows always count (never pairing candidates).
    if (rowTime >= PAIR_LEGACY_CUTOFF_MS) continue;
    const wrapperTimes = wrapperTimesByAgent.get(row.agent_id) || [];
    if (wrapperTimes.some(t => Math.abs(t - rowTime) < PAIR_WINDOW_MS)) {
      paired.add(row.id);
    }
  }
  return paired;
}

// FEATURE: LOG-81 -- the one definition of a countable call for every AI Audit count
// (header Total Calls, By Agent, By LLM, By Pattern denominators). A countable call names a
// model and is not the duplicate agent-turn half of an AI-51 pair. By Service deliberately
// does NOT use this -- it measures service usage (operations), deterministic included (§12).
// Entries pushed live by logAICall() never set isPairedDup -> undefined -> countable, which is
// correct: they are real calls made this session.
export function isCountableCall(e) {
  return !!e.model && !e.isPairedDup;
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
    // FEATURE: LOG-91 -- pairing is a legacy-window heuristic only; a post-cutoff wrapper row is
    // a single record by construction (the loop no longer writes a sibling) and always counts.
    if (rowTime >= PAIR_LEGACY_CUTOFF_MS) return { kind: row.ai_type, include: true };
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
    if (!map[row.agent_id]) map[row.agent_id] = { calls: 0, operations: 0, totalCost: 0, costCount: 0, byKind: {} };
    const d = map[row.agent_id];
    // FEATURE: CHI-90 -- `calls` is the displayed model-call count, the same definition
    // AI Audit's byAgent uses (LOG-81's isCountableCall). `operations` keeps the raw
    // every-logged-row count this field used to hold: it is what tells the CHI drawer an
    // agent did work on this screen at all, so an agent whose contribution is entirely
    // deterministic can never be labelled "not yet used on this screen" (Task 2).
    // isPairedDup is stamped by hydrateFromSupabase() for AI Audit's entries; here the
    // paired Set computed above is the equivalent per-row source.
    d.operations++;
    if (isCountableCall({ model: row.model, isPairedDup: paired.has(row.id) })) d.calls++;
    const rowCost = paired.has(row.id) ? 0 : (row.cost_usd != null
      ? parseFloat(row.cost_usd)
      // FEATURE: HAR-02a -- cache-token fields priced when present; null on historical rows = +0.
      : computeCallCost(row.model, row.input_tokens, row.output_tokens, row.cache_creation_input_tokens, row.cache_read_input_tokens));
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

    // FEATURE: LOG-112 -- the per-agent pattern breakdown no longer reads row.patterns_used:
    // that field is frozen legacy and is never read for classification
    // (.claude/rules/ai-pattern-signature.md, ARCHITECTURE.md §19k/§19l). This records only each
    // included row's identity and latency; the verified pattern NAME is joined on afterwards by
    // buildAgentPatternRows() from the Log Displayer rollup's log_ids. Position matters: staying
    // inside the `include` region preserves MI-72a's guarantee that a row excluded from byKind as
    // a duplicate wrapper half is excluded here too.
    if (!d.rows) d.rows = [];
    d.rows.push({ id: row.id, latencyMs: row.latency_ms || null });

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
  });
  return map;
}

// FEATURE: LOG-112 -- joins an agent's included rows to the VERIFIED pattern names the Log
// Displayer derived at read time, carried on ai_pattern_classification_rollup.log_ids (the
// array LOG-97 already rides in on the read that happens anyway -- no new query, and never a
// direct ai_call_patterns read, which is what blew the anon 3s statement timeout on LOG-38's
// first attempt). No slugs, no per-pattern branches, no vocabulary lookup: the rollup's
// pattern_name IS the governed name, the same posture lib/tracePatterns.js already uses for
// the Agent Routing drawer. A row no gold pattern matched contributes to nothing at all --
// honest unclassified expressed structurally, never a fabricated or empty bucket (§19l).
export function buildAgentPatternRows(rows, patternNamesByLogId) {
  const out = {};
  for (const r of rows || []) {
    const names = patternNamesByLogId?.get(r.id);
    if (!names) continue;
    for (const name of names) {
      if (!out[name]) out[name] = { calls: 0, totalLatency: 0, latencyCount: 0, maxLatency: null };
      const p = out[name];
      p.calls++;
      if (r.latencyMs) {
        p.totalLatency += r.latencyMs;
        p.latencyCount++;
        p.maxLatency = p.maxLatency == null ? r.latencyMs : Math.max(p.maxLatency, r.latencyMs);
      }
    }
  }
  Object.values(out).forEach(p => {
    p.avgLatency = p.latencyCount ? Math.round(p.totalLatency / p.latencyCount) : null;
  });
  return out;
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

// ── Platform Services Directory (ARCHITECTURE.md §19m) ───────────────────────
// FEATURE: S-AI-AUDIT-SVCDIR -- the By Service display is driven by the platform_services
// Supabase table (31 seeded rows: what things ARE), joined at read time against ai_activity_log
// (what HAPPENED) via each service's match_keys. SERVICE_CATALOG survives above solely for the
// MCP/Platform Roadmap tier lists (rule: .claude/rules/platform-services-directory.md) -- the
// By Service display never reads it again. Numbers are never written into platform_services.

// Display order for the 8 layer groups (§19m's locked list).
export const SERVICE_LAYER_ORDER = ['scaffold', 'harness', 'loop', 'platform', 'data-model', 'deterministic', 'screen-invoked', 'frontend'];

// FEATURE: S-AI-AUDIT-SVCDIR -- module-level directory cache, same fetch/cache shape as
// fetchPatternVocabulary() above (one read per page load, retry allowed after a failure,
// never cache a failure). platform_services has RLS off (verified this session), so the
// ordinary anon client reads it with no policy work.
let _svcDirCache = null;
let _svcDirPromise = null;

export function fetchPlatformServices() {
  if (_svcDirCache) return Promise.resolve(_svcDirCache);
  if (!_svcDirPromise) {
    _svcDirPromise = supabase
      .from('platform_services')
      .select('slug, name, layer, functions, utilizes_model, tracking_status, match_keys, code_anchor, display_note, sort_order')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.warn('[platform services] directory read failed:', error.message);
          _svcDirPromise = null; // allow a later mount to retry; never cache a failure
          return [];
        }
        _svcDirCache = data || [];
        return _svcDirCache;
      });
  }
  return _svcDirPromise;
}

export function usePlatformServiceDirectory() {
  const [directory, setDirectory] = useState(() => _svcDirCache || []);
  useEffect(() => {
    let cancelled = false;
    fetchPlatformServices().then(d => { if (!cancelled) setDirectory(d); });
    return () => { cancelled = true; };
  }, []);
  return directory;
}

// FEATURE: S-AI-AUDIT-SVCDIR -- capability directory (agent_capability_assignments + the
// capabilities slug→name lookup), fetched once per page load, same cache shape as above.
// Capabilities are data, never services (§19b/§19m) -- they display under their Agent.
let _capDirCache = null;
let _capDirPromise = null;
const EMPTY_CAP_DIR = { assignments: [], nameBySlug: new Map() };

export function fetchCapabilityDirectory() {
  if (_capDirCache) return Promise.resolve(_capDirCache);
  if (!_capDirPromise) {
    _capDirPromise = Promise.all([
      supabase.from('agent_capability_assignments').select('agent_id, capability_slug'),
      supabase.from('capabilities').select('slug, name'),
    ]).then(([a, c]) => {
      if (a.error || c.error) {
        console.warn('[capability directory] read failed:', (a.error || c.error).message);
        _capDirPromise = null; // allow a later mount to retry
        return EMPTY_CAP_DIR;
      }
      _capDirCache = {
        assignments: a.data || [],
        nameBySlug: new Map((c.data || []).map(r => [r.slug, r.name])),
      };
      return _capDirCache;
    });
  }
  return _capDirPromise;
}

export function useCapabilityDirectory() {
  const [capDir, setCapDir] = useState(() => _capDirCache || EMPTY_CAP_DIR);
  useEffect(() => {
    let cancelled = false;
    fetchCapabilityDirectory().then(d => { if (!cancelled) setCapDir(d); });
    return () => { cancelled = true; };
  }, []);
  return capDir;
}

// FEATURE: S-AI-AUDIT-SVCDIR -- match_keys matcher. Built once per compute pass from the
// directory rows; keys are either {feature: <head>} or {ai_type: <slug>}.
export function buildServiceMatcher(directory) {
  const byFeature = new Map();
  const byAiType = new Map();
  for (const svc of directory || []) {
    for (const key of (Array.isArray(svc.match_keys) ? svc.match_keys : [])) {
      if (key.feature) byFeature.set(key.feature, svc.slug);
      else if (key.ai_type) byAiType.set(key.ai_type, svc.slug);
    }
  }
  return { byFeature, byAiType };
}

// FEATURE: S-AI-AUDIT-SVCDIR -- resolves one hydrated log entry ({type, location}) to a
// directory service slug, or null when no directory row claims it. Precedence per §19m: a
// feature-key match beats an ai_type-only match (e.g. a `feature: web-memory` row logged with
// ai_type 'reinforcement' counts under Web Memory, never double-counts into Knowledge
// Writer's `ai_type: reinforcement` match). The feature is compared against the ':'-head of
// the entry's location (agent-turn features are 'capability:intent:depthN' composites).
export function platformServiceForRow(entry, matcher) {
  const head = (typeof entry.location === 'string' && entry.location.length > 0)
    ? entry.location.split(':')[0]
    : null;
  if (head && matcher.byFeature.has(head)) return matcher.byFeature.get(head);
  if (matcher.byAiType.has(entry.type)) return matcher.byAiType.get(entry.type);
  return null;
}

// FEATURE: S-AI-AUDIT-SVCDIR -- the RAW capability-shaped slug for an entry: agent-turn rows
// carry their capability as the feature head (logAgentTurn()'s format, same read LOG-12's
// capabilitySlugForRow() starts from); every other row's ai_type IS its raw slug. Exposed
// separately because capabilitySlugForRow() then remaps through AI_TYPE_TO_SERVICE -- and two
// of those legacy remaps ('project-manager'→'task-planning' via AI-41, and the ci_*→
// 'channel-intelligence' aliases) sit BETWEEN a row and its real assigned capability. The
// capability-nesting and unregistered checks below must see the raw slug first, or Michelle
// Manning (Project Manager)'s entire project-manager capability would resolve to the
// nonexistent-capability 'task-planning' and flood the unregistered line (~3.3k rows,
// confirmed against live data this session).
export function rawCapabilitySlugForRow(entry) {
  return (entry.type === 'agent-turn' && typeof entry.location === 'string' && entry.location.length > 0)
    ? entry.location.split(':')[0]
    : entry.type;
}

// FEATURE: S-AI-AUDIT-SVCDIR -- per-service read-time join. Returns the 8 layer groups in
// SERVICE_LAYER_ORDER (any unknown layer appended last rather than dropped), each service in
// sort_order, with calls/cost/avgLatency computed from its matched log entries. Only
// tracked/partial services carry stats -- machinery/self/untracked render per their
// tracking_status + display_note and get nulls here (their match_keys are empty anyway, so
// nothing double-counts).
export function computePlatformServices(log, directory) {
  const matcher = buildServiceMatcher(directory);
  const stats = new Map();
  for (const e of log) {
    const slug = platformServiceForRow(e, matcher);
    if (!slug) continue;
    if (!stats.has(slug)) stats.set(slug, { calls: 0, cost: 0, totalLatency: 0, latencyCount: 0 });
    const s = stats.get(slug);
    s.calls += 1;
    s.cost += e.cost || 0; // reuses the per-entry cost hydrateFromSupabase() already resolved (incl. AI-51 pairing dedup)
    if (e.latencyMs) { s.totalLatency += e.latencyMs; s.latencyCount += 1; }
  }
  const byLayer = new Map();
  for (const svc of directory || []) {
    const hasStats = svc.tracking_status === 'tracked' || svc.tracking_status === 'partial';
    const s = stats.get(svc.slug);
    const row = {
      slug: svc.slug,
      name: svc.name,
      layer: svc.layer,
      functions: Array.isArray(svc.functions) ? svc.functions : [],
      utilizesModel: !!svc.utilizes_model,
      trackingStatus: svc.tracking_status,
      displayNote: svc.display_note || null,
      sortOrder: svc.sort_order,
      calls: hasStats ? (s ? s.calls : 0) : null,
      cost: hasStats ? (s ? s.cost : 0) : null,
      avgLatency: (hasStats && s && s.latencyCount) ? Math.round(s.totalLatency / s.latencyCount) : null,
    };
    if (!byLayer.has(svc.layer)) byLayer.set(svc.layer, []);
    byLayer.get(svc.layer).push(row);
  }
  const orderedLayers = [
    ...SERVICE_LAYER_ORDER,
    ...[...byLayer.keys()].filter(l => !SERVICE_LAYER_ORDER.includes(l)),
  ];
  return orderedLayers
    .filter(layer => byLayer.has(layer))
    .map(layer => ({
      layer,
      services: byLayer.get(layer).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    }));
}

// FEATURE: S-AI-AUDIT-SVCDIR -- §19m self-maintenance: activity matching no directory row AND
// not attributable to an assigned capability aggregates into explicit unregistered lines
// (slug + call count), never silently dropped. A row escapes "unregistered" if EITHER its raw
// slug or its capabilitySlugForRow() resolution is an assigned capability -- the raw check
// covers capabilities the legacy AI_TYPE_TO_SERVICE remap would misdirect (see
// rawCapabilitySlugForRow()'s comment), the resolved check covers legacy aliases (ci_answer/
// ci_routing → channel-intelligence, quality_gate_review → quality-gate) that only the remap
// can attribute correctly.
export function computeUnregisteredServices(log, directory, assignedCapabilitySlugs) {
  const matcher = buildServiceMatcher(directory);
  const counts = new Map();
  for (const e of log) {
    if (platformServiceForRow(e, matcher)) continue;
    const raw = rawCapabilitySlugForRow(e);
    const resolved = capabilitySlugForRow({ ai_type: e.type, feature: e.location });
    if (assignedCapabilitySlugs.has(raw) || assignedCapabilitySlugs.has(resolved)) continue;
    const slug = resolved || raw || 'unknown';
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([slug, calls]) => ({ slug, calls }))
    .sort((a, b) => b.calls - a.calls || a.slug.localeCompare(b.slug));
}

// FEATURE: S-AI-AUDIT-SVCDIR -- By Agent capability nesting. Groups each agent's log entries
// by their capability slug (raw slug first, then the capabilitySlugForRow() resolution --
// same two-level read as computeUnregisteredServices(), for the same AI-41-remap reason) and
// keeps only groups that are REAL capabilities (a `capabilities` row exists), so service
// activity an agent performed (e.g. Eleanor Voss (The Librarian)'s librarian rows -- Library
// Custodian's numbers) never masquerades as a capability. Unions in the agent's ASSIGNED
// capabilities so a never-logged assignment still appears with zero activity ("no activity
// yet"). Returns { [agentId]: [{slug, name, calls, cost, avgLatency}] } sorted calls desc.
export function computeByAgentCapabilities(log, assignments, nameBySlug) {
  const grouped = new Map(); // agentId -> Map<capSlug, {calls, cost, totalLatency, latencyCount}>
  for (const e of log) {
    if (!e.agentId) continue;
    const raw = rawCapabilitySlugForRow(e);
    const resolved = capabilitySlugForRow({ ai_type: e.type, feature: e.location });
    const capSlug = nameBySlug.has(raw) ? raw : (nameBySlug.has(resolved) ? resolved : null);
    if (!capSlug) continue;
    if (!grouped.has(e.agentId)) grouped.set(e.agentId, new Map());
    const caps = grouped.get(e.agentId);
    if (!caps.has(capSlug)) caps.set(capSlug, { calls: 0, cost: 0, totalLatency: 0, latencyCount: 0 });
    const g = caps.get(capSlug);
    g.calls += 1;
    g.cost += e.cost || 0;
    if (e.latencyMs) { g.totalLatency += e.latencyMs; g.latencyCount += 1; }
  }
  const agentIds = new Set([...grouped.keys(), ...(assignments || []).map(a => a.agent_id)]);
  const out = {};
  for (const agentId of agentIds) {
    const caps = grouped.get(agentId) || new Map();
    for (const a of assignments || []) {
      if (a.agent_id === agentId && !caps.has(a.capability_slug)) {
        caps.set(a.capability_slug, { calls: 0, cost: 0, totalLatency: 0, latencyCount: 0 });
      }
    }
    out[agentId] = [...caps.entries()]
      .map(([slug, g]) => ({
        slug,
        name: nameBySlug.get(slug) || humanizeSlug(slug),
        calls: g.calls,
        cost: g.cost,
        avgLatency: g.latencyCount ? Math.round(g.totalLatency / g.latencyCount) : null,
      }))
      .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name));
  }
  return out;
}

// ── By Platform User (LOG-121 part b) ────────────────────────────────────────
// FEATURE: LOG-121 -- who set the platform's AI calls off, in two cuts of ONE row set: By Source
// (what kind of caller) and By Caller (which caller). They are built from the same rows through the
// same identity resolution, so their totals reconcile by construction rather than by convention --
// and the Node test asserts it rather than trusting it.
//
// FEATURE: LOG-124 -- everything below reads `caller_ip_masked`, the generated blurred copy
// (136.60.33.12 -> xxx.xx.33.12), never the real column. `ai_activity_log` has RLS off and this hook
// reads it straight from the browser with the anon key that ships in the public bundle, so a real
// address in this path is a real address published to every visitor. The true value keeps being
// logged exactly as part `a` writes it and stays readable with the service key; what changed is only
// who may read it. Nothing here may reconstruct, un-blur, or re-request the real address.

// FEATURE: LOG-127 -- exactly three buckets, split by WHO, never by which URL: a known caller's own
// name, `Public` for everyone else, and `Unattributed` for a row that can't even prove a real
// request happened. The fourth bucket this replaces (an internal-QA label, selected by comparing a
// row's host against a hardcoded production-host constant) split "everyone else" by which deployment
// the request hit -- a distinction that was never asked for. That constant went with it; it had no
// other consumer anywhere in the repo.
const PUBLIC_CALLER = 'Public';
const UNATTRIBUTED = 'Unattributed';

// FEATURE: LOG-124 -- mirrors the generated column's own expression so a value that arrives already
// blurred is returned untouched (idempotent), and any address reaching this module by another route
// is blurred here rather than rendered. Never the inverse: there is no un-mask.
export function maskIp(ip) {
  if (typeof ip !== 'string') return null;
  const v = ip.trim();
  if (!v) return null;
  if (v.startsWith('xxx.') || v.startsWith('xxxx:')) return v; // already blurred
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v)) return v.replace(/^\d{1,3}\.\d{1,3}\./, 'xxx.xx.');
  return `xxxx:${v.slice(-9)}`;
}

// A row's blurred address, whichever shape it arrives in (a hydrated log entry carries
// caller_ip_masked; a raw fixture may carry the unblurred column, which is blurred on the way past).
function ipKeyOf(row) {
  return maskIp(row?.caller_ip_masked ?? row?.caller_ip ?? null);
}

// FEATURE: LOG-121 -- identity resolution, most specific first (the order is John's, locked in the
// kickoff): a known_callers match on visitor_id, then one on the address, then the single
// unambiguous cookie-gap fold below, then Public/Unattributed.
//
// The third step is what keeps the `visitor_id IS NULL` rows honest. NULL there does not mean
// "unknown person" -- part `a` deliberately logs NULL on the request that MINTS a visitor cookie,
// and on every request from a client that refuses cookies. Those rows must group by address, never
// be dropped and never be collapsed into one anonymous lump.
//
// FEATURE: LOG-127 -- that third step is now narrow. It used to be `derivedNameByIp`: any row
// sharing an address with ANY known_callers-labelled row inherited that name, with no check on the
// row's own visitor id or call_source. Live, that painted one QA label onto 210 calls from the
// regression driver plus 2 other distinct, real, unidentified visitors at John's home address. The
// corrected rule folds a cookie-less `ui` row into the one browser identity already seen at its
// exact address+host pair, and only when that pair has EXACTLY ONE distinct visitor id on record.
// Two or more is precisely the case where donation must not guess, so no entry is recorded for that
// pair at all and the row stays in its own address-keyed bucket. It never fires for a row that
// already carries its own (different) visitor id, and never for non-`ui` traffic --
// regression/script/session-test is not a visit and must never inherit a human name. Strictly
// narrower than what shipped: it can only ever reduce the set of rows a name applies to.
function buildIdentityIndex(rows, known, orgs) {
  const nameByVisitor = new Map();
  const nameByIp = new Map();
  for (const k of known || []) {
    if (!k || !k.display_name || k.match_value == null) continue;
    if (k.match_type === 'visitor_id') nameByVisitor.set(String(k.match_value), k.display_name);
    else if (k.match_type === 'caller_ip') {
      const m = maskIp(String(k.match_value));
      if (m) nameByIp.set(m, k.display_name);
    }
  }
  const orgByIp = new Map();
  const cityByIp = new Map();
  for (const o of orgs || []) {
    const m = ipKeyOf(o);
    if (!m) continue;
    if (o.org && !orgByIp.has(m)) orgByIp.set(m, o.org);
    if (o.city && !cityByIp.has(m)) cityByIp.set(m, o.city);
  }
  // FEATURE: LOG-127 -- one pass over the rows: every real browser visitor ever seen at each
  // address+host pair. Only `ui` rows carrying their own visitor id count as evidence of a visit.
  const uiVisitorsByIpHost = new Map();
  for (const row of rows || []) {
    if (row?.call_source !== 'ui') continue;
    const vid = row?.visitor_id != null ? String(row.visitor_id) : null;
    if (!vid) continue;
    const m = ipKeyOf(row);
    if (!m) continue;
    const key = `${m}|${row.request_host || ''}`;
    let seen = uiVisitorsByIpHost.get(key);
    if (!seen) { seen = new Set(); uiVisitorsByIpHost.set(key, seen); }
    seen.add(vid);
  }
  // Derived from that, never from a second scan: only the pairs where exactly one visitor was ever
  // seen. A pair with 2+ distinct visitors gets no entry at all, which is what makes an ambiguous
  // address structurally unable to resolve to a guess.
  const soleVisitorByIpHost = new Map();
  for (const [key, seen] of uiVisitorsByIpHost) {
    if (seen.size === 1) soleVisitorByIpHost.set(key, [...seen][0]);
  }
  return { nameByVisitor, nameByIp, soleVisitorByIpHost, orgByIp, cityByIp };
}

// One row -> one caller. `key` is the grouping identity, `name` the source-level display name,
// `label` the caller-level one. Deliberately different: By Source answers "whose traffic is this"
// (a known caller's name / Public / Unattributed -- LOG-127: exactly three, never a fourth split by
// which host was hit), By Caller answers "which caller is this" and an anonymous group is named by
// its org, falling back to its blurred address so two of them can never merge on screen.
function identityForRow(row, idx) {
  const ip = ipKeyOf(row);
  const vid = row?.visitor_id != null ? String(row.visitor_id) : null;
  const host = row?.request_host || null;
  const org = ip ? idx.orgByIp.get(ip) || null : null;
  const city = ip ? idx.cityByIp.get(ip) || null : null;
  // Tier 1/2: an explicit known_callers label on THIS row's own visitor id or address always wins.
  const directLabel = (vid && idx.nameByVisitor.get(vid)) || (ip && idx.nameByIp.get(ip)) || null;
  if (directLabel) return { key: `name:${directLabel}`, name: directLabel, label: directLabel, ip, org, city };
  // Tier 3 (LOG-127): this row is genuinely the cookie-not-back-yet gap of ONE real visit -- fold it
  // into that visit, but only when the address+host has exactly one candidate. Never fires for a row
  // that already carries its own (different) visitor id, and never for non-'ui' traffic.
  if (!vid && row?.call_source === 'ui' && ip) {
    const soleVid = idx.soleVisitorByIpHost.get(`${ip}|${host || ''}`);
    if (soleVid) {
      const soleLabel = idx.nameByVisitor.get(soleVid);
      const name = soleLabel || PUBLIC_CALLER;
      const key = soleLabel ? `name:${soleLabel}` : `visitor:${soleVid}`;
      return { key, name, label: name, ip, org, city };
    }
  }
  // Unlabelled. A row with neither an address nor a visitor id is a pre-LOG-121 row: there is no
  // fact to attribute it with and none is derivable (§19i -- no backfill), so it says so plainly
  // instead of being guessed at or dropped.
  if (!ip && !vid) return { key: 'unattributed', name: UNATTRIBUTED, label: UNATTRIBUTED, ip: null, org: null, city: null };
  // FEATURE: LOG-127 -- a request carrying SOME host is Public whichever host it hit; only a row
  // with no host at all stays Unattributed, which is a genuinely different fact (we can't even prove
  // a real request happened), not a naming choice.
  const name = host ? PUBLIC_CALLER : UNATTRIBUTED;
  // A visitor id is a real identity even without a name; an address is the fallback grouping.
  return vid
    ? { key: `visitor:${vid}`, name, label: name, ip, org, city }
    : { key: `ip:${ip}`, name, label: org || ip, ip, org, city };
}

// Shared accumulation so the two sections cannot drift: `calls` counts real model calls through
// LOG-81's single isCountableCall() definition (matching the header's Total Calls tile), while
// `cost` sums every row (matching Total Cost -- AI-51 already zeroed the duplicate half at hydrate).
function accumulate(bucket, row) {
  if (isCountableCall(row)) bucket.calls += 1;
  bucket.cost += row.cost || 0;
  const t = row.ts ? Date.parse(row.ts) : NaN;
  if (!Number.isNaN(t)) {
    if (bucket._first == null || t < bucket._first) { bucket._first = t; bucket.firstSeen = row.ts; }
    if (bucket._last == null || t > bucket._last) { bucket._last = t; bucket.lastSeen = row.ts; }
  }
}

/**
 * FEATURE: LOG-121 -- By Source: one row per kind of caller. `ui` splits by resolved identity
 * ("UI — John", "UI — Public"), which is the drawer's whole point; every other
 * source renders as a single row, and a NULL call_source renders as Unattributed rather than
 * vanishing. Returns [{ source, calls, cost, pctCost, avgCost, lastSeen }].
 */
export function buildBySource(rows, known = [], orgs = []) {
  const idx = buildIdentityIndex(rows, known, orgs);
  const groups = new Map();
  let totalCost = 0;
  for (const row of rows || []) {
    const raw = row?.call_source || null;
    const source = raw === 'ui'
      ? `UI — ${identityForRow(row, idx).name}`
      : raw ? humanizeSlug(raw) : UNATTRIBUTED;
    if (!groups.has(source)) groups.set(source, { source, calls: 0, cost: 0, firstSeen: null, lastSeen: null, _first: null, _last: null });
    accumulate(groups.get(source), row);
    totalCost += row.cost || 0;
  }
  return [...groups.values()]
    .map(({ _first, _last, firstSeen, ...g }) => ({
      ...g,
      pctCost: totalCost > 0 ? g.cost / totalCost : 0,
      avgCost: g.calls > 0 ? g.cost / g.calls : null,
    }))
    .sort((a, b) => b.cost - a.cost || b.calls - a.calls || a.source.localeCompare(b.source));
}

/**
 * FEATURE: LOG-121 -- By Caller: one row per distinct caller, the same rows cut the other way.
 * Returns [{ label, device, org, city, calls, cost, firstSeen, lastSeen, ips[] }].
 */
export function buildByCaller(rows, known = [], orgs = []) {
  const idx = buildIdentityIndex(rows, known, orgs);
  const groups = new Map();
  for (const row of rows || []) {
    const id = identityForRow(row, idx);
    if (!groups.has(id.key)) {
      groups.set(id.key, {
        label: id.label, org: id.org, city: id.city, calls: 0, cost: 0,
        firstSeen: null, lastSeen: null, ips: [], _first: null, _last: null, _devices: new Map(),
      });
    }
    const g = groups.get(id.key);
    if (!g.org && id.org) g.org = id.org;
    if (!g.city && id.city) g.city = id.city;
    if (id.ip && !g.ips.includes(id.ip)) g.ips.push(id.ip);
    if (row.device_type) g._devices.set(row.device_type, (g._devices.get(row.device_type) || 0) + 1);
    accumulate(g, row);
  }
  return [...groups.values()]
    .map(({ _first, _last, _devices, ...g }) => ({
      ...g,
      // The device this caller mostly uses. Part `a`'s own accepted limit stands: desktop-vs-mobile
      // is reliable, tablet is not a category to trust (modern iPads send a desktop UA).
      device: [..._devices.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    }))
    .sort((a, b) => b.cost - a.cost || b.calls - a.calls || String(a.label).localeCompare(String(b.label)));
}

/**
 * FEATURE: LOG-129 -- By Device: a third cut of the SAME row set, pure aggregate across every
 * caller and source (John's explicit correction -- not nested per caller). Desktop/Mobile are
 * part a's own accepted device signal (sec-ch-ua-mobile / UA, never re-derived here); Unknown
 * covers every pre-LOG-121 historical row (no device_type was ever captured before Aug 1) plus
 * any row a future writer omits it from -- shrinks daily, same honesty pattern as Unattributed.
 * Returns [{ device, calls, cost, pctCost, avgCost, lastSeen }].
 */
export function buildByDevice(rows) {
  const groups = new Map();
  let totalCost = 0;
  for (const row of rows || []) {
    const device = row?.device_type === 'desktop' ? 'Desktop' : row?.device_type === 'mobile' ? 'Mobile' : 'Unknown';
    if (!groups.has(device)) groups.set(device, { device, calls: 0, cost: 0, firstSeen: null, lastSeen: null, _first: null, _last: null });
    accumulate(groups.get(device), row);
    totalCost += row.cost || 0;
  }
  return [...groups.values()]
    .map(({ _first, _last, firstSeen, ...g }) => ({
      ...g,
      pctCost: totalCost > 0 ? g.cost / totalCost : 0,
      avgCost: g.calls > 0 ? g.cost / g.calls : null,
    }))
    .sort((a, b) => b.cost - a.cost || b.calls - a.calls || a.device.localeCompare(b.device));
}

// FEATURE: LOG-121 -- the two small read-time tables behind the drawer, fetched once per page load
// with the same module-level cache shape as fetchCapabilityDirectory() above (never cache a
// failure). `known_callers` is the label table: adding a row there renames a caller on the next
// reload, with no deploy and no code change -- which is why the drawer never hardcodes a name.
// Both tables have RLS off, so the ordinary anon client reads them with no policy work.
const EMPTY_CALLER_DIR = { known: [], orgs: [] };
let _callerDirCache = null;
let _callerDirPromise = null;

export function fetchCallerDirectory() {
  if (_callerDirCache) return Promise.resolve(_callerDirCache);
  if (!_callerDirPromise) {
    _callerDirPromise = Promise.all([
      supabase.from('known_callers').select('match_type, match_value, display_name, note'),
      // FEATURE: LOG-124 -- the blurred column on BOTH sides of the join. The org cache's real
      // column is revoked from the anon key for the same reason the log's is.
      supabase.from('ip_org_cache').select('caller_ip_masked, org, city, region, country'),
    ]).then(([k, o]) => {
      if (k.error || o.error) {
        console.warn('[caller directory] read failed:', (k.error || o.error).message);
        _callerDirPromise = null; // allow a later mount to retry; never cache a failure
        return EMPTY_CALLER_DIR;
      }
      _callerDirCache = { known: k.data || [], orgs: o.data || [] };
      return _callerDirCache;
    });
  }
  return _callerDirPromise;
}

export function useCallerDirectory() {
  const [dir, setDir] = useState(() => _callerDirCache || EMPTY_CALLER_DIR);
  useEffect(() => {
    let cancelled = false;
    fetchCallerDirectory().then(d => { if (!cancelled) setDir(d); });
    return () => { cancelled = true; };
  }, []);
  return dir;
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

// FEATURE: LOG-98 -- the panel had no way to tell "still fetching" from "genuinely empty", so it
// rendered 0 / "no calls logged yet" for the several seconds the hydrate takes. Module-level (not
// hook state) to match _log's own lifetime: a re-opened panel already holds data and must NOT
// flash skeletons again.
let _hydrated = false;
export const isLogHydrated = () => _hydrated;

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
// FEATURE: HAR-02a -- optional cache-token params (Anthropic prompt caching, S-HAR-02b/c): cache
// creation bills at 1.25x the model's input rate, cache reads at 0.1x. Rows/callers without the
// fields (all historical rows, every caller that omits the params) price byte-identically to
// before -- the two new terms are exactly 0 when the params are null/undefined/0. Rates stay in
// the one existing per-model table (COST_PER_1K_INPUT/OUTPUT); no new rates constant.
export function computeCallCost(model, inputTokens, outputTokens, cacheCreationInputTokens = null, cacheReadInputTokens = null) {
  const resolvedModel = MODEL_ID_NORMALIZE[model] || model;
  const inRate = COST_PER_1K_INPUT[resolvedModel] ?? COST_PER_1K_INPUT[model];
  const outRate = COST_PER_1K_OUTPUT[resolvedModel] ?? COST_PER_1K_OUTPUT[model];
  if (inRate == null && outRate == null) return null;
  return ((inputTokens || 0) / 1000) * (inRate || 0)
    + ((cacheCreationInputTokens || 0) / 1000) * (inRate || 0) * 1.25
    + ((cacheReadInputTokens || 0) / 1000) * (inRate || 0) * 0.10
    + ((outputTokens || 0) / 1000) * (outRate || 0);
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
// FEATURE: LOG-92 -- tenantId null = all tenants (the AI Audit panel's read; John 2026-07-28:
// test-tenant calls are real model calls and belong on an audit surface). A non-null tenantId
// still scopes, preserving the original signature's behavior for any future scoped caller.
// FEATURE: LOG-98 -- the whole body is wrapped in try/finally so `_hydrated` flips and listeners
// are notified on EVERY exit path, success or the error early-return. A failed fetch must land the
// panel on its honest empty state, never leave skeletons spinning forever. The finally block is the
// single notify() for both paths.
export async function hydrateFromSupabase(tenantId = null) {
  try {
    const rows = [];
    let from = 0;
    while (true) {
      // FEATURE: LOG-124 -- an explicit projection replaces select('*'), and it is what makes the
      // column-level revoke safe: `*` expands server-side to every column including caller_ip, so a
      // single surviving `*` anywhere would 403 the whole audit the moment the grant is withdrawn.
      // Enumerated from the live table definition, not from memory -- omitting a column here does
      // not error, it silently blanks whatever metric consumed it. caller_ip_masked is listed;
      // caller_ip deliberately is not, and must never be added back.
      let q = supabase
        .from('ai_activity_log')
        .select('id,ai_type,feature,model,agent_id,input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens,latency_ms,knowledge_tier,cost_usd,patterns_used,created_at,call_source,caller_ip_masked,device_type,visitor_id,request_host')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (tenantId) q = q.eq('tenant_id', tenantId);
      const { data, error } = await q;

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
      model:     row.model || null,
      tokens:    row.input_tokens || 0,
      latencyMs: row.latency_ms || 0,
      tier:      row.knowledge_tier || null,
      location:  row.feature || '—',
      agentId:   row.agent_id || null,
      cost:      paired.has(row.id) ? 0 : (row.cost_usd != null
        ? parseFloat(row.cost_usd)
        // FEATURE: HAR-02a -- cache-token fields priced when present; null on historical rows = +0.
        : computeCallCost(row.model, row.input_tokens, row.output_tokens, row.cache_creation_input_tokens, row.cache_read_input_tokens)),
      patternsUsed: paired.has(row.id) ? [] : (row.patterns_used || []),
      ts:        row.created_at,
      // FEATURE: LOG-121 -- the five attribution fields keep their COLUMN names verbatim, against
      // this file's camelCase house style and deliberately so: buildBySource()/buildByCaller() then
      // read one shape whether they are handed hydrated entries or raw rows, instead of each caller
      // remembering to rename five fields (the SES-57 mirror-payload class of bug).
      call_source:      row.call_source || null,
      // FEATURE: LOG-124 -- the blurred copy only. The real address is never fetched, never held in
      // browser memory, and never rendered.
      caller_ip_masked: row.caller_ip_masked || null,
      device_type:      row.device_type || null,
      visitor_id:       row.visitor_id || null,
      request_host:     row.request_host || null,
      // FEATURE: LOG-81 -- stamped here so isCountableCall() can stay a pure per-entry predicate
      // (the pairing decision needs the whole row set, which only this hydrate pass has).
      isPairedDup: paired.has(row.id),
      _fromDB:   true,
    }));
  } finally {
    _hydrated = true;
    notify();
  }
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
      .select('pattern_slug, name, description')
      .then(({ data, error }) => {
        if (error) {
          console.warn('[pattern vocabulary] read failed:', error.message);
          _vocabPromise = null; // allow a later mount to retry; never cache a failure
          return EMPTY_VOCAB;
        }
        _vocabCache = new Map((data || []).map(r => [r.pattern_slug, { name: r.name, description: r.description }]));
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

// FEATURE: LOG-38 -- the Log Displayer read path. Section 1 = ai_pattern_classification_rollup
// (patterns whose pattern_vocabulary.criteria matched real logged signatures); Section 2 =
// ai_pattern_reclassification_count (single total of everything unmatched). The pattern NAME is
// derived in the view at read time (ARCHITECTURE.md §19k) -- this hook never classifies client-side.
export async function fetchPatternClassification() {
  try {
    const [rollup, recl] = await Promise.all([
      // FEATURE: LOG-97 -- log_ids rides along on this read that already happens (+~1%, no new
      // round trip). It is NOT a second query against ai_call_patterns -- that was the first
      // attempt, and it blew the anon role's 3s statement_timeout.
      supabase.from('ai_pattern_classification_rollup').select('pattern_slug, pattern_name, pattern_description, call_count, cost_sum, log_ids'),
      supabase.from('ai_pattern_reclassification_count').select('reclassification_count').single(),
    ]);
    if (rollup.error) throw rollup.error;
    if (recl.error) throw recl.error;
    const classified = (rollup.data || []).map(r => ({
      slug: r.pattern_slug,
      name: r.pattern_name,
      desc: r.pattern_description,
      total: r.call_count,
      cost: Number(r.cost_sum) || 0,
      logIds: r.log_ids || [],
      active: true,
    }));
    return { classified, reclassificationCount: recl.data?.reclassification_count ?? 0 };
  } catch (e) {
    console.warn('[LOG-38] pattern classification fetch failed; By Pattern section will show empty', e);
    return { classified: [], reclassificationCount: 0 };
  }
}

export function usePatternClassification(log = []) {
  const [state, setState] = useState({ classified: [], reclassificationCount: 0, loaded: false });
  useEffect(() => {
    let alive = true;
    fetchPatternClassification().then(r => { if (alive) setState({ ...r, loaded: true }); });
    return () => { alive = false; };
  }, []);

  // FEATURE: LOG-97 -- cost per pattern = sum of the hydrated log entries' own `cost` values, which
  // computeCallCost() derived from tokens at hydrate time and which hydrateFromSupabase() already
  // zeroed for AI-51-paired duplicates -- so these totals reconcile with Total Cost by construction.
  // The ids ride along on the rollup read that already happens (+~1%, no new round trip); the first
  // attempt at this feature paged ai_call_patterns separately and blew the anon 3s statement timeout.
  // Summing here rather than in SQL keeps computeCallCost() the single source of pricing truth and
  // inherits the AI-51 dedup for free (66% of request-routing's rows are paired duplicates -- a naive
  // SQL token-sum would report ~$26 against a ~$10 Total-Cost basis).
  // Per-source fallback, never all-or-nothing: no ids or no log => the view's own cost_sum, i.e.
  // exactly today's behavior. usePatternClassification() with no argument is unchanged.
  const costBySlug = useMemo(() => {
    if (!log.length) return new Map();
    const costById = new Map(log.map(e => [e.id, e.cost || 0]));
    const out = new Map();
    for (const p of state.classified) {
      if (!Array.isArray(p.logIds) || p.logIds.length === 0) continue;
      let sum = 0;
      for (const id of p.logIds) sum += costById.get(id) || 0;
      out.set(p.slug, sum);
    }
    return out;
  }, [log, state.classified]);

  // FEATURE: LOG-81 -- By Pattern counts real model calls too, derived client-side from the same
  // rollup log_ids LOG-97 already rides in on (no new query, no view change -- §19k keeps the views
  // plain). The view's own call_count still counts every classified log row, including the AI-51
  // duplicate agent-turn halves, so a classified pattern's displayed total must be re-derived
  // against the countable set. Same per-source fallback philosophy as costBySlug, never
  // all-or-nothing: a row with no ids, or a log that has not hydrated yet, keeps the view's number.
  const countableIds = useMemo(
    () => new Set(log.filter(isCountableCall).map(e => e.id)),
    [log]
  );

  const classified = useMemo(() => state.classified.map(p => {
    const derivable = log.length > 0 && Array.isArray(p.logIds) && p.logIds.length > 0;
    return {
      ...p,
      cost: costBySlug.has(p.slug) ? costBySlug.get(p.slug) : p.cost,
      total: derivable ? p.logIds.filter(id => countableIds.has(id)).length : p.total,
    };
  }), [state.classified, costBySlug, countableIds, log.length]);

  // FEATURE: LOG-81 -- "needing reclassification" = every countable call not covered by any
  // classified pattern. Union of the classified ids, never a sum: one call can carry multiple
  // patterns, and summing would subtract the overlap twice and under-report the remainder.
  // Invariant, by construction: distinct classified-countable ids + this = totalCalls.
  const reclassificationCount = useMemo(() => {
    if (log.length === 0) return state.reclassificationCount;
    const union = new Set();
    for (const p of state.classified) {
      if (!Array.isArray(p.logIds)) continue;
      for (const id of p.logIds) if (countableIds.has(id)) union.add(id);
    }
    return countableIds.size - union.size;
  }, [log.length, state.classified, state.reclassificationCount, countableIds]);

  return { ...state, classified, reclassificationCount };
}

// FEATURE: LOG-80 -- By LLM aggregation, extracted from useAIActivity()'s inline loop into an
// exported pure function so it is unit-testable, mirroring computeByPattern()'s shape. Two
// accuracy fixes fold in here (vs. the pre-LOG-80 inline loop): (1) the key is normalized through
// MODEL_ID_NORMALIZE first, so a legacy short-form id (claude-haiku-4-5, claude-sonnet-4-5) folds
// into its canonical model (claude-haiku-4-5-20251001, claude-sonnet-4-6) instead of splitting into
// a duplicate row; (2) a model-less row (row.model IS NULL -- deterministic librarian/directory
// lookups, no longer fabricated as 'claude-haiku-4-5' since Task 1) resolves to "unknown" and is
// dropped by the existing claude-/text-embedding- prefix filter, so it never appears as an LLM.
// All cost/tokensIn/latency + avgLatency math is byte-identical to the prior inline loop.
export function computeByLLM(log) {
  const byLLM = {};
  for (const e of log) {
    // FEATURE: LOG-81 -- real model calls only; also stops tokensIn double-counting (pair halves
    // carry identical tokens).
    if (!isCountableCall(e)) continue;
    const m = MODEL_ID_NORMALIZE[e.model] || e.model || "unknown";
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
  return byLLM;
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
  // FEATURE: S-AI-AUDIT-SVCDIR -- the two §19m directory reads (both cached module-level, one
  // Supabase read each per page load, same shape as usePatternVocabulary()'s cache).
  const serviceDirectory = usePlatformServiceDirectory();
  const { assignments: capabilityAssignments, nameBySlug: capabilityNameBySlug } = useCapabilityDirectory();
  // FEATURE: LOG-121 -- the By Platform User drawer's two read-time tables (cached module-level,
  // one Supabase read each per page load, same shape as the two directory reads above).
  const { known: knownCallers, orgs: ipOrgs } = useCallerDirectory();

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
  const byLLM = computeByLLM(log);

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
  // FEATURE: S-AI-AUDIT-SVCDIR -- per-agent capability nesting (Task 2). Purely additive: the
  // agent-level totals below still come from buildActivitySummary()'s LOG-21 shared core,
  // byte-identical to before -- only the new `.capabilities` key is added per agent.
  const capabilitiesByAgent = computeByAgentCapabilities(log, capabilityAssignments, capabilityNameBySlug);
  // FEATURE: LOG-81 -- calls = countable model calls; cost/avgLatency semantics unchanged.
  // Counted here, NOT inside buildActivitySummary() (shared with useAgents.js / CHI drawer).
  // An agent whose rows are all deterministic (e.g. agent-directory only) legitimately shows
  // calls: 0 while still appearing with its cost and capabilities -- expected, not filtered out.
  const countableCallsByAgent = {};
  for (const e of log) {
    if (!e.agentId || !isCountableCall(e)) continue;
    countableCallsByAgent[e.agentId] = (countableCallsByAgent[e.agentId] || 0) + 1;
  }
  const byAgent = {};
  for (const [agentId, d] of Object.entries(agentSummary)) {
    const allLatencies = rawRowsForAgentSummary.filter(r => r.agent_id === agentId && r.latency_ms).map(r => r.latency_ms);
    byAgent[agentId] = {
      agentId,
      calls: countableCallsByAgent[agentId] || 0,
      cost: d.totalCost,
      avgLatency: allLatencies.length ? Math.round(allLatencies.reduce((a,b)=>a+b,0)/allLatencies.length) : null,
      capabilities: capabilitiesByAgent[agentId] || [],
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
    const observedPatterns = observedSlugs.map(slug => vocab.get(slug)?.name || humanizeSlug(slug) || slug);
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
  // FEATURE: LOG-81 -- header "Total Calls" is real model calls, not log rows. totalCost above is
  // deliberately still every row: AI-51 already zeroed the duplicate half's cost at hydrate, and
  // deterministic rows cost nothing, so the sum is already correct and unchanged by this fix.
  const totalCalls = log.filter(isCountableCall).length;

  // FEATURE: S-AI-AUDIT-SVCDIR -- the §19m directory join (Task 1): layer-grouped services with
  // read-time stats, plus the self-maintaining unregistered aggregation. The assigned-capability
  // set is Task 2's own data, reused here so capability activity (counted under its Agent) is
  // never misreported as an unregistered service.
  const assignedCapabilitySlugs = new Set((capabilityAssignments || []).map(a => a.capability_slug));
  const platformServices = computePlatformServices(log, serviceDirectory);
  const unregisteredServices = computeUnregisteredServices(log, serviceDirectory, assignedCapabilitySlugs);
  const platformServiceCount = (serviceDirectory || []).length;
  const assignedCapabilityCount = assignedCapabilitySlugs.size;

  // FEATURE: LOG-121 -- the By Platform User drawer's two sections, built from the SAME `log` the
  // header tiles are built from, so their totals reconcile with Total Calls / Total Cost as well as
  // with each other. platformUserCount is the distinct-caller count behind the new stat tile.
  const bySource = buildBySource(log, knownCallers, ipOrgs);
  const byCaller = buildByCaller(log, knownCallers, ipOrgs);
  // FEATURE: LOG-129 -- the drawer's third section, from that same `log`: no directory input, because
  // device is a fact already on the row, not an identity to resolve. Same input = reconciles with the
  // two above and with the header tiles, with no extra wiring.
  const byDevice = buildByDevice(log);
  const platformUserCount = byCaller.length;

  // FEATURE: LOG-98 -- logLoaded is read at render time, not stored in hook state: notify()
  // already re-renders every consumer the moment hydration completes, so the value is never stale.
  return { log, logLoaded: isLogHydrated(), byType, byLLM, byAgent, byService, byPattern, servicesActive, servicesCatalogTotal: SERVICE_CATALOG.length, patternsLoggedCount, modelsInUse, totalCost, totalCalls, servicesSorted, patternsSorted, agentsSorted, platformServices, unregisteredServices, platformServiceCount, assignedCapabilityCount, bySource, byCaller, byDevice, platformUserCount };
}

export { MODEL_PROVIDER };
