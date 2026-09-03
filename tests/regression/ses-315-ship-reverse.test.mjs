// DeepBench v7.0.404 | tests/regression/ses-315-ship-reverse.test.mjs | SES-315 (a) -- a ship is a
// decision with a handle, and an Accept is no longer a ladder input.
//
// WHAT IS BEING PINNED, and why the obvious guard would be the wrong one. It is easy to write a
// test that asserts "record_ship_decision exists". That passes just as well against the build the
// M6 gate review forbids -- one where the ship decision exists AND `apply_ladder_decision()` still
// promotes on a card tap, so a single delivery is counted twice and manufactures a rung that buys
// real extra files, real extra tasks and the auto-done bar. So the clauses below are about the
// ladder having exactly two promoters and two demoters, and the central pure arm proves a
// DIFFERENCE from the retired mapping rather than a property both share (the SES-213 lesson).
//
// THE ONE THING THAT MUST NOT BE "TIDIED": the `reverse` branch of apply_ladder_decision() KEEPS
// its demote. A later editor reading "Accept is not a ladder input" as "this function is dead" and
// deleting the rest would remove the only demote a legacy card has -- and M6-07's whole safety
// measure is that a reversal always costs a rung ("autonomy is elastic, never ratcheted"). The
// ledger clause below and the pure mapping both pin that, deliberately, in two different ways.
//
// THE DATABASE HALF IS DECLARED NOT-RUN RATHER THAN FAKED, the SES-134 / SES-182e shape: the four
// function bodies ship as migration `ses315_ship_decision` and live in the database, and this suite
// reaches Supabase only over PostgREST, which cannot read pg_get_functiondef and cannot open a
// transaction to roll a fixture back. What the credentialed arm CAN do is invoke the real
// record_ship_decision() on inputs it must REFUSE -- which writes nothing by definition, because
// every one of those guards returns before the first INSERT -- so the guard exercises the live
// mechanism without ever exercising the live write. The write paths' evidence is the rolled-back
// fixture at the foot of this file.
//
// PART (a) OF A TWO-PART TICKET. `class_autonomy('P10 - Tooling').extra_files` is 0 (tooling rung
// 13 against cap_relax_rung 13), so SES-315's six files do not fit one session's cap. This commit
// is the migration + the ledger + this guard; the runbook edits and the SES-134 / SES-182e clause
// updates are part (b), and the arms that would grade them are DECLARED not-run below rather than
// written against text that is not in the tree yet.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

// THE PRE-CHANGE TREE IS PINNED BY SHA, NEVER BY THE `origin/dev` BRANCH NAME. A file-level control
// that resolves "before" as a moving branch SELF-DESTRUCTS the moment the ship lands on that
// branch: origin/dev then CONTAINS the change, every clause passes on "both" trees, and the control
// reports the ship as un-pinning. That is the live SES-215 defect (v7.0.307), which SES-134 then
// reproduced. A SHA is immutable. If it is unreachable (a shallow clone), the control declares
// itself not-run rather than passing vacuously.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRE_CHANGE_SHA = "9eb38971f3117f928ec41457257916990e05854a"; // origin/dev immediately before SES-315 (a)
const LEDGER_REL = "docs/SELFBUILD-RETIREMENT-LEDGER.md";
const LEDGER = path.join(ROOT, LEDGER_REL);

// The ledger is hard-wrapped, so a load-bearing phrase can straddle a line break, and a literal
// match that fails on a reflow fails for a reason that has nothing to do with the rule (SES-194).
export const norm = s => s.replace(/\s+/g, " ");

// ---------------------------------------------------------------------------------------------
// THE PURE HALF: what moves the ladder, shipped versus retired.
// ---------------------------------------------------------------------------------------------
//
// A reimplementation of apply_ladder_decision()'s decision -> ladder-effect mapping. Exported so
// the divergence assertion drives the real expressions rather than a paraphrase of them.

// The SHIPPED mapping (migration ses315_ship_decision).
export function ladderEffect(card) {
  if (card.kind === "gated_before_build") return "none";     // B34: permission is not a rating
  if (card.decision === null || card.decision === undefined) return "none";
  if (card.decision === "rework") return "none";
  if (card.decision === "accept") return "none";             // SES-315 / M6-07: NOT an input
  if (card.decision === "reverse") return "demote";          // still John's word, still costs a rung
  return "none";
}

// The RETIRED mapping (SES-134 / SES-122a). Kept here ONLY as the negative control -- never call it
// for anything else.
export function ladderEffectRetired(card) {
  if (card.kind === "gated_before_build") return "none";
  if (card.decision === null || card.decision === undefined) return "none";
  if (card.decision === "rework") return "none";
  if (card.decision === "accept") return "promote";          // the branch this ship retired
  if (card.decision === "reverse") return "demote";
  return "none";
}

// The closed set the two mappings are compared over. The accept ship card is the ONE row they may
// differ on; every other row is an invariant this ship must not have disturbed.
export const CARDS = [
  { id: "ship-accept",    card: { kind: "ship", decision: "accept" } },
  { id: "ship-reverse",   card: { kind: "ship", decision: "reverse" } },
  { id: "ship-rework",    card: { kind: "ship", decision: "rework" } },
  { id: "ship-undecided", card: { kind: "ship", decision: null } },
  { id: "gated-accept",   card: { kind: "gated_before_build", decision: "accept" } },
  { id: "gated-reverse",  card: { kind: "gated_before_build", decision: "reverse" } },
];

// Returns the ids where the two mappings disagree, so the assertion can name them.
export function mappingsDifferOn() {
  return CARDS.filter(c => ladderEffect(c.card) !== ladderEffectRetired(c.card)).map(c => c.id);
}

// THE LADDER'S LIVE WRITERS, held as data so the clause can assert the vocabulary rather than
// restate it. `ship-card-accept` is deliberately absent.
export const LADDER_INPUTS = [
  "verdict_ladder_signal",   // M6-07: approve promotes, block resets the streak, never the rung
  "sweep_decision_windows",  // M6-02: silence past the window promotes the class the decision named
  "reverse_decision",        // M6-07: a reversal demotes, window closed or not
  "apply_ladder_decision",   // ONLY its `reverse` branch, on a legacy card
];

function theLadderHasTwoInputsAndTwoDemotes() {
  assert.strictEqual(ladderEffect({ kind: "ship", decision: "accept" }), "none",
    "an Accept on a ship card must not move the ladder -- M6-07 grades a ship by its verdict and " +
    "its decision window, and counting a tap as well double-counts one delivery (SES-107's " +
    "runaway with a second author)");
  assert.strictEqual(ladderEffect({ kind: "ship", decision: "reverse" }), "demote",
    "a Reverse on a legacy card must STILL demote. This is the clause that stops a later editor " +
    "reading 'Accept is not an input' as 'this function is dead': a Reverse is a reversal by " +
    "John's word, and M6-07's safety measure is that a reversal always costs a rung");
  assert.strictEqual(ladderEffect({ kind: "gated_before_build", decision: "accept" }), "none",
    "rule B34: a gated card authorises one build and is never a rating -- paying the runner for " +
    "asking permission is the one behaviour that must always be free");

  // THE DIVERGENCE, which is what makes the clauses above more than decorative: the shipped and
  // retired mappings must disagree on the accept ship card and NOWHERE ELSE.
  assert.deepStrictEqual(
    mappingsDifferOn(), ["ship-accept"],
    "the shipped and retired ladder mappings must diverge on exactly one card -- the accept ship " +
    "card. Diverging nowhere means this guard is not discriminating; diverging anywhere else " +
    "means this ship disturbed an invariant it was supposed to inherit (B34, rework, undecided, " +
    "and the reverse demote)");
  assert.strictEqual(ladderEffectRetired({ kind: "ship", decision: "accept" }), "promote",
    "the control is vacuous unless the retired mapping PROMOTES on the accept ship card");

  assert.ok(!LADDER_INPUTS.includes("ship-card-accept"),
    "the ship-card Accept is not a ladder input any more");
  assert.strictEqual(new Set(LADDER_INPUTS).size, 4,
    `the ladder has exactly four writers today (${LADDER_INPUTS.join(", ")}). If a fifth arrived, ` +
    "re-derive the double-count argument before widening this list -- that argument is the whole " +
    "reason the accept branch was retired");
}

// ---------------------------------------------------------------------------------------------
// THE DOC HALF: the retirement ledger's entry 39. A clause earns its place only if REMOVING it
// would change what a later editor does.
// ---------------------------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "the-retirement-is-recorded-at-all",
    detail:
      "SELFBUILD-RETIREMENT-LEDGER.md's contract is that every rule this project removes or " +
      "rewrites gets an entry with reasons. The accept promotion was a LIVE database branch, so " +
      "without an entry a later reader looking for the promotion they remember finds a function " +
      "that returns `applied false` and no record of who decided that or why",
    test: s => /the Accept promotion, as a ladder input \(retired\)/.test(s),
    breaks: s => s.replace("the Accept promotion, as a ladder input (retired)", "some other change"),
  },
  {
    id: "the-reverse-demote-is-recorded-as-surviving",
    detail:
      "the entry must say IN THE LEDGER that the `reverse` branch keeps its demote. This is the " +
      "one clause that protects M6-07's safety measure from a well-meaning cleanup: the ledger is " +
      "where somebody looks before deleting a function they have just been told is not an input, " +
      "and a retirement entry that does not name what SURVIVED reads as permission to remove the " +
      "rest",
    test: s => /`reverse` branch \*\*keeps its demote\*\*/.test(norm(s)),
    breaks: s => s.replace("`reverse` branch **keeps its demote**", "`reverse` branch is also inert"),
  },
  {
    id: "the-reason-is-the-double-count-not-just-dormancy",
    detail:
      "the entry must give BOTH reasons and mark the second as the one that makes the branch " +
      "unsafe rather than merely dead. Dormancy alone argues for leaving it alone; the double " +
      "count is what argues for retiring it, and it is the reason a restore has to be re-argued " +
      "rather than just re-applied",
    test: s => /counted twice/.test(norm(s)) && /manufactured/.test(norm(s)) && /SES-107/.test(s),
    breaks: s => s.replace(/counted twice/, "counted once"),
  },
  {
    id: "the-accept-arm-is-inert-not-absent",
    detail:
      "the entry must record that the arm still STAMPS `ladder_applied_at`. An arm deleted " +
      "outright would leave an accept card unstamped, and an unstamped card is one a re-run or a " +
      "second harvesting peer can still count -- the idempotence guard is structural, and this " +
      "sentence is where a later editor learns not to 'simplify' it away",
    // NORMALISED, and anchored on the WHOLE bolded phrase: the ledger hard-wraps between "inert"
    // and "rather", so the literal form fails on a reflow for a reason that has nothing to do
    // with the rule (SES-194). Caught by this clause failing on its own first run.
    test: s => /\*\*inert rather than absent\*\*/.test(norm(s)) && /ladder_applied_at/.test(s),
    breaks: s => s.replace(/\*\*inert/, "**removed,"),
  },
  {
    id: "the-restore-path-names-a-recoverable-body",
    detail:
      "the ledger's standing promise is that every entry carries a restore path. This branch's " +
      "prior text is NOT in the repo -- migrations here live only in the database -- so a " +
      "`git log --follow` restore path would be a dead end. The entry names the migration whose " +
      "recorded SQL still carries the pre-change body instead",
    test: s => /ses122a_verdict_ladder_signals/.test(s) && /schema_migrations/.test(s),
    breaks: s => s.replace("ses122a_verdict_ladder_signals", "some_other_migration"),
  },
  {
    id: "the-transition-rule-is-satisfied-explicitly",
    detail:
      "SELFBUILD-CHARTER's transition rule: no commit may exist in which neither the old rule nor " +
      "its replacement is in force. Here the replacement PREDATES the retirement (SES-122a and " +
      "SES-286a), which is unusual enough that the entry says so -- otherwise a reader auditing " +
      "the rule sees a removal with no paired arrival and reports a violation that is not one",
    // ANCHORED ON ENTRY 39'S OWN SENTENCE, never on the bare word "transition": three earlier
    // ledger entries (34, 36, 37) invoke the same charter rule, so a loose match survived its own
    // mutation -- the mutation landed on entry 34's copy and left this one standing. Caught by the
    // teeth check on this file's first run, which is the SES-158 meta-check earning its keep
    // before the ship rather than after it.
    test: s => /the replacement is ALREADY LIVE and predates this entry/.test(norm(s)) &&
               /SES-122` \(a\)/.test(s) && /SES-286a/.test(s),
    breaks: s => s.replace("the replacement is ALREADY LIVE and predates this entry",
                           "this entry stands on its own"),
  },
];

function readLedger() {
  return fs.readFileSync(LEDGER, "utf8");
}

function theLedgerRecordsTheRetirement() {
  const src = readLedger();
  for (const c of CLAUSES) {
    assert.ok(c.test(src), `${c.id} -- ${c.detail}`);
  }
}

// SES-158's vacuity meta-check: a clause that still passes after its own mutation pins nothing.
function everyClauseHasTeeth() {
  const src = readLedger();
  for (const c of CLAUSES) {
    const broken = c.breaks(src);
    assert.notStrictEqual(
      broken, src,
      `clause "${c.id}"'s breaks() returned its input unchanged -- the teeth check below would ` +
      "pass vacuously, which is a control that controls nothing",
    );
    assert.ok(
      !c.test(broken),
      `${c.id} is VACUOUS -- it still passes after its own breaks() mutation`,
    );
  }
}

// FILE-LEVEL NEGATIVE CONTROL: every clause must FAIL on the pre-change ledger, where entry 39
// does not exist at all. A guard that passes on both trees pins nothing.
function theClausesFailOnThePreChangeTree() {
  let before;
  try {
    before = execFileSync("git", ["show", `${PRE_CHANGE_SHA}:${LEDGER_REL}`], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    notRun(
      "the file-level negative control",
      `commit ${PRE_CHANGE_SHA} is unreachable in this checkout (a shallow clone), so the ` +
      "pre-change ledger could not be read. The clauses above still ran against the shipped " +
      "tree; what is unproven is that they FAIL on the pre-change one. Deepen the clone and re-run.",
    );
    return;
  }
  const passing = CLAUSES.filter(c => c.test(before)).map(c => c.id);
  assert.deepStrictEqual(
    passing, [],
    `these clauses pass on the PRE-CHANGE ledger and therefore pin nothing: ${passing.join(", ")}`,
  );
}

// ---------------------------------------------------------------------------------------------
// THE LIVE HALF -- Supabase over PostgREST. It invokes the REAL functions, but only on inputs the
// guards must REFUSE, so it proves the deployed mechanism while writing nothing. The
// write-free-ness is ASSERTED by side effect below rather than assumed.
// ---------------------------------------------------------------------------------------------

const base = url => url.replace(/\/+$/, "");

async function raw(url, key, pathAndQuery, init) {
  return fetch(`${base(url)}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
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

const NIL = "00000000-0000-0000-0000-000000000000";

// The five parameter names, in the order the runbook's call passes them. PostgREST resolves an RPC
// by its ARGUMENT NAMES, so posting this exact object is a stronger existence proof than reading a
// schema document: it is the resolution path the runner itself takes.
export const SHIP_ARGS = ["p_cycle_id", "p_backlog_id", "p_version", "p_push_sha", "p_verdict_id"];

// reverse_decision()'s response columns. The SES-316 set, unchanged by this ship -- which is the
// point of asserting it here: SES-315 retyped that whole body to add the ship branch, so a missing
// column is a transcription loss rather than a contract change.
export const REVERSE_OUT_COLUMNS = [
  "outcome", "restored", "restored_unverified", "refused",
  "refused_written_since", "demoted", "reversal_id", "reason",
];

async function theShipDecisionRpcIsReachableAndFailsClosed() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arms: record_ship_decision() resolvable by its five argument names with a " +
        "misspelled-argument control, its three fail-closed guards each pinned by the message it " +
        "returns, reverse_decision() still carrying the SES-316 four and its eight response " +
        "columns, apply_ladder_decision() still present, and the write-free-ness of all of it " +
        "asserted by side effect",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The pure and ledger arms above still " +
        "graded the ladder mapping and all six ledger clauses against the committed tree. " +
        "Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const before = {
    decisions: await countOf(url, key, "runner_decisions?select=id"),
    shipDecisions: await countOf(url, key, "runner_decisions?select=id&kind=eq.ship"),
    images: await countOf(url, key, "runner_before_images?select=id"),
    directives: await countOf(url, key, "runner_directives?select=id"),
  };

  const post = (name, body) =>
    raw(url, key, `rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
  const msgOf = async res => {
    let j = null;
    try { j = await res.json(); } catch { /* an empty or non-JSON body is itself the finding */ }
    return JSON.stringify(j ?? "");
  };

  // 1. RESOLVABLE BY ITS ARGUMENT NAMES. A verdict id naming no row is the deepest guard reachable
  //    without a real cycle, and it fires AFTER the three argument checks -- so reaching it proves
  //    every one of the five names bound.
  const args = {
    p_cycle_id: NIL,
    p_backlog_id: "SES-999",
    p_version: "v0.0.0-probe",
    p_push_sha: "probe",
    p_verdict_id: NIL,
  };
  assert.deepStrictEqual(Object.keys(args).sort(), [...SHIP_ARGS].sort(),
    "the probe payload and the declared argument list have drifted apart");

  const res = await post("record_ship_decision", args);
  assert.ok(
    !res.ok,
    "rpc/record_ship_decision returned HTTP 200 for a verdict id that names no row. That is the " +
      "one answer this arm must never see: the function is supposed to RAISE rather than record " +
      "a ship whose reasoning nobody can read",
  );
  const body = await msgOf(res);
  assert.ok(
    !/PGRST202|Could not find the function/i.test(body),
    "PostgREST could not resolve public.record_ship_decision with the five argument names " +
      `${SHIP_ARGS.join(", ")} -- this is the arm that fails against a database still missing ` +
      `migration ses315_ship_decision, and it also fails if service_role lost EXECUTE. Body: ${body}`,
  );
  // THE PATH, PINNED. Without this the reachability check could go green off any other error -- a
  // permission denial, a type mismatch, a 500 -- none of which prove the function is there.
  assert.ok(
    /no runner_verdicts row/.test(body),
    `the probe did not take the missing-verdict guard (body was ${body}). This arm is only ` +
      "write-free BECAUSE that is the path it takes: every guard above it returns before the " +
      "first INSERT. If the guard order changed, re-derive the write-free path before " +
      "re-pointing this assertion",
  );

  // 2. THE CONTROL for clause 1: one misspelled argument name must be UNRESOLVABLE. Without it,
  //    the assertion above proves only that the request was answered.
  const badArgs = { ...args };
  delete badArgs.p_verdict_id;
  badArgs.p_verdict = NIL;                   // one name wrong, everything else identical
  const bad = await post("record_ship_decision", badArgs);
  const badBody = await msgOf(bad);
  assert.ok(
    !bad.ok && /PGRST202|Could not find the function/i.test(badBody),
    `the control call with p_verdict instead of p_verdict_id was answered ${bad.status} ` +
      `${badBody} -- it must be unresolvable. If PostgREST accepts it, a SECOND overload exists ` +
      "and every caller that omits a parameter is silently getting an empty result " +
      "(.claude/rules/supabase-function-signature.md)",
  );

  // 3. THE ATTRIBUTION GUARD. A ship is a cycle's delivery, and the reversal reads that cycle row
  //    for the version and sha it hands the next cycle -- so a null cycle is refused by name.
  const noCycle = await post("record_ship_decision", { ...args, p_cycle_id: null });
  const noCycleBody = await msgOf(noCycle);
  assert.ok(
    !noCycle.ok && /p_cycle_id is required/.test(noCycleBody),
    `a null p_cycle_id was answered ${noCycle.status} ${noCycleBody} -- it must raise. Without a ` +
      "cycle the reversal has no row to read the shipped version and sha off, so the " +
      "REVERT-FORWARD instruction it queues would name neither",
  );

  // 4. THE TICKET GUARD, fail-closed in the same direction: no ticket named, nothing to hand back.
  const noTicket = await post("record_ship_decision", { ...args, p_backlog_id: "" });
  const noTicketBody = await msgOf(noTicket);
  assert.ok(
    !noTicket.ok && /p_backlog_id is required/.test(noTicketBody),
    `a blank p_backlog_id was answered ${noTicket.status} ${noTicketBody} -- it must raise`,
  );

  // 5. reverse_decision()'s SIGNATURE AND RETURN SET ARE UNCHANGED. SES-315 extends its BODY (a
  //    kind='ship' row also queues the revert-forward directive) and must not have touched its
  //    identity argument list -- a changed one would have created a second overload and broken
  //    every caller that omits p_actor_cycle.
  const revProbe = await post("reverse_decision", {
    p_decision: NIL, p_actor: "", p_reason: "ses-315 read-only signature probe",
  });
  assert.strictEqual(revProbe.status, 200,
    `rpc/reverse_decision(p_decision, p_actor, p_reason) returned HTTP ${revProbe.status} -- ` +
    "SES-315 replaced this function's body with CREATE OR REPLACE on the SES-316 identity " +
    "argument list, so the three-argument call (p_actor_cycle defaulted) must still resolve");
  const revRows = await revProbe.json();
  assert.ok(
    Array.isArray(revRows) && revRows.length === 1 &&
      String(revRows[0].reason || "").includes("p_actor is required"),
    `the reverse_decision probe did not take its blank-actor guard: ` +
      `${JSON.stringify(revRows).slice(0, 200)}. That guard is the first statement in the body, ` +
      "which is what makes this arm read-only",
  );
  assert.deepStrictEqual(
    Object.keys(revRows[0]).sort(), [...REVERSE_OUT_COLUMNS].sort(),
    "reverse_decision()'s response columns are not the SES-316 set. This ship retyped the whole " +
      "body to add the ship branch, so a missing column here is a transcription loss, not a " +
      "contract change -- and refused_written_since is the one every reader of these counts " +
      "depends on to tell 'your undo did not happen' from 'that row was never this decision's " +
      "to undo'",
  );

  // 6. apply_ladder_decision() STILL EXISTS, at one resolvable signature. It was not dropped: its
  //    `reverse` branch is a legacy card's only demote.
  const ladProbe = await post("apply_ladder_decision", { p_cycle_id: NIL, p_item_id: NIL });
  const ladBody = await msgOf(ladProbe);
  assert.ok(
    !/PGRST202|Could not find the function/i.test(ladBody),
    `public.apply_ladder_decision(p_cycle_id, p_item_id) is not resolvable: ${ladBody}. It must ` +
      "NOT have been dropped -- retiring the Accept input is not retiring the function, and a " +
      "legacy card's Reverse has no other demote",
  );
  assert.ok(
    !ladProbe.ok && /no runner_items row/.test(ladBody),
    `the apply_ladder_decision probe did not take its missing-card guard: ${ladProbe.status} ` +
      `${ladBody}. That guard raises before any write, which is what makes this arm read-only`,
  );

  // 7. WRITE-FREE, asserted by side effect (pg_proc is unreachable from here). Six calls above;
  //    not one ledger table may have moved by a single row.
  const after = {
    decisions: await countOf(url, key, "runner_decisions?select=id"),
    shipDecisions: await countOf(url, key, "runner_decisions?select=id&kind=eq.ship"),
    images: await countOf(url, key, "runner_before_images?select=id"),
    directives: await countOf(url, key, "runner_directives?select=id"),
  };
  assert.deepStrictEqual(
    after, before,
    "the guard-path probes MOVED THE LEDGER. record_ship_decision() and reverse_decision() are " +
      "both writers, and these arms are only permitted because each probe returns before the " +
      "first write -- if that is no longer true, delete the offending arm rather than accepting " +
      `the drift. before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );
}

// ---------------------------------------------------------------------------------------------

export default async function run() {
  theLadderHasTwoInputsAndTwoDemotes();
  theLedgerRecordsTheRetirement();
  everyClauseHasTeeth();
  theClausesFailOnThePreChangeTree();
  await theShipDecisionRpcIsReachableAndFailsClosed();

  notRun(
    "SES-315 part (b) -- the runner-cycle.md arms: step 7's close-out naming " +
      "record_ship_decision(), 7b no longer calling a ship 'not a decision', the four live-voice " +
      "passages carrying retirement vocabulary (step 8c's no-unattended-removal, step 6's " +
      "needs-john, the step-5 flag table row, the chain-gate flag-set mentions), and step 2's " +
      "Reverse ceremony triggered by the directive instead of a card tap -- together with the " +
      "SES-134 and SES-182e clause updates those edits require",
    "this commit is part (a) of a two-part ticket: class_autonomy('P10 - Tooling').extra_files is " +
      "0 (tooling rung 13, cap_relax_rung 13), so the six files SES-315 names do not fit one " +
      "session's cap. Writing those arms now would grade text that is not in the tree, so they " +
      "are declared rather than written -- and the arms above deliberately do NOT read " +
      "runner-cycle.md at all, so nothing here can pass vacuously off a passage part (b) will " +
      "add. MEASURED CONSEQUENCE OF THE SPLIT, stated so a later reader does not mistake it for " +
      "an oversight: between (a) and (b) the mechanism is live and unreached -- step 7 does not " +
      "yet call record_ship_decision(), so a ship landing in that window still has no handle, " +
      "exactly as before; and step 2 still describes the Accept promotion the migration has " +
      "already made inert.",
  );

  notRun(
    "the WRITE paths of all four functions -- record_ship_decision()'s success path and its image " +
      "adoption, reverse_decision()'s restore loop and its ship branch, apply_ladder_decision()'s " +
      "stamp, apply_data_restore()'s upsert -- and every pg_proc fact (overload counts, " +
      "provolatile, EXECUTE grants)",
    "all four are WRITERS: they insert the decision ledger, move runner_ladder, queue directives " +
      "and rewrite board rows. A permanent regression test must never do that on the live board " +
      "(the SES-196 / SES-218 / SES-275 refusal), and this suite reaches Supabase only over " +
      "PostgREST, which cannot read pg_proc and cannot open a transaction to roll a fixture back. " +
      "MEASURED AT THIS SHIP INSTEAD, live over the MCP, inside deliberately failing DO blocks " +
      "with every fixture rolled back, and asserted on the OUTCOME AND THE COUNTS rather than on " +
      "'it returned'. ARM 1, record_ship_decision() on a supervised fixture cycle carrying three " +
      "before-images (a backlog_items row, a runner_directives row, a runner_ladder row) and an " +
      "approve verdict: returned a decision with kind='ship', backlog_id='ZZZ-999', " +
      "ladder_work_class='bug_fix' (from the ticket's P9 through ladder_work_class()), " +
      "status='open', expires_at - decided_at = 3.000 days exactly, reasoning byte-equal to the " +
      "verdict's, summary 'ZZZ-999 shipped at v0.0.0-ses315fx (fixsha315) on verdict <id>', and " +
      "ALL THREE images adopted -- the ship's own writes ARE the decision's undo set, no second " +
      "copy. A second identical call returned the SAME id with the ship-row count still 1 " +
      "(idempotent per cycle+ticket, which matters because the adoption is `decision_id IS NULL`: " +
      "a second decision would adopt nothing and hand out a Reverse that restores nothing). " +
      "THREE CONTROLS, each raising: a `block` verdict ('is block, not approve'), a verdict " +
      "naming ZZZ-998 while the ship named ZZZ-999 ('is the verdict on ZZZ-998'), and a null " +
      "cycle. ARM 2, reverse_decision() on that ship decision: outcome='applied', restored 1 (the " +
      "backlog_items row, tier and status written back), restored_unverified 1 " +
      "(runner_directives, no updated_at column), refused 1 (the runner_ladder image -- a ledger " +
      "table outside the allowlist, adopted on purpose and never written back), " +
      "refused_written_since 0, demoted true; the ticket's status went 'delivered' -> 'open', the " +
      "fixture directive 'done' -> 'queued', runner_ladder.bug_fix 1/2 -> 0/0, the ship decision " +
      "status='reversed', and EXACTLY ONE runner_directives row was queued reading " +
      "'REVERT-FORWARD REQUESTED: ZZZ-999 v0.0.0-ses315fx fixsha315 -- reversal <id>; the next " +
      "cycle reverts the push (runner-cycle.md step 2 Reverse ceremony) and closes this row', " +
      "type='directive', status='queued', with its before-image carrying the REVERSAL's " +
      "decision_id and row_data NULL (the SES-89 insert convention, so undoing it is a delete by " +
      "primary key). The reason string carried 'THE CODE IS STILL LIVE: revert-forward requested " +
      "as runner_directives <id>' -- said there as well as in the directive on purpose, because " +
      "the rows being back reads like the push being gone and it is not. A second reversal " +
      "returned outcome='refused' ('already reversed ... nothing is undone twice') and the " +
      "REVERT-FORWARD count STAYED AT 1. THE RESTORE CROSSED A LIVE FK: a second fixture ticket " +
      "held blocked_by pointing at the restored row throughout, and the in-place UPDATE never " +
      "raised 23503. ARM 3, apply_ladder_decision() over all six card shapes: accept ship card " +
      "-> applied false, 'Accept is not a ladder input since M6-07 (SES-315); the ladder reads " +
      "verdicts and decisions', ladder_applied_at STAMPED and runner_ladder.bug_fix unmoved at " +
      "1/2; the same call again -> 'already counted on the ladder'; gated card -> the B34 reason; " +
      "rework -> 'becomes a directive, not a rating'; undecided -> 'card is undecided'; and THE " +
      "CONTROL THAT MATTERS, a `reverse` card -> applied TRUE, promoted false, 'reverse on a ship " +
      "card: streak 2 -> 0, rung 1 -> 0', ladder 1/2 -> 0/0. The demote survives; only the " +
      "promotion left. ARM 4, apply_data_restore() on a reversed fixture ship card: " +
      "plan_data_restore() classified both images restorable/upsert, the apply returned " +
      "outcome='applied' with upserts 2, deletes 0, unverifiable 0, refused 1 (arm 3's " +
      "runner_ladder image, a ledger table); the blocked row came back IN PLACE (tier=now " +
      "status=open) with its blocked_by referent still standing, the DELETED row was re-INSERTED " +
      "(the v_now IS NULL branch), and a second call returned 'already_applied'. ITS CONTROL IS " +
      "WHAT MAKES THAT ARM DISCRIMINATING: the RETIRED delete-and-reinsert shape, run by hand " +
      "against the SAME row in the same transaction, raised 23503 " +
      "(backlog_items_blocked_by_fkey) -- so the in-place UPDATE is proven to succeed exactly " +
      "where the shape it replaced fails, rather than merely to succeed. ZERO RESIDUE on re-read " +
      "after rollback: 0 ZZZ-* tickets, 0 kind='ship' decisions, 0 REVERT-FORWARD directives, 0 " +
      "fixture cycles, runner_ladder back at bug_fix 1/2 and tooling 13/44, and both real open " +
      "decisions (62177395 directive, c3e86310 gate) untouched. pg_proc at the same ship, " +
      "asserted by the migration's own trailing DO block rather than by its success flag: exactly " +
      "1 overload each of record_ship_decision, reverse_decision, apply_ladder_decision, " +
      "apply_data_restore, plan_data_restore, record_decision, ladder_apply_signal and " +
      "attach_before_images; record_ship_decision provolatile='v'; EXECUTE true for service_role " +
      "and false for anon and authenticated on all four (has_function_privilege, both " +
      "directions); 13 named pre-change landmarks still present in reverse_decision()'s body " +
      "(the retype guard); the promotion arithmetic absent from apply_ladder_decision(); and " +
      "exactly ONE delete statement left in apply_data_restore(). ONE DEFECT FOUND AND FIXED BY " +
      "THAT ASSERTION BLOCK, on a first attempt that rolled back entirely: pg_default_acl for " +
      "FUNCTIONS in this project is {postgres=X,anon=X,authenticated=X,service_role=X}, so a " +
      "newly created function is EXECUTE-able by the browser anon key the moment it exists, and " +
      "`REVOKE ALL ... FROM PUBLIC` does not remove an explicit role grant -- functions default " +
      "OPEN here, the opposite of the table write-grant default recorded in " +
      ".claude/rules/supabase-column-grants.md. The migration now revokes from PUBLIC, anon and " +
      "authenticated by name, and asserts both directions afterwards.",
  );
}

selfRun(import.meta.url, run);
