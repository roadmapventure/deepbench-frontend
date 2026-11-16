// DeepBench v7.0.1046 | tests/regression/dat-30-secret-age.test.mjs | DAT-30 -- the stored keys'
// rotation age reaches the brief, in its place, without moving the facts sha and without any read
// of a value.
//
// FEATURE: DAT-30. Measured before this ship: `runner_secrets` held 11 rows, no `rotated_at` and no
// trigger, and the oldest row had not moved since 2026-08-20T03:14:32Z -- 88 days, two days from
// breaching the 90-day cadence this build exists to make visible. The age was readable by hand and
// rendered NOWHERE, so nothing on any surface told John a key was ageing. A stamp nobody displays is
// a column, not a control.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (1) `rows` -- THE TABLE, AND THE DUE DATE AS A REAL BRANCH. The fixture's OLD and EDGE rows are one
//     SECOND apart across the 90-day line on purpose: 90 days exactly is overdue, 89.99 days is `ok`.
//     A render that compared the wrong way, or floored the wrong way, flips exactly one of those two
//     cells -- which is the whole difference between "you are late" and "you are fine". The
//     `rotation_days IS NULL` row is in the same fixture because an address and a username are not
//     keys that rotate, and counting them into the overdue denominator would report a breach that
//     cannot exist. The lead's counts are asserted against the table's own rows so the summary and
//     the body cannot disagree.
//
// (2) `absent` -- ABSENT IS NOT ZERO, asserted as two sentences that must not overlap. "The ledger
//     was not read" and "no key is stored" are opposite facts: the first is a broken render, the
//     second would be a measured zero. The same rule every group in `render-standing-brief.js`
//     keeps, and the same assertion shape `agt-607-stalled-cycles-brief.test.mjs` uses.
//
// (3) `place` -- IT IS IN THE BRIEF, AND IN ITS PLACE: after `**Redesign after refusal**`, before
//     `**Human gates**` (which stays last deliberately, SES-386). Asserting the helper alone would
//     pass against a helper nothing calls, which is precisely the state the column was in. And it is
//     OUTSIDE `factsSha()` (`AGT-281`'s rule for a group that moves on its own): an age advances with
//     the clock, so hashing it would report drift on every single run and `--check` would be ignored
//     inside a day. Asserted with a CONTROL, so the equality cannot pass against a sha of nothing.
//
// (4) `read` -- THE READ NAMES ITS COLUMNS, read out of the source rather than restated. This ticket
//     is secret hygiene: the group's whole claim is that it reports age by NAME and never touches a
//     value, so a `select=*` or a `value` in that projection would defeat the feature while every
//     assertion above still passed. `.claude/rules/supabase-column-grants.md` is the other reason --
//     a star select against a column-list grant is a 403 waiting to happen.
//
// NO CREDENTIALS, no network, no Supabase, no model call, no writes: every assertion below is a pure
// helper driven from fixtures, plus one read-only source grep. NOTHING here reads a secret value.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import * as brief from "../../scripts/render-standing-brief.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_REL = "scripts/render-standing-brief.js";
const Q = "runner_secrets?select=name,rotated_at,rotation_days&order=rotated_at.asc,name.asc";
const VALUE_IN_PROJECTION = /runner_secrets\?select=[^"`]*(\*|value)/;

const NOW = "2026-11-16T16:49:42Z";
const STAMP = brief.asOf(NOW);

// Three rows, NAME and dates only -- a value appears nowhere in this file. OLD and EDGE straddle the
// 90-day line by ONE SECOND; SUPABASE_URL is the row that does not rotate at all.
const F = [
  { name: "SUPABASE_URL", rotated_at: "2026-08-10T00:00:00Z", rotation_days: null },
  { name: "OLD", rotated_at: "2026-08-18T16:49:42Z", rotation_days: 90 },
  { name: "EDGE", rotated_at: "2026-08-18T16:49:43Z", rotation_days: 90 },
];

// agt-607's FACTS() shape, with the key this ticket adds in place of its stalls.
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

export default async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    [arm ${name}] FAIL -- ${e.message.split("\n")[0]}`); }
  };

  // == (1) the rows, the counts, and the due date as a real branch ================================
  await arm("rows", async () => {
    assert.strictEqual(typeof brief.renderSecretAge, "function", "renderSecretAge must be exported");

    const out = brief.renderSecretAge(F, STAMP, NOW);

    assert.ok(out.includes("**Oldest key: 90 days (`OLD`)**, 1 of 2 rotating keys overdue."),
      "the lead must name the oldest ROTATING key with its age in whole days and count the overdue " +
      "against the rotating keys only -- SUPABASE_URL is 98 days old and must not be in that " +
      `denominator, because an address that does not rotate cannot be late. got:\n${out}`);

    assert.ok(out.includes("| 89 | 90 | ok |"),
      "EDGE is one second short of 90 days, so it must floor to 89 and read `ok` -- a render that " +
      `rounded or compared the other way calls a key late a day early. got:\n${out}`);
    assert.ok(out.includes("| 98 | — | does not rotate |"),
      "the NULL-cadence row must print its age and say it does not rotate, never a due date and " +
      `never `+"`overdue`"+` -- it is an address, not a key. got:\n${out}`);

    const overdue = [...out.matchAll(/\*\*overdue\*\*/g)];
    assert.strictEqual(overdue.length, 1,
      `exactly ONE row is overdue (OLD, at 90 days exactly), got ${overdue.length}. A render that ` +
      "marked EDGE too reads as two breaches; one that marked neither hides the real one.\n" + out);

    // CONTROL: the 90-day line is a live comparison, not a constant. The SAME row one second older
    // than EDGE is overdue, and one second younger than OLD is not -- so the two cells above are a
    // statement about `age >= rotation_days` rather than about which name is in the fixture.
    const flipped = brief.renderSecretAge(
      [{ name: "EDGE", rotated_at: "2026-08-18T16:49:41Z", rotation_days: 90 }], STAMP, NOW);
    assert.ok(flipped.includes("**overdue**") && flipped.includes("| 90 | 90 |"),
      `CONTROL: EDGE one second EARLIER must flip to 90 days and **overdue**, got:\n${flipped}`);
    const held = brief.renderSecretAge(
      [{ name: "OLD", rotated_at: "2026-08-18T16:49:43Z", rotation_days: 90 }], STAMP, NOW);
    assert.ok(!held.includes("**overdue**"),
      `CONTROL: OLD one second LATER must stop being overdue, got:\n${held}`);

    assert.ok(out.includes(STAMP), "the group carries the as-of stamp");
  });

  // == (2) absent is not zero ======================================================================
  await arm("absent", async () => {
    const notRead = brief.renderSecretAge(undefined, STAMP, NOW);
    const zero = brief.renderSecretAge([], STAMP, NOW);

    assert.notStrictEqual(notRead, zero,
      "the control is vacuous unless the unread and measured-zero renders really differ");
    assert.ok(/was not read/i.test(notRead), `an unread ledger must SAY it was not read, got:\n${notRead}`);
    assert.ok(!/measured zero/i.test(notRead),
      "an unread ledger must NOT print the measured-zero sentence -- \"the read did not happen\" and " +
      `"no key is stored" are opposite facts and the brief must not blur them. got:\n${notRead}`);

    assert.ok(/measured zero/i.test(zero), `an empty ledger must say so in the words of a measurement, got:\n${zero}`);
    assert.ok(!/was not read/i.test(zero),
      `a measured zero must not also claim the ledger went unread, got:\n${zero}`);

    for (const bad of [null, {}, "", 0]) {
      const out = brief.renderSecretAge(bad, STAMP, NOW);
      assert.ok(/was not read/i.test(out) && !/measured zero/i.test(out),
        `renderSecretAge(${JSON.stringify(bad)}) must take the unread branch, got:\n${out}`);
    }
  });

  // == (3) it is in the brief, in its place, and outside the facts sha =============================
  await arm("place", async () => {
    const block = brief.renderBlock(FACTS(), NOW);
    const at = s => block.indexOf(s);

    assert.ok(at("**Redesign after refusal**") > -1, "renderBlock() must carry the Redesign-after-refusal lead");
    assert.ok(at("**Secret age**") > -1,
      "renderBlock() must carry the Secret age lead. A helper nothing calls is exactly the state the " +
      "stamp would be in -- written on every value change, rendered nowhere.");
    assert.ok(at("**Human gates**") > -1, "renderBlock() must carry the Human gates lead");

    assert.ok(at("**Redesign after refusal**") < at("**Secret age**"),
      "Secret age must come AFTER Redesign after refusal (kickoff T2d)");
    assert.ok(at("**Secret age**") < at("**Human gates**"),
      "and BEFORE Human gates -- Human gates is the LAST group deliberately (SES-386): it is the one " +
      "that says whether anything above it is waiting on a person.");
    assert.ok(at("**Human gates**") < at("*Provenance:"), "and all of it before the provenance line");
    assert.ok(block.includes("| 89 | 90 | ok |"), "the rows reach the assembled block, not just the helper");

    const unread = brief.renderBlock(FACTS({ secrets: undefined }), NOW);
    assert.ok(/\*\*Secret age\*\*/.test(unread) && /was not read/i.test(unread),
      "renderBlock() must still carry the group and say the ledger was not read when secrets is absent");

    assert.strictEqual(brief.factsSha(FACTS()), brief.factsSha(FACTS({ secrets: undefined })),
      "the secret ages must be OUTSIDE factsSha() (AGT-281): an age advances with the clock, so " +
      "hashing it would report drift on every single run and --check would be ignored inside a day");
    assert.strictEqual(brief.factsSha(FACTS({ secrets: [] })), brief.factsSha(FACTS({ secrets: undefined })),
      "and an empty secret ledger hashes the same as an absent one, for the same reason");

    // CONTROL: the sha is not simply blind. A fact that IS in the payload still moves it.
    assert.notStrictEqual(
      brief.factsSha(FACTS({ staff: [{ agent_id: "builder", fingerprint: "f1", cycle_id: "c1" }] })),
      brief.factsSha(FACTS()),
      "CONTROL: a staff finding IS in the payload and must move the sha -- otherwise the equality " +
      "above would pass against a factsSha() that hashes nothing at all");
  });

  // == (4) the read names its columns, out of the source ===========================================
  await arm("read", async () => {
    const src = fs.readFileSync(path.join(ROOT, SOURCE_REL), "utf8");

    assert.strictEqual(src.split(Q).length - 1, 1,
      `${SOURCE_REL} must hold the secret-age read exactly once, by NAME and date columns only: ` +
      `\`${Q}\``);
    assert.ok(!VALUE_IN_PROJECTION.test(src),
      `${SOURCE_REL} must never project \`*\` or \`value\` out of runner_secrets -- this group's whole ` +
      "claim is that it reports age without reading a secret, and a star select against a column-list " +
      "grant is a 403 waiting to happen (.claude/rules/supabase-column-grants.md)");

    // CONTROL: the projection clause can see a value when one is there.
    assert.ok(VALUE_IN_PROJECTION.test('await rest(url, key, "runner_secrets?select=name,value");'),
      "CONTROL: the projection regex must fire on a read that does ask for the value -- otherwise the " +
      "clause above passes against any file at all");
    assert.ok(VALUE_IN_PROJECTION.test('await rest(url, key, "runner_secrets?select=*");'),
      "CONTROL: and on a star select");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);

  console.log("  [DAT-30] renderSecretAge() prints every stored key by NAME with its whole-day age, " +
    "counts 1 of 2 rotating keys overdue across a one-second 90-day boundary that flips both ways " +
    "under control, leaves the no-cadence row out of that denominator, says \"was not read\" without " +
    "saying \"measured zero\", lands in renderBlock() between Redesign after refusal and Human gates " +
    "while factsSha() stays equal with and without it and a staff finding still moves it, and the " +
    "source's one runner_secrets read names its columns with no `*` and no `value` -- each clause " +
    "with a control that flips it.");
}

selfRun(import.meta.url, run);
