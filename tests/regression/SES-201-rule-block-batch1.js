// DeepBench v7.0.368 | tests/regression/SES-201-rule-block-batch1.js | SES-201 (batch 1),
// negative control narrowed to LIVE rules by SES-300 (v7.0.368)
//
// Guards the FOUR sites batch 1 migrated in docs/runbooks/runner-cycle.md -- B12 (step 4b),
// B18 (twice, in step 9) and B34 (step 2) -- from a hand-copied rule statement to a rendered
// {{rule:ID}} block.
//
// THE CHECK IS IMPORTED FROM THE REAL SCRIPT, never reimplemented (John, 2026-08-23: "you should
// never be throwing away tests"). SES-200 guards check 12's LOGIC on fixtures; this file guards
// the real runbook against the real registry, which is a different question and the one that
// regresses: a later edit can re-copy a rule statement into prose without touching the checker.
//
// THE TWO HALVES ARE BOTH REQUIRED AND NEITHER IS SUFFICIENT, which is the thing an editor will
// collapse. "check 12 is quiet on this file" passes just as well if a cycle adds the markers and
// LEAVES the old hand-copies in place, because the marker exempts the whole enclosing paragraph.
// So the absence assertions (the retired copies are gone) and the presence assertions (John's
// reasoning survived, byte-for-byte) are the other half, and they are paired on purpose: an
// absence assertion alone passes vacuously if the string was never what shipped.
//
// John's decision, gated card 064604e5, 2026-08-25, verbatim: "migrate the four sites BY
// JUDGMENT: the rule sentence becomes the rendered {{rule:ID}} block; John's adjacent
// WHY-reasoning (e.g. the B34 ladder ruling) is preserved byte-for-byte."
//
// SES-300 (v7.0.368) — B12's SITE IS GONE, AND THE NEGATIVE CONTROL IS NOW READ OUT OF THE
// REGISTRY. M6-04 superseded B12 (SES-285), and check 12 only considers rules whose status is
// `live` (checkRuleTextOutsideHome's own first line), so removing B12's marker flagged nothing and
// the exemption it guarded was guarding nothing. That is not a test to relax: it is the rendered
// block that was wrong, restating a withdrawn rule in live voice — the same two-homes defect one
// layer down — so SES-300 removed B12's marker and block from the runbook, and the control below
// DERIVES its membership from RULES-SNAPSHOT.md's status column instead of a hand-kept list.
// theLoadBearingControlIsLiveOnlyAndNotEmpty() is what stops that derivation becoming the "skip
// the failing one" move: a live rule may never be excluded, and an empty control is a failure, not
// a pass. B12's half-2 pair below is UNCHANGED and still load-bearing — the hand-copied sentence
// stayed retired and John's reasoning at that site stayed byte-for-byte.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { parseRulesSnapshot, checkRuleTextOutsideHome } from "../../scripts/check-session-docs.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";

// The batch-1 rules whose marker and rendered block STILL STAND in the runbook. B12 was migrated
// here too and is deliberately absent: SES-300 removed its site when M6-04 superseded the rule.
const BATCH_1 = ["B18", "B34"];

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const rules = () => [...parseRulesSnapshot(read(SNAPSHOT_REL)).values()];
const rulesById = () => new Map(rules().map(r => [r.id, r]));
const twelve = findings => findings.filter(f => f.check === "12");

// The subset check 12 can actually see. It reads `rules.filter(r => r.status === "live")`, so a
// superseded rule's marker exempts nothing and its removal flags nothing — the negative control
// below would report a false failure on a runbook that is entirely correct. Membership is the
// registry's own status column, never a hand-kept exclusion list.
const loadBearing = () => {
  const byId = rulesById();
  return BATCH_1.filter(id => byId.get(id)?.status === "live");
};

function findingsFor(text) {
  const out = [];
  checkRuleTextOutsideHome(out, rules(), new Map([[RUNBOOK_REL, text]]));
  return twelve(out);
}

// The rendered form is render-rule-blocks.js's contract, restated here as ONE expression so this
// test fails on a hand-edited block. That script's default mode is still the canonical checker --
// this asserts the same equality at the four batch-1 sites so a drifted block cannot reach dev
// merely because nobody ran the script.
const renderedLine = rule => `> **Rule ${rule.id}** — ${rule.statement}`;

// ---------------------------------------------------------------------------
// Half 1 -- the migration landed
// ---------------------------------------------------------------------------
function theRunbookIsQuietOnCheck12() {
  const found = findingsFor(read(RUNBOOK_REL));
  assert.deepStrictEqual(found.map(f => f.detail), [],
    "check 12 must report nothing against the migrated runbook -- this is SES-201's finish line, " +
    "and John's ongoing rule is 'migrate what the drift checks flag, stop when they go quiet'");
}

function theMarkerIsWhatMakesItQuiet() {
  // NEGATIVE CONTROL, and the one that carries the file: strip the {{rule:ID}} marker comments
  // and the SAME text must flag again. Two things are proven at once -- the quiet above is the
  // marker doing the work rather than the passage having drifted into a paraphrase, and the
  // rendered blocks really are verbatim restatements of the registry rows (a paraphrase would
  // fall under the 0.9 overlap and this control would pass for the wrong reason).
  const stripped = read(RUNBOOK_REL).replace(/<!--\s*\{\{rule:[^}]*\}\}[\s\S]*?-->\n/g, "");
  // The detail opens `rule B12's statement is restated ...` -- capture up to the possessive, not
  // through it, or every id comes back as `B12's` and the assertion below fails on a working control.
  const ids = new Set(findingsFor(stripped).map(f => f.detail.match(/^rule (\S+?)'s\b/)[1]));
  for (const id of loadBearing()) {
    assert.ok(ids.has(id),
      `${id} must flag once its marker is removed -- if it does not, the block under that marker ` +
      `is not a real render of the registry row and the exemption is hiding nothing`);
  }
}

// SES-300. The control above walks a DERIVED list, and a derived list can quietly shrink to
// nothing -- one more supersession and "every member flagged" would be true of the empty set,
// which is the vacuous pass this file's own header warns about. So: the batch may never be empty,
// and membership must be exactly the registry's `live` set. That second half is the discriminating
// one -- it is what fails if a later editor drops a still-live rule out of BATCH_1 to quiet a red
// test, which is how a meta-test becomes decorative.
function theLoadBearingControlIsLiveOnlyAndNotEmpty() {
  const byId = rulesById();
  const batch = loadBearing();
  assert.ok(batch.length > 0,
    `the marker-is-load-bearing control is EMPTY: no batch-1 rule (${BATCH_1.join(", ")}) is ` +
    `\`live\` in ${SNAPSHOT_REL} any more, so nothing here proves a marker still does work. ` +
    `Point BATCH_1 at a live rule's migrated site rather than leaving a control with nothing to check.`);
  for (const id of BATCH_1) {
    const status = byId.get(id)?.status;
    assert.ok(status, `${id} is not in ${SNAPSHOT_REL} -- re-export the snapshot`);
    assert.strictEqual(batch.includes(id), status === "live",
      `${id} is \`${status}\` in the registry but is ${batch.includes(id) ? "in" : "not in"} the ` +
      `load-bearing control. Membership is the registry status and nothing else: a withdrawn rule ` +
      `is excluded because check 12 cannot see it, never because excluding it makes the test green.`);
  }
}

function everyBatch1RuleHasAMarkerInTheRunbook() {
  const text = read(RUNBOOK_REL);
  for (const id of BATCH_1) {
    assert.ok(text.includes(`{{rule:${id}}}`), `${id}'s marker was deleted from ${RUNBOOK_REL}`);
  }
  // B40 predates this ticket (SES-175). It is asserted here so a later trim of this file's
  // markers cannot quietly take the original two with it.
  assert.ok(text.includes("{{rule:B40}}"), "SES-175's B40 marker must survive batch 1");

  // SES-300, the other direction: B12's site is GONE and must stay gone. A withdrawn rule with a
  // rendered block is a doc stating a superseded rule in live voice, which is the defect SES-289
  // annotated one layer up. Asserted on both halves -- the marker and the rendered line -- because
  // a re-render would restore the pair together.
  const byId = rulesById();
  assert.ok(!text.includes("{{rule:B12}}"),
    `B12's marker is back in ${RUNBOOK_REL}. B12 is \`${byId.get("B12")?.status}\` ` +
    `(superseded by ${byId.get("B12")?.superseded_by}) -- a withdrawn rule keeps no rendered block.`);
  assert.ok(!text.includes(renderedLine(byId.get("B12"))),
    `B12's rendered block is back in ${RUNBOOK_REL}, restating a withdrawn rule in live voice.`);
}

function everyRenderedBlockEqualsItsRegistryRow() {
  const text = read(RUNBOOK_REL);
  // check-session-docs.js's parseRulesSnapshot returns an ARRAY (render-rule-blocks.js's
  // same-named reader returns a Map -- the two are deliberate copies, SES-175). Index it here
  // rather than assuming either shape.
  const byId = new Map(rules().map(r => [r.id, r]));
  for (const id of [...BATCH_1, "B40"]) {
    const rule = byId.get(id);
    assert.ok(rule, `${id} is not in ${SNAPSHOT_REL} -- re-export the snapshot`);
    assert.ok(text.includes(renderedLine(rule)),
      `${id}'s rendered block has drifted from the registry statement. Do not hand-edit it: ` +
      `fix public.governance_rules, re-export ${SNAPSHOT_REL}, then run ` +
      `node scripts/render-rule-blocks.js --write`);
  }
}

// ---------------------------------------------------------------------------
// Half 2 -- the retired copies are gone, and John's reasoning is not
// ---------------------------------------------------------------------------
//
// Each pair is one migrated site: the hand-copied sentence that must be ABSENT, and the piece of
// John's own reasoning at that same site that must be PRESENT byte-for-byte. Paired because
// either assertion alone is vacuous -- an absence test passes if the string was never right, and
// a presence test passes with the old copy still sitting beside it.
const SITES = [
  {
    site: "B34 -- step 2, the gated-Accept ladder ruling",
    retired: "**An Accept on a `gated_before_build` card is permission, not a rating — it does NOT touch\n`runner_ladder` (John, 2026-08-21, directive `fb643367`, register B34).**",
    preserved: "Counting \"yes, go ahead\" as\nfive-sixths of a promotion pays the runner for asking permission, which is the one behaviour\nthat must always be free.",
  },
  {
    site: "B12 -- step 4b, the invention pass",
    retired: "Volume widens only by ladder (B12).",
    preserved: "the corpus is the scoring\n   frame, not your generic priors.",
  },
  {
    site: "B18 (a) -- step 9, the plain-language summary columns",
    retired: "\"build the cards FROM the DB's undecided set, never from memory\" is unfollowable",
    preserved: "so the next cycle to rebuild had to re-invent a card's wording from\nscratch — for a card it did not write.",
  },
  {
    site: "B18 (b) -- step 9, the card rebuild source",
    retired: "**Register B18 (SES-B17, 2026-08-20): build the briefing cards FROM the database's undecided",
    preserved: "in-memory reconstruction drifts silently the moment two sessions overlap or a prior\ncycle's card was Reversed after you already forgot it, so the DB is the only trustworthy\nsource.",
  },
];

function theHandCopiedStatementsAreGone() {
  const text = read(RUNBOOK_REL);
  for (const { site, retired } of SITES) {
    assert.ok(!text.includes(retired),
      `${site}: the hand-copied rule statement is still in the file. A marker beside a surviving ` +
      `copy exempts the copy -- check 12 goes quiet and the drift it exists to catch is untouched.`);
  }
}

function johnsReasoningSurvivedByteForByte() {
  const text = read(RUNBOOK_REL);
  for (const { site, preserved } of SITES) {
    assert.ok(text.includes(preserved),
      `${site}: John's adjacent reasoning was lost or reflowed. His card scoped this migration to ` +
      `the rule SENTENCE; the WHY-prose around it is preserved byte-for-byte (card 064604e5).`);
  }
}

function run() {
  theRunbookIsQuietOnCheck12();
  theMarkerIsWhatMakesItQuiet();
  theLoadBearingControlIsLiveOnlyAndNotEmpty();
  everyBatch1RuleHasAMarkerInTheRunbook();
  everyRenderedBlockEqualsItsRegistryRow();
  theHandCopiedStatementsAreGone();
  johnsReasoningSurvivedByteForByte();
}

selfRun(import.meta.url, run);
export default run;
