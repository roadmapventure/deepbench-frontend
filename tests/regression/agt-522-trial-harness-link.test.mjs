// DeepBench v7.0.1060 | tests/regression/agt-522-trial-harness-link.test.mjs | AGT-522 -- a build replay is scored on what the candidate changed, never on the node_modules link the harness itself made.
//
// FEATURE: AGT-522 -- changedFiles() subtracts the harness's own link from a replay's changed set.
//
// WHAT WAS WRONG, MEASURED. Every build replay links node_modules into its scratch worktree
// (scripts/model-trial.js replayBuild()). `.gitignore` line 1 is `node_modules/` -- a
// DIRECTORY-ONLY pattern, which does not match a symlink -- so `git status --porcelain` reports
// `?? node_modules`, the link lands in the replay's changed set, and scoreBuild() returns
// `outside-kickoff: node_modules` for every candidate. A cheaper candidate needs 3 of 3 passing,
// so none could ever pass: keep decision 0fa3a85f, model-watch report 6ffa0c84 (2026-11-06).
//
// WHY THE LINK IS DROPPED BY EXACT NAME AND NOT BY AN IGNORE FILE: a linked worktree shares the
// clone's ignore file, so there is no ignore line this harness could add that the candidate's own
// tree would not also inherit. HARNESS_LINK names the one path the harness itself creates.
//
// NO LIVE WRITE, NO MODEL CALL, NO CREDENTIALS (pattern:76). Every arm drives the real exported
// changedFiles() and the real exported scoreBuild() over a throwaway git repository under
// os.tmpdir(), built and torn down by this test. Running the real trial would spend a `claude -p`
// replay, which is the thing the ticket is about; the seam is proved instead at the boundary that
// was broken -- a working tree that holds BOTH a candidate's edits and the harness's link.
//
// ARMS, each discriminating (docs/STANDARDS.md Section 4, the LOO-013 lesson -- assert WHICH
// branch fired, and print what was actually got):
//   P  PREMISE: the defect is reproduced here, not assumed -- `git status --porcelain` on the
//      scratch repo really does report `?? node_modules` despite `.gitignore` = `node_modules/`.
//      If this arm ever fails, the premise is dead and the fix below is guarding nothing.
//   A  changedFiles() over that tree is the candidate's two files ALONE. CONTROL: with S2's
//      `.filter(p => p !== HARNESS_LINK)` removed this arm fails and prints
//      `got ["node_modules","scripts/a.js","scripts/b.js"]` -- the live defect, in the message.
//   B  THE CONSEQUENCE, both directions: scoreBuild() over A's list is `build-within-kickoff`,
//      and the SAME list plus "node_modules" is `outside-kickoff: node_modules`. The second half
//      is the control -- it proves the scorer still rejects a genuinely-outside path, so arm B's
//      green means the link was subtracted rather than that scoreBuild() stopped checking.
//   C  COMMITTED, NOT JUST LOOSE: after the candidate commits, changedFiles() reads the same two
//      files. The diff-vs-base view and the --porcelain view are unioned, and the link must be
//      subtracted from the union, not from one half of it.
//
// BASELINE: ABSENT pre-build -- on the unchanged tree scripts/model-trial.js exports no
// changedFiles and no HARNESS_LINK, so this file cannot even import.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { selfRun } from "./_lib/self-run.js";

import { changedFiles, scoreBuild } from "../../scripts/model-trial.js";

// The candidate's own two files -- what a correctly-scored replay changed.
const CANDIDATE_FILES = ["scripts/a.js", "scripts/b.js"];

// A minimal kickoff whose section 4 names exactly the two paths the replay changed, so
// kickoffFiles() has a real named set to score against. Three lines, same shape scoreBuild() reads.
const KICKOFF = [
  "## 4. STUB",
  CANDIDATE_FILES.map(p => `\`${p}\``).join(" "),
  "## 6. QA",
].join("\n");

const ENVELOPE = { result: '{"ok":true}' };
const REQUIRED = ["ok"];

async function run() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "agt522-repo-"));
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "agt522-target-"));

  // Every git call is identity-pinned and signing-free, so the arm's result cannot depend on
  // whoever's global git config the runner happens to carry.
  const git = (...args) => spawnSync("git", [
    "-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args,
  ], { encoding: "utf8" });

  try {
    // --- setup: a base commit that already ignores node_modules/ the way the real clone does ---
    git("init", "-q");
    fs.writeFileSync(path.join(repo, ".gitignore"), "node_modules/\n", "utf8");
    fs.mkdirSync(path.join(repo, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(repo, "scripts", "a.js"), "1\n", "utf8");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    const base = String(git("rev-parse", "HEAD").stdout ?? "").trim();
    assert.match(base, /^[0-9a-f]{40}$/, `setup: base is not a sha -- got ${JSON.stringify(base)}`);

    // --- the replay: the harness links node_modules in; the candidate edits one file and adds one ---
    fs.symlinkSync(target, path.join(repo, "node_modules"), "junction");
    fs.writeFileSync(path.join(repo, "scripts", "a.js"), "2\n", "utf8");
    fs.writeFileSync(path.join(repo, "scripts", "b.js"), "1\n", "utf8");

    const ARMS = {
      P: () => {
        const porcelain = String(git("status", "--porcelain").stdout ?? "");
        assert.match(
          porcelain, /^\?\? node_modules$/m,
          "PREMISE DEAD: `node_modules/` in .gitignore now matches the link, so git no longer "
          + `reports it untracked. The fix guards nothing. got:\n${porcelain}`,
        );
      },

      A: () => {
        const got = changedFiles(repo, base);
        assert.deepStrictEqual(
          got, CANDIDATE_FILES,
          `got ${JSON.stringify(got)}, want ${JSON.stringify(CANDIDATE_FILES)}`,
        );
      },

      B: () => {
        const clean = scoreBuild({
          envelope: ENVELOPE, required: REQUIRED,
          changed: changedFiles(repo, base), kickoff: KICKOFF, dryRunExit: 0,
        });
        assert.deepStrictEqual(
          clean, { passed: true, why: "build-within-kickoff" },
          `a subtracted set must score build-within-kickoff -- got ${JSON.stringify(clean)}`,
        );
        // CONTROL: the scorer still rejects a path that is genuinely outside the named set.
        const dirty = scoreBuild({
          envelope: ENVELOPE, required: REQUIRED,
          changed: [...CANDIDATE_FILES, "node_modules"], kickoff: KICKOFF, dryRunExit: 0,
        });
        assert.strictEqual(
          dirty.why, "outside-kickoff: node_modules",
          `the scorer must still reject an outside path by name -- got ${JSON.stringify(dirty)}`,
        );
      },

      C: () => {
        git("add", "-A");
        git("commit", "-q", "-m", "all");
        const got = changedFiles(repo, base);
        assert.deepStrictEqual(
          got, CANDIDATE_FILES,
          `after the candidate commits: got ${JSON.stringify(got)}, `
          + `want ${JSON.stringify(CANDIDATE_FILES)}`,
        );
      },
    };

    const passed = [], failed = [];
    for (const [name, fn] of Object.entries(ARMS)) {
      try { await fn(); passed.push(name); }
      catch (e) { failed.push(`${name}: ${e.message.split("\n")[0]}`); }
    }
    console.log(`  [AGT-522] ${passed.length} of ${Object.keys(ARMS).length} arms passed: ${passed.join(",") || "none"}`);
    if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
    return passed;
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  }
}

export default run;
selfRun(import.meta.url, run);
