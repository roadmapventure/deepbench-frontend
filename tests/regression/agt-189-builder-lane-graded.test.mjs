// DeepBench v7.0.629 | tests/regression/agt-189-builder-lane-graded.test.mjs | AGT-189
//
// WHAT WAS BROKEN. `--check-kickoff` graded a kickoff's SIZE (SES-376), the PRESENCE of a `Lanes:`
// line (SES-359) and, since AGT-187, whether the bytes are the Designer's own -- and nothing at all
// read the `Model` bullet. Measured on the unchanged tree this cycle: a 225-byte file carrying
// `v7.0.614`'s line 8 as shipped (Builder = the `mechanical` lane's model, for a build runbook step
// 7 puts on `orchestrator`) plus a valid `Lanes:` line exited **0**, `kind kickoff-within-cap`. The
// wrong declaration was invisible to the only gate that reads the kickoff.
//
// THE MODEL ID IS NEVER A LITERAL -- not in `scripts/verifier.js` and not in this test either. Arm
// (a) and arm (b) both read `public.runner_model_lanes` here, in the test, and assert against the
// row; arm (d) proves the CLI file contains no copy of it. A test that hardcoded `claude-opus-5`
// would go green on a verifier that hardcoded the same string, which is precisely the defect
// AGT-189 exists to prevent (pattern:2, pattern:93, ARCHITECTURE.md 19b).
//
// THE OFFENDING LINE IS A FIXTURE, quoted here verbatim as `v7.0.614:8` shipped at `99f15c26`, and
// arm (b) reads that same file from disk to prove task 3 corrected it. Two halves of one claim: the
// offending text must refuse, the corrected text must pass.
//
// THE NOT-GRADED ARM IS THE LOAD-BEARING ONE. `ses-376`, `ses-359`, `ses-378h` and every `agt-187`
// arm spawn `--check-kickoff` with both credentials DELETED from the child env and demand 0 or 1.
// Step 6 runs this branch on every cycle. A clause that refused a kickoff whose lane row it could
// not read would turn those four red and wedge the runner, so an unreadable row is NOT GRADED at an
// unchanged exit code -- and the green must SAY it did not grade, or it is the same false green in a
// new place (19v).

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { kickoffBuilderModelFinding, kickoffCapFinding, kickoffLaneFinding } from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const CORRECTED_REL = "docs/kickoffs/v7.0.614-AGT-168-scan-step-always.md";
const OWN_KICKOFF_REL = "docs/kickoffs/v7.0.629-AGT-189-builder-lane-graded.md";
const CLAUSE = "builder-model";
const KIND = "kickoff-no-lanes";          // reused deliberately: step 6's branch and staff-watch's
                                          // four KINDS already cover this cause (pattern:17)
const LANE = "orchestrator";

// `v7.0.614` line 8 exactly as it shipped at 99f15c26 -- the before-half of the proof.
const OFFENDING_MODEL_LINE =
  "- **Model:** Builder = `claude-sonnet-5`, the `mechanical` lane read live from `runner_model_lanes`"
  + " (`docs/runbooks/runner-cycle.md:2872`) — two exact strings, no judgment.";
const VALID_LANES_LINE = "- **Lanes:** session | executor none ($0) | none.";
const OFFENDING_FIXTURE = `${OFFENDING_MODEL_LINE}\n${VALID_LANES_LINE}\n`;

// A model id that is NOT the orchestrator lane's, used only as an ARGUMENT in arm (d). Its presence
// here is the point: the same text must be judged differently by the same code on a different row.
const OTHER_MODEL = "claude-sonnet-5";

function runCheck(rel, { creds = true, unreachable = false } = {}) {
  const env = { ...process.env };
  if (!creds) {
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_KEY;
  }
  if (unreachable) {
    // Credentials PRESENT and the endpoint dead -- the other half of the failure direction. Port 9
    // (discard) on loopback refuses instantly, so this arm costs nothing and needs no network.
    env.SUPABASE_URL = "https://127.0.0.1:9";
    env.SUPABASE_SERVICE_KEY = "not-a-key-and-never-used";
  }
  const r = spawnSync(process.execPath, ["scripts/verifier.js", `--check-kickoff=${rel}`, "--json"],
    { cwd: ROOT, encoding: "utf8", env });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  let payload;
  try { payload = JSON.parse(out.split("\n").filter(Boolean).pop()); } catch (e) {
    assert.fail(`--check-kickoff=${rel} --json printed no JSON payload (${e.message}): ${out}`);
  }
  return { status: r.status, payload, out };
}

// The live row, read HERE so no arm compares the CLI against a string this file chose.
async function liveOrchestratorModel() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/runner_model_lanes?lane=eq.${LANE}&select=model_id`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? String(rows[0].model_id) : null;
}

// == (a) the offending declaration is REFUSED, and the refusal is this clause's, not the cap's ====
function offendingIsRefused(dir, liveModel) {
  const abs = path.join(dir, "offending-kickoff.md");
  fs.writeFileSync(abs, OFFENDING_FIXTURE);

  // The before-half, in a form that survives the tree it was measured on: this fixture satisfies
  // BOTH older clauses, so its exit 1 can only come from the new one. On the unchanged tree it
  // exited 0 for exactly this reason.
  assert.strictEqual(kickoffCapFinding(OFFENDING_FIXTURE), null,
    "the fixture must pass the SES-376 cap clause, or its refusal proves nothing about AGT-189");
  assert.strictEqual(kickoffLaneFinding(OFFENDING_FIXTURE), null,
    "the fixture must pass the SES-359 lane clause -- it carries a valid Lanes: line on purpose, so "
    + "the only clause left to refuse it is the Builder-model one AGT-189 adds");

  const r = runCheck(abs);
  assert.strictEqual(r.status, 1,
    `the shipped CLI must REFUSE a kickoff naming a model that is not the live ${LANE} lane's. `
    + `This same fixture exited 0 on the unchanged tree: ${r.out}`);
  assert.strictEqual(r.payload.kind, KIND,
    `the refusal must reuse the ${KIND} kind step 6 and staff-watch already branch on: ${r.out}`);
  assert.strictEqual(r.payload.clause, CLAUSE,
    `--json must carry clause "${CLAUSE}" so this refusal is told apart from SES-359's: ${r.out}`);
  assert.strictEqual(r.payload.remedy_owner, "designer",
    "re-assembly is the Designer's act; the caller never edits the Model line");
  assert.ok(r.payload.reason.includes(liveModel),
    `the reason must name the model it read from the row (${liveModel}) -- a refusal that will not `
    + `say what it wanted is not actionable: ${r.payload.reason}`);
  assert.ok(r.payload.reason.includes(LANE),
    `the reason must name the ${LANE} lane and where that assignment comes from: ${r.payload.reason}`);
  assert.ok(/step 7/.test(r.payload.reason),
    `the reason must point at runner-cycle.md step 7 -- the lane table's purpose column is what the `
    + `two wrong kickoffs read instead: ${r.payload.reason}`);
  return r.payload;
}

// == (b) the corrected file PASSES, and the green names the model it graded against ===============
function correctedPasses(rel, liveModel, label) {
  const r = runCheck(rel);
  assert.strictEqual(r.status, 0, `${label}: the corrected kickoff must exit 0: ${r.out}`);
  assert.strictEqual(r.payload.kind, "kickoff-within-cap", `${label}: the cap verdict is unchanged`);
  assert.strictEqual(r.payload.builder_model, liveModel,
    `${label}: the green must report the model it graded against, read from the row: ${r.out}`);
  assert.strictEqual(r.payload.builder_model_note, "",
    `${label}: a GRADED green carries no not-graded note -- the note is how an ungraded green admits `
    + `it: ${r.out}`);
  return r.payload;
}

// == (c) no credentials -> NOT GRADED, exit code unchanged, and the green says so =================
function unreadableRowIsNotGraded(dir) {
  const abs = path.join(dir, "offending-kickoff.md");     // the file arm (a) got REFUSED on
  const r = runCheck(abs, { creds: false });
  assert.strictEqual(r.status, 0,
    `with both credentials deleted the clause must NOT refuse -- ses-376, ses-359, ses-378h and every `
    + `agt-187 arm spawn --check-kickoff exactly this way and demand 0 or 1, and step 6 runs on every `
    + `cycle. Refusing here wedges the runner: ${r.out}`);
  assert.strictEqual(r.payload.builder_model, null,
    `an ungraded run must report no model rather than a guess: ${r.out}`);
  assert.ok(typeof r.payload.builder_model_note === "string" && r.payload.builder_model_note.length > 0,
    `the ungraded green MUST carry a note -- a green that silently skipped the check is the false `
    + `green AGT-189 replaces, in a new place: ${r.out}`);
  assert.ok(/NOT GRADED/.test(r.payload.builder_model_note),
    `the note must say plainly that nothing was graded: ${JSON.stringify(r.payload.builder_model_note)}`);
  assert.ok(r.payload.builder_model_note.includes("SUPABASE_URL"),
    `the note must name what was missing, so the reader can tell an absent credential from an `
    + `unreachable endpoint: ${JSON.stringify(r.payload.builder_model_note)}`);
  return r.payload.builder_model_note;
}

// == (c2) credentials present, the ROW unreachable -> still NOT GRADED, still exit 0 =============
//
// The other half of the failure direction, and the one a live cycle is likelier to meet: the keys are
// exported, the database is not answering. A refusal here would wedge step 6 on a network blip.
function unreachableEndpointIsNotGraded(dir) {
  const abs = path.join(dir, "offending-kickoff.md");
  const r = runCheck(abs, { unreachable: true });
  assert.strictEqual(r.status, 0,
    `an unreachable runner_model_lanes must not refuse the kickoff -- step 6 runs on every cycle and `
    + `a blip cannot be allowed to stop the runner: ${r.out}`);
  assert.strictEqual(r.payload.builder_model, null, `nothing was read, so nothing is reported: ${r.out}`);
  assert.ok(/NOT GRADED/.test(r.payload.builder_model_note || ""),
    `the green must admit it graded nothing: ${JSON.stringify(r.payload.builder_model_note)}`);
  assert.ok(/unreadable|reach/.test(r.payload.builder_model_note),
    `the note must distinguish an unreachable row from an absent credential -- they are different `
    + `things to fix: ${JSON.stringify(r.payload.builder_model_note)}`);
  return r.payload.builder_model_note;
}

// == (d) the answer comes from the ROW, not from the repo =========================================
function noModelLiteralAnywhere(liveModel) {
  const src = fs.readFileSync(path.join(ROOT, "scripts/verifier.js"), "utf8");
  const hits = src.split(liveModel).length - 1;
  assert.strictEqual(hits, 0,
    `scripts/verifier.js contains ${hits} copies of the live ${LANE} model id. A literal passes every `
    + `kickoff today and rots the moment the lane row changes -- the whole bug this ticket fixes`);

  // The same text, two different rows, two different verdicts: proof the judgement is the argument's.
  assert.strictEqual(kickoffBuilderModelFinding(OFFENDING_FIXTURE, OTHER_MODEL), null,
    `the offending text must PASS when ${OTHER_MODEL} is the lane's model -- if it refuses, the `
    + `function is grading against something other than its argument`);
  const refused = kickoffBuilderModelFinding(OFFENDING_FIXTURE, liveModel);
  assert.ok(refused && refused.clause === CLAUSE,
    "the same text must refuse against the live row -- the two halves together are the proof");
  assert.strictEqual(kickoffBuilderModelFinding(OFFENDING_FIXTURE, null), null,
    "a falsy model is NOT GRADED, never a refusal -- that is the caller's note to write");
  assert.strictEqual(kickoffBuilderModelFinding(OFFENDING_FIXTURE, ""), null,
    "an empty model id is the same absence as null");
  return hits;
}

// == (e) the NO-`Model`-LINE decision, pinned, with the branch that fired named ===================
//
// `v7.0.609-AGT-134` ships with no `Model` line and declares its build model on the `Lanes:` line.
// Refusing that shape would invalidate a kickoff that DID declare its model, so the Lanes line is
// the fallback. Each arm asserts WHICH line the clause read (LOO-013), not merely the verdict.
function theFallbackIsTheV609Shape(liveModel) {
  const v609Shape = `- **Lanes:** design and build both **${LANE}**, \`${liveModel}\` (live \`runner_model_lanes\`).\n`;
  assert.strictEqual(kickoffBuilderModelFinding(v609Shape, liveModel), null,
    "a kickoff with no Model line that names the model on its Lanes: line must PASS -- v7.0.609 is a "
    + "real shipped kickoff and this clause must not retroactively invalidate it");

  const v609Wrong = `- **Lanes:** design and build both **mechanical**, \`${OTHER_MODEL}\`.\n`;
  const wrong = kickoffBuilderModelFinding(v609Wrong, liveModel);
  assert.ok(wrong, "the fallback still GRADES -- ignoring a Model-less kickoff would leave the hole open");
  assert.ok(/carries no Model: line/.test(wrong.reason),
    `the reason must say the fallback branch fired, not just that it refused: ${wrong.reason}`);

  const neither = kickoffBuilderModelFinding("a document declaring nothing at all\n", liveModel);
  assert.ok(neither, "a document with neither line declares no model and cannot pass");
  assert.ok(/no Model: line and no Lanes: line/.test(neither.reason),
    `the reason must name the third branch too: ${neither.reason}`);

  // CONTAINS, never equals: naming the design lane's model as well is a legitimate v7.0.615 shape.
  const both = `- **Model:** judgment lane \`${OTHER_MODEL}\`, degraded this cycle to \`${liveModel}\`.\n`;
  assert.strictEqual(kickoffBuilderModelFinding(both, liveModel), null,
    "a Model line naming another lane's model ALONGSIDE the Builder's must pass -- v7.0.615 does "
    + "exactly that, and the claim graded is that the Builder's model is named, not that no other is");
  return true;
}

export default async function run() {
  const liveModel = await liveOrchestratorModel();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt-189-"));
  try {
    // (c) needs no credentials and runs unconditionally -- it is the arm that protects the runner.
    fs.writeFileSync(path.join(dir, "offending-kickoff.md"), OFFENDING_FIXTURE);
    const note = unreadableRowIsNotGraded(dir);
    const unreachableNote = unreachableEndpointIsNotGraded(dir);
    assert.notStrictEqual(note, unreachableNote,
      "the two not-graded causes must read differently -- an absent credential and an unreachable "
      + "endpoint are different things to fix, and one note for both hides which happened");

    if (!liveModel) {
      notRun("AGT-189 (a)(b)(d)(e)",
        "SUPABASE_URL / SUPABASE_SERVICE_KEY not set (or the runner_model_lanes read failed), so the "
        + "live orchestrator row could not be read here. The graded arms compare the CLI against that "
        + "row and are never asserted against a hardcoded model id. Export both from "
        + "public.runner_secrets by name and re-run: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node "
        + "tests/regression/run-all.js");
      console.log(`  [AGT-189] not-graded arms only: no credentials AND unreachable row -> exit 0, `
        + `builder_model null, `
        + `note ${JSON.stringify(note.slice(0, 48))}...; graded arms declared notRun`);
      return;
    }

    const refusal = offendingIsRefused(dir, liveModel);                       // (a)
    const corrected = correctedPasses(CORRECTED_REL, liveModel, "v7.0.614");  // (b)
    correctedPasses(OWN_KICKOFF_REL, liveModel, "v7.0.629 (this ticket's own kickoff)");
    const hits = noModelLiteralAnywhere(liveModel);                           // (d)
    theFallbackIsTheV609Shape(liveModel);                                     // (e)

    // (f) THE CONTROL. Strip the model id out of the corrected file's own Model line and (b) must go
    // red -- otherwise (b) is green on any text that happens to sit under the byte cap.
    const correctedText = fs.readFileSync(path.join(ROOT, CORRECTED_REL), "utf8");
    assert.ok(correctedText.split("\n")[7].includes(liveModel),
      `task 3 must have corrected ${CORRECTED_REL} line 8 to name the live ${LANE} model: `
      + `${JSON.stringify(correctedText.split("\n")[7])}`);
    const stripped = correctedText.split(liveModel).join(OTHER_MODEL);
    assert.notStrictEqual(stripped, correctedText, "control changed nothing (the SES-158 failure)");
    const controlAbs = path.join(dir, "control-kickoff.md");
    fs.writeFileSync(controlAbs, stripped);
    const control = runCheck(controlAbs);
    assert.strictEqual(control.status, 1,
      `control: the corrected kickoff with its model id swapped for ${OTHER_MODEL} still exited 0 -- `
      + `arm (b) is vacuous: ${control.out}`);
    assert.strictEqual(control.payload.clause, CLAUSE, "control: refused by some other clause");

    console.log(`  [AGT-189] live ${LANE} row = ${liveModel} (read in this test, ${hits} copies in `
      + `scripts/verifier.js): v7.0.614:8 as shipped -> exit 1 ${refusal.kind}/${refusal.clause}; `
      + `corrected -> exit 0 builder_model ${corrected.builder_model}; no credentials -> exit 0 `
      + `builder_model null + note (absent credentials and an unreachable row, noted apart); v7.0.609 Lanes-fallback passes, Model-less-and-wrong refuses; `
      + `swapped-id control red`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

selfRun(import.meta.url, run);
