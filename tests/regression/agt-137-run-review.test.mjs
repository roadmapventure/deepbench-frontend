// DeepBench v7.0.602 | tests/regression/agt-137-run-review.test.mjs | AGT-137
// FEATURE: AGT-137 -- the Auditor reviews ONE runner cycle the week it ran, and the Auditor's two
// John pushes become rows while notifications are off. Kickoff:
// docs/kickoffs/v7.0.601-AGT-137-run-review-and-push-removal.md §6.
//
// FOUR ARMS, each discriminating, and only D needs credentials:
//   A  PURE -- REVIEWABLE is exactly drain_chain_gate()'s gate-A set plus `failed`; `did_not_run`
//      and an OPEN row (outcome NULL) are exit 3 while `shipped` is exit 0 (the control that keeps
//      the gate from being "always 3"); a non-uuid --cycle-id and --cycle-id WITH --session-name
//      are exit 2 -- proven with a fetch stub that THROWS, so the refusal is shown to happen before
//      anything is read, not merely to happen.
//   B  TRANSPORT (stubbed globalThis.fetch, no network) -- --prepare writes all six keys from six
//      reads; --ingest of two findings posts exactly 2 before-images and 2 audit_findings rows, each
//      with found_by `auditor:run-review:<cycle id>` and ITS OWN finding_type (one `security`, one
//      defaulted to `defect`) -- the LOO-013 bar: assert WHICH branch fired, not that something did.
//   C  DOCS -- runner-cycle.md <= 381,000 B with step 9's span naming `audit-run-review.js --prepare`;
//      auditor-routine.md <= 40 KB with its prompt block holding `record_decision` and NEITHER
//      `claim_john_alerts` NOR `push`. Each clause carries a mutation control.
//   D  LIVE (read-only) -- the capability row, its five links, the `auditor` assignment, and a real
//      `agent-prompt.js` assembly at exit 0. Declared notRun without credentials.
//
// Pre-change (origin/dev): scripts/audit-run-review.js does not exist, so A and B fail at import;
// the prompt block still names claim_john_alerts and two pushes, so C is red; the capability row
// does not exist, so D's assembly exits non-zero.
//
// NO WRITES ANYWHERE IN THIS FILE, so no before-images are owed: B writes only to a temp dir
// through a stubbed fetch that reaches no network, and D is four GETs and one assembly that prints.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSteps } from "../../scripts/render-cycle-card.js";
import { REVIEWABLE, parseArgs, reviewGate, run as runReview } from "../../scripts/audit-run-review.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CYCLE_MD = path.join(ROOT, "docs", "runbooks", "runner-cycle.md");
const AUDITOR_MD = path.join(ROOT, "docs", "runbooks", "auditor-routine.md");
const CYCLE_CEILING = 381000;
const AUDITOR_CEILING = 40 * 1024;
const CAP = "audit-run-review";
const INTENT = "au-run-intent";
const CID = "4313b4c0-fc8c-4a3a-85d9-0e1ac6c759a2";
const STUB_ENV = { SUPABASE_URL: "https://stub.invalid", SUPABASE_SERVICE_KEY: "stub-key" };
const lf = t => String(t).replace(/\r\n/g, "\n");

// The text of step 9 from its own marker to the next step's, so a needle found in step 4 cannot
// pass for one in step 9 (ses-378h's rule, same helper).
export function stepSpan(md, label) {
  const lines = lf(md).split("\n");
  const steps = parseSteps(md);
  const i = steps.findIndex(s => s.label === label);
  assert.ok(i >= 0, `runner-cycle.md has no step **${label}.** marker`);
  const from = steps[i].line - 1;
  const to = i + 1 < steps.length ? steps[i + 1].line - 1 : lines.length;
  return lines.slice(from, to).join("\n");
}

function fetchStub(handler, calls) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET", body: init.body ? JSON.parse(init.body) : null });
    const body = handler(String(url), init);
    if (body === undefined) throw new Error(`fetch stub has no answer for ${url}`);
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
  };
}

async function withFetch(stub, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = stub;
  try { return await fn(); } finally { globalThis.fetch = real; }
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt137-"));

  // --- A. the rule, and the two refusals that never reach the network --------------------------
  await arm("A the reviewable rule and the refusals", async () => {
    assert.deepStrictEqual(REVIEWABLE, ["shipped", "gated_before_build", "reverted", "failed"],
      "REVIEWABLE is drain_chain_gate()'s gate-A set plus `failed`, in that order");
    assert.ok(!REVIEWABLE.includes("did_not_run"),
      "control: `did_not_run` is the outcome the advisor already counts -- it must NOT be reviewable");

    assert.strictEqual(reviewGate({ outcome: "did_not_run" }).code, 3, "did_not_run is nothing to review");
    assert.strictEqual(reviewGate({ outcome: null }).code, 3, "an OPEN row (outcome NULL) is not final, so nothing to review");
    assert.strictEqual(reviewGate({ outcome: "shipped" }).code, 0,
      "control: a shipped cycle IS reviewed -- without this the gate could be 3 for everything and A would still pass");
    assert.strictEqual(reviewGate({ outcome: "gated_before_build" }).code, 0, "a gate left a record too");
    assert.strictEqual(reviewGate(null).code, 2, "an id naming no cycle is a caller error, not an empty review");

    assert.match(String(parseArgs(["--prepare", "--cycle-id=nope", "--out=x"]).error), /not a uuid/);
    assert.match(String(parseArgs([`--ingest=a.json`, `--cycle-id=${CID}`, "--session-name=n"]).error),
      /exactly one of --cycle-id \/ --session-name/);

    // And the refusals cost nothing: the transports are never built, so this fetch never fires.
    const boom = async () => { throw new Error("the refusal reached the network -- it must be decided from argv alone"); };
    await withFetch(boom, async () => {
      assert.strictEqual(await runReview(["--prepare", "--cycle-id=nope", "--out=x"], STUB_ENV), 2);
      assert.strictEqual(await runReview([`--ingest=a.json`, `--cycle-id=${CID}`, "--session-name=n", "--apply"], STUB_ENV), 2);
      assert.strictEqual(await runReview(["--prepare", "--cycle-id=" + CID, "--out=x"], { SUPABASE_URL: "", SUPABASE_SERVICE_KEY: "" }), 2,
        "no credentials is exit 2, never a pass");
    });
  });

  // --- B. six reads in, two rows out -----------------------------------------------------------
  await arm("B --prepare writes six keys and --ingest files two typed rows", async () => {
    const calls = [];
    const answer = (url) => {
      if (url.includes("/runner_cycles?")) return [{ outcome: "shipped", last_step: "9", started_at: "2026-09-25T20:24:37Z", notes: "n" }];
      if (url.includes("/runner_items?")) return [{ id: "i1" }, { id: "i2" }];
      if (url.includes("/runner_verdicts?")) return [{ verdict: "done", gate_build: true, gate_regression: true, gate_hygiene: true, reasoning: "r" }];
      if (url.includes("/ci_run_conclusions?")) return [{ run_id: 1 }];
      if (url.includes("/backlog_items?")) return [{ backlog_id: "AGT-137" }];
      if (url.includes("/audit_findings?")) return [];
      return undefined;
    };
    const out = path.join(tmp, "run.json");
    const code = await withFetch(fetchStub(answer, calls), () => runReview(["--prepare", `--cycle-id=${CID}`, `--out=${out}`], STUB_ENV));
    assert.strictEqual(code, 0, "a shipped cycle prepares");
    const doc = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.deepStrictEqual(Object.keys(doc), ["cycle", "items", "verdicts", "ci", "filings", "prior"],
      "all six keys, in the kickoff's order");
    assert.strictEqual(doc.items.length, 2, "the items came from runner_items, not from another read");
    assert.strictEqual(doc.verdicts[0].gate_regression, true, "the three gates ride on the verdict row");
    assert.strictEqual(calls.length, 6, `six reads, one per source (got ${calls.length})`);
    assert.ok(calls.every(c => c.method === "GET"), "a prepare writes NOTHING to the database");
    assert.ok(!calls.some(c => c.url.includes("gate_failed")),
      "control: runner_cycles carries no gate_failed column -- asking for one is a 400, so the read must not name it");

    // Nothing to review writes no file at all.
    const nope = path.join(tmp, "nope.json");
    const code3 = await withFetch(fetchStub(u => (u.includes("/runner_cycles?") ? [{ outcome: "did_not_run" }] : undefined), []),
      () => runReview(["--prepare", `--cycle-id=${CID}`, `--out=${nope}`], STUB_ENV));
    assert.strictEqual(code3, 3, "did_not_run exits 3");
    assert.ok(!fs.existsSync(nope), "and writes no file -- exit 3 costs nothing");

    // --ingest: two findings, one carrying its own type.
    const findings = [
      { kind: "contradiction", finding_type: "security", locations: [{ location: "runner_cycles:" + CID, text: "a" }],
        governing_fact: "the run shipped with a gate red", confidence: "high", proposed_resolution: "re-grade", check_slug: "run-gate-red" },
      { kind: "other", locations: [{ location: "runner_items:i1", text: "b" }],
        governing_fact: "the item carries no plain_worth", confidence: "medium", proposed_resolution: "fill it", check_slug: "run-item-thin" },
    ];
    const file = path.join(tmp, "answer.json");
    fs.writeFileSync(file, JSON.stringify({ cluster: "run-review", account: "Reviewed one run", findings }));
    const posts = [];
    const stub = fetchStub(u => (u.includes("/audit_findings?") ? [] : []), posts);
    const icode = await withFetch(stub, () => runReview([`--ingest=${file}`, `--cycle-id=${CID}`, "--apply"], STUB_ENV));
    assert.strictEqual(icode, 0, "the ingest ran");
    const images = posts.filter(p => p.method === "POST" && p.url.includes("/runner_before_images"));
    const rows = posts.filter(p => p.method === "POST" && p.url.includes("/audit_findings"));
    assert.strictEqual(images.length, 2, `one before-image per append (§19v); got ${images.length}`);
    assert.strictEqual(rows.length, 2, `two findings, two rows; got ${rows.length}`);
    for (const r of rows) {
      assert.strictEqual(r.body.found_by, `auditor:run-review:${CID}`, "every row says which run was reviewed, singular");
      assert.strictEqual(r.body.cycle_id, CID, "and is attributed to that cycle");
    }
    assert.deepStrictEqual(rows.map(r => r.body.finding_type), ["security", "defect"],
      "the finding's OWN finding_type wins; the run's `defect` only fills the one that has none");
    for (const im of images) assert.strictEqual(im.body.row_data, null, "row_data null = this row did not exist before");
  });

  // --- C. the two runbooks ----------------------------------------------------------------------
  await arm("C the runbooks carry (7e) and lost their pushes", async () => {
    const cycleMd = fs.readFileSync(CYCLE_MD, "utf8");
    const cycleBytes = Buffer.byteLength(cycleMd, "utf8");
    assert.ok(cycleBytes <= CYCLE_CEILING,
      `runner-cycle.md is ${cycleBytes} B against SES-336's ${CYCLE_CEILING} B ceiling -- this edit had to free bytes before adding any`);
    const span9 = stepSpan(cycleMd, "9");
    assert.ok(span9.includes("audit-run-review.js --prepare"),
      "step 9's span must carry the per-run review's prepare command -- (7e) is where the tail asks");
    assert.ok(span9.includes("(7e)"), "and name it (7e), after (7d)'s promote");
    assert.ok(!cycleMd.includes("runner_staff_findings` held ONE hand-written row"),
      "(7d)'s dead-history parenthetical came OUT to pay for (7e)");
    // CONTROL: the span, not the file -- a needle anywhere else must not satisfy this arm.
    assert.ok(!stepSpan(cycleMd, "8").includes("audit-run-review.js --prepare"),
      "control: step 8's span does not carry it, so the span reader is reading step 9");

    const auditorMd = fs.readFileSync(AUDITOR_MD, "utf8");
    const auditorBytes = Buffer.byteLength(auditorMd, "utf8");
    assert.ok(auditorBytes <= AUDITOR_CEILING, `auditor-routine.md is ${auditorBytes} B against the 40 KB ceiling`);
    assert.ok(auditorMd.includes("## Per-run review"), "the playbook gained its Per-run review section");
    assert.ok(/john_alerts\s+WHERE\s+notified_at\s+IS\s+NULL/.test(auditorMd),
      "step 6 reads the alerts rather than claiming them");

    const lines = lf(auditorMd).split("\n");
    const a = lines.indexOf("<!-- AUDITOR-ROUTINE-PROMPT-BEGIN -->");
    const b = lines.indexOf("<!-- AUDITOR-ROUTINE-PROMPT-END -->");
    assert.ok(a >= 0 && b > a, "the prompt block markers are whole lines");
    const block = lines.slice(a + 1, b).join("\n");
    assert.ok(block.includes("record_decision"), "the block records the summary");
    assert.ok(!block.includes("claim_john_alerts"),
      "the block must not claim alerts while notifications are off -- claim_john_alerts() stamps notified_at and would mark them told");
    assert.ok(!/push/i.test(block), "and must not push anything at John");
    // CONTROLS: each clause goes red against text with its own subject put back.
    assert.ok(/push/i.test(block + "\nsend one push per row"), "control: the no-push clause detects a push that is there");
    assert.ok(!block.split("record_decision").join("x").includes("record_decision"),
      "control: with its own subject mutated away the record_decision clause goes red -- it reads the block, not a constant");
  });

  // --- D. live, read-only -----------------------------------------------------------------------
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-137 live arm (D)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the capability row, its five links, the auditor "
      + "assignment and the agent-prompt.js assembly are unverified here. Run: node --env-file=.env.local tests/regression/agt-137-run-review.test.mjs");
  } else {
    await arm("D the capability is installed and assembles", async () => {
      const get = async q => {
        const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        assert.ok(res.ok, `${q} returned HTTP ${res.status}`);
        return res.json();
      };
      const caps = await get(`capabilities?slug=eq.${CAP}&select=slug,execution_type,tenant_id,default_intent_slug,display_phrase`);
      assert.strictEqual(caps.length, 1, "exactly one capability row");
      assert.strictEqual(caps[0].default_intent_slug, INTENT, "its default intent is the run-review intent");
      assert.strictEqual(caps[0].tenant_id, "global",
        "tenant_id must be `global` -- scripts/agent-prompt.js resolves slug=eq.<s>&tenant_id=eq.global, so a NULL tenant is unreachable");

      const links = await get(`capability_skill_profiles?capability_slug=eq.${CAP}&select=skill_profile_slug,level,is_required&order=display_order`);
      assert.strictEqual(links.length, 5, `five Skill links like audit-work-quality's; got ${links.length}`);
      assert.ok(links.some(l => l.skill_profile_slug === INTENT), "one of them is the intent");
      assert.ok(links.every(l => l.level === 2 && l.is_required), "all five required at level 2");

      const asg = await get(`agent_capability_assignments?capability_slug=eq.${CAP}&select=agent_id,tenant_id`);
      assert.deepStrictEqual(asg.map(r => `${r.tenant_id}/${r.agent_id}`), ["global/auditor"], "the Auditor holds it, nobody else");

      const taskFile = path.join(tmp, "assembly.json");
      fs.writeFileSync(taskFile, JSON.stringify({ cycle: { outcome: "shipped" }, items: [], verdicts: [], ci: [], filings: [], prior: [] }));
      const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", "agent-prompt.js"),
        "--agent=auditor", `--capability=${CAP}`, `--task-file=${taskFile}`], { cwd: ROOT, encoding: "utf8" });
      assert.strictEqual(r.status, 0, `agent-prompt.js assembles the capability (exit ${r.status}): ${(r.stderr || "").slice(0, 300)}`);
      assert.ok(/finding_type/.test(r.stdout), "and the assembled prompt carries the schema's finding_type requirement");
    });
  }

  if (failures.length) {
    throw new Error(`${failures.length} arm(s) failed:\n  - ${failures.join("\n  - ")}`);
  }
  console.log(`[AGT-137] run review: REVIEWABLE ${REVIEWABLE.join("|")} · six reads in, 2 typed rows out · `
    + `runner-cycle.md ${Buffer.byteLength(fs.readFileSync(CYCLE_MD, "utf8"), "utf8")}B <= ${CYCLE_CEILING} with (7e) in step 9 · `
    + `auditor-routine.md ${Buffer.byteLength(fs.readFileSync(AUDITOR_MD, "utf8"), "utf8")}B <= ${AUDITOR_CEILING}, prompt block records instead of pushing`);
  return ["reviewable", "refusals", "prepare", "ingest", "docs", "live"];
}

selfRun(import.meta.url, run);
export default run;
