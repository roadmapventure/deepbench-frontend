// DeepBench v7.0.1094 | tests/regression/agt-582-defer-on-settle.test.mjs | AGT-582 -- SES-247
// BRANCH (c) GETS ITS WRITER, AND THIS FILE IS WHAT STOPS IT WRITING ON AN UNFLAGGED SETTLE.
//
// THE DEFECT, measured read-only 2026-11-20 on tree 81243c1 rather than recalled:
// `grep -c defer_status scripts/settle-ship.js` read 0. `docs/runbooks/runner-cycle.md:2402` rules
// branch (c) -- a `partial` whose remainder is not buildable for a NON-TICKET reason carries
// `defer_status = 'yes'` + `defer_reason`, which the pick excludes -- and nothing in the close-out
// wrote either cell, so 6 of 17 settled partials naming a non-ticket condition sat queued and
// re-pickable. `rpc/prime_directive_queue` returned `AGT-553` at pos 1 with an attended-only
// remainder.
//
// WHAT IS PINNED, and why each arm can go red:
//
// (a) THE NO-CHANGE CONTROL, and it is the load-bearing arm. The three cells every settle has
//     written since `SES-385` slice 2 must still be exactly three, in that order, when no flag is
//     given -- `ses-385b:140` and `agt-506:297` deep-equal the same shape from their own doors, so
//     a defer cell leaking onto an unflagged settle would move every close-out on the platform.
// (b) BLANK IS NOT A CONDITION. `--defer-reason=` and `--defer-reason="   "` reach `planSettle()`
//     as strings, and a whitespace condition that deferred the row would take a ticket out of the
//     pick with nothing in its own record saying why (`ses-385b`'s `--remainder=` lesson, same
//     shape). The trimmed value, never the raw one, is what is stored.
// (c) THE DECLARED CONDITION IS STORED VERBATIM -- no regex over prose decides this write
//     (AGT-128/AGT-634), so whatever the operator declared is what `defer_reason` reads.
// (d) `delivered` HAS NO REMAINDER TO DEFER, so the pair is refused rather than written. A
//     deferral beside a finished ship is two answers to one question.
// (e) THE FLAG IS REACHABLE. An `ALLOWED_FLAGS` set that lacks `defer-reason` makes the whole
//     feature a non-zero exit (`unknown flag --defer-reason=...`, which is what tree 81243c1 did),
//     and the anchor's eight flags must survive the append. `verdict` is asserted ABSENT: the
//     verdict is not an input to the status and never becomes one through a flag.
// (f) THE QUEUE CONSEQUENCE SHIPS WITH THE CELL (pattern:15). The pick reads `queue`, never the
//     flag, so a deferral that leaves a number behind is still pickable: `rpc/recompute_backlog_queue`
//     must sit AFTER the read-back loop inside `applySettle()`'s own slice -- after, because the
//     recompute has to read the cells the PATCH just proved it wrote.
// (g) EACH SOURCE ASSERTION IS PROVEN CAPABLE OF FAILING, by deleting the string it reads from a
//     copy of the slice. SES-158's lesson: a check that cannot fail is not a check.
//
// Pure and offline: no network, no board, no credentials. Source arms read the file off disk.
// Invocation: node tests/regression/agt-582-defer-on-settle.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { planSettle, ALLOWED_FLAGS } from "../../scripts/settle-ship.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT_REL = "scripts/settle-ship.js";

const THREE_CELLS = { status: "partial", design_status: null, kickoff_link: "k.md" };

// (e) the anchor's eight, before the append.
const ANCHOR_FLAGS = ["ticket", "kickoff", "cycle-id", "remainder", "apply", "resettle", "ship", "release"];

// (f) the two strings, in the order they must appear inside `applySettle()`'s slice.
const SLICE_FROM = "export async function applySettle({";
const SLICE_TO = "export async function fileNoVerdictCard({";
const AFTER_THIS = "for (const k of Object.keys(plan.patch)) {";
const RECOMPUTE = "rpc/recompute_backlog_queue";

async function run() {
  const results = [];

  // ---- (a) the no-change control: three cells, same order, no flag -------------------------
  const unflagged = planSettle({ id: "a", status: "open" }, "k.md", "partial").patch;
  assert.deepStrictEqual(unflagged, THREE_CELLS,
    "an unflagged settle must write EXACTLY the three cells it wrote before AGT-582 (status, cleared " +
    "design_status, kickoff_link) — ses-385b:140 and agt-506:297 deep-equal this same shape from their " +
    "own doors, so a defer cell leaking in here changes every close-out on the platform");
  assert.deepStrictEqual(Object.keys(unflagged), ["status", "design_status", "kickoff_link"],
    "the three keys must stay in their original order — the deep-equal above passes on a reordered " +
    "object, and the PATCH read-back loop in applySettle() iterates these keys");
  results.push("no-flag-writes-the-same-three-cells");

  // ---- (b) blank is not a condition; the stored value is trimmed ----------------------------
  assert.deepStrictEqual(planSettle({ id: "a", status: "open" }, "k.md", "partial", "   ").patch, THREE_CELLS,
    "a whitespace-only --defer-reason must defer NOTHING: it would take a ticket out of the pick with " +
    "nothing in its own record saying why");
  assert.deepStrictEqual(planSettle({ id: "a", status: "open" }, "k.md", "partial", "").patch, THREE_CELLS,
    "an empty --defer-reason= (a shell passing nothing) must defer nothing either");
  const padded = planSettle({ id: "a", status: "open" }, "k.md", "partial", "  x  ").patch;
  assert.deepStrictEqual(padded,
    { status: "partial", design_status: null, kickoff_link: "k.md", defer_status: "yes", defer_reason: "x" },
    "a real condition writes FIVE cells: the three plus defer_status `yes` and the TRIMMED reason");
  assert.strictEqual(Object.keys(padded).length, 5, "five keys, never a sixth nobody decided");
  results.push("blank-defers-nothing-and-the-stored-reason-is-trimmed");

  // ---- (c) the declared condition is stored verbatim ----------------------------------------
  const declared = planSettle({ id: "a", status: "open" }, "k.md", "partial", "a machine John has").patch;
  assert.strictEqual(declared.defer_status, "yes",
    "`yes` is the value the pick excludes (ck_backlog_defer_status admits no/maybe/yes/stuck)");
  assert.strictEqual(declared.defer_reason, "a machine John has",
    "the operator's declared condition is stored verbatim — no regex over prose decides this write (AGT-128/AGT-634)");
  results.push("the-declared-condition-is-stored-verbatim");

  // ---- (d) `delivered` has no remainder to defer --------------------------------------------
  assert.throws(() => planSettle({ id: "b", status: "partial" }, "k.md", "delivered", "x"),
    /has no remainder to defer/,
    "a `delivered` settle beside a --defer-reason must be REFUSED, not written: a deferral answers " +
    "branch (c) of the `partial` rule, so the pair is two answers to one question");
  results.push("delivered-plus-defer-is-refused");

  // ---- (e) the flag is reachable, and the eight survived ------------------------------------
  assert.ok(ALLOWED_FLAGS.has("defer-reason"),
    "ALLOWED_FLAGS must admit `defer-reason` — without it main() exits 2 on `unknown flag --defer-reason=...` " +
    "(measured on tree 81243c1) and the whole writer is unreachable from the command line");
  for (const f of ANCHOR_FLAGS) {
    assert.ok(ALLOWED_FLAGS.has(f), `ALLOWED_FLAGS lost \`${f}\` — the new flag is APPENDED, never a replacement`);
  }
  assert.strictEqual(ALLOWED_FLAGS.size, ANCHOR_FLAGS.length + 1,
    `ALLOWED_FLAGS holds ${ALLOWED_FLAGS.size} flags — expected the anchor's ${ANCHOR_FLAGS.length} plus defer-reason and nothing else`);
  assert.ok(!ALLOWED_FLAGS.has("verdict"),
    "no `--verdict` flag: the verdict is not an input to the status (decideStatus() takes none) and must not become one through a flag");
  results.push("the-flag-is-reachable-and-the-eight-survived");

  // ---- (f) the recompute sits after the read-back loop, inside applySettle() ----------------
  const src = fs.readFileSync(path.join(REPO, SCRIPT_REL), "utf8").replace(/\r\n/g, "\n");
  const from = src.indexOf(SLICE_FROM);
  const to = src.indexOf(SLICE_TO);
  assert.ok(from > -1 && to > from,
    `${SCRIPT_REL}: could not slice applySettle() between ${JSON.stringify(SLICE_FROM)} and ${JSON.stringify(SLICE_TO)} — the anchors moved`);
  const slice = src.slice(from, to);

  const assertOrder = (text, label) => {
    const loopAt = text.indexOf(AFTER_THIS);
    const recomputeAt = text.indexOf(RECOMPUTE);
    assert.ok(loopAt > -1, `${label}: applySettle()'s slice must still carry ${JSON.stringify(AFTER_THIS)} — the PATCH read-back loop`);
    assert.ok(recomputeAt > -1, `${label}: applySettle()'s slice must POST ${JSON.stringify(RECOMPUTE)} — a deferred row that keeps its queue number is still pickable (ses-305 arm 1)`);
    assert.ok(recomputeAt > loopAt,
      `${label}: ${JSON.stringify(RECOMPUTE)} is at ${recomputeAt}, which is NOT after the read-back loop at ${loopAt} — ` +
      "the recompute has to run on cells the PATCH already proved it wrote");
  };
  assertOrder(slice, SCRIPT_REL);
  results.push("recompute-runs-after-the-read-back-loop");

  // ---- (g) controls: each of (f)'s strings, deleted, must fail its own assertion ------------
  for (const needle of [AFTER_THIS, RECOMPUTE]) {
    const mutated = slice.split(needle).join("");
    assert.notStrictEqual(mutated, slice, `control: deleting ${JSON.stringify(needle)} changed nothing — the anchor is not what this test believes`);
    assert.throws(() => assertOrder(mutated, "control"), /assert|must|NOT after/i,
      `control: the order assertion still passes with ${JSON.stringify(needle)} deleted — it cannot fail, so it is not a check (SES-158)`);
  }
  results.push("source-arms-are-proven-capable-of-failing");

  console.log(`[AGT-582] branch (c) writer: planSettle 3 cells unflagged / 5 flagged (trimmed) · blank + empty defer nothing · ` +
    `\`delivered\` + defer refused · ALLOWED_FLAGS ${ALLOWED_FLAGS.size} = 8 anchor + defer-reason, no \`verdict\` · ` +
    `rpc/recompute_backlog_queue after the read-back loop in applySettle()'s slice, both anchors proven red when deleted`);
  return results;
}

selfRun(import.meta.url, run);
export default run;
