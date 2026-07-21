#!/usr/bin/env node
// DeepBench | scripts/check-kickoff-doc.js | SES-010 Tier 2
// FEATURE: SES-010 -- mechanizes STANDARDS.md Section 3's kickoff-doc section checklist
//
// Mechanizes STANDARDS.md Section 3's "11 required sections" kickoff-doc rule
// and the AI Audit wiring checklist reference -- previously a manual
// pre-issue checklist a design session had to remember to run by eye.
//
// Usage:
//   node scripts/check-kickoff-doc.js <path-to-kickoff-doc.md>
//   node scripts/check-kickoff-doc.js --latest [--worktree=<path>]   (uses git
//     log to find the most recently committed docs/kickoffs/*.md file --
//     see the comment on findLatestKickoff() for why this can't just be
//     "sort by mtime". --worktree defaults to process.cwd() -- pass it
//     explicitly when running from outside the target worktree, same
//     cwd-sensitivity gap noted in SES-010 for the other check-*.js scripts.)
//
// Exit code 1 if any of the 11 sections is missing, 0 otherwise.

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const REQUIRED_SECTIONS = [
  "1. SESSION",
  "2. CONTEXT",
  "3. AI PATTERN CHECK",
  "4. STUB DEFINITIONS",
  "5. TASKS",
  "6. DESIGN RULES",
  "7. SCOPE RULES",
  "8. NODE.JS TEST",
  "9. CLAUDE CODE VERIFICATION CHECKLIST",
  "10. COMMIT INSTRUCTION",
  "11. MANUAL QA CHECKLIST",
];

// A freshly-created worktree checks out every file at once, so mtime is
// meaningless for "most recent" there (same gap session-hygiene's check 4
// already documents) -- use git history instead.
function findLatestKickoff(root) {
  let out;
  try {
    out = execFileSync("git", ["-C", root, "log", "--oneline", "--name-only", "-20", "--", "docs/kickoffs"], { encoding: "utf8" });
  } catch {
    return null;
  }
  const match = out.split("\n").find(l => l.startsWith("docs/kickoffs/") && l.endsWith(".md"));
  return match ? path.join(root, match) : null;
}

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function main() {
  const mode = process.argv[2];
  let target;

  if (mode === "--latest") {
    const worktree = arg("worktree", process.cwd());
    target = findLatestKickoff(worktree);
    if (!target) {
      console.log("check-kickoff-doc: could not find a recent docs/kickoffs/*.md via git log -- pass an explicit path instead.");
      process.exit(0);
    }
  } else if (mode) {
    target = mode;
  } else {
    console.log("Usage: node scripts/check-kickoff-doc.js <path-to-kickoff-doc.md> | --latest");
    process.exit(0);
  }

  let text;
  try {
    text = fs.readFileSync(target, "utf8");
  } catch (e) {
    console.log(`check-kickoff-doc: could not read ${target}: ${e.message}`);
    process.exit(0);
  }

  const missing = REQUIRED_SECTIONS.filter(s => !text.includes(`## ${s}`));

  console.log(`\nKickoff Doc Section Check -- ${path.basename(target)}\n`);
  if (missing.length) {
    console.log(`MISSING ${missing.length}/11 required sections:`);
    for (const s of missing) console.log(`  - ## ${s}`);
  } else {
    console.log("All 11 required sections present.");
  }

  // Soft check, not a hard fail: STANDARDS.md's "standing rules by reference"
  // rule says an N/A AI Pattern Check should be one line, not a paragraph --
  // flag a long Section 3 as boilerplate creeping back in, same spirit as
  // session-hygiene's existing check 4.
  const aiPatternMatch = text.match(/## 3\. AI PATTERN CHECK\n+([\s\S]*?)\n+---/);
  if (aiPatternMatch) {
    const body = aiPatternMatch[1].trim();
    if (/^\*\*N\/A\*\*/.test(body) && body.length > 300) {
      console.log(`\nNOTE: Section 3 (AI PATTERN CHECK) is N/A but ${body.length} chars long -- STANDARDS.md's "standing rules by reference" rule expects a one-line N/A, not a justifying paragraph. Not a failure, just a drift signal.`);
    }
  }

  process.exit(missing.length > 0 ? 1 : 0);
}

main();
