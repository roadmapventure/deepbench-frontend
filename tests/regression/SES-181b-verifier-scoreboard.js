// DeepBench v7.0.284 | tests/regression/SES-181b-verifier-scoreboard.js | SES-181 (b)
//
// Guards §16, the briefing's reviewer-lane scoreboard: the locked-order row and data contract in
// briefing-page.md, the section and its row helper in briefing-template.html, and the four builder
// anchors that fill it. All three files must move together — a template section the builder cannot
// find publishes the SAMPLE numbers (the SES-162 defect, which served John hardcoded sample text
// for a day), and a builder anchor with no section dies at exit 2.
//
// THIS FILE ASSERTS BOTH HALVES, AND NEITHER IS SUFFICIENT ALONE. §15's footnote told John all
// three keystone metrics "do not exist yet … all three wait on the verifier lane (SES-181), which
// is still open". Adding §16 while leaving that sentence puts a rendered catch rate and a written
// denial that any catch rate exists on the same page. So:
//   - the PRESENCE half asserts §16 exists with its honesty clauses, and
//   - the ABSENCE half asserts §15 no longer claims the catch rate is absent.
// An absence-only test passes vacuously if the string was never there; a presence-only test lets
// the contradiction ship. Both, or the guard is theatre.
//
// THE CLAIM THIS PANEL MUST NEVER MAKE, and the clause this file exists for: the charter's keystone
// bar ("over a rolling 30 deliveries the verifier's catch rate >= John's Rework+Reverse rate") is
// NOT asserted by the panel, because the two rates count different populations and a `block` is a
// mechanical gate failing rather than a defect John would have reworked. `barIsNotAsserted` is the
// clause that fails if a later edit turns the panel into a scoreboard that declares a winner.
//
// Rules are READ OUT OF the shipped files, never restated here, and every clause carries a
// negative control that names exactly what it removed.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PAGE = path.join(ROOT, "docs/runbooks/briefing-page.md");
const TPL = path.join(ROOT, "docs/runbooks/briefing-template.html");
const BUILDER = path.join(ROOT, "scripts/build-briefing.mjs");

// Markdown is hard-wrapped, so a load-bearing phrase can straddle a line break; normalising runs of
// whitespace makes every clause reflow-proof rather than hostage to the wrap column.
export const norm = s => s.replace(/\s+/g, " ");

// BOTH FAR BOUNDS ARE "THE NEXT SECTION", NEVER A NAMED ONE, and that is this ship's own lesson
// rather than caution: SES-178's extractContract named "### §2b's data contract" as its end, which
// was correct until §16's contract was inserted between the two — the slice then swallowed a second
// contract and one of its clauses went vacuous (its control removed §15's word "mandatory" and
// §16's prose supplied it). A named far bound is a dependency on document order that nothing
// declares. §17 will be appended one day; these extractors survive it.
function extractContract(md) {
  const a = md.indexOf("### §16's data contract");
  if (a < 0) return "";
  const b = md.indexOf("\n### ", a + 1);
  return norm(b < 0 ? md.slice(a) : md.slice(a, b));
}

function extractPanel(html) {
  const a = html.indexOf("// ===== §16 · REVIEWER LANE");
  if (a < 0) return "";
  const next = html.indexOf("// ===== §", a + 1);
  const end = html.indexOf("document.getElementById('page').innerHTML", a);
  const b = next >= 0 && (end < 0 || next < end) ? next : end;
  return norm(b < 0 ? html.slice(a) : html.slice(a, b));
}

// §15's footnote, which this ship had to correct. Bounded by §15's own section marker so a clause
// about §15 can never accidentally read §16's prose two hundred lines below.
function extract15Footnote(html) {
  const a = html.indexOf("// ===== §15 · PROJECT");
  if (a < 0) return "";
  const b = html.indexOf("// ===== §16 · REVIEWER LANE", a);
  return norm(b < 0 ? html.slice(a) : html.slice(a, b));
}

// Every class §16 uses. The panel must add no CSS, so each of these has to already be defined in
// the template's own stylesheet (#s) — asserted below rather than trusted.
const PANEL_CLASSES = ["num", "dim", "bar", "dev", "barlbl", "tnote", "secnum"];

export const CLAUSES = [
  {
    id: "locked-order-row-16",
    where: "page",
    detail: "briefing-page.md's locked section order must carry a row 16 — that table is what a rebuild renders from",
    test: s => /\|\s*16\s*\|\s*\*\*Reviewer lane — verifier scoreboard\*\*\s*\|/.test(s),
    breaks: s => s.replace("| 16 | **Reviewer lane — verifier scoreboard**", "| 16 | (removed)"),
  },
  {
    id: "appended-never-renumbered",
    where: "page",
    detail: "§16 is APPENDED — §15 still reads Project — Selfbuild milestones, and no row above 16 exists",
    test: s => /\|\s*15\s*\|\s*\*\*Project — Selfbuild milestones\*\*/.test(s)
      && !/\|\s*1[7-9]\s*\|/.test(s),
    breaks: s => s.replace("| 15 | **Project — Selfbuild milestones**", "| 16 | **Project — Selfbuild milestones**"),
  },
  {
    id: "bar-is-not-asserted",
    where: "contract",
    detail: "the charter's keystone bar is NOT asserted by the panel, and both reasons are mandatory sentences",
    test: s => /BAR IS NOT ASSERTED/.test(s)
      && /different populations/.test(s)
      && /mechanical gate failing/.test(s)
      && /\*\*necessary\*\* for the charter's bar and never \*\*sufficient\*\*/.test(s),
    breaks: s => s.replace("THE CHARTER'S BAR IS NOT ASSERTED, AND THE PANEL SAYS SO.",
      "THE PANEL REPORTS WHETHER THE BAR IS MET."),
  },
  {
    id: "depth-sentence-conditional",
    where: "contract",
    detail: "'N deliveries is not a rolling thirty' expires at 30, so the sentence is conditional, not interpolated",
    test: s => /depth sentence is CONDITIONAL/.test(s) && /becomes a false statement/.test(s),
    breaks: s => s.replace("The depth sentence is CONDITIONAL, not interpolated.",
      "The depth sentence is interpolated like every other figure."),
  },
  {
    id: "anchors-are-must-not-splice",
    where: "contract",
    detail: "§16 reuses §15's closing shape, so splice()'s bare indexOf would find §15 first and eat the Project panel",
    test: s => /`must\(\)` not `splice\(\)`/.test(s) && /finds \*\*§15's\*\* occurrence first/.test(s),
    breaks: s => s.replace("`must()` not `splice()` for every anchor.", "Anchors may be `splice()`."),
  },
  {
    id: "john-rate-counts-ship-cards-only",
    where: "contract",
    detail: "gated_before_build Accepts are excluded from John's rate — an Accept there is permission to build, not a verdict on work (B34)",
    test: s => /`gated_before_build` cards are \*\*excluded\*\*/.test(s) && /register B34/.test(s),
    breaks: s => s.replace("`gated_before_build` cards are **excluded**", "`gated_before_build` cards are included"),
  },
  {
    id: "section-16-rendered",
    where: "panel",
    detail: "the template must render the §16 heading — the section number John reads it by",
    test: s => /<span class="secnum">16<\/span>Reviewer lane/.test(s),
    breaks: s => s.replace('<span class="secnum">16</span>Reviewer lane', '<span class="secnum">16</span>Something else'),
  },
  {
    id: "panel-honesty-clauses",
    where: "panel",
    detail: "the three honesty sentences are in the rendered tnote, not only in the contract doc John never reads",
    // Each phrase is matched IN ITS RENDERED FORM (inside the tnote's markup), never as bare
    // prose: the panel's comment quotes all three while explaining why they are mandatory, so a
    // loose match would be satisfied by the comment alone and would pass on a panel that renders
    // none of them — the exact way a guard becomes theatre.
    test: s => /<b>not yet assertable<\/b>, and this panel does not claim/.test(s)
      && /And a block is a mechanical gate failing \(build, regression, /.test(s)
      && /A block still does not stop a /.test(s),
    // Targets the RENDERED markup, not the first prose match: the panel's own comment quotes the
    // phrase while explaining the rule, and a bare string replace would break the comment and
    // leave the tnote — a control that changed something and tested nothing.
    breaks: s => s.replace("<b>not yet assertable</b>", "<b>met</b>"),
  },
  {
    id: "panel-adds-no-new-css",
    where: "panel",
    detail: "§16 opens no <style> block — every rule it needs is already in #s",
    // The presence half is what stops this passing VACUOUSLY: on a file with no §16 at all the
    // slice is empty, an empty string contains no <style>, and "adds no new CSS" would report
    // green about a panel that does not exist. Measured — it was the one clause of fifteen that
    // passed against origin/dev's pre-change files until this half was added.
    test: s => /\+'<table><tr><th>Signal<\/th>/.test(s) && !/<style/.test(s),
    breaks: s => s.replace("+'<table>", "+'<style>.sv{color:red}</style><table>"),
  },
  {
    id: "fifteen-no-longer-denies-the-catch-rate",
    where: "footnote15",
    detail: "THE ABSENCE HALF — §15 must no longer tell John the catch rate does not exist, now that §16 renders it",
    // Both the rendered footnote AND §15's own comment above it are in this slice on purpose:
    // the comment said "None is online: the verifier lane is SES-181, still open", which is the
    // same denial one level down, and it is the sentence the next editor reads first.
    test: s => !/verifier catch rate vs your Rework rate/.test(s)
      && !/all three wait/.test(s)
      && !/None is online/.test(s),
    breaks: s => s.replace("Verifier catch rate has moved to &sect;16 below",
      "Not shown: verifier catch rate vs your Rework rate, and all three wait on the lane"),
  },
  {
    id: "fifteen-still-names-the-two-that-are-absent",
    where: "footnote15",
    detail: "THE PRESENCE HALF — an absence assertion alone passes vacuously; §15 must still name the two metrics that really are missing",
    // Matched in the RENDERED footnote (the "zero:" lead-in is the tnote's own wording), not as
    // bare prose — §15's comment above lists the same three metric names while explaining the
    // rule, so a loose match would pass on a footnote that named none of them.
    test: s => /zero: John-minutes\/week/.test(s) && /and drift findings\/week\./.test(s)
      && /do not exist yet rather than because they are zero/.test(s),
    breaks: s => s.replace("zero: John-minutes/week", "zero: nothing at all"),
  },
  {
    id: "builder-has-all-four-anchors",
    where: "builder",
    detail: "rows, bar, barlbl and tnote are each an anchored must() — a template edit under the builder must be exit 2, never a published sample",
    test: s => ["'§16 rows'", "'§16 bar'", "'§16 barlbl'", "'§16 tnote'"].every(a => s.includes(a))
      && (s.match(/must\(`\+svRow|must\(`\+'<div class="bar"><div class="dev" style="width:30\.0%|must\(`\+'<p class="barlbl">Verifier|must\(`the lane started/g) || []).length === 4,
    breaks: s => s.replace("'§16 tnote'", "'§16 tnote (disabled)'"),
  },
  {
    id: "builder-window-is-deliveries-not-days",
    where: "builder",
    detail: "the window is 30 verdicts and 30 ship cards — a time window would move the rate on days when nothing shipped",
    test: s => /const SV_WINDOW = 30;/.test(s)
      && /runner_verdicts\?select=[^']*order=created_at\.desc/.test(s)
      && !/runner_verdicts\?select=[^']*created_at=gte/.test(s),
    breaks: s => s.replace("const SV_WINDOW = 30;", "const SV_WINDOW = 7;")
      .replace("runner_verdicts?select=verdict", "runner_verdicts?select=created_at=gte.x&verdict"),
  },
  {
    id: "builder-reads-ship-cards-for-johns-rate",
    where: "builder",
    detail: "John's rate is read from ship cards only (kind=eq.ship), so a gated Accept can never enter the keystone metric",
    test: s => /runner_items\?select=[^']*kind=eq\.ship/.test(s),
    breaks: s => s.replace("kind=eq.ship&", ""),
  },
  {
    id: "builder-refuses-an-empty-lane",
    where: "builder",
    detail: "an empty runner_verdicts must refuse the publish, not render 0% over the template's samples",
    test: s => /if \(!svVerdicts\.length\) die\('§16/.test(s),
    breaks: s => s.replace("if (!svVerdicts.length) die('§16", "if (false) die('§16"),
  },
];

function sources() {
  const page = fs.readFileSync(PAGE, "utf8");
  const tpl = fs.readFileSync(TPL, "utf8");
  const builder = fs.readFileSync(BUILDER, "utf8");
  return {
    page: norm(page),
    contract: extractContract(page),
    panel: extractPanel(tpl),
    footnote15: extract15Footnote(tpl),
    builder,
    rawTpl: tpl,
  };
}

function theShippedFilesAreClean() {
  const s = sources();
  assert.ok(s.contract, "§16's data contract is missing from briefing-page.md");
  assert.ok(s.panel, "§16's panel block is missing from briefing-template.html");
  assert.ok(s.footnote15, "§15's block is missing from briefing-template.html");
  for (const c of CLAUSES) {
    assert.ok(c.test(s[c.where]), `${c.id}: ${c.detail}`);
  }
}

// Every class §16 uses must already exist in the template's stylesheet. This is what makes
// "no new CSS" a check rather than a promise: a panel that referenced an undefined class would
// render unstyled on John's phone and nothing would say so.
function panelUsesOnlyDefinedClasses() {
  const s = sources();
  const styleBlock = s.rawTpl.slice(s.rawTpl.indexOf("<style id=\"s\">"), s.rawTpl.indexOf("</style>"));
  assert.ok(styleBlock.length > 1000, "could not locate the template stylesheet (#s)");
  for (const cls of PANEL_CLASSES) {
    assert.ok(
      new RegExp(`\\.${cls}\\b`).test(styleBlock),
      `panel class .${cls} is not defined in the template stylesheet — §16 may add no new CSS`,
    );
  }
  const used = [...s.panel.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/));
  for (const cls of used) {
    assert.ok(
      PANEL_CLASSES.includes(cls),
      `§16 uses class "${cls}", which is outside the declared no-new-CSS set — add it to the ` +
      `stylesheet and to PANEL_CLASSES deliberately, or use a class the page already ships`,
    );
  }
}

// The negative control: break each clause in turn and prove the assertion fails. A clause whose
// broken form still passes is asserting nothing.
function everyClauseHasTeeth() {
  const s = sources();
  for (const c of CLAUSES) {
    const broken = c.breaks(s[c.where]);
    assert.notStrictEqual(
      broken, s[c.where],
      `${c.id}: the control changed nothing — its break() no longer matches the shipped text`,
    );
    assert.ok(!c.test(broken), `${c.id}: the assertion passes on a file with the rule removed`);
  }
}

// The meta-assertion (the SES-158 failure): prove the teeth check can itself fail, so a future
// no-op control cannot pass silently.
function aVacuousMutationFailsItsOwnControl() {
  const s = sources();
  const vacuous = { id: "vacuous", where: "panel", test: () => true, breaks: x => x };
  assert.throws(
    () => {
      const broken = vacuous.breaks(s.panel);
      assert.notStrictEqual(broken, s.panel, "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

function run() {
  theShippedFilesAreClean();
  panelUsesOnlyDefinedClasses();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();

  notRun(
    "§16 rendered against the live board",
    "asserting the published numbers needs SUPABASE_URL / SUPABASE_SERVICE_KEY and a full " +
    "build-briefing run; the offline assertions above cover the contract, the section, §15's " +
    "correction and the four builder anchors. Live evidence is on the ship card (builder run, " +
    "sample values proven replaced under a poisoned-template control).",
  );
}

selfRun(import.meta.url, run);
export default run;
