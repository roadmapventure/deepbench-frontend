// DeepBench v7.0.301 | tests/regression/SES-205-tripwire-backlog.js | SES-205
//
// Guards the three halves of SES-205: the SIGNATURE (the check id, never the detail), the
// AGGREGATION policy (one row per check class), and the two ELIGIBILITY exclusions (WARN never
// files; a gating check never files).
//
// THE DEFECT, as the measurement rather than the story: `node scripts/check-session-docs.js`
// printed 48 FLAG and 4 WARN findings to stdout and exits 0, in a job whose own closing line reads
// "Report only -- nothing auto-fixed". Nothing persisted them, so nothing could tell a NEW finding
// from one printed on every run for a week.
//
// EVERY CLAUSE CARRIES ITS OWN NEGATIVE CONTROL -- "would this still pass if the change did
// nothing?" must answer NO. Two of the controls are the retired designs themselves, applied to the
// SAME fixture and asserted to LOSE, so the guard proves a DIFFERENCE from what was rejected
// rather than a property both share:
//   * signatureIsNotTheDetail() runs the obvious detail-hash next to the shipped signature and
//     shows the detail-hash MOVES between two runs of the same check while the shipped one does
//     not -- which is the duplicate-per-run failure this ticket exists to avoid.
//   * aggregationIsNotOnePerFinding() shows the retired one-row-per-finding design producing 18
//     rows from the ticket's own worked example where the shipped one produces 1.
//
// THE POLICY IS READ OUT OF THE SHIPPED MODULE, never restated here (John, 2026-08-23: "you should
// never be throwing away tests"; the SES-45 rule that a test must assert against the REAL
// implementation). In particular the gating set is IMPORTED from check-session-docs.js by the
// engine, and this file imports it from the same place -- so a copy cannot drift in either file.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun } from "./_lib/self-run.js";

import {
  eligibleFindings,
  signatureOf,
  aggregate,
  detect,
  buildTicketDraft,
  parseBacklogIds,
  sizeStampFor,
  SIZE_S_MAX_MEMBERS,
  TRIPWIRE_SOURCE_FILE,
  TRIPWIRE_PREFIX,
} from "../../scripts/tripwire-to-backlog.js";

import { GATING_CHECKS, GATING_SEVERITY, collectFindings } from "../../scripts/check-session-docs.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// The ticket's own worked example, in the shape the tripwire actually emits: one check-3d finding
// per over-cap ticket, each detail differing only by the id and a char count.
function overCapFindings(n, charBase = 2100) {
  return Array.from({ length: n }, (_, i) => ({
    check: "3d",
    severity: "FLAG",
    detail:
      `backlog_items: SES-${100 + i} description is ${charBase + i * 7} chars, over the 2000-char ` +
      `cap -- move the detail to docs/harvests/SES-${100 + i}.md and leave a pointer.`,
  }));
}

// -- 1. The signature is the check id, and the detail hash is the control --------------------

function signatureIsNotTheDetail() {
  // Two runs a week apart: the same check, the same subject, different numbers in the prose.
  const monday = { check: "6", severity: "FLAG", detail: "docs/STANDARDS.md is 52.0 KB, over the ~34 KB baseline (+25% slack)" };
  const friday = { check: "6", severity: "FLAG", detail: "docs/STANDARDS.md is 53.4 KB, over the ~34 KB baseline (+25% slack)" };

  const a = aggregate([monday])[0];
  const b = aggregate([friday])[0];
  assert.strictEqual(a.sigHash, b.sigHash,
    "the signature must not move when the detail's numbers move -- that is a new ticket every run");
  assert.strictEqual(a.sigKey, "tripwire|check|6",
    "the signature key is the CHECK ID; folding the detail back in is the defect, not a hardening");

  // NEGATIVE CONTROL: the retired design, on the same fixture, asserted to LOSE.
  const detailHash = (f) => JSON.stringify({ check: f.check, detail: f.detail });
  assert.notStrictEqual(detailHash(monday), detailHash(friday),
    "control is vacuous unless the detail-keyed form genuinely differs between the two runs");
}

function signatureIsStableAcrossMemberChurn() {
  const before = aggregate(overCapFindings(18))[0];
  const after = aggregate(overCapFindings(45, 3000))[0];
  assert.strictEqual(before.sigHash, after.sigHash,
    "member churn must not re-file the class -- the member list lives in the description, not the key");
  assert.notStrictEqual(before.members.length, after.members.length,
    "control: the two fixtures must actually differ in membership, or the clause proves nothing");
}

function signatureIsHexAndShort() {
  const sig = signatureOf("3d");
  assert.match(sig.hash, /^[0-9a-f]{12}$/,
    "the dedup token keeps heal-engine's sha256/12 format so one substring test serves both engines");
}

// -- 2. Aggregation is one row per check class -----------------------------------------------

function aggregationIsNotOnePerFinding() {
  const findings = overCapFindings(18);
  const groups = aggregate(findings);
  assert.strictEqual(groups.length, 1,
    "18 findings in one check must collapse to ONE row -- one per finding buries the board");
  assert.strictEqual(groups[0].members.length, 18, "every member is kept as evidence, not discarded");

  // NEGATIVE CONTROL: the retired one-row-per-finding design on the same fixture.
  assert.strictEqual(findings.length, 18,
    "control: the rejected design would have produced 18 rows from this exact fixture");
}

function distinctChecksStayDistinct() {
  const groups = aggregate([
    ...overCapFindings(2),
    { check: "6", severity: "FLAG", detail: "docs/STANDARDS.md is 52.0 KB, over the baseline" },
    { check: "13", severity: "FLAG", detail: "one procedure, 2 live homes" },
  ]);
  assert.strictEqual(groups.length, 3, "aggregation groups by check, and must not collapse ACROSS checks");
  assert.strictEqual(groups[0].check, "3d", "biggest class first -- the one most able to bury the report");
}

// -- 3. Eligibility: WARN never files; a gating check never files -----------------------------

function warnNeverFiles() {
  const findings = [
    { check: "3c", severity: "WARN", detail: "228 of 703 tickets carry a blank Type -- compliant later-tier rows" },
    { check: "6", severity: "FLAG", detail: "docs/STANDARDS.md is 52.0 KB" },
  ];
  const eligible = eligibleFindings(findings);
  assert.strictEqual(eligible.length, 1, "WARN is reporting-only -- the tripwire itself calls those known and deferred");
  assert.strictEqual(eligible[0].check, "6");
  // NEGATIVE CONTROL: without the severity test both would pass through.
  assert.strictEqual(findings.length, 2, "control: the fixture must contain a WARN, or the clause is vacuous");
}

function aGatingCheckNeverFiles() {
  const gating = [...GATING_CHECKS][0];
  assert.ok(gating, "control: SES-199's gating set must be non-empty, or this clause proves nothing");
  assert.strictEqual(GATING_SEVERITY, "FLAG", "the exclusion is scoped to the severity SES-199 gates on");

  const findings = [
    { check: gating, severity: "FLAG", detail: "a truth-registry drift finding that already fails CI" },
    { check: "6", severity: "FLAG", detail: "docs/STANDARDS.md is 52.0 KB" },
  ];
  const eligible = eligibleFindings(findings);
  assert.deepStrictEqual(eligible.map((f) => f.check), ["6"],
    "a gating FLAG fails CI already -- it cannot go unnoticed, and unnoticed is what this ticket fixes");

  // NEGATIVE CONTROL: with an empty gating set the same finding IS eligible, so the exclusion is
  // doing the work rather than something else about the fixture.
  const noGate = eligibleFindings(findings, { gatingChecks: new Set() });
  assert.strictEqual(noGate.length, 2, "control: the gating check is otherwise perfectly eligible");
}

function theEngineImportsTheGatingSetRatherThanCopyingIt() {
  const src = fs.readFileSync(path.join(REPO, "scripts", "tripwire-to-backlog.js"), "utf8");
  assert.match(src, /import\s*\{[^}]*GATING_CHECKS[^}]*\}\s*from\s*"\.\/check-session-docs\.js"/s,
    "the gating set must be IMPORTED from the policy's home -- a copy is what drifts (SES-45)");
  assert.ok(!/GATING_CHECKS\s*=\s*new Set/.test(src),
    "control: the engine must not define its own gating set anywhere");
}

// -- 4. Dedup, drafting and the id contract ---------------------------------------------------

function dedupMatchesOnTheSignature() {
  const findings = overCapFindings(3);
  const sig = aggregate(findings)[0].sigHash;
  const fresh = detect(findings, []);
  assert.strictEqual(fresh.detections.length, 1, "an unfiled class is detected");
  const filed = detect(findings, [`...Tripwire signature: \`${sig}\` ...`]);
  assert.strictEqual(filed.detections.length, 0, "a class whose signature already appears never files again");
  assert.strictEqual(filed.alreadyFiled.length, 1, "and it is reported as already filed, not silently dropped");
  // NEGATIVE CONTROL: an unrelated hash must not suppress it.
  const other = detect(findings, ["Tripwire signature: `000000000000`"]);
  assert.strictEqual(other.detections.length, 1, "control: dedup keys on THIS signature, not on any signature");
}

function theDraftCarriesItsSignatureAndItsEvidence() {
  const group = aggregate(overCapFindings(45))[0];
  const row = buildTicketDraft(group, "SES-225", { now: new Date("2026-08-29T02:00:00Z") });

  assert.ok(row.description.includes(group.sigHash),
    "the sig hash MUST be in the description -- it is the only thing the dedup can see");
  assert.ok(row.description.includes("SES-100 description is"),
    "the member findings ride along as evidence (§19d: every claim traces to a row)");
  assert.strictEqual(row.backlog_id, "SES-225");
  assert.strictEqual(row.source_file, TRIPWIRE_SOURCE_FILE);
  assert.strictEqual(row.status, "open", "filing is not fixing -- the row rides the normal queue");
  assert.strictEqual(row.tier, "next", "doc drift is not user-blocking; 'now' would jump John's named drain");
  assert.ok(row.type && row.type.trim(), "ck_backlog_type_when_promoted rejects a blank type on a now/next row");
  assert.strictEqual(row.priority_class, "P10 - Tooling");
  assert.strictEqual(row.gate_count, 0, "a doc-drift fix crosses no external gate (directive db84b784)");
  assert.strictEqual(row.size_stamp, "M", "45 members is not a one-shape one-cycle fix");
  assert.ok(!/^P[0-9]+ - [A-Za-z][A-Za-z'’ ]*\.?$/.test(row.title),
    "ck_backlog_title_not_class_string rejects a bare class string as a title");
}

function theSizeStampTracksTheMemberCount() {
  assert.strictEqual(sizeStampFor({ members: new Array(SIZE_S_MAX_MEMBERS).fill(0) }), "S");
  assert.strictEqual(sizeStampFor({ members: new Array(SIZE_S_MAX_MEMBERS + 1).fill(0) }), "M",
    "control: the stamp must actually change across the boundary, or it is a constant wearing a function");
}

function theEngineNeverMintsAnId() {
  assert.ok(parseBacklogIds("").error, "--apply without ids is refused, never silently invented");
  assert.ok(parseBacklogIds("LOO-1").error, `the prefix is ${TRIPWIRE_PREFIX} -- a foreign prefix is refused`);
  assert.ok(parseBacklogIds("SES-1,SES-1").error, "duplicate ids are refused (a hand-count's signature -- SES-18)");
  assert.deepStrictEqual(parseBacklogIds("SES-225, SES-226").ids, ["SES-225", "SES-226"],
    "control: a well-formed block parses, so the refusals above are not refusing everything");

  const src = fs.readFileSync(path.join(REPO, "scripts", "tripwire-to-backlog.js"), "utf8");
  assert.ok(!/feature_id_counter[^\n]*(update|UPDATE|patch \+ 1)/.test(src),
    "the engine must never claim the counter itself -- the cycle claims one contiguous block (CLAUDE.md)");
}

function theBeforeImageComesFirst() {
  const src = fs.readFileSync(path.join(REPO, "scripts", "tripwire-to-backlog.js"), "utf8");
  const img = src.indexOf("const img = await insertBeforeImage");
  const ins = src.indexOf("const ins = await insertTicket");
  assert.ok(img > -1 && ins > -1, "both writes must exist to be ordered");
  assert.ok(img < ins,
    "§19v: no before-image, no write -- the image's success is what authorises the insert");
  assert.match(src, /row_data:\s*null/,
    "row_data = NULL is the INSERT convention (SES-89): a Reverse of a filing is a DELETE of that pk");
}

// -- 5. The factor in check-session-docs.js is real, and the CLI still owns the report ---------

function collectFindingsIsTheRealCollector() {
  const findings = collectFindings();
  assert.ok(Array.isArray(findings), "collectFindings returns the findings array");
  assert.ok(findings.length > 0, "on this repo the tripwire always has something to say");
  for (const f of findings) {
    assert.ok(f && typeof f.check === "string" && typeof f.severity === "string" && typeof f.detail === "string",
      "every finding keeps the {check, severity, detail} shape the engine reads");
  }
  // The engine must read this, never the script's stdout -- parsing prose is a second
  // implementation agreeing with itself (STANDARDS.md Section 4, SES-45).
  const src = fs.readFileSync(path.join(REPO, "scripts", "tripwire-to-backlog.js"), "utf8");
  assert.match(src, /import\s*\{[^}]*collectFindings[^}]*\}\s*from\s*"\.\/check-session-docs\.js"/s,
    "findings come from the real collector, never from parsing [check N, SEV] lines");
  assert.ok(!/\[check\s/.test(src.replace(/^\s*\/\/.*$/gm, "")),
    "control: no stdout-format parsing survives outside the comments");
}

function theTripwireStaysReportOnlyOnABareRun() {
  const src = fs.readFileSync(path.join(REPO, "scripts", "check-session-docs.js"), "utf8");
  assert.match(src, /function collectFindings\(\)/, "the factor exists");
  assert.match(src, /function main\(\)\s*\{\s*const findings = collectFindings\(\);/,
    "main() must CALL the factor rather than keep a second copy of the collection order");
  assert.ok(!/insertBeforeImage|rest\/v1\/backlog_items/.test(src),
    "the gating CI script stays report-only -- the writer lives in its own file");
}

function run() {
  signatureIsNotTheDetail();
  signatureIsStableAcrossMemberChurn();
  signatureIsHexAndShort();
  aggregationIsNotOnePerFinding();
  distinctChecksStayDistinct();
  warnNeverFiles();
  aGatingCheckNeverFiles();
  theEngineImportsTheGatingSetRatherThanCopyingIt();
  dedupMatchesOnTheSignature();
  theDraftCarriesItsSignatureAndItsEvidence();
  theSizeStampTracksTheMemberCount();
  theEngineNeverMintsAnId();
  theBeforeImageComesFirst();
  collectFindingsIsTheRealCollector();
  theTripwireStaysReportOnlyOnABareRun();
}

selfRun(import.meta.url, run);
export default run;
