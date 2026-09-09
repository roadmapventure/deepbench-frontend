#!/usr/bin/env node
// DeepBench v7.0.434 | scripts/run-project.js | AGT-68 -- the session's HANDS for The Development
// Manager. The manager's Skill rows are its judgment; this file is the part that can touch a row.
//
// WHY THIS EXISTS. John, 2026-09-09, item 7: "Do we need to create a Developer Manager agent that
// knows how to orchestrate all these agents to make a project complete? I worry that we are trying
// to over manage a runner script." The runner runbook plays the manager's role in prose today. This
// script is deliberately NOT that prose moved into JavaScript: it decides nothing. It reads the
// instruments the platform already computed, hands them to the agent as `task_context`, and then
// performs only the ONE row action the agent's answer names and the Skills allow -- the ticket
// claim. Everything that looks like a decision here is a REFUSAL, never a choice.
//
// THE SHAPE IS scripts/verifier.js'S `--judge=session`, ON PURPOSE (AGT-67). A session sub-agent is
// not a function a script can call, so one management step is TWO INVOCATIONS and an exit code:
//
//   pass one   node scripts/run-project.js --project=governance-agents --cycle-id=<uuid>
//                -> reads the instruments, writes the state JSON, prints the assembled prompt,
//                   exit 3 = AWAITING THE MANAGER'S ANSWER. Nothing is written to any row.
//   ...run that prompt as a `devmanager` sub-agent on the orchestrator lane, save its JSON...
//   pass two   node scripts/run-project.js --project=governance-agents --cycle-id=<uuid> \
//                --answer=<path>
//                -> validates the answer against the Intent's OWN stored schema, re-reads the pick
//                   and the walls LIVE, claims the ticket if and only if everything still agrees,
//                   and prints the assigned capability's assembled prompt. exit 0/1/2.
//
// FIVE THINGS THIS FILE REFUSES TO DO, each because doing it is a defect this project has already
// paid for once:
//
// (1) IT NEVER ASSEMBLES A PROMPT ITSELF (SES-331). `assemblePrompt()` -- the function
//     api/capabilities/execute.js calls -- and `renderAssembly()` from scripts/agent-prompt.js are
//     imported. A session that pastes its own system prompt together is a second copy of the
//     executor's assembly, which is the drift the whole Governance Agents project exists to end.
//
// (2) IT NEVER OMITS `intent_slug`. MEASURED DEFECT, not a precaution: api/prompt/db-assembly.js
//     does NOT fall back to `capabilities.default_intent_slug` when `intent_slug` is null (AA-188) --
//     it filters EVERY Intent-type Skill out of the assembly. A `run-project` prompt built without
//     it carries no output contract and no decision procedure while still looking complete. So the
//     slug is READ OFF THE CAPABILITY ROW and passed explicitly, here and for the handed-over
//     capability too.
//
// (3) IT NEVER RE-DERIVES THE PICK. `dm-guardrails.must` says "use the pick path as computed, never
//     a re-derived order", and this file is where that would be broken first. `state.pick` is
//     `runner_should_boot().detail.pick` VERBATIM -- byte-for-byte the object the function returned,
//     not a reconstruction from `prime_directive_queue()` rows that happens to agree today. Pass two
//     then re-reads that same function and refuses on any drift (see `stateDrift`), which is what
//     makes editing the state file between the two passes a refusal rather than an instruction.
//
// (4) IT NEVER CLAIMS A TICKET A LIVE PEER HOLDS. The claim is ONE atomic PATCH carrying the
//     runbook's own guard (`docs/runbooks/session-setup.md` § 2c, rule B40): the 24h-expiry filter
//     rides in the query string, so the database -- not this file -- decides. 1 row back = ours,
//     0 rows = somebody else's, and there is no check-then-claim pair anywhere in this file. It sets
//     `claimed_by` / `claimed_at` and NOTHING else: `SES-316` made bumping `updated_at` on a claim
//     the reason a decision minutes earlier became un-restorable.
//
// (5) IT NEVER ACTS PAST A WALL. `--dry-run` writes nothing at all, and even without it pass two
//     re-reads the walls and refuses the claim while any of them stands, whatever the answer says.
//     A wall reading that could not be TAKEN counts as a wall (`wallReading` fails closed): an
//     unread instrument is not an absent one.
//
// WHAT `--dry-run` MEANS HERE, AND HOW IT DIFFERS FROM scripts/verifier.js'S. There it also means
// "needs no credentials", because its gates are local subprocesses. Every instrument here is a
// database read, so credentials are always required and `--dry-run` means exactly one thing: NO
// WRITE OF ANY KIND. Pass two under `--dry-run` validates, reconciles and prints the next prompt,
// and reports the claim it did not make.
//
// USAGE
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/run-project.js \
//     --project=governance-agents --cycle-id=<runner_cycles.id> [--step=1] [--max-steps=8] \
//     [--scratch=<dir>] [--handoff=<path>] [--dry-run] [--json]
//   ... --answer=<path to the manager's JSON>   (pass two; add --state-file=<path> to override)
//
// EXIT CODES -- four states, and collapsing any two of them throws away a distinction:
//   0  the answer was accepted and acted on (an `assign` claimed and printed the next prompt; a
//      `report` printed the close-out). The chain may continue.
//   1  the manager said `stop`: a wall stands and it is named. NOTHING was written. This is an
//      answer about the project, not a failure of the driver.
//   2  the driver could not run, or the answer was REFUSED -- schema, identity, state drift, a wall
//      standing under an `assign`, or the claim lost to a live peer. Nothing was written.
//   3  AWAITING THE MANAGER'S ANSWER (pass one). The state was written, the prompt was printed, and
//      no row was touched. It is NOT 2 (the driver ran its half) and NOT 1 (nothing was judged).
//
// Env (process.env only -- never hardcoded, never printed):
//   SUPABASE_URL           Project REST base.
//   SUPABASE_SERVICE_KEY   Service-role key; the instruments hold no anon grants.
//
// Network -- every call is a READ except the one claim PATCH in pass two:
//   POST /rest/v1/rpc/runner_should_boot        the pick path and the boot wall (STABLE)
//   POST /rest/v1/rpc/prime_directive_queue     the ordered lanes, for context under the pick
//   POST /rest/v1/rpc/resolve_day_token_cap     the token wall            (needs --cycle-id)
//   POST /rest/v1/rpc/scheduler_gate            John's Automation panel   (needs --cycle-id)
//   GET  /rest/v1/projects | project_progress | project_blockers
//   GET  /rest/v1/agents | agent_capability_assignments | capabilities    the roster, read LIVE
//   GET  /rest/v1/backlog_items                 the pick's own board row
//   GET  /rest/v1/skill_profiles                the Intent's stored traits.schema
//   PATCH /rest/v1/backlog_items                THE ONE WRITE. Skipped entirely under --dry-run.
//
// Pure helpers (parseArgs, statePathFor, wallReading, stateDrift, answerErrors, claimQueryFor,
// claimOutcome, handoffContextFor) are exported so the regression suite drives every branch with no
// network -- the same seam-proof convention scripts/verifier.js and scripts/check-*.js use. The
// claim is split into claimQueryFor (what is sent) and claimOutcome (what the row count means) for
// one reason worth stating: it lets the suite fire BOTH branches of rule B40 without a regression
// run ever claiming a real board ticket.

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
// The schema validator is IMPORTED, not restated. `validateAgentVerdict` reads whatever schema it
// is handed and names the offending key -- it is generic despite the noun in its name, and AGT-67's
// own guard drives it with a `"true"`-for-`true` mutant. A second copy here would be a second
// contract to keep in step, which is the drift this project exists to end.
import { validateAgentVerdict } from "./verifier.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEVMANAGER_AGENT_ID = "devmanager";
export const RUN_PROJECT_CAPABILITY = "run-project";

// See the exit-code table in the header. Named rather than literal so a caller can import the
// distinction instead of re-deriving it from a number.
export const EXIT_OK = 0;
export const EXIT_STOP = 1;
export const EXIT_CANNOT_RUN = 2;
export const EXIT_AWAITING_ANSWER = 3;

// The engine names the Intent's schema allows. `dm-knowledge-platform` states what each one IS: a
// session sub-agent assembled from Skill rows on subscription tokens, or the capability executor on
// API dollars. Which one FITS a given ticket is the manager's call; which ones are MECHANICALLY
// POSSIBLE is a fact about the capability row, and that fact is all this file supplies.
export const ENGINES = Object.freeze(["session", "executor"]);

// The three answers the Intent's schema allows. Restated here NOT as a second copy of the contract
// -- the schema is still what `validateAgentVerdict` is driven against -- but because this file
// BRANCHES on the value, and a branch of the form "stop, else report, else it must be assign" turns
// any unrecognised action into an assignment. That is the one direction this driver must never fail
// in, so the set is closed explicitly and an unknown action is refused rather than defaulted.
export const ACTIONS = Object.freeze(["assign", "stop", "report"]);

// The claim's expiry window, from rule B40 (`docs/runbooks/session-setup.md` § 2c): a claim older
// than this is a dead session's, not a live peer's. Hours rather than a literal timestamp because
// the cutoff is computed per call.
export const CLAIM_TTL_HOURS = 24;

const DEFAULT_TENANT = "global";
const DEFAULT_MAX_STEPS = 8;

function fail(message) {
  console.error(`run-project: ${message}`);
  process.exit(EXIT_CANNOT_RUN);
}

export function parseArgs(argv) {
  const out = { json: false, dryRun: false };
  for (const raw of argv) {
    if (raw === "--dry-run") { out.dryRun = true; continue; }
    if (raw === "--json") { out.json = true; continue; }
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(raw);
    if (!m) return { error: `unrecognized argument "${raw}"` };
    const [, key, value] = m;
    switch (key) {
      case "project": out.project = value; break;
      case "cycle-id": out.cycleId = value; break;
      case "step": out.stepRaw = value; break;
      case "max-steps": out.maxStepsRaw = value; break;
      case "scratch": out.scratch = value; break;
      case "answer": out.answer = value; break;
      case "state-file": out.stateFile = value; break;
      case "handoff": out.handoff = value; break;
      case "tenant": out.tenant = value; break;
      case "trigger": out.trigger = value; break;
      case "repo": out.repo = value; break;
      default: return { error: `unrecognized flag "--${key}"` };
    }
  }
  if (!out.project) return { error: "--project=<projects.slug> is required" };
  const int = (raw, flag, dflt) => {
    if (raw === undefined) return { value: dflt };
    if (!/^\d+$/.test(String(raw))) return { error: `--${flag} must be a positive integer` };
    const n = Number(raw);
    if (n < 1) return { error: `--${flag} must be a positive integer` };
    return { value: n };
  };
  const step = int(out.stepRaw, "step", 1);
  if (step.error) return step;
  out.step = step.value;
  const maxSteps = int(out.maxStepsRaw, "max-steps", DEFAULT_MAX_STEPS);
  if (maxSteps.error) return maxSteps;
  out.maxSteps = maxSteps.value;
  // A bound that is not checked is a comment. This is the whole of what --max-steps buys: the chain
  // is one invocation per step, so the only place a runaway can be stopped is at the door.
  if (out.step > out.maxSteps) {
    return { error: `--step=${out.step} exceeds --max-steps=${out.maxSteps}; the chain is over, and a further step would be a management loop nobody bounded` };
  }
  out.tenant = out.tenant || DEFAULT_TENANT;
  out.trigger = out.trigger || "supervised";
  out.scratch = out.scratch || os.tmpdir();
  return out;
}

// Where pass one leaves the state for pass two, DERIVED so the two invocations find the same file
// without a path carried by hand. The dot is deliberately not in the allowed set, for the reason
// scripts/verifier.js's `judgeContextPathFor` records: once the separators are gone `../../etc` is
// harmless, and "harmless because of a second rule" is how the first rule stops being checked.
export function statePathFor(scratchDir, project, step) {
  const safe = String(project || "").replace(/[^A-Za-z0-9_-]/g, "-");
  if (!safe) return null;
  const n = Number.isInteger(step) && step > 0 ? step : 1;
  return path.join(scratchDir, `run-project-${safe}-${n}.json`);
}

// THE WALLS, READ AND NEVER RE-DERIVED -- and FAILING CLOSED IN BOTH DIRECTIONS.
//
// Each reading is either an answer from the instrument or an `error` saying it could not be taken.
// An unread instrument counts as a wall STANDING: "we could not tell" and "we are clear" are the
// same value to a caller that treats a missing reading as absent, and the second one is how a cycle
// spends past a budget nobody could read. Unknown is not innocent.
//
// `resolve_day_token_cap` and `scheduler_gate` both need a cycle id. Without one they are NOT
// silently skipped -- they are recorded as unread, which is a wall, so a caller who forgot
// `--cycle-id` is told rather than quietly given a green board.
export function wallReading({ shouldBoot, dayTokenCap, schedulerGate }) {
  const standing = [];
  const push = (name, reason) => standing.push(`${name}: ${reason}`);

  if (!shouldBoot || shouldBoot.error) {
    push("runner_should_boot()", shouldBoot?.error || "not read");
  } else if (shouldBoot.should_boot !== true) {
    push("runner_should_boot()", shouldBoot.reason || "should_boot is not true");
  }

  if (!dayTokenCap || dayTokenCap.error) {
    push("resolve_day_token_cap()", dayTokenCap?.error || "not read");
  } else if (dayTokenCap.rest_wall_hit === true) {
    // The weekly rest wall is the one reading here that is a STOP rather than a smaller number.
    // `cap_source` being `stale-floor` narrows the day's allowance and is reported in the state for
    // the manager to weigh; it is not a wall, and treating it as one would stop the runner every
    // time John went two days without typing his meter numbers.
    push("resolve_day_token_cap()", `weekly rest wall hit at rest_pct ${dayTokenCap.rest_pct}`);
  }

  if (!schedulerGate || schedulerGate.error) {
    push("scheduler_gate()", schedulerGate?.error || "not read");
  } else if (schedulerGate.verdict !== "run") {
    // The runbook's step 1b: `run` carries on, anything else (`paced` / `scheduler-off`) closes the
    // cycle. The set of non-`run` verdicts is deliberately NOT enumerated here -- a verdict this
    // file has never heard of must stop the chain, not fall through it.
    push("scheduler_gate()", `${schedulerGate.verdict}: ${schedulerGate.reason || "no reason given"}`);
  }

  return { blocked: standing.length > 0, standing };
}

// THE NEGATIVE CONTROL THAT MAKES THE STATE FILE EVIDENCE RATHER THAN AN INSTRUCTION.
//
// Between the two passes the state JSON sits on disk, and it names the ticket pass two is about to
// claim. Editing one string in it would otherwise be a way to make the driver claim any ticket at
// all -- with the agent's answer honestly agreeing, because the agent was shown the edited file. So
// pass two re-reads `runner_should_boot()` and compares: the pick this file acts on is the one the
// database says is the pick RIGHT NOW, and the stored copy is only evidence that the manager was
// shown the truth. A board that legitimately moved between the passes lands here too, and stopping
// is the right answer there as well -- the manager reasoned about a pick that no longer exists.
export function stateDrift(state, livePick) {
  const drift = [];
  const stored = state && state.pick;
  if (!stored && !livePick) return drift;
  if (!stored) {
    drift.push(`the state file carries no pick but the pick path now names "${livePick.backlog_id}" -- the state was written against a different board`);
    return drift;
  }
  if (!livePick) {
    drift.push(`the state file names pick "${stored.backlog_id}" but the pick path now names none -- nothing is pickable, so there is nothing to assign`);
    return drift;
  }
  if (String(stored.backlog_id) !== String(livePick.backlog_id)) {
    drift.push(`the state file names pick "${stored.backlog_id}" but runner_should_boot() now names "${livePick.backlog_id}" -- the pick is read live and never taken from the file`);
  }
  if (stored.lane && livePick.lane && String(stored.lane) !== String(livePick.lane)) {
    drift.push(`the state file's pick lane is "${stored.lane}" but the pick path's is "${livePick.lane}"`);
  }
  return drift;
}

// THE ANSWER, CHECKED AGAINST THE STATE IT WAS GIVEN. The Intent's own schema (validated
// separately, through the shipped validator) says the answer is well FORMED; this says it is about
// THIS project, THIS pick and a capability that actually exists on the live roster.
//
// The `assign` branch is the only one that may reach a row, so it is the only one with anything to
// check. `stop` and `report` are checked in the mirror direction -- they must NOT carry an
// assignment, because an assignment nobody acts on in a `stop` is a reader's trap, and a future
// edit that started acting on it would find the check already passed.
export function answerErrors(answer, state) {
  const errors = [];
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    return ["the manager's answer must be a JSON object"];
  }
  if (answer.project && state?.project && String(answer.project) !== String(state.project)) {
    errors.push(`the answer is about project "${answer.project}" but this run is managing "${state.project}"`);
  }
  const action = answer.action;
  // An action outside the closed set never reaches the assign branch by falling through it.
  if (!ACTIONS.includes(action)) {
    return [...errors, `action "${action}" is not one of ${ACTIONS.join(", ")}; an unrecognised action is refused, never treated as an assignment`];
  }
  if (action !== "assign") {
    if (answer.assignment) {
      errors.push(`action is "${action}" but an assignment object was returned; a ${action} assigns nothing, and an assignment nobody acts on is a trap for the next reader`);
    }
    return errors;
  }
  const a = answer.assignment;
  if (!a || typeof a !== "object" || Array.isArray(a)) {
    return [...errors, 'action is "assign" but no assignment object was returned'];
  }
  const pick = state?.pick;
  if (!pick) {
    errors.push('action is "assign" but the state carries no pick, so there is nothing the pick path authorises assigning');
  } else if (String(a.backlog_id || "") !== String(pick.backlog_id)) {
    // dm-guardrails.must: "use the pick path as computed, never a re-derived order". This is that
    // clause with teeth. A manager that names any other ticket is a finding on the Skill text.
    errors.push(`the assignment names "${a.backlog_id}" but the pick path names "${pick.backlog_id}" -- the manager may not re-order the board`);
  }
  // THE ROSTER IS READ LIVE AND THEREFORE CONTAINS THE MANAGER'S OWN CAPABILITY. That is correct --
  // filtering it out in the read would be this driver editing the roster on the agent's behalf --
  // but assigning the management step to itself is a loop, not a handoff, so it is refused HERE,
  // once, at the only point where an answer becomes a row action.
  if (a.capability_slug === RUN_PROJECT_CAPABILITY) {
    errors.push(`the assignment names "${RUN_PROJECT_CAPABILITY}", which is the management step itself -- a manager that assigns the project back to itself has made a loop, not a handoff`);
  }
  const roster = Array.isArray(state?.roster) ? state.roster : [];
  const row = roster.find(r => r.capability_slug === a.capability_slug);
  if (!row) {
    errors.push(`capability "${a.capability_slug}" is not on the live governance roster (${roster.map(r => r.capability_slug).join(", ") || "empty"})`);
  } else if (!ENGINES.includes(a.engine)) {
    errors.push(`engine "${a.engine}" is not one of ${ENGINES.join(", ")}`);
  } else if (Array.isArray(row.engines) && !row.engines.includes(a.engine)) {
    errors.push(`engine "${a.engine}" is not available for capability "${a.capability_slug}" (available: ${row.engines.join(", ")})`);
  }
  return errors;
}

// THE CLAIM, AS ONE QUERY STRING. Exported so the guard is checkable rather than invisible inside
// one fetch: rule B40's expiry filter is IN the PostgREST query, which makes the PATCH a single
// server-side `UPDATE ... WHERE`, exactly the atomic form § 2c specifies. There is no SELECT
// anywhere near it -- a check-then-claim pair is what let cycles `e36d4379` and `4da5a7bd` both
// build `ADM-1` seventeen seconds apart.
export function claimQueryFor(backlogId, cutoffIso) {
  const id = encodeURIComponent(String(backlogId));
  const cutoff = encodeURIComponent(String(cutoffIso));
  return `backlog_items?backlog_id=eq.${id}&status=neq.done`
    + `&or=(claimed_by.is.null,claimed_at.lt.${cutoff})`
    + `&select=backlog_id,claimed_by,claimed_at`;
}

// WHAT THE ATOMIC CLAIM'S ROW COUNT MEANS -- rule B40's two-line rule, as a function rather than as
// an `if` buried in the write path. "1 row → it's yours; 0 rows → someone holds it" is the sentence
// every session in this repo is supposed to obey, and a sentence nothing can drive is a sentence
// that gets re-implemented slightly differently the sixth time. Exported so the regression suite
// fires BOTH branches without a regression run ever claiming a real board ticket -- which is the
// one thing the live arms of that suite must never do.
export function claimOutcome(rows) {
  const n = Array.isArray(rows) ? rows.length : 0;
  if (n === 1) return { ok: true, holder: rows[0]?.claimed_by ?? null, reason: null };
  if (n === 0) {
    return { ok: false, holder: null,
      reason: "0 rows from the atomic claim: a live peer holds this ticket (or it is done). " +
        'dm-guardrails.must_not: "assign a ticket already claimed by a live peer".' };
  }
  // Not reachable through `backlog_id=eq.`, which is unique -- and that is exactly why it is
  // checked. A claim that matched more than one row means the query lost its identity filter, and
  // silently taking the first row would turn a broken filter into a successful-looking claim.
  return { ok: false, holder: null,
    reason: `${n} rows from a claim that filters on a unique backlog_id -- the identity filter is gone; refusing rather than picking one` };
}

// WHAT THE NEXT ROLE IS HANDED. The manager may supply its own `task_context` on the assignment;
// where it does not, the handoff is built from rows this driver already read -- never from anything
// this file invented about the ticket. `handed_over_by` names the CAPABILITY, not an agent: Rule #1
// is about an agent's data naming another agent, and a handoff row that carried a name would be
// exactly that, one hop later.
export function handoffContextFor({ answer, state }) {
  const a = (answer && answer.assignment) || {};
  const supplied = a.task_context;
  if (supplied && typeof supplied === "object" && !Array.isArray(supplied)) return supplied;
  return {
    project: state.project,
    backlog_id: a.backlog_id,
    ticket: state.pick_row || null,
    reason: a.reason || null,
    step: state.step,
    cycle_id: state.cycle_id || null,
    handed_over_by: RUN_PROJECT_CAPABILITY,
  };
}

// ---------------------------------------------------------------------------------------------
// Network. Everything below this line touches the database.
// ---------------------------------------------------------------------------------------------

function headersFor(key) {
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

async function rest(base, key, pathAndQuery, init = {}) {
  try {
    const r = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
      ...init,
      headers: { ...headersFor(key), ...(init.headers || {}) },
    });
    const text = await r.text();
    if (!r.ok) return { error: `${init.method || "GET"} ${pathAndQuery} -> ${r.status} ${text.slice(0, 300)}` };
    return { rows: text ? JSON.parse(text) : [] };
  } catch (e) {
    return { error: `${init.method || "GET"} ${pathAndQuery} -> ${e.message}` };
  }
}

// Every instrument is called as an RPC POST, including the STABLE ones a GET would also serve. One
// call shape for all of them means a function that later becomes VOLATILE does not silently start
// 404ing on a GET this file forgot to convert.
async function rpc(base, key, name, body = {}) {
  const r = await rest(base, key, `rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
  if (r.error) return { error: r.error };
  const rows = Array.isArray(r.rows) ? r.rows : [r.rows];
  return { row: rows[0] ?? null, rows };
}

// The Intent's stored contract, read off the row rather than written here. Handed to the sub-agent
// inside `task_context` (so it reaches the prompt through the executor's own TASK DETAILS renderer,
// not by this file appending to an assembled prompt) and used to validate the answer in pass two.
async function intentContract(base, key) {
  const cap = await rest(base, key, `capabilities?slug=eq.${RUN_PROJECT_CAPABILITY}&select=slug,default_intent_slug&limit=1`);
  if (cap.error) return { error: `could not read the ${RUN_PROJECT_CAPABILITY} capability row: ${cap.error}` };
  const capRow = cap.rows[0];
  if (!capRow) return { error: `no capabilities row for "${RUN_PROJECT_CAPABILITY}" -- apply the AGT-68 section of docs/design/ga-agents-seed.sql` };
  const intentSlug = capRow.default_intent_slug || null;
  // See header note (2). A null here is not a default to route around; it is the output contract
  // and the decision procedure silently missing from the prompt.
  if (!intentSlug) return { error: `capability "${RUN_PROJECT_CAPABILITY}" declares no default_intent_slug, so the manager's contract cannot be loaded and its prompt would carry no Intent at all` };
  const sp = await rest(base, key, `skill_profiles?slug=eq.${encodeURIComponent(intentSlug)}&select=slug,traits&limit=1`);
  if (sp.error) return { error: `could not read the Intent Skill "${intentSlug}": ${sp.error}` };
  const row = sp.rows[0];
  if (!row) return { error: `no skill_profiles row for the Intent "${intentSlug}"` };
  const schema = row.traits && row.traits.schema;
  if (!schema) return { error: `the Intent "${intentSlug}" carries no traits.schema, so the manager's answer could not be validated` };
  return { intentSlug, schema };
}

// THE ROSTER, READ LIVE (Rule #1). `dm-knowledge-platform` ends "WHO DOES WHAT is read off
// agent_capability_assignments and capabilities live, never held here" -- so this is the read that
// sentence points at, and the reason no agent id appears in any Skill row.
async function governanceRoster(base, key, tenant) {
  const agents = await rest(base, key, "agents?lane=eq.governance&is_active=eq.true&select=id,code,name,role,specialty&order=code");
  if (agents.error) return { error: `roster: ${agents.error}` };
  const assigns = await rest(base, key, `agent_capability_assignments?tenant_id=eq.${encodeURIComponent(tenant)}&select=agent_id,capability_slug`);
  if (assigns.error) return { error: `roster: ${assigns.error}` };
  const caps = await rest(base, key, `capabilities?tenant_id=eq.${encodeURIComponent(tenant)}&select=slug,name,description,execution_type,default_intent_slug`);
  if (caps.error) return { error: `roster: ${caps.error}` };
  const byId = new Map(agents.rows.map(a => [a.id, a]));
  const bySlug = new Map(caps.rows.map(c => [c.slug, c]));
  const roster = [];
  for (const a of assigns.rows) {
    const agent = byId.get(a.agent_id);
    const cap = bySlug.get(a.capability_slug);
    if (!agent || !cap) continue;
    roster.push({
      agent_id: agent.id, code: agent.code, name: agent.name, role: agent.role,
      capability_slug: cap.slug, capability_name: cap.name, capability_description: cap.description,
      execution_type: cap.execution_type, default_intent_slug: cap.default_intent_slug,
      // A FACT, NOT A JUDGMENT. An `ai` capability is a set of Skill rows, and those rows can be
      // assembled for a session sub-agent (subscription tokens) or POSTed to the capability
      // executor (API dollars) -- both are mechanically available. Which one FITS is the manager's
      // call, and this file states the menu rather than making it.
      engines: cap.execution_type === "ai" ? [...ENGINES] : ["executor"],
    });
  }
  roster.sort((x, y) => (x.code || "").localeCompare(y.code || "") || x.capability_slug.localeCompare(y.capability_slug));
  return { roster };
}

// One assembly, through the executor's own code, with the intent slug always explicit.
async function assembleFor({ agentId, capabilitySlug, intentSlug, taskContext, tenant }) {
  const { assemblePrompt } = await import("../api/prompt/db-assembly.js");
  const { renderAssembly } = await import("./agent-prompt.js");
  const assembly = await assemblePrompt({
    capability_slug: capabilitySlug,
    agent_id: agentId,
    tenant_id: tenant,
    task_context: taskContext,
    intent_slug: intentSlug,
  });
  const rendered = renderAssembly(assembly);
  if (!rendered.system_prompt) {
    throw new Error(`"${capabilitySlug}" assembled zero renderable sections for agent "${agentId}"`);
  }
  if (rendered.omitted?.length) {
    console.error(`run-project: prompt sections omitted (no stored content -- fetched per call by the executor): ${rendered.omitted.join(", ")}`);
  }
  const header = `# ${assembly.agent_card?.name ?? agentId} — ${assembly.agent_card?.role ?? ""} · capability ${assembly.capability_slug} · intent ${intentSlug} · model ${assembly.llm?.model}`;
  return { text: `${header}\n${rendered.system_prompt}`, model: assembly.llm?.model ?? null };
}

// The prompt goes to a FILE always and to stdout only when stdout is not carrying the machine
// payload -- AGT-67's own attended QA finding 3: a large prompt printed ahead of the `--json` line
// makes that line unparseable, breaking the contract for the one caller that needed it.
function emitPrompt(promptText, promptPath, json) {
  try { fs.writeFileSync(promptPath, promptText, "utf8"); }
  catch (e) { console.error(`run-project: could not write the prompt to ${promptPath}: ${e.message}`); }
  if (!json) console.log(promptText);
}

function emit({ code, payload, prose, json }) {
  if (json) process.stdout.write(JSON.stringify(payload) + "\n");
  else console.log(prose);
  process.exit(code);
}

// Read every instrument once. A single error anywhere is fatal for pass one -- a management step
// taken against a board this file could only partly see is exactly the "assumption" dm-behavior
// forbids ("a missing row is a stop, not an assumption").
async function readInstruments({ base, key, project, cycleId, trigger, tenant }) {
  const projectRow = await rest(base, key, `projects?slug=eq.${encodeURIComponent(project)}&select=slug,name,status,priority,charter_link,notes&limit=1`);
  if (projectRow.error) return { error: projectRow.error };
  if (!projectRow.rows[0]) return { error: `no projects row for slug "${project}"` };

  const progress = await rest(base, key, `project_progress?slug=eq.${encodeURIComponent(project)}&select=*&limit=1`);
  if (progress.error) return { error: progress.error };
  const blockers = await rest(base, key, `project_blockers?project=eq.${encodeURIComponent(project)}&select=*`);
  if (blockers.error) return { error: blockers.error };

  const boot = await rpc(base, key, "runner_should_boot");
  if (boot.error) return { error: boot.error };
  const queue = await rpc(base, key, "prime_directive_queue");
  if (queue.error) return { error: queue.error };

  // Both of these need a cycle id. Absent one they are recorded as unread -- which `wallReading`
  // treats as a wall standing, so nobody gets a green board by omitting a flag.
  const dayCap = cycleId
    ? (await rpc(base, key, "resolve_day_token_cap", { p_cycle_id: cycleId }))
    : { error: "not read: --cycle-id was not given, and the day cap is resolved per cycle" };
  const sched = cycleId
    ? (await rpc(base, key, "scheduler_gate", { p_cycle_id: cycleId, p_trigger: trigger, p_started: new Date().toISOString() }))
    : { error: "not read: --cycle-id was not given, and the settings gate is evaluated per cycle" };

  const roster = await governanceRoster(base, key, tenant);
  if (roster.error) return { error: roster.error };

  // VERBATIM. See header note (3): this is the object the function returned, not a reconstruction.
  const pick = (boot.row && boot.row.detail && boot.row.detail.pick) || null;
  let pickRow = null;
  if (pick && pick.backlog_id) {
    const b = await rest(base, key,
      `backlog_items?backlog_id=eq.${encodeURIComponent(pick.backlog_id)}`
      + "&select=backlog_id,title,status,type,priority_class,supports_class,queue,automation_rank,design_status,kickoff_link,predicted_cycles,milestone,claimed_by,claimed_at,epics(name,projects(slug,name,status))&limit=1");
    if (b.error) return { error: b.error };
    pickRow = b.rows[0] || null;
  }
  const pickProject = pickRow?.epics?.projects?.slug ?? null;

  return {
    projectRow: projectRow.rows[0],
    progress: progress.rows[0] || null,
    blockers: blockers.rows,
    shouldBoot: boot.error ? { error: boot.error } : boot.row,
    dayTokenCap: dayCap.error ? { error: dayCap.error } : dayCap.row,
    schedulerGate: sched.error ? { error: sched.error } : sched.row,
    queue: queue.rows,
    roster: roster.roster,
    pick,
    pickRow,
    pickProject,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) fail(args.error);

  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  // Unlike scripts/verifier.js, --dry-run does NOT relax this: every instrument here is a database
  // read, so there is no credential-free way to reach a state at all. See the header.
  const missing = [!base && "SUPABASE_URL", !key && "SUPABASE_SERVICE_KEY"].filter(Boolean);
  if (missing.length) fail(`missing ${missing.join(", ")}. Every instrument is a database read, so --dry-run does not relax this -- it means "no write", not "no credentials".`);

  const statePath = args.stateFile || statePathFor(args.scratch, args.project, args.step);
  if (!statePath) fail(`--project="${args.project}" reduces to an empty file name`);
  const promptPath = statePath.replace(/\.json$/, "") + ".prompt.txt";

  const contract = await intentContract(base, key);
  if (contract.error) fail(contract.error);

  // ---- PASS TWO: the manager has answered. Validate, reconcile, then at most ONE row action. ----
  if (args.answer) {
    let state, answer;
    try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
    catch (e) {
      fail(`could not read the state at ${statePath} (${e.message}). Run pass one first, or pass --state-file.`);
    }
    try { answer = JSON.parse(fs.readFileSync(args.answer, "utf8")); }
    catch (e) {
      fail(`could not read the manager's answer at ${args.answer} (${e.message}). An unreadable answer is the ABSENCE of a decision, never an instruction to proceed.`);
    }

    // (a) The Intent's own stored contract, through the shipped validator.
    const valid = validateAgentVerdict(contract.schema, answer);
    if (!valid.ok) {
      return emit({ code: EXIT_CANNOT_RUN, json: args.json,
        payload: { ok: false, exitCode: EXIT_CANNOT_RUN, kind: "refused", schema_errors: valid.errors },
        prose: `run-project: the manager's answer does not satisfy Intent "${contract.intentSlug}"'s schema:\n  - ${valid.errors.join("\n  - ")}\nExiting ${EXIT_CANNOT_RUN} and touching NOTHING -- an answer that fails its own contract is not a decision about the project.` });
    }

    // (b) The pick, re-read LIVE, and the state compared against it. Header note (3).
    const liveBoot = await rpc(base, key, "runner_should_boot");
    if (liveBoot.error) {
      return emit({ code: EXIT_CANNOT_RUN, json: args.json,
        payload: { ok: false, exitCode: EXIT_CANNOT_RUN, kind: "cannot-run", error: liveBoot.error },
        prose: `run-project: could not re-read the pick path (${liveBoot.error}). Exiting ${EXIT_CANNOT_RUN} -- nothing was written.` });
    }
    const livePick = (liveBoot.row && liveBoot.row.detail && liveBoot.row.detail.pick) || null;
    const drift = stateDrift(state, livePick);
    if (drift.length) {
      return emit({ code: EXIT_CANNOT_RUN, json: args.json,
        payload: { ok: false, exitCode: EXIT_CANNOT_RUN, kind: "refused", drift },
        prose: `run-project: the state at ${statePath} no longer agrees with the pick path:\n  - ${drift.join("\n  - ")}\nExiting ${EXIT_CANNOT_RUN} and touching NOTHING -- the pick is read live, and a state file is evidence, never an instruction.` });
    }

    // (c) The answer against the state it was given.
    const errors = answerErrors(answer, state);
    if (errors.length) {
      return emit({ code: EXIT_CANNOT_RUN, json: args.json,
        payload: { ok: false, exitCode: EXIT_CANNOT_RUN, kind: "refused", answer_errors: errors },
        prose: `run-project: the manager's answer was refused:\n  - ${errors.join("\n  - ")}\nExiting ${EXIT_CANNOT_RUN} -- nothing was written.` });
    }

    // (d) A `stop` is an answer, not a failure. Exit 1, write nothing.
    if (answer.action === "stop") {
      return emit({ code: EXIT_STOP, json: args.json,
        payload: { ok: true, exitCode: EXIT_STOP, kind: "stop", recorded: false, report: answer.report ?? null, needs_john: answer.needs_john ?? [] },
        prose: `run-project: STOP.\n${answer.report ?? ""}\n${(answer.needs_john || []).map(n => `  needs John: ${n}`).join("\n")}\nNothing was written.` });
    }
    if (answer.action === "report") {
      return emit({ code: EXIT_OK, json: args.json,
        payload: { ok: true, exitCode: EXIT_OK, kind: "report", recorded: false, report: answer.report ?? null, needs_john: answer.needs_john ?? [] },
        prose: `run-project: REPORT.\n${answer.report ?? ""}\n${(answer.needs_john || []).map(n => `  needs John: ${n}`).join("\n")}\nNothing was written.` });
    }

    // (e) `assign`. The walls are re-read HERE, after the answer, because the answer is not what
    //     authorises the claim -- the board is. A manager that said `assign` while a wall stands is
    //     refused rather than obeyed (header note 5).
    const liveDayCap = args.cycleId
      ? (await rpc(base, key, "resolve_day_token_cap", { p_cycle_id: args.cycleId }))
      : { error: "not read: --cycle-id was not given" };
    const liveSched = args.cycleId
      ? (await rpc(base, key, "scheduler_gate", { p_cycle_id: args.cycleId, p_trigger: args.trigger, p_started: new Date().toISOString() }))
      : { error: "not read: --cycle-id was not given" };
    const walls = wallReading({
      shouldBoot: liveBoot.row,
      dayTokenCap: liveDayCap.error ? { error: liveDayCap.error } : liveDayCap.row,
      schedulerGate: liveSched.error ? { error: liveSched.error } : liveSched.row,
    });
    if (walls.blocked) {
      return emit({ code: EXIT_CANNOT_RUN, json: args.json,
        payload: { ok: false, exitCode: EXIT_CANNOT_RUN, kind: "refused", walls },
        prose: `run-project: the answer says assign, but a wall stands:\n  - ${walls.standing.join("\n  - ")}\nExiting ${EXIT_CANNOT_RUN} -- no claim, nothing written.` });
    }

    const target = answer.assignment.backlog_id;
    let claim = { skipped: true, rows: [] };
    if (args.dryRun) {
      console.error(`run-project: --dry-run, so the claim on ${target} was NOT made.`);
    } else {
      const cutoff = new Date(Date.now() - CLAIM_TTL_HOURS * 3600 * 1000).toISOString();
      const claimer = `run-project:${args.project}:${args.step}`;
      const r = await rest(base, key, claimQueryFor(target, cutoff), {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        // claimed_by / claimed_at and NOTHING else: SES-316. A claim is coordination, not a
        // judgment write, and stamping `updated_at` here makes the decision this session just
        // recorded un-restorable one statement later.
        body: JSON.stringify({ claimed_by: claimer, claimed_at: new Date().toISOString() }),
      });
      if (r.error) {
        return emit({ code: EXIT_CANNOT_RUN, json: args.json,
          payload: { ok: false, exitCode: EXIT_CANNOT_RUN, kind: "cannot-run", error: r.error },
          prose: `run-project: the claim on ${target} failed: ${r.error}. Exiting ${EXIT_CANNOT_RUN}.` });
      }
      claim = { skipped: false, rows: r.rows };
      // Rule B40's own sentence, through the one function that states it (see claimOutcome).
      const outcome = claimOutcome(r.rows);
      if (!outcome.ok) {
        return emit({ code: EXIT_CANNOT_RUN, json: args.json,
          payload: { ok: false, exitCode: EXIT_CANNOT_RUN, kind: "refused", error: `claim lost on ${target}`, claim_rows: r.rows.length },
          prose: `run-project: could not claim ${target}. ${outcome.reason} Exiting ${EXIT_CANNOT_RUN} -- nothing else was written.` });
      }
    }

    // (f) The handoff: the assigned capability's prompt, assembled the same one way, with its own
    //     intent slug read off its own capability row (header note 2 again, one hop later).
    const rosterRow = state.roster.find(r => r.capability_slug === answer.assignment.capability_slug);
    let next;
    try {
      next = await assembleFor({
        agentId: rosterRow.agent_id,
        capabilitySlug: rosterRow.capability_slug,
        intentSlug: rosterRow.default_intent_slug,
        taskContext: handoffContextFor({ answer, state }),
        tenant: args.tenant,
      });
    } catch (e) {
      return emit({ code: EXIT_CANNOT_RUN, json: args.json,
        payload: { ok: false, exitCode: EXIT_CANNOT_RUN, kind: "cannot-run", error: e.message, claim },
        prose: `run-project: claimed ${target}, but could not assemble the "${rosterRow.capability_slug}" prompt: ${e.message}. Exiting ${EXIT_CANNOT_RUN}.` });
    }
    const nextPromptPath = statePath.replace(/\.json$/, "") + `.next-${rosterRow.capability_slug}.prompt.txt`;
    emitPrompt(next.text, nextPromptPath, args.json);
    return emit({ code: EXIT_OK, json: args.json,
      payload: {
        ok: true, exitCode: EXIT_OK, kind: "assigned", dry_run: args.dryRun,
        backlog_id: target, capability_slug: rosterRow.capability_slug, engine: answer.assignment.engine,
        agent_id: rosterRow.agent_id, intent_slug: rosterRow.default_intent_slug, model: next.model,
        claimed: !args.dryRun, claim_rows: claim.rows.length, prompt_file: nextPromptPath,
        reason: answer.assignment.reason ?? null,
      },
      prose: `run-project: ASSIGNED ${target} — ${rosterRow.capability_slug} — engine ${answer.assignment.engine}\n`
        + `  reason: ${answer.assignment.reason ?? "(none given)"}\n`
        + `  claim:  ${args.dryRun ? "NOT MADE (--dry-run)" : `held as ${claim.rows[0]?.claimed_by}`}\n`
        + `  prompt: ${nextPromptPath}\n`
        + `  Run that prompt as a sub-agent on model ${next.model}, then re-run this driver with --step=${args.step + 1}.` });
  }

  // ---- PASS ONE: read the board, ask the manager, write nothing. -------------------------------
  const inst = await readInstruments({ base, key, project: args.project, cycleId: args.cycleId, trigger: args.trigger, tenant: args.tenant });
  if (inst.error) fail(`instrument unreadable: ${inst.error}. Exiting ${EXIT_CANNOT_RUN} -- a management step taken against a board this driver could only partly see is the assumption dm-behavior forbids.`);

  const walls = wallReading({ shouldBoot: inst.shouldBoot, dayTokenCap: inst.dayTokenCap, schedulerGate: inst.schedulerGate });

  let handoff = null;
  if (args.handoff) {
    try { handoff = JSON.parse(fs.readFileSync(args.handoff, "utf8")); }
    catch (e) { fail(`could not read --handoff=${args.handoff}: ${e.message}`); }
  }

  const state = {
    driver: "scripts/run-project.js",
    feature: "AGT-68",
    project: args.project,
    step: args.step,
    max_steps: args.maxSteps,
    read_at: new Date().toISOString(),
    cycle_id: args.cycleId || null,
    // The engine this process can actually reach right now. `dm-knowledge-platform`: the cloud
    // cannot spawn a session (SES-140), so "a session exists" is a fact about where the driver is
    // running and not something the manager can wish into being.
    engine_available_now: "session",
    project_row: inst.projectRow,
    progress: inst.progress,
    blockers: inst.blockers,
    walls: {
      blocked: walls.blocked,
      standing: walls.standing,
      runner_should_boot: inst.shouldBoot,
      resolve_day_token_cap: inst.dayTokenCap,
      scheduler_gate: inst.schedulerGate,
    },
    pick: inst.pick,
    pick_row: inst.pickRow,
    pick_project: inst.pickProject,
    // Named rather than left to be inferred: the pick path is board-wide, and a pick outside the
    // project this step is managing is a real state the manager has to speak to, not a bug.
    pick_in_project: inst.pickProject ? inst.pickProject === args.project : null,
    queue: inst.queue,
    roster: inst.roster,
    last_handoff: handoff,
    // The Intent's OWN contract, from its row. It reaches the prompt through the executor's TASK
    // DETAILS renderer -- this file never appends to an assembled prompt.
    output_contract: contract.schema,
    intent_slug: contract.intentSlug,
  };

  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    fail(`could not write the state to ${statePath}: ${e.message}`);
  }

  let prompt;
  try {
    prompt = await assembleFor({
      agentId: DEVMANAGER_AGENT_ID,
      capabilitySlug: RUN_PROJECT_CAPABILITY,
      intentSlug: contract.intentSlug,
      taskContext: state,
      tenant: args.tenant,
    });
  } catch (e) {
    fail(`could not assemble the ${RUN_PROJECT_CAPABILITY} prompt: ${e.message}`);
  }
  emitPrompt(prompt.text, promptPath, args.json);

  return emit({
    code: EXIT_AWAITING_ANSWER, json: args.json,
    // NOT `ok: true`. AGT-67's finding 3, inherited deliberately: an exit-3 payload that said `ok`
    // was seeding the very defect the exit code exists to make visible. Nothing was concluded here.
    payload: {
      ok: false, exitCode: EXIT_AWAITING_ANSWER, kind: "awaiting-answer", recorded: false,
      project: args.project, step: args.step, max_steps: args.maxSteps,
      walls_blocked: walls.blocked, walls_standing: walls.standing,
      pick: inst.pick, pick_in_project: state.pick_in_project,
      roster: inst.roster.map(r => r.capability_slug),
      state_file: statePath, prompt_file: promptPath,
      intent_slug: contract.intentSlug, model: prompt.model,
    },
    prose: `run-project: AWAITING THE MANAGER'S ANSWER (exit ${EXIT_AWAITING_ANSWER}). Nothing was written.\n`
      + `  project: ${args.project} (${inst.projectRow.status}), step ${args.step}/${args.maxSteps}\n`
      + `  pick:    ${inst.pick ? `${inst.pick.backlog_id} — ${inst.pick.title}` : "(none — nothing pickable)"}\n`
      + `  walls:   ${walls.blocked ? walls.standing.join("; ") : "clear"}\n`
      + `  state:   ${statePath}\n`
      + `  prompt:  ${promptPath}\n`
      + `  Run that prompt as a ${DEVMANAGER_AGENT_ID} sub-agent on model ${prompt.model}, save its JSON, then re-run with --answer=<path>.`,
  });
}

// Entry-point guard, the shape scripts/agent-prompt.js records: the regression guard imports the
// pure helpers from here and must not run the script. Windows argv[1] and import.meta.url can
// disagree on drive-letter case.
if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => fail(e.message));
}
