// DeepBench v7.0.488 | tests/regression/ses-378-manager-takes-the-pick.test.mjs | SES-378 slice 1
//
// FEATURE: SES-378 -- runbook step 5 ASKS THE DEVELOPMENT MANAGER for the pick. Before this ship the
// procedure named no driver at all: step 5 made the pick `prime_directive_queue()`'s first row and
// `scripts/run-project.js` appeared nowhere in it, and `ai_activity_log` held exactly ONE
// `devmanager` row (id 39604, from AGT-68's own build session). No cycle had ever asked the manager.
//
// WHAT THIS FILE GUARDS, and where a lazier guard would pass vacuously.
//
// (a) THE PROCEDURE NAMES THE DRIVER, IN STEP 5'S OWN SPAN -- not somewhere in a 375 KB file. The
//     span is cut with the SHIPPED parser (`parseSteps`), between step **5.** and the next marker,
//     so a line that drifted into step 4e or 5a stops counting as step 5 naming it.
//
// (b) THE BLOCK A CYCLE ACTUALLY RUNS IS ON THE CARD, BYTE-IDENTICAL. `SES-377` made
//     docs/runbooks/cycle-card.md a generated view, and a cycle reads the card first. A step-5
//     command over FULL_BLOCK_MAX degrades to a pointer -- correct behaviour for the renderer, and
//     silent death for this ticket, because the manager pass would then be a line nobody runs. So
//     the size is asserted against the renderer's OWN constant, imported, never a literal 400.
//
// (c) THE REFUSAL IS DRIVEN, BOTH WAYS, THROUGH THE SHIPPED `answerErrors`. Step 5's rule (c) --
//     "exit 2 naming a ticket other than the pick is a MANAGER MISMATCH, a finding on the Skill
//     text, never a re-ordering" -- is only a rule if the driver actually refuses. A matching
//     assignment must return [] as well: a driver that refused everything would satisfy the
//     negative half alone.
//
// (d) AND THE ASSIGNMENT THE PROCEDURE EXPECTS IS THE QUEUE HEAD. (c) proves the driver refuses
//     anything but `state.pick`; (d) proves, live, that `state.pick` IS `prime_directive_queue()`'s
//     first row. Together they are the sentence step 5 now carries. Without (d) the pair would say
//     only that the driver agrees with itself.
//
// (e) THE SES-158 NEGATIVE CONTROL. A runbook copy with the `run-project.js` line removed must make
//     (a) THROW. A control that changes nothing pins nothing.
//
// SOURCE-ONLY except (d), which declares itself NOT RUN without credentials rather than passing.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  parseSteps,
  parseBlocks,
  blocksByStep,
  FULL_BLOCK_MAX,
  RUNBOOK_REL,
  CARD_REL,
} from "../../scripts/render-cycle-card.js";
import { answerErrors } from "../../scripts/run-project.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readLf = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// Step 5's span: from its own marker line to the next step marker (5a). Cut with the renderer's
// parser rather than a regex of this file's own, so "which lines are step 5" has one answer in the
// repo and this test cannot disagree with the card about it.
export function step5Span(md) {
  const steps = parseSteps(md);
  const i = steps.findIndex(s => s.label === "5");
  assert.ok(i >= 0, `${RUNBOOK_REL} has no step **5.** marker at all`);
  const lines = md.split("\n");
  const end = steps[i + 1] ? steps[i + 1].line - 1 : lines.length;
  return lines.slice(steps[i].line - 1, end).join("\n");
}

// (a) as a function, so (e) can drive it against a mutated copy.
export function stepFiveAsksTheManager(md) {
  const span = step5Span(md);
  const required = [
    ["scripts/run-project.js", "the driver the cycle runs; without it step 5 is the old queue-head rule wearing a new heading"],
    ["--dry-run", "the claim is the cycle's own (register B42); a driver-made claim breaks the push gate"],
    ["MANAGER MISMATCH", "rule (c): an assignment off the queue head is a finding written into the cycle row, never a re-ordering"],
    ["--agent=devmanager --capability=run-project", "rule (e): the call is logged as the manager's, on its own capability"],
    ["--ai-type=agent-turn", "the ai_type row 39604 already carries; a mislabelled row is unattributable throughput"],
  ];
  for (const [needle, why] of required) {
    assert.ok(
      span.includes(needle),
      `${RUNBOOK_REL} step 5's span does not name \`${needle}\` -- ${why}`,
    );
  }
  return span;
}

// (b) The step-5 command block, and the card's copy of it.
export function theManagerBlockIsOnTheCard(md, card) {
  const steps = parseSteps(md);
  const blocks = blocksByStep(steps, parseBlocks(md)).get("5") || [];
  assert.ok(blocks.length >= 2, `${RUNBOOK_REL} step 5 carries ${blocks.length} fenced blocks; SES-378 adds the driver command and the log line`);
  const first = blocks[0];
  assert.ok(
    first.body.includes("scripts/run-project.js") && first.body.includes("--dry-run"),
    `${RUNBOOK_REL} step 5's FIRST fenced block must be the manager pass (NOTES["5"].block is 1, so ` +
      `the card carries the first one and no other). It is L${first.start}: ${first.body.slice(0, 120)}`,
  );
  const bytes = Buffer.byteLength(first.body, "utf8");
  assert.ok(
    bytes <= FULL_BLOCK_MAX,
    `${RUNBOOK_REL}:${first.start} is ${bytes} bytes, over FULL_BLOCK_MAX (${FULL_BLOCK_MAX}). The card ` +
      "degrades it to a pointer at that size, so the command a cycle is told to run stops appearing " +
      "where a cycle reads. Shorten the block -- never raise the constant.",
  );

  // The second block is the log line, and it must be step 5's second: NOTES carries only the first
  // onto the card, so a log line that drifted ahead of the command would silently replace it there.
  assert.ok(
    blocks[1].body.includes("scripts/agent-log.js") && blocks[1].body.includes("--agent=devmanager"),
    `${RUNBOOK_REL} step 5's SECOND fenced block must be the agent-log command; it is L${blocks[1].start}`,
  );

  const lines = card.split("\n");
  const at = lines.findIndex(l => l.startsWith("**5.** "));
  assert.ok(at >= 0, `${CARD_REL} has no **5.** line`);
  let j = at + 1;
  while (j < lines.length && lines[j] === "") j++;
  assert.ok(/^```/.test(lines[j] || ""), `${CARD_REL}'s **5.** line carries no fenced block -- on origin/dev it carried none, and that is exactly the state this ticket changes`);
  let k = j + 1;
  while (k < lines.length && !/^```\s*$/.test(lines[k])) k++;
  const onCard = lines.slice(j + 1, k).join("\n");
  assert.strictEqual(
    onCard,
    first.body,
    `${CARD_REL}'s step-5 block is not byte-identical to ${RUNBOOK_REL}:${first.start}. Re-render it ` +
      "(the runbook is the source, the card is the view):  node scripts/render-cycle-card.js --write",
  );
  assert.ok(
    lines[at].includes(`L${first.start}(`),
    `${CARD_REL}'s **5.** line must name the block's L-anchor (${first.start}); an unnamed anchor is unreachable`,
  );
  return bytes;
}

// (c) The driver's refusal, driven with the shipped function on a synthetic state. No network: the
// state is a plain object, which is exactly what `answerErrors` takes.
export function theAssignmentMayNotReOrderTheBoard() {
  const state = {
    project: "moat-support",
    pick: { backlog_id: "SES-393", lane: "selfbuild" },
    roster: [{ capability_slug: "build-ticket", engines: ["session", "executor"] }],
  };
  const answerFor = backlogId => ({
    project: "moat-support",
    action: "assign",
    assignment: { backlog_id: backlogId, capability_slug: "build-ticket", engine: "session", reason: "x" },
  });

  const refused = answerErrors(answerFor("SES-378"), state);
  assert.ok(refused.length > 0, "an assignment naming a ticket other than the pick was accepted -- the manager would be re-ordering the board");
  assert.ok(
    refused.some(e => e.includes("SES-378") && e.includes("SES-393") && e.includes("may not re-order the board")),
    `the refusal must name BOTH tickets and say why (step 5 rule (c) writes them into the cycle row as ` +
      `MANAGER MISMATCH). got: ${JSON.stringify(refused)}`,
  );

  const accepted = answerErrors(answerFor("SES-393"), state);
  assert.deepStrictEqual(
    accepted,
    [],
    `an assignment ON the pick must be accepted; a driver that refused everything would satisfy the ` +
      `negative half alone. got: ${JSON.stringify(accepted)}`,
  );
  return refused[0];
}

// (e) The controls. Each mutation must turn a green arm red.
function controlsGoRed(md, card) {
  const stripped = md
    .split("\n")
    .filter(l => !l.includes("scripts/run-project.js"))
    .join("\n");
  assert.notStrictEqual(stripped, md, "control for (a) changed nothing (the SES-158 failure)");
  assert.throws(
    () => stepFiveAsksTheManager(stripped),
    /scripts\/run-project\.js/,
    "control: step 5 with the driver line removed still passed (a) -- the arm is vacuous",
  );

  // (b)'s control: the card's copy of the block with one byte flipped.
  const lines = card.split("\n");
  const at = lines.findIndex(l => l.startsWith("**5.** "));
  let j = at + 1;
  while (j < lines.length && lines[j] === "") j++;
  const copy = lines.slice();
  copy[j + 1] = copy[j + 1].slice(0, -1) + (copy[j + 1].endsWith("X") ? "Y" : "X");
  const mutatedCard = copy.join("\n");
  assert.notStrictEqual(mutatedCard, card, "control for (b) changed nothing (the SES-158 failure)");
  assert.throws(
    () => theManagerBlockIsOnTheCard(md, mutatedCard),
    "control: a step-5 card block with one byte flipped still passed (b)",
  );
}

export default async function run() {
  const md = readLf(RUNBOOK_REL);
  const card = readLf(CARD_REL);

  stepFiveAsksTheManager(md);                            // (a)
  const blockBytes = theManagerBlockIsOnTheCard(md, card); // (b)
  const refusal = theAssignmentMayNotReOrderTheBoard();    // (c)
  controlsGoRed(md, card);                                 // (e)

  // == (d) Live arm: the pick path IS the queue head =============================================
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "SES-378 (d) the assignment is the queue head (prime_directive_queue().ref === runner_should_boot().detail.pick.backlog_id)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name " +
        "(docs/runbooks/session-setup.md step 1b) and re-run: " +
        "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js",
    );
    console.log(`  [SES-378] step 5 names the driver; its command block is ${blockBytes}B (cap ${FULL_BLOCK_MAX}) and byte-identical on ${CARD_REL}; the off-pick assignment is refused ("${refusal.slice(0, 60)}...") and the on-pick one returns []; (d) declared NOT RUN`);
    return;
  }

  const H = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
  const rpc = async name => {
    const r = await fetch(`${url}/rest/v1/rpc/${name}`, { method: "POST", headers: H, body: "{}" });
    if (!r.ok) throw new Error(`rpc/${name} -> ${r.status} ${await r.text()}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };

  const queue = await rpc("prime_directive_queue");
  const bootRows = await rpc("runner_should_boot");
  const boot = Array.isArray(bootRows) ? bootRows[0] : bootRows;
  const pick = boot && boot.detail && boot.detail.pick;

  if (!Array.isArray(queue) || queue.length === 0) {
    notRun("SES-378 (d) the assignment is the queue head", "prime_directive_queue() is empty right now, so there is no head to compare the pick against");
  } else if (!pick) {
    notRun("SES-378 (d) the assignment is the queue head", `runner_should_boot() names no pick right now (${boot?.reason ?? "no reason given"}), so there is nothing the pick path authorises assigning`);
  } else {
    assert.strictEqual(
      String(queue[0].ref),
      String(pick.backlog_id),
      `prime_directive_queue()'s first row is "${queue[0].ref}" but runner_should_boot().detail.pick is ` +
        `"${pick.backlog_id}". Step 5 tells a cycle to build the queue's first row when the manager ` +
        "mismatches, and the driver refuses anything but the pick -- if these two disagree, those two " +
        "rules point at different tickets and the mismatch rule is unfollowable.",
    );
    console.log(`  [SES-378] (d) live: prime_directive_queue()[0].ref === runner_should_boot().detail.pick.backlog_id === ${pick.backlog_id} (queue depth ${queue.length})`);
  }

  console.log(`  [SES-378] step 5 names scripts/run-project.js, --dry-run, MANAGER MISMATCH and the agent-log flags; its first block is ${blockBytes}B (cap ${FULL_BLOCK_MAX}) and byte-identical on ${CARD_REL}; answerErrors refuses an off-pick assignment by name and returns [] on the pick; both controls go red`);
}

selfRun(import.meta.url, run);
