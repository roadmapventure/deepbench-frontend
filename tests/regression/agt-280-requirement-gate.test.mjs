// DeepBench v7.0.826 | tests/regression/agt-280-requirement-gate.test.mjs | AGT-433 slice 1 -- need_score 0 = PARKED: CHECK and writer 0-5.
// DeepBench v7.0.729 | tests/regression/agt-280-requirement-gate.test.mjs | AGT-280 slice 1 --
// THE REQUIREMENT GATE: a ticket reaches an EXECUTING project's list only when it cites a need
// source that names a row that actually exists.
//
// THE DEFECT, measured live 2026-09-29 on the unchanged tree. Nothing checked whether a
// requirement was NEEDED before it became a ticket. `backlog_requires_finding()` only demands an
// `audit_findings` row (and exempts `scope_origin IN ('john-named','enhancement')`);
// `epic_lock_guard()` only refuses a LOCKED epic; neither reads a source. `backlog_items` held 44
// columns, none of them naming a source or a need score -- `backlog_items?select=need_source,
// need_score` answered 400 "column does not exist", and so did
// `runner_settings?select=need_source_kinds`. 94 open tickets sat in epics of `executing` projects
// with no source at all; in 14 days 29 `john-named` and 14 `discovered` rows were filed into one --
// the `discovered` 14 are the AGT-141 class this gate stops.
//
// THE CHANGE. Migration `agt280_requirement_gate` (down captured FIRST over the three created
// functions) adds `backlog_items.need_source text` + `need_score smallint` (CHECK 0-5, AGT-433) and
// `runner_settings.need_source_kinds text[]`, seeded on id = 1 with the FIVE `who:table` pairs
// John's words, Nathan's market records and Jerry's shared needs live in. A `need_source` is the
// text `who:table:id`. `need_source_is_traceable()` parses it, refuses anything whose `who:table`
// is not in that column, and then asks the named table whether the row EXISTS -- so a well-formed
// citation of nothing is false. `requirement_gate` (BEFORE INSERT OR UPDATE OF epic_id) refuses an
// untraceable row into an epic whose project is executing. `apply_requirement_verdict()` is the
// one writer.
//
// WHERE THE KINDS LIVE IS DATA, NOT CODE (pattern:2): changing the five pairs is John's, a
// `runner_settings` UPDATE, not a migration. And whether the cited row EXISTS is a LOOKUP, so no
// model owns it (pattern:10) -- her judgment of whether the source SUPPORTS the claim is the
// `requirement-check` capability, which ships in slice 2 WITH its caller.
//
// ARMS.
//   A  THE DISCRIMINATOR, live over PostgREST: the trigger itself, ten cases, on a canonical
//      deterministic pick (pattern:127) of an epic whose project is `executing` and whose lock
//      `epic_lock_guard()` already lets a `discovered` row through -- so what fires here is
//      AGT-280's gate and never AGT-240's lock. Pre-change case (i) SUCCEEDS; that success IS the
//      gap this ticket closes.
//   B  The function under the trigger, read-only: `need_source_is_traceable()` over the real
//      allowlist and a real `market_records` id, both directions; plus
//      `apply_requirement_verdict()`'s refusal paths, which RAISE before they write anything.
//      Its WRITE halves are declared notRun and were measured at the ship -- see the notRun text.
//   C  §6.1 live: the two columns read back 200, and the seeded array holds exactly 5 entries.
//
// RESIDUE. Arm A's six REFUSED cases write nothing by construction. Its four ACCEPTED cases
// insert one fixture row and DELETE it immediately, and the arm re-reads `backlog_items`' exact
// count at the end and asserts it is unmoved -- the AGT-264 arm E pattern. Every fixture row
// carries an explicit `epic_id` (so `backlog_home_intake()` returns early and no `Intake — ZAGT`
// epic is ever created) and `source_file` under `tests/regression/`, which is already in
// `runner_settings.ticket_filing_exempt_sources`, so AGT-238's deferred finding rule is not what
// decides these cases. Arms B and C read only.
//
// WHY NO ROLLED-BACK TRANSACTION HERE (deviation from kickoff §5 T2, named not hidden). The
// kickoff asks for each case in a rolled-back transaction. This suite reaches Supabase only over
// PostgREST, which cannot open one: `Prefer: tx=rollback` was PROBED against this project at this
// ship and was NOT honoured -- the row committed and had to be deleted. That is the same wall
// `tests/regression/ses-320-delivered-exit.test.mjs` records. So the permanent test uses
// refuse-or-insert-then-delete with a count re-read, and the genuinely transactional proof (every
// write path, rolled back) was run at the ship over the MCP inside deliberately failing DO blocks
// and is recorded in the notRun below.

import assert from "node:assert/strict";
import { selfRun, notRun } from "./_lib/self-run.js";

const NOWHERE = "00000000-0000-0000-0000-000000000000";
const FIXTURE_PREFIX = "ZAGT280";
const SOURCE_FILE = "tests/regression/agt-280-requirement-gate.test.mjs";
// The five pairs the migration seeds. A FIXTURE of the expectation, asserted against the live
// column in arm C -- never read from it and compared to itself.
const EXPECTED_KINDS = [
  "john:runner_directives",
  "john:runner_decisions",
  "john:napkin_ideas",
  "nathan:market_records",
  "jerry:knowledge_entries",
];

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

async function rpc(url, key, fn, args) {
  return req(url, key, `rpc/${fn}`, { method: "POST", body: args });
}

// One fixture ticket body. epic_id is ALWAYS explicit (backlog_home_intake() returns early), and
// every NOT NULL / CHECK column carries a legal value, so the only thing that can decide a case is
// the gate under test.
function ticket(n, epicId, extra) {
  return {
    backlog_id: `${FIXTURE_PREFIX}-${n}`,
    tier: "next",
    type: "Tooling",
    priority_class: "P10 - Tooling",
    title: `AGT-280 requirement-gate probe ${n}`,
    status: "open",
    epic_id: epicId,
    source_file: SOURCE_FILE,
    scope_origin: "discovered",
    size_stamp: "S",
    defer_status: "no",
    scope_rationale: "regression probe",
    enhancement_claim: "none: probe",
    row_ordinal: 999900000 + n,
    ...extra,
  };
}

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-280 (every arm)",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the gate is a database trigger and there " +
      "is no offline half of it to assert (run with `node --env-file-if-exists=.env.local " +
      "tests/regression/run-all.js`)");
    return;
  }

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // ---- the canonical fixtures, read from the live board, deterministically ----------------------
  //
  // THE EPIC: of an `executing` project, and one AGT-240's lock already lets a `discovered` row
  // through (unlocked, or its project accepts findings) -- otherwise the refusal this arm sees
  // would be AGT-240's and the arm would prove nothing about AGT-280. Ordered by id so the pick is
  // reproducible run to run (pattern:127).
  const epics = await req(url, key,
    "epics?select=id,name,locked_at,projects!inner(slug,status,accepts_findings)" +
    "&projects.status=eq.executing&order=id.asc");
  assert.ok(epics.ok, `the executing-project epics must read; got ${describe(epics)}`);
  const usable = (epics.json ?? []).filter(e => e.locked_at === null || e.projects?.accepts_findings === true);
  const intake = await req(url, key,
    "epics?select=id,name,projects!inner(slug,status)&projects.slug=eq.backlog-intake&order=id.asc&limit=1");
  assert.ok(intake.ok, `the backlog-intake epic must read; got ${describe(intake)}`);
  const mkt = await req(url, key, "market_records?select=id&order=id.asc&limit=1");
  assert.ok(mkt.ok, `a market_records id must read; got ${describe(mkt)}`);

  if (!usable.length || !(intake.json ?? []).length || !(mkt.json ?? []).length) {
    notRun("AGT-280 arms A and B",
      `the live fixtures this gate is measured against are not all present right now ` +
      `(executing epics past the AGT-240 lock: ${usable.length}, backlog-intake epics: ` +
      `${(intake.json ?? []).length}, market_records rows: ${(mkt.json ?? []).length}) -- ` +
      `asserting against a substitute would measure something else`);
  } else {
    const EPIC = usable[0].id;
    const EPIC_NAME = usable[0].name;
    const INTAKE_EPIC = intake.json[0].id;
    const MKT = mkt.json[0].id;
    const GOOD = `nathan:market_records:${MKT}`;

    // ---- A. THE DISCRIMINATOR: the trigger, six cases --------------------------------------------
    await arm("A the requirement gate", async () => {
      const before = await count(url, key, "backlog_items?select=id");

      // refused(n, extra, why): the insert must be REFUSED, by AGT-280 and by nothing else, and it
      // must leave nothing behind (a refused BEFORE-trigger insert never wrote a row at all).
      const refused = async (n, extra, why) => {
        const r = await req(url, key, "backlog_items", { method: "POST", body: ticket(n, EPIC, extra) });
        if (r.ok) {
          await req(url, key, `backlog_items?backlog_id=eq.${FIXTURE_PREFIX}-${n}`, { method: "DELETE" });
          assert.fail(`${why}: the insert SUCCEEDED -- the requirement gate did not fire`);
        }
        assert.ok(r.text.includes("AGT-280:"),
          `${why}: must be refused BY AGT-280 (not by another guard); got ${describe(r)}`);
        assert.ok(r.text.includes("has no traceable need source"),
          `${why}: the refusal must be the gate's own sentence; got ${describe(r)}`);
        assert.ok(!r.text.includes("AGT-240: epic"),
          `${why}: the AGT-240 lock must NOT be what refused it; got ${describe(r)}`);
        const left = await req(url, key, `backlog_items?select=id&backlog_id=eq.${FIXTURE_PREFIX}-${n}`);
        assert.deepEqual(left.json, [], `${why}: a refused insert must leave no row`);
      };

      // accepted(n, epicId, extra, why): the insert must LAND, carry what it was given, and then be
      // deleted again. The read-back is what makes this more than "the POST returned 201".
      const accepted = async (n, epicId, extra, why) => {
        const r = await req(url, key, "backlog_items",
          { method: "POST", prefer: "return=representation", body: ticket(n, epicId, extra) });
        try {
          assert.ok(r.ok, `${why}: the insert must be accepted; got ${describe(r)}`);
          const row = Array.isArray(r.json) ? r.json[0] : r.json;
          assert.equal(row.epic_id, epicId, `${why}: the row must land on the epic it named`);
          assert.equal(row.need_source, extra.need_source ?? null,
            `${why}: the row must carry the need_source it was given`);
          assert.equal(row.need_score, extra.need_score ?? null,
            `${why}: the row must read back the need_score it was given -- 0 is a score, not an absence`);
        } finally {
          const del = await req(url, key, `backlog_items?backlog_id=eq.${FIXTURE_PREFIX}-${n}`, { method: "DELETE" });
          assert.ok(del.ok, `${why}: the fixture row must be deleted again; got ${describe(del)}`);
        }
      };

      // refusedScore(n, s): AGT-433's band, from the TABLE's side. The source is traceable and
      // `discovered` is legal here, so the only thing left to refuse the row is the score itself:
      // 6 and -1 trip `ck_backlog_need_score` (23514), and 2.5 never reaches a constraint at all --
      // PostgREST casts the body first and `'2.5'::smallint` is 22P02, which is why the whole-number
      // case asserts "not accepted" rather than a constraint name it cannot produce.
      const refusedScore = async (n, s) => {
        const why = `(AGT-433) need_score ${s} must not land on a ticket`;
        const r = await req(url, key, "backlog_items", { method: "POST", body: ticket(n, EPIC, { need_source: GOOD, need_score: s }) });
        if (r.ok) {
          await req(url, key, `backlog_items?backlog_id=eq.${FIXTURE_PREFIX}-${n}`, { method: "DELETE" });
          assert.fail(`${why}: the insert SUCCEEDED -- the CHECK took a score outside 0-5`);
        }
        assert.ok(s === 2.5 || r.text.includes("ck_backlog_need_score"),
          `${why}: it must be ck_backlog_need_score that refused it (not another guard); got ${describe(r)}`);
        const left = await req(url, key, `backlog_items?select=id&backlog_id=eq.${FIXTURE_PREFIX}-${n}`);
        assert.deepEqual(left.json, [], `${why}: a refused insert must leave no row`);
      };

      // (i) THE GAP ITSELF. No source at all, `discovered`, into an executing project's epic.
      //     On the unchanged tree this SUCCEEDS -- that is the defect, not a passing case.
      await refused(1, {}, "(i) a discovered ticket with NO need_source");

      // (ii) The same row, citing a market record that exists -> it belongs there.
      await accepted(2, EPIC, { need_source: GOOD, need_score: 4 },
        "(ii) the same ticket citing a live market_records row");

      // (iii) WELL-FORMED, CITES NOTHING. This is the case a shape-only check would pass, and the
      //       reason need_source_is_traceable() asks the table rather than the regex.
      await refused(3, { need_source: `nathan:market_records:${NOWHERE}` },
        "(iii) a well-formed citation of a row that does not exist");

      // (iv) A real row, cited under a who:table pair that is NOT in need_source_kinds.
      await refused(4, { need_source: `bob:market_records:${MKT}` },
        "(iv) a real row cited under a who:table outside runner_settings.need_source_kinds");

      // (v) THE john-named EXCEPTION, copied verbatim from epic_lock_guard (Designer's call (c)).
      await accepted(5, EPIC, { scope_origin: "john-named" },
        "(v) the SAME source-less row as john-named");

      // (vi) THE FILING PATH STAYS OPEN (Designer's call (b)): the gate fires on
      //      epic_project_executing(), so an intake epic still takes a source-less discovered row.
      await accepted(6, INTAKE_EPIC, {},
        "(vi) the same source-less discovered row into the backlog-intake epic");

      // (vii) AGT-433's DISCRIMINATOR. A ticket John has judged valid but EARLY is a 0, and 0 is a
      //       score the table has to keep -- on the unchanged tree this case is 23514
      //       `ck_backlog_need_score` and this arm exits 1 here. The band's two ends and the
      //       whole-number rule follow it, so widening the floor cannot quietly open the ceiling.
      await accepted(7, EPIC, { need_source: GOOD, need_score: 0 },
        "(vii) AGT-433: a PARKED ticket scored 0 lands and reads back 0");
      for (const [n, s] of [[8, 6], [9, -1], [10, 2.5]]) await refusedScore(n, s);

      assert.equal(await count(url, key, "backlog_items?select=id"), before,
        "ZERO RESIDUE: backlog_items' exact count must re-read unmoved after all ten cases");
      console.log(`    [AGT-280 arm A] epic ${EPIC_NAME} (${EPIC}), market_records ${MKT}, ` +
        `backlog_items ${before} before and after`);
    });

    // ---- B. the function under the trigger, and the writer's refusals ----------------------------
    await arm("B need_source_is_traceable and the writer's refusals", async () => {
      const traceable = async (p_source) => {
        const r = await rpc(url, key, "need_source_is_traceable", { p_source });
        assert.ok(r.ok, `need_source_is_traceable(${JSON.stringify(p_source)}) must answer; got ${describe(r)}`);
        return r.json;
      };

      assert.equal(await traceable(GOOD), true,
        "a live market_records row cited under an allowlisted pair is traceable");
      assert.equal(await traceable(null), false, "NULL is not a source");
      assert.equal(await traceable(""), false, "blank is not a source");
      assert.equal(await traceable("   "), false, "whitespace is not a source");
      assert.equal(await traceable("nathan:market_records"), false, "a two-part string is the wrong shape");
      assert.equal(await traceable(MKT), false, "a bare id names no who and no table");
      assert.equal(await traceable(`nathan:market_records:${NOWHERE}`), false,
        "WELL-FORMED BUT CITES NOTHING -- the row must EXIST, which is the whole point");
      assert.equal(await traceable(`bob:market_records:${MKT}`), false,
        "a real row under an unlisted who is not traceable -- the allowlist is what decides");
      assert.equal(await traceable(`nathan:backlog_items:${MKT}`), false,
        "an unlisted TABLE is not traceable either, whatever the id");

      // The writer's two refusals. Both RAISE before any write, which is why they are safe here.
      const both = await rpc(url, key, "apply_requirement_verdict", {
        p_cycle: NOWHERE, p_session: "agt-280-test",
        p: { verdict: "pass", backlog_id: "ZAGT280-X", need_source: GOOD, need_score: 3, reason: "probe" },
      });
      assert.ok(!both.ok, `naming BOTH a cycle and a session must raise; got ${describe(both)}`);
      assert.ok(both.text.includes("exactly one"),
        `and must say so in its own words; got ${describe(both)}`);

      const neither = await rpc(url, key, "apply_requirement_verdict", {
        p_cycle: null, p_session: null,
        p: { verdict: "pass", backlog_id: "ZAGT280-X", need_source: GOOD, need_score: 3, reason: "probe" },
      });
      assert.ok(!neither.ok, `naming NEITHER must raise too; got ${describe(neither)}`);

      const untraceable = await rpc(url, key, "apply_requirement_verdict", {
        p_cycle: null, p_session: "agt-280-test",
        p: { verdict: "pass", backlog_id: "ZAGT280-X",
             need_source: `nathan:market_records:${NOWHERE}`, need_score: 3, reason: "probe" },
      });
      assert.ok(!untraceable.ok,
        `a pass verdict on an UNTRACEABLE need_source must raise before it writes; got ${describe(untraceable)}`);
      assert.ok(untraceable.text.includes("AGT-280:"),
        `and must refuse in AGT-280's own words; got ${describe(untraceable)}`);

      // AGT-433: the WRITER's band, the other half of (vii). Both of its score guards raise with
      // errcode check_violation after the ticket lookup and the traceability check but BEFORE
      // record_decision(), so all three of these refusals write nothing -- which is the only reason
      // they are safe to assert here. The ticket named is a real one read live, because the writer
      // refuses an unknown backlog_id earlier and would then never reach the score.
      const any = (await req(url, key, "backlog_items?select=backlog_id&order=backlog_id.asc&limit=1")).json[0].backlog_id;
      for (const s of [6, -1, 2.5]) {
        const r = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: "agt-280-test",
          p: { verdict: "pass", backlog_id: any, need_source: GOOD, need_score: s, reason: "probe" },
        });
        assert.ok(!r.ok, `a pass verdict scoring ${s} must raise before it writes; got ${describe(r)}`);
        assert.ok(r.text.includes("0-5"),
          `and must refuse in the writer's own 0-5 words (AGT-433 widened both guards); got ${describe(r)}`);
      }
    });
  }

  // ---- C. §6.1: the columns exist and the array is seeded ----------------------------------------
  await arm("C the columns and the seeded kinds", async () => {
    const cols = await req(url, key, "backlog_items?select=need_source,need_score&limit=1");
    assert.equal(cols.status, 200,
      `backlog_items?select=need_source,need_score must answer 200 (400 before this ship); got ${describe(cols)}`);

    const st = await req(url, key, "runner_settings?select=need_source_kinds&id=eq.1");
    assert.equal(st.status, 200,
      `runner_settings?select=need_source_kinds must answer 200 (400 before this ship); got ${describe(st)}`);
    const kinds = st.json?.[0]?.need_source_kinds;
    assert.ok(Array.isArray(kinds), `need_source_kinds must be an array; got ${JSON.stringify(kinds)}`);
    assert.equal(kinds.length, 5, `need_source_kinds must hold exactly 5 entries; got ${kinds.length}`);
    assert.deepEqual([...kinds].sort(), [...EXPECTED_KINDS].sort(),
      "and they must be the five who:table pairs John's, Nathan's and Jerry's needs live in");
    for (const k of kinds) {
      assert.match(k, /^[a-z]+:[a-z_]+$/, `every entry must read who:table; got ${JSON.stringify(k)}`);
    }

    // The score's CHECK, asserted over the live table rather than by writing to it: no row may
    // carry a need_score outside 0-5, in either direction (AGT-433 moved the floor to 0, so a row
    // reading -1 or 6 is the only thing this can still catch -- a 0 is now legal and expected).
    for (const q of ["need_score=gt.5", "need_score=lt.0"]) {
      const r = await req(url, key, `backlog_items?select=backlog_id,need_score&${q}`);
      assert.ok(r.ok, `${q} must read; got ${describe(r)}`);
      assert.deepEqual(r.json, [],
        `the CHECK (need_score BETWEEN 0 AND 5) must hold over every live row; ${q} returned ${r.text.slice(0, 200)}`);
    }
  });

  notRun("AGT-280 apply_requirement_verdict's WRITE paths",
    "the writer finalises the decision ledger: a `pass` writes one runner_decisions row, one " +
    "runner_before_images row and then the ticket UPDATE, and a `not-needed` writes one " +
    "audit_findings row. A permanent regression test must never do that on the live board (the " +
    "SES-196 / SES-218 / SES-275 refusal), and this suite reaches Supabase only over PostgREST, " +
    "which cannot open a transaction to roll a fixture back -- `Prefer: tx=rollback` was probed " +
    "against this project at this ship and was NOT honoured. MEASURED AT THE SHIP INSTEAD, live " +
    "over the MCP, inside a deliberately failing DO block with every fixture rolled back, and " +
    "asserted on the COUNTS and the ORDER rather than on 'it returned': a `pass` on a fixture " +
    "ticket produced exactly 1 runner_decisions row (kind `requirement-check`, the ticket's " +
    "ladder_work_class), exactly 1 runner_before_images row (table_name `backlog_items`, pk_value " +
    "the ticket's uuid, decision_id that handle) whose row_data still held need_source NULL -- " +
    "which is what proves the image was written BEFORE the update -- and only then the two " +
    "columns on the ticket; a `not-needed` produced exactly 1 audit_findings row (proposal / " +
    "other / other / listed / high, ruled_by and found_by `victoria`) and 0 new backlog_items " +
    "rows. What is asserted HERE, and what is safe to assert here, is every refusal path: they " +
    "raise before any write.");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
