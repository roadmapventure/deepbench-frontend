// DeepBench v7.0.887 | tests/regression/agt-424-unroutable-dispositions.test.mjs | AGT-424 -- AN
// UNROUTABLE FINDING IS COVERED, NEVER OMITTED. validateReview() asks routeGroup() only about a
// group that FILES a ticket, so an open finding whose source has no public.finding_routes row
// (AGT-380, open) is coverable by any group that files none -- carry, escalate, not-a-defect, list,
// or a root-cause reusing a ticket. Before this ticket nothing said so: the coverage rule refused
// the omission in four bare words and both review Skills told the agent only that such a source
// "stops the review".
//
// Red on the unchanged tree: arm A2's refusal line reads `finding new not covered` there, and
// UNROUTABLE_DISPOSITIONS is not exported at all (the import throws), so the file cannot even load.
//
// ARMS.
//   A  PURE. One worklist, two findings: `au` from `auditor` (routable, precedence 20) and `new`
//      from `runner-cycle` (no route row in LIVE_ROUTES -- that is the whole premise). A1 the
//      filing group is still REFUSED, now with the way out appended. A2 THE DISCRIMINATOR: the
//      omission refusal names the missing row and the dispositions. A3 the five non-filing kinds
//      each validate clean. A4 the CONTROLS that prove the clause is route-gated, not blanket:
//      a routable finding's omission keeps the bare text, and so does a call with no routes at all
//      (STANDARDS.md Section 4, the LOO-013 lesson -- assert WHICH branch fired, never only that
//      something was refused).
//   B  LIVE, READ-ONLY (else declared not-run). The two skill_profiles rows carry the new sentence
//      once and the old one never, under two AGT-424 agent-row decisions with two full-row
//      before-images. Nothing here writes (pattern:76).
//   C  STATIC. docs/runbooks/auditor-routine.md carries the sentence once and stays under the
//      agt-137 doc ceiling.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { LIVE_ROUTES } from "./_lib/finding-routes.js";
import { validateReview, UNROUTABLE_DISPOSITIONS } from "../../scripts/audit-review.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "auditor-routine.md");

// The two skill_profiles rows the migration edits, from the kickoff section 2.
const SKILL_ROWS = ["84c096ec-0c5a-41a7-abef-e51ee440a4d9", "a6d3568f-3a39-44ff-a2b9-0aa62035281e"];
const OLD_SENTENCE = "A source with no route stops the review; say so in summary_for_john.";
const NEW_SENTENCE = `An open finding whose source has no route cannot be ticketed; ${UNROUTABLE_DISPOSITIONS}.`;

// `au` is routable (LIVE_ROUTES carries source auditor); `runner-cycle` is in no row of it.
const wl = [{ id: "au", source: "auditor", finding_type: "defect" },
            { id: "new", source: "runner-cycle", finding_type: "defect" }];
const review = g => ({ groups: g, summary_for_john: "qa", patterns_applied: [] });
const rc = ids => ({ kind: "root-cause", title: "t", root_cause: "r", fix: "f", project: "general",
                     test: { reproduced: true, how: "h", result: "r" }, finding_ids: ids });
const V = g => validateReview(review(g), wl, "2026-W41", undefined, LIVE_ROUTES, []);

const UNROUTED = "finding new not covered -- its source runner-cycle has no finding_routes row " +
                 `(AGT-380), so it cannot be ticketed: ${UNROUTABLE_DISPOSITIONS}`;

async function run() {
  // ---- A1. the filing group is still refused, and now says what to do instead ----------------
  const a1 = V([rc(["au", "new"])]).refusals;
  assert.equal(a1.length, 1, `a root-cause filing an unroutable finding is ONE refusal; got ${JSON.stringify(a1)}`);
  assert.ok(a1[0].startsWith("finding new has unmapped source runner-cycle"),
    `routeGroup()'s own text must lead the refusal, unchanged; got ${a1[0]}`);
  assert.ok(a1[0].endsWith(`; or ${UNROUTABLE_DISPOSITIONS}`),
    `the way out is appended to the unmapped-source throw; got ${a1[0]}`);

  // ---- A2. THE DISCRIMINATOR: the omission refusal names the row and the dispositions --------
  assert.deepEqual(V([rc(["au"])]).refusals, [UNROUTED],
    "an omitted finding whose source has no route is refused WITH the dispositions, by itself");

  // ---- A3. the five kinds that file no ticket all validate clean -----------------------------
  const permitted = [
    { kind: "carry", reason: "r" },
    { kind: "escalate", john_call: "rules", summary: "s" },
    { kind: "not-a-defect", reason: "r" },
    { kind: "list", reason: "r" },
    { kind: "root-cause", reuse_backlog_id: "AGT-380" },
  ];
  for (const g of permitted) {
    const out = V([rc(["au"]), { ...g, finding_ids: ["new"] }]);
    assert.deepEqual(out, { ok: true, refusals: [] },
      `a ${g.kind}${g.reuse_backlog_id ? " (reuse)" : ""} group covers an unroutable finding with no refusal; got ${JSON.stringify(out.refusals)}`);
  }

  // ---- A4. the controls: the clause is ROUTE-GATED, never blanket ----------------------------
  assert.deepEqual(V([{ kind: "carry", reason: "r", finding_ids: ["new"] }]).refusals,
    ["finding au not covered"],
    "a ROUTABLE finding's omission keeps the bare text -- the dispositions are not its answer");
  assert.deepEqual(validateReview(review([rc(["au"])]), wl, "2026-W41").refusals,
    ["finding new not covered"],
    "with no routes handed over the caller cannot know a source is unroutable, so the bare text stands");

  // ---- B. live, read-only --------------------------------------------------------------------
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-424 arm B (the two skill_profiles rows, their decisions and before-images)",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the Skill sentence is Supabase content. Arms A and C ran.");
  } else {
    const get = async q => {
      const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      assert.equal(res.status, 200, `GET ${q} -> HTTP ${res.status}`);
      return res.json();
    };
    const rows = await get(`skill_profiles?id=in.(${SKILL_ROWS.join(",")})&select=id,method`);
    assert.equal(rows.length, 2, `both review Skills must exist; got ${rows.length}`);
    for (const row of rows) {
      const hits = row.method.split(NEW_SENTENCE).length - 1;
      assert.equal(hits, 1, `row ${row.id} must carry the new sentence exactly once; carries it ${hits} time(s)`);
      assert.ok(!row.method.includes(OLD_SENTENCE), `row ${row.id} must no longer carry the old sentence`);
    }
    const decisions = await get("runner_decisions?kind=eq.agent-row&backlog_id=eq.AGT-424&select=id");
    assert.equal(decisions.length, 2, `two agent-row decisions, one per edited row; got ${decisions.length}`);
    const ids = decisions.map(d => d.id).join(",");
    const images = await get(`runner_before_images?decision_id=in.(${ids})&select=table_name,pk_value`);
    assert.equal(images.length, 2, `two full-row before-images, one per decision; got ${images.length}`);
    assert.deepEqual([...new Set(images.map(i => i.table_name))], ["skill_profiles"],
      "every image names skill_profiles -- the undo is the row itself");
    assert.deepEqual(images.map(i => i.pk_value).sort(), [...SKILL_ROWS].sort(),
      "the images cover exactly the two edited rows");
    console.log(`    [AGT-424 live] 2 rows carry the sentence once, old sentence gone, 2 decisions, 2 before-images`);
  }

  // ---- C. static: the runbook says it once, and stays under the doc ceiling ------------------
  const runbook = fs.readFileSync(RUNBOOK, "utf8");
  const marks = runbook.split("cannot be ticketed; cover it with a group").length - 1;
  assert.equal(marks, 1, `auditor-routine.md states the disposition rule exactly once; states it ${marks} time(s)`);
  const bytes = Buffer.byteLength(runbook);
  assert.ok(bytes < 40000, `auditor-routine.md must stay under the agt-137 ceiling; it is ${bytes} bytes`);
}

selfRun(import.meta.url, run);
export default run;
