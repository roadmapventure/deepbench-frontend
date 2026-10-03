// DeepBench v7.0.748 | tests/regression/agt-314-find-work-boot.test.mjs | AGT-314 -- an idle fire
// FINDS work instead of refusing.
//
// WHAT THE DEFECT WAS, measured live on 2026-10-03 before a line changed: public.runner_should_boot()
// ended its ladder `WHEN f.pickable_count = 0 THEN 'nothing_pickable'` with no find-work sibling, so
// EIGHT fires refused `nothing_pickable` on 2026-10-02 between 11:41 and 18:51Z -- while
// audit_findings held 44 `open` rows and the two find-work lists (`dev-mgr-findings` +
// `auditor-findings`) held 133 open/partial tickets between them. There was work to find on every
// one of those eight fires; the gate could not see it. The verdict `work_to_find` is the third
// reason that BOOTS, and `detail.mode='find-work-only'` is what tells the booting fire that going
// looking is the one thing it may do.
//
// TWO ARMS, AND THE SPLIT IS DELIBERATE (the SES-281 / SES-297 precedent).
//   * ARM A is OFFLINE and always runs. docs/runbooks/runner-cycle.md is the canonical home of the
//     gate's CONTRACT, so the rule is READ OUT OF THE RUNBOOK through ses-297's own exported
//     gateBlock() -- never restated here. One import, one home: a second copy of the slicer in this
//     file would be free to disagree with the file that owns the clause.
//   * ARM B is LIVE and is DECLARED not-run without credentials (SES-180 notRun()), never silently
//     skipped. It grades both new detail counts against the SAME raw reads ses-297's oracle uses,
//     then INSERTS one fixture ticket into the `dev-mgr-findings` epic and asserts list_tickets
//     moves by exactly one -- which is the assertion a gate that hard-coded a constant, or counted
//     the wrong statuses, cannot survive. The fixture is DELETED in a `finally` and both counts are
//     re-read afterwards, so the arm leaves the board where it found it (pattern:76 in spirit: the
//     one write it must make to be discriminating is bounded, reversed, and re-verified).
//
// WHY A FIXTURE AT ALL, said out loud because a reader will ask. A count asserted only against its
// own oracle passes while BOTH sides read the same wrong thing. Moving the board by exactly one row
// and watching the gate move by exactly one is the difference between "the two agree" and "the gate
// is actually counting these rows."

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
// ONE HOME for the runbook slicer and the verdict vocabulary: ses-297 owns the gate's test surface,
// and this file reads the rule through it rather than re-deriving either.
import {
  gateBlock, FIND_WORK_REASON, BOOTING_REASONS, modeFor,
} from "./ses-297-pre-boot-pickability.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";

// The epic the fixture ticket lands in. It belongs to the `dev-mgr-findings` project, which is one
// of the two slugs runner_settings.find_work_lists ships with -- asserted below rather than assumed,
// because a fixture in a project the column does not name would prove nothing at all.
const FIXTURE_EPIC = "48c63dac-4e5e-4287-8e72-01777fedbbf2";
const FIXTURE_ID = "ZAGT314-1";
const SOURCE_FILE = "tests/regression/agt-314-find-work-boot.test.mjs";

// agt-280's ticket() shape: epic_id is ALWAYS explicit (so backlog_home_intake() returns early) and
// every NOT NULL / CHECK column carries a legal value, so the only thing that can decide the case is
// the branch under test.
function ticket() {
  return {
    backlog_id: FIXTURE_ID,
    tier: "next",
    type: "Tooling",
    priority_class: "P10 - Tooling",
    title: "AGT-314 find-work-boot probe — deleted in finally",
    status: "open",
    epic_id: FIXTURE_EPIC,
    source_file: SOURCE_FILE,
    scope_origin: "discovered",
    size_stamp: "S",
    defer_status: "no",
    scope_rationale: "regression probe",
    enhancement_claim: "none: probe",
    row_ordinal: 999931400,
  };
}

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

const asArray = (body, what) => {
  if (!Array.isArray(body)) throw new Error(`${what} returned a non-array payload`);
  return body;
};

// ---------------------------------------------------------------------------
// ARM A -- offline. The rule, read out of the runbook.
// ---------------------------------------------------------------------------
function theRunbookNamesTheFindWorkBoot() {
  const md = fs.readFileSync(path.join(ROOT, RUNBOOK_REL), "utf8");
  const block = gateBlock(md);
  assert.ok(
    block.length > 0,
    `the pre-boot gate block is missing from ${RUNBOOK_REL} -- the find-work branch is in the ` +
      "database with nothing in the repo telling a cycle what to do with it, which is the same as " +
      "not having shipped it",
  );
  for (const [token, why] of [
    ["work_to_find",
      "the verdict itself. A cycle that meets it cannot write a truthful last_step if the runbook " +
      "does not name it, and a reader cannot tell this boot from a build"],
    ["find-work-only",
      "the MODE a booting fire reads to know that going looking is the one thing it may do -- " +
      "without it a fire that read only the reason would try to build on a board with " +
      "pickable_count = 0"],
    ["find_work_lists",
      "the runner_settings column that says WHERE to look. Drop its name and the next editor " +
      "hard-codes the list slugs into the function, at which point re-pointing the lane is a " +
      "migration instead of an UPDATE (pattern:2)"],
  ]) {
    assert.ok(block.includes(token), `${RUNBOOK_REL}'s gate block does not name \`${token}\` -- ${why}`);
  }
  // NEGATIVE CONTROL, the SES-158 rule: a clause whose own mutation still passes proves nothing.
  const mutated = block.split("work_to_find").join("some other verdict");
  assert.notStrictEqual(mutated, block, "the control changed NOTHING -- it cannot prove the clause has teeth");
  assert.ok(!mutated.includes("work_to_find"), "the control did not remove the thing the clause checks");

  // The vocabulary this file shares with ses-297 must agree with the runbook's, or the two files
  // are guarding different features under one ticket number.
  assert.strictEqual(FIND_WORK_REASON, "work_to_find",
    `ses-297 exports FIND_WORK_REASON=${JSON.stringify(FIND_WORK_REASON)}; the runbook says work_to_find`);
  assert.ok(BOOTING_REASONS.has(FIND_WORK_REASON),
    "work_to_find must be in ses-297's BOOTING_REASONS -- it is the third verdict that boots, and a " +
    "should_boot=false on it would silence the runner with work sitting right there");
  assert.strictEqual(modeFor(FIND_WORK_REASON), "find-work-only",
    `modeFor(work_to_find)=${JSON.stringify(modeFor(FIND_WORK_REASON))}, expected find-work-only`);
  assert.strictEqual(modeFor("lanes_full"), null, "modeFor must answer null on a refusal");
}

// ---------------------------------------------------------------------------
// ARM B -- live over PostgREST. Both counts against the raw rows, then the board moved by one.
// ---------------------------------------------------------------------------
async function theLiveGateCountsTheWorkThereIsToFind() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun(
      "AGT-314 arm B: detail.open_findings / detail.list_tickets against the raw rows, and the " +
        "fixture ticket that moves list_tickets by exactly one",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The branch is a Postgres function and " +
        "four tables of rows, so there is no source-parsed stand-in for it; arm A above still " +
        "graded the runbook's contract and the verdict vocabulary. Canonical invocation: " +
        "docs/STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const gate = async () =>
    asArray(await pg(url, key, "rpc/runner_should_boot", { method: "POST", body: "{}" }),
            "rpc/runner_should_boot");

  // The oracle's raw reads -- the same ones ses-297's live arm builds its facts from.
  const counts = async () => {
    const settings = asArray(
      await pg(url, key, "runner_settings?select=find_work_lists&id=eq.1"), "runner_settings");
    const findWorkLists = settings[0]?.find_work_lists ?? null;
    assert.ok(Array.isArray(findWorkLists) && findWorkLists.length > 0,
      `runner_settings.find_work_lists is ${JSON.stringify(findWorkLists)} -- with no slug listed the ` +
      "lists half of this branch is switched off and the fixture below cannot discriminate anything");
    const findings = asArray(
      await pg(url, key, "audit_findings?status=in.(open,carried)&select=id&limit=5000"),
      "audit_findings (open or carried)");
    const candidates = asArray(
      await pg(url, key, "backlog_items?status=in.(open,partial)&select=id,epic_id&limit=5000"),
      "backlog_items (open or partial)");
    const epics = asArray(await pg(url, key, "epics?select=id,project_id&limit=5000"), "epics");
    const projects = asArray(await pg(url, key, "projects?select=id,slug&limit=5000"), "projects");
    const slugOfProject = new Map(projects.map(p => [p.id, p.slug]));
    const projectOfEpic = new Map(epics.map(e => [e.id, e.project_id]));
    const listSlugs = new Set(findWorkLists);
    return {
      findWorkLists,
      openFindings: findings.length,
      listTickets: candidates.filter(
        b => listSlugs.has(slugOfProject.get(projectOfEpic.get(b.epic_id)))).length,
      fixtureEpicSlug: slugOfProject.get(projectOfEpic.get(FIXTURE_EPIC)) ?? null,
    };
  };

  const before = await counts();
  // The fixture's epic must sit in a LISTED project, or inserting into it moves nothing and a green
  // would mean nothing. Asserted, not assumed (pattern:23).
  assert.ok(before.findWorkLists.includes(before.fixtureEpicSlug),
    `epic ${FIXTURE_EPIC} belongs to project ${JSON.stringify(before.fixtureEpicSlug)}, which is not ` +
    `in runner_settings.find_work_lists (${JSON.stringify(before.findWorkLists)}) -- re-point ` +
    "FIXTURE_EPIC at an epic of a listed project, or this arm proves nothing");

  const rows = await gate();
  assert.strictEqual(rows.length, 1, `runner_should_boot() returned ${rows.length} rows, expected exactly 1`);
  const v = rows[0];
  const d = v.detail;
  assert.ok(d && typeof d === "object", "the verdict carried no detail object");

  assert.strictEqual(Number(d.open_findings), before.openFindings,
    `detail.open_findings=${d.open_findings} but audit_findings holds ${before.openFindings} ` +
    "open-or-carried row(s). open AND carried, both: a carried finding is work that was deferred, " +
    "not work that was done (the designer's call, JOHN-0925 (ii))");
  assert.strictEqual(Number(d.list_tickets), before.listTickets,
    `detail.list_tickets=${d.list_tickets} but ${before.listTickets} open/partial ticket(s) sit in a ` +
    `project whose slug is in runner_settings.find_work_lists (${JSON.stringify(before.findWorkLists)})`);
  // The consistency the whole ticket turns on: a true with a refusal reason boots a fire into a
  // wall, a false with a booting reason silences the runner with nothing to point at.
  assert.strictEqual(v.should_boot, BOOTING_REASONS.has(v.reason),
    `should_boot=${v.should_boot} disagrees with reason=${v.reason}; exactly pickable, ` +
    "gate_cards_to_rule and work_to_find boot, and nothing else");
  assert.strictEqual(d.mode, modeFor(v.reason),
    `detail.mode=${JSON.stringify(d.mode)} on reason ${v.reason}, expected ${JSON.stringify(modeFor(v.reason))}`);

  // ---- THE FIXTURE: move the board by exactly one and watch the gate move by exactly one -------
  let created = false;
  try {
    // Clear any row a crashed earlier run left, so the insert is reproducible (pattern:127).
    await pg(url, key, `backlog_items?backlog_id=eq.${FIXTURE_ID}`,
             { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const ins = await pg(url, key, "backlog_items", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify([ticket()]),
    });
    assert.strictEqual(asArray(ins, "the fixture insert").length, 1, "the fixture ticket was not created");
    created = true;
    assert.strictEqual(ins[0].epic_id, FIXTURE_EPIC, "the fixture must land on the epic it named");
    assert.strictEqual(ins[0].status, "open", "the fixture must be open -- a done one proves nothing");

    const withFixture = await counts();
    assert.strictEqual(withFixture.listTickets, before.listTickets + 1,
      `the oracle's own count did not move: ${before.listTickets} -> ${withFixture.listTickets}. The ` +
      "fixture is not being counted by the raw reads, so nothing below can discriminate");

    const after = (await gate())[0];
    assert.strictEqual(Number(after.detail.list_tickets), before.listTickets + 1,
      `detail.list_tickets stayed at ${after.detail.list_tickets} after one open ticket was added to ` +
      `${before.fixtureEpicSlug} (expected ${before.listTickets + 1}). A gate reporting a constant, ` +
      "counting the wrong statuses, or joining to the wrong project would read exactly like this");
    assert.strictEqual(Number(after.detail.open_findings), before.openFindings,
      `detail.open_findings moved from ${before.openFindings} to ${after.detail.open_findings} on a ` +
      "ticket insert -- the two halves of this branch must be independent counts, not one number");
    assert.strictEqual(after.should_boot, BOOTING_REASONS.has(after.reason),
      "should_boot and reason must still agree once the fixture is counted");
    assert.strictEqual(after.detail.mode, modeFor(after.reason),
      `detail.mode=${JSON.stringify(after.detail.mode)} on reason ${after.reason}, expected ` +
      `${JSON.stringify(modeFor(after.reason))}`);
  } finally {
    if (created) {
      await pg(url, key, `backlog_items?backlog_id=eq.${FIXTURE_ID}`,
               { method: "DELETE", headers: { Prefer: "return=minimal" } });
    }
  }

  // The board is where it was found -- asserted, not hoped.
  const restored = await counts();
  assert.strictEqual(restored.listTickets, before.listTickets,
    `the fixture was not fully removed: list_tickets is ${restored.listTickets}, was ${before.listTickets}`);
  assert.strictEqual(restored.openFindings, before.openFindings,
    `audit_findings moved: ${before.openFindings} -> ${restored.openFindings}`);
  const leftovers = asArray(
    await pg(url, key, `backlog_items?backlog_id=eq.${FIXTURE_ID}&select=backlog_id`), "the residue check");
  assert.strictEqual(leftovers.length, 0, `${FIXTURE_ID} is still on the board -- this test leaves no rows`);
  const settled = (await gate())[0];
  assert.strictEqual(Number(settled.detail.list_tickets), before.listTickets,
    `the gate still reads ${settled.detail.list_tickets} list tickets after the fixture was removed`);
}

async function run() {
  theRunbookNamesTheFindWorkBoot();
  await theLiveGateCountsTheWorkThereIsToFind();

  notRun(
    "AGT-314: the `work_to_find` and `nothing_pickable` FIXTURE PAIR -- the board driven to " +
      "pickable_count = 0 with no card left to rule, once with work to find and once with both " +
      "halves emptied",
    "reaching that branch means claiming every drain/selfbuild row of the standing Prime Directive, " +
      "deciding every undecided gate card, lifting John's spend walls and the lane cap, and then " +
      "emptying audit_findings and runner_settings.find_work_lists -- on the live board. A permanent " +
      "regression test must never do that (the SES-196 / SES-218 / SES-275 refusal), and this suite " +
      "reaches Supabase only over PostgREST, which cannot open a transaction to roll a fixture back. " +
      "MEASURED AT THIS SHIP INSTEAD (v7.0.748, migration agt314_find_work_boot), live, inside one " +
      "subtransaction that ends in the sentinel P0314 so every fixture write is undone while the " +
      "migration still commits, and asserted on the REASON and the COUNTS rather than on " +
      "should_boot: FIXTURE A (scheduler_on=true, meter_limiter_off=true, hard_stop_pct=NULL, " +
      "max_lanes=99, every undecided gated_before_build card accepted, every drain/selfbuild ref " +
      "freshly claimed) -> reason='work_to_find', should_boot=true, detail.mode='find-work-only', " +
      "open_findings=44, list_tickets=133, pickable_count=0, gate_cards_to_rule=0 -- and that is " +
      "THE SEAM, because origin/dev's body answers 'nothing_pickable' on those same inputs and " +
      "carries no open_findings key at all, so the case discriminates the change rather than the " +
      "board; FIXTURE B, the control, the SAME board with both halves emptied (audit_findings " +
      "status='listed', find_work_lists='{}') -> reason='nothing_pickable', should_boot=false, " +
      "detail.mode=NULL, open_findings=0, list_tickets=0, which is what proves the branch reads the " +
      "two counts rather than answering work_to_find whenever nothing is pickable. Zero fixture " +
      "residue on re-read after the rollback: 0 rows claimed by 'agt314', 44 open/carried findings, " +
      "find_work_lists back at {dev-mgr-findings,auditor-findings}, max_lanes 1, " +
      "meter_limiter_off false, scheduler on. pg_proc asserted inside the migration's own trailing " +
      "block rather than afterwards: exactly 1 runner_should_boot overload, and the no-argument " +
      "(omitted-parameter) call still returning a real row -- the identity argument list and the " +
      "RETURNS TABLE columns did not change, so CREATE OR REPLACE replaced the body rather than " +
      "adding an overload (.claude/rules/supabase-function-signature.md). Live board at the ship: " +
      "reason='lanes_full', open_findings=44, list_tickets=133 -- the gate still answers for a real " +
      "caller, and the two counts it will decide on are the ones the raw rows hold.",
  );
}

selfRun(import.meta.url, run);
export default run;
