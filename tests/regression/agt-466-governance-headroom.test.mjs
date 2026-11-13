// DeepBench v7.0.1023 | tests/regression/agt-466-governance-headroom.test.mjs | AGT-466 -- growth
// from a tracked history, and the sensor runs in a fresh clone.
//
// FEATURE: AGT-466 -- scripts/audit-headroom.js, the Auditor's weekly headroom, growth, sensor-gap
// and pin sensor over the governance surfaces that carry a byte bar, and the two
// auditor-routine.md lines that run it with --record and carry its history file onto dev.
// Kickoff: docs/kickoffs/v7.0.1023-AGT-466-headroom-history.md §5 tasks 1-4.
//
// DISCRIMINATING BY CONSTRUCTION: arms F and G import the four history functions and
// checkSensorGap, none of which exist on the tree before this change -- the import throws and the
// whole file is red -- and arm E walks the sensor's own import closure, which before this change
// is 34 files deep and reaches `@vercel/functions` (kickoff §6 QA 1). A no-op cannot pass.
//
// FIXTURES ONLY. Each arm hands the pure checks a snapshot it built itself; nothing here reads the
// database and nothing asserts on the live tree's own byte counts. The live run at the end is
// REPORTED, never asserted: a sensor whose test pins today's 59 free bytes would go red on the next
// legitimate edit to a file it only measures, which is the hostage-to-the-board failure AGT-167
// removed from agt-86d.
//
//   A  ONE HOME -- every bar in SURFACES equals the constant that already owns it: the runner-cycle
//      bar is agt-138's one-way ratchet PRE_CHANGE_BYTES (the BINDING bar, strictly under SES-336's
//      RUNBOOK_CEILING, which is asserted too so a future loosening of either is caught here), and
//      every role surface's bar is render-role-patterns.js's own ROW_BYTE_CAP. A number re-typed in
//      the sensor is a second home for a fact, and a second home is how the two drift apart.
//   B  DISCRIMINATOR -- the nearly-full rule fires at 59 free bytes of a 380,980 B exclusive bar and
//      does NOT fire at 300,000 bytes of the same bar; the growth rule fires ON ITS OWN on a surface
//      with 4,576 free bytes (well over the 1,229 B warning floor) that grew 1,200 B in a week,
//      because 4 weeks at that rate exhausts it. Both halves of each fixture are asserted -- WHICH
//      rule fired, not merely that something did (STANDARDS.md §4, the LOO-013 lesson) -- and every
//      finding is round-tripped through audit-ledger.js's toRow()/fingerprint() so a shape the
//      ledger would refuse is red here instead of on Monday.
//   C  PINS -- a stub child exiting 1 is exactly ONE config-pin-drift finding carrying that child's
//      own last line; exiting 0 is none; with no credentials the rows child is SKIPPED AND NAMED
//      rather than counted green, and with credentials it actually runs (two findings, two
//      locations), which is what proves the gate opens as well as closes.
//   D  ROUTINE -- step 1 runs the sensor WITH --record, and step 5's tail-push carries the history
//      file onto dev: a file rewritten every week that nobody commits is a memory that resets.
//   E  FRESH CLONE -- every specifier reached from the sensor is a Node builtin or a relative
//      script, and the closure stays small. The Auditor's $S clone has no node_modules, which is
//      how 2026-W46's run died importing @vercel/functions for one page-size constant while the
//      merge skipped the missing file in silence.
//   F  HISTORY -- the four pure functions over the tracked file: an earlier week reads back, THIS
//      week is not its own baseline, a second record in one week REPLACES rather than duplicating,
//      and a document carrying no `entries` array throws instead of reading as an empty history.
//   G  GAP -- the sensor grades its own memory. A newest recorded week older than last week is ONE
//      finding naming all three weeks; a current history, an empty one, and a caller that passed
//      no week are each silent -- the three ways this check must NOT fire.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isBuiltin } from "node:module";
import { selfRun } from "./_lib/self-run.js";
import {
  CHECK_SLUGS, FOUND_BY, WARN_FRACTION, WEEKS_AHEAD, SURFACES, PINS, RUNNER_CYCLE_REL, HISTORY_REL,
  checkHeadroom, checkPinDrift, checkSensorGap, runChecks, evidenceText, freeOf, lastLine,
  readHistory, prevFromHistory, recordHistory, prevWeekOf,
} from "../../scripts/audit-headroom.js";
import { ROW_BYTE_CAP, ROLE_NAMES, ROLES } from "../../scripts/render-role-patterns.js";
import { fingerprint, toRow, FINDING_TYPES } from "../../scripts/audit-ledger.js";
import { RUNBOOK_CEILING } from "./ses-413d-questions-scoreboard.test.mjs";
import { PRE_CHANGE_BYTES } from "./agt-138-researcher-routine.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "audit-headroom.js");
const ROUTINE_REL = "docs/runbooks/auditor-routine.md";
const DB_KINDS = ["duplicate", "contradiction", "redundant", "stale-or-irrelevant", "competing-purpose", "other"];

const snap = (...surfaces) => ({ surfaces });
const texts = fs_ => fs_.map(f => f.locations[0].text);
const resolutions = fs_ => fs_.map(f => f.proposed_resolution);

// The ledger is the finding's destination, so every fixture finding is graded against it.
const roundTrip = f => {
  assert.ok(DB_KINDS.includes(f.kind), `kind ${f.kind} must be in the audit_findings CHECK enum`);
  assert.ok(FINDING_TYPES.includes(f.finding_type), `finding_type ${f.finding_type} must be in the enum`);
  assert.equal(f.confidence, "high");
  assert.ok(f.governing_fact && f.governing_fact.length <= 300, "governing_fact is NOT NULL and <= 300");
  assert.ok(f.proposed_resolution && f.proposed_resolution.length <= 400, "proposed_resolution is NOT NULL and <= 400");
  assert.ok(Array.isArray(f.locations) && f.locations.length === 1 && f.locations[0].location && f.locations[0].text);
  const r = toRow(f, { week: "2026-W43", foundBy: FOUND_BY, cycleId: null, id: "x", findingType: "defect" });
  assert.equal(r.fingerprint, fingerprint(f));
  assert.match(r.fingerprint, /^[0-9a-f]{16}$/);
  assert.equal(r.check_slug, f.check_slug);
  assert.equal(r.finding_type, f.finding_type);
};

export default async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); } catch (e) { failures.push(`${name}: ${e.message}`); }
  };

  // --- A. one home per bar ----------------------------------------------------------------------
  await arm("A one home", async () => {
    assert.deepEqual(CHECK_SLUGS, ["config-headroom", "config-pin-drift", "config-sensor-gap"]);
    assert.equal(FOUND_BY, "auditor:headroom-checks");
    assert.equal(SURFACES.length, 1 + ROLE_NAMES.length, `one runbook surface plus one per role (${ROLE_NAMES.length})`);

    const runbook = SURFACES[0];
    assert.equal(runbook.path, RUNNER_CYCLE_REL);
    assert.equal(RUNNER_CYCLE_REL, "docs/runbooks/runner-cycle.md");
    assert.equal(runbook.strict, true, "agt-138 asserts bytes < bar, so this bar is exclusive");
    assert.equal(runbook.bar, PRE_CHANGE_BYTES,
      `the runner-cycle bar must BE agt-138's ratchet (${PRE_CHANGE_BYTES}), not a number re-typed in the sensor`);
    assert.ok(PRE_CHANGE_BYTES < RUNBOOK_CEILING,
      `the ratchet ${PRE_CHANGE_BYTES} must stay the BINDING bar, strictly under SES-336's ceiling ${RUNBOOK_CEILING}`);
    // The off-by-one that makes a strict bar honest: at the bar itself there is no byte left.
    assert.equal(freeOf({ bytes: PRE_CHANGE_BYTES - 1, bar: PRE_CHANGE_BYTES, strict: true }), 0,
      "one byte under an exclusive bar is ZERO free, not one");
    assert.equal(freeOf({ bytes: ROW_BYTE_CAP, bar: ROW_BYTE_CAP, strict: false }), 0,
      "an inclusive cap at exactly the cap is zero free, not minus one");

    const roles = SURFACES.slice(1);
    assert.deepEqual(roles.map(s => s.role), ROLE_NAMES, "one surface per role, in ROLE_NAMES order");
    for (const s of roles) {
      assert.equal(s.bar, ROW_BYTE_CAP, `${s.location} must be graded against render-role-patterns.js's own cap`);
      assert.equal(s.strict, false, "the row cap refuses only bytes OVER it");
      assert.equal(s.location, `governance/${ROLES[s.role].slug}`);
    }
    assert.equal(new Set(SURFACES.map(s => s.location)).size, SURFACES.length, "every surface location is distinct");
  });

  // --- B. the discriminator ---------------------------------------------------------------------
  await arm("B discriminator", async () => {
    const ctx = { spawn: () => ({ status: 0 }), hasCreds: false };

    // (1) the live shape of the runbook surface: 59 bytes under an exclusive 380,980 B bar.
    const tight = { location: "governance/runner-cycle.md", bytes: 380920, bar: 380980, strict: true, prev_week: null, prev_bytes: null };
    const hit = checkHeadroom(snap(tight), ctx);
    assert.equal(hit.length, 1, `exactly one finding (got ${hit.length})`);
    assert.equal(hit[0].check_slug, "config-headroom");
    assert.equal(hit[0].kind, "other");
    assert.equal(hit[0].finding_type, "gap");
    assert.equal(hit[0].locations[0].location, "governance/runner-cycle.md");
    assert.match(hit[0].locations[0].text, /(^|\s)free=59(\s|$)/, `the evidence must carry free=59: ${hit[0].locations[0].text}`);
    assert.match(hit[0].locations[0].text, /delta=none/, "with no earlier week the delta is `none`, never 0");
    assert.match(hit[0].proposed_resolution, /nearly full/, "the nearly-full rule is the one that fired");
    assert.doesNotMatch(hit[0].proposed_resolution, /outgrowing/, "nothing grew: the growth rule must not claim credit");
    assert.ok(hit[0].governing_fact.includes("380980"), "the governing fact names the bar");

    // (2) the same bar with real room: silence, and not because the check never fires.
    const roomy = { ...tight, bytes: 300000 };
    assert.deepEqual(checkHeadroom(snap(roomy), ctx), [], `300,000 B of a ${tight.bar} B bar is no finding`);

    // (3) THE GROWTH RULE ALONE. 4,576 B free is far over the 1,229 B floor, so the nearly-full
    // rule cannot be what fires; 1,200 B/week exhausts it inside WEEKS_AHEAD.
    const growing = { location: "governance/ds-knowledge-patterns", bytes: 20000, bar: ROW_BYTE_CAP, strict: false, prev_week: "2026-W42", prev_bytes: 18800 };
    const floor = Math.ceil(growing.bar * WARN_FRACTION);
    assert.equal(floor, 1229, `the warning floor at ${WARN_FRACTION} of ${growing.bar}`);
    assert.equal(freeOf(growing), 4576);
    assert.ok(freeOf(growing) > floor, "premise: this surface is NOT nearly full");
    assert.ok(WEEKS_AHEAD * 1200 >= freeOf(growing), "premise: four weeks of this growth exhausts the room");
    const grew = checkHeadroom(snap(growing), ctx);
    assert.equal(grew.length, 1, `exactly one finding on the growth rule (got ${grew.length})`);
    assert.match(grew[0].proposed_resolution, /outgrowing/, "the growth rule is the one that fired");
    assert.doesNotMatch(grew[0].proposed_resolution, /nearly full/, "it is not nearly full, and the row must not say so");
    assert.match(grew[0].locations[0].text, /prev_week=2026-W42 prev_bytes=18800 delta=\+1200/,
      `the evidence carries the measured growth: ${grew[0].locations[0].text}`);

    // Growth DOWNWARD is not a finding: a surface that shrank has more room, not less.
    assert.deepEqual(checkHeadroom(snap({ ...growing, prev_bytes: 21200 }), ctx), [],
      "a surface that SHRANK 1,200 B is no finding");

    // One finding per surface even when both rules fire -- never one per rule.
    const both = { ...tight, prev_week: "2026-W42", prev_bytes: 380900 };
    const pair = checkHeadroom(snap(both), ctx);
    assert.equal(pair.length, 1, "a surface that is tight AND growing is ONE finding");
    assert.match(pair[0].proposed_resolution, /nearly full/);
    assert.match(pair[0].proposed_resolution, /outgrowing/);

    // Three surfaces, two in trouble: the roster is the surfaces that fire, not the whole registry.
    const all = checkHeadroom(snap(tight, roomy, growing), ctx);
    assert.deepEqual(all.map(f => f.locations[0].location),
      ["governance/runner-cycle.md", "governance/ds-knowledge-patterns"], "only the two that fire");

    // The evidence line is the shape the summary prints and arm F's history feeds.
    assert.equal(evidenceText(growing),
      "bytes=20000 bar=24576 free=4576 pct_used=81.38 prev_week=2026-W42 prev_bytes=18800 delta=+1200");

    for (const f of [...hit, ...grew, ...pair, ...all]) roundTrip(f);
  });

  // --- C. the pins ------------------------------------------------------------------------------
  await arm("C pins", async () => {
    const child = (status, line) => () => ({ status, stdout: "", stderr: `a first line\n${line}\n` });
    const DRIFT = "render-cycle-card: docs/runbooks/cycle-card.md is STALE";

    // A stub child exiting 1, no credentials: ONE finding, and the rows child named as skipped.
    const red = checkPinDrift(snap(), { spawn: child(1, DRIFT), hasCreds: false });
    assert.equal(red.findings.length, 1, `exactly one config-pin-drift (got ${red.findings.length})`);
    assert.equal(red.findings[0].check_slug, "config-pin-drift");
    assert.equal(red.findings[0].kind, "contradiction");
    assert.equal(red.findings[0].finding_type, "defect");
    assert.equal(red.findings[0].locations[0].location, PINS[0].location);
    assert.equal(red.findings[0].locations[0].text, DRIFT, "the finding carries the CHILD's last line, not ours");
    assert.deepEqual(red.ran, [PINS[0].name], "only the credential-free child ran");
    assert.equal(red.skipped.length, 1, "the skipped child is NAMED");
    assert.ok(red.skipped[0].includes(PINS[1].name) && /not a pass/.test(red.skipped[0]),
      `the skip must name the child and refuse to read as a pass: ${red.skipped[0]}`);
    roundTrip(red.findings[0]);

    // Exiting 0: nothing. Still skipped-and-named, because nothing was read either way.
    const green = checkPinDrift(snap(), { spawn: child(0, "current"), hasCreds: false });
    assert.deepEqual(green.findings, [], "a child that exits 0 files nothing");
    assert.equal(green.skipped.length, 1, "a green card pin does not make the unrun rows pin green");

    // With credentials the second child actually runs -- the gate opens as well as closing.
    const bothRed = checkPinDrift(snap(), { spawn: child(1, DRIFT), hasCreds: true });
    assert.equal(bothRed.findings.length, 2, `both children ran and both filed (got ${bothRed.findings.length})`);
    assert.deepEqual(bothRed.findings.map(f => f.locations[0].location), PINS.map(p => p.location));
    assert.deepEqual(bothRed.skipped, [], "nothing is skipped once the credentials are there");
    assert.equal(new Set(bothRed.findings.map(f => fingerprint(f))).size, 2, "two children are two fingerprints");

    // A child that could not be spawned at all is a finding, not a silent green.
    const dead = checkPinDrift(snap(), { spawn: () => ({ status: null, stdout: "", stderr: "" }), hasCreds: false });
    assert.equal(dead.findings.length, 1, "a child with no status is not a pass");
    assert.match(dead.findings[0].locations[0].text, /printed nothing/);

    // The last line is CLIPPED, because governing_fact and the evidence both have ceilings.
    assert.equal(lastLine({ stderr: "x".repeat(400) }).length, 240, "the child's last line is clipped to 240");
    assert.throws(() => checkPinDrift(snap(), {}), /ctx\.spawn must be a function/,
      "a caller that forgets the spawn is refused, never silently green");

    // runChecks composes both halves under one call.
    const composed = runChecks(
      snap({ location: "governance/runner-cycle.md", bytes: 380920, bar: 380980, strict: true, prev_week: null, prev_bytes: null }),
      { spawn: child(1, DRIFT), hasCreds: false });
    assert.deepEqual(composed.findings.map(f => f.check_slug), ["config-headroom", "config-pin-drift"]);
    assert.equal(composed.skipped.length, 1);
  });

  // --- D. the routine runs it and merges its file -----------------------------------------------
  await arm("D routine", async () => {
    const md = fs.readFileSync(path.join(ROOT, ROUTINE_REL), "utf8").replace(/\r\n/g, "\n");
    const step1 = md.split("\n").filter(l => l.startsWith("node scripts/audit-headroom.js"));
    assert.equal(step1.length, 1, `step 1 runs the sensor exactly once (got ${step1.length})`);
    assert.equal(step1[0], "node scripts/audit-headroom.js --out=$S/headroom.json --record",
      "step 1 RECORDS as well as reporting -- without --record the history never gains a week");
    const ins = md.split("\n").find(l => l.includes('INS="$S/cluster.json'));
    assert.ok(ins, "the step 3 merge line is still found by its INS= list");
    assert.ok(ins.includes("$S/board.json $S/headroom.json "),
      "the merge reads the sensor's file, next to the board's");
    // A collected file nobody merges is a file nobody reads: the two edits are one change.
    assert.equal((md.match(/\$S\/headroom\.json/g) ?? []).length, 2,
      "the file is written in step 1 and merged in step 3 -- exactly those two homes");

    // The history is rewritten every week, so the routine has to COMMIT it: a growth memory that
    // nobody pushes is reset to empty by the next fresh clone, which is the whole defect here.
    assert.equal(HISTORY_REL, "docs/audits/headroom-history.json");
    assert.ok(fs.existsSync(path.join(ROOT, HISTORY_REL)), `${HISTORY_REL} is tracked in the tree`);
    const push = md.split("\n").filter(l => l.includes("node scripts/tail-push.js"));
    assert.equal(push.length, 1, `exactly one tail-push line (got ${push.length})`);
    assert.ok(push[0].includes(`--files=docs/audits/$W-candidates.json,docs/audits/$W.md,${HISTORY_REL}`),
      `the tail-push carries the history file onto dev: ${push[0]}`);
  });

  // --- E. the sensor runs in a fresh clone --------------------------------------------------------
  await arm("E fresh clone", async () => {
    // Static `import`/`export ... from` specifiers, walked through every relative one. A quote
    // cannot appear before `from` in an import clause, so [^'"] safely spans a multi-line one.
    const SPEC = /^[ \t]*(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/gm;
    const seen = new Set(), external = [], queue = [SCRIPT];
    while (queue.length) {
      const file = queue.shift();
      if (seen.has(file)) continue;
      seen.add(file);
      const src = fs.readFileSync(file, "utf8");
      for (const m of src.matchAll(SPEC)) {
        const spec = m[1];
        if (spec.startsWith(".")) queue.push(path.resolve(path.dirname(file), spec));
        else if (!isBuiltin(spec)) external.push(`${path.relative(ROOT, file)} -> ${spec}`);
      }
    }
    assert.deepEqual(external, [],
      `the Auditor's clone has no node_modules, so every non-relative specifier must be a Node ` +
      `builtin: ${external.join("; ")}`);
    assert.ok(seen.size <= 6,
      `the sensor's module closure must stay small (got ${seen.size}): ` +
      [...seen].map(f => path.relative(ROOT, f)).join(", "));
    // Teeth: the walker does find a package when there is one, and does follow relative hops.
    assert.ok(seen.size > 1, "control: the walk followed at least one relative import");
    assert.ok(!isBuiltin("@vercel/functions"), "control: the package that killed W46 is not a builtin");
  });

  // --- F. the tracked history ---------------------------------------------------------------------
  await arm("F history", async () => {
    const RC = "governance/runner-cycle.md";
    const H = [{ week: "2026-W44", location: RC, bytes: 380920, bar: 380980 }];

    assert.deepEqual(prevFromHistory(H, RC, "2026-W46"), { prev_week: "2026-W44", prev_bytes: 380920 },
      "an earlier week's recorded bytes are this week's baseline");
    assert.deepEqual(prevFromHistory(H, RC, "2026-W44"), { prev_week: null, prev_bytes: null },
      "THIS week is not an earlier week -- an entry cannot be its own baseline");
    assert.deepEqual(prevFromHistory(H, "governance/somewhere-else", "2026-W46"),
      { prev_week: null, prev_bytes: null }, "another surface's bytes are not this surface's baseline");

    const two = [{ location: RC, bytes: 380973, bar: 380980 },
      { location: "governance/bd-knowledge-patterns", bytes: 13305, bar: ROW_BYTE_CAP }];
    const rec = recordHistory(H, two, "2026-W46");
    assert.equal(rec.length, 3, `one carried entry plus two measured (got ${rec.length})`);
    assert.deepEqual(rec.map(e => `${e.week} ${e.location}`),
      ["2026-W44 " + RC, "2026-W46 governance/bd-knowledge-patterns", "2026-W46 " + RC],
      "sorted by week, then location");
    assert.deepEqual(rec[2], { week: "2026-W46", location: RC, bytes: 380973, bar: 380980 });

    // A second record in the SAME week replaces that surface's entry -- it never appends a second.
    const again = recordHistory(rec, [{ location: RC, bytes: 380000, bar: 380980 }], "2026-W46");
    assert.equal(again.length, 3, `re-recording one surface replaces, never duplicates (got ${again.length})`);
    assert.equal(again.find(e => e.week === "2026-W46" && e.location === RC).bytes, 380000,
      "the replaced entry carries the NEW bytes");
    assert.equal(again.filter(e => e.week === "2026-W44").length, 1, "an earlier week is never dropped");
    assert.ok(again.some(e => e.location === "governance/bd-knowledge-patterns"),
      "a surface this run did not measure keeps its entry");

    assert.deepEqual(readHistory(null), [], "no file yet is an empty history, not an error");
    assert.deepEqual(readHistory(undefined), []);
    assert.deepEqual(readHistory(JSON.stringify({ entries: H })), H, "a document round-trips");
    assert.throws(() => readHistory("{}"), /entries/,
      "a document with no entries array is REFUSED -- reading it as empty would erase the memory");
    assert.throws(() => readHistory("not json"), "an unparseable file is refused, never an empty history");

    // The file on the tree is that shape, and it is what the live run below reads.
    const live = readHistory(fs.readFileSync(path.join(ROOT, HISTORY_REL), "utf8"));
    assert.ok(live.length >= 1, `${HISTORY_REL} carries at least the seeded week (got ${live.length})`);
    for (const e of live) {
      assert.match(e.week, /^\d{4}-W\d{2}$/, `every entry carries an iso week: ${JSON.stringify(e)}`);
      assert.equal(typeof e.bytes, "number");
      assert.equal(typeof e.bar, "number");
      assert.ok(SURFACES.some(s => s.location === e.location) || e.location === RC,
        `every entry names a surface: ${e.location}`);
    }
  });

  // --- G. the gap in the sensor's own memory ------------------------------------------------------
  await arm("G gap", async () => {
    assert.equal(prevWeekOf("2026-11-13T12:00:00Z"), "2026-W45", "seven days before W46 is W45");
    const H = [{ week: "2026-W44", location: "governance/runner-cycle.md", bytes: 380920, bar: 380980 }];

    const gap = checkSensorGap({ entries: H }, { week: "2026-W46", prevWeek: "2026-W45" });
    assert.equal(gap.length, 1, `exactly one config-sensor-gap (got ${gap.length})`);
    assert.equal(gap[0].check_slug, "config-sensor-gap");
    assert.equal(gap[0].kind, "other");
    assert.equal(gap[0].finding_type, "gap");
    assert.equal(gap[0].locations[0].location, "governance/headroom-sensor");
    assert.equal(gap[0].locations[0].text, "last_recorded=2026-W44 expected=2026-W45 this_week=2026-W46",
      "the evidence names all three weeks -- what was recorded, what was owed, and when we asked");
    roundTrip(gap[0]);

    // The three ways it must NOT fire.
    assert.deepEqual(checkSensorGap({ entries: H }, { week: "2026-W45", prevWeek: "2026-W44" }), [],
      "a history recorded LAST week is current, not a gap");
    assert.deepEqual(checkSensorGap({ entries: [] }, { week: "2026-W46", prevWeek: "2026-W45" }), [],
      "an empty history is a first run -- there is no week it failed to record");
    assert.deepEqual(checkSensorGap({ entries: H }, { prevWeek: "2026-W45" }), [],
      "with no week asked about there is nothing to compare");

    // The newest week wins, not the last one in the array.
    const mixed = [...H, { week: "2026-W45", location: "governance/bd-knowledge-patterns", bytes: 1, bar: 2 },
      { week: "2026-W43", location: "governance/ds-knowledge-patterns", bytes: 1, bar: 2 }];
    assert.deepEqual(checkSensorGap({ entries: mixed }, { week: "2026-W46", prevWeek: "2026-W45" }), [],
      "the GREATEST week is what counts, whatever order the entries are in");

    // runChecks orders headroom, then the gap, then the pins -- one document, one order.
    const tight = { location: "governance/runner-cycle.md", bytes: 380920, bar: 380980, strict: true, prev_week: null, prev_bytes: null };
    const composed = runChecks({ surfaces: [tight], entries: H },
      { week: "2026-W46", prevWeek: "2026-W45", hasCreds: false, spawn: () => ({ status: 1, stdout: "", stderr: "stale\n" }) });
    assert.deepEqual(composed.findings.map(f => f.check_slug),
      ["config-headroom", "config-sensor-gap", "config-pin-drift"]);
  });

  // --- the live run: REPORTED, never asserted ---------------------------------------------------
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "agt466-")), "headroom.json");
  try {
    const r = spawnSync(process.execPath, [SCRIPT, `--out=${out}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const first = String(r.stdout ?? "").split("\n")[0];
    console.log(`    [live, reported only] exit ${r.status}: ${first || String(r.stderr ?? "").split("\n")[0]}`);
    if (fs.existsSync(out)) {
      const doc = JSON.parse(fs.readFileSync(out, "utf8"));
      console.log(`    [live, reported only] ${doc.week} · found_by ${doc.found_by} · ${doc.findings.length} finding(s): ` +
        (doc.findings.map(f => `${f.check_slug} ${f.locations[0].location}`).join("; ") || "none"));
    }
  } finally {
    try { fs.rmSync(path.dirname(out), { recursive: true, force: true }); } catch { /* gone */ }
  }

  assert.deepEqual(failures, [], `${failures.length} arm(s) failed:\n  ${failures.join("\n  ")}`);
}

selfRun(import.meta.url, run);
