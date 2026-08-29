// DeepBench v7.0.326 | tests/regression/SES-24-hygiene-inflight-retarget.js | SES-24
//
// Guards SES-24: the session-hygiene 5-family checks point at `inflight/` markers, not at the
// retired "In flight now" bullet list, and check 5e has a write-up of its own.
//
// THE DEFECT, measured on an unedited tree rather than recalled. SES-011 replaced the shared
// "In flight now" bullet list in CLAUDE-STATE.md with per-session inflight markers on 2026-07-21,
// and scripts/check-session-docs.js was retargeted at the time -- its own comment says so. The
// PROSE a human follows was not. Measured 2026-08-29: CLAUDE-STATE.md contains the string
// "In flight now" ZERO times (it is a generated file since SES-177, carrying Version / Prior /
// Standing brief), while check 5c said "For each 'In flight now' bullet" and 5d said "for every
// worktree name mentioned in an 'In flight now' bullet" -- instructions to grep a file for
// something that is not in it, which returns nothing and reads as "all clear".
//
// AND CHECK 5e HAD NO SECTION AT ALL. It has existed in the script since 2026-07-23 (SES-23),
// is listed in the script's own mechanized-checks comment, and was mentioned in this runbook only
// in passing inside check 5's sentence. Its suppression rule is the load-bearing half: an on-disk
// unpushed marker means the worktree is LIVE, so check 5's "likely finished, safe to clean"
// verdict must be suppressed for it. Without that written down, a human running the checks by hand
// reaches the exact opposite of the truth and removes a live session's worktree.
//
// WHY THE PROSE MATTERS WHEN THE SCRIPT IS ALREADY RIGHT: the runbook is what a session follows
// when it runs the checks by hand, which is the documented fallback and is what an unattended
// cloud cycle does (the script's git calls target a Windows shared checkout that does not exist
// there -- it prints "fatal: cannot change to 'C:/Projects/deepbench-frontend'" on every run).
//
// SCOPE, STATED SO A LATER EDITOR DOES NOT READ THIS AS WIDER THAN IT IS. The cross-file clause
// is deliberately scoped to the 5-FAMILY. The script emits eleven further check ids with no
// heading in this runbook at all (3d, 3e, 3f, 6b, 6c, 9, 10, 11, 12, 13, 14) -- a real and larger
// documented-vs-mechanized drift, measured here, filed as its own ticket, and NOT smuggled into
// this guard, which would make it fail on work SES-24 never scoped.
//
// THE RULE IS READ OUT OF THE SHIPPED FILE, never restated here (John, 2026-08-23: "you should
// never be throwing away tests"; the SES-104 / SES-158 / SES-213 precedent).
//
// EVERY CLAUSE IS PAIRED WITH A NEGATIVE CONTROL plus the SES-158 vacuity meta-check, and the
// file-level control reconstructs the pre-change prose in-process rather than reading origin/dev
// (SES-240 is the open finding that asserting against that moving ref fails for unrelated reasons).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/session-hygiene.md");
const SCRIPT = path.join(ROOT, "scripts/check-session-docs.js");

// The retired location. Named once, here: it is the signature the clauses search for, not a string
// any check should ever aim at again.
export const RETIRED_BULLET_LIST = '"In flight now"';

export const norm = s => s.replace(/\s+/g, " ");

// Pure: one check's section, from its bold heading to the next one. "" when absent -- a finding
// the caller reports, never a throw.
export function extractCheck(md, id) {
  // TWO HEADING FORMS, and missing the second is a false "undocumented" (SES-245, v7.0.329).
  // Most checks open `**N. `, but 10 and 11 are written as `**Check 10 -- ` bullets inside check
  // 9's section, because the truth tripwire documents its three members together. A coverage
  // clause that knew only the first form reported both as having no write-up when they do.
  const e = id.replace(".", "\\.");
  let start = md.indexOf(`**${id}. `);
  const skip = 3;
  if (start < 0) {
    // THREE HEADING SHAPES EXIST IN THIS RUNBOOK and a matcher that knows one reports the other
    // two as undocumented. `**N. ` is the common one; `**Check N -- ` is how the truth tripwire
    // writes 10 and 11 inside check 9; `**N (label).**` is how the backlog-snapshot sub-checks
    // 3d/3e/3f are written as bullets under check 3. All three are real write-ups a human reads.
    const alt = new RegExp(`\\*\\*Check ${e}[ .\\u2014-]|\\*\\*${e} \\(`);
    const m = alt.exec(md);
    if (!m) return "";
    start = m.index;
  }
  const next = md.slice(start + skip).search(/\n\*\*[0-9]+[a-z]?\. /);
  return next < 0 ? md.slice(start) : md.slice(start, start + skip + next);
}

// Pure: every check id the SHIPPED script actually emits, read from its real findings.push calls.
// Never a hand-kept list -- that is the second-copy failure this ticket is an instance of.
export function scriptCheckIds(src) {
  return [...new Set([...src.matchAll(/check:\s*"([0-9a-z]+)"/g)].map(m => m[1]))];
}

export const fiveFamily = ids => ids.filter(id => /^5[a-z]?$/.test(id)).sort();

export const CLAUSES = [
  {
    id: "5c-targets-the-marker",
    detail:
      "check 5c must iterate inflight/<name>.md markers and must not name the retired " +
      "\"In flight now\" bullet list -- grepping a file for a string it does not contain returns " +
      "nothing and reads as all-clear",
    of: md => extractCheck(md, "5c"),
    test: s => /inflight\/<name>\.md/.test(s) && !s.includes(RETIRED_BULLET_LIST),
    breaks: s => s.replace("For each `inflight/<name>.md` marker", `For each ${RETIRED_BULLET_LIST} bullet`),
  },
  {
    id: "5d-targets-the-marker",
    detail:
      "check 5d must key on what an inflight marker CLAIMS, not on a CLAUDE-STATE.md bullet, and " +
      "its do-not-auto-edit guard must protect the inflight file rather than CLAUDE-STATE.md, " +
      "which is generated now (SES-177) and carries no such entries",
    of: md => extractCheck(md, "5d"),
    test: s => /inflight\/<name>\.md/.test(s) && !s.includes(RETIRED_BULLET_LIST)
            && /without asking/.test(s) && !/auto-edit `CLAUDE-STATE\.md`/.test(s),
    breaks: s => s.replace("an `inflight/<name>.md` marker claims", `an ${RETIRED_BULLET_LIST} bullet names`),
  },
  {
    id: "5e-has-its-own-section",
    detail:
      "check 5e must have a heading of its own. It has been in the script since SES-23 and was " +
      "described here only inside check 5's sentence, which is why nobody running the checks by " +
      "hand knew it existed",
    of: md => md,
    test: s => /\n\*\*5e\. /.test(s),
    breaks: s => s.replace("\n**5e. ", "\n**5x. "),
  },
  {
    id: "5e-suppresses-check-5",
    detail:
      "5e must say that an on-disk unpushed marker SUPPRESSES check 5's verdict for that " +
      "worktree and that it is LIVE. Without it the two checks both fire and the reader is told " +
      "'likely finished, safe to remove' about a session that is running",
    of: md => extractCheck(md, "5e"),
    test: s => /suppress/i.test(s) && /do NOT remove the worktree/.test(s),
    breaks: s => s.replace(/suppress/gi, "note").replace("do NOT remove the worktree", "consider the worktree"),
  },
];

function theShippedRunbookIsClean() {
  const md = fs.readFileSync(RUNBOOK, "utf8");
  for (const c of CLAUSES) {
    const s = c.of(md);
    assert.ok(s, `SES-24 clause "${c.id}": its section was not found -- the heading moved`);
    assert.ok(c.test(s), `SES-24 clause "${c.id}" is not satisfied by the shipped runbook: ${c.detail}`);
  }
}

function aMissingSectionIsFlagged() {
  assert.strictEqual(extractCheck("no such section here", "5c"), "",
    "extractCheck must return '' for an absent section so the caller reports it rather than throwing");
}

function everyClauseHasTeeth() {
  const md = fs.readFileSync(RUNBOOK, "utf8");
  for (const c of CLAUSES) {
    const s = c.of(md);
    const broken = c.breaks(s);
    assert.notStrictEqual(broken, s,
      `SES-24 clause "${c.id}" has a VACUOUS negative control -- breaks() changed nothing (the SES-158 failure)`);
    assert.ok(!c.test(broken),
      `SES-24 clause "${c.id}" still passes with its own rule removed -- it is not discriminating`);
  }
}

function aVacuousMutationFailsItsOwnControl() {
  const vacuous = { breaks: s => s };
  assert.strictEqual(vacuous.breaks("anything"), "anything",
    "the meta-assertion's own fixture must be unchanged, or it is not testing vacuity");
}

// FILE-LEVEL NEGATIVE CONTROL: the pre-change prose, reconstructed in-process. Every clause must
// fail on it. Reconstructed rather than fetched from origin/dev (SES-240).
function thePreChangeProseFailsEveryClause() {
  const md = fs.readFileSync(RUNBOOK, "utf8");
  const before = md
    .replace("For each `inflight/<name>.md` marker", `For each ${RETIRED_BULLET_LIST} bullet`)
    .replace("an `inflight/<name>.md` marker claims", `an ${RETIRED_BULLET_LIST} bullet names`)
    .replace(/\n\*\*5e\. [\s\S]*?(?=\n\n)/, "");
  assert.notStrictEqual(before, md, "the reconstruction changed nothing -- the control is vacuous");
  let failed = 0;
  for (const c of CLAUSES) if (!c.test(c.of(before))) failed++;
  assert.strictEqual(failed, CLAUSES.length,
    `the pre-change prose must fail all ${CLAUSES.length} clauses; it failed ${failed}`);
}

// THE CROSS-FILE CLAUSE, and the reason this file is not just a grep. The script is the mechanized
// truth; the runbook is what a human follows. EVERY check the SCRIPT emits must have a write-up
// here -- widened from the 5-family to all 23 ids by SES-245 (v7.0.329), which is the ticket's
// option (b): a derived list cannot drift, a hand-kept one already had.
//
// WHAT THE WIDENING MEASURED, recorded because the ticket's own figure was wrong: SES-245 was
// filed saying ELEVEN checks fire with no write-up (3d, 3e, 3f, 6b, 6c, 9, 10, 11, 12, 13, 14).
// Counted against the real file, nine of those DO have one -- 3d/3e/3f as sub-bullets under
// check 3, 6b/6c under check 6, 9 and 12 as their own sections, and 10/11 as `**Check N --`
// bullets inside check 9. The true gap was TWO: 13 and 14. The ticket counted headings; the
// checks were documented in three different shapes.
function everyScriptCheckIsWrittenUp() {
  const ids = scriptCheckIds(fs.readFileSync(SCRIPT, "utf8")).sort();
  assert.ok(ids.length >= 20,
    `expected the script to emit at least 20 checks, saw ${ids.length} (${ids}) -- ` +
      "if the script stopped emitting them this clause is passing vacuously");
  const md = fs.readFileSync(RUNBOOK, "utf8");
  const undocumented = ids.filter(id => !extractCheck(md, id));
  assert.deepStrictEqual(undocumented, [],
    `the script emits check(s) with no write-up in docs/runbooks/session-hygiene.md: ` +
      `${undocumented.join(", ")}. That is SES-24's defect returning -- a check that fires in CI ` +
      "and that nobody running the list by hand knows exists.");

  // The negative control: the same computation with 5e's section removed must FIND 5e.
  const without5e = md.replace(/\n\*\*5e\. [\s\S]*?(?=\n\n)/, "");
  const missed = ids.filter(id => !extractCheck(without5e, id));
  assert.deepStrictEqual(missed, ["5e"],
    "with 5e's section removed the cross-file clause must report exactly 5e -- if it reports " +
      "nothing, it cannot detect the very gap this ticket closed");
}

// The retired location is genuinely retired: CLAUDE-STATE.md carries no such entries, which is
// what makes a check aimed at them vacuous rather than merely old-fashioned.
function theRetiredBulletListIsReallyGone() {
  const state = fs.readFileSync(path.join(ROOT, "CLAUDE-STATE.md"), "utf8");
  assert.ok(!state.includes("In flight now"),
    "CLAUDE-STATE.md carries an \"In flight now\" list again -- SES-011's retirement was undone, " +
      "and checks 5c/5d were retargeted away from it on the premise that it is gone");
  // Both directions: the file must be readable and non-trivial, or the assertion above passes
  // because we read an empty file.
  assert.ok(state.length > 200 && state.includes("Version in dev"),
    "CLAUDE-STATE.md did not look like the generated state file -- the assertion above would " +
      "have passed for an unrelated reason");
}

async function run() {
  theShippedRunbookIsClean();
  aMissingSectionIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  thePreChangeProseFailsEveryClause();
  everyScriptCheckIsWrittenUp();
  theRetiredBulletListIsReallyGone();
}

selfRun(import.meta.url, run);
export default run;
