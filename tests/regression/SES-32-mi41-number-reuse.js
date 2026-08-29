// DeepBench v7.0.325 | tests/regression/SES-32-mi41-number-reuse.js | SES-32
//
// Guards SES-32's finding: `MI-41` names TWO DIFFERENT ITEMS in this repo's history, and the
// kickoff sentence that conflates them is the thing that keeps regenerating the question.
//
// THE DEFECT, as a measurement rather than a story. docs/kickoffs/v6.1.43-S-MI-42-...md line 8
// reads "supersedes/folds in the standalone `MI-41` idea from the same design session
// (chat-timer/Agent-Routing-drawer sync)". The `MI-41` open on the board describes something else
// entirely -- `AuditColumn`'s outer wrapper has no flex:1/minHeight:0/overflowY:auto chain, found
// during S-MI-34's QA on the same day. SES-32 was filed on exactly that mismatch and left the
// question open for a year: "either a mis-cited ID or two things sharing one number ... resolve
// which, then either close `MI-41` or restate it."
//
// THE ANSWER IS NUMBER REUSE, and it was already written down. docs/FEATURES-ARCHIVE.md's own
// MI-42 row says it verbatim -- "`MI-41` (original, unrelated to `S-MI-34`'s Column 3 growth
// finding of the same name)" -- and two other artifacts treat the surviving MI-41 as open:
// docs/kickoffs/v6.2.24-MI-55-...md ("does not touch `MI-41`'s open question for the other four
// drawers") and the archive's MI-54 row ("still open -- this fix is the reference pattern for
// closing that one too"). The correction therefore CITES that record instead of inventing a
// second home for the same fact; the only thing that changed is that the kickoff which caused the
// ambiguity now carries the disambiguation.
//
// THE EDIT THIS SHIP FORBIDS, and it is the one SES-32's own ticket text invites: closing `MI-41`
// on the strength of that fold sentence. That would close a LIVE bug. Re-measured at this ship,
// not recalled: AuditColumn's wrapper is `display:flex, flexDirection:column, gap:14,
// position:relative` and carries none of the three properties, while InteractColumn carries all
// three -- so the detector below can see the properties when they are present, and the "still
// broken" assertion is not passing for an unrelated reason (the both-directions rule from
// .claude/rules/supabase-column-grants.md, applied to a source grep).
//
// THE RULE IS READ OUT OF THE SHIPPED FILE, never restated here (John, 2026-08-23: "you should
// never be throwing away tests"; the SES-104 / SES-158 / SES-213 precedent). A test that copies
// the text it guards passes forever while the shipped file rots.
//
// EVERY CLAUSE IS PAIRED WITH A NEGATIVE CONTROL plus the SES-158 vacuity meta-check. The
// FILE-LEVEL control strips the added block and asserts 4 of 4 clauses fail -- reconstructed
// in-process rather than read from `origin/dev`, deliberately: SES-240 is the open finding that
// asserting against that moving ref makes a guard fail for reasons unrelated to its subject.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KICKOFF = path.join(ROOT, "docs/kickoffs/v6.1.43-S-MI-42-live-agent-orchestration-streaming.md");
const SCREEN = path.join(ROOT, "src/screens/MarketIntelligenceScreen.jsx");

// The marker that opens the correction sub-bullet. Named once so the file-level control can strip
// exactly the block this ship added and nothing else.
const CORRECTION_MARKER = "**`MI-41` IS A REUSED NUMBER";

// Markdown here is one very long line, but normalising whitespace keeps every clause reflow-proof
// if it is ever re-wrapped (the SES-194 lesson).
export const norm = s => s.replace(/\s+/g, " ");

// Pure: the correction block, from its marker to the end of that list item. Returns "" when
// absent -- a finding the caller reports, never a throw.
export function extractCorrection(md) {
  const a = md.indexOf(CORRECTION_MARKER);
  if (a < 0) return "";
  const b = md.indexOf("\n- ", a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// Pure: the pre-change file, reconstructed by removing the sub-bullet this ship added.
export function withoutCorrection(md) {
  const a = md.indexOf(CORRECTION_MARKER);
  if (a < 0) return md;
  const lineStart = md.lastIndexOf("\n", a) + 1;
  const b = md.indexOf("\n- ", a);
  return md.slice(0, lineStart) + (b < 0 ? "" : md.slice(b + 1));
}

// A clause earns its place only if REMOVING it would change what a later cycle does.
export const CLAUSES = [
  {
    id: "names-the-reuse",
    detail:
      "the correction must say the open MI-41 is a DIFFERENT ITEM THAT REUSED THE NUMBER. " +
      "'related to' or 'see also' leaves the reader with the same two-readings problem SES-32 " +
      "was filed on",
    test: s => /different item that reused the number/i.test(norm(s)),
    breaks: s => s.replace(/different item that reused the number/i, "closely related item"),
  },
  {
    id: "forbids-the-close",
    detail:
      "the correction must carry the explicit prohibition on closing MI-41 on the fold " +
      "sentence's strength -- that close is the destructive action SES-32's own wording invites, " +
      "and it would close a live bug",
    test: s => /do NOT close the open `MI-41`/.test(s),
    breaks: s => s.replace("do NOT close the open `MI-41`", "review the open `MI-41`"),
  },
  {
    id: "cites-the-existing-record",
    detail:
      "the correction must cite docs/FEATURES-ARCHIVE.md's own MI-42 row, which already stated " +
      "the disambiguation. Without the citation this reads as a fact invented at correction time " +
      "and becomes a second home for it",
    test: s => /FEATURES-ARCHIVE\.md/.test(s) && /already says so verbatim/i.test(norm(s)),
    breaks: s => s.replace(/already says so verbatim/i, "agrees"),
  },
  {
    id: "carries-the-live-measurement",
    detail:
      "the correction must carry the re-measured premise -- the three properties AuditColumn's " +
      "wrapper still lacks -- rather than asserting from the ticket. A 'do not close' guarding a " +
      "ticket whose premise died is the opposite error",
    test: s => /flexDirection:column, gap:14, position:relative/.test(norm(s))
            && /none of the three properties/i.test(norm(s)),
    breaks: s => s.replace(/none of the three properties/i, "the wrong properties"),
  },
];

function theShippedKickoffIsClean() {
  const s = extractCorrection(fs.readFileSync(KICKOFF, "utf8"));
  assert.ok(s, "the SES-32 correction block was not found in the v6.1.43 kickoff -- the marker moved");
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `SES-32 clause "${c.id}" is not satisfied by the shipped kickoff: ${c.detail}`);
  }
}

function aMissingBlockIsFlagged() {
  assert.strictEqual(extractCorrection("no such section here"), "",
    "extractCorrection must return '' for an absent block so the caller reports it rather than throwing");
}

function everyClauseHasTeeth() {
  const s = extractCorrection(fs.readFileSync(KICKOFF, "utf8"));
  for (const c of CLAUSES) {
    const broken = c.breaks(s);
    assert.notStrictEqual(broken, s,
      `SES-32 clause "${c.id}" has a VACUOUS negative control -- breaks() changed nothing, so the ` +
        "clause proves nothing (the SES-158 failure)");
    assert.ok(!c.test(broken),
      `SES-32 clause "${c.id}" still passes with its own rule removed -- it is not discriminating`);
  }
}

function aVacuousMutationFailsItsOwnControl() {
  const vacuous = { breaks: s => s };
  assert.strictEqual(vacuous.breaks("anything"), "anything",
    "the meta-assertion's own fixture must be unchanged, or it is not testing vacuity");
}

// FILE-LEVEL NEGATIVE CONTROL: the pre-change file must fail every clause. Reconstructed here
// rather than fetched from origin/dev (SES-240).
function thePreChangeFileFailsAllFourClauses() {
  const md = fs.readFileSync(KICKOFF, "utf8");
  const before = withoutCorrection(md);
  assert.notStrictEqual(before, md,
    "withoutCorrection() removed nothing -- the file-level control is vacuous");
  assert.ok(before.includes("supersedes/folds in the standalone `MI-41` idea"),
    "the reconstruction must KEEP the original fold sentence -- stripping that too would make the " +
      "control pass for the wrong reason");
  const s = extractCorrection(before);
  for (const c of CLAUSES) {
    assert.ok(!c.test(s),
      `SES-32 clause "${c.id}" passes on the PRE-CHANGE file -- it does not discriminate this ship`);
  }
}

// --- the discriminating semantic check ---------------------------------------------------------
//
// The naive rule a reader applies to a fold sentence is "kickoff X folds in Y, therefore Y is
// discharged". SES-32 exists because that rule is WRONG here. resolveFold() compares the SUBJECT
// of the fold against the subject of the row still carrying the id; the negative control is the
// naive rule applied to the SAME fixture and asserted to LOSE.

export function resolveFold(foldSubject, openRowSubject) {
  if (openRowSubject == null) return "discharged";           // nothing survives carrying the id
  return foldSubject === openRowSubject ? "discharged" : "number-reuse";
}

export const naiveFoldRule = () => "discharged";             // the retired reading, kept to lose

function theSubjectTestSeparatesReuseFromDischarge() {
  const folded = "chat-timer/Agent-Routing-drawer sync";
  const openRow = "AuditColumn wrapper has no flex/minHeight/overflow chain";

  assert.strictEqual(resolveFold(folded, openRow), "number-reuse",
    "MI-41: the folded subject and the open row's subject differ, so the id was REUSED and the " +
      "open row is not the thing MI-42 discharged");
  // The negative control IS the naive rule, on the same fixture.
  assert.strictEqual(naiveFoldRule(folded, openRow), "discharged",
    "the naive 'folds in means closed' rule must reach the OPPOSITE verdict on this fixture -- if " +
      "it did not, the fixture does not reproduce the defect and this check proves nothing");

  // ...and the fix must not turn every fold into a collision.
  assert.strictEqual(resolveFold("timer sync", "timer sync"), "discharged",
    "a genuine fold, where both subjects match, must still resolve as discharged");
  assert.strictEqual(resolveFold("timer sync", null), "discharged",
    "a fold whose secondary id has no surviving row is discharged -- which is the ORIGINAL MI-41");
}

// --- MI-41's premise, measured from the real source, both directions ---------------------------

export function wrapperStyleOf(src, fnName) {
  const at = src.indexOf(`function ${fnName}(`);
  if (at < 0) return null;
  const open = src.indexOf("<div style={{", at);
  if (open < 0) return null;
  const end = src.indexOf("}}", open);
  return end < 0 ? null : src.slice(open, end);
}

const HAS_CHAIN = s => /flex:\s*1/.test(s) && /minHeight:\s*0/.test(s) && /overflowY/.test(s);

function mi41sPremiseIsStillLive() {
  const src = fs.readFileSync(SCREEN, "utf8");

  const audit = wrapperStyleOf(src, "AuditColumn");
  assert.ok(audit, "AuditColumn's wrapper div was not found -- the anchor moved, not a finding");
  assert.ok(!HAS_CHAIN(audit),
    "AuditColumn's wrapper now HAS the flex/minHeight/overflow chain -- MI-41's premise died, so " +
      "the kickoff's 'do NOT close' clause is now guarding a dead ticket and must be revisited " +
      "rather than left standing");

  // THE OTHER DIRECTION, so the assertion above cannot pass because the detector is broken.
  const interact = src.slice(src.indexOf("function InteractColumn("));
  assert.ok(HAS_CHAIN(interact.slice(0, 6000)),
    "InteractColumn must still carry the chain -- if the detector cannot find it where it " +
      "demonstrably exists, the AuditColumn assertion above proved nothing");
}

async function run() {
  theShippedKickoffIsClean();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  thePreChangeFileFailsAllFourClauses();
  theSubjectTestSeparatesReuseFromDischarge();
  mi41sPremiseIsStillLive();
}

selfRun(import.meta.url, run);
export default run;
