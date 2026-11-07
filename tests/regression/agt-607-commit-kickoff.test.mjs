// DeepBench v7.0.975 | tests/regression/agt-607-commit-kickoff.test.mjs | AGT-607 -- one script
// owns the kickoff commit, it cannot carry anything else onto dev, and the runbooks name it.
//
// FEATURE: AGT-607 -- `docs/runbooks/runner-cycle.md` step 6(3) said "and commit it" and named NO
// script; `grep -rl "git commit" scripts lib` found exactly one committing script,
// `scripts/tail-push.js`, which commits the close-out tail's two files off a DETACHED worktree and
// cannot commit the session's own kickoff. So the one commit the build contract depends on was
// whatever git line the session assembled -- the shape that parks an unattended run on a permission
// prompt nobody is watching, and the shape that loses the design when the run stalls after step 6.
//
// REAL GIT, NO STUBS, the same choice `agt-525-tail-push.test.mjs` made and for the same reason:
// what is under test is an argv handed to real git plus the parentage of a real commit. A stubbed
// git could be made to agree with any claim about ancestry; `git rev-list` on a real bare origin
// cannot. One bare `origin.git`, a seed clone and a session clone inside one mkdtemp per arm,
// removed at the end.
//
// IDENTITY IS THE POINT OF ARM A's LAST THREE ASSERTIONS. The script may not assemble a git
// identity, so the test hands it one the only way the runbook allows -- GIT_AUTHOR_NAME /
// GIT_AUTHOR_EMAIL (and the COMMITTER pair) in the child's environment -- and then reads `%an`,
// `%ae` and `%cn` back off the commit. The fixture's OWN commits pass their identity per invocation
// instead, so the run never reads or needs the machine's git config, and the two identities cannot
// be confused for one another in the assertions.
//
// TEETH, declared rather than implied. On the tree before this ship:
//   * arms A, B, C and D cannot pass -- `scripts/commit-kickoff.js` does not exist, so the spawn
//     exits non-zero and prints nothing on stdout;
//   * arm E cannot pass -- `runner-cycle.md` step 6(3) says "and commit it" with no script in the
//     sentence, `auditor-routine.md` step 5 carries a `git commit -m` line, and `cycle-card.md`'s
//     `**6.**` outcome names no script at all.
// Arm C is the DISCRIMINATOR: it is arm B's fixture plus one unrelated commit, and the only thing
// that may differ is the refusal. Each arm-E clause carries its own mutate-it control -- the same
// predicate re-run against text with the thing it looks for removed (or put back), which must flip.
// An assertion that cannot fail is not evidence (STANDARDS.md section 4, the LOO-013 lesson), so
// every control below says WHICH branch fired.
//
// NO CREDENTIALS, no network, no Supabase, no model call, and nothing outside the mkdtemp is
// written -- the only repo files this test opens are the four docs of arm E, read-only.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  EXIT_OK, EXIT_USAGE, EXIT_STALE, DEFAULT_RETRIES, parseArgs, declaredFiles,
} from "../../scripts/commit-kickoff.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "commit-kickoff.js");

// Arm E's four files. The three prose surfaces, minus their routine-prompt blocks, plus the
// generated card.
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const AUDITOR_REL = "docs/runbooks/auditor-routine.md";
const RESEARCHER_REL = "docs/runbooks/researcher-routine.md";
const CARD_REL = "docs/runbooks/cycle-card.md";

// The declared file set of the fixture's step 6: the kickoff, its harvest, and step 1's drift
// finding as the --extra the live invocation passes.
const KICKOFF = "docs/kickoffs/v0.0.1-TMP-1-fixture.md";
const HARVEST = "docs/harvests/TMP-1.md";
const EXTRA = "docs/audits/runner-prompt-drift.json";
const BLOCKED = "src/blocked.js";
const DECLARED = [KICKOFF, HARVEST, EXTRA];

const MESSAGE = "v0.0.1 TMP-1 - the fixture kickoff commit";

// The identity the script must INHERIT rather than assemble.
const AUTHOR_NAME = "AGT-607 Test";
const AUTHOR_EMAIL = "t@deepbench.local";
const CHILD_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: AUTHOR_NAME,
  GIT_AUTHOR_EMAIL: AUTHOR_EMAIL,
  GIT_COMMITTER_NAME: AUTHOR_NAME,
  GIT_COMMITTER_EMAIL: AUTHOR_EMAIL,
};

// The fixture's own identity, per invocation, so the run never reads the machine's git config and
// so a commit the FIXTURE made can never be mistaken for one the script made.
const IDENT = ["-c", "user.name=DeepBench Fixture", "-c", "user.email=fixture@deepbench.local"];

// The four strings the script's source may not contain. Each one is a way to assemble an identity
// or a message outside git's own environment, and each one is the shape that stops an unattended
// run dead on a prompt nobody sees.
const ABSENT = ['"-c"', "<<", "shell: true", "execSync"];

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

// A bare origin carrying `dev`, and a session clone branched off it holding step 6's three
// uncommitted writes. The message file lives OUTSIDE the clone, exactly as the runbook's `$S`
// scratch does, so the clone never carries it.
function buildFixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt607-"));
  const origin = path.join(tmp, "origin.git");
  gitOk(tmp, ["init", "-q", "--bare", origin], "bare origin");

  const seed = path.join(tmp, "seed");
  gitOk(tmp, ["clone", "-q", origin, seed], "seed clone");
  write(seed, "README.md", "fixture\n");
  gitOk(seed, ["add", "-A"], "seed add");
  gitOk(seed, [...IDENT, "commit", "-q", "-m", "seed"], "seed commit");
  gitOk(seed, ["push", "-q", "origin", "HEAD:dev"], "seed push");

  const session = path.join(tmp, "session");
  gitOk(tmp, ["clone", "-q", "--branch", "dev", origin, session], "session clone");
  gitOk(session, ["checkout", "-q", "-b", "session/x"], "session branch");

  // Step 6's writes: the kickoff, its harvest, and step 1's drift finding.
  write(session, KICKOFF, "<!-- DeepBench v0.0.1 | kickoff | TMP-1 -->\n");
  write(session, HARVEST, "# TMP-1 harvest\n");
  write(session, EXTRA, '{"routine":"runner","drift":true}\n');

  const messageFile = path.join(tmp, "msg.txt");
  fs.writeFileSync(messageFile, `${MESSAGE}\n`, "utf8");

  return {
    tmp,
    session,
    messageFile,
    oldDev: gitOk(session, ["rev-parse", "origin/dev"], "oldDev").trim(),
    base: gitOk(session, ["rev-parse", "HEAD"], "base").trim(),
  };
}

function runCommitKickoff(fx, extraArgv = []) {
  return spawnSync("node", [
    SCRIPT,
    `--root=${fx.session}`,
    `--kickoff=${KICKOFF}`,
    `--harvest=${HARVEST}`,
    `--extra=${EXTRA}`,
    `--message-file=${fx.messageFile}`,
    ...extraArgv,
  ], { cwd: ROOT, encoding: "utf8", env: CHILD_ENV });
}

const show = (repo, fmt, rev = "HEAD") =>
  gitOk(repo, ["show", "-s", `--format=${fmt}`, rev], `show ${fmt}`).replace(/\n$/, "");

const filesIn = (repo, range) =>
  gitOk(repo, ["diff", "--name-only", range], `files in ${range}`)
    .split("\n").map(s => s.trim()).filter(Boolean).sort();

// --- (A) the commit, with no push --------------------------------------------------------------
function armA() {
  const fx = buildFixture();
  try {
    const r = runCommitKickoff(fx);
    assert.strictEqual(r.status, EXIT_OK, `a plain run must exit 0. got ${r.status}: ${r.stderr}`);
    assert.ok(r.stdout.startsWith("committed "),
      `the one stdout line must start \`committed \` so step 6 can quote it. got ${JSON.stringify(r.stdout)}`);
    assert.strictEqual(r.stdout.trim().split("\n").length, 1,
      `exactly one stdout line. got ${JSON.stringify(r.stdout)}`);

    assert.strictEqual(gitOk(fx.session, ["rev-list", "--count", `${fx.base}..HEAD`], "A count").trim(), "1",
      "HEAD must have advanced by EXACTLY ONE commit -- the kickoff's own");
    assert.deepStrictEqual(filesIn(fx.session, `${fx.base}..HEAD`), [...DECLARED].sort(),
      "the commit must hold exactly the kickoff, its harvest and the declared extra");

    assert.strictEqual(show(fx.session, "%B").trim(), MESSAGE,
      "the commit message must BE the message file, byte for byte -- that is what `commit -F` is for");
    assert.strictEqual(show(fx.session, "%an"), AUTHOR_NAME,
      "the author name must come from GIT_AUTHOR_NAME in the environment, never from a flag the script assembled");
    assert.strictEqual(show(fx.session, "%ae"), AUTHOR_EMAIL, "and the author email from GIT_AUTHOR_EMAIL");
    assert.strictEqual(show(fx.session, "%cn"), AUTHOR_NAME, "and the committer name from GIT_COMMITTER_NAME");

    gitOk(fx.session, ["fetch", "-q", "origin", "dev"], "A fetch");
    assert.strictEqual(gitOk(fx.session, ["rev-parse", "origin/dev"], "A dev").trim(), fx.oldDev,
      "a run without --push must leave origin/dev exactly where it was -- it commits, it does not ship");
    return r.stdout.trim();
  } finally {
    fs.rmSync(fx.tmp, { recursive: true, force: true });
  }
}

// --- (B) --push on a clean branch: the CONTROL that makes arm C mean something ------------------
function armB() {
  const fx = buildFixture();
  try {
    const r = runCommitKickoff(fx, ["--push"]);
    assert.strictEqual(r.status, EXIT_OK, `--push on a clean branch must exit 0. got ${r.status}: ${r.stderr}`);
    assert.ok(r.stdout.startsWith("pushed "),
      `the one stdout line must start \`pushed \`. got ${JSON.stringify(r.stdout)}`);
    assert.strictEqual(r.stdout.trim().split("\n").length, 1, `exactly one stdout line. got ${JSON.stringify(r.stdout)}`);

    gitOk(fx.session, ["fetch", "-q", "origin", "dev"], "B fetch");
    assert.strictEqual(gitOk(fx.session, ["rev-list", "--count", `${fx.oldDev}..origin/dev`], "B count").trim(), "1",
      "origin/dev must have advanced by EXACTLY ONE commit -- step 6's own");
    assert.deepStrictEqual(filesIn(fx.session, `${fx.oldDev}..origin/dev`), [...DECLARED].sort(),
      "exactly the declared three files reached dev");
    return r.stdout.trim();
  } finally {
    fs.rmSync(fx.tmp, { recursive: true, force: true });
  }
}

// --- (C) THE DISCRIMINATOR: one unrelated commit on HEAD and nothing ships ----------------------
function armC() {
  const fx = buildFixture();
  try {
    // Arm B's fixture plus the incident: an unrelated commit sitting on the session branch, the
    // shape a blocked build leaves behind.
    write(fx.session, BLOCKED, "export const blocked = true;\n");
    gitOk(fx.session, ["add", "--", BLOCKED], "C add");
    gitOk(fx.session, [...IDENT, "commit", "-q", "-m", "v0.0.2 TMP-1 the blocked build"], "C commit");
    const blockedSha = gitOk(fx.session, ["rev-parse", "HEAD"], "C blocked").trim();

    const r = runCommitKickoff(fx, ["--push"]);
    assert.strictEqual(r.status, EXIT_USAGE,
      `the self-check must refuse with ${EXIT_USAGE} when HEAD carries ${BLOCKED}. got ${r.status}: ${r.stderr}`);
    assert.strictEqual(r.stdout.trim(), "",
      `a refusal prints NOTHING on stdout -- step 6 quotes stdout into the cycle row verbatim. got ${JSON.stringify(r.stdout)}`);
    assert.ok(/^self-check:/m.test(r.stderr) && r.stderr.includes(BLOCKED),
      `the refusal must name itself \`self-check:\` and name the file it refused over. got ${JSON.stringify(r.stderr)}`);

    gitOk(fx.session, ["fetch", "-q", "origin", "dev"], "C fetch");
    assert.strictEqual(gitOk(fx.session, ["rev-parse", "origin/dev"], "C dev").trim(), fx.oldDev,
      `origin/dev must NOT have moved: ${BLOCKED} reaching dev behind a kickoff is the incident itself`);

    // THE COMMIT IS KEPT. It is a correct commit on a branch state that may not be pushed, and
    // discarding it would lose the design this script exists to protect.
    assert.strictEqual(gitOk(fx.session, ["rev-list", "--count", `${blockedSha}..HEAD`], "C kept").trim(), "1",
      "the kickoff commit must still be on the branch after the refusal -- the refusal is about pushing, not committing");
    assert.deepStrictEqual(filesIn(fx.session, `${blockedSha}..HEAD`), [...DECLARED].sort(),
      "and it must hold exactly the declared files");
    return r.stderr.trim().split("\n")[0];
  } finally {
    fs.rmSync(fx.tmp, { recursive: true, force: true });
  }
}

// --- (D) the argv contract and the four strings the source may not hold ------------------------
function armD() {
  const bare = spawnSync("node", [SCRIPT], { cwd: ROOT, encoding: "utf8", env: CHILD_ENV });
  assert.strictEqual(bare.status, EXIT_USAGE,
    `no args is a usage error, not a commit: expected ${EXIT_USAGE}, got ${bare.status}`);
  assert.strictEqual(bare.stdout.trim(), "",
    "a usage error prints nothing on stdout -- step 6 quotes stdout into the cycle row verbatim");

  // A missing declared file is the same class of refusal, and it must not reach git at all.
  const missing = spawnSync("node", [
    SCRIPT, `--root=${ROOT}`, "--kickoff=docs/kickoffs/does-not-exist.md", "--message-file=/does/not/exist",
  ], { cwd: ROOT, encoding: "utf8", env: CHILD_ENV });
  assert.strictEqual(missing.status, EXIT_USAGE, `a missing file exits ${EXIT_USAGE}, got ${missing.status}`);
  assert.strictEqual(missing.stdout.trim(), "", "and prints nothing on stdout");

  assert.deepStrictEqual([EXIT_OK, EXIT_USAGE, EXIT_STALE], [0, 2, 3],
    "the exit codes step 6's prose depends on: 0 committed/pushed/unchanged, 2 usage or self-check, 3 stale");
  const d = parseArgs(["--kickoff=k.md", "--message-file=m.txt"]);
  assert.strictEqual(d.retries, DEFAULT_RETRIES, `--retries defaults to ${DEFAULT_RETRIES}`);
  assert.strictEqual(d.push, false, "--push is opt-in: a run that was not told to push must not push");
  assert.deepStrictEqual(d.extra, [], "--extra defaults to nothing: the declared set is the kickoff alone");
  assert.strictEqual(parseArgs(["--kickoff=k.md", "--message-file=m.txt", "--push"]).push, true,
    "--push is read as a bare flag");
  assert.deepStrictEqual(declaredFiles({ kickoff: "k.md", harvest: "h.md", extra: ["a.json", "b.json"] }),
    ["k.md", "h.md", "a.json", "b.json"],
    "the declared set is kickoff, harvest, then the extras in the order the step named them");
  assert.deepStrictEqual(declaredFiles({ kickoff: "k.md", harvest: "", extra: [] }), ["k.md"],
    "and an omitted harvest adds nothing -- an empty path would stage the repo root");

  const src = fs.readFileSync(SCRIPT, "utf8");
  for (const s of ABSENT) {
    assert.ok(!src.includes(s),
      `scripts/commit-kickoff.js must not contain ${JSON.stringify(s)}: the identity is git's own, from the ` +
      "environment, and the message arrives as a file. This is the shape that keeps an unattended run off a prompt.");
  }
  // CONTROL: the absence clause is a real search -- it finds each string when it IS there.
  for (const s of ABSENT) {
    assert.ok(`${src}\n// ${s}\n`.includes(s), `CONTROL: the search for ${JSON.stringify(s)} can see it`);
  }
  assert.ok(src.includes('spawnSync("git"'),
    "and git is reached through spawnSync with an argv array -- the only call shape that needs no shell");
}

// --- (E) the prose names the script, and no runbook line commits by hand -----------------------
//
// THE PROMPT BLOCKS ARE CUT FIRST (SES-355): the block between `<!-- …-PROMPT-BEGIN -->` and
// `<!-- …-PROMPT-END -->` is the live routine prompt, byte-identical by contract, and pushing a
// change into it is John's word alone. It is not this ticket's to edit, so it is not this arm's to
// grade either.
const PROMPT_BLOCK = /<!--\s*[A-Z0-9-]*PROMPT-BEGIN\s*-->[\s\S]*?<!--\s*[A-Z0-9-]*PROMPT-END\s*-->/g;
const COMMIT_PHRASE = /\bcommit (it|them|the file)\b/gi;
const SCRIPT_REF = /scripts\/[a-z0-9-]+\.js/;
const SENTENCE_END = /\.(?=\s|\*|$)/;
const HAND_COMMIT = "git commit";

export function stripPromptBlocks(text) {
  return text.replace(PROMPT_BLOCK, "");
}

// A file path's own dot is not the end of a sentence, and `scripts/tail-push.js --files=` would
// otherwise end the sentence inside the very reference the clause is looking for. So the sentence
// boundary is found over text with the script references masked to the SAME LENGTH, and the window
// is then read off the real bytes at those indices.
export function sentenceAfter(text, from) {
  const masked = text.replace(new RegExp(SCRIPT_REF.source, "g"), m => "x".repeat(m.length));
  const rel = masked.slice(from).search(SENTENCE_END);
  return rel === -1 ? text.slice(from) : text.slice(from, from + rel + 1);
}

// Pure, and the whole of E1's judgment: every "commit it" sentence must name the script that does
// the committing.
export function commitPhrasesNameAScript(text) {
  const out = [];
  for (const m of stripPromptBlocks(text).matchAll(COMMIT_PHRASE)) {
    const sentence = sentenceAfter(stripPromptBlocks(text), m.index);
    out.push({ phrase: m[0], sentence, named: SCRIPT_REF.test(sentence) });
  }
  return out;
}

function armE() {
  const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
  const prose = [RUNBOOK_REL, AUDITOR_REL, RESEARCHER_REL].map(rel => ({ rel, text: read(rel) }));

  // CONTROL on the cut itself: the two routines really do carry a prompt block, so the exclusion
  // above is an exclusion of something rather than a no-op that quietly grades nothing.
  for (const rel of [AUDITOR_REL, RESEARCHER_REL]) {
    const t = read(rel);
    assert.ok(stripPromptBlocks(t).length < t.length,
      `CONTROL: ${rel} must carry a routine-prompt block for arm E to be excluding one`);
  }
  assert.strictEqual(stripPromptBlocks(read(RUNBOOK_REL)).length, read(RUNBOOK_REL).length,
    `CONTROL: ${RUNBOOK_REL} carries no prompt block, so the cut leaves it whole`);

  // E1 -- every "commit it / them / the file" sentence names a script.
  let graded = 0;
  for (const { rel, text } of prose) {
    for (const r of commitPhrasesNameAScript(text)) {
      graded++;
      assert.ok(r.named,
        `${rel}: "${r.phrase}" names no script. "and commit it" with no script in the sentence is the ` +
        `defect AGT-607 exists to close -- the sentence reads: ${JSON.stringify(r.sentence)}`);
    }
  }
  assert.ok(graded >= 3,
    `arm E1 must actually grade the sites: ${RUNBOOK_REL} step 1 and step 6(3) plus ` +
    `${RESEARCHER_REL}'s method item 4 are three of them, got ${graded}`);
  // MUTATE-IT CONTROL: with the script references taken out, every one of those sentences must
  // fail. This is what separates "the files say it" from "the predicate cannot fail".
  for (const { rel, text } of prose) {
    const stripped = text.replace(new RegExp(SCRIPT_REF.source, "g"), "REMOVED");
    for (const r of commitPhrasesNameAScript(stripped)) {
      assert.ok(!r.named, `CONTROL: ${rel}'s "${r.phrase}" clause fired on the file's real bytes -- ` +
        "removing the script reference flips it");
    }
  }

  // E2 -- no line commits by hand. A runbook line that runs git itself is the thing the script
  // replaces, and it is also the line an unattended run cannot be asked to retype.
  for (const { rel, text } of prose) {
    const lines = stripPromptBlocks(text).split("\n");
    const hits = lines.map((l, i) => ({ l, i })).filter(({ l }) => l.includes(HAND_COMMIT));
    assert.strictEqual(hits.length, 0,
      `${rel} must hold no \`${HAND_COMMIT}\` line outside its prompt block; found ${hits.length}: ` +
      hits.map(h => `line ${h.i + 1}: ${h.l.trim().slice(0, 120)}`).join(" | "));
    // PUT-IT-BACK CONTROL: the absence clause can see the string when it IS there.
    assert.ok(stripPromptBlocks(`${text}\n${HAND_COMMIT} -m "x"\n`).includes(HAND_COMMIT),
      `CONTROL: putting \`${HAND_COMMIT}\` back must be detected, or the clause above passes on any text`);
  }

  // E3 -- the generated card's step 6 line names the script, because the card is the only door a
  // cycle reads at the step.
  const card = read(CARD_REL);
  const six = card.split("\n").find(l => l.startsWith("**6.**"));
  assert.ok(six, `${CARD_REL} must carry a \`**6.**\` line`);
  assert.ok(six.includes("commit-kickoff.js"),
    `${CARD_REL}'s \`**6.**\` outcome must name commit-kickoff.js -- the card is rendered from the ` +
    `runbook and is what a cycle actually reads at step 6. got: ${six}`);
  assert.ok(!six.replace("commit-kickoff.js", "REMOVED").includes("commit-kickoff.js"),
    "CONTROL: the card clause fired on the line's real bytes");

  return { graded };
}

async function run() {
  armD();
  const a = armA();
  const b = armB();
  const c = armC();
  const e = armE();

  console.log(`[AGT-607] (A) no --push: ${a} -- HEAD +1 holding exactly the kickoff, harvest and ` +
    `--extra, %B equal to the message file, %an/%ae/%cn from the environment, origin/dev unmoved; ` +
    `(B) CONTROL --push on a clean branch: ${b} -- origin/dev +1 with exactly those three files; ` +
    `(C) DISCRIMINATOR one unrelated commit on HEAD: exit 2, empty stdout, "${c}", origin/dev ` +
    `unmoved and the kickoff commit kept; (D) no args exits 2 with empty stdout and the source holds ` +
    `none of ${ABSENT.map(s => JSON.stringify(s)).join(", ")}; (E) ${e.graded} "commit it" sentence(s) ` +
    "across runner-cycle.md, auditor-routine.md and researcher-routine.md each name a script, no line " +
    "outside a prompt block runs `git commit`, and cycle-card.md's **6.** line names commit-kickoff.js " +
    "-- each clause with a mutate-it control that flips it.");
}

selfRun(import.meta.url, run);
export default run;
