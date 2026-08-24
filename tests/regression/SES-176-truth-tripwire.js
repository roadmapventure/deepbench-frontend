// DeepBench v7.0.218 | tests/regression/SES-176-truth-tripwire.js | SES-176 (M2 Truth Infrastructure)
//
// Guards checks 9, 10 and 11 -- the truth tripwire -- in scripts/check-session-docs.js.
//
// The checks are imported from the real script rather than reimplemented here, per John's rule
// 2026-08-23 ("you should never be throwing away tests") and the DIR-603f44ea precedent: a test
// that copies the logic it guards passes forever while the shipped file rots.
//
// Every assertion below is paired with a NEGATIVE CONTROL -- the same fixture with the one thing
// that should matter removed -- because the failure mode this whole ticket exists to prevent is a
// checker that reports "all clear" while looking at nothing. "Would this still pass if the check
// did nothing?" must be answerable with "no" for each case.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";
import {
  parseRulesSnapshot,
  ruleIdOccurrences,
  anchorResolves,
  headingSlug,
  checkRetiredRulesInLiveVoice,
  checkRulePointers,
  checkRuleMarkers,
} from "../../scripts/check-session-docs.js";

const RETIRED_B25 = { id: "B25", status: "retired", superseded_by: "", canonical_doc: "docs/RUNNER-GOV-0820-REQUIREMENTS.md#B25" };
const SUPERSEDED_B31 = { id: "B31", status: "superseded", superseded_by: "B42", canonical_doc: "docs/runbooks/runner-cycle.md#B31" };
const LIVE_B42 = { id: "B42", status: "live", superseded_by: "", canonical_doc: "docs/RUNNER-GOV-0820-REQUIREMENTS.md#B42" };

function flags(findings, check) {
  return findings.filter(f => f.check === check);
}

// ---------------------------------------------------------------------------
// Check 9 -- a retired rule stated in live voice
// ---------------------------------------------------------------------------
function retiredRuleInLiveVoiceIsFlagged() {
  const bare = "- **B25. Next up visibility:** the briefing shows the queue's top five so John can\n  see what upcoming cycles will do.\n";
  const findings = [];
  checkRetiredRulesInLiveVoice(findings, [RETIRED_B25], new Map([["docs/FIXTURE.md", bare]]));
  assert.strictEqual(flags(findings, "9").length, 1, "a retired rule asserted with no retirement marker must flag");
  assert.ok(/B25/.test(findings[0].detail), "the finding must name the rule");
  assert.ok(/docs\/FIXTURE\.md/.test(findings[0].detail), "the finding must name the file");

  // NEGATIVE CONTROL: identical fixture, retirement marker restored. A check that flagged on the
  // mere presence of the id -- the naive implementation -- cannot tell these two apart.
  const marked = "- **B25. Next up visibility (RETIRED, struck by John 2026-08-21):** the briefing used to\n  show the queue's top five.\n";
  const clean = [];
  checkRetiredRulesInLiveVoice(clean, [RETIRED_B25], new Map([["docs/FIXTURE.md", marked]]));
  assert.strictEqual(flags(clean, "9").length, 0, "the same passage carrying a retirement marker must NOT flag");
}

function liveRuleIsNeverFlagged() {
  const text = "- **B42. Parallel cycles are the design:** every stamp-checked fire runs.\n";
  const findings = [];
  checkRetiredRulesInLiveVoice(findings, [LIVE_B42], new Map([["docs/FIXTURE.md", text]]));
  assert.strictEqual(flags(findings, "9").length, 0, "a LIVE rule stated in live voice is correct and must never flag");
}

// The marker and the mention are often paragraphs apart. This is the exact live case that broke
// the first implementation (a fixed +/-280-character window): runner-cycle.md opens a paragraph
// with "the cycle-level lease is RETIRED" and mentions B31 roughly 430 characters later.
function retirementMarkerElsewhereInTheSameBlockClears() {
  const filler = "His ruling, verbatim: routines should be able to run multiple in parallel and not overwrite each other and manage sessions accordingly. I can run ten sessions manually and there is no problem. What if I want to run one hundred automated routines at once? It should not be an issue - self administered, and it fixes itself if it happens to notice it is about to overwrite another session. ";
  const text = `**PARALLEL CYCLES ARE THE DESIGN — the cycle-level lease is RETIRED.** ${filler}B31's one-runner-at-a-time mutex was built when tickets had no claims.\n`;
  assert.ok(text.indexOf("B31") - text.indexOf("RETIRED") > 300, "fixture must place the marker beyond a 280-char window, or it proves nothing");
  const findings = [];
  checkRetiredRulesInLiveVoice(findings, [SUPERSEDED_B31], new Map([["docs/FIXTURE.md", text]]));
  assert.strictEqual(flags(findings, "9").length, 0, "a retirement marker anywhere in the enclosing block must clear the mention");
}

// A too-greedy block is a silent false negative. Boundaries must include INDENTED lead-ins, which
// is how RUNNER-GOV writes its sub-entries; without that the block runs back into the previous
// register entry and clears on vocabulary belonging to a different rule.
function blockDoesNotBorrowVocabularyFromTheNeighbouringEntry() {
  const text =
    "- **B30. Something that was retired long ago and says so right here.**\n" +
    "  **Second half of a different note:** collides with the runner_lease (B31), the single-runner\n" +
    "  control added after two cycles built ADM-1 twice.\n";
  const findings = [];
  checkRetiredRulesInLiveVoice(findings, [SUPERSEDED_B31], new Map([["docs/FIXTURE.md", text]]));
  assert.strictEqual(flags(findings, "9").length, 1, "the B31 mention must NOT clear on the word 'retired' belonging to B30's entry");
}

// HTML comments are the provenance chain every ship prepends. They quote retired ids constantly,
// and findings about a file's history are noise, not drift.
function provenanceCommentsAreNotLiveVoice() {
  const text = "<!-- v7.0.133 | SES-86 phase 3 — B25 and B31 named here as history -->\n\nNothing else.\n";
  const findings = [];
  checkRetiredRulesInLiveVoice(findings, [RETIRED_B25, SUPERSEDED_B31], new Map([["docs/FIXTURE.md", text]]));
  assert.strictEqual(flags(findings, "9").length, 0, "rule ids inside an HTML comment must not be read as live voice");

  // NEGATIVE CONTROL: the same sentence outside the comment must flag, or the stripper is simply
  // eating everything.
  const uncommented = "v7.0.133 SES-86 phase 3 — B25 governs the briefing top five.\n";
  const found = [];
  checkRetiredRulesInLiveVoice(found, [RETIRED_B25], new Map([["docs/FIXTURE.md", uncommented]]));
  assert.strictEqual(flags(found, "9").length, 1, "the same text outside a comment must still flag");
}

// Comment stripping must preserve offsets, or every reported line number is wrong.
function lineNumbersSurviveCommentStripping() {
  const text = "<!-- a\nmulti-line\ncomment -->\n\nB25 is in force and governs the preview.\n";
  const findings = [];
  checkRetiredRulesInLiveVoice(findings, [RETIRED_B25], new Map([["docs/FIXTURE.md", text]]));
  assert.strictEqual(flags(findings, "9").length, 1, "fixture must flag for the line number to be checkable");
  assert.ok(/line 5\b/.test(findings[0].detail), `expected the finding to report line 5, got: ${findings[0].detail}`);
}

function ruleIdsMatchAsWholeTokens() {
  assert.strictEqual(ruleIdOccurrences("see B25 here", "B25").length, 1, "a standalone id matches");
  assert.strictEqual(ruleIdOccurrences("see B250 here", "B25").length, 0, "B25 must not match inside B250");
  assert.strictEqual(ruleIdOccurrences("see B25 here", "B2").length, 0, "B2 must not match inside B25");
  assert.strictEqual(ruleIdOccurrences("(B31), the control", "B31").length, 1, "punctuation around an id still matches");
}

// ---------------------------------------------------------------------------
// Check 10 -- canonical_doc pointers resolve
// ---------------------------------------------------------------------------
function missingCanonicalFileIsFlagged() {
  const findings = [];
  checkRulePointers(findings, [{ id: "X-1", status: "live", canonical_doc: "docs/DOES-NOT-EXIST-SES176.md#anything" }], new Map());
  const f = flags(findings, "10");
  assert.strictEqual(f.length, 1, "a canonical_doc naming a missing file must flag");
  assert.strictEqual(f[0].severity, "FLAG", "a missing home is a FLAG, not a WARN");
}

function missingAnchorIsAWarnNotAFlag() {
  const doc = "# Real heading\n\nSome text.\n";
  const findings = [];
  checkRulePointers(findings, [{ id: "X-2", status: "live", canonical_doc: "docs/FIXTURE.md#no-such-section" }], new Map([["docs/FIXTURE.md", doc]]));
  const f = flags(findings, "10");
  assert.strictEqual(f.length, 1, "an unresolvable anchor must be reported");
  assert.strictEqual(f[0].severity, "WARN", "the file exists, so this is a stale anchor -- WARN");
}

function emptyCanonicalDocIsFlagged() {
  const findings = [];
  checkRulePointers(findings, [{ id: "X-3", status: "live", canonical_doc: "" }], new Map());
  assert.strictEqual(flags(findings, "10").length, 1, "a rule with no canonical_doc has no authoritative home and must flag");
}

function anchorFormsThisRepoActuallyUses() {
  assert.ok(anchorResolves("## Hard rules\n\ntext", "hard-rules"), "heading slug must resolve");
  assert.ok(anchorResolves("- **B1. Single DB table for all tickets**\n", "B1"), "the register bullet form must resolve");
  assert.ok(anchorResolves('<a name="custom"></a>\n', "custom"), "an explicit anchor must resolve");
  assert.ok(!anchorResolves("# Something else\n", "B1"), "an absent anchor must NOT resolve");
  // Live case: docs/STANDARDS.md's real heading, and the anchor CAP-VERSION-STRICT-INCREMENT
  // actually stores. The doubled hyphen is where `&` was dropped between two spaces -- a slugger
  // that collapses whitespace produces a single hyphen and fails to resolve a valid pointer.
  assert.strictEqual(headingSlug("Section 1: Session Naming & Versioning"), "section-1-session-naming--versioning");
  assert.ok(
    anchorResolves("## Section 1: Session Naming & Versioning\n\ntext\n", "section-1-session-naming--versioning"),
    "the real STANDARDS.md heading must resolve the real stored anchor",
  );
}

function pointerFailuresAreAggregatedNotRepeated() {
  const rules = ["A-1", "A-2", "A-3"].map(id => ({ id, status: "live", canonical_doc: "docs/GONE-SES176.md#x" }));
  const findings = [];
  checkRulePointers(findings, rules, new Map());
  assert.strictEqual(flags(findings, "10").length, 1, "three rules pointing at one missing file is ONE finding, not three");
  assert.ok(/A-1, A-2, A-3/.test(findings[0].detail), "the single finding must still name every affected rule");
}

// ---------------------------------------------------------------------------
// Check 11 -- {{rule:ID}} markers resolve
// ---------------------------------------------------------------------------
function unknownMarkerIsFlagged() {
  const findings = [];
  checkRuleMarkers(findings, [LIVE_B42], new Map([["docs/FIXTURE.md", "Text with {{rule:NOPE-1}} inline.\n"]]));
  const f = flags(findings, "11");
  assert.strictEqual(f.length, 1, "a marker naming no registry row must flag");
  assert.ok(/NOPE-1/.test(f[0].detail), "the finding must name the unresolvable id");
}

function knownMarkerIsClean() {
  const findings = [];
  checkRuleMarkers(findings, [LIVE_B42], new Map([["docs/FIXTURE.md", "Text with {{rule:B42}} inline.\n"]]));
  assert.strictEqual(flags(findings, "11").length, 0, "a marker resolving to a real rule must not flag");
}

// ---------------------------------------------------------------------------
// Snapshot reader
// ---------------------------------------------------------------------------
function snapshotRoundTrips() {
  const doc = [
    "| Rule | Status | Enforcement | Source group | Canonical doc | Superseded by | Statement |",
    "|---|---|---|---|---|---|---|",
    "| B31 | superseded | script | runner-gov-register | docs/runbooks/runner-cycle.md#B31 | B42 | The original single-runner control. |",
    "| HR-MERGE | live | reviewer | claude-md-hard-rules | CLAUDE.md#hard-rules |  | Never merge dev into main without John's sign-off. |",
  ].join("\n");
  const rules = parseRulesSnapshot(doc);
  assert.strictEqual(rules.length, 2, "both rows must parse");
  assert.strictEqual(rules[0].id, "B31");
  assert.strictEqual(rules[0].superseded_by, "B42");
  assert.strictEqual(rules[1].superseded_by, "", "an empty cell decodes to empty (SQL NULL), never to the string 'undefined'");
  assert.strictEqual(rules[1].canonical_doc, "CLAUDE.md#hard-rules");
}

function escapedCellsSurvive() {
  const doc = [
    "| Rule | Status | Enforcement | Source group | Canonical doc | Superseded by | Statement |",
    "|---|---|---|---|---|---|---|",
    "| X-9 | live | prose | standards-caps | docs/S.md#a |  | Never write a \\| pipe \\\\ or a\\nnewline raw. |",
  ].join("\n");
  const rules = parseRulesSnapshot(doc);
  assert.strictEqual(rules.length, 1, "a row whose statement contains an escaped pipe must not split into extra cells");
  assert.ok(rules[0].statement.includes("| pipe"), "the escaped pipe must decode back to a literal pipe");
  assert.ok(rules[0].statement.includes("\n"), "the escaped newline must decode back to a real newline");
}

async function run() {
  retiredRuleInLiveVoiceIsFlagged();
  liveRuleIsNeverFlagged();
  retirementMarkerElsewhereInTheSameBlockClears();
  blockDoesNotBorrowVocabularyFromTheNeighbouringEntry();
  provenanceCommentsAreNotLiveVoice();
  lineNumbersSurviveCommentStripping();
  ruleIdsMatchAsWholeTokens();
  missingCanonicalFileIsFlagged();
  missingAnchorIsAWarnNotAFlag();
  emptyCanonicalDocIsFlagged();
  anchorFormsThisRepoActuallyUses();
  pointerFailuresAreAggregatedNotRepeated();
  unknownMarkerIsFlagged();
  knownMarkerIsClean();
  snapshotRoundTrips();
  escapedCellsSurvive();
}

selfRun(import.meta.url, run);
export default run;
