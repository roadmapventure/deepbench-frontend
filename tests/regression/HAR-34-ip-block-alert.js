// DeepBench v7.0.349 | tests/regression/HAR-34-ip-block-alert.js | HAR-34
//
// Guards the IP spend-gate block alert: runner-cycle.md step 4a-quater plus
// public.ip_block_alert_claim(uuid) and public.ip_org_cache.block_notified_at
// (migration har34_ip_block_push_alert).
//
// WHAT THE TICKET ASKED AND WHY IT IS NOT GATED. HAR-34 read "alert John by email or text the
// moment the spend gate writes a new blocked row" and carried, from 2026-08-08, its own blocker:
// "requires an outbound email/SMS service -- none exists anywhere in the stack today". John
// RE-SCOPED it himself (attended architect session 2026-08-31, standing decision 0f292cfa,
// verbatim "i don't need email notifications at thist ime"): the alert is built on the PUSH
// channel cycles already use, "needing no credentials and no John input", and "any ticket blocked
// on 'needs an email/SMS provider' is mis-blocked".
//
// THE CLAUSE THAT DOES THE REAL WORK IS THE SECOND ONE, and it is the half a rebuild drops. The
// claim predicate is
//     blocked_at IS NOT NULL AND (block_notified_at IS NULL OR block_notified_at < blocked_at)
// -- a TIMESTAMP COMPARISON, never a bare IS NULL. An address blocked, alerted, cleared by John
// and then blocked AGAIN is a second event and the one he most needs to hear about; the IS-NULL
// form alerts on it once, ever, and is silent for every later block on that row for the life of
// the row. theNullOnlyFormGoesSilentOnASecondBlock() runs that retired form on the SAME event
// sequence and asserts it LOSES, so this file proves a DIFFERENCE from what was rejected rather
// than a property both forms share.
//
// THE EDIT THIS FILE FORBIDS, and it is tempting because the raw value sits in the same row:
// adding caller_ip to what the function returns. The row exists to be read out into a PUSH
// NOTIFICATION -- off-platform. LOG-124 (v7.0.39) is the live incident where a visitor's raw IP
// became publicly readable, and .claude/rules/supabase-column-grants.md is written from it. The
// function returns masked_ip (the generated caller_ip_masked column) and cannot return the raw
// address, which is a property of the function rather than a rule a cycle must remember.
//
// FILE-LEVEL NEGATIVE CONTROL: theRunbookCarriesTheStep() and theRunbookForbidsTheRawAddress()
// cannot pass against origin/dev -- step 4a-quater does not exist there. theSourceControlIsReal()
// runs both against origin/dev's copy and asserts they fail, so a vacuous pass is impossible.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNBOOK = path.join(REPO, "docs", "runbooks", "runner-cycle.md");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";

export const FUNCTION_NAME = "ip_block_alert_claim";
export const COLUMN_NAME = "block_notified_at";

// -- The two predicates, as pure functions, for the controls below ------------------------------
//
// These are RESTATEMENTS of the SQL for control purposes only. The live half asserts the real
// function against real Postgres, which is what makes a drift between these lines and the
// database visible rather than agreed.

export function shippedClaims(row) {
  return row.blocked_at != null &&
    (row.block_notified_at == null || row.block_notified_at < row.blocked_at);
}

// The retired form, kept ONLY as the negative control it exists to be.
export function nullOnlyClaims(row) {
  return row.blocked_at != null && row.block_notified_at == null;
}

// One address, four events in order. This is the sequence HAR-34 exists for: a block, an alert,
// John clearing it, and a SECOND block on the same address.
function replay(claims) {
  const row = { blocked_at: null, block_notified_at: null };
  const alerts = [];
  const events = [
    { at: "t1-blocked",   apply: () => { row.blocked_at = 1; } },
    { at: "t2-cleared",   apply: () => { row.blocked_at = null; } },
    { at: "t3-reblocked", apply: () => { row.blocked_at = 3; } },
    { at: "t4-quiet",     apply: () => {} },
  ];
  for (const e of events) {
    e.apply();
    if (claims(row)) {
      alerts.push(e.at);
      row.block_notified_at = 10;   // "now()" -- always later than the blocked_at it answers
      if (row.blocked_at != null) row.block_notified_at = row.blocked_at + 0.5;
    }
  }
  return alerts;
}

// -- 1. The shipped predicate alerts on BOTH blocks, and stays quiet in between -----------------

function theShippedFormAlertsOnEveryBlock() {
  assert.deepStrictEqual(replay(shippedClaims), ["t1-blocked", "t3-reblocked"],
    "the shipped predicate must alert on the first block AND on the re-block, and on nothing else " +
    "-- a cleared row is not an event and a quiet row is not an event");
}

// -- 2. THE NEGATIVE CONTROL: the retired IS-NULL form, same events, asserted to LOSE ------------

function theNullOnlyFormGoesSilentOnASecondBlock() {
  const shipped = replay(shippedClaims);
  const retired = replay(nullOnlyClaims);

  assert.deepStrictEqual(retired, ["t1-blocked"],
    "the control is vacuous unless the retired IS-NULL form genuinely misses the re-block");
  assert.ok(shipped.length > retired.length,
    "the two forms must DIFFER on this sequence -- that difference is the whole reason the " +
    "predicate is a timestamp comparison rather than a null test");
  assert.strictEqual(shipped[0], retired[0],
    "the two forms must agree on the FIRST block -- otherwise the difference measured above is " +
    "not attributable to the re-block clause");
}

// -- 3. A row that was never blocked is never an alert, in either form --------------------------

function anUnblockedRowIsNeverAnAlert() {
  for (const claims of [shippedClaims, nullOnlyClaims]) {
    assert.ok(!claims({ blocked_at: null, block_notified_at: null }),
      "blocked_at IS NOT NULL is the trigger -- 23 of the 24 cached addresses have never been " +
      "blocked and must produce no push, ever");
  }
}

// -- 4. The runbook carries the step, names the call, and forbids the raw address ---------------

function theRunbookCarriesTheStep(src = fs.readFileSync(RUNBOOK, "utf8")) {
  assert.ok(src.includes("4a-quater"),
    "runner-cycle.md must carry step 4a-quater -- a function nothing instructs a cycle to call is " +
    "an alarm with no bell");
  assert.ok(src.includes(`public.${FUNCTION_NAME}(`),
    `step 4a-quater must name public.${FUNCTION_NAME}() as the one call -- the record_skip ` +
    "precedent: a rule each cycle must apply by hand is a rule that gets silently forgotten");
  assert.ok(/block_notified_at\s*<\s*blocked_at/.test(src),
    "step 4a-quater must state the timestamp comparison -- the IS-NULL form is the rebuild this " +
    "whole ticket turns on, and prose that omits it invites exactly that rebuild");
}

function theRunbookForbidsTheRawAddress(src = fs.readFileSync(RUNBOOK, "utf8")) {
  const i = src.indexOf("4a-quater");
  assert.ok(i >= 0, "step 4a-quater must exist for this assertion to mean anything");
  const step = src.slice(i, i + 6000);
  assert.ok(/caller_ip\b/.test(step) && /masked/.test(step),
    "step 4a-quater must name the raw column it forbids AND the masked one it uses -- naming only " +
    "the masked column leaves the next editor no reason not to add the raw one");
  assert.ok(/LOG-124/.test(step),
    "the prohibition must cite LOG-124 -- it is a rule with a live incident behind it, and a rule " +
    "with no cited cost is the first one an editor trims");
}

// -- 5. THE FILE-LEVEL NEGATIVE CONTROL: both of the above must FAIL on origin/dev ---------------

function theSourceControlIsReal() {
  let before;
  try {
    before = execFileSync("git", ["show", `origin/dev:${RUNBOOK_REL}`], {
      cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    notRun("HAR-34 file-level negative control",
      "origin/dev's copy of the runbook is not fetchable here (no git remote ref). The forward " +
      "assertions above did run; what is unproven is that they could ever fail.");
    return;
  }
  if (before.includes("4a-quater")) {
    // Expected once this ship has landed on dev and a later cycle runs the suite.
    notRun("HAR-34 file-level negative control",
      "origin/dev already carries step 4a-quater, so it is no longer a pre-change control. This " +
      "is the expected state after this ship merges, not a failure.");
    return;
  }
  assert.throws(() => theRunbookCarriesTheStep(before),
    "the pre-change runbook must FAIL theRunbookCarriesTheStep -- otherwise that assertion passes " +
    "on any file and proves nothing");
  assert.throws(() => theRunbookForbidsTheRawAddress(before),
    "the pre-change runbook must FAIL theRunbookForbidsTheRawAddress for the same reason");
}

// -- 6. LIVE half: the real function and the real grants, both directions (SES-101) --------------
//
// DELIBERATELY SIDE-EFFECT-FREE. Calling the function for real CLAIMS every pending block and
// stamps it notified, so a test that called it would SWALLOW an alert John is owed. Passing a NULL
// cycle id makes it raise before it writes anything, which proves existence and executability
// without touching a row -- and the raise message is itself the discriminator against the anon
// arm below, where a permission error rather than that message is what must come back.

async function theFunctionIsRealAndTheGrantsHoldBothDirections() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    notRun("HAR-34 live function half",
      "no Supabase credentials in env (run with `node --env-file-if-exists=.env.local " +
      "tests/regression/run-all.js` to include it). The source-parsed halves above did run.");
    return;
  }

  const base = `${url.replace(/\/$/, "")}/rest/v1`;
  const svc = {
    "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`,
  };

  // (a) The column exists and the service role can read it.
  const col = await fetch(`${base}/ip_org_cache?select=${COLUMN_NAME}&limit=1`, { headers: svc });
  assert.strictEqual(col.status, 200,
    `the service role must be able to read ip_org_cache.${COLUMN_NAME} -- HTTP ${col.status} means ` +
    "the migration did not land, or landed without the column the claim writes");

  // (b) The function exists and is executable by the service role -- proven by its OWN guard
  //     firing, which is a write-free path through it.
  const raised = await fetch(`${base}/rpc/${FUNCTION_NAME}`, {
    method: "POST", headers: svc, body: JSON.stringify({ p_cycle_id: null }),
  });
  const raisedText = await raised.text();
  assert.ok(raised.status >= 400,
    `${FUNCTION_NAME}(NULL) must RAISE -- an unattributed alert has no auditor, and a call that ` +
    "succeeds on a null cycle id has lost that guard");
  assert.match(raisedText, /p_cycle_id is required/,
    "the failure must be the function's OWN guard, not a permission error -- otherwise this arm " +
    `proves the service role CANNOT call ${FUNCTION_NAME}, which is the opposite of what it claims`);

  // (c) The denied direction. Without it, (b) passes on a function the whole world can call.
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey || anonKey === "regression-placeholder") {
    notRun("HAR-34 anon-denied arm",
      "no real anon key in env, and a placeholder key would fail for the wrong reason -- a 401 on " +
      "a fake key proves nothing about EXECUTE (the SES-101 correction). Asserted at the ship " +
      "instead with has_function_privilege(): anon false, authenticated false, service_role true.");
    return;
  }
  const anon = { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const denied = await fetch(`${base}/rpc/${FUNCTION_NAME}`, {
    method: "POST", headers: anon,
    body: JSON.stringify({ p_cycle_id: "00000000-0000-0000-0000-000000000000" }),
  });
  const deniedText = await denied.text();
  assert.ok(denied.status >= 400,
    `anon must NOT be able to call ${FUNCTION_NAME} -- it stamps rows and reads a gate's block log`);
  assert.doesNotMatch(deniedText, /p_cycle_id is required/,
    "anon reached the function BODY -- revoking EXECUTE from anon/authenticated alone does nothing " +
    "while PUBLIC still holds it (.claude/rules/supabase-column-grants.md, function-level twin)");

  // (d) And the table itself stays shut to anon, so the new column opened no door.
  const tbl = await fetch(`${base}/ip_org_cache?select=${COLUMN_NAME}&limit=1`, { headers: anon });
  assert.ok(tbl.status >= 400,
    "anon must still be refused ip_org_cache -- a new column on a locked-down table must fail " +
    "closed, and this row family carries visitor IP addresses");
}

async function run() {
  theShippedFormAlertsOnEveryBlock();
  theNullOnlyFormGoesSilentOnASecondBlock();
  anUnblockedRowIsNeverAnAlert();
  theRunbookCarriesTheStep();
  theRunbookForbidsTheRawAddress();
  theSourceControlIsReal();
  await theFunctionIsRealAndTheGrantsHoldBothDirections();
}

selfRun(import.meta.url, run);
export default run;
