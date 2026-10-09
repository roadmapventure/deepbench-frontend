// DeepBench v7.0.828 | tests/regression/agt-281-victoria-runs.test.mjs | AGT-432 -- John's rulings are candidates, a john: need_source is never replaced, the block is John's VICTORIA-PRIORITIZE prompt (directive 0078af4d).
// DeepBench v7.0.778 | tests/regression/agt-281-victoria-runs.test.mjs | AGT-304 slice 3 -- re-pin arm F twice: requirement-check now binds a third Intent, vc-process-break-class (AGT-309 v7.0.743, agent-row decision 54d80a6a), and the AGT-281 agent-row decision is pinned by id e2c0d503 rather than newest-first, which SES-114's act 9ee2fe9b now wins; nothing weakened.
// DeepBench v7.0.741 | tests/regression/agt-281-victoria-runs.test.mjs | AGT-281 -- THE LIST TURN:
// the door AGT-280 slice 2 built rules one ticket at a time, and this is the guard on the one that
// rules a whole list.
//
// THE DEFECT, measured live 2026-10-02 on the unchanged tree. `requirement-check` carried exactly ONE
// intent (`vc-requirement-intent`, one named ticket against one named citation), Victoria's
// `ai_activity_log` rows were 0, `runner_cycles notes like 'SCHEDULED-AGENT: victoria%'` was 0, there
// was no `/victoria` loader and no runbook anywhere, and `need_source` was NULL on all 84 open/partial
// tickets of `dev-mgr-findings` (77) and `auditor-findings` (7). So the gate had a door nobody had
// walked through, and walking it ticket by ticket is 84 turns.
//
// ARMS.
//   A  OFFLINE, zero network: the §4 constants by value; `runLine()` against §6.1's own expected
//      notes string; `validateListVerdict()` accepting §6.1's answer and refusing every case §6.2
//      names -- a stranger ticket, a missing ticket, a source that is not a candidate, `need_score`
//      0 / 6 / "4", a blank reason -- each refusal NAMING the ticket. Then two DOORS with
//      SUPABASE_URL / SUPABASE_SERVICE_KEY DELETED from the child's environment: a held list exits 1
//      before any read, and a refused `--apply-list` exits 1 having sent nothing (exit 2 there would
//      be a credential failure wearing a refusal's clothes). AGT-432 re-pinned this arm to an EMPTY
//      `EXCLUDED_KINDS`, `CANDIDATE_FILTER` and the fifth head column, and added the `ctxJ` case: a
//      `pass` may not replace an existing `john:` need_source, and echoing it passes.
//   B  THE TWO CROSS-FILE STRINGS, which are the ones that can rot silently. `PROPOSED_STATUS` here
//      must still be the literal `scripts/ticket-owner.js` writes (it is not exported there, so this
//      arm reads that file), and `VICTORIA_PREFIX` in the brief must still equal `LIST_PREFIX` in the
//      caller -- otherwise the brief's group goes quietly empty while both files look right.
//   C  THE ROUTINE BLOCK (§6.3): equal is exit 0, one character changed is exit 1 located at
//      `routine/trig_012xvmXsXAjbVxdbYhUTq6W1/prompt` (the ID -- the routine exists, created 2026-10-02
//      and switched off, so location 1 is its id and never the string "null"), and the block's own
//      content -- the three list slugs, `--apply-list`, the `--ai-type`, and NO `claude-` and NO
//      `trig_`. AGT-432 re-pinned the content to John's VICTORIA-PRIORITIZE prompt: the duty row, the
//      `executing` projects and `victoria-prioritize-<yyyymmdd>`, and NEITHER planned findings list.
//   D  THE BRIEF (§6.4): `renderVictoriaList()`'s three branches render differently, and
//      `renderBlock()` carries the lead BETWEEN Ticket hygiene and Staff watch.
//   E  THE REPO PLUMBING: the `SERVICE_CATALOG` slug the runbook's block prescribes verbatim, the
//      `ROUTINES` key, the `CLAUDE.md` pointer row and the `ARCHITECTURE.md` header + §19v sentence.
//   F  LIVE: the Skill row, its binding, and the two before-images under ONE `agent-row` decision
//      (§6.5).
//   G  THE LIVE DISCRIMINATOR (§6.1), end to end over the real CLI. See its own block. AGT-432
//      re-pinned its candidate check: ALL of John's unreversed rulings are candidates, and nothing
//      else from `runner_decisions`.
//
// WHERE THE FIXTURES LIVE, AND WHY THAT IS THE WHOLE SAFETY ARGUMENT -- the same argument
// `agt-280-requirement-check.test.mjs` makes, plus one more this arm needs.
//   * The fixtures go in a `backlog-intake` epic (project status `planned`, asserted, not assumed), so
//     `epic_project_executing()` is false and `requirement_gate` NEVER FIRES on them.
//   * THE EPIC IS CHOSEN FOR BEING EMPTY, and that is load-bearing rather than tidy:
//     `--prepare-list` hands over EVERY open/partial ticket of the epic and `validateListVerdict()`
//     then demands a row for each, so an epic with other live tickets would make the arm's answer
//     incomplete by construction. The arm reads the epics of `backlog-intake` and takes the
//     lowest-id one with zero open/partial tickets (a canonical pick, pattern:127), and says so.
//   * `priority_class` is NULL on purpose: `ladder_work_class(NULL)` is NULL, so neither decision
//     carries a rung, and a row with no `priority_class` is ineligible in `recompute_backlog_queue()`.
//   * `source_file` is this file, which `runner_settings.ticket_filing_exempt_sources` already matches
//     as `tests/regression/%`.
//   * `backlog_id` carries a random numeric suffix (four runner lanes, AGT-265) and the shape
//     `^[A-Z]+-[0-9]+[a-z]?$` that `runner_decisions_backlog_id_check` enforces -- a prefix with
//     digits in it makes `record_decision()` fail 23514 and the caller reads as broken when it is the
//     fixture that is malformed.
//
// WHAT THIS ARM DELIBERATELY DOES NOT ASSERT, named rather than hidden (pattern:77): see the two
// notRun() declarations at the bottom.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  LIST_INTENT, LIST_PREFIX, HELD_LISTS, HEAD_CHARS, DESC_CHARS, LIST_REASON_CHARS, TOP_N,
  CANDIDATE_HEAD, CANDIDATE_FILTER, EXCLUDED_KINDS, PROPOSED_STATUS, AWAITING_LIST_ANSWER,
  buildListContext, validateListVerdict, runLine,
} from "../../scripts/requirement-check.js";
import { ROUTINES } from "../../scripts/check-routine-prompt.js";
import { SERVICE_CATALOG } from "../../shared/ai-patterns.js";
import {
  renderBlock, renderVictoriaList, asOf, VICTORIA_PREFIX, VICTORIA_RUNS_READ,
} from "../../scripts/render-standing-brief.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(REPO, "scripts", "requirement-check.js");
const CHECKER = path.join(REPO, "scripts", "check-routine-prompt.js");
const RUNBOOK_REL = "docs/runbooks/victoria-reorg.md";
const SOURCE_FILE = "tests/regression/agt-281-victoria-runs.test.mjs";
const BEGIN = "<!-- VICTORIA-REORG-PROMPT-BEGIN -->";
const END = "<!-- VICTORIA-REORG-PROMPT-END -->";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const T1 = "2026-09-03T18:20:00.000Z";

const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// The block: the lines strictly between the two marker LINES, which is what check-routine-prompt.js
// compares. A code-span mention of a marker inside the runbook's own table is not a marker line, so
// the whole-line test matters here.
function block() {
  const lines = read(RUNBOOK_REL).split("\n");
  const a = lines.indexOf(BEGIN);
  const b = lines.indexOf(END);
  assert.ok(a >= 0 && b > a, "victoria-reorg prompt markers present as whole lines");
  return lines.slice(a + 1, b).join("\n");
}

function node(script, args, env) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8", env: env ?? process.env, timeout: 180000,
  });
}

function tmpJson(dir, name, value) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(value, null, 2), "utf8");
  return p;
}

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
  return { ok: res.ok, status: res.status, text, json };
}

const describe = r => `HTTP ${r.status} ${r.text.slice(0, 300)}`;

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

// One fixture ticket. epic_id is ALWAYS explicit and priority_class ALWAYS null -- see the header.
function ticket(id, epicId, ordinal, title) {
  return {
    backlog_id: id,
    tier: "next",
    type: "Tooling",
    priority_class: null,
    title,
    description: "AGT-281 list-door probe. " + "x".repeat(2000),
    status: "open",
    epic_id: epicId,
    source_file: SOURCE_FILE,
    row_ordinal: ordinal,
    scope_origin: "discovered",
    size_stamp: "S",
    defer_status: "no",
    scope_rationale: "regression probe",
    enhancement_claim: "none: probe",
  };
}

const ITEMS = [{ id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 }];
const FACTS = (over = {}) => ({
  items: ITEMS, settings: null, drain: null,
  decisions: { open: [], finalWeek: 0, reversedWeek: 0 },
  census: [{ judgment_class: "P1 - Improves John's Skills", ord: 1, ratified: 0, proposed: 0, rejected: 0, total: 0, newest_root_claim_ref: null, newest_root_claim: null }],
  johnModel: [{ ord: 0, scope: "overall", pattern_no: null, imperative: null, citing_decisions: 0, finalised_unreversed: 0, reversed: 0, open: 0, agreement_rate: null }],
  hygiene: { open: [], decision: null, run: null, nights: [] },
  staff: [],
  ...over,
});

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // ---- A. OFFLINE: the constants, runLine(), validateListVerdict(), and two doors --------------
  await arm("A the list validator and the two doors, zero network", async () => {
    assert.equal(LIST_INTENT, "vc-reorganize-intent", "the list turn fires the sibling Intent by name");
    assert.equal(LIST_PREFIX, "SCHEDULED-AGENT: victoria-reorg", "the run's signature in runner_cycles.notes");
    assert.deepEqual([...HELD_LISTS], ["builder-found-tickets"], "the one held list");
    assert.equal(HEAD_CHARS, 200, "heads, not bodies (the Designer's call (b))");
    assert.equal(DESC_CHARS, 1500, "the 1,500-char description cut (the Designer's call (d))");
    assert.equal(LIST_REASON_CHARS, 400, "the schema's own reason ceiling");
    assert.equal(TOP_N, 3, "runLine names three passes");
    assert.deepEqual([...EXCLUDED_KINDS], [],
      "nothing is excluded since AGT-432: a John ruling is a need (directive 0078af4d)");
    assert.deepEqual(CANDIDATE_FILTER, { runner_decisions: "kind=eq.john-ruling&reversed_at=is.null" },
      "only John's unreversed rulings, never the agents' records (AGT-432)");
    assert.deepEqual(CANDIDATE_HEAD, {
      runner_directives: "body", napkin_ideas: "text", market_records: "title", knowledge_entries: "title",
      runner_decisions: "summary",
    }, "the five candidate tables and the column each one's head comes from");
    assert.ok(AWAITING_LIST_ANSWER.includes("exit 3"), "the exit-3 line must say what exit 3 means");

    // §6.1's OWN expected notes string, asserted against runLine() rather than described.
    const A = "ZAGTVIC-1a";
    const B = "ZAGTVIC-1b";
    const SRC = "nathan:market_records:00000000-0000-0000-0000-000000000000";
    const rows = [
      { backlog_id: A, verdict: "pass", need_source: SRC, need_score: 4, reason: "the record asks for it" },
      { backlog_id: B, verdict: "not-needed", need_source: null, need_score: null, reason: "nothing asks for it" },
    ];
    assert.equal(runLine("backlog-intake", rows),
      `SCHEDULED-AGENT: victoria-reorg — backlog-intake: 2 items into 1 needs, 1 turned down; top 3: ${A}(4)`,
      "runLine() is the ONE home of the run's line, and this is §6.1's expected string byte for byte");
    // M IS DISTINCT SOURCES, NOT THE PASS COUNT: two tickets onto one directive is one need.
    assert.match(runLine("x", [
      { backlog_id: "P-1", verdict: "pass", need_source: SRC, need_score: 5, reason: "r" },
      { backlog_id: "P-2", verdict: "pass", need_source: SRC, need_score: 2, reason: "r" },
    ]), /2 items into 1 needs, 0 turned down; top 3: P-1\(5\), P-2\(2\)/,
      "two passes on ONE source is one need, and the top list is ordered by score");

    const ctx = buildListContext({
      project: "backlog-intake",
      epics: ["e1"],
      tickets: [
        { backlog_id: A, title: "A", description: "d".repeat(DESC_CHARS + 500), status: "open" },
        { backlog_id: B, title: "B", description: null, status: "partial" },
      ],
      candidates: [{ key: SRC, head: "the record's first words" }],
      kinds: ["nathan:market_records"],
    });
    assert.equal(ctx.proposals[0].description.length, DESC_CHARS,
      "a proposal's description is CUT at DESC_CHARS, so one long ticket cannot eat the list's budget");
    assert.equal(ctx.proposals[1].description, null, "and a null description stays null, never the string \"null\"");

    const answer = { list: "backlog-intake", account: "Ruled one list of two proposals", rows };
    const ok = validateListVerdict(answer, ctx);
    assert.deepEqual(ok.refusals, [], "§6.1's own answer must be accepted with no refusals");
    assert.equal(ok.ok, true);

    // Every refusal case §6.2 names. `must` asserts BOTH directions: refused, and refused NAMING the
    // ticket (or the list where there is no ticket to name), so a validator that refused everything
    // with a bare message would still fail here.
    const must = (bad, who, why) => {
      const v = validateListVerdict(bad, ctx);
      assert.equal(v.ok, false, `${why}: must be refused`);
      assert.ok(v.refusals.length > 0, `${why}: a refusal must say something`);
      assert.ok(v.refusals.some(r => r.startsWith(`${who}:`)),
        `${why}: a refusal must name ${who}; got ${JSON.stringify(v.refusals)}`);
      return v.refusals.join(" | ");
    };
    const withRows = rs => ({ ...answer, rows: rs });
    assert.match(must(withRows([...rows, { backlog_id: "ZZZ-9", verdict: "pass", need_source: SRC, need_score: 3, reason: "r" }]),
      "ZZZ-9", "a STRANGER ticket"), /is not a ticket of this list/);
    assert.match(must(withRows([rows[0]]), B, "a MISSING ticket"),
      /is a ticket of this list and the answer does not rule it/);
    assert.match(must(withRows([rows[0], rows[0], rows[1]]), A, "a ticket ruled TWICE"),
      /is ruled 2 times; every ticket of the list is ruled exactly once/);
    assert.match(must(withRows([{ ...rows[0], need_source: "nathan:market_records:deadbeef" }, rows[1]]),
      A, "a source that is NOT a candidate"), /is not one of them/);
    const J = "john:runner_decisions:00000000-0000-4000-8000-000000000432";
    const ctxJ = buildListContext({
      project: "backlog-intake", epics: ["e1"],
      tickets: [{ backlog_id: A, title: "A", description: "d", status: "open", need_source: J },
        { backlog_id: B, title: "B", description: null, status: "partial" }],
      candidates: [{ key: SRC, head: "record" }, { key: J, head: "John's ruling" }],
      kinds: ["nathan:market_records", "john:runner_decisions"],
    });
    const swapped = validateListVerdict(withRows([{ ...rows[0], need_source: SRC }, rows[1]]), ctxJ);
    assert.equal(swapped.ok, false, "(AGT-432) a pass may not replace an existing john: source");
    assert.match(swapped.refusals.join(" | "), new RegExp(`^${A}: already carries John's own source ${J}`));
    const echoed = validateListVerdict(withRows([{ ...rows[0], need_source: J }, rows[1]]), ctxJ);
    assert.deepEqual(echoed.refusals, [], "(AGT-432) echoing John's source passes");
    for (const score of [0, 6, "4", 3.5, undefined]) {
      assert.match(must(withRows([{ ...rows[0], need_score: score }, rows[1]]), A, `need_score ${JSON.stringify(score)}`),
        /need_score must be a whole number 1-5/);
    }
    assert.match(must(withRows([rows[0], { ...rows[1], reason: "   " }]), B, "a BLANK reason"),
      /the verdict needs a reason/);
    assert.match(must(withRows([{ ...rows[0], reason: "r".repeat(LIST_REASON_CHARS + 1) }, rows[1]]),
      A, "a reason past the schema's ceiling"), /the reason is 401 characters/);
    assert.match(must(withRows([{ ...rows[0], verdict: "maybe" }, rows[1]]), A, "a verdict outside the two"),
      /is not one of pass, not-needed/);
    assert.match(must({ ...answer, list: "auditor-findings" }, "backlog-intake", "ANOTHER list's slug"),
      /which is not the one it was handed/);
    assert.match(must({ ...answer, account: "" }, "backlog-intake", "a blank account"), /needs an account/);
    assert.match(must({ list: "backlog-intake", account: "a" }, "backlog-intake", "no rows array at all"),
      /carries no rows array/);

    // ---- the two DOORS, with the credentials DELETED from the child's environment ---------------
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt281-offline-"));
    try {
      const naked = { ...process.env };
      delete naked.SUPABASE_URL;
      delete naked.SUPABASE_SERVICE_KEY;

      const held = node(CLI, ["--prepare-list", "--project=builder-found-tickets"], naked);
      assert.equal(held.status, 1,
        `a HELD list must exit 1 BEFORE any read (exit 2 would mean it got as far as the ` +
        `credentials); got ${held.status} stderr=${held.stderr}`);
      assert.match(held.stderr, /is a HELD list/, "in the caller's own words");

      const ctxPath = tmpJson(dir, "context.json", { list: "backlog-intake", model: "a-model", context: ctx });
      const refused = node(CLI, [
        `--apply-list=${tmpJson(dir, "bad.json", withRows([{ ...rows[0], need_score: 6 }, { ...rows[1], reason: "" }]))}`,
        `--context=${ctxPath}`, "--session-name=agt-281-offline",
      ], naked);
      assert.equal(refused.status, 1,
        `--apply-list must REFUSE with exit 1 and send nothing (exit 2 there would be a credential ` +
        `failure wearing a refusal's clothes); got ${refused.status} stderr=${refused.stderr}`);
      assert.match(refused.stderr, new RegExp(`refused: ${A}: need_score must be a whole number 1-5`),
        "printing every refusal, naming the ticket");
      assert.match(refused.stderr, new RegExp(`refused: ${B}: the verdict needs a reason`),
        "and collecting BOTH, not stopping at the first");

      // A VALID answer with no credentials is a different outcome and must read as one: exit 2,
      // could-not-run, never a pass and never a refusal.
      const valid = node(CLI, [
        `--apply-list=${tmpJson(dir, "good.json", answer)}`, `--context=${ctxPath}`,
        "--session-name=agt-281-offline",
      ], naked);
      assert.equal(valid.status, 2,
        `a VALID answer with no credentials must exit 2 (could not run), never 0 or 1; got ${valid.status} ${valid.stderr}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // ---- B. THE TWO CROSS-FILE STRINGS ------------------------------------------------------------
  await arm("B the cross-file strings that can rot silently", async () => {
    // PROPOSED_STATUS is not exported by ticket-owner.js, so the caller carries its own copy. This is
    // the mechanical check that catches a rename at its home (pattern:26) rather than discovering it
    // when a night writes a status nothing reads.
    const owner = read("scripts/ticket-owner.js");
    assert.ok(owner.includes(`const PROPOSED_STATUS = "${PROPOSED_STATUS}"`),
      `scripts/ticket-owner.js must still declare PROPOSED_STATUS as ${JSON.stringify(PROPOSED_STATUS)} -- ` +
      "requirement-check.js carries a copy, and the two must not be able to disagree about the " +
      "status John's waiting room is named by");
    assert.ok(!owner.includes('PROPOSED_STATUS = "removed"'), "and it must never be `removed` (SES-113)");
    assert.ok(read("scripts/requirement-check.js").includes('import { PROPOSAL_KIND } from "./ticket-owner.js"'),
      "and the decision KIND is imported rather than retyped, so that half cannot drift at all");

    assert.equal(VICTORIA_PREFIX, LIST_PREFIX,
      "the brief finds her runs by the prefix the caller writes -- if these two ever differ the " +
      "group goes quietly empty while both files look right on their own");
    assert.equal(VICTORIA_RUNS_READ, 2, "two runs: the two lists one Tuesday fire rules");
  });

  // ---- C. THE ROUTINE BLOCK (§6.3) --------------------------------------------------------------
  await arm("C the routine block, its drift check and its content", async () => {
    const r = ROUTINES["victoria-reorg"];
    assert.ok(r, "scripts/check-routine-prompt.js must know the routine");
    assert.equal(r.file, "victoria-reorg.md");
    assert.equal(r.begin, BEGIN);
    assert.equal(r.end, END);
    assert.equal(r.id, "trig_012xvmXsXAjbVxdbYhUTq6W1",
      "id filled 2026-10-02 (decision 956086bc); read from the live routine, never guessed");
    assert.deepEqual(Object.keys(ROUTINES).sort(),
      ["auditor", "jerry-linkedin-alerts", "market", "model-watch", "researcher", "runner", "victoria-reorg"],
      "seven routines, victoria-reorg the seventh");

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt281-routine-"));
    try {
      const b = block();
      const same = path.join(dir, "same.txt");
      fs.writeFileSync(same, b, "utf8");
      const okRun = node(CHECKER, ["--routine=victoria-reorg", `--prompt=${same}`, `--out=${path.join(dir, "ok.json")}`]);
      assert.equal(okRun.status, 0, `an identical prompt must exit 0; got ${okRun.status} ${okRun.stderr}`);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "ok.json"), "utf8")).findings, [],
        "and report no findings");

      // ONE CHARACTER. The mutation control: a check that cannot see one character cannot see a
      // rewritten step either.
      const lines = b.split("\n");
      lines[2] = `${lines[2]}.`;
      const drifted = path.join(dir, "drift.txt");
      fs.writeFileSync(drifted, lines.join("\n"), "utf8");
      const bad = node(CHECKER, ["--routine=victoria-reorg", `--prompt=${drifted}`, `--out=${path.join(dir, "drift.json")}`]);
      assert.equal(bad.status, 1, `one changed character must exit 1; got ${bad.status} ${bad.stderr}`);
      const f = JSON.parse(fs.readFileSync(path.join(dir, "drift.json"), "utf8")).findings;
      assert.equal(f.length, 1, "exactly ONE finding");
      assert.equal(f[0].locations[0].location, "routine/trig_012xvmXsXAjbVxdbYhUTq6W1/prompt",
        "located by the routine's ID, which exists as of 2026-10-02");
      assert.ok(!f[0].locations[0].location.includes("null"), "no routine/null/prompt");
      assert.match(f[0].locations[1].location, /^docs\/runbooks\/victoria-reorg\.md:\d+$/);
      assert.equal(f[0].confidence, "high");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    // THE BLOCK'S OWN CONTENT. A block that drifts from itself passes the check above and still
    // tells the routine to do the wrong thing.
    const b = block();
    for (const s of ["builder-found-tickets", "--prepare-list", "--apply-list", "--ai-type=requirement-check",
      "requirement-check:vc-reorganize-intent:depth0", "victoria-prioritize-<yyyymmdd>",
      "vc-prioritization-duty", "status = 'executing'"]) {
      assert.ok(b.includes(s), `the block must name ${s}`);
    }
    assert.ok(!b.includes("dev-mgr-findings") && !b.includes("auditor-findings"),
      "the two planned findings lists are no longer her scope (AGT-432, directive 0078af4d)");
    assert.ok(/NEVER builder-found-tickets/.test(b),
      "and it must name builder-found-tickets only to forbid it -- a held list is not a list to run");
    assert.ok(!b.includes("claude-"),
      "NO model id in the block: the model is the model_assignments row the render prints at run time");
    assert.ok(!b.includes("trig_"),
      "and NO trigger id: the id lives in the table, never the block (AGT-102)");
    for (const forbidden of ["file a ticket", "removed", "push", "card", "message", "ask John"]) {
      assert.ok(b.includes(forbidden), `the block's refusal list must still name ${JSON.stringify(forbidden)}`);
    }
  });

  // ---- D. THE BRIEF (§6.4) ----------------------------------------------------------------------
  await arm("D Victoria's lists in the standing brief", async () => {
    const stamp = asOf(T1);
    const LEAD = "**Victoria's lists, last Tuesday**";
    const absent = renderVictoriaList(undefined, stamp);
    const empty = renderVictoriaList([], stamp);
    const rows = renderVictoriaList([
      { id: "c1", ended_at: "2026-09-29T12:05:00Z", outcome: "shipped", notes: `${LIST_PREFIX} — auditor-findings: 7 items into 2 needs, 1 turned down; top 3: AGT-9(4)` },
      { id: "c2", ended_at: "2026-09-29T12:00:00Z", outcome: "shipped", notes: `${LIST_PREFIX} — dev-mgr-findings: 77 items into 9 needs, 12 turned down; top 3: AGT-1(5), AGT-2(5), AGT-3(4)` },
    ], stamp);

    for (const out of [absent, empty, rows]) assert.ok(out.includes(LEAD), `every branch carries the lead: ${out.slice(0, 120)}`);
    assert.notStrictEqual(absent, empty,
      "ABSENT IS NOT ZERO: 'the ledger was not read' and 'she has not run' are opposite facts and the " +
      "control is vacuous unless the two renders really differ");
    assert.match(absent, /was not read for this render/, "absent must SAY the read did not happen");
    assert.ok(!/measured zero/.test(absent), "and must not borrow the measured-zero words");
    assert.match(empty, /No run on record yet — a measured zero/, "[] is a measured zero, said as one");

    // THE RUN'S OWN LINE, PREFIX STRIPPED, AND NOTHING RECOUNTED.
    assert.ok(rows.includes("- auditor-findings: 7 items into 2 needs, 1 turned down; top 3: AGT-9(4)"),
      `each row prints its own notes with the prefix stripped: ${rows}`);
    assert.ok(!rows.includes(`- ${LIST_PREFIX}`), "the prefix is how the rows were found, not information about them");
    assert.match(rows, /\*\*13 ticket\(s\) turned down\*\*/,
      "and the turned-down total is the sum of the runs' own numbers (12 + 1), parsed from their lines");
    assert.match(rows, /removal proposed/, "naming the status those tickets are sitting on");

    // PLACEMENT: between Ticket hygiene and Staff watch, which keeps Human gates last.
    const b = renderBlock(FACTS({ victoria: [] }), T1);
    const iH = b.indexOf("**Ticket hygiene");
    const iV = b.indexOf(LEAD);
    const iS = b.indexOf("**Staff watch**");
    assert.ok(iH >= 0 && iV >= 0 && iS >= 0, `all three anchors must be in the block (hygiene ${iH}, victoria ${iV}, staff ${iS})`);
    assert.ok(iH < iV && iV < iS, `Victoria's lists sits BETWEEN Ticket hygiene and Staff watch; got ${iH} / ${iV} / ${iS}`);
    assert.ok(renderBlock(FACTS({ victoria: undefined }), T1).includes("was not read for this render"),
      "and renderBlock() still carries the group, saying so, when fetchFacts never read it");
  });

  // ---- E. THE REPO PLUMBING --------------------------------------------------------------------
  await arm("E the catalog slug, the pointer row and the architecture record", async () => {
    const entry = SERVICE_CATALOG.filter(e => e.slug === "requirement-check");
    assert.equal(entry.length, 1,
      "exactly one SERVICE_CATALOG entry for requirement-check -- scripts/agent-log.js refuses any " +
      "--ai-type this array does not carry (SES-338), so the runbook's own log line would be refused");
    assert.equal(entry[0].serviceType, "ai");
    assert.deepEqual(entry[0].patterns, ["Structured Output", "LLM-as-Judge / Verifier"],
      "the audit-run-review row's shape: validated against the fired intent's schema, and the turn IS the judgment");

    const claude = read("CLAUDE.md");
    assert.ok(/\|[^|\n]*Victoria first \(`\/victoria`\)[^|\n]*\|\s*`docs\/runbooks\/victoria-reorg\.md`\s*\|/.test(claude),
      "CLAUDE.md's pointer table must carry the row that sends a session to the runbook");

    const arch = read("docs/ARCHITECTURE.md");
    const header = arch.split("\n").find(l => l.startsWith("# Amended v7.0.741 |"));
    assert.ok(header, "docs/ARCHITECTURE.md must carry the v7.0.741 amendment header");
    for (const s of ["2026-10-02", "cycle-20261002-0742 (runner)", "AGT-281:", "§19v"]) {
      assert.ok(header.includes(s), `the header must name ${s}; got ${header.slice(0, 200)}`);
    }
    const i280 = arch.indexOf("(`AGT-280`, slices 1-2)");
    assert.ok(i280 > 0, "§19v's AGT-280 sentence must still be there to hang the new one off");
    const sentence = arch.indexOf("**`AGT-281` adds the LIST turn beside that one-ticket door**");
    assert.ok(sentence > i280, "and the AGT-281 sentence must follow it in §19v");
    for (const s in { "vc-reorganize-intent": 1, "--prepare-list": 1, "docs/runbooks/victoria-reorg.md": 1, "Victoria's lists": 1, "removal proposed": 1 }) {
      assert.ok(arch.slice(sentence, sentence + 1400).includes(s),
        `the §19v sentence must name the list turn, the runbook and the brief line -- missing ${s}`);
    }
  });

  // ---- the live half ---------------------------------------------------------------------------
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-281 arms F and G (the Skill row and the live discriminator)",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the Skill row, its binding, its two " +
      "before-images and the whole list door live in Supabase, and there is no offline half of any " +
      "of them (run with `node --env-file-if-exists=.env.local tests/regression/run-all.js`). " +
      "Arms A-E ran.");
  } else {
    // ---- F. THE SKILL ROW, ITS BINDING, AND THE TWO IMAGES (§6.5) -----------------------------
    await arm("F the sibling Intent, its binding and its one reversal handle", async () => {
      const sp = await req(url, key,
        "skill_profiles?slug=eq.vc-reorganize-intent&select=id,skill_type_slug,tenant_id,max_tokens,temperature,llm_model,traits,objective");
      assert.ok(sp.ok, `the Skill row must read; got ${describe(sp)}`);
      assert.equal((sp.json ?? []).length, 1, "exactly ONE vc-reorganize-intent row");
      const row = sp.json[0];
      assert.equal(row.skill_type_slug, "intent", "type intent -- the unit of judgment, not a new capability (§19b)");
      assert.equal(row.tenant_id, "global");
      assert.equal(row.max_tokens, 16000, "16000: one row per ticket over a list of up to 77");
      assert.equal(row.temperature, null, "temperature NULL, as its sibling");
      const schema = row.traits?.schema ?? {};
      assert.deepEqual(schema.required, ["list", "rows", "account"], "the three required keys §4 names");
      const item = schema.properties?.rows?.items ?? {};
      assert.deepEqual(item.required, ["backlog_id", "verdict", "need_source", "need_score", "reason"],
        "and the row shape §4 names");
      assert.deepEqual(item.properties?.verdict?.enum, ["pass", "not-needed"]);
      assert.equal(item.properties?.need_score?.minimum, 1);
      assert.equal(item.properties?.need_score?.maximum, 5);
      assert.equal(item.properties?.reason?.maxLength, LIST_REASON_CHARS,
        "the schema's reason ceiling and the validator's must be the same number");

      const bind = await req(url, key,
        "capability_skill_profiles?capability_slug=eq.requirement-check&select=skill_profile_slug,level,display_order,is_required&order=display_order.asc");
      assert.ok(bind.ok, `the bindings must read; got ${describe(bind)}`);
      const slugs = (bind.json ?? []).map(b => b.skill_profile_slug);
      assert.deepEqual(slugs, ["vc-requirement-intent", "vc-reorganize-intent", "vc-process-break-class"],
        "BOTH DIRECTIONS: the new intent is bound AND the AGT-280 one still is; the third, vc-process-break-class, is AGT-309 v7.0.743 (agent-row decision 54d80a6a) -- a migration that " +
        `replaced rather than joined would read as a pass on the new row alone; got ${JSON.stringify(slugs)}`);
      assert.equal(bind.json[1].level, 3, "same depth as its sibling");

      const dec = await req(url, key,
        "runner_decisions?id=eq.e2c0d503-9514-4bf9-aa06-68c2ef4af4ac&kind=eq.agent-row&backlog_id=eq.AGT-281&select=id,summary");
      assert.ok(dec.ok && (dec.json ?? []).length === 1,
        `ONE agent-row decision for AGT-281 -- the migration's whole down; got ${describe(dec)}`);
      const imgs = await req(url, key,
        `runner_before_images?decision_id=eq.${dec.json[0].id}&select=table_name,pk_value,row_data`);
      assert.ok(imgs.ok, `its before-images must read; got ${describe(imgs)}`);
      assert.equal((imgs.json ?? []).length, 2, `exactly TWO images under it; got ${(imgs.json ?? []).length}`);
      assert.deepEqual([...imgs.json].map(i => i.table_name).sort(),
        ["capability_skill_profiles", "skill_profiles"], "one per row the migration INSERTed");
      for (const i of imgs.json) {
        assert.equal(i.row_data, null,
          "row_data NULL on both: these are INSERTs, so the reversal is a DELETE (SES-150), and an " +
          "image carrying a row would restore a row that never existed");
      }
      assert.equal(imgs.json.find(i => i.table_name === "skill_profiles").pk_value, row.id,
        "and pk_value is the uuid the INSERT used, so the promise is one reverse_decision() can keep (pattern:169)");
      console.log(`    [AGT-281 arm F] intent ${row.id}, agent-row decision ${dec.json[0].id}, 2 images`);
    });

    // ---- G. THE LIVE DISCRIMINATOR (§6.1) ----------------------------------------------------
    //
    // WHAT MAKES IT DISCRIMINATING, stated as counts rather than as "it worked":
    //   * `runner_decisions kind='requirement-check'` and `kind='removal-proposal'` each go +1 from
    //     ONE answer -- the two writers one list turn reaches, which no amount of database half moves.
    //   * A reads back the SOURCE and the 4 it was given, not merely a 200.
    //   * B reads back `removal proposed` and is imaged FULL-ROW under its own decision, which is what
    //     makes John's waiting room reversible.
    //   * `runner_cycles` goes +1 and its `notes` is runLine()'s string -- the run's one record.
    //   * `--project=builder-found-tickets` exits 1, which is the arm that refuses an over-accepting door.
    const epics = await req(url, key,
      "epics?select=id,name,projects!inner(slug,status)&projects.slug=eq.backlog-intake&order=id.asc&limit=100");
    const mkt = await req(url, key, "market_records?select=id,title&order=id.asc&limit=1");
    const rec = mkt.ok ? (mkt.json ?? [])[0] : null;
    let epic = null;
    if (epics.ok && Array.isArray(epics.json)) {
      // THE EPIC IS CHOSEN FOR BEING EMPTY (see the header) -- lowest id with zero open/partial rows.
      for (const e of epics.json) {
        const n = await count(url, key, `backlog_items?select=id&epic_id=eq.${e.id}&status=in.(open,partial)`);
        if (n === 0) { epic = e; break; }
      }
    }

    if (!epic || !rec) {
      notRun("AGT-281 arm G (the live discriminator)",
        `the live fixtures this door is measured against are not both present right now ` +
        `(an EMPTY backlog-intake epic: ${epic ? epic.id : "none of " + (epics.ok ? (epics.json ?? []).length : "a failed read")}, ` +
        `market_records rows: ${rec ? 1 : 0}) -- --prepare-list hands over EVERY open/partial ticket ` +
        "of the epic and the validator then demands a row for each, so running it against a " +
        "populated epic would measure an incomplete answer rather than the door.");
    } else {
      await arm("G the list door, live end to end", async () => {
        assert.notEqual(epic.projects?.status, "executing",
          "THE PRECONDITION: the fixture epic's project must NOT be executing, or requirement_gate " +
          "would refuse the fixture inserts and this arm would be measuring AGT-280 slice 1's trigger");
        const EPIC = epic.id;
        const GOOD = `nathan:market_records:${rec.id}`;
        const suffix = crypto.randomInt(1000000, 9999999);
        const T_PASS = `ZAGTVIC-${suffix}a`;
        const T_NN = `ZAGTVIC-${suffix}b`;
        const SESSION = "agt-281-regression";

        const passQ = "runner_decisions?select=id&kind=eq.requirement-check";
        const downQ = "runner_decisions?select=id&kind=eq.removal-proposal";
        const cycQ = "runner_cycles?select=id&notes=like." + encodeURIComponent(LIST_PREFIX + "%");
        const passBefore = await count(url, key, passQ);
        const downBefore = await count(url, key, downQ);
        const cycBefore = await count(url, key, cycQ);

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt281-live-"));
        const handles = [];
        let cycleId = null;
        let notes = null;
        try {
          await req(url, key, "backlog_items?backlog_id=like.ZAGTVIC-*", { method: "DELETE" });
          for (const [id, ordinal, title] of [
            [T_PASS, 999810001, "AGT-281 list probe — the pass arm"],
            [T_NN, 999810002, "AGT-281 list probe — the turned-down arm"],
          ]) {
            const r = await req(url, key, "backlog_items",
              { method: "POST", prefer: "return=representation", body: ticket(id, EPIC, ordinal, title) });
            assert.ok(r.ok, `the ${id} fixture must insert (the gate must NOT fire here); got ${describe(r)}`);
          }

          // --- (1) --prepare-list: the whole assembly path, exit 3, no model call ---------------
          const prep = node(CLI, ["--prepare-list", "--project=backlog-intake", `--epic=${EPIC}`, "--json"]);
          assert.equal(prep.status, 3,
            `--prepare-list must exit 3 (awaiting her ONE answer); got ${prep.status} stderr=${prep.stderr.slice(0, 800)}`);
          const prepared = JSON.parse(prep.stdout);
          assert.equal(prepared.list, "backlog-intake", "the context must name the list it was given");
          assert.equal(prepared.tickets, 2, `and carry EXACTLY the epic's two open tickets; got ${prepared.tickets}`);
          const ids = prepared.context.proposals.map(p => p.backlog_id).sort();
          assert.deepEqual(ids, [T_PASS, T_NN].sort(), `both fixtures and nothing else; got ${JSON.stringify(ids)}`);
          assert.equal(prepared.context.proposals[0].description.length, DESC_CHARS,
            "the 2,000-character fixture description must come back CUT at DESC_CHARS");
          const keys = prepared.context.candidates.map(c => c.key);
          assert.ok(keys.includes(GOOD), `the live market record must be among the candidates; got ${keys.length} candidates`);
          const johnKeys = keys.filter(k => k.startsWith("john:runner_decisions:"));
          const rulings = await count(url, key, "runner_decisions?select=id&kind=eq.john-ruling&reversed_at=is.null");
          assert.ok(rulings > 0 && johnKeys.length === rulings,
            `ALL of John's unreversed rulings are candidates and nothing else from that table: ${johnKeys.length} keys vs ${rulings} rows (AGT-432)`);
          for (const c of prepared.context.candidates) {
            assert.ok(c.head === null || String(c.head).length <= HEAD_CHARS,
              `every candidate travels as a HEAD of at most ${HEAD_CHARS} chars; got ${String(c.head).length}`);
          }
          assert.ok(prepared.prompt_bytes > 500,
            `the prompt must have actually assembled through assemblePrompt(); got ${prepared.prompt_bytes} bytes`);
          assert.ok(typeof prepared.model === "string" && prepared.model.length > 0,
            "and resolveJudgmentModel() must have named the lane's model, never a literal in this file");

          // --- (2) --apply-list: ONE answer, TWO writers, ONE run row -------------------------
          const answer = {
            list: "backlog-intake",
            account: "Ruled one list of two proposals",
            rows: [
              { backlog_id: T_PASS, verdict: "pass", need_source: GOOD, need_score: 4,
                reason: "the cited market record asks for exactly this (regression fixture)" },
              { backlog_id: T_NN, verdict: "not-needed", need_source: null, need_score: null,
                reason: "no candidate record asks for this at all (regression fixture)" },
            ],
          };
          const ap = node(CLI, [
            `--apply-list=${tmpJson(dir, "answer.json", answer)}`,
            `--context=${tmpJson(dir, "context.json", prepared)}`,
            `--session-name=${SESSION}`,
          ]);
          assert.equal(ap.status, 0, `--apply-list must succeed; got ${ap.status} stderr=${ap.stderr.slice(0, 900)}`);
          for (const m of ap.stdout.matchAll(new RegExp(`reverse_decision\\('(${UUID.source})'`, "g"))) handles.push(m[1]);
          assert.equal(handles.length, 2,
            `both writes must print an undo line -- one per row; got ${handles.length} in ${ap.stdout.slice(0, 600)}`);

          assert.equal(await count(url, key, passQ), passBefore + 1,
            `THE DISCRIMINATOR: runner_decisions kind='requirement-check' must go ${passBefore} -> ${passBefore + 1}`);
          assert.equal(await count(url, key, downQ), downBefore + 1,
            `and kind='removal-proposal' ${downBefore} -> ${downBefore + 1} -- ONE answer, TWO writers`);

          const a = await req(url, key, `backlog_items?backlog_id=eq.${T_PASS}&select=need_source,need_score,status`);
          assert.deepEqual((a.json ?? [])[0], { need_source: GOOD, need_score: 4, status: "open" },
            "A reads back the source and the 4 it was given, and its status did not move");
          const bRow = await req(url, key, `backlog_items?backlog_id=eq.${T_NN}&select=status,need_source,need_score`);
          assert.deepEqual((bRow.json ?? [])[0], { status: PROPOSED_STATUS, need_source: null, need_score: null },
            `B reads back ${PROPOSED_STATUS} -- John's waiting room, never 'removed' (SES-113) -- and no source`);

          // THE TURNED-DOWN ROW IS IMAGED FULL, which is what makes the waiting room reversible.
          const dn = await req(url, key,
            `runner_decisions?kind=eq.removal-proposal&backlog_id=eq.${T_NN}&select=id,session_name,summary`);
          assert.equal((dn.json ?? []).length, 1, `one removal-proposal decision for B; got ${describe(dn)}`);
          assert.equal(dn.json[0].session_name, SESSION, "authored by this session and no cycle");
          assert.match(dn.json[0].summary, new RegExp(`^${T_NN} removal proposed: `),
            "with ticket-owner step 3b's own summary shape");
          const dImgs = await req(url, key,
            `runner_before_images?decision_id=eq.${dn.json[0].id}&select=table_name,pk_value,row_data`);
          assert.equal((dImgs.json ?? []).length, 1, `exactly one image under it; got ${describe(dImgs)}`);
          assert.equal(dImgs.json[0].table_name, "backlog_items");
          assert.equal(dImgs.json[0].row_data.status, "open",
            "AND ITS status IS STILL open -- which is what proves the image was written BEFORE the patch");
          assert.ok(Object.keys(dImgs.json[0].row_data).length > 20,
            "and it is the FULL row: reverse_decision() rewrites every column from row_data, so a " +
            `partial image restores a partial row; got ${Object.keys(dImgs.json[0].row_data).length} columns`);

          // THE RUN'S ONE RECORD.
          assert.equal(await count(url, key, cycQ), cycBefore + 1,
            `runner_cycles must go ${cycBefore} -> ${cycBefore + 1} -- ONE row per list, the run's whole record`);
          const cyc = await req(url, key,
            cycQ.replace("select=id", "select=id,notes,stamp,model,outcome,ended_at") + "&order=started_at.desc&limit=1");
          const cRow = (cyc.json ?? [])[0];
          assert.ok(cRow, `the run row must read back; got ${describe(cyc)}`);
          cycleId = cRow.id;
          notes = cRow.notes;
          const expected = runLine("backlog-intake", answer.rows);
          assert.equal(expected,
            `${LIST_PREFIX} — backlog-intake: 2 items into 1 needs, 1 turned down; top 3: ${T_PASS}(4)`,
            "§6.1's expected notes string, spelled out rather than only derived");
          // startsWith, not equality: AGT-173 R4's trg_runner_cycles_notes_citations may APPEND
          // reversal handles to `notes` at write time, and that append is the platform working.
          assert.ok(String(notes).startsWith(expected),
            `the run row's notes must be runLine()'s line; got ${JSON.stringify(notes)}`);
          assert.equal(cRow.stamp, "session victoria-reorg", "stamped as the session, as recordNightly() stamps its own");
          assert.equal(cRow.model, prepared.model, "and carrying the model the render printed, from the context");
          assert.ok(cRow.ended_at, "and ended, so the brief's `ended_at is not null` read finds it");

          // --- (3) the held list, over the real CLI with credentials present -------------------
          const held = node(CLI, ["--prepare-list", "--project=builder-found-tickets", "--json"]);
          assert.equal(held.status, 1, `--project=builder-found-tickets must exit 1; got ${held.status}`);
          assert.equal(held.stdout.trim(), "", "and assemble NOTHING: a held list costs no tokens");
          const unknown = node(CLI, ["--prepare-list", "--project=zz-no-such-list", "--json"]);
          assert.equal(unknown.status, 1, "and a slug that names no project is refused, never an empty run");
        } finally {
          // ---- RESIDUE. Every one of these runs even when an assertion above threw. ------------
          for (const id of handles) {
            await req(url, key, `runner_before_images?decision_id=eq.${id}`, { method: "DELETE" });
          }
          for (const id of handles) {
            await req(url, key, `runner_decisions?id=eq.${id}`, { method: "DELETE" });
          }
          for (const id of [T_PASS, T_NN]) {
            await req(url, key, `backlog_items?backlog_id=eq.${id}`, { method: "DELETE" });
          }
          if (cycleId) await req(url, key, `runner_cycles?id=eq.${cycleId}`, { method: "DELETE" });
          fs.rmSync(dir, { recursive: true, force: true });

          const leftPass = await count(url, key, passQ);
          const leftDown = await count(url, key, downQ);
          const leftCyc = await count(url, key, cycQ);
          if (leftPass !== passBefore || leftDown !== downBefore || leftCyc !== cycBefore) {
            failures.push(`[arm G] FAIL -- RESIDUE: requirement-check ${leftPass} (was ${passBefore}), ` +
              `removal-proposal ${leftDown} (was ${downBefore}), victoria-reorg cycles ${leftCyc} (was ${cycBefore})`);
          }
          const leftTickets = await req(url, key, "backlog_items?select=backlog_id&backlog_id=like.ZAGTVIC-*");
          if (leftTickets.ok && (leftTickets.json ?? []).length) {
            failures.push(`[arm G] FAIL -- RESIDUE: ${(leftTickets.json).length} ZAGTVIC-* fixture ticket(s) left behind`);
          }
          console.log(`    [AGT-281 arm G] epic ${epic.name} (${epic.id}), market_records ${rec.id}, ` +
            `requirement-check ${passBefore} -> ${leftPass}, removal-proposal ${downBefore} -> ${leftDown}, ` +
            `cycles ${cycBefore} -> ${leftCyc}, notes ${JSON.stringify(notes)}`);
        }
      });
    }
  }

  // ---- the two things this suite CANNOT assert here, DECLARED, never skipped (SES-310) ---------
  notRun("AGT-281 §6.5 — the 10-file `git diff --stat` count",
    "a permanent regression test cannot assert the size of a working-tree diff: the diff is empty the " +
    "moment the ship is committed, so the assertion would grade the clock rather than the change " +
    "(pattern:162). MEASURED AT THE SHIP instead and recorded there: 10 files, exactly the ten the " +
    "kickoff's tasks name (the migration mirror, scripts/requirement-check.js, the runbook, " +
    "scripts/check-routine-prompt.js, tests/regression/agt-146-model-watch-routine.test.mjs, " +
    "shared/ai-patterns.js, scripts/render-standing-brief.js, this file, CLAUDE.md, " +
    "docs/ARCHITECTURE.md).");
  notRun("AGT-281 — the pg_proc / schema_migrations census and a rolled-back transaction",
    "this suite reaches Supabase only over PostgREST, which cannot read schema_migrations or pg_proc, " +
    "and cannot open a transaction (`Prefer: tx=rollback` is not honoured on this project -- probed " +
    "at AGT-280 slice 1's ship). The migration asserts its OWN counts in its own DO block instead " +
    "(1 Skill row, 1 binding, 2 intents on the capability, 2 NULL images), and arm G uses " +
    "create-then-remove with a count re-read in a `finally`. This ticket creates no function, so " +
    "there is no overload census to run.");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
