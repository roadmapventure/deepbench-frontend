// DeepBench v7.0.199 | tests/regression/DIR-16b3ff73-gated-card-retire.js | directive 16b3ff73
// FEATURE: section 6 stops asking John to authorise work that has already shipped.
//
// John found this himself and reported it by pasting a section-6 row straight back at us
// (Rework, 2026-08-23T14:22Z, verbatim): "6.6 Gated CHI-84 Tapping a step chip in chat jumps you
// to that step -- built, but it needs a session you are in". That card was asking his permission
// to build something already done: CHI-84 closed `done` at 15:18Z in an attended session while
// its gated card c4f8b217 sat undecided on his page.
//
// MEASURED BEFORE A LINE CHANGED, and it was not one card: of the 8 undecided runner_items rows
// carrying a ticket id, SEVEN had a ticket already `done`, and FOUR of the FIVE gated cards were
// dead questions (SES-121, SES-118, SES-117, CHI-84). Only AGT-015 was a live ask. Four of the
// five things that section asked him to decide were moot -- which is exactly how an actionable
// section stops being read at all.
//
// THE ONE THAT WOULD HAVE SHIPPED WRONG, and it looks tidier than the right answer: hiding EVERY
// undecided card whose ticket is done. Run live on identical rows, that renders 3 where the
// shipped rule renders 6, and it kills all THREE of that night's ship cards -- hiding the work
// from John and starving the trust ladder, whose only input is his verdict on shipped work. A
// gated card asks "may I build this?" (permission, moot once built); a ship card asks "was this
// good?" (a rating, meaningful forever). Only the first retires.
//
// This test guards the CONTRACT and the boundary, with no database: the live behaviour is asserted
// in the migration's own QA. What can silently regress here is the wording -- someone "simplifying"
// the rule to cover all cards, or dropping the never-decide-for-him clause.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = path.join(HERE, "..", "..", "docs", "runbooks", "briefing-page.md");

export const FN = "public.briefing_open_cards()";

export async function run() {
  const c = fs.readFileSync(CONTRACT, "utf8");

  // ---- 1. The call is named as the card set's source ----------------------------------------
  // FAILS on the pre-change tree: the function did not exist and the contract never named it.
  assert.ok(c.includes(FN),
    `docs/runbooks/briefing-page.md must name ${FN} as the source of the §5/§6 card set — ` +
    `otherwise every rebuild re-derives "WHERE decision IS NULL" by hand and loses the filter`);
  assert.ok(/render/.test(c) && /retired_reason/.test(c),
    "the contract must name both `render` (the filter) and `retired_reason` (why a row is not " +
    "shown) — a rebuild that knows only the filter drops cards silently");

  // ---- 2. The boundary: gated retires, ship/test never does ----------------------------------
  // This is the assertion that kills the tidier-looking wrong build.
  const seg = c.slice(c.indexOf(FN));
  assert.ok(/[Oo]nly GATED cards retire/.test(seg) || /gated cards retire/i.test(seg),
    "the contract must state that ONLY gated cards retire — the ship/test carve-out is the whole " +
    "difference between this rule and the one that hides the night's work");
  assert.ok(/rating/i.test(seg) && /permission/i.test(seg),
    "the contract must keep the permission-vs-rating reasoning: it is why a ship card whose " +
    "ticket is done still renders, and it is the trust ladder's only input");

  // ---- 3. Nothing vanishes silently ----------------------------------------------------------
  assert.ok(/silently/i.test(seg) || /retired count/i.test(seg),
    "the contract must require the retired count to be reported — a card John saw yesterday " +
    "disappearing with no explanation is a different bug wearing this fix's clothes");

  // ---- 4. A card is never decided on his behalf ----------------------------------------------
  // The rule this fix is most likely to be 'improved' into breaking.
  assert.ok(/never decided on his behalf/i.test(seg) || /decision.*stays.*NULL/i.test(seg),
    "the contract must state that a retired card is NOT SHOWN, never ANSWERED — `decision` stays " +
    "NULL and stays John's (ARCHITECTURE.md §19v)");

  // ---- 5. The derivation is not a maintained flag --------------------------------------------
  assert.ok(/DERIVED/i.test(seg),
    "the contract must state that 'still needed' is derived from the ticket's status rather than " +
    "a maintained flag — that is what makes a shipped ticket drop its dead card with no write");
}

export default run;
selfRun(import.meta.url, run);
