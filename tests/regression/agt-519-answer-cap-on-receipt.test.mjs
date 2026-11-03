// DeepBench v7.0.943 | tests/regression/agt-519-answer-cap-on-receipt.test.mjs | AGT-519 -- the
// kickoff cap, graded on the ANSWER the Designer returned, before any file exists to measure.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (A) THE SEEDED PAIR, THROUGH THE SEAM, WITH NO CREDENTIALS IN THE CHILD ENV. `--check-answer=`
// has to sit ahead of verifier.js's credential check for the same reason `--check-kickoff=` does,
// one argument earlier: its caller holds a model's answer and has no cycle to authenticate for. The
// only way to prove that placement is to spawn the script with SUPABASE_URL and
// SUPABASE_SERVICE_KEY DELETED from the child env and demand 1 and 0 -- on the pre-change tree the
// identical command exits 2 (`missing: ["SUPABASE_URL","SUPABASE_SERVICE_KEY","--cycle-id"]`),
// never 1, so this clause is the one that would catch the branch landing in the wrong place.
//
// BYTES, NOT CHARACTERS, PROVEN WITH THE MUTANT THAT SEPARATES THEM. The OVER answer is 4,115
// CHARACTERS and 8,215 BYTES, and `assert.ok(md.length <= 8192)` is a NEGATIVE CONTROL kept beside
// it deliberately: an implementation comparing `.length` returns a green for this answer, so the
// 8,215 is what proves which unit did the work. `bytes === Buffer.byteLength(md, "utf8")` ties the
// payload's count to the string rather than to a number this file made up. The boundary is fixed
// from both sides -- 8,192 exits 0 and 8,193 exits 1 -- because a cap asserted on one side of its
// own edge is an off-by-one nobody would see.
//
// (B) NEVER A GREEN ON NOTHING. An answer whose `kickoff_markdown` is null, and a path that does
// not exist, must both exit 2: 1 is a verdict about the kickoff, 2 is the absence of one. A branch
// that collapsed them would hand a typo'd path a passing cap check -- and this check's whole job is
// to be the thing a Designer's self-report cannot talk its way past.
//
// (C) THE ARTIFACT THE SELF-REPORT HID, which is why the ticket exists rather than a reminder in a
// Skill row. `docs/kickoffs/v7.0.858-AGT-483-pair-probe.md` is 10,213 bytes on disk (statSync, this
// run) and its Designer reported 8,192. Wrapped as an answer it must exit 1 naming 10,213 -- the
// measurement the old flag could only take after the over-cap file had already been written.
//
// (D) THE CAP IS STATED WHERE THE KICKOFF IS PRODUCED, asserted on the seed and DECLARED not-run on
// the live row. `docs/design/ga-agents-seed.sql` is the tracked source for the `ds-kickoff-intent`
// Skill row, and that file is readable here; the LIVE row is a `designer` agent row, and
// `.claude/rules/agent-roster-inert.md` bars an automated session from editing an active agent's
// rows (ARCHITECTURE.md 19v P5). So the seed text is asserted and the live read is declared rather
// than skipped silently -- a check whose green is a measurement, beside a gap that stays visible.
//
// READ-ONLY. No write of any kind, no model call, no board read. Fixtures are this run's own
// mkdtemp directory; nothing in the repo or the database is touched.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// The over-cap kickoff the Designer's own self-report called 8,192 bytes (AGT-483, measured here).
const PROBE_KICKOFF = "docs/kickoffs/v7.0.858-AGT-483-pair-probe.md";
const PROBE_BYTES = 10213;

// Anchor 5: the sentence the live `ds-kickoff-intent` row carries, in its tracked source.
const SEED_SQL = "docs/design/ga-agents-seed.sql";
const SEED_CAP_LINE = "THE CAP (SES-376): kickoff_markdown is at most 8,192 bytes UTF-8";

// The card that gates the live-row read below.
const ROSTER_RULE = ".claude/rules/agent-roster-inert.md";

const fixtures = fs.mkdtempSync(path.join(os.tmpdir(), "agt-519-"));

// A child env with the two credentials REMOVED rather than blanked -- verifier.js tests them for
// falsiness, so either would do, but a deleted key is what "no credentials" actually looks like.
function envWithoutCredentials() {
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}

function writeAnswer(name, answer) {
  const file = path.join(fixtures, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(answer));
  return file;
}

// Returns the exit status and the parsed `--json` payload. The payload is parsed rather than
// string-matched so a clause can assert `kind` and `bytes` as values: an output that merely
// CONTAINS "8215" would also be satisfied by a refusal that named the number for another reason.
function checkAnswer(file) {
  const r = spawnSync(process.execPath, ["scripts/verifier.js", `--check-answer=${file}`, "--json"],
    { cwd: ROOT, encoding: "utf8", env: envWithoutCredentials() });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  let payload = null;
  try { payload = JSON.parse(out.trim().split("\n").filter(Boolean).pop()); } catch { /* left null */ }
  return { status: r.status, out, payload };
}

export default async function run() {
  // -- (A) the seeded pair, the unit, and both sides of the boundary -----------------------------
  const overMd = `Lanes: session\n${"é".repeat(4100)}`;
  assert.equal(overMd.length, 4115, "the OVER answer is 4,115 characters");
  assert.equal(Buffer.byteLength(overMd, "utf8"), 8215, "...and 8,215 bytes");
  assert.ok(overMd.length <= 8192,
    "negative control: the OVER answer is UNDER the cap by CHARACTER count, which is exactly why " +
    "it separates a byte implementation from a character one -- an implementation comparing " +
    "`.length` hands this answer a green");

  const over = checkAnswer(writeAnswer("over", { premise: "alive", kickoff_markdown: overMd }));
  assert.equal(over.status, 1,
    `--check-answer on an 8,215-byte kickoff_markdown must exit 1 with no credentials in the child ` +
    `env. Exit 2 here means the credential check ran first and the cap was never measured. ` +
    `got ${over.status}: ${over.out.trim()}`);
  assert.equal(over.payload.kind, "kickoff-over-cap",
    `the refusal must name WHICH refusal it is. got: ${JSON.stringify(over.payload)}`);
  assert.equal(over.payload.measured, "answer.kickoff_markdown",
    "the payload must say which input was counted -- the exit codes are identical to the file " +
    "check's, so a reader of the payload alone cannot otherwise tell disk from answer");
  assert.equal(over.payload.bytes, 8215);
  assert.equal(over.payload.bytes, Buffer.byteLength(overMd, "utf8"),
    "the payload's count must agree with the string it measured, not with a literal in this test");
  assert.ok(String(over.payload.reason).includes("8215"),
    `the refusal's prose must carry the TRUE count -- a refusal that does not say how big the ` +
    `answer was cannot be acted on, and 8,192 is the number the Designer already reported. ` +
    `got: ${over.payload.reason}`);

  const atCapMd = `Lanes: session\n${"a".repeat(8177)}`;
  assert.equal(Buffer.byteLength(atCapMd, "utf8"), 8192, "the AT-CAP answer is exactly 8,192 bytes");
  const atCap = checkAnswer(writeAnswer("at-cap", { premise: "alive", kickoff_markdown: atCapMd }));
  assert.equal(atCap.status, 0,
    `exactly 8,192 bytes is WITHIN the cap -- the comparison is <=, not <. ` +
    `got ${atCap.status}: ${atCap.out.trim()}`);
  assert.equal(atCap.payload.kind, "answer-within-cap");
  assert.equal(atCap.payload.bytes, 8192);
  assert.equal(atCap.payload.cap, 8192, "the green names the cap it was graded against");

  const oneOver = checkAnswer(writeAnswer("one-over",
    { premise: "alive", kickoff_markdown: `Lanes: session\n${"a".repeat(8178)}` }));
  assert.equal(oneOver.status, 1,
    `8,193 bytes is OVER the cap -- the other side of the same edge. got ${oneOver.status}: ${oneOver.out.trim()}`);
  assert.equal(oneOver.payload.bytes, 8193);

  // The SECOND refusal behind the same flag (SES-359), reached only by an answer within the cap:
  // a kickoff that declares no lanes is refused on the answer too, not just on the file.
  const noLanes = checkAnswer(writeAnswer("no-lanes",
    { premise: "alive", kickoff_markdown: "x".repeat(100) }));
  assert.equal(noLanes.status, 1,
    `an answer with no \`Lanes:\` line must exit 1 (SES-359). got ${noLanes.status}: ${noLanes.out.trim()}`);
  assert.equal(noLanes.payload.kind, "kickoff-no-lanes",
    `the lane refusal keeps its own kind through the answer branch -- collapsing it into the cap ` +
    `refusal would tell the Designer to trim a 100-byte kickoff. got: ${JSON.stringify(noLanes.payload)}`);

  // -- (B) never a green on nothing --------------------------------------------------------------
  const nullMd = checkAnswer(writeAnswer("null-md", { premise: "dead", kickoff_markdown: null }));
  assert.equal(nullMd.status, 2,
    `an answer carrying no \`kickoff_markdown\` string is the ABSENCE of a measurement (2), never a ` +
    `verdict (1) and never a green (0). got ${nullMd.status}: ${nullMd.out.trim()}`);
  assert.equal(nullMd.payload.kind, "cannot-run");
  assert.equal(nullMd.payload.ok, false);

  const missing = checkAnswer(path.join(fixtures, "no-such-answer.json"));
  assert.equal(missing.status, 2,
    `a path that does not exist must exit 2 -- a branch that collapsed 2 into 0 would hand a ` +
    `typo'd path a passing cap check. got ${missing.status}: ${missing.out.trim()}`);
  assert.equal(missing.payload.kind, "cannot-run");

  // -- (C) the artifact the self-report hid ------------------------------------------------------
  const probeAbs = path.join(ROOT, PROBE_KICKOFF);
  assert.equal(fs.statSync(probeAbs).size, PROBE_BYTES,
    `${PROBE_KICKOFF} is the 10,213-byte kickoff whose Designer reported 8,192 -- if this is red ` +
    `the artifact this ticket was measured on has changed and the case below proves nothing`);
  const probe = checkAnswer(writeAnswer("probe",
    { premise: "alive", kickoff_markdown: fs.readFileSync(probeAbs, "utf8") }));
  assert.equal(probe.status, 1,
    `the real over-cap kickoff, wrapped as the answer that produced it, must be refused BEFORE it ` +
    `is written. got ${probe.status}: ${probe.out.trim()}`);
  assert.equal(probe.payload.bytes, PROBE_BYTES,
    `the refusal must name the artifact's true size ${PROBE_BYTES}, which is the number the ` +
    `self-report did not. got: ${JSON.stringify(probe.payload)}`);

  // -- (D) the cap is stated where the kickoff is produced ---------------------------------------
  const seed = fs.readFileSync(path.join(ROOT, SEED_SQL), "utf8");
  assert.ok(seed.includes(SEED_CAP_LINE),
    `${SEED_SQL} must carry the cap sentence the \`ds-kickoff-intent\` row states -- the check ` +
    `above refuses an over-cap answer, and a Designer that was never told the cap is being graded ` +
    `on a rule it cannot read (the cap lives in the Skill rows, never in scripts/agent-prompt.js)`);

  notRun(
    `AGT-519 clause (D), live half (the \`ds-kickoff-intent\` row in \`skill_profiles\`: its own ` +
    `text carrying "${SEED_CAP_LINE}" as shipped, rather than the tracked seed asserted above)`,
    `that row belongs to the \`designer\` agent, which \`public.agents\` carries as is_active, and ` +
    `${ROSTER_RULE} bars an automated session from reading-and-regrading an active agent's rows as ` +
    `a ship gate (ARCHITECTURE.md 19v P5). The seed file IS the tracked source of that row and is ` +
    `asserted above; this declaration keeps the seed-to-row gap visible rather than implying the ` +
    `live row was graded. Run it from an attended session with credentials exported per ` +
    `docs/runbooks/session-setup.md step 1b.`);

  fs.rmSync(fixtures, { recursive: true, force: true });

  console.log(`[AGT-519] --check-answer, no credentials in the child env: 8,215 bytes (4,115 chars) ` +
    `-> ${over.status}, 8,192 -> ${atCap.status}, 8,193 -> ${oneOver.status}, no Lanes: line -> ` +
    `${noLanes.status} (${noLanes.payload.kind}); null kickoff_markdown and a missing path -> 2; ` +
    `${PROBE_KICKOFF} refused at ${probe.payload.bytes} bytes before any file is written`);
}

selfRun(import.meta.url, run);
