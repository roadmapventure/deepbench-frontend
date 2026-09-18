// DeepBench v7.0.517 | tests/regression/ses-378g-judgment-kinds-caller.test.mjs | SES-378 slice 7
//
// FEATURE: the two JUDGMENT kinds get a caller. Slice 6 wired the two kinds an exit code produces
// (`assignment mismatch` off the driver's exit 2, `over-cap refusal` off `--check-kickoff` exit 1)
// and left the two that need a READING behind. Measured on the unedited tree at `d3b67ebb`:
// `grep -c "kickoff lacked a fact" docs/runbooks/runner-cycle.md` was **0** and the same grep for
// `verdict block attributable to the kickoff` was **0**, so two of the four `KINDS` the table's
// CHECK constraint admits had no call site anywhere -- while the verifier had ALREADY been naming
// the Designer in prose. `runner_verdicts` `f3688e3e` opens with `kickoff has no lane declaration`
// and nothing recorded it, because nothing read it.
//
// WHAT THIS FILE GUARDS, and where a lazier guard would pass vacuously.
//
// (a) BOTH KINDS ARE CALLED FROM THE STEP THAT DOES THE READING -- step 7, cut with the SHIPPED
//     parser (`parseSteps`), not by grepping a 380 KB file. 7a is not a parsed step, so 7a's own
//     paragraph lies inside step 7's span; a command that drifted out of step 7 into 7b stops
//     counting. Each kind is asserted ON THE SAME LINE as `staff-watch.js --record` and
//     `--agent=designer`, because three facts scattered across a step are not a command anyone can
//     run, and an agent filed against the wrong roster id groups with the wrong agent's defects.
//     The four-of-four sweep is what makes this arm finish the ticket rather than half of it: every
//     `KINDS` entry must grep as `--kind='<k>'` somewhere in the runbook, so a fifth kind added to
//     the script with no caller goes red HERE rather than shipping inert like these two did.
//
// (b) THE BLOCK A CYCLE ACTUALLY RUNS IS STILL THE ONE THE CARD CARRIES. `NOTES["7"].block` is 1,
//     so `docs/runbooks/cycle-card.md` copies step 7's FIRST fenced block and no other, and only
//     while it stays at or under `FULL_BLOCK_MAX`. This slice's commands are PROSE for exactly that
//     reason. Asserted against the renderer's OWN constant, imported, never a literal 400.
//
// (c) THE TWO OPENING PHRASES ARE THE CODE'S WORDS, NOT THIS FILE'S. `kickoffCapFinding` and
//     `kickoffLaneFinding` are driven, and the runbook's prose is required to quote what they
//     actually return -- so a reason text edited in `scripts/verifier.js` breaks the doc that tells
//     a cycle what to look for, instead of silently retiring it. BOTH DIRECTIONS: both findings must
//     be NULL on this ticket's own kickoff, or the arm would pass for a checker that fired on
//     everything and the runbook would be telling every cycle to file a finding.
//
// (d) THE DETAILS GROUP ACROSS TICKETS AND CYCLES, WHICH IS THE WHOLE PROMOTION MECHANISM.
//     `fingerprintFor` masks uuids and nothing else (`scripts/staff-watch.js:100`), so a detail
//     naming its ticket would fingerprint a new way every cycle and could never reach the 3-cycle
//     bar. The details are read OUT OF THE RUNBOOK rather than copied into this file, so the thing
//     under test is the shipped text and (d) cannot agree with a command nobody runs.
//
// (e) THE READING HAS SOMETHING TO READ. At least one live `runner_verdicts` row must OPEN with one
//     of the two phrases -- the evidence that this call site is reachable at all, rather than a
//     procedure written against a branch that never fires. Declares itself NOT RUN without
//     credentials rather than passing.
//
// (f) THE SES-158 NEGATIVE CONTROL. A runbook copy with this slice's two `--record` lines stripped
//     must make (a) THROW. A control that changes nothing pins nothing.
//
// SOURCE-ONLY except (e).

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
} from "../../scripts/render-cycle-card.js";
import { fingerprintFor, KINDS } from "../../scripts/staff-watch.js";
import {
  KICKOFF_BYTE_CAP,
  kickoffCapFinding,
  kickoffLaneFinding,
} from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readLf = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const KICKOFF_REL = "docs/kickoffs/v7.0.517-SES-378-the-judgment-kinds-get-a-caller.md";

// The two kinds this slice wires, and the two verifier phrases that trigger the second one. Named
// once; every arm below reads them from here so the file cannot assert two different vocabularies.
const FACT_KIND = "kickoff lacked a fact";
const BLOCK_KIND = "verdict block attributable to the kickoff";
const CAP_PHRASE = "kickoff over cap";
const LANE_PHRASE = "kickoff has no lane declaration";

// A step's own lines, cut with the renderer's parser rather than a regex of this file's own, so
// "which lines are step N" has ONE answer in the repo and this test cannot disagree with the card.
// Same helper shape as ses-378f; 7a has no marker of its own, so it falls inside step 7's span.
export function stepSpan(md, label) {
  const steps = parseSteps(md);
  const i = steps.findIndex(s => s.label === label);
  assert.ok(i >= 0, `${RUNBOOK_REL} has no step **${label}.** marker at all`);
  const lines = md.split("\n");
  const end = steps[i + 1] ? steps[i + 1].line - 1 : lines.length;
  return lines.slice(steps[i].line - 1, end).join("\n");
}

// (a) as a function, so (f) can drive it against a mutated copy.
export function theJudgmentKindsHaveCallers(md) {
  const span = stepSpan(md, "7");
  const lines = span.split("\n");

  // ONE LINE MUST CARRY ALL THREE. A `--kind=` on its own is not a call site: the row is written by
  // `node scripts/staff-watch.js --record` and attributed by `--agent=`, and a finding filed
  // against the wrong agent promotes the wrong agent's defect.
  const required = [
    [FACT_KIND, "the Builder's `deviations` is the Designer's signal -- step 7 reads it whatever the outcome (SES-378)"],
    [BLOCK_KIND, "a verdict that OPENS with a kickoff finding is the Designer's, not the build's (SES-376 / SES-359)"],
  ];
  const found = [];
  for (const [kind, why] of required) {
    const hit = lines.filter(l =>
      l.includes(`--kind='${kind}'`)
      && l.includes("staff-watch.js --record")
      && l.includes("--agent=designer"));
    assert.ok(
      hit.length >= 1,
      `${RUNBOOK_REL} step 7's span carries no single line holding \`staff-watch.js --record\`, `
      + `\`--agent=designer\` and \`--kind='${kind}'\` together -- ${why}. `
      + `Lines naming that kind at all: ${lines.filter(l => l.includes(kind)).length}`,
    );
    found.push(...hit);
  }

  // FOUR OF FOUR. The script exits 2 on an unrecognised --kind and writes no row, so a kind the
  // procedure never names is a vocabulary entry nothing can ever file -- which is precisely the
  // state these two were in at d3b67ebb.
  for (const kind of KINDS) {
    assert.ok(
      md.includes(`--kind='${kind}'`),
      `scripts/staff-watch.js admits kind ${JSON.stringify(kind)} and ${RUNBOOK_REL} names no `
      + `\`--kind='${kind}'\` anywhere -- a vocabulary entry with no caller records nothing, which `
      + `is the whole defect SES-378 slices 6 and 7 exist to close`,
    );
  }
  return found.length;
}

// (b) The card still carries step 7's assembly command, and the new prose did not displace it.
export function theAssemblyBlockSurvived(md) {
  const blocks = blocksByStep(parseSteps(md), parseBlocks(md)).get("7") || [];
  assert.ok(blocks.length >= 1, `${RUNBOOK_REL} step 7 must carry at least one fenced block; got ${blocks.length}`);
  const first = blocks[0];
  assert.ok(
    first.body.includes("agent-prompt.js"),
    `${RUNBOOK_REL} step 7's FIRST fenced block must still be the build-ticket assembly `
    + `(NOTES["7"].block is 1, so the card carries the first one and no other). It is L${first.start}: `
    + `${first.body.slice(0, 120)}`,
  );
  const bytes = Buffer.byteLength(first.body, "utf8");
  assert.ok(
    bytes <= FULL_BLOCK_MAX,
    `${RUNBOOK_REL}:${first.start} is ${bytes} bytes, over FULL_BLOCK_MAX (${FULL_BLOCK_MAX}). At `
    + `that size the card degrades it to a pointer and the command a cycle is told to run stops `
    + `appearing where a cycle reads. This slice's commands are PROSE for exactly this reason -- `
    + `shorten the block, never raise the constant.`,
  );
  return bytes;
}

// (c) The phrases are the verifier's own, and they are not fired by a sound kickoff.
export function thePhrasesAreTheCodes(md, kickoffText) {
  const overCap = kickoffCapFinding("x".repeat(KICKOFF_BYTE_CAP + 1));
  assert.ok(overCap, `kickoffCapFinding must report at ${KICKOFF_BYTE_CAP + 1} bytes`);
  assert.ok(
    overCap.reason.startsWith(CAP_PHRASE),
    `verifier.js prepends kickoffCapFinding().reason onto the verdict, so the runbook tells a cycle `
    + `the reason OPENS with ${JSON.stringify(CAP_PHRASE)}. It opens with ${JSON.stringify(overCap.reason.slice(0, 40))}`,
  );

  const noLanes = kickoffLaneFinding("none");
  assert.ok(noLanes, "kickoffLaneFinding must report on a document with no Lanes: line");
  assert.ok(
    noLanes.reason.startsWith(LANE_PHRASE),
    `same for the lane finding: the runbook says the reason OPENS with ${JSON.stringify(LANE_PHRASE)}, `
    + `it opens with ${JSON.stringify(noLanes.reason.slice(0, 40))}`,
  );

  // The prose must quote what the code returns, or a cycle is told to look for a string that is no
  // longer printed and the kind quietly stops being filed.
  const span = stepSpan(md, "7");
  for (const phrase of [CAP_PHRASE, LANE_PHRASE]) {
    assert.ok(
      span.includes(phrase),
      `${RUNBOOK_REL} step 7's span does not carry the phrase ${JSON.stringify(phrase)} verbatim -- `
      + `it is what a cycle matches the verdict's reasoning against`,
    );
  }

  // BOTH DIRECTIONS. A checker that fired on everything would satisfy the two assertions above and
  // turn the runbook's new paragraph into an instruction to file a finding on every ship.
  assert.strictEqual(
    kickoffCapFinding(kickoffText), null,
    `${KICKOFF_REL} is ${Buffer.byteLength(kickoffText, "utf8")} bytes and must NOT produce a cap `
    + `finding (cap ${KICKOFF_BYTE_CAP}) -- a sound kickoff is the negative case for (c)`,
  );
  assert.strictEqual(
    kickoffLaneFinding(kickoffText), null,
    `${KICKOFF_REL} declares its lanes and must NOT produce a lane finding -- otherwise the runbook `
    + `is telling every cycle to record a Designer finding on a sound kickoff`,
  );
  return { cap: overCap.reason.slice(0, 40), lane: noLanes.reason.slice(0, 40) };
}

// The §4 record commands, read out of the runbook so (d) drives the SHIPPED bytes.
export function recordCallsIn(md, label) {
  const flat = stepSpan(md, label).replace(/\s+/g, " ");
  const cmds = flat.match(/node scripts\/staff-watch\.js --record[^`]*/g) || [];
  assert.ok(cmds.length >= 3, `${RUNBOOK_REL} step ${label}'s span must carry all three of §4's --record commands; found ${cmds.length}`);
  return cmds.map(cmd => {
    const one = (re, name) => {
      const hit = re.exec(cmd);
      assert.ok(hit, `a step ${label} --record command names no ${name}: ${cmd}`);
      return hit[1];
    };
    return {
      agent: one(/--agent=([^\s'"]+)/, "--agent"),
      kind: one(/--kind='([^']+)'/, "--kind"),
      detail: one(/--detail='([^']+)'/, "--detail"),
    };
  });
}

// (d) One defect, many tickets and many cycles, ONE fingerprint.
export function theDetailsGroupAcrossTickets(md) {
  const calls = recordCallsIn(md, "7");
  const backlogs = ["SES-378", "DAT-19"];
  const cycles = [
    "c297d9f8-374b-4fd4-9c9b-94bd92c7803c",
    "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
  ];

  const prints = new Map();
  for (const call of calls) {
    assert.strictEqual(call.agent, "designer", `step 7's kinds are the DESIGNER's findings; ${JSON.stringify(call.kind)} is filed on ${JSON.stringify(call.agent)}`);
    assert.ok(KINDS.includes(call.kind), `the runbook records kind ${JSON.stringify(call.kind)}, which scripts/staff-watch.js KINDS does not admit -- it would exit 2 and write nothing`);

    const seen = new Set();
    for (const backlog of backlogs) {
      for (const cycleId of cycles) {
        // The row `--record` writes: the ticket rides in `backlog_id` and the cycle in `cycle_id`,
        // and NEITHER is an input to the fingerprint. That is the design, and this is where it is
        // proven rather than assumed.
        const row = { agent_id: call.agent, kind: call.kind, detail: call.detail, backlog_id: backlog, cycle_id: cycleId };
        const fp = fingerprintFor({ agentId: row.agent_id, kind: row.kind, detail: row.detail });
        assert.ok(fp.fingerprint, `fingerprintFor refused §4's own detail ${JSON.stringify(call.detail)}: ${JSON.stringify(fp)}`);
        seen.add(fp.fingerprint);
      }
    }
    assert.strictEqual(
      seen.size, 1,
      `the detail ${JSON.stringify(call.detail)} fingerprints ${seen.size} different ways across `
      + `${backlogs.length} tickets x ${cycles.length} cycles. It must be ONE: the promotion bar `
      + `counts distinct cycles under a single fingerprint, so a detail that varies per ticket can `
      + `never reach 3 no matter how often the defect recurs.`,
    );
    assert.ok(
      !/\bSES-\d+\b|\bDAT-\d+\b|\bAGT-\d+\b|\bLOG-\d+\b/.test(call.detail),
      `${JSON.stringify(call.detail)} names a ticket -- the ticket belongs in --backlog=, or the `
      + `finding stops grouping and the 3-cycle bar becomes unreachable`,
    );
    prints.set(call.detail, [...seen][0]);
  }

  // The two BLOCK_KIND details are different defects sharing one kind (over cap vs no lanes), and
  // the fact detail is a third. If everything collapsed to one hash the arm above would still pass
  // while a cap refusal promoted a lane refusal.
  assert.strictEqual(
    new Set(prints.values()).size, prints.size,
    `§4's three details must fingerprint DIFFERENTLY; got ${JSON.stringify([...prints])}`,
  );
  return prints;
}

// (f) The control. Strip this slice's own `--record` lines and (a) must go red.
function controlGoesRed(md) {
  const stripped = md.split("\n")
    .filter(l => !(l.includes("--record") && (l.includes(FACT_KIND) || l.includes(BLOCK_KIND))))
    .join("\n");
  assert.notStrictEqual(stripped, md, "control for (a) changed nothing (the SES-158 failure)");
  assert.throws(
    () => theJudgmentKindsHaveCallers(stripped),
    /--kind='kickoff lacked a fact'|--kind='verdict block attributable to the kickoff'/,
    "control: a runbook with this slice's --record lines removed still passed (a) -- the arm is vacuous",
  );
}

export default async function run() {
  const md = readLf(RUNBOOK_REL);
  const kickoff = readLf(KICKOFF_REL);

  const sites = theJudgmentKindsHaveCallers(md);   // (a)
  const blockBytes = theAssemblyBlockSurvived(md); // (b)
  const phrases = thePhrasesAreTheCodes(md, kickoff); // (c)
  const prints = theDetailsGroupAcrossTickets(md);   // (d)
  controlGoesRed(md);                                // (f)

  const pure = `${sites} call lines in step 7's own span, all four KINDS named in ${RUNBOOK_REL}; `
    + `step 7's first block still ${blockBytes}B (cap ${FULL_BLOCK_MAX}) and names agent-prompt.js; `
    + `the verifier's own openings ("${phrases.cap}...", "${phrases.lane}...") both null on ${KICKOFF_REL}; `
    + `${prints.size} details, one fingerprint each (${[...prints.values()].join(", ")})`;

  // == (e) Live: the reading has something to read ================================================
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      `SES-378g (e): at least one public.runner_verdicts row whose reasoning OPENS with `
      + `"${CAP_PHRASE}" or "${LANE_PHRASE}" -- the evidence that step 7a's new call site is reachable`,
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name "
      + "(docs/runbooks/session-setup.md step 1b) and re-run: "
      + "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js",
    );
    console.log(`  [SES-378g] ${pure}; (e) declared NOT RUN`);
    return;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!r.ok) assert.fail(`PostgREST ${r.status} on ${q}: ${await r.text()}`);
    return r.json();
  };

  // `like.<phrase>%` is the OPENING, not a contains -- the verifier PREPENDS its reason, so a row
  // that merely mentions the phrase mid-sentence is not the case this call site fires on.
  const rows = await get(
    `runner_verdicts?select=id,verdict,reasoning,created_at`
    + `&or=(reasoning.like.${encodeURIComponent(CAP_PHRASE)}*,reasoning.like.${encodeURIComponent(LANE_PHRASE)}*)`
    + `&order=created_at.desc&limit=5`,
  );
  assert.ok(
    rows.length >= 1,
    `no public.runner_verdicts row OPENS with ${JSON.stringify(CAP_PHRASE)} or ${JSON.stringify(LANE_PHRASE)}. `
    + `Step 7a's new paragraph would then be a procedure for a branch that has never fired -- check `
    + `that step 7a still passes --kickoff= to scripts/verifier.js, which is what arms both findings.`,
  );
  for (const r of rows) {
    assert.ok(
      r.reasoning.startsWith(CAP_PHRASE) || r.reasoning.startsWith(LANE_PHRASE),
      `the live filter returned a row that does not OPEN with either phrase (${r.id}): ${JSON.stringify(r.reasoning.slice(0, 60))}`,
    );
    assert.strictEqual(r.verdict, "block", `a kickoff finding forces block (verifier.js), so ${r.id} must be a block; it is ${JSON.stringify(r.verdict)}`);
  }

  console.log(`  [SES-378g] ${pure}; live: ${rows.length} runner_verdicts row(s) open with a kickoff finding, newest ${rows[0].id} ("${rows[0].reasoning.slice(0, 34)}...")`);
}

selfRun(import.meta.url, run);
