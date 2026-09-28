// DeepBench v7.0.687 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-166 slice 4 -- NEW PART
// O: A JUDGED REFUSAL IS A REMOVAL PROPOSAL, and an UNJUDGED night stamps nothing. Part G proved the
// CONFIRMED half of the drain end to end; the refused half had no exit to prove -- a refusal filed a
// `ticket_owner_findings` row that nothing could rule (AGT-169 rules checks, never rows), so the row
// was re-filed nightly and stayed in the population forever. Part O drives the other half: pure, a
// refused premise carries the judge's own reason as its proposal while a refused CLAIM fix carries
// none, and 25 stamps + 1 claim clear plan as 1 write unjudged and 26 judged; live, ZZTO-795 is born
// before the fence, refused, and comes back reading `removal proposed` under its OWN
// `removal-proposal` decision with one full-row image, zero ledger rows, and one Reverse that returns
// it to the drain. On 1ae77169 the live arm cannot even run: `planWrites` returns no `proposals`.
//
// Three arms already in this file MOVED with the contract rather than around it, and each movement is
// now an assertion in its own right: A2 (viii)'s carried rows CLEAR instead of being touched (the slug
// files no ledger row any more), A2 (ix)'s unread premise files nothing, and F's
// `["QA-79-02", "unrevalidated-30d"]` insert is gone. Every planWrites call that means a judged night
// now says `judged` -- which is the point of the flag: the ones that do not, do not stamp.
//
// DeepBench v7.0.675 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-166 slice 2 defect --
// PART G NOW STAMPS A ROW, so the read-back runs over a real timestamptz round trip. ZZTO-794 gains
// a `premises` entry, which moves the thirteenth check from `judgment` to `derivable` and gives the
// night a second fix: `revalidated_at` written as `...Z` and read back by PostgREST as `...+00:00`.
// On 8264720b that read-back exits 2 at 794's patch AFTER the write lands -- the exact live failure
// that lost 7 of 14 fixes on the 2026-09-28 night -- so this part is the live half of the v7.0.675
// fix and cannot pass without it. Every count below moves with it: 2 derivable / 4 judgment, four
// ledger rows instead of five (a confirmed premise files nothing, AGT-169), two before-images, and
// reverse_decision restores BOTH rows -- 791's claim and 794's null stamp.
//
// DeepBench v7.0.518 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-79 slice 7 -- NEW PART
// N: THE LIVE CONSTRAINT IS IN LOCKSTEP WITH CHECKS. Slice 1 of SES-385 appended the twelfth slug
// `remainder-stranded` to CHECKS in scripts/ticket-owner.js and never to
// ticket_owner_findings_check_slug_check, which still admitted eleven. Closed rows on the real
// board trip the new check, so the night's single whole-array ledger POST answered 400 / 23514 and
// BOTH arms of step 4e died at `insert findings` -- twice in one night -- with nothing landing.
// The migration widens the constraint; part N is what stops the drift coming back. It feeds the
// TABLE the CODE's own vocabulary -- one array of CHECKS.length rows, `return=representation` --
// and asserts the returned slugs sorted equal `[...CHECKS].sort()` and the count equals
// CHECKS.length. That is the discriminator: a constraint narrower than CHECKS refuses the array
// outright (23514, the exact live failure), and a row quietly dropped fails the count, so neither
// half can pass on a table that has drifted. It sits after the credential gate and before
// `findingsBefore` deliberately -- any failure at the live census aborts main() further down, and
// an arm placed after it would never run. Cleanup is a `finally` DELETE
// plus an asserted zero-count, never an assumed one. `countWhere` is hoisted out of part G for it.
// DeepBench v7.0.512 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-79 slice 6 -- NEW PART
// M: THE UNJUDGED NIGHT SAYS SO. Part L pinned the runbook line that fires the judged night; it
// fired five times, judged nothing, and nothing on the board could tell -- an arithmetic-only
// night's notes were byte-identical to slice 3's. Part M pins the new ` · unjudged` tail with its
// judged control, and the brief's new bullet with THE DISCRIMINATOR: two night ledgers whose
// newest row is unjudged in both, differing only in whether nights 2-4 were judged, must render
// DIFFERENT bytes (streak 1 against streak 4). A renderer reading `run` alone -- every renderer
// before this slice -- renders them identically, which is what makes this arm a measurement.
// Absent `nights` renders "not read", never a streak of 0. Source-only, no credentials.
//
// DeepBench v7.0.643 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-166 slice 2 -- CHECK 13,
// `unrevalidated-30d`, AND THE COUNTS THAT MOVED WITH IT. The census stopped merely COUNTING the open
// rows past the 30-day fence and began draining them, 25 a night, so the fixture's one such row
// (QA-79-02) now files a finding where it used to file only a number: 12 findings / 8 judgment become
// 13 / 9, thirteen rendered lines become fourteen, part F's ledger gains one insert and part G's live
// four-row board gains ZZTO-794's. Those are the SAME rows classified by one more check, not a
// re-classification -- every other id in every list above is unchanged, which is what the pins prove.
//
// NEW PART A2 is where the check is actually discriminated: thirty hand-built rows past the fence,
// then the four arms that can tell a drain from a stamp -- 25 of 30 ruled and no more; three carried
// rows costing the batch none of its slots; a batch row whose premise was never read landing JUDGMENT
// with no `fix`; and the same thirty handed over BACKWARDS yielding the same 25 in the same order.
// Part B pins `CHECKS.length === 13` and `CHECKS[12]`, which ship in lockstep with the live CHECK
// constraint part N feeds: a slug appended here without docs/design/agt-166-unrevalidated-slug.sql
// reddens part N, because applyPlan POSTs the night's findings as ONE array (SES-418).
//
// DeepBench v7.0.524 | tests/regression/agt-79-ticket-owner.test.mjs | SES-385 slice 3 -- CHECK 12
// NOW READS THE RECORD, NOT THE CYCLE COUNT, and this fixture moved with it rather than around it.
// Slice 1 fired the check on `actual_cycles < predicted_cycles`; measured live that proxy filed 88
// findings of which only 5 were real, so it is deleted and check 12 asks slice 2's decideStatus()
// over the closed row's OWN kickoff text plus its undecided `gated_before_build` card. The fixture
// therefore gains a `kickoffs` sibling of `items` -- the board shape readBoard() now returns -- and
// QA-79-04 gains a `kickoff_link` and one entry whose STOP LINE says `partial`. QA-79-04 stays the
// single stranded row under the NEW trigger, so every count below is UNCHANGED at 12 findings /
// 8 judgment, thirteen rendered lines and the same ledger inserts: this file pins that the
// re-triggering did not move the rest of the census. Its `design_status` is null, so check 8 is
// untouched by the new link. `CHECKS.length === 12` / `CHECKS[11] === "remainder-stranded"` stand.
// Discrimination of the new trigger itself lives in
// tests/regression/ses-385-remainder-stranded.test.mjs.
// DeepBench v7.0.505 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-79 slice 5 -- NEW PART
// L: THE RUNBOOK'S STEP 4e NOW FIRES THE JUDGED NIGHT. Slice 4 shipped the judgment pass and the
// seed landed, so pass one exits 3 (part K live prints `gate answered 3`) -- and yet no night had
// ever been judged, because step 4e still read `--nightly` alone. Part L reads the SHIPPED runbook
// and pins the command, the exit-0 precondition, the three facts the ceremony must carry
// (ticketowner, the judgment lane, --answer=), the never-a-wall fallback, the SES-336 byte ceiling
// and the card's own line. Its control is the renderer run WITHOUT --write: the card records the
// runbook's sha256, so exit 0 is the arm that fails if the runbook were edited and the generated
// card left stale. Part I's slice-4 negative (`!body4e.includes("--judge")`) is RETIRED by this
// same slice rather than weakened, and its two command substrings follow the new line.
// DeepBench v7.0.485 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-70 -- THE LIVE
// DELIVERED-UNACCEPTED ARM ASSUMED BOARD STATE. It asserted at least four delivered-unaccepted
// rows, which is not a property of the census -- it is a property of how many tickets John has
// left unaccepted that day. He accepted 22 on 2026-09-14 and the board fell to 2, so a correct
// census reading a healthy board turned the suite red. The arm now DECLARES ITSELF NOT RUN with
// the live count when the board holds fewer than four, instead of asserting -- the SES-180 shape:
// a part that could not be exercised says so rather than counting as a pass or a failure. The
// fixture arms are untouched, and they are where this check is actually pinned: the fourteen-row
// fixture drives delivered-unaccepted with its own control (wind `now` back an hour and it must
// empty), so the discriminating half of this check does not depend on the live board at all.
// DeepBench v7.0.480 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-79 slices 1-4 -- THE
// TICKET OWNER'S CENSUS, WRITE PASS, NIGHTLY LANDING AND JUDGMENT PASS, pinned at the level that
// can actually go red.
//
// WHY EVERY ARM CARRIES A CONTROL. Eleven of the twelve checks produce a SHORT list on a healthy
// board, and the failure mode of a census is not a wrong list -- it is an EMPTY one. A check that
// silently stopped firing, a fence that swallowed every row, a sort that dropped ties: each of
// those reads as "nothing to report," which is exactly what a clean night looks like. So every
// arm below that could pass vacuously is paired with a mutation of the fourteen-row fixture that
// must flip it: move QA-79-02 past its fences and the two fence checks must GAIN rows; add
// cyc-dead to the open cycles and claim-expired must LOSE its only row; wind `now` back an hour
// and delivered-unaccepted must empty while claim-expired does not. A green here means the checks
// discriminate, not merely that they ran.
//
// (A) THE CLASSIFICATION, over the fixture's one-variable rows. Counts, per-check id lists, the
// exact fix objects, the behind-the-fence counts and the sort. The fix objects are compared whole
// rather than key-by-key: a fix IS the write statement slice 2 will issue, so an extra or missing
// key in it is a different write.
//
// (B) THE RENDER AND THE CONSTANTS. Byte-stability (the nightly report is diffed night over
// night), the twelve lines that must print even at zero, and the four constants the whole census
// hangs off -- a FENCES typo would quietly reclassify hundreds of rows in either direction.
//
// (C) THE CLI, SPAWNED WITH THE CREDENTIALS DELETED. The fixture path must run with no creds at
// all (that is what makes this test runnable in a clean checkout), --census with none must exit 2
// naming the variable, and --apply must be REFUSED rather than ignored: this slice writes nothing,
// and a flag that is silently dropped is how a write pass gets invoked by accident.
//
// (D) THE SEED FILE, which is written and never applied. Rule #1 (no Skill text names another
// agent) is asserted with its own control -- the regex is proven to match when a name IS present,
// so a passing grep means the file is clean rather than the pattern being broken.
//
// (E) LIVE, and it asserts what the CENSUS alone does: it read the real board and changed nothing
// on its own. Declared notRun without credentials rather than skipped silently.
//
// (F) THE PLAN, PURE. planWrites() is where a census becomes a set of writes, so every list it
// produces is pinned by identity, not by length: which rows get patched, which findings are new,
// which are re-seen, which are cleared. Its two controls are the ones that can silently invert --
// an empty board must CLEAR the whole open ledger (not leave it alone), and a prior row matching
// tonight must move from `insert` to `reseen` (not appear in both). Plus the two arguments that
// must refuse before touching the network: a fix with no primary key, and an attribution that
// names both a cycle and a session or neither.
//
// (G) LIVE, WRITTEN, AND ROLLED BACK. Four ZZTO-79* fixture rows are inserted into the real
// backlog_items, censused, planned, applied, asserted, reversed through the real
// reverse_decision(), and deleted in a finally. This is the only arm that can prove the property
// the whole slice exists for: that one decision id puts every cell back. It asserts the FULL-row
// image (title present, not just the changed column), updated_at UNCHANGED by the patch (SES-316 --
// a bumped stamp makes reverse_decision() refuse the row), the null-row images that stand for the
// findings the night invented, and a second night over the same board writing nothing but a
// last_seen_at touch. The cleanup is unconditional; the four zero-row counts are asserted after it.
//
// (H) THE STANDING BRIEF'S HYGIENE GROUP, pure, plus the doc it lands on. Its two controls are the
// pair that look alike and mean opposite things -- an unread ledger and a measured zero -- and the
// sha arm pins the one movement that must NOT count as drift: a re-seen touch on a gap John has
// already read about.
//
// (I) STEP 4e AND THE CARD IT GENERATES, from source, with the renderer's own refusal as the
// control. The card is a generated view held byte-identical, so this arm is what turns "I edited
// the runbook" into "the runbook, the NOTES entry and the regenerated card shipped together."
//
// (J) THE NIGHTLY, pure plus the CLI's three refusals. Both DST boundaries are pinned by instant
// (05:00Z in September, 06:00Z in January): a Chicago night cannot be measured with an offset, and
// an arm that only tested one season would pass for six months. H, I and J are all pure or
// source-only, so they run BEFORE part E's credential gate returns -- a clean checkout still
// exercises them.
//
// (O) THE REFUSED HALF OF THE DRAIN (slice 4), pure and then live on one fixture row: a refusal
// becomes a removal proposal with its own decision and image, files no ledger row, stamps nothing,
// and reverses in one call. Its controls are the two directions that must NOT propose -- a refused
// arithmetic fix and an unconfirmed premise -- plus the unjudged/judged pair over one census.
//
// (K) THE JUDGMENT PASS (slice 4), and its whole subject is what the code does with an answer it
// did not write. The merge is driven by the real fixture answer and then by TEN mutations of it,
// each of which must be REFUSED BY NAME -- a window from another night, a fix naming a judgment
// finding, a fix naming a ticket that is not on this board, a sentence about a fix the answer
// confirmed, a duplicate, an over-long reason, a non-boolean apply, an empty detail, a missing
// required key, and an array that is not an array. Without the mutations the accept arm proves
// only that a valid answer is accepted, which is the half that cannot silently invert.
//
// Its control is the one that decides the safety property: remove ONE fix from the answer and the
// finding it named must become a JUDGMENT finding with no `fix` -- not stay derivable, and not
// quietly get written anyway. Silence is not consent, and an ingest that failed open would read
// green on every other arm here.
//
// The gate arm is LIVE and branches on the row rather than asserting one outcome, because this
// half shipped AHEAD of its seed: with no `audit-board` capability row the command must exit 2
// having printed nothing and written no state file, and once John applies the seed the SAME
// command must exit 3. Either way the four write-table counts are equal before and after -- pass
// one never writes a row, and that is the property the arm actually exists to pin.

import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  classifyBoard, renderCensus, planWrites, applyPlan, CHECKS, TYPE_TAXONOMY, TYPE_MAP, FENCES,
  censusLine, sameChicagoDay, nightlyNotes, NIGHTLY_PREFIX,
  chicagoDay, judgeTask, ingestJudgment, statePathFor, EXIT_AWAITING_ANSWER,
  selectRevalidationBatch, premiseDetail, UNREVALIDATED_BATCH, PREMISE_EXCERPT, REVALIDATION_CHECK,
  REFUSED_PREFIX, PROPOSAL_KIND,
} from "../../scripts/ticket-owner.js";
import { SERVICE_CATALOG } from "../../shared/ai-patterns.js";
import { renderTicketHygiene, factsSha, cst, BEGIN, END, HYGIENE_NIGHTS_READ } from "../../scripts/render-standing-brief.js";
import { parseSteps, render, NOTES, CARD_REL, RUNBOOK_REL } from "../../scripts/render-cycle-card.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = "scripts/ticket-owner.js";
const FIXTURE_REL = "tests/fixtures/agt-79/board.json";
const SEED_REL = "docs/design/agt-79-ticket-owner-seed.sql";

const F = JSON.parse(fs.readFileSync(path.join(ROOT, FIXTURE_REL), "utf8"));

const clone = v => JSON.parse(JSON.stringify(v));
// AGT-169: EVERY ARM IN THIS FILE GRADES THE THIRTEEN CHECKS WITH NONE OF THEM RETIRED, and says
// so explicitly rather than by accident. `classifyBoard` now defaults its retirement set to
// `retiredChecks(board.ownerRulings)`, which retires `actual-unknown` by the Designer's standing
// call — so a fixture arm that took the default would silently lose a check's coverage the day the
// ruler shipped. Passing an empty Map is this file's one-variable discipline applied to the new
// input: the retirement path itself is graded end to end, defaults included, in
// tests/regression/agt-169-findings-ruler.test.mjs.
const NO_RETIREMENT = new Map();
const run = (over = {}) => classifyBoard(over.board ?? F.board, { now: over.now ?? F.now, rate: over.rate ?? F.rate, retired: over.retired ?? NO_RETIREMENT });
const byCheck = (r, c) => r.findings.filter(f => f.check === c).map(f => f.backlog_id).sort();
const only = (r, id, c) => r.findings.find(f => f.backlog_id === id && f.check === c);

// A fixture copy with one row patched -- the one-variable discipline the fixture itself is built on.
function boardWith(id, patch) {
  const b = clone(F.board);
  const row = b.items.find(i => i.backlog_id === id);
  assert.ok(row, `fixture has no row ${id}`);
  Object.assign(row, patch);
  return b;
}

function spawnCli(args, { withCreds = false } = {}) {
  const env = { ...process.env };
  if (!withCreds) { delete env.SUPABASE_URL; delete env.SUPABASE_SERVICE_KEY; }
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env, encoding: "utf8" });
}

async function restCount(base, key, table) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${table}?select=id`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  assert.ok(res.ok, `counting ${table} returned HTTP ${res.status} ${res.statusText}`);
  await res.text();
  const range = res.headers.get("content-range") || "";
  const total = Number(range.split("/")[1]);
  assert.ok(Number.isFinite(total), `could not read a count for ${table} from content-range "${range}"`);
  return total;
}

async function main() {
  // --- A: the census, pure --------------------------------------------------------------------
  const r = run({});

  assert.deepStrictEqual(r.counts, { rows: 14, findings: 13, derivable: 4, judgment: 9 },
    "the fourteen-row fixture must classify to exactly 13 findings, 4 derivable");

  const expected = {
    "quote-missing": ["QA-79-01"],
    "size-missing": [],
    "cost-snapshot-missing": ["QA-79-03"],
    "actual-unknown": ["QA-79-04"],
    "claim-on-closed": ["QA-79-05"],
    "claim-expired": ["QA-79-07"],
    "verdict-missing": ["QA-79-08"],
    "designed-closed": ["QA-79-14"],
    "type-off-taxonomy": ["QA-79-12", "QA-79-13"],
    "delivered-unaccepted": ["QA-79-10"],
    "cycles-over-quote": ["QA-79-14"],
    // SES-385 slice 3's check 12: QA-79-04 is `done` and the `kickoffs` entry for its own
    // kickoff_link carries a STOP LINE naming `partial` -- the record itself says work is left.
    // No other fixture row has kickoff text that decideStatus() calls `partial` (QA-79-14 has a
    // link but no entry, so it reads ""), and the fixture carries no undecided
    // gated_before_build card at all, so this list is the same one row it was under slice 1's
    // deleted cycles proxy -- by a different, non-overlapping trigger.
    "remainder-stranded": ["QA-79-04"],
    // AGT-166 slice 2's thirteenth check: QA-79-02 is the fixture's one open row past the 30-day
    // fence with `revalidated_at` null, so it is the whole population and rank 1 of tonight's batch.
    // It is JUDGMENT and not derivable here because the fixture board carries no `premises` entry --
    // a row whose premise text was never read must never be stamped as re-read. The premises-present
    // arm is (vii) below.
    "unrevalidated-30d": ["QA-79-02"],
  };
  for (const check of CHECKS) {
    assert.deepStrictEqual(byCheck(r, check), expected[check], `${check} did not find exactly its fixture rows`);
  }

  // A fix is the write slice 2 will issue -- compared whole, keys included.
  assert.deepStrictEqual(only(r, "QA-79-03", "cost-snapshot-missing").fix, {
    cost_cycles_snapshot: 2,
    cost_pct_snapshot: 1,
    cost_snapshot_rate: 0.5,
    cost_snapshot_at: "2026-09-13T02:00:00.000Z",
  }, "the cost fix must carry all four columns, the rate it used and the instant it measured");
  assert.deepStrictEqual(only(r, "QA-79-05", "claim-on-closed").fix, { claimed_by: null, claimed_at: null });
  assert.deepStrictEqual(only(r, "QA-79-07", "claim-expired").fix, { claimed_by: null, claimed_at: null });
  assert.deepStrictEqual(only(r, "QA-79-12", "type-off-taxonomy").fix, { type: "Feature" });

  const off13 = only(r, "QA-79-13", "type-off-taxonomy");
  assert.strictEqual(off13.verdict, "judgment", "a null type is a classification, never a derivable fix");
  assert.ok(!("fix" in off13), "a judgment finding must carry no fix key at all, not an empty one");

  assert.deepStrictEqual(r.backlog, {
    quote_prefence: 1, size_prefence: 1, cost_prefence: 1,
    verdict_prefence: 1, unrevalidated_30d: 1, attended_actual_null: 2,
    unrevalidated_batch: 1, unrevalidated_carried: 0,
    // AGT-169: the retirement counter is part of the backlog block now, and empty under
    // NO_RETIREMENT. Asserted whole rather than key by key -- an unexpected key here is a check
    // that stopped filing without anyone saying so.
    retired: {},
  }, "rows behind a fence are counted, never flagged");

  for (const f of r.findings) {
    assert.ok(typeof f.detail === "string" && f.detail.length > 0, `${f.backlog_id}/${f.check} has no detail sentence`);
  }

  const sortKey = f => [CHECKS.indexOf(f.check), f.backlog_id];
  for (let i = 1; i < r.findings.length; i++) {
    const [pc, pb] = sortKey(r.findings[i - 1]);
    const [cc, cb] = sortKey(r.findings[i]);
    assert.ok(pc < cc || (pc === cc && pb <= cb), `findings are out of order at index ${i}`);
  }

  // (i) CONTROL -- move QA-79-02 past both fences: the two fence checks must GAIN it and the
  // prefence counts must empty. Without this arm, a fence that swallowed everything reads green.
  const i1 = run({ board: boardWith("QA-79-02", { filed_at: "2026-09-10T00:00:00+00:00", created_at: "2026-09-10T00:00:00+00:00" }) });
  assert.deepStrictEqual(byCheck(i1, "quote-missing"), ["QA-79-01", "QA-79-02"]);
  assert.deepStrictEqual(byCheck(i1, "size-missing"), ["QA-79-02"]);
  assert.strictEqual(i1.backlog.quote_prefence, 0);
  assert.strictEqual(i1.backlog.size_prefence, 0);
  assert.strictEqual(i1.backlog.unrevalidated_30d, 0);
  // AGT-166: the same move empties the drain, and the thirteenth check must stop firing with it --
  // a check that kept flagging a row the population no longer holds would stamp a fresh ticket.
  assert.deepStrictEqual(byCheck(i1, "unrevalidated-30d"), []);
  assert.strictEqual(i1.backlog.unrevalidated_batch, 0);

  // (ii) CONTROL -- the dead cycle is actually open after all: the claim is live, not expired.
  const i2Board = clone(F.board);
  i2Board.openCycles.push({ id: "cyc-dead" });
  const i2 = run({ board: i2Board });
  assert.deepStrictEqual(byCheck(i2, "claim-expired"), [], "a claim held by an OPEN cycle is not expired");
  assert.strictEqual(i2.counts.derivable, 3);

  // (iii) CONTROL -- one hour earlier: the 48 h window closes, the 24 h one does not.
  const i3 = run({ now: "2026-09-12T23:00:00Z" });
  assert.deepStrictEqual(byCheck(i3, "delivered-unaccepted"), [], "delivered 47 h ago is not yet unaccepted");
  assert.deepStrictEqual(byCheck(i3, "claim-expired"), ["QA-79-07"], "the expired claim must survive the clock change");

  // (iv) CONTROL -- the live rate: the cost arithmetic is the rate's, not a constant.
  const i4 = run({ rate: 0.444444444444444 });
  assert.strictEqual(only(i4, "QA-79-03", "cost-snapshot-missing").fix.cost_pct_snapshot, 0.89);

  // (v) CONTROL -- withdraw the Accept: the accepted row joins the unaccepted list.
  const i5Board = clone(F.board);
  i5Board.accepts = [];
  assert.deepStrictEqual(byCheck(run({ board: i5Board }), "delivered-unaccepted"), ["QA-79-10", "QA-79-11"]);

  // (vi) CONTROL -- reopen the closed claim-holder: it moves from claim-on-closed to claim-expired.
  const i6 = run({ board: boardWith("QA-79-05", { status: "open" }) });
  assert.deepStrictEqual(byCheck(i6, "claim-on-closed"), []);
  assert.deepStrictEqual(byCheck(i6, "claim-expired"), ["QA-79-05", "QA-79-07"]);

  // --- A2: the revalidation drain, pure (AGT-166 slice 2, arm (b)) ------------------------------
  // THIRTY hand-built rows, all open, all `revalidated_at` null, all born well past the 30-day
  // fence, and NOTHING else wrong with any of them -- a quote, a size stamp, a taxonomy type and no
  // claim, so the thirteenth check is the only one that can fire and every count below is its own.
  // Born dates come in PAIRS so the (born, backlog_id) tiebreak is exercised fifteen times rather
  // than asserted: a sort on `born` alone leaves same-day rows in the read's order, and two runs of
  // one night would then judge two different sets.
  const NOW166 = "2026-09-27T00:00:00.000Z";
  const pad2 = n => String(n).padStart(2, "0");
  const drainRow = n => ({
    id: `00000000-0000-4000-8000-1660000000${pad2(n)}`,
    backlog_id: `ZQTO-${pad2(n)}`,
    status: "open", type: "Tooling", tier: "later",
    claimed_by: null, claimed_at: null, predicted_cycles: 1, size_stamp: "S",
    design_status: null, kickoff_link: null,
    cost_pct_snapshot: null, cost_cycles_snapshot: null, revalidated_at: null,
    filed_at: `2026-07-${pad2(Math.ceil(n / 2))}T00:00:00+00:00`,
    created_at: `2026-07-${pad2(Math.ceil(n / 2))}T00:00:00+00:00`,
    updated_at: `2026-07-${pad2(Math.ceil(n / 2))}T00:00:00+00:00`,
    actual_tokens_attended: 1,
  });
  const DRAIN = Array.from({ length: 30 }, (_, i) => drainRow(i + 1));
  const LONG = `A premise long enough to be cut. ${"filler ".repeat(120)}TAIL-AFTER-THE-CUT`;
  const drainPremise = n => ({
    backlog_id: `ZQTO-${pad2(n)}`,
    title: `ZQTO fixture premise ${pad2(n)}`,
    // ZQTO-30 is on this board (open); ZZQQ-99 is not; ZQTO-01 is the row's OWN id and must be left
    // out of the list although the description names it. All three match the id vocabulary
    // premiseDetail scans for, so a premise naming none of them would prove nothing about the scan.
    description: n === 1 ? `${LONG} ZQTO-01 is blocked on ZQTO-30 and on ZZQQ-99.` : `Premise ${pad2(n)}.`,
    priority_class: "P10 - Tooling",
  });
  const PREMISES = DRAIN.map(row => drainPremise(Number(row.backlog_id.slice(-2))));
  const drainBoard = (over = {}) => ({
    items: DRAIN, matrix: [], verdicts: [], accepts: [], decisions: [], openCycles: [],
    ownerFindings: [], premises: PREMISES, ...over,
  });
  const drainRun = (over = {}) => classifyBoard(drainBoard(over), { now: NOW166, rate: 0.5, retired: NO_RETIREMENT });
  const slug166 = res => res.findings.filter(f => f.check === REVALIDATION_CHECK);

  // (vii) THIRTY PAST THE FENCE, NONE CARRIED -> exactly 25 derivable and 0 judgment. The whole
  // population is reported; only 25 of it is ruled.
  const d1 = drainRun();
  assert.strictEqual(slug166(d1).filter(f => f.verdict === "derivable").length, 25,
    "thirty unrevalidated rows with their premises read must yield exactly one night's 25 rulings");
  assert.strictEqual(slug166(d1).filter(f => f.verdict === "judgment").length, 0,
    "a premise that WAS read is the judge's to rule, never filed as a question");
  assert.deepStrictEqual(d1.counts, { rows: 30, findings: 25, derivable: 25, judgment: 0 },
    "no other check may fire on these rows — a count here that is not 25 is another check leaking in");
  assert.strictEqual(d1.backlog.unrevalidated_30d, 30, "the census reports the WHOLE population, never tonight's bite");
  assert.strictEqual(d1.backlog.unrevalidated_batch, 25);
  assert.strictEqual(d1.backlog.unrevalidated_carried, 0);
  // AGT-169 appended the retirement counts after the drain's depth; with NO_RETIREMENT in force
  // they read zero, which is itself the assertion that an explicit empty set retires nothing.
  assert.ok(censusLine(d1).endsWith(" · revalidation 30 left (batch 25, carried 0) · retired 0 checks / 0 rows"),
    `the census line must carry the drain's depth; got: ${censusLine(d1).slice(-90)}`);

  // OLDEST FIRST, and the whole ordered list is asserted rather than its first element.
  assert.deepStrictEqual(slug166(d1).map(f => f.backlog_id),
    Array.from({ length: 25 }, (_, i) => `ZQTO-${pad2(i + 1)}`),
    "the batch is the twenty-five OLDEST rows, in (born, backlog_id) order");

  // The fix is the write and nothing more: `revalidated_at` alone, at the census's own instant.
  for (const f of slug166(d1)) {
    assert.deepStrictEqual(f.fix, { revalidated_at: NOW166 },
      `${f.backlog_id} must fix exactly revalidated_at — never status, never updated_at (SES-316)`);
  }

  // AGT-169, THE HARD CONSTRAINT: a confirmed premise files NO ledger row. 259 open findings over 10
  // slugs already sit unruled, so a drain that filed one row per judged premise would add 438 more.
  // AGT-166 slice 4: `judged` is now what buys the right to stamp. These 25 rulings are a JUDGED
  // night's, so the flag is passed; the unjudged direction is the next two lines and (H) in
  // agt-166-board-burn-down.test.mjs.
  const d1plan = planWrites(d1, [], DRAIN, { rate: 0.5, judged: true });
  assert.strictEqual(d1plan.fixes.length, 25, "all 25 rulings are row patches");
  assert.deepStrictEqual(d1plan.ledger.insert, [],
    "a confirmed premise writes the row and files NOTHING — the ledger is for refusals only (AGT-169)");
  assert.deepStrictEqual([...new Set(d1plan.fixes.map(f => f.check))], [REVALIDATION_CHECK]);
  // NO JUDGE, NO STAMP (slice 4, call ii). The SAME census, planned without `judged`: cycle 26d9662f
  // ran `--nightly` alone and planned 25 stamps over premises nobody had read, and only the read-back
  // defect stopped it at one row. The population is still reported; what the night loses is the write.
  const d1unjudged = planWrites(d1, [], DRAIN, { rate: 0.5 });
  assert.deepStrictEqual(d1unjudged.fixes, [],
    "an UNJUDGED night stamps nothing — a premise no capability read may never be recorded as re-read");
  assert.deepStrictEqual(d1unjudged.ledger.insert, [],
    "and it files nothing either: an unjudged night leaves the drain exactly as it found it");
  assert.deepStrictEqual(d1unjudged.proposals, [], "nothing was refused, so nothing is proposed");
  assert.strictEqual(d1.backlog.unrevalidated_batch, 25,
    "the CENSUS still reports tonight's batch whether or not a judge ran — the gate is on the write, never on the count");

  // premiseDetail, on the row built to exercise it: the age, the rank over the population, the cut at
  // PREMISE_EXCERPT, and the LIVE STATUS of every OTHER ticket the premise names — including one the
  // board does not carry, which must say so rather than read as open.
  const det1 = slug166(d1).find(f => f.backlog_id === "ZQTO-01").detail;
  assert.ok(det1.startsWith("open 88 days, never revalidated (born 2026-07-01T00:00:00+00:00) · batch 1/25 of 30 ·"),
    `the detail leads with the age, the rank and the population; got: ${det1.slice(0, 110)}`);
  assert.ok(det1.includes("it names: ZQTO-30 open, ZZQQ-99 not on the board."),
    `every OTHER ticket the premise names arrives with its live status, the absent one saying so; got: ${det1.slice(-200)}`);
  assert.ok(!det1.includes("ZQTO-01 open"),
    "a premise never reports its OWN id's status back to the judge — its description names it, the list must not");
  assert.ok(!det1.includes("TAIL-AFTER-THE-CUT"), "the description is cut at PREMISE_EXCERPT, not carried whole");
  assert.ok(det1.includes(`[cut at ${PREMISE_EXCERPT}]`), "a cut premise says it was cut");
  assert.ok(det1.endsWith("Confirm apply:true only if this premise still names work the board does not show done;" +
    " else apply:false naming the superseding ticket or the evidence it is dead."),
    `the line must close with the contract apply:true asserts; got: ${det1.slice(-80)}`);
  // The CONTROL on the cut: a short premise is carried whole and says nothing about a cut.
  const det2 = slug166(d1).find(f => f.backlog_id === "ZQTO-02").detail;
  assert.ok(det2.includes("premise: Premise 02. · it names: none."),
    `a short premise is carried whole and names nobody; got: ${det2.slice(-120)}`);
  assert.ok(!det2.includes("[cut at"), "the cut control did not fire — every premise reads as cut, so the arm proves nothing");

  // (viii) THREE CARRIED -> 25 derivable + 3 judgment, and the three are OUT of the batch: 25
  // DIFFERENT rows are ruled tonight, so an open removal proposal never costs the drain a slot.
  // AGT-166 slice 4: a carried row's `detail` IS the channel. Two of the three carry a real refusal
  // (`judge refused: <reason>`) and the third carries a detail that does not, which is the control:
  // one replays as a removal proposal, the other must not be proposed at all.
  const CARRIED3 = ["ZQTO-01", "ZQTO-02", "ZQTO-03"].map((backlog_id, i) => ({
    id: `00000000-0000-4000-8000-16600000c0${pad2(i + 1)}`,
    backlog_id, check_slug: REVALIDATION_CHECK, first_seen_at: "2026-09-20T03:00:00+00:00",
    detail: backlog_id === "ZQTO-03"
      ? "a removal proposal for this premise has been open since 2026-09-20T03:00:00+00:00 and is awaiting the Development Manager's ruling; re-filed tonight, never re-judged."
      : `${REFUSED_PREFIX}superseded by ZQTO-99, which shipped the same premise.`,
  }));
  const d2 = drainRun({ ownerFindings: CARRIED3 });
  const d2d = slug166(d2).filter(f => f.verdict === "derivable").map(f => f.backlog_id);
  const d2j = slug166(d2).filter(f => f.verdict === "judgment").map(f => f.backlog_id);
  assert.strictEqual(d2d.length, 25, "three carried rows must not cost the batch three of its 25 slots");
  assert.deepStrictEqual(d2j, ["ZQTO-01", "ZQTO-02", "ZQTO-03"],
    "a row whose removal proposal is still open is re-filed as judgment, never re-judged");
  assert.deepStrictEqual(d2d, Array.from({ length: 25 }, (_, i) => `ZQTO-${pad2(i + 4)}`),
    "the batch slides past the carried rows: 04-28, three of them rows (viii) had no room for");
  assert.ok(d2d.includes("ZQTO-26") && d2d.includes("ZQTO-27") && d2d.includes("ZQTO-28"),
    "25 DIFFERENT rows — the drain moves rather than re-reading the same twenty-five");
  assert.strictEqual(d2.backlog.unrevalidated_carried, 3);
  assert.strictEqual(d2.backlog.unrevalidated_30d, 30, "a carried row is still in the population it has not left");
  for (const f of slug166(d2).filter(f => f.verdict === "judgment")) {
    assert.ok(!("fix" in f), `${f.backlog_id} is carried, so it carries no fix at all`);
    assert.ok(f.detail.includes("open since 2026-09-20T03:00:00+00:00"),
      `a carried finding states how long the proposal has waited; got: ${f.detail}`);
    assert.ok(f.detail.includes("never re-judged"), `got: ${f.detail}`);
  }
  // AGT-166 slice 4: A CARRIED REFUSAL CARRIES ITS PROPOSAL, read back off the ledger detail the
  // judge wrote, with the age the ledger row has held since.
  const p01 = slug166(d2).find(f => f.backlog_id === "ZQTO-01").proposal;
  assert.deepStrictEqual(p01, { reason: "superseded by ZQTO-99, which shipped the same premise.", since: "2026-09-20T03:00:00+00:00" },
    "a carried refusal replays as the proposal the judge already made — the reason is the judge's own words, never re-derived");
  assert.ok(!("proposal" in slug166(d2).find(f => f.backlog_id === "ZQTO-03")),
    "CONTROL: a carried row whose detail is NOT a `judge refused: ` refusal is proposed for nothing — " +
    "the prefix is the channel, and a row without it has no reason to quote");

  // THE WRITE SIDE of the same arm: the three are absent from `fixes`; the two refusals are PROPOSALS;
  // and every carried row CLEARS off the ledger rather than being touched for another night. The slug
  // files no row at all now (call iii), so `clear = prior − tonight` empties it on the first night.
  const d2plan = planWrites(d2, CARRIED3, DRAIN, { rate: 0.5, judged: true });
  assert.strictEqual(d2plan.fixes.length, 25);
  for (const id of ["ZQTO-01", "ZQTO-02", "ZQTO-03"]) {
    assert.ok(!d2plan.fixes.some(f => f.backlog_id === id), `${id} is carried and must never be stamped`);
  }
  assert.deepStrictEqual(d2plan.proposals.map(p => [p.backlog_id, p.reason, p.since]), [
    ["ZQTO-01", "superseded by ZQTO-99, which shipped the same premise.", "2026-09-20T03:00:00+00:00"],
    ["ZQTO-02", "superseded by ZQTO-99, which shipped the same premise.", "2026-09-20T03:00:00+00:00"],
  ], "each carried refusal becomes exactly one removal proposal, in the census's own order");
  assert.deepStrictEqual(d2plan.proposals.map(p => p.id), ["ZQTO-01", "ZQTO-02"].map(id => DRAIN.find(r => r.backlog_id === id).id),
    "a proposal addresses its row by primary key — it images and patches that row");
  assert.deepStrictEqual(d2plan.ledger.insert, [], "the revalidation slug files no ledger row at all any more (call iii)");
  assert.deepStrictEqual(d2plan.ledger.reseen, [],
    "a carried row is NOT touched for another night — it replays once and leaves, or `board-stale` carries it forever");
  assert.deepStrictEqual(d2plan.ledger.clear, CARRIED3.map(c => c.id),
    "every carried row clears: one replay each, and `carried` reads 0 the night after this ships");

  // (ix) A BATCH ROW WITH NO PREMISES ENTRY -> judgment, no fix. The read is what puts a premise in
  // front of the judge; a row nobody showed him must never be stamped as re-read.
  const d3 = drainRun({ premises: PREMISES.filter(pr => pr.backlog_id !== "ZQTO-07") });
  const d3f = slug166(d3).find(f => f.backlog_id === "ZQTO-07");
  assert.strictEqual(d3f.verdict, "judgment", "an unread premise cannot be confirmed");
  assert.ok(!("fix" in d3f), "an unread premise carries no fix — a fix that survives is a write");
  assert.ok(d3f.detail.includes("premise text was not read"), `got: ${d3f.detail}`);
  assert.strictEqual(slug166(d3).filter(f => f.verdict === "derivable").length, 24,
    "the other twenty-four are untouched by one missing premise");
  assert.strictEqual(planWrites(d3, [], DRAIN, { rate: 0.5, judged: true }).fixes.length, 24);
  // AGT-166 slice 4 (call iii): the slug files NO ledger row, so the unread premise reaches neither
  // the board nor the ledger — it is simply not stamped, and tomorrow's batch reads it again. A row
  // filed here would be permanent: nothing rules a ROW (AGT-169 rules checks), which is exactly how
  // twelve refusals came to sit in `board-stale` forever.
  assert.deepStrictEqual(planWrites(d3, [], DRAIN, { rate: 0.5, judged: true }).ledger.insert, [],
    "an unread premise is not stamped and not filed — the drain re-reads it, it does not accumulate");
  assert.deepStrictEqual(planWrites(d3, [], DRAIN, { rate: 0.5, judged: true }).proposals, [],
    "and nothing unread is ever PROPOSED for removal — a proposal needs a judge's refusal behind it");

  // (x) THE READ ORDER MUST NOT MATTER. Same thirty rows handed over backwards: the same twenty-five
  // ids, in the same order, with the same ranks. Without this arm a sort that fell back to REST's
  // order would pass every arm above and judge a different set on every run.
  const rev = classifyBoard(drainBoard({ items: [...DRAIN].reverse() }), { now: NOW166, rate: 0.5, retired: NO_RETIREMENT });
  assert.deepStrictEqual(slug166(rev).map(f => f.backlog_id), slug166(d1).map(f => f.backlog_id),
    "the batch is a function of the board, never of the order it was read in");
  assert.deepStrictEqual(slug166(rev).map(f => f.detail), slug166(d1).map(f => f.detail),
    "the ranks reverse with the read order unless the sort is total — same details, or the batch is not reproducible");
  assert.deepStrictEqual(
    selectRevalidationBatch([...DRAIN].reverse(), { now: NOW166, carried: [] }).batch.map(r => r.backlog_id),
    selectRevalidationBatch(DRAIN, { now: NOW166, carried: [] }).batch.map(r => r.backlog_id));

  // selectRevalidationBatch's own edges, pure: a population smaller than one night, and a `now` that
  // cannot be parsed (which must throw rather than select a batch from NaN).
  const small = selectRevalidationBatch(DRAIN.slice(0, 4), { now: NOW166, carried: ["ZQTO-02"] });
  assert.strictEqual(small.population.length, 4, "the population is every row past the fence, batch or not");
  assert.deepStrictEqual(small.carried, ["ZQTO-02"]);
  assert.deepStrictEqual(small.batch.map(r => r.backlog_id), ["ZQTO-01", "ZQTO-03", "ZQTO-04"]);
  assert.deepStrictEqual(
    selectRevalidationBatch(DRAIN, { now: NOW166, carried: ["ZQTO-99"] }).batch.map(r => r.backlog_id),
    slug166(d1).map(f => f.backlog_id),
    "a carried id the population does not hold changes nothing — it is not a slot");
  assert.strictEqual(selectRevalidationBatch(
    [{ ...drainRow(1), status: "partial" }, { ...drainRow(2), revalidated_at: NOW166 },
     { ...drainRow(3), filed_at: NOW166, created_at: NOW166 }],
    { now: NOW166, carried: [] }).population.length, 0,
    "the predicate is all three clauses: a partial row, a revalidated row and a young row are each out");
  assert.throws(() => selectRevalidationBatch(DRAIN, { now: "not-a-date", carried: [] }), /parseable/,
    "a batch selected from an unparseable clock would be a different 25 every run");

  // --- B: the render and the constants, pure ---------------------------------------------------
  const text = renderCensus(r, F.now);
  assert.strictEqual(text, renderCensus(r, F.now), "renderCensus must be byte-stable: the report is diffed night over night");
  assert.ok(text.startsWith(
    "ticket-owner census 2026-09-13T02:00:00Z: 14 rows · 13 findings (4 derivable · 9 judgment)" +
    " · behind the fences: quote 1 · size 1 · cost 1 · verdict 1 · unrevalidated>30d 1 · attended-actual null 2" +
    " · revalidation 1 left (batch 1, carried 0)"),
    `the census headline is not the agreed line:\n${text.split("\n")[0]}`);
  assert.ok(text.endsWith("\n"), "the census ends with a newline");
  assert.strictEqual(text.replace(/\n$/, "").split("\n").length, 14, "headline plus one line per check, always thirteen");
  const sizeLine = text.split("\n").find(l => l.includes("size-missing"));
  assert.ok(sizeLine.endsWith("—"), "a check that found nothing must still print its line, ending in an em dash");

  const emptyText = renderCensus(
    run({ board: { items: [], matrix: [], verdicts: [], accepts: [], decisions: [], openCycles: [] } }), F.now);
  assert.strictEqual(emptyText.replace(/\n$/, "").split("\n").length, 14, "an empty board still prints all thirteen checks");
  assert.ok(emptyText.includes("0 rows · 0 findings"), "an empty board reports zero rows, not nothing");

  assert.strictEqual(CHECKS.length, 13);
  assert.strictEqual(CHECKS[0], "quote-missing");
  assert.strictEqual(CHECKS[11], "remainder-stranded");
  // AGT-166 slice 2. This pin and the live CHECK constraint ship together: part N feeds the table
  // CHECKS's own vocabulary, so a slug appended here without the migration reddens THAT arm, and a
  // widened constraint without this line reddens nothing at all — which is why both exist.
  assert.strictEqual(CHECKS[12], "unrevalidated-30d");
  assert.strictEqual(REVALIDATION_CHECK, "unrevalidated-30d", "one string names the slug, never a literal per site");
  assert.strictEqual(UNREVALIDATED_BATCH, 25, "the Designer's call (ii): 25 premises a night");
  assert.strictEqual(PREMISE_EXCERPT, 600, "a premise reaches the judge cut at a fixed, reproducible count");
  assert.strictEqual(TYPE_TAXONOMY.length, 10, "the eight FEATURES.md rows plus the two live majorities");
  assert.ok(TYPE_TAXONOMY.includes("Tooling") && TYPE_TAXONOMY.includes("Bug"));
  assert.deepStrictEqual(Object.keys(TYPE_MAP), ["feature", "Bug Fixes"],
    "only one-to-one normalisations may be derivable; anything else is a classification");
  assert.deepStrictEqual({ ...FENCES }, {
    size_stamp: "2026-08-28T21:34:27Z",
    predicted_cycles: "2026-09-01T15:56:03Z",
    cost_pct_snapshot: "2026-09-01T16:41:41Z",
    runner_verdicts: "2026-08-25T03:50:04Z",
  }, "a fence typo silently reclassifies hundreds of rows in one direction or the other");

  // --- C: the CLI over the fixture (spawn, no creds) -------------------------------------------
  const cJson = spawnCli([`--board=${FIXTURE_REL}`, "--json"]);
  assert.strictEqual(cJson.status, 0, `the fixture census must run without credentials; stderr: ${cJson.stderr}`);
  const parsed = JSON.parse(cJson.stdout);
  // AGT-169: the CLI takes classifyBoard's DEFAULT retirement set, which is the ruler's answer over
  // `board.ownerRulings` -- absent from this fixture, so it is `RETIRED_CHECKS` alone. Comparing
  // the spawned run against `rDefault` rather than against `r` is what makes the two arms grade
  // different things: `r` proves the thirteen checks still classify, `rDefault` proves the shipped
  // default actually retires one of them end to end, through a real process.
  const rDefault = classifyBoard(F.board, { now: F.now, rate: F.rate });
  assert.strictEqual(rDefault.counts.findings, r.counts.findings - 1,
    "the default retirement must remove exactly the fixture's one actual-unknown finding");
  assert.deepStrictEqual(rDefault.backlog.retired, { "actual-unknown": 1 },
    "the retired check is COUNTED, never silently dropped");
  assert.deepStrictEqual(parsed.counts, rDefault.counts, "the CLI must report the same classification the library computes");
  assert.strictEqual(parsed.measured_at, "2026-09-13T02:00:00Z", "the fixture's own clock wins, never the wall clock");

  const cText = spawnCli([`--board=${FIXTURE_REL}`]);
  assert.strictEqual(cText.status, 0, `stderr: ${cText.stderr}`);
  assert.strictEqual(cText.stdout, renderCensus(rDefault, F.now), "the CLI's default output is renderCensus, byte for byte");

  const cNoCreds = spawnCli(["--census"]);
  assert.strictEqual(cNoCreds.status, 2, "a live census without credentials is not a pass");
  assert.ok(cNoCreds.stderr.includes("SUPABASE_URL"), `the refusal must name what is missing; got: ${cNoCreds.stderr}`);

  const cApply = spawnCli([`--board=${FIXTURE_REL}`, "--apply"]);
  assert.strictEqual(cApply.status, 2, "--apply over a fixture must be refused, not ignored: fixture ids do not address live rows");
  assert.ok(cApply.stderr.includes("never written"), `got: ${cApply.stderr}`);

  // AGT-79 slice 3: --nightly is a REAL flag now, so the refusals it hits must be its own gates
  // and never the unknown-flag catch-all. A run refused for the wrong reason is a run that starts
  // working the day someone "fixes" the flag list.
  const cNightlyNoCycle = spawnCli(["--nightly"]);
  assert.strictEqual(cNightlyNoCycle.status, 2, "--nightly writes and so needs an attribution");
  assert.ok(!cNightlyNoCycle.stderr.includes("unknown flag"), `--nightly must be a known flag; got: ${cNightlyNoCycle.stderr}`);
  assert.ok(cNightlyNoCycle.stderr.includes("needs --cycle-id"), `got: ${cNightlyNoCycle.stderr}`);

  const cNightlyBoard = spawnCli(["--nightly", "--cycle-id=00000000-0000-4000-8000-000000000000", `--board=${FIXTURE_REL}`]);
  assert.strictEqual(cNightlyBoard.status, 2, "--nightly over a fixture is refused on the same terms as --apply");
  assert.ok(cNightlyBoard.stderr.includes("never written"), `got: ${cNightlyBoard.stderr}`);

  const cNightlyNoCreds = spawnCli(["--nightly", "--cycle-id=00000000-0000-4000-8000-000000000000"]);
  assert.strictEqual(cNightlyNoCreds.status, 2, "a live nightly without credentials is not a pass");
  assert.ok(cNightlyNoCreds.stderr.includes("SUPABASE_URL"), `got: ${cNightlyNoCreds.stderr}`);

  assert.strictEqual(spawnCli(["--board=tests/fixtures/agt-79/nope.json"]).status, 2, "an unreadable board is exit 2");

  // --- D: the seed file (source, always runs) --------------------------------------------------
  const seed = fs.readFileSync(path.join(ROOT, SEED_REL), "utf8");
  assert.ok(seed.includes("'ticketowner'"), "the seed must create the ticketowner agent row");
  assert.ok(seed.includes("'audit-board'"), "the seed must create the audit-board capability");

  // Rule #1, with its own control: the regex is proven to fire when a name IS present, so a clean
  // grep means the file is clean rather than the pattern being broken.
  const NAMES = /auditor|prioritizer|designer|builder|verifier|researcher|devmanager/gi;
  assert.strictEqual((seed.match(NAMES) || []).length, 0, "no Skill text may name another agent (Rule #1)");
  assert.ok((`${seed}\n-- 'designer'`).match(NAMES)?.length === 1, "the Rule #1 control did not fire — the pattern is broken, not the file clean");

  assert.strictEqual((seed.match(/'format'/g) || []).length, 0, "five Skill types, no Format row");
  assert.strictEqual((seed.match(/6000, NULL/g) || []).length, 5, "five profiles, each 6000 max_tokens with temperature NULL");
  assert.strictEqual((seed.match(/6000, 0/g) || []).length, 0, "temperature 0 is not NULL — the judgment lane's API rejects it");

  const agentsInsert = seed.slice(seed.indexOf("INSERT INTO public.agents"));
  const agentsStmt = agentsInsert.slice(0, agentsInsert.indexOf(");") + 2);
  assert.ok(agentsStmt.includes("is_active"), "the agents INSERT must name is_active explicitly");
  assert.strictEqual((agentsStmt.match(/\btrue\b/g) || []).length, 1,
    "the agents row lands is_active = true exactly once (SES-338 governance-lane carve-out)");

  assert.ok(seed.split("\n").slice(0, 12).join("\n").includes("HELD"),
    "the header must say HELD: this file is written and never applied by an unattended session");
  assert.ok(seed.includes("'GV-08'"), "this seed claims GV-08");
  const valuesLines = seed.split("\n").filter(l => l.includes("GV-07") && !l.trimStart().startsWith("--"));
  assert.deepStrictEqual(valuesLines, [], "GV-07 may be discussed in the comment, never claimed in a VALUES line");

  // --- F: the plan, pure ------------------------------------------------------------------------
  // The open ledger as it would stand from a previous night: one finding that is still true
  // (QA-79-01 quote-missing), one that is not (QA-79-06 claim-expired), and one that tonight
  // classifies as DERIVABLE rather than judgment (QA-79-03) -- which must still clear, because a
  // gap the census now fixes itself is no longer an open judgment call.
  const P = [
    { id: "p1", backlog_id: "QA-79-01", check_slug: "quote-missing" },
    { id: "p2", backlog_id: "QA-79-06", check_slug: "claim-expired" },
    { id: "p3", backlog_id: "QA-79-03", check_slug: "cost-snapshot-missing" },
  ];
  const plan = planWrites(r, P, F.board.items, { rate: F.rate });

  assert.deepStrictEqual(plan.fixes.map(f => f.backlog_id), ["QA-79-03", "QA-79-05", "QA-79-07", "QA-79-12"],
    "every derivable finding becomes exactly one fix, in the census's own order");
  assert.deepStrictEqual(plan.fixes.map(f => f.id.slice(-4)), ["0003", "0005", "0007", "0012"],
    "a fix addresses its row by primary key, resolved from the board read -- never by backlog_id");
  for (const f of plan.fixes) {
    assert.deepStrictEqual(f.patch, only(r, f.backlog_id, f.check).fix,
      `${f.backlog_id}'s patch is not the finding's fix -- the plan must carry the write the census computed`);
  }

  const ins = plan.ledger.insert;
  // AGT-166 slice 4 (Designer's call iii): `["QA-79-02", "unrevalidated-30d"]` is NO LONGER HERE, and
  // its absence is the assertion. The thirteenth check files no ledger row in any direction now — a
  // confirmed premise is a row patch, a refused one is a removal proposal, and an unread one waits for
  // tomorrow's batch. A row filed here would be permanent, because nothing rules a ROW.
  assert.ok(!ins.some(f => f.check_slug === "unrevalidated-30d"),
    "the revalidation check must file no ledger row at all — twelve such rows sat unruled in board-stale");
  assert.deepStrictEqual(ins.map(f => [f.backlog_id, f.check_slug]).sort(), [
    ["QA-79-04", "actual-unknown"],
    ["QA-79-04", "remainder-stranded"],
    ["QA-79-08", "verdict-missing"],
    ["QA-79-10", "delivered-unaccepted"],
    ["QA-79-13", "type-off-taxonomy"],
    ["QA-79-14", "cycles-over-quote"],
    ["QA-79-14", "designed-closed"],
  ], "every judgment finding NOT already on the ledger becomes one new row, and two checks on one ticket are two rows");
  for (const f of ins) {
    assert.ok(/^[0-9a-f-]{36}$/.test(f.id), `ledger insert ${f.backlog_id}/${f.check_slug} has no uuid: ${f.id}`);
    assert.strictEqual(f.verdict, "judgment", "only judgment findings reach the ledger; a derivable one is a write");
    assert.ok(typeof f.detail === "string" && f.detail.length > 0, `${f.backlog_id}/${f.check_slug} filed with no detail sentence`);
  }
  assert.deepStrictEqual(plan.ledger.reseen, ["p1"], "a prior finding still true tonight is touched, never re-inserted");
  assert.deepStrictEqual(plan.ledger.clear, ["p2", "p3"], "every prior finding not seen tonight clears -- including one the census now fixes itself");
  assert.deepStrictEqual(plan.meta.counts, r.counts);
  assert.strictEqual(plan.meta.rate, 0.5, "the decision text quotes the rate the arithmetic used");

  // (i) CONTROL -- an empty board must CLEAR the whole open ledger. Without this arm, a planner
  // that simply never cleared anything would read green above.
  const emptyPlan = planWrites(
    run({ board: { items: [], matrix: [], verdicts: [], accepts: [], decisions: [], openCycles: [] } }),
    P, [], { rate: F.rate });
  assert.deepStrictEqual(emptyPlan.fixes, []);
  assert.deepStrictEqual(emptyPlan.ledger.insert, []);
  assert.deepStrictEqual(emptyPlan.ledger.reseen, []);
  assert.deepStrictEqual(emptyPlan.ledger.clear, ["p1", "p2", "p3"], "a board with nothing wrong clears every open finding");

  // (ii) CONTROL -- add a prior row matching tonight: it moves OUT of insert and INTO reseen, so
  // the two lists are proven disjoint rather than merely both populated.
  const p4 = planWrites(r, [...P, { id: "p4", backlog_id: "QA-79-04", check_slug: "actual-unknown" }], F.board.items, { rate: F.rate });
  assert.strictEqual(p4.ledger.insert.length, 6, "a finding already on the ledger must not be inserted a second time");
  assert.deepStrictEqual(p4.ledger.reseen, ["p1", "p4"]);

  // (iii) A fix with no primary key is not a write -- it throws rather than planning a PATCH it
  // cannot address.
  assert.throws(() => planWrites(r, [], []), /QA-79-03/,
    "a derivable finding whose row is missing from the board read must refuse, naming the ticket");

  // (iv) Attribution is exactly one of cycle / session (ck_decision_attribution), refused before
  // any request leaves the process.
  await assert.rejects(() => applyPlan("x", "y", plan, {}), /exactly one/,
    "a write with neither a cycle nor a session is unattributable");
  await assert.rejects(() => applyPlan("x", "y", plan, { cycleId: "a", sessionName: "b" }), /exactly one/,
    "a write claiming both a cycle and a session violates ck_decision_attribution");

  // --- H: the standing brief's hygiene group, pure + doc ---------------------------------------
  // The fixture is the live shape, not a convenient one: three rows of one check and one of
  // another, so the sort by count is actually exercised, and a run row whose notes are a real
  // nightly string so the prefix strip is proven on the thing it has to strip.
  const HYG = () => ({
    open: [
      { check_slug: "quote-missing", first_seen_at: "2026-09-13T03:31:46.538+00:00" },
      { check_slug: "quote-missing", first_seen_at: "2026-09-13T03:31:46.538+00:00" },
      { check_slug: "quote-missing", first_seen_at: "2026-09-13T03:31:46.538+00:00" },
      { check_slug: "delivered-unaccepted", first_seen_at: "2026-09-10T03:00:00+00:00" },
    ],
    decision: {
      id: "77afdcbc-32dc-4505-bfda-724acc1f8b07",
      status: "open",
      summary: "Ticket Owner: 40 derivable cell fix(es) on 40 row(s) — cost 37 · claim 1 · type 2",
      expires_at: "2026-09-16T03:31:48+00:00",
      decided_at: "2026-09-13T03:31:48+00:00",
    },
    run: {
      id: "11111111-2222-4333-8444-555555555555",
      outcome: "shipped",
      ended_at: "2026-09-13T03:40:00+00:00",
      notes: "SCHEDULED-AGENT: audit-board — 855 rows · 170 findings (0 derivable · 170 judgment) · behind the fences: quote 526 · size 494 · cost 45 · verdict 97 · unrevalidated>30d 427 · attended-actual null 260 · fixed 0 · findings +0 ~170 −0 · no decision (nothing to fix)",
    },
  });
  const NOW = "2026-09-14T04:00:00Z";
  const hOut = renderTicketHygiene(HYG(), "as of X", NOW);

  assert.ok(hOut.startsWith("**Ticket hygiene, last night** — *as of X.*"), `the group must lead with its own name and stamp; got: ${hOut.slice(0, 80)}`);
  assert.ok(hOut.includes("**4 open findings** across 2 check(s)"), "the lead counts rows and checks, never a rate");

  const hRows = hOut.split("\n").filter(l => l.startsWith("| `"));
  assert.strictEqual(hRows.length, 2, "one table row per check, and the two checks must not collapse into one");
  assert.ok(hRows[0].startsWith("| `quote-missing` | 3 |") && hRows[0].endsWith("| 1 |"),
    `the busiest check sorts first and its oldest row is 1 night old; got: ${hRows[0]}`);
  assert.ok(hRows[1].startsWith("| `delivered-unaccepted` | 1 |") && hRows[1].endsWith("| 4 |"),
    `the older, smaller check sorts second and reads 4 nights open; got: ${hRows[1]}`);
  assert.ok(hRows[0].includes(cst("2026-09-13T03:31:46.538+00:00")),
    "the oldest column is the brief's ONE CST formatter, not a second date format for John to learn");

  assert.ok(hOut.includes("- Last run: `11111111` · shipped ·"), "the run line carries the short id and the outcome");
  assert.ok(hOut.includes("· 855 rows · 170 findings"), "the run line prints the night's OWN notes, never a recount");
  assert.ok(!hOut.includes("SCHEDULED-AGENT"), "the machine-readable prefix is stripped before John reads the line");
  assert.ok(hOut.includes("- Decision `77afdcbc` · open ·"), "the decision line carries the short handle and its status");
  assert.ok(hOut.includes("reverse_decision('77afdcbc-32dc-4505-bfda-724acc1f8b07','John','<why>')"),
    "the reversal line carries the FULL uuid — a short handle is not something John can paste");
  assert.ok(!hOut.includes("%"), "no percentage anywhere: counts side by side, never a rate");
  assert.strictEqual(renderTicketHygiene(HYG(), "as of X", NOW), hOut, "the group is pure — same facts, same bytes");

  // The four branches, each with the sentence that distinguishes it from the one it could be
  // mistaken for. `not read` and `no open findings` are opposite situations that look alike.
  const hUnread = renderTicketHygiene(undefined, "as of X", NOW);
  assert.ok(hUnread.includes("was not read for this render"), "an absent ledger says it was not read");
  assert.ok(!hUnread.includes("0 open"), "an unread ledger must never render as a measured zero");
  assert.ok(renderTicketHygiene({ ...HYG(), open: [] }, "as of X", NOW).includes("**0 open findings**"),
    "a read, empty ledger IS a measured zero and says so");
  assert.ok(renderTicketHygiene({ ...HYG(), open: [] }, "as of X", NOW).includes("No open findings"),
    "the measured zero is named in words as well as in the count");
  assert.ok(renderTicketHygiene({ ...HYG(), run: null }, "as of X", NOW).includes("No nightly run on record yet"),
    "no cycle row yet is its own sentence, not a blank line");
  assert.ok(renderTicketHygiene({ ...HYG(), decision: null }, "as of X", NOW).includes("No hygiene decision on record"),
    "no decision yet is its own sentence too");

  // The sha moves on what John reads and stands still on what he does not. A re-seen touch is the
  // nightly pass saying "still there" about a gap already on the page -- not drift.
  const Fs = over => ({ items: [{ id: 1, status: "open", design_status: null, queue: 1 }], ...over });
  assert.strictEqual(factsSha(Fs({ hygiene: HYG() })), factsSha(Fs({ hygiene: HYG() })), "the same facts must hash the same");
  const dropped = HYG();
  dropped.open = dropped.open.slice(1);
  assert.notStrictEqual(factsSha(Fs({ hygiene: dropped })), factsSha(Fs({ hygiene: HYG() })), "a finding clearing must move the sha");
  const laterRun = HYG();
  laterRun.run.ended_at = "2026-09-14T03:40:00+00:00";
  assert.notStrictEqual(factsSha(Fs({ hygiene: laterRun })), factsSha(Fs({ hygiene: HYG() })), "a new night's run must move the sha");
  const finalised = HYG();
  finalised.decision.status = "final";
  assert.notStrictEqual(factsSha(Fs({ hygiene: finalised })), factsSha(Fs({ hygiene: HYG() })), "the decision finalising must move the sha");
  const touched = HYG();
  touched.open[0].first_seen_at = "2026-09-13T09:00:00+00:00";
  assert.strictEqual(factsSha(Fs({ hygiene: touched })), factsSha(Fs({ hygiene: HYG() })),
    "a re-seen touch is not a change John reads — including first_seen_at would report drift every single night");

  // The doc half: the group is actually ON the page, in its place, inside the generated block.
  const brief = fs.readFileSync(path.join(ROOT, "docs/runbooks/standing-brief.md"), "utf8");
  const iLedger = brief.indexOf("**Auditor's ledger**");
  const iHyg = brief.indexOf("**Ticket hygiene, last night**");
  const iProv = brief.indexOf("*Provenance:");
  assert.ok(iLedger > 0 && iHyg > 0 && iProv > 0, "the brief must carry the ledger, the hygiene group and the provenance line");
  assert.ok(iLedger < iHyg && iHyg < iProv, "the hygiene group lands AFTER the Auditor's ledger and BEFORE the provenance footer");
  assert.ok(iHyg > brief.indexOf(BEGIN) && iHyg < brief.indexOf(END), "the group is generated, so it lives inside the generated markers");

  // --- I: step 4e and the card it generates (source, always runs) -------------------------------
  const runbookMd = fs.readFileSync(path.join(ROOT, RUNBOOK_REL), "utf8");
  const labels = parseSteps(runbookMd).map(s => s.label);
  const i4e = labels.indexOf("4e");
  assert.ok(i4e > 0, "step 4e must parse as a step, not as prose inside 4d");
  assert.strictEqual(labels[i4e - 1], "4d", "4e sits directly after the weekly audit");
  assert.strictEqual(labels[i4e + 1], "5", "4e sits directly before selection — hygiene happens BEFORE the pick");
  assert.strictEqual(labels.length, 27, "the runbook parses to 27 steps");
  assert.strictEqual(labels.length, Object.keys(NOTES).length, "every step has a NOTES entry — the renderer exits 2 otherwise");
  assert.ok(NOTES["4e"].outcome.length <= 90, `a card outcome is <= 90 chars; 4e is ${NOTES["4e"].outcome.length}`);
  assert.strictEqual(NOTES["4e"].block, 1, "the card carries 4e's first fenced block: the command IS the precondition");

  // Whitespace-normalised, deliberately: the runbook is hard-wrapped, so a phrase that happens to
  // straddle a line break is the same sentence and a raw substring match would pin the wrap
  // instead of the words.
  const raw4e = runbookMd.slice(runbookMd.indexOf("**4e. "), runbookMd.indexOf("**5. ", runbookMd.indexOf("**4e. ")));
  const body4e = raw4e.replace(/\s+/g, " ");
  assert.ok(body4e.includes("ticket-owner.js --nightly --judge --cycle-id="), "the step names the command a cycle actually runs");
  assert.ok(body4e.includes("SCHEDULED-AGENT: audit-board"), "the step names the notes prefix its precondition reads");
  assert.ok(body4e.includes("already run today"), "the step names the exit-0 answer that sends a cycle on to step 5");
  assert.ok(body4e.includes("continue to step 5 normally"), "exit 2 is a refusal, never a stop — the hygiene pass is bookkeeping");
  // Slice 4's negative here was `!body4e.includes("--judge")` — correct while the judgment pass had
  // shipped but was not yet documented as available. Slice 5 (v7.0.505) lands it in the step, so the
  // negative is RETIRED rather than weakened, and part L below asserts the whole ceremony positively.

  const card = fs.readFileSync(path.join(ROOT, CARD_REL), "utf8");
  assert.strictEqual(card, render(runbookMd), "the card is a GENERATED view — it must be the byte-exact render of the runbook in this same commit");
  const cardLine = card.split("\n").find(l => l.startsWith("**4e.** Ticket hygiene · L"));
  assert.ok(cardLine, "the card must carry a 4e line naming the step");
  const cardBlocks = card.split("```");
  assert.ok(cardBlocks.some(b => b.includes("--nightly --judge --cycle-id=")), "the card carries 4e's command block in full");
  assert.ok(runbookMd.split("\n").filter(l => l.startsWith("<!-- DeepBench v")).length <= 5,
    "session-hygiene check 7: at most 5 header stamps on the runbook");
  assert.ok(fs.readFileSync(path.join(ROOT, "docs/SESSIONS.md"), "utf8").includes("<!-- DeepBench v7.0.452 | runbooks/runner-cycle.md | SES-352"),
    "the retired stamp was RELOCATED to docs/SESSIONS.md, not dropped");

  // The control: the renderer refuses a step it has no NOTES entry for, which is what makes the
  // assertion above a guard rather than a coincidence.
  assert.throws(() => render(runbookMd + "\n**10. Nothing.**\n"), "a step with no NOTES entry must refuse to render");

  // --- J: the nightly, pure + CLI ---------------------------------------------------------------
  // The DST boundary is the whole point: CDT midnight is 05:00Z, CST midnight is 06:00Z, so a
  // fixed-offset answer is wrong twice a year and silently. Both boundaries are pinned.
  assert.strictEqual(sameChicagoDay("2026-09-13T04:59:00Z", "2026-09-13T05:01:00Z"), false, "CDT midnight is 05:00Z — these are two different Chicago days");
  assert.strictEqual(sameChicagoDay("2026-09-13T05:01:00Z", "2026-09-14T04:59:00Z"), true, "a whole CDT day is one Chicago day");
  assert.strictEqual(sameChicagoDay("2026-01-13T05:59:00Z", "2026-01-13T06:01:00Z"), false, "CST midnight is 06:00Z — these are two different Chicago days");
  assert.strictEqual(sameChicagoDay("2026-01-13T06:01:00Z", "2026-01-14T05:59:00Z"), true, "a whole CST day is one Chicago day");
  assert.throws(() => sameChicagoDay("x", "2026-01-01T00:00:00Z"), "a precondition that cannot be evaluated must throw, never answer false");

  assert.strictEqual(renderCensus(r, F.now).split("\n")[0], `ticket-owner census ${F.now}: ${censusLine(r)}`,
    "renderCensus's first line IS censusLine — one string, two readers, byte-identical");
  assert.ok(censusLine(r).startsWith("14 rows · 13 findings (4 derivable · 9 judgment) · behind the fences: quote "),
    `the census line carries the counts and the fences in order; got: ${censusLine(r).slice(0, 90)}`);

  // Slice 6 appended ` · unjudged` to the falsy-`judged` branch, so these two arms carry it: the
  // decision handle and the no-decision sentence are still the last thing the night says about its
  // WRITES, and the judgment tail now follows them either way. Part M owns the tail itself.
  const n1 = nightlyNotes(censusLine(r), { fixed: 1, inserted: 4, reseen: 0, cleared: 0, decision: "d1", expires_at: "2026-09-16T00:00:00Z" });
  assert.ok(n1.startsWith(`${NIGHTLY_PREFIX} — 14 rows · 13 findings`), `the notes lead with the prefix the precondition reads; got: ${n1.slice(0, 60)}`);
  assert.ok(n1.endsWith(" · fixed 1 · findings +4 ~0 −0 · decision d1 — reversible until 2026-09-16T00:00:00Z · unjudged"),
    `a night that fixed something ends in its decision handle and window; got: ${n1.slice(-90)}`);
  const n2 = nightlyNotes(censusLine(r), { fixed: 0, inserted: 0, reseen: 170, cleared: 0, decision: null, expires_at: null });
  assert.ok(n2.endsWith(" · fixed 0 · findings +0 ~170 −0 · no decision (nothing to fix) · unjudged"),
    `a night with nothing to fix records no decision and SAYS so; got: ${n2.slice(-70)}`);
  assert.strictEqual(NIGHTLY_PREFIX, "SCHEDULED-AGENT: audit-board", "the prefix is the contract between the script, the runbook and the brief");

  // The three refusals, spawned with the credentials deleted. Each must name what stopped it: a
  // nightly run that fell through to a live read without a cycle id would write unattributably.
  const nNoCycle = spawnCli(["--nightly"]);
  assert.strictEqual(nNoCycle.status, 2, "--nightly writes, so it needs a cycle to attribute the write to");
  assert.ok(nNoCycle.stderr.includes("needs --cycle-id"), `the refusal must name the missing id; got: ${nNoCycle.stderr}`);
  const nBoard = spawnCli(["--nightly", "--cycle-id=00000000-0000-4000-8000-000000000000", `--board=${FIXTURE_REL}`]);
  assert.strictEqual(nBoard.status, 2, "--nightly over a fixture board must be refused, not ignored");
  assert.ok(nBoard.stderr.includes("never written"), `the refusal must say a fixture is never written; got: ${nBoard.stderr}`);
  const nNoCreds = spawnCli(["--nightly", "--cycle-id=00000000-0000-4000-8000-000000000000"]);
  assert.strictEqual(nNoCreds.status, 2, "a live nightly without credentials is not a pass");
  assert.ok(nNoCreds.stderr.includes("SUPABASE_URL"), `the refusal must name what is missing; got: ${nNoCreds.stderr}`);

  // --- K: the judgment pass, pure + no-creds CLI (slice 4) --------------------------------------
  const J = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/agt-79/judge.json"), "utf8"));
  const ZERO = "00000000-0000-4000-8000-000000000000";
  // The census exactly as the CLI hands it to the prompt, and the state file pass one would write.
  const out = { measured_at: F.now, rate: F.rate, fences: FENCES, counts: r.counts, backlog: r.backlog, findings: r.findings };
  const state = {
    version: 1, started_at: F.now, cycle_id: ZERO, nightly: false,
    capability: "audit-board", intent: "to-audit-intent", agent: "ticketowner",
    model: "claude-fable-5-1", schema: J.schema, now: F.now, rate: F.rate, window: "2026-09-12",
    census: out, prior: J.prior, items: F.board.items.map(i => ({ id: i.id, backlog_id: i.backlog_id })),
  };

  // The catalog entry is what lets the mandatory agent-log.js row be written at all: without it the
  // very first judged night is refused at its log row (SES-332 / SES-334 / SES-338, each found by a
  // refusal). And the fixture's schema must be the SEED's schema byte for byte, or the regression
  // is validating answers against a contract the live Intent row will never carry.
  const svc = SERVICE_CATALOG.find(s => s.slug === "audit-board");
  assert.ok(svc, "audit-board must be a SERVICE_CATALOG slug — agent-log.js refuses any other --ai-type");
  assert.strictEqual(svc.serviceType, "ai");
  assert.ok(svc.patterns.includes("Structured Output"), `audit-board's patterns read ${JSON.stringify(svc.patterns)}`);
  assert.ok(seed.includes(JSON.stringify(J.schema)),
    "the judge fixture's schema must be the seed's to-audit-intent schema, byte for byte");
  assert.ok(!seed.includes(JSON.stringify({ ...J.schema, required: [] })),
    "the seed-substring control did not fire — the check would pass for any schema, so it proves nothing");
  assert.strictEqual(EXIT_AWAITING_ANSWER, 3, "3 is AWAITING THE JUDGMENT and is not 2 — pass one ran its half correctly");

  // The DST boundaries again, now on the single-instant function the window is keyed by. A window
  // computed with a fixed offset is wrong twice a year and silently, and the window is what decides
  // whether an answer is about tonight at all.
  assert.strictEqual(chicagoDay("2026-09-13T04:59:00Z"), "2026-09-12", "CDT midnight is 05:00Z");
  assert.strictEqual(chicagoDay("2026-09-13T05:01:00Z"), "2026-09-13", "CDT midnight is 05:00Z");
  assert.strictEqual(chicagoDay("2026-01-13T05:59:00Z"), "2026-01-12", "CST midnight is 06:00Z");
  assert.strictEqual(chicagoDay("2026-01-13T06:01:00Z"), "2026-01-13", "CST midnight is 06:00Z");
  assert.throws(() => chicagoDay("x"), "a window that cannot be computed must throw, never answer a wrong day");

  const sp = statePathFor("/t", "a-b/../c");
  assert.ok(sp.endsWith("ticket-owner-judge-a-bc.json"), `a cycle id reaching a filesystem path must be sanitised; got ${sp}`);
  assert.ok(sp.startsWith("/t"), `the state file must land in the directory it was given; got ${sp}`);

  // judgeTask: three members, and the ledger REPROJECTED — `check`, never `check_slug`, and no row
  // id. Handing a model a primary key invites an answer that names one.
  const jt = judgeTask(out, J.prior, F.now);
  assert.strictEqual(jt.window, "2026-09-12");
  assert.strictEqual(jt.census, out, "the task carries the census itself, never a re-derived copy");
  assert.deepStrictEqual(jt.prior, [
    { backlog_id: "QA-79-08", check: "verdict-missing", first_seen_at: "2026-09-10T02:00:00+00:00" },
    { backlog_id: "QA-79-02", check: "quote-missing", first_seen_at: "2026-09-09T02:00:00+00:00" },
  ], "the prior rows reach the prompt as {backlog_id, check, first_seen_at} and nothing else");

  // The accept arm, over the real fixture answer.
  const stateBefore = JSON.stringify(state);
  const g = ingestJudgment(J.answer, state);
  assert.deepStrictEqual(g.errors, [], `the fixture answer must be accepted; got ${g.errors.join(" | ")}`);
  assert.deepStrictEqual(g.judged, {
    confirmed: 3, refused: 1, unconfirmed: 0, sentences: 2,
    model: "claude-fable-5-1", report: J.answer.report,
  });
  assert.deepStrictEqual(g.result.counts, { rows: 14, findings: 13, derivable: 3, judgment: 10 },
    "a refused fix moves one finding from derivable to judgment and changes no other count");
  assert.deepStrictEqual(
    g.result.findings.map(f => `${f.backlog_id} ${f.check}`),
    r.findings.map(f => `${f.backlog_id} ${f.check}`),
    "the merge keeps the census's own order — a reordering would read as movement on the board");
  assert.deepStrictEqual(g.result.backlog, r.backlog, "the behind-the-fence counts are the census's, untouched");

  const q5 = only(g.result, "QA-79-05", "claim-on-closed");
  assert.strictEqual(q5.verdict, "judgment", "a REFUSED fix becomes a judgment finding");
  assert.ok(!("fix" in q5), "a refused fix must carry no `fix` object at all — a fix that survives is a write");
  assert.ok(q5.detail.startsWith("judge refused: "), `got: ${q5.detail.slice(0, 40)}`);
  assert.deepStrictEqual(only(g.result, "QA-79-03", "cost-snapshot-missing").fix,
    only(r, "QA-79-03", "cost-snapshot-missing").fix, "a CONFIRMED fix is the census's own fix, unaltered");
  assert.strictEqual(only(g.result, "QA-79-01", "quote-missing").detail, J.answer.findings[0].detail,
    "a judgment finding the answer wrote a sentence for carries THAT sentence");
  assert.strictEqual(only(g.result, "QA-79-04", "actual-unknown").detail, only(r, "QA-79-04", "actual-unknown").detail,
    "a judgment finding the answer said nothing about keeps the census's detail");

  const pj = planWrites(g.result, J.prior, F.board.items, { rate: F.rate, judged: g.judged });
  assert.deepStrictEqual(pj.fixes.map(f => f.backlog_id), ["QA-79-03", "QA-79-07", "QA-79-12"],
    "only the confirmed fixes become writes");
  assert.strictEqual(pj.ledger.insert.length, 8,
    "ten judgment pairs, minus the one already on the ledger, minus the revalidation pair the slug no longer files (slice 4)");
  // AGT-166 slice 4: a refused COST fix is not a removal proposal. The judge declining one arithmetic
  // write says nothing about whether the ticket should exist — only the thirteenth check asks that.
  assert.ok(!("proposal" in q5), "a refused claim fix carries no removal proposal — only a refused PREMISE does");
  assert.deepStrictEqual(pj.proposals, [], "and nothing is proposed from a night whose only refusal was arithmetic");
  assert.deepStrictEqual(pj.ledger.reseen, ["00000000-0000-4000-8000-0000000000a1"]);
  assert.deepStrictEqual(pj.ledger.clear, ["00000000-0000-4000-8000-0000000000a2"]);

  assert.strictEqual(JSON.stringify(state), stateBefore, "ingestJudgment must not mutate the state it was handed");
  assert.ok(only(r, "QA-79-05", "claim-on-closed").fix, "the census object itself must survive the merge untouched");

  // THE CONTROL, and it is the safety property: drop ONE fix and its finding must FAIL CLOSED —
  // judgment, no `fix`, and counted as unconfirmed. An ingest that failed open would pass every
  // other arm above.
  const a2 = clone(J.answer);
  a2.fixes = a2.fixes.filter(f => f.backlog_id !== "QA-79-12");
  const g2 = ingestJudgment(a2, state);
  assert.deepStrictEqual(g2.errors, [], "an answer that simply says less is still a valid answer");
  assert.strictEqual(g2.judged.unconfirmed, 1, "a derivable finding with no fix entry is UNCONFIRMED, never assumed");
  assert.strictEqual(g2.judged.confirmed, 2);
  assert.strictEqual(g2.result.counts.derivable, 2, "silence is not consent — the unconfirmed fix is not written");
  const q12 = only(g2.result, "QA-79-12", "type-off-taxonomy");
  assert.strictEqual(q12.verdict, "judgment");
  assert.ok(!("fix" in q12));
  assert.ok(q12.detail.startsWith("judge: not confirmed"), `got: ${q12.detail.slice(0, 40)}`);

  // TEN MUTATIONS, each REFUSED BY NAME. `result` and `judged` null on every one: a refusal that
  // still returned a merge would let a caller write half an answer.
  const mutations = [
    ["a missing required key", a => { delete a.account; }, 'missing required key "account"'],
    ["an answer about another night", a => { a.window = "2026-09-13"; }, "about window"],
    ["a fix naming a judgment finding", a => { a.fixes.push({ backlog_id: "QA-79-01", check: "quote-missing", apply: true, reason: "x" }); }, "not a derivable finding"],
    ["a fix naming a ticket off this board", a => { a.fixes.push({ backlog_id: "QA-79-99", check: "claim-expired", apply: true, reason: "x" }); }, "not a derivable finding"],
    ["a sentence about a confirmed fix", a => { a.findings.push({ backlog_id: "QA-79-03", check: "cost-snapshot-missing", detail: "x" }); }, "neither a judgment finding"],
    ["a duplicated fix", a => { a.fixes.push(clone(a.fixes[2])); }, "twice"],
    ["an over-long reason", a => { a.fixes[0].reason = "r".repeat(201); }, "at most 200"],
    ["a non-boolean apply", a => { a.fixes[0].apply = "yes"; }, "apply must be a boolean"],
    ["an empty detail", a => { a.findings[0].detail = ""; }, "detail must be a non-empty string"],
    ["fixes that is not an array", a => { a.fixes = "none"; }, '"fixes" must be'],
  ];
  for (const [name, mutate, fragment] of mutations) {
    const bad = clone(J.answer);
    mutate(bad);
    const gm = ingestJudgment(bad, state);
    assert.ok(gm.errors.length >= 1, `${name} must be refused, and was not`);
    assert.strictEqual(gm.result, null, `${name} was refused but still returned a result to write`);
    assert.strictEqual(gm.judged, null, `${name} was refused but still returned a judged summary`);
    assert.ok(gm.errors.join("\n").includes(fragment),
      `${name}: the refusal must name it ("${fragment}"); got ${gm.errors.join(" | ")}`);
  }

  // The CLI's five refusals and the one run that works, all with the credentials deleted. Each must
  // be stopped by its OWN gate: a judge run refused as an unknown flag would start writing the day
  // somebody "fixes" the flag list.
  const kNoCycle = spawnCli(["--judge"]);
  assert.strictEqual(kNoCycle.status, 2, "--judge writes, so it needs a cycle to attribute the write to");
  assert.ok(!kNoCycle.stderr.includes("unknown flag"), `--judge must be a known flag; got: ${kNoCycle.stderr}`);
  assert.ok(kNoCycle.stderr.includes("needs --cycle-id"), `got: ${kNoCycle.stderr}`);
  const kBoard = spawnCli(["--judge", `--cycle-id=${ZERO}`, `--board=${FIXTURE_REL}`]);
  assert.strictEqual(kBoard.status, 2, "--judge over a fixture board is refused on the same terms as --apply");
  assert.ok(kBoard.stderr.includes("never written"), `got: ${kBoard.stderr}`);
  const kNoCreds = spawnCli(["--judge", `--cycle-id=${ZERO}`]);
  assert.strictEqual(kNoCreds.status, 2, "pass one reads the live board, so it needs credentials");
  assert.ok(kNoCreds.stderr.includes("SUPABASE_URL"), `got: ${kNoCreds.stderr}`);
  const kOrphan = spawnCli(["--answer=x.json"]);
  assert.strictEqual(kOrphan.status, 2, "--answer without --judge is a flag that would otherwise be silently ignored");
  assert.ok(kOrphan.stderr.includes("belong to --judge"), `got: ${kOrphan.stderr}`);
  const kDryAlone = spawnCli(["--judge", `--cycle-id=${ZERO}`, "--dry-run"]);
  assert.strictEqual(kDryAlone.status, 2, "--dry-run has nothing to dry-run without an answer");
  assert.ok(kDryAlone.stderr.includes("belongs to --judge --answer"), `got: ${kDryAlone.stderr}`);

  const D = fs.mkdtempSync(path.join(os.tmpdir(), "agt79k-"));
  const statePath = path.join(D, "state.json");
  const answerPath = path.join(D, "answer.json");
  const badPath = path.join(D, "bad.json");
  fs.writeFileSync(statePath, JSON.stringify(state), "utf8");
  fs.writeFileSync(answerPath, JSON.stringify(J.answer), "utf8");
  const noAccount = clone(J.answer);
  delete noAccount.account;
  fs.writeFileSync(badPath, JSON.stringify(noAccount), "utf8");

  // The whole two-pass merge with the writer removed: no credentials, no network, one JSON line.
  const kDry = spawnCli(["--judge", `--answer=${answerPath}`, `--state-file=${statePath}`, "--dry-run"]);
  assert.strictEqual(kDry.status, 0, `--answer --dry-run needs no cycle and no creds; stderr: ${kDry.stderr}`);
  assert.deepStrictEqual(JSON.parse(kDry.stdout), {
    ok: true, dry_run: true, confirmed: 3, refused: 1, unconfirmed: 0,
    fixes: 3, proposed: 0, insert: 8, reseen: 1, clear: 1,
  }, "the dry run must report the same plan the pure half computes");

  const kNoState = spawnCli(["--judge", `--answer=${answerPath}`, `--state-file=${path.join(D, "missing.json")}`, "--dry-run"]);
  assert.strictEqual(kNoState.status, 2, "an answer with no state is an answer about an unknown board");
  assert.ok(kNoState.stderr.includes("run pass one first"), `got: ${kNoState.stderr}`);
  const kRefused = spawnCli(["--judge", `--answer=${badPath}`, `--state-file=${statePath}`, "--dry-run"]);
  assert.strictEqual(kRefused.status, 2, "a refused answer is exit 2, even on a dry run");
  assert.ok(kRefused.stderr.includes("REFUSED and nothing was written"), `got: ${kRefused.stderr}`);
  assert.ok(kRefused.stderr.includes('"account"'), `the refusal must name the offending key; got: ${kRefused.stderr}`);

  // --- L: step 4e fires the JUDGED night (slice 5, source-only) ---------------------------------
  // Part I pins that step 4e exists and that the card is its byte-exact render. This part pins the
  // one line that made the difference between a judgment pass that EXISTS and a judgment pass that
  // has ever RUN: slice 4 shipped the code and the runbook still said `--nightly` alone, so five
  // nights went by arithmetic-only and `ai_activity_log` held zero `ticketowner` rows. Every arm
  // here reads the shipped runbook, not a fixture.
  const md4e = fs.readFileSync(path.join(ROOT, RUNBOOK_REL), "utf8");
  const step4e = md4e.slice(md4e.indexOf("**4e. "), md4e.indexOf("**5. ", md4e.indexOf("**4e. ")));
  const flat4e = step4e.replace(/\s+/g, " ");

  assert.match(step4e, /ticket-owner\.js --nightly --judge --cycle-id=/,
    "step 4e must run the JUDGED night — `--nightly` alone is the line that kept the judgment pass inert");
  assert.ok(flat4e.includes("already run today"),
    "the exit-0 precondition answer survives the judged night: pass one checks the night BEFORE the gate");

  // The ceremony: a cycle that gets exit 3 has to know WHO judges, on WHICH lane, and how the
  // answer comes back. All three or the step is an instruction a cycle cannot follow.
  assert.ok(flat4e.includes("ticketowner"), "the ceremony must name the sub-agent that judges");
  assert.ok(flat4e.includes("judgment"), "the ceremony must name the lane, read live from runner_model_lanes");
  assert.ok(flat4e.includes("--answer="), "the ceremony must name the flag pass two comes back on");

  // The fallback: exit 3 with no Agent tool, or a pass-two refusal, is never a wall.
  assert.ok(flat4e.includes("re-run `--nightly` alone"),
    "the fourth rule must name the unjudged re-run by its exact command — a fallback a cycle has to invent is not a fallback");

  assert.ok(Buffer.byteLength(md4e, "utf8") < 381_000,
    `the runbook is ${Buffer.byteLength(md4e, "utf8")} bytes; SES-336's ceiling is 381000 and this step's edit had to remove bytes before adding them`);

  const card4eLine = fs.readFileSync(path.join(ROOT, CARD_REL), "utf8")
    .split("\n").find(l => l.startsWith("**4e.**"));
  assert.ok(card4eLine && card4eLine.includes("judg"),
    `the card's 4e line must say the night is judged; got: ${card4eLine}`);

  // THE CONTROL, and it is the arm that fails if the edit were cosmetic: the card records the
  // runbook's sha256, so a runbook edited without re-rendering the card leaves the renderer's own
  // check exiting 1. Exit 0 here means the committed card was regenerated against THIS runbook.
  const cardCheck = spawnSync(process.execPath, ["scripts/render-cycle-card.js"], { cwd: ROOT, encoding: "utf8" });
  assert.strictEqual(cardCheck.status, 0,
    `the committed card is stale against the edited runbook — run node scripts/render-cycle-card.js --write; stdout: ${cardCheck.stdout} stderr: ${cardCheck.stderr}`);
  console.log(`[AGT-79] part L: step 4e fires --nightly --judge; runbook ${Buffer.byteLength(md4e, "utf8")}B < 381000; card re-rendered (renderer exit 0)`);

  // --- M: the UNJUDGED night says so (slice 6, pure/source-only) ---------------------------------
  // Part L pinned the runbook line that FIRES the judged night. It fired five times and judged
  // nothing, and the board could not tell: `nightlyNotes` appended the judged tail when pass two
  // ran and NOTHING otherwise, so an arithmetic-only night was byte-identical to a night from
  // before the judgment pass existed. Every arm here is source-only and needs no credentials.

  // (a) and (b): the notes now say which kind of night this was, in both directions. The negative
  // is the arm that was missing, and the positive is the control that proves the tail still lands.
  const mUn = nightlyNotes(censusLine(r), { fixed: 0, inserted: 0, reseen: 170, cleared: 0, decision: null, expires_at: null });
  assert.ok(mUn.endsWith(" · unjudged"),
    `a night that ran without pass two must SAY it went unjudged; got: ${mUn.slice(-60)}`);
  assert.ok(mUn.startsWith(`${NIGHTLY_PREFIX} — `),
    "the tail is longer, the PREFIX is untouched — the precondition and the brief both read it by prefix");
  const mJudged = nightlyNotes(censusLine(r), { fixed: 0, inserted: 0, reseen: 170, cleared: 0, decision: null, expires_at: null },
    { confirmed: 4, refused: 1, unconfirmed: 0, model: "claude-fable-5-1" });
  assert.ok(mJudged.endsWith(" · judged 4/1/0 on claude-fable-5-1"),
    `a judged night still ends in its counts and the model that produced them; got: ${mJudged.slice(-60)}`);
  assert.ok(!mJudged.includes(" · unjudged"),
    "the two tails are exclusive — a judged night must never also carry the unjudged word");

  // The fixtures for the renderer arms. Five nights, newest first, exactly as the REST read orders
  // them. `mNight(judged)` differs in ONE thing: whether the notes carry the judged tail.
  const mNight = (n, judged) => ({
    id: `1111111${n}-2222-4333-8444-55555555555${n}`,
    outcome: "shipped",
    ended_at: `2026-09-1${n}T03:40:00+00:00`,
    notes: `${NIGHTLY_PREFIX} — 855 rows · 170 findings (0 derivable · 170 judgment) · fixed 0 · ` +
      `findings +0 ~170 −0 · no decision (nothing to fix)` +
      (judged ? " · judged 4/1/0 on claude-fable-5-1" : " · unjudged"),
  });
  const streakOf = out => {
    const m = out.match(/\*\*(\d+)\*\* consecutive unjudged/);
    return m ? Number(m[1]) : null;
  };

  // (c) THE DISCRIMINATOR. Two ledgers whose newest night is unjudged in both and which differ ONLY
  // in whether nights 2-4 were judged: one broken streak, one four nights deep. A renderer that
  // reads `run` alone — which is every renderer before this slice — renders these IDENTICALLY, so
  // this pair is what fails against the old code rather than merely passing against the new.
  const mBroken = { ...HYG(), nights: [mNight(5, false), mNight(4, true), mNight(3, true), mNight(2, true), mNight(1, true)] };
  const mDeep = { ...HYG(), nights: [mNight(5, false), mNight(4, false), mNight(3, false), mNight(2, false), mNight(1, true)] };
  const oBroken = renderTicketHygiene(mBroken, "as of X", NOW);
  const oDeep = renderTicketHygiene(mDeep, "as of X", NOW);
  assert.notStrictEqual(oBroken, oDeep,
    "four unjudged nights and one must not render the same bytes — that identity IS the defect this slice closes");
  assert.strictEqual(streakOf(oBroken), 1, `one unjudged night on top of a judged run reads a streak of 1; got: ${oBroken}`);
  assert.strictEqual(streakOf(oDeep), 4, `four consecutive unjudged nights read a streak of 4; got: ${oDeep}`);
  assert.ok(oDeep.includes("ran UNJUDGED"), "the unjudged form names the state in words, not only in a number");
  assert.ok(oDeep.indexOf("- Judgment:") > oDeep.indexOf("- Last run:"),
    "the judgment bullet reads after the run it is about");

  // (d) The other direction, and it must not be the same sentence with a different number: a judged
  // newest night is the YES form, and its streak is a measured 0.
  const oYes = renderTicketHygiene({ ...HYG(), nights: [mNight(5, true), mNight(4, false)] }, "as of X", NOW);
  assert.ok(oYes.includes("the newest night was judged"), `a judged newest night says so; got: ${oYes}`);
  assert.ok(!oYes.includes("ran UNJUDGED"), "the yes form must not also carry the no form's words");
  assert.strictEqual(streakOf(oYes), null, "the yes form reports no consecutive-unjudged count to read");
  assert.ok(oYes.includes("0 unjudged nights on top"), "the yes form still states the streak, as a measured zero");

  // (e) ABSENT IS NOT ZERO — the rule the rest of this group already follows. A ledger that was
  // never read must never render as "0 unjudged nights", which is the opposite claim.
  const oUnread = renderTicketHygiene({ ...HYG(), nights: undefined }, "as of X", NOW);
  assert.ok(oUnread.includes("night ledger was not read"), `an unread night ledger says so; got: ${oUnread}`);
  assert.ok(!oUnread.includes("0 unjudged nights"), "an unread ledger must never render as a measured zero");
  assert.ok(!oUnread.includes("ran UNJUDGED"), "an unread ledger is not evidence of an unjudged night either");
  assert.strictEqual(streakOf(oUnread), null, "no streak can be counted from a ledger that was not read");

  // (f) Purity, the property every group in the brief is held to, re-asserted over the new input.
  assert.strictEqual(renderTicketHygiene(mDeep, "as of X", NOW), oDeep, "the group is pure — same facts, same bytes");
  assert.strictEqual(HYGIENE_NIGHTS_READ, 14, "the nightly read's depth is a named constant, and the streak can only count what it read");
  console.log(`[AGT-79] part M: unjudged notes tail lands; renderer discriminates streak ${streakOf(oDeep)} from ${streakOf(oBroken)} over ${HYGIENE_NIGHTS_READ}-night reads`);

  // --- E: live ---------------------------------------------------------------------------------
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    const why = "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set; run with node --env-file-if-exists=.env.local tests/regression/run-all.js";
    notRun("live census (part E)", why);
    notRun("write pass (part G)", why);
    notRun("judge gate (part K live)", why);
    notRun("lockstep constraint arm (part N)", why);
    notRun("the removal-proposal round trip (part O, AGT-166 slice 4)", why);
    return;
  }

  const url = base.replace(/\/+$/, "");
  const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  async function rest(pathAndQuery, init = {}) {
    const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
    const body = await res.text();   // read once: reading it inside the assert message consumes it
    assert.ok(res.ok, `${init.method ?? "GET"} ${pathAndQuery} returned HTTP ${res.status} ${res.statusText}: ${body}`);
    return body.trim() === "" ? null : JSON.parse(body);
  }

  // Hoisted out of part G (it was defined at the top of the write pass): part N below needs the
  // same exact-count read, and part G still calls it unchanged from further down the same scope.
  async function countWhere(table, query) {
    const res = await fetch(`${url}/rest/v1/${table}?${query}&select=id`, {
      headers: { ...H, Prefer: "count=exact", Range: "0-0" },
    });
    await res.text();
    const total = Number((res.headers.get("content-range") || "").split("/")[1]);
    assert.ok(Number.isFinite(total), `could not count ${table}?${query}`);
    return total;
  }

  // --- N: the lockstep arm — the LIVE constraint must admit every slug CHECKS holds -------------
  // SES-385 appended `remainder-stranded` to CHECKS and never to the table, so the night's one
  // whole-array ledger POST answered 400 / 23514 and no night could land. Feeding the table the
  // code's own vocabulary is the only read that goes red the moment the two drift again: a
  // constraint narrower than CHECKS refuses the array outright, and a row silently dropped fails
  // the count. The cleanup is unconditional, and it is asserted rather than assumed.
  try {
    const nRows = [...CHECKS].map(slug => ({
      backlog_id: "ZZTO-79N",
      check_slug: slug,
      verdict: "judgment",
      detail: "AGT-79 part N lockstep fixture",
      cycle_id: null,
    }));
    const nBack = await rest("ticket_owner_findings", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(nRows),
    });
    assert.strictEqual(nBack.length, CHECKS.length,
      `the ledger must return all ${CHECKS.length} rows, got ${nBack.length}`);
    assert.deepStrictEqual(nBack.map(r => r.check_slug).sort(), [...CHECKS].sort(),
      "the live constraint must admit exactly the slugs CHECKS holds");
    console.log(`[AGT-79] part N: the live constraint admits all ${CHECKS.length} slugs`);
  } finally {
    await rest("ticket_owner_findings?backlog_id=eq.ZZTO-79N", {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    assert.strictEqual(await countWhere("ticket_owner_findings", "backlog_id=eq.ZZTO-79N"), 0,
      "part N left fixture findings on the live ledger");
  }

  const findingsBefore = await restCount(base, key, "ticket_owner_findings");
  const itemsBefore = await restCount(base, key, "backlog_items");

  const outFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "agt79-")), "census.json");
  const live = spawnCli(["--census", `--out=${outFile}`, "--json"], { withCreds: true });
  assert.strictEqual(live.status, 0, `the live census must run; stderr: ${live.stderr}`);
  const census = JSON.parse(live.stdout);

  assert.ok(census.counts.rows >= 800, `the live board read only ${census.counts.rows} rows`);
  assert.ok(Number.isFinite(census.rate) && census.rate > 0,
    `the cost rate must be a positive finite number, got ${census.rate}`);

  // SES-422: PART E LIVE ASSERTS EACH CHECK'S PROPERTY, NEVER A ROW'S IDENTITY. The arms this
  // replaces pinned today's board -- SES-141 as the one claim-on-closed row, LOG-143 / SES-245 as
  // the cycles-over-quote pair, SES-131 / SES-208 as the only derivable type spellings. Each of
  // those is a fact about the board's CONTENTS, so the board moving (a new over-quote close, a
  // fixed claim) reddens a test that the census never broke, which is environmental noise and not
  // a regression. What is actually invariant is the RELATION between each finding and the live row
  // it names: a claim-on-closed row is closed and its fix clears both claim columns; an over-quote
  // finding's own detail carries actual > predicted; a derivable type fix is exactly TYPE_MAP's
  // image of the live type. Those hold on any board, and every one of them fails if the classifier
  // drifts. Zero findings of a check passes its loop -- the counts are the fixture arms' job.
  const liveRows = new Map();
  const liveIds = [...new Set(census.findings
    .filter(f => ["claim-on-closed", "cycles-over-quote", "type-off-taxonomy"].includes(f.check))
    .map(f => f.backlog_id))];
  if (liveIds.length) {
    // ONE read for all three checks' findings, so the arms below compare against the live row
    // rather than against the census's own copy of it.
    for (const r of await rest(`backlog_items?backlog_id=in.(${liveIds.join(",")})&select=backlog_id,status,type,claimed_by`)) {
      liveRows.set(r.backlog_id, r);
    }
  }
  const rowFor = (f) => {
    const row = liveRows.get(f.backlog_id);
    assert.ok(row, `${f.check} named ${f.backlog_id}, which the live board does not carry`);
    return row;
  };

  for (const f of census.findings.filter(f => f.check === "claim-on-closed")) {
    const row = rowFor(f);
    assert.ok(["done", "delivered"].includes(row.status),
      `claim-on-closed named ${f.backlog_id}, whose live status reads ${row.status} -- the check fires only on a closed row`);
    assert.strictEqual(f.verdict, "derivable",
      `clearing a claim off a closed row is derivable, never a judgment; ${f.backlog_id} reads ${f.verdict}`);
    assert.deepStrictEqual(f.fix, { claimed_by: null, claimed_at: null },
      `a cleared claim clears both columns, never just the holder; ${f.backlog_id} fixes ${JSON.stringify(f.fix)}`);
  }

  for (const f of census.findings.filter(f => f.check === "cycles-over-quote")) {
    assert.strictEqual(f.verdict, "judgment",
      `overrunning a quote is a judgment call, never derivable; ${f.backlog_id} reads ${f.verdict}`);
    assert.ok(!("fix" in f), `a judgment finding carries no fix; ${f.backlog_id} carries ${JSON.stringify(f.fix)}`);
    const m = f.detail.match(/actual_cycles reads (\d+) against predicted_cycles (\d+)\./);
    assert.ok(m, `every cycles-over-quote finding must quote both numbers; got: ${f.detail}`);
    assert.ok(Number(m[1]) > Number(m[2]),
      `${f.backlog_id} is only over quote if actual exceeds predicted; its detail reads ${m[1]} against ${m[2]}`);
  }

  // The one-to-one property: a derivable type fix is TYPE_MAP's image of the row's live type, and
  // nothing else. A judgment finding is free-form, so the predicate passes it through.
  const oneToOne = (f, rowType) =>
    f.verdict !== "derivable" || (Object.hasOwn(TYPE_MAP, rowType) && f.fix?.type === TYPE_MAP[rowType]);
  // NEGATIVE CONTROLS, pure -- these are what stop `oneToOne` degenerating into "true".
  assert.strictEqual(oneToOne({ verdict: "derivable", fix: { type: "Feature" } }, "Architecture"), false,
    "a type the map does not carry can never be derived, whatever fix the census proposes");
  assert.strictEqual(oneToOne({ verdict: "derivable", fix: { type: "Feature" } }, "feature"), true,
    "the casing slip IS one-to-one, so the same fix against the mapped type must pass");
  for (const f of census.findings.filter(f => f.check === "type-off-taxonomy")) {
    const row = rowFor(f);
    assert.ok(oneToOne(f, row.type),
      `${f.backlog_id} reads type ${row.type}: a derivable fix must be TYPE_MAP's image of it, got ${JSON.stringify(f.fix)}`);
    if (f.verdict === "judgment") {
      assert.ok(!Object.hasOwn(TYPE_MAP, row.type) && !TYPE_TAXONOMY.includes(row.type),
        `${f.backlog_id} reads type ${row.type}, which the taxonomy or the map does carry -- it is not a judgment call`);
    }
  }

  const unaccepted = census.findings.filter(f => f.check === "delivered-unaccepted");
  if (unaccepted.length < 4) {
    // The return is the kickoff's shape, and it takes the rest of E, K live and G with it -- so
    // each is DECLARED here rather than dropped into the silence a bare return would leave
    // (SES-180: a part the run could not exercise says so, and is never counted as a pass).
    const why = `board holds ${unaccepted.length} delivered-unaccepted rows, needs 4`;
    notRun("live delivered-unaccepted arm", why);
    notRun("live census no-write negative (rest of part E)", why);
    notRun("judge gate (part K live)", why);
    notRun("write pass (part G)", why);
    notRun("the removal-proposal round trip (part O, AGT-166 slice 4)", why);
    return;
  }

  for (const f of census.findings.filter(f => f.check === "cost-snapshot-missing")) {
    assert.strictEqual(f.fix.cost_pct_snapshot, Math.round(f.fix.cost_cycles_snapshot * census.rate * 100) / 100,
      `${f.backlog_id}'s cost fix does not match the rate it claims to have used`);
  }

  // THE NEGATIVE THAT DEFINES A CENSUS: the same binary that CAN write read the whole board with
  // no --apply and changed nothing. Now that the write pass exists, this is the arm that proves
  // writing is a flag rather than a default.
  assert.strictEqual(await restCount(base, key, "ticket_owner_findings"), findingsBefore,
    "a census without --apply must not write, touch or clear a findings row");
  assert.strictEqual(await restCount(base, key, "backlog_items"), itemsBefore, "the census must not have touched the board");

  // --- K live: the capability gate ---------------------------------------------------------------
  // This half shipped AHEAD of its seed, so the arm branches on the ROW rather than asserting one
  // outcome: exit 2 while `capabilities` has no audit-board row, exit 3 once John applies the seed.
  // What does NOT branch is the negative — pass one never writes, whichever side of the gate it
  // lands on, and that is the property this arm exists to pin.
  const WRITE_TABLES = ["runner_cycles", "runner_decisions", "ticket_owner_findings", "runner_before_images"];
  const kBefore = [];
  for (const t of WRITE_TABLES) kBefore.push(await restCount(base, key, t));

  const liveStatePath = statePathFor(os.tmpdir(), ZERO);
  try {
    const g1 = spawnCli(["--judge", `--cycle-id=${ZERO}`], { withCreds: true });
    assert.ok(!g1.stderr.includes("unknown flag"), `--judge must be a known flag live too; got: ${g1.stderr}`);
    if (g1.status === 2) {
      assert.ok(g1.stderr.includes("no audit-board row"),
        `without the seed the gate must say which row is missing; got: ${g1.stderr}`);
      assert.ok(g1.stderr.includes("agt-79-ticket-owner-seed.sql"),
        `the refusal must name the file John has to apply; got: ${g1.stderr}`);
      assert.strictEqual(g1.stdout, "", "a refused pass one prints no prompt at all");
      assert.ok(!fs.existsSync(liveStatePath), "a refused pass one writes no state file");
    } else {
      assert.strictEqual(g1.status, EXIT_AWAITING_ANSWER,
        `the seed has landed, so pass one must assemble and exit 3; stderr: ${g1.stderr}`);
      assert.ok(g1.stdout.length > 1000, `exit 3 means a prompt was printed; got ${g1.stdout.length} bytes`);
      assert.ok(g1.stderr.includes("pass one complete"), `got: ${g1.stderr}`);
      assert.ok(fs.existsSync(liveStatePath), "pass one's whole product is the state file and the prompt");
    }
    console.log(`[AGT-79] part K live: gate answered ${g1.status}`);
  } finally {
    if (fs.existsSync(liveStatePath)) fs.unlinkSync(liveStatePath);
  }

  for (let i = 0; i < WRITE_TABLES.length; i++) {
    assert.strictEqual(await restCount(base, key, WRITE_TABLES[i]), kBefore[i],
      `pass one wrote a ${WRITE_TABLES[i]} row — it must read and print, never write`);
  }

  // --- G: the write pass, live and rolled back --------------------------------------------------
  const S = `agt-79-qa:${Date.now()}`;
  const RATE = 0.444444444444444;
  const now = new Date().toISOString();
  const T49 = new Date(Date.now() - 49 * 3600 * 1000).toISOString();
  const PROJECTION = "id,backlog_id,status,type,tier,claimed_by,claimed_at,predicted_cycles,size_stamp," +
    "design_status,kickoff_link,cost_pct_snapshot,cost_cycles_snapshot,revalidated_at,filed_at,created_at," +
    "updated_at,actual_tokens_attended";
  const readFixture = () => rest(`backlog_items?backlog_id=like.ZZTO-79*&order=backlog_id&select=${PROJECTION}`);

  let passed = false;
  try {
    // (1) Four one-variable fixture rows on the REAL board. A previous run that died mid-way would
    // leave residue behind, so this clears first rather than colliding on backlog_id.
    await rest("backlog_items?backlog_id=like.ZZTO-79*", { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const FIXTURE_ROWS = [
        { backlog_id: "ZZTO-791", tier: "later", type: "Tooling", priority_class: "P10 - Tooling", status: "done",
          title: "AGT-79 fixture: done row still claimed — inserted and deleted by agt-79-ticket-owner.test.mjs",
          description: "Fixture. Never a real ticket.", source_file: "tests/regression/agt-79-ticket-owner.test.mjs", row_ordinal: 999791,
          claimed_by: "zz-stale", claimed_at: "2026-09-01T00:00:00+00:00", predicted_cycles: 1, size_stamp: "S",
          cost_pct_snapshot: 0.44, cost_cycles_snapshot: 1, cost_snapshot_rate: 0.444444444444444, cost_snapshot_at: "2026-09-10T00:00:00+00:00" },
        { backlog_id: "ZZTO-792", tier: "later", type: "Tooling", priority_class: "P10 - Tooling", status: "delivered",
          title: "AGT-79 fixture: delivered 49 h ago, never accepted — inserted and deleted by agt-79-ticket-owner.test.mjs",
          description: "Fixture. Never a real ticket.", source_file: "tests/regression/agt-79-ticket-owner.test.mjs", row_ordinal: 999792,
          predicted_cycles: 1, size_stamp: "S", cost_pct_snapshot: 0.44, cost_cycles_snapshot: 1,
          cost_snapshot_rate: 0.444444444444444, cost_snapshot_at: "2026-09-10T00:00:00+00:00", updated_at: T49 },
        { backlog_id: "ZZTO-793", tier: "later", type: "Tooling", priority_class: "P10 - Tooling", status: "open",
          title: "AGT-79 fixture: open, quoted nothing — inserted and deleted by agt-79-ticket-owner.test.mjs",
          description: "Fixture. Never a real ticket.", source_file: "tests/regression/agt-79-ticket-owner.test.mjs", row_ordinal: 999793,
          size_stamp: "S" },
        { backlog_id: "ZZTO-794", tier: "later", type: "Tooling", priority_class: "P10 - Tooling", status: "open",
          title: "AGT-79 fixture: filed before the fences — inserted and deleted by agt-79-ticket-owner.test.mjs",
          description: "Fixture. Never a real ticket.", source_file: "tests/regression/agt-79-ticket-owner.test.mjs", row_ordinal: 999794,
          filed_at: "2026-08-01T00:00:00+00:00", created_at: "2026-08-01T00:00:00+00:00", updated_at: "2026-08-01T00:00:00+00:00" },
    ];
    // The four rows deliberately carry DIFFERENT key sets -- that IS the one-variable discipline --
    // and a PostgREST bulk insert refuses a ragged array outright ("All object keys must match").
    // Naming the union in ?columns= does not rescue it either: an omitted key is then inserted as
    // NULL rather than taking the column's default, which trips created_at's NOT NULL. So the
    // array is squared off here: every row carries every key, the three NOT NULL stamps fall back
    // to this run's clock, and every other absence is an explicit null (which is what the fixture
    // meant by omitting it). A row that names a stamp itself -- 792's T49, 794's pre-fence dates --
    // keeps its own.
    const COLUMNS = [...new Set(FIXTURE_ROWS.flatMap(Object.keys))];
    const STAMPS = { created_at: now, filed_at: now, updated_at: now };
    const inserted = await rest("backlog_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(FIXTURE_ROWS.map(row =>
        Object.fromEntries(COLUMNS.map(c => [c, c in row ? row[c] : (STAMPS[c] ?? null)])))),
    });
    assert.strictEqual(inserted.length, 4, "the four fixture rows must all insert");
    const id791 = inserted.find(x => x.backlog_id === "ZZTO-791").id;
    const upd791 = inserted.find(x => x.backlog_id === "ZZTO-791").updated_at;
    const id794 = inserted.find(x => x.backlog_id === "ZZTO-794").id;
    const upd794 = inserted.find(x => x.backlog_id === "ZZTO-794").updated_at;

    // (2) Census the four rows through the REAL projection readBoard() uses -- a column the census
    // reads but this test forgot to select would classify as null and quietly change the answer.
    // AGT-166 slice 2 defect (v7.0.675): the premise text for ZZTO-794 IS read here, exactly as
    // readBoard() reads it for the ≤25 rows of a real night. That is what makes the thirteenth check
    // `derivable` rather than `judgment`, and a derivable revalidation carries `fix:
    // {revalidated_at}` — so this part now drives a timestamptz through the live PATCH and its
    // read-back, which is the only place the `...Z` vs `...+00:00` defect is visible. Without this
    // entry the row files a ledger line and nothing is ever stamped, and the defect that lost seven
    // of the 2026-09-28 night's fourteen fixes cannot be caught by any test in this suite.
    const premises = [{
      backlog_id: "ZZTO-794",
      title: "AGT-79 fixture: filed before the fences — inserted and deleted by agt-79-ticket-owner.test.mjs",
      description: "Fixture. Never a real ticket.",
      priority_class: "P10 - Tooling",
    }];
    const board = { items: await readFixture(), matrix: [], verdicts: [], accepts: [], decisions: [], openCycles: [], ownerFindings: [], premises };
    const r1 = classifyBoard(board, { now, rate: RATE, retired: NO_RETIREMENT });
    assert.deepStrictEqual(r1.counts, { rows: 4, findings: 6, derivable: 2, judgment: 4 },
      "the four fixture rows must classify to two derivable fixes — the stale claim and 794's re-read premise — and four judgment findings");
    assert.deepStrictEqual(byCheck(r1, "unrevalidated-30d"), ["ZZTO-794"]);
    assert.deepStrictEqual(byCheck(r1, "claim-on-closed"), ["ZZTO-791"]);

    // (3) Plan against an empty ledger: everything is new tonight.
    const plan1 = planWrites(r1, [], board.items, { rate: RATE, judged: true });
    assert.strictEqual(plan1.fixes.length, 2, "the stale claim and 794's revalidation stamp are both derivable tonight");
    assert.deepStrictEqual([...plan1.fixes].map(f => f.id).sort(), [id791, id794].sort(),
      "both fixes must address their row by the primary key the insert returned, never by backlog_id");
    const fix794 = plan1.fixes.find(f => f.id === id794);
    assert.deepStrictEqual(Object.keys(fix794.patch), ["revalidated_at"],
      "a revalidation writes ONE column: never status, and never updated_at (SES-316)");
    assert.strictEqual(plan1.ledger.insert.length, 4,
      "a CONFIRMED premise files no ledger row at all (AGT-169) — 794's finding became a fix, so four judgment rows remain");

    // (4) THE WRITE.
    // THIS CALL IS THE LIVE HALF OF THE v7.0.675 FIX. applyPlan reads every patch back key by key;
    // 794's `revalidated_at` goes out as `...Z` and comes back as `...+00:00`. Before the fix the
    // comparison was a string compare with one hardcoded escape for `cost_snapshot_at`, so this line
    // never returned — the process exited 2 with the write already landed.
    const res1 = await applyPlan(url, key, plan1, { sessionName: S, now });
    assert.strictEqual(res1.fixed, 2);
    assert.strictEqual(res1.proposed, 0, "nothing was refused on this board, so no row was proposed for removal");
    assert.strictEqual(res1.inserted, 4);
    assert.strictEqual(res1.reseen, 0);
    assert.strictEqual(res1.cleared, 0);
    assert.strictEqual(typeof res1.decision, "string", "the write pass must return the decision id John reverses");
    assert.strictEqual(typeof res1.expires_at, "string", "a decision John cannot see the expiry of is not reversible in practice");

    // (5) The board moved exactly where it was told to, and nowhere else.
    const after = (await readFixture()).find(x => x.backlog_id === "ZZTO-791");
    assert.strictEqual(after.claimed_by, null, "the claim must actually be cleared on the live row");
    assert.strictEqual(after.claimed_at, null);
    assert.strictEqual(after.status, "done", "the write pass never writes status");
    assert.strictEqual(after.updated_at, upd791,
      "updated_at must be untouched -- a stamp later than the decision's decided_at makes reverse_decision() refuse this row (SES-316)");
    const fixtureAfter = await readFixture();
    const after794 = fixtureAfter.find(x => x.backlog_id === "ZZTO-794");
    assert.strictEqual(Date.parse(after794.revalidated_at), Date.parse(now),
      `794's stamp must be the census instant, whatever spelling PostgREST returns it in — read ${after794.revalidated_at}, wrote ${now}`);
    assert.notStrictEqual(after794.revalidated_at, now,
      "and the spellings really do differ on the wire — if they were byte-equal this arm would prove nothing about the defect");
    assert.strictEqual(after794.status, "open", "a revalidation stamps the row and never touches its status");
    assert.strictEqual(after794.updated_at, upd794,
      "updated_at must be untouched here too, or reverse_decision() refuses 794's row (SES-316)");
    assert.strictEqual(fixtureAfter.find(x => x.backlog_id === "ZZTO-792").status, "delivered",
      "a judgment finding writes the ledger, never the row it is about");
    assert.strictEqual(fixtureAfter.find(x => x.backlog_id === "ZZTO-793").predicted_cycles, null,
      "the write pass never fills a quote -- that is John's number, not arithmetic");

    const dec = (await rest(`runner_decisions?id=eq.${res1.decision}&select=kind,backlog_id,session_name,cycle_id,ladder_work_class,status,summary,reasoning`))[0];
    assert.strictEqual(dec.kind, "hygiene");
    assert.strictEqual(dec.backlog_id, "AGT-79");
    assert.strictEqual(dec.session_name, S);
    assert.strictEqual(dec.cycle_id, null, "exactly one of cycle_id / session_name -- this run is the session side");
    assert.strictEqual(dec.ladder_work_class, null, "hygiene moves no rung on the ladder");
    assert.strictEqual(dec.status, "open");
    assert.ok(dec.summary.startsWith("Ticket Owner: 2 derivable cell fix(es) on 2 row(s)"), `summary reads: ${dec.summary}`);
    assert.ok(dec.reasoning.includes("pattern:0"), "the reasoning must carry the no-standing-pattern handle");

    const imgs = await rest(`runner_before_images?decision_id=eq.${res1.decision}&select=table_name,pk_value,row_data`);
    assert.strictEqual(imgs.length, 2, `expected one before-image per patched row under decision ${res1.decision}, got ${imgs.length}`);
    assert.deepStrictEqual([...imgs].map(i => i.pk_value).sort(), [id791, id794].sort(),
      "the images address their rows by primary key, not by backlog_id");
    const img791 = imgs.find(i => i.pk_value === id791);
    const img794 = imgs.find(i => i.pk_value === id794);
    for (const img of imgs) {
      assert.strictEqual(img.table_name, "backlog_items");
      assert.strictEqual(typeof img.row_data.title, "string",
        "the image must be the FULL row: reverse_decision() rewrites every column from row_data, so a partial image restores a partial row");
    }
    assert.strictEqual(img791.row_data.claimed_by, "zz-stale", "the image must hold the PRIOR state -- an image of the new state restores nothing");
    assert.strictEqual(img794.row_data.revalidated_at, null,
      "794's image must hold the NULL stamp -- an image taken after the write would restore the stamp it was meant to undo");

    const nullImgs = await rest(`runner_before_images?session_name=eq.${encodeURIComponent(S)}&table_name=eq.ticket_owner_findings&select=pk_value,row_data,decision_id`);
    assert.strictEqual(nullImgs.length, 4, "every ledger row the night invented gets its own null-row image -- four, not five, now 794 is a fix");
    for (const img of nullImgs) {
      assert.strictEqual(img.row_data, null, "a null row_data is how the chain says this row did not exist before");
      assert.strictEqual(img.decision_id, null, "the findings images hang off the session, not off the board's decision");
    }

    const led = await rest("ticket_owner_findings?backlog_id=like.ZZTO-79*&order=backlog_id,check_slug&select=id,backlog_id,check_slug,verdict,first_seen_at,last_seen_at,cleared_at,cycle_id");
    assert.deepStrictEqual(led.map(x => [x.backlog_id, x.check_slug]), [
      ["ZZTO-791", "verdict-missing"],
      ["ZZTO-792", "delivered-unaccepted"],
      ["ZZTO-792", "verdict-missing"],
      ["ZZTO-793", "quote-missing"],
      // AGT-166 slice 2 defect (v7.0.675): ZZTO-794 is NOT here, and its absence is an assertion.
      // Its premise was read and confirmed, so the night stamped the row and filed nothing — a
      // confirmed premise files no ledger row at all (AGT-169). A `["ZZTO-794",
      // "unrevalidated-30d"]` line reappearing here means the premise stopped reaching the census
      // and the drain went back to asking instead of draining.
    ], "exactly the four judgment findings reach the ledger, one row per (ticket, check)");
    for (const x of led) {
      assert.strictEqual(x.verdict, "judgment");
      assert.strictEqual(x.cleared_at, null, "a finding filed tonight is open, never born cleared");
      assert.strictEqual(x.cycle_id, null, "a session-attributed run files no cycle id");
      assert.strictEqual(Date.parse(x.first_seen_at), Date.parse(x.last_seen_at), "a finding's first night is also its latest");
    }

    // (6) SECOND NIGHT, unchanged board: the fix is already made, so nothing is written but a touch.
    const now2 = new Date(Date.now() + 1000).toISOString();
    const board2 = { ...board, items: await readFixture() };
    const r2 = classifyBoard(board2, { now: now2, rate: RATE, retired: NO_RETIREMENT });
    assert.strictEqual(r2.counts.derivable, 0,
      "neither cell the first night fixed may be found again -- 794 now carries a stamp, so it leaves the fence population entirely");
    assert.strictEqual(r2.counts.findings, 4);
    const priorLed = led.map(x => ({ id: x.id, backlog_id: x.backlog_id, check_slug: x.check_slug }));
    const plan2 = planWrites(r2, priorLed, board2.items, { rate: RATE, judged: true });
    assert.deepStrictEqual(plan2.fixes, []);
    assert.deepStrictEqual(plan2.ledger.insert, [], "a finding already on the ledger is touched, never duplicated");
    assert.strictEqual(plan2.ledger.reseen.length, 4);
    assert.deepStrictEqual(plan2.ledger.clear, []);

    const res2 = await applyPlan(url, key, plan2, { sessionName: S, now: now2 });
    // AGT-131 (v7.0.596): the return gained `raised` -- step 6 raises one audit_findings `gap` per
    // check still holding open judgment rows. It is 0 here BY CONSTRUCTION and that is the
    // assertion: this call passes no `prior`, and with no ledger to compute `prior ∪ insert − clear`
    // from, applyPlan raises nothing rather than guessing from `insert` alone. That is also what
    // keeps this fixture out of a table whose guard refuses every DELETE.
    assert.deepStrictEqual(res2, { decision: null, expires_at: null, fixed: 0, proposed: 0, inserted: 0, reseen: 4, cleared: 0, raised: 0 },
      "a night with nothing to fix records NO decision -- an empty decision row is noise John has to read");
    assert.strictEqual((await rest(`runner_decisions?session_name=eq.${encodeURIComponent(S)}&select=id`)).length, 1,
      "two nights, one decision: the second wrote no board cell, so it decided nothing");

    const led2 = await rest("ticket_owner_findings?backlog_id=like.ZZTO-79*&order=backlog_id,check_slug&select=id,first_seen_at,last_seen_at,cleared_at");
    assert.deepStrictEqual(led2.map(x => x.id), priorLed.map(x => x.id), "the second night must touch the SAME rows, not replace them");
    for (const x of led2) {
      assert.ok(Date.parse(x.last_seen_at) > Date.parse(x.first_seen_at), "a re-seen finding advances last_seen_at and keeps first_seen_at -- the age of a gap is the point");
      assert.strictEqual(x.cleared_at, null);
    }

    // (7) CLEAR CONTROL, pure: a prior finding the board no longer shows must clear. Without this,
    // a planner that never cleared anything would pass every arm above.
    const ghosted = planWrites(r2, [...priorLed, { id: "ghost", backlog_id: "ZZTO-791", check_slug: "claim-on-closed" }], board2.items, { rate: RATE, judged: true });
    assert.deepStrictEqual(ghosted.ledger.clear, ["ghost"], "a finding that is no longer true tonight clears");

    // (8) THE WHOLE POINT: one decision id puts every cell back.
    const rev = (await rest("rpc/reverse_decision", {
      method: "POST",
      body: JSON.stringify({ p_decision: res1.decision, p_actor: S, p_reason: "fixture rollback" }),
    }))[0];
    assert.strictEqual(rev.outcome, "applied", `reverse_decision returned ${JSON.stringify(rev)}`);
    assert.strictEqual(rev.restored, 2, "one decision id puts BOTH cells back -- the claim and the stamp");
    assert.strictEqual(rev.refused, 0);
    assert.strictEqual(rev.refused_written_since, 0, "a refusal here means the write pass bumped updated_at and locked itself out");
    assert.strictEqual(typeof rev.reversal_id, "string");

    const restoredRows = await readFixture();
    const restored = restoredRows.find(x => x.backlog_id === "ZZTO-791");
    assert.strictEqual(restored.claimed_by, "zz-stale", "the reversal must put the ORIGINAL claim back");
    assert.strictEqual(Date.parse(restored.claimed_at), Date.parse("2026-09-01T00:00:00+00:00"));
    assert.strictEqual(restored.status, "done", "the reversal restores the whole row, including the columns nobody wrote");
    assert.strictEqual(restoredRows.find(x => x.backlog_id === "ZZTO-794").revalidated_at, null,
      "and 794 goes back to never-revalidated -- a stamp the reversal cannot undo would make the drain unreversible");

    console.log(`[AGT-79] part G: decision ${res1.decision} (expires ${res1.expires_at}) — ` +
      `${res1.fixed} fix, ${res1.inserted} findings, reversed: restored ${rev.restored} refused ${rev.refused}`);
    passed = true;
  } finally {
    // Order matters: runner_before_images.decision_id FKs runner_decisions, and the reversal row
    // references the decision it reverses.
    const del = q => fetch(`${url}/rest/v1/${q}`, { method: "DELETE", headers: H }).catch(() => {});
    await del("ticket_owner_findings?backlog_id=like.ZZTO-79*");
    await del(`runner_before_images?session_name=eq.${encodeURIComponent(S)}`);
    await del(`runner_decisions?session_name=eq.${encodeURIComponent(S)}&kind=eq.reversal`);
    await del(`runner_decisions?session_name=eq.${encodeURIComponent(S)}`);
    await del("backlog_items?backlog_id=like.ZZTO-79*");
  }

  // Asserted AFTER the finally, and only when the arms above actually passed: a test that leaves
  // fixture rows on the live board is a worse failure than the one it was trying to report.
  if (passed) {
    assert.strictEqual(await countWhere("ticket_owner_findings", "backlog_id=like.ZZTO-79*"), 0, "part G left findings rows on the live ledger");
    assert.strictEqual(await countWhere("backlog_items", "backlog_id=like.ZZTO-79*"), 0, "part G left fixture tickets on the live board");
    assert.strictEqual(await countWhere("runner_before_images", `session_name=eq.${encodeURIComponent(S)}`), 0, "part G left before-images behind");
    assert.strictEqual(await countWhere("runner_decisions", `session_name=eq.${encodeURIComponent(S)}`), 0, "part G left decision rows behind");
  }

  // --- O: A JUDGED REFUSAL IS A REMOVAL PROPOSAL (AGT-166 slice 4) -------------------------------
  // The pure half first, then the same path live on one fixture row and reversed.
  //
  // WHY THIS PART EXISTS. Arm (b) drained a premise it could CONFIRM and had no exit at all for one
  // it refused: the twelve refusals of the first completed night sat in `ticket_owner_findings` as
  // open rows, re-filed nightly, and nothing could rule them -- AGT-169's ruler rules a CHECK, never
  // a row. On 1ae77169 a refused `ZZTO-795` files a ledger row and stays `open` forever; after slice 4
  // it reads `removal proposed` under its own decision and ONE Reverse puts it back in the drain.
  //
  // (i) THE MERGE: a refused PREMISE carries the judge's reason as its proposal; a refused arithmetic
  // fix carries none. Both directions, because a `proposal` on a refused cost stamp would be a removal
  // waiting for a widened filter to find it.
  const oWindow = chicagoDay(NOW166);
  const oClaimFix = {
    backlog_id: "ZQTO-30", check: "claim-on-closed", verdict: "derivable",
    detail: "claimed_by is set on a done ticket.", fix: { claimed_by: null, claimed_at: null },
  };
  const oCensus = {
    findings: [...d1.findings, oClaimFix],
    backlog: d1.backlog,
    counts: { rows: d1.counts.rows, findings: d1.counts.findings + 1, derivable: d1.counts.derivable + 1, judgment: d1.counts.judgment },
  };
  // 25 revalidation stamps + 1 claim clear, and the split between them is exactly `judged`.
  assert.strictEqual(planWrites(oCensus, [], DRAIN, { rate: 0.5 }).fixes.length, 1,
    "an UNJUDGED night writes the twelve arithmetic checks and NOT the premise re-reads — one claim clear, no stamps");
  assert.deepStrictEqual(planWrites(oCensus, [], DRAIN, { rate: 0.5 }).fixes.map(f => f.check), ["claim-on-closed"],
    "and the one write it does make is the column's own rule, never a reading of a premise");
  assert.strictEqual(planWrites(oCensus, [], DRAIN, { rate: 0.5, judged: true }).fixes.length, 26,
    "a JUDGED night writes all 26 — the gate is the judge, not the check");

  const oState = {
    version: 1, started_at: NOW166, cycle_id: "00000000-0000-4000-8000-000000000000", nightly: false,
    capability: "audit-board", intent: "to-audit-intent", agent: "ticketowner",
    model: "claude-fable-5-1", schema: J.schema, now: NOW166, rate: 0.5, window: oWindow,
    census: { measured_at: NOW166, rate: 0.5, fences: FENCES, counts: oCensus.counts, backlog: oCensus.backlog, findings: oCensus.findings },
    prior: [{ id: "o-prior", backlog_id: "ZQTO-05", check_slug: REVALIDATION_CHECK, first_seen_at: "2026-09-20T03:00:00+00:00" }],
    items: DRAIN.map(i => ({ id: i.id, backlog_id: i.backlog_id })),
  };
  const O_REASON = "ZQTO-99 shipped this premise on 2026-09-01; nothing here is left to build.";
  const oAnswer = {
    window: oWindow,
    fixes: [
      { backlog_id: "ZQTO-01", check: REVALIDATION_CHECK, apply: false, reason: O_REASON },
      { backlog_id: "ZQTO-30", check: "claim-on-closed", apply: false, reason: "The close-out may still be in flight." },
    ],
    findings: [],
    report: "AGT-166 slice 4 part O: one premise refused, one claim clear declined.",
    account: "Refused one stale premise and declined one claim clear",
  };
  const og = ingestJudgment(oAnswer, oState);
  assert.deepStrictEqual(og.errors, [], `the answer must be accepted; got: ${og.errors.join(" | ")}`);
  assert.strictEqual(og.judged.refused, 2, "both fixes were refused");
  const oRefused = only(og.result, "ZQTO-01", REVALIDATION_CHECK);
  assert.strictEqual(oRefused.verdict, "judgment", "a refused fix is never still a write");
  assert.deepStrictEqual(oRefused.proposal, { reason: O_REASON },
    "a refused PREMISE carries the judge's own reason as its removal proposal — never a re-derived sentence");
  assert.strictEqual(oRefused.detail, `${REFUSED_PREFIX}${O_REASON}`,
    "and the detail is the prefixed reason, which is what a carried row replays from a night later");
  assert.ok(!("proposal" in only(og.result, "ZQTO-30", "claim-on-closed")),
    "CONTROL: a refused CLAIM fix proposes nothing — declining one arithmetic write says nothing about whether the ticket should exist");
  const oUnconfirmed = only(og.result, "ZQTO-02", REVALIDATION_CHECK);
  assert.ok(oUnconfirmed.detail.startsWith("judge: not confirmed"), `an unmentioned fix is unconfirmed; got: ${oUnconfirmed.detail.slice(0, 30)}`);
  assert.ok(!("proposal" in oUnconfirmed),
    "silence is not a refusal: an UNCONFIRMED premise is neither stamped nor proposed for removal");

  // (ii) THE PLAN: one proposal, no ledger row for the slug in either direction, and the prior row
  // clears rather than being carried into a thirteenth night.
  const oPlan = planWrites(og.result, oState.prior, DRAIN, { rate: 0.5, judged: og.judged });
  assert.deepStrictEqual(oPlan.fixes, [], "nothing was confirmed, so nothing is written to a cell");
  assert.deepStrictEqual(oPlan.proposals.map(p => [p.backlog_id, p.reason]), [["ZQTO-01", O_REASON]],
    "the one refusal is the one removal proposal");
  assert.ok(!oPlan.ledger.insert.some(f => f.check_slug === REVALIDATION_CHECK),
    "a refusal files NO `unrevalidated-30d` row — it writes the board instead, which is the exit the slug never had");
  assert.deepStrictEqual(oPlan.ledger.insert.map(f => f.check_slug), ["claim-on-closed"],
    "the refused arithmetic fix still files its judgment row: only the thirteenth check stopped filing");
  assert.deepStrictEqual(oPlan.ledger.clear, ["o-prior"],
    "and the prior revalidation row clears — one replay each, then gone, or board-stale carries it forever");

  // (iii) LIVE, WRITTEN, AND REVERSED. One fixture row, born before the fence, refused, and put back.
  const S2 = `agt-166-s4-qa:${Date.now()}`;
  const now3 = new Date().toISOString();
  const read795 = () => rest(`backlog_items?backlog_id=eq.ZZTO-795&select=${PROJECTION}`);
  let passed2 = false;
  try {
    await rest("backlog_items?backlog_id=eq.ZZTO-795", { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const ins795 = await rest("backlog_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        backlog_id: "ZZTO-795", tier: "later", type: "Tooling", priority_class: "P10 - Tooling", status: "open",
        title: "AGT-166 fixture: a premise the judge refuses — inserted and deleted by agt-79-ticket-owner.test.mjs",
        description: "Fixture. Never a real ticket.", source_file: "tests/regression/agt-79-ticket-owner.test.mjs",
        row_ordinal: 999795, predicted_cycles: 1, size_stamp: "S",
        filed_at: "2026-08-01T00:00:00+00:00", created_at: "2026-08-01T00:00:00+00:00", updated_at: "2026-08-01T00:00:00+00:00",
      }]),
    });
    assert.strictEqual(ins795.length, 1, "the fixture premise must insert");
    const id795 = ins795[0].id;
    const upd795 = ins795[0].updated_at;

    // The census, with the premise text read exactly as readBoard() reads it for tonight's batch --
    // which is what makes the finding `derivable` and therefore refusable at all.
    const board795 = {
      items: await read795(), matrix: [], verdicts: [], accepts: [], decisions: [], openCycles: [],
      ownerFindings: [],
      premises: [{
        backlog_id: "ZZTO-795",
        title: "AGT-166 fixture: a premise the judge refuses — inserted and deleted by agt-79-ticket-owner.test.mjs",
        description: "Fixture. Never a real ticket.", priority_class: "P10 - Tooling",
      }],
    };
    const r795 = classifyBoard(board795, { now: now3, rate: RATE, retired: NO_RETIREMENT });
    assert.deepStrictEqual(byCheck(r795, REVALIDATION_CHECK), ["ZZTO-795"],
      "the fixture row is born before the fence and never revalidated, so the thirteenth check must reach it");
    assert.strictEqual(only(r795, "ZZTO-795", REVALIDATION_CHECK).verdict, "derivable");

    const liveWindow = chicagoDay(now3);
    const state795 = {
      version: 1, started_at: now3, cycle_id: "00000000-0000-4000-8000-000000000000", nightly: false,
      capability: "audit-board", intent: "to-audit-intent", agent: "ticketowner",
      model: "claude-fable-5-1", schema: J.schema, now: now3, rate: RATE, window: liveWindow,
      census: { measured_at: now3, rate: RATE, fences: FENCES, counts: r795.counts, backlog: r795.backlog, findings: r795.findings },
      prior: [], items: board795.items.map(i => ({ id: i.id, backlog_id: i.backlog_id })),
    };
    const REASON795 = "The fixture premise names no work the board does not show done; refused by part O.";
    const g795 = ingestJudgment({
      window: liveWindow,
      fixes: [{ backlog_id: "ZZTO-795", check: REVALIDATION_CHECK, apply: false, reason: REASON795 }],
      findings: [],
      report: "AGT-166 slice 4 part O, live: one premise refused.",
      account: "Refused one fixture premise on the live board",
    }, state795);
    assert.deepStrictEqual(g795.errors, [], `the live answer must be accepted; got: ${g795.errors.join(" | ")}`);
    const plan795 = planWrites(g795.result, [], board795.items, { rate: RATE, judged: g795.judged });
    assert.deepStrictEqual(plan795.proposals.map(p => p.backlog_id), ["ZZTO-795"]);

    // THE WRITE. `fixed 0`, `proposed 1`, and NO hygiene decision at all: nothing arithmetic happened
    // tonight, and an empty hygiene decision is noise John has to read.
    const res795 = await applyPlan(url, key, plan795, { sessionName: S2, now: now3 });
    assert.deepStrictEqual(res795, { decision: null, expires_at: null, fixed: 0, proposed: 1, inserted: 0, reseen: 0, cleared: 0, raised: 0 },
      "a refused premise proposes exactly one removal and writes nothing else — no stamp, no ledger row, no hygiene decision");

    const after795 = (await read795())[0];
    assert.strictEqual(after795.status, "removal proposed",
      "the refused premise must actually land in John's waiting room — on 1ae77169 it stays `open` and is re-filed forever");
    assert.strictEqual(after795.revalidated_at, null,
      "a REFUSED premise is never stamped as re-read — the stamp is what `apply: true` buys");
    assert.strictEqual(after795.updated_at, upd795,
      "updated_at must be untouched, or reverse_decision() refuses the row and the proposal is unreversible (SES-316)");

    const dec795 = await rest(`runner_decisions?session_name=eq.${encodeURIComponent(S2)}&select=id,kind,backlog_id,status,summary,reasoning,cycle_id`);
    assert.strictEqual(dec795.length, 1, "one refusal, ONE decision — the grain John reverses is the row");
    assert.strictEqual(dec795[0].kind, PROPOSAL_KIND, "a removal proposal is not a hygiene write and must not be filed as one");
    assert.strictEqual(dec795[0].backlog_id, "ZZTO-795", "the decision is ABOUT the row it proposes to remove");
    assert.strictEqual(dec795[0].cycle_id, null, "exactly one of cycle_id / session_name — this run is the session side");
    assert.ok(dec795[0].summary.startsWith("ZZTO-795 removal proposed:"), `summary reads: ${dec795[0].summary}`);
    assert.ok(dec795[0].reasoning.includes(REASON795), "the judge's own reason must ride on the decision John reads");
    assert.ok(dec795[0].reasoning.includes("removed stays John's (SES-113)"),
      "and the reasoning must say what this is NOT: a removal. Nothing on this path may write `removed`");
    assert.ok(dec795[0].reasoning.includes("pattern:0"), "the reasoning must carry the no-standing-pattern handle");

    const img795 = await rest(`runner_before_images?decision_id=eq.${dec795[0].id}&select=table_name,pk_value,row_data`);
    assert.strictEqual(img795.length, 1, `expected one full-row image under the proposal's own decision, got ${img795.length}`);
    assert.strictEqual(img795[0].table_name, "backlog_items");
    assert.strictEqual(img795[0].pk_value, id795, "the image addresses its row by primary key");
    assert.strictEqual(img795[0].row_data.status, "open",
      "the image must hold the PRIOR status — an image taken after the patch restores the proposal it was meant to undo");
    assert.strictEqual(typeof img795[0].row_data.title, "string",
      "the image is the FULL row: reverse_decision() rewrites every column from row_data");

    assert.strictEqual(await countWhere("ticket_owner_findings", "backlog_id=eq.ZZTO-795"), 0,
      "and NOT ONE ledger row: the refusal wrote the board, which is the whole exit (Designer's call iii)");

    // ONE REVERSE PUTS IT BACK IN THE DRAIN. This is what makes the proposal a proposal.
    const rev795 = (await rest("rpc/reverse_decision", {
      method: "POST",
      body: JSON.stringify({ p_decision: dec795[0].id, p_actor: S2, p_reason: "fixture rollback" }),
    }))[0];
    assert.strictEqual(rev795.outcome, "applied", `reverse_decision returned ${JSON.stringify(rev795)}`);
    assert.strictEqual(rev795.restored, 1, "one decision id returns the row to the drain");
    assert.strictEqual(rev795.refused_written_since, 0, "a refusal here means the proposal bumped updated_at and locked itself out");
    assert.strictEqual((await read795())[0].status, "open",
      "the reversal must put the row back where the drain can read it — a proposal nobody can undo is a removal");

    console.log(`[AGT-79] part O: ZZTO-795 refused -> proposed 1 under decision ${dec795[0].id} (kind ${dec795[0].kind}), ` +
      `0 ledger rows, reversed: restored ${rev795.restored}`);
    passed2 = true;
  } finally {
    const del = q => fetch(`${url}/rest/v1/${q}`, { method: "DELETE", headers: H }).catch(() => {});
    await del("ticket_owner_findings?backlog_id=eq.ZZTO-795");
    await del(`runner_before_images?session_name=eq.${encodeURIComponent(S2)}`);
    await del(`runner_decisions?session_name=eq.${encodeURIComponent(S2)}&kind=eq.reversal`);
    await del(`runner_decisions?session_name=eq.${encodeURIComponent(S2)}`);
    await del("backlog_items?backlog_id=eq.ZZTO-795");
  }

  if (passed2) {
    assert.strictEqual(await countWhere("backlog_items", "backlog_id=eq.ZZTO-795"), 0, "part O left its fixture ticket on the live board");
    assert.strictEqual(await countWhere("ticket_owner_findings", "backlog_id=eq.ZZTO-795"), 0, "part O left findings rows on the live ledger");
    assert.strictEqual(await countWhere("runner_before_images", `session_name=eq.${encodeURIComponent(S2)}`), 0, "part O left before-images behind");
    assert.strictEqual(await countWhere("runner_decisions", `session_name=eq.${encodeURIComponent(S2)}`), 0, "part O left decision rows behind");
  }
}

export default main;
selfRun(import.meta.url, main);
