// DeepBench v7.0.881 | tests/regression/agt-502-trial-token-split.test.mjs | AGT-502
//
// FEATURE: AGT-502 -- three differently-priced quantities stop being one number, and the reported
// trial count starts coming off the log the trial wrote.
//
// WHAT WAS WRONG, MEASURED. `scripts/model-trial.js` summed `usage.input_tokens`,
// `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens` into one value and passed
// it to `scripts/agent-log.js` as `--input-tokens`; `scripts/audit-cluster.js` held a byte-identical
// second copy of the same expression. A cache read bills about 0.1x an uncached input token, so the
// column held a figure nothing can be priced from, and both cache columns stored NULL. Live rows,
// read this session rather than recalled: `ai_activity_log` 72661 (2026-10-16, a
// `model-assignment:trial:depth0` call) is 6,885,415 / NULL / NULL, and 64526 is 3,187,074 /
// NULL / NULL. Separately, the reported trial count was `kept.length` -- the pairs whose child
// exited 0 -- while the row is logged inside `runCandidate()` BEFORE the answer is scored, so the
// `model-watch-2026-10-16` report row reads `trials 0` over a window that holds exactly 1 such call.
//
// NO LIVE WRITE, NO MODEL CALL (pattern:76). Every arm drives exported pure code or reads a file in
// the repo. Running the real trial would spend a 60/200-turn `claude -p` run, which is what the
// ticket is about; the seam is proved instead at the boundary that was broken -- the derivation's
// output handed to the REAL CLI parser that used to refuse it.
//
// ARMS, each with a control that must fail (docs/STANDARDS.md Section 4, the LOO-013 lesson):
//   A  the parser: cachePairFrom()/parseArgs() take the pair, refuse a half pair BY NAME, and store
//      absent as NULL and never 0. CONTROL: the half pair must error and name the missing flag.
//   B  the split, both ways: usageSplit() over row 72661's own figures gives input ALONE, the three
//      input quantities still sum to 6,885,415, and the total keeps the fourth. CONTROL: the old
//      summed expression is NOT what reaches --input-tokens any more, and an envelope with no cache
//      split still reports input == the old sum (the no-cache case must not move).
//   C  both homes, one change: model-trial.js and audit-cluster.js each pass the two new flags and
//      neither still carries the three-term sum. CONTROL: the retired expression is detectable when
//      present, so a green arm means it is gone rather than that the regex never matches.
//   D  the count, both ways: reportedTrialCount() reads the logged rows and never `kept` -- one
//      logged row with nothing kept is 1, no logged rows with a kept pair is 0 -- and
//      trialLogQuery() filters by the trial feature and both window bounds.
//   E  the meter, fail closed: step 0's FIRST action is public.routine_meter_ok(), it stops on a
//      false `ok` AND on the query erroring at all, the `NO_READING` conjunction is gone, the room
//      query is kept, and the drift-checked prompt block is untouched.
//
// BASELINE: RED on the unchanged tree -- agent-log.js exports no cachePairFrom and refuses
// --cache-read-tokens, model-trial.js exports no usageSplit, model-assignment.js exports no
// reportedTrialCount, and the runbook's step 0 opens on the stamp rather than the meter.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

import { cachePairFrom, parseArgs, tokenPairFrom } from "../../scripts/agent-log.js";
import { usageSplit } from "../../scripts/model-trial.js";
import { reportedTrialCount, trialLogQuery, TRIAL_LOG_FEATURE } from "../../scripts/model-assignment.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lf = t => String(t).replace(/\r\n/g, "\n");
const read = p => lf(fs.readFileSync(path.join(ROOT, p), "utf8"));

// parseArgs() validates --ai-type against the SERVICE_CATALOG and the list is injectable, so the
// arms grade the token rules rather than the catalog (ses-423-self-observation.test.mjs's shape).
const CATALOG = ["agent-turn"];
const BASE_ARGV = ["--agent=devmanager", "--capability=model-assignment", "--model=claude-opus-5",
  "--ai-type=agent-turn", "--feature=model-assignment:trial:depth0"];

// Row 72661's TOTAL is live and read this session (6,885,415 input / 48,527 output, both cache
// columns NULL). The three-way decomposition below is CONSTRUCTED, not read -- the live row cannot
// say what its split was, which is the defect -- and it is chosen so the three input quantities sum
// to exactly the figure the column holds. That sum is what the arm checks, so the arm is a statement
// about the derivation rather than about numbers nobody measured.
const ROW_72661 = Object.freeze({
  input_tokens: 1_204_112, cache_creation_input_tokens: 181_303, cache_read_input_tokens: 5_500_000,
  output_tokens: 48_527,
});
const ROW_72661_LOGGED_INPUT = 6_885_415;   // live value of ai_activity_log.input_tokens, read 2026-10-21

// --- A. the parser ------------------------------------------------------------------------------
function armA() {
  // Absent is the third outcome: NULL, never 0. A stored 0 asserts "this call read nothing from
  // cache", which is a measurement nobody made (SES-423's rule, unchanged).
  assert.deepStrictEqual(cachePairFrom(undefined, undefined),
    { cacheCreationInputTokens: null, cacheReadInputTokens: null }, "both absent must be NULL/NULL");
  const none = parseArgs(BASE_ARGV, CATALOG);
  assert.ok(!none.error, `an argv with no cache flags must be accepted, got: ${none.error}`);
  assert.strictEqual(none.cacheCreationInputTokens, null, "absent carries through as NULL, not 0");
  assert.strictEqual(none.cacheReadInputTokens, null, "absent carries through as NULL, not 0");
  assert.notStrictEqual(none.cacheCreationInputTokens, 0, "NULL and 0 are different assertions");

  // The pair, through the real parser -- this is the flag combination that exited 2 before the ship.
  const both = parseArgs([...BASE_ARGV, "--input-tokens=1204112", "--output-tokens=48527",
    "--cache-creation-tokens=181303", "--cache-read-tokens=5500000"], CATALOG);
  assert.ok(!both.error, `parseArgs must accept both cache flags, got: ${both.error}`);
  assert.strictEqual(both.inputTokens, 1_204_112, "input_tokens is the uncached input ALONE");
  assert.strictEqual(both.cacheCreationInputTokens, 181_303);
  assert.strictEqual(both.cacheReadInputTokens, 5_500_000);

  // CONTROL: the half pair. Refused, non-zero, and it must NAME the missing flag -- a refusal that
  // does not say which half is missing is the SES-423 defect wearing new clothes.
  for (const [present, missing] of [["cache-read-tokens", "cache-creation-tokens"],
                                    ["cache-creation-tokens", "cache-read-tokens"]]) {
    const half = parseArgs([...BASE_ARGV, `--${present}=12`], CATALOG);
    assert.ok(half.error, `control: --${present} alone must be refused`);
    assert.match(half.error, new RegExp(`--${missing}`), `the refusal must name --${missing}`);
  }
  // The two pairs are INDEPENDENT: a cache pair with no input/output pair is legal, and the reverse.
  const cacheOnly = parseArgs([...BASE_ARGV, "--cache-creation-tokens=1", "--cache-read-tokens=2"], CATALOG);
  assert.ok(!cacheOnly.error, `a cache pair without the input pair must stand, got: ${cacheOnly.error}`);
  assert.strictEqual(cacheOnly.inputTokens, null, "the input pair is still unmeasured here");
  assert.deepStrictEqual(tokenPairFrom(undefined, undefined), { inputTokens: null, outputTokens: null },
    "the input/output rule is untouched by this ship");
  // A malformed or negative count is still a hard error, on both new flags.
  for (const bad of ["-2", "1.5", "abc", ""]) {
    const r = cachePairFrom(bad, "5");
    assert.ok(r.error, `control: --cache-creation-tokens=${JSON.stringify(bad)} must be refused`);
  }
}

// --- B. the split, both ways --------------------------------------------------------------------
function armB() {
  const s = usageSplit(ROW_72661);
  // The three input quantities still account for every token the old column held...
  assert.strictEqual(s.inputTokens + s.cacheCreationTokens + s.cacheReadTokens, ROW_72661_LOGGED_INPUT,
    "the three input quantities must still sum to the figure the column held (6,885,415)");
  // ...and the number that now reaches --input-tokens is the uncached input ALONE.
  assert.strictEqual(s.inputTokens, ROW_72661.input_tokens, "--input-tokens is usage.input_tokens alone");
  assert.ok(s.inputTokens < ROW_72661_LOGGED_INPUT,
    `the split must be a real split: ${s.inputTokens} must be below the old ${ROW_72661_LOGGED_INPUT}`);
  assert.ok(s.cacheCreationTokens > 0 && s.cacheReadTokens > 0,
    "both cache columns must be non-zero for this fixture -- NULL/NULL is the defect");
  // The total keeps its own name, which is what the trial's `tokens:` has always meant.
  assert.strictEqual(s.totalTokens, ROW_72661_LOGGED_INPUT + ROW_72661.output_tokens,
    "totalTokens is every quantity the call spent, output included");

  // CONTROL: the no-cache case must NOT move. An envelope that reports no cache split spent none,
  // so input alone and the old sum are the same number and nothing about that call changed.
  const plain = usageSplit({ input_tokens: 8_123, output_tokens: 642 });
  assert.strictEqual(plain.inputTokens, 8_123, "no cache split: input is unchanged");
  assert.strictEqual(plain.cacheCreationTokens, 0);
  assert.strictEqual(plain.cacheReadTokens, 0);
  assert.strictEqual(plain.totalTokens, 8_765);
  // An absent usage object is the parse-failure path runCandidate() still logs under (§19k).
  assert.deepStrictEqual(usageSplit(undefined),
    { inputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, outputTokens: 0, totalTokens: 0 },
    "an unparseable envelope still derives four zeroes rather than throwing");

  // THE SEAM, end to end without a model call: the derivation's own output, handed to the REAL CLI
  // parser that refused these flags before this ship.
  const argv = [...BASE_ARGV, `--input-tokens=${s.inputTokens}`, `--output-tokens=${s.outputTokens}`,
    `--cache-creation-tokens=${s.cacheCreationTokens}`, `--cache-read-tokens=${s.cacheReadTokens}`];
  const parsed = parseArgs(argv, CATALOG);
  assert.ok(!parsed.error, `the derivation's own flags must parse, got: ${parsed.error}`);
  assert.strictEqual(parsed.inputTokens, ROW_72661.input_tokens);
  assert.notStrictEqual(parsed.cacheCreationInputTokens, null, "the cache columns must be NON-NULL");
  assert.notStrictEqual(parsed.cacheReadInputTokens, null, "the cache columns must be NON-NULL");
  assert.strictEqual(parsed.inputTokens + parsed.cacheCreationInputTokens + parsed.cacheReadInputTokens,
    ROW_72661_LOGGED_INPUT, "what the CLI would write still accounts for the whole old figure");
}

// --- C. both homes, one change ------------------------------------------------------------------
// The retired expression, as it stood in BOTH files: three Number(usage...) terms added together.
const RETIRED_SUM = /Number\(usage\.input_tokens \?\? 0\) \+ Number\(usage\.cache_creation_input_tokens \?\? 0\)/;
function armC() {
  for (const f of ["scripts/model-trial.js", "scripts/audit-cluster.js"]) {
    const src = read(f);
    assert.ok(/--cache-creation-tokens=\$\{/.test(src), `${f} must pass --cache-creation-tokens`);
    assert.ok(/--cache-read-tokens=\$\{/.test(src), `${f} must pass --cache-read-tokens`);
    assert.ok(/--input-tokens=\$\{inTok\}/.test(src), `${f} must still pass --input-tokens`);
    assert.doesNotMatch(src, RETIRED_SUM, `${f} must no longer fold the three input quantities into one`);
    assert.ok(/usageSplit\(/.test(src), `${f} must read the one shared derivation`);
  }
  // Teeth: the pattern DOES fire on the expression it retired, so a green arm above means the
  // expression is gone -- not that the regex never matches anything.
  assert.match("const inTok = Number(usage.input_tokens ?? 0) + Number(usage.cache_creation_input_tokens ?? 0);",
    RETIRED_SUM, "control: the retired expression is detectable when present");
  // One derivation, one home: audit-cluster.js imports it rather than keeping a twin of it.
  assert.match(read("scripts/audit-cluster.js"), /import \{ usageSplit \} from "\.\/model-trial\.js";/,
    "the second home imports the derivation instead of copying it");
  // model-trial.js's own `tokens:` keeps a separate total, so that figure keeps its meaning.
  const trial = read("scripts/model-trial.js");
  assert.strictEqual((trial.match(/tokens: totalTok,/g) || []).length, 2,
    "both trial shapes report the separate total, not the split input");
  assert.doesNotMatch(trial, /tokens: inTok \+ outTok/, "the old two-term total is gone");
}

// --- D. the count, both ways --------------------------------------------------------------------
function armD() {
  // A trial that RAN and whose child exited 1: one logged row, nothing kept. The old reading said 0.
  assert.strictEqual(reportedTrialCount({ logged: [{ id: 72661 }], kept: [] }), 1,
    "a window holding one trial call reports 1 even when the pair exited 1");
  // A window with no trial call reports 0 -- even when the loop kept a file, which is the control
  // that fails for any reading that falls back to the tally.
  assert.strictEqual(reportedTrialCount({ logged: [], kept: [{ pair: "lane/orchestrator" }] }), 0,
    "control: a window with no trial call reports 0, never the kept tally");
  assert.strictEqual(reportedTrialCount({ logged: [{ id: 1 }, { id: 2 }], kept: [{ pair: "x" }] }), 2,
    "two logged calls with one kept file reports 2");
  assert.strictEqual(reportedTrialCount({}), 0, "no reading at all is 0, not a throw");

  assert.strictEqual(TRIAL_LOG_FEATURE, "model-assignment:trial:depth0",
    "the count reads the feature the trial actually logs under");
  const q = trialLogQuery("2026-10-16T09:30:00.000Z", "2026-10-16T11:00:00.000Z");
  assert.ok(q.startsWith("ai_activity_log?"), "the count reads ai_activity_log");
  assert.match(q, /feature=eq\.model-assignment%3Atrial%3Adepth0/, "filtered by the trial feature");
  assert.match(q, /created_at=gte\./, "the window has a lower bound");
  assert.match(q, /created_at=lte\./, "the window has an upper bound");
  assert.doesNotMatch(q, /input_tokens/, "the count selects no token figures -- it asks how many, not how big");

  // The driver reports that number and keeps `kept` for what `kept` is for.
  const src = read("scripts/model-assignment.js");
  assert.match(src, /trials: trialsRan/, "--prepare --json reports the logged count");
  assert.doesNotMatch(src, /\$\{trials\.length\} trial\(s\)/, "no exit line still counts the kept files");
  assert.match(src, /for \(const k of kept\)/, "`kept` still builds the evidence the manager reads");
}

// --- E. the meter, fail closed ------------------------------------------------------------------
const RUNBOOK = "docs/runbooks/model-watch-routine.md";
const BEGIN = "<!-- MODEL-WATCH-ROUTINE-PROMPT-BEGIN -->";
const END = "<!-- MODEL-WATCH-ROUTINE-PROMPT-END -->";
function armE() {
  const md = read(RUNBOOK);
  const step0 = md.slice(md.indexOf("**Step 0 —"), md.indexOf("**Step 1 —"));
  assert.ok(step0.length > 0, "step 0 is findable");
  const meter = "select ok, reason, all_models_pct, age_hours, threshold from public.routine_meter_ok();";
  assert.ok(step0.includes(meter), `step 0 must carry the shared meter query verbatim: ${meter}`);
  // FIRST action: the meter must come before the stamp block and before the room query.
  assert.ok(step0.indexOf(meter) < step0.indexOf("export D="),
    "the meter runs before the stamp and the clone -- nothing is spent ahead of it");
  assert.ok(step0.indexOf(meter) < step0.indexOf("runner_should_boot()"),
    "the meter runs before the room query");
  // Fail closed on BOTH doors: a false reading and a query that could not run at all.
  assert.match(step0, /Stop the run when `ok` is false/, "a false `ok` stops the run");
  assert.match(step0, /stop it just the same when that query errors at all/,
    "a meter query that errors stops the run too -- fail closed, not fail silent");
  // CONTROL: the conjunction that let a stale meter through must be gone from the stop.
  assert.doesNotMatch(step0, /`meter_stale` is true AND the self-read printed `NO_READING`/,
    "control: the old AND-NO_READING conjunction must no longer gate the stop");
  assert.ok(/meter_stale/.test(step0) && /NO_READING/.test(step0),
    "both still appear as step-6 notes -- the readings are kept, only the gate moved");
  // The room query is KEPT (the kickoff's own instruction).
  assert.ok(step0.includes("FROM public.runner_should_boot();"), "the room query is kept");
  assert.match(step0, /weekly_wall/, "the weekly wall stop is kept");

  // Step 6 defines `trials <n>` as the logged count, not the passing one.
  const step6 = md.slice(md.indexOf("**Step 6 —"));
  assert.match(step6, new RegExp(TRIAL_LOG_FEATURE.replace(/[:]/g, "[:]")),
    "step 6 names the feature the count reads");
  assert.match(step6, /not of trials that passed/, "step 6 says which of the two numbers `trials <n>` is");
  assert.match(step6, /Only `trials:` feeds the 28-day dedupe/, "the dedupe rule is unchanged");

  // The drift-checked block is the routine's copy and is NOT this change's business (AGT-517's class).
  // By LINE equality, not indexOf: the table above the steps quotes both marker names in prose, so
  // a substring search finds that mention first and slices an empty block (agt-146's own shape).
  const all = md.split("\n");
  const a = all.indexOf(BEGIN), b = all.indexOf(END);
  assert.ok(a >= 0 && b > a, "the prompt block markers are present on their own lines");
  const block = all.slice(a + 1, b).join("\n");
  assert.ok(block.length > 100, "the prompt block is findable");
  assert.ok(!block.includes("routine_meter_ok"),
    "the drift-checked block is untouched -- editing it would need the live routine updated in step");
  assert.strictEqual(block.split("\n").filter(l => l.trim() !== "").length, 4,
    "four paragraphs still, as agt-146's arm B requires");
}

const ARMS = {
  "a-the-parser": armA,
  "b-the-split": armB,
  "c-both-homes": armC,
  "d-the-count": armD,
  "e-the-meter": armE,
};

export async function run() {
  const passed = [], failed = [];
  for (const [name, fn] of Object.entries(ARMS)) {
    try { await fn(); passed.push(name); }
    catch (e) { failed.push(`${name}: ${e.message.split("\n")[0]}`); }
  }
  console.log(`  [AGT-502] ${passed.length} of ${Object.keys(ARMS).length} arms passed: ${passed.map(n => n.split("-")[0]).join(",") || "none"}`);
  if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
  return passed;
}

selfRun(import.meta.url, run);
export default run;
