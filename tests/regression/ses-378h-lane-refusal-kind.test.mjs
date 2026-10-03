// DeepBench v7.0.520 | tests/regression/ses-378h-lane-refusal-kind.test.mjs | SES-378 slice 8
//
// FEATURE: the lane refusal gets its own name. `--check-kickoff` exits 1 for TWO causes
// (`scripts/verifier.js`: `kind: "kickoff-over-cap"`, then `kickoffLaneFinding()`'s
// `kind: "kickoff-no-lanes"`), and step 6 statement 3 named only the first. Measured on the
// unedited tree at `aaa0abbe`: `grep -c kickoff-over-cap docs/runbooks/runner-cycle.md` was **0**
// and the same grep for `kickoff-no-lanes` was **0**, so a cycle that hit the SECOND cause had no
// named kind and no fixed detail to record it under. That already cost a row:
// `runner_staff_findings` `d52d37a0` (cycle `779a95c6`, 2026-09-18) carries an invented kind and a
// free-text detail, and `fingerprintFor` normalises uuids but never shortens prose -- so that row
// is a singleton the 3-cycle promotion bar can never be reached from.
//
// WHAT THIS FILE GUARDS, and where a lazier guard would pass vacuously.
//
// (a) BOTH CAUSES ARE NAMED WHERE THE EXIT CODE IS READ -- step 6, cut with the SHIPPED parser
//     (`parseSteps`), not by grepping a 380 KB file, so a branch that drifted into step 7 stops
//     counting. Each cause's `--record` command is required IN THAT CAUSE'S OWN REGION of the span
//     (between its `kind` and the next one), on ONE line carrying `staff-watch.js --record` and
//     `--agent=designer` together: three facts scattered across a step are not a command anyone can
//     run, and a finding filed against the wrong agent promotes the wrong agent's defect. The two
//     `--kind=` values are then required to DIFFER and both to be in `KINDS` -- one kind for two
//     causes is the defect this slice exists to close, and a kind outside `KINDS` exits 2 and
//     writes nothing.
//
// (b) THE TWO STRINGS ARE THE CODE'S, NOT THIS FILE'S, and they are DRIVEN rather than quoted: the
//     shipped CLI is run with `--json` on a real over-cap kickoff and on a real kickoff with no
//     `Lanes:` line, and the `kind` a cycle is told to branch on is read out of the payload. BOTH
//     DIRECTIONS: a sound kickoff (this ticket's own) must produce NEITHER string, or the runbook
//     would be telling every cycle to file a Designer finding on every ship. And neither string may
//     appear anywhere in the runbook OUTSIDE step 6's span -- a second home is a second procedure.
//
// (c) THE TWO DETAILS FINGERPRINT APART, WHICH IS THE WHOLE POINT OF GIVING THE SECOND CAUSE A NAME.
//     The details are read OUT OF THE RUNBOOK, so the thing under test is the shipped text. Each
//     must fingerprint ONE way across two tickets x two cycle uuids (the ticket rides in
//     `--backlog=`, never in the detail), and the two must not collapse to ONE hash -- that
//     collapse would promote a cap refusal as a lane refusal. No detail may name a ticket or carry
//     a uuid, which is exactly what `d52d37a0`'s free text did.
//
// (d) LIVE: every `runner_staff_findings.kind` is one `KINDS` admits. Declares itself NOT RUN
//     without credentials rather than passing.
//
// (e) THE SES-158 NEGATIVE CONTROL. A runbook copy with the `kickoff-no-lanes` branch stripped must
//     make (a) THROW. A control that changes nothing pins nothing.
//
// SOURCE-ONLY except (d); (b) drives the shipped CLI in a child process with the credentials
// REMOVED from its env, which is also how it proves the branch runs ahead of any credential check.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSteps, RUNBOOK_REL } from "../../scripts/render-cycle-card.js";
import { fingerprintFor, KINDS, TABLE } from "../../scripts/staff-watch.js";
import { kickoffLaneFinding } from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readLf = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// The step that reads the exit code, and the two `kind` values it must branch on. Named once, so
// this file cannot assert two different vocabularies.
const STEP = "6";
const OVER_CAP_KIND = "kickoff-over-cap";
const NO_LANES_KIND = "kickoff-no-lanes";
const JSON_KINDS = [OVER_CAP_KIND, NO_LANES_KIND];

// Three REAL kickoffs, one per outcome: 55,824 bytes (over cap), 3,445 bytes with no `Lanes:` line
// (the SES-359 case, within cap so it can only be refused on lanes), and this ticket's own.
const OVER_CAP_REL = "docs/kickoffs/v7.0.454-SES-360-governance-agents-brief-block.md";
const NO_LANES_REL = "docs/kickoffs/v7.0.448-SES-368-weekly-pace-gate.md";
const OWN_REL = "docs/kickoffs/v7.0.520-SES-378-the-lane-refusal-gets-its-name.md";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// A step's own lines, cut with the renderer's parser rather than a regex of this file's own, so
// "which lines are step N" has ONE answer in the repo and this test cannot disagree with the card.
// Same helper shape as ses-378g.
export function stepSpan(md, label) {
  const steps = parseSteps(md);
  const i = steps.findIndex(s => s.label === label);
  assert.ok(i >= 0, `${RUNBOOK_REL} has no step **${label}.** marker at all`);
  const lines = md.split("\n");
  const end = steps[i + 1] ? steps[i + 1].line - 1 : lines.length;
  return lines.slice(steps[i].line - 1, end).join("\n");
}

// (a) as a function, so (e) can drive it against a mutated copy.
export function bothCausesHaveCallers(md) {
  const lines = stepSpan(md, STEP).split("\n");

  const markers = JSON_KINDS.map(kind => {
    const at = lines.findIndex(l => l.includes(kind));
    assert.ok(
      at >= 0,
      `${RUNBOOK_REL} step ${STEP}'s span never names \`${kind}\` -- that is one of the TWO kinds `
      + `\`--check-kickoff\` exits 1 with, and a cause the procedure does not name is a cause the `
      + `cycle that hits it invents a kind for (runner_staff_findings d52d37a0)`,
    );
    return { kind, at };
  }).sort((a, b) => a.at - b.at);

  const calls = markers.map((m, i) => {
    // THE CALL MUST BE IN ITS OWN CAUSE'S REGION. A single `--record` line serving both branches is
    // precisely the one-kind-for-two-causes state this slice closes, and a region-less search would
    // accept it.
    const end = markers[i + 1] ? markers[i + 1].at : lines.length;
    const region = lines.slice(m.at, end);
    const hit = region.find(l =>
      l.includes("staff-watch.js --record")
      && l.includes("--agent=designer")
      && /--kind='[^']+'/.test(l));
    assert.ok(
      hit,
      `${RUNBOOK_REL} step ${STEP}: the \`${m.kind}\` branch (span line ${m.at + 1}) carries no single `
      + `line holding \`staff-watch.js --record\`, \`--agent=designer\` and a \`--kind='...'\` together `
      + `before the next branch begins. Lines in that region naming --record at all: `
      + `${region.filter(l => l.includes("--record")).length}`,
    );
    return { jsonKind: m.kind, kind: /--kind='([^']+)'/.exec(hit)[1] };
  });

  for (const call of calls) {
    assert.ok(
      KINDS.includes(call.kind),
      `the \`${call.jsonKind}\` branch records kind ${JSON.stringify(call.kind)}, which `
      + `scripts/staff-watch.js KINDS does not admit -- the script exits 2 on an unrecognised --kind `
      + `and writes NO row, so that branch would look live and record nothing`,
    );
  }
  assert.strictEqual(
    new Set(calls.map(c => c.kind)).size, calls.length,
    `the two causes must record under DIFFERENT kinds; both use ${JSON.stringify(calls[0].kind)}. `
    + `One kind for two causes is the defect: a lane refusal would promote as a cap refusal.`,
  );
  return calls;
}

// A child env with the two credentials REMOVED rather than blanked (the ses-376 idiom): a deleted
// key is what "no credentials" actually looks like, and exit 1 rather than 2 proves the kickoff
// branch runs AHEAD of the credential check.
function runCheckKickoff(rel) {
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;
  const r = spawnSync(process.execPath, ["scripts/verifier.js", `--check-kickoff=${rel}`, "--json"],
    { cwd: ROOT, encoding: "utf8", env });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  let payload;
  try { payload = JSON.parse(out.split("\n").filter(Boolean).pop()); } catch (e) {
    assert.fail(`--check-kickoff=${rel} --json did not print a JSON payload (${e.message}): ${out}`);
  }
  return { status: r.status, payload, out };
}

// (b) The strings are the code's own, driven, and they do not fire on a sound kickoff.
export function theStringsAreTheCodes(md) {
  // The lane finding, driven directly: the kind is a property of the function, not of this file.
  const noLanes = kickoffLaneFinding("no declaration here");
  assert.ok(noLanes, "kickoffLaneFinding must report on a document with no Lanes: line");
  assert.strictEqual(
    noLanes.kind, NO_LANES_KIND,
    `the runbook tells a cycle to branch on kind ${JSON.stringify(NO_LANES_KIND)}; kickoffLaneFinding `
    + `returns ${JSON.stringify(noLanes.kind)}, so the branch would never be taken`,
  );
  // BOTH DIRECTIONS at the unit level too: a declared lane line is NOT a finding, or the second
  // branch would fire on every sound kickoff.
  assert.strictEqual(
    kickoffLaneFinding("Lanes: session; executor none"), null,
    "a declared `Lanes: session; executor none` line must produce NO finding",
  );

  // The CLI, which is what step 6 actually runs, on both real causes and on a sound kickoff.
  const overCap = runCheckKickoff(OVER_CAP_REL);
  assert.strictEqual(overCap.status, 1, `--check-kickoff on ${OVER_CAP_REL} must exit 1 (exit 2 means the credential check ran first): ${overCap.out}`);
  assert.strictEqual(
    overCap.payload.kind, OVER_CAP_KIND,
    `${OVER_CAP_REL} must report kind ${JSON.stringify(OVER_CAP_KIND)}; it reports ${JSON.stringify(overCap.payload.kind)}`,
  );

  const laneRefusal = runCheckKickoff(NO_LANES_REL);
  assert.strictEqual(laneRefusal.status, 1, `--check-kickoff on ${NO_LANES_REL} must exit 1: ${laneRefusal.out}`);
  assert.strictEqual(
    laneRefusal.payload.kind, NO_LANES_KIND,
    `${NO_LANES_REL} is within the cap and declares no lanes, so it must report kind `
    + `${JSON.stringify(NO_LANES_KIND)}; it reports ${JSON.stringify(laneRefusal.payload.kind)}. `
    + `Two causes sharing ONE kind is what this slice exists to prevent.`,
  );
  assert.notStrictEqual(
    overCap.payload.kind, laneRefusal.payload.kind,
    "the two exit-1 causes must be distinguishable from the --json payload alone -- that is the whole branch",
  );

  const sound = runCheckKickoff(OWN_REL);
  assert.strictEqual(sound.status, 0, `${OWN_REL} must pass --check-kickoff cleanly: ${sound.out}`);
  for (const kind of JSON_KINDS) {
    assert.notStrictEqual(
      sound.payload.kind, kind,
      `${OWN_REL} reports ${JSON.stringify(kind)} -- a checker that fires on a sound kickoff turns `
      + `step 6's new branch into an instruction to file a Designer finding on every ship`,
    );
  }

  // ONE HOME. Neither string may appear outside step ${STEP}'s span: a second home is a second
  // procedure, and the two would drift.
  const span = stepSpan(md, STEP);
  const counted = {};
  for (const kind of JSON_KINDS) {
    const inFile = md.split(kind).length - 1;
    const inSpan = span.split(kind).length - 1;
    assert.ok(inSpan >= 1, `${RUNBOOK_REL} step ${STEP}'s span must name ${JSON.stringify(kind)}`);
    assert.strictEqual(
      inFile, inSpan,
      `${JSON.stringify(kind)} appears ${inFile} times in ${RUNBOOK_REL} but only ${inSpan} inside step `
      + `${STEP}'s span -- the branch has a second home that nothing keeps in step with this one`,
    );
    counted[kind] = inSpan;
  }
  return { counted, reasons: { cap: overCap.payload.reason, lane: laneRefusal.payload.reason } };
}

// The §4 record commands, read out of the runbook so (c) drives the SHIPPED bytes.
export function recordCallsIn(md, label) {
  const flat = stepSpan(md, label).replace(/\s+/g, " ");
  const cmds = flat.match(/node scripts\/staff-watch\.js --record[^`]*/g) || [];
  assert.ok(cmds.length >= 2, `${RUNBOOK_REL} step ${label}'s span must carry BOTH of §4's --record commands; found ${cmds.length}`);
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

// (c) One defect, many tickets and many cycles, ONE fingerprint -- and the two causes, TWO.
export function theDetailsFingerprintApart(md) {
  const calls = recordCallsIn(md, STEP);
  const backlogs = ["SES-378", "DAT-19"];
  const cycles = [
    "c635d52e-b014-407a-a333-957c7d4728c7",
    "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
  ];

  const prints = new Map();
  for (const call of calls) {
    assert.strictEqual(call.agent, "designer", `step ${STEP}'s refusals are the DESIGNER's findings; ${JSON.stringify(call.kind)} is filed on ${JSON.stringify(call.agent)}`);
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
    assert.ok(
      !UUID_RE.test(call.detail),
      `${JSON.stringify(call.detail)} carries a uuid. fingerprintFor masks uuids, so this would not `
      + `split the group -- but a FIXED detail is what makes the two causes tell apart, and a uuid in `
      + `it is the free-text shape that produced the singleton row d52d37a0`,
    );
    prints.set(call.detail, [...seen][0]);
  }

  // THE TWO CAUSES ARE TWO DEFECTS. If both details collapsed to one hash, the arm above would still
  // pass while a lane refusal promoted as a cap refusal -- exactly the confusion this slice ends.
  assert.strictEqual(
    new Set(prints.values()).size, prints.size,
    `step ${STEP}'s details must fingerprint DIFFERENTLY; got ${JSON.stringify([...prints])}`,
  );
  return prints;
}

// (e) The control. Strip the `kickoff-no-lanes` branch and (a) must go red.
function controlGoesRed(md) {
  const stripped = md.split("\n").filter(l => !l.includes(NO_LANES_KIND)).join("\n");
  assert.notStrictEqual(stripped, md, "control for (a) changed nothing (the SES-158 failure)");
  assert.throws(
    () => bothCausesHaveCallers(stripped),
    new RegExp(NO_LANES_KIND),
    "control: a runbook with the lane-refusal branch removed still passed (a) -- the arm is vacuous",
  );
}

export default async function run() {
  const md = readLf(RUNBOOK_REL);

  const calls = bothCausesHaveCallers(md);     // (a)
  const strings = theStringsAreTheCodes(md);   // (b)
  const prints = theDetailsFingerprintApart(md); // (c)
  controlGoesRed(md);                            // (e)

  const pure = `step ${STEP} branches on both kinds (`
    + `${calls.map(c => `${c.jsonKind} -> --kind='${c.kind}'`).join("; ")}), each named once in the `
    + `runbook and nowhere else; the CLI's own payloads ("${strings.reasons.cap.slice(0, 28)}...", `
    + `"${strings.reasons.lane.slice(0, 28)}...") and neither on ${OWN_REL}; `
    + `${prints.size} details, one fingerprint each (${[...prints.values()].join(", ")})`;

  // == (d) Live: every recorded kind is one the vocabulary admits ==================================
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      `SES-378h (d): every public.${TABLE}.kind is one of scripts/staff-watch.js KINDS -- the `
      + `evidence that no cycle is still inventing a kind for an unnamed cause`,
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name "
      + "(docs/runbooks/session-setup.md step 1b) and re-run: "
      + "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js",
    );
    console.log(`  [SES-378h] ${pure}; (d) declared NOT RUN`);
    return;
  }

  const base = url.replace(/\/+$/, "");
  const r = await fetch(`${base}/rest/v1/${TABLE}?select=id,kind,agent_id,created_at&order=created_at.desc&limit=200`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) assert.fail(`PostgREST ${r.status} on ${TABLE}: ${await r.text()}`);
  const rows = await r.json();
  const strays = rows.filter(row => !KINDS.includes(row.kind));
  assert.strictEqual(
    strays.length, 0,
    `public.${TABLE} holds ${strays.length} row(s) whose kind is outside KINDS `
    + `(${JSON.stringify(strays.map(s => ({ id: s.id, kind: s.kind })))}). A kind the vocabulary does `
    + `not admit is a finding nothing groups with, so it can never reach the promotion bar.`,
  );

  console.log(`  [SES-378h] ${pure}; live: ${rows.length} ${TABLE} row(s), every kind inside KINDS `
    + `(${[...new Set(rows.map(x => x.kind))].join(" | ") || "none recorded"})`);
}

selfRun(import.meta.url, run);
