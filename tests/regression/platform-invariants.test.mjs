// DeepBench v7.0.949 | tests/regression/platform-invariants.test.mjs | the daily self-check (INTAKE-LIFECYCLE-RCA-1103 D6)
//
// Grades docs/design/platform-invariants.sql against the live database, never a re-implementation:
//   A. platform_invariant_eval() answers exactly the four named rules, each with a boolean verdict and a
//      detail object -- a rule that silently vanished would stop being checked and nobody would know.
//   B. the eval is read-only: calling it writes no platform_invariant_results row.
//   C. the route exists: a finding with found_by invariant:<rule> has a finding_routes row, or the one
//      findings review RAISEs `unmapped source` and stops for everyone (the AGT-134 / AGT-159 lesson).
//   D. the input it reads for intake_stuck agrees with victoria_intake_lists() (sum of ungraded).
// The schedule itself (cron job platform-invariants-daily) lives in the cron schema, which PostgREST does
// not expose; it is asserted by the migration and read by the attended session that built it.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

const RULES = ["runner_stalled", "victoria_missed", "intake_stuck", "budget_next_month"];

async function rest(url, key, path, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${path} returned HTTP ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text.trim() === "" ? [] : JSON.parse(text);
}

async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the whole file", "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent; every assertion reads the live functions.");
    return;
  }

  const countResults = async () =>
    (await rest(url, key, "platform_invariant_results?select=id")).length;

  // A
  const before = await countResults();
  const rows = await rest(url, key, "rpc/platform_invariant_eval", { method: "POST", body: "{}" });
  assert.deepStrictEqual(rows.map(r => r.invariant).sort(), [...RULES].sort(),
    `A: platform_invariant_eval() must answer exactly ${RULES.join(", ")}; got ${JSON.stringify(rows.map(r => r.invariant))}`);
  for (const r of rows) {
    assert.strictEqual(typeof r.ok, "boolean", `A: ${r.invariant}.ok must be a boolean, got ${JSON.stringify(r.ok)}`);
    assert.ok(r.detail && typeof r.detail === "object", `A: ${r.invariant}.detail must be an object`);
  }

  // B
  const after = await countResults();
  assert.strictEqual(after, before, "B: platform_invariant_eval() wrote a results row; only platform_invariant_check() may write");

  // C
  const route = await rest(url, key, "finding_routes?select=source,project_slug&source=eq.invariant");
  assert.strictEqual(route.length, 1, "C: finding_routes needs exactly one row for source 'invariant'");
  assert.ok(route[0].project_slug, "C: the invariant route must name a project");

  // D
  // Two reads at two moments: a ticket filed between them (the runner files while this runs) moves
  // one side. Agreement on any of three back-to-back pairs is the property; three misses is a defect.
  let lists = [], sum = -1, stuckN = -2;
  for (let i = 0; i < 3 && sum !== stuckN; i++) {
    lists = await rest(url, key, "rpc/victoria_intake_lists", { method: "POST", body: "{}" });
    sum = lists.reduce((n, l) => n + (l.ungraded ?? 0), 0);
    const again = await rest(url, key, "rpc/platform_invariant_eval", { method: "POST", body: "{}" });
    stuckN = again.find(r => r.invariant === "intake_stuck").detail.ungraded;
  }
  assert.strictEqual(stuckN, sum,
    `D: intake_stuck reads ${stuckN} ungraded, victoria_intake_lists() sums to ${sum} (three tries)`);

  // E (v7.0.951, John 2026-11-03): every rule is filed against a named owner, and every trigger has an
  // owning agent that exists and is active. A rule with no owner row files "unassigned", which this
  // refuses; a NULL owner is allowed only for the money rule, which is John's.
  const owners = await rest(url, key, "invariant_owners?select=invariant,owner_agent_id");
  const byRule = new Map(owners.map(o => [o.invariant, o.owner_agent_id]));
  for (const rule of RULES) {
    assert.ok(byRule.has(rule), `E: rule ${rule} has no invariant_owners row -- its finding would name no owner`);
    if (rule !== "budget_next_month") {
      assert.ok(byRule.get(rule), `E: rule ${rule} must be owned by an agent; only the money rule is John's`);
    }
  }
  const routines = await rest(url, key, "agent_routines?select=name,owner_agent_id");
  assert.ok(routines.some(r => r.name === "victoria-daily-check") && routines.some(r => r.name === "platform-invariants-daily"),
    "E: both 2026-11-03 triggers must be registered in agent_routines");
  const agentIds = [...new Set(routines.map(r => r.owner_agent_id))];
  const agents = await rest(url, key, `agents?select=id,is_active&id=in.(${agentIds.join(",")})`);
  for (const id of agentIds) {
    const a = agents.find(x => x.id === id);
    assert.ok(a && a.is_active, `E: trigger owner ${id} must be an existing, active agent`);
  }

  console.log(`    [A-E] ${rows.map(r => `${r.invariant}=${r.ok ? "ok" : "BROKEN"}`).join(", ")}; ${lists.length} waiting lists, ${sum} ungraded; ${routines.length} owned triggers`);
}

export default run;
selfRun(import.meta.url, run);
