// DeepBench v7.0.1087 | tests/regression/agt-553-ledger-intake-guard.test.mjs | AGT-553
//
// THE LEDGER'S ONE INTAKE REFUSES THE TWO MALFORMED FIELDS. A finding's `fingerprint` is the 16-hex
// digest scripts/audit-ledger.js computes and every `locations` entry names a place; before this
// ship ingestFindings() checked neither, and 61 rows on record came through it place-less.
//   A  intakeProblems() -- the one validator: week, every location, the fingerprint.
//   B  ingestFindings() refuses each malformed shape BEFORE any read or write and names the field;
//      a well-formed finding lands and is found again by its fingerprint on its second sighting.
//      CONTROL: the same stored row under a 64-character value is not found -- the defect itself.
//   C  the parked migration text holds the same pattern FINGERPRINT_FORM holds, so the database
//      half, when an attended session applies it, refuses what the intake refuses.
// No arm writes to or reads the database: this ship changes no database object (the trigger is
// parked -- docs/design/agt-553-ledger-shape-guard.sql), so there is nothing live to assert.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEDGER = path.join(ROOT, "scripts", "audit-ledger.js");
const MIRROR = path.join(ROOT, "docs", "design", "agt-553-ledger-shape-guard.sql");
const CYCLE = "18dee91d-5b95-4398-a892-c29be0220b3f";
const DAY = 86400000;
const PLACE = "(an entry is {location, text}, never a bare string)";

function finding(extra = {}) {
  return {
    kind: "contradiction",
    locations: [{ location: "docs/agt553.md:12", text: "t" }],
    governing_fact: "agt-553 shape probe",
    confidence: "high",
    proposed_resolution: "refuse it at the door",
    finding_type: "defect",
    ...extra,
  };
}

function stubs(rows = []) {
  const posted = [];
  let reads = 0;
  return {
    posted,
    get reads() { return reads; },
    get: async () => { reads++; return rows; },
    post: async (t, b) => { posted.push({ t, b }); },
  };
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    ok  ${name}`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    FAIL ${name}: ${e.message.split("\n")[0]}`); }
  };

  const { ingestFindings, intakeProblems, fingerprint, isoWeek, FINGERPRINT_FORM } = await import(pathToFileURL(LEDGER).href);
  const THIS = isoWeek(new Date());
  const LAST = isoWeek(new Date(Date.now() - 7 * DAY));

  await arm("A the one validator names each field", async () => {
    assert.equal(typeof intakeProblems, "function", "scripts/audit-ledger.js must export intakeProblems()");
    assert.deepEqual(intakeProblems({ week: THIS, findings: [finding()] }), [], "a well-formed finding has no problems");
    assert.equal(fingerprint(finding()), "b27daecac5269cd4", "the fixture's digest, computed by the ledger");
    assert.ok(FINGERPRINT_FORM.test(fingerprint(finding())), "and it is the 16-hex form");
    assert.deepEqual(intakeProblems({ week: THIS, findings: [finding({ locations: [{ text: "t" }] })] }),
      [`findings[0].locations[0].location is required and non-empty ${PLACE}`]);
    assert.deepEqual(intakeProblems({ week: THIS, findings: [finding(), finding({ locations: [{ location: "a.md:1", text: "t" }, "b.md:2", { location: "  ", text: "t" }, { path: "c.md" }] })] }),
      [1, 2, 3].map(j => `findings[1].locations[${j}].location is required and non-empty ${PLACE}`));
    assert.deepEqual(intakeProblems({ week: THIS, findings: [finding({ locations: [] })] }),
      ["findings[0].locations must hold at least one {location, text} entry"]);
    assert.deepEqual(intakeProblems({ week: THIS, findings: [finding({ fingerprint: "a".repeat(64) })] }),
      ["findings[0].fingerprint is not the one this ledger computes (b27daecac5269cd4) -- omit it"]);
    assert.deepEqual(intakeProblems({ week: THIS, findings: [finding({ fingerprint: "b27daecac5269cd4" })] }), [],
      "a finding carrying the ledger's own digest is admitted");
    assert.deepEqual(intakeProblems({ week: "2026-W99", findings: [finding({ locations: [] })], thisWeek: "2026-W47" }),
      ["week 2026-W99 has not begun -- this ISO week is 2026-W47; omit week to stamp it."],
      "the week answers first and alone (AGT-202's rule, now here)");
    assert.deepEqual(intakeProblems({ week: "W47", findings: [] }), ['week must be YYYY-Www (got "W47") -- omit it to stamp this ISO week.']);
  });

  await arm("B the intake refuses before it reads, and a carried finding is found again", async () => {
    for (const [bad, field] of [
      [finding({ locations: [{ text: "t" }] }), "findings[0].locations[0].location"],
      [finding({ locations: ["docs/agt553.md:12"] }), "findings[0].locations[0].location"],
      [finding({ locations: [{ path: "docs/agt553.md" }] }), "findings[0].locations[0].location"],
      [finding({ fingerprint: "a".repeat(64) }), "findings[0].fingerprint"],
    ]) {
      for (const apply of [true, false]) {
        const s = stubs();
        await assert.rejects(
          ingestFindings({ findings: [bad], foundBy: "hand:agt-553-qa", cycleId: CYCLE, apply, get: s.get, post: s.post }),
          e => e.message.startsWith("ingestFindings: ") && e.message.includes(field),
          `apply=${apply}: the refusal must name ${field}`);
        assert.equal(s.reads, 0, `apply=${apply}: refused before the read`);
        assert.equal(s.posted.length, 0, `apply=${apply}: and before any write -- no before-image for a row that will not exist`);
      }
    }
    // A batch of two with one malformed files NEITHER.
    const mixed = stubs();
    await assert.rejects(ingestFindings({ findings: [finding(), finding({ locations: [{ text: "t" }] })], foundBy: "hand:agt-553-qa", cycleId: CYCLE, apply: true, get: mixed.get, post: mixed.post }),
      /findings\[1\]\.locations\[0\]\.location/);
    assert.equal(mixed.posted.length, 0, "half a batch is never filed");

    // FIRST SIGHTING, last week: one before-image, then one row carrying the 16-hex digest.
    const first = stubs();
    const out1 = await ingestFindings({ findings: [finding()], week: LAST, foundBy: "hand:agt-553-qa", cycleId: CYCLE, apply: true, get: first.get, post: first.post });
    assert.equal(out1.written, 1);
    assert.deepEqual(first.posted.map(p => p.t), ["runner_before_images", "audit_findings"]);
    const row = first.posted[1].b;
    assert.equal(row.fingerprint, "b27daecac5269cd4");
    assert.equal(row.iso_week, LAST);

    // SECOND SIGHTING, this week, the line number moved: found by fingerprint, so it is `recurring`.
    const stored = { fingerprint: row.fingerprint, iso_week: row.iso_week, status: "open", locations: row.locations };
    const second = stubs([stored]);
    const out2 = await ingestFindings({ findings: [finding({ locations: [{ location: "docs/agt553.md:40-44", text: "t" }] })], foundBy: "hand:agt-553-qa", get: second.get, post: second.post });
    assert.equal(out2.verdicts[0].verdict, "recurring", "the carried finding is found again, not filed as new");
    assert.equal(out2.verdicts[0].match, "b27daecac5269cd4");
    assert.deepEqual(out2.summary, { new: 0, seen: 0, recurring: 1, ruledOut: 0 });

    // CONTROL -- the defect: the same row stored under a 64-character value can never match.
    const blind = stubs([{ ...stored, fingerprint: "a672c8f772c17f9e6babf69b9c424cfff94fa6433ae1242b3b7a22024177da27" }]);
    const out3 = await ingestFindings({ findings: [finding()], foundBy: "hand:agt-553-qa", get: blind.get, post: blind.post });
    assert.equal(out3.verdicts[0].verdict, "new", "a row the ledger did not fingerprint is invisible to it");
  });

  await arm("C the parked trigger text tests the pattern the ledger exports", async () => {
    const sql = fs.readFileSync(MIRROR, "utf8");
    assert.equal(FINGERPRINT_FORM?.source, "^[0-9a-f]{16}$");
    assert.equal(sql.split(`NEW.fingerprint !~ '${FINGERPRINT_FORM.source}'`).length - 1, 1, "once");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n${failures.join("\n")}`);
}

selfRun(import.meta.url, run);
export default run;
