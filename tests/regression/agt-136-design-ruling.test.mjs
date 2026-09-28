// DeepBench v7.0.680 | tests/regression/agt-136-design-ruling.test.mjs | AGT-136 slice 1 -- THE
// DESIGNER GETS A RULING DESK, AND THE PARKING LOT GETS AN ADDRESSEE.
//
// THE DEFECT THIS PINS, measured live 2026-09-28 on the unchanged tree rather than recalled:
// `agent_capability_assignments` for `designer` held exactly ONE row (`design-kickoff`), which can
// rule nothing. `apply_gate_rulings()`'s `john` ruling opens a `gate-card-<id8>` row in
// `runner_questions` and leaves the card undecided, so the parking lot had ONE addressee -- John --
// with 21 rows sitting `open`, the oldest a gate-card question from 2026-09-24.
// `governance_rules:JOHN-0925-DESIGNER-DECIDES` (live, written 2026-09-26 08:24:24Z) makes those
// the Designer's calls: he keeps money, production (dev -> main), and hiring or switching an agent
// on. And `reverse_decision()`'s `k_allowed` omitted `runner_questions`, so a ruling written against
// that tree came back `restored=0, refused=1` while the call still reported itself `applied`.
//
// ARMS, each discriminating -- every one FAILS on origin/dev (no scripts/design-ruling.js at all,
// `designer` at ONE assignment, no `design-ruling` in SERVICE_CATALOG, no `runner_questions` in
// reverse_decision):
//   A  PURE -- the ruling vocabulary is the FOUR words the live CHECKs admit; JOHN_CALLS is THREE,
//      not the four decide-gated-card.js holds or the five audit-review.js holds; --apply with BOTH
//      ids exits 2; a `john` ruling naming a subject outside the three, and a free-text `answer`,
//      each REFUSE. Each refusal carries its positive control, so a validator that refused
//      everything would fail this arm rather than pass it.
//   B  STUBBED TRANSPORT (a local HTTP server standing in for PostgREST; no network, no model, no
//      spend) -- `--prepare` over a board with nothing open exits 3 with its own line and assembles
//      NO prompt; buildTaskContext() pairs a `gate-card-` question back to the card that opened it
//      and drops an answered one; `--apply` posts EXACTLY ONE request to rpc/apply_design_rulings
//      carrying the rulings, and exactly one of the two attribution ids.
//   C  LIVE, READ-ONLY (service key) -- the capability row, its SEVEN links with ds-ruling-intent
//      in ds-kickoff-intent's slot, and `designer` at TWO assignments. Nothing here writes.
//   D  PURE (docs) -- SERVICE_CATALOG carries `design-ruling`, and the RESIDUE RATCHET below.
//
// NOT RUN, DECLARED RATHER THAN SILENTLY SKIPPED (pattern:77): the `pg_proc` half of arm C --
// exactly one overload each of public.apply_design_rulings and public.reverse_decision, the
// unchanged identity list on the latter, and `'runner_questions'` inside its body. pg_proc and
// pg_get_functiondef are not reachable over PostgREST (SES-310's refusal, unchanged), and this
// suite reaches Supabase only that way. Migration `agt136_apply_design_rulings` asserts all four in
// a trailing DO block in the SAME transaction that wrote them, and they were re-read independently
// after it. MEASURED AT THIS SHIP (2026-09-28, v7.0.680): reverse_decision overloads = 1, identity
// `p_decision uuid, p_actor text, p_reason text, p_actor_cycle uuid` -- UNCHANGED, no parameter
// added or retyped (.claude/rules/supabase-function-signature.md), and its k_allowed now reads
// `, 'runner_questions' -- IN: AGT-136 -- a ruling's band; has updated_at.` immediately after the
// model_assignments entry; apply_design_rulings overloads = 1, identity
// `p_rulings jsonb, p_cycle_id uuid, p_session_name text`. The one line was applied to the LIVE
// pg_get_functiondef() rather than to a transcription of it, so no other line could move.
// ALSO NOT RUN: the WRITE path -- apply_design_rulings() answering a real question and
// reverse_decision() putting it back. That function is a WRITER of the live question board and the
// decision ledger, and a permanent regression test must never move those rows (the SES-196 /
// SES-218 / SES-275 refusal). Driven once at this ship instead, over the MCP, and quoted in the
// ship report.

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  RULINGS, JOHN_CALLS, NOTHING_OPEN, openQuestions, buildTaskContext, validateRulings,
} from "../../scripts/design-ruling.js";
import { qidFor } from "../../scripts/decide-gated-card.js";
import { SERVICE_CATALOG } from "../../shared/ai-patterns.js";
// The runbook's live size has ONE home (ses-413d's BYTES_AT_SHIP, checked against the file itself by
// ses-424f). The ratchet below reads it from there rather than carrying a third copy.
import { BYTES_AT_SHIP } from "./ses-413d-questions-scoreboard.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "design-ruling.js");
const CAPABILITY = "design-ruling";
const INTENT = "ds-ruling-intent";
// The six Skill rows the capability REUSES, plus its own Intent: seven links, and the Intent sits
// in ds-kickoff-intent's slot (display_order 4). Reuse is the point -- the Designer speaks in ONE
// voice across both her capabilities (pattern:13, pattern:17).
const LINKS = [
  "ds-identity", "ds-knowledge-standard", "ds-behavior", INTENT,
  "ds-knowledge-environment", "ds-guardrails", "ds-knowledge-patterns",
];

const CYCLE_MD = path.join(ROOT, "docs", "runbooks", "runner-cycle.md");
const CYCLE_CEILING = 381000;
// AGT-136's REPORTED RESIDUE, asserted as a ratchet rather than hidden (pattern:75 -- a gate's
// false green must be structurally impossible; pattern:77 -- name it, never silently skip it).
//
// Task 5(b) of the kickoff asks for a step-9 `(7f)` clause in docs/runbooks/runner-cycle.md naming
// this script. The kickoff was written at v7.0.611 and measured the file at 370,419 B against
// SES-336's 381,000 B ceiling -- roughly 10 KB of headroom. THAT FACT IS STALE AND WAS RE-MEASURED
// THIS SHIP: the file is 380,862 B, which is 138 B under the ceiling and, far more decisively,
// pinned to that EXACT byte count by FOUR tests that are green on this tree --
// ses-413d-questions-scoreboard.test.mjs exports `BYTES_AT_SHIP = 380862`, and
// agt-133-run-tail-review.test.mjs, agt-138-researcher-routine.test.mjs and
// ses-424f-executor-citations.test.mjs each assert the file is EXACTLY that. A one-byte edit
// reddens all four, and re-pinning them means editing four test files this kickoff does not name,
// one of which (agt-133) pins its constant precisely so that nobody lowers it on purpose.
// The runbook ALSO already carries a `(7f)` -- AGT-133's "The Development Manager rules (7e)'s
// findings" -- so the kickoff's label collides with a shipped one.
// SO THE CLAUSE DID NOT SHIP, and the kickoff's own sentence is why that is survivable: "the
// authority lives in `governance_rules`, not prose" (JOHN-0925-DESIGNER-DECIDES is live and is what
// a fire reads). The ratchet below makes the gap VISIBLE instead of silent: this test goes red the
// day somebody adds the clause without re-pinning, and red the day the pin moves without the
// clause. Clearing it is a runbook-bytes ticket, not a line slipped into an unrelated ship.
// AGT-166 s4 (v7.0.687): this WAS a literal 380862, which made this file a THIRD home for the
// runbook's live size and reddened it the first time a later ticket legitimately spent a byte (s4 adds
// 74 B to step 6's rule (1): a judged refusal writes `status = 'removal proposed'`). The ratchet this
// arm exists to hold is the one on the NEXT line -- `RUNBOOK_NAMES_SCRIPT`, the clause that did not
// ship -- and that ratchet works against the declared pin just as well. Read from the one home.
const CYCLE_BYTES_AT_SHIP = BYTES_AT_SHIP;   // 380862 at AGT-136, 380936 since AGT-166 s4
const RUNBOOK_NAMES_SCRIPT = false;

const lf = t => String(t).replace(/\r\n/g, "\n");

// --- the stubbed transport ------------------------------------------------------------------
// A real HTTP server on localhost standing in for PostgREST: the script's own fetch() runs
// unmodified, so this exercises the actual doors rather than a re-implementation of them.
async function withStub(routes, fn) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => {
      const url = req.url.replace(/^\/rest\/v1\//, "");
      seen.push({ method: req.method, url, body: body ? JSON.parse(body) : null });
      const key = Object.keys(routes).find(k => url.startsWith(k));
      res.writeHead(key ? 200 : 404, { "Content-Type": "application/json" });
      res.end(JSON.stringify(key ? routes[key] : { message: `stub has no route for ${url}` }));
    });
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { return await fn(base, seen); }
  finally { await new Promise(r => server.close(r)); }
}

// SYNCHRONOUS ONLY WHERE THE STUB IS NOT RUNNING. spawnSync blocks this process's event loop, so
// a child that fetches the in-process stub server would deadlock: the parent can never accept the
// connection it is waiting on. Every call made against withStub() uses runScriptAsync below.
function runScript(args, env) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

function runScriptAsync(args, env) {
  return new Promise(resolve => {
    const c = spawn(process.execPath, [SCRIPT, ...args], { env: { ...process.env, ...env } });
    let stdout = "", stderr = "";
    c.stdout.on("data", d => { stdout += d; });
    c.stderr.on("data", d => { stderr += d; });
    c.on("close", status => resolve({ status, stdout, stderr }));
  });
}

function tmp(name, value) {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "agt136-")), name);
  fs.writeFileSync(p, JSON.stringify(value), "utf8");
  return p;
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  const QID = qidFor("2d5441c7-5133-4b21-9768-7921dce0c409");
  const OPEN = [
    { qid: QID, question: "may a person undo a hire?", context: "c", asked_at: "2026-09-24T22:03:36Z", status: "open" },
    { qid: "ses-999-shape", question: "which shape?", context: null, asked_at: "2026-09-25T00:00:00Z", status: "open" },
    { qid: "already-answered", question: "old", context: null, asked_at: "2026-09-01T00:00:00Z", status: "answered" },
  ];
  const CARDS = [
    { id: "2d5441c7-5133-4b21-9768-7921dce0c409", kind: "gated_before_build", decision: null, title: "Should a person be able to undo a hire?", backlog_id: "SES-364" },
    { id: "eeeeeeee-0000-0000-0000-00000000000e", kind: "gated_before_build", decision: null, title: "unrelated", backlog_id: null },
  ];

  // --- A. the vocabulary, the three calls, the exits, the two refusals -------------------------
  await arm("A vocabulary and refusals", () => {
    assert.deepEqual(RULINGS, ["yes", "no", "withdrawn", "john"],
      "the ruling vocabulary is read off the LIVE CHECKs -- runner_questions.answer admits only " +
      "('yes','no') and status only ('open','answered','withdrawn'); free text goes to answer_note");
    assert.deepEqual(Object.keys(JOHN_CALLS), ["money", "production", "agents"],
      "THREE calls, not four and not five: governance_rules:JOHN-0925-DESIGNER-DECIDES leaves John " +
      "money, dev->main and hiring/switching agents on, and makes every other subject the " +
      "Designer's. decide-gated-card.js's JOHN_CALLS holds FOUR and audit-review.js's holds FIVE -- " +
      "both predate that rule and are a FINDING TO FILE, not an edit this ship makes (its stop line)");

    // BOTH IDS IS EXIT 2, never a silent preference for one: ck_before_image_attribution admits
    // exactly one, and a caller that passed both does not know which attribution it asked for.
    const both = runScript([
      "--apply=/nonexistent.json", "--context=/nonexistent.json",
      "--cycle-id=3dd32ab7-762d-49ab-9e5e-65d2840bbe69", "--session-name=agt-136-qa",
    ], { SUPABASE_URL: "", SUPABASE_SERVICE_KEY: "" });
    assert.equal(both.status, 2, `--apply with BOTH ids must exit 2; got ${both.status}: ${both.stderr}`);
    assert.match(both.stderr, /exactly one of --cycle-id/, "and it must say which pair it refused");

    const ctx = [{ qid: QID }, { qid: "ses-999-shape" }];
    // CONTROL FIRST: the well-formed answer passes, so the two refusals below are the validator
    // discriminating and not the validator refusing everything.
    const good = validateRulings({ rulings: [
      { qid: QID, ruling: "john", reason: "this is a hiring call", john_call: "agents" },
      { qid: "ses-999-shape", ruling: "no", reason: "the premise changed; filed generally" },
    ] }, ctx);
    assert.ok(good.ok, `control: a well-formed answer passes; got ${JSON.stringify(good.refusals)}`);

    const badCall = validateRulings({ rulings: [
      { qid: QID, ruling: "john", reason: "kicking it upstairs", john_call: "rules" },
      { qid: "ses-999-shape", ruling: "no", reason: "ok" },
    ] }, ctx);
    assert.ok(!badCall.ok, "a `john` ruling naming a subject outside the three must refuse");
    assert.ok(badCall.refusals.some(r => /john_call/.test(r) && /money, production, agents/.test(r)),
      `and the refusal must name the three; got ${JSON.stringify(badCall.refusals)}`);

    const freeText = validateRulings({ rulings: [
      { qid: QID, ruling: "yes", reason: "ok", answer: "yes, but only for a named person" },
      { qid: "ses-999-shape", ruling: "no", reason: "ok" },
    ] }, ctx);
    assert.ok(!freeText.ok, "a free-text `answer` must refuse OFFLINE -- runner_questions_answer_check " +
      "admits only yes/no, so a sentence there reaches the database as a 23514 AFTER the decision row is written");
    assert.ok(freeText.refusals.some(r => /free-text answer/.test(r) && /answer_note/.test(r)),
      `and the refusal must send the words to reason/answer_note; got ${JSON.stringify(freeText.refusals)}`);

    // COVERAGE: a question left out is a question that stays open -- the parking lot this ticket drains.
    const missed = validateRulings({ rulings: [{ qid: QID, ruling: "yes", reason: "ok" }] }, ctx);
    assert.ok(!missed.ok && missed.refusals.some(r => /ses-999-shape not covered/.test(r)),
      `an uncovered question must refuse; got ${JSON.stringify(missed.refusals)}`);
  });

  // --- B. the stubbed transport: exit 3, the pairing, one rpc call ------------------------------
  await arm("B stubbed transport", async () => {
    // (i) NOTHING OPEN -- exit 3, its own line, and NO assembly: the capabilities row is never
    // even read, so there is no Designer run and no cost. The stub proves it by 404ing anything
    // past the two board reads, which would surface as exit 1 rather than exit 3.
    await withStub({ "runner_questions": [], "runner_items": [] }, async (base, seen) => {
      const r = await runScriptAsync(["--prepare"], { SUPABASE_URL: base, SUPABASE_SERVICE_KEY: "stub" });
      assert.equal(r.status, 3, `nothing open must exit 3; got ${r.status}: ${r.stderr}`);
      assert.ok(r.stderr.includes(NOTHING_OPEN), `and print its own line; got ${r.stderr}`);
      assert.equal(seen.length, 2, `and read exactly the two board tables; got ${seen.map(s => s.url).join(", ")}`);
      assert.ok(seen[0].url.startsWith("runner_questions?status=eq.open"),
        `the questions read is status=eq.open ordered by asked_at; got ${seen[0].url}`);
      assert.ok(/order=asked_at/.test(seen[0].url), `and ordered by asked_at; got ${seen[0].url}`);
      assert.ok(/runner_items\?kind=eq\.gated_before_build&decision=is\.null/.test(seen[1].url),
        `the cards read is the undecided gate cards; got ${seen[1].url}`);
    });

    // (ii) THE PAIRING, pure. A question a gate ruling opened arrives WITH the card it is about --
    // that card IS the evidence the ruling has to be made on -- and an answered question is not
    // rulable. Both directions, because "everything is paired" and "nothing is paired" each pass
    // a one-sided assertion.
    assert.equal(openQuestions(OPEN).length, 2, "an answered question is not open");
    const ctx = buildTaskContext({ questions: OPEN, cards: CARDS });
    assert.equal(ctx.questions.length, 2, "the context carries the open questions only");
    const paired = ctx.questions.find(q => q.qid === QID);
    assert.ok(paired.card && paired.card.card_id === CARDS[0].id,
      "the gate-card question is paired back to the card that opened it, through qidFor()");
    assert.equal(paired.card.backlog_id, "SES-364", "and the card brings its ticket with it");
    assert.equal(ctx.questions.find(q => q.qid === "ses-999-shape").card, null,
      "a question no card opened is carried with card = null, not dropped and not mispaired");
    assert.deepEqual(Object.keys(ctx.john_calls), ["money", "production", "agents"],
      "and the Designer is told which three are not hers, verbatim");
    assert.equal(buildTaskContext({ questions: [OPEN[2]], cards: CARDS }), null,
      "a board with nothing open builds no context at all -- this is what exit 3 reads");

    // (iii) --apply POSTS ONE RPC CALL AND WRITES NO TABLE ITSELF. The function owns the write,
    // its before-images and its one decision (Section 19v).
    const answer = tmp("answer.json", {
      rulings: [{ qid: QID, ruling: "no", reason: "nobody may; filed generally" }],
      patterns_applied: [10, 92],
    });
    const context = tmp("context.json", { questions: [{ qid: QID }] });
    await withStub({
      "rpc/apply_design_rulings": { decision_id: "11111111-2222-3333-4444-555555555555", answered: 1, withdrawn: 0, pushed_to_john: 0, questions: [] },
      "runner_decisions": [{ expires_at: "2026-10-01T00:00:00Z" }],
    }, async (base, seen) => {
      const r = await runScriptAsync([`--apply=${answer}`, `--context=${context}`, "--cycle-id=3dd32ab7-762d-49ab-9e5e-65d2840bbe69"],
        { SUPABASE_URL: base, SUPABASE_SERVICE_KEY: "stub" });
      assert.equal(r.status, 0, `--apply must exit 0; got ${r.status}: ${r.stderr}`);
      const rpc = seen.filter(s => s.url.startsWith("rpc/"));
      assert.equal(rpc.length, 1, `exactly ONE rpc call; got ${rpc.map(s => s.url).join(", ")}`);
      assert.equal(rpc[0].url.split("?")[0], "rpc/apply_design_rulings", "and it is apply_design_rulings");
      assert.equal(rpc[0].method, "POST");
      assert.equal(rpc[0].body.p_rulings.length, 1, "carrying the ruling");
      assert.deepEqual(rpc[0].body.p_rulings[0].patterns_applied, [10, 92],
        "with the answer's patterns attached to each ruling, where the decision trigger parses them");
      assert.equal(rpc[0].body.p_session_name, null, "exactly one attribution id: the cycle");
      assert.equal(rpc[0].body.p_cycle_id, "3dd32ab7-762d-49ab-9e5e-65d2840bbe69");
      // CONTROL: no PATCH, no POST to any table -- this file writes nothing itself.
      assert.ok(!seen.some(s => s.method === "PATCH" || (s.method === "POST" && !s.url.startsWith("rpc/"))),
        `the script writes no table itself; saw ${seen.map(s => `${s.method} ${s.url}`).join(", ")}`);
      assert.match(r.stdout, /reverse_decision\('11111111-2222-3333-4444-555555555555'/,
        "and it prints the undo line -- ONE line, because runner_questions is now on k_allowed and " +
        "there is no surviving-evidence half to re-file (decide-gated-card.js prints two)");
    });

    // A REFUSED ANSWER SENDS NOTHING. The validator runs before the first byte leaves.
    const badAnswer = tmp("bad.json", { rulings: [{ qid: QID, ruling: "maybe", reason: "x" }] });
    await withStub({ "rpc/apply_design_rulings": {} }, async (base, seen) => {
      const r = await runScriptAsync([`--apply=${badAnswer}`, `--context=${context}`, "--cycle-id=3dd32ab7-762d-49ab-9e5e-65d2840bbe69"],
        { SUPABASE_URL: base, SUPABASE_SERVICE_KEY: "stub" });
      assert.equal(r.status, 1, `a refused answer exits 1; got ${r.status}`);
      assert.equal(seen.length, 0, `and sends NOTHING; saw ${seen.map(s => s.url).join(", ")}`);
    });
  });

  // --- C. live, read-only: the installed rows ----------------------------------------------------
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("agt-136 arm C -- the live capability row, its seven links and `designer` at two " +
      "assignments: SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured at this ship (2026-09-28, " +
      "v7.0.680): capabilities `design-ruling` tenant global, display_phrase 'ruling the open " +
      "product calls', default_intent_slug ds-ruling-intent; 7 links, ds-ruling-intent at " +
      "display_order 4; agent_capability_assignments for designer = design-kickoff, design-ruling.");
  } else {
    await arm("C live rows", async () => {
      const get = async q => {
        const res = await fetch(`${url}/rest/v1/${q}`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        const text = await res.text();
        assert.ok(res.ok, `${q} returned HTTP ${res.status} ${text}`);
        return JSON.parse(text);
      };
      const caps = await get(`capabilities?slug=eq.${CAPABILITY}&tenant_id=eq.global&select=slug,name,execution_type,display_phrase,default_intent_slug`);
      assert.equal(caps.length, 1, "exactly one design-ruling capability row, tenant global");
      assert.equal(caps[0].default_intent_slug, INTENT, "pointing at its own Intent Skill");
      assert.equal(caps[0].display_phrase, "ruling the open product calls");
      assert.equal(caps[0].execution_type, "ai");

      const links = await get(`capability_skill_profiles?capability_slug=eq.${CAPABILITY}&select=skill_profile_slug,display_order&order=display_order`);
      assert.deepEqual(links.map(l => l.skill_profile_slug), LINKS,
        "SEVEN links, design-kickoff's profile with ds-ruling-intent in ds-kickoff-intent's slot");
      assert.equal(links[3].display_order, 4, "and that slot is display_order 4");

      const mine = await get("agent_capability_assignments?agent_id=eq.designer&select=capability_slug&order=capability_slug");
      assert.deepEqual(mine.map(a => a.capability_slug), ["design-kickoff", "design-ruling"],
        "the Designer holds TWO capabilities -- one (design-kickoff alone) is the defect: she could rule nothing");

      const intent = await get(`skill_profiles?slug=eq.${INTENT}&select=slug,skill_type_slug,max_tokens,traits`);
      assert.equal(intent.length, 1, "the Intent Skill exists");
      assert.equal(intent[0].skill_type_slug, "intent", "and it is an Intent (pattern:136 -- the type is named)");
      assert.equal(intent[0].max_tokens, 8000);
      const items = intent[0].traits.schema.properties.rulings.items;
      assert.deepEqual(items.properties.ruling.enum, RULINGS,
        "its stored schema answers the SAME four words the script validates -- one vocabulary, two readers");
      assert.deepEqual(items.required, ["qid", "ruling", "reason"],
        "keyed on qid, not dm-gate-intent's card_id");
      assert.deepEqual(items.properties.john_call.enum, Object.keys(JOHN_CALLS),
        "and john_call is the three");
      assert.ok(!Object.prototype.hasOwnProperty.call(items.properties, "card_id"),
        "the card_id it was mirrored from is gone -- a question is not a card");
    });
  }

  // --- D. the catalog, and the residue ratchet ---------------------------------------------------
  await arm("D catalog and residue", () => {
    const entry = SERVICE_CATALOG.find(s => s.slug === CAPABILITY);
    assert.ok(entry, "SERVICE_CATALOG carries `design-ruling` -- scripts/agent-log.js:227 refuses " +
      "any --ai-type this array lacks, so without it the one Layer-3 row per ruling run is refused " +
      "and the call goes unlogged (SES-338; .claude/rules/capability-logging.md)");
    assert.equal(entry.serviceType, "ai");
    assert.deepEqual(entry.patterns, ["Structured Output", "LLM-as-Judge / Verifier"],
      "decide-gated-card's patterns, for decide-gated-card's reasons");
    assert.equal(entry.name, "Design Ruling (The Designer)");

    // THE RESIDUE RATCHET. See the long note at CYCLE_BYTES_AT_SHIP: the kickoff's task 5(b)
    // runbook clause did NOT ship, because the file is pinned to an exact byte count by four
    // currently-green tests and the kickoff's 370,419 B premise was stale by ~10 KB.
    const md = lf(fs.readFileSync(CYCLE_MD, "utf8"));
    const bytes = Buffer.byteLength(md, "utf8");
    assert.ok(bytes <= CYCLE_CEILING,
      `runner-cycle.md is ${bytes} B against SES-336's ${CYCLE_CEILING} B ceiling`);
    assert.equal(bytes, CYCLE_BYTES_AT_SHIP,
      `runner-cycle.md must still be ${CYCLE_BYTES_AT_SHIP} B: this ship spends ZERO runbook bytes, ` +
      "and ses-413d's BYTES_AT_SHIP plus agt-133 / agt-138 / ses-424f all pin this exact number");
    assert.equal(md.includes("design-ruling.js"), RUNBOOK_NAMES_SCRIPT,
      RUNBOOK_NAMES_SCRIPT
        ? "the runbook names the script"
        : "DECLARED RESIDUE (AGT-136 task 5b): the runbook does NOT yet name scripts/design-ruling.js. " +
          "Adding the clause moves the byte count and reddens four green tests whose pins this " +
          "kickoff does not name. The authority for the ruling lives in " +
          "governance_rules:JOHN-0925-DESIGNER-DECIDES, not in this prose -- the kickoff says so " +
          "itself. When the clause ships, flip RUNBOOK_NAMES_SCRIPT and re-pin all five constants " +
          "in the SAME commit; until then this assertion is what keeps the gap from going quiet");
    // CONTROL: the needle matcher works, so the equality above is the file's state and not a
    // broken probe.
    assert.ok(`${md}\nnode scripts/design-ruling.js --prepare`.includes("design-ruling.js"),
      "control: the matcher finds the script name when it IS present");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
  console.log(`[AGT-136] designer ruling desk: ${RULINGS.length} rulings, John's ${Object.keys(JOHN_CALLS).length} calls, ` +
    `${LINKS.length} links with ${INTENT} at slot 4, designer at 2 capabilities, SERVICE_CATALOG carries ${CAPABILITY}; ` +
    `runner-cycle.md ${CYCLE_BYTES_AT_SHIP} B of ${CYCLE_CEILING} -- task 5b's clause REPORTED as residue, not shipped`);
}

export default run;
selfRun(import.meta.url, run);
