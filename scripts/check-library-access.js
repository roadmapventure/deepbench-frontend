#!/usr/bin/env node
// DeepBench v7.0.260 | scripts/check-library-access.js | SE-06 -- the Librarian full-CRUD
// enforcement grep. Mechanizes ARCHITECTURE.md §19c's structural guarantee so a violation is a
// failing check rather than something a reviewer has to notice.
//
// WHAT §19c ACTUALLY GUARANTEES, and why this file enforces TWO assertions rather than the one the
// ticket's 2026-07-02 sentence names. §19c (LOCKED): "the_Library's own query/embed-and-upsert
// primitives live inside lib/librarian.js itself and are not exported for use elsewhere... No other
// agent's capability, no Trainer pipeline, no future api/ route touches the_Library directly,
// structurally, not by discipline." ARCHITECTURE.md line 1242 then AMENDS the target by name --
// "'no other file imports the_library's primitives' becomes 'no file but lib/search-harness.js' --
// same shape, one file instead of two to check against (extends SE-06's planned enforcement grep)"
// -- and .claude/rules/library-access.md carries the same sentence. So:
//
//   A. MODULE IMPORT BOUNDARY -- only the broker and Eleanor's capability dispatch path may import
//      lib/librarian.js at all.
//   B. TABLE PRIMITIVE BOUNDARY -- only lib/librarian.js and lib/search-harness.js may reach
//      the_library / match_the_library directly (PostgREST URL, .from(), or the RPC name).
//
// Enforcing A alone would pass a file that skips the broker entirely and talks to the table -- which
// is the WORSE violation of the two, and is the one that exists live today (see DECLARED_EXCEPTIONS).
//
// THE TWO LISTS ARE SEPARATE ON PURPOSE AND MUST NOT BE MERGED. BROKER_FILES is what §19c
// sanctions. DECLARED_EXCEPTIONS is known debt that predates this check -- each entry carries its
// reason and its ticket, and every one is PRINTED on every run, pass or fail. Folding an exception
// into BROKER_FILES would turn the check green in exactly the way that stops it being a check: the
// next reader could no longer tell a sanctioned broker from a thing somebody meant to fix, and the
// finding would be absorbed into the architecture instead of standing against it. Adding an entry
// to DECLARED_EXCEPTIONS is a decision about the platform's trust boundary and belongs to John, on
// a card -- it is not a way for a later session to get its own new violation past this file.
//
// SCAN SCOPE is stated rather than implied, because an unstated scope is how a grep check goes
// vacuous without anyone noticing: api/, lib/, src/, shared/, scripts/. tests/ is deliberately NOT
// scanned -- a regression test importing the broker is testing it (tests/regression/
// DAT-12-retrieval-scope.js dynamically imports queryLibrary for exactly that reason). The scanner
// walks the repo from disk, so a file created tomorrow is covered the moment it exists; the
// allowlists name PERMITTED files, never files-to-check, which is what keeps that true.
//
// THE HONEST BOUND, stated rather than left to be discovered: this is a grep, so it catches the
// LITERAL forms -- `/rest/v1/the_library`, `.from('the_library')`, `match_the_library`, and an
// import path ending `/librarian.js`. A computed table name (`.from(tbl)`) or a URL built by string
// concatenation evades it. That is not a hole to plug by making the patterns cleverer: every
// violation this boundary has actually suffered was written plainly (AA-99's direct queryLibrary()
// call in ai-enrichment.js), because nobody bypassing a broker is hiding -- they are unaware. The
// check is aimed at the mistake, not at an adversary, and a stronger claim than that would be false.
//
// Usage: node scripts/check-library-access.js [--worktree=<path>] [--json]
// Exit 0 = boundary intact (declared exceptions still printed). Exit 1 = a real violation.
// Exit 2 = the check could not run (unreadable tree) -- never treat that as a pass.

import fs from "fs";
import path from "path";

// -- The boundary, as data -------------------------------------------------------------------

// Files §19c sanctions as reaching lib/librarian.js's exports.
export const BROKER_FILES = new Set([
  // The broker itself (ARCHITECTURE.md line 1242, .claude/rules/library-access.md).
  "lib/search-harness.js",
  // Eleanor's own capability dispatch path -- the carve-out SE-06 reserved in its own text
  // ("and Eleanor's own capability dispatch path, once it exists"). It exists.
  "api/_lib/handlers/library-write.js",
  "api/_lib/handlers/library-lookup.js",
  "api/_lib/handlers/confirmation.js",
]);

// Files §19c sanctions as touching the_library's table primitives directly.
export const PRIMITIVE_FILES = new Set([
  "lib/librarian.js",
  "lib/search-harness.js",
]);

// Known debt that predates this check. NOT sanctioned -- reported on every run. Each entry must
// carry a reason and the ticket that closes it, so it can never read as an architectural decision.
export const DECLARED_EXCEPTIONS = [
  {
    file: "src/hooks/useAgents.js",
    assertion: "B",
    reason:
      "useDataSources() (MI-15) reads the_library directly from the browser with the anon key, " +
      "declaring the useLearnedContext() direct-read precedent in its own comment. Deliberate prior " +
      "work, still the shape §19c forbids. Reading the catalog through Eleanor is a change to a live " +
      "surface and is John's call, not this check's to bless.",
    ticket: "DAT-24",
  },
];

const SCAN_DIRS = ["api", "lib", "src", "shared", "scripts"];
const SCAN_EXTS = new Set([".js", ".mjs", ".jsx", ".ts", ".tsx"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".vercel", "coverage"]);

// -- Matchers --------------------------------------------------------------------------------
//
// Both matchers run per-LINE and skip comment lines. That is not tidying: this repo comments
// heavily and by NAME -- 14 files mention "librarian" in prose, and lib/vector-search.js's header
// names both broker files in one sentence. Matching those would make the check fire on every file
// that documents the boundary it is protecting, which trains people to widen the allowlist.

const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/;

// A static or dynamic import of lib/librarian.js, by any relative depth.
const IMPORT_LIBRARIAN =
  /(?:from\s*|import\s*\(\s*|require\s*\(\s*)["'][^"']*\/librarian\.js["']/;

// A direct reach at the table or its RPC: a PostgREST path, a supabase-js .from(), or the RPC name.
const DIRECT_PRIMITIVE = [
  /\/rest\/v1\/the_library\b/,
  /\.from\(\s*["'`]the_library["'`]\s*\)/,
  /\bmatch_the_library\b/,
];

function isCode(file) {
  return SCAN_EXTS.has(path.extname(file));
}

export function walk(root, dirs = SCAN_DIRS) {
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

// Scan one file's text. Returns the findings for BOTH assertions, before any allowlist is applied.
// Kept allowlist-free on purpose so a test can prove the MATCHER works independently of the
// permission model -- a scanner that finds nothing passes an allowlist test vacuously.
export function scanText(rel, text) {
  const hits = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (COMMENT_LINE.test(line)) continue;
    if (IMPORT_LIBRARIAN.test(line)) {
      hits.push({ file: rel, line: i + 1, assertion: "A", excerpt: line.trim().slice(0, 160) });
    }
    if (DIRECT_PRIMITIVE.some(rx => rx.test(line))) {
      hits.push({ file: rel, line: i + 1, assertion: "B", excerpt: line.trim().slice(0, 160) });
    }
  }
  return hits;
}

function permitted(hit) {
  // librarian.js importing itself is not a thing, but it owns its own primitives.
  if (hit.assertion === "A") return BROKER_FILES.has(hit.file) || hit.file === "lib/librarian.js";
  return PRIMITIVE_FILES.has(hit.file);
}

function declared(hit) {
  return DECLARED_EXCEPTIONS.find(e => e.file === hit.file && e.assertion === hit.assertion) || null;
}

// The whole check over a worktree. Returns { violations, exceptions, scanned } -- violations is what
// exit 1 is keyed on.
export function checkWorktree(root) {
  const files = walk(root);
  const violations = [];
  const exceptions = [];
  for (const rel of files) {
    let text;
    try {
      text = fs.readFileSync(path.join(root, rel), "utf8");
    } catch {
      continue;
    }
    for (const hit of scanText(rel, text)) {
      if (permitted(hit)) continue;
      const exc = declared(hit);
      if (exc) exceptions.push({ ...hit, reason: exc.reason, ticket: exc.ticket });
      else violations.push(hit);
    }
  }
  return { violations, exceptions, scanned: files.length };
}

// -- CLI -------------------------------------------------------------------------------------

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function main() {
  const root = path.resolve(arg("worktree", process.cwd()));
  let result;
  try {
    result = checkWorktree(root);
  } catch (err) {
    console.error(`check-library-access: could not run -- ${err.message}`);
    process.exit(2);
  }

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.violations.length ? 1 : 0);
  }

  const A = "no file outside the broker + Eleanor's dispatch path imports lib/librarian.js";
  const B = "no file outside lib/librarian.js + lib/search-harness.js touches the_library directly";

  console.log(`check-library-access: ARCHITECTURE.md §19c, ${result.scanned} code files scanned`);
  console.log(`  A. ${A}`);
  console.log(`  B. ${B}`);

  // Declared exceptions print on EVERY run, pass or fail -- the point of keeping them out of the
  // allowlists is that they stay visible rather than becoming part of the boundary.
  for (const e of result.exceptions) {
    console.log(
      `\n  known exception (assertion ${e.assertion}) -- ${e.file}:${e.line} [${e.ticket}]\n` +
      `    ${e.excerpt}\n    ${e.reason}`
    );
  }
  if (!result.exceptions.length) console.log("\n  known exceptions: none");

  if (!result.violations.length) {
    console.log("\ncheck-library-access: PASS -- the Library boundary is intact.");
    process.exit(0);
  }

  console.log(`\ncheck-library-access: FAIL -- ${result.violations.length} violation(s):`);
  for (const v of result.violations) {
    console.log(
      `  ${v.file}:${v.line} breaks assertion ${v.assertion}\n    ${v.excerpt}`
    );
  }
  console.log(
    "\nEvery read and write to the_Library goes through the broker (§19c). If this is a new\n" +
    "legitimate path, that is an architecture decision -- take it to a card, do not add the file\n" +
    "to BROKER_FILES to get green."
  );
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main();
}
