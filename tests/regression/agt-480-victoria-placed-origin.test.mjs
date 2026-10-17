// DeepBench v7.0.853 | tests/regression/agt-480-victoria-placed-origin.test.mjs | AGT-480 --
// THE VICTORIA-PLACED ORIGIN. Victoria scores a ticket from the Auditor, the Dev Manager, Nathan or
// Jerry, it fits an `executing` project, and she cannot move it there: `epic_lock_guard()` passed
// `scope_origin = 'john-named'`, an unlocked epic, or a project whose `projects.accepts_findings` is
// true, and nothing else. So John's own naming had a door (`AGT-450`) and HERS did not.
//
// THE DEFECT, measured live 2026-10-17 on tree 8bdf754 rather than reasoned about:
//   * `ck_backlog_scope_origin` admitted six values and no `victoria-placed`.
//   * `epic_lock_guard()` (md5 05432ca5c8c72907cef83d676cc9c6a2) passed `john-named` only.
//   * `scripts/requirement-check.js:506` refused a non-`john:` `--home` outright.
//   * and `accepts_findings` is FALSE on every executing project on the board, so in practice the
//     flag was not a second door either -- the only project carrying it (`agent-training`) is
//     paused.
// Net effect: a scored, traceable, non-John need waited on a findings list nobody builds from.
//
// THE FIX, and the one thing it is NOT: a seventh `scope_origin` value the lock accepts, written in
// exactly ONE place -- Victoria's move door, marked by a TRANSACTION-LOCAL token
// (`set_config('deepbench.victoria_door', …, true)`). It does NOT switch on `accepts_findings`
// (John, decision 25 of `docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md`), and it widens the lock
// for nobody else: every other writer is refused by `scope_origin_door()` before the lock is even
// reached. Mirror: `docs/design/agt-480-victoria-placed-origin.sql`.
//
// THE FOUR ARMS, and what each one can prove ALONE:
//   A  THE DOOR, live (kickoff §6.1). F1 through `rpc/apply_requirement_verdict` with a nathan:
//      source onto a LOCKED executing epic. On the unchanged tree this is refused with
//      `AGT-240: epic Go-to-Market is locked`; after this ship it must land on the home epic, read
//      back `scope_origin = 'victoria-placed'` and carry her score -- and ONE `reverse_decision()`
//      must put the move, the stamp and the score all back, because all three travel in the same
//      before-image as `epic_id`.
//   B  EVERY OTHER WRITER, live (kickoff §6.2). The SAME value, the SAME table, the SAME service
//      key -- by hand instead of through her door. Four writes, each refused. This is the half that
//      makes arm A mean "the door opened" rather than "the lock was removed": without it, a
//      migration that deleted `epic_lock_guard()`'s body entirely would pass arm A perfectly.
//   C  THE CLI, live (kickoff §6.3), no model turn either way. `--prepare` decides the destination
//      BEFORE any spend, so its refusal has to move for the same reason the writer's did: exit 3 on
//      the executing home, and still exit 1 on a home that is not executing.
//   D  PURE, zero network. `homeAccepts(row)`'s one limb, over rows that differ in the two columns
//      AGT-480 stopped reading.
//
// WHY A PAIR AND NEVER A SINGLE CASE (the LOO-013 lesson, STANDARDS.md Section 4): "the move was
// accepted" is also what a removed lock, a dropped trigger and a widened CHECK constraint would all
// say. Only a refusal measured in the same run, on the same table, with the same key, can tell a
// DOOR from a HOLE. Arm B is that refusal, and arm A asserts WHICH BRANCH fired by reading the
// stamp back rather than by observing that nothing raised.
//
// RESIDUE, DECLARED (never discovered later).
//   * `backlog_items` -- ZERO. Every fixture carries an explicit `epic_id` (so
//     `backlog_home_intake()` returns early and no `Intake -- Z…` epic is created) and a
//     `source_file` under `tests/regression/`, which matches `tests/regression/%` in
//     `runner_settings.ticket_filing_exempt_sources`, so AGT-238's deferred-filing rule decides no
//     case here. All three ids are deleted and the table's exact count is re-read.
//   * `runner_decisions` / `runner_before_images` -- NOT EQUAL, by design, exactly as in
//     `agt-450-john-source-door.test.mjs`: `reverse_decision()` does not delete a decision, it
//     inserts its own `kind='reversal'` row and images the one it reverses, and both tables are
//     deliberately outside its own allowlist. So the ledger GROWS. What is asserted instead is the
//     invariant a leak would break: after the undo, NO unreversed `requirement-check` decision
//     names any fixture. The deltas are printed as numbers.
//   * `audit_findings` -- ZERO. No arm here files a `not-needed`.
//   * `governance_rules` / the three functions -- UNTOUCHED. This file writes no DDL and no rule
//     text; the migration's own GATE and the mirror's AFTER md5s cover those.
//
// FIXTURE CONCURRENCY (SES-382), on the `agt-450` / `agt-309` / `agt-280-requirement-gate`
// precedent: F1 is pickable for the few hundred ms between the pass and the reverse. It is also why
// every fixture carries `priority_class = 'P6 - Agent Enhancement'` rather than this ticket's own
// `P10 - Tooling`: `ladder_work_class('P6 …')` is NULL, so the pass decision carries no rung and
// the reversal cannot DEMOTE a real ladder class on every run (pattern:76 -- a test run never
// mutates working data).
//
// LETTERS ONLY BEFORE THE DASH: `runner_decisions_backlog_id_check` is `^[A-Z]+-[0-9]+[a-z]?$`, and
// arm A records a decision ON a fixture, so `ZAGTVP-n` has to be nameable by one.
//
// WHY NO ROLLED-BACK TRANSACTION, the same wall as agt-450's, agt-309's and agt-280's: this suite
// reaches Supabase only over PostgREST, which cannot open one (`Prefer: tx=rollback` was probed
// against this project at the AGT-280 ship and was NOT honoured). Hence refuse-or-write-then-undo
// with the counts re-read.

import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { homeAccepts, homeNotExecutingRefusal } from "../../scripts/audit-review.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHECK = path.join(REPO, "scripts", "requirement-check.js");

// NSRC, from kickoff §2 -- Nathan's market record. A traceable source that is NOT John's, which is
// the entire population AGT-480 exists for: before this ship it had no door into any executing
// list, and `need_source_is_traceable()` already says yes to it, so nothing here turns on intake.
const NSRC = "nathan:market_records:fbaa1d6e-06e4-4015-b0fe-b4915fa7bfef";

// HOME is the shape this ticket exists for: executing, `accepts_findings` FALSE, exactly ONE epic
// (the writer's own `v_rc <> 1` rule, which AGT-480 did not touch), and that epic LOCKED. Read live
// below, so a change to the board shows up as a named not-run rather than a mystery failure.
const HOME = "go-to-market";
const LIST_PROJECT = "dev-mgr-findings";   // planned -- the findings list a ticket waits on

const FIXTURE_PREFIX = "ZAGTVP";
const SOURCE_FILE = "tests/regression/agt-480-victoria-placed-origin.test.mjs";

// ---------------------------------------------------------------------------------------------
// transport (agt-450-john-source-door.test.mjs's shape, column for column)
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

// One fixture ticket body, agt-450's `ticket()` with this ticket's own ids and source file.
// `scope_origin` is spelled out as `discovered` rather than inherited, because it is the column the
// whole ticket turns on: arm A is only meaningful if the row did NOT start out carrying the stamp.
function ticket(n, epicId, extra) {
  return {
    backlog_id: `${FIXTURE_PREFIX}-${n}`,
    tier: "next",
    type: "Tooling",
    priority_class: "P6 - Agent Enhancement",
    title: `AGT-480 victoria-placed probe ${n}`,
    status: "open",
    epic_id: epicId,
    source_file: SOURCE_FILE,
    scope_origin: "discovered",
    size_stamp: "S",
    defer_status: "no",
    scope_rationale: "regression probe",
    enhancement_claim: "none: probe",
    queue: 999480000 + n,
    row_ordinal: 999480000 + n,
    ...extra,
  };
}

// ---------------------------------------------------------------------------------------------
// Arm D -- PURE (zero network). The one limb homeAccepts() has left.
// ---------------------------------------------------------------------------------------------

function armPure() {
  // The rows differ in exactly the two things AGT-480 stopped reading -- `accepts_findings` and
  // (via the dropped second argument) the need_source. Both executing rows must be homes, which is
  // the only way to tell a REMOVED limb from one that still reads the column and happens to agree;
  // the non-executing rows are what keep that from reading as "it stopped refusing anything".
  const EXEC_LOCKED = { slug: HOME, status: "executing", accepts_findings: false };
  const EXEC_ACCEPTS = { slug: "agent-training", status: "executing", accepts_findings: true };
  const PLANNED = { slug: LIST_PROJECT, status: "planned", accepts_findings: false };

  assert.equal(homeAccepts(EXEC_LOCKED), true,
    "an executing project that does NOT accept findings IS a home -- Victoria places the ticket");
  assert.equal(homeAccepts(EXEC_ACCEPTS), true, "and so is one that does");
  assert.equal(homeAccepts({ slug: HOME, status: "executing" }), true,
    "and a context row carrying no accepts_findings at all -- the column is not read (AGT-480)");
  assert.equal(homeAccepts(PLANNED), false,
    "`executing` is the one limb left, and it is still READ: a planned project is no destination");
  assert.equal(homeAccepts({ slug: HOME, status: "proposed", accepts_findings: true }), false,
    "nor a proposed one");
  assert.equal(homeAccepts({ slug: HOME, status: "done", accepts_findings: true }), false,
    "nor a finished one");
  assert.equal(homeAccepts({ slug: HOME, status: "paused", accepts_findings: true }), false,
    "nor a paused one -- which is what agent-training actually is today");

  // Fails CLOSED, which is the direction that matters: a missing row is never a home.
  assert.equal(homeAccepts(undefined), false, "no row at all is not a home");
  assert.equal(homeAccepts(null), false, "and neither is a null one");
  assert.equal(homeAccepts({ slug: HOME }), false, "a row carrying no status is not executing");

  // THE SECOND ARGUMENT IS GONE, not ignored-but-accepted. The same row must answer identically
  // however it is called, so a function that still branched on a citation would move one of these.
  for (const src of [NSRC, "john:runner_decisions:x", undefined, null, ""]) {
    assert.equal(homeAccepts(EXEC_LOCKED, src), true,
      `the executing row is a home whatever is cited; ${JSON.stringify(src)} moved it`);
    assert.equal(homeAccepts(PLANNED, src), false,
      `and the planned row is not, whatever is cited; ${JSON.stringify(src)} moved it`);
  }

  // The refusal the review prints names the one limb that is left, and NEITHER removed one -- a
  // manager told "it does not accept findings" would go looking for a flag that decides nothing.
  const refusal = homeNotExecutingRefusal(LIST_PROJECT);
  assert.equal(refusal, `home ${LIST_PROJECT} is not an executing project (AGT-240, AGT-480)`,
    `the refusal is kickoff §4's R1 verbatim; got ${JSON.stringify(refusal)}`);
  assert.ok(!refusal.includes("accepts findings") && !refusal.includes("john: source"),
    `and names neither removed limb; got ${JSON.stringify(refusal)}`);
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

  await arm("D homeAccepts' one remaining limb (pure)", async () => { armPure(); });

  if (!url || !key) {
    notRun("AGT-480 arms A, B and C",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the writer is a database function, both " +
      "doors are database triggers and `--prepare` reads the board over PostgREST, so there is no " +
      "offline half of any of them (run with " +
      "`node --env-file-if-exists=.env.local tests/regression/run-all.js`)");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }

  // ---- the live shape this path is measured against ------------------------------------------
  const projects = await req(url, key,
    `projects?select=slug,name,status,accepts_findings&slug=in.(${HOME},${LIST_PROJECT})&order=slug.asc`);
  assert.ok(projects.ok, `the two projects must read; got ${describe(projects)}`);
  const bySlug = new Map((projects.json ?? []).map(p => [p.slug, p]));

  const epicsOf = async slug => {
    const r = await req(url, key,
      `epics?select=id,name,locked_at,projects!inner(slug,status,accepts_findings)&projects.slug=eq.${slug}&order=id.asc`);
    assert.ok(r.ok, `${slug}'s epics must read; got ${describe(r)}`);
    return r.json ?? [];
  };
  const homeEpics = await epicsOf(HOME);
  const listEpics = await epicsOf(LIST_PROJECT);

  // The shape, every clause of it load-bearing: HOME executing (the one limb that still refuses),
  // NOT accepting findings (so AGT-264's branch cannot be what lets the move through), exactly ONE
  // epic (the writer's own `v_rc <> 1` rule, untouched here), and that epic LOCKED (so AGT-240 is
  // genuinely in the way and arm A measures the new clause rather than an open gate). LIST not
  // executing, so the fixtures start somewhere a ticket may legally sit.
  const homeRow = bySlug.get(HOME);
  const shapeOk =
    homeRow?.status === "executing" && homeRow?.accepts_findings !== true &&
    homeEpics.length === 1 && homeEpics[0].locked_at !== null &&
    bySlug.get(LIST_PROJECT)?.status !== "executing" && listEpics.length === 1;

  if (!shapeOk) {
    notRun("AGT-480 arms A, B and C",
      `the live board no longer matches the shape this door is measured against ` +
      `(${HOME}: ${JSON.stringify(homeRow ?? null)}, ${homeEpics.length} epic(s), ` +
      `locked_at ${JSON.stringify(homeEpics[0]?.locked_at ?? null)}; ` +
      `${LIST_PROJECT}: ${JSON.stringify(bySlug.get(LIST_PROJECT) ?? null)}, ${listEpics.length} epic(s)) ` +
      `-- asserting against a substitute would measure something else: an UNLOCKED home passes ` +
      `AGT-240 outright and an ACCEPTING one passes on AGT-264's limb, and neither proves anything ` +
      `about Victoria's door`);
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }

  const HOME_EPIC = homeEpics[0].id;
  const LIST_EPIC = listEpics[0].id;
  const F1 = `${FIXTURE_PREFIX}-1`;
  const F2 = `${FIXTURE_PREFIX}-2`;
  const F3 = `${FIXTURE_PREFIX}-3`;
  const SESSION = "agt-480-regression";
  const NONCE = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const beforeItems = await count(url, key, "backlog_items?select=id");
  const beforeDec = await count(url, key, "runner_decisions?select=id");
  const beforeImg = await count(url, key, "runner_before_images?select=id");
  const residue = [];

  const row = async bid => {
    const r = await req(url, key,
      `backlog_items?backlog_id=eq.${bid}&select=id,epic_id,need_source,need_score,scope_origin,status`);
    assert.ok(r.ok, `${bid} must read; got ${describe(r)}`);
    return (r.json ?? [])[0] ?? null;
  };

  let passDecision = null;
  try {
    for (const n of [1, 2]) {
      const ins = await req(url, key, "backlog_items", { method: "POST", body: ticket(n, LIST_EPIC) });
      assert.ok(ins.ok, `fixture ${n} must insert onto the ${LIST_PROJECT} list; got ${describe(ins)}`);
    }

    // ---- A. THE DOOR (kickoff §6.1) -----------------------------------------------------------
    await arm("A Victoria's pass places a non-john source onto a locked list", async () => {
      const cases = [];
      const casefail = (label, e) => { cases.push(`(${label}) ${e.message}`); console.log(`      (${label}) FAIL -- ${e.message}`); };

      const f1Start = await row(F1);
      assert.equal(f1Start.epic_id, LIST_EPIC, "F1 starts on the findings list");
      assert.equal(f1Start.scope_origin, "discovered",
        "and NOT carrying the stamp -- the writer must put it there, which is the whole claim");
      assert.equal(f1Start.need_score, null, "and with no score, because nobody has ruled it");

      // (a) THE PASS. On the unchanged tree this is REFUSED with
      //     `AGT-240: epic Go-to-Market is locked; the finding waits on the findings list`, and
      //     that refusal IS the defect: a ticket Victoria scored cannot reach a list it fits.
      try {
        const pass = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: "pass", backlog_id: F1, need_source: NSRC, need_score: 4,
            proposal: `AGT-480 regression probe ${NONCE}`,
            reason: "regression probe: Victoria places a scored non-john need onto the executing list",
            account: "Ruled one proposal", home_project: HOME,
          },
        });
        assert.ok(pass.ok,
          `a pass citing a nathan: source and homed to ${HOME} must be ACCEPTED; got ${describe(pass)} ` +
          `-- a refusal naming AGT-240 is the defect AGT-480 closes`);
        passDecision = typeof pass.json === "string" ? pass.json : pass.json?.id ?? null;
        assert.ok(passDecision, `and must return its decision handle; got ${pass.text.slice(0, 200)}`);

        const moved = await row(F1);
        assert.equal(moved.epic_id, HOME_EPIC,
          `the pass must MOVE F1 onto ${HOME}'s LOCKED epic; it is still on ${moved.epic_id}`);
        // WHICH BRANCH FIRED, not merely that nothing raised: a removed lock, a dropped trigger or
        // a widened constraint would all let the move through and write NO stamp at all.
        assert.equal(moved.scope_origin, "victoria-placed",
          "and STAMP it victoria-placed -- that value is what the lock reads, so it has to be on " +
          "the row the move wrote, and it is also what tells a DOOR from a removed lock");
        assert.equal(moved.need_score, 4, "and carry her score");
        assert.equal(moved.need_source, NSRC, "and the source she echoed");
      } catch (e) { casefail("a the pass", e); }

      // (b) THE UNDO IS ONE CALL. `scope_origin` travels in the same before-image as `epic_id` and
      //     `need_score`, so a single reverse puts all three back -- no second cleanup write. It
      //     also proves the door does not trap the row: a placed ticket is still reversible.
      try {
        assert.ok(passDecision, "(a) must have recorded a decision for (b) to reverse");
        const rev = await rpc(url, key, "reverse_decision", {
          p_decision: passDecision, p_actor: "John",
          p_reason: `AGT-480 regression fixture: undo the probe's verdict on ${F1}`,
        });
        assert.ok(rev.ok, `reverse_decision must answer; got ${describe(rev)}`);
        const out = (rev.json ?? [])[0] ?? {};
        assert.equal(out.outcome, "applied",
          `and must APPLY the reversal; got ${JSON.stringify(out)}`);
        console.log(`      [undo] reverse_decision ${passDecision} (${F1}): outcome=${out.outcome} ` +
          `restored=${out.restored} unverified=${out.restored_unverified} refused=${out.refused}`);

        const back = await row(F1);
        assert.equal(back.epic_id, LIST_EPIC, "F1 is back on the findings list");
        assert.equal(back.scope_origin, "discovered", "and the stamp is gone with the move");
        assert.equal(back.need_score, null, "and the score with it");
        passDecision = null;
      } catch (e) { casefail("b the one-call undo", e); }

      if (cases.length) throw new Error(`${cases.length} case(s) failed:\n      ${cases.join("\n      ")}`);
    });

    // ---- B. EVERY OTHER WRITER (kickoff §6.2) -------------------------------------------------
    //
    // THE SAME VALUE, THE SAME TABLE, THE SAME SERVICE KEY -- by hand instead of through her door.
    // This is the half that makes arm A mean "the door opened". The service key is the MOST
    // privileged credential the platform holds, so a refusal here is a refusal to everybody.
    await arm("B the value is unwritable outside Victoria's door", async () => {
      const cases = [];
      const casefail = (label, e) => { cases.push(`(${label}) ${e.message}`); console.log(`      (${label}) FAIL -- ${e.message}`); };

      const f2Start = await row(F2);
      const itemsBefore = await count(url, key, "backlog_items?select=id");

      const patch = async (label, body, expect) => {
        try {
          const r = await req(url, key, `backlog_items?backlog_id=eq.${F2}`,
            { method: "PATCH", body, prefer: "return=representation" });
          assert.ok(!r.ok && r.status >= 400 && r.status < 500,
            `${label} must be refused with a 4xx; got ${describe(r)}`);
          assert.ok(expect.test(r.text),
            `${label} must be refused by ${expect} -- the refusal sentence is which door fired; ` +
            `got ${describe(r)}`);
          console.log(`      (${label}) refused: HTTP ${r.status} ${r.text.slice(0, 140)}`);
        } catch (e) { casefail(label, e); }
      };

      // 1. THE STAMP ALONE. No epic move at all, so neither AGT-240 nor AGT-309 is in play and the
      //    ONLY thing that can refuse this is scope_origin_door() -- which is what the assertion
      //    pins. A hand-set origin is the whole attack this ticket had to close: the value is
      //    legal in the column now, and legality is not permission.
      await patch("1 scope_origin alone", { scope_origin: "victoria-placed" }, /AGT-480:/);

      // 2. THE MOVE ALONE, no stamp. AGT-240's lock is untouched for everybody else, which is the
      //    guarantee AGT-480 had to preserve: the locked list still refuses an unstamped move.
      await patch("2 epic_id alone", { epic_id: HOME_EPIC }, /AGT-240:/);

      // 3. BOTH AT ONCE -- the obvious way around (1) and (2) taken together. Either door may
      //    answer first (BEFORE row triggers fire in name order, so epic_lock_guard precedes
      //    scope_origin_door); the assertion is that ONE of them does, not which.
      await patch("3 both at once", { scope_origin: "victoria-placed", epic_id: HOME_EPIC },
        /AGT-(240|480):/);

      // 4. AND ON THE WAY IN. The door is BEFORE INSERT OR UPDATE OF scope_origin, so a brand-new
      //    row cannot be born carrying the stamp either -- otherwise the whole refusal above is one
      //    DELETE and one POST away from being pointless.
      try {
        const ins = await req(url, key, "backlog_items",
          { method: "POST", body: ticket(3, LIST_EPIC, { scope_origin: "victoria-placed" }) });
        assert.ok(!ins.ok && ins.status >= 400 && ins.status < 500,
          `an INSERT carrying the stamp must be refused with a 4xx; got ${describe(ins)}`);
        assert.ok(/AGT-480:/.test(ins.text),
          `and refused by scope_origin_door(); got ${describe(ins)}`);
        assert.equal(await row(F3), null, `and ${F3} must not exist`);
        console.log(`      (4 INSERT with the stamp) refused: HTTP ${ins.status} ${ins.text.slice(0, 140)}`);
      } catch (e) { casefail("4 INSERT with the stamp", e); }

      // NOTHING WRITTEN by any of the four. Every refusal above is a rolled-back statement, so F2
      // must read exactly as it was inserted and the table's count must not have moved.
      try {
        const f2 = await row(F2);
        assert.equal(f2.epic_id, f2Start.epic_id, "NOTHING WRITTEN: F2 stays on the findings list");
        assert.equal(f2.scope_origin, "discovered", "and takes no stamp");
        assert.equal(f2.need_score, null, "and no score");
        assert.equal(await count(url, key, "backlog_items?select=id"), itemsBefore,
          "and the refused INSERT left no row behind");
      } catch (e) { casefail("5 nothing written", e); }

      if (cases.length) throw new Error(`${cases.length} case(s) failed:\n      ${cases.join("\n      ")}`);
    });

    // ---- C. THE CLI, before any model turn (kickoff §6.3) -------------------------------------
    await arm("C requirement-check --prepare admits any executing home", async () => {
      const prepare = home => {
        const r = spawnSync(process.execPath,
          [CHECK, "--prepare", `--ticket=${F1}`, `--source=${NSRC}`, `--home=${home}`, "--json"],
          { encoding: "utf8" });
        return { status: r.status, out: `${r.stdout}${r.stderr}`, stdout: r.stdout };
      };

      // (a) the executing home. Exit 3 is `--prepare`'s own "awaiting her answer" code, so this is
      //     the destination being ACCEPTED -- and no turn has been spent reaching it. It exited 1
      //     before this ship, for a nathan: source on any home at all.
      const ok = prepare(HOME);
      assert.equal(ok.status, 3,
        `--prepare with a nathan: source and --home=${HOME} must exit 3 (it exited 1 before ` +
        `AGT-480); got ${ok.status}: ${ok.out.slice(0, 600)}`);
      assert.ok(ok.out.includes(`would be homed to ${HOME}`),
        `and say where the pass would send it; got ${ok.out.slice(0, 600)}`);
      const head = JSON.parse(ok.stdout.trim());
      assert.equal(head.home, HOME, "and the task_context head must carry the home it accepted");
      assert.equal(head.source, NSRC, "and the source it was handed");
      assert.ok(head.model, "and name the model the turn would run on, never a hardcoded id (AGT-147)");

      // (b) the control, ONE argument moved -- a home that is not executing. Still exit 1, still at
      //     step 2b, and the refusal names the one limb that is left. Without this half, "exit 3"
      //     is also what a step 2b that checked nothing at all would print.
      const refused = prepare(LIST_PROJECT);
      assert.equal(refused.status, 1,
        `--prepare with --home=${LIST_PROJECT} (planned) must still exit 1; ` +
        `got ${refused.status}: ${refused.out.slice(0, 600)}`);
      assert.ok(refused.out.includes(`--home ${LIST_PROJECT} is not an executing project (AGT-240, AGT-480)`),
        `and carry kickoff §4's R1 verbatim; got ${refused.out.slice(0, 600)}`);
      assert.ok(!refused.out.includes("would be homed to"),
        `and must NOT reach the assembly; got ${refused.out.slice(0, 600)}`);
      console.log(`    [AGT-480 arm C] exit 3 on --home=${HOME} (${head.prompt_bytes} prompt bytes, ` +
        `model ${head.model}); exit 1 on --home=${LIST_PROJECT}`);
    });
  } finally {
    // ---- the undo, in reverse order, and it runs whatever happened above ----------------------
    //
    // THE DECISIONS ARE QUERIED, NOT REMEMBERED (agt-309's own first-run lesson, kept by agt-450):
    // a case that wrote a decision the arm did not expect would otherwise leave it STANDING on the
    // real ledger, naming a fixture that has already been deleted. IT RUNS BEFORE THE DELETEs,
    // because `reverse_decision()` re-INSERTS a row whose image it holds -- undoing after a delete
    // resurrects the fixture instead of reversing the effect.
    const mine = await req(url, key,
      "runner_decisions?select=id,backlog_id,decided_at&kind=eq.requirement-check" +
      `&reversed_at=is.null&backlog_id=in.(${F1},${F2},${F3})&order=decided_at.desc`);
    if (!mine.ok) residue.push(`undo: the fixtures' own decisions must read; got ${describe(mine)}`);
    for (const d of (mine.ok ? (mine.json ?? []) : [])) {
      const rev = await rpc(url, key, "reverse_decision", {
        p_decision: d.id, p_actor: "John",
        p_reason: `AGT-480 regression fixture: undo the probe's verdict on ${d.backlog_id}`,
      });
      if (!rev.ok) { residue.push(`undo: reverse_decision(${d.id}) -> ${describe(rev)}`); continue; }
      const out = (rev.json ?? [])[0] ?? {};
      console.log(`      [undo] reverse_decision ${d.id} (${d.backlog_id}): outcome=${out.outcome} ` +
        `restored=${out.restored} unverified=${out.restored_unverified} refused=${out.refused}`);
    }
    for (const n of [1, 2, 3]) {
      const del = await req(url, key, `backlog_items?backlog_id=eq.${FIXTURE_PREFIX}-${n}`, { method: "DELETE" });
      if (!del.ok) residue.push(`undo: fixture ${n} must delete; got ${describe(del)}`);
    }
    // AND THE QUEUE IS PUT BACK. `reverse_decision()` calls `recompute_backlog_queue()` whenever it
    // restores a backlog_items row, and that is a deterministic FULL renumber of every eligible
    // ticket -- so it ran with the fixtures still present and shifted real rows. Running it again
    // now that they are gone returns the board to the numbering it would have had if this test had
    // never run (pattern:76). The count it returns is printed, never asserted: how many rows move
    // depends on what the rest of the board did meanwhile.
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
    "runner_decisions?select=id,backlog_id,status&kind=eq.requirement-check&reversed_at=is.null" +
    `&backlog_id=in.(${F1},${F2},${F3})`);
  if (!standing.ok || (standing.json ?? []).length !== 0) {
    residue.push(`the fixture left an UNREVERSED requirement-check decision standing: ${standing.text.slice(0, 300)}`);
  }
  // And no fixture may be left carrying the stamp anywhere on the board.
  const stamped = await req(url, key,
    `backlog_items?select=backlog_id,scope_origin&backlog_id=like.${FIXTURE_PREFIX}-*`);
  if (!stamped.ok || (stamped.json ?? []).length !== 0) {
    residue.push(`a ${FIXTURE_PREFIX} fixture survived the undo: ${stamped.text.slice(0, 300)}`);
  }
  if (residue.length) failures.push(`[residue] ${residue.join("; ")}`);

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
