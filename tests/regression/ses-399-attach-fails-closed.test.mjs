// DeepBench v7.0.502 | tests/regression/ses-399-attach-fails-closed.test.mjs | SES-399 --
// attach_before_images() refuses an image reverse_decision() cannot restore, and refuses the WHOLE
// batch when it does.
//
// WHAT IS BEING PINNED. docs/ARCHITECTURE.md §19v: "every Automated-mode write records the prior row
// state first; Reverse restores it exactly. No before-image logged → the write does not happen."
// Attaching an image whose table reverse_decision() will not replay writes a reversal HANDLE -- the
// one a session pastes into its close-out note as "reversible until <expires_at>" -- that cannot
// keep that promise. Measured on the deployed database at this ship, not recalled: the pre-change
// attach_before_images(uuid, uuid[]) checked only that p_decision EXISTS and set decision_id on any
// image whatever its table_name.
//
// THE OBVIOUS TEST IS THE WRONG ONE, and both halves of why are asserted below.
//   * "a runner_ladder image is refused" passes just as well against a build that SKIPS the bad row
//     and quietly attaches the good ones. That build is worse than no guard: it hands you a
//     decision whose undo set omits rows and REPORTS a count, which is §19v's defect one level
//     down, wearing a success number. So the central pure assertion is on the WRITTEN COUNT -- 0,
//     never 1 -- and the skip-the-bad-row build is carried below as a named straw man that must
//     diverge from the shipped one (the LOO-013 lesson: assert WHICH branch fired).
//   * the mirror tidy is just as available and costs more: extending the guard to
//     record_ship_decision()'s bulk sweep. That sweep adopts the cycle's whole image set through
//     its own UPDATE ... WHERE cycle_id = ... AND decision_id IS NULL, and adopting the ledger rows
//     is INTENDED -- its body says so in as many words. Measured at this ship: 43 live decisions
//     carry at least one image outside the fourteen and 39 of them are kind='ship', so a blanket
//     guard would refuse nearly every ship. The scope is asserted as a closed set, in both
//     directions, for exactly that reason.
//
// THE DATABASE HALF IS DECLARED NOT-RUN RATHER THAN FAKED, the SES-134 / SES-315 / SES-364 shape:
// attach_before_images() is a WRITER and this suite reaches Supabase only over PostgREST, which
// cannot read pg_proc and cannot open a transaction to roll a fixture back. What the credentialed
// arm CAN do is read the live vocabulary out of reversible_tables() -- so the fourteen names below
// are checked against the DEPLOYED list rather than believed -- and invoke the real
// attach_before_images() on an input its SECOND guard must refuse, which writes nothing by
// construction. The write paths' evidence is the rolled-back fixture declared at the foot of this
// file, with every arm's counts and the pre-change red beside the post-change green.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
// SES-364's shipped allowlist, imported rather than retyped. THIS IMPORT IS THE POINT, not a
// convenience: reversible_tables() exists only to be the twin of reverse_decision()'s k_allowed,
// and a copy of the list in this file would agree with itself forever while the two functions drift
// apart (SES-45's "a second implementation agreeing with itself"). Importing the module is safe --
// selfRun() fires only when that file is the process entry point.
import { K_ALLOWED } from "./ses-364-reverse-agent-rows.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// PINNED BY SHA, NEVER BY THE `origin/dev` BRANCH NAME: a "before" that resolves as a moving branch
// self-destructs the moment this ship lands on it (the live SES-215 defect, v7.0.307). This is this
// ticket's own kickoff commit -- the tree with the kickoff on it and the change not yet made.
const PRE_CHANGE_SHA = "23e74bdd7cf263a27cc2f89254b7c2a5fd72fbd6";
const RUNBOOK_REL = "docs/runbooks/session-setup.md";

// session-setup.md is hard-wrapped, so a load-bearing phrase straddles a line break and a literal
// match that fails on a reflow fails for a reason that has nothing to do with the rule (SES-194).
export const norm = s => s.replace(/\s+/g, " ");

// ---------------------------------------------------------------------------------------------
// THE PURE HALF: the vocabulary, the all-or-nothing predicate, and the scope.
// ---------------------------------------------------------------------------------------------

// What public.reversible_tables() returns, read off the deployed function at this ship. The live
// arm below re-reads it from the database and asserts THIS list against it, so a drift between the
// shipped function and this file is a failure here rather than a silent divergence.
export const REVERSIBLE_TABLES = [
  "backlog_items", "runner_directives", "runner_drain_scope", "runner_settings",
  "governance_rules", "epics", "vision_claims", "skill_profiles", "agents", "capabilities",
  "capability_skill_profiles", "agent_capability_assignments", "ai_activity_log", "runner_items",
  // AGT-86 slice 1b (v7.0.543): a ruling on an audit finding is reversible.
  "audit_findings",
  // AGT-152 (v7.0.597): a model switch reverses in one step (model_assignments, pk id since this ship).
  "model_assignments",
];

// The four tables the 4 non-ship decisions had actually promised over, measured at this ship. None
// is restorable, and each is a table the runner writes about itself -- which is exactly why a
// reversal handle over one of them was never going to be honoured.
export const UNRESTORABLE_SEEN_LIVE = [
  "projects", "runner_card_asks", "runner_migration_downs", "runner_model_lanes",
];

// THE SHIPPED GUARD, reimplemented from the deployed body. `batch` is the rows the call would
// ACTUALLY write -- the deployed predicate is scoped `bi.id = any(p_image_ids) and bi.decision_id
// is null`, so an image already attached to some other decision is not this call's business and
// must not make it raise.
export function attachOutcome(batch, allowed = REVERSIBLE_TABLES) {
  const offenders = batch.filter(r => !allowed.includes(r.table_name));
  return offenders.length > 0
    ? { verdict: "refuse", written: 0, offenders: offenders.map(r => r.id) }
    : { verdict: "attach", written: batch.length, offenders: [] };
}

// THE PRE-CHANGE BUILD: attaches whatever it is handed. The negative control.
export function attachOutcomePreChange(batch) {
  return { verdict: "attach", written: batch.length, offenders: [] };
}

// THE STRAW MAN that a plain "it refuses runner_ladder" assertion cannot tell from the shipped
// build: skip the unrestorable rows, attach the rest, report the count. Named here so the
// divergence assertion can drive it.
export function attachOutcomeSkipBadRows(batch, allowed = REVERSIBLE_TABLES) {
  const good = batch.filter(r => allowed.includes(r.table_name));
  return { verdict: "attach", written: good.length, offenders: [] };
}

export const BATCHES = [
  { id: "mixed-one-unrestorable", batch: [{ id: "img-a", table_name: "backlog_items" },
                                          { id: "img-b", table_name: "runner_ladder" }] },
  { id: "all-unrestorable",       batch: [{ id: "img-c", table_name: "projects" }] },
  { id: "all-restorable",         batch: [{ id: "img-d", table_name: "backlog_items" },
                                          { id: "img-e", table_name: "agents" }] },
  { id: "empty-batch",            batch: [] },
];

export function differsFrom(other) {
  return BATCHES
    .filter(b => JSON.stringify(attachOutcome(b.batch)) !== JSON.stringify(other(b.batch)))
    .map(b => b.id);
}

// The call paths that adopt before-images. A closed set, asserted in BOTH directions below.
export const GUARDED = ["attach_before_images"];
export const UNGUARDED_BY_DESIGN = ["record_ship_decision"];

function theVocabularyIsTheTwinOfKAllowed() {
  assert.strictEqual(REVERSIBLE_TABLES.length, 16,
    `reversible_tables() returns sixteen names, not ${REVERSIBLE_TABLES.length}`);
  assert.strictEqual(new Set(REVERSIBLE_TABLES).size, 16, "the vocabulary carries a duplicate name");
  assert.deepStrictEqual([...REVERSIBLE_TABLES].sort(), [...K_ALLOWED].sort(),
    "reversible_tables() and reverse_decision()'s k_allowed have DRIFTED APART. The whole point of " +
    "the guard is that the list it refuses by is the list the restore actually replays -- two lists " +
    "that disagree give you either a false refusal (a table that would have restored fine) or the " +
    "unbacked promise this ticket exists to stop. Widen BOTH in the same migration, which is what " +
    "the migration's trailing DO block asserts");
  for (const t of UNRESTORABLE_SEEN_LIVE) {
    assert.ok(!REVERSIBLE_TABLES.includes(t),
      `${t} is one of the four tables the live unbacked promises were written over -- if it is on ` +
      "the vocabulary now, reverse_decision() had better replay it, and this file is the wrong " +
      "place to have decided that");
  }
}

function theRefusalIsAllOrNothing() {
  const mixed = BATCHES.find(b => b.id === "mixed-one-unrestorable").batch;

  const shipped = attachOutcome(mixed);
  assert.strictEqual(shipped.verdict, "refuse",
    "a batch naming runner_ladder must be refused: reverse_decision() will not replay it, so the " +
    "decision_id this call would write is a reversal handle that cannot be honoured");
  assert.strictEqual(shipped.written, 0,
    "THE ASSERTION THIS WHOLE FILE IS FOR. Not one row may be written -- INCLUDING the perfectly " +
    "restorable backlog_items image sitting next to the bad one. A build that wrote 1 here would " +
    "pass every 'it refuses runner_ladder' check ever written and still hand you a decision whose " +
    "undo set quietly omits rows, reported with a success count");
  assert.deepStrictEqual(shipped.offenders, ["img-b"],
    "the refusal names the offending image, and ONLY the offending image -- the message is how a " +
    "session finds out which of its images it cannot promise over");

  assert.strictEqual(attachOutcomeSkipBadRows(mixed).written, 1,
    "the straw man is vacuous unless it actually differs: skip-the-bad-row writes 1 on this batch");

  // The invariant the guard must NOT have disturbed.
  const clean = attachOutcome(BATCHES.find(b => b.id === "all-restorable").batch);
  assert.strictEqual(clean.verdict, "attach",
    "A BATCH OF RESTORABLE IMAGES STILL ATTACHES, and this is the arm a reader of the ticket title " +
    "alone would let rot. Every decision the runner records goes through this call; a guard that " +
    "refused broadly would stop the register working rather than make it honest");
  assert.strictEqual(clean.written, 2, "all-restorable attaches every row it was given");
  assert.strictEqual(attachOutcome([]).written, 0, "an empty batch attaches nothing and raises nothing");
  assert.strictEqual(attachOutcome([]).verdict, "attach",
    "an EMPTY batch must not be read as 'nothing restorable, therefore refuse' -- the deployed " +
    "predicate gathers offenders and raises only when it found some");

  // THE DIVERGENCES, which are what make the clauses above more than decorative.
  assert.deepStrictEqual(differsFrom(attachOutcomePreChange).sort(),
    ["all-unrestorable", "mixed-one-unrestorable"].sort(),
    "the shipped build and the PRE-CHANGE build must disagree on exactly the two batches carrying " +
    "an unrestorable table and NOWHERE ELSE. Diverging nowhere means the guard did not ship; " +
    "diverging on all-restorable or empty-batch means it refuses work it was never meant to touch");
  assert.deepStrictEqual(differsFrom(attachOutcomeSkipBadRows).sort(),
    ["all-unrestorable", "mixed-one-unrestorable"].sort(),
    "AND it must equally disagree with the skip-the-bad-row build. These two controls are not " +
    "redundant: the pre-change one proves a guard exists, this one proves the guard is " +
    "ALL-OR-NOTHING. A build that passed the first and failed this one is the plausible wrong fix");
}

function theGuardIsScopedToTheEnumeratedAttachOnly() {
  assert.deepStrictEqual(GUARDED, ["attach_before_images"],
    "the guard belongs to the ENUMERATED attach and nowhere else");
  assert.ok(!GUARDED.includes("record_ship_decision"),
    "record_ship_decision() MUST STAY UNGUARDED. It adopts the cycle's whole image set through its " +
    "own bulk UPDATE ... WHERE cycle_id = ... AND decision_id IS NULL, and its body states that " +
    "adopting the ledger rows is intended: 'the honest report, rather than an undo set that " +
    "quietly omits rows.' Measured at this ship: 43 live decisions carry at least one image " +
    "outside the fourteen and 39 of them are kind='ship' -- so extending this guard to the sweep " +
    "refuses nearly every ship, which is a platform that cannot ship rather than one that cannot " +
    "lie. This assertion exists BECAUSE the extension looks like tidying");
  assert.ok(UNGUARDED_BY_DESIGN.includes("record_ship_decision"),
    "the exclusion is recorded deliberately, not by omission -- a reader who finds the sweep " +
    "unguarded and nothing saying why will guard it");
  assert.strictEqual(
    GUARDED.filter(p => UNGUARDED_BY_DESIGN.includes(p)).length, 0,
    "a path cannot be both guarded and deliberately unguarded");
}

// ---------------------------------------------------------------------------------------------
// THE DOC HALF. A clause earns its place only if REMOVING it would change what a later editor does.
// ---------------------------------------------------------------------------------------------

export const RUNBOOK_CLAUSES = [
  {
    id: "the-refusal-is-all-or-nothing",
    detail:
      "the runbook is where a session reads what this call will do to its images. Stating only " +
      "'it refuses unrestorable tables' leaves the reader expecting the good images to go through " +
      "-- they will re-read decision_id, find NULL, and conclude the call failed for some other " +
      "reason. The all-or-nothing half is also the half a later editor 'improves' away, so it is " +
      "written where they will read it before they do",
    test: s => /`attach_before_images\(\)` REFUSES the whole call if any image names a table `reverse_decision\(\)` cannot replay/.test(norm(s)) &&
               /\*\*nothing is attached, not even the restorable images in the same batch\*\*/.test(norm(s)),
    breaks: s => s.replace("**nothing is\n  attached, not even the restorable images in the same batch**",
                           "the restorable images in the same batch are still attached"),
  },
  {
    id: "the-vocabulary-is-a-twin-widened-in-one-migration",
    detail:
      "without this a session hitting the refusal widens reversible_tables() alone, gets its attach " +
      "through, and has restored the exact unbacked promise the guard was put there to stop -- with " +
      "the guard still nominally in place, which is worse than not having it. " +
      "AGT-86 slice 1b widened it to fifteen (audit_findings) and 1d re-pins this sentence.",
    test: s => /The restorable tables are the fifteen `public\.reversible_tables\(\)` returns/.test(norm(s)) &&
               /widen `reversible_tables\(\)` \*\*and\*\* `reverse_decision\(\)`'s `k_allowed` in the same migration/.test(norm(s)),
    breaks: s => s.replace("widen `reversible_tables()` **and**\n  `reverse_decision()`'s `k_allowed` in the same migration",
                           "widen `reversible_tables()`"),
  },
  {
    id: "the-ship-sweep-stays-unguarded-and-says-why",
    detail:
      "THE CLAUSE THAT PREVENTS THE EXPENSIVE MISTAKE. A reader who meets the refusal and then finds " +
      "record_ship_decision() adopting images with no such check reads it as an oversight and " +
      "closes it -- and 39 of the 43 affected decisions are ships, so the next cycle cannot ship. " +
      "The number has to be here: 'it is intended' invites re-litigation, '39 of 43 are ships' ends it",
    test: s => /`record_ship_decision\(\)`'s bulk sweep is deliberately NOT guarded, and do not "fix" that/.test(norm(s)) &&
               /43 live decisions carry at least one image outside the fourteen, and 39 of them are `kind='ship'`/.test(norm(s)),
    breaks: s => s.replace("**`record_ship_decision()`'s bulk sweep is deliberately NOT guarded, and do not \"fix\" that.**",
                           "`record_ship_decision()`'s sweep carries the same guard."),
  },
];

const readRel = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

function theRunbookCarriesTheChange() {
  const src = readRel(RUNBOOK_REL);
  for (const c of RUNBOOK_CLAUSES) assert.ok(c.test(src), `${RUNBOOK_REL}: ${c.id} -- ${c.detail}`);
}

// SES-158's vacuity meta-check: a clause that still passes after its own mutation pins nothing.
function everyClauseHasTeeth() {
  const src = readRel(RUNBOOK_REL);
  for (const c of RUNBOOK_CLAUSES) {
    const broken = c.breaks(src);
    assert.notStrictEqual(broken, src,
      `clause "${c.id}"'s breaks() returned its input unchanged -- the teeth check below would pass ` +
      "vacuously, which is a control that controls nothing");
    assert.ok(!c.test(broken), `${RUNBOOK_REL}: ${c.id} is VACUOUS -- it still passes after its own breaks() mutation`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL: every clause must FAIL on the pre-change tree.
function theClausesFailOnThePreChangeTree() {
  let before;
  try {
    before = execFileSync("git", ["show", `${PRE_CHANGE_SHA}:${RUNBOOK_REL}`], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    notRun(
      `the file-level negative control for ${RUNBOOK_REL}`,
      `commit ${PRE_CHANGE_SHA} is unreachable in this checkout (a shallow clone), so the ` +
      "pre-change file could not be read. The clauses above still ran against the shipped tree; " +
      "what is unproven is that they FAIL on the tree before this ship. Deepen the clone and re-run.",
    );
    return;
  }
  const passing = RUNBOOK_CLAUSES.filter(c => c.test(before)).map(c => c.id);
  assert.deepStrictEqual(passing, [],
    `these ${RUNBOOK_REL} clauses pass on the PRE-CHANGE tree and therefore pin nothing: ${passing.join(", ")}`);
}

// ---------------------------------------------------------------------------------------------
// THE LIVE HALF -- Supabase over PostgREST. It reads the DEPLOYED vocabulary and invokes the REAL
// attach_before_images() on an input its second guard must refuse, so it proves the deployed
// mechanism while writing nothing. The write-free-ness is ASSERTED by side effect, not assumed.
// ---------------------------------------------------------------------------------------------

const base = url => url.replace(/\/+$/, "");
const NIL = "00000000-0000-0000-0000-000000000000";

async function post(url, key, name, body) {
  return fetch(`${base(url)}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function countOf(url, key, q) {
  const res = await fetch(`${base(url)}/rest/v1/${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) throw new Error(`${q} returned HTTP ${res.status}`);
  return Number((res.headers.get("content-range") || "/0").split("/")[1]);
}

async function theDeployedVocabularyAndTheGuardPathAreReal() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arms: public.reversible_tables() resolvable and returning the sixteen names this " +
        "file asserts, attach_before_images() resolvable at its UNCHANGED (uuid, uuid[]) identity " +
        "list with a misspelled-argument control (the second-overload detector), its two " +
        "pre-existing guards each pinned by the message it returns, and the write-free-ness of all " +
        "of it asserted by side effect against runner_before_images and runner_decisions",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The pure and doc arms above still " +
        "graded the vocabulary, the all-or-nothing predicate, both negative controls, the scope " +
        "and all three runbook clauses against the committed tree. Canonical invocation: " +
        "STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const before = {
    images: await countOf(url, key, "runner_before_images?select=id"),
    decisions: await countOf(url, key, "runner_decisions?select=id"),
  };

  // 1. THE DEPLOYED VOCABULARY, read rather than believed. This is what stops REVERSIBLE_TABLES
  //    above from being a list that agrees only with itself.
  const vocab = await post(url, key, "reversible_tables", {});
  assert.strictEqual(vocab.status, 200,
    `rpc/reversible_tables returned HTTP ${vocab.status} -- the function SES-399 shipped must be ` +
    "resolvable, or the guard is reading a list that is not there");
  const live = await vocab.json();
  assert.ok(Array.isArray(live), `reversible_tables() returned ${JSON.stringify(live).slice(0, 200)}`);
  assert.deepStrictEqual([...live].sort(), [...REVERSIBLE_TABLES].sort(),
    "the DEPLOYED reversible_tables() and this file's list disagree. Whichever is right, the guard " +
    "is refusing by a vocabulary nobody here has checked");
  assert.strictEqual(live.length, 16, `the deployed vocabulary has ${live.length} names, not 16`);

  // 2. THE IDENTITY ARGUMENT LIST IS UNCHANGED. SES-399 did CREATE OR REPLACE on the exact
  //    (uuid, uuid[]) list, so a two-argument call by name must still resolve. A retyped or
  //    extended list would have created a SECOND overload, and PostgREST answers an ambiguous call
  //    with an EMPTY result rather than an error -- the failure mode
  //    .claude/rules/supabase-function-signature.md exists for (DAT-12, 0 chunks for 90 seconds).
  const unknown = await post(url, key, "attach_before_images", { p_decision: NIL, p_image_ids: [] });
  const unknownBody = await unknown.json().catch(() => ({}));
  assert.strictEqual(unknown.status, 400,
    `attach_before_images(NIL, '{}') answered HTTP ${unknown.status} ${JSON.stringify(unknownBody).slice(0, 200)} ` +
    "-- a 404/PGRST202 here means the two-argument call no longer resolves");
  assert.ok(String(unknownBody.message || "").includes("no runner_decisions row"),
    `the probe did not take its unknown-decision guard: ${JSON.stringify(unknownBody).slice(0, 300)}. ` +
    "This arm is only write-free BECAUSE that is the path it takes -- the UPDATE is below it. If " +
    "the guard order changed, re-derive the write-free path before re-pointing this assertion");

  // 3. THE CONTROL for clause 2: one misspelled argument name must be UNRESOLVABLE. Without it,
  //    clause 2 proves only that the request was answered by something.
  const bad = await post(url, key, "attach_before_images", { p_decision: NIL, p_image_id: [] });
  const badBody = JSON.stringify(await bad.json().catch(() => ""));
  assert.ok(!bad.ok && /PGRST202|Could not find the function|no matches were found/i.test(badBody),
    `the control call with p_image_id instead of p_image_ids was answered ${bad.status} ${badBody} -- ` +
    "it must be unresolvable. If PostgREST accepts it, a SECOND overload exists and every caller " +
    "that omits a parameter is silently getting an empty result " +
    "(.claude/rules/supabase-function-signature.md)");

  // 4. THE FIRST GUARD, untouched by this ship and asserted so a retyped body cannot lose it.
  const nullDec = await post(url, key, "attach_before_images", { p_decision: null, p_image_ids: [] });
  const nullBody = await nullDec.json().catch(() => ({}));
  assert.ok(String(nullBody.message || "").includes("p_decision is required"),
    `a null p_decision was answered ${JSON.stringify(nullBody).slice(0, 300)} -- SES-399 replaced the ` +
    "whole body, so a missing guard here is a transcription loss rather than a contract change");

  // 5. WRITE-FREE, asserted by side effect (pg_proc is unreachable from here). Three calls above;
  //    neither table may have moved by a single row.
  const after = {
    images: await countOf(url, key, "runner_before_images?select=id"),
    decisions: await countOf(url, key, "runner_decisions?select=id"),
  };
  assert.deepStrictEqual(after, before,
    "the guard-path probes MOVED THE LEDGER. attach_before_images() is a writer, and these arms are " +
    "only permitted because each probe returns before the UPDATE -- if that is no longer true, " +
    `delete the offending arm rather than accepting the drift. before=${JSON.stringify(before)} ` +
    `after=${JSON.stringify(after)}`);
}

// ---------------------------------------------------------------------------------------------

export default async function run() {
  theVocabularyIsTheTwinOfKAllowed();
  theRefusalIsAllOrNothing();
  theGuardIsScopedToTheEnumeratedAttachOnly();
  theRunbookCarriesTheChange();
  everyClauseHasTeeth();
  theClausesFailOnThePreChangeTree();
  await theDeployedVocabularyAndTheGuardPathAreReal();

  notRun(
    "attach_before_images()'s WRITE path -- the UPDATE itself, the refusal raised against real " +
      "fixture rows, the re-read proving zero rows were written, and every pg_proc fact (overload " +
      "count and identity argument list for attach_before_images, reverse_decision and " +
      "reversible_tables)",
    "attach_before_images() is a WRITER: it sets decision_id on live runner_before_images rows. A " +
      "permanent regression test must never do that on the live ledger (the SES-196 / SES-218 / " +
      "SES-275 refusal), and this suite reaches Supabase only over PostgREST, which cannot read " +
      "pg_proc and cannot open a transaction to roll a fixture back. MEASURED AT AGT-152 (v7.0.597) " +
      "INSTEAD, live over the MCP, inside DO blocks ending in RAISE so every fixture rolled back, and " +
      "every count re-read afterwards. pg_proc at this ship, asserted by migration " +
      "agt152b_reversible_model_assignments's own trailing DO block rather than by its success flag: " +
      "EXACTLY 1 overload each of public.reverse_decision ('p_decision uuid, p_actor text, p_reason " +
      "text, p_actor_cycle uuid', CREATE OR REPLACE from its live pg_get_functiondef with one k_allowed " +
      "element added, so no DROP was owed), public.reversible_tables (no arguments), " +
      "apply_model_assignment, review_model_watch, model_assignments_sync_skills and the new " +
      "lane_member_skills; cardinality 16 with model_assignments last; all sixteen names present as " +
      "quoted literals in reverse_decision's prosrc; EXECUTE anon false and authenticated false on all " +
      "six, service_role true; model_assignments' primary key exactly id, unique (job_kind, job_key) " +
      "kept (agt152a_model_assignments_pk). " +
      "THE SWITCH, run against BOTH builds: capability data-room-custody moved to claude-fable-5-1 " +
      "(library-evidence-intent onto fable; fable 55), then apply_model_assignment switched " +
      "lane/judgment to claude-opus-5-5 on three passing trials at 1.05x. PRE-CHANGE: 55 Skill rows " +
      "moved (library-evidence-intent with them), 55 imaged, the model_assignments image at pk_value " +
      "'lane/judgment'; reverse_decision returned outcome 'applied', restored 0, restored_unverified " +
      "55, refused 1, refused_written_since 0, and judgment stayed on claude-opus-5-5 -- the red. " +
      "POST-CHANGE: 54 moved, library-evidence-intent still claude-fable-5-1, 54 imaged, 1 " +
      "model_assignments image at pk_value = the row's id; reverse_decision returned outcome " +
      "'applied', restored 1, restored_unverified 54, refused 0, refused_written_since 0, and the " +
      "re-read showed judgment on claude-fable-5-1 with decision_id and watch_baseline NULL, " +
      "claude-opus-5-5 rows 0, fable 55. " +
      "THE ATTACH ARM: a fresh UNATTACHED model_assignments image (attach only touches decision_id " +
      "IS NULL rows; the switch's own image is written attached). PRE-CHANGE attach_before_images(dec, " +
      "[img]) RAISED 'attach_before_images: refusing the whole batch -- reverse_decision() cannot " +
      "restore <image id> (model_assignments).' POST-CHANGE it RETURNED 1. " +
      "ZERO RESIDUE on re-read after rollback: 5 model_assignments rows, all decision_id NULL; fable " +
      "54, claude-opus-5-5 0; data-room-custody on claude-haiku-4-5-20251001; runner_before_images " +
      "where table_name = 'model_assignments' 0.",
  );
}

selfRun(import.meta.url, run);
