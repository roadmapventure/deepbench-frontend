// DeepBench v7.0.665 | tests/regression/ses-355-routine-prompt.test.mjs | AGT-147 -- THE MODEL-ID
// CLAUSE IS INVERTED. It used to demand that the prompt name ALL THREE lane ids, which made the
// prose a second home of public.model_assignments: a lane switch in the table left the prompt
// contradicting it and this suite green. Now the ONLY model id the prompt may carry is step 1's
// SES-398 probe (`--model claude-fable-5-1`, pinned byte-identical by ses-398-meter-self-read
// because only a Fable call returns seven_day_overage_included); every other id is RED, and the
// three-lane read stays only as `lanes.size === 3`. The live arm grades the probe against
// model_catalog's current Fable row, so a Fable rename reddens here rather than silently.
// DeepBench v7.0.489 | tests/regression/ses-355-routine-prompt.test.mjs | SES-398 -- step 1 runs the meter
// self-read BEFORE the gate: `seven-refusals-named` replaces `six-refusals-named` (meter_stale was
// missing), and `self-read-before-gate` grades the ORDER of `claude -p` against the first
// runner_should_boot(), with a swap control. The command's bytes are ses-398-meter-self-read's.
// DeepBench v7.0.449 | tests/regression/ses-355-routine-prompt.test.mjs | SES-355
//
// FEATURE: SES-355 -- the cloud routine's prompt lives in the repo (docs/runbooks/routine-prompt.md)
// and is tested for drift. Read live 2026-09-10, the prompt on deepbench-runner still ordered work by
// FEATURES.md "beta-marked first", named claude-fable-5, told every cycle to rebuild the briefing
// page and planned against a "50% share" -- four retired mechanisms, held where no test could reach.
//
// ONE ARM, ALWAYS RUNS. The live routine cannot be read from node (RemoteTrigger is a session tool),
// so what is guarded is the SOURCE: the block between the ROUTINE-PROMPT markers. The live copy is
// pushed from that block on John's word and read back in the same sitting -- the runbook records it.
//
// Every clause carries a negative control ("would this still pass if the change did nothing?"), and
// the strongest control is the captured OLD prompt's own sentences: each retired-mechanism clause
// must go RED on them. A denylist that the old prompt passes is not a denylist.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROMPT_REL = "docs/runbooks/routine-prompt.md";
const LANES_REL = "docs/governance/MODEL-LANES-SNAPSHOT.md";
const BEGIN = "<!-- ROUTINE-PROMPT-BEGIN -->";
const END = "<!-- ROUTINE-PROMPT-END -->";

export function readPrompt(text) {
  const lf = String(text).replace(/\r\n/g, "\n");
  const a = lf.indexOf(BEGIN);
  const b = lf.indexOf(END);
  assert.ok(a >= 0 && b > a, `${PROMPT_REL} must carry exactly one ${BEGIN} ... ${END} block`);
  return lf.slice(a + BEGIN.length, b).trim();
}

// The lanes snapshot's table: `| lane | model id | purpose |` rows after the header separator.
export function readLaneModels(text) {
  const lf = String(text).replace(/\r\n/g, "\n");
  const out = new Map();
  for (const line of lf.split("\n")) {
    const m = /^\|\s*(orchestrator|judgment|mechanical)\s*\|\s*([^|]+?)\s*\|/.exec(line);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

// Sentences from the prompt as captured live 2026-09-10 (RemoteTrigger get). Each retired-mechanism
// clause below must FAIL on this text -- that is the ticket's "red against the prompt as captured".
export const OLD_PROMPT_FRAGMENTS = [
  "Work selection: runner_directives queue first (John's word outranks everything), else docs/FEATURES.md → FEATURES-NEXT.md → FEATURES-LATER.md, P1 - Improves John's Skills → P10 - Tooling within each; within a class: beta-marked first, then newest filed, then oldest.",
  "Rebuild the briefing page per docs/runbooks/briefing-page.md (the Artifact tool is pre-approved for you) — harvest John's taps, directive text, AND usage-meter readings BEFORE rebuilding",
  "governed by John's typed-in meter readings — rest at weekly ≥85%, plan against a 50% share, 10M/day uncalibrated, 3M/day when the reading is staler than 48h.",
  "delegate judgment-dense steps (kickoff design for P1–P5 work, root-cause diagnosis, invention scoring, P1–P4 classification) to a Fable 5 subagent via the Agent tool (model claude-fable-5)",
].join("\n");

// Retired mechanisms, pinned. A pattern here is a thing the runbook no longer does; the prompt may
// not tell a cycle to do it.
export const RETIRED = [
  { id: "features-file-ordering", re: /FEATURES(-NEXT|-LATER)?\.md/ },
  { id: "beta-first", re: /\bbeta\b/i },
  { id: "unconditional-briefing-rebuild", re: /Rebuild the briefing page per/ },
  { id: "typed-in-meter", re: /typed-in meter/i },
  { id: "fifty-percent-share", re: /50% share/ },
  { id: "uncalibrated-10m", re: /10M\/day/ },
  { id: "old-fable-id", re: /claude-fable-5(?![-\d])/ },
];

// Things the prompt must point at -- the runbook, the gate, the queue, the lanes table, and its own
// canonical home. Each has a control that removes the pointer.
export const REQUIRED = [
  { id: "runbook", re: /docs\/runbooks\/runner-cycle\.md/, breaks: s => s.replace(/runner-cycle\.md/g, "runner-cycle.txt") },
  // SES-377 -- the prompt must send a cycle to the card, not to a 363,840-byte top-to-bottom read.
  { id: "card-first", re: /docs\/runbooks\/cycle-card\.md/, breaks: s => s.replace(/cycle-card\.md/g, "cycle-card.txt") },
  { id: "pre-boot-gate", re: /runner_should_boot\(\)/, breaks: s => s.replace(/runner_should_boot/g, "runner_may_boot") },
  // SES-398 -- seven, not six: the gate has refused `meter_stale` since SES-389, and three fires on
  // 2026-09-15 did exactly that while the prompt named six.
  { id: "seven-refusals-named", re: /scheduler_off, meter_stale, weekly_wall, weekly_pace, no_budget_row, nothing_pickable, unaffordable/, breaks: s => s.replace("meter_stale, ", "") },
  // SES-398 -- the meter self-read is in the prompt at all (its ORDER against the gate is graded in grade()).
  { id: "self-read-present", re: /claude -p /, breaks: s => s.split("claude -p ").join("claude --print ") },
  { id: "queue-is-the-pick", re: /prime_directive_queue\(\)/, breaks: s => s.replace(/prime_directive_queue/g, "the queue") },
  { id: "lanes-are-the-authority", re: /runner_model_lanes/, breaks: s => s.replace(/runner_model_lanes/g, "the lanes") },
  { id: "canonical-home", re: /docs\/runbooks\/routine-prompt\.md/, breaks: s => s.replace(/routine-prompt\.md/g, "prompt.md") },
  { id: "never-main", re: /Never push to main/, breaks: s => s.replace("Never push to main", "Push to main") },
  { id: "one-item", re: /ONE item per cycle/, breaks: s => s.replace("ONE item per cycle", "as many items as fit") },
  { id: "mode-stamp", re: /DEEPBENCH-RUNNER-AUTOMATED-trig_017TZ3JZcLBK6AYH6DKURqMH/, breaks: s => s.replace("trig_017TZ3JZcLBK6AYH6DKURqMH", "trig_unknown") },
];

export function modelIdsIn(s) {
  return [...new Set(String(s).match(/claude-[a-z]+-[0-9][0-9a-z-]*/g) || [])];
}

// AGT-147 -- step 1's meter probe is the ONE id the prompt is allowed to carry, and it is allowed
// because of what it measures, not because of what lane runs it: only a Fable call's
// rate_limit_event carries seven_day_overage_included (SES-398). Read it off the FIRST `claude -p `
// so the fallback call cannot answer for the lean one.
export function probeModelIn(s) {
  const m = /claude -p [^\n]*?--model (claude-[a-z]+-[0-9][0-9a-z-]*)/.exec(String(s));
  return m ? m[1] : null;
}

export function grade(prompt, lanes) {
  for (const r of RETIRED) {
    assert.ok(!r.re.test(prompt), `${PROMPT_REL} names a retired mechanism (${r.id}: ${r.re})`);
  }
  for (const q of REQUIRED) {
    assert.ok(q.re.test(prompt), `${PROMPT_REL} must point at ${q.id} (${q.re})`);
  }
  // SES-377 -- ORDER, not just presence. Both files are named in step 3, and a prompt that names
  // the runbook first is the 363,840-byte top-to-bottom read this ticket ended, wearing a mention
  // of the card. Presence alone would pass that prompt, which is why this clause is separate.
  const cardAt = prompt.indexOf("docs/runbooks/cycle-card.md");
  const runbookAt = prompt.indexOf("docs/runbooks/runner-cycle.md");
  assert.ok(
    cardAt >= 0 && runbookAt >= 0 && cardAt < runbookAt,
    `${PROMPT_REL} must name docs/runbooks/cycle-card.md BEFORE docs/runbooks/runner-cycle.md ` +
      `(card@${cardAt}, runbook@${runbookAt}) — the card is what a cycle reads first; the runbook ` +
      "is what it opens at an L-anchor. Naming the runbook first restores the undirected read.",
  );
  // SES-398 -- self-read-before-gate: ORDER, not presence. runner_should_boot() grades the newest
  // reading, so a prompt that asks the gate first grades the stale row the self-read exists to
  // replace (cycles 1e058d0f, 4d4f5e6c, fae57bad refused meter_stale on 2026-09-15).
  const selfReadAt = prompt.indexOf("claude -p ");
  const gateAt = prompt.indexOf("runner_should_boot()");
  assert.ok(
    selfReadAt >= 0 && gateAt >= 0 && selfReadAt < gateAt,
    `${PROMPT_REL} must run the meter self-read (claude -p) BEFORE the first runner_should_boot() ` +
      `(self-read@${selfReadAt}, gate@${gateAt}) — the gate grades the newest reading, so asking it first grades a stale one.`,
  );
  // AGT-147 -- MODEL IDS: the probe, and nothing else. The lanes file is still read (three lanes
  // must exist, or the snapshot this file grades against is not the lanes snapshot), but the prompt
  // no longer restates any lane's model: a lane switch in public.model_assignments must not leave a
  // sentence here contradicting the table (§19b -- a table row, never a literal).
  assert.strictEqual(lanes.size, 3, `${LANES_REL} must carry the three lanes (orchestrator, judgment, mechanical); got ${lanes.size}`);
  const probe = probeModelIn(prompt);
  assert.ok(probe && /^claude-fable-[0-9]/.test(probe),
    `${PROMPT_REL} step 1 must run its meter probe on a Fable model (got ${probe === null ? "no --model on the first `claude -p`" : probe}) ` +
      "-- only a Fable call's rate_limit_event carries seven_day_overage_included (SES-398), which is the " +
      "whole reason an id is written here at all.");
  const stray = modelIdsIn(prompt).filter(id => id !== probe);
  assert.deepStrictEqual(stray, [],
    `${PROMPT_REL} names model id(s) ${stray.join(", ")} beside step 1's probe ${probe}. The model for a ` +
      "lane is a public.model_assignments row read live, never a literal in this prompt -- a switch in " +
      "the table would leave these words contradicting it and this suite green.");
}

function everyClauseHasTeeth(prompt, lanes) {
  // The old prompt must fail: each retired pattern must match at least one captured fragment, and
  // grading the old fragments must throw.
  for (const r of RETIRED) {
    assert.ok(r.re.test(OLD_PROMPT_FRAGMENTS), `control: retired pattern ${r.id} does not match the captured 2026-09-10 prompt -- it pins nothing`);
  }
  assert.throws(() => grade(OLD_PROMPT_FRAGMENTS, lanes), "control: the captured 2026-09-10 prompt must be RED");
  // Each required pointer's control must turn the prompt red.
  for (const q of REQUIRED) {
    const broken = q.breaks(prompt);
    assert.notStrictEqual(broken, prompt, `control for ${q.id} changed nothing (the SES-158 failure)`);
    assert.throws(() => grade(broken, lanes), `control for ${q.id}: the broken prompt still passes`);
  }
  // SES-377 -- the order clause's own control. Both paths stay present and every other clause
  // still passes; only their positions swap. A grade() that merely counted mentions would be
  // green on this, which is exactly the prompt the ticket replaced.
  const swapped = prompt
    .replace(/docs\/runbooks\/cycle-card\.md/g, " CARD ")
    .replace(/docs\/runbooks\/runner-cycle\.md/g, "docs/runbooks/cycle-card.md")
    .replace(/ CARD /g, "docs/runbooks/runner-cycle.md");
  assert.notStrictEqual(swapped, prompt, "control for card-first order changed nothing (the SES-158 failure)");
  assert.throws(() => grade(swapped, lanes), "control: a prompt naming the runbook before the card still passes");
  // SES-398 -- the self-read-before-gate order clause's own control: both strings stay present, only
  // their positions swap, so presence alone (self-read-present, pre-boot-gate) still passes.
  const gateFirst = prompt
    .replace(/claude -p /g, " SELFREAD ")
    .replace(/runner_should_boot\(\)/g, "claude -p ")
    .replace(/ SELFREAD /g, "runner_should_boot()");
  assert.notStrictEqual(gateFirst, prompt, "control for self-read-before-gate changed nothing (the SES-158 failure)");
  assert.throws(() => grade(gateFirst, lanes), "control: a prompt asking the gate before the meter self-read still passes");
  // A foreign model id must be caught.
  assert.throws(() => grade(prompt + " Use claude-fable-5 when in doubt.", lanes), "control: an old model id slipped through");
  assert.throws(() => grade(prompt + " Escalate to claude-opus-6.", lanes), "control: an unknown model id slipped through");
  // AGT-147's three. (1) The sentence this ticket deleted, re-added verbatim: a LANE id is now a
  // stray id, which is exactly what the old clause required and this one refuses. A guard that only
  // denylisted retired ids would be green on it.
  assert.throws(() => grade(prompt + " you are the orchestrator lane, claude-opus-5.", lanes),
    "control: a lane's model id restated in the prose still passes");
  // (2) The probe itself moved off Fable -- the id count is unchanged (still exactly one), so a
  // clause that merely counted ids would be green; only reading WHICH id the probe runs catches it.
  const probeSwapped = prompt.split("--model claude-fable-5-1").join("--model claude-opus-5");
  assert.notStrictEqual(probeSwapped, prompt, "control for probe-is-fable changed nothing (the SES-158 failure)");
  assert.throws(() => grade(probeSwapped, lanes), "control: a probe on a non-Fable model still passes");
  // (3) The probe's --model dropped entirely. `claude -p ` is still present, so self-read-present
  // and self-read-before-gate both still pass; without this clause the prompt would ship a meter
  // command that runs whatever model the CLI defaults to, and no Fable window comes back.
  const probeGone = prompt.split(" --model claude-fable-5-1").join("");
  assert.notStrictEqual(probeGone, prompt, "control for probe-present changed nothing (the SES-158 failure)");
  assert.throws(() => grade(probeGone, lanes), "control: a meter command with no --model still passes");
}

function theFileStampsItself() {
  const raw = fs.readFileSync(path.join(ROOT, PROMPT_REL), "utf8");
  assert.ok(/^<!-- DeepBench v\d+\.\d+\.\d+ \| runbooks\/routine-prompt\.md \| /.test(raw), `${PROMPT_REL} must open with a DeepBench version stamp`);
  const stamps = raw.split(/\r?\n/).filter(l => l.startsWith("<!-- DeepBench v")).length;
  assert.ok(stamps <= 5, `${PROMPT_REL} carries ${stamps} header stamps; session-hygiene check 7 caps a runbook at 5`);
}

export async function run() {
  const prompt = readPrompt(fs.readFileSync(path.join(ROOT, PROMPT_REL), "utf8"));
  const lanes = readLaneModels(fs.readFileSync(path.join(ROOT, LANES_REL), "utf8"));
  grade(prompt, lanes);
  everyClauseHasTeeth(prompt, lanes);
  theFileStampsItself();
  const probe = probeModelIn(prompt);
  // AGT-147 (d) LIVE -- the probe is allowed because it is a Fable call; if the catalog's current
  // Fable row is a different id, the pinned command is measuring nothing and ses-398's byte-identical
  // pin is holding a stale model here. Read-only, one GET.
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const key = process.env.SUPABASE_SERVICE_KEY;
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/model_catalog?select=model_id&family=eq.Fable&deprecated_on=is.null&order=first_seen.desc&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    assert.ok(r.ok, `model_catalog read failed: HTTP ${r.status}`);
    const [row] = await r.json();
    assert.ok(row?.model_id, "model_catalog carries no live Fable row -- the probe clause would be vacuous");
    assert.strictEqual(row.model_id, probe,
      `step 1's probe runs ${probe} but model_catalog's current Fable row is ${row.model_id} -- the pinned meter command ` +
        "(ses-398-meter-self-read holds it byte-identical) is asking a model the catalog has moved past.");
    console.log(`         (d) LIVE: model_catalog's Fable row ${row.model_id} = the probe -- PASS`);
  } else {
    notRun("SES-355 (d) the probe equals model_catalog's live Fable row",
      "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline) and re-run");
  }
  console.log(`  [PASS] ses-355-routine-prompt.test.mjs`);
  console.log(`         prompt ${prompt.length} chars; ${RETIRED.length} retired patterns absent; ${REQUIRED.length} pointers present; probe ${probe} only; no other model id`);
}

selfRun(import.meta.url, run);
export default run;
