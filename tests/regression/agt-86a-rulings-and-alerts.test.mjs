// DeepBench v7.0.542 | tests/regression/agt-86a-rulings-and-alerts.test.mjs | AGT-86 slice 1a
//
// FEATURE: AGT-86 slice 1a -- the manager can rule on an audit finding, and John's five calls have
// one alert list. Migration `agt86_s1a_rulings_and_alerts` (applied over the Supabase MCP, no repo
// file): audit_findings gains the `other` kind, the `ticketed/carried/escalated` statuses, and three
// columns (check_slug insert-only; filed_backlog_id + john_call in the ruling band), and
// public.john_alerts + public.claim_john_alerts() are the one alert list and its claim-once reader.
//
// FIVE ARMS (kickoff §6), each discriminating -- every one FAILS on the tree before the migration:
//   V  VOCABULARY -- a POST carrying every new value on the probe key reaches the UNIQUE index
//      (23505), which only happens once all the CHECKs pass: the unique index fires AFTER them, so
//      nothing is written. Pre-change: PGRST204 (no check_slug column); with check_slug + john_call
//      omitted, 23514 naming audit_findings_kind_check. `john_call:'bogus'` must be 23514 naming
//      audit_findings_john_call_check. The row count re-reads the same before and after.
//   G  GUARD BAND -- check_slug is insert-only (PATCH -> P0001 /append-only/), filed_backlog_id is
//      in the ruling band (PATCH to its own value -> 2xx). Pre-change: PGRST204 both.
//   C  CLAIM ONCE, NEVER TWICE -- one john_alerts fixture; the first claim returns it with
//      notified_at set, the second returns nothing for that id; the fixture is deleted and the
//      count re-reads its pre-test value. Pre-change: the POST is 404 PGRST205. The claim marks
//      EVERY unnotified row, so if any real unnotified alert exists the arm declares NOT RUN rather
//      than stealing it (a test never mutates working data).
//   A  ANON -- the same rpc with the anon key is refused with 42501/permission denied; PGRST202
//      (function missing) is the pre-change red and never a pass. Anon GET john_alerts is refused.
//   K  CONTROL -- the probe row's status/ruling are unchanged, and DELETE on audit_findings is still
//      P0001.
//
// Every arm runs even when an earlier one fails; the test throws once at the end with every arm's
// failure, so a single run reports the whole pre/post picture. Never inserts into audit_findings
// (the ledger is permanent).

import assert from "node:assert/strict";
import { selfRun, notRun } from "./_lib/self-run.js";

const PROBE = { fingerprint: "e141f20a37d1fbe9", iso_week: "2026-W37" };
const SESSION_TAG = "agt-86a-qa";

function restHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function call(url, key, method, q, body, extra = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: restHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation", ...extra }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}

const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 240)}`;

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-86a live arms (V, G, C, A, K)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the vocabulary, guard band, claim-once, anon and control arms are unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
    return;
  }

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  const get = async q => {
    const r = await call(url, key, "GET", q);
    if (!r.ok) throw new Error(`GET ${q} -> ${describe(r)}`);
    return r.json;
  };

  const probeQ = `audit_findings?fingerprint=eq.${PROBE.fingerprint}&iso_week=eq.${PROBE.iso_week}`;
  const [probe] = await get(`${probeQ}&select=*`);
  assert.ok(probe, `the probe row ${PROBE.fingerprint}/${PROBE.iso_week} must exist -- every arm keys on it`);
  const findingsBefore = (await get("audit_findings?select=id")).length;

  // --- V. vocabulary ------------------------------------------------------------------------------
  await arm("V vocabulary", async () => {
    // found_by is NOT NULL on audit_findings, and NOT NULL is checked BEFORE the CHECKs -- without it
    // every POST here would stop at 23502 and never reach the constraint under test.
    const base = { ...PROBE, locations: [{}], confidence: "high", governing_fact: "qa", proposed_resolution: "qa", found_by: SESSION_TAG };
    const full = await call(url, key, "POST", "audit_findings", { ...base, kind: "other", status: "ticketed", john_call: "money", check_slug: "x" });
    assert.equal(full.code, "23505",
      `every new value must clear its CHECK and stop only at the unique index (23505); got ${describe(full)}`);

    const bogus = await call(url, key, "POST", "audit_findings", { ...base, kind: "other", status: "ticketed", john_call: "bogus", check_slug: "x" });
    assert.equal(bogus.code, "23514", `john_call:'bogus' must be a CHECK violation (23514); got ${describe(bogus)}`);
    assert.match(bogus.text, /audit_findings_john_call_check/, `the refusal must name audit_findings_john_call_check; got ${describe(bogus)}`);

    // Each new status on its own, so one value missing from the list cannot hide behind another.
    for (const status of ["carried", "escalated"]) {
      const r = await call(url, key, "POST", "audit_findings", { ...base, kind: "other", status });
      assert.equal(r.code, "23505", `status '${status}' must clear audit_findings_status_check; got ${describe(r)}`);
    }

    const after = (await get("audit_findings?select=id")).length;
    assert.equal(after, findingsBefore, `no probe may write a row: count ${findingsBefore} -> ${after}`);
  });

  // --- G. guard band ------------------------------------------------------------------------------
  await arm("G guard band", async () => {
    const slug = await call(url, key, "PATCH", `audit_findings?id=eq.${probe.id}`, { check_slug: "x" });
    assert.ok(!slug.ok, `check_slug is insert-only -- the PATCH must be refused; got ${describe(slug)}`);
    assert.equal(slug.code, "P0001", `the refusal must be the guard's RAISE (P0001); got ${describe(slug)}`);
    assert.match(slug.text, /append-only/, `the refusal must come from audit_findings_guard; got ${describe(slug)}`);
    assert.match(slug.text, /filed_backlog_id, john_call/, `the guard message must name the widened ruling band; got ${describe(slug)}`);

    // §19v: before-image first, even for a write of the column's own value, cleaned up after.
    const img = await call(url, key, "POST", "runner_before_images",
      { table_name: "audit_findings", pk_value: probe.id, row_data: probe, session_name: SESSION_TAG });
    assert.ok(img.ok, `the before-image must land before the QA write (§19v); got ${describe(img)}`);
    try {
      const own = probe.filed_backlog_id ?? null;
      const band = await call(url, key, "PATCH", `audit_findings?id=eq.${probe.id}`, { filed_backlog_id: own });
      assert.ok(band.ok, `filed_backlog_id is in the ruling band -- the PATCH must succeed; got ${describe(band)}`);
    } finally {
      await call(url, key, "DELETE", `runner_before_images?session_name=eq.${SESSION_TAG}`);
    }
  });

  // --- C. claim once, never twice -----------------------------------------------------------------
  await arm("C claim once", async () => {
    const pre = await call(url, key, "GET", "john_alerts?select=id,notified_at");
    assert.ok(pre.ok, `john_alerts must exist and be readable by service_role; got ${describe(pre)}`);
    const countBefore = pre.json.length;
    if (pre.json.some(r => r.notified_at === null)) {
      notRun("AGT-86a arm C (claim once)",
        "john_alerts holds a real unnotified alert; claim_john_alerts() would mark it notified, and a test never mutates working data");
      return;
    }
    const fixture = { source: SESSION_TAG, fingerprint: `${SESSION_TAG}-${Date.now()}`, summary: "agt-86a claim-once probe", notified_at: null };
    const ins = await call(url, key, "POST", "john_alerts", fixture);
    assert.ok(ins.ok, `the fixture POST must land; got ${describe(ins)}`);
    const id = ins.json[0].id;
    try {
      const first = await call(url, key, "POST", "rpc/claim_john_alerts", {});
      assert.ok(first.ok, `the first claim must succeed; got ${describe(first)}`);
      const mine = first.json.filter(r => r.id === id);
      assert.equal(mine.length, 1, `the first claim must return the fixture; got ${describe(first)}`);
      assert.ok(mine[0].notified_at, "the claimed row must come back with notified_at set");

      const second = await call(url, key, "POST", "rpc/claim_john_alerts", {});
      assert.ok(second.ok, `the second claim must succeed; got ${describe(second)}`);
      assert.equal(second.json.filter(r => r.id === id).length, 0,
        `the second claim must NOT return the fixture again -- a claim is once; got ${describe(second)}`);
    } finally {
      await call(url, key, "DELETE", `john_alerts?id=eq.${id}`);
    }
    const countAfter = (await get("john_alerts?select=id")).length;
    assert.equal(countAfter, countBefore, `the fixture must be gone: john_alerts ${countBefore} -> ${countAfter}`);
  });

  // --- A. anon ------------------------------------------------------------------------------------
  await arm("A anon", async () => {
    if (!anon) {
      notRun("AGT-86a arm A (anon)", "VITE_SUPABASE_ANON_KEY absent -- the anon refusal of claim_john_alerts() and john_alerts is unverified here");
      return;
    }
    const rpc = await call(url, anon, "POST", "rpc/claim_john_alerts", {});
    assert.notEqual(rpc.code, "PGRST202", `PGRST202 means the function does not exist -- that is the pre-change red, never a pass; got ${describe(rpc)}`);
    assert.ok(!rpc.ok, `anon must not be able to claim John's alerts; got ${describe(rpc)}`);
    assert.match(rpc.text, /42501|permission denied/, `the refusal must be a privilege denial; got ${describe(rpc)}`);

    const read = await call(url, anon, "GET", "john_alerts?select=id");
    assert.notEqual(read.code, "PGRST205", `PGRST205 means the table does not exist -- the pre-change red; got ${describe(read)}`);
    assert.ok(!read.ok, `anon must not be able to read john_alerts; got ${describe(read)}`);
  });

  // --- K. control ---------------------------------------------------------------------------------
  await arm("K control", async () => {
    const [now] = await get(`${probeQ}&select=status,ruling`);
    assert.equal(now.status, probe.status, "the probe row's status must be exactly as found");
    assert.equal(now.ruling, probe.ruling, "the probe row's ruling must be exactly as found");
    const del = await call(url, key, "DELETE", `audit_findings?id=eq.${probe.id}`);
    assert.equal(del.code, "P0001", `DELETE on audit_findings must still be the guard's refusal; got ${describe(del)}`);
    const after = (await get("audit_findings?select=id")).length;
    assert.equal(after, findingsBefore, `audit_findings count must be unchanged: ${findingsBefore} -> ${after}`);
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
