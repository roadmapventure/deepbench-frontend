// DeepBench v7.0.628 | tests/regression/agt-187-kickoff-green-attested.test.mjs | AGT-187
//
// FEATURE: a `--check-kickoff` GREEN STOPS ATTESTING TO A DECLARATION NOBODY MADE.
//
// THE DEFECT, measured rather than reasoned about. `kickoffLaneFinding()` grades A LINE'S PRESENCE
// -- its own header in `scripts/verifier.js` insists on that, and it is the right check. The wrong
// part was the CLAIM the exit 0 carried: callers read it as "the Designer declared its lanes." On
// runner cycle `a1e84644` the refusal's own prose said `add one Lanes: line`, the ORCHESTRATOR
// holding the file did exactly that, and the re-run went green over 7,781 bytes of which the
// caller had written 49. `docs/kickoffs/v7.0.613-AGT-168-change-scoped-private-scan.md` IS that
// file, still on disk, still green -- which is why every arm below drives it rather than a fixture:
// a gate whose green is not evidence is not a gate (`docs/ARCHITECTURE.md` §19v).
//
// WHAT THIS FILE GUARDS, and where a lazier guard would pass vacuously.
//
// (a) THE UNATTESTED GREEN IS NOW A REFUSAL, driven through the shipped CLI on the real 7,781-byte
//     evidence kickoff against an answer holding that file MINUS LINE 8 -- the 7,732 bytes the
//     Designer actually produced. Exit 1, `kickoff-unattested-declaration`, `byte_delta` 49 and
//     `first_differing_line` 8: the delta alone says a line went missing, the line number says
//     WHICH, and line 8 is the `Lanes:` declaration. On `origin/dev` this same call exits 0.
//     Plus the two exit-2 causes, because an answer that cannot be read must never be a green --
//     that would be the strongest claim the branch can make on the weakest evidence it has.
//
// (b) A MATCHING ANSWER IS STILL GREEN. Written as a function so (f) can drive it against a
//     one-byte mutation; a guard that only proves the refusal fires would be satisfied by a
//     checker that refuses everything.
//
// (c) THE UNATTESTED GREEN DECLARES ITS OWN LIMIT. No `--answer` is still exit 0 -- `--answer` is
//     OPTIONAL and every existing caller (`scripts/model-trial.js:201`, the three SES-359/376/378h
//     arms) omits it -- but the payload must carry `attested:false` and an `attests` string that
//     says what the green does NOT prove. A green that stayed silent about its own scope is the
//     defect, not the exit code.
//
// (d) THE REFUSAL NO LONGER TELLS ITS CALLER TO PATCH THE FILE. `add one Lanes: line` is gone,
//     `remedy_owner` is the Designer, and `SES-359` + `Lanes:` survive -- SES-359's and SES-378h's
//     own assertions read those two strings, so the rewrite has to keep them (pattern:104).
//
// (e) THE REMEDY AND THE RUNBOOK ARE ONE PROCEDURE. Step 6 already prescribes this cause's
//     re-assembly and its `--kind`; the fix is the checker's output, not a fifth `staff-watch`
//     kind (part (b) of the ticket, refused on evidence). So the remedy's re-assembly token is
//     read OUT OF THE SHIPPED FINDING and required in step 6's span, cut with the renderer's own
//     `parseSteps` rather than a regex of this file's -- and no runbook byte moves.
//
// (f) THE SES-158 NEGATIVE CONTROL. Mutate the matching answer by one byte and (b) must THROW. A
//     control that changes nothing pins nothing.
//
// SOURCE-AND-CLI ONLY. No credentials, no model call, no `ai_activity_log` row: the
// `--check-kickoff` branch runs ahead of the credential check by design, and every child process
// below has both keys DELETED from its env, which is where that stays proven. Temp files live under
// `os.tmpdir()` and are removed in a `finally` -- nothing is written inside the repo.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { parseSteps, RUNBOOK_REL } from "../../scripts/render-cycle-card.js";
import { KINDS } from "../../scripts/staff-watch.js";
import { kickoffCapFinding, kickoffLaneFinding, KICKOFF_BYTE_CAP } from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// The cycle-a1e84644 kickoff itself, and the three numbers measured on it this session. Named once,
// so no two arms can be describing different files.
const EVIDENCE_REL = "docs/kickoffs/v7.0.613-AGT-168-change-scoped-private-scan.md";
const LANE_LINE = 8;
const SUPPLIED_BYTES = 49;
const UNATTESTED_KIND = "kickoff-unattested-declaration";
const STEP = "6";
const LANE_CAUSE_KIND = "kickoff lacked a fact";   // step 6's own --kind for this cause (v7.0.520)

// A child env with both credentials REMOVED rather than blanked (the ses-376/378h idiom): a deleted
// key is what "no credentials" actually looks like, and a 0/1 rather than a 2 proves the kickoff
// branch still runs AHEAD of the credential check, which §3 of the kickoff requires it to keep doing.
function runCheck(args) {
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  const r = spawnSync(process.execPath, ["scripts/verifier.js", ...args, "--json"],
    { cwd: ROOT, encoding: "utf8", env });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  let payload;
  try { payload = JSON.parse(out.split("\n").filter(Boolean).pop()); } catch (e) {
    assert.fail(`${args.join(" ")} --json printed no JSON payload (${e.message}): ${out}`);
  }
  return { status: r.status, payload, out };
}

const answerFileIn = (dir, name, markdown) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify({ kickoff_markdown: markdown }));
  return p;
};

// == (a) the unattested declaration is refused, and an unreadable answer is never a green ========
function unattestedIsRefused(dir, fileText) {
  const designersOwn = fileText.split("\n").filter((_, i) => i !== LANE_LINE - 1).join("\n");
  const fileBytes = Buffer.byteLength(fileText, "utf8");
  const answerBytes = Buffer.byteLength(designersOwn, "utf8");
  assert.strictEqual(
    fileBytes - answerBytes, SUPPLIED_BYTES,
    `${EVIDENCE_REL} minus line ${LANE_LINE} must be ${SUPPLIED_BYTES} bytes shorter -- that is the `
    + `line the orchestrator supplied after the refusal, and this arm's whole premise. `
    + `file ${fileBytes}, answer ${answerBytes}`,
  );

  const r = runCheck([`--check-kickoff=${EVIDENCE_REL}`, `--answer=${answerFileIn(dir, "designers-own.json", designersOwn)}`]);
  assert.strictEqual(
    r.status, 1,
    `the caller-supplied \`Lanes:\` line must make --check-kickoff exit 1. It exits ${r.status} -- on `
    + `origin/dev that is 0 because the flag does not exist, which is the whole ship: ${r.out}`,
  );
  assert.strictEqual(r.payload.kind, UNATTESTED_KIND,
    `the refusal must be its own kind, not folded into kickoff-no-lanes: got ${JSON.stringify(r.payload.kind)}`);
  assert.strictEqual(r.payload.attested, false, "a refused attestation must say `attested:false` in the payload");
  assert.strictEqual(
    r.payload.byte_delta, SUPPLIED_BYTES,
    `the payload must name the byte delta (${SUPPLIED_BYTES}); it reports ${JSON.stringify(r.payload.byte_delta)}. `
    + `"49 bytes the caller wrote" is the sentence this gate exists to be able to say.`,
  );
  assert.strictEqual(
    r.payload.first_differing_line, LANE_LINE,
    `the payload must name the FIRST DIFFERING LINE (${LANE_LINE}, the \`Lanes:\` declaration); it `
    + `reports ${JSON.stringify(r.payload.first_differing_line)}. A delta alone says a line went `
    + `missing, the number says which.`,
  );
  assert.ok(r.payload.reason.includes(String(SUPPLIED_BYTES)) && r.payload.reason.includes(`line ${LANE_LINE}`),
    `the reason's reader is an agent deciding what to do next, so it must carry both numbers: ${r.payload.reason}`);

  // NEVER A GREEN on an answer that cannot be read. Both causes, both exit 2.
  const bad = path.join(dir, "not-json.json");
  fs.writeFileSync(bad, "{ this is not json");
  const unreadable = runCheck([`--check-kickoff=${EVIDENCE_REL}`, `--answer=${bad}`]);
  assert.strictEqual(unreadable.status, 2,
    `an unparseable --answer must exit 2 (the absence of a judgement), never 0 or 1: ${unreadable.out}`);
  assert.strictEqual(unreadable.payload.kind, "cannot-run");

  const noKey = path.join(dir, "no-markdown.json");
  fs.writeFileSync(noKey, JSON.stringify({ backlog_id: "AGT-187" }));
  const missing = runCheck([`--check-kickoff=${EVIDENCE_REL}`, `--answer=${noKey}`]);
  assert.strictEqual(missing.status, 2,
    `an --answer with no \`kickoff_markdown\` has nothing to attest against and must exit 2, never `
    + `fall back to the unattested green: ${missing.out}`);
  assert.strictEqual(missing.payload.kind, "cannot-run");
  return { fileBytes, answerBytes };
}

// == (b) a matching answer is still green -- driven again by (f) against a mutation ===============
function attestedIsGreen(dir, markdown, label) {
  const r = runCheck([`--check-kickoff=${EVIDENCE_REL}`, `--answer=${answerFileIn(dir, `${label}.json`, markdown)}`]);
  assert.strictEqual(r.status, 0,
    `${label}: an answer carrying the file's own bytes must still exit 0: ${r.out}`);
  assert.strictEqual(r.payload.attested, true,
    `${label}: a matching answer must be reported \`attested:true\` -- that is the claim the green is `
    + `now allowed to make: ${r.out}`);
  assert.strictEqual(r.payload.byte_delta, 0, `${label}: a matching answer has no byte delta`);
  assert.strictEqual(r.payload.kind, "kickoff-within-cap", `${label}: the cap verdict is unchanged by attestation`);
  return r.payload;
}

// == (c) the unattested green declares its own limit =============================================
function unattestedGreenDeclaresItsLimit(fileText) {
  const r = runCheck([`--check-kickoff=${EVIDENCE_REL}`]);
  assert.strictEqual(r.status, 0,
    `--answer is OPTIONAL: model-trial.js and the three SES-359/376/378h arms all spawn `
    + `--check-kickoff without it and read 0/1, so a missing answer must never be a refusal: ${r.out}`);
  assert.strictEqual(r.payload.attested, false,
    "a green taken with no answer has attested NOTHING about authorship and must say so");
  assert.ok(typeof r.payload.attests === "string" && r.payload.attests.length > 0,
    `the unattested green must carry an \`attests\` string naming its own limit: ${r.out}`);
  assert.ok(/NOT/.test(r.payload.attests) && r.payload.attests.includes("Lanes:"),
    `\`attests\` must say what the green does NOT prove, in the words of the line it graded -- `
    + `otherwise the payload is agreeable and still over-claims: ${JSON.stringify(r.payload.attests)}`);
  assert.strictEqual(r.payload.bytes, Buffer.byteLength(fileText, "utf8"),
    "the cap measurement itself is unchanged by AGT-187");
  assert.strictEqual(r.payload.cap, KICKOFF_BYTE_CAP);
  return r.payload.attests;
}

// == (d) the refusal stops telling its caller to patch the file ==================================
function theRefusalNamesItsOwner() {
  const lanes = kickoffLaneFinding("a kickoff with no declaration");
  assert.ok(lanes, "kickoffLaneFinding must still report on a document with no Lanes: line");
  assert.ok(
    !lanes.reason.includes("add one Lanes: line"),
    `the lane reason still says \`add one Lanes: line\` -- an imperative aimed at whoever holds the `
    + `file, which on cycle a1e84644 was the orchestrator, and it did exactly that: ${lanes.reason}`,
  );
  assert.ok(
    lanes.reason.includes("SES-359") && lanes.reason.includes("Lanes:"),
    `the rewritten reason must KEEP both strings -- ses-359:109 and ses-378h read them, and they are `
    + `how its reader recognises the cause: ${lanes.reason}`,
  );
  assert.strictEqual(lanes.remedy_owner, "designer",
    "the lane re-assembly is the DESIGNER's act; the finding must name that owner rather than leave it to prose");
  assert.ok(typeof lanes.remedy === "string" && lanes.remedy.includes("design-kickoff"),
    `the finding must name the ONE command that performs the re-assembly: ${JSON.stringify(lanes.remedy)}`);

  // The cap finding is the SIBLING cause and gets the same treatment, or a caller reading one
  // finding's shape learns nothing about the other's. The two owners are compared to EACH OTHER as
  // well as to the string, so one finding cannot drift onto a second vocabulary.
  const cap = kickoffCapFinding("x".repeat(KICKOFF_BYTE_CAP + 1));
  assert.ok(cap, `kickoffCapFinding must still report at ${KICKOFF_BYTE_CAP + 1} bytes`);
  assert.strictEqual(cap.remedy_owner, "designer", "the cap refusal names the same owner");
  assert.strictEqual(cap.remedy_owner, lanes.remedy_owner, "both findings must name ONE owner");
  assert.ok(typeof cap.remedy === "string" && cap.remedy.includes("over_cap"),
    `the cap remedy must name the \`over_cap\` re-assembly step 6 prescribes: ${JSON.stringify(cap.remedy)}`);
  // BOTH DIRECTIONS: a sound kickoff produces neither finding, or every ship would carry one.
  const sound = fs.readFileSync(path.join(ROOT, EVIDENCE_REL), "utf8");
  assert.strictEqual(kickoffLaneFinding(sound), null, `${EVIDENCE_REL} declares its lanes and must produce no lane finding`);
  assert.strictEqual(kickoffCapFinding(sound), null, `${EVIDENCE_REL} is within cap and must produce no cap finding`);
  return lanes;
}

// A step's own lines, cut with the renderer's parser rather than a regex of this file's own, so
// "which lines are step N" has ONE answer in the repo. Same helper shape as ses-378g/ses-378h.
function stepSpan(md, label) {
  const steps = parseSteps(md);
  const i = steps.findIndex(s => s.label === label);
  assert.ok(i >= 0, `${RUNBOOK_REL} has no step **${label}.** marker at all`);
  const lines = md.split("\n");
  const end = steps[i + 1] ? steps[i + 1].line - 1 : lines.length;
  return lines.slice(steps[i].line - 1, end).join("\n");
}

// == (e) the remedy and step 6 are ONE procedure, and the fifth kind stays unneeded ==============
function theRemedyIsTheRunbooksProcedure(lanes) {
  const span = stepSpan(fs.readFileSync(path.join(ROOT, RUNBOOK_REL), "utf8").replace(/\r\n/g, "\n"), STEP);

  // The token is read OUT OF THE SHIPPED FINDING, never quoted here: if the remedy is ever reworded
  // into a re-assembly the runbook does not prescribe, this goes red instead of drifting.
  const token = /("no_lanes"\s*:\s*true)/.exec(lanes.remedy);
  assert.ok(token, `the lane remedy must name the re-assembly by its task_context key: ${JSON.stringify(lanes.remedy)}`);
  assert.ok(
    span.includes(token[1]),
    `${RUNBOOK_REL} step ${STEP}'s span does not carry ${JSON.stringify(token[1])} -- the finding would be `
    + `naming a re-assembly the procedure a cycle actually follows does not prescribe, which is two `
    + `procedures for one cause`,
  );

  // PART (b) OF THE TICKET, REFUSED ON EVIDENCE: this cause already has a recorded kind, so a fifth
  // `staff-watch` kind would give one cause two homes (and need a CHECK migration).
  assert.ok(
    span.includes(`--kind='${LANE_CAUSE_KIND}'`),
    `${RUNBOOK_REL} step ${STEP}'s span must already record this cause as --kind='${LANE_CAUSE_KIND}' -- `
    + `it is why no fifth staff-watch kind ships with AGT-187`,
  );
  assert.ok(
    KINDS.includes(LANE_CAUSE_KIND),
    `scripts/staff-watch.js KINDS does not admit ${JSON.stringify(LANE_CAUSE_KIND)}, so step ${STEP}'s `
    + `command would exit 2 and write no row`,
  );
  assert.strictEqual(
    KINDS.length, 4,
    `KINDS must still hold exactly the four kinds the runner_staff_findings CHECK carries. A fifth `
    + `was ruled dead for AGT-187 and cannot appear without the migration this session does not run. `
    + `got ${JSON.stringify(KINDS)}`,
  );
  return token[1];
}

export default async function run() {
  const fileText = fs.readFileSync(path.join(ROOT, EVIDENCE_REL), "utf8");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt-187-"));
  try {
    const sizes = unattestedIsRefused(dir, fileText);                 // (a)
    attestedIsGreen(dir, fileText, "matching");                       // (b)
    const attests = unattestedGreenDeclaresItsLimit(fileText);        // (c)
    const lanes = theRefusalNamesItsOwner();                          // (d)
    const token = theRemedyIsTheRunbooksProcedure(lanes);             // (e)

    // (f) THE CONTROL. One byte, and (b) must go red -- otherwise (b) is green on anything.
    const mutated = `${fileText.slice(0, 40)}X${fileText.slice(41)}`;
    assert.notStrictEqual(mutated, fileText, "control for (b) changed nothing (the SES-158 failure)");
    assert.strictEqual(Buffer.byteLength(mutated, "utf8"), Buffer.byteLength(fileText, "utf8"),
      "the control must differ by CONTENT at equal length, so (b) cannot pass on the byte count alone");
    assert.throws(
      () => attestedIsGreen(dir, mutated, "control"),
      /attested/,
      "control: an answer differing from the file by ONE BYTE still passed (b) -- the arm is vacuous, "
      + "and a byte-for-byte attestation that tolerates a byte is not one",
    );

    console.log(`  [AGT-187] ${EVIDENCE_REL}: ${sizes.fileBytes} bytes on disk vs the Designer's own `
      + `${sizes.answerBytes} -> exit 1 ${UNATTESTED_KIND}, delta ${SUPPLIED_BYTES} at line ${LANE_LINE}; `
      + `matching answer -> attested:true; no --answer -> attested:false ("${attests}"); the lane refusal `
      + `owns ${JSON.stringify(token)} jointly with ${RUNBOOK_REL} step ${STEP} (--kind='${LANE_CAUSE_KIND}', `
      + `${KINDS.length} kinds, no fifth); one-byte control red`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

selfRun(import.meta.url, run);
