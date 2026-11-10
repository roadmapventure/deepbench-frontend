// DeepBench v7.0.998 | tests/regression/agt-577-napkin-due-filter.test.mjs | AGT-577 -- THE NAPKIN
// DUE FILTER READS THE TEXT, NOT `updated_at`.
//
// THE DEFECT, measured live on tree f89495d rather than reasoned about: `public.napkin_ideas` held
// 62 rows and NO trigger, and the Researcher playbook's own rule selected "every row whose
// researched_at is NULL or older than updated_at". A tagging pass on 2026-10-17 between 14:52 and
// 15:15 UTC moved `updated_at` on 41 rows without touching one word of any idea's text, so the
// Saturday run's due set was 42 rows (1 never researched + the 41 the tagging pass re-opened) where
// it should have been 1. Re-researching an unchanged idea is the whole cost.
//
// THE SHIP: a `text_updated_at` column that a BEFORE UPDATE trigger moves only when `text` itself
// changes, the 41 window rows re-stamped to their own `created_at`, and the playbook's rule pointed
// at the new column. `updated_at` keeps its meaning -- any edit -- and is never written by this
// ship, which is why no existing value changes and no before-image is owed.
//
// WHAT EACH ARM CAN PROVE ALONE:
//
//   1 (OFFLINE, zero network). THE SOURCE. The migration file still carries the three lines that
//     ARE the mechanism -- the text-changed guard, the grant revoke by name, and the gate's own
//     want-string -- and the playbook's PROMPT BLOCK (not the file: the file's prose outside the
//     markers discusses the column too, and the routine copies only the block) names the new column
//     in its column list, selects on it, and no longer selects on `updated_at`.
//
//   2 (OFFLINE). BOTH WAYS. Arm 1 is re-run against a block with the one sentence put back to
//     `older than updated_at`, and must FAIL with the named check -- so arm 1 is proven to be
//     reading that sentence rather than passing on anything that happens to be in the file.
//
//   3 (LIVE, read-only). THE COLUMN AND THE DUE SETS. The migration is recorded under its own name;
//     every one of the 62 rows has a non-null `text_updated_at`; and the two filters are compared on
//     the same rows: every row the NEW filter calls due is also due under the OLD one (the ship
//     narrows, it never invents work), and at least one row is due under the OLD filter and not the
//     NEW one (the ship actually narrows -- without this the arm would pass on a column that merely
//     copied `updated_at`). On `origin/dev` the column does not exist and the read is a 400.
//
// NO FIXTURE WRITES ANYWHERE (pattern:76): arm 3 is a read and an RPC that reads. The trigger's own
// both-ways proof -- a tag edit leaves `text_updated_at` alone, a text edit moves it -- is INSIDE the
// database, in the migration's trailing gate, which inserts its fixture, asserts t/f/t/0/0, rolls the
// fixture back inside the same transaction and raises if any of the five is wrong. A suite that
// re-ran that proof would have to write to John's private Napkin on every nightly run.
//
// THE COLUMN THIS TEST NEVER READS: `text`. The Napkin is John's private table (anon and
// authenticated hold zero privileges on it, measured this session) and the ideas themselves are not
// this test's business -- the timestamps are.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
// THE BLOCK IS EXTRACTED BY THE SCRIPT THAT OWNS THE CONVENTION, never by a second extractor here
// (pattern:14; agt-138-researcher-routine.test.mjs and agt-470-recheck-writer.test.mjs reach for the
// same two exports). The markers are each MENTIONED in the file's own prose table above the block, so
// a naive indexOf of the begin marker lands on the mention and slices a block that holds nothing.
// `extractBlock` refuses unless each marker is a whole line exactly once.
import { extractBlock, ROUTINES } from "../../scripts/check-routine-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLAYBOOK_REL = "docs/runbooks/researcher-routine.md";
const MIGRATION_REL = "docs/design/agt-577-napkin-text-updated-at.sql";

// The migration recorded by T4, and the migration that was the head of `schema_migrations` before it.
const UP = "agt577_napkin_text_updated_at";
const PREV = "20261110140629";

// The three lines of the migration that ARE the mechanism. Held as bytes: the text-changed guard (a
// trigger that fired on every update would re-open an idea on a tag edit, which is the defect), the
// revoke BY NAME (this project's `pg_default_acl` grants EXECUTE to anon and authenticated by name
// the instant a function is created, so a `revoke ... from public` alone leaves it open --
// .claude/rules/supabase-column-grants.md's 2026-09-02 addendum), and the gate's want-string, which
// is the only place the five assertions' expected shape is written down.
const MECHANISM_LINES = [
  "if new.text is distinct from old.text then",
  "from public, anon, authenticated;",
  "want t/f/t/0/0",
];

// The playbook's rule, after and before. The OLD form is held here so arm 1 can refuse a block that
// still carries it -- a block that selected on both columns would be no narrower than before.
const NEW_RULE = "older than text_updated_at, excluding";
const OLD_RULE = "older than updated_at";
const NEW_COLUMN_LIST = "category, tags, archived, created_at";

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

function promptBlock(src) {
  const r = ROUTINES.researcher;
  assert.ok(r && r.file === "researcher-routine.md",
    "check-routine-prompt.js must still know a `researcher` routine pointing at researcher-routine.md");
  return extractBlock(src, r).text;
}

// ---------------------------------------------------------------------------------------------
// Arm 1 -- OFFLINE. The source. Factored as a function of its two inputs so arm 2 can re-run it
// against a reverted block; every assertion names the check that failed, so arm 2 can assert WHICH
// one fired rather than merely that something did (the LOO-013 lesson).
// ---------------------------------------------------------------------------------------------

export function checkSource(sql, block) {
  for (const line of MECHANISM_LINES) {
    const n = sql.split(line).length - 1;
    assert.equal(n, 1,
      `check migration-line: ${MIGRATION_REL} carries ${JSON.stringify(line)} ${n} times, not once ` +
      "-- that line is the mechanism, and a second copy means the file was edited around it");
  }

  const nNew = block.split(NEW_RULE).length - 1;
  assert.equal(nNew, 1,
    `check block-selects-new-column: the prompt block carries ${JSON.stringify(NEW_RULE)} ${nNew} ` +
    "times, not once -- the routine copies the block, so a rule outside it never reaches the Researcher");

  assert.ok(block.includes(NEW_COLUMN_LIST),
    `check block-column-list: the prompt block's column list does not carry ${JSON.stringify(NEW_COLUMN_LIST)} ` +
    "-- the Researcher is told which columns the Napkin has, and text_updated_at is now one of them");

  assert.ok(!block.includes(OLD_RULE),
    `check block-drops-old-column: the prompt block still selects on ${JSON.stringify(OLD_RULE)} ` +
    "-- a tagging pass moves updated_at, so a block that still reads it is exactly as wide as before the ship");
}

// ---------------------------------------------------------------------------------------------
// transport (agt-470-recheck-writer.test.mjs's shape, column for column)
// ---------------------------------------------------------------------------------------------

async function req(url, key, q, { method = "GET", body } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}

const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 300)}`;

// ---------------------------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------------------------

export default async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  const sql = read(MIGRATION_REL);
  const block = promptBlock(read(PLAYBOOK_REL));

  // ---- 1. THE SOURCE, offline ----------------------------------------------------------------
  await arm("1 the source (offline)", async () => {
    checkSource(sql, block);
    console.log(`    [AGT-577 arm 1] ${MECHANISM_LINES.length}/${MECHANISM_LINES.length} mechanism ` +
      `lines once each in ${MIGRATION_REL}; prompt block ${block.length} B selects on text_updated_at, ` +
      "names it in the column list, and no longer selects on updated_at");
  });

  // ---- 2. BOTH WAYS, offline -----------------------------------------------------------------
  await arm("2 both ways (offline)", async () => {
    const reverted = block.replace("older than text_updated_at", OLD_RULE);
    assert.notEqual(reverted, block,
      "the revert produced a byte-identical block -- arm 2 proved nothing, so arm 1's reading of " +
      "that sentence is unproven");
    assert.throws(() => checkSource(sql, reverted), /check block-selects-new-column/,
      "arm 1 PASSES a prompt block whose rule was put back to `older than updated_at` -- it is " +
      "therefore not reading that sentence, and would pass the defect this ticket exists to fix");
    console.log("    [AGT-577 arm 2] arm 1 fails `check block-selects-new-column` on the reverted block");
  });

  // ---- 3. THE COLUMN AND THE DUE SETS, live and read-only ------------------------------------
  if (!url || !key) {
    notRun("AGT-577 arm 3 (the recorded migration, the seeded column and the two due sets)",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the column, the trigger and the 62 rows are " +
      "in the database, so there is no offline half of any of them (run with " +
      "`node --env-file-if-exists=.env.local tests/regression/run-all.js`)");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }

  await arm("3 the column and the due sets (live, read-only)", async () => {
    // 3a. THE MIGRATION IS RECORDED, under its own name and as the only one past PREV. `p_from` is
    // EXCLUSIVE (measured this session: the same call before the apply returned zero rows while
    // PREV was the head), so exactly one row is the whole assertion -- a second row would mean
    // another migration landed in the same range and this test is no longer reading only this ship.
    const mig = await req(url, key, "rpc/migrations_in_range",
      { method: "POST", body: { p_from: PREV, p_to: "99999999999999" } });
    assert.ok(mig.ok && Array.isArray(mig.json),
      `rpc/migrations_in_range must read as a list; got ${describe(mig)}`);
    assert.equal(mig.json.length, 1,
      `${mig.json.length} migrations are recorded past ${PREV}, not exactly one: ` +
      JSON.stringify(mig.json.map(r => r.name)));
    assert.equal(mig.json[0].name, UP,
      `the one migration past ${PREV} is ${JSON.stringify(mig.json[0].name)}, not ${JSON.stringify(UP)}`);

    // 3b. THE COLUMN, on every row. `text` is NEVER selected: John's ideas are not this test's
    // business. On origin/dev this read is a 400 (the column does not exist), which is arm 3's
    // discriminator -- it cannot go green before T4.
    const rows = await req(url, key, "napkin_ideas?select=id,researched_at,updated_at,text_updated_at");
    assert.ok(rows.ok, `the Napkin must read with the service key; got ${describe(rows)}`);
    assert.equal(rows.status, 200, `the Napkin read must be 200; got ${describe(rows)}`);
    assert.ok(Array.isArray(rows.json) && rows.json.length > 0,
      `the Napkin read returned no rows; got ${describe(rows)}`);
    const nulls = rows.json.filter(r => r.text_updated_at === null || r.text_updated_at === undefined);
    assert.equal(nulls.length, 0,
      `${nulls.length} of ${rows.json.length} Napkin rows have a null text_updated_at -- the column ` +
      "is NOT NULL with a default, so a null row means the seed missed it: " +
      JSON.stringify(nulls.slice(0, 5).map(r => r.id)));

    // 3c. THE TWO FILTERS, over the same rows. Status is deliberately NOT filtered here: the
    // playbook excludes `done` and `parked`, and narrowing the comparison set would hide a row the
    // ship moved in the other direction.
    //
    // THE COMPARISON IS NOT `Date.parse`. These columns carry MICROSECONDS and Date.parse keeps
    // milliseconds, so two values 40 microseconds apart would compare EQUAL and a freed row would
    // read as still due. `norm` instead pins the one wire shape PostgREST emits for timestamptz
    // (UTC, `+00:00`) and pads the fractional part to a fixed width, after which a plain string
    // comparison is exact. A value in any other shape is a failure, not a silent mis-sort.
    const SHAPE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?\+00:00$/;
    const norm = (v, id, col) => {
      const m = SHAPE.exec(String(v));
      assert.ok(m, `${id}.${col} is ${JSON.stringify(v)}, not a UTC +00:00 timestamp -- this arm ` +
        "compares the wire strings, so an unexpected shape must fail rather than mis-sort");
      return `${m[1]}.${(m[2] ?? "").padEnd(6, "0")}`;
    };
    const old = r => r.researched_at === null ||
      norm(r.researched_at, r.id, "researched_at") < norm(r.updated_at, r.id, "updated_at");
    const neu = r => r.researched_at === null ||
      norm(r.researched_at, r.id, "researched_at") < norm(r.text_updated_at, r.id, "text_updated_at");
    const oldDue = rows.json.filter(old);
    const newDue = rows.json.filter(neu);

    // NARROWER, NEVER WIDER. A row due under the new filter and not the old one would be work this
    // ship invented out of a column it just created.
    const invented = newDue.filter(r => !old(r));
    assert.equal(invented.length, 0,
      `${invented.length} rows are due under text_updated_at but NOT under updated_at -- the ship ` +
      "narrows the due set, it never invents work: " + JSON.stringify(invented.slice(0, 5).map(r => r.id)));

    // AND IT ACTUALLY NARROWS. Without this, a text_updated_at that merely copied updated_at on
    // every row would pass every assertion above.
    const freed = oldDue.filter(r => !neu(r));
    assert.ok(freed.length >= 1,
      `the two filters call the same ${oldDue.length} rows due -- text_updated_at is behaving like a ` +
      "copy of updated_at, so no idea was freed and the tagging pass would still re-open the Napkin");

    console.log(`    [AGT-577 arm 3] migration ${UP} recorded past ${PREV}; ${rows.json.length} Napkin ` +
      `rows, 0 null text_updated_at; due under updated_at = ${oldDue.length}, due under ` +
      `text_updated_at = ${newDue.length}, freed = ${freed.length}, invented = ${invented.length}`);
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
