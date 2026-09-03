// DeepBench v7.0.419 | api/_lib/handlers/library-lookup.js | LOG-143 (d) -- the same handler now
// also answers WITH the record's text, behind an explicit `include_content` flag on its own input.
// The default path (no flag) is byte-identical to LOO-22's: same call, same {verification} shape,
// same absence of any log row of its own, so every existing caller sees no change at all.
// FEATURE: LOG-143 -- the content read goes through lib/search-harness.js's readContentByIds(), the
// generic `store`-dispatched public entry point (AA-106 / ARCHITECTURE.md §19f), rather than
// reaching into lib/librarian.js for it: the store is named as data on the call, exactly as
// queryContent()'s callers name it, and this file gains no second the_library access path.
// DeepBench v6.3.145 | api/_lib/handlers/library-lookup.js | LOO-22 -- Eleanor Voss's record-level
// verification read handler (data-room-custody / library-record-lookup-intent).
// FEATURE: LOO-22 -- dispatched generically via format_contract.handler === 'library-lookup', same
// registry pattern as library-write.js. This file performs no agent-id check of its own --
// ARCHITECTURE.md §19c's "only Eleanor" rule is enforced by which Skill Profile sets
// handler: 'library-lookup' in the first place (only library-record-lookup-intent does), not by a
// conditional here. Calls the existing lookupRecordsByIds() broker unchanged -- a read, never a
// write path into the_library.

import { lookupRecordsByIds } from '../../../lib/librarian.js';
import { readContentByIds } from '../../../lib/search-harness.js';
import { logActivity } from '../../../lib/activity-log.js';

export async function handle({ agent_id, tenant_id, content }) {
  const { record_ids, data_room_tag, include_content } = content || {};

  // An empty/missing id list is a valid "nothing to verify" result, not an error.
  if (!Array.isArray(record_ids) || record_ids.length === 0) {
    return { verification: [] };
  }

  // FEATURE: LOG-143 (d) -- the content branch. Gated on `=== true` rather than truthiness, so a
  // model that emits the string "false" (or any other stray value) gets the existence check it
  // asked for in every other respect, never an unrequested disclosure of Library text.
  if (include_content === true) {
    const startTime = Date.now();
    const { records } = await readContentByIds({
      requestingAgentId: agent_id,
      store: 'the_library',
      ids: record_ids,
      tenantId: tenant_id,
      data_room_tag: data_room_tag || undefined,
    });

    // The six fields LOG-143 (d) declares, projected explicitly rather than spread: `status` is read
    // by the primitive (a superseded chunk is still a real chunk the run retrieved) but is not part
    // of this handler's declared contract, and a spread would quietly publish every column a future
    // select adds.
    const verification = records.map(r => ({
      id: r.id,
      exists: r.exists,
      data_type: r.data_type,
      content: r.content,
      citeable: r.citeable,
      title: r.title,
    }));

    // FEATURE: LOG-143 -- .claude/rules/capability-logging.md: deterministic work logs execution and
    // latency, no tokens and no cost. Emitted on THIS branch only -- the default path logged nothing
    // of its own before this session (lib/librarian.js writes the `librarian` row for both paths)
    // and still logs nothing, which is what keeps LOO-22's callers byte-identical. call_facts
    // records the shape of what was handed back, never the text itself: the point of the flag is
    // that Library content reaches the judge, not the audit log.
    logActivity({
      tenantId: tenant_id || 'global',
      agentId: agent_id || null,
      aiType: 'deterministic',
      feature: 'library-lookup:content',
      latencyMs: Date.now() - startTime,
      callFacts: {
        requested_ids: verification.length,
        found: verification.filter(v => v.exists).length,
        with_content: verification.filter(v => typeof v.content === 'string' && v.content.length > 0).length,
      },
    });

    return { verification };
  }

  const verification = await lookupRecordsByIds({
    requestingAgentId: agent_id,
    tenantId: tenant_id,
    ids: record_ids,
    data_room_tag: data_room_tag || undefined,
  });

  return { verification };
}
