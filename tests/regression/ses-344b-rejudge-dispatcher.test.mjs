// DeepBench v7.0.490 | tests/regression/ses-344b-rejudge-dispatcher.test.mjs | SES-344 slice 4, SES-393 --
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
// (f) THE PRE-CALL CHARGE IS THE ENTRY'S OWN SIZE, WITH THE MEASURED FLOOR UNDER IT. `worstCaseUsd()`
//     must return the $1.50 floor for an unsized and for a small prompt, and STRICTLY MORE than the
//     floor for the ledger's largest (424,866 chars -> ~$2.17). A flat rate is the bug this replaces:
//     it is the floor in both directions, so it under-charges exactly the call that can cross a wall.
//
// (g) `--pending` IS READ OFF THE RECORDING, AND THE ORDER IS CHEAPEST FIRST. A judgments file that
//     already holds M1 must leave M1 uncalled and NAMED as skipped, and the two that remain must
//     reach the executor smallest-prompt-first -- so a run stopped by the cap has bought the most
//     judgments the money could buy. The control is the SAME index under `pending: false`: 3 calls.
//     Without it, "2 calls" could be an index the dispatcher only half-read.
//
// (h) THE SIZE-AWARE CAP ACTUALLY REFUSES, AND ONLY FOR SIZE. A 500,000-byte prompt under
//     `--max-usd=2` is refused by name at $2.48 with ZERO calls; the SAME entry with a 1,000-byte
//     prompt file and the same cap is called. One variable changes -- the prompt's size -- so the
//     refusal cannot be an unrelated skip, a bad index, or an env gate.
//
// NO NETWORK, NO MODEL, NO WRITE OUTSIDE A TEMP DIR. Every seam that would reach one is injected;
// the judgments file this suite asserts against is never the one these parts write.
//
// SES-393 (v7.0.490): FIVE OF THESE EIGHT PARTS REBUILD EVIDENCE FROM GIT HISTORY A CI CHECKOUT
// DOES NOT CARRY, AND THE FIX IS TEST-SIDE, not `fetch-depth: 0` in `.github/workflows/ci.yml`.
// Measured, not recalled: `actions/checkout@v4` at lines 172/191 of ci.yml carries no `fetch-depth:`
// key, so both jobs check out at depth 1; `materializeMutant()` then cannot read
// `a176cc64^..a176cc64` and this file died at its FIRST assertion. `Tripwire + regression
// (blocking)` was red on every dev head for it -- CI run 34752717596, dev head bfdf3e55. The fix is
// not in ci.yml because THE PAT AN UNATTENDED CYCLE HOLDS CANNOT PUSH `.github/workflows`, so a
// `fetch-depth: 0` edit cannot land from this lane at all; and the suite already has a vocabulary
// for exactly this (`SES-244-tap-buffer.js:146`, `SES-215-env-isolation.js:303`,
// `SES-256-rollback-drill.js:226`, `ses-320-delivered-exit.test.mjs:253` each declare an unreachable
// pinned sha NOT RUN and name it). So `reachable()` below gates the history-dependent parts through
// that same `notRun()`. No second vocabulary invented (`docs/STANDARDS.md` Section 13).
//
// WHICH PARTS, AND WHY IT IS FIVE AND NOT TWO -- measured in the depth-1 clone, because the obvious
// answer is wrong. (a) and (b) rebuild base diffs directly and are the visible half. But (d), (g)
// and (h) go through `judgeLive()`, which calls `materializeMutant()` per entry BEFORE it builds a
// prompt (`tests/verifier/ses-337-verifier-reproduction.test.mjs:728) and SKIPs what it cannot
// rebuild -- so on a shallow clone the injected spy records 0 calls exactly where those parts assert
// 2, 3 and 1, and gating only (a) and (b) leaves the file red at (d). (c), (e) and (f) need no
// history and are deliberately OUTSIDE every gate: (c) merges fixture rows, (e) proves the env flag
// stops the run before any evidence is touched, (f) is arithmetic. (g)'s prompt-file size premise
// (M1 30, M2 20, M3 10 bytes) also stays outside its gate -- it stats temp files, not commits.
//
// EACH GATE READS ITS OWN COMMITS, and that is not tidiness: declaring a part not-run because some
// OTHER part's commit is missing would widen a skip past the evidence that justifies it, and a skip
// that is wider than its reason is how a real failure gets swallowed. Only `!reachable(sha)` may
// take a NOT RUN arm; a materialise error on a sha this clone CAN read stays red.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
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
  worstCaseUsd,
  promptBytesOf,
} from "../verifier/ses-337-verifier-reproduction.test.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const readJson = p => JSON.parse(fs.readFileSync(p, "utf8"));
const FIXTURE = readJson(path.join(REPO, "tests", "fixtures", "verdicts-30.json"));
const JUDGMENTS = readJson(path.join(REPO, "tests", "fixtures", "verdicts-30-judgments.json"));
const MUTANTS = readJson(path.join(REPO, "tests", "fixtures", "verdicts-30-mutants.json"));

const M1 = "M1-red-gate";
const AGT64_TEST = "tests/regression/agt-64-researcher.test.mjs";

// THE DISCRIMINATOR BETWEEN "THIS CHECKOUT IS SHALLOW" AND "THE MUTATION BROKE". Every mutant's
// base evidence is rebuilt from the range `sha^..sha`, so it is the PARENT a depth-1 checkout
// lacks. `git cat-file -e <sha>^^{commit}` probes exactly that: non-zero in a depth-1 clone, zero in
// a full one (measured both ways, 2026-09-15). Only `!reachable(sha)` may take a NOT RUN arm below;
// a materialise error on a sha this clone CAN read is a real failure and stays red.
function reachable(sha) {
  return spawnSync("git", ["cat-file", "-e", `${sha}^^{commit}`], { cwd: REPO }).status === 0;
}

async function run() {
  // ---- (a) the mutant arm grades what the AGENT said ---------------------------------------
  const m1 = MUTANTS.mutants.find(m => m.mutant_id === M1);
  assert.ok(m1, `${M1} is missing from tests/fixtures/verdicts-30-mutants.json`);

  // `approved` IS BUILT FROM THE FIXTURE ROW, NOT FROM `mat1.fixture`, and that is what lets (a) go
  // NOT RUN without taking (c) down with it: (c) merges this same object as a mutant judgment, so
  // reading its identity out of a materialisation a shallow clone cannot perform would make the
  // MERGE unrunnable for a reason that has nothing to do with merging. The row carries the same two
  // fields (measured: AGT-65 / v7.0.431 / a176cc64).
  const base1 = FIXTURE.fixtures.find(f => f.verdict_id === m1.base_verdict_id);
  assert.ok(base1, `${M1}'s base verdict ${m1.base_verdict_id} is not in tests/fixtures/verdicts-30.json`);

  // EVERY MUTANT'S BASE, PROBED ONCE, because (d), (g) and (h) need this history too -- measured
  // 2026-09-15 in the depth-1 clone rather than assumed from the part list. `judgeLive()` rebuilds
  // each entry's evidence with materializeMutant() BEFORE it builds a prompt
  // (tests/verifier/ses-337-verifier-reproduction.test.mjs:728) and SKIPs an entry it cannot
  // rebuild, so on a shallow clone the spy records 0 calls exactly where those parts assert 2, 3
  // and 1. Their call counts are the assertion, so a 0 there is not a weaker pass -- it is a red
  // with nothing to do with the budget guard.
  const mutantBases = MUTANTS.mutants.map(m => FIXTURE.fixtures.find(f => f.verdict_id === m.base_verdict_id));
  assert.ok(mutantBases.every(Boolean), "a mutant names a base verdict that is not in tests/fixtures/verdicts-30.json");
  const dispatcherEvidence = mutantBases.every(b => reachable(b.sha));

  const approved = {
    mutant_id: M1,
    backlog_id: base1.backlog_id,
    version: base1.version,
    verdict: "approve",
    reasoning: "synthetic: the agent waved a red-gate ship through",
    pm_lens: "synthetic", architect_lens: "synthetic",
    auto_done_eligible: false, auto_done_reason: "synthetic", missing_evidence: [],
    contract_version: ADJUDICATED_CONTRACT_VERSION,
  };

  if (!reachable(base1.sha)) {
    notRun("ses-344b (a) the mutant arm grades `agent_verdict`, with `replayed` as its control",
      `this checkout cannot read ${String(base1.sha).slice(0, 8)}^ -- the parent of ${String(base1.sha).slice(0, 8)}, ` +
      `the ${base1.backlog_id} ${base1.version} delivery ${M1} mutates -- so the known-bad delivery cannot be ` +
      "rebuilt here at all. That is this checkout's depth (a depth-1 clone holds its HEAD and nothing before it), " +
      "not a false-approve arm that stopped counting.");
  } else {
    const mat1 = materializeMutant(REPO, FIXTURE.fixtures, m1);
    assert.deepStrictEqual(mat1.errors, [],
      `${M1} could not be materialised, so the false-approve arm has no known-bad delivery: ${mat1.errors.join("; ")}`);
    assert.strictEqual(mat1.fixture.inputs.gates.regression, "red",
      "the red-gate mutant's regression gate is not red -- the mutation did not happen");
    assert.strictEqual(mat1.fixture.inputs.mechanical.verdict, "block",
      "the red-gate mutant's mechanical lane does not block, so a correct agent would have nothing to block on");
    // The row and the materialised mutant must agree on identity, or `approved` above is describing
    // a different delivery than the one the arm grades.
    assert.strictEqual(mat1.fixture.backlog_id, approved.backlog_id,
      `the ${M1} base row says ${approved.backlog_id} but the materialised mutant says ${mat1.fixture.backlog_id}`);
    assert.strictEqual(mat1.fixture.version, approved.version,
      `the ${M1} base row says ${approved.version} but the materialised mutant says ${mat1.fixture.version}`);

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
  }

  // ---- (b) the mutations, against the real AGT-64 delivery ----------------------------------
  const m2 = MUTANTS.mutants.find(m => m.kind === "promised-file-absent");
  const base64 = FIXTURE.fixtures.find(f => f.verdict_id === m2.base_verdict_id);
  const m3 = MUTANTS.mutants.find(m => m.kind === "ship-report-contradicts-diff");
  const base330 = FIXTURE.fixtures.find(f => f.verdict_id === m3.base_verdict_id);

  // (b) IS GATED ON ITS OWN TWO BASES, NOT ON (a)'s. They are different commits (870ee2d0 and
  // 01795d93 against a176cc64), and declaring (b) not-run because a commit it never reads is
  // missing would be widening a skip past the evidence that justifies it.
  if (!reachable(base64.sha) || !reachable(base330.sha)) {
    notRun("ses-344b (b) the mutations, against the real AGT-64 and SES-330 deliveries",
      `this checkout cannot read ${String(base64.sha).slice(0, 8)}^ and/or ${String(base330.sha).slice(0, 8)}^, so the ` +
      "real diffs these mutations are applied to cannot be rebuilt here. That is this checkout's depth, not a " +
      "mutation that silently no-opped. (c), (e) and (f) below need no history and still run; (d), (g) and (h) " +
      "declare themselves separately, each naming the commits it could not read.");
  } else {
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
  }

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
    assert.strictEqual(UNKNOWN_CALL_USD, 1.5, `this part is written against an unpriced-call charge of $1.50; it is $${UNKNOWN_CALL_USD}`);

    if (!dispatcherEvidence) {
      notRun("ses-344b (d) the budget stops before the call, proven at the executor seam with a spy",
        `this checkout cannot read ${mutantBases.map(b => `${String(b.sha).slice(0, 8)}^`).join(", ")}, and judgeLive() rebuilds ` +
        "an entry's evidence before it prompts, so every entry is SKIPPED inside the dispatcher and the spy sees 0 calls " +
        "where this part asserts 2 under --max-usd=3 and 3 under its roomy control. That is this checkout's depth, not a " +
        "cap that stopped refusing. (e) and (f) below need no history and still run.");
    } else {
      const lines = [];
      const capped = await judgeLive({
        indexPath, judgmentsPath, maxUsd: 3, env: liveEnv,
        runCapability: stubRun, rest: stubRest, log: l => lines.push(String(l)),
      });

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

      console.log(`  SES-344b (d) cap: 2 stub calls at $${UNKNOWN_CALL_USD} each, ${capped.refused[0]} refused by name at --max-usd=3 (roomy control: ${roomy.calls} calls at --max-usd=10)`);
    }

    // ---- (e) NO ENV FLAG, NO CALL AT ALL -------------------------------------------------------
    // This part needs no git history and is deliberately OUTSIDE the gate above: the flag is read
    // before any entry's evidence is rebuilt, so "0 calls" here means the flag stopped the run in a
    // shallow clone exactly as it does in a full one. The baseline is taken from the spy rather
    // than written as a literal 5, because (d) may have been declared not-run above and contributed
    // none -- what this asserts is that THIS call added nothing, not what came before it.
    const before = calls.length;
    const refusedLines = [];
    const gated = await judgeLive({
      indexPath, judgmentsPath, maxUsd: 3,
      env: { ANTHROPIC_API_KEY: "stub", SUPABASE_URL: "http://127.0.0.1:1", SUPABASE_SERVICE_KEY: "stub" },
      runCapability: stubRun, rest: stubRest, log: l => refusedLines.push(String(l)),
    });
    assert.strictEqual(gated.exit, 2, `without SES344_LIVE_REJUDGE the dispatcher must exit 2; it returned ${gated.exit}`);
    assert.strictEqual(calls.length, before, `${calls.length - before} call(s) reached the executor with no live flag set -- --judge-live alone is not consent to spend`);
    assert.ok(refusedLines.some(l => l.includes("SES344_LIVE_REJUDGE")), `the refusal must name the flag it wants. Log: ${refusedLines.join(" / ")}`);

    console.log(`  SES-344b (e) no flag: exit ${gated.exit}, ${calls.length - before} calls added (spy at ${calls.length})`);

    // ---- (f) the size-aware charge -----------------------------------------------------------
    // The floor holds where it was measured, and only a genuinely large prompt lifts it.
    assert.strictEqual(worstCaseUsd(0), UNKNOWN_CALL_USD,
      `an unsized entry must keep the measured floor of $${UNKNOWN_CALL_USD}; worstCaseUsd(0) is $${worstCaseUsd(0)}`);
    assert.strictEqual(worstCaseUsd(35791), UNKNOWN_CALL_USD,
      `AGT-66's 35,791-char prompt is the size the floor was measured on and must still charge $${UNKNOWN_CALL_USD}; it charges $${worstCaseUsd(35791)}`);
    const biggest = worstCaseUsd(424866);
    assert.ok(Math.abs(biggest - 2.17) <= 0.01,
      `the ledger's largest prompt (424,866 chars) must price at $2.17 +/- $0.01; it prices at $${biggest.toFixed(4)}`);
    // THE DISCRIMINATING HALF: a flat rate would satisfy the two floor cases above and still be the
    // bug. This is the assertion a flat rate cannot pass.
    assert.ok(biggest > UNKNOWN_CALL_USD,
      `the largest prompt must charge MORE than the flat $${UNKNOWN_CALL_USD} -- that under-charge is what admitted a $2.17 call at $3.40 spent and would have crossed the $5 day wall`);
    console.log(`  SES-344b (f) worstCaseUsd: 0 and 35,791 chars -> $${UNKNOWN_CALL_USD.toFixed(2)} (floor), 424,866 chars -> $${biggest.toFixed(2)} (> floor)`);

    // ---- (g) --pending, cheapest first -------------------------------------------------------
    // Real prompt files, because `promptBytesOf()` stats the file: M1 30 bytes, M2 20, M3 10, so
    // the cheapest-first order (M3, M2) is the REVERSE of the index order and cannot be an accident
    // of reading the index in sequence.
    const sizes = { [M1]: 30, "M2-promised-file-absent": 20, "M3-ship-report-contradicts-diff": 10 };
    const sizedIndexPath = path.join(dir, "sized-index.json");
    fs.writeFileSync(sizedIndexPath, JSON.stringify({
      count: MUTANTS.mutants.length,
      contract_version: ADJUDICATED_CONTRACT_VERSION,
      prompts: MUTANTS.mutants.map(m => {
        const file = path.join(dir, `${m.mutant_id}.prompt.txt`);
        fs.writeFileSync(file, "x".repeat(sizes[m.mutant_id]), "utf8");
        return {
          mutant_id: m.mutant_id, kind: m.kind, base_verdict_id: m.base_verdict_id,
          expected_agent_verdict: m.expected_agent_verdict, backlog_id: "mutant", version: "mutant",
          prompt_file: file,
        };
      }),
    }, null, 2), "utf8");
    for (const [id, size] of Object.entries(sizes)) {
      assert.strictEqual(promptBytesOf({ prompt_file: path.join(dir, `${id}.prompt.txt`) }), size,
        `${id}'s prompt file is not ${size} bytes, so the ordering below proves nothing about size`);
    }

    // The prompt-file sizes above are asserted in EVERY clone -- they are the premise the ordering
    // claim rests on and they stat temp files, not history. Only the dispatcher runs below need the
    // base commits, so only they are gated.
    const pendingPath = path.join(dir, "pending-judgments.json");
    fs.writeFileSync(pendingPath, JSON.stringify({
      judgments: [],
      mutant_judgments: [{ mutant_id: M1, verdict: "block", contract_version: ADJUDICATED_CONTRACT_VERSION }],
    }, null, 2), "utf8");

    if (!dispatcherEvidence) {
      notRun("ses-344b (g) --pending is read off the recording, and the order is cheapest first",
        `this checkout cannot read ${mutantBases.map(b => `${String(b.sha).slice(0, 8)}^`).join(", ")}, so judgeLive() SKIPs ` +
        "every entry while rebuilding its evidence and both the 2-call --pending run and its 3-call pending:false control " +
        "reach the executor 0 times. An empty judged[] cannot show an order, so this part is declared rather than passed " +
        "on a vacuous list. The prompt-file sizes it rests on (M1 30, M2 20, M3 10 bytes) were asserted above and did run.");
    } else {
      const pendingCalls = [];
      const pendingSpy = async args => { pendingCalls.push(args); return stubRun(args); };
      const pendingLines = [];
      const pendingRun = await judgeLive({
        indexPath: sizedIndexPath, judgmentsPath: pendingPath, maxUsd: 10, pending: true, env: liveEnv,
        runCapability: pendingSpy, rest: stubRest, log: l => pendingLines.push(String(l)),
      });
      assert.strictEqual(pendingCalls.length, 2,
        `M1 already carries a v2 judgment, so --pending must reach the executor exactly twice; the spy recorded ${pendingCalls.length} call(s)`);
      assert.deepStrictEqual(pendingRun.judged.map(j => j.mutant_id || j.verdict_id),
        ["M3-ship-report-contradicts-diff", "M2-promised-file-absent"],
        "--pending did not judge the two unjudged mutants SMALLEST PROMPT FIRST (M3 is 10 bytes, M2 is 20) -- a cap that stops the run must have bought the most judgments the money could buy");
      assert.ok(pendingLines.some(l => l.includes("pending 2 of 3") && l.includes(M1)),
        `--pending must say how many it skipped and NAME them, so a resumed run is visibly partial. Log: ${pendingLines.join(" / ")}`);
      assert.strictEqual(pendingRun.refused.length, 0, "an entry was refused under a $10 cap that fits all of them");

      // THE CONTROL: same index, same stubs, same cap, `pending: false` -> all 3. So the missing third
      // call above is the JUDGMENTS FILE, not a short index or the budget.
      const allCalls = [];
      const allRun = await judgeLive({
        indexPath: sizedIndexPath, judgmentsPath: path.join(dir, "all-judgments.json"), maxUsd: 10,
        pending: false, env: liveEnv,
        runCapability: async args => { allCalls.push(args); return stubRun(args); },
        rest: stubRest, log: () => {},
      });
      assert.strictEqual(allRun.calls, 3,
        `without --pending the same index must judge all 3 entries; it judged ${allRun.calls}. Then the 2 above were not the recording's doing`);
      assert.strictEqual(allCalls.length, 3, `the spy recorded ${allCalls.length} calls without --pending, not 3`);
      console.log(`  SES-344b (g) --pending: 2 of 3 called in size order ${pendingRun.judged.map(j => j.mutant_id).join(" -> ")}, ${M1} skipped by name; pending:false on the same index -> ${allRun.calls}`);
    }

    // ---- (h) the cap refuses on size, and only on size ---------------------------------------
    // GATED AS A PAIR, NEVER HALF-RUN. The refusal half needs no history -- judgeLive() prices the
    // next entry and refuses BEFORE it rebuilds any evidence -- but its positive control does, and
    // the refusal alone is exactly the vacuous form this part's header warns about: without "the
    // same entry at 1,000 bytes IS called", a 0-call run proves nothing about size.
    if (!dispatcherEvidence) {
      notRun("ses-344b (h) the size-aware cap actually refuses, and only for size",
        `this checkout cannot read ${String(base1.sha).slice(0, 8)}^, so the 1,000-byte positive control cannot reach the ` +
        "executor and the 500,000-byte refusal would be the only surviving arm -- a refusal with no control is not a " +
        "measurement of size. That is this checkout's depth, not a cap that refuses everything.");
    } else {
      const bigFile = path.join(dir, "big.prompt.txt");
      const smallFile = path.join(dir, "small.prompt.txt");
      fs.writeFileSync(bigFile, "x".repeat(500_000), "utf8");
      fs.writeFileSync(smallFile, "x".repeat(1_000), "utf8");
      const oneEntry = file => {
        const p = path.join(dir, `one-${path.basename(file)}.json`);
        fs.writeFileSync(p, JSON.stringify({
          count: 1, contract_version: ADJUDICATED_CONTRACT_VERSION,
          prompts: [{
            mutant_id: M1, kind: m1.kind, base_verdict_id: m1.base_verdict_id,
            expected_agent_verdict: m1.expected_agent_verdict, backlog_id: "mutant", version: "mutant",
            prompt_file: file,
          }],
        }, null, 2), "utf8");
        return p;
      };

      const bigCalls = [];
      const bigLines = [];
      const tooBig = await judgeLive({
        indexPath: oneEntry(bigFile), judgmentsPath: path.join(dir, "big-judgments.json"), maxUsd: 2, env: liveEnv,
        runCapability: async args => { bigCalls.push(args); return stubRun(args); },
        rest: stubRest, log: l => bigLines.push(String(l)),
      });
      assert.strictEqual(bigCalls.length, 0,
        `a 500,000-byte prompt costs more than --max-usd=2 before it is sent and must never reach the executor; the spy recorded ${bigCalls.length} call(s)`);
      assert.deepStrictEqual(tooBig.refused, [M1], `the oversized entry must be refused by name; refused = ${JSON.stringify(tooBig.refused)}`);
      assert.ok(bigLines.some(l => l.includes("REFUSING") && l.includes(M1) && l.includes("$2.48")),
        `the refusal must name the entry AND the $2.48 its own size would cost -- a flat $1.50 would have let this through. Log: ${bigLines.join(" / ")}`);
      assert.strictEqual(tooBig.spent_usd, 0, `nothing was called, so nothing was spent; the run accounted $${tooBig.spent_usd}`);

      // ONE VARIABLE: the same entry, the same cap, a smaller prompt file.
      const smallCalls = [];
      const fits = await judgeLive({
        indexPath: oneEntry(smallFile), judgmentsPath: path.join(dir, "small-judgments.json"), maxUsd: 2, env: liveEnv,
        runCapability: async args => { smallCalls.push(args); return stubRun(args); },
        rest: stubRest, log: () => {},
      });
      assert.strictEqual(smallCalls.length, 1,
        `the SAME entry with a 1,000-byte prompt is $${UNKNOWN_CALL_USD.toFixed(2)} under a $2 cap and must be called; the spy recorded ${smallCalls.length} call(s). Then the refusal above was not about size`);
      assert.strictEqual(fits.refused.length, 0, "the small-prompt entry was refused under a cap that fits it");
      console.log(`  SES-344b (h) size cap: 500,000-byte prompt refused by name at $2.48 under --max-usd=2 (0 calls); the same entry at 1,000 bytes -> ${smallCalls.length} call`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export default run;

selfRun(import.meta.url, run);
