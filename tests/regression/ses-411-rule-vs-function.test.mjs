// DeepBench v7.0.528 | tests/regression/ses-411-rule-vs-function.test.mjs | SES-422 slice 3
//
// FEATURE: SES-411 -- the rule-vs-function check. The platform keeps ONE fact ("which refusals does
// the pre-boot gate apply") in four homes: the `THEN '<reason>'` literals in public.runner_should_boot()'s
// body, that function's own COMMENT enumeration, the `governance_rules` rows that name it, and the
// closed REASONS set ses-297-pre-boot-pickability.test.mjs ranges over. Nothing compared them until
// now. SES-410 is the proof it matters: a live edit on 2026-09-15 took `weekly_pace` out of the body
// while M5-16 went on saying the gate applies it, and the register and the body disagreed in
// production with no check anywhere that could see it.
//
// THE CONTROL IS REAL, NOT SYNTHETIC, and that is this test's whole claim to teeth. The pre-SES-410
// body is still captured in `runner_migration_downs/ses410_weekly_pace_stop`, so the live arm feeds
// the detector the function body the platform ACTUALLY shipped in its drifted state -- everything
// else (rules, comment, REASONS, overload count) held at today's live values -- and requires exactly
// one finding. A detector that passes on anything is the risk here; a green on today's data alone
// cannot tell "nothing is wrong" from "nothing is measured".
//
// PARTS
//   A  TODAY (pure) -- today's comment verbatim over a synthetic body carrying the seven refusal
//      literals plus one NON-refusal literal, against the four rules that govern the gate: 0.
//      Also pins that CLOSED_SETS.runner_should_boot IS the imported REASONS array, not a copy.
//   B  THE MISSING BRANCH (pure) -- drop the `weekly_pace` line and it is exactly ONE finding whose
//      pg_proc text says `body lacks weekly_pace` and does NOT say `REASONS lacks weekly_pace`,
//      because REASONS still carries it. Both halves matter: the finding names the home that is
//      wrong, not merely that something is.
//   C  THE OTHER HOME (pure) -- REASONS minus `weekly_pace` with today's body is the mirror finding
//      (`REASONS lacks`, never `body lacks`); both homes short is both lines on one finding.
//   D  THE COMMA INSIDE THE PARENTHESES (pure) -- `meter_stale (SES-389 / M5-15, runner_settings.meter_stale_hours)`
//      is ONE enumeration item. A plain `,` split makes it two, NEITHER of which parses, and the
//      token disappears silently -- a vacuous green in the one shape this comment actually has. The
//      case is arranged so the comment's item is the ONLY route to the token, with the control that
//      removes the item and requires the finding to go.
//   E  TWO SIGNATURES (pure) -- overloads 2 is one finding whose text is EXACTLY `overloads 2`
//      (.claude/rules/supabase-function-signature.md as a detector: an ambiguity PostgREST reports
//      to its caller as an empty result, never a crash).
//   F  VACUOUS CONTROL (SES-158) -- a mutation that leaves the body byte-equal must find nothing,
//      and an empty function list must find nothing. Without this, part B's single finding could be
//      an artefact of the harness rather than of the missing branch.
//   G  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY; notRun otherwise) -- rpc/rule_enforcing_functions
//      returns exactly one row (runner_should_boot, overloads 1); the detector over the live rules
//      is 0; the CAPTURED pre-SES-410 body is exactly 1 naming `weekly_pace`; and restoring that one
//      branch textually into the captured body clears it again.
//   H  ANON IS REFUSED (VITE_SUPABASE_ANON_KEY; notRun otherwise) -- the RPC is service_role-only,
//      asserted in the denial direction while G asserts the legitimate call still returns rows.
//
// DRY-RUN against the tree before this ticket (v7.0.527): every part FAILS at import --
// detectRuleFunctionDrift and CLOSED_SETS are not exported by scripts/audit-corpus.js -- and G
// additionally FAILS at its first request, because public.rule_enforcing_functions() does not exist
// and PostgREST answers rpc/rule_enforcing_functions with 404.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import { detectRuleFunctionDrift, CLOSED_SETS } from "../../scripts/audit-corpus.js";
import { REASONS } from "./ses-297-pre-boot-pickability.test.mjs";

// Pinned from the live COMMENT on public.runner_should_boot(), 2026-09-19. The live arm reads the
// real one; this copy exists so the pure arms can mutate a fixed starting point.
const COMMENT_TODAY =
  "Pre-boot pickability gate (SES-297 / M6-09). SEVEN refusals in precedence order: scheduler_off, " +
  "meter_stale (SES-389 / M5-15, runner_settings.meter_stale_hours), weekly_wall (M5-06), " +
  "weekly_pace (M5-16), no_budget_row, nothing_pickable, unaffordable (M5-06); otherwise pickable. " +
  "STABLE and read-only -- it reads prime_directive_queue(), never drain_epic_next(uuid). It carries " +
  "no token_cap: the ceiling has one home, public.resolve_day_token_cap().";

// A synthetic body, not the real one: what the detector reads is the set of `THEN '<literal>'`
// matches, so a faithful 7.7KB copy would add nothing and would rot. `final_day_rest_pct` is here on
// purpose -- the live body carries a THEN literal that is a column pick rather than a refusal, and
// the detector must NOT report it. Body-subset is never asserted.
const BODY_TODAY = [
  "CREATE OR REPLACE FUNCTION public.runner_should_boot()",
  " RETURNS jsonb LANGUAGE sql STABLE",
  "AS $function$",
  "  select jsonb_build_object('reason', case",
  "      when not s.scheduler_enabled                          THEN 'scheduler_off'",
  "      when u.reading_taken_at < now() - s.meter_stale_hours THEN 'meter_stale'",
  "      when u.all_models_pct >= 100                          THEN 'weekly_wall'",
  "      when u.all_models_pct >= s.pace_share                 THEN 'weekly_pace'",
  "      when b.id is null                                     THEN 'no_budget_row'",
  "      when q.id is null                                     THEN 'nothing_pickable'",
  "      when q.predicted_tokens > b.remaining                 THEN 'unaffordable'",
  "      else 'pickable' end,",
  "    'rest_pct', case when s.final_day THEN 'final_day_rest_pct' else null end)",
  "$function$",
].join("\n");

// The four governance_rules rows that govern this gate, pinned 2026-09-19. M5-15 and M5-16 are here
// verbatim because each carries a parsing trap the detector has to survive: M5-15's
// `runner_settings.meter_stale_hours` and M5-16's `detail.judgment_model` are periods with no space
// after them, and a clause splitter that ignores that puts the function name in one piece and the
// refusal it governs in another. M5-06 and M6-09 name no refusal at all -- their only anchor is the
// comment -- which is why (C) reads cited ids and not just bound ones.
const RULES = [
  { id: "M5-06", status: "live", statement:
    "Never start a ticket whose predicted cost exceeds the remaining weekly usage headroom; B32's daily ceiling does not bound the weekly wall." },
  { id: "M5-15", status: "live", statement:
    "Staleness of the freshest `runner_usage_readings` row has two consequences and each has exactly one home: past `runner_settings.meter_stale_hours` (default 2, John's number, `SES-389`) `public.runner_should_boot()` refuses the boot as `meter_stale`, naming `reading_taken_at` and the threshold; past 48h `public.resolve_day_token_cap()` RUNG 2 lowers the ceiling to `stale-floor`, which a standing daily max may not override. No other gate carries a staleness threshold or a cap." },
  { id: "M5-16", status: "live", statement:
    "A cycle fires only while the freshest `runner_usage_readings` row's `all_models_pct` is below the day-of-week share of the subscription week: day index × 100/7, whole days, where the week starts Friday 01:00 `America/Chicago` and day 1 is the first 24 hours. `public.runner_should_boot()` applies it as the refusal `weekly_pace`, after `weekly_wall` (which grades the same number) and before `no_budget_row`. Fable past its own share is NOT a refusal (`SES-395`): `public.judgment_model()` degrades the judgment lane to the orchestrator model and the gate reports it as `detail.judgment_model` / `detail.judgment_reason`." },
  { id: "M6-09", status: "live", statement:
    "Never boot a session to discover there is nothing to do: every scheduled fire is gated by a pre-boot pickability query, and a fire with nothing pickable closes without spawning a session." },
];

const mkFn = over => ({
  proname: "runner_should_boot",
  identity: "runner_should_boot()",
  definition: BODY_TODAY,
  comment: COMMENT_TODAY,
  overloads: 1,
  ...over,
});

const pgText = f => f.locations.find(l => l.location.startsWith("pg_proc/")).text;
const dropLine = (body, literal) => body.split("\n").filter(l => !l.includes(`'${literal}'`)).join("\n");
const withoutReason = r => ({ runner_should_boot: REASONS.filter(x => x !== r) });

async function run() {
  const results = [];

  // --- A: today ---------------------------------------------------------------------------------
  assert.strictEqual(CLOSED_SETS.runner_should_boot, REASONS,
    "CLOSED_SETS.runner_should_boot must BE the imported REASONS array -- a copy in audit-corpus.js " +
    "would be a second home for exactly the kind of claim this detector exists to find");
  assert.strictEqual(REASONS.length, 7, "the closed set is the seven refusals");
  assert.deepStrictEqual(detectRuleFunctionDrift(RULES, [mkFn()], CLOSED_SETS), [],
    "today's body, comment, rules and REASONS agree -- anything here is a false positive");
  results.push("today-is-clean");

  // --- B: the missing branch --------------------------------------------------------------------
  const drifted = dropLine(BODY_TODAY, "weekly_pace");
  assert.notStrictEqual(drifted, BODY_TODAY,
    "control: dropping the weekly_pace line changed NOTHING -- it cannot prove the detector has teeth (the SES-158 failure)");
  const b = detectRuleFunctionDrift(RULES, [mkFn({ definition: drifted })], CLOSED_SETS);
  assert.strictEqual(b.length, 1, `the missing branch must be exactly ONE finding; got ${JSON.stringify(b, null, 2)}`);
  assert.strictEqual(b[0].kind, "contradiction");
  assert.strictEqual(b[0].confidence, "high");
  assert.ok(pgText(b[0]).includes("body lacks weekly_pace"), `pg_proc text must name the body; got "${pgText(b[0])}"`);
  assert.ok(!pgText(b[0]).includes("REASONS lacks weekly_pace"),
    `REASONS still carries weekly_pace, so only the BODY may be reported short; got "${pgText(b[0])}"`);
  assert.ok(b[0].locations.some(l => l.location === "governance_rules/M5-16"),
    "the finding must be navigable to the rule that says the gate applies it");
  assert.ok(b[0].locations.some(l => l.location === "tests/regression/ses-297-pre-boot-pickability.test.mjs:REASONS"),
    "the finding must cite the closed set it was read against");
  results.push("missing-branch-is-one-finding");

  // --- C: the other home ------------------------------------------------------------------------
  const c1 = detectRuleFunctionDrift(RULES, [mkFn()], withoutReason("weekly_pace"));
  assert.strictEqual(c1.length, 1, "REASONS short of a refusal the body applies is itself a finding");
  assert.ok(pgText(c1[0]).includes("REASONS lacks weekly_pace"), `got "${pgText(c1[0])}"`);
  assert.ok(!pgText(c1[0]).includes("body lacks weekly_pace"),
    `the body still carries the branch, so it may not be reported short; got "${pgText(c1[0])}"`);
  const c2 = detectRuleFunctionDrift(RULES, [mkFn({ definition: drifted })], withoutReason("weekly_pace"));
  assert.strictEqual(c2.length, 1, "two short homes are still ONE finding about one function");
  assert.ok(pgText(c2[0]).includes("body lacks weekly_pace") && pgText(c2[0]).includes("REASONS lacks weekly_pace"),
    `both homes must be named; got "${pgText(c2[0])}"`);
  results.push("both-homes-reported-separately");

  // --- D: the comma inside the parentheses ------------------------------------------------------
  // M5-15's statement is replaced with one that names no function, so clause-binding cannot reach
  // `meter_stale`; the closed set drops it too. The comment's parenthesised item is then the ONLY
  // route to the token, and the control below removes that item and requires the finding to go.
  const rulesNoBind = RULES.map(r => r.id === "M5-15"
    ? { ...r, statement: "Staleness of the freshest reading has two consequences and each has exactly one home." }
    : r);
  const noMeter = dropLine(BODY_TODAY, "meter_stale");
  assert.notStrictEqual(noMeter, BODY_TODAY, "control: dropping the meter_stale line changed nothing (the SES-158 failure)");
  const d = detectRuleFunctionDrift(rulesNoBind, [mkFn({ definition: noMeter })], withoutReason("meter_stale"));
  assert.strictEqual(d.length, 1, `the comment's own item must carry the token; got ${JSON.stringify(d, null, 2)}`);
  assert.ok(pgText(d[0]).includes("body lacks meter_stale"),
    `a plain "," split breaks the item into two unparseable halves and the token vanishes; got "${pgText(d[0])}"`);
  const ITEM = "meter_stale (SES-389 / M5-15, runner_settings.meter_stale_hours), ";
  const commentNoItem = COMMENT_TODAY.replace(ITEM, "");
  assert.notStrictEqual(commentNoItem, COMMENT_TODAY, "control: removing the item changed nothing (the SES-158 failure)");
  assert.deepStrictEqual(
    detectRuleFunctionDrift(rulesNoBind, [mkFn({ definition: noMeter, comment: commentNoItem })], withoutReason("meter_stale")),
    [], "with the item gone nothing names meter_stale, so the line above came from the ITEM and not from somewhere else");
  results.push("parenthesised-item-parses-as-one");

  // --- E: two signatures ------------------------------------------------------------------------
  const e = detectRuleFunctionDrift(RULES, [mkFn({ overloads: 2 })], CLOSED_SETS);
  assert.strictEqual(e.length, 1, "a second overload is a finding on its own");
  assert.strictEqual(pgText(e[0]), "overloads 2",
    `nothing else is wrong in this case, so the overload count must be the WHOLE text; got "${pgText(e[0])}"`);
  results.push("overload-count-is-checked");

  // --- F: vacuous control (SES-158) -------------------------------------------------------------
  const vacuous = dropLine(BODY_TODAY, "weekly_cap");   // no such literal -- the mutation is a no-op
  assert.strictEqual(vacuous, BODY_TODAY, "the vacuous mutation must leave the body byte-equal");
  assert.deepStrictEqual(detectRuleFunctionDrift(RULES, [mkFn({ definition: vacuous })], CLOSED_SETS), [],
    "a mutation that changes nothing must find nothing -- otherwise part B proves nothing");
  assert.deepStrictEqual(detectRuleFunctionDrift(RULES, [], CLOSED_SETS), [], "no functions, no findings");
  results.push("vacuous-control-finds-nothing");

  // --- G/H: live --------------------------------------------------------------------------------
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) {
    notRun("the live arm (the RPC's one row, the live-rules 0, and the captured pre-SES-410 body's 1)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-09-19): " +
      "rule_enforcing_functions() returned 1 row (runner_should_boot, overloads 1, 7776-byte definition); " +
      "the detector over the live rules returned 0; the captured pre-SES-410 body (7285 bytes, THEN " +
      "literals scheduler_off/meter_stale/weekly_wall/no_budget_row/nothing_pickable/unaffordable) " +
      "returned exactly 1 finding, `body lacks weekly_pace`. Run: node --env-file-if-exists=.env.local tests/regression/ses-411-rule-vs-function.test.mjs");
    return results;
  }
  const hdr = k => ({ apikey: k, Authorization: `Bearer ${k}` });
  // The body is read ONCE: assert.ok evaluates its message eagerly, so awaiting r.text() inside it
  // consumes the stream the happy path then tries to parse ("Body has already been read").
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr(key) });
    if (!r.ok) assert.fail(`GET ${q} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
    return r.json();
  };

  const fns = await get("rpc/rule_enforcing_functions");
  assert.strictEqual(fns.length, 1, `exactly one public function cites a rule id today; got ${fns.length}`);
  assert.strictEqual(fns[0].proname, "runner_should_boot");
  assert.strictEqual(fns[0].overloads, 1, "a stale overload would make every unqualified call ambiguous");
  assert.ok(String(fns[0].definition).length > 1000 && String(fns[0].comment).includes("refusals"),
    "the RPC must return the real definition and comment, not nulls");
  results.push("rpc-returns-the-one-rule-enforcing-function");

  const liveRules = await get("governance_rules?select=id,statement,status");
  assert.ok(liveRules.length > 0, "governance_rules came back empty");
  assert.deepStrictEqual(detectRuleFunctionDrift(liveRules, fns, CLOSED_SETS), [],
    "LIVE: the body, its comment, the register and REASONS must agree today");
  results.push("live-today-is-clean");

  const downs = await get("runner_migration_downs?up_name=eq.ses410_weekly_pace_stop&select=prior_ddl");
  assert.strictEqual(downs.length, 1, "the captured pre-SES-410 down row is the control; it is missing");
  const priorBody = downs[0]?.prior_ddl?.captured?.[0]?.prior_definitions?.[0];
  assert.ok(typeof priorBody === "string" && priorBody.length > 1000,
    "prior_ddl.captured[0].prior_definitions[0] is not a function body");
  assert.notStrictEqual(priorBody, String(fns[0].definition),
    "control: the captured body is byte-equal to today's, so it cannot prove anything (the SES-158 failure)");
  const live = detectRuleFunctionDrift(liveRules, [{ ...fns[0], definition: priorBody }], CLOSED_SETS);
  assert.strictEqual(live.length, 1,
    `the shipped drifted body must be exactly ONE finding; got ${JSON.stringify(live.map(f => f.locations[0]), null, 2)}`);
  assert.strictEqual(pgText(live[0]), "body lacks weekly_pace",
    `the pre-SES-410 body is short of exactly one branch; got "${pgText(live[0])}"`);
  results.push("captured-pre-ses410-body-is-one-finding");

  // The other direction of the same control: put the branch back as TEXT and the finding clears.
  // The detector reads the body it is given, never the ticket history around it.
  const restored = priorBody.replace("THEN 'weekly_wall'", "THEN 'weekly_wall'\n      when false THEN 'weekly_pace'");
  assert.notStrictEqual(restored, priorBody, "control: the restore changed nothing (the SES-158 failure)");
  assert.deepStrictEqual(detectRuleFunctionDrift(liveRules, [{ ...fns[0], definition: restored }], CLOSED_SETS), [],
    "restoring the branch textually must clear the finding");
  results.push("restoring-the-branch-clears-it");

  if (anon) {
    const denied = await fetch(`${base}/rest/v1/rpc/rule_enforcing_functions`, { headers: hdr(anon) });
    assert.ok(!denied.ok,
      `anon executed rule_enforcing_functions (HTTP ${denied.status}) -- the REVOKE did not take, and a function body is not public material`);
    results.push("anon-cannot-execute-the-rpc");
  } else {
    notRun("the anon-denied half of the grant check",
      "VITE_SUPABASE_ANON_KEY absent; the service_role half above still ran. Asserted over MCP when this " +
      "shipped (2026-09-19), both directions: has_function_privilege('anon'|'authenticated', " +
      "'public.rule_enforcing_functions()', 'execute') = false with proacl {postgres=X/postgres,service_role=X/postgres}, " +
      "while service_role returned the one runner_should_boot row.");
  }

  return results;
}

selfRun(import.meta.url, run);
export default run;
