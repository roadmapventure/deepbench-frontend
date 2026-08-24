// DeepBench v7.0.235 | tests/regression/SES-136-rebuild-contract-pointer.js | SES-136
//
// Guards regeneration step 4 of docs/runbooks/briefing-page.md: the step whose job is to forbid
// shell-processing the fetched page out of ~/.claude/ must, in the same breath, hand the cycle the
// thing it SHOULD do -- run scripts/build-briefing.mjs (step 1a). Until this ship it offered
// "rebuild structurally from the template + the runner_ tables" instead, a sentence with no
// executable in it, and cycle f0acf9ab self-filed SES-136 after taking the other branch and
// reading the published page with Bash -- which that same step forbids.
//
// THE RULE IS READ OUT OF THE DOC, never restated here (John's rule 2026-08-23, "you should never
// be throwing away tests"; the SES-176 / SES-158 / SES-194 / SES-150 precedent). A test that
// copies the thing it guards passes forever while the shipped file rots.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that
// should matter removed -- plus the meta-assertion SES-158 paid for, because that ticket shipped a
// control that changed nothing and only a checked control caught it.
//
// THE CLAUSE THIS FILE EXISTS FOR: `points-at-the-builder`. An editor tidying step 4 back to the
// short "rebuild structurally from the template" form re-arms the exact trap -- the template
// carries sample rows (measured at this ship: item-ses78a, v7.0.94, "Aug 19, 2026" are all in
// briefing-template.html and none of the three survives into a built page), so a hand rebuild
// publishes John's board as samples. `theProhibitionSurvives` is its twin and is equally
// load-bearing in the other direction: the fix must not weaken the ~/.claude/ rule it sits inside.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied (SES-180 (b)): that a BUILT page is
// actually sample-free. That needs SUPABASE_URL / SUPABASE_SERVICE_KEY and a full builder run
// against live Supabase, so it is declared not-run and its evidence is the measurement on the ship
// card. What IS asserted offline is the half that can rot silently: that the template still
// contains the sample markers, so the trap this pointer defuses is a real one and not a story.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOC = path.join(ROOT, "docs/runbooks/briefing-page.md");
const TPL = path.join(ROOT, "docs/runbooks/briefing-template.html");

const STEP4_START = "4. **Never shell-process the fetched page's saved file";
const STEP4_END = "5. **AFTER the republish returns";

// Pure: slice the bounded step out of the doc. Returns "" when absent -- itself a finding rather
// than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export const extractStep4 = md => extractBlock(md, STEP4_START, STEP4_END);

// Pure: the load-bearing clauses, kept as data so a negative control can name exactly which one it
// removed. A clause earns its place only if REMOVING it would change what a cycle does.
export const CLAUSES = [
  {
    id: "points-at-the-builder",
    detail: "THE CLAUSE THIS FILE EXISTS FOR: step 4 must name scripts/build-briefing.mjs as the safe procedure. Without it the step forbids the shortcut and offers a hand rebuild of a sample-carrying template in its place, which is the trap SES-136 was self-filed from",
    test: s => /scripts\/build-briefing\.mjs/.test(s),
    breaks: s => s.replace(/scripts\/build-briefing\.mjs/g, "the template"),
  },
  {
    id: "points-at-step-1a",
    detail: "the pointer must name step 1a, not just the script -- a cycle that has to go find the invocation is a cycle that improvises it",
    test: s => /step 1a/.test(s),
    breaks: s => s.replace(/step 1a/g, "the contract"),
  },
  {
    id: "the-prohibition-survives",
    detail: "the ~/.claude/ prohibition is what step 4 IS (SES-96), and a fix that pointed at the builder while loosening it would trade one defect for a worse one",
    test: s => /no Bash\s+command against any `~\/\.claude\/` path/.test(s.replace(/\s+/g, " ").replace(/ /g, " ")) || /no Bash[\s\S]{0,20}command against any `~\/\.claude\/` path/.test(s),
    breaks: s => s.replace(/~\/\.claude\//g, "some"),
  },
  {
    id: "the-decision-is-recorded-as-overtaken",
    detail: "step 4 must say (a) already shipped under SES-149/SES-163 -- otherwise a later cycle reads SES-136's open question as still open and puts a decision to John that shipped work already answered",
    test: s => /SES-149/.test(s) && /SES-163/.test(s),
    breaks: s => s.replace(/SES-149/g, "another ticket"),
  },
];

function step4() {
  const md = fs.readFileSync(DOC, "utf8");
  const block = extractStep4(md);
  assert.ok(block, `briefing-page.md no longer carries regeneration step 4 (looked for "${STEP4_START}")`);
  return block;
}

function theShippedContractIsClean() {
  const b = step4();
  for (const c of CLAUSES) {
    assert.ok(c.test(b), `briefing-page.md regeneration step 4 fails clause "${c.id}": ${c.detail}`);
  }
}

function everyClauseHasTeeth() {
  const b = step4();
  for (const c of CLAUSES) {
    const mutated = c.breaks(b);
    assert.notStrictEqual(mutated, b,
      `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`);
    assert.ok(!c.test(mutated),
      `clause "${c.id}" still passes after its own control removed the thing it checks -- the check is vacuous`);
  }
}

// META-ASSERTION: prove the control-checking above can actually fail. Without this, a future clause
// whose `breaks` is a no-op would sail through everyClauseHasTeeth's first assert only because
// nobody ever exercised the failure path.
function aVacuousMutationFailsItsOwnControl() {
  const b = step4();
  assert.throws(
    () => {
      const mutated = b;
      assert.notStrictEqual(mutated, b, "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// Step 1a is the target of the pointer. A pointer at a section that has been "tidied away" is
// SES-176's own dangling-pointer class, and it would leave step 4 naming a procedure that is gone.
function stepOneAStillExistsAndStillSaysUseIt() {
  const md = fs.readFileSync(DOC, "utf8");
  const i = md.indexOf("1a. **THE REBUILD HAS A BUILDER NOW");
  assert.ok(i >= 0,
    "briefing-page.md no longer carries step 1a -- step 4 now points at a section that does not exist. Do not delete 1a as redundant: the pointer is one-way on purpose.");
  const block = md.slice(i, i + 400);
  assert.ok(/scripts\/build-briefing\.mjs/.test(block),
    "step 1a no longer names scripts/build-briefing.mjs, so step 4's pointer resolves to a section that no longer carries the invocation");
}

// THE TRAP MUST STILL BE REAL. If the template ever stops carrying sample rows, this pointer is
// still correct but its stated justification would be a story rather than a measurement -- and this
// assertion is what would tell a later reader that, rather than letting the prose drift into myth.
function theTemplateStillCarriesTheSampleRows() {
  const tpl = fs.readFileSync(TPL, "utf8");
  const markers = ["item-ses78a", "v7.0.94", "Aug 19, 2026"];
  const missing = markers.filter(m => !tpl.includes(m));
  assert.strictEqual(missing.length, 0,
    `briefing-template.html no longer carries the sample marker(s) ${missing.join(", ")}. `
    + `That may be an improvement, but step 4's justification cites these three as measured evidence `
    + `that a hand rebuild publishes samples -- re-measure and update the prose rather than leaving a `
    + `claim the file no longer supports.`);
}

function run() {
  theShippedContractIsClean();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  stepOneAStillExistsAndStillSaysUseIt();
  theTemplateStillCarriesTheSampleRows();

  notRun(
    "a BUILT page proven sample-free end to end",
    "that needs SUPABASE_URL / SUPABASE_SERVICE_KEY and a full scripts/build-briefing.mjs run "
    + "against live Supabase, which a regression run should not do. Evidence is the measurement on "
    + "the ship card: the template carries item-ses78a / v7.0.94 / \"Aug 19, 2026\" and the page "
    + "built and published at v7.0.234 carried zero of the three.",
  );
}

selfRun(import.meta.url, run);
export default run;
