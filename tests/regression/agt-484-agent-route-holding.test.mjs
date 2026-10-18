// DeepBench v7.0.859 | tests/regression/agt-484-agent-route-holding.test.mjs | AGT-484 -- AGENT-SOURCED
// FINDINGS LAND ON A HOLDING LIST, AND THE ROUTE -- NOT THE PICKER -- DECIDES.
//
// THE DEFECT, measured live 2026-10-18 before the change. scripts/market-agent.js:332 files
// `foundBy: 'agent:<slug>'` and finding_group_epic(jsonb) keys on split_part(a.found_by, ':', 1), so
// `agent:jerry` (7 rows) and `agent:nathan` (19) both resolve to the ONE `agent` finding_routes row
// -- precedence 30 / `*` / project_slug **NULL**, the staff-watch shape AGT-161 gave it, which means
// the Development Manager picks the project himself. That pick is what put AGT-469 (`agent:jerry`,
// 2026-10-11) into `agent-training` -- a PAUSED project -- where it stopped. Measured on the
// unchanged tree: an unpicked agent group RAISEd 400 P0001 `apply_audit_review: a root-cause group
// from source(s) agent needs project (a projects.slug or general)`, and the same group picking
// `agent-training` answered `e7d2c90d-6443-4779-8233-ead389dbbaff` -- the paused project's epic.
//
// THE CHANGE. Migration `agt484_agent_route_holding` (down captured FIRST over public.finding_routes
// -> `refused`, card-only, 0 captured / 1 refusal, the class AGT-161's D1 recorded for this table)
// sets that one row's project_slug NULL -> `dev-mgr-findings`: planned, one unlocked epic
// 48c63dac-4e5e-4287-8e72-01777fedbbf2, and only Victoria promotes from it (AGT-480). John
// 2026-10-13, decision ccab94da, JOHN-0925-DESIGNER-DECIDES and reversible.
//
// ROUTING IS DATA (§19b), SO NO CODE MOVED, and that is the ticket's own call rather than a shortcut:
// the fix is ONE row's value, not two new `jerry`/`nathan` rows the resolver could never match
// (split_part never yields `jerry`), and not a branch in scripts/audit-review.js -- its line 481
// wants a pick only for a NULL route, and step 3a returns before reading one. pattern:2, pattern:8.
//
// ARMS, each discriminating -- every live arm was measured FAILING on the tree and database before
// this ship, which is the only reason to trust it passing after:
//   A  PURE (no network) -- _lib/finding-routes.js's `agent` row carries MANAGER_PROJECT. This is
//      CI's arm: the credential-less run still grades the change. Pre-change: `null`.
//   B  LIVE, READ-ONLY -- exactly one live `agent` row, deepEqual to the pinned row AS READ, so the
//      file and the database cannot drift apart silently. Pre-change: project_slug null.
//   C  LIVE PROBE of rpc/finding_group_epic, WRITES NOTHING -- the holding epic is computed from
//      `projects.slug='dev-mgr-findings'` as read (no uuid is a literal here), and all THREE calls
//      must reach it: with no pick at all, with the manager picking `agent-training` (the paused
//      project of the real AGT-469 misroute), and with him picking something else entirely. The
//      second is the regression itself; the third is what proves the ROUTE decides and not the
//      picker. Pre-change: call 1 refused P0001 `needs project`, call 2 answered Agent Training's
//      epic.
//   D  LIVE LEDGER -- this cycle's range holds exactly one `agt484_agent_route_holding`, and its
//      captured down is classified `refused`. A card-only down is a fact about this ship that the
//      next session rolling a range back has to be able to read, so it is asserted, not narrated.
//
// NOTHING HERE WRITES A ROW. A is pure; B and D read; C's calls either RAISE before any write or
// return an epic computed from reads, and the three counts are re-read to prove it.

import assert from "node:assert/strict";
import { selfRun, notRun } from "./_lib/self-run.js";
import { LIVE_ROUTES, MANAGER_PROJECT } from "./_lib/finding-routes.js";

// This cycle's migration window -- the lower bound is this cycle's own start, so the range cannot
// sweep in a neighbouring cycle's migration and call it ours.
const RANGE_FROM = "20261018091336";
const UP_NAME = "agt484_agent_route_holding";
const PAUSED_PICK = "agent-training";   // where the NULL route actually sent AGT-469
const OTHER_PICK = "go-to-market";      // any other pick -- the route must still win
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function req(url, key, q, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}
const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 260)}`;

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

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // ---- A. PURE -----------------------------------------------------------------------------------
  await arm("A pure route row", async () => {
    const agentRows = LIVE_ROUTES.filter(x => x.source === "agent");
    assert.equal(agentRows.length, 1,
      "_lib/finding-routes.js must pin exactly ONE `agent` row -- split_part(found_by, ':', 1) can only ever yield `agent`");
    assert.equal(agentRows[0].project_slug, MANAGER_PROJECT,
      "the `agent` row must route to the holding list (MANAGER_PROJECT); NULL is the pre-AGT-484 shape that let the manager pick a paused project");
    // The row is re-pointed, never widened: precedence and finding_type are untouched by this ticket.
    assert.equal(agentRows[0].precedence, 30, "AGT-484 re-points the `agent` row; it does not re-rank it");
    assert.equal(agentRows[0].finding_type, "*", "AGT-484 re-points the `agent` row; it does not narrow its finding_type");
    // And no row anywhere is left waiting on a manager pick by this file's own account.
    assert.deepEqual(LIVE_ROUTES.filter(x => x.project_slug === null), [],
      "no pinned route may carry project_slug null after AGT-484 -- a NULL route is the manager-pick path this ticket closed");
  });

  if (!url || !key) {
    notRun("AGT-484 arms B-D",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the live `agent` route row, the three " +
      "finding_group_epic resolutions and the migration ledger's card-only down are all unverified " +
      "here. Run with node --env-file-if-exists=.env.local tests/regression/agt-484-agent-route-holding.test.mjs");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }

  // ---- B. LIVE, READ-ONLY ------------------------------------------------------------------------
  await arm("B live route row", async () => {
    const r = await req(url, key, "finding_routes?source=eq.agent&select=precedence,source,finding_type,project_slug");
    assert.ok(r.ok, describe(r));
    assert.equal(r.json.length, 1, `exactly one live \`agent\` route row; got ${r.text}`);
    // deepEqual against the row AS PINNED -- this is what stops the file and the table drifting apart.
    assert.deepEqual(r.json[0], LIVE_ROUTES.find(x => x.source === "agent"),
      "the live `agent` row must equal _lib/finding-routes.js's pinned row, field for field");
  });

  // ---- C. LIVE PROBE, NO WRITES ------------------------------------------------------------------
  await arm("C live resolution, three picks", async () => {
    // A DECREASE can never be this arm's doing -- a probe that only SELECTs or RAISEs cannot delete a
    // row, and this is a shared live project with a runner cycle on it (agt-264 arm C measured these
    // same counts falling mid-arm). An INCREASE is the direction a stray write would move, and that
    // still fails.
    const before = {
      findings: await count(url, key, "audit_findings?select=id"),
      tickets: await count(url, key, "backlog_items?select=id"),
      decisions: await count(url, key, "runner_decisions?select=id"),
    };

    const f = await req(url, key, "audit_findings?found_by=eq.agent:jerry&select=id&order=created_at.desc&limit=1");
    assert.ok(f.ok, describe(f));
    assert.equal(f.json.length, 1,
      `the probe needs one agent:jerry finding to route -- the premise AGT-484 exists for; got ${f.text}`);
    const fid = f.json[0].id;

    // THE EXPECTED EPIC IS COMPUTED FROM THE PROJECT AS READ. No uuid is a literal here, so a
    // re-pointed or re-created holding epic cannot make this arm lie about where a finding went.
    const proj = await req(url, key, `projects?slug=eq.${MANAGER_PROJECT}&select=id`);
    assert.ok(proj.ok, describe(proj));
    assert.equal(proj.json.length, 1, `exactly one \`${MANAGER_PROJECT}\` project; got ${proj.text}`);
    const epics = await req(url, key, `epics?project_id=eq.${proj.json[0].id}&select=id`);
    assert.ok(epics.ok, describe(epics));
    assert.equal(epics.json.length, 1,
      `the holding list must have exactly ONE epic for a route to resolve to; got ${epics.text}`);
    const epic = epics.json[0].id;
    assert.match(epic, UUID_RE, `the holding epic must be a uuid; got ${epic}`);

    const resolve = async pick => req(url, key, "rpc/finding_group_epic", {
      method: "POST",
      body: {
        p_group: {
          kind: "root-cause",
          ...(pick === undefined ? {} : { project: pick }),
          finding_ids: [fid],
        },
      },
    });

    // (i) No pick at all. Pre-change this was 400 P0001 `needs project` -- the refusal that made the
    //     manager pick in the first place.
    const unpicked = await resolve(undefined);
    assert.equal(unpicked.status, 200,
      `an UNPICKED agent group must now resolve on the route alone; got ${describe(unpicked)}`);
    assert.equal(unpicked.json, epic,
      `and must resolve to the holding epic ${epic}; got ${describe(unpicked)}`);

    // (ii) The regression itself: the manager picks the PAUSED project AGT-469 landed in.
    const paused = await resolve(PAUSED_PICK);
    assert.equal(paused.status, 200, `pick ${PAUSED_PICK} must be accepted; got ${describe(paused)}`);
    assert.equal(paused.json, epic,
      `a pick of ${PAUSED_PICK} must still reach the holding epic ${epic} -- that pick is exactly how AGT-469 stalled; got ${describe(paused)}`);

    // (iii) And any other pick. Two different picks reaching one epic is what proves the ROUTE
    //       decides rather than the picker -- (ii) alone is consistent with the pick being honoured.
    const other = await resolve(OTHER_PICK);
    assert.equal(other.status, 200, `pick ${OTHER_PICK} must be accepted; got ${describe(other)}`);
    assert.equal(other.json, epic,
      `a pick of ${OTHER_PICK} must reach the holding epic ${epic} too -- the route decides, not the picker; got ${describe(other)}`);

    const after = {
      findings: await count(url, key, "audit_findings?select=id"),
      tickets: await count(url, key, "backlog_items?select=id"),
      decisions: await count(url, key, "runner_decisions?select=id"),
    };
    for (const k of Object.keys(before)) {
      assert.ok(after[k] <= before[k], `the probe adds nothing: ${k} went ${before[k]} -> ${after[k]}`);
    }
  });

  // ---- D. LIVE LEDGER ----------------------------------------------------------------------------
  await arm("D live migration ledger", async () => {
    const mig = await req(url, key, "rpc/migrations_in_range", {
      method: "POST",
      body: { p_from: RANGE_FROM, p_to: "99999999999999" },
    });
    assert.ok(mig.ok, describe(mig));
    const mine = (mig.json ?? []).filter(m => m.name === UP_NAME);
    assert.equal(mine.length, 1,
      `this cycle's range must hold exactly one ${UP_NAME} -- a second is a re-apply; got ${mig.text}`);

    const down = await req(url, key, `runner_migration_downs?up_name=eq.${UP_NAME}&select=classification`);
    assert.ok(down.ok, describe(down));
    assert.equal(down.json.length, 1, `exactly one captured down for ${UP_NAME}; got ${down.text}`);
    assert.equal(down.json[0].classification, "refused",
      "the down is CARD-ONLY (`refused`): an in-place UPDATE of an existing row is not losslessly derivable, so a range holding this migration is not auto-rollbackable and whoever rolls it back must read the card");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
