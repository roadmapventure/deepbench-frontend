// DeepBench v7.0.995 | tests/regression/agt-600-gap-attribution.test.mjs | AGT-600 — THE GAP
// ATTRIBUTION DECLINES A CENSUS COUNT, AND IT STILL CANNOT BLOCK THE FINDING IT ATTRIBUTES.
//
// THE DEFECT THIS GUARDS, measured live on `public.audit_findings_gap_to_designer()` before this
// ship rather than recalled: the AFTER INSERT trigger charged `designer` a `gap finding` row for
// EVERY `finding_type = 'gap'` row with a cycle id, with no test of what filed it — so the Ticket
// Owner's nightly census, which files its own open-row COUNTS as gap findings
// (`scripts/ticket-owner.js`, `foundBy: "ticket-owner:census"`), put board hygiene on the
// Designer's desk: 140 designer `gap finding` rows, 70 of them the census, 90 census gaps filed.
// A count of unruled board rows is AGT-169's subject, not a use case the Designer's plan missed.
//
// THE SHAPE OF THE FIX, and why the test is shaped the way it is. The decline is ONE added
// `where` clause on the trigger's own SELECT — `new.found_by is distinct from 'ticket-owner:census'`
// — which is what keeps the pre-fix invariant intact: a SELECT that returns no row inserts no row
// and raises nothing, so the attribution still cannot fail the auditor's own write. A handler, a
// `raise`, or an `if … then return null` would each be able to. That is why arm (1) asserts the
// ABSENCE of any `raise` inside the function body as hard as it asserts the presence of the clause.
//
// THREE ARMS, each naming what it proves.
//
//   (1) SOURCE — the shipped migration file is the one that declines, and the anchor it keys off
//       is really the string the census writes. Both halves matter: a clause testing a literal no
//       producer writes would decline nothing, which is the false green this arm exists to close.
//   (2) BOTH WAYS (the LOO-013 lesson: assert WHICH branch fired) — the `once` check of arm (1) is
//       run again over a body with that one line removed, and must THROW. Without this control a
//       `includes()` loose enough to match anything would pass arm (1) on the pre-fix function.
//   (3) LIVE, read-only, credential-gated — the migration actually landed, its down was captured
//       auto-downable BEFORE the up (runner-cycle.md step 6, so the down carries the PRIOR body and
//       therefore must NOT mention the census literal), and no `owner:<slug>` count has been
//       charged to the Designer since. Arm (3) is RED until the migration is applied: that is the
//       kickoff's own discriminator (QA 1), not a flake.
//
// WHAT THIS DOES NOT ASSERT, and must not: that the Designer's ledger is clean. AGT-600 ran no
// backfill — the 70 census rows already charged stay (kickoff D3) — so a whole-ledger assertion
// would stand red on rows this change deliberately left alone. This file grades the CHANGE
// (pattern:162); the live arm is bounded to rows created AFTER the migration's own version.
//
// Invocation: node tests/regression/agt-600-gap-attribution.test.mjs
// (STANDARDS.md Section 2 rule 5 for the credentialed form.)

import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const UP_SQL_REL = "docs/design/agt-600-gap-attribution-declines-census.sql";
const ANCHOR_REL = "scripts/ticket-owner.js";

const UP_NAME = "agt600_gap_attribution_declines_census";
const PREV_VERSION = "20261109084459";
const FAR_FUTURE = "99999999999999";

// The one literal the whole change turns on. It is written in exactly two places on this tree —
// the trigger's new `where` clause and the census writer's `foundBy` — and arm (1) reads both.
const CENSUS_FOUND_BY = "ticket-owner:census";
const DECLINE_CLAUSE = `and new.found_by is distinct from '${CENSUS_FOUND_BY}'`;
const FUNCTION_TAG = "$function$";

function read(rel) {
  return fs.readFileSync(path.join(REPO, rel), "utf8");
}

// The function BODY as the database will hold it: everything between the first and the last
// dollar-quote tag. Read this way on purpose — the migration file also carries a `do $gate$` block
// that DOES raise, and grading the whole file for `raise` would conflate the gate (which must fail
// loudly) with the trigger (which must never fail at all).
function functionText(fileText) {
  const open = fileText.indexOf(FUNCTION_TAG);
  const close = fileText.lastIndexOf(FUNCTION_TAG);
  assert.ok(open !== -1 && close > open,
    `${UP_SQL_REL} must carry the function between two ${FUNCTION_TAG} tags`);
  return fileText.slice(open + FUNCTION_TAG.length, close);
}

// Factored out so arm (2) can run the SAME check over a mutated body and require it to throw. A
// control that re-implements the check it controls proves nothing about the check that shipped.
function theDeclineClauseAppearsExactlyOnce(fn) {
  const hits = fn.split(DECLINE_CLAUSE).length - 1;
  assert.equal(hits, 1,
    `the trigger body must carry the decline clause EXACTLY once, got ${hits}: ${DECLINE_CLAUSE}`);
}

// --- arm (1): the source really declines, and the literal is really the census's ---------------

function theMigrationDeclinesTheCensus() {
  const up = read(UP_SQL_REL);
  const fn = functionText(up);

  theDeclineClauseAppearsExactlyOnce(fn);

  // THE INVARIANT AGT-136 SHIPPED AND AGT-600 MUST NOT SPEND: an attribution may not be able to
  // fail the insert it attributes. A SELECT that matches nothing is the only decline that keeps it.
  assert.ok(!/\braise\s+(exception|sqlstate)/i.test(fn),
    "the trigger body must contain NO raise — a declining attribution that can raise is able to " +
    "fail the auditor's own insert, which is the behaviour AGT-136's COALESCE exists to prevent");

  // The gate travels with the up, so the apply is self-grading: its discriminating numbers and its
  // rollback marker are both in the file.
  assert.ok(up.includes("want 3/1/0/1"),
    `${UP_SQL_REL} must carry the gate's expected design/census/bare numbers (want 3/1/0/1)`);
  assert.ok(up.includes("raise sqlstate 'AG600'"),
    `${UP_SQL_REL} must raise its own sqlstate to roll the fixture rows back — a gate that COMMITS ` +
    "its fixtures leaves residue the QA then has to clean");

  // THE ANCHOR, and this is the half that makes the clause mean something: the literal the trigger
  // now tests is the literal the census writer actually sends, on the same tree, as a gap.
  const anchor = read(ANCHOR_REL);
  const at = anchor.indexOf(`foundBy: "${CENSUS_FOUND_BY}"`);
  assert.ok(at !== -1,
    `${ANCHOR_REL} must still write foundBy: "${CENSUS_FOUND_BY}" — if the census renames it, the ` +
    "trigger's clause silently stops declining and every count is back on the Designer");
  const after = anchor.slice(at, at + 80);
  assert.ok(after.includes('findingType: "gap"'),
    `${ANCHOR_REL}'s census ingest must still file findingType: "gap" within 80 characters of its ` +
    "foundBy — a census that stopped filing gaps would reach the trigger by another door");
}

// --- arm (2): both ways — remove the clause and the check must fail ----------------------------

function theOnceCheckHasTeeth() {
  const fn = functionText(read(UP_SQL_REL));
  const without = fn
    .split("\n")
    .filter(line => !line.includes(DECLINE_CLAUSE))
    .join("\n");
  assert.ok(without.length < fn.length, "the control must actually remove the clause line");
  assert.throws(
    () => theDeclineClauseAppearsExactlyOnce(without),
    /EXACTLY once, got 0/,
    "with the decline clause removed, arm (1)'s own check must FAIL — otherwise it would have " +
    "passed on the pre-fix function body too and grades nothing"
  );
}

// --- arm (3): live, read-only ------------------------------------------------------------------

async function restRows(base, key, pathAndQuery, init) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...(init ?? {}),
    // Auth headers LAST: spreading `init` over them drops the apikey and every call 401s.
    headers: { ...(init?.headers ?? {}), apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

// A migration version is `YYYYMMDDHHMMSS` in UTC; PostgREST wants a timestamptz literal.
function versionToIso(version) {
  const v = String(version);
  assert.match(v, /^\d{14}$/, `a migration version must be 14 digits, got '${v}'`);
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T` +
         `${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}Z`;
}

async function theMigrationLandedAndNoCensusCountFollowed() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun(
      `arm (3), the live read: that exactly one migration named '${UP_NAME}' is applied after ` +
        `${PREV_VERSION}, that its captured down is 'auto-downable' and carries the PRIOR function ` +
        "body (so it names audit_findings_gap_to_designer and NOT the census literal), and that no " +
        "designer 'gap finding' row with an owner:<slug> detail has been written since that version",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. runner_migration_downs and " +
        "runner_staff_findings are service_role-only (anon and authenticated hold zero privileges, " +
        "DAT-18), so the anon key cannot substitute. Arms (1) and (2) above still ran, and arm (2) " +
        "IS the discriminator on the shipped source. Canonical invocation: STANDARDS.md Section 2 " +
        "rule 5.",
    );
    return;
  }

  // (a) The up landed, exactly once, and nothing else rode in with it.
  const applied = await restRows(base, key, "rpc/migrations_in_range", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_from: PREV_VERSION, p_to: FAR_FUTURE }),
  });
  assert.equal(applied.length, 1,
    `exactly ONE migration must be applied after ${PREV_VERSION}, got ${applied.length}: ` +
    `${JSON.stringify(applied.map(m => m?.name))}`);
  assert.equal(String(applied[0]?.name), UP_NAME,
    `that migration must be '${UP_NAME}', got '${applied[0]?.name}'`);
  const version = versionToIso(applied[0]?.version);

  // (b) The down was captured BEFORE the up (runner-cycle.md step 6), which is exactly why it must
  // carry the PRIOR body: a down that mentions the census literal is a down captured AFTER the
  // apply, and reversing with it would leave the defect in place while reporting a rollback.
  const downs = await restRows(base, key,
    `runner_migration_downs?up_name=eq.${encodeURIComponent(UP_NAME)}&select=classification,down_sql`);
  assert.equal(downs.length, 1,
    `runner_migration_downs must hold exactly one row for '${UP_NAME}', got ${downs.length}`);
  assert.equal(String(downs[0]?.classification), "auto-downable",
    `the captured down must be 'auto-downable', got '${downs[0]?.classification}' — a refused down ` +
    "means this function change has no derivable reversal");
  const downSql = String(downs[0]?.down_sql ?? "");
  assert.ok(downSql.includes("audit_findings_gap_to_designer"),
    "the down must restore audit_findings_gap_to_designer by name");
  assert.ok(!downSql.includes(CENSUS_FOUND_BY),
    `the down must NOT mention '${CENSUS_FOUND_BY}' — it carries the body from BEFORE this change, ` +
    "so the literal's presence would mean the capture ran after the apply");

  // (c) The behaviour itself, bounded to rows created after the up: a census count's detail begins
  // `owner:<slug>: ` (its check_slug), so a single such designer row after this version is the
  // decline not firing. Bounded on purpose — the 70 pre-existing rows stay (kickoff D3).
  const since = await restRows(base, key,
    "runner_staff_findings?kind=eq.gap%20finding&detail=like.owner:*" +
    `&created_at=gt.${encodeURIComponent(version)}&select=id`);
  assert.equal(since.length, 0,
    `no designer 'gap finding' with an owner:<slug> detail may be written after ${version}, got ` +
    `${since.length} — the trigger is still charging the census to the Designer`);
}

export default async function run() {
  theMigrationDeclinesTheCensus();
  theOnceCheckHasTeeth();
  await theMigrationLandedAndNoCensusCountFollowed();
}

selfRun(import.meta.url, run);
