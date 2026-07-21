#!/usr/bin/env node
// DeepBench | scripts/check-model-ids.js | SES-010
//
// Mechanical sweep for STANDARDS.md Section 12: short-form Anthropic model IDs
// (claude-haiku-4-5, claude-sonnet-4-5) used as an actual model value instead of
// the canonical versioned string (claude-haiku-4-5-20251001, claude-sonnet-4-6).
// Server-side (api/, lib/) this can be a real API-call bug, not just a cosmetic
// AI Audit issue -- if the short form isn't a valid live model id, the call
// itself fails. Client-side (src/) it splits AI Audit panel rows for the same
// model, per Section 12's own stated rationale.
//
// Usage: node scripts/check-model-ids.js
// Exit code 1 if any server-side (api/, lib/) finding exists, 0 otherwise.
// Client-side findings are WARNING only (cosmetic/logging impact, not a call
// failure) and don't affect exit code.
//
// Heuristic, not a formal verifier: object-literal keys of the short form
// (e.g. MODEL_ID_NORMALIZE's `'claude-haiku-4-5': 'claude-haiku-4-5-20251001'`)
// are the *intended* legacy-normalization mechanism, not a violation -- this
// script skips those by shape (key position) rather than by file exemption, so
// a real violation added later to the same file still gets caught.

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SCAN_DIRS = ["api", "lib", "src"];
const EXCLUDE_DIR_NAMES = new Set(["node_modules", ".claude", ".git"]);
const SERVER_SIDE_DIRS = new Set(["api", "lib"]);

// Matches the short form NOT already followed by the canonical dated suffix
// (so "claude-haiku-4-5-20251001" itself never matches).
const BANNED_PATTERNS = [
  { name: "claude-haiku-4-5", re: /claude-haiku-4-5(?!-2025)/g },
  { name: "claude-sonnet-4-5", re: /claude-sonnet-4-5\b/g },
];

// An object-literal key looks like `'claude-haiku-4-5':` or `"claude-haiku-4-5":`
// at the start of the match's line (ignoring leading whitespace) -- that's the
// intended normalize/lookup-table shape, not a violation.
function isObjectKeyUsage(line, matchIndex) {
  const before = line.slice(0, matchIndex);
  if (!/^\s*["']$/.test(before)) return false;
  const after = line.slice(matchIndex);
  return /^[a-z0-9-]+["']\s*:/.test(after);
}

function walk(dir, exts) {
  let results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full, exts));
    } else if (exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function checkFile(filePath, isServerSide) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split("\n");
  const findings = [];

  lines.forEach((line, i) => {
    for (const { name, re } of BANNED_PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        if (isObjectKeyUsage(line, m.index)) continue;
        findings.push({
          severity: isServerSide ? "CRITICAL" : "WARNING",
          file: filePath,
          line: i + 1,
          detail: `"${name}" used as a value, not the canonical id -- ${line.trim().slice(0, 120)}`,
        });
      }
    }
  });

  return findings;
}

function main() {
  const findings = [];

  for (const dir of SCAN_DIRS) {
    const files = walk(path.join(ROOT, dir), [".js", ".jsx"]);
    for (const f of files) {
      findings.push(...checkFile(f, SERVER_SIDE_DIRS.has(dir)));
    }
  }

  const critical = findings.filter(f => f.severity === "CRITICAL");
  const warning = findings.filter(f => f.severity === "WARNING");

  console.log(`\nModel ID Canonicalization Sweep -- ${critical.length} CRITICAL, ${warning.length} WARNING\n`);

  if (critical.length) {
    console.log("=== CRITICAL (server-side -- api/ or lib/, may be a real API-call bug) ===");
    for (const f of critical) console.log(`  ${path.relative(ROOT, f.file)}:${f.line}: ${f.detail}`);
    console.log("");
  }
  if (warning.length) {
    console.log("=== WARNING (client-side -- src/, AI Audit panel/logging impact only) ===");
    for (const f of warning) console.log(`  ${path.relative(ROOT, f.file)}:${f.line}: ${f.detail}`);
    console.log("");
  }
  if (!critical.length && !warning.length) {
    console.log("Clean -- no short-form model ids found as values.\n");
  }

  process.exit(critical.length > 0 ? 1 : 0);
}

main();
