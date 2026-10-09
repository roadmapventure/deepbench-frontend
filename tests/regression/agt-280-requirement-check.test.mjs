// DeepBench v7.0.827 | tests/regression/agt-280-requirement-check.test.mjs | AGT-433 slice 2 -- need_score 0 = PARKED: the validator accepts 0 and refuses -1 (band 0-5).
// DeepBench v7.0.740 | tests/regression/agt-280-requirement-check.test.mjs | AGT-280 slice 2 --
// THE CALLER: the gate slice 1 built now has a door, and this is the guard on it.
//
// THE DEFECT, measured live 2026-09-29/30 on the unchanged tree. Slice 1 (v7.0.729) shipped the
// whole database half -- `need_source_is_traceable()`, `apply_requirement_verdict()`, the
// `requirement_gate` trigger, the `requirement-check` capability on `victoria` -- and NOTHING in
// `scripts/ shared/ lib/ api/ src/` called any of it. `runner_decisions where
// kind='requirement-check'` was 0, `backlog_items where need_score is not null` was 0, and
// `need_source_is_traceable(NULL)` is false, so every `discovered` filing into an `executing`
// project's epic was being REFUSED with nothing in the repo able to satisfy the gate: 16 such
// filings in 14 days. `scripts/requirement-check.js` is that door.
//
// ARMS.
//   A  OFFLINE, BOTH DIRECTIONS, zero network: `validateVerdict()` accepts a well-formed `pass` and
//      a well-formed `not-needed`, and refuses every case §6.2 names -- `need_score` -1, 6, 3.5 and
//      the string "4"; a `need_source` one character off; `verdict` `maybe`; a blank `reason`,
//      `account` or `proposal`; a `backlog_id` that is not the context's -- each refusal NAMING the
//      ticket. Then the same two directions through the `--dry-run` DOOR, spawned with
//      SUPABASE_URL / SUPABASE_SERVICE_KEY DELETED from its environment: a dry-run that reached the
//      network at all would `die(2, ...)` on the missing credentials, so exit 0 / exit 1 is itself
//      the zero-network proof rather than a claim about one.
//   B  THE DISCRIMINATOR, live end-to-end over the real CLI, and it is red at the import on the
//      unchanged tree (`ERR_MODULE_NOT_FOUND`). See its own block for the three arms and why the
//      counts are what discriminate.
//
// WHERE THE FIXTURES LIVE, AND WHY THAT IS THE WHOLE SAFETY ARGUMENT.
//   * The fixture tickets sit in the `backlog-intake` epic (project status `planned`, asserted, not
//     assumed), so `epic_project_executing()` is false and `requirement_gate` NEVER FIRES on them.
//     What this arm measures is the CALLER; slice 1's test is where the trigger is measured.
//   * `priority_class` is NULL on purpose, and both consequences are load-bearing:
//     `ladder_work_class(NULL)` is NULL, so the decision carries no rung and the reversal in the
//     `finally` DEMOTES NOTHING on the live ladder; and a row with no `priority_class` is ineligible
//     in `recompute_backlog_queue()`, so the recompute the reversal triggers cannot shift any other
//     ticket's `queue` number while the fixture exists.
//   * `source_file` is this file, which `runner_settings.ticket_filing_exempt_sources` already
//     lists, so AGT-238's deferred finding rule is not what decides these inserts.
//   * `backlog_id` carries a random suffix (four runner lanes, AGT-265), while the `not-needed`
//     PROPOSAL TEXT IS FIXED -- `apply_requirement_verdict()` fingerprints the proposal and
//     `on conflict (fingerprint, iso_week) do nothing`, so a fixed text appends at most ONE
//     `audit_findings` row per ISO WEEK instead of one per run.
//
// THE ONE PIECE OF RESIDUE THIS ARM CANNOT DELETE, named rather than hidden (pattern:77). §6.1 asks
// for the fixtures to be DELETEd in the `finally`; `audit_findings` REFUSES a delete outright --
// `audit_findings_guard()` raises "append-only (AGT-70): delete refused", read live at this ship,
// for the service key as much as anyone. So the `not-needed` arm's finding is SETTLED instead of
// deleted: the `finally` writes `status = 'not-a-defect'` with a ruling naming this file, which the
// same guard expressly permits, taking it off the `listed` board. Everything else -- the two fixture
// tickets, the decision, the reversal and every before-image under both -- is deleted, and the arm
// re-reads `runner_decisions where kind='requirement-check'` at the end and asserts it is back to
// where it started.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  AGENT, CAPABILITY, TENANT, VERDICTS, AWAITING_ANSWER,
  buildTaskContext, contextBody, parseSource, validateVerdict,
} from "../../scripts/requirement-check.js";

const NOWHERE = "00000000-0000-0000-0000-000000000000";
const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "scripts", "requirement-check.js");
const SOURCE_FILE = "tests/regression/agt-280-requirement-check.test.mjs";
// FIXED, deliberately: this text is what apply_requirement_verdict() fingerprints, so a fixed text
// is what keeps the un-deletable audit_findings residue to one row per ISO week. See the header.
const NOT_NEEDED_PROPOSAL =
  "AGT-280 regression fixture — a proposal the requirement-check guard refuses on purpose";
const FP = `agt-280:not-needed:${crypto.createHash("sha256").update(NOT_NEEDED_PROPOSAL, "utf8").digest("hex")}`;

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

// The CLI, run as the runner runs it. `env` REPLACES the child's environment wholesale where it is
// given, which is how arm A proves the dry-run door needs no credentials.
function cli(args, env) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8", env: env ?? process.env, timeout: 120000,
  });
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

function tmpJson(dir, name, value) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(value, null, 2), "utf8");
  return p;
}

// One fixture ticket body. epic_id is ALWAYS explicit (backlog_home_intake() returns early) and
// priority_class is ALWAYS null -- see the header for why both matter.
function ticket(id, epicId, ordinal) {
  return {
    backlog_id: id,
    tier: "next",
    type: "Tooling",
    priority_class: null,
    title: "AGT-280 requirement-check caller probe",
    status: "open",
    epic_id: epicId,
    source_file: SOURCE_FILE,
    // NOT NULL, and unique per (source_file, row_ordinal). This file's source_file is its own, and
    // the two values are fixed rather than random so a run is reproducible (pattern:127); the arm
    // clears any ZAGTREQ-* row left by a crashed earlier run before it inserts.
    row_ordinal: ordinal,
    scope_origin: "discovered",
    size_stamp: "S",
    defer_status: "no",
    scope_rationale: "regression probe",
    enhancement_claim: "none: probe",
  };
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // ---- A. OFFLINE, both directions, zero network -------------------------------------------------
  await arm("A validateVerdict and the --dry-run door", async () => {
    const TICKET = "ZAGTREQ-1a";
    const SRC = `nathan:market_records:${NOWHERE}`;
    const ctx = buildTaskContext({
      ticket: { backlog_id: TICKET, title: "offline fixture", description: "d", status: "open" },
      source: SRC,
      source_row: { id: NOWHERE, note: "the cited row's own words" },
      kinds: ["nathan:market_records"],
    });
    // The constants §4 names, asserted by value: the caller must speak for Victoria's global
    // capability and nobody else's.
    assert.equal(AGENT, "victoria", "the caller is Victoria's door");
    assert.equal(CAPABILITY, "requirement-check");
    assert.equal(TENANT, "global");
    assert.deepEqual([...VERDICTS], ["pass", "not-needed"], "the two verdicts the writer enforces");
    assert.ok(AWAITING_ANSWER.includes("exit 3"), "the exit-3 line must say what exit 3 means");
    assert.deepEqual(parseSource("nathan:market_records:abc:def"),
      { who: "nathan", table: "market_records", id: "abc:def", pair: "nathan:market_records" },
      "a source splits on the FIRST two colons -- an id may contain one");
    assert.equal(parseSource("nathan:market_records"), null, "a two-part string is not a source");
    assert.equal(contextBody({ context: { proposal: { backlog_id: TICKET } } }).proposal.backlog_id, TICKET,
      "a --json prepare file and a bare task_context must both read");

    const base = {
      verdict: "pass", backlog_id: TICKET, need_source: SRC, need_score: 3,
      proposal: "a proposal", reason: "the cited row asks for exactly this", account: "Ruled one proposal",
    };
    const ok = validateVerdict(base, ctx);
    assert.deepEqual(ok.refusals, [], "a well-formed pass must be accepted with no refusals");
    assert.equal(ok.ok, true);

    const nn = validateVerdict(
      { ...base, verdict: "not-needed", need_source: null, need_score: undefined }, ctx);
    assert.deepEqual(nn.refusals, [],
      "a well-formed not-needed must be accepted -- the source and the score are the pass's rules");

    // Every refusal case §6.2 names. `must` asserts BOTH directions of each one: refused, and
    // refused NAMING THE TICKET, so a validator that refused everything with a bare message would
    // still fail here.
    const must = (answer, why) => {
      const v = validateVerdict(answer, ctx);
      assert.equal(v.ok, false, `${why}: must be refused`);
      assert.ok(v.refusals.length > 0, `${why}: a refusal must say something`);
      for (const r of v.refusals) {
        assert.ok(r.startsWith(`${TICKET}:`), `${why}: every refusal must name the backlog_id; got ${JSON.stringify(r)}`);
      }
      return v.refusals.join(" | ");
    };
    const parked = validateVerdict({ ...base, need_score: 0 }, ctx);
    assert.deepEqual(parked.refusals, [], "(AGT-433) a PARKED ticket scored 0 is accepted -- 0 is a score, not an absence");
    assert.equal(parked.ok, true);
    assert.match(must({ ...base, need_score: -1 }, "need_score -1"), /need_score must be a whole number 0-5/);
    assert.match(must({ ...base, need_score: 6 }, "need_score 6"), /need_score must be a whole number 0-5/);
    must({ ...base, need_score: 3.5 }, "need_score 3.5 is not a whole number");
    must({ ...base, need_score: "4" }, "need_score \"4\" is a string, not an integer");
    must({ ...base, need_score: undefined }, "a pass with no need_score at all");
    assert.match(must({ ...base, need_source: `${SRC}x` }, "a need_source one character off"),
      /must echo the need_source it was handed/);
    assert.match(must({ ...base, verdict: "maybe" }, "verdict maybe"), /is not one of pass, not-needed/);
    must({ ...base, verdict: undefined }, "no verdict at all");
    assert.match(must({ ...base, reason: "   " }, "a blank reason"), /needs a reason/);
    assert.match(must({ ...base, account: "" }, "a blank account"), /needs a account/);
    assert.match(must({ ...base, proposal: "" }, "a blank proposal"), /needs a proposal/);
    assert.match(must({ ...base, backlog_id: "ZAGTREQ-2a" }, "another ticket's backlog_id"),
      /is not the one it was handed/);
    // SHE ECHOES; SHE NEVER INVENTS -- so a pass against a context that carries no source at all
    // has nothing to echo and is refused rather than written on her word.
    const sourceless = validateVerdict(base, buildTaskContext({
      ticket: { backlog_id: TICKET }, source: null, source_row: null, kinds: [],
    }));
    assert.equal(sourceless.ok, false, "a pass against a context with no need_source must be refused");
    assert.ok(sourceless.refusals.some(r => /no need_source to check the pass against/.test(r)),
      `and must say why; got ${sourceless.refusals.join(" | ")}`);

    // ---- the --dry-run DOOR, with the credentials DELETED from its environment -------------------
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt280c-offline-"));
    try {
      const ctxPath = tmpJson(dir, "context.json", { ticket: TICKET, source: SRC, context: ctx });
      const naked = { ...process.env };
      delete naked.SUPABASE_URL;
      delete naked.SUPABASE_SERVICE_KEY;

      const good = cli([`--dry-run=${tmpJson(dir, "good.json", base)}`, `--context=${ctxPath}`], naked);
      assert.equal(good.status, 0,
        `--dry-run must accept the matching pass with NO credentials in env (exit 2 would mean it ` +
        `tried to reach the network); got status ${good.status} stdout=${good.stdout} stderr=${good.stderr}`);
      assert.match(good.stdout, /^ok/m, "and must say ok");

      // TWO refusals in ONE answer, on purpose: a validator that stopped at the first would show her
      // half the list and she would answer twice. The score is a `pass` rule, so this case keeps the
      // verdict a `pass` and breaks the score and the reason instead.
      const bad = cli([`--dry-run=${tmpJson(dir, "bad.json", { ...base, need_score: 6, reason: "  " })}`,
        `--context=${ctxPath}`], naked);
      assert.equal(bad.status, 1,
        `--dry-run must REFUSE with exit 1 (not exit 2 -- that would be a credential failure ` +
        `wearing a refusal's clothes); got status ${bad.status} stderr=${bad.stderr}`);
      assert.match(bad.stderr, /refused: ZAGTREQ-1a: the verdict needs a reason/,
        "and must print every refusal, naming the ticket");
      assert.match(bad.stderr, /refused: ZAGTREQ-1a: need_score must be a whole number 0-5/,
        "and must collect BOTH refusals, not stop at the first");
      const maybe = cli([`--dry-run=${tmpJson(dir, "maybe.json", { ...base, verdict: "maybe" })}`,
        `--context=${ctxPath}`], naked);
      assert.equal(maybe.status, 1, "and a verdict outside the two is refused at the door as well");
      assert.match(maybe.stderr, /refused: ZAGTREQ-1a: verdict maybe is not one of pass, not-needed/,
        "naming the ticket and the vocabulary it is outside of");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // ---- B. THE DISCRIMINATOR: live, end to end, through the real CLI -----------------------------
  //
  // WHAT MAKES IT DISCRIMINATING, stated as counts rather than as "it worked":
  //   * `runner_decisions where kind='requirement-check'` is 0 on the unchanged tree and STAYS 0
  //     with no caller -- no amount of database half moves it. This arm takes it to 1 and back.
  //   * exactly ONE `runner_before_images` row under that decision, whose `row_data.need_source` is
  //     STILL NULL -- which is what proves the image was written BEFORE the update rather than after.
  //     Slice 1 could only assert that inside a rolled-back MCP block; here it is end-to-end.
  //   * the reversal then reads the fixture's `need_source` back as NULL, so the undo line the CLI
  //     printed is a promise something actually keeps (pattern:169).
  //   * a `not-needed` writes an `audit_findings` row and ZERO new `backlog_items` rows.
  //   * `--prepare` on a WELL-FORMED source naming no row exits 1 having assembled NO prompt -- the
  //     arm that refuses an over-accepting caller, and the one that makes an untraceable claim free.
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-280 slice 2 arm B (the live discriminator)",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the caller's whole job is to read the " +
      "cited row and hand Victoria's verdict to apply_requirement_verdict(), and there is no " +
      "offline half of that (run with `node --env-file-if-exists=.env.local " +
      "tests/regression/run-all.js`). Arm A ran.");
  } else {
    const epics = await req(url, key,
      "epics?select=id,name,projects!inner(slug,status)&projects.slug=eq.backlog-intake&order=id.asc&limit=1");
    const mkt = await req(url, key, "market_records?select=id&order=id.asc&limit=1");
    const epic = epics.ok ? (epics.json ?? [])[0] : null;
    const rec = mkt.ok ? (mkt.json ?? [])[0] : null;

    if (!epic || !rec) {
      notRun("AGT-280 slice 2 arm B (the live discriminator)",
        `the live fixtures this caller is measured against are not both present right now ` +
        `(backlog-intake epics: ${epics.ok ? (epics.json ?? []).length : `read failed ${describe(epics)}`}, ` +
        `market_records rows: ${mkt.ok ? (mkt.json ?? []).length : `read failed ${describe(mkt)}`}) -- ` +
        "asserting against a substitute would measure something else");
    } else {
      await arm("B the caller, live end to end", async () => {
        assert.notEqual(epic.projects?.status, "executing",
          "THE PRECONDITION: the fixture epic's project must NOT be executing, or requirement_gate " +
          "would refuse the fixture insert and this arm would be measuring slice 1's trigger");
        const EPIC = epic.id;
        const MKT = rec.id;
        const GOOD = `nathan:market_records:${MKT}`;
        // THE FIXTURE IDS MUST LOOK LIKE REAL TICKET IDS, and that is not cosmetic. Measured live at
        // this ship: `runner_decisions_backlog_id_check` is `^[A-Z]+-[0-9]+[a-z]?$`, so a prefix
        // carrying DIGITS (the obvious `ZAGT280...`) or a hex suffix makes
        // apply_requirement_verdict()'s own record_decision() insert fail 23514 and the caller reads
        // as broken when it is the fixture that is malformed. The numeric suffix is random because
        // four runner lanes share this board (AGT-265); the trailing letter pairs the two fixtures.
        const suffix = crypto.randomInt(1000000, 9999999);
        const T_PASS = `ZAGTREQ-${suffix}a`;
        const T_NN = `ZAGTREQ-${suffix}b`;
        const SESSION = "agt-280-slice2-regression";

        const decisionsQ = "runner_decisions?select=id&kind=eq.requirement-check";
        const decisionsBefore = await count(url, key, decisionsQ);
        const findingsBefore = await count(url, key, "audit_findings?select=id");
        const fpBefore = await req(url, key, `audit_findings?select=id&fingerprint=eq.${FP}`);
        assert.ok(fpBefore.ok, `the fixture fingerprint must read; got ${describe(fpBefore)}`);
        const fpIds = new Set((fpBefore.json ?? []).map(r => r.id));

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt280c-live-"));
        let handlePass = null;
        let decisionsPeak = null;
        let reversalId = null;
        let findingId = null;
        let fixtureUuid = null;
        try {
          // --- the two fixture tickets -----------------------------------------------------------
          // Self-healing first: (source_file, row_ordinal) is unique, so a row left behind by a run
          // that was killed mid-arm would refuse this insert and read as a regression.
          await req(url, key, "backlog_items?backlog_id=like.ZAGTREQ-*", { method: "DELETE" });
          for (const [id, ordinal] of [[T_PASS, 999900001], [T_NN, 999900002]]) {
            const r = await req(url, key, "backlog_items",
              { method: "POST", prefer: "return=representation", body: ticket(id, EPIC, ordinal) });
            assert.ok(r.ok, `the ${id} fixture must insert (the gate must NOT fire here); got ${describe(r)}`);
            if (id === T_PASS) fixtureUuid = (Array.isArray(r.json) ? r.json[0] : r.json).id;
          }
          const backlogAfterFixtures = await count(url, key, "backlog_items?select=id");

          // --- (1) --prepare, live: the whole assembly path, and no model call ------------------
          const prep = cli([`--prepare`, `--ticket=${T_PASS}`, `--source=${GOOD}`, "--json"]);
          assert.equal(prep.status, 3,
            `--prepare must exit 3 (awaiting her answer); got ${prep.status} stderr=${prep.stderr.slice(0, 600)}`);
          const prepared = JSON.parse(prep.stdout);
          assert.equal(prepared.context.proposal.backlog_id, T_PASS, "the context must carry the ticket it was given");
          assert.equal(prepared.context.need_source, GOOD, "and the source it was given, byte for byte");
          assert.equal(prepared.context.need_source_row.id, MKT,
            "and THE CITED ROW'S OWN COLUMNS -- her question is what the row says");
          assert.ok(!("embedding" in prepared.context.need_source_row),
            "with `embedding` deleted: a 1536-float vector is bytes she cannot read");
          assert.ok(prepared.context.need_source_kinds.includes("nathan:market_records"),
            "and the live allowlist, which is data John edits with an UPDATE (pattern:2), never a " +
            `constant in this file; got ${JSON.stringify(prepared.context.need_source_kinds)}`);
          assert.ok(prepared.prompt_bytes > 500,
            `the prompt must have actually assembled through assemblePrompt(); got ${prepared.prompt_bytes} bytes`);
          assert.ok(typeof prepared.model === "string" && prepared.model.length > 0,
            "and resolveJudgmentModel() must have named the lane's model, never a literal in this file");

          // --- (2) --apply a pass: 0 -> 1, one image, image BEFORE update ------------------------
          const ctxPath = tmpJson(dir, "context.json", prepared);
          const passAnswer = {
            verdict: "pass", backlog_id: T_PASS, need_source: GOOD, need_score: 4,
            proposal: "AGT-280 regression fixture — the pass arm",
            reason: "the cited market record asks for exactly this (regression fixture)",
            account: "Ruled one proposal against one source",
          };
          const ap = cli([`--apply=${tmpJson(dir, "pass.json", passAnswer)}`, `--context=${ctxPath}`,
            `--session-name=${SESSION}`]);
          assert.equal(ap.status, 0, `--apply must succeed; got ${ap.status} stderr=${ap.stderr.slice(0, 800)}`);
          assert.match(ap.stdout, /select \* from public\.reverse_decision\('/,
            "and must print the undo line for a pass -- a decision nobody can find is not reversible");
          // Read off the UNDO LINE itself, not "the first uuid in stdout": the line above it echoes
          // the need_source, which IS a uuid, and a loose match silently grabs the market record's.
          handlePass = (ap.stdout.match(new RegExp(`reverse_decision\\('(${UUID.source})'`)) ?? [])[1] ?? null;
          assert.ok(handlePass, `the undo line must name the decision handle; got ${ap.stdout.slice(0, 400)}`);

          decisionsPeak = await count(url, key, decisionsQ);
          assert.equal(decisionsPeak, decisionsBefore + 1,
            `THE DISCRIMINATOR: runner_decisions kind='requirement-check' must go ` +
            `${decisionsBefore} -> ${decisionsBefore + 1}; it is 0 today and stays 0 with no caller`);
          const dec = await req(url, key,
            `runner_decisions?id=eq.${handlePass}&select=kind,backlog_id,session_name,status,ladder_work_class,expires_at`);
          const d = (dec.json ?? [])[0];
          assert.ok(d, `the decision must read back; got ${describe(dec)}`);
          assert.equal(d.kind, "requirement-check", "the decision's kind is the capability's own");
          assert.equal(d.backlog_id, T_PASS, "and it names the ticket it ruled");
          assert.equal(d.session_name, SESSION, "and its one author");
          assert.ok(d.expires_at, "and it carries a reversal window");

          const imgs = await req(url, key,
            `runner_before_images?decision_id=eq.${handlePass}&select=table_name,pk_value,row_data`);
          assert.ok(imgs.ok, `the before-images must read; got ${describe(imgs)}`);
          assert.equal((imgs.json ?? []).length, 1,
            `exactly ONE before-image under that decision; got ${(imgs.json ?? []).length}`);
          assert.equal(imgs.json[0].table_name, "backlog_items");
          assert.equal(imgs.json[0].pk_value, fixtureUuid,
            "pk_value is the row's uuid, so the promise is one reverse_decision() can keep (pattern:169)");
          assert.equal(imgs.json[0].row_data.need_source, null,
            "AND ITS need_source IS STILL NULL -- which is what proves the image was written BEFORE " +
            "the update, not after it");

          const back = await req(url, key,
            `backlog_items?backlog_id=eq.${T_PASS}&select=need_source,need_score`);
          assert.deepEqual((back.json ?? [])[0], { need_source: GOOD, need_score: 4 },
            "and the ticket reads back the values that were sent, not merely a 200");

          // --- (3) --apply a not-needed: a finding, and NO ticket row ---------------------------
          const prepNN = cli([`--prepare`, `--ticket=${T_NN}`, `--source=${GOOD}`, "--json"]);
          assert.equal(prepNN.status, 3, `--prepare for the not-needed fixture must exit 3; got ${prepNN.status} ${prepNN.stderr.slice(0, 400)}`);
          const nnAnswer = {
            verdict: "not-needed", backlog_id: T_NN, need_source: GOOD, need_score: 1,
            proposal: NOT_NEEDED_PROPOSAL,
            reason: "the cited market record is about something else (regression fixture)",
            account: "Refused one proposal against one source",
          };
          const an = cli([`--apply=${tmpJson(dir, "nn.json", nnAnswer)}`,
            `--context=${tmpJson(dir, "nncontext.json", JSON.parse(prepNN.stdout))}`,
            `--session-name=${SESSION}`]);
          assert.equal(an.status, 0, `--apply not-needed must succeed; got ${an.status} stderr=${an.stderr.slice(0, 800)}`);
          assert.ok(!/reverse_decision\(/.test(an.stdout),
            "and must print NO undo line: the handle is an audit_findings id, and audit_findings is " +
            "append-only (AGT-70) and outside reversible_tables() -- printing one would be a promise " +
            "nothing keeps");
          findingId = (an.stdout.match(new RegExp(`audit_findings (${UUID.source})`)) ?? [])[1] ?? null;
          assert.ok(findingId, `the not-needed line must name the findings handle; got ${an.stdout.slice(0, 400)}`);

          const f = await req(url, key,
            `audit_findings?id=eq.${findingId}&select=fingerprint,status,ruling,ruled_by,found_by,finding_type,family,kind,confidence,governing_fact,locations,proposed_resolution`);
          const fr = (f.json ?? [])[0];
          assert.ok(fr, `the finding must read back; got ${describe(f)}`);

          // THE IMMUTABLE BAND, asserted on every run. `audit_findings_guard()` lets ONLY status,
          // ruling, ruled_by, ruled_at, filed_backlog_id and john_call ever change, so every column
          // below is still exactly what apply_requirement_verdict() wrote when it first ran -- and a
          // caller that reached a different row, or none, cannot satisfy them.
          assert.equal(fr.fingerprint, FP, "fingerprinted on the proposal text, as the writer computes it");
          assert.equal(fr.found_by, "victoria", "found by Victoria");
          assert.equal(fr.ruled_by, "victoria", "and ruled by her");
          assert.equal(fr.finding_type, "proposal");
          assert.equal(fr.family, "other");
          assert.equal(fr.kind, "other");
          assert.equal(fr.confidence, "high");
          assert.equal(fr.governing_fact, GOOD, "and it records the source she read");
          assert.deepEqual(fr.locations, [NOT_NEEDED_PROPOSAL], "and the proposal it refused");
          assert.equal(fr.proposed_resolution, nnAnswer.reason, "and her one-line reason for refusing it");

          // THE TWO BRANCHES, AND WHY THIS IS A BRANCH AND NOT A WEAKENED ASSERTION. The writer
          // deduplicates on (fingerprint, iso_week), so the FIRST run of an ISO week appends the row
          // and the rest of that week's runs get its handle back with nothing written -- and this
          // file's own `finally` has by then settled last run's row to `not-a-defect`, because
          // audit_findings refuses a DELETE (AGT-70). So `status = 'listed'` is assertable exactly on
          // the run that wrote it, and on a repeat what is assertable is that the handle is THAT SAME
          // ROW and that nothing was appended. Both are derived from the pre-state read above rather
          // than from whichever branch happens to fire (pattern:127), and the first-of-week branch
          // runs at least once every week.
          const repeat = fpIds.has(findingId);
          if (repeat) {
            assert.equal(fr.status, "not-a-defect",
              "a repeat run in the same ISO week must get back THIS FILE's already-settled row, " +
              "never a freshly listed one");
            assert.match(fr.ruling, /agt-280-requirement-check\.test\.mjs/,
              "and it must be the row this file settled, by its own ruling");
          } else {
            assert.equal(fr.status, "listed",
              "status listed -- the proposal is on the findings board, and no ticket was written");
            assert.equal(fr.ruling, nnAnswer.reason, "with her reason as the ruling");
          }
          assert.equal(await count(url, key, "audit_findings?select=id"), findingsBefore + (repeat ? 0 : 1),
            repeat
              ? "this ISO week's fixture finding already existed, so the writer must append NOTHING"
              : "a not-needed must append exactly ONE audit_findings row");
          assert.equal(await count(url, key, "backlog_items?select=id"), backlogAfterFixtures,
            "and ZERO new backlog_items rows: a not-needed writes no ticket at all");
          const nnTicket = await req(url, key, `backlog_items?backlog_id=eq.${T_NN}&select=need_source,need_score`);
          assert.deepEqual((nnTicket.json ?? [])[0], { need_source: null, need_score: null },
            "and it leaves the proposed ticket's own columns untouched");

          // --- (4) a WELL-FORMED source naming no row: exit 1, and no prompt assembled ----------
          const nothing = cli([`--prepare`, `--ticket=${T_PASS}`, `--source=nathan:market_records:${NOWHERE}`, "--json"]);
          assert.equal(nothing.status, 1,
            `a well-formed citation of a row that does not exist must exit 1; got ${nothing.status}`);
          assert.match(nothing.stderr, /cites no row that exists/,
            "in the caller's own words, before any turn");
          assert.equal(nothing.stdout.trim(), "",
            "AND NOTHING ON STDOUT: no prompt was assembled, so an untraceable claim costs no tokens " +
            "(pattern:9, pattern:10)");
          const unlisted = cli([`--prepare`, `--ticket=${T_PASS}`, `--source=bob:market_records:${MKT}`, "--json"]);
          assert.equal(unlisted.status, 1, "and a real row under an unlisted who:table pair likewise exits 1");
          assert.match(unlisted.stderr, /is not one of runner_settings\.need_source_kinds/,
            "naming the allowlist it is not in");
          const noTicket = cli([`--prepare`, `--ticket=ZAGTREQ-9999999z`, `--source=${GOOD}`, "--json"]);
          assert.equal(noTicket.status, 1, "and a ticket that does not exist is refused first of all");
        } finally {
          // ---- RESIDUE. Every one of these runs even when an assertion above threw. -------------
          if (handlePass) {
            // The undo line the CLI printed, actually taken: it must put need_source back to NULL.
            const rev = await req(url, key, "rpc/reverse_decision", {
              method: "POST",
              body: {
                p_decision: handlePass, p_actor: "agt-280 slice 2 regression fixture",
                p_reason: "regression fixture cleanup — tests/regression/agt-280-requirement-check.test.mjs",
              },
            });
            if (rev.ok && Array.isArray(rev.json) && rev.json[0]) {
              reversalId = rev.json[0].reversal_id ?? null;
              const after = await req(url, key, `backlog_items?backlog_id=eq.${T_PASS}&select=need_source,need_score`);
              const row = (after.json ?? [])[0];
              if (row && (row.need_source !== null || row.need_score !== null)) {
                failures.push("[arm B] FAIL -- the printed undo line did NOT restore the ticket: " +
                  `need_source=${JSON.stringify(row.need_source)} need_score=${JSON.stringify(row.need_score)} ` +
                  `(reverse_decision said ${JSON.stringify(rev.json[0].outcome)}: ${rev.json[0].reason})`);
              }
            } else {
              failures.push(`[arm B] FAIL -- reverse_decision on the printed handle failed: ${describe(rev)}`);
            }
          }
          // audit_findings CANNOT be deleted (append-only, AGT-70). It is SETTLED instead, which the
          // same guard permits, so the fixture never sits on the `listed` board.
          if (findingId) {
            await req(url, key, `audit_findings?id=eq.${findingId}`, {
              method: "PATCH",
              body: {
                status: "not-a-defect",
                ruling: "regression fixture — tests/regression/agt-280-requirement-check.test.mjs; " +
                  "audit_findings is append-only (AGT-70) so this row is settled, not deleted",
                ruled_at: new Date().toISOString(),
              },
            });
          }
          // Images first (FK), then the reversal (its `reverses` points at the decision), then the
          // decision. runner_decision_patterns cascades.
          for (const id of [reversalId, handlePass].filter(Boolean)) {
            await req(url, key, `runner_before_images?decision_id=eq.${id}`, { method: "DELETE" });
          }
          if (handlePass) {
            await req(url, key,
              `runner_before_images?table_name=eq.runner_decisions&pk_value=eq.${handlePass}`, { method: "DELETE" });
          }
          for (const id of [reversalId, handlePass].filter(Boolean)) {
            await req(url, key, `runner_decisions?id=eq.${id}`, { method: "DELETE" });
          }
          for (const id of [T_PASS, T_NN]) {
            await req(url, key, `backlog_items?backlog_id=eq.${id}`, { method: "DELETE" });
          }
          fs.rmSync(dir, { recursive: true, force: true });

          const left = await count(url, key, decisionsQ);
          if (left !== decisionsBefore) {
            failures.push(`[arm B] FAIL -- RESIDUE: runner_decisions kind='requirement-check' is ` +
              `${left}, not the ${decisionsBefore} it started at`);
          }
          const leftTickets = await req(url, key, `backlog_items?select=backlog_id&backlog_id=like.ZAGTREQ-*`);
          if (leftTickets.ok && (leftTickets.json ?? []).length) {
            failures.push(`[arm B] FAIL -- RESIDUE: ${(leftTickets.json).length} ZAGTREQ-* fixture ticket(s) left behind`);
          }
          console.log(`    [AGT-280 slice 2 arm B] epic ${epic.name} (${EPIC}), market_records ${MKT}, ` +
            `requirement-check decisions ${decisionsBefore} -> ${decisionsPeak ?? "(not reached)"} -> ${left}, ` +
            `findings ${findingsBefore} -> ${await count(url, key, "audit_findings?select=id")}`);
        }
      });
    }
  }

  // ---- (c) the two things this suite CANNOT run here, DECLARED, never skipped (SES-310) ----------
  notRun("AGT-280 slice 2 — the pg_proc overload census",
    "the kickoff's check 3 asserts exactly FOUR agt280_* rows in schema_migrations and exactly one " +
    "overload of each function this ticket touches. This suite reaches Supabase only over " +
    "PostgREST, which cannot read schema_migrations or pg_proc at all, so neither is assertable " +
    "here. MEASURED AT THE SHIP over the MCP instead, and this slice writes NO SQL and NO " +
    "migration, so there is nothing new for a census to find: the four agt280_* migrations are " +
    "slice 1's and are unchanged.");
  notRun("AGT-280 slice 2 — a rolled-back transaction around arm B",
    "arm B's writes would ideally happen inside one transaction that is rolled back. PostgREST " +
    "cannot open one -- `Prefer: tx=rollback` was probed against this project at slice 1's ship " +
    "and was NOT honoured (the same wall tests/regression/ses-320-delivered-exit.test.mjs " +
    "records). So arm B uses create-then-remove with a count re-read in a `finally`, and the ONE " +
    "row it cannot remove -- the append-only audit_findings finding (AGT-70) -- is settled to " +
    "`not-a-defect` and deduplicated by fingerprint to at most one row per ISO week. Named here " +
    "rather than passed silently (pattern:77).");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
