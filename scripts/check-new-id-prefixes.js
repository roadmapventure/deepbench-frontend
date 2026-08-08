#!/usr/bin/env node
// DeepBench | scripts/check-new-id-prefixes.js | SES-010 Tier 2
// FEATURE: SES-010 -- mechanizes CLAUDE-DESIGN.md's new-ID prefix rule (docs/SCREEN-INVENTORY.md)
//
// CLAUDE-DESIGN.md: "check docs/SCREEN-INVENTORY.md's taxonomy for the correct
// prefix -- do not default to an old [AREA]-[NUMBER] prefix by pattern-
// matching nearby rows, even ones logged recently." Checks only NEWLY ADDED
// rows (diffed against a base ref, same merge-base approach as
// check-version-headers.js) -- the ~250 existing legacy-prefixed rows are
// frozen and correct as-is; this only catches a *new* row using a legacy
// prefix by habit/pattern-matching.
//
// ACTIVE_PREFIXES is the confirmed set from docs/SCREEN-INVENTORY.md's
// "Platform Layers" table (HAR/SCA/LOO/LOG/MCP/MKT/DAT/AGT/SES/MOB) plus
// Screen codes actually observed in its own "Applied" mapping table (CHI,
// PRO) -- deliberately NOT a guess at every possible Screen code (Home,
// Bench, Spend Analysis, etc. don't have a clearly-established prefix in the
// doc yet). Anything outside this list is flagged for a human to check
// against the doc directly, not asserted as definitely wrong -- some legacy
// prefixes (AA, MI, AI, TI, AZ, ...) are legitimately frozen and this script
// can't tell "a new row correctly using a still-open Screen code not on this
// list yet" from "a new row incorrectly defaulting to a legacy prefix"
// without a human reading the actual taxonomy doc.
//
// Usage: node scripts/check-new-id-prefixes.js [--worktree=<path>] [--base=origin/dev]
// Exit code 1 if any newly-added row uses a prefix outside ACTIVE_PREFIXES, 0 otherwise.

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const ACTIVE_PREFIXES = new Set(["HAR", "SCA", "LOO", "LOG", "MCP", "MKT", "DAT", "AGT", "SES", "MOB", "CHI", "PRO"]);
const FEATURE_FILES = ["docs/FEATURES.md", "docs/FEATURES-NEXT.md", "docs/FEATURES-LATER.md"];

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const WORKTREE = arg("worktree", process.cwd());
const BASE = arg("base", "origin/dev");

// Same merge-base fix as check-version-headers.js: diffing against BASE's
// live tip picks up concurrent sessions' already-merged changes, not just
// this session's own additions.
function addedRows(relPath) {
  let mergeBase;
  try {
    mergeBase = execFileSync("git", ["-C", WORKTREE, "merge-base", BASE, "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return { error: `could not compute merge-base against ${BASE}` };
  }
  let diff;
  try {
    diff = execFileSync("git", ["-C", WORKTREE, "diff", "-U0", mergeBase, "--", relPath], { encoding: "utf8" });
  } catch {
    return { rows: [] }; // file untouched or doesn't exist at mergeBase -- nothing added
  }
  const rows = [];
  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const idMatch = line.match(/^\+\|\s*([A-Z]{2,4})-[0-9]+[a-z]?\b/);
    if (idMatch) rows.push({ prefix: idMatch[1], line: line.slice(1).trim() });
  }
  return { rows };
}

function main() {
  const findings = [];
  for (const relPath of FEATURE_FILES) {
    const { rows, error } = addedRows(relPath);
    if (error) {
      console.log(`check-new-id-prefixes: ${error}`);
      continue;
    }
    for (const { prefix, line } of rows) {
      if (!ACTIVE_PREFIXES.has(prefix)) {
        findings.push(`${relPath}: new row uses prefix "${prefix}" -- not in the confirmed active taxonomy (${[...ACTIVE_PREFIXES].join("/")}). Check docs/SCREEN-INVENTORY.md before assuming this is correct: ${line.slice(0, 100)}...`);
      }
    }
  }

  console.log(`\nNew-ID Prefix Check (vs ${BASE})\n`);
  if (findings.length) {
    for (const f of findings) console.log(`  [FLAG] ${f}`);
  } else {
    console.log("No newly-added rows use a prefix outside the confirmed active taxonomy.");
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

main();
