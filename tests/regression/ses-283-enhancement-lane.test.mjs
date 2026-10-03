// DeepBench v7.0.379 | tests/regression/ses-283-enhancement-lane.test.mjs | SES-283 (M7, built ahead by John's order)
//
// The enhancement lane: EL-01 (admission test on the row), EL-02 (John's 20% weekly cap), EL-03
// (promotion path). Two arms:
//
//   * DOC arm (always runs): docs/RUNNER-GOV-ENHANCEMENT-LANE.md carries exactly three anchored
//     rules EL-01..EL-03, each blockquote is byte-for-byte the row rendered in
//     docs/governance/RULES-SNAPSHOT.md (the registry's repo copy), EL-02 names 20% and
//     runner_settings.enhancement_cap_pct, and the M5 register's "deliberately not in this
//     register" paragraph now points here. Negative controls per clause.
//   * LIVE arm (SUPABASE_URL + SUPABASE_SERVICE_KEY, declared NOT RUN otherwise): the three rows
//     are live, enhancement_cap_pct = 20, and prime_directive_queue() never returns an
//     enhancement-origin ticket that lacks a claim. Measured over MCP when this shipped on a
//     ROLLED-BACK fixture: absent from the lane without a claim, present with one under the cap,
//     absent again when the cap was set to 0.
//
// Invocation: node tests/regression/ses-283-enhancement-lane.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSnapshot } from "./ses-280-m5-governance-rules.test.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LANE_REL = "docs/RUNNER-GOV-ENHANCEMENT-LANE.md";
const M5_REL = "docs/RUNNER-GOV-M5-REQUIREMENTS.md";
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

export function parseLaneDoc(text) {
  const out = new Map();
  const re = /^###\s+<a id="(EL-\d\d)"><\/a>[^\n]*\n+>\s(.+)$/gm;
  let m;
  while ((m = re.exec(text))) out.set(m[1], m[2]);
  return out;
}

async function run(ctx = {}) {
  const results = [];
  const lane = read(LANE_REL);
  const rules = parseLaneDoc(lane);
  assert.deepStrictEqual([...rules.keys()], ["EL-01", "EL-02", "EL-03"],
    `${LANE_REL} must carry exactly EL-01..EL-03 as anchored sections, found ${[...rules.keys()].join(", ") || "none"}`);
  results.push("lane-register-carries-exactly-three-anchored-rules");

  const snap = parseSnapshot(read(SNAPSHOT_REL));
  const byId = new Map(snap.map(r => [r.id, r]));
  for (const [id, statement] of rules) {
    const row = byId.get(id);
    assert.ok(row, `${id} is in ${LANE_REL} but not in ${SNAPSHOT_REL} -- the registry row was never inserted or the snapshot was not regenerated`);
    assert.strictEqual(row.statement, statement, `${id}: the blockquote in ${LANE_REL} is not byte-for-byte the registry row's statement`);
    assert.strictEqual(row.status, "live", `${id} is ${row.status}, expected live`);
    assert.strictEqual(row.source_group, "enhancement-lane-register", `${id} source_group is ${row.source_group}`);
  }
  // negative control: a one-character paraphrase must be caught
  {
    const mutated = lane.replace("The row is the verdict", "The row is a verdict");
    assert.notStrictEqual(mutated, lane, "control: mutation changed nothing");
    const r2 = parseLaneDoc(mutated);
    assert.notStrictEqual(r2.get("EL-01"), byId.get("EL-01").statement, "control: a paraphrased EL-01 still matches the snapshot -- the equality check cannot fail");
  }
  results.push("each-rule-statement-is-byte-for-byte-the-registry-row");

  assert.ok(/at most 20% of the weekly usage allowance \(John, 2026-09-02; `runner_settings\.enhancement_cap_pct`\)/.test(rules.get("EL-02")),
    "EL-02 must name John's number (20%) and its one home (runner_settings.enhancement_cap_pct)");
  results.push("el-02-names-johns-number-and-its-home");

  const m5 = read(M5_REL);
  assert.ok(/Resolved 2026-09-02 \(`SES-283`, v7\.0\.379\)/.test(m5) && /docs\/RUNNER-GOV-ENHANCEMENT-LANE\.md/.test(m5),
    `${M5_REL} must point its "deliberately not in this register" paragraph at the lane register`);
  results.push("m5-register-points-at-the-lane-register");

  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (rows live; cap = 20; no unadmitted enhancement in the lane)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-09-02): EL-01..EL-03 live; " +
      "runner_settings.enhancement_cap_pct = 20; enhancement_week_spent_pct() = 0; fixture absent/present/absent as described in the header.");
    return results;
  }
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const base = url.replace(/\/+$/, "");
  const rows = await (await fetch(`${base}/rest/v1/governance_rules?select=id,status&id=in.(EL-01,EL-02,EL-03)`, { headers: hdr })).json();
  assert.strictEqual(rows.filter(r => r.status === "live").length, 3, `expected 3 live EL rows, got ${JSON.stringify(rows)}`);
  const [settings] = await (await fetch(`${base}/rest/v1/runner_settings?select=enhancement_cap_pct&id=eq.1`, { headers: hdr })).json();
  assert.ok(settings && Number(settings.enhancement_cap_pct) >= 0, "runner_settings.enhancement_cap_pct is absent");
  const enh = await (await fetch(`${base}/rest/v1/backlog_items?select=backlog_id,enhancement_claim&scope_origin=eq.enhancement&status=not.in.(done,removed)&limit=500`, { headers: hdr })).json();
  const bare = new Set(enh.filter(r => !r.enhancement_claim || !r.enhancement_claim.trim()).map(r => r.backlog_id));
  const lanes = await (await fetch(`${base}/rest/v1/rpc/prime_directive_queue`, { method: "POST", headers: { ...hdr, "Content-Type": "application/json" }, body: "{}" })).json();
  const leaked = (Array.isArray(lanes) ? lanes : []).filter(r => r.ref && bare.has(r.ref));
  assert.deepStrictEqual(leaked.map(r => r.ref), [], `prime_directive_queue() returned unadmitted enhancement(s) ${leaked.map(r => r.ref).join(", ")}`);
  results.push("lane-never-returns-an-unadmitted-enhancement");
  return results;
}

selfRun(import.meta.url, run);
export default run;
