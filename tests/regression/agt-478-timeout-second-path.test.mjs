// DeepBench v7.0.941 | tests/regression/agt-478-timeout-second-path.test.mjs | AGT-478 -- A TOOL
// TIMEOUT IS RETRIED ON THE SECOND PATH BEFORE IT IS EVER CALLED DATABASE PRESSURE.
//
// WHAT WENT WRONG (`AGT-478`, premise re-measured 2026-11-03 on tree `fd4a0d4`). Step 0b's timeout
// rule was the only one in the runbook, and it had one limb: `db_level` red/unsafe **or** a
// heartbeat that failed or took > 10 s went straight to `db-pressure.js --hold`. Those are not the
// same event. Measured in one session on this project: the PostgREST heartbeat answered in 0.23 s
// and `rpc/db_health_level` came back green in 0.22 s, while a ONE-ROW `DELETE` through the
// Supabase MCP connector sat for 60 s and came back "timed out after 60s / the server asked the
// user a question, and no answer came before the time limit" -- an unanswered confirmation prompt
// on the connector, with a healthy database underneath it. Under the old clause that single slow
// call closed the cycle `failed` with `last_step 'held: db_pressure'`, which is a false diagnosis
// and, worse, a cycle lost to a path that was never ill.
//
// THE FIX IS TWO SENTENCES, NOT ONE: the `db_level` limb keeps the hold, and a failed-or-slow
// write is retried IDENTICALLY over PostgREST first, with `--check` read and BOTH readings recorded
// in `notes`; only red/unsafe holds. The second half of the same ticket is that (7b) was the ONLY
// place naming the PostgREST notes path -- so the rest of the tail's notes lines (7c, 7f, 8, the
// close-out record) still read as if the connector `UPDATE` were the ordinary route, which is the
// 60 s ceiling that already lost two appends in cycle `68372c07` (`AGT-547`).
//
// SOURCE-ONLY, ALWAYS RUNS. One file read and one import; no credentials, no network, no Supabase,
// so this guard cannot be a credentialed skip in an unattended cycle.
//
// EVERY ARM CARRIES A NEGATIVE CONTROL that must go RED on the mutation (the `SES-158` failure: a
// control that changes nothing pins nothing). Each arm is a pure predicate over the runbook text,
// so the control feeds it the pre-change text and asserts the predicate THROWS -- proving the arm
// discriminates the fix from its absence rather than passing on any document at all.
//
// THE BYTE PIN IS NOT DECORATION. 380,920 B is an EQUALITY pin in three other guards
// (`ses-413d-questions-scoreboard`:273, `agt-253-design-only-lane`:73, `agt-525-tail-push`:57), and
// `agt-138-researcher-routine`'s one-way ratchet sits just above it. `AGT-478` therefore landed
// byte-neutral -- the retired `v7.0.641` stamp paid for both new clauses exactly -- and arm (C)
// imports `BYTES_AT_SHIP` from `ses-413d` rather than restating the number, so the four pins can
// never disagree.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { BYTES_AT_SHIP } from "./ses-413d-questions-scoreboard.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const RUNBOOK = path.join(ROOT, RUNBOOK_REL);

// The shipped clauses each arm demands.
const NEW_TIMEOUT_CLAUSE = "**Heartbeat (or any write) failed or > 10 s:**";
const NEW_NOTES_CLAUSE = "EVERY notes line of this tail";
const STAMP_IN = "v7.0.941 | runbooks/runner-cycle.md";

// The pre-change strings that must now have ZERO hits anywhere in the file. A survivor is not a
// cosmetic leftover: two timeout rules, or two accounts of which path writes `notes`, is the
// one-home violation (§19v) that lets a reader follow the retired one.
const OLD_TIMEOUT_CLAUSE = "or the heartbeat failed or took > 10 s";
const OLD_FALLBACK_CLAUSE = "a documented FALLBACK";
const STAMP_OUT = "v7.0.641 | runbooks/runner-cycle.md";

const STAMP_LINE = "<!-- DeepBench v";
const STAMP_COUNT = 5;   // the runbook's standing stamp census (`SES-164` step 2)

const count = (text, needle) => text.split(needle).length - 1;

// A step's span, from the line that opens it to the line that opens the next one. Taken by label
// rather than by line number on purpose: a line-number assertion would go red on any edit above
// the step and tell the reader nothing about this ticket.
function span(text, openLabel, closeLabel) {
  const lines = text.split("\n");
  const start = lines.findIndex(l => l.startsWith(openLabel));
  assert.ok(start >= 0, `${RUNBOOK_REL} must still open a step with ${openLabel}`);
  const rest = lines.slice(start + 1).findIndex(l => l.startsWith(closeLabel));
  assert.ok(rest >= 0, `${RUNBOOK_REL} must still open a step with ${closeLabel} after ${openLabel}`);
  return lines.slice(start, start + 1 + rest).join("\n");
}

// --- (A) the timeout rule lives in step 0b, and it has two limbs ------------------------------
function theTimeoutRuleIsTwoLimbsInStep0b(text) {
  const zeroB = span(text, "**0b.", "**1.");
  assert.ok(zeroB.includes(NEW_TIMEOUT_CLAUSE),
    `step 0b must carry ${NEW_TIMEOUT_CLAUSE} -- the limb that separates a slow or failed write ` +
    `from database pressure. Placement matters: 0b is the step that holds, so a rule shipped ` +
    `anywhere else is a rule the holding step never reads.`);
  // Both halves of the retry, not just the heading: a clause that names the second path without
  // naming the reading it must record would read as "try again" and hold on the next timeout.
  assert.ok(/retry it IDENTICALLY/.test(zeroB), "0b must say the retry is IDENTICAL, not a different write");
  assert.ok(zeroB.includes("over PostgREST"), "0b must NAME the second path -- PostgREST, not 'another path'");
  assert.ok(/db-pressure\.js --check/.test(zeroB) && /record both in `notes`/.test(zeroB),
    "0b must read `--check` and record BOTH readings in `notes` -- an unrecorded retry leaves the next cycle guessing");
  assert.ok(/hold only on red\/unsafe/.test(zeroB),
    "0b must say the hold is conditioned on red/unsafe -- that condition IS the fix");
  // The `db_level` limb must SURVIVE the split. Removing the hold would also make the arm above
  // pass, and that would be a regression dressed as a fix (pattern:166 -- a degrade does not
  // remove a stop).
  assert.ok(/\*\*`db_level` red\/unsafe:\*\* finish the step, run `db-pressure\.js --hold`/.test(zeroB),
    "the `db_level` red/unsafe limb must still hold -- the split must not drop the stop it was built on");
  assert.strictEqual(count(text, OLD_TIMEOUT_CLAUSE), 0,
    `the retired one-limb clause "${OLD_TIMEOUT_CLAUSE}" must have ZERO hits in ${RUNBOOK_REL} -- ` +
    `a surviving copy is a second timeout rule, and it is the one that sends a 60 s connector ` +
    `prompt to --hold`);
}

// --- (B) (7b) names the PostgREST path for the whole tail, not just itself ---------------------
function theNotesPathCoversTheWholeTail(text) {
  const sevenB = span(text, "**(7b)", "**(7c)");
  assert.ok(sevenB.includes(NEW_NOTES_CLAUSE),
    `(7b) must say \`cycle-note.js\` is the path for ${NEW_NOTES_CLAUSE} -- scoped to (7b) alone, ` +
    `the rest of the tail still reads as if the connector UPDATE were the ordinary route`);
  // The sites, named. "every notes line" with no list is the kind of sentence a reader applies to
  // the line in front of them and nothing else.
  for (const site of ["(7c)", "(7f)", "(8)", "the close-out record"]) {
    assert.ok(sevenB.includes(site),
      `(7b) must name ${site} among the notes lines the PostgREST path covers`);
  }
  assert.ok(/The connector `UPDATE` is\nthe FALLBACK:/.test(sevenB),
    "the connector UPDATE must read as THE fallback -- the demotion is the point of the sentence");
  assert.strictEqual(count(text, OLD_FALLBACK_CLAUSE), 0,
    `"${OLD_FALLBACK_CLAUSE}" must have ZERO hits -- "a documented FALLBACK" is the wording that ` +
    `left the connector standing as an equal route to the one that lost two appends at 60 s`);
}

// --- (C) byte-neutral, and the stamp census intact --------------------------------------------
function theEditIsByteNeutralAndStamped(text) {
  const bytes = Buffer.byteLength(text, "utf8");
  assert.strictEqual(bytes, BYTES_AT_SHIP,
    `${RUNBOOK_REL} must read exactly ${BYTES_AT_SHIP} B -- the number ses-413d, agt-253 and ` +
    `agt-525 all pin by EQUALITY. It reads ${bytes} B (${bytes - BYTES_AT_SHIP > 0 ? "+" : ""}` +
    `${bytes - BYTES_AT_SHIP}). AGT-478 was shipped byte-neutral precisely so those three pins ` +
    `did not have to move; a drift here means the runbook changed without its pins.`);
  assert.strictEqual(count(text, STAMP_LINE), STAMP_COUNT,
    `${RUNBOOK_REL} must carry exactly ${STAMP_COUNT} "${STAMP_LINE}" stamps -- AGT-478 rotated ` +
    `v7.0.641 out for its own, it did not add a sixth`);
  assert.ok(text.includes(STAMP_IN), `the ${STAMP_IN} stamp must be present -- the edit must sign itself`);
  assert.strictEqual(count(text, STAMP_OUT), 0,
    `the ${STAMP_OUT} stamp must be gone -- it is the 463 B that paid for both new clauses, so a ` +
    `surviving copy means the byte count above is balancing something else`);
}

// --- the negative controls --------------------------------------------------------------------
//
// Each control reconstructs the PRE-CHANGE text for its own arm and asserts the arm THROWS on it.
// The pre-change text is built from the shipped text by reversing this ticket's own replacement,
// so a control cannot drift away from what the arm checks.
const threw = fn => {
  try { fn(); } catch { return true; }
  return false;
};

function theArmsGoRedOnThePreChangeText(text) {
  // (A) the one-limb clause restored.
  const preA = text.replace(
    /\*\*`db_level` red\/unsafe:\*\* finish the step[\s\S]*?Run `run-all\.js` only after `--check` exits 0 or 1\.\n/,
    "**`db_level` red/unsafe, or the heartbeat failed or took > 10 s:** finish the step, run\n" +
    "`db-pressure.js --hold`; exit 4 → close `failed`, `last_step 'held: db_pressure'`, end. Run\n" +
    "`run-all.js` only after `--check` exits 0 or 1.\n");
  assert.notStrictEqual(preA, text, "control (A) must actually change the text, or it pins nothing");
  assert.ok(threw(() => theTimeoutRuleIsTwoLimbsInStep0b(preA)),
    "arm (A) must go RED on the one-limb 0b clause -- as written it would pass on the pre-change runbook");

  // (B) the tail-wide scope and the demotion removed.
  const preB = text
    .replace(`--note=<text>\`, the PostgREST path for ${NEW_NOTES_CLAUSE} ((7c), (7f), (8), the close-out record). The connector \`UPDATE\` is\nthe FALLBACK:`,
      "--note=<text>`. The connector `UPDATE` is\na documented FALLBACK:");
  assert.notStrictEqual(preB, text, "control (B) must actually change the text, or it pins nothing");
  assert.ok(threw(() => theNotesPathCoversTheWholeTail(preB)),
    "arm (B) must go RED when (7b) scopes the PostgREST path to itself again");

  // (C) one byte added, and separately the stamp rotated back.
  assert.ok(threw(() => theEditIsByteNeutralAndStamped(`${text} `)),
    "arm (C) must go RED on a single added byte -- an equality pin that tolerates a byte is a ratchet, not a pin");
  assert.ok(threw(() => theEditIsByteNeutralAndStamped(text.replace(STAMP_IN, STAMP_OUT))),
    "arm (C) must go RED when the v7.0.941 stamp is rotated back to v7.0.641 at the same byte count");
}

async function run() {
  const text = fs.readFileSync(RUNBOOK, "utf8");
  theTimeoutRuleIsTwoLimbsInStep0b(text);
  theNotesPathCoversTheWholeTail(text);
  theEditIsByteNeutralAndStamped(text);
  theArmsGoRedOnThePreChangeText(text);
  console.log(`[AGT-478] ${RUNBOOK_REL}: step 0b splits the hold from the retry -- a failed or ` +
    `> 10 s write is retried IDENTICALLY over PostgREST with --check read and both readings in ` +
    `notes, and holds only on red/unsafe (0 hits of the one-limb clause); (7b) names the ` +
    `PostgREST notes path for (7c), (7f), (8) and the close-out record with the connector UPDATE ` +
    `demoted to THE fallback (0 hits of "a documented FALLBACK"); ${BYTES_AT_SHIP} B exactly, ` +
    `${STAMP_COUNT} stamps, v7.0.941 in and v7.0.641 out; all three arms verified RED on the ` +
    `pre-change text.`);
}

selfRun(import.meta.url, run);
export default run;
