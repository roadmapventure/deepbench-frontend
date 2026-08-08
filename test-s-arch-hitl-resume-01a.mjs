// test-s-arch-hitl-resume-01a.mjs — S-ARCH-HITL-RESUME-01a live verification
// DeepBench v6.0.6 | test-s-arch-hitl-resume-01a.mjs | AA-100 Confirmation service
import 'dotenv/config';
import { strict as assert } from 'assert';
import { runCapability } from './api/capabilities/execute.js';
import { getPendingConfirmation, resolvePendingConfirmation, markEdited } from './api/_lib/handlers/confirmation.js';

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}: ${e.message}`); failed++; }
}

const TASK_CONTEXT = JSON.stringify({
  hypothesis: 'GEO CSO adoption is accelerating in Southeast Asia',
  flagged_question: 'What is the current smartphone-to-GEO-CSO conversion rate in Vietnam?',
  research_request: 'Find any sourced or inferred data on Vietnam GEO CSO adoption specifically.',
});

async function pause() {
  const result = await runCapability({
    capability_slug: 'data-analysis', intent_slug: 'data-escalate-intent',
    agent_id: 'nadia', task_context: TASK_CONTEXT, tenant_id: 'global',
  });
  assert.equal(result.status, 'pending_confirmation', 'gate must fire for data-escalate-intent');
  assert.ok(result.confirmation_id, 'must return a durable confirmation_id');
  return result.confirmation_id;
}

async function run() {
  console.log('S-ARCH-HITL-RESUME-01a — AA-100 Confirmation service\n');

  let confId;
  await test('runCapability pauses and persists a real row', async () => {
    confId = await pause();
    const row = await getPendingConfirmation(confId);
    assert.ok(row, 'row must exist in Supabase');
    assert.equal(row.status, 'pending');
    assert.equal(row.agent_id, 'nadia');
    assert.equal(row.capability_slug, 'data-analysis');
    assert.ok(row.proposed_action, 'proposed_action must be saved');
    assert.ok(row.prompt_request?.system_prompt, 'prompt_request.system_prompt must be captured for later accept');
  });

  await test('reject: stops, no dispatch, recorded', async () => {
    const result = await resolvePendingConfirmation({ confirmation_id: confId, resolution: 'reject' });
    assert.equal(result.status, 'rejected');
    const row = await getPendingConfirmation(confId);
    assert.equal(row.status, 'rejected');
    assert.ok(row.resolved_at, 'resolved_at must be set');
  });

  await test('reject twice fails — already resolved', async () => {
    await assert.rejects(() => resolvePendingConfirmation({ confirmation_id: confId, resolution: 'reject' }), /already rejected/);
  });

  let acceptConfId;
  await test('accept: finishes normally, real deliverable produced', async () => {
    acceptConfId = await pause();
    const result = await resolvePendingConfirmation({ confirmation_id: acceptConfId, resolution: 'accept' });
    assert.ok(result.deliverable_id, 'accept must produce a real deliverable_id via the store handler');
    assert.equal(result.handler, 'store');
    const row = await getPendingConfirmation(acceptConfId);
    assert.equal(row.status, 'accepted');
    assert.ok(row.resolution?.deliverable_id, 'resolution must be saved on the row');
  });

  await test('invalid resolution value rejected', async () => {
    const freshConfId = await pause();
    await assert.rejects(() => resolvePendingConfirmation({ confirmation_id: freshConfId, resolution: 'maybe' }));
  });

  let editConfId;
  await test('edit: original marked edited, fresh call re-enters the agent', async () => {
    editConfId = await pause();
    await markEdited(editConfId);
    const row = await getPendingConfirmation(editConfId);
    assert.equal(row.status, 'edited');
    const revised = await runCapability({
      capability_slug: 'data-analysis', intent_slug: 'data-escalate-intent', agent_id: 'nadia',
      task_context: JSON.stringify({ ...JSON.parse(TASK_CONTEXT), research_request: 'Narrow to 2025 data only, sourced facts preferred over inferred.' }),
      tenant_id: 'global',
    });
    assert.ok(['pending_confirmation'].includes(revised.status), 'edit re-enters the same gate fresh');
    assert.notEqual(revised.confirmation_id, editConfId, 'must be a genuinely new pending confirmation, not the same row');
  });

  await test('regression: normal run path (no action) unchanged for a non-gated capability', async () => {
    const result = await runCapability({
      capability_slug: 'hypothesis-evaluation', intent_slug: 'hyp-generation-intent', agent_id: 'priya',
      task_context: JSON.stringify({ flagged_question: 'test regression only' }), tenant_id: 'global',
    });
    assert.notEqual(result.status, 'pending_confirmation', 'hypothesis-evaluation has no requires_human_confirmation trait — must run straight through');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
