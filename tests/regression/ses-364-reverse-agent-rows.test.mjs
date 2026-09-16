// DeepBench v7.0.501 | tests/regression/ses-364-reverse-agent-rows.test.mjs | SES-364 --
// reverse_decision()'s allowlist widens from 7 tables to 14, and TWO GUARDS keep the two rules the
// widening would otherwise have quietly repealed.
//
// WHAT IS BEING PINNED, and why the obvious guard would be the wrong one. The obvious guard asserts
// "skill_profiles is on the allowlist". That passes just as well against a build that merely
// APPENDED seven names -- which is the build both §19v P5 and runner-cycle.md's gate-card clause
// forbid, because a whole-row restore moves EVERY column:
//   * restoring an `agents` row moves `agents.is_active`, and flipping is_active is John's hire
//     card, never automated (§19v P5, .claude/rules/agent-roster-inert.md). AGENT-ROW-AGREED-TICKET
//     licenses the runner to WRITE agent rows and expressly EXEMPTS is_active; an append-only
//     widening would have handed a cycle that exact write, with no card, by a side door, and
//     reported it as an undo.
//   * restoring a `runner_items` row erases a gate-review card, and runner-cycle.md tells every
//     cycle that card "survives a reversal ... the evidence a review happened cannot be erased" --
//     SES-312's succession key, the precondition on every drain declaration.
// So the pure half below is about the two GUARD PREDICATES, and its central assertion proves a
// DIFFERENCE from the append-only build rather than a property both share (the SES-213 lesson, and
// the LOO-013 one: assert WHICH branch fired, not that something happened).
//
// THE ONE THING THAT MUST NOT BE "TIDIED": guard A refuses the is_active transition for a CYCLE and
// lets a NAMED HUMAN actor through. A later editor reading "is_active is John's hire card" as "no
// reversal may ever touch is_active" would remove the human arm -- and then a hire John himself
// wants undone has no undo at all, which is the B23 shape the whole M6 register exists to invert.
// The reverse tidy is just as available: an editor who reads "AGENT-ROW-AGREED-TICKET makes agent
// rows build work" as covering is_active would delete the guard entirely. Both arms are asserted
// below, deliberately, and the asymmetry is the point.
//
// THE DATABASE HALF IS DECLARED NOT-RUN RATHER THAN FAKED, the SES-134 / SES-182e / SES-315 shape:
// the function body ships as migration `ses364_reverse_agent_rows` and lives in the database, and
// this suite reaches Supabase only over PostgREST, which cannot read pg_get_functiondef and cannot
// open a transaction to roll a fixture back. What the credentialed arm CAN do is invoke the REAL
// reverse_decision() on inputs it must REFUSE -- which writes nothing by definition, because all
// three of those guards return before the first INSERT -- so the arm exercises the live mechanism
// without ever exercising the live write. The write paths' evidence is the rolled-back fixture
// declared at the foot of this file, with every arm's counts.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

// THE PRE-CHANGE TREE IS PINNED BY SHA, NEVER BY THE `origin/dev` BRANCH NAME. A file-level control
// that resolves "before" as a moving branch SELF-DESTRUCTS the moment the ship lands on that
// branch: origin/dev then CONTAINS the change, every clause passes on "both" trees, and the control
// reports the ship as un-pinning. That is the live SES-215 defect (v7.0.307). A SHA is immutable.
// If it is unreachable (a shallow clone), the control declares itself not-run rather than passing
// vacuously.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRE_CHANGE_SHA = "34a02ef3aa8ccb2a4388f05b48125ce6edf340ed"; // this ticket's kickoff commit, before the ship
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const LEDGER_REL = "docs/SELFBUILD-RETIREMENT-LEDGER.md";

// Both files are hard-wrapped, so a load-bearing phrase can straddle a line break and a literal
// match that fails on a reflow fails for a reason that has nothing to do with the rule (SES-194).
export const norm = s => s.replace(/\s+/g, " ");

// ---------------------------------------------------------------------------------------------
// THE PURE HALF: the allowlist, and the two guard predicates, shipped versus append-only.
// ---------------------------------------------------------------------------------------------

// The SHIPPED allowlist, read out of pg_get_functiondef at this ship rather than recalled.
export const K_ALLOWED = [
  "backlog_items", "runner_directives", "runner_drain_scope", "runner_settings",
  "governance_rules", "epics", "vision_claims",
  // SES-364's seven. None of these has an `updated_at` column (measured 2026-09-16 from
  // pg_attribute), so every restore of one lands in `restored_unverified`, never `restored`.
  "skill_profiles", "agents", "capabilities", "capability_skill_profiles",
  "agent_capability_assignments", "ai_activity_log", "runner_items",
];

// The PRE-CHANGE allowlist. Kept here ONLY as the negative control -- never used for anything else.
export const K_ALLOWED_BEFORE = [
  "backlog_items", "runner_directives", "runner_drain_scope", "runner_settings",
  "governance_rules", "epics", "vision_claims",
];

// The seven tables AGENT-ROW-AGREED-TICKET's own text enumerates, plus the two SES-364 adds for the
// reasons §4 of the kickoff gives. `agent_capability_assignments` is the one a reader drops when
// they go by the ticket TITLE ("agent rows, the activity log and a retired card") instead of the
// rule's list -- and without it AGT-78's assignment half stays irreversible while its hire half
// does not, which is the worst of both.
export const SES364_ADDED = [
  "skill_profiles", "agents", "capabilities", "capability_skill_profiles",
  "agent_capability_assignments", "ai_activity_log", "runner_items",
];

// The runner's OWN evidence tables, which stay OUT. `runner_items` is deliberately NOT here any
// more: SES-364 moved exactly one table off this list and guard B carries what its absence used to.
export const K_REFUSED_LEDGER = [
  "runner_cycles", "runner_before_images", "runner_decisions", "runner_ladder", "runner_verdicts",
];

// Neither of these tables has an `updated_at` column, so `v_has_upd` is false for all seven and the
// written-since guard is structurally unreachable on them.
export const NO_UPDATED_AT = [...SES364_ADDED];

// GUARD A, reimplemented from the shipped body. Exported so the divergence assertion drives the real
// expression rather than a paraphrase of it.
//   actorCycle : the acting cycle's id, or null for a named human actor
//   prior      : the before-image's row_data, or null for an INSERT image (undo = DELETE)
//   liveActive : agents.is_active as it stands right now, or null when there is no live row
export function guardA({ actorCycle, prior, liveActive }) {
  if (actorCycle === null || actorCycle === undefined) return "restore";  // a named human restores in full
  if (prior === null) return liveActive === true ? "refuse" : "restore";  // delete of a LIVE agent
  const priorActive = prior.is_active === undefined ? null : prior.is_active;
  return priorActive !== liveActive ? "refuse" : "restore";
}

// GUARD B, likewise. Both sides of the kind are read: an INSERT image carries row_data NULL, so
// only the LIVE row knows the kind; and a card whose kind the decision itself rewrote would hide
// behind a live value.
export function guardB({ actorCycle, prior, liveKind, liveCycle }) {
  const priorKind = prior === null ? null : (prior.kind ?? null);
  if (liveKind === "gated_before_build" || priorKind === "gated_before_build") return "refuse";
  if (actorCycle !== null && actorCycle !== undefined && liveCycle === actorCycle) return "refuse";
  return "restore";
}

// The APPEND-ONLY build: the seven names added and nothing else. The negative control.
export const guardAAppendOnly = () => "restore";
export const guardBAppendOnly = () => "restore";

const CYC = "cycle-aaaa";
const OTHER = "cycle-bbbb";

// The closed set of shapes the two builds are compared over. Every row is either a case SES-364 had
// to change or an invariant it must not have disturbed.
export const AGENT_CASES = [
  { id: "cycle-deletes-a-LIVE-agent",        args: { actorCycle: CYC,  prior: null,                 liveActive: true  } },
  { id: "cycle-deletes-an-INACTIVE-agent",   args: { actorCycle: CYC,  prior: null,                 liveActive: false } },
  { id: "cycle-would-flip-true-to-false",    args: { actorCycle: CYC,  prior: { is_active: false }, liveActive: true  } },
  { id: "cycle-would-flip-false-to-true",    args: { actorCycle: CYC,  prior: { is_active: true },  liveActive: false } },
  { id: "cycle-restores-with-flag-unmoved",  args: { actorCycle: CYC,  prior: { is_active: true },  liveActive: true  } },
  { id: "human-flips-true-to-false",         args: { actorCycle: null, prior: { is_active: false }, liveActive: true  } },
  { id: "human-deletes-a-LIVE-agent",        args: { actorCycle: null, prior: null,                 liveActive: true  } },
];

export const ITEM_CASES = [
  { id: "gated-card-in-place",      args: { actorCycle: CYC, prior: { kind: "gated_before_build" }, liveKind: "gated_before_build", liveCycle: OTHER } },
  { id: "gated-card-insert-image",  args: { actorCycle: CYC, prior: null,                           liveKind: "gated_before_build", liveCycle: OTHER } },
  { id: "gated-only-in-the-image",  args: { actorCycle: CYC, prior: { kind: "gated_before_build" }, liveKind: "ship",               liveCycle: OTHER } },
  { id: "ship-card-another-cycle",  args: { actorCycle: CYC, prior: { kind: "ship" },               liveKind: "ship",               liveCycle: OTHER } },
  { id: "ship-card-acting-cycle",   args: { actorCycle: CYC, prior: { kind: "ship" },               liveKind: "ship",               liveCycle: CYC   } },
  { id: "ship-card-human-actor",    args: { actorCycle: null, prior: { kind: "ship" },              liveKind: "ship",               liveCycle: CYC   } },
];

// Returns the ids where the shipped guards and the append-only build disagree, so the assertion can
// name them.
export function guardsDifferOn() {
  return [
    ...AGENT_CASES.filter(c => guardA(c.args) !== guardAAppendOnly(c.args)).map(c => `agents:${c.id}`),
    ...ITEM_CASES.filter(c => guardB(c.args) !== guardBAppendOnly(c.args)).map(c => `runner_items:${c.id}`),
  ];
}

function theAllowlistIsFourteenAndTheLedgerTablesStayOut() {
  assert.strictEqual(K_ALLOWED.length, 14,
    `the allowlist is fourteen tables after SES-364, not ${K_ALLOWED.length}. If a fifteenth ` +
    "arrived, re-derive the §19v P5 argument before widening this list -- a whole-row restore " +
    "moves every column of the table it names");
  assert.strictEqual(new Set(K_ALLOWED).size, 14, "the allowlist carries a duplicate name");
  for (const t of K_ALLOWED_BEFORE) {
    assert.ok(K_ALLOWED.includes(t),
      `SES-364 must not have DROPPED ${t} from the allowlist -- it widens, it does not trade`);
  }
  for (const t of SES364_ADDED) {
    assert.ok(K_ALLOWED.includes(t), `${t} is missing from the allowlist`);
  }
  assert.ok(K_ALLOWED.includes("agent_capability_assignments"),
    "agent_capability_assignments is the table a reader drops when they go by the ticket TITLE " +
    "rather than AGENT-ROW-AGREED-TICKET's own list. Without it AGT-78's ASSIGNMENT half stays " +
    "irreversible while its hire half does not -- a decision that half-undoes is worse than one " +
    "that refuses, because it reports `applied`");
  for (const t of K_REFUSED_LEDGER) {
    assert.ok(!K_ALLOWED.includes(t),
      `${t} is one of the runner's OWN records of a decision. Replaying it rewrites the evidence ` +
      "instead of the effect, and runner_before_images / runner_decisions would have the reversal " +
      "delete its own row");
  }
  assert.ok(!K_ALLOWED_BEFORE.includes("runner_items") && K_ALLOWED.includes("runner_items"),
    "runner_items is the ONE table SES-364 moved off the ledger list, and the move is only safe " +
    "because guard B replaced what its absence used to carry");
  assert.deepStrictEqual([...NO_UPDATED_AT].sort(), [...SES364_ADDED].sort(),
    "all seven new tables lack an updated_at column, so every restore of one is counted " +
    "`restored_unverified` and the outcome is `applied`, never `partial`. A reader who expects " +
    "`restored` to move reads a working undo as a failure");
}

function theTwoGuardsFireOnTheCasesThatMatter() {
  // GUARD A, both directions.
  assert.strictEqual(guardA({ actorCycle: CYC, prior: null, liveActive: true }), "refuse",
    "a CYCLE deleting a LIVE agent is the hire card's decision in reverse, performed with no card");
  assert.strictEqual(guardA({ actorCycle: CYC, prior: { is_active: false }, liveActive: true }), "refuse",
    "a CYCLE restoring is_active false over a live true is the same write wearing an undo's clothes");
  assert.strictEqual(guardA({ actorCycle: CYC, prior: { is_active: true }, liveActive: false }), "refuse",
    "the guard is symmetric: a cycle may not flip is_active ON by restoring either");
  assert.strictEqual(guardA({ actorCycle: CYC, prior: { is_active: true }, liveActive: true }), "restore",
    "THE ARM THAT MAKES THE WIDENING WORTH ANYTHING: an ordinary identity / bio / role restore " +
    "where is_active does not move is exactly what AGENT-ROW-AGREED-TICKET is about, and refusing " +
    "it would leave the licence resting on a promise that is still false");
  assert.strictEqual(guardA({ actorCycle: CYC, prior: null, liveActive: false }), "restore",
    "deleting an ALREADY-INACTIVE agent moves no flag, and inert is where a runner-created agent " +
    "lands (agent-roster-inert.md) -- so undoing that hire is ordinary build work");
  assert.strictEqual(guardA({ actorCycle: null, prior: { is_active: false }, liveActive: true }), "restore",
    "A NAMED HUMAN ACTOR RESTORES IN FULL, and this is the arm a tidy-minded editor deletes. " +
    "p_actor and p_reason are both required and both land on the reversal row -- that IS the " +
    "signature. Refusing every actor would leave a hire John wants undone with no undo at all");

  // GUARD B, both directions.
  assert.strictEqual(guardB({ actorCycle: CYC, prior: { kind: "gated_before_build" }, liveKind: "gated_before_build", liveCycle: OTHER }), "refuse",
    "a gate-review card survives every reversal: it is step 8d's idempotence key and SES-312's " +
    "precondition for a drain declaration");
  assert.strictEqual(guardB({ actorCycle: CYC, prior: null, liveKind: "gated_before_build", liveCycle: OTHER }), "refuse",
    "AN INSERT IMAGE CARRIES row_data NULL, so only the LIVE row knows the kind -- and the undo of " +
    "an insert is a DELETE, i.e. the erasure the runbook forbids. Reading only the image misses " +
    "this case entirely, and it is 20 of the 35 gated images live");
  assert.strictEqual(guardB({ actorCycle: CYC, prior: { kind: "gated_before_build" }, liveKind: "ship", liveCycle: OTHER }), "refuse",
    "and reading only the LIVE row misses a card whose kind the decision itself rewrote");
  assert.strictEqual(guardB({ actorCycle: CYC, prior: { kind: "ship" }, liveKind: "ship", liveCycle: OTHER }), "restore",
    "a kind='ship' card on another cycle RESTORES -- John's Accept/Reverse tap and its " +
    "decision_reason are content a Reverse must reach, which is why the table moved onto the list " +
    "at all. A guard that refused every runner_items row would have changed nothing");
  assert.strictEqual(guardB({ actorCycle: CYC, prior: { kind: "ship" }, liveKind: "ship", liveCycle: CYC }), "refuse",
    "a cycle must not restore its OWN in-flight card: those rows are the record of the work being " +
    "reversed and are still being written this cycle");

  // THE DIVERGENCE, which is what makes the clauses above more than decorative: the shipped guards
  // and the append-only build must disagree on exactly the refusals and NOWHERE ELSE.
  assert.deepStrictEqual(
    guardsDifferOn().sort(),
    [
      "agents:cycle-deletes-a-LIVE-agent",
      "agents:cycle-would-flip-false-to-true",
      "agents:cycle-would-flip-true-to-false",
      "runner_items:gated-card-in-place",
      "runner_items:gated-card-insert-image",
      "runner_items:gated-only-in-the-image",
      "runner_items:ship-card-acting-cycle",
    ].sort(),
    "the shipped guards and a build that MERELY APPENDED SEVEN NAMES must diverge on exactly the " +
    "seven refusals above. Diverging nowhere means this ticket shipped the append-only build and " +
    "silently repealed §19v P5 and the gate-card clause; diverging anywhere else means a restore " +
    "AGENT-ROW-AGREED-TICKET licenses is now being refused, which makes the licence dishonest in " +
    "the other direction");
  assert.ok(guardsDifferOn().length > 0,
    "the control is vacuous unless the append-only build actually differs somewhere");
}

// ---------------------------------------------------------------------------------------------
// THE DOC HALF. A clause earns its place only if REMOVING it would change what a later editor does.
// ---------------------------------------------------------------------------------------------

export const RUNBOOK_CLAUSES = [
  {
    id: "the-gate-card-survives-BECAUSE-of-guard-b",
    detail:
      "THE PAIR THAT MATTERS MOST. runner-cycle.md's succession clause said the gate card survives " +
      "a reversal BECAUSE runner_items is outside the allowlist. SES-364 put it ON the allowlist, " +
      "so that sentence became false at the same ship that kept the promise true by another " +
      "mechanism. Left as it was, a cycle reading it would conclude the table is still excluded -- " +
      "and the next editor of the function would delete guard B as redundant, taking SES-312's " +
      "whole succession key with it. BOTH DIRECTIONS: the stale reason is gone AND the guard is " +
      "named, because deleting the sentence without saying what replaced it leaves a reader " +
      "looking for the rule they remember and finding nothing",
    test: s => !/it is outside `reverse_decision\(\)`'s allowlist by design/.test(norm(s)) &&
               /\*\*GUARD B refuses every `kind = 'gated_before_build'` image by name\*\*/.test(norm(s)) &&
               /the table IS on the allowlist now/.test(norm(s)),
    // ANCHORED ON THE WHOLE BOLDED PHRASE, never on a fragment: runner-cycle.md is 380KB and a
    // short anchor lands on some other paragraph, leaving this clause standing and passing after
    // its own break (SES-158's vacuous-control shape).
    breaks: s => s.replace("**GUARD B refuses every `kind = 'gated_before_build'` image by name**",
                           "the table is off the allowlist by design"),
  },
  {
    id: "guard-b-reads-both-sides-and-the-acting-cycle",
    detail:
      "naming guard B is not enough: an editor re-deriving it from the sentence alone writes the " +
      "image-only form, and 20 of the 35 live gated images carry row_data NULL -- so the " +
      "image-only form erases exactly the cards whose undo is a DELETE. The acting-cycle arm has " +
      "to be written down for the same reason: it is invisible from any single card",
    test: s => /guard B reads BOTH the live row's `kind` and the image's/.test(norm(s)) &&
               /refuses any card belonging to the \*\*acting cycle\*\*/.test(norm(s)),
    // ANCHORED ON THE WHOLE PHRASE, never on the bare "reads BOTH": runner-cycle.md:3143 already
    // says "it reads BOTH streams" of summarizeGateOutput(), so a loose mutation lands THERE and
    // leaves this clause standing -- the guard then passes after its own break and pins nothing.
    // Caught by the teeth check on this file's first run, which is SES-158's meta-check earning
    // its keep before the ship rather than after it.
    breaks: s => s.replace("guard B reads BOTH the live row's", "guard B reads only the live row's"),
  },
  {
    id: "the-allowlist-is-fourteen-and-named",
    detail:
      "the runbook is where a cycle reads what a Reverse will actually restore, and it stated the " +
      "seven-name list as measured fact. A cycle reading the stale list records a Skill-row " +
      "decision as hand-recoverable-only and tells John his undo will not work -- the inverse of " +
      "the defect this ticket fixes, and just as wrong. All fourteen are named because a count " +
      "with no list is not checkable",
    test: s => /\*\*The allowlist, widened 7 → 14 by `SES-364`\*\*/.test(norm(s)) &&
               /`agent_capability_assignments`, `ai_activity_log`, `runner_items`/.test(norm(s)) &&
               /`skill_profiles`, `agents`, `capabilities`, `capability_skill_profiles`/.test(norm(s)),
    breaks: s => s.replace("**The allowlist, widened 7 → 14 by `SES-364`**",
                           "**The allowlist is a closed list of seven tables**"),
  },
  {
    id: "read-restored-unverified-not-restored",
    detail:
      "the measured fact that decides whether a cycle reads a WORKING undo as a failure: none of " +
      "the seven has an updated_at column, so a successful Skill-row Reverse reads " +
      "`restored 0, restored_unverified 1`. Without this sentence the natural check is `restored " +
      "> 0`, which is zero on every one of the tables this ticket added",
    test: s => /READ `restored_unverified`, NOT `restored`, FOR ALL SEVEN NEW TABLES/.test(norm(s)) &&
               /restored 0, restored_unverified 1, refused 0/.test(norm(s)),
    breaks: s => s.replace("READ `restored_unverified`, NOT `restored`, FOR ALL SEVEN NEW TABLES",
                           "READ `restored` FOR ALL SEVEN NEW TABLES"),
  },
  {
    id: "the-outcome-word-is-not-the-proof",
    detail:
      "THE DISCRIMINATOR, written where the next QA author reads it. Measured at this ship on a " +
      "rolled-back fixture: the PRE-change build returned outcome `applied` for a skill-row " +
      "reversal that restored NOTHING (`restored_unverified 0, refused 1`, guardrails still " +
      "edited). So an assertion on the outcome string passes against the broken build, and any " +
      "future QA of this mechanism that reaches for `outcome === 'applied'` is testing nothing",
    test: s => /the outcome word is `applied` either way, so re-read the row/.test(norm(s)),
    breaks: s => s.replace("and the\noutcome word is `applied` either way, so re-read the row",
                           "and the\noutcome word tells you which happened"),
  },
  {
    id: "guard-a-is-stated-with-its-human-arm",
    detail:
      "the runbook has to carry BOTH arms of guard A. Stating only the refusal teaches a reader " +
      "that is_active can never be restored, and the next editor removes the human arm as dead " +
      "code -- leaving a hire John wants undone with no undo. Stating only the licence teaches " +
      "the opposite and the guard goes entirely. The refusal is also the one that must be " +
      "attributable, so the hire card is named",
    test: s => /\*\*GUARD A:\*\* a cycle may not move `agents.is_active` by restoring a row \(still John's hire card, §19v P5\)/.test(norm(s)) &&
               /a \*\*named human\*\* actor \(`p_actor_cycle => null`\) may\./.test(norm(s)),
    breaks: s => s.replace("a **named human** actor\n(`p_actor_cycle => null`) may.",
                           "no actor may."),
  },
  {
    id: "a-guard-refuses-the-row-not-the-reversal",
    detail:
      "without this, the plausible reading of either guard is that it ABORTS the reversal -- and a " +
      "cycle holding a decision with one agent row and nine backlog rows would then decline to " +
      "reverse at all, or worse, re-run it. Both guards refuse the ROW and count it; the " +
      "decision's other images still restore. That is also what makes the counts readable",
    test: s => /Neither guard aborts the reversal — ledger entry 46\./.test(norm(s)),
    breaks: s => s.replace("Neither guard aborts the reversal — ledger entry 46.",
                           "Either guard aborts the whole reversal."),
  },
];

export const LEDGER_CLAUSES = [
  {
    id: "entry-46s-separate-ticket-was-taken",
    detail:
      "entry 46's restore path told its reader, as measured fact, that the Reverse is CARD-ONLY " +
      "for the skill row and that widening the allowlist was a separate ticket deliberately not " +
      "taken. SES-364 took it. A restore path that describes a mechanism the project no longer has " +
      "is the one kind of ledger rot that costs somebody a real recovery: they copy guardrails out " +
      "of row_data by hand instead of calling the function that now does it",
    test: s => /NO LONGER CARD-ONLY — `SES-364` \(`v7.0.501`\) widened the allowlist to fourteen tables/.test(norm(s)),
    breaks: s => s.replace("NO LONGER CARD-ONLY", "STILL CARD-ONLY"),
  },
  {
    id: "the-ledger-carries-the-discriminator-too",
    detail:
      "the ledger entry is where somebody stands when they are about to perform this reversal for " +
      "real, so it is the second place the assert-the-row rule has to live. It also has to name " +
      "restored_unverified: an operator who checks `restored` sees 0 on a Reverse that worked " +
      "perfectly and reaches for the by-hand path anyway",
    test: s => /assert the row's `guardrails` value, not the outcome/.test(norm(s)) &&
               /\*\*`restored_unverified 1, restored 0`\*\*/.test(norm(s)),
    breaks: s => s.replace("assert the row's `guardrails` value, not the outcome",
                           "assert the outcome word"),
  },
  {
    id: "the-ledger-names-the-two-guards-as-bounds",
    detail:
      "a reader of this entry alone would otherwise conclude the widening was unconditional and " +
      "record an is_active flip or a gate-card erasure as auto-reversible. The bounds belong " +
      "wherever the widening is announced, not only in the runbook",
    test: s => /\*\*Guard A:\*\* an automated cycle may not move `agents.is_active` by restoring a row \(still John's hire card/.test(norm(s)) &&
               /A \*\*named human\*\* actor \(`p_actor_cycle => null`\) restores it in full/.test(norm(s)) &&
               /\*\*Guard B:\*\* a `gated_before_build` `runner_items` card is still refused/.test(norm(s)) &&
               /\*\*Neither guard aborts the reversal: they refuse the row and the decision's other images still restore\*\*/.test(norm(s)),
    breaks: s => s.replace("**Guard A:** an\n  automated cycle may not move `agents.is_active` by restoring a row",
                           "**Guard A:** any actor may move `agents.is_active` by restoring a row"),
  },
];

function readRel(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function theDocsCarryTheChange() {
  const runbook = readRel(RUNBOOK_REL);
  for (const c of RUNBOOK_CLAUSES) assert.ok(c.test(runbook), `${RUNBOOK_REL}: ${c.id} -- ${c.detail}`);
  const ledger = readRel(LEDGER_REL);
  for (const c of LEDGER_CLAUSES) assert.ok(c.test(ledger), `${LEDGER_REL}: ${c.id} -- ${c.detail}`);
}

// SES-158's vacuity meta-check: a clause that still passes after its own mutation pins nothing.
function everyClauseHasTeeth() {
  for (const [rel, clauses] of [[RUNBOOK_REL, RUNBOOK_CLAUSES], [LEDGER_REL, LEDGER_CLAUSES]]) {
    const src = readRel(rel);
    for (const c of clauses) {
      const broken = c.breaks(src);
      assert.notStrictEqual(broken, src,
        `clause "${c.id}"'s breaks() returned its input unchanged -- the teeth check below would ` +
        "pass vacuously, which is a control that controls nothing");
      assert.ok(!c.test(broken), `${rel}: ${c.id} is VACUOUS -- it still passes after its own breaks() mutation`);
    }
  }
}

// FILE-LEVEL NEGATIVE CONTROL: every clause must FAIL on the pre-change tree. A guard that passes on
// both trees pins nothing.
function theClausesFailOnThePreChangeTree() {
  for (const [rel, clauses] of [[RUNBOOK_REL, RUNBOOK_CLAUSES], [LEDGER_REL, LEDGER_CLAUSES]]) {
    let before;
    try {
      before = execFileSync("git", ["show", `${PRE_CHANGE_SHA}:${rel}`], {
        cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      notRun(
        `the file-level negative control for ${rel}`,
        `commit ${PRE_CHANGE_SHA} is unreachable in this checkout (a shallow clone), so the ` +
        "pre-change file could not be read. The clauses above still ran against the shipped tree; " +
        "what is unproven is that they FAIL on the tree before this ship. Deepen the clone and re-run.",
      );
      continue;
    }
    const passing = clauses.filter(c => c.test(before)).map(c => c.id);
    assert.deepStrictEqual(passing, [],
      `these ${rel} clauses pass on the PRE-CHANGE tree and therefore pin nothing: ${passing.join(", ")}`);
  }
}

// ---------------------------------------------------------------------------------------------
// THE LIVE HALF -- Supabase over PostgREST. It invokes the REAL function, but only on inputs the
// guards must REFUSE, so it proves the deployed mechanism while writing nothing. The
// write-free-ness is ASSERTED by side effect below rather than assumed.
// ---------------------------------------------------------------------------------------------

const base = url => url.replace(/\/+$/, "");
const NIL = "00000000-0000-0000-0000-000000000000";

// reverse_decision()'s response columns. The SES-316 set, unchanged by this ship -- which is the
// point of asserting it here: SES-364 retyped the whole body to add the allowlist entries and the
// two guards, so a missing column is a transcription loss rather than a contract change.
export const REVERSE_OUT_COLUMNS = [
  "outcome", "restored", "restored_unverified", "refused",
  "refused_written_since", "demoted", "reversal_id", "reason",
];

async function raw(url, key, pathAndQuery, init) {
  return fetch(`${base(url)}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function countOf(url, key, q) {
  const res = await fetch(`${base(url)}/rest/v1/${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) throw new Error(`${q} returned HTTP ${res.status}`);
  return Number((res.headers.get("content-range") || "/0").split("/")[1]);
}

async function theRpcIsReachableAndFailsClosed() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arms: reverse_decision() resolvable at its UNCHANGED four-name identity list with " +
        "a misspelled-argument control (the second-overload detector), its three fail-closed " +
        "guards each pinned by the message it returns, the eight SES-316 response columns, and the " +
        "write-free-ness of all of it asserted by side effect against four ledger tables",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The pure and doc arms above still " +
        "graded the allowlist, both guard predicates and all ten doc clauses against the " +
        "committed tree. Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const before = {
    decisions: await countOf(url, key, "runner_decisions?select=id"),
    images: await countOf(url, key, "runner_before_images?select=id"),
    items: await countOf(url, key, "runner_items?select=id"),
    agents: await countOf(url, key, "agents?select=id"),
  };

  const post = (name, body) => raw(url, key, `rpc/${name}`, { method: "POST", body: JSON.stringify(body) });

  // 1. THE THREE-ARGUMENT CALL STILL RESOLVES. SES-364 replaced the body with CREATE OR REPLACE on
  //    the EXACT SES-316 identity list, so p_actor_cycle is still defaulted and a three-argument
  //    call must answer 200. A retyped or extended list would have created a SECOND overload, and
  //    PostgREST answers an ambiguous call with an EMPTY result rather than an error -- the failure
  //    mode .claude/rules/supabase-function-signature.md exists for (DAT-12, 0 chunks for 90s).
  const blankActor = await post("reverse_decision", {
    p_decision: NIL, p_actor: "", p_reason: "ses-364 read-only signature probe",
  });
  assert.strictEqual(blankActor.status, 200,
    `rpc/reverse_decision(p_decision, p_actor, p_reason) returned HTTP ${blankActor.status} -- the ` +
    "three-argument call (p_actor_cycle defaulted) must still resolve after SES-364's replace");
  const blankActorRows = await blankActor.json();
  assert.ok(Array.isArray(blankActorRows) && blankActorRows.length === 1,
    `the blank-actor probe returned ${JSON.stringify(blankActorRows).slice(0, 200)} -- an EMPTY ` +
    "array here is the second-overload signature, not a passing guard");
  assert.ok(String(blankActorRows[0].reason || "").includes("p_actor is required"),
    `the probe did not take its blank-actor guard: ${JSON.stringify(blankActorRows[0]).slice(0, 300)}. ` +
    "That guard is the FIRST statement in the body, which is what makes this arm read-only");

  // 2. THE EIGHT RESPONSE COLUMNS, on the row that guard actually returned.
  assert.deepStrictEqual(Object.keys(blankActorRows[0]).sort(), [...REVERSE_OUT_COLUMNS].sort(),
    "reverse_decision()'s response columns are not the SES-316 set. SES-364 retyped the whole body, " +
    "so a missing column here is a transcription loss, not a contract change -- and " +
    "restored_unverified is the one every reader of an agent-row reversal depends on, because all " +
    "seven new tables land there and never in `restored`");

  // 3. THE CONTROL for clause 1: one misspelled argument name must be UNRESOLVABLE. Without it,
  //    clause 1 proves only that the request was answered.
  const bad = await post("reverse_decision", {
    p_decision: NIL, p_actor: "probe", p_reason: "probe", p_actor_cycl: NIL,
  });
  const badBody = JSON.stringify(await bad.json().catch(() => ""));
  assert.ok(!bad.ok && /PGRST202|Could not find the function/i.test(badBody),
    `the control call with p_actor_cycl instead of p_actor_cycle was answered ${bad.status} ` +
    `${badBody} -- it must be unresolvable. If PostgREST accepts it, a SECOND overload exists and ` +
    "every caller that omits a parameter is silently getting an empty result " +
    "(.claude/rules/supabase-function-signature.md)");

  // 4. THE BLANK-REASON GUARD, the second statement in the body.
  const blankReason = await post("reverse_decision", {
    p_decision: NIL, p_actor: "ses-364 probe", p_reason: "   ",
  });
  const blankReasonRows = await blankReason.json();
  assert.ok(String(blankReasonRows?.[0]?.reason || "").includes("p_reason is required"),
    `a blank p_reason was answered ${JSON.stringify(blankReasonRows).slice(0, 300)} -- M6-06 ` +
    "promises the reasoning is recorded, not just the act");

  // 5. THE UNKNOWN-DECISION GUARD, the deepest of the three that still precedes the first INSERT.
  //    Reaching it proves all four argument names bound AND that the restore loop was never entered.
  const unknown = await post("reverse_decision", {
    p_decision: NIL, p_actor: "ses-364 probe", p_reason: "ses-364 read-only probe", p_actor_cycle: null,
  });
  const unknownRows = await unknown.json();
  assert.ok(String(unknownRows?.[0]?.reason || "").includes("no runner_decisions row with that id"),
    `the unknown-decision probe did not take its own guard: ${JSON.stringify(unknownRows).slice(0, 300)}. ` +
    "This arm is only write-free BECAUSE that is the path it takes -- the reversal row is INSERTed " +
    "below it. If the guard order changed, re-derive the write-free path before re-pointing this " +
    "assertion");
  assert.strictEqual(unknownRows[0].outcome, "refused",
    "an unknown decision must report `refused`, never `applied` -- reporting applied for a " +
    "reversal that did nothing is the exact class of defect SES-316 and SES-364 both fix");

  // 6. WRITE-FREE, asserted by side effect (pg_proc is unreachable from here). Four calls above;
  //    not one of these tables may have moved by a single row. `agents` and `runner_items` are in
  //    this set on purpose -- they are the two tables SES-364 newly lets the function WRITE.
  const after = {
    decisions: await countOf(url, key, "runner_decisions?select=id"),
    images: await countOf(url, key, "runner_before_images?select=id"),
    items: await countOf(url, key, "runner_items?select=id"),
    agents: await countOf(url, key, "agents?select=id"),
  };
  assert.deepStrictEqual(after, before,
    "the guard-path probes MOVED THE LEDGER. reverse_decision() is a writer, and these arms are " +
    "only permitted because each probe returns before the first write -- if that is no longer " +
    `true, delete the offending arm rather than accepting the drift. before=${JSON.stringify(before)} ` +
    `after=${JSON.stringify(after)}`);
}

// ---------------------------------------------------------------------------------------------

export default async function run() {
  theAllowlistIsFourteenAndTheLedgerTablesStayOut();
  theTwoGuardsFireOnTheCasesThatMatter();
  theDocsCarryTheChange();
  everyClauseHasTeeth();
  theClausesFailOnThePreChangeTree();
  await theRpcIsReachableAndFailsClosed();

  notRun(
    "reverse_decision()'s WRITE paths -- the restore loop over all seven new tables, both guards " +
      "firing against live rows, and every pg_proc fact (overload count, identity argument list, " +
      "the deployed body's allowlist)",
    "reverse_decision() is a WRITER: it inserts the decision ledger and its before-images, rewrites " +
      "board rows and moves runner_ladder. A permanent regression test must never do that on the " +
      "live board (the SES-196 / SES-218 / SES-275 refusal), and this suite reaches Supabase only " +
      "over PostgREST, which cannot read pg_proc and cannot open a transaction to roll a fixture " +
      "back. MEASURED AT THIS SHIP INSTEAD, live over the MCP, inside deliberately failing DO " +
      "blocks with every fixture rolled back, and asserted on THE FIXTURE ROW'S OWN COLUMN VALUE " +
      "rather than on the outcome word. pg_proc at this ship, asserted by the migration's own " +
      "trailing DO block rather than by its success flag, and re-read afterwards: EXACTLY 1 " +
      "overload of public.reverse_decision, identity argument list still " +
      "'p_decision uuid, p_actor text, p_reason text, p_actor_cycle uuid' (unchanged, so no DROP " +
      "was owed), and the deployed body carrying both guards. " +
      "ARM 1, THE DISCRIMINATOR, one fixture run twice: on the SHIPPED build a skill_profiles row " +
      "imaged under a decision, guardrails edited to [\"EDITED BY THE DECISION\"], reversed by a " +
      "cycle -> outcome 'applied', restored 0, restored_unverified 1, refused 0, " +
      "refused_written_since 0, and guardrails BACK to [\"ORIGINAL GUARDRAIL\"]. The SAME fixture " +
      "against the PRE-CHANGE body (restored inside the doomed transaction from " +
      "runner_migration_downs.down_sql) -> outcome 'applied' AS WELL, restored_unverified 0, " +
      "refused 1, and guardrails STILL [\"EDITED BY THE DECISION\"]. Both halves say 'applied'; " +
      "only the row tells them apart, which is why every assertion here is on the row. " +
      "ARM 2, agents.is_active: an agents fixture imaged is_active false with the live row true, " +
      "reversed WITH p_actor_cycle set -> refused 1, restored_unverified 0, is_active STILL true, " +
      "and the reason naming 'John's hire card (Section 19v P5, .claude/rules/agent-roster-inert.md)'. " +
      "The identical fixture reversed with p_actor_cycle => null -> restored_unverified 1, refused " +
      "0, is_active back to false. " +
      "ARM 3, a hire: four agent-row tables (agents, capabilities, capability_skill_profiles, " +
      "agent_capability_assignments) INSERTed under one decision with row_data NULL. With the agent " +
      "INACTIVE, reversed as a cycle -> restored_unverified 4, refused 0, all four rows gone. With " +
      "the agent ACTIVE -> restored_unverified 3, refused 1, the three link rows gone and the " +
      "agents row STILL PRESENT, guard A naming it. " +
      "ARM 4, runner_items: a kind='ship' card on another cycle -> restored_unverified 1, refused " +
      "0, decision/decision_reason back to accept/'ORIGINAL REASON'; a kind='gated_before_build' " +
      "card -> refused 1, restored_unverified 0, the row STILL rework/'EDITED BY THE DECISION' and " +
      "the reason citing step 8d's idempotence key and SES-312; a kind='ship' card ON THE ACTING " +
      "CYCLE -> refused 1, unchanged. " +
      "ARM 5, ai_activity_log: a two-row fixture (feature and caller_ip both edited) -> " +
      "restored_unverified 2, refused 0, both rows' feature and caller_ip restored, and the " +
      "GENERATED caller_ip_masked recomputed from the restored ip (xxx.xx.113.7 / xxx.xx.113.8) " +
      "rather than written -- the attgenerated filter, which would otherwise raise 428C9. The eight " +
      "response columns were read off pg_proc.proargnames in the same block and matched. " +
      "ZERO RESIDUE on re-read after rollback, every count identical to the pre-test read: " +
      "runner_decisions 783, runner_before_images 7076, runner_items 397, runner_directives 100, " +
      "runner_cycles 501, agents 30 (30 active), skill_profiles 112, capabilities 28, " +
      "capability_skill_profiles 121, agent_capability_assignments 28, ai_activity_log 41724, and 0 " +
      "rows matching any ZZZ-364 / ses364-fx fixture name.",
  );
}

selfRun(import.meta.url, run);
