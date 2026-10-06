#!/usr/bin/env node
// DeepBench v7.0.793 | scripts/related-tests.js | AGT-391 -- the regression tests a change can break.
//
// WHY. A build ran the whole suite (~388 files, ~20 min) to grade a change that touched a handful of
// files, and graded it against a full-suite baseline that had to be captured on the unchanged tree
// first. A build now runs only its RELATED set -- the tests that can see the files it changed -- and
// is graded against the kickoff's BASELINE block (scripts/verifier.js readKickoffBaseline()). The full
// suite still runs: weekly in the Auditor routine and before every production release
// (docs/runbooks/release-to-main.md), where each red becomes a finding (scripts/audit-suite-reds.js).
//
// THE RULE, deterministic and textual (pattern:9 -- no model call where a mechanism serves). Over
// tests/regression/*.{js,mjs}, minus run-all.js and `_`-prefixed helpers, with comment lines (a line
// whose first non-blank characters are `//`, `*` or `/*`) stripped first, a test is related to a
// touched path when
//   1. one of its `./` / `../` import specifiers resolves to that path, or
//   2. the path, or its basename, appears as a WHOLE quoted string ("…", '…' or `…`) -- which is how
//      a test that reads a file names it, including `path.join(ROOT, "scripts", "x.js")`.
// Touched tests are related to themselves, and `--include=<csv>` adds tests by name.
//
// Usage:
//   node scripts/related-tests.js --files=<csv of repo paths>
//   node scripts/related-tests.js --files-from=<file: JSON array, or one path per line>
//   node scripts/related-tests.js --diff=<ref>   # git diff --name-only <ref> + untracked files
//   [--include=<csv of test names>] [--root=<repo root>] [--json]
// Prints the related test basenames as one sorted csv line (the shape run-all.js --only takes), or
// with --json one object {count, related, touched}. Exit 2: no source flag, an unreadable list, a
// failed git call, or a --files / --include path that does not exist.

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = "tests/regression";

function arg(argv, name) {
  const prefix = `--${name}=`;
  const hit = argv.find(a => a.startsWith(prefix));
  return hit === undefined ? undefined : hit.slice(prefix.length);
}

const norm = p => String(p).trim().replace(/\\/g, "/").replace(/^\.\//, "");
const csv = s => String(s ?? "").split(",").map(norm).filter(Boolean);

export function isTestFile(name) {
  return (name.endsWith(".js") || name.endsWith(".mjs")) && name !== "run-all.js" && !name.startsWith("_");
}

// Comment lines go first, so a test that only MENTIONS a file in its header is not related to it.
export function stripCommentLines(src) {
  return String(src).split(/\r?\n/).filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
}

const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'`])(\.{1,2}\/[^"'`]+)\1/g;
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Pure: is the test at `testRel` (repo-relative), whose source is `src`, related to `touchedRel`?
export function relatesTo(testRel, src, touchedRel) {
  const body = stripCommentLines(src);
  const dir = path.posix.dirname(testRel);
  for (const m of body.matchAll(IMPORT_RE)) {
    if (path.posix.normalize(path.posix.join(dir, m[2])) === touchedRel) return true;
  }
  for (const needle of new Set([touchedRel, path.posix.basename(touchedRel)])) {
    if (new RegExp(`(["'\`])${escapeRe(needle)}\\1`).test(body)) return true;
  }
  return false;
}

export function relatedTests({ root, touched, include = [] }) {
  const dir = path.join(root, TEST_DIR);
  const tests = fs.readdirSync(dir).filter(isTestFile).sort();
  const out = new Set(include.map(n => path.posix.basename(n)));
  const touchedSet = [...new Set(touched.map(norm))];
  for (const t of touchedSet) {
    if (path.posix.dirname(t) === TEST_DIR && isTestFile(path.posix.basename(t))) out.add(path.posix.basename(t));
  }
  for (const name of tests) {
    if (out.has(name)) continue;
    const src = fs.readFileSync(path.join(dir, name), "utf8");
    const rel = `${TEST_DIR}/${name}`;
    if (touchedSet.some(t => relatesTo(rel, src, t))) out.add(name);
  }
  // A touched test that was deleted has nothing left to run.
  return [...out].filter(n => tests.includes(n)).sort();
}

function git(root, args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} exited ${r.status}: ${(r.stderr || "").trim()}`);
  return r.stdout.split(/\r?\n/).map(norm).filter(Boolean);
}

export function readList(file) {
  const text = fs.readFileSync(file, "utf8").trim();
  if (text.startsWith("[")) return JSON.parse(text).map(norm).filter(Boolean);
  return text.split(/[\r\n,]+/).map(norm).filter(Boolean);
}

function fail(msg) {
  console.error(`related-tests: ${msg}`);
  process.exit(2);
}

function main(argv) {
  const root = path.resolve(arg(argv, "root") ?? path.join(__dirname, ".."));
  const files = arg(argv, "files"), from = arg(argv, "files-from"), diff = arg(argv, "diff");
  const include = csv(arg(argv, "include"));
  if (files === undefined && from === undefined && diff === undefined) {
    fail("nothing to measure: pass --files=<csv>, --files-from=<file> or --diff=<ref>.");
  }
  const touched = [];
  if (files !== undefined) {
    const named = csv(files);
    const absent = named.filter(p => !fs.existsSync(path.join(root, p)));
    if (absent.length) fail(`--files names ${absent.length} path(s) not under ${root}: ${absent.join(", ")}`);
    touched.push(...named);
  }
  if (from !== undefined) {
    try { touched.push(...readList(from)); } catch (e) { fail(`--files-from=${from} could not be read (${e.message})`); }
  }
  if (diff !== undefined) {
    try {
      touched.push(...git(root, ["diff", "--name-only", diff]));
      touched.push(...git(root, ["ls-files", "--others", "--exclude-standard"]));
    } catch (e) { fail(e.message); }
  }
  const absentInc = include.filter(n => !fs.existsSync(path.join(root, TEST_DIR, path.posix.basename(n))));
  if (absentInc.length) fail(`--include names ${absentInc.length} test(s) not in ${TEST_DIR}: ${absentInc.join(", ")}`);

  const related = relatedTests({ root, touched, include });
  if (argv.includes("--json")) {
    console.log(JSON.stringify({ count: related.length, related, touched: [...new Set(touched)].sort() }));
  } else {
    console.log(related.join(","));
  }
}

// Importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2));
}
