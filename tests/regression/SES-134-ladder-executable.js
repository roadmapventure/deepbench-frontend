// DeepBench v7.0.315 | tests/regression/SES-134-ladder-executable.js | SES-134 -- the trust-ladder
// rule has ONE executable home, and the runbook points at the call instead of restating the
// arithmetic.
//
// WHAT IS BEING PINNED, and why the obvious guard would be the wrong one. It is easy to write a test
// that asserts "the ladder function exists". That passes just as well against the build this ticket
// forbids -- one where the runbook ALSO keeps a hand-applied copy of the arithmetic, which is how
// the rule got applied wrongly in the first place (a cycle reset the streak on promotion, which is
// not the rule). So the clauses below are about the rule having exactly ONE home: the call is named,
// the promotion test is stated as a modulo, and the retired "apply it by hand" paragraph is gone.
//
// THE PROMOTION TEST IS THE HEART OF IT. `streak % 5 = 0` and `streak >= 5` agree on the first
// promotion and diverge forever after: at a streak parked at 5, the threshold form promotes on every
// later Accept -- a rung per tap, which SES-107 records as the opposite failure and equally not what
// John asked for. `promotionDiffersFromThreshold()` below is a PURE reimplementation of both forms
// applied to the same streaks, asserted to DISAGREE, so this file proves a DIFFERENCE from the
// retired behaviour rather than a property both share (the SES-213 lesson).
//
// THE DATABASE HALF IS DECLARED NOT-RUN RATHER THAN FAKED. The function body ships as a migration
// and lives in the database; this suite reaches Supabase only over PostgREST, which cannot read
// pg_get_functiondef, and INVOKING apply_ladder_decision() would write the real ladder. The
// behavioural evidence is the seven-arm rolled-back fixture on the ship card, whose negative control
// is the retired threshold form losing on the same fixture.
//
// Credential-free and network-free: every clause reads source text.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

// THE PRE-CHANGE TREE IS PINNED BY SHA, NEVER BY THE `origin/dev` BRANCH NAME, and that is this
// guard's most important line. A file-level control that resolves "before" as a moving branch
// SELF-DESTRUCTS THE MOMENT THE SHIP LANDS ON THAT BRANCH: origin/dev then CONTAINS the change, so
// every clause passes on "both" trees and the control reports the ship as un-pinning. That is not a
// hypothetical -- it is exactly the SES-215 defect (v7.0.307: "the guard's negative control read
// run-all.js from origin/dev, which on CI IS the commit under test, so the 'retired' control was
// the shipped fix"), and this file reproduced it live: the verdict on the NEXT ticket came back
// BLOCK with all 8 clauses reported as passing on the pre-change tree, minutes after the push.
// A SHA is immutable, so it cannot rot the same way. If the SHA is unreachable (a shallow clone),
// the control declares itself not-run rather than passing vacuously.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRE_CHANGE_SHA = "a01ad5b2829be3b9c475cb5e5c9478564949df37";   // origin/dev immediately before SES-134 (v7.0.315) landed
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");

// The runbook is hard-wrapped, so a load-bearing phrase can straddle a line break and a literal
// match then fails on a reflow for a reason that has nothing to do with the rule (SES-194). Used
// only by the clauses added at SES-315 (b); the older clauses keep the whitespace-tolerant regexes
// they already had, deliberately unchanged.
export const norm = s => s.replace(/\s+/g, " ");

// ---- the pure half -----------------------------------------------------------------------------

// The SHIPPED rule. Exported so the divergence assertion below drives the real expression.
export function promotes(streakAfter) {
  return streakAfter % 5 === 0;
}

// The RETIRED rule, kept here ONLY as the negative control. Never call this for anything else.
export function promotesRetiredThreshold(streakAfter) {
  return streakAfter >= 5;
}

// The two forms must DISAGREE on a real streak, or the modulo clause is decorative. Returns the
// streaks where they differ over a window, so the assertion can name them.
export function promotionDiffersFromThreshold(maxStreak = 20) {
  const out = [];
  for (let s = 1; s <= maxStreak; s++) {
    if (promotes(s) !== promotesRetiredThreshold(s)) out.push(s);
  }
  return out;
}

// A retired claim may appear as a QUOTATION (so the correction is legible) but never as a live
// assertion. Every occurrence must sit close behind the words that mark it as history. Exported so
// the distinction is testable rather than buried in a regex.
export const RETIRED_CLAIM = "John's call, filed as a question, not done here";
export function retiredClaimIsQuotedNotLive(src, window = 400) {
  let i = src.indexOf(RETIRED_CLAIM);
  while (i >= 0) {
    const before = src.slice(Math.max(0, i - window), i);
    if (!/used to read|used to say/i.test(before)) return false;   // a LIVE claim
    i = src.indexOf(RETIRED_CLAIM, i + 1);
  }
  return true;
}

// ---- clauses -----------------------------------------------------------------------------------
export const CLAUSES = [
  {
    id: "runbook-names-the-call",
    detail:
      "step 2 must tell a cycle to call public.apply_ladder_decision(), because a rule each cycle " +
      "applies by hand is the rule that got applied wrongly -- AND, since SES-315 (v7.0.405), the " +
      "call must not stand there unannotated. TIGHTENED RATHER THAN LEFT ALONE, with its control " +
      "unchanged so this half still has teeth: the bare form passed just as well against the " +
      "runbook SES-315 forbids, one where the call is named and the page still reads as though an " +
      "Accept moved the ladder. A cycle finding the call and no annotation does exactly what the " +
      "pre-SES-315 file told it to do, which is count a tap the migration has already made inert.",
    test: s => /SELECT \* FROM public\.apply_ladder_decision\(/.test(s) &&
               /RETIRED AS A LADDER INPUT FOR AN ACCEPT, AND IS NOT RETIRED AS A FUNCTION/.test(s),
    breaks: s => s.replace("SELECT * FROM public.apply_ladder_decision(", "UPDATE public.runner_ladder SET ("),
  },
  {
    // FEATURE: SES-315 (b) -- the annotation half gets its OWN clause and its own mutation. Folding
    // it into the clause above would have left one of the two halves without a control, because
    // that clause's breaks() mutates the call and the vacuity meta-check is satisfied by either.
    id: "the-accept-branch-is-annotated-inert-not-deleted",
    detail:
      "the runbook must say, at the call site, that the `accept` branch is retired as a LADDER " +
      "INPUT and that the FUNCTION is not retired -- and it must name what survived. This is the " +
      "clause that stops the tempting cleanup: a later editor who reads 'Accept is not an input' " +
      "as 'this function is dead' and deletes the rest removes the ONLY demote a legacy ship card " +
      "has, and M6-07's whole safety measure is that a reversal always costs a rung ('autonomy is " +
      "elastic, never ratcheted'). The inert-but-still-stamping half matters for the same reason " +
      "the ladder is idempotent at all: an unstamped card is one a re-run or a second harvesting " +
      "peer can still count.",
    test: s => /RETIRED AS A LADDER INPUT FOR AN ACCEPT, AND IS NOT RETIRED AS A FUNCTION/.test(s) &&
               /still\s+stamps `ladder_applied_at`/.test(norm(s)) &&
               /`reverse` branch keeps its demote in full/.test(norm(s)),
    // The mutation is a REGEX, never a literal with a `\n` in it: this worktree is CRLF and git
    // stores LF, so a literal newline in a mutation is a no-op on exactly one of the two and the
    // teeth check then passes vacuously on the other. Same reason the tests never trust a local
    // green (the tripwire's own CRLF false-green, docs/runbooks/session-hygiene.md).
    breaks: s => s.replace(/still\s+stamps `ladder_applied_at`/, "no longer stamps anything"),
  },
  {
    // FEATURE: SES-315 (b) -- the Accept->streak arithmetic keeps its words and loses its trigger.
    id: "the-accept-streak-arithmetic-carries-its-supersession",
    detail:
      "SES-107's arithmetic (streak % 5, no reset, forward only) is LIVE and this ship did not " +
      "touch it -- it moved to ladder_apply_signal(), driven by verdict_ladder_signal() at 7a and " +
      "sweep_decision_windows() at the tail. What M6-07 retired is the ACCEPT as the input. Those " +
      "two facts sit in the same paragraphs, so the runbook has to hold both at once: an " +
      "annotation that read 'the streak rule is retired' would be as wrong as no annotation at " +
      "all, and either way the next cycle re-derives the rule. The clause therefore requires the " +
      "supersession vocabulary AND the surviving-arithmetic sentence together.",
    test: s => /the \*\*Accept\*\* that used to trigger it is \*\*retired\*\* as a\s+ladder input/.test(norm(s)) &&
               /ladder_apply_signal\(\)/.test(s) &&
               /counts one delivery twice/.test(norm(s)),
    breaks: s => s.replace("is **retired** as a", "is **still** a"),
  },
  {
    id: "the-hand-applied-claim-survives-only-as-a-quotation",
    detail:
      "the retired bullet said making the ladder executable was 'John's call, filed as a question, " +
      "not done here'. He answered yes and it is built, so that sentence may survive ONLY as a " +
      "quoted record of what the file used to say -- never as a live claim, which would be a doc " +
      "asserting a claim and its own retraction (SES-208's class). THE CLAUSE IS WRITTEN THIS WAY " +
      "BECAUSE A BARE ABSENCE TEST WAS WRONG AND FAILED ON ITS FIRST RUN: this ship deliberately " +
      "quotes the retired sentence, so absence would have forced the correction to be deleted. Same " +
      "shape as SES-104's meta-check catching a clause that matched its own ship's rationale prose.",
    test: s => retiredClaimIsQuotedNotLive(s),
    breaks: s => s.replace(
      "**THE RULE IS EXECUTABLE NOW",
      "The ladder is applied by hand; it is **John's call, filed as a question, not done here**. " +
      "**THE RULE IS EXECUTABLE NOW"),
  },
  {
    id: "promotion-is-a-modulo-never-a-threshold",
    // PRESERVED INVARIANT, not new in this ship: SES-107 already wrote this line, and this ticket
    // must not disturb it. Named rather than counted as new -- the file-level control below would
    // otherwise report it as "passes on both trees", which is true and is the point.
    preserved: true,
    detail:
      "the promotion test must be stated as `streak % 5 = 0`. Written as `>= 5` a streak parked at " +
      "5 promotes on every later Accept -- a rung per tap forever (SES-107's runaway)",
    test: s => /streak % 5 = 0/.test(s) && !/promotion\s*⇔\s*streak >= 5/.test(s),
    breaks: s => s.split("streak % 5 = 0").join("streak >= 5"),
  },
  {
    id: "the-streak-is-not-reset-on-promotion",
    // PRESERVED INVARIANT, same reason: John settled it at SES-107 and this ship inherits it.
    preserved: true,
    detail:
      "John answered q-ladder-streak-reset 'no'. The runbook must keep SES-107's canonical line, " +
      "because the function and the prose have to agree on it. ANCHORED ON THAT ONE LINE rather " +
      "than on a loose /not reset/: the loose form matched this ship's own stamp and survived its " +
      "own mutation, which the SES-158 meta-check caught before the ship",
    test: s => /after promotion:\s+streak keeps its value/.test(s),
    breaks: s => s.replace(/(after promotion:\s+)streak keeps its value/, "$1streak returns to 0"),
  },
  {
    id: "b34-gated-card-touches-neither-rung-nor-streak",
    detail:
      "a gated_before_build card authorises one build and is never a rating -- paying the runner " +
      "for asking permission is the one behaviour that must always be free (rule B34)",
    // Whitespace-tolerant on purpose: the runbook wraps this row across a line, and a clause that
    // breaks on a reflow is a clause that fails for the wrong reason.
    test: s => /`gated_before_build` card →\s+\*\*nothing\*\*\s+\(B34\)/.test(s),
    breaks: s => s.replace(/(`gated_before_build` card →\s+)\*\*nothing\*\*(\s+\(B34\))/,
                           "$1**`streak + 1`**$2"),
  },
  {
    id: "idempotence-is-structural",
    detail:
      "runner_items.ladder_applied_at must be named as the guard. Without it a re-run or two peers " +
      "harvesting one tap double-count a streak, and a double-counted streak manufactures a promotion",
    test: s => /runner_items\.ladder_applied_at/.test(s) && /idempotent by construction/.test(s),
    breaks: s => s.split("runner_items.ladder_applied_at").join("nothing in particular"),
  },
  {
    id: "work-class-comes-from-the-digit",
    detail:
      "'P9 - Bug Fixes · FLAGGED' is a different string and the same class -- matching the legend " +
      "strings by equality silently drops every suffixed ticket (recompute_backlog_queue()'s lesson)",
    test: s => /\*\*digit\*\*, never the string/.test(s),
    breaks: s => s.replace("**digit**, never the string", "string"),
  },
  {
    id: "the-stale-grep-is-corrected-not-repeated",
    detail:
      "the ticket claims `grep -rl runner_ladder --include=*.js` returns nothing; it returns two " +
      "files today and both only READ. A doc that repeats a measurement it did not take is the " +
      "verify-never-assert rule broken in place",
    // Anchored on the BODY's bolded form, not the loose phrase: this ship's stamp says the same
    // thing in different words, so a loose match survived its own mutation (SES-158 caught it).
    test: s => /\*\*both only read\*\*\s+it/.test(s),
    breaks: s => s.replace(/\*\*both only read\*\*(\s+)it/, "**nothing reads**$1it"),
  },
];

// ---- runner --------------------------------------------------------------------------------------
export default async function run() {
  const src = fs.readFileSync(RUNBOOK, "utf8");

  for (const c of CLAUSES) {
    assert.ok(c.test(src), `${c.id} -- ${c.detail}`);
  }

  // SES-158's vacuity meta-check: a clause that still passes after its own mutation pins nothing.
  for (const c of CLAUSES) {
    assert.ok(
      !c.test(c.breaks(src)),
      `${c.id} is VACUOUS -- it still passes after its own breaks() mutation`
    );
  }

  // THE DIVERGENCE ASSERTION. The shipped rule and the retired threshold must disagree on real
  // streaks, or the modulo clause above is decorative.
  const diffs = promotionDiffersFromThreshold(20);
  assert.ok(
    diffs.length > 0,
    "the modulo and threshold forms never disagree over streaks 1..20 -- this guard is not discriminating"
  );
  assert.deepStrictEqual(
    diffs, [6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19],
    "the two forms must diverge on every streak past 5 that is not a multiple of 5 -- that divergence " +
    "IS the runaway SES-107 records (a rung per tap once the streak is parked at 5)"
  );
  // And they must AGREE on the first promotion, which is why the defect was invisible for so long.
  assert.strictEqual(promotes(5), promotesRetiredThreshold(5),
    "both forms promote at streak 5 -- if they differed here the bug would have been obvious");

  // ---- FILE-LEVEL NEGATIVE CONTROL -------------------------------------------------------------
  let before;
  try {
    before = execFileSync("git", ["show", `${PRE_CHANGE_SHA}:docs/runbooks/runner-cycle.md`], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    notRun(
      "file-level negative control",
      `commit ${PRE_CHANGE_SHA} is not reachable in this checkout (a shallow clone), so the ` +
      "pre-change runbook could not be read. Deepen the clone and re-run to exercise it."
    );
  }

  if (before) {
    // Only the NEW clauses must fail on the pre-change tree. The two marked `preserved` are
    // SES-107 invariants this ship inherits and must not disturb, so they pass on both trees BY
    // DESIGN -- named here rather than quietly counted, which is the SES-181b precedent.
    const isNew = c => !c.preserved;
    const passedOnOldTree = CLAUSES.filter(isNew).filter(c => c.test(before)).map(c => c.id);
    assert.deepStrictEqual(
      passedOnOldTree, [],
      `these NEW clauses ALSO pass against the pinned pre-change runbook, so they do not pin ` +
      `this ship: ${passedOnOldTree.join(", ")}`
    );
    // And the control must have teeth: if nothing failed on the old tree it is not discriminating.
    const failedOnOldTree = CLAUSES.filter(isNew).filter(c => !c.test(before)).length;
    assert.ok(
      failedOnOldTree >= 5,
      `only ${failedOnOldTree} new clauses fail on the pre-change runbook -- the file-level ` +
      `control is not discriminating enough to prove this ship changed anything`
    );
    // The preserved ones must genuinely hold on BOTH trees, or they are mislabelled.
    for (const c of CLAUSES.filter(c => c.preserved)) {
      assert.ok(c.test(before),
        `${c.id} is marked preserved but does NOT hold on origin/dev -- it is a new clause ` +
        `mislabelled, which would hide the fact that this ship introduced it`);
    }
  }

  notRun(
    "apply_ladder_decision()'s own body and its write path",
    "the function ships as migration ses134_ladder_executable and lives in the database, not this " +
    "repo; this suite reaches Supabase only over PostgREST, which cannot read pg_get_functiondef, " +
    "and invoking the function would write the real runner_ladder. Behavioural evidence is the " +
    "seven-arm rolled-back fixture on the ship card: accept 1/2->1/3 unpromoted, the 5th accept " +
    "1/4->2/5 promoted with the streak NOT reset, the retired >=5 control differing at streak 5, " +
    "reverse 3/7->2/0, a gated card leaving the ladder untouched (B34), rework unchanged, and a " +
    "second call reporting 'already counted' -- ladder byte-identical after rollback."
  );
}

selfRun(import.meta.url, run);
