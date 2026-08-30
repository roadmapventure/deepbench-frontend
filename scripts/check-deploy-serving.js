#!/usr/bin/env node
// DeepBench v7.0.334 | scripts/check-deploy-serving.js | SES-182 slice 3
// FEATURE: SES-182 -- deploy-serving-red as the second rollback trigger (slice 3 of the design in
// docs/kickoffs/v7.0.324-SES-182-auto-rollback-design.md; slices 1 and 2 shipped v7.0.332/v7.0.333)
//
// WHAT THIS IS. `rollback-on-red.js` has admitted `deploy-red` in TRIGGER_SOURCES since slice 1 --
// deliberately, so the vocabulary could not drift -- and nothing has ever produced that trigger.
// decide() already handles it end to end. This is the probe that produces it, and NOTHING ELSE: no
// new authority, no new decision, no Vercel actuation (the revert push IS the deploy fix, the
// kickoff's own "decided without asking").
//
// THE THING TO READ TWICE: THIS PROBE IS RED-ONLY. IT MUST NEVER WRITE A GREEN ANCHOR.
// The tempting edit is to hand every sample to the engine as a `jobs` array and let decide() sort
// it out -- the CI sweep at runbook step 4a does exactly that, and the shapes look identical. They
// are not. `jobs=[{conclusion:"success"}]` takes decide()'s RECORD_GREEN branch and stores the
// probed commit in `runner_green_states` as the anchor every later red is measured against -- on
// the evidence that a web server answered, which is not evidence that CI graded anything. The
// anchor's whole meaning is "both blocking CI jobs concluded success"; a page that loads says
// nothing about the test suite. So engineArgsFor() returns null on anything but `serving-red`, and
// the jobs it emits on a red always carry a FAILURE conclusion -- the green branch is unreachable
// from this file by construction rather than by a rule someone has to remember. The guard pins it
// with the retired pass-everything-through form applied to the SAME fixture and asserted to LOSE
// (it yields `record-green`; the shipped one yields no invocation at all).
//
// THE SECOND FORBIDDEN EDIT, and it is the one that would cause a wrong revert: judging
// `origin/dev`'s HEAD instead of the commit the alias is ACTUALLY SERVING. These are routinely
// different commits, and not by a little -- SES-015 measured the push->serve lag on this very
// project at a median of 37s but a p90 of 852s and a max of 2,973s, with 28% of commits waiting
// over five minutes. So a probe that reads dev's head and finds the site red would hand the engine
// a sha the public has never been served, and the engine would revert it on evidence produced by
// some older commit. The serving sha comes from pickServing(), IMPORTED from
// check-deploy-current.js rather than re-derived here -- SES-45's "a second implementation agreeing
// with itself" -- which is also where the READY + aliasAssigned + branch=dev predicate lives and
// why it is not restated in this file.
//
// THE THIRD: reading an unreachable deployment as red. The fail-closed direction here is the
// OPPOSITE-LOOKING rule from the watermark's, and the two get conflated. For the watermark,
// unknown is treated as MOVED, because unknown-is-not-innocent points away from an automatic
// schema action. Here it points the same way -- away from acting -- but that means unknown must
// NOT be red: a DNS blip, a proxy 407, a timeout inside this container or an expired bypass secret
// would otherwise auto-revert a perfectly healthy `dev` on the strength of the runner's own network
// having a bad second. So the probe has THREE verdicts, not two, and only `serving-red` is a
// trigger. Exit 2 is "could not run", never a pass -- the same convention check-deploy-current.js,
// check-anthropic-quota.js and rollback-on-red.js already keep.
//
// A ONE-OFF 502 IS NOT A RED EITHER. This trigger reverts production code, so a single sample may
// not fire it: MIN_SAMPLES consecutive samples must ALL be red, and any single green sample makes
// the whole probe green -- a site that answers correctly even once is serving. That is the
// runbook's own "flake is not a root cause" discipline applied at the point where it costs
// something.
//
// WHAT "RED" MEANS, and the honest bound on it. This is an HTTP probe, so it sees SERVER-side red:
// a 5xx, a 404 at the app root, or a 200 whose body is not the app shell. It CANNOT see a
// client-side render failure -- a shell that loads and then throws in React looks green from here,
// and no amount of status-code reading changes that. Rather than leave that as an unnamed hole, the
// probe follows the shell's own entry module reference and fetches it: a shell served beside an
// entry bundle that 404s is the overwhelming shape of a real blank-page deploy (assets that did not
// upload), and it IS server-side observable. What remains uncovered is named on the card and in
// PROBE_LIMITS below rather than left to be discovered.
//
// Usage: node scripts/check-deploy-serving.js [--url=<origin>] [--samples=N] [--json]
// Env:   VERCEL_AUTOMATION_BYPASS_SECRET (to get past deployment protection)
//        VERCEL_TOKEN                    (to resolve WHICH commit the alias serves)
// Exit codes:
//   0  serving-green -- the alias serves the app shell and its entry bundle
//   1  serving-red   -- every sample was red; --json carries the engine invocation to make
//   2  unknown       -- could not run, or could not tell. NEVER a pass, and never a trigger.

import { pathToFileURL } from "url";
import { pickServing } from "./check-deploy-current.js";

export const DEV_ORIGIN = "https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app";

// The app shell's own root node (index.html). Present in the built output too -- verified against
// the live dev deployment at this ship, not assumed from the source file.
export const ROOT_MARKER = '<div id="root"';

// Three samples, ~2s apart. Two would make a single edge hiccup half the evidence.
export const MIN_SAMPLES = 3;
export const SAMPLE_GAP_MS = 2000;

export const SAMPLE_VERDICTS = { GREEN: "green", RED: "red", UNKNOWN: "unknown" };
export const PROBE_VERDICTS = { GREEN: "serving-green", RED: "serving-red", UNKNOWN: "unknown" };

// Stated, not implied. A probe that hides what it cannot see is worse than one that has no opinion.
export const PROBE_LIMITS = [
  "A client-side render failure (the shell loads, then React throws) reads GREEN here -- an HTTP probe cannot see it.",
  "A partial outage on one route reads GREEN -- only the app root is probed.",
  "Deployment protection (401/403) reads UNKNOWN, never red: that is this probe's own credential, not the site's health.",
];

// ---------------------------------------------------------------------------
// Pure half -- facts in, a verdict out. No network, so every clause is testable.
// ---------------------------------------------------------------------------

// The shell's entry module, read from the shell itself rather than guessed from a build convention:
// Vite hashes the filename on every build, so any hardcoded path is wrong by the next deploy.
export function entryModuleFrom(html) {
  if (typeof html !== "string") return null;
  const m = html.match(/<script[^>]+type="module"[^>]*\ssrc="([^"]+)"/i);
  return m ? m[1] : null;
}

// One HTTP answer -> one verdict. Every branch names its reason, so the card never has to say
// "red" without saying what was red about it.
export function classifyShell(shell = {}) {
  const { networkError = null, status = null, body = "" } = shell;

  if (networkError) {
    return { verdict: SAMPLE_VERDICTS.UNKNOWN, reason: `the probe could not reach the deployment: ${networkError}` };
  }
  if (typeof status !== "number") {
    return { verdict: SAMPLE_VERDICTS.UNKNOWN, reason: "the probe recorded no HTTP status at all" };
  }
  if (status >= 500) {
    return { verdict: SAMPLE_VERDICTS.RED, reason: `the app root returned HTTP ${status} -- the deployment is serving an error` };
  }
  if (status === 404 || status === 410) {
    return { verdict: SAMPLE_VERDICTS.RED, reason: `the app root returned HTTP ${status} -- the deployment is serving nothing at /` };
  }
  // 401/403 is deployment protection and 429 is rate limiting: both are facts about THIS PROBE's
  // access, not about whether the site works. Reading either as red is how a rotated bypass secret
  // would revert a healthy dev.
  if (status === 401 || status === 403) {
    return {
      verdict: SAMPLE_VERDICTS.UNKNOWN,
      reason: `the app root returned HTTP ${status} -- deployment protection refused this probe, which says nothing about the site's health (check VERCEL_AUTOMATION_BYPASS_SECRET)`,
    };
  }
  if (status === 429) {
    return { verdict: SAMPLE_VERDICTS.UNKNOWN, reason: "the app root returned HTTP 429 -- this probe was rate-limited, not the site failing" };
  }
  if (status >= 300 && status < 400) {
    return { verdict: SAMPLE_VERDICTS.UNKNOWN, reason: `the app root returned HTTP ${status} after redirects were followed -- not the app root's own answer` };
  }
  if (status < 200 || status >= 300) {
    return { verdict: SAMPLE_VERDICTS.UNKNOWN, reason: `the app root returned HTTP ${status}, which is not a shape this probe classifies` };
  }
  if (!String(body).includes(ROOT_MARKER)) {
    return {
      verdict: SAMPLE_VERDICTS.RED,
      reason: `the app root returned HTTP ${status} but its body does not contain ${ROOT_MARKER} -- this is the blank-page shape`,
    };
  }
  return { verdict: SAMPLE_VERDICTS.GREEN, reason: `the app root returned HTTP ${status} and served the app shell` };
}

// A sample is the shell AND the entry bundle it points at. The second half is what lets this probe
// see a blank page at all; without it a deploy whose assets never uploaded reads perfectly green.
export function classifySample(sample = {}) {
  const { shell = {}, entry = null } = sample;
  const shellVerdict = classifyShell(shell);
  if (shellVerdict.verdict !== SAMPLE_VERDICTS.GREEN) return shellVerdict;

  // No module reference to follow: the shell is the whole of what this probe can assert. Fail OPEN
  // on the sub-check rather than inventing a red out of a shape we did not expect.
  if (!entry || !entry.src) {
    return { verdict: SAMPLE_VERDICTS.GREEN, reason: `${shellVerdict.reason} (it references no entry module, so only the shell was asserted)` };
  }
  if (entry.networkError) {
    return { verdict: SAMPLE_VERDICTS.UNKNOWN, reason: `the shell served, but its entry module ${entry.src} could not be fetched: ${entry.networkError}` };
  }
  if (typeof entry.status !== "number") {
    return { verdict: SAMPLE_VERDICTS.UNKNOWN, reason: `the shell served, but no HTTP status was recorded for its entry module ${entry.src}` };
  }
  if (entry.status < 200 || entry.status >= 300) {
    return {
      verdict: SAMPLE_VERDICTS.RED,
      reason: `the shell served, but its entry module ${entry.src} returned HTTP ${entry.status} -- the page renders blank`,
    };
  }
  return { verdict: SAMPLE_VERDICTS.GREEN, reason: `${shellVerdict.reason}, and its entry module ${entry.src} served HTTP ${entry.status}` };
}

// Any green wins; otherwise every sample must be red, and there must be enough of them. Anything
// else is unknown -- which is not a failure to report, it is the honest answer.
export function verdictFor(samples) {
  const list = Array.isArray(samples) ? samples : [];
  if (list.length === 0) return { verdict: PROBE_VERDICTS.UNKNOWN, reason: "no samples were taken" };

  const green = list.filter((s) => s.verdict === SAMPLE_VERDICTS.GREEN);
  if (green.length > 0) {
    return {
      verdict: PROBE_VERDICTS.GREEN,
      reason: `${green.length} of ${list.length} sample(s) served the app -- a deployment that answers correctly even once is serving. ${green[0].reason}`,
    };
  }
  const red = list.filter((s) => s.verdict === SAMPLE_VERDICTS.RED);
  if (red.length === list.length && list.length >= MIN_SAMPLES) {
    return {
      verdict: PROBE_VERDICTS.RED,
      reason: `all ${list.length} consecutive sample(s) were red, so this is not one edge node having a bad second. ${red[0].reason}`,
    };
  }
  const unknown = list.filter((s) => s.verdict === SAMPLE_VERDICTS.UNKNOWN);
  return {
    verdict: PROBE_VERDICTS.UNKNOWN,
    reason:
      `${red.length} red / ${unknown.length} could-not-tell across ${list.length} sample(s)` +
      (list.length < MIN_SAMPLES ? ` -- fewer than the ${MIN_SAMPLES} consecutive reds this trigger requires` : "") +
      `. Unknown is not red: nothing is triggered. ${(unknown[0] ?? red[0] ?? {}).reason ?? ""}`.trimEnd(),
  };
}

// The whole of this file's authority: what, if anything, to hand rollback-on-red.js.
//
// null means "invoke nothing". It is the answer for GREEN (see the header -- a serving page is not
// a CI verdict and must never become a green anchor) and for UNKNOWN, and it is also the answer for
// a red whose serving commit could not be resolved: with no sha there is nothing to attribute, and
// an unattributable red is already "not this machine's to undo" one layer down. The verdict still
// reports red in that case, because the runbook's step-4 blocker duty is a separate obligation from
// this trigger and a down site is a down site.
export function engineArgsFor({ verdict, servingSha = null, reason = "", origin = DEV_ORIGIN } = {}) {
  if (verdict !== PROBE_VERDICTS.RED) return null;
  if (!servingSha) return null;
  return {
    trigger: "deploy-red",
    sha: servingSha,
    // Always a failure conclusion. This is what makes decide()'s RECORD_GREEN branch structurally
    // unreachable from this probe rather than merely unvisited.
    jobs: [{ name: `deploy: ${origin} serving ${String(servingSha).slice(0, 7)}`, conclusion: "failure" }],
    reason,
  };
}

// ---------------------------------------------------------------------------
// Impure half
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(url, headers, { bodyWanted = true } = {}) {
  let res;
  try {
    res = await fetch(url, { headers, redirect: "follow" });
  } catch (e) {
    return { networkError: e.message };
  }
  if (!bodyWanted) return { status: res.status, body: "" };
  let body = "";
  try { body = await res.text(); } catch { /* a body we cannot read is an empty one for our purposes */ }
  return { status: res.status, body };
}

export async function takeSample(origin, headers) {
  const shell = await fetchOnce(`${origin}/`, headers);
  let entry = null;
  const src = entryModuleFrom(shell.body ?? "");
  if (src) {
    const abs = src.startsWith("http") ? src : `${origin}${src.startsWith("/") ? "" : "/"}${src}`;
    const got = await fetchOnce(abs, headers, { bodyWanted: false });
    entry = { src, ...got };
  }
  const classified = classifySample({ shell, entry });
  return { ...classified, status: shell.status ?? null, entrySrc: src ?? null, entryStatus: entry?.status ?? null };
}

async function resolveServingSha(token) {
  if (!token) return { error: "VERCEL_TOKEN is not set, so which commit the alias serves cannot be resolved" };
  let res;
  try {
    res = await fetch("https://api.vercel.com/v6/deployments?app=deepbench-frontend&limit=40", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    return { error: `could not reach the Vercel API: ${e.message}` };
  }
  if (!res.ok) return { error: `Vercel API returned HTTP ${res.status}` };
  let body;
  try { body = await res.json(); } catch (e) { return { error: `Vercel API returned unparseable JSON: ${e.message}` }; }
  const serving = pickServing(body.deployments || []);
  return { sha: serving?.meta?.githubCommitSha ?? null, url: serving?.url ?? null };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const ARGV = process.argv.slice(2);
const JSON_OUT = ARGV.includes("--json");

function argValue(name, fallback) {
  const hit = ARGV.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function finish(code, payload, prose) {
  if (JSON_OUT) console.log(JSON.stringify({ exitCode: code, ...payload }));
  else console.log(prose);
  process.exit(code);
}

async function main() {
  const origin = (argValue("url", DEV_ORIGIN) || DEV_ORIGIN).replace(/\/+$/, "");
  const wanted = Math.max(MIN_SAMPLES, Number(argValue("samples", String(MIN_SAMPLES))) || MIN_SAMPLES);
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
  const headers = bypass ? { "x-vercel-protection-bypass": bypass } : {};

  const samples = [];
  for (let i = 0; i < wanted; i++) {
    if (i > 0) await sleep(SAMPLE_GAP_MS);
    samples.push(await takeSample(origin, headers));
    // A green sample settles it -- no reason to spend two more round trips proving a live site live.
    if (samples[samples.length - 1].verdict === SAMPLE_VERDICTS.GREEN) break;
  }

  const outcome = verdictFor(samples);
  const resolved = outcome.verdict === PROBE_VERDICTS.RED ? await resolveServingSha(process.env.VERCEL_TOKEN) : {};
  const servingSha = resolved.sha ?? null;
  const engine = engineArgsFor({ verdict: outcome.verdict, servingSha, reason: outcome.reason, origin });

  const payload = {
    verdict: outcome.verdict,
    reason: outcome.reason,
    origin,
    servingSha,
    servingResolveError: resolved.error ?? null,
    samples: samples.map((s) => ({ verdict: s.verdict, status: s.status, entrySrc: s.entrySrc, entryStatus: s.entryStatus, reason: s.reason })),
    engine,
    limits: PROBE_LIMITS,
  };

  if (outcome.verdict === PROBE_VERDICTS.GREEN) {
    return finish(0, payload, `serving-green: ${outcome.reason}\n(no green anchor is written from here -- that is CI's verdict, at runbook step 4a.)`);
  }
  if (outcome.verdict === PROBE_VERDICTS.RED) {
    return finish(
      1,
      payload,
      `serving-red: ${outcome.reason}\n` +
        (engine
          ? `hand this to the engine:\n  node scripts/rollback-on-red.js --apply --json --trigger=deploy-red --sha=${engine.sha} --cycle-id=<your cycle id> --watermark=<current> --jobs='${JSON.stringify(engine.jobs)}'`
          : `no engine invocation: ${resolved.error ?? "the serving commit could not be resolved"} -- there is nothing to attribute, so nothing is triggered. dev being down is still step 4's blocker.`)
    );
  }
  return finish(2, payload, `unknown (could not run / could not tell): ${outcome.reason}\nThis is NOT a pass and NOT a trigger.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => finish(2, { verdict: PROBE_VERDICTS.UNKNOWN, reason: `check-deploy-serving crashed: ${e.stack ?? e.message}` }, `crashed: ${e.message}`));
}
