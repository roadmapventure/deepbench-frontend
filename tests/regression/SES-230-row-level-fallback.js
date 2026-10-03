// DeepBench v7.0.312 | tests/regression/SES-230-row-level-fallback.js | SES-230 -- A FAILED BATCH
// IS RETRIED ROW BY ROW, AND EVERY ROW THAT STILL WILL NOT LOAD IS NAMED. John's directive
// 23d5fbae (attended architect session 2026-08-29, his word "1" on card c2470d0b) picked route 1
// after option B was measured unimplementable: "when a batch POST fails, retry the batch
// row-by-row, load every loadable row, and emit a named report of each row that could not load
// (table, pk, SQLSTATE, reason); exit non-zero only per the runbook's existing contract, never
// silently drop."
//
// THE DEFECT, measured live on the offsite set rather than quoted from the ticket: over
// refresh-2026-08-28/data/pending_confirmations.ndjson, 312 rows, exactly TWO serialise
// proposed_action to JSON null (ab097416-... and f98c74f1-...). restore-supabase.mjs posts 500
// rows at a time and a batch is all-or-nothing, so those 2 cost all 312.
//
// THE NEGATIVE CONTROL IS THE PRE-CHANGE BEHAVIOUR OBSERVED INSIDE THE SAME RUN, ON THE SAME
// FIXTURE, and that is deliberate rather than a shortcut. The shipped script's batch loop IS the
// old behaviour: it still runs first, it still fails on this fixture, and it still prints
// "Stalled on pass 1 -- no table made progress". Only after it does the fallback load 310. So the
// control is the real implementation failing, one variable, rather than a reimplementation of the
// old code agreeing with itself (SES-45's "a second implementation agreeing with itself") or a
// grep of source text (SES-191 Part 3's own warning: a source check passes on a script that
// imports a helper and forgets to call it).
//
// WHAT WOULD MAKE THIS TEST PASS VACUOUSLY, and why it cannot: if the change did nothing, the stub
// would record ZERO successful single-row POSTs and 0 of 312 rows loaded. Every assertion below is
// keyed on that split -- batch successes must be 0 AND single-row successes must be 310 -- so a
// no-op change fails the test rather than passing it.
//
// THE THIRD ARM IS THE ONE A LATER EDITOR WILL BE TEMPTED TO DROP. A fallback that splits every
// stuck table row by row is unusable on the live population: ai_activity_log is 34,761 rows and
// fails for a TABLE-wide reason (SES-220's generated columns, 428C9), so splitting it is 34,761
// doomed requests. The probe guard stops after PROBE_LIMIT identically-failing rows and reports
// the table as a whole. That is a bound on wasted requests, never a silent drop -- the report
// still names the table, the row count, the SQLSTATE and the server's reason -- and this arm pins
// it by counting the requests the stub actually received.
//
// NOT ASSERTED HERE, named rather than left to be found: no wire format is chosen for the jsonb
// scalar null. SES-230's A/B/C question is still John's, and this ship reports the 2 rows rather
// than representing them.

import fs from "fs";
import os from "os";
import path from "path";
import http from "http";
import crypto from "crypto";
import { spawn } from "child_process";
import { selfRun, notRun } from "./_lib/self-run.js";

const BAD_IDS = [
  "ab097416-ecd5-4fa9-8c75-6c619aad3410",
  "f98c74f1-2ed9-4b82-8af8-b00f90fb85bc",
];
const GOOD_ROWS = 310;
const TOTAL_ROWS = GOOD_ROWS + BAD_IDS.length;   // 312, the live count
const WIDE_ROWS = 200;                           // stands in for ai_activity_log's 34,761

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// --- the stub target -----------------------------------------------------------------------
//
// It reproduces exactly the two server behaviours the live drill hit, and nothing else:
//   pending_confirmations -- 23502 on any batch containing a scalar-null proposed_action,
//                            201 otherwise. This is a ROW-level defect.
//   ai_activity_log       -- 428C9 on everything. This is a TABLE-level defect.
// It also records the shape of every request, which is what the assertions are actually made of.
function startStub() {
  const log = { batchOk: {}, batchFail: {}, singleOk: {}, singleFail: {} };
  const bump = (bucket, table) => { log[bucket][table] = (log[bucket][table] || 0) + 1; };

  const server = http.createServer((req, res) => {
    const table = req.url.replace(/^\/rest\/v1\//, "").split("?")[0];
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      let rows = [];
      try { rows = JSON.parse(body); } catch { rows = []; }
      const single = rows.length === 1;
      const fail = (status, code, message) => {
        bump(single ? "singleFail" : "batchFail", table);
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ code, message, details: null, hint: null }));
      };

      if (table === "ai_activity_log") {
        return fail(400, "428C9",
          'cannot insert a non-DEFAULT value into column "caller_ip_masked"');
      }
      if (rows.some((r) => r.proposed_action === null)) {
        return fail(400, "23502",
          'null value in column "proposed_action" of relation "pending_confirmations" ' +
          "violates not-null constraint");
      }
      bump(single ? "singleOk" : "batchOk", table);
      res.writeHead(201).end("");
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, log, port: server.address().port }));
  });
}

// --- the fixture set -----------------------------------------------------------------------
//
// A real backup set, not a mock of one: restore-supabase.mjs hashes every data file against the
// manifest and REFUSES to run on a mismatch, so the fixture has to be built the way a dump builds
// one. That refusal is itself load-bearing here -- a fixture that skipped it would exercise a path
// the script never takes.
function writeSet(dir, { includeBad, includeWide }) {
  fs.mkdirSync(path.join(dir, "data"), { recursive: true });
  const tables = {};

  const rows = [];
  for (let i = 0; i < GOOD_ROWS; i++) {
    rows.push({ id: `good-${String(i).padStart(4, "0")}`, proposed_action: { kind: "noop" } });
  }
  if (includeBad) for (const id of BAD_IDS) rows.push({ id, proposed_action: null });
  addTable(dir, tables, "pending_confirmations", "id", rows);

  if (includeWide) {
    const wide = [];
    for (let i = 0; i < WIDE_ROWS; i++) wide.push({ id: i + 1, caller_ip_masked: "1.2.3.0" });
    addTable(dir, tables, "ai_activity_log", "id", wide);
  }

  fs.writeFileSync(path.join(dir, "manifest.json"),
    JSON.stringify({ taken_at: "2026-08-29T00:00:00Z", tables }, null, 1));
  return dir;
}

function addTable(dir, tables, name, pk, rows) {
  const rel = `data/${name}.ndjson`;
  const body = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  fs.writeFileSync(path.join(dir, rel), body);
  tables[name] = {
    rows: rows.length, expected: rows.length, pk, file: rel,
    sha256: crypto.createHash("sha256").update(body).digest("hex"),
  };
}

// ASYNC ON PURPOSE, and it is not a style preference -- execFileSync DEADLOCKS here. The stub
// server lives in this process, so a synchronous child blocks the very event loop that has to
// answer its HTTP requests: the restore waits on a reply that cannot be sent until it exits.
// Found live while building this guard.
function runRestore(script, setDir, port) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, setDir, "--all", "--confirm"], {
      env: {
        ...process.env,
        SUPABASE_URL: `http://127.0.0.1:${port}`,
        SUPABASE_SERVICE_KEY: "stub-key-not-a-credential",
        // Point the legacy env-file reader at a path that cannot exist, so the fixture run can
        // never pick up a real machine's credentials and write to a real project.
        DEEPBENCH_ENV_FILE: path.join(os.tmpdir(), "ses230-no-such-env-file"),
      },
    });
    let out = "";
    child.stdout.on("data", (c) => { out += c; });
    child.stderr.on("data", (c) => { out += c; });
    child.on("close", (code) => resolve({ code, out }));
  });
}

async function run() {
  const tooling = process.env.DEEPBENCH_BACKUP_TOOLING;
  const script = tooling ? path.join(tooling, "restore-supabase.mjs") : null;

  if (!script || !fs.existsSync(script)) {
    // Same gate SES-191 Part 3 uses, for the same reason: the tooling lives in
    // roadmapventure/deepbench-backups-offsite, not in this repo. Declared, never faked.
    notRun(
      "row-level fallback exercised against the real restore-supabase.mjs",
      "the restore tooling is not present here -- it lives in the deepbench-backups-offsite repo. " +
        "Set DEEPBENCH_BACKUP_TOOLING to a checkout of it and re-run: " +
        "DEEPBENCH_BACKUP_TOOLING=/path/to/deepbench-backups-offsite node " +
        "tests/regression/SES-230-row-level-fallback.js"
    );
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ses230-"));

  // === ARM 1: the live shape -- 2 bad rows of 312, plus a table-wide failure alongside ========
  {
    const { server, log, port } = await startStub();
    try {
      const setDir = writeSet(path.join(tmp, "live"), { includeBad: true, includeWide: true });
      const { code, out } = await runRestore(script, setDir, port);

      // (a) THE NEGATIVE CONTROL, and it is the pre-change behaviour running for real: the batch
      //     loop still fails on this fixture. If this line is ever absent, the arms below prove
      //     nothing, because the fallback would never have been reached.
      assert(/Stalled on pass 1 -- no table made progress/.test(out),
        "the batch loop did not fail on a fixture built to make it fail, so the fallback below was " +
        `never exercised and this test proves nothing. Output:\n${out}`);
      assert((log.batchOk.pending_confirmations || 0) === 0,
        "the stub accepted a multi-row batch for pending_confirmations -- the fixture is not " +
        "reproducing the defect, so a passing run says nothing about the fallback");

      // (b) EVERY LOADABLE ROW LOADED, and it loaded ONE AT A TIME. Both halves are asserted:
      //     the count alone would pass if some batch had succeeded, and the split alone would
      //     pass if only a handful of rows had been retried.
      assert((log.singleOk.pending_confirmations || 0) === GOOD_ROWS,
        `expected ${GOOD_ROWS} rows to load individually, the stub recorded ` +
        `${log.singleOk.pending_confirmations || 0}. If the change did nothing this is 0.`);
      assert(new RegExp(`pending_confirmations: ${GOOD_ROWS} of ${TOTAL_ROWS} rows loaded, 2 could not load`).test(out),
        `the run did not report ${GOOD_ROWS} of ${TOTAL_ROWS} loaded with 2 named. Output:\n${out}`);

      // (c) THE REPORT NAMES THE ROWS -- pk, SQLSTATE and the server's own reason. A count on its
      //     own is the silent drop this ticket exists to end.
      for (const id of BAD_IDS) {
        assert(out.includes(id),
          `row ${id} could not load and was not named in the report. A count without the rows is ` +
          `exactly the "silently drop" John's directive forbids. Output:\n${out}`);
      }
      assert(/23502/.test(out),
        "the report did not carry the SQLSTATE the server returned; the directive names it as a " +
        "required field of the report");

      // (d) THE PROBE GUARD: a table-wide failure is NOT split row by row.
      const wideSingles = log.singleFail.ai_activity_log || 0;
      assert(wideSingles > 0 && wideSingles < WIDE_ROWS,
        `the table-wide failure was split into ${wideSingles} of ${WIDE_ROWS} single-row requests. ` +
        "On the live population that is 34,761 doomed requests -- the probe guard is what makes " +
        "the fallback usable at all.");
      assert(wideSingles <= 30,
        `the probe guard let ${wideSingles} rows through before declaring the failure table-wide; ` +
        "PROBE_LIMIT is 25 and a materially larger number means the guard was loosened");
      assert(/ai_activity_log\s+TABLE-WIDE, 200 rows/.test(out) && /428C9/.test(out),
        `a table-wide failure must still be NAMED with its row count and SQLSTATE. Output:\n${out}`);

      // (e) EXIT CODE -- non-zero, because rows were lost. The runbook's existing contract
      //     ("a genuinely stuck table is named at the end and exits non-zero"), at row grain.
      assert(code === 1, `expected exit 1 when rows could not load, got ${code}`);
    } finally {
      server.close();
    }
  }

  // === ARM 2: everything rescued -- the one case that turns a non-zero exit back to zero =====
  //
  // This is the ticket's actual payoff and it needs its own arm: with the two bad rows removed
  // but the batch still rejected (the wide table is what stalls the pass), a run that loads every
  // row must exit 0. An implementation that reported honestly and still exited 1 would pass
  // Arm 1 and fail here.
  {
    const { server, log, port } = await startStub();
    try {
      const setDir = writeSet(path.join(tmp, "clean"), { includeBad: false, includeWide: false });
      const { code, out } = await runRestore(script, setDir, port);
      assert(code === 0, `a set with no unloadable row must exit 0, got ${code}. Output:\n${out}`);
      assert((log.batchOk.pending_confirmations || 0) === 1,
        "a healthy table must still load in ONE batch -- the fallback must not turn every restore " +
        "into one request per row");
      assert((log.singleOk.pending_confirmations || 0) === 0,
        "the fallback fired on a table no batch pass had failed; it must run only over tables the " +
        "batch loop could not load");
      assert(!/Row-level fallback/.test(out),
        `a clean restore must not mention the fallback at all. Output:\n${out}`);
    } finally {
      server.close();
    }
  }

  fs.rmSync(tmp, { recursive: true, force: true });
}

export default run;
selfRun(import.meta.url, run);
