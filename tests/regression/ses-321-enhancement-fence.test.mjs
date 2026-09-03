// DeepBench v7.0.416 | tests/regression/ses-321-enhancement-fence.test.mjs | SES-321
//
// FEATURE: SES-321 -- an EL-01-admitted enhancement now passes M5-01's Selfbuild epic fence.
// Measured while filing LOG-143 (2026-09-02): prime_directive_queue()'s `buildable` CTE INNER
// JOINed `epics` on `name ILIKE 'Selfbuild%'` BEFORE the EL-01 admission clause was ever evaluated,
// so an unlinked ticket admitted under EL-01 (claim, rationale, cycles present, under the weekly
// cap) could never reach the pick path even though the enhancement-lane register's own promise
// (EL-01: "the row is the verdict") says admission is the whole test. Migration
// ses321_enhancement_passes_fence changes the fence to a LEFT JOIN evaluated as
// `(Selfbuild epic OR admitted enhancement)`, and M5-01's registry statement gains the clause
// "...or an enhancement admitted under EL-01" in the same commit.
//
// TWO ARMS.
//   * DOC arm (always runs): docs/RUNNER-GOV-M5-REQUIREMENTS.md#M5-01 carries the amended clause,
//     byte-for-byte the docs/governance/RULES-SNAPSHOT.md row (reusing ses-280's own parsers so a
//     second implementation cannot quietly agree with itself -- SES-45), and the amendment note
//     names the migration and both functions read for the same restatement. The enhancement-lane
//     register's "What this lane is for" section says the fence is now passed by admission. Every
//     clause carries a negative control.
//   * LIVE arm (SUPABASE_URL + SUPABASE_SERVICE_KEY, declared NOT RUN otherwise): reads the real
//     board over PostgREST only -- THIS TEST NEVER INSERTS A ROW. The board convention recorded in
//     ses-305 ("we cannot INSERT from a test -- no throwaway rows on the board") applies here for
//     the same reason: backlog_items is read live by the briefing page and other systems, so even a
//     temporary fixture row is a visible production side effect for as long as it exists.
//     Behavioural proof that an unlinked admitted enhancement is served, and stops being served the
//     moment its claim is blanked, was measured live on a rolled-back fixture (backlog_id
//     ZFIX-SES321) by this session over the MCP at ship time -- recorded on the migration and in
//     the ship commit, not re-executed here. What IS checked live: no enhancement-origin ticket
//     that fails EL-01's admission test is ever returned by prime_directive_queue(), over
//     WHATEVER rows the real board currently carries (linked or not) -- and the specific unlinked
//     case is declared NOT RUN when the board carries no such row today, rather than passed
//     vacuously.
//
// Invocation: node tests/regression/ses-321-enhancement-fence.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSnapshot, parseCanonicalDoc } from "./ses-280-m5-governance-rules.test.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const M5_REL = "docs/RUNNER-GOV-M5-REQUIREMENTS.md";
const LANE_REL = "docs/RUNNER-GOV-ENHANCEMENT-LANE.md";
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// ---------------------------------------------------------------------------
// DOC arm clauses. Each earns its place only if removing it would let a reader miss what changed.
// ---------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "m5-01-statement-carries-the-el-01-exception",
    detail:
      "M5-01's own statement (not just the amendment note) must say an enhancement admitted under " +
      "EL-01 also clears the fence -- a reader who reads only the blockquote and skips the prose " +
      "below it must still get the right rule",
    test: s => /or an enhancement admitted under EL-01/.test(s),
    breaks: s => s.replace(/, or an enhancement admitted under EL-01/, ""),
  },
  {
    id: "m5-01-no-longer-says-unlinked-is-never-picked-unconditionally",
    detail:
      "the trailing clause must carry the 'unless admitted as such' exception -- without it the " +
      "statement still reads as an absolute ban on unlinked tickets, directly contradicting the " +
      "first half in the same sentence",
    test: s => /never picked by a cycle unless admitted as such/.test(s),
    breaks: s => s.replace(/ unless admitted as such/, ""),
  },
  {
    id: "amendment-note-names-the-migration-and-both-read-functions",
    detail:
      "the M5-01 amendment paragraph must name the migration (so a reader can find the exact SQL " +
      "change) and BOTH functions that were read for the same restatement and left untouched -- " +
      "without this a later editor cannot tell drain_chain_gate/runner_should_boot were considered " +
      "rather than simply forgotten",
    test: s =>
      /ses321_enhancement_passes_fence/.test(s) &&
      /drain_chain_gate/.test(s) &&
      /runner_should_boot/.test(s),
    breaks: s => s.replace(/ses321_enhancement_passes_fence/g, "some migration"),
  },
  {
    id: "amendment-note-names-the-decision-id",
    detail:
      "the amendment must carry the record_decision() id so the change is traceable to a reversible " +
      "decision row, not just a paragraph",
    test: s => /decision `[0-9a-f-]{36}`/.test(s),
    breaks: s => s.replace(/decision `[0-9a-f-]{36}`/, "a decision"),
  },
];

export const LANE_CLAUSES = [
  {
    id: "lane-doc-says-fence-passed-by-admission-since-ses-321",
    detail:
      "the enhancement lane register's own 'What this lane is for' section must say M5-01's fence " +
      "is now passed by admission -- EL-01 promised this all along, and the lane doc is where a " +
      "reader learns whether the promise is actually kept in the pick path",
    test: s => /SES-321/.test(s) && /passed by admission/.test(s),
    breaks: s => s.replace(/passed by admission/, "enforced separately"),
  },
];

function whatThisLaneIsFor(text) {
  const a = text.indexOf("## What this lane is for");
  const b = text.indexOf("## The rules", a);
  return b < 0 ? "" : text.slice(a, b);
}

function theM5DocCarriesTheAmendedStatement() {
  const doc = read(M5_REL);
  const canonical = parseCanonicalDoc(doc);
  const statement = canonical.get("M5-01");
  assert.ok(statement, `${M5_REL} carries no M5-01 blockquote at all`);
  for (const c of CLAUSES.slice(0, 2)) {
    assert.ok(c.test(statement), `${M5_REL}#M5-01 lost clause "${c.id}": ${c.detail}`);
  }

  const snap = parseSnapshot(read(SNAPSHOT_REL));
  const row = snap.find(r => r.id === "M5-01");
  assert.ok(row, "M5-01 is missing from docs/governance/RULES-SNAPSHOT.md");
  assert.strictEqual(
    row.statement, statement,
    "M5-01's statement differs between the canonical doc and the generated snapshot -- re-run " +
      "node scripts/export-governance-snapshot.js and reconcile the doc, in that order",
  );
}

function theAmendmentNoteCarriesTheFullStory() {
  // The prose paragraph directly under M5-01's blockquote, up to the next anchored rule heading.
  const doc = read(M5_REL);
  const start = doc.indexOf('<a id="M5-01">');
  const end = doc.indexOf('<a id="M5-02">', start);
  assert.ok(start >= 0 && end > start, "M5-01's section could not be located to read its amendment note");
  const section = doc.slice(start, end);
  for (const c of CLAUSES.slice(2)) {
    assert.ok(c.test(section), `M5-01's amendment note lost clause "${c.id}": ${c.detail}`);
  }
}

function theLaneDocSaysAdmissionIsTheFence() {
  const section = whatThisLaneIsFor(read(LANE_REL));
  assert.ok(section.length > 0, `${LANE_REL} carries no "What this lane is for" section`);
  for (const c of LANE_CLAUSES) {
    assert.ok(c.test(section), `${LANE_REL}'s "What this lane is for" lost clause "${c.id}": ${c.detail}`);
  }
}

function everyClauseHasTeeth() {
  const m5Statement = parseCanonicalDoc(read(M5_REL)).get("M5-01") ?? "";
  const m5Doc = read(M5_REL);
  const start = m5Doc.indexOf('<a id="M5-01">');
  const end = m5Doc.indexOf('<a id="M5-02">', start);
  const m5Section = m5Doc.slice(start, end);
  const laneSection = whatThisLaneIsFor(read(LANE_REL));

  const targets = [
    [CLAUSES.slice(0, 2), m5Statement],
    [CLAUSES.slice(2), m5Section],
    [LANE_CLAUSES, laneSection],
  ];
  for (const [clauses, text] of targets) {
    for (const c of clauses) {
      const mutated = c.breaks(text);
      assert.notStrictEqual(mutated, text, `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (SES-158)`);
      assert.ok(!c.test(mutated), `clause "${c.id}" still passes after its own control removed the thing it checks -- the check is vacuous`);
    }
  }
}

// ---------------------------------------------------------------------------
// Arm 2 -- live Supabase over PostgREST. Read-only: no INSERT, no UPDATE, no DELETE.
// ---------------------------------------------------------------------------

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

async function theLiveBoardNeverServesAnUnadmittedEnhancement(url, key) {
  const enh = await pg(
    url, key,
    "backlog_items?select=backlog_id,epic_id,enhancement_claim,scope_rationale,predicted_cycles,status" +
      "&scope_origin=eq.enhancement&status=not.in.(done,removed)&limit=500",
  );
  const lanes = await pg(url, key, "rpc/prime_directive_queue", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  const served = new Set((Array.isArray(lanes) ? lanes : []).map(r => r.ref).filter(Boolean));

  const admitted = r =>
    !!(r.enhancement_claim && r.enhancement_claim.trim()) &&
    !!(r.scope_rationale && r.scope_rationale.trim()) &&
    r.predicted_cycles !== null;

  const notAdmitted = enh.filter(r => !admitted(r));
  if (notAdmitted.length === 0) {
    notRun(
      "an unadmitted enhancement is correctly withheld, as an OBSERVED property",
      "no open enhancement-origin ticket on the live board is currently missing claim, rationale or " +
        "cycles, so there is nothing this check can catch today.",
    );
  } else {
    const leaked = notAdmitted.filter(r => served.has(r.backlog_id));
    assert.deepStrictEqual(
      leaked.map(r => r.backlog_id), [],
      `prime_directive_queue() served unadmitted enhancement(s) ${leaked.map(r => r.backlog_id).join(", ")}`,
    );
  }

  // THE SES-321 CASE SPECIFICALLY: an unlinked (epic_id NULL) enhancement that IS admitted must be
  // served. Declared NOT RUN rather than passed vacuously when the board carries no such row --
  // behavioural proof for this exact shape is the rolled-back fixture measured at ship time
  // (backlog_id ZFIX-SES321: served admitted, absent once its claim was blanked; see the migration
  // header and the ship commit).
  const unlinkedAdmitted = enh.filter(r => r.epic_id === null && admitted(r) && r.status !== "delivered");
  if (unlinkedAdmitted.length === 0) {
    notRun(
      "an unlinked, EL-01-admitted enhancement is served, as an OBSERVED property on today's board",
      "no open enhancement-origin ticket on the live board today carries epic_id NULL while also " +
        "being admitted. Measured instead on a rolled-back fixture at ship time (ZFIX-SES321): " +
        "served once admitted, absent once its enhancement_claim was blanked. This is exactly the " +
        "case SES-321 fixes -- see docs/RUNNER-GOV-M5-REQUIREMENTS.md#M5-01's amendment note.",
    );
  } else {
    const missing = unlinkedAdmitted.filter(r => !served.has(r.backlog_id));
    assert.deepStrictEqual(
      missing.map(r => r.backlog_id), [],
      `unlinked admitted enhancement(s) ${missing.map(r => r.backlog_id).join(", ")} were NOT served ` +
        "by prime_directive_queue() -- the SES-321 fence widening regressed",
    );
  }
}

async function theCharteredLaneStillWorks(url, key) {
  // Non-vacuity for "chartered work is unaffected": the selfbuild lane must still be non-empty on
  // the real board, or this whole migration's blast radius cannot be observed live at all.
  const lanes = await pg(url, key, "rpc/prime_directive_queue", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  const selfbuild = (Array.isArray(lanes) ? lanes : []).filter(r => r.lane === "selfbuild");
  assert.ok(
    selfbuild.length > 0,
    "the selfbuild lane came back empty -- either nothing is buildable or the widened fence broke " +
      "chartered (non-enhancement) picking; both are findings, not a pass",
  );
}

async function run() {
  theM5DocCarriesTheAmendedStatement();
  theAmendmentNoteCarriesTheFullStory();
  theLaneDocSaysAdmissionIsTheFence();
  everyClauseHasTeeth();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm: no unadmitted enhancement served; an unlinked admitted enhancement served; " +
        "the selfbuild lane still non-empty",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The doc arm above still graded every " +
        "clause of the M5-01 amendment and the lane register's pointer against the committed text.",
    );
    return;
  }
  await theLiveBoardNeverServesAnUnadmittedEnhancement(url, key);
  await theCharteredLaneStillWorks(url, key);

  notRun(
    "the shipped body of prime_directive_queue() itself, and the grant assertions",
    "the function body ships as migration ses321_enhancement_passes_fence and lives in the " +
      "database, not this repo; PostgREST cannot read pg_get_functiondef. Measured this session, " +
      "not recalled: exactly 1 overload in pg_proc; EXECUTE revoked from PUBLIC/anon/authenticated " +
      "and held by service_role only (the migration's own trailing DO block asserts both, and " +
      "raises on either failing); and the rolled-back fixture (ZFIX-SES321) served once admitted, " +
      "not served with its enhancement_claim blanked, both confirmed live before this file existed.",
  );
}

selfRun(import.meta.url, run);
export default run;
