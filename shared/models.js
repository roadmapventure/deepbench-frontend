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
