// DeepBench v7.0.335 | tests/regression/SES-182d-restore-plan.js | SES-182 slice 4 — the data
// restore PLAN. Guards the two things this slice can lose silently:
//
//   (1) THE TWO REFUSAL GROUNDS STAY SEPARATE. 'refused' with a stale reason means CHECKED AND IT
//       MOVED; 'unverifiable' means CANNOT CHECK. The negative control below is the retired
//       "not restorable" form — one bucket for both — applied to the SAME fixture and asserted to
//       LOSE, so this file proves a DIFFERENCE rather than a property both forms share.
//   (2) "NOTHING IS REPLAYED" SURVIVES EVERY BRANCH, including the branch where the plan could not
//       be read at all. A plan that cannot be fetched is UNKNOWN, never "nothing to restore" — the
//       same fail-closed direction `--migrations` takes when it is omitted on a red.
//
// THE SHAPE OF THIS FILE IS LOAD-BEARING AND IT COST THIS CYCLE A RED TO LEARN: run-all.js IMPORTS
// each test and awaits its DEFAULT EXPORT (run-all.js:142-146). A test written as a top-level
// script that calls process.exit() does not fail — it terminates the whole suite mid-run, silently
// skipping every later file and exiting 0, which reports GREEN. The first draft of this file did
// exactly that and the verifier approved on it. Export a default async function that THROWS, and
// let selfRun() handle the direct-run path.
//
// The SQL half (catalog pk resolution, the ledger denylist, the oldest-image-per-pk collapse) is
// asserted live against real Supabase when credentials are present, and declares a NOT-RUN part
// otherwise (SES-135's keep-tests policy, decided on card 1abe473a).

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  summarizeRestorePlan,
  buildIncidentCard,
  readRestorePlan,
  RESTORE_CLASSES,
  RESTORE_REASON_CAP,
  ACTIONS,
} from "../../scripts/rollback-on-red.js";

// One fixture, used by the shipped form and by every control, so a difference is the CHANGE and
// never a different input. It carries one of each class on purpose.
const FIXTURE = [
  { classification: "restorable",   action: "delete", src_table: "vision_claims",
    reason: "the range inserted this row and nothing has written it since -- the undo is a delete by primary key" },
  { classification: "restorable",   action: "upsert", src_table: "backlog_items",
    reason: "the prior row state is stored and nothing has written it since -- the undo is a restore of that row at its primary key" },
  { classification: "unverifiable", action: "upsert", src_table: "briefing_dom_ids",
    reason: "the table carries no updated_at column, so a later legitimate write to this row cannot be ruled out" },
  { classification: "refused",      action: null,     src_table: "backlog_items",
    reason: "the row has been written since this image was taken (updated_at 2026-08-23 22:49:43+00) -- restoring would clobber a later write" },
  { classification: "refused",      action: null,     src_table: "runner_items",
    reason: "ledger table -- the runner's own record of this incident; its undo is the Reverse ceremony, never a row replay" },
  { classification: "refused",      action: null,     src_table: "pg_proc:scheduler_gate",
    reason: "not a table in public -- this before-image labels a DDL or provenance action, not a row" },
];

// THE NEGATIVE CONTROL: the retired form that collapses everything non-restorable into one bucket.
// It is the shape a later editor reaches for when the card feels wordy.
function retiredCollapsedSummary(plan) {
  const restorable = plan.filter((p) => p.classification === "restorable").length;
  return `Data: ${restorable} row(s) could be put back; ${plan.length - restorable} could not. NOTHING IS REPLAYED.`;
}

function theThreeClassesAreCountedSeparately() {
  const s = summarizeRestorePlan(FIXTURE, FIXTURE.length);
  assert.match(s, /2 could be put back/, "restorable count");
  assert.match(s, /1 cannot be verified as untouched since/, "unverifiable count");
  assert.match(s, /3 are refused/, "refused count");
}

function theRetiredCollapsedFormLoses() {
  const shipped = summarizeRestorePlan(FIXTURE, FIXTURE.length);
  const retired = retiredCollapsedSummary(FIXTURE);
  assert.ok(/cannot be verified/.test(shipped), "the shipped form must name the unverifiable class");
  assert.ok(!/cannot be verified/.test(retired), "the retired form must NOT — that is the defect");
  assert.notStrictEqual(shipped, retired, "the two forms must differ on the same fixture");
}

function theRefusalGroundsAreNamedAndCapped() {
  const many = [
    ...FIXTURE,
    { classification: "refused", action: null, src_table: "epics",
      reason: "pk_value does not parse as uuid -- this writer stored something other than the primary key" },
    { classification: "refused", action: null, src_table: "x",
      reason: "composite primary key (2 columns) -- a single text pk_value cannot address the row" },
  ];
  const s = summarizeRestorePlan(many, many.length);
  assert.match(s, /Grounds: /, "grounds must be named");
  const namedCount = (s.match(/\d+x /g) ?? []).length;
  assert.ok(namedCount <= RESTORE_REASON_CAP, `at most ${RESTORE_REASON_CAP} grounds named, got ${namedCount}`);
  assert.match(s, /further ground\(s\)/, "the overflow must be counted, never silently dropped");
}

function nothingIsReplayedOnEveryBranch() {
  assert.match(summarizeRestorePlan(FIXTURE, 6), /NOTHING IS REPLAYED/);
  const unknown = summarizeRestorePlan(null, 12);
  assert.match(unknown, /UNKNOWN/, "an unreadable plan is unknown, never 'nothing to restore'");
  assert.match(unknown, /nothing is replayed/i);
  // The defect is a NUMERIC claim on a plan that was never read — not the words themselves; the
  // honest sentence legitimately contains "what could be put back is UNKNOWN".
  assert.ok(!/\d+ could be put back/.test(unknown), "an unreadable plan must not report a restorable count");
  assert.ok(!/\d+ are refused/.test(unknown), "an unreadable plan must not report a refused count");
  assert.match(summarizeRestorePlan([], 0), /no data was changed by it/);
}

function theCardCarriesThePlanAndClaimsNoRestore() {
  const decision = {
    action: ACTIONS.REVERT_AND_CARD,
    reason: "ci-red on abc1234",
    greenAnchor: { commit_sha: "0000000aaaa" },
    revertPlan: { command: "git revert --no-edit abc1234" },
    schemaPlan: null,
    attribution: { cycleId: "c-1" },
  };
  const card = buildIncidentCard(decision, {
    cycleId: "c-1", headSha: "abc1234567", beforeImages: FIXTURE, restorePlan: FIXTURE, trigger: "ci-red",
  });
  assert.match(card.qa_evidence, /NOTHING IS REPLAYED/, "the card must keep the no-replay statement");
  assert.match(card.qa_evidence, /cannot be verified as untouched/, "the card must carry the unverifiable class");
  assert.ok(!/restored \d+ row/i.test(card.qa_evidence), "the card must never claim rows were restored");
  assert.strictEqual(card.backlog_id, null, "SES-116: backlog_id stays bare/NULL, the reference goes in display_ref");
}

function theClassVocabularyIsData() {
  assert.deepStrictEqual(RESTORE_CLASSES, ["restorable", "unverifiable", "refused"]);
}

// A plan is never fetched without a cycle to attribute it to — the same guard readBeforeImages keeps.
async function noCycleMeansNoPlanFetch() {
  const r = await readRestorePlan("https://unreachable.invalid", "k", null);
  assert.strictEqual(r.plan, null, "a null cycle must short-circuit, never hit the network");
  assert.strictEqual(r.error, undefined);
}

async function theLiveHalf() {
  const BASE = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!BASE || !KEY) {
    notRun(
      "the live half — plan_data_restore() against real Supabase",
      "the catalog pk resolution, the ledger denylist and the oldest-image-per-pk collapse are SQL and " +
      "need SUPABASE_URL / SUPABASE_SERVICE_KEY. The offline clauses cover the summarizer and the card; " +
      "the SQL classification is UNVERIFIED in this run."
    );
    return;
  }
  const call = async (cycleId) => {
    const res = await fetch(`${BASE}/rest/v1/rpc/plan_data_restore`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_cycle_id: cycleId }),
    });
    assert.ok(res.ok, `plan_data_restore must be callable on the service key (HTTP ${res.status})`);
    return res.json();
  };

  const empty = await call("00000000-0000-0000-0000-000000000000");
  assert.ok(Array.isArray(empty) && empty.length === 0, "an unknown cycle plans nothing and does not raise");

  const probe = await fetch(
    `${BASE}/rest/v1/runner_before_images?select=cycle_id&cycle_id=not.is.null&limit=1`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  const probeRows = probe.ok ? await probe.json() : [];
  if (!probeRows.length) {
    notRun("the populated-range arm", "no attributed before-images exist to plan against.");
    return;
  }

  const planRows = await call(probeRows[0].cycle_id);

  for (const r of planRows) {
    assert.ok(RESTORE_CLASSES.includes(r.classification), `unknown class ${r.classification}`);
    assert.ok(typeof r.reason === "string" && r.reason.length > 0, "every row states its ground");
    if (r.classification === "refused") assert.strictEqual(r.action, null, "a refused row proposes no action");
    else assert.ok(["delete", "upsert"].includes(r.action), `bad action ${r.action}`);
    // The ledger denylist, asserted as a property rather than as a list of names.
    if (/^runner_/.test(r.src_table)) {
      assert.strictEqual(r.classification, "refused", `${r.src_table} must be refused as ledger`);
    }
  }

  const seen = new Set();
  for (const r of planRows) {
    const k = `${r.src_table} ${r.pk_text}`;
    assert.ok(!seen.has(k), `duplicate plan row for ${k} — the oldest-image collapse is gone`);
    seen.add(k);
  }
}

async function run() {
  theThreeClassesAreCountedSeparately();
  theRetiredCollapsedFormLoses();
  theRefusalGroundsAreNamedAndCapped();
  nothingIsReplayedOnEveryBranch();
  theCardCarriesThePlanAndClaimsNoRestore();
  theClassVocabularyIsData();
  await noCycleMeansNoPlanFetch();
  await theLiveHalf();
}

selfRun(import.meta.url, run);
export default run;
