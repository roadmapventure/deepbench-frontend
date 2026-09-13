// DeepBench v7.0.473 | tests/regression/ses-344b-rejudge-dispatcher.test.mjs | SES-344 slice 2 --
// THE RE-JUDGMENT DISPATCHER AND THE FALSE-APPROVE ARM, GRADED WITHOUT SPENDING A CENT, and the
// thing to read twice is WHICH COLUMN A MUTANT IS GRADED ON.
//
// (a) A MUTANT IS GRADED ON `agent_verdict`, AND THE CONTROL IS THE SAME MUTANT GRADED ON
//     `replayed`. `reconcileJudgment()` forces a block wherever the mechanical lane blocks, so
//     M1-red-gate replayed through the platform's own reconciliation is "block" NO MATTER WHAT THE
//     AGENT SAID. A false-approve arm reading that column would score an agent that approved a
//     red-gate ship as correct -- 0 false approves out of a known-bad delivery -- which is a green
//     that cannot go red. Both numbers are asserted here, on the same synthetic judgment, so the
//     distinction cannot be optimised away by someone who reads only one of them.
//
// (b) EVERY MUTATION IS PROVEN TO HAVE HAPPENED, AND PROVEN TO REFUSE WHEN IT CANNOT. Against the
//     REAL AGT-64 delivery: exactly one `diff --git` section leaves the diff, the promised test file
//     is gone from it, and `changed_files` drops 3 -> 2. The refusals are the other half -- a path
//     that is not in the diff, and a "contradiction" that is really present in it, both throw --
//     because a mutation that silently no-ops produces a mutant identical to a correctly-approved
//     ship, and the arm would then count the agent's correct approve as a FALSE one.
//
// (c) THE FILE-LEVEL CONTRACT VERSION IS COMPUTED FROM THE ROWS, NEVER DECLARED. 27 v1 judgments
//     with 5 re-recorded under v2 must stay at 1: switching the bars on for a partially re-judged
//     file would grade 22 judgments against a contract they were never handed, which is the exact
//     instrument error slice 1 declared NOT RUN rather than commit. And the v1 corpus itself must
//     come back BYTE-IDENTICAL: a re-judgment supersedes its row without overwriting it, because
//     ses-343-verdict-severity grades those same 27 rows against the frozen v1 schema and goes red
//     the moment a `findings`-shaped v2 row lands among them (measured, 2026-09-13).
//
// (d) THE BUDGET STOPS BEFORE THE CALL, PROVEN AT THE EXECUTOR SEAM WITH A SPY. A stub
//     `runCapability` and a stub cost read that returns `cost_usd: null` -- the unpriced case, which
//     is where a cap is actually lost: charge an unknown call at zero and a `--max-usd=3` run makes
//     calls forever. Exactly 2 calls under a $3 cap at $1.50 a call, and the third REFUSED BY NAME.
//     The spy is the point: a test watching only the return value would pass whether or not the
//     guard ran, because both paths end in "no third judgment".
//
// (e) NO ENV FLAG, NO CALL AT ALL. The same spy must record ZERO calls when `SES344_LIVE_REJUDGE`
//     is absent, and the dispatcher must exit 2. `--judge-live` on its own is not consent to spend.
//
// NO NETWORK, NO MODEL, NO WRITE OUTSIDE A TEMP DIR. Every seam that would reach one is injected;
// the judgments file this suite asserts against is never the one these parts write.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  mutateInputs,
  materializeInputs,
  materializeMutant,
} from "../../scripts/build-verdict-fixture.js";
import {
  replayOne,
  mutantArm,
  mergeJudgments,
  judgeLive,
  UNKNOWN_CALL_USD,
  ADJUDICATED_CONTRACT_VERSION,
} from "../verifier/ses-337-verifier-reproduction.test.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const readJson = p => JSON.parse(fs.readFileSync(p, "utf8"));
const FIXTURE = readJson(path.join(REPO, "tests", "fixtures", "verdicts-30.json"));
const JUDGMENTS = readJson(path.join(REPO, "tests", "fixtures", "verdicts-30-judgments.json"));
const MUTANTS = readJson(path.join(REPO, "tests", "fixtures", "verdicts-30-mutants.json"));

const M1 = "M1-red-gate";
const AGT64_TEST = "tests/regression/agt-64-researcher.test.mjs";

async function run() {
  // ---- (a) the mutant arm grades what the AGENT said ---------------------------------------
  const m1 = MUTANTS.mutants.find(m => m.mutant_id === M1);
  assert.ok(m1, `${M1} is missing from tests/fixtures/verdicts-30-mutants.json`);
  const mat1 = materializeMutant(REPO, FIXTURE.fixtures, m1);
  assert.deepStrictEqual(mat1.errors, [],
    `${M1} could not be materialised, so the false-approve arm has no known-bad delivery: ${mat1.errors.join("; ")}`);
  assert.strictEqual(mat1.fixture.inputs.gates.regression, "red",
    "the red-gate mutant's regression gate is not red -- the mutation did not happen");
  assert.strictEqual(mat1.fixture.inputs.mechanical.verdict, "block",
    "the red-gate mutant's mechanical lane does not block, so a correct agent would have nothing to block on");

  const approved = {
    mutant_id: M1,
    backlog_id: mat1.fixture.backlog_id,
    version: mat1.fixture.version,
    verdict: "approve",
    reasoning: "synthetic: the agent waved a red-gate ship through",
    pm_lens: "synthetic", architect_lens: "synthetic",
    auto_done_eligible: false, auto_done_reason: "synthetic", missing_evidence: [],
    contract_version: ADJUDICATED_CONTRACT_VERSION,
  };
  const arm = mutantArm(MUTANTS.mutants, [approved]);
  assert.strictEqual(arm.falseApproves.length, 1,
    `a known-bad ${M1} judged "approve" must count as exactly 1 false approve; the arm counted ${arm.falseApproves.length}`);
  assert.strictEqual(arm.falseApproves[0].mutant_id, M1, "the false approve is attributed to the wrong mutant");
  assert.strictEqual(arm.judged.length, 1, `only ${M1} was judged here; the arm counted ${arm.judged.length} judged`);
  assert.strictEqual(arm.unjudged.length, MUTANTS.mutants.length - 1,
    "the unjudged mutants are not being named, so a partial recording would look complete");

  // THE CONTROL: the same approve, graded through `replayed`, counts ZERO.
  const replayed = replayOne(mat1.fixture, approved, JUDGMENTS.intent_schema);
  assert.strictEqual(replayed.agent_verdict, "approve", "the replay lost what the agent actually said");
  assert.strictEqual(replayed.replayed, "block",
    "reconcileJudgment() did not force a block under a mechanical block -- then the control below proves nothing");
  assert.strictEqual([replayed].filter(r => r.replayed === "approve").length, 0,
    `graded on \`replayed\`, a ${M1} approve counts 0 false approves -- which is why the arm grades \`agent_verdict\`. If this ever counts 1, the two columns have converged and (a) is no longer measuring anything`);

  console.log(`  SES-344b (a) ${M1} approve: 1 false approve on agent_verdict, 0 on replayed (${arm.unjudged.length} mutants unjudged, named)`);

  // ---- (b) the mutations, against the real AGT-64 delivery ----------------------------------
  const m2 = MUTANTS.mutants.find(m => m.kind === "promised-file-absent");
  const base64 = FIXTURE.fixtures.find(f => f.verdict_id === m2.base_verdict_id);
  const mat64 = materializeInputs(REPO, base64);
  assert.deepStrictEqual(mat64.errors, [], `the AGT-64 base evidence could not be rebuilt: ${mat64.errors.join("; ")}`);
  const before = {
    ...base64.inputs,
    diff: mat64.diff,
    kickoff: mat64.kickoff,
    ship_report: { commit_messages: mat64.ship_report },
  };
  const sections = d => (String(d).match(/^diff --git /gm) || []).length;
  const after = mutateInputs("promised-file-absent", before, m2.spec);
  assert.strictEqual(sections(after.diff), sections(before.diff) - 1,
    `the mutation removed ${sections(before.diff) - sections(after.diff)} diff sections, not exactly 1`);
  assert.ok(before.diff.includes(`a/${AGT64_TEST}`), "the AGT-64 diff never contained the promised test file -- this base cannot carry this mutant");
  assert.ok(!after.diff.includes(`a/${AGT64_TEST}`),
    "the promised test file is still in the mutated diff, so the delivery is not missing anything");
  assert.strictEqual(before.changed_files.length, 3, `the AGT-64 delivery should name 3 changed files; it names ${before.changed_files.length}`);
  assert.strictEqual(after.changed_files.length, 2, `changed_files should drop 3 -> 2; it is ${after.changed_files.length}`);
  assert.ok(after.changed_files.every(f => f !== AGT64_TEST), "changed_files still names the file the diff no longer contains");
  // The ORIGINAL is untouched -- a mutation that edited its input in place would corrupt the fixture
  // for every later reader in the same process.
  assert.strictEqual(before.changed_files.length, 3, "mutateInputs() mutated its own input; it is documented as pure");

  assert.throws(() => mutateInputs("promised-file-absent", before, { path: "src/a-file-this-diff-never-touched.js" }),
    /carries no "diff --git/,
    "dropping a path the diff does not contain must THROW: it would produce a mutant identical to a correctly-approved ship");

  const m3 = MUTANTS.mutants.find(m => m.kind === "ship-report-contradicts-diff");
  const base330 = FIXTURE.fixtures.find(f => f.verdict_id === m3.base_verdict_id);
  const mat330 = materializeInputs(REPO, base330);
  const before330 = { ...base330.inputs, diff: mat330.diff, kickoff: mat330.kickoff, ship_report: { commit_messages: mat330.ship_report } };
  const diffedPath = base330.inputs.changed_files.find(f => mat330.diff.includes(f));
  assert.ok(diffedPath, "no changed file of the SES-330 delivery occurs in its own diff -- the negative control below cannot be built");
  assert.throws(() => mutateInputs("ship-report-contradicts-diff", before330, { commit_messages: "x", absent_paths: [diffedPath] }),
    /DOES occur in the diff/,
    "a ship report claiming a file that IS in the diff contradicts nothing and must be refused");
  const after330 = mutateInputs("ship-report-contradicts-diff", before330, m3.spec);
  assert.strictEqual(after330.ship_report.commit_messages, m3.spec.commit_messages, "the ship report was not replaced");
  assert.ok(!after330.diff.includes(m3.spec.absent_paths[0]), "the contradicted path is in the diff after all");

  console.log(`  SES-344b (b) AGT-64: 1 diff section dropped, changed_files 3->2, ${AGT64_TEST} absent; both refusals throw`);

  // ---- (c) the merge, and the computed contract version -------------------------------------
  const usableIds = FIXTURE.fixtures.filter(f => f.available).map(f => f.verdict_id);
  assert.strictEqual(usableIds.length, 27, `this part is written against 27 usable fixtures; the fixture now has ${usableIds.length}`);
  const v1 = { judgments: JUDGMENTS.judgments.map(j => ({ ...j })) };
  assert.strictEqual(v1.judgments.length, 27, "the recorded judgments file no longer holds 27 rows");
  const asV2 = ids => ids.map(id => ({
    verdict_id: id, backlog_id: "X", version: "vX", verdict: "block",
    contract_version: ADJUDICATED_CONTRACT_VERSION, trace_id: `t-${id.slice(0, 8)}`, cost_usd: 0.41,
  }));

  const partial = mergeJudgments(v1, { judgments: asV2(usableIds.slice(0, 5)), usable_ids: usableIds });
  assert.strictEqual(partial.judgments_v2.length, 5, `5 re-judgments were recorded; the merge holds ${partial.judgments_v2.length}`);
  assert.strictEqual(partial.contract_version, 1,
    "27 v1 judgments with 5 re-recorded under v2 must stay at file-level contract_version 1 -- the bars must not switch on for a partially re-judged file");
  const supersededId = usableIds[0];
  const v2Row = partial.judgments_v2.find(j => j.verdict_id === supersededId);
  assert.strictEqual(Number(v2Row.contract_version), 2, "the re-judgment did not land in judgments_v2");
  assert.strictEqual(v2Row.trace_id, `t-${supersededId.slice(0, 8)}`, "the superseding row is not the v2 one");
  // THE V1 CORPUS IS FROZEN, and this is the assertion that keeps it so. ses-343-verdict-severity
  // grades all 27 of `judgments[]` against the file's v1 schema snapshot and pins measured counts on
  // it; SES-347 renamed `reasoning` to `findings`, so a v2 row written INTO that corpus fails the v1
  // contract by construction. Measured red before this shape existed: "judgment 6 (AGT-65 v7.0.431)
  // still fails its own contract under { truncate: true }: missing required key \"reasoning\"".
  assert.deepStrictEqual(partial.judgments, v1.judgments,
    "the merge rewrote the frozen v1 corpus -- tests/regression/ses-343-verdict-severity.test.mjs grades those 27 rows against the v1 schema and goes red the moment a v2 row lands among them");
  assert.strictEqual(partial.judgments.length, 27, `the v1 corpus is ${partial.judgments.length} rows, not 27`);
  assert.ok(!partial.judgments.some(j => Number(j.contract_version) >= 2), "a v2 judgment leaked into the v1 corpus");

  const redo = mergeJudgments(partial, { judgments: asV2([supersededId]).map(j => ({ ...j, trace_id: "t-redo" })), usable_ids: usableIds });
  assert.strictEqual(redo.judgments_v2.length, 5, "re-judging the same fixture twice added a row instead of replacing one");
  assert.strictEqual(redo.judgments_v2.findIndex(j => j.verdict_id === supersededId), 0, "the replacement moved the row out of its place in the file");
  assert.strictEqual(redo.judgments_v2[0].trace_id, "t-redo", "the later re-judgment did not replace the earlier one");

  const full = mergeJudgments(v1, { judgments: asV2(usableIds), usable_ids: usableIds });
  assert.strictEqual(full.contract_version, ADJUDICATED_CONTRACT_VERSION,
    "with every usable fixture carrying a v2 judgment the file-level contract_version must be 2, or the bars can never run");
  assert.strictEqual(full.judgments_v2.length, 27, `the full re-recording holds ${full.judgments_v2.length} rows, not 27`);

  const withMutants = mergeJudgments(v1, { mutant_judgments: [approved], usable_ids: usableIds });
  assert.strictEqual(withMutants.mutant_judgments.length, 1, "a mutant judgment did not reach mutant_judgments[]");
  assert.ok(!withMutants.judgments.some(j => j.mutant_id) && !(withMutants.judgments_v2 || []).some(j => j.mutant_id),
    "a mutant judgment leaked into the ledger rows -- it is not a row of the ledger");

  console.log(`  SES-344b (c) merge: 27 v1 + 5 v2 -> contract_version ${partial.contract_version}; 27 v2 -> ${full.contract_version}; the v1 corpus is byte-identical and the re-judgment supersedes by verdict_id`);

  // ---- (d) + (e) the budget guard, at the executor seam --------------------------------------
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ses-344b-"));
  try {
    const indexPath = path.join(dir, "index.json");
    const judgmentsPath = path.join(dir, "judgments.json");
    fs.writeFileSync(indexPath, JSON.stringify({
      count: MUTANTS.mutants.length,
      contract_version: ADJUDICATED_CONTRACT_VERSION,
      prompts: MUTANTS.mutants.map(m => ({
        mutant_id: m.mutant_id, kind: m.kind, base_verdict_id: m.base_verdict_id,
        expected_agent_verdict: m.expected_agent_verdict, backlog_id: "mutant", version: "mutant",
      })),
    }, null, 2), "utf8");
    fs.writeFileSync(judgmentsPath, JSON.stringify({ judgments: [] }, null, 2), "utf8");

    // THE SPY. It can only be called if the guard let the request through -- which is the whole
    // reason the seam is injectable rather than mocked at the network.
    const calls = [];
    const stubRun = async args => {
      calls.push(args);
      return { content: { backlog_id: "AGT-65", version: "v7.0.431", verdict: "block", reasoning: "stub", pm_lens: "s", architect_lens: "s", auto_done_eligible: false, auto_done_reason: "s", missing_evidence: [] }, trace_id: `stub-trace-${calls.length}` };
    };
    // THE UNPRICED CASE: every cost read comes back null, which is where a budget is actually lost.
    const stubRest = async q => (q.startsWith("ai_activity_log") ? [{ cost_usd: null }] : []);
    // 127.0.0.1:1 refuses instantly: cycle_notes is read through the shipped cycleNotesFor(), which
    // records the unreadable answer rather than throwing -- no network call can succeed from here.
    const liveEnv = { SES344_LIVE_REJUDGE: "1", ANTHROPIC_API_KEY: "stub", SUPABASE_URL: "http://127.0.0.1:1", SUPABASE_SERVICE_KEY: "stub" };
    const lines = [];
    const capped = await judgeLive({
      indexPath, judgmentsPath, maxUsd: 3, env: liveEnv,
      runCapability: stubRun, rest: stubRest, log: l => lines.push(String(l)),
    });

    assert.strictEqual(UNKNOWN_CALL_USD, 1.5, `this part is written against an unpriced-call charge of $1.50; it is $${UNKNOWN_CALL_USD}`);
    assert.strictEqual(calls.length, 2,
      `--max-usd=3 with every call unpriced (charged $${UNKNOWN_CALL_USD}) must reach the executor exactly twice; the spy recorded ${calls.length} call(s)`);
    assert.strictEqual(capped.refused.length, 1, `exactly one entry must be refused at the cap; ${capped.refused.length} were`);
    assert.strictEqual(capped.refused[0], MUTANTS.mutants[2].mutant_id, "the refusal is attributed to the wrong entry");
    assert.ok(lines.some(l => l.includes("REFUSING") && l.includes(MUTANTS.mutants[2].mutant_id)),
      `the refusal must name the entry it refused, so a short run is visibly short. Log: ${lines.join(" / ")}`);
    assert.strictEqual(capped.spent_usd, 2 * UNKNOWN_CALL_USD, `the run accounted $${capped.spent_usd} for 2 unpriced calls`);
    assert.ok(calls.every(c => c.capability_slug === "verify-ship" && c.agent_id === "verifier" && c.intent_slug === "vf-verdict-intent"),
      "the dispatcher called something other than the verifier's own verify-ship/vf-verdict-intent");
    assert.ok(calls.every(c => c.task_context?.ship_report && c.task_context?.diff && c.task_context?.gates),
      "a call reached the executor without the widened contract's evidence keys");
    assert.strictEqual(calls[0].task_context.gates.regression, "red",
      "the first mutant's red gate did not reach the prompt -- the agent would have been asked about an unmutated delivery");

    const written = readJson(judgmentsPath);
    assert.strictEqual(written.mutant_judgments.length, 2, "the two judged mutants were not recorded");
    assert.ok(written.mutant_judgments.every(m => m.cost_usd === null && m.contract_version === ADJUDICATED_CONTRACT_VERSION),
      "an unpriced call was recorded as anything other than null cost -- a 0 there would launder 'unknown' into 'free'");
    assert.ok(written.mutant_judgments.every(m => String(m.trace_id).startsWith("stub-trace")), "the trace ids were not carried onto the recording");
    assert.strictEqual(written.contract_version, 1, "mutant judgments alone must not raise the file-level contract version");

    // THE POSITIVE CONTROL FOR (d), and without it "2 calls" could equally be an index the
    // dispatcher only half-read: the SAME index and the SAME stubs under a cap that fits three
    // calls must reach the executor three times. So the missing third call above is the BUDGET
    // stopping it, not the entry list running out.
    const roomy = await judgeLive({
      indexPath, judgmentsPath: path.join(dir, "roomy.json"), maxUsd: 10, env: liveEnv,
      runCapability: stubRun, rest: stubRest, log: () => {},
    });
    assert.strictEqual(roomy.calls, 3,
      `under a cap that fits three unpriced calls the dispatcher must judge all 3 entries; it judged ${roomy.calls}. Then the 2 above were not the cap's doing`);
    assert.strictEqual(roomy.refused.length, 0, "an entry was refused under a cap that fits it");

    // (e) the same spy, one env var short.
    const before = calls.length;   // after the roomy control: 5 calls so far
    const refusedLines = [];
    const gated = await judgeLive({
      indexPath, judgmentsPath, maxUsd: 3,
      env: { ANTHROPIC_API_KEY: "stub", SUPABASE_URL: "http://127.0.0.1:1", SUPABASE_SERVICE_KEY: "stub" },
      runCapability: stubRun, rest: stubRest, log: l => refusedLines.push(String(l)),
    });
    assert.strictEqual(gated.exit, 2, `without SES344_LIVE_REJUDGE the dispatcher must exit 2; it returned ${gated.exit}`);
    assert.strictEqual(calls.length, before, `${calls.length - before} call(s) reached the executor with no live flag set -- --judge-live alone is not consent to spend`);
    assert.ok(refusedLines.some(l => l.includes("SES344_LIVE_REJUDGE")), `the refusal must name the flag it wants. Log: ${refusedLines.join(" / ")}`);

    console.log(`  SES-344b (d) cap: 2 stub calls at $${UNKNOWN_CALL_USD} each, ${capped.refused[0]} refused by name at --max-usd=3; (e) no flag: exit ${gated.exit}, 0 calls`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export default run;

selfRun(import.meta.url, run);
