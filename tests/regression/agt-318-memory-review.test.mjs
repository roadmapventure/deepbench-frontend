// DeepBench v7.0.1072 | tests/regression/agt-318-memory-review.test.mjs | AGT-318 -- THE MEMORY
// REVIEW WITHOUT JOHN'S MACHINE. Two holes measured on the unchanged tree 2026-11-20, both in the
// weekly Auditor's reading of John's Claude memory through the `claude-config` git mirror:
//
//   (1) NOTHING STATED THE MIRROR'S AGE. The corpus arrived, the statements were judged, and a sync
//       that had stopped was indistinguishable from a project with nothing new to say. T1 reads the
//       root's OWN newest commit and files `config-mirror-stale` past a declared limit.
//   (2) MEMORY-AGAINST-MEMORY COULD NOT REACH A TASK FILE AT ALL. `--build` keeps the top 12 of
//       ~2,000 clusters by distinct-`source` spread and the 12th survivor spanned 4; a cluster whose
//       only home is the memory mirror spans ONE, so it never ran -- unreachable, not merely rare.
//       T2 reserves up to n such clusters BESIDE the 12.
//
// RED ON THE UNCHANGED TREE (QA 1, the discriminator): `rootAge` / `staleRootFinding` are not
// exported by scripts/audit-corpus.js there and `reservedClusters` is not exported by
// scripts/audit-cluster.js, so this file cannot even load, let alone pass.
//
// ARMS.
//   A  THE AGE, END TO END through the real CLI (spawned, exit code read, stdout parsed). A throw-
//      away git repo outside this tree holds one committed .md whose COMMITTER date is 72.5 h back,
//      so the floor is 72 and the 48 h limit is breached by a real git read, never a stubbed clock.
//      A1 the stale line and the one finding in the --root-age file. A2 the CONTROL at limit 100:
//      the SAME age, the same exit 0, the line WITHOUT the STALE suffix and zero findings -- which
//      is what proves the suffix tracks the limit rather than tracking the flag being present at
//      all (STANDARDS.md Section 4, the LOO-013 lesson: assert which branch fired). A3 a limit for
//      a label no --extra-root passed is exit 2 -- a measurement nobody could take is never a pass.
//   B  THE RESERVATION, pure. Two memory statements built by audit-corpus.js's own extractMarkdown()
//      so the shape under test is the shape the corpus emits, not a hand-rolled lookalike. They
//      state opposite things about one setting, which is the finding the check exists to catch.
//      B1 one reserved cluster over both homes, routed to the config review. B2 the CONTROL: move
//      one statement out from under the prefix and the reservation is empty -- the prefix filter is
//      load-bearing, so a reservation can never quietly widen into the whole corpus.
//
// Nothing here writes to the database or to this repo (pattern:76): arm A's fixtures live in a
// mkdtemp directory it removes, and arm B is in-memory.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { extractMarkdown, rootAge, staleRootFinding } from "../../scripts/audit-corpus.js";
import { reservedClusters, capabilityFor } from "../../scripts/audit-cluster.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORPUS = path.join(ROOT, "scripts", "audit-corpus.js");

const AGE_HOURS = 72.5;          // floors to 72: over a 48 h limit, under a 100 h one
const PREFIX = "claude-config:memory/";
const A_TEXT = "The runner stops at `weekly_wall` 85 percent.";
const B_TEXT = "The runner never stops at `weekly_wall`.";

// A git checkout outside this tree whose single commit is AGE_HOURS old by COMMITTER date, which is
// the date `git log -1 --format=%cI` returns and therefore the one rootAge() reads.
function agedRepo(dir) {
  const git = (...a) => {
    const r = spawnSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", ...a], {
      encoding: "utf8",
      env: { ...process.env, GIT_COMMITTER_DATE: new Date(Date.now() - AGE_HOURS * 3600000).toISOString() },
    });
    assert.equal(r.status, 0, `git ${a[0]} failed in the fixture repo: ${(r.stderr ?? "").trim()}`);
  };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "a.md"), `${A_TEXT}\n`, "utf8");
  git("init", "-q", ".");
  git("add", "a.md");
  git("commit", "-q", "-m", "one");
}

function corpus(args) {
  return spawnSync(process.execPath, [CORPUS, "--no-db", ...args], { encoding: "utf8", cwd: ROOT });
}

const memory = (rel, text) => extractMarkdown(`${PREFIX}${rel}`, text).map(s => ({ ...s, project: "claude-config" }));

async function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt318-"));
  try {
    const repo = path.join(tmp, "claude-config");
    agedRepo(repo);

    // ---- A1. the stale line, and the one finding the --root-age file carries -------------------
    const stale = path.join(tmp, "stale.json");
    const a1 = corpus([`--extra-root=claude-config=${repo}`, "--root-max-age=claude-config=48", `--root-age=${stale}`]);
    assert.equal(a1.status, 0, `A1: the run itself must succeed; exit ${a1.status}, stderr ${(a1.stderr ?? "").trim().slice(0, 300)}`);
    assert.ok(a1.stdout.split("\n").includes("root-age claude-config: 72 h old -- STALE (limit 48 h)"),
      `A1: the stale line verbatim; got ${JSON.stringify(a1.stdout.split("\n").filter(l => l.startsWith("root-age")))}`);
    const f1 = JSON.parse(fs.readFileSync(stale, "utf8"));
    assert.equal(f1.found_by, "auditor:root-age", "A1: the file names its own finder");
    assert.equal(f1.findings.length, 1, `A1: exactly one finding for one stale root; got ${f1.findings.length}`);
    assert.equal(f1.findings[0].check_slug, "config-mirror-stale", "A1: the check it failed");
    assert.equal(f1.findings[0].locations[0].location, "audit-root-age/claude-config",
      "A1: the defect is the mirror, so the location is the root, not a file in it");

    // ---- A2. CONTROL: the same 72 h age under a 100 h limit is NOT a finding ------------------
    const ok = path.join(tmp, "ok.json");
    const a2 = corpus([`--extra-root=claude-config=${repo}`, "--root-max-age=claude-config=100", `--root-age=${ok}`]);
    assert.equal(a2.status, 0, `A2: the control must also run; exit ${a2.status}`);
    assert.ok(a2.stdout.split("\n").includes("root-age claude-config: 72 h old"),
      `A2: the age is still printed, with no STALE suffix; got ${JSON.stringify(a2.stdout.split("\n").filter(l => l.startsWith("root-age")))}`);
    assert.ok(!a2.stdout.includes("STALE"), "A2: a mirror inside its limit is never marked STALE");
    assert.equal(JSON.parse(fs.readFileSync(ok, "utf8")).findings.length, 0,
      "A2: and files nothing -- the suffix and the finding both track the limit, not the flag");

    // ---- A3. a limit for a label nobody passed is exit 2, never a silent non-measurement ------
    const a3 = corpus([`--extra-root=claude-config=${repo}`, "--root-max-age=nope=48"]);
    assert.equal(a3.status, 2, `A3: --root-max-age=nope=48 must exit 2; got ${a3.status}`);
    assert.match(a3.stderr, /--root-max-age=nope=48/, "A3: and the refusal quotes the spec it refused");

    // ---- A4. the unit under A1, direct: 72 floored hours, and null is not a pass --------------
    assert.equal(rootAge(repo), 72, "A4: rootAge() floors 72.5 h to 72");
    assert.equal(rootAge(path.join(tmp, "not-a-checkout")), null, "A4: git exiting non-zero is null");
    assert.ok(staleRootFinding("claude-config", null, 48), "A4: an unreadable age files, same as an over-age one");
    assert.equal(staleRootFinding("claude-config", 48, 48), null, "A4: exactly at the limit is inside it");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // ---- B1. one reserved cluster, both memory homes, routed to the config review ---------------
  const a = memory("a.md", A_TEXT);
  const b = memory("b.md", B_TEXT);
  assert.equal(a.length, 1, "B: fixture a.md is one statement as audit-corpus.js emits it");
  assert.equal(b.length, 1, "B: fixture b.md is one statement as audit-corpus.js emits it");
  assert.equal(a[0].location, `${PREFIX}a.md:1`, "B: and it is located under the memory prefix");

  const b1 = reservedClusters([...a, ...b], PREFIX, 3);
  assert.equal(b1.length, 1, `B1: the two statements are ONE cluster; got ${b1.length}`);
  assert.equal(b1[0].name, "weekly_wall", `B1: anchored on the setting both state; got ${b1[0].name}`);
  assert.equal(b1[0].kind, "reserved", `B1: and marked reserved; got ${b1[0].kind}`);
  assert.equal(b1[0].statements.length, 2, `B1: carrying both homes; got ${b1[0].statements.length}`);
  assert.deepEqual(capabilityFor(b1[0]), { capability: "audit-config-review", intent: "au-config-intent" },
    "B1: a cluster carrying a project label routes to the config review");

  // ---- B2. CONTROL: one home outside the prefix and the reservation is empty ------------------
  const outside = memory("../hooks/b.md", B_TEXT).map(s => ({ ...s, location: "claude-config:hooks/b.md:1" }));
  assert.equal(reservedClusters([...a, ...outside], PREFIX, 3).length, 0,
    "B2: with one side outside claude-config:memory/ there is no second home under the prefix, so nothing is reserved");
}

export default run;
selfRun(import.meta.url, run);
