// DeepBench v7.0.866 | tests/regression/agt-490-parked-home.test.mjs | AGT-490 -- A PARKED 0 NAMES
// WHERE IT WAITS.
//
// THE DEFECT, measured live 2026-10-19 on tree 612a1cc rather than reasoned about: `need_score` 0
// has been accepted by `ck_backlog_need_score`, `apply_requirement_verdict()` and BOTH of
// `scripts/requirement-check.js`'s range tests since `v7.0.844`, and NOT ONE ticket on the board
// read one. `AGT-383` and `AGT-252` both read 1 against John's own 2026-10-08 ruling, and the live
// routine prompt still said `score it 1`. The reason is the other half of a 0: WHERE the ticket
// waits. `home` reached `placement_target()`, which admits an `executing` project and nothing else,
// so a paused or planned project could not be named at all; a `no-fit` only stamped; and no project
// was ever created.
//
// WHAT IS GUARDED HERE, and what each arm can prove ALONE:
//
//   A (OFFLINE, zero network). THE VALIDATOR, P1-P5. Every refusal is paired with the answer it
//     would have accepted on the SAME context, because a rule that refuses everything and a rule
//     that refuses the right thing look identical from the refusal alone. It also pins the half
//     that must NOT have moved: V1 above 0 still demands an ACTIVE project's slug, which is the
//     one way to tell "a parked home is allowed" from "any home is allowed now".
//
//   B (LIVE, read-only). THE READER. `victoria_parked_homes()` equals a re-derivation over REST of
//     the same predicate -- every `paused` and `planned` project, in `status, priority, slug` order
//     -- and names no `executing` one. The function's SQL and the re-derivation share no code.
//
//   C (LIVE, write-then-undo). THE WRITER. A `park` puts an ungraded ticket on a PLANNED project's
//     oldest epic carrying `victoria-placed` with its score still null and exactly one `placement`
//     row; a `park` naming a `new_project` creates that project `planned` with one epic; a `pass`
//     at 0 with a parked home lands the 0 on the board and `pick_exclusions()` says `need_score 0
//     is below 3`, which is the whole point of the ship. Three refusals stand beside them -- a
//     ticket John named, an EXECUTING home, and a `new_project` above 0 -- and every write is
//     reversed, the probe project deleted, and the counts re-read.
//
// WHAT THIS FILE DOES NOT TOUCH: `placement_target()`, `grade_standing()`,
// `parent_project_of_blockers()`, `epic_lock_guard()`, `scope_origin_door()` and
// `requirement_gate()` are untouched by AGT-490 and are not re-guarded here (agt-480 and agt-489
// own them); no `audit_findings` row is filed; `runner_cycles` is never written, because
// `--apply-list` is never run here.
//
// FIXTURE CONCURRENCY (SES-382), on agt-489's precedent: every fixture carries
// `priority_class = 'P6 - Agent Enhancement'`, so `ladder_work_class()` is NULL and no reversal can
// demote a real ladder class on every run (pattern:76). `runner_decisions_backlog_id_check` is
// `^[A-Z]+-[0-9]+[a-z]?$`, hence `ZAGTPK-n`.
//
// WHY NO ROLLED-BACK TRANSACTION, the same wall as agt-489's: this suite reaches Supabase only over
// PostgREST, which cannot open one. Hence refuse-or-write-then-undo with the counts re-read.

import assert from "node:assert/strict";
import { selfRun, notRun } from "./_lib/self-run.js";
import { buildListContext, validateListVerdict, projectSlug, PARKED_PREFIX, PARK_VERDICT,
  NEW_PROJECT_MIN, NEW_PROJECT_MAX } from "../../scripts/requirement-check.js";

// The park destination this file measures against: PLANNED, one epic, unlocked. A park into it is
// the ordinary case, and `security` is the slug arm C writes to and reverses out of.
const PARK_HOME = "security";
const EXEC_HOME = "go-to-market";                                  // executing -- the refusal
const LIST = "auditor-findings";
const LIST_EPIC_PRIMARY = "ba12f804-9ff1-4160-ac3d-5c0bf8470877";
const LIST_EPIC_FALLBACK = "48c63dac-4e5e-4287-8e72-01777fedbbf2"; // agt-480's list epic, agt-489's fallback

const NEW_PROJECT_NAME = "ZAGTPK Planned Probe";
const NEW_PROJECT_SLUG = "zagtpk-planned-probe";

const FIXTURE_PREFIX = "ZAGTPK";
const SOURCE_FILE = "tests/regression/agt-490-parked-home.test.mjs";
const DESCRIPTION =
  "AGT-490 regression fixture: a probe ticket for the parked-home door. It fits no charter and " +
  "waits in a project that is not running.";

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
    title: `AGT-490 parked-home probe ${n}`,
    description: DESCRIPTION,
    status: "open",
    epic_id: epicId,
    source_file: SOURCE_FILE,
    scope_origin: "discovered",
    size_stamp: "S",
    defer_status: "no",
    scope_rationale: "regression probe",
    enhancement_claim: "none: probe",
    queue: 999490000 + n,
    row_ordinal: 999490000 + n,
    ...extra,
  };
}

// ---------------------------------------------------------------------------------------------
// Arm A -- OFFLINE. P1-P5, each refusal paired with the answer it would have accepted.
// ---------------------------------------------------------------------------------------------

const SRC = "nathan:market_records:fbaa1d6e-06e4-4015-b0fe-b4915fa7bfef";

function armOffline() {
  // The constants the rule is written in terms of, pinned here so a silent rename of either is red
  // rather than a rule that quietly stops matching.
  assert.equal(PARKED_PREFIX, "PARKED (0) until ", "the parked reason's one prefix");
  assert.equal(PARK_VERDICT, "park", "the writer verdict a park is sent as");
  assert.equal(projectSlug(NEW_PROJECT_NAME), NEW_PROJECT_SLUG,
    "the slug is DERIVED from the name by the same rule park_target() holds");
  assert.equal(projectSlug("  Moat & Support!!  "), "moat-support",
    "every run of non-alphanumerics becomes one hyphen and the ends are trimmed");

  const A = "ZAGTPKB-1";   // ungraded, discovered -- the parked pass
  const B = "ZAGTPKB-2";   // ungraded, discovered -- the no-fit
  const J = "ZAGTPKB-3";   // ungraded, JOHN-NAMED -- P5
  const G = "ZAGTPKB-4";   // graded, score 4 -- the move, and the proof V1 did not move

  const ctx = buildListContext({
    project: "x", epics: [],
    tickets: [
      { backlog_id: A, title: "A", description: "d", status: "open", scope_origin: "discovered" },
      { backlog_id: B, title: "B", description: "d", status: "open", scope_origin: "discovered" },
      { backlog_id: J, title: "J", description: "d", status: "open", scope_origin: "john-named" },
      { backlog_id: G, title: "G", description: "d", status: "open", scope_origin: "discovered",
        graded: true, need_score: 4 },
    ],
    candidates: [{ key: SRC, head: "h" }],
    kinds: ["nathan:market_records"],
    charters: [{ slug: "tooling", charter: "t" }, { slug: EXEC_HOME, charter: "g" }],
    parked_homes: [
      { slug: "mcp-poc", name: "MCP POC", status: "paused" },
      { slug: PARK_HOME, name: "Security", status: "planned" },
    ],
    fingerprint: "0".repeat(32),
  });

  // The context itself must carry the two facts, or every rule below is reading undefined.
  assert.deepEqual(ctx.parked_homes.map(h => h.slug), ["mcp-poc", PARK_HOME],
    "the parked homes travel as the function returned them");
  assert.deepEqual(ctx.parked_homes[0], { slug: "mcp-poc", name: "MCP POC", status: "paused" },
    "each as {slug, name, status} and nothing else");
  assert.deepEqual(buildListContext({ project: "x" }).parked_homes, [],
    "and a context assembled without them carries [], never undefined -- which refuses every " +
    "parked home rather than accepting any");
  const byId = new Map(ctx.proposals.map(p => [p.backlog_id, p]));
  assert.equal(byId.get(J).scope_origin, "john-named", "a ticket John named travels as his");

  const reason = `${PARKED_PREFIX}mcp-poc is active -- it waits there`;
  const rowA = { backlog_id: A, verdict: "pass", home: "mcp-poc", need_source: SRC, need_score: 0, reason };
  const rowB = { backlog_id: B, verdict: "no-fit", home: PARK_HOME, need_source: null, need_score: null, reason: "fits none" };
  const rowJ = { backlog_id: J, verdict: "no-fit", home: null, need_source: null, need_score: null, reason: "fits none" };
  const rowG = { backlog_id: G, verdict: "move", home: "tooling", need_source: null, need_score: null, reason: "r" };
  const answerOf = rows => ({ list: "x", account: "Ruled four tickets", rows });

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
  const base = [rowA, rowB, rowJ, rowG];
  const swap = row => base.map(r => (r.backlog_id === row.backlog_id ? row : r));

  // The whole-list answer every refusal below is one row away from.
  accept(base, "the mirror answer (A parked at 0 into a paused project, B no-fit into a planned " +
    "one, J no-fit staying put, G moved into an executing one)");
  accept(swap({ ...rowA, home: null, new_project: NEW_PROJECT_NAME }),
    "A parked into a project named here for the first time");
  accept(swap({ ...rowA, home: null }), "A parked at 0 and left exactly where it is -- a null home stays");

  // P1 -- a 0 says so in its own words.
  refuse(swap({ ...rowA, reason: "it waits for mcp-poc" }), A,
    /scores 0, so its reason begins "PARKED \(0\) until "/, "P1");
  accept(swap({ ...rowA, reason: `${PARKED_PREFIX}mcp-poc is active -- a different sentence` }),
    "P1's pair: any reason that begins with the prefix");

  // P2 -- a 0's home is a PARKED home, not an active one.
  refuse(swap({ ...rowA, home: "tooling" }), A,
    /home "tooling" is not a paused or planned project's slug \(mcp-poc, security\)/, "P2");
  accept(swap({ ...rowA, home: PARK_HOME, reason: `${PARKED_PREFIX}${PARK_HOME} is active` }),
    "P2's pair: the other parked home");

  // V1 IS UNCHANGED ABOVE 0, which is what makes P2 a new rule rather than a removed one.
  const passAt3 = { backlog_id: A, verdict: "pass", home: "tooling", need_source: SRC, need_score: 3, reason: "r" };
  accept(swap(passAt3), "a pass at 3 into an ACTIVE project, exactly as before this ship");
  refuse(swap({ ...passAt3, home: "mcp-poc" }), A,
    /home "mcp-poc" is not an active project's slug \(tooling, go-to-market\)/, "V1 above 0");

  // P3 -- a project named for the first time.
  refuse(swap({ ...passAt3, new_project: NEW_PROJECT_NAME }), A,
    /only a pass at 0 or a no-fit names a project to wait in/, "P3 above 0");
  refuse(swap({ ...rowG, new_project: NEW_PROJECT_NAME }), G,
    /only a pass at 0 or a no-fit names a project to wait in/, "P3 on a move");
  accept(swap({ ...rowB, home: null, new_project: NEW_PROJECT_NAME }),
    "P3's pair: a no-fit may name one");
  refuse(swap({ ...rowA, new_project: NEW_PROJECT_NAME }), A,
    /names both home "mcp-poc" and new_project/, "P3 beside a home");
  refuse(swap({ ...rowA, home: null, new_project: "ZZ" }), A,
    new RegExp(`new_project is 2 character\\(s\\); a project name is ${NEW_PROJECT_MIN}-${NEW_PROJECT_MAX}`),
    "P3 too short");
  refuse(swap({ ...rowA, home: null, new_project: "x".repeat(NEW_PROJECT_MAX + 1) }), A,
    /a project name is 3-80/, "P3 too long");
  refuse(swap({ ...rowA, home: null, new_project: "MCP POC" }), A,
    /makes the slug "mcp-poc", which already names a project she was handed/, "P3 an existing parked slug");
  refuse(swap({ ...rowA, home: null, new_project: "Go To Market" }), A,
    /makes the slug "go-to-market", which already names a project she was handed/, "P3 an active slug");

  // P4 -- a no-fit's home is a parked home too.
  refuse(swap({ ...rowB, home: EXEC_HOME }), B,
    new RegExp(`home "${EXEC_HOME}" is not a paused or planned project's slug`), "P4");
  accept(swap({ ...rowB, home: "mcp-poc" }), "P4's pair: a parked home on the same no-fit");

  // P5 -- and a ticket John named is never moved, parked or not.
  refuse(swap({ ...rowJ, home: PARK_HOME }), J, /is a ticket John named; it is never moved/, "P5 home");
  refuse(swap({ ...rowJ, home: null, new_project: NEW_PROJECT_NAME }), J,
    /is a ticket John named; it is never moved/, "P5 new_project");
  accept(swap({ ...rowJ, home: null }), "P5's pair: the same ticket left exactly where it is");
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

  await arm("A the validator's P1-P5 (offline)", async () => { armOffline(); });

  if (!url || !key) {
    notRun("AGT-490 arms B and C",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the reader is a database function and the " +
      "writer is a database function, so there is no offline half of either (run with " +
      "`node --env-file-if-exists=.env.local tests/regression/run-all.js`)");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }

  // ---- B. THE READER, read-only --------------------------------------------------------------
  await arm("B victoria_parked_homes() equals a re-derivation, and names nothing executing", async () => {
    const fn = await rpc(url, key, "victoria_parked_homes");
    assert.ok(fn.ok, `victoria_parked_homes() must read; got ${describe(fn)}`);
    const fromFn = (fn.json ?? []).map(h => ({ slug: String(h.slug), name: h.name, status: h.status }));

    // THE RE-DERIVATION, over REST and sharing no code with the function's SQL.
    const rest = await req(url, key,
      "projects?status=in.(paused,planned)&select=slug,name,status,priority" +
      "&order=status.asc,priority.asc.nullslast,slug.asc&limit=1000");
    assert.ok(rest.ok, `the paused and planned projects must read; got ${describe(rest)}`);
    const derived = (rest.json ?? []).map(p => ({ slug: String(p.slug), name: p.name, status: p.status }));

    assert.deepEqual(fromFn, derived,
      `victoria_parked_homes() names ${fromFn.length} project(s) in ${JSON.stringify(fromFn.map(h => h.slug))}; ` +
      `the re-derivation names ${derived.length} in ${JSON.stringify(derived.map(h => h.slug))} -- ` +
      "the same rows in the same status, priority, slug order");
    assert.ok(fromFn.length > 0, "and the board holds at least one place a parked ticket can wait");

    const execs = await req(url, key, "projects?status=eq.executing&select=slug");
    assert.ok(execs.ok, `the executing projects must read; got ${describe(execs)}`);
    const running = new Set((execs.json ?? []).map(p => String(p.slug)));
    assert.ok(running.size > 0, "the board is running something, or this assertion proves nothing");
    assert.deepEqual(fromFn.filter(h => running.has(h.slug)), [],
      "and NO executing project is a parking place -- a 0 sent into one is a placement");
    assert.ok(fromFn.some(h => h.slug === PARK_HOME),
      `${PARK_HOME} must still be a parked home; arm C writes into it`);
    console.log(`    [AGT-490 arm B] ${fromFn.length} parked home(s), ${running.size} executing, ` +
      `0 overlap (first ${JSON.stringify(fromFn[0])})`);
  });

  // ---- C. THE WRITER, write-then-undo ---------------------------------------------------------
  const F1 = `${FIXTURE_PREFIX}-1`;
  const F2 = `${FIXTURE_PREFIX}-2`;
  const F3 = `${FIXTURE_PREFIX}-3`;
  const ALL = [F1, F2, F3];
  const SESSION = "agt490-test";

  const beforeItems = await count(url, key, "backlog_items?select=id");
  const beforeProjects = await count(url, key, "projects?select=id");
  const beforeEpics = await count(url, key, "epics?select=id");
  const residue = [];

  const row = async bid => {
    const r = await req(url, key,
      `backlog_items?backlog_id=eq.${bid}&select=id,epic_id,need_source,need_score,scope_origin,status`);
    assert.ok(r.ok, `${bid} must read; got ${describe(r)}`);
    return (r.json ?? [])[0] ?? null;
  };
  const decisions = async (bid, kind) => {
    const r = await req(url, key,
      `runner_decisions?backlog_id=eq.${bid}&reversed_at=is.null&kind=eq.${kind}&select=id,kind`);
    assert.ok(r.ok, `${bid}'s ${kind} decisions must read; got ${describe(r)}`);
    return r.json ?? [];
  };

  // The park destination's OLDEST epic, read rather than pinned: park_target() returns that epic,
  // and a hard-coded id would make this arm red the day a second epic is filed on the project.
  const homeEpics = await req(url, key,
    `epics?select=id,created_at,projects!inner(slug)&projects.slug=eq.${PARK_HOME}&order=created_at.asc&order=id.asc`);
  assert.ok(homeEpics.ok, `${PARK_HOME}'s epics must read; got ${describe(homeEpics)}`);
  const HOME_EPIC = (homeEpics.json ?? [])[0]?.id ?? null;

  // A live candidate key for the one PASS this arm makes. Read, never recalled: a pass whose source
  // does not exist is refused by need_source_is_traceable() and would read as a parked-door failure.
  const mr = await req(url, key, "market_records?select=id&order=id.asc&limit=1");
  assert.ok(mr.ok, `a market record must read; got ${describe(mr)}`);
  const LIVE_SRC = `nathan:market_records:${(mr.json ?? [])[0]?.id}`;

  let LIST_EPIC = LIST_EPIC_PRIMARY;
  try {
    const insert = async epic => {
      for (const n of [1, 2]) {
        const ins = await req(url, key, "backlog_items", { method: "POST", body: ticket(n, epic) });
        if (!ins.ok) return ins;
      }
      return req(url, key, "backlog_items",
        { method: "POST", body: ticket(3, epic, { scope_origin: "john-named" }) });
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

    await arm("C a park waits, a new project is created, a 0 reaches the board, three are refused", async () => {
      const cases = [];
      const casefail = (label, e) => { cases.push(`(${label}) ${e.message}`); console.log(`      (${label}) FAIL -- ${e.message}`); };
      const reverse = async (handle, why) => {
        const rev = await rpc(url, key, "reverse_decision", {
          p_decision: handle, p_actor: "John", p_reason: `AGT-490 regression fixture: ${why}`,
        });
        assert.ok(rev.ok, `reverse_decision(${handle}) must apply; got ${describe(rev)}`);
        const out = (rev.json ?? [])[0] ?? {};
        assert.equal(out.outcome, "applied", `its outcome must be applied; got ${JSON.stringify(out)}`);
      };

      // (1) THE PARK. An UNGRADED ticket lands on the PLANNED project's oldest epic carrying
      //     `victoria-placed`, with NO score -- John's call is that a placed no-fit stays
      //     ungraded, and the absence of a `requirement-check` row is the whole of that claim.
      try {
        assert.ok(HOME_EPIC, `${PARK_HOME} must have an epic for the park to land on`);
        const park = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: PARK_VERDICT, backlog_id: F1, home_project: PARK_HOME,
            reason: `${PARKED_PREFIX}${PARK_HOME} is active -- regression probe`,
            account: "Parked one ticket",
          },
        });
        assert.ok(park.ok, `F1's park must be ACCEPTED; got ${describe(park)}`);
        const handle = typeof park.json === "string" ? park.json : park.json?.id ?? null;
        assert.ok(handle, `and must return its decision handle; got ${park.text.slice(0, 200)}`);

        const parked = await row(F1);
        assert.equal(parked.epic_id, HOME_EPIC, `the park must put F1 on ${PARK_HOME}'s oldest epic`);
        assert.equal(parked.scope_origin, "victoria-placed", "and stamp it victoria-placed");
        assert.equal(parked.need_score, null, "and GRADE NOTHING -- a placed no-fit stays ungraded");
        assert.equal(parked.need_source, null, "and cite nothing");
        const checks = await decisions(F1, "requirement-check");
        assert.equal(checks.length, 0,
          `F1 must carry NO requirement-check row after the park; it carries ${checks.length} -- ` +
          "one would mean the park graded a ticket it had just said fits nothing");
        const placements = await decisions(F1, "placement");
        assert.equal(placements.length, 1, `and exactly one placement row; it carries ${placements.length}`);

        await reverse(handle, "undo the probe's park of F1");
        const back = await row(F1);
        assert.equal(back.epic_id, LIST_EPIC, "and one Reverse puts F1 back on its list");
        assert.equal(back.scope_origin, "discovered", "with the stamp gone");
      } catch (e) { casefail("1 the park", e); }

      // (2) THE PROJECT NAMED FOR THE FIRST TIME. `planned`, one epic, `updated_by victoria` --
      //     capture only, which is John's call: nothing is built there and nobody turned it on.
      try {
        const park = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: PARK_VERDICT, backlog_id: F2, new_project: NEW_PROJECT_NAME,
            reason: `${PARKED_PREFIX}${NEW_PROJECT_NAME} is active -- regression probe`,
            account: "Named one project",
          },
        });
        assert.ok(park.ok, `F2's park into a new project must be ACCEPTED; got ${describe(park)}`);
        const handle = typeof park.json === "string" ? park.json : park.json?.id ?? null;
        assert.ok(handle, `and must return its decision handle; got ${park.text.slice(0, 200)}`);

        const made = await req(url, key,
          `projects?slug=eq.${NEW_PROJECT_SLUG}&select=id,slug,name,status,updated_by`);
        assert.ok(made.ok, `the new project must read; got ${describe(made)}`);
        const pj = (made.json ?? [])[0] ?? null;
        assert.ok(pj, `${NEW_PROJECT_SLUG} must exist`);
        assert.equal(pj.status, "planned", "PLANNED and nothing else -- turning one on is John's hand");
        assert.equal(pj.name, NEW_PROJECT_NAME, "named exactly as she named it");
        assert.equal(pj.updated_by, "victoria", "and attributed to her");
        const eps = await req(url, key, `epics?project_id=eq.${pj.id}&select=id,name`);
        assert.ok(eps.ok, `its epics must read; got ${describe(eps)}`);
        assert.equal((eps.json ?? []).length, 1, "with exactly one epic");
        const landed = await row(F2);
        assert.equal(landed.epic_id, eps.json[0].id, "and F2 waiting on it");
        assert.equal(landed.need_score, null, "ungraded");

        await reverse(handle, "undo the probe's park of F2");
        const back = await row(F2);
        assert.equal(back.epic_id, LIST_EPIC, "one Reverse puts F2 back on its list");
        // The PROJECT is not a decision's row, so the reverse cannot take it back: it is deleted
        // here, epic first, and the residue check below re-reads that it is gone.
        const delEpic = await req(url, key, `epics?project_id=eq.${pj.id}`, { method: "DELETE" });
        assert.ok(delEpic.ok, `the probe epic must delete; got ${describe(delEpic)}`);
        const delPj = await req(url, key, `projects?slug=eq.${NEW_PROJECT_SLUG}`, { method: "DELETE" });
        assert.ok(delPj.ok, `the probe project must delete; got ${describe(delPj)}`);
      } catch (e) { casefail("2 the new project", e); }

      // (3) THE 0 ITSELF, which is the whole point of the ship: a pass scoring 0 that names a
      //     parked home lands the 0 on the board, and the PICK says so in its own words.
      try {
        const pass = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: "pass", backlog_id: F1, need_source: LIVE_SRC, need_score: 0,
            home_project: PARK_HOME,
            proposal: "AGT-490 regression probe",
            reason: `${PARKED_PREFIX}${PARK_HOME} is active -- regression probe`,
            account: "Scored one ticket 0",
          },
        });
        assert.ok(pass.ok, `F1's pass at 0 into a parked home must be ACCEPTED; got ${describe(pass)}`);
        const handle = typeof pass.json === "string" ? pass.json : pass.json?.id ?? null;
        assert.ok(handle, `and must return its decision handle; got ${pass.text.slice(0, 200)}`);

        const scored = await row(F1);
        assert.equal(scored.need_score, 0, "the board must read 0 -- not 1, and not null");
        assert.equal(scored.epic_id, HOME_EPIC, `and F1 must be waiting on ${PARK_HOME}'s epic`);
        assert.equal(scored.scope_origin, "victoria-placed", "with her stamp");

        const ex = await rpc(url, key, "pick_exclusions", {}, `?backlog_id=eq.${F1}&select=backlog_id,reasons`);
        assert.ok(ex.ok, `pick_exclusions() must read for ${F1}; got ${describe(ex)}`);
        const reasons = (ex.json ?? [])[0]?.reasons ?? [];
        assert.ok(reasons.includes("need_score 0 is below 3"),
          `and the pick must say "need_score 0 is below 3"; it says ${JSON.stringify(reasons)}`);

        await reverse(handle, "undo the probe's 0 on F1");
        const back = await row(F1);
        assert.equal(back.need_score, null, "one Reverse takes the 0 back");
        assert.equal(back.epic_id, LIST_EPIC, "and the ticket with it");
      } catch (e) { casefail("3 the 0 on the board", e); }

      // (4) THE THREE REFUSALS. Each is paired with an accepted write above, which is what makes
      //     them refusals OF SOMETHING rather than a writer that refuses everything.
      try {
        // (4a) A ticket John named is never moved -- park_target()'s first rule.
        const john = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: PARK_VERDICT, backlog_id: F3, home_project: PARK_HOME,
            reason: `${PARKED_PREFIX}${PARK_HOME} is active -- regression probe`,
            account: "Tried one park",
          },
        });
        assert.equal(john.ok, false, `F3's park must be REFUSED; got ${describe(john)}`);
        assert.ok(john.status >= 400 && john.status < 500, `with a 4xx; got ${john.status}`);
        assert.match(john.text, /John named/, `naming the rule; got ${john.text.slice(0, 300)}`);
        const f3 = await row(F3);
        assert.equal(f3.epic_id, LIST_EPIC, "and F3 must still be on its list");

        // (4b) An EXECUTING project is a placement, never a parking place.
        const exec = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: PARK_VERDICT, backlog_id: F1, home_project: EXEC_HOME,
            reason: `${PARKED_PREFIX}${EXEC_HOME} is active -- regression probe`,
            account: "Tried one park",
          },
        });
        assert.equal(exec.ok, false, `a park into ${EXEC_HOME} must be REFUSED; got ${describe(exec)}`);
        assert.ok(exec.status >= 400 && exec.status < 500, `with a 4xx; got ${exec.status}`);
        assert.match(exec.text, /is not a paused or planned project/,
          `saying why; got ${exec.text.slice(0, 300)}`);
        const f1 = await row(F1);
        assert.equal(f1.epic_id, LIST_EPIC, "and F1 must not have moved");

        // (4c) A new project is where a PARKED ticket waits; a scored one goes to a running project.
        const above = await rpc(url, key, "apply_requirement_verdict", {
          p_cycle: null, p_session: SESSION,
          p: {
            verdict: "pass", backlog_id: F2, need_source: LIVE_SRC, need_score: 3,
            new_project: NEW_PROJECT_NAME,
            proposal: "AGT-490 regression probe",
            reason: "regression probe: a scored ticket may not name a new project",
            account: "Tried one score",
          },
        });
        assert.equal(above.ok, false, `a pass at 3 with new_project must be REFUSED; got ${describe(above)}`);
        assert.ok(above.status >= 400 && above.status < 500, `with a 4xx; got ${above.status}`);
        assert.match(above.text, /AGT-490: new_project names where a PARKED \(0\) ticket waits/,
          `naming the rule; got ${above.text.slice(0, 300)}`);
        const f2 = await row(F2);
        assert.equal(f2.need_score, null, "and F2 must not have been graded by the refusal");
        const stillGone = await req(url, key, `projects?slug=eq.${NEW_PROJECT_SLUG}&select=slug`);
        assert.ok(stillGone.ok, `the probe project must read; got ${describe(stillGone)}`);
        assert.equal((stillGone.json ?? []).length, 0, "nor any project created by it");
      } catch (e) { casefail("4 the three refusals", e); }

      if (cases.length) throw new Error(`${cases.length} case(s) failed:\n      ${cases.join("\n      ")}`);
    });
  } finally {
    // ---- the undo, in reverse order, and it runs whatever happened above ----------------------
    //
    // THE DECISIONS ARE QUERIED, NOT REMEMBERED, and BOTH kinds are queried: a placement left
    // standing would hold a fixture on a real project's epic after the row itself was deleted.
    const mine = await req(url, key,
      "runner_decisions?select=id,backlog_id,kind,decided_at&kind=in.(requirement-check,placement)" +
      `&reversed_at=is.null&backlog_id=in.(${ALL.join(",")})&order=decided_at.desc`);
    if (!mine.ok) residue.push(`undo: the fixtures' own decisions must read; got ${describe(mine)}`);
    for (const d of (mine.ok ? (mine.json ?? []) : [])) {
      const rev = await rpc(url, key, "reverse_decision", {
        p_decision: d.id, p_actor: "John",
        p_reason: `AGT-490 regression fixture: undo the probe's ${d.kind} on ${d.backlog_id}`,
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
    // The probe project, whatever happened above: its epic first, then the project itself.
    const probe = await req(url, key, `projects?slug=eq.${NEW_PROJECT_SLUG}&select=id`);
    for (const pj of (probe.ok ? (probe.json ?? []) : [])) {
      const de = await req(url, key, `epics?project_id=eq.${pj.id}`, { method: "DELETE" });
      if (!de.ok) residue.push(`undo: the probe project's epics must delete; got ${describe(de)}`);
      const dp = await req(url, key, `projects?id=eq.${pj.id}`, { method: "DELETE" });
      if (!dp.ok) residue.push(`undo: the probe project must delete; got ${describe(dp)}`);
      else console.log(`      [undo] deleted the probe project ${NEW_PROJECT_SLUG}`);
    }
    const requeue = await rpc(url, key, "recompute_backlog_queue");
    if (!requeue.ok) residue.push(`undo: recompute_backlog_queue must re-canonicalise the board; got ${describe(requeue)}`);
    else console.log(`      [undo] recompute_backlog_queue moved ${JSON.stringify(requeue.json)} row(s) back to canonical slots`);
  }

  // ---- the counts, re-read ---------------------------------------------------------------------
  const afterItems = await count(url, key, "backlog_items?select=id");
  const afterProjects = await count(url, key, "projects?select=id");
  const afterEpics = await count(url, key, "epics?select=id");
  console.log(`      [counts] backlog_items ${beforeItems} -> ${afterItems}; ` +
    `projects ${beforeProjects} -> ${afterProjects}; epics ${beforeEpics} -> ${afterEpics}`);
  if (afterItems !== beforeItems) {
    residue.push(`ZERO RESIDUE: backlog_items read ${afterItems}, not ${beforeItems} -- a fixture leaked`);
  }
  if (afterProjects !== beforeProjects) {
    residue.push(`ZERO RESIDUE: projects read ${afterProjects}, not ${beforeProjects} -- a probe project leaked`);
  }
  if (afterEpics !== beforeEpics) {
    residue.push(`ZERO RESIDUE: epics read ${afterEpics}, not ${beforeEpics} -- a probe epic leaked`);
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
