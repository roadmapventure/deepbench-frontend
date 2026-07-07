// test-durable-loop-poc.js — run with: node test-durable-loop-poc.js
import { startDurableChain, continueDurableChain } from './lib/durable-loop-poc.js';
import assert from 'node:assert';

async function main() {
  // Real scenario: the exact task_context Marcus's finalAnswer produces after Owen's guardrail
  // pass, going into the display hand-off — the precise call that died live on 2026-07-07.
  const start = await startDurableChain({
    capability_slug: 'channel-intelligence',
    intent_slug: 'ci-answer-display-intent',
    agent_id: 'marcus',
    task_context: {
      answer: 'Japan grew fastest in 2025 driven by expanded authorized reseller coverage and a new flagship retail presence in Tokyo and Osaka.',
      citations: ['dr-001', 'dr-014'],
      confidence_tier: 'sourced',
      needs_review: false,
      review_reason: null,
    },
    tenant_id: 'global',
  });
  assert(start.job_id, 'startDurableChain must return a job_id');
  console.log('[1] start ->', start.status, start.job_id);

  // Proof point: reload strictly by job_id, as a cold caller would — no reference to `start`'s
  // internals reused below this line except the id itself.
  const jobId = start.job_id;
  let current = start;
  let iterations = 0;
  while (current.status === 'in_progress' && iterations < 5) {
    iterations++;
    // Simulates a genuinely separate invocation: fresh call, only job_id carried over.
    current = await continueDurableChain({ job_id: jobId });
    console.log(`[${iterations + 1}] continue ->`, current.status);
  }

  assert.strictEqual(current.status, 'complete', `chain did not complete: ${JSON.stringify(current)}`);
  assert(iterations >= 1, 'chain must have spanned at least one continueDurableChain() call beyond start — proves the boundary, not just a single-call shortcut');
  assert(current.result, 'completed chain must carry a result');
  assert(
    current.result.headline || (current.result.body && current.result.body.length),
    'result must carry real display-agent output (headline/body), not an empty shape'
  );
  console.log('PASS — durable chain completed across', iterations, 'continueDurableChain() call(s) after start. Result:', JSON.stringify(current.result, null, 2));
}

main().catch(e => { console.error('FAIL:', e); process.exit(1); });
