// DeepBench v7.0.552 | tests/regression/agt-86h-auditor-routine.test.mjs | AGT-86 slice 8a
//
// FEATURE: AGT-86 slice 8a -- the code the Auditor routine's playbook calls. The routine has no
// runner_cycles row (it runs under a session name `auditor-<W>`), so scripts/audit-cluster.js --run
// must take EXACTLY ONE of --cycle-id / --session-name (audit-ledger.js attribution()); config
// clusters (statements carrying slice 6's `project` label) route to `audit-config-review` /
// `au-config-intent` with `task_context.repo_visibility`; and the five sub-agent slugs enter
// shared/ai-patterns.js SERVICE_CATALOG so scripts/agent-log.js does not refuse their log rows.
// Kickoff: docs/kickoffs/v7.0.552-AGT-86-s8a-routine-prereqs.md. Slice 8c appends the runbook arms.
//
// FIVE ARMS, each discriminating (kickoff §6), no credentials anywhere:
//   C  ATTRIBUTION -- --run with both flags, or with neither (not a dry run), exits 2 with
//      "exactly one of --cycle-id / --session-name"; a dry run with neither is not that refusal.
//      Pre-change: "--cycle-id=<uuid> is required" / the both-flags run falls through to creds.
//   D  ROUTING -- a `project` statement routes to config-review ahead of the agent-data rule;
//      taskStatement() carries `project` and omits the key without one. Pre: corpus; undefined.
//   E  BUILD -- --build --no-db writes a config-review task file whose task_context.repo_visibility
//      carries the flag's label; a bad visibility value exits 2 naming the flag. Pre: no such file;
//      the unknown flag is ignored and exits 0.
//   F  NOTE -- --collect's note no longer says "John reads" and names --session-name=<name> --apply.
//   G  CATALOG -- the five slugs exist with the judge patterns (advisor adds Tool Use), and
//      agent-log.js parseArgs accepts them. Pre: error "not a SERVICE_CATALOG slug".

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLUSTER = path.join(ROOT, "scripts", "audit-cluster.js");
const ATTRIBUTION_RE = /exactly one of --cycle-id \/ --session-name/;
const NEW_SLUGS = ["audit-board-health", "audit-work-quality", "audit-config-review", "audit-advisor", "review-audit-worklist"];

// Credentials stripped so arm C proves the refusal happens before any database read.
function cluster(args) {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith("SUPABASE_")) delete env[k];
  return spawnSync(process.execPath, [CLUSTER, ...args], { cwd: ROOT, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

export default async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); } catch (e) { failures.push(`${name}: ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt86h-"));

  try {
    // --- C. attribution ---------------------------------------------------------------------------
    await arm("C attribution", async () => {
      const runDir = path.join(tmp, "run");
      fs.mkdirSync(runDir, { recursive: true });
      const both = cluster(["--run", `--dir=${runDir}`, "--cycle-id=x", "--session-name=y"]);
      assert.equal(both.status, 2, `both flags exit 2 (got ${both.status}; stderr ${both.stderr})`);
      assert.match(both.stderr, ATTRIBUTION_RE, "both flags: the attribution refusal");
      const neither = cluster(["--run", `--dir=${runDir}`]);
      assert.equal(neither.status, 2, `neither flag exits 2 (got ${neither.status})`);
      assert.match(neither.stderr, ATTRIBUTION_RE, "neither flag: the attribution refusal");
      const dry = cluster(["--run", `--dir=${runDir}`, "--dry-run"]);
      assert.doesNotMatch(dry.stderr, ATTRIBUTION_RE, "a dry run with neither flag is not that refusal");
    });

    const { capabilityFor, taskStatement } = await import("../../scripts/audit-cluster.js");

    // --- D. routing -------------------------------------------------------------------------------
    await arm("D routing", async () => {
      assert.deepEqual(
        capabilityFor({ statements: [{ corpus: "file", project: "claude-config" }] }),
        { capability: "audit-config-review", intent: "au-config-intent" }, "a project statement -> config-review");
      assert.deepEqual(
        capabilityFor({ statements: [{ corpus: "agent-data", project: "claude-config" }] }).capability,
        "audit-config-review", "project is checked BEFORE the agent-data rule");
      assert.equal(capabilityFor({ statements: [{ corpus: "agent-data" }, { corpus: "agent-data" }] }).capability,
        "audit-agent-data", "every agent-data -> agent-data");
      assert.equal(capabilityFor({ statements: [{ corpus: "governance" }, { corpus: "agent-data" }] }).capability,
        "audit-governance-corpus", "corpus-only / mixed -> governance-corpus");
      const base = { id: "s1", source: "f", location: "a.md:1", text: "t", retired: false, truncated: false };
      assert.equal(taskStatement({ ...base, project: "x" }).project, "x", "taskStatement carries project");
      assert.ok(!("project" in taskStatement(base)), "no project key without one");
    });

    // --- E. build ---------------------------------------------------------------------------------
    await arm("E build", async () => {
      const cfgText = n => `The routine reads \`pace_stop\` before each run and stops when the weekly budget is spent (${n}).`;
      const docText = n => `The runner checks \`other_setting\` at the start of every cycle and records it (${n}).`;
      const statements = [
        ...[1, 2, 3].map(n => ({ id: `c${n}`, corpus: "file", source: `claude-config:memory/m${n}.md`, location: `claude-config:memory/m${n}.md:1`, text: cfgText(n), retired: false, project: "claude-config" })),
        ...[1, 2, 3].map(n => ({ id: `d${n}`, corpus: "governance", source: `docs/d${n}.md`, location: `docs/d${n}.md:1`, text: docText(n), retired: false })),
      ];
      const stFile = path.join(tmp, "statements.json");
      fs.writeFileSync(stFile, JSON.stringify(statements));

      const outDir = path.join(tmp, "build");
      const r = cluster(["--build", `--statements=${stFile}`, "--week=2026-W01", `--out-dir=${outDir}`, "--no-db",
        "--repo-visibility=claude-config=private"]);
      assert.equal(r.status, 0, `build exits 0; stderr ${r.stderr}`);
      const docs = fs.readdirSync(outDir).filter(n => n.endsWith(".task.json"))
        .map(n => JSON.parse(fs.readFileSync(path.join(outDir, n), "utf8")));
      const cfg = docs.filter(d => d.capability === "audit-config-review");
      assert.equal(cfg.length, 1, `one config-review task file (got ${cfg.length} of ${docs.length})`);
      assert.equal(cfg[0].intent, "au-config-intent");
      assert.equal(cfg[0].task_context.repo_visibility?.["claude-config"], "private", "repo_visibility carried");
      assert.ok(cfg[0].task_context.statements.every(s => s.project === "claude-config"), "project reaches the task file");
      const other = docs.filter(d => d.capability !== "audit-config-review");
      assert.ok(other.length >= 1, "the non-project cluster still builds");
      assert.ok(other.every(d => d.capability === "audit-governance-corpus"), "non-project cluster -> governance-corpus");
      assert.ok(other.every(d => d.task_context.statements.every(s => !("project" in s))), "no project key on plain statements");

      const bad = cluster(["--build", `--statements=${stFile}`, "--week=2026-W01", `--out-dir=${path.join(tmp, "bad")}`, "--no-db",
        "--repo-visibility=claude-config=secret"]);
      assert.equal(bad.status, 2, `bad visibility exits 2 (got ${bad.status})`);
      assert.match(bad.stderr, /--repo-visibility/, "stderr names the flag");
    });

    // --- F. collect note --------------------------------------------------------------------------
    await arm("F note", async () => {
      const src = fs.readFileSync(CLUSTER, "utf8");
      assert.ok(!src.includes("John reads"), "no `John reads` in the source");
      assert.ok(src.includes("--session-name=<name> --apply"), "the note names --session-name=<name> --apply");
    });

    // --- G. catalog -------------------------------------------------------------------------------
    await arm("G catalog", async () => {
      const { SERVICE_CATALOG } = await import("../../shared/ai-patterns.js");
      const { parseArgs } = await import("../../scripts/agent-log.js");
      for (const slug of NEW_SLUGS) {
        const e = SERVICE_CATALOG.find(s => s.slug === slug);
        assert.ok(e, `${slug} is in SERVICE_CATALOG`);
        assert.equal(e.serviceType, "ai", `${slug} serviceType ai`);
        assert.ok(e.patterns.includes("Structured Output") && e.patterns.includes("LLM-as-Judge / Verifier"), `${slug} judge patterns`);
      }
      assert.ok(SERVICE_CATALOG.find(s => s.slug === "audit-advisor").patterns.includes("Tool Use"), "advisor carries Tool Use");
      for (const [cap, intent] of [["audit-advisor", "au-advisor-intent"], ["review-audit-worklist", "dm-audit-review-intent"]]) {
        const p = parseArgs(["--agent=auditor", `--capability=${cap}`, "--model=m", `--ai-type=${cap}`, `--feature=${cap}:${intent}:depth1`]);
        assert.equal(p.error, undefined, `parseArgs accepts ${cap}: ${p.error}`);
      }
      const slugs = SERVICE_CATALOG.map(s => s.slug);
      assert.equal(new Set(slugs).size, slugs.length, "slug set still unique");
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
