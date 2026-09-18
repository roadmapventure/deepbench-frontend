// DeepBench v7.0.516 | tests/regression/ses-378f-staff-watch-caller.test.mjs | SES-378 slice 6
//
// FEATURE: the staff watch gets a caller. `scripts/staff-watch.js` shipped in slice 3 and NOTHING
// ran it -- measured on the unedited tree at `649b229c`: `grep -c staff-watch
// docs/runbooks/runner-cycle.md` was **0**, the same grep over `docs/runbooks/cycle-card.md` was
// **0**, and `public.runner_staff_findings` held ONE row, written by hand in that slice. A watch
// nothing calls records nothing, and a fingerprint that is never written can never reach the
// 3-cycle promotion bar. This file guards the three call sites the runbook now carries, and the
// grouping property that makes the bar reachable at all.
//
// WHAT THIS FILE GUARDS, and where a lazier guard would pass vacuously.
//
// (a) THE PROCEDURE CALLS THE WATCH, IN THE SPAN OF THE STEP THAT OWNS THE TRIGGER -- not somewhere
//     in a 380 KB file. Each span is cut with the SHIPPED parser (`parseSteps`), so a `--record`
//     line that drifted from step 5 into 5a, or from step 6 into step 7, stops counting. The two
//     kinds are asserted on the step whose exit code produces them: `assignment mismatch` belongs
//     to step 5's rule (c) (the driver's exit 2), `over-cap refusal` to step 6's `--check-kickoff`
//     exit 1, and the `--promote --apply` tail to step 9.
//
// (b) THE BLOCK A CYCLE ACTUALLY RUNS IS STILL THE ONE THE CARD CARRIES. `NOTES["5"].block` is 1,
//     so the card copies step 5's FIRST fenced block and no other, and only while it stays at or
//     under `FULL_BLOCK_MAX`. This slice adds its commands as PROSE for exactly that reason: a new
//     fence ahead of the driver command would silently replace it on the card, and a fence appended
//     to the first block could push it over the cap and degrade it to a pointer. Both halves are
//     asserted against the renderer's OWN constant, imported, never a literal 400.
//
// (c) THE DETAILS GROUP ACROSS TICKETS AND CYCLES, WHICH IS THE WHOLE PROMOTION MECHANISM.
//     `fingerprintFor` masks uuids and nothing else (`scripts/staff-watch.js:100`), so a detail
//     carrying a ticket id would fingerprint differently on every ticket and the bar could never be
//     reached -- which is why the ticket rides in `--backlog=` and §4's details name no ticket. The
//     details are read OUT OF THE RUNBOOK rather than copied into this file, so the thing under
//     test is the shipped text, and (c) cannot silently agree with a command nobody runs.
//
// (d) THE MIRROR IS PINNED TO THE CARD THAT WAS COMMITTED, AND THE REPAIR IS REVERSIBLE. Editing
//     the runbook re-renders `docs/runbooks/cycle-card.md`, which orphans the Development Manager's
//     Knowledge row unless its `traits.source_sha256` is re-pinned -- and `--sync-knowledge`
//     deliberately refuses to self-heal, because that repair is an UPDATE over an active agent's
//     row. So the pin and its FULL-ROW before-image are one fact, asserted together.
//
// (e) THE SES-158 NEGATIVE CONTROL. A runbook copy with every `--record` line stripped must make
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
  runbookSha,
  FULL_BLOCK_MAX,
  RUNBOOK_REL,
  CARD_REL,
  KNOWLEDGE_SLUG,
} from "../../scripts/render-cycle-card.js";
import { fingerprintFor, KINDS } from "../../scripts/staff-watch.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readLf = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const TICKET = "SES-378";
const DECISION_KIND = "agent-row";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// A step's own lines, cut with the renderer's parser rather than a regex of this file's own, so
// "which lines are step N" has ONE answer in the repo and this test cannot disagree with the card.
export function stepSpan(md, label) {
  const steps = parseSteps(md);
  const i = steps.findIndex(s => s.label === label);
  assert.ok(i >= 0, `${RUNBOOK_REL} has no step **${label}.** marker at all`);
  const lines = md.split("\n");
  const end = steps[i + 1] ? steps[i + 1].line - 1 : lines.length;
  return lines.slice(steps[i].line - 1, end).join("\n");
}

// (a) as a function, so (e) can drive it against a mutated copy.
export function theWatchHasCallers(md) {
  const required = [
    ["5", "staff-watch.js --record", "step 5 rule (c): the driver's exit 2 is where an assignment mismatch is OBSERVED, so it is where it must be recorded"],
    ["5", "--agent=devmanager", "the mismatch is the Development Manager's finding -- a finding filed against the wrong agent groups with the wrong agent's defects"],
    ["5", "--kind='assignment mismatch'", "the kind is the table's CHECK vocabulary; a free-text kind is refused exit 2 and records nothing"],
    ["6", "staff-watch.js --record", "step 6's --check-kickoff exit 1 is where an over-cap kickoff is OBSERVED"],
    ["6", "--agent=designer", "the refusal is the DESIGNER's finding, not the manager's: the kickoff that went over cap is the Designer's output"],
    ["6", "--kind='over-cap refusal'", "same CHECK vocabulary as above"],
    ["9", "--promote --apply", "the serial tail is the one place that reads the accumulated findings; without it a finding at the bar is never promoted"],
  ];
  for (const [label, needle, why] of required) {
    assert.ok(
      stepSpan(md, label).includes(needle),
      `${RUNBOOK_REL} step ${label}'s span does not name \`${needle}\` -- ${why}`,
    );
  }
  // Every kind the procedure names must be one the script will accept. A typo here is not a red
  // test somewhere else: `staff-watch.js` exits 2 on an unrecognised --kind and writes no row, so a
  // mistyped kind is a call site that looks live and records nothing.
  for (const kind of ["assignment mismatch", "over-cap refusal"]) {
    assert.ok(KINDS.includes(kind), `the runbook records kind ${JSON.stringify(kind)}, which scripts/staff-watch.js KINDS does not admit -- it would exit 2 and write nothing`);
  }
  return required.length;
}

// (b) The card still carries step 5's driver command, and the new prose did not displace it.
export function theDriverBlockSurvived(md) {
  const blocks = blocksByStep(parseSteps(md), parseBlocks(md)).get("5") || [];
  assert.ok(blocks.length >= 2, `${RUNBOOK_REL} step 5 must still carry at least 2 fenced blocks; got ${blocks.length}`);
  const first = blocks[0];
  assert.ok(
    first.body.includes("scripts/run-project.js"),
    `${RUNBOOK_REL} step 5's FIRST fenced block must still be the manager pass (NOTES["5"].block is 1, so the card carries the first one and no other). It is L${first.start}: ${first.body.slice(0, 120)}`,
  );
  const bytes = Buffer.byteLength(first.body, "utf8");
  assert.ok(
    bytes <= FULL_BLOCK_MAX,
    `${RUNBOOK_REL}:${first.start} is ${bytes} bytes, over FULL_BLOCK_MAX (${FULL_BLOCK_MAX}). At that size the card degrades it to a pointer and the command a cycle is told to run stops appearing where a cycle reads. This slice's commands are PROSE for exactly this reason -- shorten the block, never raise the constant.`,
  );
  assert.ok(
    blocks[1].body.includes("agent-log.js"),
    `${RUNBOOK_REL} step 5's SECOND fenced block must still be the agent-log command (ses-378 (b)); it is L${blocks[1].start}: ${blocks[1].body.slice(0, 80)}`,
  );
  return bytes;
}

// The §4 record commands, read out of the runbook so (c) drives the SHIPPED bytes. Returns
// { agent, kind, detail } per call site.
export function recordCallsFrom(md, label) {
  const flat = stepSpan(md, label).replace(/\s+/g, " ");
  const m = /node scripts\/staff-watch\.js --record[^`]*/.exec(flat);
  assert.ok(m, `${RUNBOOK_REL} step ${label}'s span carries no staff-watch --record command to read`);
  const cmd = m[0];
  const one = (re, name) => {
    const hit = re.exec(cmd);
    assert.ok(hit, `step ${label}'s --record command names no ${name}: ${cmd}`);
    return hit[1];
  };
  return {
    agent: one(/--agent=([^\s'"]+)/, "--agent"),
    kind: one(/--kind='([^']+)'/, "--kind"),
    detail: one(/--detail='([^']+)'/, "--detail"),
  };
}

// (c) One defect, many tickets and many cycles, ONE fingerprint.
export function theDetailsGroupAcrossTickets(md) {
  const calls = [recordCallsFrom(md, "5"), recordCallsFrom(md, "6")];
  const backlogs = ["SES-378", "DAT-19"];
  const cycles = [
    "889dc10c-b5e6-4452-afd9-e77015efb76d",
    "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
  ];

  const perKind = new Map();
  for (const call of calls) {
    const seen = new Set();
    for (const backlog of backlogs) {
      for (const cycleId of cycles) {
        // The row `--record` writes: the ticket rides in `backlog_id` and the cycle in `cycle_id`,
        // and NEITHER is an input to the fingerprint. That is the design (`SES-378` §2) and this is
        // where it is proven rather than assumed.
        const row = { agent_id: call.agent, kind: call.kind, detail: call.detail, backlog_id: backlog, cycle_id: cycleId };
        const fp = fingerprintFor({ agentId: row.agent_id, kind: row.kind, detail: row.detail });
        assert.ok(fp.fingerprint, `fingerprintFor refused §4's own ${call.kind} detail: ${JSON.stringify(fp)}`);
        seen.add(fp.fingerprint);
      }
    }
    assert.strictEqual(
      seen.size, 1,
      `the ${JSON.stringify(call.kind)} detail fingerprints ${seen.size} different ways across ${backlogs.length} tickets x ${cycles.length} cycles. It must be ONE: the promotion bar counts distinct cycles under a single fingerprint, so a detail that varies per ticket can never reach 3 no matter how often the defect recurs.`,
    );
    perKind.set(call.kind, [...seen][0]);
  }

  assert.strictEqual(
    new Set(perKind.values()).size, perKind.size,
    `the two kinds must fingerprint DIFFERENTLY (${JSON.stringify([...perKind])}); if everything collapsed to one hash the assertion above would pass while an over-cap refusal promoted an assignment mismatch`,
  );

  // The masking half, driven rather than described: the same detail with a cycle uuid spliced in
  // still groups, because uuids are what `fingerprintFor` normalises away.
  const withUuid = cycles.map(c => fingerprintFor({ agentId: calls[0].agent, kind: calls[0].kind, detail: `${calls[0].detail} (cycle ${c})` }).fingerprint);
  assert.strictEqual(new Set(withUuid).size, 1, `a detail differing only by a cycle uuid must mask to one fingerprint; got ${JSON.stringify(withUuid)}`);

  // AND THE CONTROL FOR THIS ARM. A ticket id is NOT masked, so a detail that named one would
  // split. This is what §4's ticket-free details buy, and without it (c) would pass for a
  // fingerprint function that ignored its detail entirely.
  const withTicket = backlogs.map(b => fingerprintFor({ agentId: calls[0].agent, kind: calls[0].kind, detail: `${calls[0].detail} on ${b}` }).fingerprint);
  assert.strictEqual(
    new Set(withTicket).size, backlogs.length,
    `a detail naming the ticket must split per ticket (that is why §4's details name none) -- got ${JSON.stringify(withTicket)}`,
  );
  for (const call of calls) {
    assert.ok(
      !/\bSES-\d+\b|\bDAT-\d+\b|\bAGT-\d+\b/.test(call.detail),
      `step ${call.agent === "designer" ? "6" : "5"}'s --detail names a ticket (${JSON.stringify(call.detail)}) -- the ticket belongs in --backlog=, or the finding stops grouping`,
    );
  }
  return perKind;
}

// (e) The control. Strip every `--record` line and (a) must go red.
function controlGoesRed(md) {
  const stripped = md.split("\n").filter(l => !l.includes("--record")).join("\n");
  assert.notStrictEqual(stripped, md, "control for (a) changed nothing (the SES-158 failure)");
  assert.throws(
    () => theWatchHasCallers(stripped),
    /staff-watch\.js --record/,
    "control: a runbook with every --record line removed still passed (a) -- the arm is vacuous",
  );
}

export default async function run() {
  const md = readLf(RUNBOOK_REL);
  const card = readLf(CARD_REL);

  const sites = theWatchHasCallers(md);        // (a)
  const blockBytes = theDriverBlockSurvived(md); // (b)
  const prints = theDetailsGroupAcrossTickets(md); // (c)
  controlGoesRed(md);                            // (e)

  const cardSha = runbookSha(card);
  const pure = `${sites} call sites in the runbook's own step spans; step 5's driver block still ${blockBytes}B (cap ${FULL_BLOCK_MAX}); ${prints.size} kinds, one fingerprint each (${[...prints.values()].join(", ")})`;

  // == (d) Live: the mirror is pinned to the committed card, under a reversible decision ==========
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      `SES-378f (d): ${KNOWLEDGE_SLUG}'s traits.source_sha256 equals runbookSha(${CARD_REL}), under a kind='${DECISION_KIND}' ${TICKET} decision carrying a FULL-ROW skill_profiles before-image`,
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name "
      + "(docs/runbooks/session-setup.md step 1b) and re-run: "
      + "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js",
    );
    console.log(`  [SES-378f] ${pure}; (d) declared NOT RUN`);
    return;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!r.ok) assert.fail(`PostgREST ${r.status} on ${q}: ${await r.text()}`);
    return r.json();
  };

  const profiles = await get(`skill_profiles?select=id,slug,traits&slug=eq.${KNOWLEDGE_SLUG}`);
  assert.strictEqual(profiles.length, 1, `public.skill_profiles must hold EXACTLY ONE ${KNOWLEDGE_SLUG} row; two means a repair seeded a second copy of the card into the manager's prompt. got ${profiles.length}`);
  const row = profiles[0];
  assert.strictEqual(
    row.traits && row.traits.source_sha256, cardSha,
    `${KNOWLEDGE_SLUG}.traits.source_sha256 must be runbookSha() of the CURRENT ${CARD_REL} (${cardSha}); it pins ${JSON.stringify(row.traits && row.traits.source_sha256)}, so the manager is assembled with a runner cycle that is not the committed one. Re-render and re-pin: node scripts/render-cycle-card.js --write, then --sync-knowledge`,
  );

  // The reversal. A pin repaired without a FULL-ROW image is an edit to an active agent's Knowledge
  // that John cannot undo -- and a NULL image there would tell a Reverse to DELETE the row rather
  // than restore its previous bytes, which is the worse of the two failures.
  const decisions = await get(`runner_decisions?select=id,cycle_id,kind,backlog_id,decided_at&kind=eq.${DECISION_KIND}&backlog_id=eq.${TICKET}&order=decided_at.desc`);
  assert.ok(decisions.length >= 1, `there must be at least one kind='${DECISION_KIND}' decision for ${TICKET} -- AGENT-ROW-AGREED-TICKET makes this write build work ONLY as a decision with a handle and a reversal window`);
  const byId = new Map(decisions.map(d => [d.id, d]));
  const images = await get(`runner_before_images?select=decision_id,table_name,pk_value,row_data&table_name=eq.skill_profiles&pk_value=eq.${row.id}&decision_id=in.(${[...byId.keys()].join(",")})`);
  const imaged = new Set(images.filter(i => i.row_data !== null).map(i => i.decision_id));
  assert.ok(
    imaged.size >= 1,
    `no kind='${DECISION_KIND}' ${TICKET} decision carries a FULL-ROW before-image of skill_profiles ${row.id}. Images seen: ${JSON.stringify(images.map(i => ({ d: i.decision_id, null_row: i.row_data === null })))}`,
  );
  // NEWEST FIRST, and the owning cycle is asserted as a cycle rather than as a literal uuid: the
  // repair is re-run by whichever cycle next re-renders the card, so pinning THIS run's uuid here
  // would go red on the next one while saying nothing about whether the write was imaged.
  const owner = decisions.find(d => imaged.has(d.id));
  assert.ok(UUID_RE.test(String(owner.cycle_id)), `the imaged ${DECISION_KIND} decision must be owned by a runner cycle; got cycle_id ${JSON.stringify(owner.cycle_id)}`);

  console.log(`  [SES-378f] ${pure}; live: ${KNOWLEDGE_SLUG} pinned ${cardSha}, ${imaged.size} imaged ${DECISION_KIND} decision(s), newest ${owner.id} (cycle ${owner.cycle_id})`);
}

selfRun(import.meta.url, run);
