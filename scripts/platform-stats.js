// DeepBench v6.3.172 | platform-stats.js | ABT-1b -- recount repo facts into platform_stats on push to dev
// Runs in CI (.github/workflows/platform-stats.yml) on every push to dev, or locally via
// `node --env-file=.env.local scripts/platform-stats.js`. Plain Node, no deps.
// NEVER writes dev_toolchain_services -- that is a John-set value, preserved by omission.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("platform-stats: missing SUPABASE_URL / SUPABASE_ANON_KEY (or VITE_ fallbacks)");
  process.exit(1);
}

function walk(dir, matcher, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out; // directory absent -- count as zero files
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, matcher, out);
    else if (e.isFile() && matcher(e.name)) out.push(full);
  }
  return out;
}

const countLines = (file) => readFileSync(file, "utf8").split("\n").length;

// lines_of_code + source_files: all *.js/*.jsx under src/, api/, shared/ (recursive)
const isSource = (name) => name.endsWith(".js") || name.endsWith(".jsx");
const sourceFiles = ["src", "api", "shared"].flatMap((d) => walk(join(repoRoot, d), isSource));
const lines_of_code = sourceFiles.reduce((sum, f) => sum + countLines(f), 0);
const source_files = sourceFiles.length;

// governance_docs: CLAUDE*.md at repo root + all *.md under docs/ (recursive, kickoffs included)
const rootClaudeMd = readdirSync(repoRoot).filter(
  (n) => n.startsWith("CLAUDE") && n.endsWith(".md")
);
const docsMd = walk(join(repoRoot, "docs"), (n) => n.endsWith(".md"));
const governance_docs = rootClaudeMd.length + docsMd.length;

// commits_dev: full-depth checkout of dev in CI
const commits_dev = parseInt(
  execSync("git rev-list --count HEAD", { cwd: repoRoot, encoding: "utf8" }).trim(),
  10
);

const body = {
  lines_of_code,
  source_files,
  governance_docs,
  commits_dev,
  updated_at: new Date().toISOString(),
  updated_by: "platform-stats-action",
  // dev_toolchain_services deliberately absent -- preserved (John-set value)
};

console.log("platform-stats computed:", JSON.stringify(body, null, 2));

const res = await fetch(`${SUPABASE_URL}/rest/v1/platform_stats?id=eq.1`, {
  method: "PATCH",
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify(body),
});

if (res.status !== 200 && res.status !== 204) {
  console.error(`platform-stats: PATCH failed with HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const rows = res.status === 200 ? await res.json() : [];
const row = Array.isArray(rows) ? rows[0] : rows;
if (
  !row ||
  row.lines_of_code !== lines_of_code ||
  row.source_files !== source_files ||
  row.governance_docs !== governance_docs ||
  row.commits_dev !== commits_dev
) {
  console.error(
    "platform-stats: returned row does not echo the new values:",
    JSON.stringify(row)
  );
  process.exit(1);
}

console.log(
  `platform-stats: updated OK (dev_toolchain_services preserved at ${row.dev_toolchain_services})`
);
