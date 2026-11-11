// DeepBench v7.0.1004 | tests/regression/agt-642-blocked-first.test.mjs | AGT-642 -- a blocked ticket stops the line.
//
// John's standing decision f8e2a234 (2026-11-11): no new pick while the team can still work a
// blocked ticket. Measured before the change: the card branch (AGT-127) and the redesign lane
// (AGT-610) were reachable only at pickable_count = 0, so with 60+ tickets pickable 15 gate cards
// and 20 refusal-parked tickets (0 attempts each) waited behind every new pick.
//
// ARMS
//   A  pure -- the ladder, through ses-297's own oracle: with work pickable a rulable card wins,
//      then a redesign candidate, then the pick; the 2-hour back-off hands the turn to redesign;
//      every wall above (pace, wall, db, lanes) still wins over both. CONTROL: the pre-AGT-642
//      ladder (cards only on an empty board, no redesign branch) answers `pickable` on the same
//      facts, so this arm cannot pass against the old gate.
//   B  pure -- redesign-pickup.js pickCandidate(): the named ticket is taken, never row 1 in its
//      place; null falls back to row 1; a name the list does not carry is refused.
//   C  repo -- the migration mirror carries the four replacements and both helper functions.
//   D  live -- runner_should_boot().detail.redesign_ticket equals rpc/redesign_due_ticket, and the
//      should_boot / mode pair agrees with the reason.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { expectedReason, BOOTING_REASONS, modeFor, REDESIGN_REASON, GATE_CARDS_REASON } from "./ses-297-pre-boot-pickability.test.mjs";
import { pickCandidate } from "../../scripts/redesign-pickup.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR = path.join(ROOT, "docs/design/agt-642-blocked-first.sql");

// A healthy mid-week board: every wall clear, 64 tickets pickable.
const BASE = {
  schedulerOn: true, meterStaleHours: 2, readingAgeHours: 0.2, wallPct: 90, gatedPct: 40,
  paceLimitPct: 57.14, budgetRowExists: true, dbLevel: "green", liveLanes: 0, maxLanes: 1,
  pickableCount: 64, cheapestPctOfWeek: 1, weeklyHeadroomPct: 60,
  gateCardsToRule: 0, rulingCooling: false, redesignDue: null,
  openFindings: 80, listTickets: 0, finishDue: 0,
};

// The ladder as it stood before AGT-642, for the control: cards only on an empty board, no redesign.
function oldLadder(f) {
  const r = expectedReason({ ...f, gateCardsToRule: f.pickableCount === 0 ? f.gateCardsToRule : 0, redesignDue: null });
  return r;
}

function armA() {
  const cases = [
    [{ gateCardsToRule: 15 }, GATE_CARDS_REASON, "a rulable card wins over 64 pickable tickets"],
    [{ gateCardsToRule: 15, redesignDue: "AGT-495" }, GATE_CARDS_REASON, "cards come before redesign"],
    [{ gateCardsToRule: 15, rulingCooling: true, redesignDue: "AGT-495" }, REDESIGN_REASON, "the 2-hour back-off hands the turn to redesign"],
    [{ gateCardsToRule: 15, rulingCooling: true }, "pickable", "an unrulable card backing off lets the pick run"],
    [{ redesignDue: "AGT-590" }, REDESIGN_REASON, "a parked ticket is redesigned before a new pick"],
    [{ pickableCount: 0, gateCardsToRule: 3, rulingCooling: true }, GATE_CARDS_REASON, "on an empty board the card branch always rules, as AGT-127 shipped it"],
    [{ gateCardsToRule: 15, redesignDue: "AGT-495", gatedPct: 60 }, "weekly_pace", "the pace stop still wins"],
    [{ gateCardsToRule: 15, redesignDue: "AGT-495", gatedPct: 95 }, "weekly_wall", "the weekly wall still wins"],
    [{ redesignDue: "AGT-495", dbLevel: "amber" }, "db_pressure", "the database gate still wins"],
    [{ redesignDue: "AGT-495", liveLanes: 1 }, "lanes_full", "a full lane still wins"],
  ];
  for (const [delta, want, why] of cases) {
    const got = expectedReason({ ...BASE, ...delta });
    assert.equal(got, want, `${why}: facts ${JSON.stringify(delta)} -> ${got}, expected ${want}`);
  }
  assert.ok(BOOTING_REASONS.has(REDESIGN_REASON), "redesign_due must boot");
  assert.equal(modeFor(REDESIGN_REASON), "redesign-first", "redesign_due declares mode redesign-first");
  // CONTROL: the same three headline facts on the old ladder all read `pickable` -- the defect.
  for (const delta of [{ gateCardsToRule: 15 }, { redesignDue: "AGT-590" }, { gateCardsToRule: 15, redesignDue: "AGT-495" }]) {
    assert.equal(oldLadder({ ...BASE, ...delta }), "pickable",
      `control: the pre-AGT-642 ladder must answer pickable on ${JSON.stringify(delta)}, or this arm discriminates nothing`);
  }
  console.log(`    [AGT-642 arm A] ${cases.length} ladder cases agree; control: the old ladder reads pickable on all 3 headline boards`);
}

function armB() {
  const rows = [{ backlog_id: "AGT-495" }, { backlog_id: "AGT-590" }, { backlog_id: "AGT-237" }];
  assert.equal(pickCandidate(rows, "AGT-590").backlog_id, "AGT-590", "the ticket the gate named is taken, not row 1");
  assert.equal(pickCandidate(rows, null).backlog_id, "AGT-495", "null falls back to row 1");
  assert.equal(pickCandidate(rows, "").backlog_id, "AGT-495", "an empty name falls back to row 1");
  assert.throws(() => pickCandidate(rows, "AGT-999"), /does not list/, "a name the list does not carry is refused, never swapped");
  assert.equal(pickCandidate([], "AGT-495"), null, "nothing parked picks nothing");
  console.log("    [AGT-642 arm B] pickCandidate takes the named ticket, falls back on null, refuses an unknown name");
}

function armC() {
  const s = fs.readFileSync(MIRROR, "utf8");
  for (const needle of [
    "create or replace function public.rule_cards_cooling()",
    "create or replace function public.redesign_due_ticket()",
    "public.redesign_due_ticket()                                    AS redesign_due",
    "AND (f.pickable_count = 0 OR NOT public.rule_cards_cooling())",
    "WHEN f.redesign_due IS NOT NULL",
    "''redesign_due'', ''work_to_find'') AS should_boot",
    "THEN ''redesign-first''",
    "''redesign_ticket'',      v.redesign_due,",
    "ada52a4efa754a8cfe6f9d0551984833",
  ]) assert.ok(s.includes(needle), `the mirror ${path.relative(ROOT, MIRROR)} must carry ${JSON.stringify(needle)}`);
  console.log("    [AGT-642 arm C] the mirror carries both helpers, the four replacements and the md5 guard");
}

async function armD() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-642 arm D (live gate)", "SUPABASE_URL / SUPABASE_SERVICE_KEY absent; export both inline by name from public.runner_secrets");
    return;
  }
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const boot = await (await fetch(`${url}/rest/v1/rpc/runner_should_boot`, { method: "POST", headers: h, body: "{}" })).json();
  const v = Array.isArray(boot) ? boot[0] : boot;
  assert.ok(v && v.detail, "runner_should_boot() returned no row");
  assert.ok(Object.prototype.hasOwnProperty.call(v.detail, "redesign_ticket"), "detail must carry redesign_ticket (AGT-642)");
  const due = await (await fetch(`${url}/rest/v1/rpc/redesign_due_ticket`, { method: "POST", headers: h, body: "{}" })).json();
  assert.equal(v.detail.redesign_ticket ?? null, due ?? null, "the gate names the same ticket redesign_due_ticket() returns");
  assert.equal(v.should_boot, BOOTING_REASONS.has(v.reason), `should_boot must agree with reason ${v.reason}`);
  assert.equal(v.detail.mode ?? null, modeFor(v.reason), `mode must agree with reason ${v.reason}`);
  console.log(`    [AGT-642 arm D] live: reason ${v.reason}, redesign_ticket ${v.detail.redesign_ticket ?? "null"}, mode ${v.detail.mode ?? "null"}`);
}

async function run() {
  armA();
  armB();
  armC();
  await armD();
}

selfRun(import.meta.url, run);
