// DeepBench v7.0.608 | tests/regression/agt-138-researcher-routine.test.mjs | AGT-138 -- THE
// RESEARCHER LEFT THE BUILDER CYCLE FOR ITS OWN WEEKLY ROUTINE, and this file is the guard on all
// five halves of that move: the playbook exists and is the prompt's source, step 4b is a pointer
// and nothing else, the card says so, the drift check knows a third routine, and `finding_routes`
// carries the `researcher` row that stops audit-review.js throwing at the manager's door.
//
// EVERY ARM IS A PAIR, because each of the five facts has a shape that would pass vacuously on its
// own. "The playbook mentions research-class-lens" passes on a playbook that name-dropped it beside
// a runbook that still runs the pass -- so each arm asserts the new state AND the absence of the
// old one, and where an absence is the assertion, a control mutation proves the probe can report
// false at all (the SES-158 / LOO-013 rule: say which branch fired).
//
//   A  the playbook (pure)   -- the block extracts exactly once, carries PART 1's two-column write
//                              rule and PART 2's capability call, carries NEITHER interim statement,
//                              and carries the moved method verbatim. CONTROL: with the BEGIN marker
//                              stripped, extractBlock THROWS -- so a playbook whose markers rotted
//                              is exit 2 at the check, never a false green here.
//   B  the runbook (pure)    -- the retirement line is present; invention_due(), the legacy items
//                              and the Reverse ceremony are NOT; the file is exactly the re-pinned
//                              BYTES_AT_SHIP, under SES-336's ceiling, and the pin moved off the
//                              pre-change 380,980. CONTROL: each presence probe reports false on a
//                              copy with its own subject removed.
//   C  the card (pure)       -- the generated 4b line is the pointer's outcome, the old
//                              "due false -> write INVENTION PASS" outcome is gone, and the card is
//                              byte-equal to render(runbook): the renderer's own check exits 0.
//   D  the check (spawned)   -- --routine=researcher is a known routine now (exit 0 against the
//                              block, exit 1 with a finding against a mutated prompt, and the
//                              finding's location is the live trigger's). CONTROL: an unknown
//                              --routine still exits 2, and its message names all three.
//   E  the route (live, read-only) -- exactly one `researcher` row, finding_type '*', project_slug
//                              NULL, no catch-all; routeGroup() returns it and throws nothing.
//                              CONTROL: drop that row from the routes and the SAME call throws
//                              `unmapped source researcher`, which is the throw AGT-138 removed.
//
// NOTHING HERE WRITES A ROW. Arm E is two GETs and pure function calls over their result.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { ROUTINES, extractBlock, comparePrompt } from "../../scripts/check-routine-prompt.js";
import { routeGroup } from "../../scripts/audit-review.js";
import { BYTES_AT_SHIP, RUNBOOK_CEILING } from "./ses-413d-questions-scoreboard.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const PLAYBOOK_REL = "docs/runbooks/researcher-routine.md";
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const CARD_REL = "docs/runbooks/cycle-card.md";
const TRIGGER_ID = "trig_01862LsK4ZQF8PTgQoK2cgCV";

// The pre-change tree, from the kickoff's own CONTEXT section: the runbook measured 380,980 B and
// step 4b still carried the pass. Kept as a literal rather than read from git, because a rebase
// rewrites the sha of the commit it would have to be read from.
const PRE_CHANGE_BYTES = 380980;

const RETIREMENT_LINE =
  "**4b. Invention pass — retired from the cycle (`AGT-138`, `v7.0.608`).** The Researcher runs in " +
  "its own routine, `docs/runbooks/researcher-routine.md`; a cycle no longer runs the pass. Go to step 4c.";
const CARD_4B_OUTCOME = "retired: the Researcher runs in its own routine (researcher-routine.md); go to 4c";
const CARD_4B_RETIRED_OUTCOME = "due false → write INVENTION PASS: <reason> in notes and skip the rest";

// The method's own sentences, each one a thing the move had to carry rather than summarise.
const MOVED = [
  "**THE PASS IS THE RESEARCHER'S WORK NOW, AND THIS STEP ONLY ORCHESTRATES IT",
  "--agent=researcher --capability=research-class-lens --intent=rs-research-intent",
  "Egress probe (precondition C3, measured not assumed)",
  "(1-legacy)", "(2-legacy)", "(3-legacy)", "(4-legacy)",
  "RETIRED IN PLACE (`SES-335`, `v7.0.438`) — `docs/SELFBUILD-RETIREMENT-LEDGER.md` entry 48",
  "An editor must not treat",
  "public.file_invention_proposal(<your cycle id>, NULL, p)",
  "SELECT * FROM public.record_rejected_invention('<decision id>');",
  "Its `ladder_work_class` is the LITERAL `'invention'`, never derived from the proposal's own",
];

// The two statements the live prompt carries ONLY because the playbook did not exist yet. Neither
// may survive into the block: the first defers to this file, the second says the filing gate is
// shut and names SES-369 -- the ticket this ship supersedes.
const INTERIM = [
  "INTERIM PROMPT until ticket AGT-138 ships",
  "The invention filing gate is known to be shut (SES-369)",
];

const failures = [];
async function arm(name, fn) {
  try { await fn(); console.log(`    [arm ${name}] ok`); }
  catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
}

function get(url, key, q) {
  return fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
}

export default async function run() {
  const playbook = read(PLAYBOOK_REL);
  const runbook = read(RUNBOOK_REL);
  const card = read(CARD_REL);

  // --- A. the playbook is the prompt's source, and the method's one home ----------------------
  await arm("A playbook", async () => {
    const r = ROUTINES.researcher;
    assert.ok(r, "check-routine-prompt.js must know a `researcher` routine");
    assert.equal(r.file, "researcher-routine.md");
    assert.equal(r.id, TRIGGER_ID, "the routine id must be John's live trigger, not a placeholder");
    const block = extractBlock(playbook, r);
    assert.ok(block.text.startsWith("DEEPBENCH — THE RESEARCHER (GV-02"),
      `the block must begin with the live prompt's own first line, got ${JSON.stringify(block.text.slice(0, 60))}`);
    // PART 1's whole safety property is WHICH columns it writes: the other three belong to other
    // writers, and a prompt that lost this sentence would let a run overwrite John's own text.
    assert.ok(block.text.includes("research_note = '<VERDICT>") && block.text.includes("researched_at = now()"),
      "PART 1 must still name the two columns the Napkin pass writes");
    assert.ok(/Never change text, status, note \(attended Claude sessions' column\) or nathan_note/.test(block.text),
      "PART 1 must still forbid writing the three columns that are not the Researcher's");
    assert.ok(block.text.includes("--agent=researcher --capability=research-class-lens"),
      "PART 2 must still assemble the capability through agent-prompt.js, never by hand");
    for (const s of INTERIM) {
      assert.ok(!block.text.includes(s),
        `the block still carries the interim statement ${JSON.stringify(s)} -- the playbook exists ` +
        "now, and SES-369 is superseded by this ship");
    }
    for (const s of MOVED) {
      assert.ok(playbook.includes(s),
        `${PLAYBOOK_REL} is missing ${JSON.stringify(s)} -- the method moved VERBATIM; a summary ` +
        "would be the second, drifting copy the move exists to end");
    }
    // The live instruction that REPLACED the filing call: proposals reach the audit intake.
    assert.ok(/audit-ledger\.js --ingest=.*--found-by=researcher:weekly-market --type=proposal/.test(playbook),
      "the playbook must send proposals to the ledger intake under found_by researcher:weekly-market");
    assert.ok(/`finding_routes` carries the `researcher` row/.test(playbook),
      "the playbook must say why that ingest does not throw at the manager's door");
    // The `prompt` row of the What-this-is table NAMES both markers inside code spans, and that
    // mention must not be read as a marker -- it is why extractBlock matches whole lines only.
    assert.equal(playbook.split("\n").filter(l => l.includes(r.begin)).length, 2,
      "the table row must name the BEGIN marker beside the marker line itself");
    assert.equal(playbook.split("\n").filter(l => l === r.begin).length, 1,
      "exactly one WHOLE line is the BEGIN marker -- the table's code-span mention is not one");
    // CONTROL: the marker pair is what makes the block readable at all. Drop the marker LINE and
    // the reader must THROW (the check's exit 2), never silently return a smaller block.
    const noMarker = playbook.split("\n").filter(l => l !== r.begin).join("\n");
    assert.throws(() => extractBlock(noMarker, r),
      /must be a whole line exactly once/,
      "extractBlock must refuse a playbook whose BEGIN marker line is gone -- a check that guessed " +
      "at the boundary would compare the live prompt against prose");
    console.log(`      block ${Buffer.byteLength(block.text, "utf8")} B at ${PLAYBOOK_REL}:${block.beginLine + 1}`);
  });

  // --- B. step 4b is a pointer, and the byte pin moved with it --------------------------------
  await arm("B runbook", async () => {
    assert.ok(runbook.includes(RETIREMENT_LINE),
      "the runbook must carry step 4b's retirement line verbatim");
    assert.ok(!runbook.split(RETIREMENT_LINE).join("").includes(RETIREMENT_LINE),
      "control: the presence probe must report false once its own subject is removed");
    for (const gone of [
      "SELECT * FROM public.invention_due();",
      "(1-legacy)",
      "SELECT * FROM public.record_rejected_invention('<decision id>');",
      "Egress probe (precondition C3, measured not assumed)",
    ]) {
      assert.ok(!runbook.includes(gone),
        `${RUNBOOK_REL} still carries ${JSON.stringify(gone)} -- it moved to ${PLAYBOOK_REL}, and ` +
        "two live homes for one procedure is what check 13 forbids");
    }
    // The step stays in place so the nine `step 4b` cross-references and ses-336's ordered step
    // list still resolve -- a delete would have broken both.
    assert.ok(runbook.includes("**4b. Invention pass"),
      "the `**4b. Invention pass` opener must survive: ses-336 pins it in its ordered step list");
    assert.ok(runbook.split("\n").filter(l => /step 4b|step-4b/.test(l)).length >= 5,
      "the runbook's own `step 4b` cross-references must still be there to resolve");

    const bytes = Buffer.byteLength(fs.readFileSync(path.join(ROOT, RUNBOOK_REL)));
    assert.equal(bytes, BYTES_AT_SHIP,
      `${RUNBOOK_REL} is ${bytes} B but ses-413d pins BYTES_AT_SHIP at ${BYTES_AT_SHIP} -- the ` +
      "re-pin lands in the SAME commit as the removal, which is what ses-424f:291 asserts");
    assert.ok(BYTES_AT_SHIP <= RUNBOOK_CEILING, "the pin must stay under SES-336's ceiling");
    assert.notEqual(BYTES_AT_SHIP, PRE_CHANGE_BYTES,
      `BYTES_AT_SHIP is still the pre-change ${PRE_CHANGE_BYTES} -- the removal did not re-pin, so ` +
      "ses-413d and ses-424f are both red on a tree that otherwise looks shipped");
    assert.ok(bytes < PRE_CHANGE_BYTES,
      "this ship REMOVES bytes: the pass moved out and a 199 B pointer came in");
    console.log(`      ${RUNBOOK_REL} ${PRE_CHANGE_BYTES} → ${bytes} B of ${RUNBOOK_CEILING}`);
  });

  // --- C. the generated card says the step is retired -----------------------------------------
  await arm("C card", async () => {
    const line = card.split("\n").find(l => l.startsWith("**4b.**"));
    assert.ok(line, "the card must still carry a 4b line -- the step is retired, not deleted");
    assert.ok(line.includes(CARD_4B_OUTCOME),
      `the card's 4b outcome must be the pointer's, got ${JSON.stringify(line)}`);
    assert.ok(!card.includes(CARD_4B_RETIRED_OUTCOME),
      "the card still carries the pass's old outcome -- NOTES['4b'] was not re-written, so the " +
      "Development Manager is still told to gate on `due`");
    // 27 step lines, `gate` included -- the renderer's own count, and the number it printed on the
    // write. The regex matches the gate line too, so nothing is added to the total by hand.
    assert.equal(card.split("\n").filter(l => /^\*\*[0-9a-z-]+\.\*\* /.test(l)).length, 27,
      "the card must still describe 27 steps (the gate plus 26 numbered) -- retiring 4b turns its " +
      "line into a pointer, it does not remove the step");
    // Byte-equal to render(runbook): the renderer's own check, which is the only thing that can
    // say so, and it is the same check the suite's ses-377 runs.
    const chk = spawnSync(process.execPath, [path.join(ROOT, "scripts", "render-cycle-card.js")],
      { cwd: ROOT, encoding: "utf8" });
    assert.equal(chk.status, 0,
      `render-cycle-card.js must exit 0 -- the committed card differs from render(${RUNBOOK_REL}): ` +
      `${(chk.stdout || "") + (chk.stderr || "")}`.slice(0, 400));
  });

  // --- D. the drift check knows a third routine ------------------------------------------------
  await arm("D check", async () => {
    const script = path.join(ROOT, "scripts", "check-routine-prompt.js");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt138-"));
    const block = extractBlock(playbook, ROUTINES.researcher);
    const good = path.join(tmp, "prompt.txt");
    fs.writeFileSync(good, block.text);
    const ok = spawnSync(process.execPath, [script, "--routine=researcher", `--prompt=${good}`],
      { cwd: ROOT, encoding: "utf8" });
    assert.equal(ok.status, 0,
      `--routine=researcher against the block itself must exit 0, got ${ok.status}: ` +
      `${ok.stdout}${ok.stderr}`);
    assert.ok(ok.stdout.includes(`equals docs/runbooks/researcher-routine.md block`), ok.stdout);

    // A prompt that DRIFTS is exit 1 with one finding at the live trigger -- the state the routine
    // is in today, until John runs RemoteTrigger update (the playbook's own paragraph says so).
    const drifted = path.join(tmp, "drifted.txt");
    fs.writeFileSync(drifted, `INTERIM PROMPT until ticket AGT-138 ships\n${block.text}`);
    const out = path.join(tmp, "out.json");
    const d = spawnSync(process.execPath,
      [script, "--routine=researcher", `--prompt=${drifted}`, `--out=${out}`],
      { cwd: ROOT, encoding: "utf8" });
    assert.equal(d.status, 1, `a drifted prompt must be exit 1 (a finding, never a stop), got ${d.status}`);
    const j = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.equal(j.found_by, "check-routine-prompt:researcher");
    assert.equal(j.findings.length, 1);
    assert.equal(j.findings[0].locations[0].location, `routine/${TRIGGER_ID}/prompt`,
      "the finding must name the live trigger, so the fix has an address");
    assert.equal(j.findings[0].locations[1].location.split(":")[0], `docs/runbooks/${ROUTINES.researcher.file}`);
    // The same comparison, as the pure function, so the arm does not depend on the CLI alone.
    assert.deepEqual(comparePrompt(block.text, block, ROUTINES.researcher), [],
      "comparePrompt must report no finding when the two texts are equal");

    // CONTROL: an unknown routine is still exit 2, and the refusal names every routine there is --
    // this is the exit `--routine=researcher` itself returned before this ship.
    const bad = spawnSync(process.execPath, [script, "--routine=nope", `--prompt=${good}`],
      { cwd: ROOT, encoding: "utf8" });
    assert.equal(bad.status, 2, "an unknown --routine is exit 2 (cannot run), never a finding");
    for (const name of ["runner", "auditor", "researcher"]) {
      assert.ok(bad.stderr.includes(name), `the refusal must name ${name}: ${bad.stderr}`);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // --- E. the route row, live and read-only ----------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-138 arm E (the live finding_routes row and routeGroup over it)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the researcher route row and the captured " +
      "migration down are unverified here; arms A-D above still ran. Credentialed run: " +
      "STANDARDS.md Section 2 rule 5");
  } else {
    await arm("E route", async () => {
      const res = await get(url, key, "finding_routes?select=precedence,source,finding_type,project_slug&order=precedence,source");
      assert.equal(res.status, 200, `finding_routes read returned ${res.status}`);
      const routes = await res.json();
      const mine = routes.filter(r => r.source === "researcher");
      assert.equal(mine.length, 1, `exactly one researcher route; got ${JSON.stringify(mine)}`);
      assert.equal(mine[0].finding_type, "*", "the researcher route covers every finding_type");
      assert.equal(mine[0].project_slug, null,
        "project_slug is NULL: the Development Manager picks the project, as for staff-watch and " +
        "ticket-owner -- project creation is John's");
      assert.equal(Number(mine[0].precedence), 30, "the researcher route sits in the manager-picks tier");
      assert.ok(!routes.some(r => r.source === "*" && r.finding_type === "*"),
        "there is still deliberately no catch-all row: an unmapped source must stop the review");

      // The pair the QA step names. Same call, same worklist, two routing tables.
      const wl = [{ id: "rs", found_by: "researcher:weekly-market", source: "researcher", finding_type: "proposal" }];
      const group = { kind: "root-cause", finding_ids: ["rs"] };
      const hit = routeGroup(group, wl, routes);
      assert.equal(hit.source, "researcher");
      assert.equal(hit.project_slug, null, "a researcher proposal routes to the manager's own pick");
      assert.throws(() => routeGroup(group, wl, routes.filter(r => r.source !== "researcher")),
        /finding rs has unmapped source researcher — add a finding_routes row; project creation is John's/,
        "control: without the row, the SAME call throws -- which is what every researcher finding " +
        "did at audit-review.js:100 before this ship");
      // And an unrelated unmapped source still stops: the row is one route, not a catch-all.
      // AGT-133 (v7.0.610): this probe used `runner:cycle`, which AGT-134 then MAPPED at precedence 30
      // -- and AGT-133's own acceptance criterion is that a runner finding routes rather than throwing,
      // so probing `runner` here would assert the opposite of the shipped platform. Repointed at
      // `carry`, which AGT-138's own kickoff named as still-unmapped and which live finding_routes
      // still holds no row for. The clause under test is unchanged: ONE route is not a catch-all.
      assert.throws(() => routeGroup({ kind: "root-cause", finding_ids: ["rn"] },
        [{ id: "rn", found_by: "carry:something" }], routes),
        /unmapped source carry/,
        "the researcher row must not have become a catch-all for every other source");

      const dn = await get(url, key, "runner_migration_downs?select=up_name,classification,captured_by_cycle&up_name=eq.agt138_researcher_route");
      const downs = await dn.json();
      assert.equal(downs.length, 1, `exactly one captured down named agt138_researcher_route; got ${downs.length}`);
      assert.equal(downs[0].classification, "refused",
        "the capture is `refused` by design -- the up inserts a data row into an existing table, so " +
        "no down is derivable from the object's state and the down is CARD-ONLY: " +
        "delete from public.finding_routes where source='researcher' and finding_type='*';");
      console.log(`      routes ${routes.length} rows, researcher at precedence 30, down captured refused`);
    });

    notRun("AGT-138: that anon/authenticated hold no non-SELECT grant on public.finding_routes",
      "information_schema.role_table_grants and pg_class.relacl are not reachable over PostgREST " +
      "(.claude/rules/supabase-column-grants.md's addendum), and VITE_SUPABASE_ANON_KEY is absent " +
      "here, so the browser-key half cannot be probed either. What IS asserted above is the shape " +
      "the up guarantees: one row, no catch-all. DAT-18 (v7.0.78) left anon/authenticated with zero " +
      "write privileges on every table except tasks and ai_activity_log, and default privileges are " +
      "closed, so finding_routes inherited no public write grant when AGT-132 created it.");
    notRun("AGT-138: the migration name `agt138_researcher_route` in supabase_migrations",
      "the up's whole content is DML -- one INSERT ... ON CONFLICT DO NOTHING into finding_routes -- " +
      "and this build had no SQL-execution path (Supabase MCP tools absent, no pg client, no " +
      "management token), so its effect landed over PostgREST with the same guard and both " +
      "assertions, and its down was captured FIRST under the up's exact name (arm E reads that row). " +
      "There is therefore no schema_migrations row to assert; a later cycle that re-lands this as a " +
      "true migration will find the row already present and the insert a no-op.");
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
  console.log(`  [AGT-138] the Researcher's routine: playbook ${Buffer.byteLength(playbook, "utf8")} B is the ` +
    `prompt's source; ${RUNBOOK_REL} ${BYTES_AT_SHIP} B holds step 4b as a pointer and none of the ` +
    `pass; the card's 4b line points at the routine; --routine=researcher resolves; one researcher ` +
    `route, project_slug NULL, routeGroup throws only without it.`);
}

selfRun(import.meta.url, run);
