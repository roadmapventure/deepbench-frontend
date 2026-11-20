// DeepBench v7.0.1064 | tests/regression/agt-331-out-context.test.mjs | AGT-331 -- a .json --out is the file --context reads
//
// WHAT IT GUARDS. `--out` writes the rendered markdown prompt; `--context` is JSON.parse'd. Only
// `--json` ever carried what `--context` reads, so the runbook's own step (7g) --
// `--prepare --out=$S/ruling.json` then `--dry-run --context=$S/ruling.json` -- exited 2 with
// `Unexpected token '#'` on all five `--context` doors. After this ticket an `--out` path ending
// `.json` receives the `--json` envelope and the prompt lands beside it as `<name>.prompt.md`,
// and a prompt handed to `--context` is NAMED instead of reported as a parser accident.
//
//   A  PURE, BOTH SCRIPTS. `outPlan()` is the single home of the split (pattern:14), so it is
//      asserted from each script's own export -- a shared helper asserted once could diverge in
//      the copy nobody checked. Case-insensitive on the extension, and a non-`.json` `--out`
//      keeps today's behaviour exactly: prompt there, no context file.
//
//   B  THE FIVE DOORS, offline. B1 is THE DISCRIMINATOR: each door fed a prompt file as
//      `--context` must exit 2 naming PROMPT_NOT_CONTEXT and must NOT leak `Unexpected token`,
//      which is precisely what every one of them printed before this change. B2 is the CONTROL in
//      the other direction -- genuinely malformed JSON still gets the ordinary `cannot read
//      context` message and must NOT claim to be a prompt, so B1 cannot pass by the new branch
//      swallowing every read failure (LOO-013: assert WHICH branch fired). B3 proves the doors go
//      THROUGH the new branch into their real validators rather than stopping at it: a parseable
//      context reaches `refused:` (exit 1), the validator's own ground.
//
// OFFLINE BY CONSTRUCTION. Every child runs with SUPABASE_URL and SUPABASE_SERVICE_KEY deleted
// from its env, and every door reads its `--context` before it reads credentials, so nothing here
// touches Supabase and nothing is written anywhere but the temp dir. B3's `--apply-list` is the
// only writer-door exercised and it refuses before `creds()`; `--apply` is never given a
// parseable context on purpose (a pass through it would write).

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { outPlan as drOutPlan, PROMPT_NOT_CONTEXT as DR_MSG } from "../../scripts/design-ruling.js";
import { outPlan as rcOutPlan, PROMPT_NOT_CONTEXT as RC_MSG } from "../../scripts/requirement-check.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// Read once from the script's own export, so the doors are graded against the shipped string
// rather than against a copy of it living in this file.
const PROMPT_NOT_CONTEXT_TEXT = DR_MSG;

const DR = path.join(REPO, "scripts", "design-ruling.js");
const RC = path.join(REPO, "scripts", "requirement-check.js");

// The children must not inherit credentials: this guard is offline, and a door that reached
// Supabase would be measuring the network instead of the read.
function offlineEnv() {
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  return env;
}

function door(cli, argv) {
  const r = spawnSync(process.execPath, [cli, ...argv], {
    cwd: REPO, env: offlineEnv(), encoding: "utf8",
  });
  return { code: r.status, err: `${r.stderr ?? ""}${r.stdout ?? ""}` };
}

async function run() {
  // --- A. pure, both scripts ------------------------------------------------------------------
  for (const [name, outPlan] of [["design-ruling", drOutPlan], ["requirement-check", rcOutPlan]]) {
    assert.deepEqual(outPlan("x/r.json"), { prompt: "x/r.prompt.md", context: "x/r.json" },
      `${name}: a .json --out must split into the prompt beside it and the context`);
    assert.deepEqual(outPlan("x/R.JSON"), { prompt: "x/R.prompt.md", context: "x/R.JSON" },
      `${name}: the extension match is case-insensitive`);
    assert.deepEqual(outPlan("x/r.prompt.md"), { prompt: "x/r.prompt.md", context: null },
      `${name}: a non-.json --out is unchanged -- prompt there, no context file`);
    for (const bad of [true, undefined, ""]) {
      assert.deepEqual(outPlan(bad), { prompt: null, context: null },
        `${name}: no --out writes nothing (${JSON.stringify(bad)})`);
    }
  }
  // One message, both scripts -- the string a reader greps for cannot differ between the doors.
  assert.equal(DR_MSG, RC_MSG, "PROMPT_NOT_CONTEXT must be one text in both scripts");
  assert.ok(DR_MSG.includes("--context needs the --json output"),
    "PROMPT_NOT_CONTEXT must tell the reader what to pass instead");

  // --- the fixtures --------------------------------------------------------------------------
  const S = fs.mkdtempSync(path.join(os.tmpdir(), "agt331-"));
  try {
    const f = n => path.join(S, n);
    fs.writeFileSync(f("p.md"), "# The Designer\nbody\n", "utf8");
    fs.writeFileSync(f("a.json"), "{}", "utf8");
    fs.writeFileSync(f("broken.json"), '{"a":', "utf8");
    fs.writeFileSync(f("dr.json"), '{"context":{"questions":[],"knowledge_asks":[]}}', "utf8");
    fs.writeFileSync(f("rc.json"), '{"context":{}}', "utf8");
    const S_NAME = "--session-name=agt331";

    // The five --context doors. The answer is always a.json, which parses: the context is the
    // file under test, so an answer that failed to parse first would mask the result.
    const doors = [
      ["design-ruling --dry-run", DR, [`--dry-run=${f("a.json")}`]],
      ["design-ruling --apply", DR, [`--apply=${f("a.json")}`, S_NAME]],
      ["requirement-check --dry-run", RC, [`--dry-run=${f("a.json")}`]],
      ["requirement-check --apply", RC, [`--apply=${f("a.json")}`, S_NAME]],
      ["requirement-check --apply-list", RC, [`--apply-list=${f("a.json")}`, S_NAME]],
    ];

    // --- B1. THE DISCRIMINATOR: a prompt file named, not a parser accident -------------------
    for (const [label, cli, argv] of doors) {
      const r = door(cli, [...argv, `--context=${f("p.md")}`]);
      assert.equal(r.code, 2, `${label}: a prompt as --context is exit 2, got ${r.code} -- ${r.err.slice(0, 300)}`);
      assert.ok(r.err.includes(PROMPT_NOT_CONTEXT_TEXT),
        `${label}: must name the prompt-not-context mistake; got ${r.err.slice(0, 300)}`);
      assert.ok(!r.err.includes("Unexpected token"),
        `${label}: must not leak the parser's message; got ${r.err.slice(0, 300)}`);
    }

    // --- B2. CONTROL: malformed JSON is still malformed JSON, never "a prompt" ---------------
    for (const [label, cli] of [["design-ruling", DR], ["requirement-check", RC]]) {
      const r = door(cli, [`--dry-run=${f("a.json")}`, `--context=${f("broken.json")}`]);
      assert.equal(r.code, 2, `${label}: broken JSON context is exit 2, got ${r.code}`);
      assert.ok(r.err.includes("cannot read context"),
        `${label}: broken JSON keeps the ordinary read message; got ${r.err.slice(0, 300)}`);
      assert.ok(!r.err.includes(PROMPT_NOT_CONTEXT_TEXT),
        `${label}: broken JSON must NOT be reported as a prompt; got ${r.err.slice(0, 300)}`);
    }

    // --- B3. a parseable context reaches the validator, exit 1 -------------------------------
    // Never through --apply: a context it accepted would write.
    const b3 = [
      ["design-ruling --dry-run", DR, [`--dry-run=${f("a.json")}`, `--context=${f("dr.json")}`],
        "refused: p_rulings must be a non-empty array"],
      ["requirement-check --dry-run", RC, [`--dry-run=${f("a.json")}`, `--context=${f("rc.json")}`],
        "refused:"],
      ["requirement-check --apply-list", RC, [`--apply-list=${f("a.json")}`, `--context=${f("rc.json")}`, S_NAME],
        "refused:"],
    ];
    for (const [label, cli, argv, needle] of b3) {
      const r = door(cli, argv);
      assert.equal(r.code, 1, `${label}: a parseable context reaches the validator (exit 1), got ${r.code} -- ${r.err.slice(0, 300)}`);
      assert.ok(r.err.includes(needle),
        `${label}: expected ${JSON.stringify(needle)}; got ${r.err.slice(0, 300)}`);
      assert.ok(!r.err.includes(PROMPT_NOT_CONTEXT_TEXT),
        `${label}: a parseable context must not trip the prompt branch; got ${r.err.slice(0, 300)}`);
    }
  } finally {
    fs.rmSync(S, { recursive: true, force: true });
  }
}

selfRun(import.meta.url, run);
export default run;
