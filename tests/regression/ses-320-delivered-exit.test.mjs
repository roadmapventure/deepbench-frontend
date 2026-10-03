// DeepBench v7.0.412 | tests/regression/ses-320-delivered-exit.test.mjs | SES-320 -- a finalised
// ship decision writes `done`: the delivered exit for every class, and `vision_claims` joins the
// reversal allowlist.
//
// WHAT IS BEING PINNED, and why the obvious guard would be the wrong one. It is easy to write a
// test that asserts "sweep_decision_windows returns a `closed` column". That passes just as well
// against a build where the sweep closes the ticket AND bumps its `updated_at` -- which is the one
// shape this ticket must not ship, because `reverse_decision()` refuses any allowlisted row whose
// live `updated_at` postdates the decision's own `decided_at` (`SES-316`) and this close runs 72
// hours after it. In that build every closed ticket is `refused_written_since` on its own ship's
// Reverse: the ticket stays `done` while the reversal reports `partial`, which is precisely the lie
// `SES-316` exists to prevent. So the clauses below are about the DIFFERENCE from the pre-change
// mechanism (the SES-213 lesson), and the non-bump is pinned in the runbook prose as well as in the
// migration's own trailing assertions, because it is a line that is NOT there and an absence has to
// be protected by something a later editor will actually read.
//
// THE DATABASE HALF IS DECLARED NOT-RUN RATHER THAN FAKED, the SES-315 shape. Both functions are
// WRITERS -- they finalise the decision ledger, move `runner_ladder`, rewrite board rows and queue
// directives -- and a permanent regression test must never do that on the live board (the SES-196 /
// SES-218 / SES-275 refusal). This suite reaches Supabase only over PostgREST, which cannot read
// `pg_proc` and cannot open a transaction to roll a fixture back. What the credentialed arms CAN do
// is (a) invoke `sweep_decision_windows()` on a board with NO expired open decision, where the loop
// body is unreachable and the call is write-free BY CONSTRUCTION -- which is also the only way to
// read the new OUT column's NAME off the deployed function rather than off a document -- and (b)
// take `reverse_decision()`'s first guard, which returns before its first INSERT. The write paths'
// evidence is the rolled-back fixture record at the foot of this file.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

// THE PRE-CHANGE TREE IS PINNED BY SHA, NEVER BY THE `origin/dev` BRANCH NAME. A file-level control
// that resolves "before" as a moving branch SELF-DESTRUCTS the moment the ship lands on that branch:
// origin/dev then CONTAINS the change, every clause passes on "both" trees, and the control reports
// the ship as un-pinning. That is the live SES-215 defect. A SHA is immutable; if it is unreachable
// (a shallow clone) the control declares itself not-run rather than passing vacuously.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRE_CHANGE_SHA = "dac315747765826e1155175d1a519372234d2785"; // origin/dev immediately before SES-320

const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const SETUP_REL = "docs/runbooks/session-setup.md";
const M5_REL = "docs/RUNNER-GOV-M5-REQUIREMENTS.md";

// The runbooks are hard-wrapped, so a load-bearing phrase can straddle a line break and a literal
// match that fails on a reflow fails for a reason that has nothing to do with the rule (SES-194).
export const norm = s => s.replace(/\s+/g, " ");

// ---------------------------------------------------------------------------------------------
// THE PURE HALF: what the mechanism's two vocabularies are, shipped versus retired.
// ---------------------------------------------------------------------------------------------

// reverse_decision()'s table allowlist, as shipped by migration ses320_delivered_exit.
export const ALLOWLIST = [
  "backlog_items",
  "runner_directives",
  "runner_drain_scope",
  "runner_settings",
  "governance_rules",
  "epics",
  "vision_claims",       // SES-320
];

// The RETIRED allowlist (SES-310-era, six tables). Kept ONLY as the negative control.
export const ALLOWLIST_RETIRED = [
  "backlog_items",
  "runner_directives",
  "runner_drain_scope",
  "runner_settings",
  "governance_rules",
  "epics",
];

// The runner's OWN record of a decision. Replaying any of these rewrites the evidence instead of
// the effect, so they are refused and REPORTED -- never quietly omitted from the undo set.
export const LEDGER_TABLES_STILL_OUT = [
  "runner_cycles", "runner_items", "runner_before_images", "runner_decisions",
  "runner_ladder", "runner_verdicts", "dev_version_counter", "feature_id_counter",
];

// sweep_decision_windows()'s OUT columns, shipped and retired.
export const SWEEP_OUT = ["finalized", "promoted", "closed"];
export const SWEEP_OUT_RETIRED = ["finalized", "promoted"];

export function allowlistDiff() {
  return ALLOWLIST.filter(t => !ALLOWLIST_RETIRED.includes(t));
}
export function sweepOutDiff() {
  return SWEEP_OUT.filter(c => !SWEEP_OUT_RETIRED.includes(c));
}

function theTwoVocabulariesDivergeOnExactlyOneThingEach() {
  assert.deepStrictEqual(
    allowlistDiff(), ["vision_claims"],
    "the shipped and retired reversal allowlists must diverge on exactly one table -- " +
      "public.vision_claims. Diverging nowhere means this guard is not discriminating; diverging " +
      "anywhere else means this ship widened John's undo beyond the one table it measured a hole " +
      "in (decision 50baaef2: 306 vision_claims before-images, 306 refused, 0 restored, outcome " +
      "reported as `applied`)",
  );
  assert.ok(
    !ALLOWLIST_RETIRED.includes("vision_claims"),
    "the control is vacuous unless the RETIRED allowlist really lacks vision_claims",
  );
  for (const t of LEDGER_TABLES_STILL_OUT) {
    assert.ok(
      !ALLOWLIST.includes(t),
      `${t} is one of the runner's OWN evidence tables and must stay OUT of the allowlist. ` +
        "SES-320 widened the allowlist by exactly one CONTENT table; the exclusion of the ledger " +
        "is the half that must not move, because replaying it rewrites the record of the decision " +
        "instead of its effect -- and would delete the reversal's own row",
    );
  }
  assert.deepStrictEqual(
    sweepOutDiff(), ["closed"],
    "sweep_decision_windows() must return exactly one column the pre-change function did not: " +
      "`closed`. `finalized` and `promoted` are M6-02 / M6-07 and this ship must not have " +
      "disturbed either",
  );
  assert.strictEqual(
    SWEEP_OUT.length, 3,
    "three OUT columns, which is WHY this had to be DROP + CREATE rather than CREATE OR REPLACE " +
      "(a new OUT column changes the return type). If a fourth arrives, the drop is still " +
      "mandatory -- .claude/rules/supabase-function-signature.md",
  );
}

// ---------------------------------------------------------------------------------------------
// THE DOC HALF. A clause earns its place only if REMOVING it would change what a later editor does.
// ---------------------------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "step-7-says-the-finalisation-is-the-exit",
    file: RUNBOOK_REL,
    detail:
      "step 7's close-out is the paragraph every cycle follows when it writes a ticket's status, " +
      "and until this ship it said `done` is written by 'the step-9 harvest of his Accept' -- a " +
      "surface SES-285 retired eleven days earlier. A cycle reading only that paragraph has no " +
      "way to know a delivered ticket ever leaves, which is how sixteen rows accumulated there",
    test: s => /a `delivered` ticket reaches `done` when ITS OWN SHIP DECISION FINALISES UNREVERSED/.test(norm(s)) &&
               /reports it as its third returned number `closed`/.test(norm(s)),
    breaks: s => s.replace("ITS OWN SHIP DECISION FINALISES UNREVERSED",
                           "John taps Accept on the ship card"),
  },
  {
    id: "step-5-table-names-the-sweep-as-who-closes-it",
    file: RUNBOOK_REL,
    detail:
      "the blocked-prefix table is read AT A GLANCE by every cycle at step 5 (SES-114), and its " +
      "'who clears it' column is the only place a cycle learns whether a flag it is stepping past " +
      "has anybody behind it. Leaving 'John, on the ship card' there points every reader at a tap " +
      "that no longer exists -- the same class of defect SES-315 fixed in five other passages of " +
      "this file. The row and its retirement vocabulary sit on ONE LINE because tripwire check 9 " +
      "decides within the enclosing block",
    test: s => /\| The decision-window sweep, once the ship decision finalises unreversed \(the tail's `\(7b\)`, `SES-320`\) \|/.test(s),
    breaks: s => s.replace(
      "| The decision-window sweep, once the ship decision finalises unreversed (the tail's `(7b)`, `SES-320`) |",
      "| John, on the ship card |"),
  },
  {
    id: "the-tail-collects-three-numbers-not-two",
    file: RUNBOOK_REL,
    detail:
      "the (7b) paragraph is an INSTRUCTION, not narrative: it tells a cycle which numbers to put " +
      "in its `notes`. A cycle told to record two numbers records two, and `closed` -- the only " +
      "evidence anywhere that this sweep took tickets out of `delivered` -- is then invisible in " +
      "the ledger the next reader consults. Both the list item and the paragraph say three, " +
      "because a cycle skims one and follows the other",
    test: s => /paragraph below, whose \*\*three\*\* returned numbers go into the cycle/.test(s) &&
               /It returns `finalized, promoted, closed`/.test(s) &&
               /put all three numbers in your cycle row's `notes`/.test(norm(s)) &&
               /A second call in the same cycle returns `0, 0, 0`/.test(s),
    breaks: s => s.replace("It returns `finalized, promoted, closed`", "It returns `finalized, promoted`"),
  },
  {
    id: "reversing-a-finalised-ship-undoes-the-close-and-the-non-bump-is-why",
    file: SETUP_REL,
    detail:
      "this is the clause that protects a line that is NOT in the code. The sweep's close writes " +
      "`status` and deliberately not `updated_at`, because reverse_decision() refuses any row " +
      "whose live updated_at postdates the decision's decided_at (SES-316) and the close runs 72 " +
      "hours after it. A later editor 'tidying' the missing updated_at back in gets a build where " +
      "every ship's own Reverse refuses its own ticket -- measured both ways at this ship. The " +
      "reason has to live where the Reverse is documented, because that is the page somebody " +
      "reads when the Reverse misbehaves",
    test: s => /Reversing a FINALISED SHIP decision undoes the close the window sweep wrote, in the same restore/.test(norm(s)) &&
               /This works only because the sweep's close does not bump `updated_at`/.test(norm(s)) &&
               /which is what it held \*\*before the ship\*\*, not `delivered`/.test(norm(s)),
    breaks: s => s.replace("This works only because the sweep's close does not bump",
                           "This works regardless of whether the sweep's close bumps"),
  },
  {
    id: "m5-14-names-the-mechanism-without-changing-the-rule",
    file: M5_REL,
    detail:
      "M5-14 promised that discovered / john-named work 'closes on verifier pass once its " +
      "reversal window elapses' and NOTHING PERFORMED IT -- the sweep finalised the decision and " +
      "never touched backlog_items. The register is the byte-for-byte home of the governance_rules " +
      "row, so the note must say explicitly that the rule STATEMENT is unchanged and no snapshot " +
      "re-export is owed, or the next session re-exports RULES-SNAPSHOT.md against a row nobody " +
      "edited. It also carries the SES-154 retirement, folded here from the ledger under this " +
      "session's file cap on the kickoff's own instruction",
    test: s => /THE RULE STATEMENT ABOVE IS UNCHANGED/.test(norm(s)) &&
               /`public.sweep_decision_windows\(\)` finalised the decision and never touched `backlog_items`/.test(norm(s)) &&
               /only John's Accept writes `done`.{0,4} is RETIRED here rather than in/.test(norm(s)) &&
               /the `kind = 'ship'` branch must come out of `sweep_decision_windows\(\)` in the same change/.test(norm(s)),
    // The mutation targets a phrase that sits WHOLLY on one line -- the clause itself is graded on
    // norm(s) because the register is hard-wrapped and this sentence straddles a line break, but a
    // breaks() that spans one would be a no-op on exactly one of the CRLF/LF trees (SES-315).
    breaks: s => s.replace("STATEMENT ABOVE IS UNCHANGED", "STATEMENT ABOVE WAS REWRITTEN"),
  },
];

function readRel(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function theDocsCarryTheRuling() {
  for (const c of CLAUSES) {
    assert.ok(c.test(readRel(c.file)), `${c.id} (${c.file}) -- ${c.detail}`);
  }
}

function everyClauseHasTeeth() {
  for (const c of CLAUSES) {
    const src = readRel(c.file);
    const broken = c.breaks(src);
    assert.notStrictEqual(
      broken, src,
      `clause "${c.id}"'s breaks() returned its input unchanged -- the teeth check below would ` +
        "pass vacuously, which is a control that controls nothing",
    );
    assert.ok(!c.test(broken), `${c.id} is VACUOUS -- it still passes after its own breaks() mutation`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL against the commit this ship was written on. Every clause must FAIL
// there -- that tree is the one where the mechanism did not exist and sixteen rows sat delivered.
function theClausesFailOnThePreChangeTree() {
  const before = {};
  for (const rel of [RUNBOOK_REL, SETUP_REL, M5_REL]) {
    try {
      before[rel] = execFileSync("git", ["show", `${PRE_CHANGE_SHA}:${rel}`], {
        cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      notRun(
        "the file-level negative control",
        `commit ${PRE_CHANGE_SHA} is unreachable in this checkout (a shallow clone), so the ` +
          "pre-change docs could not be read. The clauses above still ran against the shipped " +
          "tree; what is unproven is that they FAIL on the tree where the mechanism did not exist.",
      );
      return;
    }
  }
  const passing = CLAUSES.filter(c => c.test(before[c.file])).map(c => c.id);
  assert.deepStrictEqual(
    passing, [],
    `these clauses pass on the PRE-CHANGE tree and therefore pin nothing: ${passing.join(", ")}`,
  );
}

// ---------------------------------------------------------------------------------------------
// THE LIVE HALF -- Supabase over PostgREST.
// ---------------------------------------------------------------------------------------------

const base = url => url.replace(/\/+$/, "");

async function post(url, key, name, body) {
  return fetch(`${base(url)}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function countOf(url, key, q) {
  const res = await fetch(`${base(url)}/rest/v1/${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) throw new Error(`${q} returned HTTP ${res.status}`);
  return Number((res.headers.get("content-range") || "/0").split("/")[1]);
}

const NIL = "00000000-0000-0000-0000-000000000000";

// reverse_decision()'s response columns. The SES-316 set, unchanged by this ship -- which is the
// point of asserting it here: SES-320 DROPped and retyped that whole body to change one constant
// array, so a missing column is a transcription loss rather than a contract change.
export const REVERSE_OUT_COLUMNS = [
  "outcome", "restored", "restored_unverified", "refused",
  "refused_written_since", "demoted", "reversal_id", "reason",
];

async function theDeployedFunctionsCarryTheShip() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arms: sweep_decision_windows() resolvable by its two argument names and returning " +
        "the THREE OUT columns finalized/promoted/closed off the deployed function, its " +
        "attribution guard, exactly one overload of each function, reverse_decision() still " +
        "carrying the SES-316 eight response columns, and the write-free-ness of all of it " +
        "asserted by side effect",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The pure and doc arms above still " +
        "graded both vocabularies and all five clauses against the committed tree. Canonical " +
        "invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // THE ONE ARM THAT TOUCHES A WRITER, AND THE PRECONDITION THAT MAKES IT SAFE. Every write
  // sweep_decision_windows() performs is INSIDE its `for` loop over decisions past their
  // expires_at. With none, the loop body is unreachable and the call cannot write -- so this is
  // checked FIRST and the arm declares itself not-run rather than finalising somebody's real
  // decision to read a column name.
  const expired = await countOf(
    url, key,
    `runner_decisions?select=id&status=eq.open&expires_at=lte.${encodeURIComponent(new Date().toISOString())}`,
  );

  const before = {
    decisions: await countOf(url, key, "runner_decisions?select=id"),
    finalDecisions: await countOf(url, key, "runner_decisions?select=id&status=eq.final"),
    images: await countOf(url, key, "runner_before_images?select=id"),
    delivered: await countOf(url, key, "backlog_items?select=id&status=eq.delivered"),
  };

  if (expired > 0) {
    notRun(
      "the sweep arm: sweep_decision_windows() resolvable by its two argument names and returning " +
        "finalized / promoted / closed off the DEPLOYED function",
      `${expired} open decision(s) are already past expires_at, so calling the sweep would ` +
        "FINALISE them -- and, since SES-320, close any delivered ticket behind a ship decision " +
        "among them. A permanent regression test never writes the live board (the SES-196 / " +
        "SES-218 / SES-275 refusal), and the call is write-free only while that count is zero. " +
        "Re-run after the next cycle's step-9 tail (7b) has swept.",
    );
  } else {
    const res = await post(url, key, "sweep_decision_windows", {
      p_actor_cycle: null, p_actor_session: "ses-320-guard-probe",
    });
    const body = await res.text();
    assert.ok(
      !/PGRST202|Could not find the function/i.test(body),
      "PostgREST could not resolve public.sweep_decision_windows(p_actor_cycle, p_actor_session): " +
        `${body.slice(0, 300)}. This is the arm that fails against a database still missing ` +
        "migration ses320_delivered_exit, and it also fails if service_role lost EXECUTE",
    );
    assert.ok(
      !/PGRST203/i.test(body),
      "PostgREST reports MORE THAN ONE overload of sweep_decision_windows: " +
        `${body.slice(0, 300)}. SES-320 changed the return type, which required DROP + CREATE; a ` +
        "surviving two-column overload makes every call ambiguous and surfaces to callers as an " +
        "empty result rather than a crash (.claude/rules/supabase-function-signature.md)",
    );
    assert.strictEqual(res.status, 200, `rpc/sweep_decision_windows returned HTTP ${res.status}: ${body.slice(0, 300)}`);

    const rows = JSON.parse(body);
    assert.ok(Array.isArray(rows) && rows.length === 1, `expected exactly one row, got ${body.slice(0, 200)}`);
    assert.deepStrictEqual(
      Object.keys(rows[0]).sort(), [...SWEEP_OUT].sort(),
      "the DEPLOYED sweep_decision_windows() does not return the three SES-320 OUT columns. This " +
        "is the assertion that reads the column set off the database rather than off a document, " +
        "and `closed` is the whole ship: without it nothing takes a delivered ticket out of the " +
        "state SES-285 left it stranded in",
    );
    assert.deepStrictEqual(
      [rows[0].finalized, rows[0].promoted, rows[0].closed], [0, 0, 0],
      "the sweep reported work done on a board that had NO expired open decision when this arm " +
        "checked. Either a decision expired in the gap between the pre-check and the call (re-run " +
        "and it will pass) or the loop's guard has changed -- and this arm's write-free-ness " +
        "depends entirely on that guard, so do not re-point this assertion, re-derive it",
    );

    // THE ATTRIBUTION GUARD, and it raises before the loop -- so this probe is write-free for a
    // second, independent reason. A decision has exactly one author (Section 19v).
    const bothNull = await post(url, key, "sweep_decision_windows", { p_actor_cycle: null, p_actor_session: null });
    const bothNullBody = await bothNull.text();
    assert.ok(
      !bothNull.ok && /exactly one of p_actor_cycle \/ p_actor_session must be set/.test(bothNullBody),
      `sweep_decision_windows(null, null) was answered ${bothNull.status} ${bothNullBody.slice(0, 200)} -- ` +
        "it must raise. This guard is the first statement in the body and SES-320's DROP + CREATE " +
        "retyped the whole function, so its absence here is a transcription loss",
    );
  }

  // reverse_decision()'s SIGNATURE AND RETURN SET ARE UNCHANGED. SES-320 DROPped and recreated it
  // to change one constant array; a changed identity argument list would have created a second
  // overload and broken every caller that omits p_actor_cycle -- including the one line
  // session-setup.md tells John to paste.
  const revProbe = await post(url, key, "reverse_decision", {
    p_decision: NIL, p_actor: "", p_reason: "ses-320 read-only signature probe",
  });
  const revBody = await revProbe.text();
  assert.ok(
    !/PGRST202|PGRST203|Could not find the function/i.test(revBody),
    `public.reverse_decision(p_decision, p_actor, p_reason) is not resolvable at exactly one ` +
      `overload: ${revBody.slice(0, 300)}`,
  );
  assert.strictEqual(revProbe.status, 200, `rpc/reverse_decision returned HTTP ${revProbe.status}: ${revBody.slice(0, 300)}`);
  const revRows = JSON.parse(revBody);
  assert.ok(
    Array.isArray(revRows) && revRows.length === 1 &&
      String(revRows[0].reason || "").includes("p_actor is required"),
    `the reverse_decision probe did not take its blank-actor guard: ${revBody.slice(0, 200)}. That ` +
      "guard is the first statement in the body, which is what makes this arm read-only",
  );
  assert.deepStrictEqual(
    Object.keys(revRows[0]).sort(), [...REVERSE_OUT_COLUMNS].sort(),
    "reverse_decision()'s response columns are not the SES-316 set. SES-320 retyped this whole " +
      "body to add one table to a constant array, so a missing column here is a transcription " +
      "loss, not a contract change -- and refused_written_since is the one every reader of these " +
      "counts depends on to tell 'your undo did not happen' from 'that row was never this " +
      "decision's to undo'",
  );

  // WRITE-FREE, asserted by side effect (pg_proc is unreachable from here). Not one ledger table,
  // and not the delivered census, may have moved by a single row.
  const after = {
    decisions: await countOf(url, key, "runner_decisions?select=id"),
    finalDecisions: await countOf(url, key, "runner_decisions?select=id&status=eq.final"),
    images: await countOf(url, key, "runner_before_images?select=id"),
    delivered: await countOf(url, key, "backlog_items?select=id&status=eq.delivered"),
  };
  assert.deepStrictEqual(
    after, before,
    "the guard-path probes MOVED THE LEDGER. sweep_decision_windows() and reverse_decision() are " +
      "both writers, and these arms are only permitted because the sweep's loop body is " +
      "unreachable on an empty expired set and the reverse returns at its first guard -- if that " +
      "is no longer true, delete the offending arm rather than accepting the drift. " +
      `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );
}

// ---------------------------------------------------------------------------------------------

export default async function run() {
  theTwoVocabulariesDivergeOnExactlyOneThingEach();
  theDocsCarryTheRuling();
  everyClauseHasTeeth();
  theClausesFailOnThePreChangeTree();
  await theDeployedFunctionsCarryTheShip();

  notRun(
    "the WRITE paths -- sweep_decision_windows()'s close branch and its before-image, " +
      "reverse_decision()'s restore of a vision_claims image, the SES-311 trigger's behaviour on " +
      "that close, and the legacy ship-backfill -- and every pg_proc fact (overload counts, " +
      "EXECUTE grants, the OUT-column list)",
    "both functions are WRITERS: they finalise the decision ledger, move runner_ladder, rewrite " +
      "board rows and queue directives. A permanent regression test must never do that on the " +
      "live board (the SES-196 / SES-218 / SES-275 refusal), and this suite reaches Supabase only " +
      "over PostgREST, which cannot read pg_proc and cannot open a transaction to roll a fixture " +
      "back. MEASURED AT THIS SHIP INSTEAD, live over the MCP, inside deliberately failing DO " +
      "blocks with every fixture rolled back, and asserted on the OUTCOME AND THE COUNTS rather " +
      "than on 'it returned'. ARM 1, the close: a fixture supervised cycle, two fixture tickets " +
      "(ZZZ-991, ZZZ-992) both `delivered` and both on the Selfbuild epic so the SES-311 trigger " +
      "is in play, an approve verdict on ZZZ-991 only, record_ship_decision(), the decision's " +
      "expires_at back-dated one minute, then sweep_decision_windows(NULL,'ses-320-test') -> " +
      "closed=1, finalized=1, promoted=1; ZZZ-991 `done` with its queue slot RELEASED (queue " +
      "null, the B4/B5 recompute), ZZZ-992 still `delivered` (THE NEGATIVE CONTROL: no ship " +
      "decision, nothing to finalise, nothing closed), exactly ONE before-image under the ship " +
      "decision's own id naming that ticket, the decision `final`, and updated_at NOT later than " +
      "decided_at. THE SES-311 TRIGGER WAS ASSERTED, NOT ASSUMED: the same close re-run by hand " +
      "with the verdict deleted RAISED 'SES-311: ZZZ-991 cannot be written done -- no " +
      "runner_verdicts row exists for it', so the trigger really is satisfied by construction " +
      "(record_ship_decision() requires an approve verdict on that same backlog_id) rather than " +
      "dormant. ARM 1B, the Reverse of that finalised ship, run on a fixture that reproduced the " +
      "REAL step-7 order (image the ticket, write `delivered`, then record the ship decision): " +
      "after the sweep closed it, reverse_decision() returned outcome='applied', restored=1, " +
      "restored_unverified=0, refused=0, refused_written_since=0, demoted=true; the ticket went " +
      "`done` -> `open` (its oldest image under that decision, i.e. the state before the ship, " +
      "which is what 'one Reverse, one restore' means here), the decision `reversed`, and EXACTLY " +
      "ONE REVERT-FORWARD REQUESTED directive was queued. THE COUNTERFACTUAL IS WHAT MAKES THAT " +
      "ARM DISCRIMINATING, and it is the reason the shipped close does not write updated_at: the " +
      "SAME fixture with the updated_at bump simulated (the kickoff's literal SQL) returned " +
      "outcome='refused', restored=0, refused_written_since=1, reason 'NOTHING RESTORED: 1 row(s) " +
      "carry an updated_at later than the decision itself', and the ticket STAYED `done` with the " +
      "decision still standing. So the non-bump is proven to succeed exactly where the shape it " +
      "replaced fails, rather than merely to succeed. ARM 2, the allowlist: a fixture " +
      "vision_claims row classed 'P1 - Improves John's Skills', a record_decision() " +
      "classification decision with that claim's before-image under it, the class rewritten to " +
      "'P3 - Investor Value' -> reverse_decision() returned outcome='applied', restored=1, " +
      "refused=0, refused_written_since=0 and the claim's judgment_class was BACK at P1. ITS " +
      "CONTROL, in the same transaction: an identical decision carrying a runner_verdicts " +
      "before-image returned restored=0, refused=1 and the verdict's edited reasoning STOOD -- so " +
      "the allowlist widened by exactly one content table and not into the runner's own evidence. " +
      "ZERO RESIDUE on re-read after rollback: 0 ZZZ-* tickets, 0 VC-ZZZ-* claims, 0 fixture " +
      "decisions, 0 fixture before-images, 0 fixture directives, 0 fixture cycles, 0 fixture " +
      "verdicts. pg_proc at the same ship, asserted by the migration's OWN trailing DO block " +
      "rather than by its success flag: exactly 1 overload each of sweep_decision_windows and " +
      "reverse_decision, an OUT column named `closed` present in proargnames, EXECUTE false for " +
      "anon and authenticated and true for service_role on both (has_function_privilege, both " +
      "directions -- functions default OPEN in this project and both had just been DROPped, so " +
      "both came back open until revoked by name), ten named pre-change landmarks still present " +
      "in reverse_decision()'s retyped body, exactly one runner_decisions delete left in it, and " +
      "-- the assertion that guards the absence -- ZERO occurrences of `set status = 'done', " +
      "updated_at` in sweep_decision_windows(). THE LEGACY BACKFILL, one attended ship-backfill " +
      "decision (cfdbeab2-4e4a-4cbb-8321-e82ba6d24cdc, session design-m7-build-0902, 14 " +
      "before-images, its own 72-hour window): 14 of the 16 legacy delivered rows closed on GIT " +
      "evidence -- a subject-matching origin/dev commit older than 72 hours, never on a status " +
      "alone -- and SES-273 / SES-275 LEFT delivered because their commits fall INSIDE the " +
      "window, i.e. early rather than evidence-less. One Reverse of that one decision undoes all " +
      "14.",
  );
}

selfRun(import.meta.url, run);
