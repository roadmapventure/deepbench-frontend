// DeepBench v7.0.254 | tests/regression/SES-58-mid-run-build-detection.js | SES-58
//
// Guards the rule that a build landing MID-RUN is detected and reported, so a 24-case regression
// pass is never attributed to one commit that did not serve it -- scripts/lib/build-currency.mjs
// and the wiring in scripts/chi-true-regression.mjs.
//
// IT IMPORTS THE REAL FUNCTIONS rather than restating them (the SES-71 precedent in this
// directory): the driver calls loadBypassSecret() at module scope and process.exit(1)s without
// credentials, so a guard that imported the driver could not run in CI. The half that CANNOT be
// imported -- the wiring inside the driver: two samples per case, the per-case fields, the report
// block, the composed banner -- is asserted against the driver's source, the SES-64 precedent.
//
// EVERY ASSERTION HAS A NEGATIVE CONTROL. The controls that matter here all attack ONE property,
// because one property is what this ticket ships and one one-liner destroys it:
//
//   THE VERDICT HAS THREE VALUES AND `null` IS NOT `false`.
//
//   * `unknown-is-not-clean` -- samples that could not resolve must classify null, and the test
//     asserts that the boolean form an editor would write (`distinct.length > 1`) returns FALSE on
//     the identical input. That FALSE is the bug: a run that never checked, reporting clean.
//   * `observed-change-survives-uncertainty` -- a detected change followed by an unresolvable
//     sample stays `true`. Without this clause the obvious "any unresolved => null" simplification
//     passes every other assertion in this file while silently downgrading real evidence.
//   * `two-clean-reads-are-required` -- a single resolved sample is null, not false. A one-sample
//     run has nothing to compare against, and calling that clean is the same manufactured evidence
//     in its smallest form.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied (SES-180 (b)): it never calls the
// Vercel API and never executes a live 24-case run -- both need credentials this suite does not
// assume, and the run costs real money. sampleServingCommit() is exercised against stub fetches
// that assert its failure shapes; its success path against the real API is declared not-run.

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  sampleServingCommit,
  caseBuildChange,
  classifyBuildCurrency,
  buildCurrencyBanner,
} from "../../scripts/lib/build-currency.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRIVER_PATH = path.join(__dirname, "..", "..", "scripts", "chi-true-regression.mjs");

const A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const s = (n, phase, sha, reason = null) => ({ n, id: `case-${n}`, phase, sha, reason });

// The boolean form an editor would write instead of the three-value ladder. Kept here verbatim so
// the controls below compare against what would ACTUALLY ship, not a paraphrase of it.
const naiveChanged = samples => new Set(samples.filter(x => x.sha).map(x => x.sha)).size > 1;

export default async function run() {
  // ---- 1. caseBuildChange: three values, and null is not false -------------------------------
  assert.strictEqual(caseBuildChange(A, A), false, "same commit either side of a case is a real `false`");
  assert.strictEqual(caseBuildChange(A, B), true, "different commits either side of a case is a real `true`");
  assert.strictEqual(caseBuildChange(null, A), null,
    "an unresolved START must be null -- 'we could not look' is not 'it did not change'");
  assert.strictEqual(caseBuildChange(A, null), null, "an unresolved END must be null for the same reason");
  assert.strictEqual(caseBuildChange(null, null), null, "two unresolved ends are null, never false");
  // NEGATIVE CONTROL: the one-liner. `startSha !== endSha` alone returns TRUE on (null, "a") --
  // it would report a phantom mid-case build on every run without a token.
  assert.strictEqual(null !== A, true,
    "NEGATIVE CONTROL: the bare inequality reports a change on an unresolved sample; the null guard is what stops it");

  // ---- 2. classifyBuildCurrency: a clean run ------------------------------------------------
  const clean = classifyBuildCurrency([s(1, "start", A), s(1, "end", A), s(2, "start", A), s(2, "end", A)]);
  assert.strictEqual(clean.changed, false, "four resolved samples on one commit is a clean run");
  assert.strictEqual(clean.transitions.length, 0, "a clean run records no transitions");
  assert.deepStrictEqual(clean.distinct_commits, [A], "a clean run served exactly one commit");
  assert.strictEqual(clean.samples_unresolved, 0, "a clean run resolved every sample");

  // ---- 3. unknown-is-not-clean ---------------------------------------------------------------
  const unknown = classifyBuildCurrency([
    s(1, "start", null, "VERCEL_TOKEN not set in this process's environment"),
    s(1, "end", null, "VERCEL_TOKEN not set in this process's environment"),
  ]);
  assert.strictEqual(unknown.changed, null,
    "a run that resolved nothing is UNVERIFIED (null), never clean (false)");
  assert.ok(/could not be resolved/.test(unknown.reason),
    "the null verdict says WHY it could not be read, not merely that it could not");
  // NEGATIVE CONTROL, and this is the ticket's whole failure mode in one line: the boolean form
  // returns false -- "no change" -- over samples that were never taken.
  assert.strictEqual(naiveChanged([s(1, "start", null), s(1, "end", null)]), false,
    "NEGATIVE CONTROL: `distinct.length > 1` reports a NO-CHANGE clean run having checked nothing -- the three-value ladder is what stops it");

  // A partly-unresolved run is still unverified: one unwatched gap can hide a build.
  const partial = classifyBuildCurrency([s(1, "start", A), s(1, "end", null, "Vercel API returned HTTP 502"), s(2, "start", A), s(2, "end", A)]);
  assert.strictEqual(partial.changed, null,
    "ONE unresolved sample is enough to make the run unverified -- the gap is exactly where a build could have landed");
  assert.strictEqual(naiveChanged([s(1, "start", A), s(1, "end", null), s(2, "start", A), s(2, "end", A)]), false,
    "NEGATIVE CONTROL: the boolean form calls that same partly-blind run clean");

  // ---- 4. observed-change-survives-uncertainty ----------------------------------------------
  const changedThenBlind = classifyBuildCurrency([
    s(1, "start", A), s(1, "end", A),
    s(2, "start", B), s(2, "end", null, "could not reach the Vercel API: fetch failed"),
  ]);
  assert.strictEqual(changedThenBlind.changed, true,
    "a change already OBSERVED is positive evidence; a later unresolvable sample must not downgrade it to unknown");
  assert.strictEqual(changedThenBlind.samples_unresolved, 1, "the unresolved sample is still counted and reported");

  // ---- 5. two-clean-reads-are-required -------------------------------------------------------
  const single = classifyBuildCurrency([s(1, "start", A)]);
  assert.strictEqual(single.changed, null,
    "one resolved sample is null -- a single reading has nothing to be compared against");
  assert.strictEqual(classifyBuildCurrency([]).changed, null, "an empty run is null, never clean");
  assert.strictEqual(naiveChanged([s(1, "start", A)]), false,
    "NEGATIVE CONTROL: the boolean form calls a one-sample run clean");

  // ---- 6. the contamination boundary is NAMED, not left to the reader ------------------------
  const during = classifyBuildCurrency([s(7, "start", A), s(7, "end", B), s(8, "start", B), s(8, "end", B)]);
  assert.strictEqual(during.changed, true, "a build landing inside case 7 is a change");
  assert.strictEqual(during.transitions.length, 1, "one move produces one transition");
  assert.strictEqual(during.transitions[0].boundary, "during-case",
    "a change between a case's own start and end landed DURING that case -- that case is contaminated");
  assert.strictEqual(during.transitions[0].during_case_n, 7, "the contaminated case is named by number");
  assert.strictEqual(during.transitions[0].during_case_id, "case-7", "and by id, so a reader needs no lookup");

  const between = classifyBuildCurrency([s(7, "start", A), s(7, "end", A), s(8, "start", B), s(8, "end", B)]);
  assert.strictEqual(between.transitions[0].boundary, "between-cases",
    "a change between one case's end and the next case's start left the earlier case CLEAN");
  assert.strictEqual(between.transitions[0].after_case_n, 7, "the last clean case is named");
  assert.strictEqual(between.transitions[0].during_case_n, null,
    "a between-cases change contaminates no case, and must not name one");
  // NEGATIVE CONTROL: the distinction is real, not cosmetic -- identical SHA sequences, different
  // sampling positions, opposite answers about whether case 7's result can be trusted.
  assert.notStrictEqual(during.transitions[0].boundary, between.transitions[0].boundary,
    "NEGATIVE CONTROL: same two commits, and which case is throw-away depends on WHERE the samples fell");

  // ---- 7. the banner speaks on both non-clean verdicts, and stays silent on clean ------------
  assert.strictEqual(buildCurrencyBanner(clean), null, "a clean run adds no banner");
  assert.ok(/NOT A SINGLE-COMMIT REGRESSION RUN/.test(buildCurrencyBanner(during)),
    "a detected change banners the run");
  assert.ok(/BUILD CURRENCY UNVERIFIED/.test(buildCurrencyBanner(unknown)),
    "an UNVERIFIED run banners too -- silence there would read exactly like a clean run, which is the defect");
  assert.notStrictEqual(buildCurrencyBanner(during), buildCurrencyBanner(unknown),
    "NEGATIVE CONTROL: 'it moved' and 'nobody looked' are different sentences, not one hedge");

  // ---- 8. sampleServingCommit never throws, and never reports a SHA it did not get -----------
  const noToken = await sampleServingCommit({ token: null, fetchImpl: () => { throw new Error("must not be called"); } });
  assert.strictEqual(noToken.sha, null, "no token resolves no commit");
  assert.ok(/VERCEL_TOKEN/.test(noToken.reason), "and says the token is what is missing");

  const httpFail = await sampleServingCommit({ token: "t", fetchImpl: async () => ({ ok: false, status: 403 }) });
  assert.strictEqual(httpFail.sha, null, "an API error resolves no commit");
  assert.ok(/403/.test(httpFail.reason), "and carries the status rather than a generic failure");

  const threw = await sampleServingCommit({ token: "t", fetchImpl: async () => { throw new Error("fetch failed"); } });
  assert.strictEqual(threw.sha, null, "a network death resolves no commit");
  assert.ok(/could not reach/.test(threw.reason),
    "and is CAUGHT -- a sampler that throws would abort a 134-minute run over a transient, a worse bug than the one it detects");

  const ok = await sampleServingCommit({
    token: "t",
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ deployments: [
      { readyState: "READY", aliasAssigned: true, created: 2, url: "u2", meta: { githubCommitRef: "dev", githubCommitSha: B } },
      { readyState: "READY", aliasAssigned: true, created: 1, url: "u1", meta: { githubCommitRef: "dev", githubCommitSha: A } },
      { readyState: "BUILDING", aliasAssigned: false, created: 3, url: "u3", meta: { githubCommitRef: "dev", githubCommitSha: "cccc" } },
    ] }) }),
  });
  assert.strictEqual(ok.sha, B, "the NEWEST READY+aliased dev deployment is what the preview serves");
  assert.notStrictEqual(ok.sha, "cccc",
    "NEGATIVE CONTROL: a newer BUILDING deployment is not yet serving -- reading it would report a commit no case ran against");

  // The live arm RUNS when the credential is there, and is declared not-run only when it is not.
  // Declaring it unconditionally would report a gap that did not exist -- the mirror of the defect
  // SES-180 (b) and SES-61 are both written about, and the one this ticket is least entitled to
  // make, since "unknown is not clean" is its own headline. It asserts SHAPE, never a specific
  // commit: the tip moves by design, and a test that pinned it would fail on the next push.
  if (process.env.VERCEL_TOKEN) {
    const live = await sampleServingCommit({ token: process.env.VERCEL_TOKEN });
    if (live.sha) {
      assert.match(live.sha, /^[0-9a-f]{40}$/, "a resolved serving commit is a full 40-hex SHA");
      assert.strictEqual(live.reason, null, "a resolved sample carries no failure reason");
      assert.strictEqual(caseBuildChange(live.sha, live.sha), false,
        "the live SHA round-trips through the real comparator as a clean case");
    } else {
      // Not a failure: the API being unreachable is exactly the null path this ticket ships. It is
      // declared rather than asserted so a transient outage can never paint the suite red.
      notRun("sampleServingCommit's live SUCCESS path",
        `VERCEL_TOKEN was present but the API resolved no serving commit: ${live.reason}`);
    }
  } else {
    notRun(
      "sampleServingCommit against the live Vercel API",
      "VERCEL_TOKEN is not set in this environment; the failure shapes and the pickServing rule are asserted against stub fetches above"
    );
  }
  notRun(
    "a live 24-case run with a build landing mid-run",
    "a full pass costs real money and ~134 minutes; the driver wiring is asserted against its source below"
  );

  // ---- 9. the driver wiring -- the half that cannot be imported ------------------------------
  const source = fs.readFileSync(DRIVER_PATH, "utf8");

  assert.ok(/sampleFor\(selected\[i\], "start"\)/.test(source) && /sampleFor\(selected\[i\], "end"\)/.test(source),
    "the driver samples TWICE per case, either side of it");
  // NEGATIVE CONTROL: one sample per case cannot tell a build that landed DURING a case from one
  // that landed between two, which is section 6's whole distinction.
  assert.ok(source.indexOf('sampleFor(selected[i], "start")') < source.indexOf("runOneCase(selected[i])"),
    "the start sample is taken BEFORE the case runs, not after it");
  assert.ok(source.indexOf("runOneCase(selected[i])") < source.indexOf('sampleFor(selected[i], "end")'),
    "the end sample is taken AFTER the case runs -- two samples on the same side would prove nothing");

  assert.ok(/record\.serving_commit_start = beforeSample\.sha/.test(source)
    && /record\.serving_commit_end = afterSample\.sha/.test(source),
    "every case record carries the commit that served it, which is what the ticket asks for");
  assert.ok(/record\.build_changed_during_case = caseBuildChange\(/.test(source),
    "the per-case verdict comes from the shared three-value function, not an inline `!==`");
  assert.ok(!/record\.build_changed_during_case = beforeSample\.sha !== afterSample\.sha/.test(source),
    "NEGATIVE CONTROL: the inline inequality is absent -- it would fire on every unresolved sample");

  assert.ok(/build_currency = classifyBuildCurrency\(buildSamples\)/.test(source),
    "the run verdict is reduced by the shared function over every sample in order");
  assert.ok(/^\s*build_currency,$/m.test(source),
    "the verdict block reaches REPORT_JSON -- a check whose result never lands in the report is not a check");
  assert.ok(/serving_commit_start: null, serving_commit_end: null, build_changed_during_case: null/.test(source),
    "cases the abort skipped carry EXPLICIT nulls; absent keys would read as clean to a truthiness test");

  assert.ok(/buildCurrencyBanner/.test(source) && /\.filter\(Boolean\)\.join\(" \| "\)/.test(source),
    "the build-currency banner is composed WITH the existing banners, not in place of one of them");
  // NEGATIVE CONTROL: the pre-change ternary returned a single string, so adding the new banner as
  // another branch would have silently dropped whichever condition lost.
  assert.ok(!/banner: SKIP_JUDGE\s*\n\s*\?/.test(source),
    "NEGATIVE CONTROL: the single-value ternary that could only ever report one banner is gone");

  assert.ok(/process\.env\.VERCEL_TOKEN \|\| null/.test(source),
    "the token comes from the environment");
  assert.ok(!/console\.log\([^)]*VERCEL_TOKEN[^)]*\)\s*;?\s*$/m.test(source.replace(/not set/g, "")),
    "NEGATIVE CONTROL: the token value is never printed -- only the commit it resolves reaches the log");
}

selfRun(import.meta.url, run);
