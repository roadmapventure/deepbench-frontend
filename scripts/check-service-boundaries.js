#!/usr/bin/env node
// DeepBench v7.0.262 | scripts/check-service-boundaries.js | SE-01 -- the service-boundary
// enforcement grep. Mechanizes the two [LOCKED] rules in ARCHITECTURE.md §5 and §6 so a violation is
// a failing check rather than something a reviewer has to notice.
//
// THE TWO ASSERTIONS, quoted from the sections they enforce:
//
//   A. §5 (LOCKED, S-PM-03-design 2026-06-22) -- "No capability route calls `/api/rag-query` via
//      internal HTTP. All RAG retrieval imports `queryRAG` from `api/lib/rag.js` directly.
//      `api/rag-query.js` remains as a thin public handler for external/frontend callers only."
//
//   B. §6 (LOCKED) -- "No AI calls in Railway. No Playwright in Vercel. This line is permanent."
//      The half enforceable from THIS repo is `no Playwright in Vercel`; see THE HALF THIS REPO
//      CANNOT CHECK below, which is a property of the repo split and is not an omission.
//
// A MENTION IS NOT A CALL, AND THIS CHECK IS WORTHLESS IF IT CANNOT TELL THEM APART. The naive
// form -- grep for "/api/rag-query" and for "playwright" -- returns FOUR hits on the clean tree this
// shipped against, and all four are legitimate: src/screens/TestTeamScreen.jsx fetches
// /api/rag-query (which is the frontend caller §5 sanctions BY NAME), scripts/
// check-ai-logging-coverage.js lists the route as a string, src/screens/FetchScreen.jsx renders the
// word "Playwright" as a UI label, and shared/ai-patterns.js describes the browser-automation
// capability in prose. A check that reports 4 violations where there are 0 gets allowlisted into
// vacuity or deleted within a week. So both matchers key on the MECHANISM, never the noun:
//
//   - A fires on an internal HTTP CALL (fetch/axios/got/request/http.request) whose URL contains
//     /api/rag-query, and ONLY inside api/ -- "capability route" is the rule's own scope.
//   - B fires on an IMPORT or REQUIRE of playwright, never on the word appearing in text.
//
// SCAN SCOPE is stated rather than implied, because an unstated scope is how a grep check goes
// vacuous without anyone noticing. Assertion A scans api/ only (the rule is about capability
// routes; src/ IS the sanctioned caller). Assertion B scans api/, lib/, src/, shared/ -- the whole
// Vercel side, since "no Playwright in Vercel" is about the deployed surface, not one directory.
// The scanner walks the repo from disk, so a file created tomorrow is covered the moment it exists;
// the allowlist names PERMITTED files, never files-to-check, which is what keeps that true.
//
// THE HALF THIS REPO CANNOT CHECK, named rather than quietly dropped: "No AI calls in Railway" is
// not enforced here. ARCHITECTURE.md §7 is explicit that Railway is a SEPARATE repo
// (roadmapventure/deepbench-backend), and a grep cannot speak about a tree it cannot read. That half
// needs a check running in the backend repo's own CI, or a cross-repo runner. Do NOT "close" it by
// asserting the absence of a directory that was never in this repo -- an assertion that cannot fail
// reads as coverage while providing none, which is strictly worse than a gap that is written down.
// This script reports the gap on every run, pass or fail, for the same reason check-library-access.js
// prints its declared exceptions: a known hole must stay visible or it becomes the architecture.
//
// THE HONEST BOUND: this is a grep. A URL built by concatenation (fetch(BASE + p)) or a dynamic
// import(pkgName) evades it. That is not a hole to plug with cleverer patterns -- every violation
// this class of boundary has actually suffered was written plainly, because nobody bypassing an
// architecture rule is hiding, they are unaware. The check is aimed at the mistake, not an adversary,
// and a stronger claim than that would be false.
//
// Usage: node scripts/check-service-boundaries.js [--worktree=<path>] [--json]
// Exit 0 = both enforceable boundaries intact. Exit 1 = a real violation.
// Exit 2 = the check could not run (unreadable tree) -- never treat that as a pass.

import fs from "fs";
import path from "path";

// -- The boundary, as data -------------------------------------------------------------------

// Assertion A: files permitted to name /api/rag-query inside api/. api/rag-query.js IS the handler
// -- it defines the route, it does not call it over HTTP.
export const RAG_ROUTE_FILES = new Set(["api/rag-query.js"]);

// Assertion B: files permitted to import Playwright on the Vercel side. Empty, deliberately, and it
// must stay that way: §6 says "No Playwright in Vercel. This line is permanent." An entry added here
// is not a fix, it is the boundary being moved -- which is John's call on a card, never a way for a
// session to get its own import past this file.
export const PLAYWRIGHT_FILES = new Set([]);

// Assertion A's scope is capability routes; assertion B's is the whole Vercel surface.
const SCAN_DIRS_A = ["api"];
const SCAN_DIRS_B = ["api", "lib", "src", "shared"];
const SCAN_EXTS = new Set([".js", ".mjs", ".jsx", ".ts", ".tsx"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".vercel", "coverage"]);

// -- Matchers --------------------------------------------------------------------------------
//
// Both matchers run per-LINE and skip comment lines. That is not tidying: this repo comments heavily
// and by name -- this very file names both /api/rag-query and playwright a dozen times above, and
// would flag itself on the first run without this guard.

const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/;

// An internal HTTP call at the RAG route. The URL may be quoted directly or reached via a template
// literal; what makes it a violation is that an HTTP verb is applied to it.
const HTTP_CALLERS = String.raw`fetch|axios(?:\.\w+)?|got(?:\.\w+)?|request|http2?\.request|superagent(?:\.\w+)?`;
const INTERNAL_RAG_HTTP = new RegExp(
  String.raw`\b(?:${HTTP_CALLERS})\s*\(\s*[^)]{0,120}?/api/rag-query`
);

// A static or dynamic import / require of playwright (incl. playwright-core, @playwright/test).
const IMPORT_PLAYWRIGHT =
  /(?:from\s*|import\s*\(\s*|require\s*\(\s*)["'](?:@playwright\/[\w-]+|playwright(?:-core)?)["']/;

function isCode(file) {
  return SCAN_EXTS.has(path.extname(file));
}

export function walk(root, dirs) {
  const out = [];
  for (const d of dirs) {
    const abs = path.join(root, d);
    if (!fs.existsSync(abs)) continue;
    const stack = [abs];
    while (stack.length) {
      const cur = stack.pop();
      for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
        if (ent.isDirectory()) {
          if (!SKIP_DIRS.has(ent.name)) stack.push(path.join(cur, ent.name));
        } else if (ent.isFile() && isCode(ent.name)) {
          out.push(path.relative(root, path.join(cur, ent.name)).split(path.sep).join("/"));
        }
      }
    }
  }
  return out.sort();
}

// Scan one file's text for ONE assertion. Returns hits before any allowlist is applied -- kept
// allowlist-free on purpose so a test can prove the MATCHER works independently of the permission
// model. A scanner that finds nothing passes an allowlist test vacuously.
export function scanText(rel, text, assertion) {
  const rx = assertion === "A" ? INTERNAL_RAG_HTTP : IMPORT_PLAYWRIGHT;
  const hits = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (COMMENT_LINE.test(line)) continue;
    if (rx.test(line)) {
      hits.push({ file: rel, line: i + 1, assertion, excerpt: line.trim().slice(0, 160) });
    }
  }
  return hits;
}

function permitted(hit) {
  return hit.assertion === "A"
    ? RAG_ROUTE_FILES.has(hit.file)
    : PLAYWRIGHT_FILES.has(hit.file);
}

// The whole check over a worktree. Returns { violations, scanned } -- violations is what exit 1 is
// keyed on.
export function checkWorktree(root) {
  const violations = [];
  let scanned = 0;
  for (const [assertion, dirs] of [["A", SCAN_DIRS_A], ["B", SCAN_DIRS_B]]) {
    const files = walk(root, dirs);
    scanned += files.length;
    for (const rel of files) {
      let text;
      try {
        text = fs.readFileSync(path.join(root, rel), "utf8");
      } catch {
        continue;
      }
      for (const hit of scanText(rel, text, assertion)) {
        if (!permitted(hit)) violations.push(hit);
      }
    }
  }
  return { violations, scanned };
}

// -- CLI -------------------------------------------------------------------------------------

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const NOT_ENFORCED_HERE =
  "no AI calls in Railway (§6) -- Railway is a separate repo " +
  "(roadmapventure/deepbench-backend, §7); a grep here cannot read that tree. Needs a check in " +
  "that repo's own CI. Tracked as SE-01's declared remainder.";

function main() {
  const root = path.resolve(arg("worktree", process.cwd()));
  let result;
  try {
    result = checkWorktree(root);
  } catch (err) {
    console.error(`check-service-boundaries: could not run -- ${err.message}`);
    process.exit(2);
  }

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ ...result, notEnforcedHere: NOT_ENFORCED_HERE }, null, 2));
    process.exit(result.violations.length ? 1 : 0);
  }

  const A = "no capability route calls /api/rag-query via internal HTTP (ARCHITECTURE.md §5)";
  const B = "no Vercel-side file imports Playwright (ARCHITECTURE.md §6)";

  console.log(`check-service-boundaries: ARCHITECTURE.md §5/§6, ${result.scanned} file scans`);
  console.log(`  A. ${A}`);
  console.log(`  B. ${B}`);
  // Printed on EVERY run, pass or fail: a known gap must stay visible or it becomes the architecture.
  console.log(`\n  not enforced here: ${NOT_ENFORCED_HERE}`);

  if (!result.violations.length) {
    console.log("\ncheck-service-boundaries: PASS -- both enforceable boundaries are intact.");
    process.exit(0);
  }

  console.log(`\ncheck-service-boundaries: FAIL -- ${result.violations.length} violation(s):`);
  for (const v of result.violations) {
    console.log(`  ${v.file}:${v.line} breaks assertion ${v.assertion}\n    ${v.excerpt}`);
  }
  console.log(
    "\nRAG retrieval imports queryRAG from api/lib/rag.js directly (§5); Playwright belongs to\n" +
    "Railway (§6). Both lines are LOCKED. If this is a new legitimate path, that is an architecture\n" +
    "decision -- take it to a card, do not add the file to an allowlist to get green."
  );
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main();
}
