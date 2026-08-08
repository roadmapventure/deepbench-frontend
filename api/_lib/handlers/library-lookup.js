// DeepBench v6.3.145 | api/_lib/handlers/library-lookup.js | LOO-22 -- Eleanor Voss's record-level
// verification read handler (data-room-custody / library-record-lookup-intent).
// FEATURE: LOO-22 -- dispatched generically via format_contract.handler === 'library-lookup', same
// registry pattern as library-write.js. This file performs no agent-id check of its own --
// ARCHITECTURE.md §19c's "only Eleanor" rule is enforced by which Skill Profile sets
// handler: 'library-lookup' in the first place (only library-record-lookup-intent does), not by a
// conditional here. Calls the existing lookupRecordsByIds() broker unchanged -- a read, never a
// write path into the_library.

import { lookupRecordsByIds } from '../../../lib/librarian.js';

export async function handle({ agent_id, tenant_id, content }) {
  const { record_ids, data_room_tag } = content || {};

  // An empty/missing id list is a valid "nothing to verify" result, not an error.
  if (!Array.isArray(record_ids) || record_ids.length === 0) {
    return { verification: [] };
  }

  const verification = await lookupRecordsByIds({
    requestingAgentId: agent_id,
    tenantId: tenant_id,
    ids: record_ids,
    data_room_tag: data_room_tag || undefined,
  });

  return { verification };
}
