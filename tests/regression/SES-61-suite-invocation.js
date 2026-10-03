// DeepBench v7.0.300 | tests/regression/SES-61-suite-invocation.js | SES-207 -- this guard now
// covers the RENDERED hint as well as the rule. Rule 5 has been right since SES-61; what it could
// not reach is the bare --env-file= string seven credential-gated tests write into their own
// notRun() reasons, which is what a reader actually sees. Extended here rather than given a second
// guard file, per this file's own "point rather than restate" clause. The seven SOURCE strings are
// deliberately NOT asserted clean -- see the declared remainder in
// docs/kickoffs/v7.0.300-SES-207-skip-hint-invocation.md.
//
// DeepBench v7.0.253 | tests/regression/SES-61-suite-invocation.js | SES-61
//
// Guards STANDARDS.md Section 2 rule 5 -- the command this repo specs for its own regression gate.
//
// THE DEFECT, and it is not hypothetical: a test half needing SUPABASE_URL / SUPABASE_SERVICE_KEY
// declares itself not-run and its file still reports [PASS], so the specced invocation could go
// green having verified none of them. MEASURED LIVE 2026-08-25 by runner cycle 860efe52, on a REAL
// failure rather than a fixture: the bare command reported "68/68 passed" on the same tree where
// the credentialed command reported "67/68" -- SES-177-claude-state-renderer.js was failing on real
// CLAUDE-STATE.md drift, and the gate as specced could not see it.
//
// THE ONE-LINER THIS FILE EXISTS TO FORBID, and it is the fix the ticket itself proposed:
// `node --env-file=.env.local tests/regression/run-all.js`. Bare --env-file HARD-ERRORS when the
// file is absent (`node: .env.local: not found`), and .env.local is git-ignored, so it is absent in
// EVERY unattended cloud runner cycle -- the environment that runs this suite most often. The
// obvious form of the fix breaks the main consumer. --env-file-if-exists is the form that does not.
//
// THE RULE IS READ OUT OF STANDARDS.md, never restated here (John's rule 2026-08-23, "you should
// never be throwing away tests"; the SES-197 / SES-194 / SES-158 precedent). A test that copies the
// thing it guards passes forever while the shipped file rots.
//
// EVERY PROSE CLAUSE IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that
// should matter removed. "Would this still pass if the check did nothing?" must answer "no" for
// every clause, and the controls are themselves asserted (the SES-158 vacuous-control lesson).
//
// FILE-LEVEL NEGATIVE CONTROL, measured rather than claimed: run against origin/dev's pre-change
// STANDARDS.md, 6 of 6 prose clauses fail. Recorded here by the cycle that shipped it.
//
// AND ONE CLAUSE IS NOT PROSE. flagIsSupportedByThisNode() SPAWNS the specced flag against a file
// that does not exist and asserts exit 0. That is what stops this from being a document test: if a
// future Node drops or renames --env-file-if-exists, the spec becomes a command nobody can run, and
// no amount of grepping STANDARDS.md would notice.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import {
  selfRun, renderNotRun, repairInvocation, installHintRepair, resetHintRepairNotice,
  BARE_ENV_FILE, SAFE_ENV_FILE, INVOCATION_SPEC,
} from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STANDARDS = path.join(ROOT, "docs/STANDARDS.md");

const RULE5_START = "5. Node.js test must pass before any commit";
const RULE5_END = "6. `npm run build` must pass before any commit";

// Pure: slice a bounded block out of the doc. Returns "" when absent -- itself a finding rather
// than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export const extractRule5 = md => extractBlock(md, RULE5_START, RULE5_END);

// Markdown is hard-wrapped, so a load-bearing phrase can straddle a line break and a literal match
// fails for a reason that has nothing to do with the rule (the SES-194 lesson, paid for on
// "WENT SILENT"). Normalising runs of whitespace to one space makes every clause reflow-proof.
export const norm = s => s.replace(/\s+/g, " ");

export const CLAUSES = [
  {
    id: "specs-the-if-exists-form",
    detail:
      "rule 5 must spec run-all.js WITH --env-file-if-exists=.env.local -- the command is the " +
      "whole ticket, and a rule that describes the problem without naming the command fixes nothing",
    test: s =>
      /--env-file-if-exists=\.env\.local/.test(s) &&
      /tests\/regression\/run-all\.js/.test(s),
    breaks: s => s.replace(/--env-file-if-exists=\.env\.local/g, "--env-file=.env.local"),
  },
  {
    id: "forbids-bare-env-file",
    detail:
      "rule 5 must forbid the bare --env-file= form AND give the reason -- it hard-errors where " +
      "the file is absent, which is every cloud runner cycle; this is the ticket's own proposed " +
      "fix, so without this clause the next editor 'simplifies' it straight back",
    test: s =>
      /never bare `?--env-file=/i.test(s) &&
      /hard-errors?/i.test(s) &&
      /git-ignored|never exists|absent/i.test(s),
    breaks: s => s.replace(/hard-errors?/gi, "behaves slightly differently"),
  },
  {
    id: "measured-not-asserted",
    detail:
      "the gap must be carried as a MEASUREMENT with both numbers and the test that was failing -- " +
      "an unmeasured version of this claim is an argument, and arguments get tuned away",
    test: s => /68\/68/.test(s) && /67\/68/.test(s) && /SES-177/.test(s),
    breaks: s => s.replace(/67\/68/g, "a lower number"),
  },
  {
    id: "credentials-are-not-spend",
    detail:
      "the paid-half boundary must survive: halves that cost real money stay on their own flag " +
      "(DAT-12's DAT12_LIVE_CHI), so passing credentials never silently starts billing",
    test: s => /DAT12_LIVE_CHI/.test(s) && /spend/i.test(s),
    breaks: s => s.replace(/DAT12_LIVE_CHI/g, "its own flag"),
  },
  {
    id: "not-a-full-run-is-not-a-failure",
    detail:
      "rule 5 must state that SES-180 (b)'s NOT A FULL RUN line is deliberately NOT a failure -- " +
      "a later editor reading only this rule would 'finish the job' by gating on it, which paints " +
      "CI permanently red wherever credentials are absent, the outcome SES-180 shipped around",
    test: s => /NOT A FULL RUN/.test(s) && /not\*?\*? a failure|deliberately \*\*not\*\*/i.test(s),
    breaks: s => s.replace(/NOT A FULL RUN/g, "the partial-run line"),
  },
  {
    id: "checklist-points-rather-than-restates",
    detail:
      "Section 5's Category K/M rows must POINT at Section 2 rule 5 rather than restate a bare " +
      "command -- two hand-maintained copies of one invocation is how the bare form comes back",
    test: (_s, md) =>
      !/- \[ \] Persisted copy added to `tests\/regression\/`, `node tests\/regression\/run-all\.js` passes/.test(md) &&
      /invoked per Section 2 rule 5/.test(md),
    breaks: null,   // whole-file clause; its control is the pre-change file, asserted below
    wholeFile: true,
  },
];

// NOT a document assertion. Proves the specced flag actually works on the Node running this suite:
// a missing file must be tolerated (exit 0), which is the entire reason the spec uses this form.
export function flagIsSupportedByThisNode() {
  const missing = path.join(ROOT, ".env.local.definitely-not-present-" + process.pid);
  const r = spawnSync(process.execPath,
    [`--env-file-if-exists=${missing}`, "-e", "process.exit(0)"],
    { encoding: "utf8" });
  return { status: r.status, stderr: (r.stderr || "").trim() };
}

// And its discriminator: the form the rule FORBIDS must actually fail the same way. If bare
// --env-file ever started tolerating a missing file, this rule's whole justification would be gone
// and the clause above would be pinning a reason that is no longer true.
export function bareFlagRejectsMissingFile() {
  const missing = path.join(ROOT, ".env.local.definitely-not-present-" + process.pid);
  const r = spawnSync(process.execPath,
    [`--env-file=${missing}`, "-e", "process.exit(0)"],
    { encoding: "utf8" });
  return { status: r.status, stderr: (r.stderr || "").trim() };
}

// --- SES-207 (v7.0.300): the RENDERED hint, not just the rule --------------------------------
//
// Rule 5 has said the right thing since SES-61. What it could not reach is the string a
// credential-gated test writes into its own notRun() reason, which is what a reader actually sees
// at the moment they go looking for the missing half -- eight printed occurrences of the bare form
// on an uncredentialed run, measured before the change. renderNotRun() repairs them; these clauses
// pin that behaviour AND pin that it is a real difference from what shipped before.
//
// The pre-change template, kept verbatim as the negative control. A clause that only asserts the
// new output is a property BOTH implementations could share -- this is what makes the difference
// measurable (the SES-213 lesson: assert against the retired expression, not just the new one).
export function retiredRenderNotRun(entries, indent = "       ") {
  return entries.map(e => `${indent}[NOT RUN] ${e.part} -- ${e.reason}`).join("\n");
}

// The hostile fixture is the real shape, copied from the live sites rather than invented.
export const HOSTILE_ENTRIES = [{
  part: "a credential-gated half",
  reason: "no Supabase credentials in env -- run with " +
          "`node --env-file=.env.local tests/regression/run-all.js` to include it.",
}];

// A declaration that never wrote the bad form. The quiet case must stay byte-identical, or the
// notice becomes noise on every run and stops being read.
export const CLEAN_ENTRIES = [{
  part: "a half that points at the spec instead",
  reason: `no Supabase credentials in env -- see ${INVOCATION_SPEC} for the suite command.`,
}];

export default async function run() {
  const md = fs.readFileSync(STANDARDS, "utf8");
  const block = norm(extractRule5(md));

  assert.ok(block.length > 0,
    "STANDARDS.md Section 2 rule 5 not found -- the anchor moved, so this guard is checking nothing");

  for (const c of CLAUSES) {
    assert.ok(c.test(block, md), `SES-61 rule-5 clause '${c.id}' FAILED: ${c.detail}`);
  }

  // Every per-clause control must have teeth, and the controls are themselves checked -- SES-158
  // shipped a control that changed nothing and only its own check caught it.
  for (const c of CLAUSES) {
    if (!c.breaks) continue;
    const mutated = c.breaks(block);
    assert.notStrictEqual(mutated, block,
      `SES-61 control for '${c.id}' is VACUOUS -- it changed nothing, so it proves nothing`);
    assert.ok(!c.test(mutated, md),
      `SES-61 control for '${c.id}' has no teeth -- the clause still passes with its subject removed`);
  }

  // The executable half.
  const ok = flagIsSupportedByThisNode();
  assert.strictEqual(ok.status, 0,
    `the specced --env-file-if-exists flag failed on this Node (${process.version}); ` +
    `STANDARDS.md rule 5 specs a command this runtime cannot run. stderr: ${ok.stderr}`);

  const bare = bareFlagRejectsMissingFile();
  assert.notStrictEqual(bare.status, 0,
    "bare --env-file tolerated a MISSING file on this Node -- rule 5 forbids that form because it " +
    "hard-errors, and if that stopped being true the stated reason is stale and must be re-checked");

  // --- SES-207: the rendered hint --------------------------------------------------------------

  // Vacuity meta-check FIRST (the SES-158 lesson). Every clause below is about removing the bare
  // form; if the fixture never contained it, they all pass having proven nothing.
  assert.ok(HOSTILE_ENTRIES[0].reason.includes(BARE_ENV_FILE),
    "SES-207 fixture is VACUOUS -- the hostile reason does not contain the bare form, so every " +
    "clause below would pass without the repair doing anything");

  const repaired = repairInvocation(HOSTILE_ENTRIES[0].reason);
  assert.ok(!repaired.includes(BARE_ENV_FILE),
    "repairInvocation() left the bare --env-file= form in place -- that string is the whole defect");
  assert.ok(repaired.includes(SAFE_ENV_FILE),
    "repairInvocation() removed the bare form without producing the --env-file-if-exists= form");

  // Idempotence is what makes it safe to apply to EVERY reason, correct ones included. It holds
  // because "--env-file-if-exists=" does not contain "--env-file=".
  assert.strictEqual(repairInvocation(repaired), repaired,
    "repairInvocation() is not idempotent -- re-repairing a corrected reason changed it, which " +
    "means the token swap is eating its own output");
  assert.strictEqual(repairInvocation(CLEAN_ENTRIES[0].reason), CLEAN_ENTRIES[0].reason,
    "repairInvocation() rewrote a reason that was already correct -- it must be a no-op there");

  const rendered = renderNotRun(HOSTILE_ENTRIES);
  assert.ok(!rendered.includes(BARE_ENV_FILE),
    "renderNotRun() printed the bare --env-file= form -- a reader following it gets " +
    "`node: .env.local: not found`, which is the defect SES-207 was filed on");
  assert.ok(rendered.includes(SAFE_ENV_FILE),
    "renderNotRun() did not print the --env-file-if-exists= form the reader needs");
  assert.ok(/hint repaired/.test(rendered) && rendered.includes(INVOCATION_SPEC),
    "renderNotRun() repaired the hint SILENTLY -- the notice must say a repair happened and name " +
    `${INVOCATION_SPEC}, or the source rot is hidden rather than fixed`);

  // THE NEGATIVE CONTROL, and it is the clause that gives the three above their teeth: the retired
  // template on the SAME fixture must still carry the bare form. This proves a DIFFERENCE from
  // what shipped before rather than a property both implementations happen to share.
  const control = retiredRenderNotRun(HOSTILE_ENTRIES);
  assert.ok(control.includes(BARE_ENV_FILE),
    "SES-207 control is VACUOUS -- the pre-change template did not print the bare form on this " +
    "fixture, so the clauses above prove nothing about what changed");
  assert.notStrictEqual(rendered, control,
    "renderNotRun() produced the pre-change output byte-for-byte -- the repair did nothing");

  // And the quiet case: a clean declaration must render EXACTLY as it always did. A notice on
  // every run is noise, and noise is how a real signal stops being read.
  assert.strictEqual(renderNotRun(CLEAN_ENTRIES), retiredRenderNotRun(CLEAN_ENTRIES),
    "renderNotRun() changed the output for a declaration that never wrote the bare form -- the " +
    "repair notice must fire only when a repair actually happened");

  // --- SES-207, the SECOND announcement path -----------------------------------------------
  //
  // Repairing renderNotRun() alone took the suite's printed occurrences 8 -> 4, and the four
  // survivors were AGT-44, DAT-003, DAT-11 and DAT-12 -- four of the five files the ticket names.
  // They announce through a plain console.log that never reaches renderNotRun(). These clauses
  // pin the sink repair, without which this ticket ships half done.
  resetHintRepairNotice();
  const captured = [];
  const fake = { log: (...a) => captured.push(a.join(" ")) };
  const restore = installHintRepair(fake);
  try {
    fake.log(`[AGT-44] live half SKIPPED (run with \`node ${BARE_ENV_FILE}.env.local ` +
             "tests/regression/run-all.js` to include it).");
    fake.log("[SOMETHING] a line that never mentioned the flag at all.");
  } finally {
    restore();
  }

  assert.ok(!captured[0].includes(BARE_ENV_FILE),
    "installHintRepair() let a console.log print the bare --env-file= form -- that is the path " +
    "four of SES-207's five named files actually use");
  assert.ok(captured[0].includes(SAFE_ENV_FILE),
    "installHintRepair() removed the bare form without leaving the working one in its place");
  assert.ok(captured.some(l => /hint repaired/.test(l) && l.includes(INVOCATION_SPEC)),
    `the console repair is SILENT -- it must say so once and name ${INVOCATION_SPEC}`);
  assert.strictEqual(captured.filter(l => /hint repaired/.test(l)).length, 1,
    "the console repair announced itself more than once -- it is said once per run, or a long " +
    "suite drowns in its own bookkeeping and the notice stops being read");
  assert.ok(captured.includes("[SOMETHING] a line that never mentioned the flag at all."),
    "installHintRepair() altered a line that had nothing to do with the flag -- it must be a " +
    "no-op on everything but the bare form");
  // The restore must actually restore, or a guard that installs the wrapper leaks it into every
  // later test in the same process.
  const marker = () => {};
  const target2 = { log: marker };
  installHintRepair(target2)();
  assert.strictEqual(target2.log, marker,
    "installHintRepair()'s restore did not put the original console.log back");

  // Idempotence: installing twice must not double-wrap, or one line gets repaired-and-announced
  // twice and the once-per-run contract above quietly breaks.
  const target3 = { log: () => {} };
  installHintRepair(target3);
  const afterFirst = target3.log;
  installHintRepair(target3);
  assert.strictEqual(target3.log, afterFirst,
    "installHintRepair() double-wrapped an already-wrapped console -- it must detect its own " +
    "wrapper and stand down");

  return true;
}

selfRun(import.meta.url, run);
