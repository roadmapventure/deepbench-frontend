// DeepBench v7.0.989 | tests/regression/agt-624-ruled-ask-stands.test.mjs | AGT-624
//
// FEATURE: a RULED `skill-edit` ask STANDS until a cycle it has not seen records its fingerprint.
//
// THE DEFECT this pins, measured live on the unedited tree rather than recalled: `promote()` read
// only `answer=is.null` asks as standing, so the moment John ANSWERED an ask the next cycle filed
// the same question again -- 440 answered `runner_card_asks` rows over 15 fingerprints, and
// today's 16 promotions returned 15 `new` / 1 `standing`. With `ruledStandingFrom()` the same 16
// return 1 `new` / 15 `standing`.
//
// THE RULE, and it is derived rather than stored (kickoff D1/D2): a fingerprint's NEWEST answered
// ask stands while EVERY cycle that recorded that fingerprint recorded it at or before that ask's
// `asked_at`. A cycle the ask has not seen is new evidence and files a fresh ask.
//
// WHERE A LAZIER GUARD WOULD PASS VACUOUSLY -- the two wrong fixes are both measured, not imagined:
//   * "any ruled ask stands" goes red on `bbbb` below (ruled at hour 4, then cycle `c4` records it
//     at hour 5 -- that must FILE).
//   * "any later row files" goes red on `cccc` below (ruled at hour 4, then the ALREADY-SEEN cycle
//     `c3` records it again at hour 5 -- a cycle the ask has seen is not new evidence).
// `dddd` has no ask at all and must stay `new`, which is the not-a-mute arm (QA 2).
//
// OFFLINE by construction: pure exports over fixtures plus a source read. No credentials.

import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { ruledStandingFrom, asksToFile, promotionsFrom } from "../../scripts/staff-watch.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WATCH_REL = "scripts/staff-watch.js";
const WATCH_ABS = path.join(HERE, "..", "..", WATCH_REL);

// The kickoff's fixture clock: hour `h` is `2026-11-01T0h:00:00+00:00`.
const h = n => `2026-11-01T0${n}:00:00+00:00`;
const finding = (fingerprint, cycle_id, hour) => ({
  fingerprint,
  agent_id: "designer",
  kind: "gap finding",
  cycle_id,
  detail: "d",
  created_at: h(hour),
});
const ask = (id, target_id, hour) => ({ id, target_id, asked_at: h(hour), answered_at: h(hour + 1) });

// Four fingerprints each recorded by c1@1, c2@2, c3@3 -- all four reach the 3-distinct-cycle bar.
// Then: `bbbb` gets a NEW cycle c4@5 (files), `cccc` gets c3 AGAIN @5 (stands, already seen).
const F = [
  ...["aaaa", "bbbb", "cccc", "dddd"].flatMap(fp => [
    finding(fp, "c1", 1),
    finding(fp, "c2", 2),
    finding(fp, "c3", 3),
  ]),
  finding("bbbb", "c4", 5),
  finding("cccc", "c3", 5),
];

const A_OLD = ask("a-old", "aaaa", 2);
const A_NEW = ask("a-new", "aaaa", 4);
const ASKS = [A_OLD, A_NEW, ask("b1", "bbbb", 4), ask("c1", "cccc", 4)];

// (1) + (2) -- which fingerprints a ruled ask holds, and WHICH ask is named.
function theRuledSetIsTheSeenEveryCycleSet() {
  const R = ruledStandingFrom(ASKS, F);
  assert.deepEqual([...R.keys()].sort(), ["aaaa", "cccc"],
    "a ruled ask stands only while every cycle that recorded the fingerprint recorded it at or before the ask");
  assert.equal(R.get("aaaa").id, "a-new",
    "the NEWEST answered ask is the standing one -- naming `a-old` points John at a superseded thread");

  // Input order must not decide the answer: `order=asked_at.desc` is a convenience, never the rule.
  const rev = ruledStandingFrom([...ASKS].reverse(), F);
  assert.deepEqual([...rev.keys()].sort(), ["aaaa", "cccc"], "reversed asks give the same standing set");
  assert.equal(rev.get("aaaa").id, "a-new", "reversed asks still name `a-new`");
  return R;
}

// (3) -- the discriminator against "any ruled ask stands": `a-old` (hour 2) never saw c3 (hour 3).
function anOlderRuledAskDoesNotStand() {
  const R = ruledStandingFrom([A_OLD], F);
  assert.equal(R.has("aaaa"), false,
    "`a-old` was ruled at hour 2 and c3 recorded at hour 3 -- an unseen cycle is new evidence and files");
  return R.size;
}

// (4) -- empty and absent inputs are 0, never a throw and never a blanket mute.
function emptyInputsAreEmpty() {
  assert.equal(ruledStandingFrom(undefined, undefined).size, 0, "no asks and no findings stands nothing");
  assert.equal(ruledStandingFrom([], F).size, 0, "no answered asks stands nothing");
}

// (5) -- the SHIPPED filing decision over the SHIPPED promotion arithmetic, not a second copy of it.
function theFilingDecisionReadsTheRuledSet(R) {
  const promos = promotionsFrom(F);
  assert.equal(promos.length, 4, "all four fixture fingerprints reach the 3-distinct-cycle bar");

  const byFp = new Map(asksToFile(promos, new Set(R.keys())).map(x => [x.fingerprint, x.action]));
  assert.deepEqual(Object.fromEntries([...byFp.entries()].sort()), {
    aaaa: "standing",   // ruled, every recording cycle seen
    bbbb: "new",        // ruled, then an UNSEEN cycle recorded it
    cccc: "standing",   // ruled, then an ALREADY-SEEN cycle recorded it again
    dddd: "new",        // never ruled, never asked
  }, "the ruled set suppresses exactly two of the four, and the other two still file");

  // NOT A MUTE: with nothing standing, every one of the four files. If this ever goes green while
  // the assertion above is also green, the ruled read has stopped mattering.
  const none = asksToFile(promos, new Set());
  assert.deepEqual(none.map(x => x.action), ["new", "new", "new", "new"],
    "with an empty standing set all four promotions file -- the mechanism is a dedupe, not a mute");

  const standing = [...byFp.values()].filter(a => a === "standing").length;
  return { standing, filed: byFp.size - standing };
}

// (6) -- the shipped bytes, so this file cannot pass against a tree where the wiring was reverted.
function theShippedFileIsWiredToIt() {
  const src = fs.readFileSync(WATCH_ABS, "utf8");
  assert.match(src, /export function ruledStandingFrom\(/, "`ruledStandingFrom` is exported from the shipped script");
  assert.ok(src.includes("answer=not.is.null"), "promote() reads the ANSWERED asks");
  assert.ok(src.includes("answer=is.null&select=id,target_id,asked_at"),
    "the unanswered read (A6) is still present, unedited -- agt-172 pins it");
  assert.ok(src.includes("of ruledStandingFrom(ruled, rows)"),
    "promote() folds the ruled set into `standingAsks` -- an export nothing calls changes no behaviour");
  return src.length;
}

export default async function run() {
  const R = theRuledSetIsTheSeenEveryCycleSet();   // (1) (2)
  const olderSize = anOlderRuledAskDoesNotStand(); // (3)
  emptyInputsAreEmpty();                           // (4)
  const counts = theFilingDecisionReadsTheRuledSet(R); // (5)
  const bytes = theShippedFileIsWiredToIt();       // (6)

  console.log(`  [AGT-624] ruled set {${[...R.keys()].sort().join(", ")}} -> ${counts.standing} standing / `
    + `${counts.filed} new over ${promotionsFrom(F).length} promotions; an older ruled ask stands `
    + `${olderSize} fingerprint(s); ${WATCH_REL} (${bytes} bytes) wires ruledStandingFrom() and keeps the `
    + `agt-172 unanswered read`);
}

selfRun(import.meta.url, run);
