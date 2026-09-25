// DeepBench v7.0.547 | tests/regression/agt-86d-board-checks.test.mjs | AGT-86 slice 4
//
// FEATURE: AGT-86 slice 4 -- scripts/audit-board.js, the Auditor's five deterministic board checks
// as plain code (no model call, read-only), and ticket-owner.js's exported UNREVALIDATED_DAYS.
// Kickoff: docs/kickoffs/v7.0.547-AGT-86-s4-board-checks.md.
//
// DISCRIMINATING: every fixture arm imports scripts/audit-board.js, which is absent on the tree
// before the change -- the import throws and the whole file is red. Each check carries one positive
// fixture that must fire AND a negative that must not, so a check that always fires (or never does)
// fails one half. The aggregate flips at 26, not 25. Two different 26/30-row rosters must produce the
// SAME fingerprint (the escalate rule's premise); two per-row findings on different rows must not.
//
// LIVE ARM (notRun without SUPABASE_URL + SUPABASE_SERVICE_KEY): runs the CLI to a temp --out and
// asserts board-repeat-worked names backlog_items:SES-424 and that audit_findings did not grow --
// the script writes no row.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  CHECK_SLUGS, AGGREGATE_OVER, runChecks, aggregate,
  checkNoHome, checkRepeatWorked, checkDeferralUndone, checkStale, checkClosedRed,
} from "../../scripts/audit-board.js";
import { UNREVALIDATED_DAYS } from "../../scripts/ticket-owner.js";
import { fingerprint, toRow } from "../../scripts/audit-ledger.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "audit-board.js");
const DB_KINDS = ["duplicate", "contradiction", "redundant", "stale-or-irrelevant", "competing-purpose", "other"];
const NOW = "2026-09-23T12:00:00Z";
const DAY = 24 * 3600 * 1000;
const daysAgo = d => new Date(Date.parse(NOW) - d * DAY).toISOString();
const ctx = { now: NOW, N: 4, unrevalidatedDays: UNREVALIDATED_DAYS };
const EPIC_OK = "e0000000-0000-4000-8000-000000000001";
const EPIC_ORPHAN = "e0000000-0000-4000-8000-000000000002";

const row = (backlog_id, extra = {}) => ({
  id: `u-${backlog_id}`, backlog_id, status: "open", epic_id: EPIC_OK, defer_status: null,
  filed_at: daysAgo(1), created_at: daysAgo(1), revalidated_at: null, ...extra,
});
const board = (extra = {}) => ({
  items: [], epics: [{ id: EPIC_OK, project_id: "p1" }, { id: EPIC_ORPHAN, project_id: null }],
  cycles: [], images: [], decisions: [], verdicts: [], ...extra,
});
const ids = fs_ => fs_.map(f => f.locations[0].location);
const roundTrip = f => {
  assert.ok(DB_KINDS.includes(f.kind), `kind ${f.kind} must be in the audit_findings CHECK enum`);
  // AGT-131 (v7.0.596): toRow() needs a type. A board-check finding carries none of its own BY
  // DESIGN -- docs/runbooks/auditor-routine.md's step 3 merge stamps `defect` on every Auditor
  // finding that did not declare one -- so the round trip supplies the run's type, exactly as the
  // CLI's --type does. The shape this arm is about is unchanged.
  const r = toRow(f, { week: "2026-W39", foundBy: "auditor:board-checks", cycleId: null, id: "x", findingType: "defect" });
  assert.equal(r.fingerprint, fingerprint(f));
  assert.match(r.fingerprint, /^[0-9a-f]{16}$/);
  assert.ok(f.governing_fact.length <= 300 && f.proposed_resolution.length <= 400);
  assert.equal(f.confidence, "high");
  assert.ok(Array.isArray(r.locations) && r.locations.length >= 1);
};

async function run() {
  // --- the shared fence ---------------------------------------------------------------------------
  assert.equal(UNREVALIDATED_DAYS, 30, "ticket-owner.js must export UNREVALIDATED_DAYS = 30");
  assert.deepEqual([...CHECK_SLUGS], ["board-no-home", "board-repeat-worked", "board-deferral-undone", "board-stale", "quality-closed-red"]);
  const boardSrc = fs.readFileSync(SCRIPT, "utf8");
  assert.match(boardSrc, /import \{ UNREVALIDATED_DAYS \} from "\.\/ticket-owner\.js"/, "the stale check must import the fence, not restate it");
  assert.doesNotMatch(boardSrc, /method:\s*["'](POST|PATCH|DELETE|PUT)/, "audit-board.js must issue no write");
  const ownerSrc = fs.readFileSync(path.join(ROOT, "scripts", "ticket-owner.js"), "utf8");
  assert.match(ownerSrc, /const D30 = nowMs - UNREVALIDATED_DAYS \* DAY;/, "classifyBoard's D30 must read the export");

  // --- no-home ------------------------------------------------------------------------------------
  {
    const b = board({ items: [row("NH-1", { epic_id: null }), row("NH-2", { epic_id: EPIC_ORPHAN }), row("NH-3"), row("NH-4", { epic_id: null, status: "done" })] });
    const f = checkNoHome(b);
    assert.deepEqual(ids(f), ["backlog_items:NH-1", "backlog_items:NH-2"], "no-home: null epic and project-less epic fire; homed and done rows do not");
    assert.ok(f.every(x => x.kind === "other" && x.check_slug === "board-no-home"));
  }

  // --- repeat-worked (SES-424 shape: cycles via item_id only) ----------------------------------------
  {
    const items = [row("SES-424", { status: "delivered" }), row("R-3"), row("R-DONE", { status: "done" }), row("R-UUID")];
    const cycles = [
      ...Array.from({ length: 8 }, () => ({ backlog_item_id: null, item_id: "SES-424" })),
      ...Array.from({ length: 3 }, () => ({ backlog_item_id: null, item_id: "R-3" })),
      ...Array.from({ length: 6 }, () => ({ backlog_item_id: null, item_id: "R-DONE" })),
      // uuid-only join half: 2 via backlog_item_id + 2 via item_id = 4 -> fires
      { backlog_item_id: "u-R-UUID", item_id: null }, { backlog_item_id: "u-R-UUID", item_id: null },
      { backlog_item_id: null, item_id: "R-UUID" }, { backlog_item_id: null, item_id: "R-UUID" },
    ];
    const f = checkRepeatWorked(board({ items, cycles }), ctx);
    assert.deepEqual(ids(f), ["backlog_items:R-UUID", "backlog_items:SES-424"], "repeat-worked: >=N non-terminal fires on both join halves; 3 cycles or done does not");
    assert.ok(f.every(x => x.kind === "other"));
  }

  // --- deferral-undone -----------------------------------------------------------------------------
  {
    const items = [row("D-1", { defer_status: null }), row("D-2", { defer_status: null }), row("D-3", { defer_status: "yes" })];
    const images = [
      { pk_value: "u-D-1", row_data: { backlog_id: "D-1", defer_status: "yes" }, created_at: daysAgo(5) },
      { pk_value: "u-D-2", row_data: { backlog_id: "D-2", defer_status: "yes" }, created_at: daysAgo(5) },
      { pk_value: "u-D-3", row_data: { backlog_id: "D-3", defer_status: "yes" }, created_at: daysAgo(5) },
    ];
    const decisions = [{ backlog_id: "D-2", decided_at: daysAgo(4) }, { backlog_id: "D-1", decided_at: daysAgo(6) }];
    const f = checkDeferralUndone(board({ items, images, decisions }));
    assert.deepEqual(ids(f), ["backlog_items:D-1"], "deferral-undone: undone with no later decision fires; a later decision or a still-yes row does not");
    assert.equal(f[0].kind, "contradiction");
  }

  // --- stale -------------------------------------------------------------------------------------------
  {
    const items = [
      row("S-31", { filed_at: daysAgo(31) }),
      row("S-29", { filed_at: daysAgo(29) }),
      row("S-REV", { filed_at: daysAgo(40), revalidated_at: daysAgo(2) }),
      row("S-CREATED", { filed_at: null, created_at: daysAgo(35) }),
      row("S-PARTIAL", { filed_at: daysAgo(90), status: "partial" }),
    ];
    const f = checkStale(board({ items }), ctx);
    assert.deepEqual(ids(f), ["backlog_items:S-31", "backlog_items:S-CREATED"], "stale: 31 days unrevalidated fires; 29 days, revalidated, or partial does not");
    assert.equal(f[0].kind, "stale-or-irrelevant");
    // The fence is the import: move it and the 31-day row stops firing.
    assert.equal(checkStale(board({ items }), { ...ctx, unrevalidatedDays: 32 }).length, 1);
    assert.equal(checkStale(board({ items }), { now: NOW, N: 4 }).length, 2, "with no override the check falls back to UNREVALIDATED_DAYS");
  }

  // --- closed-red ------------------------------------------------------------------------------------
  {
    const items = [row("C-1", { status: "done" }), row("C-2", { status: "done" }), row("C-3", { status: "open" })];
    const verdicts = [
      { backlog_id: "C-1", verdict: "approve", created_at: daysAgo(3) }, { backlog_id: "C-1", verdict: "block", created_at: daysAgo(1) },
      { backlog_id: "C-2", verdict: "block", created_at: daysAgo(3) }, { backlog_id: "C-2", verdict: "approve", created_at: daysAgo(1) },
      { backlog_id: "C-3", verdict: "block", created_at: daysAgo(1) },
    ];
    const f = checkClosedRed(board({ items, verdicts }));
    assert.deepEqual(ids(f), ["backlog_items:C-1"], "closed-red: done + latest block fires; block-then-approve or open does not");
    assert.equal(f[0].kind, "contradiction");
  }

  // --- aggregate: flips at 26; stable fingerprint over rosters ---------------------------------------
  const noHomeBoard = (n, prefix) => board({ items: Array.from({ length: n }, (_, i) => row(`${prefix}-${i}`, { epic_id: null })) });
  assert.equal(AGGREGATE_OVER, 25);
  const at25 = runChecks(noHomeBoard(25, "A"), ctx);
  assert.equal(at25.length, 25, "25 rows stay per-row");
  const at26 = runChecks(noHomeBoard(26, "A"), ctx);
  assert.equal(at26.length, 1, "26 rows collapse to one finding");
  assert.equal(at26[0].locations.length, 1);
  assert.equal(at26[0].locations[0].location, "audit-board/board-no-home");
  assert.match(at26[0].locations[0].text, /^26 rows: A-0, /);
  assert.doesNotMatch(at26[0].governing_fact, /\d+ rows|A-0/, "governing_fact carries the rule only");
  assert.match(at26[0].proposed_resolution, /^26 rows\./);
  const at30 = runChecks(noHomeBoard(30, "B"), ctx);
  assert.notEqual(at26[0].locations[0].text, at30[0].locations[0].text);
  assert.equal(fingerprint(at26[0]), fingerprint(at30[0]), "two rosters of one aggregate check share ONE fingerprint");
  assert.notEqual(fingerprint(at25[0]), fingerprint(at25[1]), "per-row findings on different rows fingerprint differently");
  assert.deepEqual(aggregate("board-stale", at25.slice(0, 3)), at25.slice(0, 3), "aggregate leaves <= 25 unchanged");

  // --- every finding round-trips toRow()/fingerprint() with a DB kind -------------------------------
  const all = [...at25, ...at26, ...at30,
    ...runChecks(board({
      items: [row("X-1", { status: "done" }), row("X-2", { filed_at: daysAgo(60), defer_status: null }), row("X-3", { status: "partial" })],
      cycles: Array.from({ length: 5 }, () => ({ backlog_item_id: null, item_id: "X-3" })),
      images: [{ pk_value: "u-X-2", row_data: { defer_status: "yes" }, created_at: daysAgo(2) }],
      verdicts: [{ backlog_id: "X-1", verdict: "block", created_at: daysAgo(1) }],
    }), ctx)];
  const slugsSeen = new Set(all.map(f => f.check_slug));
  for (const s of CHECK_SLUGS) assert.ok(slugsSeen.has(s), `the round-trip set must include ${s}`);
  for (const f of all) roundTrip(f);
  console.log(`    [fixtures] ok -- ${all.length} findings round-tripped across ${slugsSeen.size} checks`);

  // --- live arm ---------------------------------------------------------------------------------------
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-86d live arm (SES-424 smoke, no-write)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the live board run is unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
    return;
  }
  const countFindings = async () => {
    const res = await fetch(`${url}/rest/v1/audit_findings?select=id`, {
      method: "HEAD", headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
    });
    assert.ok(res.ok, `audit_findings count read -> HTTP ${res.status}`);
    return Number((res.headers.get("content-range") ?? "").split("/")[1]);
  };
  const before = await countFindings();
  const out = path.join(os.tmpdir(), `agt-86d-board-${process.pid}.json`);
  try {
    const r = spawnSync(process.execPath, [SCRIPT, `--out=${out}`], { encoding: "utf8", env: process.env });
    assert.equal(r.status, 0, `audit-board.js must exit 0; got ${r.status}\n${r.stdout}\n${r.stderr}`);
    console.log(r.stdout.trimEnd().split("\n").map(l => `    ${l}`).join("\n"));
    const doc = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.equal(doc.found_by, "auditor:board-checks");
    assert.match(doc.week, /^\d{4}-W\d{2}$/);
    const hit = doc.findings.find(f => f.check_slug === "board-repeat-worked" &&
      f.locations.some(l => l.location === "backlog_items:SES-424"));
    assert.ok(hit, "live: board-repeat-worked must carry a per-row finding at backlog_items:SES-424");
    for (const f of doc.findings) roundTrip(f);
  } finally {
    try { fs.unlinkSync(out); } catch { /* absent */ }
  }
  assert.equal(await countFindings(), before, "live: audit_findings count must be unchanged -- the script writes no row");
}

selfRun(import.meta.url, run);
export default run;
