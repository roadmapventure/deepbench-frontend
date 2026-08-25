// DeepBench v7.0.254 | scripts/lib/build-currency.mjs | SES-58 -- a build landing mid-run is
// DETECTED, so 24 cases are never silently attributed to one commit.
//
// THE BUG THIS EXISTS FOR. scripts/check-deploy-current.js (SES-015) is run ONCE, by hand, before
// case 1, and the driver never calls it. It proves the commit under test is INCLUDED in the serving
// build; it says nothing about cases 2-24. Measured (S-DAT-12-design, John's question, 2026-07-29):
// the only full-run-length attempt on record ran 134 minutes and 38 commits landed on `dev` inside
// that window, 3 of them touching src/api/lib. `dev` took 11-30 commits/hour during working hours.
// Overlap is near-certain, not unlucky -- and re-measured at THIS ship, 2026-08-25T05:45Z, the dev
// preview was serving 6ce6465 deployed 3.5 minutes earlier, with 64c5f70 (05:28Z) and 30020fd
// (05:00Z) behind it: three builds in 42 minutes. A run whose code changed underneath it cannot
// produce the clean-run evidence the beta gate's bucket 1 is defined by, and the report would
// attribute every case to one commit anyway, because nothing ever looked.
//
// THE PROPERTY THIS FILE TURNS ON, and the one-liner an editor will write instead: THE VERDICT HAS
// THREE VALUES AND `unknown` IS NOT `clean`. Writing `changed` as a bare boolean -- or defaulting an
// unresolvable sample to "no change" -- produces a run that reports a clean single-commit pass
// having never checked, which is strictly worse than the silence it replaces: it manufactures the
// very evidence bucket 1 requires. So `changed` is `true` | `false` | `null`, exactly the shape
// SES-71 gave `case_pass` and SES-181 gave a gate's status, and for the same reason. `null` is
// reachable in normal operation (no VERCEL_TOKEN, a Vercel API hiccup) and must stay loud.
//
// WHY `true` OUTRANKS `null` in the reducer below, which looks like an inconsistency and is not: an
// observed pair of differing SHAs is positive evidence that the build moved. A later unresolvable
// sample cannot un-observe it, so a detected change is never downgraded to "unknown". Uncertainty
// only ever suppresses the CLEAN verdict, never the dirty one -- the fail-closed direction.
//
// This module holds the pure reducer AND the one network call, split the way SES-71 split
// regression-outcome.mjs: the driver calls loadBypassSecret() at module scope and process.exit(1)s
// without credentials, so a guard that imported the driver could not run in CI and would have to
// re-implement what it guards (SES-45's defect). The sampler takes an injectable `fetchImpl` for
// exactly that reason -- tests/regression/SES-58-mid-run-build-detection.js drives it with a stub
// and never touches the network.
//
// ONE CONSTANT IS DUPLICATED AND IT IS NAMED RATHER THAN HIDDEN: the /v6/deployments URL also lives
// in check-deploy-current.js, which does not export it. The RULE that could actually drift --
// "which deployment is the preview really serving" -- is imported from there rather than restated,
// so it keeps one home; exporting the URL too would have meant a fourth file against this session's
// three-file cap. If a later ticket touches that script anyway, export VERCEL_APP and delete the
// copy below.

import { pickServing } from "../check-deploy-current.js";

const VERCEL_APP = "deepbench-frontend";
const DEPLOY_LIMIT = 40;

/**
 * Resolve the commit the dev preview is serving RIGHT NOW.
 * Never throws and never rejects: every failure comes back as `{ sha: null, reason }`, because a
 * sampler that can abort a 134-minute regression run is a worse bug than the one it detects.
 *
 * @returns {Promise<{sha: string|null, url: string|null, reason: string|null}>}
 */
export async function sampleServingCommit({ token, fetchImpl } = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  if (!token) {
    return { sha: null, url: null, reason: "VERCEL_TOKEN not set in this process's environment" };
  }
  if (typeof doFetch !== "function") {
    return { sha: null, url: null, reason: "no fetch implementation available" };
  }
  let res;
  try {
    res = await doFetch(`https://api.vercel.com/v6/deployments?app=${VERCEL_APP}&limit=${DEPLOY_LIMIT}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    return { sha: null, url: null, reason: `could not reach the Vercel API: ${e.message}` };
  }
  if (!res || !res.ok) {
    return { sha: null, url: null, reason: `Vercel API returned HTTP ${res?.status}` };
  }
  let body;
  try {
    body = await res.json();
  } catch (e) {
    return { sha: null, url: null, reason: `Vercel API returned unparseable JSON: ${e.message}` };
  }
  // Same rule as the SES-015 gate, imported rather than restated: a READY deployment that never
  // took the branch alias is not what the preview URL serves.
  const serving = pickServing(body.deployments || []);
  const sha = serving?.meta?.githubCommitSha || null;
  if (!sha) return { sha: null, url: null, reason: "no READY+aliased dev deployment exists right now" };
  return { sha, url: serving.url || null, reason: null };
}

/**
 * Did the build change during ONE case? Pure.
 * Returns true | false | null -- null when either end of the case was not resolvable, which is
 * "not checked", never "did not change".
 */
export function caseBuildChange(startSha, endSha) {
  if (!startSha || !endSha) return null;
  return startSha !== endSha;
}

/**
 * Reduce the run's ordered samples to the run-level verdict. Pure.
 *
 * `samples` is every sample in the order taken: { n, id, phase: "start"|"end", sha, reason }.
 * A sample with `sha: null` is unresolved and carries its `reason`.
 */
export function classifyBuildCurrency(samples) {
  const all = Array.isArray(samples) ? samples : [];
  const resolved = all.filter(s => s && s.sha);
  const unresolved = all.length - resolved.length;

  const transitions = [];
  for (let i = 1; i < resolved.length; i++) {
    const prev = resolved[i - 1];
    const cur = resolved[i];
    if (prev.sha === cur.sha) continue;
    transitions.push({
      from: prev.sha,
      to: cur.sha,
      // Which case was in flight when it moved. Same case on both ends => the build landed WHILE
      // that case was running, so that case itself is contaminated; different cases => it landed in
      // the gap between them, and the earlier case is still clean. A reader should not have to
      // re-derive that distinction to know which cases to throw away.
      boundary: prev.n === cur.n ? "during-case" : "between-cases",
      during_case_n: prev.n === cur.n ? prev.n : null,
      during_case_id: prev.n === cur.n ? prev.id : null,
      after_case_n: prev.n === cur.n ? null : prev.n,
      after_case_id: prev.n === cur.n ? null : prev.id,
    });
  }

  const distinct = [...new Set(resolved.map(s => s.sha))];

  // The three-value ladder. Order matters and is the header's fail-closed rule:
  //   observed change  ->  true    (positive evidence; uncertainty cannot un-observe it)
  //   any unresolved   ->  null    (we did not watch the whole run)
  //   >= 2 clean reads ->  false
  //   otherwise        ->  null    (0 or 1 reads is not a comparison)
  let changed;
  let reason;
  if (transitions.length > 0) {
    changed = true;
    reason = `the deployed build changed ${transitions.length} time(s) during this run (${distinct.length} distinct commits served)`;
  } else if (unresolved > 0) {
    changed = null;
    reason = `${unresolved} of ${all.length} build-currency samples could not be resolved, so this run is not evidence that one commit served every case`;
  } else if (resolved.length >= 2) {
    changed = false;
    reason = `all ${resolved.length} build-currency samples resolved to the same commit`;
  } else {
    changed = null;
    reason = `only ${resolved.length} build-currency sample(s) resolved -- a single reading cannot be compared against anything`;
  }

  return {
    changed,
    reason,
    transitions,
    distinct_commits: distinct,
    samples_resolved: resolved.length,
    samples_unresolved: unresolved,
    first_commit: resolved.length ? resolved[0].sha : null,
    last_commit: resolved.length ? resolved[resolved.length - 1].sha : null,
  };
}

/**
 * The run banner, or null when there is nothing to say. Pure.
 * Mirrors the driver's existing NOT-A-VALID / NOT-A-COMPLETE banners: a run that cannot be read as
 * single-commit evidence says so at the top of its own report, not in a field a reader must go
 * looking for.
 */
export function buildCurrencyBanner(verdict) {
  if (!verdict) return null;
  if (verdict.changed === true) {
    return `NOT A SINGLE-COMMIT REGRESSION RUN — ${verdict.reason}; cases before and after each change ran against different code`;
  }
  if (verdict.changed === null) {
    return `BUILD CURRENCY UNVERIFIED — ${verdict.reason}`;
  }
  return null;
}
