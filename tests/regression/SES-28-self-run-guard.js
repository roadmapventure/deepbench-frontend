// DeepBench v6.3.208 | tests/regression/SES-28-self-run-guard.js | SES-28
//
// Fails when any regression test file lacks its self-run guard. Without this, SES-28's
// backfill covers today's 12 files and nothing else -- a new test file added later would
// silently reintroduce the vacuous-green hole this session closed.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, isEntryPoint } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function run() {
  const files = fs.readdirSync(__dirname)
    .filter(f => (f.endsWith(".js") || f.endsWith(".mjs")) && f !== "run-all.js" && !f.startsWith("_"))
    .sort();

  assert.ok(files.length >= 11, `expected the backfilled suite, found ${files.length} test files`);

  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, f), "utf8");
    assert.ok(
      src.includes("_lib/self-run.js"),
      `${f} must import the self-run guard from ./_lib/self-run.js (SES-28)`
    );
    assert.ok(
      /selfRun\(\s*import\.meta\.url\s*,/.test(src),
      `${f} must call selfRun(import.meta.url, <fn>) so a direct node run is real, not vacuous (SES-28)`
    );
  }

  // The guard's own entry-point decision, exercised directly.
  const here = import.meta.url;
  assert.strictEqual(isEntryPoint(here, fileURLToPath(here)), true, "self path is the entry point");
  assert.strictEqual(isEntryPoint(here, path.join(__dirname, "run-all.js")), false, "run-all.js import must not trigger the guard");
  assert.strictEqual(isEntryPoint(here, undefined), false, "no argv[1] -> never the entry point");
  assert.strictEqual(isEntryPoint(here, fileURLToPath(here).toUpperCase(), "win32"), true, "win32 compares case-insensitively");
}

selfRun(import.meta.url, run);
