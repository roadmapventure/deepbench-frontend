#!/usr/bin/env node
// DeepBench v6.3.209 | scripts/check-deploy-current.js | SES-015
// FEATURE: SES-015 -- gates live QA on whether the dev preview actually contains the commit under test
//
// "Pushed" is not "deployed." Vercel does not reliably build every push to
// `dev`: measured across the 156 commits on origin/dev since 2026-07-28 12:00
// CST against every dev deployment Vercel actually produced, the median lag
// from commit -> first build containing it is 37s, but p90 is 852s (14 min),
// max is 2,973s (49.5 min), 28% of commits waited >5 min and 20% waited
// >10 min. A session that pushes and then checks the dev preview is often
// looking at an older build without knowing it -- and a stale-preview run is
// indistinguishable from a real result in either direction.
//
// This script answers one question: does the commit the preview is currently
// serving CONTAIN the commit I want to test? Coverage is an ancestor test, not
// string equality -- with 5-7 concurrent sessions the deployed tip is usually
// ahead of yours, so equality would fail almost always and the gate would be
// ignored within a day.
//
// Usage: node scripts/check-deploy-current.js [--worktree=<path>] [--sha=<sha>]
//                                             [--timeout=<seconds>] [--json]
// Exit codes:
//   0  covered -- the serving deployment contains the tested commit
//   1  not covered -- stale preview, no build fired, or the poll budget expired
//   2  cannot run -- no VERCEL_TOKEN, or the Vercel API could not be reached
//
// Exit 2 is deliberately distinct from exit 1: an unrunnable check must never
// be reported as a pass, and must not be confused with a real stale-deploy
// failure either.

import { execFileSync } from "child_process";
import { pathToFileURL } from "url";

const VERCEL_APP = "deepbench-frontend";
const PENDING_STATES = new Set(["QUEUED", "BUILDING", "INITIALIZING"]);
const POLL_SECONDS = 15;
// A just-pushed commit can take a few seconds to register as a queued build,
// so one grace re-query is worth it. Beyond that, waiting is proven futile:
// docs/SESSIONS.md records 12 minutes of waiting with nothing ever queued, and
// SES-015's design session measured a 46-minute window that produced no dev
// build at all across ~8 commits from six different sessions.
const WEBHOOK_GRACE_SECONDS = 90;

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const WORKTREE = arg("worktree", process.cwd());
const TIMEOUT = Number(arg("timeout", "300"));
const JSON_OUT = process.argv.includes("--json");

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Pure decision logic -- exported so the Node test can exercise it without
// network or git.
// ---------------------------------------------------------------------------

// Newest dev deployment that is both READY and actually serving the branch
// alias. aliasAssigned matters: a READY deployment that never took the alias is
// not what the preview URL serves.
export function pickServing(deployments) {
  const ready = (deployments || [])
    .filter(d => d?.meta?.githubCommitRef === "dev")
    .filter(d => d.readyState === "READY" && d.aliasAssigned)
    .sort((a, b) => (b.created || 0) - (a.created || 0));
  return ready.length ? ready[0] : null;
}

// Deployments Vercel has accepted and is still working on. CANCELED and ERROR
// are terminal -- they are not work in flight and must not buy more waiting.
export function pickPending(deployments) {
  return (deployments || [])
    .filter(d => d?.meta?.githubCommitRef === "dev")
    .filter(d => PENDING_STATES.has(d.readyState))
    .sort((a, b) => (b.created || 0) - (a.created || 0));
}

// verdict: "live" | "building" | "no-build-fired" | "no-deployment"
export function decide({ covered, serving, pending }) {
  if (covered) return { verdict: "live", exitCode: 0 };
  if ((pending || []).length) return { verdict: "building", exitCode: 1 };
  if (!serving) return { verdict: "no-deployment", exitCode: 1 };
  return { verdict: "no-build-fired", exitCode: 1 };
}

// ---------------------------------------------------------------------------
// I/O helpers
// ---------------------------------------------------------------------------

function git(args, { allowFail = false } = {}) {
  try {
    return {
      ok: true,
      out: execFileSync("git", ["-C", WORKTREE, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(),
    };
  } catch (e) {
    if (!allowFail) return { ok: false, out: "", error: e.message };
    return { ok: false, out: "", error: e.message };
  }
}

async function fetchDeployments(token) {
  const url = `https://api.vercel.com/v6/deployments?app=${VERCEL_APP}&limit=40`;
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    return { error: `could not reach the Vercel API: ${e.message}` };
  }
  if (!res.ok) {
    return { error: `Vercel API returned HTTP ${res.status} ${res.statusText}` };
  }
  let body;
  try {
    body = await res.json();
  } catch (e) {
    return { error: `Vercel API returned unparseable JSON: ${e.message}` };
  }
  return { deployments: body.deployments || [] };
}

// Coverage test -- ancestor, never equality. Pass when the tested SHA is
// CONTAINED IN what is deployed. This is the single most important function in
// the file: strict equality would fail almost always under concurrent sessions,
// because the deployed tip is normally ahead of the commit being tested.
function coverage(sha, servingSha) {
  if (!servingSha) return { covered: false, reason: "no READY+aliased dev deployment exists yet" };

  const known = git(["cat-file", "-e", `${servingSha}^{commit}`]);
  if (!known.ok) {
    // Never assume coverage from an unresolvable SHA -- that would turn the
    // gate into a rubber stamp exactly when it matters most.
    return {
      covered: false,
      reason: `the serving commit ${short(servingSha)} is not resolvable in this worktree even after fetching origin/dev, so coverage cannot be proven`,
    };
  }

  const anc = git(["merge-base", "--is-ancestor", sha, servingSha]);
  if (anc.ok) return { covered: true };
  return {
    covered: false,
    reason: `${short(sha)} is not an ancestor of the serving commit ${short(servingSha)} -- the preview does not contain it`,
  };
}

const short = s => (s ? String(s).slice(0, 7) : "unknown");

function remedyText(sha) {
  return [
    "",
    "No Vercel build was ever triggered for this commit. Waiting will not help -- this has been",
    "observed to persist for 46 minutes.",
    "A manual API trigger is not available on this plan (POST /v13/deployments returns 402 Payment Required).",
    "The working remedy is to push another commit, which triggers a build that includes this one:",
    `  git -C "${WORKTREE}" commit --allow-empty -m "chore: poke Vercel dev webhook (no build fired for ${short(sha)})"`,
    `  git -C "${WORKTREE}" push origin HEAD:dev`,
    "",
  ].join("\n");
}

function say(line) {
  if (!JSON_OUT) console.log(line);
}

function finish({ exitCode, verdict, sha, serving, pending, reason, message }) {
  if (JSON_OUT) {
    console.log(JSON.stringify({
      verdict,
      exitCode,
      sha,
      servingSha: serving?.meta?.githubCommitSha || null,
      servingUrl: serving?.url || null,
      pending: (pending || []).map(p => ({ sha: p?.meta?.githubCommitSha || null, readyState: p.readyState })),
      reason: reason || null,
      message: message || null,
    }));
  }
  process.exit(exitCode);
}

// ---------------------------------------------------------------------------

async function main() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    say("\ncheck-deploy-current: VERCEL_TOKEN is not set in this process's environment.");
    say("");
    say("VERCEL_TOKEN is a persistent Windows environment variable on John's machine (docs/ENV-VARS.md).");
    say("A process that started BEFORE the variable was set will not see it -- restarting the shell");
    say("(or the Claude Code session) is what picks it up. Nothing needs to be added to .env.local.");
    say("");
    say("Exiting 2 (cannot run). This is NOT a pass -- the deploy was never checked.");
    return finish({ exitCode: 2, verdict: "cannot-run", sha: null, serving: null, pending: [], reason: "VERCEL_TOKEN not set" });
  }

  // Deployed SHAs have to be resolvable locally for the ancestor test to mean
  // anything, and the deployed tip is usually a commit this worktree has never
  // seen. Fetch first, always.
  git(["fetch", "origin", "dev", "--quiet"], { allowFail: true });

  let sha = arg("sha", null);
  if (!sha) {
    const head = git(["rev-parse", "HEAD"]);
    if (!head.ok) {
      say(`\ncheck-deploy-current: could not resolve HEAD in ${WORKTREE}: ${head.error}`);
      return finish({ exitCode: 2, verdict: "cannot-run", sha: null, serving: null, pending: [], reason: "HEAD unresolvable" });
    }
    sha = head.out;
  } else {
    const resolved = git(["rev-parse", `${sha}^{commit}`]);
    if (!resolved.ok) {
      say(`\ncheck-deploy-current: --sha=${sha} does not resolve to a commit in ${WORKTREE}.`);
      return finish({ exitCode: 2, verdict: "cannot-run", sha, serving: null, pending: [], reason: "--sha unresolvable" });
    }
    sha = resolved.out;
  }

  say(`\ncheck-deploy-current -- is the dev preview serving a build that contains ${short(sha)}?`);
  say(`  worktree: ${WORKTREE}`);
  say(`  budget:   ${TIMEOUT}s\n`);

  const deadline = Date.now() + TIMEOUT * 1000;
  let graceUsed = false;

  for (;;) {
    const { deployments, error } = await fetchDeployments(token);
    if (error) {
      say(`check-deploy-current: ${error}`);
      say("Exiting 2 (cannot run). This is NOT a pass -- the deploy was never checked.");
      return finish({ exitCode: 2, verdict: "cannot-run", sha, serving: null, pending: [], reason: error });
    }

    const serving = pickServing(deployments);
    const pending = pickPending(deployments);
    const cov = coverage(sha, serving?.meta?.githubCommitSha);
    const { verdict, exitCode } = decide({ covered: cov.covered, serving, pending });

    if (verdict === "live") {
      say(`LIVE -- the preview is serving ${short(serving.meta.githubCommitSha)}, which contains ${short(sha)}.`);
      if (serving.url) say(`  deployment: https://${serving.url}`);
      say("\nDeploy gate PASSED. Proceed with QA.");
      return finish({ exitCode: 0, verdict, sha, serving, pending });
    }

    const remainingMs = deadline - Date.now();

    if (verdict === "building") {
      const names = pending.map(p => `${short(p?.meta?.githubCommitSha)} (${p.readyState})`).join(", ");
      if (remainingMs <= 0) {
        say(`TIMEOUT -- ${TIMEOUT}s elapsed and ${short(sha)} is still not covered.`);
        say(`  Reason: ${cov.reason}`);
        say(`  Still pending at Vercel: ${names}`);
        say("\nDeploy gate FAILED. Do not run QA against this preview.");
        return finish({ exitCode: 1, verdict: "timeout", sha, serving, pending, reason: cov.reason });
      }
      say(`BUILDING -- ${names}. Not covered yet; re-checking in ${POLL_SECONDS}s (${Math.round(remainingMs / 1000)}s of budget left).`);
      await sleep(Math.min(POLL_SECONDS * 1000, remainingMs));
      continue;
    }

    // no-build-fired / no-deployment: one webhook grace re-query, then stop.
    if (!graceUsed && remainingMs > 0) {
      graceUsed = true;
      const waitMs = Math.min(WEBHOOK_GRACE_SECONDS * 1000, remainingMs);
      say(`No build in flight for ${short(sha)}. Waiting ${Math.round(waitMs / 1000)}s once, in case the webhook has not registered yet.`);
      await sleep(waitMs);
      continue;
    }

    if (verdict === "no-deployment") {
      say(`NO DEPLOYMENT -- Vercel has no READY, alias-assigned deployment for branch dev at all.`);
    } else {
      say(`STALE -- the preview is serving ${short(serving.meta.githubCommitSha)}, which does NOT contain ${short(sha)}.`);
    }
    say(`  Reason: ${cov.reason}`);
    say(remedyText(sha));
    say("Deploy gate FAILED. Do not run QA against this preview.");
    return finish({ exitCode, verdict, sha, serving, pending, reason: cov.reason, message: remedyText(sha) });
  }
}

// Only run the gate when invoked directly -- the Node test imports the pure
// decision functions from this module and must not trigger network or git.
// pathToFileURL, not a hand-built `file://${path}` -- a Windows path like
// C:\...\scripts\check-deploy-current.js parses as a URL *host* of "c" that
// way, so the comparison would never match and the gate would silently
// no-op when run directly.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main();
}
