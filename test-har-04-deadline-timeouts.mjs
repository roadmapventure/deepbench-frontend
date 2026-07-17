// test-har-04-deadline-timeouts.mjs — run with: node test-har-04-deadline-timeouts.mjs
// FEATURE: HAR-04 -- Category B (pure logic, no real network) assertions for the deadline-aware
// timeout fix. fetch and AbortSignal.timeout are both mocked/instrumented -- no real Anthropic or
// Supabase call happens anywhere in this file.
import assert from 'node:assert';

process.env.ANTHROPIC_API_KEY ||= 'test-anthropic-key';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY ||= 'test-service-key';

const { callModel, sendRequest } = await import('./api/prompt/request-receivable.js');

// ── Instrumentation: capture every AbortSignal.timeout(ms) call, in order ────────────────────
const realAbortSignalTimeout = AbortSignal.timeout.bind(AbortSignal);
let capturedTimeouts = [];
AbortSignal.timeout = (ms) => {
  capturedTimeouts.push(ms);
  return realAbortSignalTimeout(ms);
};

// ── Instrumentation: controllable fake clock, so "elapsed time between calls" can be simulated
// deterministically (real fetch is mocked and resolves near-instantly, so there is otherwise no
// natural time passage to test the retry-time-remaining behavior).
const realDateNow = Date.now.bind(Date);
let clockOffsetMs = 0;
Date.now = () => realDateNow() + clockOffsetMs;

function resetInstrumentation() {
  capturedTimeouts = [];
  clockOffsetMs = 0;
}

const okAnthropicTextResponse = (text = 'ok') => ({
  ok: true,
  json: async () => ({ content: [{ type: 'text', text }], usage: { input_tokens: 10, output_tokens: 5 } }),
});

// Missing tool_use block -> parseModelTurn throws "No tool_use block in response" whenever a
// schema tool is expected (hasSchemaTool: true) -- the parse-failure path this session's retry
// logic guards.
const malformedNoToolUseResponse = () => ({
  ok: true,
  json: async () => ({ content: [{ type: 'text', text: 'I forgot to call the tool' }], usage: { input_tokens: 10, output_tokens: 5 } }),
});

const validToolUseResponse = (toolName, input) => ({
  ok: true,
  json: async () => ({
    content: [{ type: 'tool_use', id: 'toolu_test', name: toolName, input }],
    usage: { input_tokens: 12, output_tokens: 8 },
  }),
});

const SCHEMA_FORMAT_CONTRACT = {
  output_type: 'json',
  skill_profile_slug: 'test_schema',
  schema: { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
};

const BASE_CALL_ARGS = {
  systemPrompt: 'test system prompt', model: 'claude-sonnet-4-6', max_tokens: 512, temperature: 0.5,
  format_contract: SCHEMA_FORMAT_CONTRACT,
};

// ── Test 1: deadline omitted -> main-call timeout computes to 55000, byte-identical to today ──
async function test1_omittedDeadlineDefaultsTo55000() {
  resetInstrumentation();
  globalThis.fetch = async () => okAnthropicTextResponse();
  // No schema tool needed for this one -- plain text response, no schema/tools at all.
  await callModel({ ...BASE_CALL_ARGS, format_contract: { output_type: 'text' } });
  assert.strictEqual(capturedTimeouts.length, 1, 'expected exactly one AbortSignal.timeout call');
  assert.strictEqual(capturedTimeouts[0], 55000, `expected default 55000ms timeout, got ${capturedTimeouts[0]}`);
  console.log('PASS -- test1: omitted deadline defaults to 55000ms');
}

// ── Test 2: deadline = Date.now() + 30000 -> main-call timeout computes to 30000 (bounded) ─────
async function test2_boundedDeadlineComputesCorrectTimeout() {
  resetInstrumentation();
  globalThis.fetch = async () => okAnthropicTextResponse();
  const deadline = Date.now() + 30000;
  await callModel({ ...BASE_CALL_ARGS, format_contract: { output_type: 'text' }, deadline });
  assert.strictEqual(capturedTimeouts.length, 1, 'expected exactly one AbortSignal.timeout call');
  assert(
    capturedTimeouts[0] <= 30000 && capturedTimeouts[0] > 29900,
    `expected timeout bounded to ~30000ms, got ${capturedTimeouts[0]}`
  );
  console.log('PASS -- test2: bounded deadline computes correct (~30000ms) timeout:', capturedTimeouts[0]);
}

// ── Test 3: deadline below MIN_VIABLE_CALL_MS -> throws immediately, no fetch attempted ─────────
async function test3_insufficientTimeFailsFastNoFetch() {
  resetInstrumentation();
  let fetchCallCount = 0;
  globalThis.fetch = async () => { fetchCallCount++; return okAnthropicTextResponse(); };
  const deadline = Date.now() + 3000; // below MIN_VIABLE_CALL_MS (8000)
  await assert.rejects(
    () => callModel({ ...BASE_CALL_ARGS, format_contract: { output_type: 'text' }, deadline }),
    (err) => {
      assert.strictEqual(err.status, 504, `expected status 504, got ${err.status}`);
      return true;
    }
  );
  assert.strictEqual(fetchCallCount, 0, 'fetch must never be attempted when insufficient time remains');
  console.log('PASS -- test3: insufficient time fails fast, zero fetch attempts');
}

// ── Test 4: parse-failure retry skipped when < MIN_VIABLE_CALL_MS remains at retry time ────────
async function test4_retrySkippedWhenInsufficientTimeAtRetryMoment() {
  resetInstrumentation();
  let fetchCallCount = 0;
  globalThis.fetch = async () => {
    fetchCallCount++;
    // Simulate the main call itself consuming most of the budget (real Anthropic latency) --
    // the mocked fetch resolves near-instantly, so this is the only way to make "time elapsed
    // during the main call" observable to the retry-time-remaining check below.
    clockOffsetMs += 20000;
    return malformedNoToolUseResponse();
  };
  const deadline = Date.now() + 25000; // ample for the main call (25000 >= MIN_VIABLE_CALL_MS),
  // but only 5000ms will remain by the time the retry check runs (25000 - 20000 elapsed above).
  await assert.rejects(
    () => callModel({ ...BASE_CALL_ARGS, deadline }),
    (err) => {
      assert.strictEqual(err.status, 422, `expected status 422, got ${err.status}`);
      assert.strictEqual(err.message, 'Parse failed and retry also failed');
      assert(/insufficient time/i.test(err.detail || ''), `expected detail to note retry was skipped, got: ${err.detail}`);
      return true;
    }
  );
  assert.strictEqual(fetchCallCount, 1, 'retry fetch must be skipped -- fetch should be called exactly once, not twice');
  console.log('PASS -- test4: parse-failure retry skipped when insufficient time remains, fetch called once');
}

// ── Test 5: parse-failure retry attempted (with a bounded timeout) when ample time remains ─────
async function test5_retryAttemptedWithBoundedTimeoutWhenAmpleTime() {
  resetInstrumentation();
  let fetchCallCount = 0;
  globalThis.fetch = async () => {
    fetchCallCount++;
    if (fetchCallCount === 1) {
      clockOffsetMs += 2000; // small, realistic elapsed time for the main call
      return malformedNoToolUseResponse();
    }
    return validToolUseResponse('test_schema', { foo: 'bar' });
  };
  const deadline = Date.now() + 40000;
  const turn = await callModel({ ...BASE_CALL_ARGS, deadline });
  assert.strictEqual(fetchCallCount, 2, 'expected exactly two fetch calls: main + retry');
  assert.deepStrictEqual(turn.tool_input, { foo: 'bar' });
  assert.strictEqual(capturedTimeouts.length, 2, 'expected two AbortSignal.timeout calls: main + retry');
  assert(capturedTimeouts[1] <= 38000 && capturedTimeouts[1] > 37000, `expected retry timeout bounded to ~38000ms, got ${capturedTimeouts[1]}`);
  console.log('PASS -- test5: parse-failure retry attempted with correctly bounded timeout:', capturedTimeouts[1]);
}

// ── Test 6: sendRequest() guardrails skipped under tight remaining time (fail-open, unchanged shape)
async function test6_guardrailsSkippedUnderTightTime() {
  resetInstrumentation();
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('anthropic.com')) throw new Error('guardrails call must not be attempted under tight time');
    if (u.includes('/rest/v1/deliverables')) return { ok: true, json: async () => ([{ id: 'deliverable-test-1' }]) };
    if (u.includes('/rest/v1/ai_activity_log')) return { ok: true, json: async () => ({}) };
    throw new Error(`unexpected fetch url in test6: ${u}`);
  };
  const result = await sendRequest({
    prompt_request: {
      task_id: null,
      system_prompt: 'test prompt',
      format_contract: {
        output_type: 'json', skill_profile_slug: 'test_profile', handler: 'store',
        guardrails: { must: ['must mention x'], must_not: [] },
      },
      llm: { model: 'claude-sonnet-4-6', max_tokens: 256 },
    },
    agent_id: 'test-agent', capability_slug: 'test-capability', tenant_id: 'global',
    precomputed_turn: { tool_input: { title: 'Test', foo: 'bar' }, usage: { input_tokens: 1, output_tokens: 1 }, retryCount: 0 },
    deadline: Date.now() + 1000, // below GUARDRAILS_MIN_VIABLE_MS (3000)
  });
  assert.strictEqual(result.debug.guardrails_ran, false, 'guardrails must be skipped, not run, under tight time');
  assert.strictEqual(result.guardrails_passed, true, 'fail-open shape: guardrails_passed stays true when skipped');
  assert(!result.patterns_used.includes('guardrails'), 'guardrails pattern must not be logged when the check never ran');
  console.log('PASS -- test6: sendRequest() guardrails skipped under tight remaining time, fail-open shape preserved');
}

// ── Test 7: sendRequest() guardrails attempted (bounded timeout) when ample time remains ───────
async function test7_guardrailsAttemptedWithBoundedTimeoutWhenAmpleTime() {
  resetInstrumentation();
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('anthropic.com')) {
      return { ok: true, json: async () => ({ content: [{ type: 'tool_use', name: 'guardrails_check', input: { passed: true, violations: [] } }], usage: { input_tokens: 5, output_tokens: 3 } }) };
    }
    if (u.includes('/rest/v1/deliverables')) return { ok: true, json: async () => ([{ id: 'deliverable-test-2' }]) };
    if (u.includes('/rest/v1/ai_activity_log')) return { ok: true, json: async () => ({}) };
    throw new Error(`unexpected fetch url in test7: ${u}`);
  };
  const result = await sendRequest({
    prompt_request: {
      task_id: null,
      system_prompt: 'test prompt',
      format_contract: {
        output_type: 'json', skill_profile_slug: 'test_profile', handler: 'store',
        guardrails: { must: ['must mention x'], must_not: [] },
      },
      llm: { model: 'claude-sonnet-4-6', max_tokens: 256 },
    },
    agent_id: 'test-agent', capability_slug: 'test-capability', tenant_id: 'global',
    precomputed_turn: { tool_input: { title: 'Test', foo: 'bar' }, usage: { input_tokens: 1, output_tokens: 1 }, retryCount: 0 },
    deadline: Date.now() + 15000,
  });
  assert.strictEqual(result.debug.guardrails_ran, true, 'guardrails must run when ample time remains');
  assert.strictEqual(result.guardrails_passed, true);
  assert(result.patterns_used.includes('guardrails'), 'guardrails pattern must be logged when the check actually ran');
  assert.strictEqual(capturedTimeouts.length, 1, 'expected exactly one AbortSignal.timeout call (the guardrails fetch)');
  assert(capturedTimeouts[0] <= 15000 && capturedTimeouts[0] > 14000, `expected guardrails timeout bounded to ~15000ms, got ${capturedTimeouts[0]}`);
  console.log('PASS -- test7: sendRequest() guardrails attempted with correctly bounded timeout:', capturedTimeouts[0]);
}

async function main() {
  await test1_omittedDeadlineDefaultsTo55000();
  await test2_boundedDeadlineComputesCorrectTimeout();
  await test3_insufficientTimeFailsFastNoFetch();
  await test4_retrySkippedWhenInsufficientTimeAtRetryMoment();
  await test5_retryAttemptedWithBoundedTimeoutWhenAmpleTime();
  await test6_guardrailsSkippedUnderTightTime();
  await test7_guardrailsAttemptedWithBoundedTimeoutWhenAmpleTime();
  Date.now = realDateNow;
  AbortSignal.timeout = realAbortSignalTimeout;
  console.log('\nALL TESTS PASS (7/7) -- HAR-04 deadline-aware timeout logic');
}

main().catch((e) => {
  Date.now = realDateNow;
  AbortSignal.timeout = realAbortSignalTimeout;
  console.error('FAIL:', e);
  process.exit(1);
});
