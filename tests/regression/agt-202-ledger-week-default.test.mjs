// DeepBench v7.0.636 | tests/regression/agt-202-ledger-week-default.test.mjs | AGT-202
//
// THE LEDGER STAMPS ITS OWN ISO WEEK, AND REFUSES A FORGED ONE. Before this ship
// ingestFindings()'s `week` had no default and no check: whatever a caller passed went straight
// through toRow() into `audit_findings.iso_week`, and the table's own guard is only
// CHECK (iso_week ~ '^\d{4}-W\d{2}$') -- so a WELL-FORMED WRONG week was accepted in full. That is
// not hypothetical: at 07:00Z on 2026-09-27 the ledger held 13 rows stamped `2026-W40`, all filed
// that day, from eight `runner:cycle:*` writers reading a runbook pseudo-call that passes `week:W`
// -- a week that had not begun. A finding filed into next week is invisible to this week's report
// and to the weekly filing cap that counts from it.
//
// Every arm is RED on the tree this file was written against, which is the point of writing it
// first (kickoff §6): (a) posts `iso_week: undefined`, and (b) and (c) do not throw at all.
//
//   a  NO `week` -> this ISO week, UTC. One row written, one read, and the posted body's iso_week
//      is isoWeek(new Date()) -- computed here from the shipped export, never a hardcoded string,
//      so the arm does not go red the moment the calendar turns.
//   b  A MALFORMED week (`2026-40`, the shape a hand-typed or shell-mangled value takes) is
//      refused BY FORM, before the read. Zero reads and zero writes is the discriminating half:
//      a check placed after the fetch, or after the before-image, would still pass "it threw".
//   c  A FUTURE week is refused as not-yet-begun, and `null` is refused by form. `null` is in here
//      deliberately -- a destructuring default fires on `undefined` ALONE, so the default cannot
//      rescue an explicit null and the form test is what must.
//   d  A PAST week SURVIVES. The override is not removed, only guarded: the CLI's
//      `--ingest --week=` back-ingest and auditor-write.js's context week are unchanged callers,
//      and an arm that only proved rejections would pass a build that hardcoded this week.
//   e  isoWeek() at the ticket's own instant is `2026-W39` -- the fact the whole ship rests on,
//      pinned so a future change to the ISO arithmetic cannot quietly re-open AGT-202.
//
// NOTHING HERE TOUCHES THE NETWORK OR THE LEDGER. `get` and `post` are stubs that count their
// calls; no credentials are read, so this file is never a partial run.

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEDGER = path.join(ROOT, "scripts", "audit-ledger.js");
const CYCLE = "18dee91d-5b95-4398-a892-c29be0220b3f";
const DAY = 86400000;

// The agt-131 fixture shape, carrying its own finding_type so the batch types itself under --apply.
function finding(extra = {}) {
  return {
    kind: "contradiction",
    locations: [{ location: "docs/agt202.md:1", text: "w" }],
    governing_fact: "agt-202 week-default probe",
    confidence: "high",
    proposed_resolution: "stamp the week",
    finding_type: "defect",
    ...extra,
  };
}

// One fresh pair of counting stubs per call: a shared pair would let arm (b)'s zero-read assertion
// pass on arm (a)'s leftovers.
function stubs() {
  const posted = [];
  let reads = 0;
  return {
    posted,
    get reads() { return reads; },
    get writes() { return posted.length; },
    get: async () => { reads++; return []; },
    post: async (t, b) => { posted.push({ t, b }); },
  };
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    ok  ${name}`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    FAIL ${name}: ${e.message.split("\n")[0]}`); }
  };

  const { ingestFindings, isoWeek } = await import(pathToFileURL(LEDGER).href);

  const call = (extra, s) => ingestFindings({
    findings: [finding()], foundBy: "hand:agt-202-qa", findingType: "defect",
    cycleId: CYCLE, apply: true, get: s.get, post: s.post, ...extra,
  });

  // --- a: omitted week -> this ISO week ---------------------------------------------------------
  await arm("a an omitted week stamps THIS ISO week", async () => {
    const s = stubs();
    const out = await call({}, s);
    assert.equal(out.written, 1, `one unseen finding files one row; got ${out.written}`);
    assert.equal(s.reads, 1, `exactly one over-read for the batch; got ${s.reads}`);

    const row = s.posted.find(p => p.t === "audit_findings");
    assert.ok(row, "the append must have happened");
    assert.equal(row.b.iso_week, isoWeek(new Date()),
      `an omitted week must stamp this ISO week, not undefined; got ${JSON.stringify(row.b.iso_week)}`);
    // The pre-change failure mode, named so a regression cannot read as a mere mismatch.
    assert.notEqual(row.b.iso_week, undefined, "iso_week: undefined is what the unguarded signature posted");
    assert.match(String(row.b.iso_week), /^\d{4}-W\d{2}$/, "and it is the form the table's CHECK accepts");
    // CONTROL: the before-image still precedes the row (§19v) -- the default did not reorder the append.
    const image = s.posted.find(p => p.t === "runner_before_images");
    assert.ok(image && s.posted.indexOf(image) < s.posted.indexOf(row),
      "the before-image is still written first and still authorises the append");
  });

  // --- b: a malformed week is refused by form, before the read ----------------------------------
  await arm("b a malformed week is refused BY FORM with 0 reads and 0 writes", async () => {
    const s = stubs();
    await assert.rejects(() => call({ week: "2026-40" }, s), /YYYY-Www/,
      "`2026-40` must be refused here by name, not accepted and left for PostgREST");
    assert.equal(s.reads, 0, `the refusal lands BEFORE the read; got ${s.reads} read(s)`);
    assert.equal(s.writes, 0, `and before any write -- before-image included; got ${s.writes} write(s)`);
  });

  // --- c: a future week, and an explicit null --------------------------------------------------
  await arm("c a future week has not begun, and null is not a default", async () => {
    const future = stubs();
    const nextWeek = isoWeek(new Date(Date.now() + 14 * DAY));
    await assert.rejects(() => call({ week: nextWeek }, future), /has not begun/,
      `${nextWeek} is the exact class of value that wrote the ledger's 13 W40 rows`);
    assert.equal(future.reads, 0, `a forward week is refused before the read; got ${future.reads}`);
    assert.equal(future.writes, 0, `and before the write; got ${future.writes}`);

    const nulls = stubs();
    await assert.rejects(() => call({ week: null }, nulls), /YYYY-Www/,
      "an explicit null is NOT undefined: the destructuring default never fires, so the form test must refuse it");
    assert.equal(nulls.reads, 0, `got ${nulls.reads} read(s)`);
    assert.equal(nulls.writes, 0, `got ${nulls.writes} write(s)`);
  });

  // --- d: a past week still overrides ------------------------------------------------------------
  await arm("d an explicit PAST week still overrides -- back-ingest is unchanged", async () => {
    const s = stubs();
    const out = await call({ week: "2026-W01" }, s);
    assert.equal(out.written, 1, `the override still files; got ${out.written}`);
    const row = s.posted.find(p => p.t === "audit_findings");
    assert.equal(row.b.iso_week, "2026-W01",
      "a caller that means an earlier week -- the CLI's --week back-ingest, auditor-write.js's context week -- keeps it");
    assert.notEqual(row.b.iso_week, isoWeek(new Date()),
      "a build that hardcoded this week over every caller would pass arm (a) and fail here");
  });

  // --- e: the instant the ticket was measured at -------------------------------------------------
  await arm("e isoWeek() at the ticket's own instant is 2026-W39", () => {
    assert.equal(isoWeek(new Date("2026-09-27T07:00:00Z")), "2026-W39",
      "the fact AGT-202 rests on: the 13 rows stamped 2026-W40 on this day were a week early");
    assert.ok(isoWeek(new Date("2026-09-27T07:00:00Z")) < "2026-W40",
      "and zero-padded YYYY-Www is what makes the forward-week test a string comparison");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
