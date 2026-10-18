// DeepBench v7.0.858 | tests/regression/agt-483-parent-score.test.mjs | AGT-483 closing slice -- arm C is LIVE via parent_score_probe()
// DeepBench v7.0.857 | tests/regression/agt-483-parent-score.test.mjs | AGT-483 -- a blocker takes its parent's score: one function lifts a ticket's severity to the highest score of the open work waiting behind it, and the four readers that gate a pick on need_score call it.
//
// WHAT THIS PINS. AGT-427 (v7.0.825) made severity the leading key of every pick and the bar for
// being listed at all; AGT-455, AGT-481 and AGT-482 then spread that one column across four
// readers. Every one of them read `b.need_score` -- THE ROW'S OWN -- so a ticket scored 1 that is
// the only thing standing between the runner and a ticket scored 5 was ranked as a 1, refused by
// the 3+ bar, and uncounted by AGT-432's floor. AGT-483 adds
// `public.effective_need_score(p_id uuid)` = GREATEST(the row's own score, the highest score among
// the open/partial tickets BLOCKED BY it whose epic's project is executing) and splices it into
// pick_exclusions(), prime_directive_queue()'s `buildable`, drain_epic_next(uuid)'s ORDER BY and
// countable_tickets_per_project(). Three arms:
//   A. the mirror docs/design/agt-483-parent-score.sql holds F1's GREATEST line, the E1 / E3 / E4
//      splice targets and the gate sentinel, each needle with a deletion control (delete it and
//      the check must name it, the SES-158 assert) -- PLUS the md5 pin, which is load-bearing
//      HERE and was not needed by AGT-455: this migration splices the four bodies by mechanism
//      rather than by transcription, so the mirror does not print them in full, and the md5 of
//      the mirror's SQL half is what proves it is still the statement that was applied.
//   B. live (service key, else notRun), READ-ONLY: every open/partial blocker of an open/partial
//      ticket reads the hand value computed off the raw rows, and the floor's ids are AGT-481's
//      hand count recomputed with the EFFECTIVE score in P2. This is the discriminating arm for
//      the lift's arithmetic -- but see its own notRun: there are 0 ACTUAL lifts on the board
//      today, so it grades the identity case live and the positive case is arm C's.
//   C. the positive pair, DRIVEN EVERY RUN (v7.0.858, migration `agt483_pair_probe`): the one
//      call `public.parent_score_probe(uuid)` stands the parent, the blocker, the stranger, the
//      control and a dated exclusive drain up inside a sub-block that ends in sentinel P0483, so
//      every fixture write is rolled back before the call returns, and hands back the
//      measurements as jsonb. `gradePair()` below -- pure, exported, graded case by named case --
//      is what says they hold. THIS IS THE ARM THAT DISCRIMINATES: with 0 actual lifts on the
//      live board, arm B grades only the identity case, so swapping the lift back out for the raw
//      `need_score` column leaves every other arm GREEN and fails here at `child-reads-5`.
//
// WHY ARM B READS RATHER THAN WRITES. pattern:76: a regression run never mutates working data.
// Reaching the lift's positive branch means writing a parent, a blocker and a queued drain onto
// the live board, so `parent_score_probe()` does it inside a sub-block that ends in sentinel
// P0483 -- every fixture write rolled back before the call returns, nothing of it committed -- and
// arm C drives THAT, which is a read of this suite's working data and a write of nothing.

import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { UNBLOCKING, isParked, claimIsLive, hasDesignFlag, effectiveScore } from "./agt-481-countable-tickets.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR_REL = "docs/design/agt-483-parent-score.sql";
const VERBATIM_MARK = "-- ---- THE MIGRATION, VERBATIM ---";

// The md5 of the ONE statement `apply_migration` stored for `agt483_parent_score`
// (supabase_migrations.schema_migrations version 20261018073201, 18312 bytes). The mirror's SQL
// half must still hash to it.
export const APPLIED_MD5 = "02ee9db2add0174eaf37455047a94ac6";

// The five needles, each a line the migration actually shipped.
export const NEEDLES = [
  // F1 -- the lift itself. GREATEST ignores NULLs, which is how an unscored blocker inherits.
  "  SELECT GREATEST((SELECT b.need_score FROM public.backlog_items b WHERE b.id = p_id), (SELECT max(w.need_score) FROM public.backlog_items w WHERE w.blocked_by = p_id AND w.status IN ('open','partial') AND public.epic_project_executing(w.epic_id)))",
  // E1 -- AGT-427's score gate inside pick_exclusions()'s CASE HEAD (the THEN branches, which
  // write the sentence naming the ticket's OWN score, are deliberately untouched).
  "coalesce((public.effective_need_score(b.id) >= 3 OR EXISTS",
  // E3 -- the drain pick's leading severity key.
  "ORDER BY 6 - public.effective_need_score(b.id), -- AGT-483",
  // E4 -- AGT-432's floor, P2.
  "AND public.effective_need_score(b.id) >= 3 -- AGT-483",
  // the gate sentinel, so the fixtures the gate wrote were rolled back
  "P0483",
];

// Pure: which needles the text lacks.
export function missingNeedles(text, needles = NEEDLES) {
  return needles.filter(n => !text.includes(n));
}

// Pure: the mirror's SQL half -- everything after the VERBATIM marker line, with the file's single
// trailing newline stripped. That is exactly the text `apply_migration` was handed.
export function sqlHalf(text) {
  const i = text.indexOf(VERBATIM_MARK);
  assert.notStrictEqual(i, -1, `the mirror has no ${VERBATIM_MARK} marker, so its SQL half cannot be located`);
  const nl = text.indexOf("\n", i);
  return text.slice(nl + 1).replace(/\n$/, "");
}

// Pure, and the whole verdict on the pair: the named cases that FAILED, in order, over one
// parent_score_probe() row. The probe measures and never asserts (designer's call (vii)), so this
// is the only place the pair is graded -- and because it is pure, the test below can mutate one
// field of a real live row and prove each case can still fail.
export function gradePair(j) {
  const failed = [];
  const arr = v => (Array.isArray(v) ? v : null);
  const cReasons = arr(j?.child_reasons) ?? [];
  const sReasons = arr(j?.stranger_reasons);
  const floor = arr(j?.tooling_countable);
  const lane = arr(j?.selfbuild);
  const res = j?.residue ?? {};

  // (1) THE WHOLE TICKET: the CHILD's own column says 1 and it blocks a 5, so the lift must read 5.
  if (j?.child !== 5) failed.push("child-reads-5");
  // the three controls: a STRANGER or a CONTROL that moved means the lift is not reading blocked_by.
  if (!(j?.parent === 5 && j?.stranger === 1 && j?.control === 4)) failed.push("own-scores-hold");
  // (2) the pick's own sentence: the lifted CHILD carries no score reason any more...
  if (cReasons.some(r => /is below 3$|not yet scored/.test(String(r)))) failed.push("child-no-score-reason");
  // ...while the STRANGER, which blocks nobody, still reads its own -- designer's call (iv).
  if (!(sReasons && sReasons.includes("need_score 1 is below 3"))) failed.push("stranger-keeps-own-reason");
  // (3) AGT-432's floor counts the lifted CHILD and neither the STRANGER nor the blocked PARENT.
  if (!(floor && floor.includes("ZFIX-48302"))) failed.push("floor-counts-child");
  if (!floor || floor.includes("ZFIX-48301") || floor.includes("ZFIX-48303")) failed.push("floor-excludes-stranger-and-parent");
  // (4) the selfbuild lane, in its own pos order.
  if (!(lane && lane.includes("ZFIX-48302") && lane.includes("ZFIX-48304"))) failed.push("lane-names-child-and-control");
  if (!lane || lane.includes("ZFIX-48301") || lane.includes("ZFIX-48303")) failed.push("lane-excludes-stranger-and-parent");
  // the 1 sorting ahead of a 4 IS the ticket: 6 - need_score is the leading key of every lane.
  if (!(lane && lane.indexOf("ZFIX-48302") >= 0 && lane.indexOf("ZFIX-48302") < lane.indexOf("ZFIX-48304"))) failed.push("child-ahead-of-control");
  // (5) the drain pick, where the same board before v7.0.857 answered the CONTROL.
  if (!(j?.drain_outcome === "pick" && j?.drain_pick === "ZFIX-48302")) failed.push("drain-picks-child");
  // and the sentinel took every fixture write with it.
  if (!(res.items === 0 && res.directives === 0 && res.decisions === 0 && res.scope === 0)) failed.push("residue-zero");

  return failed;
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
  results.push("mirror-holds-f1-the-three-anchored-splices-and-the-sentinel");

  // the md5 pin, with its own control. This migration does not print the four bodies, so this is
  // what holds the mirror to what shipped: edit one byte of the SQL half and this goes red.
  const half = sqlHalf(sql);
  const md5 = crypto.createHash("md5").update(half, "utf8").digest("hex");
  assert.strictEqual(md5, APPLIED_MD5,
    `the mirror's SQL half hashes to ${md5} over ${half.length} bytes, but the statement applied as `
    + `agt483_parent_score hashes to ${APPLIED_MD5} over 18312. The mirror is no longer the migration `
    + "verbatim -- either the file was edited after the apply, or a later migration shipped without "
    + "updating its own mirror. Re-read supabase_migrations.schema_migrations rather than editing this constant.");
  assert.notStrictEqual(crypto.createHash("md5").update(half + " ", "utf8").digest("hex"), APPLIED_MD5,
    "control: the md5 pin cannot tell one extra byte from the applied statement");
  results.push("mirror-sql-half-is-the-applied-statement-byte-for-byte");

  // --- live transport ---------------------------------------------------------------------------
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live arms (the lift's arithmetic over every blocker on the board, and the floor's ids, and the pair via parent_score_probe)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the lift is a database function and there is nothing "
      + "to read without them. Run: node --env-file-if-exists=.env.local tests/regression/agt-483-parent-score.test.mjs");
  } else {
    const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
    const get = async q => {
      const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
      if (!r.ok) assert.fail(`GET ${q} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
      return r.json();
    };
    const rpc = async (fn, body = {}) => {
      const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers: hdr, body: JSON.stringify(body) });
      if (!r.ok) assert.fail(`rpc/${fn} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
      return r.json();
    };

    // the epics whose project is executing -- the only waiters that may lend a score (call (ii)).
    const projects = await get("projects?status=eq.executing&select=id,slug,name,priority&order=priority,slug");
    const epicRows = projects.length
      ? await get(`epics?project_id=in.(${projects.map(p => p.id).join(",")})&select=id,project_id`)
      : [];
    const executingEpicIds = new Set(epicRows.map(e => e.id));

    // --- B1: the lift's arithmetic, over every blocker the board actually has -------------------
    const waiters = await get(
      "backlog_items?status=in.(open,partial)&blocked_by=not.is.null&select=id,backlog_id,need_score,epic_id,blocked_by");
    const liftsByBlocker = new Map();
    for (const w of waiters) {
      if (!executingEpicIds.has(w.epic_id)) continue;      // call (ii): a planned project cannot lend
      if (!liftsByBlocker.has(w.blocked_by)) liftsByBlocker.set(w.blocked_by, []);
      liftsByBlocker.get(w.blocked_by).push(w.need_score);
    }
    const blockerIds = [...liftsByBlocker.keys()];
    const blockers = blockerIds.length
      ? await get(`backlog_items?id=in.(${blockerIds.join(",")})&status=in.(open,partial)&select=id,backlog_id,need_score`)
      : [];
    if (blockers.length === 0) {
      notRun("the lift's arithmetic over live blockers (arm B1)",
        `the board carries ${waiters.length} open/partial ticket(s) with a blocker and none of their blockers is `
        + "itself open or partial, so there is no row the lift speaks about. The ordinary quiet-board state, not a "
        + "pass -- arm C below drives the positive case every run, under fixtures it rolls back itself.");
    } else {
      const wrong = [];
      let lifted = 0;
      for (const b of blockers) {
        const lifts = (liftsByBlocker.get(b.id) ?? []).filter(s => Number.isInteger(s));
        const hand = effectiveScore(b.need_score, lifts);
        const live = await rpc("effective_need_score", { p_id: b.id });
        if ((live ?? null) !== (hand ?? null)) {
          wrong.push(`${b.backlog_id} own=${JSON.stringify(b.need_score)} lifts=${JSON.stringify(lifts)} `
            + `hand=${JSON.stringify(hand)} live=${JSON.stringify(live)}`);
        }
        if (hand !== null && (b.need_score === null || hand > b.need_score)) lifted += 1;
      }
      assert.deepStrictEqual(wrong, [],
        "effective_need_score disagrees with GREATEST(own, max(waiter)) computed by hand off the raw rows -- "
        + wrong.join("; "));
      console.log(`         AGT-483 lift, recomputed this run: ${blockers.length} open/partial blocker(s), `
        + `${lifted} actually lifted above their own score`);
      if (lifted === 0) {
        notRun("the POSITIVE half of the lift over live rows (arm B1)",
          `all ${blockers.length} open/partial blocker(s) on the board right now read their own score back: every `
          + "ticket waiting behind one of them is itself unscored, so there is no score to lend and GREATEST has "
          + "nothing to raise. That is a real board state, not a pass -- the identity case IS graded above (and it "
          + "is the case that would break if the lift read the wrong row), and the POSITIVE case is arm C below, "
          + "which drives it live this run through parent_score_probe() under fixtures it rolls back itself.");
      } else {
        results.push(`lift-matches-hand-value-on-all-${blockers.length}-blockers-${lifted}-lifted`);
      }
      results.push(`lift-identity-holds-on-all-${blockers.length}-live-blockers`);
    }

    // --- B2: THE FLOOR -- AGT-481's hand count, recomputed with the EFFECTIVE score in P2 -------
    // Every predicate but P2 is read from AGT-481's own exported rules rather than restated
    // (pattern:14/17); P2 is the one this ticket changed, so it is the one computed here.
    const hours = await rpc("countable_claim_hours");
    const rows = await rpc("countable_tickets_per_project");
    const bySlug = new Map(rows.map(r => [r.project_slug, r]));
    const now = Date.now();
    const printed = [];

    for (const pj of projects) {
      const epics = epicRows.filter(e => e.project_id === pj.id).map(e => e.id);
      let raw = [];
      if (epics.length > 0) {
        raw = await get(
          `backlog_items?epic_id=in.(${epics.join(",")})&status=in.(open,partial)`
          + "&select=id,backlog_id,need_score,blocked_by,design_status,claimed_by,claimed_at");
      }

      const countable = [];
      for (const b of raw) {
        // P2, THE ONE AGT-483 MOVED: the EFFECTIVE score, not the row's own column.
        const eff = await rpc("effective_need_score", { p_id: b.id });
        if (!(Number.isInteger(eff) && eff >= 3)) continue;
        if (hasDesignFlag(b.design_status)) continue;                               // P7
        if (claimIsLive(b.claimed_by, b.claimed_at, hours, now)) continue;          // P8
        const grade = await get(
          `runner_decisions?kind=eq.requirement-check&backlog_id=eq.${b.backlog_id}`
          + "&reversed_at=is.null&order=decided_at.desc&limit=1&select=reasoning");
        if (grade.length === 0) continue;                                           // P3
        if (isParked(grade[0].reasoning)) continue;                                 // P5
        if (b.blocked_by) {                                                         // P4
          const blocker = await get(`backlog_items?id=eq.${b.blocked_by}&select=status`);
          if (!(blocker.length > 0 && UNBLOCKING.includes(blocker[0].status))) continue;
        }
        const cards = await get(                                                    // P6
          `runner_items?backlog_id=eq.${b.backlog_id}&kind=eq.gated_before_build&decision=is.null&select=id`);
        if (cards.length > 0) continue;
        countable.push(b.backlog_id);
      }
      countable.sort();

      const row = bySlug.get(pj.slug);
      assert.ok(row, `the floor returned no row for ${pj.slug}`);
      assert.deepStrictEqual([...(row.backlog_ids ?? [])].sort(), countable,
        `${pj.slug}: the floor's ids and the effective-score hand count disagree -- floor `
        + `${JSON.stringify(row.backlog_ids)}, hand count ${JSON.stringify(countable)} over ${raw.length} open/partial `
        + "ticket(s). E4 is not reading public.effective_need_score, or the lift is lifting something it should not.");
      printed.push(`${pj.slug}: ${raw.length} open -> countable ${countable.length} ${JSON.stringify(countable)}`);
    }
    console.log(`         AGT-483 floor, recomputed this run with the effective score: ${printed.join(" | ")}`);
    results.push("floor-ids-match-the-effective-score-hand-count-per-project");

    // --- C: THE PAIR, driven every run ----------------------------------------------------------
    // One call stands the four fixtures and the dated exclusive drain up, measures them and rolls
    // every write back inside itself (sentinel P0483), so this arm writes nothing that outlives it
    // and still reaches the lift's POSITIVE branch -- the branch arm B cannot reach while the live
    // board carries 0 actual lifts. gradePair() is the verdict; the probe asserts nothing.
    const j = await rpc("parent_score_probe", {});
    console.log(`         AGT-483 pair probe: ${JSON.stringify(j)}`);

    // TRANSPORT IS NOT A VERDICT (AGT-116, docs/STANDARDS.md Section 4), applied one layer out: an
    // in-process run-all.js can hand this file a STUBBED globalThis.fetch left behind by an earlier
    // test, and a stub's catch-all `[]` is not the database answering. Grading it would blame the
    // lift for another test's leak, so the shape is checked first and the arm declares itself
    // not-run instead -- loudly, never as a pass. It cannot hide a real regression: a genuinely
    // reverted lift still returns a full jsonb object (measured: child 1 under a raw-column
    // effective_need_score), so that case is GRADED below and goes red at child-reads-5.
    const answered = j !== null && typeof j === "object" && !Array.isArray(j) && Number.isInteger(j.child);
    if (!answered) {
      notRun("the pair via parent_score_probe (arm C)",
        `the probe answered ${JSON.stringify(j)}, which is not the jsonb object a service_role `
        + "PostgREST call returns -- so NOTHING about the lift was measured here and this is not a "
        + "pass. MEASURED CAUSE on this tree, not recalled: tests/regression/add-capability.test.mjs "
        + "assigns globalThis.fetch at module scope (its lines 67 and 148) and never restores it, "
        + "and the second stub's catch-all returns `{ ok: true, status: 200, json: async () => [] }` "
        + "with no text() -- so every credentialed test after it in ONE in-process run-all.js reads "
        + "[] or throws `res.text is not a function`. run-all.js's SES-215 restore covers "
        + "process.env only, not globalThis.fetch, which is the same cross-test pollution class one "
        + "layer out. Reproduce both directions: "
        + "`node tests/regression/run-all.js --only=add-capability.test.mjs,agt-483-parent-score.test.mjs` "
        + "answers [] here, `--only=agt-483-parent-score.test.mjs` answers the real object. Drive the "
        + "arm with: node --env-file-if-exists=.env.local tests/regression/agt-483-parent-score.test.mjs");
    } else {
      assert.deepStrictEqual(gradePair(j), [],
        `the pair failed: ${JSON.stringify(gradePair(j))}. One call of public.parent_score_probe() `
        + `returned ${JSON.stringify(j)}. A 1 that stands in front of a 5 must be ranked, listed, `
        + "counted and picked as that 5, while an unrelated 1 must still be refused -- if "
        + "child-reads-5 is in that list, the four readers are back on the raw need_score column.");

      // the controls, on the real row this run returned: each case must still be ABLE to fail, or
      // gradePair() is an empty list that means nothing (the SES-158 / LOO-013 assert).
      assert.deepStrictEqual(gradePair({ ...j, child: 1 }), ["child-reads-5"],
        "control: a CHILD reading its own 1 must fail exactly child-reads-5 and nothing else");
      assert.ok(gradePair({ ...j, selfbuild: [...j.selfbuild].reverse() }).includes("child-ahead-of-control"),
        "control: the lifted CHILD sorting BEHIND the CONTROL must fail child-ahead-of-control");

      // and the rollback, read from OUTSIDE the probe in a second statement -- the probe's own
      // residue counts are taken inside the call that wrote them, so they cannot prove this.
      const leftOver = await get("backlog_items?source_file=eq.agt483-gate&select=id");
      assert.strictEqual(leftOver.length, 0,
        `the probe left ${leftOver.length} agt483-gate ticket(s) on the LIVE board -- sentinel P0483 `
        + "did not roll its fixtures back, which is a regression run mutating working data (pattern:76)");
      results.push("pair-asserted-live-a-1-sorts-as-the-5-behind-it-an-unrelated-1-does-not");
    }
  }

  return results;
}

selfRun(import.meta.url, run);
export default run;
