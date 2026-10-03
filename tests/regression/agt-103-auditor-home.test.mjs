// DeepBench v7.0.558 | tests/regression/agt-103-auditor-home.test.mjs | AGT-103 -- every ticket the
// Development Manager files from an Auditor finding is homed in the Auditor Enhancements epic (project
// `auditor-enhancements`). Migration `agt103_auditor_home` (applied over the Supabase MCP) replaces the one
// line of apply_audit_review() step 3 that copied AGT-86's epic with a by-name lookup that RAISEs unless
// exactly one epic named `Auditor Enhancements` lives under project `auditor-enhancements`.
// Kickoff docs/kickoffs/v7.0.558-AGT-103-auditor-home.md §6.
//
// ARMS, each discriminating -- every one FAILS on the tree before the change:
//   M  MIGRATION LEDGER (live) -- rpc/migrations_in_range lists `agt103_auditor_home` after 9b. The row
//      exists only because the migration's trailing DO passed: sub-block A homed the rolled-back fixture
//      ticket in epic 6c8a8325 / project auditor-enhancements; sub-block B (epic renamed) raised loud.
//      Pre-change: absent.
//   D  DOWN CAPTURED BEFORE UP (live) -- runner_migration_downs has one auto-downable row whose down_sql
//      restores the AGT-86 anchor and does not carry the new lookup. Pre-change: 0 rows.
//   C  CONTROLS (live, write-proof) -- a reason-less carry probe is refused (400 P0001) before any write;
//      the anon key is refused with a privilege denial (never PGRST202); backlog_items / runner_decisions
//      counts re-read equal; exactly one `Auditor Enhancements` epic, under slug auditor-enhancements.
//
// Never writes a row. The filing itself is proven ONLY by the migration's rolled-back sub-block A.

import assert from "node:assert/strict";
import { selfRun, notRun } from "./_lib/self-run.js";

const UP = "agt103_auditor_home";
const PREV = "20260923211705"; // agt86_s9b_checklist_edits
const HOME_EPIC = "6c8a8325-205c-4e08-b0b2-64c939582cc6";
const ZERO = "00000000-0000-0000-0000-000000000000";

async function req(url, key, q, { method = "GET", body } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}
const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 240)}`;
async function count(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, { method: "HEAD", headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" } });
  const cr = res.headers.get("content-range") ?? "";
  const n = Number(cr.split("/")[1]);
  if (!res.ok || !Number.isFinite(n)) throw new Error(`count ${q} -> HTTP ${res.status} content-range=${cr}`);
  return n;
}

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";

  if (!url || !key) {
    notRun("AGT-103 live arms (M, D, C)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the migration ledger, the captured down and the write-proof controls are unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
    return;
  }

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // --- M. migration ledger ---------------------------------------------------------------------------
  await arm("M ledger", async () => {
    const r = await req(url, key, "rpc/migrations_in_range", { method: "POST", body: { p_from: PREV, p_to: "99999999999999" } });
    assert.equal(r.status, 200, `migrations_in_range must answer; got ${describe(r)}`);
    assert.ok(Array.isArray(r.json), "an array of {version, name}");
    const hits = r.json.filter(m => m.name === UP);
    assert.equal(hits.length, 1, `exactly one applied migration named ${UP} after ${PREV}; got ${JSON.stringify(r.json.map(m => m.name))}`);
    assert.ok(hits[0].version > PREV, `${UP} is applied after 9b (${hits[0].version})`);
  });

  // --- D. down captured before up --------------------------------------------------------------------
  await arm("D down", async () => {
    const r = await req(url, key, `runner_migration_downs?up_name=eq.${UP}&select=classification,down_sql,captured_at`);
    assert.equal(r.status, 200, describe(r));
    assert.equal(r.json.length, 1, `one captured down for ${UP}; got ${r.json.length}`);
    const [d] = r.json;
    assert.equal(d.classification, "auto-downable");
    assert.ok(d.down_sql.includes("backlog_id = 'AGT-86'"), "the down restores the AGT-86 anchor");
    assert.ok(!d.down_sql.includes("Auditor Enhancements"), "the down was captured BEFORE the up (no new lookup in it)");
    const m = await req(url, key, "rpc/migrations_in_range", { method: "POST", body: { p_from: PREV, p_to: "99999999999999" } });
    const up = (m.json ?? []).find(x => x.name === UP);
    assert.ok(up, `${UP} applied`);
    const upAt = up.version; // YYYYMMDDHHMMSS, UTC
    const capAt = new Date(d.captured_at).toISOString().replace(/[-:T]/g, "").slice(0, 14);
    assert.ok(capAt <= upAt, `down captured (${capAt}) no later than the up (${upAt})`);
  });

  // --- C. controls (write-proof) --------------------------------------------------------------------
  await arm("C controls", async () => {
    const before = {
      backlog: await count(url, key, "backlog_items?select=id"),
      decisions: await count(url, key, "runner_decisions?select=id"),
    };
    const probe = { p_cycle_id: null, p_session_name: "agt-103-qa", p_week: "2026-W39",
      p_review: { groups: [{ kind: "carry", finding_ids: [ZERO] }], summary_for_john: "qa", patterns_applied: [] } };
    const r = await req(url, key, "rpc/apply_audit_review", { method: "POST", body: probe });
    assert.equal(r.status, 400, `the reason-less carry probe must be refused; got ${describe(r)}`);
    assert.equal(r.code, "P0001", `a RAISE, not a type error; got ${describe(r)}`);
    assert.match(String(r.json && r.json.message), /carry needs a reason/);
    if (anon) {
      const a = await req(url, anon, "rpc/apply_audit_review", { method: "POST", body: probe });
      assert.notEqual(a.code, "PGRST202", `PGRST202 means the function is missing, never a pass; got ${describe(a)}`);
      assert.ok(!a.ok, `anon must not execute; got ${describe(a)}`);
      assert.match(a.text, /42501|permission denied/, `a privilege denial; got ${describe(a)}`);
    } else {
      notRun("AGT-103 arm C (anon half)", "VITE_SUPABASE_ANON_KEY absent -- the anon refusal of apply_audit_review is unverified here");
    }
    const after = {
      backlog: await count(url, key, "backlog_items?select=id"),
      decisions: await count(url, key, "runner_decisions?select=id"),
    };
    assert.deepEqual(after, before, "no probe wrote: backlog_items and runner_decisions counts unchanged");
    const e = await req(url, key, "epics?name=eq.Auditor%20Enhancements&select=id,projects(slug)");
    assert.equal(e.status, 200, describe(e));
    assert.equal(e.json.length, 1, `exactly one epic named Auditor Enhancements; got ${e.json.length}`);
    assert.equal(e.json[0].id, HOME_EPIC);
    assert.equal(e.json[0].projects && e.json[0].projects.slug, "auditor-enhancements");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
