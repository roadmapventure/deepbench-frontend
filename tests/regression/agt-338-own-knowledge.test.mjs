// DeepBench v7.0.771 | tests/regression/agt-338-own-knowledge.test.mjs | AGT-338 slice 2
//
// FEATURE: AGT-338 -- THE OWN-KNOWLEDGE RULE. An agent's knowledge tool gives out only that agent's
// own knowledge, on every address. Another agent's id through it is refused with the same message a
// missing agent gets. The general any-agent bundle tool is the one capability whose Intent row
// carries `traits.any_agent = true`, and it is listed on the admin address only.
//
// PURE (always run):
//   (a) bundleTarget(): with no any-agent fact the target is the HOLDER -- named, unnamed, blank or
//       not a string -- and another id throws `Unknown agent: <id>`. With the fact, the named id is
//       the target and an unnamed call is refused.
//   (b) assembleCapabilityRows() carries the Intent's fact onto the row as `any_agent`, and
//       visibleRows() drops an any-agent row from every non-admin set.
//   (c) callToolThroughExecutor() on a non-admin set: the any-agent tool is `Unknown tool`, and the
//       own-knowledge tool with an empty task_context reaches the handler seam once.
//   (d) STATIC: the fact reaches the handler (mcp.js), and the handler takes its target from
//       bundleTarget() (agent-bundle.js).
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- it CREATES and then DELETES two
// fixture agents:
//   (e) THE DISCRIMINATOR: one agent's knowledge tool asked for the other agent's id answers
//       `Unknown agent: <id2>`. The unchanged handler returns that agent's bundle. The control proves
//       the other agent IS readable through the general tool on the admin address.
//
// BASELINE: the file is new and RED on the unchanged tree -- api/_lib/handlers/agent-bundle.js
// exports no bundleTarget, and underneath that the rows carry no `any_agent`.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import * as mcp from "../../api/_lib/mcp.js";
import * as bundle from "../../api/_lib/handlers/agent-bundle.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8");
const slugs = rows => rows.map(r => r.slug);

// ---------------------------------------------------------------------------------------------
// (a) PURE: whose bundle a call names
// ---------------------------------------------------------------------------------------------
function partTarget() {
  const { bundleTarget } = bundle;
  assert.strictEqual(typeof bundleTarget, "function", "(a) api/_lib/handlers/agent-bundle.js does not export bundleTarget()");

  for (const handler_context of [{}, undefined]) {
    const label = handler_context ? "{}" : "undefined";
    for (const content of [{ agent_id: "fx-a" }, {}, null, { agent_id: " " }, { agent_id: 7 }]) {
      assert.strictEqual(bundleTarget({ agent_id: "fx-a", content, handler_context }), "fx-a",
        `(a) handler_context ${label}, content ${JSON.stringify(content)}: the target is not the holder`);
    }
    assert.throws(
      () => bundleTarget({ agent_id: "fx-a", content: { agent_id: "fx-b" }, handler_context }),
      e => e instanceof Error && e.message === "Unknown agent: fx-b",
      `(a) handler_context ${label}: another agent's id was not refused with exactly "Unknown agent: fx-b"`);
  }

  assert.strictEqual(bundleTarget({ agent_id: "fx-a", content: { agent_id: "fx-b" }, handler_context: { any_agent: true } }), "fx-b",
    "(a) with the any-agent fact the named agent is not the target");
  assert.throws(
    () => bundleTarget({ agent_id: "fx-a", content: {}, handler_context: { any_agent: true } }),
    /requires task_context\.agent_id/,
    "(a) with the any-agent fact an unnamed call was not refused");
  return ["no-id-is-the-holder", "another-id-is-unknown-agent", "any-agent-fact-reads-the-named-id"];
}

// ---------------------------------------------------------------------------------------------
// (b) PURE: the fact rides the row, and the row leaves every non-admin set
// ---------------------------------------------------------------------------------------------
const OWN_TRAITS = { handler: "agent-bundle", input_schema: { required: [], properties: {}, description: "d" } };
const cap = slug => ({ slug, name: slug, description: "d", execution_type: "deterministic", default_intent_slug: slug + "-intent", tenant_id: "global" });
const agent = id => ({ id, name: id, role: "Fixture", lane: "product", is_active: true });
const FIXTURE = {
  capabilities: [cap("fx-own"), cap("fx-any")],
  assignments: [
    { agent_id: "fx-a", capability_slug: "fx-own" },
    { agent_id: "fx-d", capability_slug: "fx-any" },
  ],
  agents: [agent("fx-a"), agent("fx-d")],
  intents: [
    { slug: "fx-own-intent", traits: OWN_TRAITS },
    { slug: "fx-any-intent", traits: { ...OWN_TRAITS, any_agent: true } },
  ],
};

function partRows() {
  const { assembleCapabilityRows, visibleRows } = mcp;
  const rows = assembleCapabilityRows(FIXTURE);
  assert.deepStrictEqual(slugs(rows), ["fx-any", "fx-own"], `(b) the fixture assembled to ${slugs(rows).join(", ")}, not its two capabilities`);
  const bySlug = slug => rows.find(r => r.slug === slug);
  assert.strictEqual(bySlug("fx-own").any_agent, false, "(b) a capability whose Intent carries no any-agent fact does not assemble with any_agent false");
  assert.strictEqual(bySlug("fx-any").any_agent, true, "(b) a capability whose Intent carries traits.any_agent = true does not assemble with any_agent true");

  const admin = visibleRows(rows, { governanceUnlocked: false, agentIds: null });
  assert.deepStrictEqual(slugs(admin), ["fx-any", "fx-own"], `(b) the admin address lists ${slugs(admin).join(", ") || "nothing"}, not both tools`);
  const team = visibleRows(rows, { governanceUnlocked: false, agentIds: ["fx-a", "fx-d"] });
  assert.deepStrictEqual(slugs(team), ["fx-own"],
    `(b) a set holding both agents lists ${slugs(team).join(", ") || "nothing"}, not exactly the own-knowledge tool`);
  const holder = visibleRows(rows, { governanceUnlocked: false, agentId: "fx-d" });
  assert.deepStrictEqual(slugs(holder), [], `(b) the any-agent tool's own holder address lists ${slugs(holder).join(", ")}`);
  return { results: ["row-carries-the-any-agent-fact", "any-agent-tool-absent-from-every-non-admin-set"], team };
}

// ---------------------------------------------------------------------------------------------
// (c) PURE: listed and callable cannot drift
// ---------------------------------------------------------------------------------------------
async function partCall(rows) {
  const { callToolThroughExecutor } = mcp;
  const calls = [];
  const executeDeterministic = async ({ row, taskContext }) => {
    calls.push({ slug: row.slug, taskContext });
    return { content: [{ type: "text", text: "{}" }], isError: false };
  };

  await assert.rejects(
    callToolThroughExecutor({ name: "fx-any", args: { task_context: { agent_id: "fx-a" } }, rows, executeDeterministic }),
    e => e.code === -32602 && e.message === "Unknown tool: fx-any",
    "(c) the any-agent tool on a non-admin set was not refused -32602 `Unknown tool: fx-any`");
  assert.strictEqual(calls.length, 0, `(c) a refused call reached the handler seam ${calls.length} time(s)`);

  await callToolThroughExecutor({ name: "fx-own", args: { task_context: {} }, rows, executeDeterministic });
  assert.strictEqual(calls.length, 1, `(c) the own-knowledge tool with an empty task_context reached the handler seam ${calls.length} time(s), not once`);
  assert.strictEqual(calls[0].slug, "fx-own", "(c) the handler seam was reached for the wrong tool");
  return ["any-agent-tool-is-unknown-off-the-admin-address", "own-tool-needs-no-id"];
}

// ---------------------------------------------------------------------------------------------
// (d) STATIC: the two wires
// ---------------------------------------------------------------------------------------------
function partStatic() {
  assert.ok(read("api/_lib/mcp.js").includes("any_agent: row.any_agent === true"),
    "(d) api/_lib/mcp.js does not hand the row's any-agent fact to the handler");
  assert.ok(read("api/_lib/handlers/agent-bundle.js").includes("const t = bundleTarget({ agent_id, content, handler_context });"),
    "(d) api/_lib/handlers/agent-bundle.js does not take its target from bundleTarget()");
  return ["fact-reaches-the-handler", "handler-target-is-bundleTarget"];
}

// ---------------------------------------------------------------------------------------------
// (e) LIVE (service key) -- creates two fixture agents and removes them. THE DISCRIMINATOR.
// ---------------------------------------------------------------------------------------------
async function partLive() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("the live own-knowledge rule: two fixture agents, one agent's knowledge tool refusing the other's id, the general tool reading it on the admin address, and the fixture cleanup",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set -- this arm writes, so it needs the service key");
    return [];
  }
  const results = [];
  const { visibleRows, fetchCapabilityRows, callToolThroughExecutor } = mcp;
  const { createPrivateAgent } = await import("../../lib/private-agent-create.js");
  const rest = `${base.replace(/\/+$/, "")}/rest/v1/`;
  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const get = async q => {
    const res = await fetch(rest + q, { headers: hdr });
    assert.ok(res.ok, `${q.split("?")[0]} -> HTTP ${res.status}`);
    return res.json();
  };
  const del = q => fetch(rest + q, { method: "DELETE", headers: { ...hdr, Prefer: "return=minimal" } });
  const log = async () => ({ ok: true, status: 201 });
  const deps = { supabaseUrl: base, supabaseKey: key, log };

  const ids = [];
  try {
    const own = await createPrivateAgent({ name: "Agt338 Own" }, deps);
    ids.push(own.agent.id);
    const other = await createPrivateAgent({ name: "Agt338 Other" }, deps);
    ids.push(other.agent.id);
    const [id1, id2] = ids;

    const all = await fetchCapabilityRows();
    const anyAgent = all.filter(r => r.any_agent === true);
    assert.ok(anyAgent.length > 0, "(e) the parent's SQL is not applied");
    assert.strictEqual(anyAgent.length, 1, `(e) ${anyAgent.length} capabilities carry the any-agent fact, not exactly 1`);
    const general = anyAgent[0];
    results.push("live-one-any-agent-capability");

    const scoped = visibleRows(all, { governanceUnlocked: false, agentIds: [id1] });
    assert.strictEqual(scoped.length, 1, `(e) the first fixture agent's address lists ${scoped.length} tools, not exactly 1`);
    const ask = (task_context, rows = scoped, name = id1 + "-knowledge") =>
      callToolThroughExecutor({ name, args: { task_context }, rows });
    const text = r => r && r.content && r.content[0] && r.content[0].text;

    const refused = await ask({ agent_id: id2 });
    assert.strictEqual(refused.isError, true,
      "(e) DISCRIMINATOR: one agent's knowledge tool asked for another agent's id did not answer with an error -- it handed out that agent's bundle");
    assert.strictEqual(text(refused), `Unknown agent: ${id2}`, "(e) DISCRIMINATOR: the refusal is not exactly `Unknown agent: <the other id>`");
    results.push("DISCRIMINATOR-live-other-agent-refused");

    const missing = await ask({ agent_id: "fx-no-such-agent" });
    assert.strictEqual(missing.isError, true, "(e) an id no agent carries did not answer with an error");
    assert.strictEqual(text(missing), "Unknown agent: fx-no-such-agent", "(e) a missing agent and another agent do not get the same message shape");

    for (const task_context of [{}, { agent_id: id1 }]) {
      const mine = await ask(task_context);
      assert.strictEqual(mine.isError, false, `(e) the agent's own knowledge was refused for task_context ${Object.keys(task_context).length ? "naming itself" : "naming nobody"}`);
      assert.strictEqual(mine.structuredContent && mine.structuredContent.agent && mine.structuredContent.agent.id, id1,
        "(e) the knowledge tool did not hand back its own agent's bundle");
    }
    results.push("live-own-knowledge-with-and-without-an-id");

    // CONTROL: the other agent IS readable -- through the general tool, on the admin address.
    const admin = visibleRows(all, { governanceUnlocked: false });
    const control = await ask({ agent_id: id2 }, admin, general.slug);
    assert.strictEqual(control.structuredContent && control.structuredContent.agent && control.structuredContent.agent.id, id2,
      "(e) CONTROL: the general tool on the admin address did not read the other fixture agent -- the refusal above proves nothing");
    assert.strictEqual(visibleRows(all, { governanceUnlocked: false, agentId: general.agent_id }).filter(r => r.any_agent === true).length, 0,
      "(e) the general tool is listed on its holder's own address");
    results.push("live-control-general-tool-admin-only");
  } finally {
    for (const id of ids) {
      await del(`agent_capability_assignments?agent_id=eq.${encodeURIComponent(id)}`);
      await del(`capabilities?slug=eq.${encodeURIComponent(id + "-knowledge")}`);
      await del(`agents?id=eq.${encodeURIComponent(id)}`);
    }
  }
  for (const id of ids) {
    const left = await get(`agents?id=eq.${encodeURIComponent(id)}&select=id`);
    assert.strictEqual(left.length, 0, `(e) ${left.length} fixture agents rows remain after cleanup`);
    const caps = await get(`capabilities?slug=eq.${encodeURIComponent(id + "-knowledge")}&select=slug`);
    assert.strictEqual(caps.length, 0, `(e) ${caps.length} fixture capabilities rows remain after cleanup`);
    const held = await get(`agent_capability_assignments?agent_id=eq.${encodeURIComponent(id)}&select=agent_id`);
    assert.strictEqual(held.length, 0, `(e) ${held.length} fixture assignment rows remain after cleanup`);
  }
  results.push("live-fixtures-removed");
  return results;
}

async function run() {
  const results = [];
  results.push(...partTarget());
  const rows = partRows();
  results.push(...rows.results);
  results.push(...(await partCall(rows.team)));
  results.push(...partStatic());
  results.push(...(await partLive()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
