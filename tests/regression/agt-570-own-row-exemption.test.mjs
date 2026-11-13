// DeepBench v7.0.1018 | tests/regression/agt-570-own-row-exemption.test.mjs | AGT-570 -- the asking
// cycle is not its own peer, and this build ships only the half that says so.
//
// THE DEFECT, measured 2026-11-13: `runner_should_boot()`'s lanes CTE counts every open
// runner-stamped cycle, the caller's own row included, so at `max_lanes` 1 the driver's two boot
// reads answer `lanes_full` about the cycle that is asking. Redesign attempt 2 ships the INERT half
// only: the driver names its own cycle in the `x-deepbench-cycle` request header (the gate accepts
// the header and does not yet read it), and the migration that teaches the gate to read it is
// committed UNAPPLIED at docs/design/agt-570-own-row-exemption.sql. So this file is written to be
// green on the staged tree AND to turn its live arm on by itself the day that SQL is applied --
// never a test that has to be edited to notice the fix landed.
//
// ARMS
//   A  pure -- bootHeaders(): a trimmed id becomes the one header; absent/blank becomes NO header,
//      so a driver run without --cycle-id sends exactly what it sent before this ticket.
//   B  source -- the DISCRIMINATOR. Both boot reads pass bootHeaders(); the bare 4-argument call
//      survives at neither site. On the pre-change tree the new form reads 0 and the old one 2, so
//      this arm cannot pass against the driver as it stood.
//   C  repo -- the staged SQL carries both md5 guards, the header name, the claim-reason predicate
//      and its STAGED, NOT APPLIED header, so what is committed is the guarded form, not a draft.
//   D  live, READ-ONLY -- 3 POSTs to a STABLE function and 1 GET; writes nothing. D2 declares
//      itself NOT RUN while the migration is unapplied, with the live body's md5 as the evidence.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { OWN_CYCLE_HEADER, bootHeaders } from "../../scripts/run-project.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DRIVER = path.join(ROOT, "scripts/run-project.js");
const STAGED = path.join(ROOT, "docs/design/agt-570-own-row-exemption.sql");

// The gate body this ticket was written against (kickoff §2 / the staged SQL's own guard).
const STAGED_GATE_MD5 = "292753ec6c445b5938344d8038d98c4e";
const LANES_FULL = "lanes_full";

function armA() {
  assert.equal(OWN_CYCLE_HEADER, "x-deepbench-cycle", "the header name is the one the migration reads");
  assert.deepEqual(bootHeaders(" abc "), { "x-deepbench-cycle": "abc" },
    "a padded id is trimmed and sent as the one header");
  for (const empty of ["", "   ", undefined, null]) {
    assert.deepEqual(bootHeaders(empty), {},
      `${JSON.stringify(empty)} must send NO header -- a run without --cycle-id calls the gate exactly as before AGT-570`);
  }
  console.log(`    [AGT-570 arm A] bootHeaders: " abc " -> {${OWN_CYCLE_HEADER}: abc}; "", blank, undefined, null -> {}`);
}

function armB() {
  const src = fs.readFileSync(DRIVER, "utf8");
  const named = src.split('rpc(base, key, "runner_should_boot", {}, bootHeaders(').length - 1;
  const bare = src.split('rpc(base, key, "runner_should_boot")').length - 1;
  assert.equal(named, 2, `both boot reads must name this cycle; found ${named} of 2`);
  assert.equal(bare, 0, `no boot read may stay anonymous; found ${bare} bare call(s)`);
  assert.ok(src.includes("async function rpc(base, key, name, body = {}, headers = {}) {"),
    "rpc() must take the headers argument the two call sites pass");
  assert.ok(src.includes('{ method: "POST", headers, body: JSON.stringify(body) }'),
    "rpc() must forward those headers to rest(), or the argument is dead");
  console.log(`    [AGT-570 arm B] the driver's boot reads: ${named} name the cycle, ${bare} bare (pre-change tree reads 0 and 2 -- this arm discriminates)`);
}

function armC() {
  const s = fs.readFileSync(STAGED, "utf8");
  for (const needle of [
    STAGED_GATE_MD5,
    "71bbcc5623ac4dd3efbd498d03380bb9",
    "x-deepbench-cycle",
    "''claimed by '' || p_cycle_id::text",
    "STAGED, NOT APPLIED",
  ]) assert.ok(s.includes(needle), `${path.relative(ROOT, STAGED)} must carry ${JSON.stringify(needle)}`);
  console.log("    [AGT-570 arm C] the staged SQL carries both md5 guards, the header, the claim predicate and STAGED, NOT APPLIED");
}

async function armD() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-570 arm D (live gate)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent; export both inline by name from public.runner_secrets");
    return;
  }
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const boot = async extra => {
    const r = await fetch(`${url}/rest/v1/rpc/runner_should_boot?select=should_boot,reason`,
      { method: "POST", headers: { ...h, ...extra }, body: "{}" });
    const rows = await r.json();
    return { status: r.status, row: Array.isArray(rows) ? rows[0] : rows };
  };

  // D1 -- the header is ACCEPTED and changes nothing today: a cycle id the board never heard of
  // answers exactly what no header answers. That is the inert half's whole claim.
  const plain = await boot({});
  assert.equal(plain.status, 200, `the no-header read must answer 200, got ${plain.status}`);
  const base = plain.row?.reason;
  assert.ok(base, "the no-header read returned no reason");
  const stranger = await boot(bootHeaders(crypto.randomUUID()));
  assert.equal(stranger.status, 200, `a random cycle id in ${OWN_CYCLE_HEADER} must still answer 200, got ${stranger.status}`);
  assert.equal(stranger.row?.reason, base,
    `a cycle id the board does not carry must not change the answer (${stranger.row?.reason} vs ${base})`);
  console.log(`    [AGT-570 arm D1] live: no header -> ${base}; random ${OWN_CYCLE_HEADER} -> ${stranger.row?.reason} (200, header accepted)`);

  // D2 -- the fix itself, which only exists once the staged SQL is applied.
  const refRes = await fetch(`${url}/rest/v1/rpc/rule_enforcing_functions`, { headers: h });
  const refRows = await refRes.json();
  const gate = (Array.isArray(refRows) ? refRows : []).find(r => r.proname === "runner_should_boot");
  assert.ok(gate && gate.definition, "rule_enforcing_functions() did not return runner_should_boot's definition");
  const liveMd5 = crypto.createHash("md5").update(gate.definition).digest("hex");
  if (!gate.definition.includes(OWN_CYCLE_HEADER)) {
    notRun("D2", `staged: agt570_own_row_exemption is not applied (live body md5 ${liveMd5})`);
    assert.equal(liveMd5, STAGED_GATE_MD5,
      `the gate body is neither the fixed one nor the one the staged SQL guards against (md5 ${liveMd5}) -- re-read it before applying`);
    console.log(`    [AGT-570 arm D2] NOT RUN by design: the live gate body (md5 ${liveMd5}) does not read ${OWN_CYCLE_HEADER} yet`);
    return;
  }

  const settings = await (await fetch(`${url}/rest/v1/runner_settings?id=eq.1&select=max_lanes`, { headers: h })).json();
  const maxLanes = Array.isArray(settings) ? settings[0]?.max_lanes : null;
  const open = await (await fetch(
    `${url}/rest/v1/runner_cycles?ended_at=is.null&stamp=like.DEEPBENCH-RUNNER-AUTOMATED-*&select=id,heartbeat_at,started_at`,
    { headers: h })).json();
  const cutoff = Date.now() - 20 * 60 * 1000;
  const live = (Array.isArray(open) ? open : [])
    .filter(r => new Date(r.heartbeat_at ?? r.started_at).getTime() > cutoff);
  if (base !== LANES_FULL || live.length !== maxLanes) {
    notRun("D2", `the lane wall is not the binding stop right now: reason ${base}, live lanes ${live.length}, max_lanes ${maxLanes}`);
    return;
  }
  const own = await boot(bootHeaders(live[0].id));
  assert.equal(own.status, 200, `naming an own lane must answer 200, got ${own.status}`);
  assert.notEqual(own.row?.reason, LANES_FULL,
    `with the migration applied, a caller naming its own open lane (${live[0].id}) must not be walled by itself; got ${own.row?.reason}`);
  console.log(`    [AGT-570 arm D2] live: ${live.length} of ${maxLanes} lanes; no header -> ${base}, own id -> ${own.row?.reason}`);
}

export default async function run() {
  armA();
  armB();
  armC();
  await armD();
}

selfRun(import.meta.url, run);
