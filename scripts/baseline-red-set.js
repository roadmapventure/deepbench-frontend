#!/usr/bin/env node
// DeepBench v7.0.504 | scripts/baseline-red-set.js | SES-396 slice 2 — the red set a ticket starts
// from, measured once, by a script, so the Designer, the Builder and the Verifier read the SAME one.
//
// WHAT GOES WRONG WITHOUT IT, which is a paperwork problem with a correctness consequence. A kickoff
// names the test files its ticket touches. The Builder then runs them on the unchanged tree to learn
// which were ALREADY red before it edited anything, because a red it did not cause is not its red —
// and the Verifier repeats that same reasoning from scratch when it grades the ship. Three parties
// measuring the same baseline at three different moments is three chances to disagree, and the
// disagreement is always resolved the expensive way: a Builder chasing a failure that predates it,
// or a Verifier crediting a green that was never red. This script measures it ONCE, at design time,
// and prints a block the kickoff's CONTEXT section carries verbatim into both later readings.
//
// IT REPORTS, IT DOES NOT GATE, and the exit code says so: 0 whatever the tests do. That is the
// opposite convention from every check-*.js in this directory and it is deliberate — a red test is
// this script's OUTPUT, not its failure. Wire it into a pre-commit hook expecting non-zero on a red
// and it will disappoint you; that job belongs to tests/regression/run-all.js, which exits 1 iff
// something failed. The ONE thing that is this script's own failure is being pointed at a path that
// is not there: exit 2, nothing run, because a missing file silently reported as "green" (it had no
// failures, after all) would put a test in a baseline that cannot have been measured.
//
// NO MODEL CALL, NO NETWORK OF ITS OWN, NO SPEND. It is a child-process runner and a line matcher.
// The tests it spawns may well reach Supabase — that is their business — but nothing here decides
// anything, so nothing here needs judgment. STANDARDS.md Section 13's vocabulary applies to the
// tests, not to this file: it prints a CONTEXT block for a human and for a kickoff, never a
// harness-readable verdict.
//
// EACH FILE IS ITS OWN CHILD PROCESS, run from the repo root. Importing them into one process would
// share module state between them (tests/regression/_lib/self-run.js keeps its notRun() buffer at
// module level, and run-all.js drains it per test for exactly this reason), and a test that called
// process.exit() would take the whole measurement with it. The cwd is the repo root, never this
// script's directory, because every test resolves its fixtures relative to the root.
//
// Usage:
//   node scripts/baseline-red-set.js --tests=tests/regression/a.test.mjs,tests/regression/b.test.mjs
//
// Flags:
//   --tests=<csv>   Comma-separated paths, absolute or relative to the repo root. Required.
//
// Exit codes: 0 always, including when every named test is red — it reports, it does not gate.
//             2 a named path does not exist; nothing is run and nothing is reported.

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The line a reader wants next to a RED is the ASSERTION that fired, not the first line of stdout —
// which for this suite is usually a fixture's own progress note. These markers are ordered by how
// specific they are: `[FAIL] name -- message` is self-run.js's own summary and carries the assertion
// message already, so it wins; a raw AssertionError is the fallback for a file that threw before
// selfRun() could frame it.
const FAILURE_MARKERS = [
  /\[FAIL\]\s+.*/,
  /AssertionError.*/,
  /^\s*(?:Uncaught\s+)?(?:[A-Za-z]*Error):.*/m,
];

export const MAX_LINE = 240;

// Pure, and exported so tests/regression/ses-396b-designer-knowledge-row.test.mjs can drive it
// without spawning anything: given a child's combined output, return the one line to print.
export function firstAssertionLine(output) {
  const text = String(output || "");
  for (const re of FAILURE_MARKERS) {
    const hit = text.match(re);
    if (hit) return trim(hit[0]);
  }
  const firstNonEmpty = text.split(/\r?\n/).map(l => l.trim()).find(Boolean);
  return firstNonEmpty ? trim(firstNonEmpty) : "(no output)";
}

function trim(s) {
  const one = String(s).replace(/\s+/g, " ").trim();
  return one.length > MAX_LINE ? `${one.slice(0, MAX_LINE - 1)}…` : one;
}

// Pure. `results` is [{ path, code, output }]; returns the CONTEXT-ready block as one string. Kept
// separate from the running so the FORMAT can be asserted without a child process, and so the red
// count can never disagree with the lines above it — both are derived from the same array here.
export function renderBlock(results) {
  const lines = results.map(r => r.code === 0
    ? `- ${r.path} — green`
    : `- ${r.path} — RED (exit ${r.code}): ${firstAssertionLine(r.output)}`);
  const red = results.filter(r => r.code !== 0).length;
  lines.push(`Red set: ${red} of ${results.length}`);
  return lines.join("\n");
}

function parseTests(argv) {
  const hit = argv.find(a => a.startsWith("--tests="));
  if (!hit) return [];
  return hit.slice("--tests=".length).split(",").map(s => s.trim()).filter(Boolean);
}

function main(argv) {
  const tests = parseTests(argv);
  if (!tests.length) {
    console.error("baseline-red-set: --tests=<comma-separated paths> is required. Nothing was run.");
    return 2;
  }

  // EVERY path is checked BEFORE the first child starts. Checking as we go would leave a half
  // measured baseline printed above the error, and a half baseline is the thing most likely to be
  // pasted into a kickoff anyway.
  const missing = tests.filter(t => !fs.existsSync(path.resolve(ROOT, t)));
  if (missing.length) {
    console.error(`baseline-red-set: these paths do not exist, so no baseline was measured:\n` +
      missing.map(m => `    ${m}`).join("\n"));
    return 2;
  }

  const results = tests.map(t => {
    const r = spawnSync(process.execPath, [path.resolve(ROOT, t)], { cwd: ROOT, encoding: "utf8" });
    // A child killed by a signal has status null; report it as non-zero rather than as green.
    const code = r.status === null ? (r.signal ? `signal ${r.signal}` : 1) : r.status;
    return { path: t, code, output: `${r.stdout || ""}${r.stderr || ""}` };
  });

  console.log(renderBlock(results));
  return 0;
}

const isEntry = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isEntry) process.exit(main(process.argv.slice(2)));
