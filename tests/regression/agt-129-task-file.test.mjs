// DeepBench v7.0.587 | tests/regression/agt-129-task-file.test.mjs | AGT-129 -- the task comes from
// a file or stdin, not from one argv entry. Kickoff: docs/kickoffs/v7.0.587-AGT-129-task-file.md.
//
// THE DEFECT, measured 2026-09-25 (Linux, Node 22) on the unchanged tree rather than reasoned
// about: scripts/agent-prompt.js read the task ONLY from `--task=<json>`, and Linux caps a single
// argv entry at MAX_ARG_STRLEN = 131,072 B. A 127 KB entry spawns; 129 KB dies `E2BIG` before node
// is even reached. That is not a slow path or a truncation -- the process never starts, so the
// caller sees a spawn error and no prompt at all. The auditor routine's step-4 worklist (155 KB)
// and its board-health task (245 KB) both sit past that wall, which is how the ceiling was found.
//
// WHY A FILE **AND** STDIN, AND WHY `--task=` SURVIVES UNTOUCHED. The file path is what a runbook
// line can hold (`--task-file=$S/<job>.task.json`, no subshell); `-` for stdin is what a spawning
// script can hold without landing a temp file (audit-cluster.js pipes `input`). `--task=` keeps
// working byte-for-byte because runner-cycle.md steps 4b/6/7 call it -- this is additive work, and
// arm A is the guard that says so.
//
// FIVE ARMS, each discriminating. Arms B/C/D are RED on the unchanged tree (`--task-file` exits 2
// `unrecognized flag "--task-file"`; promptCall is not exported), which was verified before the fix
// was written rather than assumed:
//   A  COMPAT  -- `--task=` still parses to its object, and no task flag still means `{}`.
//   B  FILE    -- a 270 KB file arrives WHOLE through parseArgs (the size is asserted, not implied),
//                 and all five bad inputs return an `.error` that NAMES `--task-file` -- a missing
//                 path, malformed JSON, a JSON array, an empty value, and both flags at once. Which
//                 branch fired is asserted by the message, never by "it errored" (LOO-013).
//   C  STDIN   -- 270 KB over stdin reaches the CREDENTIAL check (exit 2, `SUPABASE_URL not set`),
//                 which is the discriminating proof the payload parsed: a parse failure would have
//                 exited at `--task-file must be valid JSON` instead, and that is arm C's own second
//                 case. The CONTROL is the whole point -- the identical payload through `--task=`
//                 still dies `E2BIG`, so arm C measures the wall it claims to clear.
//   D  CLUSTER -- promptCall() builds `--task-file=-` + stdin, carries `--json` through, and the
//                 source holds no `--task=${` template anywhere.
//   E  LIVE    -- the real >256 KB assembly end to end on credentials; notRun without them.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseArgs } from "../../scripts/agent-prompt.js";
import { promptCall } from "../../scripts/audit-cluster.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "agent-prompt.js");
const CLUSTER_SRC = path.join(ROOT, "scripts", "audit-cluster.js");

// Deliberately past MAX_ARG_STRLEN (131,072) and past the 256 KB the ticket names, so one payload
// serves as both the "arrives whole" proof and the E2BIG control.
const BIG = { goal: "agt129", filler: "x".repeat(270000) };
const BIG_JSON = JSON.stringify(BIG);
const OVER = 262144;

// The credential check is arm C's discriminator, so the child must NOT inherit credentials.
const env0 = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("SUPABASE_")));

const hasCreds = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

export default async function run() {
  assert.ok(Buffer.byteLength(BIG_JSON) > OVER,
    `the fixture must exceed ${OVER} B to test anything (got ${Buffer.byteLength(BIG_JSON)})`);

  const fails = [];
  const check = (arm, fn) => { try { fn(); } catch (e) { fails.push(`${arm}: ${e.message}`); } };
  const checkAsync = async (arm, fn) => { try { await fn(); } catch (e) { fails.push(`${arm}: ${e.message}`); } };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt129-"));
  try {
    const bigFile = path.join(tmp, "big.task.json");
    fs.writeFileSync(bigFile, BIG_JSON, "utf8");
    const badFile = path.join(tmp, "bad.json");
    fs.writeFileSync(badFile, "{bad", "utf8");
    const arrFile = path.join(tmp, "arr.json");
    fs.writeFileSync(arrFile, "[1]", "utf8");
    const missing = path.join(tmp, "nope.json");

    // --- A COMPAT: --task= is untouched by this ticket --------------------------------------
    check("A", () => {
      const a = parseArgs(["--agent=a", "--capability=c", '--task={"goal":"x"}']);
      assert.equal(a.error, undefined, `--task= must still parse (got ${a.error})`);
      assert.deepEqual(a.taskContext, { goal: "x" }, "--task= must still yield its object");
      const b = parseArgs(["--agent=a", "--capability=c"]);
      assert.equal(b.error, undefined, `no task flag must not error (got ${b.error})`);
      assert.deepEqual(b.taskContext, {}, "no task flag must still default to {}");
    });

    // --- B FILE: the whole payload, and five named refusals -----------------------------------
    check("B", () => {
      const ok = parseArgs(["--agent=a", "--capability=c", `--task-file=${bigFile}`]);
      assert.equal(ok.error, undefined, `--task-file must parse (got ${ok.error})`);
      assert.equal(ok.taskContext.goal, "agt129", "--task-file must yield the file's object");
      assert.ok(Buffer.byteLength(JSON.stringify(ok.taskContext)) > OVER,
        "--task-file must carry the payload WHOLE, not truncated at the argv wall");

      // Each bad input names --task-file: "it errored" would pass even if the wrong branch fired.
      const cases = [
        ["missing path", ["--agent=a", "--capability=c", `--task-file=${missing}`]],
        ["malformed JSON", ["--agent=a", "--capability=c", `--task-file=${badFile}`]],
        ["JSON array", ["--agent=a", "--capability=c", `--task-file=${arrFile}`]],
        ["empty value", ["--agent=a", "--capability=c", "--task-file="]],
        ["both flags", ["--agent=a", "--capability=c", '--task={"a":1}', `--task-file=${bigFile}`]],
      ];
      for (const [label, argv] of cases) {
        const r = parseArgs(argv);
        assert.ok(r.error, `${label} must return an error`);
        assert.match(r.error, /--task-file/, `${label}'s error must name --task-file (got "${r.error}")`);
      }
      // Discriminating: each refusal is its OWN message, not one catch-all.
      assert.match(parseArgs(["--agent=a", "--capability=c", "--task-file="]).error,
        /needs a path/, "an empty value must say it needs a path");
      assert.match(parseArgs(["--agent=a", "--capability=c", '--task={"a":1}', `--task-file=${bigFile}`]).error,
        /not both/, "both flags must say not both");
      assert.match(parseArgs(["--agent=a", "--capability=c", `--task-file=${arrFile}`]).error,
        /JSON object/, "an array must be refused as not-an-object");
      assert.match(parseArgs(["--agent=a", "--capability=c", `--task-file=${badFile}`]).error,
        /valid JSON/, "malformed JSON must be refused as invalid JSON");
    });

    // --- C STDIN: 270 KB reaches the credential check, and the control still hits the wall ----
    check("C", () => {
      const r = spawnSync(process.execPath, [SCRIPT, "--agent=a", "--capability=c", "--task-file=-"],
        { input: BIG_JSON, env: env0, encoding: "utf8" });
      assert.equal(r.error, undefined, `stdin must not fail to spawn (got ${r.error && r.error.code})`);
      assert.equal(r.status, 2, `stdin run must exit 2 at the credential check (got ${r.status})`);
      assert.match(r.stderr, /SUPABASE_URL not set/,
        `the 270 KB payload must PARSE and stop at credentials, not at the parser (stderr: ${String(r.stderr).slice(0, 300)})`);

      const bad = spawnSync(process.execPath, [SCRIPT, "--agent=a", "--capability=c", "--task-file=-"],
        { input: "{bad", env: env0, encoding: "utf8" });
      assert.equal(bad.status, 2, "bad stdin must exit 2");
      assert.match(bad.stderr, /--task-file must be valid JSON/,
        `bad stdin must be refused BY THE PARSER, naming the flag (stderr: ${String(bad.stderr).slice(0, 300)})`);

      // THE CONTROL. Without this, arm C proves stdin works but never that it was needed.
      if (process.platform === "linux") {
        const ctl = spawnSync(process.execPath, [SCRIPT, "--agent=a", "--capability=c", `--task=${BIG_JSON}`],
          { env: env0, encoding: "utf8" });
        assert.equal(ctl.error && ctl.error.code, "E2BIG",
          `the same payload through --task= must still die E2BIG -- that wall is why --task-file exists (got ${ctl.error && ctl.error.code}, status ${ctl.status})`);
      } else {
        notRun("arm C's E2BIG control",
          `MAX_ARG_STRLEN is a Linux limit and this run is ${process.platform}; the stdin path above still ran in full.`);
      }
    });

    // --- D CLUSTER: the spawner hands the task over stdin, never over argv --------------------
    check("D", () => {
      const c = promptCall({ capability: "c", intent: "i", task_context: { a: 1 } });
      assert.ok(c.args.includes("--task-file=-"), `args must carry --task-file=- (got ${JSON.stringify(c.args)})`);
      assert.ok(!c.args.some(a => String(a).startsWith("--task=")),
        `args must carry no --task= entry (got ${JSON.stringify(c.args)})`);
      assert.deepEqual(JSON.parse(c.input), { a: 1 }, "input must be the task_context as JSON");
      assert.ok(c.args.includes("--agent=auditor"), "args must name the auditor");
      assert.ok(c.args.includes("--capability=c") && c.args.includes("--intent=i"), "args must carry capability and intent");
      assert.ok(!c.args.includes("--json"), "--json must be absent by default");

      const j = promptCall({ capability: "c", intent: "i", task_context: { a: 1 } }, { json: true });
      assert.equal(j.args[j.args.length - 1], "--json", "{json:true} must append --json last");

      const src = fs.readFileSync(CLUSTER_SRC, "utf8");
      assert.ok(!src.includes("--task=${"),
        "audit-cluster.js must hold no `--task=${` template -- that is the argv wall it just left");
    });

    // --- E LIVE: the real >256 KB assembly, end to end ----------------------------------------
    await checkAsync("E", async () => {
      if (!hasCreds) {
        notRun("arm E, the live >256 KB assembly",
          "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env. Run with --env-file-if-exists=.env.local to exercise it.");
        return;
      }
      const r = spawnSync(process.execPath,
        [SCRIPT, "--agent=auditor", "--capability=audit-board-health", `--task-file=${bigFile}`],
        { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      assert.equal(r.status, 0, `live run must exit 0 (status ${r.status}, stderr: ${String(r.stderr).slice(0, 400)})`);
      assert.ok(r.stdout.includes("agt129"), "the rendered prompt must carry the task's own goal");
      assert.ok(Buffer.byteLength(r.stdout) > OVER,
        `the rendered prompt must exceed ${OVER} B -- the regression this ticket exists for (got ${Buffer.byteLength(r.stdout)})`);

      const j = spawnSync(process.execPath,
        [SCRIPT, "--agent=auditor", "--capability=audit-board-health", `--task-file=${bigFile}`, "--json"],
        { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      assert.equal(j.status, 0, `--json live run must exit 0 (status ${j.status}, stderr: ${String(j.stderr).slice(0, 400)})`);
      assert.equal(JSON.parse(j.stdout).task_context.goal, "agt129",
        "--json must echo the task_context read from the file");
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (fails.length) throw new Error(fails.join(" | "));
}

selfRun(import.meta.url, run);
