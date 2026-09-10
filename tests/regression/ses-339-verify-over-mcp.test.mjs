// DeepBench v7.0.445 | tests/regression/ses-339-verify-over-mcp.test.mjs | SES-339
//
// FEATURE: SES-339 -- the Verifier's judgment is callable through MCP for any repository, and the
// INPUT half of its contract is enforced by the route rather than by the model's willingness to
// obey its own Guardrails. `vf-guardrails` already said "block on missing evidence"; before this
// ticket the only thing that enforced it was a model call that had already been spent. What has to
// stay true forever: a partial submission is refused with -32602 NAMING the field, and the executor
// is never reached.
//
// FOUR PARTS:
//   (a) UNIT -- the refusal. A tools/call on `verify-ship` with `gates.regression` absent is
//       -32602, the message names `gates.regression`, and the injected executor spy records ZERO
//       calls. Same for an empty diff, an empty kickoff and an empty changed_files. NEGATIVE
//       CONTROL: the identical call with the complete fixture reaches the spy exactly once.
//   (b) UNIT -- the discrimination control. The same partial task_context handed to a capability
//       with NO registry entry is accepted, so the refusal above is the registry doing the work and
//       not some other guard. Plus: the verifier.js-native gate shape (a status string per gate
//       with the exit codes and output in `gate_detail`) is accepted, because that JSON is what
//       `scripts/verifier.js --judge=session` pass one writes and this tool was specced to take it.
//   (c) UNIT -- tools/list PUBLISHES what tools/call enforces, so a client learns the contract from
//       the list rather than from a refusal; a tool with no registry entry still publishes the open
//       task_context it always did.
//   (d) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- every TOOL_INPUT_SCHEMAS key is
//       a REAL capability slug with an active holder. This is the half the unit arm cannot give: a
//       typo in the registry key enforces nothing at all, silently, and every unit assertion above
//       would still pass because they all name the fixture's slug. Also asserts the required-field
//       names appear in `vf-verdict-intent.method`, so the code contract and the stored instruction
//       cannot drift apart.
//
// DRY-RUN against the unchanged tree (measured 2026-09-09, before the change): every part fails at
// import -- `validateToolInput`, `TOOL_INPUT_SCHEMAS`, `normalizeGateEvidence` and the exported
// `callToolThroughExecutor` did not exist in api/mcp.js. 4 of 4 parts red pre-change.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

import {
  assembleCapabilityRows,
  callToolThroughExecutor,
  toTool,
  validateToolInput,
  normalizeGateEvidence,
  TOOL_INPUT_SCHEMAS,
  GATE_KEYS_REQUIRED,
} from "../../api/mcp.js";

const VERIFY_SLUG = Object.keys(TOOL_INPUT_SCHEMAS)[0];

// ---------------------------------------------------------------------------------------------
// Fixtures -- shaped like the four REST reads api/mcp.js makes, so the rows under test are built
// by the SHIPPED assembler rather than hand-written into the shape it happens to produce.
// ---------------------------------------------------------------------------------------------
const FIXTURE = {
  capabilities: [
    { slug: VERIFY_SLUG, name: "Verify Ship", description: "Grade one delivery.", execution_type: "ai", default_intent_slug: "fx-verdict-intent", tenant_id: "global" },
    { slug: "fx-unregistered", name: "Fixture Without A Registry Entry", description: "No input schema.", execution_type: "ai", default_intent_slug: null, tenant_id: "global" },
  ],
  assignments: [
    { agent_id: "fx-gov-agent", capability_slug: VERIFY_SLUG },
    { agent_id: "fx-gov-agent", capability_slug: "fx-unregistered" },
  ],
  agents: [{ id: "fx-gov-agent", name: "Fixture Verifier", role: "Fixture Verifier Role", lane: "governance", is_active: true }],
  intents: [
    { slug: "fx-verdict-intent", traits: { schema: { type: "object", required: ["verdict"], properties: { verdict: { type: "string" } } } } },
  ],
};

const ROWS = assembleCapabilityRows(FIXTURE);

/** A complete, honest submission -- the shape the runbook's foreign-repository recipe produces. */
const completeContext = () => ({
  backlog_id: "FX-1",
  version: "v0.0.1",
  diff: "diff --git a/a.js b/a.js\n-const x = 1;\n+const x = 2;\n",
  kickoff: "Change the constant from 1 to 2 so the smoke script prints 2.",
  gates: {
    build: { exit: 0, output: "node -e \"require('./a.js')\" -> ok" },
    regression: { exit: 0, output: "1 file, 1 assertion, 0 failures" },
    hygiene: { exit: 0, output: "no oversized docs" },
  },
  changed_files: ["a.js"],
});

/** Builds an executor spy. The seam exists precisely so a refusal can be proven to stop short. */
function spyExecutor() {
  const calls = [];
  return {
    calls,
    execute: async ({ row, intentSlug, taskContext }) => {
      calls.push({ slug: row.slug, intentSlug, taskContext });
      return { content: { verdict: "approve" } };
    },
  };
}

async function refusalFor(taskContext, { slug = VERIFY_SLUG } = {}) {
  const spy = spyExecutor();
  let error = null;
  let result = null;
  try {
    result = await callToolThroughExecutor({ name: slug, args: { task_context: taskContext }, rows: ROWS, execute: spy.execute });
  } catch (e) {
    error = e;
  }
  return { error, result, calls: spy.calls };
}

// ---------------------------------------------------------------------------------------------
// Part (a) -- the refusal, and the negative control that proves it is not refusing everything
// ---------------------------------------------------------------------------------------------
async function partA_refusal() {
  const results = [];

  // THE TICKET'S OWN CASE. gates.regression absent -- everything else complete.
  const partial = completeContext();
  delete partial.gates.regression;
  const missingGate = await refusalFor(partial);
  assert.ok(missingGate.error, "a submission missing gates.regression must be REFUSED, not executed");
  assert.strictEqual(missingGate.error.code, -32602,
    `a partial submission must be JSON-RPC -32602 Invalid params, got ${missingGate.error.code}`);
  assert.ok(/gates\.regression/.test(missingGate.error.message),
    `the refusal must NAME the missing field so the caller can fix it in one round trip: "${missingGate.error.message}"`);
  assert.deepStrictEqual(missingGate.error.data && missingGate.error.data.missing, ["gates.regression"],
    `the error data must carry the machine-readable missing list, got ${JSON.stringify(missingGate.error.data)}`);
  // THE DISCRIMINATING ASSERTION. A test that only checked the return value would pass whether or
  // not the schema were enforced, because a partial call ends in "no verdict" either way.
  assert.strictEqual(missingGate.calls.length, 0,
    "a refused tools/call reached the executor -- the whole point is that no model call is spent on a judgment that cannot be honestly made");
  results.push("missing-gate-refused-32602-without-reaching-executor");

  // An EMPTY required field is a missing one -- the kickoff's own wording, and the case a caller
  // hits by templating the arguments and forgetting to fill one in.
  const emptyDiff = { ...completeContext(), diff: "" };
  const emptyDiffRes = await refusalFor(emptyDiff);
  assert.strictEqual(emptyDiffRes.error && emptyDiffRes.error.code, -32602, "an empty diff must be refused -32602");
  assert.ok(/task_context\.diff/.test(emptyDiffRes.error.message), `the refusal must name diff: "${emptyDiffRes.error.message}"`);
  assert.strictEqual(emptyDiffRes.calls.length, 0, "an empty diff reached the executor");

  const emptyKickoff = { ...completeContext(), kickoff: "   " };
  const emptyKickoffRes = await refusalFor(emptyKickoff);
  assert.strictEqual(emptyKickoffRes.error && emptyKickoffRes.error.code, -32602, "a whitespace-only kickoff must be refused -32602");

  // [] IS NOT A SATISFIED FIELD. "This change touches no files" is not a delivery to grade, and
  // treating an empty array as present is how a fail-closed check goes green on nothing.
  const noFiles = { ...completeContext(), changed_files: [] };
  const noFilesRes = await refusalFor(noFiles);
  assert.strictEqual(noFilesRes.error && noFilesRes.error.code, -32602, "an empty changed_files array must be refused -32602");
  assert.ok(/changed_files/.test(noFilesRes.error.message), "the refusal must name changed_files");
  assert.strictEqual(noFilesRes.calls.length, 0, "an empty changed_files reached the executor");
  results.push("empty-required-fields-are-missing-fields");

  // A CLAIM OF GREEN WITH NO OUTPUT is the one thing vf-guardrails.must_not forbids the Verifier to
  // accept, so the route refuses it rather than passing it through to be refused by a model.
  const claimOnly = completeContext();
  claimOnly.gates.build = { exit: 0, output: "" };
  const claimRes = await refusalFor(claimOnly);
  assert.strictEqual(claimRes.error && claimRes.error.code, -32602,
    "a gate carrying an exit code but NO output must be refused -- that is a claim of green with nothing to check");
  assert.ok(/gates\.build\.output/.test(claimRes.error.message), `the refusal must name gates.build.output: "${claimRes.error.message}"`);
  results.push("gate-without-output-is-refused");

  // Every missing field in ONE answer, not one per round trip. An ABSENT gates object is named
  // `gates`; a PRESENT but incomplete one is named per gate, as in the first case above -- the
  // refusal tells the caller which of the two problems they have.
  const empty = await refusalFor({});
  assert.deepStrictEqual(
    empty.error.data.missing.slice().sort(),
    ["changed_files", "diff", "gates", "kickoff"],
    `an empty task_context must name every missing field at once, got ${JSON.stringify(empty.error.data.missing)}`);
  const halfGates = { ...completeContext(), gates: { build: { exit: 0, output: "ok" } } };
  const halfRes = await refusalFor(halfGates);
  assert.deepStrictEqual(halfRes.error.data.missing.slice().sort(), ["gates.hygiene", "gates.regression"],
    `a PRESENT but incomplete gates object must be named per gate, got ${JSON.stringify(halfRes.error.data.missing)}`);
  results.push("every-missing-field-named-in-one-refusal");

  // NEGATIVE CONTROL: the complete fixture reaches the executor exactly once, with the capability's
  // own stored holder and its resolved default intent -- so the guard refuses partial submissions,
  // not all of them.
  const ok = spyExecutor();
  const called = await callToolThroughExecutor({ name: VERIFY_SLUG, args: { task_context: completeContext() }, rows: ROWS, execute: ok.execute });
  assert.strictEqual(ok.calls.length, 1, "control: a COMPLETE submission did not reach the executor -- the guard is refusing everything");
  assert.strictEqual(ok.calls[0].intentSlug, "fx-verdict-intent",
    "control: the capability's default_intent_slug must still be resolved by the route (AA-188)");
  assert.strictEqual(called.isError, false, "control: a complete submission must return a successful tool result");
  assert.deepStrictEqual(called.structuredContent, { verdict: "approve" },
    "control: the schema-carrying answer must still come back as structuredContent");
  results.push("control-complete-submission-reaches-executor");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (b) -- the registry is what discriminates, and the verifier.js shape is accepted
// ---------------------------------------------------------------------------------------------
async function partB_registryDiscriminates() {
  const results = [];

  // THE CONTROL FOR THE WHOLE MECHANISM. The identical partial context, aimed at a capability with
  // no registry entry, is ACCEPTED. If this failed, part (a)'s refusal could be coming from some
  // other guard and the registry could be inert.
  const partial = completeContext();
  delete partial.gates.regression;
  const unregistered = await refusalFor(partial, { slug: "fx-unregistered" });
  assert.strictEqual(unregistered.error, null,
    `control: a capability with no registry entry must stay unconstrained, but was refused: ${unregistered.error && unregistered.error.message}`);
  assert.strictEqual(unregistered.calls.length, 1,
    "control: an unregistered capability must still reach the executor with whatever task_context it was given");
  assert.deepStrictEqual(validateToolInput("fx-unregistered", {}), { ok: true, missing: [] },
    "control: validateToolInput() must be a no-op for a slug with no registry entry");
  results.push("control-unregistered-capability-unconstrained");

  // THE PLATFORM'S OWN EVIDENCE FILE. `scripts/verifier.js --judge=session` pass one writes
  // `gates: { build: "pass", ... }` with the exit codes and output tails in `gate_detail`, and the
  // ticket specs that JSON as the task_context this tool accepts. A contract that refused it would
  // be broken on arrival.
  const verifierShape = {
    ...completeContext(),
    gates: { build: "pass", regression: "pass", hygiene: "pass" },
    gate_detail: {
      build: "exit 0 -- built in 4.1s",
      regression: "exit 0 -- 86/86 passed",
      hygiene: "exit 0 -- no tripwire",
    },
  };
  const verifierRes = await refusalFor(verifierShape);
  assert.strictEqual(verifierRes.error, null,
    `verifier.js's own judgment-context gate shape must be accepted, but was refused: ${verifierRes.error && verifierRes.error.message}`);
  assert.strictEqual(verifierRes.calls.length, 1, "the verifier.js gate shape did not reach the executor");
  results.push("verifier-js-context-shape-accepted");

  // ...but the status string ALONE, with no detail to check, is still a claim of green.
  const claimOnly = { ...completeContext(), gates: { build: "pass", regression: "pass", hygiene: "pass" } };
  delete claimOnly.gate_detail;
  const claimRes = await refusalFor(claimOnly);
  assert.strictEqual(claimRes.error && claimRes.error.code, -32602,
    "three bare status strings with no gate_detail must be refused -- that is a claim of green with no output");
  assert.strictEqual(claimRes.calls.length, 0, "a bare claim of green reached the executor");
  results.push("bare-status-strings-still-refused");

  // normalizeGateEvidence() directly, both directions, so the helper cannot pass vacuously.
  assert.deepStrictEqual(normalizeGateEvidence(null, null).missing, ["gates"], "a missing gates object must report `gates`");
  assert.deepStrictEqual(normalizeGateEvidence({ build: { exit: "0", output: "x" }, regression: { exit: 0, output: "x" }, hygiene: { exit: 0, output: "x" } }, null).missing,
    ["gates.build.exit"],
    "a STRING exit code must be reported missing -- \"0\" is truthy and the distance between truthy and 0 here is a red gate read as green");
  assert.deepStrictEqual(GATE_KEYS_REQUIRED.slice(), ["build", "regression", "hygiene"],
    "the three gates are build, regression and hygiene -- scripts/verifier.js's own GATES keys");
  results.push("gate-evidence-helper-discriminates");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (c) -- tools/list publishes what tools/call enforces
// ---------------------------------------------------------------------------------------------
function partC_published() {
  const results = [];
  const verifyRow = ROWS.find(r => r.slug === VERIFY_SLUG);
  const otherRow = ROWS.find(r => r.slug === "fx-unregistered");

  const verifyTool = toTool(verifyRow);
  const published = verifyTool.inputSchema.properties.task_context;
  assert.strictEqual(published.type, "object", "task_context must still be declared an object");
  assert.deepStrictEqual(published.required.slice().sort(), ["changed_files", "diff", "gates", "kickoff"],
    `tools/list must publish the required task_context fields, got ${JSON.stringify(published.required)}`);
  assert.ok(published.properties && published.properties.gates && published.properties.gates.properties.build,
    "the published task_context schema must describe the gates object a caller has to build");
  // What is published and what is enforced must be the SAME list -- two hand-maintained copies is
  // how a client is told one contract and refused by another.
  const enforced = TOOL_INPUT_SCHEMAS[VERIFY_SLUG].required;
  assert.deepStrictEqual(published.required, enforced,
    "the published required list and the enforced one must be the same array, not two copies");
  assert.strictEqual(verifyTool.inputSchema.required.length, 1,
    "the TOOL's own required list is still just task_context -- the fields live one level down");
  results.push("registry-entry-is-published-in-tools-list");

  const otherTool = toTool(otherRow);
  const otherCtx = otherTool.inputSchema.properties.task_context;
  assert.strictEqual(otherCtx.required, undefined,
    "a capability with no registry entry must publish an OPEN task_context, exactly as before this ticket");
  assert.strictEqual(otherCtx.type, "object", "an unregistered capability's task_context is still an object");
  results.push("unregistered-capability-publishes-open-schema");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (d) -- LIVE
// ---------------------------------------------------------------------------------------------
async function partD_live() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (every TOOL_INPUT_SCHEMAS key is a real capability slug; the required fields appear in vf-verdict-intent.method)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5. " +
        "Measured when this shipped (2026-09-09): the one registry key `verify-ship` resolves to a live capabilities row held by an active governance-lane agent, " +
        "and all four required field names appear in the stored vf-verdict-intent method.",
    );
    return results;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const res = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!res.ok) assert.fail(`Supabase read failed (${q.split("?")[0]}): HTTP ${res.status} ${await res.text()}`);
    return res.json();
  };

  // THE HALF THE UNIT ARM CANNOT GIVE. Every unit assertion above names the fixture's slug, which is
  // read OUT of the registry -- so a typo in the registry key would enforce nothing at all, on every
  // real call, and every unit assertion would still pass. Only the live capability rows can catch it.
  const slugs = Object.keys(TOOL_INPUT_SCHEMAS);
  assert.ok(slugs.length > 0, "TOOL_INPUT_SCHEMAS is empty -- nothing is enforced");
  const capRows = await get(`capabilities?select=slug,default_intent_slug&slug=in.(${slugs.map(encodeURIComponent).join(",")})`);
  const found = capRows.map(r => r.slug);
  const ghosts = slugs.filter(s => !found.includes(s));
  assert.deepStrictEqual(ghosts, [],
    `TOOL_INPUT_SCHEMAS names ${JSON.stringify(ghosts)}, which is not a capability slug -- an input contract keyed to a slug that does not exist enforces nothing, silently`);
  results.push("live-every-registry-key-is-a-real-capability");

  // ...and the capability must have an ACTIVE holder, or api/mcp.js drops the row before the
  // registry is ever consulted and the contract is dead code.
  const assignments = await get(`agent_capability_assignments?select=agent_id,capability_slug&capability_slug=in.(${slugs.map(encodeURIComponent).join(",")})`);
  const agentIds = [...new Set(assignments.map(a => a.agent_id))];
  const agents = agentIds.length ? await get(`agents?select=id,is_active,lane&id=in.(${agentIds.map(encodeURIComponent).join(",")})`) : [];
  const activeIds = new Set(agents.filter(a => a.is_active === true).map(a => a.id));
  for (const slug of slugs) {
    const holders = assignments.filter(a => a.capability_slug === slug && activeIds.has(a.agent_id));
    assert.ok(holders.length > 0,
      `capability "${slug}" carries an input contract but has no ACTIVE holder -- api/mcp.js drops the row from tools/list, so the contract is dead code`);
  }
  results.push("live-registry-capabilities-have-active-holders");

  // THE CODE CONTRACT AND THE STORED INSTRUCTION MUST NOT DRIFT. The Intent's `method` is what the
  // model is actually told to demand; the registry is what the route refuses without. If a later
  // session rewrites one, this fails rather than letting the two describe different evidence.
  const intentSlugs = [...new Set(capRows.map(r => r.default_intent_slug).filter(Boolean))];
  assert.ok(intentSlugs.length > 0, "the registry's capabilities declare no default_intent_slug -- there is no stored instruction to compare against");
  const intents = await get(`skill_profiles?select=slug,method&slug=in.(${intentSlugs.map(encodeURIComponent).join(",")})`);
  const methodText = intents.map(i => String(i.method || "")).join("\n").toLowerCase();
  console.log(`  [SES-339] registry keys: ${JSON.stringify(slugs)}; intents compared: ${JSON.stringify(intents.map(i => i.slug))}`);
  // Named by the WORD the method uses, not by the JSON key -- the stored instruction is prose.
  const wordFor = { diff: "diff", kickoff: "kickoff", gates: "gate", changed_files: "changed-file" };
  for (const slug of slugs) {
    for (const field of TOOL_INPUT_SCHEMAS[slug].required) {
      assert.ok(methodText.includes(wordFor[field] || field),
        `"${slug}" refuses a call without task_context.${field}, but no Intent method mentions "${wordFor[field] || field}" -- the route and the stored instruction have drifted`);
    }
  }
  results.push("live-registry-matches-the-stored-intent-method");

  return results;
}

async function run() {
  const results = [];
  results.push(...(await partA_refusal()));
  results.push(...(await partB_registryDiscriminates()));
  results.push(...partC_published());
  results.push(...(await partD_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
