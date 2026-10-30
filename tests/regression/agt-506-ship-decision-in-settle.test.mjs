// DeepBench v7.0.924 | tests/regression/agt-506-ship-decision-in-settle.test.mjs | AGT-506
//
// THE SHIP DECISION IS RECORDED BY CODE, AND A `delivered` STATUS IS REFUSED WITHOUT ITS VERDICT.
//
// WHAT THIS GUARDS, measured on tree 3a42e3f before the change rather than recalled:
// `grep -c rpc/record_ship_decision scripts/settle-ship.js` read **0**, the only code callers of
// `record_ship_decision()` were the two RE-GRADE paths, and **19** `delivered` tickets held an
// `approve` verdict with no `kind = 'ship'` decision at all -- 19 accepted deliveries with no
// Reverse handle, on a platform where `reverse_decision()` is the only demote the ladder has. The
// single writer of a FORWARD ship decision was PROSE: a SQL block in `runner-cycle.md` step 7 that
// a model was asked to type at the end of a long cycle.
//
// WHY THE ASSERTIONS ARE SHAPED THIS WAY. A guard that only checked "the file mentions
// record_ship_decision" passes against a build that mentions it in a comment and never calls it, and
// a guard that only ran the live command would grade the live board rather than the change
// (pattern:162). So part (A) decides every branch BY VALUE with no network at all, part (B) proves
// the write-vs-no-write split by counting POSTs against a stubbed transport -- the only branch that
// may POST is `record`, and the three that must not are asserted at zero rather than assumed -- and
// part (C) pins the three textual facts a later editor can silently undo: the call in the script,
// the flag in `ALLOWED_FLAGS` (and the continued ABSENCE of `--verdict`, because the verdict is
// still not an input to the STATUS), and the runbook pointing at the command while KEEPING the
// "at the foot of the close-out" ordering that forbids moving the call beside the status write.
//
// THE KICKOFF'S THIRD TASK IS NOT IN THIS TREE, AND THIS IS WHERE THE NEXT SESSION FINDS OUT WHY.
// AGT-506 task 3 asked step 7 of `docs/runbooks/runner-cycle.md` to point at `--ship --apply`
// (declared target 380993 B, net +73). Measured on this tree instead of assumed, that edit is a
// FOUR-file change against a 3-file cap, and it goes red four separate ways:
//   1. ses-413d's `export const BYTES_AT_SHIP = 380920` is an EQUALITY pin on the live size, read
//      by agt-133, agt-136 and agt-138 -- and copied again as `BYTES_AT_SHIP` in agt-253 and
//      `RUNBOOK_BYTES` in agt-525, so moving it costs three test files.
//   2. agt-138's `assert.ok(bytes < PRE_CHANGE_BYTES)` with `PRE_CHANGE_BYTES = 380980` caps the
//      file at 380979 B whatever SES-336's 381000 ceiling says: +73 is unbuildable at ANY file
//      count without re-ruling a ratchet whose own words are "never raise the CEILING to fit an edit".
//   3. SES-377 couples the file to its generated view: `docs/runbooks/cycle-card.md` carries the
//      runbook's sha256 in its header, so ANY byte change -- even a byte-NEUTRAL one -- makes the
//      card stale and reds agt-133, agt-138 and agt-171 until
//      `node scripts/render-cycle-card.js --write` lands in the SAME commit. That is the fourth file.
//   4. Headroom is 59 B (380920 of agt-138's 380980). A byte-neutral rewrite WAS measured and ran
//      green on the pins -- the second replacement frees 67 B, so a 67 B pointer fits -- and it
//      still needs the re-rendered card, so it still breaks the cap.
// So the mechanism ships here and the pointer does not. Until it lands, the runbook's SQL block is
// still the instruction a cycle follows by hand, and `--ship --apply` does the same call correctly.
// The squeeze itself is already filed: AGT-558 (no cleaner), AGT-288 (two ceilings, one governor),
// AGT-537 (the cap side). pattern:92, pattern:96.
//
// WRITES NOTHING. Every assertion here is a value, a stub, or a file read; there is no credentialed
// half and nothing to clean up (pattern:76).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { planShip, recordShip, ALLOWED_FLAGS } from "../../scripts/settle-ship.js";
// The five argument names come from SES-315's own guard rather than a second list here: that file
// resolves `record_ship_decision()` live by these names, so a signature change breaks ONE home.
import { SHIP_ARGS } from "./ses-315-ship-reverse.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "settle-ship.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "runner-cycle.md");
const RUNBOOK_CEILING = 381000;   // SES-336's ceiling on this file

const SHA = "a".repeat(40);
const VERDICT = { id: "11111111-1111-4111-8111-111111111111", verdict: "approve", graded_sha: SHA, version: "v7.0.924" };
const CYCLE = { id: "22222222-2222-4222-8222-222222222222", push_sha: SHA };

// ---- (A) every branch, by value, no network -------------------------------------------------
function partA() {
  const record = planShip({ status: "delivered", ticket: "AGT-506", verdict: VERDICT, cycleRow: CYCLE, existing: null });
  assert.strictEqual(record.action, "record",
    "a `delivered` ticket with an `approve` verdict whose graded_sha IS the cycle's push_sha is the " +
    "one case that records a handle — if this is not `record`, no ship on the platform ever gets one");
  assert.deepStrictEqual(Object.keys(record.args), [...SHIP_ARGS],
    "the five argument names, in SES-315's own order: PostgREST resolves `record_ship_decision` by " +
    `argument NAME, so a sixth key or a renamed one is an unresolvable call that returns empty rather than erroring. Got ${JSON.stringify(Object.keys(record.args))}`);
  assert.deepStrictEqual(record.args, {
    p_cycle_id: CYCLE.id, p_backlog_id: "AGT-506", p_version: VERDICT.version,
    p_push_sha: SHA, p_verdict_id: VERDICT.id,
  }, "the values are read off the cycle row and the verdict, never off the command line — the sha " +
     "is the CYCLE's pushed sha and the version is the VERDICT's (SES-345: never pass the sha through)");

  // `skip` -- the STOP LINE's own carve-out: a `partial` settle records no ship decision.
  for (const status of ["partial", "open", "in_progress", "done", "", null, undefined]) {
    const p = planShip({ status, ticket: "AGT-506", verdict: VERDICT, cycleRow: CYCLE });
    assert.strictEqual(p.action, "skip",
      `a ticket reading ${JSON.stringify(status)} must \`skip\` — only a \`delivered\` ticket has an ` +
      "accepted delivery to hand a Reverse for, and a `partial` names unbuilt work");
    assert.ok(!("args" in p), "a `skip` plan carries no args — there is nothing to call with");
  }

  // `done` -- the ledger is asked instead of trusting the runbook's idempotence sentence.
  const done = planShip({
    status: "delivered", ticket: "AGT-506", verdict: VERDICT, cycleRow: CYCLE,
    existing: { id: "33333333-3333-4333-8333-333333333333" },
  });
  assert.strictEqual(done.action, "done", "an existing ship decision on this (cycle, ticket) is `done`");
  assert.strictEqual(done.id, "33333333-3333-4333-8333-333333333333",
    "the `done` plan carries the EXISTING id, because that id is what the operator has to be handed — " +
    "a second decision would adopt no before-images (the sweep is `decision_id IS NULL`) and report a " +
    "Reverse that restores nothing");
  assert.ok(!("args" in done), "a `done` plan carries no args");

  // `refuse` -- no verdict at all. The verdict id is an ARGUMENT, so this is a mistake, not a state.
  for (const verdict of [null, undefined, {}, { verdict: "approve" }, { id: "" }]) {
    const p = planShip({ status: "delivered", ticket: "AGT-506", verdict, cycleRow: CYCLE });
    assert.strictEqual(p.action, "refuse",
      `a verdict of ${JSON.stringify(verdict)} must \`refuse\` — record_ship_decision() takes the ` +
      "verdict id as an argument, so there is nothing to attach the handle to");
  }

  // `none` -- a block is not a mistake, it is SES-402/403's subject, and it writes nothing.
  for (const v of ["block", "rework", "needs-desktop", "partial"]) {
    const p = planShip({ status: "delivered", ticket: "AGT-506", verdict: { ...VERDICT, verdict: v }, cycleRow: CYCLE });
    assert.strictEqual(p.action, "none",
      `a \`${v}\` verdict must read \`none\`, never \`record\` — a ship decision is the handle on an ` +
      "ACCEPTED delivery and the function itself raises on anything but `approve`");
    assert.ok(/approve/.test(p.reason), `the reason must name the gate it failed; got ${JSON.stringify(p.reason)}`);
  }

  // `refuse` -- the sha pair, BOTH directions of SES-345.
  const noSha = planShip({ status: "delivered", ticket: "AGT-506", verdict: VERDICT, cycleRow: { id: CYCLE.id, push_sha: null } });
  assert.strictEqual(noSha.action, "refuse",
    "a cycle row with no `push_sha` must refuse — before the push has landed there is no sha to pass");
  const mismatch = planShip({ status: "delivered", ticket: "AGT-506", verdict: VERDICT, cycleRow: { id: CYCLE.id, push_sha: "b".repeat(40) } });
  assert.strictEqual(mismatch.action, "refuse",
    "a push_sha that is not the verdict's graded_sha must refuse: the tree graded is not the tree " +
    "pushed, and recording that pair hands out a Reverse for a tree nobody graded (SES-345)");
  assert.ok(/graded_sha/.test(mismatch.reason), "the mismatch reason must name graded_sha");

  // THE ORDER OF THE BRANCHES IS ITSELF LOAD-BEARING: an existing decision outranks a bad verdict,
  // so a cycle whose handle is already recorded is never re-reported as a refusal an operator chases.
  const doneOverBad = planShip({
    status: "delivered", ticket: "AGT-506", verdict: null, cycleRow: { id: CYCLE.id, push_sha: null },
    existing: { id: "33333333-3333-4333-8333-333333333333" },
  });
  assert.strictEqual(doneOverBad.action, "done",
    "`done` is decided before the verdict and sha checks — an already-recorded handle is the answer, " +
    "not a refusal to investigate");

  for (const p of [record, done, noSha, mismatch]) {
    assert.ok(typeof p.reason === "string" && p.reason.trim() !== "",
      "every plan carries a `reason`: a line that wrote nothing is useless unless it says WHICH nothing");
  }
}

// ---- (B) the transport: only `record` may POST ------------------------------------------------
async function partB() {
  const ID = "44444444-4444-4444-8444-444444444444";
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET", body: init.body ?? null });
    return { ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify(ID) };
  };
  try {
    const plan = planShip({ status: "delivered", ticket: "AGT-506", verdict: VERDICT, cycleRow: CYCLE });
    const out = await recordShip({ base: "https://example.invalid", key: "unused", plan, log: () => {} });
    assert.strictEqual(out.recorded, ID, "recordShip must return the id the RPC answered with");
    const posts = calls.filter(c => c.method === "POST");
    assert.strictEqual(posts.length, 1,
      `a \`record\` plan makes EXACTLY ONE write; got ${posts.length}: ${JSON.stringify(posts.map(p => p.url))}`);
    assert.ok(posts[0].url.endsWith("/rpc/record_ship_decision"),
      `the one POST must be the ship RPC and no other ledger writer; got ${posts[0].url}`);
    assert.deepStrictEqual(Object.keys(JSON.parse(posts[0].body)), [...SHIP_ARGS],
      "the POSTed body is exactly the five named arguments");

    // The three non-writing actions, each against a fresh call log. ZERO is the assertion.
    for (const [label, plan2] of [
      ["done", planShip({ status: "delivered", ticket: "AGT-506", verdict: VERDICT, cycleRow: CYCLE, existing: { id: ID } })],
      ["none", planShip({ status: "delivered", ticket: "AGT-506", verdict: { ...VERDICT, verdict: "block" }, cycleRow: CYCLE })],
      ["skip", planShip({ status: "partial", ticket: "AGT-506", verdict: VERDICT, cycleRow: CYCLE })],
    ]) {
      calls.length = 0;
      const lines = [];
      const res = await recordShip({ base: "https://example.invalid", key: "unused", plan: plan2, log: s => lines.push(s) });
      assert.strictEqual(plan2.action, label, `fixture mismatch: expected a \`${label}\` plan`);
      assert.strictEqual(calls.length, 0,
        `a \`${label}\` plan must touch the transport ZERO times — it is the no-write half of this ` +
        `ship and a POST here writes a ledger row nobody decided. Got ${JSON.stringify(calls)}`);
      assert.strictEqual(res.recorded, null, `a \`${label}\` plan records nothing`);
      assert.ok(lines.join("").trim() !== "", `a \`${label}\` plan still REPORTS itself — a silent no-write is indistinguishable from a skipped step`);
    }
    // `done` reports the id a reader needs, in the words the runbook's reader is told to expect.
    const lines = [];
    await recordShip({
      base: "https://example.invalid", key: "unused", log: s => lines.push(s),
      plan: planShip({ status: "delivered", ticket: "AGT-506", verdict: VERDICT, cycleRow: CYCLE, existing: { id: ID } }),
    });
    assert.ok(lines.join("").includes(`already recorded ${ID}`),
      `a second run must print \`already recorded <id>\`; got ${JSON.stringify(lines)}`);

    // A non-id answer is a FAILURE, never a logged success: `rest()` returning something else means
    // the RPC did not resolve, which is exactly the overload break .claude/rules warns about.
    globalThis.fetch = async () => ({ ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify(null) });
    await assert.rejects(
      () => recordShip({
        base: "https://example.invalid", key: "unused", log: () => {},
        plan: planShip({ status: "delivered", ticket: "AGT-506", verdict: VERDICT, cycleRow: CYCLE }),
      }),
      /not a decision id/,
      "an answer that is not a 36-character id must throw — PostgREST answers 200 with an empty body " +
      "when it cannot resolve the overload, and logging that as a recorded ship is the false green");
  } finally {
    globalThis.fetch = real;
  }
}

// ---- (C) the three textual facts a later editor can silently undo ----------------------------
function partC() {
  const src = fs.readFileSync(SCRIPT, "utf8");
  assert.ok(src.includes("rpc/record_ship_decision"),
    "scripts/settle-ship.js must CALL the RPC. This string read 0 occurrences on origin/dev, which " +
    "is the whole defect: the only writer of a forward ship decision was prose in the runbook");
  assert.ok(ALLOWED_FLAGS.has("ship"),
    "`--ship` must be an accepted flag — without it the command exits 2 with `unknown flag --ship` " +
    "and the runbook's instruction cannot be followed at all");
  for (const f of ["ticket", "kickoff", "cycle-id", "remainder", "apply", "resettle"]) {
    assert.ok(ALLOWED_FLAGS.has(f), `--${f} must survive this ship — a third door may not narrow the first two`);
  }
  assert.ok(!ALLOWED_FLAGS.has("verdict"),
    "there is still NO `--verdict` flag. The verdict is an input to the ship DECISION, never to the " +
    "STATUS (decideStatus() has no verdict parameter), and a flag here would re-open exactly that " +
    "confusion — ses-385b-settle-ship.test.mjs pins the same absence from the other side");

  // The precondition's ORDERING, which is the half of the ticket that lives in the settle path: the
  // refusal must raise BEFORE applySettle(), or it refuses after the row has already moved.
  // Scoped to main() on purpose: `resettleTicket()` calls applySettle() too, and comparing against
  // ITS call site would compare the refusal to the wrong write and pass for the wrong reason.
  const mainAt = src.indexOf("async function main()");
  assert.ok(mainAt > 0, "main() must still exist in scripts/settle-ship.js");
  const mainSrc = src.slice(mainAt);
  const failAt = mainSrc.indexOf("needs the verdict its ship decision attaches to");
  const applyAt = mainSrc.indexOf("await applySettle({");
  assert.ok(failAt > 0, "the `delivered` precondition's refusal must exist in main()");
  assert.ok(applyAt > 0, "main() must still call applySettle()");
  assert.ok(failAt < applyAt,
    "the no-verdict refusal must sit BEFORE the applySettle() call. After it, the decision row, the " +
    "before-image and the PATCH have already happened and the refusal is a report rather than a gate");

  const runbook = fs.readFileSync(RUNBOOK, "utf8");
  assert.ok(runbook.includes("SELECT public.record_ship_decision("),
    "the runbook keeps the SQL block: the by-hand form stays the documented fallback for the " +
    "command's exit 2, and SES-315's own clause pins this string");
  assert.ok(runbook.includes("IT GOES HERE, AT THE FOOT OF THE CLOSE-OUT"),
    "the ordering block MUST survive. The ticket asked for the call 'in the same statement as the " +
    "delivered status'; that is refused here and in §2 of the kickoff, because the adoption sweep " +
    "(`decision_id IS NULL`) and reverse_decision()'s written-since guard both depend on the call " +
    "coming LAST — ses-315-ship-reverse.test.mjs break-mutates this very line");
  // NO ASSERTION ON THE RUNBOOK'S SIZE BEYOND SES-336's CEILING, DELIBERATELY: ses-413d's
  // `BYTES_AT_SHIP` is the ONE home for the live size and it is already copied in agt-253 and
  // agt-525; a fourth copy here would make the next editor of this file pay for one more. The
  // ceiling is read-only arithmetic and belongs anywhere.
  const bytes = fs.statSync(RUNBOOK).size;
  assert.ok(bytes <= RUNBOOK_CEILING,
    `docs/runbooks/runner-cycle.md is ${bytes} B and SES-336's ceiling is ${RUNBOOK_CEILING} B — the ` +
    "step-7 paragraph this ship is about lives in the one governed file already at its bar");
}

export default async function run() {
  partA();
  await partB();
  partC();
}

selfRun(import.meta.url, run);
