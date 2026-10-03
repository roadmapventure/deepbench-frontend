// DeepBench v7.0.498 | tests/regression/ses-400-b35-citation.test.mjs | SES-400 -- the B35
// citation in docs/runbooks/runner-cycle.md carries its own retirement note.
//
// THE REGISTRY AND THE DOC MUST TELL ONE STORY (ARCHITECTURE §19v). `public.governance_rules`
// holds B35 as `superseded` by `M6-07`; the runbook still needs the citation, because step 3's
// budget ladder is only readable if you can see which register entry the month boundary came
// from. So the fix is a NOTE on the citation, never the citation's removal.
//
// WHAT WOULD PASS VACUOUSLY HERE, which is the whole reason this file exists rather than a second
// `--gate` invocation. check 9 (`checkRetiredRulesInLiveVoice`) is ID-ANCHORED: it fires on an
// occurrence of the rule id whose enclosing block carries no RETIREMENT_VOCAB word. DELETING the
// `B35` citation therefore also turns it green -- measured on this kickoff's clone, 0 findings at
// 380,886 bytes. A guard carrying arm (a) alone would grade the deletion and the fix identically
// and would not notice the day someone "simplified" the line by dropping the register pointer.
// Arm (c) is the discriminator: it runs (a) and (b) against an in-memory copy whose citation has
// been deleted, and requires (a) to STILL PASS while (b) FAILS. If (c)'s control ever goes green
// on both, the pair has stopped discriminating and this file is back to being decorative.
//
// THE REAL CHECK, NEVER A SECOND IMPLEMENTATION (STANDARDS §4). `checkRetiredRulesInLiveVoice`,
// `parseRulesSnapshot` and `RETIREMENT_VOCAB` are all imported from scripts/check-session-docs.js.
// In particular arm (b) does not hardcode the word "superseded": it asks the imported vocabulary,
// so a later edit to the note that swaps in "retired" stays green and a note that drops the
// vocabulary altogether goes red -- which is exactly the coupling check 9 itself has.
//
// IN MEMORY, NEVER ON DISK (SES-382): cycles run in parallel against one clone, so arm (c) mutates
// a string, never the committed runbook. Nothing here writes a file.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

import {
  parseRulesSnapshot,
  checkRetiredRulesInLiveVoice,
  RETIREMENT_VOCAB,
} from "../../scripts/check-session-docs.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";

const RULE_ID = "B35";

// tests/regression/ses-336-runbook-orchestration.test.mjs:87 pins the same number. Repeated here
// as a constant rather than imported because the two guards must be able to fail independently --
// a ceiling raised in one place should redden the other, not follow it.
const SIZE_CEILING_BYTES = 381_000;

// The citation's own line, identified by the one substring that is unique to it in the runbook.
// Located rather than indexed by 163: a line number is the most brittle possible handle on a
// 380 KB file, and an unrelated insert above it should not redden this guard. The uniqueness
// assertion is what keeps "located" from meaning "guessed".
const CITATION_ANCHOR = "**`America/Chicago`** month (";

// Arm (c)'s control: the same line with the register citation deleted -- the "fix" that silences
// check 9 by removing the information instead of dating it.
const CITATION_DELETED =
  "   **`America/Chicago`** month (the month boundary is John's clock, never UTC).";

function read(rel) {
  const p = path.join(ROOT, rel);
  assert.ok(fs.existsSync(p), `${rel} is missing`);
  return fs.readFileSync(p, "utf8");
}

// Locate the citation line in a runbook text. Returns { index, lineNo, line }.
function citationLine(text) {
  const lines = text.split("\n");
  const hits = [];
  lines.forEach((l, i) => { if (l.includes(CITATION_ANCHOR)) hits.push(i); });
  assert.equal(hits.length, 1,
    `expected exactly one line in ${RUNBOOK_REL} carrying ${JSON.stringify(CITATION_ANCHOR)}, ` +
    `found ${hits.length} at line(s) ${hits.map(i => i + 1).join(", ")}. This guard's handle on ` +
    `the citation is that substring's uniqueness.`);
  return { index: hits[0], lineNo: hits[0] + 1, line: lines[hits[0]] };
}

// ---- arm (a), as a function so arm (c) can run the SAME code against the mutated copy ----------
// Zero check-9 findings naming B35 in the runbook. The docCache is one entry on purpose: the claim
// under test is about this doc, and a wider cache would let another file's finding decide it.
function bareCitationFindings(runbookText, rules) {
  const findings = [];
  checkRetiredRulesInLiveVoice(findings, rules, new Map([[RUNBOOK_REL, runbookText]]));
  return findings.filter(f =>
    f.check === "9" &&
    new RegExp(`\\b${RULE_ID}\\b`).test(f.detail) &&
    f.detail.includes(RUNBOOK_REL));
}

// ---- arm (b), likewise reusable -----------------------------------------------------------------
// All three on the citation's OWN line: the subject, the rule id, and a retirement word drawn from
// the imported vocabulary. Returns the three verdicts so a failure says which part is missing.
function citationCarriesNote(line) {
  const lower = line.toLowerCase();
  return {
    subject: line.includes("America/Chicago"),
    cites: new RegExp(`\\b${RULE_ID}\\b`).test(line),
    retirementWord: RETIREMENT_VOCAB.find(v => lower.includes(v)) || null,
  };
}

export default async function run() {
  const runbook = read(RUNBOOK_REL);
  const rules = parseRulesSnapshot(read(SNAPSHOT_REL));

  // Guard against a vacuous (a): check 9 only looks at rules whose status is not `live`. If B35
  // were absent from the snapshot, or live in it, the loop would never reach this doc and (a)
  // would pass for a reason that has nothing to do with the note.
  assert.ok(rules.length > 0, `${SNAPSHOT_REL} parsed to zero rule rows`);
  const b35 = rules.find(r => r.id === RULE_ID);
  assert.ok(b35, `${SNAPSHOT_REL} carries no ${RULE_ID} row -- check 9 would skip this doc entirely`);
  assert.notEqual(b35.status, "live",
    `${RULE_ID} is \`${b35.status}\` in the registry; this guard is about a WITHDRAWN rule still ` +
    `cited in the runbook. If the row was deliberately flipped back to live, retire this test.`);

  // ---- (a) the real runbook against the real snapshot: no bare citation ------------------------
  const live = bareCitationFindings(runbook, rules);
  assert.deepEqual(live.map(f => f.detail), [],
    `check 9 still reports ${RULE_ID} in live voice in ${RUNBOOK_REL}`);

  // ---- (b) the citation's own line carries subject, id and a retirement word -------------------
  const { lineNo, line } = citationLine(runbook);
  const note = citationCarriesNote(line);
  assert.ok(note.subject, `line ${lineNo} no longer names America/Chicago:\n    ${line}`);
  assert.ok(note.cites,
    `line ${lineNo} no longer cites \`${RULE_ID}\`. The register pointer is the reason the line ` +
    `is readable at all -- silencing check 9 by deleting it is the failure arm (c) controls ` +
    `for:\n    ${line}`);
  assert.ok(note.retirementWord,
    `line ${lineNo} cites \`${RULE_ID}\` with no word from check 9's RETIREMENT_VOCAB, so a ` +
    `session reading it would treat a superseded rule as current:\n    ${line}`);

  // ---- (c) negative control: the deletion must NOT satisfy this guard --------------------------
  const lines = runbook.split("\n");
  const cut = citationLine(runbook).index;
  lines[cut] = CITATION_DELETED;
  const deleted = lines.join("\n");
  assert.ok(!new RegExp(`\\b${RULE_ID}\\b`).test(deleted.split("\n")[cut]),
    "control setup failed: the mutated line still cites the rule");

  const controlFindings = bareCitationFindings(deleted, rules);
  assert.deepEqual(controlFindings.map(f => f.detail), [],
    `arm (c) has stopped discriminating: check 9 now FAILS on the citation-deleted copy, so (a) ` +
    `alone would have caught the deletion and this control no longer proves anything. Re-derive ` +
    `the control before touching anything else.`);

  const controlNote = citationCarriesNote(deleted.split("\n")[cut]);
  assert.equal(controlNote.cites, false,
    `arm (c) has stopped discriminating: (b) passes on the citation-deleted copy.`);

  // ---- (d) the byte ceiling ---------------------------------------------------------------------
  const bytes = Buffer.byteLength(runbook, "utf8");
  assert.ok(bytes <= SIZE_CEILING_BYTES,
    `${RUNBOOK_REL} is ${bytes} bytes, over the ${SIZE_CEILING_BYTES} ceiling. The ceiling is a ` +
    `tripwire, not a target: remove bytes, never raise it.`);

  console.log(
    `  (a) 0 bare \`${RULE_ID}\` findings from the real check 9; ` +
    `(b) line ${lineNo} carries America/Chicago + \`${RULE_ID}\` + "${note.retirementWord}"; ` +
    `(c) control tripped -- check 9 green on the deletion too (0 findings), (b) red; ` +
    `(d) ${bytes}/${SIZE_CEILING_BYTES} bytes.`);
}

selfRun(import.meta.url, run);
