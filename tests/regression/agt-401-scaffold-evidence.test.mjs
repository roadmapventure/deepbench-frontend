// DeepBench v7.0.820 | tests/regression/agt-401-scaffold-evidence.test.mjs | AGT-401 -- the two
// live scaffold pulls stay measurable, and the prose keeps matching the bytes.
//
// WHAT IS BEING PINNED, and why a weaker guard would be worthless here.
//
// (1) THE EVIDENCE IS A NUMBER IN A MARKDOWN FILE, WHICH IS THE EASIEST THING IN THE REPO TO BREAK
// SILENTLY. AGT-401's deliverable is a claim about what an AI client receives -- "Nathan reply
// chars: 172927" -- backed by a committed reply body. Nothing stops a later session from re-pulling
// one file and not the other, or editing the prose, or reshaping measureReply(): the markdown would
// still read plausibly and the file it describes would no longer say that. So part (b) does not
// trust either artifact: it RE-MEASURES both committed replies with the shipped measureReply() and
// requires the markdown's own numbers to equal what comes back. The two artifacts check each other,
// which is the only form of this test that cannot go stale.
//
// (2) IT IS RED ON THE UNCHANGED TREE BY CONSTRUCTION, not by a rule someone has to honour. The
// import of ../../scripts/pull-scaffold.mjs is at module scope: on a tree without AGT-401 the file
// does not exist, the import throws, and the test cannot report a green. That is deliberate -- a
// guard over three artifacts that all arrive in one commit must fail before any of them exist, or
// it proves nothing about the commit that added them.
//
// (3) EVERY ARM CARRIES ITS NEGATIVE CONTROL, because the interesting assertions here are all
// ABSENCES. "No EXECUTION PLAN section" and "no origin tag" are exactly the claims a measurement
// bug produces for free: a function that looked for the wrong label, or scanned the wrong arrays,
// would report absent/false on every input and agree with the live facts by accident. So part (a)
// runs the same fixture three ways -- as pulled (absent/false), with an EXECUTION PLAN section
// whose content is "" (must become "empty", proving the three-state branch is real and that empty
// is not folded into absent), with content filled (must become "filled"), and with `origin "mcp"`
// added to the one taught item (must become true, proving the scan reaches the items). An arm that
// cannot flip is not evidence.
//
// NO CREDENTIALS, NO NETWORK, NO CLOCK. measureReply() takes text, the fixtures are inline, and the
// two replies are committed -- so this runs identically in the suite, in CI and on a cold machine,
// and the live pull it grades is never repeated (STANDARDS.md Section 4: a test never re-runs a
// live write to prove a read).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

// Module scope on purpose -- see (2). This import failing IS the red on a tree without AGT-401.
import { measureReply } from "../../scripts/pull-scaffold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MD = "docs/harvests/AGT-401-scaffolds.md";
const REPLIES = [
  { agent: "brittany", file: "docs/harvests/AGT-401-brittany.json", label: "Brittany" },
  { agent: "nathan", file: "docs/harvests/AGT-401-nathan.json", label: "Nathan" },
];

// The five lines the evidence doc must carry for EVERY agent -- the measured facts, each on its own
// line so a reader and this test read the same thing.
const FACT_LINES = ["Sections:", "Knowledge sections:", "EXECUTION PLAN:", "Origin and date tags:", "Size:"];

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

// A reply envelope in the shape the live route answers: JSON-RPC, the bundle stringified into
// result.content[0].text. Built from a bundle object so each control arm can alter one field.
function envelope(bundle) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    result: { content: [{ type: "text", text: JSON.stringify(bundle, null, 2) }], isError: false },
  });
}

function fixtureBundle() {
  return {
    agent: { id: "fx", name: "Fixture", role: "r", specialty: "s", bio: "b" },
    role_prompts: [],
    guardrails: [],
    output_formats: [],
    sections: [
      // A rag section with NOTHING to show and a fetch instruction that says it could be fetched --
      // the empty-knowledge shape the measurement exists to count.
      {
        slug: "knowledge-fx",
        label: "BACKGROUND KNOWLEDGE",
        type: "rag",
        content: null,
        fetch_instruction: { method: "rag", match_count: 5 },
      },
      { slug: "identity", label: "ROLE & IDENTITY", type: "stored", content: "who", fetch_instruction: null },
    ],
    taught: { framing: "f", items: [{ id: "k1", title: "t", text: "x", chars: 1, always: true }] },
    records: { framing: "f", items: [] },
    knowledge_entries: [{ id: "k1", title: "t", chars: 1, kind: "taught" }],
    library: { data_room_access: [], catalog: "", records: 0, tier: null },
    no_inference: true,
  };
}

// ---------------------------------------------------------------------------------------------
// (a) measureReply() over an inline fixture, each absence with the control that flips it
// ---------------------------------------------------------------------------------------------
function partA_measurement() {
  const asPulled = measureReply(envelope(fixtureBundle()));
  assert.strictEqual(asPulled.knowledge_empty_with_fetch, 1,
    `a rag section with null content and a fetch_instruction must count once, got ${asPulled.knowledge_empty_with_fetch}`);
  assert.strictEqual(asPulled.execution_plan, "absent",
    `no section is labelled EXECUTION PLAN, so the verdict must be "absent", got "${asPulled.execution_plan}"`);
  assert.strictEqual(asPulled.origin_tag_present, false,
    "no item carries origin, so origin_tag_present must be false");
  assert.strictEqual(asPulled.created_at_present, false,
    "no item carries created_at, so created_at_present must be false");
  assert.strictEqual(asPulled.knowledge_sections, 1, "exactly one rag section is in the fixture");
  assert.strictEqual(asPulled.taught, 1, "exactly one taught item is in the fixture");

  // CONTROL 1 -- an EXECUTION PLAN section that is PRESENT AND EMPTY must not read as absent.
  const emptyPlan = fixtureBundle();
  emptyPlan.sections.push({ slug: "reflect", label: "EXECUTION PLAN", type: "reflect", content: "", fetch_instruction: null });
  const withEmptyPlan = measureReply(envelope(emptyPlan));
  assert.strictEqual(withEmptyPlan.execution_plan, "empty",
    `a present-but-empty EXECUTION PLAN must read "empty", got "${withEmptyPlan.execution_plan}" -- empty folded into absent is the measurement bug this arm exists to catch`);

  // CONTROL 2 -- and a filled one must read "filled", so all three states are reachable.
  const filledPlan = fixtureBundle();
  filledPlan.sections.push({ slug: "reflect", label: "EXECUTION PLAN", type: "reflect", content: "step 1", fetch_instruction: null });
  assert.strictEqual(measureReply(envelope(filledPlan)).execution_plan, "filled",
    "a filled EXECUTION PLAN must read \"filled\"");

  // CONTROL 3 -- an origin on the one taught item must be SEEN. If the scan missed the items, the
  // live "origin absent" finding would be an artefact of the scan, not a fact about the reply.
  const tagged = fixtureBundle();
  tagged.taught.items[0].origin = "mcp";
  const withOrigin = measureReply(envelope(tagged));
  assert.strictEqual(withOrigin.origin_tag_present, true,
    "an origin on a taught item must set origin_tag_present -- otherwise the scan never reached the items");

  // CONTROL 4 -- the same for a config, the other collection p3 is about.
  const taggedConfig = fixtureBundle();
  taggedConfig.guardrails.push({ name: "g", text: "t", created_at: "2026-10-08T00:00:00Z" });
  assert.strictEqual(measureReply(envelope(taggedConfig)).created_at_present, true,
    "a created_at on a config must set created_at_present -- otherwise the scan never reached the configs");

  console.log(`  (a) measureReply: empty-with-fetch 1, plan absent/empty/filled all reachable, origin+created_at controls flip -- PASS`);
}

// ---------------------------------------------------------------------------------------------
// (b) THE DISCRIMINATOR -- the committed replies and the committed prose must agree
// ---------------------------------------------------------------------------------------------
function partB_evidence() {
  const md = read(MD);

  for (const { agent, file, label } of REPLIES) {
    const body = read(file);
    const envelopeObj = JSON.parse(body);
    assert.strictEqual(envelopeObj.result.isError, false,
      `${file} must be a clean pull (result.isError false)`);

    const measured = measureReply(body);
    assert.strictEqual(measured.agent_id, agent,
      `${file} must be ${agent}'s scaffold, got agent.id "${measured.agent_id}"`);
    assert.strictEqual(measured.no_inference, true,
      `${file} must carry no_inference true -- it is the key that says the reply is assembled, never inferred`);
    assert.strictEqual(measured.keys.length, 10,
      `${file} must carry exactly the ten bundle keys, got ${measured.keys.length}: ${measured.keys.join(",")}`);

    // The claim and the bytes, checked against each other.
    const hit = new RegExp(`${label} reply chars: (\\d+)`).exec(md);
    assert.ok(hit, `${MD} must state "${label} reply chars: <N>"`);
    assert.strictEqual(Number(hit[1]), measured.text_chars,
      `${MD} says ${label} reply chars: ${hit[1]}, but ${file} measures ${measured.text_chars} -- the prose and the evidence have diverged`);
  }

  // The five measured-fact lines, once per agent. Line starts, so a reader scanning the left margin
  // and this assertion are reading the same thing.
  const lines = md.split(/\r?\n/);
  for (const start of FACT_LINES) {
    const n = lines.filter(l => l.startsWith(start)).length;
    assert.ok(n >= REPLIES.length,
      `${MD} must carry a line starting "${start}" for each of the ${REPLIES.length} agents, found ${n}`);
  }

  assert.ok(md.startsWith("# AGT-401 - what each AI client receives (v7.0.820, measured "),
    `${MD} must open with its titled, versioned, dated heading`);

  console.log(`  (b) DISCRIMINATOR: both replies re-measured, ${REPLIES.length} reply-chars claims match the bytes, ${FACT_LINES.length} fact lines per agent -- PASS`);
}

async function run() {
  partA_measurement();
  partB_evidence();
}

export default run;
selfRun(import.meta.url, run);
