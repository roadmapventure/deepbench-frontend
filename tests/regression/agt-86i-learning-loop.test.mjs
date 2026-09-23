// DeepBench v7.0.553 | tests/regression/agt-86i-learning-loop.test.mjs | AGT-86 slice 9a
//
// FEATURE: AGT-86 slice 9a -- the learning loop's scorecard. public.audit_check_scorecard (migration
// `agt86_s9a_check_scorecard`, applied over the Supabase MCP, SQL in docs/harvests/AGT-86.md §16.4)
// counts, per check_slug and ISO week, what the checklist found and how the Development Manager ruled
// it; scripts/audit-review.js flagChecks() marks a check 'tighten' when its last three weeks carry
// >= 3 rulings at a false-alarm rate >= 0.5, and promotableOthers() names an `other` fingerprint
// ruled real in three distinct weeks. Kickoff docs/kickoffs/v7.0.553-AGT-86-s9a-check-scorecard.md.
//
// ARMS (kickoff §6), each discriminating -- every one FAILS on the tree before the change:
//   V  VIEW + GRANTS (live) -- the service key reads the view's nine columns (200, an array); the anon
//      key is refused with a privilege denial. Pre-change: 404 PGRST205 on both, never a pass. Control:
//      a nonexistent column -> 400, so the 200 is the view answering, not a lenient endpoint.
//   F  FLAGS (pure, no DB) -- flagChecks / promotableOthers / buildTaskContext on fixture rows.
//      Pre-change: the imports are undefined -> TypeError.
//   P  LIVE PREPARE (service key, else NOT RUN) -- --prepare exits 0 (or 3 when nothing is open) and
//      its scorecard.checks length equals the view's distinct check_slugs with summed rulings >= 3.
//      Pre-change: the keys are absent.
//   C  CONTROL (no DB) -- 9b's checklist_edits is not in the script yet; no scripts/audit-*.js names
//      skill_profiles (the Auditor's path never writes its own rows).
//
// Never inserts a finding: the rolled-back fixtures live in the migration's own trailing DO block.
// Slice 9b appends its arms here.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts/audit-review.js");
const loadScript = () => import(pathToFileURL(SCRIPT).href);
const VIEW_COLS = "check_slug,iso_week,found,real,false_alarm,carried,rulings,rulings_3w,false_alarm_rate_3w";

async function call(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}
const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 240)}`;

const vrow = (check_slug, iso_week, rulings, rulings_3w, false_alarm_rate_3w, extra = {}) =>
  ({ check_slug, iso_week, found: rulings, real: 0, false_alarm: 0, carried: 0, rulings, rulings_3w, false_alarm_rate_3w, ...extra });
const frow = (id, fingerprint, iso_week, status, check_slug = "other") =>
  ({ id, fingerprint, iso_week, status, ruling: status === "open" ? null : "r", ruled_by: status === "open" ? null : "devmanager", check_slug });

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // --- F. flags (pure, no DB) ----------------------------------------------------------------------
  await arm("F flags", async () => {
    const { flagChecks, promotableOthers, buildTaskContext } = await loadScript();
    const scorecard = [
      // a: three weeks, latest 3 rulings over the window at 0.67 -> tighten (rows given out of order).
      vrow("a", "2026-W03", 1, 3, "0.67", { found: 2, carried: 1 }),
      vrow("a", "2026-W01", 1, 1, "1.00"),
      vrow("a", "2026-W02", 1, 2, "1.00"),
      // b: same volume at 0.33 -> no flag, still listed.
      vrow("b", "2026-W01", 1, 1, "1.00"),
      vrow("b", "2026-W02", 1, 2, "0.50"),
      vrow("b", "2026-W03", 1, 3, "0.33"),
      // c: summed rulings 2 -> absent.
      vrow("c", "2026-W01", 1, 1, "1.00"),
      vrow("c", "2026-W02", 1, 2, "1.00"),
      // d: summed rulings 3 (old weeks) but latest window only 2 at rate 1.00 -> listed, no flag.
      vrow("d", "2026-W01", 1, 1, "1.00"),
      vrow("d", "2026-W05", 2, 2, "1.00"),
    ];
    const checks = flagChecks(scorecard);
    assert.deepEqual(checks.map(c => c.check_slug), ["a", "b", "d"], "c (2 rulings) is absent; sorted by slug");
    const by = Object.fromEntries(checks.map(c => [c.check_slug, c]));
    assert.equal(by.a.flag, "tighten", "a: rulings_3w 3 at 0.67 -> tighten");
    assert.equal(by.b.flag, null, "b: 0.33 -> no flag");
    assert.equal(by.d.flag, null, "d: rulings_3w 2 at 1.00 -> no flag (three rulings in the window needed)");
    assert.equal(by.a.weeks.length, 3, "a carries its three week rows");
    assert.equal(by.a.weeks.find(w => w.iso_week === "2026-W03").carried, 1, "the view row's carried survives");
    assert.deepEqual(flagChecks([]), [], "no rows -> no checks");

    const promo = [
      frow("o1", "fpO", "2026-W01", "ticketed"),
      frow("o2", "fpO", "2026-W02", "escalated"),
      frow("o3", "fpO", "2026-W03", "ticketed"),
      frow("o4", "fpO", "2026-W03", "open"),
    ];
    const p = promotableOthers(promo);
    assert.equal(p.length, 1, `one promotion; got ${JSON.stringify(p)}`);
    assert.equal(p[0].fingerprint, "fpO");
    assert.deepEqual(p[0].weeks, ["2026-W01", "2026-W02", "2026-W03"]);
    assert.deepEqual([...p[0].finding_ids].sort(), ["o1", "o2", "o3"], "three finding_ids, the open row excluded");
    assert.equal(p[0].note, "promote to a new check");
    const w3nad = promo.map(r => (r.id === "o3" ? { ...r, status: "not-a-defect" } : r));
    assert.deepEqual(promotableOthers(w3nad), [], "W03 not-a-defect -> only two real weeks -> []");
    assert.deepEqual(promotableOthers(promo.filter(r => r.iso_week !== "2026-W03")), [], "two weeks -> []");
    const named = [1, 2, 3, 4].map(i => frow(`b${i}`, "fpB", `2026-W0${i}`, "ticketed", "board-stale"));
    assert.deepEqual(promotableOthers(named), [], "a named check is never promoted");

    const ctx = buildTaskContext({ week: "2026-W03", findings: [{ id: "x1", fingerprint: "fpO", iso_week: "2026-W03", kind: "other" }],
      allRows: promo, tickets: [], scorecardRows: scorecard });
    assert.deepEqual(ctx.scorecard.tighten, ["a"], "scorecard.tighten is exactly ['a']");
    assert.equal(ctx.scorecard.checks.length, 3);
    assert.equal(ctx.promotions.length, 1);
    const bare = buildTaskContext({ week: "2026-W03", findings: [{ id: "x1", fingerprint: "fpO", iso_week: "2026-W03" }], allRows: [], tickets: [] });
    assert.deepEqual(bare.scorecard, { checks: [], tighten: [] }, "no scorecardRows -> empty scorecard");
    assert.deepEqual(bare.promotions, []);
    assert.equal(buildTaskContext({ week: "2026-W03", findings: [], allRows: promo, tickets: [], scorecardRows: scorecard }), null,
      "no findings -> null, unchanged");
  });

  // --- C. controls (no DB) -------------------------------------------------------------------------
  await arm("C controls", async () => {
    await loadScript();
    const src = fs.readFileSync(SCRIPT, "utf8");
    assert.equal((src.match(/checklist_edits/g) ?? []).length, 0, "checklist_edits is 9b's -- absent in 9a");
    // The kickoff's literal `grep -l skill_profiles scripts/audit-*.js -> none` is false on the tree:
    // audit-corpus.js READS skill_profiles (the checklist corpus) and two files name it in comments.
    // The stated intent is "the Auditor's path never writes its rows", so assert no write shape.
    const WRITE = /\b(PATCH|POST|PUT|DELETE)\b[^\n]{0,160}skill_profiles|skill_profiles[^\n]{0,160}\b(PATCH|POST|PUT|DELETE)\b|\b(update|insert\s+into|delete\s+from)\s+(public\.)?skill_profiles/i;
    const hits = fs.readdirSync(path.join(ROOT, "scripts"))
      .filter(f => /^audit-.*\.js$/.test(f))
      .filter(f => WRITE.test(fs.readFileSync(path.join(ROOT, "scripts", f), "utf8")));
    assert.deepEqual(hits, [], "no scripts/audit-*.js writes skill_profiles");
    assert.ok(WRITE.test('await rest(base, key, "PATCH", "skill_profiles?slug=eq.x", {})'), "control: the write shape is detected");
  });

  if (!url || !key) {
    notRun("AGT-86i live arms (V, P)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the audit_check_scorecard view, its grants and the live --prepare scorecard are unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
    return;
  }

  // --- V. view + grants (live, read-only) ---------------------------------------------------------
  await arm("V view+grants", async () => {
    const s = await call(url, key, `audit_check_scorecard?select=${VIEW_COLS}&limit=1`);
    assert.notEqual(s.code, "PGRST205", `PGRST205 means the view does not exist -- the pre-change red; got ${describe(s)}`);
    assert.equal(s.status, 200, `service key must read the view; got ${describe(s)}`);
    assert.ok(Array.isArray(s.json), "the view answers an array");
    const ctl = await call(url, key, "audit_check_scorecard?select=nonexistent_col&limit=1");
    assert.equal(ctl.status, 400, `control: a nonexistent column must 400; got ${describe(ctl)}`);
    if (!anon) {
      notRun("AGT-86i arm V (anon half)", "VITE_SUPABASE_ANON_KEY absent -- the anon refusal of audit_check_scorecard is unverified here");
      return;
    }
    const a = await call(url, anon, "audit_check_scorecard?select=*");
    assert.notEqual(a.code, "PGRST205", `PGRST205 is the pre-change red, never a pass; got ${describe(a)}`);
    assert.ok(!a.ok, `anon must not read the scorecard; got ${describe(a)}`);
    assert.match(a.text, /42501|permission denied/, `the refusal must be a privilege denial; got ${describe(a)}`);
  });

  // --- P. live prepare (read-only) ----------------------------------------------------------------
  await arm("P prepare", async () => {
    const view = await call(url, key, "audit_check_scorecard?select=check_slug,rulings");
    assert.equal(view.status, 200, `the view must be readable; got ${describe(view)}`);
    const sums = new Map();
    for (const r of view.json) sums.set(r.check_slug, (sums.get(r.check_slug) ?? 0) + Number(r.rulings));
    const expected = [...sums.values()].filter(n => n >= 3).length;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt86i-"));
    const out = path.join(dir, "prepare.json");
    try {
      const r = spawnSync(process.execPath, [SCRIPT, "--prepare", "--week=2026-W39", `--out=${out}`],
        { cwd: ROOT, env: process.env, encoding: "utf8", timeout: 60000 });
      if (r.status === 3) {
        notRun("AGT-86i arm P (context shape)", "no open or carried findings live -- --prepare exited 3 by design; the scorecard keys are unverified on a live context");
        return;
      }
      assert.equal(r.status, 0, `--prepare must exit 0; got ${r.status}: ${r.stderr}`);
      const ctx = JSON.parse(fs.readFileSync(out, "utf8"));
      assert.ok(ctx.scorecard && Array.isArray(ctx.scorecard.checks), "scorecard.checks is an array");
      assert.ok(Array.isArray(ctx.scorecard.tighten), "scorecard.tighten is an array");
      assert.ok(Array.isArray(ctx.promotions), "promotions is an array");
      assert.equal(ctx.scorecard.checks.length, expected, `scorecard.checks = distinct check_slugs with rulings >= 3 (${expected})`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
