// DeepBench v7.0.869 | tests/regression/agt-492-architect-review.test.mjs | AGT-492 -- the findings review
// moves from the Development Manager (GV-01) to the Governance Architect (GV-09) and gains John's tested
// step (decisions 27-29 of docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md, 2026-10-13; rule
// JOHN-1013-TESTED-TICKETS). Migration `agt492_architect_review`, repo mirror
// docs/design/agt-492-architect-review.sql.
//
// THREE ARMS, each discriminating -- every one FAILS on the tree before this ship:
//   A  OFFLINE (no credentials) -- scripts/audit-review.js validateReview() refuses a FILING root-cause
//      that carries no standard-B test, passes it with either a test or an untested_reason, and asks
//      neither of a group that reuses an open ticket. Pre-change: validateReview carries no such refusal,
//      so the first case returns [] and this arm reds.
//   B  LIVE (else NOT RUN) -- the migration's own seven gate arms re-read from outside the transaction
//      that wrote them, plus: ga-review-intent.method carries BOTH the copied carry rule
//      (/weeks_seen >= 3/) and the appended tested step (/standard B/); rpc apply_audit_review refuses an
//      untested filing root-cause with 400 P0001 naming `needs test` and writes nothing; AGT-284 carries
//      the RETARGET paragraph. Pre-change: the links are dm-*, the assignment is devmanager's, the
//      function hardcodes 'devmanager', and the rpc accepts the untested group.
//   C  PROMPT -- scripts/agent-prompt.js --agent=architect --capability=review-audit-worklist exits 0 and
//      prints THE TESTED STEP. Pre-change: the architect holds no such capability, so it exits non-zero.
//
// WHY THE RPC PROBE WRITES NOTHING, by construction rather than by cleanup (pattern:76). The probe's
// review covers only ONE of the live open/carried findings. apply_audit_review validates every group
// before section 2 ("Decision"), and inside that validation the standard-B refusal (offset 7917 of the
// shipped definition) raises BEFORE the coverage refusal (offset 10368), which is itself before the first
// write (offset 10415). So with the rule present the refusal NAMES `needs test`, and with the rule absent
// the call still refuses -- on coverage -- rather than filing a ticket. The arm re-reads the findings,
// decisions and backlog counts and asserts they are unchanged either way.

import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts/audit-review.js");
const PROMPT = path.join(ROOT, "scripts/agent-prompt.js");
const loadScript = () => import(pathToFileURL(SCRIPT).href);

const CAPABILITY = "review-audit-worklist";
const AGENT = "architect";
const INTENT = "ga-review-intent";
const LINKS = ["ga-identity", "ga-knowledge-review", "ga-behavior", INTENT, "ga-guardrails", "dm-knowledge-patterns"];
const RULE_NEW = "JOHN-1013-TESTED-TICKETS";
const RULE_OLD = "JOHN-0925-FINDINGS-STANDARD";
const REFUSAL = "root-cause needs test (reproduced, how, result) or untested_reason (standard B)";
const WEEK = "2026-W37";

// The offline worklist. Two findings, so a one-finding review is also short on coverage -- the same
// shape the live probe uses, for the same reason.
const W = [
  { id: "w1", fingerprint: "fp1", iso_week: "2026-W39", weeks_seen: 1 },
  { id: "w2", fingerprint: "fp2", iso_week: "2026-W39", weeks_seen: 1 },
];
const review = groups => ({ groups, summary_for_john: "qa", patterns_applied: [] });
const TEST_OK = { reproduced: true, how: "select count(*) from public.x", result: "0 rows -- the cause reproduced" };

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // --- A. offline: the script mirrors the function's refusal ---------------------------------------
  await arm("A offline", async () => {
    const { validateReview } = await loadScript();
    const refusalsOf = groups => validateReview(review(groups), W).refusals;
    const base = { kind: "root-cause", title: "t", root_cause: "rc", fix: "f", finding_ids: ["w1", "w2"] };

    // (1) A filing root-cause with no test and no untested_reason: exactly the function's refusal.
    assert.deepEqual(refusalsOf([{ ...base }]), [REFUSAL],
      "a filing root-cause carrying neither test nor untested_reason must raise exactly the standard-B refusal");

    // (2) It passes with a complete test, and with an untested_reason instead.
    assert.deepEqual(refusalsOf([{ ...base, test: TEST_OK }]), [],
      "a complete test {reproduced, how, result} satisfies standard B");
    assert.deepEqual(refusalsOf([{ ...base, untested_reason: "the fix cannot be exercised before the build" }]), [],
      "an untested_reason satisfies standard B in the test's place");

    // (3) A group that reuses an open ticket needs NEITHER -- the ticket it reuses was already tested.
    //     (Shaped so the only refusal left to see is the reuse row check, which this arm does not reach
    //     offline: validateReview does not read the backlog, so a reuse group here must be clean.)
    assert.deepEqual(refusalsOf([{ kind: "root-cause", reuse_backlog_id: "AGT-999", finding_ids: ["w1", "w2"] }]), [],
      "a reuse_backlog_id group needs neither a test nor an untested_reason");

    // (4) TEETH -- each half of the test object is load-bearing, and prior_art is never required.
    const half = [
      ["no reproduced", { how: "q", result: "r" }],
      ["reproduced not a boolean", { reproduced: "yes", how: "q", result: "r" }],
      ["blank how", { reproduced: true, how: "   ", result: "r" }],
      ["blank result", { reproduced: false, how: "q", result: "" }],
      ["test is an array", ["reproduced"]],
      ["test is a string", "reproduced"],
    ];
    for (const [why, t] of half) {
      assert.deepEqual(refusalsOf([{ ...base, test: t }]), [REFUSAL],
        `${why}: an incomplete test is not a test -- the refusal must still fire`);
    }
    assert.deepEqual(refusalsOf([{ ...base, test: TEST_OK, prior_art: "" }]), [],
      "prior_art is optional and never refused");
    // reproduced: false is a RULING, not an omission -- a cause that did not reproduce is still tested.
    assert.deepEqual(refusalsOf([{ ...base, test: { reproduced: false, how: "q", result: "did not reproduce" } }]), [],
      "reproduced: false with how and result is a tested group, not an untested one");
  });

  // --- B. live ------------------------------------------------------------------------------------
  if (!url || !key) {
    notRun("AGT-492 arm B (live rows, the rpc refusal, AGT-284)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the migration's gate arms cannot be re-read here");
  } else {
    const get = async q => {
      const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      const text = await res.text();
      if (!res.ok) throw new Error(`GET ${q} -> HTTP ${res.status} ${text.slice(0, 240)}`);
      return JSON.parse(text);
    };
    const count = async t => {
      const res = await fetch(`${url}/rest/v1/${t}?select=id`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
      });
      await res.text();
      return Number((res.headers.get("content-range") ?? "/0").split("/")[1]);
    };

    await arm("B live", async () => {
      // GATE 1 -- the six links, in display_order.
      const links = await get(`capability_skill_profiles?capability_slug=eq.${CAPABILITY}&select=skill_profile_slug,display_order,level,is_required&order=display_order`);
      assert.deepEqual(links.map(l => l.skill_profile_slug), LINKS,
        "five ga-* links plus the kept dm-knowledge-patterns at 6 (AGT-465: nothing was deleted)");
      assert.deepEqual(links.map(l => l.display_order), [1, 2, 3, 4, 5, 6], "display_order 1..6, unchanged");
      assert.ok(links.every(l => l.level === 2 && l.is_required === true), "level and is_required were untouched");

      // GATE 2 -- the assignment moved, and it moved rather than being added beside the old one.
      const ga = await get(`agent_capability_assignments?capability_slug=eq.${CAPABILITY}&agent_id=eq.${AGENT}&select=id`);
      const dm = await get(`agent_capability_assignments?capability_slug=eq.${CAPABILITY}&agent_id=eq.devmanager&select=id`);
      assert.equal(ga.length, 1, `the Governance Architect must hold ${CAPABILITY} exactly once; got ${ga.length}`);
      assert.equal(dm.length, 0, `the Development Manager must no longer hold ${CAPABILITY}; got ${dm.length}`);

      // GATE 7 -- the capability's default intent, and AGT-284's retarget.
      const [cap] = await get(`capabilities?slug=eq.${CAPABILITY}&select=default_intent_slug`);
      assert.equal(cap.default_intent_slug, INTENT,
        "agent-prompt.js falls back to this column, so a stale default silently assembles the old Intent");
      const [t284] = await get("backlog_items?backlog_id=eq.AGT-284&select=description");
      assert.ok(t284.description.includes("RETARGET (AGT-492"),
        "AGT-284 must carry the RETARGET paragraph naming this ticket");

      // GATE 5 -- the rule swap. The old row is KEPT, superseded, never deleted (pattern:166).
      const rules = await get(`governance_rules?id=in.(${RULE_NEW},${RULE_OLD})&select=id,status,superseded_by,enforcement,source_group`);
      const byId = new Map(rules.map(r => [r.id, r]));
      assert.equal(rules.length, 2, `both rule rows must exist; got ${rules.map(r => r.id).join(", ")}`);
      assert.equal(byId.get(RULE_NEW).status, "live", `${RULE_NEW} must be live`);
      assert.equal(byId.get(RULE_NEW).superseded_by, null, `${RULE_NEW} supersedes nothing yet`);
      assert.equal(byId.get(RULE_NEW).enforcement, "reviewer", `${RULE_NEW} enforcement reviewer`);
      assert.equal(byId.get(RULE_NEW).source_group, "claude-md-hard-rules", `${RULE_NEW} source group`);
      assert.equal(byId.get(RULE_OLD).status, "superseded", `${RULE_OLD} must read superseded, not removed`);
      assert.equal(byId.get(RULE_OLD).superseded_by, RULE_NEW, `${RULE_OLD}.superseded_by must name ${RULE_NEW}`);

      // GATE 6 -- the Intent's method: the copied text survived AND the tested step was appended.
      const [intent] = await get(`skill_profiles?slug=eq.${INTENT}&select=skill_type_slug,method,traits,llm_model`);
      assert.ok(intent, `no skill_profiles row ${INTENT}`);
      assert.equal(intent.skill_type_slug, "intent");
      assert.match(intent.method, /weeks_seen >= 3/,
        "the carry rule came across from the Intent this one replaces -- a method that lost it was rewritten, not copied");
      assert.match(intent.method, /standard B/, "the appended tested step must reach the method");
      assert.match(intent.method, /THE TESTED STEP/, "the PARA heading must reach the method");
      assert.doesNotMatch(intent.method, /Nathan Laan/,
        "the one substitution: no career agent is named in an agent's own row (Rule #1)");
      assert.deepEqual(intent.traits?.schema?.required, ["groups", "summary_for_john", "patterns_applied"],
        "the output contract's required keys are unchanged -- test and untested_reason are per-group, not top level");
      assert.equal(intent.traits?.can_request_help, false);
      const gp = intent.traits?.schema?.properties?.groups?.items?.properties ?? {};
      assert.deepEqual(gp.test?.required, ["reproduced", "how", "result"], "the test object's three required keys");
      assert.equal(gp.test?.properties?.reproduced?.type, "boolean", "reproduced is a boolean, never a string");
      assert.equal(gp.untested_reason?.type, "string", "untested_reason is a string property on the group");
      assert.equal(gp.prior_art?.type, "string", "prior_art is a string property on the group");
      assert.ok(gp.root_cause && gp.fix && gp.finding_ids,
        "the keys the old contract already carried are still there -- the three were ADDED, not a replacement");
      const [lane] = await get("runner_model_lanes?lane=eq.orchestrator&select=model_id");
      assert.equal(intent.llm_model, lane.model_id, "the Intent's llm_model is the orchestrator lane's");

      // The five ga-* rows exist, carry their type, and name no other agent in any text field.
      const gaRows = await get("skill_profiles?slug=like.ga-*&select=slug,skill_type_slug,objective,method,description,guardrails,traits");
      assert.deepEqual(gaRows.map(r => r.slug).sort(), [...LINKS.slice(0, 5)].sort(),
        "exactly the five ga-* rows this ship seeded");
      assert.deepEqual(gaRows.map(r => r.skill_type_slug).sort(),
        ["behavior", "guardrails", "identity", "intent", "knowledge"],
        "one row of each of the five Skill types");
      for (const r of gaRows) {
        const blob = JSON.stringify(r);
        for (const other of ["Development Manager", "devmanager", "Jerry Maguire", "Nathan Laan"]) {
          assert.ok(!blob.includes(other), `${r.slug} names "${other}" -- Rule #1, no agent row names another agent`);
        }
      }

      // GATE 3/4 are pg_proc reads, unreachable over PostgREST. What IS reachable is the behaviour they
      // guard, and it is stronger: the function refuses the untested group, and its ruler is whatever
      // the assignment says rather than a literal.
      const open = (await get("audit_findings?status=in.(open,carried)&select=id&order=id")).map(f => f.id);
      if (open.length < 2) {
        notRun("AGT-492 arm B (the rpc refusal)",
          `only ${open.length} open/carried finding(s) -- the probe needs at least two so that it is ALSO short on coverage`);
      } else {
        const before = {
          findings: await count("audit_findings"),
          decisions: await count("runner_decisions"),
          backlog: await count("backlog_items"),
        };
        const res = await fetch(`${url}/rest/v1/rpc/apply_audit_review`, {
          method: "POST",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            p_cycle_id: null, p_session_name: "agt-492-qa", p_week: WEEK,
            p_review: review([{ kind: "root-cause", title: "t", root_cause: "rc", fix: "f", finding_ids: [open[0]] }]),
          }),
        });
        const text = await res.text();
        let body = null; try { body = JSON.parse(text); } catch { /* not json */ }
        assert.equal(res.status, 400, `the rpc must refuse with 400; got HTTP ${res.status} ${text.slice(0, 240)}`);
        assert.equal(body?.code, "P0001", `a RAISE EXCEPTION surfaces as P0001; got ${body?.code} ${text.slice(0, 240)}`);
        assert.match(body?.message ?? "", /needs test/,
          `the refusal must name the missing test, not coverage; got ${JSON.stringify(body?.message)}`);
        assert.match(body?.message ?? "", /apply_audit_review: /, "the function's refusals carry its prefix");
        const after = {
          findings: await count("audit_findings"),
          decisions: await count("runner_decisions"),
          backlog: await count("backlog_items"),
        };
        assert.deepEqual(after, before, "a refused review writes nothing -- findings, decisions and backlog re-read equal");
      }
    });
  }

  // --- C. the prompt assembles from the new rows ---------------------------------------------------
  await arm("C prompt", async () => {
    const r = spawnSync(process.execPath, [PROMPT, `--agent=${AGENT}`, `--capability=${CAPABILITY}`],
      { cwd: ROOT, env: process.env, encoding: "utf8", timeout: 60000 });
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      notRun("AGT-492 arm C (the assembled prompt)",
        "agent-prompt.js reads the rows from Supabase and no credentials are present here");
      return;
    }
    assert.equal(r.status, 0,
      `agent-prompt.js --agent=${AGENT} --capability=${CAPABILITY} must exit 0; got ${r.status}: ${(r.stderr || "").slice(0, 400)}`);
    assert.match(r.stdout, new RegExp(`capability ${CAPABILITY}`), "the header must name the capability");
    assert.match(r.stdout, /=== INTENT ===/, "the Intent section must render");
    assert.match(r.stdout, /THE TESTED STEP/,
      "the tested step must REACH the prompt -- a method the assembler drops is a rule that does not exist");
    assert.match(r.stdout, /weeks_seen/, "the copied carry rule must reach the prompt too");
    assert.ok(!/Nathan Laan/.test(r.stdout), "no career agent is named in the assembled prompt (Rule #1)");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
  console.log(`  [AGT-492] ${CAPABILITY} is the Governance Architect's: ${LINKS.length} links (5 ga-* + the kept patterns row), ` +
    `${INTENT} carries the carry rule AND the tested step, ${RULE_OLD} superseded by ${RULE_NEW}, ` +
    `and an untested filing root-cause is refused by both scripts/audit-review.js and apply_audit_review().`);
}

selfRun(import.meta.url, run);
export default run;
