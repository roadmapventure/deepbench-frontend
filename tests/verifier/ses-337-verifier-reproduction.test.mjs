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
import { materializeInputs } from "../../scripts/build-verdict-fixture.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const FIXTURE = path.join(REPO, "tests", "fixtures", "verdicts-30.json");
const JUDGMENTS = path.join(REPO, "tests", "fixtures", "verdicts-30-judgments.json");
const ADJUDICATION = path.join(REPO, "tests", "fixtures", "verdicts-30-adjudication.json");

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
  assert.ok(schema && schema.required?.length,
    `the judgments file carries no snapshot of ${INTENT_SLUG}'s schema, so the verdicts below cannot be validated against the contract they were given`);
  assert.strictEqual(jf.fixture_generated_by, fx.generated_by,
    "the judgments were recorded against a different fixture generator than the one that wrote this fixture");

  const byId = new Map(jf.judgments.map(j => [j.verdict_id, j]));

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
    results.push(replayOne(f, j, schema));
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
  const falseApproves = disagreements.filter(r => r.replayed === "approve");
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

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
  if (ctl) {
    console.log(`  SES-337 control A (${ctl.blanked} blanked, n=${ctl.sample_size}): ${ctl.disagreements} disagreed vs ${ctl.main_disagreements_on_same_sample} on the same sample unblanked`);
    if (ctl.second_control) console.log(`  SES-337 control B (${ctl.second_control.blanked} blanked, n=${ctl.second_control.sample_size}): ${ctl.second_control.disagreements} disagreed`);
  }

  // THE TWO BARS, ASSERTED LAST so every number above reaches the reader even on a red run. Both
  // are John's to move, not this file's.
  assert.strictEqual(invalid.length, 0,
    `${invalid.length}/${results.length} recorded judgments do not satisfy ${INTENT_SLUG}'s own stored schema, so pass two would have exited 2 and written NO verdict row for them. This is a contract finding, not a verdict finding -- the model reached a judgment and the shape threw it away: ${invalidList.join(" | ")}`);

  // THE ADJUDICATED BARS, AND THE CONDITION ON RUNNING THEM AT ALL. These judgments were recorded
  // against contract v1; asserting a bar on them now would grade the agent on evidence it was never
  // handed, and a pass would be the instrument reading itself. Declared not-run by name until a v2
  // recording exists -- the number this file exists to produce is slice 2's to record.
  if (!(Number(jf.contract_version) >= ADJUDICATED_CONTRACT_VERSION)) {
    notRun("the adjudicated bar",
      `the ${results.length} judgments in ${path.relative(REPO, JUDGMENTS)} are recorded against contract v1 -- re-judge under the widened contract (slice 2), which records contract_version ${ADJUDICATED_CONTRACT_VERSION}. The partition above is reported, not asserted: ${disagreements.length} raw / ${harness.length} harness / ${falseBlocks.length} contract / ${trueBlocks.length} true.`);
    return;
  }

  assert.ok(falseApproves.length <= MAX_FALSE_APPROVES,
    `${falseApproves.length} replayed verdict(s) APPROVED a ship the ledger blocked, against a bar of ${MAX_FALSE_APPROVES}. This is the direction that ships a bad change and it has no allowance: ${falseApproves.map(r => `${r.backlog_id} ${r.version}`).join(" | ")}`);

  assert.ok(falseBlocks.length <= MAX_FALSE_BLOCKS,
    `the Verifier blocked ${falseBlocks.length} ship(s) whose named evidence WAS in the delivery (adjudicated "elsewhere"), against a bar of ${MAX_FALSE_BLOCKS} (John, 2026-09-08). ${harness.length} further disagreement(s) are the harness's and ${trueBlocks.length} are true blocks, counted against neither. False blocks: ${falseBlocks.map(r => `${r.backlog_id} ${r.version} (verdict ${r.verdict_id.slice(0, 8)})`).join(" | ")}`);
}

export default run;

// ---------------------------------------------------------------------------------------------
// The attended dispatcher. Assembles ONE verify-ship prompt per usable fixture through the
// executor's own assembly and writes it to disk; the model calls happen outside this process, as
// `verifier` sub-agents in the session that runs this.
// ---------------------------------------------------------------------------------------------
async function writePrompts(outDir, blank, only) {
  const blankSlugs = String(blank || "").split(",").map(x => x.trim()).filter(Boolean);
  const { assemblePrompt } = await import("../../api/prompt/db-assembly.js");
  const { renderAssembly } = await import("../../scripts/agent-prompt.js");
  const fx = readJson(FIXTURE);
  let usable = fx.fixtures.filter(f => f.available);
  if (only) usable = usable.slice(0, Number(only));

  // SES-344: read once, for the whole run. Absent credentials are not an error here -- they mean
  // `cycle_notes` is null and the index says which, so the attended run can see it did not have
  // that half rather than discovering it in the verdicts.
  const creds = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY }
    : null;
  if (!creds) console.error("write-prompts: no SUPABASE credentials in env -- every prompt's ship_report.cycle_notes will be null (the commit bodies are still read from git).");

  fs.mkdirSync(outDir, { recursive: true });
  const index = [];
  for (const f of usable) {
    const mat = materializeInputs(REPO, f);
    if (mat.errors.length) { console.error(`SKIP ${f.backlog_id} ${f.version}: ${mat.errors.join("; ")}`); continue; }
    // Exactly the keys scripts/verifier.js pass one writes, in its order.
    const taskContext = {
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
    const file = path.join(outDir, `${f.verdict_id.slice(0, 8)}-${f.backlog_id}-${f.version}.prompt.txt`);
    fs.writeFileSync(file, `${header}\n${rendered.system_prompt}`, "utf8");
    index.push({
      verdict_id: f.verdict_id, backlog_id: f.backlog_id, version: f.version,
      recorded_verdict: f.recorded.verdict, prompt_file: file,
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

const promptsFlag = process.argv.find(a => a.startsWith("--write-prompts="));
if (promptsFlag) {
  const blank = (process.argv.find(a => a.startsWith("--blank=")) || "").split("=")[1] || null;
  const only = (process.argv.find(a => a.startsWith("--only=")) || "").split("=")[1] || null;
  writePrompts(promptsFlag.split("=").slice(1).join("="), blank, only)
    .catch(e => { console.error(`write-prompts: ${e.stack || e.message}`); process.exit(2); });
} else {
  selfRun(import.meta.url, run);
}
