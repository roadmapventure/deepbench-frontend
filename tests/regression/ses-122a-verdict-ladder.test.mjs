// DeepBench v7.0.397 | tests/regression/ses-122a-verdict-ladder.test.mjs | SES-122 (a)
//
// FEATURE: SES-122 (a) -- guards the VERDICT half of M6-07 and the one function that answers what
// a rung buys: public.class_autonomy(), the two new runner_settings threshold columns
// (auto_done_rung, cap_relax_rung), runner_verdicts.ladder_applied_at, and the step-7a runbook
// line that calls public.verdict_ladder_signal().
//
// WHAT THE DEFECT WAS, so a later editor does not read the ladder as a working mechanism it can
// tidy: measured on the live database 2026-09-02 rather than reasoned about, public.runner_ladder
// had been written by exactly ONE function -- apply_ladder_decision(), keyed on runner_items.decision,
// i.e. John's taps, an input SES-285 retired. 118 runner_verdicts rows existed (81 approve, 37
// block, 8 with no backlog_id) and NONE had ever touched the ladder. `tooling` had not moved from
// 13/42 since 2026-08-24 and no class had moved at all. So M6-07 -- "the trust ladder's inputs are
// verifier verdicts and post-window reversals" -- was half-wired: SES-286a connected the
// reversals, the verdicts were a dead letter, and separately NOTHING anywhere read a rung to grant
// anything, which is the finding that had sat on SES-122's own row since 2026-08-22.
//
// A BLOCK MUST NEVER TOUCH THE RUNG, and that is the single fact this file exists to hold down
// from the doc side. ladder_apply_signal now takes THREE signals, and `reset` exists precisely
// because `demote` already did and is the wrong one here: a demote drops a rung and is John's
// reversal of a delivery (SES-286a); a red gate is the verifier's judgment on one ship, so it costs
// the streak and nothing else. A later edit that "simplifies" block to demote hands the verifier
// John's own authority to take a rung away, and every word about a trust ladder stays true while
// the code does that.
//
// THRESHOLDS ARE COLUMNS, NEVER LITERALS (SES-146), and the live arm below is written so it CANNOT
// pass by restating them. It reads auto_done_rung and cap_relax_rung out of runner_settings in the
// same test run and recomputes what class_autonomy should have answered from those values. A test
// that hardcoded 3 and 5 would go green against a function that hardcoded 3 and 5, which is the
// exact drift the columns exist to prevent.
//
// THREE CONTENT ARMS, AND THE SPLIT IS DELIBERATE (the SES-281 / SES-297 / SES-286a precedent).
//   * The DOC arm always runs. docs/runbooks/runner-cycle.md step 7a is where a cycle learns to
//     make the call at all, so the assertion is on the STEP'S OWN SLICE, not on the file -- a
//     mention of verdict_ladder_signal 400 lines away in some other step would be a rule nobody
//     reaches at verdict time. Every clause is paired with a negative control ("would this still
//     pass if the change did nothing?" must answer "no"), and a meta-assertion checks the controls
//     themselves (the SES-158 lesson: a control that changes nothing proves nothing).
//   * The LIVE arms run only with SUPABASE_URL + SUPABASE_SERVICE_KEY and are DECLARED not-run
//     otherwise (SES-180 notRun()), never silently skipped. runner_settings, runner_verdicts,
//     runner_ladder and the two new functions hold ZERO anon/authenticated grants (asserted live
//     at this ship, both directions, with has_function_privilege), so there is no browser-key path
//     to any of this and the service key is the only way in.
//   * Every read is paired with a MADE-UP COLUMN control that must 400 and every RPC with a
//     made-up-parameter control that must not 200: without them a read returning [] proves
//     nothing, because PostgREST answers an empty table and a mis-spelled filter the same way to a
//     careless reader.
//
// class_autonomy IS STABLE AND ITS PURITY IS ASSERTED BY SIDE EFFECT (runner_ladder rows plus a
// runner_before_images count), because PostgREST cannot read pg_proc.provolatile. The way this
// breaks is someone "improving" the helper into something that stamps the rung it just granted.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied -- see the notRun() at the foot.
// verdict_ladder_signal() and ladder_apply_signal('reset') are WRITERS: they move runner_ladder,
// insert before-images and stamp ladder_applied_at. A permanent regression test must never do that
// on the live board (the SES-196 / SES-218 / SES-275 refusal), and this suite reaches Supabase only
// over PostgREST, which cannot open a transaction to roll a fixture back. Those arms were measured
// at this ship inside one deliberately failing DO block, every fixture rolled back, and the numbers
// are recorded verbatim below.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CYCLE_REL = "docs/runbooks/runner-cycle.md";
const CYCLE = path.join(ROOT, CYCLE_REL);

// Step 7a's own slice, bounded by its own bullet and the close-out bullet that follows it. Sliced
// rather than searched whole-file on purpose: this rule is only a rule where the cycle is standing
// when it has a verdict id in hand.
const STEP_7A_START = "- **7a. THE REVIEWER LANE";
const STEP_7A_END = "- Close-out ticket update";

// The line the verifier itself prints when the row lands (scripts/verifier.js's emit()). It is the
// CUE the runbook tells a cycle to wait for, so the ordering clause below is anchored on it.
const RECORDING_CUE = "recorded as runner_verdicts";

// ---------------------------------------------------------------------------
// Pure readers
// ---------------------------------------------------------------------------

// Returns "" when the block is absent -- itself a finding rather than a crash, since a checker
// that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// The runbook is hard-wrapped, so a load-bearing phrase can straddle a line break and a literal
// match fails for a reason that has nothing to do with the rule (the SES-194 lesson).
export const norm = s => s.replace(/\s+/g, " ");

export const step7a = md => norm(extractBlock(md, STEP_7A_START, STEP_7A_END));

// ---------------------------------------------------------------------------
// The doc clauses. A clause earns its place only if REMOVING it would change what a cycle does.
// ---------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "step-7a-calls-verdict-ladder-signal",
    detail:
      "step 7a must still name public.verdict_ladder_signal(. It is the ONLY caller of the " +
      "verdict half of M6-07 -- scripts/verifier.js is a self-certifying path and part (b) owns " +
      "it -- so without this line the function exists and nothing invokes it, which is exactly " +
      "the state SES-122 measured: 118 verdict rows, zero ladder effects",
    test: s => s.includes("public.verdict_ladder_signal("),
    breaks: s => s.split("public.verdict_ladder_signal(").join("public.some_other_function("),
  },
  {
    id: "the-call-comes-after-the-verdict-is-recorded",
    detail:
      "the call must come AFTER the point the verdict is recorded, and step 7a must name the cue " +
      "the verifier actually prints (\"" + RECORDING_CUE + " <id>\", its own emit()). The " +
      "function takes a verdict id, so a line placed above the recording is a line a cycle " +
      "cannot execute -- it has nothing to pass -- and the honest-looking response to that is to " +
      "skip it",
    test: s => {
      const cue = s.indexOf(RECORDING_CUE);
      const call = s.indexOf("public.verdict_ladder_signal(");
      return cue >= 0 && call > cue;
    },
    // Moves the call ABOVE the cue rather than deleting either: a delete would also break the
    // clause above and prove nothing about ORDER, which is what this clause is for.
    breaks: s => {
      const call = "public.verdict_ladder_signal(";
      return s.split(call).join("") .replace(STEP_7A_START, STEP_7A_START + " " + call);
    },
  },
  {
    id: "a-block-costs-the-streak-and-not-the-rung",
    detail:
      "step 7a must still say an approve promotes the class and a block resets the streak while " +
      "LEAVING THE RUNG WHERE IT WAS. This is the one asymmetry in the mechanism: `demote` " +
      "(rung - 1) already exists and is John's reversal signal (SES-286a). A runbook that says " +
      "\"a block demotes\" is the instruction under which a later session wires the verifier to " +
      "take a rung away, and a red gate on a sound change would then cost trust permanently",
    test: s =>
      /\bapprove\b/i.test(s) && /promotes?\b/i.test(s) &&
      /\bblock\b/i.test(s) && /resets? (that )?class'?s? streak/i.test(s) &&
      /leaves its rung/i.test(s) && !/a `?block`? demotes/i.test(s),
    breaks: s => s.replace(/leaves its rung exactly where it was/i, "demotes it one rung"),
  },
  {
    id: "the-call-is-idempotent-per-verdict",
    detail:
      "step 7a must still say the call is idempotent per verdict. runner_verdicts.ladder_applied_at " +
      "is what makes that true, and the reason it has to be WRITTEN DOWN is that a chained drain " +
      "continuation (SES-140) re-reads its predecessor's output: a cycle that believes a re-run " +
      "double-counts will avoid the line when unsure, and the ladder silently stops being fed",
    test: s => /idempotent/i.test(s),
    breaks: s => s.replace(/idempotent/i, "run-once"),
  },
  {
    id: "the-rule-is-cited-not-restated",
    detail:
      "step 7a must still cite M6-07 by name. docs/RUNNER-GOV-M6-REQUIREMENTS.md is the canonical " +
      "home of the contract this line implements; a procedure that stops naming its rule is a " +
      "procedure a later trim removes as unexplained ceremony",
    test: s => /M6-07/.test(s),
    breaks: s => s.replace(/M6-07/, "M6-99"),
  },
];

function readCycle() {
  return fs.readFileSync(CYCLE, "utf8");
}

function theShippedRunbookIsWired() {
  const md = readCycle();
  const s = step7a(md);
  assert.ok(
    s.length > 0,
    `step 7a is missing from ${CYCLE_REL} (looked for ${JSON.stringify(STEP_7A_START)}) -- the ` +
      "reviewer lane is where a verdict exists at all, so there is nowhere else for the ladder " +
      "call to live",
  );
  for (const c of CLAUSES) {
    assert.ok(c.test(s, md), `${CYCLE_REL} step 7a lost clause "${c.id}": ${c.detail}`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL: an absent block must be reported as a finding, not crash.
function aMissingBlockIsFlagged() {
  assert.strictEqual(extractBlock("nothing here", STEP_7A_START, STEP_7A_END), "",
    'extractBlock() must return "" for an absent block so the caller can report it');
  assert.strictEqual(step7a("nothing here"), "",
    "step7a() on a runbook with no 7a must be empty, not throw");
}

// EVERY CLAUSE HAS TEETH: apply its own break and the clause must fail. Without this the suite can
// go green on clauses that match anything.
function everyClauseHasTeeth() {
  const md = readCycle();
  const s = step7a(md);
  for (const c of CLAUSES) {
    const broken = c.breaks(s, md);
    assert.ok(
      !c.test(broken, md),
      `clause "${c.id}" still passes against its own broken slice -- it is not testing what its ` +
        "detail claims, and would go green through the exact edit it exists to catch",
    );
  }
}

// META-CONTROL (the SES-158 lesson): a break that changes nothing proves nothing, so the breaks
// themselves are checked for having actually mutated their input.
function aVacuousMutationFailsItsOwnControl() {
  const md = readCycle();
  const s = step7a(md);
  for (const c of CLAUSES) {
    assert.notStrictEqual(
      c.breaks(s, md), s,
      `clause "${c.id}"'s break() returned its input unchanged -- the teeth check above would ` +
        "pass vacuously, which is a control that controls nothing",
    );
  }
}

// ---------------------------------------------------------------------------
// The live arms -- Supabase over PostgREST. Read-only by construction; the read-only-ness of the
// RPC is ASSERTED below rather than assumed.
// ---------------------------------------------------------------------------

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

async function pg(url, key, pathAndQuery, init) {
  const res = await raw(url, key, pathAndQuery, init);
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

async function countOf(url, key, q) {
  const res = await fetch(`${base(url)}/rest/v1/${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) throw new Error(`${q} returned HTTP ${res.status}`);
  return Number((res.headers.get("content-range") || "/0").split("/")[1]);
}

// THE PAIRED CONTROL. A read that succeeds proves the column exists only if the SAME read against
// a column that cannot exist FAILS -- otherwise a permissive gateway, a cached response or a
// mis-read [] all look like a pass.
async function reachableWithControl(url, key, table, column, what) {
  const good = await raw(url, key, `${table}?select=${column}&limit=1`);
  assert.ok(
    good.ok,
    `${table}?select=${column} returned HTTP ${good.status} -- ${what}. This is the arm that ` +
      "fails against the un-migrated database, where neither new column existed (measured " +
      "2026-09-02, before migration ses122a_verdict_ladder_signals)",
  );
  const rows = await good.json();
  assert.ok(Array.isArray(rows), `${table}?select=${column} returned a non-array payload`);

  const bad = await raw(url, key, `${table}?select=ses122_no_such_column&limit=1`);
  assert.strictEqual(
    bad.status, 400,
    `the control read of ${table} for a made-up column returned HTTP ${bad.status}, not 400 -- ` +
      `so the assertion above proves nothing about whether ${column} exists, only that the ` +
      "request was answered",
  );
  return rows;
}

// One RPC row, with the made-up-parameter control that proves PostgREST resolved the function by
// its real signature rather than answering something generically.
async function autonomy(url, key, priorityClass) {
  const rows = await pg(url, key, "rpc/class_autonomy", {
    method: "POST",
    body: JSON.stringify({ p_priority_class: priorityClass }),
  });
  assert.ok(
    Array.isArray(rows) && rows.length === 1,
    `class_autonomy(${JSON.stringify(priorityClass)}) returned ${JSON.stringify(rows)} -- it must ` +
      "return EXACTLY ONE ROW for every input, including an unclassed one. A caller cannot tell " +
      "an empty result from a permissive one, so 'no rows' is the shape this function must never " +
      "have",
  );
  return rows[0];
}

async function theThresholdsAreColumnsAndTheRungIsRead() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arms: the two runner_settings threshold columns, runner_verdicts.ladder_applied_at, " +
        "and class_autonomy() over a tracked class / an untracked class / NULL -- each with its " +
        "made-up-column or made-up-parameter control, and the RPC's purity asserted by side effect",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The doc arm above still graded all " +
        "five clauses of step 7a against the committed runbook. Canonical invocation: " +
        "STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // 1. WHAT A RUNG BUYS IS TWO COLUMNS. Read them; never restate them here.
  const settings = await reachableWithControl(
    url, key, "runner_settings", "auto_done_rung,cap_relax_rung",
    "the auto-done bar and the cap relaxation have no columns to live in, so class_autonomy() is " +
      "either reading literals or not shipped -- and SES-146 is that every cadence number in this " +
      "system is a runner_settings column",
  );
  assert.strictEqual(settings.length, 1,
    `runner_settings returned ${settings.length} rows -- it is a singleton (id = 1, ` +
    "ck_runner_settings_singleton), and a second row means two disagreeing thresholds");
  const { auto_done_rung: autoDoneRung, cap_relax_rung: capRelaxRung } = settings[0];
  for (const [name, v] of [["auto_done_rung", autoDoneRung], ["cap_relax_rung", capRelaxRung]]) {
    assert.ok(Number.isInteger(v) && v >= 0,
      `runner_settings.${name} is ${JSON.stringify(v)}; it must be a non-negative integer ` +
      "(ck_runner_settings_" + name + "). A NULL threshold makes every grant NULL, and the whole " +
      "point of the column is that the number is answerable");
  }

  // 2. THE IDEMPOTENCY STAMP. Without it a re-run of step 7a's line counts one gate twice.
  await reachableWithControl(
    url, key, "runner_verdicts", "ladder_applied_at",
    "a verdict cannot record that it has been counted, so verdict_ladder_signal() has no way to " +
      "refuse a second call and a chained continuation re-reading its predecessor's output " +
      "awards the class two rungs for one gate",
  );

  const before = {
    ladder: await pg(url, key, "runner_ladder?select=work_class,rung,streak&order=work_class"),
    images: await countOf(url, key, "runner_before_images?select=id"),
    stamped: await countOf(url, key, "runner_verdicts?select=id&ladder_applied_at=not.is.null"),
  };

  // 3. A TRACKED CLASS. auto_done and the extras are RECOMPUTED from the columns read above, so
  // this cannot pass against a function that hardcoded the thresholds.
  const tooling = await autonomy(url, key, "P10 - Tooling");
  assert.strictEqual(tooling.work_class, "tooling",
    `class_autonomy('P10 - Tooling').work_class is ${JSON.stringify(tooling.work_class)}, not ` +
    "'tooling' -- the digit -> work-class mapping has one home (ladder_work_class) and this is " +
    "its consumer");
  assert.ok(Number.isInteger(tooling.rung) && Number.isInteger(tooling.streak),
    `class_autonomy('P10 - Tooling') returned rung=${JSON.stringify(tooling.rung)} ` +
    `streak=${JSON.stringify(tooling.streak)}; tooling HAS a runner_ladder row, so both must be ` +
    "integers read off it. NULL here means the join stopped finding the row");
  assert.strictEqual(
    tooling.auto_done, tooling.rung >= autoDoneRung,
    `class_autonomy('P10 - Tooling').auto_done is ${tooling.auto_done} at rung ${tooling.rung} ` +
      `against runner_settings.auto_done_rung ${autoDoneRung}. The bar is that column and nothing ` +
      "else; a function carrying its own copy of the number is the drift SES-146 forbids, and it " +
      "would show up as an auto-done ship at a rung John's own settings say is not earned yet",
  );
  const expectedExtra = Math.max(0, tooling.rung - capRelaxRung);
  assert.strictEqual(tooling.extra_files, expectedExtra,
    `class_autonomy('P10 - Tooling').extra_files is ${tooling.extra_files}, expected ` +
    `greatest(0, ${tooling.rung} - ${capRelaxRung}) = ${expectedExtra}`);
  assert.strictEqual(tooling.extra_tasks, expectedExtra,
    `class_autonomy('P10 - Tooling').extra_tasks is ${tooling.extra_tasks}, expected ` +
    `${expectedExtra} -- a rung buys one extra file AND one extra task, so the two move together`);

  // 4. FAIL CLOSED. An untracked class and an absent class both earn NOTHING, and this is the arm
  // that matters most: the failure direction of getting it wrong is a ticket the ladder never
  // rated widening its own caps.
  for (const [input, why] of [
    ["P6 - Agent Enhancement", "a class the six-row ladder does not track"],
    [null, "a ticket with no class at all"],
    ["not a class at all", "a string that is not a class"],
  ]) {
    const a = await autonomy(url, key, input);
    assert.strictEqual(a.work_class, null,
      `class_autonomy(${JSON.stringify(input)}).work_class is ${JSON.stringify(a.work_class)}; ` +
      `${why} must map to null rather than a guess -- a wrong guess grants the wrong class's rung`);
    assert.strictEqual(a.auto_done, false,
      `class_autonomy(${JSON.stringify(input)}).auto_done is ${a.auto_done}; ${why} must earn ` +
      "NOTHING. Note this must hold however the thresholds are set: if auto_done_rung were ever " +
      "0, a version of this function that answered rung 0 for an unclassed ticket would auto-done " +
      "every unclassed delivery on the board");
    assert.strictEqual(a.extra_files, 0,
      `class_autonomy(${JSON.stringify(input)}).extra_files is ${a.extra_files}, must be 0`);
    assert.strictEqual(a.extra_tasks, 0,
      `class_autonomy(${JSON.stringify(input)}).extra_tasks is ${a.extra_tasks}, must be 0`);
  }

  // 5. THE MADE-UP-PARAMETER CONTROL. Proves PostgREST resolved class_autonomy by its real
  // signature -- without it, every 200 above could be some other function answering.
  const bogusParam = await raw(url, key, "rpc/class_autonomy", {
    method: "POST", body: JSON.stringify({ ses122_not_a_param: "x" }),
  });
  assert.ok(
    !bogusParam.ok,
    `rpc/class_autonomy with a made-up parameter returned HTTP ${bogusParam.status} (ok) -- so ` +
      "the calls above prove nothing about the function's signature, and this suite would stay " +
      "green through an overload break (.claude/rules/supabase-function-signature.md)",
  );
  const noSuchFn = await raw(url, key, "rpc/ses122_no_such_function", {
    method: "POST", body: JSON.stringify({}),
  });
  assert.ok(!noSuchFn.ok,
    `rpc/ses122_no_such_function returned HTTP ${noSuchFn.status} (ok) -- the gateway answers ` +
    "anything, so no RPC assertion in this file means what it says");

  // 6. PURITY, asserted by SIDE EFFECT because pg_proc.provolatile is unreachable from here. The
  // way this breaks is someone "improving" class_autonomy into something that stamps the rung it
  // just granted -- which would make a read of the board a write to it.
  const after = {
    ladder: await pg(url, key, "runner_ladder?select=work_class,rung,streak&order=work_class"),
    images: await countOf(url, key, "runner_before_images?select=id"),
    stamped: await countOf(url, key, "runner_verdicts?select=id&ladder_applied_at=not.is.null"),
  };
  assert.deepStrictEqual(
    after, before,
    "calling class_autonomy() moved the board. It is declared STABLE and must touch nothing -- a " +
      "permanent test may call it only because it writes nothing, so this assertion is what keeps " +
      `that true. before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );

  // Every class the mapping can return must be a real runner_ladder row, or class_autonomy answers
  // NULL rung for a class the system believes it tracks -- a silent zero-grant.
  const classes = new Set(before.ladder.map(l => l.work_class));
  for (const wc of ["invention", "enhancement", "agent_creation", "determinism_removal",
                    "bug_fix", "tooling"]) {
    assert.ok(classes.has(wc),
      `runner_ladder has no '${wc}' row, but ladder_work_class() can return it -- class_autonomy ` +
      `would answer a NULL rung and grant nothing for every ${wc} ticket, silently. Live rows: ` +
      `${[...classes].join(", ")}`);
  }
}

async function run() {
  theShippedRunbookIsWired();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  await theThresholdsAreColumnsAndTheRungIsRead();

  notRun(
    "the write paths -- verdict_ladder_signal(), ladder_apply_signal('reset') and " +
      "apply_ladder_decision() -- and every pg_proc fact (provolatile, overload count, EXECUTE " +
      "grants)",
    "all three are WRITERS: they move runner_ladder, insert before-images and stamp " +
      "ladder_applied_at. A permanent regression test must never do that on the live board (the " +
      "SES-196 / SES-218 / SES-275 refusal), and this suite reaches Supabase only over PostgREST, " +
      "which cannot read pg_proc and cannot open a transaction to roll a fixture back. MEASURED AT " +
      "THIS SHIP INSTEAD, live, inside one deliberately failing DO block with every fixture rolled " +
      "back: an approve verdict on a P10 ticket returned applied=true signal=promote and took " +
      "tooling 13/42 -> 13/43 (streak +1, rung unchanged because 43 % 5 <> 0, streak NOT reset -- " +
      "SES-107), stamped ladder_applied_at, and wrote TWO before-images (runner_ladder and " +
      "runner_verdicts); the same call again returned applied=false 'already counted on the ladder " +
      "at <ts>'; a block verdict returned signal=reset with streak 43 -> 0 and RUNG BEFORE = RUNG " +
      "AFTER = 13 asserted explicitly as the control; a verdict on a 'P6 - Agent Enhancement' " +
      "ticket returned applied=false naming the untracked class AND left ladder_applied_at null so " +
      "the row stays re-runnable; an absent verdict id and a NULL id each returned applied=false " +
      "with their own reason; class_autonomy('P9 - Bug Fixes . FLAGGED') read auto_done false at " +
      "rung 1, true at a fixture rung 3, extra_files 0 at rung 3 and 1 at rung 6 (auto_done_rung " +
      "3, cap_relax_rung 5); apply_ladder_decision() on a fixture gated card still returned " +
      "applied=false with the B34 reason and on a fixture accept ship card behaved unchanged, " +
      "which is what makes the inline-CASE replacement transparent; and ladder_apply_signal still " +
      "raised on a nonsense signal, on two actors and on zero actors. Zero fixture residue on " +
      "re-read: tooling back at 13/42, 118 runner_verdicts rows, 0 stamped, 0 fixture verdicts, 0 " +
      "fixture runner_items, 0 runner_verdicts before-images. pg_proc at the same ship: exactly 1 " +
      "overload of each of ladder_apply_signal, ladder_work_class, apply_ladder_decision, " +
      "verdict_ladder_signal and class_autonomy; class_autonomy provolatile='s'; and " +
      "has_function_privilege both directions EXECUTE true for service_role, false for anon and " +
      "authenticated on all five. runner_settings / runner_verdicts / runner_ladder / " +
      "runner_before_images: zero anon/authenticated grant rows of any privilege type.",
  );
}

selfRun(import.meta.url, run);
export default run;
