// DeepBench v7.0.474 | tests/regression/agt-79-ticket-owner.test.mjs | AGT-79 -- THE TICKET
// OWNER'S CENSUS, pinned at the level that can actually go red.
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
// (E) LIVE, and it asserts the NEGATIVE that defines this slice: the census read the real board
// and ticket_owner_findings is still empty, with backlog_items unchanged. Declared notRun without
// credentials rather than skipped silently.

import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { classifyBoard, renderCensus, CHECKS, TYPE_TAXONOMY, TYPE_MAP, FENCES } from "../../scripts/ticket-owner.js";

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
  assert.strictEqual(cApply.status, 2, "--apply must be refused, not ignored: this slice writes nothing");
  assert.ok(cApply.stderr.includes("unknown flag"), `got: ${cApply.stderr}`);

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

  // --- E: live ---------------------------------------------------------------------------------
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("live census (part E)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set; run with node --env-file-if-exists=.env.local tests/regression/run-all.js");
    return;
  }

  const findingsBefore = await restCount(base, key, "ticket_owner_findings");
  const itemsBefore = await restCount(base, key, "backlog_items");
  assert.strictEqual(findingsBefore, 0, "slice 1 writes no findings row; the ledger must still be empty");

  const outFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "agt79-")), "census.json");
  const live = spawnCli(["--census", `--out=${outFile}`, "--json"], { withCreds: true });
  assert.strictEqual(live.status, 0, `the live census must run; stderr: ${live.stderr}`);
  const census = JSON.parse(live.stdout);

  assert.ok(census.counts.rows >= 800, `the live board read only ${census.counts.rows} rows`);
  assert.ok(typeof census.rate === "number" && census.rate > 0.1 && census.rate < 1,
    `the cost rate must be a real fraction, got ${census.rate}`);

  const claimOnClosed = census.findings.filter(f => f.check === "claim-on-closed");
  assert.strictEqual(claimOnClosed.length, 1, `expected one claim on a closed ticket, got ${claimOnClosed.map(f => f.backlog_id).join(", ")}`);
  assert.strictEqual(claimOnClosed[0].backlog_id, "SES-141");
  assert.deepStrictEqual(claimOnClosed[0].fix, { claimed_by: null, claimed_at: null });

  const over = census.findings.filter(f => f.check === "cycles-over-quote").map(f => f.backlog_id);
  assert.ok(over.includes("LOG-143") && over.includes("SES-245"), `cycles-over-quote read ${over.join(", ")}`);

  const typeDerivable = census.findings.filter(f => f.check === "type-off-taxonomy" && f.verdict === "derivable")
    .map(f => f.backlog_id).sort();
  assert.deepStrictEqual(typeDerivable, ["SES-131", "SES-208"], "only the two one-to-one spellings are derivable");

  const unaccepted = census.findings.filter(f => f.check === "delivered-unaccepted");
  assert.ok(unaccepted.length >= 4, `expected at least four delivered-unaccepted rows, got ${unaccepted.length}`);

  for (const f of census.findings.filter(f => f.check === "cost-snapshot-missing")) {
    assert.strictEqual(f.fix.cost_pct_snapshot, Math.round(f.fix.cost_cycles_snapshot * census.rate * 100) / 100,
      `${f.backlog_id}'s cost fix does not match the rate it claims to have used`);
  }

  // THE NEGATIVE THAT DEFINES THIS SLICE: the census read the whole board and changed nothing.
  assert.strictEqual(await restCount(base, key, "ticket_owner_findings"), 0, "the census must not have written a findings row");
  assert.strictEqual(await restCount(base, key, "backlog_items"), itemsBefore, "the census must not have touched the board");
}

export default main;
selfRun(import.meta.url, main);
