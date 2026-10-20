// DeepBench v7.0.870 | tests/regression/agt-493-ticket-validation.test.mjs | AGT-493 -- THE
// STALE-TICKET VALIDATION. A ticket filed more than 14 days ago is validated by the Governance
// Architect before Victoria's move door may place it.
//
// THE DEFECT, measured live 2026-10-20 on tree 129f871 rather than reasoned about: 500 open/partial
// tickets that are not `john-named` were filed more than 14 days ago, 94 of them holding
// `need_score >= 3`, and `placement_target()` carried no age test at all -- so every one of them was
// placeable by a `move` on a premise nobody had re-read since it was filed. The re-grade half was
// already built (`grade_standing()` drops a grade the moment the description changes, d.13); the
// missing halves were the sensor, the gate and the write path.
//
// WHAT IS GUARDED HERE, and what each arm can prove ALONE:
//
//   A (OFFLINE, zero network). The VALIDATOR. `validateValidation()`'s X1-X6 and
//     `validateListVerdict()`'s V8, every refusal paired with the answer it would have ACCEPTED on
//     the same context -- a rule that refuses everything and a rule that refuses the right thing
//     look identical from the refusal alone (the LOO-013 lesson).
//
//   B (LIVE, read-only). The SENSOR and the GATE over the real board: `needs_validation()` names
//     only tickets older than the window and never a `john-named` one; `placement_target()` refuses
//     a real graded ticket it names; `apply_ticket_validation()` refuses a `revised` answer whose
//     description does not differ, and writes NOTHING doing it; and `--prepare-list` offers no
//     ticket carrying `needs_validation: true` while every proposal carries the key.
//
//   C (LIVE, write-then-undo). BOTH WAYS on three fixtures: the move refused unvalidated and landing
//     once `confirmed`, with EXACTLY ONE `requirement-check` row throughout (that count is the whole
//     "a validation never re-grades" claim); `revised` dropping the grade by changing the text; and
//     `not-real` sending the ticket to `removal proposed`. Then every decision reversed and the
//     fixtures deleted, with the counts re-read.
//
//   D (LIVE, read-only). The PROMPT. The capability assembles for the architect and carries its own
//     intent's method -- the rule is DATA (pattern:2), so this reads it off the real assembly.
//
// FIXTURE CONCURRENCY (SES-382), on agt-489's precedent: every fixture carries
// `priority_class = 'P6 - Agent Enhancement'`, so `ladder_work_class()` is NULL and no reversal can
// demote a real ladder class on every run (pattern:76). `runner_decisions_backlog_id_check` is
// `^[A-Z]+-[0-9]+[a-z]?$`, hence `ZAGTVL-n`.
//
// WHY NO ROLLED-BACK TRANSACTION, the same wall as agt-489's: this suite reaches Supabase only over
// PostgREST, which cannot open one. Hence refuse-or-write-then-undo with the counts re-read. The
// migration's own GATE arm 7 does hold the rolled-back form, inside the database.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { buildValidationContext, validateValidation, VERDICTS, REASON_CHARS, STANDING_DAYS, DEFAULT_LIMIT }
  from "../../scripts/ticket-validation.js";
import { buildListContext, validateListVerdict } from "../../scripts/requirement-check.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHECK = path.join(REPO, "scripts", "requirement-check.js");
const PROMPT = path.join(REPO, "scripts", "agent-prompt.js");

const NSRC = "nathan:market_records:fbaa1d6e-06e4-4015-b0fe-b4915fa7bfef";
const HOME = "go-to-market";
const HOME_EPIC_EXPECTED = "589f2d4b-3a2a-4d25-960c-040d36ccdbaa";
const LIST = "auditor-findings";
const LIST_EPIC_PRIMARY = "ba12f804-9ff1-4160-ac3d-5c0bf8470877";
const LIST_EPIC_FALLBACK = "48c63dac-4e5e-4287-8e72-01777fedbbf2";

const FIXTURE_PREFIX = "ZAGTVL";
const AUTHOR = "agt-493-test";
const SOURCE_FILE = "tests/regression/agt-493-ticket-validation.test.mjs";
const DESCRIPTION =
  "AGT-493 regression fixture: a probe ticket for the validation door. Its text never changes " +
  "unless an arm changes it, which is what makes the re-grade assertion mean something.";
const NONCE = `${Date.now()}`;

// The SQLSTATE PostgREST reports for every refusal in this feature, MEASURED on this ship rather
// than recalled: `raise ... using errcode = 'check_violation'` is 23514, and PostgREST answers it as
// HTTP 400 with `code` "23514". A refusal arriving as any other code is a different refusal.
const CHECK_VIOLATION = "23514";

// ---------------------------------------------------------------------------------------------
// transport (agt-489-move-door.test.mjs's shape, column for column)
// ---------------------------------------------------------------------------------------------

async function req(url, key, q, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}

const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 300)}`;

async function count(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  const cr = res.headers.get("content-range") ?? "";
  const n = Number(cr.split("/")[1]);
  if (!res.ok || !Number.isFinite(n)) throw new Error(`count ${q} -> HTTP ${res.status} content-range=${cr}`);
  return n;
}

const rpc = (url, key, fn, args, q = "") =>
  req(url, key, `rpc/${fn}${q}`, { method: "POST", body: args ?? {} });

function ticket(n, epicId, extra) {
  return {
    backlog_id: `${FIXTURE_PREFIX}-${n}`,
    tier: "next",
    type: "Tooling",
    priority_class: "P6 - Agent Enhancement",
    title: `AGT-493 validation probe ${n}`,
    description: DESCRIPTION,
    status: "open",
    epic_id: epicId,
    source_file: SOURCE_FILE,
    scope_origin: "discovered",
    size_stamp: "S",
    defer_status: "no",
    scope_rationale: "regression probe",
    enhancement_claim: "none: probe",
    queue: 999493000 + n,
    row_ordinal: 999493000 + n,
    // THE WHOLE POINT OF THE FIXTURE: older than the window, so the sensor must name it.
    filed_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    ...extra,
  };
}

// ---------------------------------------------------------------------------------------------
// Arm A -- OFFLINE. X1-X6 and V8, each refusal paired with the answer it would have accepted.
// ---------------------------------------------------------------------------------------------

function armOffline() {
  assert.deepEqual([...VERDICTS], ["confirmed", "revised", "not-real"],
    "the validation vocabulary is exactly the three apply_ticket_validation() enforces, in its order");
  assert.equal(STANDING_DAYS, 14, "a validation stands the age rule's own window, d.8's 14 days");
  assert.equal(DEFAULT_LIMIT, 10, "ten tickets per turn, d.1's floor (--limit overrides it)");
  assert.equal(REASON_CHARS, 400, "and the reason bound is ga-validate-intent's own schema bound");

  const A = "ZAGTVLB-1";
  const B = "ZAGTVLB-2";
  const ctx = buildValidationContext({
    list: LIST,
    tickets: [
      { backlog_id: A, title: "A", description: "the A text", status: "open", need_score: 4, graded: true },
      { backlog_id: B, title: "B", description: "the B text", status: "open", graded: false },
    ],
  });

  // The context itself must carry what every rule below reads, or they are all reading undefined.
  assert.equal(ctx.standing_days, STANDING_DAYS, "the context tells the turn why it was handed these");
  assert.equal(ctx.tickets.length, 2, "both tickets travel");
  assert.equal(ctx.tickets[0].graded, true, "a graded ticket travels as graded");
  assert.equal(ctx.tickets[1].graded, false, "and an ungraded one as not graded, never undefined");
  assert.equal(ctx.tickets[0].description, "the A text",
    "THE WHOLE DESCRIPTION, uncut -- a revision composed from a head would drop John's sentences");

  const rowA = { backlog_id: A, verdict: "confirmed", reason: "still real: measured" };
  const rowB = { backlog_id: B, verdict: "not-real", reason: "the table it names is gone" };
  const answerOf = rows => ({ list: LIST, account: "Validated two old tickets", rows });
  const run = rows => validateValidation(answerOf(rows), ctx);
  const accept = (rows, label) => {
    const v = run(rows);
    assert.deepEqual(v.refusals, [], `${label} must be ACCEPTED; got ${v.refusals.join(" | ")}`);
    assert.equal(v.ok, true, `${label} must be ok`);
  };
  const refuse = (rows, id, re, label, answer) => {
    const v = validateValidation(answer ?? answerOf(rows), ctx);
    assert.equal(v.ok, false, `${label} must be refused; it was accepted`);
    const named = v.refusals.filter(r => r.startsWith(`${id}: `));
    assert.ok(named.some(r => re.test(r)),
      `${label} must refuse ${id} with ${re}; got ${v.refusals.join(" | ") || "(none)"}`);
  };

  // The whole-list answer every refusal below is one row away from.
  accept([rowA, rowB], "the mirror answer (A confirmed, B not-real)");
  accept([{ backlog_id: A, verdict: "revised", reason: "the count moved", description: "a different text" }, rowB],
    "A revised instead, carrying a text that differs");

  // X1 -- exactly once each, and only the tickets it was handed.
  refuse([rowA], B, /was handed and not ruled/, "X1 missing");
  refuse([rowA, rowA, rowB], A, /is ruled twice/, "X1 duplicate");
  refuse([rowA, rowB, { backlog_id: "ZAGTVLB-9", verdict: "confirmed", reason: "r" }], "ZAGTVLB-9",
    /is not a ticket of this validation — a row may only rule the tickets it was handed/, "X1 stranger");

  // X2 -- the vocabulary.
  refuse([{ ...rowA, verdict: "still-real" }, rowB], A,
    /verdict still-real is not one of confirmed, revised, not-real/, "X2");

  // X3 -- a reason, and one the schema can carry.
  refuse([{ ...rowA, reason: "   " }, rowB], A, /the verdict needs a reason/, "X3 blank");
  refuse([{ ...rowA, reason: "x".repeat(REASON_CHARS + 1) }, rowB], A,
    new RegExp(`the reason is ${REASON_CHARS + 1} characters; the schema allows ${REASON_CHARS}`), "X3 long");

  // X4 -- a revision that revises nothing. BOTH shapes: blank, and byte-equal to the ticket's text.
  refuse([{ backlog_id: A, verdict: "revised", reason: "r" }, rowB], A,
    /a revised validation carries a description that differs from the ticket's/, "X4 blank");
  refuse([{ backlog_id: A, verdict: "revised", reason: "r", description: "the A text" }, rowB], A,
    /a revised validation carries a description that differs from the ticket's/, "X4 same text");

  // X5 -- and the mirror: only a revision carries one.
  refuse([{ ...rowA, description: "a different text" }, rowB], A,
    /only a revised validation carries a description/, "X5 confirmed");
  refuse([rowA, { ...rowB, description: "a different text" }], B,
    /only a revised validation carries a description/, "X5 not-real");

  // X6 -- the answer is about the list it was handed, and it says what it did.
  refuse(null, "another-list", /the answer names list another-list, which is not the one it was handed/,
    "X6 wrong list", { list: "another-list", account: "a", rows: [rowA, rowB] });
  refuse(null, LIST, /the answer needs an account/, "X6 no account",
    { list: LIST, account: "  ", rows: [rowA, rowB] });

  // ---- V8, in requirement-check.js's own validator ------------------------------------------
  const listCtx = needs => buildListContext({
    project: LIST, epics: [],
    tickets: [{ backlog_id: A, title: "A", description: "d", status: "open", graded: true,
      need_score: 4, needs_validation: needs }],
    candidates: [{ key: NSRC, head: "h" }],
    kinds: ["nathan:market_records"],
    charters: [{ slug: HOME, charter: "g" }],
    fingerprint: "0".repeat(32),
  });
  const waiting = listCtx(true);
  const clear = listCtx(false);
  assert.equal(waiting.proposals[0].needs_validation, true,
    "the proposal must CARRY the fact, or V8 is reading undefined");
  assert.equal(clear.proposals[0].needs_validation, false, "false is the safe reading, never undefined");

  const move = { backlog_id: A, verdict: "move", home: HOME, need_source: null, need_score: null, reason: "r" };
  const hold = { backlog_id: A, verdict: "hold", home: null, need_source: null, need_score: null, reason: "r" };
  const listAnswer = rows => ({ list: LIST, account: "Ruled one ticket", rows });

  const vMove = validateListVerdict(listAnswer([move]), waiting);
  assert.equal(vMove.ok, false, "V8 must refuse a move on a ticket awaiting validation");
  assert.ok(vMove.refusals.some(r => /was filed more than 14 days ago and no validation stands on it; it is validated first \(AGT-493\) -- answer hold, or pass with home null/.test(r)),
    `V8's refusal must be its own sentence; got ${vMove.refusals.join(" | ") || "(none)"}`);

  const vHold = validateListVerdict(listAnswer([hold]), waiting);
  assert.deepEqual(vHold.refusals, [], `a hold is the answer V8 leaves open; got ${vHold.refusals.join(" | ")}`);

  const vMoveClear = validateListVerdict(listAnswer([move]), clear);
  assert.deepEqual(vMoveClear.refusals, [],
    `and the SAME move is accepted once no validation is owed; got ${vMoveClear.refusals.join(" | ")}`);
}

// ---------------------------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------------------------

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  await arm("A the validator's X1-X6 and V8 (offline)", async () => { armOffline(); });

  if (!url || !key) {
    notRun("AGT-493 arms B, C and D",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the sensor, the gate and the writer are all " +
      "database functions and the capability itself is a row, so there is no offline half of any of " +
      "them (run with `node --env-file-if-exists=.env.local tests/regression/run-all.js`)");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }

  // ---- B. THE SENSOR AND THE GATE over the real board, read-only -----------------------------
  await arm("B the sensor and the gate, live and read-only", async () => {
    const sensor = await rpc(url, key, "needs_validation");
    assert.ok(sensor.ok, `needs_validation() must read; got ${describe(sensor)}`);
    const rows = sensor.json ?? [];
    assert.ok(rows.length >= 1,
      "needs_validation() must name at least one ticket -- with none, nothing below this line " +
      "proves the gate rather than an empty read");
    const cutoff = Date.now() - STANDING_DAYS * 24 * 60 * 60 * 1000;
    for (const r of rows) {
      assert.ok(new Date(r.filed_at).getTime() < cutoff,
        `${r.backlog_id} is named by the sensor but was filed ${r.filed_at}, inside the ${STANDING_DAYS}-day window`);
    }
    // The origins are RE-READ over REST rather than trusted from the function's own predicate: a
    // john-named ticket is never moved by the door, so a validation turn on one buys nothing (d.10).
    const ids = rows.map(r => String(r.backlog_id));
    const origins = [];
    for (let i = 0; i < ids.length; i += 60) {
      const chunk = ids.slice(i, i + 60);
      const o = await req(url, key,
        `backlog_items?select=backlog_id,scope_origin,status&backlog_id=in.(${chunk.join(",")})`);
      assert.ok(o.ok, `the sensor's rows' origins must read; got ${describe(o)}`);
      origins.push(...(o.json ?? []));
    }
    const named = origins.filter(o => o.scope_origin === "john-named").map(o => o.backlog_id);
    assert.deepEqual(named, [], `the sensor must name no john-named ticket; it named ${JSON.stringify(named)}`);
    const wrongStatus = origins.filter(o => !["open", "partial"].includes(o.status)).map(o => o.backlog_id);
    assert.deepEqual(wrongStatus, [], `and only open or partial ones; got ${JSON.stringify(wrongStatus)}`);

    // THE GATE, on a real graded ticket the sensor names: lexically first, graded 3 or more, no
    // parent lifting it -- so the refusal can only be the age gate and not (b), (f) or (c).
    const graded = await rpc(url, key, "grade_standing");
    assert.ok(graded.ok, `grade_standing() must read; got ${describe(graded)}`);
    const gradeOf = new Map((graded.json ?? []).map(g => [String(g.backlog_id), Number(g.need_score)]));
    const parents = await rpc(url, key, "parent_project_of_blockers");
    assert.ok(parents.ok, `parent_project_of_blockers() must read; got ${describe(parents)}`);
    const lifted = new Set((parents.json ?? []).map(r => String(r.backlog_id)));
    const pick = ids
      .filter(b => (gradeOf.get(b) ?? -1) >= 3 && !lifted.has(b) && !b.startsWith(`${FIXTURE_PREFIX}-`))
      .sort()[0] ?? null;
    assert.ok(pick, "the sensor must name a graded, parentless ticket to test the gate with");
    const row = await req(url, key,
      `backlog_items?select=id,backlog_id,description&backlog_id=eq.${pick}&limit=1`);
    assert.ok(row.ok, `${pick} must read; got ${describe(row)}`);
    const t = (row.json ?? [])[0] ?? null;
    assert.ok(t, `${pick} must exist`);

    const placed = await rpc(url, key, "placement_target", { p_ticket: t.id, p_home: "tooling" });
    assert.equal(placed.status, 400,
      `placement_target() must REFUSE ${pick}, which no validation stands on; got ${describe(placed)}`);
    assert.equal(placed.code, CHECK_VIOLATION,
      `the refusal must be the check_violation the gate raises; got ${describe(placed)}`);
    assert.ok(String(placed.json?.message ?? "").includes("AGT-493") &&
      String(placed.json?.message ?? "").includes("validated first"),
      `and it must be the AGE gate's own sentence; got ${describe(placed)}`);

    // AND THE WRITER'S SAME-TEXT REFUSAL, which must cost nothing: a `revised` answer carrying the
    // ticket's own description reopens no grade, so it is refused BEFORE record_decision().
    const beforeDec = await count(url, key, "runner_decisions?select=id");
    const same = await rpc(url, key, "apply_ticket_validation", {
      p_cycle: null, p_session: AUTHOR,
      p: { backlog_id: pick, verdict: "revised", reason: "qa", account: "qa", description: t.description },
    });
    assert.equal(same.status, 400, `a same-text revision must be refused; got ${describe(same)}`);
    assert.ok(String(same.json?.message ?? "").includes("differs"),
      `and refused for not differing; got ${describe(same)}`);
    const afterDec = await count(url, key, "runner_decisions?select=id");
    assert.equal(afterDec, beforeDec,
      `the refusal must write NOTHING; runner_decisions read ${beforeDec} -> ${afterDec}`);

    // AND THE LIST DOOR does not offer one at all (the AGT-489 precedent for the under-3 case).
    const out = path.join(os.tmpdir(), `agt493-prepare-${NONCE}.md`);
    const r = spawnSync(process.execPath,
      [CHECK, "--prepare-list", `--project=${LIST}`, `--out=${out}`, "--json"], { encoding: "utf8" });
    try { fs.unlinkSync(out); } catch { /* the prompt file is not the assertion */ }
    const all = `${r.stdout}${r.stderr}`;
    assert.equal(r.status, 3, `--prepare-list must exit 3; got ${r.status}: ${all.slice(0, 800)}`);
    const head = JSON.parse(r.stdout.trim());
    const proposals = head.context?.proposals ?? [];
    assert.ok(proposals.length >= 1, "the list must still offer something, or this read proves nothing");
    for (const p of proposals) {
      assert.ok(Object.prototype.hasOwnProperty.call(p, "needs_validation"),
        `${p.backlog_id} must CARRY needs_validation -- the backstop reads it off the proposal`);
    }
    const offeredWaiting = proposals.filter(p => p.needs_validation === true).map(p => p.backlog_id);
    assert.deepEqual(offeredWaiting, [],
      `no ticket awaiting validation may be offered; got ${JSON.stringify(offeredWaiting)}`);
    assert.ok(r.stderr.includes(`ticket-validation.js --prepare --list=${LIST}`),
      `and the run must say where they went; stderr: ${r.stderr.slice(0, 500)}`);
    console.log(`    [AGT-493 arm B] sensor ${rows.length} ticket(s); gate refused ${pick} (23514); ` +
      `--prepare-list ${LIST}: ${proposals.length} offered, ${head.needs_validation} awaiting validation`);
  });

  // ---- C. BOTH WAYS on fixtures, write-then-undo ----------------------------------------------
  const ALL = [1, 2, 3].map(n => `${FIXTURE_PREFIX}-${n}`);
  const beforeItems = await count(url, key, "backlog_items?select=id");
  const beforeDec = await count(url, key, "runner_decisions?select=id");
  const beforeImg = await count(url, key, "runner_before_images?select=id");
  const residue = [];
  let wrote = false;

  await arm("C the move refused, confirmed, landed -- and revised / not-real", async () => {
    const epics = await req(url, key,
      `epics?select=id&id=in.(${LIST_EPIC_PRIMARY},${LIST_EPIC_FALLBACK})`);
    assert.ok(epics.ok, `the list's epics must read; got ${describe(epics)}`);
    const have = new Set((epics.json ?? []).map(e => String(e.id)));
    const epicId = have.has(LIST_EPIC_PRIMARY) ? LIST_EPIC_PRIMARY
      : have.has(LIST_EPIC_FALLBACK) ? LIST_EPIC_FALLBACK : null;
    assert.ok(epicId, "the fixtures need one of the auditor list's two known epics to sit on");

    wrote = true;
    const ins = await req(url, key, "backlog_items", {
      method: "POST", prefer: "return=representation",
      body: [ticket(1, epicId), ticket(2, epicId), ticket(3, epicId)],
    });
    assert.ok(ins.ok, `the three fixtures must insert; got ${describe(ins)}`);
    const byId = new Map((ins.json ?? []).map(r => [String(r.backlog_id), r]));
    assert.equal(byId.size, 3, "all three must land");

    const grade = async bid => {
      const g = await rpc(url, key, "apply_requirement_verdict", {
        p_cycle: null, p_session: AUTHOR,
        p: { verdict: "pass", backlog_id: bid, need_source: NSRC, need_score: 4,
          reason: "AGT-493 probe: graded so the move door has something to refuse",
          proposal: "AGT-493 probe", account: "Graded one probe ticket" },
      });
      assert.ok(g.ok, `${bid} must grade; got ${describe(g)}`);
      return g;
    };
    const moveIt = async bid => rpc(url, key, "apply_requirement_verdict", {
      p_cycle: null, p_session: AUTHOR,
      p: { verdict: "move", backlog_id: bid, home_project: HOME,
        reason: "AGT-493 probe: the move the gate is measured on", account: "Moved one probe ticket" },
    });
    const validate = async (bid, p) => rpc(url, key, "apply_ticket_validation", {
      p_cycle: null, p_session: AUTHOR,
      p: { backlog_id: bid, account: "Validated one probe ticket", ...p },
    });
    const read = async bid => {
      const r = await req(url, key,
        `backlog_items?select=backlog_id,status,epic_id,scope_origin,description,revalidated_at&backlog_id=eq.${bid}&limit=1`);
      assert.ok(r.ok, `${bid} must re-read; got ${describe(r)}`);
      return (r.json ?? [])[0] ?? null;
    };
    const names = async (fn, bid) => {
      const r = await rpc(url, key, fn);
      assert.ok(r.ok, `${fn}() must read; got ${describe(r)}`);
      return (r.json ?? []).some(x => String(x.backlog_id) === bid);
    };
    // UNREVERSED only, and that is the measurement rather than a convenience: `runner_decisions` is
    // append-only, so every earlier run of this file left its own REVERSED grade behind under the
    // same fixture id (4 of them by the third run, which is how this was caught). The claim being
    // measured is "a validation never writes a grade", and a grade written by this run is an
    // UNREVERSED row -- which is also the predicate `grade_standing()` itself reads.
    const grades = async bid => count(url, key,
      `runner_decisions?select=id&kind=eq.requirement-check&reversed_at=is.null&backlog_id=eq.${bid}`);

    // (1) GRADED, OLD, AND REFUSED.
    const one = `${FIXTURE_PREFIX}-1`;
    await grade(one);
    assert.equal(await names("needs_validation", one), true,
      `${one} is 20 days old with no validation, so the sensor must name it`);
    const refused = await moveIt(one);
    assert.equal(refused.status, 400, `${one}'s move must be refused unvalidated; got ${describe(refused)}`);
    assert.equal(refused.code, CHECK_VIOLATION, `and as a check_violation; got ${describe(refused)}`);
    assert.ok(String(refused.json?.message ?? "").includes("AGT-493"),
      `and by the age gate; got ${describe(refused)}`);
    assert.equal(await grades(one), 1, `${one} must hold exactly one grade at this point`);

    // (2) CONFIRMED -- and the grade STANDS. This is d.30's RESOLVED clause, both halves.
    const conf = await validate(one, { verdict: "confirmed", reason: "AGT-493 probe: still real" });
    assert.ok(conf.ok, `${one} must validate; got ${describe(conf)}`);
    assert.ok(typeof conf.json === "string" && conf.json.length === 36,
      `and return its decision handle; got ${describe(conf)}`);
    assert.equal(await names("validation_standing", one), true, "the validation must now STAND");
    assert.equal(await names("needs_validation", one), false, "and the sensor must stop naming it");
    assert.equal(await names("grade_standing", one), true,
      "a CONFIRMED validation touches nothing grade_standing() reads, so the grade stands (d.30)");
    assert.equal(await grades(one), 1,
      `${one} must STILL hold exactly one requirement-check row -- a validation never re-grades`);
    const afterConf = await read(one);
    assert.ok(afterConf.revalidated_at !== null, "and revalidated_at is stamped so the board agrees");
    assert.equal(afterConf.description, DESCRIPTION, "a confirmed validation changes no text");

    // (3) AND NOW THE SAME MOVE LANDS.
    const landed = await moveIt(one);
    assert.ok(landed.ok, `${one}'s move must land once a validation stands; got ${describe(landed)}`);
    const moved = await read(one);
    assert.equal(String(moved.epic_id), HOME_EPIC_EXPECTED, `${one} must sit on ${HOME}'s epic`);
    assert.equal(moved.scope_origin, "victoria-placed", "and carry the placing origin");
    assert.equal(await grades(one), 1, "with its ONE grade untouched by either the validation or the move");

    // (4) REVISED -- the one re-grade trigger, by construction.
    const two = `${FIXTURE_PREFIX}-2`;
    await grade(two);
    assert.equal(await names("grade_standing", two), true, `${two} starts with a standing grade`);
    const revisedText = `${DESCRIPTION} (revised by AGT-493 QA)`;
    const rev = await validate(two, {
      verdict: "revised", reason: "AGT-493 probe: real, but the text was stale", description: revisedText,
    });
    assert.ok(rev.ok, `${two} must accept a revision that differs; got ${describe(rev)}`);
    const afterRev = await read(two);
    assert.equal(afterRev.description, revisedText, "the whole corrected text lands on the ticket");
    assert.ok(afterRev.revalidated_at !== null, "and revalidated_at is stamped");
    assert.equal(await names("grade_standing", two), false,
      "and the grade REOPENS -- grade_standing() drops it because the description moved (d.13)");
    assert.equal(await grades(two), 1,
      "without any second requirement-check row: the reopening is the text changing, not a re-grade");

    // (5) NOT-REAL -- it leaves the move population.
    const three = `${FIXTURE_PREFIX}-3`;
    assert.equal(await names("grade_standing", three), false, `${three} is ungraded, as filed`);
    const nr = await validate(three, {
      verdict: "not-real", reason: "AGT-493 probe: measured gone, nothing left to build",
    });
    assert.ok(nr.ok, `${three} must accept not-real; got ${describe(nr)}`);
    const afterNr = await read(three);
    assert.equal(afterNr.status, "removal proposed",
      "a not-real ticket goes to the removal room, so no standing validation can let a move place it");
    assert.equal(await names("needs_validation", three), false,
      "and it leaves the sensor with its status, not only with its validation");
  });

  // ---- the undo, in reverse order --------------------------------------------------------------
  if (wrote) {
    const mine = await req(url, key,
      "runner_decisions?select=id,backlog_id,kind,decided_at&kind=in.(requirement-check,placement,ticket-validation)" +
      `&reversed_at=is.null&backlog_id=in.(${ALL.join(",")})&order=decided_at.desc`);
    if (!mine.ok) residue.push(`undo: the fixtures' own decisions must read; got ${describe(mine)}`);
    for (const d of (mine.ok ? (mine.json ?? []) : [])) {
      const rev = await rpc(url, key, "reverse_decision", {
        p_decision: d.id, p_actor: "John",
        p_reason: `AGT-493 regression fixture: undo the probe's ${d.kind} on ${d.backlog_id}`,
      });
      if (!rev.ok) { residue.push(`undo: reverse_decision(${d.id}) -> ${describe(rev)}`); continue; }
      const out = (rev.json ?? [])[0] ?? {};
      console.log(`      [undo] reverse_decision ${d.id} (${d.backlog_id}, ${d.kind}): outcome=${out.outcome} ` +
        `restored=${out.restored} unverified=${out.restored_unverified} refused=${out.refused}`);
    }
    for (const n of [1, 2, 3]) {
      const del = await req(url, key, `backlog_items?backlog_id=eq.${FIXTURE_PREFIX}-${n}`, { method: "DELETE" });
      if (!del.ok) residue.push(`undo: fixture ${n} must delete; got ${describe(del)}`);
    }
    const requeue = await rpc(url, key, "recompute_backlog_queue");
    if (!requeue.ok) residue.push(`undo: recompute_backlog_queue must re-canonicalise the board; got ${describe(requeue)}`);
  }

  const afterItems = await count(url, key, "backlog_items?select=id");
  const afterDec = await count(url, key, "runner_decisions?select=id");
  const afterImg = await count(url, key, "runner_before_images?select=id");
  console.log(`      [counts] backlog_items ${beforeItems} -> ${afterItems}; ` +
    `runner_decisions ${beforeDec} -> ${afterDec}; runner_before_images ${beforeImg} -> ${afterImg}`);
  if (afterItems !== beforeItems) {
    residue.push(`ZERO RESIDUE: backlog_items read ${afterItems}, not ${beforeItems} -- a fixture leaked`);
  }
  const standing = await req(url, key,
    "runner_decisions?select=id,backlog_id,kind&kind=in.(requirement-check,placement,ticket-validation)" +
    `&reversed_at=is.null&backlog_id=in.(${ALL.join(",")})`);
  if (!standing.ok || (standing.json ?? []).length !== 0) {
    residue.push(`the fixture left an UNREVERSED grade, placement or validation standing: ${standing.text.slice(0, 300)}`);
  }
  const survivors = await req(url, key,
    `backlog_items?select=backlog_id&backlog_id=like.${FIXTURE_PREFIX}-*`);
  if (!survivors.ok || (survivors.json ?? []).length !== 0) {
    residue.push(`a fixture row survived: ${survivors.text.slice(0, 300)}`);
  }
  if (residue.length) failures.push(`[arm C undo] FAIL -- ${residue.join(" | ")}`);

  // ---- D. THE PROMPT, read-only ---------------------------------------------------------------
  await arm("D the capability assembles for the architect", async () => {
    const ctxFile = path.join(os.tmpdir(), `agt493-ctx-${NONCE}.json`);
    fs.writeFileSync(ctxFile, JSON.stringify({
      list: LIST, standing_days: STANDING_DAYS,
      tickets: [{
        backlog_id: "AGT-000", title: "a probe ticket", description: "a probe description",
        filed_at: "2026-09-01T00:00:00Z", status: "open", type: "Tooling",
        priority_class: "P10 - Tooling", need_source: NSRC, need_score: 4, graded: true,
      }],
    }, null, 2), "utf8");
    const r = spawnSync(process.execPath,
      [PROMPT, "--agent=architect", "--capability=validate-ticket", `--task-file=${ctxFile}`],
      { encoding: "utf8" });
    try { fs.unlinkSync(ctxFile); } catch { /* the context file is not the assertion */ }
    const all = `${r.stdout}${r.stderr}`;
    assert.equal(r.status, 0,
      `agent-prompt must assemble validate-ticket for the architect; got ${r.status}: ${all.slice(0, 800)}`);
    assert.ok(r.stdout.includes("STILL REAL"),
      "and the prompt must carry ga-validate-intent's own method -- the rule is the ROW, not this file");
    assert.ok(r.stdout.includes("validate-ticket"), "and name the capability it assembled");
    console.log(`    [AGT-493 arm D] agent-prompt --capability=validate-ticket: exit 0, ` +
      `${r.stdout.length} chars, carries STILL REAL`);
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
