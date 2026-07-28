// DeepBench v6.3.175 | platform-stats.js | ABT-1d -- attempt git fetch --unshallow so a CI checkout can report a real commit count
// Runs automatically from package.json's `prebuild` on every Vercel build of dev/main, or
// locally via `node --env-file=.env.local scripts/platform-stats.js`. Plain Node, no deps.
// NEVER writes dev_toolchain_services -- that is a John-set value, preserved by omission.
//
// --soft: every failure path logs one `platform-stats: skipped -- <reason>` line and exits 0,
// so a stats refresh can never break a deploy. Without the flag, failures exit 1 (strict local
// / manual invocation). Independently of the flag, commits_dev is omitted from the write
// whenever it can't be trusted (shallow clone, git unavailable, or lower than the stored value)
// -- a truncated count must never overwrite a good one.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOFT = process.argv.includes("--soft");

function skip(reason) {
  console.log(`platform-stats: skipped — ${reason}`);
  process.exit(0);
}

// Soft mode turns every failure into a skip+exit 0; strict mode keeps today's exit 1.
function fail(reason) {
  if (SOFT) skip(reason);
  console.error(`platform-stats: ${reason}`);
  process.exit(1);
}

async function main() {
  // A feature-branch preview build must never overwrite the row with that branch's state.
  // Only dev/production builds (and any local run, which has no VERCEL env) may write.
  const vercelRef = process.env.VERCEL_GIT_COMMIT_REF;
  if (process.env.VERCEL && vercelRef && vercelRef !== "dev" && vercelRef !== "main") {
    skip(`preview build for branch ${vercelRef}`);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    fail("missing SUPABASE_URL / SUPABASE_ANON_KEY (or VITE_ fallbacks)");
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

  const git = (cmd) => execSync(cmd, { cwd: repoRoot, encoding: "utf8" }).trim();

  // ABT-1d: Vercel clones with `git clone --depth=10`, so the count below would be ~10 in CI and
  // the guard would (correctly) preserve the stored value forever, letting the tile go stale.
  // Try ONCE, time-bounded, to deepen the repository first. If it succeeds the count that follows
  // is real; if it fails for any reason -- no credentials in the build container, no network,
  // already complete -- nothing changes and the guard below preserves the stored value exactly as
  // it does today. The attempt cannot make anything worse, and is never fatal in either mode.
  try {
    if (git("git rev-parse --is-shallow-repository") === "true") {
      execSync("git fetch --unshallow --quiet", {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: "pipe",
        timeout: 20000, // a hanging fetch must never stall a deploy
      });
      console.log("platform-stats: deepened shallow clone for an accurate commit count");
    }
  } catch (err) {
    const reason = String(err?.message || err).split("\n")[0].slice(0, 120);
    console.log(
      `platform-stats: could not deepen shallow clone (${reason}) — commit count will be preserved`
    );
  }

  // commits_dev: only trustworthy from a full-depth checkout. A CI clone may be shallow, in
  // which case `git rev-list --count HEAD` legitimately returns a small number -- writing that
  // would visibly corrupt the "Commits to dev" tile, so we omit the field instead.
  let commits_dev = null;
  let commitsReason = "";
  try {
    if (git("git rev-parse --is-shallow-repository") === "true") {
      commitsReason = "shallow clone";
    } else {
      commits_dev = parseInt(git("git rev-list --count HEAD"), 10);
      if (!Number.isFinite(commits_dev) || commits_dev <= 0) {
        commits_dev = null;
        commitsReason = "git returned no usable count";
      }
    }
  } catch (err) {
    commits_dev = null;
    commitsReason = `git unavailable (${err?.message?.split("\n")[0] || err})`;
  }

  const stats = {
    lines_of_code,
    source_files,
    governance_docs,
    updated_at: new Date().toISOString(),
    updated_by: "platform-stats-action",
    // dev_toolchain_services deliberately absent -- preserved (John-set value)
  };

  const restHeaders = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  // Read the stored row first, so a computed count lower than what's already there (the other
  // shallow-clone symptom -- a clone deep enough to succeed but still truncated) is caught too.
  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/platform_stats?id=eq.1&select=*`, {
    headers: restHeaders,
  });
  if (!getRes.ok) {
    fail(`could not read current row: HTTP ${getRes.status}: ${await getRes.text()}`);
  }
  const stored = (await getRes.json())[0];
  if (!stored) fail("platform_stats row id=1 not found");

  if (commits_dev === null) {
    console.log(
      `platform-stats: commit count not trusted (${commitsReason}) — preserving stored value`
    );
  } else if (
    typeof stored.commits_dev === "number" &&
    commits_dev < stored.commits_dev
  ) {
    console.log(
      `platform-stats: commit count looks truncated (computed ${commits_dev} < stored ${stored.commits_dev}) — preserving stored value`
    );
    commits_dev = null;
  }

  const body = commits_dev === null ? { ...stats } : { ...stats, commits_dev };

  console.log("platform-stats computed:", JSON.stringify(body, null, 2));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/platform_stats?id=eq.1`, {
    method: "PATCH",
    headers: {
      ...restHeaders,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (res.status !== 200 && res.status !== 204) {
    fail(`PATCH failed with HTTP ${res.status}: ${await res.text()}`);
  }

  const rows = res.status === 200 ? await res.json() : [];
  const row = Array.isArray(rows) ? rows[0] : rows;
  const echoed =
    row &&
    row.lines_of_code === lines_of_code &&
    row.source_files === source_files &&
    row.governance_docs === governance_docs &&
    (commits_dev === null || row.commits_dev === commits_dev);
  if (!echoed) {
    fail(`returned row does not echo the new values: ${JSON.stringify(row)}`);
  }

  console.log(
    `platform-stats: updated OK (dev_toolchain_services preserved at ${row.dev_toolchain_services}, commits_dev ${row.commits_dev})`
  );
}

try {
  await main();
} catch (err) {
  // Nothing unexpected -- a DNS failure, a bad response body -- may surface as a non-zero exit
  // inside a Vercel build.
  fail(`unexpected error: ${err?.stack || err}`);
}
