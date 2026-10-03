// DeepBench v7.0.668 | tests/regression/agt-245-regrade-cohort.test.mjs | AGT-245 slice 1 of 3
//
// FEATURE: THE RE-GRADE COHORT IS FROZEN, AND EACH SHIP'S BEFORE/AFTER PAIR COMES FROM COMMIT
// SUBJECTS -- NEVER FROM `runner_verdicts.graded_sha`. Since SES-336 the Builder pushes before the
// verifier runs, so `graded_sha` is dev HEAD at grade time: `AGT-199`'s latest verdict (v7.0.656)
// records `351e2aff`, whose subject is `v7.0.653 AGT-186 ...`. Slice 2 re-runs the regression suite
// on these trees, so a pair read off `graded_sha` would re-grade a peer's work and write the answer
// against this ticket. That is the defect this guard pins.
//
// EVERY CLAUSE CARRIES ITS OWN NEGATIVE CONTROL, because almost every assertion here could pass
// vacuously. "The resolver returned no pair" satisfies any test that only checks pairs it produced,
// and "the JSON has 71 rows" satisfies any file with 71 rows in it.
//
// (a) THE PAIR, AND THE SAME LOG WITH ONE PEER COMMIT INSERTED. A synthetic newest-first log gives
//     the exact `{ship, base}`; re-run with one peer commit spliced INSIDE the range, the same input
//     must move that sha to `intruders` and the row must refuse. The clean run is the control:
//     without it, a resolver that called everything interleaved would pass the refusal clause.
//
// (b) CONTAINS IS NOT BEGINS WITH. A close-out subject that mentions `v7.0.100` mid-line is a peer's
//     commit talking about this ship. A resolver using `includes` for the version passes (a) and
//     fails here, which is why the clause is separate.
//
// (c) A NULL `version` REFUSES BY NAME AND CARRIES NO PAIR. The failure mode being excluded is a
//     fallback to `graded_sha` when the subject rule has nothing to work with -- which would hand
//     slice 2 a peer's tree wearing this ticket's id.
//
// (d) THE SHIPPED FILE, BY COUNT AND BY NAME. 71 rows / 56 resolved / 15 refused, and the 14
//     interleaved ids of the kickoff's §2 named individually -- a count alone would survive any
//     14 refusals swapping for any other 14.
//
// (e) EVERY RESOLVED PAIR IS REAL GIT. Both shas must be commits in this clone and `base` must be an
//     ancestor of `ship`; a sha this clone cannot reach is NOT RUN, because a shallow checkout is
//     missing evidence rather than a failure.
//
// (f) THE TWO ROWS THAT PROVE THE TWO INDEPENDENT AXES. `AGT-202` refuses `no-version` (the refusal
//     axis), and `SES-388` RESOLVES while carrying `graded_sha_in_history: false` (the pair axis):
//     its recorded `graded_sha` is not even in this clone's history and the subject rule still
//     produced its tree. A resolver reading `graded_sha` could not have produced SES-388's pair at
//     all.
//
// (g) THE KICKOFF'S OWN §6 DISCREPANCY, PINNED RATHER THAN QUIETLY PICKED. §6 asks `--list` to print
//     `AGT-199 base 6c52b474 … ship 058312ad` AND `56 resolved, 15 refused` in the same sentence,
//     while §2's rule and §2's own 14-id interleaved list put `AGT-199` among the refusals. Both
//     cannot hold: resolving AGT-199 gives 57/14. Measured in this clone, AGT-199's v7.0.656 own
//     commits are `6c52b474`, `058312ad` and `3c75fdbc`, with AGT-186's `b139dc9b` and `351e2aff`
//     sitting BETWEEN the last two -- so `6c52b474^..058312ad` is clean only because it stops one
//     own commit short of the ship. §2's rule is implemented; this clause asserts the refusal AND
//     re-derives both git ranges, so the discrepancy is permanent evidence rather than a choice
//     somebody made once and nobody can see.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { ownCommitRange, cohortRow, isOwnSubject, parseLog, COHORT_PATH } from "../../scripts/regrade-cohort.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const COHORT_ABS = path.join(REPO, COHORT_PATH);

// The kickoff's §2 list, by name. Order is the kickoff's; the assertion compares as sets.
const INTERLEAVED = [
  "SES-390", "SES-398", "AGT-103", "AGT-172", "AGT-176", "AGT-187", "AGT-207",
  "AGT-177", "AGT-175", "AGT-185", "AGT-181", "AGT-199", "AGT-128", "AGT-116",
];

const AGT199 = {
  version: "v7.0.656",
  kickoffCommit: "6c52b4746ff83a0dcbcd2fbb8d85fe6663895ddd",   // §6's "base"
  middleCommit: "058312ad4d528c85c940b177bcd5ceb3273ebe2f",    // §6's "ship"
  closeOutCommit: "3c75fdbc619530da717f5328933599fae8ddb65a",  // the own commit §6's pair stops short of
  gradedSha: "351e2affadfd951970ea82ae68703b5c974281fb",       // AGT-186's commit, recorded on AGT-199's verdict
  peer: "b139dc9b7abce913380ea9c201bf98ccb14b7eba",
};

function git(args) {
  const r = spawnSync("git", ["-C", REPO, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

function isCommit(sha) {
  return sha ? git(["cat-file", "-e", `${sha}^{commit}`]).status === 0 : false;
}

function run() {
  // ---- (a) the pair, and the peer spliced inside the range ------------------------------------
  const clean = [
    { sha: "s9", parent: "s8", subject: "v7.0.900 AGT-999 close-out — re-render" },
    { sha: "s8", parent: "s7", subject: "v7.0.900 AGT-999 — the change itself" },
    { sha: "s7", parent: "s6", subject: "v7.0.900 AGT-999 — kickoff: the change" },
    { sha: "s6", parent: "s5", subject: "v7.0.899 AGT-998 — a peer, BEFORE the range" },
  ];
  const cleanRange = ownCommitRange({ log: clean, version: "v7.0.900", backlogId: "AGT-999" });
  assert.strictEqual(cleanRange.ship, "s9", "ship is the NEWEST own commit");
  assert.strictEqual(cleanRange.base, "s6", "base is the PARENT of the oldest own commit — the tree the ship sat on");
  assert.deepStrictEqual(cleanRange.own, ["s9", "s8", "s7"], "own is every subject-matching commit, newest first");
  assert.deepStrictEqual(cleanRange.intruders, [], "CONTROL: the clean log must have no intruders, or (a)'s dirty arm proves nothing");
  const cleanRow = cohortRow({ verdict: { backlog_id: "AGT-999", version: "v7.0.900", graded_sha: "s9", id: "v1" }, range: cleanRange });
  assert.strictEqual(cleanRow.status, "resolved", "CONTROL: the clean range must resolve");
  assert.strictEqual(cleanRow.base_sha, "s6");
  assert.strictEqual(cleanRow.ship_sha, "s9");

  const dirty = [clean[0], { sha: "p1", parent: "s8", subject: "v7.0.901 AGT-998 — a peer, INSIDE the range" }, ...clean.slice(1)];
  const dirtyRange = ownCommitRange({ log: dirty, version: "v7.0.900", backlogId: "AGT-999" });
  assert.deepStrictEqual(dirtyRange.own, ["s9", "s8", "s7"], "the same three own commits — only a peer moved in");
  assert.deepStrictEqual(dirtyRange.intruders, ["p1"], "a peer commit inside base..ship is an intruder");
  const dirtyRow = cohortRow({ verdict: { backlog_id: "AGT-999", version: "v7.0.900", graded_sha: "s9", id: "v1" }, range: dirtyRange });
  assert.strictEqual(dirtyRow.status, "refused", "an interleaved range refuses");
  assert.ok(dirtyRow.reason.startsWith("interleaved: ") && dirtyRow.reason.includes("p1"),
    `the reason must name the intruding sha, got ${JSON.stringify(dirtyRow.reason)}`);
  assert.strictEqual(dirtyRow.base_sha, null, "a refused row publishes NO pair — an approximation beside `refused` reads as a measurement");
  assert.strictEqual(dirtyRow.ship_sha, null);

  // ---- (b) contains is not begins with --------------------------------------------------------
  const mentions = [{ sha: "m1", parent: "m0", subject: "v7.0.101 AGT-999 — close-out after v7.0.100 AGT-999 shipped" }];
  assert.strictEqual(isOwnSubject(mentions[0].subject, "v7.0.100", "AGT-999"), false,
    "a subject that CONTAINS the version mid-line is a peer's commit talking about this ship, not an own commit");
  assert.strictEqual(isOwnSubject(mentions[0].subject, "v7.0.101", "AGT-999"), true,
    "CONTROL: the same subject IS own under the version it begins with, so (b) is testing the prefix and not the string");
  assert.strictEqual(isOwnSubject("v7.0.100 AGT-17 — a shorter id", "v7.0.100", "AGT-170"), false,
    "the id needs its trailing space: AGT-17 must not satisfy AGT-170");
  assert.deepStrictEqual(ownCommitRange({ log: mentions, version: "v7.0.100", backlogId: "AGT-999" }),
    { ship: null, base: null, own: [], intruders: [] },
    "no own commit returns the empty shape — never a guess");

  // ---- (c) a null version refuses by name, and carries no pair ---------------------------------
  const nullVersionRange = ownCommitRange({ log: clean, version: null, backlogId: "AGT-999" });
  assert.deepStrictEqual(nullVersionRange, { ship: null, base: null, own: [], intruders: [] },
    "a null version cannot select own commits, and the resolver must not fall back to anything");
  const nullRow = cohortRow({
    verdict: { backlog_id: "AGT-999", version: null, graded_sha: "s9", id: "v1" },
    range: nullVersionRange,
  });
  assert.strictEqual(nullRow.status, "refused");
  assert.strictEqual(nullRow.reason, "no-version", "the refusal names its class");
  assert.strictEqual(nullRow.base_sha, null, "a null-version row must NOT fall back to graded_sha as a pair");
  assert.strictEqual(nullRow.ship_sha, null);
  assert.strictEqual(nullRow.graded_sha, "s9", "graded_sha is still carried as evidence — it is just never the pair");
  assert.strictEqual(nullRow.graded_sha_in_history, null,
    "no history handed in means NOBODY LOOKED — `false` is reserved for a sha that was looked for and missing");

  // ---- the shipped file ------------------------------------------------------------------------
  assert.ok(fs.existsSync(COHORT_ABS), `${COHORT_PATH} must be committed — the cohort is the file, frozen once`);
  const doc = JSON.parse(fs.readFileSync(COHORT_ABS, "utf8"));
  for (const k of ["frozen_at", "frozen_by_cycle", "dev_head", "predicate", "rows"]) {
    assert.ok(doc[k] !== undefined && doc[k] !== null, `the frozen cohort must carry ${k}`);
  }
  const rows = doc.rows;
  const byId = new Map(rows.map(r => [r.backlog_id, r]));

  // ---- (d) counts, and the 14 interleaved ids by name ------------------------------------------
  assert.strictEqual(rows.length, 71, "the frozen cohort is 71 rows — the delivered tickets blocked by the regression gate alone");
  const resolved = rows.filter(r => r.status === "resolved");
  const refused = rows.filter(r => r.status === "refused");
  assert.strictEqual(resolved.length, 56, "56 ships resolve to a clean before/after pair");
  assert.strictEqual(refused.length, 15, "15 refuse — 14 interleaved plus AGT-202's null version");
  assert.strictEqual(resolved.length + refused.length, rows.length, "every row is resolved or refused; there is no third status");
  const interleaved = refused.filter(r => r.reason.startsWith("interleaved: ")).map(r => r.backlog_id).sort();
  assert.deepStrictEqual(interleaved, [...INTERLEAVED].sort(),
    "the interleaved refusals must be the kickoff §2 ids BY NAME — a count alone survives any 14 swapping for any other 14");
  assert.deepStrictEqual([...new Set(rows.map(r => r.backlog_id))].length, 71, "one row per ticket");
  assert.deepStrictEqual(rows.map(r => r.backlog_id), [...rows.map(r => r.backlog_id)].sort(),
    "rows are sorted by backlog_id, so a re-freeze diffs line by line");
  for (const r of refused) {
    assert.strictEqual(r.base_sha, null, `${r.backlog_id}: a refused row must carry no base`);
    assert.strictEqual(r.ship_sha, null, `${r.backlog_id}: a refused row must carry no ship`);
    assert.ok(r.reason, `${r.backlog_id}: a refusal without a reason is indistinguishable from nobody looking`);
  }

  // ---- (e) every resolved pair is real git, base an ancestor of ship ---------------------------
  if (!isCommit("HEAD")) {
    notRun("AGT-245 (e)", "this clone has no readable git history, so no pair can be checked against it");
  } else {
    const unreachable = [];
    let checked = 0;
    for (const r of resolved) {
      assert.ok(/^[0-9a-f]{40}$/.test(r.base_sha || ""), `${r.backlog_id}: base_sha must be a full 40-char sha`);
      assert.ok(/^[0-9a-f]{40}$/.test(r.ship_sha || ""), `${r.backlog_id}: ship_sha must be a full 40-char sha`);
      assert.notStrictEqual(r.base_sha, r.ship_sha, `${r.backlog_id}: a pair whose halves are the same commit diffs nothing`);
      if (!isCommit(r.base_sha) || !isCommit(r.ship_sha)) { unreachable.push(r.backlog_id); continue; }
      assert.strictEqual(git(["merge-base", "--is-ancestor", r.base_sha, r.ship_sha]).status, 0,
        `${r.backlog_id}: base ${r.base_sha.slice(0, 8)} must be an ancestor of ship ${r.ship_sha.slice(0, 8)} — slice 2 diffs one against the other`);
      checked++;
    }
    if (unreachable.length) {
      notRun("AGT-245 (e)", `${unreachable.length} resolved pair(s) name commits this clone cannot reach ` +
        `(${unreachable.join(", ")}) — a shallow checkout is missing evidence, not a failure`);
    }
    assert.ok(checked > 0, "at least one resolved pair must be checkable here, or (e) proves nothing");
  }

  // ---- (f) the two rows on the two axes --------------------------------------------------------
  const agt202 = byId.get("AGT-202");
  assert.ok(agt202, "AGT-202 must be in the cohort");
  assert.strictEqual(agt202.status, "refused");
  assert.strictEqual(agt202.reason, "no-version", "AGT-202's latest verdict has version NULL, so its ship is unresolvable and it says so");
  assert.strictEqual(agt202.base_sha, null);
  assert.ok(agt202.graded_sha, "CONTROL: AGT-202 DOES carry a graded_sha — the refusal is the rule refusing it, not an absent value");

  const ses388 = byId.get("SES-388");
  assert.ok(ses388, "SES-388 must be in the cohort");
  assert.strictEqual(ses388.status, "resolved", "SES-388 resolves from its subjects even though its graded_sha is unreachable");
  assert.strictEqual(ses388.graded_sha_in_history, false,
    "SES-388's recorded graded_sha is NOT in this clone's history — the measured fact, and `false` here means looked-for-and-missing");
  assert.ok(ses388.base_sha && ses388.ship_sha, "and it still produces a pair — a resolver reading graded_sha could not have");
  assert.notStrictEqual(ses388.ship_sha, ses388.graded_sha, "the pair is not the graded_sha");
  const looked = rows.filter(r => r.graded_sha_in_history === false).map(r => r.backlog_id).sort();
  assert.deepStrictEqual(looked, ["AGT-172", "SES-388"],
    "exactly 2 of the 70 distinct graded_shas are absent from history; the other 69 rows read `true`, so the field is measured and not a constant");

  // ---- (g) AGT-199: the graded_sha defect, and the kickoff's §6 discrepancy ---------------------
  const agt199 = byId.get("AGT-199");
  assert.ok(agt199, "AGT-199 must be in the cohort");
  assert.strictEqual(agt199.graded_sha, AGT199.gradedSha, "AGT-199's recorded graded_sha, unchanged");
  assert.strictEqual(agt199.status, "refused",
    "AGT-199 refuses under §2's rule — its own v7.0.656 range has two AGT-186 commits inside it. §6 asks for a pair here AND for 56/15 in the same sentence; both cannot hold, and 56/15 is what §2's rule measures.");
  assert.ok(agt199.reason.includes(AGT199.gradedSha) && agt199.reason.includes(AGT199.peer),
    "the refusal names both AGT-186 intruders — and the first of them IS the graded_sha this ticket exists to stop anyone diffing");
  if (isCommit(AGT199.closeOutCommit) && isCommit(AGT199.kickoffCommit) && isCommit(AGT199.middleCommit)) {
    const own = git(["rev-list", `${AGT199.kickoffCommit}^..${AGT199.closeOutCommit}`]).out.split("\n").filter(Boolean);
    assert.strictEqual(own.length, 5,
      "AGT-199's true own span holds 5 commits — 3 own and AGT-186's 2 — which is the interleaving, re-derived from git and not asserted from the row");
    assert.ok(own.includes(AGT199.gradedSha) && own.includes(AGT199.peer), "both AGT-186 commits sit inside AGT-199's own span");
    const shortSpan = git(["rev-list", `${AGT199.kickoffCommit}^..${AGT199.middleCommit}`]).out.split("\n").filter(Boolean);
    assert.deepStrictEqual(shortSpan, [AGT199.middleCommit, AGT199.kickoffCommit],
      "CONTROL: §6's own range IS clean — because it stops at AGT-199's middle own commit and leaves its newest one (the close-out) outside the ship. That is why §6's pair and §6's counts disagree.");
    const subject = git(["log", "-1", "--format=%s", AGT199.gradedSha]).out;
    assert.ok(subject.startsWith("v7.0.653 AGT-186 "),
      `the whole premise, re-read from git: AGT-199's graded_sha is a peer's commit — got ${JSON.stringify(subject)}`);
  } else {
    notRun("AGT-245 (g)", "this clone cannot reach AGT-199's commits, so the git-side control of the §6 discrepancy is unverified here");
  }

  // ---- the log parser, which everything above rides on ------------------------------------------
  const parsed = parseLog("aaa bbb v7.0.1 X — a subject with  spaces\nccc  v7.0.2 Y — a root commit\n\n");
  assert.deepStrictEqual(parsed, [
    { sha: "aaa", parent: "bbb", subject: "v7.0.1 X — a subject with  spaces" },
    { sha: "ccc", parent: "", subject: "v7.0.2 Y — a root commit" },
  ], "the subject survives its own spaces, and a root commit's empty %P does not eat the subject");

  console.log(`  [AGT-245] the pair comes from subjects: a clean synthetic log resolves s6→s9 and the same log ` +
    `with one peer spliced inside refuses naming it; "contains v7.0.100" is not own and AGT-17 is not AGT-170; ` +
    `a null version refuses no-version with no pair and graded_sha_in_history null (nobody looked). ` +
    `${COHORT_PATH}: ${rows.length} rows, ${resolved.length} resolved, ${refused.length} refused, the 14 §2 ` +
    `interleaved ids by name, every resolved pair a real ancestor→descendant in git. AGT-202 refuses no-version ` +
    `while still carrying a graded_sha; SES-388 resolves ${String(ses388.base_sha).slice(0, 8)}→` +
    `${String(ses388.ship_sha).slice(0, 8)} with graded_sha_in_history false (2 of 70 absent: ${looked.join(", ")}). ` +
    `AGT-199 refuses: its graded_sha ${AGT199.gradedSha.slice(0, 8)} is AGT-186's commit AND is one of the two ` +
    `intruders inside its own span — §6's 6c52b474…058312ad is clean only because it stops one own commit short ` +
    `of the ship, which is why §6's pair and §6's own 56/15 cannot both hold (§2's rule is what shipped).`);
}

export default run;
selfRun(import.meta.url, run);
