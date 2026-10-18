// DeepBench v7.0.860 | tests/regression/agt-485-victoria-daily-check.test.mjs | AGT-485 -- the ONE
// DAILY CHECK: John's ten has a single home and a single daily reader, and this guard drives that
// home at nine and at ten and recomputes the reader's second arm from the raw board.
//
// WHAT THIS PINS.
//   * `public.victoria_daily_verdict(p_counts jsonb, p_fives integer)` -- pure, IMMUTABLE, the one
//     home of the floor (requirements d.1): a project under ten answers `project_below_floor`,
//     else a 5 outside the active projects answers `five_outside_projects`, else `at_floor`.
//   * `public.victoria_daily_check()` -- one row, `prompt` / `reason` / `detail`. Arm 1 is
//     `countable_tickets_per_project()` UNCHANGED (AGT-481, its own guard still grades it); arm 2
//     is that function's own P1-P8 block with two changes -- `effective_need_score(b.id) = 5`
//     (d.3) and `planned`-or-unhomed in place of `executing` (d.10: never a `paused` project's
//     ticket). `detail` = `{below, counts, fives, five_ids}`.
//   * `docs/runbooks/victoria-daily-check.md` -- the routine's canonical prompt block, carrying no
//     trigger id and no model id (AGT-102's placeholder week is why).
//   Both functions are `service_role` only. Before the migration both names 404'd with `PGRST202`.
//
// THE DISCRIMINATING ARM IS A, and it discriminates because it never touches the board: it hands
// the verdict a COUNT SET IT BUILT ITSELF and demands the answer flip at exactly ten. Nine prompts
// and ten is silent -- the Done-when both ways, which is the one assertion a reader that prompted
// on everything (or on nothing) cannot pass. Arm C is the second teeth: it re-derives the fives
// over REST from epics, scored open tickets, their grades, their blockers and their gate cards,
// applying P1-P8 in JavaScript, and demands the same ids the function returned. The predicates it
// applies are IMPORTED from AGT-481's guard rather than retyped, so the hand count has one home
// (pattern:14/17) and a change to the rules moves both guards at once.
//
// NOTHING IS PINNED TO TODAY'S BOARD. The counts, the slugs and the fives are recomputed every
// run, so this guard keeps working as tickets ship and never has to be edited when one moves.
// READ-ONLY, always (pattern:76): every call is a GET or a read-only rpc, no fixture is stood up
// and nothing is cleaned up afterwards.
//
// WHAT THIS GUARD DOES NOT COVER, deliberately: the routine itself does not exist (requirements
// d.35 -- creating it, filling its id in the two registries and switching it on are John's hand),
// so there is no live prompt to compare the block against and no `ROUTINES` entry to assert. Arm D
// grades the repo half only, which is the half this ticket shipped.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
// The P1-P8 hand count has ONE home: AGT-481's guard, which already recomputes these predicates
// from the raw board. Imported, never retyped -- a second copy would agree with itself while the
// shipped rule moved (docs/STANDARDS.md Section 4, SES-45).
import { UNBLOCKING, isParked, hasDesignFlag, effectiveScore } from "./agt-481-countable-tickets.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "victoria-daily-check.md");
const BEGIN = "<!-- VICTORIA-DAILY-CHECK-PROMPT-BEGIN -->";
const END = "<!-- VICTORIA-DAILY-CHECK-PROMPT-END -->";

// Pure -- P8, AGT-482's fence as `claim_exclusion_reason(text, timestamptz)` actually writes it:
// the `STOPPED-BY-JOHN` sentinel is tested BEFORE the age arm, so no elapsed time frees John's stop
// (requirements d.23) -- and a held claim with no `claimed_at` reads live, which is the cautious
// direction and the one the SQL's NULL comparison takes. A NULL `claimed_by` is the only value that
// is not a claim at all: an empty string is, exactly as in the function.
export function claimExcluded(claimedBy, claimedAt, hours, now = Date.now()) {
  if (claimedBy === null || claimedBy === undefined) return false;
  if (String(claimedBy).startsWith("STOPPED-BY-JOHN")) return true;
  if (!claimedAt) return true;
  return Date.parse(claimedAt) >= now - hours * 3600 * 1000;
}

// Pure -- the marker rule arm D grades: a marker is a WHOLE LINE and appears exactly once, which is
// what `scripts/check-routine-prompt.js` slices the block on. Two copies of a marker, or one buried
// mid-sentence, and the block a routine is pasted from is whichever half the slicer happened to cut.
export function wholeLineCount(text, marker) {
  return String(text).split("\n").filter(l => l === marker).length;
}

async function run() {
  const results = [];

  // --- D: THE RUNBOOK -- no credentials needed, so it runs every time -----------------------------
  const book = fs.readFileSync(RUNBOOK, "utf8");
  assert.strictEqual(wholeLineCount(book, BEGIN), 1,
    `${BEGIN} must appear exactly once as a whole line in docs/runbooks/victoria-daily-check.md -- `
    + `found ${wholeLineCount(book, BEGIN)}. check-routine-prompt.js slices the block on these lines.`);
  assert.strictEqual(wholeLineCount(book, END), 1,
    `${END} must appear exactly once as a whole line in docs/runbooks/victoria-daily-check.md -- `
    + `found ${wholeLineCount(book, END)}.`);

  const block = book.split(BEGIN)[1].split(END)[0];
  assert.ok(block.trim().length > 500,
    `the prompt block is ${block.trim().length} chars -- that is not a routine prompt.`);
  assert.ok(!/trig_/.test(block),
    "the prompt block carries a trigger id. The id lives in the schedule table, never in the block: "
    + "AGT-102 ran the Auditor a week on a placeholder id pasted into a prompt.");
  assert.ok(!/claude-/.test(block),
    "the prompt block names a model id. The model is the `model_assignments` row the sub-agent's own "
    + "assembly prints at run time (AGT-146), never a literal in the block.");
  for (const fn of ["public.routine_meter_ok()", "public.victoria_daily_check()"]) {
    assert.ok(block.includes(fn),
      `the prompt block must name ${fn} -- a run that cannot find its meter (d.38) or its check (d.35) `
      + `is a run that decides the floor by itself. Block: ${block.slice(0, 200)}...`);
  }
  // The routine is PREPARED ONLY: the block must say so about the two switches that stay John's.
  assert.ok(/SKIPPED: at floor/.test(block) && /SKIPPED: weekly meter/.test(block),
    "the block must carry both stop lines verbatim -- `SKIPPED: weekly meter <all_models_pct>% (<reason>)` "
    + "(d.38, step 0) and `SKIPPED: at floor` (step 1). A stop with no line written is a run nobody can audit.");
  results.push("runbook-block-has-both-markers-once-no-trigger-id-no-model-id-names-both-rpcs");

  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("arms A, B and C (the verdict at nine and ten, the reader's one row, the re-derived fives)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the check is a pair of database functions and "
      + "there is nothing to read without them. Arm D (the runbook) ran. Run: node "
      + "--env-file-if-exists=.env.local tests/regression/agt-485-victoria-daily-check.test.mjs");
    return results;
  }

  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: { ...hdr, Prefer: "count=exact" } });
    if (!r.ok) assert.fail(`GET ${q} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
    const rows = await r.json();
    // A silently truncated page would make every hand count agree with a shorter board. A query that
    // asks for a DELIBERATE slice (the newest grade, `limit=1`) is exempt by its own limit: the
    // check fires only where the read is meant to be the whole set.
    const total = Number(String(r.headers.get("content-range") ?? "").split("/")[1]);
    const asked = /[?&]limit=(\d+)/.exec(q);
    const cap = asked ? Number(asked[1]) : null;
    if (Number.isInteger(total) && (cap === null || total <= cap)) {
      assert.strictEqual(rows.length, total,
        `GET ${q} returned ${rows.length} of ${total} rows -- PostgREST paginated the read this hand `
        + "count depends on. Raise the limit rather than grading a partial board.");
    }
    return rows;
  };
  const rpc = async (fn, body = {}) => {
    const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers: hdr, body: JSON.stringify(body) });
    if (!r.ok) assert.fail(`rpc/${fn} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
    return r.json();
  };
  const one = rows => {
    assert.ok(Array.isArray(rows) && rows.length === 1,
      `expected exactly one row, got ${JSON.stringify(rows).slice(0, 200)}`);
    return rows[0];
  };

  // --- A: THE DISCRIMINATOR -- John's ten, driven on a count set this test built -----------------
  const verdict = async (counts, fives) => one(await rpc("victoria_daily_verdict", { p_counts: counts, p_fives: fives }));

  let v = await verdict([{ slug: "a", countable: 9 }], 0);
  assert.deepStrictEqual([v.prompt, v.reason], [true, "project_below_floor"],
    `nine countable on one project must prompt with project_below_floor, got ${JSON.stringify(v)}. `
    + "Ten is John's floor (requirements d.1) and this function is its only home.");

  v = await verdict([{ slug: "a", countable: 10 }], 0);
  assert.deepStrictEqual([v.prompt, v.reason], [false, "at_floor"],
    `ten countable with no loose five must be SILENT and read at_floor, got ${JSON.stringify(v)}. `
    + "A check that prompts at ten prompts every day and the prompt stops meaning anything.");

  v = await verdict([{ slug: "a", countable: 10 }], 1);
  assert.deepStrictEqual([v.prompt, v.reason], [true, "five_outside_projects"],
    `ten countable and one 5 outside the active projects must prompt with five_outside_projects, `
    + `got ${JSON.stringify(v)} (requirements d.3).`);

  v = await verdict([{ slug: "a", countable: 10 }, { slug: "b", countable: 9 }], 0);
  assert.deepStrictEqual([v.prompt, v.reason], [true, "project_below_floor"],
    `one project at ten and one at nine must still prompt -- ANY project under the floor is the `
    + `reason, not the average, got ${JSON.stringify(v)}.`);
  results.push("verdict-prompts-at-nine-is-silent-at-ten-and-names-the-arm-that-answered");

  // --- B: the reader's one row, and its counts are the sensor's own ------------------------------
  const sensor = await rpc("countable_tickets_per_project");
  const row = one(await rpc("victoria_daily_check"));
  const detail = row.detail ?? {};

  assert.deepStrictEqual((detail.counts ?? []).map(c => c.slug), sensor.map(s => s.project_slug),
    "detail.counts must be countable_tickets_per_project()'s own rows, slug for slug and in its own "
    + `priority order -- reader ${JSON.stringify((detail.counts ?? []).map(c => c.slug))}, sensor `
    + `${JSON.stringify(sensor.map(s => s.project_slug))}. A reader that re-implements the sensor is a `
    + "second copy of P1-P8 that drifts.");
  assert.deepStrictEqual((detail.counts ?? []).map(c => c.countable), sensor.map(s => s.countable),
    `and count for count -- reader ${JSON.stringify((detail.counts ?? []).map(c => c.countable))}, sensor `
    + `${JSON.stringify(sensor.map(s => s.countable))}.`);
  assert.deepStrictEqual(detail.below, sensor.filter(s => s.countable < 10).map(s => s.project_slug),
    `detail.below must be exactly the projects under ten, in the sensor's order -- got `
    + `${JSON.stringify(detail.below)} against ${JSON.stringify(sensor.map(s => `${s.project_slug}:${s.countable}`))}.`);

  const expectedReason = sensor.some(s => s.countable < 10) ? "project_below_floor"
    : (detail.fives > 0 ? "five_outside_projects" : "at_floor");
  assert.strictEqual(row.reason, expectedReason,
    `the reader answered ${row.reason} over counts ${JSON.stringify(sensor.map(s => s.countable))} and `
    + `${detail.fives} loose five(s) -- the verdict's own arms say ${expectedReason}.`);
  assert.strictEqual(row.prompt, expectedReason !== "at_floor",
    `prompt ${row.prompt} does not match reason ${row.reason}.`);
  assert.strictEqual(detail.fives, (detail.five_ids ?? []).length,
    `detail.fives reads ${detail.fives} but five_ids holds ${(detail.five_ids ?? []).length} id(s) -- the `
    + "count and the ids must come from the same set.");
  console.log(`         AGT-485 live: ${row.prompt} / ${row.reason} | `
    + `${sensor.map(s => `${s.project_slug} ${s.countable}`).join(", ")} | fives ${detail.fives}`);
  results.push("reader-returns-one-row-whose-counts-and-below-are-the-sensors-own");

  // --- C: THE FIVES, re-derived over REST without ever asking the reader -------------------------
  // Arm 2's scope: a `planned` project's list, or no epic at all. A `paused` project's ticket is not
  // hers to move (requirements d.10), so the scope is NAMED `planned` rather than "not executing".
  const planned = await get("projects?status=eq.planned&select=id,slug");
  const executing = await get("projects?status=eq.executing&select=id,slug");
  const plannedEpics = new Set((planned.length
    ? await get(`epics?project_id=in.(${planned.map(p => p.id).join(",")})&select=id&limit=2000`)
    : []).map(e => e.id));
  // AGT-483 call (ii): only an open/partial waiter whose epic's project is EXECUTING lends its score.
  const executingEpics = new Set((executing.length
    ? await get(`epics?project_id=in.(${executing.map(p => p.id).join(",")})&select=id&limit=2000`)
    : []).map(e => e.id));

  const hours = await rpc("countable_claim_hours");
  assert.strictEqual(typeof hours, "number",
    `rpc/countable_claim_hours must return a bare integer, got ${JSON.stringify(hours)}`);

  // Two bulk reads, then the arithmetic is local: the whole open/partial board once, and every
  // waiter once. The per-ticket round trips below are spent only on the handful that reach five.
  const open = await get("backlog_items?status=in.(open,partial)"
    + "&select=id,backlog_id,need_score,blocked_by,design_status,claimed_by,claimed_at,epic_id&limit=5000");
  const waiters = await get("backlog_items?status=in.(open,partial)&blocked_by=not.is.null"
    + "&select=blocked_by,need_score,epic_id&limit=5000");
  const liftsBy = new Map();
  for (const w of waiters) {
    if (!executingEpics.has(w.epic_id)) continue;      // a non-executing waiter lends nothing
    if (!liftsBy.has(w.blocked_by)) liftsBy.set(w.blocked_by, []);
    liftsBy.get(w.blocked_by).push(w.need_score);
  }

  const now = Date.now();
  const scoped = open.filter(b => b.epic_id === null || plannedEpics.has(b.epic_id));
  const atFive = scoped.filter(b => effectiveScore(b.need_score, liftsBy.get(b.id) ?? []) === 5);

  const hand = [];
  for (const b of atFive) {
    if (hasDesignFlag(b.design_status)) continue;                          // P7
    if (claimExcluded(b.claimed_by, b.claimed_at, hours, now)) continue;   // P8

    const grade = await get(
      `runner_decisions?kind=eq.requirement-check&backlog_id=eq.${b.backlog_id}`
      + "&reversed_at=is.null&order=decided_at.desc&limit=1&select=reasoning");
    if (grade.length === 0) continue;                                      // P3
    if (isParked(grade[0].reasoning)) continue;                            // P5

    if (b.blocked_by) {                                                    // P4
      const blocker = await get(`backlog_items?id=eq.${b.blocked_by}&select=status`);
      if (!(blocker.length > 0 && UNBLOCKING.includes(blocker[0].status))) continue;
    }

    const cards = await get(                                               // P6
      `runner_items?backlog_id=eq.${b.backlog_id}&kind=eq.gated_before_build&decision=is.null&select=id`);
    if (cards.length > 0) continue;

    hand.push(b.backlog_id);
  }
  hand.sort();

  assert.deepStrictEqual([...(detail.five_ids ?? [])].sort(), hand,
    `the reader's fives and the hand count disagree -- reader ${JSON.stringify(detail.five_ids)}, hand `
    + `count ${JSON.stringify(hand)} over ${scoped.length} open/partial ticket(s) in planned-or-unhomed `
    + `scope, ${atFive.length} of them at effective score 5. One of arm 2's two changes (score 5, `
    + "planned-or-unhomed) or one of P1-P8 is not doing what the kickoff's §4 says it does.");
  console.log(`         AGT-485 fives re-derived this run: ${scoped.length} scoped -> ${atFive.length} at `
    + `effective 5 -> ${hand.length} countable ${JSON.stringify(hand)}`);
  results.push("fives-re-derived-from-the-raw-board-match-the-readers-ids");

  // --- the anon denial, declared ------------------------------------------------------------------
  const anon = process.env.SUPABASE_ANON_KEY ?? "";
  if (!anon) {
    notRun("the anon denial over the wire -- that the anon key cannot EXECUTE either function",
      "SUPABASE_ANON_KEY is absent from this environment, so there is no public key to be refused "
      + "with. The denial IS asserted in both directions by the migration's own trailing gate "
      + "(docs/design/agt-485-victoria-daily-check.sql, check (b)): has_function_privilege reads "
      + "false for anon and for authenticated and true for service_role on BOTH functions, and the "
      + "gate's RAISE rolls the whole migration back otherwise -- so a committed migration is that "
      + "assert passing. Run with the anon key present to drive it from outside the database.");
  } else {
    for (const fn of ["victoria_daily_check", "victoria_daily_verdict"]) {
      const r = await fetch(`${base}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
        body: "{}",
      });
      assert.notStrictEqual(r.status, 200,
        `the anon key reached ${fn}() and got HTTP 200 -- the daily check reads the whole board's `
        + "grading and claim state and must be service_role only. Postgres grants EXECUTE to anon, "
        + "authenticated and service_role BY NAME when a function is created and REVOKE ... FROM "
        + `PUBLIC does not remove those (.claude/rules/supabase-column-grants.md, SES-315). Body: `
        + `${await r.text().catch(() => "")}`);
    }
    results.push("anon-key-cannot-execute-either-function");
  }

  return results;
}

selfRun(import.meta.url, run);
export default run;
