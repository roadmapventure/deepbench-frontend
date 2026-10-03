// DeepBench v7.0.384 | tests/regression/ses-277-seeded-failure-drill.test.mjs | SES-277 (M5 required set)
//
// The seeded-failure closed-loop drill, and the defect it caught. On 2026-09-02 an attended session
// walked the heal loop end to end on live Supabase with a deliberately seeded failure shape
// (durable_hops rows, capability `drill-ses-277-seeded-capability`): detect (1 product signature,
// count 3) -> file (LOO-39 under --apply, before-image bound to a supervised cycle) -> dedup (0
// re-detections) -> fix-confirmation -> recurrence. Step 5 FAILED THE DRILL: --apply printed
// "1 confirmed-fixed" and the table still read `watching`, because main() finished on "nothing new
// to file" before the state upsert and verdict PATCHes -- and a confirmed fix is, by definition, a
// run with nothing new to file. persistSignatureState() is now the single write path for both
// branches; verdictPatches() is pure. The drill record: docs/harvests/SES-277-drill-2026-09-02.md.
//
// Arms:
//   * PURE: verdictPatches() emits a confirmed_fixed patch for a confirmed signature and a recurred
//     patch for a recurrence, nothing for an empty confirmation (negative control).
//   * SOURCE SHAPE: the nothing-to-file branch of main() calls persistSignatureState() under APPLY,
//     and the filing branch calls the same function -- one write path, mutation-controlled.
//   * DOC: the drill record exists, names the seeded signature hash and every step's measured
//     verdict, and records the defect.
//   * LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, declared NOT RUN otherwise): never re-runs the
//     drill (it files a ticket); asserts the drill's own residue is gone (no drill-ses-277 hops,
//     no signature row) and its ticket LOO-39 is `removed` with the drill note.
//
// Invocation: node tests/regression/ses-277-seeded-failure-drill.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { verdictPatches } from "../../scripts/heal-engine.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENGINE_REL = "scripts/heal-engine.js";
const HARVEST_REL = "docs/harvests/SES-277-drill-2026-09-02.md";
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

async function run(ctx = {}) {
  const results = [];

  // ---- PURE arm
  const at = new Date("2026-09-02T16:10:56.497Z");
  const patches = verdictPatches({
    confirmed: [{ sigHash: "d09e012505d9", backlogId: "LOO-39", confirmedAt: at.toISOString(), quietDays: 20, confirmationWindowDays: 7 }],
    recurred: [{ sigHash: "abc123abc123", recurrenceCount: 1, lastRecurrenceAt: at.toISOString(), confirmationWindowDays: 7 }],
    stillWatching: [],
  }, at);
  assert.deepStrictEqual(patches.map(([h, f]) => [h, f.state]), [["d09e012505d9", "confirmed_fixed"], ["abc123abc123", "recurred"]]);
  assert.strictEqual(patches[0][1].confirmed_fixed_at, at.toISOString());
  assert.strictEqual(patches[1][1].recurrence_count, 1);
  assert.deepStrictEqual(verdictPatches({ confirmed: [], recurred: [], stillWatching: [{ sigHash: "x" }] }, at), [],
    "control: a run with nothing confirmed and nothing recurred must patch nothing");
  results.push("verdict-patches-are-shaped-for-both-verdicts-and-empty-when-nothing-decided");

  // ---- SOURCE SHAPE arm
  const src = read(ENGINE_REL);
  const nothingBranch = src.match(/if \(detections\.length === 0\) \{([\s\S]*?)\n  \}\n/);
  assert.ok(nothingBranch, "main()'s nothing-new-to-file branch must be findable");
  assert.ok(/if \(APPLY\) \{[\s\S]*?persistSignatureState\(/.test(nothingBranch[1]),
    "the nothing-new-to-file branch must persist signature state under --apply -- the defect SES-277's drill caught: a confirmed fix IS a run with nothing new to file");
  assert.strictEqual((src.match(/await persistSignatureState\(/g) || []).length, 2,
    "exactly two call sites (nothing-to-file and filing) must share the one write path");
  {
    const mutated = src.replace(/if \(APPLY\) \{\n      written = await persistSignatureState\(/, "if (false) {\n      written = await persistSignatureState(");
    assert.notStrictEqual(mutated, src, "control: mutation changed nothing");
    const m2 = mutated.match(/if \(detections\.length === 0\) \{([\s\S]*?)\n  \}\n/);
    assert.ok(!/if \(APPLY\) \{[\s\S]*?persistSignatureState\(/.test(m2[1]), "control: the shape assertion cannot fail");
  }
  results.push("nothing-to-file-branch-persists-state-under-apply");

  // ---- DOC arm
  const doc = read(HARVEST_REL);
  for (const needle of ["d09e012505d9", "LOO-39", "Step 5", "confirmed_fixed", "did NOT persist", "recurred", "cleanup"]) {
    assert.ok(doc.includes(needle), `${HARVEST_REL} must record "${needle}"`);
  }
  results.push("drill-record-names-the-signature-and-every-step");

  // ---- LIVE arm
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live residue check (no drill hops, no drill signature row, LOO-39 removed with the drill note)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP at the end of the drill on 2026-09-02: 0 drill-ses-277 rows in durable_hops, " +
      "0 runner_heal_signatures rows for d09e012505d9, LOO-39 status removed.");
    return results;
  }
  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const hops = await (await fetch(`${base}/rest/v1/durable_hops?select=id&tenant_id=eq.drill-ses-277&limit=5`, { headers: hdr })).json();
  assert.deepStrictEqual(hops, [], "seeded drill hops must be cleaned up");
  const sigs = await (await fetch(`${base}/rest/v1/runner_heal_signatures?select=sig_hash&sig_hash=eq.d09e012505d9`, { headers: hdr })).json();
  assert.deepStrictEqual(sigs, [], "the drill's signature row must be cleaned up");
  const [t] = await (await fetch(`${base}/rest/v1/backlog_items?select=backlog_id,status&backlog_id=eq.LOO-39`, { headers: hdr })).json();
  assert.ok(t && t.status === "removed", `LOO-39 must be removed (drill residue), got ${t && t.status}`);
  results.push("drill-residue-is-gone");
  return results;
}

selfRun(import.meta.url, run);
export default run;
