#!/usr/bin/env node
// DeepBench | scripts/check-api-deps.js | SES-010
//
// Mechanical sweep for the BUG-10 failure class: an api/ route imports a package
// that isn't listed in package.json's "dependencies". Locally this is invisible --
// Vite only bundles the frontend, and whatever's already sitting in node_modules
// from some other dependency lets the import resolve during `npm run build` and
// Node tests. It only breaks on Vercel's clean serverless install, at runtime,
// in production. BUG-10 (pdf-parse/jszip missing) is exactly this, caught by
// hand after a live crash. This script makes the same check mechanical.
//
// Usage: node scripts/check-api-deps.js
// Exit code 1 if any package is missing from "dependencies" entirely (CRITICAL),
// 0 otherwise. A package present only in "devDependencies" is a WARNING, not a
// failure -- Vercel's serverless functions do install devDependencies at build
// time (they're just excluded from the runtime bundle in some configurations),
// so this is a real risk but a softer one than a fully-missing package.

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "api");
const EXCLUDE_DIR_NAMES = new Set(["node_modules", ".claude", ".git"]);

// Node built-ins that never need a package.json entry, with or without the
// "node:" prefix.
const NODE_BUILTINS = new Set([
  "assert", "buffer", "child_process", "cluster", "crypto", "dgram", "dns",
  "domain", "events", "fs", "http", "http2", "https", "net", "os", "path",
  "perf_hooks", "process", "punycode", "querystring", "readline", "repl",
  "stream", "string_decoder", "sys", "timers", "tls", "tty", "url", "util",
  "v8", "vm", "worker_threads", "zlib",
]);

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

// Extracts the package name a bare import specifier resolves to in package.json --
// "@scope/pkg/sub/path" -> "@scope/pkg", "pkg/sub/path" -> "pkg". Relative
// ("./x", "../x") and absolute ("/x") specifiers are not packages, callers filter
// those out before calling this.
function packageNameFromSpecifier(specifier) {
  const bare = specifier.replace(/^node:/, "");
  const parts = bare.split("/");
  if (bare.startsWith("@")) return parts.slice(0, 2).join("/");
  return parts[0];
}

function extractSpecifiers(text) {
  const specifiers = new Set();
  // import ... from "specifier"  |  import "specifier"
  const importRe = /import\s+(?:[^'"]*?\s+from\s+)?["']([^'"]+)["']/g;
  // require("specifier")
  const requireRe = /require\(\s*["']([^'"]+)["']\s*\)/g;
  let m;
  while ((m = importRe.exec(text))) specifiers.add(m[1]);
  while ((m = requireRe.exec(text))) specifiers.add(m[1]);
  return [...specifiers].filter(s => !s.startsWith(".") && !s.startsWith("/"));
}

function main() {
  const pkgJsonPath = path.join(ROOT, "package.json");
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  const deps = new Set(Object.keys(pkgJson.dependencies || {}));
  const devDeps = new Set(Object.keys(pkgJson.devDependencies || {}));

  const files = walk(API_DIR, [".js"]);
  const findings = [];
  const seenPackages = new Map(); // package name -> Set of files that import it

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const specifier of extractSpecifiers(text)) {
      const pkgName = packageNameFromSpecifier(specifier);
      if (NODE_BUILTINS.has(pkgName)) continue;
      if (!seenPackages.has(pkgName)) seenPackages.set(pkgName, new Set());
      seenPackages.get(pkgName).add(path.relative(ROOT, file));
    }
  }

  for (const [pkgName, fileSet] of seenPackages) {
    const files = [...fileSet].join(", ");
    if (deps.has(pkgName)) continue;
    if (devDeps.has(pkgName)) {
      findings.push({ severity: "WARNING", detail: `"${pkgName}" is only in devDependencies, imported by: ${files}` });
      continue;
    }
    findings.push({ severity: "CRITICAL", detail: `"${pkgName}" is not in package.json at all, imported by: ${files}` });
  }

  const critical = findings.filter(f => f.severity === "CRITICAL");
  const warning = findings.filter(f => f.severity === "WARNING");

  console.log(`\napi/ Dependency Audit -- ${critical.length} CRITICAL, ${warning.length} WARNING\n`);

  if (critical.length) {
    console.log("=== CRITICAL (missing from package.json -- will crash on Vercel) ===");
    for (const f of critical) console.log(`  ${f.detail}`);
    console.log("");
  }
  if (warning.length) {
    console.log("=== WARNING (devDependencies only -- confirm this is intentional) ===");
    for (const f of warning) console.log(`  ${f.detail}`);
    console.log("");
  }
  if (!critical.length && !warning.length) {
    console.log("Clean -- every api/ import resolves to a real dependency.\n");
  }

  process.exit(critical.length > 0 ? 1 : 0);
}

main();
