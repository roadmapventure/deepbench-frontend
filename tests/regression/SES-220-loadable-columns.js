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

// THE CLAUSE THIS FILE EXISTS FOR. Publishing metadata is not fixing the defect.
export function doesNotClaimTheFix(md) {
  return md.includes("Defects (3) and (4) are untouched.")
    && md.includes("5 tables and 67% of the rows still will not load")
    && md.includes("both defects remain live in every set that exists");
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

  // A3 -- THE CLAUSE THIS FILE EXISTS FOR. Metadata published is not a defect fixed.
  assert.ok(doesNotClaimTheFix(md),
    `${RUNBOOK} has stopped saying that SES-220 defects (3) and (4) are still live. Publishing ` +
    `loadable_cols does not load a single row: the offsite dumper and loader still select "*" ` +
    `and insert every key, and no set has been re-dumped. A reader who takes this ship as "the ` +
    `restore works now" plans an outage around 100% recovery and gets 32.8%.`);
  for (const [label, token] of [
    ["SES-216 (3)/(4) caveat", "Defects (3) and (4) are untouched."],
    ["5-tables/67% figure", "5 tables and 67% of the rows still will not load"],
    ["sets-still-broken statement", "both defects remain live in every set that exists"],
  ]) {
    assert.ok(!doesNotClaimTheFix(md.split(token).join("")),
      `negative control failed: doesNotClaimTheFix() still passes with the ${label} removed.`);
  }

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
