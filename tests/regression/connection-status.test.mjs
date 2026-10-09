// DeepBench | tests/regression/connection-status.test.mjs -- the two creation-time capabilities (Intent
// agent-bundle-intent / agent-teach-intent) are shown as read-only connection settings under the Connect to AI
// button and kept out of the Capabilities card. STATIC: the source carries the labels, the filter and the mounts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selfRun } from "./_lib/self-run.js";

export default async function run() {
const read = p => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const facts = read("src/screens/personnel/AgentFacts.jsx");
const screen = read("src/screens/PersonnelScreen.jsx");
const count = (s, t) => s.split(t).length - 1;

assert.ok(facts.includes('["agent-bundle-intent", "agent-teach-intent"]'), "the two connection Intents are named in data");
assert.ok(!facts.includes("Configuration"), "no Configuration link");
assert.ok(facts.includes("<UsageCountRow agentId={agentId} align={align} />"), "Times used sits under Last used");
assert.ok(facts.includes('.eq("call_source", "mcp")') && facts.includes('call_facts->>target_agent_id'), "connected = an MCP call for this agent");
assert.equal(count(screen, "<ConnectionStatus"), 1, "one mount, inside BadgeActions (private agents only)");
assert.ok(screen.includes("{isPrivateAgent(agent) && <ConnectionStatus"), "private agents only");
assert.equal(count(screen, "!isConnectionCapability(c)"), 2, "the Capabilities card hides them (empty test and list)");
console.log("ok connection-status");
}

selfRun(import.meta.url, run);
