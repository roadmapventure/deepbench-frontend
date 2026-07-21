#!/usr/bin/env node
// DeepBench | scripts/check-version-headers.js | SES-010 Tier 2
// FEATURE: SES-010 -- mechanizes STANDARDS.md Section 1/3's version-header and FEATURE-comment rules
//
// Mechanizes STANDARDS.md Section 1's version-header rule ("line 1 of every
// .jsx and .js file touched") and Section 3's FEATURE comment requirement.
// Checks only files actually changed relative to origin/dev, not the whole
// repo -- most of the codebase predates this convention or was never
// touched in a session that added a FEATURE comment, so a whole-repo sweep
// would be mostly noise. This is meant to run as part of a session's own
// pre-commit checklist (STANDARDS.md Section 5's "Always Required" list),
// not as a standing repo-wide audit.
//
// Usage: node scripts/check-version-headers.js [--worktree=<path>] [--base=origin/dev]
// Exit code 1 if any changed .js/.jsx file is missing a version header line 1
// or has zero FEATURE comments anywhere in the diff, 0 otherwise.

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const WORKTREE = arg("worktree", process.cwd());
const BASE = arg("base", "origin/dev");

// Diffing straight against BASE's current tip (`git diff BASE`) picks up
// every file that differs between the working tree and wherever BASE
// happens to be *right now* -- under 5-7 concurrent sessions, BASE moves
// constantly, so this would include other sessions' already-merged changes
// that landed on origin/dev after this worktree branched, not just this
// session's own edits. Diffing against the merge-base commit instead isolates
// exactly what this branch/working-tree has changed since it diverged --
// found live while testing this script: a raw `git diff origin/dev` call
// flagged 2 unrelated files (api/_lib/handlers/confirmation.js,
// api/capabilities/execute.js) that another concurrent session had pushed,
// which this session never touched.
function changedJsFiles() {
  let mergeBase;
  try {
    mergeBase = execFileSync("git", ["-C", WORKTREE, "merge-base", BASE, "HEAD"], { encoding: "utf8" }).trim();
  } catch (e) {
    return { error: `could not compute merge-base against ${BASE}: ${e.message}` };
  }
  let out;
  try {
    out = execFileSync("git", ["-C", WORKTREE, "diff", "--name-only", "--diff-filter=ACM", mergeBase], { encoding: "utf8" });
  } catch (e) {
    return { error: e.message };
  }
  return { files: out.split("\n").filter(f => /\.(js|jsx)$/.test(f)) };
}

// Two accepted header shapes, both established convention (confirmed by
// reading scripts/check-ai-logging-coverage.js and this session's own
// scripts/check-*.js files): "// DeepBench vX.X.X | filename | ..." for
// src/api files that ship as part of a versioned deploy, or the unversioned
// "// DeepBench | filename | ..." for scripts/ tooling, which isn't part of
// the deployed app version. Line 1, or line 1 after a shebang for scripts/
// files that start with #!/usr/bin/env node.
const VERSION_HEADER_RE = /^\/\/\s*DeepBench\s+(v\d+\.\d+\.\d+\s*)?\|/;

function checkFile(findings, relPath) {
  const full = path.join(WORKTREE, relPath);
  let text;
  try {
    text = fs.readFileSync(full, "utf8");
  } catch {
    return; // deleted file, nothing to check
  }
  const lines = text.split("\n");
  const firstRealLine = lines[0].startsWith("#!") ? (lines[1] || "") : lines[0];

  if (!VERSION_HEADER_RE.test(firstRealLine)) {
    findings.push({ severity: "FLAG", detail: `${relPath}: missing version header on line 1 (expected "// DeepBench vX.X.X | ${path.basename(relPath)} | ...")` });
  }

  if (!/FEATURE:/.test(text)) {
    findings.push({ severity: "FLAG", detail: `${relPath}: zero "FEATURE: <ID>" comments found anywhere in the file` });
  }
}

function main() {
  const { files, error } = changedJsFiles();
  if (error) {
    console.log(`check-version-headers: could not diff against ${BASE}: ${error}`);
    process.exit(0);
  }
  if (!files.length) {
    console.log(`check-version-headers: no changed .js/.jsx files relative to ${BASE}.`);
    process.exit(0);
  }

  const findings = [];
  for (const f of files) checkFile(findings, f);

  console.log(`\nVersion Header / FEATURE Comment Check -- ${files.length} changed file(s) vs ${BASE}\n`);
  if (findings.length) {
    for (const f of findings) console.log(`  [FLAG] ${f.detail}`);
  } else {
    console.log("All changed files have a version header and at least one FEATURE comment.");
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

main();
