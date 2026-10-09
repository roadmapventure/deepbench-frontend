// DeepBench v7.0.836 | tests/regression/agt-445-cap-ruling.test.mjs | AGT-445 -- capped-ticket ruling: split into a scoped drain, or waive for one build.
//
// WHAT THIS PINS. public.rule_capped_ticket() is the one scoped exception to drain_epic_next()
// property 5 (rule DRAIN-CAP-SPLIT): the Development Manager's cap ruling may declare ONE drain over
// exactly a capped ticket's parts. Three arms:
//   A. the mirror docs/design/agt-445-cap-ruling.sql holds the function, its decision kind, the
//      drain it declares, its scope rows, the REVOKE and the rule row. Each needle carries a
//      mutation control (delete it and the check must name it) and the SES-158 changed-nothing
//      assert (the mutation must really change the text, or the control proves nothing).
//   B. live (service key, else notRun): four bad calls each come back HTTP 400 carrying their own
//      bracket word, none of them records a decision, and DRAIN-CAP-SPLIT is one live registry row.
//   C. the positive path is declared NOT RUN here -- it declares a real drain on the live board --
//      and quotes the rolled-back proof measured over MCP when this shipped (kickoff T4).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR_REL = "docs/design/agt-445-cap-ruling.sql";

export const NEEDLES = [
  "CREATE OR REPLACE FUNCTION public.rule_capped_ticket(",
  "'ticket-scope'",
  "'drain-epic'",
  "runner_drain_scope",
  "REVOKE ALL ON FUNCTION public.rule_capped_ticket(text, text, text, text[], uuid, text) FROM PUBLIC, anon, authenticated;",
  "'DRAIN-CAP-SPLIT'",
];

// Pure: which needles the text lacks.
export function missingNeedles(text, needles = NEEDLES) {
  return needles.filter(n => !text.includes(n));
}

function readMirror() {
  const p = path.join(ROOT, MIRROR_REL);
  assert.ok(fs.existsSync(p), `${MIRROR_REL} is missing -- the migration has no mirror`);
  return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");   // CRLF-normalised
}

async function run() {
  const results = [];

  // --- A: the mirror ----------------------------------------------------------------------------
  const sql = readMirror();
  assert.deepStrictEqual(missingNeedles(sql), [], `the mirror lacks: ${JSON.stringify(missingNeedles(sql))}`);
  for (const n of NEEDLES) {
    const mutated = sql.split(n).join("");
    assert.notStrictEqual(mutated, sql, `control: deleting ${n} changed nothing (the SES-158 failure)`);
    assert.deepStrictEqual(missingNeedles(mutated, [n]), [n], `the check did not notice ${n} gone`);
  }
  assert.deepStrictEqual(missingNeedles(sql, []), [], "no needles, no findings");
  results.push("mirror-holds-function-kind-drain-scope-revoke-rule");

  // --- B: live ----------------------------------------------------------------------------------
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live arm (four refusals, the decision count, the DRAIN-CAP-SPLIT row)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Run: node --env-file-if-exists=.env.local tests/regression/agt-445-cap-ruling.test.mjs");
  } else {
    const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
    const get = async q => {
      const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
      if (!r.ok) assert.fail(`GET ${q} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
      return r.json();
    };
    const decisions = () => get("runner_decisions?select=id&backlog_id=eq.AGT-445&kind=eq.ticket-scope");
    const before = (await decisions()).length;

    const probe = { p_backlog_id: "AGT-445", p_reason: "agt-445 regression probe", p_session_name: "agt445-test" };
    const cases = [
      ["ruling merge",      { ...probe, p_ruling: "merge" },                                        "split or waive"],
      ["split one part",    { ...probe, p_ruling: "split", p_parts: ["AGT-446"] },                  "at least two parts"],
      ["waive with parts",  { ...probe, p_ruling: "waive", p_parts: ["AGT-446"] },                  "waive takes no parts"],
      ["both attributions", { ...probe, p_ruling: "waive", p_cycle_id: "01a2d19c-5d03-4060-8b4d-9aa8f693ca37" }, "exactly one of"],
    ];
    for (const [label, body, word] of cases) {
      const r = await fetch(`${base}/rest/v1/rpc/rule_capped_ticket`, { method: "POST", headers: hdr, body: JSON.stringify(body) });
      const text = await r.text();
      assert.strictEqual(r.status, 400, `${label}: expected HTTP 400, got ${r.status}: ${text}`);
      assert.ok(text.includes("rule_capped_ticket: "), `${label}: the refusal is not the function's own: ${text}`);
      assert.ok(text.includes(word), `${label}: the refusal lacks "${word}": ${text}`);
    }
    results.push("four-refusals-each-400-with-their-word");

    assert.strictEqual((await decisions()).length, before, "a refused ruling recorded a ticket-scope decision on AGT-445");
    results.push("refusals-record-no-decision");

    const rule = await get("governance_rules?select=id,status&id=eq.DRAIN-CAP-SPLIT");
    assert.strictEqual(rule.length, 1, `DRAIN-CAP-SPLIT: expected 1 row, got ${rule.length}`);
    assert.strictEqual(rule[0].status, "live", `DRAIN-CAP-SPLIT is ${rule[0].status}, not live`);
    results.push("drain-cap-split-is-one-live-rule");
  }

  // --- C: the positive path ---------------------------------------------------------------------
  notRun("the positive split and waive paths",
    "a split declares a real queued drain on the live board, so it runs only inside a rolled-back DO " +
    "(kickoff T4). Measured over MCP 2026-10-09 (cycle 01a2d19c), AGT-445 scored 4 inside the block: " +
    "split returned images 6; 1 ticket-scope decision; 1 queued drain-epic on epic Tooling; 2 scope rows; " +
    "AGT-446 blocked_by NULL, AGT-447 blocked_by AGT-446, both need_score 4 and P10 - Tooling; AGT-445 partial, " +
    "blocked by AGT-447; drain_epic_next = pick AGT-446. reverse_decision: outcome applied, restored 3, " +
    "restored_unverified 3, refused 0, refused_written_since 0; after it 0 queued drains, 0 scope rows, AGT-445 open. " +
    "Waive: 1 decision ('cap ruling: waive AGT-445 for one build'), 0 images, 0 new directives. Both blocks rolled back.");

  return results;
}

selfRun(import.meta.url, run);
export default run;
