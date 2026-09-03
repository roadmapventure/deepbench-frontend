// DeepBench v7.0.421 | tests/regression/m7-ledger-and-card-idiom.test.mjs | M7 review prerequisites
//
// FEATURE: close-out residue of SES-320 and SES-160 (no new ticket) -- the M7 milestone gate
// review's PM lens found two retirements with no ledger line (SES-154's Accept-writes-`done`
// clause, superseded by SES-320; step 4b's card-route sentence, superseded by SES-160) and an
// amendment the same precedent (entries 34-38) says also gets one (M5-01's pre-SES-321 wording).
// This guard pins the three new docs/SELFBUILD-RETIREMENT-LEDGER.md entries (40, 41, 42) and the
// runbook's remaining card-idiom sentence.
//
// DOC ONLY -- no live arm. Nothing here touches Supabase; both files are static repo docs.
//
// TWO GROUPS OF ASSERTIONS.
//   * LEDGER: entries 40/41/42 exist as `### 40.` / `### 41.` / `### 42.` headings and each names
//     the tickets the kickoff doc requires -- 40 names SES-154 and SES-320, 41 names B12 and
//     SES-160, 42 names M5-01 and SES-321. Headings are asserted append-only (40 < 41 < 42, none
//     renumbered) per this file's own "Ledger entries are append-only" design rule.
//   * RUNBOOK: the old invention-proposal card idiom `"no ticket yet -- your Accept files one"`
//     must never appear in LIVE VOICE again. It is not deleted (annotate, don't delete, is the
//     ledger's own design rule) -- it survives inside the `display_ref` bullet -- but it must now
//     be a HISTORICAL quote sitting beside retirement vocabulary ON THE SAME LINE, because tripwire
//     check 9 decides within the enclosing block/line rather than the whole file. The mutation
//     control simulates the regression this guard exists to catch: reinsert the bare phrase with no
//     annotation on its line (as if a later edit had copied the sentence out from under its
//     annotation) and the assertion must fail.
//
// DRY-RUN (STANDARDS.md Section 4), measured against the unchanged files before this session's
// edit: the three heading assertions FAIL (ledger ends at #39) and the card-idiom assertion FAILS
// (the phrase sat bare, with no retirement vocabulary on its line, at line ~3556).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LEDGER_REL = "docs/SELFBUILD-RETIREMENT-LEDGER.md";
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const CARD_IDIOM = "no ticket yet — your Accept files one";
// Words that must accompany the idiom on its OWN LINE for it to count as annotated rather than
// live voice. "RETIRED" alone is the load-bearing one; SES-160 is required too so a reader lands
// on the mechanism that replaced it, not just a bare "this is old" flag.
const RETIREMENT_MARKERS = ["RETIRED", "SES-160"];

// Ledger heading clauses: each is {id, heading, mustName}. `mustName` are substrings that must
// appear somewhere in that entry's own body (from its heading to the next `### ` heading or EOF).
export const LEDGER_ENTRIES = [
  { id: "entry-40-heading", heading: "### 40.", mustName: ["SES-154", "SES-320"] },
  { id: "entry-41-heading", heading: "### 41.", mustName: ["B12", "SES-160"] },
  { id: "entry-42-heading", heading: "### 42.", mustName: ["M5-01", "SES-321"] },
];

function sliceEntry(ledger, heading) {
  const start = ledger.indexOf(`\n${heading}`);
  assert.ok(start !== -1, `${LEDGER_REL} is missing the "${heading}" heading`);
  const next = ledger.indexOf("\n### ", start + 1);
  return next === -1 ? ledger.slice(start) : ledger.slice(start, next);
}

async function run() {
  const results = [];
  const ledger = read(LEDGER_REL);
  const runbook = read(RUNBOOK_REL);

  // --- Ledger: append-only order, never renumbered ---------------------------------------------
  const idx40 = ledger.indexOf("\n### 40.");
  const idx41 = ledger.indexOf("\n### 41.");
  const idx42 = ledger.indexOf("\n### 42.");
  assert.ok(idx40 !== -1 && idx41 !== -1 && idx42 !== -1,
    `${LEDGER_REL} must carry headings "### 40.", "### 41." and "### 42."`);
  assert.ok(idx40 < idx41 && idx41 < idx42,
    `${LEDGER_REL}: entries 40/41/42 must appear in ascending, append-only order`);
  results.push("ledger-entries-present-and-ordered");

  for (const e of LEDGER_ENTRIES) {
    const body = sliceEntry(ledger, e.heading);
    for (const name of e.mustName) {
      assert.ok(body.includes(name),
        `${LEDGER_REL}: entry "${e.heading}" must name \`${name}\``);
    }
    results.push(e.id);
  }

  // Entry 39 (the last entry from the prior ship) must be untouched -- append-only means the
  // existing chain is a KEEP, not a candidate for renumbering.
  assert.ok(ledger.includes("### 39. `apply_ladder_decision()`"),
    `${LEDGER_REL}: entry 39 must survive byte-identical as the append point for 40-42`);
  results.push("entry-39-unrenumbered");

  // --- Runbook: the card idiom is annotated, never live voice ------------------------------------
  const lines = runbook.split("\n");
  const idiomLines = lines.filter(l => l.includes(CARD_IDIOM));
  assert.ok(idiomLines.length > 0,
    `${RUNBOOK_REL}: the historical phrase "${CARD_IDIOM}" must survive (annotate, don't delete) -- found zero occurrences`);
  for (const line of idiomLines) {
    for (const marker of RETIREMENT_MARKERS) {
      assert.ok(line.includes(marker),
        `${RUNBOOK_REL}: a line carrying "${CARD_IDIOM}" is missing retirement marker "${marker}" ` +
        `on the SAME LINE (tripwire check 9 decides within the enclosing line) -- live-voice regression`);
    }
  }
  results.push("card-idiom-is-annotated-not-live-voice");

  // Second card-idiom site: step 6's filing-site list ("step 4b's invention card when John
  // accepts it") must also carry its own same-line annotation naming the real mechanism. Match
  // only the RULE-BODY sentence (the list item itself, "to every filing site"), never this file's
  // own version-stamp header, which quotes the phrase purely as commentary and carries no
  // "RETIRED WORDING" marker of its own.
  const filingListLines = lines.filter(l =>
    l.includes("step 4b's invention card when John") && l.includes("to every filing site"));
  assert.ok(filingListLines.length > 0,
    `${RUNBOOK_REL}: step 6's filing-site list sentence ("to every filing site in this runbook...") is missing`);
  for (const line of filingListLines) {
    assert.ok(/RETIRED WORDING/.test(line) && line.includes("file_invention_proposal"),
      `${RUNBOOK_REL}: the filing-site list's "step 4b's invention card when John accepts it" clause ` +
      `must be annotated on the same line naming file_invention_proposal() as the current mechanism`);
  }
  results.push("filing-site-list-is-annotated");

  // --- Mutation control: a bare reinsertion (annotation stripped, idiom intact) must FAIL --------
  // Simulates exactly the regression this guard exists to catch -- a later edit that copies the
  // historical sentence out from under its annotation and re-lands it in live voice.
  const bareLine = `- \`display_ref\` example: an invention proposal, "${CARD_IDIOM}".`;
  const mutated = idiomLines[0]
    ? runbook.replace(idiomLines[0], bareLine)
    : runbook + "\n" + bareLine;
  const mutatedLines = mutated.split("\n");
  const mutatedIdiomLines = mutatedLines.filter(l => l.includes(CARD_IDIOM));
  let controlCaughtIt = false;
  try {
    for (const line of mutatedIdiomLines) {
      for (const marker of RETIREMENT_MARKERS) {
        assert.ok(line.includes(marker), "control line has no marker");
      }
    }
  } catch {
    controlCaughtIt = true;
  }
  assert.ok(controlCaughtIt,
    "mutation control failed to prove anything: a bare re-insertion of the card idiom with no " +
    "annotation must fail the same-line-marker assertion, or the guard is vacuous");
  results.push("mutation-control-catches-bare-reinsertion");

  return results;
}

selfRun(import.meta.url, run);
export default run;
