// DeepBench v7.0.400 | tests/regression/ses-311-done-requires-verdict.test.mjs | SES-311
//
// FEATURE: SES-311 -- a Selfbuild ticket cannot be written `done` without a verifier verdict behind
// it, attended or unattended; the attended close-out gains the verifier step it never had.
//
// THE DEFECT, measured on the live board 2026-09-02 rather than recalled from the ticket: of the
// 112 Selfbuild-epic tickets at `status = 'done'`, **58 carried no `runner_verdicts` row at all** --
// among them four of the seven M5 *required* ships (SES-184, SES-269, SES-282, SES-303). Not one
// writer was buggy. The unattended path (docs/runbooks/runner-cycle.md step 7a) has run
// scripts/verifier.js on every ship since SES-181; the attended path (CLAUDE-DESIGN.md 5c ->
// docs/runbooks/session-setup.md step 4) ran tests, pushed, stamped the scoreboard and wrote `done`,
// and never invoked the verifier. And nothing refused it: `backlog_items` carried NO TRIGGERS AT ALL
// (pg_trigger read live at this ship -- zero non-internal rows). M6-07 makes the verdict the
// autonomy ladder's input (SES-122 routes it), so a ladder that never sees attended ships grades
// half the work.
//
// WHAT THIS FILE CAN AND CANNOT GUARD, stated up front because the split is the whole design:
//
//   * The REFUSAL lives in the database -- trigger `backlog_done_requires_verdict` on
//     `public.backlog_items`, migration `ses311_done_requires_verdict`. A permanent regression test
//     must never write the board to prove a trigger fires, so its body is DECLARED not-run here
//     (clause 4) and was measured at this ship inside a rolled-back DO block instead: seven
//     assertions, all PASS -- refused for a verdict-less Selfbuild ticket with SQLSTATE 23514 citing
//     SES-311; `delivered`/`partial`/`removed`/`open` all pass through; an `epic_id`-NULL row and a
//     non-Selfbuild-epic row both allowed; a `verdict='block'` row SATISFIES the gate (a block is
//     still a verdict); a `done -> done` no-op passes; and a multi-column in-place UPDATE --
//     `reverse_decision()`'s exact shape since ses286a_restore_in_place -- DOES fire it.
//
//   * The CALL SITE is a repo file, and that is what clauses 1 and 2 hold down. A trigger with no
//     runbook step in front of it does not fail closed in any useful sense: it turns every attended
//     close-out into a surprise `check_violation` at the last write of the session.
//
//   * The EFFECT is gradeable on real data, and clause 3 grades it -- forward only. Every Selfbuild
//     ticket that reaches `done` AFTER this migration must carry a verdict row. Tickets closed
//     BEFORE it are NOT retro-graded and this file never asserts they are: the trigger is
//     BEFORE UPDATE, the 58 pre-existing rows are untouched by construction, and back-filling them
//     is explicitly out of scope (SES-311 Section 7). The anchor is therefore the migration's own
//     timestamp, not "today".
//
// AND THE LIVE ARM'S QUERY SHAPE IS PROVEN TO DISCRIMINATE, not assumed to -- "would this still
// pass if the change did nothing?" has a real answer here. Run read-only at this ship with the
// anchor moved back to 2026-08-01 instead of the migration's timestamp, the identical three queries
// returned 112 Selfbuild `done` tickets of which **58 had no verdict row**, i.e. the assertion FIRES
// on real ungraded data. What is empty at this ship is the forward SET, not the check.
//
// WHY CLAUSE 3 IS NOT A FIXTURE WRITE. The first draft of this test PATCHed a fixture ticket over
// PostgREST to watch the trigger refuse it. That is a permanent test writing the live board on every
// CI run, and the board is the product. Reading the gate's *effect* off real ships costs nothing,
// cannot corrupt anything, and gets stronger every week instead of weaker.
//
// DRY-RUN AGAINST UNCHANGED SOURCE (recorded because a guard written after the change is worthless
// unless it would have failed before it): every clause was graded independently against
// origin/dev@885a8ce7's own copies of both files, and ALL SIX FAIL -- the five session-setup clauses
// because `### 3e.` does not exist there at all (`scripts/verifier.js`, `backlog_done_requires_verdict`
// and `verdict_ladder_signal(` each occurred ZERO times in that file), and the CLAUDE-DESIGN clause
// because 5c cites nothing. The CLAUDE-DESIGN clause is DECLARED not-run until the design session's
// own close-out commit lands Task 3 (that file is out of this coding session's scope by SES-311's
// Scope Rules); it becomes a hard assertion, with its two mutation controls, the moment the citation
// exists, and can never regress after. The live arm is NOT RUN without credentials, and with them it
// grades an empty set until the first post-migration Selfbuild `done` exists -- which it declares
// rather than counting as a pass.
//
// Invocation: node tests/regression/ses-311-done-requires-verdict.test.mjs
//   live arm:  node --env-file=.env.local tests/regression/ses-311-done-requires-verdict.test.mjs
//              (or export SUPABASE_URL / SUPABASE_SERVICE_KEY inline)

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SETUP = "docs/runbooks/session-setup.md";
const DESIGN = "CLAUDE-DESIGN.md";

// CRLF is normalised on read for one reason, stated so nobody "simplifies" it away: this repo
// checks out CRLF on Windows and LF in CI, and an index or substring test that disagrees between
// the two is a false green on one of them.
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// The migration's own recorded timestamp (supabase_migrations.schema_migrations version
// 20260902222548, read live at this ship). THE ANCHOR IS THIS, NOT `today`: a ticket closed earlier
// on the same day predates the trigger and is not retro-graded.
const SHIP_ANCHOR = "2026-09-02T22:25:48Z";

// Anchored on the heading the edit itself owns, so a clause can never pass on a string that happens
// to appear elsewhere in a 590-line runbook.
const STEP_3E = "### 3e. Run the verifier before you write `done`";
const STEP_4 = "### 4. Fetch, rebase, then push";

function slice(text, start, end) {
  const a = text.indexOf(start);
  if (a < 0) return null;
  const b = end ? text.indexOf(end, a) : -1;
  return text.slice(a, b < 0 ? text.length : b);
}

const step3e = s => slice(s, STEP_3E, STEP_4);

// CLAUDE-DESIGN.md's "All PASS" bullet in Step 5c -- the second home of the citation, written by the
// design session (SES-311 Task 3).
const design5c = s => slice(s, "### 5c", "### 5d") ?? slice(s, "### 5c", null);

// ---------------------------------------------------------------------------
// The clauses. Exported so a later reader (and the design session grading Task 3) can grade each
// one INDEPENDENTLY -- an assert-and-stop run only ever proves the first one failed.
// ---------------------------------------------------------------------------
export const CLAUSES = [
  {
    id: "session-setup-3e-names-the-verifier-and-the-trigger",
    file: SETUP,
    test: s => {
      const b = step3e(s);
      return !!b && b.includes("scripts/verifier.js") && b.includes("backlog_done_requires_verdict");
    },
    breaks: [
      s => s.split("scripts/verifier.js").join("the verification script"),
      s => s.split("backlog_done_requires_verdict").join("the done-gate trigger"),
      s => s.split(STEP_3E).join("### 3e. Optional: consider verifying"),
    ],
    detail:
      "step 3e must name BOTH the executable and the refusal. The executable alone reads as advice a " +
      "close-out under time pressure skips; the trigger's name alone leaves a session that hits " +
      "SQLSTATE 23514 at its last write with nothing to grep for. Naming both is what makes the step " +
      "load-bearing rather than ceremony.",
  },
  {
    id: "session-setup-3e-carries-all-three-exit-codes",
    file: SETUP,
    test: s => {
      const b = step3e(s);
      if (!b) return false;
      // 2 is the one that matters: an unrunnable verifier is the ABSENCE of a judgement, and the
      // failure mode this guards is a session reading it as either a pass or a block.
      return /\*\*0 = `approve`/.test(b) && /\*\*1 = `block`/.test(b) && /\*\*2 = the verifier could not run/.test(b);
    },
    breaks: [
      s => s.split("**2 = the verifier could not run").join("**2 = also a block"),
      s => s.split("**1 = `block`.**").join("**1 = try again.**"),
      s => s.split("**0 = `approve`.**").join("**0 = fine.**"),
    ],
    detail:
      "exit 2 is not exit 1. 1 is a judgement about the change (write `delivered` -- a block is a " +
      "verdict, not a wall); 2 is the absence of one, and the only correct response is to fix the " +
      "verifier, never to write `done` around it. A step that collapses them re-creates SES-301's " +
      "false block as a policy.",
  },
  {
    id: "session-setup-3e-feeds-the-ladder",
    file: SETUP,
    test: s => {
      const b = step3e(s);
      return !!b && b.includes("verdict_ladder_signal(");
    },
    breaks: [s => s.split("verdict_ladder_signal(").join("gradeTheVerdict(")],
    detail:
      "M6-07 makes the verdict the ladder's INPUT. A verdict row that nothing routes is a ledger " +
      "entry, not a signal -- the attended half of the corpus would still be ungraded, which is the " +
      "defect this ticket exists to close. runner-cycle.md step 7a carries the same call for the " +
      "unattended path.",
  },
  {
    id: "step-4-points-at-3e-before-the-scoreboard-stamp",
    file: SETUP,
    test: s => {
      const four = slice(s, STEP_4, null);
      if (!four) return false;
      const ptr = four.indexOf("`done` requires 3e's verdict (`SES-311`)");
      const stamp = four.indexOf("Then stamp the scoreboard");
      return ptr >= 0 && stamp >= 0 && ptr < stamp;
    },
    breaks: [
      s => s.split("**`done` requires 3e's verdict (`SES-311`).**").join(""),
      s => s.split("**`done` requires 3e's verdict (`SES-311`).**\n\n**Then stamp the scoreboard")
             .join("**Then stamp the scoreboard"),
    ],
    detail:
      "step 4 is where a close-out actually is when it writes the status, and the pointer has to be " +
      "ABOVE the scoreboard stamp -- below it, the first thing a session learns about 3e is the " +
      "exception it just raised. The ORDER is the guarantee; order is the one thing prose cannot " +
      "hold down on its own.",
  },
  {
    id: "session-setup-does-not-restate-the-exemptions",
    file: SETUP,
    test: s => {
      const b = step3e(s);
      // SES-311 Section 6: fail closed, ONE exception list, in the trigger. This clause asserts the
      // absence of a second home -- a runbook sentence must never be the only place, or a second
      // place, an exemption lives.
      return !!b && !/apply_data_restore|reverse_decision|ILIKE 'Selfbuild%'/.test(b);
    },
    breaks: [
      s => s.replace("The complete exemption list (non-Selfbuild epics",
                     "Exempt: anything apply_data_restore or reverse_decision writes, plus non-Selfbuild epics"),
    ],
    detail:
      "SES-311 Section 6: one exception list, held in the migration. Two homes for an exemption is " +
      "how the trigger stops being the answer -- the runbook copy drifts, a session trusts the " +
      "runbook, and the gate it thought it was exempt from refuses its write anyway.",
  },
];

// Task 3's clause. Held separately because CLAUDE-DESIGN.md is OUT OF SCOPE for the coding session
// that shipped this file (SES-311 Scope Rules: "written by the design session's own close-out
// commit, not this one"). It is graded HARD the moment the citation exists and is DECLARED not-run
// until then -- never quietly skipped, and never softened afterwards.
export const DESIGN_CLAUSE = {
  id: "claude-design-5c-cites-step-3e-and-SES-311",
  file: DESIGN,
  test: s => {
    const b = design5c(s);
    return !!b && b.includes("SES-311") && /step 3e/.test(b);
  },
  breaks: [
    s => s.split("SES-311").join("the done gate"),
    s => s.split("step 3e").join("the usual close-out"),
  ],
  detail:
    "5c's All PASS bullet is the line a design session reads at the instant it writes `done`. " +
    "session-setup 3e is the procedure; 5c is the only place the workflow doc points at it. Without " +
    "the citation the first thing a design session learns about the gate is the check_violation it " +
    "just raised.",
};

async function run(ctx = {}) {
  const results = [];

  for (const c of CLAUSES) {
    const s = read(c.file);
    assert.ok(c.test(s), `${c.file} lost clause "${c.id}": ${c.detail}`);

    assert.ok(c.breaks.length > 0, `clause "${c.id}" carries no control -- an unguarded clause is a claim`);
    c.breaks.forEach((mutate, i) => {
      const mutated = mutate(s);
      // The SES-158 meta-assertion, checked BEFORE the control itself: a mutation that changed
      // nothing would make the line below pass for the wrong reason forever.
      assert.notStrictEqual(mutated, s,
        `control ${i + 1} for "${c.id}" changed nothing -- it is grading the unmutated file`);
      assert.ok(!c.test(mutated),
        `control ${i + 1} for "${c.id}" still passes after its own mutation -- the clause is not testing what it says`);
    });
    results.push(c.id);
  }

  // --- Task 3, graded hard once it exists -------------------------------------------------------
  const design = read(DESIGN_CLAUSE.file);
  if (DESIGN_CLAUSE.test(design)) {
    DESIGN_CLAUSE.breaks.forEach((mutate, i) => {
      const mutated = mutate(design);
      assert.notStrictEqual(mutated, design,
        `control ${i + 1} for "${DESIGN_CLAUSE.id}" changed nothing -- it is grading the unmutated file`);
      assert.ok(!DESIGN_CLAUSE.test(mutated),
        `control ${i + 1} for "${DESIGN_CLAUSE.id}" still passes after its own mutation`);
    });
    results.push(DESIGN_CLAUSE.id);
  } else {
    notRun(
      "CLAUDE-DESIGN.md 5c's citation of session-setup step 3e (SES-311 Task 3)",
      "that file is written by the DESIGN session's own close-out commit and is out of scope for the " +
      "coding session that shipped this test (SES-311 Scope Rules). The required edit is: in Step " +
      "5c's All PASS bullet, after \"Set the ticket's `backlog_items.status` to `done`\", insert " +
      "\"— after running the verifier per `docs/runbooks/session-setup.md` step 3e (`SES-311`); the " +
      "write is refused without a verdict row\". This clause is graded HARD, with its own two " +
      "mutation controls, the moment that text exists -- so it cannot regress once added. " +
      `Reason it matters: ${DESIGN_CLAUSE.detail}`);
  }

  // --- Clause 3: the gate's EFFECT on real data, forward only -----------------------------------
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (every post-migration Selfbuild `done` carries a runner_verdicts row)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- runner_verdicts holds no anon/authenticated " +
      "grants, so this arm cannot run on the publishable key. Measured over the MCP at this ship " +
      `(${SHIP_ANCHOR}): 58 of 112 Selfbuild \`done\` tickets carried no verdict row, and ZERO ` +
      "Selfbuild tickets had reached `done` since the migration -- so with credentials this arm " +
      "would have passed over an empty set at the ship, which is stated rather than presented as " +
      "coverage. It gets stronger with every subsequent ship.");
    return results;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  // The body is read ONCE and only on the branch that needs it. Written this way deliberately:
  // `assert.ok(res.ok, \`… ${await res.text()}\`)` evaluates its message template on EVERY call, so
  // the happy path consumed the body and every read failed with "Body has already been read".
  // Found by running this arm live rather than by reading it.
  const get = async q => {
    const res = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!res.ok) assert.fail(`PostgREST ${res.status} on ${q}: ${await res.text()}`);
    return res.json();
  };

  const epics = await get("epics?select=id,name&name=ilike.Selfbuild*");
  assert.ok(Array.isArray(epics) && epics.length > 0,
    "no epic matches 'Selfbuild%' -- the trigger's own selector would match nothing, so the gate is " +
    "open on the whole board. Either the epics were renamed (fix the trigger in the same breath) or " +
    "this read is wrong.");
  results.push(`selfbuild-epics-exist(${epics.length})`);

  const ids = epics.map(e => e.id).join(",");
  const shipped = await get(
    `backlog_items?select=backlog_id,updated_at,epic_id&status=eq.done` +
    `&epic_id=in.(${ids})&updated_at=gte.${SHIP_ANCHOR}&order=updated_at.asc`);

  if (shipped.length === 0) {
    notRun(
      "the forward grade itself (no Selfbuild ticket has reached `done` since the migration yet)",
      `zero Selfbuild tickets carry status='done' with updated_at >= ${SHIP_ANCHOR}. The credential ` +
      "arm RAN and the set is genuinely empty -- an empty set is not evidence, so it is declared " +
      "rather than counted as a pass. Tickets closed BEFORE that anchor are deliberately not " +
      "retro-graded (the trigger is BEFORE UPDATE; back-filling is out of scope, SES-311 §7).");
    results.push("forward-grade-set-empty");
    return results;
  }

  const verdicts = await get(
    `runner_verdicts?select=backlog_id&backlog_id=in.(${shipped.map(r => r.backlog_id).join(",")})`);
  const graded = new Set(verdicts.map(v => v.backlog_id));
  const ungraded = shipped.filter(r => !graded.has(r.backlog_id)).map(r => `${r.backlog_id} (${r.updated_at})`);

  assert.deepStrictEqual(ungraded, [],
    `these Selfbuild tickets reached \`done\` after ${SHIP_ANCHOR} with NO runner_verdicts row: ` +
    `${ungraded.join(", ")}. The trigger backlog_done_requires_verdict should have refused every one ` +
    "of these writes, so either it was dropped, its epic selector no longer matches, or something " +
    "wrote the row with a path that bypasses BEFORE UPDATE triggers (a DELETE + INSERT -- which is " +
    "exactly apply_data_restore()'s shape). Read pg_trigger before assuming a data problem.");
  results.push(`forward-grade-clean(${shipped.length})`);

  // --- Clause 4: declared, permanently ----------------------------------------------------------
  notRun(
    "the trigger BODY (public.backlog_done_requires_verdict) and its exemption branches",
    "it lives in the database, not the tree, and a permanent regression test must never write the " +
    "live board to watch a trigger fire -- the board is the product. Measured instead at this ship " +
    "inside a single rolled-back DO block, seven assertions all PASS: refused with SQLSTATE 23514 " +
    "citing SES-311 for a verdict-less Selfbuild ticket; delivered/partial/removed/open pass " +
    "through; epic_id NULL allowed; non-Selfbuild epic allowed; verdict='block' SATISFIES the gate; " +
    "done->done no-op allowed; and reverse_decision()'s multi-column in-place UPDATE shape DOES " +
    "fire it. Clause 3 above grades the same mechanism's EFFECT on real ships instead.");

  return results;
}

selfRun(import.meta.url, run);
export default run;
