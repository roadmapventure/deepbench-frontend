// DeepBench v7.0.559 | tests/regression/agt-102-routine-prompt-drift.test.mjs | AGT-102 slice 1
// FEATURE: AGT-102 -- the Auditor compares the prompt a live routine actually runs with its repo
// block (scripts/check-routine-prompt.js) and files any difference as `routine-prompt-drift`.
// Kickoff: docs/kickoffs/v7.0.559-AGT-102-routine-prompt-drift.md §6.
//
//   A  EQUAL -- the real auditor block as --prompt -> exit 0, findings [].
//   B  DRIFT -- one character changed at block line 3 -> exit 1, ONE finding, check_slug
//      routine-prompt-drift, location 1 routine/trig_01BCzPdanZ1YiK956dAqU6YN/prompt; a word deleted
//      at line 1 -> fingerprint() identical (the line drops out of the key); the same drifted text
//      as --routine=runner -> a DIFFERENT fingerprint (control: the key is the routine, not the text).
//   C  LINE ENDINGS -- \n -> \r\n plus a trailing \n -> exit 0 (the only normalization).
//   D  RUNBOOK -- auditor-routine.md has no "<routine id>", runs --routine=auditor --prompt=$S/prompt.txt
//      and merges $S/prompt-auditor.json $S/prompt-runner.json.
//   E  NOTE -- a runner drift note with --cycle=<uuid> -> exit 1, confidence medium, fingerprint equal
//      to B's runner finding; --note without --cycle, and --routine=other -> exit 2.
//   F  ROW (credentialed, else notRun) -- au-behavior carries the routine-prompt-drift [code] line and
//      "twenty-four"; one runner_before_images row under cycle a428ca66-... for skill_profiles with
//      row_data, its decision kind agent-row, backlog_id AGT-102.
// Pre-change: A-E fail at spawn (no script), D on the placeholder, F on the missing line.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { fingerprint } from "../../scripts/audit-ledger.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "check-routine-prompt.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "auditor-routine.md");
const BEGIN = "<!-- AUDITOR-ROUTINE-PROMPT-BEGIN -->";
const END = "<!-- AUDITOR-ROUTINE-PROMPT-END -->";
const AUDITOR_ID = "trig_01BCzPdanZ1YiK956dAqU6YN";
const CYCLE = "a428ca66-7131-4b7f-9f78-655b4cea8bce";
const lf = t => String(t).replace(/\r\n/g, "\n");

function block(md) {
  const lines = lf(md).split("\n");
  const a = lines.indexOf(BEGIN), b = lines.indexOf(END);
  assert.ok(a >= 0 && b > a, "auditor prompt markers present");
  return lines.slice(a + 1, b);
}

function check(args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8" });
  return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt102-"));
  const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
  const readOut = p => JSON.parse(fs.readFileSync(p, "utf8"));
  const lines = block(fs.readFileSync(RUNBOOK, "utf8"));
  let bRunnerFp = null;

  try {
    await arm("A equal", async () => {
      const out = path.join(tmp, "a.json");
      const r = check(["--routine=auditor", `--prompt=${write("a.txt", lines.join("\n"))}`, `--out=${out}`]);
      assert.equal(r.code, 0, `exit 0 on the real block (got ${r.code}: ${r.stderr})`);
      const j = readOut(out);
      assert.deepEqual(j.findings, [], "no findings");
      assert.equal(j.found_by, "check-routine-prompt:auditor");
      assert.deepEqual([j.carried, j.gone], [[], []]);
    });

    await arm("B drift", async () => {
      const three = [...lines];
      assert.ok(three[2].length > 0, "block line 3 is non-empty");
      three[2] = (three[2][0] === "X" ? "Y" : "X") + three[2].slice(1);
      const p3 = write("b3.txt", three.join("\n"));
      const o3 = path.join(tmp, "b3.json");
      const r = check(["--routine=auditor", `--prompt=${p3}`, `--out=${o3}`]);
      assert.equal(r.code, 1, `exit 1 on drift (got ${r.code}: ${r.stderr})`);
      const f = readOut(o3).findings;
      assert.equal(f.length, 1, "exactly one finding");
      assert.equal(f[0].check_slug, "routine-prompt-drift");
      assert.equal(f[0].kind, "contradiction");
      assert.equal(f[0].confidence, "high");
      assert.equal(f[0].locations[0].location, `routine/${AUDITOR_ID}/prompt`);
      assert.equal(f[0].locations[0].text, three[2], "location 1 quotes the first differing live line");
      assert.match(f[0].locations[1].location, /^docs\/runbooks\/auditor-routine\.md:\d+$/);
      assert.equal(f[0].locations[1].text, lines[2], "location 2 quotes the repo line");
      const repoNo = Number(f[0].locations[1].location.split(":")[1]);
      assert.equal(lf(fs.readFileSync(RUNBOOK, "utf8")).split("\n")[repoNo - 1], lines[2], "the repo line number points at that line");

      const one = [...lines];
      one[0] = one[0].replace(/\bWEEKLY /, "");
      assert.notEqual(one[0], lines[0], "a word was deleted at line 1");
      const o1 = path.join(tmp, "b1.json");
      assert.equal(check(["--routine=auditor", `--prompt=${write("b1.txt", one.join("\n"))}`, `--out=${o1}`]).code, 1);
      const f1 = readOut(o1).findings;
      assert.notEqual(f1[0].locations[1].location, f[0].locations[1].location, "different repo lines");
      assert.equal(fingerprint(f1[0]), fingerprint(f[0]), "same routine's drift on another line: one fingerprint");

      const oR = path.join(tmp, "bR.json");
      assert.equal(check(["--routine=runner", `--prompt=${p3}`, `--out=${oR}`]).code, 1, "runner control drifts");
      const fR = readOut(oR).findings;
      assert.match(fR[0].locations[0].location, /^routine\/trig_017TZ3JZcLBK6AYH6DKURqMH\/prompt$/);
      assert.notEqual(fingerprint(fR[0]), fingerprint(f[0]), "control: another routine is another fingerprint");
      bRunnerFp = fingerprint(fR[0]);
      console.log(`    B fingerprint auditor ${fingerprint(f[0])} runner ${bRunnerFp}`);
    });

    await arm("C line endings", async () => {
      const r = check(["--routine=auditor", `--prompt=${write("c.txt", lines.join("\r\n") + "\r\n\n")}`]);
      assert.equal(r.code, 0, `CRLF + trailing newline is equal (got ${r.code}: ${r.stdout}${r.stderr})`);
      // Teeth: a trailing space is NOT normalized.
      assert.equal(check(["--routine=auditor", `--prompt=${write("c2.txt", lines.join("\n") + " ")}`]).code, 1, "control: a trailing space is drift");
    });

    await arm("D runbook", async () => {
      const md = fs.readFileSync(RUNBOOK, "utf8");
      assert.ok(!md.includes("<routine id>"), "the runbook no longer carries the <routine id> placeholder");
      assert.ok(lines.join("\n").includes(`DEEPBENCH-AUDITOR-${AUDITOR_ID}`), "the prompt stamp names the auditor routine id");
      assert.ok(md.includes("--routine=auditor --prompt=$S/prompt.txt"), "step 0 checks the prompt this run was given");
      // AGT-102 s2: the two were adjacent until slice 2 inserted docs/audits/runner-prompt-drift.json
      // between them. Adjacency was never the invariant -- that both are merged, auditor before
      // runner, is (the merge keeps the FIRST copy of a fingerprint). Presence + order, as arm C.
      const iA = md.indexOf("$S/prompt-auditor.json"), iR = md.indexOf("$S/prompt-runner.json");
      assert.ok(iA !== -1 && iR !== -1, "step 3 merges both drift files");
      assert.ok(iA < iR, "the auditor's drift file is merged before the runner's");
      assert.ok(md.includes("--routine=runner --note=$S/note-<id>.txt --cycle=<id>"), "step 1 checks the runner's drift notes");
    });

    await arm("E note", async () => {
      const out = path.join(tmp, "e.json");
      const note = write("e.txt", "ROUTINE-PROMPT DRIFT: step 8 names claude-opus-4");
      const r = check(["--routine=runner", `--note=${note}`, `--cycle=${CYCLE}`, `--out=${out}`]);
      assert.equal(r.code, 1, `a drift note is a finding (got ${r.code}: ${r.stderr})`);
      const f = readOut(out).findings;
      assert.equal(f.length, 1);
      assert.equal(f[0].confidence, "medium");
      assert.equal(f[0].locations[0].text, `cycle ${CYCLE}: ROUTINE-PROMPT DRIFT: step 8 names claude-opus-4`);
      assert.equal(f[0].locations[1].text, "<!-- ROUTINE-PROMPT-BEGIN -->");
      assert.ok(bRunnerFp, "arm B produced the runner fingerprint");
      assert.equal(fingerprint(f[0]), bRunnerFp, "a note finding is the same fingerprint as the runner's prompt finding");
      const noCycle = check(["--routine=runner", `--note=${note}`]);
      assert.equal(noCycle.code, 2, "--note without --cycle exits 2");
      assert.match(noCycle.stderr, /--cycle/);
      const other = check(["--routine=other", `--note=${note}`, `--cycle=${CYCLE}`]);
      assert.equal(other.code, 2, "--routine=other exits 2");
      assert.equal(check(["--routine=auditor"]).code, 2, "neither mode exits 2");
    });

    await arm("F row", async () => {
      const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
      const key = process.env.SUPABASE_SERVICE_KEY ?? "";
      if (!url || !key) {
        notRun("AGT-102 arm F (au-behavior row, before-image, decision)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the Skill row and its ledger are unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const get = async q => {
        const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        const text = await res.text();
        if (!res.ok) throw new Error(`GET ${q} -> HTTP ${res.status} ${text.slice(0, 240)}`);
        return JSON.parse(text);
      };
      const [b] = await get("skill_profiles?slug=eq.au-behavior&select=id,objective,method");
      assert.ok(b, "au-behavior exists");
      assert.match(b.method ?? "", /^routine-prompt-drift \[code\] — /m, "the checklist line for routine-prompt-drift");
      assert.ok((b.method ?? "").includes("routine-prompt-drift by scripts/check-routine-prompt.js"), "the [code] sentence names the script");
      assert.match(b.objective ?? "", /twenty-four/);
      const imgs = await get(`runner_before_images?cycle_id=eq.${CYCLE}&table_name=eq.skill_profiles&select=pk_value,row_data,decision_id`);
      assert.equal(imgs.length, 1, `one before-image under the cycle (got ${imgs.length})`);
      assert.equal(imgs[0].pk_value, b.id, "the image is the au-behavior row");
      assert.ok(imgs[0].row_data, "row_data not null");
      const [d] = await get(`runner_decisions?id=eq.${imgs[0].decision_id}&select=kind,backlog_id`);
      assert.deepEqual(d, { kind: "agent-row", backlog_id: "AGT-102" });
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
