// DeepBench v6.3.208 | tests/regression/_lib/self-run.js | SES-28
//
// Self-run guard for regression test modules. run-all.js imports each test module
// and calls its default export; before SES-28 a bare `node tests/regression/<file>.js`
// imported the module, called nothing, and exited 0 -- a vacuous green on the suite
// that gates the beta ship bar (docs/BETA.md bucket 1). Found by S-LOG-86's coding
// session, verified live 2026-07-28.
//
// Each test file calls selfRun(import.meta.url, run) at the bottom. It fires ONLY when
// that file is the process entry point, so run-all.js's imports are unaffected.

import path from "path";
import { fileURLToPath } from "url";

// Pure -- tests/regression/SES-28-self-run-guard.js asserts this directly.
// Windows: argv[1] and import.meta.url can disagree on drive-letter case, so compare
// case-insensitively there and exactly everywhere else.
export function isEntryPoint(moduleUrl, argv1, platform = process.platform) {
  if (!argv1) return false;
  const self = path.resolve(fileURLToPath(moduleUrl));
  const entry = path.resolve(argv1);
  return platform === "win32"
    ? self.toLowerCase() === entry.toLowerCase()
    : self === entry;
}

export function selfRun(moduleUrl, fn) {
  if (!isEntryPoint(moduleUrl, process.argv[1])) return;
  const name = path.basename(fileURLToPath(moduleUrl));
  Promise.resolve()
    .then(fn)
    .then(() => { console.log(`  [PASS] ${name}`); process.exit(0); })
    .catch(e => { console.log(`  [FAIL] ${name} -- ${e.message}`); process.exit(1); });
}
