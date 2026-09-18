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
import { readRemainder, decideStatus, planSettle, UNSETTLEABLE } from "../../scripts/settle-ship.js";

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

  // ---- (D) the four real kickoffs on disk -----------------------------------------------------
  const REAL = [
    ["docs/kickoffs/v7.0.514-SES-413-manager-decides-by-default.md", "partial",
      "its own section 1 says `slice 1 of 4`; this is one of the two rows the prose rule got wrong"],
    ["docs/kickoffs/v7.0.515-SES-415-role-tagged-criteria.md", "partial",
      "its STOP LINE says to close `partial`; the other row the prose rule got wrong"],
    ["docs/kickoffs/v7.0.513-SES-414-final-day-stop.md", "delivered",
      "THE NEGATIVE CONTROL — a sound close-out, and an implementation that always returns `partial` must fail here"],
    ["docs/kickoffs/v7.0.506-SES-385-shipped-slice-stops-advertising.md", "partial",
      "slice 1's own kickoff declares `slice 1 of 2`"],
  ];
  for (const [rel, want, why] of REAL) {
    const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const got = decideStatus({ kickoffText: text });
    assert.strictEqual(got.status, want, `${rel} must settle \`${want}\` — ${why} (got \`${got.status}\`: ${got.reasons.join("; ")})`);
  }

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

  console.log(`[SES-385b] settle-ship: 4 real kickoffs (SES-413 partial, SES-415 partial, SES-414 delivered, SES-385 partial) · settle-ship named ${nRunbook}× in the runbook, ${nRenderer}× in the renderer · runbook ${bytes}B <= ${CEILING}`);
  return ["reader", "decision", "verdict-not-an-input", "planSettle", "real-kickoffs", "mutation-control"];
}

selfRun(import.meta.url, run);
export default run;
