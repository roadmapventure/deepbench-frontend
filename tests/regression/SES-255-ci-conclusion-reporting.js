// DeepBench v7.0.339 | tests/regression/SES-255-ci-conclusion-reporting.js | SES-255 (Selfbuild M4)
//
// Guards the ship that made the green anchor recordable at all. runner-cycle.md step 4a requires an
// unattended cycle to hand CI's conclusion to scripts/rollback-on-red.js as `--jobs`; the engine
// holds no credential by John's own SES-182 design, and the READ was unexecutable here -- the
// GitHub REST listing for one run on dev returned ~71,000 characters three times running (71,371
// then 71,575, measured live), overflowing the agent tool-result cap into the B39 permission-gated
// path, while raw HTTPS to api.github.com is refused by the session proxy regardless of credential.
// So ci.yml now publishes its own grade to public.ci_run_conclusions and the cycle reads THAT.
//
// THE ASSERTION THAT DOES THE WORK IS `needs` COVERAGE, AND IT IS COMPUTED, NOT LISTED. A row in
// ci_run_conclusions is only an anchor if it carries EVERY blocking job -- decide()'s isRunGreen()
// requires all of them to be `success`, so a job missing from `needs` is a job whose failure the
// anchor silently forgets, and the run still goes green. Hardcoding `["build","checks"]` here would
// pass forever on a file that grew a fourth job; the set is therefore derived from the shipped YAML
// and differenced. That is the one edit this file forbids.
//
// THE TWO GUARDS ARE ASSERTED SEPARATELY BECAUSE THEY FAIL IN OPPOSITE DIRECTIONS.
// `always()` alone: a run whose `checks` job FAILED -- the case the anchor most needs -- is skipped
// by the default success() condition, so the red never reaches the ledger.
// `github.event_name == 'push'` alone: on a fork PR both secrets resolve to the empty string by
// GitHub's design, so without it the job paints an innocent contributor's PR red and writes rows
// for PR-branch shas that were never pushed to dev.
//
// FILE-LEVEL NEGATIVE CONTROL (the SES-182c pattern): the same static assertions are run against
// `git show origin/dev:.github/workflows/ci.yml` and MUST fail there. Without it every assertion
// below could be vacuously true of some other file, and a reader could not tell this guard from one
// that merely describes a workflow. If the control cannot run (no git, no origin/dev) it is
// DECLARED not-run rather than passed -- an unrunnable control is not a control.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CI_YML = path.join(REPO, ".github", "workflows", "ci.yml");
const REPORTER = "report-conclusion";
const TABLE = "ci_run_conclusions";

// GitHub's own conclusion vocabulary. `cancelled` and `skipped` are the COULD-NOT-TELL half that
// step 4a's third verdict exists for -- admitted as values, never as a red.
const GITHUB_CONCLUSIONS = ["success", "failure", "cancelled", "skipped"];

// ---------------------------------------------------------------------------
// YAML shape helpers -- deliberately string-scoped, never a YAML parser dependency.
// ---------------------------------------------------------------------------

// Top-level job keys: two-space-indented `name:` lines under `jobs:`. Scoped to the region after
// `jobs:` so the header's prose (which names every job) cannot contribute a phantom key -- the
// check-11 defect SES-180 (c) already had to design around in this same file.
function jobKeys(yml) {
  const start = yml.indexOf("\njobs:\n");
  assert.notStrictEqual(start, -1, "ci.yml must define a top-level `jobs:` block");
  const body = yml.slice(start + "\njobs:\n".length);
  return [...body.matchAll(/^ {2}([A-Za-z][\w-]*):$/gm)].map((m) => m[1]);
}

// One job's body: its own key to the next top-level job key or end of file.
function jobBody(yml, key) {
  const start = yml.indexOf(`\n  ${key}:\n`);
  assert.notStrictEqual(start, -1, `ci.yml must define a \`${key}:\` job`);
  const rest = yml.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[A-Za-z][\w-]*:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

function needsOf(body) {
  const m = body.match(/^\s*needs:\s*\[([^\]]*)\]/m);
  if (!m) return [];
  return m[1].split(",").map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// (A) Static assertions over the shipped workflow. Run against BOTH the working tree (must pass)
//     and origin/dev (must fail) -- so `yml` is a parameter, never a module-level read.
// ---------------------------------------------------------------------------
function assertReporterIsCorrect(yml) {
  const keys = jobKeys(yml);
  assert.ok(
    keys.includes(REPORTER),
    `ci.yml must define a \`${REPORTER}\` job -- without it nothing writes public.${TABLE} and ` +
      "step 4a's green anchor has no source at all.",
  );

  const body = jobBody(yml, REPORTER);

  // THE COMPUTED COVERAGE ASSERTION. Every other job in the file must appear in `needs`.
  const others = keys.filter((k) => k !== REPORTER);
  const needs = needsOf(body);
  const missing = others.filter((k) => !needs.includes(k));
  assert.deepStrictEqual(
    missing,
    [],
    `\`${REPORTER}\` must declare every other job in \`needs\` -- missing: ${missing.join(", ")}. ` +
      "A blocking job absent from `needs` is one whose failure the anchor forgets, and isRunGreen() " +
      "then reads an incomplete set as a green run. Add the job here, never trim this assertion.",
  );
  assert.ok(others.length > 0, "ci.yml must still define blocking jobs for the reporter to depend on");

  // Both guards, separately, with the reason each exists in the failure message.
  assert.ok(
    /^\s*if:\s*always\(\)\s*&&\s*github\.event_name\s*==\s*'push'\s*$/m.test(body),
    `\`${REPORTER}\` must carry \`if: always() && github.event_name == 'push'\`. ` +
      "always() so a FAILED checks job -- the case the anchor most needs -- still reports; the push " +
      "guard because a fork PR resolves both secrets to the empty string, which would fail the curl " +
      "on an innocent contributor's PR and write rows for shas never pushed to dev.",
  );

  // The credentials must be the two that ALREADY exist (SES-180 (d)). A third secret name here
  // would be provisioning, which the ticket's own decision boundary reserves to John.
  for (const secret of ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]) {
    assert.ok(
      new RegExp(`\\$\\{\\{\\s*secrets\\.${secret}\\s*\\}\\}`).test(body),
      `\`${REPORTER}\` must read ${secret} from repository secrets.`,
    );
  }
  assert.ok(
    !/\bsecrets\.(?!SUPABASE_URL|SUPABASE_SERVICE_KEY)[A-Z_]+/.test(body),
    `\`${REPORTER}\` must use ONLY the two secrets SES-180 (d) already exposes. Naming a new one is ` +
      "provisioning a credential, which SES-255's own decision boundary reserves to John.",
  );

  // It must target the table, and upsert rather than duplicate on a re-run.
  assert.ok(body.includes(`/rest/v1/${TABLE}?on_conflict=commit_sha`), `it must POST to ${TABLE} upserting on commit_sha`);
  assert.ok(/Prefer:\s*resolution=merge-duplicates/.test(body), "the upsert needs `Prefer: resolution=merge-duplicates`");

  // needs.<job>.result, never job.status: the reporter grades the OTHERS, not itself.
  for (const k of others) {
    assert.ok(
      new RegExp(`needs\\.${k}\\.result`).test(body),
      `\`${REPORTER}\` must read needs.${k}.result -- its own status is not evidence about ${k}.`,
    );
  }
}

function workingTreeReporterIsCorrect() {
  assertReporterIsCorrect(fs.readFileSync(CI_YML, "utf8"));
}

// ---------------------------------------------------------------------------
// (B) File-level negative control: the same assertions MUST fail on origin/dev.
// ---------------------------------------------------------------------------
function originDevFailsTheSameAssertions() {
  const show = spawnSync("git", ["-C", REPO, "show", "origin/dev:.github/workflows/ci.yml"], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (show.status !== 0 || !show.stdout) {
    notRun(
      "the file-level negative control (origin/dev's ci.yml must FAIL these assertions)",
      "git show origin/dev:.github/workflows/ci.yml did not resolve here -- run `git fetch origin dev` " +
        "in a checkout with the remote configured and re-run. An unrunnable control is declared, " +
        "never counted as a pass.",
    );
    return;
  }
  let threw = false;
  try {
    assertReporterIsCorrect(show.stdout);
  } catch {
    threw = true;
  }
  assert.ok(
    threw,
    "origin/dev's ci.yml PASSED the reporter assertions -- so they assert nothing this ship added. " +
      "Either the change already landed (re-baseline this control) or the assertions above have been " +
      "weakened into something true of any workflow.",
  );
}

// ---------------------------------------------------------------------------
// (C) Credentialed half: the table exists and any row already in it is shaped as step 4a reads it.
// ---------------------------------------------------------------------------
async function tableExistsAndRowsAreWellShaped() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun(
      `public.${TABLE} exists and its rows carry jobs as [{name, conclusion}]`,
      "needs SUPABASE_URL and SUPABASE_SERVICE_KEY -- re-run with " +
        "`SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node tests/regression/SES-255-ci-conclusion-reporting.js`",
    );
    return;
  }
  const res = await fetch(
    `${base.replace(/\/$/, "")}/rest/v1/${TABLE}?select=commit_sha,run_id,jobs&limit=20`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  assert.strictEqual(
    res.status,
    200,
    `public.${TABLE} must be readable with the service key (got ${res.status}) -- step 4a reads it every cycle.`,
  );
  const rows = await res.json();
  assert.ok(Array.isArray(rows), "the REST read must return an array");

  for (const row of rows) {
    assert.ok(Array.isArray(row.jobs), `${row.commit_sha}: jobs must be an ARRAY -- --jobs is handed to the engine verbatim`);
    for (const j of row.jobs) {
      assert.ok(j && typeof j.name === "string" && j.name.length > 0, `${row.commit_sha}: every job needs a name`);
      assert.ok(
        GITHUB_CONCLUSIONS.includes(j.conclusion),
        `${row.commit_sha}: conclusion '${j.conclusion}' is outside GitHub's vocabulary ` +
          `(${GITHUB_CONCLUSIONS.join(", ")}). A value the engine does not recognise is read as ` +
          "not-green, and step 4a's third verdict depends on cancelled/skipped surviving intact.",
      );
    }
  }
}

export default async function run() {
  workingTreeReporterIsCorrect();
  originDevFailsTheSameAssertions();
  await tableExistsAndRowsAreWellShaped();
}

selfRun(import.meta.url, run);
