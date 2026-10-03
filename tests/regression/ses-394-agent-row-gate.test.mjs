// DeepBench v7.0.494 | tests/regression/ses-394-agent-row-gate.test.mjs | SES-394
//
// Pins scripts/agent-row-gate.js — the callable form of governance rule AGENT-ROW-AGREED-TICKET
// (public.governance_rules, canonical home .claude/rules/agent-roster-inert.md, rendered into
// docs/ARCHITECTURE.md §19v). The rule says an agent-row write named by a ticket John agreed to is
// BUILD WORK with a before-image, not an approval card — and keeps three things gated. This file
// exists to stop the three gated ones quietly becoming two.
//
// WHY THE MATRIX IS SHAPED IN PAIRS, and why it must not be "tidied" into a list of passing cases.
// STANDARDS.md Section 4's LOO-013 lesson: a test must assert WHICH BRANCH FIRED, and the only way
// to do that for a classifier is to hold everything constant but the one input under test and show
// the verdict MOVES. So every gated case below has a build twin differing in exactly one field:
//
//   {create,       john-named} build   ⟷ {create,       discovered}                    gated
//   {edit-active,  john-named} build   ⟷ {edit-active,  discovered}                    gated
//   {create,       discovered, decisionNamesTicket:true} build
//                                      ⟷ {create,       discovered}                    gated
//   {create,       john-named} build   ⟷ {activate,     john-named}                    gated
//   {create,       john-named} build   ⟷ {create, john-named, agentKnownToJohn:false}  gated
//
// A suite that only asserted the five `build` rows would pass against a classifier that returns
// "build" unconditionally — the exact vacuous green SES-28 was written about.
//
// THE NEGATIVE FIXTURE IS A LIVE BOARD VALUE, not an invented string: `discovered` is what
// public.backlog_items.scope_origin actually reads on DAT-27/DAT-28/DAT-29 today. A fixture of
// "not-john-named" would pass while proving nothing about the values the CLI will really see.
//
// CREDENTIAL SPLIT. Parts A and B run everywhere and are the substance of the pin. Part C reaches
// the live board and DECLARES itself not-run where credentials are absent (SES-180's notRun), never
// silently skipping — an invisible gap is indistinguishable from coverage.

import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { classifyAgentRowWrite, RULE_ID, ACTIONS } from "../../scripts/agent-row-gate.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATE = path.join(REPO, "scripts", "agent-row-gate.js");

function eq(actual, expected, what) {
  if (actual !== expected) {
    throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// --- Part A: the helper matrix (kickoff §6) ----------------------------------------------------

function partA() {
  const matrix = [
    { label: "{create, john-named}",
      input: { action: "create", scopeOrigin: "john-named" }, expect: "build" },
    { label: "{create, discovered} — the SAME seed, one field moved",
      input: { action: "create", scopeOrigin: "discovered" }, expect: "gated" },
    { label: "{edit-active, john-named}",
      input: { action: "edit-active", scopeOrigin: "john-named" }, expect: "build" },
    { label: "{edit-active, discovered}",
      input: { action: "edit-active", scopeOrigin: "discovered" }, expect: "gated" },
    { label: "{create, discovered, decisionNamesTicket:true} — the second limb carries it alone",
      input: { action: "create", scopeOrigin: "discovered", decisionNamesTicket: true }, expect: "build" },
    { label: "{activate, john-named} — the hire card survives the strongest authority",
      input: { action: "activate", scopeOrigin: "john-named" }, expect: "gated" },
    { label: "{create, john-named, agentKnownToJohn:false} — an agent John has not seen",
      input: { action: "create", scopeOrigin: "john-named", agentKnownToJohn: false }, expect: "gated" },
  ];

  for (const c of matrix) {
    const got = classifyAgentRowWrite(c.input);
    eq(got.verdict, c.expect, `classifyAgentRowWrite ${c.label}`);
    eq(got.rule, RULE_ID, `classifyAgentRowWrite ${c.label} names the deciding rule`);
    if (!got.reason || typeof got.reason !== "string" || got.reason.length < 20) {
      throw new Error(`classifyAgentRowWrite ${c.label}: reason must name the deciding clause, got ${JSON.stringify(got.reason)}`);
    }
  }

  // WHICH CLAUSE DECIDED, not merely which verdict — the LOO-013 assertion. Three inputs below all
  // return "gated", and a verdict-only check cannot tell them apart; that indistinguishability is
  // exactly how a collapsed precedence order would hide. If `activate` ever fell through to the
  // authority clause, {activate, john-named} would STILL read "gated" while the hire card had quietly
  // stopped being the reason — and a later ticket that made the authority clause more permissive
  // would then silently unlock activation. Asserted on the machine-readable `clause`, never by
  // pattern-matching the English `reason` (a second reader of an unversioned format, SES-45).
  eq(classifyAgentRowWrite({ action: "activate", scopeOrigin: "john-named" }).clause,
    "hire-card", "{activate, john-named} must be gated BY THE HIRE-CARD clause");
  eq(classifyAgentRowWrite({ action: "create", scopeOrigin: "john-named", agentKnownToJohn: false }).clause,
    "unseen-agent", "{create, john-named, agentKnownToJohn:false} must be gated BY THE UNSEEN-AGENT clause");
  eq(classifyAgentRowWrite({ action: "create", scopeOrigin: "discovered" }).clause,
    "no-authority", "{create, discovered} must be gated BY THE AUTHORITY clause");
  eq(classifyAgentRowWrite({ action: "create", scopeOrigin: "john-named" }).clause,
    "agreed-ticket", "{create, john-named} must be built BY THE AGREED-TICKET clause");
  eq(classifyAgentRowWrite({ action: "create", scopeOrigin: "discovered", decisionNamesTicket: true }).clause,
    "agreed-ticket", "the decision limb reaches the same clause as the scope_origin limb");

  // `undefined` must NOT gate the way `false` does — the asymmetry the CLI depends on. If this ever
  // became a plain falsy test, every CLI call would return gated and the script would be a constant.
  eq(classifyAgentRowWrite({ action: "create", scopeOrigin: "john-named", agentKnownToJohn: undefined }).verdict,
    "build", "agentKnownToJohn undefined is not an assertion of false");

  // An action outside the three fails closed and does NOT claim the rule decided it.
  const bogus = classifyAgentRowWrite({ action: "delete-agent", scopeOrigin: "john-named" });
  eq(bogus.verdict, "gated", "an unrecognised action fails closed");
  eq(bogus.rule, null, "an unrecognised action does not attribute itself to the rule");
  eq(bogus.clause, "unknown-action", "an unrecognised action names its own clause, not the rule's");
  eq(ACTIONS.join(","), "create,edit-active,activate", "the action vocabulary is the kickoff's three");
}

// --- Part B: the CLI, credential-free half -----------------------------------------------------
//
// The contract's own words: "missing env var → exit 1 naming it, never a silent pass." Asserted by
// running the real CLI with both variables REMOVED from the child's environment — a deleted key,
// not an empty string, because an unattended cloud cycle has the key absent rather than blank and a
// test that only covers "" would miss the live shape (the SES-215 lesson, one file over).
function partB() {
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_KEY;

  const r = spawnSync(process.execPath, [GATE, "--ticket=AGT-70", "--action=create"], { env, encoding: "utf8" });
  eq(r.status, 1, "CLI with no credentials must exit 1 (gated), never 0");
  const out = `${r.stdout}${r.stderr}`;
  if (!out.includes("SUPABASE_URL") || !out.includes("SUPABASE_SERVICE_KEY")) {
    throw new Error(`CLI with no credentials must NAME the missing env var(s); printed: ${out.trim()}`);
  }
  if (!/NOT a pass/i.test(out)) {
    throw new Error(`CLI with no credentials must say it is not a pass; printed: ${out.trim()}`);
  }

  // A missing flag is the same fail-closed direction, and must not be reported as a verdict.
  const noFlags = spawnSync(process.execPath, [GATE], { env, encoding: "utf8" });
  eq(noFlags.status, 1, "CLI with no flags must exit 1");
}

// --- Part C: the CLI against the live board, both directions -----------------------------------

async function partC() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("SES-394 part C — the live CLI both directions",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are absent, so the CLI could not read backlog_items.scope_origin. " +
      "Run the suite with credentials exported (STANDARDS.md Section 2 rule 5) to cover this half.");
    return;
  }

  async function ticketWith(scopeOrigin) {
    const url = `${base.replace(/\/+$/, "")}/rest/v1/backlog_items` +
      `?select=backlog_id&scope_origin=eq.${encodeURIComponent(scopeOrigin)}&order=backlog_id.asc&limit=1`;
    const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(`backlog_items read failed: HTTP ${res.status} ${res.statusText}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? rows[0].backlog_id : null;
  }

  // Read the fixtures off the live board rather than hardcoding two ticket ids: a ticket's
  // scope_origin is editable, so a pinned id is a test that silently stops testing the direction it
  // was written for the day somebody retypes that field.
  const named = await ticketWith("john-named");
  const discovered = await ticketWith("discovered");

  if (!named || !discovered) {
    notRun("SES-394 part C — the live CLI both directions",
      `the board currently has ${named ? "" : "no john-named ticket"}${!named && !discovered ? " and " : ""}` +
      `${discovered ? "" : "no discovered ticket"}, so one direction has no fixture to run against.`);
    return;
  }

  const run = (ticket) => spawnSync(process.execPath, [GATE, `--ticket=${ticket}`, "--action=create"], { encoding: "utf8" });

  const ok = run(named);
  eq(ok.status, 0, `CLI --ticket=${named} --action=create (scope_origin john-named) must exit 0`);
  if (!ok.stdout.includes("BUILD") || !ok.stdout.includes("john-named")) {
    throw new Error(`CLI on ${named} must print a BUILD verdict naming the scope_origin it read; printed: ${ok.stdout.trim()}`);
  }

  const gated = run(discovered);
  eq(gated.status, 1, `CLI --ticket=${discovered} --action=create (scope_origin discovered) must exit 1`);
  const gatedOut = `${gated.stdout}${gated.stderr}`;
  if (!gatedOut.includes("GATED") || !gatedOut.includes("discovered")) {
    throw new Error(`CLI on ${discovered} must print a GATED verdict naming the scope_origin it read; printed: ${gatedOut.trim()}`);
  }

  // The footnote is true only of the no-authority clause, so it must appear there and NOWHERE else:
  // an `activate` is never build work however the ticket was agreed, and telling a reader a decision
  // row "would still make it build work" about a hire card would be a false statement printed by the
  // gate itself.
  if (!gatedOut.includes("judged on scope_origin alone")) {
    throw new Error(`a no-authority GATED line must carry the scope_origin-alone footnote; printed: ${gatedOut.trim()}`);
  }
  const act = spawnSync(process.execPath, [GATE, `--ticket=${named}`, "--action=activate"], { encoding: "utf8" });
  eq(act.status, 1, `CLI --ticket=${named} --action=activate must exit 1 even on a john-named ticket`);
  const actOut = `${act.stdout}${act.stderr}`;
  if (actOut.includes("judged on scope_origin alone")) {
    throw new Error(`a hire-card GATED line must NOT claim a decision row could make it build work; printed: ${actOut.trim()}`);
  }

  // The two runs differ ONLY in the ticket id, and the board value they each printed is in the
  // output above — so the exit codes cannot both be explained by anything but the classifier.
  const unknown = run("SES-000-NOT-A-TICKET");
  eq(unknown.status, 1, "CLI on a ticket with no row must exit 1 rather than pass");
}

async function run() {
  partA();
  partB();
  await partC();
}

selfRun(import.meta.url, run);
export default run;
