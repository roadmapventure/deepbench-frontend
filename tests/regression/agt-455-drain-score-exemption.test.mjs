// DeepBench v7.0.847 | tests/regression/agt-455-drain-score-exemption.test.mjs | AGT-455 -- a queued drain's named member is exempt from AGT-427's score gate, and the selfbuild lane keeps that gate as its own lane rule.
//
// WHAT THIS PINS. AGT-427 (v7.0.825) listed a ticket only when scored 3+, and it put that rule in
// three places at once -- so John's own named drain work became unreachable by the mechanism built
// to drain it: his one queued drain-epic names AGT-452 and AGT-453, both open at score 2, and
// pick_exclusions() answered each of them 'need_score 2 is below 3' while drain_epic_next() refused
// to pick them at all. AGT-455 makes MEMBERSHIP the exemption: a named member of a QUEUED
// drain-epic's scope is not score-gated in either home (drain_epic_next() carries no score gate at
// all now -- every row that pick can reach is already a named member), and the exemption is held
// from leaking by giving lane (c) of prime_directive_queue() the score rule as ITS OWN, exactly
// where AGT-173 put the noship fence.
//
// THE PAIR IS THE POINT, and it is why this file exists rather than a looser one: a drain member at
// need_score 2 must be CLAIMABLE, and the same ticket outside a queued drain must NOT be. If the
// first half shipped without the second, a scored-2 member would list under `selfbuild` and both
// live AGT-427 pins -- agt-140-project-priority-pick and ses-281-m5-pick-enforcement, each grading
// `lane === "selfbuild"` -- would go red. Three arms:
//   A. the mirror docs/design/agt-455-drain-score-exemption.sql holds the struck-out drain gate,
//      the MEMBER predicate, lane (c)'s own rule and the gate sentinel, each needle with a
//      mutation control (delete it and the check must name it) plus the SES-158 changed-nothing
//      assert -- and it asserts the drain pick's OLD score line is GONE, which is the one needle
//      whose absence is the fix.
//   B. live (service key, else notRun), READ-ONLY: every named member of every queued drain-epic
//      scope is free of a score reason; every selfbuild row the queue serves carries an integer
//      need_score >= 3; and a queued open NON-member scored below 3 still reads its score reason.
//      This is the discriminating arm -- on origin/dev's bodies the same board answered a score
//      reason for AGT-452 and AGT-453, so arm B's first assert fails there and passes here.
//   C. the positive pair is declared NOT RUN here -- driving it means standing a drain and a
//      scored-2 member up on the LIVE board -- and quotes the migration's own rolled-back gate.
//
// WHY ARM B READS RATHER THAN WRITES. pattern:76: a regression run never mutates working data.
// Reaching the exemption's positive branch means writing a queued drain and its scope onto the
// live board, so the migration's trailing DO block does it inside a sub-block that ends in sentinel
// P0455 -- fixtures rolled back, migration committed -- and this file quotes that instead.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR_REL = "docs/design/agt-455-drain-score-exemption.sql";
const SCORE_REASON = /is below 3|not yet scored/;

// The four needles, each a line the migration actually shipped.
export const NEEDLES = [
  // the drain pick's gate, struck out and replaced by the sentence that says why
  "-- AGT-455: no score gate here: every row of this pick is a named member of queued drain d",
  // MEMBER: the exemption itself, inside pick_exclusions()'s AGT-427 CASE head
  "EXISTS (SELECT 1 FROM public.runner_drain_scope s JOIN public.runner_directives d ON d.id = s.directive_id WHERE s.item_id = b.id AND d.type = 'drain-epic' AND d.status = 'queued')",
  // lane (c)'s own rule -- the half that keeps the two AGT-427 pins green
  "AND bu.need_score >= 3 -- AGT-455: this lane's rule",
  // the gate sentinel, so the fixtures the gate wrote were rolled back
  "P0455",
];

// THE ABSENCE needle: the line AGT-455 removed from drain_epic_next's pick predicate. Written in
// two halves so this file's own source cannot satisfy the search it performs.
export const REMOVED_LINE = "AND b.need_score >= 3 -- AGT-4" + "27";

// Pure: which needles the text lacks.
export function missingNeedles(text, needles = NEEDLES) {
  return needles.filter(n => !text.includes(n));
}

// Pure: the reasons in a pick_exclusions() row that speak about the score.
export function scoreReasons(reasons) {
  return (reasons ?? []).filter(r => typeof r === "string" && SCORE_REASON.test(r));
}

// Pure: the refs a queue answer names in one lane.
export function laneRefs(rows, lane) {
  return rows.filter(r => r && r.lane === lane && r.ref).map(r => r.ref);
}

function readMirror() {
  const p = path.join(ROOT, MIRROR_REL);
  assert.ok(fs.existsSync(p), `${MIRROR_REL} is missing -- the migration has no mirror`);
  return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");   // CRLF-normalised
}

async function run() {
  const results = [];

  // --- A: the mirror ----------------------------------------------------------------------------
  const sql = readMirror();
  assert.deepStrictEqual(missingNeedles(sql), [], `the mirror lacks: ${JSON.stringify(missingNeedles(sql))}`);
  for (const n of NEEDLES) {
    const mutated = sql.split(n).join("");
    assert.notStrictEqual(mutated, sql, `control: deleting ${n} changed nothing (the SES-158 failure)`);
    assert.deepStrictEqual(missingNeedles(mutated, [n]), [n], `the check did not notice ${n} gone`);
  }
  assert.deepStrictEqual(missingNeedles(sql, []), [], "no needles, no findings");
  // the absence half, with its own control: a mirror that still carries the struck-out line is a
  // mirror of the wrong body.
  assert.ok(!sql.includes(REMOVED_LINE),
    `the mirror still carries the drain pick's AGT-427 score line -- the fix is its removal`);
  assert.ok(`x ${REMOVED_LINE} y`.includes(REMOVED_LINE),
    "control: the absence check cannot find the line even when it is there");
  results.push("mirror-holds-the-three-splices-and-the-sentinel-and-lost-the-old-gate");

  // --- live transport ---------------------------------------------------------------------------
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live arms (the board's own reasons, the selfbuild lane and the non-member control)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Run: node --env-file-if-exists=.env.local tests/regression/agt-455-drain-score-exemption.test.mjs");
  } else {
    const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
    const get = async q => {
      const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
      if (!r.ok) assert.fail(`GET ${q} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
      return r.json();
    };
    const rpc = async (fn, query = "") => {
      const r = await fetch(`${base}/rest/v1/rpc/${fn}${query}`, { method: "POST", headers: hdr, body: "{}" });
      if (!r.ok) assert.fail(`rpc/${fn} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
      return r.json();
    };

    // --- B1: no named member of a queued drain carries a score reason -------------------------
    const queued = await get("runner_directives?type=eq.drain-epic&status=eq.queued&select=id");
    const scope = queued.length
      ? await get(`runner_drain_scope?directive_id=in.(${queued.map(d => d.id).join(",")})&select=item_id,backlog_id`)
      : [];
    const memberIds = [...new Set(scope.map(s => s.item_id))];
    if (memberIds.length === 0) {
      notRun("the drain members' own reasons (arm B1)",
        `the live board carries ${queued.length} queued drain-epic directive(s) and ${scope.length} scope row(s), so there `
        + "is no named member to read a reason for. The exemption only speaks about members, so there is nothing to "
        + "measure here right now -- the ordinary quiet-board state, not a failure. Arm C quotes the migration's own gate.");
    } else {
      const rows = await rpc("pick_exclusions", `?id=in.(${memberIds.join(",")})&select=backlog_id,reasons`);
      const gated = rows.filter(r => scoreReasons(r.reasons).length > 0)
        .map(r => `${r.backlog_id} ${JSON.stringify(scoreReasons(r.reasons))}`);
      assert.deepStrictEqual(gated, [],
        `a named member of a queued drain-epic is score-gated, which AGT-455 exempts -- ${gated.join("; ")}`);
      results.push(`no-score-reason-on-any-of-${memberIds.length}-drain-members`);
    }

    // --- B2: the selfbuild lane keeps the gate -------------------------------------------------
    const queue = await rpc("prime_directive_queue");
    const selfbuild = laneRefs(queue, "selfbuild");
    if (selfbuild.length === 0) {
      notRun("the selfbuild lane's own score rule over live rows (arm B2)",
        "the live selfbuild lane is empty right now, so the rule has no row to be graded on here. That is a real board "
        + "state, not a pass: AGT-456's exclusive drain holds the pick while its members are blocked, claimed or carded, "
        + "and the whole queue is the single 'board' row. The two live AGT-427 pins "
        + "(agt-140-project-priority-pick, ses-281-m5-pick-enforcement) grade this same lane whenever it is non-empty, "
        + "and the migration's gate drove the populated case under fixtures (arm C, case C).");
    } else {
      const items = await get(`backlog_items?backlog_id=in.(${selfbuild.join(",")})&select=backlog_id,need_score`);
      const byRef = new Map(items.map(i => [i.backlog_id, i.need_score]));
      const under = selfbuild.filter(ref => !(Number.isInteger(byRef.get(ref)) && byRef.get(ref) >= 3))
        .map(ref => `${ref} (need_score ${JSON.stringify(byRef.get(ref) ?? null)})`);
      assert.deepStrictEqual(under, [],
        `the selfbuild lane served a ticket below AGT-427's bar -- lane (c)'s own rule is the exemption's fence: ${under.join("; ")}`);
      results.push(`selfbuild-lane-all-scored-3-plus-${selfbuild.length}-rows`);
    }

    // --- B3: THE CONTROL -- a non-member below the bar still reads its score reason ------------
    const memberSet = new Set(memberIds);
    const low = (await get("backlog_items?status=eq.open&queue=not.is.null&need_score=lt.3&select=id,backlog_id,need_score&order=queue.asc&limit=50"))
      .filter(b => !memberSet.has(b.id));
    if (low.length === 0) {
      notRun("the non-member score control (arm B3)",
        "no open, queued ticket scored below 3 outside every queued drain exists on the board right now, so the half "
        + "AGT-455 deliberately did NOT change cannot be probed from here. The migration's gate drove it under "
        + "fixtures (arm C, case D): the same ticket, once its drain was closed, read 'need_score 2 is below 3' again.");
    } else {
      const probe = low[0];
      const rows = await rpc("pick_exclusions", `?id=eq.${probe.id}&select=backlog_id,reasons`);
      assert.strictEqual(rows.length, 1, `pick_exclusions returned ${rows.length} rows for ${probe.backlog_id}`);
      const reasons = scoreReasons(rows[0].reasons);
      assert.ok(reasons.length === 1,
        `${probe.backlog_id} (need_score ${probe.need_score}) is in no queued drain, so it must still carry exactly one `
        + `score reason -- got ${JSON.stringify(rows[0].reasons)}`);
      assert.ok(reasons[0].includes(`need_score ${probe.need_score} is below 3`),
        `${probe.backlog_id}'s score reason must name its own score: ${JSON.stringify(reasons)}`);
      results.push(`non-member-${probe.backlog_id}-still-score-gated`);
    }
  }

  // --- C: the positive pair ----------------------------------------------------------------------
  notRun("the positive pair -- a scored-2 drain member claimed by the drain pick, and the same ticket refused outside a drain",
    "driving it means writing a queued drain-epic and its named scope onto the LIVE board and then handing a real "
    + "ticket to a real pick, which a permanent regression test must never do (pattern:76, the SES-196 / SES-218 / "
    + "SES-275 refusal), and this suite reaches Supabase only over PostgREST, which cannot open a transaction to roll "
    + "a fixture back. MEASURED IN THE MIGRATION INSTEAD: `agt455_drain_score_exemption`'s trailing DO block writes "
    + "its fixtures inside a sub-block that ends in sentinel P0455, so every fixture write is undone while the "
    + "migration still commits, and the outer block RAISEs -- aborting the whole migration, all three function bodies "
    + "included -- unless every case holds. The cases it asserts, over ZFIX-45501 (open, scored 2) and ZFIX-45502 "
    + "(open, scored 5) in epic ced3a7d0 (Tooling, project executing) under a fixture exclusive drain D dated "
    + "2020-01-01 so that both picks read it rather than the board's own: (A) D naming ZFIX-45501 only -> "
    + "drain_epic_next(cycle) answers outcome 'pick', backlog_id ZFIX-45501, where the SAME fixtures against the "
    + "pre-splice bodies answered outcome 'blocked' with backlog_id NULL; (B) ZFIX-45502 named in too -> "
    + "pick_exclusions() ZFIX-45501 reasons {} and the queue's drain lane names both members; (C) THE OTHER HALF OF "
    + "THE PAIR, read off that same answer -> the selfbuild lane names ZFIX-45502 and NOT ZFIX-45501, which is what "
    + "keeps the two AGT-427 pins green; (D) THE CONTROL -> D closed, so the same ticket is no longer a member of a "
    + "queued drain, and ZFIX-45501 reads 'need_score 2 is below 3' again and sits in neither lane. Then exactly 1 "
    + "pg_proc overload of each of drain_epic_next, pick_exclusions and prime_directive_queue; the three md5s the "
    + "spliced transcriptions PREDICTED before the apply (0de013da... / b78b7506... / 5551b801...), so a body that "
    + "drifted even in a comment could not commit; the score expression occurring 0 times in drain_epic_next and once "
    + "in each of the other two; EXECUTE reading anon=false, authenticated=false, service_role=true on all three; and "
    + "zero fixture residue. Applied 2026-10-11 ~08:39Z, result {\"success\":true}. THE CAVEAT, because a false green "
    + "here would be invisible: the gate's own `AGT-455 GATE PASSED` NOTICE body was NOT relayed by the apply channel, "
    + "so nobody has read it and it is quoted nowhere. What the success flag proves is what the gate was built to "
    + "prove -- the outer block aborts the entire migration unless every case above holds, so a COMMITTED migration is "
    + "the pass. What was re-read live afterwards, outside the gate, and is quoted in the mirror's header: the number "
    + "of queued-drain members carrying a score reason went from 2 (AGT-452, AGT-453) to 0, both now carrying only "
    + "their own blockers; AA-121 (open, queued, scored 2, in no drain) still reads 'need_score 2 is below 3'; and all "
    + "three functions stand at one overload with the predicted md5.");

  return results;
}

selfRun(import.meta.url, run);
export default run;
