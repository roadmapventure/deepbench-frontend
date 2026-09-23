// DeepBench v7.0.546 | tests/regression/agt-86b-audit-review.test.mjs | AGT-86 slice 2a
//
// FEATURE: AGT-86 slice 2a -- The Development Manager gains the review-audit-worklist capability (its
// Intent Skill dm-audit-review-intent and six links, seeded over the Supabase MCP), and
// public.apply_audit_review() is the one atomic write path for a review (migration
// `agt86_s2a_apply_audit_review`, applied over the Supabase MCP, no repo file). Spec:
// docs/harvests/AGT-86.md section 9.2 / 9.3. Slice 2b adds scripts/audit-review.js and this file's
// script arms (D, E).
//
// FOUR ARMS (kickoff §6), each discriminating -- every one FAILS on the tree before the change:
//   R  ROWS -- one capabilities row defaulting to the intent; the devmanager assignment; six links,
//      display_order 1..6 unique, no dm-knowledge-cycle-card; the intent's traits.schema.required is
//      exactly [groups, summary_for_john, patterns_applied]; its llm_model is the orchestrator lane's;
//      nine before-images under ONE decision, all row_data NULL, every pk_value a live row.
//      Pre-change: 0 rows.
//   P  PROMPT -- scripts/agent-prompt.js --agent=devmanager --capability=review-audit-worklist exits 0
//      and prints the capability header, the INTENT section and the weeks_seen rule. Pre-change: it
//      exits non-zero naming the missing capabilities row.
//   F  REFUSALS -- six rpc probes, each 400 P0001 naming its cause and writing nothing (findings,
//      decisions and backlog counts re-read equal). Every probe is shaped so that if the rule under
//      test were missing the function would STILL refuse (on coverage) rather than write -- a test
//      never mutates working data. Pre-change: PGRST202 (function missing), never a pass.
//   A  ANON -- the same rpc with the anon key -> 42501/permission denied; PGRST202 is the pre-change
//      red and never a pass.
//
// The weeks_seen carry refusal cannot be driven over REST without a permanent fixture
// (audit_findings refuses DELETE); the migration's own trailing DO block proves it on three
// rolled-back fixture rows. Never inserts a finding.

import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CAPABILITY = "review-audit-worklist";
const INTENT = "dm-audit-review-intent";
const AGENT = "devmanager";
const LINKS = ["dm-identity", "dm-knowledge-platform", "dm-behavior", INTENT, "dm-guardrails", "dm-knowledge-patterns"];
const WEEK = "2026-W37";
const SESSION_TAG = "agt-86b-qa";

function restHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function call(url, key, method, q, body, extra = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: restHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation", ...extra }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}

const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 240)}`;
const review = (groups, extra = {}) => ({ groups, summary_for_john: "qa", patterns_applied: [], ...extra });

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-86b live arms (R, P, F, A)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the review capability rows, prompt, apply_audit_review refusals and anon arms are unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
    return;
  }

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const get = async q => {
    const r = await call(url, key, "GET", q);
    if (!r.ok) throw new Error(`GET ${q} -> ${describe(r)}`);
    return r.json;
  };
  const count = async (table, filter = "") => {
    const res = await fetch(`${url}/rest/v1/${table}?select=id${filter}`, {
      method: "HEAD", headers: restHeaders(key, { Prefer: "count=exact" }),
    });
    const range = res.headers.get("content-range") || "";
    const n = Number(range.split("/")[1]);
    if (!Number.isFinite(n)) throw new Error(`count ${table} -> HTTP ${res.status} content-range '${range}'`);
    return n;
  };

  // --- R. rows ------------------------------------------------------------------------------------
  await arm("R rows", async () => {
    const caps = await get(`capabilities?slug=eq.${CAPABILITY}&select=id,execution_type,tenant_id,default_intent_slug`);
    assert.equal(caps.length, 1, `exactly one capabilities row for ${CAPABILITY}; got ${caps.length}`);
    assert.equal(caps[0].default_intent_slug, INTENT, "the capability must default to its Intent (agent-prompt.js falls back to this column)");
    assert.equal(caps[0].execution_type, "ai");
    assert.equal(caps[0].tenant_id, "global");

    const assigns = await get(`agent_capability_assignments?agent_id=eq.${AGENT}&capability_slug=eq.${CAPABILITY}&select=id,tenant_id`);
    assert.equal(assigns.length, 1, `The Development Manager must hold ${CAPABILITY} exactly once; got ${assigns.length}`);
    assert.equal(assigns[0].tenant_id, "global");

    const links = await get(`capability_skill_profiles?capability_slug=eq.${CAPABILITY}&select=id,skill_profile_slug,display_order,level,is_required&order=display_order`);
    assert.deepEqual(links.map(l => l.skill_profile_slug), LINKS,
      "six links in order identity, platform knowledge, behavior, intent, guardrails, patterns -- and NOT dm-knowledge-cycle-card (the build-cycle card)");
    assert.deepEqual(links.map(l => l.display_order), [1, 2, 3, 4, 5, 6], "display_order must be 1..6, unique");
    assert.ok(links.every(l => l.level === 2 && l.is_required === true), "every link is level 2, required");

    const [intent] = await get(`skill_profiles?slug=eq.${INTENT}&select=id,skill_type_slug,method,traits,llm_model`);
    assert.ok(intent, `no skill_profiles row ${INTENT}`);
    assert.equal(intent.skill_type_slug, "intent");
    assert.deepEqual(intent.traits?.schema?.required, ["groups", "summary_for_john", "patterns_applied"]);
    assert.equal(intent.traits?.can_request_help, false);
    assert.match(intent.method, /weeks_seen >= 3/, "the method must carry the carry rule verbatim (harvest 9.2)");
    const [lane] = await get("runner_model_lanes?lane=eq.orchestrator&select=model_id");
    assert.equal(intent.llm_model, lane.model_id, "the Intent's llm_model must be the orchestrator lane's (the manager's lane)");

    const pks = [caps[0].id, assigns[0].id, intent.id, ...links.map(l => l.id)];
    const imgs = await get(`runner_before_images?pk_value=in.(${pks.join(",")})&select=pk_value,table_name,row_data,decision_id,session_name`);
    assert.equal(imgs.length, 9, `nine INSERT before-images, one per new row; got ${imgs.length}`);
    assert.deepEqual([...new Set(imgs.map(i => i.pk_value))].sort(), [...pks].sort(), "every image's pk_value is a live new row");
    assert.ok(imgs.every(i => i.row_data === null), "an INSERT's image is row_data NULL (its undo is a DELETE)");
    const decs = [...new Set(imgs.map(i => i.decision_id))];
    assert.equal(decs.length, 1, `all nine images under ONE decision; got ${decs.join(", ")}`);
    assert.ok(decs[0], "the images must carry a decision_id");
  });

  // --- P. prompt ----------------------------------------------------------------------------------
  await arm("P prompt", async () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/agent-prompt.js"), `--agent=${AGENT}`, `--capability=${CAPABILITY}`],
      { cwd: ROOT, env: process.env, encoding: "utf8", timeout: 60000 });
    assert.equal(r.status, 0, `agent-prompt.js must exit 0; got ${r.status}: ${(r.stderr || "").slice(0, 300)}`);
    assert.match(r.stdout, new RegExp(`capability ${CAPABILITY}`), "the header must name the capability");
    assert.match(r.stdout, /=== INTENT ===/, "the Intent section must render");
    assert.match(r.stdout, /weeks_seen/, "the Intent's carry rule must reach the prompt");
  });

  // --- F. refusals --------------------------------------------------------------------------------
  await arm("F refusals", async () => {
    const open = (await get("audit_findings?status=in.(open,carried)&select=id&order=id")).map(f => f.id);
    if (open.length < 2) {
      notRun("AGT-86b arm F (refusals)", `only ${open.length} open/carried finding(s) -- the coverage probes need at least two`);
      return;
    }
    const before = {
      findings: await count("audit_findings"),
      decisions: await count("runner_decisions"),
      backlog: await count("backlog_items"),
      ruled: (await get("audit_findings?ruled_at=not.is.null&select=id")).length,
    };
    const unknown = "00000000-0000-4000-8000-0000000086b0";
    const missing = open[open.length - 1];
    const probes = [
      ["missing id", { p_session_name: SESSION_TAG, p_review: review([{ kind: "not-a-defect", reason: "qa", finding_ids: open.slice(0, -1) }]) },
        new RegExp(`${missing}.*not covered`)],
      ["unknown id", { p_session_name: SESSION_TAG, p_review: review([{ kind: "not-a-defect", reason: "qa", finding_ids: [...open, unknown] }]) },
        new RegExp(`unknown or not open/carried finding ${unknown}`)],
      ["duplicate id", { p_session_name: SESSION_TAG, p_review: review([
        { kind: "not-a-defect", reason: "qa", finding_ids: [open[0]] }, { kind: "not-a-defect", reason: "qa", finding_ids: [open[0]] }]) },
        new RegExp(`finding ${open[0]} in two groups`)],
      ["escalate without john_call", { p_session_name: SESSION_TAG, p_review: review([{ kind: "escalate", summary: "qa", finding_ids: [open[0]] }]) },
        /john_call/],
      ["carry without reason", { p_session_name: SESSION_TAG, p_review: review([{ kind: "carry", finding_ids: [open[0]] }]) },
        /reason/],
      ["both cycle and session", { p_cycle_id: "00000000-0000-4000-8000-0000000086b1", p_session_name: SESSION_TAG,
        p_review: review([{ kind: "not-a-defect", reason: "qa", finding_ids: [open[0]] }]) },
        /exactly one/],
    ];
    for (const [name, args, want] of probes) {
      const body = { p_cycle_id: null, p_session_name: null, p_week: WEEK, ...args };
      const r = await call(url, key, "POST", "rpc/apply_audit_review", body);
      assert.notEqual(r.code, "PGRST202", `${name}: PGRST202 means apply_audit_review does not exist -- the pre-change red; got ${describe(r)}`);
      assert.equal(r.status, 400, `${name}: must be refused with 400; got ${describe(r)}`);
      assert.equal(r.code, "P0001", `${name}: the refusal must be the function's RAISE (P0001); got ${describe(r)}`);
      assert.match(r.json?.message ?? "", want, `${name}: the refusal must name its cause; got ${describe(r)}`);
    }
    const after = {
      findings: await count("audit_findings"),
      decisions: await count("runner_decisions"),
      backlog: await count("backlog_items"),
      ruled: (await get("audit_findings?ruled_at=not.is.null&select=id")).length,
    };
    assert.deepEqual(after, before, "no refused probe may write anything");
  });

  // --- A. anon ------------------------------------------------------------------------------------
  await arm("A anon", async () => {
    if (!anon) {
      notRun("AGT-86b arm A (anon)", "VITE_SUPABASE_ANON_KEY absent -- the anon refusal of apply_audit_review() is unverified here");
      return;
    }
    const r = await call(url, anon, "POST", "rpc/apply_audit_review",
      { p_cycle_id: null, p_session_name: SESSION_TAG, p_week: WEEK, p_review: review([{ kind: "carry", finding_ids: ["x"] }]) });
    assert.notEqual(r.code, "PGRST202", `PGRST202 means the function does not exist -- the pre-change red, never a pass; got ${describe(r)}`);
    assert.ok(!r.ok, `anon must not be able to apply a review; got ${describe(r)}`);
    assert.match(r.text, /42501|permission denied/, `the refusal must be a privilege denial; got ${describe(r)}`);
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
