// DeepBench v7.0.654 | tests/regression/ses-385b-settle-ship.test.mjs | AGT-128 -- TRIGGER 2 NOW
// HAS TO BE ABOUT THIS TICKET, and group (F) below is what stops it going back to any `partial`.
// DeepBench v7.0.519 | tests/regression/ses-385b-settle-ship.test.mjs | SES-385 slice 2 --
// THE CLOSE-OUT SETTLES ITSELF, AND THIS FILE IS WHAT STOPS IT SETTLING WRONG.
//
// THE DEFECT THIS SLICE ANSWERS, measured on the live board 2026-09-18 rather than recalled: slice
// 1 (`v7.0.506`) shipped the `partial` rule as runbook PROSE and shipped check 12 to find the rows
// that ignored it. Both were live, and the rule still failed TWICE THE SAME DAY -- `SES-413`
// ("slice 1 of 4" in its own section 1) and `SES-415` (a STOP LINE saying to close `partial`) each
// read `status = 'delivered'` with `kickoff_link` NULL, and `ship_handoff_census.missing_kickoff`
// read 4. Slice 2 turns the prose into `scripts/settle-ship.js`. This file pins the decision.
//
// WHAT IS PINNED, and why each arm can actually go red:
//
// (A) THE READER, by value on hand-built text. `readRemainder` has two independent halves and each
// one is asserted on a string that isolates it -- a slice with no STOP LINE, a STOP LINE with the
// word, a STOP LINE WITHOUT it (the arm a `.includes("partial")` over the whole file would fail),
// and the word `partial` present with no STOP LINE heading at all (the arm a whole-file regex would
// fail). Those last two are the discriminator: kickoff prose says "partial" about OTHER tickets
// constantly, so an unscoped match would settle almost every ship `partial` and look correct.
//
// (B) THE DECISION, one variable at a time off ONE base fixture ("slice 2 of 2", no STOP LINE
// word). The base reads `delivered`; each trigger added alone must flip it to `partial` and no
// other change is made. That is what makes each of the four triggers provably load-bearing rather
// than four spellings of one.
//
// (C) THE VERDICT IS NOT AN INPUT, asserted as its own arm because it is the thing most likely to
// be "fixed" later by someone who expects `block -> partial`. A `verdict: "block"` on the settled
// base fixture must STILL read `delivered`, and a `verdict: "approve"` on a partial one must STILL
// read `partial`. Both directions, because either alone permits a one-way override.
//
// (D) THE FOUR REAL KICKOFFS on disk, by the answer each one is known to need. These are the
// regression proper: `SES-413` and `SES-415` are the two documents the prose rule was read against
// and got wrong, and `SES-414` is the negative control that must stay `delivered` -- without it an
// implementation that returns `partial` unconditionally passes every other arm in this file.
//
// (F) AGT-128 -- WHOSE `partial` IS IT. Measured on the unchanged reader before this ship, not
// argued: `/\bpartial\b/i` over everything after the heading fired on 46 live kickoffs, and 3 of
// them were talking about somebody else -- `AGT-109` reporting that `AGT-88` "was left `partial`",
// `AGT-129` and `AGT-173` naming a branch inside an `if` that did not happen. All three read
// `partial` on a finished ship, which puts a shipped row back in the pick path (`ticket-owner.js`
// `LIVE` and `audit-board.js` `OPEN` both read `["open","partial"]`). Four of group (F)'s seven
// sentence arms and three of its four real kickoffs were RED on that reader; the other three arms
// were GREEN before and after, which is what says the fix narrowed the trigger instead of moving it.
// Every arm is one sentence dropped into ONE fixture section, so the sentence is the only variable,
// and each is asserted through `stopLineClosesPartial()` AND through the `decideStatus()` it drives
// -- a reader that is right while nothing threads `ticketId` to it is a fix that does not ship.
//
// (E) THE MUTATION CONTROL. `grep -c settle-ship` on `docs/runbooks/runner-cycle.md` and on
// `scripts/render-cycle-card.js` both read ZERO on the unchanged tree, so the two prose halves of
// this slice are pinned by a count that was measured red before the edit rather than asserted after
// it. The runbook is also re-measured against `SES-336`'s byte ceiling here, because this slice
// adds to a file that was 193 bytes under it.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { readRemainder, stopLineClosesPartial, decideStatus, planSettle, UNSETTLEABLE } from "../../scripts/settle-ship.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const CARD_RENDERER_REL = "scripts/render-cycle-card.js";
const CEILING = 381000;

// The base every (B) and (C) arm mutates ONE thing off: a kickoff that declares its last slice and
// says nothing else. It must read `delivered`, or none of the flips below prove anything.
const SETTLED = "# k\n\nslice 2 of 2\n\n## 7. STOP LINE\n\nship it and close the row.\n";

function run() {
  // ---- (A) the reader, by value ------------------------------------------------------------
  assert.deepStrictEqual(readRemainder("a kickoff, slice 1 of 4, of the usual kind").slice, { n: 1, m: 4 },
    "readRemainder must read `slice N of M` out of ordinary prose");
  assert.strictEqual(readRemainder("## 7. STOP LINE\nclose it `partial`, never delivered").stopPartial, true,
    "a STOP LINE naming `partial` must read true");

  const remainsOnly = readRemainder("## 7. STOP LINE\nwork remains for the next cycle");
  assert.strictEqual(remainsOnly.stopPartial, false,
    "a STOP LINE that says only `remains` must read false — `remains` is not the word the rule is written in");
  assert.strictEqual(remainsOnly.slice, null,
    "a document with no `slice N of M` must read a null slice, never a default");

  // THE SCOPE CONTROL. Same word, no heading: a whole-file regex passes this and is wrong.
  assert.strictEqual(readRemainder("SES-99 sits `partial` today and that is fine.\n").stopPartial, false,
    "`partial` in body prose with NO STOP LINE heading must read false — the match is scoped to the section");
  assert.strictEqual(
    readRemainder("`partial` up here.\n\n## 7. STOP LINE\n\nclose it delivered.\n").stopPartial, false,
    "`partial` ABOVE the STOP LINE must not count — the scope starts at the heading, not at the top of the file");

  // ---- (B) the decision, one variable at a time off ONE base --------------------------------
  assert.strictEqual(decideStatus({ kickoffText: "slice 1 of 4" }).status, "partial",
    "N below M is a declared remainder");
  const base = decideStatus({ kickoffText: SETTLED });
  assert.strictEqual(base.status, "delivered",
    "the base fixture must settle `delivered`, or every flip below is vacuous");

  for (const [name, extra] of [
    ["an open gated card", { gatedOpen: true }],
    ["a declared remainder", { remainder: "the second half of the migration" }],
  ]) {
    const got = decideStatus({ kickoffText: SETTLED, ...extra });
    assert.strictEqual(got.status, "partial", `${name} alone must flip the base fixture to \`partial\``);
    assert.ok(got.reasons.length >= 1, `${name} must say why in \`reasons\``);
  }
  // The STOP LINE trigger, mutated into the SAME base rather than a different string.
  assert.strictEqual(
    decideStatus({ kickoffText: SETTLED.replace("ship it and close the row.", "close it `partial`.") }).status,
    "partial", "a STOP LINE naming `partial` alone must flip the base fixture");

  // A remainder that is only whitespace is NOT a declared remainder; otherwise `--remainder=`
  // passed empty by a shell would settle every ship `partial`.
  assert.strictEqual(decideStatus({ kickoffText: SETTLED, remainder: "   " }).status, "delivered",
    "a blank --remainder= must not be read as declared work");

  // ---- (C) the verdict is not an input, BOTH directions -------------------------------------
  assert.strictEqual(decideStatus({ kickoffText: SETTLED, verdict: "block" }).status, "delivered",
    "a block verdict must NOT make a settled record `partial` — the verdict is not an input");
  assert.strictEqual(decideStatus({ kickoffText: "slice 1 of 3", verdict: "approve" }).status, "partial",
    "an approve verdict must NOT override a record that names unbuilt work — a `delivered` there is a bug, never an override");

  // ---- planSettle: the three cells, and the statuses it refuses ------------------------------
  const plan = planSettle({ id: "a-uuid", backlog_id: "SES-999", status: "open" }, "docs/kickoffs/k.md", "partial");
  assert.strictEqual(plan.id, "a-uuid");
  assert.deepStrictEqual(plan.patch, { status: "partial", design_status: null, kickoff_link: "docs/kickoffs/k.md" },
    "the patch is exactly three cells: the status, the cleared flag, and the link this kickoff sets");
  assert.deepStrictEqual(
    planSettle({ id: "b", status: "partial" }, "docs/kickoffs/k.md", "delivered").patch,
    { status: "delivered", design_status: null, kickoff_link: "docs/kickoffs/k.md" },
    "the flag is cleared and the link kept on a `delivered` settle too — the three cells are not conditional on the status");

  for (const bad of UNSETTLEABLE) {
    assert.throws(() => planSettle({ id: "c", backlog_id: "SES-1", status: bad }, "docs/k.md", "partial"),
      new RegExp(bad.replace(/ /g, "\\s")),
      `planSettle must refuse a \`${bad}\` row — settling it would overwrite a decision this script does not make`);
  }
  assert.ok(UNSETTLEABLE.has("done"), "`done` is John's word and must be refused by name");
  assert.throws(() => planSettle({ id: "d", status: "open" }, "docs/k.md", "blocked"),
    /not a status a close-out writes/, "only `partial` and `delivered` are close-out statuses");

  // ---- (D) the real kickoffs on disk, EACH READ AS ITS OWN ID ---------------------------------
  // AGT-128 added the middle column: a kickoff is read as the ticket it belongs to, because that is
  // how `main()` and `ticket-owner.js`'s check 12 call this. `SES-415` is the arm that needs it —
  // its STOP LINE names its OWN id beside the word, so it fires through step 4 and would read
  // `delivered` id-blind. The three `AGT-` rows are the flips measured this cycle: each was
  // `partial` on the old reader and each has a STOP LINE about somebody else or about a branch.
  const REAL = [
    ["docs/kickoffs/v7.0.514-SES-413-manager-decides-by-default.md", "SES-413", "partial",
      "its own section 1 says `slice 1 of 4`; this is one of the two rows the prose rule got wrong"],
    ["docs/kickoffs/v7.0.515-SES-415-role-tagged-criteria.md", "SES-415", "partial",
      "its STOP LINE says to close `partial` and names SES-415 doing it — the other row the prose rule got wrong, and the arm an id-blind reader now fails"],
    ["docs/kickoffs/v7.0.513-SES-414-final-day-stop.md", "SES-414", "delivered",
      "THE NEGATIVE CONTROL — a sound close-out, and an implementation that always returns `partial` must fail here"],
    ["docs/kickoffs/v7.0.506-SES-385-shipped-slice-stops-advertising.md", "SES-385", "partial",
      "slice 1's own kickoff declares `slice 1 of 2`"],
    ["docs/kickoffs/v7.0.584-AGT-109-constant-homes-slice-2.md", "AGT-109", "delivered",
      "AGT-128's first flip: its STOP LINE reports that `AGT-88` was left `partial`, which is a PEER's status and not this ship's"],
    ["docs/kickoffs/v7.0.587-AGT-129-task-file.md", "AGT-129", "delivered",
      "AGT-128's second flip and the one a reader matching only its own id still fails: the sentence names `AGT-129` INSIDE an `if` whose branch did not hold"],
    ["docs/kickoffs/v7.0.648-AGT-173-record-names-paths.md", "AGT-173", "delivered",
      "AGT-128's third flip: `may leave \\`partial\\` ... if this ship's own record passes its own guard` is a conditional, so step 1 skips it"],
  ];
  for (const [rel, ticketId, want, why] of REAL) {
    const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const got = decideStatus({ kickoffText: text, ticketId });
    assert.strictEqual(got.status, want, `${rel} read as ${ticketId} must settle \`${want}\` — ${why} (got \`${got.status}\`: ${got.reasons.join("; ")})`);
  }

  // ---- (F) AGT-128: the STOP LINE has to be closing THIS ticket ------------------------------
  // ONE fixture section, one sentence swapped in, so the sentence is the only variable. `MINE` is
  // the id the section is read AS; every arm that turns on step 4 names it or names a peer.
  const MINE = "AGT-128";
  const sect = (body) => `# k\n\n## 7. STOP LINE\n\n${body}\n`;
  const SENTENCES = [
    ["another ticket's id alone", false,
      "Mark `AGT-88` done in the same close-out -- slice 1 was left `partial` pending this.",
      "`AGT-109`'s live shape: the sentence reports a PEER's status, and the old reader settled this ship `partial` for it"],
    ["this ticket's own id", true,
      "Do NOT write `AGT-128` done -- cycle 2 remains: close `partial`, `design_status` cleared.",
      "step 4 -- the sentence names THIS ticket beside the word, which is the trigger in full"],
    ["no id at all", true,
      "Close the ticket `partial`; the second half of the migration is not built.",
      "step 3 -- a sentence naming no id is the ship speaking about itself, which is how 11 of the 43 that still fire are written"],
    ["`Close as: partial`", true,
      "Close as: partial, and hand the remainder to the next cycle.",
      "step 2 -- the explicit form fires whatever else the section names"],
    ["a conditional naming THIS ticket", false,
      "if arm E had no credentials, write `partial: AGT-128 arm E not run` in the commit body.",
      "`AGT-129`'s live shape and the arm an id-only reader still gets wrong: a branch that may not have happened is not a declaration, and the branch that DID reaches this script as `--remainder=`"],
    ["`Close as: partial` inside an `if`", false,
      "if the migration cannot be applied, Close as: partial.",
      "step 1 runs BEFORE step 2 on purpose -- a conditional explicit form is still a conditional"],
    ["a sentence in the NEXT section", false,
      "ship it and close the row.\n\n## 8. APPENDIX\n\n`AGT-128` was left `partial` last cycle.",
      "the section ENDS at the next `## ` heading; without that bound the reader reads the rest of the file"],
  ];
  for (const [name, want, body, why] of SENTENCES) {
    assert.strictEqual(stopLineClosesPartial(sect(body), MINE), want,
      `(F) ${name} must read ${want} — ${why}`);
    assert.strictEqual(decideStatus({ kickoffText: sect(body), ticketId: MINE }).status,
      want ? "partial" : "delivered",
      `(F) ${name}: decideStatus must carry the reader's ${want} through as \`${want ? "partial" : "delivered"}\` — a reader nothing threads \`ticketId\` to is not a shipped fix`);
  }
  // THE SECTION-END CONTROL. The same appendix sentence with the heading removed is INSIDE section
  // 7, and must read true — otherwise the arm above passes for the wrong reason.
  assert.strictEqual(
    stopLineClosesPartial(sect("ship it and close the row.\n\n`AGT-128` was left `partial` last cycle."), MINE), true,
    "(F control) with the `## 8.` heading gone that same sentence is inside the STOP LINE section and must read true — the arm above must fail because of the BOUND, not because the sentence never matched");
  // THE ID-BLIND CONTROL, both directions. A null `ticketId` still reads step 3 and can never reach
  // step 4: a caller that will not say which ticket it is asking about gets no guess.
  assert.strictEqual(stopLineClosesPartial(sect("Close the ticket `partial`."), null), true,
    "(F control) with no `ticketId`, a sentence naming NO id still fires — step 3 does not need to know whose ship it is");
  assert.strictEqual(stopLineClosesPartial(sect("Do NOT write `AGT-128` done: close `partial`."), null), false,
    "(F control) with no `ticketId`, a sentence naming an id cannot fire — step 4 has nothing to compare against and must not guess that the one id present is this ship's");

  // ---- (E) the mutation control, plus the byte ceiling ----------------------------------------
  const md = fs.readFileSync(path.join(ROOT, RUNBOOK_REL), "utf8");
  const renderer = fs.readFileSync(path.join(ROOT, CARD_RENDERER_REL), "utf8");
  const count = (hay, needle) => hay.split(needle).length - 1;

  const nRunbook = count(md, "settle-ship");
  const nRenderer = count(renderer, "settle-ship");
  assert.ok(nRunbook >= 1,
    `${RUNBOOK_REL} names \`settle-ship\` ${nRunbook} times — it read 0 on the unchanged tree, so the close-out step must now carry the command`);
  assert.ok(nRenderer >= 1,
    `${CARD_RENDERER_REL} names \`settle-ship\` ${nRenderer} times — it read 0 on the unchanged tree, so step 7's card outcome must now carry it`);
  assert.ok(/--ticket=/.test(md) && /--kickoff=/.test(md) && /--cycle-id=/.test(md),
    `${RUNBOOK_REL}: the fenced command must carry --ticket=, --kickoff= and --cycle-id= — a command missing one of them cannot be run as written`);
  assert.ok(/never an override/.test(md),
    `${RUNBOOK_REL}: the clause must say a \`delivered\` on a kickoff naming a remainder is a bug, never an override`);

  const bytes = Buffer.byteLength(md, "utf8");
  assert.ok(bytes <= CEILING,
    `${RUNBOOK_REL} is ${bytes} bytes against SES-336's ceiling of ${CEILING} — this edit had to free bytes before adding any`);

  console.log(`[SES-385b] settle-ship: ${REAL.length} real kickoffs each read as its OWN id (${REAL.map(([, id, want]) => `${id} ${want}`).join(", ")}) · ${SENTENCES.length} AGT-128 sentence arms + 3 controls, 4 of which were RED on the pre-AGT-128 reader · settle-ship named ${nRunbook}× in the runbook, ${nRenderer}× in the renderer · runbook ${bytes}B <= ${CEILING}`);
  return ["reader", "decision", "verdict-not-an-input", "planSettle", "real-kickoffs", "whose-partial", "mutation-control"];
}

selfRun(import.meta.url, run);
export default run;
