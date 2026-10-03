// DeepBench v7.0.297 | tests/regression/db84b784-selfbuild-burndown.js | directive db84b784
//
// NAMED FOR A DIRECTIVE, NOT A TICKET, and that is deliberate rather than a slip: this mission is
// a `runner_directives` row John typed in an attended architect session ("yes, build the burn-down
// with the size stamps", 2026-08-28) and it has no board ticket to be named after. Inventing a
// `SES-` id for a filename would put a ticket reference in front of a reader that joins to nothing
// — the same defect `SES-116` fixed in `runner_items.backlog_id`, one level out. The directive uuid
// is the honest handle, and it is what the ship card carries in `display_ref`.
//
// Guards §15's burn-down block: the six rows and their helper in briefing-template.html, and the
// builder derivation and single splice anchor that fill them. Both files must move together — a
// template block the builder cannot find dies at exit 2, and a builder anchor whose template block
// was edited under it publishes the SAMPLE numbers, which is the SES-162 defect that served John
// hardcoded sample text for a day.
//
// THE ONE CLAIM THIS BLOCK EXISTS TO STOP, and the clause this file is really written for:
// **that the drain count and the epic bucket count are the same measurement.** They are not. The
// drain count is over `runner_drain_scope` — the members John NAMED, fixed at naming time
// (`SES-142`) — and is the set that retires his standing order. The bucket count is the epic's LIVE
// open tickets and includes everything filed since. `briefing-automation.mjs`'s own header records
// what happens when one is shown as the other: §2b told John his standing drain had 17 tickets left
// against a live 11. `twoCountsStaySeparate` and `builderDerivesBothCounts` fail if a later edit
// reconciles them into one row or one query.
//
// Rules are READ OUT OF the shipped files, never restated here, and every clause carries a negative
// control naming exactly what it removed.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TPL = path.join(ROOT, "docs/runbooks/briefing-template.html");
const BUILDER = path.join(ROOT, "scripts/build-briefing.mjs");

export const norm = s => s.replace(/\s+/g, " ");

// The block is INSIDE §15 (the named deviation this ship discloses), so its far bound is §16's
// section marker rather than a marker of its own. Bounding it at its own `// ----- §15's BURN-DOWN`
// lead would let a clause read §15's older prose above it and pass on a page with no block at all.
function extractBlock(html) {
  const a = html.indexOf("// ----- §15's BURN-DOWN BLOCK");
  if (a < 0) return "";
  const b = html.indexOf("// ===== §16 · REVIEWER LANE", a);
  return norm(b < 0 ? html.slice(a) : html.slice(a, b));
}

function extractHelper(html) {
  const a = html.indexOf("function bdRow(");
  if (a < 0) return "";
  const b = html.indexOf("\n  }", a);
  return norm(b < 0 ? html.slice(a) : html.slice(a, b + 4));
}

// Every class the block uses. It may add no CSS, so each must already be defined in the template's
// own stylesheet (#s) — asserted below rather than promised in a comment.
const BLOCK_CLASSES = ["num", "dim", "tnote"];

export const CLAUSES = [
  {
    id: "six-rows-rendered",
    where: "block",
    detail: "all six burn-down rows render — the two counts and the four size buckets",
    test: s => ["Drain members still open", "Open in that epic right now", "Remaining, size S",
      "Remaining, size M", "Remaining, size L", "Remaining, unstamped"]
      .every(r => s.includes(`+bdRow('${r}'`)),
    breaks: s => s.replace("+bdRow('Remaining, unstamped'", "+bdRow('Remaining, unstamped (removed)'"),
  },
  {
    id: "two-counts-stay-separate",
    where: "block",
    // Matched in the RENDERED tnote, never as bare prose: the block's own comment explains the rule
    // at length, so a loose match would be satisfied by the comment alone and would pass on a page
    // that renders neither sentence — the exact way a guard becomes theatre.
    detail: "the rendered footnote tells John the two counts are different numbers and why",
    test: s => /\+'<p class="tnote">The first two rows are deliberately different numbers\./.test(s)
      && /the epic keeps taking new tickets, which never join it\./.test(s)
      && /the drain can reach zero with the epic still holding work, and that is correct\./.test(s),
    breaks: s => s.replace("The first two rows are deliberately different numbers.",
      "The two rows below both count what is left."),
  },
  {
    id: "unstamped-row-survives-a-zero",
    where: "block",
    detail: "the unstamped count renders even at 0 — that zero is the signal db84b784's filing rule is holding",
    test: s => /THE ZERO THAT IS A REAL ZERO/.test(s)
      && /goes non-zero the moment a cycle files without one/.test(s),
    breaks: s => s.replace("THE ZERO THAT IS A REAL ZERO", "Unstamped is hidden when it is zero"),
  },
  {
    id: "deviation-is-named-not-buried",
    where: "block",
    detail: "building into §15 rather than as a new §17 is disclosed, with the duplication it avoids",
    test: s => /NAMED DEVIATION/.test(s)
      && /would render it a SECOND time/.test(s)
      && /Nothing is renumbered/.test(s),
    breaks: s => s.replace("NAMED DEVIATION, disclosed rather than buried", "Built into §15"),
  },
  {
    id: "helper-escapes-both-arguments",
    where: "helper",
    // The epic name reaches this row from the database, so it is on the escape side of SES-208's
    // rule. A raw interpolation here is that ticket's defect rebuilt in a new row helper.
    detail: "bdRow() esc()s label AND note — both can carry database text",
    test: s => /esc\(label\)/.test(s) && /esc\(note\)/.test(s),
    breaks: s => s.replace("esc(note)", "note"),
  },
  {
    id: "helper-adds-no-new-css",
    where: "helper",
    // The presence half is what stops this passing VACUOUSLY: on a file with no bdRow at all the
    // slice is empty, an empty string contains no <style>, and "adds no new CSS" would report green
    // about a helper that does not exist.
    detail: "bdRow() exists and opens no <style> — it reuses msRow()/svRow()'s three classes",
    test: s => /function bdRow\(label, n, note\)/.test(s) && !/<style/.test(s),
    breaks: s => s.replace("function bdRow(label, n, note)", "function bdRowRenamed(label, n, note)"),
  },
  {
    id: "builder-derives-both-counts",
    where: "builder",
    // Two different sources, asserted as two: `runner_drain_scope` for the named set and the epic's
    // own rows for the bucket. A build that dropped either would still render six rows.
    detail: "the drain count reads runner_drain_scope and the bucket count reads the epic's live rows",
    test: s => /runner_drain_scope\?directive_id=eq\.\$\{bdDrain\.id\}/.test(s)
      && /bdBucketOpen = bdBucket\.filter/.test(s)
      && /i\.epic_id === bdDrain\.epic_id/.test(s),
    breaks: s => s.replace("bdBucketOpen = bdBucket.filter", "bdBucketOpen = bdOpen; const _unused = bdBucket.filter"),
  },
  {
    id: "builder-done-predicate-matches-15",
    where: "builder",
    // `done` is `status = 'done'` and nothing else, byte-comparable to §15's predicate and the
    // charter's query. `delivered` is remaining until John accepts it (SES-154); `removed` is not
    // work. Widening either turns the burn-down into a second, disagreeing source of truth.
    detail: "remaining excludes done and removed only — delivered still counts as remaining work",
    test: s => /const bdRemaining = spItems\.filter\(i => spEpicIds\.has\(i\.epic_id\) && !\['done', 'removed'\]\.includes\(i\.status\)\)/.test(s)
      && !/bdRemaining[^\n]*'delivered'/.test(s),
    breaks: s => s.replace(
      "const bdRemaining = spItems.filter(i => spEpicIds.has(i.epic_id) && !['done', 'removed'].includes(i.status));",
      "const bdRemaining = spItems.filter(i => spEpicIds.has(i.epic_id) && !['done', 'removed', 'delivered'].includes(i.status));"),
  },
  {
    id: "builder-unstamped-is-the-remainder",
    where: "builder",
    detail: "unstamped is total minus S/M/L, never a fourth equality test — an unknown stamp must not vanish",
    test: s => /const bdUn = bdRemaining\.length - bdS - bdM - bdL;/.test(s),
    breaks: s => s.replace("const bdUn = bdRemaining.length - bdS - bdM - bdL;",
      "const bdUn = bdBy(null);"),
  },
  {
    id: "builder-has-the-splice-anchor",
    where: "builder",
    detail: "the block is one anchored splice — a template edit under the builder must be exit 2, never a published sample",
    test: s => s.includes("'§15 burn-down'")
      && /splice\("\+bdRow\('Drain members still open'"/.test(s),
    breaks: s => s.replace("'§15 burn-down'", "'§15 burn-down (disabled)'"),
  },
  {
    id: "builder-says-no-drain-in-words",
    where: "builder",
    // An unticked drain is a real state, not an empty row. `0 of 0` reads as "your drain is stuck",
    // which is a claim about progress rather than about absence — the same rule as §14's cost
    // showing "—" and a NULL plain_* drawing a red defect line.
    detail: "no standing drain renders words, never 0 of 0",
    test: s => /no standing drain - nothing is named right now/.test(s)
      && /const bdDrainRows = bdDrain\s*\?/.test(s),
    breaks: s => s.replace("+bdRow('Drain members still open','-','no standing drain - nothing is named right now')",
      "+bdRow('Drain members still open',0,'of 0')"),
  },
];

function sources() {
  const tpl = fs.readFileSync(TPL, "utf8");
  const builder = fs.readFileSync(BUILDER, "utf8");
  return { block: extractBlock(tpl), helper: extractHelper(tpl), builder, rawTpl: tpl };
}

function theShippedFilesAreClean() {
  const s = sources();
  assert.ok(s.block, "§15's burn-down block is missing from briefing-template.html");
  assert.ok(s.helper, "bdRow() is missing from briefing-template.html");
  for (const c of CLAUSES) {
    assert.ok(c.test(s[c.where]), `${c.id}: ${c.detail}`);
  }
}

// What makes "no new CSS" a check rather than a promise: a row referencing an undefined class would
// render unstyled on John's phone every morning and nothing would say so.
function blockUsesOnlyDefinedClasses() {
  const s = sources();
  const styleBlock = s.rawTpl.slice(s.rawTpl.indexOf('<style id="s">'), s.rawTpl.indexOf("</style>"));
  assert.ok(styleBlock.length > 1000, "could not locate the template stylesheet (#s)");
  for (const cls of BLOCK_CLASSES) {
    assert.ok(new RegExp(`\\.${cls}\\b`).test(styleBlock),
      `class .${cls} is not defined in the template stylesheet — the burn-down may add no new CSS`);
  }
  const used = [...(s.block + s.helper).matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/));
  for (const cls of used) {
    assert.ok(BLOCK_CLASSES.includes(cls),
      `the burn-down uses class "${cls}", outside the declared no-new-CSS set — add it to the ` +
      `stylesheet and to BLOCK_CLASSES deliberately, or use a class the page already ships`);
  }
}

// The negative control: break each clause in turn and prove the assertion fails. A clause whose
// broken form still passes is asserting nothing.
function everyClauseHasTeeth() {
  const s = sources();
  for (const c of CLAUSES) {
    const broken = c.breaks(s[c.where]);
    assert.notStrictEqual(broken, s[c.where],
      `${c.id}: the control changed nothing — its break() no longer matches the shipped text`);
    assert.ok(!c.test(broken), `${c.id}: the assertion passes on a file with the rule removed`);
  }
}

// The meta-assertion (the SES-158 failure): prove the teeth check can itself fail, so a future
// no-op control cannot pass silently.
function aVacuousMutationFailsItsOwnControl() {
  const s = sources();
  const vacuous = { breaks: x => x };
  assert.throws(
    () => {
      const broken = vacuous.breaks(s.block);
      assert.notStrictEqual(broken, s.block, "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

function run() {
  theShippedFilesAreClean();
  blockUsesOnlyDefinedClasses();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();

  notRun(
    "the burn-down rendered against the live board",
    "asserting the published numbers needs SUPABASE_URL / SUPABASE_SERVICE_KEY and a full " +
    "build-briefing run; the offline assertions above cover the six rows, the helper, the " +
    "no-new-CSS rule and the builder's derivation and anchor. Live evidence is on the ship card " +
    "(builder run, sample values proven replaced under a poisoned-template control).",
  );
}

selfRun(import.meta.url, run);
export default run;
