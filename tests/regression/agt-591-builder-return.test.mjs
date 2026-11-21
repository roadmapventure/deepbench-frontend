// DeepBench v7.0.1099 | tests/regression/agt-591-builder-return.test.mjs | AGT-591
//
// A BUILDER THAT RETURNS `blocked` SETTLES ITS TICKET `partial`, AND THE SHIP POINT REFUSES ITS PUSH.
//
// The defect, reproduced on the real record: cycle d6dddd71's Builder returned `blocked` with task
// 5 of 5 unbuilt, and decideStatus() over docs/kickoffs/v7.0.937-AGT-431-rescore-door.md answered
// `delivered`, because none of its five triggers read the Builder's own return. Arm B is that
// case; arm A is AGT-167's compatibility bar (an ordinary return keeps its reason byte-identical).
//
// OFFLINE, DISK ONLY. No credentials, no network, nothing written outside os.tmpdir(). The CLI
// arms spawn with the two Supabase variables removed, so a refusal can only come from the flag.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  ALLOWED_FLAGS, decideStatus, readBuilderReturn, kickoffTaskCount, builderReason, pushRefusal,
} from "../../scripts/settle-ship.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "settle-ship.js");
const KICKOFF_REL = "docs/kickoffs/v7.0.937-AGT-431-rescore-door.md";
const DELIVERED = "the record names no unbuilt work: no slice remainder, no STOP LINE `partial`, no open card, no card ruled `rework`, no declared remainder";
const BLOCKED = "the Builder returned `blocked` with task 5 of 5 not built";

function cli(args) {
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env, encoding: "utf8" });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

async function run() {
  const kickoffText = fs.readFileSync(path.join(ROOT, KICKOFF_REL), "utf8");
  const base = { kickoffText, ticketId: "AGT-431" };

  // ---- A: an ordinary return is byte-identical to no return at all (AGT-167's bar) ----------
  assert.strictEqual(kickoffTaskCount(kickoffText), 5, `${KICKOFF_REL} declares 5 tasks`);
  const pushed = readBuilderReturn({ outcome: "pushed", tasks: ["1", "2", "3", "4", "5"] }, kickoffText);
  assert.deepStrictEqual(pushed, { outcome: "pushed", built: 5, total: 5 });
  for (const [label, input] of [["no builder", base], ["builder null", { ...base, builder: null }], ["builder pushed", { ...base, builder: pushed }]]) {
    assert.deepStrictEqual(decideStatus(input), { status: "delivered", reasons: [DELIVERED] },
      `A (${label}): a complete return must settle \`delivered\` with the existing reason text byte-identical`);
  }

  // ---- B: THE DISCRIMINATOR -- `blocked` with a task outstanding settles `partial`, named ---
  const blocked = readBuilderReturn({ outcome: "blocked", tasks: ["1", "2", "3", "4"] }, kickoffText);
  assert.deepStrictEqual(blocked, { outcome: "blocked", built: 4, total: 5 });
  assert.deepStrictEqual(decideStatus({ ...base, builder: blocked }), { status: "partial", reasons: [BLOCKED] },
    "B: a Builder return of `blocked` with task 5 of 5 unbuilt must settle `partial` and name that reason — " +
    "before AGT-591 this read `delivered` (cycle d6dddd71)");
  // every reason that fired is kept, not the first: the sixth trigger joins the fifth
  assert.deepStrictEqual(decideStatus({ ...base, builder: blocked, remainder: " x " }).reasons,
    ["a remainder was declared: x", BLOCKED], "B: trigger 6 is appended after trigger 4's reason");

  // ---- C: the span, and `blocked` with nothing outstanding still fires ----------------------
  assert.strictEqual(builderReason({ outcome: "blocked", built: 2, total: 5 }),
    "the Builder returned `blocked` with tasks 3-5 of 5 not built");
  assert.strictEqual(builderReason({ outcome: "blocked", built: 5, total: 5 }),
    "the Builder returned `blocked` with 5 tasks reported built and nothing pushed by it");
  assert.strictEqual(builderReason({ outcome: "blocked", built: 3, total: 0 }),
    "the Builder returned `blocked` with 3 tasks reported built and nothing pushed by it");
  assert.strictEqual(builderReason({ outcome: "pushed", built: 1, total: 5 }), null);
  assert.strictEqual(builderReason(null), null);

  // ---- D: the reader refuses what is not a build-ticket return ------------------------------
  for (const bad of [null, undefined, "blocked", [], {}, { outcome: "green" }, { outcome: "BLOCKED" }]) {
    assert.strictEqual(readBuilderReturn(bad, kickoffText), null, `D: ${JSON.stringify(bad)} is not a Builder return`);
  }
  assert.deepStrictEqual(readBuilderReturn({ outcome: "blocked", tasks: ["a", "", 7, " "] }, ""),
    { outcome: "blocked", built: 1, total: 0 }, "D: only non-blank string titles count as built");
  assert.strictEqual(kickoffTaskCount("## 5. TASKS\n\n**T1 -- a.** x\n**T2 -- b.** y\n\n## 6. QA\n\n1. not a task\n"), 2);
  assert.strictEqual(kickoffTaskCount("no tasks section"), 0);

  // ---- E: the ship point's gate, pure and spawned -------------------------------------------
  assert.strictEqual(pushRefusal(pushed), null);
  assert.strictEqual(pushRefusal(null), null);
  assert.ok(/this HEAD is not pushed/.test(pushRefusal(blocked)), "E: a blocked return refuses the push");
  for (const f of ["builder", "may-push", "ticket", "kickoff", "cycle-id", "remainder", "apply", "resettle", "ship", "release", "defer-reason"]) {
    assert.ok(ALLOWED_FLAGS.has(f), `E: --${f} must be an accepted flag`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt-591-"));
  try {
    const file = (name, body) => { const p = path.join(tmp, name); fs.writeFileSync(p, body); return p; };
    const fBlocked = file("blocked.json", JSON.stringify({ outcome: "blocked", tasks: ["1", "2", "3", "4"] }));
    const fPushed = file("pushed.json", JSON.stringify({ outcome: "pushed", tasks: ["1", "2", "3", "4", "5"] }));
    const fBroken = file("broken.json", "{ not json");
    const fOther = file("other.json", JSON.stringify({ verdict: "approve" }));

    const refused = cli(["--may-push", `--builder=${fBlocked}`]);
    assert.strictEqual(refused.status, 2, `E: --may-push on a blocked return must exit 2, got ${refused.status}: ${refused.out}`);
    assert.ok(refused.out.includes("--may-push refused"), `E: the refusal names itself: ${refused.out}`);
    for (const ok of [fPushed, "none"]) {
      const r = cli(["--may-push", `--builder=${ok}`]);
      assert.strictEqual(r.status, 0, `E: --may-push --builder=${path.basename(ok)} must exit 0, got ${r.status}: ${r.out}`);
      assert.ok(r.out.includes("push allowed"), r.out);
    }
    // fail closed: a gate that cannot read its record never lets the push through
    for (const [args, needle] of [
      [["--may-push"], "--builder=<path"],
      [["--may-push", `--builder=${fBroken}`], "not readable JSON"],
      [["--may-push", `--builder=${fOther}`], "not a build-ticket return"],
      [["--may-push", `--builder=${path.join(tmp, "absent.json")}`], "not readable JSON"],
    ]) {
      const r = cli(args);
      assert.strictEqual(r.status, 2, `E: ${args.join(" ")} must exit 2, got ${r.status}: ${r.out}`);
      assert.ok(r.out.includes(needle), `E: ${args.join(" ")} must say ${JSON.stringify(needle)}: ${r.out}`);
    }

    // ---- F: the settle door will not decide without the record, before any read ------------
    const bare = cli(["--ticket=AGT-431", `--kickoff=${KICKOFF_REL}`]);
    assert.strictEqual(bare.status, 2, `F: a settle with no --builder must exit 2, got ${bare.status}: ${bare.out}`);
    assert.ok(bare.out.includes("--builder=<path") && !bare.out.includes("SUPABASE_URL"),
      `F: the refusal is the flag's, raised before the credential check: ${bare.out}`);
    const declared = cli(["--ticket=AGT-431", `--kickoff=${KICKOFF_REL}`, "--builder=none"]);
    assert.strictEqual(declared.status, 2, `F: with --builder=none the next stop is the credential check: ${declared.out}`);
    assert.ok(declared.out.includes("SUPABASE_URL is not set"), `F: ${declared.out}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // ---- G: the three homes say it (pattern:163) ----------------------------------------------
  const runbook = fs.readFileSync(path.join(ROOT, "docs/runbooks/runner-cycle.md"), "utf8");
  const SETTLE = '--cycle-id=<your cycle id> --builder=<JSON|none> [--remainder="<remainder>"] --apply';
  const GATE = "`node scripts/settle-ship.js --may-push --builder=<JSON|none> && git fetch origin dev && git rebase origin/dev && git push origin HEAD:dev`";
  const SAVE = "save the Builder's JSON verbatim as `$S/builder.json` (`AGT-591`)";
  for (const [where, text, needle] of [["runbook", runbook, SETTLE], ["runbook", runbook, GATE], ["runbook", runbook, SAVE]]) {
    assert.strictEqual(text.split(needle).length - 1, 1, `G: the ${where} must hold ${JSON.stringify(needle)} exactly once`);
  }
  assert.ok(!runbook.includes("  `git fetch origin dev && git rebase origin/dev && git push origin HEAD:dev`. Never"),
    "G: the ungated push compound must be gone from step 7's ship point");

  console.log("[AGT-591] A delivered reason byte-identical x3 · B blocked 4 of 5 -> partial, reason named · " +
    "C spans · D reader refuses 7 non-returns · E --may-push 2/0/0 and fails closed x4 · F settle needs --builder · G 3 runbook lines");
}

export default run;
selfRun(import.meta.url, run);
