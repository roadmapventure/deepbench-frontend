// DeepBench v7.0.736 | tests/regression/agt-280-requirement-check.test.mjs | AGT-280 slice 2 --
// Victoria's `requirement-check` capability, its caller, and the `need_score` reorder of the two
// functions that decide what gets built next.
//
// WHAT SLICE 1 LEFT OWING, measured live 2026-09-29 on the unchanged tree rather than recalled:
// `capabilities` held ZERO `requirement-check` rows; `victoria` held ONE assignment,
// `solution-catalog`; there was no `scripts/requirement-check.js`; and `need_score` was set on 0 of
// 1165 `backlog_items` with NOTHING under `scripts/ api/ lib/ src/` reading either new column. A
// writer with no caller and a score with no reader are the two halves of "the capability shipped"
// that were not true.
//
// THE KICKOFF'S NAMED DISCRIMINATOR IS NOT THIS SHIP'S DISCRIMINATOR, and saying so is the point of
// this paragraph. The kickoff names arm A -- `has_function_privilege('anon', …)` false on the two
// slice-1 functions -- as the arm that is red on the unchanged tree and green only if this build
// landed. IT WAS PRE-SATISFIED: the hole was live on a public write path into `runner_decisions`,
// `audit_findings` and two ticket columns, so it was closed ahead of this build by migration
// `agt280_requirement_functions_anon_lockdown`. Arm A therefore still asserts a real and necessary
// property -- it would go red the day someone re-creates one of those functions without the revoke,
// which `pg_default_acl` makes the DEFAULT outcome (SES-315) -- but it is evidence about the
// platform, never evidence that `agt280_requirement_check` landed. THE DISCRIMINATOR FOR THIS SHIP
// IS ARM C, the reorder, and it was measured red-then-green with the same fixture; see its
// declaration below for both numbers.
//
// WHY ARM B PAIRS THE ROWS WITH A grep. A capability row whose slug appears nowhere in the repo is
// exactly the defect slice 1 left: four Supabase rows that read like a shipped capability and no
// code that could ever fire them. Asserting the rows alone would pass that state again, so arm B
// only goes green when the rows exist AND `scripts/requirement-check.js` names the slug.
//
// NO MODEL CALL, NO SPEND. Offline source reads plus REST reads. Nothing here writes.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { supportsTemperature } from "../../shared/models.js";
import {
  AGENT, CAPABILITY, TENANT, VERDICTS, AWAITING_ANSWER,
  parseNeedSource, tablesFromKinds, clipRow, buildTaskContext, validateAnswer,
} from "../../scripts/requirement-check.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CALLER = path.join(REPO, "scripts", "requirement-check.js");
const INTENT = "vc-requirement-intent";

// The SEVEN keys `apply_requirement_verdict()` reads out of the answer object, from its own body:
// `verdict`, `backlog_id`, `need_source`, `need_score`, `proposal` (the not-needed branch), `reason`
// and the platform's `account` receipt.
const SCHEMA_KEYS = ["verdict", "backlog_id", "need_source", "need_score", "proposal", "reason", "account"];

// The two slice-1 functions the kickoff's arm A names, plus the trigger function on the same path.
const SLICE1_FUNCTIONS = [
  "apply_requirement_verdict(uuid,text,jsonb)",
  "need_source_is_traceable(text)",
  "requirement_gate()",
];

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const text = await res.text();
  return text.trim() === "" ? [] : JSON.parse(text);
}

// ---- (offline) the pure half of the caller ------------------------------------------------------
function partPure() {
  assert.equal(AGENT, "victoria");
  assert.equal(CAPABILITY, "requirement-check");
  assert.equal(TENANT, "global");
  assert.deepEqual(VERDICTS, ["pass", "not-needed"],
    "the two words apply_requirement_verdict() accepts, in its order");

  // `who:table:id`, three non-blank parts -- the shape need_source_is_traceable() parses.
  assert.deepEqual(parseNeedSource("john:runner_directives:abc"),
    { who: "john", table: "runner_directives", id: "abc" });
  for (const bad of ["", null, "john:runner_directives", "john::abc", "a:b:c:d", "  :b:c"]) {
    assert.equal(parseNeedSource(bad), null, `${JSON.stringify(bad)} is not a need source`);
  }

  // THE ALLOWLIST IS DATA (pattern:2). The caller holds no table list of its own -- it derives the
  // tables from whatever `runner_settings.need_source_kinds` says, de-duplicated, in that order.
  assert.deepEqual(
    tablesFromKinds(["john:runner_directives", "john:runner_decisions", "john:runner_directives", "bad", "x:"]),
    ["runner_directives", "runner_decisions"],
    "duplicates collapse, malformed pairs are dropped, and the allowlist's own order is kept");
  assert.deepEqual(tablesFromKinds(null), []);

  // Clipping is pure: the row handed in is never written to.
  const row = { a: "x".repeat(50), b: 7, c: null, d: { deep: "y".repeat(50) } };
  const clipped = clipRow(row, 10);
  assert.equal(clipped.a.length, 11, "a long string is clipped and marked with an ellipsis");
  assert.equal(clipped.b, 7);
  assert.equal(clipped.c, null);
  assert.equal(row.a.length, 50, "the source row is untouched");

  const ctx = buildTaskContext({
    ticket: { backlog_id: "ZZZ-1", title: "T", description: "D", status: "open" },
    kinds: ["john:runner_directives"],
    candidates: { runner_directives: [{ id: "1" }] },
  });
  assert.equal(ctx.ticket.backlog_id, "ZZZ-1");
  assert.deepEqual(ctx.need_source_kinds, ["john:runner_directives"],
    "the allowlist travels VERBATIM, so she cites a pair that exists rather than one she invents");
  assert.equal(ctx.candidates.runner_directives.length, 1);
  assert.equal(buildTaskContext({ ticket: null, kinds: [], candidates: {} }), null);
  assert.ok(AWAITING_ANSWER.includes("exit 3"));
  console.log("  (pure) agent/capability/verdicts, need-source shape, data-driven allowlist, clipping -- PASS");
}

// ---- (offline) the validator, driven by a schema, both directions -------------------------------
function partValidator() {
  const schema = {
    type: "object",
    required: SCHEMA_KEYS,
    properties: {
      verdict: { type: "string", enum: ["pass", "not-needed"] },
      backlog_id: { type: "string", maxLength: 40 },
      need_source: { type: ["string", "null"], maxLength: 200 },
      need_score: { type: "integer", minimum: 1, maximum: 5 },
      proposal: { type: "string", maxLength: 400 },
      reason: { type: "string", maxLength: 1200 },
      account: { type: "string", maxLength: 100 },
    },
  };
  const good = {
    verdict: "pass", backlog_id: "AGT-273", need_source: "john:runner_directives:abc",
    need_score: 5, proposal: "AGT-273", reason: "the directive asks for exactly this",
    account: "Screened one proposed ticket",
  };
  assert.deepEqual(validateAnswer(good, schema, "AGT-273"), { ok: true, refusals: [] });

  // THE ARM THAT MATTERS. apply_requirement_verdict() takes the ticket id out of the ANSWER, not
  // out of the call, so an answer naming a different ticket would write a score onto a ticket
  // nobody screened -- under a reversible decision, on a real UPDATE.
  const strayed = validateAnswer({ ...good, backlog_id: "AGT-165" }, schema, "AGT-273");
  assert.equal(strayed.ok, false);
  assert.ok(strayed.refusals.some(r => r.includes("AGT-165") && r.includes("AGT-273")),
    "the refusal names both ids");
  // NEGATIVE CONTROL: the same answer, screened for the ticket it names, passes -- so the refusal
  // above is the comparison doing the work, not a validator that refuses everything.
  assert.deepEqual(validateAnswer({ ...good, backlog_id: "AGT-165" }, schema, "AGT-165"),
    { ok: true, refusals: [] });

  const out = validateAnswer({ ...good, verdict: "maybe", need_score: 9, account: "x".repeat(101) }, schema, "AGT-273");
  assert.equal(out.ok, false);
  assert.ok(out.refusals.length >= 3, "every refusal is collected, not just the first");
  assert.ok(out.refusals.some(r => r.includes("verdict")), "an unknown verdict word is refused");
  assert.ok(out.refusals.some(r => r.includes("<= 5")), "a score outside 1-5 is refused");
  assert.ok(out.refusals.some(r => r.includes("100 characters")), "the account receipt's cap is enforced");

  for (const key of SCHEMA_KEYS) {
    const missing = { ...good };
    delete missing[key];
    const r = validateAnswer(missing, schema, "AGT-273");
    assert.equal(r.ok, false, `a missing \`${key}\` is refused`);
    assert.ok(r.refusals.some(x => x.includes(key)));
  }

  // NO SCHEMA MEANS REFUSE, never pass. An intent row whose traits lost its schema must not become
  // a silent open door -- an ungraded answer reaching the writer is the whole risk.
  assert.equal(validateAnswer(good, null, "AGT-273").ok, false);
  assert.equal(validateAnswer("not an object", schema, "AGT-273").ok, false);
  console.log("  (validator) schema-driven, every refusal collected, stray backlog_id refused with its control -- PASS");
}

// ---- (B, offline half) the caller names the slug -------------------------------------------------
function partCallerSource() {
  assert.ok(fs.existsSync(CALLER), "scripts/requirement-check.js must exist -- a capability with no caller is the defect");
  const src = fs.readFileSync(CALLER, "utf8");
  const hits = src.split(CAPABILITY).length - 1;
  assert.ok(hits >= 1, `scripts/requirement-check.js must name "${CAPABILITY}" at least once; found ${hits}`);
  assert.ok(src.includes("rpc/apply_requirement_verdict"),
    "the caller hands the write to the function -- it must not write backlog_items itself");
  assert.ok(!/from\s+["']\.\.\/api\/prompt\/agent-prompt/.test(src) && src.includes("assemblePrompt"),
    "the prompt is assembled through assemblePrompt(), the one assembly path (§19b)");
  // The caller must NOT carry its own copy of the allowlist: that is the hardcoding pattern:2 exists
  // to remove, and it would drift from John's runner_settings row silently.
  assert.ok(!src.includes("nathan:market_records"),
    "no need_source_kinds literal in the caller -- the allowlist is John's data, read live");
  console.log(`  (B/offline) the caller exists, names ${CAPABILITY} ${hits}×, delegates the write, holds no allowlist literal -- PASS`);
}

async function run() {
  partPure();
  partValidator();
  partCallerSource();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "AGT-280 arms A and B (live): the anon/authenticated EXECUTE denial on the three slice-1 " +
        "functions and the four Supabase rows behind `requirement-check`",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are absent, so no live read is possible here. Re-run with " +
        "`node --env-file-if-exists=.env.local tests/regression/agt-280-requirement-check.test.mjs`. " +
        "Never green on absent credentials.",
    );
    return;
  }

  // ---- (A) the grant, BOTH directions, never a success flag ------------------------------------
  // `.claude/rules/supabase-column-grants.md` (SES-315): pg_default_acl grants EXECUTE to anon,
  // authenticated and service_role BY NAME at create time, so a function is open until a migration
  // revokes the three by name -- and a `REVOKE … FROM PUBLIC` reports success and changes nothing.
  // Asserting the denial alone would pass against a revoke that also took service_role's grant, i.e.
  // a lockdown that breaks the only caller; the pair is the arm.
  // has_function_privilege() is not reachable over PostgREST, so arm A is DECLARED rather than
  // silently skipped, with the numbers measured at this ship over the MCP -- see the declaration at
  // the end of this file. What IS reachable here is the fail-closed half: the three functions are
  // `security definer` and are called only through the service key, so a read of them with this key
  // must still work. If it stopped working, the revoke took service_role with it.
  const traceable = await pg(url, key, "rpc/need_source_is_traceable",
    { method: "POST", body: JSON.stringify({ p_source: "nathan:market_records:00000000-0000-0000-0000-000000000000" }) });
  assert.equal(traceable, false,
    "service_role still reaches need_source_is_traceable(), and a well-formed citation of a row " +
    "that does not exist reads false -- the lockdown did not break the only caller");

  // ---- (B) the four rows, live --------------------------------------------------------------------
  const caps = await pg(url, key,
    `capabilities?slug=eq.${CAPABILITY}&select=slug,name,execution_type,tenant_id,display_phrase,default_intent_slug`);
  assert.equal(caps.length, 1, `capabilities must hold exactly ONE ${CAPABILITY} row; got ${caps.length}`);
  assert.equal(caps[0].execution_type, "ai");
  assert.equal(caps[0].tenant_id, TENANT);
  assert.equal(caps[0].display_phrase, "screening the requirement");
  assert.equal(caps[0].default_intent_slug, INTENT,
    "the capability's own row answers which intent fires -- the caller never takes an --intent flag");

  const links = await pg(url, key,
    `capability_skill_profiles?capability_slug=eq.${CAPABILITY}&select=skill_profile_slug,level,is_required,display_order`);
  assert.equal(links.length, 1, `exactly ONE capability_skill_profiles row; got ${links.length}`);
  assert.deepEqual(links[0], { skill_profile_slug: INTENT, level: 3, is_required: true, display_order: 1 });

  const assigns = await pg(url, key,
    `agent_capability_assignments?capability_slug=eq.${CAPABILITY}&select=tenant_id,agent_id`);
  assert.equal(assigns.length, 1, `exactly ONE assignment; got ${assigns.length}`);
  assert.deepEqual(assigns[0], { tenant_id: TENANT, agent_id: AGENT });

  const profiles = await pg(url, key,
    `skill_profiles?slug=eq.${INTENT}&select=slug,skill_type_slug,tenant_id,execution_type,llm_provider,llm_model,api_key_source,max_tokens,temperature,traits`);
  assert.equal(profiles.length, 1, `exactly ONE ${INTENT} row; got ${profiles.length}`);
  const sp = profiles[0];
  assert.equal(sp.skill_type_slug, "intent");
  assert.equal(sp.tenant_id, "global");
  assert.equal(sp.execution_type, "ai");
  assert.equal(sp.llm_provider, "anthropic");
  assert.equal(sp.api_key_source, "platform");
  assert.equal(sp.max_tokens, 8000);
  assert.equal(sp.traits?.can_request_help, false);
  // NO STORED TEMPERATURE while the row names a family that rejects the parameter. The kickoff's
  // §4 spells `temperature` 0 AND the judgment lane's model; on today's board those two are
  // incompatible -- the lane is `claude-fable-5-1` and NO_TEMPERATURE_PREFIXES rejects it -- and
  // `agt-90-fable-temperature.test.mjs` went red on `vc-requirement-intent=0` until the follow-up
  // migration `agt280_requirement_intent_temperature` set it NULL. Asserted from the SAME constant
  // that guard reads, so the day the lane moves to an accepting family this follows it.
  if (!supportsTemperature(sp.llm_model)) {
    assert.equal(sp.temperature, null,
      `${INTENT} names ${sp.llm_model}, whose family rejects \`temperature\` -- the row must store none`);
  }

  // The model is the judgment lane's, read from the lane rather than compared to a literal --
  // a literal here would be a second home for the lane (pattern:93) and would go red the next time
  // John moves the lane, for the right behaviour.
  const lanes = await pg(url, key, "runner_model_lanes?lane=eq.judgment&select=model_id");
  assert.equal(sp.llm_model, lanes[0]?.model_id,
    "the intent runs on whatever model the judgment lane names");

  // THE SEVEN KEYS, exactly what apply_requirement_verdict() reads out of the answer.
  const required = sp.traits?.schema?.required ?? [];
  for (const k of SCHEMA_KEYS) {
    assert.ok(required.includes(k), `the intent's traits.schema must require \`${k}\`; it does not`);
  }
  assert.equal(required.length, SCHEMA_KEYS.length,
    `the schema must require exactly the ${SCHEMA_KEYS.length} keys the writer reads; got ${required.length}`);
  assert.deepEqual(sp.traits?.schema?.properties?.verdict?.enum, ["pass", "not-needed"]);
  assert.equal(sp.traits?.schema?.properties?.need_score?.minimum, 1);
  assert.equal(sp.traits?.schema?.properties?.need_score?.maximum, 5);

  // The live half of arm B: the validator that will grade her real answer is driven by THIS row's
  // schema, not by the copy written into this test. Running the offline fixture through the live
  // schema proves the two agree.
  const live = validateAnswer({
    verdict: "pass", backlog_id: "AGT-273", need_source: "john:runner_directives:abc",
    need_score: 5, proposal: "AGT-273", reason: "r", account: "Screened one proposed ticket",
  }, sp.traits.schema, "AGT-273");
  assert.deepEqual(live, { ok: true, refusals: [] }, "the stored schema accepts a well-formed verdict");
  assert.equal(validateAnswer({
    verdict: "pass", backlog_id: "AGT-273", need_source: "john:runner_directives:abc",
    need_score: 6, proposal: "AGT-273", reason: "r", account: "a",
  }, sp.traits.schema, "AGT-273").ok, false, "and refuses a 6 -- the stored bound is real");

  console.log(`  (B) capability/link/assignment/intent = 1/1/1/1, 7 schema keys, model ${sp.llm_model} off the judgment lane -- PASS`);

  // ---- the two columns still carry what slice 1 built -------------------------------------------
  const settings = await pg(url, key, "runner_settings?id=eq.1&select=need_source_kinds");
  assert.equal(settings[0]?.need_source_kinds?.length, 5,
    "the five who:table pairs are still the allowlist -- the caller reads them, so an empty one is a live outage");
  assert.ok(tablesFromKinds(settings[0].need_source_kinds).length >= 1,
    "and they resolve to at least one readable table");

  notRun(
    "AGT-280 arm A (the EXECUTE grants) and arm C (the need_score reorder, driven live)",
    "has_function_privilege, pg_proc, pg_get_functiondef and a BEGIN/ROLLBACK fixture are not " +
      "reachable over PostgREST (the SES-310 / SES-315 refusal, unchanged), and arm C's fixture " +
      "rewrites a live project's priority and a live ticket's need_score -- a permanent regression " +
      "test must never write those (pattern:76). Both were measured at this ship (2026-09-29, " +
      "v7.0.736) over the MCP, inside DO blocks ending in RAISE so every fixture rolled back, and " +
      "every count was re-read afterwards. " +
      "ARM A, and it was PRE-SATISFIED before this build ran (migration " +
      "agt280_requirement_functions_anon_lockdown), so it is evidence about the platform and NOT " +
      "evidence that agt280_requirement_check landed: EXECUTE for anon = false and authenticated = " +
      "false on all three of " + SLICE1_FUNCTIONS.join(", ") + ", service_role = true on all three; " +
      "migration agt280_requirement_check re-asserted both directions in its own trailing DO block, " +
      "extended the revoke to requirement_gate() (which the kickoff's (b) does not name), and " +
      "asserted anon=false / service_role=true on the two REPLACED functions as well, because a " +
      "replace that reset their ACLs would hand anon the whole pick path. " +
      "ARM C, THE REAL DISCRIMINATOR FOR THIS SHIP, same fixture on both trees: prime_directive_queue() " +
      "returns AGT-273 (project priority 2) and AGT-165 (priority 3); the fixture first TIES them by " +
      "setting AGT-165's project priority to 2, at which point the queue number decides and the order " +
      "is [1 AGT-165 (queue 33), 2 AGT-273 (queue 518)]. RED, on the unchanged tree: setting " +
      "AGT-273.need_score = 5 changed NOTHING -- [1 AGT-165, 2 AGT-273] before and after, the score " +
      "had no runtime. GREEN, after the migration: the same fixture returned [1 AGT-273, 2 AGT-165] " +
      "-- the 5 precedes its NULL peer. THE pattern:166 CONTROL, after the migration: with the real " +
      "priorities restored (2 vs 3) and the 5 moved to the LOWER-priority AGT-165, AGT-273 STILL held " +
      "pos 1 -- leverage and project priority are not weakened by the new key. " +
      "pg_proc: exactly 1 overload each of public.prime_directive_queue (identity ()) and " +
      "public.drain_epic_next (identity (p_cycle_id uuid)) -- UNCHANGED, no parameter added " +
      "(.claude/rules/supabase-function-signature.md); pg_get_functiondef names need_score 3× in " +
      "prime_directive_queue (projection + lanes b and c) and 1× in drain_epic_next, with the key at " +
      "`sort_project NULLS LAST, sort_need, sort_lane` and directly after `pj.priority` respectively. " +
      "THE WRITE PATH, driven end to end and rolled back: apply_requirement_verdict(cycle, null, " +
      "{pass, AGT-273, john:runner_directives:<live id>, 5, …}) returned decision " +
      "5bd88bdb-5c84-4660-8f43-87e6ad6c2768 with kind='requirement-check', wrote need_score=5 and the " +
      "need_source verbatim, and left exactly 1 backlog_items before-image with row_data NON-NULL " +
      "(the image comes BEFORE the update, so reverse_decision() can keep the promise); the same call " +
      "with a well-formed citation of a market_records row that does not exist RAISED 'AGT-280: " +
      "AGT-273 cites no traceable need source (…); it waits on the intake list' and wrote nothing; a " +
      "`not-needed` verdict returned audit_findings 17d6b6a2-73cb-4388-9dd7-3c750a99b703 and wrote NO " +
      "ticket row. ZERO RESIDUE on re-read after every rollback: backlog_items with need_score set = " +
      "0 of 1165, runner_decisions kind='requirement-check' = 0, audit_findings found_by='victoria' = " +
      "0, AGT-165's project back at priority 3. " +
      "ARM D (the caller's pass one) ran for real at this ship and is NOT declared here: " +
      "`node scripts/requirement-check.js --backlog=AGT-273 --cycle=<this cycle>` exited 3, printed a " +
      "57,598-byte prompt whose header reads 'Victoria Chen — Head of Product Strategy · capability " +
      "requirement-check' and which carries need_source_kinds, and wrote nothing; the refusal path " +
      "(`--answer=` naming AGT-165 with need_score 9 while screening AGT-273) exited 1 with BOTH " +
      "refusals printed and nothing sent.",
  );
}

export default run;
selfRun(import.meta.url, run);
