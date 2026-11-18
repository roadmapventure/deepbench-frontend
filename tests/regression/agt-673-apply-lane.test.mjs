// DeepBench v7.0.1056 | tests/regression/agt-673-apply-lane.test.mjs | AGT-673 -- a kickoff that
// names `apply_migration` says WHO applies it, and the answer is never the Builder.
//
// FEATURE: AGT-673 T2/T3. Measured 2026-11-18: `[Production Deploy]` fired 4 times, 3 of them
// Builder launches. The one launch text the platform still holds
// (`runner_refusal_attempts.action_sent`) had sent a Builder that holds NO Supabase connector off
// to run `apply_migration` "over the repo's own REST path". The orchestrator's own connector
// applies -- 30 migrations since cycle 53254e08 kept every migration step with it -- and none of
// those is on record as refused. So the lawful shape is one line in the kickoff, and before this
// ship nothing read it: `scripts/verifier.js --check-kickoff` graded cap, Lanes, Builder model,
// anchors, the risk block and attestation, and a kickoff could hand a Builder a live migration
// without a single clause noticing.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (A) THE WORKED CASES, against the exported helpers, pure. Each is a different way the clause can
//     be wrong, and two are the DANGEROUS direction: an `**Apply:**` line that names the Builder
//     accepted as a declaration, and a kickoff that never says `apply_migration` refused anyway
//     (which would turn every ordinary kickoff red and wedge runbook step 6).
//
// (B) THE SPAWNED CLI, because the helper being right proves nothing about the branch calling it.
//     `--check-kickoff` is what runbook step 6 runs and the exit code is what the cycle acts on,
//     so the fixtures are written under os.tmpdir() with BOTH credentials deleted from the child
//     env, exactly as `agt-610-risk-block` / `ses-376` / `ses-359` spawn it: this clause must hold
//     in an uncredentialed cloud cycle, the only place it ever runs unattended.
//
// (C) A SHIPPED KICKOFF THAT REALLY DOES NAME `apply_migration`
//     (`docs/kickoffs/v7.0.1017-AGT-570-own-row-exemption.md`, whose T2 is an apply). As shipped it
//     must pass, because its stamp predates the boundary; the SAME bytes with only the stamp moved
//     to v7.0.1057 must refuse. One pair, two outcomes, one byte of difference -- which is the only
//     form of this assertion that cannot be satisfied by a clause that ignores the stamp.
//
// (D) THE REGISTER LINE T1 appended, so the rule the clause enforces and the fact the Designer
//     reads are the same sentence rather than two drifting copies (pattern:93).
//
// THE STAMP BOUNDARY IS THE CLAUSE'S WHOLE SAFETY (pattern:162 -- a check grades the change, never
// the corpus). `APPLY_LINE_FROM` is v7.0.1057, the version AFTER this build, so zero shipped
// kickoffs are graded by it: every test in the suite that spawns `--check-kickoff` over a committed
// kickoff keeps its exit code. (A)'s and (C)'s below-boundary arms are what hold that line; without
// them "a missing Apply line is refused" would re-grade the whole corpus retroactively.
//
// MEASURED PRE-BUILD, so this file is a change-grader and not a world-grader: (B)'s refusing
// fixture exits 0 against `scripts/verifier.js` at tree 6ca0be1 (the pre-build tree carries no
// `kickoffApplyFinding` at all) and exits 1 here.
//
// NO CREDENTIALS, no network, no Supabase, no model call, no writes: pure helpers, temp files under
// os.tmpdir(), one read of a committed kickoff and one read of the committed register.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  APPLY_CLAUSE, APPLY_LINE_FROM, APPLY_LINE, kickoffApplyFinding, kickoffStampVersion,
} from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFIER = path.join(ROOT, "scripts/verifier.js");
const SHIPPED_REL = "docs/kickoffs/v7.0.1017-AGT-570-own-row-exemption.md";
const REGISTER_REL = "docs/runbooks/environment-facts.md";
const REGISTER_PREFIX = "- 2026-11-18 | AGT-673 | ";

// The fixture kickoff: a real stamp, a real Lanes: line, TWO tasks whose risk block covers both
// (so the risk clause greens and execution actually reaches the apply clause), NO anchors block (so
// the anchors clause stays NOT GRADED), and T2's text carries the literal `apply_migration` -- the
// trigger, and the only trigger.
const LANES = "- **Lanes:** session `orchestrator`; executor none.";
const TASKS = "\n**T1 -- a.** one\n**T2 -- b.** apply_migration x\n";
const TASKS_NO_APPLY = "\n**T1 -- a.** one\n**T2 -- b.** x\n";
const RISK = "\n```risk\nT1 | a | 1 row | git revert\nT2 | b | 1 clause | git revert\n```\n";

const stamp = v => `<!-- DeepBench v${v} | kickoff | FIXTURE -->\n`;
const F = v => stamp(v) + LANES + TASKS + RISK;

// == (A) the worked cases, pure ==================================================================
function theHelperGradesTheApplyDeclarationAndOnlyFromTheBoundary() {
  // 1. THE DEFECT ITSELF: graded stamp, `apply_migration` named, no Apply line -> REFUSED.
  let out = {};
  let r = kickoffApplyFinding(F("7.0.1057"), out);
  assert.ok(r, "a graded kickoff naming apply_migration with no Apply line is REFUSED -- an " +
    "undeclared apply is the whole defect: it is how a Builder holding no connector got sent one");
  assert.strictEqual(r.clause, APPLY_CLAUSE, "the refusal names its clause, so the cycle can route it");
  assert.strictEqual(APPLY_CLAUSE, "apply", "and that clause is `apply` -- the string the cycle switches on");
  assert.ok(r.reason.includes("apply_migration is named") && r.reason.includes(APPLY_LINE),
    `the refusal must name the trigger AND quote the line that fixes it -- "your kickoff is wrong" ` +
    `is not actionable. got: ${r.reason}`);
  assert.ok(r.reason.includes("never a Builder task"),
    `and it must say whose the apply is, which is the rule being enforced. got: ${r.reason}`);
  assert.strictEqual(r.remedy_owner, "designer",
    "the remedy is the Designer's re-assembly -- the caller never writes the Apply line itself, " +
    "which is the AGT-187 hole this clause must not reopen");

  // 2. the Apply line present, WITH TRAILING TEXT after it -> green, and the note says so.
  //    `startsWith`, not equality: a Designer who ends the line with a period or a citation has
  //    still declared it, and a clause matching the whole line exactly would refuse that.
  out = {};
  assert.strictEqual(kickoffApplyFinding(F("7.0.1057") + APPLY_LINE + ".\n", out), null,
    "the Apply line declared (here with a trailing `.`) is green -- the match is a line PREFIX");
  assert.strictEqual(out.note, "apply: declared (AGT-673).",
    `and the green SAYS what it graded (19v) -- a note is how the caller tells "declared" from ` +
    `"there was nothing to grade". got: ${out.note}`);

  // 3. THE DANGEROUS DIRECTION: an `**Apply:**` line that names the BUILDER -> still refused.
  //    A clause keying off `**Apply:**` alone would green the exact launch shape that was refused.
  out = {};
  r = kickoffApplyFinding(F("7.0.1057") + "**Apply:** Builder over REST\n", out);
  assert.ok(r && r.clause === APPLY_CLAUSE,
    `an Apply line naming the Builder over REST must be REFUSED -- that is verbatim the launch ` +
    `shape the safety check already refused, and greening it is the worst available failure. ` +
    `got: ${JSON.stringify(r)}`);
  assert.notStrictEqual(out.note, "apply: declared (AGT-673).",
    "and it must NOT be reported as declared");

  // 4. THE OTHER DANGEROUS DIRECTION: no `apply_migration` anywhere -> green, never refused.
  //    Nearly every kickoff applies no migration; refusing them would wedge runbook step 6.
  out = {};
  assert.strictEqual(kickoffApplyFinding(stamp("7.0.1057") + LANES + TASKS_NO_APPLY + RISK, out), null,
    "a kickoff that names no apply_migration is NOT this clause's business");
  assert.strictEqual(out.note, "apply: no apply_migration named (AGT-673).",
    `and the green must declare that it did not grade an apply. got: ${out.note}`);
  assert.ok(!TASKS_NO_APPLY.includes("apply_migration") && TASKS.includes("apply_migration"),
    "CONTROL: (1) and (4) are the same fixture but for the literal -- the trigger is that string " +
    "and nothing else (call D3)");

  // 5. THE BOUNDARY: the SAME refusing bytes stamped v7.0.1056 -> NOT GRADED, exit code untouched.
  //    (1) and (5) differ by one digit; this is what keeps the shipped corpus green.
  out = {};
  assert.strictEqual(kickoffApplyFinding(F("7.0.1056"), out), null,
    "below v7.0.1057 a missing Apply line is NOT GRADED -- every kickoff in the corpus predates " +
    "the rule and refusing them would turn step 6 red everywhere");
  assert.ok(out.note.startsWith("NOT GRADED (AGT-673)"),
    `and the green must SAY it did not grade. got: ${out.note}`);
  assert.ok(out.note.includes("v7.0.1056"),
    `naming the stamp it actually read, not a generic excuse. got: ${out.note}`);

  // 6. no stamp at all -> NOT GRADED, never refused: an unstamped file may not be a kickoff yet.
  out = {};
  assert.strictEqual(kickoffApplyFinding(LANES + TASKS + RISK, out), null, "an unstamped file is not graded");
  assert.ok(out.note.includes("absent"), `and the note says the stamp was absent. got: ${out.note}`);

  // The constants, so (A) cannot pass against a clause whose boundary or line text drifted.
  assert.deepStrictEqual(APPLY_LINE_FROM, [7, 0, 1057],
    "the boundary is the version AFTER this build (call D2) -- moving it would re-grade the corpus");
  assert.strictEqual(APPLY_LINE, "**Apply:** orchestrator over the Supabase connector; Builder none",
    "the declared line is the rule in one sentence; changing its text silently un-declares every " +
    "kickoff that already carries it");
  assert.deepStrictEqual(kickoffStampVersion(stamp("7.0.1057")), [7, 0, 1057], "the stamp parses as a triple");
  assert.strictEqual(kickoffStampVersion("no stamp here"), null, "and an absent stamp is null, not a zero");
}

// == (B) the spawned CLI, uncredentialed, on three temp fixtures ==================================
function theCliRefusesAndGreensOnTheRightSideOfTheStamp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt673-apply-"));
  const write = (name, text) => { const p = path.join(dir, name); fs.writeFileSync(p, text, "utf8"); return p; };
  // `--json` on purpose: `emit()` prints the PAYLOAD only with that flag, and the payload is what
  // the cycle routes on (`clause`, `apply_note`). Grading the prose alone would pass against a
  // clause that reached the right exit code with an empty payload.
  const run = p => {
    const env = { ...process.env };
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_KEY;
    const r = spawnSync(process.execPath, [VERIFIER, `--check-kickoff=${p}`, "--json"], { encoding: "utf8", env, cwd: ROOT });
    return { status: r.status, out: String(r.stdout || "") + String(r.stderr || "") };
  };

  try {
    const bare = run(write("bare.md", F("7.0.1057")));
    assert.strictEqual(bare.status, 1,
      `a graded kickoff naming apply_migration with no Apply line must exit 1 at the CLI -- the ` +
      `exit code is the only thing runbook step 6 reads. got ${bare.status}:\n${bare.out}`);
    assert.strictEqual(JSON.parse(bare.out.trim()).clause, APPLY_CLAUSE,
      `and the refusal payload must name clause "${APPLY_CLAUSE}":\n${bare.out}`);

    // THE DISCRIMINATOR, the pair the whole ship turns on: the SAME fixture plus one line.
    const declared = run(write("declared.md", F("7.0.1057") + APPLY_LINE + "\n"));
    assert.strictEqual(declared.status, 0,
      `the SAME fixture plus the Apply line must exit 0 -- a clause that refuses either way is not ` +
      `a gate, it is a wall. got ${declared.status}:\n${declared.out}`);
    assert.strictEqual(JSON.parse(declared.out.trim()).apply_note, "apply: declared (AGT-673).",
      `and that green must carry the apply_note in its payload, so the cycle can see WHICH clause ` +
      `passed rather than inferring it from a bare 0 (19v):\n${declared.out}`);

    // THE CONTROL THAT KEEPS THE CORPUS GREEN: the refusing bytes, restamped below the boundary.
    const old = run(write("old.md", F("7.0.1056")));
    assert.strictEqual(old.status, 0,
      `the SAME no-Apply fixture restamped v7.0.1056 must exit 0 -- every shipped kickoff predates ` +
      `the rule, and refusing them would wedge step 6 across the corpus. got ${old.status}:\n${old.out}`);
    const oldNote = JSON.parse(old.out.trim()).apply_note;
    assert.ok(oldNote.startsWith("NOT GRADED (AGT-673)"),
      `and that green must declare what it did not grade (19v). got: ${oldNote}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// == (C) a shipped kickoff that really does name apply_migration =================================
function theShippedApplyKickoffIsUngradedUntilTheBoundary() {
  const p = path.join(ROOT, SHIPPED_REL);
  assert.ok(fs.existsSync(p), `${SHIPPED_REL} must be committed -- it is this clause's real-world case`);
  const text = fs.readFileSync(p, "utf8");
  assert.ok(text.includes("apply_migration"),
    `CONTROL: ${SHIPPED_REL} must actually name apply_migration (its T2 IS an apply) -- otherwise ` +
    `both arms below would pass through the "no apply named" escape and grade nothing`);
  assert.ok(!text.split("\n").some(l => l.startsWith(APPLY_LINE)),
    "CONTROL: and it must NOT already carry the Apply line -- it predates the rule, so the only " +
    "thing standing between it and a refusal is its stamp");

  let out = {};
  assert.strictEqual(kickoffApplyFinding(text, out), null,
    `${SHIPPED_REL} as shipped must pass: it predates v7.0.1057 (call D2), and this build leaves ` +
    `AGT-570's apply unsent and unapplied (call D4)`);
  assert.ok(out.note.startsWith("NOT GRADED (AGT-673)"), `saying so. got: ${out.note}`);

  // The same bytes, in memory, with only the stamp moved. Nothing is written back.
  const restamped = text.replace("DeepBench v7.0.1017", "DeepBench v7.0.1057");
  assert.notStrictEqual(restamped, text, "CONTROL: the restamp must have actually changed the bytes");
  assert.deepStrictEqual(kickoffStampVersion(restamped), [7, 0, 1057], "and moved the stamp to the boundary");
  out = {};
  const r = kickoffApplyFinding(restamped, out);
  assert.ok(r && r.clause === APPLY_CLAUSE,
    `restamped to v7.0.1057 the SAME shipped kickoff must be REFUSED -- a real kickoff that hands ` +
    `an apply to a Builder is exactly what this clause exists to catch, and one byte of stamp is ` +
    `the only difference between the two arms. got: ${JSON.stringify(r)}`);
}

// == (D) the register line, so the rule and the fact are one sentence ============================
function theRegisterCarriesTheRuleOnce() {
  const text = fs.readFileSync(path.join(ROOT, REGISTER_REL), "utf8");
  const lines = text.split("\n").filter(l => l.startsWith(REGISTER_PREFIX));
  assert.strictEqual(lines.length, 1,
    `${REGISTER_REL} must carry EXACTLY ONE line starting "${REGISTER_PREFIX}" -- the register is ` +
    `append-only and goes into every Designer prompt, so a second copy is a second rule. got ${lines.length}`);
  assert.ok(lines[0].includes(APPLY_LINE),
    `and that fact must quote the imported APPLY_LINE verbatim, so the sentence the Designer reads ` +
    `and the string the verifier matches cannot drift apart (pattern:93). got: ${lines[0]}`);
  assert.ok(lines[0].includes("apply_migration") && lines[0].includes("never the Builder"),
    `naming the trigger and the owner. got: ${lines[0]}`);
}

export default async function run() {
  theHelperGradesTheApplyDeclarationAndOnlyFromTheBoundary();  // (A)
  theCliRefusesAndGreensOnTheRightSideOfTheStamp();             // (B)
  theShippedApplyKickoffIsUngradedUntilTheBoundary();           // (C)
  theRegisterCarriesTheRuleOnce();                              // (D)

  console.log("  [AGT-673] a kickoff naming `apply_migration` must carry `" + APPLY_LINE + "`: " +
    "from v7.0.1057 a bare one refuses with clause `apply`, the same bytes plus that line exit 0 " +
    "with `apply: declared (AGT-673).`, an `**Apply:** Builder over REST` line still refuses, a " +
    "kickoff naming no apply_migration is untouched, and the SAME bytes stamped v7.0.1056 -- and " +
    "the shipped AGT-570 apply kickoff as committed -- stay NOT GRADED; asserted through the " +
    "spawned uncredentialed CLI as well as the pure helper, over a real shipped kickoff restamped " +
    "in memory, and against the one register line the Designer reads.");
}

selfRun(import.meta.url, run);
