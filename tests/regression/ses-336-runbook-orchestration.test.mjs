// DeepBench v7.0.439 | tests/regression/ses-336-runbook-orchestration.test.mjs | SES-336 --
// runbook steps 6 and 7 hand design and build to The Designer and The Builder, and the rationale
// that is HISTORY moves to docs/SESSIONS.md with a pointer and a checksum.
//
// WHAT IS BEING PINNED, AND THE SHAPE A LAZIER GUARD WOULD PASS VACUOUSLY.
//
// (1) THE TWO HANDOFFS ARE ASSERTED ON WHAT THEY REMOVED AS WELL AS ON WHAT THEY ADDED. A guard
// that only asserted the runbook mentions `design-kickoff` and `build-ticket` would pass on a file
// that name-dropped both capabilities beside the old hand-run ceremony -- which is the drift this
// ship exists to end. So parts (a) and (b) also assert the ceremony is relabelled and carries its
// RETIRED IN PLACE note, and that the Builder is explicitly denied the writes that stayed here.
//
// (2) THE ARCHIVE IS ASSERTED BY CHECKSUM, NOT BY PRESENCE. Twelve blocks moved to
// docs/SESSIONS.md. Asserting that the appendix "contains something" would pass against a summary,
// and a summary is the second, drifting copy a move exists to end. Part (c) recomputes the sha256
// of every archived block over the archived TEXT and compares it with the sha256 the archive itself
// records -- so a later edit to an archived block is a red suite, and it also proves each block's
// pointer resolves to a heading that exists.
//
// (3) THE SIZE CEILING IS A TRIPWIRE, NOT A TARGET. session-hygiene check 7 caps the HEADER stamps
// and nothing has ever capped the BODY -- the file went from 205,135 characters at SES-164 to
// 363,501 bytes at v7.0.438. Part (d) pins a ceiling so growth reddens a suite instead of arriving
// silently. It is deliberately NOT the kickoff's 40 KB target: the ledger's entry 51 records, with
// the census that produced it, why 40 KB is unreachable while ~148 KB of this file is the last home
// of a regression-test assertion and ~81 KB is protected verbatim by the kickoff itself. A ceiling
// nobody can meet is a red suite nobody can fix, which is worse than no ceiling.
//
// (4) THE SECTION LIST IS PINNED IN ORDER. A shrink that dropped a whole step would otherwise pass
// every assertion above.
//
// Source-only: every part runs without credentials, so nothing here is ever declared not-run.

import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readRaw = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const read = rel => readRaw(rel).replace(/\r\n/g, "\n");

const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const SESSIONS_REL = "docs/SESSIONS.md";
const LEDGER_REL = "docs/SELFBUILD-RETIREMENT-LEDGER.md";

// The steps that must still exist, in this order. A step is its bold "**<id>." opener.
const SECTIONS = [
  "**0. Bootstrap.**",
  "**0b. A SILENT predecessor",
  "**1. Open the cycle",
  "**1b. THE SETTINGS GATE",
  "**2. Harvest John's judgment",
  "**2b. VISION COMMENT ROUTING",
  "**3. Check the walls",
  "**4. Blocker sweep #1.**",
  "**4a. THE GREEN ANCHOR",
  "**4a-bis. DEPLOY-SERVING-RED",
  "**4a-ter. DEPLOY-QUOTA HEADROOM",
  "**4a-quater. IP SPEND-GATE BLOCKS",
  "**4a-quinquies. THE RUNNER'S OWN SILENCE",
  "**4b. Invention pass",
  "**5. Pick ONE item.**",
  "**5a. READ WHAT YOUR CLASS EARNED",
  "**6. Full ceremony",
  "**7. QA bar, then ship at ONE ship point.**",
  "**7b. Every decision is a row with a handle",
  "**8. Blocker sweep #2.**",
  "**8a. AUTO-ROLLBACK ON RED",
  "**8b. Heal sweep",
  "**8b-bis. Tripwire sweep",
  "**8c. Background revalidation sweep",
  "**8d. Milestone gate-review sweep",
  "**9. Write the record, then die.**",
];

const PHASES = [
  "## Phase 1 — judgment first",
  "## Phase 2 — the work",
  "## Phase 3 — evidence",
  "## Standing prohibitions (§19v — no step overrides these)",
];

// Measured at this ship: 366,792 bytes. The ceiling is that plus ~4% -- room for one ordinary
// ship's stamp rotation and a paragraph, and nothing like room for a step's worth of new prose.
const SIZE_CEILING_BYTES = 381_000;

const APPENDIX_HEADING =
  "## Appendix — `runner-cycle.md` rationale retired by `SES-336` (v7.0.439, 2026-09-09)";

export default async function run() {
  const runbook = read(RUNBOOK_REL);
  const sessions = read(SESSIONS_REL);
  const ledger = read(LEDGER_REL);

  // ---- (a) step 6 hands the kickoff to The Designer --------------------------------------------
  assert.ok(/\*\*THE KICKOFF IS THE DESIGNER'S WORK NOW, AND THIS STEP ONLY ORCHESTRATES IT/.test(runbook),
    "step 6 must name The Designer as the owner of the kickoff");
  assert.ok(/--agent=designer --capability=design-kickoff --intent=ds-kickoff-intent/.test(runbook),
    "step 6 must assemble design-kickoff over scripts/agent-prompt.js with agent, capability and " +
    "intent named -- a hand-built prompt is a second copy of the executor's assembly");
  assert.ok(/`premise = 'dead'`[\s\S]{0,400}removal proposed/.test(runbook),
    "step 6 must say what a dead premise does: removal proposed, with the Designer's evidence");
  assert.ok(/`premise = 'alive'`[\s\S]{0,400}`kickoff_link`[\s\S]{0,200}`design_status = 'designed'`/.test(runbook),
    "step 6 must say that an alive premise writes the kickoff and sets kickoff_link + design_status " +
    "in ONE write -- ck_design_status_kickoff makes them one act or neither");
  assert.ok(/\(ceremony-legacy\) Then: read the/.test(runbook),
    "step 6's old design ceremony must be relabelled (ceremony-legacy) -- it is no longer the step");
  assert.ok(/RETIRED IN PLACE \(`SES-336`, `v7\.0\.439`\) — `docs\/SELFBUILD-RETIREMENT-LEDGER\.md` entry 49/.test(runbook),
    "the (ceremony-legacy) block must carry its RETIRED IN PLACE note pointing at ledger entry 49");
  for (const slug of ["ds-knowledge-standard", "ds-behavior", "ds-guardrails", "ds-identity"]) {
    assert.ok(runbook.includes("`" + slug + "`"),
      `step 6 must name ${slug} as a surviving home -- "it moved" with no address is a deletion`);
  }
  // The outcome handling was AMENDED, not retired: a guard that missed this would not notice a
  // later editor deleting the removal branch on the grounds that "the Designer does revalidation".
  assert.ok(/the revalidation itself is PERFORMED BY THE DESIGNER/.test(runbook),
    "step 6 must say the revalidation MOVED while its two outcome branches stayed -- collapsing " +
    "those two facts in either direction loses a branch nothing else carries");
  console.log("  (a) step 6 assembles design-kickoff; the ceremony is (ceremony-legacy) under entry 49 -- PASS");

  // ---- (b) step 7 hands the build to The Builder -----------------------------------------------
  assert.ok(/\*\*THE BUILD IS THE BUILDER'S WORK NOW, AND THIS STEP ONLY ORCHESTRATES IT/.test(runbook),
    "step 7 must name The Builder as the owner of the build");
  assert.ok(/--agent=builder --capability=build-ticket --intent=bd-build-intent/.test(runbook),
    "step 7 must assemble build-ticket over scripts/agent-prompt.js");
  assert.ok(/`outcome = 'pushed'`[\s\S]{0,200}`push_sha`[\s\S]{0,120}ship point/.test(runbook),
    "step 7 must say push_sha IS the ship point and there is no second one");
  assert.ok(/finding, not a green/.test(runbook),
    "step 7 must say a regression summary with no quoted suite line is a FINDING -- accepting a " +
    "description of output in place of output is the failure bd-identity's rule exists to stop");
  assert.ok(/`outcome = 'blocked'`[\s\S]{0,200}nothing shipped/.test(runbook),
    "step 7 must say a blocked build ships nothing and is not finished by hand");
  assert.ok(/RETIRED IN PLACE \(`SES-336`, `v7\.0\.439`\) — `docs\/SELFBUILD-RETIREMENT-LEDGER\.md` entry 50/.test(runbook),
    "the QA bar must carry its RETIRED IN PLACE note pointing at ledger entry 50");
  for (const slug of ["bd-knowledge-standards", "bd-behavior", "bd-guardrails", "bd-identity"]) {
    assert.ok(runbook.includes("`" + slug + "`"),
      `step 7 must name ${slug} as a surviving home`);
  }
  // The QA bar is KEPT: bd-knowledge-standards cites this step by name, and an attended cycle runs
  // no Builder. A guard that let the bullets be deleted would break both readers at once.
  assert.ok(/`npm install && npm run build` green/.test(runbook),
    "the QA bar must still be readable here -- bd-knowledge-standards cites this step BY NAME, and " +
    "an attended cycle runs no Builder and grades its own ship against it");
  assert.ok(/THE VERDICT, THE CLOSE-OUT AND THE RECORD BELOW STAY THIS STEP'S/.test(runbook),
    "step 7 must say the verdict, the close-out and the record did NOT move -- bd-guardrails " +
    "forbids the Builder writing a status or a verdict, so moving them would hand a write to an " +
    "agent whose own rules refuse it");
  console.log("  (b) step 7 assembles build-ticket; the QA bar is retired in place under entry 50 -- PASS");

  // ---- (c) the archive: every block resolves AND matches its recorded checksum -------------------
  const apIdx = sessions.indexOf(APPENDIX_HEADING);
  assert.notStrictEqual(apIdx, -1, `docs/SESSIONS.md is missing the SES-336 appendix heading`);
  // The appendix runs to the next "## " heading or to EOF.
  const afterHeading = sessions.slice(apIdx + APPENDIX_HEADING.length);
  const nextTop = afterHeading.indexOf("\n## ");
  const appendix = nextTop === -1 ? afterHeading : afterHeading.slice(0, nextTop);

  const entryRe = /^### ([A-L]) — (.+)$/gm;
  const starts = [];
  for (const m of appendix.matchAll(entryRe)) starts.push({ id: m[1], index: m.index, len: m[0].length });
  assert.strictEqual(starts.length, 12,
    `the SES-336 appendix must carry 12 archived blocks (A-L), found ${starts.length}`);

  let archivedBytes = 0;
  for (let i = 0; i < starts.length; i++) {
    const { id, index, len } = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : appendix.length;
    const section = appendix.slice(index + len, end);
    const shaM = section.match(/sha256 `([0-9a-f]{64})`/);
    assert.ok(shaM, `archived block ${id} records no sha256 -- the checksum is what makes the move provable`);
    // The block body is everything after the provenance line, trimmed of the framing newlines the
    // archiver added. Reconstructed the same way the archiver wrote it.
    const provEnd = section.indexOf("*\n", section.indexOf("sha256 `"));
    assert.notStrictEqual(provEnd, -1, `archived block ${id} has a malformed provenance line`);
    const body = section.slice(provEnd + 2).replace(/^\n/, "").replace(/\n+$/, "");
    const actual = crypto.createHash("sha256").update(body, "utf8").digest("hex");
    assert.strictEqual(actual, shaM[1],
      `archived block ${id} does NOT match its recorded sha256 -- it was edited after the move, or ` +
      `summarised. recorded ${shaM[1].slice(0, 16)}…, actual ${actual.slice(0, 16)}…`);
    archivedBytes += Buffer.byteLength(body, "utf8");
    // The pointer left behind must name this entry's appendix, so the fact is findable from the step.
    assert.ok(runbook.includes("appendix *runner-cycle.md rationale retired by `SES-336`*, entry " + id),
      `the runbook carries no pointer naming archived entry ${id} -- a move with no pointer is a ` +
      "deletion that happens to have a backup");
  }
  assert.ok(archivedBytes > 10_000,
    `only ${archivedBytes} bytes are archived; the SES-336 move was 11,255 -- a shrunk archive means ` +
    "blocks were dropped rather than moved");
  console.log(`  (c) 12 archived blocks, ${archivedBytes}B, every sha256 verified and every pointer resolves -- PASS`);

  // ---- (d) the surviving section list, in order, and the size ceiling ---------------------------
  let cursor = -1;
  for (const s of SECTIONS) {
    const at = runbook.indexOf(s, cursor + 1);
    assert.notStrictEqual(at, -1, `step "${s}" is missing from the runbook, or is out of order`);
    cursor = at;
  }
  let pcursor = -1;
  for (const p of PHASES) {
    const at = runbook.indexOf(p, pcursor + 1);
    assert.notStrictEqual(at, -1, `phase heading "${p}" is missing, or is out of order`);
    pcursor = at;
  }
  const bytes = fs.statSync(path.join(ROOT, RUNBOOK_REL)).size;
  assert.ok(bytes <= SIZE_CEILING_BYTES,
    `${RUNBOOK_REL} is ${bytes} bytes, over the ${SIZE_CEILING_BYTES}-byte ceiling SES-336 pinned. ` +
    "This file is read in full by every Automated cycle, so growth is a real per-cycle cost. Move " +
    "history to docs/SESSIONS.md and role judgment to the role's Skills -- do not raise the ceiling " +
    "to make this green.");
  console.log(`  (d) ${SECTIONS.length} steps + ${PHASES.length} phase headings in order; ` +
    `${bytes}B / ${SIZE_CEILING_BYTES}B ceiling -- PASS`);

  // ---- (e) the ledger entries, and the stamp rotation -------------------------------------------
  for (const [n, needle] of [
    [49, "the design ceremony (moved into The Designer)"],
    [50, "the QA bar as a cycle's own checklist (moved into The Builder)"],
    [51, "twelve rationale blocks moved to `docs/SESSIONS.md`"],
  ]) {
    const head = `### ${n}. \`runner-cycle.md\``;
    assert.ok(ledger.includes(head), `ledger entry ${n} is missing`);
    assert.ok(ledger.slice(ledger.indexOf(head), ledger.indexOf(head) + 400).includes(needle),
      `ledger entry ${n}'s heading must name what was retired (${needle})`);
  }
  const e51 = ledger.slice(ledger.indexOf("### 51. `runner-cycle.md`"));
  assert.ok(/148,047 bytes are the LAST home of at least one regression-test\s*\n?\s*assertion/.test(e51)
    || /148,047/.test(e51),
    "entry 51 must carry the measured reason the 40 KB target was not met -- an entry that said " +
    "'we shrank what we could' with no census is the judgement-by-eye this ledger exists to replace");
  assert.ok(/80,959/.test(e51),
    "entry 51 must name the protected-verbatim byte count, which alone is twice the 40 KB target");

  const stamps = runbook.split("\n").filter(l => l.startsWith("<!-- DeepBench v")).length;
  assert.ok(stamps <= 5,
    `${RUNBOOK_REL} carries ${stamps} header stamps; session-hygiene check 7 caps it at 5`);
  assert.ok(sessions.includes("<!-- DeepBench v7.0.422 | runbooks/runner-cycle.md"),
    "the stamp SES-336 retired (v7.0.422) is not in docs/SESSIONS.md's stamp appendix");
  assert.ok(!runbook.includes("<!-- DeepBench v7.0.422 | runbooks/runner-cycle.md"),
    "v7.0.422 is still in the runbook header -- it was copied, not rotated");
  // SES-164 step 2's one relocation. A rotation that archived this warning instead of relocating it
  // would leave the body with no home for it, which is content loss with a clean diff.
  assert.ok(/names `sweep_decision_windows` WITHOUT its argument list/.test(runbook),
    "the one v7.0.422 warning with no body home -- that the tail names sweep_decision_windows " +
    "without its argument list on purpose, because ses-286b's mutation is vacuous against a second " +
    "copy -- must have been RELOCATED into the body, not archived with the stamp");
  console.log(`  (e) ledger 49/50/51 with the census; stamp count ${stamps}/5, v7.0.422 archived, ` +
    "its one unhomed warning relocated -- PASS");
}

selfRun(import.meta.url, run);
