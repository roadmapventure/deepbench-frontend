// DeepBench v7.0.447 | tests/regression/ses-347-account-field-refusal.test.mjs | SES-347
//
// FEATURE: SES-347 -- the Anthropic API refused every executor call whose tool definition paired
// `api/prompt/db-assembly.js`'s platform-injected `account` receipt (LAV-28b) with a schema property
// literally named `reasoning`. The refusal is the API's own classifier, not a model choice:
// `stop_reason: "refusal"`, `stop_details.category: "reasoning_extraction"`, empty content, before
// the model sees the request. That is why `verify-ship` returned `{"status":"in_progress"}` with a
// recovery block instead of a verdict, through the executor and through MCP alike. The fix is the
// RENAME: `vf-verdict-intent`'s `reasoning` property is now `findings`, and
// `scripts/verifier.js`'s `reconcileJudgment()` reads that field.
//
// THE MEASUREMENT, because it overturns the ticket's own starting premise. SES-339 reported that
// SHORTENING the `account` description clears the refusal. It does not, on the request the platform
// actually sends. Replaying the captured production request body one mutation at a time
// (2026-09-09, `claude-fable-5-1`, five runs per cell):
//
//     account description | property name | refusals
//     398 chars (shipped) | reasoning     | 5/5
//     118 chars (short)   | reasoning     | 5/5
//     398 chars (shipped) | findings      | 0/5
//     118 chars (short)   | findings      | 0/5
//
// The property NAME is the whole cause and the description length is irrelevant, so
// `ACCOUNT_FIELD_SPEC` is deliberately NOT edited by this ticket. Dropping `account` also clears it,
// and replacing the system prompt and the user message with trivial text does NOT -- so it is the
// tool definition alone, and `account` is the half that cannot move (every capability's contract
// carries it). SES-339's opposite finding was measured on a request with a different `max_tokens`
// and no `tool_choice`, and that shape sits on the other side of the classifier's threshold: the
// short description does clear it there. A probe that is not the shipped request shape is not a
// measurement of the shipped request.
//
// WHAT HAS TO STAY TRUE FOREVER: no Intent Skill reachable through the executor declares a schema
// property named `reasoning`, because every such contract gets `account` injected next to it and the
// whole request is then refused. The failure presents as NO answer, not a bad one -- a governance
// judgment silently returning in_progress -- which is why part (b) fails on a NEW offender rather
// than only guarding the one row this ticket fixed.
//
// THREE PARTS:
//   (a) UNIT -- `reconcileJudgment()` (imported, the real exported function) reads the agent's
//       `findings`. NEGATIVE CONTROL: an agent object carrying the OLD `reasoning` key is reported
//       as having returned no findings, so the reader genuinely moved rather than accepting both.
//   (b) LIVE (Supabase credentials, else NOT RUN) -- the stored `vf-verdict-intent` schema declares
//       `findings` in `properties` AND in `required` and declares no `reasoning`; its `method` says
//       findings; and the PLATFORM SWEEP: every Intent Skill whose `traits.schema` declares a
//       `reasoning` property must be in `MEASURED_SAFE`, so a new one fails here instead of in
//       production. Also asserts `injectAccountField()` over the real stored schema produces the
//       tool definition the executor sends, with `account` present and `reasoning` absent.
//   (c) LIVE, PAID (SES347_LIVE_REFUSAL=1 + Anthropic and Supabase credentials, else NOT RUN) -- the
//       real stored schema, injected, sent to the API in the shipped request shape. The SHIPPED
//       `findings` form must come back not-refused; the SAME request with the property renamed back
//       to `reasoning` must come back `refusal`/`reasoning_extraction`. THE PAIR IS THE
//       DISCRIMINATOR -- a one-armed pass proves only that some request works today.
//
// The paid arm is behind its own flag per docs/STANDARDS.md Section 2 rule 5 -- credentials are not
// spend, and a suite run that has SUPABASE_SERVICE_KEY must not start billing the Anthropic API.
//
// DRY-RUN against the unchanged tree (measured 2026-09-09, before the change): part (a) failed --
// `reconcileJudgment()` read `agent.reasoning`, so the findings-carrying agent produced "(the agent
// returned no reasoning)"; part (b) failed -- the stored schema declared `reasoning` and no
// `findings`, and the sweep named `vf-verdict-intent` as an unmeasured offender; part (c)'s shipped
// arm returned refusal/reasoning_extraction. 3 of 3 parts red pre-change.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import { reconcileJudgment } from "../../scripts/verifier.js";
import { injectAccountField } from "../../api/prompt/db-assembly.js";

export const VERDICT_INTENT = "vf-verdict-intent";

// THE FORBIDDEN PROPERTY NAME, and the shipped model this was measured on.
export const REFUSING_PROPERTY = "reasoning";
const REFUSAL_MODEL = "claude-fable-5-1";

// Intents that declare `reasoning` and were MEASURED not to refuse in the shipped request shape
// (2026-09-09, 0/3 each). They are listed rather than exempted by pattern: each entry is a
// measurement someone made, and an unlisted offender is one nobody has measured.
export const MEASURED_SAFE = Object.freeze(["agent-selection-intent", "pattern-vocabulary-review-intent"]);

/** The request body shape api/prompt/request-receivable.js buildCallBody() sends for a json contract. */
function callBodyFor(schema, slug) {
  return {
    model: REFUSAL_MODEL,
    max_tokens: 12000,
    tool_choice: { type: "auto", disable_parallel_tool_use: true },
    system: "You are a test harness. Answer with the tool.",
    messages: [{ role: "user", content: "Fill the tool with placeholder values." }],
    tools: [{ name: slug, description: "Return structured output", input_schema: schema }],
  };
}

/** Rename `findings` back to `reasoning` -- the pre-change shape, used as the live control. */
function withRefusingName(schema) {
  const s = JSON.parse(JSON.stringify(schema));
  s.properties[REFUSING_PROPERTY] = s.properties.findings;
  delete s.properties.findings;
  s.required = (s.required || []).map(k => (k === "findings" ? REFUSING_PROPERTY : k));
  return s;
}

async function supabaseRows(url, key, query) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  // The body is read ONCE and only on the failing branch -- an `await res.text()` interpolated into
  // an assert message is evaluated eagerly and consumes the body even when the read succeeded.
  if (!res.ok) assert.fail(`Supabase read failed (${query.split("?")[0]}): HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

// ---------------------------------------------------------------------------------------------
// Part (a) -- the reader moved, and it moved rather than widening
// ---------------------------------------------------------------------------------------------
function partA_reader() {
  const results = [];
  const mechanical = { verdict: "approve", reasoning: "all gates green" };
  const codeEligibility = { eligible: false, reason: "no executing project governs this delivery" };

  const withFindings = reconcileJudgment({
    mechanical,
    agent: { verdict: "approve", findings: "THE-FINDINGS-TEXT", auto_done_eligible: false, missing_evidence: [] },
    codeEligibility,
  });
  assert.ok(withFindings.reasoning.includes("THE-FINDINGS-TEXT"),
    `reconcileJudgment() did not carry the agent's \`findings\` into the written judgment: ${JSON.stringify(withFindings.reasoning)}`);
  results.push("reconcile-reads-the-agents-findings");

  // NEGATIVE CONTROL. An agent object carrying only the OLD key must NOT satisfy the reader -- if it
  // did, this test would pass on the pre-change code and prove nothing about the rename.
  const withOldKey = reconcileJudgment({
    mechanical,
    agent: { verdict: "approve", [REFUSING_PROPERTY]: "THE-OLD-TEXT", auto_done_eligible: false, missing_evidence: [] },
    codeEligibility,
  });
  assert.ok(!withOldKey.reasoning.includes("THE-OLD-TEXT"),
    "control: reconcileJudgment() still reads the agent's old `reasoning` key, so the reader accepts both and the rename is not actually enforced anywhere");
  assert.ok(/no findings/.test(withOldKey.reasoning),
    `control: an agent that returned no \`findings\` must say so plainly, got ${JSON.stringify(withOldKey.reasoning)}`);
  results.push("control-old-key-is-not-silently-accepted");

  // The rest of the reconcile contract is untouched by this ticket -- a rename that quietly changed
  // the verdict logic would be a much worse bug than the one it fixes.
  const tightened = reconcileJudgment({
    mechanical,
    agent: { verdict: "block", findings: "x", auto_done_eligible: false, missing_evidence: [] },
    codeEligibility,
  });
  assert.strictEqual(tightened.verdict, "block", "an agent block over a mechanical approve must still tighten to block");
  assert.strictEqual(tightened.eligible, false, "a block can never be auto-done eligible");
  results.push("reconcile-verdict-logic-unchanged");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (b) -- the stored row, and the platform sweep for the next offender
// ---------------------------------------------------------------------------------------------
async function partB_stored() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the stored-row half (vf-verdict-intent declares `findings` and no `reasoning`; no unmeasured Intent declares a `reasoning` property)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5. " +
        "Measured when this shipped (2026-09-09): vf-verdict-intent's schema declares `findings` in properties and required, no `reasoning`, and its method says " +
        "\"Return verdict, findings (each with the evidence it rests on)\"; the only Intents still declaring `reasoning` are agent-selection-intent and " +
        "pattern-vocabulary-review-intent, both measured 0/3 refusals in the shipped request shape.",
    );
    return results;
  }

  const [row] = await supabaseRows(url, key, `skill_profiles?select=slug,traits,method&slug=eq.${VERDICT_INTENT}`);
  assert.ok(row, `${VERDICT_INTENT} was not found -- the Verifier has no Intent to assemble`);
  const schema = row.traits && row.traits.schema;
  assert.ok(schema && schema.properties, `${VERDICT_INTENT} carries no traits.schema`);
  assert.ok(schema.properties.findings, `${VERDICT_INTENT} no longer declares a \`findings\` property -- the Verifier's written judgment has nowhere to go`);
  assert.strictEqual(schema.properties[REFUSING_PROPERTY], undefined,
    `${VERDICT_INTENT} declares a \`${REFUSING_PROPERTY}\` property again. Paired with the injected \`account\` receipt this makes the Anthropic API refuse the whole ` +
    "request (stop_reason refusal / reasoning_extraction, empty content), so verify-ship returns in_progress and never a verdict. Measured 5/5 (SES-347).");
  assert.ok((schema.required || []).includes("findings"), "`findings` must be required -- an optional judgment is not a judgment");
  assert.ok(!(schema.required || []).includes(REFUSING_PROPERTY), `\`${REFUSING_PROPERTY}\` is still in the required list`);
  assert.ok(/findings/i.test(String(row.method || "")),
    "the stored method still asks the agent for `reasoning` -- the schema and the instruction have drifted, which is how a required field comes back empty");
  results.push("stored-verdict-intent-declares-findings");

  // THE TOOL DEFINITION THE EXECUTOR ACTUALLY SENDS, built by the shipped injector over the stored
  // row -- not a hand-written approximation of it.
  const contract = injectAccountField({ output_type: "json", skill_profile_slug: VERDICT_INTENT, handler: "store", schema });
  const props = Object.keys(contract.schema.properties);
  assert.ok(props.includes("account"), "the LAV-28b receipt must still be injected -- this ticket does not remove it");
  assert.ok(!props.includes(REFUSING_PROPERTY), `the assembled tool definition still carries \`${REFUSING_PROPERTY}\` next to \`account\`: ${JSON.stringify(props)}`);
  results.push("assembled-tool-definition-is-clean");

  // THE SWEEP. This ticket fixed one row; the defect is a property NAME that any future Intent can
  // reintroduce, and it would present as silence rather than as an error.
  const all = await supabaseRows(url, key, "skill_profiles?select=slug,traits");
  const offenders = all
    .filter(r => r.traits && r.traits.schema && r.traits.schema.properties && r.traits.schema.properties[REFUSING_PROPERTY])
    .map(r => r.slug)
    .filter(s => !MEASURED_SAFE.includes(s));
  console.log(`  [SES-347] Intents declaring \`${REFUSING_PROPERTY}\`: ${JSON.stringify(all.filter(r => r.traits?.schema?.properties?.[REFUSING_PROPERTY]).map(r => r.slug))}`);
  assert.deepStrictEqual(offenders, [],
    `${JSON.stringify(offenders)} declare a \`${REFUSING_PROPERTY}\` schema property and have not been measured against the API. Every such contract gets \`account\` injected ` +
    "beside it, and the pairing is refused before the model sees the request -- the capability then returns in_progress forever. Either rename the property (SES-347's fix) " +
    `or measure it in the shipped request shape and add it to MEASURED_SAFE with the numbers.`);
  results.push("no-unmeasured-intent-declares-the-refusing-property");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (c) -- LIVE, PAID. The pair is the discriminator.
// ---------------------------------------------------------------------------------------------
async function partC_live() {
  const results = [];
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const optedIn = process.env.SES347_LIVE_REFUSAL === "1";

  if (!optedIn || !anthropicKey || !url || !key) {
    notRun(
      "the live pair (the shipped `findings` tool definition is accepted by the Anthropic API; the same definition with the property renamed back to `reasoning` is refused)",
      "SES347_LIVE_REFUSAL=1, ANTHROPIC_API_KEY, SUPABASE_URL and SUPABASE_SERVICE_KEY are all required -- this arm spends real money on two /v1/messages calls, so it " +
        "stays behind its own flag (docs/STANDARDS.md Section 2 rule 5: credentials are not spend). Read the secrets from public.runner_secrets by name and export them " +
        `inline. Measured when this shipped (2026-09-09, ${REFUSAL_MODEL}, five runs per cell): the \`reasoning\` form returned stop_reason \`refusal\` / ` +
        "stop_details.category `reasoning_extraction` with zero content blocks 5/5; the `findings` form returned `tool_use` 5/5. Both results held with the account " +
        "description at its shipped 398 characters and at a shortened 118, so the property name is the cause and the description length is not.",
    );
    return results;
  }

  const [row] = await supabaseRows(url, key, `skill_profiles?select=slug,traits&slug=eq.${VERDICT_INTENT}`);
  const schema = row && row.traits && row.traits.schema;
  assert.ok(schema && schema.properties && schema.properties.findings,
    `${VERDICT_INTENT} does not declare \`findings\`, so this arm cannot send the shipped contract`);

  const post = async toolSchema => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(callBodyFor(toolSchema, VERDICT_INTENT)),
    });
    const body = await res.json();
    return {
      status: res.status,
      stopReason: body.stop_reason,
      category: body.stop_details && body.stop_details.category,
      blocks: Array.isArray(body.content) ? body.content.length : null,
    };
  };

  const injected = injectAccountField({ output_type: "json", skill_profile_slug: VERDICT_INTENT, handler: "store", schema });

  const shipped = await post(injected.schema);
  console.log(`  [SES-347] shipped (\`findings\`)   -> HTTP ${shipped.status}, stop_reason ${shipped.stopReason}, blocks ${shipped.blocks}`);
  assert.strictEqual(shipped.status, 200, `the shipped tool definition did not reach the API: HTTP ${shipped.status}`);
  assert.notStrictEqual(shipped.stopReason, "refusal",
    `the SHIPPED tool definition is still refused by the API (category ${shipped.category}) -- verify-ship returns no verdict at all in this state`);
  assert.ok(shipped.blocks > 0, "the accepted call came back with no content blocks");
  results.push("live-shipped-findings-definition-is-accepted");

  // THE DISCRIMINATOR. Byte-identical apart from the one property name.
  const control = await post(withRefusingName(injected.schema));
  console.log(`  [SES-347] control (\`${REFUSING_PROPERTY}\`) -> HTTP ${control.status}, stop_reason ${control.stopReason}, category ${control.category}, blocks ${control.blocks}`);
  assert.strictEqual(control.stopReason, "refusal",
    `renaming the property back to \`${REFUSING_PROPERTY}\` was NOT refused this run (stop_reason ${control.stopReason}). Either the API's classifier changed or this ` +
    "request no longer reproduces SES-347 -- do not read the arm above as proof until that is understood; a one-armed pass proves only that some request works today.");
  assert.strictEqual(control.category, "reasoning_extraction",
    `the control was refused for ${control.category}, not reasoning_extraction -- a different refusal is a different defect`);
  assert.strictEqual(control.blocks, 0, "a reasoning_extraction refusal returns empty content; this one did not");
  results.push("live-reasoning-named-definition-is-still-refused");

  return results;
}

async function run() {
  const results = [];
  results.push(...partA_reader());
  results.push(...(await partB_stored()));
  results.push(...(await partC_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
