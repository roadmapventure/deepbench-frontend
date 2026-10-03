// DeepBench v7.0.641 | tests/regression/agt-171-lease-released-at-close.test.mjs | AGT-171
// FEATURE: AGT-171 -- the (6) close and the publish-lease release are ONE statement, so nothing
// that runs after (6) is holding the lease. Kickoff:
// docs/kickoffs/v7.0.641-AGT-171-lease-released-at-close.md §5 task 3.
//
// THE DEFECT THIS GUARDS, measured live rather than recalled (kickoff §2): `runner_lease` id 1 was
// held by `956c44a0...` from 08:11:57Z while that cycle's `runner_cycles.ended_at` read 08:13:01Z --
// a CLOSED cycle holding the publish lease for 26 minutes, `steals 17`. The cause was ordering, not
// SQL: the runbook told step 9 to "(6) close ... (7) release", with the release living back in step
// 1, and (7a-bis)-(7f) -- sub-agent work that runs for minutes -- sat between them. The tail lease
// was TTL-stolen while the review sub-agents ran, and the holder-guarded release then returned
// 0 rows. Fusing the two writes into one statement at (6) removes the window entirely; there is no
// wording of "release it promptly" that can (pattern:10, pattern:19).
//
// FOUR ARMS, none needing credentials -- this is a document invariant, so it is read off the files:
//   A  ORDER  -- step 9's span holds exactly ONE fenced sql block that both releases the lease and
//      closes the row, and it comes BEFORE every unleased tail site ((7a-bis) regrade, (7b) sweep,
//      (7c) class-understanding, (7d) promote, (7e)/(7f) audit prepares, (8) the drain gate).
//   B  ONE HOME -- `holder = NULL` appears in exactly ONE fenced block in the whole runbook, and
//      the two sentences that described the old separate release are gone.
//   C  CARD   -- docs/runbooks/cycle-card.md carries the fused block under its `**9.**` line
//      (so `lease_released_at` is on the card a cycle actually reads) and its header sha256 is the
//      CURRENT runbook's, i.e. the card was re-rendered in this same commit (SES-377's coupling).
//   D  CONTROLS -- each of A, B and C is re-run against an in-memory copy with its own subject
//      mutated away, and must go RED. Without these the arms could be vacuous greps.
//
// Pre-change (origin/dev): A fails -- step 9's span has NO block releasing the lease at all (the
// release block lives in step 1, ~:645); B fails on both absent-sentence clauses; C fails because
// the card's step 9 carries close_directive, not the fused statement.
//
// NO WRITES ANYWHERE IN THIS FILE: four file reads and string work. No before-images are owed.
// ON `drain_chain_gate(` AS AN ANCHOR, stated because it is the one place this file departs from
// the kickoff's literal wording: step 9's order SUMMARY names `drain_chain_gate()` as a FORWARD
// pointer ("(8) continue the drain ... if and only if `drain_chain_gate()` below returns
// `continue`") three lines ABOVE the fused block's own position, which the kickoff itself fixes as
// "before (7a-bis)". So the (8) gate's anchor here is its COMMAND line,
// `SELECT * FROM public.drain_chain_gate(` -- the site that actually runs unleased -- and the
// summary's forward pointer is pinned separately below, so neither reading is left unguarded.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { parseSteps, parseBlocks, runbookSha } from "../../scripts/render-cycle-card.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CYCLE_MD = path.join(ROOT, "docs", "runbooks", "runner-cycle.md");
const CARD_MD = path.join(ROOT, "docs", "runbooks", "cycle-card.md");

const lf = t => String(t).replace(/\r\n/g, "\n");

// The text of step 9 from its own marker to the next step's (step 9 is last, so to EOF), so a
// needle found in step 4 cannot pass for one in step 9 -- agt-137's helper, verbatim in shape.
export function stepSpan(md, label) {
  const lines = lf(md).split("\n");
  const steps = parseSteps(md);
  const i = steps.findIndex(s => s.label === label);
  assert.ok(i >= 0, `runner-cycle.md has no step **${label}.** marker`);
  const from = steps[i].line - 1;
  const to = i + 1 < steps.length ? steps[i + 1].line - 1 : lines.length;
  return lines.slice(from, to).join("\n");
}

// The unleased tail, in the order step 9 runs it. Every one of these is a site that fires AFTER the
// row is closed, so every one of them must sit below the fused statement.
export const UNLEASED_SITES = [
  "record_regrade_assignment(",                  // (7a-bis)
  "sweep_decision_windows(",                     // (7b)
  "class_understanding_due()",                   // (7c)
  "staff-watch.js --promote",                    // (7d)
  "audit-run-review.js --prepare",               // (7e)
  "audit-review.js --prepare",                   // (7f)
  "SELECT * FROM public.drain_chain_gate(",      // (8)
];

// 1-based line number of the first line of `span` containing `needle`, or 0 when absent.
function firstLine(span, needle) {
  const lines = lf(span).split("\n");
  for (let i = 0; i < lines.length; i++) if (lines[i].includes(needle)) return i + 1;
  return 0;
}

function isFused(body) {
  return body.includes("UPDATE public.runner_lease") && body.includes("holder = NULL")
    && body.includes("UPDATE public.runner_cycles") && body.includes("ended_at = now()");
}

// --- A: the one fused block, above every unleased site ------------------------------------------
export function checkOrder(md) {
  const span = stepSpan(md, "9");
  const fused = parseBlocks(span).filter(b => b.lang === "sql" && isFused(b.body));
  assert.strictEqual(fused.length, 1,
    `step 9's span must hold EXACTLY ONE fenced sql block that both releases the lease `
    + `(UPDATE public.runner_lease ... holder = NULL) and closes the row `
    + `(UPDATE public.runner_cycles ... ended_at = now()); found ${fused.length}. `
    + `Two such blocks is two ship points for one write; zero means the release is still a separate step.`);
  const block = fused[0];
  for (const site of UNLEASED_SITES) {
    const at = firstLine(span, site);
    assert.ok(at > 0, `step 9's span must still name the unleased site \`${site}\` -- this arm reads the real tail, not a fixed list`);
    assert.ok(block.start < at,
      `the fused (6) statement opens at step-9 line ${block.start} but \`${site}\` is at line ${at}: `
      + `anything below the close/release runs UNLEASED, so a site ABOVE it is a site still holding `
      + `the publish lease while sub-agents run -- the 26-minute hold AGT-171 measured`);
  }
  // And the summary's forward pointer really is only a pointer: the FIRST bare `drain_chain_gate(`
  // above the block must be the "below returns" sentence, never a command.
  const bare = firstLine(span, "drain_chain_gate(");
  if (bare > 0 && bare < block.start) {
    const line = lf(span).split("\n")[bare - 1];
    assert.ok(/below returns/.test(line),
      `step 9 names drain_chain_gate( at line ${bare}, above the fused statement, and that line is `
      + `not the order summary's forward pointer: ${JSON.stringify(line.slice(0, 120))}`);
  }
  return block;
}

// --- B: one home for the release, and the old wording is gone ------------------------------------
export function checkOneHome(md) {
  const inBlocks = parseBlocks(md).filter(b => b.body.includes("holder = NULL"));
  assert.strictEqual(inBlocks.length, 1,
    `\`holder = NULL\` must appear in exactly ONE fenced block in the whole runbook -- the fused (6) `
    + `statement. Found ${inBlocks.length}` + (inBlocks.length ? ` (at line(s) ${inBlocks.map(b => b.start).join(", ")})` : "")
    + `. A second release block is a second place a cycle can release from, which is the ordering bug back.`);
  assert.ok(isFused(inBlocks[0].body),
    "and that one block must be the FUSED statement, not a bare lease UPDATE");
  assert.ok(!md.includes("Release the PUBLISH lease at the end of your tail"),
    "step 1's `Release the PUBLISH lease at the end of your tail` paragraph must be GONE -- while it "
    + "stands, the runbook still describes the release as a step of its own");
  assert.ok(!md.includes("after (6) and (7)"),
    "no step may still say to run `after (6) and (7)`: (7) was retired into (6), so the phrase points "
    + "at a step that no longer exists");
}

// --- C: the card was re-rendered in this same commit ---------------------------------------------
export function checkCard(cardText, md) {
  const lines = lf(cardText).split("\n");
  const i = lines.findIndex(l => l.startsWith("**9.**"));
  assert.ok(i >= 0, "cycle-card.md must carry a `**9.**` line -- the card is one line per step");
  const next = lines.findIndex((l, k) => k > i && /^\*\*[A-Za-z0-9]/.test(l));
  const under = lines.slice(i, next < 0 ? lines.length : next).join("\n");
  assert.ok(under.includes("lease_released_at"),
    "the card's step 9 must carry the fused statement, so `lease_released_at` is in front of a cycle "
    + "that never opens the runbook -- NOTES[\"9\"].block selects it");
  assert.ok(under.includes("UPDATE public.runner_lease") && under.includes("UPDATE public.runner_cycles"),
    "and it must be the whole fused statement, both UPDATEs");
  const m = /sha256 ([0-9a-f]{16})/.exec(cardText);
  assert.ok(m, "cycle-card.md's GENERATED header must name the runbook sha256 it was rendered from");
  assert.strictEqual(m[1], runbookSha(md),
    `the card was rendered from runbook sha256 ${m && m[1]} but the runbook is ${runbookSha(md)} -- `
    + `SES-377's coupling: every runbook byte change re-renders the card in the SAME commit `
    + `(node scripts/render-cycle-card.js --write)`);
}

function throws(fn, why) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert.ok(threw, `control did not fire: ${why}`);
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  const md = fs.readFileSync(CYCLE_MD, "utf8");
  const card = fs.readFileSync(CARD_MD, "utf8");
  let block = null;

  await arm("A the fused (6) statement leads the unleased tail", async () => { block = checkOrder(md); });
  await arm("B one release block, and the old wording is gone", async () => { checkOneHome(md); });
  await arm("C the card carries it and was re-rendered", async () => { checkCard(card, md); });

  // --- D: every clause above, re-run with its own subject mutated away ---------------------------
  await arm("D the controls fire", async () => {
    const span = stepSpan(md, "9");
    const fused = parseBlocks(span).filter(b => b.lang === "sql" && isFused(b.body))[0];
    assert.ok(fused, "the controls need the real block to move");
    const fenced = "```sql\n" + fused.body + "\n```";
    assert.ok(md.includes(fenced), "the fused block must be findable verbatim in the runbook to move it");

    // (i) the block moved BELOW the drain gate's own command -- arm A must go red.
    const gate = "SELECT * FROM public.drain_chain_gate('<your cycle id>');";
    assert.ok(md.includes(gate), "control needs (8)'s gate command as the move target");
    const moved = md.replace(fenced + "\n\n", "").replace(gate + "\n```", gate + "\n```\n\n" + fenced);
    assert.ok(!moved.includes(fenced + "\n\n**(7a-bis)"), "control: the block really left its own position");
    throws(() => checkOrder(moved),
      "with the fused statement moved below (8)'s drain_chain_gate() command, arm A must fail -- "
      + "otherwise it is not reading order at all");

    // (ii) the release half deleted -- arm A and arm B must both go red.
    const noRelease = md.split("holder = NULL").join("holder = holder");
    throws(() => checkOneHome(noRelease), "with `holder = NULL` gone, arm B must fail");
    throws(() => checkOrder(noRelease), "with the release half gone the block is no longer fused, so arm A must fail too");

    // (iii) the old step-1 paragraph put back -- arm B must go red.
    throws(() => checkOneHome(md + "\n**Release the PUBLISH lease at the end of your tail — and only if you took it.**"),
      "arm B's absent-sentence clause must detect the old paragraph when it is there");
    throws(() => checkOneHome(md + "\nRun this after (6) and (7) — never before."),
      "arm B must detect `after (6) and (7)` when it is there");

    // (iv) the card stale by one byte -- arm C must go red.
    throws(() => checkCard(card, md + " "), "a runbook byte that moved without re-rendering the card must fail arm C");
    throws(() => checkCard(card.split("lease_released_at").join("released_at_x"), md),
      "arm C must read the card's own step-9 block, not a constant");
  });

  if (failures.length) {
    throw new Error(`${failures.length} arm(s) failed:\n  - ${failures.join("\n  - ")}`);
  }
  console.log(`[AGT-171] the (6) close releases the lease: one fused sql block at step-9 line ${block.start}, `
    + `above all ${UNLEASED_SITES.length} unleased sites · \`holder = NULL\` in exactly 1 fenced block of `
    + `${Buffer.byteLength(md, "utf8")} B · cycle-card.md step 9 carries lease_released_at at runbook sha256 ${runbookSha(md)}`);
  return ["order", "one-home", "card", "controls"];
}

selfRun(import.meta.url, run);
export default run;
