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
// grades board-repeat-worked against an INVARIANT rather than an occupant, plus asserts that
// audit_findings did not grow -- the script writes no row.
//
// WHY THE OCCUPANT PIN WENT (AGT-167). This arm used to require the live run to name
// backlog_items:SES-424. That was wrong twice over. SES-424 reached `done` in this very cycle, and a
// terminal row can never fire this check at all -- so the pin would have gone red for a reason with
// nothing to do with the code under test. And pinning whoever occupies a finding makes the suite a
// hostage of the board: every ticket that closes, and every new one that starts cycling, turns this
// file red or green for no change in behaviour. What must hold forever is the SHAPE -- every
// board-repeat-worked finding names a NON-TERMINAL row whose NON-SHIPPING cycle count has reached N.
//
// AND WHY IT IS NOT VACUOUS. On today's board NO non-terminal ticket has 4 non-shipping cycles
// (measured this cycle: the maximum is 1 among pickable rows), so "every finding has the shape" is
// satisfied by emitting nothing, and a check that had been broken into total silence would pass. The
// arm therefore recomputes the expected roster INDEPENDENTLY -- its own paged reads of
// backlog_items + runner_cycles, its own count, not cycleCounts() -- and asserts SET EQUALITY with
// what the run emitted. Zero findings passes only when zero is the right answer. The recomputation
// is deliberately a second copy of the join and nothing else; the join itself is graded by the
// fixture arms above, which is where a wrong join shows up as a wrong ROW, not a wrong count.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  CHECK_SLUGS, AGGREGATE_OVER, TERMINAL, PAGE_ROWS, runChecks, aggregate,
  checkNoHome, checkRepeatWorked, checkDeferralUndone, checkStale, checkClosedRed, ratifiedAt,
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
  cycles: [], images: [], decisions: [], accepts: [], verdicts: [], ...extra,
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

// The oracle's OWN paged read. audit-board.js's readAll() is the code under test, so this arm must
// not borrow it; PAGE_ROWS is imported because the page SIZE is PostgREST's limit, not a judgement.
async function pageAll(url, key, pathAndQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        "Range-Unit": "items", Range: `${from}-${from + PAGE_ROWS - 1}`,
      },
    });
    assert.ok(res.ok, `oracle read ${pathAndQuery} -> HTTP ${res.status}`);
    const page = await res.json();
    assert.ok(Array.isArray(page), `oracle read ${pathAndQuery} came back non-array`);
    rows.push(...page);
    if (page.length < PAGE_ROWS) return rows;
    assert.ok(rows.length < 100000, `oracle read ${pathAndQuery} ran away`);
  }
}

async function liveCap(url, key) {
  const res = await fetch(`${url}/rest/v1/runner_settings?select=chain_max_noship_streak&id=eq.1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  assert.ok(res.ok, `runner_settings read -> HTTP ${res.status}`);
  const [row0] = await res.json();
  const n = row0?.chain_max_noship_streak;
  assert.ok(Number.isInteger(n) && n >= 1, `chain_max_noship_streak must be a positive integer, got ${JSON.stringify(n)}`);
  return n;
}

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

  // --- repeat-worked: the ceiling is counted in NON-SHIPPING cycles (AGT-167) ------------------------
  // The rule text has ALWAYS said "without shipping". Before AGT-167 cycleCounts() counted TOTAL
  // cycles and readBoard() never even selected `outcome`, so the check could not see shipping and
  // every well-behaved ticket that took several cycles and shipped from each one was a finding. Two
  // arms hold the corrected measure from both sides, and a lazy fix fails one of them:
  //   R-SHIPPED  8 cycles, ALL shipped          -> must NOT fire (the false positive itself)
  //   R-MIX      6 shipped + 4 non-shipping     -> MUST fire on the 4
  // R-MIX is why "skip any ticket that ever shipped" is not a fix: it would silence the one row here
  // that genuinely is being re-worked without shipping.
  {
    const items = [row("SES-424", { status: "delivered" }), row("R-3"), row("R-DONE", { status: "done" }), row("R-UUID"),
      row("R-SHIPPED"), row("R-MIX")];
    const cycles = [
      ...Array.from({ length: 8 }, () => ({ backlog_item_id: null, item_id: "SES-424" })),
      ...Array.from({ length: 3 }, () => ({ backlog_item_id: null, item_id: "R-3" })),
      ...Array.from({ length: 6 }, () => ({ backlog_item_id: null, item_id: "R-DONE" })),
      // uuid-only join half: 2 via backlog_item_id + 2 via item_id = 4 -> fires
      { backlog_item_id: "u-R-UUID", item_id: null }, { backlog_item_id: "u-R-UUID", item_id: null },
      { backlog_item_id: null, item_id: "R-UUID" }, { backlog_item_id: null, item_id: "R-UUID" },
      // AGT-167 negative: cycled eight times, shipped every time. Not re-work without shipping.
      ...Array.from({ length: 8 }, () => ({ backlog_item_id: null, item_id: "R-SHIPPED", outcome: "shipped" })),
      // AGT-167 positive: the shipped majority is invisible to the measure; the 4 that did not ship fire.
      ...Array.from({ length: 6 }, () => ({ backlog_item_id: null, item_id: "R-MIX", outcome: "shipped" })),
      ...Array.from({ length: 4 }, () => ({ backlog_item_id: null, item_id: "R-MIX", outcome: "gated_before_build" })),
    ];
    const f = checkRepeatWorked(board({ items, cycles }), ctx);
    assert.deepEqual(ids(f), ["backlog_items:R-MIX", "backlog_items:R-UUID", "backlog_items:SES-424"],
      "repeat-worked: >=N NON-SHIPPING cycles on a non-terminal row fires (both join halves, and R-MIX's 4 of 10); " +
      "3 cycles, a done row, and R-SHIPPED's 8 all-shipped cycles do not");
    assert.match(f.find(x => x.locations[0].location === "backlog_items:R-MIX").locations[0].text, /^4 cycles \(streak cap 4\)/,
      "the finding must report the NON-SHIPPING count (4), not the 10 cycles the ticket has run");
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

  // --- closed-red: only an UNRATIFIED close over a block is a finding (AGT-166) ---------------------
  // Each ratifying arm is paired with the near-miss that must still fire, so a check that treats any
  // later row as ratification fails C-5/C-6/C-8 and one that ignores ratification fails C-4/C-7.
  {
    const items = ["C-1", "C-2", "C-4", "C-5", "C-6", "C-7", "C-8"].map(id => row(id, { status: "done" }))
      .concat([row("C-3", { status: "open" })]);
    const verdicts = [
      { backlog_id: "C-1", verdict: "approve", created_at: daysAgo(3) }, { backlog_id: "C-1", verdict: "block", created_at: daysAgo(1) },
      { backlog_id: "C-2", verdict: "block", created_at: daysAgo(3) }, { backlog_id: "C-2", verdict: "approve", created_at: daysAgo(1) },
      { backlog_id: "C-3", verdict: "block", created_at: daysAgo(1) },
      { backlog_id: "C-4", verdict: "block", created_at: daysAgo(2) },
      { backlog_id: "C-5", verdict: "block", created_at: daysAgo(2) },
      { backlog_id: "C-6", verdict: "block", created_at: daysAgo(2) },
      { backlog_id: "C-7", verdict: "block", created_at: daysAgo(2) },
      { backlog_id: "C-8", verdict: "block", created_at: daysAgo(2) },
    ];
    const decisions = [
      { backlog_id: "C-4", kind: "ship", status: "final", decided_at: daysAgo(1) },          // ratifies
      { backlog_id: "C-5", kind: "hygiene", status: "final", decided_at: daysAgo(1) },       // wrong kind
      { backlog_id: "C-6", kind: "ticket-status", status: "reversed", decided_at: daysAgo(1) }, // reversed
      { backlog_id: "C-8", kind: "ship", status: "final", decided_at: daysAgo(3) },          // predates the block
    ];
    const accepts = [{ backlog_id: "C-7", decided_at: daysAgo(1) }];                          // ratifies
    const f = checkClosedRed(board({ items, verdicts, decisions, accepts }));
    assert.deepEqual(ids(f), ["backlog_items:C-1", "backlog_items:C-5", "backlog_items:C-6", "backlog_items:C-8"],
      "closed-red: a later ship decision (C-4) or an accepted ship card (C-7) ratifies the close; a later hygiene decision (C-5), a reversed ticket-status (C-6) and a ship decision that predates the block (C-8) do not");
    assert.equal(f[0].kind, "contradiction");
    for (const g of f) assert.match(g.locations[0].text, /latest verdict block at .*; never ratified$/);
    // The same predicate the trigger enforces, exported for the burn-down test to read.
    assert.equal(ratifiedAt(board({ decisions, accepts }), "C-4"), Date.parse(daysAgo(1)));
    assert.equal(ratifiedAt(board({ decisions, accepts }), "C-5"), -Infinity, "a hygiene decision is not a ratification");
  }

  // --- the closed-red aggregate's fingerprint MOVED with its rule text (AGT-166) --------------------
  // audit-ledger.js hashes normalize(governing_fact), so adding "unratified" to RULES['quality-closed-red']
  // retires the ledger's old fingerprint and opens a new one -- the escalate rule will see this week's
  // aggregate as a NEW finding, once, by design. Both values are pinned so neither moves silently again.
  {
    const items = Array.from({ length: 30 }, (_, i) => row(`Q-${i}`, { status: "done" }));
    const verdicts = items.map(r => ({ backlog_id: r.backlog_id, verdict: "block", created_at: daysAgo(1) }));
    const rows = checkClosedRed(board({ items, verdicts }));
    assert.equal(rows.length, 30, "30 unratified closes, every one a finding");
    const ag = aggregate("quality-closed-red", rows);
    assert.equal(ag.length, 1);
    assert.equal(fingerprint(ag[0]), "3d90f4265dc6e401", "the unratified rule text pins ONE new closed-red aggregate fingerprint");
    assert.notEqual(fingerprint(ag[0]), "b2a8e5751044dd23", "and it is not the pre-AGT-166 fingerprint the 2026-W39 ledger carries");
    assert.match(ag[0].governing_fact, /unratified red verdict\.$/);
    assert.match(ag[0].proposed_resolution, /ship or ticket-status decision/);
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
    // -- the independent oracle: this file's OWN reads, count and join. Never cycleCounts().
    const N = await liveCap(url, key);
    const liveItems = await pageAll(url, key, "backlog_items?select=id,backlog_id,status&order=backlog_id");
    const liveCycles = await pageAll(url, key, "runner_cycles?select=backlog_item_id,item_id,outcome&order=id");
    assert.ok(liveItems.length > 0 && liveCycles.length > 0,
      `live: the oracle read ${liveItems.length} items and ${liveCycles.length} cycles -- an empty read ` +
      `would make every assertion below vacuously true, so it is refused rather than banked`);
    const uuidToId = new Map(liveItems.map(r => [r.id, r.backlog_id]));
    const statusOf = new Map(liveItems.map(r => [r.backlog_id, r.status]));
    const noship = new Map();
    for (const c of liveCycles) {
      if (c.outcome === "shipped") continue;                       // the AGT-167 measure
      const key2 = (c.backlog_item_id != null ? uuidToId.get(c.backlog_item_id) : null) ?? c.item_id ?? null;
      if (key2 == null) continue;
      noship.set(key2, (noship.get(key2) ?? 0) + 1);
    }
    const expected = [...noship]
      .filter(([id, n]) => n >= N && statusOf.has(id) && !TERMINAL.includes(statusOf.get(id)))
      .map(([id]) => id).sort();

    const emitted = doc.findings.filter(f => f.check_slug === "board-repeat-worked");
    const aggregated = emitted.length === 1 &&
      emitted[0].locations[0].location === "audit-board/board-repeat-worked";
    if (aggregated) {
      // > AGGREGATE_OVER rows collapse to one finding whose text opens "<n> rows: ".
      assert.ok(expected.length > AGGREGATE_OVER, `live: the check aggregated but the oracle expected only ${expected.length} rows`);
      assert.match(emitted[0].locations[0].text, new RegExp(`^${expected.length} rows: `),
        `live: the aggregate must name ${expected.length} rows, the oracle's count`);
    } else {
      const named = emitted.flatMap(f => f.locations.map(l => l.location.replace(/^backlog_items:/, ""))).sort();
      assert.deepEqual(named, expected,
        `live: board-repeat-worked must name EXACTLY the non-terminal rows whose non-shipping cycle ` +
        `count has reached ${N}. Emitted ${JSON.stringify(named)}, oracle ${JSON.stringify(expected)}. ` +
        `A row only the oracle has is the check going silent; a row only the check has is it firing on ` +
        `shipped cycles, on a terminal row, or under the cap.`);
      for (const f of emitted) {
        const id = f.locations[0].location.replace(/^backlog_items:/, "");
        const st = statusOf.get(id);
        assert.ok(st !== undefined && !TERMINAL.includes(st),
          `live: board-repeat-worked named ${id}, whose status is ${st ?? "(not on the board)"} -- a terminal row must never fire`);
        const m = /^(\d+) cycles \(streak cap (\d+)\); status (.+)$/.exec(f.locations[0].text);
        assert.ok(m, `live: unparseable finding text ${JSON.stringify(f.locations[0].text)}`);
        assert.equal(Number(m[1]), noship.get(id),
          `live: ${id}'s finding reports ${m[1]} cycles but the oracle counts ${noship.get(id)} non-shipping`);
        assert.equal(Number(m[2]), N, `live: the finding must quote the live cap ${N}`);
        assert.equal(m[3], st);
      }
    }
    console.log(`    [live] board-repeat-worked: ${emitted.length} finding(s); oracle expected ${expected.length} ` +
      `row(s) at cap ${N} over ${liveItems.length} items / ${liveCycles.length} cycles` +
      (expected.length === 0 ? " -- zero, and independently confirmed correct" : ""));
    for (const f of doc.findings) roundTrip(f);
  } finally {
    try { fs.unlinkSync(out); } catch { /* absent */ }
  }
  assert.equal(await countFindings(), before, "live: audit_findings count must be unchanged -- the script writes no row");
}

selfRun(import.meta.url, run);
export default run;
