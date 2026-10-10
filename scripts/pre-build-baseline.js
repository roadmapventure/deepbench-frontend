#!/usr/bin/env node
// DeepBench v7.0.843 | scripts/pre-build-baseline.js | AGT-451 -- the baseline is measured
// credentialed, over the kickoff's own declared files, BEFORE the Builder is spawned.
//
// WHY THIS SCRIPT EXISTS, measured rather than argued. The kickoff's BASELINE block is the only
// input `regressionDelta()` can tell a STANDING red from a NEWLY red one with (`AGT-391`,
// `scripts/verifier.js readKickoffBaseline()`). On `v7.0.827` that block was written by a Designer
// turn with no credentials in its environment: the six tests that are red on the unchanged tree
// read 1 red uncredentialed, because the other five declare their arms `notRun` and report green.
// The block then said "Red set: 0 of 2" over a tree that had six, and every one of those six would
// have graded as the Builder's own newly-red work. The block was not wrong about what it ran -- it
// was measured in a place where the measurement cannot be taken.
//
// SO THE MEASUREMENT MOVES TO THE ONE PLACE THAT HAS THE CREDENTIALS: the cycle, at step 7, on the
// unchanged clone, immediately before the spawn (`docs/runbooks/runner-cycle.md` step 7;
// `docs/runbooks/session-setup.md` §3f(b) for an attended session). The cycle pastes the block it
// gets here into the Builder's opening line and hands the same file to 7a's verifier as
// `--pre-build-baseline=<file>`, so the Designer, the Builder and the Verifier read ONE
// measurement taken ONCE -- the same argument `scripts/baseline-red-set.js` already makes for the
// red set, applied to the place the run happens (pattern:9, pattern:14).
//
// IT REFUSES WITHOUT CREDENTIALS, AND THAT IS THE WHOLE POINT (exit 2, nothing written). A
// credential-less run of this script would reproduce exactly the defect it exists to remove: a
// block that looks measured, names fewer reds than the tree holds, and cannot be told apart from a
// real one afterwards. There is no --force and no degraded mode; an attended cycle that genuinely
// cannot measure says so to the verifier instead (`--no-baseline=<reason>`, `AGT-245`).
//
// IT REPORTS, IT DOES NOT GATE. Exit 0 whatever the tests do -- a red test is this script's OUTPUT,
// the same convention `scripts/baseline-red-set.js` sets and for the same reason. Exit 2 is only
// ever "the measurement could not be taken": no credentials, no `--out=`, an unreadable kickoff, or
// a child that could not run.
//
// NO MODEL CALL, NO JUDGMENT, NO SPEND of its own. It reads a kickoff, derives a file list by
// regex, derives a test set with `scripts/related-tests.js`, and spawns
// `scripts/baseline-red-set.js` as one child. The credentials are checked and passed through to
// that child's environment (the tests themselves reach Supabase); nothing here prints them.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/pre-build-baseline.js \
//     --kickoff=docs/kickoffs/<version>-<ID>-<name>.md \
//     --out=$S/pre-build-baseline-<your cycle id>.txt
//
// Flags:
//   --kickoff=<path>  The kickoff to read the declared files out of. Required.
//   --out=<path>      Where the block is written. Required -- stdout alone is not a hand-off.
//   --root=<path>     The tree to measure. Default: this script's repo root.
//   --include=<csv>   Extra test names to add to the set (`related-tests.js --include=`).
//   --cycle-id=<id>   Recorded in the block's header; `-` when absent.
//
// Exit codes: 0 the block was measured and written, whatever the tests did.
//             2 nothing was measured and nothing was written.

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { relatedTests } from "./related-tests.js";
import { anchorBlockLines } from "./verifier.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const norm = p => String(p).trim().replace(/\\/g, "/").replace(/^\.\//, "");

// A repo path a kickoff can mean, as a whole backticked token: one of the real top-level
// directories, then a path, then an extension. Anchored, so `--files=scripts/a.js,scripts/b.js`
// inside one pair of backticks is NOT a path (it is a command line) and is skipped rather than
// half-parsed.
const BACKTICKED_PATH = /^(?:scripts|tests|docs|src|api|lib|shared|public|supabase)\/[\w./-]+\.[a-z]+$/;
const BACKTICKED_TOKEN = /`([^`\n]+)`/g;
// A test file is named in prose as often as it is named in backticks, and it is the one kind of
// path whose bare mention is unambiguous.
const BARE_TEST = /\btests\/regression\/[\w.-]+\.m?js\b/g;

// PURE AND EXPORTED, because this is the one judgment in the script and the suite has to be able to
// grade it without a tree, a child process or a credential (the same reason `readKickoffBaseline`
// and `baselineGate` are pure in `scripts/verifier.js`).
//
// THREE SOURCES, UNION, SORTED, DE-DUPLICATED. (1) the `anchors` block's own paths -- the kickoff's
// most deliberate statement of what the build will touch; (2) every WHOLE backticked path token,
// which is how §5's tasks name their files; (3) every bare `tests/regression/...` mention. A path
// in prose without backticks and outside tests/regression is NOT declared: §2's reasoning quotes
// file names it is not going to edit, and reading those as declarations would widen the related set
// by whatever the prose happened to mention.
export function declaredFiles(text) {
  const out = new Set();
  const src = String(text ?? "");
  for (const a of anchorBlockLines(src)) {
    if (a.path) out.add(norm(a.path));
  }
  for (const m of src.matchAll(BACKTICKED_TOKEN)) {
    const token = norm(m[1]);
    if (BACKTICKED_PATH.test(token)) out.add(token);
  }
  for (const m of src.matchAll(BARE_TEST)) out.add(norm(m[0]));
  return [...out].sort();
}

// Pure. The `  [FAIL] <basename> -- <assertion>` lines the delta gate reads, one per `— RED` line of
// the block, in block order. `readRegressionBaseline()` parses exactly these, so the block the
// Builder pastes and the file 7a reads carry the SAME names by construction rather than by care.
export function failLines(block) {
  const out = [];
  for (const line of String(block ?? "").split("\n")) {
    const m = line.match(/^\s*-\s+(\S+)\s+—\s+RED \(exit [^)]*\):\s*(.*)$/);
    if (m) out.push(`  [FAIL] ${path.posix.basename(norm(m[1]))} -- ${m[2]}`);
  }
  return out;
}

// Pure. The `NOT A FULL RUN:` notice `notRunTestsFrom()` reads, or "" when the block declared none.
// A transport NOT RUN is an outage, not a red (`AGT-116`): it must not count toward `Red set:`, and
// it must also not be read later as "the unchanged tree ran this and it passed" -- which is exactly
// what `unverified` is for, and this line is how it gets there.
export function notRunLine(block) {
  const names = [];
  for (const line of String(block ?? "").split("\n")) {
    const m = line.match(/^\s*-\s+(\S+)\s+—\s+NOT RUN \(transport/);
    if (m) names.push(path.posix.basename(norm(m[1])));
  }
  if (!names.length) return "";
  return `NOT A FULL RUN: ${names.length} parts declared not-run across ${names.length} tests (${names.join(", ")})`;
}

// Pure. The whole block, from the pieces above, so the format can be asserted without a child.
export function renderOut({ block, sha7, iso, cycleId, declaredCount }) {
  const lines = [
    `BASELINE (cycle-measured, credentialed, scripts/pre-build-baseline.js, tree ${sha7}, ${iso}, `
      + `cycle ${cycleId || "-"}; related set over ${declaredCount} declared files):`,
    block,
  ];
  const fails = failLines(block);
  const notRun = notRunLine(block);
  if (fails.length || notRun) {
    lines.push("");
    lines.push(...fails);
    if (notRun) lines.push(notRun);
  }
  return `${lines.join("\n")}\n`;
}

function arg(argv, name) {
  const prefix = `--${name}=`;
  const hit = argv.find(a => a.startsWith(prefix));
  return hit === undefined ? undefined : hit.slice(prefix.length);
}

function fail(msg) {
  console.error(`pre-build-baseline: ${msg}`);
  return 2;
}

function shortSha(root) {
  const r = spawnSync("git", ["-C", root, "rev-parse", "--short", "HEAD"], { encoding: "utf8" });
  if (r.error || r.status !== 0) return "-";
  const out = String(r.stdout || "").trim();
  return out || "-";
}

function main(argv) {
  const kickoff = arg(argv, "kickoff");
  const out = arg(argv, "out");
  const cycleId = (arg(argv, "cycle-id") ?? "").trim();
  const include = String(arg(argv, "include") ?? "").split(",").map(norm).filter(Boolean);
  const root = path.resolve(arg(argv, "root") ?? REPO_ROOT);

  if (!out) {
    return fail("--out=<path> is required; a block printed to stdout alone is not a hand-off. Nothing was measured.");
  }
  if (!kickoff) {
    return fail("--kickoff=<path> is required -- the declared files come from the kickoff. Nothing was measured.");
  }

  // THE CREDENTIAL CHECK IS FIRST, BEFORE ANY CHILD AND BEFORE ANY WRITE. An uncredentialed
  // measurement is the defect this script exists to remove, so there is no degraded mode: the names
  // are reported, the values never are.
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].filter(k => !String(process.env[k] ?? "").trim());
  if (missing.length) {
    return fail(`${missing.join(" and ")} absent or empty, so the baseline CANNOT be measured here `
      + "(AGT-451: an uncredentialed BASELINE reads fewer reds than the tree holds and cannot be told "
      + "apart from a real one afterwards). Nothing was run and nothing was written.");
  }

  const abs = path.resolve(root, kickoff);
  let text;
  try { text = fs.readFileSync(abs, "utf8"); }
  catch (e) { return fail(`--kickoff=${kickoff} could not be read (${e.message}). Nothing was measured.`); }

  const declared = declaredFiles(text);
  let set;
  try { set = relatedTests({ root, touched: declared, include }); }
  catch (e) { return fail(`the related set could not be measured over ${root} (${e.message}). Nothing was written.`); }

  // AN EMPTY SET IS A MEASUREMENT, AND IT STILL GETS A BLOCK. `baseline-red-set.js` refuses an empty
  // `--tests=` (correctly -- a measurement of nothing is not what its caller asked for), so the
  // empty case is rendered here rather than spawned. `Red set: 0 of 0` is the honest block: the
  // declared files break no test in this tree, so every red the Builder's run reports IS its own.
  let block;
  if (!set.length) {
    block = "Red set: 0 of 0";
  } else {
    const tests = set.map(n => path.join(root, "tests/regression", n));
    const child = spawnSync(process.execPath,
      [path.join(REPO_ROOT, "scripts/baseline-red-set.js"), `--tests=${tests.join(",")}`],
      { cwd: root, encoding: "utf8", env: process.env, maxBuffer: 64 * 1024 * 1024 });
    if (child.error) return fail(`baseline-red-set.js could not be spawned (${child.error.message}). Nothing was written.`);
    if (child.status === 2) {
      return fail("baseline-red-set.js exited 2 -- it measured nothing, so there is no baseline to write:\n"
        + String(child.stderr || "").trim());
    }
    if (child.status !== 0) {
      return fail(`baseline-red-set.js exited ${child.status}, which it never does on a red test -- `
        + `treating it as "the measurement could not be taken". Nothing was written.\n`
        + String(child.stderr || "").trim());
    }
    block = String(child.stdout || "").replace(/\s+$/, "");
    if (!block.includes("Red set:")) {
      return fail("baseline-red-set.js printed no `Red set:` line, so its output is not a baseline. Nothing was written.");
    }
  }

  const rendered = renderOut({
    block,
    sha7: shortSha(root),
    iso: new Date().toISOString(),
    cycleId,
    declaredCount: declared.length,
  });

  try { fs.writeFileSync(path.resolve(out), rendered, "utf8"); }
  catch (e) { return fail(`--out=${out} could not be written (${e.message}).`); }

  process.stdout.write(rendered);
  console.error(`wrote ${out}`);
  console.error(`  --pre-build-baseline=${out}`);
  return 0;
}

// Importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exit(main(process.argv.slice(2)));
}
