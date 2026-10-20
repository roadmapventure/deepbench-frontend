#!/usr/bin/env node
// DeepBench v7.0.874 | scripts/baseline-red-set.js | AGT-457 -- the block NAMES ITS OWN INSTRUMENT
// and SAYS when it was measured with no credentials. renderBlock() ends every block with
// `Instrument: scripts/baseline-red-set.js (one child process per test file)`, which is the fact
// scripts/verifier.js baselineInstrumentFrom() reads and BASELINE_INSTRUMENTS grades -- a one-process
// run-all.js log is not a baseline this gate can align by name. And an uncredentialed run now says so
// as the block's FIRST line, on stdout and on stderr, matching UNCREDENTIALED_BASELINE_RE so a block
// pasted into a kickoff from such a run arms AGT-451's refusal instead of reading as a real one. The
// exit code is untouched: 0, whatever the tests did. It reports, it does not gate.
// DeepBench v7.0.657 | scripts/baseline-red-set.js | AGT-116 — a child that exits 2 with a
// `[NOT RUN] ... -- transport` line (the database never answered) renders as
// `— NOT RUN (transport, exit 2): <line>`, does not count toward `Red set:`, and adds `Not run: k`
// only when k > 0. See renderBlock().
//
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
// AGT-116 (v7.0.657): tests/regression/_lib/self-run.js exits 2 with `[NOT RUN] <name> -- transport
// ...` when the database never answered. That is an outage, not a red, so it renders on its own line
// and does NOT count toward `Red set:`.
const TRANSPORT_NOT_RUN = /\[NOT RUN\][^\r\n]*--\s*transport[^\r\n]*/;

// Pure. The transport [NOT RUN] line when the child exited 2 with one, else null.
export function transportNotRunLine(r) {
  if (r.code !== 2) return null;
  const hit = String(r.output || "").match(TRANSPORT_NOT_RUN);
  return hit ? trim(hit[0]) : null;
}

// AGT-457: the one home for the instrument's own name, read back by `scripts/verifier.js`
// `BASELINE_INSTRUMENTS`. The parenthetical is the fact that makes the baseline comparable at all --
// the regression gate runs the suite as ONE process, and only a per-file measurement can be aligned
// with its `[FAIL]` names.
export const INSTRUMENT_LINE =
  "Instrument: scripts/baseline-red-set.js (one child process per test file)";

// AGT-457: the words an uncredentialed measurement must carry, and they are chosen to MATCH
// `UNCREDENTIALED_BASELINE_RE` in scripts/verifier.js (the `\buncredentialed\b` arm). A block pasted
// into a kickoff from a credential-less run then arms AGT-451's refusal rather than reading as a real
// measurement -- which is the whole defect AGT-451 recorded: five of six standing reds declare their
// arms notRun and report GREEN without a database, so the block is self-consistently wrong.
export const UNCREDENTIALED_LINE =
  "UNCREDENTIALED: measured with no database credentials; arms that need one report green without running.";

export function renderBlock(results) {
  let red = 0;
  let notRunCount = 0;
  const lines = results.map(r => {
    if (r.code === 0) return `- ${r.path} — green`;
    const nr = transportNotRunLine(r);
    if (nr) { notRunCount++; return `- ${r.path} — NOT RUN (transport, exit 2): ${nr}`; }
    red++;
    return `- ${r.path} — RED (exit ${r.code}): ${firstAssertionLine(r.output)}`;
  });
  lines.push(`Red set: ${red} of ${results.length}`);
  if (notRunCount > 0) lines.push(`Not run: ${notRunCount}`);
  // LAST, AFTER THE COUNTS, so every line above it keeps the position its readers already key on:
  // `failLines()` / `notRunLine()` (scripts/pre-build-baseline.js) walk the per-test lines, and
  // `/^Red set: 1 of 2$/m` is pinned by tests/regression/ses-396b-designer-knowledge-row.test.mjs.
  // A reader looking for the instrument reads the whole paragraph, so the tail is enough.
  lines.push(INSTRUMENT_LINE);
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

  // AGT-457: BEFORE THE FIRST CHILD, AND AFTER THE MISSING-PATH CHECK ABOVE. The notice describes a
  // measurement, so it belongs only to a run that is about to take one -- a refused run (exit 2,
  // nothing measured) prints nothing but its error, which is what
  // tests/regression/ses-396b-designer-knowledge-row.test.mjs asserts by demanding no `Red set:` there.
  //
  // THE FIRST LINE OF STDOUT *AND* ON STDERR, because the two readers are different: whoever pastes
  // this block into a kickoff copies stdout, and whoever is watching a cycle reads stderr. The exit
  // code stays 0 -- this script reports and does not gate, and refusing here would only move the
  // uncredentialed measurement somewhere nobody records it (AGT-451 refuses it one level up, in
  // scripts/pre-build-baseline.js, which is the place that has the credentials to lose).
  if (["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].some(k => !String(process.env[k] ?? "").trim())) {
    console.log(UNCREDENTIALED_LINE);
    console.error(UNCREDENTIALED_LINE);
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
