// DeepBench v7.0.703 | tests/regression/agt-266-objection-figure-correction.test.mjs | AGT-266
//
// FEATURE: AGT-266 -- the pmm-objections record store quoted docs/ARCHITECTURE.md §19i's 1,199 as
// "1,199 logged routing decisions ... Supporting proof: model-call lineage". §19i says the opposite:
// 1,199 is LOG-42's count of log rows frozen with a WRONG pattern name -- "the 1,199 frozen
// false-`rag` rows" -- a defect count, not proof of reasoned routing. The misquote lived in the
// `body` of market_records 429a8614-a223-4bcf-91a8-b1ab87812df3 (kind `objection`) and reached
// Nathan's live prompt on every pmm-objections render, with `corrections: []` beneath it.
//
// The fix is two rows, not code: the misquoting record is RETIRED (scripts/market-agent.js:424
// filters `status=neq.retired`, so retiring is the deterministic drop), and one `correction` row
// for `pmm-objections` carries both rules -- what the 1,199 actually counts, and the standing rule
// that a repo figure is quoted only with the sentence it appears in.
//
// PARTS, matching the kickoff's Task 2:
//   (a) LIVE -- market_records 429a8614-... reads status `retired`, BY ID. Retire it and the render
//       drops it; leave it `proposed` and the misquote is back in the prompt whatever else exists.
//   (b) LIVE -- exactly ONE non-retired `correction` row keys on data->>capability = pmm-objections
//       (scripts/market-agent.js:428 reads corrections by exactly that filter), and its body carries
//       BOTH rules: `LOG-42`, `defect count`, and the standing-rule sentence. A row count alone is
//       not the check -- a correction row saying anything at all would pass that.
//   (c) LIVE -- the real render (`scripts/market-agent.js --render --agent=nathan
//       --capability=pmm-objections --out=<tmp> --json`) writes a prompt that contains NEITHER
//       `1,199 logged routing decisions` NOR the line `corrections: []`, and DOES contain `LOG-42`
//       and the standing-rule sentence. This is the arm that discharges the ticket's "re-render and
//       confirm" at $0: no model call, and it cannot pass by luck -- insert the correction but skip
//       the retire and the figure is still there; retire but skip the correction and both the
//       `corrections: []` line and the two rule strings fail.
//
// GRADES THE CHANGE, NEVER THE LIVE WORLD (pattern:162): (a) and (b) key on the one row id and the
// one capability slug. Neither asserts a table-wide absence, so an unrelated record added to
// market_records tomorrow cannot turn this red, and a future capability's own correction row is
// none of this test's business.
//
// BASELINE (`node scripts/baseline-red-set.js --tests=tests/regression/agt-266-objection-figure-correction.test.mjs`,
// unchanged tree):
//   New file: the whole file is its own red set. On the unchanged tree the record reads `proposed`,
//   zero pmm-objections corrections exist, and the render carries the misquote plus `corrections: []`
//   -- measured live 2026-09-29: records_loaded 8, prompt_bytes 63863, the figure present.
//
// NO FIXTURE WRITES: every arm is read-only over rows the migration shipped, so there is nothing to
// clean up and no working data is mutated (pattern:76).

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT_REL = "scripts/market-agent.js";
const SCRIPT = path.join(ROOT, SCRIPT_REL);
const RUN = randomUUID().slice(0, 8);

const MISQUOTING_ID = "429a8614-a223-4bcf-91a8-b1ab87812df3";
const CAPABILITY = "pmm-objections";

// The three strings the ticket turns on, in one place so the arms cannot drift apart.
const FIGURE_MISQUOTE = "1,199 logged routing decisions";
const EMPTY_CORRECTIONS_LINE = "corrections: []";
const RULE_ONE_SOURCE = "LOG-42";
const RULE_ONE_VERDICT = "defect count";
const RULE_TWO = "a repo figure is quoted only with the sentence it appears in";

async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("every arm (the retired record, the pmm-objections correction, the live render)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- all three arms read live market_records rows " +
      "and the third spawns the real render. Run `node --env-file-if-exists=.env.local " +
      "tests/regression/run-all.js`. Measured live when this shipped (2026-09-29): the record read " +
      "`retired`, exactly 1 pmm-objections correction carried both rules, and the render reported " +
      "records_loaded 8 / prompt_bytes 61383 with neither the figure nor `corrections: []`.");
    return [];
  }

  const results = [];
  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const getJson = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!r.ok) assert.fail(`GET ${q.split("?")[0]} -> HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };

  // ------------------------------------------------------------------------------------------
  // (a) LIVE -- the misquoting record is retired, read by its own id
  // ------------------------------------------------------------------------------------------
  const rows = await getJson(`market_records?id=eq.${MISQUOTING_ID}&select=status`);
  assert.strictEqual(rows.length, 1, `market_records ${MISQUOTING_ID} read back ${rows.length} rows, expected 1`);
  assert.strictEqual(rows[0].status, "retired",
    `the misquoting record ${MISQUOTING_ID} is status "${rows[0].status}", not "retired" -- ` +
    `${SCRIPT_REL} filters status=neq.retired, so the 1,199 misquote is still loading into the prompt`);
  console.log(`  [AGT-266] record ${MISQUOTING_ID} status=${rows[0].status}`);
  results.push("misquoting-record-retired");

  // ------------------------------------------------------------------------------------------
  // (b) LIVE -- exactly one live correction for this capability, and it carries BOTH rules
  // ------------------------------------------------------------------------------------------
  const corrections = await getJson(
    `market_records?kind=eq.correction&status=neq.retired&data->>capability=eq.${CAPABILITY}&select=id,body`);
  assert.strictEqual(corrections.length, 1,
    `${corrections.length} live corrections key on data->>capability=${CAPABILITY}, expected exactly 1 ` +
    `(ids: ${JSON.stringify(corrections.map(c => c.id))})`);
  const body = String(corrections[0].body || "");
  for (const needle of [RULE_ONE_SOURCE, RULE_ONE_VERDICT, RULE_TWO]) {
    assert.ok(body.includes(needle),
      `the ${CAPABILITY} correction (${corrections[0].id}) does not carry "${needle}" -- ` +
      `a correction row that does not say what the 1,199 counts, or does not carry the standing rule, ` +
      `is not the correction AGT-266 shipped`);
  }
  console.log(`  [AGT-266] correction ${corrections[0].id} carries both rules (${body.length} chars)`);
  results.push("objections-correction-carries-both-rules");

  // ------------------------------------------------------------------------------------------
  // (c) LIVE -- the real render drops the figure and carries the rule
  // ------------------------------------------------------------------------------------------
  const out = path.join(os.tmpdir(), `agt-266-prompt-${RUN}.txt`);
  let prompt;
  try {
    const r = spawnSync(process.execPath,
      [SCRIPT, "--render", "--agent=nathan", `--capability=${CAPABILITY}`, `--out=${out}`, "--json"],
      { cwd: ROOT, env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key }, encoding: "utf8" });
    assert.strictEqual(r.status, 0, `--render exited ${r.status}: ${(r.stderr || "").trim()}`);
    const meta = JSON.parse((r.stdout || "").trim());
    assert.ok(fs.existsSync(out), `--render --out=${out} wrote no file`);
    prompt = fs.readFileSync(out, "utf8");
    console.log(`  [AGT-266] render: records_loaded=${meta.records_loaded} prompt_bytes=${meta.prompt_bytes} model=${meta.model}`);
  } finally {
    fs.rmSync(out, { force: true });
  }

  assert.ok(!prompt.includes(FIGURE_MISQUOTE),
    `the rendered ${CAPABILITY} prompt still carries "${FIGURE_MISQUOTE}" -- the misquoting record is reaching Nathan`);
  results.push("render-drops-the-figure");
  assert.ok(!prompt.split("\n").some(l => l.trim() === EMPTY_CORRECTIONS_LINE),
    `the rendered ${CAPABILITY} prompt still carries the line "${EMPTY_CORRECTIONS_LINE}" -- ` +
    `${SCRIPT_REL} found no correction for this capability`);
  for (const needle of [RULE_ONE_SOURCE, RULE_TWO]) {
    assert.ok(prompt.includes(needle),
      `the rendered ${CAPABILITY} prompt does not carry "${needle}" -- the correction is not reaching the prompt`);
  }
  results.push("render-drops-the-figure-and-carries-the-rule");

  return results;
}

selfRun(import.meta.url, run);
export default run;
