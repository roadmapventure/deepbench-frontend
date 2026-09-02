// DeepBench v7.0.401 | tests/regression/ses-312-succession-without-cards.test.mjs | SES-312
//
// FEATURE: SES-312 -- guards the three sites that let one milestone hand off to the next with no
// tap anywhere in the path: gate-review.md's § The record and § The decision and the successors,
// gate-review.md's prohibitions 1 and 5, and runner-cycle.md's step 8d property 4 plus the
// "THE ONE DRAIN A CYCLE MAY WRITE" tail passage.
//
// WHAT THE DEFECT WAS, so a later editor does not read any of this as ceremony. gate-review.md
// filed the review as a `gated_before_build` card "for John's Accept"; prohibition 1 said the review
// "writes no backlog_items row" because "his Accept on the card is what files them"; directive
// 0970abad declares the next milestone's drain only once the review is ACCEPTED. SES-285 retired
// the card/tap surface -- so no review could be accepted, no successor could be filed, and no drain
// could be declared. Measured live over the MCP at this ship rather than recalled: the M5 review ran
// attended on 2026-09-02 and left NO runner_items row at all; the M6 gate wrote
// 18500000-0000-4000-8000-0000000000a5 BY HAND so step 8d's sweep would not re-run it; the M5 drain
// 238aa9ca is now `done` and NO M6 drain exists. A hand-written row is not a mechanism.
//
// WHY EACH CLAUSE IS ABOUT ONE WORD. "decides" versus "proposes", "decided" versus "accepted", and
// the absence of "writes no backlog_items row" are the whole ship: the procedure's shape is
// otherwise unchanged, so a regression here would look like a tidy-up rather than a rollback. The
// runbook's tail passage already paid for this once -- its bare "never create a drain row" predated
// 0970abad and would have made a cycle refuse the one declaration John pre-authorised (fixed at
// v7.0.337). This file exists so that reconciliation cannot silently un-happen.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO: run a review. A review transaction files real tickets and
// DECLARES A REAL DRAIN, so a permanent regression test must never execute one -- see the notRun
// declaration at the end. Its behaviour was measured at this ship inside rolled-back DO blocks.
//
// DRY-RUN AGAINST UNCHANGED SOURCE, recorded because a guard written after the change is worthless
// unless it would have failed before it: clauses 1-3 all FAIL on origin/dev's copies of both
// runbooks (none of the strings existed there), and the live arm's directive clause fails there too
// because the amendment had not been written.
//
// Invocation: node tests/regression/ses-312-succession-without-cards.test.mjs
//   (with credentials for the live arm: node --env-file-if-exists=.env.local ...)

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATE = "docs/runbooks/gate-review.md";
const CYCLE = "docs/runbooks/runner-cycle.md";

// The rows this ship touched, held as constants so the live arm asserts on named facts rather than
// on whatever it happens to find.
const DIRECTIVE_SUCCESSION = "0970abad-ac14-44d7-9772-49bc7b769892";
const M5_REVIEW_ROW = "18500000-0000-4000-8000-0000000000a5";
const AMENDMENT_DECISION = "62177395-e2ed-4001-91ac-6bd4aed25eaf";  // recorded 2026-09-02, 72h window

// CRLF is normalised on read for one reason, stated so nobody "simplifies" it away: this repo checks
// out CRLF on Windows and LF in CI, and an index or substring test that disagrees between the two is
// a false green on one of them. gate-review.md is CRLF on disk at this ship and runner-cycle.md is
// LF, which is exactly the mix that makes this line load-bearing rather than defensive.
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// ---------------------------------------------------------------------------
// Slicers. Every clause is graded against a slice anchored on text the edit itself owns -- never
// against the whole file. THE REASON IS SPECIFIC AND NOT STYLE: both runbooks carry header stamps
// that quote the very strings under test (this ship's own gate-review stamp contains the literal
// decision = 'accept'), so a whole-file includes() would pass on the provenance comment while the
// procedure said the opposite. Slicing is what makes each clause about the instruction.
// ---------------------------------------------------------------------------

const H_RECORD = "## The record";
const H_TRANSACTION = "## The decision and the successors, one transaction";
const H_NEVER = "## What a review must never do";
const STEP_8D = "**8d. Milestone gate-review sweep";
const STEP_9 = "**9. Write the record, then die.**";
const TAIL_CARVEOUT = "**THE ONE DRAIN A CYCLE MAY WRITE";

function slice(text, start, end) {
  const a = text.indexOf(start);
  if (a < 0) return null;
  const b = end ? text.indexOf(end, a) : -1;
  return text.slice(a, b < 0 ? text.length : b);
}

const sectionRecord = s => slice(s, H_RECORD, H_TRANSACTION);
const sectionTransaction = s => slice(s, H_TRANSACTION, H_NEVER);
const prohibitions = s => slice(s, H_NEVER, null);
const step8d = s => slice(s, STEP_8D, STEP_9);
const tailCarveout = s => slice(s, TAIL_CARVEOUT, null);

// ---------------------------------------------------------------------------
// The clauses. Exported so a dry-run can grade each one INDEPENDENTLY against origin/dev's copies
// (an assert-and-stop run only ever proves the first one failed).
// ---------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "record-section-writes-the-decision-on-the-row",
    file: GATE,
    test: s => {
      const b = sectionRecord(s);
      return !!b && b.includes("decision = 'accept'") && b.includes("decided_at") &&
             b.includes("decision_reason");
    },
    breaks: [
      s => s.split("**And it is written already decided:** `decision = 'accept'`, `decided_at = now()`, and")
             .join("**And it awaits John's Accept:** nothing is written to"),
      s => s.split("`decision_reason` = **both lenses' verdicts in their own words**")
             .join("the card body carries **both lenses' verdicts in their own words**"),
    ],
    detail:
      "the runner_items row is the ONLY thing directive 0970abad can read as provenance that a " +
      "review reached a verdict, and until this ship it arrived undecided and waited for a tap that " +
      "SES-285 had retired. A record section that does not say the row is written already decided " +
      "puts the handoff back on a surface that no longer exists.",
  },
  {
    id: "record-section-explains-accept-as-a-record-not-a-rating",
    file: GATE,
    test: s => {
      const b = sectionRecord(s);
      // The SECOND half is deliberately the whole claim rather than the bare function name:
      // `apply_ladder_decision()` already appears in this section's `kind` bullet (the B34
      // annotation), so a bare-name test would pass on that older mention and grade nothing --
      // the SES-158 vacuous-control shape, caught by this file's own meta-assertion on first run.
      return !!b && b.includes("runner_items_decision_check") &&
             b.includes("short-circuits every `gated_before_build` row");
    },
    breaks: [
      s => s.split("`runner_items_decision_check` admits exactly").join("the column admits roughly"),
      s => s.split("`public.apply_ladder_decision()` short-circuits every `gated_before_build` row")
             .join("the ladder is not expected to read every `gated_before_build` row"),
    ],
    detail:
      "`accept` is the constraint's vocabulary (four permitted words) and the ladder never reads it " +
      "-- apply_ladder_decision() short-circuits every gated row, which is register B34's reasoning " +
      "and what M6-07 is built on. Without both names here, a later reader has to guess whether " +
      "writing `accept` grants the runner autonomy. It does not, and that is checkable in SQL.",
  },
  {
    id: "transaction-section-names-record_decision-and-the-drain-scope",
    file: GATE,
    test: s => {
      const b = sectionTransaction(s);
      return !!b && b.includes("record_decision(") && b.includes("runner_drain_scope") &&
             /```sql\nDO \$\$/.test(b);
    },
    breaks: [
      // EVERY occurrence, not just the call: the section also names record_decision() in the prose
      // that explains its attribution constraint, so mutating one leaves the clause passing on the
      // other and the control grades nothing (the SES-158 shape).
      s => s.split("record_decision(").join("newDecisionId("),
      // Global for the same reason: the section names runner_drain_scope in the image INSERT, in
      // the scope loop and in the reversal-allowlist paragraph.
      s => s.split("runner_drain_scope").join("the drain's member list"),
      s => s.split("```sql\nDO $$").join("```sql\n-- run each of these in turn"),
    ],
    detail:
      "the transaction is the mechanism, not the presentation. runner-cycle.md 7b carries the reason " +
      "in full: now() is frozen per transaction, so the image's created_at and the row's updated_at " +
      "come out equal; record the decision in one statement and file in the next and " +
      "reverse_decision() counts every row `refused`, restores nothing, and STILL returns " +
      "outcome = 'applied'. A section showing loose statements teaches exactly that failure. " +
      "runner_drain_scope is named because the drain's fixed member list (SES-142 form) is what " +
      "0970abad requires the declaration to copy verbatim.",
  },
  {
    id: "transaction-section-carries-the-reversal-handle",
    file: GATE,
    test: s => {
      const b = sectionTransaction(s);
      return !!b && b.includes("reverse_decision(") && b.includes("decision_id") &&
             b.includes("anti-widening handle");
    },
    breaks: [
      s => s.split("reverse_decision(").join("undoTheDecision("),
      s => s.split("the anti-widening handle:** a review that over-files is one")
             .join("the anti-widening record:** a review that over-files is one"),
    ],
    detail:
      "the anti-widening guarantee did not go away with the tap -- it changed instrument, from " +
      "John's Accept to the decision's own before-images (row_data NULL per filed row, every one " +
      "carrying one decision_id). Drop the handle from this section and the review is filing " +
      "unilaterally with nothing behind it, which IS the widening charter §Closure discipline " +
      "item 3 forbids.",
  },
  {
    id: "prohibition-1-forbids-widening-not-filing",
    file: GATE,
    test: s => {
      const b = prohibitions(s);
      if (!b) return false;
      return b.includes("1. **File a successor it did not name in its own findings") &&
             !b.includes("The review writes **no** `backlog_items` row");
    },
    breaks: [
      s => s.split("1. **File a successor it did not name in its own findings, or file anything outside the decision's\n   transaction.**")
             .join("1. **File a successor member itself.** The review writes **no** `backlog_items` row."),
    ],
    detail:
      "prohibition 1 used to forbid the review filing ANY backlog_items row, because John's Accept " +
      "was what filed them. With that Accept retired the prohibition forbade the whole mechanism and " +
      "the platform could not hand off at all. What it must still forbid is WIDENING: a member " +
      "absent from the review's own text, or a row filed in a second statement no decision_id can " +
      "reach.",
  },
  {
    id: "prohibition-5-forbids-ending-without-a-decision",
    file: GATE,
    test: s => {
      const b = prohibitions(s);
      return !!b && b.includes("5. **End without a decision.**") && b.includes("M6-06");
    },
    breaks: [
      s => s.split("5. **End without a decision.**").join("5. **Rule on a split between the lenses.**"),
      s => s.split("lenses named — never parked (`M6-06`)").join("lenses named — or park it for John"),
    ],
    detail:
      "a split between the lenses is the one case where a review would reach for an escalation, and " +
      "there is nothing to escalate to. Recorded verbatim, then ruled narrow: parking is the retired " +
      "B23 failure wearing the reviewers' clothes, and it is the outcome M6-06 exists to remove.",
  },
  {
    id: "step-8d-property-4-decides-and-files",
    file: CYCLE,
    test: s => {
      const b = step8d(s);
      return !!b && b.includes("The review DECIDES and FILES") &&
             !b.includes("The review PROPOSES successor members; John's Accept FILES them");
    },
    breaks: [
      s => s.split("- **The review DECIDES and FILES, inside one decision it records with a handle**")
             .join("- **The review PROPOSES successor members; John's Accept FILES them**"),
    ],
    detail:
      "step 8d owns WHEN a review runs and cites gate-review.md for WHAT it does, so its four " +
      "properties are where a cycle learns whether it may file. Property 4 said the Accept files " +
      "them; that Accept does not arrive any more, so a cycle reading the old property does nothing " +
      "and the next milestone never starts.",
  },
  {
    id: "step-8d-runs-the-transaction-in-the-tail",
    file: CYCLE,
    test: s => {
      const b = step8d(s);
      return !!b && b.includes("The decision and the successors") && b.includes("decision handle");
    },
    breaks: [
      s => s.split("**Run the review's transaction (`gate-review.md` § *The decision and the successors,\none transaction*) in the step-9 tail")
             .join("**File its card in the step-9 tail with the rest"),
    ],
    detail:
      "\"file its card\" named an artefact that waits. The step now names the transaction and where " +
      "the handle goes, so the cycle's own notes carry the one line John types to undo the whole " +
      "succession inside its window.",
  },
  {
    id: "tail-carveout-requires-a-decision-not-an-accept",
    file: CYCLE,
    test: s => {
      const b = tailCarveout(s);
      if (!b) return false;
      return b.includes("whose review has not been **decided**") &&
             !b.includes("whose review has not been **accepted**") &&
             !b.includes("an undecided review card is not a naming");
    },
    breaks: [
      s => s.split("a milestone whose review has not been **decided** — `decision = 'accept'` on its `runner_items` row")
             .join("a milestone whose review has not been **accepted** — an undecided review card is not a naming; `decision = 'accept'` on its `runner_items` row"),
    ],
    detail:
      "this passage is the ONE carve-out in the prohibition list -- the single drain a cycle may " +
      "write -- and its precondition was John's Accept. A precondition that can never be satisfied " +
      "parks the succession instead of guarding it, which is the B23 failure the whole M6 register " +
      "inverts. The replacement is deliberately TWO-part: the runner_items row survives a reversal " +
      "(it is outside reverse_decision()'s allowlist by design) so reading only the card would let a " +
      "reversed review's drain stand.",
  },
];

// ---------------------------------------------------------------------------

async function run(ctx = {}) {
  const results = [];

  for (const c of CLAUSES) {
    const s = read(c.file);
    assert.ok(c.test(s), `${c.file} lost clause "${c.id}": ${c.detail}`);

    assert.ok(c.breaks.length > 0, `clause "${c.id}" carries no control -- an unguarded clause is a claim`);
    c.breaks.forEach((mutate, i) => {
      const mutated = mutate(s);
      // The SES-158 meta-assertion, checked BEFORE the control itself: a mutation that changed
      // nothing would make the line below pass for the wrong reason forever.
      assert.notStrictEqual(mutated, s,
        `control ${i + 1} for "${c.id}" changed nothing -- it is grading the unmutated file`);
      assert.ok(!c.test(mutated),
        `control ${i + 1} for "${c.id}" still passes after its own mutation -- the clause is not testing what it says`);
    });

    results.push(c.id);
  }

  // The retired heading, held down by name. § The card became § The record; a file carrying BOTH
  // has two homes for one procedure and one of them is the version that waits for a tap.
  const gate = read(GATE);
  assert.ok(!gate.includes("\n## The card\n"),
    "gate-review.md still carries a `## The card` heading. It was retitled `## The record` because " +
    "the row arrives already decided; two headings means two procedures, and the older one describes " +
    "a surface SES-285 retired.");
  results.push("retired-heading-absent");

  await liveArm(ctx, results);
  declareTheLiveTransaction();
  return results;
}

// --- The live arm: the directive amendment and the precedent row it replaces -------------------
async function liveArm(ctx, results) {
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (directive 0970abad's amendment, and the M5 review row's decision)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- anon and authenticated hold ZERO grants on " +
      "runner_directives and runner_items (read from information_schema.role_table_grants at this " +
      "ship), so this arm cannot run on the publishable key. Measured over the MCP instead at this " +
      `ship: 0970abad's body carries the AMENDED clause naming SES-312 and decision ${AMENDMENT_DECISION} ` +
      "(recorded 2026-09-02, 72h window, one runner_directives before-image whose created_at equals " +
      "the decision's decided_at); runner_items " + M5_REVIEW_ROW + " carries decision = 'accept'; " +
      "and no M6 drain-epic directive existed yet. Run with " +
      "node --env-file-if-exists=.env.local tests/regression/run-all.js to grade it.");
    return;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  // The body is read ONCE and only on the branch that needs it: a template literal in an assert
  // message is evaluated on EVERY call, which consumes the body on the happy path too.
  const get = async q => {
    const res = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!res.ok) assert.fail(`PostgREST ${res.status} on ${q}: ${await res.text()}`);
    return res.json();
  };

  const dir = await get(`runner_directives?select=id,body,status&id=eq.${DIRECTIVE_SUCCESSION}`);
  assert.strictEqual(dir.length, 1,
    `directive ${DIRECTIVE_SUCCESSION} (STANDING DRAIN SUCCESSION) is not readable. It is the one ` +
    "pre-authorised exception to drain_epic_next() property 5; without it no milestone may declare " +
    "the next one's drain at all.");
  assert.ok(dir[0].body.includes("AMENDED") && dir[0].body.includes("SES-312"),
    "directive 0970abad's body carries no SES-312 amendment. Its own text conditions the succession " +
    "on a gate review that COMPLETES, and runner-cycle.md rendered that as John's Accept -- a tap " +
    "SES-285 retired. Without the amendment the directive and the runbooks disagree about what " +
    "authorises the next drain, and the runner_directives row is the truth (a0ef9525 §7).");
  results.push("succession-directive-amended");

  const review = await get(`runner_items?select=id,kind,epic_id,decision,display_ref&id=eq.${M5_REVIEW_ROW}`);
  assert.strictEqual(review.length, 1,
    `the M5 milestone-review row ${M5_REVIEW_ROW} is gone. It is step 8d's idempotence key for the ` +
    "M5 epic -- without it the sweep reads M5 as un-reviewed and files the same review every cycle, " +
    "forever.");
  assert.strictEqual(review[0].decision, "accept",
    "the M5 milestone-review row no longer carries decision = 'accept'. That row was written BY HAND " +
    "at the M6 gate because the attended review left none, and it is the precedent this ship turns " +
    "into a mechanism: the value is what 0970abad reads as 'this review reached a verdict'. It is " +
    "deliberately outside reverse_decision()'s allowlist, so nothing but a hand-write can change it.");
  assert.strictEqual(review[0].kind, "gated_before_build",
    "the M5 review row's kind changed. ck_runner_items_epic_id_review_only admits epic_id only on a " +
    "gated_before_build row with a NULL backlog_id, so this is also what keeps the row visible to " +
    "step 8d's sweep.");
  results.push("m5-review-precedent-intact");

  const epics = await get("epics?select=id,name&name=ilike.Selfbuild%20M6*");
  if (epics.length !== 1) {
    notRun(
      "the M6 drain's provenance clause",
      `expected exactly one epic matching 'Selfbuild M6%', found ${epics.length}. The epic was ` +
      "renamed or split, so this clause cannot address the drain it means; fix the selector in the " +
      "same breath as the rename rather than letting it pass over nothing.");
    return;
  }

  const drains = await get(
    `runner_directives?select=id,body,status&type=eq.drain-epic&epic_id=eq.${epics[0].id}`);
  if (drains.length === 0) {
    notRun(
      "the M6 drain's provenance clause (no M6 drain has been declared yet)",
      "the credential arm RAN and the set is genuinely empty -- measured at this ship: the M5 drain " +
      "238aa9ca is `done` and no drain-epic directive names the M6 epic. An empty set is not " +
      "evidence, so it is declared rather than counted as a pass. This clause grades the FIRST drain " +
      "this mechanism declares, and it gets stronger the moment one exists.");
    results.push("m6-drain-not-yet-declared");
    return;
  }

  const uncited = drains.filter(d => !d.body.includes("0970abad")).map(d => d.id);
  assert.deepStrictEqual(uncited, [],
    `these drain-epic directives on the M6 epic cite neither 0970abad nor anything else as ` +
    `provenance: ${uncited.join(", ")}. A drain declared by a gate review MUST cite the directive ` +
    "that pre-authorised it plus the review's own runner_items record -- a drain row with no " +
    "provenance is indistinguishable from a cycle inventing one, which is exactly what " +
    "drain_epic_next() property 5 forbids.");
  results.push(`m6-drain-cites-succession(${drains.length})`);
}

// --- Declared, permanently ---------------------------------------------------------------------
// Called from run(), never at module scope: notRun()'s buffer is module-level and is drained per
// module by run-all.js, so a declaration made at IMPORT time can be attributed to whichever test
// the harness happens to drain next. self-run.js's own header names that failure mode.
function declareTheLiveTransaction() {
notRun(
  "a live gate-review transaction (§ The decision and the successors, end to end)",
  "running one FILES REAL TICKETS AND DECLARES A REAL DRAIN, so a permanent regression test must " +
  "never execute it -- the board is the product, and this is the SES-196 / SES-218 / SES-275 " +
  "refusal applied to the write side. Measured instead at this ship inside two rolled-back DO " +
  "blocks, asserted on the rows written rather than on 'it ran': the forward block produced one " +
  "runner_items row (decision `accept`), one open runner_decisions row (kind `gate`, 72h window), " +
  "two backlog_items successors, one drain-epic directive and SEVEN runner_drain_scope rows (the " +
  "next epic's five open members PLUS the two just filed -- from ONE query, because the successors " +
  "were filed into that epic in the same transaction), with ALL ELEVEN before-images carrying the " +
  "decision id; and reverse_decision() on it returned `applied` with 2 restored, 8 " +
  "restored-but-unverifiable and 1 REFUSED -- the review's own runner_items record, which is " +
  "outside the reversal allowlist by design -- leaving 0 tickets, 0 directives, 0 scope rows, the " +
  "record standing and the decision `reversed`. Zero residue on re-read, both blocks. The negative " +
  "control is the section's own `IF v_dec IS NULL THEN RAISE` guard: ck_before_image_attribution " +
  "catches a mis-attributed image, and only that line catches a filing with no decision at all.");
}

selfRun(import.meta.url, run);
export default run;
