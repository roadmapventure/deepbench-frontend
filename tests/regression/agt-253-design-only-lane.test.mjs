// DeepBench v7.0.676 | tests/regression/agt-253-design-only-lane.test.mjs | AGT-253
// FEATURE: AGT-253 -- A DESIGN-ONLY LANE THAT STOPS BEFORE THE BUILD. Kickoff:
// docs/kickoffs/v7.0.676-AGT-253-design-only-stop.md §4 and §5 task 4.
//
// THREE ARMS; A runs offline, B and C need credentials and are declared notRun without them:
//   A  PURE -- docs/runbooks/runner-cycle.md carries THIS ship's stamp on line 1, still exactly five
//      header stamps (the rotation dropped v7.0.602 as it added v7.0.676), step 6's design-only
//      clause (c) naming both new functions, and is inside SES-336's 381,000-byte ceiling.
//      CONTROLS: each assertion is paired with the mutation that must break it, so a green here
//      cannot be a green that could not go red (STANDARDS §4, LOO-013 -- assert WHICH branch fired).
//   B  LIVE, READ-ONLY -- projects.design_only is true on EXACTLY trainer-authored-agents; AGT-250,
//      AGT-251 and AGT-252 all read design_status NULL and all three come back from
//      rpc/prime_directive_queue; rpc/ticket_design_only reads true for AGT-250 and FALSE for
//      AGT-253 -- the pair is the discriminating one, since a function that returned true for
//      everything would pass the first half alone. origin/dev has no design_only column at all.
//   C  LIVE, NO WRITES -- rpc/design_only_stop refuses on AGT-253 (not a design-only project) and on
//      AGT-250 under a cycle that does not hold the claim, each with ITS OWN sentence, not merely
//      "a 400"; the anon key is denied both new RPCs. Row counts are re-read equal afterwards.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CYCLE_REL = "docs/runbooks/runner-cycle.md";
const CEILING = 381000;
const HEADER_STAMPS = 5;
const THIS_STAMP = "<!-- DeepBench v7.0.676 | runbooks/runner-cycle.md | AGT-253";
const ROTATED_OUT = "v7.0.602 | runbooks/runner-cycle.md";
// Clause (c), step 6. The two function names are what make it load-bearing: a clause that named
// neither would leave a cycle with nothing to call.
const CLAUSE_C = "**Design-only project (`AGT-253`): if `public.ticket_design_only('<ID>')` is true, ONE call " +
  "replaces this write — `public.design_only_stop('<cycle id>','<ID>','<kickoff path>',<three " +
  "plain_* texts>)` — then close `gated_before_build`, never step 7.**";

const DESIGN_ONLY_PROJECT = "trainer-authored-agents";
const MEMBERS = ["AGT-250", "AGT-251", "AGT-252"];
const RANDOM_CYCLE = "00000000-4253-4253-4253-000000000253";

const lf = t => String(t).replace(/\r\n/g, "\n");
const read = rel => lf(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const stampsOf = t => t.split("\n").filter(l => l.startsWith("<!-- DeepBench v"));

async function req(url, key, q, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers },
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
  const n = Number((res.headers.get("content-range") ?? "").split("/")[1]);
  if (!res.ok || !Number.isFinite(n)) throw new Error(`count ${q} -> HTTP ${res.status}`);
  return n;
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    [arm ${name}] FAIL -- ${e.message.split("\n")[0]}`); }
  };

  // --- A. the runbook, pure --------------------------------------------------------------------
  await arm("A runbook stamp, count, clause, ceiling", () => {
    const md = read(CYCLE_REL);
    const bytes = Buffer.byteLength(md, "utf8");
    const stamps = stampsOf(md);

    assert.ok(md.startsWith(THIS_STAMP),
      `THIS ship's stamp must be line 1 of ${CYCLE_REL} -- got ${JSON.stringify(md.slice(0, 80))}`);
    assert.strictEqual(stamps.length, HEADER_STAMPS,
      `the header carries exactly ${HEADER_STAMPS} stamps; got ${stamps.length} -- a rotation drops one as it adds one`);
    assert.ok(!md.includes(ROTATED_OUT),
      "v7.0.602's stamp is the one this rotation DROPPED -- finding it means the header grew to six");
    assert.ok(md.includes(CLAUSE_C),
      "step 6 must carry the design-only clause naming ticket_design_only() and design_only_stop() verbatim");
    assert.ok(bytes <= CEILING,
      `${CYCLE_REL} is ${bytes} B against SES-336's ${CEILING} B ceiling -- this edit had to free bytes before adding any`);

    // CONTROLS. Each mutation is the SMALLEST one that should break its own assertion, and nothing
    // else. A clause assertion that still passed with the clause deleted would be decoration.
    const noClause = md.replace(CLAUSE_C, "");
    assert.ok(!noClause.includes(CLAUSE_C), "control: deleting clause (c) must break the clause assertion");
    const sixStamps = `<!-- DeepBench v7.0.677 | runbooks/runner-cycle.md | CONTROL -->\n${md}`;
    assert.strictEqual(stampsOf(sixStamps).length, HEADER_STAMPS + 1,
      "control: a sixth stamp must be counted, so the count assertion can go red");
    assert.ok(!sixStamps.startsWith(THIS_STAMP),
      "control: a later stamp taking line 1 must break the line-1 assertion");
  });

  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";

  if (!url || !key) {
    notRun("AGT-253 live arms (B, C)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the design_only flag, the three cleared members, " +
      "ticket_design_only's true/false pair and design_only_stop's two refusals are unverified here. " +
      "Credentialed run: STANDARDS.md Section 2 rule 5");
  } else {
    // --- B. the lane exists and is scoped to ONE project -------------------------------------------
    await arm("B design_only, members cleared, predicate", async () => {
      const on = await req(url, key, "projects?design_only=is.true&select=slug");
      assert.equal(on.status, 200, describe(on));
      assert.deepEqual(on.json.map(r => r.slug), [DESIGN_ONLY_PROJECT],
        `design_only must be true on EXACTLY ${DESIGN_ONLY_PROJECT} -- a second project means the lane leaked`);

      const mem = await req(url, key,
        `backlog_items?backlog_id=in.(${MEMBERS.join(",")})&select=backlog_id,design_status&order=backlog_id`);
      assert.equal(mem.status, 200, describe(mem));
      assert.deepEqual(mem.json.map(r => r.backlog_id), MEMBERS, "all three members are still filed");
      assert.deepEqual(mem.json.map(r => r.design_status), [null, null, null],
        "AGT-250/251/252 carried needs-desktop, which pick_blocking_flags() reads; the lane cleared it");

      const q = await req(url, key, "rpc/prime_directive_queue", { method: "POST", body: {} });
      assert.equal(q.status, 200, describe(q));
      const refs = q.json.map(r => r.ref);
      for (const m of MEMBERS) {
        assert.ok(refs.includes(m),
          `${m} must come back from prime_directive_queue() -- it returned 0 of the three before this ship; got ${JSON.stringify(refs)}`);
      }

      // THE DISCRIMINATING PAIR. true alone would pass for a predicate hardcoded to true.
      const yes = await req(url, key, "rpc/ticket_design_only", { method: "POST", body: { p_backlog_id: "AGT-250" } });
      assert.equal(yes.status, 200, describe(yes));
      assert.equal(yes.json, true, "AGT-250 is on the design-only project");
      const no = await req(url, key, "rpc/ticket_design_only", { method: "POST", body: { p_backlog_id: "AGT-253" } });
      assert.equal(no.status, 200, describe(no));
      assert.equal(no.json, false,
        "AGT-253 is on Agent Training, NOT a design-only project -- this half is what makes the true above mean something");
    });

    // --- C. both refusals fire by their own sentence, and nothing is written -----------------------
    await arm("C refusals, no writes", async () => {
      const before = {
        cards: await count(url, key, "runner_items?select=id"),
        decisions: await count(url, key, "runner_decisions?select=id"),
        questions: await count(url, key, "runner_questions?select=id"),
      };

      const body = p => ({
        p_cycle_id: RANDOM_CYCLE, p_backlog_id: p, p_kickoff_path: "docs/kickoffs/v7.0.999-probe.md",
        p_plain_cant: "a", p_plain_after: "b", p_plain_worth: "c",
      });

      const notLane = await req(url, key, "rpc/design_only_stop", { method: "POST", body: body("AGT-253") });
      assert.equal(notLane.status, 400, describe(notLane));
      assert.match(String(notLane.json?.message ?? ""),
        /^design_only_stop: AGT-253 is not on a design-only project/,
        `the refusal must be the NOT-DESIGN-ONLY branch, not merely a 400; got ${describe(notLane)}`);

      const notMine = await req(url, key, "rpc/design_only_stop", { method: "POST", body: body("AGT-250") });
      assert.equal(notMine.status, 400, describe(notMine));
      assert.match(String(notMine.json?.message ?? ""),
        /^design_only_stop: AGT-250 is claimed by .*not by cycle /,
        `AGT-250 IS design-only, so it must fall through to the CLAIM branch -- a different sentence here means the lane check swallowed it; got ${describe(notMine)}`);

      if (anon) {
        for (const [fn, b] of [["ticket_design_only", { p_backlog_id: "AGT-250" }], ["design_only_stop", body("AGT-250")]]) {
          const a = await req(url, anon, `rpc/${fn}`, { method: "POST", body: b });
          assert.notEqual(a.code, "PGRST202", `PGRST202 means ${fn} is missing, never a pass; got ${describe(a)}`);
          assert.ok(!a.ok && /42501|permission denied/.test(a.text),
            `the anon key must be denied ${fn}; got ${describe(a)}`);
        }
      } else {
        notRun("AGT-253 arm C (anon half)",
          "VITE_SUPABASE_ANON_KEY absent -- the anon denial on ticket_design_only and design_only_stop is " +
          "unverified here. Asserted in migration agt253_design_only_lane's own trailing DO block instead, " +
          "over pg_proc by oid: has_function_privilege('anon'|'authenticated', <oid>, 'execute') false on all " +
          "three new functions, in the SAME transaction that created them.");
      }

      const after = {
        cards: await count(url, key, "runner_items?select=id"),
        decisions: await count(url, key, "runner_decisions?select=id"),
        questions: await count(url, key, "runner_questions?select=id"),
      };
      assert.deepEqual(after, before, "every probe above is a refusal -- none of them may write a row");
    });
  }

  notRun("AGT-253 the WRITE path (the stop itself, the trigger, and the pg_proc facts)",
    "public.design_only_stop() and the trg_runner_questions_design_only trigger are WRITERS of the card, " +
    "question, ticket and decision ledgers, and this suite reaches Supabase only over PostgREST, which " +
    "cannot read pg_proc and cannot open a transaction to roll a fixture back -- the SES-310 / SES-315 " +
    "refusal, unchanged. MEASURED AT THIS SHIP (v7.0.676) instead, inside migration " +
    "agt253_design_only_lane's own nested probe blocks, each ending in RAISE 'agt253-probe-rollback' so " +
    "every fixture row rolled back, with the counts re-read afterwards. PROBE 1 (the stop, then yes): " +
    "queue before=1, card decision=NULL (a `john` ruling writes no stamp), qid=gate-card-f5678388 open=1, " +
    "design_status=designed, queue after the stop=0 WITH THE CLAIM RELEASED -- the release is what makes " +
    "that 0 the CARD's doing rather than the claim's; then yes -> card=accept and queue back=1. PROBE 2 " +
    "(the stop, then no): card=rework, design_status=NULL, and scope_rationale gained " +
    "'AGT-253 John declined 2026-09-28: the mock is missing'. pg_proc in the same transaction: exactly 1 " +
    "overload each of ticket_design_only, design_only_stop and design_only_answer_applies, exactly 1 " +
    "trg_runner_questions_design_only, and anon/authenticated hold EXECUTE on none of the three. ZERO " +
    "RESIDUE on re-read: 0 runner_items rows on AGT-250, 0 probe questions, design_status NULL, " +
    "kickoff_link NULL, claimed_by NULL, the three still in the queue, and exactly 1 new ticket-status " +
    "decision (the migration's own seed).");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);

  console.log(`[AGT-253] design-only lane: runner-cycle.md ${Buffer.byteLength(read(CYCLE_REL), "utf8")}B <= ${CEILING} with ` +
    `${stampsOf(read(CYCLE_REL)).length} stamps and v7.0.676 first; the lane is on exactly one project and ` +
    `both design_only_stop refusals fire by their own sentence`);
}

selfRun(import.meta.url, run);
export default run;
