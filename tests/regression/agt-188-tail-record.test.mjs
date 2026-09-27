// DeepBench v7.0.655 | tests/regression/agt-188-tail-record.test.mjs | AGT-188
//
// TWO HOLES, ONE SHIP: the briefing build did not know whose cycle it was, and step 9's record of
// itself was free text.
//
// MEASURED BEFORE THE EDIT, NOT RECALLED FROM THE TICKET:
//   * `grep -nE 'cycle_id|--cycle' scripts/build-briefing.mjs` returned ONE hit, and it was
//     `resolve_day_token_cap`'s own `p_cycle_id: null` -- nothing on the CLI tied the `--data`
//     narrative to a cycle. `runner_cycles` row `ee5b8998-3c72-4b91-ad0e-d5d261cf2b1f` self-reports
//     a page "BUILT at 673,915 bytes and NOT published (SES-244 bridge) -- built with the
//     predecessor cycle's --data narrative", naming `40d8dfe3-764d-467e-bf2b-7600e522d966`.
//   * `pg_constraint` on `runner_cycles` carries CHECKs on `outcome` and `trigger` and NONE on
//     `last_step`; the 41 step-9 rows of the trailing 20 hours carried SEVEN distinct strings, all
//     seven pinned below. `cycle-heartbeat.js` was the one sanctioned writer and validated only
//     non-blank.
//
// CATEGORY B -- unit + source + doc. NO network, no credentials, no database, no paid call: it
// reads three repo files and imports one pure module. `scripts/build-briefing.mjs` is read as TEXT
// and never imported, because it runs its build on import (top-level await, no CLI guard).
//
// EVERY CLAUSE CARRIES ITS OWN NEGATIVE CONTROL, and the controls are RUN, not described (the
// SES-158 failure, and the LOO-013 lesson: prove WHICH branch fired):
//   (a) the three builder refusals -- each source clause is re-tested against its own one-edit
//       breaks() mutation and must be RED there.
//   (b) tailStep()'s two branches asserted against each other, and parseArgs() refusing all seven
//       live step-9 strings while STILL accepting `7 -- builder: ...`, which is the string this
//       cycle's own heartbeat writes. A refusal that also refused step 7 would have been a green
//       test over a broken runner.
//   (c) step 9 (5b)'s sentence VERBATIM in the runbook, plus this ship's own rotation geometry.
//       (5b) is the DEAD claim of this ticket: `briefed_at IS NULL` is the NEW chip, so a cycle
//       that did not publish must not stamp it, and the sentence is pinned here byte-for-byte so a
//       later cycle reading this ticket's title cannot "fix" it and eat the chip permanently.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { tailStep, parseArgs, STEP_NINE } from "../../scripts/cycle-heartbeat.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const BUILDER_REL = "scripts/build-briefing.mjs";
const CYCLE_REL = "docs/runbooks/runner-cycle.md";
const BRIEFING_REL = "docs/runbooks/briefing-page.md";

const CYCLE_UUID = "f5189a8c-ee65-4d5e-a1ac-1a7b43ea4f47";

// The seven distinct step-9 strings the runner actually wrote in the trailing 20 hours (41 rows).
// They are the population the refusal has to cover; a regex that misses one leaves the eighth
// spelling reachable.
export const LIVE_STEP_NINE = [
  "9 — record written, tail closing",
  "9 — record written, row closed",
  "9 — tail complete (gated before build)",
  "9 — tail: row closed, lease next",
  "9 — serial tail",
  "9 — tail complete",
  "step 9 — record written, tail complete",
];

// The two derived strings. ONE home is scripts/cycle-heartbeat.js; these are the literals a reader
// of the runbook expects to see in the column, so the pair is asserted rather than recomputed.
export const TAIL_COMPLETE = "9 — tail complete: 0 skip rows unbriefed";
export const TAIL_DEFERRED = n => `9 — tail deferred: ${n} skip rows unbriefed (no publish stamped)`;

// (5b)'s ruling, VERBATIM and hard-wrapped exactly as the runbook wraps it. RULED correct by this
// ticket's design pass and deliberately NOT amended: stamping an unpublished row eats the NEW chip.
export const STAMP_RULING =
  "**A CYCLE THAT DID NOT PUBLISH MUST NOT STAMP IT AT ALL** — under the\nbridge that is now " +
  "the ordinary unattended case, and it follows from this rule rather than\nsoftening it: no " +
  "publish means John saw nothing, so every one of those rows is still NEW and the\nstamp would " +
  "eat the chip permanently.";

// ---------------------------------------------------------------------------------------------
// (a) THE BUILDER'S THREE REFUSALS, as source clauses with their own mutations.
// ---------------------------------------------------------------------------------------------
export const BUILDER_CLAUSES = [
  {
    id: "cycle-is-required-with-no-default",
    detail: "`--cycle` is read with NO default and refused when absent -- the `--version` shape, " +
      "because a briefing whose owner is guessed is unfalsifiable from the page",
    test: s => /const CYCLE = arg\('cycle'\);/.test(s)
      && /if \(!CYCLE\) die\('--cycle=<uuid> is required/.test(s),
    breaks: s => s.replace("const CYCLE = arg('cycle');", "const CYCLE = arg('cycle', 'whatever');"),
  },
  {
    id: "data-authored-for-another-cycle-is-exit-2",
    detail: "a `--data` whose `cycle_id` names another cycle dies naming BOTH ids -- the message " +
      "`--data was authored for cycle <data.cycle_id>, not <CYCLE>` is the discriminator (it has " +
      "0 hits on the pre-change tree)",
    test: s => s.includes("if (data.cycle_id !== CYCLE) {")
      && s.includes("die(`--data was authored for cycle ${data.cycle_id}, not ${CYCLE}`)"),
    breaks: s => s.replace("if (data.cycle_id !== CYCLE) {", "if (false) {"),
  },
  {
    id: "cycle-id-is-the-sixth-authored-field",
    detail: "`cycle_id` is the SIXTH entry of AUTHORED, so an absent one is exit 2 rather than a " +
      "silently unowned narrative -- the same rule as a NULL plain_* drawing a red defect line",
    test: s => {
      const m = s.match(/const AUTHORED = \[([^\]]*)\]/);
      if (!m) return false;
      const fields = m[1].split(",").map(x => x.trim().replace(/^'|'$/g, ""));
      return fields.length === 6 && fields[5] === "cycle_id";
    },
    breaks: s => s.replace(", 'cycle_id']", "]"),
  },
  {
    id: "the-cycle-must-exist-and-agree-on-its-version",
    detail: "one `runner_cycles?id=eq.<CYCLE>&select=id,version` read: no row is exit 2, and a " +
      "NON-NULL version that differs from `--version` is exit 2. The null arm stays conditional " +
      "on purpose -- a gated_before_build row carries `version IS NULL`, an unclaimed version and " +
      "not a disagreement",
    test: s => s.includes("await sel(`runner_cycles?id=eq.${CYCLE}&select=id,version`)")
      && s.includes("if (!cycleRow) die(")
      && /if \(cycleRow\.version != null && cycleVersionArg && cycleRow\.version !== cycleVersionArg\)/.test(s),
    breaks: s => s.replace("if (cycleRow.version != null && cycleVersionArg &&",
      "if (cycleVersionArg &&"),
  },
  {
    id: "the-documented-command-carries-the-flag-it-now-requires",
    detail: "briefing-page.md step 1a's own command block passes `--cycle=<cid>` and the `--data` " +
      "column of the split table names `cycle_id` -- a runbook that documents the pre-change call " +
      "sends the next cycle straight into the refusal",
    file: BRIEFING_REL,
    test: s => s.includes("--cycle=<cid>") && /\|\s*`cycle_id`/.test(s)
      && s.includes("--data was authored for cycle <id>, not <cid>"),
    breaks: s => s.split("--cycle=<cid>").join("--out briefing-out.html"),
  },
];

function everyBuilderClauseHoldsAndHasTeeth() {
  const sources = { [BUILDER_REL]: read(BUILDER_REL), [BRIEFING_REL]: read(BRIEFING_REL) };
  for (const c of BUILDER_CLAUSES) {
    const rel = c.file || BUILDER_REL;
    const src = sources[rel];
    assert.ok(c.test(src), `AGT-188 (a) "${c.id}" is NOT in ${rel}: ${c.detail}`);
    assert.ok(!c.test(c.breaks(src)),
      `AGT-188 (a) "${c.id}" still passes with its own rule removed -- it is not discriminating, ` +
      "which is the SES-158 failure this control exists to catch");
  }
  return BUILDER_CLAUSES.length;
}

// ---------------------------------------------------------------------------------------------
// (b) THE DERIVED TAIL STRING, both branches, and the refusal's two directions.
// ---------------------------------------------------------------------------------------------
function tailStepDerivesBothBranches() {
  assert.strictEqual(tailStep(0), TAIL_COMPLETE,
    "tailStep(0) must read as a COMPLETE tail -- zero unbriefed skip rows is the finished state");
  assert.strictEqual(tailStep(11), TAIL_DEFERRED(11),
    "tailStep(n>0) must read as a DEFERRED tail naming the count -- an unpublished cycle leaves " +
    "the (5b) stamp unstamped on purpose, and that is a state, never an absence");
  // Negative control: the two branches must not collapse into one another.
  assert.notStrictEqual(tailStep(11), tailStep(0),
    "tailStep must DISCRIMINATE -- a function returning one string for both counts would make " +
    "every tail read complete, which is the free text this replaced");
  assert.ok(!tailStep(0).includes("deferred") && !tailStep(1).includes("tail complete"),
    "neither branch may carry the other's word: 'deferred' at 0, or 'tail complete' at 1, is the " +
    "wrong branch firing (the LOO-013 lesson -- prove WHICH branch fired)");
  assert.strictEqual(tailStep("0"), TAIL_COMPLETE,
    "a count that arrived as a string must take the zero branch -- PostgREST row counts and CLI " +
    "arguments both reach this as text");
}

function parseArgsRefusesEveryLiveStepNineAndNothingElse() {
  for (const step of LIVE_STEP_NINE) {
    const r = parseArgs([`--cycle=${CYCLE_UUID}`, `--step=${step}`]);
    assert.ok(r.error, `parseArgs must REFUSE the live step-9 string ${JSON.stringify(step)} -- ` +
      "all seven of these were written to last_step in one 20-hour window");
    assert.ok(/--tail/.test(r.error),
      `the refusal of ${JSON.stringify(step)} must NAME --tail: a refusal that does not say what ` +
      "to run instead is how an eighth spelling gets invented");
    assert.ok(STEP_NINE.test(step), `STEP_NINE must match ${JSON.stringify(step)}`);
  }
  // THE NEGATIVE CONTROL THAT MATTERS: step 7's own heartbeat -- the string this very cycle wrote
  // four times -- must still be accepted. A regex that swallowed it would have stopped the runner.
  const ok = parseArgs([`--cycle=${CYCLE_UUID}`, "--step=7 — builder: task 4 the guard test"]);
  assert.ok(!ok.error, `parseArgs must still accept a step-7 heartbeat; got ${ok.error}`);
  assert.strictEqual(ok.step, "7 — builder: task 4 the guard test");
  assert.strictEqual(ok.tail, false);
  for (const fine of ["8b — tripwires", "step 19 — not step 9", "90 — not step 9", "9b — not step 9"]) {
    assert.ok(!parseArgs([`--cycle=${CYCLE_UUID}`, `--step=${fine}`]).error,
      `\\b anchors the refusal to step NINE; ${JSON.stringify(fine)} is a different step and must ` +
      "still be writable");
  }
  // --tail is the sanctioned path, and it cannot be combined with a hand-written step.
  const tail = parseArgs([`--cycle=${CYCLE_UUID}`, "--tail"]);
  assert.ok(!tail.error && tail.tail === true && tail.step === undefined,
    `--tail alone must parse and carry no step; got ${JSON.stringify(tail)}`);
  const both = parseArgs([`--cycle=${CYCLE_UUID}`, "--tail", "--step=7 — builder"]);
  assert.ok(both.error && /mutually exclusive/.test(both.error),
    "--tail beside --step must be refused: the whole point is that the string is DERIVED");
  // The pre-existing guards must survive the new arms.
  assert.ok(parseArgs(["--step=7 — builder"]).error, "a heartbeat with no --cycle names nothing");
  assert.ok(parseArgs(["--cycle=not-a-uuid", "--tail"]).error, "--cycle must still be a uuid");
  assert.ok(parseArgs([`--cycle=${CYCLE_UUID}`, "--step=   "]).error, "a blank --step is still refused");
}

// ---------------------------------------------------------------------------------------------
// (c) THE RUNBOOK: (5b) verbatim, the (6) command line, and this ship's own rotation.
// ---------------------------------------------------------------------------------------------
function theRunbookKeepsTheRulingAndGainsTheCommand() {
  const md = read(CYCLE_REL);
  const stamps = md.split("\n").filter(l => l.startsWith("<!-- DeepBench v"));
  // The body is lines 6+: a fact surviving only in a stamp has not survived, the next rotation
  // deletes it. (5b) is asserted in the BODY for exactly that reason.
  const body = md.split("\n").slice(stamps.length).join("\n");

  assert.ok(body.includes(STAMP_RULING),
    "step 9 (5b)'s ruling must be in the runbook BODY byte-for-byte: \"A CYCLE THAT DID NOT " +
    "PUBLISH MUST NOT STAMP IT AT ALL\", with the reason it is safe (briefed_at IS NULL *is* the " +
    "NEW chip) attached. AGT-188 RULED this correct and did not amend it -- a later cycle reading " +
    "this ticket's title must not 'fix' it and eat the chip permanently");
  // Negative control: the ruling's own one-edit mutation must fail this clause.
  assert.ok(!body.replace("MUST NOT STAMP IT AT ALL", "may stamp it").includes(STAMP_RULING),
    "the (5b) clause is not discriminating -- softening the ruling left it green");

  assert.ok(body.includes(
    "`node scripts/cycle-heartbeat.js --cycle=<cid> --tail` — derives the one canonical " +
    "`last_step`; never hand-write it here."),
    "the tail's (6) must carry the --tail command and the sentence that forbids hand-writing " +
    "last_step -- the runbook prescribed NO step-9 string at all before this ship, which is why " +
    "41 rows carried seven");
  assert.ok(!body.replace("--tail` — derives", "--tail` — suggests").includes(
    "--tail` — derives the one canonical `last_step`; never hand-write it here."),
    "the (6) clause is not discriminating");

  // The rotation, and the ONE thing a later editor will get wrong. session-hygiene check 7 caps
  // the header at 5, so this ship dropped v7.0.555 (archived VERBATIM in docs/SESSIONS.md) to make
  // room -- and placed its own stamp at line TWO, because agt-133:132 and ses-424c:67 both pin
  // v7.0.650 as the FIRST line by literal string. That is a disclosed deviation from newest-first,
  // pinned here so the next rotation sees it as a decision rather than a mistake to tidy.
  assert.strictEqual(stamps.length, 5,
    `session-hygiene check 7 caps ${CYCLE_REL} at 5 header stamps; got ${stamps.length}`);
  assert.ok(stamps[0].startsWith("<!-- DeepBench v7.0.650 | runbooks/runner-cycle.md | AGT-185"),
    "v7.0.650 must stay line 1: agt-133:132 and ses-424c:67 pin it there by literal string");
  assert.ok(stamps[1].startsWith("<!-- DeepBench v7.0.655 | runbooks/runner-cycle.md | AGT-188"),
    "this ship's stamp is line 2 -- deliberately not line 1 (see above), and a rotation that " +
    "dropped it entirely would leave no written record of this ship in the runbook");
  assert.ok(!md.includes("<!-- DeepBench v7.0.555 | runbooks/runner-cycle.md"),
    "v7.0.555 is the stamp this ship rotated out; it must no longer be in the runbook");
  const sessions = read("docs/SESSIONS.md");
  const archived = "<!-- DeepBench v7.0.555 | runbooks/runner-cycle.md | AGT-86 slice 8b";
  assert.strictEqual(sessions.split(archived).length - 1, 1,
    "the rotated v7.0.555 stamp must be in docs/SESSIONS.md exactly ONCE and VERBATIM -- a stamp " +
    "dropped instead of moved loses the only written record of that ship (SES-164 step 3)");
  return stamps.length;
}

async function run() {
  const clauses = everyBuilderClauseHoldsAndHasTeeth();
  tailStepDerivesBothBranches();
  parseArgsRefusesEveryLiveStepNineAndNothingElse();
  const stamps = theRunbookKeepsTheRulingAndGainsTheCommand();

  console.log(`[AGT-188] ${clauses} builder/runbook source clauses hold, each RED under its own ` +
    `breaks(); tailStep derives both branches (${JSON.stringify(tailStep(0))} / ` +
    `${JSON.stringify(tailStep(11))}); parseArgs refuses all ${LIVE_STEP_NINE.length} live step-9 ` +
    `strings naming --tail and still accepts a step-7 heartbeat; (5b)'s ruling is byte-for-byte in ` +
    `the body, the (6) --tail command is there, ${stamps} header stamps with v7.0.650 first and ` +
    `v7.0.655 second, v7.0.555 archived verbatim in docs/SESSIONS.md`);
}

export default run;
selfRun(import.meta.url, run);
