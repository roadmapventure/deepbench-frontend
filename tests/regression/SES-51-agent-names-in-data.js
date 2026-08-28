// DeepBench v7.0.287 | tests/regression/SES-51-agent-names-in-data.js | SES-51 (Selfbuild M3)
//
// Guards scripts/check-agent-names-in-data.js — the sweep that makes Rule #1 ("no agent is
// dependent on another, ever, in its own data") enforceable on DATA, where it had no enforcement
// at all.
//
// IT DRIVES THE REAL FUNCTIONS, never a copy (docs/STANDARDS.md Section 4's SES-45 rule: "logic
// recreated inside the test file is not a test — it is a second implementation agreeing with
// itself"). Every assertion below imports from the shipped script.
//
// EVERY CLAUSE HAS A NEGATIVE CONTROL, and two of them are the whole ticket:
//   * mentionsIn() must FIND a bare id in a routing context and must NOT find the same id in
//     innocent prose. This roster's ids include `pat`, `sam`, `dan`, `mike` and `bob` — ordinary
//     English words. A check that matched them everywhere would fire constantly and be deleted
//     within a week (SE-04's own recorded lesson); a check that matched them nowhere would miss
//     `agent_id 'riley'`, which is the exact shape LOO-013 shipped to production. The pair of
//     assertions IS the design call, so neither may be dropped without the other.
//   * findViolations() must EXEMPT an agent naming itself and must FLAG the identical row the
//     moment it also reaches somebody else. One variable moves between those two arms — the
//     second agent in `reaches` — because the self-reference exemption is derived from ownership
//     rather than from a list, and a test that only ever showed the exemption working would pass
//     just as happily over a check that exempts everything.
//
// NO CREDENTIALS ARE USED AND NONE ARE DECLARED not-run. Every exported function here is pure:
// the network lives in main(), behind the script's entry-point guard, so importing it runs
// nothing. That is deliberate and is why this test gates in CI (SES-180 (c), v7.0.286) rather
// than skipping there.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  RULE_DOC,
  ROUTING_TOKENS,
  ROUTING_WINDOW,
  SWEPT_FIELDS,
  assertRuleIntact,
  buildAgentIndex,
  mentionsIn,
  findViolations,
  jsonStringLeaves,
} from "../../scripts/check-agent-names-in-data.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const ROSTER = [
  { id: "eleanor", name: "Eleanor Voss" },
  { id: "nadia", name: "Nadia Farouk" },
  { id: "pat", name: "Pat Smiley" },
];

// ---------------------------------------------------------------------------
// The rule the check enforces is still in the document
// ---------------------------------------------------------------------------
function ruleIsStillThere() {
  const md = fs.readFileSync(path.join(REPO, RULE_DOC), "utf8");
  assert.strictEqual(assertRuleIntact(md), true,
    `${RULE_DOC} must still carry Rule #1's sentence — the check derives its whole purpose from it`);

  // NEGATIVE CONTROL: the same document with that one sentence reworded. A parser that shrugged
  // here would let the check keep "enforcing" a rule the architecture no longer states.
  const reworded = md.replace(
    /Rule #1 of this platform:\s*no agent is dependent on another, ever, in its own data\./i,
    "Rule #1 of this platform: agents may reference each other freely."
  );
  assert.notStrictEqual(reworded, md, "the control did not actually change the document");
  assert.throws(() => assertRuleIntact(reworded), /Rule #1's sentence/,
    "a reworded rule must fail LOUDLY (exit 2, cannot run), never pass quietly");
  assert.throws(() => assertRuleIntact(""), /empty or unreadable/);
}

// ---------------------------------------------------------------------------
// The roster is the source of who exists, and a half-known agent is fatal
// ---------------------------------------------------------------------------
function rosterDrivesTheSweep() {
  const idx = buildAgentIndex(ROSTER);
  assert.strictEqual(idx.length, 3);
  assert.deepStrictEqual(idx.map(a => a.id).sort(), ["eleanor", "nadia", "pat"]);

  // NEGATIVE CONTROLS: both shapes that would make the sweep report clean over an agent it could
  // not see. Skipping either silently is the failure; throwing is the behaviour.
  assert.throws(() => buildAgentIndex([]), /roster is empty/);
  assert.throws(() => buildAgentIndex([{ id: "riley" }]), /missing an id or a name/);
  assert.throws(() => buildAgentIndex([{ name: "Riley Torres" }]), /missing an id or a name/);
}

// ---------------------------------------------------------------------------
// THE DESIGN CALL: a name matches anywhere, a bare id only in a routing context
// ---------------------------------------------------------------------------
function aFullNameMatchesAnywhere() {
  const hits = mentionsIn("Escalate the chunk to Eleanor Voss when the catalogue is stale.", ROSTER);
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].agentId, "eleanor");
  assert.strictEqual(hits[0].via, "name");
}

function aBareIdMatchesOnlyInARoutingContext() {
  const routing = mentionsIn('{"executing_agent_id": "nadia"}', ROSTER);
  assert.strictEqual(routing.length, 1, "an id inside a routing field must be found");
  assert.strictEqual(routing[0].agentId, "nadia");
  assert.strictEqual(routing[0].via, "id-in-routing-context");

  // NEGATIVE CONTROL — and this is the assertion the whole design rests on. `pat` is a rostered
  // id AND an ordinary English word. Matching it here would make the check fire on innocent prose
  // in 65 skill profiles and it would be deleted within a week.
  const innocent = mentionsIn("Pat the data down into a flat table before summarising it.", ROSTER);
  assert.deepStrictEqual(innocent, [],
    "a bare id in ordinary prose, with no routing word near it, must NOT be reported");

  // SECOND NEGATIVE CONTROL: the routing word exists but is far outside ROUTING_WINDOW, so the
  // context is not this id's. Without this, one routing word anywhere would condemn a whole field.
  const far = "delegate" + " ".repeat(ROUTING_WINDOW * 2) + "pat sat by the window";
  assert.deepStrictEqual(mentionsIn(far, ROSTER), [],
    "a routing token beyond ROUTING_WINDOW must not lend its context to an unrelated id");

  // The window is a real distance, not a constant nobody exercises: the same pair inside it hits.
  const near = 'delegate to "pat" for the next hop';
  assert.strictEqual(mentionsIn(near, ROSTER).length, 1);

  assert.ok(ROUTING_TOKENS.includes("executing_agent_id") && ROUTING_TOKENS.includes("critique_agent"),
    "the two field names ARCHITECTURE.md §19e itself calls known-wrong must stay in the routing vocabulary");
}

// ---------------------------------------------------------------------------
// THE ALLOWLIST IS DERIVED: self-reference exempt, one variable makes it a violation
// ---------------------------------------------------------------------------
function anAgentMayNameItself() {
  const rows = [{
    table: "skill_profiles", key: "librarian-identity", field: "objective",
    value: "You are Eleanor Voss, the Librarian.", reaches: ["eleanor"],
  }];
  const r = findViolations(rows, ROSTER);
  assert.deepStrictEqual(r.violations, [],
    "an Identity Skill naming its own agent is correct, not a violation — the ticket says so in its own text");
  assert.strictEqual(r.fieldsExamined, 1, "the exemption must come from ownership, not from skipping the row");
}

function theSameRowReachingASecondAgentIsAViolation() {
  // ONE VARIABLE against the case above: the row now also reaches nadia.
  const rows = [{
    table: "skill_profiles", key: "librarian-identity", field: "objective",
    value: "You are Eleanor Voss, the Librarian.", reaches: ["eleanor", "nadia"],
  }];
  const r = findViolations(rows, ROSTER);
  assert.strictEqual(r.violations.length, 1,
    "data that names Eleanor and also reaches Nadia is Nadia's data naming Eleanor — Rule #1's exact shape");
  assert.strictEqual(r.violations[0].names, "eleanor");
  assert.deepStrictEqual(r.violations[0].depends, ["nadia"]);
}

function aRowNobodyHoldsIsAnObservationNotAViolation() {
  const rows = [{
    table: "skill_profiles", key: "orphan-profile", field: "method",
    value: "Hand off to Eleanor Voss.", reaches: [],
  }];
  const r = findViolations(rows, ROSTER);
  assert.deepStrictEqual(r.violations, [],
    "Rule #1 is about one agent's data naming another; a row nobody holds is not yet anyone's data");
  assert.strictEqual(r.unowned.length, 1, "but it must stay VISIBLE — an unowned row is how an unnoticed one lands wrong");
  assert.deepStrictEqual(r.unowned[0].mentions, ["eleanor"]);
}

// ---------------------------------------------------------------------------
// Nested traits: the case a flat field list misses, and the live board has one
// ---------------------------------------------------------------------------
function nestedTraitLeavesAreReached() {
  const traits = { schema: { properties: { triage: { description: "whatever the delegate Nadia routed you to" } } } };
  const leaves = jsonStringLeaves(traits, "traits");
  const leaf = leaves.find(l => l.path === "traits.schema.properties.triage.description");
  assert.ok(leaf, "a string four levels down must be reached — the ticket's scope is every trait subfield");

  const r = findViolations(
    [{ table: "skill_profiles", key: "qg-review-intent", field: leaf.path, value: leaf.value, reaches: ["owen"] }],
    ROSTER
  );
  assert.strictEqual(r.violations.length, 1, "a nested trait hides a hardcoded id from a flat field list");
  assert.strictEqual(r.violations[0].field, "traits.schema.properties.triage.description");

  // NEGATIVE CONTROL: arrays and non-strings must not be silently dropped or turned into leaves.
  assert.deepStrictEqual(
    jsonStringLeaves({ a: ["x", 1, null, { b: "y" }] }, "t").map(l => l.path),
    ["t.a[0]", "t.a[3].b"]
  );
  assert.deepStrictEqual(jsonStringLeaves(null, "t"), []);
}

// ---------------------------------------------------------------------------
// The swept surface is the one the ticket named
// ---------------------------------------------------------------------------
function theSweptSurfaceIsTheTicketsScope() {
  assert.deepStrictEqual(Object.keys(SWEPT_FIELDS).sort(),
    ["agent_configs", "capabilities", "skill_profiles"],
    "SES-51 names skill_profiles, agent_configs.text and capabilities.description as the scope");
  for (const f of ["objective", "method"]) {
    assert.ok(SWEPT_FIELDS.skill_profiles.includes(f), `skill_profiles.${f} is named in the ticket and must stay swept`);
  }
  assert.ok(SWEPT_FIELDS.agent_configs.includes("text"));
  assert.ok(SWEPT_FIELDS.capabilities.includes("description"));
}

function run() {
  ruleIsStillThere();
  rosterDrivesTheSweep();
  aFullNameMatchesAnywhere();
  aBareIdMatchesOnlyInARoutingContext();
  anAgentMayNameItself();
  theSameRowReachingASecondAgentIsAViolation();
  aRowNobodyHoldsIsAnObservationNotAViolation();
  nestedTraitLeavesAreReached();
  theSweptSurfaceIsTheTicketsScope();
}

selfRun(import.meta.url, run);
export default run;
