// DeepBench v7.0.980 | tests/regression/agt-506-ship-decision-in-settle.test.mjs | AGT-595
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
// AGT-595 -- the refusal's destination is imported beside the refusal's position: part (D).
import {
  planShip, recordShip, ALLOWED_FLAGS, planNoVerdict, planRelease, planSettle, decideStatus,
} from "../../scripts/settle-ship.js";
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
  assert.ok(runbook.includes("scripts/settle-ship.js --ship --apply` MAKES THIS CALL"),
    "step 7 must NAME the command that makes the call. The hand-typed SQL standing ALONE is the " +
    "defect this ticket opened on — 19 `delivered` tickets with an `approve` verdict and no ship " +
    "decision, because a model was asked to type a five-argument call at the end of a long cycle. " +
    "The block above keeps the SQL as the documented exit-2 fallback; this pins the pointer that " +
    "makes it the fallback rather than the instruction");
  // NO ASSERTION ON THE RUNBOOK'S SIZE BEYOND SES-336's CEILING, DELIBERATELY: ses-413d's
  // `BYTES_AT_SHIP` is the ONE home for the live size and it is already copied in agt-253 and
  // agt-525; a fourth copy here would make the next editor of this file pay for one more. The
  // ceiling is read-only arithmetic and belongs anywhere.
  const bytes = fs.statSync(RUNBOOK).size;
  assert.ok(bytes <= RUNBOOK_CEILING,
    `docs/runbooks/runner-cycle.md is ${bytes} B and SES-336's ceiling is ${RUNBOOK_CEILING} B — the ` +
    "step-7 paragraph this ship is about lives in the one governed file already at its bar");
}


// ---- (D) AGT-595: the refusal's DESTINATION, by value and by position -----------------------
//
// WHAT THIS ADDS, and why it is in THIS file rather than a new one. Part (C) above already pins
// WHERE the no-verdict refusal is decided; AGT-595 changed WHAT it does, and the two facts have to
// go red together or a later editor can keep the position and lose the destination (pattern:163 --
// one change, every home). On `origin/dev` `typeof planNoVerdict` was `undefined` and the refusal
// called `fail()`: exit 2, nothing written, the ticket left `open` with `design_status` still
// advertising a built design, and step 7 of the runbook carrying no branch for that exit at all.
//
// EVERY ASSERTION IS A VALUE OR A SOURCE INDEX. No network, no board, nothing to clean up.
function partD() {
  const row = { id: "x", backlog_id: "AGT-595", status: "open", design_status: null };
  const d = decideStatus({ kickoffText: "", ticketId: "AGT-595" });
  assert.strictEqual(d.status, "delivered",
    "the fixture has to BE the refusable case: an empty kickoff names no unbuilt work, so decideStatus() " +
    "says `delivered` and the verdict question is the only thing standing between it and the write");
  assert.strictEqual(d.reasons.length, 1, "the `delivered` branch carries exactly its one reason before anything is appended");

  // QA 1 -- the refused delivery settles `partial` and carries a card.
  const refused = planNoVerdict({ decided: d, row, ticket: "AGT-595", kickoffPath: "k.md", why: "W" });
  assert.strictEqual(refused.decided.status, "partial",
    "a `delivered` refused for want of a verdict settles `partial`, NOT `delivered` and NOT nothing at all: " +
    "`partial` keeps the row in ticket-owner.js's pick path (`[\"open\",\"partial\"]`) and names the work as unfinished");
  assert.strictEqual(refused.decided.reasons.at(-1), "W",
    "the refusal's own sentence is APPENDED to the decision's reasons, so the `ticket-status` decision row " +
    "records why the status moved — the earlier reasons are kept, not replaced");
  assert.deepStrictEqual(refused.plan.patch, { status: "partial", design_status: null, kickoff_link: "k.md" },
    "the same three cells as every other settle (planSettle() is CALLED, not re-implemented): a fourth key " +
    "here would be a cell nobody decided, and a missing `design_status` would leave a spent kickoff advertising a built design");
  assert.strictEqual(refused.card.kind, "gated_before_build",
    "the card is `gated_before_build` and NOT a new kind — `runner_items_kind_check` admits only that and " +
    "`ship`, and build-briefing.mjs renders §6 from that kind alone, so a new one files a card John never sees");
  assert.strictEqual(refused.card.backlog_id, "AGT-595",
    "the card names its ticket in `backlog_id`, the JOIN KEY — SES-116: composing a reference into it broke 63 of 80 card->ticket joins");
  assert.strictEqual(refused.card.epic_id, null,
    "`ck_runner_items_epic_id_review_only` admits an epic_id only on a card whose backlog_id is NULL; this card names a ticket, so the cell is NULL by rule");
  assert.strictEqual(refused.card.value_case, "W",
    "the refusal's sentence IS the card's value case — one home for the words, not a second paraphrase of them");
  for (const k of ["title", "plain_cant", "plain_after", "plain_worth"]) {
    assert.ok(typeof refused.card[k] === "string" && refused.card[k].trim() !== "",
      `the card's \`${k}\` must carry prose: §6 of the briefing renders these, and an empty one is a card ` +
      "John cannot act on — which is the same dead end as filing no card at all");
  }

  // QA 1 -- the release, all three answers.
  assert.strictEqual(planRelease(row, "C").action, "none",
    "an unclaimed ticket is `none`: there is nothing to release and a PATCH would write two cells that are already NULL");
  const rel = planRelease({ ...row, claimed_by: "C" }, "C");
  assert.strictEqual(rel.action, "release", "the holder's own cycle is the ONE case that releases");
  assert.deepStrictEqual(rel.patch, { claimed_by: null, claimed_at: null },
    "exactly the two coordination cells. `updated_at` is ABSENT (`SES-316`) — a release that stamped it would " +
    "make the decisions this cycle recorded un-restorable one statement after its own push, so this deep-equal " +
    "is the structural stop on a third key being added here");
  assert.ok(!("updated_at" in rel.patch), "stated the other way round too: no `updated_at` key, at all");
  const other = planRelease({ ...row, claimed_by: "OTHER" }, "C");
  assert.strictEqual(other.action, "none",
    "another holder is `none`, never `release`: the release is holder-guarded so a cycle whose 24h claim expired " +
    "and was re-taken can never clear its successor's (`SES-106`, John's `q-claim-release-order`)");
  assert.ok(other.reason.includes("OTHER"),
    `the reason must NAME the holder it declined to clear, or an operator cannot tell a guarded release from a broken one; got ${JSON.stringify(other.reason)}`);

  // QA 2 -- the other direction. A guard that only proves the new path fires proves nothing about
  // the old one surviving (the LOO-013 lesson: assert WHICH branch fired).
  assert.throws(() => planNoVerdict({ decided: { status: "partial", reasons: [] }, row, ticket: "AGT-595", kickoffPath: "k.md", why: "W" }),
    /only a `delivered` decision is refused/,
    "a `partial` decision must THROW here: it already names unbuilt work and records no ship decision, so " +
    "there is no verdict to want — accepting it would let this path re-settle a status nobody refused");
  assert.throws(() => planNoVerdict({ decided: d, row, ticket: "AGT-595", kickoffPath: "k.md", why: "" }),
    /cannot be empty|says nothing/,
    "an empty `why` must THROW: it is both the appended reason and the card's value case, so an empty one " +
    "files a card that says nothing and records a status change with no reason");
  assert.strictEqual(planSettle(row, "k.md", "delivered").patch.status, "delivered",
    "AND THE ORDINARY PATH IS UNTOUCHED: planSettle() still writes `delivered` when it is asked for one. " +
    "AGT-595 added a destination for the REFUSAL; it did not turn every delivery into a `partial`");

  // The call's POSITION, which is the half a later editor can undo while keeping every value above.
  const src = fs.readFileSync(SCRIPT, "utf8");
  const mainSrc = src.slice(src.indexOf("async function main()"));
  const guardAt = mainSrc.indexOf("if (!settleVerdict) {");
  const callAt = mainSrc.indexOf("planNoVerdict({");
  assert.ok(guardAt > 0, "main() must still hold the `if (!settleVerdict) {` guard — the refusal is decided on the absence of a verdict row and nothing else");
  assert.ok(callAt > guardAt && callAt > 0,
    "the planNoVerdict() call must sit INSIDE that guard. Outside it, every close-out on the platform would " +
    "settle `partial` and file a card — the refusal's destination applied to deliveries that were never refused");
  assert.ok(!/applyArg !== undefined && !settleVerdict/.test(mainSrc),
    "the OLD `applyArg !== undefined && !settleVerdict` form must be gone: gated on `--apply`, the dry run " +
    "printed a `delivered` plan the command would then refuse to write, which is the plan lying about itself");
  assert.ok(ALLOWED_FLAGS.has("release"),
    "`--release` must be an accepted flag — without it the command exits 2 with `unknown flag --release` and " +
    "the runbook's release instruction cannot be followed at all, which is where the hand-typed SQL came back from");
  assert.ok(/export async function fileNoVerdictCard/.test(src),
    "the card's WRITE half must exist in the script: planNoVerdict() decides a card and a decided card nobody files is the refusal with no destination again");
}

export default async function run() {
  partA();
  await partB();
  partC();
  partD();
}

selfRun(import.meta.url, run);
