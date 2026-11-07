// DeepBench v7.0.977 | tests/regression/agt-610-refusal-ledger.test.mjs | AGT-610 -- the attempt
// ledger's migration, the pickup's pure half, and the two live gates.
//
// FEATURE: AGT-610 T1 + T2. John's standing decision 6e94edcb (2026-11-05): a ticket the platform's
// safety check refused is redesigned by the team at most twice, the second attempt differing from
// the first, and then ONE diagnostic that changes nothing. His AMENDMENT is the load-bearing half --
// he REJECTED a third attempt through another tool or a reworded step, so the third step is
// diagnosis, and the function says so in its own refusal.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (A) THE MIRROR IS THE WHOLE MIGRATION, needle by needle, each with a mutate-control that proves
//     the needle fired on the file's real bytes (agt-367-cycle-cause.test.mjs's shape). Three of the
//     needles are the three rules that have each cost this project live:
//       * `drop function if exists public.record_skip(uuid, text, text, text, text, text)` --
//         appending `p_refusal` creates a NEW OVERLOAD, and with both standing PostgREST cannot
//         resolve a call that omits it: an ambiguity error that reaches the caller as an EMPTY
//         RESULT (DAT-12: 0 chunks on every live answer for ~90 seconds);
//       * `from public, anon, authenticated` -- `pg_default_acl` grants EXECUTE to anon,
//         authenticated and service_role BY NAME at creation, and `REVOKE ... FROM PUBLIC` leaves
//         those standing while reporting success (SES-315);
//       * `has_function_privilege('anon'` -- the denial asserted in the migration's own trailing DO
//         block, because the first LOG-124 remediation reported success and left 476 caller IPs
//         fully exposed.
//     Plus the structural one: `close_refusal_diagnostic`'s body must not mention `backlog_items`.
//     "The diagnostic changes nothing" is only true if the function cannot touch a ticket row.
//
// (B) THE PICKUP'S PURE HALF, driven from fixtures. `validateRefusal` must collect EVERY problem,
//     not the first: a cycle that has just been refused is losing its run, and one missing key per
//     round trip costs it the rest of the data. `parseRedesignLine` must REQUIRE `from prior:` --
//     a line naming a reason but not the change is the line a session writes when it is re-running
//     the same design.
//
// (C) THE LIVE GATE, `notRun` without credentials (SES-180 (b)), never silently skipped. Two halves,
//     and the second is the one that matters: the bare `permission-gate` call must be refused AND
//     must write NOTHING -- the raise sits ABOVE the before-image for exactly that reason. A guard
//     that only checked the 400 would pass over a function that refused after writing a row.
//
// (D) THE ANON ARM, `notRun` without the anon key. A ledger of what the platform refused is not
//     public data, and the browser bundle ships the anon key.
//
// NO WRITES ANYWHERE: (C) calls only the paths that RAISE (a fixture id with no backlog_items row,
// so every write path is refused before it starts) and reads. Nothing is created and nothing is
// cleaned up (pattern:76).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  REQUIRED_REFUSAL_KEYS, DIFFERS, parseRedesignLine, validateRefusal,
  assembleDiagnostic, feedbackCliArgs,
} from "../../scripts/redesign-pickup.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR_REL = "docs/design/agt-610-refusal-ledger.sql";
const MIRROR_ABS = path.join(ROOT, MIRROR_REL);
const CYCLE = "b5243878-8b1a-46fb-a01c-37f6462305dc";
const FIXTURE_ID = "AGT-610-FIXTURE-NOROW";

const CLAUSES = [
  {
    needle: "create table public.runner_refusal_attempts",
    why: "the ledger is ONE ROW PER ATTEMPT. `runner_skips` already holds one row per (ticket, kind) " +
      "with a bumping `skip_count`, and that shape cannot hold two attempts' DISTINCT refusals -- " +
      "which is precisely the 'more data why it got blocked' John asked for",
  },
  {
    needle: "drop function if exists public.record_skip(uuid, text, text, text, text, text)",
    why: "appending `p_refusal jsonb` creates a NEW OVERLOAD -- CREATE OR REPLACE only replaces the " +
      "exact identity argument list it already matches -- and with both standing PostgREST returns " +
      "an ambiguity error that reaches callers as an EMPTY RESULT, not a crash. The stale identity " +
      "must be dropped in THIS migration, by its full argument list " +
      "(.claude/rules/supabase-function-signature.md; DAT-12 returned 0 chunks on every live answer)",
  },
  {
    needle: "p_refusal jsonb default null",
    why: "and the new parameter must be the LAST one with a default, so every existing caller that " +
      "posts the four named parameters (scripts/run-project.js) still resolves",
  },
  {
    needle: "identical_to",
    why: "guard 4 must be STRUCTURAL: an `action_sent` byte-identical to one already refused on this " +
      "ticket sets `identical_to` and parks the row. Clause 4 forbids retrying the identical refused " +
      "action, and a rule enforced only by a sentence in a runbook is one a cycle under pressure " +
      "re-reads as a suggestion (CLAUDE.md SES-019)",
  },
  {
    needle: "the only step left is close_refusal_diagnostic()",
    why: "John's AMENDMENT, in the function's own words: he REJECTED a third attempt that uses " +
      "another tool or words a step to dodge the check, so a third `open_redesign_attempt()` is " +
      "refused and the refusal NAMES the one remaining call",
  },
  {
    needle: "attempt 2 must differ from attempt 1",
    why: "clause 3. The comparison is mechanical -- the lowered, trimmed (reason, differs, " +
      "diff_from_prior) triple -- because 'state why it differs' graded by nobody is a sentence a " +
      "session can copy from its own previous attempt",
  },
  {
    needle: "from public, anon, authenticated",
    why: "every new function must be revoked from the three roles BY NAME. `REVOKE ALL ON FUNCTION " +
      "... FROM PUBLIC` alone removes only the PUBLIC grant and leaves the named anon and " +
      "authenticated grants `pg_default_acl` hands out at creation time standing -- the migration " +
      "reports success and the function stays callable with the browser's anon key (SES-315, found " +
      "live on this project's own runner_* functions)",
  },
  {
    needle: "has_function_privilege('anon'",
    why: "and the migration must assert that denial in its own trailing DO block rather than trust " +
      "its success flag -- the first remediation in LOG-124 reported success and left the data " +
      "fully exposed",
  },
  {
    needle: "length(method)",
    why: "the Knowledge addendum is asserted by BYTE COUNT (7300 + 1 + 1831 = 9132), not by a " +
      "substring: an append that landed twice, or landed truncated, would satisfy a substring check " +
      "and leave the Designer reading a mangled rule",
  },
  {
    needle: "0b5505cf-36c4-402c-9aa2-56351a59ad04",
    why: "the write is scoped to the ONE skill_profiles row (slug `ds-knowledge-standard`) by id AND " +
      "slug, and its full prior row is imaged under a record_decision(kind 'agent-row') -- " +
      "AGENT-ROW-AGREED-TICKET, so the undo is a restore and not a guess",
  },
  {
    needle: `capture_migration_down('${CYCLE}', 'agt610_refusal_ledger'`,
    why: "the down must be recorded as captured BEFORE the up ran, for this cycle. A down taken " +
      "afterwards captures the state the up just wrote -- a down that restores the bug",
  },
];

function readMirror() {
  assert.ok(fs.existsSync(MIRROR_ABS),
    `${MIRROR_REL} is missing -- the migration's mirror is the only in-repo copy of what was applied`);
  return fs.readFileSync(MIRROR_ABS, "utf8");
}

// == (A) the mirror, needle by needle, each with its mutate-control ===============================
function theMirrorIsTheWholeMigration() {
  const sql = readMirror();

  for (const c of CLAUSES) {
    assert.ok(sql.includes(c.needle), `${MIRROR_REL} must hold \`${c.needle}\` -- ${c.why}`);
  }
  // CONTROL: every needle fired on the file's real bytes, not on a substring of its own assertion.
  for (const c of CLAUSES) {
    const mutated = sql.split(c.needle).join("/* REMOVED BY THE CONTROL */");
    assert.ok(!mutated.includes(c.needle),
      `CONTROL: removing \`${c.needle}\` must make the clause above fail -- otherwise it is grading ` +
      `nothing`);
  }

  // The overload assertion itself, not just the drop: exactly one `record_skip` must be demanded.
  assert.ok(/proname = 'record_skip'/.test(sql) && /expected exactly 1/.test(sql),
    `${MIRROR_REL} must ASSERT exactly one record_skip row in pg_proc after the drop -- the drop ` +
    "without the assertion is the same unchecked success flag the rule warns about");

  // Both directions on the grants, which is the whole of .claude/rules/supabase-column-grants.md.
  assert.ok(/revoke select on public\.runner_refusal_attempts from anon, authenticated/.test(sql),
    `${MIRROR_REL} must revoke SELECT on the ledger table from the public key -- a record of what the ` +
    "platform refused is not public data, and the anon key ships in the browser bundle");
  assert.ok(/has_function_privilege\('service_role'/.test(sql) &&
            /has_table_privilege\('service_role'/.test(sql),
    `${MIRROR_REL} must assert service_role STILL reads and STILL calls -- without that half, a ` +
    "migration that revoked everything from everyone would report a green gate");

  // THE STRUCTURAL ONE: the diagnostic cannot touch a ticket row.
  const from = sql.indexOf("create or replace function public.close_refusal_diagnostic");
  assert.ok(from > -1, `${MIRROR_REL} must create close_refusal_diagnostic`);
  // The slice ends at the function's own closing dollar quote, NOT at the next `create`: the
  // comment block that introduces (g) sits between the two and does mention `backlog_items.status`
  // (truthfully -- (g) derives `shipped` from it). Slicing to the next create would grade a comment
  // about a different function and refuse a correct migration.
  const close = sql.indexOf("\n$fn$;", from);
  assert.ok(close > from, `${MIRROR_REL}: close_refusal_diagnostic must end in its own dollar quote`);
  const body = sql.slice(from, close);
  assert.ok(!body.includes("backlog_items"),
    "close_refusal_diagnostic()'s body must not mention `backlog_items` at all. John's AMENDMENT is " +
    "that the third step CHANGES NOTHING, and 'it changes nothing' is only checkable if the function " +
    "cannot reach a ticket row -- QA 4 asserts the fixture's updated_at is unchanged after it runs, " +
    `and this clause is why that assertion cannot pass by luck. got body of ${body.length} bytes`);
  assert.ok(body.includes("runner_refusal_attempts") && body.includes("runner_before_images"),
    "CONTROL: the sliced body is the real function (it references its own table and the image table), " +
    "so the absence above is a fact about this function and not about an empty slice");

  // The capture's class, recorded in the mirror's own header (the AGT-367 mirror's form).
  assert.ok(/auto-downable/.test(sql),
    `${MIRROR_REL} must record the capture's classification -- a 'refused' classification is a ` +
    "RESULT to report, never an error to work around, and the next session needs to know which it was");
}

// == (B) the pickup's pure half ===================================================================
function thePickupsPureHalfCollectsEveryProblem() {
  // parseRedesignLine: §S's own line, and the same line with `from prior:` removed.
  const line = "- **Redesign:** attempt 2; differs: scope; because: the migration half reaches 1 " +
    "function and is undone by its captured down; from prior: attempt 1 shipped both halves in one kickoff";
  const parsed = parseRedesignLine(line);
  assert.ok(parsed, "the Designer's Redesign: line must parse");
  assert.strictEqual(parsed.attempt_no, 2, "the attempt number is read from the line, never inferred");
  assert.strictEqual(parsed.differs, "scope", "and the dimension it differs in");
  assert.ok(parsed.reason.startsWith("the migration half reaches"), `and the engineering reason: ${parsed.reason}`);
  assert.ok(parsed.diff_from_prior.startsWith("attempt 1 shipped"), `and what changed: ${parsed.diff_from_prior}`);

  assert.strictEqual(parseRedesignLine(line.split("; from prior:")[0]), null,
    "a Redesign: line WITHOUT `from prior:` must not parse. Clause 3 wants what CHANGED recorded " +
    "before the attempt runs, and a line naming a reason but not the change is what a session writes " +
    "when it is re-running the same design");
  assert.strictEqual(parseRedesignLine(""), null, "and nothing parses out of nothing");

  // validateRefusal: every problem at once.
  const eight = validateRefusal({ refusal_text: "t" });
  assert.strictEqual(eight.refusals.length, 8,
    `one key present must yield EIGHT refusals, not one: a cycle that has just been refused is ` +
    `losing its run, and one missing key per round trip costs it the rest of the data. got ` +
    `${eight.refusals.length}: ${eight.refusals.join(" | ")}`);
  assert.strictEqual(eight.ok, false, "and it is not ok");
  assert.strictEqual(REQUIRED_REFUSAL_KEYS.length, 9, "clause 5 names NINE facts");

  const full = {
    refusal_text: "Permission for this action was denied by the Claude Code auto mode classifier.",
    refusal_label: "[Production Deploy]", action_sent: "apply_migration agt610",
    run_minutes: 12, run_turns: 40, earlier_refusals: 0, model: "claude-opus-5",
    reach: "1 table, 6 functions", undo: "captured down",
  };
  assert.deepStrictEqual(validateRefusal(full), { ok: true, refusals: [] },
    "CONTROL: all nine present and valid must be ok -- otherwise the clause above would pass against " +
    "a validator that refuses everything");

  const guarded = validateRefusal(full, ["  apply_migration agt610  "]);
  assert.strictEqual(guarded.refusals.length, 1, `one problem, the guard: ${guarded.refusals.join(" | ")}`);
  assert.ok(/guard 4/.test(guarded.refusals[0]),
    `a byte-identical (trimmed) action_sent must be refused as guard 4 BEFORE anything is sent -- ` +
    `learning it from a POST means the ticket's attempt is already spent. got: ${guarded.refusals[0]}`);
  assert.strictEqual(validateRefusal({ ...full, action_sent: "apply_migration agt610 (staged)" },
    ["apply_migration agt610"]).ok, true,
    "CONTROL: a DIFFERENT action is fine -- guard 4 refuses the identical action, never a redesigned one");

  for (const key of ["run_minutes", "run_turns", "earlier_refusals"]) {
    const bad = validateRefusal({ ...full, [key]: "a while" });
    assert.ok(bad.refusals.some(r => r === `${key} is not a number`),
      `${key} must be a number -- "a while" turns the run's context into prose nobody can compare ` +
      `across two attempts. got: ${bad.refusals.join(" | ")}`);
  }
  assert.ok(validateRefusal({ ...full, run_turns: 0 }).ok,
    "and ZERO is a real value: `0 turns into the run` is the refusal that fired immediately, which is " +
    "the most informative sample there is");

  // assembleDiagnostic: the §T fixture.
  const rows = [1, 2, 3].map(n => ({
    attempt_no: n, kind: n === 0 ? "original" : "redesign", refused_at: "2026-11-06T07:21:28Z",
    refusal_label: "[Production Deploy]", refusal_text: "denied", action_sent: `a${n}`,
    run_minutes: 1, run_turns: 2, earlier_refusals: 0, model: "claude-opus-5",
    reach: "r", undo: "u", diff_from_prior: "d",
  }));
  const d = assembleDiagnostic("AGT-590", rows, "whether the label is about the tool or the target");
  assert.strictEqual(d.refusals, 3, "three refused rows, three refusals");
  assert.deepStrictEqual(d.labels, ["[Production Deploy]"], "one distinct label, de-duplicated");
  assert.strictEqual(d.feedback_text.split("\n").length, 6,
    `six lines: the lead, one per refusal, the labels line and the unknowns line. got:\n${d.feedback_text}`);
  assert.ok(d.feedback_text.includes("no third attempt"),
    "the text must SAY there is no third attempt -- it goes to a reader outside DeepBench, and a " +
    "report that reads as a request to be let through is not the report John asked for");
  assert.ok(d.feedback_text.includes("still unknown about the boundary"),
    "and it must carry what is still unknown, which is the whole product of the diagnostic");
  const noDiff = assembleDiagnostic("X", [{ ...rows[0], diff_from_prior: null }], "u");
  assert.ok(noDiff.feedback_text.includes("n/a (original build)"),
    "an original build differed from nothing, and that is said rather than left blank");
  assert.strictEqual(assembleDiagnostic("X", [{ attempt_no: 1, kind: "redesign" }], "u").refusals, 0,
    "a row with no `refused_at` is an OPEN attempt and is not a refusal to report");

  assert.strictEqual(feedbackCliArgs("x")[1], "/feedback x",
    "the CLI call is read-usage-meter.js's CLI_ARGS shape, with the text as the prompt");
  assert.deepStrictEqual([...DIFFERS], ["staging", "scope", "mechanism"],
    "the three dimensions clause 3 names, and no fourth");
}

// == (C) the live gate: refused AND nothing written ===============================================
async function theLiveGateRefusesABareSkipAndWritesNothing() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("(C) the live gate",
      "SUPABASE_URL and SUPABASE_SERVICE_KEY are absent, so the bare permission-gate refusal and the " +
      "two ledger reads were not exercised. Run with: node --env-file-if-exists=.env.local " +
      "tests/regression/run-all.js --only=agt-610-refusal-ledger.test.mjs");
    return;
  }
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const post = async (fn, body) => {
    const r = await fetch(`${base}/rest/v1/${fn}`, { method: "POST", headers: h, body: JSON.stringify(body) });
    return { status: r.status, text: await r.text().catch(() => "") };
  };
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: h });
    const t = await r.text().catch(() => "");
    let j = null; try { j = t ? JSON.parse(t) : null; } catch { /* not json */ }
    return { status: r.status, json: j, text: t };
  };

  // (C1) the bare call is refused, and the refusal NAMES the next call.
  const bare = await post("rpc/record_skip", {
    p_cycle_id: randomUUID(), p_backlog_id: FIXTURE_ID,
    p_reason_kind: "permission-gate", p_reason: "x",
  });
  assert.strictEqual(bare.status, 400,
    `a bare permission-gate record_skip must be refused with HTTP 400, got ${bare.status}: ${bare.text.slice(0, 300)}`);
  assert.ok(bare.text.includes("p_refusal"),
    `and the refusal must NAME p_refusal and its keys -- a cycle that meets this message must know ` +
    `the next call without reading anything else. got: ${bare.text.slice(0, 400)}`);

  // (C2) THE HALF THAT MATTERS: nothing was written. The raise sits ABOVE the before-image.
  const skips = await get(`runner_skips?backlog_id=eq.${FIXTURE_ID}&select=id`);
  assert.ok(Array.isArray(skips.json) && skips.json.length === 0,
    `the refused call must have written NOTHING -- the raise is placed above the before-image INSERT ` +
    `for exactly this reason, and a guard that only checked the 400 would pass over a function that ` +
    `refused after writing a row. got: ${skips.text.slice(0, 300)}`);

  // (C3) the attempt door refuses a ticket with no live backlog row, by its own words.
  const opened = await post("rpc/open_redesign_attempt", {
    p_cycle_id: randomUUID(), p_backlog_id: FIXTURE_ID, p_reason: "r",
    p_differs: "scope", p_diff_from_prior: "d",
  });
  assert.strictEqual(opened.status, 400,
    `open_redesign_attempt on a ticket with no open/partial row must be refused, got ${opened.status}: ${opened.text.slice(0, 300)}`);
  const attempts = await get(`runner_refusal_attempts?backlog_id=eq.${FIXTURE_ID}&select=id`);
  assert.ok(Array.isArray(attempts.json) && attempts.json.length === 0,
    `and it too must leave no row behind. got: ${attempts.text.slice(0, 300)}`);

  // (C4) the pickup's own read: shape, and the invariant that makes it a pickup list.
  const parked = await get("rpc/refusal_parked_tickets");
  assert.ok(Array.isArray(parked.json),
    `refusal_parked_tickets() must return an array, got ${parked.status}: ${parked.text.slice(0, 300)}`);
  for (const row of parked.json) {
    assert.ok(Array.isArray(row.never_send),
      `every candidate must carry never_send as an ARRAY -- it is what stops the next design ` +
      `re-sending a refused action (clause 4), and a null there is a guard the Designer cannot see. ` +
      `got ${row.backlog_id}: ${JSON.stringify(row.never_send)}`);
    assert.ok(Number(row.attempts) <= 1,
      `and no candidate may already hold 2 redesign attempts -- the function is the list of tickets ` +
      `that still HAVE an attempt left, and a ticket at 2 belongs to close_refusal_diagnostic(). got ` +
      `${row.backlog_id}: ${row.attempts}`);
  }

  // (C5) the brief's read.
  const brief = await get("rpc/refusal_ledger_brief");
  assert.ok(Array.isArray(brief.json),
    `refusal_ledger_brief() must return an array, got ${brief.status}: ${brief.text.slice(0, 300)}`);
}

// == (D) the anon arm: the ledger is not public data ==============================================
async function theAnonKeyCannotReadTheLedger() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  if (!base || !anon) {
    notRun("(D) the anon arm",
      "VITE_SUPABASE_ANON_KEY is absent, so the public key's denial was not exercised. Run with: " +
      "node --env-file-if-exists=.env.local tests/regression/run-all.js --only=agt-610-refusal-ledger.test.mjs");
    return;
  }
  const h = { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" };
  const r = await fetch(`${base}/rest/v1/rpc/refusal_parked_tickets`, { headers: h });
  assert.ok(!r.ok,
    `the anon key must NOT be able to call refusal_parked_tickets() -- pg_default_acl grants EXECUTE ` +
    `to anon BY NAME the instant a function is created (SES-315), so this is the direction that fails ` +
    `open. got HTTP ${r.status}`);
  const t = await fetch(`${base}/rest/v1/runner_refusal_attempts?select=backlog_id&limit=1`, { headers: h });
  assert.ok(!t.ok,
    `and it must not be able to SELECT the ledger table either -- the anon key ships in the browser ` +
    `bundle (LOG-124 proved 476 caller IPs public with nothing but that key). got HTTP ${t.status}`);
}

export default async function run() {
  theMirrorIsTheWholeMigration();                        // (A)
  thePickupsPureHalfCollectsEveryProblem();              // (B)
  await theLiveGateRefusesABareSkipAndWritesNothing();   // (C)
  await theAnonKeyCannotReadTheLedger();                 // (D)

  console.log("  [AGT-610] the mirror carries the stale-overload drop, the three-role revoke, the " +
    "both-directions DO gate, the 9132-byte Knowledge assertion and the pre-apply down capture -- each " +
    "with a mutate-control -- and close_refusal_diagnostic()'s body cannot reach `backlog_items`; " +
    "validateRefusal() returns all EIGHT missing keys at once and refuses a repeated action as guard " +
    "4 while passing a redesigned one; parseRedesignLine() requires `from prior:`; and the live arms " +
    "prove the bare permission-gate call is refused having written NOTHING, every candidate carries " +
    "never_send with at most 1 attempt spent, and the anon key is denied both doors.");
}

selfRun(import.meta.url, run);
