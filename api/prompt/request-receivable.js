// DeepBench v6.3.204 | api/prompt/request-receivable.js | LOG-91 -- precomputed_turn path no longer writes its own ai_activity_log row (the same model call's agent-turn row is the single record); its unique facts return to the caller as _terminal_log instead
// DeepBench v6.3.201 | api/prompt/request-receivable.js | HAR-20 -- disable_parallel_tool_use on both forced tool_choice sites (buildCallBody's forced branch + the guardrails inline call); buildParseRetryCorrection() covers every tool_use id, not just the first
// DeepBench v6.3.190 | api/prompt/request-receivable.js | LOG-77-9 -- extractDelegationProvenanceFacts(): verbatim delegation_target/task_provenance backing facts for the read-time delegated_to_provenance derivation (§19k); no comparison, no conclusion
// DeepBench v6.3.180 | api/prompt/request-receivable.js | HAR-15 -- classifyAnthropicFailure() stamps failureClass/faultCode/upstreamStatus on every thrown Anthropic failure; retry behavior byte-identical
// DeepBench v6.3.153 | api/prompt/request-receivable.js | LOG-49 -- model-call write path completes the signature fact-half: span_id/parent_span_id chain links, input_references_other_deliverable, and quarantined self_reported_claims
// DeepBench v6.3.145 | api/prompt/request-receivable.js | LOO-22 -- register library-lookup handler (Eleanor's record-level verification read)
// DeepBench v6.3.142 | api/prompt/request-receivable.js | LOG-67 -- merge the config-half signature snapshot into call_facts on the model-call write path
// DeepBench v6.3.136 | api/prompt/request-receivable.js | LOG-37a-patch -- record the retrieval method as its own Layer A fact
// FEATURE: LOG-37a-patch -- ARCHITECTURE.md §19i Layer A fact 7. buildCallFacts() now also collapses
// ai-enrichment.js's per-section retrieval methods into a single retrieval_method fact, which is what
// makes retrieved_chunk_ids meaningful: ids now only ever appear alongside a real similarity search.
// patterns_used is deliberately byte-identical -- `rag`'s own false-positive problem is LOG-42/53/59.
// DeepBench v6.3.132 | api/prompt/request-receivable.js | LOG-37 -- assemble and pass Layer A call_facts (real tool names, retrieved chunk ids, gates fired) alongside the untouched patterns_used write
// DeepBench v6.3.131 | api/prompt/request-receivable.js | HAR-9/HAR-11 -- parseModelTurn() reads stop_reason to distinguish max_tokens truncation from a genuine schema omission; callModel()'s retry correction now asks a truncated turn for concision instead of "include every field"
// DeepBench v6.3.116 | api/prompt/request-receivable.js | AI-35 -- registers pattern-vocabulary-write handler
// DeepBench v6.3.101 | api/prompt/request-receivable.js | S-HAR-8 -- postToAnthropicWithRetry() bumped to 3 total attempts, escalating backoff ([1000, 3000]ms)
// DeepBench v6.3.49 | api/prompt/request-receivable.js | S-HAR-04 -- callModel()/sendRequest() accept optional deadline; bounded, deadline-aware AbortSignal timeouts replace blind fixed constants (byte-identical when omitted)
// DeepBench v6.0.22 | api/prompt/request-receivable.js | S-ARCH-DISPLAY-LOOP-01 — is_final flag on delegate_to_agent (terminal Display-agent hand-off)
// FEATURE: AA-44 — Request & Receivable: third step of the Prompt Service pipeline

import { handle as storeHandle } from '../_lib/handlers/store.js';
import { handle as libraryWriteHandle } from '../_lib/handlers/library-write.js';
import { handle as reasoningWriteHandle } from '../_lib/handlers/reasoning-write.js';
// FEATURE: AI-35 -- Susan Smith's pattern_vocabulary review/promote handler registration.
import { handle as patternVocabularyWriteHandle } from '../_lib/handlers/pattern-vocabulary-write.js';
// FEATURE: LOO-22 -- Eleanor's record-level library verification read handler registration.
import { handle as libraryLookupHandle } from '../_lib/handlers/library-lookup.js';
import { logActivity } from '../../lib/activity-log.js';
// FEATURE: LOG-67 -- merges the fact-half (buildCallFacts) with the config-half signature snapshot
// carried on the enriched prompt_request.
import { mergeCallFacts } from './db-assembly.js';

export const config = { maxDuration: 60, runtime: 'nodejs' };

const HANDLERS = { store: storeHandle, 'library-write': libraryWriteHandle, 'reasoning-write': reasoningWriteHandle, 'pattern-vocabulary-write': patternVocabularyWriteHandle, 'library-lookup': libraryLookupHandle };
const KNOWN_HANDLERS = Object.keys(HANDLERS);

// FEATURE: AA-87 -- the two harness-generic delegation tools. Never per-capability data --
// injected automatically whenever canRequestHelp is true. request_help has no capability_slug
// field: every unresolved skill need routes to whoever holds project-manager, no exceptions,
// no fast path. delegate_to_agent's agent_id is only ever the model's own tool-call argument,
// filled in from a candidate it was actually given -- never a static field anywhere in the
// platform. ARCHITECTURE.md §19d/§19e.
const REQUEST_HELP_TOOL = {
  name: 'request_help',
  description: 'Ask the platform to find an agent who can help with a skill need you cannot resolve yourself. This always routes to whoever currently holds the project-manager capability -- you cannot and should not name a specific colleague.',
  input_schema: {
    type: 'object',
    required: ['skill_needed', 'task_description', 'reasoning'],
    properties: {
      skill_needed: { type: 'string', description: 'Plain-language description of the capability or expertise needed' },
      task_description: { type: 'string', description: 'The specific task that needs to be done' },
      context: { type: 'string', description: 'Any relevant context for whoever picks this up' },
      reasoning: { type: 'string', maxLength: 300, description: 'Why you are asking for help rather than completing this yourself -- 1-2 concise sentences, not an analysis' },
    },
  },
};

// FEATURE: AA-114/AA-115 (S-ARCH-DISPLAY-LOOP-01) -- optional is_final flag. Set true only when
// this delegation fully completes the delegator's task -- the delegate's own output becomes the
// final result, credited to them, instead of feeding back for the delegator to keep working.
const DELEGATE_TO_AGENT_TOOL = {
  name: 'delegate_to_agent',
  description: 'Dispatch a task to a specific agent and capability chosen from candidates you were actually given (e.g. by request_help). Never use an agent_id you were not given as a candidate. Set is_final true for a hand-off where nothing more is expected of you once the delegate responds.',
  input_schema: {
    type: 'object',
    required: ['agent_id', 'capability_slug', 'task', 'reasoning'],
    properties: {
      agent_id: { type: 'string' },
      capability_slug: { type: 'string' },
      intent_slug: { type: ['string', 'null'] },
      task: { type: 'string', description: 'The task for the chosen agent to perform' },
      reasoning: { type: 'string', maxLength: 300, description: 'Why you chose this candidate -- 1-2 concise sentences, not an analysis' },
      is_final: { type: 'boolean', description: 'Set true only when this delegation fully completes your task and no further judgment from you is needed -- the delegate\'s own output becomes the final result, credited to them. Omit or set false when you need to see the delegate\'s result before finishing your own turn (e.g. reviewing a regenerated answer before deciding whether it now passes).' },
    },
  },
};

// FEATURE: AA-87 -- buildCallBody() takes canRequestHelp (boolean) instead of a delegates
// array. Byte-identical output to pre-v6.0.0 when canRequestHelp=false and
// conversation_history=[]: no `system` field, systemPrompt as the first user message,
// tool_choice forced to the schema tool. ARCHITECTURE.md §19d.
// FEATURE: AA-154 -- optional temperature param, included in both returned shapes only when
// defined. Omitting the key for every unset caller preserves Anthropic's own default (1.0) --
// no behavior change for any capability that doesn't set it.
// FEATURE: HAR-05 -- enableWebSearch is a new optional param, same opt-in shape as
// canRequestHelp directly above. Omitted (or false) for every existing caller is
// byte-identical: webSearchTool = [], tools array unchanged.
// FEATURE: AI-35 -- tool_choice now also goes 'auto' when webSearchTool is non-empty, not just
// harnessTools. Found live during AI-35 2a's mandatory Category L test (Susan Smith's
// pattern-vocabulary-review-intent: schema + enable_web_search:true, can_request_help unset):
// with tool_choice forced to the schema tool alone (the old harnessTools.length>0-only gate),
// Anthropic's API never gives the model room to actually invoke web_search before satisfying the
// forced single-tool constraint -- the model still returned a schema-conformant response, but with
// a fabricated citation ("Vig & Belinkov (2022)", confirmed via live web search: no such paper
// exists), because it silently had zero real ability to search despite enable_web_search:true.
// Zero-regression scope: the only existing enable_web_search:true Skill Profile
// (ws-news-search-intent) already has can_request_help:true too, so harnessTools.length>0 was
// already true for it -- this change is a no-op for every caller that existed before this session.
export function buildCallBody({ format_contract, systemPrompt, model, max_tokens, temperature, canRequestHelp = false, enableWebSearch = false, conversation_history = [] }) {
  const isJson = format_contract.output_type === 'json';
  const schemaTool = (isJson && format_contract.schema)
    ? { name: format_contract.skill_profile_slug, description: 'Return structured output', input_schema: format_contract.schema }
    : null;
  const harnessTools = canRequestHelp ? [REQUEST_HELP_TOOL, DELEGATE_TO_AGENT_TOOL] : [];
  const webSearchTool = enableWebSearch ? [{ type: 'web_search_20250305', name: 'web_search' }] : [];
  const tools = [...(schemaTool ? [schemaTool] : []), ...harnessTools, ...webSearchTool];
  const needsAutoChoice = harnessTools.length > 0 || webSearchTool.length > 0;

  if (tools.length === 0) {
    return {
      model, max_tokens, system: systemPrompt,
      ...(temperature !== undefined && temperature !== null ? { temperature } : {}),
      messages: conversation_history.length > 0 ? conversation_history : [{ role: 'user', content: 'Please complete the task as instructed.' }],
    };
  }

  // FEATURE: HAR-20 -- disable_parallel_tool_use now also set on the forced branch (`{ type: 'tool' }`),
  // not just the auto branch. Parallel emission on a forced schema tool splits required fields across
  // multiple tool_use blocks; parseModelTurn() (above) reads only the first via `content?.find`, so a
  // parallel emission surfaced as a spurious missing-required-fields throw. The auto branch has carried
  // this flag since AI-35 -- this closes the same gap on the forced-tool_choice branch, used by every
  // schema-only intent (no harness tools, no web search).
  return {
    model, max_tokens, tools,
    ...(temperature !== undefined && temperature !== null ? { temperature } : {}),
    tool_choice: needsAutoChoice
      ? { type: 'auto', disable_parallel_tool_use: true }
      : { type: 'tool', name: schemaTool.name, disable_parallel_tool_use: true },
    messages: conversation_history.length > 0 ? conversation_history : [{ role: 'user', content: systemPrompt }],
  };
}

// FEATURE: AA-97 -- accepts a plain-text final turn whenever no schema tool was offered
// (hasSchemaTool=false). tool_choice is 'auto' in that regime (harnessTools present, no
// schemaTool) -- the model is always allowed to finish with text instead of a tool call, but
// the old branch (keyed on tools.length > 0) required a tool_use block whenever ANY tools were
// offered, making it structurally impossible for a can_request_help capability with no schema
// (e.g. hyp-stress-test-intent) to ever end its own loop turn -- it could only call
// request_help/delegate_to_agent, looping to depth_exceeded. Root-caused live in
// S-ARCH-AGENT-LOOP-02 (Priya's hyp-stress-test-intent, first real profile to combine
// can_request_help with no schema). No ARCHITECTURE.md change -- §19d never required a schema
// alongside can_request_help, this is a parser gap, not a design change. ARCHITECTURE.md §19d.
// FEATURE: AA-147 -- validates a schema-tool call's required fields before accepting it. Needed
// because tool_choice is 'auto' (not forced) whenever harness tools are also offered (buildCallBody(),
// ~line 75) -- the model can technically satisfy "call a tool" by calling its own schema tool with an
// empty or partial input object, which previously passed straight through to sendRequest() and got
// written to a deliverable with missing/undefined content, no error surfaced anywhere (confirmed live
// in S-MARKET-INTEL-01a). Reuses callModel()'s existing retry-once-then-throw path below by throwing
// the same class of error as "No tool_use block in response" -- no new retry logic. Presence-only
// check (does the key exist on the input object) -- does not reject a legitimately empty string/array
// on a required field, only a field missing entirely. request_help/delegate_to_agent calls are exempt
// -- their own required-field completeness is a separate, pre-existing concern, out of this session's
// scope.
// FEATURE: HAR-9 -- Anthropic returns stop_reason:'max_tokens' on every truncated turn; this file
// had never read it (zero references to stop_reason existed anywhere in api/ or src/). Without it a
// response cut off mid-generation and a response the model simply authored wrong throw byte-identical
// errors -- confirmed live against durable_hops: 28 library-catalog-intent failures were truncation
// (cut off mid-word, citations never started) while 5 qg-review-intent failures were complete,
// well-formed 337-1134 char JSON that just omitted final_answer. Completes AA-182, which made the
// retry corrective for schema-shape failures but never handled the truncation case.
export function parseModelTurn(responseData, hasSchemaTool, schemaTool) {
  const wasTruncated = responseData.stop_reason === 'max_tokens';
  const toolUseBlock = responseData.content?.find(b => b.type === 'tool_use');
  if (toolUseBlock) {
    const isHarnessTool = toolUseBlock.name === 'request_help' || toolUseBlock.name === 'delegate_to_agent';
    if (!isHarnessTool && schemaTool && toolUseBlock.name === schemaTool.name) {
      const required = schemaTool.input_schema?.required || [];
      const missing = required.filter(key => !(key in (toolUseBlock.input || {})));
      if (missing.length > 0) {
        throw Object.assign(
          new Error(wasTruncated
            ? `Schema tool "${schemaTool.name}" output was truncated at the model's max_tokens limit before required field(s): ${missing.join(', ')}`
            : `Schema tool "${schemaTool.name}" called with missing required field(s): ${missing.join(', ')}`),
          { rawInput: toolUseBlock.input, truncated: wasTruncated }
        );
      }
    }
    return {
      is_delegate_call: isHarnessTool,
      tool_name: toolUseBlock.name,
      tool_use_id: toolUseBlock.id,
      tool_input: toolUseBlock.input,
    };
  }
  if (hasSchemaTool) {
    throw Object.assign(
      new Error(wasTruncated
        ? "No tool_use block in response -- output was truncated at the model's max_tokens limit"
        : 'No tool_use block in response'),
      { truncated: wasTruncated }
    );
  }
  const textBlock = responseData.content?.find(b => b.type === 'text');
  if (!textBlock) throw new Error('No text block in response');
  return { is_delegate_call: false, tool_name: null, tool_use_id: null, tool_input: textBlock.text };
}

// FEATURE: AA-113 -- retry on a transient non-2xx Anthropic HTTP error (429/500/502/503/529),
// with a short backoff, before giving up. Every callModel() caller across the whole platform
// (execute.js's delegation loop, sendRequest()'s own non-precomputed path) shares this helper --
// generic infrastructure, not capability-specific. Previously any transient API hiccup at any hop
// threw immediately with zero retry, killing the whole call with no trace (confirmed live 2026-07-04:
// a pending_confirmation accept 500'd once then succeeded cleanly on an immediate manual retry with
// no duplicate write). Non-transient errors (4xx other than 429) still fail fast, unchanged --
// retrying a malformed request or an auth failure would never help. Deliberately scoped to the
// initial call only -- the existing parse-failure retry's own second fetch() is untouched.
// FEATURE: HAR-8 -- was 1 retry (2 total attempts, flat 1000ms pause). Bumped after 11 real 529-
// overload failures in one day (2026-07-21, confirmed via durable_hops) exhausted the old single
// retry -- uniform, harness-level, applies identically to every model call on the platform, no
// per-capability special-casing. Escalating backoff (was flat) gives a genuinely overloaded API
// more room to recover on the 2nd retry than the 1st.
const TRANSIENT_ANTHROPIC_STATUS = new Set([429, 500, 502, 503, 529]);
const MAX_ANTHROPIC_ATTEMPTS = 3;
const API_RETRY_BACKOFF_MS = [1000, 3000];

// FEATURE: HAR-15 -- classify an Anthropic HTTP failure once, at the only place that has the real
// status AND the real body, so no consumer downstream has to re-derive it from an English message.
// Pure and exported so the Node test can import the real implementation (STANDARDS.md Section 5).
//
// Matching on the credit-balance phrase rather than on error.type: `invalid_request_error` covers
// every malformed-request rejection too, so the type alone cannot single this class out. The phrase
// is the actual discriminator; all 42 real rows verified 2026-07-28 carry it verbatim.
export function classifyAnthropicFailure(status, bodyText) {
  const body = typeof bodyText === 'string' ? bodyText : '';
  if (status === 400 && /credit balance is too low/i.test(body)) {
    return { failureClass: 'permanent', faultCode: 'anthropic-credit-exhausted' };
  }
  if (TRANSIENT_ANTHROPIC_STATUS.has(status)) {
    return { failureClass: 'transient', faultCode: 'anthropic-transient' };
  }
  return { failureClass: 'permanent', faultCode: 'anthropic-request-rejected' };
}

// FEATURE: HAR-04 -- deadline-aware timeout floor. Below this much real remaining time, don't
// attempt an Anthropic call at all (Vercel would very likely kill it mid-flight with zero trace
// anyway) -- fail fast with a clear, immediate error instead. Shared by the main call
// (postToAnthropicWithRetry) and the parse-failure retry fetch, both below. AA-69/S-SES003-TSR-design.
const MIN_VIABLE_CALL_MS = 8000;

// FEATURE: HAR-04 -- deadline is the real epoch-ms ceiling this call must respect (threaded in from
// callModel(), which defaults it to Date.now() + 55000 when its own caller passes nothing -- see
// callModel() below). remainingMs is recomputed on every retry attempt, not just once at entry, so a
// slow transient-error backoff loop can't silently overrun the caller's real budget.
async function postToAnthropicWithRetry(body, headers, deadline) {
  for (let attempt = 0; ; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < MIN_VIABLE_CALL_MS) {
      // FEATURE: HAR-15 -- §19o names time-budget starvation a transient class; stamping it here
      // leaves HAR-17 a complete classification contract rather than a half-populated one.
      throw Object.assign(new Error(`Insufficient time remaining for Anthropic call (${remainingMs}ms left)`),
        { status: 504, failureClass: 'transient', faultCode: 'time-budget-exhausted' });
    }
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(Math.min(55000, remainingMs)),
    });
    if (res.ok) return { res, apiRetryCount: attempt };
    if (attempt >= MAX_ANTHROPIC_ATTEMPTS - 1 || !TRANSIENT_ANTHROPIC_STATUS.has(res.status)) {
      const text = await res.text();
      // FEATURE: HAR-15 -- status stays 502 (honest for OUR api: an upstream dependency failed).
      // upstreamStatus carries Anthropic's real status; failureClass is what HAR-17 must gate its
      // one auto-resume on -- never `status`, which is 502 for every upstream failure incl. 400s.
      const { failureClass, faultCode } = classifyAnthropicFailure(res.status, text);
      throw Object.assign(new Error(`Anthropic call failed: ${res.status}`), {
        status: 502, upstreamStatus: res.status, failureClass, faultCode, detail: text,
      });
    }
    await new Promise(resolve => setTimeout(resolve, API_RETRY_BACKOFF_MS[attempt]));
  }
}

// FEATURE: HAR-20 -- extracted from callModel()'s inline correction-message construction (was:
// attach a tool_result for only the FIRST tool_use block found via `content?.find`). Anthropic's
// API rejects a turn outright (400 invalid_request_error) whenever an assistant message contains
// a tool_use block with no matching tool_result immediately after -- so whenever the forced-branch
// parallel-emission bug (see buildCallBody() above) produced 2+ tool_use blocks, the old
// first-only construction left every id after the first orphaned, guaranteeing the retry a 400
// no-op for exactly this failure class (confirmed live: verbatim "tool_use ids were found without
// tool_result blocks immediately after" on all 7 failed durable_hops in the S-SES-29 run). Pure and
// exported so the Node test can import the real implementation (STANDARDS.md Section 5). Zero-block
// input (no tool_use in the failed turn) keeps the pre-existing plain-text fallback, unchanged.
export function buildParseRetryCorrection(llmContent, correctionText) {
  const toolUseBlocks = (llmContent || []).filter(b => b.type === 'tool_use');
  if (toolUseBlocks.length === 0) {
    return { role: 'user', content: correctionText };
  }
  return {
    role: 'user',
    content: toolUseBlocks.map((block, i) => ({
      type: 'tool_result',
      tool_use_id: block.id,
      content: i === 0 ? correctionText : 'Duplicate parallel tool call -- not evaluated; see the first tool_result.',
      is_error: true,
    })),
  };
}

// FEATURE: AA-80 — callModel(): pure extraction of sendRequest()'s prior Step 1 (call + retry-
// once-on-parse-failure), now shared by sendRequest() itself and execute.js's loop. Never runs
// guardrails/handler/logging -- that stays exclusively in sendRequest(). ARCHITECTURE.md §19d.
// FEATURE: HAR-04 -- deadline is a new optional param (epoch ms). Omitted by every caller that
// doesn't opt in (api/plan.js, confirmation.js) -- those get exactly today's behavior, a fresh
// 55s window computed at this exact call, byte-identical. execute.js's runLoop() (AA-139) passes
// its own already-computed deadline through here so this call's internal Anthropic request(s) are
// bounded by real remaining budget, not a blind fixed constant.
export async function callModel({ systemPrompt, model, max_tokens, temperature, format_contract, canRequestHelp = false, enableWebSearch = false, conversation_history = [], deadline = null }) {
  const effectiveDeadline = deadline || (Date.now() + 55000);
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');
  const anthropicHeaders = { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' };

  const isJson = format_contract.output_type === 'json';
  const schemaTool = (isJson && format_contract.schema)
    ? { name: format_contract.skill_profile_slug, description: 'Return structured output', input_schema: format_contract.schema }
    : null;
  const harnessTools = canRequestHelp ? [REQUEST_HELP_TOOL, DELEGATE_TO_AGENT_TOOL] : [];
  const webSearchTool = enableWebSearch ? [{ type: 'web_search_20250305', name: 'web_search' }] : [];
  const tools = [...(schemaTool ? [schemaTool] : []), ...harnessTools, ...webSearchTool];
  const hasSchemaTool = !!schemaTool;

  const callBody = buildCallBody({ format_contract, systemPrompt, model, max_tokens, temperature, canRequestHelp, enableWebSearch, conversation_history });

  const { res: llmRes, apiRetryCount } = await postToAnthropicWithRetry(callBody, anthropicHeaders, effectiveDeadline);
  let llmData = await llmRes.json();
  let usage = llmData.usage || { input_tokens: 0, output_tokens: 0 };
  let retryCount = 0;
  let turn;

  try {
    turn = parseModelTurn(llmData, hasSchemaTool, schemaTool);
  } catch (parseErr) {
    if (tools.length > 0) {
      retryCount = 1;
      // FEATURE: AA-150/AA-151 -- Anthropic's API requires a tool_result block immediately after any
      // assistant turn containing a tool_use block. The prior corrective message was always plain text,
      // which Anthropic rejects with a 400 whenever the failed turn included a tool_use -- true for
      // effectively every JSON/schema intent and any canRequestHelp intent, making this "retry once"
      // safety net a silent no-op in the majority of real cases (confirmed live: 10% of Owen's
      // qg-review-intent calls, 80% of Priya's hyp-hypothesis-test-display-intent calls). Reuses the
      // exact tool_result shape execute.js:543 already uses for delegate-hop resume, not a new pattern.
      // FEATURE: AA-182 -- parseModelTurn() already computes exactly which required field(s) were
      // missing (parseErr.message), but it was discarded before this point -- the retry's corrective
      // message was always this same generic string regardless of what actually failed, so the one
      // retry a call gets is really just another non-deterministic roll of the dice, not a corrective
      // attempt. Confirmed live: 1/5 fresh library-catalog-intent calls still hit this even with
      // temperature:0 already pinned (AA-166) -- same generic gap already visible in this file's own
      // AA-151 comments on agent-selection-intent/intelligence-review-format. Still retry-once-then-
      // throw -- this only changes what the model is told, not how many attempts it gets.
      // FEATURE: HAR-9 -- AA-182's correction text tells the model to return everything again "making
      // sure to include every field," which is correct for a genuine omission and actively harmful for
      // a truncation: the response was cut off for length, so asking for the same content plus more,
      // into the same max_tokens ceiling with a now-longer prompt, cannot succeed. Confirmed live:
      // 0 recoveries across 30 real truncation retries. Same shape as postToAnthropicWithRetry()'s
      // existing rule that a 400 is not worth retrying -- classify first, then retry only what can work.
      const correctionText = parseErr.truncated
        ? `Your previous response was cut off because it exceeded the response length limit. Return the same structured output again, but substantially more concise -- shorten or summarize the longest fields so that the complete response, including every required field, fits within the limit.`
        : `Your response did not conform to the required schema: ${parseErr.message}. Return the structured output again, exactly as specified, making sure to include every field named above.`;
      const correctionMessage = buildParseRetryCorrection(llmData.content, correctionText);
      const retryBody = {
        ...callBody,
        messages: [...callBody.messages, { role: 'assistant', content: llmData.content }, correctionMessage],
      };
      // FEATURE: HAR-04 -- same deadline-aware floor as the main call above: if the parse-failure
      // retry itself has no realistic time left to complete, skip attempting the second fetch
      // entirely and throw the existing "retry also failed" 422 immediately, rather than starting a
      // fetch Vercel will likely kill with zero trace. Detail field notes the retry was skipped (vs.
      // attempted-and-rejected) so this stays distinguishable from AA-157's rejection-reason logging.
      const retryRemainingMs = effectiveDeadline - Date.now();
      if (retryRemainingMs < MIN_VIABLE_CALL_MS) {
        console.error(`[request-receivable] callModel retry skipped: insufficient time remaining (${retryRemainingMs}ms) firstFailure="${parseErr.message}"`);
        throw Object.assign(new Error('Parse failed and retry also failed'), { status: 422, detail: `Retry skipped -- insufficient time remaining (${retryRemainingMs}ms left, need ${MIN_VIABLE_CALL_MS}ms)` });
      }
      const retryRes = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: anthropicHeaders, body: JSON.stringify(retryBody), signal: AbortSignal.timeout(Math.min(55000, retryRemainingMs)) });
      // FEATURE: AA-157 -- surface the retry's OWN rejection reason (this distinct HTTP call's real
      // status/body), not the ORIGINAL parse error that triggered the retry. Before this fix, every
      // occurrence of this 422 reported parseErr.message as `detail` -- why the FIRST call failed to
      // parse, never why the SECOND call was rejected. Confirmed live 2026-07-08: a residual ~40%
      // failure rate on hyp-hypothesis-test-display-intent's recursive delegate hops (agent-selection-
      // intent, intelligence-review-format) persisted even after AA-150's tool_result fix, distinct from
      // AA-151/S-ARCH-RETRY-CATCH-01's separate uncaught-second-parse-throw bug (that one is always
      // HTTP 500 with a raw validation message; this one is always HTTP 422 with this exact
      // "Parse failed and retry also failed" text) -- with zero forensic trace anywhere in this codebase
      // of what Anthropic actually rejected. console.error here (same [request-receivable]-prefixed
      // pattern this file already uses for guardrails/activity-log failures, Vercel-captured) plus the
      // corrected `detail` field (visible directly in the API response, no Vercel access needed) is the
      // fix -- no new Supabase column/table invented.
      if (!retryRes.ok) {
        const retryDetail = await retryRes.text().catch(() => '(failed to read retry response body)');
        console.error(`[request-receivable] callModel retry rejected: status=${retryRes.status} firstFailure="${parseErr.message}" retryBody=${retryDetail.slice(0, 1000)}`);
        throw Object.assign(new Error('Parse failed and retry also failed'), { status: 422, detail: retryDetail });
      }
      llmData = await retryRes.json();
      usage = { input_tokens: usage.input_tokens + (llmData.usage?.input_tokens || 0), output_tokens: usage.output_tokens + (llmData.usage?.output_tokens || 0) };
      // FEATURE: AA-151 -- the retry HTTP call can now succeed (AA-150's tool_result fix) while the
      // model's retried response still fails validation itself (e.g. omits a required schema field
      // again). This second parseModelTurn() call was previously unguarded, so that failure propagated
      // uncaught as a raw error (an unhandled 500) instead of the graceful "retry also failed" 422 this
      // whole block exists to produce. Confirmed live: agent-selection-intent missing
      // recommended_agent_id, intelligence-review-format missing key_data_points/override_warning, both
      // on the retried attempt, ~40-60% of Priya's hyp-hypothesis-test-display-intent calls.
      try {
        turn = parseModelTurn(llmData, hasSchemaTool, schemaTool);
      } catch (retryParseErr) {
        const detail = retryParseErr.rawInput
          ? `${retryParseErr.message} | raw_input: ${JSON.stringify(retryParseErr.rawInput)}`
          : retryParseErr.message;
        throw Object.assign(new Error('Parse failed and retry also failed'), { status: 422, detail });
      }
    } else {
      throw Object.assign(new Error('Parse failed'), { status: 422, detail: parseErr.message });
    }
  }

  return { ...turn, raw_content: llmData.content, usage, retryCount, apiRetryCount };
}

// FEATURE: AA-44 — patterns_used array built from call shape and guardrails state
// FEATURE: LOG-16 -- ragRetrieved is ai-enrichment.js's own real debug.rag_retrieved boolean
// (Object.keys(ragChunksBySection).length > 0 -- a genuine check that real chunks came back for
// THIS call), not a copy of a declared Intent Skill Profile field. Replaces the old
// intent_technical_services blanket-spread, which stamped 'rag' on every call of an intent
// regardless of whether that specific call actually retrieved anything (confirmed live 2026-07-16,
// John's platform-rules objection: a pattern must never require a profile declaration to be logged).
export function buildPatternsUsed(isJson, guardrailsRan, delegationOccurred = false, ragRetrieved = false) {
  return [
    ...(isJson ? ['structured-output', 'tool-use'] : []),
    ...(guardrailsRan ? ['prompt-chaining', 'guardrails'] : []),
    ...(delegationOccurred ? ['agent-delegation'] : []),
    ...(ragRetrieved ? ['rag'] : []),
  ];
}

// FEATURE: LOG-37 -- ARCHITECTURE.md §19i Layer A. Facts, never names: everything below is a real
// structural property of the response or of what actually executed, recorded verbatim. Layer B
// decides at read time what to call any of it. Deliberately no agent-id or capability-slug
// conditionals anywhere in here (`.claude/rules/capabilities-are-data.md`) -- capture is generic.
const RETRIEVED_CHUNK_ID_CAP = 50;

// FEATURE: LOG-49 -- ARCHITECTURE.md §19k/§19i. The model's OWN declared reference-ids, captured
// as an assertion and quarantined in its own call_facts key -- never merged into the trusted
// fact-half (tool_calls/retrieved_chunk_ids/...), never trusted alone (corroboration is
// LOG-38/read-time's job, not the writer's -- §19i "captured, never trusted alone"). A single
// shared allowlist, extensible in exactly one place; imported by execute.js so both write paths
// use the identical set. Bounded to reference-id-shaped fields only -- never the whole output.
export const SELF_REPORTED_CLAIM_FIELDS = ['source_chunk_ids', 'citation_ids', 'citations', 'reasoning_entry_id', 'entry_id', 'case_id', 'deliverable_id', 'based_on'];

// FEATURE: LOG-49 -- extract only the allowlisted reference-id fields the model actually declared,
// verbatim. Captures the model's assertion; does NOT invent, normalize, or validate against reality.
// Returns null when the output is not a structured object or declared none present-and-non-empty --
// so the "omit the key entirely when empty" contract (mergeCallFacts's null handling) holds.
export function extractSelfReportedClaims(structuredOutput) {
  if (!structuredOutput || typeof structuredOutput !== 'object' || Array.isArray(structuredOutput)) return null;
  const claims = {};
  for (const field of SELF_REPORTED_CLAIM_FIELDS) {
    const value = structuredOutput[field];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'string' && value === '') continue;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue;
    claims[field] = value;
  }
  return Object.keys(claims).length > 0 ? claims : null;
}

// FEATURE: LOG-77-9 -- ARCHITECTURE.md §19k `delegated_to_provenance` backing facts. Verbatim
// capture only, no comparison, no conclusion (§19i: the writer captures links, never the
// conclusion) -- the derived boolean lives in the Displayer view, never here. The three keys are
// the platform's own delegation vocabulary (delegate_to_agent's schema / §19d's task_context
// candidate source) -- generic, never a capability-specific read.
export const PROVENANCE_KEYS = ['agent_id', 'capability_slug', 'intent_slug'];

// Returns { delegationTarget, taskProvenance }, each null when it has no string-valued keys --
// preserving the "omit the key entirely when empty" contract (mergeCallFacts null handling).
export function extractDelegationProvenanceFacts(toolInput, taskContext) {
  const pick = (src) => {
    if (!src || typeof src !== 'object' || Array.isArray(src)) return null;
    const out = {};
    for (const k of PROVENANCE_KEYS) {
      if (typeof src[k] === 'string' && src[k] !== '') out[k] = src[k];
    }
    return Object.keys(out).length > 0 ? out : null;
  };
  return { delegationTarget: pick(toolInput), taskProvenance: pick(taskContext) };
}

// FEATURE: LOG-37 -- single source of truth for "which tools did this response actually invoke".
// `usedWebSearch` (the pre-existing HAR-05 boolean feeding patterns_used) is now derived from this
// same list rather than re-scanning rawContent with a second, drift-prone predicate. Equivalence
// with the original predicate is exact: the only tool names this platform ever sends are the
// format contract's skill_profile_slug, 'request_help', 'delegate_to_agent' and Anthropic's own
// server-side 'web_search' -- so a client `tool_use` block can never be named 'web_search'.
// The `web_search_tool_result` fallback preserves the original defensive both-shapes handling:
// depending on API version the search can surface as the paired result block alone.
export function extractToolCalls(rawContent) {
  const blocks = Array.isArray(rawContent) ? rawContent : [];
  const names = [];
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;
    if ((b.type === 'tool_use' || b.type === 'server_tool_use') && b.name) {
      names.push(b.name);
    } else if (b.type === 'web_search_tool_result' && !names.includes('web_search')) {
      names.push('web_search');
    }
  }
  return names;
}

// FEATURE: LOG-37 -- assembles the call_facts object written to ai_activity_log.call_facts.
// Keys are omitted entirely when their fact set is empty, so an all-empty call yields `{}`, which
// logActivity() writes as NULL -- "nothing to record" and "not captured" stay distinguishable.
// Gate names are the literal internal gate names ('synthesis', never 'intelligent-synthesis') --
// naming them after patterns is exactly the write-time conclusion-freezing LOG-37 exists to stop.
export function buildCallFacts({
  rawContent = [],
  guardrailsRan = false,
  reflectRan = false,
  synthesisRan = false,
  ragChunkIdsBySection = null,
  ragMethodBySection = null,
  // FEATURE: LOG-49 -- facts 2 & 3. inputReferencesOtherDeliverable: this call's input structurally
  // embedded a prior sub-call's real returned result (the "integrate" step). selfReportedClaims: the
  // model's own declared reference-ids, quarantined in its own key (never merged into the trusted
  // fact-half above). Both omitted when empty, same "null not {}" contract as every other key here.
  inputReferencesOtherDeliverable = false,
  selfReportedClaims = null,
} = {}) {
  const facts = {};

  const toolCalls = extractToolCalls(rawContent);
  if (toolCalls.length > 0) facts.tool_calls = toolCalls;

  // Flatten across sections, de-duplicate (the same chunk can legitimately come back for two
  // sections), then cap. Truncation is silent and acceptable -- the real per-section counts
  // already live in enrichDebug.rag_chunks_by_section.
  const chunkIds = [];
  const seen = new Set();
  for (const ids of Object.values(ragChunkIdsBySection || {})) {
    for (const id of (Array.isArray(ids) ? ids : [])) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      chunkIds.push(id);
    }
  }
  if (chunkIds.length > 0) facts.retrieved_chunk_ids = chunkIds.slice(0, RETRIEVED_CHUNK_ID_CAP);

  // FEATURE: LOG-37a-patch -- Layer A fact 7: *how* context was fetched. Collapsed across sections
  // because one call can legitimately fetch through several Knowledge profiles: all searches ->
  // 'similarity-search', all lookups -> 'direct-lookup', both -> 'mixed'. The key is omitted
  // entirely when no context was fetched at all, so "fetched nothing" stays distinguishable from
  // "not captured" -- same posture as every other key here.
  const methods = new Set(Object.values(ragMethodBySection || {}).filter(Boolean));
  if (methods.size === 1) facts.retrieval_method = [...methods][0];
  else if (methods.size > 1) facts.retrieval_method = 'mixed';

  const gates = [
    ...(guardrailsRan ? ['guardrails'] : []),
    ...(reflectRan ? ['reflect'] : []),
    ...(synthesisRan ? ['synthesis'] : []),
  ];
  if (gates.length > 0) facts.gated_subroutine_fired = gates;

  // FEATURE: LOG-49 -- fact 2: boolean, omitted when false/unknown.
  if (inputReferencesOtherDeliverable) facts.input_references_other_deliverable = true;
  // FEATURE: LOG-49 -- fact 3: the model's own declared reference-ids, quarantined in this key.
  if (selfReportedClaims && Object.keys(selfReportedClaims).length > 0) facts.self_reported_claims = selfReportedClaims;

  return facts;
}

// FEATURE: HAR-04 -- deadline is a new optional param, same opt-in contract as callModel()'s own:
// omitted by every caller that doesn't pass it (api/plan.js, confirmation.js) -- byte-identical
// behavior. execute.js's runLoop() passes its own real deadline through.
// FEATURE: LOG-49 -- span_id/parent_span_id thread through exactly the same passthrough that
// already carries trace_id (runLoop() -> sendRequest()); input_references_other_deliverable is set
// by runLoop() once a delegate's returned result has been folded back into this turn's input.
// All three omitted by every non-loop caller (api/plan.js, confirmation.js) -- byte-identical.
export async function sendRequest({ prompt_request, agent_id, capability_slug, tenant_id, precomputed_turn = null, delegation_occurred = false, turn_started_at = null, trace_id = null, span_id = null, parent_span_id = null, input_references_other_deliverable = false, deadline = null }) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_KEY not configured');

  const supabaseHeaders = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  const anthropicHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': anthropicKey,
    'anthropic-version': '2023-06-01',
  };

  // Accept both raw db-assembly output (sections array) and enriched ai-enrichment output (system_prompt string)
  // FEATURE: LOG-16 -- enrichDebug carries ai-enrichment.js's real per-call rag_retrieved/reflect_ran/
  // synthesis_ran booleans (named to avoid shadowing this function's own local `debug` object built
  // below, Section 5/STEP 5). intent_technical_services is still destructured (harmless, currently
  // unused downstream after this session -- db-assembly.js's own separate technical_services read,
  // used to trigger REFLECT inclusion, is untouched and unaffected).
  // FEATURE: HAR-05 -- enableWebSearch read directly off prompt_request, same shape as every
  // other top-level flag already destructured here (format_contract, llm). Unset for every
  // existing caller -- byte-identical.
  const { task_id, sections, system_prompt, format_contract, llm, enableWebSearch = false, intent_technical_services = [], debug: enrichDebug = {} } = prompt_request || {};

  if (!format_contract) {
    throw new Error('format_contract required');
  }

  // FEATURE: AA-44 — handler guard: 501 for any unimplemented handler slug
  const handlerSlug = format_contract.handler || 'store';
  if (!KNOWN_HANDLERS.includes(handlerSlug)) {
    throw Object.assign(new Error(`Handler "${handlerSlug}" not implemented`), { status: 501 });
  }

  // FEATURE: AI-43 -- when execute.js's loop already ran the real callModel() call
  // (precomputed_turn path), turn_started_at carries that call's actual start time so
  // latency_ms below reflects the real model-call-through-dispatch cost for this row,
  // instead of restarting the clock here and silently excluding the model call itself --
  // the exact gap AI-43 found (a quality-gate smoke test logged latency_ms: 49, physically
  // too fast for any real Anthropic round trip; reconfirmed live 2026-07-07 on Priya's real
  // 27.5s hypothesis-test call, wrapper row logged latency_ms: 116 for the same call).
  // Callers that never pass this param (api/plan.js, confirmation.js's resolve path,
  // sendRequest()'s own non-precomputed callers) are unaffected -- Date.now() fallback,
  // byte-identical to today.
  const startTime = turn_started_at || Date.now();
  const model = llm?.model || 'claude-sonnet-4-6';
  const max_tokens = llm?.max_tokens || 2048;
  const temperature = llm?.temperature;
  const isJson = format_contract.output_type === 'json';

  // Use pre-assembled system_prompt from ai-enrichment if present; otherwise build from sections array
  let systemPrompt;
  if (system_prompt) {
    systemPrompt = system_prompt;
  } else if (Array.isArray(sections) && sections.length > 0) {
    systemPrompt = sections.map(s => `=== ${s.label} ===\n${s.content}`).join('\n\n');
  } else {
    throw new Error('either system_prompt or sections array required');
  }

  // ── STEP 1: Send to LLM ─────────────────────────────────────────────────────
  // FEATURE: AA-80 — precomputed_turn lets execute.js's loop skip a duplicate model call when
  // it already has the final turn's parsed output. Every existing caller omits this param and
  // gets the exact original single-call, single-attempt-then-retry-once behavior, unchanged.
  let parsedResponse, usage, retryCount, rawContent;
  if (precomputed_turn) {
    parsedResponse = precomputed_turn.tool_input;
    usage = precomputed_turn.usage;
    retryCount = precomputed_turn.retryCount || 0;
    rawContent = precomputed_turn.raw_content || [];
  } else {
    // FEATURE: HAR-04 -- deadline passed through unchanged; callModel() applies its own
    // Date.now() + 55000 default when this is null (every non-opted-in caller, unaffected).
    // FEATURE: HAR-05 -- enableWebSearch threaded the same way canRequestHelp already would be
    // (this path never threads canRequestHelp either -- every existing non-precomputed caller of
    // sendRequest(), api/plan.js and confirmation.js, has no delegation flow). Unset (every
    // existing caller) is byte-identical.
    const turn = await callModel({ systemPrompt, model, max_tokens, temperature, format_contract, enableWebSearch, conversation_history: [], deadline });
    parsedResponse = turn.tool_input;
    usage = turn.usage;
    retryCount = turn.retryCount;
    rawContent = turn.raw_content || [];
  }

  // FEATURE: HAR-05 -- mechanical pattern detection (ARCHITECTURE.md §19i). Only true when the
  // Anthropic response actually contains a server-executed web_search block -- never inferred
  // from enableWebSearch being true on the request alone. Anthropic's web_search tool surfaces as
  // a `server_tool_use` block (name: 'web_search') and/or a paired `web_search_tool_result` block;
  // checked defensively for both since the exact live shape can vary slightly by API version.
  // FEATURE: LOG-37 -- the block scan itself moved into extractToolCalls() so the Layer A fact and
  // this boolean can never disagree; usedWebSearch's meaning and patterns_used are unchanged.
  const toolCallNames = extractToolCalls(rawContent);
  const usedWebSearch = toolCallNames.includes('web_search');

  // ── STEP 2: Guardrails (PAT-13) ─────────────────────────────────────────────
  let guardrailsRan = false;
  let guardrails_passed = true;
  let violations = [];

  const guardrails = format_contract.guardrails;
  const shouldRunGuardrails = guardrails ? (guardrails.must?.length > 0 || guardrails.must_not?.length > 0 || false) : false;

  // FEATURE: HAR-04 -- guardrails deadline defaults to Date.now() + 20000 (today's fixed window)
  // only when sendRequest() itself received no deadline -- unaffected callers see byte-identical
  // behavior. GUARDRAILS_MIN_VIABLE_MS floor: guardrails already fails open on any error today
  // (the catch block below), so skipping the call outright under real time pressure is safe and
  // consistent with existing behavior, not a new failure mode.
  const GUARDRAILS_MIN_VIABLE_MS = 3000;
  const guardrailsDeadline = deadline || (Date.now() + 20000);
  const guardrailsRemainingMs = guardrailsDeadline - Date.now();

  if (shouldRunGuardrails && guardrailsRemainingMs < GUARDRAILS_MIN_VIABLE_MS) {
    console.warn(`[request-receivable] guardrails check skipped: insufficient time remaining (${guardrailsRemainingMs}ms)`);
  } else if (shouldRunGuardrails) {
    // FEATURE: AA-44 — PAT-13 post-generation Haiku guardrails check
    const guardrailsStart = Date.now();
    const guardrailsModel = 'claude-haiku-4-5-20251001';
    const guardrailsPrompt = `You are a content validator. Review the following AI output and check it against the rules below.

OUTPUT:
${JSON.stringify(parsedResponse)}

MUST contain:
${guardrails.must.map(r => `- ${r}`).join('\n') || '(none)'}

MUST NOT contain:
${guardrails.must_not.map(r => `- ${r}`).join('\n') || '(none)'}

Return JSON: { "passed": true|false, "violations": ["list of rule violations, or empty"] }`;

    try {
      const gRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: anthropicHeaders,
        body: JSON.stringify({
          model: guardrailsModel,
          max_tokens: 256,
          tools: [{
            name: 'guardrails_check',
            description: 'Validate output against rules',
            input_schema: {
              type: 'object',
              properties: {
                passed: { type: 'boolean' },
                violations: { type: 'array', items: { type: 'string' } },
              },
              required: ['passed', 'violations'],
            },
          }],
          tool_choice: { type: 'tool', name: 'guardrails_check', disable_parallel_tool_use: true },
          messages: [{ role: 'user', content: guardrailsPrompt }],
        }),
        // FEATURE: HAR-04 -- bounded by real remaining time, not a blind fixed constant.
        signal: AbortSignal.timeout(Math.min(20000, guardrailsRemainingMs)),
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const gBlock = gData.content?.find(b => b.type === 'tool_use');
        if (gBlock?.input) {
          guardrails_passed = gBlock.input.passed;
          violations = gBlock.input.violations || [];
        }
        guardrailsRan = true;

        // FEATURE: AA-190e -- migrated onto logActivity(); fixed missing output_tokens (gTokens
        // previously summed input+output into a single value written only to input_tokens, with
        // no output_tokens field in the payload at all -- the real split was already sitting in
        // gData.usage and discarded).
        const guardrailsLatency = Date.now() - guardrailsStart;
        logActivity({
          tenantId: tenant_id || 'global',
          aiType: 'guardrails-check', feature: 'request-receivable',
          model: guardrailsModel, agentId: agent_id || null, taskId: task_id || null,
          inputTokens: gData.usage?.input_tokens ?? null,
          outputTokens: gData.usage?.output_tokens ?? null,
          latencyMs: guardrailsLatency,
          patternsUsed: ['guardrails', 'prompt-chaining'],
          traceId: trace_id,
          // FEATURE: LOG-49 -- this sub-write shares the enclosing execution's span (where trace_id
          // reaches a write, span must too) so the guardrails row joins the same parent->child tree.
          spanId: span_id,
          parentSpanId: parent_span_id,
          // FEATURE: LOG-37 -- this call really did invoke a tool (the guardrails_check schema
          // tool, forced via tool_choice above) and recorded nothing about it until now.
          callFacts: { tool_calls: ['guardrails_check'] },
        });
      }
    } catch (err) {
      console.warn('[request-receivable] guardrails check failed:', err.message);
    }
  }

  // ── STEP 3: Handler dispatch ─────────────────────────────────────────────────
  let deliverable_id;
  const title = typeof parsedResponse === 'object' ? parsedResponse.title : null;
  const handlerFn = HANDLERS[handlerSlug];
  const result = await handlerFn({
    task_id: task_id || null,
    agent_id,
    tenant_id,
    skill_profile_slug: format_contract.skill_profile_slug,
    title,
    content: parsedResponse,
    format: format_contract.output_type,
    handler: handlerSlug,
    supabaseUrl,
    supabaseHeaders,
  });
  deliverable_id = result.deliverable_id;

  // ── STEP 4: Server-side ai_activity_log write ────────────────────────────────
  // FEATURE: LOG-16 -- reflect_ran/synthesis_ran are real per-call facts (declaring REFLECT/
  // Prompt Compression is what makes them run, per ARCHITECTURE.md's existing "must be declared"
  // rule for those two specifically -- legitimate bucket-2 usage, unchanged) -- logged because they
  // actually ran this call, not because they're declared. No other declared pattern is spread in
  // anymore; a pattern not covered by a real per-call fact here simply isn't logged, honestly.
  const patternsUsed = Array.from(new Set([
    ...buildPatternsUsed(isJson, guardrailsRan, delegation_occurred, enrichDebug.rag_retrieved === true),
    ...(enrichDebug.reflect_ran ? ['reflect'] : []),
    ...(enrichDebug.synthesis_ran ? ['intelligent-synthesis'] : []),
    // FEATURE: HAR-05 -- mechanical only, set above from the real Anthropic response shape.
    ...(usedWebSearch ? ['tool-use'] : []),
  ]));
  const latency_ms = Date.now() - startTime;

  // FEATURE: LOG-37 -- Layer A facts assembled from data already in scope; the patternsUsed block
  // above is deliberately untouched and keeps working exactly as it does today.
  // FEATURE: LOG-67 -- fact-half (buildCallFacts) + config-half (snapshot from assemblePrompt,
  // carried through enrichPrompt as prompt_request.signature_config). signature_config is null for
  // any caller that predates LOG-67 or has no capability config -- mergeCallFacts handles null on
  // either side. The buildCallFacts({...}) argument object is unchanged; only its result is wrapped.
  const callFacts = mergeCallFacts(buildCallFacts({
    rawContent,
    guardrailsRan,
    reflectRan: enrichDebug.reflect_ran === true,
    synthesisRan: enrichDebug.synthesis_ran === true,
    ragChunkIdsBySection: enrichDebug.rag_chunk_ids_by_section,
    // FEATURE: LOG-37a-patch -- threaded off enrichDebug exactly like the ids above.
    ragMethodBySection: enrichDebug.rag_method_by_section,
    // FEATURE: LOG-49 -- fact 2 threaded from runLoop() (true once this turn's input embedded a
    // prior sub-call's returned result); fact 3 extracted from the model's own structured output
    // (parsedResponse), quarantined into its own key by buildCallFacts().
    inputReferencesOtherDeliverable: input_references_other_deliverable,
    selfReportedClaims: extractSelfReportedClaims(parsedResponse),
  }), prompt_request?.signature_config ?? null);

  // FEATURE: AI-41 — ai_type derived from capability_slug (bounded, matches SERVICE_CATALOG slugs
  // directly for channel-intelligence/quality-gate today, needs zero new AI_TYPE_TO_SERVICE entries
  // for either) instead of the hardcoded 'request-receivable' literal, which previously collapsed
  // every capability's calls into one undifferentiated AI Audit bucket. Fallback preserved for the
  // unreachable case where capability_slug is somehow absent.
  // FEATURE: LOG-91 -- write only when this function made the model call itself (precomputed_turn
  // null: api/plan.js, confirmation.js -- byte-identical for them). On the precomputed path,
  // runLoop() already logged/holds the SAME model call's agent-turn row; writing here too was the
  // double-write (1,154 live span-paired duplicates, 100% identical tokens). The facts this row
  // uniquely carried now ride back to the caller as _terminal_log (STEP 5) and merge into the
  // surviving agent-turn row instead.
  if (!precomputed_turn) {
    logActivity({
      tenantId: tenant_id || 'global',
      aiType: capability_slug || 'request-receivable',
      feature: 'request-receivable',
      model, agentId: agent_id || null, taskId: task_id || null,
      inputTokens: usage.input_tokens ?? null,
      outputTokens: usage.output_tokens ?? null,
      latencyMs: latency_ms,
      patternsUsed,
      traceId: trace_id,
      // FEATURE: LOG-49 -- the chain links for this model-call row, threaded from runLoop().
      spanId: span_id,
      parentSpanId: parent_span_id,
      // FEATURE: LOG-37 -- additive; omitted-shape callers elsewhere still write call_facts: null.
      callFacts,
    });
  }

  // ── STEP 5: Return response ──────────────────────────────────────────────────
  // FEATURE: SK-20 — content returned in response for frontend plan rendering
  // FEATURE: AG-33 — spread handler result generically so any handler's own return fields
  // (e.g. library-write's entry_id/handler_result) surface on the top-level response, not just
  // store's deliverable_id. Additive only: store.js returns exactly { deliverable_id }, so this
  // is byte-identical for every existing caller (api/plan.js, execute.js) — deliverable_id below
  // still wins if a future handler ever returned a conflicting key, same value either way today.
  return {
    ...result,
    deliverable_id,
    title,
    handler: handlerSlug,
    guardrails_passed,
    violations,
    patterns_used: patternsUsed,
    debug: {
      model,
      tokens: usage,
      latency_ms,
      guardrails_ran: guardrailsRan,
      retry_count: retryCount,
    },
    content: parsedResponse,
    // FEATURE: LOG-91 -- precomputed path only: the facts STEP 4's suppressed write would have
    // recorded, handed back so runLoop() merges them into the single surviving agent-turn row.
    // runLoop() strips this key before the result reaches any client. patternsUsed/callFacts are
    // the exact same values STEP 4 builds today -- only the destination changed. dispatch_latency_ms
    // preserves AI-43's model-through-dispatch measurement (the turn row's own latency_ms stays the
    // model-call latency the screen displays).
    ...(precomputed_turn ? {
      _terminal_log: {
        task_id: task_id || null,
        patterns_used: patternsUsed,
        call_facts: callFacts,
        dispatch_latency_ms: latency_ms,
      },
    } : {}),
  };
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt_request, agent_id, capability_slug, tenant_id } = req.body || {};
    const result = await sendRequest({ prompt_request, agent_id, capability_slug, tenant_id });
    return res.status(200).json(result);
  } catch (e) {
    console.error('[request-receivable] error:', e);
    const status = e.status || 500;
    return res.status(status).json({ error: e.message, ...(e.detail ? { detail: e.detail } : {}) });
  }
}
