// DeepBench v7.0.378 | tests/regression/ses-284-b30-status-ruled.test.mjs | SES-284 (M2)
//
// Rule B30 (John's automation queue as the board's leading sort key) says it "retires itself once
// all automation steps close". SES-284 asked whether that condition had quietly been met with no
// ledger entry. Measured 2026-09-02: it had NOT -- 11 Automation-epic tickets are still open, and
// the real defect is that 8 of them carry no automation_rank at all, so the lane the rule governs
// is half-empty while the rule reads live. The ruling (live, executing, condition not met) lives
// at B30's own entry in docs/RUNNER-GOV-0820-REQUIREMENTS.md; this test pins that the ruling is
// present and dated, with a negative control (M5-05: a rule's status is declared, never drifted).
//
// Invocation: node tests/regression/ses-284-b30-status-ruled.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC_REL = "docs/RUNNER-GOV-0820-REQUIREMENTS.md";

const CLAUSES = [
  {
    id: "b30-status-is-ruled-and-dated",
    test: s => /STATUS RULED 2026-09-02 \(`SES-284`, v7\.0\.378\): \*\*live, executing, retirement condition not met\*\*/.test(s),
    breaks: s => s.replace("retirement condition not met", "retirement condition met"),
    detail: "B30's entry must carry an explicit, dated status ruling -- M5-05 forbids a rule whose status is inferred",
  },
  {
    id: "b30-ruling-names-the-measured-defect",
    test: s => /8 of the 11 open Automation-epic tickets carry no `automation_rank`/.test(s),
    breaks: s => s.replace("8 of the 11 open Automation-epic tickets", "0 of the 11 open Automation-epic tickets"),
    detail: "the ruling must record the measurement it rests on, so the next reader can re-measure rather than re-argue",
  },
];

async function run(ctx = {}) {
  const results = [];
  const s = fs.readFileSync(path.join(REPO, DOC_REL), "utf8").replace(/\r\n/g, "\n");
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `${DOC_REL} lost clause "${c.id}": ${c.detail}`);
    const mutated = c.breaks(s);
    assert.notStrictEqual(mutated, s, `control: mutation for "${c.id}" changed nothing`);
    assert.ok(!c.test(mutated), `control: clause "${c.id}" still passes after its own mutation`);
    results.push(c.id);
  }
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (B30 row still `live`; automation_rank still the leading sort key)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped: governance_rules B30 status = live; " +
      "recompute_backlog_queue() orders by automation_rank nulls last first; 10 open ranked rows, 3 of them in the Automation epic.");
    return results;
  }
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/governance_rules?select=id,status&id=eq.B30`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status}: ${await res.text()}`);
  const [row] = await res.json();
  assert.ok(row && row.status === "live", `B30 is ${row ? row.status : "absent"} in the registry, but its canonical entry rules it live -- the two homes disagree`);
  results.push("registry-row-agrees-with-the-ruling");
  return results;
}

selfRun(import.meta.url, run);
export default run;
