// DeepBench v7.0.897 | tests/regression/agt-466-governance-headroom.test.mjs | AGT-466
//
// FEATURE: AGT-466 -- scripts/audit-headroom.js, the Auditor's weekly headroom, growth and pin
// sensor over the governance surfaces that carry a byte bar, and the two auditor-routine.md lines
// that run it and merge its file.
// Kickoff: docs/kickoffs/v7.0.897-AGT-466-governance-headroom-sensor.md §5 tasks 1-3.
//
// DISCRIMINATING BY CONSTRUCTION: every arm imports scripts/audit-headroom.js, which does not
// exist on the tree before this change -- the import throws and the whole file is red, so a no-op
// cannot pass this test (kickoff §6 QA 1).
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

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  CHECK_SLUGS, FOUND_BY, WARN_FRACTION, WEEKS_AHEAD, SURFACES, PINS, RUNNER_CYCLE_REL,
  checkHeadroom, checkPinDrift, runChecks, evidenceText, freeOf, prevFromRows, lastLine,
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
    assert.deepEqual(CHECK_SLUGS, ["config-headroom", "config-pin-drift"]);
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

    // The evidence line is the shape the growth read parses back out of the ledger.
    assert.equal(evidenceText(growing),
      "bytes=20000 bar=24576 free=4576 pct_used=81.38 prev_week=2026-W42 prev_bytes=18800 delta=+1200");
    assert.deepEqual(
      prevFromRows([{ iso_week: "2026-W41", locations: [{ location: growing.location, text: evidenceText(growing) }] }],
        growing.location, "2026-W43"),
      { prev_week: "2026-W41", prev_bytes: 20000 }, "a prior week's own evidence line reads back");
    assert.deepEqual(
      prevFromRows([{ iso_week: "2026-W43", locations: [{ location: growing.location, text: evidenceText(growing) }] }],
        growing.location, "2026-W43"),
      { prev_week: null, prev_bytes: null }, "THIS week is not an earlier week -- a row cannot be its own baseline");
    assert.deepEqual(
      prevFromRows([{ iso_week: "2026-W41", locations: [{ location: "governance/somewhere-else", text: evidenceText(growing) }] }],
        growing.location, "2026-W43"),
      { prev_week: null, prev_bytes: null }, "another surface's bytes are not this surface's baseline");

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
    assert.equal(step1[0], "node scripts/audit-headroom.js --out=$S/headroom.json");
    const ins = md.split("\n").find(l => l.includes('INS="$S/cluster.json'));
    assert.ok(ins, "the step 3 merge line is still found by its INS= list");
    assert.ok(ins.includes("$S/board.json $S/headroom.json "),
      "the merge reads the sensor's file, next to the board's");
    // A collected file nobody merges is a file nobody reads: the two edits are one change.
    assert.equal((md.match(/\$S\/headroom\.json/g) ?? []).length, 2,
      "the file is written in step 1 and merged in step 3 -- exactly those two homes");
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
