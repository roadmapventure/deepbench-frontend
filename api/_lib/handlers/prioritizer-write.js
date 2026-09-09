// DeepBench v7.0.428 | api/_lib/handlers/prioritizer-write.js | AGT-63 -- The Prioritizer's write
// handler: a classification ruling or a board ordering becomes rows on `backlog_items`, under a
// reversible `runner_decisions` row.
// FEATURE: AGT-63 -- dispatched generically via format_contract.handler === 'prioritizer-write',
// the same registry pattern as report-card-write.js / pattern-vocabulary-write.js / library-lookup.js
// (the HANDLERS map in api/prompt/request-receivable.js). This file performs no agent-id check of
// its own -- ownership is enforced by which Skill Profile sets handler: 'prioritizer-write' in the
// first place (only pz-classify-intent and pz-rank-intent do), never by a conditional here.
//
// TWO PAYLOAD SHAPES, ONE HANDLER, and which one runs is read off the CONTENT, never off the
// capability slug -- a slug conditional in a handler is the determinism .claude/rules/
// capabilities-are-data.md forbids one file up. `ranked` present => the rank shape; otherwise the
// classify shape.
//
// THE ORDER OF THE THREE WRITES IS LOAD-BEARING AND IS NOT THE OBVIOUS ONE.
//   1. record_decision() FIRST, for its id.
//   2. runner_before_images, carrying `decision_id`.
//   3. the UPDATE.
// §19v says the before-image precedes the write, and it still does. The decision has to precede
// BOTH because reverse_decision() selects the images to restore by `bi.decision_id = p_decision`
// (read out of pg_get_functiondef this session, not recalled): an image written without that
// column is invisible to John's Reverse, so the write would be recorded and un-undoable.
//
// AND THE UPDATE DELIBERATELY DOES NOT WRITE `updated_at`. There is no updated_at trigger on
// backlog_items (only backlog_done_requires_verdict, BEFORE UPDATE OF status), so leaving the
// column alone is what actually keeps it alone. SES-316 re-pointed reverse_decision()'s
// written-since guard at the decision's own `decided_at`; record_decision() runs in its own
// transaction here (one REST call per statement), so an `updated_at = now()` set a few
// milliseconds later would sort AFTER decided_at and reverse_decision() would refuse every row
// this handler ever touched, reporting `refused_written_since`. Do not "tidy" it back in.
//
// FAIL CLOSED ON THE WHOLE PAYLOAD, NEVER ROW BY ROW. Every class string is validated against
// ^P([1-9]|10) - before anything is written, and one bad value refuses the entire ruling. A
// partially-applied ranking is worse than a refused one: the board would carry an order nobody
// decided. The refusal is RETURNED as the handler result rather than thrown, so the model's turn
// is still logged and the reason reaches the audit instead of a 500.
//
// NEVER writes `status` or `queue`. `status` is the runner's own lifecycle (and carries a verdict
// trigger); `queue` is computed by recompute_backlog_queue(), which the rank shape calls rather
// than emulating.

import { logActivity } from '../../../lib/activity-log.js';

// The named-class form John ratified (FEATURES.md legend, 2026-08-20). Same regex as the DB's own
// ck_backlog_supports_class_form, deliberately restated here because priority_class carries NO
// constraint of its own -- this handler is the only gate a bare digit ever meets.
const CLASS_FORM = /^P([1-9]|10) - /;
// runner_decisions.backlog_id's own CHECK. Validated here so a malformed id is a returned refusal
// rather than a 400 from Postgres halfway through.
const BACKLOG_ID_FORM = /^[A-Z]+-[0-9]+[a-z]?$/;

function refuse(reason) {
  return { deliverable_id: null, handler_result: { written: false, refused: true, reason } };
}

async function rest(supabaseUrl, supabaseHeaders, path, init = {}) {
  const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...supabaseHeaders, ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`prioritizer-write: ${init.method || 'GET'} ${path} failed: ${r.status} ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

// The attribution half of ck_decision_attribution / ck_before_image_attribution: exactly one of
// cycle_id / session_name. A capability execution has no runner_cycles row to point at, so it is
// always the session_name side, and the trace is what makes two rulings on the same ticket
// distinguishable in the ledger.
function sessionNameFor(handler_context) {
  const tag = handler_context?.trace_id || handler_context?.cycle_id || handler_context?.session_name;
  return `prioritizer:${tag || 'untraced'}`;
}

async function recordDecision(supabaseUrl, supabaseHeaders, { sessionName, backlogId, summary, reasoning }) {
  const rows = await rest(supabaseUrl, supabaseHeaders, 'rpc/record_decision', {
    method: 'POST',
    body: JSON.stringify({
      p_cycle_id: null,
      p_session_name: sessionName,
      p_kind: 'classification',
      p_backlog_id: backlogId,
      p_summary: summary,
      p_reasoning: reasoning,
    }),
  });
  const id = typeof rows === 'string' ? rows : rows?.id ?? rows;
  if (!id || typeof id !== 'string') throw new Error('prioritizer-write: record_decision returned no id');
  return id;
}

async function beforeImage(supabaseUrl, supabaseHeaders, { sessionName, row, decisionId }) {
  await rest(supabaseUrl, supabaseHeaders, 'runner_before_images', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      cycle_id: null,
      session_name: sessionName,
      table_name: 'backlog_items',
      pk_value: row.id,
      row_data: row,
      decision_id: decisionId,
    }),
  });
}

// One line the ledger can be read back from without re-running anything, and the claim refs are
// carried verbatim -- the Prioritizer's own citation is the reasoning, never a paraphrase of it.
function reasoningLine(refs, fallback) {
  const cited = Array.isArray(refs) ? refs.filter(r => typeof r === 'string' && r.trim()) : [];
  return cited.length ? `cites ${cited.join(', ')}. ${fallback}` : fallback;
}

async function handleClassify({ agent_id, content, supabaseUrl, supabaseHeaders, sessionName, startTime }) {
  const { backlog_id, priority_class, supports_class, supports_reason, type, claim_refs, confidence } = content;

  if (typeof backlog_id !== 'string' || !BACKLOG_ID_FORM.test(backlog_id)) {
    return refuse(`backlog_id ${JSON.stringify(backlog_id)} is not a backlog id of the form ABC-123`);
  }
  if (typeof priority_class !== 'string' || !CLASS_FORM.test(priority_class)) {
    return refuse(`priority_class ${JSON.stringify(priority_class)} is not a named class -- the full form ("P10 - Tooling") is required, never a bare digit`);
  }
  if (supports_class !== null && supports_class !== undefined) {
    if (typeof supports_class !== 'string' || !CLASS_FORM.test(supports_class)) {
      return refuse(`supports_class ${JSON.stringify(supports_class)} is not a named class -- the full form is required, never a bare digit`);
    }
    if (typeof supports_reason !== 'string' || supports_reason.trim() === '') {
      return refuse('supports_class was given with no supports_reason -- the board stores the reason with the class (ck_backlog_supports_reason_with_class)');
    }
  }

  const rows = await rest(supabaseUrl, supabaseHeaders, `backlog_items?backlog_id=eq.${encodeURIComponent(backlog_id)}&select=*`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return refuse(`no backlog_items row with backlog_id ${backlog_id}`);

  const namedSupport = supports_class ? `serves ${supports_class}` : 'serves none';
  const decisionId = await recordDecision(supabaseUrl, supabaseHeaders, {
    sessionName,
    backlogId: backlog_id,
    summary: `${backlog_id} classed ${priority_class}, ${namedSupport}`,
    reasoning: reasoningLine(claim_refs, `${backlog_id}: ${row.priority_class || '(unclassed)'} -> ${priority_class}, ${namedSupport}. ${supports_reason || 'no served class named'} (confidence ${confidence || 'unstated'}).`),
  });

  await beforeImage(supabaseUrl, supabaseHeaders, { sessionName, row, decisionId });

  // `type` is written only when the ruling actually names one -- a null must not blank a stored
  // type, and ck_backlog_type_when_promoted refuses an empty one on a promoted ticket anyway.
  const patch = {
    priority_class,
    supports_class: supports_class ?? null,
    supports_reason: supports_class ? supports_reason : null,
  };
  if (typeof type === 'string' && type.trim() !== '') patch.type = type;

  await rest(supabaseUrl, supabaseHeaders, `backlog_items?id=eq.${encodeURIComponent(row.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });

  logActivity({
    tenantId: 'global',
    agentId: agent_id,
    aiType: 'deterministic',
    feature: 'prioritizer:classify-write',
    latencyMs: Date.now() - startTime,
    callFacts: {
      prioritizer_shape: 'classify',
      tickets_written: 1,
      priority_class_written: true,
      supports_class_written: Boolean(supports_class),
      type_written: Object.prototype.hasOwnProperty.call(patch, 'type'),
    },
  });

  return {
    deliverable_id: null,
    handler_result: {
      written: true,
      shape: 'classify',
      backlog_id,
      decision_id: decisionId,
      previous: { priority_class: row.priority_class ?? null, supports_class: row.supports_class ?? null, type: row.type ?? null },
      applied: patch,
    },
  };
}

async function handleRank({ agent_id, content, supabaseUrl, supabaseHeaders, sessionName, startTime }) {
  const ranked = content.ranked;
  if (!Array.isArray(ranked) || ranked.length === 0) return refuse('ranked must be a non-empty array');

  const seen = new Set();
  for (const entry of ranked) {
    if (!entry || typeof entry !== 'object') return refuse('every ranked entry must be an object');
    if (typeof entry.backlog_id !== 'string' || !BACKLOG_ID_FORM.test(entry.backlog_id)) {
      return refuse(`ranked entry backlog_id ${JSON.stringify(entry?.backlog_id)} is not a backlog id of the form ABC-123`);
    }
    if (!Number.isInteger(entry.automation_rank) || entry.automation_rank < 1) {
      return refuse(`ranked entry ${entry.backlog_id} carries automation_rank ${JSON.stringify(entry.automation_rank)} -- an integer >= 1 is required`);
    }
    if (seen.has(entry.backlog_id)) return refuse(`ranked names ${entry.backlog_id} more than once`);
    seen.add(entry.backlog_id);
  }

  const ids = ranked.map(e => e.backlog_id);
  const rows = await rest(supabaseUrl, supabaseHeaders,
    `backlog_items?backlog_id=in.(${ids.map(encodeURIComponent).join(',')})&select=*`);
  const byId = new Map((rows || []).map(r => [r.backlog_id, r]));
  const missing = ids.filter(id => !byId.has(id));
  if (missing.length) return refuse(`no backlog_items row for: ${missing.join(', ')}`);

  const decisionId = await recordDecision(supabaseUrl, supabaseHeaders, {
    sessionName,
    // NULL, not the first ticket: a ranking is a decision about a SET, and naming one member of it
    // would make the ledger read as a ruling on that ticket alone.
    backlogId: null,
    summary: `board ordered: ${ranked.length} ticket(s) given an automation_rank`,
    reasoning: ranked.map(e => `${e.backlog_id} -> ${e.automation_rank}: ${e.reason || 'no reason given'}`).join('; '),
  });

  for (const entry of ranked) {
    const row = byId.get(entry.backlog_id);
    await beforeImage(supabaseUrl, supabaseHeaders, { sessionName, row, decisionId });
    await rest(supabaseUrl, supabaseHeaders, `backlog_items?id=eq.${encodeURIComponent(row.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ automation_rank: entry.automation_rank }),
    });
  }

  // The board's own recompute, never a hand-rolled queue write -- `queue` is that function's
  // output and this handler is forbidden to author it.
  await rest(supabaseUrl, supabaseHeaders, 'rpc/recompute_backlog_queue', { method: 'POST', body: '{}' });

  logActivity({
    tenantId: 'global',
    agentId: agent_id,
    aiType: 'deterministic',
    feature: 'prioritizer:rank-write',
    latencyMs: Date.now() - startTime,
    callFacts: { prioritizer_shape: 'rank', tickets_written: ranked.length, queue_recomputed: true },
  });

  return {
    deliverable_id: null,
    handler_result: {
      written: true,
      shape: 'rank',
      decision_id: decisionId,
      ranked: ranked.map(e => ({ backlog_id: e.backlog_id, automation_rank: e.automation_rank })),
    },
  };
}

export async function handle({ agent_id, tenant_id, content, supabaseUrl, supabaseHeaders, handler_context }) {
  const startTime = Date.now();
  if (!content || typeof content !== 'object') return refuse('no structured output to write');

  const sessionName = sessionNameFor(handler_context);
  const args = { agent_id, tenant_id, content, supabaseUrl, supabaseHeaders, sessionName, startTime };

  return Object.prototype.hasOwnProperty.call(content, 'ranked')
    ? handleRank(args)
    : handleClassify(args);
}
