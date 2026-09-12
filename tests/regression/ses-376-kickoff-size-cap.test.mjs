// DeepBench v7.0.459 | tests/regression/ses-376-kickoff-size-cap.test.mjs | SES-376 -- the kickoff
// size cap, graded in the unit it is written in and at the seam it is called through.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (A) REAL FILES, BOTH DIRECTIONS, WITH THE BYTE COUNT TIED TO THE FILESYSTEM. The five unattended
// kickoffs v7.0.450-454 must produce a finding and the two attended ones must not -- a cap asserted
// only against strings this file made up would stay green through a constant retuned to 80,000,
// because nothing in the suite would then be near it. `finding.bytes === fs.statSync(...).size`
// is what keeps the helper's arithmetic honest: it can only agree with the filesystem if it is
// really counting bytes of the real file. The glob for THIS ticket's own kickoff is the ticket's
// own QA -- SES-376 is the rule that its kickoff be under the cap it introduces, so a v7.0.459
// kickoff over 8,192 bytes is this test's business and not a special case.
//
// (B) BYTES, NOT CHARACTERS, PROVEN WITH THE MUTANT THAT SEPARATES THEM. `"a".repeat(8192)` -> null
// and `"a".repeat(8193)` -> finding fix the boundary, but both pass under a `.length` comparison
// too, so on their own they measure nothing about the unit. `"é".repeat(4097)` is 4,097 CHARACTERS
// and 8,194 BYTES: an implementation using `.length` returns null for it and this file goes red.
// The negative control below asserts that char-count reading explicitly, so the reason the case is
// here cannot be lost to a later edit that keeps the assertion and forgets the point.
//
// (C) THE SEAM, RUN AS A PROCESS WITH NO CREDENTIALS IN ITS ENV. Importing the helper proves the
// arithmetic; it says nothing about whether `--check-kickoff` is reachable. The branch has to sit
// AHEAD of verifier.js's credential check, because runbook step 6 measures a draft before the cycle
// has anything to authenticate for -- and the only way to prove that placement is to run the script
// with SUPABASE_URL and SUPABASE_SERVICE_KEY removed from the child's env and demand 1 and 0 rather
// than the 2 ("missing SUPABASE_URL...") an earlier-returning credential check would produce. That
// exit-2 baseline is what origin/dev does today, so this clause is the one that would have caught
// the branch being added in the wrong place.
//
// (D) AND (E) ARE DECLARED NOT-RUN, NOT ASSERTED. They grade the Skill rows (`ds-kickoff-intent`,
// `bd-build-intent`), `docs/design/ga-agents-seed.sql` and `docs/runbooks/runner-cycle.md` -- the
// gated half of SES-376. `public.agents` carries `designer` and `builder` as `is_active = true`, and
// `.claude/rules/agent-roster-inert.md` bars an automated session from editing an active agent's
// rows (§19v P5), so that text does not exist in this tree and cannot until an attended session
// ships it. Asserting it here would be a test that fails by construction, and asserting it "loosely"
// enough to pass would be worse: a green clause over absent text. `notRun` naming the card is the
// honest third option -- the gap stays visible in the suite's own output until the card lands.
//
// READ-ONLY. No write of any kind, no model call, no board read. The live half is (E), and it is
// not run here for the reason above rather than for want of credentials.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { KICKOFF_BYTE_CAP, kickoffCapFinding } from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KICKOFF_DIR = "docs/kickoffs";

// The five unattended kickoffs measured 2026-09-12. Named, not globbed: a glob over the directory
// would silently shrink to nothing if the naming convention changed, and pass.
const OVER_CAP = [
  "v7.0.450-LOG-149-api-dollars-ledger.md",
  "v7.0.451-SES-354-renderer-counts-pushes.md",
  "v7.0.452-SES-352-green-anchor-from-ci.md",
  "v7.0.453-SES-353-standing-decisions-leave-pick-lane.md",
  "v7.0.454-SES-360-governance-agents-brief-block.md",
];

// The two attended kickoffs the cap was sized against (4,924 and 3,445 bytes).
const WITHIN_CAP = [
  "v7.0.447-SES-347-account-field-refusal.md",
  "v7.0.448-SES-368-weekly-pace-gate.md",
];

const SES_360_KICKOFF = `${KICKOFF_DIR}/v7.0.454-SES-360-governance-agents-brief-block.md`;
const SES_360_BYTES = "55824";

// The attended card that unblocks (D) and (E). Written once, here.
const GATED_CARD = "1d57ebca";

// A child env with the two credentials REMOVED rather than blanked -- verifier.js tests them for
// falsiness, so either would do, but a deleted key is what "no credentials" actually looks like.
function envWithoutCredentials() {
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}

function runVerifier(kickoffRelPath) {
  const r = spawnSync(process.execPath, ["scripts/verifier.js", `--check-kickoff=${kickoffRelPath}`],
    { cwd: ROOT, encoding: "utf8", env: envWithoutCredentials() });
  return { status: r.status, output: `${r.stdout || ""}${r.stderr || ""}` };
}

export default async function run() {
  // -- (A) the real files, both directions ------------------------------------------------------
  assert.equal(KICKOFF_BYTE_CAP, 8192, "the cap is 8,192 bytes (SES-376)");

  for (const name of OVER_CAP) {
    const rel = `${KICKOFF_DIR}/${name}`;
    const abs = path.join(ROOT, rel);
    const finding = kickoffCapFinding(fs.readFileSync(abs, "utf8"));
    assert.ok(finding, `${rel} is one of the five measured over-cap kickoffs and must produce a finding`);
    assert.equal(finding.cap, KICKOFF_BYTE_CAP);
    assert.equal(finding.bytes, fs.statSync(abs).size,
      `${rel}: the finding's byte count must agree with the filesystem -- a helper counting ` +
      `characters disagrees here by 157-314 bytes on exactly these files. ` +
      `finding ${finding.bytes}, stat ${fs.statSync(abs).size}`);
    assert.ok(finding.reason.includes("SES-376") && finding.reason.includes("docs/harvests/"),
      `${rel}: the reason must name the ticket and where the reasoning goes instead -- its reader ` +
      `is the Designer being asked to re-assemble. got: ${finding.reason}`);
  }

  for (const name of WITHIN_CAP) {
    const rel = `${KICKOFF_DIR}/${name}`;
    assert.equal(kickoffCapFinding(fs.readFileSync(path.join(ROOT, rel), "utf8")), null,
      `${rel} is an attended kickoff well under the cap and must produce no finding -- if this is ` +
      "red the cap has been tightened below what a real kickoff can be written in");
  }

  // This ticket's own kickoff, found by shape rather than by a pinned filename: SES-376 is the rule
  // that a kickoff fits the cap, so its own must, and a renamed file must not slip the check.
  const ownKickoffs = fs.readdirSync(path.join(ROOT, KICKOFF_DIR))
    .filter(f => /^v7\.0\.459-SES-376-.*\.md$/.test(f));
  assert.equal(ownKickoffs.length, 1,
    `expected exactly one v7.0.459-SES-376-*.md kickoff in ${KICKOFF_DIR}, found ${ownKickoffs.length}`);
  const ownRel = `${KICKOFF_DIR}/${ownKickoffs[0]}`;
  assert.equal(kickoffCapFinding(fs.readFileSync(path.join(ROOT, ownRel), "utf8")), null,
    `${ownRel} must itself be within the cap it introduces -- the ticket's own QA, run on itself ` +
    `(${fs.statSync(path.join(ROOT, ownRel)).size} bytes)`);

  assert.ok(fs.existsSync(path.join(ROOT, "docs/harvests/SES-376.md")),
    "docs/harvests/SES-376.md must exist -- the cap only works if the reasoning has somewhere to " +
    "go, and a kickoff under 8,192 bytes with no harvest beside it is reasoning that was deleted");

  // -- (B) the boundary, and the unit ------------------------------------------------------------
  assert.equal(kickoffCapFinding("a".repeat(KICKOFF_BYTE_CAP)), null,
    "exactly 8,192 bytes is WITHIN the cap -- the comparison is <=, not <");
  const oneOver = kickoffCapFinding("a".repeat(KICKOFF_BYTE_CAP + 1));
  assert.ok(oneOver && oneOver.bytes === KICKOFF_BYTE_CAP + 1, "8,193 bytes must produce a finding");

  // THE MUTANT: 4,097 characters, 8,194 bytes. A `.length` implementation returns null here.
  const multibyte = "é".repeat(4097);
  assert.equal(multibyte.length, 4097);
  assert.equal(Buffer.byteLength(multibyte, "utf8"), 8194);
  assert.ok(multibyte.length <= KICKOFF_BYTE_CAP,
    "negative control: this string is UNDER the cap by character count, which is why it separates " +
    "a byte implementation from a character one");
  const multibyteFinding = kickoffCapFinding(multibyte);
  assert.ok(multibyteFinding,
    "4,097 characters of 'é' are 8,194 BYTES and must be refused -- a helper comparing `.length` " +
    "passes this string and grants every kickoff a silent multi-byte allowance on top of the cap");
  assert.equal(multibyteFinding.bytes, 8194);

  // -- (C) the seam: the branch runs ahead of the credential check -------------------------------
  const over = runVerifier(SES_360_KICKOFF);
  assert.equal(over.status, 1,
    `verifier.js --check-kickoff on the 55,824-byte SES-360 kickoff must exit 1. Exit 2 here means ` +
    `the credential check ran first and the cap was never measured. got ${over.status}: ${over.output.trim()}`);
  assert.ok(over.output.includes(SES_360_BYTES),
    `the over-cap output must name the measured size ${SES_360_BYTES} -- a refusal that does not ` +
    `say how big the file was cannot be acted on. got: ${over.output.trim()}`);

  // THE EXIT-0 CASE IS THIS TICKET'S OWN KICKOFF, NOT SES-368's, AS OF SES-359. It was
  // `v7.0.448-SES-368-weekly-pace-gate.md` -- 3,445 bytes, comfortably within the cap and therefore
  // a clean 0 for this clause's purpose. SES-359 added a SECOND refusal behind the same flag and the
  // same exit code (a kickoff with no `Lanes:` line), and that kickoff has none, so it now exits 1
  // on lanes while remaining perfectly within the size cap. Swapping in `ownRel` keeps this clause
  // measuring the one thing it is for -- that the branch runs AHEAD of the credential check, proven
  // by a 0 rather than a 2 -- instead of quietly turning into an assertion about lanes. SES-368's
  // cap behaviour is untouched and still asserted above, through `WITHIN_CAP` in clause (A).
  const within = runVerifier(ownRel);
  assert.equal(within.status, 0,
    `verifier.js --check-kickoff on ${ownRel} must exit 0 with no credentials ` +
    `in the child env. got ${within.status}: ${within.output.trim()}`);
  assert.ok(/within 8192/.test(within.output),
    `the within-cap output must say so and name the cap. got: ${within.output.trim()}`);

  // -- (D) and (E): the gated half, declared rather than asserted --------------------------------
  notRun(
    `SES-376 clause (D) (the seed + runbook text: ga-agents-seed.sql's ds-kickoff-intent carrying ` +
    `"8,192" and "harvest_markdown", bd-build-intent carrying "never docs/harvests/", and ` +
    `runner-cycle.md carrying --check-kickoff= and --kickoff=)`,
    `that text is not in this tree: Task 1 and Task 3 of the SES-376 kickoff are the gated lane. ` +
    `public.agents has designer and builder is_active = true, and .claude/rules/agent-roster-inert.md ` +
    `bars an automated session from editing an active agent's rows (ARCHITECTURE.md 19v P5), so the ` +
    `Skill rows, the seed and the runbook are filed for an attended session on card ${GATED_CARD}. ` +
    `Asserting the text here would be a clause that fails by construction; this declaration is the ` +
    `honest form. It runs when card ${GATED_CARD} ships.`);

  notRun(
    `SES-376 clause (E) (the LIVE Skill rows: ds-kickoff-intent's schema carrying harvest_markdown ` +
    `in properties and required, kickoff_markdown.maxLength === 8192, method including "8,192"; ` +
    `bd-build-intent.method including "docs/harvests/")`,
    `same gate as clause (D), not a credentials gap: the rows belong to two active agents, so this ` +
    `cycle may not write them and there is nothing live to read. Unblocked by card ${GATED_CARD}; ` +
    `with that shipped, run with credentials exported per docs/runbooks/session-setup.md step 1b.`);

  console.log(`[SES-376] cap ${KICKOFF_BYTE_CAP} bytes: ${OVER_CAP.length} measured kickoffs refused ` +
    `(largest ${SES_360_BYTES}), ${WITHIN_CAP.length} attended ones and this ticket's own ` +
    `(${fs.statSync(path.join(ROOT, ownRel)).size} bytes) within; the 4,097-char / 8,194-byte mutant ` +
    `is refused, which a character count would pass; --check-kickoff exits 1/0 with no credentials`);
}

selfRun(import.meta.url, run);
