// DeepBench v7.0.682 | tests/regression/agt-162-agent-bundle-over-mcp.test.mjs | AGT-162
//
// FEATURE: AGT-162 -- an outside platform can pull one DeepBench agent's whole knowledge bundle
// over MCP with NO model call on DeepBench's side. Before this ticket every `tools/call` reached
// runThroughExecutor() -> runCapability(), so "give me Bob's scaffold" cost a model turn and came
// back as prose a model had written about the scaffold rather than the scaffold itself.
//
// WHAT HAS TO STAY TRUE FOREVER, and it is one sentence: the no-inference route is chosen by a READ
// of `capabilities.execution_type`, and the handler that serves it is named in DATA
// (`skill_profiles.traits.handler`), never by a conditional on a capability slug or an agent id
// (.claude/rules/capabilities-are-data.md, and api/_lib/mcp.js's own header).
//
// FOUR PARTS:
//   (a) UNIT -- the branch. Two injected spies on callToolThroughExecutor: a `deterministic` row
//       reaches `executeDeterministic` exactly once and the model executor ZERO times; an `ai` row
//       does the reverse; a call with no `task_context.agent_id` is refused -32602 naming the field
//       with BOTH spies at zero. CONTROL: the SAME capability, same handler, same input contract,
//       flipped to `execution_type: 'ai'`, goes to the model executor -- which is what proves the
//       branch reads the column and not the slug, the handler's presence, or the schema's.
//   (b) UNIT -- the data contract. A `deterministic` row whose Intent names no handler is DROPPED
//       from the tool list (advertising it would advertise a tool nothing can run); the identical
//       row with `traits.handler` set is listed. And `traits.input_schema` is published in
//       tools/list exactly as the code-side registry is, so a client learns `agent_id` from the
//       list rather than from a refusal.
//   (c) STATIC -- neither api/_lib/mcp.js nor api/_lib/handlers/agent-bundle.js contains a
//       conditional keyed to a literal slug or agent id, with a mutation control proving the check
//       discriminates.
//   (d) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- `dan-db-assembly` is listed to
//       a KEYLESS caller carrying `handler: 'agent-bundle'`; the real handler returns Bob's real
//       bundle, cross-checked field by field against an independent read of the same tables; a
//       governance-lane target is refused the SAME message a nonexistent one gets, and is served
//       once the key is presented; and the ai_activity_log row the call wrote carries
//       `ai_type 'deterministic'`, `model NULL` and `call_source 'mcp'` -- the second, independent
//       proof that no model ran.
//
// DRY-RUN against the unchanged tree (f30f3699, before the change): (a) and (b) fail at import --
// `runDeterministic` and the `executeDeterministic` / `governanceUnlocked` parameters do not exist,
// and `assembleCapabilityRows()` emits no `handler` field at all; (d) fails at import because
// api/_lib/handlers/agent-bundle.js does not exist. (c) is the only part that passes pre-change,
// and it is meant to: it is the invariant this ticket must not break.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import {
  assembleCapabilityRows,
  callToolThroughExecutor,
  visibleRows,
  fetchCapabilityRows,
  toTool,
  runDeterministic,
} from "../../api/_lib/mcp.js";
import { handle as agentBundleHandle } from "../../api/_lib/handlers/agent-bundle.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8");

// ---------------------------------------------------------------------------------------------
// Fixtures -- shaped like the four REST reads api/_lib/mcp.js makes, so the rows under test are
// built by the SHIPPED assembler rather than hand-written into the shape it happens to produce.
// ---------------------------------------------------------------------------------------------
const BUNDLE_INPUT_SCHEMA = {
  description: "Name the agent whose knowledge bundle you want.",
  required: ["agent_id"],
  properties: { agent_id: { type: "string", description: "The DeepBench agent id, e.g. bob." } },
};

const fixture = ({ executionType = "deterministic", handler = "fx-bundle-handler" } = {}) => ({
  capabilities: [
    { slug: "fx-bundle", name: "Fixture Bundle", description: "Hands back a bundle.", execution_type: executionType, default_intent_slug: "fx-bundle-intent", tenant_id: "global" },
    { slug: "fx-model", name: "Fixture Model Capability", description: "Runs a model turn.", execution_type: "ai", default_intent_slug: null, tenant_id: "global" },
  ],
  assignments: [
    { agent_id: "fx-holder", capability_slug: "fx-bundle" },
    { agent_id: "fx-holder", capability_slug: "fx-model" },
  ],
  agents: [{ id: "fx-holder", name: "Fixture Holder", role: "Fixture Role", lane: "product", is_active: true }],
  intents: [
    {
      slug: "fx-bundle-intent",
      traits: handler
        ? { handler, input_schema: BUNDLE_INPUT_SCHEMA, schema: { type: "object", properties: { agent: { type: "object" } } } }
        : { input_schema: BUNDLE_INPUT_SCHEMA },
    },
  ],
});

/** Two spies, one per execution path, so "which one ran" is a count and not an inference. */
function spies() {
  const execute = [];
  const executeDeterministic = [];
  return {
    execute,
    executeDeterministic,
    args: {
      execute: async ({ row, intentSlug, taskContext }) => {
        execute.push({ slug: row.slug, intentSlug, taskContext });
        return { content: "a model wrote this" };
      },
      executeDeterministic: async ({ row, taskContext, governanceUnlocked }) => {
        executeDeterministic.push({ slug: row.slug, handler: row.handler, taskContext, governanceUnlocked });
        return { content: [{ type: "text", text: "{}" }], isError: false };
      },
    },
  };
}

async function callWithSpies(name, taskContext, { rows, governanceUnlocked = false }) {
  const spy = spies();
  let error = null;
  let result = null;
  try {
    result = await callToolThroughExecutor({
      name,
      args: { task_context: taskContext },
      rows,
      governanceUnlocked,
      ...spy.args,
    });
  } catch (e) {
    error = e;
  }
  return { error, result, execute: spy.execute, executeDeterministic: spy.executeDeterministic };
}

// ---------------------------------------------------------------------------------------------
// Part (a) -- the branch, both directions, plus the column control
// ---------------------------------------------------------------------------------------------
async function partA_branch() {
  const results = [];
  const rows = assembleCapabilityRows(fixture());

  // THE TICKET'S OWN CASE: a deterministic capability must NOT reach the model executor.
  const det = await callWithSpies("fx-bundle", { agent_id: "bob" }, { rows, governanceUnlocked: true });
  assert.strictEqual(det.error, null, `the deterministic call must succeed, got ${det.error && det.error.message}`);
  assert.strictEqual(det.executeDeterministic.length, 1, "a deterministic capability must run its handler exactly once");
  assert.strictEqual(det.execute.length, 0,
    "a deterministic capability reached the MODEL executor -- that is the whole defect AGT-162 exists to remove");
  assert.strictEqual(det.executeDeterministic[0].handler, "fx-bundle-handler",
    "the handler must be carried on the row, read from the Intent's traits -- never looked up from the slug");
  assert.strictEqual(det.executeDeterministic[0].governanceUnlocked, true,
    "the caller's key scope must reach the handler -- the target agent's lane rule is decided with it");
  results.push("deterministic-row-runs-the-handler-not-the-model");

  // The reverse, on the same rows, in the same call shape -- so the two counts are comparable.
  const ai = await callWithSpies("fx-model", { question: "what changed?" }, { rows });
  assert.strictEqual(ai.error, null, `the ai call must succeed, got ${ai.error && ai.error.message}`);
  assert.strictEqual(ai.execute.length, 1, "an `ai` capability must still reach the model executor exactly once");
  assert.strictEqual(ai.executeDeterministic.length, 0, "an `ai` capability must never reach a deterministic handler");
  results.push("ai-row-still-runs-the-model-executor");

  // The input contract, enforced BEFORE either path. Both spies at zero is the assertion: a refusal
  // that still ran something is not a refusal.
  const bare = await callWithSpies("fx-bundle", {}, { rows });
  assert.ok(bare.error, "a bundle call with no task_context.agent_id must be REFUSED");
  assert.strictEqual(bare.error.code, -32602, `the refusal must be a protocol error, got ${bare.error.code}`);
  assert.ok(/task_context\.agent_id/.test(bare.error.message),
    `the refusal must NAME the missing field, got: ${bare.error.message}`);
  assert.strictEqual(bare.execute.length, 0, "a refused call reached the model executor");
  assert.strictEqual(bare.executeDeterministic.length, 0, "a refused call reached the deterministic handler");
  results.push("missing-agent_id-refused-32602-before-either-path");

  // THE CONTROL THAT NAMES THE MECHANISM. Same slug, same handler, same input_schema -- only
  // `execution_type` flipped. If the routing were keyed to the slug, the handler's presence or the
  // schema's, this would still take the deterministic path. It must not.
  const asAi = assembleCapabilityRows(fixture({ executionType: "ai" }));
  const control = await callWithSpies("fx-bundle", { agent_id: "bob" }, { rows: asAi });
  assert.strictEqual(control.execute.length, 1,
    "control: the SAME capability declared `ai` must go to the model executor -- the branch must read execution_type, nothing else");
  assert.strictEqual(control.executeDeterministic.length, 0,
    "control: an `ai` row with a handler still took the deterministic path -- the branch is keyed to the wrong thing");
  results.push("control-same-row-as-ai-goes-to-the-model-executor");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (b) -- the data contract: handler named in data, input contract published
// ---------------------------------------------------------------------------------------------
function partB_dataContract() {
  const results = [];

  // A deterministic row whose Intent names NO handler cannot run. Listing it would advertise a tool
  // that answers every call with an internal error, which is the same posture assembleCapabilityRows()
  // already takes for a capability with no active holder.
  const orphan = assembleCapabilityRows(fixture({ handler: null }));
  assert.ok(!orphan.some(r => r.slug === "fx-bundle"),
    "a `deterministic` capability whose Intent names no handler must be dropped from the tool list");
  assert.ok(orphan.some(r => r.slug === "fx-model"),
    "control: dropping the unrunnable row must not drop the rest of the list");
  results.push("deterministic-row-without-a-handler-is-not-listed");

  const rows = assembleCapabilityRows(fixture());
  const listed = rows.filter(r => r.slug === "fx-bundle");
  assert.strictEqual(listed.length, 1, "the same row WITH traits.handler must be listed exactly once");
  assert.strictEqual(listed[0].handler, "fx-bundle-handler", "the handler name must be carried from the Intent row onto the tool row");
  results.push("same-row-with-a-handler-is-listed-once");

  // tools/list PUBLISHES what tools/call enforces -- from `traits.input_schema`, the data home
  // api/_lib/mcp.js's own TOOL_INPUT_SCHEMAS comment names for the second capability needing one.
  const tool = toTool(listed[0]);
  assert.deepStrictEqual(tool.inputSchema.properties.task_context.required, ["agent_id"],
    `tools/list must publish the data-side input contract, got ${JSON.stringify(tool.inputSchema.properties.task_context.required)}`);
  assert.ok(tool.inputSchema.properties.task_context.properties.agent_id,
    "the published task_context schema must describe agent_id, so a client can build the call from the list");
  const plain = toTool(rows.find(r => r.slug === "fx-model"));
  assert.strictEqual(plain.inputSchema.properties.task_context.required, undefined,
    "control: a capability whose Intent declares no input_schema must still publish an OPEN task_context");
  results.push("traits-input_schema-is-published-in-tools-list");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (c) -- static: capabilities stay data in both files
// ---------------------------------------------------------------------------------------------
const stripComments = src => src.split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

// `typeof x.intent_slug === 'string'` is a TYPE check, not an identity conditional, so type checks
// are neutralised before the identity test runs -- the same two-step mcp-3-server.test.mjs part (d)
// already applies to this file, kept identical on purpose so the two checks cannot disagree about
// what "a slug conditional" means. The control below proves it still catches a real one.
const hasIdentityConditional = src =>
  /agent_?[iI]d\s*===|capability_slug\s*===|slug\s*===\s*['"]/.test(
    src.replace(/typeof\s+[\w.$[\]'"]+\s*(===|!==)\s*['"][a-z]+['"]/g, "TYPECHECK"),
  );

function partC_static() {
  const results = [];
  for (const rel of ["api/_lib/mcp.js", "api/_lib/handlers/agent-bundle.js"]) {
    const code = stripComments(read(rel));
    assert.ok(!hasIdentityConditional(code),
      `${rel} contains a conditional keyed to a literal slug or agent id -- capabilities are data, never code (.claude/rules/capabilities-are-data.md)`);
    results.push(`no-identity-conditional-in-${rel.split("/").pop()}`);
  }
  // TWO CONTROLS, and both are needed: the check must catch a real conditional, and it must not be
  // catching the type check it was just taught to ignore (a neutraliser that swallowed everything
  // would make the assertions above vacuously green).
  assert.ok(hasIdentityConditional("if (row.slug === 'dan-db-assembly') return bundle();"),
    "control: the identity-conditional check does not catch a spliced-in slug conditional -- it does not discriminate");
  assert.ok(!hasIdentityConditional("if (typeof args.intent_slug === 'string') return args.intent_slug;"),
    "control: a typeof check is being read as an identity conditional -- the neutraliser is not working");
  results.push("control-identity-conditional-check-discriminates");

  // The route must still have exactly ONE model path, and the deterministic branch must be a column
  // read rather than a second registry of slugs.
  const mcp = stripComments(read("api/_lib/mcp.js"));
  assert.ok(/execution_type\s*===\s*['"]deterministic['"]/.test(mcp),
    "api/_lib/mcp.js must choose the deterministic path by reading capabilities.execution_type");
  assert.ok(/DETERMINISTIC_HANDLERS/.test(mcp) && /row\.handler/.test(mcp),
    "the deterministic handler must be resolved by the NAME the row declares, mirroring request-receivable.js's HANDLERS");
  results.push("deterministic-branch-is-a-column-read");

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
      "the live arm (dan-db-assembly listed keyless with handler agent-bundle; the real bundle for bob; the lane rule; the model-less log row)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5. " +
        "Measured when this shipped (2026-09-28): dan-db-assembly listed to a keyless caller with handler 'agent-bundle'; bob's bundle carried 2 role prompts, 3 guardrails, 3 knowledge entries and library.tier 'denied-no-access'; " +
        "'designer' was refused `Unknown agent: designer` without the key and served with it; and the call's ai_activity_log row carried ai_type 'deterministic', model NULL, call_source 'mcp'.",
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

  // 1. THE TOOL IS LISTED TO A CALLER WITH NO KEY, and it carries its handler. The unit arm proves
  // the branch; only the live rows prove the DATA that selects it actually exists and is reachable.
  const all = await fetchCapabilityRows();
  const keyless = visibleRows(all, { governanceUnlocked: false });
  const bundleRow = keyless.find(r => r.slug === "dan-db-assembly");
  assert.ok(bundleRow,
    "dan-db-assembly is not listed to a keyless caller -- the bundle tool is unreachable for exactly the audience AGT-162 exists to serve");
  assert.strictEqual(bundleRow.execution_type, "deterministic", "dan-db-assembly must be a deterministic capability");
  assert.strictEqual(bundleRow.handler, "agent-bundle",
    `dan-db-assembly must name the agent-bundle handler in data, got ${JSON.stringify(bundleRow.handler)}`);
  assert.deepStrictEqual(toTool(bundleRow).inputSchema.properties.task_context.required, ["agent_id"],
    "the live tool must publish agent_id as its required input, from traits.input_schema");
  results.push("live-dan-db-assembly-listed-keyless-with-its-handler");

  // 2. THE REAL BUNDLE, cross-checked against an INDEPENDENT read of the same tables rather than
  // against frozen numbers -- a test grades the change, never the live world (pattern:162).
  //
  // DRIVEN THROUGH THE SHIPPED SEAM, not by calling the handler under a hand-rolled context: the
  // attribution this route establishes (call_source AND screen_origin) is half of what arm 4 below
  // grades, and a test that built its own context would be grading its own copy of it. Found the
  // hard way on this ticket's first run -- the hand-rolled version wrote an `mcp` row with a null
  // screen_origin and turned mcp-3-server.test.mjs red.
  const since = new Date(Date.now() - 1000).toISOString();
  const called = await runDeterministic({ row: bundleRow, taskContext: { agent_id: "bob" }, governanceUnlocked: false });
  assert.strictEqual(called.isError, false, `the bundle call must succeed, got ${JSON.stringify(called).slice(0, 300)}`);
  assert.ok(called.structuredContent,
    "the bundle must come back as structuredContent -- the Intent's traits.schema is published as the tool's outputSchema");
  const bundle = called.structuredContent;
  assert.strictEqual(bundle.agent.id, "bob", "the bundle must be the agent the CALLER named");
  assert.strictEqual(bundle.no_inference, true, "the bundle must declare itself inference-free");

  const configs = await get("agent_configs?agent_id=eq.bob&tenant_id=eq.global&select=type");
  const liveCount = type => configs.filter(c => c.type === type).length;
  const entries = await get("knowledge_entries?agent_id=eq.bob&tenant_id=eq.global&status=eq.active&select=id");
  assert.strictEqual(bundle.role_prompts.length, liveCount("role_prompt"), "the bundle must carry every one of bob's role prompts");
  assert.strictEqual(bundle.guardrails.length, liveCount("guardrail"), "the bundle must carry every one of bob's guardrails");
  assert.strictEqual(bundle.output_formats.length, liveCount("output_format"), "the bundle must carry every one of bob's output formats");
  assert.strictEqual(bundle.knowledge_entries.length, entries.length,
    "the bundle must carry every active knowledge_entries row -- that is what the Teach screen writes and what the caller is here for");
  assert.ok(bundle.role_prompts.length > 0 && bundle.guardrails.length > 0 && bundle.knowledge_entries.length > 0,
    "bob carries no role prompts, guardrails or taught entries at all -- this arm would be vacuous; re-point it at an agent with content");
  assert.ok(bundle.sections.length > 0, "the bundle must carry the agent's assembled Skill sections");
  assert.ok(!bundle.sections.some(s => ["current-task", "task-details", "prior-conversation", "voice"].includes(s.slug)),
    "the per-call task/voice sections are not part of a standing bundle and must be dropped");
  // THE LIBRARY IS REPORTED, NOT OMITTED -- a denial the caller can read beats a missing key it
  // would read as "this agent has no Library". WHICH denial depends on the environment, and that is
  // named rather than asserted away: the broker's queryContent() applies ONE credential precondition
  // across all its branches, so with no OPENAI_API_KEY the catalog branch -- which runs no embedding
  // and cannot use one -- denies `denied-no-config` before bob's own data-room credential is ever
  // consulted. Reported as a finding by this ticket, not fixed here (lib/search-harness.js is a
  // fourth file under a hard 3-file cap).
  assert.ok(typeof bundle.library.tier === "string" && bundle.library.tier.startsWith("denied-"),
    `bob holds no data-room credential, so the bundle must REPORT a denial rather than omit the Library, got ${JSON.stringify(bundle.library.tier)}`);
  assert.strictEqual(bundle.library.records, 0, "a denied Library read must carry no records");
  if (process.env.OPENAI_API_KEY) {
    assert.strictEqual(bundle.library.tier, "denied-no-access",
      `with the broker fully configured, bob's empty data_room_access must read as denied-no-access, got ${bundle.library.tier}`);
  } else {
    assert.strictEqual(bundle.library.tier, "denied-no-config",
      `with no OPENAI_API_KEY the broker denies on config before credential, got ${bundle.library.tier}`);
    notRun(
      "the Library tier's CREDENTIAL half (bob's empty data_room_access reading as `denied-no-access`)",
      "OPENAI_API_KEY is absent in this runner, and lib/search-harness.js's queryContent() applies one embedding-credential " +
        "precondition to every store branch -- including the_library_catalog, which runs no embedding -- so it denies `denied-no-config` first. " +
        "Indirect evidence that the credential path is the one that fires when configured: lib/librarian.js's describeLibraryCatalog() returns " +
        "`denied-no-access` for data_room_access [] and uber_access false, and bob's agents row carries exactly that (asserted live on 2026-09-28, " +
        "tier `denied-no-access`, before the handler moved onto the broker). What IS asserted here either way: the bundle reports the denial and 0 records.",
    );
  }
  console.log(`  [AGT-162] bob's bundle: ${bundle.role_prompts.length} role prompts / ${bundle.guardrails.length} guardrails / ` +
    `${bundle.knowledge_entries.length} knowledge entries / ${bundle.sections.length} sections / library ${bundle.library.tier}`);
  // The kickoff's own measurement, 2026-09-28. Content moves; the assertions above grade the change
  // against the live source, and this only says so out loud rather than failing on John's teaching.
  const measured = { role_prompts: 2, guardrails: 3, knowledge_entries: 3 };
  const drifted = Object.entries(measured).filter(([k, v]) => bundle[k].length !== v);
  if (drifted.length) {
    notRun(
      "the kickoff's measured bundle counts for bob (2 role prompts / 3 guardrails / 3 knowledge entries)",
      `bob's content has moved since 2026-09-28: ${drifted.map(([k, v]) => `${k} ${v} -> ${bundle[k].length}`).join(", ")}. ` +
        "The bundle still matches the live tables field for field (asserted above); only the frozen numbers are stale.",
    );
  }
  results.push("live-bundle-matches-the-agents-own-rows");

  // 3. THE LANE RULE, and that it is the LANE doing the work: the same id served once the key is in.
  await assert.rejects(
    () => agentBundleHandle({ agent_id: "dan", tenant_id: "global", content: { agent_id: "designer" }, handler_context: { governance_unlocked: false } }),
    /^Error: Unknown agent: designer$/,
    "a governance-lane agent must not be readable without the MCP key",
  );
  await assert.rejects(
    () => agentBundleHandle({ agent_id: "dan", tenant_id: "global", content: { agent_id: "fx-no-such-agent" }, handler_context: { governance_unlocked: true } }),
    /^Error: Unknown agent: fx-no-such-agent$/,
    "a missing agent must get the IDENTICAL message a hidden one gets -- otherwise the tool is an agent-inventory oracle",
  );
  const unlocked = await runDeterministic({ row: bundleRow, taskContext: { agent_id: "designer" }, governanceUnlocked: true });
  assert.strictEqual(unlocked.structuredContent && unlocked.structuredContent.agent.id, "designer",
    "control: with the key presented, the same governance-lane agent must be served -- otherwise the refusal above proves nothing about the lane");
  results.push("live-lane-rule-hides-governance-and-shares-one-message");

  // 4. THE SECOND, INDEPENDENT PROOF THAT NO MODEL RAN. The spy count is the code-side proof; this
  // is the platform's own audit row. Every pre-existing `call_source = 'mcp'` row carries a model,
  // because every one of them came from runCapability().
  let logRow = null;
  for (let attempt = 0; attempt < 8 && !logRow; attempt++) {
    const rows = await get(
      `ai_activity_log?feature=eq.dan-db-assembly&created_at=gte.${encodeURIComponent(since)}` +
        "&select=ai_type,model,call_source,screen_origin,input_tokens,output_tokens,cost_usd,call_facts&order=created_at.desc&limit=20",
    );
    logRow = rows.find(r => r.call_facts && r.call_facts.target_agent_id === "bob") || null;
    if (!logRow) await new Promise(r => setTimeout(r, 500));
  }
  assert.ok(logRow,
    "no ai_activity_log row was written for the bundle call -- .claude/rules/capability-logging.md: every Layer-3 execution logs, deterministic included");
  assert.strictEqual(logRow.ai_type, "deterministic", `the bundle call must log as deterministic work, got ${logRow.ai_type}`);
  assert.strictEqual(logRow.model, null,
    `the bundle call logged a model (${logRow.model}) -- the whole ticket is that no model ran on DeepBench's side`);
  assert.strictEqual(logRow.call_source, "mcp", `the bundle call must be attributed to the MCP surface, got ${logRow.call_source}`);
  assert.strictEqual(logRow.screen_origin, "mcp",
    `the deterministic path must establish the SAME screen_origin the model path does, got ${logRow.screen_origin} ` +
      "-- mcp-3-server.test.mjs grades the newest call_source='mcp' row on exactly this field");
  assert.strictEqual(logRow.input_tokens, null, "a deterministic row carries no token counts");
  assert.strictEqual(logRow.output_tokens, null, "a deterministic row carries no token counts");
  console.log(`  [AGT-162] audit row: ai_type=${logRow.ai_type} model=${logRow.model} call_source=${logRow.call_source} ` +
    `screen_origin=${logRow.screen_origin} cost=${logRow.cost_usd}`);
  results.push("live-audit-row-proves-no-model-ran");

  return results;
}

async function run() {
  const results = [];
  results.push(...(await partA_branch()));
  results.push(...partB_dataContract());
  results.push(...partC_static());
  results.push(...(await partD_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
