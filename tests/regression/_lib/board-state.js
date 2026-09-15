// DeepBench v7.0.497 | tests/regression/_lib/board-state.js | SES-401 -- an empty or all-claimed
// pick lane is DECLARED, not failed, and the discrimination lives in ONE place.
//
// THE DEFECT, measured against live Supabase on 2026-09-15 rather than recalled. Five regression
// guards each carried their own `lane.length > 0` clause. Emulating a DRAINED board -- the `board`
// row kept, every lane row dropped, nothing else changed -- all five went red at once:
//
//   tests/regression/ses-281-m5-pick-enforcement.test.mjs:365  "the selfbuild lane came back empty"
//   tests/regression/ses-321-enhancement-fence.test.mjs:249    assert.ok(selfbuild.length > 0, …)
//   tests/regression/ses-340-projects-govern.test.mjs:126      assert.ok(lane.length > 0, …)
//   tests/regression/ses-353-standing-decisions.test.mjs:174   "returned no ranked row at all"
//   tests/regression/SES-135-briefing-render.js:127            builder exits 2 at build-briefing.mjs:541
//
// So finishing the executing project -- the platform doing exactly what it is for -- would block
// every verdict the cycle needs to ship. An empty lane is a STATE, and only one of its four shapes
// is a defect.
//
// WHY ONE FILE AND NOT FIVE HAND-EDITS. `_lib/self-run.js` already records the answer (SES-207):
// that ticket named FIVE copy-sites and the live count was SEVEN, because the mechanism is
// copy-propagation between test files -- the next author copies from whichever file they open.
// Correcting N sites by hand does not stop it. This module is the one home; a sixth guard that
// needs the discrimination imports it rather than growing a sixth `lane.length > 0`.
//
// THE FOUR STATES, and the teeth are in the fourth:
//   * `servable` -- the lane returned at least one row. Assert exactly as before; nothing changes.
//   * `held`     -- the lane is empty and at least one in-scope ticket is held by a LIVE cycle.
//                   Under register B42 parallel cycles coordinate by atomic claims, so a contested
//                   claim withholding every candidate is the design working. DECLARED not-run.
//   * `drained`  -- the lane is empty and the executing project has ZERO open/partial queued
//                   tickets left. The board is finished, not broken. DECLARED not-run.
//   * `starved`  -- the lane is empty, nothing is held live, and in-scope tickets REMAIN. That
//                   means no project is executing or the fence broke, and it was always the
//                   finding. STILL FAILS, in each caller's own original words.
//
// A blanket not-run on every empty lane would turn `starved` green too, which is a gutting rather
// than a retarget (STANDARDS.md Section 4 clause 1: a guard is retargeted, never made vacuous).
// tests/regression/SES-401-drained-board-declaration.js drives all four states over fixtures with a
// negative control each, precisely so that cannot rot.
//
// THE JOIN IS `runner_cycles.item_id`, NEVER `backlog_items.claimed_by`, and this is not a style
// preference -- it is the measured reason SES-386's existing empty-lane handler never fired once.
// That handler tests `liveCycles.map(c => c.id)` (uuid) for membership of `claimed_by`, which is
// `text` holding a SESSION LABEL. Live on 2026-09-15: `claimed_by` values were
// `design-app-shell-0915` and `run-project:moat-support:1`; `runner_cycles` has no `session_name`
// column at all (information_schema, checked this session); 3 claimed tickets, 2 live cycles, ZERO
// matches. The join that works is `runner_cycles.item_id = backlog_items.backlog_id AND
// ended_at IS NULL` -- live cycle `0535feab` carried `item_id = 'SES-401'`, which is claimed.
// `heldOnClaimedBy()` below preserves the dead form ON PURPOSE, exported for one reason: so the
// SES-401 guard can prove it returns 0 on a fixture the live join classifies `held`.
//
// A NAMED BOUNDARY, DECLARED RATHER THAN DISCOVERED LATER: a lane emptied solely because an
// unresolved `M_ design gate%` ticket is withholding its milestone's members classifies `starved`
// and still fails. Re-deriving the gate predicate in JS to tell that apart would be a second
// implementation of a shipped SQL rule agreeing with itself -- the SES-45 violation this file
// exists to avoid. Recorded as residue in docs/harvests/SES-401.md.
//
// READ-ONLY BY CONSTRUCTION. `readBoardState()` issues three GET/RPC reads and writes nothing: the
// `ses-305` board convention ("we cannot INSERT from a test -- no throwaway rows on the board")
// holds here for the same reason, since `backlog_items` is read live by the briefing page.

// The lane value `prime_directive_queue()` still uses for in-scope tickets. SES-340 kept the name
// on purpose -- a NAMED DEVIATION carried in docs/SELFBUILD-RETIREMENT-LEDGER.md -- so this is not
// a claim that the fence is still called Selfbuild.
export const IN_SCOPE_LANE = "selfbuild";

export const BOARD_STATES = Object.freeze(["servable", "held", "drained", "starved"]);

// Accept either the rows themselves or a count, because three of the five call sites already hold
// the array and two of them only ever had the number. Anything else is a programming error and
// throws rather than being coerced to 0 -- a silent 0 here would manufacture `drained`, which is
// the one state that turns a real finding green.
function count(v, name) {
  if (Array.isArray(v)) return v.length;
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
  throw new Error(
    `classifyBoard: \`${name}\` must be an array or a non-negative number, got ${
      v === null ? "null" : typeof v
    }. Coercing it would silently manufacture a 'drained' verdict out of a read that failed.`,
  );
}

// PURE. tests/regression/SES-401-drained-board-declaration.js asserts this directly, over fixtures
// for all four states plus a negative control for each.
//
// ORDER IS LOAD-BEARING. `servable` first: a non-empty lane is the answer regardless of what else
// is true. Then `held` before `drained`, because a ticket held by a live cycle is itself an open
// queued in-scope ticket, so a board that is `held` can never be `drained` and testing `drained`
// first would be unreachable-by-luck rather than by construction.
export function classifyBoard({ laneRows, executingOpen, heldByLive }) {
  const lane = count(laneRows, "laneRows");
  const open = count(executingOpen, "executingOpen");
  const held = count(heldByLive, "heldByLive");
  if (held > open) {
    throw new Error(
      `classifyBoard: heldByLive (${held}) exceeds executingOpen (${open}) -- held tickets are a ` +
        "SUBSET of the executing project's open queued tickets, so this pair cannot both be true " +
        "and the caller has joined two different populations",
    );
  }
  if (lane > 0) return "servable";
  if (held > 0) return "held";
  if (open === 0) return "drained";
  return "starved";
}

// PURE. The working join: a live cycle names the ticket it is building in `item_id`.
export function heldOnItemId(tickets, liveCycles) {
  const live = new Set((liveCycles ?? []).map(c => c && c.item_id).filter(Boolean).map(String));
  return (tickets ?? []).filter(t => live.has(String(t.backlog_id)));
}

// PURE, AND DEAD ON THE REAL BOARD BY DESIGN. This is SES-386's join, kept verbatim in shape so the
// SES-401 guard can MEASURE that it returns nothing on a fixture `heldOnItemId()` classifies
// `held`. Never call it from readBoardState(); it exists only as the control.
export function heldOnClaimedBy(tickets, liveCycles) {
  const live = new Set((liveCycles ?? []).map(c => c && c.id).filter(Boolean).map(String));
  return (tickets ?? []).filter(t => live.has(String(t.claimed_by)));
}

// PURE. The reason string every caller hands to notRun() or prints. It names the COUNTS rather than
// describing them, so a reader can tell `drained` from `held` without re-running anything.
export function boardReason(state, { lane, executingOpen, heldByLive, liveCycles, heldRefs }) {
  const refs = (heldRefs ?? []).slice(0, 5).join(", ");
  const more = (heldRefs ?? []).length > 5 ? ", …" : "";
  const counts =
    `lane '${IN_SCOPE_LANE}' returned ${lane} row(s); the executing project holds ${executingOpen} ` +
    `open/partial queued ticket(s); ${heldByLive} of them are held by one of ${liveCycles} live ` +
    "cycle(s) (runner_cycles.item_id, ended_at IS NULL)";
  switch (state) {
    case "servable":
      return `the board is SERVABLE -- ${counts}.`;
    case "held":
      return (
        `the board is HELD, not empty -- ${counts}${refs ? `: ${refs}${more}` : ""}. Under register ` +
        "B42 parallel cycles coordinate by atomic claims, so a contested claim withholding every " +
        "candidate is the design working, not a board with nothing on it. Re-run when no cycle " +
        "holds the queue."
      );
    case "drained":
      return (
        `the board is DRAINED -- ${counts}. The executing project has no open queued work left, so ` +
        "there is nothing for the lane to serve and nothing here to grade. That is the project " +
        "finishing, which is what it is for -- charter the next project, or set one to executing."
      );
    case "starved":
      return (
        `the board is STARVED -- ${counts}. In-scope work remains and nothing holds it, so this is ` +
        "the finding it always was and the caller's own assertion stands."
      );
    default:
      throw new Error(`boardReason: unknown state '${state}'`);
  }
}

// Three reads, no writes. `pg` is the caller's own PostgREST helper, signature
// `pg(url, key, pathAndQuery, init)` -- passed in rather than re-implemented so this module cannot
// become a second HTTP client that disagrees with the four that already exist.
//
// Content-Type is set explicitly on the RPC because two of the four callers' helpers do not add it
// by default, and PostgREST rejects a POST body without it.
export async function readBoardState(pg, url, key) {
  const queue = await pg(url, key, "rpc/prime_directive_queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const laneRows = (Array.isArray(queue) ? queue : []).filter(r => r && r.lane === IN_SCOPE_LANE);

  // The executing project's remaining pickable work, resolved through the epic's project rather
  // than through any name prefix -- SES-340's fence, read the way the database fences it.
  const executingOpen = await pg(
    url,
    key,
    "backlog_items?select=backlog_id,status,queue,claimed_by,epic_id," +
      "epics!inner(id,project_id,projects!inner(slug,status))" +
      "&epics.projects.status=eq.executing&status=in.(open,partial)&queue=not.is.null&limit=2000",
  );

  const liveCycles = await pg(url, key, "runner_cycles?select=id,item_id&ended_at=is.null&limit=1000");

  const held = heldOnItemId(executingOpen, liveCycles);
  const state = classifyBoard({
    laneRows,
    executingOpen: executingOpen.length,
    heldByLive: held.length,
  });

  return {
    state,
    reason: boardReason(state, {
      lane: laneRows.length,
      executingOpen: executingOpen.length,
      heldByLive: held.length,
      liveCycles: (liveCycles ?? []).length,
      heldRefs: held.map(t => t.backlog_id),
    }),
    laneRows,
    executingOpen,
    liveCycles: liveCycles ?? [],
    heldByLive: held,
    heldRefs: held.map(t => t.backlog_id),
  };
}

// The two states a caller DECLARES rather than fails on. Written as a function so a caller cannot
// spell the pair differently from its neighbour -- the copy-propagation this module exists to stop.
export function isDeclarable(state) {
  return state === "held" || state === "drained";
}
