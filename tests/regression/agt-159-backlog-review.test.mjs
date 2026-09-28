// DeepBench v7.0.699 | tests/regression/agt-159-backlog-review.test.mjs | AGT-159 slice 1 -- AN OPEN
// TICKET IS A FINDING, AND THE MANAGER'S RULING LANDS ON THAT TICKET.
//
// THE DEFECT, measured live 2026-09-28 on the unedited tree: 599 tickets `open`, 578 of them no
// finding's `filed_backlog_id`, `audit_findings` holding ZERO rows whose `found_by` starts
// `backlog-review`, and `finding_routes` holding no row for that source -- so even a hand-filed one
// would have made `finding_group_epic()` RAISE `unmapped source` and stopped the entire Development
// Manager review. The board had no reviewer at all, while the review path that homes, supersedes,
// closes, parks and escalates was already built and already running weekly on everything else.
//
// WHAT SHIPPED. Migration `agt159_backlog_review` (over the Supabase MCP, its down captured FIRST):
// the tenth `finding_routes` row, and `apply_audit_review()` rebuilt from its own live
// pg_get_functiondef with a step-4 limb that reads `locations[0].location` as `backlog_items:<ID>`
// and writes the ruling onto THAT ticket -- homing it (a), superseding it (b), closing it (c),
// refusing to close John's (d), and refusing a second ticket for a ticket at all (e).
// `scripts/backlog-review.js` raises fifteen tickets a run; `scripts/audit-review.js`'s
// `validateReview()` mirrors (a) and (e) offline; `(7f)` runs the raise before the prepare.
//
// ARMS, each discriminating -- every one FAILS on the tree before the change:
//   A  PURE (no network) -- the type rule in all four directions, the batch order (step-1 tickets
//      first, then row_ordinal then backlog_id), both skip rules, the limit, and toFinding()'s exact
//      shape including the bracketed scope_origin/epic the manager rules from.
//      Pre-change: scripts/backlog-review.js did not exist.
//   B  PURE -- validateReview() raises (e) for root-cause-without-reuse and for cleanup, and (a) for
//      a reuse of the ticket's own id with no project. CONTROLS: the same two groups over a worklist
//      row whose check_slug is NOT `backlog-review` draw NOTHING, and the correct forms (reuse+project,
//      reuse of another id) draw nothing either -- so the block is keyed on the check_slug and not on
//      the kind. Pre-change: neither refusal existed at any spelling.
//   C  LIVE, READ-ONLY (service key) -- ten routing rows including `backlog-review` at precedence 30
//      with project_slug NULL and still no catch-all; the migration in the ledger with its down
//      captured BEFORE the up (its prior_ddl holds a definition WITHOUT the limb); the Intent row
//      carrying the harvest's paragraph byte-for-byte under one unreversed design-ruling decision with
//      one full-row image; `--raise --dry-run --limit=15` exits 0 and selects AGT-158 first; and the
//      runbook's `(7f)` holds `backlog-review.js --raise` BEFORE `audit-review.js --prepare`.
//      Pre-change: nine rows, no migration, no paragraph, no script, no runbook line.
//
// NOTHING HERE WRITES A ROW. Arm C is reads, one source-file read and one `--dry-run`, which
// audit-ledger.js's ingestFindings() defines as writing nothing at all (pattern:76).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RAISE = path.join(ROOT, "scripts", "backlog-review.js");
const REVIEW = path.join(ROOT, "scripts", "audit-review.js");
const RUNBOOK = "docs/runbooks/runner-cycle.md";
const HARVEST = "docs/harvests/AGT-159.md";

const UP = "agt159_backlog_review";
const CYCLE = "68dcf0b1-44df-4754-b663-49a1cc896c8a";
const INTENT_ID = "a6d3568f-3a39-44ff-a2b9-0aa62035281e";
const INTENT_SLUG = "dm-audit-review-intent";
// The paragraph's ONE home is docs/harvests/AGT-159.md section 5; this test reads it from there and
// compares the live row against it, rather than carrying a second copy that can drift (pattern:93).
const PARA_LINE = 53;

// Every row public.finding_routes holds after this ship, in the order --prepare reads them
// (precedence, source). Nine before; `backlog-review` is the tenth, precedence 30 / project_slug NULL
// -- the Development Manager picks the project, as for staff-watch, ticket-owner, runner and session.
// This constant has TWO other homes (agt-132's LIVE_ROUTES, agt-134's ROUTES) and all three moved in
// this one ship: a route row the platform holds and a test still pins at nine is a false red that
// costs the next cycle a diagnosis (pattern:163).
const LIVE_ROUTES = [
  { precedence: 10, source: "*", finding_type: "security", project_slug: "security" },
  { precedence: 20, source: "auditor", finding_type: "*", project_slug: "auditor-enhancements" },
  { precedence: 30, source: "agent", finding_type: "*", project_slug: null },
  { precedence: 30, source: "backlog-review", finding_type: "*", project_slug: null },
  { precedence: 30, source: "check-routine-prompt", finding_type: "*", project_slug: null },
  { precedence: 30, source: "researcher", finding_type: "*", project_slug: null },
  { precedence: 30, source: "runner", finding_type: "*", project_slug: null },
  { precedence: 30, source: "session", finding_type: "*", project_slug: null },
  { precedence: 30, source: "staff-watch", finding_type: "*", project_slug: null },
  { precedence: 30, source: "ticket-owner", finding_type: "*", project_slug: null },
];

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

async function req(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json };
}

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  const raiseMod = await import(pathToFileURL(RAISE).href);
  const reviewMod = await import(pathToFileURL(REVIEW).href);
  const { selectBatch, findingTypeFor, toFinding, excludedTickets, joinBoard, progressLine, RULING_MENU } = raiseMod;
  const { validateReview } = reviewMod;

  // ---- A. PURE: the type rule, the order, the skips, the limit, the shape ------------------------
  await arm("A pure selection and shape", async () => {
    for (const n of ["selectBatch", "findingTypeFor", "toFinding"]) {
      assert.equal(typeof raiseMod[n], "function", `scripts/backlog-review.js must EXPORT ${n} as a pure function`);
    }

    // THE TYPE RULE (pattern:99), all four outcomes and the precedence between them.
    assert.equal(findingTypeFor({ project_slug: "security", priority_class: "P10 - Tooling" }), "security",
      "the Security project wins over everything else");
    assert.equal(findingTypeFor({ project_slug: "security", priority_class: "P9 - Bug Fixes", type: "Bug", scope_origin: "discovered" }), "security",
      "and it still wins when every defect fact is true too");
    assert.equal(findingTypeFor({ priority_class: "P9 - Bug Fixes" }), "defect", "P9 - Bug Fixes is a defect");
    assert.equal(findingTypeFor({ type: "Bug" }), "defect", "type Bug is a defect");
    assert.equal(findingTypeFor({ type: "Defect" }), "defect", "type Defect is a defect");
    assert.equal(findingTypeFor({ scope_origin: "discovered" }), "defect", "a discovered ticket is a defect");
    assert.equal(findingTypeFor({ type: "Tooling", priority_class: "P10 - Tooling", scope_origin: "john-named" }), "proposal",
      "everything else is a proposal");
    // `gap` is unreachable BY CONSTRUCTION, not by omission: a ticket on the board is the opposite of
    // something missing. Asserted over the whole cross-product the rule can see.
    for (const pc of ["P9 - Bug Fixes", "P10 - Tooling", "P5 - Enhancements", null]) {
      for (const ty of ["Bug", "Defect", "Tooling", "Feature", null]) {
        for (const so of ["discovered", "john-named", null]) {
          for (const ps of ["security", "selfbuild", null]) {
            assert.notEqual(findingTypeFor({ priority_class: pc, type: ty, scope_origin: so, project_slug: ps }), "gap",
              `gap must be unreachable; got it for ${pc}/${ty}/${so}/${ps}`);
          }
        }
      }
    }

    // THE ORDER: step 1 (open + discovered + no epic) first, then row_ordinal, then backlog_id.
    const items = [
      { backlog_id: "ZZ-9", row_ordinal: 1, scope_origin: null, epic_id: "e1" },
      { backlog_id: "AA-2", row_ordinal: 1, scope_origin: null, epic_id: "e1" },
      { backlog_id: "BB-1", row_ordinal: 0, scope_origin: null, epic_id: "e1" },
      { backlog_id: "ST-1", row_ordinal: 900, scope_origin: "discovered", epic_id: null },
      { backlog_id: "ST-0", row_ordinal: 901, scope_origin: "discovered", epic_id: null },
      { backlog_id: "DH-1", row_ordinal: 2, scope_origin: "discovered", epic_id: "e1" },
    ];
    assert.deepEqual(selectBatch(items, [], 10).batch.map(i => i.backlog_id),
      ["ST-1", "ST-0", "BB-1", "AA-2", "ZZ-9", "DH-1"],
      "both step-1 tickets come first in their own row_ordinal order; a discovered ticket that IS homed does not");
    // The tiebreak is total, so two runs over an unchanged board pick the same batch (pattern:127).
    assert.deepEqual(selectBatch([...items].reverse(), [], 10).batch.map(i => i.backlog_id),
      ["ST-1", "ST-0", "BB-1", "AA-2", "ZZ-9", "DH-1"],
      "the same board in the opposite input order selects the identical batch");

    // THE LIMIT, and the eligible count the progress line's `remaining` is built from.
    const three = selectBatch(items, [], 3);
    assert.deepEqual(three.batch.map(i => i.backlog_id), ["ST-1", "ST-0", "BB-1"], "--limit takes the head of the queue");
    assert.equal(three.eligible, 6, "eligible counts the pool, not the batch");
    assert.equal(selectBatch(items, [], 0).batch.length, 0, "a zero limit selects nothing");

    // THE TWO SKIPS, derived from audit_findings and nowhere else.
    const ruled = [
      { filed_backlog_id: "BB-1", check_slug: "other", locations: [{ location: "docs/x.md:1" }] },
      { filed_backlog_id: null, check_slug: "backlog-review", locations: [{ location: "backlog_items:ST-1" }] },
    ];
    const skip = excludedTickets(ruled);
    assert.deepEqual([...skip].sort(), ["BB-1", "ST-1"],
      "a ticket some finding already filed, and a ticket already raised as a backlog-review finding, are both out");
    assert.deepEqual(selectBatch(items, skip, 10).batch.map(i => i.backlog_id), ["ST-0", "AA-2", "ZZ-9", "DH-1"],
      "and the batch skips them, which is what makes a second run walk the board DOWN rather than repeat it");
    assert.equal(selectBatch(items, skip, 10).eligible, 4, "`remaining` shrinks by the skips, not by the limit");
    // CONTROL: without the skip list the same two tickets are selected again.
    assert.ok(selectBatch(items, [], 10).batch.some(i => i.backlog_id === "ST-1"),
      "control: with no skip list ST-1 IS selected -- the exclusion is what removes it");

    // THE JOIN, then THE SHAPE.
    const joined = joinBoard(
      [{ backlog_id: "AGT-1", title: "T", description: "D".repeat(500), type: "Tooling",
         priority_class: "P10 - Tooling", scope_origin: "discovered", row_ordinal: 5, epic_id: "e1" }],
      [{ id: "e1", name: "Dev Manager Capabilities", project_id: "p1" }],
      [{ id: "p1", slug: "dev-manager-capabilities" }]);
    assert.equal(joined[0].epic_name, "Dev Manager Capabilities", "the epic's NAME travels, so the manager rules from data");
    assert.equal(joined[0].project_slug, "dev-manager-capabilities", "and its project's slug, which the type rule reads");

    const f = toFinding(joined[0]);
    assert.equal(f.kind, "other");
    assert.equal(f.check_slug, "backlog-review");
    assert.equal(f.confidence, "medium");
    assert.equal(f.finding_type, "defect", "discovered -> defect");
    assert.equal(f.proposed_resolution, RULING_MENU, "every finding carries the ruling menu (audit_findings.proposed_resolution is NOT NULL)");
    assert.equal(f.governing_fact.length, 400, "governing_fact is the ticket's own description, cut to 400");
    assert.equal(f.locations.length, 1);
    assert.equal(f.locations[0].location, "backlog_items:AGT-1",
      "the location IS the ticket -- this is what apply_audit_review()'s limb reads to find the row");
    assert.equal(f.locations[0].text, "T [discovered; epic Dev Manager Capabilities]",
      "and the text carries the two facts he cannot read off the id: scope_origin and today's epic");
    // A homeless ticket says so rather than printing `undefined` at the manager.
    assert.equal(toFinding({ backlog_id: "X-1", title: "t", description: "d" }).locations[0].text,
      "t [none; epic none]", "a ticket with no scope_origin and no epic reads `none`, never undefined");

    assert.equal(progressLine(15, 563), "BACKLOG REVIEW: raised 15, remaining 563",
      "the one line (7f) copies into the cycle notes");
  });

  // ---- B. PURE: validateReview()'s (a) and (e), with controls -------------------------------------
  await arm("B pure validateReview mirror", async () => {
    const brRow = {
      id: "f1", found_by: `backlog-review:${CYCLE}`, source: "backlog-review", finding_type: "defect",
      check_slug: "backlog-review", weeks_seen: 1,
      locations: [{ location: "backlog_items:AGT-158", text: "t [discovered; epic none]" }],
    };
    // The CONTROL row: identical in every field the block does not key on.
    const otherRow = { ...brRow, check_slug: "routine-prompt-drift", source: "check-routine-prompt" };
    const routes = [
      { precedence: 10, source: "*", finding_type: "security", project_slug: "security" },
      { precedence: 30, source: "backlog-review", finding_type: "*", project_slug: null },
      { precedence: 30, source: "check-routine-prompt", finding_type: "*", project_slug: null },
    ];
    const projects = [{ slug: "security", status: "planned", accepts_findings: false }];
    const rv = (group, wl) => validateReview(
      { groups: [group], summary_for_john: "qa", patterns_applied: [] },
      wl, "2026-W40", undefined, routes, projects).refusals;

    const fileFresh = { kind: "root-cause", finding_ids: ["f1"], title: "t", root_cause: "r", fix: "x", project: "general" };
    const cleanup = { kind: "cleanup", finding_ids: ["f1"], fix: "bundle", project: "general" };
    const homeNoProject = { kind: "root-cause", finding_ids: ["f1"], reuse_backlog_id: "AGT-158" };
    const homeGeneral = { kind: "root-cause", finding_ids: ["f1"], reuse_backlog_id: "AGT-158", project: "general" };
    const homeReal = { kind: "root-cause", finding_ids: ["f1"], reuse_backlog_id: "AGT-158", project: "security" };
    const supersede = { kind: "root-cause", finding_ids: ["f1"], reuse_backlog_id: "SES-214" };
    const close = { kind: "not-a-defect", finding_ids: ["f1"], reason: "covered" };

    // (e): the ticket exists, so a second id for it is refused -- both ways to ask for one.
    assert.deepEqual(rv(fileFresh, [brRow]), ["finding f1 is already ticket AGT-158; never file a second"],
      "root-cause WITHOUT reuse_backlog_id over a backlog-review finding is refused");
    assert.deepEqual(rv(cleanup, [brRow]), ["finding f1 is already ticket AGT-158; never file a second"],
      "and so is cleanup, which files a ticket too");
    // (a): homing it needs a project. Silence is never read as "leave it where it is".
    assert.deepEqual(rv(homeNoProject, [brRow]), ["backlog-review reuse of AGT-158 needs project (slug or general)"],
      "a reuse of the ticket's OWN id with no project is refused");

    // The forms that must draw NOTHING, or the block would refuse the review it exists to enable.
    for (const [name, g] of [["general", homeGeneral], ["a real project", homeReal],
                             ["a supersede", supersede], ["a close", close]]) {
      assert.deepEqual(rv(g, [brRow]), [], `${name} draws no refusal`);
    }

    // THE CONTROLS: the same two groups over a row whose check_slug is NOT backlog-review draw
    // nothing from this block, so it is keyed on the check_slug and not on the kind.
    assert.deepEqual(rv(fileFresh, [otherRow]), [],
      "control: root-cause-without-reuse over an ordinary finding is exactly how a ticket gets filed, and is untouched");
    assert.deepEqual(rv(cleanup, [otherRow]), [], "control: an ordinary cleanup group is untouched");
    // And a row with no locations at all is the function's RAISE, not a mirror's guess.
    assert.deepEqual(rv(fileFresh, [{ ...brRow, locations: [] }]), [],
      "a backlog-review row with no location is left to the function, never refused on a guess here");
  });

  // ---- C. LIVE, READ-ONLY -------------------------------------------------------------------------
  if (!url || !key) {
    notRun("AGT-159 arm C (the live half)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the tenth route row, the captured down, the " +
      "Intent paragraph and the --dry-run exit are unverified here; arms A and B above still ran. " +
      "Credentialed run: STANDARDS.md Section 2 rule 5");
  } else {
    await arm("C live routes, migration, Intent and raise", async () => {
      const r = await req(url, key, "finding_routes?select=precedence,source,finding_type,project_slug&order=precedence,source");
      assert.equal(r.status, 200, `finding_routes read -> HTTP ${r.status}`);
      assert.deepEqual(r.json, LIVE_ROUTES, "the ten routing rows, exactly");
      const mine = r.json.filter(x => x.source === "backlog-review");
      assert.equal(mine.length, 1, `exactly one backlog-review route; got ${JSON.stringify(mine)}`);
      assert.equal(mine[0].project_slug, null,
        "project_slug NULL: the Development Manager picks the project, as for staff-watch and ticket-owner");
      assert.ok(!r.json.some(x => x.source === "*" && x.finding_type === "*"),
        "there is STILL deliberately no catch-all row: an unmapped source must stop a review");

      // The migration, and its down captured BEFORE the up. The refusal class is the right one: the
      // up INSERTs into an existing table, which capture_migration_down() refuses to derive a down
      // for by design -- but the FUNCTION's prior definition is captured, and that copy must NOT
      // already carry the limb, or the capture ran after the up.
      const d = await req(url, key, `runner_migration_downs?select=up_name,classification,prior_ddl,captured_by_cycle&up_name=eq.${UP}`);
      assert.equal(d.status, 200, `runner_migration_downs read -> HTTP ${d.status}`);
      assert.equal(d.json.length, 1, `exactly one ${UP} row; got ${d.json.length}`);
      assert.equal(d.json[0].classification, "refused",
        "the class is `refused`: the up INSERTs into an existing finding_routes, whose lossless down is not derivable");
      assert.equal(d.json[0].captured_by_cycle, CYCLE, "captured by this cycle");
      const prior = JSON.stringify(d.json[0].prior_ddl ?? {});
      assert.ok(prior.includes("apply_audit_review"), "the prior definition of apply_audit_review IS captured");
      assert.ok(!prior.includes("SUPERSEDED BY"),
        "and it does NOT carry the limb -- which is what proves the capture ran BEFORE the up, not after it");

      // The Intent row: the harvest's paragraph, byte-for-byte, appended once, under ONE unreversed
      // design-ruling decision carrying ONE full-row image. The paragraph's one home is the harvest.
      const para = read(HARVEST).split("\n")[PARA_LINE];
      assert.ok(para.startsWith("THE BACKLOG REVIEW (AGT-159"),
        `${HARVEST} line ${PARA_LINE + 1} must be the Intent paragraph; got ${para.slice(0, 60)}`);
      const sp = await req(url, key, `skill_profiles?select=slug,method&id=eq.${INTENT_ID}`);
      assert.equal(sp.status, 200, `skill_profiles read -> HTTP ${sp.status}`);
      assert.equal(sp.json.length, 1);
      assert.equal(sp.json[0].slug, INTENT_SLUG, "the row is the manager's own Intent -- not a guardrail, not an identity");
      const method = String(sp.json[0].method).replace(/\r\n/g, "\n");
      assert.equal(method.split(para).length - 1, 1, "the paragraph is in the Skill row exactly once");
      assert.ok(method.endsWith(`\n\n${para}`),
        "and it is APPENDED, byte-for-byte against the harvest -- nothing he already reads was reworded");

      const dec = await req(url, key,
        `runner_decisions?select=id,kind,backlog_id,status&cycle_id=eq.${CYCLE}&kind=eq.design-ruling&backlog_id=eq.AGT-159`);
      assert.equal(dec.status, 200, `runner_decisions read -> HTTP ${dec.status}`);
      const live = dec.json.filter(x => x.status !== "reversed");
      assert.equal(live.length, 1, `exactly one unreversed design-ruling for AGT-159 in this cycle; got ${dec.json.length}`);
      const img = await req(url, key,
        `runner_before_images?select=table_name,pk_value,row_data&decision_id=eq.${live[0].id}`);
      assert.equal(img.status, 200, `runner_before_images read -> HTTP ${img.status}`);
      assert.equal(img.json.length, 1, `exactly one image under the ruling; got ${img.json.length}`);
      assert.equal(img.json[0].table_name, "skill_profiles");
      assert.equal(img.json[0].pk_value, INTENT_ID);
      assert.ok(img.json[0].row_data !== null,
        "the image carries the FULL prior row, so reverse_decision() is a restore and not a delete");

      // The raise itself: a dry run writes nothing and still answers the two questions (7f) asks.
      const res = spawnSync(process.execPath,
        [RAISE, "--raise", "--dry-run", "--limit=15", `--cycle-id=${CYCLE}`],
        { cwd: ROOT, encoding: "utf8", env: process.env });
      const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
      assert.equal(res.status, 0, `--raise --dry-run must exit 0; got ${res.status}\n${out}`);
      assert.match(out, /^BACKLOG REVIEW: raised \d+, remaining \d+$/m,
        `the progress line must print in the shape (7f) copies into notes; got:\n${out}`);
      assert.match(out, /backlog-review first: AGT-158/,
        `the first ticket of the batch is the one ticket-step-1 row (open, discovered, no epic); got:\n${out}`);

      // And a run with no --cycle-id is exit 2, never a pass: every before-image owes an owner.
      const bad = spawnSync(process.execPath, [RAISE, "--raise", "--limit=15"],
        { cwd: ROOT, encoding: "utf8", env: process.env });
      assert.equal(bad.status, 2, "a raise with no --cycle-id is exit 2 -- could not run, never a pass");
    });

    await arm("C runbook order", async () => {
      // (7f) must run the raise BEFORE the prepare, or the batch it raised is not in the worklist the
      // manager is handed and the whole ship does nothing for a week.
      const rb = read(RUNBOOK);
      // The slice is taken FORWARD from (7f)'s own marker. `**(8)** ` also occurs in step 7's prose
      // above (:4240), so a bare indexOf("**(8)") returns an index BEHIND the start and the slice
      // comes back empty -- a vacuous green that reads exactly like a pass.
      const from = rb.indexOf("**(7f) THE DEVELOPMENT MANAGER REVIEWS THE FINDINGS");
      assert.ok(from >= 0, "the (7f) heading must be in the runbook");
      const step = rb.slice(from, rb.indexOf("\n**(8) ", from));
      assert.ok(step.length > 200, "the (7f) slice must be found in the runbook");
      const raiseAt = step.indexOf("node scripts/backlog-review.js --raise");
      const prepAt = step.indexOf("node scripts/audit-review.js --prepare");
      assert.ok(raiseAt >= 0, "(7f) must carry the backlog-review raise command");
      assert.ok(prepAt >= 0, "(7f) must still carry the prepare command");
      assert.ok(raiseAt < prepAt,
        `the raise must come BEFORE the prepare (raise at ${raiseAt}, prepare at ${prepAt}) -- a batch raised after `
        + "the context was prepared is a batch the manager never sees");
      assert.ok(step.includes("exit 3 = none left"), "(7f) must say what exit 3 means");
      assert.ok(step.includes("BACKLOG REVIEW: raised <n>, remaining <m>"), "(7f) must name the progress line it copies");
      assert.ok(step.includes("Never gates."), "(7f) must say the raise never gates the chain");
    });
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
