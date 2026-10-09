// DeepBench | tests/regression/quip-editable.test.mjs -- the agent's quote edits in place like the name and role.
// PURE: readIdentityInput() / updateAgentIdentity() carry the quote only when given (a caller that predates it never wipes it);
// mergeRoster() lets a saved quote win over the one in code, and NULL leaves the code's quote. STATIC: the page mounts it twice.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readIdentityInput, updateAgentIdentity } from "../../lib/private-agent-create.js";
import { selfRun } from "./_lib/self-run.js";

export default async function run() {
// useAgents.js imports the browser Supabase client, which needs a URL and key to construct (no network is used here).
process.env.VITE_SUPABASE_URL ||= "https://example.test"; process.env.VITE_SUPABASE_ANON_KEY ||= "anon";
const { mergeRoster, ROSTER_TABLE_FIELDS, tableOnlyAgent } = await import("../../src/hooks/useAgents.js");
const read = p => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const count = (s, t) => s.split(t).length - 1;

const base = { agent_id: "brittany", name: "Brittany", role: "Marketing Agent" };
assert.ok(!("quip" in readIdentityInput(base)), "no quote in the body = leave it as it is");
assert.equal(readIdentityInput({ ...base, quip: "  Hello  " }).quip, "Hello");
assert.equal(readIdentityInput({ ...base, quip: "   " }).quip, null, "a blank quote clears it");
assert.ok(readIdentityInput({ ...base, quip: "x".repeat(201) }).error.includes("at most 200"));

const bodies = [];
const fetchImpl = async (url, init) => {
  if (init.method === "PATCH") bodies.push(JSON.parse(init.body));
  const row = { id: "brittany", name: "Brittany" };
  return { ok: true, status: 200, json: async () => [row], text: async () => "" };
};
const deps = { supabaseUrl: "https://x.test", supabaseKey: "k", fetchImpl };
await updateAgentIdentity({ agentId: "brittany", name: "Brittany", role: "R", specialty: null, bio: null }, deps);
assert.ok(!("quip" in bodies[0]), "an update that does not mention the quote does not write it");
await updateAgentIdentity({ agentId: "brittany", name: "Brittany", role: "R", specialty: null, bio: null, quip: "New quote" }, deps);
assert.equal(bodies[1].quip, "New quote");

assert.equal(ROSTER_TABLE_FIELDS.quip, "quip");
const merged = mergeRoster([{ id: "a", quip: '"From code."' }, { id: "b", quip: '"Also code."' }], [{ id: "a", quip: "Saved" }, { id: "b", quip: null }]);
assert.equal(merged[0].quip, "Saved", "a saved quote wins");
assert.equal(merged[1].quip, '"Also code."', "NULL leaves the quote the code carries");
assert.equal(tableOnlyAgent({ id: "z", name: "Z", quip: "Mine" }).quip, "Mine");
assert.equal(tableOnlyAgent({ id: "z", name: "Z" }).quip, "");

const screen = read("src/screens/PersonnelScreen.jsx");
assert.equal(count(screen, 'field="quip" quote placeholder="Add a quote"'), 2, "desktop badge and phone header both edit the quote in place");
assert.ok(read("src/screens/personnel/ResumeTab.jsx").includes("quip: cur.quip ?? null"), "an identity save sends the quote back unchanged");

// the Profile guide: resume-shaped, under the badge card, open until closed, closing is remembered
const facts = read("src/screens/personnel/AgentFacts.jsx");
assert.ok(facts.includes("export function ProfileGuide") && facts.includes("Fill this out like your own resume") && facts.includes("It's the experience section of the resume."));
assert.ok(facts.includes('localStorage.getItem(PROFILE_GUIDE_KEY) !== "1"') && facts.includes("return true; }"), "open by default, even when storage is unavailable");
assert.ok(facts.includes("Hide tips") && facts.includes("Show the fill-it-out tips"), "it can be closed and reopened");
assert.ok(screen.includes("{idBadge}\n      <ProfileGuide/>\n      <IdentityEditor"), "it sits directly under the first card");
console.log("ok quip-editable");
}

selfRun(import.meta.url, run);
