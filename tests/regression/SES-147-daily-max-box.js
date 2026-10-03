// DeepBench v7.0.201 | tests/regression/SES-147-daily-max-box.js | SES-147
// FEATURE: SES-147 -- §2b's DAILY MAX box. John, 2026-08-23, verbatim: "In the automation section
// Place a <dailymax> open text box of the millions of tokens allowed during the day. for today set
// it 25M and make sure the routines honor it." Locked spec docs/BRIEFING-REDESIGN-0822.md §2b
// item 3; the arithmetic behind it is migration ses147_daily_max_tokens's resolve_day_token_cap().
//
// WHY THIS IS WORTH A REGRESSION TEST rather than a look at the page: the two ways this row breaks
// are both INVISIBLE in a screenshot and both wrong about money.
//
//   (1) A falsy fallback on a cleared box. `null` is a real answer here -- John emptying the box
//       means "no standing cap, budget as you did before SES-147". `s.daily_max_millions ||
//       AUTOMATION.daily_max_millions` renders his cleared box straight back to 25, so the box
//       cannot be cleared from the page at all, and the page tells him a cap is standing that he
//       just removed. That build passes every other assertion here. Assertion 3 is the only thing
//       between it and John.
//
//   (2) Deriving "In force now" from the box. The box is ONE OF FIVE rungs -- a budget override
//       for one particular day and the 48h stale-reading floor both outrank it -- so `box x
//       1,000,000` is wrong on precisely the days a higher rung fires, which are the days he is
//       looking at this panel. Assertion 4 pins the line to the cycle-written value by giving the
//       fixture a box and an effective cap that DISAGREE, which is the live state on any day an
//       override is running (and was the live state the day this shipped).
//
// ASSERTION 6 IS THE NEGATIVE CONTROL. "Would this still pass if the change did nothing?" -- it
// strips the `dailyMaxRow()` call site back out and requires the box to be gone. Without it every
// assertion above could be passing on a panel that already had the row.
//
// It renders the REAL template (the same harness SES-143's test uses, for the same reason): the
// properties under test are about what the page emits and where values are read from, not about
// arithmetic an extracted function could be unit-tested on. No network, no browser, no credentials.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, "..", "..", "docs", "runbooks", "briefing-template.html");

// A page with no `settings` key at all -- the shape every page published before §2b carries.
const NO_SETTINGS = {
  items: {}, directive: "", reading: {}, answers: {}, asks: {}, unblocks: {},
};

// John has CLEARED the box and has not been harvested yet. `null`, not absent: absent means "he
// never touched it", null means "he took the standing cap off".
const CLEARED = {
  ...NO_SETTINGS,
  settings: { daily_max_millions: null, at: "2026-08-23T18:02Z" },
};

// John has typed 4 and has not been harvested yet, while the DB-written effective cap still says
// 25,000,000 because a one-day override outranks his standing box. The two numbers DISAGREE on
// purpose -- that is what makes assertion 4 discriminating.
const TYPED_4 = {
  ...NO_SETTINGS,
  settings: { daily_max_millions: 4, at: "2026-08-23T18:02Z" },
};

function renderWith(scriptText, state) {
  const captured = { html: null };
  const noopEl = {
    innerHTML: "", textContent: "", outerHTML: "", value: "", checked: false,
    addEventListener() {}, querySelector() { return null; },
    querySelectorAll() { return []; },
    getAttribute() { return null; }, setAttribute() {},
    classList: { toggle() { return false; }, add() {}, remove() {}, contains() { return false; } },
  };
  const stateEl = { ...noopEl, textContent: JSON.stringify(state) };
  const pageEl = {
    ...noopEl,
    set innerHTML(v) { captured.html = v; },
    get innerHTML() { return captured.html || ""; },
  };
  const document = {
    getElementById(id) {
      if (id === "briefing-state") return stateEl;
      if (id === "page") return pageEl;
      return { ...noopEl };
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
  };
  const sandbox = {
    document,
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    window: { claude: { use() { return Promise.resolve(null); } } },
    console,
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function(...Object.keys(sandbox), scriptText);
  fn(...Object.values(sandbox));
  assert.ok(captured.html, "the template's render() must assign #page.innerHTML");
  return captured.html;
}

function scriptOf(html) {
  const open = html.indexOf('<script id="code">');
  assert.ok(open !== -1, 'briefing-template.html must carry a <script id="code"> block');
  const start = open + '<script id="code">'.length;
  const end = html.indexOf("</script>", start);
  assert.ok(end !== -1, "the code block must be closed");
  return html.slice(start, end);
}

// §2b is everything from its own heading up to §3's, so no assertion about "the panel" can be
// accidentally satisfied by markup belonging to another section.
function panelOf(html) {
  const a = html.indexOf('<span class="secnum">2b</span>');
  if (a === -1) return null;
  const b = html.indexOf('<span class="secnum">3</span>', a);
  return html.slice(a, b === -1 ? html.length : b);
}

const TEMPLATE_HTML = fs.readFileSync(TEMPLATE, "utf8");
const SHIPPED = scriptOf(TEMPLATE_HTML);

// ---------------------------------------------------------------------------
// 1. The row renders, inside §2b, carrying the box and the "In force now" line.
// ---------------------------------------------------------------------------
function rowRenders() {
  const panel = panelOf(renderWith(SHIPPED, NO_SETTINGS));
  assert.ok(panel, "§2b must render -- no section carrying secnum 2b was emitted");
  assert.ok(panel.includes('id="dmx"'), "the daily-max box must be inside §2b");
  assert.ok(
    /In force now:/.test(panel),
    "the row must state the cap actually in force -- the box alone tells John what he typed, " +
    "never what the next run will spend",
  );
  assert.ok(
    /min="1"[^>]*max="1000"/.test(panel),
    "the box's range must match the column's own CHECK (1..1000), or the page records values the " +
    "harvest will throw on",
  );
}

// ---------------------------------------------------------------------------
// 2. With `settings` absent, the box shows the cycle-written DB value.
// ---------------------------------------------------------------------------
function absentSettingsShowsDbValue() {
  const panel = panelOf(renderWith(SHIPPED, NO_SETTINGS));
  assert.ok(
    /id="dmx"[^>]*value="25"/.test(panel),
    "with no stored tap the box must show AUTOMATION.daily_max_millions, not a hard-coded literal",
  );
}

// ---------------------------------------------------------------------------
// 3. THE DISCRIMINATING ONE. A CLEARED box stays cleared. `null` is a real
//    answer and a falsy fallback renders the standing cap straight back.
// ---------------------------------------------------------------------------
function clearedBoxStaysCleared() {
  const panel = panelOf(renderWith(SHIPPED, CLEARED));
  assert.ok(
    /id="dmx"[^>]*value=""/.test(panel),
    "John cleared the box; a `||` fallback renders 25 back into it, which means the standing cap " +
    "can never be removed from this page -- the bug this assertion exists to kill",
  );
  assert.ok(
    !/id="dmx"[^>]*value="0"/.test(panel),
    "a cleared box must never render as 0 -- that reads as 'no tokens allowed today', a number " +
    "John never typed",
  );
}

// ---------------------------------------------------------------------------
// 4. "In force now" comes from the cycle-written effective cap, NEVER from the
//    box. The fixture's box (4) and effective cap (25,000,000) disagree, which
//    is the live state on any day an override is running.
// ---------------------------------------------------------------------------
function effectiveCapIsNotDerivedFromBox() {
  const panel = panelOf(renderWith(SHIPPED, TYPED_4));
  assert.ok(
    /id="dmx"[^>]*value="4"/.test(panel),
    "his un-harvested tap must win in the box itself",
  );
  // Read the template's OWN effective-cap value rather than hard-coding one, so this assertion
  // keeps testing the wiring after a cycle changes the sample text.
  const m = /daily_max_effective:\s*'([^']*)'/.exec(SHIPPED);
  assert.ok(m, "AUTOMATION.daily_max_effective must exist -- it is the row's only honest source " +
               "for what the next run will actually spend");
  assert.ok(
    panel.includes(m[1]),
    "the in-force line must render AUTOMATION.daily_max_effective verbatim. A build that computed " +
    "it from the box would print 4,000,000 here and would be wrong on every day an override or " +
    "the 48h stale floor outranks the standing box",
  );
  assert.ok(
    !/In force now:[^<]*<b>[^<]*4,000,000/.test(panel),
    "the in-force line must not be box x 1,000,000",
  );
}

// ---------------------------------------------------------------------------
// 5. No `data-awaits` on the row. A control is not a decision owed -- §1's
//    counter must still be able to reach zero (SES-143's rule, SES-127's call).
// ---------------------------------------------------------------------------
function rowOwesNoDecision() {
  const panel = panelOf(renderWith(SHIPPED, TYPED_4));
  const a = panel.indexOf('id="dmx"');
  const row = panel.slice(Math.max(0, a - 400), a + 900);
  assert.ok(
    !row.includes("data-awaits"),
    "the daily-max row must carry no data-awaits -- it would inflate §1's decisions-waiting " +
    "counter permanently, because a box is always there to be typed in",
  );
}

// ---------------------------------------------------------------------------
// 6. NEGATIVE CONTROL -- strip the call site and the box disappears.
// ---------------------------------------------------------------------------
function preChangeHasNoBox() {
  const before = SHIPPED.replace("+ dailyMaxRow(s)", "+ ''");
  assert.notStrictEqual(
    before, SHIPPED,
    "the negative control must actually strip the call site -- if this fires, dailyMaxRow() was " +
    "renamed or inlined and this control has been silently testing the shipped build",
  );
  const panel = panelOf(renderWith(before, NO_SETTINGS));
  assert.ok(panel, "stripping the row must not take the whole panel with it");
  assert.ok(
    !panel.includes('id="dmx"'),
    "without the call site there must be no daily-max box at all -- if one still renders, the " +
    "assertions above are not testing this change",
  );
  assert.ok(
    !/In force now:/.test(panel),
    "and no in-force line either",
  );
}

async function run() {
  rowRenders();
  absentSettingsShowsDbValue();
  clearedBoxStaysCleared();
  effectiveCapIsNotDerivedFromBox();
  rowOwesNoDecision();
  preChangeHasNoBox();
}

selfRun(import.meta.url, run);
export default run;
