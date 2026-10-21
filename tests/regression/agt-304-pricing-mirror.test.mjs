// DeepBench v7.0.877 | tests/regression/agt-304-pricing-mirror.test.mjs | AGT-304 slice 17
//
// FEATURE: AGT-304 slice 17 -- shared/models.js's MODEL_PRICING block is GENERATED from
// public.model_pricing by scripts/sync-model-pricing.js, and this is the guard that keeps the
// generator honest.
//
// WHAT WENT WRONG THREE TIMES, measured on the unchanged parent rather than recalled: SQL held 30
// price rows, the hand-kept JS table held 24, and LOG-149 part (e) went red on the first of the six
// `claude-3-*` rows model-watch wrote on 2026-10-12. Slices 3 (v7.0.778) and 13 (v7.0.822) each
// closed the same gap by typing the new rows in. LOG-149 (e) already catches the DRIFT; what it
// cannot catch is the generator itself breaking -- a renderer that stops emitting cache rates, a
// marker someone edited, a `--check` that exits 0 because it could not reach Supabase. Those are
// this file's job, and they are why the parts below are split the way they are.
//
// THREE PARTS, AND THE SPLIT IS THE POINT:
//   (a) PURE -- renderRows / diffPricing / blockOf / spliceBlock, no file, no network. These are
//       the functions the generated text is a function OF, so a change in their behaviour must be
//       visible here before it is visible as a bad file.
//   (b) OFFLINE -- the shipped shared/models.js is byte-exactly what renderRows() produces from its
//       OWN exports, the cache-read rate still reaches computeCallCost(), and a credential-less
//       `--check` exits 2. THE EXIT-2 ASSERTION IS THE LOAD-BEARING ONE: if "could not look"
//       collapsed into exit 0, every unattended cycle would report a mirror it never compared.
//   (c) LIVE -- `--check` against real SQL, and the full break/detect/repair round trip on a TMP
//       COPY. The tmp copy is deliberate: a test that mutated shared/models.js to prove detection
//       would leave the repo dirty if it threw mid-way, so the damage is done to a throwaway and
//       the repaired copy is compared byte-for-byte against the real file.
//
// READ-ONLY AGAINST LIVE DATA. Part (c) GETs public.model_pricing and writes nothing anywhere
// except a file under os.tmpdir() that it removes.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { MODEL_PRICING, CACHE_READ_PER_1K, computeCallCost } from "../../shared/models.js";
import { MARK_BEGIN, MARK_END, renderRows, blockOf, spliceBlock, diffPricing } from "../../scripts/sync-model-pricing.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TARGET = path.join(ROOT, "shared", "models.js");
const SCRIPT = path.join(ROOT, "scripts", "sync-model-pricing.js");
const DRIFTED_ID = "claude-3-7-sonnet-20250219";   // the exact id LOG-149 (e) named on the parent

function hasCreds() { return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY); }
const CRED_HINT = "export SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets by name) to run the live arm";

let failures = 0;
function part(label, fn) {
  try {
    fn();
    console.log(`  ${label} -- PASS`);
  } catch (e) {
    failures++;
    console.log(`  ${label} -- FAIL: ${e.message}`);
  }
}

function run_(args, env = process.env) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env, encoding: "utf8" });
}

// --- (a) PURE ----------------------------------------------------------------------------------

function partA() {
  // Given OUT OF ORDER on purpose: the sort is what makes the generated block reproducible, so a
  // renderer that merely preserved input order would pass an in-order fixture and still produce a
  // different file on every run.
  const rows = [
    { model: "b-model", input_per_1k: 0.002, output_per_1k: "0.010" },
    { model: "a-model", input_per_1k: 0.0010, output_per_1k: 0.005 },
  ];
  const text = renderRows(rows, { "a-model": 0.0001 });
  assert.strictEqual(
    text,
    '  "a-model": { input_per_1k: 0.001, output_per_1k: 0.005, cache_read_per_1k: 0.0001 },\n' +
    '  "b-model": { input_per_1k: 0.002, output_per_1k: 0.01 },\n',
    "renderRows must sort by id, render the cache rate only where one exists, and normalise the number text",
  );

  // Each of the three buckets must be named INDEPENDENTLY -- a diff that lumped them together could
  // not tell "SQL gained a row" from "someone typed a wrong rate", which are different fixes.
  const d = diffPricing(
    [{ model: "keep", input_per_1k: 1, output_per_1k: 2 },
     { model: "gone", input_per_1k: 1, output_per_1k: 2 },
     { model: "wrong", input_per_1k: 1, output_per_1k: 2 }],
    { keep: { input_per_1k: 1, output_per_1k: 2 },
      wrong: { input_per_1k: 1, output_per_1k: 9 },
      stale: { input_per_1k: 1, output_per_1k: 2 } },
  );
  assert.deepStrictEqual(d.missing, ["gone"], "a SQL row absent from JS is `missing`");
  assert.deepStrictEqual(d.extra, ["stale"], "a JS key absent from SQL is `extra`");
  assert.deepStrictEqual(d.disagree, ["wrong"], "a rate mismatch is `disagree`, never `missing`");

  const same = [{ model: "x", input_per_1k: 0.003, output_per_1k: 0.015 }];
  assert.deepStrictEqual(
    diffPricing(same, { x: { input_per_1k: 0.003, output_per_1k: 0.015 } }),
    { missing: [], extra: [], disagree: [] },
    "equal halves must produce three empty arrays -- no bucket may fire on agreement",
  );

  // The round trip is what the generator rests on: whatever spliceBlock writes, blockOf reads back.
  const src = `head\n${MARK_BEGIN}\n  "old": {},\n${MARK_END}\ntail\n`;
  assert.strictEqual(blockOf(spliceBlock(src, text)), text, "blockOf(spliceBlock(src, body)) must byte-equal body");
  assert.ok(spliceBlock(src, text).startsWith("head\n"), "spliceBlock must carry everything outside the fences through untouched");

  // A broken fence must THROW AND NAME WHICH ONE. Silently treating a missing END as "block runs to
  // EOF" would let --write overwrite the rest of the file.
  assert.throws(
    () => blockOf(`head\n${MARK_BEGIN}\n  "old": {},\ntail\n`),
    /END/,
    "a source missing the END marker must throw an error naming END",
  );
  assert.throws(() => blockOf(`head\n${MARK_END}\ntail\n`), /BEGIN/, "a source missing the BEGIN marker must throw naming BEGIN");
}

// --- (b) OFFLINE -------------------------------------------------------------------------------

function partB() {
  const src = fs.readFileSync(TARGET, "utf8");
  for (const [name, mark] of [["BEGIN", MARK_BEGIN], ["END", MARK_END]]) {
    assert.strictEqual(src.split(mark).length - 1, 1, `shared/models.js must hold the ${name} marker exactly once`);
  }

  // THE CENTRAL ASSERTION. The shipped file's generated block is byte-exactly what the generator
  // renders from the file's OWN exports -- so a hand edit inside the fences, a lost cache rate or a
  // re-ordered row all fail here, offline, with no credentials needed.
  const fromExports = renderRows(
    Object.entries(MODEL_PRICING).map(([model, p]) => ({ model, ...p })),
    CACHE_READ_PER_1K,
  );
  assert.strictEqual(blockOf(src), fromExports, "shared/models.js's generated block must byte-equal renderRows() over its own MODEL_PRICING + CACHE_READ_PER_1K");

  // The rates moved out of the rows and into CACHE_READ_PER_1K, so prove they still ARRIVE: 1000
  // cache-read tokens on Fable 5.1 bill at its own published $0.25/MTok, not the 0.10x fallback
  // (which would read 0.001). A generator that dropped the merge would pass the byte check above
  // and fail here.
  const cost = computeCallCost("claude-fable-5-1", 0, 0, 0, 1000);
  assert.ok(Math.abs(cost - 0.00025) < 1e-9, `claude-fable-5-1's own cache-read rate must survive the move: got ${cost}, expected 0.00025`);

  // "I could not look" must never be green. Both vars deleted -- not blanked -- because the script
  // tests presence, and a blank string is a different code path from an absent key.
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  const r = run_(["--check"], env);
  assert.strictEqual(r.status, 2, `--check without credentials must exit 2, never 0 and never 1; got ${r.status}: ${(r.stdout || "") + (r.stderr || "")}`);
}

// --- (c) LIVE ----------------------------------------------------------------------------------

function partC() {
  const inSync = run_(["--check"]);
  assert.strictEqual(inSync.status, 0, `--check must exit 0 against live public.model_pricing; got ${inSync.status}: ${(inSync.stdout || "") + (inSync.stderr || "")}`);
  assert.match(inSync.stdout, /in sync/, "--check's green line must say `in sync`");

  const real = fs.readFileSync(TARGET, "utf8");
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "agt304-")), "models.js");
  try {
    // Break it exactly the way the parent was broken: one SQL-priced row absent from the JS block.
    const broken = real.split("\n").filter(l => !l.includes(`"${DRIFTED_ID}"`)).join("\n");
    assert.ok(broken.length < real.length, "the fixture must actually lose a line");
    fs.writeFileSync(tmp, broken);

    const drifted = run_(["--check", `--file=${tmp}`]);
    assert.strictEqual(drifted.status, 1, `--check on a drifted file must exit 1; got ${drifted.status}: ${(drifted.stdout || "") + (drifted.stderr || "")}`);
    assert.match(drifted.stdout, new RegExp(`missing in JS: ${DRIFTED_ID}`), "--check must name the id that drifted, not just report a mismatch");
    assert.match(drifted.stdout, /--write/, "--check must hand the reader the repair command");

    const written = run_(["--write", `--file=${tmp}`]);
    assert.strictEqual(written.status, 0, `--write must exit 0; got ${written.status}: ${(written.stdout || "") + (written.stderr || "")}`);
    assert.strictEqual(
      fs.readFileSync(tmp, "utf8"), real,
      "--write must repair the drifted copy to byte-equal the shipped shared/models.js -- the generator is the one home for this block",
    );
  } finally {
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  }
  assert.ok(!fs.existsSync(tmp), "the tmp copy must be removed");
}

async function run() {
  console.log("AGT-304 slice 17 -- the model_pricing mirror is generated, and the generator is guarded");
  part("(a) PURE: renderRows sorts + merges cache rates; diffPricing names missing/extra/disagree; splice round-trips; a broken fence throws", partA);
  part("(b) OFFLINE: shared/models.js's block byte-equals its own render; Fable's cache rate still prices; credential-less --check exits 2", partB);

  if (!hasCreds()) {
    notRun("AGT-304 (c) LIVE: --check against public.model_pricing and the break/detect/repair round trip", CRED_HINT);
    console.log("  (c) NOT RUN -- no Supabase credentials in this environment");
  } else {
    part("(c) LIVE: --check in sync against SQL; a drifted copy exits 1 naming the id; --write restores it byte-exactly", partC);
  }

  if (failures > 0) throw new Error(`AGT-304: ${failures} part(s) failed`);
  console.log("ALL TESTS PASS");
}

export default run;
selfRun(import.meta.url, run);
