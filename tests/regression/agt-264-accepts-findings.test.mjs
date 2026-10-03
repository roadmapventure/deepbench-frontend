// DeepBench v7.0.692 | tests/regression/agt-264-accepts-findings.test.mjs | AGT-264 -- AGENT TRAINING
// ACCEPTS FINDINGS WHILE IT EXECUTES.
//
// THE DEFECT, measured live 2026-09-28 before the change. AGT-240 locks every executing project's
// list, and finding_group_epic() enforced that at BOTH of its sites (the route's slug, and the
// manager's own pick). Agent Training is a PERPETUAL routine project: it is always executing and
// never reaches a finish line, so "wait until the project finishes" meant "never". The Development
// Manager's pick of `agent-training` was refused with P0001 `apply_audit_review: project
// agent-training is executing -- its list is locked; use kind list (AGT-240)`, approved agent
// findings fell to Backlog Intake instead (AGT-259 at queue 512), and finding f7d0f975 was ruled
// `listed` only because the pick had been refused. Moving AGT-106 into the project's epic was
// refused 23514 by epic_lock_guard(). John 2026-09-28 (directive 009eeb7a): "if the dev manager
// approves jerry's and nathan's request - move their tickets into the agent training project. That
// way they get picked up."
//
// THE CHANGE. Migration `agt264_accepts_findings` (down captured FIRST over both functions ->
// auto-downable, 2, 0 refusals) adds `projects.accepts_findings boolean not null default false`,
// true for `agent-training` alone. finding_group_epic() reads it at both sites (`AND NOT v_acc`, and
// `(e.locked_at IS NULL OR v_acc)` -- load-bearing, because Agent Training's ONLY epic is itself
// locked), epic_lock_guard() joins the epic's project and skips a flagged one, and a `session`
// finding_routes row makes routes 8 -> 9. scripts/audit-review.js mirrors the DB with listLocked().
// FIVE agent-row writes landed under ONE runner_decisions handle, each imaged first.
//
// A FLAG, NOT A STATUS, and that is the ticket's own call: `status='executing'` IS AGT-238's
// concurrency count and AGT-240's finish logic reads the same column, so a fifth status would have
// collided with both. Routing stays the MANAGER's pick told in his Intent (pattern:6, pattern:7) --
// not a rule keyed on finding_type, because agent:designer d08082a4 and agent:builder 2ab3c28c are
// product defects typed `defect` and a type rule would misroute them into Agent Training.
//
// ARMS, each discriminating -- every one FAILS on the tree and the database before this ship:
//   A  PURE (no network) -- validateReview()'s offline mirror. A flagged executing project draws NO
//      refusal; an unflagged executing one draws the lock sentence BYTE-FOR-BYTE from
//      lockedListRefusal(); a planned project is unaffected. CONTROLS: the identical review with the
//      flag FALSE draws the refusal (so it is the flag that fires, not the slug), listLocked() reads
//      a pre-AGT-264 context row WITHOUT the field as still locked (fails closed), and
//      LOCKED_PROJECT_STATUSES is unmoved -- this ticket changed what reaches the lock, never the
//      list of locked statuses nor the sentence.
//      Pre-change: `listLocked` was not exported at all (ERR_MODULE / undefined), and the mirror
//      refused the flagged project exactly like any other executing one.
//   B  LIVE, READ-ONLY -- exactly one `session` route (30, `*`, NULL), still no (`*`,`*`) catch-all,
//      and --prepare hands the manager `accepts_findings` as a real boolean on every project row
//      with at least one row flagged, so his pick is informed by data and not by memory.
//      Pre-change: zero `session` rows, and ctx.projects carried no such field.
//   C  LIVE PROBE of rpc/finding_group_epic, WRITES NOTHING, and STATUS-INDEPENDENT BY
//      CONSTRUCTION -- the expectation for every project is computed from the row AS READ, so no
//      slug and no status is a literal here. A flagged row must return a uuid whatever its status; an
//      unflagged row in a locked status must return 400 P0001 whose message equals
//      `apply_audit_review: ` + lockedListRefusal(slug, status) byte-for-byte -- which is the mirror
//      proof, not an assertion that a mirror exists. Counts re-read equal.
//      Pre-change: the flagged row refused with the same sentence as its unflagged siblings.
//   D  LIVE -- the atomic path. Of the unreversed `agent-row` decisions for AGT-264 in this cycle,
//      exactly ONE touches any of the migration's five rows (MIGRATION_ROWS), it carries exactly
//      FIVE before-images, and each image holds the BEFORE state (AGT-106 still in
//      the Intake epic, the flag still false, the Skill method still without sentence S, both
//      findings still listed/escalated). That the images hold the old values is what proves they
//      were written BEFORE their updates, and that `reverse_decision()` can actually undo all five.
//      Pre-change: no such decision existed.
//   E  LIVE -- epic_lock_guard() from the INSERT side: a `discovered` ticket into Agent Training's
//      LOCKED epic is no longer refused by the AGT-240 lock. Deleted again if it lands.
//      Pre-change: 23514 `AGT-240: epic Agent Training is locked; the finding waits on the findings
//      list` (which is what agt-167's baseline red still shows).
//
// NOTHING HERE WRITES A ROW THAT STAYS. A is pure; B reads and runs --prepare into a temp file;
// C's calls either RAISE before any write or return a uuid computed from reads; D reads; E's one
// insert is deleted immediately (and its count re-read), or was refused and never existed.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "audit-review.js");

const PREFIX = "apply_audit_review: ";
const FLAGGED = "agent-training";                             // the only row John flagged
const AT_EPIC = "e7d2c90d-6443-4779-8233-ead389dbbaff";       // Agent Training's ONE epic -- locked
const INTAKE_EPIC = "4d060063-e49c-430a-9d89-5bba7060fc5a";   // where AGT-106 sat, and where a Reverse puts it back
const AGT106 = "095b7782-1aec-486f-a3f4-a4a99a73241f";
const CYCLE = "f4d1d272-1d2b-4e2b-a637-2f1331754b2b";
// The FIVE rows the migration imaged-then-wrote (kickoff §5 task 1). Arm D identifies the migration's
// decision by THESE rows, never by counting decisions under the ticket: render-cycle-card.js
// --sync-knowledge writes its own agent-row decision under whatever ticket the cycle works (three
// under AGT-245 in the predecessor cycle, one under AGT-264 in this one), so "one decision for the
// ticket in this cycle" measures the cycle's other routine work, not the migration's atomicity.
const MIGRATION_ROWS = [
  ["projects", "6b7a9757-4e40-486c-a422-e20c60858208"],        // agent-training
  ["skill_profiles", "a6d3568f-3a39-44ff-a2b9-0aa62035281e"],  // dm-audit-review-intent
  ["backlog_items", AGT106],
  ["audit_findings", "f7d0f975-80b4-458b-aac8-546bce13fc5f"],
  ["audit_findings", "07a7d637-920f-4e78-8d79-dad7926e012e"],
];
const PROBE_ID = "ZPROBE-2640";

// Arm A's FIXTURE table: agt-132 arm A's four seeded rows plus `agent` (AGT-161). A fixture, never a
// copy of the live table -- arm B is what pins the live rows.
const ROUTES = [
  { precedence: 10, source: "*", finding_type: "security", project_slug: "security" },
  { precedence: 20, source: "auditor", finding_type: "*", project_slug: "auditor-enhancements" },
  { precedence: 30, source: "agent", finding_type: "*", project_slug: null },
  { precedence: 30, source: "staff-watch", finding_type: "*", project_slug: null },
  { precedence: 30, source: "ticket-owner", finding_type: "*", project_slug: null },
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
const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 260)}`;

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

// ISO week of a date, the same shape scripts/audit-ledger.js computes.
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const sourceOf = fb => String(fb ?? "").split(":")[0];

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  const mod = await import(pathToFileURL(SCRIPT).href);
  const { validateReview, listLocked, lockedListRefusal, LOCKED_PROJECT_STATUSES } = mod;

  // ---- A. PURE -----------------------------------------------------------------------------------
  await arm("A pure mirror", async () => {
    assert.equal(typeof listLocked, "function",
      "scripts/audit-review.js must EXPORT listLocked -- the mirror of finding_group_epic()'s `AND NOT v_acc`");

    const wl = [{ id: "ag", source: "agent", finding_type: "defect", weeks_seen: 1 }];
    const projects = [
      { slug: "agent-training", status: "executing", accepts_findings: true },
      { slug: "dev-manager-capabilities", status: "executing", accepts_findings: false },
      { slug: "security", status: "planned" },
    ];
    const group = pick => ({
      kind: "root-cause", project: pick, finding_ids: ["ag"],
      title: "qa", root_cause: "qa", fix: "qa", needs_desktop: false,
    });
    const rv = (pick, projs = projects) => validateReview(
      { groups: [group(pick)], summary_for_john: "qa", patterns_applied: [] },
      wl, "2026-W40", undefined, ROUTES, projs).refusals;

    // THE POINT: the flag is accepted while executing.
    assert.deepEqual(rv("agent-training"), [],
      "a flagged project draws NO refusal, though it is executing");
    // THE CONTROL that it is the FLAG and not the slug: same review, flag false.
    assert.deepEqual(
      rv("agent-training", [{ slug: "agent-training", status: "executing", accepts_findings: false },
                            ...projects.slice(1)]),
      [lockedListRefusal("agent-training", "executing")],
      "with the flag FALSE the same pick of the same slug IS refused -- the flag is what fires");
    // The other direction, byte-for-byte.
    assert.deepEqual(rv("dev-manager-capabilities"),
      ["project dev-manager-capabilities is executing -- its list is locked; use kind list (AGT-240)"],
      "an unflagged executing project is still refused, in the function's own words");
    assert.equal(rv("dev-manager-capabilities")[0], lockedListRefusal("dev-manager-capabilities", "executing"),
      "and that literal is exactly what lockedListRefusal() builds");
    assert.deepEqual(rv("security"), [], "a planned project was never locked and still is not");

    // listLocked() itself, including the FAIL-CLOSED case.
    assert.equal(listLocked(undefined), false, "no home, no lock");
    assert.equal(listLocked({ status: "executing" }), true,
      "a pre-AGT-264 context row with NO accepts_findings field stays locked -- the mirror fails closed");
    assert.equal(listLocked({ status: "executing", accepts_findings: true }), false, "flagged: not locked");
    assert.equal(listLocked({ status: "paused", accepts_findings: false }), false, "paused was never a locked status");

    // This ticket changed what REACHES the lock, not the locked statuses and not the sentence.
    assert.deepEqual([...LOCKED_PROJECT_STATUSES], ["executing", "proposed", "done"],
      "LOCKED_PROJECT_STATUSES is unmoved by AGT-264");
  });

  if (!url || !key) {
    notRun("AGT-264 arms B-E",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the live route row, the flag, the decision's five " +
      "images and the epic-lock probe are all unverified here. Run with " +
      "node --env-file-if-exists=.env.local tests/regression/agt-264-accepts-findings.test.mjs");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }

  // ---- B. LIVE, READ-ONLY ------------------------------------------------------------------------
  await arm("B live routes and --prepare", async () => {
    const r = await req(url, key, "finding_routes?select=precedence,source,finding_type,project_slug&order=precedence,source");
    assert.ok(r.ok, describe(r));
    const session = r.json.filter(x => x.source === "session");
    assert.equal(session.length, 1, `exactly one \`session\` route; got ${JSON.stringify(session)}`);
    assert.deepEqual(session[0], { precedence: 30, source: "session", finding_type: "*", project_slug: null },
      "the session row is precedence 30 / `*` / NULL -- the staff-watch shape, so the manager picks");
    assert.equal(r.json.filter(x => x.source === "*" && x.finding_type === "*").length, 0,
      "still no (*,*) catch-all -- an unmapped source must keep STOPPING the review");
    assert.equal(r.json[0].precedence, 10, "security still holds the lowest precedence");

    const ctxPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "agt264-")), "ctx.json");
    const p = spawnSync(process.execPath, [SCRIPT, "--prepare", `--week=${isoWeek(new Date())}`, `--out=${ctxPath}`],
      { encoding: "utf8" });
    assert.ok(p.status === 0 || p.status === 3,
      `--prepare must exit 0 or 3 (nothing to review), never 1/2; got ${p.status} ${p.stderr}`);
    if (p.status === 3) {
      notRun("AGT-264 arm B (--prepare half)", "the worklist was empty (exit 3, NOTHING_TO_REVIEW) -- ctx.projects unverified this run");
      return;
    }
    const ctx = JSON.parse(fs.readFileSync(ctxPath, "utf8"));
    assert.ok(Array.isArray(ctx.projects) && ctx.projects.length > 0, "ctx.projects must be a non-empty array");
    for (const row of ctx.projects) {
      assert.equal(typeof row.accepts_findings, "boolean",
        `every ctx.projects row must carry accepts_findings as a boolean; ${row.slug} has ${typeof row.accepts_findings}`);
    }
    assert.ok(ctx.projects.some(x => x.accepts_findings === true),
      "at least one project must reach the manager flagged, or the pick he is being asked to make is invisible to him");
  });

  // ---- C. LIVE PROBE, NO WRITES, STATUS-INDEPENDENT ----------------------------------------------
  await arm("C live probe, both directions", async () => {
    // THE NO-WRITE PROOF IS "NOTHING WAS ADDED", NOT "THE NUMBERS ARE IDENTICAL", and that is a
    // measurement, not a convenience: on the AGT-264 ship run these three counts fell by one decision
    // and one ticket BETWEEN the two reads (1366/1134 -> 1365/1133 at 19:07Z) while this arm ran, and
    // then held still. This is a shared live project with a runner cycle on it. A probe that only
    // SELECTs or RAISEs cannot delete a row, so a DECREASE can never be this arm's doing -- pinning
    // equality would hand the next cycle a false red to diagnose (pattern:163). An INCREASE still
    // fails, which is the direction a stray write would actually move, and the two residue checks
    // below catch a probe row even if some other write masked the count.
    const before = {
      findings: await count(url, key, "audit_findings?select=id"),
      tickets: await count(url, key, "backlog_items?select=id"),
      decisions: await count(url, key, "runner_decisions?select=id"),
    };

    const projects = await req(url, key, "projects?select=slug,status,accepts_findings&order=slug");
    assert.ok(projects.ok, describe(projects));
    const routes = await req(url, key, "finding_routes?select=precedence,source,finding_type,project_slug&order=precedence,source");
    assert.ok(routes.ok, describe(routes));

    // A finding the MANAGER picks for (its lowest-precedence route carries project_slug NULL).
    const open = await req(url, key, "audit_findings?status=in.(open,carried)&select=id,found_by,finding_type&order=created_at,id");
    assert.ok(open.ok, describe(open));
    const routeFor = f => routes.json
      .filter(r => (r.source === sourceOf(f.found_by) || r.source === "*") && (r.finding_type === f.finding_type || r.finding_type === "*"))
      .sort((a, b) => a.precedence - b.precedence || String(a.source).localeCompare(String(b.source)))[0];
    const pickable = (open.json ?? []).find(f => { const r = routeFor(f); return r && r.project_slug === null; });
    if (!pickable) {
      notRun("AGT-264 arm C", "no live manager-pick finding to route -- the probe needs one open/carried finding whose route leaves the project to the manager");
      return;
    }

    let accepted = 0, refused = 0;
    for (const row of projects.json) {
      // THE EXPECTATION IS COMPUTED FROM THE ROW AS READ -- no slug, no status is a literal here, so a
      // pause/resume in the live world (auditor-enhancements, 09-28 17:19Z) cannot make this arm lie.
      const expect = row.accepts_findings ? 200
        : (LOCKED_PROJECT_STATUSES.includes(row.status) ? 400 : null);
      if (expect === null) continue;

      const res = await req(url, key, "rpc/finding_group_epic", {
        method: "POST",
        body: { p_group: { kind: "root-cause", project: row.slug, finding_ids: [pickable.id] } },
      });
      if (expect === 200) {
        assert.equal(res.status, 200,
          `a FLAGGED project must be accepted whatever its status (${row.slug} is ${row.status}); got ${describe(res)}`);
        assert.match(String(res.json), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
          `and must answer with its epic's uuid; got ${describe(res)}`);
        accepted += 1;
      } else {
        assert.equal(res.status, 400, `an unflagged ${row.status} project must still be refused (${row.slug}); got ${describe(res)}`);
        assert.equal(res.code, "P0001", describe(res));
        // THE MIRROR PROOF: the DB's sentence IS the offline one, prefix aside. Byte-for-byte.
        assert.equal(String(res.json.message), `${PREFIX}${lockedListRefusal(row.slug, row.status)}`,
          "the live refusal must equal scripts/audit-review.js's mirror plus the function's prefix, byte-for-byte");
        refused += 1;
      }
    }
    assert.ok(accepted >= 1, "at least one flagged project must have been accepted, or this ticket did nothing");
    assert.ok(refused >= 1, "at least one unflagged locked project must still refuse, or the lock was removed rather than gated");

    const after = {
      findings: await count(url, key, "audit_findings?select=id"),
      tickets: await count(url, key, "backlog_items?select=id"),
      decisions: await count(url, key, "runner_decisions?select=id"),
    };
    for (const k of Object.keys(before)) {
      assert.ok(after[k] <= before[k],
        `the probe adds nothing: ${k} went ${before[k]} -> ${after[k]}`);
    }
    const residueT = await req(url, key, "backlog_items?source_file=eq.agt-264-test&select=backlog_id");
    assert.deepEqual(residueT.json, [], `the probe left a ticket behind: ${residueT.text}`);
    const residueF = await req(url, key, "audit_findings?found_by=like.*qa-agt264*&select=id,found_by");
    assert.deepEqual(residueF.json, [], `a probe/fixture finding survived: ${residueF.text}`);
  });

  // ---- D. LIVE: the one atomic decision and its five before-images --------------------------------
  await arm("D the agent-row decision", async () => {
    const d = await req(url, key,
      `runner_decisions?kind=eq.agent-row&backlog_id=eq.AGT-264&cycle_id=eq.${CYCLE}&select=id,status,reversed_at`);
    assert.ok(d.ok, describe(d));
    const live = (d.json ?? []).filter(x => x.reversed_at === null);
    assert.ok(live.length >= 1, `no unreversed agent-row decision for AGT-264 in this cycle; got ${JSON.stringify(d.json)}`);

    // THE MIGRATION'S OWN HANDLE, found by the rows it imaged. A candidate is "the migration's" when
    // it images any of MIGRATION_ROWS; a split across handles shows as two or more candidates each
    // touching some of them, and an unrelated agent-row write in the same cycle (a card re-pin) touches
    // none and is ignored -- so this fails on the defect it guards and not on routine platform work.
    const touching = [];
    for (const c of live) {
      const r = await req(url, key,
        `runner_before_images?decision_id=eq.${c.id}&select=table_name,pk_value,row_data`);
      assert.ok(r.ok, describe(r));
      const hits = (r.json ?? []).filter(i => MIGRATION_ROWS.some(([t, pk]) => t === i.table_name && pk === i.pk_value));
      if (hits.length) touching.push({ id: c.id, images: r.json, hits: hits.length });
    }
    assert.equal(touching.length, 1,
      `the migration's five rows must be imaged under ONE decision handle; ${touching.length} decision(s) touch them: ${JSON.stringify(touching.map(t => ({ id: t.id, rows_touched: t.hits })))}`);
    const imgs = { json: touching[0].images };
    assert.equal(imgs.json.length, 5, `the decision must carry exactly five images; got ${imgs.json.length}`);
    assert.deepEqual(imgs.json.map(i => i.table_name).sort(),
      ["audit_findings", "audit_findings", "backlog_items", "projects", "skill_profiles"],
      "one image per written row: the flag, the Skill, AGT-106 and the two findings");
    for (const i of imgs.json) {
      assert.notEqual(i.row_data, null, `${i.table_name} image carries a null row_data -- an UPDATE image must hold the whole row`);
    }

    // EACH IMAGE HOLDS THE *BEFORE* STATE. This is the assertion that proves the image was written
    // before its update, and that reverse_decision() would really put the old values back.
    const one = t => imgs.json.filter(i => i.table_name === t);
    assert.equal(one("backlog_items")[0].row_data.epic_id, INTAKE_EPIC,
      "the backlog_items image must still hold AGT-106 in the Intake epic");
    assert.equal(one("backlog_items")[0].row_data.backlog_id, "AGT-106", "and must be AGT-106");
    assert.equal(one("projects")[0].row_data.accepts_findings, false,
      "the projects image must hold accepts_findings FALSE -- imaged before the flag was set");
    assert.ok(!String(one("skill_profiles")[0].row_data.method).includes("EXCEPTION (AGT-264"),
      "the skill_profiles image must NOT carry sentence S -- imaged before the Skill was edited");
    assert.deepEqual(one("audit_findings").map(i => i.row_data.status).sort(), ["escalated", "listed"],
      "both audit_findings images must hold the pre-reopen statuses");
  });

  // ---- E. LIVE: the epic lock no longer refuses a flagged project's locked epic -------------------
  await arm("E epic lock from the insert side", async () => {
    const before = await count(url, key, "backlog_items?select=id");
    const ins = await req(url, key, "backlog_items", {
      method: "POST",
      prefer: "return=representation",
      body: {
        backlog_id: PROBE_ID, tier: "next", type: "Tooling", priority_class: "P10 - Tooling",
        title: "AGT-264 regression probe", status: "open", epic_id: AT_EPIC,
        source_file: "agt-264-test", scope_origin: "discovered", size_stamp: "S", defer_status: "no",
        scope_rationale: "probe", enhancement_claim: "none: probe", row_ordinal: 999999999,
      },
    });
    if (ins.ok) {
      const del = await req(url, key, `backlog_items?backlog_id=eq.${PROBE_ID}`, { method: "DELETE" });
      assert.ok(del.ok, `the probe ticket must be deleted again; got ${describe(del)}`);
      notRun("AGT-264 arm E (AGT-238 half)",
        "the insert LANDED, so the AGT-240 epic lock plainly did not refuse it -- what AGT-238's finding rule does at commit is not this ticket's claim");
    } else {
      // The lock must not be what refused. Anything else (AGT-238's deferred finding rule) is fine.
      assert.ok(!ins.text.includes("AGT-240: epic"),
        `a flagged project's locked epic must no longer draw the AGT-240 refusal; got ${describe(ins)}`);
    }
    assert.equal(await count(url, key, "backlog_items?select=id"), before,
      "backlog_items count re-read equal -- the probe leaves nothing behind");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
