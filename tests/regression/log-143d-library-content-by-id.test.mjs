// DeepBench v7.0.419 | tests/regression/log-143d-library-content-by-id.test.mjs | LOG-143 (d2) --
// the Librarian can hand back the_library chunk TEXT by id, behind the same trust boundary that
// already governs every other read of that store.
//
// WHAT IS BEING PINNED, and the three places a lazier guard would pass vacuously.
//
// (1) THE TRUST BOUNDARY, MECHANIZED RATHER THAN ASSERTED BY EYE. This ticket adds a read of
// the_library's text -- the most disclosive thing the store can do -- so the assertion that matters
// most is not "the new function works" but "no new file learned how to reach the table". That is
// exactly what scripts/check-library-access.js measures (SE-06: assertion A, only sanctioned files
// import lib/librarian.js; assertion B, only lib/librarian.js and lib/search-harness.js touch
// the_library / match_the_library directly), so this test CALLS its checkWorktree() rather than
// re-implementing a weaker grep beside it. A second implementation that agrees with itself is
// SES-45's failure; a check that shares the shipped one's own boundary data cannot drift from it.
//
// (2) THE DEFAULT PATH IS PROVEN BY CALLING IT, NOT BY READING IT. "library-lookup.js still contains
// the old call" is a source assertion that passes against a handler which computes the old result
// and then returns the new shape anyway. LOO-22's contract is a SHAPE contract -- its callers read
// {id, exists, data_type} -- so the control below invokes the real handler with no include_content
// flag and asserts no entry carries a `content` key at all. That arm needs no credentials: with none
// present, lookupRecordsByIds() fails closed to exists:false stubs, which still carry the shape
// under test. The mutation control is the string "true": a truthy-but-not-true flag must NOT open
// the content path, because a model's stray value must never become an unrequested disclosure of
// Library text.
//
// (3) A MISS MUST BE A STUB, NOT A DROPPED ELEMENT. The judge correlates the returned records with
// the chunk ids it asked about; if a hallucinated or cross-room id simply vanished from the array,
// every subsequent record would shift by one and the groundedness evidence would cite the wrong
// chunk -- a wrong score presented with a real id beside it, which is worse than `unknown`. The LIVE
// arm therefore asks for two real ids AND one random UUID and asserts all three come back, in the
// order asked, with the random one exists:false and content:null.
//
// NO WRITE, NO EMBED, NO SPEND. readContentByIds() runs a direct PostgREST select and nothing else,
// so this suite bills no Anthropic and no OpenAI call.

import assert from "assert";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { checkWorktree } from "../../scripts/check-library-access.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const HARNESS_REL = "lib/search-harness.js";
const LIBRARIAN_REL = "lib/librarian.js";
const HANDLER_REL = "api/_lib/handlers/library-lookup.js";

// The six fields LOG-143 (d) declares on the content path.
const CONTENT_FIELDS = ["id", "exists", "data_type", "content", "citeable", "title"];

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

export default async function run() {
  // ── SOURCE ARM: no credentials needed ────────────────────────────────────────

  // 1. The primitive and its generic entry point both exist, and the entry point dispatches on the
  //    `store` field rather than on who is calling (.claude/rules/library-access.md).
  const harness = read(HARNESS_REL);
  assert.match(harness, /export async function readContentByIds\(/,
    `${HARNESS_REL} must export readContentByIds -- it is the public by-id read the Report Card's ` +
    "groundedness dimension depends on.");
  assert.match(harness, /if \(store === 'the_library'\)[\s\S]{0,400}lookupRecordsWithContent/,
    `${HARNESS_REL}'s readContentByIds must reach the_library through the generic store dispatch ` +
    "and lib/librarian.js's primitive -- never a second access path of its own.");

  const librarian = read(LIBRARIAN_REL);
  assert.match(librarian, /export async function lookupRecordsWithContent\(/,
    `${LIBRARIAN_REL} must export lookupRecordsWithContent -- the table primitive half.`);
  // The read must stay a DIRECT LOOKUP. If a later edit routes it through match_the_library it
  // silently becomes a similarity search: it would start costing an embedding, start missing ids
  // below the threshold, and stop being able to answer "what does THIS chunk say".
  // The slice runs from the declaration to the NEXT top-level `export`, not to a literal "\n}\n":
  // this repo's working tree is CRLF and git's blobs are LF, so any newline-anchored delimiter
  // matches in one place and not the other -- the exact shape of .claude/rules-adjacent tripwire
  // false-greens (reference: the CRLF false-green rule). A slice that fails to find its end would
  // leave the two assertions below scanning a two-character string and passing vacuously.
  const fnStart = librarian.indexOf("export async function lookupRecordsWithContent(");
  assert.ok(fnStart !== -1, "lookupRecordsWithContent declaration not found");
  const afterStart = librarian.slice(fnStart + 1);
  const nextExport = afterStart.indexOf("\nexport ");
  const contentFnBody = nextExport === -1 ? afterStart : afterStart.slice(0, nextExport);
  assert.ok(contentFnBody.length > 500,
    "the lookupRecordsWithContent slice is too short to be the real function body -- the two " +
    "assertions below would be measuring nothing.");
  assert.ok(!/match_the_library|embedAndSearch|embedContent/.test(contentFnBody),
    "lookupRecordsWithContent must be a direct by-id select -- no RPC, no embedding call.");
  assert.ok(/select=id,title,content,citeable,data_type,status/.test(contentFnBody),
    "lookupRecordsWithContent must select the content columns by name.");

  // 2. THE GREP CONTROL, run through the shipped boundary check itself (SE-06).
  const boundary = checkWorktree(ROOT);
  assert.ok(boundary && Array.isArray(boundary.violations),
    "scripts/check-library-access.js could not scan this tree -- an unreadable tree is never a pass.");
  assert.equal(boundary.violations.length, 0,
    "LOG-143 (d) must not widen the Library trust boundary. Violations: " +
    JSON.stringify(boundary.violations, null, 2));

  // 3. The handler's content branch is gated on an exact `=== true`, not on truthiness.
  const handler = read(HANDLER_REL);
  assert.match(handler, /include_content === true/,
    `${HANDLER_REL} must gate the content branch on include_content === true; a truthiness test ` +
    'turns a stray "false" string into an unrequested disclosure of Library text.');

  // ── BEHAVIOURAL ARM: the real handler, called ────────────────────────────────
  //
  // Runs with or without credentials. Without them lookupRecordsByIds() fails closed to
  // exists:false stubs, which still carry the shape this arm is about.
  const { handle } = await import("../../api/_lib/handlers/library-lookup.js");
  const probeId = randomUUID();

  const defaultResult = await handle({
    agent_id: "eleanor", tenant_id: "global",
    content: { record_ids: [probeId] },
  });
  assert.ok(Array.isArray(defaultResult.verification) && defaultResult.verification.length === 1,
    "LOO-22's default path must still return one verification entry per requested id.");
  for (const entry of defaultResult.verification) {
    assert.ok(!Object.prototype.hasOwnProperty.call(entry, "content"),
      "LOO-22's default path must return NO content key -- LOG-143 (d) changes nothing for its " +
      `existing callers. Got: ${JSON.stringify(entry)}`);
  }

  // MUTATION CONTROL: a truthy-but-not-true flag must take the default path.
  const stringFlagResult = await handle({
    agent_id: "eleanor", tenant_id: "global",
    content: { record_ids: [probeId], include_content: "true" },
  });
  for (const entry of stringFlagResult.verification) {
    assert.ok(!Object.prototype.hasOwnProperty.call(entry, "content"),
      'include_content: "true" (a string) must NOT open the content path.');
  }

  // An empty id list is still "nothing to verify", on both branches.
  const emptyResult = await handle({
    agent_id: "eleanor", tenant_id: "global",
    content: { record_ids: [], include_content: true },
  });
  assert.deepEqual(emptyResult, { verification: [] },
    "an empty record_ids list must still be a valid empty result, never an error.");

  // ── LIVE ARM: real chunk text, real miss ─────────────────────────────────────
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "LOG-143d live by-id content read",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent, so no real the_library row can be read back. " +
      "Re-run with credentials: node --env-file=.env tests/regression/run-all.js"
    );
    return;
  }

  // Two ids that really exist, chosen at run time rather than hardcoded -- a pinned uuid would rot
  // the first time the corpus is reseeded and turn this arm into a permanent false red.
  const seedRes = await fetch(
    `${url}/rest/v1/the_library?select=id&content=not.is.null&limit=2`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  assert.ok(seedRes.ok, `could not read seed ids from the_library (${seedRes.status})`);
  const seedRows = await seedRes.json();
  if (!Array.isArray(seedRows) || seedRows.length < 2) {
    notRun("LOG-143d live by-id content read", "fewer than two the_library rows are available to read back.");
    return;
  }

  const missId = randomUUID();
  const askedFor = [seedRows[0].id, missId, seedRows[1].id];

  const { readContentByIds } = await import("../../lib/search-harness.js");
  const { records } = await readContentByIds({
    requestingAgentId: "eleanor",
    store: "the_library",
    ids: askedFor,
    tenantId: "global",
  });

  assert.equal(records.length, 3,
    "every requested id must come back -- a miss is a stub, never a dropped element.");
  assert.deepEqual(records.map(r => r.id), askedFor,
    "records must come back in the order they were asked for; the caller correlates by position.");

  for (const i of [0, 2]) {
    assert.equal(records[i].exists, true, `record ${i} was read from the_library and must exist`);
    assert.equal(typeof records[i].content, "string",
      `record ${i} must carry real chunk TEXT -- that is the whole point of this ticket`);
    assert.ok(records[i].content.length > 0, `record ${i}'s content must not be empty`);
    for (const f of CONTENT_FIELDS) {
      assert.ok(Object.prototype.hasOwnProperty.call(records[i], f),
        `record ${i} is missing the declared field ${f}`);
    }
  }

  assert.equal(records[1].exists, false, "a random uuid must come back as an exists:false stub");
  assert.equal(records[1].content, null, "a miss must carry no content");

  // An unknown store is denied rather than silently answered -- the generic dispatch's own control.
  const bogus = await readContentByIds({
    requestingAgentId: "eleanor", store: "not_a_store", ids: [seedRows[0].id], tenantId: "global",
  });
  assert.deepEqual(bogus.records, [], "an unknown store must return no records");
  assert.equal(bogus._access.granted, false, "an unknown store must be reported as denied");
}

selfRun(import.meta.url, run);
