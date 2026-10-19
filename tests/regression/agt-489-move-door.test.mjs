// DeepBench v7.0.865 | tests/regression/agt-489-move-door.test.mjs | AGT-489 -- THE MOVE DOOR.
//
// THE DEFECT, measured live 2026-10-19 on tree 08a615d rather than reasoned about: Victoria's list
// turn GRADED and never MOVED. `applyList()`'s pass payload was `{ ...row, proposal, account }` --
// no `home_project` on any list pass ever -- and `prepareList()` offered every open/partial ticket
// of the list's epics, dropping only the `fit-stamp`ed ones. It had no notion of "already graded".
// So `auditor-findings` put the same 43 tickets to her every run (8 never graded + 35 graded, 130
// of both lists graded three times or more) while `countable_tickets_per_project()` read tooling 1,
// dev-manager-capabilities 0, go-to-market 0. A model turn re-answered a question the record had
// already answered, and nothing moved.
//
// WHAT IS GUARDED HERE, and what each arm can prove ALONE:
//
//   A (LIVE, write-then-undo). The WRITER. A graded ticket answered `move` lands on the home's
//     epic carrying `victoria-placed`, with its score and its source untouched and EXACTLY ONE
//     unreversed `requirement-check` row -- that count is the whole "grades nothing already
//     graded" claim, and it is why the move's own row is kind `placement`. An UNGRADED ticket's
//     `move` is refused by `grade_standing()`'s own test inside the writer, and the same ticket
//     passes the moment it is graded. A `john-named` ticket's `move` is refused by
//     `placement_target()`. Then one `reverse_decision()` of the placement puts the first ticket
//     back on its list with its grade intact -- which is what makes the move a promise and not a
//     one-way write (pattern:169).
//
//   B (OFFLINE, zero network). The VALIDATOR, V1-V7. Every refusal is paired with the answer it
//     would have accepted on the same context, because a rule that refuses everything and a rule
//     that refuses the right thing look identical from the refusal alone.
//
//   C (LIVE, read-only). The READER. `grade_standing()` over the real auditor list equals a
//     re-derivation of its own predicate done in JS over REST -- the function's SQL and the
//     re-derivation share no code -- and `--prepare-list` agrees with it per proposal, offering no
//     graded ticket under 3 that no parent lifts. NO `--apply-list` anywhere in this file.
//
//   D (LIVE, read-only). The ROW. The rule is DATA (pattern:2): the enum, the `home` property,
//     `required` and the `method` step are read off `vc-reorganize-intent` itself.
//
// WHAT THIS FILE DOES NOT TOUCH: `epic_lock_guard()`, `scope_origin_door()` and
// `requirement_gate()` are untouched by AGT-489 and are not re-guarded here (agt-480 owns them);
// no `audit_findings` row is filed by any arm; `runner_cycles` is never written, because
// `--apply-list` is never run.
//
// FIXTURE CONCURRENCY (SES-382), on agt-480's precedent: every fixture carries
// `priority_class = 'P6 - Agent Enhancement'`, so `ladder_work_class()` is NULL and no reversal can
// demote a real ladder class on every run (pattern:76). `runner_decisions_backlog_id_check` is
// `^[A-Z]+-[0-9]+[a-z]?$`, hence `ZAGTMV-n`.
//
// WHY NO ROLLED-BACK TRANSACTION, the same wall as agt-480's: this suite reaches Supabase only over
// PostgREST, which cannot open one. Hence refuse-or-write-then-undo with the counts re-read.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { buildListContext, validateListVerdict, LIST_VERDICTS, MOVE_KIND }
  from "../../scripts/requirement-check.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHECK = path.join(REPO, "scripts", "requirement-check.js");

// Kickoff §1: Nathan's market record. Traceable, and NOT John's -- a `john:` source would make the
// pass stamp `john-named` and arm A would be measuring AGT-450's door instead of this one.
const NSRC = "nathan:market_records:fbaa1d6e-06e4-4015-b0fe-b4915fa7bfef";

const HOME = "go-to-market";                                      // executing, ONE epic, locked
const HOME_EPIC_EXPECTED = "589f2d4b-3a2a-4d25-960c-040d36ccdbaa";
const LIST = "auditor-findings";
const LIST_EPIC_PRIMARY = "ba12f804-9ff1-4160-ac3d-5c0bf8470877";
const LIST_EPIC_FALLBACK = "48c63dac-4e5e-4287-8e72-01777fedbbf2"; // agt-480's list epic
const PARENT_SLUG = "tooling";                                     // arm B only; never written

const FIXTURE_PREFIX = "ZAGTMV";
const SOURCE_FILE = "tests/regression/agt-489-move-door.test.mjs";
const DESCRIPTION =
  "AGT-489 regression fixture: a probe ticket for the move door. Its text never changes, which is " +
  "what keeps its grade standing.";

// ---------------------------------------------------------------------------------------------
// transport (agt-480-victoria-placed-origin.test.mjs's shape, column for column)
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
    title: `AGT-489 move-door probe ${n}`,
    description: DESCRIPTION,
    status: "open",
    epic_id: epicId,
    source_file: SOURCE_FILE,
    scope_origin: "discovered",
    size_stamp: "S",
    defer_status: "no",
    scope_rationale: "regression probe",
    enhancement_claim: "none: probe",
    queue: 999489000 + n,
    row_ordinal: 999489000 + n,
    ...extra,
  };
}

// ---------------------------------------------------------------------------------------------
// Arm B -- OFFLINE. V1-V7, each refusal paired with the answer it would have accepted.
// ---------------------------------------------------------------------------------------------

function armOffline() {
  assert.deepEqual([...LIST_VERDICTS], ["pass", "not-needed", "no-fit", "move", "hold"],
    "the LIST vocabulary is five -- AGT-486 added no-fit, AGT-489 move and hold");
  assert.equal(MOVE_KIND, "placement",
    "and a move's decision kind is NEVER requirement-check: that kind IS a grade, which " +
    "grade_standing() and countable_tickets_per_project() both read");

  const A = "ZAGTMVB-1";   // graded, score 4, no parent
  const B = "ZAGTMVB-2";   // ungraded
  const C = "ZAGTMVB-3";   // graded, score 5, a parent in `tooling` lifts it
  const ctx = buildListContext({
    project: "x", epics: [],
    tickets: [
      { backlog_id: A, title: "A", description: "d", status: "open", graded: true, need_score: 4 },
      { backlog_id: B, title: "B", description: "d", status: "open", graded: false },
      { backlog_id: C, title: "C", description: "d", status: "open", graded: true, need_score: 5,
        parent_home: PARENT_SLUG },
    ],
    candidates: [{ key: NSRC, head: "h" }],
    kinds: ["nathan:market_records"],
    charters: [{ slug: PARENT_SLUG, charter: "t" }, { slug: HOME, charter: "g" }],
    fingerprint: "0".repeat(32),
  });

  // The context itself must carry the two facts, or every rule below is reading undefined.
  const byId = new Map(ctx.proposals.map(p => [p.backlog_id, p]));
  assert.equal(byId.get(A).graded, true, "a graded ticket travels as graded");
  assert.equal(byId.get(B).graded, false, "an ungraded one as not graded");
  assert.equal(byId.get(C).parent_home, PARENT_SLUG, "and the parent's project travels with it");
  assert.equal(byId.get(A).parent_home, null, "null is the ordinary case, never undefined");

  const rowA = { backlog_id: A, verdict: "move", home: HOME, need_source: null, need_score: null, reason: "r" };
  const rowB = { backlog_id: B, verdict: "pass", home: PARENT_SLUG, need_source: NSRC, need_score: 3, reason: "r" };
  const rowC = { backlog_id: C, verdict: "move", home: PARENT_SLUG, need_source: null, need_score: null, reason: "r" };
  const answerOf = rows => ({ list: "x", account: "Ruled three tickets", rows });

  const run = rows => validateListVerdict(answerOf(rows), ctx);
  const accept = (rows, label) => {
    const v = run(rows);
    assert.deepEqual(v.refusals, [], `${label} must be ACCEPTED; got ${v.refusals.join(" | ")}`);
    assert.equal(v.ok, true, `${label} must be ok`);
  };
  const refuse = (rows, id, re, label) => {
    const v = run(rows);
    assert.equal(v.ok, false, `${label} must be refused; it was accepted`);
    const named = v.refusals.filter(r => r.startsWith(`${id}: `));
    assert.ok(named.some(r => re.test(r)),
      `${label} must refuse ${id} with ${re}; got ${v.refusals.join(" | ") || "(none)"}`);
  };

  // The whole-list answer every refusal below is one row away from.
  accept([rowA, rowB, rowC], "the mirror answer (A move, B pass+home, C move to its parent's project)");
  accept([{ backlog_id: A, verdict: "hold", home: null, need_source: null, need_score: null, reason: "r" }, rowB, rowC],
    "A held instead -- graded, fits, waits its turn");
  accept([rowA, { ...rowB, home: null }, rowC], "B graded but not moved -- a pass with home null");

  // V1 -- a home she was not handed a charter for.
  refuse([{ ...rowA, home: "zagt489-nowhere" }, rowB, rowC], A,
    /home "zagt489-nowhere" is not an active project's slug \(tooling, go-to-market\)/, "V1");
  // V2 -- a grade is not re-answered.
  refuse([{ backlog_id: A, verdict: "pass", home: null, need_source: NSRC, need_score: 4, reason: "r" }, rowB, rowC],
    A, /is already graded; a grade reopens only when its text changes or John reverses it -- answer move or hold/, "V2 pass");
  refuse([{ backlog_id: A, verdict: "not-needed", home: null, need_source: null, need_score: null, reason: "r" }, rowB, rowC],
    A, /is already graded;/, "V2 not-needed");
  // V3 -- a move places a grade, it does not make one.
  refuse([rowA, { backlog_id: B, verdict: "move", home: PARENT_SLUG, need_source: null, need_score: null, reason: "r" }, rowC],
    B, /is ungraded; it is graded first -- answer pass/, "V3");
  // V4 -- a move with nowhere to go.
  refuse([{ ...rowA, home: null }, rowB, rowC], A, /a move names the home it moves into/, "V4");
  // V5 -- hold is for a graded ticket, and it writes nothing.
  refuse([rowA, { backlog_id: B, verdict: "hold", home: null, need_source: null, need_score: null, reason: "r" }, rowC],
    B, /is ungraded; hold is for a graded ticket -- answer pass with home null/, "V5 ungraded");
  refuse([{ backlog_id: A, verdict: "hold", home: PARENT_SLUG, need_source: null, need_score: null, reason: "r" }, rowB, rowC],
    A, /a hold moves nothing and grades nothing; home, need_source and need_score are null/, "V5 a hold that moves");
  refuse([{ backlog_id: A, verdict: "hold", home: null, need_source: NSRC, need_score: 4, reason: "r" }, rowB, rowC],
    A, /a hold moves nothing and grades nothing;/, "V5 a hold that grades");
  // V6 -- a blocker goes where its parent is, and nowhere else.
  refuse([rowA, rowB, { ...rowC, home: HOME }], C,
    new RegExp(`blocks a parent in ${PARENT_SLUG}; its home is ${PARENT_SLUG}`), "V6");
  // V7 -- and it is not held back or stamped no-fit either.
  refuse([rowA, rowB, { backlog_id: C, verdict: "hold", home: null, need_source: null, need_score: null, reason: "r" }],
    C, /it cannot be held or left behind \(d\.11\) -- answer move with that home/, "V7 hold");
  refuse([rowA, rowB, { backlog_id: C, verdict: "no-fit", home: null, need_source: null, need_score: null, reason: "r" }],
    C, /it cannot be held or left behind \(d\.11\)/, "V7 no-fit");
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

  await arm("B the validator's V1-V7 (offline)", async () => { armOffline(); });

  if (!url || !key) {
    notRun("AGT-489 arms A, C and D",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the writer is a database function, the two " +
      "readers are database functions and the rule itself is a skill_profiles row, so there is no " +
      "offline half of any of them (run with " +
      "`node --env-file-if-exists=.env.local tests/regression/run-all.js`)");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }

  // ---- the live shape this door is measured against ------------------------------------------
  const homeRow = await req(url, key, `projects?slug=eq.${HOME}&select=slug,status`);
  assert.ok(homeRow.ok, `${HOME} must read; got ${describe(homeRow)}`);
  const homeEpics = await req(url, key,
    `epics?select=id,created_at,locked_at,projects!inner(slug)&projects.slug=eq.${HOME}&order=created_at.asc`);
  assert.ok(homeEpics.ok, `${HOME}'s epics must read; got ${describe(homeEpics)}`);
  const hp = (homeRow.json ?? [])[0] ?? null;
  const he = homeEpics.json ?? [];
  const shapeOk = hp?.status === "executing" && he.length === 1 &&
    he[0].id === HOME_EPIC_EXPECTED && he[0].locked_at !== null;
  if (!shapeOk) {
    notRun("AGT-489 arms A, C and D",
      `the live board no longer matches the shape this door is measured against (${HOME}: ` +
      `${JSON.stringify(hp)}, ${he.length} epic(s), first ${JSON.stringify(he[0]?.id ?? null)}, ` +
      `locked_at ${JSON.stringify(he[0]?.locked_at ?? null)}) -- a second epic on ${HOME} makes ` +
      "`placement_target()`'s OLDEST-epic rule the thing under test rather than the move, and an " +
      "unlocked one passes AGT-240 outright. Report it, never steer (kickoff §7)");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }
  const HOME_EPIC = he[0].id;

  // The fixtures' list. The primary is the Auditor list this ticket is about; if a trigger refuses
  // the INSERT there, agt-480's list epic is the declared fallback and the fall is PRINTED.
  let LIST_EPIC = LIST_EPIC_PRIMARY;
  const F1 = `${FIXTURE_PREFIX}-1`;
  const F2 = `${FIXTURE_PREFIX}-2`;
  const F3 = `${FIXTURE_PREFIX}-3`;
  const ALL = [F1, F2, F3];
  const SESSION = "agt489-test";
  const NONCE = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const beforeItems = await count(url, key, "backlog_items?select=id");
  const beforeDec = await count(url, key, "runner_decisions?select=id");
  const beforeImg = await count(url, key, "runner_before_images?select=id");
  const residue = [];

  const row = async bid => {
    const r = await req(url, key,
      `backlog_items?backlog_id=eq.${bid}&select=id,epic_id,need_source,need_score,scope_origin,status,description`);
    assert.ok(r.ok, `${bid} must read; got ${describe(r)}`);
    return (r.json ?? [])[0] ?? null;
  };
  const decisions = async (bid, kind) => {
    const r = await req(url, key,
      `runner_decisions?backlog_id=eq.${bid}&reversed_at=is.null&kind=eq.${kind}&select=id,kind`);
    assert.ok(r.ok, `${bid}'s ${kind} decisions must read; got ${describe(r)}`);
    return r.json ?? [];
  };

  try {
    const insert = async epic => {
      for (const n of [1, 2]) {
        const ins = await req(url, key, "backlog_items", { method: "POST", body: ticket(n, epic) });
        if (!ins.ok) return ins;
      }
      const ins3 = await req(url, key, "backlog_items",
        { method: "POST", body: ticket(3, epic, { scope_origin: "john-named" }) });
      return ins3;
    };
    let ins = await insert(LIST_EPIC);
    if (!ins.ok) {
      console.log(`      [fixtures] the ${LIST} epic refused the INSERT (${describe(ins)}); ` +
        `falling back to agt-480's list epic ${LIST_EPIC_FALLBACK}`);
      for (const n of [1, 2, 3]) {
        await req(url, key, `backlog_items?backlog_id=eq.${FIXTURE_PREFIX}-${n}`, { method: "DELETE" });
      }
      LIST_EPIC = LIST_EPIC_FALLBACK;
      ins = await insert(LIST_EPIC);
    }
    assert.ok(ins.ok, `the three fixtures must insert onto a findings list; got ${describe(ins)}`);

    // ---- A. THE WRITER ------------------------------------------------------------------------
    await arm("A move places a graded ticket, grades nothing, and refuses the two it must", async () => {
      const cases = [];
      const casefail = (label, e) => { cases.push(`(${label}) ${e.message}`); console.log(`      (${label}) FAIL -- ${e.message}`); };

      let placement = null;

      // (1) F1 is GRADED by an ordinary pass with NO home -- today's behaviour, unchanged. It stays
      //     on the list; all the pass did was put a standing grade on it.
      try {
        const pass = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: "pass", backlog_id: F1, need_source: NSRC, need_score: 4,
            proposal: `AGT-489 regression probe ${NONCE}`,
            reason: "regression probe: grade it where it sits, then move it",
            account: "Graded one ticket",
          },
        });
        assert.ok(pass.ok, `F1's pass must be accepted; got ${describe(pass)}`);
        const f1 = await row(F1);
        assert.equal(f1.epic_id, LIST_EPIC, "a pass with no home moves nothing");
        assert.equal(f1.need_score, 4, "and carries her score");
        assert.equal(f1.scope_origin, "discovered", "and stamps nothing");
        const standing = await rpc(url, key, "grade_standing");
        assert.ok(standing.ok, `grade_standing() must read; got ${describe(standing)}`);
        assert.ok((standing.json ?? []).some(g => g.backlog_id === F1),
          "and grade_standing() must now NAME F1 -- the newest requirement-check decision is " +
          "unreversed and its before-image's description is still the ticket's");
      } catch (e) { casefail("1 the grade", e); }

      // (2) THE MOVE. The claim in one assertion each: it lands on HOME's locked epic carrying
      //     `victoria-placed`, its grade is untouched, and the ledger gains a `placement` row and
      //     NOT a second `requirement-check` -- which is the whole "grades nothing already graded".
      try {
        const move = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: "move", backlog_id: F1, home_project: HOME,
            reason: "regression probe: a graded ticket is placed, never re-graded",
            account: "Placed one ticket",
          },
        });
        assert.ok(move.ok, `F1's move must be ACCEPTED; got ${describe(move)}`);
        placement = typeof move.json === "string" ? move.json : move.json?.id ?? null;
        assert.ok(placement, `and must return its decision handle; got ${move.text.slice(0, 200)}`);

        const moved = await row(F1);
        assert.equal(moved.epic_id, HOME_EPIC, `the move must put F1 on ${HOME}'s LOCKED epic`);
        assert.equal(moved.scope_origin, "victoria-placed",
          "and stamp it victoria-placed -- which is what tells a DOOR from a removed lock");
        assert.equal(moved.need_score, 4, "and leave her score exactly as it was");
        assert.equal(moved.need_source, NSRC, "and the source with it");

        const checks = await decisions(F1, "requirement-check");
        assert.equal(checks.length, 1,
          `F1 must carry EXACTLY ONE unreversed requirement-check row after the move; it carries ` +
          `${checks.length} -- a second one would mean the move re-graded the ticket`);
        const placements = await decisions(F1, MOVE_KIND);
        assert.equal(placements.length, 1,
          `and exactly one ${MOVE_KIND} row; it carries ${placements.length}`);
      } catch (e) { casefail("2 the move", e); }

      // (3) AN UNGRADED TICKET IS GRADED FIRST. The refusal is the writer's own, not the CLI's.
      try {
        const early = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: "move", backlog_id: F2, home_project: HOME,
            reason: "regression probe: an ungraded ticket may not be moved",
            account: "Tried one move",
          },
        });
        assert.equal(early.ok, false, `F2's move must be REFUSED while it is ungraded; got ${describe(early)}`);
        assert.ok(early.status >= 400 && early.status < 500, `with a 4xx; got ${early.status}`);
        assert.match(early.text, /AGT-489:/, `naming the ticket's rule; got ${early.text.slice(0, 300)}`);
        assert.match(early.text, /graded first/, `and saying what to do; got ${early.text.slice(0, 300)}`);
        const f2 = await row(F2);
        assert.equal(f2.epic_id, LIST_EPIC, "and F2 must not have moved");
        assert.equal(f2.need_score, null, "nor been graded by the refusal");

        // The SAME ticket, one fact changed: grade and home it in one pass. If this half did not
        // land, "the move was refused" would also be what a writer that refuses everything prints.
        const pass = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: "pass", backlog_id: F2, need_source: NSRC, need_score: 3, home_project: HOME,
            proposal: `AGT-489 regression probe ${NONCE}-2`,
            reason: "regression probe: an ungraded ticket is graded and placed in one pass",
            account: "Graded one ticket",
          },
        });
        assert.ok(pass.ok, `F2's pass with a home must be accepted; got ${describe(pass)}`);
        const landed = await row(F2);
        assert.equal(landed.epic_id, HOME_EPIC, "and land it on the home epic");
        assert.equal(landed.scope_origin, "victoria-placed", "with the stamp");
        assert.equal(landed.need_score, 3, "and the score it was sent");
        const checks2 = await decisions(F2, "requirement-check");
        assert.equal(checks2.length, 1, `F2 must carry exactly ONE grade; it carries ${checks2.length}`);
      } catch (e) { casefail("3 ungraded then graded", e); }

      // (4) A TICKET JOHN NAMED IS NEVER MOVED -- `placement_target()`'s first rule, and the one
      //     refusal that has nothing to do with grading.
      try {
        const grade = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: "pass", backlog_id: F3, need_source: NSRC, need_score: 5,
            proposal: `AGT-489 regression probe ${NONCE}-3`,
            reason: "regression probe: grade the john-named ticket where it sits",
            account: "Graded one ticket",
          },
        });
        assert.ok(grade.ok, `F3's pass with no home must be accepted; got ${describe(grade)}`);
        const john = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: "move", backlog_id: F3, home_project: HOME,
            reason: "regression probe: a ticket John named is never moved",
            account: "Tried one move",
          },
        });
        assert.equal(john.ok, false, `F3's move must be REFUSED; got ${describe(john)}`);
        assert.ok(john.status >= 400 && john.status < 500, `with a 4xx; got ${john.status}`);
        assert.match(john.text, /John named/, `naming the rule; got ${john.text.slice(0, 300)}`);
        const f3 = await row(F3);
        assert.equal(f3.epic_id, LIST_EPIC, "and F3 must still be on its list");
        assert.equal(f3.scope_origin, "john-named", "still John's");
      } catch (e) { casefail("4 john-named", e); }

      // (5) THE MOVE IS A PROMISE. One reverse of the PLACEMENT puts the ticket back and leaves the
      //     grade standing -- they are separate decisions, which is the point of the separate kind.
      try {
        assert.ok(placement, "case 2 must have produced a placement handle to reverse");
        const rev = await rpc(url, key, "reverse_decision", {
          p_decision: placement, p_actor: "John",
          p_reason: "AGT-489 regression fixture: undo the probe's placement of F1",
        });
        assert.ok(rev.ok, `reverse_decision on the placement must apply; got ${describe(rev)}`);
        const out = (rev.json ?? [])[0] ?? {};
        assert.equal(out.outcome, "applied", `its outcome must be applied; got ${JSON.stringify(out)}`);
        const back = await row(F1);
        assert.equal(back.epic_id, LIST_EPIC, "F1 must be back on its list");
        assert.equal(back.scope_origin, "discovered", "and the stamp gone with it");
        assert.equal(back.need_score, 4,
          "while the GRADE stands -- it was a different decision, which is why the move got its own kind");
      } catch (e) { casefail("5 the reverse", e); }

      if (cases.length) throw new Error(`${cases.length} case(s) failed:\n      ${cases.join("\n      ")}`);
    });

    // ---- C. THE READER, read-only -------------------------------------------------------------
    await arm("C grade_standing() equals a re-derivation, and --prepare-list agrees with it", async () => {
      const eps = await req(url, key,
        `epics?select=id,projects!inner(slug)&projects.slug=eq.${LIST}&order=id.asc`);
      assert.ok(eps.ok, `${LIST}'s epics must read; got ${describe(eps)}`);
      const epicIds = (eps.json ?? []).map(e => e.id);
      assert.ok(epicIds.length > 0, `${LIST} must have at least one epic`);

      const listed = await req(url, key,
        `backlog_items?epic_id=in.(${epicIds.join(",")})&status=in.(open,partial)` +
        "&select=backlog_id,description,need_score&order=backlog_id.asc&limit=1000");
      assert.ok(listed.ok, `${LIST}'s open/partial tickets must read; got ${describe(listed)}`);
      // The fixtures sit on this list in the primary case; they are not part of the real board, so
      // they are excluded from BOTH sides -- never from one.
      const board = (listed.json ?? []).filter(t => !String(t.backlog_id).startsWith(`${FIXTURE_PREFIX}-`));
      const ids = new Set(board.map(t => String(t.backlog_id)));

      const standing = await rpc(url, key, "grade_standing");
      assert.ok(standing.ok, `grade_standing() must read; got ${describe(standing)}`);
      const fromFn = [...new Set((standing.json ?? []).map(g => String(g.backlog_id)).filter(b => ids.has(b)))].sort();

      // THE RE-DERIVATION, over REST and sharing no code with the function's SQL: for each ticket
      // the NEWEST requirement-check decision, then the before-image taken under it, then its
      // description against today's.
      const derived = [];
      for (const t of board) {
        const bid = String(t.backlog_id);
        const d = await req(url, key,
          `runner_decisions?kind=eq.requirement-check&backlog_id=eq.${bid}` +
          "&order=decided_at.desc&limit=1&select=id,reversed_at");
        assert.ok(d.ok, `${bid}'s newest grade must read; got ${describe(d)}`);
        const newest = (d.json ?? [])[0] ?? null;
        if (!newest || newest.reversed_at !== null) continue;
        const img = await req(url, key,
          `runner_before_images?decision_id=eq.${newest.id}&select=row_data`);
        assert.ok(img.ok, `${bid}'s before-image must read; got ${describe(img)}`);
        const match = (img.json ?? []).some(i =>
          (i?.row_data?.description ?? null) === (t.description ?? null));
        if (match) derived.push(bid);
      }
      derived.sort();
      assert.deepEqual(fromFn, derived,
        `grade_standing() names ${fromFn.length} graded ticket(s) of ${LIST}; the re-derivation ` +
        `names ${derived.length}`);
      console.log(`    [AGT-489 arm C] ${LIST}: ${board.length} open/partial, ${fromFn.length} graded ` +
        "(the function and a REST re-derivation agree, as a sorted set)");

      const parents = await rpc(url, key, "parent_project_of_blockers");
      assert.ok(parents.ok, `parent_project_of_blockers() must read; got ${describe(parents)}`);
      const parentOf = new Map((parents.json ?? []).map(r => [String(r.backlog_id), r.project_slug ?? null]));

      const state = await rpc(url, key, "victoria_charter_state");
      assert.ok(state.ok, `victoria_charter_state() must read; got ${describe(state)}`);
      const cs = Array.isArray(state.json) ? state.json[0] : state.json;
      const stamped = new Set((cs?.stamped ?? []).map(String));

      const gradedSet = new Set(fromFn);
      const expected = board
        .filter(t => !stamped.has(String(t.backlog_id)))
        .filter(t => !gradedSet.has(String(t.backlog_id)) ||
          Number(t.need_score) >= 3 || (parentOf.get(String(t.backlog_id)) ?? null) !== null)
        .map(t => String(t.backlog_id))
        .sort();

      const out = path.join(os.tmpdir(), `agt489-prepare-${NONCE}.md`);
      const r = spawnSync(process.execPath,
        [CHECK, "--prepare-list", `--project=${LIST}`, `--out=${out}`, "--json"],
        { encoding: "utf8" });
      try { fs.unlinkSync(out); } catch { /* the prompt file is not the assertion */ }
      const all = `${r.stdout}${r.stderr}`;
      assert.equal(r.status, 3,
        `--prepare-list must exit 3 (awaiting her one answer); got ${r.status}: ${all.slice(0, 800)}`);
      const head = JSON.parse(r.stdout.trim());
      const offered = (head.context?.proposals ?? [])
        .map(p => String(p.backlog_id))
        .filter(b => !b.startsWith(`${FIXTURE_PREFIX}-`))
        .sort();
      assert.deepEqual(offered, expected,
        "the tickets offered are the ungraded ones plus the graded ones a 3+ score or a parent " +
        "lifts -- nothing else");
      for (const p of head.context?.proposals ?? []) {
        const bid = String(p.backlog_id);
        if (bid.startsWith(`${FIXTURE_PREFIX}-`)) continue;
        assert.equal(p.graded, gradedSet.has(bid), `${bid}'s graded flag must agree with grade_standing()`);
        assert.equal(p.parent_home, parentOf.get(bid) ?? null,
          `${bid}'s parent_home must agree with parent_project_of_blockers()`);
      }
      assert.ok(!offered.some(b => gradedSet.has(b) &&
        Number(board.find(t => t.backlog_id === b)?.need_score) < 3 &&
        (parentOf.get(b) ?? null) === null),
        "and no graded ticket under 3 that no parent lifts is put to her at all");
      console.log(`    [AGT-489 arm C] --prepare-list ${LIST}: exit 3, ${head.tickets} offered, ` +
        `${head.graded} graded, ${head.held_back} held back (model ${head.model})`);
    });

    // ---- D. THE ROW, read-only ----------------------------------------------------------------
    await arm("D the rule is the skill row, not the code", async () => {
      const r = await req(url, key,
        "skill_profiles?slug=eq.vc-reorganize-intent&select=slug,traits,method");
      assert.ok(r.ok, `vc-reorganize-intent must read; got ${describe(r)}`);
      const sp = (r.json ?? [])[0] ?? null;
      assert.ok(sp, "the row must exist");
      const item = sp.traits?.schema?.properties?.rows?.items ?? {};
      assert.deepEqual(item.properties?.verdict?.enum, [...LIST_VERDICTS],
        "the row's enum and the validator's vocabulary are the same five values, in the same order");
      assert.ok((item.required ?? []).includes("home"), `required must name home; got ${JSON.stringify(item.required)}`);
      assert.deepEqual(item.properties?.home?.type, ["string", "null"],
        "and home is a nullable string -- null is the ordinary answer");
      const hits = (sp.method.length - sp.method.split("PLACE AND HOLD").join("").length) / "PLACE AND HOLD".length;
      assert.equal(hits, 1, `method must hold PLACE AND HOLD exactly once; it holds ${hits}`);
      const fit = (sp.method.length - sp.method.split("0. FIT BEFORE GRADE").join("").length) / "0. FIT BEFORE GRADE".length;
      assert.equal(fit, 1, `and AGT-486's 0. FIT BEFORE GRADE exactly once; it holds ${fit}`);
    });
  } finally {
    // ---- the undo, in reverse order, and it runs whatever happened above ----------------------
    //
    // THE DECISIONS ARE QUERIED, NOT REMEMBERED, and BOTH kinds are queried: a placement left
    // standing would hold a fixture on a real project's epic after the row itself was deleted.
    // It runs BEFORE the DELETEs, because reverse_decision() re-INSERTS a row whose image it holds.
    const mine = await req(url, key,
      "runner_decisions?select=id,backlog_id,kind,decided_at&kind=in.(requirement-check,placement)" +
      `&reversed_at=is.null&backlog_id=in.(${ALL.join(",")})&order=decided_at.desc`);
    if (!mine.ok) residue.push(`undo: the fixtures' own decisions must read; got ${describe(mine)}`);
    for (const d of (mine.ok ? (mine.json ?? []) : [])) {
      const rev = await rpc(url, key, "reverse_decision", {
        p_decision: d.id, p_actor: "John",
        p_reason: `AGT-489 regression fixture: undo the probe's ${d.kind} on ${d.backlog_id}`,
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
    else console.log(`      [undo] recompute_backlog_queue moved ${JSON.stringify(requeue.json)} row(s) back to canonical slots`);
  }

  // ---- the counts, re-read ---------------------------------------------------------------------
  const afterItems = await count(url, key, "backlog_items?select=id");
  const afterDec = await count(url, key, "runner_decisions?select=id");
  const afterImg = await count(url, key, "runner_before_images?select=id");
  console.log(`      [counts] backlog_items ${beforeItems} -> ${afterItems}; ` +
    `runner_decisions ${beforeDec} -> ${afterDec}; runner_before_images ${beforeImg} -> ${afterImg}`);
  if (afterItems !== beforeItems) {
    residue.push(`ZERO RESIDUE: backlog_items read ${afterItems}, not ${beforeItems} -- a fixture leaked`);
  }
  const standing = await req(url, key,
    "runner_decisions?select=id,backlog_id,kind&kind=in.(requirement-check,placement)&reversed_at=is.null" +
    `&backlog_id=in.(${ALL.join(",")})`);
  if (!standing.ok || (standing.json ?? []).length !== 0) {
    residue.push(`the fixture left an UNREVERSED grade or placement standing: ${standing.text.slice(0, 300)}`);
  }
  const survivors = await req(url, key,
    `backlog_items?select=backlog_id,epic_id,scope_origin&backlog_id=like.${FIXTURE_PREFIX}-*`);
  if (!survivors.ok || (survivors.json ?? []).length !== 0) {
    residue.push(`a ${FIXTURE_PREFIX} fixture survived the undo: ${survivors.text.slice(0, 300)}`);
  }
  if (residue.length) failures.push(`[residue] ${residue.join("; ")}`);

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
