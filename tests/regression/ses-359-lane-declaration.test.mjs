// DeepBench v7.0.462 | tests/regression/ses-359-lane-declaration.test.mjs | SES-359 -- the kickoff
// declares which lane pays for its build, and this grades that refusal at the helper, at the CLI
// seam, and in the two documents that have to say the same thing.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (A) REAL KICKOFFS, BOTH DIRECTIONS, NAMED RATHER THAN GLOBBED. Four files that DO declare a lane
// and two that do not -- and the two that do not are the point: `v7.0.447-SES-347` and
// `v7.0.448-SES-368` shipped with no declaration at all, which is the state this ticket exists to
// end. A guard written only against the four passing files would stay green against a helper that
// returns null for everything. The four are also deliberately not uniform in wording: SES-360 writes
// "**Lanes (SES-359's declaration):**", SES-367 "**Lanes:** session; executor none", SES-376 and
// this ticket's own "Lanes: `session` … `executor` none" -- so the check is proven to read the
// DECLARATION rather than one session's punctuation.
//
// (B) THE FOUR STRINGS THAT SEPARATE A DECLARATION FROM A MENTION. `executor` is the only lane that
// spends API dollars, so it is the only one with a condition attached, and these four fix it:
// "Lanes: executor $2" passes on the band, "Lanes: executor none" passes on the disclaimer,
// "Lanes: executor -- live QA" FAILS because it books dollars without saying how many, and
// "lanes = []" FAILS because a lowercase `lanes` in a code block is not a declaration. That last one
// is the negative control for the case-sensitivity choice: a case-insensitive `Lanes` match passes
// it, and the check would then certify any kickoff that happened to contain a variable named lanes.
//
// (C) THE SEAM, RUN AS A PROCESS WITH NO CREDENTIALS IN ITS ENV, same shape and same reason as
// SES-376's clause (C): the branch sits ahead of verifier.js's credential check, and the only proof
// of that placement is a 1 and a 0 from a child whose env has neither key -- a 2 would mean the
// credential check ran first and nothing was ever measured. The `kind` is asserted through `--json`
// rather than through the prose, because the prose carries the REASON (which is what the Designer
// being asked to re-assemble has to read) and the payload carries the machine-readable kind.
//
// (D) ONE WORDING, TWO HOMES, ASSERTED AS BYTES. `CLAUDE-DESIGN.md` (the design session's procedure)
// and `docs/STANDARDS.md` (the kickoff-structure rule) must state the lane rule identically; two
// homes drifting into two subtly different rules is the defect this repo has repeatedly paid for.
// Comparing each file against the pinned constant AND against the other means an edit to one home
// cannot be made green by editing the constant to match it.
//
// READ-ONLY. No write of any kind, no model call, no board read, and nothing here needs credentials.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { kickoffLaneFinding } from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KICKOFF_DIR = "docs/kickoffs";

// Kickoffs that DO carry a lane declaration, in four different wordings.
const DECLARED = [
  "v7.0.454-SES-360-governance-agents-brief-block.md",
  "v7.0.457-SES-367-session-prompt-output-contract.md",
  "v7.0.459-SES-376-kickoff-size-cap.md",
  "v7.0.462-SES-359-attended-sessions-run-designer-builder.md",
];

// The two attended ships that predate the rule and carry no declaration at all.
const UNDECLARED = [
  "v7.0.448-SES-368-weekly-pace-gate.md",
  "v7.0.447-SES-347-account-field-refusal.md",
];

const SES_368_KICKOFF = `${KICKOFF_DIR}/v7.0.448-SES-368-weekly-pace-gate.md`;
const SES_376_KICKOFF = `${KICKOFF_DIR}/v7.0.459-SES-376-kickoff-size-cap.md`;

// THE WORDING, pinned here as bytes. Its two homes must both contain exactly this.
const LANE_WORDING_FIRST_SENTENCE =
  "Lane declaration (`SES-359`): the SESSION section carries one `Lanes:` line naming the lane of " +
  "every model call the build will make — `session` (subscription; the default for governance and " +
  "tooling work), `executor` (API dollars; only when the executor is the thing under test or the " +
  "ticket is product-facing live QA — with a dollar band, e.g. `$1-3`) or `none` (no model call) — " +
  "each with one line of reason.";
const LANE_WORDING = `${LANE_WORDING_FIRST_SENTENCE} \`node scripts/verifier.js --check-kickoff=<path>\` refuses a kickoff without it.`;

const WORDING_HOMES = ["CLAUDE-DESIGN.md", "docs/STANDARDS.md"];

function envWithoutCredentials() {
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}

function runVerifier(kickoffRelPath, extraArgs = []) {
  const r = spawnSync(process.execPath,
    ["scripts/verifier.js", `--check-kickoff=${kickoffRelPath}`, ...extraArgs],
    { cwd: ROOT, encoding: "utf8", env: envWithoutCredentials() });
  return { status: r.status, output: `${r.stdout || ""}${r.stderr || ""}` };
}

export default async function run() {
  // -- (A) the real kickoffs, both directions ----------------------------------------------------
  for (const name of DECLARED) {
    const rel = `${KICKOFF_DIR}/${name}`;
    assert.equal(kickoffLaneFinding(fs.readFileSync(path.join(ROOT, rel), "utf8")), null,
      `${rel} carries a Lanes: line and must produce NO finding -- if this is red the check has ` +
      `tightened onto one session's punctuation rather than reading the declaration`);
  }

  for (const name of UNDECLARED) {
    const rel = `${KICKOFF_DIR}/${name}`;
    const finding = kickoffLaneFinding(fs.readFileSync(path.join(ROOT, rel), "utf8"));
    assert.ok(finding,
      `${rel} is one of the two attended ships that carry no lane declaration and must produce a ` +
      `finding -- these are the files the rule exists for, and a check green on them is measuring ` +
      `nothing`);
    assert.equal(finding.kind, "kickoff-no-lanes");
    assert.ok(finding.reason.includes("SES-359") && finding.reason.includes("Lanes:"),
      `${rel}: the reason must name the ticket and the remedy -- its reader is the Designer being ` +
      `asked to re-assemble. got: ${finding.reason}`);
  }

  // -- (B) the executor clause, and the case-sensitivity control ---------------------------------
  assert.equal(kickoffLaneFinding("Lanes: executor $2"), null,
    "an executor lane carrying a dollar band is a complete declaration");
  assert.equal(kickoffLaneFinding("Lanes: executor none"), null,
    "an executor lane explicitly disclaimed is a complete declaration");

  const noBand = kickoffLaneFinding("Lanes: executor — live QA");
  assert.ok(noBand,
    "an executor lane with neither a band nor a `none` books API dollars without saying how many, " +
    "which is the one thing the declaration exists to state");
  assert.equal(noBand.kind, "kickoff-no-lanes");

  const codeLine = kickoffLaneFinding("lanes = []");
  assert.ok(codeLine,
    "NEGATIVE CONTROL for the case-sensitive `Lanes` match: `lanes = []` is a line of code, not a " +
    "declaration. A case-insensitive check passes this string and would then certify any kickoff " +
    "that happens to contain a variable named lanes");
  assert.equal(codeLine.kind, "kickoff-no-lanes");

  // -- (C) the seam: the branch runs ahead of the credential check -------------------------------
  const undeclared = runVerifier(SES_368_KICKOFF);
  assert.equal(undeclared.status, 1,
    `verifier.js --check-kickoff on the SES-368 kickoff must exit 1 on the missing lane ` +
    `declaration. Exit 2 here means the credential check ran first and nothing was measured; ` +
    `exit 0 means the refusal is not wired to the CLI at all. got ${undeclared.status}: ` +
    `${undeclared.output.trim()}`);
  assert.ok(/no lane declaration \(SES-359\)/.test(undeclared.output),
    `the refusal's prose must say what is missing and name the ticket. got: ${undeclared.output.trim()}`);

  const undeclaredJson = runVerifier(SES_368_KICKOFF, ["--json"]);
  assert.equal(undeclaredJson.status, 1, "--json must not change the verdict, only the rendering");
  const payload = JSON.parse(undeclaredJson.output.trim());
  assert.equal(payload.kind, "kickoff-no-lanes",
    `the machine payload must carry the kind, distinct from SES-376's kickoff-over-cap -- a caller ` +
    `that cannot tell the two refusals apart cannot act on either. got: ${undeclaredJson.output.trim()}`);
  assert.equal(payload.ok, false);
  assert.equal(payload.exitCode, 1);

  const declared = runVerifier(SES_376_KICKOFF);
  assert.equal(declared.status, 0,
    `verifier.js --check-kickoff on the SES-376 kickoff -- within cap AND carrying a Lanes: line -- ` +
    `must exit 0 with no credentials in the child env. got ${declared.status}: ${declared.output.trim()}`);

  // -- (D) one wording, two homes, plus the two single-home facts this ship owes ------------------
  const seen = [];
  for (const home of WORDING_HOMES) {
    const text = fs.readFileSync(path.join(ROOT, home), "utf8");
    const at = text.indexOf(LANE_WORDING_FIRST_SENTENCE);
    assert.notEqual(at, -1,
      `${home} must carry the lane wording's first sentence BYTE-IDENTICALLY. Two homes stating one ` +
      `rule in two slightly different ways is the drift this assertion exists to stop -- if you ` +
      `edited the rule, edit both homes and this constant together`);
    seen.push(text.slice(at, at + LANE_WORDING_FIRST_SENTENCE.length));
    assert.ok(text.includes(LANE_WORDING),
      `${home} must also carry the closing sentence naming --check-kickoff as what enforces it`);
  }
  assert.equal(seen[0], seen[1],
    "the two homes must match EACH OTHER, not merely the constant -- otherwise editing the constant " +
    "to match one home would make a drifted other home green");

  const runbook = fs.readFileSync(path.join(ROOT, "docs/runbooks/runner-cycle.md"), "utf8");
  const logLines = runbook.split("\n").filter(l => l.includes("agent-log.js")).length;
  assert.equal(logLines, 2,
    `docs/runbooks/runner-cycle.md must carry exactly 2 agent-log.js lines -- one for the design ` +
    `run at step 6 and one for the build run at step 7. It carried ZERO before this ticket, which ` +
    `is why the log holds 2 Designer and 1 Builder rows across 12 kickoffs. got ${logLines}`);

  const ledger = fs.readFileSync(path.join(ROOT, "docs/SELFBUILD-RETIREMENT-LEDGER.md"), "utf8");
  assert.ok(/^### 54\./m.test(ledger),
    "docs/SELFBUILD-RETIREMENT-LEDGER.md must carry entry 54 -- the hand-composed coding prompt is " +
    "retired in place, and an unledgered retirement is the un-findable removal the ledger's own " +
    "contract exists to prevent");

  console.log(`[SES-359] lane declaration: ${DECLARED.length} declaring kickoffs pass and ` +
    `${UNDECLARED.length} undeclared attended ships are refused; executor needs a band or a none ` +
    `("executor — live QA" refused, "$2" and "none" accepted); "lanes = []" refused by the ` +
    `case-sensitive match; --check-kickoff exits 1 (kind kickoff-no-lanes) / 0 with no credentials; ` +
    `one wording byte-identical across ${WORDING_HOMES.join(" and ")}; runner-cycle.md carries ` +
    `${logLines} agent-log.js lines; ledger entry 54 present`);
}

selfRun(import.meta.url, run);
