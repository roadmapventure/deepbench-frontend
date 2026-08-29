// DeepBench v7.0.317 | tests/regression/SES-220-loadable-columns.js | SES-220
//
// v7.0.317 UPDATE — THE LOADER-SIDE HALVES WERE RUN, and this file's central clause was REAIMED
// because the fact it pinned expired. See the block above doesNotClaimTheFixForSetsOnDisk() for
// why, and read the rest of this header as the v7.0.298 statement it was: accurate then, and the
// reason the metadata exists at all.
//
// v7.0.298 header follows.
// DeepBench v7.0.298 | tests/regression/SES-220-loadable-columns.js | SES-220
//
// Guards the metadata that lets a restore loader avoid the two row-loss defects the v7.0.292
// drill found -- and, with equal weight, the statement that this ship did NOT fix them.
//
// THE DEFECTS. (3) ai_activity_log.caller_ip_masked and ip_org_cache.caller_ip_masked are
// GENERATED ALWAYS ... STORED. dump-supabase.mjs writes their computed values into the .ndjson and
// the loader inserts every key it finds, so Postgres refuses the whole table with
// `428C9 cannot insert a non-DEFAULT value into column "caller_ip_masked"` -- 34,761 + 24 rows,
// plus 124 cascading on pattern_candidates' FK, which is the 67%. (4) pending_confirmations
// .proposed_action is jsonb NOT NULL and 2 of its 312 rows hold the JSON scalar null; NDJSON
// serialises that as `null`, the loader reads it back as SQL NULL, and the table dies on 23502.
//
// WHERE THE FIX IS NOT, because the ticket says otherwise and it was measured rather than argued.
// SES-220 places both defects "in public._backup_schema_ddl / the dump's column selection ... NOT
// in dump-supabase.mjs". Read live at v7.0.298, _backup_schema_ddl ALREADY emits
// `caller_ip_masked text GENERATED ALWAYS AS (...) STORED` -- the restored TABLE is correct and
// there is nothing to repair on the schema path. The failing statement is the INSERT, and both it
// and the over-wide SELECT are issued by the OFFSITE scripts. So v7.0.298 ships the in-repo half:
// public._backup_inventory publishes loadable_cols and jsonb_notnull_cols, and the runbook records
// the contract the offsite half must build against.
//
// THE CLAUSE THIS FILE EXISTS FOR, above every other assertion in it: `doesNotClaimTheFix`.
// Publishing metadata invites a later reader -- or a later cycle scanning for "is SES-220 done?" --
// to record the defects as closed. They are not. No set has been re-dumped, the offsite scripts
// still select `*`, and every set that exists still loses 5 tables. A file that stops saying so
// sends whoever is mid-outage into an outage plan built on 100% recovery.
//   [v7.0.317: the middle sentence expired -- the offsite scripts NO LONGER select `*` (SES-223,
//    v7.0.303) and a stuck table is now retried row by row (SES-230, v7.0.312). The FIRST and LAST
//    sentences did not expire and are why the clause was split rather than dropped: no repair
//    reaches a set already on disk, so every set that exists still loses those 5 tables.]
//
// THE TRAP, and it is a privacy one (.claude/rules/supabase-column-grants.md, LOG-124). The fastest
// way to make today's sets load is to emit caller_ip_masked as a plain column instead of a
// generated one. That works, and it converts a computed masking control into frozen data: every
// post-restore insert lands a NULL mask, and v7.0.285's pinned drill criterion (the column restores
// as GENERATED ALWAYS, no DEFAULT) silently inverts. B2 asserts the opposite direction on the live
// emission -- raw caller_ip must still be IN loadable_cols, because its protection is the column
// GRANT, and dropping it from the dump would lose real data to a privacy measure that isn't one.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied (SES-180 (b)): the view BODY lives in
// the database (migration ses220_backup_inventory_loadable_columns), not in this repo, so no
// assertion here can read its definition. Part B reaches its OUTPUT through PostgREST, which is
// strictly better than a source grep -- it tests what a dumper would actually read -- but it needs
// credentials and declares itself not-run without them. The six-arm round-trip proof (a fixture
// table whose full-column INSERT reproduces 428C9, whose loadable_cols-driven INSERT succeeds AND
// recomputes the mask, a jsonb NOT NULL column reproducing 23502 then accepting 'null'::jsonb, and
// a no-generated-column fixture as the negative control) ran live inside a deliberately-failing DO
// block and is recorded on the ship card; it cannot run from here because it creates tables.
//
// EVERY PART-A ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that
// should matter removed. "Would this still pass if the change did nothing?" must answer "no", which
// is the bar SES-176 set for this repo's doc guards.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const RUNBOOK = path.join("docs", "runbooks", "restore-from-backup.md");
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), "utf8");

const MIGRATION = "ses220_backup_inventory_loadable_columns";

// --- Part A: the runbook carries the contract AND the caveat ------------------------------------
//
// Exported so a later session -- above all the one landing the offsite half -- can reuse the
// predicates rather than re-deriving them.

export function recordsTheMetadata(md) {
  return md.includes(MIGRATION)
    && md.includes("loadable_cols")
    && md.includes("jsonb_notnull_cols");
}

// The loader contract. Both halves must survive: which columns may be supplied, and the rule that
// makes the jsonb coercion SAFE rather than a guess. Without the second sentence a later reader
// cannot tell why coercing a null is legitimate here and reckless everywhere else.
export function statesTheLoaderContract(md) {
  return md.includes("drops any key not in `loadable_cols`")
    && md.includes("SQL `NULL` could never have been dumped");
}

// THE CLAUSE THIS FILE EXISTS FOR, REAIMED AT v7.0.317 -- and read the reason, because the retired
// version of it is now the thing that would be wrong.
//
// Until v7.0.317 this clause was `doesNotClaimTheFix`, and it pinned three literal sentences:
// "Defects (3) and (4) are untouched.", "5 tables and 67% of the rows still will not load", and
// "both defects remain live in every set that exists". It was correct at v7.0.298, when the offsite
// scripts still selected `*`. SES-223 (v7.0.303) and SES-230 (v7.0.312) then landed, and the guard
// went on REQUIRING the runbook to say the defects were untouched -- pinning a falsehood in the one
// document somebody reads mid-outage. A doc guard that outlives its fact does not fail safe; it
// enforces the stale reading.
//
// So the clause is not deleted, it is SPLIT along the line the facts actually fall on:
//   * what changed  -- a set dumped after v7.0.303 loads its generated columns (measured, not
//                      argued: 40/40 through the real loader against a real Postgres);
//   * what did NOT  -- neither repair reaches a set already on disk, and the jsonb scalar null is
//                      still never restored, only reported.
// Both halves are load-bearing in OPPOSITE directions, which is why each gets its own clause below.
// Quoting either one alone is a way to be wrong: "67%" mis-sizes a current set's recovery, and "the
// restore works now" mis-sizes an old set's. The runbook must therefore carry BOTH, plus the two
// one-line commands that tell an operator which set they are holding.

// (a) The operator can tell which vintage they hold WITHOUT knowing this project's ship history.
//     Two independent tests, because the two repairs landed independently and a set can be on
//     either side of each.
export function saysWhichVintageYouHold(md) {
  return md.includes("grep -c '^GRANT ' schema.sql")
    && md.includes("grep -c '\"loadable_cols\"' manifest.json");
}

// (b) The measured recovery is stated, INCLUDING the assertion that makes it more than a row count:
//     the generated column comes back generated, not frozen. A restore that loaded it as plain data
//     would land a NULL mask on every later insert -- the LOG-124 leak from the other side.
export function carriesTheMeasuredRecovery(md) {
  return md.includes("40 of 40 rows restored")
    && md.includes("recomputed on all 40");
}

// (c) THE PERMANENT HALF. Neither repair reaches a set already on disk, and the jsonb scalar null is
//     reported rather than represented. This is what stops a reader planning an outage around 100%
//     recovery off a set that recovers 32.8%.
export function doesNotClaimTheFixForSetsOnDisk(md) {
  return md.includes("both defects remain live in every set that already exists")
    && md.includes("still never restored")
    && md.includes("must not be quoted for a current one");
}

// (d) jsonb_notnull_cols is populated and has NO READER. Without this said out loud, the next cycle
//     reads the published contract, assumes the loader coerces, and "wires it up" -- into a
//     transport SES-230 measured five ways and proved cannot carry the value.
export function namesTheUnimplementableCoercion(md) {
  return md.includes("no reader today");
}

// The forbidden edit stays named. It is the one that makes today's sets load.
export function keepsTheGeneratedColumnTrap(md) {
  return md.includes("converts a computed privacy control into frozen data");
}

// The two 27s are different sets. A later edit that derives either from the other breaks whichever
// it did not measure -- and one of the two is the LOG-124 column list.
export function keepsTheTwo27sWarning(md) {
  return md.includes("TWO 27s THAT ARE NOT THE SAME 27");
}

async function run() {
  const md = read(RUNBOOK);

  // A1 -- the metadata is recorded, by migration name and by column name.
  assert.ok(recordsTheMetadata(md),
    `${RUNBOOK} does not name migration ${MIGRATION} and its two columns. The metadata has no ` +
    `home in the runbook the offsite half is built from.`);
  for (const [label, token] of [
    ["migration name", MIGRATION],
    ["loadable_cols", "loadable_cols"],
    ["jsonb_notnull_cols", "jsonb_notnull_cols"],
  ]) {
    assert.ok(!recordsTheMetadata(md.split(token).join("")),
      `negative control failed: recordsTheMetadata() still passes with the ${label} removed.`);
  }

  // A2 -- the contract the offsite scripts must implement, including WHY the coercion is safe.
  assert.ok(statesTheLoaderContract(md),
    `${RUNBOOK} no longer states the loader contract. The columns exist but nothing says what a ` +
    `loader is supposed to do with them, which is the half that makes them useful.`);
  for (const [label, token] of [
    ["key-dropping rule", "drops any key not in `loadable_cols`"],
    ["why the null coercion is unambiguous", "SQL `NULL` could never have been dumped"],
  ]) {
    assert.ok(!statesTheLoaderContract(md.split(token).join("")),
      `negative control failed: statesTheLoaderContract() still passes with the ${label} removed.`);
  }

  // A3 -- THE CLAUSE THIS FILE EXISTS FOR, in its four post-v7.0.317 halves.

  // A3a -- the operator can date their own set, from the set alone.
  assert.ok(saysWhichVintageYouHold(md),
    `${RUNBOOK} no longer gives both one-line vintage tests. Two repairs landed independently ` +
    `(SES-216 grants, v7.0.294; SES-223 loadable_cols, v7.0.303) and NEITHER reaches a set already ` +
    `on disk, so how much a restore recovers is a property of the SET, not of this project's ship ` +
    `history. Without both commands the person mid-outage has to know which ship landed when.`);
  for (const [label, token] of [
    ["grants test", "grep -c '^GRANT ' schema.sql"],
    ["loadable_cols test", "grep -c '\"loadable_cols\"' manifest.json"],
  ]) {
    assert.ok(!saysWhichVintageYouHold(md.split(token).join("")),
      `negative control failed: saysWhichVintageYouHold() still passes with the ${label} removed.`);
  }

  // A3b -- the measurement, and the privacy assertion inside it.
  assert.ok(carriesTheMeasuredRecovery(md),
    `${RUNBOOK} has dropped the measured loader-side result (v7.0.317: the real ` +
    `restore-supabase.mjs against a real Postgres, two sets whose .ndjson is byte-identical and ` +
    `whose manifests differ in loadable_cols alone). Without the numbers the vintage tests above ` +
    `tell an operator which case they are in and nothing about what it costs them.`);
  for (const [label, token] of [
    ["generated-column row count", "40 of 40 rows restored"],
    ["mask-recomputation assertion", "recomputed on all 40"],
  ]) {
    assert.ok(!carriesTheMeasuredRecovery(md.split(token).join("")),
      `negative control failed: carriesTheMeasuredRecovery() still passes with the ${label} removed.`);
  }

  // A3c -- THE PERMANENT HALF, and the one a later "tidy-up" is most likely to delete as obsolete.
  assert.ok(doesNotClaimTheFixForSetsOnDisk(md),
    `${RUNBOOK} has stopped saying that SES-220 defects (3) and (4) are still live IN THE SETS ` +
    `THAT EXIST. The emissions are fixed; no repair reaches a set already on disk, and a jsonb ` +
    `scalar null is still reported rather than restored. A reader who takes v7.0.303/v7.0.312 as ` +
    `"the restore works now" plans an outage around 100% recovery off a set that gives 32.8%.`);
  for (const [label, token] of [
    ["sets-on-disk caveat", "both defects remain live in every set that already exists"],
    ["jsonb-null caveat", "still never restored"],
    ["do-not-quote-67%-for-a-current-set rule", "must not be quoted for a current one"],
  ]) {
    assert.ok(!doesNotClaimTheFixForSetsOnDisk(md.split(token).join("")),
      `negative control failed: doesNotClaimTheFixForSetsOnDisk() still passes with the ` +
      `${label} removed.`);
  }

  // A3d -- the published-but-unread metadata is named as such.
  assert.ok(namesTheUnimplementableCoercion(md),
    `${RUNBOOK} no longer says that jsonb_notnull_cols has no reader. It is populated on 5 tables ` +
    `and the stated contract says a loader "coerces a null" using it -- so a later cycle reads the ` +
    `contract, assumes the coercion exists, and wires it into restore-supabase.mjs. SES-230 put ` +
    `five arms through the real PostgREST and no request body produces a jsonb scalar null.`);
  assert.ok(!namesTheUnimplementableCoercion(md.split("no reader today").join("a reader")),
    "negative control failed: namesTheUnimplementableCoercion() passes with the warning removed.");

  // A4 -- the forbidden edit stays named.
  assert.ok(keepsTheGeneratedColumnTrap(md),
    `${RUNBOOK} no longer warns that emitting caller_ip_masked as a plain column rebuilds the ` +
    `LOG-124 exposure from the other side. That is the repair someone reaches for when they want ` +
    `today's sets to load.`);
  assert.ok(!keepsTheGeneratedColumnTrap(
    md.split("converts a computed privacy control into frozen data").join("is fine")),
    "negative control failed: keepsTheGeneratedColumnTrap() passes with the warning removed.");

  // A5 -- the two 27s stay distinguished.
  assert.ok(keepsTheTwo27sWarning(md),
    `${RUNBOOK} has dropped the warning that ai_activity_log's 27 anon-granted columns and its 27 ` +
    `loadable columns are different sets. Deriving either from the other breaks whichever was not ` +
    `measured, and one of them is the LOG-124 column list.`);
  assert.ok(!keepsTheTwo27sWarning(md.split("TWO 27s THAT ARE NOT THE SAME 27").join("a note")),
    "negative control failed: keepsTheTwo27sWarning() passes with the warning removed.");

  // --- Part B: the live inventory ------------------------------------------------------------
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    notRun("SES-220 live inventory half",
      "no Supabase credentials in env -- the view body lives in the database, so the only real " +
      "check of what a dumper would read is querying public._backup_inventory. Run with " +
      "`node --env-file=.env.local tests/regression/run-all.js` to include it. Part A did run.");
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = async (p) => {
    const res = await fetch(`${url}/rest/v1/${p}`, { headers });
    if (!res.ok) throw new Error(`read failed (${p}): HTTP ${res.status} ${await res.text()}`);
    return res.json();
  };

  // B1 -- the columns exist and are populated. This is the defect, stated as an assertion: before
  //       v7.0.298 selecting loadable_cols was a 400, and a dumper had nothing to select on.
  const inv = await rest("_backup_inventory?select=name,kind,pk,loadable_cols,jsonb_notnull_cols&limit=500");
  assert.ok(inv.length > 0, "public._backup_inventory returned no rows at all.");
  const tables = inv.filter(r => r.kind === "table");
  assert.ok(tables.length > 0, "public._backup_inventory reports no tables.");
  const emptyLoadable = tables.filter(r => !r.loadable_cols);
  assert.deepStrictEqual(emptyLoadable.map(r => r.name), [],
    `${emptyLoadable.length} table(s) publish an empty loadable_cols. A dumper selecting on that ` +
    `list would dump no columns at all -- silently worse than the defect this replaced.`);

  // B2 -- THE GENERATED COLUMN IS EXCLUDED AND THE RAW ONE IS NOT. Both directions matter: the
  //       first is the fix, the second is the privacy trap facing the other way. caller_ip is real
  //       data whose protection is the column GRANT (LOG-124); dropping it from the dump would
  //       lose it while protecting nothing.
  const ail = inv.find(r => r.name === "ai_activity_log");
  assert.ok(ail, "no _backup_inventory row for ai_activity_log.");
  const ailCols = ail.loadable_cols.split(",");
  assert.ok(!ailCols.includes("caller_ip_masked"),
    `ai_activity_log.loadable_cols still contains caller_ip_masked: ${ail.loadable_cols}\n` +
    `That column is GENERATED ALWAYS ... STORED; a loader supplying it gets 428C9 and loses the ` +
    `whole table -- the platform's largest.`);
  assert.ok(ailCols.includes("caller_ip"),
    `ai_activity_log.loadable_cols has dropped raw caller_ip: ${ail.loadable_cols}\n` +
    `That is real data, not a generated column. Its LOG-124 protection is the column-level GRANT ` +
    `(SES-216), not omission from the dump -- excluding it here loses data and protects nothing.`);
  const ioc = inv.find(r => r.name === "ip_org_cache");
  assert.ok(ioc && !ioc.loadable_cols.split(",").includes("caller_ip_masked"),
    "ip_org_cache.loadable_cols still contains its generated caller_ip_masked column.");

  // B3 -- the jsonb NOT NULL list is real. pending_confirmations is the table the drill lost;
  //       durable_hops is the 73 MB one the same class of bug would take next.
  const pc = inv.find(r => r.name === "pending_confirmations");
  assert.ok(pc, "no _backup_inventory row for pending_confirmations.");
  const pcCols = (pc.jsonb_notnull_cols || "").split(",");
  assert.ok(pcCols.includes("proposed_action"),
    `pending_confirmations.jsonb_notnull_cols omits proposed_action: ` +
    `${JSON.stringify(pc.jsonb_notnull_cols)}. That is the column the drill lost 312 rows on; a ` +
    `loader without it in the list has no basis to coerce the scalar null back.`);
  const dh = inv.find(r => r.name === "durable_hops");
  assert.ok(dh && dh.jsonb_notnull_cols,
    "durable_hops publishes no jsonb_notnull_cols. It carries jsonb NOT NULL columns and is the " +
    "largest table by bytes -- the next victim of this defect class if the list is incomplete.");

  // B4 -- THE INVARIANT, cross-checked against the table's own shape rather than restated from the
  //       view. Every name in loadable_cols must be a real column, and the only names a table has
  //       that loadable_cols lacks must be generated ones. Reachable over PostgREST by reading one
  //       actual row's keys, which is what a dumper sees.
  for (const name of ["ai_activity_log", "pending_confirmations", "durable_hops"]) {
    const rows = await rest(`${name}?select=*&limit=1`);
    if (!rows.length) continue;                       // an empty table proves nothing here
    const actual = new Set(Object.keys(rows[0]));
    const listed = inv.find(r => r.name === name).loadable_cols.split(",");
    const notReal = listed.filter(c => !actual.has(c));
    assert.deepStrictEqual(notReal, [],
      `${name}.loadable_cols names ${notReal.length} column(s) the table does not have: ` +
      `${notReal.join(", ")}. A dumper selecting that list gets a 400 and dumps nothing.`);
    const missing = [...actual].filter(c => !listed.includes(c));
    const expected = name === "ai_activity_log" ? ["caller_ip_masked"] : [];
    assert.deepStrictEqual(missing.sort(), expected,
      `${name}: loadable_cols omits ${JSON.stringify(missing)} but should omit ` +
      `${JSON.stringify(expected)}. Omitting a non-generated column loses that data on every ` +
      `future restore, silently.`);
  }
}

export default run;
selfRun(import.meta.url, run);
