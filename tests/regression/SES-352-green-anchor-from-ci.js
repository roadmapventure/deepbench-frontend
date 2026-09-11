// DeepBench v7.0.452 | tests/regression/SES-352-green-anchor-from-ci.js | SES-352
//
// Guards the ship that made the green anchor CI's OWN record instead of a cycle's memory of it.
// `runner_green_states` -- the anchor scripts/rollback-on-red.js measures every red against -- was
// written only by runner-cycle.md step 4a, which runs only when a cycle is up AND dev's head is
// green at that minute. Measured 2026-09-11 before the ship: newest anchor 2026-09-02 15:08Z,
// newest all-success ci_run_conclusions row 2026-09-10 03:24Z, 63 greens in between with no anchor.
// The five cycles of 2026-09-09 ran during 16 greens and recorded none.
//
// THE FIX IS A TRIGGER, NOT A CALLER. `trg_anchor_green_from_ci` on public.ci_run_conclusions
// inserts the anchor the moment ci.yml's report-conclusion job publishes an all-success run for
// ref = 'dev', stamping `migration_watermark_at(concluded_at)` -- the watermark at the moment CI
// concluded. Nothing in verifier.js (verdict-only: writes exactly one row) or record_ship_decision()
// (runs before CI has concluded) is asked to call anything.
//
// THE BRANCH GUARD IS LOAD-BEARING. ci.yml runs on pushes to dev AND main, and origin/main is NOT
// an ancestor of origin/dev (merge commits on main). An anchor for a main-only sha would hand the
// engine `git revert <non-ancestor>..<head>`, which reverts far more than the red range. So the
// reporter now publishes `ref` (github.ref_name), the trigger anchors ref = 'dev' only, and a NULL
// ref -- a run still on the pre-ship workflow -- anchors nothing (unknown is not innocent).
//
// THE PREDICATE HAS TWO HOMES ON PURPOSE AND THIS FILE IS WHAT KEEPS THEM ONE RULE. The engine's
// isRunGreen() decides greenness for a `--jobs` array a cycle hands in; `ci_conclusion_is_green()`
// decides it for the row CI wrote. Clause (C) runs the SAME fixtures through both and asserts they
// agree -- the empty run, `cancelled`, `skipped` and a single `failure` are all NOT green in both.
//
// EVERY CLAUSE FAILS ON THE PRE-SHIP TREE AND DATABASE (dry-run recorded in the kickoff): the
// reporter published no ref, step 4a named no trigger, rpc/ci_conclusion_is_green did not exist,
// ci_run_conclusions had no `ref` column, and af981b16 (the newest green) had no anchor.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun, notRun } from "./_lib/self-run.js";
import { isRunGreen } from "../../scripts/rollback-on-red.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CI_YML = path.join(REPO, ".github", "workflows", "ci.yml");
const RUNBOOK = path.join(REPO, "docs", "runbooks", "runner-cycle.md");

export const TRIGGER_NAME = "trg_anchor_green_from_ci";
export const PREDICATE_FN = "ci_conclusion_is_green";
export const WATERMARK_FN = "migration_watermark_at";
export const ANCHOR_BRANCH = "dev";

// The two blocking jobs exactly as ci.yml names them. GitHub's conclusion vocabulary is
// success | failure | cancelled | skipped; only the first is green.
const JOB = (name, conclusion) => ({ name, conclusion });
const BUILD = "Build (blocking)";
const CHECKS = "Tripwire + regression (blocking)";
export const FIXTURES = Object.freeze([
  { label: "both blocking jobs success", jobs: [JOB(BUILD, "success"), JOB(CHECKS, "success")] },
  { label: "checks failed", jobs: [JOB(BUILD, "success"), JOB(CHECKS, "failure")] },
  { label: "both cancelled (superseded run)", jobs: [JOB(BUILD, "cancelled"), JOB(CHECKS, "cancelled")] },
  { label: "checks skipped", jobs: [JOB(BUILD, "success"), JOB(CHECKS, "skipped")] },
  { label: "no jobs reported", jobs: [] },
]);

// ---------------------------------------------------------------------------
// (A) ci.yml publishes the branch. Scoped to the reporter job so the header prose cannot satisfy it.
// ---------------------------------------------------------------------------
function reporterBody(yml) {
  const i = yml.indexOf("\n  report-conclusion:\n");
  assert.notStrictEqual(i, -1, "ci.yml must still define the `report-conclusion` job (SES-255)");
  return yml.slice(i);
}

function ciPublishesTheBranch() {
  const body = reporterBody(fs.readFileSync(CI_YML, "utf8"));
  assert.ok(
    /--arg\s+ref\s+"\$\{GITHUB_REF_NAME\}"/.test(body),
    "report-conclusion must hand jq `--arg ref \"${GITHUB_REF_NAME}\"` -- without the branch the " +
      "trigger cannot tell a dev push from a main merge, and a main-only sha as anchor reverts past the red range.",
  );
  assert.ok(
    /\bref:\s*\$ref\b/.test(body),
    "the jq body must carry `ref: $ref` so the row's `ref` column is written.",
  );
}

// ---------------------------------------------------------------------------
// (B) Step 4a names the trigger -- the cycle must know the anchor is already written on a green.
// ---------------------------------------------------------------------------
function step4aNamesTheTrigger() {
  const md = fs.readFileSync(RUNBOOK, "utf8");
  const start = md.indexOf("**4a. THE GREEN ANCHOR");
  const end = md.indexOf("**4a-bis.", start);
  assert.ok(start !== -1 && end > start, "step 4a must still be delimited by its own heading and 4a-bis");
  const step = md.slice(start, end);
  assert.ok(
    step.includes(TRIGGER_NAME),
    `runner-cycle.md step 4a must name ${TRIGGER_NAME} -- a cycle that still runs the engine's ` +
      "record-green on a green overwrites the conclusion-time watermark with the sweep-time one.",
  );
}

// ---------------------------------------------------------------------------
// Credentialed half. Reads only; the fixture seam proof (insert -> anchor -> cleanup) is the ship's
// own QA and is deliberately not repeated against production on every suite run.
// ---------------------------------------------------------------------------
async function rpc(base, key, fn, body) {
  const res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

async function get(base, key, pathAndQuery) {
  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return { status: res.status, rows: res.status === 200 ? await res.json() : null, body: res.status === 200 ? "" : await res.text() };
}

async function credentialedHalf() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun(
      `rpc/${PREDICATE_FN} agrees with isRunGreen(); the newest green ${ANCHOR_BRANCH} conclusion is anchored with its conclusion-time watermark`,
      "needs SUPABASE_URL and SUPABASE_SERVICE_KEY -- re-run with " +
        "`SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node tests/regression/SES-352-green-anchor-from-ci.js`",
    );
    return;
  }

  // (C) the SQL predicate and the engine's isRunGreen() are one rule.
  for (const f of FIXTURES) {
    const r = await rpc(base, key, PREDICATE_FN, { p_jobs: f.jobs });
    assert.strictEqual(r.status, 200, `rpc/${PREDICATE_FN} must exist and answer (got ${r.status}: ${r.body.slice(0, 200)})`);
    assert.strictEqual(
      JSON.parse(r.body),
      isRunGreen(f.jobs),
      `${PREDICATE_FN}() and isRunGreen() disagree on "${f.label}" -- two homes for one rule have drifted.`,
    );
  }

  // (D) the newest green dev conclusion has an anchor carrying the watermark of its own moment.
  const c = await get(base, key, "ci_run_conclusions?select=commit_sha,run_id,jobs,concluded_at,ref&order=concluded_at.desc&limit=200");
  assert.strictEqual(c.status, 200, `ci_run_conclusions must be readable WITH its ref column (got ${c.status}: ${c.body.slice(0, 200)})`);
  const newest = c.rows.find((r) => r.ref === ANCHOR_BRANCH && isRunGreen(r.jobs));
  assert.ok(newest, `no green ${ANCHOR_BRANCH} conclusion in the newest 200 ci_run_conclusions rows -- either CI has not been green in 200 pushes or ref is not being published.`);

  const a = await get(base, key, `runner_green_states?select=commit_sha,ci_run_id,migration_watermark,observed_at,observed_by_cycle&commit_sha=eq.${newest.commit_sha}`);
  assert.strictEqual(a.status, 200, `runner_green_states must be readable (got ${a.status})`);
  assert.strictEqual(
    a.rows.length,
    1,
    `the newest green ${ANCHOR_BRANCH} conclusion ${newest.commit_sha} (run ${newest.run_id}, ${newest.concluded_at}) has no runner_green_states row -- ` +
      `${TRIGGER_NAME} did not fire, or the backfill did not land. A red today would be measured against an older commit.`,
  );
  const anchor = a.rows[0];
  assert.strictEqual(String(anchor.ci_run_id), String(newest.run_id), "the anchor must cite the CI run that graded it");
  assert.ok(anchor.migration_watermark, "the anchor must carry a migration watermark -- an unknown watermark is read as moved and cards every red");
  if (anchor.observed_by_cycle === null) {
    // Written by the trigger or the backfill: the watermark is the one at observed_at (= concluded_at).
    // A cycle that later re-recorded the sha (observed_by_cycle set) may carry its sweep-time read.
    const w = await rpc(base, key, WATERMARK_FN, { p_at: anchor.observed_at });
    assert.strictEqual(w.status, 200, `rpc/${WATERMARK_FN} must exist and answer (got ${w.status}: ${w.body.slice(0, 200)})`);
    assert.strictEqual(
      anchor.migration_watermark,
      JSON.parse(w.body),
      `anchor ${anchor.commit_sha} carries watermark ${anchor.migration_watermark} but the watermark at its observed_at is ${w.body} -- the anchor must record the schema as it stood when CI concluded, not later.`,
    );
  }

  // (E) THE TICKET'S OWN QA: the newest anchor is at least as new as the newest green dev conclusion.
  const top = await get(base, key, "runner_green_states?select=commit_sha,observed_at&order=observed_at.desc&limit=1");
  assert.strictEqual(top.status, 200);
  assert.ok(top.rows.length === 1, "runner_green_states must hold at least one anchor");
  assert.ok(
    Date.parse(top.rows[0].observed_at) >= Date.parse(newest.concluded_at),
    `max(observed_at) in runner_green_states is ${top.rows[0].observed_at} (${top.rows[0].commit_sha}) but the newest green ${ANCHOR_BRANCH} conclusion is ${newest.concluded_at} (${newest.commit_sha}) -- the anchor is stale.`,
  );
}

export default async function run() {
  ciPublishesTheBranch();
  step4aNamesTheTrigger();
  await credentialedHalf();
}

selfRun(import.meta.url, run);
