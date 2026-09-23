// DeepBench v7.0.550 | tests/regression/agt-86f-full-review-roots.test.mjs | AGT-86 slice 6
//
// FEATURE: AGT-86 slice 6 -- the full review reads the new places. scripts/audit-corpus.js gains
// `--extra-root=<label>=<dir>` (Claude memory/hooks, interview questions; APPENDED to the corpus,
// never a replacement) and `--private-scan=<json>`; scripts/audit-private-scan.js is the
// deterministic private-info scan over this public repo's tracked files. Kickoff:
// docs/kickoffs/v7.0.550-AGT-86-s6-full-review-roots.md.
//
// SIX ARMS, each discriminating (kickoff §6):
//   A  EXTRA ROOT -- a temp root's memory/a.md and settings.json come back as `claude-config:` statements
//      carrying project "claude-config", every statement of a plain run is still present, and the
//      per-root line and the unchanged summary line print. Pre-change: no `claude-config:` location.
//   B  MISSING ROOT -- exit 2 naming the flag. Pre-change: the unknown flag is ignored and exits 0.
//   C  DETECTORS + ALLOWLIST -- planted fakes flagged, known-safe shapes not, no planted value in any
//      finding. Pre-change: the import fails; without the allowlist the sb_publishable_ line is flagged.
//   D  AGGREGATE -- 26 hits of one detector -> 1 finding at audit-private/<detector>; 25 -> 25; two
//      different rosters give one fingerprint(). Without aggregation 26 -> 26.
//   E  LEDGER SHAPE -- every finding round-trips toRow()+fingerprint(), kind in audit_findings' CHECK set.
//   F  LIVE -- --private-scan on THIS repo writes >=1 vercel_bypass (aggregate) and >=1 personal_path;
//      audit_findings' row count is unchanged (the scan never writes the database).
//
// EVERY PLANTED VALUE IS FAKE AND ASSEMBLED FROM PIECES, so this file's own source never carries a
// shape the live scan (arm F) would report.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CORPUS = path.join(ROOT, "scripts", "audit-corpus.js");
const SUMMARY_RE = /^statements \d+ \(governance \d+, agent-data \d+, retired \d+\) duplicates \d+ stale \d+ drift (?:\d+|not-run)$/m;
// Live 2026-09-23: pg_get_constraintdef(audit_findings_kind_check).
const KIND_CHECK = ["duplicate", "contradiction", "redundant", "stale-or-irrelevant", "competing-purpose", "other"];

function node(args) {
  return spawnSync(process.execPath, [CORPUS, ...args], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

const cat = (...p) => p.join("");

export default async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); } catch (e) { failures.push(`${name}: ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt86f-"));
  const allFindings = [];

  try {
    // --- A. extra root ----------------------------------------------------------------------------
    await arm("A extra-root", async () => {
      const rootDir = path.join(tmp, "cfg");
      fs.mkdirSync(path.join(rootDir, "memory"), { recursive: true });
      fs.mkdirSync(path.join(rootDir, "node_modules", "x"), { recursive: true });
      const para = "The Auditor reads memory files as well as this repository, so a rule stated only in memory is still inside the weekly full review scope.";
      assert.ok(para.length >= 130 && para.length <= 150, `fixture paragraph is ~140 chars (${para.length})`);
      fs.writeFileSync(path.join(rootDir, "memory", "a.md"), `${para}\n`);
      fs.writeFileSync(path.join(rootDir, "settings.json"), JSON.stringify({ model: "claude-opus-5" }));
      fs.writeFileSync(path.join(rootDir, "node_modules", "x", "skip.md"), `${para} (must be skipped)\n`);

      const plainOut = path.join(tmp, "plain.json");
      const extraOut = path.join(tmp, "extra.json");
      const plain = node(["--no-db", `--out=${plainOut}`]);
      assert.equal(plain.status, 0, `plain run exits 0; stderr ${plain.stderr}`);
      const extra = node(["--no-db", `--extra-root=claude-config=${rootDir}`, `--out=${extraOut}`]);
      assert.equal(extra.status, 0, `extra-root run exits 0; stderr ${extra.stderr}`);

      const plainRows = JSON.parse(fs.readFileSync(plainOut, "utf8"));
      const extraRows = JSON.parse(fs.readFileSync(extraOut, "utf8"));
      const added = extraRows.filter(s => s.location.startsWith("claude-config:"));
      assert.ok(added.some(s => s.location.startsWith("claude-config:memory/a.md:")), "memory/a.md statement present");
      assert.ok(added.some(s => s.location.startsWith("claude-config:settings.json:")), "settings.json statement present");
      assert.equal(added.length, 2, `exactly 2 extra statements (node_modules skipped); got ${added.length}`);
      assert.ok(added.every(s => s.project === "claude-config"), "every extra statement carries project");
      assert.ok(extraRows.filter(s => !s.location.startsWith("claude-config:")).every(s => s.project === undefined),
        "this repo's statements carry no project");
      const ids = new Set(extraRows.map(s => s.id));
      const missing = plainRows.filter(s => !ids.has(s.id));
      assert.equal(missing.length, 0, `appended, never replaced: ${missing.length} plain statements missing`);
      assert.match(extra.stdout, /^extra-root claude-config: 2 statements$/m, "per-root line printed");
      assert.match(extra.stdout, SUMMARY_RE, "summary line unchanged");
      assert.ok(extra.stdout.indexOf("extra-root claude-config") < extra.stdout.search(SUMMARY_RE), "per-root line precedes the summary");
    });

    // --- B. missing root --------------------------------------------------------------------------
    await arm("B missing root", async () => {
      const bad = path.join(tmp, "does-not-exist");
      const r = node(["--no-db", `--extra-root=claude-config=${bad}`]);
      assert.equal(r.status, 2, `missing dir must exit 2; got ${r.status}`);
      assert.match(r.stderr, /--extra-root=claude-config=.* is not a directory/, `stderr names the flag; got ${r.stderr}`);
      const withAgent = node([`--agent=auditor`, `--extra-root=claude-config=${tmp}`]);
      assert.equal(withAgent.status, 2, "--extra-root with --agent refused (exit 2)");
    });

    // --- C. detectors + allowlist -----------------------------------------------------------------
    let scan;
    await arm("C detectors", async () => {
      scan = await import("../../scripts/audit-private-scan.js");
      const planted = {
        anthropic_key: cat("sk-", "ant-", "api03-FAKEfakeFAKEfake1234"),
        supabase_secret: cat("sb_", "secret_", "FAKEfake9876"),
        github_token: cat("gh", "p_", "FAKEfakeFAKEfake12345678"),
        jwt: cat("ey", "JFAKEfake12.", "eyJFAKEfake34.", "FAKEsigFAKE56"),
        vercel_bypass: cat("QqWwEeRrTtYyUuIiOoPpAaSsDdFfGgHh"),
        secret_assignment: cat("FakeBypassValueAbcdefXyz"),
        personal_email: cat("someone", "@", "gmail.com"),
        personal_path: cat("C:", "\\", "Users", "\\", "alice"),
      };
      assert.equal(planted.vercel_bypass.length, 32);
      const positive = [
        `const k = "${planted.anthropic_key}";`,
        `SUPABASE_SERVICE_KEY=${planted.supabase_secret}`,
        `token: ${planted.github_token}`,
        `Authorization: Bearer ${planted.jwt}`,
        `headers: { "x-vercel-protection-bypass": "${planted.vercel_bypass}" }`,
        `const BYPASS = '${planted.secret_assignment}';`,
        `contact ${planted.personal_email} for access`,
        `path ${planted.personal_path}\\Documents`,
      ];
      const hits = scan.scanText("fixture.txt", positive.join("\n"));
      for (const [detector, value] of Object.entries(planted)) {
        assert.ok(hits.some(h => h.detector === detector), `${detector} flagged`);
        for (const h of hits) assert.ok(!h.text.includes(value), `${detector}: planted value must not appear in any hit text`);
      }
      const negative = [
        "SUPABASE_URL=https://example.supabase.co",
        cat("VITE_SUPABASE_PUBLISHABLE_KEY=", "sb_", "publishable_Fake12345abcdef"),
        "ANTHROPIC_API_KEY=your_key_here",
        "x-vercel-protection-bypass: BYPASS_SECRET",
        cat("Co-Authored-By: Claude <", "noreply", "@anthropic.com>"),
        cat("bob", "@", "austintexas.gov"),
      ];
      const neg = scan.scanText("fixture.txt", negative.join("\n"));
      assert.deepEqual(neg.map(h => `${h.detector}@${h.line}`), [], "no known-safe shape is flagged");
      const findings = scan.aggregate(hits);
      assert.equal(findings.length, hits.length, "under the cap: one finding per hit");
      for (const f of findings) {
        const s = JSON.stringify(f);
        for (const v of Object.values(planted)) assert.ok(!s.includes(v), "no finding carries a planted value");
      }
      allFindings.push(...findings);
    });

    // --- D. aggregate -----------------------------------------------------------------------------
    await arm("D aggregate", async () => {
      scan ??= await import("../../scripts/audit-private-scan.js");
      const { fingerprint } = await import("../../scripts/audit-ledger.js");
      const lineFor = i => `see ${cat("C:", "/", "Users", "/", "user", String(i))}/x`;
      const hitsN = (n, prefix) => {
        const out = [];
        for (let i = 0; i < n; i++) out.push(...scan.scanText(`${prefix}${i % 7}.md`, `x\n${lineFor(i)}\n`));
        return out;
      };
      const h26 = hitsN(26, "a");
      assert.equal(h26.length, 26);
      const f26 = scan.aggregate(h26);
      assert.equal(f26.length, 1, `26 hits -> 1 finding; got ${f26.length}`);
      assert.equal(f26[0].locations[0].location, "audit-private/personal_path");
      assert.match(f26[0].locations[0].text, /^26 lines in 7 files: /);
      assert.match(f26[0].proposed_resolution, /26 lines/);
      assert.equal(scan.aggregate(hitsN(25, "a")).length, 25, "25 hits -> 25 findings");
      const f40 = scan.aggregate(hitsN(40, "b"));
      assert.equal(fingerprint(f26[0]), fingerprint(f40[0]), "two rosters, one fingerprint");
      allFindings.push(...f26, ...f40);
    });

    // --- F. live ----------------------------------------------------------------------------------
    await arm("F live", async () => {
      const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
      const key = process.env.SUPABASE_SERVICE_KEY ?? "";
      const count = async () => {
        const res = await fetch(`${url}/rest/v1/audit_findings?select=id`, {
          headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
        });
        assert.ok(res.ok || res.status === 206, `count read HTTP ${res.status}`);
        return Number((res.headers.get("content-range") ?? "").split("/")[1]);
      };
      const before = url && key ? await count() : null;
      const out = path.join(tmp, "private.json");
      const r = node(["--no-db", `--private-scan=${out}`]);
      assert.equal(r.status, 0, `private scan exits 0; stderr ${r.stderr}`);
      assert.match(r.stdout, /^private-scan \d+ findings$/m);
      assert.match(r.stdout, SUMMARY_RE, "summary line unchanged");
      const doc = JSON.parse(fs.readFileSync(out, "utf8"));
      assert.match(doc.week, /^\d{4}-W\d{2}$/);
      assert.equal(doc.found_by, "auditor:private-scan");
      const byFact = d => doc.findings.filter(f => f.governing_fact.startsWith(`${d} `));
      const bypass = byFact("vercel_bypass");
      assert.ok(bypass.some(f => f.locations[0].location === "audit-private/vercel_bypass"), "the bypass literal is aggregated");
      assert.ok(byFact("personal_path").length >= 1, ">=1 personal_path finding");
      assert.ok(!r.stdout.includes("****"), "stdout carries counts only");
      allFindings.push(...doc.findings);
      if (before === null) {
        notRun("AGT-86f arm F (ledger unchanged)", "SUPABASE_URL/SUPABASE_SERVICE_KEY absent -- audit_findings count unchanged is unverified here; run with --env-file-if-exists=.env.local");
        return;
      }
      assert.equal(await count(), before, "audit_findings count unchanged");
    });

    // --- E. ledger shape --------------------------------------------------------------------------
    await arm("E ledger shape", async () => {
      const { toRow, fingerprint } = await import("../../scripts/audit-ledger.js");
      assert.ok(allFindings.length > 0, "arms C/D/F produced findings");
      for (const f of allFindings) {
        assert.ok(KIND_CHECK.includes(f.kind), `kind ${f.kind} in the CHECK set`);
        assert.equal(f.check_slug, "config-private-in-public");
        const row = toRow(f, { week: "2026-W39", foundBy: "auditor:private-scan", cycleId: null, id: "x" });
        assert.equal(row.fingerprint, fingerprint(f));
        assert.equal(row.kind, "other");
        assert.equal(row.confidence, "high");
        assert.ok(Array.isArray(row.locations) && row.locations.length >= 1);
        assert.ok(row.governing_fact && row.proposed_resolution);
      }
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
