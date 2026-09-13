// DeepBench v7.0.473 | tests/verifier/ses-337-verifier-reproduction.test.mjs | SES-344 slice 2 --
// THE RE-JUDGMENT IS A SCRIPT RUN, NOT A SITTING, and the thing to read twice is that slice 1's
// "attended" was stale. `--judge-live=<index.json>` drives the SAME `verify-ship` capability through
// `runCapability()` in this process, under `runWithCallSource("script")`, so the calls are the
// platform's own executor calls: logged in `ai_activity_log` with `call_source = script`, costed by
// `trace_id`, and reachable from a cycle instead of a person. Measured 2026-09-12: three such calls
// cost $0.41-0.42 and took 82-90 s each. What re-judging the other 25 fixtures needs is DOLLARS
// (≈ $15, John's spend decision), not a human at a keyboard -- and that is a different blocker than
// the one the file used to declare.
//
// THE MONEY IS BOUNDED BEFORE THE CALL, NEVER RECONCILED AFTER IT. The dispatcher stops BEFORE any
// call whose worst case would cross `--max-usd`, charging an unpriced call at `UNKNOWN_CALL_USD`
// rather than at zero: a null `cost_usd` means the price is unknown, and treating unknown as free is
// how a capped run walks past its cap. A refusal names the entry it refused, so a short run is
// visibly short.
//
// AND THE FALSE-APPROVE ARM FINALLY HAS CANDIDATES. `MAX_FALSE_APPROVES = 0` was a bar over an empty
// set -- nothing on the recorded ledger is a block the replay approves. The three mutants
// (`tests/fixtures/verdicts-30-mutants.json`) are real shipped deliveries with one injected defect
// each, and they are graded on `agent_verdict`, NOT on `replayed`: `reconcileJudgment()` forces a
// block under a mechanical block, so a red-gate mutant graded through `replayed` could never fail --
// the arm would be green by construction, which is the exact vacuity this slice exists to remove.
//
// DeepBench v7.0.471 | tests/verifier/ses-337-verifier-reproduction.test.mjs | SES-344 slice 1 --
// THE BAR IS ADJUDICATED, and the thing to read twice is that A DISAGREEMENT IS NOT A UNIT. One
// count of 8 was being graded as 8 agent errors. Adjudicated 2026-09-13 against the eight ship
// commit bodies (`tests/fixtures/verdicts-30-adjudication.json`, every quote an exact substring of
// `git log -1 --format=%B <sha>`): 1 HARNESS (SES-336 -- the judgment quotes "400,000 of 639,956",
// the diff this file handed it cut inside a re-rendered board), 6 CONTRACT FALSE BLOCKS (the named
// evidence was in the commit body the contract never carried), 1 TRUE BLOCK (SES-321: one-line
// body, cycle notes 0 bytes -- that evidence exists nowhere, and the block stands). So
// `MAX_DISAGREEMENTS` is gone and two bars replace it: `MAX_FALSE_BLOCKS` (John's 2, kept at his
// number) and `MAX_FALSE_APPROVES` (0 -- the direction that ships a bad change).
//
// AND THE BARS ARE NOT ASSERTED YET, WHICH IS THE POINT OF THE SLICE. The 27 judgments in
// `verdicts-30-judgments.json` were recorded against the NARROW contract (no ship report, the
// alphabetical diff). Grading them against the widened one measures the delta the contract
// introduced, not the agent -- the instrument error SES-338's two lenses named. So the bar runs
// only when the judgments file records `contract_version >= 2`, and until then it is DECLARED NOT
// RUN by name. A vacuous green here would be worse than the red it replaced: the red at least said
// something true. Slice 2 re-judges the 8 attended under the widened contract and adds three
// known-bad mutant fixtures as the false-approve arm.
//
// DeepBench v7.0.440 | tests/verifier/ses-337-verifier-reproduction.test.mjs | SES-337 -- THE
// VERIFIER IS REPLAYED AGAINST ITS OWN LEDGER, and the thing to read twice is WHERE THE MODEL CALL
// IS AND WHY IT IS NOT IN THIS FILE.
//
// John's condition on the verifier split (2026-09-08): freeze the 30 most recent verdicts and
// require the agent to reproduce them, at most 2 disagreements, before it grades a ship.
//
// (1) THE REPLAY IS TWO PHASES AND THIS FILE IS BOTH OF THEM.
//     `node tests/verifier/ses-337-verifier-reproduction.test.mjs --write-prompts=<dir>` assembles
//     ONE `verify-ship` prompt per usable fixture -- through `assemblePrompt()` +
//     `renderAssembly()`, the executor's own assembly that `scripts/verifier.js` pass one calls, so
//     this file builds no prompt of its own -- and writes it to disk. The verdicts come back from
//     `verifier` sub-agents on the `judgment` lane and are saved to
//     `tests/fixtures/verdicts-30-judgments.json`. Running the file with no flag is the ASSERTION
//     phase: it reads those recorded judgments and grades them.
//
//     A REGRESSION TEST CANNOT SPAWN A SESSION SUB-AGENT. That is the named deviation from the
//     kickoff's "replays each usable fixture through verify-ship (session path)": the model calls
//     happen once, attended, and their outputs are committed as evidence; what runs every cycle is
//     the reconciliation of those outputs through the SHIPPED functions. The alternative -- a test
//     that makes 27 model calls on every suite run -- would put a live spend and a live model's
//     variance inside the gate that decides whether the suite is green.
//
// (2) THE ASSERTION RUNS THE REAL CODE, NEVER A RESTATEMENT OF IT (STANDARDS.md Section 4's rule
//     that outranks the categories). Each recorded judgment is pushed through
//     `validateAgentVerdict()` against the Intent's OWN stored schema, `verdictIdentityMismatch()`,
//     and `reconcileJudgment()` -- the three functions `scripts/verifier.js` pass two gates a
//     verdict with. A disagreement is `reconcileJudgment(...).verdict !== the recorded verdict`, so
//     what is compared is the row the platform WOULD have written against the row it DID write.
//
// (3) THE DIFF AND THE KICKOFF ARE MATERIALISED FROM GIT AND DIGEST-CHECKED. The fixture stores
//     references and SHA-256s, never content (see `scripts/build-verdict-fixture.js`). A sha this
//     clone cannot reach is NOT RUN -- a shallow CI checkout is missing evidence, not a failure. A
//     sha it CAN reach whose diff no longer hashes to what was judged is a FAILURE: history moved
//     under the fixture and every verdict below is about a tree that no longer exists.
//
// (4) WOULD THIS TEST STILL PASS IF THE SKILL TEXT DID NOTHING? That is the discrimination question
//     Section 4 makes the bar, and the answer is the `--write-prompts=<dir> --blank=vf-behavior`
//     mode: it assembles the same fixtures with the Verifier's Behavior Skill blanked, so the
//     attended run can measure the disagreement count WITHOUT the text the reproduction is meant to
//     be testing. That measurement is recorded in `discrimination` on the judgments file and
//     asserted here: a blanked-Behavior control that reproduced the ledger just as well would mean
//     this whole file is measuring the gate columns, not the agent.
//
// (5) NOT REGISTERED IN `tests/regression/run-all.js` UNTIL IT IS GREEN. The kickoff's own
//     instruction, and the reason it lives under `tests/verifier/` rather than `tests/regression/`:
//     a red reproduction is a finding about the Skill text, and a finding does not get to paint the
//     suite red for every unrelated ship. Registration is a one-line change once the recorded run
//     is green, and the ship says which.
//
// NO WRITE OF ANY KIND. This file reads the fixture, the judgments and git. Inserting anything into
// `runner_verdicts` here would poison the rolling telemetry the reviewer lane exists to produce
// (SES-181's own note).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "../regression/_lib/self-run.js";
import {
  validateAgentVerdict,
  verdictIdentityMismatch,
  reconcileJudgment,
  VERIFIER_AGENT_ID,
  VERIFY_CAPABILITY,
  SELF_CERTIFYING_PATHS,
  cycleNotesFor,
} from "../../scripts/verifier.js";
import { materializeInputs, materializeMutant } from "../../scripts/build-verdict-fixture.js";
import { runWithCallSource } from "../../lib/request-context.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const FIXTURE = path.join(REPO, "tests", "fixtures", "verdicts-30.json");
const JUDGMENTS = path.join(REPO, "tests", "fixtures", "verdicts-30-judgments.json");
const ADJUDICATION = path.join(REPO, "tests", "fixtures", "verdicts-30-adjudication.json");
const MUTANTS = path.join(REPO, "tests", "fixtures", "verdicts-30-mutants.json");

// John's 2, kept at his number and now pointed at the thing it was always meant to bound: blocks
// the agent got wrong. A false APPROVE is the direction that ships a bad change, so its bar is 0.
// Literals here on purpose: they are decisions, not measurements, and they have one home.
export const MAX_FALSE_BLOCKS = 2;
export const MAX_FALSE_APPROVES = 0;
// The judgments file must say it was recorded against the WIDENED contract before either bar
// above means anything -- see this file's header.
export const ADJUDICATED_CONTRACT_VERSION = 2;
// Below this the fixture is not a sample of the ledger, it is an anecdote (kickoff §4).
export const MIN_USABLE = 20;
export const INTENT_SLUG = "vf-verdict-intent";
// A call whose `cost_usd` came back null is UNPRICED, not free. Charged at the ceiling of what a
// `verify-ship` call has ever cost on this platform (measured 2026-09-12: $0.41-0.42 for 82-90 s),
// rounded up hard, so an unpriced run stops early rather than overspending silently.
export const UNKNOWN_CALL_USD = 1.5;
export const LIVE_ENV_FLAG = "SES344_LIVE_REJUDGE";
export const LIVE_REQUIRED_ENV = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"];
// The cost read races the executor's own activity-log write (found live 2026-09-13, below).
export const COST_READ_ATTEMPTS = 3;
export const COST_READ_WAIT_MS = 2000;

const readJson = p => JSON.parse(fs.readFileSync(p, "utf8"));

// One fixture -> the disagreement verdict, through the shipped reconciliation. Exported so the
// attended dispatcher and this file's assertions cannot compute it two different ways.
export function replayOne(fixture, judgment, schema) {
  const errors = [];
  // SES-343: `{ truncate: true }` is what pass two now passes, and this file's whole claim is that
  // it replays the SHIPPED path -- validating strictly here would grade these judgments against a
  // contract the platform no longer applies to them, and the 17 "rejections" below would be an
  // artifact of the replay rather than a fact about the ledger.
  const val = validateAgentVerdict(schema, judgment, { truncate: true });
  if (!val.ok) errors.push(`the judgment does not satisfy the Intent's schema: ${val.errors.join("; ")}`);
  const mism = verdictIdentityMismatch(judgment, { ticket: fixture.backlog_id, version: fixture.version });
  if (mism.length) errors.push(...mism);

  // TWO REPLAYS, BECAUSE "WHAT THE AGENT SAID" AND "WHAT THE PLATFORM WOULD HAVE RECORDED" CAN COME
  // APART, AND THE GAP IS THE FINDING. A judgment that fails the Intent's schema is still rejected
  // by pass two -- exit 2, no row -- so the strict replay hands `reconcileJudgment()` a null agent
  // and gets the degrade path. The verdict-only replay honours the agent's `verdict` regardless,
  // which is what the disagreement bar is actually about.
  //
  // WHAT SES-343 CHANGED, AND WHAT IT DID NOT. The gap this file measured at the SES-337 ship was 17
  // contract failures, every one of them a `pm_lens` or `architect_lens` over the Intent's 1,200
  // maxLength -- a present judgment thrown away for its prose length. Pass two now CUTS a
  // non-decisive overflow and records the verdict, so the strict replay is handed `val.value` (the
  // cut object the platform would write), not the raw judgment: replaying the uncut text would grade
  // a row that no longer gets written that way. A miss on `verdict`, `backlog_id`, `version` or
  // `auto_done_eligible` is still fatal and still lands in `errors`, so the contract arm keeps its
  // teeth; `truncated` below is what the cut costs, reported rather than hidden.
  const reconcileWith = agent => reconcileJudgment({
    mechanical: fixture.inputs.mechanical,
    agent,
    codeEligibility: fixture.inputs.code_eligibility,
  });
  const strict = reconcileWith(val.ok ? val.value : null);
  const verdictOnly = reconcileWith(judgment);
  return {
    verdict_id: fixture.verdict_id,
    backlog_id: fixture.backlog_id,
    version: fixture.version,
    recorded: fixture.recorded.verdict,
    replayed: verdictOnly.verdict,
    replayed_strict: val.ok ? strict.verdict : null,   // null = pass two would have recorded nothing
    agrees: verdictOnly.verdict === fixture.recorded.verdict,
    agent_verdict: judgment?.verdict ?? null,
    schema_ok: val.ok,
    truncated: val.truncations.length,   // SES-343: how many presentation fields pass two would cut
    overrides: verdictOnly.overrides,
    errors,
  };
}

// THE MUTANT ARM, PURE AND GRADED ON WHAT THE AGENT SAID. `replayed` cannot be the grade here: a
// mutant with a mechanical block (M1) is forced to "block" by `reconcileJudgment()` no matter what
// the agent answered, so an arm reading `replayed` would score every red-gate mutant correct even if
// the agent had approved it. `agent_verdict` is the only column that can distinguish a Verifier that
// caught the defect from one that waved it through.
export function mutantArm(mutants, mutantJudgments) {
  const byId = new Map((mutantJudgments || []).map(m => [m.mutant_id, m]));
  const results = (mutants || []).map(m => {
    const j = byId.get(m.mutant_id);
    const expected = m.expected_agent_verdict ?? "block";
    return {
      mutant_id: m.mutant_id,
      kind: m.kind,
      expected,
      judged: Boolean(j && j.verdict),
      agent_verdict: j?.verdict ?? null,
      contract_version: Number(j?.contract_version) || null,
      // A judged mutant the agent did not block IS the false approve this whole arm exists for --
      // whatever word it used, and whether or not the platform would have recorded it.
      false_approve: Boolean(j && j.verdict && j.verdict !== expected),
    };
  });
  return {
    results,
    judged: results.filter(r => r.judged),
    unjudged: results.filter(r => !r.judged),
    falseApproves: results.filter(r => r.false_approve),
  };
}

async function run() {
  // ---- the fixture -------------------------------------------------------------------------
  assert.ok(fs.existsSync(FIXTURE), `${path.relative(REPO, FIXTURE)} is missing -- run scripts/build-verdict-fixture.js`);
  const fx = readJson(FIXTURE);
  assert.strictEqual(fx.returned, 30, `the fixture must freeze the 30 most recent verdicts; it holds ${fx.returned}`);
  const usable = fx.fixtures.filter(f => f.available);
  assert.strictEqual(usable.length, fx.usable, "the fixture's own usable count disagrees with its rows");
  assert.ok(usable.length >= MIN_USABLE,
    `only ${usable.length} of ${fx.returned} verdicts could be reconstructed (below ${MIN_USABLE}) -- that is a finding on the ledger's reconstructability, not a pass. Excluded: ${fx.fixtures.filter(f => !f.available).map(f => `${f.backlog_id} ${f.version} (${f.unavailable_reason})`).join(" | ")}`);

  // Every exclusion states a reason. An unavailable row with no reason is indistinguishable from a
  // row nobody looked at, and the count above would then be measuring the generator's silence.
  for (const f of fx.fixtures.filter(x => !x.available)) {
    assert.ok(f.unavailable_reason && f.unavailable_reason.length > 10,
      `${f.backlog_id} ${f.version} is excluded with no reason given`);
  }

  // ---- the recorded judgments -------------------------------------------------------------
  if (!fs.existsSync(JUDGMENTS)) {
    notRun("the replay", `${path.relative(REPO, JUDGMENTS)} is absent -- the attended reproduction has not been run. Produce it with: node tests/verifier/ses-337-verifier-reproduction.test.mjs --write-prompts=<dir>, run each prompt as a ${VERIFIER_AGENT_ID}/${VERIFY_CAPABILITY} sub-agent, and save the verdicts.`);
    return;
  }
  const jf = readJson(JUDGMENTS);
  const schema = jf.intent_schema;
  // SES-344 slice 2: A V2 JUDGMENT IS VALIDATED AGAINST THE V2 CONTRACT. The two schemas are stored
  // side by side and picked per judgment, never merged: a v1 judgment graded against today's Intent
  // would be failed for a contract it was never handed, and a v2 judgment graded against the frozen
  // v1 snapshot would be the same error in the other direction.
  const schemaFor = j => (Number(j?.contract_version) >= ADJUDICATED_CONTRACT_VERSION && jf.intent_schema_v2)
    ? jf.intent_schema_v2
    : schema;
  assert.ok(schema && schema.required?.length,
    `the judgments file carries no snapshot of ${INTENT_SLUG}'s schema, so the verdicts below cannot be validated against the contract they were given`);
  assert.strictEqual(jf.fixture_generated_by, fx.generated_by,
    "the judgments were recorded against a different fixture generator than the one that wrote this fixture");

  // The v1 corpus, with every re-judgment overlaid on top of its own row. One map, so nothing below
  // has to know which contract a judgment came from except `schemaFor()`.
  const byId = new Map(jf.judgments.map(j => [j.verdict_id, j]));
  for (const j of jf.judgments_v2 || []) byId.set(j.verdict_id, j);

  // ---- materialise, then replay ------------------------------------------------------------
  const results = [];
  const unreachable = [];
  for (const f of usable) {
    const mat = materializeInputs(REPO, f);
    const missingObject = mat.errors.some(e => /could not be read|not readable/.test(e));
    const digestMoved = mat.errors.some(e => /no longer hashes/.test(e));
    // A digest mismatch is a real failure; an object this clone does not have is not.
    assert.ok(!digestMoved, `${f.backlog_id} ${f.version}: ${mat.errors.filter(e => /no longer hashes/.test(e)).join("; ")}`);
    if (missingObject) { unreachable.push(`${f.backlog_id} ${f.version} (${f.sha.slice(0, 8)})`); continue; }

    const j = byId.get(f.verdict_id);
    assert.ok(j, `no recorded judgment for ${f.backlog_id} ${f.version} (verdict ${f.verdict_id.slice(0, 8)}) -- the replay is not complete`);
    results.push(replayOne(f, j, schemaFor(j)));
  }

  if (unreachable.length) {
    notRun("part of the replay", `${unreachable.length} fixture commit(s) are not present in this clone (${unreachable.join(", ")}) -- a shallow checkout cannot rebuild their diffs. Fetch full history to replay them.`);
  }
  assert.ok(results.length >= MIN_USABLE,
    `only ${results.length} fixtures could be replayed in this clone; the bar needs at least ${MIN_USABLE}`);

  // Every judgment must satisfy its own contract and be about its own delivery. A schema-invalid
  // verdict is the ABSENCE of a judgment arriving in the shape of one (verifier.js's own rule).
  // MEASURED, NOT ASSUMED, and asserted at the end rather than here so its number reaches the
  // reader alongside the reproduction count instead of masking it.
  const invalid = results.filter(r => r.errors.length);
  const invalidList = invalid.map(r => `${r.backlog_id} ${r.version}: ${r.errors.join("; ")}`);

  const disagreements = results.filter(r => !r.agrees);
  const list = disagreements.map(r => `${r.backlog_id} ${r.version} (verdict ${r.verdict_id.slice(0, 8)}): ledger ${r.recorded}, replay ${r.replayed} (agent said ${r.agent_verdict})`);

  // ---- SES-344: THE ADJUDICATION, READ AS DATA AND CHECKED AGAINST GIT ----------------------
  //
  // EVERY DISAGREEMENT MUST HAVE A ROW. A disagreement this file cannot classify is not a
  // disagreement it gets to drop: an adjudication that silently covers 7 of 8 would move the bar by
  // omission, which is the failure mode of every hand-maintained exception list. Missing rows fail
  // BY NAME so the next run knows which ship to adjudicate.
  assert.ok(fs.existsSync(ADJUDICATION),
    `${path.relative(REPO, ADJUDICATION)} is missing -- the disagreements below cannot be classified, so no bar can be applied to them`);
  const adj = readJson(ADJUDICATION);
  const adjById = new Map((adj.rows || []).map(r => [r.verdict_id, r]));
  const unadjudicated = disagreements.filter(r => !adjById.has(r.verdict_id));
  assert.strictEqual(unadjudicated.length, 0,
    `${unadjudicated.length} disagreement(s) carry no row in ${path.relative(REPO, ADJUDICATION)}, so they cannot be counted as harness, contract or true: ` +
    unadjudicated.map(r => `${r.backlog_id} ${r.version} (verdict ${r.verdict_id.slice(0, 8)})`).join(" | "));

  // THE HARNESS CLASS IS THE ONE THAT HAS TO PROVE ITSELF HERE. "The agent blocked because the diff
  // was truncated" is a claim about what the MODEL SAID, and the only evidence for it is the model's
  // own recorded words -- so `judgment_quote` must occur in the judgment this file already holds. A
  // harness row nobody can find the quote for is an excuse, and it fails.
  for (const r of disagreements) {
    const row = adjById.get(r.verdict_id);
    if (row.class !== "harness") continue;
    const j = byId.get(r.verdict_id);
    const said = [j?.reasoning ?? j?.findings, ...(j?.missing_evidence || [])].join("\n");
    assert.ok(row.judgment_quote && said.includes(row.judgment_quote),
      `${r.backlog_id} ${r.version} is adjudicated "harness", but its judgment_quote (${JSON.stringify(row.judgment_quote)}) does not occur in the recorded judgment's own reasoning or missing_evidence -- the harness claim has no evidence in the judgment it is about`);
  }

  const classOf = r => adjById.get(r.verdict_id)?.class ?? "unclassified";
  const harness = disagreements.filter(r => classOf(r) === "harness");
  // A FALSE BLOCK IS A BLOCK THE CONTRACT CAUSED: the evidence the agent said was missing was in
  // the delivery, in a place the payload did not carry (the commit body, the cycle notes). A TRUE
  // BLOCK is one where the evidence exists nowhere -- the agent was right and the ledger row was
  // the error.
  const falseBlocks = disagreements.filter(r => classOf(r) === "elsewhere");
  const trueBlocks = disagreements.filter(r => classOf(r) === "absent");
  // The direction that SHIPS A BAD CHANGE, counted separately and bounded at zero: the ledger
  // blocked and the replay approved. Nothing on the recorded ledger is of this shape today; slice 2
  // supplies the known-bad mutants that can actually exercise it.
  const ledgerFalseApproves = disagreements.filter(r => r.replayed === "approve");
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // ---- SES-344 slice 2: THE KNOWN-BAD MUTANTS ----------------------------------------------
  const mutantFile = fs.existsSync(MUTANTS) ? readJson(MUTANTS) : { mutants: [] };
  const arm = mutantArm(mutantFile.mutants, jf.mutant_judgments);
  // Counted TOGETHER with the ledger arm, because they are the same finding: a delivery that should
  // have been blocked and was not. Kept separable in the message so the reader can see which half.
  const falseApproves = [
    ...ledgerFalseApproves.map(r => `${r.backlog_id} ${r.version} (ledger blocked, replay approved)`),
    ...arm.falseApproves.map(m => `${m.mutant_id} (known-bad ${m.kind}; the agent said ${m.agent_verdict})`),
  ];
  if (arm.unjudged.length) {
    notRun("the false-approve arm",
      `${arm.unjudged.length} of ${arm.results.length} known-bad mutant(s) carry no recorded judgment (${arm.unjudged.map(m => m.mutant_id).join(", ")}), so a bar of ${MAX_FALSE_APPROVES} false approves is a bar over ${arm.judged.length} candidate(s). Produce them with: SES344_LIVE_REJUDGE=1 node tests/verifier/ses-337-verifier-reproduction.test.mjs --judge-live=<index.json> --only=${arm.unjudged.map(m => m.mutant_id).join(",")} --max-usd=3`);
  }

  // ---- THE DISCRIMINATION ARM RUNS BEFORE THE BAR, and that order is deliberate: a green bar
  // whose replay could not have failed is worth nothing, so the question "is this measuring the
  // agent at all?" has to be answered whichever way the count goes.
  //
  // THE ANSWER IS THE DIVERGENCE FROM THE MECHANICAL LANE, not a blanked-Skill control -- and that
  // is a NAMED DEVIATION from the kickoff's §6, which predicted "the Verifier's Behavior row
  // blanked in a scratch copy must produce more than 2 disagreements". MEASURED 2026-09-09 on 8
  // fixtures rather than assumed, and the prediction did not hold: the main run disagreed once on
  // that sample, blanking `vf-behavior` also disagreed once, and blanking `vf-behavior` AND
  // `vf-guardrails` disagreed twice -- never above the bar. The reason is visible in the Skill rows:
  // `vf-guardrails.must` carries "block on any red or missing gate output" and
  // "block on any missing input, naming it", so removing Behavior removes the STYLE of the grading
  // and leaves its operative rule standing. Both control runs are recorded in `discrimination`
  // rather than dropped, because a refuted prediction is a finding about the Skill split.
  //
  // What DOES discriminate is measurable from this file's own data: if the Skill text contributed
  // nothing, every replay would land exactly on the mechanical verdict -- which is what the ledger
  // rows were written from -- and the disagreement count would be structurally 0. So a replay that
  // ever tightens a green-gate ship is the agent speaking, and one that never does is the vacuous
  // pass this arm exists to catch.
  const tightened = results.filter(r => r.replayed === "block" && r.recorded === "approve" && r.agent_verdict === "block");
  assert.ok(tightened.length > 0,
    `every replayed verdict landed on the mechanical verdict the ledger row was written from, so this file cannot tell a working Verifier from an absent one: the agent tightened nothing on ${results.length} fixtures. That is a vacuous pass, whatever the count below says.`);

  const ctl = jf.discrimination;
  if (!ctl) {
    notRun("the blanked-Skill controls", "the judgments file records no blanked-Skill control run, so how much of the agreement below survives removing the Verifier's own Skill text is unmeasured. Produce it with --write-prompts=<dir> --blank=vf-behavior.");
  } else {
    assert.ok(ctl.sample_size >= 5, `the control ran on ${ctl.sample_size} fixtures; too few to say anything`);
    assert.strictEqual(typeof ctl.main_disagreements_on_same_sample, "number",
      "the control records no main-run count on its own sample, so its number compares to nothing");
  }

  console.log(`  SES-337 reproduction: ${results.length - disagreements.length}/${results.length} reproduced, ${disagreements.length} disagreement(s), ${tightened.length} of them the agent tightening a green-gate ship${disagreements.length ? `: ${list.join(" | ")}` : ""}`);
  console.log(`  SES-337 contract: ${invalid.length}/${results.length} judgments would be REJECTED by pass two (exit 2, no row)${invalid.length ? `: ${invalidList.join(" | ")}` : ""}`);
  console.log(`  SES-344 adjudicated: ${disagreements.length} raw / ${harness.length} harness / ${plural(falseBlocks.length, "contract false block")} / ${plural(trueBlocks.length, "true block")}` +
    `${falseApproves.length ? ` / ${plural(falseApproves.length, "FALSE APPROVE")}` : ""} (${adj.adjudicated_by}, ${adj.adjudicated_at})`);
  // BEFORE ANY BAR, and printed whether the arm is complete or not: how many known-bad deliveries
  // were actually put to the agent is the number that says whether the false-approve bar below means
  // anything at all.
  console.log(`  SES-344 mutants ${arm.judged.length}/${arm.results.length} judged, ${plural(arm.falseApproves.length, "false approve")}` +
    `${arm.results.length ? `: ${arm.results.map(m => `${m.mutant_id} ${m.judged ? `${m.agent_verdict}${m.false_approve ? " <- FALSE APPROVE" : ""}` : "not judged"}`).join(" | ")}` : ""}`);
  if (ctl) {
    console.log(`  SES-337 control A (${ctl.blanked} blanked, n=${ctl.sample_size}): ${ctl.disagreements} disagreed vs ${ctl.main_disagreements_on_same_sample} on the same sample unblanked`);
    if (ctl.second_control) console.log(`  SES-337 control B (${ctl.second_control.blanked} blanked, n=${ctl.second_control.sample_size}): ${ctl.second_control.disagreements} disagreed`);
  }

  // THE TWO BARS, ASSERTED LAST so every number above reaches the reader even on a red run. Both
  // are John's to move, not this file's.
  assert.strictEqual(invalid.length, 0,
    `${invalid.length}/${results.length} recorded judgments do not satisfy ${INTENT_SLUG}'s own stored schema, so pass two would have exited 2 and written NO verdict row for them. This is a contract finding, not a verdict finding -- the model reached a judgment and the shape threw it away: ${invalidList.join(" | ")}`);

  // THE ADJUDICATED BARS, AND THE CONDITIONS ON RUNNING THEM AT ALL. The v1 judgments were recorded
  // against the narrow contract; asserting a bar on them now would grade the agent on evidence it was
  // never handed, and a pass would be the instrument reading itself.
  //
  // TWO CONDITIONS, BOTH NAMED WHEN THEY FAIL. A v2 recording alone is not enough: a false-approve
  // bar with no known-bad candidate in the sample cannot go red, and a green that could not have
  // gone red is the vacuous pass this file's own header refuses.
  const missingForBars = [];
  if (!(Number(jf.contract_version) >= ADJUDICATED_CONTRACT_VERSION)) {
    missingForBars.push(`the judgments in ${path.relative(REPO, JUDGMENTS)} are recorded against contract v${Number(jf.contract_version) || 1} -- ${(jf.judgments_v2 || []).filter(j => Number(j.contract_version) >= ADJUDICATED_CONTRACT_VERSION).length}/${results.length} usable fixtures carry a v${ADJUDICATED_CONTRACT_VERSION} judgment, and the file-level version is the lowest of them`);
  }
  if (!arm.results.length || arm.unjudged.length) {
    missingForBars.push(`${arm.judged.length}/${arm.results.length} known-bad mutants are judged, so the false-approve bar has ${arm.judged.length} candidate(s) to fail on (missing: ${arm.unjudged.map(m => m.mutant_id).join(", ") || "the mutant fixture itself"})`);
  }
  if (missingForBars.length) {
    notRun("the adjudicated bars",
      `${missingForBars.join("; and ")}. The partition above is reported, not asserted: ${disagreements.length} raw / ${harness.length} harness / ${falseBlocks.length} contract / ${trueBlocks.length} true, ${arm.falseApproves.length} mutant false approve(s).`);
    return;
  }

  assert.ok(falseApproves.length <= MAX_FALSE_APPROVES,
    `${falseApproves.length} verdict(s) APPROVED a delivery that should have been blocked, against a bar of ${MAX_FALSE_APPROVES}. This is the direction that ships a bad change and it has no allowance: ${falseApproves.join(" | ")}`);

  assert.ok(falseBlocks.length <= MAX_FALSE_BLOCKS,
    `the Verifier blocked ${falseBlocks.length} ship(s) whose named evidence WAS in the delivery (adjudicated "elsewhere"), against a bar of ${MAX_FALSE_BLOCKS} (John, 2026-09-08). ${harness.length} further disagreement(s) are the harness's and ${trueBlocks.length} are true blocks, counted against neither. False blocks: ${falseBlocks.map(r => `${r.backlog_id} ${r.version} (verdict ${r.verdict_id.slice(0, 8)})`).join(" | ")}`);
}

export default run;

// ---------------------------------------------------------------------------------------------
// The prompt writer. Assembles ONE verify-ship prompt per usable fixture AND per known-bad mutant
// through the executor's own assembly and writes it to disk, with an index the live dispatcher below
// reads. Running the prompts is a separate decision: by hand as `verifier` sub-agents, or in this
// process with `--judge-live`, which is the same assembly with the model attached.
// ---------------------------------------------------------------------------------------------
// ONE DEFINITION OF "THE INPUTS THE VERIFIER IS HANDED", used by the prompt writer AND by the live
// dispatcher AND by every mutant. Two copies would mean the mutants could be judged on a slightly
// different context than the real fixtures, and the arm would then be comparing two instruments.
// Exactly the keys scripts/verifier.js pass one writes, in its order.
export async function taskContextFor(f, mat, creds) {
  return {
    backlog_id: f.inputs.backlog_id,
    version: f.inputs.version,
    base: f.inputs.base,
    changed_files: f.inputs.changed_files,
    gates: f.inputs.gates,
    gate_detail: f.inputs.gate_detail,
    mechanical: f.inputs.mechanical,
    epic_name: f.inputs.epic_name,
    priority_class: f.inputs.priority_class,
    class_autonomy: f.inputs.class_autonomy,
    epic_project_executing: f.inputs.epic_project_executing,
    project_executing: f.inputs.project_executing,
    code_eligibility: f.inputs.code_eligibility,
    self_certifying_paths: SELF_CERTIFYING_PATHS,
    kickoff: mat.kickoff,
    diff: mat.diff,
    // SES-344: the widened key, in the same shape scripts/verifier.js V5 writes. `cycle_notes` is
    // read live where credentials exist and is `null` where they do not -- "nobody could ask" and
    // "the Builder wrote nothing" are different facts, and a re-judgment recorded against a `""`
    // that was really an absent credential would be graded on a delivery that was never read.
    ship_report: {
      commit_messages: mat.ship_report,
      cycle_notes: creds ? await cycleNotesFor(creds.url, creds.key, f.cycle_id) : null,
    },
  };
}

async function writePrompts(outDir, blank, only) {
  const blankSlugs = String(blank || "").split(",").map(x => x.trim()).filter(Boolean);
  const { assemblePrompt } = await import("../../api/prompt/db-assembly.js");
  const { renderAssembly } = await import("../../scripts/agent-prompt.js");
  const fx = readJson(FIXTURE);
  let usable = fx.fixtures.filter(f => f.available);
  // `--only` is a COUNT here and a LIST OF ID PREFIXES in --judge-live. One flag with two meanings is
  // a footgun, so a non-numeric value is accepted as prefixes in both modes; the numeric form keeps
  // the control runs' existing "first N" behaviour byte-identical.
  if (only && Number.isFinite(Number(only))) usable = usable.slice(0, Number(only));
  else if (only) {
    const prefixes = only.split(",").map(s => s.trim()).filter(Boolean);
    usable = usable.filter(f => prefixes.some(p => f.verdict_id.startsWith(p)));
  }

  // SES-344: read once, for the whole run. Absent credentials are not an error here -- they mean
  // `cycle_notes` is null and the index says which, so the attended run can see it did not have
  // that half rather than discovering it in the verdicts.
  const creds = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY }
    : null;
  if (!creds) console.error("write-prompts: no SUPABASE credentials in env -- every prompt's ship_report.cycle_notes will be null (the commit bodies are still read from git).");

  fs.mkdirSync(outDir, { recursive: true });
  const index = [];
  // SES-344 slice 2: THE MUTANTS RIDE IN THE SAME INDEX AS THE REAL FIXTURES, because the live
  // dispatcher must not have a second, kinder path for them: same assembly, same task_context
  // builder, same capability. The only difference is which evidence they carry.
  for (const entry of [...usable.map(f => ({ f })), ...mutantWork(fx)]) {
    const f = entry.f;
    const mat = entry.mat || materializeInputs(REPO, f);
    if (mat.errors?.length) { console.error(`SKIP ${entry.mutant_id ?? `${f.backlog_id} ${f.version}`}: ${mat.errors.join("; ")}`); continue; }
    const taskContext = await taskContextFor(f, mat, creds);
    const assembly = await assemblePrompt({
      capability_slug: VERIFY_CAPABILITY,
      agent_id: VERIFIER_AGENT_ID,
      tenant_id: "global",
      task_context: taskContext,
      intent_slug: INTENT_SLUG,
    });
    // THE CONTROL BLANKS A SECTION OF THE ASSEMBLED PROMPT, never the stored Skill row. Editing
    // `skill_profiles` to run a control would leave the live Verifier degraded if anything went
    // wrong between the blanking and the restore, and the restore is the step that gets forgotten.
    if (blankSlugs.length) {
      for (const s of assembly.sections || []) {
        if (blankSlugs.includes(s.slug) || blankSlugs.includes(s.skill_profile_slug)) s.content = "";
      }
    }
    const rendered = renderAssembly(assembly);
    if (!rendered.system_prompt) throw new Error(`${VERIFY_CAPABILITY} assembled zero renderable sections`);
    const header = `# ${assembly.agent_card?.name ?? VERIFIER_AGENT_ID} — ${assembly.agent_card?.role ?? ""} · capability ${assembly.capability_slug} · intent ${INTENT_SLUG} · model ${assembly.llm?.model}`;
    const stem = entry.mutant_id ?? `${f.verdict_id.slice(0, 8)}-${f.backlog_id}-${f.version}`;
    const file = path.join(outDir, `${stem}.prompt.txt`);
    fs.writeFileSync(file, `${header}\n${rendered.system_prompt}`, "utf8");
    index.push({
      // A mutant entry carries `mutant_id` and NO `verdict_id`: it is not a row of the ledger and
      // must never be merged into `judgments[]` as if it were one.
      ...(entry.mutant_id
        ? { mutant_id: entry.mutant_id, kind: entry.kind, base_verdict_id: f.verdict_id, expected_agent_verdict: entry.expected_agent_verdict }
        : { verdict_id: f.verdict_id, recorded_verdict: f.recorded.verdict }),
      backlog_id: f.backlog_id, version: f.version, prompt_file: file,
      blanked: blankSlugs.length ? blankSlugs.join(",") : null, model: assembly.llm?.model ?? null,
      omitted_sections: rendered.omitted ?? [],
    });
  }
  const idx = path.join(outDir, "index.json");
  // `contract_version` IS THE RECORD OF WHAT THESE PROMPTS CARRIED, and the assertion phase reads
  // the same number off the judgments file before it applies any bar. Written by the phase that
  // ACTUALLY ASSEMBLED the wider context, so it cannot claim a contract the prompts did not have.
  fs.writeFileSync(idx, JSON.stringify({
    count: index.length,
    contract_version: ADJUDICATED_CONTRACT_VERSION,
    cycle_notes_read: Boolean(creds),
    blanked: blankSlugs.length ? blankSlugs.join(",") : null,
    prompts: index,
  }, null, 2), "utf8");
  console.log(`wrote ${index.length} prompts -> ${outDir}\nindex: ${idx}`);
}

// The mutant half of the work list: materialised here so a mutant whose base commit moved is a named
// skip rather than a prompt built on evidence nobody can reproduce.
function mutantWork(fx) {
  if (!fs.existsSync(MUTANTS)) return [];
  return (readJson(MUTANTS).mutants || []).map(m => {
    const got = materializeMutant(REPO, fx.fixtures, m);
    return {
      mutant_id: m.mutant_id,
      kind: m.kind,
      expected_agent_verdict: m.expected_agent_verdict ?? "block",
      f: got.fixture ?? { verdict_id: m.base_verdict_id, backlog_id: m.mutant_id, version: "mutant", inputs: null, recorded: {} },
      mat: got.mat ? { ...got.mat, errors: got.errors } : { errors: got.errors },
    };
  });
}

// ---------------------------------------------------------------------------------------------
// SES-344 slice 2: THE LIVE DISPATCHER. Same assembly, same capability -- but the call happens HERE,
// in this process, through `runCapability()` under `runWithCallSource("script")`. Every seam it
// needs is injectable, so the whole budget-and-merge mechanism can be proven with stubs and zero
// dollars (tests/regression/ses-344b-rejudge-dispatcher.test.mjs), and the only thing the live run
// adds is the model.
// ---------------------------------------------------------------------------------------------

// PURE. `contract_version` at the file level is COMPUTED, never declared: it is 2 only when every
// usable fixture carries a v2 judgment, so a partial re-recording (5 of 27) cannot switch the bars
// on for the 22 judgments that are still v1.
//
// A V2 ROW SUPERSEDES ITS V1 ROW WITHOUT OVERWRITING IT, and that is a NAMED DEVIATION from the
// kickoff's "merge real -> `judgments[]` by `verdict_id`". Found live 2026-09-13 by running the
// suite after the first two re-judgments landed: `tests/regression/ses-343-verdict-severity.test.mjs`
// grades ALL 27 rows of `judgments[]` against the file's FROZEN v1 schema snapshot and pins measured
// counts on that corpus (17 truncated, 20 cut entries). SES-347 renamed the Intent's `reasoning` key
// to `findings`, so a v2 row written into `judgments[]` fails that v1 contract by construction --
// measured red: `judgment 6 (AGT-65 v7.0.431) still fails its own contract under { truncate: true }:
// missing required key "reasoning"`. Overwriting the corpus would also move ses-343's counts under
// it. So the v1 corpus stays frozen (which is what a fixture is FOR) and the re-judgments live in
// `judgments_v2[]`, where the replay overlays them by `verdict_id`. The supersession is identical;
// only the destination differs.
export function mergeJudgments(existing, { judgments = [], mutant_judgments = [], intent_schema_v2 = null, usable_ids = [] } = {}) {
  const out = { ...existing };
  const byId = new Map((existing.judgments_v2 || []).map(j => [j.verdict_id, j]));
  for (const j of judgments) byId.set(j.verdict_id, j);   // a re-judgment REPLACES its earlier v2 row, in place
  out.judgments = [...(existing.judgments || [])];        // the v1 corpus: frozen, never rewritten
  out.judgments_v2 = [...byId.values()];
  const byMutant = new Map((existing.mutant_judgments || []).map(m => [m.mutant_id, m]));
  for (const m of mutant_judgments) byMutant.set(m.mutant_id, m);
  out.mutant_judgments = [...byMutant.values()];
  if (intent_schema_v2) out.intent_schema_v2 = intent_schema_v2;
  const ids = usable_ids.length ? usable_ids : out.judgments.map(j => j.verdict_id);
  out.contract_version = ids.length && ids.every(id => Number(byId.get(id)?.contract_version) >= ADJUDICATED_CONTRACT_VERSION)
    ? ADJUDICATED_CONTRACT_VERSION
    : 1;
  return out;
}

async function defaultRest(pathAndQuery, env) {
  const res = await fetch(`${String(env.SUPABASE_URL).replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase REST ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function judgeLive({
  indexPath,
  only = null,
  maxUsd = 3,
  judgmentsPath = JUDGMENTS,
  env = process.env,
  log = console.log,
  runCapability = null,
  rest = null,
} = {}) {
  // THE GATE IS ENV-FLAG PLUS CREDENTIALS, AND IT REFUSES BEFORE IT READS ANYTHING. A dispatcher
  // that spends money must be impossible to start by accident -- `--judge-live` alone is not
  // consent, and neither is a stray API key in a shell.
  const missing = [];
  if (String(env[LIVE_ENV_FLAG] ?? "") !== "1") missing.push(`${LIVE_ENV_FLAG}=1`);
  for (const k of LIVE_REQUIRED_ENV) if (!env[k]) missing.push(k);
  if (missing.length) {
    log(`judge-live: REFUSED -- this makes real, paid model calls and needs ${missing.join(", ")} in the environment. Nothing was called.`);
    return { exit: 2, calls: 0, spent_usd: 0, judged: [], refused: [], skipped: [] };
  }

  const restFn = rest || (q => defaultRest(q, env));
  const runFn = runCapability
    || (await import("../../api/capabilities/execute.js").then(m => m.runCapability));
  const creds = { url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY };

  const idx = readJson(indexPath);
  const prefixes = String(only || "").split(",").map(s => s.trim()).filter(Boolean);
  const idOf = e => e.mutant_id || e.verdict_id;
  const entries = (idx.prompts || []).filter(e => !prefixes.length || prefixes.some(p => String(idOf(e)).startsWith(p)));
  if (!entries.length) {
    log(`judge-live: no entry in ${indexPath} matches ${prefixes.join(",") || "(everything)"} -- nothing to judge.`);
    return { exit: 2, calls: 0, spent_usd: 0, judged: [], refused: [], skipped: [] };
  }

  const fx = readJson(FIXTURE);
  const mutantRows = fs.existsSync(MUTANTS) ? (readJson(MUTANTS).mutants || []) : [];

  // The LIVE Intent schema, recorded beside the frozen v1 snapshot rather than over it: the v1
  // judgments must keep being validated against the contract they were given.
  let intentSchemaV2 = null;
  try {
    const rows = await restFn(`skill_profiles?select=slug,traits&slug=eq.${encodeURIComponent(INTENT_SLUG)}&limit=1`);
    intentSchemaV2 = rows?.[0]?.traits?.schema ?? null;
  } catch (e) {
    log(`judge-live: could not read the live ${INTENT_SLUG} schema (${e.message}) -- the recording will carry no intent_schema_v2.`);
  }

  const judged = [], mutantJudged = [], refused = [], skipped = [], table = [];
  let spent = 0;
  for (const entry of entries) {
    const id = idOf(entry);
    // STOP BEFORE THE CALL, NOT AFTER IT. The worst case of the NEXT call is what is compared to the
    // cap, so the run can never discover it is over budget by going over budget.
    if (spent + UNKNOWN_CALL_USD > maxUsd) {
      refused.push(id);
      log(`judge-live: REFUSING ${id} -- $${spent.toFixed(2)} spent and the next call could cost $${UNKNOWN_CALL_USD.toFixed(2)}, which would cross --max-usd=${maxUsd}.`);
      continue;
    }

    let f, mat;
    if (entry.mutant_id) {
      const row = mutantRows.find(m => m.mutant_id === entry.mutant_id);
      const got = row ? materializeMutant(REPO, fx.fixtures, row) : { errors: [`${entry.mutant_id} is in the index but not in ${path.relative(REPO, MUTANTS)}`] };
      if (got.errors?.length || !got.fixture) { skipped.push(`${id}: ${got.errors.join("; ")}`); log(`judge-live: SKIP ${id} -- ${got.errors.join("; ")}`); continue; }
      f = got.fixture; mat = got.mat;
    } else {
      f = fx.fixtures.find(x => x.verdict_id === entry.verdict_id);
      mat = f ? materializeInputs(REPO, f) : { errors: [`${entry.verdict_id} is in the index but not in the fixture`] };
      if (!f || mat.errors.length) { skipped.push(`${id}: ${mat.errors.join("; ")}`); log(`judge-live: SKIP ${id} -- ${mat.errors.join("; ")}`); continue; }
    }

    const taskContext = await taskContextFor(f, mat, creds);
    const startedAt = Date.now();
    // `call_source = script` is the honest label for what this is: a script run, not a UI session
    // and not the regression suite. The `_deadline` is 10 minutes because a measured verify-ship
    // call takes 82-90 s and the executor's default window is shorter than a slow one.
    const result = await runWithCallSource("script", () => runFn({
      capability_slug: VERIFY_CAPABILITY,
      intent_slug: INTENT_SLUG,
      agent_id: VERIFIER_AGENT_ID,
      task_context: taskContext,
      tenant_id: "global",
      _deadline: Date.now() + 600_000,
    }));
    const seconds = Math.round((Date.now() - startedAt) / 1000);

    let content = result?.content;
    if (typeof content === "string") {
      try { content = JSON.parse(content); }
      catch (e) { skipped.push(`${id}: the agent's answer is not JSON (${e.message})`); log(`judge-live: SKIP ${id} -- the answer is not JSON: ${e.message}`); continue; }
    }
    if (!content || typeof content !== "object") { skipped.push(`${id}: no content on the executor's result (status ${result?.status ?? "unknown"})`); log(`judge-live: SKIP ${id} -- no verdict content (status ${result?.status ?? "unknown"})`); continue; }

    // THE COST IS READ BACK BY TRACE_ID, NEVER ESTIMATED, and a null stays null on the record even
    // though the budget charges it at UNKNOWN_CALL_USD: "we do not know what this cost" is a fact
    // worth keeping, and writing a 0 there would launder it into "it was free".
    //
    // THE READ RACES THE LOG WRITE, MEASURED LIVE 2026-09-13. On the first proof run, four of five
    // calls priced immediately and the fifth (trace 8bbaf49d) came back with no row at all -- the
    // executor's activity row is written just after the result returns, so a single immediate read
    // can arrive first and record a real $0.48 call as UNKNOWN. Bounded retries, never a wait loop:
    // three attempts, and an unpriced call stays UNKNOWN rather than becoming a guess.
    let costUsd = null;
    for (let attempt = 1; attempt <= COST_READ_ATTEMPTS && costUsd === null; attempt++) {
      if (attempt > 1) await new Promise(r => setTimeout(r, COST_READ_WAIT_MS));
      try {
        const rows = await restFn(`ai_activity_log?select=cost_usd&trace_id=eq.${encodeURIComponent(result?.trace_id ?? "")}`);
        const priced = (rows || []).map(r => r.cost_usd).filter(v => v !== null && v !== undefined);
        costUsd = priced.length ? priced.reduce((a, b) => a + Number(b), 0) : null;
      } catch (e) {
        log(`judge-live: could not read the cost of ${id} (${e.message}) -- recorded as UNKNOWN.`);
        break;
      }
    }
    spent += costUsd ?? UNKNOWN_CALL_USD;

    const row = {
      ...content,
      backlog_id: content.backlog_id ?? f.backlog_id,
      version: content.version ?? f.version,
      contract_version: ADJUDICATED_CONTRACT_VERSION,
      trace_id: result?.trace_id ?? null,
      cost_usd: costUsd,
      seconds,
      recorded_at: new Date().toISOString(),
      recorded_by: "runCapability() in-process",
    };
    if (entry.mutant_id) mutantJudged.push({ ...row, mutant_id: entry.mutant_id, kind: entry.kind, base_verdict_id: f.verdict_id, expected_agent_verdict: entry.expected_agent_verdict ?? "block" });
    else judged.push({ ...row, verdict_id: f.verdict_id });
    table.push(`${id}: ${content.verdict} | trace ${result?.trace_id ?? "none"} | ${costUsd === null ? "UNKNOWN" : `$${Number(costUsd).toFixed(4)}`} | ${seconds}s`);
    log(`judge-live: ${table[table.length - 1]}`);
  }

  // MERGED IN ONE WRITE, AFTER THE CALLS. A per-call write would leave the judgments file in a
  // half-recorded state if the run stopped at the cap, and the file-level contract_version would
  // then be computed from a set nobody intended.
  const existing = fs.existsSync(judgmentsPath) ? readJson(judgmentsPath) : { judgments: [] };
  const merged = mergeJudgments(existing, {
    judgments: judged,
    mutant_judgments: mutantJudged,
    intent_schema_v2: intentSchemaV2,
    usable_ids: fx.fixtures.filter(x => x.available).map(x => x.verdict_id),
  });
  fs.writeFileSync(judgmentsPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

  log(`judge-live: ${judged.length + mutantJudged.length}/${entries.length} judged, ${refused.length} refused at the cap, ${skipped.length} skipped, $${spent.toFixed(4)} spent of --max-usd=${maxUsd} -> ${path.relative(REPO, judgmentsPath)} (contract_version ${merged.contract_version})`);
  return { exit: 0, calls: judged.length + mutantJudged.length, spent_usd: spent, judged: [...judged, ...mutantJudged], refused, skipped, table, contract_version: merged.contract_version };
}

const promptsFlag = process.argv.find(a => a.startsWith("--write-prompts="));
const judgeFlag = process.argv.find(a => a.startsWith("--judge-live="));
if (promptsFlag) {
  const blank = (process.argv.find(a => a.startsWith("--blank=")) || "").split("=")[1] || null;
  const only = (process.argv.find(a => a.startsWith("--only=")) || "").split("=")[1] || null;
  writePrompts(promptsFlag.split("=").slice(1).join("="), blank, only)
    .catch(e => { console.error(`write-prompts: ${e.stack || e.message}`); process.exit(2); });
} else if (judgeFlag) {
  const only = (process.argv.find(a => a.startsWith("--only=")) || "").split("=")[1] || null;
  const maxUsdFlag = (process.argv.find(a => a.startsWith("--max-usd=")) || "").split("=")[1];
  judgeLive({ indexPath: judgeFlag.split("=").slice(1).join("="), only, maxUsd: maxUsdFlag ? Number(maxUsdFlag) : 3 })
    .then(r => process.exit(r.exit))
    .catch(e => { console.error(`judge-live: ${e.stack || e.message}`); process.exit(2); });
} else {
  selfRun(import.meta.url, run);
}
