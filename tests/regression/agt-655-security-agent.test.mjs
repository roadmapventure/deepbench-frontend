// DeepBench v7.0.1015 | tests/regression/agt-655-security-agent.test.mjs | AGT-655 -- the security advisor's call path: a fourth record store, the write check, the findings ingest file, the runbook's three routine blocks, and the strategy store's `security` read
// Kickoff: docs/kickoffs/v7.0.1015-AGT-655-trenton-call-path.md section 5, T4.
//
//   A  MAPS -- SECURITY_READ_MAP's keys are exactly the five security-* slugs and every kind it reads is
//      one of the twelve SECURITY_KINDS; the security store reads every correction and grade; every
//      security slug reads `inventory` and only the exposure scan reads `inventory_previous`; the
//      strategy advise and readiness slugs read `security`; READ_MAP, HUMOR_READ_MAP and
//      STRATEGY_READ_MAP are byte-same as origin/dev; the agent id appears in the script only on `//`
//      lines (control: a copy with `const a = 'trenton';` spliced in fails).
//   B  WRITE CHECK -- validateSecurityAnswer() passes a minimal advise answer; it refuses an unknown
//      kind, an empty title, a gap with no cost, a gap tier `urgent`, a document `approved` from the
//      model, a classification label `secret`, and an answer carrying a fake key shaped like a
//      private-scan detector (the github_token and anthropic_key detectors -- the aws_key detector never
//      fires, a known AGT-654 fact, so it is not used). Each refusal is paired with a passing control.
//      capInventory() drops an over-cap section's arrays and keeps its counts.
//   C  FINDINGS FILE -- the ingest document built from two gap fixtures passes audit-ledger.js's own
//      checks: findingTypeOf() and toRow() accept every finding, ingestFindings() classifies the batch as
//      a dry run (stub transports, nothing written), and every value is in the intake's allowed sets.
//      LIVE (credentials): the real CLI dry run, no --apply, exits 0 or 1 (1 = new findings to file),
//      never 2.
//   D  RUNBOOK -- the six marker lines appear once each as whole lines; line 1 of each of the three
//      blocks is the STEP 0 meter stop byte for byte, the strategy runbook's own line (control: one
//      character off fails); the three crons are present; the file carries no model id and no `trig_`
//      (each pattern proved to fire on a violating copy).
//   E  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else notRun) -- `--render --agent=trenton
//      --capability=security-advise --ask=test --json` exits 0 with prompt_bytes < 200000 and carries
//      the newest inventory's collected_at; `--render --agent=harry --capability=strategy-advise
//      --ask=test --json` exits 0 and its task details carry a `security` key. Renders only: no write.
//
// Pre-change on the unchanged tree: the named imports below do not exist, so the module fails to link
// and every arm is red; the runbook does not exist; the security render exits 2 ("not in the read map").

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  READ_MAP, HUMOR_READ_MAP, STRATEGY_READ_MAP, SECURITY_READ_MAP, SECURITY_KINDS, EXTRA_READS, storeFor,
  validateSecurityAnswer, findingsFromGaps, capInventory, INVENTORY_SECTION_BYTES, INVENTORY_TOTAL_BYTES,
} from "../../scripts/personal-agent.js";
import { ingestFindings, findingTypeOf, toRow, FINDING_TYPES, isoWeek } from "../../scripts/audit-ledger.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AGENT = path.join(ROOT, "scripts", "personal-agent.js");
const LEDGER = path.join(ROOT, "scripts", "audit-ledger.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "security-agent.md");
const STRATEGY_RUNBOOK = path.join(ROOT, "docs", "runbooks", "strategy-agent.md");
const lf = t => String(t).replace(/\r\n/g, "\n");

const SLUGS = ["security-advise", "security-deep-check", "security-document-draft", "security-exposure-scan", "security-weekly-review"];
const STEP0 = "STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.";
const MARKERS = {
  scan: ["<!-- TRENTON-EXPOSURE-SCAN-PROMPT-BEGIN -->", "<!-- TRENTON-EXPOSURE-SCAN-PROMPT-END -->"],
  review: ["<!-- TRENTON-WEEKLY-REVIEW-PROMPT-BEGIN -->", "<!-- TRENTON-WEEKLY-REVIEW-PROMPT-END -->"],
  deep: ["<!-- TRENTON-DEEP-CHECK-PROMPT-BEGIN -->", "<!-- TRENTON-DEEP-CHECK-PROMPT-END -->"],
};
const CRONS = ["15 11 * * 1-5", "30 11 * * 2", "0 12 1 * *"];
// The intake's allowed values (kickoff section 2).
const LEDGER_KINDS = ["duplicate", "contradiction", "redundant", "stale-or-irrelevant", "competing-purpose", "other"];
const CONFIDENCES = ["high", "medium", "low"];
const FAMILIES = ["service", "blocked", "flow", "outcome", "paperwork", "other"];

const nameOnlyInComments = src => lf(src).split("\n").every(l => !/\btrenton\b/.test(l) || l.trim().startsWith("//"));
const blockOf = (src, name) => {
  const s = lf(src);
  const a = s.indexOf(`export const ${name} = {`);
  if (a < 0) return null;
  return s.slice(a, s.indexOf("\n};", a) + 3);
};

const ok = (answer, why) => {
  const r = validateSecurityAnswer("security-advise", answer);
  assert.equal(r.ok, true, `${why} passes (errors: ${JSON.stringify(r.errors)})`);
};
const refused = (answer, re, why) => {
  const r = validateSecurityAnswer("security-advise", answer);
  assert.equal(r.ok, false, `${why} is refused`);
  assert.ok(r.errors.some(e => re.test(e)), `${why}: an error matches ${re} (got ${JSON.stringify(r.errors)})`);
};
const one = (kind, data, extra = {}) => ({ records_to_write: [{ kind, title: "t", data, ...extra }] });
const GAP = { control: "AC-2", tier: "blocker", fix: "add a login gate", effort: "1 day", cost: "none", risk: "an open endpoint", where: "api/x.js" };
const GAP2 = { control: "CP-9", tier: "should_fix", fix: "test a restore", effort: "2 hours", cost: "none", confidence: "high" };

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt655-"));
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const live = Boolean(url && key);

  try {
    await arm("A maps", async () => {
      assert.deepEqual(SECURITY_KINDS, ["inventory", "classification", "gap", "scorecard", "decision", "digest", "source", "document", "alert", "call", "correction", "grade"]);
      assert.deepEqual(Object.keys(SECURITY_READ_MAP).sort(), SLUGS);
      for (const [slug, kinds] of Object.entries(SECURITY_READ_MAP)) {
        for (const k of kinds) assert.ok(SECURITY_KINDS.includes(k), `${slug} reads ${k}, not a security kind`);
      }
      const store = storeFor("security-advise");
      assert.equal(store.table, "security_records");
      assert.equal(store.allCorrections, true);
      assert.deepEqual(store.correctionKinds, ["correction", "grade"]);
      assert.equal(storeFor("strategy-advise").table, "strategy_records", "control: a strategy slug stays on its own store");
      const reads = s => [].concat(EXTRA_READS[s] ?? []);
      for (const s of SLUGS) {
        assert.ok(reads(s).includes("inventory"), `${s} reads the inventory`);
        assert.equal(reads(s).includes("inventory_previous"), s === "security-exposure-scan", `${s} inventory_previous`);
      }
      for (const s of ["strategy-advise", "strategy-readiness-check"]) assert.ok(reads(s).includes("security"), `${s} reads security`);
      assert.ok(!reads("strategy-daily-brief").includes("security"), "control: the daily brief does not read security");

      const src = fs.readFileSync(AGENT, "utf8");
      const dev = spawnSync("git", ["-C", ROOT, "show", "origin/dev:scripts/personal-agent.js"], { encoding: "utf8", maxBuffer: 1 << 26 });
      if (dev.status === 0 && dev.stdout) {
        for (const name of ["READ_MAP", "HUMOR_READ_MAP", "STRATEGY_READ_MAP"]) {
          const was = blockOf(dev.stdout, name);
          assert.ok(was, `origin/dev carries ${name}`);
          assert.equal(blockOf(src, name), was, `${name} source text is byte-same as origin/dev`);
        }
      } else {
        console.log("    A: origin/dev not showable here -- the byte check did not run");
        assert.ok(READ_MAP["career-resume-review"] && HUMOR_READ_MAP["humor-weekly-draft"] && STRATEGY_READ_MAP["strategy-advise"]);
      }
      assert.ok(nameOnlyInComments(src), "the agent id appears outside a `//` line of scripts/personal-agent.js");
      const spliced = src.replace("const TENANT = 'global';", "const TENANT = 'global';\nconst a = 'trenton';");
      assert.notEqual(spliced, src, "control: the splice anchor exists");
      assert.ok(!nameOnlyInComments(spliced), "control: a spliced `const a = 'trenton';` must fail the name check");
    });

    await arm("B write check", async () => {
      ok({ records_to_write: [{ kind: "decision", title: "keep the login gate", data: { reason: "x" } }], answer: "plain words" }, "a minimal advise answer");
      ok({ records_to_write: [] }, "an answer that writes nothing");

      refused(one("posting", {}), /unknown kind "posting"/, "an unknown kind");
      ok(one("alert", {}), "control: the same record with a known kind");

      refused({ records_to_write: [{ kind: "decision", title: "  ", data: {} }] }, /has no title/, "an empty title");
      ok({ records_to_write: [{ kind: "decision", title: "t", data: {} }] }, "control: the same record with a title");

      const { cost, ...noCost } = GAP;
      refused(one("gap", noCost), /data\.cost/, "a gap with no cost");
      ok(one("gap", GAP), "control: the same gap with a cost");

      refused(one("gap", { ...GAP, tier: "urgent" }), /data\.tier must be one of/, "a gap tier urgent");
      ok(one("gap", { ...GAP, tier: "nice_to_have" }), "control: the same gap tier nice_to_have");

      refused(one("document", { status: "approved" }), /approved/, "a document approved from the model");
      ok(one("document", { status: "draft" }), "control: the same document as a draft");

      refused(one("classification", { store: "public.x", label: "secret" }), /data\.label must be one of/, "a classification label secret");
      ok(one("classification", { store: "public.x", label: "client_confidential" }), "control: the same classification labelled client_confidential");

      // Built at run time so this file never carries a detector-shaped literal.
      const fakeGh = "ghp" + "_" + "Z9".repeat(12);
      const fakeAnt = "sk" + "-ant-" + "q7".repeat(10);
      refused(one("gap", { ...GAP, fix: `rotate ${fakeGh}` }), /github_token/, "a fake github token in a gap fix");
      refused({ records_to_write: [], answer: `the key is ${fakeAnt}` }, /anthropic_key/, "a fake anthropic key in the answer text");
      ok(one("gap", { ...GAP, fix: "rotate the GITHUB_TOKEN secret by name" }), "control: naming the secret, not its value");
      ok({ records_to_write: [], answer: "the key is in runner_secrets by name" }, "control: the answer text with no value");

      const big = { mode: "cloud", collected_at: "2026-11-13T00:00:00Z", database: { tables: 3, detail: { tables: Array.from({ length: 2000 }, (_, i) => ({ name: `t${i}`, rls: true })), auth_users: 1 } }, api: { routes: [{ a: 1 }] } };
      const capped = capInventory(big);
      assert.equal(capped.database.truncated, true, "an over-cap section is marked truncated");
      assert.equal(capped.database.tables, 3, "it keeps its counts");
      assert.equal(capped.database.detail.auth_users, 1, "it keeps nested counts");
      assert.ok(!("tables" in capped.database.detail), "it drops its arrays");
      assert.deepEqual(capped.api, big.api, "control: an under-cap section is untouched");
      assert.equal(capped.collected_at, big.collected_at, "collected_at stays");
      assert.ok(Buffer.byteLength(JSON.stringify(capped)) < INVENTORY_TOTAL_BYTES && INVENTORY_SECTION_BYTES === 40000);
    });

    await arm("C findings file", async () => {
      const rows = [
        { kind: "gap", title: "an endpoint answers without login", data: GAP },
        { kind: "decision", title: "not a gap", data: {} },
        { kind: "gap", title: "no restore drill on record", data: GAP2 },
      ];
      const doc = findingsFromGaps(rows, "agt-655-regression");
      assert.equal(doc.found_by, "session:agt-655-regression");
      assert.equal(doc.findings.length, 2, "one finding per gap, none for the decision");
      const [f1, f2] = doc.findings;
      assert.equal(f1.governing_fact, "AC-2: an open endpoint");
      assert.equal(f1.proposed_resolution, "add a login gate (effort 1 day, cost none, tier blocker)");
      assert.deepEqual(f1.locations, [{ location: "api/x.js", text: "an endpoint answers without login" }]);
      assert.equal(f1.confidence, "medium", "no data.confidence -> medium");
      assert.equal(f2.confidence, "high");
      assert.equal(f2.locations[0].location, "inventory", "no data.where -> inventory");
      for (const f of doc.findings) {
        assert.ok(LEDGER_KINDS.includes(f.kind), `kind ${f.kind}`);
        assert.ok(FINDING_TYPES.includes(f.finding_type), `finding_type ${f.finding_type}`);
        assert.ok(CONFIDENCES.includes(f.confidence), `confidence ${f.confidence}`);
        assert.ok(FAMILIES.includes(f.family), `family ${f.family}`);
        assert.equal(findingTypeOf(f, null), "security");
        const row = toRow(f, { week: isoWeek(new Date()), foundBy: doc.found_by, sessionName: "agt-655-regression", id: "00000000-0000-4000-8000-000000000001" });
        for (const k of ["fingerprint", "kind", "locations", "governing_fact", "confidence", "proposed_resolution", "finding_type", "family", "found_by"]) {
          assert.ok(row[k] !== undefined && row[k] !== null, `toRow carries ${k}`);
        }
      }
      assert.throws(() => findingTypeOf({ ...f1, finding_type: undefined }, null), /finding_type is required/, "control: the ledger's own check refuses a finding with no type");
      let posts = 0;
      const dry = await ingestFindings({ findings: doc.findings, foundBy: doc.found_by, get: async () => [], post: async () => { posts++; }, apply: false });
      assert.equal(dry.summary.new, 2, "a dry run classifies both as new");
      assert.equal(posts, 0, "a dry run writes nothing");

      if (!live) { notRun("AGT-655 arm C live CLI dry run", "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the ledger's read is unreachable here"); return; }
      const file = path.join(tmp, "findings.json");
      fs.writeFileSync(file, JSON.stringify(doc, null, 2), "utf8");
      const r = spawnSync(process.execPath, [LEDGER, `--ingest=${file}`, `--week=${isoWeek(new Date())}`, "--session-name=agt-655-regression"],
        { encoding: "utf8", env: { ...process.env }, timeout: 120000 });
      assert.ok(r.status === 0 || r.status === 1, `the CLI dry run exits 0 or 1, never 2 (got ${r.status}: ${(r.stderr ?? "").slice(-300)})`);
      assert.match(r.stdout, /ingest \d{4}-W\d{2}: 2 findings/, `the dry run read both findings: ${r.stdout}`);
      console.log(`    C live: ${r.stdout.trim()} (exit ${r.status}, no --apply)`);
    });

    await arm("D runbook", async () => {
      const md = lf(fs.readFileSync(RUNBOOK, "utf8"));
      const lines = md.split("\n");
      const blocks = {};
      for (const [name, [begin, end]] of Object.entries(MARKERS)) {
        for (const m of [begin, end]) assert.equal(lines.filter(l => l === m).length, 1, `${m} is a whole line exactly once`);
        const a = lines.indexOf(begin), b = lines.indexOf(end);
        assert.ok(a >= 0 && b > a, `${name} markers in order`);
        blocks[name] = lines.slice(a + 1, b);
      }
      assert.equal(Object.keys(blocks).length, 3, "three routine blocks");
      const strategy = lf(fs.readFileSync(STRATEGY_RUNBOOK, "utf8"));
      assert.ok(strategy.split("\n").includes(STEP0), "the pinned STEP0 is the strategy runbook's own line");
      const opensWithStep0 = block => block[0] === STEP0;
      for (const [name, block] of Object.entries(blocks)) {
        assert.ok(opensWithStep0(block), `${name} block line 1 is the STEP 0 meter stop, byte for byte`);
        assert.ok(!opensWithStep0([STEP0.replace("2026-10-17", "2026-10-18"), ...block.slice(1)]), `control: a ${name} line 1 one character off fails`);
        assert.ok(!block.some(l => /--local/.test(l) && !/no --local/.test(l)), `${name}: a cloud run omits --local`);
      }
      for (const cron of CRONS) assert.ok(md.includes(cron), `the runbook carries cron ${cron}`);
      assert.ok(/\| enabled \| `false` \| `false` \| `false` \|/.test(md), "all three routines are enabled false");
      assert.ok(/\| routine id \| not yet created \| not yet created \| not yet created \|/.test(md), "no routine id yet");
      const forbidden = [
        ["model id", /\bclaude-(opus|sonnet|haiku|fable)-\d/i, "claude-opus-5"],
        ["trigger id", /trig_/, "trig_01abc"],
      ];
      for (const [what, re, violation] of forbidden) {
        assert.ok(!re.test(md), `the runbook carries no ${what}`);
        assert.ok(re.test(md + "\n" + violation), `control: ${what} is detectable when present`);
      }
    });

    await arm("E live renders", async () => {
      if (!live) {
        notRun("AGT-655 arm E (security-advise and strategy-advise renders)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- security_records and the inventory are unreadable here, so the live half is UNVERIFIED. Arms A-D DID run. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const render = (agent, cap, out) => {
        const r = spawnSync(process.execPath, [AGENT, "--render", `--agent=${agent}`, `--capability=${cap}`, "--ask=test", `--out=${out}`, "--json"],
          { encoding: "utf8", env: { ...process.env }, maxBuffer: 1 << 26, timeout: 180000 });
        assert.equal(r.status, 0, `${cap} render exits 0 (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
        return JSON.parse(r.stdout.trim().split("\n").pop());
      };
      const secOut = path.join(tmp, "security.md");
      const sec = render("trenton", "security-advise", secOut);
      assert.ok(Number.isFinite(sec.prompt_bytes) && sec.prompt_bytes > 0 && sec.prompt_bytes < 200000, `security-advise prompt_bytes ${sec.prompt_bytes} under 200000`);
      const svc = { apikey: key, Authorization: `Bearer ${key}` };
      const inv = await fetch(`${url}/rest/v1/security_records?kind=eq.inventory&select=id,data->>collected_at&order=created_at.desc,id.desc&limit=1`, { headers: svc });
      assert.equal(inv.status, 200, `the service key reads security_records (HTTP ${inv.status})`);
      const [newest] = await inv.json();
      assert.ok(newest?.collected_at, "an inventory row exists");
      const text = fs.readFileSync(secOut, "utf8");
      assert.ok(text.includes(newest.collected_at), `the render carries the newest inventory's collected_at ${newest.collected_at}`);
      assert.ok(!text.includes("1999-01-01T00:00:00.000Z"), "control: an absent timestamp is not found");

      const harryOut = path.join(tmp, "strategy.md");
      const strat = render("harry", "strategy-advise", harryOut);
      const stext = lf(fs.readFileSync(harryOut, "utf8"));
      const line = stext.split("\n").find(l => l.startsWith("security: "));
      assert.ok(line, "the strategy-advise task details carry a `security` key");
      const posture = JSON.parse(line.slice("security: ".length));
      assert.ok("scorecard" in posture && Array.isArray(posture.open_blockers), `security carries scorecard and open_blockers: ${line.slice(0, 200)}`);
      console.log(`    E renders: security-advise model ${sec.model}, prompt_bytes ${sec.prompt_bytes}; strategy-advise model ${strat.model}, prompt_bytes ${strat.prompt_bytes}; ${line.slice(0, 120)}`);
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
