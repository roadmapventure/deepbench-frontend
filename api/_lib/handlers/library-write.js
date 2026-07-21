// DeepBench v6.3.112 | api/_lib/handlers/library-write.js | DAT-7 -- graceful denial: status:422 + detail.tier instead of a bare throw
// DeepBench v6.0.5 | api/_lib/handlers/library-write.js | AG-33 -- Eleanor Voss's data-room-custody handler
// FEATURE: AG-33 -- dispatched generically via format_contract.handler === 'library-write', same
// registry pattern as store.js. This file performs no agent-id check of its own -- ARCHITECTURE.md
// §19c's "only Eleanor" rule is enforced by which Skill Profile sets handler: 'library-write' in
// the first place (only library-write-intent does), not by a conditional here. Calls the existing
// writeLibrary() broker unchanged -- this is not a second write path into the_library.

import { writeLibrary } from '../../../lib/librarian.js';

export async function handle({ agent_id, tenant_id, content }) {
  const { operation, data_room_tag, ...params } = content || {};
  if (!operation) throw new Error('library-write handler: operation required in structured output');
  if (!data_room_tag) throw new Error('library-write handler: data_room_tag required in structured output');

  const result = await writeLibrary({
    requestingAgentId: agent_id,
    tenantId: tenant_id,
    operation,
    data_room_tag,
    ...params,
  });

  // FEATURE: DAT-7 -- graceful denial: attach status/detail instead of a bare throw, same shape
  // as reasoning-write.js's identical fix (Category M -- both write handlers must stay in sync).
  if (!result.success) {
    const tier = result.error || result._librarian?.tier || 'unknown';
    throw Object.assign(new Error(`library-write handler: writeLibrary failed -- ${tier}`), { status: 422, detail: { tier } });
  }

  return { deliverable_id: null, entry_id: result.entry?.id || null, handler_result: result };
}
