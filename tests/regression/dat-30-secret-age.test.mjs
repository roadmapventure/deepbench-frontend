// DeepBench v7.0.1063 | tests/regression/dat-30-secret-age.test.mjs | DAT-30 -- every stored key's
// age reaches the brief, in its place, read by NAME and `updated_at`, with no value read anywhere.
//
// FEATURE: DAT-30, redesign attempt 2. Measured before this ship (2026-11-19): `runner_secrets`
// holds 12 rows, the oldest `updated_at` 91 days old, 5 rows at or past 90 -- and `grep` over the
// renderer named `runner_secrets` NOWHERE, so the age of every credential the platform holds
// reached no surface John reads. A fact nobody renders is a fact nobody is told.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (1) THE ROWS AND THE BOUNDARY, GRADED ON THE EXACT DAY. The fixture is built so one row lands on
//     90, one ONE SECOND short of it, and one on 0: a helper using `<=`, rounding instead of
//     flooring, or comparing dates rather than whole days flips at least one of those three cells.
//     `**at or past 90**` is asserted to appear EXACTLY ONCE, so a group that flagged every row --
//     reading as a platform with nothing but expired keys -- fails here rather than shipping.
//
// (2) ABSENT IS NOT ZERO, asserted as two sentences that must not overlap -- the same rule every
//     group in `render-standing-brief.js` keeps. "The ledger was not read" and "no key is stored"
//     are opposite facts, and only one of them is a measurement.
//
// (3) IT IS IN THE BRIEF, AND IN ITS PLACE: after `**Redesign after refusal**`, before
//     `**Human gates**` (which stays last deliberately, SES-386). And it is OUTSIDE factsSha():
//     the age advances with the clock, so hashing it would report drift on every single run --
//     `AGT-281`'s rule, the call AGT-610, AGT-367 and AGT-607 each made before it. Asserting the
//     helper alone would pass against a helper nothing calls, which is the state the COLUMN was in.
//
// (4) THE READ ASKS FOR TWO COLUMNS AND NO VALUE, read out of the source rather than restated.
//     This is the clause the whole ticket turns on: the table holds every credential the platform
//     has, so a `select=*` or a `value` in that query would publish secrets into a committed
//     markdown file. The query string is asserted to appear EXACTLY ONCE, so there is one place in
//     the renderer that says which columns are asked for and no second copy to rot.
//
// NO CREDENTIALS, no network, no Supabase, no model call, no writes, and no secret value is read,
// printed or asserted here -- names, timestamps and whole-day ages only. Every assertion below is a
// pure helper driven from fixtures, plus one read-only source grep.
//
// NOT IN THIS TICKET (DAT-30 D1, blocked and not built): the rotation stamp -- a `rotated_at`
// column, a cadence column, a stamping trigger. That is DDL on the table holding every credential,
// it is the action attempt 1 was refused on, and nothing in this file asserts or implies it exists.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
// A NAMESPACE import deliberately: a named import of `renderSecretAge` would be a LINK-time error
// against the unchanged script, and this file's discriminator (kickoff QA 1) is that it runs and
// reports `4 of 4 arms failed` there -- not that it fails to load.
import * as brief from "../../scripts/render-standing-brief.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_REL = "scripts/render-standing-brief.js";

const NOW = "2026-11-19T12:00:00Z";
const STAMP = brief.asOf(NOW);
const Q = "runner_secrets?select=name,updated_at&order=updated_at.asc,name.asc";

// Three rows, by NAME and `updated_at` only -- the shape the read returns, and no `value` key even
// in the fixture. OLD is exactly 90 days before NOW; EDGE is ONE SECOND younger than that, so it is
// 89 whole days; NEW is half a day old, so it is 0.
const F = [
  { name: "OLD", updated_at: "2026-08-21T12:00:00Z" },
  { name: "EDGE", updated_at: "2026-08-21T12:00:01Z" },
  { name: "NEW", updated_at: "2026-11-19T00:00:00Z" },
];

// agt-607's FACTS() shape, with `secrets: F` in place of `stalls: STALLS`.
const ITEMS = [{ id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 }];
const FACTS = (over = {}) => ({
  items: ITEMS, settings: null, drain: null,
  decisions: { open: [], finalWeek: 0, reversedWeek: 0 },
  census: [{ judgment_class: "P1 - Improves John's Skills", ord: 1, ratified: 0, proposed: 0, rejected: 0, total: 0, newest_root_claim_ref: null, newest_root_claim: null }],
  johnModel: [{ ord: 0, scope: "overall", pattern_no: null, imperative: null, citing_decisions: 0, finalised_unreversed: 0, reversed: 0, open: 0, agreement_rate: null }],
  inventionUse: [{ window: "all", ord: 3, judge_runs: 1, judge_runs_real_visitors: 0, distinct_real_visitors: 0, first_real_visitor_at: null, last_real_visitor_at: null }],
  staff: [],
  secrets: F,
  ...over,
});

const exported = () => assert.ok(typeof brief.renderSecretAge === "function",
  "renderSecretAge must be exported");

// == (1) the rows and the 90/89/0 boundary =======================================================
function theRowsCarryEveryAgeAndFlagOnlyTheLateOne() {
  exported();
  const out = brief.renderSecretAge(F, STAMP, NOW);

  assert.ok(out.includes("**Oldest row: 90 days (`OLD`)**, 1 of 3 at or past 90 days."),
    "the lead must name the OLDEST row and count the late ones separately -- those are the two " +
    `numbers a reader acts on. got:\n${out}`);
  assert.ok(out.includes("| 90 | **at or past 90** |"),
    `the row exactly 90 whole days old is AT the cadence and must be flagged. got:\n${out}`);
  assert.ok(out.includes("| 89 | under 90 |"),
    "CONTROL: the row ONE SECOND younger is 89 whole days and must NOT be flagged -- a helper " +
    `rounding or comparing dates rather than flooring whole days flips this cell. got:\n${out}`);
  assert.ok(out.includes("| 0 | under 90 |"),
    `and a row written today is 0 days, never blank and never 1. got:\n${out}`);

  const flags = [...out.matchAll(/\*\*at or past 90\*\*/g)];
  assert.strictEqual(flags.length, 1,
    `exactly ONE of the three rows is at or past the cadence, got ${flags.length}. A group that ` +
    "flagged all three reads as a platform with nothing but expired keys; one that flagged none " +
    `hides the real one.\n${out}`);

  assert.strictEqual(brief.SECRET_ROTATION_DAYS, 90,
    "the cadence is one constant, 90, the ticket's number -- there is no per-row cadence");
  assert.ok(out.includes("no value is read"),
    `the group must SAY that no value is read -- it is the clause the table's content requires. got:\n${out}`);
  assert.ok(out.includes("GitHub Actions secrets are not in this table"),
    `and it must not read as a complete inventory of the platform's secrets. got:\n${out}`);
}

// == (2) absent is not zero ======================================================================
function absentIsNotZero() {
  exported();
  const notRead = brief.renderSecretAge(undefined, STAMP, NOW);
  const zero = brief.renderSecretAge([], STAMP, NOW);

  assert.notStrictEqual(notRead, zero,
    "the control is vacuous unless the unread and measured-zero renders really differ");
  assert.ok(/was not read/i.test(notRead), `an unread ledger must SAY it was not read, got:\n${notRead}`);
  assert.ok(!/measured zero/i.test(notRead),
    "an unread ledger must NOT print the measured-zero sentence -- \"the read did not happen\" and " +
    `"no key is stored" are opposite facts and the brief must not blur them. got:\n${notRead}`);
  assert.ok(/measured zero/i.test(zero),
    `an empty table must say so in the words of a measurement, got:\n${zero}`);
  assert.ok(!/was not read/i.test(zero),
    `a measured zero must not also claim the ledger went unread, got:\n${zero}`);
}

// == (3) in the brief, in its place, and outside factsSha() ======================================
function theGroupSitsBetweenTheLedgerAndHumanGates() {
  const block = brief.renderBlock(FACTS(), NOW);
  const at = s => block.indexOf(s);

  assert.ok(at("**Secret age**") > -1,
    "renderBlock() must carry the Secret age lead. A helper nothing calls is exactly the state the " +
    "`runner_secrets` table was in -- 12 rows, read by no renderer at all.");
  assert.ok(at("**Redesign after refusal**") > -1, "renderBlock() must carry the refusal-ledger lead");
  assert.ok(at("**Human gates**") > -1, "renderBlock() must carry the Human gates lead");

  assert.ok(at("**Redesign after refusal**") < at("**Secret age**"),
    "Secret age must come AFTER Redesign after refusal (kickoff T1d)");
  assert.ok(at("**Secret age**") < at("**Human gates**"),
    "and BEFORE Human gates -- Human gates is the LAST group deliberately (SES-386): it is the one " +
    "that says whether anything above it is waiting on a person.");
  assert.ok(at("**Human gates**") < at("*Provenance:"), "and all of it before the provenance line");
  assert.ok(block.includes("| 90 | **at or past 90** |"),
    "the rows reach the ASSEMBLED block, not just the helper");

  assert.strictEqual(brief.factsSha(FACTS()), brief.factsSha(FACTS({ secrets: undefined })),
    "the secret ages must be OUTSIDE factsSha() (AGT-281's rule): the age advances with the clock, " +
    "so hashing it would report drift on every single run and --check would stop being read");
  // CONTROL: the sha is not simply blind. A fact that IS in the payload still moves it, so the
  // equality above is a statement about `secrets` rather than about factsSha() hashing nothing.
  assert.notStrictEqual(
    brief.factsSha(FACTS({ items: [{ ...ITEMS[0], status: "done" }] })),
    brief.factsSha(FACTS()),
    "CONTROL: a board row's status IS in the payload and must move the sha -- otherwise the " +
    "equality above would pass against a factsSha() that hashes nothing at all");
}

// == (4) the read asks for two columns, never a value ============================================
function theReadNamesTwoColumnsAndNoValue() {
  const src = fs.readFileSync(path.join(ROOT, SOURCE_REL), "utf8");
  const hits = src.split(Q).length - 1;
  assert.strictEqual(hits, 1,
    `${SOURCE_REL} must hold the secret-age query EXACTLY once (got ${hits}) -- one place says which ` +
    "columns are asked for, and a second copy is how a `value` gets added to one of them later");
  assert.ok(!/runner_secrets\?select=[^"`]*(\*|value)/.test(src),
    "the read must never ask for `value` and never for `select=*` on `runner_secrets` -- that table " +
    "holds every credential the platform has, and this script writes its output into a COMMITTED " +
    "markdown file (.claude/rules/supabase-column-grants.md: columns are NAMED, never select=*)");
  // CONTROL: the regex can see a bad query when one is present.
  assert.ok(/runner_secrets\?select=[^"`]*(\*|value)/.test("runner_secrets?select=name,value"),
    "CONTROL: the value/select=* pattern fires on a query that really asks for a value");
}

export default async function run() {
  const failures = [];
  const arm = (name, fn) => {
    try { fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    [arm ${name}] FAIL -- ${e.message.split("\n")[0]}`); }
  };

  arm("rows", theRowsCarryEveryAgeAndFlagOnlyTheLateOne);   // (1)
  arm("absent", absentIsNotZero);                           // (2)
  arm("place", theGroupSitsBetweenTheLedgerAndHumanGates);  // (3)
  arm("read", theReadNamesTwoColumnsAndNoValue);            // (4)

  if (failures.length) throw new Error(`${failures.length} of 4 arms failed:\n      ${failures.join("\n      ")}`);

  console.log("  [DAT-30] three fixture rows render 90 / 89 / 0 whole days since `updated_at` with " +
    "`**at or past 90**` on exactly one of them, an unread ledger says so without saying \"measured " +
    "zero\", renderBlock() places the group after Redesign after refusal and before Human gates " +
    "while factsSha() stays equal with and without it (a board status still moving it), and the " +
    "read holds its two-column query exactly once and asks for no `value` -- each clause with a " +
    "control that flips it.");
}

selfRun(import.meta.url, run);
