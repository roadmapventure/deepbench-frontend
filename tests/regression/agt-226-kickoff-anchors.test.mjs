// DeepBench v7.0.782 | tests/regression/agt-226-kickoff-anchors.test.mjs | AGT-304 slice 5 -- the anchors of a kickoff are graded at the tree it shipped on, and a commit this checkout cannot reach is NOT RUN.
// DeepBench v7.0.670 | tests/regression/agt-226-kickoff-anchors.test.mjs | AGT-226 -- a kickoff
// DECLARES the exact literals its build will act on, and `--check-kickoff` RESOLVES them against
// the tree the build is about to start from.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (A) THE FAILURE THAT HAPPENED, REPLAYED AT THE COMMIT IT HAPPENED ON. `v7.0.594-AGT-147`'s
// section 4 named three parentheticals in `docs/runbooks/runner-cycle.md`. Resolved at `fe2a3479` --
// the tree that build actually started from -- as an anchors block declaring one file each, the
// clause REFUSES on the first. This arm is the whole ticket: a guard written only against a kickoff
// whose anchors all resolve would stay green against a clause that returns null for everything.
//
//     A MEASURED CORRECTION TO THE KICKOFF'S OWN NARRATION, recorded here rather than quietly
//     adjusted. `v7.0.670-AGT-226` section 6 arm (A) predicts "the `step 6's` one returns nothing,
//     the other two 1 file each". Re-measured at `fe2a3479` with the resolver this ticket actually
//     ships -- repo-wide, `docs/kickoffs/` and `docs/harvests/` excluded -- the counts are: the
//     `step 6's` literal is in ONE file, `docs/runbooks/researcher-routine.md`, which is NOT the
//     file AGT-147 declared; the second is in exactly the one file it declared; the third is in TWO
//     (`docs/backlog/BACKLOG-SNAPSHOT.md` as well as the runbook). The kickoff's narration counted
//     hits inside runner-cycle.md alone; the resolver counts the repository, because a literal the
//     Builder is told to edit in one file and which also lives in three others is exactly the
//     AGT-169 defect (a build that touched 5 files against a kickoff naming 2). The VERDICT the
//     kickoff predicts is unchanged and is what this arm asserts: refuse at `fe2a3479`, naming the
//     first anchor; refuse on all three at HEAD. Only the intermediate counts moved, and they are
//     asserted at their measured values so the arm cannot drift back to the narration.
//
// (B) THE NEGATIVE CONTROL IS THIS FILE'S OWN KICKOFF, READ FROM DISK RATHER THAN RETYPED. Its
// three anchors must resolve at 1, 1 and 3 files -- and the three literals are deliberately NOT
// copied into this test, because copying one would add a tracked file holding it and move the very
// count under test. The mutation arm then declares 2 where the tree holds 3 and demands a refusal
// naming all three files: AGT-169's defect, caught by the count alone.
//
// (C) FAIL-OPEN, IN THREE DIRECTIONS, because this clause runs at runbook step 6 ahead of the
// credential check and a clause that refuses what it cannot grade wedges every cycle (AGT-189's
// direction). No block, a resolver that throws, and a resolver that cannot answer are each NOT
// GRADED with a note -- never a refusal, never a changed exit code.
//
//     A SECOND MEASURED CORRECTION. The kickoff's arm (C) names
//     `docs/kickoffs/v7.0.448-SES-368-weekly-pace-gate.md` as the "no block, exits 0" case. That
//     file cannot reach this clause: it is the file SES-359 exists over, it carries no `Lanes:`
//     line, and `--check-kickoff` refuses it at exit 1 two clauses earlier. Asserted here in both
//     halves -- SES-368 exits 1 with NO `clause` field (the lane clause, not this one), and
//     `v7.0.459-SES-376` (within cap, lane declared, no anchors block) is the file that actually
//     demonstrates the fail-open green.
//
// (D) THE SEAM, RUN AS A PROCESS WITH NO CREDENTIALS IN ITS ENV, same shape and same reason as
// SES-359's clause (C) and AGT-189's: the branch sits ahead of verifier.js's credential check, and
// the only proof of that placement is a 1 and a 0 out of a child whose env has neither key. A 2
// would mean nothing was ever measured. `kind` and `clause` are read from `--json`, never the prose.
//
// (E) THE EXCLUSIONS ARE LOAD-BEARING, PROVEN BY REMOVING THEM. Runbook step 6 commits the kickoff
// BEFORE the build runs, so the kickoff itself holds every literal it declares. This arm resolves
// each anchor twice -- with the excludes and without -- and asserts the extra files are all under
// `docs/kickoffs/` or `docs/harvests/` and include this kickoff. Without the excludes all three
// anchors of this very kickoff would refuse, which is the off-by-one the excludes exist for.
//
// (F) ONE WORDING, TWO HOMES, ASSERTED AS BYTES, and the checklist line beside it. Comparing each
// home against the pinned constant AND against the other means an edit to one home cannot be made
// green by editing the constant to match it -- SES-359's rule, applied to SES-359's own two homes.
//
// READ-ONLY. No write of any kind inside the repository, no model call, no board read, and nothing
// here needs credentials. The one file written is a throwaway kickoff fixture in the OS temp
// directory, created and removed inside arm (D).

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { ANCHOR_CLAUSE, anchorBlockLines, kickoffAnchorFinding } from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const OWN_KICKOFF = "docs/kickoffs/v7.0.670-AGT-226-kickoff-anchors-resolve.md";
const NO_BLOCK_KICKOFF = "docs/kickoffs/v7.0.459-SES-376-kickoff-size-cap.md";
const NO_LANES_KICKOFF = "docs/kickoffs/v7.0.448-SES-368-weekly-pace-gate.md";

// The commit AGT-147's build started from. Fixed forever, which is why arm (A) can assert exact
// file lists: the tree at a merged commit does not move under a later session.
const AGT_147_PARENT = "fe2a3479";
const AGT_147_FILE = "docs/runbooks/runner-cycle.md";

// The v7.0.670 build commit -- the tree THIS ticket's own kickoff shipped on, which is where its
// anchor counts are true. Grading them at HEAD measures later sessions' edits, not this ship.
const AGT_226_SHIP = "837a8a5a";
const SHALLOW = rev => `commit ${rev} is unreachable in this checkout (a shallow clone; CI clones at depth 1, SES-393)`;

// AGT-147's three section-4 literals, each declared (as that kickoff declared them) as one file of
// runner-cycle.md. Their presence in THIS file is deliberate and harmless: arm (A) resolves them at
// a commit that predates this file, and its HEAD half asserts only that all three refuse.
const AGT_147_ANCHORS = [
  "(`claude-fable-5-1` — step 6's",
  "(`claude-fable-5-1` — the",
  "(`claude-opus-5` — the",
];

// THE WORDING, pinned here as bytes. Its two homes must both contain exactly this.
const ANCHOR_WORDING =
  "Anchor declaration (`AGT-226`): the kickoff carries one fenced `anchors` block, one line per " +
  "fact the build acts on — `<path> | <count of tracked files holding it> | <the exact literal>`, " +
  "split on the first two pipes, counted by `git grep -F -l` excluding `docs/kickoffs/` and " +
  "`docs/harvests/`. `--check-kickoff` refuses an anchor not in the tree, or in a different number " +
  "of files than declared.";
const WORDING_HOMES = ["CLAUDE-DESIGN.md", "docs/STANDARDS.md"];
const CHECKLIST_LINE = "- [ ] Anchors declared and resolving (AGT-226)";

const EXCLUDES = ["--", ".", ":(exclude)docs/kickoffs", ":(exclude)docs/harvests"];

// The resolver the CLI ships, reproduced once here so the suite can point it at an arbitrary
// commit. At a rev `git grep -l` prefixes every path with `<rev>:`, which must come off or every
// path comparison silently fails.
function gitResolve(rev = null, { excludes = true } = {}) {
  return (literal) => {
    const args = ["-C", ROOT, "grep", "-F", "-l", "-e", literal];
    if (rev) args.push(rev);
    args.push(...(excludes ? EXCLUDES : ["--", "."]));
    const g = spawnSync("git", args, { encoding: "utf8" });
    if (g.error) return null;
    const strip = p => (rev && p.startsWith(`${rev}:`) ? p.slice(rev.length + 1) : p);
    if (g.status === 0) {
      return { files: String(g.stdout || "").split("\n").map(s => s.trim()).filter(Boolean).map(strip) };
    }
    if (g.status === 1) return { files: [] };
    return null;
  };
}

// AGT-304 slice 5: a commit this checkout cannot see is UNKNOWN, never a failure. CI clones at
// depth 1 (SES-393), so the two fixed commits below are absent there and the arms that need them
// declare themselves NOT RUN rather than crashing on a null resolver.
const reachable = rev => spawnSync("git", ["-C", ROOT, "cat-file", "-e", `${rev}^{commit}`]).status === 0;

function anchorsDoc(lines) {
  return `# fixture\n\n\`\`\`${ANCHOR_CLAUSE}\n${lines.join("\n")}\n\`\`\`\n`;
}

function envWithoutCredentials(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}

function runVerifier(kickoffPath, { json = true, env = envWithoutCredentials() } = {}) {
  const args = ["scripts/verifier.js", `--check-kickoff=${kickoffPath}`];
  if (json) args.push("--json");
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", env });
  return { status: r.status, output: `${r.stdout || ""}${r.stderr || ""}` };
}

export default async function run() {
  // == (A) the failure that happened, replayed at fe2a3479 =======================================
  if (!reachable(AGT_147_PARENT)) {
    notRun("arm (A) at the commit AGT-147's build started from",
      SHALLOW(AGT_147_PARENT) + "; the HEAD half below still ran");
  } else {
  const at147 = gitResolve(AGT_147_PARENT);

  // Every anchor measured on its own first, so the arm states each literal's real fate rather than
  // only the first refusal the block happens to hit.
  const measured = AGT_147_ANCHORS.map(literal => ({
    literal,
    files: at147(literal).files,
    finding: kickoffAnchorFinding(anchorsDoc([`${AGT_147_FILE} | 1 | ${literal}`]), at147),
  }));

  assert.deepStrictEqual(measured[0].files, ["docs/runbooks/researcher-routine.md"],
    `at ${AGT_147_PARENT} AGT-147's first section-4 literal must resolve to exactly ` +
    `docs/runbooks/researcher-routine.md -- one file, and NOT the ${AGT_147_FILE} the kickoff ` +
    `named. got: ${JSON.stringify(measured[0].files)}`);
  assert.ok(measured[0].finding,
    "the first anchor must REFUSE: the count it declared happens to match, but the file it named " +
    "is not among the files holding the literal -- which is the fact the Builder was handed");
  assert.ok(measured[0].finding.reason.includes(AGT_147_FILE)
    && measured[0].finding.reason.includes("docs/runbooks/researcher-routine.md"),
    `the reason must name both the declared path and every file actually found (AGT-226). got: ` +
    `${measured[0].finding.reason}`);

  assert.deepStrictEqual(measured[1].files, [AGT_147_FILE],
    `at ${AGT_147_PARENT} the second literal must be in exactly the one file AGT-147 declared -- ` +
    `this is the anchor that was STILL TRUE, and an arm where every anchor fails proves nothing ` +
    `about the check. got: ${JSON.stringify(measured[1].files)}`);
  assert.strictEqual(measured[1].finding, null,
    "an anchor that resolves exactly as declared must produce NO finding -- if this refuses, the " +
    "clause is refusing on something other than the tree");

  assert.deepStrictEqual(measured[2].files.slice().sort(),
    ["docs/backlog/BACKLOG-SNAPSHOT.md", AGT_147_FILE].sort(),
    `at ${AGT_147_PARENT} the third literal must resolve to TWO files, not the one AGT-147 ` +
    `declared. got: ${JSON.stringify(measured[2].files)}`);
  assert.ok(measured[2].finding && /2 tracked file\(s\), not the 1/.test(measured[2].finding.reason),
    `the third anchor must refuse on the COUNT and say both numbers. got: ` +
    `${measured[2].finding && measured[2].finding.reason}`);

  // The block as AGT-147 would have declared it: the clause refuses, and it refuses on the FIRST.
  const out147 = {};
  const block147 = kickoffAnchorFinding(
    anchorsDoc(AGT_147_ANCHORS.map(l => `${AGT_147_FILE} | 1 | ${l}`)), at147, out147);
  assert.ok(block147, "AGT-147's three anchors as one block must REFUSE at the tree its build started from");
  assert.strictEqual(block147.clause, ANCHOR_CLAUSE);
  assert.strictEqual(block147.kind, "kickoff-no-lanes");
  assert.ok(block147.reason.includes("AGT-226"), "the reason names the ticket that owns the clause");
  assert.ok(block147.reason.includes(AGT_147_ANCHORS[0]),
    `the refusal must name the FIRST failing anchor line, which is the one the Designer re-measures. ` +
    `got: ${block147.reason}`);
  assert.strictEqual(out147.graded, 1,
    `the note must say how many anchors were graded before the refusal (1 of 3 here). got ${out147.graded}`);
  }

  // At HEAD all three are gone from the file AGT-147 named, so all three refuse. Only the verdict
  // is asserted: this test file itself now holds these literals, so the counts at HEAD move with it.
  const atHead = gitResolve(null);
  for (const literal of AGT_147_ANCHORS) {
    const finding = kickoffAnchorFinding(anchorsDoc([`${AGT_147_FILE} | 1 | ${literal}`]), atHead);
    assert.ok(finding && finding.clause === ANCHOR_CLAUSE,
      `at HEAD, \`${literal}\` is no longer in ${AGT_147_FILE} and the anchor must refuse -- ` +
      `AGT-147 removed all three deliberately`);
  }

  // == (B) the negative control: this kickoff's own anchors, read from disk ======================
  const ownText = fs.readFileSync(path.join(ROOT, OWN_KICKOFF), "utf8");
  const own = anchorBlockLines(ownText);
  assert.strictEqual(own.length, 3,
    `${OWN_KICKOFF} must carry a three-line anchors block -- if this is 0 the parser found no ` +
    `fenced \`${ANCHOR_CLAUSE}\` block and every arm below is measuring nothing. got ${own.length}`);
  assert.deepStrictEqual(own.map(a => a.declared), [1, 1, 3],
    `${OWN_KICKOFF} declares 1, 1 and 3 files. got ${JSON.stringify(own.map(a => a.declared))}`);
  assert.deepStrictEqual(own.map(a => a.path),
    ["scripts/verifier.js", "docs/STANDARDS.md", "CLAUDE-DESIGN.md"],
    `${OWN_KICKOFF}'s anchors name verifier.js, STANDARDS.md and CLAUDE-DESIGN.md in that order`);

  const atShip = reachable(AGT_226_SHIP) ? gitResolve(AGT_226_SHIP) : null;
  if (!atShip) {
    notRun("arms (B) and (E) at the tree this ticket shipped on",
      SHALLOW(AGT_226_SHIP) + "; the parse, mutation-text, (C), (D) and (F) arms still ran");
  } else {
  const ownOut = {};
  assert.strictEqual(kickoffAnchorFinding(ownText, atShip, ownOut), null,
    "this ticket's own kickoff must resolve clean against the tree it shipped on -- the ticket " +
    "that makes kickoffs declare their anchors cannot be the ticket whose anchors do not resolve");
  assert.strictEqual(ownOut.graded, 3, `all three anchors graded. got ${ownOut.graded}`);
  assert.ok(/anchors graded \(AGT-226\)/.test(ownOut.note), `the green's note says so. got ${ownOut.note}`);

  const thirdFiles = atShip(own[2].literal).files.slice().sort();
  assert.deepStrictEqual(thirdFiles,
    ["CLAUDE-DESIGN.md", "docs/STANDARDS.md", "tests/regression/ses-359-lane-declaration.test.mjs"],
    `the SES-359 lane wording lives in exactly three tracked files. A fourth home is a real change: ` +
    `update ${OWN_KICKOFF}'s anchor count and this assertion together. got ${JSON.stringify(thirdFiles)}`);

  // AGT-169's defect, as a mutation: declare 2 where the tree holds 3.
  const mutated = ownText.replace(own[2].raw, own[2].raw.replace(/\|\s*3\s*\|/, "| 2 |"));
  assert.notStrictEqual(mutated, ownText, "the mutation must actually change the kickoff text");
  const mutFinding = kickoffAnchorFinding(mutated, atShip);
  assert.ok(mutFinding, "declaring 2 files where the tree holds 3 must REFUSE -- the count is the " +
    "half of an anchor that goes wrong silently, and AGT-169 shipped 5 files against a kickoff " +
    "naming 2 for exactly this reason");
  assert.strictEqual(mutFinding.clause, ANCHOR_CLAUSE);
  assert.ok(/3 tracked file\(s\), not the 2/.test(mutFinding.reason),
    `the refusal states both numbers. got: ${mutFinding.reason}`);
  for (const f of thirdFiles) {
    assert.ok(mutFinding.reason.includes(f),
      `the refusal must list EVERY file found, so the Designer can re-declare without re-running ` +
      `the grep. ${f} is missing from: ${mutFinding.reason}`);
  }
  }

  // == (C) fail-open, in three directions ========================================================
  const noBlockText = fs.readFileSync(path.join(ROOT, NO_BLOCK_KICKOFF), "utf8");
  assert.deepStrictEqual(anchorBlockLines(noBlockText), [],
    `${NO_BLOCK_KICKOFF} predates the anchors block and must parse to no anchors`);
  const noBlockOut = {};
  assert.strictEqual(kickoffAnchorFinding(noBlockText, atHead, noBlockOut), null,
    "a kickoff carrying no anchors block is NOT GRADED, never refused -- most of the corpus " +
    "predates the block, and refusing them all would wedge every cycle at runbook step 6");
  assert.strictEqual(noBlockOut.graded, 0);
  assert.ok(/NOT GRADED \(AGT-226\)/.test(noBlockOut.note),
    `the green must SAY it graded nothing (ARCHITECTURE.md 19v). got: ${noBlockOut.note}`);

  const throwOut = {};
  assert.strictEqual(kickoffAnchorFinding(ownText, () => { throw new Error("git exploded"); }, throwOut), null,
    "a resolver that throws is NOT GRADED, never a refusal");
  assert.strictEqual(throwOut.graded, 0);
  const nullOut = {};
  assert.strictEqual(kickoffAnchorFinding(ownText, () => null, nullOut), null,
    "a resolver that cannot answer (git exit 2, git absent) is NOT GRADED, never a refusal");
  assert.ok(/NOT GRADED/.test(nullOut.note) && nullOut.note.includes("scripts/verifier.js"),
    `the note must name the anchors it could not grade. got: ${nullOut.note}`);

  // Through the CLI, with git itself unreachable: still 0, never 2.
  const noGit = runVerifier(OWN_KICKOFF, { env: envWithoutCredentials({ PATH: path.join(ROOT, "no-such-bin") }) });
  assert.strictEqual(noGit.status, 0,
    `--check-kickoff with no git on PATH must still exit 0 -- "the runner has no git" is not a ` +
    `judgement about the kickoff. got ${noGit.status}: ${noGit.output.trim()}`);
  const noGitPayload = JSON.parse(noGit.output.trim());
  assert.strictEqual(noGitPayload.anchors_graded, 0,
    `and it must say it graded nothing. got: ${noGit.output.trim()}`);

  // The kickoff's arm (C) names SES-368; measured, that file never reaches this clause.
  const ses368 = runVerifier(NO_LANES_KICKOFF);
  assert.strictEqual(ses368.status, 1,
    `${NO_LANES_KICKOFF} carries no Lanes: line and is refused by SES-359's clause two clauses ` +
    `before this one -- recorded here because AGT-226's own QA arm (C) names it as a "no block, ` +
    `exits 0" case, which it cannot be. got ${ses368.status}`);
  const ses368Payload = JSON.parse(ses368.output.trim());
  assert.strictEqual(ses368Payload.clause, undefined,
    `and the refusal must be the LANE clause, which carries no \`clause\` field -- if this reads ` +
    `"${ANCHOR_CLAUSE}" the ordering changed and SES-359's own control moved. got: ${ses368.output.trim()}`);

  const fairGreen = runVerifier(NO_BLOCK_KICKOFF);
  assert.strictEqual(fairGreen.status, 0,
    `${NO_BLOCK_KICKOFF} -- within cap, lane declared, no anchors block -- is the file that ` +
    `actually demonstrates the fail-open green. got ${fairGreen.status}: ${fairGreen.output.trim()}`);
  assert.ok(/NOT GRADED \(AGT-226\)/.test(JSON.parse(fairGreen.output.trim()).anchors_note),
    "and its green carries the not-graded note");

  // == (D) the seam: the branch runs ahead of the credential check ===============================
  const greenCount = atHead(CHECKLIST_LINE).files.length;
  assert.ok(greenCount >= 1,
    `the seam's green fixture is measured at HEAD, so the checklist line must live in at least one ` +
    `tracked file. got ${greenCount}`);

  // A fixture whose literal is assembled at runtime, so this source file cannot hold it and the
  // grep is guaranteed to find nothing -- the `files.length === 0` branch, end to end.
  const absent = ["AGT", "226", "no", "such", "literal", "in", "the", "tree"].join("-");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agt226-"));
  const fixture = path.join(tmpDir, "fixture-kickoff.md");
  let fixtureRun;
  let ownRun;
  try {
    fs.writeFileSync(fixture,
      `# fixture\n\n- **Lanes:** \`session\` | \`executor\` none ($0) | \`none\`.\n\n` +
      `\`\`\`${ANCHOR_CLAUSE}\nscripts/verifier.js | 1 | ${absent}\n\`\`\`\n`);
    fixtureRun = runVerifier(fixture);

    // The green half of the same seam, on a fixture whose ONE anchor count is measured at HEAD --
    // never on this ticket's own kickoff, whose counts are true at the tree it shipped on (AGT-304
    // slice 5). Same Lanes line, so the only thing under test is the anchors branch.
    fs.writeFileSync(fixture,
      `# fixture\n\n- **Lanes:** \`session\` | \`executor\` none ($0) | \`none\`.\n\n` +
      `\`\`\`${ANCHOR_CLAUSE}\ndocs/STANDARDS.md | ${greenCount} | ${CHECKLIST_LINE}\n\`\`\`\n`);
    ownRun = runVerifier(fixture);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  assert.strictEqual(fixtureRun.status, 1,
    `an anchor whose literal is in NO tracked file must exit 1 -- a 0 here is the ungraded green ` +
    `this ticket exists to end, a 2 is the wedge it must never cause. got ${fixtureRun.status}: ` +
    `${fixtureRun.output.trim()}`);
  const fixturePayload = JSON.parse(fixtureRun.output.trim());
  assert.strictEqual(fixturePayload.kind, "kickoff-no-lanes",
    `the kind is reused deliberately: step 6's existing two-cause branch already records it. got: ` +
    `${fixtureRun.output.trim()}`);
  assert.strictEqual(fixturePayload.clause, ANCHOR_CLAUSE,
    `and the CLAUSE is what tells this refusal apart from AGT-189's on the same kind -- read from ` +
    `--json, never the prose. got: ${fixtureRun.output.trim()}`);
  assert.strictEqual(fixturePayload.remedy_owner, "designer");
  assert.ok(fixturePayload.remedy.includes('"no_lanes":true')
    && fixturePayload.remedy.includes("never edits the anchors block"),
    `the remedy names the ONE command and whose job it is. got: ${fixturePayload.remedy}`);
  assert.ok(fixturePayload.reason.includes("AGT-226") && fixturePayload.reason.includes(absent),
    `the reason names the ticket and the anchor line. got: ${fixturePayload.reason}`);

  assert.strictEqual(ownRun.status, 0,
    `--check-kickoff on a one-anchor fixture must exit 0 with NO credentials in the child env. A 2 ` +
    `means the credential check ran first and nothing was measured. got ${ownRun.status}: ${ownRun.output.trim()}`);
  const ownPayload = JSON.parse(ownRun.output.trim());
  assert.strictEqual(ownPayload.anchors_graded, 1,
    `the seam must grade the anchor without credentials -- this clause needs git, never the ` +
    `board. got: ${ownRun.output.trim()}`);
  assert.strictEqual(ownPayload.anchors_declared, 1);

  // == (E) the exclusions are load-bearing =======================================================
  const tracked = spawnSync("git", ["-C", ROOT, "ls-files", "--error-unmatch", OWN_KICKOFF],
    { encoding: "utf8" });
  assert.strictEqual(tracked.status, 0,
    `${OWN_KICKOFF} must be COMMITTED for this arm to mean anything -- runbook step 6 commits the ` +
    `kickoff before the build runs, which is the whole reason the excludes exist`);

  let extrasSeen = 0;
  if (atShip) {
  const bare = gitResolve(AGT_226_SHIP, { excludes: false });
  for (const a of own) {
    const withExcludes = atShip(a.literal).files.slice().sort();
    const without = bare(a.literal).files.slice().sort();
    assert.deepStrictEqual(withExcludes.length, a.declared,
      `anchor \`${a.path}\` must resolve to its declared ${a.declared} file(s) WITH the excludes -- ` +
      `this is arm (B) re-run with the kickoff committed, and the count must not have moved. ` +
      `got ${JSON.stringify(withExcludes)}`);
    const extras = without.filter(f => !withExcludes.includes(f));
    extrasSeen += extras.length;
    assert.ok(extras.includes(OWN_KICKOFF),
      `without the excludes, anchor \`${a.path}\` must also hit ${OWN_KICKOFF} itself -- if it ` +
      `does not, this arm is not measuring the off-by-one it claims to. got ${JSON.stringify(extras)}`);
    for (const f of extras) {
      assert.ok(f.startsWith("docs/kickoffs/") || f.startsWith("docs/harvests/"),
        `every file the excludes remove must be a kickoff or a harvest -- ${f} is neither, so the ` +
        `pathspec is hiding a real home of the literal`);
    }
    assert.notStrictEqual(without.length, a.declared,
      `and without the excludes anchor \`${a.path}\` must NOT match its declared count -- if it ` +
      `did, the excludes would be decoration rather than the thing that makes the count true`);
  }
  assert.ok(extrasSeen >= own.length,
    `the excludes must remove at least one file per anchor. got ${extrasSeen} across ${own.length}`);
  }

  // == (F) one wording, two homes, asserted as bytes =============================================
  const seen = [];
  for (const home of WORDING_HOMES) {
    const text = fs.readFileSync(path.join(ROOT, home), "utf8");
    const at = text.indexOf(ANCHOR_WORDING);
    assert.notEqual(at, -1,
      `${home} must carry the anchor wording BYTE-IDENTICALLY. Two homes stating one rule in two ` +
      `slightly different ways is the drift this assertion exists to stop -- if you edited the ` +
      `rule, edit both homes and this constant together`);
    seen.push(text.slice(at, at + ANCHOR_WORDING.length));
  }
  assert.strictEqual(seen[0], seen[1],
    "the two homes must match EACH OTHER, not merely the constant -- otherwise editing the " +
    "constant to match one home would make a drifted other home green");

  const standards = fs.readFileSync(path.join(ROOT, "docs/STANDARDS.md"), "utf8");
  assert.ok(standards.includes(CHECKLIST_LINE),
    `docs/STANDARDS.md's kickoff compliance check must carry \`${CHECKLIST_LINE}\` -- a rule ` +
    `stated in prose and absent from the checklist beside it is a rule nobody runs`);

  console.log(`[AGT-226] kickoff anchors: AGT-147's 3 section-4 literals at ${AGT_147_PARENT} ` +
    `resolve to 1 (wrong file) / 1 (as declared) / 2 (not 1) and the block REFUSES on the first, ` +
    `all 3 refuse at HEAD; this ticket's own kickoff grades 3 of 3 (1/1/3 files) and declaring 2 ` +
    `where the tree holds 3 refuses listing all three; no block / a throwing resolver / no git on ` +
    `PATH are NOT GRADED at exit 0 (SES-368 exits 1 on the LANE clause, not this one); the seam ` +
    `exits 0 and 1 with no credentials, kind kickoff-no-lanes + clause ${ANCHOR_CLAUSE} from ` +
    `--json; the excludes remove ${extrasSeen} kickoff/harvest hit(s) and without them no anchor ` +
    `matches its count; one wording byte-identical across ${WORDING_HOMES.join(" and ")} plus the ` +
    `checklist line`);
}

selfRun(import.meta.url, run);
