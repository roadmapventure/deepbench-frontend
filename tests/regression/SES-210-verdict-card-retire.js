// DeepBench v7.0.282 | tests/regression/SES-210-verdict-card-retire.js | SES-210
//
// Guards the split SES-210 shipped: a §6 PERMISSION card (gated_before_build) retires when its
// ticket goes terminal; a §5 VERDICT card (ship/test) is retired by its own `decision` and by
// nothing else. Two homes, two halves, and neither is sufficient alone -- the rule lives in
// docs/runbooks/briefing-page.md step 1c AND in public.briefing_open_cards() (migration
// ses210_ship_card_retire_on_decision), because a doc guard cannot see a reverted function body
// and a behavioural arm cannot see a doc that stopped saying why.
//
// WHY THE RULE EXISTS. SES-165 (v7.0.208) retired every card on a terminal ticket, on a premise
// true that day: only John's Accept writes `done` (SES-154), so a ship card on a `done` ticket is
// a card whose verdict already happened. SES-181's interim auto-done bar (v7.0.247) lets an
// `approve` verdict write `done` WITHOUT John, and step 7a promises "the ship card is filed either
// way, so Reverse is always one tap." Measured live 2026-08-28T06:4xZ, that promise was false for
// EIGHT ship cards (SES-135, SE-04, SE-01, SE-06, SES-008, SES-58, SES-61, SES-71) -- deliveries
// the runner marked done on its own authority whose review cards John was never shown. A change
// that is both self-marked done and invisible to the reviewer has certified itself in both halves,
// against SELFBUILD-CHARTER.md premise 3.
//
// THE RULE IS READ OUT OF THE RUNBOOK, never restated here (John's rule 2026-08-23, "you should
// never be throwing away tests"; the SES-194 / SES-176 / SES-158 precedent). A test that copies
// the thing it guards passes forever while the shipped file rots -- and per SES-45 a guard that
// recreates the logic under test is itself the defect.
//
// EVERY DOC CLAUSE IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that
// should matter removed -- plus the SES-158 meta-assertion that a control which changes nothing is
// itself a failure.
//
// THE BEHAVIOURAL HALF IS CREDENTIAL-GATED AND DECLARES ITSELF LOUDLY when it cannot run
// (SES-135's keep-tests policy, John's card 1abe473a). It calls the real function through
// PostgREST rather than reading pg_get_functiondef, which the suite has no path to.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONTRACT = path.join(ROOT, "docs/runbooks/briefing-page.md");

const BLOCK_START = "1c. **THE §5/§6 CARD SET IS ONE CALL";
const BLOCK_END = "Guarded by `tests/regression/DIR-16b3ff73-gated-card-retire.js`.";

// Pure: slice the bounded contract block. "" when absent -- a finding, not a crash.
export function extractBlock(md, start = BLOCK_START, end = BLOCK_END) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// Pure: the load-bearing clauses. A clause earns its place only if REMOVING it would change what a
// cycle (or an editor of the function) does.
export const CLAUSES = [
  {
    id: "kind-splits-the-predicate",
    detail:
      "step 1c must say the terminal predicate is for PERMISSION cards while a VERDICT card retires on its own decision -- without the split the kind-blind SES-165 rule is what an editor restores",
    test: s => /PERMISSION card retires when its ticket is TERMINAL/.test(s) && /VERDICT card is\s*\n?\s*retired by its own `decision`/.test(s),
    breaks: s => s.replace("A PERMISSION card retires when its ticket is TERMINAL", "A card retires when its ticket is TERMINAL"),
  },
  {
    id: "verdict-kinds-are-named",
    detail:
      "the verdict kinds must be named as ship AND test -- §5 renders both, and a rule written for `ship` alone silently re-creates the defect for the first test card ever filed",
    // Anchored to the RULE sentence, not to the bare string: step 1c's render instruction has
    // said "§5 from `kind IN ('ship','test')`" since SES-165, so an unanchored match passes on
    // the pre-change file and guards nothing (caught by this ticket's own file-level control).
    test: s => /verdict cards \(`kind IN \('ship','test'\)`\)[\s\S]{0,60}`decision IS NULL` alone/.test(s),
    breaks: s => s.replace("verdict cards (`kind IN ('ship','test')`)", "verdict cards (`kind = 'ship'`)"),
  },
  {
    id: "gated-keeps-ses165",
    detail:
      "§6's gated_before_build must keep SES-165's terminal predicate -- widening the fix to permission cards would put dead permission questions back on John's page, the defect SES-165 was filed from",
    test: s => /gated_before_build` keeps the terminal predicate/.test(s),
    breaks: s => s.replace("keeps the terminal predicate", "also drops the terminal predicate"),
  },
  {
    id: "delivered-always-renders",
    detail:
      "`delivered` must still always render -- that card IS the Accept mechanism since SES-154, and a predicate reaching into it reopens the acceptance-gating defect",
    test: s => /delivered` ALWAYS renders/.test(s) && /SES-154/.test(s),
    breaks: s => s.replace(/`delivered` ALWAYS renders/g, "`delivered` is treated like any other status"),
  },
  {
    id: "auto-done-is-the-reason",
    detail:
      "the auto-done bar must be named as what falsified SES-165's premise -- without it the split reads as taste and gets 'simplified' back",
    test: s => /auto-done/.test(s) && /SES-181/.test(s),
    breaks: s => s.replace(/auto-done/g, "the ship path"),
  },
  {
    id: "eight-hidden-cards-measured",
    detail:
      "the measurement must name the hidden population -- a rule without its evidence is re-argued every time it is inconvenient, and this one was already re-argued once",
    test: s => /8 were ship cards John has never been shown/.test(s) && /SES-71/.test(s),
    breaks: s => s.replace("8 were ship cards John has never been shown", "some ship cards were affected"),
  },
  {
    id: "sibling-narrowing-rejected",
    detail:
      "the sibling-decision narrowing must be named and rejected WITH its measurement -- it is the first simplification an editor reaches for and it silently re-hides SES-135's card",
    test: s => /no card on that ticket carries a decision/.test(s) && /SES-135/.test(s),
    breaks: s => s.replace(/no card on that ticket carries a decision/g, "the ticket is closed"),
  },
  {
    id: "retired-strip-follows",
    detail:
      "the block must state that §6's retired strip is fixed by the same predicate (build-briefing.mjs filters on !c.render) -- SES-210's addendum is that the strip actively tells John these cards are moot, and an editor who does not know it follows must go and 'fix' it twice",
    test: s => /!c\.render/.test(s) && /strip/.test(s),
    breaks: s => s.replace(/!c\.render/g, "some other filter"),
  },
];

function runDocHalf() {
  const md = fs.readFileSync(CONTRACT, "utf8");
  const block = extractBlock(md);
  assert.ok(block, `SES-210: step 1c block not found in ${CONTRACT} between ${JSON.stringify(BLOCK_START)} and its guard line`);

  for (const c of CLAUSES) {
    assert.ok(c.test(block), `SES-210 [${c.id}]: ${c.detail}`);

    // The negative control: the same block with just that clause removed must FAIL its own test.
    const broken = c.breaks(block);
    // SES-158 meta-assertion: a control that changed nothing proves nothing.
    assert.notStrictEqual(broken, block, `SES-210 [${c.id}]: the negative control changed nothing -- it is vacuous (SES-158's own defect)`);
    assert.ok(!c.test(broken), `SES-210 [${c.id}]: the clause still passes with its own content removed -- the assertion is not discriminating`);
  }
}

async function runLiveHalf() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "SES-210 behavioural arm (briefing_open_cards render split)",
      "needs SUPABASE_URL/SUPABASE_SERVICE_KEY. The function body lives in the database (migration " +
        "ses210_ship_card_retire_on_decision), not in this repo, so a bare suite CANNOT see a reverted " +
        "predicate -- the doc half above passes against a database that has lost the fix. Run: " +
        "SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node tests/regression/SES-210-verdict-card-retire.js"
    );
    return;
  }

  const res = await fetch(`${url}/rest/v1/rpc/briefing_open_cards`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.ok(res.ok, `SES-210: briefing_open_cards() call failed: HTTP ${res.status}`);
  const cards = await res.json();
  assert.ok(Array.isArray(cards), "SES-210: briefing_open_cards() did not return rows");

  // ARM 1 -- the invariant, permanent and never vacuous: the call only ever returns undecided cards
  // (WHERE decision IS NULL), so ANY verdict card it returns with render=false is a verdict John is
  // being denied. This holds whatever the board looks like.
  const hiddenVerdict = cards.filter(c => ["ship", "test"].includes(c.kind) && c.render === false);
  assert.strictEqual(
    hiddenVerdict.length, 0,
    `SES-210: ${hiddenVerdict.length} undecided verdict card(s) are hidden from John: ` +
      `${JSON.stringify(hiddenVerdict.map(c => `${c.kind}:${c.backlog_id}:${c.ticket_status}`))}. ` +
      "A verdict card is retired by its own decision, never by the runner closing the ticket."
  );

  // ARM 1b -- a rendered card must carry no retired_reason, or the page prints a retirement notice
  // on a card it is showing.
  const contradictory = cards.filter(c => c.render === true && c.retired_reason);
  assert.strictEqual(contradictory.length, 0,
    `SES-210: ${contradictory.length} rendered card(s) still carry a retired_reason: ` +
    JSON.stringify(contradictory.map(c => c.backlog_id)));

  // ARM 2 -- THE OTHER DIRECTION, and the one an editor deletes as redundant: a blanket "render
  // everything" passes ARM 1 perfectly while putting dead permission questions back on John's page,
  // which is the SES-165 defect in the other costume. Only assertable while that population exists.
  const gatedTerminal = cards.filter(c => c.kind === "gated_before_build" && ["done", "removed"].includes(c.ticket_status));
  if (gatedTerminal.length === 0) {
    notRun(
      "SES-210 behavioural arm 2 (gated cards still retire)",
      "no undecided gated_before_build card currently sits on a done/removed ticket, so the " +
        "not-a-blanket-render direction has nothing live to assert against. Arm 1 DID run."
    );
  } else {
    const leaked = gatedTerminal.filter(c => c.render !== false);
    assert.strictEqual(
      leaked.length, 0,
      `SES-210: ${leaked.length} gated card(s) on terminal tickets are rendering: ` +
        `${JSON.stringify(leaked.map(c => c.backlog_id))}. SES-165's rule still governs §6 -- ` +
        "permission for work that already exists is not a question, and a blanket render is not the fix."
    );
    assert.ok(gatedTerminal.every(c => c.retired_reason),
      "SES-210: a retired gated card must SAY why (retired_reason) -- nothing vanishes silently");
  }

  // ARM 3 -- SES-154's acceptance loop, unmoved by this change.
  const deliveredHidden = cards.filter(c => c.ticket_status === "delivered" && c.render === false);
  assert.strictEqual(deliveredHidden.length, 0,
    `SES-210: ${deliveredHidden.length} card(s) on delivered tickets are hidden -- that card IS the ` +
    "Accept mechanism (SES-154) and must always render");
}

export default async function run() {
  runDocHalf();
  await runLiveHalf();
  return true;
}

selfRun(import.meta.url, run);
