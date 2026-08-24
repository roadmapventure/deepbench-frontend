// DeepBench v7.0.230 | tests/regression/SES-194-stall-watchdog.js | SES-194
//
// Guards the two halves of the stall watchdog in docs/runbooks/runner-cycle.md: the step-0b
// `stall_watchdog()` call that CLOSES one 24h-silent peer, and the heartbeat statement's
// `AND ended_at IS NULL` resume guard that stops a returning cycle writing into a row that was
// closed while it was quiet. The two were designed together and neither is correct alone, so one
// test guards both -- a checkout carrying the watchdog without the guard is the failure mode.
//
// THE RULE IS READ OUT OF THE RUNBOOK, never restated here (John's rule 2026-08-23, "you should
// never be throwing away tests"; the DIR-603f44ea / SES-176 / SES-158 precedent). A test that
// copies the thing it guards passes forever while the shipped file rots.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that
// should matter removed. "Would this still pass if the check did nothing?" must answer "no" for
// every clause, which is the bar SES-176 set for this repo's doc guards. There is also a
// meta-assertion (`aVacuousMutationFailsItsOwnControl`) because SES-158 shipped a control that
// changed nothing -- a case-sensitive replacement against prose that did not contain the string --
// and the test only caught it because the control was itself checked.
//
// THE CLAUSE THIS FILE EXISTS FOR, above all the others: the 24-hour threshold. It is register
// B37's evidence bar, not a number SES-194 chose, and a later cycle WILL be tempted to tune it
// down toward SES-103's 20-minute tripwire -- because two peers sat visibly frozen for two hours
// on the day this shipped and the watchdog correctly did nothing about them. B37 is written from
// ba8f2ce3 and 633fe486, which were pronounced dead at ~3h and came back nine hours later and
// finished their missions. A shorter bar does not catch stalls sooner; it manufactures duplicate
// builds. `thresholdIsTheB37Bar` and its control are the pin.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied (SES-180 (b)): the function BODY
// lives in the database (migration ses194_stall_watchdog), not in this repo, and this suite has
// only a PostgREST path -- which cannot read pg_get_functiondef, and could only reach the function
// by INVOKING it, which mutates the live ledger. So the behavioural half is declared not-run here
// and its evidence is the live QA recorded on the ship card: two fixtures at 30h and 26h closed
// with all four arms firing, a negative control proving the two genuinely-frozen ~2h peers were
// NOT closed, idempotence on a second call, and the resume guard proven by a closed row's
// last_step surviving a "resumed" heartbeat.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

const WATCHDOG_START = "**THE WATCHDOG — one call, run it right after the sweep";
const WATCHDOG_END = "Any row from these";
const HEARTBEAT_START = "**Heartbeat first (`SES-103`";
const HEARTBEAT_END = "Run this at step 0, every cycle.";

// Pure: slice a bounded block out of the runbook. Returns "" when absent -- itself a finding
// rather than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export const extractWatchdog = md => extractBlock(md, WATCHDOG_START, WATCHDOG_END);
export const extractHeartbeat = md => extractBlock(md, HEARTBEAT_START, HEARTBEAT_END);

// Pure: the load-bearing clauses, kept as data so a negative control can name exactly which one it
// removed. A clause earns its place only if REMOVING it would change what a cycle does.
export const CLAUSES = [
  {
    id: "the-call",
    where: "watchdog",
    detail: "step 0b must name the function and pass the cycle id -- without the call nothing ever closes a silent row, which is the entire ticket",
    test: s => /public\.stall_watchdog\('<your cycle id>'\)/.test(s),
    // control: keep the prose, remove the callable statement
    breaks: s => s.replace("public.stall_watchdog('<your cycle id>')", "-- (call removed)"),
  },
  {
    id: "threshold-is-b37s-bar",
    where: "watchdog",
    detail: "the 24h threshold must be stated AND attributed to register B37 -- an unattributed number reads as this ticket's choice and gets tuned",
    test: s => /24[- ]?h(our)?/i.test(s) && /B37/.test(s),
    breaks: s => s.replace(/B37/g, "this step"),
  },
  {
    id: "tuning-is-forbidden",
    where: "watchdog",
    detail: "the block must forbid lowering the bar toward the 20-minute tripwire -- the frustration that motivates that edit is real and predictable",
    test: s => /forbids/.test(s) && /20[- ]minute|20 min/i.test(s),
    breaks: s => s.replace(/forbids/g, "permits"),
  },
  {
    id: "resurrection-evidence",
    where: "watchdog",
    detail: "the two cycles that came back after ~9h must be named -- the bar is derived from that measurement, and a rule without its evidence is re-argued every time it is inconvenient",
    test: s => /ba8f2ce3/.test(s) && /633fe486/.test(s),
    breaks: s => s.replace(/ba8f2ce3/g, "a cycle"),
  },
  {
    id: "one-row-per-cycle",
    where: "watchdog",
    detail: "closing exactly ONE row per cycle, oldest first, is what keeps the sweep self-limiting",
    test: s => /\bONE row per cycle\b/.test(s) && /oldest first/.test(s),
    breaks: s => s.replace("ONE row per cycle", "every stale row it finds"),
  },
  {
    id: "atomic-claim",
    where: "watchdog",
    detail: "the guarded UPDATE must be named as the atomic claim, so exactly one peer closes a given row under parallel cycles",
    test: s => /atomic claim/.test(s),
    breaks: s => s.replace(/atomic claim/g, "convenience"),
  },
  {
    id: "no-stray-on-lost-race",
    where: "watchdog",
    detail: "before-image and close must roll back together on a lost race -- otherwise §19v's no-before-image-no-write holds in only one direction",
    test: s => /subtransaction/.test(s) && /lost race/.test(s),
    breaks: s => s.replace(/subtransaction/g, "statement"),
  },
  {
    id: "went-silent-never-died",
    where: "watchdog",
    detail: "B37's prose rule: the note says WENT SILENT and never that the cycle died. Machine-checkable only because the generated note avoids the word entirely",
    test: s => /WENT SILENT/.test(s) && /never that the cycle died/.test(s),
    breaks: s => s.replace(/WENT SILENT/g, "died"),
  },
  {
    id: "failed-is-bookkeeping",
    where: "watchdog",
    detail: "'failed' must be named a bookkeeping value, not a verdict on the work -- otherwise the ledger John reads mislabels a cycle that was merely quiet",
    test: s => /never a verdict on the work/.test(s),
    breaks: s => s.replace("never a verdict on the work", "an accurate summary of the work"),
  },
  {
    id: "b37-still-binds",
    where: "watchdog",
    detail: "the block must say it does NOT license adjudicating a predecessor by any other route -- a sanctioned exception is how a prohibition gets read as lifted",
    test: s => /B37 is intact/.test(s),
    breaks: s => s.replace("B37 is intact", "B37 is superseded"),
  },
  {
    id: "heartbeat-guard",
    where: "heartbeat",
    detail: "the heartbeat statement must carry AND ended_at IS NULL with RETURNING -- without it a resumed cycle writes into a closed row and can push work whose claim was released",
    test: s => /AND ended_at IS NULL/.test(s) && /RETURNING id/.test(s),
    breaks: s => s.replace(/AND ended_at IS NULL/g, ""),
  },
  {
    id: "abort-branch",
    where: "heartbeat",
    detail: "0 rows must direct an abort: no push, no counter claim, no re-opening the row",
    test: s => /Do NOT push/.test(s) && /Do NOT re-open your own row/.test(s),
    breaks: s => s.replace("Do NOT re-open your own row", "Re-open your own row"),
  },
  {
    id: "guard-runs-every-step",
    where: "heartbeat",
    detail: "the guard must be checked at EVERY step boundary, not once -- a resume can land anywhere",
    test: s => /every\*\* step boundary|at \*\*every\*\* step boundary/.test(s),
    breaks: s => s.replace(/\*\*every\*\* step boundary/g, "the first step boundary"),
  },
];

// Markdown is hard-wrapped at ~95 columns, so a load-bearing phrase can straddle a line break and
// a literal match on it fails for a reason that has nothing to do with the rule. Normalising runs
// of whitespace to one space makes every clause reflow-proof -- found the moment this file first
// ran, on "WENT SILENT", which the runbook wraps mid-phrase.
export const norm = s => s.replace(/\s+/g, " ");

function blocks() {
  const md = fs.readFileSync(RUNBOOK, "utf8");
  return { watchdog: norm(extractWatchdog(md)), heartbeat: norm(extractHeartbeat(md)) };
}

// The shipped runbook must satisfy every clause.
function theShippedRunbookIsClean() {
  const b = blocks();
  assert.ok(b.watchdog.length > 0, "the watchdog block is missing from runner-cycle.md");
  assert.ok(b.heartbeat.length > 0, "the heartbeat block is missing from runner-cycle.md");
  for (const c of CLAUSES) {
    assert.ok(c.test(b[c.where]), `runner-cycle.md lost clause "${c.id}": ${c.detail}`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL: a block that is absent must be reported as a finding, not crash.
function aMissingBlockIsFlagged() {
  assert.strictEqual(extractWatchdog("# a runbook with no watchdog"), "",
    "a missing watchdog block must return '' so the caller reports it");
  assert.strictEqual(extractHeartbeat("# a runbook with no heartbeat"), "",
    "a missing heartbeat block must return '' so the caller reports it");
}

// Per-clause negative control: break exactly one thing, assert exactly that clause fails.
function everyClauseHasTeeth() {
  const b = blocks();
  for (const c of CLAUSES) {
    const mutated = c.breaks(b[c.where]);
    assert.notStrictEqual(mutated, b[c.where],
      `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`);
    assert.ok(!c.test(mutated),
      `clause "${c.id}" still passes after its own control removed the thing it checks -- the check is vacuous`);
  }
}

// META-ASSERTION: prove the control-checking above can actually fail. Without this, a future
// clause whose `breaks` is a no-op would sail through `everyClauseHasTeeth`'s first assert only
// because nobody ever exercised the failure path.
function aVacuousMutationFailsItsOwnControl() {
  const vacuous = { id: "fixture", where: "watchdog", test: () => true, breaks: s => s };
  const b = blocks();
  assert.throws(
    () => {
      const mutated = vacuous.breaks(b.watchdog);
      assert.notStrictEqual(mutated, b.watchdog, "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// The doc and the migration must agree on the callable signature. Cheap, and it is the seam that
// breaks silently if either side is renamed.
function signatureMatchesWhatTheMigrationShipped() {
  const { watchdog } = blocks();
  assert.ok(/SELECT \* FROM public\.stall_watchdog\(/.test(watchdog),
    "the runbook must show the call as SELECT * FROM public.stall_watchdog(...) -- it returns a row set, not a scalar");
  for (const col of ["closed_cycle", "frozen_hours", "last_step", "claims_released", "lease_released"]) {
    assert.ok(watchdog.includes(col),
      `the runbook must name the returned column ${col} so a cycle knows what to put in its notes`);
  }
  assert.ok(/migration `ses194_stall_watchdog`/.test(watchdog),
    "the runbook must name the migration that ships the function body, since the body is not in this repo");
}

function run() {
  theShippedRunbookIsClean();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  signatureMatchesWhatTheMigrationShipped();

  notRun(
    "stall_watchdog() function body",
    "the body ships as migration ses194_stall_watchdog and lives in the database, not this repo; " +
    "this suite reaches Supabase only over PostgREST, which cannot read pg_get_functiondef and " +
    "could reach the function only by INVOKING it, which mutates the live ledger. Behavioural " +
    "evidence is the live QA on the ship card (two fixtures at 30h/26h, a ~2h negative control, " +
    "idempotence, and the resume guard).",
  );
}

selfRun(import.meta.url, run);
export default run;
