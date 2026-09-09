// DeepBench v7.0.425 | tests/regression/ses-340-projects-govern.test.mjs | SES-340
//
// FEATURE: SES-340 -- the runner's pick path admits the active project by a SETTING, not by the
// `Selfbuild` name prefix. Migration `ses340_projects` created `public.projects`
// (planned/executing/paused/done), gave every epic a `project_id`, added
// `public.epic_project_executing(uuid)` and rewrote `prime_directive_queue()`, `drain_epic_next()`,
// `drain_chain_gate()` and `backlog_done_requires_verdict()` to read the project's status. The
// Selfbuild Prime Directive `a0ef9525` and the succession directive `0970abad` are closed
// `superseded` under gate decision `96bbed72`.
//
// THIS FILE GRADES THE LIVE BOARD, and that is the half nothing else can reach. The pure half --
// what `autoDoneEligibility()` does with the two project flags -- is pinned in
// tests/regression/SES-181-verifier.js and tests/regression/SES-243-prime-directive-autodone.js,
// which run with no credentials. What those two CANNOT see is whether the DATABASE actually stopped
// name-fencing: they drive a function whose inputs a caller supplies. So this file asserts the
// properties that would still be false if the migration had been rolled back and the JS alone
// shipped -- exactly the split ses-281-m5-pick-enforcement.test.mjs already uses.
//
// CREDENTIALED, AND DECLARED NOT-RUN OTHERWISE (SES-180's notRun(), never a silent skip): every
// clause below needs SUPABASE_URL + SUPABASE_SERVICE_KEY. Canonical invocation: STANDARDS.md
// Section 2 rule 5.
//
// EVERY CLAUSE SAYS WHICH BRANCH FIRED (the LOO-013 lesson). "No row violated the rule" is not
// evidence when no row could have: clause (b) refuses to pass on an empty lane, clause (a) refuses
// to grade a `projects` table with nothing paused beside the executing row, and clause (d) names
// the executing project it found rather than counting to zero.
//
// WHY IT READS OVER PostgREST AND NOT pg_get_functiondef: this suite reaches Supabase only over
// REST, which cannot read function bodies -- the same declared limit ses-281 and ses-297 carry. The
// bodies' own evidence is on the ship card; what is assertable from here is their OBSERVABLE
// behaviour on the live board, which is what these clauses grade.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

// The lane value `prime_directive_queue()` still uses for in-scope tickets. SES-340 kept it on
// purpose -- ses-281 asserts on it and renaming it was out of that ticket's scope -- so this
// constant is a NAMED DEVIATION carried in docs/SELFBUILD-RETIREMENT-LEDGER.md, not a claim that
// the fence is still called Selfbuild.
const IN_SCOPE_LANE = "selfbuild";

// The directive body the retired §2f widening keyed on. Held here so clause (c) can prove it is
// gone rather than describing it.
const RETIRED_DIRECTIVE_PREFIX = "THE SELFBUILD PRIME DIRECTIVE";

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

async function theProjectsTableGovernsTheLiveBoard() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the whole of SES-340's live arm: the single-executing-project invariant, the pick lane's " +
        "project fence, the retired Prime Directive row, and project_blockers' project-scope row",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. Nothing in this file is decidable " +
        "without them -- the JS half of SES-340 is pinned in SES-181-verifier.js and " +
        "SES-243-prime-directive-autodone.js, which run credential-free. Canonical invocation: " +
        "STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const projects = await pg(url, key, "projects?select=id,slug,name,status,priority&limit=200");
  const progress = await pg(url, key, "project_progress?select=slug,project,status,epics,tickets,done,open_&limit=200");
  const epics = await pg(url, key, "epics?select=id,name,project_id&limit=500");
  const lane = (await pg(url, key, "rpc/prime_directive_queue", { method: "POST", body: "{}" }))
    .filter(r => r.lane === IN_SCOPE_LANE);

  // ---- (a) EXACTLY ONE project is executing, and the table can actually show the difference.
  assert.ok(projects.length > 0, "public.projects came back empty -- migration ses340_projects is not live");
  const executing = projects.filter(p => p.status === "executing");
  assert.strictEqual(
    executing.length,
    1,
    `public.projects holds ${executing.length} rows with status='executing' ` +
      `(${executing.map(p => p.slug).join(", ") || "none"}). John's rule is one statement -- ` +
      `"build the <project> project" -- and the pick path's fence is "the epic's project is " +
      "executing", so two executing projects means two drains competing and zero means the runner ` +
      `has nothing admitted at all. Every project: ` +
      projects.map(p => `${p.slug}=${p.status}`).join(", "),
  );

  // NON-VACUITY, and it is the whole reason clause (a) is not "count > 0": a table where EVERY row
  // said `executing` would satisfy a naive fence just as well as a name prefix did. Assert the
  // status column is actually discriminating on today's data.
  const notExecuting = projects.filter(p => p.status !== "executing");
  assert.ok(
    notExecuting.length > 0,
    "every project row is `executing`, so `status` is not distinguishing anything and clause (b) " +
      "below cannot tell a project fence from no fence at all",
  );

  // `project_progress` answers "how many left in <project>" -- one row per project, never a join
  // that drops the ones with no tickets yet.
  assert.strictEqual(
    progress.length,
    projects.length,
    `project_progress returned ${progress.length} rows for ${projects.length} projects; a project ` +
      "with no epics or no tickets must still appear, or \"how many left\" silently omits the one " +
      "that has not started",
  );
  const progressSlugs = new Set(progress.map(r => r.slug));
  for (const p of projects) {
    assert.ok(progressSlugs.has(p.slug), `project_progress has no row for '${p.slug}'`);
  }

  // ---- (b) EVERY ref the pick lane serves belongs to an epic whose project is executing.
  // This is the assertion the whole ticket reduces to: before SES-340 the same lane was
  // `e.name ILIKE 'Selfbuild%'`, so a Governance Agents ticket could not appear here at all.
  const projectStatus = new Map(projects.map(p => [p.id, p.status]));
  const epicById = new Map(epics.map(e => [e.id, e]));
  assert.ok(
    lane.length > 0,
    `prime_directive_queue()'s '${IN_SCOPE_LANE}' lane came back empty -- either no project is ` +
      "executing or every in-scope ticket is unbuildable; both are findings, not a pass, and an " +
      "empty lane cannot demonstrate a fence",
  );

  const items = await pg(
    url, key,
    "backlog_items?select=backlog_id,epic_id,status&limit=2000",
  );
  assert.ok(items.length > 100, `backlog_items returned ${items.length} rows -- refusing to grade a truncated read`);
  const epicOf = new Map(items.map(i => [i.backlog_id, i.epic_id]));

  const servedProjects = new Set();
  for (const r of lane) {
    const epicId = epicOf.get(r.ref);
    assert.ok(epicId, `${r.ref} is served in the '${IN_SCOPE_LANE}' lane but has no epic_id on its board row`);
    const epic = epicById.get(epicId);
    assert.ok(epic, `${r.ref}'s epic ${epicId} is not in public.epics`);
    assert.ok(
      epic.project_id,
      `${r.ref} is served from epic '${epic.name}', which carries no project_id -- SES-340 requires ` +
        "every epic to be linked, and an unlinked epic cannot clear a project fence",
    );
    assert.strictEqual(
      projectStatus.get(epic.project_id),
      "executing",
      `${r.ref} is served from epic '${epic.name}', whose project status is ` +
        `'${projectStatus.get(epic.project_id)}' -- the pick path is admitting work outside the ` +
        "executing project, which is the fence SES-340 exists to enforce",
    );
    servedProjects.add(epic.project_id);
  }

  // ASSERT ON WHICH BRANCH FIRED, not merely that nothing violated the rule. A lane whose every ref
  // sat in a Selfbuild-named epic would pass the loop above under BOTH implementations; a lane
  // serving the executing project while Selfbuild is paused can only pass under this one.
  assert.deepStrictEqual(
    [...servedProjects],
    [executing[0].id],
    `the lane served ${servedProjects.size} distinct project(s); it must serve exactly the one ` +
      `executing project (${executing[0].slug})`,
  );
  const selfbuildProject = projects.find(p => p.slug === "selfbuild" || p.name === "Selfbuild");
  if (!selfbuildProject) {
    notRun(
      "the discriminating half of clause (b) -- that a Selfbuild-NAMED epic is fenced OUT",
      "no project named Selfbuild exists on this board any more, so the retired name fence and the " +
        "shipped project fence cannot be told apart by their outputs here.",
    );
  } else if (selfbuildProject.status === "executing") {
    notRun(
      "the discriminating half of clause (b) -- that a Selfbuild-NAMED epic is fenced OUT",
      `the Selfbuild project is itself '${selfbuildProject.status}' right now, so the retired name ` +
        "fence and the shipped project fence would serve the same rows and the loop above cannot " +
        "discriminate between them.",
    );
  } else {
    const selfbuildEpicIds = new Set(epics.filter(e => e.project_id === selfbuildProject.id).map(e => e.id));
    assert.ok(selfbuildEpicIds.size > 0, "the Selfbuild project has no epics -- the control cannot fire");
    const servedFromSelfbuild = lane.filter(r => selfbuildEpicIds.has(epicOf.get(r.ref)));
    assert.deepStrictEqual(
      servedFromSelfbuild.map(r => r.ref),
      [],
      `${servedFromSelfbuild.length} ticket(s) from the paused Selfbuild project are still being ` +
        "served. Under the retired `ILIKE 'Selfbuild%'` fence they all would be; under the project " +
        "fence none may be.",
    );
    const withheld = items.filter(
      it => selfbuildEpicIds.has(it.epic_id) && ["open", "partial"].includes(it.status),
    );
    assert.ok(
      withheld.length > 0,
      "no open Selfbuild-project ticket exists to be withheld, so this control proves nothing -- " +
        "the paused-project clause did not actually fire",
    );
  }

  // ---- (c) the retired Prime Directive is really retired -- no queued row keys the old widening.
  const queued = await pg(url, key, "runner_directives?select=id,body&type=eq.directive&status=eq.queued&limit=200");
  const stillStanding = queued.filter(d => String(d.body ?? "").startsWith(RETIRED_DIRECTIVE_PREFIX));
  assert.deepStrictEqual(
    stillStanding.map(d => String(d.id).slice(0, 8)),
    [],
    `${stillStanding.length} queued directive(s) still open with the retired body prefix ` +
      `'${RETIRED_DIRECTIVE_PREFIX}'. a0ef9525 and 0970abad were closed 'superseded' under gate ` +
      "decision 96bbed72; a row still standing means two execution authorities are live at once " +
      "and the ledger entry is wrong about which one governs.",
    );
  // NON-VACUITY for (c): the read must have found SOMETHING, or an empty queue would satisfy it.
  assert.ok(
    queued.length > 0,
    "no queued directives came back at all -- an empty result cannot demonstrate that ONE " +
      "particular directive is gone",
  );

  // ---- (d) project_blockers answers "what do you need from me to unblock <project>" -- and it has
  // a project-scope row for the executing project, not only per-ticket rows.
  const blockers = await pg(url, key, "project_blockers?select=project,project_status,scope,backlog_id&limit=1000");
  for (const p of executing) {
    const row = blockers.find(b => b.scope === "project" && b.project === p.slug);
    assert.ok(
      row,
      `project_blockers has no scope='project' row for the executing project '${p.slug}'. The view's ` +
        "whole job is to answer John's question at the PROJECT level; a table of per-ticket rows " +
        `with no project row makes him aggregate it himself. Scopes present: ` +
        [...new Set(blockers.map(b => `${b.scope}/${b.project}`))].join(", "),
    );
    assert.strictEqual(row.project_status, "executing");
  }
  // NON-VACUITY for (d): the view must also be carrying ticket-scope rows, or `scope` is a constant
  // column and the assertion above is checking nothing.
  assert.ok(
    blockers.some(b => b.scope === "ticket"),
    "project_blockers returned no scope='ticket' rows, so `scope` is not discriminating and the " +
      "project-row assertion above is vacuous",
  );
}

async function run() {
  await theProjectsTableGovernsTheLiveBoard();

  notRun(
    "the shipped bodies of prime_directive_queue(), drain_epic_next(uuid), drain_chain_gate(uuid) " +
      "and backlog_done_requires_verdict(), and drain_epic_next's own return value",
    "the bodies ship as migration ses340_projects and live in the database, not this repo; this " +
      "suite reaches Supabase only over PostgREST, which cannot read pg_get_functiondef. " +
      "drain_epic_next is reachable only by INVOKING it, and invoking it can RETIRE a live drain " +
      "directive and write a runner_before_images row -- a permanent test must never do that (the " +
      "SES-196 / SES-218 / SES-275 refusal). Measured at this ship instead, live over the MCP: no " +
      "public function body contains ILIKE 'Selfbuild%' any more; prime_directive_queue()'s prime " +
      "CTE is EXISTS (projects WHERE status='executing') and its buildable CTE fences on " +
      "public.epic_project_executing(b.epic_id); epic_project_executing() is one EXISTS over " +
      "epics JOIN projects; the four functions' prior definitions are captured in " +
      "runner_migration_downs under up_name 'ses340_projects' (the epics ALTER is a named refusal, " +
      "the SES-269 in-place precedent); and drain_chain_gate's section 2e branch reads " +
      "prime_directive_queue()'s own prime_standing rather than a second copy of the predicate.",
  );
}

selfRun(import.meta.url, run);
export default run;
