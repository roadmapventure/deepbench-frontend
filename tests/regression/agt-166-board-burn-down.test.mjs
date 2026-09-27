// DeepBench v7.0.639 | tests/regression/agt-166-board-burn-down.test.mjs | AGT-166 slice 1 --
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "audit-board.js");
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
  return results;
}

selfRun(import.meta.url, run);
export default run;
