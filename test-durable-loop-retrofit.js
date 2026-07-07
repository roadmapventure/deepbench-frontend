// test-durable-loop-retrofit.js — run with: node test-durable-loop-retrofit.js
import { runCapability, resumeCapability, __setTestBudgetMs } from './api/capabilities/execute.js';
import assert from 'node:assert';

async function testFastPathUnaffected() {
  // A short, ordinary call — routing intent, single turn, no delegation. Real budget (60s), never
  // forced. Must complete in one call with no durable_hops row touched.
  const result = await runCapability({
    capability_slug: 'channel-intelligence', intent_slug: 'ci-routing-intent', agent_id: 'marcus',
    task_context: { goal: 'What drove growth in Japan?' }, tenant_id: 'global',
  });
  assert(result.content?.intent, 'ordinary short call must complete normally, not checkpoint');
  assert(result.status !== 'in_progress', 'fast path must not return in_progress for a short chain');
  console.log('[fast-path] PASS — short chain completed in one call, no checkpoint:', result.content.intent);
}

async function testForcedCheckpointAndResume() {
  // Force the hybrid trigger deterministically: override the budget reserve so ANY hop checkpoints
  // immediately, rather than waiting out a genuine ~55s real chain. __setTestBudgetMs is a test-only
  // override (default unset = real 60000ms path) -- does not change production behavior.
  __setTestBudgetMs(1); // 1ms remaining "budget" -- the very first hop must checkpoint

  const start = await runCapability({
    capability_slug: 'channel-intelligence', intent_slug: 'ci-answer-display-intent', agent_id: 'marcus',
    task_context: {
      answer: 'Japan grew fastest in 2025 driven by expanded authorized reseller coverage and a new flagship retail presence in Tokyo and Osaka.',
      citations: ['dr-001', 'dr-014'], confidence_tier: 'sourced', needs_review: false, review_reason: null,
    },
    tenant_id: 'global',
  });
  assert.strictEqual(start.status, 'in_progress', 'forced-budget call must checkpoint, not complete synchronously');
  assert(start.job_id, 'checkpoint must return a job_id');
  console.log('[checkpoint] PASS — chain checkpointed instead of continuing:', start.job_id);

  __setTestBudgetMs(null); // restore real budget for the resumed invocation -- proves resume gets a genuinely fresh window, not the same exhausted one
  let current = { status: 'in_progress', job_id: start.job_id };
  let iterations = 0;
  while (current.status === 'in_progress' && iterations < 5) {
    iterations++;
    current = await resumeCapability({ job_id: start.job_id });
    console.log(`[resume ${iterations}] ->`, current.status);
  }
  // ci-answer-display-intent legitimately terminates via delegate_to_agent(is_final: true)
  // (Marcus -> Alex's qa-answer-format) -- the harness's documented terminal shape for that path
  // is status: 'final_delegation' (S-ARCH-DISPLAY-LOOP-01), not 'complete'. 'complete' is purely
  // the internal durable_hops DB column value written by patchDurableHopRow() -- runLoop()/
  // resumeCapability() never return that literal to a caller (the ordinary non-delegate dispatch
  // path has no top-level .status field at all). Confirmed against a real live run's actual output.
  assert.strictEqual(current.status, 'final_delegation', `chain did not reach the expected terminal state after resume: ${JSON.stringify(current)}`);
  assert(current.headline || (current.body && current.body.length), 'resumed chain must produce real display-agent output');
  console.log('PASS — forced checkpoint resumed to completion across', iterations, 'resumeCapability() call(s).');
}

async function main() {
  await testFastPathUnaffected();
  await testForcedCheckpointAndResume();
}
main().catch(e => { console.error('FAIL:', e); process.exit(1); });
