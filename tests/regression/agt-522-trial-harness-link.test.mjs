// DeepBench v7.0.987 | tests/regression/agt-522-trial-harness-link.test.mjs | AGT-522 -- a build
// replay's changed set excludes the `node_modules` link the HARNESS itself made, so a candidate is
// never failed `outside-kickoff: node_modules` for the trial runner's own setup step.
//
// WHY THIS IS NOT A ONE-LINE FILTER TEST. `.gitignore` line 1 is `node_modules/` -- a
// directory-only pattern that does not match a SYMLINK -- so the link the replay creates lands in
// `git status --porcelain` as `?? node_modules`, inside the changed set, and `scoreBuild()` returns
// `outside-kickoff: node_modules` for EVERY candidate on EVERY build replay. That is why clause P
// asserts the link is actually visible to git first: with an ignore file that did swallow it, every
// assertion below would pass vacuously and pin nothing (docs/STANDARDS.md Section 4, LOO-013 --
// assert which branch fired). The fix is by exact name in the changed set, never a new ignore rule,
// because a linked worktree shares the clone's ignore file.
//
// REAL GIT, NO FIXTURE STRINGS. The whole defect lives in how git REPORTS a symlink, so a stubbed
// `--porcelain` string would be the author's belief about git rather than git. Two temp dirs under
// os.tmpdir() (the repo, and the link's target), both removed in a `finally`.
//
// OFFLINE AND READ-ONLY: no credentials, no database, no model call, no network. Nothing outside
// its two temp dirs is written.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { selfRun } from "./_lib/self-run.js";
import { changedFiles, scoreBuild } from "../../scripts/model-trial.js";

// The two paths the candidate really edited -- the only thing a replay of this shape changed.
const EDITED = ["scripts/a.js", "scripts/b.js"];

// A kickoff is read for its §4-through-§5 window only (kickoffFiles()), so the fixture is the
// smallest text that window accepts: the two paths in backticks between the two headings.
const KICKOFF = ["## 4. STUB", "`scripts/a.js` `scripts/b.js`", "## 6. QA"].join("\n");

async function run() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "agt522-repo-"));
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "agt522-target-"));
  try {
    const git = (...args) => spawnSync("git", [
      "-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args,
    ], { encoding: "utf8" });

    // --- the tree the real Builder started from ------------------------------------------------
    git("init", "-q");
    fs.writeFileSync(path.join(repo, ".gitignore"), "node_modules/\n", "utf8");
    fs.mkdirSync(path.join(repo, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(repo, "scripts", "a.js"), "1\n", "utf8");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    const base = git("rev-parse", "HEAD").stdout.trim();
    assert.match(base, /^[0-9a-f]{40}$/, `base is not a commit sha: ${JSON.stringify(base)}`);

    // --- what the replay does (the link) and what the candidate does (the two files) -----------
    fs.symlinkSync(target, path.join(repo, "node_modules"), "junction");
    fs.writeFileSync(path.join(repo, "scripts", "a.js"), "2\n", "utf8");
    fs.writeFileSync(path.join(repo, "scripts", "b.js"), "1\n", "utf8");

    // P -- PREMISE. git really does report the link as an untracked path. Every clause below is
    // vacuous without this: if the ignore file swallowed the link there would be nothing to filter.
    const porcelain = git("status", "--porcelain").stdout;
    assert.match(porcelain, /^\?\? node_modules$/m,
      `P: git does not report the link as untracked, so nothing below discriminates. ` +
      `--porcelain was:\n${porcelain}`);

    // A -- the uncommitted shape: the harness's link is gone, the candidate's two files remain.
    const loose = changedFiles(repo, base);
    assert.deepStrictEqual(loose, EDITED, `A: got ${JSON.stringify(loose)}`);

    // B -- the consequence that is the whole ticket: this list scores as a pass, and the SAME list
    // with the link still in it scores `outside-kickoff: node_modules`. Asserting only the pass
    // would go green under a scoreBuild() that stopped checking scope at all.
    const score = of => scoreBuild({
      envelope: { result: '{"ok":true}' }, required: ["ok"], changed: of, kickoff: KICKOFF, dryRunExit: 0,
    });
    const clean = score(loose);
    assert.deepStrictEqual(clean, { passed: true, why: "build-within-kickoff" },
      `B: the filtered list does not score a pass: ${JSON.stringify(clean)}`);
    const withLink = score([...loose, "node_modules"]);
    assert.strictEqual(withLink.why, "outside-kickoff: node_modules",
      `B: the unfiltered list must still name the link: ${JSON.stringify(withLink)}`);

    // C -- the committed shape. `node_modules/` does not match the symlink, so `add -A` STAGES the
    // link and it reaches `diff --name-only <base>` as well; a filter that only cleaned the
    // porcelain half would pass A and B and fail here, which is why C exists.
    git("add", "-A");
    git("commit", "-q", "-m", "all");
    const committed = changedFiles(repo, base);
    assert.deepStrictEqual(committed, EDITED, `C: got ${JSON.stringify(committed)}`);

    console.log("[AGT-522] (P) git reports the harness link as `?? node_modules`, so the filter has " +
      `something to remove; (A) loose changed set is ${JSON.stringify(loose)}; (B) that list scores ` +
      "{passed:true, why:'build-within-kickoff'} and the same list plus the link still scores " +
      `'outside-kickoff: node_modules'; (C) after add -A + commit the set is still ` +
      `${JSON.stringify(committed)} -- both the diff and the porcelain half are covered.`);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  }
}

export default run;
selfRun(import.meta.url, run);
