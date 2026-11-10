// DeepBench v7.0.994 | tests/regression/agt-359-bundle-contract.test.mjs | AGT-359
//
// FEATURE: AGT-359 -- the bundle's PUBLISHED schema declares what the bundle actually returns.
// api/_lib/handlers/agent-bundle.js returns eleven keys; the three `skill_profiles` rows whose
// `traits.handler = 'agent-bundle'` published an eight-property `traits.schema` as their MCP
// `outputSchema`, so `capabilities`, `taught` and `records` reached clients undeclared and
// `knowledge_entries` was described as the rows it stopped being at AGT-342 (v7.0.759).
//
// FOUR ARMS, in the kickoff's order:
//   1. ANCHOR -- the eleven names are read out of the handler's own source by the quoted path, and
//      the contract closes over them with no gap either way. K is written out here rather than
//      derived from the schema: a list derived from the thing it grades is a second implementation
//      agreeing with itself (docs/STANDARDS.md Section 4, the SES-45 rule).
//   2. BOTH WAYS -- the ticket's own acceptance criterion. The PRE-CHANGE schema (OLD: this schema
//      with capabilities/taught/records removed) must be flagged for exactly those three, an
//      invented key must be rejected, and a declared property the handler stopped returning must be
//      reported too. Arm 2 is the control for arm 1: a gap check that passed OLD would pass the
//      unchanged rows.
//   3. SHAPE -- the declared item keys of `taught` and `records` are the keys lib/read-taught.js
//      really produces, asserted against shapeTaught() itself, never against a copy of its output.
//   4. LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the three rows carry the schema
//      and the output_desc, and the `capabilities` shape is graded against a real
//      readCapabilitySkills() read rather than a frozen fixture (pattern:162).
//
// DRY-RUN against the unchanged tree (origin/dev before this change): arm 4 fails -- all three rows
// read back `STALE: traits.schema, output_desc` (measured 2026-11-10, tree eb0116b). Arms 1-3 pass
// on the unchanged tree, because the handler and the reader are not what this ticket changes.
//
// NAMED, NOT PINNED (the kickoff's stop line): `agent`, `library` and `sections` stay bare types by
// decision, and nothing here pins `knowledge_entries`' item keys -- it is declared as an index, and
// the index's own shape is AGT-342's, not this ticket's.

import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import {
  BUNDLE_SCHEMA,
  HANDLER_FILE,
  OUTPUT_DESC,
  ROWS_QUERY,
  contractGap,
  returnedKeys,
  rowGap,
} from "../../scripts/bundle-contract.js";
import { shapeTaught } from "../../lib/read-taught.js";
import { readCapabilitySkills } from "../../api/_lib/handlers/agent-bundle.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// The anchor, verbatim: the eleven names api/_lib/handlers/agent-bundle.js hands back, in order.
const K = [
  "agent", "role_prompts", "guardrails", "output_formats", "sections",
  "capabilities", "taught", "records", "knowledge_entries", "library", "no_inference",
];

// The three rows CONTEXT names -- one handler, three Intent rows, one schema (D1).
const SLUGS = ["agent-bundle-any-intent", "agent-bundle-intent", "agent-capability-intent"];

// The PRE-CHANGE contract: this schema with the three keys the ticket adds taken back out. Built
// from BUNDLE_SCHEMA so it cannot drift into a stale hand-copy of the old row.
const OLD = (() => {
  const properties = { ...BUNDLE_SCHEMA.properties };
  delete properties.capabilities;
  delete properties.taught;
  delete properties.records;
  return { ...BUNDLE_SCHEMA, properties };
})();

// -----------------------------------------------------------------------------------------------
// Arm 1 -- the anchor: what the handler returns, read from the handler
// -----------------------------------------------------------------------------------------------
function arm1_anchor() {
  const results = [];
  const src = fs.readFileSync(path.join(REPO, HANDLER_FILE), "utf8");

  assert.deepEqual(returnedKeys(src), K,
    `${HANDLER_FILE}'s return line no longer hands back exactly these 11 names, in this order -- ` +
      `the published contract is graded against that line, so it must be re-read before the schema moves`);
  results.push("handler-returns-the-eleven-anchor-names");

  assert.equal(contractGap(BUNDLE_SCHEMA, K), null,
    `the contract does not close over what the handler returns: ${JSON.stringify(contractGap(BUNDLE_SCHEMA, K))}`);
  results.push("contract-closes-both-ways-over-the-handler");

  for (const name of BUNDLE_SCHEMA.required) {
    assert.ok(K.includes(name),
      `the schema requires \`${name}\`, which the handler does not return -- a required key the bundle never sends makes every bundle invalid`);
  }
  results.push(`all-${BUNDLE_SCHEMA.required.length}-required-names-are-returned`);

  // A key the handler stopped returning must still be MISSED, not silently tolerated.
  assert.equal(returnedKeys(src).length, 11, "the anchor is eleven keys");
  results.push("anchor-is-eleven-keys");

  return results;
}

// -----------------------------------------------------------------------------------------------
// Arm 2 -- both ways, which is the ticket's own acceptance criterion
// -----------------------------------------------------------------------------------------------
function arm2_both_ways() {
  const results = [];

  // CONTROL: the pre-change schema. A gap check that did not flag it would pass the live rows
  // exactly as they stood before this ticket, and arm 1 would be vacuous.
  const old = contractGap(OLD, K);
  assert.deepEqual(old && old.undeclared, ["capabilities", "taught", "records"],
    `the pre-change schema must be flagged for exactly the three keys AGT-342 and the capabilities ship left undeclared, got ${JSON.stringify(old)}`);
  assert.deepEqual(old.unreturned, [],
    `the pre-change schema declared nothing the handler does not return, got ${JSON.stringify(old.unreturned)}`);
  results.push("control-pre-change-schema-is-flagged-for-the-three-keys");

  // Direction A: a key the handler returns that the schema does not declare.
  const invented = contractGap(BUNDLE_SCHEMA, [...K, "x"]);
  assert.deepEqual(invented && invented.undeclared, ["x"],
    `an undeclared key must be rejected, got ${JSON.stringify(invented)}`);
  results.push("an-undeclared-returned-key-is-rejected");

  // Direction B: a property the schema declares that the handler does not return.
  const dropped = contractGap(BUNDLE_SCHEMA, K.filter(k => k !== "taught"));
  assert.deepEqual(dropped && dropped.unreturned, ["taught"],
    `a declared property the handler stopped returning must be reported, got ${JSON.stringify(dropped)}`);
  assert.deepEqual(dropped.undeclared, [], "nothing else became undeclared when taught was dropped from the keys");
  results.push("a-declared-but-unreturned-property-is-reported");

  // returnedKeys() THROWS on a reshaped return rather than reporting no keys -- an empty list would
  // make every gap above look closed.
  assert.throws(() => returnedKeys("  return { agent, library };\n"),
    /no .*no_inference: true.* line found/,
    "returnedKeys must throw when the handler's return line cannot be found, never hand back an empty list");
  results.push("returnedKeys-throws-rather-than-reporting-no-keys");

  return results;
}

// -----------------------------------------------------------------------------------------------
// Arm 3 -- the declared item keys are the reader's real keys
// -----------------------------------------------------------------------------------------------
function arm3_shape() {
  const results = [];
  const kn = shapeTaught([{ source: "user" }, { source: "agent" }]);
  const P = BUNDLE_SCHEMA.properties;

  assert.deepEqual(Object.keys(kn.taught[0]), P.taught.properties.items.items.required,
    `taught.items declares keys lib/read-taught.js does not produce: it produces ${JSON.stringify(Object.keys(kn.taught[0]))}`);
  assert.deepEqual(Object.keys(kn.records[0]), P.records.properties.items.items.required,
    `records.items declares keys lib/read-taught.js does not produce: it produces ${JSON.stringify(Object.keys(kn.records[0]))}`);
  results.push("taught-and-records-item-keys-are-the-readers-own");

  assert.deepEqual(P.taught.required, ["framing", "items"], "a group is framing + items -- framing says how to use the text");
  assert.deepEqual(P.records.required, ["framing", "items"], "a group is framing + items -- framing says how to use the text");
  results.push("both-groups-declare-framing-and-items");

  return results;
}

// -----------------------------------------------------------------------------------------------
// Arm 4 -- LIVE
// -----------------------------------------------------------------------------------------------
async function arm4_live() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (the three agent-bundle Intent rows carry this schema and output_desc; the capabilities shape graded against a real readCapabilitySkills() read)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5. " +
        "Measured when this shipped (2026-11-10): 3 rows, all current; bob holds 1 capability with 2 Skills.",
    );
    return results;
  }

  const base = url.replace(/\/+$/, "");
  const res = await fetch(`${base}/rest/v1/${ROWS_QUERY}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  // The body is read ONCE, before the assertion: interpolating `await res.text()` into the message
  // consumes it eagerly and the ok path then fails with "Body has already been read".
  const body = await res.text();
  assert.ok(res.ok, `the ROWS read failed: HTTP ${res.status} ${body.slice(0, 400)}`);
  const live = JSON.parse(body);
  assert.ok(Array.isArray(live) && live.length > 0, "no row carries traits.handler = 'agent-bundle' -- the contract has no home");

  const slugs = live.map(r => r.slug).sort();
  for (const slug of SLUGS) {
    assert.ok(slugs.includes(slug),
      `${slug} no longer carries traits.handler = 'agent-bundle' -- the live rows are ${slugs.join(", ")}`);
  }
  results.push(`live-rows-include-the-${SLUGS.length}-agent-bundle-intents`);

  for (const row of live) {
    assert.deepEqual(rowGap(row), [],
      `${row.slug} does not publish what the handler returns -- STALE: ${rowGap(row).join(", ")}. ` +
        `Write it with: node scripts/bundle-contract.js --write --cycle=<uuid>`);
    assert.equal(row.output_desc, OUTPUT_DESC, `${row.slug}'s output_desc must name the same keys as the schema (D4)`);
  }
  results.push(`live-all-${live.length}-rows-declare-what-the-handler-returns`);

  // The `capabilities` shape, graded against the live read the handler itself makes.
  const c = await readCapabilitySkills("bob", "global");
  assert.ok(c.length > 0, "readCapabilitySkills('bob','global') returned no capability -- this arm cannot grade the declared shape");
  const P = BUNDLE_SCHEMA.properties;
  assert.deepEqual(Object.keys(c[0]), P.capabilities.items.required,
    `capabilities.items declares keys the handler does not produce: it produces ${JSON.stringify(Object.keys(c[0]))}`);
  assert.ok(c[0].skills.length > 0,
    `bob's first capability (${c[0].slug}) carries no Skill, so the declared skills shape is ungraded -- re-point this arm at a capability that holds Skills`);
  for (const name of P.capabilities.items.properties.skills.items.required) {
    assert.ok(name in c[0].skills[0],
      `capabilities[].skills[] declares \`${name}\`, which the handler's Skill projection does not carry: it carries ${Object.keys(c[0].skills[0]).join(", ")}`);
  }
  console.log(`  [AGT-359] ${live.length} rows current / bob: ${c.length} capability(ies), ${c[0].slug} with ${c[0].skills.length} Skill(s)`);
  results.push("live-capabilities-shape-matches-the-handlers-own-projection");

  return results;
}

export default async function run() {
  const results = [];
  results.push(...arm1_anchor());
  results.push(...arm2_both_ways());
  results.push(...arm3_shape());
  results.push(...(await arm4_live()));
  return results;
}

selfRun(import.meta.url, run);
