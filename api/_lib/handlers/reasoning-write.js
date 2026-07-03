// DeepBench v6.0.13 | api/_lib/handlers/reasoning-write.js | S-APPLE-04b re-scope -- Nadia's the_reasoning write handler
// FEATURE: AA-104/AA-107 (ARCHITECTURE.md §19f) -- dispatched generically via format_contract.handler
// === 'reasoning-write', same registry pattern as library-write.js. Self-write, no Eleanor: Nadia is
// the_reasoning's Content-Owner, not routed through an arbitrating owner's broker -- this file performs
// no agent-identity check of its own, same reasoning as library-write.js's comment -- the Skill Profile
// that sets handler: 'reasoning-write' (only data-patch-execute-intent does) is what scopes access.
// action: 'no_action' is a documented no-op -- nothing to record, same accepted-quirk shape as the
// pending_confirmation-with-nothing-to-approve behavior already accepted for this intent (S-APPLE-04b).

import { writeContent } from '../../../lib/search-harness.js';

export async function handle({ agent_id, tenant_id, content }) {
  const { action, content: reasoningContent, confidence, source_chunk_ids, source_question } = content || {};
  if (!action) throw new Error('reasoning-write handler: action required in structured output');

  if (action === 'no_action') {
    return { deliverable_id: null, entry_id: null, skipped: true };
  }

  if (!reasoningContent) throw new Error('reasoning-write handler: content required in structured output for action=' + action);

  const result = await writeContent({
    requestingAgentId: agent_id,
    store: 'the_reasoning',
    tenantId: tenant_id,
    content: reasoningContent,
    source_chunk_ids: Array.isArray(source_chunk_ids) ? source_chunk_ids : [],
    source_question: source_question || null,
    confidence: confidence || null,
  });

  if (!result.success) {
    throw new Error(`reasoning-write handler: writeContent failed -- ${result._access?.tier || 'unknown reason'}`);
  }

  return { deliverable_id: null, entry_id: result.entry?.id || null, handler_result: result };
}
