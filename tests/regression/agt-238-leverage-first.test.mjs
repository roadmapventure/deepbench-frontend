// DeepBench v7.0.660 | tests/regression/agt-238-leverage-first.test.mjs | AGT-238 slice 1 -- LEVERAGE
// FIRST ON THE BOARD, AND TICKETS ONLY FROM FINDINGS.
//
// WHAT SHIPPED (migration agt238_leverage_first, mirrored at docs/design/agt-238-leverage-first.sql).
// A ticket The Development Manager marks as leverage -- `backlog_items.leverage_reason`, written only
// by `public.record_leverage()` -- outranks project priority in BOTH pick homes; and a ticket inserted
// with no `audit_findings` row naming it is refused at commit unless it is john-named / enhancement
// or its source_file matches `runner_settings.ticket_filing_exempt_sources`.
//
// FOUR ARMS, each able to fail on its own:
//   (A) THE SHIPPED TEXT (no credentials). `sort_leverage` precedes `sort_project` in
//       prime_directive_queue()'s ranked ORDER BY, and the leverage CASE precedes `pj.priority` in
//       drain_epic_next's pick. SES-158 CONTROL: the same judgement over a mutant with the leverage
//       key removed from each ORDER BY must THROW.
//   (B) THE DRIVER (no credentials). `answerErrors` refuses an off-queue leverage id and a blank
//       `why`, and returns NOTHING for a valid mark or for an answer with no `leverage` at all.
//   (C) THE LIVE LANE (read-only). In prime_directive_queue()'s selfbuild lane no row WITHOUT
//       leverage_reason precedes a row WITH it. notRun when no served row carries one (vacuous).
//   (D) THE LIVE GUARD. A `discovered` POST with no finding (`ZZLV-238`, source_file
//       `agt-238-probe`) is REFUSED with `AGT-238`; the same POST from this file's own source_file
//       (an exempt `tests/regression/%` fixture) is ACCEPTED and then deleted; 0 rows remain.
//
// NO MODEL CALL, NO SPEND. The only writes are arm D's fixture, deleted unconditionally.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { answerErrors, leverageErrors } from "../../scripts/run-project.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATION = path.join(ROOT, "docs", "design", "agt-238-leverage-first.sql");
const SELF = "tests/regression/agt-238-leverage-first.test.mjs";

// ---------------------------------------------------------------------------------------------
// (A) the shipped migration text
// ---------------------------------------------------------------------------------------------

function sliceFunction(src, signature) {
  const start = src.indexOf(`CREATE OR REPLACE FUNCTION ${signature}`);
  assert.ok(start >= 0, `the migration does not define ${signature}`);
  const open = src.indexOf("AS $function$", start);
  const close = src.indexOf("$function$", open + "AS $function$".length);
  assert.ok(open > start && close > open, `${signature}: no $function$ body`);
  return src.slice(start, close);
}

// Top-level comma split, comments stripped (a CASE carries no top-level comma).
function splitKeys(clause) {
  const text = clause.replace(/--[^\n]*/g, " ");
  const out = [];
  let depth = 0, cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map(k => k.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function assertLeverageLeads(src) {
  const prime = sliceFunction(src, "public.prime_directive_queue()");
  const pm = prime.match(/row_number\(\) OVER \(\s*\n\s*ORDER BY ([\s\S]*?)\n\s*\)::int AS pos/);
  assert.ok(pm, "prime_directive_queue(): could not find the ranked `row_number() OVER (ORDER BY ...)`");
  const pk = splitKeys(pm[1]);
  const lev = pk.findIndex(k => /^sort_leverage\b/.test(k));
  const proj = pk.findIndex(k => /^sort_project\b/.test(k));
  assert.ok(proj >= 0, `prime_directive_queue(): no sort_project key in ${JSON.stringify(pk)}`);
  assert.ok(lev >= 0, `prime_directive_queue(): no sort_leverage key in its ranked ORDER BY -- leverage does not outrank project priority. Keys: ${JSON.stringify(pk)}`);
  assert.ok(lev < proj, `prime_directive_queue(): sort_leverage at ${lev} does not precede sort_project at ${proj}`);

  const drain = sliceFunction(src, "public.drain_epic_next(p_cycle_id uuid)");
  const at = drain.indexOf("INTO v_pick, v_queue");
  assert.ok(at >= 0, "drain_epic_next(uuid): could not find the pick SELECT (`INTO v_pick, v_queue`)");
  const dm = drain.slice(at).match(/\n\s*ORDER BY ([\s\S]*?)\n\s*LIMIT 1;/);
  assert.ok(dm, "drain_epic_next(uuid): could not find the pick's `ORDER BY ... LIMIT 1;`");
  const dk = splitKeys(dm[1]);
  const dlev = dk.findIndex(k => /leverage_reason/.test(k));
  const dprio = dk.findIndex(k => /^pj\.priority$/.test(k));
  assert.ok(dprio >= 0, `drain_epic_next(uuid): no pj.priority key in ${JSON.stringify(dk)}`);
  assert.ok(dlev >= 0, `drain_epic_next(uuid): no leverage key in its pick ORDER BY -- leverage does not outrank project priority. Keys: ${JSON.stringify(dk)}`);
  assert.ok(dlev < dprio, `drain_epic_next(uuid): the leverage key at ${dlev} does not precede pj.priority at ${dprio}`);
}

function armA() {
  assert.ok(fs.existsSync(MIGRATION), `${path.relative(ROOT, MIGRATION)} is missing -- it IS the migration AGT-238 applied`);
  const src = fs.readFileSync(MIGRATION, "utf8");
  assertLeverageLeads(src);

  // SES-158 CONTROL: remove the leverage key from each ORDER BY (leaving a well-formed clause).
  const a1 = "ORDER BY lane_ord, sort_key, sort_leverage, sort_project NULLS LAST";
  const a2 = "ORDER BY CASE WHEN b.leverage_reason IS NOT NULL THEN 0 ELSE 1 END,\n              pj.priority,";
  assert.ok(src.includes(a1) && src.includes(a2), "the control's anchors no longer match the shipped text");
  for (const mutant of [
    src.replace(a1, "ORDER BY lane_ord, sort_key, sort_project NULLS LAST"),
    src.replace(a2, "ORDER BY pj.priority,"),
  ]) {
    let err = null;
    try { assertLeverageLeads(mutant); } catch (e) { err = e; }
    assert.ok(err, "SES-158 control: with a leverage key removed the arm still passed -- it grades nothing");
    assert.match(err.message, /no (sort_leverage|leverage) key/, `the control threw for the wrong reason: ${err && err.message}`);
  }
  console.log("  [AGT-238] arm A: leverage leads both pick ORDER BYs in the shipped SQL; both key-removed mutants throw.");
}

// ---------------------------------------------------------------------------------------------
// (B) the driver's refusals -- pure
// ---------------------------------------------------------------------------------------------

function armB() {
  const state = { project: "p", queue: [{ ref: "AGT-1", lane: "selfbuild" }, { ref: "AGT-2", lane: "selfbuild" }, { ref: null, lane: "board" }] };
  const base = { project: "p", action: "stop", assignment: null, report: "r", needs_john: [], patterns_applied: [] };

  const off = answerErrors({ ...base, leverage: [{ backlog_id: "ZZ-9", improves: "x", why: "y" }] }, state);
  assert.strictEqual(off.length, 1, `an off-queue leverage id must be refused with exactly one line; got ${JSON.stringify(off)}`);
  assert.match(off[0], /"leverage"\[0\] names "ZZ-9", which prime_directive_queue\(\) did not return/);

  const blank = answerErrors({ ...base, leverage: [{ backlog_id: "AGT-2", improves: "the pick path", why: "  " }] }, state);
  assert.strictEqual(blank.length, 1, `a blank why must be refused with exactly one line; got ${JSON.stringify(blank)}`);
  assert.match(blank[0], /carries a blank "why"/);

  const notList = leverageErrors({ leverage: "AGT-1" }, state);
  assert.match(notList[0] ?? "", /not an array/, "a non-array leverage must be refused");

  const valid = answerErrors({ ...base, leverage: [{ backlog_id: "AGT-1", improves: "every later cycle's pick", why: "it fixes the ranking they all read" }] }, state);
  assert.deepStrictEqual(valid, [], `a valid leverage mark must be clean; got ${JSON.stringify(valid)}`);
  assert.deepStrictEqual(answerErrors(base, state), [], "an answer with no leverage must be unchanged (clean)");
  console.log("  [AGT-238] arm B: answerErrors refuses an off-queue id and a blank why; a valid mark and an absent one are clean.");
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
  const q = await call(url, key, "rpc/prime_directive_queue", { method: "POST", body: "{}" });
  assert.ok(q.ok && Array.isArray(q.json), `prime_directive_queue() failed: ${q.status} ${q.text.slice(0, 200)}`);
  const lane = q.json.filter(r => r.lane === "selfbuild");
  if (!lane.length) { notRun("arm C -- the selfbuild lane's leverage order", "the lane is empty this run; ses-281 owns that finding"); return; }
  const ids = lane.map(r => r.ref);
  const rows = await call(url, key, `backlog_items?select=backlog_id,leverage_reason&backlog_id=in.(${ids.map(encodeURIComponent).join(",")})`);
  assert.ok(rows.ok && Array.isArray(rows.json), `backlog_items read failed: ${rows.status} ${rows.text.slice(0, 200)}`);
  const lev = new Map(rows.json.map(r => [r.backlog_id, r.leverage_reason != null]));
  const marked = lane.filter(r => lev.get(r.ref));
  if (!marked.length) {
    notRun("arm C -- leverage first as an OBSERVED property of the live lane",
      `none of the ${lane.length} selfbuild row(s) carries leverage_reason yet, so any order satisfies it. The migration's own probe proved it in-transaction (the lane's last row, marked, became pos 1), and arm A graded the shipped SQL.`);
    return;
  }
  let seenPlain = null;
  for (const r of lane) {
    if (!lev.get(r.ref)) { seenPlain = seenPlain ?? r; continue; }
    assert.ok(!seenPlain, `${seenPlain && seenPlain.ref} (no leverage) at pos ${seenPlain && seenPlain.pos} precedes ${r.ref} (leverage) at pos ${r.pos} -- leverage outranks project order (AGT-238)`);
  }
  console.log(`  [AGT-238] arm C: ${marked.length} leverage row(s) lead the ${lane.length}-row selfbuild lane.`);
}

async function armD(url, key) {
  const ord = 238000000 + Math.floor(Math.random() * 99999);
  const refusedId = "ZZLV-238";
  const acceptedId = "ZZLV-2380";
  const row = (id, source_file, row_ordinal) => ({
    backlog_id: id, tier: "later", title: "AGT-238 regression fixture -- never a real ticket", status: "open",
    source_file, row_ordinal, scope_origin: "discovered",
  });
  try {
    const refused = await call(url, key, "backlog_items", {
      method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row(refusedId, "agt-238-probe", ord)),
    });
    assert.ok(!refused.ok, `a discovered insert with no audit_findings row was ACCEPTED (HTTP ${refused.status}) -- tickets-only-from-findings is not enforced`);
    assert.match(refused.text, /AGT-238: ZZLV-238 filed with no audit_findings row/, `refused, but not by AGT-238's guard: ${refused.text.slice(0, 300)}`);

    const accepted = await call(url, key, "backlog_items", {
      method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row(acceptedId, SELF, ord + 1)),
    });
    assert.ok(accepted.ok, `an exempt tests/regression/% fixture insert was refused (HTTP ${accepted.status}): ${accepted.text.slice(0, 300)}`);
  } finally {
    await call(url, key, `backlog_items?backlog_id=in.(${refusedId},${acceptedId})`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  }
  const left = await call(url, key, `backlog_items?select=backlog_id&backlog_id=in.(${refusedId},${acceptedId})`);
  assert.ok(left.ok && Array.isArray(left.json), `the cleanup read failed: ${left.status}`);
  assert.strictEqual(left.json.length, 0, `${left.json.length} fixture row(s) survived cleanup`);
  console.log("  [AGT-238] arm D: a no-finding discovered insert is refused with AGT-238; an exempt fixture insert is accepted; 0 rows remain.");
}

async function run() {
  armA();
  armB();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("arms C and D -- the live lane's leverage order and the live tickets-only-from-findings guard",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. Arms A and B still ran.");
    return;
  }
  await armC(url, key);
  await armD(url, key);
}

export default run;
selfRun(import.meta.url, run);
