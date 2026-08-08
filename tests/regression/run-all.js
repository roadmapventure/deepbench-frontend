#!/usr/bin/env node
// DeepBench v6.3.208 | tests/regression/run-all.js | SES-009a
//
// Persistent regression suite runner. Unlike scripts/check-session-docs.js
// (a report-only tripwire, always exit 0), this is a real gate: exit 1 if
// any regression test fails. STANDARDS.md Section 2 rule 5 requires this to
// pass before any commit for Category K/M sessions, same as the session's
// own Node.js test.
//
// Each file in this directory (except this one and any `_`-prefixed helper)
// is a regression test module. It must export a default async function that
// returns/resolves on pass, or throws an Error (with a descriptive message)
// on fail, *and* call `selfRun(import.meta.url, fn)` from `_lib/self-run.js`
// (SES-28) so a direct `node <file>` run is real rather than vacuous.
//
// Usage: node tests/regression/run-all.js [--dir=<path>]
// --dir overrides the directory scanned (used by this session's own
// meta-test to point at a fixture directory instead of the real suite).

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const DIR = arg("dir", __dirname);

async function main() {
  const files = fs.readdirSync(DIR)
    .filter(f => (f.endsWith(".js") || f.endsWith(".mjs")) && f !== "run-all.js" && !f.startsWith("_"))
    .sort();

  if (files.length === 0) {
    console.log("regression suite: no test files found in " + DIR);
    process.exit(0);
  }

  let failCount = 0;
  for (const file of files) {
    const fullPath = path.join(DIR, file);
    try {
      const mod = await import(pathToFileURL(fullPath).href);
      if (typeof mod.default !== "function") {
        throw new Error(`${file} does not export a default async function`);
      }
      await mod.default();
      console.log(`  [PASS] ${file}`);
    } catch (e) {
      failCount++;
      console.log(`  [FAIL] ${file} -- ${e.message}`);
    }
  }

  console.log(`\nregression suite: ${files.length - failCount}/${files.length} passed`);
  process.exit(failCount > 0 ? 1 : 0);
}

main();
