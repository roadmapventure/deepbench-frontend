// DeepBench v7.0.1061 | tests/regression/agt-683-attended-park.test.mjs | AGT-683 -- an attended-only redesign parks the ticket instead of re-offering it daily.
//
// THE DEFECT, measured 2026-11-19. A redesign cycle that rules a ticket attended-only writes only
// record_skip('needs-desktop'), which KEEPS the ticket in refusal_parked_tickets(); the only brake was
// redesign_due_ticket()'s 24-hour cooldown, so 54 redesign cycles since 11-13 went to 20 tickets
// (AGT-237 15 times, AGT-251 9 times). The fix: park_attended_only() writes an attempt-0 `parked`
// ledger row, which refusal_parked_tickets() already excludes; refusal_parked_why() labels why a
// listed ticket is listed; --diagnose refuses a ticket with no refusal to diagnose.
// Spec: docs/kickoffs/v7.0.1061-AGT-683-attended-park.md section 4(f).
//
// ARMS
//   A  repo -- the SQL mirror holds both new functions and the brief's new state; diagnoseGuard()
//      refuses 0-refused ledgers and passes one with a refusal; the runbook carries --park.
//   B  live, service key, read-only (B2 is a refused call that writes nothing).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
// Namespace import, so a missing export fails as an assertion here rather than at module link time.
import * as pickup from "../../scripts/redesign-pickup.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SQL = path.join(ROOT, "docs/design/agt-683-attended-park.sql");
const RUNBOOK = path.join(ROOT, "docs/runbooks/redesign-after-refusal.md");

/** The 11 tickets T3 parked -- each already ruled attended-only by a redesign cycle. */
export const PARKED_11 = Object.freeze([
  "AGT-237", "AGT-251", "AGT-471", "AGT-705", "AGT-252", "ADM-2",
  "DAT-23", "DAT-29", "AGT-549", "SES-237", "SES-361",
]);

function armA() {
  const sql = fs.readFileSync(SQL, "utf8");
  for (const needle of ["park_attended_only", "refusal_parked_why", "parked (attended-only)"]) {
    assert.ok(sql.includes(needle), `docs/design/agt-683-attended-park.sql must hold \`${needle}\``);
  }

  assert.equal(typeof pickup.diagnoseGuard, "function",
    "scripts/redesign-pickup.js must export diagnoseGuard(rows) (AGT-683)");
  const g0 = pickup.diagnoseGuard([]);
  const g1 = pickup.diagnoseGuard([{ refused_at: null }]);
  const g2 = pickup.diagnoseGuard([{ refused_at: "2026-11-01T00:00:00Z" }]);
  assert.ok(typeof g0 === "string" && g0.includes("0 refused"), `diagnoseGuard([]) must name 0 refused; got ${g0}`);
  assert.ok(typeof g1 === "string" && g1.includes("0 refused"), `diagnoseGuard([{refused_at:null}]) must name 0 refused; got ${g1}`);
  assert.equal(g2, null, "diagnoseGuard with a refused row must return null -- that ticket has a refusal to diagnose");

  const md = fs.readFileSync(RUNBOOK, "utf8");
  assert.ok(md.includes("--park --ticket="), "the runbook must carry the `--park --ticket=` command");

  console.log(`    [AGT-683 arm A] mirror holds both functions + 'parked (attended-only)'; diagnoseGuard: [] and [null] refused, [refused] null; runbook carries --park`);
}

async function armB() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-683 arm B (live park door, why-label, parked list)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent; export both inline by name from public.runner_secrets");
    return;
  }
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const rpc = async (fn, body) => {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers: h, body: JSON.stringify(body ?? {}) });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
    return { ok: res.ok, status: res.status, text, json };
  };

  // B1
  const w30 = await rpc("refusal_parked_why", { p_backlog_id: "DAT-30" });
  assert.ok(w30.ok, `refusal_parked_why(DAT-30) -> HTTP ${w30.status} ${w30.text.slice(0, 300)}`);
  assert.equal(w30.json, "refused", "DAT-30 holds a real refusal: refusal_parked_why must say refused");
  const w160 = await rpc("refusal_parked_why", { p_backlog_id: "AGT-160" });
  assert.ok(w160.ok, `refusal_parked_why(AGT-160) -> HTTP ${w160.status} ${w160.text.slice(0, 300)}`);
  assert.equal(w160.json, "needs-desktop", "AGT-160 has no refusal and no permission-gate skip: needs-desktop");

  // B2 -- a refused call; the function raises before any insert, so it writes nothing.
  const p = await rpc("park_attended_only", {
    p_cycle_id: "00000000-0000-0000-0000-000000000000", p_backlog_id: "ZZZ-0", p_reason: "AGT-683 arm B2 probe",
  });
  assert.ok(!p.ok, `park_attended_only(ZZZ-0) must be refused; got HTTP ${p.status} ${p.text.slice(0, 300)}`);
  const msg = String(p.json?.message ?? p.text);
  assert.ok(msg.includes("not on the redesign list"), `refusal must say 'not on the redesign list'; got: ${msg}`);

  // B3
  const list = await rpc("refusal_parked_tickets", {});
  assert.ok(list.ok && Array.isArray(list.json), `refusal_parked_tickets -> HTTP ${list.status} ${list.text.slice(0, 300)}`);
  const ids = list.json.map(r => r && r.backlog_id);
  const leaked = PARKED_11.filter(id => ids.includes(id));
  assert.deepEqual(leaked, [], `parked tickets still on the redesign list: ${leaked.join(", ")}`);
  for (const keep of ["AGT-160", "DAT-30"]) {
    assert.ok(ids.includes(keep), `${keep} must stay on the redesign list (D3); list: ${ids.join(", ")}`);
  }

  // B4
  const due = await rpc("redesign_due_ticket", {});
  assert.ok(due.ok, `redesign_due_ticket -> HTTP ${due.status} ${due.text.slice(0, 300)}`);
  assert.ok(!PARKED_11.includes(due.json), `redesign_due_ticket() named ${due.json}, one of the 11 parked`);

  console.log(`    [AGT-683 arm B] live: why DAT-30=${w30.json}, AGT-160=${w160.json}; park ZZZ-0 refused HTTP ${p.status}; parked list [${ids.join(" ")}] holds none of the 11; due ${due.json ?? "null"}`);
}

async function run() {
  armA();
  await armB();
}

selfRun(import.meta.url, run);
export default run;
