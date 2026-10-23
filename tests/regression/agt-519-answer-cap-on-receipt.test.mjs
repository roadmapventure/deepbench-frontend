// DeepBench v7.0.885 | tests/regression/agt-519-answer-cap-on-receipt.test.mjs | AGT-519 -- the
// kickoff cap, measured on the ANSWER the Designer returned, before any file exists to measure.
//
// WHAT WAS UNGUARDED BEFORE THIS FILE, and why a file-side guard does not cover it. SES-376 states
// the cap and `--check-kickoff=<path>` enforces it -- on a FILE, which means the earliest moment it
// can run is after the kickoff has been written. The runbook's own step 6 asked for it "BEFORE the
// write", naming a path that cannot exist yet. In the gap, the Designer returned 10,191 bytes while
// reporting 8,192 and nothing counted what it actually returned. `--check-answer=<path>` counts the
// bytes of `kickoff_markdown` itself, and this file is that branch's guard.
//
// (A) THE SEEDED PAIR, AND THE UNIT THE CAP IS WRITTEN IN. The OVER fixture is 4,115 CHARACTERS and
// 8,215 BYTES: an implementation comparing `.length` passes it, so the clause asserts
// `md.length <= 8192` as an explicit negative control beside the exit code. `bytes` is asserted
// equal to `Buffer.byteLength(md, "utf8")` computed in this file, not merely to the literal 8215,
// so the branch can only agree by really counting the bytes it was handed. AT-CAP (exactly 8,192)
// and ONE-OVER (8,193) fix the boundary as `<=`, and NO-LANES proves the second refusal (SES-359)
// is reached through this flag too rather than only through the file one.
//
// (B) NEVER A GREEN ON NOTHING. An answer whose `kickoff_markdown` is null, and a path that does
// not exist, must both be exit 2. Collapsing either into 0 would certify a kickoff nobody measured;
// collapsing either into 1 would report a verdict where there was no measurement.
//
// (C) THE ARTIFACT THE SELF-REPORT HID. `docs/kickoffs/v7.0.858-AGT-483-pair-probe.md` is a real
// 10,213-byte kickoff that was written while its own report claimed the cap was met. Wrapped as an
// answer it must be refused with that exact count. Tied to `statSync().size` so the case cannot
// drift into a made-up string: if that file changes, this clause changes with it or goes red.
//
// (D) THE HOMES, so the mechanism and the instruction cannot disagree. Runbook step 6 must name
// `--check-answer=<the saved answer JSON>` and must NOT still carry the `--check-kickoff=<the path>`
// form it replaced -- a runbook telling the Designer to measure a file that cannot exist yet is the
// defect this ticket closes. The runbook ceiling (381,000 bytes, AGT-79/133/175, SES-400) is
// asserted here too, because the edit that fixes the instruction is also the edit that could breach
// it. The seed's Intent row must still carry the cap sentence: the number this branch enforces and
// the number the Designer is told are one fact.
//
// THE SEAM IS RUN AS A PROCESS WITH NO CREDENTIALS, never imported. Importing the helpers would
// prove the arithmetic and say nothing about whether the branch is reachable: it has to sit ahead
// of verifier.js's credential check, because its caller (step 6) has nothing to authenticate for
// yet. SUPABASE_URL and SUPABASE_SERVICE_KEY are DELETED from the child env, and the clauses demand
// 1 / 0 / 2 rather than the blanket 2 an earlier-returning credential check would produce -- which
// is exactly what origin/dev produces for these same commands today.
//
// READ-ONLY. Fixtures are written to a fresh mkdtemp directory, never into the repo; no board read,
// no write of any kind, no model call.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const RUNBOOK = "docs/runbooks/runner-cycle.md";
const SEED = "docs/design/ga-agents-seed.sql";
const PROBE_KICKOFF = "docs/kickoffs/v7.0.858-AGT-483-pair-probe.md";

// The ceiling the runbook is held under (AGT-79 / AGT-133 / AGT-175 / SES-400).
const RUNBOOK_CEILING = 381_000;

// The instruction that must be gone, quoted exactly as step 6 carried it before AGT-519.
const REPLACED_INSTRUCTION = "**BEFORE the write, run `node scripts/verifier.js --check-kickoff=<the path>` (`SES-376`, cap";
const NEW_INSTRUCTION = "--check-answer=<the saved answer JSON>";
const SEED_CAP_SENTENCE = "THE CAP (SES-376): kickoff_markdown is at most 8,192 bytes UTF-8";

// A child env with the two credentials REMOVED rather than blanked -- a deleted key is what "no
// credentials" actually looks like, and the branch must be reachable without them.
function envWithoutCredentials() {
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}

function checkAnswer(answerPath) {
  const r = spawnSync(process.execPath, ["scripts/verifier.js", `--check-answer=${answerPath}`, "--json"],
    { cwd: ROOT, encoding: "utf8", env: envWithoutCredentials() });
  const raw = `${r.stdout || ""}${r.stderr || ""}`.trim();
  let payload = null;
  try { payload = JSON.parse(raw); } catch { /* a non-JSON body is itself the failure the caller asserts */ }
  return { status: r.status, raw, payload };
}

export default async function run() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt-519-"));
  const write = (name, answer) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, JSON.stringify(answer));
    return p;
  };

  // -- (A) the seeded pair, and the unit ---------------------------------------------------------
  const overMd = "Lanes: session\n" + "é".repeat(4100);
  assert.equal(overMd.length, 4115);
  assert.equal(Buffer.byteLength(overMd, "utf8"), 8215);
  assert.ok(overMd.length <= 8192,
    "negative control: the OVER fixture is UNDER the cap by CHARACTER count, which is the whole " +
    "reason it is the fixture -- an implementation comparing `.length` returns a green here");

  const over = checkAnswer(write("over.json", { premise: "alive", kickoff_markdown: overMd }));
  assert.equal(over.status, 1,
    `--check-answer on an 8,215-byte kickoff_markdown must exit 1. Exit 2 here means the credential ` +
    `check ran first and nothing was measured; exit 0 means the cap was measured in characters. ` +
    `got ${over.status}: ${over.raw}`);
  assert.equal(over.payload.kind, "kickoff-over-cap");
  assert.equal(over.payload.measured, "answer.kickoff_markdown",
    "the refusal must say WHAT it measured -- a reader cannot tell an answer verdict from a file " +
    "verdict otherwise, and the two are the same cap at different moments");
  assert.equal(over.payload.bytes, Buffer.byteLength(overMd, "utf8"),
    `the reported count must be the bytes of the string handed in (8215), not its characters (4115). ` +
    `got ${over.payload.bytes}`);
  assert.equal(over.payload.bytes, 8215);
  assert.equal(over.payload.cap, 8192, "the cap is KICKOFF_BYTE_CAP, 8,192 bytes (SES-376)");
  assert.ok(String(over.payload.reason).includes("8215"),
    `the refusal must name the measured size -- a Designer told only "too big" cannot re-assemble ` +
    `against a number. got: ${over.payload.reason}`);

  const atCapMd = "Lanes: session\n" + "a".repeat(8177);
  assert.equal(Buffer.byteLength(atCapMd, "utf8"), 8192);
  const atCap = checkAnswer(write("at-cap.json", { premise: "alive", kickoff_markdown: atCapMd }));
  assert.equal(atCap.status, 0,
    `exactly 8,192 bytes is WITHIN the cap -- the comparison is <=, not < -- and the branch must ` +
    `reach that verdict with no credentials in the child env. got ${atCap.status}: ${atCap.raw}`);
  assert.equal(atCap.payload.kind, "answer-within-cap");
  assert.equal(atCap.payload.bytes, 8192);
  assert.equal(atCap.payload.measured, "answer.kickoff_markdown");

  const oneOverMd = "Lanes: session\n" + "a".repeat(8178);
  const oneOver = checkAnswer(write("one-over.json", { premise: "alive", kickoff_markdown: oneOverMd }));
  assert.equal(oneOver.status, 1,
    `8,193 bytes is one byte over and must be refused -- this and the case above are the boundary. ` +
    `got ${oneOver.status}: ${oneOver.raw}`);
  assert.equal(oneOver.payload.bytes, 8193);

  const noLanes = checkAnswer(write("no-lanes.json", { premise: "alive", kickoff_markdown: "x".repeat(100) }));
  assert.equal(noLanes.status, 1,
    `a 100-byte answer with no Lanes: line is within the cap and still not a kickoff (SES-359) -- ` +
    `it must exit 1 through this flag too, not only through --check-kickoff. got ${noLanes.status}: ${noLanes.raw}`);
  assert.equal(noLanes.payload.kind, "kickoff-no-lanes",
    `the caller branches on the --json kind, never the prose: an over-cap refusal and a no-lanes ` +
    `refusal share exit 1 and need different re-assemblies. got: ${noLanes.payload.kind}`);

  // -- (B) never a green on nothing --------------------------------------------------------------
  const dead = checkAnswer(write("dead.json", { premise: "dead", kickoff_markdown: null }));
  assert.equal(dead.status, 2,
    `an answer carrying no kickoff_markdown string is the ABSENCE of a measurement, not a kickoff ` +
    `within the cap: exit 2, never 0 and never 1. got ${dead.status}: ${dead.raw}`);
  assert.equal(dead.payload.kind, "cannot-run");

  const missing = checkAnswer(path.join(dir, "not-written.json"));
  assert.equal(missing.status, 2,
    `a path that does not exist must exit 2 -- a caller that collapsed this into 0 would read a ` +
    `typo'd path as a passing cap check. got ${missing.status}: ${missing.raw}`);
  assert.equal(missing.payload.kind, "cannot-run");

  // -- (C) the artifact the self-report hid ------------------------------------------------------
  const probeAbs = path.join(ROOT, PROBE_KICKOFF);
  const probeBytes = fs.statSync(probeAbs).size;
  assert.equal(probeBytes, 10213,
    `${PROBE_KICKOFF} is the measured 10,213-byte kickoff this ticket exists over. If it has ` +
    `changed, this clause must be re-measured rather than relaxed. got ${probeBytes}`);
  const probe = checkAnswer(write("probe.json",
    { premise: "alive", kickoff_markdown: fs.readFileSync(probeAbs, "utf8") }));
  assert.equal(probe.status, 1,
    `the real over-cap kickoff, handed back as an answer, must be refused AT THE ANSWER -- this is ` +
    `the exact case that shipped reporting 8,192. got ${probe.status}: ${probe.raw}`);
  assert.equal(probe.payload.bytes, probeBytes,
    `the refusal's count must agree with the filesystem (${probeBytes} bytes). got ${probe.payload.bytes}`);

  // -- (D) the homes -----------------------------------------------------------------------------
  const runbook = fs.readFileSync(path.join(ROOT, RUNBOOK), "utf8");
  assert.ok(runbook.includes(NEW_INSTRUCTION),
    `${RUNBOOK} step 6 must tell the Designer to run --check-answer=<the saved answer JSON>: the ` +
    `measurement exists only if the runbook asks for it at the moment it can run`);
  assert.ok(!runbook.includes(REPLACED_INSTRUCTION),
    `${RUNBOOK} must no longer carry the replaced instruction -- "BEFORE the write, run ` +
    `--check-kickoff=<the path>" names a path that cannot exist yet, which is the defect AGT-519 closes`);
  const runbookBytes = Buffer.byteLength(runbook, "utf8");
  assert.ok(runbookBytes <= RUNBOOK_CEILING,
    `${RUNBOOK} is ${runbookBytes} bytes, over the ${RUNBOOK_CEILING} ceiling (AGT-79 / AGT-133 / ` +
    `AGT-175 / SES-400) -- the edit that fixes the instruction is also the edit that can breach it`);

  const seed = fs.readFileSync(path.join(ROOT, SEED), "utf8");
  assert.ok(seed.includes(SEED_CAP_SENTENCE),
    `${SEED}'s Intent row must still carry "${SEED_CAP_SENTENCE}" -- the bytes this branch enforces ` +
    `and the bytes the Designer is told are one fact with one home`);

  notRun(
    "AGT-519 (E) (the LIVE skill_profiles row `ds-kickoff-intent`: its `method` carrying the same " +
    "\"at most 8,192 bytes UTF-8\" sentence at position 1117, measured 2026-10-23)",
    "the row belongs to an active agent (`designer`), and `.claude/rules/agent-roster-inert.md` bars " +
    "an automated session from editing an active agent's rows (ARCHITECTURE.md 19v P5), so this " +
    "cycle neither writes it nor gates on it. The in-repo mirror asserted above (" + SEED + ") is " +
    "the half this tree owns; read the live row with credentials exported per " +
    "docs/runbooks/session-setup.md step 1b.");

  fs.rmSync(dir, { recursive: true, force: true });

  console.log(`[AGT-519] --check-answer, no credentials in the child env: OVER 8,215 bytes ` +
    `(4,115 chars) -> exit ${over.status}, AT-CAP 8,192 -> exit ${atCap.status}, ` +
    `ONE-OVER 8,193 -> exit ${oneOver.status}, NO-LANES -> exit ${noLanes.status}; ` +
    `the real ${PROBE_KICKOFF} measures ${probe.payload.bytes} bytes at the answer`);
}

selfRun(import.meta.url, run);
