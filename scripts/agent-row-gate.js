#!/usr/bin/env node
// DeepBench v7.0.494 | scripts/agent-row-gate.js | SES-394 — is this agent-row write build work, or a card?
//
// WHAT THIS DECIDES, and why it is a script rather than one more sentence in a rule file. Before
// today the roster rule said one thing — "Automated-mode sessions never edit rows belonging to an
// active agent (gated, §19v P5)" — and John had already ruled twice that it says too much:
//
//   20a06cf3 (2026-09-14): "If we agree on an agent ticket ahead of the build, go ahead and create
//   without my approval and make it so. Only save my approval if you create an agent i don't know
//   about."
//   38a1c566 (2026-09-15, backlog_id SES-394): "you don't need my permission for tickets to change
//   guardrails if we have already discussed. just like making an agent active".
//
// Both are unreversed `runner_decisions` rows, read live this cycle rather than recalled. The rule
// they produced is `public.governance_rules.id = 'AGENT-ROW-AGREED-TICKET'` (canonical home
// `.claude/rules/agent-roster-inert.md`, rendered into `docs/ARCHITECTURE.md` §19v); this file is
// the callable form of it, so a cycle standing in front of an agent-row write asks a function
// instead of remembering a paragraph.
//
// THE THREE THINGS STILL RESERVED TO JOHN are the whole reason the classifier has three gating
// clauses and not one, and an editor must not collapse them:
//   1. `activate` — flipping `agents.is_active` on is John signing the hire card (§19v P7). It is
//      gated EVEN ON A john-named TICKET. That is the case most likely to be "simplified" away by
//      someone reading the rule as "agreed ticket ⇒ go ahead", and it is exactly the case John's
//      own words preserved ("just like making an agent active" — the analogy only works because
//      activation stays his).
//   2. `agentKnownToJohn === false` — "Only save my approval if you create an agent i don't know
//      about", verbatim. An agreed ticket does not launder an agent he has never seen.
//   3. No authority at all — the ticket is not `scope_origin = 'john-named'` AND no unreversed
//      decision names it. This is the default, and it is the pre-SES-394 behaviour unchanged.
//
// FAIL-CLOSED ON `agentKnownToJohn`, ONE WAY ONLY: `=== false` gates, `undefined` does not. That
// asymmetry is deliberate and is the difference between a usable gate and an unusable one. The CLI
// cannot learn from a ticket id whether John has seen an agent, so it passes nothing; if `undefined`
// gated, every CLI call would return `gated` and the script would be a constant, not a classifier.
// A caller that KNOWS the agent is new says so explicitly, and that assertion is what gates.
//
// `verdict='build'` IS NEVER A LICENCE TO SKIP THE BEFORE-IMAGE. The rule's own statement carries
// it: "every such row is written with its own runner_before_images row (row_data NULL for an
// INSERT) under one decision handle." This script answers "card or no card", never "reversible or
// not" — §19v's before-image regime is untouched by it, and a build-verdict write with no image is
// still a write that does not happen.
//
// Usage:
//   node scripts/agent-row-gate.js --ticket=AGT-70 --action=create
//   node scripts/agent-row-gate.js --ticket=DAT-27 --action=edit-active --json
//
// Flags:
//   --ticket=<ID>   The backlog id whose row carries the authority. Required.
//   --action=<a>    create | edit-active | activate. Required.
//   --json          One line of machine-readable JSON instead of prose.
//
// Exit codes (the convention scripts/check-version-claim.js and export-governance-snapshot.js set):
//   0  verdict `build` — this write is build work under the ticket, no approval card
//   1  verdict `gated` — John decides this one; ALSO the code for "cannot run" (missing env var,
//      missing/unknown flag, ticket not found, REST failure). Unlike those two scripts this file
//      does NOT reserve a separate exit 2 for unrunnable, and the kickoff's contract says why:
//      "missing env var → exit 1 naming it, never a silent pass". A gate that cannot read the board
//      must land on the SAFE side of its own question, and the safe side here is `gated`. The
//      printed line always distinguishes the two ("cannot run" vs a real verdict), so the
//      information is not lost — only the exit code is deliberately merged toward safety.
//
// Env (read from process.env only — never hardcoded, never printed):
//   SUPABASE_URL           Project REST base.
//   SUPABASE_SERVICE_KEY   Service-role key. backlog_items is service_role-only.
//
// THE RESULT CARRIES `clause` AS WELL AS `reason`, and that is not redundancy. `reason` is prose for
// a human; `clause` is the machine-readable name of the branch that fired, so neither the CLI nor the
// regression test has to re-derive the precedence order by pattern-matching English — a second
// implementation agreeing with itself is exactly what SES-45 forbids. The CLI uses it to decide
// whether its "judged on scope_origin alone" footnote is even true (it is true only of the
// no-authority clause; an `activate` is never build work however the ticket was agreed).
//
// classifyAgentRowWrite() is pure and exported so tests/regression/ses-394-agent-row-gate.test.mjs
// exercises every branch with no network — the seam-proof convention this repo's other checkers
// use. The network/CLI path runs only when this file is the process entry point.

import { pathToFileURL } from "url";

export const RULE_ID = "AGENT-ROW-AGREED-TICKET";
export const ACTIONS = ["create", "edit-active", "activate"];

// ---------------------------------------------------------------------------
// The classifier — pure
// ---------------------------------------------------------------------------
//
// ORDER IS PART OF THE CONTRACT, not an implementation detail. `activate` is tested FIRST so that
// {activate, john-named} can never fall through to the authority clause and come back `build`: the
// hire card must survive the strongest possible authority. Likewise `agentKnownToJohn === false` is
// tested BEFORE the authority clause, so an agreed ticket cannot outvote "an agent i don't know
// about". Both orderings are pinned by the regression test's matrix.
export function classifyAgentRowWrite({ action, scopeOrigin, decisionNamesTicket, agentKnownToJohn } = {}) {
  if (!ACTIONS.includes(action)) {
    // Not one of the three, so no clause of the rule applies to it and the rule is not what decided
    // this. Fail closed rather than bless an action nobody specified — `rule` is null precisely so a
    // reader cannot mistake this for the rule having ruled.
    return {
      verdict: "gated",
      rule: null,
      clause: "unknown-action",
      reason: `action ${JSON.stringify(action ?? null)} is not one of ${ACTIONS.join(" | ")} — ` +
        `rule ${RULE_ID} classifies no other action, so this falls back to John.`,
    };
  }

  if (action === "activate") {
    return {
      verdict: "gated",
      rule: RULE_ID,
      clause: "hire-card",
      reason: `action 'activate' — flipping agents.is_active on is John signing the hire card ` +
        `(§19v P7); ${RULE_ID} leaves it gated however the ticket was agreed.`,
    };
  }

  if (agentKnownToJohn === false) {
    return {
      verdict: "gated",
      rule: RULE_ID,
      clause: "unseen-agent",
      reason: `agentKnownToJohn is false — ${RULE_ID} reserves the creation of an agent John has ` +
        `not seen to him, and an agreed ticket does not substitute for his having seen it.`,
    };
  }

  const byScope = scopeOrigin === "john-named";
  const byDecision = decisionNamesTicket === true;
  if (!byScope && !byDecision) {
    return {
      verdict: "gated",
      rule: RULE_ID,
      clause: "no-authority",
      reason: `no agreed-ticket authority — scope_origin is ${JSON.stringify(scopeOrigin ?? null)} ` +
        `(not 'john-named') and no unreversed runner_decisions row was asserted to name this ticket; ` +
        `${RULE_ID} gates an agent-row write no agreed ticket names.`,
    };
  }

  // Both limbs are named in the reason when both are present: which one carried the write is the
  // fact a reviewer reconstructing the decision needs, and "it was allowed" is not that fact.
  const limb = byScope && byDecision
    ? `scope_origin = 'john-named' AND an unreversed runner_decisions row names this ticket`
    : byScope
      ? `scope_origin = 'john-named'`
      : `an unreversed runner_decisions row names this ticket`;
  return {
    verdict: "build",
    rule: RULE_ID,
    clause: "agreed-ticket",
    reason: `action '${action}' under ${limb} — ${RULE_ID} makes this build work under the ticket, ` +
      `no approval card. It still owes its own runner_before_images row under one decision handle.`,
  };
}

// ---------------------------------------------------------------------------
// Network + CLI
// ---------------------------------------------------------------------------

async function rest(base, key, pathAndQuery) {
  const url = `${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`;
  let res;
  try {
    res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  } catch (e) {
    return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* an unreadable body is still a failure */ }
    return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}` };
  }
  try {
    const rows = await res.json();
    if (!Array.isArray(rows)) return { error: `Supabase REST returned a non-array payload for ${pathAndQuery}` };
    return { rows };
  } catch (e) {
    return { error: `Supabase REST returned unparseable JSON: ${e.message}` };
  }
}

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function emit(line, code, json) {
  if (process.argv.includes("--json")) console.log(JSON.stringify(json));
  else if (code === 0) console.log(line);
  else console.error(line);
  process.exit(code);
}

async function main() {
  const ticket = arg("ticket", "");
  const action = arg("action", "");

  if (!ticket || !action) {
    const missing = [!ticket && "--ticket=<ID>", !action && "--action=<create|edit-active|activate>"].filter(Boolean).join(", ");
    return emit(
      `agent-row-gate: cannot run — missing required flag(s): ${missing}. Exiting 1 (gated), which is NOT a verdict: nothing was read.`,
      1, { ok: false, exitCode: 1, kind: "missing-flag", ticket, action, missing });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    const missing = [!supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ");
    return emit(
      `agent-row-gate: cannot run — missing required env var(s): ${missing}. Exiting 1 (gated), which is NOT a pass: ${ticket}'s row was never read.`,
      1, { ok: false, exitCode: 1, kind: "missing-env", ticket, action, missing });
  }

  const res = await rest(supabaseUrl, supabaseKey,
    `backlog_items?select=backlog_id,scope_origin&backlog_id=eq.${encodeURIComponent(ticket)}&limit=1`);
  if (res.error) {
    return emit(
      `agent-row-gate: cannot run — ${res.error}. Exiting 1 (gated), which is NOT a pass: ${ticket}'s row was never read.`,
      1, { ok: false, exitCode: 1, kind: "rest-failed", ticket, action, error: res.error });
  }
  if (!res.rows.length) {
    return emit(
      `agent-row-gate: cannot run — no backlog_items row for ticket ${ticket}. Exiting 1 (gated): a write no ticket names is John's by ${RULE_ID}.`,
      1, { ok: false, exitCode: 1, kind: "ticket-not-found", ticket, action });
  }

  const scopeOrigin = res.rows[0].scope_origin ?? null;

  // THE CLI JUDGES ON scope_origin ALONE, and says so in the line it prints. The rule has a second
  // limb — "an unreversed runner_decisions row names both the ticket and the change" — which a ticket
  // id cannot settle on its own: whether a decision names THE CHANGE is a reading, not a column.
  // Passing `decisionNamesTicket: false` here therefore understates authority by construction, and a
  // `gated` line from this CLI means "no authority in scope_origin", never "no authority exists".
  // `agentKnownToJohn` is left undefined for the same reason — unknowable from a ticket id, and
  // asserting it false would gate every call (see the header's fail-closed-one-way note).
  const v = classifyAgentRowWrite({ action, scopeOrigin, decisionNamesTicket: false });

  const line = `agent-row-gate: ${ticket} · action=${action} · scope_origin=${JSON.stringify(scopeOrigin)} ` +
    `→ ${v.verdict.toUpperCase()} — ${v.reason}` +
    (v.clause === "no-authority"
      ? ` (judged on scope_origin alone; an unreversed runner_decisions row naming this ticket AND this change would still make it build work.)`
      : "");

  return emit(line, v.verdict === "build" ? 0 : 1,
    { ok: v.verdict === "build", exitCode: v.verdict === "build" ? 0 : 1, kind: "verdict",
      ticket, action, scope_origin: scopeOrigin, verdict: v.verdict, rule: v.rule, clause: v.clause, reason: v.reason });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
