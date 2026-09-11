// DeepBench v7.0.454 | tests/regression/ses-360-governance-agents-block.test.mjs | SES-360 -- THE
// STANDING BRIEF ANSWERS "ARE THE DEEPBENCH AGENTS DOING THE DEVELOPMENT WORK" AS A RENDERED FACT.
//
// Measured 2026-09-11 19:51Z, before a line changed: answering that question took five queries over
// ai_activity_log, agents, backlog_items, runner_items/runner_decisions, runner_cycles and
// runner_verdicts, and the first of them silently truncated -- PostgREST caps a page at 1,000 rows
// and the governance agents had written 1,311 in seven days. Two views now hold the answer:
// `public.governance_agent_usage` (one row per governance agent x call_source, calls and token sums,
// rolling 7 days) and `public.ship_handoff_census` (one row: ships in the window, how many carried all
// four of SES-345's handoff rows, and which leg is missing how often). The brief renders both in a new
// fact group, `Governance agents, last 7 days`, after `Board by served class` and before the
// provenance footer.
//
// THREE ARMS, the shape every sibling guard of this block already has:
//
//   1. SOURCE (always runs): renderGovernanceAgents() is PURE -- (facts, stamp) in, markdown out --
//      driven from fixtures the way renderServedClass()/renderInventionUse() beside it are. The
//      ticket's own discriminating QA is asserted here at the renderer: a fixture that adds ONE call
//      for The Builder moves that row's count by one and moves the payload sha; a bare stamp refresh
//      moves neither. A roster agent with no rows in the window prints "no calls in the window" and
//      no invented tokens; a NULL call_source prints as *unlabelled* and is never folded into a
//      named source (LOG-128: an absent fact is not evidence of automation). "Not read" and "zero"
//      render differently -- the failure mode a block like this actually has is a missing read
//      rendered as a zero. No `%` survives any render: counts and sums, never a rate.
//      fetchFacts() is asserted to read BOTH views by their named columns and the roster by lane, and
//      NOT to read ai_activity_log directly -- the aggregation has one home, the view, because the
//      table is bigger than a REST page and a second home here would be the truncated number again.
//   2. DOC (always runs): the shipped docs/runbooks/standing-brief.md carries the block, in order.
//   3. LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY; DECLARED not-run otherwise): both views answer,
//      every usage row names an agent whose lane is `governance`, every row has calls >= 1, and the
//      census row's counts are internally consistent. NO POPULATION IS PINNED HERE, deliberately:
//      log-143c's live arm pinned `judge_runs >= 1` in a rolling window and went red on dev the week
//      the rows aged out (verdict 03196573, 2026-09-11). The live numbers are the kickoff's QA, run
//      once at the ship; this arm asserts shape, which does not age.
//
// The functions are exported individually so the kickoff's dry-run driver can tally each arm's
// pre-change result on its own (STANDARDS.md Section 4); run() is what run-all.js and selfRun() call.
//
// Invocation: node tests/regression/ses-360-governance-agents-block.test.mjs
// (STANDARDS.md Section 2 rule 5 for the credentialed form.)

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import * as brief from "../../scripts/render-standing-brief.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RENDERER_REL = "scripts/render-standing-brief.js";
const BRIEF_REL = "docs/runbooks/standing-brief.md";
const readRepo = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

export const GROUP = "**Governance agents, last 7 days**";
export const USAGE_VIEW = "governance_agent_usage";
export const CENSUS_VIEW = "ship_handoff_census";

// A FIXED clock, same pair the sibling guards use -- renderBlock() takes the timestamp as an argument
// precisely so this is possible.
const T1 = "2026-09-11T20:00:00.000Z";
const T2 = "2026-09-12T02:30:00.000Z";

// ---------------------------------------------------------------------------
// Fixtures -- the live shape at this ship (measured 2026-09-11 19:51Z, paged, not the 1,000-row cap).
// ---------------------------------------------------------------------------
const ROSTER = [
  { id: "devmanager", role: "Governance — Development Manager", code: "GV-01" },
  { id: "researcher", role: "Governance — Researcher", code: "GV-02" },
  { id: "prioritizer", role: "Governance — Prioritizer", code: "GV-03" },
  { id: "designer", role: "Governance — Designer", code: "GV-04" },
  { id: "builder", role: "Governance — Builder", code: "GV-05" },
  { id: "verifier", role: "Governance — Verifier", code: "GV-06" },
];

const USAGE = [
  { code: "GV-01", agent_id: "devmanager", role: "Governance — Development Manager", call_source: "session", calls: 1, input_tokens: 73405, output_tokens: 2000, untokened: 0 },
  { code: "GV-02", agent_id: "researcher", role: "Governance — Researcher", call_source: "session", calls: 9, input_tokens: 1971842, output_tokens: 196132, untokened: 0 },
  { code: "GV-03", agent_id: "prioritizer", role: "Governance — Prioritizer", call_source: "mcp", calls: 1, input_tokens: 1964, output_tokens: 1240, untokened: 0 },
  { code: "GV-03", agent_id: "prioritizer", role: "Governance — Prioritizer", call_source: "session", calls: 575, input_tokens: 2019527, output_tokens: 82030, untokened: 0 },
  { code: "GV-03", agent_id: "prioritizer", role: "Governance — Prioritizer", call_source: null, calls: 716, input_tokens: 20121, output_tokens: 4652, untokened: 709 },
  { code: "GV-04", agent_id: "designer", role: "Governance — Designer", call_source: "session", calls: 2, input_tokens: 163531, output_tokens: 0, untokened: 0 },
  { code: "GV-05", agent_id: "builder", role: "Governance — Builder", call_source: "session", calls: 1, input_tokens: 84992, output_tokens: 0, untokened: 0 },
  { code: "GV-06", agent_id: "verifier", role: "Governance — Verifier", call_source: "session", calls: 5, input_tokens: 5352037, output_tokens: 0, untokened: 0 },
];

const SHIPS = { ships: 27, ships_all_four: 3, missing_rank: 1, missing_kickoff: 24, missing_sha: 22, missing_verdict: 0 };

const GOV = (over = {}) => ({ roster: ROSTER, usage: USAGE, ships: SHIPS, ...over });

// The mutation control the ticket names: ONE more logged call for The Builder.
const ONE_MORE_BUILDER_CALL = USAGE.map(r => (r.agent_id === "builder" ? { ...r, calls: 2, input_tokens: r.input_tokens + 1 } : r));

const ITEMS = [{ id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 }];
const FACTS = (over = {}) => ({
  items: ITEMS, settings: null, drain: null,
  decisions: { open: [], finalWeek: 0, reversedWeek: 0 },
  census: [{ judgment_class: "P1 - Improves John's Skills", ord: 1, ratified: 0, proposed: 0, rejected: 0, total: 0, newest_root_claim_ref: null, newest_root_claim: null }],
  johnModel: [{ ord: 0, scope: "overall", pattern_no: null, imperative: null, citing_decisions: 0, finalised_unreversed: 0, reversed: 0, open: 0, agreement_rate: null }],
  inventionUse: [{ window: "7d", ord: 1, judge_runs: 0, judge_runs_real_visitors: 0, distinct_real_visitors: 0, first_real_visitor_at: null, last_real_visitor_at: null }],
  served: { counts: [], top: [], lastRankedAt: null },
  governance: GOV(),
  ...over,
});

const builderRow = out => out.split("\n").find(l => l.includes("Governance — Builder"));

// ---------------------------------------------------------------------------
// Arm 1 -- SOURCE.
// ---------------------------------------------------------------------------
export function theHelperExistsAndIsPure() {
  // Asserted rather than imported by name: a missing named export throws at link time, before any
  // assertion runs, and the dry-run could not then say WHICH clause failed.
  assert.strictEqual(typeof brief.renderGovernanceAgents, "function",
    `${RENDERER_REL} must export renderGovernanceAgents(gov, stamp) -- the pure renderer the block is built from`);
  const a = brief.renderGovernanceAgents(GOV(), "as of X");
  const b = brief.renderGovernanceAgents(GOV(), "as of X");
  assert.strictEqual(a, b, "the same facts and stamp must render byte-identically -- the block is a function of its inputs");
}

export function oneMoreBuilderCallMovesItsRowByOne() {
  const base = brief.renderGovernanceAgents(GOV(), "as of X");
  const row = builderRow(base);
  assert.ok(row, "the block must carry a row for The Builder's role");
  assert.ok(/\| `session` \| 1 \| 84992 \| 0 \|/.test(row), `The Builder's session row must read calls 1, input 84992, output 0 -- got: ${row}`);

  const moved = brief.renderGovernanceAgents(GOV({ usage: ONE_MORE_BUILDER_CALL }), "as of X");
  const movedRow = builderRow(moved);
  assert.ok(/\| `session` \| 2 \| 84993 \| 0 \|/.test(movedRow),
    `one more logged Builder call must move that row's count from 1 to 2 (the ticket's own QA) -- got: ${movedRow}`);
  assert.notStrictEqual(moved, base, "control: the mutation must change the render");
  // Nothing else moved: every other line is identical.
  const diff = base.split("\n").filter((l, i) => l !== moved.split("\n")[i]);
  assert.strictEqual(diff.length, 1, `exactly one line must differ between the two renders, got ${diff.length}`);
}

export function silentAgentsUnlabelledSourcesAndTheShipsLineRenderPlainly() {
  const out = brief.renderGovernanceAgents(GOV(), "as of X");
  assert.ok(out.startsWith(`${GROUP} — *as of X.*`), "the group must open with its name and the as-of stamp");

  // Every roster role is a row, in roster (code) order: the Development Manager (GV-01) before the Verifier (GV-06).
  for (const a of ROSTER) assert.ok(out.includes(`| ${a.role} |`), `the block must carry a row for ${a.role}`);
  assert.ok(out.indexOf("Governance — Development Manager") < out.indexOf("Governance — Verifier"),
    "roles must render in roster (code) order, GV-01 first");

  // The Prioritizer's three sources are three rows, and the NULL one is said as unlabelled -- never
  // folded into a named source, never dropped.
  assert.ok(/\| Governance — Prioritizer \| `session` \| 575 \| 2019527 \| 82030 \|/.test(out), "the Prioritizer's session row must carry its counts");
  assert.ok(/\| Governance — Prioritizer \| `mcp` \| 1 \| 1964 \| 1240 \|/.test(out), "the Prioritizer's mcp row must render");
  assert.ok(/\| Governance — Prioritizer \| \*unlabelled\* \| 716 \(709 untokened\) \| 20121 \| 4652 \|/.test(out),
    "a NULL call_source must render as *unlabelled* with its untokened count, not as a named source and not as nothing");
  assert.ok(/\*unlabelled\* is a NULL `call_source`/.test(out), "the block must say what unlabelled means (LOG-128: absent is not automation)");

  // A roster agent with no rows in the window: said, with no invented tokens.
  const silent = brief.renderGovernanceAgents(GOV({ usage: USAGE.filter(r => r.agent_id !== "builder") }), "as of X");
  const silentRow = builderRow(silent);
  assert.ok(/\| Governance — Builder \| \*no calls in the window\* \| 0 \| — \| — \|/.test(silentRow),
    `an agent with no rows in the window must print "no calls in the window", 0, and em-dashes -- got: ${silentRow}`);

  // The ships line, SES-345's four legs, named.
  assert.ok(/\*\*Ships with all four handoff rows: 3 of 27\*\*/.test(out), "the ships line must carry all-four of ships");
  assert.ok(/kickoff_link 24, per-ticket sha 22, automation_rank 1, verdict 0/.test(out),
    "the ships line must say which leg is missing how often, in the order kickoff_link, sha, rank, verdict");
  assert.ok(out.includes("`SES-345`"), "the ships line must cite SES-345, whose definition the four legs are");

  // A different ships census renders differently (control).
  const zero = brief.renderGovernanceAgents(GOV({ ships: { ...SHIPS, ships_all_four: 0 } }), "as of X");
  assert.ok(/\*\*Ships with all four handoff rows: 0 of 27\*\*/.test(zero));
  assert.notStrictEqual(zero, out);
}

export function noRateEverSurvivesAnyPopulation() {
  for (const gov of [GOV(), GOV({ usage: ONE_MORE_BUILDER_CALL }), GOV({ usage: [] }), GOV({ ships: { ...SHIPS, ships: 1, ships_all_four: 1 } })]) {
    const out = brief.renderGovernanceAgents(gov, "as of X");
    assert.ok(!out.includes("%"), `no percent sign may survive any render -- counts and sums, never a rate:\n${out}`);
  }
}

export function anAbsentReadIsSaidNeverRenderedAsZeros() {
  for (const gov of [undefined, null, {}, { roster: ROSTER }, { roster: ROSTER, usage: USAGE }, { usage: USAGE, ships: SHIPS }]) {
    const out = brief.renderGovernanceAgents(gov, "as of X");
    assert.ok(out.startsWith(`${GROUP} — *as of X.*`), "an unread group still carries its heading and stamp");
    assert.ok(/was not read for this render/.test(out), `an absent read must be SAID, got:\n${out}`);
    assert.ok(!/\| Governance — /.test(out) && !/Ships with all four/.test(out),
      "an unread group must render neither a roster table nor a ships line -- a gap it never measured is not a zero");
  }
  // And the genuinely-empty window is a DIFFERENT render from the unread one.
  const empty = brief.renderGovernanceAgents(GOV({ usage: [], ships: { ships: 0, ships_all_four: 0, missing_rank: 0, missing_kickoff: 0, missing_sha: 0, missing_verdict: 0 } }), "as of X");
  assert.ok(!/was not read/.test(empty), "an empty window is a real state, not an unread one");
  assert.ok(/\*no calls in the window\*/.test(empty) && /0 of 0/.test(empty), "an empty window says so per role and on the ships line");
}

export function theGroupSitsBetweenServedClassAndProvenanceAndCarriesTheStamp() {
  const block = brief.renderBlock(FACTS(), T1);
  const stamp = brief.asOf(T1);
  const lines = block.split("\n");
  const served = lines.findIndex(l => l.startsWith("**Board by served class**"));
  const gov = lines.findIndex(l => l.startsWith(GROUP));
  const prov = lines.findIndex(l => l.startsWith("*Provenance:"));
  assert.ok(served > -1 && gov > -1 && prov > -1, "renderBlock() must carry served-class, the governance group and the provenance footer");
  assert.ok(served < gov && gov < prov, `the governance group must sit strictly between Board by served class (${served}) and the provenance footer (${prov}); got ${gov}`);
  assert.ok(lines[gov].includes(stamp), "the group's heading line must carry the render's as-of stamp");

  const unread = brief.renderBlock(FACTS({ governance: undefined }), T1);
  assert.ok(unread.includes(GROUP), "renderBlock() must still carry the group when the facts have no governance key");
  assert.ok(/was not read for this render/.test(unread.slice(unread.indexOf(GROUP), unread.indexOf("*Provenance:"))),
    "renderBlock() must say the group was not read when the facts have no governance key");
  assert.strictEqual(brief.shaFromBlock(unread), brief.factsSha(FACTS({ governance: undefined })).slice(0, 16),
    "the sha must still be computable with no governance facts -- the group is additive");
}

export function usageMovesTheShaButAStampRefreshDoesNot() {
  const b1 = brief.renderBlock(FACTS(), T1);
  const b2 = brief.renderBlock(FACTS(), T2);
  assert.notStrictEqual(b1, b2, "control: two clocks must render differently (the stamp)");
  assert.strictEqual(brief.shaFromBlock(b1), brief.shaFromBlock(b2), "identical facts under different clocks must carry the SAME sha -- otherwise --check fires on every refresh");

  const moved = brief.renderBlock(FACTS({ governance: GOV({ usage: ONE_MORE_BUILDER_CALL }) }), T1);
  assert.notStrictEqual(brief.shaFromBlock(moved), brief.shaFromBlock(b1), "one more Builder call must move the payload sha");
  const shipsMoved = brief.renderBlock(FACTS({ governance: GOV({ ships: { ...SHIPS, ships_all_four: 4 } }) }), T1);
  assert.notStrictEqual(brief.shaFromBlock(shipsMoved), brief.shaFromBlock(b1), "a ship gaining its fourth row must move the payload sha");
  const rosterMoved = brief.renderBlock(FACTS({ governance: GOV({ roster: [...ROSTER, { id: "gv7", role: "Governance — Seventh", code: "GV-07" }] }) }), T1);
  assert.notStrictEqual(brief.shaFromBlock(rosterMoved), brief.shaFromBlock(b1), "a governance agent joining the roster must move the payload sha, even with no calls yet");
}

export function fetchFactsReadsTheTwoViewsAndTheRosterByLaneAndNeverTheLog() {
  const src = readRepo(RENDERER_REL);
  const usageClause = /governance_agent_usage\?select=code,agent_id,role,call_source,calls,input_tokens,output_tokens,untokened&order=code,call_source\.nullslast/;
  const censusClause = /ship_handoff_census\?select=ships,ships_all_four,missing_rank,missing_kickoff,missing_sha,missing_verdict/;
  const rosterClause = /agents\?select=id,role,code&lane=eq\.governance&order=code/;
  assert.ok(usageClause.test(src), "fetchFacts() must read governance_agent_usage with its columns NAMED and order pinned (code, call_source nulls last)");
  assert.ok(censusClause.test(src), "fetchFacts() must read ship_handoff_census with its six columns NAMED");
  assert.ok(rosterClause.test(src), "fetchFacts() must read the roster by LANE (agents.lane = 'governance'), ordered by code -- never by agent id (Rule #1)");
  for (const [clause, name] of [[usageClause, USAGE_VIEW], [censusClause, CENSUS_VIEW], [rosterClause, "agents?select=id,role,code"]]) {
    const mutated = src.split(name).join("some_other_relation");
    assert.notStrictEqual(mutated, src, `control: mutating ${name} changed nothing`);
    assert.ok(!clause.test(mutated), `control: the ${name} clause still passes after its own mutation -- it cannot fail`);
  }
  assert.ok(!/ai_activity_log\?select=/.test(src),
    "the renderer must never read ai_activity_log directly -- the table exceeds a REST page (1,311 governance rows in 7 days against a 1,000-row cap) and the aggregation has one home, the view");
  for (const id of ROSTER.map(r => r.id)) {
    assert.ok(!new RegExp(`['"\`]${id}['"\`]`).test(src), `${RENDERER_REL} must not name the agent id '${id}' -- roles come from rows, by lane (Rule #1, §19e)`);
  }
}

// ---------------------------------------------------------------------------
// Arm 2 -- DOC.
// ---------------------------------------------------------------------------
export function theShippedBriefCarriesTheBlockInOrder() {
  const text = readRepo(BRIEF_REL);
  assert.ok(text.includes(GROUP), `${BRIEF_REL} must carry the ${GROUP} block after this ship's re-render`);
  const lines = text.split("\n");
  const served = lines.findIndex(l => l.startsWith("**Board by served class**"));
  const gov = lines.findIndex(l => l.startsWith(GROUP));
  const prov = lines.findIndex(l => l.startsWith("*Provenance:"));
  assert.ok(served > -1 && gov > -1 && prov > -1, "the shipped brief must carry all three anchors");
  assert.ok(served < gov && gov < prov, "the governance group must sit strictly between Board by served class and the provenance footer in the shipped file");
  assert.ok(/\| Governance — Builder \|/.test(text), "the shipped block must carry The Builder's role row");
  assert.ok(/Ships with all four handoff rows: \d+ of \d+/.test(text), "the shipped block must carry the ships line with real numbers");
}

// ---------------------------------------------------------------------------
// Arm 3 -- LIVE.
// ---------------------------------------------------------------------------
async function restGet(url, key, q) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`REST ${q} -> HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  return res.json();
}

export async function theViewsAnswerWithAConsistentShape(url, key) {
  const roster = await restGet(url, key, "agents?select=id,role,code&lane=eq.governance&order=code");
  assert.ok(roster.length >= 6, `the governance roster must hold the six GV agents (SES-338), got ${roster.length}`);
  const ids = new Set(roster.map(r => r.id));

  const usage = await restGet(url, key, `${USAGE_VIEW}?select=code,agent_id,role,call_source,calls,input_tokens,output_tokens,untokened&order=code,call_source.nullslast`);
  assert.ok(Array.isArray(usage), `${USAGE_VIEW} must answer with an array`);
  for (const r of usage) {
    assert.ok(ids.has(r.agent_id), `${USAGE_VIEW} row names '${r.agent_id}', which is not a governance-lane agent -- the view's lane filter has drifted`);
    assert.ok(Number(r.calls) >= 1, `${USAGE_VIEW} must never return a zero-call row (${r.agent_id}/${r.call_source}) -- a GROUP BY row exists only because rows exist`);
    assert.ok(Number(r.input_tokens) >= 0 && Number(r.output_tokens) >= 0 && Number(r.untokened) >= 0 && Number(r.untokened) <= Number(r.calls),
      `${USAGE_VIEW} sums must be non-negative and untokened <= calls (${r.agent_id}/${r.call_source})`);
  }
  const keys = usage.map(r => `${r.agent_id}|${r.call_source}`);
  assert.strictEqual(new Set(keys).size, keys.length, `${USAGE_VIEW} must return one row per (agent, call_source)`);

  const census = await restGet(url, key, `${CENSUS_VIEW}?select=ships,ships_all_four,missing_rank,missing_kickoff,missing_sha,missing_verdict`);
  assert.strictEqual(census.length, 1, `${CENSUS_VIEW} must always return exactly one row (an aggregate with no GROUP BY), got ${census.length}`);
  const c = census[0];
  for (const k of ["ships", "ships_all_four", "missing_rank", "missing_kickoff", "missing_sha", "missing_verdict"]) {
    assert.ok(Number.isInteger(Number(c[k])) && Number(c[k]) >= 0, `${CENSUS_VIEW}.${k} must be a non-negative integer`);
    if (k !== "ships") assert.ok(Number(c[k]) <= Number(c.ships), `${CENSUS_VIEW}.${k} (${c[k]}) cannot exceed ships (${c.ships})`);
  }
}

export async function run(ctx = {}) {
  const results = [];

  theHelperExistsAndIsPure();
  oneMoreBuilderCallMovesItsRowByOne();
  silentAgentsUnlabelledSourcesAndTheShipsLineRenderPlainly();
  noRateEverSurvivesAnyPopulation();
  anAbsentReadIsSaidNeverRenderedAsZeros();
  results.push("source-render-governance-builder-plus-one-silent-unlabelled-ships-rate-absent");

  theGroupSitsBetweenServedClassAndProvenanceAndCarriesTheStamp();
  usageMovesTheShaButAStampRefreshDoesNot();
  fetchFactsReadsTheTwoViewsAndTheRosterByLaneAndNeverTheLog();
  results.push("source-renderblock-placement-sha-and-fetch-contract");

  theShippedBriefCarriesTheBlockInOrder();
  results.push("doc-shipped-brief-carries-the-block-in-order");

  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      `the live arm (${USAGE_VIEW} answers with one row per governance agent x call_source, every agent on the governance lane; ${CENSUS_VIEW} answers with exactly one consistent row)`,
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent; run with --env-file-if-exists=.env.local or export the two names read from " +
        "public.runner_secrets. Measured when this shipped (2026-09-11 19:51Z, paged): 1,311 governance rows in 7 days, " +
        "The Builder 1 session call, 27 ships of which 3 carried all four handoff rows (LOG-149, SES-354, SES-352).",
    );
  } else {
    await theViewsAnswerWithAConsistentShape(url, key);
    results.push("live-views-answer-consistent-shape");
    // The same undici/libuv teardown race log-143c measured (fetch immediately followed by process.exit
    // crashes Node 24 on Windows); the pause is scoped to the live branch, which is the only one that fetches.
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  return results;
}

selfRun(import.meta.url, run);
export default run;
