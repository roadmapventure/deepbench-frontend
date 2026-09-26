// DeepBench v7.0.605 | tests/regression/agt-132-finding-routes.test.mjs | AGT-132 slice 1 -- a finding's
// SOURCE and TYPE decide which project its ticket is filed under, and the routing is a TABLE
// (public.finding_routes) rather than a hardcoded epic. Migration `agt132_finding_routes` (applied over
// the Supabase MCP) adds the table and its four rows, adds public.finding_group_epic(jsonb), and rebuilds
// apply_audit_review() from its live text so that step 3's single 'Auditor Enhancements' lookup is gone
// and the resolver is called instead -- once in step 1a for a root-cause without reuse_backlog_id, once
// for a cleanup, and once in the filing branch. scripts/audit-review.js carries source, finding_type,
// routes and projects into the manager's context and mirrors the three refusals a client can see
// offline. Kickoff docs/kickoffs/v7.0.605-AGT-132-finding-routes.md §5 task 4 and §6.
//
// ARMS, each discriminating -- every one FAILS on the tree before the change:
//   A  PURE (no network) -- routeGroup() takes the LOWEST precedence over a group's findings, so
//      security beats auditor beats "you pick"; an unmapped source THROWS; validateReview() refuses a
//      pick group with no project and one naming a project that does not exist, accepts `general`, and
//      asks nothing of a not-a-defect group. CONTROL: the same review with no `routes` argument passes,
//      so a pre-AGT-132 context still validates and the block is genuinely opt-in.
//      Pre-change: routeGroup did not exist.
//   B  LIVE, READ-ONLY (service key) -- the four rows; the migration in the ledger after AGT-140's;
//      its down captured BEFORE the up (it still holds the AGT-103 lookup and not the resolver); the
//      Intent row carrying John's routing paragraph and the group schema's `project` property; one
//      unreversed agent-row decision for AGT-132 with exactly one skill_profiles before-image; and
//      --prepare's own output carrying source, finding_type, routes and projects.
//      Pre-change: no table, no migration row, no paragraph, no decision, no source in the worklist.
//   C  LIVE PROBES of rpc/finding_group_epic (WRITES NOTHING) -- over real open findings: a
//      ticket-owner gap with no project is 400 P0001 `needs project`, with `general` is null, with
//      `dev-manager-capabilities` is the Dev Manager Capabilities epic; an auditor finding with the
//      same `general` pick is Auditor Enhancements anyway (precedence 20 beats the pick); an unknown
//      slug is refused; and the anon key is refused with a privilege denial, never PGRST202. Each
//      refusal is compared BYTE-FOR-BYTE with validateReview()'s mirror plus the function's prefix
//      (agt-86i arm R's convention), and the three ledger counts are re-read equal.
//      Pre-change: every call is PGRST202.
//   D  PROMPT (live) -- agent-prompt.js --agent=devmanager --capability=review-audit-worklist over a
//      real --prepare file exits 0 and PRINTS the routing paragraph, so the manager actually reads it.
//      Pre-change: the paragraph was in no Skill row, so it could not be printed.
//
//   E  LIVE, READ-ONLY -- slice 2's migration `agt132s2_alert_source_and_guard` is in the ledger
//      after slice 1's, and its captured down holds the PRE-change alert line (`VALUES ('auditor'`)
//      and not the new expression, so the capture ran BEFORE the up. That ledger row is also the
//      seam the catalog-only facts hang on: the migration is one transaction whose trailing DO ran
//      the 27-row UPDATE and a whole live apply_audit_review() call, so a red fixture would have
//      rolled the drop back and this row would not exist.
//      Pre-change: no such migration.
//   F  LIVE PROBE, WRITES NOTHING BY CONSTRUCTION -- an INSERT carrying a joined `found_by` AND an
//      invalid `kind`. audit_findings_guard is a BEFORE INSERT trigger, so it fires ahead of every
//      CHECK: the refusal must name ONE source. If the INSERT limb were gone the row would still
//      never land (the kind CHECK catches it) and the message would be the wrong one -- so the
//      probe is fail-closed in both directions and audit_findings, which is append-only and cannot
//      be cleaned up, is never written.
//      Pre-change: the trigger did not fire on INSERT at all.
//   G  LIVE, READ-ONLY -- the 27 open/carried findings that share one joined `found_by`, still
//      there and now reviewable: they are the rows `audit_findings_found_by_single` refused to let
//      anyone re-status, which is why the Development Manager's review path could not run at all.
//      Pre-change: the same 27 rows, and every real review call died 23514 on the first of them.
//   H  LIVE, READ-ONLY -- the chain rule left `dm-guardrails.guardrails.must` (back to 5) and is the
//      last paragraph of `dm-run-intent.method`, byte-for-byte against the file.
//      Pre-change: `must` was 6 and dm-run-intent.method was 550 bytes of method alone.
//   I  LIVE, READ-ONLY -- exactly one unreversed agent-row decision for AGT-132 in THIS cycle,
//      carrying exactly two skill_profiles before-images, both with row_data non-null.
//      Pre-change: slice 1's decision only, in another cycle, with one image.
//
// NOTHING HERE WRITES A ROW. Arm C's refusals are raised before any write by construction (the
// resolver only reads), arm F's INSERT is refused by a BEFORE trigger and by a CHECK behind it, and
// arms B, D, E, G, H and I are reads and one prompt assembly.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
// ONE matcher for the chain rule, shared with the file that owns it (SES-45: a second
// implementation agreeing with itself proves nothing). Importing a test module does not run it --
// selfRun only fires for the entry module.
import { chainRuleFromPrompt, indexOfExact } from "./ses-378d-manager-skill-rows.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "audit-review.js");
const PROMPT = path.join(ROOT, "scripts", "agent-prompt.js");

const UP = "agt132_finding_routes";
const UP2 = "agt132s2_alert_source_and_guard"; // slice 2
const PREV = "20260926093750"; // agt140_project_priority_pick
const INTENT_ID = "a6d3568f-3a39-44ff-a2b9-0aa62035281e";
const GUARDRAILS_SLUG = "dm-guardrails";
const RUN_INTENT_SLUG = "dm-run-intent";
const MUST_AFTER = 5;       // slice 2 moved the 6th out; must_not is AGT-144's business, not ours
const JOINED_OPEN_CARRIED = 27;
const SLICE1_CYCLE = "352017f7-dc36-4eb0-a4e6-a48baf8cbb0e";
const SLICE2_CYCLE = "47423449-171c-4dbe-b162-48cbeca76834";
const EPIC_DMC = "e0335c39-0728-4ff1-99ca-232a02912176";
const EPIC_AUD = "6c8a8325-205c-4e08-b0b2-64c939582cc6";
const PARA_HEAD = "THE FINDINGS STANDARD AND ROUTING";
const PREFIX = "apply_audit_review: ";

// ARM A's FIXTURE TABLE -- the four rows slice 1's migration seeded. It is a fixture, not a copy of
// the live table, and it deliberately stays four: arm A's whole point is that a source with no row
// STOPS the review, so it needs a source (`runner`) that this table does not map. Later tickets add
// live rows for real sources (AGT-138 `researcher`; AGT-134 `check-routine-prompt` and `runner`) and
// none of them changes what arm A is reasoning about.
const ROUTES = [
  { precedence: 10, source: "*", finding_type: "security", project_slug: "security" },
  { precedence: 20, source: "auditor", finding_type: "*", project_slug: "auditor-enhancements" },
  { precedence: 30, source: "staff-watch", finding_type: "*", project_slug: null },
  { precedence: 30, source: "ticket-owner", finding_type: "*", project_slug: null },
];

// ARM B's LIVE TABLE -- every row public.finding_routes holds, in the order --prepare reads them
// (precedence, source). Re-pointed 4 -> 7 by AGT-134 (v7.0.609): AGT-138 added `researcher`, and
// AGT-134 added `check-routine-prompt` (the drift check's own writer, previously unmapped, which
// made finding_group_epic() RAISE on every clean drift finding and stopped the whole review) and
// `runner`. All three are precedence 30 / project_slug NULL -- the Development Manager picks the
// project; creating one is still John's.
const LIVE_ROUTES = [
  { precedence: 10, source: "*", finding_type: "security", project_slug: "security" },
  { precedence: 20, source: "auditor", finding_type: "*", project_slug: "auditor-enhancements" },
  { precedence: 30, source: "check-routine-prompt", finding_type: "*", project_slug: null },
  { precedence: 30, source: "researcher", finding_type: "*", project_slug: null },
  { precedence: 30, source: "runner", finding_type: "*", project_slug: null },
  { precedence: 30, source: "staff-watch", finding_type: "*", project_slug: null },
  { precedence: 30, source: "ticket-owner", finding_type: "*", project_slug: null },
];

async function req(url, key, q, { method = "GET", body } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}
const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 240)}`;

async function count(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  const cr = res.headers.get("content-range") ?? "";
  const n = Number(cr.split("/")[1]);
  if (!res.ok || !Number.isFinite(n)) throw new Error(`count ${q} -> HTTP ${res.status} content-range=${cr}`);
  return n;
}

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    [arm ${name}] FAIL -- ${e.message.split("\n")[0]}`); }
  };

  const script = await import(pathToFileURL(SCRIPT).href);
  const { routeGroup, validateReview, buildTaskContext, sourceOf } = script;

  // --- A. the route pick and the offline refusals, pure ----------------------------------------------
  await arm("A pure", () => {
    const wl = [
      { id: "au", source: "auditor", finding_type: "defect", weeks_seen: 1 },
      { id: "to", source: "ticket-owner", finding_type: "gap", weeks_seen: 1 },
      { id: "sec", source: "ticket-owner", finding_type: "security", weeks_seen: 1 },
      { id: "sw", source: "staff-watch", finding_type: "proposal", weeks_seen: 1 },
      { id: "new", source: "runner", finding_type: "defect", weeks_seen: 1 },
    ];
    const projects = [{ slug: "dev-manager-capabilities" }, { slug: "security" }, { slug: "auditor-enhancements" }];

    assert.equal(sourceOf("ticket-owner:census"), "ticket-owner", "the source is found_by's first segment");
    assert.equal(sourceOf("auditor:run-review:abc"), "auditor");
    assert.equal(sourceOf(""), null, "no writer, no source -- never the empty string");

    // Security beats auditor beats the manager's pick, and the winner is the GROUP's lowest
    // precedence, not the first finding's: the same two ids in either order answer the same.
    assert.equal(routeGroup({ kind: "root-cause", finding_ids: ["sec", "au"] }, wl, ROUTES).project_slug, "security");
    assert.equal(routeGroup({ kind: "root-cause", finding_ids: ["au", "sec"] }, wl, ROUTES).project_slug, "security");
    assert.equal(routeGroup({ kind: "root-cause", finding_ids: ["au", "to"] }, wl, ROUTES).project_slug, "auditor-enhancements");
    assert.equal(routeGroup({ kind: "root-cause", finding_ids: ["to", "sw"] }, wl, ROUTES).project_slug, null,
      "two manager-picks tiers tie at 30 and still resolve to the pick, deterministically");
    assert.equal(routeGroup({ kind: "root-cause", finding_ids: ["to"] }, wl, ROUTES).precedence, 30);

    // An unmapped source STOPS, and names the finding and the source -- there is no ('*','*') row.
    assert.throws(() => routeGroup({ kind: "root-cause", finding_ids: ["new"] }, wl, ROUTES),
      /finding new has unmapped source runner — add a finding_routes row; project creation is John's/,
      "an unmapped source is a refusal naming itself, never a silent fall-through to a default project");

    const review = groups => ({ groups, summary_for_john: "qa", patterns_applied: [] });
    const nad = ids => ({ kind: "not-a-defect", reason: "qa", finding_ids: ids });
    const pick = extra => ({ kind: "root-cause", title: "t", root_cause: "r", fix: "f", finding_ids: ["to"], ...extra });
    const refusalsOf = groups => validateReview(review(groups), wl, "2026-W39", undefined, ROUTES, projects).refusals;

    assert.deepEqual(refusalsOf([pick(), nad(["au", "sec", "sw", "new"])]),
      ["a root-cause group from source(s) ticket-owner needs project (a projects.slug or general)"],
      "a pick group with no project is refused, and the refusal names the source that has no home");
    assert.deepEqual(refusalsOf([pick({ project: "nope" }), nad(["au", "sec", "sw", "new"])]),
      ["project nope is not a projects row; project creation is John's"]);
    assert.deepEqual(refusalsOf([pick({ project: "general" }), nad(["au", "sec", "sw", "new"])]), [],
      "`general` is the general backlog and is accepted");
    assert.deepEqual(refusalsOf([pick({ project: "dev-manager-capabilities" }), nad(["au", "sec", "sw", "new"])]), []);
    assert.deepEqual(refusalsOf([nad(["au", "to", "sec", "sw", "new"])]), [],
      "a not-a-defect group files no ticket, so it needs no route -- not even for the unmapped source");
    assert.deepEqual(refusalsOf([{ kind: "root-cause", reuse_backlog_id: "AGT-1", finding_ids: ["to"] }, nad(["au", "sec", "sw", "new"])]), [],
      "a root-cause that REUSES a ticket files none, so it needs no project either");
    assert.deepEqual(refusalsOf([{ kind: "cleanup", fix: "f", finding_ids: ["to"] }, nad(["au", "sec", "sw", "new"])]),
      ["a cleanup group from source(s) ticket-owner needs project (a projects.slug or general)"],
      "a cleanup files a ticket, so it is routed like a root-cause");

    // CONTROL: no routes argument -> the whole block is skipped and the same review passes. Without
    // this, the arm above could be passing because validateReview refuses everything.
    assert.deepEqual(validateReview(review([pick(), nad(["au", "sec", "sw", "new"])]), wl, "2026-W39").refusals, [],
      "a caller that passes no routes validates exactly as it did before AGT-132");

    // The worklist rows themselves carry the two new facts, and a typeless legacy row does not throw.
    const ctx = buildTaskContext({
      week: "2026-W39",
      findings: [{ id: "f1", fingerprint: "fp", iso_week: "2026-W39", kind: "other", found_by: "ticket-owner:census", finding_type: "gap" },
                 { id: "f2", fingerprint: "fp2", iso_week: "2026-W39", kind: "other" }],
      allRows: [], tickets: [], routes: ROUTES, projects,
    });
    assert.equal(ctx.worklist[0].source, "ticket-owner");
    assert.equal(ctx.worklist[0].finding_type, "gap");
    assert.equal(ctx.worklist[1].source, null);
    assert.equal(ctx.worklist[1].finding_type, null);
    assert.deepEqual(ctx.routes, ROUTES, "the routing table travels to the manager as data");
    assert.equal(ctx.projects.length, 3, "and so does the list of projects he may pick from");
  });

  if (!url || !key) {
    notRun("AGT-132 live arms (B, C, D)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the four route rows, the migration ledger and its captured down, the Intent paragraph, the rpc/finding_group_epic probes and the assembled prompt are all unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt132-"));
  const ctxPath = path.join(tmp, "ctx.json");

  // --- B. the live rows, the ledger, the Skill row and the prepared context -------------------------
  await arm("B live rows", async () => {
    const r = await req(url, key, "finding_routes?select=precedence,source,finding_type,project_slug&order=precedence,source");
    assert.equal(r.status, 200, describe(r));
    assert.deepEqual(r.json, LIVE_ROUTES, "the seven routing rows, exactly");
    assert.ok(!r.json.some(x => x.source === "*" && x.finding_type === "*"),
      "there is deliberately no catch-all row: an unmapped source must stop the review");

    const m = await req(url, key, "rpc/migrations_in_range", { method: "POST", body: { p_from: PREV, p_to: "99999999999999" } });
    assert.equal(m.status, 200, describe(m));
    const hits = (m.json ?? []).filter(x => x.name === UP);
    assert.equal(hits.length, 1, `exactly one applied migration named ${UP} after ${PREV}; got ${JSON.stringify((m.json ?? []).map(x => x.name))}`);
    assert.ok(hits[0].version > PREV, `${UP} is applied after ${PREV} (${hits[0].version})`);

    // The down was captured BEFORE the up: it restores the body that still held AGT-103's hardcoded
    // lookup, and it cannot mention the resolver the up introduced.
    const d = await req(url, key, `runner_migration_downs?up_name=eq.${UP}&select=classification,down_sql,captured_at`);
    assert.equal(d.status, 200, describe(d));
    assert.equal(d.json.length, 1, `one captured down for ${UP}; got ${d.json.length}`);
    assert.equal(d.json[0].classification, "auto-downable");
    assert.ok(d.json[0].down_sql.includes("Auditor Enhancements"),
      "the down restores the pre-change body, which still homed every ticket in Auditor Enhancements");
    assert.ok(!d.json[0].down_sql.includes("finding_group_epic"),
      "captured BEFORE the up -- a down carrying the resolver would be a down that restores the new behaviour");

    const sp = await req(url, key, `skill_profiles?id=eq.${INTENT_ID}&select=slug,method,traits`);
    assert.equal(sp.status, 200, describe(sp));
    assert.equal(sp.json.length, 1);
    const intent = sp.json[0];
    assert.equal(intent.slug, "dm-audit-review-intent");
    assert.ok(intent.method.includes(PARA_HEAD), `the Intent row carries John's routing paragraph (${PARA_HEAD})`);
    assert.ok(intent.method.includes("task_context.routes") && intent.method.includes("task_context.projects"),
      "and it points the manager at the two context keys rather than restating the table");
    const prop = intent.traits?.schema?.properties?.groups?.items?.properties?.project;
    assert.ok(prop, "the group schema gained a `project` property, so the pick is part of the output contract");
    assert.equal(prop.pattern, "^(general|[a-z0-9-]+)$");
    assert.equal(prop.maxLength, 60);

    // Scoped to slice 1's OWN cycle: slice 2 (AGT-132's closing slice) records a second agent-row
    // decision for the same ticket, and "exactly one for the ticket" would now be counting slices.
    const dec = await req(url, key, `runner_decisions?kind=eq.agent-row&backlog_id=eq.AGT-132&cycle_id=eq.${SLICE1_CYCLE}&select=id,status,reversed_at,ladder_work_class,cycle_id`);
    assert.equal(dec.status, 200, describe(dec));
    const live = dec.json.filter(x => x.reversed_at === null);
    assert.equal(live.length, 1, `exactly one unreversed agent-row decision for AGT-132 in slice 1's cycle ${SLICE1_CYCLE}; got ${dec.json.length} row(s)`);
    const img = await req(url, key, `runner_before_images?decision_id=eq.${live[0].id}&table_name=eq.skill_profiles&select=pk_value,row_data`);
    assert.equal(img.json.length, 1, "with exactly one skill_profiles before-image -- the row is reversible, not hand-recoverable");
    assert.equal(img.json[0].pk_value, INTENT_ID);
    assert.ok(!String(img.json[0].row_data?.method ?? "").includes(PARA_HEAD),
      "the image is the row BEFORE the append, so a Reverse actually removes the paragraph");

    const p = spawnSync(process.execPath, [SCRIPT, "--prepare", "--week=2026-W39", `--out=${ctxPath}`], { encoding: "utf8" });
    assert.equal(p.status, 0, `--prepare must exit 0; got ${p.status} ${p.stderr}`);
    const ctx = JSON.parse(fs.readFileSync(ctxPath, "utf8"));
    assert.deepEqual(ctx.routes, LIVE_ROUTES, "the prepared context carries the routing table");
    assert.ok(Array.isArray(ctx.projects) && ctx.projects.length > 0 && ctx.projects.every(x => typeof x.slug === "string"),
      "and the projects he may pick from, by slug");
    assert.ok(ctx.worklist.length > 0, "there is a live worklist to check");
    assert.ok(ctx.worklist.every(w => typeof w.source === "string" && w.source.length > 0),
      "every live worklist row names its source");
    assert.ok(ctx.worklist.every(w => ["defect", "gap", "proposal", "security"].includes(w.finding_type)),
      "and its finding_type");
    assert.ok(ctx.worklist.every(w => !String(w.source).includes(":")),
      "the source is the writer, not the whole found_by");
  });

  // --- C. the resolver over live ids, proving it writes nothing --------------------------------------
  await arm("C probes", async () => {
    const before = {
      findings: await count(url, key, "audit_findings?select=id"),
      backlog: await count(url, key, "backlog_items?select=id"),
      decisions: await count(url, key, "runner_decisions?select=id"),
    };
    const f = await req(url, key, "audit_findings?status=in.(open,carried)&select=id,found_by,finding_type&order=created_at,id");
    assert.equal(f.status, 200, describe(f));
    const bySource = s => (f.json ?? []).find(x => sourceOf(x.found_by) === s);
    const to = bySource("ticket-owner");
    const au = bySource("auditor");
    assert.ok(to, "a live open ticket-owner finding to route (the ticket's own case: a census gap)");
    assert.ok(au, "and a live open auditor finding");

    const probe = (group, k = key) => req(url, k, "rpc/finding_group_epic", { method: "POST", body: { p_group: group } });
    const group = extra => ({ kind: "root-cause", title: "t", root_cause: "r", fix: "f", finding_ids: [to.id], ...extra });

    const missing = await probe(group());
    assert.equal(missing.status, 400, `a pick group with no project must be refused; got ${describe(missing)}`);
    assert.equal(missing.code, "P0001", `a RAISE, not a type error; got ${describe(missing)}`);
    assert.match(String(missing.json.message), /needs project \(a projects\.slug or general\)/);
    assert.ok(String(missing.json.message).includes("ticket-owner"), "and it names the source with no home");

    const general = await probe(group({ project: "general" }));
    assert.equal(general.status, 200, describe(general));
    assert.equal(general.json, null, "`general` is the general backlog: no epic, and that is a value, not a failure");

    const picked = await probe(group({ project: "dev-manager-capabilities" }));
    assert.equal(picked.status, 200, describe(picked));
    assert.equal(picked.json, EPIC_DMC, "the manager's pick resolves to that project's one epic");

    // Precedence beats the pick: the SAME `general` on an Auditor finding still homes in Auditor
    // Enhancements. This is the pair that discriminates a real routing table from "whatever he typed".
    const auditor = await probe({ kind: "root-cause", project: "general", finding_ids: [au.id] });
    assert.equal(auditor.status, 200, describe(auditor));
    assert.equal(auditor.json, EPIC_AUD, "an Auditor finding keeps its own home whatever the group asked for");

    const bad = await probe(group({ project: "nope" }));
    assert.equal(bad.status, 400, describe(bad));
    assert.equal(bad.code, "P0001", describe(bad));
    assert.match(String(bad.json.message), /project nope is not a projects row; project creation is John's/);

    // The dry-run mirror reads the FUNCTION's texts, prefix aside (agt-86i arm R's convention).
    const mirror = (g, projects) => validateReview(
      { groups: [g], summary_for_john: "qa", patterns_applied: [] },
      (f.json ?? []).map(x => ({ id: x.id, source: sourceOf(x.found_by), finding_type: x.finding_type, weeks_seen: 1 })),
      undefined, undefined, ROUTES, projects).refusals[0];
    assert.equal(`${PREFIX}${mirror(group(), [{ slug: "dev-manager-capabilities" }])}`, missing.json.message,
      "the offline refusal for a missing project is the function's own sentence");
    assert.equal(`${PREFIX}${mirror(group({ project: "nope" }), [{ slug: "dev-manager-capabilities" }])}`, bad.json.message,
      "and so is the one for a project that does not exist");

    if (anon) {
      const a = await probe(group({ project: "general" }), anon);
      assert.notEqual(a.code, "PGRST202", `PGRST202 means the function is missing, never a pass; got ${describe(a)}`);
      assert.ok(!a.ok, `the anon key must not execute the resolver; got ${describe(a)}`);
      assert.match(a.text, /42501|permission denied/, `a privilege denial; got ${describe(a)}`);
    } else {
      notRun("AGT-132 arm C (anon half)",
        "VITE_SUPABASE_ANON_KEY absent -- that the browser key cannot EXECUTE finding_group_epic is unverified here");
    }

    const after = {
      findings: await count(url, key, "audit_findings?select=id"),
      backlog: await count(url, key, "backlog_items?select=id"),
      decisions: await count(url, key, "runner_decisions?select=id"),
    };
    assert.deepEqual(after, before, "no probe wrote anything: findings, backlog and decision counts unchanged");
  });

  // --- D. the manager's prompt actually carries the paragraph ----------------------------------------
  await arm("D prompt", async () => {
    if (!fs.existsSync(ctxPath)) throw new Error(`arm B did not leave a prepared context at ${ctxPath}`);
    const p = spawnSync(process.execPath,
      [PROMPT, "--agent=devmanager", "--capability=review-audit-worklist", `--task-file=${ctxPath}`],
      { encoding: "utf8" });
    assert.equal(p.status, 0, `agent-prompt must exit 0; got ${p.status} ${(p.stderr ?? "").slice(0, 400)}`);
    assert.ok(p.stdout.includes(PARA_HEAD), "the assembled prompt PRINTS the routing paragraph");
    assert.ok(p.stdout.includes("task_context.routes"), "so the manager is told where to read the table");
  });

  // --- E. slice 2's migration, and the down captured BEFORE it -------------------------------------
  await arm("E migration+down", async () => {
    const m = await req(url, key, "rpc/migrations_in_range", { method: "POST", body: { p_from: PREV, p_to: "99999999999999" } });
    assert.equal(m.status, 200, describe(m));
    const rows = m.json ?? [];
    const s1 = rows.filter(x => x.name === UP);
    const s2 = rows.filter(x => x.name === UP2);
    assert.equal(s1.length, 1, `exactly one applied migration named ${UP}; got ${JSON.stringify(rows.map(x => x.name))}`);
    assert.equal(s2.length, 1, `exactly one applied migration named ${UP2} -- it is ONE transaction that drops the CHECK, rebuilds both functions and then runs its fixture against live rows, so its absence means the whole slice rolled back; got ${JSON.stringify(rows.map(x => x.name))}`);
    assert.ok(s2[0].version > s1[0].version, `${UP2} is applied after ${UP} (${s2[0].version} vs ${s1[0].version})`);

    const d = await req(url, key, `runner_migration_downs?up_name=eq.${UP2}&select=classification,down_sql`);
    assert.equal(d.status, 200, describe(d));
    assert.equal(d.json.length, 1, `one captured down for ${UP2}; got ${d.json.length}`);
    assert.equal(d.json[0].classification, "auto-downable",
      "both objects are functions, so the capture is auto-downable -- a `refused` here would mean the constraint or the trigger was named in the capture and nulled the whole down");
    assert.ok(d.json[0].down_sql.includes("VALUES ('auditor',"),
      "the down restores the PRE-change alert line, which is what proves the capture ran before the up");
    assert.ok(!d.json[0].down_sql.includes("split_part(f.found_by"),
      "captured BEFORE the up -- a down carrying the new expression would be a down that restores the bug");
    assert.ok(!d.json[0].down_sql.includes("names ONE source"),
      "and it restores the guard WITHOUT the INSERT limb, which the hand-written half of the down pairs with re-ADDing the CHECK");
  });

  // --- F. the guard fires on INSERT, and the probe cannot write whatever it finds ------------------
  await arm("F insert guard", async () => {
    const before = await count(url, key, "audit_findings?select=id");
    const bad = await req(url, key, "audit_findings", {
      method: "POST",
      body: {
        fingerprint: "agt132s2-probe", iso_week: "2026-W39",
        kind: "not-a-kind",               // fails audit_findings_kind_check, which is checked AFTER
        locations: ["tests/regression/agt-132-finding-routes.test.mjs"],
        governing_fact: "AGT-132 arm F probe", confidence: "low", proposed_resolution: "never lands",
        found_by: "auditor + ticket-owner", finding_type: "defect",
      },
    });
    assert.ok(!bad.ok, `the INSERT must be refused; got ${describe(bad)}`);
    assert.match(String(bad.json?.message ?? bad.text), /found_by names ONE source \(AGT-131\)/,
      `the refusal must come from audit_findings_guard's INSERT limb, which is a BEFORE trigger and so runs ahead of every CHECK. A kind-check message here means the limb is gone and the one-source rule is now enforced NOWHERE (the table CHECK was dropped in ${UP2}). got ${describe(bad)}`);
    assert.ok(String(bad.json?.message ?? bad.text).includes("auditor + ticket-owner"),
      "and it echoes the offending value, so the writer can see which two sources were joined");
    assert.equal(await count(url, key, "audit_findings?select=id"), before,
      "the probe wrote nothing -- audit_findings is append-only, so a row that landed here could not be cleaned up");
  });

  // --- G. the 27 rows the dropped CHECK used to freeze --------------------------------------------
  await arm("G joined rows", async () => {
    const all = await req(url, key, "audit_findings?status=in.(open,carried)&select=id,found_by");
    assert.equal(all.status, 200, describe(all));
    const joined = (all.json ?? []).filter(x => / \+ /.test(String(x.found_by)));
    assert.equal(joined.length, JOINED_OPEN_CARRIED,
      `${JOINED_OPEN_CARRIED} of the open/carried findings carry a joined found_by. Every one of them is a row apply_audit_review() must re-status to cover the worklist, and each was refused 23514 by audit_findings_found_by_single until ${UP2} dropped it. got ${joined.length} of ${(all.json ?? []).length}`);
    assert.equal(new Set(joined.map(x => x.found_by)).size, 1,
      "they share ONE found_by value -- one legacy writer, not a scattered class");
    assert.ok((all.json ?? []).length > joined.length,
      "and they are a subset of the worklist, so a review call still has single-source rows to route");
  });

  // --- H. the chain rule's new home ----------------------------------------------------------------
  await arm("H chain rule moved", async () => {
    const rule = chainRuleFromPrompt(fs.readFileSync(path.join(ROOT, "docs", "runbooks", "routine-prompt.md"), "utf8"));
    const rows = await req(url, key, `skill_profiles?slug=in.(${GUARDRAILS_SLUG},${RUN_INTENT_SLUG})&select=slug,method,guardrails,skill_type_slug`);
    assert.equal(rows.status, 200, describe(rows));
    const gr = (rows.json ?? []).find(x => x.slug === GUARDRAILS_SLUG);
    const ri = (rows.json ?? []).find(x => x.slug === RUN_INTENT_SLUG);
    assert.ok(gr && ri, `both ${GUARDRAILS_SLUG} and ${RUN_INTENT_SLUG} must exist; got ${JSON.stringify((rows.json ?? []).map(x => x.slug))}`);
    assert.equal(Array.isArray(gr.guardrails?.must) ? gr.guardrails.must.length : -1, MUST_AFTER,
      `${GUARDRAILS_SLUG}.guardrails.must must be back to ${MUST_AFTER}; got ${JSON.stringify(gr.guardrails?.must?.length)}`);
    assert.equal(indexOfExact(gr.guardrails.must, rule), -1,
      `the chain rule must be GONE from ${GUARDRAILS_SLUG}.must -- that row is linked to four capabilities and the rule governs only the runner chain`);
    const paras = String(ri.method ?? "").replace(/\r\n/g, "\n").split("\n\n");
    assert.equal(indexOfExact(paras, rule), paras.length - 1,
      `the chain rule must be the LAST paragraph of ${RUN_INTENT_SLUG}.method, byte-for-byte against docs/runbooks/routine-prompt.md. ${RUN_INTENT_SLUG} is linked to run-project alone, which is where the rule applies. got ${paras.length} paragraph(s), match at ${indexOfExact(paras, rule)}`);
    assert.equal(ri.skill_type_slug, "intent",
      "it lands as an Intent, never a second Guardrails row -- two guardrails rows collide on section slug and SKILL_ORDER 4 in api/prompt/db-assembly.js");
  });

  // --- I. the slice's own reversible handle ---------------------------------------------------------
  await arm("I decision", async () => {
    const dec = await req(url, key, `runner_decisions?kind=eq.agent-row&backlog_id=eq.AGT-132&cycle_id=eq.${SLICE2_CYCLE}&select=id,reversed_at,ladder_work_class`);
    assert.equal(dec.status, 200, describe(dec));
    const live = dec.json.filter(x => x.reversed_at === null);
    assert.equal(live.length, 1, `exactly one unreversed agent-row decision for AGT-132 in cycle ${SLICE2_CYCLE}; got ${dec.json.length} row(s)`);
    const img = await req(url, key, `runner_before_images?decision_id=eq.${live[0].id}&table_name=eq.skill_profiles&select=pk_value,row_data`);
    assert.equal(img.status, 200, describe(img));
    assert.equal(img.json.length, 2,
      `both skill rows this slice edited belong to ONE handle, or a Reverse undoes half the move and leaves the rule in two homes; got ${img.json.length}`);
    for (const i of img.json) {
      assert.ok(i.row_data !== null,
        "each image is an UPDATE image (row_data non-null) -- a NULL image would tell a Reverse to DELETE the manager's guardrails rather than restore them");
    }
    const slugs = img.json.map(i => i.row_data?.slug).sort();
    assert.deepEqual(slugs, [GUARDRAILS_SLUG, RUN_INTENT_SLUG].sort(),
      `the two images must be the two rows that moved; got ${JSON.stringify(slugs)}`);
    const grImg = img.json.find(i => i.row_data?.slug === GUARDRAILS_SLUG);
    assert.equal(grImg.row_data.guardrails.must.length, MUST_AFTER + 1,
      "the guardrails image is the row BEFORE the split (6 musts), so a Reverse actually puts the rule back");
  });

  notRun(
    "AGT-132 slice 2 (E/F catalog halves): pg_get_functiondef of apply_audit_review and " +
      "audit_findings_guard, pg_constraint on audit_findings, and pg_get_triggerdef of " +
      "audit_findings_guard",
    "pg_proc, pg_constraint and pg_trigger are not reachable over PostgREST (SES-310's refusal, " +
      "unchanged), so the catalog is asserted in the migration's OWN transaction instead and arm E " +
      "reads the ledger row that transaction left. Measured at this ship (2026-09-26, v7.0.607, " +
      "agt132s2_alert_source_and_guard): apply_audit_review overloads = 1, identity " +
      "(uuid,text,text,jsonb) UNCHANGED, body carries split_part(f.found_by, ':', 1) once and " +
      "VALUES ('auditor', zero times; audit_findings_guard overloads = 1, identity () UNCHANGED, " +
      "body carries the TG_OP = 'INSERT' limb and the `names ONE source` message; pg_constraint on " +
      "public.audit_findings holds NO audit_findings_found_by_single (asserted present before the " +
      "DROP, absent after); pg_get_triggerdef reads `CREATE TRIGGER audit_findings_guard BEFORE " +
      "INSERT OR DELETE OR UPDATE ON public.audit_findings FOR EACH ROW EXECUTE FUNCTION " +
      "audit_findings_guard()`. Each of those is asserted by the migration itself, which aborts on " +
      "any mismatch, and arm F proves the INSERT limb behaviourally from here.",
  );

  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* a leftover temp dir is not a failure */ }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
