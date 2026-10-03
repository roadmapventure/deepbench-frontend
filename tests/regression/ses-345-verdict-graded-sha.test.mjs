// DeepBench v7.0.472 | tests/regression/ses-345-verdict-graded-sha.test.mjs | SES-345 -- THE VERDICT
// ROW CARRIES THE SHA IT GRADED. Leg 4 of the four-row handoff was never missing a FACT, it was
// missing a JOIN KEY: `ship_handoff_census` asked its sha question of `runner_cycles.item_id`, the
// CYCLE's claim about which ticket it ran, and 32 of the last 56 verdicts hang off one shared
// attended cycle covering 23 tickets. `runner_verdicts.graded_sha` is the VERDICT's own claim about
// the TREE, written by the lane that ran the gates.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (A) THE HELPER IS COMPARED AGAINST GIT, NOT AGAINST ITSELF. `gradedShaFor(REPO)` is asserted equal
// to a `git rev-parse HEAD` this file runs itself. A regex-shape assertion ("40 hex chars") would
// stay green against a helper that returned a hash of the wrong tree, which is the entire failure
// this column exists to make visible. The failure path is pinned too: a repo root that does not
// exist must return `null`, never throw -- a verdict whose sha could not be read is still a verdict.
//
// (B) THE KEY IS LAST, AND THE KEY SET IS THE agt-67 SET PLUS EXACTLY ONE. agt-67's shape guard
// compares the two lanes' key sets to each other, so it stays green if BOTH lanes lose the key.
// This arm anchors the count to the fixture shape agt-67 froze: `graded_sha` present, last, and the
// only addition. `gradedSha` omitted must give `null` and not `undefined` -- PostgREST drops an
// undefined key silently, so the column would be absent from the INSERT rather than explicitly null,
// and the two are different statements about whether the sha was read.
//
// (C) BOTH JUDGE LANES CARRY IT, ASSERTED ON THE SOURCE. The row key can be correct while the judge
// lanes hand the agent nothing -- this file's own SES-337 lesson is that the same key carrying less
// content in one lane than the other is a defect, and the `stored`/context path is how pass two gets
// the sha at all. So both `judgeCtx` literals must contain `graded_sha:`.
//
// (D) LIVE: THE COLUMN, ITS CONSTRAINT'S EFFECT, AND THE VIEW'S ONE ROW. The shape assertions above
// all pass against a column that was never migrated, so the live arm reads the real table.
//
// NO WRITE OF ANY KIND. Reads only, for agt-67's reason: inserting a fixture row here would poison
// the rolling verdict telemetry the reviewer lane produces.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { gradedShaFor, verdictRowFor } from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFIER_REL = "scripts/verifier.js";

// The row-shape fixture agt-67 froze, minus the new key -- kept here as its own literal so this
// file states what it expects rather than importing the other test's opinion of it.
const AGT67_KEYS = Object.freeze([
  "cycle_id", "backlog_id", "version", "verdict",
  "gate_build", "gate_regression", "gate_hygiene",
  "reasoning", "auto_done_eligible", "auto_done_reason",
  "epic_name", "priority_class",
]);

const FIXTURE_ARGS = Object.freeze({
  cycleId: "00000000-0000-4000-8000-000000000000", ticket: "SES-345", version: "v7.0.472",
  verdict: "approve", gateResults: { build: "green", regression: "green", hygiene: "green" },
  reasoning: "fixture", eligible: false, autoDoneReason: "why",
  epicName: "Governance Agents II", priorityClass: "P10 - Tooling",
});

export default async function run() {
  // -- (A) the helper, against git itself -------------------------------------------------------
  assert.strictEqual(typeof gradedShaFor, "function",
    "scripts/verifier.js must export gradedShaFor() -- the verdict's sha is read in one place");

  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" });
  assert.strictEqual(git.status, 0, `the test's own git rev-parse HEAD failed: ${git.stderr}`);
  const headSha = git.stdout.trim();
  assert.match(headSha, /^[0-9a-f]{40}$/, `git rev-parse HEAD returned something unexpected: ${headSha}`);
  assert.strictEqual(gradedShaFor(ROOT), headSha,
    "gradedShaFor(REPO) must equal the repo's actual HEAD -- compared against git, never against a " +
    "shape regex, because a hash of the WRONG tree is exactly the failure this column exists to catch");

  const missing = gradedShaFor("/nonexistent-" + Date.now());
  assert.strictEqual(missing, null,
    "gradedShaFor() on a non-existent repo root must return null, never throw and never a string -- " +
    `a verdict whose sha could not be read is still a verdict about the change. got: ${JSON.stringify(missing)}`);

  // -- (B) the row key: present, last, and the only addition ------------------------------------
  const withSha = verdictRowFor({ ...FIXTURE_ARGS, gradedSha: "a".repeat(40) });
  assert.strictEqual(withSha.graded_sha, "a".repeat(40),
    "verdictRowFor({ gradedSha }) must put the sha on the row as `graded_sha`");

  const withoutSha = verdictRowFor({ ...FIXTURE_ARGS });
  assert.strictEqual(withoutSha.graded_sha, null,
    "an omitted gradedSha must record an explicit null, not undefined -- PostgREST drops an " +
    "undefined key, which writes 'the column was not part of this INSERT' instead of 'the sha " +
    `could not be read'. got: ${JSON.stringify(withoutSha.graded_sha)}`);

  const keys = Object.keys(withSha);
  assert.strictEqual(keys[keys.length - 1], "graded_sha",
    `graded_sha must be the LAST key on the row. got: ${keys.join(", ")}`);
  assert.deepStrictEqual(keys, [...AGT67_KEYS, "graded_sha"],
    "the verdict row must be the agt-67 key set plus graded_sha and nothing else -- agt-67's own " +
    "guard compares the two LANES to each other and stays green if both lose the key, so the count " +
    `is anchored here instead. got: ${keys.join(", ")}`);
  // NEGATIVE CONTROL: the predicate is an ordered key comparison, so it must notice the key missing.
  assert.notDeepStrictEqual(AGT67_KEYS.slice(), [...AGT67_KEYS, "graded_sha"]);

  // -- (C) both judge lanes, on the source ------------------------------------------------------
  const src = fs.readFileSync(path.join(ROOT, VERIFIER_REL), "utf8");
  const refs = src.match(/gradedSha/g) || [];
  assert.ok(refs.length >= 6,
    `${VERIFIER_REL} must thread gradedSha through the helper, the row, the mechanical lane, both ` +
    `judge lanes and both insert calls -- at least 6 references. got: ${refs.length}`);

  const judgeCtxLiterals = src.split(/const judgeCtx = \{/).slice(1);
  assert.strictEqual(judgeCtxLiterals.length, 2,
    `${VERIFIER_REL} must still have exactly two judgeCtx literals (session and executor). ` +
    `got: ${judgeCtxLiterals.length}`);
  for (const [i, block] of judgeCtxLiterals.entries()) {
    const head = block.slice(0, 4000);
    assert.ok(/graded_sha:/.test(head),
      `judgeCtx literal ${i + 1} must carry graded_sha: -- the same evidence key in BOTH lanes, or ` +
      "one judge grades with a fact the other never sees (this file's SES-337 lesson)");
  }

  // -- (D) live arm -----------------------------------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("SES-345 live arm (runner_verdicts.graded_sha + the ship_handoff_census sha leg)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name " +
      "(docs/runbooks/session-setup.md step 1b) and re-run: " +
      "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js");
    return;
  }

  const H = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
  const rest = async p => {
    const r = await fetch(`${url}/rest/v1/${p}`, { headers: H });
    if (!r.ok) throw new Error(`GET ${p} -> ${r.status} ${await r.text()}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };

  // The column is real and readable by the writer role. A 42703 here is the pre-change state.
  await rest("runner_verdicts?select=graded_sha&limit=1");

  const shas = await rest("runner_verdicts?select=id,graded_sha&graded_sha=not.is.null");
  for (const row of shas) {
    assert.match(row.graded_sha, /^[0-9a-f]{7,40}$/,
      `runner_verdicts ${row.id} carries a graded_sha the CHECK constraint should have refused: ` +
      `${JSON.stringify(row.graded_sha)}`);
  }

  const census = await rest("ship_handoff_census?select=*");
  assert.strictEqual(census.length, 1,
    `ship_handoff_census must be a one-row summary. got ${census.length} rows`);
  const c = census[0];
  assert.ok(c.missing_sha <= c.ships,
    `ship_handoff_census.missing_sha (${c.missing_sha}) cannot exceed ships (${c.ships}) -- a leg ` +
    "counting more misses than ships is the join having gone cartesian");

  console.log(`[SES-345] gradedShaFor() == git HEAD ${headSha.slice(0, 7)}; graded_sha is the last ` +
    `verdict-row key; ${shas.length} verdict rows carry a sha, all hex; census ships ${c.ships}, ` +
    `all four ${c.ships_all_four}, missing sha ${c.missing_sha}`);
}

selfRun(import.meta.url, run);
