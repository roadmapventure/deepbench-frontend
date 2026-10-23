#!/usr/bin/env node
// DeepBench v7.0.886 | scripts/tail-push.js | AGT-525 -- the close-out tail pushes its two files
// from a worktree off a fresh origin/dev, never the session HEAD.
//
// FEATURE: AGT-525 -- step 9's tail (runner-cycle.md tail (4)) has to get two regenerated close-out
// files onto `dev`: `docs/backlog/BACKLOG-SNAPSHOT.md` and `CLAUDE-STATE.md`. The shipped
// instruction told the tail to `git push origin HEAD:dev` from the cycle's own worktree. On a cycle
// whose build did NOT ship, that HEAD is the blocked build, and pushing it carries EVERY commit on
// the session branch onto dev behind two documentation files.
//
// THE INCIDENT IS REAL AND IT IS THIS SCRIPT'S REASON TO EXIST (premise re-measured on tree
// 9a01422 = origin/dev, 2026-10-23): cycle `6bc9245b` (v7.0.866) closed `gated_before_build` with
// `push_sha` NULL -- it never shipped anything -- yet its blocked build `022e8cde` is sitting on
// origin/dev, carried there by the tail's HEAD push. Step 7(3) forbids pushing on the Builder's
// behalf in prose, two thousand lines above the tail that does it; the prose rule already failed,
// which is why this is a script and not a stronger sentence (pattern:10 -- after an
// instruction-level guard fails, go structural).
//
// WHY A WORKTREE COPY AND NOT A CHERRY-PICK: at the moment the tail runs, the two files are
// UNCOMMITTED working-tree writes from `render-claude-state.js` / `export-backlog-snapshot.js`.
// There is no commit to pick. So: a detached worktree off a freshly fetched `origin/dev`, the two
// files copied into it from the session root's working tree, committed there, and THAT head pushed.
// The session branch is never read for its commits, never checked out, never pushed, never touched.
//
// WHAT THIS SCRIPT WILL NOT DO, by construction rather than by instruction:
//   * It cannot push a session commit. The only parent its commit can have is `origin/dev`.
//   * It cannot push a third file. After committing it re-reads `git diff --name-only origin/dev
//     HEAD` and refuses (exit 2) unless that list is a subset of `--files`. A copy step that picked
//     up something extra dies here instead of on dev.
//   * It cannot leave the tmp worktree behind: removal runs in a `finally`.
//
// EXIT 3 IS A REPORT, NOT A WALL (John's call, this ticket): if the push is still rejected after
// `--retries` fetch+rebase attempts, the snapshot stays one harvest stale -- exactly the state
// before this fix, and the next cycle's export captures the same writes. The caller notes it in the
// cycle row and closes.
//
// ONE STDOUT LINE, ALWAYS, so the tail can quote it verbatim into the cycle row:
//   `pushed <sha7> onto origin/dev: <files>` | `unchanged` | `stale: push rejected after <n> tries`
// Exit 0 pushed or unchanged; 2 usage / missing file / self-check; 3 stale. Diagnostics go to
// stderr so stdout stays that one line.

import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

export const EXIT_OK = 0;
export const EXIT_USAGE = 2;
export const EXIT_STALE = 3;

// The two close-out artifacts step 9's tail regenerates. Declared here, overridable with --files,
// and the self-check below grades the commit against whatever this ends up being.
export const DEFAULT_FILES = Object.freeze([
  "docs/backlog/BACKLOG-SNAPSHOT.md",
  "CLAUDE-STATE.md",
]);
export const DEFAULT_RETRIES = 3;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Pure, so the test can grade the argv contract without running git.
export function parseArgs(argv) {
  const flag = name => {
    const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
    if (hit === undefined) return undefined;
    const eq = hit.indexOf("=");
    return eq === -1 ? "" : hit.slice(eq + 1);
  };
  const retriesRaw = flag("retries");
  const filesRaw = flag("files");
  const retries = retriesRaw === undefined || retriesRaw === "" ? DEFAULT_RETRIES : Number(retriesRaw);
  return {
    cycleId: flag("cycle-id") || "",
    root: path.resolve(flag("root") || REPO_ROOT),
    files: filesRaw === undefined || filesRaw === ""
      ? [...DEFAULT_FILES]
      : filesRaw.split(",").map(s => s.trim()).filter(Boolean),
    retries: Number.isInteger(retries) && retries >= 0 ? retries : NaN,
  };
}

function git(cwd, args, { quiet = false } = {}) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (!quiet && (r.error || r.status !== 0)) {
    process.stderr.write(`git ${args.join(" ")} failed in ${cwd}: ${(r.stderr || r.stdout || r.error || "").toString().trim()}\n`);
  }
  return {
    status: r.error ? -1 : r.status,
    stdout: (r.stdout || "").toString(),
    stderr: (r.stderr || "").toString(),
  };
}

function usage(message) {
  process.stderr.write(`${message}\nusage: node scripts/tail-push.js --cycle-id=<id> [--root=<repo>] [--files=a,b] [--retries=${DEFAULT_RETRIES}]\n`);
  return EXIT_USAGE;
}

export function tailPush(argv) {
  const { cycleId, root, files, retries } = parseArgs(argv);
  if (!cycleId) return usage("--cycle-id=<id> is required: the commit message names the cycle that produced these writes.");
  if (!Number.isInteger(retries)) return usage("--retries must be a non-negative integer.");
  if (files.length === 0) return usage("--files resolved to nothing.");
  if (!fs.existsSync(path.join(root, ".git"))) return usage(`--root=${root} is not a git repository.`);

  // Every path must exist in the SESSION ROOT'S WORKING TREE before anything is pushed anywhere.
  // A missing one means the tail's regeneration step did not run; pushing the other file alone
  // would publish a half close-out.
  for (const f of files) {
    const src = path.join(root, f);
    if (!fs.existsSync(src)) return usage(`${f} does not exist in ${root} -- the close-out regeneration step has not run.`);
  }

  if (git(root, ["fetch", "origin", "dev"]).status !== 0) {
    return usage("could not fetch origin dev.");
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tail-push-"));
  // mkdtemp created it; `git worktree add` wants to create its own directory.
  fs.rmdirSync(tmp);
  if (git(root, ["worktree", "add", "--detach", tmp, "origin/dev"]).status !== 0) {
    return usage(`could not create a detached worktree at ${tmp} off origin/dev.`);
  }

  try {
    for (const f of files) {
      const dest = path.join(tmp, f);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(root, f), dest);
    }

    if (git(tmp, ["add", "--", ...files]).status !== 0) return EXIT_USAGE;

    // Exit 0 from `diff --cached --quiet` means nothing staged: dev already carries these bytes.
    // The common case -- John's taps moved no board row -- and it is not a failure.
    if (git(tmp, ["diff", "--cached", "--quiet"], { quiet: true }).status === 0) {
      process.stdout.write("unchanged\n");
      return EXIT_OK;
    }

    const commit = git(tmp, [
      "-c", "user.name=DeepBench Runner",
      "-c", "user.email=runner@deepbench.local",
      "commit", "-q", "-m", `close-out -- backlog snapshot + CLAUDE-STATE (cycle ${cycleId})`,
    ]);
    if (commit.status !== 0) return EXIT_USAGE;

    // THE SELF-CHECK. What this commit changes against origin/dev must be a subset of --files.
    // This is the assertion that makes "it cannot carry a session commit" structural: if anything
    // else is in the range, nothing is pushed.
    const changed = git(tmp, ["diff", "--name-only", "origin/dev", "HEAD"]).stdout
      .split("\n").map(s => s.trim()).filter(Boolean);
    const extra = changed.filter(f => !files.includes(f));
    if (extra.length > 0) {
      process.stderr.write(`self-check: the tail commit would carry files outside --files: ${extra.join(", ")}\n`);
      return EXIT_USAGE;
    }

    for (let attempt = 1; attempt <= Math.max(1, retries); attempt++) {
      const push = git(tmp, ["push", "origin", "HEAD:dev"], { quiet: true });
      if (push.status === 0) {
        const sha = git(tmp, ["rev-parse", "--short=7", "HEAD"]).stdout.trim();
        process.stdout.write(`pushed ${sha} onto origin/dev: ${files.join(", ")}\n`);
        return EXIT_OK;
      }
      process.stderr.write(`push attempt ${attempt} rejected: ${(push.stderr || push.stdout).trim()}\n`);
      if (attempt === Math.max(1, retries)) break;
      git(tmp, ["fetch", "origin", "dev"]);
      const rebase = git(tmp, ["rebase", "origin/dev"], { quiet: true });
      if (rebase.status !== 0) {
        // A conflict in two generated files is not something a script may resolve. Abort cleanly
        // and let the retry budget run out into the exit-3 report.
        git(tmp, ["rebase", "--abort"], { quiet: true });
        process.stderr.write(`rebase onto origin/dev conflicted on attempt ${attempt}; aborted.\n`);
        break;
      }
    }

    process.stdout.write(`stale: push rejected after ${Math.max(1, retries)} tries\n`);
    return EXIT_STALE;
  } finally {
    // Never leave the tail's scratch worktree registered against the session repo: a stray entry
    // breaks the next `git worktree add` and shows up in the session's own `worktree list`.
    git(root, ["worktree", "remove", "--force", tmp], { quiet: true });
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) process.exit(tailPush(process.argv.slice(2)));
