// DeepBench v7.0.783 | tests/regression/agt-238-concurrency-corpus.test.mjs | AGT-304 slice 6 -- arm C pins every corpus epic count to public.epics' own live count instead of one project's shipping-day 0, and the epic-less LEFT JOIN proof grades today's zero-epic projects or declares itself NOT RUN when the board holds none.
// DeepBench v7.0.667 | tests/regression/agt-238-concurrency-corpus.test.mjs | AGT-238 slice 2 --
// CONCURRENCY FROM THE CORPUS.
//
// WHAT SHIPPED (migration agt238_concurrency_corpus, mirrored at
// docs/design/agt-238-concurrency-corpus.sql). How many projects execute at once, and in what order,
// is The Development Manager's recorded, reversible decision from a deterministic corpus -- never a
// knob and never a rule in code. `public.project_concurrency_corpus()` is that corpus (one row per
// project, LEFT JOINed so an epic-less project shows `epics=0` instead of vanishing);
// `public.record_concurrency()` is its ONE writer (one decision, one before-image per CHANGED row);
// and `projects.status='executing'` stays the count while `projects.priority` stays the order.
//
// FOUR ARMS, each able to fail on its own:
//   (A) THE SHIPPED TEXT (no credentials). The migration carries `LEFT JOIN public.epics` in the
//       corpus -- a plain JOIN would drop exactly the project the corpus exists to show -- and the
//       `proposed`/`planned` refusal that keeps starting a project John's (AGT-240). SES-158 CONTROL:
//       with that refusal removed from the text, the same judgement must THROW.
//   (B) THE DRIVER (no credentials). `concurrencyErrors` refuses each of the SEVEN -- no cycle id, a
//       blank `why`, an empty `execute`, an off-corpus slug, a `planned` slug, a slug in both lists,
//       and an `order` that is not the `execute` set -- and a valid plan and an absent key are clean.
//   (C) THE LIVE CORPUS (read-only). One row per `projects` row, ordered executing-first, and
//       `trainer-authored-agents` present at `epics=0`.
//   (D) THE LIVE BOUNDARY (read-only in effect). `record_concurrency()` on a `planned` slug RAISES
//       naming AGT-240, and the kind-`concurrency` decision count is UNCHANGED across the call --
//       the refusal lands before any write.
//
// NO MODEL CALL, NO SPEND, AND NO WRITE OF ANY KIND: arm D's only call is one the function refuses,
// and the count either side of it proves it wrote nothing.
//
// D5: the anon arm is `notRun`, never FAIL. `VITE_SUPABASE_ANON_KEY` is absent in this environment
// (it is the standing red in agt-240-project-finish-line's arm D, filed as a finding by this ship and
// NOT fixed here), so the browser-key denial on both new functions is DECLARED unrun rather than
// reported as a failure of this ticket.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { answerErrors, concurrencyErrors } from "../../scripts/run-project.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATION = path.join(ROOT, "docs", "design", "agt-238-concurrency-corpus.sql");

// ---------------------------------------------------------------------------------------------
// (A) the shipped migration text
// ---------------------------------------------------------------------------------------------

const LEFT_JOIN = "LEFT JOIN public.epics e ON e.project_id = p.id";
const REFUSAL = "IF v_row.status IN ('proposed', 'planned') THEN";

function assertBoundaries(src) {
  assert.ok(src.includes(LEFT_JOIN),
    `the corpus does not carry ${JSON.stringify(LEFT_JOIN)} -- an inner join drops exactly the project the corpus exists to show (an executing project with no epics)`);
  assert.ok(src.includes("LEFT JOIN public.backlog_items b ON b.epic_id = e.id"),
    "the corpus does not LEFT JOIN backlog_items -- an epic with no tickets would drop its project's row");
  assert.ok(src.includes(REFUSAL),
    `record_concurrency() does not refuse a proposed/planned slug (${JSON.stringify(REFUSAL)} is absent) -- starting a project that has never run is John's words through start_proposed_project(), not the manager's call`);
  const at = src.indexOf(REFUSAL);
  const message = src.slice(at, at + 700);
  assert.ok(/AGT-240/.test(message),
    "the proposed/planned refusal does not name AGT-240, so the reader is told it is refused but not where starting a project lives");
  assert.ok(/start_proposed_project/.test(message),
    "the proposed/planned refusal does not name start_proposed_project() -- a refusal with no next step is a dead end");
}

function armA() {
  assert.ok(fs.existsSync(MIGRATION), `${path.relative(ROOT, MIGRATION)} is missing -- it IS the migration AGT-238 slice 2 applied`);
  const src = fs.readFileSync(MIGRATION, "utf8");
  assertBoundaries(src);

  // SES-158 CONTROL: with the refusal gone (leaving a well-formed file), the arm must THROW.
  for (const [mutant, why] of [
    [src.replace(REFUSAL, "IF FALSE THEN"), /does not refuse a proposed\/planned slug/],
    [src.replace(LEFT_JOIN, "JOIN public.epics e ON e.project_id = p.id"), /an inner join drops/],
  ]) {
    let err = null;
    try { assertBoundaries(mutant); } catch (e) { err = e; }
    assert.ok(err, "SES-158 control: with the boundary removed the arm still passed -- it grades nothing");
    assert.match(err.message, why, `the control threw for the wrong reason: ${err && err.message}`);
  }
  console.log("  [AGT-238] arm A: the migration carries the corpus's LEFT JOINs and the proposed/planned refusal naming AGT-240 + start_proposed_project(); both removal mutants throw.");
}

// ---------------------------------------------------------------------------------------------
// (B) the driver's seven refusals -- pure, no network
// ---------------------------------------------------------------------------------------------

function armB() {
  const state = {
    project: "p",
    cycle_id: "11111111-2222-3333-4444-555555555555",
    queue: [],
    concurrency_corpus: [
      { slug: "auditor-enhancements", status: "executing", priority: 1, epics: 1 },
      { slug: "mcp-poc", status: "executing", priority: 4, epics: 1 },
      { slug: "selfbuild", status: "paused", priority: 6, epics: 8 },
      { slug: "moat", status: "planned", priority: 4, epics: 1 },
    ],
  };
  const base = { project: "p", action: "report", assignment: null, report: "r", needs_john: [], patterns_applied: [] };
  const good = { execute: ["auditor-enhancements", "mcp-poc"], pause: ["selfbuild"], order: ["auditor-enhancements", "mcp-poc"], why: "mcp-poc carries 4 open tickets and no blocker; selfbuild's 31 are all blocked" };
  const one = (answer, stateOverride) => concurrencyErrors(answer, stateOverride ?? state);

  // (1) no cycle id -- a decision has exactly one author
  const noCycle = one({ concurrency: good }, { ...state, cycle_id: null });
  assert.strictEqual(noCycle.length, 1, `a concurrency decision with no cycle id must be refused with exactly one line; got ${JSON.stringify(noCycle)}`);
  assert.match(noCycle[0], /no cycle id -- record_concurrency\(\) writes a decision and a decision has exactly one author/);

  // (2) a blank why
  const blank = one({ concurrency: { ...good, why: "   " } });
  assert.strictEqual(blank.length, 1, `a blank why must be refused with exactly one line; got ${JSON.stringify(blank)}`);
  assert.match(blank[0], /"concurrency\.why" is blank/);

  // (3) an empty execute
  const empty = one({ concurrency: { ...good, execute: [], order: [] } });
  assert.strictEqual(empty.length, 1, `an empty execute must be refused with exactly one line; got ${JSON.stringify(empty)}`);
  assert.match(empty[0], /"concurrency\.execute" is empty/);

  // (4) a slug the corpus did not return
  const unknown = one({ concurrency: { ...good, execute: ["auditor-enhancements", "zz-not-a-project"], order: ["auditor-enhancements", "zz-not-a-project"] } });
  assert.strictEqual(unknown.length, 1, `an off-corpus slug must be refused with exactly one line; got ${JSON.stringify(unknown)}`);
  assert.match(unknown[0], /which project_concurrency_corpus\(\) did not return/);

  // (5) a planned slug -- the AGT-240 boundary, in the driver's own voice
  const planned = one({ concurrency: { ...good, execute: ["auditor-enhancements", "moat"], order: ["auditor-enhancements", "moat"] } });
  assert.strictEqual(planned.length, 1, `a planned slug must be refused with exactly one line; got ${JSON.stringify(planned)}`);
  assert.match(planned[0], /is planned -- starting a project that has never run/);
  assert.match(planned[0], /AGT-240/);

  // (6) a slug in both lists
  const both = one({ concurrency: { ...good, pause: ["mcp-poc"] } });
  assert.strictEqual(both.length, 1, `a slug in both lists must be refused with exactly one line; got ${JSON.stringify(both)}`);
  assert.match(both[0], /in both "execute" and "pause"/);

  // (7) an order that is not exactly the execute set
  const short = one({ concurrency: { ...good, order: ["auditor-enhancements"] } });
  assert.strictEqual(short.length, 1, `an order that omits an executing project must be refused with exactly one line; got ${JSON.stringify(short)}`);
  assert.match(short[0], /must name exactly the projects in "concurrency\.execute".*missing mcp-poc/);
  const dupe = one({ concurrency: { ...good, order: ["mcp-poc", "mcp-poc"] } });
  assert.strictEqual(dupe.length, 1, `an order naming one project twice must be refused with exactly one line; got ${JSON.stringify(dupe)}`);
  assert.match(dupe[0], /named twice: mcp-poc/);

  // a non-object is refused rather than read
  assert.match(one({ concurrency: ["auditor-enhancements"] })[0] ?? "", /not an object \{execute, pause, order, why\}/,
    "an array concurrency must be refused");

  // clean: a valid plan, and an answer that decides no concurrency at all
  assert.deepStrictEqual(one({ concurrency: good }), [], "a valid concurrency decision must be clean");
  assert.deepStrictEqual(one({}), [], "an answer with no concurrency key must return no lines at all");
  assert.deepStrictEqual(answerErrors({ ...base, concurrency: good }, state), [],
    "answerErrors must admit a valid concurrency decision on a report");
  assert.deepStrictEqual(answerErrors(base, state), [],
    "answerErrors must be unchanged for an answer that carries no concurrency");
  const viaAnswer = answerErrors({ ...base, concurrency: { ...good, execute: ["moat"], order: ["moat"] } }, state);
  assert.strictEqual(viaAnswer.length, 1, `answerErrors must carry the concurrency refusal through; got ${JSON.stringify(viaAnswer)}`);
  console.log("  [AGT-238] arm B: concurrencyErrors refuses all seven (no cycle id, blank why, empty execute, off-corpus slug, planned slug naming AGT-240, both lists, order != execute set); a valid plan and an absent key are clean, and answerErrors carries a refusal through.");
}

// ---------------------------------------------------------------------------------------------
// live arms
// ---------------------------------------------------------------------------------------------

async function call(url, key, p, init = {}) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${p}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}

async function armC(url, key) {
  const corpus = await call(url, key, "rpc/project_concurrency_corpus", { method: "POST", body: "{}" });
  assert.ok(corpus.ok && Array.isArray(corpus.json), `project_concurrency_corpus() failed: ${corpus.status} ${corpus.text.slice(0, 300)}`);
  const projects = await call(url, key, "projects?select=slug,status,priority");
  assert.ok(projects.ok && Array.isArray(projects.json), `projects read failed: ${projects.status} ${projects.text.slice(0, 200)}`);
  assert.strictEqual(corpus.json.length, projects.json.length,
    `the corpus returned ${corpus.json.length} row(s) for ${projects.json.length} project(s) -- one row per project, and a LEFT JOIN that became an inner one drops the epic-less projects first`);

  const slugs = new Set(corpus.json.map(r => r.slug));
  for (const p of projects.json) {
    assert.ok(slugs.has(p.slug), `${p.slug} (${p.status}) is a project the corpus did not return -- the manager cannot decide over a board it is not shown`);
  }

  // executing first, then priority -- the function's own ORDER BY, not one reconstructed here.
  const execFlags = corpus.json.map(r => r.status === "executing");
  assert.strictEqual(execFlags.lastIndexOf(true) < execFlags.indexOf(false) || !execFlags.includes(false), true,
    `the corpus does not put every executing project ahead of every other one: ${JSON.stringify(corpus.json.map(r => `${r.slug}:${r.status}`))}`);

  // Every corpus epic count is pinned to the LIVE table it reports, not to the number it read on
  // the shipping day (AGT-304 slice 6): public.epics moved under the old literal 0.
  const live = await call(url, key, "projects?select=slug,epics(count)");
  assert.ok(live.ok && Array.isArray(live.json), `projects?select=slug,epics(count) failed: ${live.status} ${live.text.slice(0, 200)}`);
  const liveEpics = new Map(live.json.map(p => [p.slug, p.epics?.[0]?.count ?? 0]));
  for (const r of corpus.json) {
    assert.strictEqual(r.epics, liveEpics.get(r.slug),
      `${r.slug} reads epics=${r.epics} in the corpus but public.epics holds ${liveEpics.get(r.slug)} row(s) (AGT-304 slice 6: the live table's count)`);
  }
  assert.ok(corpus.json.some(r => r.slug === "trainer-authored-agents"),
    "trainer-authored-agents is absent from the corpus");
  // The behavioural half: an epic-less project must still show itself, at 0. Which project that is
  // is the board's business, not this file's -- and with no epic-less project the board cannot
  // discriminate a LEFT JOIN from an inner one at all, so the arm declares itself NOT RUN.
  const zero = [...liveEpics].filter(([, n]) => n === 0).map(([slug]) => slug);
  if (zero.length === 0) {
    notRun("arm C's behavioural LEFT JOIN proof (an epic-less project at epics=0)",
      `no project holds 0 epics today (${liveEpics.size} projects); arm (A) and its inner-join mutation still ran`);
  } else {
    for (const slug of zero) {
      assert.strictEqual(corpus.json.find(r => r.slug === slug)?.epics, 0,
        `${slug} holds 0 epics and must be in the corpus at epics=0 -- the LEFT JOIN is the whole point`);
    }
  }
  const executing = corpus.json.filter(r => r.status === "executing");
  console.log(`  [AGT-238] arm C: ${corpus.json.length} corpus row(s) for ${projects.json.length} project(s), executing first (${executing.map(r => `${r.slug}:p${r.priority}/e${r.epics}`).join(", ")}); epic-less present at epics=0: ${zero.join(", ") || "none today"}.`);
}

async function armD(url, key) {
  const countConcurrency = async () => {
    const r = await call(url, key, "runner_decisions?select=id&kind=eq.concurrency", { headers: { Prefer: "count=exact" } });
    assert.ok(r.ok && Array.isArray(r.json), `runner_decisions read failed: ${r.status} ${r.text.slice(0, 200)}`);
    return r.json.length;
  };
  const before = await countConcurrency();

  const planned = await call(url, key, "projects?select=slug&status=eq.planned&limit=1");
  assert.ok(planned.ok && Array.isArray(planned.json), `projects read failed: ${planned.status}`);
  if (!planned.json.length) {
    notRun("arm D -- the live proposed/planned boundary",
      "no project is `planned` on the live board this run, so the refusal has nothing to refuse. Arm A graded the shipped refusal text and the migration's own probe 2 raised on `moat` in-transaction.");
    return;
  }
  const slug = planned.json[0].slug;

  const refused = await call(url, key, "rpc/record_concurrency", {
    method: "POST",
    body: JSON.stringify({
      p_cycle_id: "86e5a3bf-d279-418a-8d5f-d1ab53542810",
      p_plan: { execute: [slug], pause: [], order: [slug], why: "AGT-238 regression probe -- this must be refused before any write" },
    }),
  });
  assert.ok(!refused.ok,
    `record_concurrency() ACCEPTED the ${slug} slug (HTTP ${refused.status}) -- starting a project that has never run is John's words through start_proposed_project(), not the manager's call (AGT-240)`);
  assert.match(refused.text, /AGT-240/,
    `refused, but not by the AGT-240 boundary: ${refused.text.slice(0, 300)}`);

  const after = await countConcurrency();
  assert.strictEqual(after, before,
    `the refused call moved the kind=concurrency decision count from ${before} to ${after} -- record_concurrency() validates EVERYTHING before it records anything`);
  console.log(`  [AGT-238] arm D: record_concurrency() refused the ${planned.json[0].slug} slug naming AGT-240, and the kind=concurrency count is unchanged at ${after} -- the refusal lands before any write.`);
}

async function run() {
  armA();
  armB();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("arms C and D -- the live corpus and the live proposed/planned boundary",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. Arms A and B still ran.");
    return;
  }
  await armC(url, key);
  await armD(url, key);

  // D5: the browser-key denial is DECLARED unrun, never a FAIL. Both functions were REVOKEd from
  // anon/authenticated by name and the migration asserted both directions (denied for anon and
  // authenticated, granted for service_role) in the same transaction that created them.
  if (!process.env.VITE_SUPABASE_ANON_KEY) {
    notRun("the anon arm -- that the browser key cannot EXECUTE project_concurrency_corpus() or record_concurrency()",
      "VITE_SUPABASE_ANON_KEY is absent in this environment (the same credential gap that stands in agt-240-project-finish-line's arm D, filed as a finding by this ship and not fixed here). Asserted instead by the migration's own trailing DO block, in the SAME transaction that created both functions: has_function_privilege('anon'|'authenticated', ..., 'EXECUTE') false for both and true for service_role (.claude/rules/supabase-column-grants.md -- a new function is EXECUTE-to-PUBLIC by default, so this is asserted in both directions, never assumed).");
  }
}

export default run;
selfRun(import.meta.url, run);
