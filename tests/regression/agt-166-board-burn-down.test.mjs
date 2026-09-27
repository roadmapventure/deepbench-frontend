// DeepBench v7.0.643 | tests/regression/agt-166-board-burn-down.test.mjs | AGT-166 slices 1-2 --
// SLICE 2 (v7.0.643) ADDS THREE ARMS, keeping (A)-(D) as they shipped:
//
// (A2) THE SAME PAGING FIX, IN scripts/ticket-owner.js, with its own mutation control. Slice 1 paged
//      audit-board.js and left this script's identical `&limit=5000` single-request read live.
//      Measured 2026-09-27 on this tree: `ticket-owner.js --census` read 1,000 rows of a 1,019-row
//      board and printed `revalidation 420 left` where SQL counts 438 — 19 rows it never read. That
//      is not a cosmetic under-count: AGT-166's close condition is mechanical (`revalidation 0 left`),
//      so the drain would have closed the ticket on a false zero with 19 premises unexamined. After
//      the fix the number goes UP, 420 -> 438 and 1,000 -> 1,019 rows, the same discriminator shape
//      slice 1 used for 497 -> 546. Both scripts are now graded by ONE judgement over both sources.
//
// (E)  A CONFIRMED PREMISE IS A ROW PATCH AND NEVER A LEDGER ROW, by value with two mutation
//      controls. `ticket_owner_findings` already holds 259 open rows over 10 slugs with nothing
//      ruling them (AGT-169), so a drain that filed one finding per judged premise would add 438
//      more to a pile no reviewer reads. `planWrites` must route the confirmed `unrevalidated-30d`
//      fix into `fixes` with `revalidated_at` alone, and into `ledger.insert` never — and deleting
//      that `fix` in memory, or degrading it to a judgment, must make the SAME judgement throw.
//
// (F)  LIVE, read-only: the §2.2 population by `Prefer: count=exact`, the same number the census
//      reports, and PROVABLY UNCHANGED after the whole two-pass merge runs with the writer removed
//      (`--judge --answer --dry-run`). A dry run that moved a single row would be a write nobody
//      attributed.
//
// AGT-166 slice 1 --
// THE BOARD HAS NO HOMELESS OPEN ROWS, THE AUDIT CAN SEE THE WHOLE BOARD, AND A CLOSE OVER A
// STANDING BLOCK IS LEGAL ONLY WHEN RATIFIED.
//
// THE DEFECT, measured 2026-09-27 on this tree rather than recalled. Three numbers disagreed with
// each other and one of them was a lie. SQL counted 546 open/partial `backlog_items` rows with
// `epic_id` NULL; `node scripts/audit-board.js` printed 497. The board is 1,077 rows, and every
// read in that script went out as ONE request carrying `&limit=5000` -- but PostgREST caps EVERY
// response at its own max-rows (1,000 here) and reports the cap only in `Content-Range`, so the
// script received 1,000 rows, no error, and a census short by 77 rows it never knew it had not
// read. `readAll`'s truncation guard could not fire: it compared the 1,000 rows it got against the
// 5,000 it asked for. The under-count was silent in BOTH directions -- 394 stale where SQL said
// 441, 497 homeless where SQL said 546 -- so the audit's weekly census was wrong and no arm of it
// said so.
//
// WHAT IS PINNED, and how each arm goes red:
//
// (A) THE PAGING FIX, BY SOURCE, WITH A MUTATION CONTROL. `readAll` must send a `Range:` header and
//     must NOT build a bare `&limit=${limit}` query string. Pinning both halves is the point: a
//     script that added Range paging and LEFT the old `&limit=5000` on the first page would page
//     correctly and still cap at PostgREST's max-rows on every request. The SES-158-style control
//     deletes the Range clause from the source text in memory and requires the same judgement to
//     THROW -- a green that cannot be turned red is not evidence.
//
// (B) THE RATIFIED PREDICATE, BY VALUE, on hand-built rows -- no network, no disk, no env. It is
//     the same predicate the trigger `backlog_done_requires_verdict` enforces at write time, and
//     both sides of it are asserted: a later non-reversed ship/ticket-status decision or an accepted
//     ship card RATIFIES (no finding); a later decision of another kind, a reversed one, and one
//     dated BEFORE the block do not (finding). tests/regression/agt-86d-board-checks.test.mjs holds
//     the same arm on checkClosedRed's findings; this file holds it on `ratifiedAt` itself, because
//     the date comparison is where a plausible implementation goes wrong.
//
// (C) LIVE (Supabase credentials, else NOT RUN), READ-ONLY BY CONSTRUCTION -- every call is a GET or
//     a HEAD. `Prefer: count=exact` over `backlog_items?status=in.(open,partial)&epic_id=is.null`
//     must read 0; the CLI run to a temp `--out` must print `board-no-home: 0` AND
//     `quality-closed-red: 0` and must have read 1,077 items or more; and the `backlog-intake`
//     project must still be `planned`, which is what keeps 546 newly-homed rows unpickable
//     (`prime_directive_queue()` admits through `epic_project_executing()` only -- 37 rows before
//     the migration and 37 after).
//
// (D) THE TRIGGER BODY IS DECLARED NOT-RUN, permanently, for the reason SES-311's own file gives:
//     it lives in the database, not the tree, and a suite test must never write the live board to
//     watch a trigger fire (pattern:76). Its numbers were measured at this ship inside rolled-back
//     DO blocks and are recorded in the declaration.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { checkClosedRed, ratifiedAt, PAGE_ROWS } from "../../scripts/audit-board.js";
import {
  classifyBoard, planWrites, selectRevalidationBatch, REVALIDATION_CHECK, UNREVALIDATED_BATCH,
  UNREVALIDATED_DAYS, PAGE_ROWS as OWNER_PAGE_ROWS, chicagoDay,
} from "../../scripts/ticket-owner.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "audit-board.js");
const OWNER_SCRIPT = path.join(ROOT, "scripts", "ticket-owner.js");
const BOARD_ROWS_AT_SHIP = 1077; // 2026-09-27; the arm asserts >= this, never == it
const NOW = "2026-09-27T12:00:00Z";
const DAY = 24 * 3600 * 1000;
const daysAgo = d => new Date(Date.parse(NOW) - d * DAY).toISOString();

// (A)'s judgement, factored out so the mutation control can run the SAME code over a mutant.
function assertReadAllPages(src) {
  const body = src.slice(src.indexOf("async function readAll("));
  const readAll = body.slice(0, body.indexOf("\n}") + 2);
  assert.match(readAll, /Range: `\$\{from\}-\$\{from \+ PAGE_ROWS - 1\}`/,
    "readAll must page with a Range: <from>-<to> header -- PostgREST caps every response at its " +
    "max-rows and says so only in Content-Range, so a single request cannot read a 1,077-row board");
  assert.doesNotMatch(readAll, /&limit=\$\{limit\}/,
    "readAll must not send the ceiling as a query limit: a paged read that still carries " +
    "&limit=5000 caps at max-rows on every page, which is the AGT-166 under-count unchanged");
}

// (A2)'s judgement: the same two limbs, plus the runtime refusal that makes the second limb
// structurally impossible rather than merely absent. Factored out so the mutation control runs the
// SAME code over a mutant.
function assertOwnerReadAllPages(src) {
  const body = src.slice(src.indexOf("async function readAll("));
  const readAll = body.slice(0, body.indexOf("\n}") + 2);
  assert.match(readAll, /Range: `\$\{from\}-\$\{from \+ PAGE_ROWS - 1\}`/,
    "ticket-owner.js's readAll must page with a Range: <from>-<to> header — PostgREST caps every " +
    "response at max-rows and says so only in Content-Range, so one request cannot read a 1,019-row board");
  assert.doesNotMatch(readAll, /&limit=\$\{limit\}/,
    "readAll must not send the ceiling as a query limit: a paged read still carrying &limit=5000 " +
    "caps at max-rows on every page, which is the under-count unchanged");
  assert.match(readAll, /\[\?&\]limit=/,
    "readAll must REFUSE a query that carries its own limit= — that clause is what hid 19 rows, and " +
    "a rule enforced at runtime cannot be re-introduced one read at a time");
  assert.match(readAll, /\[\?&\]order=/,
    "readAll must refuse a paged read with no order= — an unordered page boundary may repeat or skip a row");
}

async function run() {
  const results = [];

  // --- (A) the paging fix, by source, with its control ------------------------------------------
  const src = fs.readFileSync(SCRIPT, "utf8");
  assertReadAllPages(src);
  assert.equal(PAGE_ROWS, 1000, "the page size must be the project's PostgREST max-rows");
  assert.match(src, /order=/, "every paged read needs a stable order -- an unordered page boundary may repeat or skip a row");
  {
    // The mutant leaves a WELL-FORMED readAll behind: the Range header becomes a plain limit again,
    // which is exactly the pre-AGT-166 shape. A mutant that merely failed to parse would throw too,
    // and a control that cannot tell "the fix is gone" from "I broke the file" proves nothing.
    const anchor = '{ "Range-Unit": "items", Range: `${from}-${from + PAGE_ROWS - 1}` }';
    assert.ok(src.includes(anchor), "the control's anchor no longer matches readAll, so it would grade a mutant identical to the original");
    const mutant = src.replace(anchor, "undefined").replace("const page = await get(base, key, q,", "const page = await get(base, key, `${q}&limit=${limit}`,");
    let controlError = null;
    try { assertReadAllPages(mutant); } catch (e) { controlError = e; }
    assert.ok(controlError, "CONTROL: with Range deleted and &limit=${limit} restored, the paging judgement must fail");
    assert.match(controlError.message, /Range:/);
    results.push("paging-source+control");
  }

  // --- (A2) the SAME fix in ticket-owner.js, the script that now owns the drain ------------------
  const ownerSrc = fs.readFileSync(OWNER_SCRIPT, "utf8");
  assertOwnerReadAllPages(ownerSrc);
  assert.equal(OWNER_PAGE_ROWS, 1000, "both scripts must page at the project's PostgREST max-rows");
  assert.equal(OWNER_PAGE_ROWS, PAGE_ROWS, "one page size, two scripts — a second number would drift");
  {
    // Every read readAll drives must carry an order=; a query that does not is refused at runtime,
    // but a source that stopped writing them would refuse the census instead of paging it, so the
    // clauses are pinned here as well.
    const reads = [...ownerSrc.matchAll(/readAll\(base, key, "[^"]+",\s*([\s\S]{0,400}?)\)\s*;/g)].map(m => m[1]);
    assert.ok(reads.length >= 8, `expected every board read to go through readAll; found ${reads.length}`);
    for (const q of reads) {
      assert.ok(/order=/.test(q), `a paged read has no order= clause: ${q.slice(0, 120)}`);
      assert.ok(!/&limit=\d/.test(q), `a paged read still carries its own limit=: ${q.slice(0, 120)}`);
    }
    // THE CONTROL, the same shape as (A)'s: the mutant is a WELL-FORMED pre-slice-2 readAll — Range
    // gone, the ceiling back on the query string — and the judgement must fail on it. A control that
    // cannot tell "the fix is gone" from "I broke the file" proves nothing.
    const anchor = '{ "Range-Unit": "items", Range: `${from}-${from + PAGE_ROWS - 1}` },';
    assert.ok(ownerSrc.includes(anchor),
      "the control's anchor no longer matches ticket-owner.js's readAll, so it would grade a mutant identical to the original");
    const mutant = ownerSrc
      .replace(anchor, "undefined,")
      .replace("const page = await rest(base, key, query, {", "const page = await rest(base, key, `${query}&limit=${limit}`, {");
    let controlError = null;
    try { assertOwnerReadAllPages(mutant); } catch (e) { controlError = e; }
    assert.ok(controlError,
      "CONTROL: with Range deleted and &limit=${limit} restored, ticket-owner.js's paging judgement must fail");
    assert.match(controlError.message, /Range:/);
    results.push("owner-paging-source+control");
  }

  // --- (E) a confirmed premise is a row patch, never a ledger row -------------------------------
  {
    const NOW166 = "2026-09-27T00:00:00.000Z";
    const premiseRow = {
      id: "00000000-0000-4000-8000-166000000001", backlog_id: "ZZ166E-01", status: "open",
      type: "Tooling", tier: "later", claimed_by: null, claimed_at: null, predicted_cycles: 1,
      size_stamp: "S", design_status: null, kickoff_link: null, cost_pct_snapshot: null,
      cost_cycles_snapshot: null, revalidated_at: null, actual_tokens_attended: 1,
      filed_at: "2026-06-01T00:00:00+00:00", created_at: "2026-06-01T00:00:00+00:00",
      updated_at: "2026-06-01T00:00:00+00:00",
    };
    const board = {
      items: [premiseRow], matrix: [], verdicts: [], accepts: [], decisions: [], openCycles: [],
      ownerFindings: [],
      premises: [{ backlog_id: "ZZ166E-01", title: "ZZ166E premise", description: "Still open.", priority_class: "P10 - Tooling" }],
    };
    const census = classifyBoard(board, { now: NOW166, rate: 0.5 });

    // THE JUDGEMENT, factored so the mutants run the same code.
    const assertFixNeverLedger = result => {
      const plan = planWrites(result, [], [premiseRow], { rate: 0.5 });
      const mine = plan.fixes.filter(f => f.check === REVALIDATION_CHECK);
      assert.equal(mine.length, 1, "a confirmed premise must be ONE row patch");
      assert.deepEqual(mine[0].patch, { revalidated_at: NOW166 },
        "the patch writes revalidated_at and nothing else — never status, never updated_at (SES-316)");
      assert.equal(mine[0].id, premiseRow.id, "a fix addresses its row by primary key");
      assert.ok(!plan.ledger.insert.some(f => f.check_slug === REVALIDATION_CHECK),
        "a confirmed premise files NO ledger row — ticket_owner_findings already holds 259 unruled rows (AGT-169)");
      assert.deepEqual(plan.ledger.insert, [], "nothing else reaches the ledger from a one-row board either");
    };
    assertFixNeverLedger(census);

    // CONTROL 1 — the `fix` deleted in memory: the finding still says `derivable`, so planWrites
    // still routes it to `fixes`, and the patch it would PATCH with is nothing at all.
    const noFix = JSON.parse(JSON.stringify(census));
    delete noFix.findings.find(f => f.check === REVALIDATION_CHECK).fix;
    assert.throws(() => assertFixNeverLedger(noFix),
      "CONTROL: a derivable premise finding with its fix deleted must fail the judgement, not pass it as an empty patch");

    // CONTROL 2 — degraded to a judgment: it leaves `fixes` and lands on the ledger, which is the
    // exact shape AGT-169 forbids. The judgement must catch that direction too.
    const asJudgment = JSON.parse(JSON.stringify(census));
    const degraded = asJudgment.findings.find(f => f.check === REVALIDATION_CHECK);
    degraded.verdict = "judgment";
    delete degraded.fix;
    asJudgment.counts = { ...asJudgment.counts, derivable: 0, judgment: asJudgment.counts.judgment + 1 };
    assert.throws(() => assertFixNeverLedger(asJudgment),
      "CONTROL: a premise that reached the ledger instead of the row must fail the judgement");
    const degradedPlan = planWrites(asJudgment, [], [premiseRow], { rate: 0.5 });
    assert.deepEqual(degradedPlan.fixes, [], "the degraded control must really produce no fix — else it proves nothing");
    assert.deepEqual(degradedPlan.ledger.insert.map(f => f.check_slug), [REVALIDATION_CHECK],
      "and it must really file the ledger row the live path must never file");
    results.push("confirmed-premise-is-a-fix+2-controls");
  }

  // --- (B) the ratified predicate, by value ------------------------------------------------------
  {
    const epic = "e0000000-0000-4000-8000-000000000001";
    const row = id => ({ id: `u-${id}`, backlog_id: id, status: "done", epic_id: epic, defer_status: null, filed_at: daysAgo(9), created_at: daysAgo(9), revalidated_at: null });
    const items = ["R-ship", "R-accept", "R-hygiene", "R-reversed", "R-early", "R-none"].map(row);
    const verdicts = items.map(r => ({ backlog_id: r.backlog_id, verdict: "block", created_at: daysAgo(2) }));
    const decisions = [
      { backlog_id: "R-ship", kind: "ship", status: "final", decided_at: daysAgo(1) },
      { backlog_id: "R-hygiene", kind: "hygiene", status: "final", decided_at: daysAgo(1) },
      { backlog_id: "R-reversed", kind: "ticket-status", status: "reversed", decided_at: daysAgo(1) },
      { backlog_id: "R-early", kind: "ticket-status", status: "final", decided_at: daysAgo(3) },
    ];
    const accepts = [{ backlog_id: "R-accept", decided_at: daysAgo(2) }]; // dated AT the verdict: at-or-after, not after
    const board = { items, epics: [{ id: epic, project_id: "p1" }], cycles: [], images: [], decisions, accepts, verdicts };

    assert.equal(ratifiedAt(board, "R-ship"), Date.parse(daysAgo(1)));
    assert.equal(ratifiedAt(board, "R-accept"), Date.parse(daysAgo(2)));
    assert.equal(ratifiedAt(board, "R-hygiene"), -Infinity, "a hygiene decision does not ratify a close");
    assert.equal(ratifiedAt(board, "R-reversed"), -Infinity, "a reversed decision does not ratify a close");
    assert.equal(ratifiedAt(board, "R-none"), -Infinity);
    assert.equal(ratifiedAt(board, "R-early"), Date.parse(daysAgo(3)), "an earlier decision is still dated -- it is the COMPARISON that must reject it");

    const fired = checkClosedRed(board).map(f => f.locations[0].location.replace(/^backlog_items:/, "")).sort();
    assert.deepEqual(fired, ["R-early", "R-hygiene", "R-none", "R-reversed"],
      "only an UNRATIFIED close over a standing block is a finding; ship/accept at or after the verdict is a recorded judgment");
    results.push(`ratified-predicate(${fired.length} of 6 fire)`);
  }

  // --- (D) the trigger body, declared -----------------------------------------------------------
  notRun(
    "the AGT-166 arm of public.backlog_done_requires_verdict (the unratified-block refusal)",
    "it lives in the database, not the tree, and a permanent regression test must never write the " +
    "live board to watch a trigger fire -- the board is the product. Measured instead at this ship " +
    "inside rolled-back DO blocks: exactly 1 pg_proc row named backlog_done_requires_verdict after " +
    "the migration (no stale overload); 6 ticket-status decisions written, one per unratified " +
    "done-over-block row, selected by the predicate and never by name (AGT-70, AGT-79, LOG-104, " +
    "LOG-145, SES-301, SES-311 -- re-measured this session; the kickoff's §2.2 list named four rows " +
    "that the runner_items accept arm ratifies); writing done over an UNRATIFIED latest block " +
    "(AGR-4, verdict 972eed40-6ddf-42a4-b5aa-03b67ffed438) is refused with SQLSTATE 23514 citing " +
    "AGT-166; the identical UPDATE passes once ONE ship decision is recorded at or after that " +
    "verdict; a delivered row whose latest verdict is approve still closes; and the BEFORE INSERT " +
    "fence backlog_home_intake homed a ZZQ-1 row with no epic_id into a new 'Intake — ZZQ' epic " +
    "while leaving a row that named its own epic untouched. Arms (B) and (C) grade the same " +
    "predicate's shape in code and its EFFECT on the live census instead.");

  // --- (C) live -----------------------------------------------------------------------------------
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-166 live arm (the homeless census, the CLI's two zeros, backlog-intake still planned)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the live board is unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
    notRun("AGT-166 slice 2 live arm (F) (the revalidation population, and the dry run moving nothing)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the drain's depth and the no-write property of " +
      "`--judge --answer --dry-run` are unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
    return results;
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const countOf = async q => {
    const res = await fetch(`${url}/rest/v1/${q}`, { method: "HEAD", headers: { ...headers, Prefer: "count=exact" } });
    assert.ok(res.ok, `${q} -> HTTP ${res.status}`);
    return Number((res.headers.get("content-range") ?? "").split("/")[1]);
  };

  const homeless = await countOf("backlog_items?select=id&status=in.(open,partial)&epic_id=is.null");
  assert.equal(homeless, 0, `live: no open or partial row may be homeless; ${homeless} are`);

  const projects = await (await fetch(`${url}/rest/v1/projects?select=slug,status&slug=eq.backlog-intake`, { headers })).json();
  assert.equal(projects.length, 1, "live: the backlog-intake project must exist -- the fence fails OPEN without it and rows land homeless again");
  assert.equal(projects[0].status, "planned",
    "live: backlog-intake must stay 'planned' -- moving it to 'executing' would make 546 homed rows pickable, which is not what the homing decided");

  const out = path.join(os.tmpdir(), `agt-166-board-${process.pid}.json`);
  try {
    const r = spawnSync(process.execPath, [SCRIPT, `--out=${out}`], { encoding: "utf8", env: process.env });
    assert.equal(r.status, 0, `audit-board.js must exit 0; got ${r.status}\n${r.stdout}\n${r.stderr}`);
    console.log(r.stdout.trimEnd().split("\n").map(l => `    ${l}`).join("\n"));
    assert.match(r.stdout, /^ {2}board-no-home: 0 rows -> 0 finding\(s\)/m, "live: the CLI must print board-no-home: 0");
    assert.match(r.stdout, /^ {2}quality-closed-red: 0 rows -> 0 finding\(s\)/m, "live: the CLI must print quality-closed-red: 0");
    const read = Number(/items read (\d+)/.exec(r.stdout)?.[1]);
    assert.ok(read >= BOARD_ROWS_AT_SHIP,
      `live: the CLI must read the WHOLE board -- ${read} items read, at least ${BOARD_ROWS_AT_SHIP} expected (a 1,000 here is PostgREST's max-rows cap back again)`);
    const live = await countOf("backlog_items?select=id");
    assert.equal(read, live, `live: items read (${read}) must equal the board's own row count (${live})`);
    results.push(`live(homeless 0, closed-red 0, items ${read})`);
  } finally {
    try { fs.unlinkSync(out); } catch { /* absent */ }
  }

  // --- (F) live: the drain's depth, and a dry run that moves nothing -----------------------------
  // READ-ONLY BY CONSTRUCTION: a census with no --apply, a count, and a --dry-run that reads two
  // files and talks to nothing. The population is counted BEFORE and AFTER, because "the dry run
  // writes nothing" is the property the whole two-pass design rests on and it is cheap to prove.
  const fenceAt = new Date(Date.now() - UNREVALIDATED_DAYS * DAY).toISOString();
  const POP_Q = "backlog_items?select=id&status=eq.open&revalidated_at=is.null" +
    `&or=(filed_at.lt.${fenceAt},and(filed_at.is.null,created_at.lt.${fenceAt}))`;
  const popBefore = await countOf(POP_Q);
  assert.ok(popBefore >= 1,
    `live: the drain must have something to drain — the §2.2 predicate counts ${popBefore}. A zero here is either a finished drain (write the ticket done) or a broken predicate`);

  const censusOut = path.join(os.tmpdir(), `agt-166-owner-${process.pid}.json`);
  try {
    const c = spawnSync(process.execPath, [path.join("scripts", "ticket-owner.js"), "--census", `--out=${censusOut}`],
      { cwd: ROOT, encoding: "utf8", env: process.env });
    assert.equal(c.status, 0, `ticket-owner.js --census must exit 0; got ${c.status}\n${c.stdout}\n${c.stderr}`);
    const census = JSON.parse(fs.readFileSync(censusOut, "utf8"));

    // THE PAGING FIX, LIVE AND AS A NUMBER. The census must have read the WHOLE board, and its own
    // population must equal the count above. Before slice 2 these disagreed by 19 rows in silence.
    const boardRows = await countOf("backlog_items?select=id&status=in.(open,partial,done,delivered)");
    assert.equal(census.counts.rows, boardRows,
      `live: the census read ${census.counts.rows} of ${boardRows} rows — a 1000 here is PostgREST's max-rows cap back again`);
    assert.equal(census.backlog.unrevalidated_30d, popBefore,
      `live: the census reports ${census.backlog.unrevalidated_30d} unrevalidated rows where count=exact reads ${popBefore} — one of the two is not reading the whole board`);
    // The CLI's own first line, which is the string the nightly cycle row carries verbatim.
    const headline = c.stdout.split("\n")[0];
    // AGT-169 appended the night's retirement counts after the drain's depth, so the depth is no
    // longer last. Both clauses are pinned, in order, rather than loosening the match to a bare
    // `includes` -- the order is what makes the line diffable night over night.
    assert.match(headline, / · revalidation \d+ left \(batch \d+, carried \d+\) · retired \d+ check(?:s)? \/ \d+ row(?:s)?$/,
      `the census line must end in the drain's depth and the night's retirements; got: ${headline.slice(-120)}`);
    assert.ok(headline.includes(` · revalidation ${popBefore} left `),
      `the census line must quote the population count=exact reads (${popBefore}); got: ${headline.slice(-90)}`);

    const batchIds = census.findings.filter(f => f.check === REVALIDATION_CHECK).map(f => f.backlog_id);
    assert.ok(batchIds.length > 0 && batchIds.length <= UNREVALIDATED_BATCH + 0,
      `live: tonight's batch is ${batchIds.length} rows, which is not 1..${UNREVALIDATED_BATCH}`);
    assert.equal(batchIds.length, new Set(batchIds).size, "live: one finding per row, never two");

    // The whole two-pass merge over the LIVE census with the writer removed. The state is assembled
    // here exactly as pass one writes it, from the seed's own stored schema (the fixture holds it byte
    // for byte, asserted in agt-79-ticket-owner.test.mjs), so a merge that stopped validating would
    // redden there rather than pass silently here.
    const J = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/agt-79/judge.json"), "utf8"));
    const mine = census.findings.filter(f => f.check === REVALIDATION_CHECK);
    const idRows = await (await fetch(
      `${url}/rest/v1/backlog_items?select=id,backlog_id&backlog_id=in.(${mine.map(f => f.backlog_id).join(",")})`,
      { headers })).json();
    assert.equal(idRows.length, mine.length, "live: every batch row must resolve to a primary key");
    const derivable = mine.filter(f => f.verdict === "derivable");
    const state = {
      version: 1, started_at: census.measured_at, cycle_id: "00000000-0000-4000-8000-000000000000",
      nightly: false, capability: "audit-board", intent: "to-audit-intent", agent: "ticketowner",
      model: "claude-fable-5-1", schema: J.schema, now: census.measured_at, rate: census.rate,
      window: chicagoDay(census.measured_at),
      census: {
        ...census,
        findings: mine,
        counts: { rows: census.counts.rows, findings: mine.length, derivable: derivable.length, judgment: mine.length - derivable.length },
      },
      prior: [],
      items: idRows.map(r => ({ id: r.id, backlog_id: r.backlog_id })),
    };
    const answer = {
      window: state.window,
      fixes: derivable.map(f => ({ backlog_id: f.backlog_id, check: f.check, apply: true, reason: "AGT-166 arm (F): the premise still names work the board does not show done." })),
      findings: [],
      report: "AGT-166 slice 2 arm (F): a dry run over the live census. Nothing is written.",
      account: "Dry-ran one judged night over the live board",
    };
    const sf = path.join(os.tmpdir(), `agt-166-state-${process.pid}.json`);
    const af = path.join(os.tmpdir(), `agt-166-answer-${process.pid}.json`);
    try {
      fs.writeFileSync(sf, JSON.stringify(state), "utf8");
      fs.writeFileSync(af, JSON.stringify(answer), "utf8");
      const dry = spawnSync(process.execPath,
        [path.join("scripts", "ticket-owner.js"), "--judge", `--answer=${af}`, `--state-file=${sf}`, "--dry-run"],
        { cwd: ROOT, encoding: "utf8", env: process.env });
      assert.equal(dry.status, 0, `the dry run must be accepted; stderr: ${dry.stderr}`);
      const d = JSON.parse(dry.stdout);
      assert.equal(d.dry_run, true);
      assert.equal(d.confirmed, derivable.length, `the dry run confirmed ${d.confirmed} of ${derivable.length}`);
      assert.equal(d.fixes, derivable.length, "every confirmed premise is a row patch");
      assert.equal(d.insert, mine.length - derivable.length,
        "and ONLY the unconfirmable ones reach the ledger — a confirmed premise files no finding (AGT-169)");
    } finally {
      for (const f of [sf, af]) { try { fs.unlinkSync(f); } catch { /* absent */ } }
    }

    // NOTHING MOVED. The same count, after the merge ran end to end with the writer removed.
    const popAfter = await countOf(POP_Q);
    assert.equal(popAfter, popBefore,
      `live: --dry-run moved the board — the population read ${popBefore} before and ${popAfter} after, and a dry run that writes is not dry`);
    results.push(`live-drain(population ${popBefore}, board ${boardRows} rows, batch ${batchIds.length}, dry-run moved 0)`);
  } finally {
    try { fs.unlinkSync(censusOut); } catch { /* absent */ }
  }
  return results;
}

selfRun(import.meta.url, run);
export default run;
