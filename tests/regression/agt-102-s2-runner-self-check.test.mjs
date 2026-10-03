// DeepBench v7.0.564 | tests/regression/agt-102-s2-runner-self-check.test.mjs | AGT-102 slice 2
// FEATURE: AGT-102 -- slice 1 gave the AUDITOR a structural self-check; slice 2 gives the RUNNER
// the same one. The runner's drift used to reach the ledger only as prose in runner_cycles.notes
// (confidence medium) via the auditor's step-1 query; now the cycle runs
// scripts/check-routine-prompt.js on the prompt it was actually given and the auditor's step-3
// merge picks the code finding (high) up ahead of the prose one.
// Kickoff: docs/kickoffs/v7.0.564-AGT-102-s2-runner-self-check.md §6.
//
//   A  THE PROMPT BLOCK -- docs/runbooks/routine-prompt.md, read BY MARKER LINE, names the script,
//      --routine=runner, --out=docs/audits/runner-prompt-drift.json and the commit-only-on-exit-1
//      rule. Control: the same assertion over the block with those sentences stripped must fail.
//   B  THE RUNBOOK -- step 1 of docs/runbooks/runner-cycle.md (sliced `**1. Open the cycle` ->
//      `**1b. `) carries the same script and out-path, as the complete procedure the prompt
//      summarises. Control: the same assertion over step 1b's body must fail -- the arm reads the
//      STEP, not the file, so a line anywhere in the runbook cannot satisfy it.
//   C  THE MERGE INPUT -- auditor-routine.md's INS= holds docs/audits/runner-prompt-drift.json AND
//      its index is lower than $S/prompt-runner.json's, because the merge keeps the FIRST copy of a
//      fingerprint and the code finding must win over the prose note. Control: the two swapped must
//      fail.
//   D  THE MERGE REALLY PICKS IT UP -- the real script on a drifted copy of the block, then the
//      merge program EXTRACTED VERBATIM from auditor-routine.md's INS= line with INS pointed at its
//      output: 1 finding, found_by check-routine-prompt:runner. Merge that PLUS a note-mode output
//      for the same routine: still 1, not 2, and the two fingerprints are equal. Control: the
//      AUDITOR's finding fingerprints DIFFERENTLY, so the dedupe is not simply matching everything.
//
// Pre-change, measured against HEAD 2026-09-24 with these same exported assertions: A (both
// halves), B and C are RED -- no sentences in the block, no line in step 1, no INS entry. D is
// GREEN pre-change, and deliberately so: it drives INS at the drifted file directly (the kickoff's
// "INS pointed at it"), so it grades the merge program and fingerprint() that slice 1 already
// shipped, not this slice's edits. Arm C is what holds the INS= list itself. Stated here rather
// than claiming a red D, because a control that never was red proves nothing.
//
// Nothing here writes to the repo or to Supabase: every output goes to a mkdtemp directory that is
// removed in the finally block (pattern:76 -- a test run never mutates working data).

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { fingerprint } from "../../scripts/audit-ledger.js";
import { ROUTINES, extractBlock } from "../../scripts/check-routine-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "check-routine-prompt.js");
const PROMPT_MD = path.join(ROOT, "docs", "runbooks", "routine-prompt.md");
const RUNNER_MD = path.join(ROOT, "docs", "runbooks", "runner-cycle.md");
const AUDITOR_MD = path.join(ROOT, "docs", "runbooks", "auditor-routine.md");

const OUT_PATH = "docs/audits/runner-prompt-drift.json";
const SCRIPT_REF = "scripts/check-routine-prompt.js";
const NOTE_CYCLE = "62a83c1f-8623-4098-b75a-ae32fc9a79b9";

const read = p => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

function check(args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8" });
  return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// --- the three assertions the controls invert ---------------------------------------------------
// Each takes TEXT, never a path, so an arm and its control run the identical code over different
// input. That is what makes the control meaningful: a control that failed for a different reason
// (a missing file, a bad slice) would prove nothing.

export function assertCarriesTheCheck(text, what) {
  assert.ok(text.includes(SCRIPT_REF), `${what} names ${SCRIPT_REF}`);
  assert.ok(text.includes("--routine=runner"), `${what} names --routine=runner`);
  assert.ok(text.includes(`--out=${OUT_PATH}`), `${what} names --out=${OUT_PATH}`);
}

// The commit rule, both halves: exit 1 is a finding that gets added, exit 0 commits only a file
// that is already tracked. A block naming the command but not the rule leaves the cycle guessing.
export function assertCommitRule(text, what) {
  assert.match(text, /[Ee]xit 1/, `${what} names exit 1`);
  assert.match(text, /\bgit add\b/, `${what} tells the cycle to git add the exit-1 output`);
  assert.match(text, /already tracked/, `${what} carries the exit-0 commit-only-if-tracked rule`);
}

export function assertInsOrder(ins, what) {
  const parts = ins.trim().split(/\s+/);
  const drift = parts.indexOf(OUT_PATH);
  const note = parts.indexOf("$S/prompt-runner.json");
  assert.ok(drift >= 0, `${what} holds ${OUT_PATH}`);
  assert.ok(note >= 0, `${what} holds $S/prompt-runner.json`);
  assert.ok(
    drift < note,
    `${what}: ${OUT_PATH} (index ${drift}) must come BEFORE $S/prompt-runner.json (index ${note}) -- ` +
      "the merge keeps the first copy of a fingerprint, so the code finding must beat the prose note",
  );
}

// --- slicing helpers ----------------------------------------------------------------------------

export function sliceStep(md, startsWith, endsWith) {
  const lines = md.split("\n");
  const a = lines.findIndex(l => l.startsWith(startsWith));
  assert.ok(a >= 0, `runner-cycle.md has a line starting ${JSON.stringify(startsWith)}`);
  const b = lines.findIndex((l, i) => i > a && l.startsWith(endsWith));
  assert.ok(b > a, `runner-cycle.md has ${JSON.stringify(endsWith)} after it`);
  return lines.slice(a, b).join("\n");
}

export function insValue(md) {
  const m = /INS="([^"]*)"/.exec(md);
  assert.ok(m, "auditor-routine.md carries an INS=\"…\" list");
  return m[1];
}

// The merge program the auditor actually runs, lifted verbatim out of the runbook line -- the arm
// must grade the shipped program, never a re-implementation of it (pattern:162).
function mergeProgram(md) {
  const line = md.split("\n").find(l => l.includes("INS=") && l.includes("--input-type=module"));
  assert.ok(line, "auditor-routine.md's INS= line carries the inline merge program");
  const open = line.indexOf("-e '");
  const close = line.lastIndexOf("'");
  assert.ok(open >= 0 && close > open, "the merge program is a single-quoted -e argument");
  return line.slice(open + 4, close);
}

function runMerge(program, ins, out, week) {
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", program], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, OUT: out, INS: ins, W: week },
  });
  assert.equal(r.status, 0, `the merge program exited 0 (got ${r.status}: ${r.stderr})`);
  return { merged: JSON.parse(fs.readFileSync(out, "utf8")), stdout: r.stdout ?? "" };
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  // A control has to throw. If it passes, the arm it inverts is not discriminating and the whole
  // file is decoration -- so a silent control is itself a failure.
  const control = (name, fn) => {
    let threw = false;
    try { fn(); } catch { threw = true; }
    assert.ok(threw, `CONTROL ${name} must fail, but it passed -- the assertion is not discriminating`);
  };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt102s2-"));
  const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };

  try {
    await arm("A prompt block", async () => {
      const block = extractBlock(read(PROMPT_MD), ROUTINES.runner).text;
      assertCarriesTheCheck(block, "the runner prompt block");
      assertCommitRule(block, "the runner prompt block");

      // Control: the same two assertions over the block with the self-check sentences stripped.
      const stripped = block
        .split("\n")
        .map(l => (l.includes(SCRIPT_REF) ? l.replace(/\s*Then check THIS PROMPT.*$/, "") : l))
        .join("\n");
      assert.notEqual(stripped, block, "the control input must actually differ from the block");
      assert.ok(!stripped.includes(SCRIPT_REF), "the control input no longer names the script");
      control("A", () => assertCarriesTheCheck(stripped, "the stripped block"));
      control("A (commit rule)", () => assertCommitRule(stripped, "the stripped block"));
      console.log("    [arm A] control: the stripped block fails both assertions, as it must");
    });

    await arm("B runbook step 1", async () => {
      const md = read(RUNNER_MD);
      const step1 = sliceStep(md, "**1. Open the cycle", "**1b. ");
      assertCarriesTheCheck(step1, "runner-cycle.md step 1");
      assertCommitRule(step1, "runner-cycle.md step 1");

      // Control: step 1b's body. The arm reads the STEP, so the neighbouring step must NOT satisfy
      // it -- otherwise the arm would pass on a line sitting anywhere in a 379 KB file.
      const step1b = sliceStep(md, "**1b. ", "**2. ");
      assert.ok(step1b.length > 0, "step 1b's body is non-empty");
      control("B", () => assertCarriesTheCheck(step1b, "runner-cycle.md step 1b"));
      console.log("    [arm B] control: step 1b's body fails the same assertion, as it must");
    });

    await arm("C merge input order", async () => {
      const ins = insValue(read(AUDITOR_MD));
      assertInsOrder(ins, "auditor-routine.md INS=");

      // Control: the two entries swapped -- the prose note would then win the fingerprint.
      const swapped = ins
        .replace(OUT_PATH, "\u0000")
        .replace("$S/prompt-runner.json", OUT_PATH)
        .replace("\u0000", "$S/prompt-runner.json");
      assert.notEqual(swapped, ins, "the control input must actually differ");
      control("C", () => assertInsOrder(swapped, "the swapped INS="));
      console.log("    [arm C] control: the swapped INS= fails the order assertion, as it must");
    });

    await arm("D merge picks up the code finding", async () => {
      const week = "2026-W39";
      const program = mergeProgram(read(AUDITOR_MD));

      // A drifted copy of the real runner block -> the real script -> a real finding.
      const block = extractBlock(read(PROMPT_MD), ROUTINES.runner).text;
      const lines = block.split("\n");
      lines[1] = lines[1] + " DRIFTED";
      const driftOut = path.join(tmp, "runner-prompt-drift.json");
      const r = check([
        "--routine=runner",
        `--prompt=${write("drifted.txt", lines.join("\n"))}`,
        `--out=${driftOut}`,
      ]);
      assert.equal(r.code, 1, `drift exits 1 (got ${r.code}: ${r.stderr})`);
      const drift = JSON.parse(fs.readFileSync(driftOut, "utf8"));
      assert.equal(drift.findings.length, 1, "one finding from the script");
      assert.equal(drift.findings[0].confidence, "high", "the code finding is high confidence");

      // First half: the runbook's own merge program carries it through.
      const one = runMerge(program, driftOut, path.join(tmp, "m1.json"), week);
      assert.equal(one.merged.findings.length, 1, `merge keeps the code finding (got ${one.merged.findings.length})`);
      assert.equal(one.merged.found_by, "check-routine-prompt:runner", "found_by names the runner check");
      assert.equal(one.merged.week, week, "the merge stamps the week it was given");

      // Second half: the prose note for the SAME routine dedupes against it -- 1, not 2.
      const noteOut = path.join(tmp, "prompt-runner.json");
      const n = check([
        "--routine=runner",
        `--note=${write("note.txt", "the live prompt differs from routine-prompt.md at step 3")}`,
        `--cycle=${NOTE_CYCLE}`,
        `--out=${noteOut}`,
      ]);
      assert.equal(n.code, 1, `note mode exits 1 (got ${n.code}: ${n.stderr})`);
      const note = JSON.parse(fs.readFileSync(noteOut, "utf8"));
      assert.equal(note.findings[0].confidence, "medium", "the prose note is medium confidence");

      const fpCode = fingerprint(drift.findings[0]);
      const fpNote = fingerprint(note.findings[0]);
      assert.equal(fpCode, fpNote, `the code and prose findings fingerprint equal (${fpCode} vs ${fpNote})`);

      const both = runMerge(program, `${driftOut} ${noteOut}`, path.join(tmp, "m2.json"), week);
      assert.equal(
        both.merged.findings.length,
        1,
        `both inputs merge to ONE finding, not two (got ${both.merged.findings.length})`,
      );
      assert.equal(both.merged.findings[0].confidence, "high", "the kept copy is the CODE finding, in INS order");
      console.log(`    [arm D] fingerprints: code ${fpCode} == note ${fpNote}, merged 1 of 2`);

      // Control: the auditor's own drift must fingerprint DIFFERENTLY, or the dedupe is matching
      // everything and the "1, not 2" above would be meaningless.
      const aBlock = extractBlock(read(AUDITOR_MD), ROUTINES.auditor).text.split("\n");
      aBlock[1] = aBlock[1] + " DRIFTED";
      const aOut = path.join(tmp, "prompt-auditor.json");
      const ar = check(["--routine=auditor", `--prompt=${write("adrift.txt", aBlock.join("\n"))}`, `--out=${aOut}`]);
      assert.equal(ar.code, 1, `auditor drift exits 1 (got ${ar.code}: ${ar.stderr})`);
      const fpAuditor = fingerprint(JSON.parse(fs.readFileSync(aOut, "utf8")).findings[0]);
      control("D", () => assert.equal(fpAuditor, fpCode));
      const three = runMerge(program, `${driftOut} ${noteOut} ${aOut}`, path.join(tmp, "m3.json"), week);
      assert.equal(three.merged.findings.length, 2, "the auditor's finding survives the same merge -- 2, not 1");
      console.log(`    [arm D] control: auditor fingerprints ${fpAuditor} != runner ${fpCode}, as it must`);
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
