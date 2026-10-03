// DeepBench v7.0.415 | api/_lib/handlers/report-card-write.js | LOG-143 (a) -- Owen Marsh's
// bench_report_cards write handler: the judge's structured card becomes one row per (trace_id, agent_id).
// FEATURE: LOG-143 -- dispatched generically via format_contract.handler === 'report-card-write',
// same registry pattern as pattern-vocabulary-write.js/library-lookup.js/reasoning-write.js (the
// HANDLERS map in api/prompt/request-receivable.js). This file performs no agent-id check of its
// own -- ownership is enforced by which Skill Profile sets handler: 'report-card-write' in the
// first place (only report-card-intent does), not by a conditional here.
// NEVER OPENS the_library. The groundedness dimension needs chunk TEXT, which only Eleanor Voss --
// The Librarian may read (ARCHITECTURE.md §19c, .claude/rules/library-access.md); this handler
// stores a score it is given and reads nothing but its own table.

import { logActivity } from '../../../lib/activity-log.js';
import { getRequestContext } from '../../../lib/request-context.js';

// The three rubric dimensions. NULL is a real value here and never a zero (C-rejected-17/18): a
// dimension the run's inputs could not support is stored NULL with the reason in `evidence`, so a
// blank cell reads as "not measurable" rather than "measured as bad". Anything that is not an
// integer 0-5 degrades to NULL rather than throwing -- a malformed score must not cost the whole
// card, and the table's own CHECK constraints are the backstop either way.
const DIMENSIONS = ['delegation_fit', 'groundedness', 'skill_use'];

function toScore(v) {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isInteger(v)) return null;
  return v >= 0 && v <= 5 ? v : null;
}

export async function handle({ agent_id, tenant_id, content, supabaseUrl, supabaseHeaders }) {
  const startTime = Date.now();
  const card = content || {};

  const { trace_id } = card;
  if (!trace_id) throw new Error('report-card-write handler: trace_id required in structured output');
  // The graded agent, not the grader. The judge names the answering agent in its own output; the
  // `agent_id` parameter is Owen (whoever holds the judging capability), and storing that instead
  // would make every card in the table read as a card about Owen -- Rule #1's read-side twin.
  const gradedAgentId = card.agent_id || null;
  if (!gradedAgentId) throw new Error('report-card-write handler: agent_id (the answering agent) required in structured output');

  const row = {
    tenant_id: tenant_id || 'global',
    trace_id,
    agent_id: gradedAgentId,
    capability_slug: card.capability_slug || null,
    intent_slug: card.intent_slug || null,
    evidence: card.evidence ?? null,
    skill_to_improve: card.skill_to_improve || null,
    // FEATURE: LOG-143 -- deliberately NULL from this write path, and this is a measured fact
    // rather than an omission. The kickoff specified "stamp it from the request context's last
    // logged row"; there is no such thing. lib/activity-log.js's logActivity() writes with
    // `Prefer: return=minimal` and returns undefined (no id is ever handed back), and
    // lib/request-context.js carries no last-row field. More decisively, the ORDERING forbids it:
    // request-receivable.js dispatches this handler at its STEP 3 and writes the judge's own
    // model-turn ai_activity_log row at STEP 4, so at the moment this code runs the row does not
    // exist yet and cannot be pointed at. Storing the newest 'bench-report-card' row for this
    // trace would therefore stamp some EARLIER run's judge, which is worse than blank. The link
    // that does work is the one already stored: join ai_activity_log on trace_id + ai_type =
    // 'bench-report-card' at read time. The column stays for whichever part moves the write after
    // STEP 4 or threads the id in; until then blank is the honest value.
    judge_activity_id: null,
    // FEATURE: LOG-121 -- attribution is stored, never exposed: anon/authenticated hold a
    // column-list SELECT on this table that omits visitor_id (.claude/rules/supabase-column-grants.md).
    visitor_id: getRequestContext().visitorId ?? null,
  };
  for (const d of DIMENSIONS) row[d] = toScore(card[d]);

  // Upsert on the table's own UNIQUE (trace_id, agent_id): re-judging a run replaces that run's
  // card rather than accumulating a second opinion nothing would know how to rank.
  const r = await fetch(
    `${supabaseUrl}/rest/v1/bench_report_cards?on_conflict=trace_id,agent_id`,
    {
      method: 'POST',
      headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(row),
    }
  );

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`report-card-write handler: bench_report_cards upsert failed: ${r.status} ${text}`);
  }

  const rows = await r.json();
  const cardId = Array.isArray(rows) ? rows[0]?.id : rows?.id;
  if (!cardId) throw new Error('report-card-write handler: no id returned from bench_report_cards upsert');

  // FEATURE: LOG-143 -- STANDARDS.md Section 11 / .claude/rules/capability-logging.md: deterministic
  // work logs its own row with execution + latency, no tokens and no cost. agent_id is the GRADED
  // agent for the same reason the row above stores it -- this row is a fact about that run.
  // call_facts carries the shape of what was stored, which is what makes an all-unknown card
  // visible in the audit rather than looking like a card that simply scored badly.
  logActivity({
    tenantId: tenant_id || 'global',
    agentId: gradedAgentId,
    aiType: 'deterministic',
    feature: 'bench-report-card:write',
    latencyMs: Date.now() - startTime,
    traceId: trace_id,
    callFacts: {
      report_card_stored: true,
      unknown_dimensions: DIMENSIONS.filter(d => row[d] === null),
      skill_to_improve_named: row.skill_to_improve !== null,
    },
  });

  return { deliverable_id: null, handler_result: { card_id: cardId, trace_id, agent_id: gradedAgentId } };
}
