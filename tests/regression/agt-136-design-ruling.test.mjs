// DeepBench v7.0.696 | tests/regression/agt-136-design-ruling.test.mjs | AGT-136 slice 2 -- THE
// DESIGNER'S SECOND DESK: SHE RULES THE KNOWLEDGE ASKS RECORDED AGAINST HER, AND WRITES HER OWN LINE.
//
// THE SLICE-2 DEFECT, measured live 2026-09-28 on the unchanged tree: `runner_card_asks` held FOUR
// unanswered `skill-edit` asks -- three against the Designer's own fingerprints, one against
// `devmanager` -- and `(7d)` routed every one of them to John, who had answered none since
// 2026-09-25. A miss in the Designer's text is hers to fix (pattern:104 -- the correction routes back
// to the producing agent; pattern:7 -- it lands in the agent's own Skill content), so `--prepare` now
// carries her asks and a `yes` appends ONE sentence to `ds-knowledge-standard.method`. ANOTHER
// AGENT'S ASK IS NEVER OFFERED (Rule #1): the devmanager ask stays John's.
// Slice 2 also closed slice 1's DECLARED RESIDUE -- `RUNBOOK_NAMES_SCRIPT` is now `true` and arm D
// reads the runbook's `(7g)` block, paid for by bytes taken OUT of `(7d)` in the same commit.
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
  RULINGS, ASK_RULINGS, KNOWLEDGE_SLUG, KNOWLEDGE_LINE_MAX, JOHN_CALLS, NOTHING_OPEN,
  openQuestions, knowledgeAsks, buildTaskContext, validateRulings,
} from "../../scripts/design-ruling.js";
import { qidFor } from "../../scripts/decide-gated-card.js";
// The step-span reader's own home: the runbook's step parser, so `(7g) before (8) in step 9` is read
// off the same ordered step list ses-336 and the cycle card use, never off a line number.
import { parseSteps } from "../../scripts/render-cycle-card.js";
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
// SLICE 1's REPORTED RESIDUE, NOW CLEARED. Slice 1 declined task 5(b)'s runbook clause because the
// file was pinned to an exact byte count by four green tests and the kickoff's 370,419 B premise was
// ~10 KB stale; the ratchet below kept that gap loud instead of quiet. Slice 2 ships the clause as
// `(7g)` and pays for it the way the pin requires -- 483 B taken OUT of the `(7d)` block first, 462 B
// in, 380,971 -> 380,950 B -- with `BYTES_AT_SHIP` re-pinned in the SAME commit, which is the one
// home every other reader (agt-133, agt-138, ses-424f and this file) reads.
// READ FROM THAT ONE HOME, never as a literal here: AGT-166 s4 made this file a third copy of the
// number and it reddened the first time a later ticket legitimately spent a byte.
const CYCLE_BYTES_AT_SHIP = BYTES_AT_SHIP;   // 380950 since AGT-136 slice 2 (was 380862 at slice 1)
// The clause SHIPPED, so the ratchet now points the other way: this goes red the day somebody removes
// the runbook's only reference to the script, and red the day the pin and the file disagree.
const RUNBOOK_NAMES_SCRIPT = true;

const lf = t => String(t).replace(/\r\n/g, "\n");

// The text of one step, from its own marker to the next step's, so a needle found in step 4 cannot
// pass for one in step 9 (ses-378h's rule, ses-378f/g/h and agt-137's helper).
function stepSpan(md, label) {
  const lines = lf(md).split("\n");
  const steps = parseSteps(md);
  const i = steps.findIndex(x => x.label === label);
  assert.ok(i >= 0, `runner-cycle.md has no step **${label}.** marker`);
  const from = steps[i].line - 1;
  const to = i + 1 < steps.length ? steps[i + 1].line - 1 : lines.length;
  return lines.slice(from, to).join("\n");
}

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

  // THE SECOND DESK's fixture, shaped exactly as the two live rows are (measured 2026-09-28): an ask
  // carries the FINGERPRINT in `target_id` and no agent id at all, so which agent an ask belongs to
  // is answered by the staff findings under that fingerprint -- which is why one of the two below is
  // hers and the other is not.
  const ASK_ID = "f32cb25d-6d94-491d-8c5a-f541afed46c8";
  const DM_ASK_ID = "a91bda46-eeba-4a8a-8278-dc788ec76111";
  const RAW_ASKS = [
    { id: ASK_ID, target_id: "2fb97122c84a986b", question: "Skill edit proposed for designer: the same finding (verdict block attributable to the kickoff) ...", asked_at: "2026-09-25T19:21:21.094Z" },
    { id: DM_ASK_ID, target_id: "4a759c9ad927b189", question: "Skill edit proposed for devmanager: the same finding (assignment mismatch) ...", asked_at: "2026-09-27T04:12:59.407Z" },
  ];
  const FINDINGS = [
    { fingerprint: "2fb97122c84a986b", kind: "verdict block attributable to the kickoff", cycle_id: "11111111-1111-1111-1111-111111111111", detail: "verifier blocked on the kickoff: no lane declaration" },
    { fingerprint: "2fb97122c84a986b", kind: "verdict block attributable to the kickoff", cycle_id: "22222222-2222-2222-2222-222222222222", detail: "verifier blocked on the kickoff: no lane declaration" },
    { fingerprint: "2fb97122c84a986b", kind: "verdict block attributable to the kickoff", cycle_id: "33333333-3333-3333-3333-333333333333", detail: "a second wording of the same miss" },
  ];
  const METHOD_SENTENCE = "The design standard's own sentence, already in the row.";
  const METHOD = `A standard.\n${METHOD_SENTENCE}`;
  const ASKS = knowledgeAsks({ asks: RAW_ASKS, findings: FINDINGS });

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

    // --- THE SECOND DESK (slice 2) -------------------------------------------------------------
    assert.deepEqual(ASK_RULINGS, ["yes", "no"],
      "a Knowledge ask admits TWO words: `withdrawn` has no meaning (the staff finding is a measured " +
      "fact, not a premise that lapses) and `john` is refused -- her own Knowledge is hers (Rule #1)");
    assert.equal(KNOWLEDGE_SLUG, "ds-knowledge-standard",
      "the target is FIXED: an ask names a fingerprint, not a Skill row, so letting the answer choose " +
      "the row would let one ruling rewrite any Skill on the platform");
    assert.equal(KNOWLEDGE_LINE_MAX, 400, "and the line cap mirrors the stored schema's maxLength");

    // CONTROL FIRST, again: the well-formed ask ruling PASSES, so the four refusals below are the
    // validator discriminating rather than the validator refusing every ask.
    const goodAsk = validateRulings(
      { rulings: [{ ask_id: ASK_ID, ruling: "yes", reason: "the standard never said it",
                    knowledge_line: "Name the lane in the kickoff's own Section 1." }] },
      [], ASKS, METHOD);
    assert.ok(goodAsk.ok, `control: a well-formed ask ruling passes; got ${JSON.stringify(goodAsk.refusals)}`);
    const goodNo = validateRulings(
      { rulings: [{ ask_id: ASK_ID, ruling: "no", reason: "the standard already covers it" }] },
      [], ASKS, METHOD);
    assert.ok(goodNo.ok, `control: a no ruling needs no knowledge_line; got ${JSON.stringify(goodNo.refusals)}`);

    const noLine = validateRulings({ rulings: [{ ask_id: ASK_ID, ruling: "yes", reason: "ok" }] }, [], ASKS, METHOD);
    assert.ok(!noLine.ok && noLine.refusals.some(r => /needs a knowledge_line/.test(r)),
      `a yes without a knowledge_line must refuse -- the yes IS the line; got ${JSON.stringify(noLine.refusals)}`);

    const johnAsk = validateRulings({ rulings: [{ ask_id: ASK_ID, ruling: "john", reason: "his call" }] }, [], ASKS, METHOD);
    assert.ok(!johnAsk.ok, "a `john` ruling on an ASK must refuse -- that is the routing slice 2 ends");
    assert.ok(johnAsk.refusals.some(r => /is not one of yes, no/.test(r) && /your own Knowledge is yours/.test(r)),
      `and the refusal must say whose Knowledge it is; got ${JSON.stringify(johnAsk.refusals)}`);

    const bothIds = validateRulings(
      { rulings: [{ qid: QID, ask_id: ASK_ID, ruling: "no", reason: "ok" }] }, ctx, ASKS, METHOD);
    assert.ok(!bothIds.ok && bothIds.refusals.some(r => /BOTH a qid/.test(r) && /exactly one/.test(r)),
      `an element carrying both ids must refuse -- two desks, one element; got ${JSON.stringify(bothIds.refusals)}`);

    const already = validateRulings(
      { rulings: [{ ask_id: ASK_ID, ruling: "yes", reason: "ok", knowledge_line: METHOD_SENTENCE }] },
      [], ASKS, METHOD);
    assert.ok(!already.ok && already.refusals.some(r => /already in ds-knowledge-standard\.method/.test(r)),
      `a line the standard already carries must refuse -- it teaches nothing; got ${JSON.stringify(already.refusals)}`);

    // AND RULE #1 OFFLINE: the devmanager ask is not in the Designer's list, so ruling it refuses
    // before a byte leaves -- the same boundary the function enforces at the write.
    const notMine = validateRulings(
      { rulings: [{ ask_id: DM_ASK_ID, ruling: "yes", reason: "ok", knowledge_line: "A line." }] },
      [], ASKS, METHOD);
    assert.ok(!notMine.ok && notMine.refusals.some(r => /not one of the Knowledge asks recorded against you/.test(r)),
      `another agent's ask must refuse; got ${JSON.stringify(notMine.refusals)}`);
  });

  // --- B. the stubbed transport: exit 3, the pairing, one rpc call ------------------------------
  await arm("B stubbed transport", async () => {
    // (i) NOTHING OPEN -- exit 3, its own line, and NO assembly: the capabilities row is never
    // even read, so there is no Designer run and no cost. The stub proves it by 404ing anything
    // past the two board reads, which would surface as exit 1 rather than exit 3.
    // FIVE reads now, not two, and all five BEFORE the exit-3 decision: since slice 2 an ask
    // standing with nothing open is still a Designer run (Section 4), so a prepare that decided on
    // the question count alone would skip exactly the rows this ship exists to reach.
    await withStub({
      "runner_questions": [], "runner_items": [], "runner_card_asks": [],
      "runner_staff_findings": [], "skill_profiles": [{ method: METHOD }],
    }, async (base, seen) => {
      const r = await runScriptAsync(["--prepare"], { SUPABASE_URL: base, SUPABASE_SERVICE_KEY: "stub" });
      assert.equal(r.status, 3, `nothing open and no ask must exit 3; got ${r.status}: ${r.stderr}`);
      assert.ok(r.stderr.includes(NOTHING_OPEN), `and print its own line; got ${r.stderr}`);
      assert.equal(seen.length, 5, `and read exactly the five board tables; got ${seen.map(s => s.url).join(", ")}`);
      assert.ok(seen[0].url.startsWith("runner_questions?status=eq.open"),
        `the questions read is status=eq.open ordered by asked_at; got ${seen[0].url}`);
      assert.ok(/order=asked_at/.test(seen[0].url), `and ordered by asked_at; got ${seen[0].url}`);
      assert.ok(/runner_items\?kind=eq\.gated_before_build&decision=is\.null/.test(seen[1].url),
        `the cards read is the undecided gate cards; got ${seen[1].url}`);
      assert.ok(seen[2].url.startsWith("runner_card_asks?target_kind=eq.skill-edit&answer=is.null"),
        `the asks read is the UNANSWERED skill-edit asks; got ${seen[2].url}`);
      assert.ok(seen[3].url.startsWith("runner_staff_findings?agent_id=eq.designer"),
        `the findings read is the DESIGNER's, which is what makes an ask hers; got ${seen[3].url}`);
      assert.ok(seen[4].url.startsWith(`skill_profiles?slug=eq.${KNOWLEDGE_SLUG}&select=method`),
        `and the standard's own text is read so she can see whether her line is already there; got ${seen[4].url}`);
    });

    // (i-bis) THE EXIT-3 GATE IS BOTH LISTS, AND RULE #1 DECIDES WHICH ASKS COUNT. Two boards that
    // differ ONLY in whose ask is standing: hers makes a run, the devmanager's does not. Without the
    // second half this arm would pass against a prepare that offered every agent's ask.
    await withStub({
      "runner_questions": [], "runner_items": [], "runner_card_asks": RAW_ASKS,
      "runner_staff_findings": FINDINGS, "skill_profiles": [{ method: METHOD }],
      "capabilities": [],
    }, async (base, seen) => {
      const r = await runScriptAsync(["--prepare"], { SUPABASE_URL: base, SUPABASE_SERVICE_KEY: "stub" });
      assert.notEqual(r.status, 3,
        `a Knowledge ask standing with NOTHING open is still a run -- it must not exit 3; got ${r.stderr}`);
      assert.equal(r.status, 1, `it goes on to assemble and stops on the stub's empty capabilities row; got ${r.status}: ${r.stderr}`);
      assert.match(r.stderr, /has no capabilities row or no default_intent_slug/,
        "and the line it stops on proves it got PAST the exit-3 gate, not through it");
      assert.ok(seen.some(x => x.url.startsWith("capabilities?slug=eq.design-ruling")),
        `so the capability read was reached; got ${seen.map(x => x.url).join(", ")}`);
    });
    await withStub({
      "runner_questions": [], "runner_items": [], "runner_card_asks": [RAW_ASKS[1]],
      "runner_staff_findings": FINDINGS, "skill_profiles": [{ method: METHOD }],
    }, async (base, seen) => {
      const r = await runScriptAsync(["--prepare"], { SUPABASE_URL: base, SUPABASE_SERVICE_KEY: "stub" });
      assert.equal(r.status, 3,
        `the devmanager's ask is NOT hers (Rule #1), so that board is nothing to rule; got ${r.status}: ${r.stderr}`);
      assert.equal(seen.length, 5, `and it never assembled anything; got ${seen.map(x => x.url).join(", ")}`);
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

    // (ii-bis) THE CONTEXT CARRIES ONLY THE DESIGNER'S ASKS, with the evidence and the standard.
    // The full `--prepare --json` envelope is NOT asserted here and is not silently skipped
    // (pattern:77): rendering it needs the live prompt tables (capabilities, agents, the six Skill
    // rows), which this suite reaches only over PostgREST and which no stub stands in for. What the
    // envelope carries IS this object -- prepare writes `context: task_context` and nothing else --
    // so the claim is pinned here, and arm B(i-bis) pins that the transport reaches the assembly.
    const both = buildTaskContext({ questions: OPEN, cards: CARDS, asks: RAW_ASKS, findings: FINDINGS, method: METHOD });
    assert.deepEqual(both.knowledge_asks.map(a => a.ask_id), [ASK_ID],
      "ONE ask, hers: the devmanager ask names a fingerprint with no designer staff finding, so it " +
      "is never offered to her and waits for John (Rule #1)");
    assert.equal(both.knowledge_asks[0].fingerprint, "2fb97122c84a986b", "the ask arrives keyed on its fingerprint");
    assert.equal(both.knowledge_asks[0].cycles, 3,
      "with the number of DISTINCT cycles that saw it -- three rows written by one cycle is not a 3-cycle defect");
    assert.deepEqual(both.knowledge_asks[0].examples,
      ["verifier blocked on the kickoff: no lane declaration", "a second wording of the same miss"],
      "and the findings' own words, de-duplicated: the ask's question text is a summary of them");
    assert.equal(both.knowledge_method, METHOD,
      "and the standard's text rides along, so a line already in it can be refused before she writes it");
    // CONTROL: nothing open but her ask standing still builds a context -- the exit-3 half, pure.
    assert.ok(buildTaskContext({ questions: [], cards: [], asks: RAW_ASKS, findings: FINDINGS, method: METHOD }),
      "nothing open + one of her asks IS a run");
    assert.equal(buildTaskContext({ questions: [], cards: [], asks: [RAW_ASKS[1]], findings: FINDINGS, method: METHOD }), null,
      "nothing open + only another agent's ask is NOT");

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

      const intent = await get(`skill_profiles?slug=eq.${INTENT}&select=slug,skill_type_slug,max_tokens,traits,method`);
      assert.equal(intent.length, 1, "the Intent Skill exists");
      assert.equal(intent[0].skill_type_slug, "intent", "and it is an Intent (pattern:136 -- the type is named)");
      assert.equal(intent[0].max_tokens, 8000);
      const items = intent[0].traits.schema.properties.rulings.items;
      assert.deepEqual(items.properties.ruling.enum, RULINGS,
        "its stored schema answers the SAME four words the script validates -- one vocabulary, two readers");
      assert.deepEqual(items.required, ["ruling", "reason"],
        "SLICE 2: `qid` is no longer REQUIRED, because an element carries exactly one of qid or " +
        "ask_id -- the two desks in one array. `ruling` and `reason` are required on both");
      assert.equal(items.properties.ask_id.type, "string",
        "and the ask half has its key: without ask_id in the stored schema the Designer's answer is " +
        "validated against a schema that cannot express the ruling she was asked for");
      assert.equal(items.properties.knowledge_line.type, "string");
      assert.equal(items.properties.knowledge_line.maxLength, KNOWLEDGE_LINE_MAX,
        "and the line cap has ONE value, shared by the stored schema and the script");
      assert.ok(intent[0].method.includes("knowledge_asks") && intent[0].method.includes("knowledge_method"),
        "her method tells her the second desk exists and names both context keys -- an Intent whose " +
        "schema admits ask_id while its method never mentions it is a schema nobody was told about");
      assert.ok(/[Nn]ever john/.test(intent[0].method),
        "and that her own Knowledge is never John's call (Rule #1)");
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

    // THE RATCHET, NOW HOLDING THE SHIPPED CLAUSE. See the note at CYCLE_BYTES_AT_SHIP.
    const md = lf(fs.readFileSync(CYCLE_MD, "utf8"));
    const bytes = Buffer.byteLength(md, "utf8");
    assert.ok(bytes <= CYCLE_CEILING,
      `runner-cycle.md is ${bytes} B against SES-336's ${CYCLE_CEILING} B ceiling`);
    assert.equal(bytes, CYCLE_BYTES_AT_SHIP,
      `runner-cycle.md must read exactly the ${CYCLE_BYTES_AT_SHIP} B ses-413d's BYTES_AT_SHIP pins -- ` +
      "agt-133 / agt-138 / ses-424f read that same one home, so a byte spent without re-pinning it " +
      "in the SAME commit reddens four tests at once");
    assert.equal(md.includes("design-ruling.js"), RUNBOOK_NAMES_SCRIPT,
      "slice 2 ships task 5(b)'s clause: the runbook NAMES scripts/design-ruling.js, so a cycle " +
      "reading the runbook finds the Designer's desk without being told about it");
    // AND IT IS IN STEP 9's OWN SPAN, BEFORE (8) -- a `(7g)` anywhere else would satisfy a bare
    // substring match while leaving the chain's order wrong: the Designer rules in the run tail,
    // and (8)'s drain gate comes after her.
    const span9 = stepSpan(md, "9");
    const at7g = span9.indexOf("**(7g)");
    const at8 = span9.indexOf("**(8) A DRAINING CYCLE");
    assert.ok(at7g >= 0, "step 9's span must carry the **(7g) block");
    assert.ok(at8 >= 0, "and step 9's span must still carry (8)'s opener");
    assert.ok(at7g < at8, `**(7g) must come BEFORE **(8); got 7g at ${at7g} and 8 at ${at8}`);
    // The BLOCK, not the file: the paragraph that starts at `**(7g)` and ends at `**(8)`.
    const block7g = span9.slice(at7g, at8);
    assert.ok(block7g.includes("node scripts/design-ruling.js") && block7g.includes("--prepare"),
      "the (7g) block itself carries the prepare command, not just the label");
    assert.ok(block7g.includes("exit 3 = nothing open, no cost"),
      "with the no-cost exit stated where a cycle reads it");
    assert.ok(block7g.includes("--ai-type=design-ruling")
              && block7g.includes("design-ruling:ds-ruling-intent:depth1"),
      "and the AI-audit line, because a capability run nobody logs is a run the audit cannot see " +
      "(.claude/rules/capability-logging.md)");
    assert.ok(/Never gates/.test(block7g),
      "and it says it never gates -- the run tail reports, the chain ships");
    // CONTROL: the span reader is reading step 9 and not the whole file -- (7g) is NOT in step 8's.
    assert.ok(!stepSpan(md, "8").includes("**(7g)"),
      "control: step 8's span does not carry (7g), so the span reader is reading the step and not the file");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
  console.log(`[AGT-136] designer ruling desk: ${RULINGS.length} rulings, ${ASK_RULINGS.length} ask rulings, ` +
    `John's ${Object.keys(JOHN_CALLS).length} calls, ${LINKS.length} links with ${INTENT} at slot 4, ` +
    `designer at 2 capabilities, SERVICE_CATALOG carries ${CAPABILITY}; the Knowledge desk writes ` +
    `${KNOWLEDGE_SLUG} (<=${KNOWLEDGE_LINE_MAX} chars, 1 of 2 live asks hers); runner-cycle.md ` +
    `${CYCLE_BYTES_AT_SHIP} B of ${CYCLE_CEILING} -- (7g) SHIPPED, slice 1's residue cleared`);
}

export default run;
selfRun(import.meta.url, run);
