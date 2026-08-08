#!/usr/bin/env node
// DeepBench | scripts/check-api-function-count.js | SE-05 (Structural Enforcement Track)
// FEATURE: SE-05 -- mechanizes the Vercel Hobby 12-function limit check
//
// Mechanizes SE-05: Vercel Hobby plan caps serverless functions at 12. Each
// top-level file under api/ (Vercel's routing convention -- nested files
// under api/_lib/ or api/prompt/ that aren't directly route-mapped don't
// count, api/capabilities/execute.js does since it's still a route) counts
// as one function. STANDARDS.md's kickoff-doc Step 9 already requires stating
// the pre/post count by hand -- this makes "by hand" a real number instead of
// an estimate.
//
// Usage: node scripts/check-api-function-count.js [--worktree=<path>]
// Exit code 1 if the count exceeds 12, 0 otherwise.

import fs from "fs";
import path from "path";

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const WORKTREE = arg("worktree", process.cwd());
const LIMIT = 12;

// Vercel's file-system routing convention excludes any path where a segment
// name starts with "_" -- that's precisely why this repo's shared api-side
// helpers live under api/_lib/ rather than api/lib/ (renamed specifically for
// this reason, confirmed via git history: `mv api/lib api/_lib`). Everything
// else under api/ (including nested, non-underscore directories like
// api/prompt/ and api/capabilities/) is a real, separately-deployed route.
// Verified against this repo's own kickoff docs, which have consistently
// stated "12 files in api/ today" -- exactly total-minus-underscore-excluded.
function walk(dir) {
  let results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith("_")) continue; // Vercel routing exclusion
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full));
    } else if (entry.name.endsWith(".js")) {
      results.push(full);
    }
  }
  return results;
}

function main() {
  const apiDir = path.join(WORKTREE, "api");
  const files = walk(apiDir).map(f => path.relative(WORKTREE, f).replace(/\\/g, "/"));
  const count = files.length;

  console.log(`\napi/ Function Count -- ${count}/${LIMIT} (Vercel Hobby limit)\n`);
  if (count > LIMIT) {
    console.log(`OVER LIMIT by ${count - LIMIT}. Files:`);
  } else {
    console.log(`Within limit, ${LIMIT - count} remaining. Files:`);
  }
  for (const f of files.sort()) console.log(`  ${f}`);

  process.exit(count > LIMIT ? 1 : 0);
}

main();
