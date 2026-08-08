// DeepBench v6.3.116 | api/_lib/handlers/pattern-vocabulary-write.js | AI-35 -- Susan Smith's
// pattern_vocabulary write handler
// FEATURE: AI-35 -- dispatched generically via format_contract.handler === 'pattern-vocabulary-write',
// same registry pattern as library-write.js/reasoning-write.js. This file performs no agent-id
// check of its own -- ownership is enforced by which Skill Profile sets handler:
// 'pattern-vocabulary-write' in the first place (only pattern-vocabulary-review-intent does), not
// by a conditional here. Calls the existing reviewCandidate() broker unchanged -- this is not a
// second write path into pattern_vocabulary.

import { reviewCandidate } from '../../../lib/pattern-vocabulary.js';

export async function handle({ content }) {
  const { candidate_id, decision, ...rest } = content || {};
  if (!candidate_id) throw new Error('pattern-vocabulary-write handler: candidate_id required in structured output');
  if (!decision) throw new Error('pattern-vocabulary-write handler: decision required in structured output');
  const result = await reviewCandidate({ candidate_id, decision, ...rest });
  return { deliverable_id: null, handler_result: result };
}
