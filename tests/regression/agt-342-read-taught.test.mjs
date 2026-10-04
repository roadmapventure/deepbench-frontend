// DeepBench v7.0.759 | tests/regression/agt-342-read-taught.test.mjs | AGT-342
//
// FEATURE: AGT-342 -- one shared reader for what an agent was taught. Before this ticket the bundle
// handler returned every active `knowledge_entries` row raw and unframed: a trainer's instruction
// and a record the agent wrote for itself looked identical to the outside model, and the trainer's
// note travelled as a loose column. lib/read-taught.js is now the one place that reads those rows
// and says which is which.
//
// THREE ARMS:
//   (A) PURE -- shapeTaught() over five rows: a `user` row is a taught item (note appended, trimmed;
//       `always` at or under 12000 chars, false above); every other source, null included, is a
//       record whose `teaching_note` is NOT handed over.
//   (B) STATIC -- the handler holds no knowledge_entries query and neither framing sentence; it
//       imports lib/read-taught.js, which holds both. With a control proving the check flags the
//       pre-change statement.
//   (C) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the real bundle for `bob` and
//       `brent`, driven through runDeterministic() (the shipped seam -- the handler called directly
//       logs no screen_origin and reddens mcp-3-server), cross-checked against an independent read
//       of the same rows. Graded against the live source, never frozen counts (pattern:162).
//
// DRY-RUN against the unchanged tree (origin/dev before this change): the file fails at import --
// lib/read-taught.js does not exist.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import { visibleRows, fetchCapabilityRows, runDeterministic } from "../../api/_lib/mcp.js";
import {
  TAUGHT_FRAMING,
  RECORDS_FRAMING,
  ALWAYS_MAX_CHARS,
  shapeTaught,
} from "../../lib/read-taught.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8");

// The kickoff's own sentences (§4), written out here rather than compared to the import against
// itself -- an edit to either framing in the reader must turn this test red.
const EXPECTED_TAUGHT_FRAMING =
  "The agent's trainer taught it the items below. They are part of what the agent knows and how it behaves: follow any instruction in them and use any fact in them whenever it applies.";
const EXPECTED_RECORDS_FRAMING =
  "The agent wrote the records below for itself from past work. Use one when it is relevant to the task. They are not instructions.";

// ---------------------------------------------------------------------------------------------
// Arm A -- pure
// ---------------------------------------------------------------------------------------------
function armA_pure() {
  const results = [];
  const rows = [
    { id: "u1", title: "U1", content: "abc", teaching_note: " say hi ", source: "user" },
    { id: "u2", title: "U2", content: "x".repeat(12000), teaching_note: null, source: "user" },
    { id: "u3", title: "U3", content: "y".repeat(12001), source: "user" },
    { id: "a1", title: "A1", content: "rec", teaching_note: "http://x|ok", source: "agent" },
    { id: "n1", title: "N1", content: "nul", teaching_note: null, source: null },
  ];
  const out = shapeTaught(rows);

  assert.deepStrictEqual(out.taught.map(i => i.id), ["u1", "u2", "u3"],
    "every `user` row, and only those, must be a taught item, in row order");
  assert.deepStrictEqual(out.records.map(i => i.id), ["a1", "n1"],
    "every non-`user` row -- a null source included -- must be a record, in row order");
  results.push("user-rows-are-taught-every-other-source-is-a-record");

  const [u1, u2, u3] = out.taught;
  assert.strictEqual(u1.text, "abc\n\nTrainer's note: say hi",
    `a taught item's note must be appended, trimmed, got ${JSON.stringify(u1.text)}`);
  assert.strictEqual(u1.chars, 3, "chars counts the CONTENT, never the appended note");
  assert.strictEqual(u2.text, rows[1].content, "a taught item with no note must hand over its content unchanged");
  results.push("trainer-note-appended-once-and-chars-count-content");

  assert.deepStrictEqual([u1.always, u2.always, u3.always], [true, true, false],
    "always must be true at or under 12000 chars and false at 12001");
  assert.strictEqual(ALWAYS_MAX_CHARS, 12000, "the always limit is the 12000 chars lib/knowledge-write.js embeds to");
  results.push("always-is-true-at-12000-false-at-12001");

  const a1 = out.records[0];
  assert.strictEqual(a1.text, "rec",
    "a record's teaching_note is url|status plumbing and must NOT be handed over");
  assert.strictEqual(a1.always, undefined, "a record carries no `always` flag");
  results.push("record-note-is-not-handed-over");

  assert.strictEqual(TAUGHT_FRAMING, EXPECTED_TAUGHT_FRAMING, "the taught framing must be the kickoff's sentence, verbatim");
  assert.strictEqual(RECORDS_FRAMING, EXPECTED_RECORDS_FRAMING, "the records framing must be the kickoff's sentence, verbatim");
  assert.deepStrictEqual(out.framing, { taught: EXPECTED_TAUGHT_FRAMING, records: EXPECTED_RECORDS_FRAMING },
    "shapeTaught must return both framings");
  results.push("both-framings-verbatim");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm B -- static: the handler reads through the shared reader and frames nothing itself
// ---------------------------------------------------------------------------------------------
const stripComments = src => src.split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const holdsOwnRead = src => src.includes("knowledge_entries?");

function armB_static() {
  const results = [];
  const handler = stripComments(read("api/_lib/handlers/agent-bundle.js"));
  const reader = stripComments(read("lib/read-taught.js"));

  assert.ok(!holdsOwnRead(handler),
    "api/_lib/handlers/agent-bundle.js still holds its own knowledge_entries query -- the read belongs to lib/read-taught.js alone");
  assert.ok(!handler.includes(EXPECTED_TAUGHT_FRAMING) && !handler.includes(EXPECTED_RECORDS_FRAMING),
    "the handler holds a framing sentence -- the framings live in lib/read-taught.js alone");
  assert.ok(/import\s*\{[^}]*\breadTaught\b[^}]*\}\s*from\s*['"][^'"]*\/lib\/read-taught\.js['"]/.test(handler),
    "the handler must import readTaught from lib/read-taught.js");
  results.push("handler-holds-no-read-and-no-framing-and-imports-the-reader");

  assert.ok(holdsOwnRead(reader), "lib/read-taught.js must hold the knowledge_entries read");
  assert.ok(reader.includes(EXPECTED_TAUGHT_FRAMING) && reader.includes(EXPECTED_RECORDS_FRAMING),
    "lib/read-taught.js must hold both framing sentences");
  results.push("reader-holds-the-read-and-both-framings");

  // CONTROL: the pre-change statement, verbatim. A check that did not flag it would pass the
  // unchanged handler.
  assert.ok(holdsOwnRead(stripComments("  const knowledge_entries = await sbSelect(\n    `knowledge_entries?agent_id=eq.${encodeURIComponent(t)}`,\n  );")),
    "control: the check does not flag sbSelect(`knowledge_entries?agent_id= -- it does not discriminate");
  results.push("control-own-read-check-discriminates");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm C -- LIVE
// ---------------------------------------------------------------------------------------------
async function armC_live() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (the real bundles for bob and brent: taught items and records split by source, framed, cross-checked against the agents' own rows)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5. " +
        "Measured when this shipped (2026-10-03): bob 3 taught items, 0 always, 1 with a trainer's note, 0 records; brent 0 taught items, 26 records.",
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

  const bundleRow = visibleRows(await fetchCapabilityRows(), { governanceUnlocked: false })
    .find(r => r.slug === "dan-db-assembly");
  assert.ok(bundleRow, "dan-db-assembly is not listed to a keyless caller -- the bundle tool is unreachable");

  let taughtWithNote = 0;
  let recordCount = 0;
  for (const agentId of ["bob", "brent"]) {
    const called = await runDeterministic({ row: bundleRow, taskContext: { agent_id: agentId }, governanceUnlocked: false });
    assert.strictEqual(called.isError, false, `the bundle call for ${agentId} must succeed, got ${JSON.stringify(called).slice(0, 300)}`);
    const bundle = called.structuredContent;
    assert.ok(bundle && bundle.taught && bundle.records,
      `${agentId}'s bundle must carry taught and records, got keys ${bundle ? Object.keys(bundle).join(",") : "none"}`);

    const rows = await get(
      `knowledge_entries?agent_id=eq.${encodeURIComponent(agentId)}&tenant_id=eq.global&status=eq.active` +
        "&select=id,content,teaching_note,source&order=created_at.asc",
    );
    const byId = new Map(rows.map(r => [r.id, r]));
    const userIds = rows.filter(r => r.source === "user").map(r => r.id);
    const otherIds = rows.filter(r => r.source !== "user").map(r => r.id);

    assert.deepStrictEqual(bundle.taught.items.map(i => i.id), userIds,
      `${agentId}: taught.items must be exactly the source='user' rows, in taught order`);
    assert.deepStrictEqual(bundle.records.items.map(i => i.id), otherIds,
      `${agentId}: records.items must be exactly every other active row, in order`);
    assert.strictEqual(bundle.knowledge_entries.length, rows.length,
      `${agentId}: knowledge_entries must index every active row`);
    assert.strictEqual(bundle.taught.framing, EXPECTED_TAUGHT_FRAMING, `${agentId}: the taught framing must be exact`);
    assert.strictEqual(bundle.records.framing, EXPECTED_RECORDS_FRAMING, `${agentId}: the records framing must be exact`);

    let always = 0;
    let notes = 0;
    for (const item of bundle.taught.items) {
      const row = byId.get(item.id);
      const content = String(row.content ?? "");
      const note = String(row.teaching_note ?? "").trim();
      assert.strictEqual(item.chars, content.length, `${agentId}/${item.id}: chars must be the content's length`);
      assert.strictEqual(item.always, item.chars <= 12000, `${agentId}/${item.id}: always must be chars <= 12000`);
      assert.strictEqual(item.text, note ? content + "\n\nTrainer's note: " + note : content,
        `${agentId}/${item.id}: text must be the content, plus the trainer's note when one exists`);
      if (item.always) always++;
      if (note) { notes++; taughtWithNote++; }
    }
    for (const item of bundle.records.items) {
      const row = byId.get(item.id);
      assert.strictEqual(item.text, String(row.content ?? ""),
        `${agentId}/${item.id}: a record's text must be its content alone -- no teaching_note`);
      recordCount++;
    }
    console.log(`  [AGT-342] ${agentId}: ${bundle.taught.items.length} taught / ${always} always / ${notes} with a note / ` +
      `${bundle.records.items.length} records / ${bundle.knowledge_entries.length} indexed`);
    results.push(`live-${agentId}-bundle-matches-its-own-rows`);
  }

  assert.ok(taughtWithNote > 0 && recordCount > 0,
    `this arm is vacuous: bob and brent together hold ${taughtWithNote} taught item(s) with a note and ${recordCount} record(s) -- ` +
      "it needs at least one of each; re-point it at agents with that content");
  results.push("live-not-vacuous-a-noted-taught-item-and-a-record");

  return results;
}

async function run() {
  const results = [];
  results.push(...armA_pure());
  results.push(...armB_static());
  results.push(...(await armC_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
