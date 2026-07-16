#!/usr/bin/env node
// DeepBench | scripts/check-ai-logging-coverage.js | LOG-08
//
// Mechanical sweep for AI-logging coverage gaps. Statically scans api/, lib/,
// and src/ for real LLM/embedding API call sites and flags any that lack a
// corresponding logActivity()/logAICall() write. Built after a day of
// rediscovering the same class of gap one file at a time (LOG-02 through
// LOG-07) -- this exists so that doesn't have to happen again as a fresh
// investigation every time.
//
// Usage: node scripts/check-ai-logging-coverage.js
// Exit code 1 if any CRITICAL finding exists, 0 otherwise.
//
// This is a heuristic static-analysis tool, not a formal verifier -- it counts
// occurrences and flags mismatches for human review. It cannot trace exact
// per-branch gating logic (a conditional log call correctly corresponding to
// one specific real call among several in the same file reads as a WARNING
// here, not a pass -- a human confirms it, the tool only narrows where to look).
// CRITICAL findings (zero logging attempt at all, or a logging call with no
// backing import) are unambiguous and don't need that judgment call.

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const SERVER_DIRS = ["api", "lib"];
const CLIENT_DIR = "src";
const EXCLUDE_DIR_NAMES = new Set(["node_modules", ".claude", ".git"]);

// FEATURE: LOG-08 fix -- "embedContent(" added after live verification found the original
// two-marker list missed every embedding call site that goes through lib/vector-search.js's
// shared embedContent() wrapper instead of a literal fetch() URL in the caller's own file
// (lib/search-harness.js, api/web-memory.js). Without it, search-harness.js's real embedding
// call was invisible to this script entirely (0 real markers -> no finding), and web-memory.js's
// 1-real-marker/1-log-call count coincidentally looked "covered" even though the one logged call
// was the embedding, not the actually-unlogged direct Anthropic learning call on the same file.
const REAL_CALL_MARKERS = ["api.anthropic.com", "api.openai.com", "embedContent("];
const CLIENT_AI_ROUTES = [
  "/api/brief", "/api/plan", "/api/web-memory", "/api/rag-query", "/api/load-entries",
];

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

function countOccurrences(text, needle) {
  if (!needle) return 0;
  return text.split(needle).length - 1;
}

function checkServerFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const realCallCount = REAL_CALL_MARKERS.reduce((sum, m) => sum + countOccurrences(text, m), 0);
  if (realCallCount === 0) return null;

  const logCount = countOccurrences(text, "logActivity(");
  const importsLogActivity = /import\s*\{[^}]*logActivity[^}]*\}\s*from/.test(text);

  if (!importsLogActivity || logCount === 0) {
    return { severity: "CRITICAL", file: filePath, detail: `${realCallCount} real external call marker(s), zero logActivity import/call` };
  }
  if (logCount < realCallCount) {
    return { severity: "WARNING", file: filePath, detail: `${realCallCount} real external call marker(s) but only ${logCount} logActivity() call(s) -- review for an unlogged branch` };
  }
  return null;
}

function checkClientFile(filePath) {
  const rawText = fs.readFileSync(filePath, "utf8");
  // Strip // line comments and the function's own definition signature before counting --
  // a file that defines logAICall (or only mentions it in a comment) isn't "calling it
  // with no import," and would otherwise self-flag as a permanent false positive
  // (found live 2026-07-16 on src/hooks/useAIActivity.js, the file that defines it).
  const text = rawText
    .split("\n")
    .filter(line => !line.trim().startsWith("//"))
    .join("\n")
    .replace(/export\s+function\s+logAICall\s*\(/g, "");
  const importsLogAICall = /import\s*\{[^}]*logAICall[^}]*\}\s*from/.test(text);
  const logCallCount = countOccurrences(text, "logAICall(");

  const findings = [];

  if (logCallCount > 0 && !importsLogAICall) {
    findings.push({ severity: "CRITICAL", file: filePath, detail: `calls logAICall (${logCallCount}x) with no import -- undefined-reference crash risk` });
  }
  if (importsLogAICall && logCallCount === 0) {
    findings.push({ severity: "CRITICAL", file: filePath, detail: `imports logAICall but never calls it -- dead import, likely means a real call site nearby is unlogged` });
  }

  const routeHits = CLIENT_AI_ROUTES.filter(r => text.includes(`"${r}"`) || text.includes(`'${r}'`));
  if (routeHits.length > 0 && logCallCount === 0) {
    findings.push({ severity: "WARNING", file: filePath, detail: `calls ${routeHits.join(", ")} (a real AI route) with zero logAICall() anywhere in this file -- confirm whether that route is already fully server-logged before treating as a gap` });
  }

  return findings;
}

function main() {
  const findings = [];

  for (const dir of SERVER_DIRS) {
    const files = walk(path.join(ROOT, dir), [".js"]);
    for (const f of files) {
      const result = checkServerFile(f);
      if (result) findings.push(result);
    }
  }

  const clientFiles = walk(path.join(ROOT, CLIENT_DIR), [".js", ".jsx"]);
  for (const f of clientFiles) {
    findings.push(...checkClientFile(f));
  }

  const critical = findings.filter(f => f.severity === "CRITICAL");
  const warning = findings.filter(f => f.severity === "WARNING");

  console.log(`\nAI Logging Coverage Sweep -- ${critical.length} CRITICAL, ${warning.length} WARNING\n`);

  if (critical.length) {
    console.log("=== CRITICAL (zero logging attempt / crash risk) ===");
    for (const f of critical) console.log(`  ${path.relative(ROOT, f.file)}: ${f.detail}`);
    console.log("");
  }
  if (warning.length) {
    console.log("=== WARNING (needs human review) ===");
    for (const f of warning) console.log(`  ${path.relative(ROOT, f.file)}: ${f.detail}`);
    console.log("");
  }
  if (!critical.length && !warning.length) {
    console.log("Clean -- no gaps found.\n");
  }

  process.exit(critical.length > 0 ? 1 : 0);
}

main();
