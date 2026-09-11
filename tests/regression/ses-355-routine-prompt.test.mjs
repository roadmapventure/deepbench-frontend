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
import { selfRun } from "./_lib/self-run.js";

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
  { id: "pre-boot-gate", re: /runner_should_boot\(\)/, breaks: s => s.replace(/runner_should_boot/g, "runner_may_boot") },
  { id: "six-refusals-named", re: /scheduler_off, weekly_wall, weekly_pace, no_budget_row, nothing_pickable, unaffordable/, breaks: s => s.replace("weekly_pace, ", "") },
  { id: "queue-is-the-pick", re: /prime_directive_queue\(\)/, breaks: s => s.replace(/prime_directive_queue/g, "the queue") },
  { id: "lanes-are-the-authority", re: /runner_model_lanes/, breaks: s => s.replace(/runner_model_lanes/g, "the lanes") },
  { id: "canonical-home", re: /docs\/runbooks\/routine-prompt\.md/, breaks: s => s.replace(/routine-prompt\.md/g, "prompt.md") },
  { id: "never-main", re: /Never push to main/, breaks: s => s.replace("Never push to main", "Push to main") },
  { id: "one-item", re: /ONE item per cycle/, breaks: s => s.replace("ONE item per cycle", "as many items as fit") },
  { id: "mode-stamp", re: /DEEPBENCH-RUNNER-AUTOMATED-trig_017TZ3JZcLBK6AYH6DKURqMH/, breaks: s => s.replace("trig_017TZ3JZcLBK6AYH6DKURqMH", "trig_unknown") },
];

function modelIdsIn(s) {
  return [...new Set(s.match(/claude-[a-z]+-[0-9][0-9a-z-]*/g) || [])];
}

export function grade(prompt, lanes) {
  for (const r of RETIRED) {
    assert.ok(!r.re.test(prompt), `${PROMPT_REL} names a retired mechanism (${r.id}: ${r.re})`);
  }
  for (const q of REQUIRED) {
    assert.ok(q.re.test(prompt), `${PROMPT_REL} must point at ${q.id} (${q.re})`);
  }
  // Model ids: every id the prompt names is a lane's id, and every lane's id is named. A prompt that
  // names a model the lanes table does not carry is exactly the claude-fable-5 drift this ticket found.
  const laneIds = new Set(lanes.values());
  assert.strictEqual(lanes.size, 3, `${LANES_REL} must carry the three lanes (orchestrator, judgment, mechanical); got ${lanes.size}`);
  const named = modelIdsIn(prompt);
  for (const id of named) {
    assert.ok(laneIds.has(id), `${PROMPT_REL} names model ${id}, which is not a runner_model_lanes model id (${[...laneIds].join(", ")})`);
  }
  for (const [lane, id] of lanes) {
    assert.ok(named.includes(id), `${PROMPT_REL} must name the ${lane} lane's model ${id}`);
  }
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
  // A foreign model id must be caught.
  assert.throws(() => grade(prompt + " Use claude-fable-5 when in doubt.", lanes), "control: an old model id slipped through");
  assert.throws(() => grade(prompt + " Escalate to claude-opus-6.", lanes), "control: an unknown model id slipped through");
}

function theFileStampsItself() {
  const raw = fs.readFileSync(path.join(ROOT, PROMPT_REL), "utf8");
  assert.ok(/^<!-- DeepBench v\d+\.\d+\.\d+ \| runbooks\/routine-prompt\.md \| /.test(raw), `${PROMPT_REL} must open with a DeepBench version stamp`);
  const stamps = raw.split(/\r?\n/).filter(l => l.startsWith("<!-- DeepBench v")).length;
  assert.ok(stamps <= 5, `${PROMPT_REL} carries ${stamps} header stamps; session-hygiene check 7 caps a runbook at 5`);
}

export function run() {
  const prompt = readPrompt(fs.readFileSync(path.join(ROOT, PROMPT_REL), "utf8"));
  const lanes = readLaneModels(fs.readFileSync(path.join(ROOT, LANES_REL), "utf8"));
  grade(prompt, lanes);
  everyClauseHasTeeth(prompt, lanes);
  theFileStampsItself();
  console.log(`  [PASS] ses-355-routine-prompt.test.mjs`);
  console.log(`         prompt ${prompt.length} chars; ${RETIRED.length} retired patterns absent; ${REQUIRED.length} pointers present; model ids ${modelIdsIn(prompt).join(", ")} = runner_model_lanes`);
}

selfRun(import.meta.url, run);
export default run;
