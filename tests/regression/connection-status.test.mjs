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
// The status is about recent calls, never a live link (DeepBench cannot see an AI tool disconnect): active in the last 7 days, quiet after, never.
assert.ok(facts.includes("export const ACTIVE_DAYS = 7;") && facts.includes('active: "● Active", quiet: "○ No recent activity", never: "○ Not connected yet"'));
assert.ok(!facts.includes('"● Connected"'), "the page no longer claims a live connection");
const src = facts.slice(facts.indexOf("export function connectionState"), facts.indexOf("\n}\n", facts.indexOf("export function connectionState")) + 3).replace("export function", "function");
const connectionState = new Function("ACTIVE_DAYS", `${src}; return connectionState;`)(7);
const now = Date.parse("2026-10-09T12:00:00Z");
assert.equal(connectionState(null, now), "never");
assert.equal(connectionState("2026-10-08T12:00:00Z", now), "active");
assert.equal(connectionState("2026-10-02T12:00:01Z", now), "active", "just inside seven days");
assert.equal(connectionState("2026-10-02T11:59:59Z", now), "quiet", "just outside seven days");
assert.equal(count(screen, "<ConnectionStatus"), 1, "one mount, inside BadgeActions (private agents only)");
assert.ok(screen.includes("{isPrivateAgent(agent) && <ConnectionStatus"), "private agents only");
assert.equal(count(screen, "!isConnectionCapability(c)"), 2, "the Capabilities card hides them (empty test and list)");
console.log("ok connection-status");
}

selfRun(import.meta.url, run);
