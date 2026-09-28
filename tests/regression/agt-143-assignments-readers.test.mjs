// DeepBench v7.0.674 | tests/regression/agt-143-assignments-readers.test.mjs | AGT-157 -- (e) is
// the NO-ORPHAN INVARIANT now, not four absolute Skill counts. The counts were a pin on live data
// that a legitimate switch moves (AGT-144 took them 54/30/21/48 -> 56/34/21/48 and this file went
// red for it); the invariant is a property of the switch mechanism, which is what AGT-143 shipped.
//
// DeepBench v7.0.589 | tests/regression/agt-143-assignments-readers.test.mjs | AGT-143 (P10 - Tooling)
// -- every script reads its model from public.model_assignments.
//
// WHAT IS PINNED, and the vacuous shape each clause is controlled against.
//
// (a) OFFLINE SEAM PROOF over scripts/agent-prompt.js's resolveJudgmentModel() -- ses-331 part (f)'s
//     shape: fetchImpl is injected, so it always runs. Four branches, and the one that says WHICH
//     fired is asserted every time (`reason`), never just the model id:
//       a1 a capability row that moves the model  -> reason 'capability', `from` = the Skill's model
//       a2 no capability row                       -> reason 'lane' (the pre-AGT-143 answer)
//       a3 a capability row ON the judgment model, judgment_model() degraded -> 'fable_rest',
//          `from` = the capability's model (the degrade runs on the table's answer, not the Skill's)
//       a4 no capability_slug                      -> the assignments URL is NEVER fetched
//     Control: on origin/dev + AGT-142 alone a1 answers reason 'lane' (the row is never read).
// (b) LIVE: data-room-custody's assignment answers reason 'capability' with the live row's model.
// (c) LIVE: the migration file holds the proof raise and the trigger create, and the down captured
//     BEFORE apply (runner_migration_downs/agt143_sync_skills) names the trigger and the function.
//     DEVIATION from the kickoff: rpc/rule_enforcing_functions lists only functions whose COMMENT
//     cites an M-rule id; no governance rule governs this trigger, and ses-411 part G pins that RPC
//     to exactly one row -- so the captured down is the live evidence used instead.
// (d) LIVE coherence: each capability row equals its default Intent Skill's llm_model; each lane
//     row equals runner_model_lanes.
// (e) LIVE NO-ORPHAN INVARIANT: every `skill_profiles.llm_model` is a `model_assignments.model_id`,
//     so no Skill is stranded on a model no assignment row can switch work off. Absolute counts are
//     NOT pinned -- a switch is allowed to move them, and pinning them made this file red for the
//     mechanism working. Controlled both ways: a fixture beside (a), and live rows with one
//     assignment dropped, which must name exactly the model that drop stranded (SES-158).
//
// Live parts declare themselves NOT RUN without SUPABASE_URL + SUPABASE_SERVICE_KEY. Read-only.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIGRATION = path.join(ROOT, "docs/design/agt-143-sync-skills.sql");

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT = "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline) and re-run";

async function rows(query) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) throw new Error(`Supabase read ${query} failed: HTTP ${r.status}`);
  return r.json();
}

// Pure, exported, and the ONE function the offline fixture arm and the live (e) both go through --
// a second implementation agreeing with itself proves nothing (SES-45). Returns the sorted distinct
// `llm_model` values held by Skill rows that NO model_assignments row carries: the Skills a switch
// can no longer move, because nothing assigns their model. A NULL `llm_model` is carried as
// "<NULL>" rather than dropped -- a Skill with no model at all is stranded too, and silently
// filtering it out is the vacuous version of this check.
export function orphanModels(skillRows, assignRows) {
  const assigned = new Set(
    (Array.isArray(assignRows) ? assignRows : [])
      .map(a => (a == null ? undefined : a.model_id))
      .filter(m => typeof m === "string"));
  const held = new Set(
    (Array.isArray(skillRows) ? skillRows : [])
      .map(r => (r == null || r.llm_model == null ? "<NULL>" : r.llm_model)));
  return [...held].filter(m => !assigned.has(m)).sort();
}

async function run() {
  const { resolveJudgmentModel } = await import("../../scripts/agent-prompt.js");

  // -----------------------------------------------------------------------------------------------
  // (a) offline
  // -----------------------------------------------------------------------------------------------
  const HAIKU = "claude-haiku-4-5-20251001";
  const LANES = [
    { lane: "orchestrator", model_id: "claude-opus-5" },
    { lane: "judgment", model_id: "claude-fable-5-1" },
    { lane: "mechanical", model_id: "claude-sonnet-5" },
  ];
  const stub = (assignRows, rpcRows = [{ model_id: "claude-fable-5-1", reason: "lane" }]) => {
    const seen = [];
    const fetchImpl = async (url) => {
      const u = String(url);
      seen.push(u);
      const body = u.includes("/rest/v1/model_assignments") ? assignRows
        : u.includes("/rpc/judgment_model") ? rpcRows : LANES;
      return { ok: true, status: 200, json: async () => body };
    };
    return { fetchImpl, seen };
  };
  const OPTS = { supabaseUrl: "https://seam.example/", headers: { apikey: "seam" } };
  const assignSeen = (seen) => seen.some(u => u.includes("/rest/v1/model_assignments"));

  const s1 = stub([{ job_kind: "capability", job_key: "x", model_id: "claude-sonnet-4-6" }]);
  const a1 = await resolveJudgmentModel({ capability_slug: "x", llm: { model: HAIKU } }, { ...OPTS, fetchImpl: s1.fetchImpl });
  assert.deepStrictEqual(a1, { model: "claude-sonnet-4-6", reason: "capability", from: HAIKU },
    "a capability row must answer first and say so (reason 'capability', from = the Skill's model)");
  assert.ok(s1.seen.some(u => u.includes("job_kind=eq.capability") && u.includes("job_key=eq.x")),
    "the assignments read must filter on job_kind=capability and the slug");

  const s2 = stub([]);
  const a2 = await resolveJudgmentModel({ capability_slug: "y", llm: { model: HAIKU } }, { ...OPTS, fetchImpl: s2.fetchImpl });
  assert.deepStrictEqual(a2, { model: HAIKU, reason: "lane" }, "no capability row keeps the lane answer");
  assert.ok(assignSeen(s2.seen), "slug y must still have asked the table");

  const s3 = stub([{ job_kind: "capability", job_key: "z", model_id: "claude-fable-5-1" }],
    [{ model_id: "claude-opus-5", reason: "fable_rest" }]);
  const a3 = await resolveJudgmentModel({ capability_slug: "z", llm: { model: HAIKU } }, { ...OPTS, fetchImpl: s3.fetchImpl });
  assert.deepStrictEqual(a3, { model: "claude-opus-5", reason: "fable_rest", from: "claude-fable-5-1" },
    "the degrade must run on the capability's model, and `from` must name it");

  // A row for a DIFFERENT slug (a PostgREST filter ignored) must not be taken as this slug's answer.
  const s3b = stub([{ job_kind: "capability", job_key: "other", model_id: "claude-sonnet-4-6" }]);
  const a3b = await resolveJudgmentModel({ capability_slug: "w", llm: { model: HAIKU } }, { ...OPTS, fetchImpl: s3b.fetchImpl });
  assert.deepStrictEqual(a3b, { model: HAIKU, reason: "lane" }, "a row keyed to another slug must be ignored");

  const s4 = stub([{ job_kind: "capability", job_key: "x", model_id: "claude-sonnet-4-6" }]);
  const a4 = await resolveJudgmentModel({ llm: { model: HAIKU } }, { ...OPTS, fetchImpl: s4.fetchImpl });
  assert.deepStrictEqual(a4, { model: HAIKU, reason: "lane" });
  assert.ok(!assignSeen(s4.seen), "no capability_slug must never fetch model_assignments");

  const src = fs.readFileSync(path.join(ROOT, "scripts/agent-prompt.js"), "utf8");
  assert.ok(src.includes("`\\n# lane: judgment degraded to ${lane.model} (${lane.reason})`"),
    "the SES-395 degrade line must stay byte-identical");
  assert.ok(src.includes("`\\n# lane: capability assignment ${assembly.capability_slug} -> ${lane.model}`"),
    "the capability header line must be printed by main()");
  console.log("  (a) offline: capability / lane / degrade-on-capability / foreign-slug / no-slug -- PASS");

  // Offline, beside (a): the same matcher (e) runs on, over a fixture whose answer is non-empty.
  // (e) is green when live data is clean, so without this arm a matcher that ALWAYS answered []
  // would pass it (SES-158).
  assert.deepStrictEqual(
    orphanModels([{ llm_model: "claude-x" }, { llm_model: "claude-opus-5" }],
      [{ model_id: "claude-opus-5" }]),
    ["claude-x"],
    "orphanModels() must name a Skill model that no model_assignments row carries");
  console.log("  (a) offline: orphanModels() over a fixture -> [\"claude-x\"] -- PASS");

  if (!hasCreds()) {
    for (const p of ["(b) live capability answer", "(c) live migration evidence", "(d) coherence", "(e) the no-orphan invariant over live skill_profiles"]) {
      notRun(`AGT-143 ${p}`, CRED_HINT);
    }
    return;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  // (b)
  const [drc] = await rows("model_assignments?job_kind=eq.capability&job_key=eq.data-room-custody&select=model_id");
  assert.ok(drc?.model_id, "no model_assignments row for data-room-custody -- (b) would be vacuous");
  const b = await resolveJudgmentModel({ capability_slug: "data-room-custody", llm: { model: HAIKU } },
    { supabaseUrl: url, headers });
  assert.strictEqual(b.warning, undefined, `live read warned: ${b.warning}`);
  assert.strictEqual(b.reason, "capability", "the live capability row must answer");
  assert.strictEqual(b.model, drc.model_id);
  console.log(`  (b) LIVE: data-room-custody -> ${b.model} (capability) -- PASS`);

  // (c)
  const sql = fs.readFileSync(MIGRATION, "utf8");
  assert.ok(sql.includes("raise exception 'agt143-proof'"), "migration must hold the rolled-back proof");
  assert.ok(/create trigger trg_model_assignments_sync_skills\s+after insert or update of model_id on public\.model_assignments/.test(sql),
    "migration must create the trigger on model_assignments");
  const [down] = await rows("runner_migration_downs?up_name=eq.agt143_sync_skills&select=classification,down_sql");
  assert.ok(down, "no captured down for agt143_sync_skills -- captured before apply, per runner-cycle step 6");
  assert.strictEqual(down.classification, "auto-downable");
  assert.ok(down.down_sql.includes("drop trigger if exists trg_model_assignments_sync_skills on public.model_assignments"));
  assert.ok(down.down_sql.includes("public.model_assignments_sync_skills()"));
  console.log("  (c) LIVE: migration file + captured down (auto-downable, trigger + function) -- PASS");

  // (d)
  const assigns = await rows("model_assignments?select=job_kind,job_key,model_id");
  const lanes = await rows("runner_model_lanes?select=lane,model_id");
  const caps = assigns.filter(a => a.job_kind === "capability");
  assert.ok(caps.length > 0, "no capability rows -- the coherence check would be vacuous");
  for (const c of caps) {
    const [cap] = await rows(`capabilities?slug=eq.${encodeURIComponent(c.job_key)}&select=default_intent_slug`);
    const [sp] = await rows(`skill_profiles?slug=eq.${encodeURIComponent(cap.default_intent_slug)}&select=llm_model`);
    assert.strictEqual(sp.llm_model, c.model_id, `${c.job_key}: Skill ${cap.default_intent_slug} is on ${sp.llm_model}`);
  }
  const laneAssigns = assigns.filter(a => a.job_kind === "lane");
  assert.strictEqual(laneAssigns.length, lanes.length);
  for (const l of laneAssigns) {
    assert.strictEqual(lanes.find(x => x.lane === l.job_key)?.model_id, l.model_id, `lane ${l.job_key} mirror drift`);
  }
  console.log(`  (d) LIVE: ${caps.length} capability rows = their Skills, ${laneAssigns.length} lanes mirrored -- PASS`);

  // (e) NO-ORPHAN INVARIANT
  const skillRows = await rows("skill_profiles?select=llm_model");
  assert.ok(skillRows.length > 0,
    "public.skill_profiles returned no rows -- (e) would hold vacuously over an empty set");
  assert.deepStrictEqual(orphanModels(skillRows, assigns), [],
    `Skill rows are stranded by a switch: no model_assignments row carries ${JSON.stringify(orphanModels(skillRows, assigns))}, so nothing can move the Skills on it. AGT-143's whole premise is that the assignment table is where a model is chosen; a Skill model absent from it is unreachable by the switch.`);

  // SES-158 control on LIVE data, not a fixture: drop ONE real assignment and the same matcher must
  // name exactly the model that drop stranded (or [] when no Skill sits on it) -- the proof that the
  // [] above is the data's answer and not the matcher's only answer.
  const one = assigns[0].model_id;
  assert.deepStrictEqual(
    orphanModels(skillRows, assigns.filter(a => a.model_id !== one)),
    skillRows.some(r => r.llm_model === one) ? [one] : [],
    `dropping every assignment for ${one} must strand exactly the Skills on it`);

  const models = new Set(skillRows.map(r => (r.llm_model == null ? "<NULL>" : r.llm_model)));
  console.log(`  (e) LIVE: ${skillRows.length} Skills across ${models.size} models, 0 orphans -- PASS`);
}

export default run;
selfRun(import.meta.url, run);
