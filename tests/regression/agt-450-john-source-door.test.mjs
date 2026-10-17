// DeepBench v7.0.853 | tests/regression/agt-450-john-source-door.test.mjs | AGT-480 -- THE LIMB
// THIS FILE MEASURED IS GONE, so every expectation here is re-measured rather than deleted.
// Victoria's move door writes `scope_origin = 'victoria-placed'` for every non-john source and
// `epic_lock_guard()` admits it, so: arm 1 (b)'s nathan: control is now ACCEPTED and the
// discriminator moves to the STAMP (`john-named` on (a), `victoria-placed` on (b) -- a weakened
// lock would write neither); arm 2 (b) exits 3 like (a); and arm 3's `homeAccepts()` takes ONE
// argument. The CLI refusal that used to live in arm 2 (b) is measured live in
// `agt-480-victoria-placed-origin.test.mjs` arm C, by the input that still refuses.
// NOTE, measured 2026-10-17 and unchanged by this ship: arms 1 and 2 are NOT RUN on today's board,
// because `tooling` carries 2 epics and the writer's own one-epic rule makes it unreachable by
// `home_project` at all (AGT-480 harvest section 6, FILED not fixed). Arm 3 runs. AGT-480's own
// guard is written against `go-to-market`, which has exactly one epic, and is where the live
// victoria-placed door is actually proven.
//
// DeepBench v7.0.846 | tests/regression/agt-450-john-source-door.test.mjs | AGT-450 --
// THE JOHN-SOURCE DOOR. A need_source John himself wrote (`john:<table>:<id>`) is John naming the
// ticket, and `epic_lock_guard()` has always admitted his naming outright -- its own second line:
// "John naming a ticket into it is his own call (john-named passes)". But nothing ever WROTE that
// value, so his naming could not reach the door.
//
// THE DEFECT, measured live 2026-10-11 on tree 5963c52 rather than reasoned about.
//   * `scripts/requirement-check.js:495` refused `--home` unless the project read
//     `status = 'executing' AND accepts_findings = true`. Live, the only project that passes both
//     is `agent-training`, and it is PAUSED -- so no slug passed at all and `--home` was a flag
//     with no legal value.
//   * `apply_requirement_verdict()` (md5 87a58305d08b12b6eec33edc437dfb0e) moved the ticket with
//     `epic_id` and `updated_at` only. It never wrote `scope_origin`, so the row arriving at
//     `epic_lock_guard()` still read `discovered` and AGT-240's lock refused the move -- which
//     rolls the WHOLE verdict back, score and all.
//   * `scripts/audit-review.js`'s `homeAccepts()` held the same one-limb condition, so the Dev
//     Manager's review could not even PROPOSE John's destination.
// Net effect: a fix John himself called for had no door into an executing list and waited on a
// parked findings list nobody builds from.
//
// THE THREE ARMS, and what each one can prove ALONE:
//   1  THE DISCRIMINATOR, live (kickoff §6.1). A fixture PAIR differing in exactly one field --
//      the need_source, `john:runner_decisions:…` vs `nathan:market_records:…` -- over the SAME
//      home (`tooling`, executing, accepts_findings FALSE, the shape that had no door). The john:
//      one must pass, land on the Tooling epic, and read back `scope_origin = 'john-named'`; the
//      nathan: one must still be refused BY AGT-240's lock with nothing written. Then one
//      `reverse_decision()` must put `epic_id`, `scope_origin` and `need_score` all back -- the
//      stamp travels in the same before-image as the move, so the undo is one call, not two.
//   2  THE CLI, live (kickoff §6.2). `--prepare` decides the destination BEFORE any model turn, so
//      the same pair run through `scripts/requirement-check.js` must move the exit code from 1 to
//      3 on the john: source and stay 1 on the nathan: one, naming the second limb in its refusal.
//      No turn is spent either way: the refusal is step 2b and the pass exits 3 awaiting an answer.
//   3  PURE, zero network (kickoff §6.3). `homeAccepts(row, needSource)`'s three units, on the SAME
//      two rows, so the limb is pinned by WHICH INPUT moved the answer. The flipped
//      `validateReview()` case lives in `agt-309-process-break-class.test.mjs` arm A, which this
//      ship edited in the same commit.
//
// WHY A PAIR AND NEVER A SINGLE CASE (the LOO-013 lesson, STANDARDS.md Section 4): "the john:
// source was accepted" is also what a `homeAccepts()` that stopped checking anything would say, and
// what a lock that was weakened would say. Only the nathan: half, refused on the same home in the
// same run, can tell the new limb from a removed condition. Every arm here carries both halves.
//
// RESIDUE, DECLARED (never discovered later).
//   * `backlog_items` -- ZERO. Both fixtures carry an explicit `epic_id` (so
//     `backlog_home_intake()` returns early and no `Intake -- Z…` epic is created) and a
//     `source_file` under `tests/regression/`, which matches `tests/regression/%` in
//     `runner_settings.ticket_filing_exempt_sources`, so AGT-238's deferred-filing rule is not what
//     decides any case here. Both rows are deleted and the table's exact count is re-read.
//   * `runner_decisions` / `runner_before_images` -- NOT EQUAL, and that is by design, not a leak.
//     `reverse_decision()` does not delete a decision: it inserts its own `kind='reversal'` row and
//     images the one it reverses, and both tables are deliberately outside its own allowlist. So
//     the ledger GROWS. What is asserted instead is the invariant a leak would break: after the
//     undo, NO unreversed `requirement-check` decision names either fixture. The deltas are printed
//     as numbers.
//   * `audit_findings` -- ZERO. No arm here files a `not-needed`.
//
// FIXTURE CONCURRENCY (SES-382), on the `agt-309` / `agt-280-requirement-gate` precedent: F1 is
// pickable for the few hundred ms between the pass and the reverse. It is also why both fixtures
// carry `priority_class = 'P6 - Agent Enhancement'` rather than this ticket's own `P10 - Tooling`:
// `ladder_work_class('P6 …')` is NULL, so the pass decision carries no rung and the reversal cannot
// DEMOTE a real ladder class on every run (pattern:76 -- a test run never mutates working data).
//
// LETTERS ONLY BEFORE THE DASH: `runner_decisions_backlog_id_check` is `^[A-Z]+-[0-9]+[a-z]?$`, and
// arm 1 records a decision ON a fixture, so `ZAGTJD-n` has to be nameable by one.
//
// WHY NO ROLLED-BACK TRANSACTION, the same wall as agt-280's and agt-309's: this suite reaches
// Supabase only over PostgREST, which cannot open one (`Prefer: tx=rollback` was probed against this
// project at the AGT-280 ship and was NOT honoured). Hence refuse-or-write-then-undo with the counts
// re-read.

import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { homeAccepts, homeNotExecutingRefusal } from "../../scripts/audit-review.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHECK = path.join(REPO, "scripts", "requirement-check.js");

// THE PAIR, from kickoff §2. JSRC is a John ruling; NSRC is Nathan's market record. Both pairs are
// in `runner_settings.need_source_kinds` and both rows are traceable, so the ONLY thing that differs
// between every (a) and (b) case below is the first segment of the citation.
const JSRC = "john:runner_decisions:5498b8d9-6dcd-4bce-abfb-e3ef798cf35f";
const NSRC = "nathan:market_records:fbaa1d6e-06e4-4015-b0fe-b4915fa7bfef";

// HOME is the shape this ticket exists for: executing, and `accepts_findings` FALSE. Read live
// below, so a change to the board shows up as a named not-run rather than a mystery failure.
const HOME = "tooling";
const LIST_PROJECT = "dev-mgr-findings";   // planned -- the findings list a ticket waits on

const FIXTURE_PREFIX = "ZAGTJD";
const SOURCE_FILE = "tests/regression/agt-450-john-source-door.test.mjs";

// ---------------------------------------------------------------------------------------------
// transport (agt-309-process-break-class.test.mjs's shape, column for column)
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

// One fixture ticket body. `scope_origin` is spelled out as `discovered` rather than inherited,
// because it is the column the whole ticket turns on: arm 1 (a) is only meaningful if the row did
// NOT start out carrying John's stamp.
function ticket(n, epicId, extra) {
  return {
    backlog_id: `${FIXTURE_PREFIX}-${n}`,
    tier: "next",
    type: "Tooling",
    priority_class: "P6 - Agent Enhancement",
    title: `AGT-450 john-source-door probe ${n}`,
    status: "open",
    epic_id: epicId,
    source_file: SOURCE_FILE,
    scope_origin: "discovered",
    size_stamp: "S",
    defer_status: "no",
    scope_rationale: "regression probe",
    enhancement_claim: "none: probe",
    queue: 999450000 + n,
    row_ordinal: 999450000 + n,
    ...extra,
  };
}

// ---------------------------------------------------------------------------------------------
// Arm 3 -- PURE (kickoff §6.3). The second limb as three units on the SAME two rows.
// ---------------------------------------------------------------------------------------------

function armPure() {
  // AGT-480 CLOSED THIS ARM'S QUESTION BY REMOVING THE LIMB IT MEASURED. Victoria's move door
  // writes `scope_origin = 'victoria-placed'` for every source her pass homes, and
  // `epic_lock_guard()` admits that value, so the need_source cannot decide whether a destination
  // is reachable any more -- `homeAccepts(row)` takes ONE argument and asks ONE thing. The arm is
  // kept rather than deleted, with every expectation re-measured, because that is what proves the
  // limb is gone instead of merely untested.
  //
  // The rows still differ in `accepts_findings`, which is now the discriminator IN REVERSE: both
  // executing rows must be homes, so a function that still read the column would fail here. The
  // planned row is what keeps "both are homes" from reading as "it stopped refusing anything"
  // (the LOO-013 lesson, STANDARDS.md Section 4 -- which input moved the answer).
  const EXEC_LOCKED = { slug: HOME, status: "executing", accepts_findings: false };
  const PLANNED_OK = { slug: LIST_PROJECT, status: "planned", accepts_findings: true };

  assert.equal(homeAccepts(EXEC_LOCKED), true,
    "an executing project that does NOT accept findings IS a home -- Victoria places the ticket");
  assert.equal(homeAccepts({ slug: HOME, status: "executing", accepts_findings: true }), true,
    "and so is one that does: accepts_findings no longer moves the answer in either direction");
  assert.equal(homeAccepts({ slug: HOME, status: "executing" }), true,
    "a context row carrying no accepts_findings is a home too -- the column is not read (AGT-480)");
  assert.equal(homeAccepts(PLANNED_OK), false,
    "and `executing` is unconditional and STILL READ: a planned project is nobody's destination");
  assert.equal(homeAccepts({ slug: LIST_PROJECT, status: "proposed", accepts_findings: false }), false,
    "nor a proposed one");
  assert.equal(homeAccepts({ slug: LIST_PROJECT, status: "done", accepts_findings: true }), false,
    "nor a finished one");

  // Still fails CLOSED on no row at all, and a row with no status is not a running project.
  assert.equal(homeAccepts(undefined), false, "no row at all is not a home");
  assert.equal(homeAccepts(null), false, "and neither is a null one");
  assert.equal(homeAccepts({ slug: HOME }), false, "a row carrying no status is not executing");

  // THE SECOND ARGUMENT IS GONE, not ignored-but-accepted: the whole point is that no citation can
  // change the answer, so the same row must answer identically however it is called. A function
  // that still branched on the citation would move at least one of these.
  for (const src of [JSRC, NSRC, undefined, null, "johnny:runner_decisions:x", "JOHN:runner_decisions:x"]) {
    assert.equal(homeAccepts(EXEC_LOCKED, src), true,
      `the executing row is a home whatever is cited; ${JSON.stringify(src)} moved it`);
    assert.equal(homeAccepts(PLANNED_OK, src), false,
      `and the planned row is not, whatever is cited; ${JSON.stringify(src)} moved it`);
  }

  // The refusal the review prints names the one limb that is left, so the manager reading it knows
  // WHY the destination was refused -- and no longer suggests a john: source would have opened it.
  const refusal = homeNotExecutingRefusal(HOME);
  assert.ok(refusal.includes("is not an executing project"),
    `the refusal must name the one remaining limb; got ${JSON.stringify(refusal)}`);
  assert.ok(refusal.includes("(AGT-240, AGT-480)"),
    `and cite AGT-240 and AGT-480; got ${JSON.stringify(refusal)}`);
  assert.ok(!refusal.includes("accepts findings") && !refusal.includes("john: source"),
    `and name neither removed limb; got ${JSON.stringify(refusal)}`);
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

  await arm("3 homeAccepts' second limb (pure)", async () => { armPure(); });

  if (!url || !key) {
    notRun("AGT-450 arms 1 and 2",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the writer is a database function, the lock " +
      "is a database trigger and `--prepare` reads the board over PostgREST, so there is no offline " +
      "half of either arm (run with `node --env-file-if-exists=.env.local tests/regression/run-all.js`)");
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

  // The shape: HOME executing and NOT accepting findings (the case with no door before this ship),
  // and ONE epic on each project -- the writer's own `v_rc <> 1` rule, which AGT-450 did not touch.
  const shapeOk =
    bySlug.get(HOME)?.status === "executing" && bySlug.get(HOME)?.accepts_findings !== true &&
    bySlug.get(LIST_PROJECT)?.status !== "executing" &&
    homeEpics.length === 1 && listEpics.length === 1;

  if (!shapeOk) {
    notRun("AGT-450 arms 1 and 2",
      `the live board no longer matches the shape this door is measured against ` +
      `(${HOME}: ${JSON.stringify(bySlug.get(HOME) ?? null)}, ${homeEpics.length} epic(s); ` +
      `${LIST_PROJECT}: ${JSON.stringify(bySlug.get(LIST_PROJECT) ?? null)}, ${listEpics.length} epic(s)) ` +
      `-- asserting against a substitute would measure something else: an accepting home would pass ` +
      `on AGT-264's limb and prove nothing about John's`);
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }

  const HOME_EPIC = homeEpics[0].id;
  const LIST_EPIC = listEpics[0].id;
  const F1 = `${FIXTURE_PREFIX}-1`;
  const F2 = `${FIXTURE_PREFIX}-2`;
  const SESSION = "agt-450-regression";
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

    // ---- 1. THE DISCRIMINATOR ---------------------------------------------------------------
    await arm("1 the writer stamps john-named and the lock admits it", async () => {
      const cases = [];
      const casefail = (label, e) => { cases.push(`(${label}) ${e.message}`); console.log(`      (${label}) FAIL -- ${e.message}`); };

      const f1Start = await row(F1);
      assert.equal(f1Start.epic_id, LIST_EPIC, "F1 starts on the findings list");
      assert.equal(f1Start.scope_origin, "discovered", "and NOT carrying John's stamp -- the writer must put it there");
      assert.equal(f1Start.need_score, null, "and with no score, because nobody has ruled it");

      // (a) THE PASS. On the unchanged tree this is REFUSED with `AGT-240: epic Tooling is locked`,
      //     and that refusal is the defect: the ticket John named cannot reach his own list.
      try {
        const pass = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: "pass", backlog_id: F1, need_source: JSRC, need_score: 5,
            proposal: `AGT-450 regression probe ${NONCE}`,
            reason: "regression probe: John's own ruling is the need, and he named the destination",
            account: "Ruled one proposal", home_project: HOME,
          },
        });
        assert.ok(pass.ok,
          `a pass citing a john: source and homed to ${HOME} must be ACCEPTED; got ${describe(pass)} ` +
          `-- a refusal naming AGT-240 is the defect AGT-450 closes`);
        passDecision = typeof pass.json === "string" ? pass.json : pass.json?.id ?? null;
        assert.ok(passDecision, `and must return its decision handle; got ${pass.text.slice(0, 200)}`);

        const moved = await row(F1);
        assert.equal(moved.epic_id, HOME_EPIC,
          `the pass must MOVE F1 onto ${HOME}'s epic; it is still on ${moved.epic_id}`);
        assert.equal(moved.scope_origin, "john-named",
          "and STAMP the row -- the stamp is what the lock reads, so it must be on the row the move wrote");
        assert.equal(moved.need_score, 5, "and carry her score");
        assert.equal(moved.need_source, JSRC, "and the source she echoed");
      } catch (e) { casefail("a the john: pass", e); }

      // (b) THE CONTROL, one field moved. Same home, same score band, same session -- a nathan:
      //     source.
      //
      //     AGT-480 FLIPPED THIS CASE. Before that ship AGT-240's lock refused it and the refusal
      //     rolled the whole verdict back; now Victoria PLACES it -- the writer stamps
      //     `victoria-placed` and the lock admits that value inside her door. The case is kept with
      //     its expectation inverted, so the flip is measured rather than merely absent, and the
      //     DISCRIMINATOR moves to the stamp: (a) must read `john-named` and (b) `victoria-placed`
      //     on the same home in the same run, which is the only thing that can tell "Victoria's
      //     door opened" from "the lock was weakened" -- a weakened lock would write neither.
      try {
        const pass2 = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: "pass", backlog_id: F2, need_source: NSRC, need_score: 4,
            proposal: `AGT-450 regression probe control ${NONCE}`,
            reason: "regression probe: Victoria places a non-john source onto the executing list",
            account: "Ruled one proposal", home_project: HOME,
          },
        });
        assert.ok(pass2.ok,
          `a pass citing a nathan: source and homed to ${HOME} must now be ACCEPTED; got ${describe(pass2)} ` +
          `-- a refusal naming AGT-240 is the defect AGT-480 closes`);

        const f2 = await row(F2);
        assert.equal(f2.epic_id, HOME_EPIC,
          `the pass must MOVE F2 onto ${HOME}'s epic; it is still on ${f2.epic_id}`);
        assert.equal(f2.scope_origin, "victoria-placed",
          "and stamp it VICTORIA-PLACED, not john-named -- the source is what picks the stamp");
        assert.equal(f2.need_score, 4, "and carry her score");
        assert.equal(f2.need_source, NSRC, "and the source she echoed");
      } catch (e) { casefail("b the nathan: control", e); }

      // (c) THE UNDO IS ONE CALL. `scope_origin` travels in the same before-image as `epic_id` and
      //     `need_score`, so a single reverse puts all three back -- no second cleanup write.
      try {
        assert.ok(passDecision, "(a) must have recorded a decision for (c) to reverse");
        const rev = await rpc(url, key, "reverse_decision", {
          p_decision: passDecision, p_actor: "John",
          p_reason: `AGT-450 regression fixture: undo the probe's verdict on ${F1}`,
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
      } catch (e) { casefail("c the one-call undo", e); }

      if (cases.length) throw new Error(`${cases.length} case(s) failed:\n      ${cases.join("\n      ")}`);
    });

    // ---- 2. THE CLI, before any model turn ---------------------------------------------------
    await arm("2 requirement-check --prepare admits the john: source", async () => {
      const prepare = src => {
        const r = spawnSync(process.execPath,
          [CHECK, "--prepare", `--ticket=${F1}`, `--source=${src}`, `--home=${HOME}`, "--json"],
          { encoding: "utf8" });
        return { status: r.status, out: `${r.stdout}${r.stderr}`, stdout: r.stdout };
      };

      // (a) the john: source. Exit 3 is `--prepare`'s own "awaiting her answer" code, so this is
      //     the destination being ACCEPTED -- and no turn has been spent reaching it.
      const john = prepare(JSRC);
      assert.equal(john.status, 3,
        `--prepare with a john: source and --home=${HOME} must exit 3 (it exited 1 before this ship); ` +
        `got ${john.status}: ${john.out.slice(0, 600)}`);
      assert.ok(john.out.includes(`would be homed to ${HOME}`),
        `and say where the pass would send it; got ${john.out.slice(0, 600)}`);
      const head = JSON.parse(john.stdout.trim());
      assert.equal(head.home, HOME, "and the task_context head must carry the home it accepted");
      assert.equal(head.source, JSRC, "and the source it was handed");
      assert.ok(head.model, "and name the model the turn would run on, never a hardcoded id (AGT-147)");

      // (b) the control, one argument moved. AGT-480: step 2b asks only whether the project is
      //     executing, so this now exits 3 as well and reaches the assembly. The refusal that used
      //     to live here has its own live case in `agt-480-victoria-placed-origin.test.mjs` arm C
      //     (`--home=dev-mgr-findings`, exit 1), so the CLI's refusal path is still measured --
      //     by the input that still refuses, which is a non-executing home rather than a source.
      const nathan = prepare(NSRC);
      assert.equal(nathan.status, 3,
        `--prepare with a nathan: source and the same --home must now exit 3 (it exited 1 before ` +
        `AGT-480); got ${nathan.status}: ${nathan.out.slice(0, 600)}`);
      assert.ok(nathan.out.includes(`would be homed to ${HOME}`),
        `and say where the pass would send it; got ${nathan.out.slice(0, 600)}`);
      assert.ok(nathan.out.includes("nathan:market_records"),
        `and name the pair it read; got ${nathan.out.slice(0, 600)}`);
      assert.ok(!nathan.out.includes("is not a john: source"),
        `and must no longer hold the removed limb; got ${nathan.out.slice(0, 600)}`);
      console.log(`    [AGT-450 arm 2] exit 3 on john: (${head.prompt_bytes} prompt bytes, model ${head.model}); exit 3 on nathan: too (AGT-480)`);
    });
  } finally {
    // ---- the undo, in reverse order, and it runs whatever happened above ----------------------
    //
    // THE DECISIONS ARE QUERIED, NOT REMEMBERED (agt-309's own first-run lesson): a case that wrote
    // a decision the arm did not expect would otherwise leave it STANDING on the real ledger,
    // naming a fixture that has already been deleted. IT RUNS BEFORE THE DELETEs, because
    // `reverse_decision()` re-INSERTS a row whose image it holds -- undoing after a delete
    // resurrects the fixture instead of reversing the effect.
    const mine = await req(url, key,
      "runner_decisions?select=id,backlog_id,decided_at&kind=eq.requirement-check" +
      `&reversed_at=is.null&backlog_id=in.(${F1},${F2})&order=decided_at.desc`);
    if (!mine.ok) residue.push(`undo: the fixtures' own decisions must read; got ${describe(mine)}`);
    for (const d of (mine.ok ? (mine.json ?? []) : [])) {
      const rev = await rpc(url, key, "reverse_decision", {
        p_decision: d.id, p_actor: "John",
        p_reason: `AGT-450 regression fixture: undo the probe's verdict on ${d.backlog_id}`,
      });
      if (!rev.ok) { residue.push(`undo: reverse_decision(${d.id}) -> ${describe(rev)}`); continue; }
      const out = (rev.json ?? [])[0] ?? {};
      console.log(`      [undo] reverse_decision ${d.id} (${d.backlog_id}): outcome=${out.outcome} ` +
        `restored=${out.restored} unverified=${out.restored_unverified} refused=${out.refused}`);
    }
    for (const n of [1, 2]) {
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
    `runner_decisions?select=id,backlog_id,status&kind=eq.requirement-check&reversed_at=is.null&backlog_id=in.(${F1},${F2})`);
  if (!standing.ok || (standing.json ?? []).length !== 0) {
    residue.push(`the fixture left an UNREVERSED requirement-check decision standing: ${standing.text.slice(0, 300)}`);
  }
  if (residue.length) failures.push(`[residue] ${residue.join("; ")}`);

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
