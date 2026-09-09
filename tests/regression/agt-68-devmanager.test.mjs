// DeepBench v7.0.434 | tests/regression/agt-68-devmanager.test.mjs | AGT-68 -- The Development
// Manager: the seed rows are real, the manager's judgment is bound to the pick path rather than to
// its own opinion of the board, and the ONE row action this ticket ships -- the ticket claim -- is
// driven in BOTH directions against the live database without a regression run ever claiming a real
// board ticket.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (1) THE FIVE SKILL TYPES AS A SET, NOT A COUNT. `length === 5` passes against five copies of one
// type. `run-project` carries FIVE types over FIVE links -- there is no Format Skill since the
// 2026-09-09 amendment (the executor's Format branch overwrites the Intent's output contract, so
// the contract lives on the Intent traits). THE KICKOFF DOC SAYS "six `dm-*` profiles" (Task 1) AND
// THE SEED CARRIES FIVE; the seed is the authority and the wording drift is recorded here rather
// than fixed silently -- the same drift AGT-64's, AGT-65's, AGT-66's and AGT-67's tests each
// recorded.
//
// (2) THE MODEL IS ASSERTED AGAINST runner_model_lanes, NOT AGAINST THE STRING "claude-opus-5". A
// literal here would be a second copy of the lane table -- the drift `SES-313` created that table
// to end -- and it would stay green through a lane change that had silently moved every management
// step onto a different model. The Development Manager runs on the ORCHESTRATOR lane, so the
// assertion reads that lane live and compares.
//
// (3) THE KNOWLEDGE SKILL'S traits.source MUST BE "inline". SES-341: db-assembly.js only puts a
// knowledge-type Skill's stored text into the prompt when its traits say the text is inline;
// without it the section is treated as fetched-per-call, renders empty, and is OMITTED. The manager
// would then be asked to read instruments it was never told the names of -- and, being a competent
// model handed a rich task_context, would still return a confident, well-formed assignment. That is
// the failure mode this line exists for, and it is invisible in every other arm of this file.
//
// (4) THE INTENT'S SCHEMA IS DRIVEN THROUGH THE SHIPPED VALIDATOR, WITH A MUTANT. "the schema
// parses" is worth almost nothing: `JSON.parse` succeeding says the row is JSON, not that it is a
// contract. So the live schema is handed to `validateAgentVerdict()` -- the SAME function
// scripts/run-project.js imports from scripts/verifier.js and actually gates an answer with --
// once with a well-formed assignment (must pass) and once with `action: "auto-assign"` (must be
// rejected, BY NAME). That mutant is the one shaped like this driver's worst failure: an action
// that reads like an assignment, is truthy, and is not in the enum.
//
// (5) THE `action` BRANCH IS CLOSED, ASSERTED FROM THE OTHER SIDE. The driver branches stop / report
// / assign. Written as "stop, else report, else assign", any unrecognised action becomes a ROW
// ACTION -- the single most expensive direction for this file to fail in. `answerErrors` refuses an
// action outside `ACTIONS`, and this asserts it with the same `auto-assign` mutant, so the guard is
// proven independently of whether the schema caught it first. Two gates, both driven.
//
// (6) THE PICK IS READ LIVE AND THE STATE FILE IS EVIDENCE, NEVER AN INSTRUCTION. `--dry-run` pass
// one is run as a real subprocess against the live board and its `pick` is asserted EQUAL to
// `runner_should_boot().detail.pick` -- object-deep, not just the id, because "the manager never
// re-derives the pick" is a claim about the whole object and a reconstruction that agreed on the id
// alone would satisfy a weaker check. THE NEGATIVE CONTROL: that same state file, with ONE string
// mutated, is fed back through `--answer` and the driver must REFUSE it and name the drift. Without
// the negative control the equality assertion proves only that two reads of one function agree.
//
// (7) RULE B40 IS DRIVEN IN BOTH DIRECTIONS ON THE REAL DATABASE, ON FIXTURE ROWS. Two
// `backlog_items` fixtures are inserted -- one unclaimed, one claimed 30 seconds ago by a
// fictitious peer -- and the SHIPPED `claimQueryFor()` is PATCHed against each: the first returns 1
// row (claimed) and the second returns 0 (refused, a live peer holds it). This is Task 3's
// "`--answer` with an unclaimed fixture claims it; with a claimed fixture it refuses", proven
// against Postgres rather than against a mock. The fixtures carry `epic_id = NULL` and
// `queue = NULL`, which is what keeps them out of `project_progress`, `project_blockers` and the
// standings entirely, and they are deleted in a `finally` with a before-image assertion that the
// board held no row by those ids first.
//
// WHAT IS DELIBERATELY NOT DRIVEN LIVE, stated rather than left to be discovered. The driver's own
// `assign` branch is exercised end-to-end under `--dry-run`, so the PATCH inside it never fires in
// a suite run. Firing it would mean claiming whatever ticket the board's pick path currently names,
// during a regression run, on a repo where 5-7 sessions are concurrent -- the exact collision rule
// B40 exists to prevent. So the claim is split at a seam instead: `claimQueryFor()` (what is sent)
// is driven against Postgres in arm (7), and `claimOutcome()` (what the row count means) is driven
// with both row counts in the pure arm. Together they cover the branch; neither alone would.
//
// NO MODEL CALL AND NO SPEND. Whether the Skill text yields an assignment that names the pick path's
// own ticket is the kickoff's attended QA, run once against this ship's own commit.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  ACTIONS,
  CLAIM_TTL_HOURS,
  DEVMANAGER_AGENT_ID,
  ENGINES,
  EXIT_AWAITING_ANSWER,
  EXIT_CANNOT_RUN,
  RUN_PROJECT_CAPABILITY,
  answerErrors,
  claimOutcome,
  claimQueryFor,
  handoffContextFor,
  parseArgs,
  stateDrift,
  statePathFor,
  wallReading,
} from "../../scripts/run-project.js";
// THE SAME VALIDATOR THE DRIVER GATES WITH, imported from the same place the driver imports it.
// A second copy here would let this file pass while the shipped path used a different predicate.
import { validateAgentVerdict } from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

const AGENTS_REL = "src/data/agents.js";
const DRIVER_REL = "scripts/run-project.js";

const INTENT_SLUG = "dm-run-intent";
const KNOWLEDGE_SLUG = "dm-knowledge-platform";
const GUARDRAILS_SLUG = "dm-guardrails";
const SKILL_SLUGS = ["dm-identity", KNOWLEDGE_SLUG, "dm-behavior", INTENT_SLUG, GUARDRAILS_SLUG];
// Named as a SET rather than counted -- `length === 5` passes against five copies of one type.
const SKILL_TYPES = ["identity", "knowledge", "behavior", "intent", "guardrails"];

// The lane this agent belongs to. The MODEL is not written here on purpose -- see header note (2).
const LANE = "orchestrator";

// The project this ticket's own QA manages, and the only project row the live arms read.
const PROJECT = "governance-agents";

// The two must_not clauses that keep the manager a manager. A manager that may build, or that may
// write a status, has deleted the separation the whole governance lane exists for.
const FORBIDDEN = [
  "build, design or verify anything itself",
  "write done, a verdict or a status on a ticket",
];

// A well-formed answer, and the one-key mutant that must be rejected. Exported so the predicate is
// checkable rather than invisible inside one assertion.
export const GOOD_ANSWER = Object.freeze({
  project: PROJECT,
  action: "assign",
  assignment: {
    backlog_id: "SES-000",
    capability_slug: "design-kickoff",
    engine: "session",
    reason: "Top of the pick path and undesigned, so the kickoff comes before any build.",
  },
  report: "1 assigned, 11 open.",
  needs_john: [],
});
// `auto-assign` is truthy, reads like an assignment, and is not in the enum. See header notes 4/5.
export const BAD_ACTION_MUTANT = Object.freeze({ ...GOOD_ANSWER, action: "auto-assign" });

// A state object shaped like the one the driver writes, for the pure arms.
function fixtureState(overrides = {}) {
  return {
    project: PROJECT,
    step: 1,
    cycle_id: null,
    pick: { lane: "selfbuild", backlog_id: "SES-000", title: "a ticket" },
    pick_row: { backlog_id: "SES-000", title: "a ticket" },
    roster: [
      { agent_id: "designer", capability_slug: "design-kickoff", default_intent_slug: "ds-kickoff-intent", execution_type: "ai", engines: [...ENGINES] },
      { agent_id: "builder", capability_slug: "build-ticket", default_intent_slug: "bd-build-intent", execution_type: "ai", engines: [...ENGINES] },
      { agent_id: DEVMANAGER_AGENT_ID, capability_slug: RUN_PROJECT_CAPABILITY, default_intent_slug: INTENT_SLUG, execution_type: "ai", engines: [...ENGINES] },
    ],
    ...overrides,
  };
}

export default async function run() {
  // == Source arm: bench completeness (STANDARDS.md Section 11) =================================
  const agentsSrc = read(AGENTS_REL);
  assert.ok(/devmanager:\s*\{[^}]*skin:[^}]*hair:[^}]*collar:[^}]*extra:[^}]*border:/.test(agentsSrc),
    "AVATAR_CFG.devmanager must exist in src/data/agents.js with all five keys (STANDARDS.md Section 11)");
  assert.ok(/devmanager:\s*\{\s*subject:\s*"they",\s*object:\s*"them",\s*possessive:\s*"their"\s*\}/.test(agentsSrc),
    "AGENT_PRONOUNS.devmanager must be they/them/their");

  const { AGENTS, OFF_BENCH_AGENT_IDS } = await import("../../src/data/agents.js");
  assert.ok(!AGENTS.some(a => a && a.id === DEVMANAGER_AGENT_ID),
    "the Development Manager must NOT be in the static AGENTS list (AGT-68 Task 4) -- governance " +
    "agents stay off the Bench until the exit review rules on how they render");
  assert.ok(OFF_BENCH_AGENT_IDS.includes(DEVMANAGER_AGENT_ID),
    "the Development Manager must be in OFF_BENCH_AGENT_IDS, or SE-03 reports its avatar/pronoun " +
    "entries as stale orphans -- a false red, and the list is also SE-03's obligation to check them harder");

  // == Pure arm: the walls, failing closed in both directions ==================================
  const clearWalls = {
    shouldBoot: { should_boot: true, reason: "pickable" },
    dayTokenCap: { rest_wall_hit: false, cap_source: "stale-floor", rest_pct: 85 },
    schedulerGate: { verdict: "run", reason: "not a scheduled cycle" },
  };
  const clear = wallReading(clearWalls);
  // THE POSITIVE CONTROL FIRST. Without it every mutant below could be passing because the function
  // returns `blocked: true` unconditionally, and the whole arm would be measuring nothing.
  assert.equal(clear.blocked, false, `a clear board must read clear, or every mutant below is vacuous: ${JSON.stringify(clear.standing)}`);
  assert.deepEqual(clear.standing, []);

  for (const [what, mutant] of [
    ["should_boot false", { ...clearWalls, shouldBoot: { should_boot: false, reason: "no pickable item" } }],
    ["runner_should_boot() unread", { ...clearWalls, shouldBoot: undefined }],
    ["the weekly rest wall", { ...clearWalls, dayTokenCap: { rest_wall_hit: true, rest_pct: 96 } }],
    ["resolve_day_token_cap() unread", { ...clearWalls, dayTokenCap: { error: "not read: --cycle-id was not given" } }],
    ["a paced scheduler", { ...clearWalls, schedulerGate: { verdict: "paced", reason: "off the clock grid" } }],
    ["a verdict this file has never seen", { ...clearWalls, schedulerGate: { verdict: "something-new", reason: "?" } }],
    ["scheduler_gate() unread", { ...clearWalls, schedulerGate: null }],
  ]) {
    const r = wallReading(mutant);
    assert.equal(r.blocked, true,
      `${what} must stand as a wall. An UNREAD instrument counts too: "we could not tell" and "we ` +
      `are clear" are the same value to a caller that treats a missing reading as absent, and that ` +
      `is how a cycle spends past a budget nobody could read.`);
    assert.ok(r.standing.length >= 1 && r.standing.every(s => typeof s === "string" && s.includes(":")),
      `${what} must be NAMED, or the manager cannot say which wall stands: ${JSON.stringify(r.standing)}`);
  }
  // `stale-floor` narrows the day's allowance; it is NOT a stop. Treating it as one would stop the
  // runner every time John went two days without typing his meter numbers -- and this board is on
  // the stale floor right now, so the arm above would be reading a permanently blocked wall.
  assert.equal(wallReading({ ...clearWalls, dayTokenCap: { rest_wall_hit: false, cap_source: "stale-floor" } }).blocked, false,
    "a stale-floor cap is a smaller number, not a wall");

  // == Pure arm: the state file is evidence, never an instruction ==============================
  const st = fixtureState();
  assert.deepEqual(stateDrift(st, { lane: "selfbuild", backlog_id: "SES-000" }), [],
    "a state that agrees with the live pick must produce no drift, or the mutant below is vacuous");
  const drifted = stateDrift(st, { lane: "selfbuild", backlog_id: "SES-999" });
  assert.ok(drifted.length >= 1 && drifted.some(d => d.includes("SES-999") && d.includes("SES-000")),
    `a state file naming a different pick than the board does must be refused, and the refusal must ` +
    `name BOTH ids -- editing one string in the state file is otherwise a way to have this driver ` +
    `claim any ticket at all, with the agent honestly agreeing because it was shown the edit. got: ${JSON.stringify(drifted)}`);
  assert.ok(stateDrift(st, null).length >= 1, "a state with a pick against a board with none must be refused");

  // == Pure arm: the answer against the state it was given =====================================
  assert.deepEqual(answerErrors(GOOD_ANSWER, st), [],
    "a well-formed assignment on the state's own pick must be accepted, or every refusal below is vacuous");

  const refusals = [
    ["a ticket the pick path did not name",
      { ...GOOD_ANSWER, assignment: { ...GOOD_ANSWER.assignment, backlog_id: "SES-999" } },
      /may not re-order the board/],
    ["the management step assigned back to itself",
      { ...GOOD_ANSWER, assignment: { ...GOOD_ANSWER.assignment, capability_slug: RUN_PROJECT_CAPABILITY } },
      /loop, not a handoff/],
    ["a capability that is not on the roster",
      { ...GOOD_ANSWER, assignment: { ...GOOD_ANSWER.assignment, capability_slug: "write-the-code" } },
      /not on the live governance roster/],
    ["an engine outside the two the platform has",
      { ...GOOD_ANSWER, assignment: { ...GOOD_ANSWER.assignment, engine: "cloud" } },
      /is not one of/],
    ["an action outside the closed set (header note 5)",
      BAD_ACTION_MUTANT,
      /not one of assign, stop, report/],
    ["a stop that smuggled an assignment in with it",
      { ...GOOD_ANSWER, action: "stop" },
      /a stop assigns nothing/],
    ["an answer about a different project",
      { ...GOOD_ANSWER, project: "selfbuild" },
      /this run is managing/],
  ];
  for (const [what, answer, pattern] of refusals) {
    const errs = answerErrors(answer, st);
    assert.ok(errs.length >= 1, `${what} must be refused`);
    assert.ok(errs.some(e => pattern.test(e)),
      `${what} must be refused BY NAME, or the exit-2 message tells nobody what to fix: ${JSON.stringify(errs)}`);
  }
  assert.deepEqual(answerErrors({ ...GOOD_ANSWER, action: "report", assignment: null }, st), [],
    "a report that assigns nothing is a valid answer");
  assert.deepEqual([...ACTIONS], ["assign", "stop", "report"], "the closed action set is the Intent's three");

  // == Pure arm: rule B40, both directions, and the query that carries it ======================
  const cutoff = new Date(Date.now() - CLAIM_TTL_HOURS * 3600 * 1000).toISOString();
  const q = claimQueryFor("SES-000", cutoff);
  assert.ok(q.startsWith("backlog_items?backlog_id=eq.SES-000"), `the claim must filter on the ticket's identity: ${q}`);
  assert.ok(q.includes("status=neq.done"), "a done ticket is not claimable");
  assert.ok(q.includes("or=(claimed_by.is.null") && q.includes("claimed_at.lt."),
    `rule B40's 24h-expiry guard must ride IN the query so the DATABASE decides, not this file -- a ` +
    `check-then-claim pair is what let cycles e36d4379 and 4da5a7bd both build ADM-1 seventeen ` +
    `seconds apart. got: ${q}`);
  assert.equal(CLAIM_TTL_HOURS, 24, "rule B40's expiry window");
  assert.equal(claimOutcome([{ claimed_by: "me" }]).ok, true, "1 row -> it's yours (rule B40)");
  assert.equal(claimOutcome([]).ok, false, "0 rows -> someone holds it (rule B40)");
  assert.ok(/live peer holds this ticket/.test(claimOutcome([]).reason || ""), "the refusal must say why");
  assert.equal(claimOutcome([{}, {}]).ok, false,
    "more than one row from a claim filtered on a unique backlog_id means the identity filter is " +
    "gone; taking the first row would turn a broken filter into a successful-looking claim");

  // == Pure arm: the derived paths and the step bound ==========================================
  assert.equal(path.basename(statePathFor(os.tmpdir(), PROJECT, 2)), `run-project-${PROJECT}-2.json`);
  assert.ok(!statePathFor(os.tmpdir(), "../../etc/passwd", 1).includes(".."),
    "a project slug must not be able to walk out of the scratch directory");
  assert.ok(parseArgs(["--project=x", "--step=9", "--max-steps=8"]).error,
    "--step past --max-steps must be refused at the door -- the chain is one invocation per step, " +
    "so this is the only place a runaway management loop can be stopped");
  assert.ok(parseArgs(["--step=1"]).error, "--project is required");
  assert.equal(parseArgs(["--project=x", "--dry-run"]).dryRun, true);

  // == Pure arm: the handoff never names an agent (Rule #1, one hop later) =====================
  const handoff = handoffContextFor({ answer: GOOD_ANSWER, state: st });
  assert.equal(handoff.handed_over_by, RUN_PROJECT_CAPABILITY,
    "a handoff row names the CAPABILITY that produced it, never an agent -- Rule #1 is about an " +
    "agent's data naming another agent, and a handoff carrying a name would be exactly that");
  assert.equal(handoff.backlog_id, GOOD_ANSWER.assignment.backlog_id);
  const supplied = handoffContextFor({ answer: { assignment: { ...GOOD_ANSWER.assignment, task_context: { mine: true } } }, state: st });
  assert.deepEqual(supplied, { mine: true }, "the manager's own task_context is handed over verbatim when it supplies one");

  // == Source arm: the driver never omits the intent slug (the AA-188 defect) ==================
  const driverSrc = read(DRIVER_REL);
  assert.ok(/intent_slug:\s*intentSlug/.test(driverSrc),
    "the assembly must pass intent_slug explicitly: db-assembly.js does NOT fall back to " +
    "capabilities.default_intent_slug (AA-188) -- it filters EVERY Intent-type Skill out, so a " +
    "prompt built without it carries no output contract and no decision procedure while still " +
    "looking complete");
  assert.ok(/default_intent_slug/.test(driverSrc) && /rosterRow\.default_intent_slug/.test(driverSrc),
    "the HANDED-OVER capability's intent slug must be read off its own capability row too -- the " +
    "same defect, one hop later, on the prompt this driver hands the next role");
  // The claim's BODY, not the file: the header prose names `updated_at` precisely to say it is not
  // written, so a whole-file grep would fail on its own explanation. This slices the one line that
  // becomes the PATCH payload.
  const claimBody = /body:\s*JSON\.stringify\(\{\s*claimed_by:[^}]*\}\)/.exec(driverSrc);
  assert.ok(claimBody, "the claim's PATCH body must be a literal object in scripts/run-project.js");
  assert.ok(/claimed_by/.test(claimBody[0]) && /claimed_at/.test(claimBody[0]) && !/updated_at/.test(claimBody[0]),
    "the claim must set claimed_by/claimed_at and NOTHING else (SES-316): stamping updated_at on a " +
    `claim is what made a decision recorded minutes earlier un-restorable. got: ${claimBody[0]}`);

  // == Live arm ================================================================================
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-68 live arm (seed rows + the orchestrator-lane pin + the Intent contract + rule B40 on fixtures + the pick-path equality and its negative control)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name " +
      "(docs/runbooks/session-setup.md step 1b) and re-run: " +
      "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js");
    return;
  }

  const H = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
  const rest = async (p, init = {}) => {
    const r = await fetch(`${url}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
    if (!r.ok) throw new Error(`${init.method || "GET"} ${p} -> ${r.status} ${await r.text()}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };
  const rpc = async (name, body = {}) => rest(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) });

  const agent = (await rest(`agents?id=eq.${DEVMANAGER_AGENT_ID}&select=id,code,lane,is_active`))[0];
  assert.ok(agent, "no agents row for 'devmanager' -- apply the AGT-68 section of docs/design/ga-agents-seed.sql");
  assert.equal(agent.code, "GV-01");
  assert.equal(agent.lane, "governance", "the Development Manager must be in the governance lane (SES-330)");
  assert.equal(agent.is_active, true);
  const productRoster = await rest("agents?is_active=eq.true&lane=eq.product&select=id");
  assert.ok(!productRoster.some(a => a.id === DEVMANAGER_AGENT_ID),
    "the Development Manager must not appear in the product roster the delegation broker reads " +
    "(lib/project-manager.js filters lane=eq.product) -- RULE #1: no agent's data names another agent");

  const profiles = await rest(`skill_profiles?slug=in.(${SKILL_SLUGS.join(",")})&select=slug,skill_type_slug,traits,guardrails,llm_model`);
  assert.equal(profiles.length, SKILL_SLUGS.length, `expected ${SKILL_SLUGS.length} dm-* skill_profiles, got ${profiles.length}`);
  const typesPresent = new Set(profiles.map(p => p.skill_type_slug));
  for (const t of SKILL_TYPES) assert.ok(typesPresent.has(t), `Skill type "${t}" missing from the Development Manager's profiles`);

  const links = await rest(`capability_skill_profiles?capability_slug=eq.${RUN_PROJECT_CAPABILITY}&select=skill_profile_slug`);
  assert.equal(links.length, SKILL_SLUGS.length,
    `${RUN_PROJECT_CAPABILITY} must link ${SKILL_SLUGS.length} Skill profiles (five types, no Format ` +
    `Skill; the kickoff's "six dm-*" wording is stale and the seed is the authority), got ${links.length}`);
  assert.deepEqual(links.map(l => l.skill_profile_slug).sort(), [...SKILL_SLUGS].sort());

  const assigns = await rest(`agent_capability_assignments?agent_id=eq.${DEVMANAGER_AGENT_ID}&select=capability_slug`);
  assert.deepEqual(assigns.map(a => a.capability_slug), [RUN_PROJECT_CAPABILITY]);
  const cap = (await rest(`capabilities?slug=eq.${RUN_PROJECT_CAPABILITY}&select=slug,execution_type,default_intent_slug`))[0];
  assert.equal(cap.execution_type, "ai");
  assert.equal(cap.default_intent_slug, INTENT_SLUG,
    "the capability must default to the run Intent -- scripts/run-project.js reads THIS column to " +
    "pass intent_slug, and a null one silently deletes the decision procedure from the prompt (AA-188)");

  // -- The lane pin (header note 2) ------------------------------------------------------------
  const laneRow = (await rest(`runner_model_lanes?lane=eq.${LANE}&select=lane,model_id`))[0];
  assert.ok(laneRow, `no runner_model_lanes row for the ${LANE} lane -- SES-313's table is the one home for this`);
  for (const p of profiles) {
    assert.equal(p.llm_model, laneRow.model_id,
      `${p.slug}.llm_model is "${p.llm_model}" but the ${LANE} lane is "${laneRow.model_id}" -- the ` +
      "Development Manager is the orchestrator lane's agent, and a literal model id in the Skill row " +
      "is a second copy of the lane table (the drift SES-313 created that table to end)");
  }

  // -- The inline-knowledge trait (header note 3) ----------------------------------------------
  const knowledge = profiles.find(p => p.slug === KNOWLEDGE_SLUG);
  assert.equal(knowledge.traits && knowledge.traits.source, "inline",
    `${KNOWLEDGE_SLUG}.traits.source must be "inline" (SES-341) -- db-assembly.js otherwise treats ` +
    "the section as fetched-per-call, renders it empty and omits it, and the manager is asked to " +
    "read instruments it was never told the names of while still returning a confident assignment");

  // -- The Intent's schema, driven through the SHIPPED validator (header note 4) ---------------
  const intent = profiles.find(p => p.slug === INTENT_SLUG);
  const schema = intent.traits && intent.traits.schema;
  assert.ok(schema && schema.type === "object" && Array.isArray(schema.required),
    "the Intent's traits.schema must parse as an object schema with a `required` array");
  assert.deepEqual(schema.properties.action.enum, [...ACTIONS],
    "the action must be the three-value enum the driver branches on; a fourth state is where " +
    "'assign it anyway' would live");
  assert.deepEqual(schema.properties.assignment.properties.engine.enum, [...ENGINES],
    "the engine enum is the platform's two: a session sub-agent on subscription tokens, or the " +
    "capability executor on API dollars (dm-knowledge-platform)");
  for (const k of ["project", "action", "assignment", "report", "needs_john"]) {
    assert.ok(schema.required.includes(k),
      `the Intent must REQUIRE "${k}" -- an answer with no ${k} is a management step with a hole in ` +
      `it. required: ${JSON.stringify(schema.required)}`);
  }
  const good = validateAgentVerdict(schema, GOOD_ANSWER);
  assert.ok(good.ok, `a well-formed answer must satisfy the live schema: ${JSON.stringify(good.errors)}`);
  const mutant = validateAgentVerdict(schema, BAD_ACTION_MUTANT);
  assert.ok(!mutant.ok,
    'validateAgentVerdict() must reject action: "auto-assign" against the live schema -- an action ' +
    "that reads like an assignment and is not in the enum is this driver's worst failure shape, and " +
    "a predicate that cannot reject it is not measuring the contract");
  assert.ok(mutant.errors.some(e => /action/.test(e)),
    `the rejection must name the offending key: ${JSON.stringify(mutant.errors)}`);

  // -- The separation of powers ----------------------------------------------------------------
  const guards = profiles.find(p => p.slug === GUARDRAILS_SLUG);
  const mustNot = (guards.guardrails && guards.guardrails.must_not) || [];
  for (const clause of FORBIDDEN) {
    assert.ok(mustNot.some(m => m.includes(clause)),
      `${GUARDRAILS_SLUG}.must_not must still contain "${clause}" -- a manager that may build, or ` +
      `that may write a status, is the separation the governance lane exists for, deleted. ` +
      `got: ${JSON.stringify(mustNot)}`);
  }
  const must = (guards.guardrails && guards.guardrails.must) || [];
  assert.ok(must.some(m => /pick path as computed/.test(m)),
    `${GUARDRAILS_SLUG}.must must carry the pick-path clause -- it is the one rule answerErrors() ` +
    "enforces in code, and the agent has to be told it too");
  assert.ok(must.some(m => /claim the ticket before assigning/.test(m)),
    `${GUARDRAILS_SLUG}.must must carry the claim-first clause`);

  // == Live arm: rule B40 driven both ways on fixture rows (header note 7) =====================
  const tag = `AGT68FIX-${Date.now().toString(36).toUpperCase()}`;
  const freeId = `${tag}-FREE`;
  const heldId = `${tag}-HELD`;
  // BEFORE-IMAGE. The board must hold no row by these ids, or the cleanup below would delete
  // somebody else's ticket -- and a fixture arm that can destroy real data is worse than no arm.
  const before = await rest(`backlog_items?backlog_id=in.(${freeId},${heldId})&select=backlog_id`);
  assert.deepEqual(before, [], `fixture ids ${freeId}/${heldId} must not already exist on the board`);
  let inserted = false;
  try {
    // epic_id NULL and queue NULL keep these out of project_progress, project_blockers and the
    // standings entirely (`queue IS NULL` = out of the standings, B4/SES-113); tier 'later' is what
    // lets `type` stay NULL under ck_backlog_type_when_promoted.
    await rest("backlog_items", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        // The null claim columns are spelled out rather than omitted: PostgREST refuses a bulk
        // insert whose objects do not carry the SAME key set ("All object keys must match").
        { backlog_id: freeId, tier: "later", title: "AGT-68 regression fixture — unclaimed", status: "open", source_file: "tests/regression/agt-68-devmanager.test.mjs", row_ordinal: 0, claimed_by: null, claimed_at: null },
        { backlog_id: heldId, tier: "later", title: "AGT-68 regression fixture — held by a live peer", status: "open", source_file: "tests/regression/agt-68-devmanager.test.mjs", row_ordinal: 1, claimed_by: "a-live-peer", claimed_at: new Date(Date.now() - 30_000).toISOString() },
      ]),
    });
    inserted = true;

    const now = new Date();
    const ttlCutoff = new Date(now.getTime() - CLAIM_TTL_HOURS * 3600 * 1000).toISOString();
    const patch = id => rest(claimQueryFor(id, ttlCutoff), {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ claimed_by: "agt-68-regression", claimed_at: now.toISOString() }),
    });

    const wonRows = await patch(freeId);
    const won = claimOutcome(wonRows);
    assert.ok(won.ok, `the SHIPPED claim query must claim an UNCLAIMED ticket: ${won.reason}`);
    assert.equal(won.holder, "agt-68-regression");

    const lostRows = await patch(heldId);
    const lost = claimOutcome(lostRows);
    assert.equal(lost.ok, false,
      "the SHIPPED claim query must return 0 rows for a ticket a live peer claimed 30 seconds ago " +
      "-- this is rule B40's whole point, and it is the database enforcing it, not this file");
    // The refusal must be because the PEER STILL HOLDS IT, not because the row vanished.
    const stillHeld = (await rest(`backlog_items?backlog_id=eq.${heldId}&select=claimed_by`))[0];
    assert.equal(stillHeld.claimed_by, "a-live-peer",
      "the refused claim must have left the peer's claim untouched -- a PATCH that matched nothing " +
      "and a PATCH that overwrote the peer both return no error, and only this tells them apart");
  } finally {
    if (inserted) {
      await rest(`backlog_items?backlog_id=in.(${freeId},${heldId})`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
        .catch(e => console.log(`  [AGT-68] WARNING: fixture cleanup failed (${e.message}); delete ${freeId} and ${heldId} by hand`));
      const after = await rest(`backlog_items?backlog_id=in.(${freeId},${heldId})&select=backlog_id`).catch(() => []);
      assert.deepEqual(after, [], "the fixture rows must be gone -- a regression run must leave the board as it found it");
    }
  }

  // == Live arm: the driver, end to end, with its negative control (header note 6) =============
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "agt68-"));
  const node = process.execPath;
  const driver = path.join(ROOT, DRIVER_REL);
  const runDriver = extra => spawnSync(node, [driver, `--project=${PROJECT}`, `--scratch=${scratch}`, "--dry-run", "--json", ...extra],
    { encoding: "utf8", env: { ...process.env } });

  const cycleRow = (await rest("runner_cycles?select=id&order=started_at.desc&limit=1"))[0];
  const passOne = runDriver([`--cycle-id=${cycleRow.id}`]);
  assert.equal(passOne.status, EXIT_AWAITING_ANSWER,
    `pass one must exit ${EXIT_AWAITING_ANSWER} (AWAITING THE MANAGER'S ANSWER): the state was ` +
    `written and NO row was touched. It is not 2 (the driver ran its half) and not 1 (nothing was ` +
    `judged). got ${passOne.status}: ${passOne.stderr}`);
  const emitted = JSON.parse(passOne.stdout.trim().split("\n").pop());
  assert.equal(emitted.ok, false,
    "an exit-3 payload must not say ok: an answer that has not been asked for yet is not a success, " +
    "and AGT-67's own attended QA found this exact key seeding the defect the exit code exists to expose");
  assert.equal(emitted.recorded, false);

  const stateOnDisk = JSON.parse(fs.readFileSync(emitted.state_file, "utf8"));
  const liveBoot = (await rpc("runner_should_boot"))[0];
  const livePick = liveBoot.detail && liveBoot.detail.pick ? liveBoot.detail.pick : null;
  // DEEP, not just the id. "The manager never re-derives the pick" is a claim about the whole
  // object; a reconstruction that agreed on the id alone would satisfy a weaker check.
  assert.deepEqual(stateOnDisk.pick, livePick,
    "state.pick must be runner_should_boot().detail.pick VERBATIM -- dm-guardrails.must: 'use the " +
    "pick path as computed, never a re-derived order', and this driver is where that would break first");
  assert.ok(Array.isArray(stateOnDisk.roster) && stateOnDisk.roster.length >= 5,
    `the roster must be read LIVE off agent_capability_assignments (Rule #1), not held in any Skill row: ${JSON.stringify(stateOnDisk.roster?.length)}`);
  assert.ok(stateOnDisk.output_contract && stateOnDisk.output_contract.required,
    "the Intent's own stored schema must ride in the task_context -- that is how the contract " +
    "reaches the sub-agent through the executor's OWN renderer, rather than by this driver " +
    "appending to an assembled prompt (SES-331)");
  assert.ok(fs.existsSync(emitted.prompt_file) && fs.statSync(emitted.prompt_file).size > 2000,
    "pass one must leave the assembled prompt on disk");

  // THE NEGATIVE CONTROL. One string mutated in the state file, and the driver must refuse.
  if (livePick) {
    const mutatedState = path.join(scratch, "mutated.json");
    fs.writeFileSync(mutatedState, JSON.stringify({ ...stateOnDisk, pick: { ...stateOnDisk.pick, backlog_id: "SES-000000" } }), "utf8");
    const answerFile = path.join(scratch, "answer.json");
    const capOnRoster = stateOnDisk.roster.find(r => r.capability_slug !== RUN_PROJECT_CAPABILITY);
    fs.writeFileSync(answerFile, JSON.stringify({
      project: PROJECT, action: "assign", report: "one step", needs_john: [],
      assignment: { backlog_id: "SES-000000", capability_slug: capOnRoster.capability_slug, engine: "session", reason: "the mutated state said so" },
    }), "utf8");
    const refused = runDriver([`--cycle-id=${cycleRow.id}`, `--state-file=${mutatedState}`, `--answer=${answerFile}`]);
    assert.equal(refused.status, EXIT_CANNOT_RUN,
      `a mutated state file must be REFUSED (exit ${EXIT_CANNOT_RUN}), because the pick is re-read ` +
      `live and the file is only evidence that the manager was shown the truth. got ${refused.status}: ${refused.stdout}${refused.stderr}`);
    const refusedPayload = JSON.parse(refused.stdout.trim().split("\n").pop());
    assert.equal(refusedPayload.kind, "refused");
    assert.ok((refusedPayload.drift || []).some(d => d.includes("SES-000000") && d.includes(livePick.backlog_id)),
      `the refusal must name both the state's pick and the board's: ${JSON.stringify(refusedPayload.drift)}`);

    // AND THE POSITIVE CONTROL FOR THE SAME PATH: the SAME answer, with the pick left alone, is
    // accepted and prints the assigned capability's prompt. Without this the arm above would pass
    // against a driver that refuses everything.
    //
    // It needs a clear board, and refusing under a standing wall is the CORRECT behaviour, so a
    // walled board declares the part rather than failing it. The declaration is what keeps the gap
    // visible instead of the arm quietly never running.
    if (stateOnDisk.walls.blocked) {
      notRun("AGT-68 assignment positive control",
        `a wall stands right now (${stateOnDisk.walls.standing.join("; ")}), and refusing an assign ` +
        "under a wall is this driver's correct behaviour -- so the accept path cannot be driven " +
        "here. Re-run when runner_should_boot(), resolve_day_token_cap() and scheduler_gate() are clear.");
      fs.rmSync(scratch, { recursive: true, force: true });
      console.log("[AGT-68] seed rows, lane pin, Intent contract, rule B40 fixtures and the pick-path negative control all asserted; the accept path is declared NOT RUN behind a standing wall");
      return;
    }
    const goodAnswerFile = path.join(scratch, "good-answer.json");
    fs.writeFileSync(goodAnswerFile, JSON.stringify({
      project: PROJECT, action: "assign", report: "one step", needs_john: [],
      assignment: { backlog_id: livePick.backlog_id, capability_slug: capOnRoster.capability_slug, engine: "session", reason: "top of the pick path" },
    }), "utf8");
    const accepted = runDriver([`--cycle-id=${cycleRow.id}`, `--state-file=${emitted.state_file}`, `--answer=${goodAnswerFile}`]);
    assert.equal(accepted.status, 0,
      `an assignment on the board's own pick must be accepted: got ${accepted.status}: ${accepted.stdout}${accepted.stderr}`);
    const acceptedPayload = JSON.parse(accepted.stdout.trim().split("\n").pop());
    assert.equal(acceptedPayload.kind, "assigned");
    assert.equal(acceptedPayload.backlog_id, livePick.backlog_id);
    assert.equal(acceptedPayload.capability_slug, capOnRoster.capability_slug);
    assert.equal(acceptedPayload.claimed, false,
      "--dry-run must claim NOTHING -- this arm runs on the real board's real pick, and a suite " +
      "that claimed it would be the collision rule B40 exists to prevent");
    assert.ok(fs.existsSync(acceptedPayload.prompt_file) && fs.statSync(acceptedPayload.prompt_file).size > 500,
      "the assigned capability's prompt must be printed to a file for the next role");
    const nextPrompt = fs.readFileSync(acceptedPayload.prompt_file, "utf8");
    assert.ok(nextPrompt.includes(`capability ${capOnRoster.capability_slug}`)
      && nextPrompt.includes(`intent ${capOnRoster.default_intent_slug}`),
      "the handed-over prompt must be the ASSIGNED capability's, with its own intent slug named " +
      "(AA-188 one hop later)");
  } else {
    notRun("AGT-68 pick-path negative control", "runner_should_boot() names no pick right now, so there is no pick to mutate away from");
  }
  fs.rmSync(scratch, { recursive: true, force: true });

  console.log(`[AGT-68] devmanager pinned to the ${LANE} lane's model_id (read live, not written here); ` +
    `the live Intent schema rejects the action:"auto-assign" mutant by name; ` +
    `state.pick equals runner_should_boot().detail.pick and a one-string mutation of it is refused; ` +
    `rule B40 driven both ways on two fixture rows, deleted`);
}

selfRun(import.meta.url, run);
