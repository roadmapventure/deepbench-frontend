// DeepBench v7.0.554 | tests/regression/agt-86i-learning-loop.test.mjs | AGT-86 slice 9b -- the manager
// ACTS: apply_audit_review() takes p_review.checklist_edits (migration `agt86_s9b_checklist_edits`), the
// allowlist refuses au-identity / au-guardrails / non-au rows before the per-group loop, the intent row
// learns TIGHTEN/PROMOTE and the checklist_edits contract, --prepare carries `checklist`. Kickoff
// docs/kickoffs/v7.0.554-AGT-86-s9b-checklist-edits.md §6. Arms added:
//   D  (pure) validateReview mirrors the five probe shapes, the non-array and blank refusals.
//   R  (live) five rpc probes, each carrying a reason-less carry group over the zero uuid so NONE can
//      write; asserts the function's text equals the dry-run's and re-reads the au-* rows, the qa
//      session's decisions/images/tickets, the skill_profiles image count and the findings count equal.
//   I  (live) dm-audit-review-intent carries the property, TIGHTEN:/PROMOTE:, and one UPDATE image.
//   P2 (live rows, pure filter) buildTaskContext's checklist = the editable au-* rows; --prepare by branch.
// The permitted write and its before-image are proven only by the migration's rolled-back sub-block A.
// C now asserts checklist_edits PRESENT in the script (it asserted 9a's absence).
//
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

// Slice 9b. Every rpc probe carries a carry group with NO reason over the zero uuid: `carry needs a reason`
// refuses in the per-group loop before any write whatever the ledger holds, and the zero uuid would fail
// coverage behind it. Edit validation runs BEFORE that loop, so a refused edit is what the probe reads.
const ZERO = "00000000-0000-0000-0000-000000000000";
const QA_SESSION = "agt-86-qa";
const probeReview = edits => ({
  groups: [{ kind: "carry", finding_ids: [ZERO] }],
  summary_for_john: "qa", patterns_applied: [],
  ...(edits === undefined ? {} : { checklist_edits: edits }),
});
const JOHNS = s => `checklist edit to ${s} refused: only au-behavior, au-knowledge-homes and au-*-intent rows are the manager's; au-identity and au-guardrails are John's (AGT-86 section 11(5))`;
// [edit, expected first refusal (null = the edit is admitted; the group rule stops the call)]
const EDIT_SHAPES = [
  [{ skill_slug: "au-identity", field: "method", new_text: "x", reason: "qa" }, JOHNS("au-identity")],
  [{ skill_slug: "au-guardrails", field: "method", new_text: "x", reason: "qa" }, JOHNS("au-guardrails")],
  [{ skill_slug: "dm-behavior", field: "method", new_text: "x", reason: "qa" }, JOHNS("dm-behavior")],
  [{ skill_slug: "au-knowledge-homes", field: "traits", new_text: "x", reason: "qa" }, "checklist edit field traits must be method or objective"],
  [{ skill_slug: "au-knowledge-homes", field: "objective", new_text: "x", reason: "qa" }, null],
];
const INTENT_ID = "a6d3568f-3a39-44ff-a2b9-0aa62035281e";

async function rpc(url, key, body) {
  const res = await fetch(`${url}/rest/v1/rpc/apply_audit_review`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}
async function count(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, { method: "HEAD", headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" } });
  const cr = res.headers.get("content-range") ?? "";
  const n = Number(cr.split("/")[1]);
  if (!res.ok || !Number.isFinite(n)) throw new Error(`count ${q} -> HTTP ${res.status} content-range=${cr}`);
  return n;
}

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

  // --- D. dry-run mirror of the checklist-edit refusals (pure, no DB) -- slice 9b ----------------
  await arm("D edit mirror", async () => {
    const { validateReview, EDITABLE_SLUG } = await loadScript();
    assert.ok(EDITABLE_SLUG instanceof RegExp, "EDITABLE_SLUG is exported");
    for (const [edit, want] of EDIT_SHAPES) {
      const v = validateReview(probeReview([edit]), []);
      if (want === null) {
        assert.ok(!v.refusals.some(r => /checklist edit/.test(r)), `${edit.skill_slug}.${edit.field}: no edit refusal; got ${JSON.stringify(v.refusals)}`);
        assert.ok(v.refusals.includes("carry needs a reason"), "the group rule still stops it");
      } else {
        assert.equal(v.refusals[0], want, `${edit.skill_slug}.${edit.field}: first refusal`);
      }
    }
    for (const edits of [[], undefined]) {
      const v = validateReview(probeReview(edits), []);
      assert.ok(!v.refusals.some(r => /checklist/.test(r)), `checklist_edits ${JSON.stringify(edits)} -> no edit refusal`);
    }
    const na = validateReview(probeReview({ skill_slug: "au-behavior" }), []);
    assert.equal(na.refusals[0], "checklist_edits must be an array", "non-array refused");
    const blankEdit = validateReview(probeReview([{ skill_slug: "au-behavior", field: "method", new_text: " ", reason: "qa" }]), []);
    assert.equal(blankEdit.refusals[0], "checklist edit to au-behavior needs new_text and reason");
    const known = [{ skill_slug: "au-behavior" }];
    const missing = validateReview(probeReview([{ skill_slug: "au-nope-intent", field: "method", new_text: "x", reason: "qa" }]), [], undefined, known);
    assert.equal(missing.refusals[0], "checklist edit names no skill_profiles row au-nope-intent", "row check when the checklist is known");
    assert.deepEqual(["au-behavior", "au-knowledge-homes", "au-board-intent", "au-identity", "au-guardrails", "dm-behavior"].map(s => EDITABLE_SLUG.test(s)),
      [true, true, true, false, false, false], "the allowlist admits exactly the manager's rows");
  });

  // --- C. controls (no DB) -------------------------------------------------------------------------
  await arm("C controls", async () => {
    await loadScript();
    const src = fs.readFileSync(SCRIPT, "utf8");
    assert.ok((src.match(/checklist_edits/g) ?? []).length > 0, "checklist_edits is carried by the script (9b)");
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

  // --- R. rpc refusals (live; no probe can write -- see probeReview) -- slice 9b -----------------
  await arm("R edit refusals", async () => {
    const { validateReview } = await loadScript();
    const snapshot = async () => {
      const rows = await call(url, key, "skill_profiles?slug=in.(au-identity,au-guardrails,au-behavior,au-knowledge-homes)&select=slug,objective,method&order=slug");
      assert.equal(rows.status, 200, `au-* rows must be readable; got ${describe(rows)}`);
      assert.equal(rows.json.length, 4, "the four au-* rows exist");
      return {
        rows: JSON.stringify(rows.json),
        qaDecisions: await count(url, key, `runner_decisions?session_name=eq.${QA_SESSION}&select=id`),
        qaImages: await count(url, key, `runner_before_images?session_name=eq.${QA_SESSION}&select=id`),
        spImages: await count(url, key, "runner_before_images?table_name=eq.skill_profiles&select=id"),
        qaTickets: await count(url, key, `backlog_items?session_ref=like.${QA_SESSION}*&select=id`),
        findings: await count(url, key, "audit_findings?select=id"),
      };
    };
    const before = await snapshot();
    for (const [edit, want] of EDIT_SHAPES) {
      const r = await rpc(url, key, { p_cycle_id: null, p_session_name: QA_SESSION, p_week: "2026-W39", p_review: probeReview([edit]) });
      const label = `${edit.skill_slug}.${edit.field}`;
      assert.equal(r.status, 400, `${label}: must be refused; got ${describe(r)}`);
      assert.equal(r.code, "P0001", `${label}: a RAISE, not a type error; got ${describe(r)}`);
      const msg = String(r.json && r.json.message);
      if (want === null) {
        assert.match(msg, /carry needs a reason/, `${label}: the allowlist admits it and the group rule stops it`);
        assert.doesNotMatch(msg, /John/, `${label}: not the John's-rows refusal`);
      } else {
        assert.equal(msg, `apply_audit_review: ${want}`, `${label}: the function's text`);
        assert.match(msg, /refused|must be method or objective/);
        if (/^au-(identity|guardrails)$/.test(edit.skill_slug)) {
          assert.match(msg, new RegExp(edit.skill_slug));
          assert.match(msg, /John/);
        }
        const d = validateReview(probeReview([edit]), []);
        assert.equal(`apply_audit_review: ${d.refusals[0]}`, msg, `${label}: the dry-run mirror reads the same text`);
      }
    }
    const after = await snapshot();
    assert.deepEqual(after, before, "no probe wrote: au-* rows, qa decisions/images/tickets, skill_profiles images, findings unchanged");
  });

  // --- I. the intent row (live, read-only) -- slice 9b ---------------------------------------------
  await arm("I intent row", async () => {
    const r = await call(url, key, `skill_profiles?id=eq.${INTENT_ID}&select=slug,method,traits`);
    assert.equal(r.status, 200, describe(r));
    const row = r.json[0];
    assert.equal(row.slug, "dm-audit-review-intent");
    const schema = row.traits && row.traits.schema;
    const prop = schema && schema.properties && schema.properties.checklist_edits;
    assert.ok(prop, "traits.schema.properties.checklist_edits exists");
    assert.deepEqual(prop.items.required, ["skill_slug", "field", "new_text", "reason"]);
    assert.deepEqual(schema.required, ["groups", "summary_for_john", "patterns_applied"], "required stays the three");
    assert.match(row.method, /TIGHTEN:/);
    assert.match(row.method, /PROMOTE:/);
    const imgs = await call(url, key, `runner_before_images?table_name=eq.skill_profiles&pk_value=eq.${INTENT_ID}&row_data=not.is.null&select=decision_id,method:row_data->>method`);
    assert.equal(imgs.status, 200, describe(imgs));
    const pre = imgs.json.filter(i => typeof i.method === "string" && !/TIGHTEN:/.test(i.method));
    assert.equal(pre.length, 1, `one UPDATE image of the intent row taken before the edit; got ${JSON.stringify(imgs.json.map(i => i.decision_id))}`);
  });

  // --- P2. the checklist in the context (live rows, pure filter) -- slice 9b ----------------------
  await arm("P2 checklist", async () => {
    const { buildTaskContext, EDITABLE_SLUG, NOTHING_TO_REVIEW } = await loadScript();
    const p = await call(url, key, "skill_profiles?slug=like.au-*&select=slug,objective,method&order=slug");
    assert.equal(p.status, 200, describe(p));
    const ctx = buildTaskContext({ week: "2026-W39", findings: [{ id: "x1", fingerprint: "fpX", iso_week: "2026-W39", kind: "other" }],
      allRows: [], tickets: [], scorecardRows: [], profiles: p.json });
    assert.ok(Array.isArray(ctx.checklist), "context carries checklist");
    const slugs = ctx.checklist.map(c => c.skill_slug);
    assert.ok(slugs.every(s => EDITABLE_SLUG.test(s)), `every checklist slug is editable; got ${slugs}`);
    for (const s of ["au-behavior", "au-knowledge-homes"]) assert.ok(slugs.includes(s), `${s} is in the checklist`);
    for (const s of ["au-identity", "au-guardrails"]) assert.ok(!slugs.includes(s), `${s} is John's -- never in the checklist`);
    const kh = ctx.checklist.find(c => c.skill_slug === "au-knowledge-homes");
    assert.ok(typeof kh.objective === "string" && typeof kh.method === "string", "objective and method as they read today");

    const open = await count(url, key, "audit_findings?status=in.(open,carried)&select=id");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt86i-"));
    const out = path.join(dir, "prepare.json");
    try {
      const r = spawnSync(process.execPath, [SCRIPT, "--prepare", "--week=2026-W39", `--out=${out}`],
        { cwd: ROOT, env: process.env, encoding: "utf8", timeout: 60000 });
      if (open === 0) {
        assert.equal(r.status, 3, `0 open/carried -> exit 3; got ${r.status}: ${r.stderr}`);
        assert.match(r.stderr, new RegExp(NOTHING_TO_REVIEW.slice(0, 30)));
      } else {
        assert.equal(r.status, 0, `--prepare must exit 0; got ${r.status}: ${r.stderr}`);
        const live = JSON.parse(fs.readFileSync(out, "utf8"));
        assert.deepEqual(live.checklist.map(c => c.skill_slug), slugs, "--prepare carries the same checklist");
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
