// DeepBench v7.0.793 | tests/regression/agt-391-selective-regression.test.mjs | AGT-391
//
// FEATURE: AGT-391 -- selective regression. A build runs only the tests related to the files it
// changed (scripts/related-tests.js -> run-all.js --only), graded against the kickoff's BASELINE
// block; the full suite runs weekly (the Auditor routine) and before a production release
// (docs/runbooks/release-to-main.md), and each red it reads becomes a finding (audit-suite-reds.js).
//
// OFFLINE BY CONSTRUCTION (pattern:76): every child process runs with SUPABASE_URL /
// SUPABASE_SERVICE_KEY stripped and DEEPBENCH_TEST_SLOT=held, every fixture lives in os.tmpdir() and
// is removed in `finally`. Each arm is graded on its own, and every module is imported inside the arm
// that needs it, so a missing export or file fails that arm and not the whole run.
//
// ARMS (kickoff v7.0.793 §5 T1), each with a CONTROL that must fail:
//   (a) related-tests.js over a fixture root: a `../` import, a whole quoted path and a path.join
//       basename each make a test related; a mention inside a comment does not; `--include` adds a
//       test; an absent `--files` path exits 2; a file no test names yields an empty set.
//   (b) run-all.js --dir=<fixture of p, q> --only=p.test.mjs prints `SELECTIVE RUN: 1 of 2` and
//       `1/1 passed`; an unknown name exits 2 having run nothing; no flag runs `2/2`.
//   (c) verifier.js: readKickoffBaseline() reads THIS kickoff as 14 names, `Red set: 0 of 18` as [],
//       a count that disagrees with its list as null; regressionArgv() appends --only-from=<abs>;
//       GATES' regression argv stays bare; baselineGate() refuses only when all three are absent.
//   (d) the T5/T6 doc strings are present, runner-cycle.md no longer carries `regression-baseline-`,
//       and audit-suite-reds.js turns each `[FAIL]` into one suite-red finding (no summary -> exit 2).
//   (e) docs/design/agt-391-skill-rows.sql carries the three old and three new Skill texts and a
//       runner_before_images before-image per row.
//
// BASELINE: RED on the unchanged tree -- scripts/related-tests.js, scripts/audit-suite-reds.js and
// the SQL mirror do not exist, run-all.js has no --only, verifier.js exports no readKickoffBaseline.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KICKOFF = "docs/kickoffs/v7.0.793-AGT-391-selective-regression.md";
const lf = t => String(t).replace(/\r\n/g, "\n");
const read = rel => lf(fs.readFileSync(path.join(ROOT, rel), "utf8"));

function offlineEnv() {
  const env = { ...process.env, DEEPBENCH_TEST_SLOT: "held" };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}
function node(args, opts = {}) {
  const r = spawnSync(process.execPath, args, { encoding: "utf8", env: offlineEnv(), timeout: 120000, ...opts });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}`, stdout: r.stdout || "" };
}
function tmpDir(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `agt391-${tag}-`));
}
function put(root, rel, text) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

// ---- (a) related-tests.js ----------------------------------------------------------------------
async function armA() {
  const fx = tmpDir("rel");
  try {
    put(fx, "scripts/foo.js", "export const x = 1;\n");
    put(fx, "scripts/other.js", "export const y = 1;\n");
    put(fx, "lib/bar.js", "export const z = 1;\n");
    put(fx, "docs/baz.md", "# baz\n");
    put(fx, "tests/regression/run-all.js", "// runner, never a test\nimport '../../scripts/foo.js';\n");
    put(fx, "tests/regression/_helper.js", "export const P = \"scripts/foo.js\";\n");
    put(fx, "tests/regression/imp.test.mjs", "import { x } from \"../../scripts/foo.js\";\nexport default async () => x;\n");
    put(fx, "tests/regression/quoted.test.mjs", "const DOC = \"docs/baz.md\";\nexport default async () => DOC;\n");
    put(fx, "tests/regression/joined.test.mjs", "import path from 'path';\nconst P = path.join('x', \"lib\", \"bar.js\");\nexport default async () => P;\n");
    put(fx, "tests/regression/comment.test.mjs", "// reads \"scripts/foo.js\" -- a comment, never a dependency\n * \"docs/baz.md\"\nexport default async () => 0;\n");
    put(fx, "tests/regression/none.test.mjs", "export default async () => 0;\n");
    const CLI = path.join(ROOT, "scripts/related-tests.js");
    assert.ok(fs.existsSync(CLI), "scripts/related-tests.js does not exist");

    const rel = (...a) => node([CLI, `--root=${fx}`, ...a]);
    const r = rel("--files=scripts/foo.js,docs/baz.md,lib/bar.js");
    assert.strictEqual(r.code, 0, `related-tests exited ${r.code}: ${r.out}`);
    const expect = "imp.test.mjs,joined.test.mjs,quoted.test.mjs";
    const check = s => assert.strictEqual(s.trim(), expect,
      `import / quoted path / path.join basename must be related and a commented mention must not; got ${s.trim()}`);
    check(r.stdout);
    // CONTROL: the comment-blind answer (comment.test.mjs counted) must fail the same check.
    assert.throws(() => check("comment.test.mjs,imp.test.mjs,joined.test.mjs,quoted.test.mjs"), "control: a comment mention must not pass");

    const inc = rel("--files=scripts/foo.js", "--include=none.test.mjs");
    assert.strictEqual(inc.stdout.trim(), "imp.test.mjs,none.test.mjs", `--include must add the named test: ${inc.out}`);

    const absent = rel("--files=scripts/nope.js");
    assert.strictEqual(absent.code, 2, `an absent --files path must exit 2, got ${absent.code}: ${absent.out}`);
    const badInc = rel("--files=scripts/foo.js", "--include=ghost.test.mjs");
    assert.strictEqual(badInc.code, 2, `an absent --include test must exit 2, got ${badInc.code}`);

    const unnamed = rel("--files=scripts/other.js");
    assert.strictEqual(unnamed.code, 0, unnamed.out);
    assert.strictEqual(unnamed.stdout.trim(), "", `a file no test names must yield an empty set, got ${unnamed.stdout.trim()}`);

    // A touched test is its own relative; --files-from reads a JSON array; --json reports the count.
    const list = path.join(fx, "changed.json");
    fs.writeFileSync(list, JSON.stringify(["tests/regression/none.test.mjs", "docs/baz.md"]));
    const ff = rel(`--files-from=${list}`, "--json");
    const j = JSON.parse(ff.stdout);
    assert.deepStrictEqual(j.related, ["none.test.mjs", "quoted.test.mjs"], `--files-from + touched test: ${ff.out}`);
    assert.strictEqual(j.count, 2);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- (b) run-all.js --only ---------------------------------------------------------------------
async function armB() {
  const fx = tmpDir("only");
  try {
    put(fx, "p.test.mjs", "export default async () => {};\n");
    put(fx, "q.test.mjs", "export default async () => {};\n");
    const RUNNER = path.join(ROOT, "tests/regression/run-all.js");
    const sel = node([RUNNER, `--dir=${fx}`, "--only=p.test.mjs"]);
    const selective = s => {
      assert.ok(s.includes("SELECTIVE RUN: 1 of 2 files (--only;"), `no SELECTIVE RUN line: ${s}`);
      assert.ok(s.includes("regression suite: 1/1 passed"), `not 1/1 passed: ${s}`);
    };
    assert.strictEqual(sel.code, 0, sel.out);
    selective(sel.out);

    const full = node([RUNNER, `--dir=${fx}`]);
    assert.strictEqual(full.code, 0, full.out);
    assert.ok(full.out.includes("regression suite: 2/2 passed"), `no flag must run 2/2: ${full.out}`);
    assert.ok(!full.out.includes("SELECTIVE RUN"), "a full run must not announce itself selective");
    // CONTROL: the full run's output must fail the selective check.
    assert.throws(() => selective(full.out), "control: the full run must not read as selective");

    const unknown = node([RUNNER, `--dir=${fx}`, "--only=p.test.mjs,zz.test.mjs"]);
    assert.strictEqual(unknown.code, 2, `an unknown --only name must exit 2: ${unknown.out}`);
    assert.ok(/--only names 1 file\(s\) not in .*zz\.test\.mjs\. Nothing was run\./.test(unknown.out), unknown.out);
    assert.ok(!unknown.out.includes("[PASS]"), "nothing may run when --only names an unknown file");

    const listFile = path.join(fx, "set.csv");
    fs.writeFileSync(listFile, "q.test.mjs\n");
    const from = node([RUNNER, `--dir=${fx}`, `--only-from=${listFile}`]);
    assert.ok(from.out.includes("SELECTIVE RUN: 1 of 2") && from.out.includes("[PASS] q.test.mjs") && !from.out.includes("p.test.mjs"), from.out);
    fs.writeFileSync(listFile, "");
    const empty = node([RUNNER, `--dir=${fx}`, `--only-from=${listFile}`]);
    assert.strictEqual(empty.code, 2, `an empty set must exit 2: ${empty.out}`);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- (c) verifier.js ---------------------------------------------------------------------------
async function armC() {
  const v = await import(pathToFileURL(path.join(ROOT, "scripts/verifier.js")).href);
  for (const k of ["readKickoffBaseline", "readRelatedSet", "regressionArgv", "baselineGate"]) {
    assert.strictEqual(typeof v[k], "function", `scripts/verifier.js does not export ${k}()`);
  }
  const mine = v.readKickoffBaseline(read(KICKOFF));
  assert.ok(Array.isArray(mine.names) && mine.names.length === 14, `this kickoff must read 14 names, got ${JSON.stringify(mine.names)}`);
  assert.ok(mine.names.includes("SES-352-green-anchor-from-ci.js") && mine.names.includes("ses-424e-patterns-cited.test.mjs"));
  assert.deepStrictEqual(mine.unverified, []);
  const zero = v.readKickoffBaseline("x\n\nBASELINE (credentialed): 18 tests. Red set: 0 of 18.\n\ny");
  assert.deepStrictEqual(zero.names, [], "Red set: 0 of 18 must read as an empty, real baseline");
  const listed = v.readKickoffBaseline("BASELINE (x): Red set: 2 of 9.\n- tests/regression/a.test.mjs — RED\n- tests/regression/b.js — RED");
  assert.deepStrictEqual(listed.names, ["a.test.mjs", "b.js"], "`- <path> — RED` lines must read as basenames");
  const bad = v.readKickoffBaseline("BASELINE (x): Red set: 3 of 9.\nRed: a.test.mjs, b.test.mjs");
  assert.strictEqual(bad.names, null, "a count that disagrees with its list must read null");
  assert.strictEqual(v.readKickoffBaseline("no block here").names, null, "an absent block must read null");
  // CONTROL: the bad block, read as if the count were ignored, must fail the null assertion.
  assert.throws(() => assert.strictEqual(["a.test.mjs", "b.test.mjs"], null), "control");

  const gate = v.GATES.find(g => g.key === "regression");
  assert.deepStrictEqual([...gate.argv], ["tests/regression/run-all.js"], "GATES' regression argv must stay bare");
  const abs = path.join(os.tmpdir(), "related.csv");
  assert.deepStrictEqual(v.regressionArgv(abs), ["tests/regression/run-all.js", `--only-from=${path.resolve(abs)}`]);
  assert.deepStrictEqual(v.regressionArgv(""), ["tests/regression/run-all.js"]);

  const none = { names: null, unverified: null, source: "none" };
  const g = v.baselineGate;
  const grade = fn => {
    assert.strictEqual(fn({ read: none, declared: "" }).refuse, true, "all absent must refuse");
    assert.strictEqual(fn({ read: none, declared: "", related: ["a.test.mjs"] }).refuse, false, "a related set alone must not refuse");
    assert.strictEqual(fn({ read: none, declared: "why" }).refuse, false);
  };
  grade(g);
  // CONTROL: AGT-245's related-blind gate must fail the related arm.
  assert.throws(() => grade(({ read, declared }) => ({ refuse: read.names === null && !String(declared ?? "").trim() })), "control");

  const fx = tmpDir("set");
  try {
    const p = path.join(fx, "r.csv");
    fs.writeFileSync(p, "a.test.mjs,b.js\n");
    assert.deepStrictEqual(v.readRelatedSet(p).names, ["a.test.mjs", "b.js"]);
    fs.writeFileSync(p, "");
    assert.strictEqual(v.readRelatedSet(p).names, null, "an empty set is unreadable, not empty");
    assert.strictEqual(v.readRelatedSet(path.join(fx, "missing.csv")).names, null);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- (d) T5/T6 doc strings + audit-suite-reds.js -----------------------------------------------
const DOC_NEEDLES = [
  ["docs/runbooks/auditor-routine.md", "node tests/regression/run-all.js > $S/suite.txt"],
  ["docs/runbooks/auditor-routine.md", "node scripts/audit-suite-reds.js --suite=$S/suite.txt --week=$W --out=$S/suite.json"],
  ["docs/runbooks/auditor-routine.md", "$S/prompt-runner.json $S/suite.json\""],
  ["docs/runbooks/release-to-main.md", "merge-tree --write-tree --merge-base=<ship>^ origin/main <ship>"],
  ["docs/runbooks/release-to-main.md", "-p origin/main"],
  ["docs/runbooks/release-to-main.md", "--found-by=release:"],
  ["docs/runbooks/release-to-main.md", "gh pr create --base main"],
  ["docs/runbooks/runner-cycle.md", "7a grades only the related set (`scripts/related-tests.js` over 2's `files`) against the kickoff's BASELINE block (`AGT-391`, `v7.0.793`)."],
  ["docs/runbooks/runner-cycle.md", "node scripts/related-tests.js --files-from=$S/changed-<your cycle id>.json > $S/related-<your cycle id>.csv"],
  ["docs/runbooks/runner-cycle.md", "  --related=$S/related-<your cycle id>.csv"],
  ["docs/runbooks/session-setup.md", "node scripts/related-tests.js --diff=<your push sha>^ > $S/related.csv"],
  ["docs/runbooks/session-setup.md", "--related=$S/related.csv"],
  ["docs/STANDARDS.md", "node --env-file-if-exists=.env.local tests/regression/run-all.js --only=<the kickoff's related set>"],
  ["scripts/render-cycle-card.js", "7a: --related=<set> vs the kickoff BASELINE, else exit 2; settle-ship.js writes the status"],
];
async function armD() {
  const docs = {};
  const check = (get) => {
    for (const [rel, needle] of DOC_NEEDLES) {
      assert.ok(get(rel).includes(needle), `${rel} lacks \`${needle}\``);
    }
    assert.ok(!get("docs/runbooks/runner-cycle.md").includes("regression-baseline-"),
      "runner-cycle.md still captures a full-suite baseline (`regression-baseline-`)");
  };
  const get = rel => (docs[rel] ??= fs.existsSync(path.join(ROOT, rel)) ? read(rel) : "");
  check(get);
  // CONTROL: the runbook with the old capture line restored must fail.
  assert.throws(() => check(rel => rel === "docs/runbooks/runner-cycle.md" ? get(rel) + "\n$S/regression-baseline-x.txt" : get(rel)), "control");

  const CLI = path.join(ROOT, "scripts/audit-suite-reds.js");
  assert.ok(fs.existsSync(CLI), "scripts/audit-suite-reds.js does not exist");
  const fx = tmpDir("reds");
  try {
    const suite = path.join(fx, "suite.txt"), out = path.join(fx, "suite.json");
    fs.writeFileSync(suite, "  [PASS] a.test.mjs\n  [FAIL] b.test.mjs -- " + "x".repeat(300) + "\n  [FAIL] c.js -- boom\n\nregression suite: 1/3 passed\n");
    const r = node([CLI, `--suite=${suite}`, `--out=${out}`, "--week=2026-W41"]);
    assert.strictEqual(r.code, 0, r.out);
    const j = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.strictEqual(j.week, "2026-W41");
    assert.strictEqual(j.found_by, "auditor:routine:suite");
    assert.strictEqual(j.finding_type, "defect");
    assert.strictEqual(j.findings.length, 2, "one finding per [FAIL]");
    const f = j.findings[0];
    assert.strictEqual(f.kind, "other");
    assert.strictEqual(f.check_slug, "suite-red");
    assert.strictEqual(f.family, "service");
    assert.strictEqual(f.locations[0].location, "tests/regression/b.test.mjs");
    assert.ok(f.locations[0].text.length <= 200, "text is capped at 200");
    assert.strictEqual(f.governing_fact, "the full regression run (AGT-391) read this test red");
    assert.strictEqual(f.proposed_resolution, "repair ticket for the Development Manager");
    const rel = node([CLI, `--suite=${suite}`, `--out=${out}`, "--found-by=release:r1"]);
    assert.strictEqual(rel.code, 0, rel.out);
    assert.strictEqual(JSON.parse(fs.readFileSync(out, "utf8")).found_by, "release:r1");
    fs.writeFileSync(suite, "  [NOT RUN] regression suite -- transport: no slot\n");
    const none = node([CLI, `--suite=${suite}`, `--out=${out}`]);
    assert.strictEqual(none.code, 2, `a run with no summary line must exit 2: ${none.out}`);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
}

// ---- (e) T7 SQL mirror -------------------------------------------------------------------------
const SQL_REL = "docs/design/agt-391-skill-rows.sql";
const M = "re-measured from your diff with scripts/related-tests.js";
const SQL_TEXTS = [
  "keep build and regression green before every commit",
  `keep build and the kickoff's related test set green before every commit (node tests/regression/run-all.js --only=<the set>, ${M})`,
  "node tests/regression/run-all.js (creds",
  `node tests/regression/run-all.js --only=<the kickoff's related set, ${M}> (creds`,
  "tests/regression/run-all.js, scripts/check-session-docs.js",
  "tests/regression/run-all.js --only=<the related set> (AGT-391: full suite weekly and before a release), scripts/check-session-docs.js",
];
async function armE() {
  assert.ok(fs.existsSync(path.join(ROOT, SQL_REL)), `${SQL_REL} does not exist`);
  const sql = read(SQL_REL);
  const check = s => {
    for (const t of SQL_TEXTS) assert.ok(s.includes(t.replace(/'/g, "''")), `${SQL_REL} lacks \`${t}\``);
    assert.strictEqual((s.match(/INSERT INTO public\.runner_before_images/g) || []).length, 3, "one before-image per row");
    assert.strictEqual((s.match(/GET DIAGNOSTICS/g) || []).length, 3, "one row count per UPDATE");
  };
  check(sql);
  assert.throws(() => check(sql.split("runner_before_images").join("x")), "control");
}

const ARMS = { "a-related-tests": armA, "b-run-all-only": armB, "c-verifier": armC, "d-docs-and-reds": armD, "e-skill-sql": armE };

export async function run() {
  const passed = [], failed = [];
  for (const [name, fn] of Object.entries(ARMS)) {
    try { await fn(); passed.push(name); }
    catch (e) { failed.push(`${name}: ${e.message.split("\n")[0]}`); }
  }
  console.log(`  [AGT-391] ${passed.length} of ${Object.keys(ARMS).length} arms passed: ${passed.map(n => n.split("-")[0]).join(",") || "none"}`);
  if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
  return passed;
}

selfRun(import.meta.url, run);
export default run;
