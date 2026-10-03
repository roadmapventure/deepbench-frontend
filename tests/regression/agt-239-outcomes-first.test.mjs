// DeepBench v7.0.661 | tests/regression/agt-239-outcomes-first.test.mjs | AGT-239
// FEATURE: AGT-239 -- THE AUDITOR CHECKS OUTCOMES FIRST. Kickoff:
// docs/kickoffs/v7.0.661-AGT-239-outcomes-first.md §5 task 6 and §6.
//
// FOUR ARMS; A and B run offline, C and D need credentials and are declared notRun without them:
//   A  PURE -- buildTaskContext() under the default `outcomes` scope drops `paperwork` and orders
//      [paperwork, other, blocked, service] as service, blocked, other (rank 0, 1, 2; stable within a
//      rank); `--weekly` keeps all four; every row carries family and rank; the context carries its
//      scope. CONTROL: the same order check run over the unsorted input FAILS, so the check reads the
//      order rather than passing anything. origin/dev keeps input order and all four -- red.
//   B  TRANSPORT (stubs, no network) -- audit-run-review.js --prepare files the flow rpc's two rows
//      with found_by `auditor:flow:<cycle>`, the cycle's attribution, one before-image each and their
//      OWN family (blocked, flow); --ingest keeps `outcome` and nulls every other family.
//      audit-review.js --apply (a child process against a local stub server) sends the context's
//      `scope` in p_review, and sends NO scope for a context that has none (the function reads that
//      as weekly). toRow() passes family through, null when absent.
//   C  LIVE (service key, read-only) -- rpc/audit_flow_checks answers an array of >= 1 element, each
//      with the eight keys, a family of blocked or flow, and a check_slug from the four.
//   D  LIVE (anon key) -- rpc/audit_flow_checks is DENIED to the public key (42501), while the same
//      call with the service key succeeded in C: the pair proves the gate, not a broken function.
//
// NO WRITES ANYWHERE IN THIS FILE: B's posts land in stubs and a temp dir; C and D are one rpc read
// each (audit_flow_checks() is STABLE).

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { buildTaskContext, rankOf } from "../../scripts/audit-review.js";
import { run as runReview } from "../../scripts/audit-run-review.js";
import { toRow } from "../../scripts/audit-ledger.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REVIEW = path.join(ROOT, "scripts", "audit-review.js");
const CID = "4313b4c0-fc8c-4a3a-85d9-0e1ac6c759a2";
const STUB_ENV = { SUPABASE_URL: "https://stub.invalid", SUPABASE_SERVICE_KEY: "stub-key" };
const EIGHT = ["kind", "finding_type", "confidence", "check_slug", "family", "locations", "governing_fact", "proposed_resolution"];
const SLUGS = ["flow-ship-not-closed", "flow-verdict-gate-red", "flow-wasted-cycles", "flow-filing-outpaces-closing"];

// True when the list's ranks never go down -- the property D4 promises.
export function rankOrdered(list) {
  return list.every((w, i) => i === 0 || rankOf(list[i - 1].family) <= rankOf(w.family));
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

// A local PostgREST stand-in for the child process: records every request, answers the two calls
// --apply makes.
async function stubServer() {
  const seen = [];
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", c => { data += c; });
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, body: data ? JSON.parse(data) : null });
      res.setHeader("Content-Type", "application/json");
      if (req.url.startsWith("/rest/v1/rpc/apply_audit_review")) {
        res.end(JSON.stringify({ decision_id: "00000000-0000-0000-0000-000000000239", tickets: [], counts: {} }));
      } else {
        res.end("[]");
      }
    });
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  return { seen, base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) };
}

function runChild(args, env) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, [REVIEW, ...args], { cwd: ROOT, env: { ...process.env, ...env } });
    let out = "", err = "";
    p.stdout.on("data", c => { out += c; });
    p.stderr.on("data", c => { err += c; });
    p.on("close", code => resolve({ code, out, err }));
  });
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt239-"));
  const f = (id, family) => ({ id, fingerprint: `fp-${id}`, iso_week: "2026-W39", kind: "other", family,
    found_by: "x:y", finding_type: "defect", locations: [], governing_fact: id });
  const fixture = [f("p1", "paperwork"), f("o1", "other"), f("b1", "blocked"), f("s1", "service")];

  // --- A. rank and scope ----------------------------------------------------------------------
  await arm("A rank order and scope", async () => {
    const ctx = buildTaskContext({ week: "2026-W39", findings: fixture, allRows: [], tickets: [] });
    assert.strictEqual(ctx.scope, "outcomes", "the default scope is the per-run one");
    assert.deepStrictEqual(ctx.worklist.map(w => w.family), ["service", "blocked", "other"],
      "outcomes scope: paperwork dropped, service before blocked before the rest");
    assert.deepStrictEqual(ctx.worklist.map(w => w.rank), [0, 1, 2], "every row carries its rank");
    assert.ok(rankOrdered(ctx.worklist), "the worklist is rank-ordered");

    const weekly = buildTaskContext({ week: "2026-W39", findings: fixture, allRows: [], tickets: [], scope: "weekly" });
    assert.strictEqual(weekly.scope, "weekly");
    assert.deepStrictEqual(weekly.worklist.map(w => w.id), ["s1", "b1", "p1", "o1"],
      "weekly keeps all four; paperwork and other share rank 2 and keep their input order (stable)");

    assert.strictEqual(buildTaskContext({ week: "2026-W39", findings: [f("p2", "paperwork")], allRows: [], tickets: [] }), null,
      "a worklist that is all paperwork is nothing to review per run -- exit 3, no manager cost");

    // CONTROL: the order check fails on the unsorted input, so it is reading the order.
    assert.ok(!rankOrdered(fixture), "control: the unsorted fixture must FAIL the order check");
  });

  // --- B. filing, ingest and apply -------------------------------------------------------------
  await arm("B flow rows filed with their family; --apply sends scope", async () => {
    const flow = [
      { kind: "other", finding_type: "defect", confidence: "high", check_slug: "flow-ship-not-closed", family: "blocked",
        locations: [{ location: "projects/demo", text: "3 delivered" }],
        governing_fact: "A delivered ticket must be closed.", proposed_resolution: "close it" },
      { kind: "other", finding_type: "defect", confidence: "high", check_slug: "flow-wasted-cycles", family: "flow",
        locations: [{ location: "runner_cycles/window", text: "9 of 20" }],
        governing_fact: "A wasted cycle moves no ticket.", proposed_resolution: "find the cause" },
    ];
    const calls = [];
    const answer = url => {
      if (url.includes("/runner_cycles?")) return [{ outcome: "shipped", last_step: "9", started_at: "2026-09-27T10:00:00Z", notes: "n" }];
      if (url.includes("/rpc/audit_flow_checks")) return flow;
      if (url.includes("/audit_findings?family=eq.service")) return [{ id: "svc1", check_slug: "db-restarted" }];
      if (url.includes("?") || url.includes("/runner_before_images") || url.includes("/audit_findings")) return [];
      return undefined;
    };
    const out = path.join(tmp, "run.json");
    const code = await withFetch(fetchStub(answer, calls), () => runReview(["--prepare", `--cycle-id=${CID}`, `--out=${out}`], STUB_ENV));
    assert.strictEqual(code, 0, "a shipped cycle prepares");
    const doc = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.deepStrictEqual(Object.keys(doc).slice(0, 2), ["service", "flow"], "service and flow lead the doc");
    assert.strictEqual(doc.service[0].id, "svc1", "the open service rows came from the service read");
    const rows = calls.filter(c => c.method === "POST" && /\/rest\/v1\/audit_findings$/.test(c.url));
    const images = calls.filter(c => c.method === "POST" && c.url.endsWith("/runner_before_images"));
    assert.strictEqual(rows.length, 2, `both flow findings filed; got ${rows.length}`);
    assert.strictEqual(images.length, 2, "one before-image per append (§19v)");
    assert.deepStrictEqual(rows.map(r => r.body.found_by), [`auditor:flow:${CID}`, `auditor:flow:${CID}`]);
    assert.deepStrictEqual(rows.map(r => r.body.family), ["blocked", "flow"], "each row keeps the family the check set");
    assert.ok(rows.every(r => r.body.cycle_id === CID), "attributed to the reviewed cycle");

    // --ingest: only `outcome` is the reviewer's to set.
    const file = path.join(tmp, "answer.json");
    const g = (fam, fact) => ({ kind: "other", family: fam, locations: [{ location: `runner_items:${fact}`, text: "t" }],
      governing_fact: fact, confidence: "high", proposed_resolution: "r", check_slug: "run-x" });
    fs.writeFileSync(file, JSON.stringify({ cluster: "c", account: "a", findings: [g("outcome", "f1"), g("paperwork", "f2"), g(undefined, "f3")] }));
    const posts = [];
    await withFetch(fetchStub(() => [], posts), () => runReview([`--ingest=${file}`, `--cycle-id=${CID}`, "--apply"], STUB_ENV));
    const irows = posts.filter(p => p.method === "POST" && /\/audit_findings$/.test(p.url));
    assert.deepStrictEqual(irows.map(r => r.body.family), ["outcome", null, null],
      "outcome kept; paperwork and none go in null for the trigger to file by found_by");

    // toRow passes family through, null when absent.
    const base = { kind: "other", locations: [], governing_fact: "x", confidence: "high", proposed_resolution: "y", finding_type: "defect" };
    assert.strictEqual(toRow({ ...base, family: "service" }, { week: "2026-W39", foundBy: "t", id: "i" }).family, "service");
    assert.strictEqual(toRow(base, { week: "2026-W39", foundBy: "t", id: "i" }).family, null);

    // --apply sends the context's scope; a context with none sends none.
    const srv = await stubServer();
    try {
      const ctxFile = path.join(tmp, "ctx.json");
      const ansFile = path.join(tmp, "ans.json");
      fs.writeFileSync(ansFile, JSON.stringify({ groups: [{ kind: "not-a-defect", finding_ids: ["f1"], reason: "r" }],
        summary_for_john: "s", patterns_applied: [] }));
      const env = { SUPABASE_URL: srv.base, SUPABASE_SERVICE_KEY: "stub-key" };
      const apply = ["--apply=" + ansFile, "--context=" + ctxFile, "--week=2026-W39", "--session-name=agt239-test"];

      fs.writeFileSync(ctxFile, JSON.stringify({ week: "2026-W39", scope: "outcomes", worklist: [{ id: "f1", weeks_seen: 1 }], routes: [], projects: [] }));
      const r1 = await runChild(apply, env);
      assert.strictEqual(r1.code, 0, `--apply exits 0: ${r1.err}`);
      const call1 = srv.seen.find(s => s.url.startsWith("/rest/v1/rpc/apply_audit_review"));
      assert.strictEqual(call1.body.p_review.scope, "outcomes", "the per-run scope rides in p_review");

      srv.seen.length = 0;
      fs.writeFileSync(ctxFile, JSON.stringify({ week: "2026-W39", worklist: [{ id: "f1", weeks_seen: 1 }], routes: [], projects: [] }));
      const r2 = await runChild(apply, env);
      assert.strictEqual(r2.code, 0, `--apply exits 0: ${r2.err}`);
      const call2 = srv.seen.find(s => s.url.startsWith("/rest/v1/rpc/apply_audit_review"));
      assert.ok(!("scope" in call2.body.p_review), "control: a context without scope sends none (the function reads weekly)");
    } finally {
      await srv.close();
    }
  });

  // --- C / D. live ------------------------------------------------------------------------------
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  const rpc = (k) => fetch(`${url}/rest/v1/rpc/audit_flow_checks`, {
    method: "POST", headers: { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" }, body: "{}",
  });
  if (!url || !key) {
    notRun("AGT-239 live arm (C)", "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- rpc/audit_flow_checks is unverified here. Run: node --env-file-if-exists=.env.local tests/regression/agt-239-outcomes-first.test.mjs");
  } else {
    await arm("C live audit_flow_checks answers flow findings", async () => {
      const res = await rpc(key);
      assert.ok(res.ok, `rpc/audit_flow_checks returned HTTP ${res.status} -- a 404 is the pre-change red`);
      const list = await res.json();
      assert.ok(Array.isArray(list) && list.length >= 1, `>= 1 flow finding on live data; got ${JSON.stringify(list).slice(0, 200)}`);
      for (const el of list) {
        assert.deepStrictEqual(EIGHT.filter(k => !(k in el)), [], `every element carries the eight keys: ${JSON.stringify(el).slice(0, 200)}`);
        assert.ok(["blocked", "flow"].includes(el.family), `family is blocked or flow, got ${el.family}`);
        assert.ok(SLUGS.includes(el.check_slug), `check_slug is one of the four, got ${el.check_slug}`);
      }
      console.log(`      live flow: ${list.map(e => `${e.check_slug}@${e.locations[0].location}`).join(", ")}`);
    });
  }
  if (!url || !anon) {
    notRun("AGT-239 live arm (D)", "SUPABASE_URL + VITE_SUPABASE_ANON_KEY absent -- the anon denial of rpc/audit_flow_checks is unverified here");
  } else {
    await arm("D anon is denied", async () => {
      const res = await rpc(anon);
      const text = await res.text();
      assert.notStrictEqual(res.status, 404, "404 means the function does not exist -- the pre-change red, never a pass");
      assert.ok(!res.ok, `the public key must not run audit_flow_checks; got HTTP ${res.status}`);
      assert.match(text, /42501|permission denied/, `the refusal is a privilege denial; got ${text.slice(0, 200)}`);
    });
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n  - ${failures.join("\n  - ")}`);
  console.log("[AGT-239] outcomes first: rank service>blocked>rest, paperwork weekly-only, flow rows filed with family, scope sent");
  return ["rank", "scope", "filing", "ingest", "apply", "live"];
}

selfRun(import.meta.url, run);
export default run;
