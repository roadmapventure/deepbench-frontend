// DeepBench v7.0.886 | tests/regression/agt-525-tail-push.test.mjs | AGT-525 -- the close-out tail
// pushes its two files and nothing else, and the runbook no longer tells it to push this HEAD.
//
// FEATURE: AGT-525 -- step 9's tail regenerates `docs/backlog/BACKLOG-SNAPSHOT.md` and
// `CLAUDE-STATE.md` and has to get them onto `dev`. The shipped instruction said
// `git push origin HEAD:dev` from the cycle's own worktree, so on a cycle whose build did not ship,
// the tail carried the blocked build onto dev behind two documentation files.
//
// THE INCIDENT IS THE FIXTURE. Cycle `6bc9245b` (v7.0.866) closed `gated_before_build` with
// `push_sha` NULL -- nothing shipped -- and its blocked build `022e8cde` is on origin/dev anyway.
// The repo below is that shape, minimally: a session branch carrying a kickoff commit and then
// `src/blocked.js` (THE EXTRA COMMIT, standing in for 022e8cde), plus two uncommitted close-out
// writes. Arm A is the control that makes arm B mean something -- it proves with real git that a
// `HEAD:dev` push from this fixture WOULD carry `src/blocked.js`. Arm B then proves the shipped
// script does not.
//
// REAL GIT, NO STUBS: what is under test is an argv handed to real git plus the parentage of a real
// commit. A stubbed git could be made to agree with any claim about ancestry; `git merge-base
// --is-ancestor` on a real bare origin cannot. One bare `origin.git`, a seed clone, a session clone,
// all inside one mkdtemp, removed at the end. Identity is passed per-invocation with `-c user.name`
// / `-c user.email`, so the run never reads or needs the machine's git config.
//
// NO CREDENTIALS, no network, no Supabase, no model call, and nothing outside the mkdtemp is
// written -- the only repo file this test opens is `docs/runbooks/runner-cycle.md`, read-only.
//
// TEETH, declared rather than implied. On the tree before this ship:
//   * arms B and C cannot pass -- `scripts/tail-push.js` does not exist, so the spawn exits
//     non-zero and prints nothing on stdout;
//   * arm E cannot pass -- the tail-4 slice still carries `git push origin HEAD:dev` and carries
//     `scripts/tail-push.js` nowhere.
// Each arm-E clause additionally carries its own mutate-it control: the same predicate is re-run
// against a copy of the text with the thing it looks for removed (or, for the absence clause, put
// back), and must flip. An assertion that cannot fail is not evidence, which is the LOO-013 lesson
// STANDARDS.md section 4 states -- so each control below says WHICH branch fired.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { DEFAULT_FILES, EXIT_OK, EXIT_USAGE, EXIT_STALE, parseArgs } from "../../scripts/tail-push.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TAIL_PUSH = path.join(ROOT, "scripts", "tail-push.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "runner-cycle.md");

// The two close-out artifacts, and the commit the tail must never carry.
const SNAPSHOT = "docs/backlog/BACKLOG-SNAPSHOT.md";
const STATE = "CLAUDE-STATE.md";
const EXTRA = "src/blocked.js";
const KICKOFF = "docs/kickoffs/k.md";

// The runbook's declared size. The 4th-file waive on this build was granted on the condition that
// T3 is byte-neutral, so this number is a ship condition, not a statistic.
const RUNBOOK_BYTES = 380920;

// Arm E's slice bounds and the string that must no longer be inside it.
const TAIL4_START = "**(4)** re-export the backlog snapshot";
const TAIL4_END = "**(5)** rebuild cards";
const STEP7_PARAGRAPH_START = "Do not push on";
const STEP7_PARAGRAPH_END = "close the cycle";
const HEAD_PUSH = "git push origin HEAD:dev";
const SCRIPT_REF = "scripts/tail-push.js";

const IDENT = ["-c", "user.name=DeepBench Test", "-c", "user.email=test@deepbench.local"];

function git(cwd, args) {
  return spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function gitOk(cwd, args, why) {
  const r = git(cwd, args);
  assert.strictEqual(r.status, 0, `fixture: git ${args.join(" ")} failed (${why}): ${r.stderr || r.stdout}`);
  return r.stdout;
}

function write(repo, rel, body) {
  const p = path.join(repo, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body, "utf8");
}

// One mkdtemp holding a bare origin with a `dev` branch, and a session clone that is the incident's
// shape: two commits on `session/x`, the second of them the one that must never reach dev, and both
// close-out files rewritten in the working tree without being committed.
function buildFixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt525-"));
  const origin = path.join(tmp, "origin.git");
  gitOk(tmp, ["init", "-q", "--bare", origin], "bare origin");

  const seed = path.join(tmp, "seed");
  gitOk(tmp, ["clone", "-q", origin, seed], "seed clone");
  write(seed, "README.md", "fixture\n");
  write(seed, SNAPSHOT, "| id | title |\n| AGT-1 | seed |\n");
  write(seed, STATE, "# CLAUDE-STATE\n\nseed\n");
  gitOk(seed, ["add", "-A"], "seed add");
  gitOk(seed, [...IDENT, "commit", "-q", "-m", "seed"], "seed commit");
  gitOk(seed, ["push", "-q", "origin", "HEAD:dev"], "seed push");

  const session = path.join(tmp, "session");
  gitOk(tmp, ["clone", "-q", "--branch", "dev", origin, session], "session clone");
  gitOk(session, ["checkout", "-q", "-b", "session/x"], "session branch");

  write(session, KICKOFF, "# kickoff\n");
  gitOk(session, ["add", "-A"], "kickoff add");
  gitOk(session, [...IDENT, "commit", "-q", "-m", "v0.0.1 TMP-1 kickoff"], "kickoff commit");

  write(session, EXTRA, "export const blocked = true;\n");
  gitOk(session, ["add", "-A"], "extra add");
  gitOk(session, [...IDENT, "commit", "-q", "-m", "v0.0.2 TMP-1 the blocked build"], "extra commit");

  // The tail's own writes: regenerated, uncommitted, exactly as step 9 leaves them.
  write(session, SNAPSHOT, "| id | title |\n| AGT-1 | seed |\n| AGT-525 | tail pushes two files |\n");
  write(session, STATE, "# CLAUDE-STATE\n\nv7.0.886 shipped\n");

  return {
    tmp,
    session,
    oldDev: gitOk(session, ["rev-parse", "origin/dev"], "oldDev").trim(),
    blocked: gitOk(session, ["rev-parse", "HEAD"], "blocked").trim(),
  };
}

function runTailPush(session, extra = []) {
  return spawnSync("node", [TAIL_PUSH, `--root=${session}`, "--cycle-id=t", ...extra],
    { cwd: ROOT, encoding: "utf8" });
}

// --- (D) the argv contract, pure --------------------------------------------------------------
// Not one of the kickoff's graded arms; three lines that keep the defaults the runbook now quotes
// from drifting silently, since the runbook names no --files on the live invocation.
function theDefaultsTheRunbookRelievesTheCallerOfTyping() {
  assert.deepStrictEqual([...DEFAULT_FILES], [SNAPSHOT, STATE],
    "the two close-out files are the script's default --files; the runbook's live invocation passes none");
  const d = parseArgs(["--cycle-id=t"]);
  assert.strictEqual(d.retries, 3, "--retries defaults to 3, the rebase-retry×3 the runbook names");
  assert.deepStrictEqual(d.files, [SNAPSHOT, STATE], "the default --files survives parseArgs");
  assert.strictEqual(parseArgs(["--cycle-id=t", "--files=a.md,b.md"]).files.length, 2,
    "--files is a csv, so the tail can be told to carry a different pair without a code change");
  assert.deepStrictEqual([EXIT_OK, EXIT_USAGE, EXIT_STALE], [0, 2, 3],
    "the exit codes the runbook's exit-3 sentence depends on");
  const usage = spawnSync("node", [TAIL_PUSH], { cwd: ROOT, encoding: "utf8" });
  assert.strictEqual(usage.status, EXIT_USAGE,
    `no --cycle-id is a usage error, not a push: expected ${EXIT_USAGE}, got ${usage.status}`);
  assert.strictEqual(usage.stdout.trim(), "",
    "a usage error prints nothing on stdout -- the tail quotes stdout into the cycle row verbatim");
}

async function run() {
  theDefaultsTheRunbookRelievesTheCallerOfTyping();

  const fx = buildFixture();
  try {
    // --- (A) CONTROL: a HEAD push from here WOULD carry the blocked build ----------------------
    const spanned = gitOk(fx.session, ["diff", "--name-only", "origin/dev...HEAD"], "arm A")
      .split("\n").map(s => s.trim()).filter(Boolean).sort();
    assert.ok(spanned.includes(EXTRA),
      `CONTROL: the session branch must differ from origin/dev by ${EXTRA} -- that commit is what a ` +
      `HEAD:dev push would carry, and without it arm B below is measuring nothing. got ${JSON.stringify(spanned)}`);
    assert.ok(spanned.includes(KICKOFF),
      `CONTROL: ${KICKOFF} is also on the branch, so the fixture is a multi-commit branch and not a one-commit special case`);

    // --- (B) THE DISCRIMINATOR ----------------------------------------------------------------
    const b = runTailPush(fx.session);
    assert.strictEqual(b.status, EXIT_OK, `tail-push must exit 0 on a real push. got ${b.status}: ${b.stderr}`);
    assert.ok(b.stdout.startsWith("pushed"),
      `the one stdout line must start \`pushed\` so the tail can quote it. got ${JSON.stringify(b.stdout)}`);
    assert.strictEqual(b.stdout.trim().split("\n").length, 1,
      `exactly one stdout line. got ${JSON.stringify(b.stdout)}`);

    gitOk(fx.session, ["fetch", "-q", "origin", "dev"], "post-push fetch");
    const count = gitOk(fx.session, ["rev-list", "--count", `${fx.oldDev}..origin/dev`], "rev-list").trim();
    assert.strictEqual(count, "1",
      `origin/dev must have advanced by EXACTLY ONE commit -- the tail's own. got ${count}`);

    const landed = gitOk(fx.session, ["diff", "--name-only", `${fx.oldDev}..origin/dev`], "landed files")
      .split("\n").map(s => s.trim()).filter(Boolean).sort();
    assert.deepStrictEqual(landed, [STATE, SNAPSHOT].sort(),
      `exactly the two close-out files reached dev. got ${JSON.stringify(landed)}`);

    const ancestor = git(fx.session, ["merge-base", "--is-ancestor", fx.blocked, "origin/dev"]);
    assert.strictEqual(ancestor.status, 1,
      `the blocked build ${fx.blocked.slice(0, 7)} must NOT be an ancestor of origin/dev -- this is the ` +
      `incident itself (cycle 6bc9245b put 022e8cde on dev this way). exit ${ancestor.status} means it is`);

    assert.strictEqual(gitOk(fx.session, ["rev-parse", "HEAD"], "session HEAD").trim(), fx.blocked,
      "the session branch is never touched: its HEAD must be the same commit it was before the push");
    assert.strictEqual(gitOk(fx.session, ["rev-parse", "--abbrev-ref", "HEAD"], "session ref").trim(), "session/x",
      "and it must still be checked out on session/x -- the script never checks anything out here");

    const worktrees = gitOk(fx.session, ["worktree", "list"], "worktree list").trim().split("\n").filter(Boolean);
    assert.strictEqual(worktrees.length, 1,
      `the scratch worktree must be gone: expected 1 registered worktree, got ${worktrees.length} -- ${worktrees.join(" | ")}`);

    // --- (C) idempotence: nothing to say, nothing pushed --------------------------------------
    const devAfterB = gitOk(fx.session, ["rev-parse", "origin/dev"], "dev after B").trim();
    const c = runTailPush(fx.session);
    assert.strictEqual(c.status, EXIT_OK, `a second run exits 0. got ${c.status}: ${c.stderr}`);
    assert.strictEqual(c.stdout.trim(), "unchanged",
      `a second run prints exactly \`unchanged\` -- the common case the runbook names. got ${JSON.stringify(c.stdout)}`);
    gitOk(fx.session, ["fetch", "-q", "origin", "dev"], "post-C fetch");
    assert.strictEqual(gitOk(fx.session, ["rev-parse", "origin/dev"], "dev after C").trim(), devAfterB,
      "an `unchanged` run must leave origin/dev on the very same commit -- no empty commit, no push");

    // --- (E) the runbook actually says so, in both places -------------------------------------
    const text = fs.readFileSync(RUNBOOK, "utf8");

    const slice = (body, start, end) => {
      const i = body.indexOf(start);
      const j = body.indexOf(end, i + start.length);
      assert.ok(i >= 0 && j > i, `arm E could not cut the slice ${start} .. ${end} out of the runbook`);
      return body.slice(i, j);
    };

    const tail4 = slice(text, TAIL4_START, TAIL4_END);
    assert.ok(tail4.includes(SCRIPT_REF),
      `the tail-4 slice must invoke ${SCRIPT_REF} -- that is the whole fix. slice length ${tail4.length}`);
    // MUTATE-IT CONTROL: with the reference taken out, the same predicate must fail. This is what
    // separates "the file says it" from "the assertion cannot fail".
    assert.ok(!slice(text.split(SCRIPT_REF).join("REMOVED"), TAIL4_START, TAIL4_END).includes(SCRIPT_REF),
      "CONTROL: the tail-4 clause fired on the file's real bytes -- deleting the reference flips it");

    assert.ok(!tail4.includes(HEAD_PUSH),
      `the tail-4 slice must no longer carry \`${HEAD_PUSH}\` -- that instruction is the defect. ` +
      `found at offset ${tail4.indexOf(HEAD_PUSH)}`);
    // PUT-IT-BACK CONTROL: the absence clause must be able to see the string when it IS there.
    const regressed = text.replace(TAIL4_START, `${TAIL4_START} (${HEAD_PUSH})`);
    assert.ok(slice(regressed, TAIL4_START, TAIL4_END).includes(HEAD_PUSH),
      `CONTROL: putting \`${HEAD_PUSH}\` back inside the slice must be detected -- otherwise the absence ` +
      "clause above would pass on any text at all");

    const step7 = slice(text, STEP7_PARAGRAPH_START, STEP7_PARAGRAPH_END);
    assert.ok(step7.includes(SCRIPT_REF) && step7.includes("AGT-525"),
      `step 7(3)'s paragraph must name ${SCRIPT_REF} and the ticket, so the prohibition points at the ` +
      `path that replaced it. got ${JSON.stringify(step7)}`);
    assert.ok(!slice(text.split(SCRIPT_REF).join("REMOVED"), STEP7_PARAGRAPH_START, STEP7_PARAGRAPH_END).includes(SCRIPT_REF),
      "CONTROL: the step-7(3) clause fired on the file's real bytes too");

    assert.strictEqual((text.match(/scripts\/tail-push\.js/g) || []).length, 2,
      "exactly the two homes -- step 7(3)'s prohibition and the tail that performs it");

    const bytes = Buffer.byteLength(text, "utf8");
    assert.strictEqual(bytes, RUNBOOK_BYTES,
      `docs/runbooks/runner-cycle.md must stay ${RUNBOOK_BYTES} B -- the 4th-file waive on this build was ` +
      `granted on T3 being byte-neutral, and ses-413d's BYTES_AT_SHIP is pinned to it. got ${bytes}`);
    assert.notStrictEqual(Buffer.byteLength(`${text} `, "utf8"), RUNBOOK_BYTES,
      "CONTROL: the byte clause is a real measurement -- one appended space must move it");
  } finally {
    fs.rmSync(fx.tmp, { recursive: true, force: true });
  }

  console.log("[AGT-525] (A) CONTROL: the fixture session branch differs from origin/dev by src/blocked.js, " +
    "so a HEAD:dev push would carry the blocked build; (B) DISCRIMINATOR: scripts/tail-push.js advanced " +
    "origin/dev by exactly 1 commit carrying exactly CLAUDE-STATE.md + docs/backlog/BACKLOG-SNAPSHOT.md, " +
    "the blocked commit is not an ancestor of origin/dev, session HEAD and session/x are untouched, and no " +
    "scratch worktree is left registered; (C) a second run prints `unchanged` and origin/dev does not move; " +
    "(D) the defaults the runbook relies on (two files, retries 3, exits 0/2/3, no stdout on usage); " +
    "(E) the tail-4 slice invokes the script and no longer says `git push origin HEAD:dev`, step 7(3) names " +
    "the script and AGT-525, the runbook holds exactly 2 references and is still 380920 B -- each clause " +
    "with a mutate-it control that flips it.");
}

selfRun(import.meta.url, run);
export default run;
