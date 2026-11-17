// DeepBench v7.0.1047 | tests/regression/ses-349-repo-guards.test.mjs | SES-349 -- the four repo
// guards travel with the repository: their decision function, their CLI shape, and their wiring
// block are all tracked files this test grades, so a fresh clone carries the enforcement.
//
// WHY THIS TEST EXISTS. CLAUDE.md's hard rules (no `cd <path> && …` compound, push `HEAD:dev` and
// never a bare `dev` refspec, no committed `test-*.mjs` scratch file, no `npm run build` failure
// behind a src/ or api/ commit, no src/ or api/ edit from a `session/design-*` branch) were enforced
// by PreToolUse hooks that lived OUTSIDE the repository, on one machine, ungit-tracked -- exactly
// the caveat CLAUDE.md's own "Hooks are a local backstop, not the source of truth" paragraph names.
// This build moves the decision into a tracked module so the rules are enforceable anywhere the
// repository is cloned.
//
// WHAT IS NOT CLAIMED. Nothing here is wired: merging the T2 block into `.claude/settings.json` is
// a `.claude/` write only an attended session may make, so arm 5 READS that file and PASSES with a
// loud `NOT WIRED` line while the hooks block is absent. A green run of this test therefore proves
// the guards are CORRECT and TRACKED, never that they are live.
//
// ARMS (kickoff v7.0.1047 §5 T3), each graded on its own:
//   1. rules   -- decide() over the three shell rules and their null controls.
//   2. commit  -- the staged-set branch: a scratch test, its deletion, and the build gate.
//   3. design  -- the Edit/Write branch: design branch x src|api, and both negative controls.
//   4. cli     -- the module as a PreToolUse hook: stdin JSON in, a deny envelope or silence out.
//   5. wiring  -- GUARDS, their rule anchors in RULES-SNAPSHOT.md, and the T2 settings block.
//
// BASELINE: on the pre-build tree the module is absent, so arms 1-3 fail `decide must be exported`,
// arm 4 fails `scripts/hooks/repo-guards.js must exist`, arm 5 fails `GUARDS must be exported` --
// `0/5 arms passed`, exit 1. That is the discriminator; it is why the import below is a catch-to-{}
// rather than a hard import, which would make the whole file a crash instead of a verdict.
//
// Invocation: node tests/regression/ses-349-repo-guards.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUARD_REL = "scripts/hooks/repo-guards.js";
const GUARD_ABS = path.join(ROOT, GUARD_REL);
const SETTINGS_REL = ".claude/settings.json";
const WIRING_REL = "scripts/hooks/settings-hooks.json";
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";

const g = await import(pathToFileURL(GUARD_ABS).href).catch(() => ({}));

const haveDecide = () => assert.strictEqual(typeof g.decide, "function", "decide must be exported");
const bash = (cmd, ctx) => g.decide({ tool_name: "Bash", tool_input: { command: cmd } }, ctx);
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const throws = () => { throw new Error("ctx.build must not be consulted on this path"); };

// 1 -- the three shell rules, each with the control that proves the match is not blanket.
function armRules() {
  haveDecide();
  assert.match(
    String(bash('git add a; cd "C:/p q" && npm run build')),
    /^cd-compound/,
    "a `cd <path> && …` compound after a `;` must be denied (HR-NO-CD-COMPOUND)"
  );
  assert.match(
    String(bash("git -C w push origin dev")),
    /^bare-dev-push/,
    "a bare `origin dev` refspec must be denied (HR-PUSH-HEAD-DEV)"
  );
  assert.match(
    String(g.decide({ tool_name: "PowerShell", tool_input: { command: "git push origin dev" } })),
    /^bare-dev-push/,
    "the shell rules must cover PowerShell as well as Bash"
  );
  assert.strictEqual(bash("git -C x status"), null, "control: a read-only git call is allowed");
  assert.strictEqual(
    bash("git -C w push origin HEAD:dev"), null,
    "control: the CORRECT push must be allowed -- otherwise the guard blocks the rule it enforces"
  );
  assert.strictEqual(
    bash('git commit -m "never git push origin dev"', { staged: () => [] }), null,
    "control: the forbidden refspec quoted INSIDE a commit message is not a push"
  );
}

// 2 -- the commit branch. `build` throws on every arm that must not reach it, so a guard that
// consults the build where it should not is a failure here rather than a silent slowdown.
function armCommit() {
  haveDecide();
  const commit = (staged, build) => bash("git -C w commit -m x", { staged: () => staged, build });
  assert.match(
    String(commit([{ status: "A", path: "test-x.mjs" }], throws)),
    /staged scratch test test-x\.mjs/,
    "a staged, ADDED test-*.mjs scratch file must be denied"
  );
  assert.strictEqual(
    commit([{ status: "D", path: "test-x.mjs" }], throws), null,
    "control: DELETING a scratch test is how it leaves the tree -- never denied"
  );
  assert.strictEqual(
    commit([{ status: "M", path: "docs/a.md" }], throws), null,
    "control: a docs-only commit does not run the build gate"
  );
  assert.match(
    String(commit([{ status: "M", path: "src/a.js" }], () => false)),
    /npm run build/,
    "a src/ commit behind a failing build must be denied (CAP-BUILD-GATE)"
  );
  assert.strictEqual(
    commit([{ status: "M", path: "api/a.js" }], () => true), null,
    "control: an api/ commit with a GREEN build is allowed"
  );
}

// 3 -- the Edit/Write branch: both halves of the predicate carry a negative control.
function armDesign() {
  haveDecide();
  const edit = (b, r) => g.decide(
    { tool_name: "Edit", tool_input: { file_path: `/x/${r}` } },
    { branch: () => b, rel: () => r }
  );
  const DESIGN = "session/design-x-1117";
  assert.match(String(edit(DESIGN, "src/a.js")), /^design-branch-code/, "src/ edit on a design branch must be denied");
  assert.match(String(edit(DESIGN, "api/a.js")), /^design-branch-code/, "api/ edit on a design branch must be denied");
  assert.strictEqual(edit(DESIGN, "docs/a.md"), null, "control: a docs edit on a design branch is the point of a design branch");
  assert.strictEqual(edit("session/cycle-1", "src/a.js"), null, "control: a cycle branch MAY write src/");
}

// 4 -- the module as the harness invokes it: a PreToolUse hook reading one JSON object on stdin.
function armCli() {
  assert.ok(fs.existsSync(GUARD_ABS), `${GUARD_REL} must exist`);
  const hook = payload => {
    const r = spawnSync(process.execPath, [GUARD_ABS], {
      input: typeof payload === "string" ? payload : JSON.stringify(payload),
      encoding: "utf8",
      timeout: 120000,
    });
    return { code: r.status, stdout: String(r.stdout || "").trim(), stderr: String(r.stderr || "").trim() };
  };
  const deny = hook({ tool_name: "Bash", tool_input: { command: "cd x && git status" } });
  assert.strictEqual(deny.code, 0, `the hook must exit 0 even when it denies (got ${deny.code}: ${deny.stderr.split("\n")[0]})`);
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(deny.stdout); }, `the deny must be one JSON object on stdout -- got: ${deny.stdout || "(empty)"}`);
  assert.strictEqual(
    parsed?.hookSpecificOutput?.permissionDecision, "deny",
    `the envelope must carry permissionDecision deny -- got: ${deny.stdout}`
  );
  const allow = hook({ tool_name: "Bash", tool_input: { command: "git status" } });
  assert.strictEqual(allow.code, 0, `an allowed call must exit 0 (got ${allow.code})`);
  assert.strictEqual(allow.stdout, "", `an allowed call must print nothing -- got: ${allow.stdout}`);
  const junk = hook("not json");
  assert.strictEqual(junk.code, 0, `unparseable stdin must exit 0 -- a guard that errors ALLOWS (got ${junk.code})`);
  assert.strictEqual(junk.stdout, "", `unparseable stdin must print nothing -- got: ${junk.stdout}`);
}

// 5 -- the wiring: the guards' rule anchors are real, the T2 block covers every tool each guard
// declares, and `.claude/settings.json` either agrees with T2 or says out loud it is not wired.
function armWiring() {
  assert.ok(Array.isArray(g.GUARDS), "GUARDS must be exported");
  assert.strictEqual(g.GUARDS.length, 4, `GUARDS must declare 4 guards, got ${g.GUARDS.length}`);
  const snapshot = read(SNAPSHOT_REL);
  for (const guard of g.GUARDS) {
    if (guard.rule) {
      assert.ok(
        snapshot.includes(`| ${guard.rule} |`),
        `guard ${guard.name} names rule ${guard.rule}, which is not a row in ${SNAPSHOT_REL}`
      );
    }
  }
  const wiring = JSON.parse(read(WIRING_REL));
  const entries = wiring?.hooks?.PreToolUse;
  assert.ok(Array.isArray(entries), `${WIRING_REL} must carry hooks.PreToolUse as an array`);
  for (const guard of g.GUARDS) {
    for (const tool of guard.tools) {
      const hit = entries.some(e =>
        String(e?.matcher || "").split("|").includes(tool) &&
        (e?.hooks || []).some(h => String(h?.command || "").includes("repo-guards.js"))
      );
      assert.ok(hit, `${WIRING_REL} wires no repo-guards.js hook for tool ${tool} (guard ${guard.name})`);
    }
  }
  const settings = JSON.parse(read(SETTINGS_REL));
  if (!settings.hooks) {
    console.log(`  NOT WIRED: ${SETTINGS_REL} has no hooks block`);
    return;
  }
  assert.deepStrictEqual(
    settings.hooks, wiring.hooks,
    `${SETTINGS_REL} carries a hooks block that differs from ${WIRING_REL} -- the tracked block is the source of truth`
  );
}

const ARMS = { rules: armRules, commit: armCommit, design: armDesign, cli: armCli, wiring: armWiring };

async function run() {
  const failed = [];
  let passed = 0;
  for (const [name, fn] of Object.entries(ARMS)) {
    try {
      await fn();
      passed++;
      console.log(`  [PASS] ${name}`);
    } catch (e) {
      const message = String(e && e.message ? e.message : e).split("\n")[0];
      failed.push(`${name}: ${message}`);
      console.log(`  [FAIL] ${name}: ${message}`);
    }
  }
  console.log(`  ${passed}/${Object.keys(ARMS).length} arms passed`);
  if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ${failed.join(" | ")}`);
  return Object.keys(ARMS);
}

selfRun(import.meta.url, run);
export default run;
