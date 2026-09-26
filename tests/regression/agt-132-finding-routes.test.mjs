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
// NOTHING HERE WRITES A ROW. Arm C's refusals are raised before any write by construction (the
// resolver only reads), and arms B and D are reads and one prompt assembly.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "audit-review.js");
const PROMPT = path.join(ROOT, "scripts", "agent-prompt.js");

const UP = "agt132_finding_routes";
const PREV = "20260926093750"; // agt140_project_priority_pick
const INTENT_ID = "a6d3568f-3a39-44ff-a2b9-0aa62035281e";
const EPIC_DMC = "e0335c39-0728-4ff1-99ca-232a02912176";
const EPIC_AUD = "6c8a8325-205c-4e08-b0b2-64c939582cc6";
const PARA_HEAD = "THE FINDINGS STANDARD AND ROUTING";
const PREFIX = "apply_audit_review: ";

// The four rows the migration seeds, in the order --prepare reads them (precedence, source).
const ROUTES = [
  { precedence: 10, source: "*", finding_type: "security", project_slug: "security" },
  { precedence: 20, source: "auditor", finding_type: "*", project_slug: "auditor-enhancements" },
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
    assert.deepEqual(r.json, ROUTES, "the four routing rows, exactly");
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

    const dec = await req(url, key, "runner_decisions?kind=eq.agent-row&backlog_id=eq.AGT-132&select=id,status,reversed_at,ladder_work_class");
    assert.equal(dec.status, 200, describe(dec));
    const live = dec.json.filter(x => x.reversed_at === null);
    assert.equal(live.length, 1, `exactly one unreversed agent-row decision for AGT-132; got ${dec.json.length} row(s)`);
    const img = await req(url, key, `runner_before_images?decision_id=eq.${live[0].id}&table_name=eq.skill_profiles&select=pk_value,row_data`);
    assert.equal(img.json.length, 1, "with exactly one skill_profiles before-image -- the row is reversible, not hand-recoverable");
    assert.equal(img.json[0].pk_value, INTENT_ID);
    assert.ok(!String(img.json[0].row_data?.method ?? "").includes(PARA_HEAD),
      "the image is the row BEFORE the append, so a Reverse actually removes the paragraph");

    const p = spawnSync(process.execPath, [SCRIPT, "--prepare", "--week=2026-W39", `--out=${ctxPath}`], { encoding: "utf8" });
    assert.equal(p.status, 0, `--prepare must exit 0; got ${p.status} ${p.stderr}`);
    const ctx = JSON.parse(fs.readFileSync(ctxPath, "utf8"));
    assert.deepEqual(ctx.routes, ROUTES, "the prepared context carries the routing table");
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

  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* a leftover temp dir is not a failure */ }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
