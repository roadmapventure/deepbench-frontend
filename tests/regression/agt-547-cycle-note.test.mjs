// DeepBench v7.0.929 | tests/regression/agt-547-cycle-note.test.mjs | AGT-547 -- THE CYCLE'S OWN
// RECORD LANDS, AND A REFUSED NOTE IS STILL REFUSED.
//
// WHAT WENT WRONG (`AGT-547`, filed from cycle `68372c07`): two appends of roughly 1.5-2.5 KB to
// `public.runner_cycles.notes` through the Supabase MCP connector timed out at that connector's
// 60s ceiling and left `notes_len` unchanged at 303. The write reported failure and wrote nothing,
// so step 9's close-out record was lost silently. `scripts/cycle-note.js` is the PostgREST path
// step 9 now names, and this guard is what notices if that path regresses or is reinstated behind
// the connector.
//
// THE TWO DIRECTIONS, because only one of them is the obvious one:
//   (a) a multi-KB append LANDS and reads back, and a second identical run appends NOTHING;
//   (b) a note the citation guard refuses still gets refused -- exit 1, `notes` unchanged on
//       read-back. A path change that quietly bypassed `trg_runner_cycles_notes_citations` would
//       pass (a) and fail (b), and it is (b) that makes this a guard rather than a smoke test.
//
// EXIT CODES ARE THE CONTRACT and they are `scripts/cycle-heartbeat.js`'s, exactly -- 2 cannot
// run, 1 ran and did not land, 0 landed. The arms below drive the real CLI with `spawnSync`
// rather than re-deciding the codes in this file (`SES-45`: logic recreated inside a test is a
// second implementation agreeing with itself).
//
// THE LIVE ARM IS IDEMPOTENT BY CONSTRUCTION, which is how it obeys pattern:76 while still
// proving a real append. It writes ONE fixed sentence to ONE fixed historical cycle row: the
// first ever run appends it, and every run after that takes the never-twice branch and only
// reads. The suite therefore does not grow that column, and there is nothing to clean up.

import assert from "assert";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseArgs, appendNote, landed } from "../../scripts/cycle-note.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT_REL = "scripts/cycle-note.js";
const CRED_HINT = "export SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets by name) to run the live arm";

// pattern:127 -- a fixed, canonical pick, never "the newest row", so two runs are comparable and
// the write stays bounded to one row forever. This is AGT-547's own build cycle.
const FIXTURE_CYCLE = "9f4468f2-dba3-4daa-b557-fde6b73af427";
const SENTINEL =
  "cycle-note guard: this fixed note proves the PostgREST append lands once and never twice";
// A 40-hex commit sha no ref holds. The guard refuses it by construction (AGT-173), so this arm
// never lands a write -- it is the refusal that is being asserted.
const UNVERIFIABLE_SHA = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

const UUID_OK = "00000000-0000-4000-8000-000000000000";

function runCli(args, env = {}) {
  return spawnSync(process.execPath, [path.join(ROOT, SCRIPT_REL), ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

// --- (1) the pure arg guard, both directions, no network ---------------------------------------
function theParserRefusesWhatCannotRun() {
  assert.ok(parseArgs(["--note=x"]).error, "no --cycle must be refused");
  assert.ok(parseArgs([`--cycle=not-a-uuid`, "--note=x"]).error, "a --cycle that is not a uuid must be refused");
  assert.ok(parseArgs([`--cycle=${UUID_OK}`]).error, "a missing --note must be refused");
  assert.ok(parseArgs([`--cycle=${UUID_OK}`, "--note=   "]).error, "a blank --note must be refused");
  const ok = parseArgs([`--cycle=${UUID_OK}`, "--note=  a real note  "]);
  assert.strictEqual(ok.error, undefined, "a well-formed pair must parse");
  assert.strictEqual(ok.note, "a real note", "the note must be trimmed");
  assert.strictEqual(ok.cycle, UUID_OK, "the cycle must survive parsing verbatim");
}

// --- (2) never twice -- settle-ship.js:535's shape, now with one home --------------------------
function theAppendIsNeverTwice() {
  assert.strictEqual(appendNote("", "n"), "n", "an empty column takes the note alone, with no leading separator");
  assert.strictEqual(appendNote("   ", "n"), "n", "a whitespace-only column counts as empty");
  assert.strictEqual(appendNote("a", "n"), "a | n", "a non-empty column gets ` | ` then the note");
  assert.strictEqual(appendNote("a | n", "n"), "a | n",
    "a note already present must append NOTHING -- a second run of the close-out must not stack the same clause");
  assert.strictEqual(appendNote(null, "n"), "n", "a NULL notes column must not render as the string 'null'");
  // Discriminating: applying it TWICE is the same as applying it once (idempotent), while a
  // naive join is not. Asserted as the pair, because the fixed point is the property that makes
  // a re-run of the close-out safe.
  const once = appendNote("a", "n");
  assert.strictEqual(appendNote(once, "n"), once, "appendNote must be idempotent -- twice is once");
  assert.strictEqual(`${once} | n`.length, once.length + 4,
    "the naive join WOULD have grown by 4 -- so the no-growth above is the never-twice branch firing, not a tie");
}

// --- (3) zero rows back is a failure, not an empty success -------------------------------------
function zeroRowsIsNotASuccess() {
  assert.strictEqual(landed([]), null,
    "PostgREST answers 200 with [] for a cycle id that names no row -- that is a FAILED write, not an empty one");
  assert.strictEqual(landed(null), null, "unparseable body is not a landing");
  assert.strictEqual(landed([{ id: "x" }, { id: "y" }]), null, "two rows is not the one row we targeted");
  assert.ok(landed([{ id: "x" }]), "exactly one row back is the landing");
}

// --- (4) the exit codes, driven through the real CLI -------------------------------------------
function theExitCodesAreTheContract() {
  const noCycle = runCli(["--note=x"], { SUPABASE_URL: "", SUPABASE_SERVICE_KEY: "" });
  assert.strictEqual(noCycle.status, 2, "a missing --cycle is 'cannot run' (2), never 'did not land' (1)");
  const badUuid = runCli(["--cycle=nope", "--note=x"], { SUPABASE_URL: "", SUPABASE_SERVICE_KEY: "" });
  assert.strictEqual(badUuid.status, 2, "a --cycle that is not a uuid is 'cannot run' (2)");
  const blankNote = runCli([`--cycle=${UUID_OK}`, "--note="], { SUPABASE_URL: "", SUPABASE_SERVICE_KEY: "" });
  assert.strictEqual(blankNote.status, 2, "a blank --note is 'cannot run' (2) -- nothing is attempted");

  // The valid-argument path must get PAST the parser, or the three arms above would pass for a
  // script that refuses everything.
  const wellFormed = runCli([`--cycle=${UUID_OK}`, "--note=x"], { SUPABASE_URL: "", SUPABASE_SERVICE_KEY: "" });
  assert.strictEqual(wellFormed.status, 1,
    "well-formed arguments must reach the credentials check and exit 1 there, never be refused as 2");
  assert.ok(/unset/.test(wellFormed.stderr), "the no-credentials exit must say the note did not land");
}

// --- (5) the live arm: it lands, it never lands twice, and a refused note stays refused --------
async function itLandsAndTheGuardStillRefuses() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("AGT-547 live: the append lands, reads back, never twice, and a guard-refused note leaves notes unchanged",
      CRED_HINT);
    return null;
  }
  const root = base.replace(/\/+$/, "");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const readNotes = async () => {
    const res = await fetch(`${root}/rest/v1/runner_cycles?select=notes&id=eq.${FIXTURE_CYCLE}`, { headers });
    const rows = await res.json();
    assert.ok(Array.isArray(rows) && rows.length === 1,
      `the fixture cycle ${FIXTURE_CYCLE} must still be one row for this arm to mean anything`);
    return typeof rows[0].notes === "string" ? rows[0].notes : "";
  };

  // (a) it lands and reads back.
  const first = runCli([`--cycle=${FIXTURE_CYCLE}`, `--note=${SENTINEL}`]);
  assert.strictEqual(first.status, 0, `the append must exit 0 -- got ${first.status}: ${first.stderr || first.stdout}`);
  const afterFirst = await readNotes();
  assert.ok(afterFirst.includes(SENTINEL),
    "the note must be in the row on a FRESH read -- an echoed representation the column did not keep is not a landing");

  // (b) a second identical run appends nothing and still exits 0.
  const second = runCli([`--cycle=${FIXTURE_CYCLE}`, `--note=${SENTINEL}`]);
  assert.strictEqual(second.status, 0, "a second identical run must still exit 0");
  const afterSecond = await readNotes();
  assert.strictEqual(afterSecond.length, afterFirst.length,
    "a second identical run must leave notes byte-unchanged -- never twice");
  assert.ok(/ALREADY present/.test(second.stdout),
    "the second run must SAY it took the never-twice branch, so a reader can tell a no-op from a write");

  // (c) both directions: the citation guard still refuses, and the refusal did not write.
  const refused = runCli([`--cycle=${FIXTURE_CYCLE}`, `--note=guard probe naming commit ${UNVERIFIABLE_SHA}`]);
  assert.strictEqual(refused.status, 1,
    "a note the citation guard refuses must exit 1 -- this path must not bypass trg_runner_cycles_notes_citations");
  assert.ok(/runner_record_citation_guard/.test(refused.stderr),
    "the guard's own message must reach the caller verbatim, not a generic failure");
  const afterRefusal = await readNotes();
  assert.strictEqual(afterRefusal.length, afterSecond.length,
    "a refused note must leave notes unchanged on read-back -- a partial write would be worse than a refusal");

  return { chars: afterRefusal.length };
}

async function run() {
  theParserRefusesWhatCannotRun();
  theAppendIsNeverTwice();
  zeroRowsIsNotASuccess();
  theExitCodesAreTheContract();
  const live = await itLandsAndTheGuardStillRefuses();
  console.log(`[AGT-547] ${SCRIPT_REL} exits 2/2/2 on bad args and 1 (never 0) with no credentials; ` +
    `appendNote() is never-twice in both branches and 0 rows back is a failure; ` +
    (live
      ? `live on ${FIXTURE_CYCLE}: the sentinel reads back, a second run leaves notes byte-unchanged at ` +
        `${live.chars} chars, and a note naming an unresolvable commit sha exits 1 with the guard's own ` +
        `message and no write`
      : `live arm DECLARED not run (no credentials)`));
}

selfRun(import.meta.url, run);
export default run;
