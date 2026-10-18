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
//   C. the positive pair is declared NOT RUN here -- driving it means standing a drain, a parent
//      and a blocker up on the LIVE board -- and quotes the migration's own rolled-back gate.
//
// WHY ARM B READS RATHER THAN WRITES. pattern:76: a regression run never mutates working data.
// Reaching the lift's positive branch means writing a parent, a blocker and a queued drain onto
// the live board, so the migration's trailing DO block does it inside a sub-block that ends in
// sentinel P0483 -- fixtures rolled back, migration committed -- and this file quotes that instead.

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
    notRun("the live arms (the lift's arithmetic over every blocker on the board, and the floor's ids)",
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
        + "pass -- arm C quotes the migration's own gate, which measured the positive case under fixtures.");
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
          + "is the case that would break if the lift read the wrong row), and the positive case was measured under "
          + "the migration's own rolled-back fixtures (arm C).");
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
  }

  // --- C: the positive pair ----------------------------------------------------------------------
  notRun("the positive pair -- a scored-1 blocker ranked, listed and picked as the 5 it stands in front of, and the same score-1 ticket refused when it blocks nobody",
    "driving it means writing a parent, its blocker, a stranger, a control and a queued exclusive drain onto the "
    + "LIVE board and then handing real tickets to a real pick, which a permanent regression test must never do "
    + "(pattern:76, the SES-196 / SES-218 / SES-275 refusal), and this suite reaches Supabase only over PostgREST, "
    + "which cannot open a transaction to roll a fixture back. MEASURED IN THE MIGRATION INSTEAD: "
    + "`agt483_parent_score`'s trailing DO block writes its fixtures inside a sub-block that ends in sentinel "
    + "P0483, so every fixture write is undone while the migration still commits, and the outer block RAISEs -- "
    + "aborting the whole migration, F1 and all four splices included -- unless every case holds. The fixtures, all "
    + "in epic ced3a7d0 (Tooling, project executing), graded in this order: PARENT ZFIX-48301 open scored 5 with "
    + "blocked_by = the CHILD; CHILD ZFIX-48302 open scored 1; STRANGER ZFIX-48303 open scored 1 blocking nobody; "
    + "CONTROL ZFIX-48304 open scored 4; CHILD and STRANGER each carrying an unreversed requirement-check row. "
    + "(1) effective_need_score reads 5 / 5 / 1 / 4 for PARENT / CHILD / STRANGER / CONTROL -- the CHILD's own "
    + "column says 1. (2) pick_exclusions() gives the CHILD no reason matching 'is below 3' or 'not yet scored', "
    + "while the STRANGER still reads exactly 'need_score 1 is below 3' -- THE CONTROL, and the half designer's "
    + "call (iv) deliberately left alone: the sentence still names the ticket's OWN score. "
    + "(3) countable_tickets_per_project()'s tooling ids hold the CHILD and hold neither the STRANGER nor the "
    + "blocked PARENT. Then a fixture drain D, exclusive and dated 2020-01-01 so both picks read it rather than the "
    + "board's own, naming all four: (4) prime_directive_queue()'s selfbuild lane names the CHILD and the CONTROL "
    + "and neither the STRANGER nor the PARENT, with pos(CHILD) < pos(CONTROL) -- the 1 sorting ahead of a 4 is the "
    + "whole ticket, since 6 - need_score is the leading key of every lane; (5) drain_epic_next(cycle) answers "
    + "outcome 'pick' with the CHILD, where the same board before this migration answered the CONTROL. Then, "
    + "outside the fixtures: exactly 1 pg_proc overload of each of the five functions, EXECUTE reading anon=false, "
    + "authenticated=false, service_role=true on each, public.effective_need_score(b.id) occurring exactly once in "
    + "each of the four spliced bodies and zero times in F1 itself, and zero fixture residue. Applied 2026-10-18 "
    + "07:32Z, result {\"success\":true}. THE CAVEAT, because a false green here would be invisible: the gate's own "
    + "`AGT-483 GATE PASSED` and `AGT-483 SPLICE` NOTICE bodies were NOT relayed by the apply channel, so nobody "
    + "has read them and they are quoted nowhere. What the success flag proves is what the gate was built to prove "
    + "-- the outer block aborts the entire migration unless every case above holds, so a COMMITTED migration is "
    + "the pass. What was re-read live afterwards, outside the gate, and is quoted in the mirror's header: the five "
    + "functions at one overload each with their post-apply md5s, EXECUTE closed to anon and authenticated on all "
    + "five, zero residue, 0 mismatches between effective_need_score and the hand value over the board's 10 "
    + "open/partial blockers, and the floor unmoved at tooling 1 {AGT-304} -- which is the right answer, because "
    + "with 0 actual lifts the effective score IS the own score everywhere.");

  return results;
}

selfRun(import.meta.url, run);
export default run;
