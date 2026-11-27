// DeepBench v7.0.1129 | tests/regression/agt-681-default-export-contract.test.mjs | AGT-681 -- every regression test default-exports run; AGT-642's guard bites through it.
//
// tests/regression/run-all.js calls a module's DEFAULT export and refuses a module that has none.
// A direct `node <file>` goes through selfRun() instead and never looks at the export, so a file
// with no `export default run;` is green on a direct run and a [FAIL] in the gate. AGT-642's test
// shipped that way at v7.0.1004 and blocked two later ships (v7.0.1025, v7.0.1091).
//
// ARMS
//   A  pure -- lacksDefault() on four sources, both directions.
//   B  repo -- every file run-all.js loads carries a default export.
//   C  the AGT-642 guard, called the way run-all.js calls it (the default export), in two scratch
//      copies outside the tree: with the real ladder it gets past arms A and B; with the ladder as
//      it stood before AGT-642 it is refused at arm A's first case.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { isTestFile, stripCommentLines } from "../../scripts/related-tests.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const TARGET = "agt-642-blocked-first.test.mjs";
const urlOf = (...p) => pathToFileURL(path.resolve(DIR, ...p)).href;

export const lacksDefault = src => !/^\s*export\s+default\b/m.test(stripCommentLines(src));

function armA() {
  const body = "async function run() {}\nselfRun(import.meta.url, run);\n";
  assert.equal(lacksDefault(body), true, "a file that only calls selfRun lacks the export");
  assert.equal(lacksDefault(body + "export default run;\n"), false, "the trailing export line satisfies it");
  assert.equal(lacksDefault("export default async function run() {}\n"), false, "the inline form satisfies it");
  assert.equal(lacksDefault("// export default run;\n" + body), true, "a commented-out export does not count");
  console.log("    [AGT-681 arm A] lacksDefault: 4 sources, both directions");
}

function armB() {
  const files = fs.readdirSync(DIR).filter(isTestFile).sort();
  assert.ok(files.includes(TARGET), `${TARGET} must be in the set run-all.js loads`);
  const missing = files.filter(f => lacksDefault(fs.readFileSync(path.join(DIR, f), "utf8")));
  assert.deepEqual(missing, [], `${missing.length} of ${files.length} regression tests carry no default export, so run-all.js refuses them: ${missing.join(", ")}. Add \`export default run;\` under the selfRun line.`);
  console.log(`    [AGT-681 arm B] ${files.length} of ${files.length} regression tests carry a default export`);
}

async function armC() {
  const src = fs.readFileSync(path.join(DIR, TARGET), "utf8");
  const ORACLE = '"./ses-297-pre-boot-pickability.test.mjs"';
  const swaps = [['"./_lib/self-run.js"', urlOf("_lib/self-run.js")], ['"../../scripts/redesign-pickup.js"', urlOf("../../scripts/redesign-pickup.js")]];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt-681-"));
  try {
    const real = urlOf("ses-297-pre-boot-pickability.test.mjs");
    fs.writeFileSync(path.join(tmp, "old-ladder.mjs"),
      `export * from ${JSON.stringify(real)};\nimport { expectedReason as live } from ${JSON.stringify(real)};\n` +
      "export function expectedReason(f) { return live({ ...f, gateCardsToRule: f.pickableCount === 0 ? f.gateCardsToRule : 0, redesignDue: null }); }\n");
    const copy = (name, oracleUrl) => {
      let out = src;
      for (const [from, to] of [...swaps, [ORACLE, oracleUrl]]) {
        assert.equal(out.split(from).length, 2, `${TARGET} must import ${from} exactly once`);
        out = out.split(from).join(JSON.stringify(to));
      }
      fs.writeFileSync(path.join(tmp, name), out);
      return import(pathToFileURL(path.join(tmp, name)).href);
    };
    const control = await copy("control.mjs", real);
    assert.equal(typeof control.default, "function", `${TARGET} must default-export its run function`);
    await assert.rejects(() => control.default(),
      e => e.code === "ENOENT" && /agt-642-blocked-first\.sql/.test(e.message),
      "control: with the real ladder the copy must get past arms A and B and stop only at arm C's mirror read, which a scratch copy cannot resolve");
    const mutant = await copy("mutant.mjs", pathToFileURL(path.join(tmp, "old-ladder.mjs")).href);
    await assert.rejects(() => mutant.default(),
      e => /a rulable card wins over 64 pickable tickets/.test(e.message) && /-> pickable, expected gate_cards_to_rule/.test(e.message),
      "on the pre-AGT-642 ladder the default export must be refused at arm A's first case");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log("    [AGT-681 arm C] AGT-642's default export passes arms A-B on the real ladder and is refused on the old one");
}

async function run() {
  armA();
  armB();
  await armC();
}

selfRun(import.meta.url, run);
export default run;
