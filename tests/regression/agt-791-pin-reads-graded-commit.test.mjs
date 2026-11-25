// DeepBench v7.0.1116 | tests/regression/agt-791-pin-reads-graded-commit.test.mjs | AGT-791
//
// FEATURE: AGT-791 -- THE PIN CHECK READS THE GRADED COMMIT'S OWN FILE LIST.
//
// THE DEFECT, measured 2026-11-25 on tree `1089d8d`: of the 4 `pin left behind` blocks in
// `runner_verdicts`, THREE read `git diff vs origin/dev, 0 paths` -- taken AFTER the push, when the
// delivery's changed-file list is legitimately empty -- while the graded commit itself holds every
// test the kickoff declared `repin` (`a4c064b` AGT-770, `9db0cb7` AGT-781, `5302eb2` AGT-523). Only
// the 4th (AGT-167) is a true miss. Nothing read the commit's own list, so 7a blocked three ships
// for a re-pin that had in fact ridden them.
//
// TWO LISTS, ONE QUESTION. `commitFilesFor()` asks git what the GRADED SHA changed; 7a now passes a
// `repin` test found in EITHER list. Both unreadable is still a block, but as `pin-not-graded` (D2)
// -- fail closed, never worded as a missing re-pin, because a check that cannot read its evidence
// has not found a miss and must not claim one (pattern:162: a check grades the change, never the
// live world).
//
// THE DISCRIMINATOR is arm b: the post-push input (delivery list null, commit list real) passes
// here and blocks as `pin left behind` on `1089d8d`.
//
// OFFLINE BY CONSTRUCTION (pattern:76). Arm a is pure calls over literal lists. Arm b builds a
// throwaway git repo in `os.tmpdir()` and removes it in `finally` -- nothing reads or writes this
// repo's git state, no credentials, no rows. Arm c reads three shipped kickoffs out of the tree as
// text.
//
// ARMS (kickoff v7.0.1116 section 6):
//   a  the judgment, pure: either list satisfies the pin; one list missing it still blocks
//      `pin-left-behind`; NEITHER list readable is `pin-not-graded`, not a missing re-pin.
//   b  the real git read, against a two-commit fixture: the graded commit's own list carries the
//      re-pin when the delivery list is null, and `commitFilesFor` fails closed on a root commit,
//      a non-sha ref and a directory that is not the repo.
//   c  the three live cases from the premise: each kickoff's declared `repin` tests, handed over as
//      the commit's own list, pass; omitted, each is NOT GRADED naming that many tests.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { commitFilesFor, pinsShipFinding, resolveDeliveryFiles } from "../../scripts/verifier.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const H = "tests/regression/holds.test.mjs";
const K = [
  "<!-- DeepBench v7.0.1116 | kickoff | FIXTURE -->",
  "```pins",
  `${H} | repin | T2`,
  "```",
].join("\n");

const P = (changedFiles, commitFiles) => pinsShipFinding({ text: K, changedFiles, commitFiles });

function armA() {
  assert.strictEqual(P(null, ["a.js", H]), null,
    "AGT-791 a: the graded commit's own list carries the re-pin with NO delivery list -- must pass");
  assert.strictEqual(P(["a.js"], ["./" + H]), null,
    "AGT-791 a: a `./`-prefixed path in the commit's list is the same path -- must pass");

  const left = P(null, ["a.js"]);
  assert.strictEqual(left && left.kind, "pin-left-behind",
    `AGT-791 a: a readable list WITHOUT the re-pin is still a miss; got ${JSON.stringify(left)}`);
  assert.ok(!left.reason.includes("could not be read"),
    `AGT-791 a: a READABLE list never reports "could not be read": ${left.reason}`);

  for (const [label, finding] of [["P(null, null)", P(null, null)], ["P(null)", P(null)]]) {
    assert.strictEqual(finding && finding.kind, "pin-not-graded",
      `AGT-791 a: ${label} -- neither list readable is NOT GRADED, never a miss; got ${JSON.stringify(finding)}`);
    assert.deepStrictEqual(finding.tests, [H],
      `AGT-791 a: ${label} -- the declared repin tests are carried: ${JSON.stringify(finding.tests)}`);
    assert.ok(finding.reason.startsWith("pin claim NOT GRADED (AGT-791)"),
      `AGT-791 a: ${label} -- the reason opens with the NOT GRADED clause: ${finding.reason}`);
    assert.ok(finding.reason.includes("fail closed"),
      `AGT-791 a: ${label} -- the reason says it fails closed: ${finding.reason}`);
    assert.ok(!finding.reason.includes("pin left behind"),
      `AGT-791 a: ${label} -- an unreadable pair must NOT be worded as a missing re-pin (D2): ${finding.reason}`);
  }
}

function armB(fx) {
  const R = path.join(fx, "repo");
  fs.mkdirSync(path.join(R, "tests/regression"), { recursive: true });
  const git = (...argv) => {
    const r = spawnSync("git",
      ["-c", "user.name=t", "-c", "user.email=t@t.invalid", "-c", "commit.gpgsign=false", ...argv],
      { cwd: R, encoding: "utf8" });
    assert.strictEqual(r.status, 0, `git ${argv.join(" ")} failed: ${r.stdout || ""}${r.stderr || ""}`);
    return String(r.stdout || "").trim();
  };
  git("init", "-q", "-b", "main");
  fs.writeFileSync(path.join(R, "a.js"), "// base\n");
  git("add", "-A"); git("commit", "-q", "-m", "base");
  const baseSha = git("rev-parse", "HEAD");
  fs.writeFileSync(path.join(R, "a.js"), "// ship\n");
  fs.writeFileSync(path.join(R, H), "process.exit(0);\n");
  git("add", "-A"); git("commit", "-q", "-m", "ship");
  const shipSha = git("rev-parse", "HEAD");
  assert.notStrictEqual(baseSha, shipSha, "the fixture needs two distinct commits");

  // THE DISCRIMINATOR: this is the shape every post-push verdict is graded on.
  const N = resolveDeliveryFiles({ explicit: null, gitList: [] });
  assert.strictEqual(N, null,
    `AGT-791 b: after the push the delivery list resolves to null (SES-336); got ${JSON.stringify(N)}`);
  const C = commitFilesFor(R, shipSha);
  assert.deepStrictEqual(C, ["a.js", H],
    `AGT-791 b: the graded commit's own files are read from git; got ${JSON.stringify(C)}`);
  assert.strictEqual(P(N, C), null,
    `AGT-791 b: delivery list null + the commit's own list carrying the re-pin must PASS -- on 1089d8d ` +
    `this exact input blocked as \`pin left behind\`; got ${JSON.stringify(P(N, C))}`);

  assert.strictEqual(commitFilesFor(R, baseSha), null,
    "AGT-791 b: a root commit has no parent -- git cannot answer, so null (fail closed)");
  assert.strictEqual(commitFilesFor(R, "HEAD"), null,
    "AGT-791 b: a ref that is not a 40-hex sha is never read -- null");
  assert.strictEqual(commitFilesFor(os.tmpdir(), shipSha), null,
    "AGT-791 b: a directory that is not the graded repo cannot answer -- null");
}

function armC() {
  const cases = [
    ["v7.0.1095-AGT-523-measured-model-params.md",
      ["agt-70-auditor.test.mjs", "agt-90-fable-temperature.test.mjs"]],
    ["v7.0.1096-AGT-770-site-key-gate.md",
      ["agt-297-mcp-caller-gate.test.mjs"]],
    ["v7.0.1106-AGT-781-company-knowledge-records.md",
      ["agt-542-dilbert.test.mjs", "agt-643-harry.test.mjs", "agt-721-laura.test.mjs"]],
  ];
  for (const [file, names] of cases) {
    const text = fs.readFileSync(path.join(REPO, "docs/kickoffs", file), "utf8");
    const commitFiles = names.map(n => `tests/regression/${n}`);

    const passed = pinsShipFinding({ text, changedFiles: null, commitFiles });
    assert.strictEqual(passed, null,
      `AGT-791 c: ${file} -- its declared repin tests in the graded commit's own list must PASS; ` +
      `got ${JSON.stringify(passed)}`);

    const omitted = pinsShipFinding({ text, changedFiles: null });
    assert.strictEqual(omitted && omitted.kind, "pin-not-graded",
      `AGT-791 c: ${file} -- neither list readable is NOT GRADED; got ${JSON.stringify(omitted)}`);
    assert.deepStrictEqual([...omitted.tests].sort(), [...commitFiles].sort(),
      `AGT-791 c: ${file} -- NOT GRADED names exactly its declared repin tests; ` +
      `got ${JSON.stringify(omitted.tests)}`);
    assert.ok(omitted.reason.includes(`${names.length} declared repin`),
      `AGT-791 c: ${file} -- the reason names ${names.length} declared repin: ${omitted.reason}`);
  }
}

async function run() {
  armA();
  const fx = fs.mkdtempSync(path.join(os.tmpdir(), "agt791-"));
  try {
    armB(fx);
  } finally {
    fs.rmSync(fx, { recursive: true, force: true });
  }
  armC();
}

selfRun(import.meta.url, run);
export default run;
