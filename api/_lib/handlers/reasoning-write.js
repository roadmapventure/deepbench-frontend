// DeepBench v6.3.224 | api/_lib/handlers/reasoning-write.js | AGT-37 -- caller-supplied reference ids arrive on handler_context and become resolveReferenceIds()'s `supplied` argument, replacing HAR-21's placeholder null; the model is no longer asked for an id
// DeepBench v6.3.222 | api/_lib/handlers/reasoning-write.js | HAR-21 -- reference ids resolve through lib/claim-resolver.js; a malformed claim degrades to an honest empty link and is logged, never a 422
// DeepBench v6.3.112 | api/_lib/handlers/reasoning-write.js | DAT-7 -- graceful denial: status:422 + detail.tier instead of a bare throw
// DeepBench v6.0.13 | api/_lib/handlers/reasoning-write.js | S-APPLE-04b re-scope -- Nadia's the_reasoning write handler
// FEATURE: AA-104/AA-107 (ARCHITECTURE.md §19f) -- dispatched generically via format_contract.handler
// === 'reasoning-write', same registry pattern as library-write.js. Self-write, no Eleanor: Nadia is
// the_reasoning's Content-Owner, not routed through an arbitrating owner's broker -- this file performs
// no agent-identity check of its own, same reasoning as library-write.js's comment -- the Skill Profile
// that sets handler: 'reasoning-write' is what scopes access.
// FEATURE: HAR-21 -- corrected: the line above used to read "(only data-patch-execute-intent does)".
// Verified in Supabase this session -- traits->>'handler' = 'reasoning-write' returns TWO Skills,
// `data-patch-execute-intent` (Nadia Farouk -- Data Expert) and `reasoner-intent` (Elena Cho -- The
// Reasoner) -- so every rule in this file must serve both write paths generically, never be shaped
// around one of them.
// action: 'no_action' is a documented no-op -- nothing to record, same accepted-quirk shape as the
// pending_confirmation-with-nothing-to-approve behavior already accepted for this intent (S-APPLE-04b).

import { writeContent } from '../../../lib/search-harness.js';
import { resolveReferenceIds } from '../../../lib/claim-resolver.js';
import { logActivity } from '../../../lib/activity-log.js';

export async function handle({ agent_id, tenant_id, content, handler_context = null }) {
  const { action, content: reasoningContent, confidence, source_chunk_ids, source_question } = content || {};
  if (!action) throw new Error('reasoning-write handler: action required in structured output');

  if (action === 'no_action') {
    return { deliverable_id: null, entry_id: null, skipped: true };
  }

  if (!reasoningContent) throw new Error('reasoning-write handler: content required in structured output for action=' + action);

  // FEATURE: HAR-21 -- source_chunk_ids arrives as a model claim, not a fact: the Skill asks for ids
  // "cited in flagged_answer" and a shortened decoy in the prose (e.g. `(id: 0cecd001)`) gets lifted
  // verbatim. Passed through unconditionally, that claim reached lib/search-harness.js's AA-189 guard,
  // was correctly denied, and killed the whole write with a 422 (AGT-37, reproduced live 2026-07-29) --
  // taking the caller's next step down with it. Two instruction-only fixes have now lost to this class
  // (DAT-7, then v6.3.214), so the rule is structural instead: resolve through the shared service, keep
  // what is well-formed, drop what is not, and write an honest [] rather than dying.
  // FEATURE: AGT-37 -- HAR-21's placeholder `supplied: null` is now the real thing: the caller's own
  // already-known ids, arriving on handler_context (a handler-facing envelope that never reaches the
  // model -- api/prompt/request-receivable.js's sendRequest()). This is what removes the model step
  // that two instruction-only fixes lost to; docs/harvests/AGT-37.md records why a third wording is
  // forbidden. Read as a small ordered allowlist rather than one key, mirroring SELF_REPORTED_CLAIM_
  // FIELDS in request-receivable.js:445 -- both write paths into this handler supply their ids under
  // their own natural name, and neither is named here. NEVER read task_context for this: task_context
  // is prompt material (db-assembly.js serializes every key into the agent's prompt), so an id placed
  // there would be handed to the very model this change exists to keep away from ids.
  // The AA-189 guard in lib/search-harness.js is untouched and still denies a well-formed-but-
  // nonexistent or cross-room id, supplied or claimed: caller-supplied does not mean caller-trusted.
  const suppliedIds = handler_context?.source_chunk_ids ?? handler_context?.chunk_id ?? null;
  const resolveStart = Date.now();
  const resolved = resolveReferenceIds({ supplied: suppliedIds, claimed: source_chunk_ids });
  const resolveLatency = Date.now() - resolveStart;

  // FEATURE: HAR-21 -- a dropped id must be visible, not silent (.claude/rules/capability-logging.md:
  // deterministic work logs execution + latency, no tokens, no cost). Emitted only when something was
  // actually dropped, so the exceptional case is what lands in the log. call_facts carries the count
  // plus the raw rejected entries -- deliberately bounded to drop events rather than stamped on every
  // row, the distinction LOG-91 drew when it kept dispatch_latency_ms out of call_facts entirely.
  if (resolved.dropped.length > 0) {
    logActivity({
      tenantId: tenant_id || 'global',
      agentId: agent_id || null,
      aiType: 'deterministic',
      feature: 'claim-resolver',
      latencyMs: resolveLatency,
      callFacts: {
        dropped_reference_id_count: resolved.dropped.length,
        dropped_reference_ids: resolved.dropped,
        reference_id_source: resolved.source,
      },
    });
  }

  const result = await writeContent({
    requestingAgentId: agent_id,
    store: 'the_reasoning',
    tenantId: tenant_id,
    content: reasoningContent,
    source_chunk_ids: resolved.ids,
    source_question: source_question || null,
    confidence: confidence || null,
  });

  // FEATURE: DAT-7 -- graceful denial: attach status/detail instead of a bare throw, matching
  // request-receivable.js's existing 501 idiom, so execute.js's outer catch (line ~1249) can
  // forward a real status/detail instead of collapsing every denial into a raw 500.
  if (!result.success) {
    const tier = result._access?.tier || 'unknown';
    throw Object.assign(new Error(`reasoning-write handler: writeContent failed -- ${tier}`), { status: 422, detail: { tier } });
  }

  return { deliverable_id: null, entry_id: result.entry?.id || null, handler_result: result };
}
