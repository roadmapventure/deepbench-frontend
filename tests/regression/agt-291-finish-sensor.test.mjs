// DeepBench v7.0.749 | tests/regression/agt-291-finish-sensor.test.mjs | AGT-291
// FEATURE: AGT-291 -- THE FINISH LINE GETS ITS SENSOR. Kickoff:
// docs/kickoffs/v7.0.749-AGT-291-finish-sensor.md §5 task 5 and §6.
//
// AGT-240 measures the finish line; nothing watched it. This file guards the three parts of the
// watch: what counts as finished (`left` = open or partial, `delivered` is BUILT), what the picker
// reads (`review_due`, the finished state AND no claim inside 24 hours), and that the pre-boot gate
// reports the same number in `detail.finish_due`.
//
// TWO ARMS; A runs offline, B needs credentials and is declared notRun without them:
//   A  PURE -- pickDue() reads the SENSOR. A row that is `review_due` is picked even beside one that
//      is `proposal_due` and NOT `review_due`; the second is skipped. CONTROL and discriminator in
//      one assertion: on origin/dev pickDue() filtered `proposal_due`, so it returned BOTH slugs.
//   B  LIVE, NO WRITES -- the three numbers must agree, each read from a different place:
//        (i)   every locked batch's `left` equals a HEAD count of its own open/partial members. This
//              is the D1 reversal: 16 of Auditor Enhancements' members are `delivered`, which the
//              old LEFT counted and the new one does not, so origin/dev reads 16 here and fails.
//        (ii)  every row's `proposal_due` equals DUE re-derived from that row's own five fields, and
//              its `review_due` equals DUE AND FRESH re-derived from `proposal_attempted_at`. The
//              pair is what separates the state from the sensor: a claimed batch stays due.
//        (iii) runner_should_boot().detail.finish_due equals the `review_due` count. The gate is
//              read over its own rpc, so a gate that never looked at the finish line disagrees.
//        (iv)  the CLAIM itself, over the shipped claimQuery(): a PATCH of an epic id that cannot
//              exist comes back `[]` -- the shape every held batch returns -- and writes nothing.
//      Nothing in this arm writes a row that exists; the backlog, epic and decision counts are
//      re-read equal at the end.

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROPOSE = pathToFileURL(path.join(ROOT, "scripts", "propose-project.js")).href;

// A v4 uuid no row can hold: the claim must answer `[]` without touching anything.
const EPIC_ABSENT = "00000000-0000-4000-8000-000000000291";
const CLAIM_MS = 24 * 3600e3;

async function req(url, key, q, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}
const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 240)}`;

// The count is taken as a HEAD with Prefer: count=exact -- a SECOND reading of the same fact, from
// the rows themselves, so the function's own aggregate is graded rather than echoed.
async function count(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  const n = Number((res.headers.get("content-range") ?? "").split("/")[1]);
  if (!res.ok || !Number.isFinite(n)) throw new Error(`count ${q} -> HTTP ${res.status}`);
  return n;
}

// AGT-291 §4, re-derived here from the ROW rather than imported, so this file is free to disagree
// with the function it grades.
const dueOf = r => ["executing", "paused"].includes(String(r.status)) &&
  r.locked_at !== null && r.finished_at === null && Number(r.members) > 0 && Number(r.left) === 0;
const freshOf = (r, nowMs) => r.proposal_attempted_at === null ||
  Date.parse(r.proposal_attempted_at) < nowMs - CLAIM_MS;

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    [arm ${name}] FAIL -- ${e.message.split("\n")[0]}`); }
  };

  // --- A. the picker reads the sensor, pure ------------------------------------------------------
  await arm("A pickDue reads review_due", async () => {
    const { pickDue } = await import(PROPOSE);
    assert.deepEqual(
      pickDue([{ slug: "b", review_due: true, proposal_due: true },
               { slug: "a", proposal_due: true, review_due: false }]).map(r => r.slug),
      ["b"],
      "only the batch whose SENSOR is up is picked -- `a` is finished (proposal_due) but claimed " +
      "inside 24 hours, so a second pass this cycle must not re-prepare it. origin/dev filtered " +
      "proposal_due and returned both");
    assert.deepEqual(pickDue([{ slug: "z", proposal_due: true }]).map(r => r.slug), [],
      "a row with no review_due at all is NOT picked -- the sensor is absent, which is never a pass");
  });

  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-291 live arm (B)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the three numbers (every locked batch's `left` " +
      "against a HEAD count of its own open/partial members, proposal_due/review_due against DUE and " +
      "FRESH re-derived from each row, and runner_should_boot().detail.finish_due against the " +
      "review_due count) and the claim's `[]` are unverified here. Credentialed run: STANDARDS.md " +
      "Section 2 rule 5");
  } else {
    await arm("B live sensor, no writes", async () => {
      const before = {
        backlog: await count(url, key, "backlog_items?select=id"),
        epics: await count(url, key, "epics?select=id"),
        decisions: await count(url, key, "runner_decisions?select=id"),
      };

      const st = await req(url, key, "rpc/project_batch_state", { method: "POST", body: {} });
      assert.equal(st.status, 200, describe(st));
      assert.ok(Array.isArray(st.json) && st.json.length > 0, `project_batch_state() returned no rows: ${describe(st)}`);
      const rows = st.json;
      for (const col of ["review_due", "proposal_attempted_at"]) {
        assert.ok(Object.prototype.hasOwnProperty.call(rows[0], col),
          `project_batch_state() must return ${col} -- AGT-291 DROPPED and CREATED the function to ` +
          "add it (a RETURNS TABLE change CREATE OR REPLACE cannot make). Its absence means the " +
          "migration agt291_finish_sensor did not land, and nothing below can be graded");
      }

      // (i) `left` is the count of OPEN or PARTIAL members -- read a second time, from the rows.
      const locked = rows.filter(r => r.locked_at !== null);
      assert.ok(locked.length > 0, "no locked batch exists, so the D1 reversal cannot be graded here");
      for (const r of locked) {
        const n = await count(url, key, `backlog_items?epic_id=eq.${r.epic_id}&status=in.(open,partial)`);
        assert.strictEqual(Number(r.left), n,
          `${r.slug}/${r.epic_name}: left=${r.left} but ${n} member(s) are open or partial. AGT-291 D1: ` +
          "`delivered` is BUILT and no longer holds a batch open -- a left that counts it (AGT-240 D2's " +
          "NOT IN ('done','removed')) reads higher than this count on every batch whose work shipped");
      }

      // (ii) the state and the sensor, each against its own re-derivation.
      const nowMs = Date.now();
      for (const r of rows) {
        assert.strictEqual(r.proposal_due, dueOf(r),
          `${r.slug}/${r.epic_name}: proposal_due=${r.proposal_due} but status=${r.status} ` +
          `locked_at=${r.locked_at} finished_at=${r.finished_at} members=${r.members} left=${r.left} ` +
          "give " + dueOf(r) + ". AGT-291 D2: `executing` OR `paused` -- Auditor Enhancements is paused");
        assert.strictEqual(r.review_due, dueOf(r) && freshOf(r, nowMs),
          `${r.slug}/${r.epic_name}: review_due=${r.review_due} but proposal_due=${dueOf(r)} and ` +
          `proposal_attempted_at=${r.proposal_attempted_at} give ${dueOf(r) && freshOf(r, nowMs)}. The ` +
          "sensor is the state AND the 24 h claim window, and nothing else");
      }

      // (iii) the GATE reports the same number.
      const finishDue = rows.filter(r => r.review_due === true).length;
      const boot = await req(url, key, "rpc/runner_should_boot", { method: "POST", body: {} });
      assert.equal(boot.status, 200, describe(boot));
      assert.equal(boot.json?.length, 1, `runner_should_boot() returned ${boot.json?.length} row(s), expected 1`);
      const d = boot.json[0].detail;
      assert.ok(Object.prototype.hasOwnProperty.call(d, "finish_due"),
        "runner_should_boot().detail must carry finish_due on EVERY verdict -- a work_to_find a reader " +
        "cannot attribute to the findings, the lists or the finish line cannot be audited");
      assert.strictEqual(Number(d.finish_due), finishDue,
        `detail.finish_due=${d.finish_due} but project_batch_state() holds ${finishDue} review_due ` +
        "batch(es). The gate must read the sensor, not the plain state and not its own copy of LEFT");
      console.log(`      [AGT-291] finish_due=${finishDue} on reason=${boot.json[0].reason}; ` +
        `due: ${rows.filter(r => r.proposal_due).map(r => `${r.slug}(left ${r.left}/${r.members})`).join(", ") || "none"}`);

      // (iv) the claim's own shape, on an id no row can hold: `[]` and nothing written.
      const { claimQuery, CLAIM_HOURS } = await import(PROPOSE);
      assert.strictEqual(CLAIM_HOURS, 24, "the claim window is 24 hours (AGT-291 D4)");
      const claim = await req(url, key, claimQuery(EPIC_ABSENT), {
        method: "PATCH", headers: { Prefer: "return=representation" },
        body: { proposal_attempted_at: new Date().toISOString() },
      });
      assert.equal(claim.status, 200, describe(claim));
      assert.deepEqual(claim.json, [],
        "the claim must come back `[]` when it matched nothing -- that empty representation is how " +
        "--prepare tells a batch another pass holds from one it just took");

      const after = {
        backlog: await count(url, key, "backlog_items?select=id"),
        epics: await count(url, key, "epics?select=id"),
        decisions: await count(url, key, "runner_decisions?select=id"),
      };
      assert.deepEqual(after, before, "no read in this arm wrote anything");
    });
  }

  notRun("AGT-291 catalog facts and the four-arm discriminator (the fixture batch reading left=0 " +
    "with both flags true, the paused batch still finishing, the gate answering work_to_find on " +
    "finish_due ALONE with both AGT-314 halves emptied, the claim muting the sensor, and the " +
    "pg_proc overload counts)",
    "those arms move runner_settings, runner_items, audit_findings, epics and backlog_items on the " +
    "LIVE board and need a transaction to roll back; a permanent regression test must never do that " +
    "(the SES-196 / SES-218 / SES-275 refusal) and PostgREST can neither read pg_proc nor open one. " +
    "The migration agt291_finish_sensor asserts all four arms plus both overload counts in its own " +
    "trailing DO block, inside a subtransaction ending in the sentinel P0291, which aborts the whole " +
    "migration on any mismatch. Mirror: docs/design/agt-291-finish-sensor.sql.");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
