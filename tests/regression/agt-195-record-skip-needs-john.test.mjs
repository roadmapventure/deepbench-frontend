// DeepBench v7.0.632 | tests/regression/agt-195-record-skip-needs-john.test.mjs | AGT-195 --
// record_skip() MUST REFUSE A NEW 'needs-john' SKIP. M6-01/SES-315 retired needs-john as a blocking
// state, and drain_chain_gate's c_flagged has been ARRAY['needs-desktop'] alone since SES-281, so a
// NEW needs-john row parks a ticket nothing is waiting to un-park. docs/runbooks/runner-cycle.md
// :2162-2163 already forbade that write in bold -- the rule existed and nothing enforced it, which
// is the whole of this ticket: the missing PRECONDITION on reason_kind, not the call and not the
// vocabulary.
//
// WHAT IT COST, measured live 2026-09-27 (cycle bb6e46a8): AGT-168 held TWO open runner_skips rows
// -- 2fc4a730 (needs-john, 02:06:13) and 8da98deb (needs-desktop, 02:23:02). build-briefing.mjs:380
// selects resolved_at=is.null and briefing-derive.mjs:216-217 routes needs-desktop to 10.2 and all
// else to 10.1, so ONE TICKET PRINTED TWICE, in two sections, with two different ask lists.
//
// Migration `agt195_record_skip_needs_john_gate` (over the Supabase MCP, its down captured first --
// captured_class auto-downable, objects_captured 1, refusals 0) rebuilt record_skip from its live
// pg_get_functiondef with `v_ds text` in the DECLARE and ONE new block. The identity argument list
// is byte-identical (uuid,text,text,text,text,text) so no second overload exists to make PostgREST
// ambiguous (.claude/rules/supabase-function-signature.md).
//
// THE BLOCK SITS ABOVE THE BEFORE-IMAGE INSERT, and that placement is what makes arm A safe rather
// than merely lucky. Read off the shipped body at this ship, not assumed: the IF is the FIRST
// statement after BEGIN -- above the v_kind COALESCE, above the (backlog_id, reason_kind,
// resolved_at IS NULL) lookup, and above the runner_before_images INSERT. A refusal therefore
// leaves no image and no skip row, on two independent grounds: nothing in the body has written yet,
// and PostgREST runs each RPC in one transaction that the RAISE aborts. Arm A asserts BOTH
// after-states rather than trusting either argument.
//
// ARMS:
//   A  LIVE REFUSAL PROBE, credential-gated -- WRITES NOTHING BY CONSTRUCTION (above). POST
//      rpc/record_skip for p_backlog_id 'AGT-195-PROBE-NOEXIST' (no backlog_items row at all, so
//      v_ds is NULL) with p_reason_kind 'needs-john' must come back NON-2xx, SQLSTATE 23514, in the
//      gate's own words: it must name the escape hatch `gated_before_build` and the step-(7b)
//      handle, and it must interpolate the ticket id it was handed together with its design_status
//      -- which is what proves the gate's own SELECT ran on THIS argument instead of some generic
//      error answering for it. Then runner_skips carries no AGT-195-PROBE* row and
//      runner_before_images carries no image for one. CONTROL: a one-character mutation of each
//      pinned needle must NOT be found in the refusal, so this arm compares bytes and cannot pass
//      on a reworded message.
//      Pre-change this probe was ACCEPTED and inserted a row (kickoff section 2.3 probe B).
//   B  LIVE, READ-ONLY -- the defect is actually gone and the allow branch is actually live:
//      AGT-168 has EXACTLY ONE open row and its reason_kind is needs-desktop; 2fc4a730 carries a
//      non-NULL resolved_at and resolved_cycle bb6e46a8; and AT LEAST ONE ticket carries
//      design_status='needs-john', without which the allow branch would be dead code and arm A's
//      refusal would prove only that the function refuses everything.
//   C  DECLARED NOT RUN -- the shipped body, the overload count and the ALLOW direction. pg_proc,
//      pg_get_functiondef and BEGIN/ROLLBACK are unreachable over PostgREST (SES-310), and the
//      allow direction is a WRITE to the live skip ledger, which a permanent regression test must
//      never make (SES-196/SES-218/SES-275). Measured at this ship instead by the migration's own
//      trailing DO block, in the SAME transaction that wrote the function; see the reason string.
//
// NOTHING HERE WRITES A ROW. Arm A's single probe raises ahead of the function's first INSERT; arm
// B is four projections.

import assert from "node:assert/strict";
import { selfRun, notRun } from "./_lib/self-run.js";

const CYCLE = "bb6e46a8-f3ca-4807-8e75-8fe61de0941e";
const PROBE_ID = "AGT-195-PROBE-NOEXIST";
const PROBE_PREFIX = "AGT-195-PROBE";
const SKIP_ROW = "2fc4a730-e6b0-4fe1-8922-62930c06dd1f";
const TICKET = "AGT-168";
const KEPT_KIND = "needs-desktop";
const CHECK_VIOLATION = "23514";

// The gate's own words, pinned. Each is compared byte-for-byte and each carries a one-character
// control below, because a substring match loose enough to accept a reworded refusal would let the
// gate be replaced by any other error and still read green.
const NEEDLES = [
  "gated_before_build",   // the escape hatch the refusal must hand the caller
  "step-(7b)",            // ...and the handle it records the decision under
  "LEGACY-ROW path only", // the reason needs-john is refused at all (M6-01/SES-315)
  PROBE_ID,               // the argument the gate's own SELECT was handed
  "design_status NULL",   // ...and what that SELECT found for it -- NULL, i.e. no such ticket
];

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

// One character changed inside a needle, used as that needle's control.
function mutate(s) {
  const i = Math.floor(s.length / 2);
  return `${s.slice(0, i)}${s[i] === "x" ? "y" : "x"}${s.slice(i + 1)}`;
}

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    [arm ${name}] FAIL -- ${e.message.split("\n")[0]}`); }
  };

  if (!url || !key) {
    notRun("AGT-195 live arms (A, B)",
      `SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the rpc/record_skip refusal for a 'needs-john' row, its two zero-residue re-reads, ${TICKET}'s open-row count and 2fc4a730's resolution are all unverified here. Credentialed run: STANDARDS.md Section 2 rule 5`);
    return;
  }

  // --- A. the live refusal, and that it wrote nothing ---------------------------------------------
  await arm("A live refusal", async () => {
    // Re-read first so "no residue afterwards" is measured against a known point rather than
    // against the assumption that the ledger started clean.
    const skipsBefore = await count(url, key, `runner_skips?backlog_id=like.${PROBE_PREFIX}*&select=id`);
    const imagesBefore = await count(url, key,
      `runner_before_images?table_name=eq.runner_skips&pk_value=like.${PROBE_PREFIX}*&select=id`);
    assert.strictEqual(skipsBefore, 0, `the probe id must start with no skip row; got ${skipsBefore}`);
    assert.strictEqual(imagesBefore, 0, `...and no before-image; got ${imagesBefore}`);

    const res = await req(url, key, "rpc/record_skip", {
      method: "POST",
      body: {
        p_cycle_id: CYCLE,
        p_backlog_id: PROBE_ID,
        p_reason_kind: "needs-john",
        p_reason: "AGT-195 guard test: the gate must refuse this before it writes anything.",
      },
    });

    assert.ok(!res.ok && res.status >= 400,
      `record_skip must REFUSE a new needs-john row, not accept it. Got ${describe(res)}`);
    assert.strictEqual(res.code, CHECK_VIOLATION,
      `the refusal must be the gate's own check_violation (${CHECK_VIOLATION}). Got ${describe(res)}`);

    const msg = `${res.json?.message ?? ""} ${res.json?.hint ?? ""} ${res.json?.details ?? ""}`;
    for (const needle of NEEDLES) {
      assert.ok(msg.includes(needle),
        `the refusal must name ${JSON.stringify(needle)} -- a caller who is not told about ${"gated_before_build"} and its step-(7b) handle has been blocked without being given the right path. Got: ${describe(res)}`);
      // CONTROL: the same needle with one character changed must NOT be found.
      const bad = mutate(needle);
      assert.notStrictEqual(bad, needle, "the control must actually differ");
      assert.ok(!msg.includes(bad),
        `THE CONTROL FAILED for ${JSON.stringify(needle)}: a one-character mutation matched too, so this arm is not comparing bytes`);
    }

    // ZERO RESIDUE, both ledgers. The gate sits above the before-image INSERT, so neither may move.
    const skipsAfter = await count(url, key, `runner_skips?backlog_id=like.${PROBE_PREFIX}*&select=id`);
    const imagesAfter = await count(url, key,
      `runner_before_images?table_name=eq.runner_skips&pk_value=like.${PROBE_PREFIX}*&select=id`);
    assert.strictEqual(skipsAfter, 0,
      `THE REFUSAL WROTE A SKIP ROW: ${skipsAfter} row(s) match ${PROBE_PREFIX}* after the probe`);
    assert.strictEqual(imagesAfter, 0,
      `THE REFUSAL WROTE A BEFORE-IMAGE: ${imagesAfter} image(s) match ${PROBE_PREFIX}* -- the precondition block is no longer above the runner_before_images INSERT`);

    console.log(`  [AGT-195] refusal: HTTP ${res.status} ${CHECK_VIOLATION}, all ${NEEDLES.length} needles byte-matched with controls; 0 skip rows and 0 before-images for ${PROBE_PREFIX}* after`);
  });

  // --- B. the defect is gone, and the allow branch is live ----------------------------------------
  await arm("B live read-only", async () => {
    const open = await req(url, key,
      `runner_skips?backlog_id=eq.${TICKET}&resolved_at=is.null&select=id,reason_kind,skip_count`);
    assert.ok(open.ok && Array.isArray(open.json), `open-row read failed: ${describe(open)}`);
    assert.strictEqual(open.json.length, 1,
      `${TICKET} must hold EXACTLY ONE open skip row -- two is the defect (it printed in both 10.1 and 10.2). Got ${open.json.length}: ${JSON.stringify(open.json)}`);
    assert.strictEqual(open.json[0].reason_kind, KEPT_KIND,
      `and the surviving row must be the ${KEPT_KIND} one -- resolving the wrong row would drop a live ask. Got ${open.json[0].reason_kind}`);

    const resolved = await req(url, key,
      `runner_skips?id=eq.${SKIP_ROW}&select=resolved_at,resolved_cycle,reason_kind`);
    assert.ok(resolved.ok && resolved.json?.length === 1, `2fc4a730 read failed: ${describe(resolved)}`);
    const row = resolved.json[0];
    assert.strictEqual(row.reason_kind, "needs-john", "2fc4a730 is the needs-john row -- check the id if this moved");
    assert.ok(row.resolved_at, "2fc4a730 must carry a non-NULL resolved_at");
    assert.strictEqual(row.resolved_cycle, CYCLE,
      `...resolved by THIS cycle, so the row is attributable. Got ${row.resolved_cycle}`);

    // Without this the allow branch is dead code and arm A proves only that record_skip refuses
    // everything -- the one-sided check section 6 of the kickoff names.
    const live = await count(url, key, "backlog_items?design_status=eq.needs-john&select=backlog_id");
    assert.ok(live >= 1,
      `at least one ticket must carry design_status='needs-john', or the gate's ALLOW branch is unreachable and this guard is one-sided. Got ${live}`);

    console.log(`  [AGT-195] ${TICKET} open rows 1 (${KEPT_KIND}); 2fc4a730 resolved_at ${row.resolved_at} cycle bb6e46a8; ${live} ticket(s) carry design_status='needs-john' so the allow branch is live`);
  });

  notRun("AGT-195: the shipped record_skip body, its overload count, and the ALLOW direction",
    "pg_proc and pg_get_functiondef are not readable over PostgREST and this suite cannot open a transaction to roll a fixture back (SES-310), so the body's text and the overload count cannot be asserted here; and the allow direction is a WRITE to the live runner_skips ledger, which a permanent regression test must never make (SES-196/SES-218/SES-275). MEASURED AT THIS SHIP (v7.0.632) INSTEAD, over the Supabase MCP, by migration agt195_record_skip_needs_john_gate's OWN trailing DO block in the SAME transaction that wrote the function -- so any of these failing would have aborted the migration rather than reported success (.claude/rules/supabase-function-signature.md: never trust the success flag). pg_proc holds EXACTLY 1 overload of public.record_skip, identity (uuid,text,text,text,text,text) -- UNCHANGED, no parameter added or retyped, so no stale overload was owed a DROP. BOTH DIRECTIONS: the REFUSAL fired for ('AGT-168','needs-john') inside BEGIN..EXCEPTION WHEN check_violation, and a gate that did not fire would have raised; the ALLOW path inserted for ('AGT-110','needs-john'), the one ticket carrying design_status='needs-john', and was rolled back by RAISE 'AGT195_UNDO' caught by that block's handler -- an inner BEGIN..EXCEPTION is a subtransaction, so the allow write is undone. Re-read after the migration: 0 rows for the probe ids and 0 before-images from either probe. The down was captured BEFORE the apply (capture_migration_down: captured_class auto-downable, objects_captured 1, refusals 0, derived_down_sql non-NULL -- the prior function text plus the overload-drop and the count assertion).");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

export default run;
selfRun(import.meta.url, run);
