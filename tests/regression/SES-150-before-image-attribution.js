// DeepBench v7.0.234 | tests/regression/SES-150-before-image-attribution.js | SES-150
//
// Guards the fix for "attended sessions cannot record a board before-image". Two halves, and they
// were designed together: the SCHEMA (migration ses150_before_image_attended_sessions --
// runner_before_images.cycle_id nullable, session_name added, ck_before_image_attribution pinning
// EXACTLY ONE of the two) and the INSTRUCTION in CLAUDE-DESIGN.md that now tells an attended
// session which column is its own. A checkout carrying the schema without the instruction leaves
// every attended session doing what the three disclosed incidents did -- writing before-values
// into docs/SESSIONS.md prose -- so one test guards both.
//
// THE RULE IS READ OUT OF THE DOC, never restated here (John's rule 2026-08-23, "you should never
// be throwing away tests"; the SES-176 / SES-158 / SES-194 precedent). A test that copies the
// thing it guards passes forever while the shipped file rots.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that
// should matter removed. "Would this still pass if the change did nothing?" must answer "no" for
// every clause. The meta-assertion is carried forward from SES-194 because SES-158 shipped a
// control that changed nothing and only a checked control caught it.
//
// THE CLAUSE THIS FILE EXISTS FOR, above the others: `exactly-one`. A later editor will read
// ck_before_image_attribution as redundant tidying on top of "make cycle_id nullable" and drop it.
// It is not tidying. Without it an Automated cycle can insert an UNATTRIBUTED before-image -- a row
// that satisfies ARCHITECTURE.md §19v's "no before-image, no write" while naming nobody, which is a
// worse ledger than the gap this ticket closed. `exactlyOneIsPinned` and its control are the pin.
//
// WHAT THE LIVE HALF CAN AND CANNOT REACH, declared rather than implied (SES-180 (b)). The
// REJECTION path is testable live and writes nothing by construction: an insert the constraint
// refuses leaves no row. It is also the DISCRIMINATING direction, which is why it is the one
// wired up -- on the pre-migration schema the same request failed too, but with a NOT NULL
// violation on cycle_id, so asserting the error names ck_before_image_attribution is an assertion
// the old build could not have passed. The ACCEPT path (an attended row actually landing) cannot
// be proven here without writing to the live ledger, so it is declared not-run and its evidence is
// the six-arm live QA on the ship card.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GUIDE = path.join(ROOT, "CLAUDE-DESIGN.md");

const NOTE_START = "**(added 2026-08-24, `SES-150`";
const NOTE_END = "This applies to items mentioned casually in conversation";

// Pure: slice the bounded block out of the guide. Returns "" when absent -- itself a finding
// rather than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

export const extractNote = md => extractBlock(md, NOTE_START, NOTE_END);

// Pure: the load-bearing clauses, kept as data so a negative control can name exactly which one it
// removed. A clause earns its place only if REMOVING it would change what a session does.
export const CLAUSES = [
  {
    id: "attended-column-is-named",
    detail: "an attended session must be told its column is session_name -- without the name the instruction is still unfollowable, which is the whole ticket",
    test: s => /session_name/.test(s) && /attended/i.test(s),
    breaks: s => s.replace(/session_name/g, "the attribution column"),
  },
  {
    id: "cycle-column-is-named",
    detail: "the Automated column must be named too, or a cycle reading this note reaches for session_name and trips the XOR",
    test: s => /cycle_id/.test(s),
    breaks: s => s.replace(/cycle_id/g, "its own column"),
  },
  {
    id: "exactly-one-is-pinned",
    detail: "THE CLAUSE THIS FILE EXISTS FOR: the note must say exactly one of the two is set AND name the constraint, or a later editor reads the CHECK as redundant and drops it, re-admitting unattributed before-images",
    test: s => /exactly one/i.test(s) && /ck_before_image_attribution/.test(s),
    breaks: s => s.replace(/ck_before_image_attribution/g, "a database check"),
  },
  {
    id: "neither-and-both-are-refused",
    detail: "the note must state BOTH failure directions -- a note that forbids only the empty case reads as permission to set both, which makes 'who wrote this' ambiguous at Reverse time",
    test: s => /neither/i.test(s) && /both/i.test(s),
    breaks: s => s.replace(/neither/gi, "no column"),
  },
  {
    id: "the-gap-is-dated",
    detail: "the note must say the instruction was previously impossible and when that ended, or a session reading it cannot tell whether an old disclosure in SESSIONS.md was a failure or the procedure of its day",
    test: s => /NOT NULL/.test(s) && /v7\.0\.234/.test(s),
    breaks: s => s.replace(/NOT NULL/g, "restricted"),
  },
];

function note() {
  const md = fs.readFileSync(GUIDE, "utf8");
  const block = extractNote(md);
  assert.ok(block, `CLAUDE-DESIGN.md no longer carries the SES-150 attribution note (looked for "${NOTE_START}")`);
  return block;
}

function theShippedGuideIsClean() {
  const b = note();
  for (const c of CLAUSES) {
    assert.ok(c.test(b), `CLAUDE-DESIGN.md's SES-150 note fails clause "${c.id}": ${c.detail}`);
  }
}

function everyClauseHasTeeth() {
  const b = note();
  for (const c of CLAUSES) {
    const mutated = c.breaks(b);
    assert.notStrictEqual(mutated, b,
      `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`);
    assert.ok(!c.test(mutated),
      `clause "${c.id}" still passes after its own control removed the thing it checks -- the check is vacuous`);
  }
}

// META-ASSERTION: prove the control-checking above can actually fail. Without this, a future
// clause whose `breaks` is a no-op would sail through `everyClauseHasTeeth`'s first assert only
// because nobody ever exercised the failure path.
function aVacuousMutationFailsItsOwnControl() {
  const b = note();
  assert.throws(
    () => {
      const mutated = b;
      assert.notStrictEqual(mutated, b, "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// The three instruction sites must agree with the note. Cheap, and it is the seam that rots
// silently: a session reads step 9 or 5c, not the standing rule twenty screens above it.
function theInstructionSitesPointAtTheMechanism() {
  const md = fs.readFileSync(GUIDE, "utf8");
  const sites = [
    { where: "step 9 (backlog_items update)", anchor: "Record a before-image for every update" },
    { where: "step 5c (all PASS -> done)", anchor: "backlog_items.status` to `done`" },
    { where: "the tier re-sweep standing rule", anchor: "A sweep is now an `UPDATE` over the `tier` column" },
  ];
  for (const s of sites) {
    const i = md.indexOf(s.anchor);
    assert.ok(i >= 0, `CLAUDE-DESIGN.md no longer carries the ${s.where} instruction (looked for "${s.anchor}")`);
    const line = md.slice(i, md.indexOf("\n", i) < 0 ? undefined : md.indexOf("\n", i));
    assert.ok(/SES-150/.test(line),
      `${s.where} tells a session to record a before-image but does not point at SES-150's attribution rule -- an attended session reading only this line still does not know which column is its own`);
  }
}

// LIVE, and non-mutating by construction: the row this sends is one the constraint must REFUSE, so
// a pass writes nothing. Discriminating because of WHICH error it demands -- the pre-migration
// schema refused the same request with a NOT NULL violation on cycle_id.
async function theConstraintIsLiveAndIsTheCheckNotTheNotNull() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "live ck_before_image_attribution rejection",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent, so the schema half could not be reached from here; " +
      "the source-parsed clauses above still ran.",
    );
    return;
  }
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/runner_before_images`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    // Unattributed on purpose: neither cycle_id nor session_name. Must be refused.
    body: JSON.stringify({ table_name: "zz_ses150_probe", pk_value: "probe", row_data: null }),
  });
  const text = await res.text();
  assert.ok(!res.ok,
    `an UNATTRIBUTED before-image was ACCEPTED (HTTP ${res.status}) -- ck_before_image_attribution is missing or was dropped, and the ledger can now hold rows that name nobody`);
  assert.ok(/ck_before_image_attribution/.test(text),
    `the insert was refused, but not by ck_before_image_attribution (got: ${text.slice(0, 300)}). ` +
    `A NOT NULL violation here means the migration did not land: that is the PRE-SES-150 schema, on which an attended session still cannot write at all.`);
}

async function run() {
  theShippedGuideIsClean();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  theInstructionSitesPointAtTheMechanism();
  await theConstraintIsLiveAndIsTheCheckNotTheNotNull();

  notRun(
    "the ACCEPT direction (an attended row actually landing)",
    "proving it requires writing a real row to the live runner_before_images ledger, which a " +
    "regression run must not do. Evidence is the six-arm live QA on the ship card: attended " +
    "insert ACCEPTED with cycle_id NULL, and unattributed / both-set / blank-name / bogus-FK all " +
    "REJECTED, fixtures deleted and re-asserted at 0.",
  );
}

selfRun(import.meta.url, run);
export default run;
