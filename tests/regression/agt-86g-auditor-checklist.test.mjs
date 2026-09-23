// DeepBench v7.0.551 | tests/regression/agt-86g-auditor-checklist.test.mjs | AGT-86 slice 7
//
// FEATURE: AGT-86 slice 7 -- The Auditor's Skill rows carry the approved checklist (23 named checks in
// five jobs, au-behavior), nine homes and the sixth kind (au-knowledge-homes), and four job
// capabilities with their Intent rows, assignments and five links each -- all DB rows written in one
// DO block over the Supabase MCP under one decision (session agt-86-auditor-0923). Spec: kickoff
// docs/kickoffs/v7.0.551-AGT-86-s7-auditor-checklist-rows.md section 6; row text docs/harvests/AGT-86.md
// section 14. Reads only -- never writes a row.
//
// SIX ARMS (kickoff §6):
//   A  CHECKLIST -- au-behavior.objective non-empty; method names all 23 check slugs; exactly the five
//      slice-4 slugs carry [code]. Pre-change: objective/method NULL -> red.
//   B  HOMES -- au-knowledge-homes.method carries (6)..(9), both private repos, the redaction marker,
//      THE SIX KINDS and check_slug. Pre-change: none -> red.
//   C  ROWS -- six auditor assignments; each new capability defaults to its intent with five links in
//      order; each intent's schema requires check_slug, kind enum has other, handler auditor-write,
//      llm_model = judgment lane; web search bound on the advisor only. Pre-change: 0 rows -> red.
//   D  PROMPT -- agent-prompt.js exits 0 for each new capability and its INTENT section carries the
//      job's first check. Pre-change: exit 2 (missing capability) -> red.
//   E  UNTOUCHED (control) -- au-identity md5s, au-guardrails lists, and no session image on either
//      row. Passes pre and post; fails if the build touches either row.
//   F  LEDGER -- one agent-row decision holding 34 images: 2 UPDATE images (homes, behavior) with
//      row_data, 32 INSERT images row_data NULL, every pk_value a live new row. Pre-change: 0 -> red.

import assert from "node:assert/strict";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AGENT = "auditor";
const SESSION = "agt-86-auditor-0923";
const IDENTITY_ID = "c9e7a0f2-3a87-48e7-9e04-f7c56b53280f";
const GUARDRAILS_ID = "1e1adf86-2700-4c44-bd67-30546fb3da01";
const HOMES_ID = "13d78538-02d1-4f97-b875-ff71bd7dfe50";
const BEHAVIOR_ID = "47e8bc5a-8b0b-49aa-b4bf-2a386d94ea0b";
const IDENTITY_MD5 = { objective: "1901c1b2cb521a001858f92eb36c24ae", method: "3c14e0df60098f88cad572bd8835b831" };

const CHECKS = [
  "rules-opposite", "rule-two-wordings", "rule-dead-pointer", "rule-retired-still-followed", "rule-live-not-enforced",
  "board-duplicate", "board-already-fixed", "board-stale", "board-repeat-worked", "board-no-home", "board-deferral-undone",
  "quality-shipped-vs-asked", "quality-closed-red", "quality-description-wrong", "quality-safety-never-on",
  "config-disagrees", "config-outdated-fact", "config-report-vs-data", "config-private-in-public",
  "advisor-feature-replaces-handbuilt", "advisor-model-change", "advisor-industry-practice", "advisor-limit-hit",
];
const CODE_CHECKS = ["board-deferral-undone", "board-no-home", "board-repeat-worked", "board-stale", "quality-closed-red"];

// capability -> [intent, the job's first check]
const JOBS = {
  "audit-board-health": ["au-board-intent", "board-duplicate"],
  "audit-work-quality": ["au-quality-intent", "quality-shipped-vs-asked"],
  "audit-config-review": ["au-config-intent", "config-disagrees"],
  "audit-advisor": ["au-advisor-intent", "advisor-feature-replaces-handbuilt"],
};
const ALL_ASSIGNMENTS = ["audit-advisor", "audit-agent-data", "audit-board-health", "audit-config-review", "audit-governance-corpus", "audit-work-quality"];

const GUARDRAILS = {
  must: [
    "quote every location verbatim from the statement handed to you, never a paraphrase",
    "name exactly one governing fact per finding",
    "name which home should win in every proposed resolution and cite the ledger entry or decision that makes it true",
    "treat any statement marked retired as history, never as one side of a contradiction",
    "return an empty findings array rather than a weak finding",
  ],
  must_not: [
    "edit, certify, resolve or close anything — you file",
    "propose a resolution that retires B20, HR-MERGE, the reversal window, or any John-standing power",
    "re-file a finding whose fingerprint is in prior with a not-a-defect ruling",
    "write to any table directly — the auditor-write handler is the only writer",
    "name a specific agent as the cause; name the row and the field",
  ],
};

const md5 = s => crypto.createHash("md5").update(s ?? "", "utf8").digest("hex");
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-86g live arms (A-F)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the Auditor's checklist, homes, capability rows, prompts, control and ledger are unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
    return;
  }

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const get = async q => {
    const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const text = await res.text();
    if (!res.ok) throw new Error(`GET ${q} -> HTTP ${res.status} ${text.slice(0, 240)}`);
    return JSON.parse(text);
  };
  const profile = async slug => {
    const [row] = await get(`skill_profiles?slug=eq.${slug}&select=id,slug,objective,method,traits,guardrails,llm_model,technical_services,skill_type_slug`);
    assert.ok(row, `no skill_profiles row ${slug}`);
    return row;
  };

  // --- A. checklist -------------------------------------------------------------------------------
  await arm("A checklist", async () => {
    const b = await profile("au-behavior");
    assert.ok(b.objective && b.objective.trim().length > 0, "au-behavior.objective must be non-empty");
    assert.ok(b.method, "au-behavior.method is NULL -- the checklist is not written");
    const missing = CHECKS.filter(s => !new RegExp(`^${escapeRe(s)}( \\[code\\])? — `, "m").test(b.method));
    assert.deepEqual(missing, [], `every check must have its own line 'slug — test'; missing: ${missing.join(", ")}`);
    const coded = CHECKS.filter(s => new RegExp(`^${escapeRe(s)} \\[code\\] — `, "m").test(b.method)).sort();
    assert.deepEqual(coded, CODE_CHECKS, "exactly the five slice-4 slugs carry [code]");
  });

  // --- B. homes -----------------------------------------------------------------------------------
  await arm("B homes", async () => {
    const h = await profile("au-knowledge-homes");
    const want = ["(6)", "(7)", "(8)", "(9)", "roadmapventure/interviewquestions", "roadmapventure/claude-config",
      "<REDACTED:kind>", "THE SIX KINDS", "check_slug"];
    const missing = want.filter(w => !(h.method ?? "").includes(w));
    assert.deepEqual(missing, [], `au-knowledge-homes.method lacks: ${missing.join(", ")}`);
  });

  // --- C. rows ------------------------------------------------------------------------------------
  await arm("C rows", async () => {
    const assigns = await get(`agent_capability_assignments?agent_id=eq.${AGENT}&select=capability_slug,tenant_id`);
    assert.deepEqual(assigns.map(a => a.capability_slug).sort(), ALL_ASSIGNMENTS, "the Auditor holds six capabilities");
    assert.ok(assigns.every(a => a.tenant_id === "global"));
    const [lane] = await get("runner_model_lanes?lane=eq.judgment&select=model_id");
    for (const [cap, [intent]] of Object.entries(JOBS)) {
      const caps = await get(`capabilities?slug=eq.${cap}&select=default_intent_slug,execution_type,tenant_id`);
      assert.equal(caps.length, 1, `exactly one capabilities row ${cap}; got ${caps.length}`);
      assert.equal(caps[0].default_intent_slug, intent, `${cap} must default to ${intent}`);
      assert.equal(caps[0].execution_type, "ai");
      assert.equal(caps[0].tenant_id, "global");
      const links = await get(`capability_skill_profiles?capability_slug=eq.${cap}&select=skill_profile_slug,display_order,level,is_required&order=display_order`);
      assert.deepEqual(links.map(l => l.skill_profile_slug), ["au-identity", "au-knowledge-homes", "au-behavior", intent, "au-guardrails"], `${cap} links`);
      assert.deepEqual(links.map(l => l.display_order), [1, 2, 3, 4, 5], `${cap} display_order`);
      assert.ok(links.every(l => l.level === 2 && l.is_required === true), `${cap} links level 2, required`);
      const p = await profile(intent);
      assert.equal(p.skill_type_slug, "intent");
      assert.ok(p.traits?.schema?.properties?.findings?.items?.required?.includes("check_slug"), `${intent} findings must require check_slug`);
      assert.ok(p.traits?.schema?.properties?.findings?.items?.properties?.kind?.enum?.includes("other"), `${intent} kind enum must include other`);
      assert.equal(p.traits?.handler, "auditor-write", `${intent} handler`);
      assert.equal(p.llm_model, lane.model_id, `${intent} llm_model must be the judgment lane's`);
      if (cap === "audit-advisor") {
        assert.equal(p.traits?.enable_web_search, true, "advisor enable_web_search");
        assert.equal(p.traits?.web_search_max_uses, 8, "advisor web_search_max_uses");
        assert.ok(p.technical_services?.includes("web-search"), "advisor technical_services includes web-search");
      } else {
        assert.ok(!("enable_web_search" in (p.traits ?? {})), `${intent} must not carry enable_web_search`);
        assert.deepEqual(p.technical_services, ["structured-output"], `${intent} technical_services`);
      }
    }
  });

  // --- D. prompt ----------------------------------------------------------------------------------
  await arm("D prompt", async () => {
    for (const [cap, [, first]] of Object.entries(JOBS)) {
      const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/agent-prompt.js"), `--agent=${AGENT}`, `--capability=${cap}`],
        { cwd: ROOT, env: process.env, encoding: "utf8", timeout: 60000 });
      assert.equal(r.status, 0, `${cap}: agent-prompt.js must exit 0; got ${r.status}: ${(r.stderr || "").slice(0, 300)}`);
      assert.match(r.stdout, new RegExp(`capability ${escapeRe(cap)}`), `${cap}: header must name the capability`);
      const at = r.stdout.indexOf("=== INTENT ===");
      assert.ok(at >= 0, `${cap}: the INTENT section must render`);
      const intentSection = r.stdout.slice(at).split(/\n=== (?!INTENT)/)[0];
      assert.ok(intentSection.includes(first), `${cap}: the INTENT section must name the job's first check ${first}`);
    }
  });

  // --- E. untouched (control) ---------------------------------------------------------------------
  await arm("E untouched", async () => {
    const id = await profile("au-identity");
    assert.equal(id.id, IDENTITY_ID);
    assert.equal(md5(id.objective), IDENTITY_MD5.objective, "au-identity.objective changed");
    assert.equal(md5(id.method), IDENTITY_MD5.method, "au-identity.method changed");
    const g = await profile("au-guardrails");
    assert.equal(g.id, GUARDRAILS_ID);
    assert.deepEqual(g.guardrails?.must, GUARDRAILS.must, "au-guardrails.must changed");
    assert.deepEqual(g.guardrails?.must_not, GUARDRAILS.must_not, "au-guardrails.must_not changed");
    const imgs = await get(`runner_before_images?session_name=eq.${SESSION}&pk_value=in.(${IDENTITY_ID},${GUARDRAILS_ID})&select=id`);
    assert.equal(imgs.length, 0, `no session image may name au-identity or au-guardrails; got ${imgs.length}`);
  });

  // --- F. ledger ----------------------------------------------------------------------------------
  await arm("F ledger", async () => {
    const upd = await get(`runner_before_images?session_name=eq.${SESSION}&table_name=eq.skill_profiles&pk_value=in.(${HOMES_ID},${BEHAVIOR_ID})&row_data=not.is.null&select=decision_id`);
    const decIds = [...new Set(upd.map(i => i.decision_id).filter(Boolean))];
    assert.equal(decIds.length, 1, `the homes and behavior UPDATE images must sit under ONE decision; got ${decIds.length}`);
    const dec = decIds[0];
    const [d] = await get(`runner_decisions?id=eq.${dec}&select=kind,session_name,backlog_id`);
    assert.equal(d?.kind, "agent-row");
    assert.equal(d?.session_name, SESSION);
    assert.equal(d?.backlog_id, "AGT-86");
    const imgs = await get(`runner_before_images?decision_id=eq.${dec}&select=table_name,pk_value,row_data,session_name`);
    assert.equal(imgs.length, 34, `34 images under the decision; got ${imgs.length}`);
    const withData = imgs.filter(i => i.row_data !== null);
    assert.deepEqual(withData.map(i => i.pk_value).sort(), [HOMES_ID, BEHAVIOR_ID].sort(), "exactly the two UPDATE images carry row_data");
    assert.equal(imgs.filter(i => i.row_data === null).length, 32, "32 INSERT images row_data NULL");

    const caps = Object.keys(JOBS);
    const intents = Object.values(JOBS).map(j => j[0]);
    const live = new Set([
      ...(await get(`capabilities?slug=in.(${caps.join(",")})&select=id`)).map(r => r.id),
      ...(await get(`skill_profiles?slug=in.(${intents.join(",")})&select=id`)).map(r => r.id),
      ...(await get(`agent_capability_assignments?agent_id=eq.${AGENT}&capability_slug=in.(${caps.join(",")})&select=id`)).map(r => r.id),
      ...(await get(`capability_skill_profiles?capability_slug=in.(${caps.join(",")})&select=id`)).map(r => r.id),
      HOMES_ID, BEHAVIOR_ID,
    ]);
    assert.equal(live.size, 34, `34 live rows (4 capabilities, 4 intents, 4 assignments, 20 links, 2 edited); got ${live.size}`);
    const pks = imgs.map(i => i.pk_value);
    assert.equal(new Set(pks).size, 34, "34 distinct pk_values");
    assert.deepEqual(pks.filter(p => !live.has(p)), [], "every pk_value is a live row this slice wrote");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
