// DeepBench v6.3.186 | src/lib/tracePatterns.js | LOG-95b -- needsSpanRefetch(): bounded span-miss refetch decision (§19p read side); a span still absent after the retry budget is honestly unclassified (§19l), never polled unboundedly
// DeepBench v6.3.184 | src/lib/tracePatterns.js | LOG-95 -- pickCreditedSpan(): which endpoint's span a streamed delegation-family event's drawer row credits (§19p); pure, JSX-free, Node-importable
// DeepBench v6.3.166 | src/lib/tracePatterns.js | LOG-79 -- per-hop governed pattern names from
// the ai_call_patterns view (the Log Displayer, ARCHITECTURE.md §19k/§19l), joined to a trace's
// own ai_activity_log rows via trace_id -> id/span_id. Extracted as a JSX-free sibling module
// (LOG-83/resolveAgent.js precedent) so the Node regression test can import buildSpanPatternMap
// under plain `node` without parsing MarketIntelligenceScreen.jsx.
//
// No pattern names, slugs, or per-pattern branches live here (.claude/rules/ai-pattern-signature.md):
// the view's pattern_name IS the governed vocabulary name; this module only joins and groups.
// A span whose rows match no gold pattern is ABSENT from the map (no empty-array fabrication) --
// the drawer expresses "unclassified" structurally by rendering no line at all.

import { supabase } from './supabase.js';

// LOG-95 (§19p) -- which endpoint's span a streamed delegation-family event's drawer row
// credits: delegation_complete rows credit toAgentId (to_span_id); delegation and
// delegation_return rows credit fromAgentId (from_span_id). Pure; null-safe; never fabricates.
export function pickCreditedSpan(evt) {
  if (!evt || typeof evt !== 'object') return { trace_id: null, span_id: null };
  const span = evt.type === 'delegation_complete' ? evt.to_span_id : evt.from_span_id;
  return { trace_id: evt.trace_id ?? null, span_id: span ?? null };
}

// LOG-95b -- bounded span-miss refetch decision (§19p read side). A span absent from the map
// after maxTries refetches is honestly unclassified (§19l) -- stop, never poll unboundedly.
export function needsSpanRefetch(map, spanId, tries, maxTries = 3) {
  if (spanId == null || !map || typeof map !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(map, spanId)) return false;
  return tries < maxTries;
}

// Pure. activityRows: [{ id, span_id }] (a trace's ai_activity_log rows); patternRows:
// [{ ai_activity_log_id, pattern_name }] (the Displayer view's matches for those ids).
// Returns { [span_id]: [unique pattern_name, ...] } -- names deduped, insertion-ordered.
// Rows with a null/undefined span_id are skipped (pre-LOG-49 history has no span identity).
export function buildSpanPatternMap(activityRows, patternRows) {
  const namesByLogId = new Map();
  for (const row of patternRows || []) {
    if (row.pattern_name == null) continue;
    const names = namesByLogId.get(row.ai_activity_log_id) || [];
    names.push(row.pattern_name);
    namesByLogId.set(row.ai_activity_log_id, names);
  }
  const map = {};
  for (const row of activityRows || []) {
    if (row.span_id == null) continue;
    const names = namesByLogId.get(row.id);
    if (!names || names.length === 0) continue; // no view match -> span absent, never []
    const bucket = map[row.span_id] || (map[row.span_id] = []);
    for (const name of names) {
      if (!bucket.includes(name)) bucket.push(name);
    }
  }
  return map;
}

async function fetchActivityRows(traceId) {
  const { data, error } = await supabase
    .from('ai_activity_log')
    .select('id, span_id')
    .eq('trace_id', traceId);
  if (error) throw error;
  return data || [];
}

// Fetch the span->pattern-names map for one trace. On any error: warn + return {} (the LOG-38
// fetch posture -- the drawer just shows no pattern lines, never a fabricated fallback).
// Rows are written before the response returns, so an empty first read is belt-and-braces only:
// one delayed retry (~1500ms), then give up.
export async function fetchTracePatterns(traceId) {
  try {
    if (!traceId) return {};
    let activityRows = await fetchActivityRows(traceId);
    if (activityRows.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      activityRows = await fetchActivityRows(traceId);
      if (activityRows.length === 0) return {};
    }
    const ids = activityRows.map(row => row.id);
    const { data, error } = await supabase
      .from('ai_call_patterns')
      .select('ai_activity_log_id, pattern_name')
      .in('ai_activity_log_id', ids);
    if (error) throw error;
    return buildSpanPatternMap(activityRows, data || []);
  } catch (e) {
    console.warn('[tracePatterns] fetch failed for trace', traceId, e?.message || e);
    return {};
  }
}
