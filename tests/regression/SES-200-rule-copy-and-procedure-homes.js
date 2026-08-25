// DeepBench v7.0.243 | tests/regression/SES-200-rule-copy-and-procedure-homes.js | SES-200 (M3)
//
// Guards checks 12 and 13 -- two of the three pieces SES-176 shipped partial and left ownerless.
//
// Both checks are IMPORTED from the real script, never reimplemented (John, 2026-08-23: "you should
// never be throwing away tests"; a test that copies the logic it guards passes forever while the
// shipped file rots).
//
// Every assertion is paired with a NEGATIVE CONTROL -- the same fixture with the one thing that
// should matter changed -- because both of these checks have an obvious implementation that reports
// something on every run and means nothing. "Would this still pass if the check did nothing?" must
// answer "no" for each case.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";
import {
  enclosingParagraph,
  statementContentWords,
  statementOverlap,
  checkRuleTextOutsideHome,
  normalizeProcedure,
  collectProcedureBlocks,
  duplicateProcedureHomes,
  RULE_COPY_OVERLAP,
  PROCEDURE_MIN_CHARS,
  PROCEDURE_HISTORY_DOCS,
} from "../../scripts/check-session-docs.js";

const RULE = {
  id: "B40",
  status: "live",
  canonical_doc: "docs/RUNNER-GOV-0820-REQUIREMENTS.md#B40",
  statement: "Claim a backlog ticket atomically via claimed_by/claimed_at columns at pick time (any session, manual or scheduled); a claim expires after 24h so a dead session cannot strand a ticket.",
};

const twelve = findings => findings.filter(f => f.check === "12");

// ---------------------------------------------------------------------------
// Check 12 -- a rule statement copied outside its canonical home
// ---------------------------------------------------------------------------
function aCopyOutsideTheHomeIsFound() {
  const copy = "**B40** -- claim a backlog ticket atomically via the claimed_by / claimed_at columns at pick time, in any session, manual or scheduled; the claim expires after 24h so a dead session cannot strand a ticket.\n";
  const findings = [];
  checkRuleTextOutsideHome(findings, [RULE], new Map([["docs/runbooks/runner-cycle.md", copy]]));
  assert.strictEqual(twelve(findings).length, 1, "a verbatim-enough restatement outside the home must be reported");
  assert.match(findings[0].detail, /docs\/runbooks\/runner-cycle\.md:1/);
  assert.strictEqual(findings[0].severity, "WARN",
    "WARN, not FLAG: the canonical text is intact and this is SES-201's migration backlog. " +
    "Promoting it changes what the v7.0.242 gate refuses -- do that deliberately, with the gating set.");
}

function aCITATIONisNotACopy() {
  // NEGATIVE CONTROL for the case above, and the one that matters most: this repo is full of
  // legitimate citations. If these gated, the check would emit ~113 findings and be turned off.
  const cite = "The claim is the coordination token across every session (register B40), so re-assert it before anything irreversible.\n";
  const findings = [];
  checkRuleTextOutsideHome(findings, [RULE], new Map([["docs/runbooks/runner-cycle.md", cite]]));
  assert.strictEqual(twelve(findings).length, 0, "naming a rule is not restating it");
}

function theCanonicalHomeIsNeverFlagged() {
  const copy = "**B40** -- claim a backlog ticket atomically via the claimed_by / claimed_at columns at pick time, in any session, manual or scheduled; the claim expires after 24h so a dead session cannot strand a ticket.\n";
  const findings = [];
  checkRuleTextOutsideHome(findings, [RULE], new Map([["docs/RUNNER-GOV-0820-REQUIREMENTS.md", copy]]));
  assert.strictEqual(twelve(findings).length, 0, "the rule's own home is where the statement belongs");
}

function aRENDEREDblockIsTheSanctionedRestatement() {
  // The marker is the whole point of SES-175: a marked block is regenerated from the registry row,
  // so it cannot drift. Flagging it would tell every cycle to undo the fix.
  const rendered = "<!-- {{rule:B40}} rendered from public.governance_rules -- do not hand-edit -->\n> **Rule B40** -- Claim a backlog ticket atomically via claimed_by/claimed_at columns at pick time (any session, manual or scheduled); a claim expires after 24h so a dead session cannot strand a ticket.\n";
  const findings = [];
  checkRuleTextOutsideHome(findings, [RULE], new Map([["docs/runbooks/runner-cycle.md", rendered]]));
  assert.strictEqual(twelve(findings).length, 0, "a rendered block is a render, not a copy");

  // NEGATIVE CONTROL: the identical text with the marker removed IS a copy -- which proves the
  // exemption above is the marker doing the work, not the text failing to match.
  const unmarked = rendered.replace(/<!--[\s\S]*?-->\n/, "");
  const control = [];
  checkRuleTextOutsideHome(control, [RULE], new Map([["docs/runbooks/runner-cycle.md", unmarked]]));
  assert.strictEqual(twelve(control).length, 1);
}

function aRetiredRuleIsCheck9sJobNotThisOne() {
  const copy = "**B40** -- claim a backlog ticket atomically via the claimed_by / claimed_at columns at pick time, in any session, manual or scheduled; the claim expires after 24h so a dead session cannot strand a ticket.\n";
  const findings = [];
  checkRuleTextOutsideHome(findings, [{ ...RULE, status: "retired" }], new Map([["docs/runbooks/runner-cycle.md", copy]]));
  assert.strictEqual(twelve(findings).length, 0,
    "a retired rule restated in live voice is check 9's finding; reporting it here too gives one fact two homes");
}

function sitesAreAggregatedPerRule() {
  // check 3c's convention: one line per rule, not one per occurrence, so a rule copied into four
  // docs cannot bury the actionable flags above it.
  const copy = "**B40** -- claim a backlog ticket atomically via the claimed_by / claimed_at columns at pick time, in any session, manual or scheduled; the claim expires after 24h so a dead session cannot strand a ticket.\n";
  const findings = [];
  checkRuleTextOutsideHome(findings, [RULE], new Map([
    ["docs/runbooks/runner-cycle.md", copy],
    ["docs/runbooks/session-setup.md", copy],
  ]));
  assert.strictEqual(twelve(findings).length, 1, "one finding per rule");
  assert.match(findings[0].detail, /runner-cycle\.md:1.*session-setup\.md:1/, "both sites named on it");
}

function theThresholdIsTheThingDoingTheWork() {
  const words = statementContentWords(RULE.statement);
  assert.ok(words.length >= 8, "the statement must yield enough distinctive words to measure against");
  assert.ok(!words.includes("never") && !words.includes("always") && !words.includes("should"),
    "common governance words separate nothing -- every rule paragraph contains them, so they must " +
    "not count toward the overlap or a citation scores like a copy");
  assert.ok(words.every(w => w.length >= 5), "short tokens are noise in the same way");
  assert.strictEqual(statementOverlap(RULE.statement, words), 1, "the statement overlaps itself completely");
  assert.ok(statementOverlap("register B40 applies here", words) < RULE_COPY_OVERLAP,
    "a bare citation must sit below the threshold");
  assert.ok(RULE_COPY_OVERLAP > 0.5 && RULE_COPY_OVERLAP <= 1,
    "a threshold at or below 0.5 means 'discusses the same subject', which is not a copy");
}

function paragraphWindowNotAFixedCharacterWindow() {
  // MEASURED at this ship: the +/-280-char enclosingBlock() window found 1 of 4 live copies,
  // because governance paragraphs run long. This asserts the window is the paragraph.
  const text = "intro para\n\n" + "x".repeat(600) + " B40 " + "y".repeat(600) + "\n\ntail para";
  const para = enclosingParagraph(text, text.indexOf("B40"));
  assert.ok(para.length > 1000, "the window must be the whole paragraph, not a fixed slice of it");
  assert.ok(!para.includes("intro para") && !para.includes("tail para"), "and must not run into its neighbours");
}

// ---------------------------------------------------------------------------
// Check 13 -- one procedure, two live homes
// ---------------------------------------------------------------------------
const SQL = "UPDATE public.backlog_items\n   SET claimed_by = 'x', claimed_at = now(), updated_at = now()\n WHERE backlog_id = 'Y' AND status <> 'done'\nRETURNING backlog_id;";
const fence = (body, note = "") => "```sql\n" + (note ? `-- ${note}\n` : "") + body + "\n```\n";

function theSameProcedureInTwoDocsIsFound() {
  const dupes = duplicateProcedureHomes(new Map([
    ["docs/GOVERNANCE-MODES.md", fence(SQL)],
    ["docs/runbooks/runner-cycle.md", fence(SQL)],
  ]));
  assert.strictEqual(dupes.length, 1);
  assert.deepStrictEqual(dupes[0].sites.map(s => s.rel).sort(), ["docs/GOVERNANCE-MODES.md", "docs/runbooks/runner-cycle.md"]);
}

function theSameProcedureTWICEinONEdocIsNotTwoHomes() {
  // NEGATIVE CONTROL on the thing being counted. A doc that shows a statement twice has one home;
  // counting occurrences instead of DOCS would report that as drift, which it is not.
  const dupes = duplicateProcedureHomes(new Map([["docs/runbooks/runner-cycle.md", fence(SQL) + "\ntext\n\n" + fence(SQL)]]));
  assert.strictEqual(dupes.length, 0);
}

function differentProceduresAreNotDuplicates() {
  const dupes = duplicateProcedureHomes(new Map([
    ["docs/a.md", fence(SQL)],
    ["docs/b.md", fence(SQL.replace("backlog_items", "runner_cycles"))],
  ]));
  assert.strictEqual(dupes.length, 0, "two different procedures are two procedures");
}

function commentHeadersDoNotHideADuplicate() {
  // The case worth catching: the same SQL under two different explanatory comments. If comments
  // were hashed, this would read as two distinct procedures and the check would find nothing.
  const dupes = duplicateProcedureHomes(new Map([
    ["docs/a.md", fence(SQL, "the claim, per the runbook")],
    ["docs/b.md", fence(SQL, "atomic claim -- see GOVERNANCE-MODES")],
  ]));
  assert.strictEqual(dupes.length, 1, "comment lines are stripped before hashing, so the bodies still match");
}

function aFragmentIsNotAProcedure() {
  const tiny = "```sql\nselect 1;\n```\n";
  assert.ok(normalizeProcedure("select 1;").length < PROCEDURE_MIN_CHARS);
  const dupes = duplicateProcedureHomes(new Map([["docs/a.md", tiny], ["docs/b.md", tiny]]));
  assert.strictEqual(dupes.length, 0, "a one-liner in two docs is a fragment, not a second home");

  // NEGATIVE CONTROL: the same two docs with a real procedure DO report, so the exemption above is
  // the length rule working rather than the check being inert.
  const real = duplicateProcedureHomes(new Map([["docs/a.md", fence(SQL)], ["docs/b.md", fence(SQL)]]));
  assert.strictEqual(real.length, 1);
}

function historyDocsAreExcludedByName() {
  // SESSIONS.md quotes procedures as a RECORD of what was done. Flagging it would tell a cycle to
  // delete its own history to satisfy a checker.
  assert.ok(PROCEDURE_HISTORY_DOCS.has("docs/SESSIONS.md"));
  assert.ok(PROCEDURE_HISTORY_DOCS.has("docs/FEATURES-ARCHIVE.md"));
}

function blocksAreLocatedByLine() {
  const blocks = collectProcedureBlocks(new Map([["docs/a.md", "one\ntwo\nthree\n\n" + fence(SQL)]]));
  const [sites] = [...blocks.values()];
  assert.strictEqual(sites[0].line, 5, "a finding must point at the line, not just the file");
}

function run() {
  aCopyOutsideTheHomeIsFound();
  aCITATIONisNotACopy();
  theCanonicalHomeIsNeverFlagged();
  aRENDEREDblockIsTheSanctionedRestatement();
  aRetiredRuleIsCheck9sJobNotThisOne();
  sitesAreAggregatedPerRule();
  theThresholdIsTheThingDoingTheWork();
  paragraphWindowNotAFixedCharacterWindow();
  theSameProcedureInTwoDocsIsFound();
  theSameProcedureTWICEinONEdocIsNotTwoHomes();
  differentProceduresAreNotDuplicates();
  commentHeadersDoNotHideADuplicate();
  aFragmentIsNotAProcedure();
  historyDocsAreExcludedByName();
  blocksAreLocatedByLine();
}

selfRun(import.meta.url, run);
export default run;
