#!/usr/bin/env node
// DeepBench v7.0.975 | scripts/commit-kickoff.js | AGT-607 -- ONE SCRIPT OWNS THE KICKOFF COMMIT,
// so step 6 stops hand-assembling the one git invocation an unattended cycle cannot be asked twice.
//
// FEATURE: AGT-607 -- `docs/runbooks/runner-cycle.md` step 6(3) said "write the returned
// `kickoff_markdown` to the returned `kickoff_path` ... and commit it", named NO script, and none
// existed: `scripts/tail-push.js` was the only committing script in the repo and it commits the
// close-out tail's two files off a detached worktree, never the session's own kickoff. So the one
// commit the whole build contract depends on was left to whatever git line the session typed.
//
// WHAT THAT COSTS, and it is the reason this is a script and not a better sentence (pattern:10 --
// after an instruction-level guard fails, go structural; pattern:9 -- never spend a model call
// where a deterministic mechanism serves):
//   * A session that assembled its own identity flags, or reached for a shell heredoc to write the
//     message, parks an unattended run on a permission prompt nobody is watching. Here the identity
//     is git's own, read from the environment, and the message always arrives as a FILE.
//   * A kickoff that is written but never committed leaves `design_status = 'designed'` pointing at
//     a path `dev` does not carry. Step 6 now pushes its own commit (THIS TICKET'S CALL (1)), so a
//     stall after step 6 cannot lose the design.
//
// WHAT IT WILL NOT DO, by construction rather than by instruction:
//   * It cannot carry a file nobody declared. After committing, `--push` re-reads
//     `git diff --name-only origin/dev HEAD` and refuses (exit 2) unless that list is a subset of
//     the declared files. A session branch carrying anything else dies here instead of on `dev`.
//     The commit is KEPT on that refusal: it is a correct commit on the wrong branch state, and
//     throwing it away would lose the design this exists to protect.
//   * It cannot be handed a message on the command line. `commit -F <file>` only, which is what
//     keeps a multi-line message out of the shell.
//   * It cannot assemble a git identity. No per-invocation identity flags, no shell, no synchronous
//     shell helper -- `spawnSync("git", [...])` and nothing else, so GIT_AUTHOR_NAME /
//     GIT_AUTHOR_EMAIL (and the COMMITTER pair) in the environment are the only identity there is.
//
// EXIT 3 IS A REPORT, NOT A WALL, the same call AGT-525 made for the tail: if the push is still
// rejected after `--retries` fetch+rebase attempts, the commit stands on the session branch and the
// caller notes `stale:` in the cycle row. The design is not lost; it is one push behind.
//
// ONE STDOUT LINE, ALWAYS, so step 6 can quote it verbatim into the cycle row:
//   `committed <sha7>: <files>` | `pushed <sha7> onto origin/dev: <files>` | `unchanged`
//   | `stale: push rejected after <n> tries`
// Exit 0 committed / pushed / unchanged; 2 usage, missing file or self-check; 3 stale. Diagnostics
// go to stderr so stdout stays that one line.
//
// USAGE (the message file is written with printf, never with a shell here-document -- a here-doc on
// the commit line is the exact shape that parks an unattended run on a permission prompt):
//   printf '%s\n' "v7.0.975 AGT-607 - one script owns the kickoff commit" > "$S/msg.txt"
//   node scripts/commit-kickoff.js --kickoff=docs/kickoffs/<f>.md --harvest=docs/harvests/<ID>.md \
//     --message-file="$S/msg.txt" --push

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const EXIT_OK = 0;
export const EXIT_USAGE = 2;
export const EXIT_STALE = 3;

export const DEFAULT_RETRIES = 3;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Pure, so the test can grade the argv contract without running git. Same shape as
// scripts/tail-push.js's parseArgs: a flag with no `=` reads as "" (present but empty), which the
// guards below reject rather than treat as a default.
export function parseArgs(argv) {
  const flag = name => {
    const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
    if (hit === undefined) return undefined;
    const eq = hit.indexOf("=");
    return eq === -1 ? "" : hit.slice(eq + 1);
  };
  const retriesRaw = flag("retries");
  const extraRaw = flag("extra");
  const retries = retriesRaw === undefined || retriesRaw === "" ? DEFAULT_RETRIES : Number(retriesRaw);
  return {
    kickoff: flag("kickoff") || "",
    harvest: flag("harvest") || "",
    extra: extraRaw === undefined || extraRaw === ""
      ? []
      : extraRaw.split(",").map(s => s.trim()).filter(Boolean),
    messageFile: flag("message-file") || "",
    push: argv.includes("--push"),
    root: path.resolve(flag("root") || REPO_ROOT),
    retries: Number.isInteger(retries) && retries >= 0 ? retries : NaN,
  };
}

// The declared file set, in the order the commit names them: the kickoff first because it is the
// build's contract, the harvest second, then whatever the step declared with --extra (step 1's
// drift finding is the live case).
export function declaredFiles({ kickoff, harvest, extra }) {
  return [kickoff, ...(harvest ? [harvest] : []), ...extra];
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
  process.stderr.write(`${message}\nusage: node scripts/commit-kickoff.js --kickoff=<path> ` +
    `[--harvest=<path>] [--extra=a,b] --message-file=<path> [--push] [--retries=${DEFAULT_RETRIES}] ` +
    `[--root=<repo>]\n  the message file is written with printf, one line, never a shell ` +
    `here-document; the identity comes from GIT_AUTHOR_NAME / GIT_AUTHOR_EMAIL in the environment\n`);
  return EXIT_USAGE;
}

export function commitKickoff(argv) {
  const args = parseArgs(argv);
  const { root, messageFile, push, retries } = args;
  if (!args.kickoff) return usage("--kickoff=<path> is required: the kickoff IS the build's contract and this commit is what puts it on dev.");
  if (!messageFile) return usage("--message-file=<path> is required: the message arrives as a file, never on the command line.");
  if (!Number.isInteger(retries)) return usage("--retries must be a non-negative integer.");
  if (!fs.existsSync(path.join(root, ".git"))) return usage(`--root=${root} is not a git repository.`);
  if (!fs.existsSync(path.resolve(root, messageFile))) {
    return usage(`--message-file=${messageFile} does not exist under ${root} -- write it with printf first.`);
  }

  const files = declaredFiles(args);
  // Every declared path must exist in the working tree before anything is committed anywhere. A
  // missing one means the step's write did not happen, and committing the rest would publish a
  // kickoff whose harvest is nowhere, or a `designed` row pointing at nothing.
  for (const f of files) {
    if (!fs.existsSync(path.join(root, f))) {
      return usage(`${f} does not exist in ${root} -- the step's write has not run.`);
    }
  }

  if (git(root, ["add", "--", ...files]).status !== 0) return EXIT_USAGE;

  // Exit 0 from `diff --cached --quiet` means nothing staged: these bytes are already committed.
  // A re-run of step 6 over an unchanged kickoff is the common case, and it is not a failure.
  if (git(root, ["diff", "--cached", "--quiet"], { quiet: true }).status === 0) {
    process.stdout.write("unchanged\n");
    return EXIT_OK;
  }

  // -F for the message and a `--` pathspec for the files: whatever else the session has staged,
  // this commit holds the declared set and nothing more.
  if (git(root, ["commit", "-q", "-F", messageFile, "--", ...files]).status !== 0) return EXIT_USAGE;
  const sha = git(root, ["rev-parse", "--short=7", "HEAD"]).stdout.trim();

  if (!push) {
    process.stdout.write(`committed ${sha}: ${files.join(", ")}\n`);
    return EXIT_OK;
  }

  if (git(root, ["fetch", "origin", "dev"]).status !== 0) return usage("could not fetch origin dev.");

  // THE SELF-CHECK. What this branch changes against origin/dev must be a subset of the declared
  // files. This is what makes "it cannot carry a session commit" structural rather than promised:
  // a branch holding an unrelated commit refuses here, with its own commit kept.
  const changed = git(root, ["diff", "--name-only", "origin/dev", "HEAD"]).stdout
    .split("\n").map(s => s.trim()).filter(Boolean);
  const extra = changed.filter(f => !files.includes(f));
  if (extra.length > 0) {
    process.stderr.write(`self-check: HEAD would carry files outside the declared set: ${extra.join(", ")}. ` +
      `The commit ${sha} is KEPT; nothing was pushed.\n`);
    return EXIT_USAGE;
  }

  const tries = Math.max(1, retries);
  for (let attempt = 1; attempt <= tries; attempt++) {
    const pushed = git(root, ["push", "origin", "HEAD:dev"], { quiet: true });
    if (pushed.status === 0) {
      const head = git(root, ["rev-parse", "--short=7", "HEAD"]).stdout.trim();
      process.stdout.write(`pushed ${head} onto origin/dev: ${files.join(", ")}\n`);
      return EXIT_OK;
    }
    process.stderr.write(`push attempt ${attempt} rejected: ${(pushed.stderr || pushed.stdout).trim()}\n`);
    if (attempt === tries) break;
    git(root, ["fetch", "origin", "dev"]);
    const rebase = git(root, ["rebase", "origin/dev"], { quiet: true });
    if (rebase.status !== 0) {
      // A conflict on the session's own branch is not something a script may resolve. Abort
      // cleanly and let the retry budget run out into the exit-3 report.
      git(root, ["rebase", "--abort"], { quiet: true });
      process.stderr.write(`rebase onto origin/dev conflicted on attempt ${attempt}; aborted.\n`);
      break;
    }
  }

  process.stdout.write(`stale: push rejected after ${tries} tries\n`);
  return EXIT_STALE;
}

const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) process.exit(commitKickoff(process.argv.slice(2)));
