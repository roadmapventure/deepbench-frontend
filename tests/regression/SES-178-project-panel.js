// DeepBench v7.0.284 | tests/regression/SES-178-project-panel.js | SES-181 (b) — two edits, both
// forced by §16 being APPENDED to the locked order, and both RETARGETING rather than relaxing:
// (1) appendedNeverRenumbered() asserted `max === 15`, which conflated the rule (§15 is appended
// and never renumbered) with an incidental fact (§15 was last); it now pins §14 and §15 in place
// and still fails on a real renumber. (2) extractContract()'s far bound was the NAMED heading
// "### §2b's data contract", so inserting §16's contract between the two made the slice swallow a
// second contract — and this file's own vacuity detector caught it, clause `epic-is-not-drain`
// passing after its control removed the word it checks. The bound is now the next `### ` heading.
// DeepBench v7.0.231 | tests/regression/SES-178-project-panel.js | SES-178
//
// Guards §15, the briefing's Project panel: the locked-order entry in briefing-page.md, the
// section and its row helper in briefing-template.html, and the three builder anchors that fill
// it. All three files must move together — a template section the builder cannot find publishes
// the SAMPLE rows (the exact SES-162 defect: John's §2b panel served hardcoded sample text for a
// day because this builder had no anchor for it), and a builder anchor with no section dies at
// exit 2.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL, plus a meta-assertion that a vacuous
// mutation fails its own control (the SES-158 failure). Rules are READ OUT OF the shipped files,
// never restated here.
//
// THE CLAUSE THIS FILE EXISTS FOR: §15 is APPENDED, never a renumber. John's placement call on
// gated card a8eaee1d, and the SES-132 / §2b precedent — renumbering silently invalidates every
// §-reference in briefing-page.md, runner-cycle.md and the spec. `appendedNeverRenumbered`
// asserts §14 still reads "Who used DeepBench" and that 15 is the highest number in the table,
// which is what makes it a real check rather than "the string 15 appears somewhere".

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PAGE = path.join(ROOT, "docs/runbooks/briefing-page.md");
const TPL = path.join(ROOT, "docs/runbooks/briefing-template.html");
const BUILDER = path.join(ROOT, "scripts/build-briefing.mjs");

// Markdown is hard-wrapped, so a load-bearing phrase can straddle a line break; normalising runs
// of whitespace makes every clause reflow-proof rather than hostage to the wrap column.
export const norm = s => s.replace(/\s+/g, " ");

// The end bound is THE NEXT `### ` HEADING, not a named one (SES-181 (b), v7.0.284). It used to
// name "### §2b's data contract" — correct while §15's contract was immediately above it, and
// silently wrong the moment §16's contract was inserted between the two: the slice then swallowed
// a second contract, and this file's own vacuity detector caught it — clause `epic-is-not-drain`
// began passing after its control removed §15's "mandatory", because §16's prose supplied the
// word. A named far bound is a dependency on document order that nothing declares.
export function extractContract(md) {
  const a = md.indexOf("### §15's data contract");
  if (a < 0) return "";
  const b = md.indexOf("\n### ", a + 1);
  return norm(b < 0 ? md.slice(a) : md.slice(a, b));
}

export function extractPanel(html) {
  const a = html.indexOf("// ===== §15 · PROJECT");
  if (a < 0) return "";
  const b = html.indexOf("document.getElementById('page').innerHTML", a);
  return norm(b < 0 ? html.slice(a) : html.slice(a, b));
}

// Pure: every load-bearing clause, as data, so a control can name exactly what it removed.
export const CLAUSES = [
  {
    id: "locked-order-row",
    where: "page",
    detail: "briefing-page.md's locked section order must carry a row 15 — that table is what a rebuild renders from",
    test: s => /\|\s*15\s*\|\s*\*\*Project — Selfbuild milestones\*\*\s*\|/.test(s),
    breaks: s => s.replace("| 15 | **Project — Selfbuild milestones**", "| 15 | (removed)"),
  },
  {
    id: "done-excludes-delivered",
    where: "contract",
    detail: "done is status='done' and NOT delivered — folding delivered in reports the project further along than John has agreed it is",
    test: s => /`delivered` is deliberately \*\*not\*\* counted/.test(s),
    breaks: s => s.replace("`delivered` is deliberately **not** counted", "`delivered` counts too"),
  },
  {
    id: "epic-is-not-drain",
    where: "contract",
    detail: "the epic-completion-is-not-drain-completion footnote is mandatory, or a reader infers retired = 100%",
    test: s => /AN EPIC'S COMPLETION IS NOT ITS DRAIN'S COMPLETION/.test(s) && /mandatory/.test(s),
    breaks: s => s.replace("the footnote saying so is mandatory", "the footnote saying so is optional"),
  },
  {
    id: "metrics-absent-not-zero",
    where: "contract",
    detail: "the keystone metrics must be named absent rather than rendered as zero — a zero is a claim about performance where the truth is absence",
    test: s => /NAMED ABSENT, never rendered as zero/.test(s),
    breaks: s => s.replace("NAMED ABSENT, never rendered as zero", "rendered as zero until they exist"),
  },
  {
    id: "no-new-css",
    where: "contract",
    detail: "no new CSS: every rule added to #s sits above briefing-state in the served document and pushes it further out of a size-bounded read (the live SES-188 defect)",
    test: s => /No new CSS/.test(s) && /SES-188/.test(s),
    breaks: s => s.replace("**No new CSS.**", "**Style it however.**"),
  },
  {
    id: "debt-disclosed",
    where: "contract",
    detail: "the second-expression debt must be named with its end state, or it becomes an undocumented second source of truth",
    test: s => /second expression/i.test(s) && /selfbuild_progress\(\)/.test(s),
    breaks: s => s.replace(/second expression/gi, "the source of truth"),
  },
  {
    id: "panel-section",
    where: "panel",
    detail: "the template must render the §15 heading — without it the builder's anchors have nothing to fill",
    test: s => /<span class="secnum">15<\/span>Project — Selfbuild milestones/.test(s),
    breaks: s => s.replace('<span class="secnum">15</span>', '<span class="secnum">99</span>'),
  },
  {
    id: "panel-footnote",
    where: "panel",
    detail: "the rendered footnote must carry BOTH honesty clauses — the drain caveat and the not-yet-online metrics",
    test: s => /never join it/.test(s) && /SES-181/.test(s),
    breaks: s => s.replace(/SES-181/g, "a later ticket"),
  },
  {
    id: "builder-rows-anchor",
    where: "builder",
    detail: "the builder must splice real milestone rows over the template's sample rows — the SES-162 defect was exactly a section with no anchor publishing sample text",
    test: s => /splice\("\+msRow\('Selfbuild M0/.test(s),
    breaks: s => s.replace(`splice("+msRow('Selfbuild M0`, `noSplice("+msRow('Selfbuild M0`),
  },
  {
    id: "builder-overall-anchor",
    where: "builder",
    detail: "the builder must replace the overall bar AND the overall count — a real table under a sample total is worse than all-sample, because it looks derived",
    test: s => /'§15 bar'/.test(s) && /'§15 overall'/.test(s),
    breaks: s => s.replace("'§15 overall'", "'§15 unused'"),
  },
  {
    id: "builder-fails-closed",
    where: "builder",
    detail: "zero Selfbuild epics must die() rather than publish an empty panel over the template's sample rows",
    test: s => /if \(!spRows\.length\) die\(/.test(s),
    breaks: s => s.replace("if (!spRows.length) die(", "if (false) die("),
  },
  {
    id: "builder-done-predicate",
    where: "builder",
    detail: "the builder's done predicate must be status === 'done' exactly, matching the charter's query",
    test: s => /if \(it\.status === 'done'\) row\.done\+\+;/.test(s),
    breaks: s => s.replace("it.status === 'done'", "it.status !== 'open'"),
  },
];

function sources() {
  const page = fs.readFileSync(PAGE, "utf8");
  return {
    page: norm(page),
    contract: extractContract(page),
    panel: extractPanel(fs.readFileSync(TPL, "utf8")),
    builder: fs.readFileSync(BUILDER, "utf8"),
  };
}

function theShippedFilesAreClean() {
  const s = sources();
  assert.ok(s.contract.length > 0, "§15's data contract is missing from briefing-page.md");
  assert.ok(s.panel.length > 0, "the §15 panel is missing from briefing-template.html");
  for (const c of CLAUSES) {
    assert.ok(c.test(s[c.where]), `lost clause "${c.id}": ${c.detail}`);
  }
}

// THE CLAUSE THIS FILE EXISTS FOR — appended, never renumbered.
//
// RETARGETED, NOT DELETED (SES-181 (b), v7.0.284). This clause used to assert `max === 15`, and
// that form conflated two different things: the rule (§15 is APPENDED and nothing renumbers it)
// and an incidental fact (§15 happened to be last). John's directive 58db64ae item (2) appended
// §16 — "locked section extended, never renumbered" — which is the rule being FOLLOWED, and the
// old form failed on it. Deleting the clause when its subject moves loses the reason with it
// (the SES-197 precedent), so what it asserts now is the rule itself: §14 unmoved, §15 unmoved,
// and §15 still ABOVE whatever was appended after it. A renumber of §15 — the failure this file
// exists to catch — still fails here; a legitimate append no longer does.
function appendedNeverRenumbered() {
  const s = sources();
  assert.ok(/\|\s*14\s*\|\s*Who used DeepBench\s*\|/.test(s.page),
    "§14 must still be 'Who used DeepBench' — §15 is APPENDED, and a renumber silently invalidates every §-reference in this file, runner-cycle.md and the spec");
  assert.ok(/\|\s*15\s*\|\s*\*\*Project — Selfbuild milestones\*\*/.test(s.page),
    "§15 must still be row 15 and still be the Project panel — that is the renumber this clause exists to catch, per John's placement call on card a8eaee1d");
  const nums = [...s.page.matchAll(/\|\s*(\d+)\s*\|\s*(?:\*\*)?[A-Z]/g)].map(m => Number(m[1]));
  assert.ok(nums.length > 0, "the locked-order table was not parseable");
  assert.ok(Math.max(...nums) >= 15,
    "no section above §15 may be REMOVED to make room — the order is extended at the end, never rewritten");
}

// The panel must add no new CSS rule to the head. Asserted structurally, not by eye: the §15 block
// may not contain a `<style` fragment or a class this repo does not already ship.
function panelAddsNoNewCss() {
  const s = sources();
  assert.ok(!/<style/.test(s.panel), "the §15 panel must not open a <style> block — head CSS pushes briefing-state out of read range (SES-188)");
  const used = [...s.panel.matchAll(/class="([a-z0-9 -]+)"/g)].flatMap(m => m[1].split(/\s+/)).filter(Boolean);
  const shipped = fs.readFileSync(TPL, "utf8").slice(0, fs.readFileSync(TPL, "utf8").indexOf("</style>"));
  for (const cls of new Set(used)) {
    assert.ok(shipped.includes("." + cls) || shipped.includes(cls + "{"),
      `§15 uses class "${cls}", which the shipped stylesheet does not define — the panel must reuse existing tokens, never add head CSS`);
  }
}

function aMissingBlockIsFlagged() {
  assert.strictEqual(extractContract("# no contract here"), "", "a missing contract must return '' so the caller reports it");
  assert.strictEqual(extractPanel("<html>no panel</html>"), "", "a missing panel must return '' so the caller reports it");
}

function everyClauseHasTeeth() {
  const s = sources();
  for (const c of CLAUSES) {
    const mutated = c.breaks(s[c.where]);
    assert.notStrictEqual(mutated, s[c.where],
      `control for "${c.id}" changed NOTHING — it cannot prove the clause has teeth (the SES-158 failure)`);
    assert.ok(!c.test(mutated), `clause "${c.id}" still passes after its own control removed what it checks — the check is vacuous`);
  }
}

function aVacuousMutationFailsItsOwnControl() {
  const s = sources();
  assert.throws(
    () => { assert.notStrictEqual(s.panel, s.panel, "control changed NOTHING"); },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

function run() {
  theShippedFilesAreClean();
  appendedNeverRenumbered();
  panelAddsNoNewCss();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();

  notRun(
    "§15 rendered against the live board",
    "asserting the published numbers needs SUPABASE_URL / SUPABASE_SERVICE_KEY and a full " +
    "build-briefing run; the offline assertions above cover the contract, the section and the " +
    "three builder anchors. Live evidence is on the ship card (builder run, 8 milestones, " +
    "14/68 done, sample rows proven replaced).",
  );
}

selfRun(import.meta.url, run);
export default run;
