// DeepBench v7.0.898 | tests/regression/agt-470-recheck-writer.test.mjs | AGT-470 -- THE RECHECK
// WRITER. The Researcher rechecks the claim catalog and the competitor records; until this ship it
// had no write path to either, so a recheck that found a wrong fact could only report it.
//
// THE DEFECT, measured live on tree 7c0f056 rather than reasoned about: `POST
// rpc/apply_claim_recheck` answered 404 `PGRST202` (`pg_proc` held zero overloads of the name), the
// Researcher's prompt block ended its SHARED FINDINGS paragraph with "Never write to
// market_records.", and the eleven rows `docs/research/2026-10-10-weekly-market.md` found wrong on
// 2026-10-10 were all still live and still wrong: four `vision_claims` rows
// (`VC-MAP-037/038/039/072`) and seven `market_records` rows from the 2026-10-05 and 2026-10-07
// competitor scans.
//
// WHAT IS GUARDED HERE, and what each arm can prove ALONE:
//
//   A (OFFLINE, zero network). THE DOC. The prompt block now names the writer and no longer carries
//     the prohibition that replaced it. The arm reads the block through the same begin/end markers
//     `scripts/check-routine-prompt.js` uses, never the whole file, because the file's prose outside
//     the block discusses `market_records` too and a whole-file match would pass on the wrong line.
//
//   B (LIVE, read-only). THE DISCRIMINATOR, and the only arm that cannot go green on `origin/dev`:
//     the RPC resolves at all, `VC-MAP-072` no longer credits the figures to the piece that carries
//     neither while its `provenance` names Gravitee, and each of the seven records is retired and
//     superseded by EXACTLY ONE `draft` row of the SAME `kind` pointing back at it. On `origin/dev`
//     the first assertion is a 404 `PGRST202` and the rest are false; no no-op passes any of them.
//
//   C (LIVE, read-only). THE FIVE REFUSALS, one per rule the writer enforces before it writes. Each
//     probe is ONE FIELD away from a payload shape that really landed (arm B's eleven rows are the
//     accepted counterpart -- the LOO-013 lesson: a rule that refuses everything and a rule that
//     refuses the right thing look identical from the refusal alone), and the arm BRACKETS itself
//     with a count of live `claim-recheck` decisions so a probe that wrote instead of refusing is a
//     failure rather than a silent mutation. `R5` is checked on BOTH targets, because "the text does
//     not differ" is two different comparisons (a claim's `claim_text`; a record's title AND body)
//     and a one-target arm would leave the other comparison unproven.
//
//   D (LIVE, read-only). THE GUARDS. `reversible_tables()` is UNWIDENED at seventeen names with
//     `vision_claims` on it and `market_records` off it -- that pairing is the whole reason the
//     record half retires-and-replaces instead of rewriting in place -- and the browser keys are
//     refused EXECUTE while `service_role` holds it.
//
// NO FIXTURE WRITES ANYWHERE (pattern:76). Every live arm is a read or a refusal, and the refusals
// are proven not to write by the bracketing count rather than by assumption. That is also why there
// is no both-ways arm here: `reverse_decision()` demotes the ladder rung of the class it reverses
// (`docs/STANDARDS.md` Section 2, "and a reversal takes them back"), so a nightly suite that
// reversed a fixture decision would walk `bug_fix` down the ladder one rung per run. The both-ways
// proof is the SHIP's, recorded on its card: the correction landed, `reverse_decision()` restored
// `VC-MAP-072` from the before-image with a byte-identical `claim_text`, and the correction was
// re-applied.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
// THE BLOCK IS EXTRACTED BY THE SCRIPT THAT OWNS THE CONVENTION, never by a second extractor here
// (pattern:14, and agt-138-researcher-routine.test.mjs reaches for the same two exports). The markers
// are each MENTIONED in the file's own prose table above the block, so a naive indexOf of the begin
// marker lands on the mention and slices a block that holds nothing. `extractBlock` refuses unless
// each marker is a whole line exactly once, which is what makes that failure impossible rather than
// merely unlikely.
import { extractBlock, ROUTINES } from "../../scripts/check-routine-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLAYBOOK_REL = "docs/runbooks/researcher-routine.md";

// The sentence the ship REPLACED, and the one it replaced it with. Both are held here as bytes so an
// edit to the block cannot be made green by editing this file to match it.
const RETIRED_SENTENCE = "Never write to market_records.";
const WRITER_SENTENCE =
  "If a record or claim is wrong, correct it: call public.apply_claim_recheck(p_cycle, p_session, p) " +
  "per fact - verdict corrected, unverified or holds, your reason, the corrected wording - and it " +
  "writes the before-image and the one reversible decision. Never UPDATE market_records or " +
  "vision_claims directly.";

// T4's seven record ids, in the order docs/design/agt-470-corrections.sql calls them.
const RECORD_IDS = [
  "f7b18516-1495-49cf-a12a-08acb0ae724e",
  "17a93705-d759-49a1-899a-b7f5cff58e32",
  "205c364a-b675-4990-86ea-b20cb1f94e3a",
  "901bea5e-1d3d-45cc-b76b-087b85c54714",
  "0d58cf7f-e4c6-4146-856a-68dabc642875",
  "ec7d8dfb-72c6-49d3-a887-4b75ea49dbdd",
  "31608e02-2a77-4fd6-a170-8fedaaa6209b",
];

// The misattribution the recheck removed, and the source it really came from.
const MISATTRIBUTION = "Fortune/Accenture-Wharton";
const REAL_SOURCE = "Gravitee";

// The seventeen names, and the two memberships the record half's whole design rests on.
const REVERSIBLE_COUNT = 17;

// The SQLSTATEs this feature refuses with, MEASURED on this ship rather than recalled. A bare
// plpgsql `raise` is P0001 and PostgREST answers it as HTTP 400 `code` "P0001";
// `using errcode = 'check_violation'` is 23514, likewise HTTP 400. A refusal arriving as any other
// code is a different refusal, which is why each arm names the one it expects.
const RAISE = "P0001";
const CHECK_VIOLATION = "23514";
// A role with no EXECUTE grant is refused by Postgres itself, not by the function body: 42501,
// which PostgREST answers as HTTP 401.
const NO_PRIVILEGE = "42501";

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

function promptBlock(src) {
  const r = ROUTINES.researcher;
  assert.ok(r && r.file === "researcher-routine.md",
    "check-routine-prompt.js must still know a `researcher` routine pointing at researcher-routine.md");
  return extractBlock(src, r).text;
}

// ---------------------------------------------------------------------------------------------
// transport (agt-493-ticket-validation.test.mjs's shape, column for column)
// ---------------------------------------------------------------------------------------------

async function req(url, key, q, { method = "GET", body } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}

const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 300)}`;
const rpc = (url, key, fn, args) => req(url, key, `rpc/${fn}`, { method: "POST", body: args ?? {} });

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

// ---------------------------------------------------------------------------------------------
// Arm A -- OFFLINE. The doc.
// ---------------------------------------------------------------------------------------------

export function armDoc(src) {
  const block = promptBlock(src);

  assert.ok(block.includes(WRITER_SENTENCE),
    "the prompt block must carry the writer sentence VERBATIM -- the routine is the copy and this " +
    "file is the source, so a paraphrase here is the second, drifting copy the convention exists to end");
  assert.ok(!block.includes(RETIRED_SENTENCE),
    `the prompt block still carries ${JSON.stringify(RETIRED_SENTENCE)} -- the Researcher has a ` +
    "write path now, and a block that forbids the write and describes it cannot both be followed");

  // ONE SENTENCE, no other line of the block. These five are the block's own load-bearing lines
  // (agt-138-researcher-routine.test.mjs arm A pins them too); if the edit had reflowed or trimmed
  // the block, at least one of them would have moved.
  for (const s of [
    "DEEPBENCH — THE RESEARCHER (GV-02",
    "research_note = '<VERDICT>",
    "researched_at = now()",
    "--agent=researcher --capability=research-class-lens",
    "Use them as LEADS, never as facts",
  ]) {
    assert.ok(block.includes(s),
      `the edit moved more than one sentence: the block no longer carries ${JSON.stringify(s)}`);
  }

  // THE SENTENCE IS IN THE BLOCK, AND ONLY THERE. The file's prose outside the markers discusses
  // `market_records` too, so a whole-file match would pass on prose the routine never copies; and a
  // second copy outside the block is the drifting duplicate the one-home rule exists to stop.
  assert.equal(src.split(WRITER_SENTENCE).length - 1, 1,
    "the writer sentence appears more than once in the file -- the block is its one home");
  assert.equal(block.split(WRITER_SENTENCE).length - 1, 1,
    "the writer sentence is in the file but not inside the prompt block -- the routine copies the " +
    "block, so a sentence outside it never reaches the Researcher");
}

// ---------------------------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------------------------

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  const CYCLE = "2b16018e-78b5-4bda-bac9-15268ad6e5cb";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  await arm("A the doc (offline)", async () => { armDoc(read(PLAYBOOK_REL)); });

  if (!url || !key) {
    notRun("AGT-470 arms B, C and D",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the writer is a database function and the " +
      "eleven corrected rows are rows, so there is no offline half of any of them (run with " +
      "`node --env-file-if-exists=.env.local tests/regression/run-all.js`)");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }

  // ---- B. THE DISCRIMINATOR, live and read-only ----------------------------------------------
  await arm("B the discriminator, live and read-only", async () => {
    // B1. The RPC RESOLVES. The probe is the R1 refusal on purpose: it is the cheapest payload that
    // reaches the function body at all, it writes nothing, and on origin/dev it comes back
    // PGRST202 instead -- which is the premise this ticket was filed on.
    const probe = await rpc(url, key, "apply_claim_recheck", { p_cycle: null, p_session: null, p: {} });
    assert.notEqual(probe.code, "PGRST202",
      `rpc/apply_claim_recheck does not resolve -- the writer is not deployed: ${describe(probe)}`);
    assert.equal(probe.code, RAISE,
      `the resolved writer must answer the no-author payload with its own R1 raise; got ${describe(probe)}`);

    // B2. VC-MAP-072: the misattribution is gone from the CLAIM TEXT and the real source is named in
    // the PROVENANCE. Both halves, because dropping the wrong citation without naming the right one
    // would leave the figures ungrounded, which is the same defect wearing a quieter face.
    const claims = await req(url, key,
      "vision_claims?claim_ref=eq.VC-MAP-072&select=claim_text,provenance,judgment_class,confidence");
    assert.ok(claims.ok && claims.json?.length === 1, `VC-MAP-072 must read; got ${describe(claims)}`);
    const c72 = claims.json[0];
    assert.ok(!c72.claim_text.includes(MISATTRIBUTION),
      `VC-MAP-072.claim_text still credits ${MISATTRIBUTION}, which carries neither figure`);
    assert.ok((c72.provenance ?? "").includes(REAL_SOURCE),
      `VC-MAP-072.provenance does not name ${REAL_SOURCE}, the survey both figures actually come from`);
    // The columns the writer must NEVER touch, read back rather than trusted: ck_vision_claim_class
    // takes only the four named forms and this claim's class was not the thing that was wrong.
    assert.equal(c72.judgment_class, "P2 - Inventive",
      "the recheck moved VC-MAP-072's judgment_class; the writer's column list does not include it");

    // B3. The seven records: retired, and superseded by EXACTLY ONE same-kind draft each. The count
    // is the assertion -- two replacements would read as two live competitors where there is one.
    for (const id of RECORD_IDS) {
      const orig = await req(url, key, `market_records?id=eq.${id}&select=status,kind`);
      assert.ok(orig.ok && orig.json?.length === 1, `${id} must read; got ${describe(orig)}`);
      assert.equal(orig.json[0].status, "retired",
        `${id} is ${orig.json[0].status}; a corrected record is retired, never rewritten in place`);

      const repl = await req(url, key, `market_records?supersedes=eq.${id}&select=id,kind,status`);
      assert.ok(repl.ok, `${id}'s replacement must read; got ${describe(repl)}`);
      assert.equal(repl.json.length, 1,
        `${id} has ${repl.json.length} rows superseding it, not exactly one`);
      assert.equal(repl.json[0].kind, orig.json[0].kind,
        `${id}'s replacement is kind ${repl.json[0].kind}, not the retired row's own ${orig.json[0].kind} ` +
        "-- a correction keeps the record's kind; `correction` is a different channel");
      assert.equal(repl.json[0].status, "draft",
        `${id}'s replacement is ${repl.json[0].status}; a replacement enters as a draft like any new record`);
    }
    console.log(`    [AGT-470 arm B] rpc resolves; VC-MAP-072 re-cited to ${REAL_SOURCE}; ` +
      `${RECORD_IDS.length}/${RECORD_IDS.length} records retired with exactly one same-kind draft each`);
  });

  // ---- C. THE FIVE REFUSALS, live and read-only ----------------------------------------------
  await arm("C the refusals, live and read-only", async () => {
    const live = () => count(url, key, "runner_decisions?kind=eq.claim-recheck&status=neq.reversed&select=id");
    const before = await live();

    // Read the rows the probes must NOT change, so R5's two comparisons are fed the real bytes
    // rather than a retyped near-copy (a near-copy is a legitimate correction and WOULD be accepted
    // -- which is exactly what makes this arm discriminating).
    const claim = await req(url, key, "vision_claims?claim_ref=eq.VC-MAP-037&select=claim_text");
    assert.ok(claim.ok && claim.json?.length === 1, `VC-MAP-037 must read; got ${describe(claim)}`);
    const rec = await req(url, key,
      `market_records?supersedes=eq.${RECORD_IDS[0]}&select=id,title,body`);
    assert.ok(rec.ok && rec.json?.length === 1, `${RECORD_IDS[0]}'s replacement must read; got ${describe(rec)}`);

    // The payload every probe below is ONE FIELD away from. It is not sent as-is: sending it would
    // be a twelfth correction. Its accepted counterpart is arm B's eleven landed rows.
    const base = {
      target: "claim", ref: "VC-MAP-037", verdict: "corrected", reason: "AGT-470 refusal probe",
      claim_text: "a text that differs from the row's",
    };
    const refuse = async (label, args, code, re) => {
      const r = await rpc(url, key, "apply_claim_recheck", args);
      assert.ok(!r.ok, `${label} must be REFUSED; it was accepted: ${describe(r)}`);
      assert.equal(r.code, code, `${label} must refuse with ${code}; got ${describe(r)}`);
      assert.ok(re.test(r.json?.message ?? ""), `${label} must refuse with ${re}; got ${describe(r)}`);
    };

    // R1 -- exactly one author. BOTH directions, because "exactly one" is two failures.
    await refuse("R1 both authors", { p_cycle: CYCLE, p_session: "probe", p: base },
      RAISE, /exactly one of p_cycle \/ p_session must be set/);
    await refuse("R1 neither author", { p_cycle: null, p_session: null, p: base },
      RAISE, /exactly one of p_cycle \/ p_session must be set/);

    // R2 -- a recheck without its reason is the stamp this ticket exists to replace. Whitespace
    // only, not absent: `btrim` is the rule, and an absent key would also fail a looser guard.
    await refuse("R2 blank reason", { p_cycle: CYCLE, p_session: null, p: { ...base, reason: "   " } },
      RAISE, /a recheck carries its one-line reason/);

    // R3 -- the vocabulary, and the one refusal the design pins to check_violation.
    await refuse("R3 verdict outside the three",
      { p_cycle: CYCLE, p_session: null, p: { ...base, verdict: "still-wrong" } },
      CHECK_VIOLATION, /verdict must be holds, corrected or unverified; got still-wrong/);

    // R4 -- the ref. THREE shapes of the same fact (`p` names no row this writer can reach): a
    // claim_ref that matches nothing, a target outside the two, and a record ref that is not a uuid.
    // The third is the cast guard: without it `v_ref::uuid` would raise 22P02 from the cast instead.
    await refuse("R4 unmatched claim_ref", { p_cycle: CYCLE, p_session: null, p: { ...base, ref: "VC-MAP-999" } },
      RAISE, /p names no row to recheck -- target claim, ref VC-MAP-999/);
    await refuse("R4 target outside the two", { p_cycle: CYCLE, p_session: null, p: { ...base, target: "napkin" } },
      RAISE, /p names no row to recheck -- target napkin/);
    await refuse("R4 record ref is not a uuid",
      { p_cycle: CYCLE, p_session: null, p: { ...base, target: "record", ref: "not-a-uuid" } },
      RAISE, /p names no row to recheck -- target record, ref not-a-uuid/);

    // R5 -- a `corrected` that corrects nothing, on BOTH targets.
    await refuse("R5 claim_text byte-identical to the row's",
      { p_cycle: CYCLE, p_session: null,
        p: { target: "claim", ref: "VC-MAP-037", verdict: "corrected", reason: "AGT-470 refusal probe",
             claim_text: claim.json[0].claim_text } },
      CHECK_VIOLATION, /a corrected recheck of VC-MAP-037 carries claim_text that differs/);
    await refuse("R5 title AND body byte-identical to the row's",
      { p_cycle: CYCLE, p_session: null,
        p: { target: "record", ref: rec.json[0].id, verdict: "corrected", reason: "AGT-470 refusal probe",
             title: rec.json[0].title, body: rec.json[0].body } },
      CHECK_VIOLATION, /carries a title or body that differs/);

    // THE BRACKET. Every rule is enforced BEFORE record_decision(), so a probe that slipped past one
    // would leave a twelfth live decision behind. This is what makes "it refused" mean "it wrote
    // nothing" rather than "it returned an error after writing".
    const after = await live();
    assert.equal(after, before,
      `a refusal probe WROTE: live claim-recheck decisions went ${before} -> ${after}. Every rule ` +
      "runs before the decision row, so a refusal must leave the count untouched");
    console.log(`    [AGT-470 arm C] 9 probes over 5 rules, all refused, live claim-recheck decisions ${before} -> ${after}`);
  });

  // ---- D. THE GUARDS, live and read-only -----------------------------------------------------
  await arm("D the guards, live and read-only", async () => {
    const names = await rpc(url, key, "reversible_tables");
    assert.ok(names.ok && Array.isArray(names.json),
      `rpc/reversible_tables must read as a list of names; got ${describe(names)}`);
    assert.equal(names.json.length, REVERSIBLE_COUNT,
      `reversible_tables() returns ${names.json.length} names, not ${REVERSIBLE_COUNT} -- this ticket ` +
      "widens nothing, and a widened vocabulary would promise an undo reverse_decision() cannot keep");
    assert.ok(!names.json.includes("market_records"),
      "market_records is on reversible_tables(); the record half's undo is the supersedes chain, and " +
      "putting the table on the vocabulary would promise a replay reverse_decision() does not do");
    assert.ok(names.json.includes("vision_claims"),
      "vision_claims is NOT on reversible_tables(); the claim half would then have no undo at all");

    if (!anon) {
      notRun("AGT-470 arm D's browser-key half",
        "no VITE_SUPABASE_ANON_KEY in env, so the anon/authenticated EXECUTE refusal cannot be " +
        "probed from here, and has_function_privilege() is not reachable over PostgREST (this repo " +
        "exposes no exec_sql RPC). What stands in its place is INSIDE the database and ran in the " +
        "same transaction as the CREATE: migration agt470_recheck_writer's trailing gate asserts " +
        "has_function_privilege FALSE for anon and authenticated and TRUE for service_role, and " +
        "raises -- rolling the whole migration back -- if any of the three is wrong, so the function " +
        "could not exist with the grants open (docs/design/agt-470-recheck-writer.sql T1(c)). The " +
        "ship also probed it live with the publishable key: 401/42501 for anon, 200 for service_role.");
      return;
    }
    const denied = await rpc(url, anon, "apply_claim_recheck",
      { p_cycle: null, p_session: null, p: {} });
    assert.ok(!denied.ok, `the browser key must be REFUSED EXECUTE; it was served: ${describe(denied)}`);
    assert.equal(denied.code, NO_PRIVILEGE,
      `the browser key must be refused by Postgres' own grant check (${NO_PRIVILEGE}), not by the ` +
      `function body -- a body-level refusal would mean the grant is open: ${describe(denied)}`);
    console.log(`    [AGT-470 arm D] reversible_tables() ${names.json.length} names, no market_records; ` +
      `browser key refused EXECUTE (${denied.status}/${denied.code})`);
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
