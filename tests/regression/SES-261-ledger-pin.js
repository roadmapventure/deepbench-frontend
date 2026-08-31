// DeepBench v7.0.347 | tests/regression/SES-261-ledger-pin.js | SES-261
//
// Guards the LEDGER PIN in scripts/render-claude-state.js — the fix for "every runner ship makes CI
// red by construction".
//
// THE DEFECT THIS PINS, so a later editor does not "simplify" it back: `--check` used to re-render
// from the LIVE top-10 shipped cycles and byte-compare against the committed file. A cycle's own row
// reaches `outcome='shipped'` only in its step-9 tail — AFTER it rendered, committed and pushed — so
// the committed file was stale the instant its own cycle closed, and every LATER commit by anyone
// stayed red until something happened to re-render. Measured 2026-08-31: cycle `a906b726` closed
// shipped at 17:08:22Z; dev commits `05506b0` (17:24Z) and `b7f97081` (17:43Z) were both red on this
// one test with `Build (blocking)` green, 130/131 locally.
//
// THE LOAD-BEARING ASSERTION IS A DIFFERENCE, NOT A SHARED PROPERTY. theRetiredComparatorLoses()
// runs the retired live-top-10 form and the shipped pin-anchored form on the SAME fixture and asserts
// they DISAGREE — old red, new green. A test that only asserted "the new form is green" is satisfied
// by an always-green comparator, which is the one failure mode that matters here: a gate that cannot
// fail is worse than the red it replaces.
//
// The predicates are IMPORTED from the real script, never reimplemented (John's rule 2026-08-23,
// "you should never be throwing away tests"; the DIR-603f44ea / SES-176 precedent) — including the
// retired form, which is reconstructed out of the same exported `renderBody` rather than copied, so
// it cannot drift away from what it is controlling against.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { renderBody, renderPin, parsePin, checkAgainstPin } from "../../scripts/render-claude-state.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STATE = path.join(ROOT, "CLAUDE-STATE.md");
const SCRIPT = path.join(ROOT, "scripts/render-claude-state.js");

// A fixture cycle. Deterministic by construction — no clock, no network.
function CY(n, extra = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    started_at: `2026-08-${String(10 + n).padStart(2, "0")}T12:00:00Z`,
    trigger: "scheduled",
    model: "claude-opus-5",
    version: `v7.0.${300 + n}`,
    item_id: `SES-${100 + n}`,
    push_sha: `sha${n}`,
    outcome: "shipped",
    ...extra,
  };
}

const LEDGER = Array.from({ length: 10 }, (_, i) => CY(10 - i)); // newest first, as the REST order gives it
const NO_CARDS = new Map();

// The retired comparator, reconstructed from the SAME imported renderBody rather than copied.
function retiredComparator(fileText, liveTop10) {
  return renderBody(liveTop10, NO_CARDS) === fileText ? 0 : 1;
}

// ---------------------------------------------------------------------------
// THE DISCRIMINATING CONTROL — old and new must DISAGREE on one fixture
// ---------------------------------------------------------------------------
function theRetiredComparatorLoses() {
  const file = renderBody(LEDGER, NO_CARDS);

  // Simulate the step-9 tail: the pushing cycle's own row flips to `shipped` and enters the top-10.
  const afterTheTailCloses = [CY(99), ...LEDGER].slice(0, 10);

  const shipped = checkAgainstPin(file, LEDGER, NO_CARDS).code;
  const retired = retiredComparator(file, afterTheTailCloses);

  assert.strictEqual(shipped, 0,
    "the pin-anchored form must report NO drift after the cycle's own row closes — that is the whole ticket");
  assert.strictEqual(retired, 1,
    "the retired live-top-10 form must report drift on the same fixture — if it does not, this control proves nothing");
  assert.notStrictEqual(shipped, retired,
    "old and new must DISAGREE here; a control asserting a property both forms share is vacuous");
}

// The shared direction: a genuine hand-edit must still fail under BOTH forms. This is the half that
// stops the fix from being "delete the gate".
function aHandEditStillFailsUnderBothForms() {
  const file = renderBody(LEDGER, NO_CARDS);
  const tampered = file.replace("**Prior:**", "**Prior:** HAND-EDITED");
  assert.notStrictEqual(tampered, file, "the fixture edit must actually change the bytes");

  assert.strictEqual(checkAgainstPin(tampered, LEDGER, NO_CARDS).code, 1,
    "a hand-edited body must be DRIFT under the pin-anchored form — the acceptance bar's second direction");
  assert.strictEqual(retiredComparator(tampered, LEDGER), 1,
    "and under the retired form too — this direction is a property both share, which is why it is not the control");
}

// ---------------------------------------------------------------------------
// Fail-closed: every way the pin can be absent or wrong must be exit 1, never 0
// ---------------------------------------------------------------------------
function anAbsentPinIsDriftAndNeverAPass() {
  const file = renderBody(LEDGER, NO_CARDS);
  const stripped = file.replace(/ ledger-pin: [^ ]* -->/, " -->");
  assert.ok(!stripped.includes("ledger-pin:"), "the fixture must actually have lost its pin");

  assert.strictEqual(parsePin(stripped).length, 0, "a stripped pin must parse to nothing");
  assert.strictEqual(checkAgainstPin(stripped, LEDGER, NO_CARDS).code, 1,
    "NO PIN MUST BE DRIFT. A 'gracefully skip when the pin is absent' branch would let deleting one "
    + "comment turn the gate green — the exact inversion of the hand-edit direction.");
}

function aPinTheLedgerCannotAnswerIsDrift() {
  const file = renderBody(LEDGER, NO_CARDS);

  // A pinned row that no longer exists — the ledger disowns what the file claims.
  const short = LEDGER.slice(1);
  assert.strictEqual(checkAgainstPin(file, short, NO_CARDS).code, 1,
    "a pinned cycle missing from the ledger must be drift, not a pass");

  // A pinned row that is no longer `shipped` — e.g. reopened or reverted.
  const reverted = LEDGER.map((c, i) => (i === 0 ? { ...c, outcome: "reverted" } : c));
  assert.strictEqual(checkAgainstPin(file, reverted, NO_CARDS).code, 1,
    "a pinned cycle that is no longer outcome=shipped must be drift");
}

// A deleted row (drift, 1) and a REST failure (could not run, 2) are DIFFERENT verdicts. The pure
// comparator must never return 2 — conflating them is how a check softens.
function theComparatorNeverReturnsCouldNotRun() {
  const file = renderBody(LEDGER, NO_CARDS);
  for (const rows of [[], LEDGER.slice(2), LEDGER]) {
    assert.notStrictEqual(checkAgainstPin(file, rows, NO_CARDS).code, 2,
      "checkAgainstPin is the DRIFT verdict only; 'could not run' belongs to the caller's network layer");
  }
}

// ---------------------------------------------------------------------------
// The pin round-trips, and it is order-sensitive
// ---------------------------------------------------------------------------
function thePinRoundTrips() {
  const file = renderBody(LEDGER, NO_CARDS);
  assert.deepStrictEqual(parsePin(file), LEDGER.map(c => c.id),
    "the pin must parse back to exactly the ids, in render order");
  assert.strictEqual(renderPin(LEDGER), LEDGER.map(c => c.id).join(","), "renderPin is the id list, in order");
}

function reorderingThePinIsDrift() {
  const file = renderBody(LEDGER, NO_CARDS);
  const swapped = [LEDGER[1], LEDGER[0], ...LEDGER.slice(2)];
  const reordered = file.replace(`ledger-pin: ${renderPin(LEDGER)}`, `ledger-pin: ${renderPin(swapped)}`);
  assert.notStrictEqual(reordered, file, "the fixture must actually have reordered the pin");
  assert.strictEqual(checkAgainstPin(reordered, LEDGER, NO_CARDS).code, 1,
    "the pin names an ORDER as well as a set — the version lines read cycles[0..1], so a swap is a real change");
}

// ---------------------------------------------------------------------------
// The committed file itself carries a pin (this is what CI actually grades)
// ---------------------------------------------------------------------------
function theCommittedFileCarriesAPin() {
  const state = fs.readFileSync(STATE, "utf8");
  const pin = parsePin(state);
  assert.ok(pin.length > 0,
    "the committed CLAUDE-STATE.md must carry a ledger-pin — without one, --check is exit 1 by design");
  for (const id of pin) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      `every pinned id must be a uuid; got ${id}`);
  }
}

// ---------------------------------------------------------------------------
// End-to-end, credentialed: the real script against the real ledger, BOTH directions
// ---------------------------------------------------------------------------
function theRealScriptAgreesAndHasTeeth() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    notRun("render-claude-state --check end-to-end",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set here; the offline assertions above still ran");
    return;
  }
  const spawn = () => {
    try {
      execFileSync(process.execPath, [SCRIPT, "--check"], { cwd: ROOT, stdio: "pipe" });
      return 0;
    } catch (e) {
      return e.status;
    }
  };

  assert.strictEqual(spawn(), 0, "the committed CLAUDE-STATE.md must be a byte-exact render of the cycles it pins");

  // Teeth, on the real file, restored in a finally so a failure here cannot leave the tree dirty.
  const good = fs.readFileSync(STATE, "utf8");
  try {
    fs.writeFileSync(STATE, good.replace("**Prior:**", "**Prior:** HAND-EDITED"));
    assert.strictEqual(spawn(), 1, "a hand-edit of the real file must exit 1 — otherwise this gate is vacuous");
  } finally {
    fs.writeFileSync(STATE, good);
  }
  assert.strictEqual(fs.readFileSync(STATE, "utf8"), good, "the test must leave CLAUDE-STATE.md byte-identical");
}

function run() {
  theRetiredComparatorLoses();
  aHandEditStillFailsUnderBothForms();
  anAbsentPinIsDriftAndNeverAPass();
  aPinTheLedgerCannotAnswerIsDrift();
  theComparatorNeverReturnsCouldNotRun();
  thePinRoundTrips();
  reorderingThePinIsDrift();
  theCommittedFileCarriesAPin();
  theRealScriptAgreesAndHasTeeth();
}

selfRun(import.meta.url, run);
export default run;
