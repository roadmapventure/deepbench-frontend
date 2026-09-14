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
// WHY EVERY ARM CARRIES A CONTROL. Ten of the eleven checks produce a SHORT list on a healthy
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
// night), the eleven lines that must print even at zero, and the four constants the whole census
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
} from "../../scripts/ticket-owner.js";
import { SERVICE_CATALOG } from "../../shared/ai-patterns.js";
import { renderTicketHygiene, factsSha, cst, BEGIN, END } from "../../scripts/render-standing-brief.js";
import { parseSteps, render, NOTES, CARD_REL, RUNBOOK_REL } from "../../scripts/render-cycle-card.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = "scripts/ticket-owner.js";
const FIXTURE_REL = "tests/fixtures/agt-79/board.json";
const SEED_REL = "docs/design/agt-79-ticket-owner-seed.sql";

const F = JSON.parse(fs.readFileSync(path.join(ROOT, FIXTURE_REL), "utf8"));

const clone = v => JSON.parse(JSON.stringify(v));
const run = (over = {}) => classifyBoard(over.board ?? F.board, { now: over.now ?? F.now, rate: over.rate ?? F.rate });
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

  assert.deepStrictEqual(r.counts, { rows: 14, findings: 11, derivable: 4, judgment: 7 },
    "the fourteen-row fixture must classify to exactly 11 findings, 4 derivable");

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

  // --- B: the render and the constants, pure ---------------------------------------------------
  const text = renderCensus(r, F.now);
  assert.strictEqual(text, renderCensus(r, F.now), "renderCensus must be byte-stable: the report is diffed night over night");
  assert.ok(text.startsWith(
    "ticket-owner census 2026-09-13T02:00:00Z: 14 rows · 11 findings (4 derivable · 7 judgment)" +
    " · behind the fences: quote 1 · size 1 · cost 1 · verdict 1 · unrevalidated>30d 1 · attended-actual null 2"),
    `the census headline is not the agreed line:\n${text.split("\n")[0]}`);
  assert.ok(text.endsWith("\n"), "the census ends with a newline");
  assert.strictEqual(text.replace(/\n$/, "").split("\n").length, 12, "headline plus one line per check, always eleven");
  const sizeLine = text.split("\n").find(l => l.includes("size-missing"));
  assert.ok(sizeLine.endsWith("—"), "a check that found nothing must still print its line, ending in an em dash");

  const emptyText = renderCensus(
    run({ board: { items: [], matrix: [], verdicts: [], accepts: [], decisions: [], openCycles: [] } }), F.now);
  assert.strictEqual(emptyText.replace(/\n$/, "").split("\n").length, 12, "an empty board still prints all eleven checks");
  assert.ok(emptyText.includes("0 rows · 0 findings"), "an empty board reports zero rows, not nothing");

  assert.strictEqual(CHECKS.length, 11);
  assert.strictEqual(CHECKS[0], "quote-missing");
  assert.strictEqual(CHECKS[10], "cycles-over-quote");
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
  assert.deepStrictEqual(parsed.counts, r.counts, "the CLI must report the same classification the library computes");
  assert.strictEqual(parsed.measured_at, "2026-09-13T02:00:00Z", "the fixture's own clock wins, never the wall clock");

  const cText = spawnCli([`--board=${FIXTURE_REL}`]);
  assert.strictEqual(cText.status, 0, `stderr: ${cText.stderr}`);
  assert.strictEqual(cText.stdout, text, "the CLI's default output is renderCensus, byte for byte");

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
  assert.deepStrictEqual(ins.map(f => [f.backlog_id, f.check_slug]).sort(), [
    ["QA-79-04", "actual-unknown"],
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
  assert.strictEqual(p4.ledger.insert.length, 5, "a finding already on the ledger must not be inserted a second time");
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
  assert.ok(body4e.includes("ticket-owner.js --nightly --cycle-id="), "the step names the command a cycle actually runs");
  assert.ok(body4e.includes("SCHEDULED-AGENT: audit-board"), "the step names the notes prefix its precondition reads");
  assert.ok(body4e.includes("already run today"), "the step names the exit-0 answer that sends a cycle on to step 5");
  assert.ok(body4e.includes("continue to step 5 normally"), "exit 2 is a refusal, never a stop — the hygiene pass is bookkeeping");
  assert.ok(!body4e.includes("--judge"), "the judgment run is NOT this slice and must not be documented as available");

  const card = fs.readFileSync(path.join(ROOT, CARD_REL), "utf8");
  assert.strictEqual(card, render(runbookMd), "the card is a GENERATED view — it must be the byte-exact render of the runbook in this same commit");
  const cardLine = card.split("\n").find(l => l.startsWith("**4e.** Ticket hygiene · L"));
  assert.ok(cardLine, "the card must carry a 4e line naming the step");
  const cardBlocks = card.split("```");
  assert.ok(cardBlocks.some(b => b.includes("--nightly --cycle-id=")), "the card carries 4e's command block in full");
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
  assert.ok(censusLine(r).startsWith("14 rows · 11 findings (4 derivable · 7 judgment) · behind the fences: quote "),
    `the census line carries the counts and the fences in order; got: ${censusLine(r).slice(0, 90)}`);

  const n1 = nightlyNotes(censusLine(r), { fixed: 1, inserted: 4, reseen: 0, cleared: 0, decision: "d1", expires_at: "2026-09-16T00:00:00Z" });
  assert.ok(n1.startsWith(`${NIGHTLY_PREFIX} — 14 rows · 11 findings`), `the notes lead with the prefix the precondition reads; got: ${n1.slice(0, 60)}`);
  assert.ok(n1.endsWith(" · fixed 1 · findings +4 ~0 −0 · decision d1 — reversible until 2026-09-16T00:00:00Z"),
    `a night that fixed something ends in its decision handle and window; got: ${n1.slice(-90)}`);
  const n2 = nightlyNotes(censusLine(r), { fixed: 0, inserted: 0, reseen: 170, cleared: 0, decision: null, expires_at: null });
  assert.ok(n2.endsWith(" · fixed 0 · findings +0 ~170 −0 · no decision (nothing to fix)"),
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
  assert.deepStrictEqual(g.result.counts, { rows: 14, findings: 11, derivable: 3, judgment: 8 },
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

  const pj = planWrites(g.result, J.prior, F.board.items, { rate: F.rate });
  assert.deepStrictEqual(pj.fixes.map(f => f.backlog_id), ["QA-79-03", "QA-79-07", "QA-79-12"],
    "only the confirmed fixes become writes");
  assert.strictEqual(pj.ledger.insert.length, 7, "eight judgment pairs minus the one already on the ledger");
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
    fixes: 3, insert: 7, reseen: 1, clear: 1,
  }, "the dry run must report the same plan the pure half computes");

  const kNoState = spawnCli(["--judge", `--answer=${answerPath}`, `--state-file=${path.join(D, "missing.json")}`, "--dry-run"]);
  assert.strictEqual(kNoState.status, 2, "an answer with no state is an answer about an unknown board");
  assert.ok(kNoState.stderr.includes("run pass one first"), `got: ${kNoState.stderr}`);
  const kRefused = spawnCli(["--judge", `--answer=${badPath}`, `--state-file=${statePath}`, "--dry-run"]);
  assert.strictEqual(kRefused.status, 2, "a refused answer is exit 2, even on a dry run");
  assert.ok(kRefused.stderr.includes("REFUSED and nothing was written"), `got: ${kRefused.stderr}`);
  assert.ok(kRefused.stderr.includes('"account"'), `the refusal must name the offending key; got: ${kRefused.stderr}`);

  // --- E: live ---------------------------------------------------------------------------------
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    const why = "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set; run with node --env-file-if-exists=.env.local tests/regression/run-all.js";
    notRun("live census (part E)", why);
    notRun("write pass (part G)", why);
    notRun("judge gate (part K live)", why);
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

  const findingsBefore = await restCount(base, key, "ticket_owner_findings");
  const itemsBefore = await restCount(base, key, "backlog_items");

  const outFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "agt79-")), "census.json");
  const live = spawnCli(["--census", `--out=${outFile}`, "--json"], { withCreds: true });
  assert.strictEqual(live.status, 0, `the live census must run; stderr: ${live.stderr}`);
  const census = JSON.parse(live.stdout);

  assert.ok(census.counts.rows >= 800, `the live board read only ${census.counts.rows} rows`);
  assert.ok(typeof census.rate === "number" && census.rate > 0.1 && census.rate < 1,
    `the cost rate must be a real fraction, got ${census.rate}`);

  // SES-141 IS the board's one claim left on a closed ticket, and SES-131 / SES-208 ARE its only
  // two one-to-one type spellings. But this slice's write pass exists precisely to close those
  // gaps, so after it has run they are FIXED rather than found. Each is therefore asserted as a
  // pair: the census still reports it with the exact fix, OR the live row already carries that
  // fix. Both halves are a real statement about the ticket; "neither" is the failure, and a
  // derivable finding on any OTHER row still fails outright.
  const claimOnClosed = census.findings.filter(f => f.check === "claim-on-closed");
  assert.deepStrictEqual(claimOnClosed.map(f => f.backlog_id), claimOnClosed.length ? ["SES-141"] : [],
    `claim-on-closed must name SES-141 and nothing else, got ${claimOnClosed.map(f => f.backlog_id).join(", ")}`);
  if (claimOnClosed.length === 1) {
    assert.deepStrictEqual(claimOnClosed[0].fix, { claimed_by: null, claimed_at: null });
  } else {
    const row = (await rest("backlog_items?backlog_id=eq.SES-141&select=status,claimed_by,claimed_at"))[0];
    assert.ok(row, "SES-141 must still be on the board");
    assert.ok(["done", "delivered"].includes(row.status), `SES-141 is ${row.status}, so it was never a claim-on-closed row at all`);
    assert.strictEqual(row.claimed_by, null, "SES-141 is off the claim-on-closed list, so its claim must already be cleared");
    assert.strictEqual(row.claimed_at, null, "a cleared claim clears both columns, never just the holder");
  }

  const over = census.findings.filter(f => f.check === "cycles-over-quote").map(f => f.backlog_id);
  assert.ok(over.includes("LOG-143") && over.includes("SES-245"), `cycles-over-quote read ${over.join(", ")}`);

  const typeDerivable = census.findings.filter(f => f.check === "type-off-taxonomy" && f.verdict === "derivable")
    .map(f => f.backlog_id).sort();
  assert.ok(typeDerivable.every(id => id === "SES-131" || id === "SES-208"),
    `only the two one-to-one spellings may be derivable, got ${typeDerivable.join(", ")}`);
  for (const [id, mapped] of [["SES-131", "Feature"], ["SES-208", "Bug"]]) {
    if (typeDerivable.includes(id)) {
      assert.deepStrictEqual(census.findings.find(f => f.backlog_id === id && f.check === "type-off-taxonomy").fix, { type: mapped });
    } else {
      const row = (await rest(`backlog_items?backlog_id=eq.${id}&select=type`))[0];
      assert.strictEqual(row.type, mapped, `${id} is off the derivable list, so its type must already read ${mapped}`);
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

  async function countWhere(table, query) {
    const res = await fetch(`${url}/rest/v1/${table}?${query}&select=id`, {
      headers: { ...H, Prefer: "count=exact", Range: "0-0" },
    });
    await res.text();
    const total = Number((res.headers.get("content-range") || "").split("/")[1]);
    assert.ok(Number.isFinite(total), `could not count ${table}?${query}`);
    return total;
  }

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

    // (2) Census the four rows through the REAL projection readBoard() uses -- a column the census
    // reads but this test forgot to select would classify as null and quietly change the answer.
    const board = { items: await readFixture(), matrix: [], verdicts: [], accepts: [], decisions: [], openCycles: [] };
    const r1 = classifyBoard(board, { now, rate: RATE });
    assert.deepStrictEqual(r1.counts, { rows: 4, findings: 5, derivable: 1, judgment: 4 },
      "the four fixture rows must classify to exactly one derivable fix and four judgment findings");
    assert.deepStrictEqual(byCheck(r1, "claim-on-closed"), ["ZZTO-791"]);

    // (3) Plan against an empty ledger: everything is new tonight.
    const plan1 = planWrites(r1, [], board.items, { rate: RATE });
    assert.strictEqual(plan1.fixes.length, 1);
    assert.strictEqual(plan1.fixes[0].id, id791, "the fix must address ZZTO-791 by the primary key the insert returned");
    assert.strictEqual(plan1.ledger.insert.length, 4);

    // (4) THE WRITE.
    const res1 = await applyPlan(url, key, plan1, { sessionName: S, now });
    assert.strictEqual(res1.fixed, 1);
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
    assert.ok(dec.summary.startsWith("Ticket Owner: 1 derivable cell fix(es) on 1 row(s)"), `summary reads: ${dec.summary}`);
    assert.ok(dec.reasoning.includes("pattern:0"), "the reasoning must carry the no-standing-pattern handle");

    const imgs = await rest(`runner_before_images?decision_id=eq.${res1.decision}&select=table_name,pk_value,row_data`);
    assert.strictEqual(imgs.length, 1, `expected exactly one before-image under decision ${res1.decision}, got ${imgs.length}`);
    assert.strictEqual(imgs[0].table_name, "backlog_items");
    assert.strictEqual(imgs[0].pk_value, id791, "the image addresses the row by primary key, not by backlog_id");
    assert.strictEqual(imgs[0].row_data.claimed_by, "zz-stale", "the image must hold the PRIOR state -- an image of the new state restores nothing");
    assert.strictEqual(typeof imgs[0].row_data.title, "string",
      "the image must be the FULL row: reverse_decision() rewrites every column from row_data, so a partial image restores a partial row");

    const nullImgs = await rest(`runner_before_images?session_name=eq.${encodeURIComponent(S)}&table_name=eq.ticket_owner_findings&select=pk_value,row_data,decision_id`);
    assert.strictEqual(nullImgs.length, 4, "every ledger row the night invented gets its own null-row image");
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
    const r2 = classifyBoard(board2, { now: now2, rate: RATE });
    assert.strictEqual(r2.counts.derivable, 0, "the cell the first night fixed must not be found again");
    assert.strictEqual(r2.counts.findings, 4);
    const priorLed = led.map(x => ({ id: x.id, backlog_id: x.backlog_id, check_slug: x.check_slug }));
    const plan2 = planWrites(r2, priorLed, board2.items, { rate: RATE });
    assert.deepStrictEqual(plan2.fixes, []);
    assert.deepStrictEqual(plan2.ledger.insert, [], "a finding already on the ledger is touched, never duplicated");
    assert.strictEqual(plan2.ledger.reseen.length, 4);
    assert.deepStrictEqual(plan2.ledger.clear, []);

    const res2 = await applyPlan(url, key, plan2, { sessionName: S, now: now2 });
    assert.deepStrictEqual(res2, { decision: null, expires_at: null, fixed: 0, inserted: 0, reseen: 4, cleared: 0 },
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
    const ghosted = planWrites(r2, [...priorLed, { id: "ghost", backlog_id: "ZZTO-791", check_slug: "claim-on-closed" }], board2.items, { rate: RATE });
    assert.deepStrictEqual(ghosted.ledger.clear, ["ghost"], "a finding that is no longer true tonight clears");

    // (8) THE WHOLE POINT: one decision id puts every cell back.
    const rev = (await rest("rpc/reverse_decision", {
      method: "POST",
      body: JSON.stringify({ p_decision: res1.decision, p_actor: S, p_reason: "fixture rollback" }),
    }))[0];
    assert.strictEqual(rev.outcome, "applied", `reverse_decision returned ${JSON.stringify(rev)}`);
    assert.strictEqual(rev.restored, 1);
    assert.strictEqual(rev.refused, 0);
    assert.strictEqual(rev.refused_written_since, 0, "a refusal here means the write pass bumped updated_at and locked itself out");
    assert.strictEqual(typeof rev.reversal_id, "string");

    const restored = (await readFixture()).find(x => x.backlog_id === "ZZTO-791");
    assert.strictEqual(restored.claimed_by, "zz-stale", "the reversal must put the ORIGINAL claim back");
    assert.strictEqual(Date.parse(restored.claimed_at), Date.parse("2026-09-01T00:00:00+00:00"));
    assert.strictEqual(restored.status, "done", "the reversal restores the whole row, including the columns nobody wrote");

    console.log(`[AGT-79] part G: decision ${res1.decision} (expires ${res1.expires_at}) — 1 fix, 4 findings, reversed: ` +
      `restored ${rev.restored} refused ${rev.refused}`);
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
}

export default main;
selfRun(import.meta.url, main);
