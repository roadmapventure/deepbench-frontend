// DeepBench v7.0.471 | tests/regression/ses-344-ship-report-contract.test.mjs | SES-344 slice 1 --
// the ship report enters the judge's contract, and the diff stops being alphabetical. What is
// pinned here, and where a lazier guard would go vacuously green.
//
// (A) THE EXPORTS, BECAUSE TWO OTHER FILES IMPORT THEM. `scripts/build-verdict-fixture.js` imports
// `SHIP_REPORT_CAP` and `tests/verifier/ses-337-verifier-reproduction.test.mjs` imports
// `cycleNotesFor`; a rename that left either behind would surface as a confusing failure somewhere
// else in the suite rather than as "the contract's own names moved."
//
// (B) THE ORDERING, PROVEN AGAINST GIT'S OWN ORDER AND AGAINST THE CAP. This is the clause that
// carries the ticket, so it is built to fail two different ways if the reorder is absent. A real
// repository is created with the two files whose alphabetical order is the whole defect --
// `docs/backlog/BACKLOG-SNAPSHOT.md` sorts before `scripts/x.js` -- and the CONTROL asserts raw
// `git diff HEAD~1...HEAD` really does put the snapshot first in this tree. Without that control
// the order assertion could pass on a git that happened to sort the other way and nobody would
// know. Then the same diff is taken at a 3,000-character limit: the ticket's file must still be in
// it AND the truncation marker must be there, which is exactly SES-336's failure (a 639,956-char
// diff cut inside the snapshot at 400,000, ahead of the runbook hunk being judged) reproduced in
// miniature. An implementation that forgot the reorder fails the order clause AND the cut clause;
// one that "fixed" it by dropping `DIFF_LAST` from the diff entirely fails (b)'s last assertion,
// which demands the artifacts still be present, just last.
//
// (C) THE SHIP REPORT IS THE WHOLE MESSAGE, not its subject. The two-paragraph body is the case
// that separates `--format=%B` from `--format=%s`, and a Builder's evidence lives in the body.
//
// (D) IS A SHIPPED-FILE READ, AND IT IS LABELLED AS ONE. Asserting `ship_report: {` occurs exactly
// TWICE in `scripts/verifier.js` is not a behavioural proof -- it is a text check, and the number
// is the point: BOTH judge lanes get the key, and neither gets it twice. The lane-shaped defect
// this guards against (one lane handed less than the other) is invisible to any test that only
// runs one lane, and running either lane for real needs a live model call.
//
// (E) IS CREDENTIALED AND IS DECLARED NOT RUN WITHOUT CREDENTIALS. It reads one real
// `runner_cycles` row, because `cycleNotesFor()`'s whole job is to turn a cycle id into the
// Builder's report and a mock of Supabase would only prove this file can mock Supabase.
//
// (F) RE-DERIVES EVERY ADJUDICATION QUOTE FROM GIT. The adjudication is the thing the bar now
// rests on, so no quote in it is taken on trust: each must be an exact substring of
// `git log -1 --format=%B <sha>` in this clone. A fabricated or drifted quote fails by sha and by
// string. A sha this clone cannot reach is NOT RUN -- a shallow checkout is missing evidence, not
// a failure.
//
// NO WRITE OF ANY KIND, no model call. (E) is one authenticated SELECT.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  SHIP_REPORT_CAP,
  DIFF_LAST,
  diffFor,
  shipReportFor,
  cycleNotesFor,
} from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFIER = path.join(ROOT, "scripts", "verifier.js");
const ADJUDICATION = path.join(ROOT, "tests", "fixtures", "verdicts-30-adjudication.json");
const FIXTURE = path.join(ROOT, "tests", "fixtures", "verdicts-30.json");

// The re-rendered artifact whose alphabetical position ahead of `scripts/` is the defect, and the
// ticket file standing in for the code under judgment.
const SNAPSHOT = "docs/backlog/BACKLOG-SNAPSHOT.md";
const TICKET_FILE = "scripts/x.js";

// A real cycle row with a real report in `notes`, and the first words of it. Named rather than
// "any row with notes": a query that accepts whatever it finds would pass against an empty column.
const LIVE_CYCLE_ID = "81a712b9-ee14-464b-9b06-2fc5e4a69016";
const LIVE_NOTES_PREFIX = "CONTINUATION of cycle 6fb43838";

const COMMIT_B_MESSAGE = "v0.0.2 TMP-1 change both files\n\nThe second paragraph is the evidence a Builder writes into the body:\nregression 186/186, build green. A subject-only read loses this line.";

function git(repo, args) {
  const r = spawnSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0) return null;
  return r.stdout;
}

function commit(repo, message) {
  git(repo, ["add", "-A"]);
  const r = spawnSync("git", ["-c", "user.name=DeepBench Test", "-c", "user.email=test@deepbench.local", "commit", "-q", "-m", message],
    { cwd: repo, encoding: "utf8" });
  assert.strictEqual(r.status, 0, `the fixture repo could not commit: ${r.stderr || r.stdout}`);
}

// A throwaway repository with the two files in it. Real git, because the thing under test is an
// argv handed to real git: a stubbed diff would prove nothing about pathspec magic.
function buildRepo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ses344-"));
  const init = spawnSync("git", ["init", "-q", tmp], { encoding: "utf8" });
  assert.strictEqual(init.status, 0, `git init failed: ${init.stderr}`);
  fs.mkdirSync(path.join(tmp, path.dirname(SNAPSHOT)), { recursive: true });
  fs.mkdirSync(path.join(tmp, path.dirname(TICKET_FILE)), { recursive: true });

  const board = n => Array.from({ length: 300 }, (_, i) => `${String(i).padStart(4, "0")} rev${n} ` + "b".repeat(200)).join("\n") + "\n";
  fs.writeFileSync(path.join(tmp, SNAPSHOT), board(1), "utf8");
  fs.writeFileSync(path.join(tmp, TICKET_FILE), "export const x = 1;\n", "utf8");
  commit(tmp, "v0.0.1 TMP-1 seed");

  fs.writeFileSync(path.join(tmp, SNAPSHOT), board(2), "utf8");
  fs.writeFileSync(path.join(tmp, TICKET_FILE), "export const x = 2;\n", "utf8");
  commit(tmp, COMMIT_B_MESSAGE);
  return tmp;
}

async function run() {
  // ---- (a) the exports the rest of the platform imports ------------------------------------
  assert.strictEqual(SHIP_REPORT_CAP, 60_000, "SHIP_REPORT_CAP is the declared truncation on the judge's copy of the ship report");
  assert.ok(Array.isArray(DIFF_LAST) && DIFF_LAST.length >= 4, "DIFF_LAST must list the re-rendered artifacts that go last in the diff");
  assert.ok(DIFF_LAST.includes(SNAPSHOT), `DIFF_LAST must carry ${SNAPSHOT} -- it is the file SES-336's diff was cut inside`);
  assert.ok(Object.isFrozen(DIFF_LAST), "DIFF_LAST is a decision, not a scratch array: freeze it so no caller can push to the shipped list");
  for (const [name, fn] of [["diffFor", diffFor], ["shipReportFor", shipReportFor], ["cycleNotesFor", cycleNotesFor]]) {
    assert.strictEqual(typeof fn, "function", `scripts/verifier.js must export ${name}() -- the reproduction and the fixture builder import these by name`);
  }

  const tmp = buildRepo();
  try {
    // ---- (b) the ordering, its control, and the cut ----------------------------------------
    const control = git(tmp, ["diff", "HEAD~1...HEAD"]);
    assert.ok(control, "the control diff could not be read from the fixture repo");
    const ctlSnapshot = control.indexOf(`diff --git a/${SNAPSHOT}`);
    const ctlTicket = control.indexOf(`diff --git a/${TICKET_FILE}`);
    assert.ok(ctlSnapshot >= 0 && ctlTicket >= 0, "the control diff does not carry both files, so it cannot establish git's own order");
    assert.ok(ctlSnapshot < ctlTicket,
      `CONTROL: raw git diff must put ${SNAPSHOT} BEFORE ${TICKET_FILE} -- that alphabetical order is the defect this ticket reorders. If git ever stops doing this, the assertion below is measuring nothing.`);

    const ordered = diffFor(tmp, "HEAD~1");
    const gotSnapshot = ordered.indexOf(`diff --git a/${SNAPSHOT}`);
    const gotTicket = ordered.indexOf(`diff --git a/${TICKET_FILE}`);
    assert.ok(gotTicket >= 0, `diffFor() dropped ${TICKET_FILE} -- the ticket's own change is not in the diff the judge is handed`);
    assert.ok(gotSnapshot >= 0, `diffFor() dropped ${SNAPSHOT} -- DIFF_LAST is an ORDERING, not an exclusion: the artifacts must still reach the judge, last`);
    assert.ok(gotTicket < gotSnapshot,
      `diffFor() must put ${TICKET_FILE} before ${SNAPSHOT}; the re-rendered artifacts go last so the cap falls inside a board rather than inside the ticket`);
    assert.ok(ordered.includes("(ticket files)") && ordered.includes("(re-rendered artifacts)"),
      "each section must say which half it is -- a judge handed the same bytes in an unlabelled order has been shown a different change");

    const cut = diffFor(tmp, "HEAD~1", { limit: 3000 });
    assert.ok(cut.includes(`a/${TICKET_FILE}`),
      `at a 3,000-character limit the ticket's file must SURVIVE the cut (${cut.length} chars kept) -- this is SES-336 in miniature: the judgment blocked on a file it had been sent and could not see`);
    assert.ok(cut.includes("[TRUNCATED: this diff is"),
      "a cut diff must carry the declared truncation marker; an agent that cannot tell it was cut would certify a change it never saw");

    // ---- (c) the ship report is the whole body ---------------------------------------------
    assert.strictEqual(shipReportFor(tmp, "HEAD~1").trim(), COMMIT_B_MESSAGE,
      "shipReportFor() must return the commit's full body (--format=%B), paragraphs and all -- the Builder's evidence is below the subject line");
    assert.ok(shipReportFor(tmp, "does-not-exist-ref").startsWith("[UNREADABLE:"),
      "an unreadable ship report must be DECLARED unreadable, never returned as an empty string that reads as 'the Builder wrote nothing'");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // ---- (d) SHIPPED-FILE READ (a text check on scripts/verifier.js, not a behavioural proof) --
  const verifierSrc = fs.readFileSync(VERIFIER, "utf8");
  const lanes = verifierSrc.split("ship_report: {").length - 1;
  assert.strictEqual(lanes, 2,
    `scripts/verifier.js must build 'ship_report: {' exactly twice -- once in each judge lane (session and executor). Found ${lanes}. The same evidence key carrying less content in one lane than the other is the lane-shaped difference verifier.js's own SES-337 note calls a defect.`);

  // ---- (f) the adjudication, re-derived from git ------------------------------------------
  assert.ok(fs.existsSync(ADJUDICATION), `${path.relative(ROOT, ADJUDICATION)} is missing -- the bar rests on it`);
  const adj = JSON.parse(fs.readFileSync(ADJUDICATION, "utf8"));
  assert.strictEqual(adj.rows.length, 8, `the adjudication must carry one row per disagreement measured 2026-09-13 (8); it carries ${adj.rows.length}`);

  const fx = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const knownIds = new Set(fx.fixtures.map(f => f.verdict_id));
  const strangers = adj.rows.filter(r => !knownIds.has(r.verdict_id));
  assert.strictEqual(strangers.length, 0,
    `every adjudicated verdict must be one of the 30 frozen in ${path.relative(ROOT, FIXTURE)}; these are not: ${strangers.map(r => `${r.backlog_id} (${r.verdict_id.slice(0, 8)})`).join(", ")}`);

  const counts = adj.rows.reduce((a, r) => ({ ...a, [r.class]: (a[r.class] || 0) + 1 }), {});
  assert.deepStrictEqual(counts, { harness: 1, elsewhere: 6, absent: 1 },
    `the adjudicated partition is 1 harness / 6 elsewhere / 1 absent (SES-344 design, 2026-09-13); this file says ${JSON.stringify(counts)}`);

  const unreachable = [];
  for (const row of adj.rows) {
    const body = git(ROOT, ["log", "-1", "--format=%B", row.sha]);
    if (body === null) { unreachable.push(`${row.backlog_id} ${row.version} (${row.sha.slice(0, 8)})`); continue; }
    for (const q of row.quotes) {
      assert.ok(body.includes(q),
        `${row.backlog_id} ${row.version}: the adjudication quotes ${JSON.stringify(q)} from commit ${row.sha.slice(0, 8)}, and that string is NOT in its body. The adjudication is the evidence the bar rests on; a quote that cannot be re-derived from git is not evidence.`);
    }
  }
  if (unreachable.length) {
    notRun("part of the adjudication re-derivation",
      `${unreachable.length} adjudicated commit(s) are not present in this clone (${unreachable.join(", ")}) -- a shallow checkout cannot read their bodies. Fetch full history to re-derive their quotes.`);
  }

  // ---- (e) credentialed: one real cycle row ------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live runner_cycles.notes read",
      "SUPABASE_URL and SUPABASE_SERVICE_KEY are not set, so cycleNotesFor() was not run against a real row. Run: node --env-file-if-exists=.env.local tests/regression/run-all.js");
    return;
  }
  assert.strictEqual(await cycleNotesFor(url, key, null), null,
    "cycleNotesFor() must answer null when nobody asked -- 'no cycle id' and 'the Builder wrote nothing' are different facts and an empty string would collapse them");
  // ONE BOUNDED RETRY, and only on the declared-unreadable path. Measured on this ticket's own
  // first run: the REST endpoint answered `HTTP 504 Gateway Timeout` once and correctly on the next
  // attempt. A transient gateway error is not a finding about `cycleNotesFor()`, and a suite that
  // goes red on one is a suite people stop reading. The retry cannot mask a real defect: a row that
  // is missing, or notes that are wrong, fail identically on both attempts.
  let notes = await cycleNotesFor(url, key, LIVE_CYCLE_ID);
  if (String(notes).startsWith("[UNREADABLE:")) {
    await new Promise(r => setTimeout(r, 1500));
    notes = await cycleNotesFor(url, key, LIVE_CYCLE_ID);
  }
  assert.ok(typeof notes === "string" && !notes.startsWith("[UNREADABLE:"),
    `cycleNotesFor() could not read runner_cycles ${LIVE_CYCLE_ID.slice(0, 8)}: ${notes}`);
  assert.ok(notes.startsWith(LIVE_NOTES_PREFIX),
    `runner_cycles ${LIVE_CYCLE_ID.slice(0, 8)}'s notes must start ${JSON.stringify(LIVE_NOTES_PREFIX)} -- that is the Builder report the judge lanes now receive. Got: ${JSON.stringify(String(notes).slice(0, 80))}`);
}

export default run;
selfRun(import.meta.url, run);
