// DeepBench v7.0.450 | shared/models.js | LOG-149 -- THE ONE PRICING TABLE. Before this, per-1K
// rates lived in TWO places that both stopped at Sonnet 4.6: src/hooks/useAIActivity.js's
// COST_PER_1K_INPUT/OUTPUT (a browser module lib/ and api/ cannot import) and public.model_pricing
// (the IP gate's source, §19t). Neither priced claude-fable-5-1 (596 September rows),
// claude-opus-5 or claude-sonnet-5 -- the three models every governance call actually runs on --
// so cost_usd was NULL on 628 of 628 September rows carrying a model and every dollar meter read
// zero while the Anthropic Console read $4. This table is the server-importable half; the hook now
// re-exports computeCallCost() from here rather than owning a second copy, and
// tests/regression/log-149-api-dollars-ledger.test.mjs part (e) reconciles this table against
// public.model_pricing, runner_model_lanes and every model id the log actually saw this month.
//
// RATES READ 2026-09-11 against the published first-party Anthropic rates (per MTok): Fable 5.1
// $10/$50 with its own published $0.25 cache-read rate, Opus 5 $5/$25, Sonnet 5 $2/$10, Sonnet 4.6
// $3/$15, Haiku 4.5 $1/$5; text-embedding-3-small $0.02/MTok (OpenAI, carried over unchanged from
// the hook's AA-181 table). Partner rates (Bedrock/Vertex) are NOT these and are not modelled --
// this platform calls the first-party API only.
//
// FROZEN AT THE MOMENT OF THE CALL. lib/activity-log.js prices each row as it writes it, so a later
// rate change cannot silently restate history. Read-time computeCallCost() survives for the NULL
// rows that predate this ship (the client already prefers a non-NULL cost_usd).
//
// AN UNPRICED MODEL PRICES TO null, NEVER 0, and that is the load-bearing choice: a 0 is a claim
// that the call was free, which is the phantom-dollar defect §19v records from 2026-08-20 pointing
// the other way. NULL means "unknown" and part (e) is what turns an unknown into a one-line fix.
// DeepBench v6.3.98 | shared/models.js | LOG-35a -- single source of truth for canonical Anthropic model IDs
// FEATURE: LOG-35a -- see docs/STANDARDS.md Section 12 for the canonical-id rule this file exists to enforce
// structurally (one place to update, every call site imports it) instead of by convention alone.
export const MODELS = {
  HAIKU: "claude-haiku-4-5-20251001",
  SONNET: "claude-sonnet-4-6",
};

// FEATURE: SES-334 -- models that REJECT a forced tool choice, and the predicate the harness asks.
//
// MEASURED AGAINST THE LIVE API 2026-09-09, not read from a doc and not inferred: three calls to
// /v1/messages on `claude-fable-5-1` with one schema tool and, in turn, tool_choice
// `{type:'tool'}`, `{type:'any'}` and `{type:'auto'}`. The first two returned
// `invalid_request_error: tool_choice: type "tool" and "any" are not supported for this model`
// (request_ids req_011CetZ5j1nAbkAGff6sPbku / req_011CetZ5kMQCjQ3cusXm4Uo6); the third returned a
// normal turn that called the tool.
//
// WHY THIS IS DATA HERE RATHER THAN A CONDITIONAL IN THE HARNESS. It is a fact about a MODEL, not
// about a capability, and api/prompt/request-receivable.js is forbidden a per-capability branch
// (.claude/rules/capabilities-are-data.md). Every governance agent's Skill rows carry
// `llm_model = 'claude-fable-5-1'`, so before this every schema-only intent on the governance lane --
// classify-ticket, rank-backlog, verify-ship, run-project -- returned a hard 400 the moment it was
// called through the executor. SES-332 never hit it because a session runs the agent itself; SES-334
// hit it on the first scheduled call, which is what a schedule is for.
//
// A PREFIX MATCH, DELIBERATELY. The restriction travels with the model FAMILY, and pinning exact
// dated ids would mean this list silently stops matching the day a new snapshot ships -- which
// presents as the same hard 400 this exists to prevent, with nothing pointing here.
export const NO_FORCED_TOOL_CHOICE_PREFIXES = ["claude-fable-"];

export function supportsForcedToolChoice(model) {
  if (typeof model !== "string" || !model) return true; // unknown model: keep today's behaviour
  return !NO_FORCED_TOOL_CHOICE_PREFIXES.some(p => model.startsWith(p));
}

// FEATURE: SES-334 -- the SECOND restriction on the same family, found the same way: the tool_choice
// fix above got the call one step further and the API then returned
// `invalid_request_error: `temperature` is deprecated for this model` (request_id
// req_011CetZC6P5V2rF1Jri25YJN, 2026-09-09). Every governance Skill row carries `temperature = 0`, a
// value that was correct and is now a hard 400 on this family.
//
// WRITTEN AS A SECOND PREDICATE RATHER THAN FOLDED INTO THE FIRST, on purpose: they are two
// independent API facts that merely happen to share a family today. One flag called
// `isFableFamily` would be a model NAME masquerading as a capability, and the next model that
// rejects one restriction but not the other would be un-representable without unpicking it.
export const NO_TEMPERATURE_PREFIXES = ["claude-fable-"];

export function supportsTemperature(model) {
  if (typeof model !== "string" || !model) return true; // unknown model: keep today's behaviour
  return !NO_TEMPERATURE_PREFIXES.some(p => model.startsWith(p));
}

// FEATURE: LOG-149 -- per-1K USD rates. Keys are LOOKUP keys, not canonical ids: the two short-form
// entries (claude-haiku-4-5, claude-sonnet-4-5) exist so a historical row that stored the short form
// still prices, exactly as the hook's BUG-20 table did. MODEL_ID_NORMALIZE resolves them first; the
// direct key is the fallback for anything it does not map.
//
// cache_read_per_1k is OPTIONAL and only present where a model publishes its own rate. Every other
// model falls back to the 0.10x-of-input convention in computeCallCost() below -- written as a
// fallback rather than eight copied numbers so that adding a model cannot silently get it wrong.
export const MODEL_PRICING = Object.freeze({
  "claude-fable-5-1":          { input_per_1k: 0.010,   output_per_1k: 0.050, cache_read_per_1k: 0.00025 },
  "claude-opus-5":             { input_per_1k: 0.005,   output_per_1k: 0.025 },
  "claude-sonnet-5":           { input_per_1k: 0.002,   output_per_1k: 0.010 },
  "claude-sonnet-4-6":         { input_per_1k: 0.003,   output_per_1k: 0.015 },
  "claude-sonnet-4-5":         { input_per_1k: 0.003,   output_per_1k: 0.015 },   // legacy rows only
  "claude-haiku-4-5-20251001": { input_per_1k: 0.001,   output_per_1k: 0.005 },
  "claude-haiku-4-5":          { input_per_1k: 0.001,   output_per_1k: 0.005 },   // legacy short-form rows
  "text-embedding-3-small":    { input_per_1k: 0.00002, output_per_1k: 0.00002 },
});

// FEATURE: LOG-149 -- MOVED from src/hooks/useAIActivity.js (BUG-20), unchanged. It lives here now
// because lib/activity-log.js runs server-side and cannot import a browser hook; the hook imports it
// back so HarnessTraceConsole.jsx and LiveAgentViewScreen.jsx keep their existing import path.
export const MODEL_ID_NORMALIZE = {
  'claude-haiku-4-5':  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5': 'claude-sonnet-4-6',
};

// FEATURE: LOG-149 -- MOVED from src/hooks/useAIActivity.js (AA-181 + HAR-02a), one behavioural
// change: it now returns null when NO token field was supplied at all, instead of 0. A priced model
// with no tokens is an unknown cost, and writing 0 for it would put a "this call was free" claim in
// the ledger -- see the header. A priced model with real zeros (0 in, 0 out) still prices to 0,
// which is the correct answer for an unbilled refusal.
//
// Cache creation bills at 1.25x the model's input rate; cache reads at the model's own published
// rate where it has one, else the 0.10x convention. Callers that omit both params price
// byte-identically to the pre-LOG-149 hook.
export function computeCallCost(model, inputTokens, outputTokens, cacheCreationInputTokens = null, cacheReadInputTokens = null) {
  const p = MODEL_PRICING[MODEL_ID_NORMALIZE[model] || model] ?? MODEL_PRICING[model];
  if (!p) return null;
  const any = [inputTokens, outputTokens, cacheCreationInputTokens, cacheReadInputTokens].some(v => v != null);
  if (!any) return null;                                   // no tokens at all: unknown, never 0
  const cacheRead = p.cache_read_per_1k ?? p.input_per_1k * 0.10;
  return ((inputTokens || 0) / 1000) * p.input_per_1k
    + ((cacheCreationInputTokens || 0) / 1000) * p.input_per_1k * 1.25
    + ((cacheReadInputTokens || 0) / 1000) * cacheRead
    + ((outputTokens || 0) / 1000) * p.output_per_1k;
}
