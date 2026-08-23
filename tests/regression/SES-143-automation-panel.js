// DeepBench v7.0.182 | tests/regression/SES-143-automation-panel.js | SES-143
// FEATURE: SES-143 -- §2b, the Automation panel. John's scheduler and drain switches are the
// first controls on the briefing that change what the RUNNER does rather than what a ticket does,
// so the ways this can break are worse than a cosmetic regression: a switch that silently springs
// back to the stored value reads as a tap that was thrown away, and a control counted as a
// "decision waiting" makes §1's counter unable to ever reach zero.
//
// WHY IT RENDERS THE REAL TEMPLATE RATHER THAN A COPY OF THE LOGIC -- the same reason SES-132's
// test does: the properties under test are about where things are CALLED FROM and what the page
// actually emits, not about arithmetic an extracted function could be unit-tested on. The test
// lifts the real `<script id="code">` block out of docs/runbooks/briefing-template.html and runs
// it against a minimal DOM stub. No network, no browser, no credentials.
//
// ASSERTION 3 IS THE DISCRIMINATING ONE. `settingsNow()` must resolve tap-over-DB on `undefined`,
// NOT on falsiness -- because `scheduler_on:false` is a real answer. The obvious implementation,
// `state.settings.scheduler_on || AUTOMATION.scheduler_on`, renders the switch back ON the instant
// John turns it off, which is the single worst behaviour this panel could have. That build passes
// assertions 1, 2, 4 and 5 and fails only this one.
//
// ASSERTION 6 IS THE NEGATIVE CONTROL. "Would this still pass if the change did nothing?" -- so it
// strips the `automationPanel()` call site back out, renders the same fixture, and requires the
// panel to be absent. Without it, every other assertion could be passing on a page that already
// had a panel.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, "..", "..", "docs", "runbooks", "briefing-template.html");

// briefing-state with NO `settings` key at all -- the shape every page published before SES-143
// carries. This is not a hypothetical: it is exactly what the live page held when this shipped.
const NO_SETTINGS = {
  items: {}, directive: "", reading: {}, answers: {}, asks: {}, unblocks: {},
};

// John has turned the scheduler OFF and has not been harvested yet.
const TAPPED_OFF = {
  ...NO_SETTINGS,
  settings: { scheduler_on: false, interval_hours: 6, drain_on: false,
              drain_epic: "Automation", at: "2026-08-23T05:30Z" },
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

// The panel is everything from §2b's heading up to §3's -- so an assertion about "the panel"
// cannot accidentally be satisfied by markup belonging to another section.
const PANEL_OPEN = '<span class="secnum">2b</span>';
const PANEL_CLOSE = '<span class="secnum">3</span>';
function panelOf(html) {
  const a = html.indexOf(PANEL_OPEN);
  if (a === -1) return null;
  const b = html.indexOf(PANEL_CLOSE, a);
  return html.slice(a, b === -1 ? html.length : b);
}
// The masthead is everything before the first section heading.
function mastheadOf(html) {
  const end = html.indexOf('<span class="secnum">');
  return html.slice(0, end === -1 ? html.length : end);
}

const TEMPLATE_HTML = fs.readFileSync(TEMPLATE, "utf8");
const SHIPPED = scriptOf(TEMPLATE_HTML);

// ---------------------------------------------------------------------------
// 1. The panel renders, in its locked position, with all three rows.
// ---------------------------------------------------------------------------
function panelRenders() {
  const html = renderWith(SHIPPED, NO_SETTINGS);
  const panel = panelOf(html);
  assert.ok(panel, "§2b must render -- no section carrying secnum 2b was emitted");
  assert.ok(
    html.indexOf(PANEL_OPEN) > html.indexOf('<span class="secnum">2</span>'),
    "§2b must sit AFTER §2 Daily activity, per the locked section order",
  );
  assert.ok(panel.includes('id="sch-on"'), "row 1 must carry the scheduler checkbox");
  assert.ok(panel.includes('id="sch-n"'), "row 1 must carry the editable every-N-hours box");
  assert.ok(panel.includes('id="drn-on"'), "row 2 must carry the drain checkbox");
  assert.ok(panel.includes('id="drn-epic"'), "row 2 must carry the epic box");
  assert.ok(/Last run:/.test(panel), "row 3 must carry the last-run status line");
  assert.ok(/Next scheduled run:/.test(panel), "row 3 must carry the next-fire line");
  // The drain's status label is shown ALWAYS (spec, verbatim), not only while one is running.
  assert.ok(
    /tickets left|No drain running/.test(panel),
    "the drain status label must render in both states",
  );
}

// ---------------------------------------------------------------------------
// 2. With `settings` ABSENT, the panel reads the cycle-written AUTOMATION values
//    rather than throwing on an undefined -- the failure every other defensive
//    default on this page (SES-99, v7.0.145, SES-127, SES-128) was added to prevent.
// ---------------------------------------------------------------------------
function absentSettingsFallsBackToDb() {
  const panel = panelOf(renderWith(SHIPPED, NO_SETTINGS));
  assert.ok(
    /Scheduler <b>on<\/b>/.test(panel),
    "with no stored tap the label must read the DB's value (AUTOMATION.scheduler_on = true)",
  );
  assert.ok(
    /id="sch-on" checked/.test(panel),
    "the checkbox itself must be checked, not just the label -- they are what John reads together",
  );
  assert.ok(
    /id="sch-n"[^>]*value="3"/.test(panel),
    "the interval box must show AUTOMATION.interval_hours, not a hard-coded literal",
  );
  assert.ok(
    !/Your settings were recorded/.test(panel),
    "with no tap there is nothing to acknowledge -- an unconditional line would be a false receipt",
  );
}

// ---------------------------------------------------------------------------
// 3. THE DISCRIMINATING ONE. An un-harvested tap OUTRANKS the DB, and `false`
//    is a real answer -- a falsy fallback springs the switch back on.
// ---------------------------------------------------------------------------
function tapOutranksDb() {
  const panel = panelOf(renderWith(SHIPPED, TAPPED_OFF));
  assert.ok(
    /Scheduler <b>off<\/b>/.test(panel),
    "John turned the scheduler OFF; a `||` fallback renders it back ON, which is the bug this " +
    "assertion exists to kill",
  );
  assert.ok(
    !/id="sch-on" checked/.test(panel),
    "the checkbox must be unchecked when his stored tap is false",
  );
  assert.ok(
    /id="sch-n"[^>]*value="6"/.test(panel),
    "his typed interval must win over the DB's 3",
  );
  assert.ok(
    /Both switches are off/.test(panel),
    "scheduler off + drain off means nothing runs, and the spec requires the page to say so",
  );
  assert.ok(
    /Your settings were recorded/.test(panel) && panel.includes("2026-08-23T05:30Z"),
    "a recorded tap must be acknowledged with its own timestamp",
  );
}

// ---------------------------------------------------------------------------
// 4. No `data-awaits` anywhere in the panel. A switch is a control, not a
//    decision owed -- and a counter that included it could never reach zero.
// ---------------------------------------------------------------------------
function panelOwesNoDecision() {
  const panel = panelOf(renderWith(SHIPPED, TAPPED_OFF));
  assert.ok(
    !panel.includes("data-awaits"),
    "§2b must carry no data-awaits -- it would inflate §1's decisions-waiting counter permanently",
  );
}

// ---------------------------------------------------------------------------
// 5. The "Run a cycle now" link MOVED. Exactly one copy, and it is on the panel.
// ---------------------------------------------------------------------------
function runLinkMovedNotCopied() {
  const html = renderWith(SHIPPED, NO_SETTINGS);
  const copies = html.split("Run a cycle now").length - 1;
  assert.strictEqual(
    copies, 1,
    `the link must appear exactly once (found ${copies}) -- two copies of one control is how the ` +
    "page starts contradicting itself",
  );
  assert.ok(
    panelOf(html).includes("Run a cycle now"),
    "the one copy must be on §2b's status line",
  );
  assert.ok(
    !mastheadOf(html).includes("Run a cycle now"),
    "it must be GONE from the masthead, on John's explicit instruction in the §2b spec",
  );
}

// ---------------------------------------------------------------------------
// 6. NEGATIVE CONTROL -- strip the call site and the panel disappears.
// ---------------------------------------------------------------------------
function preChangeHasNoPanel() {
  const before = SHIPPED.replace("+ automationPanel()", "+ ''");
  assert.notStrictEqual(
    before, SHIPPED,
    "the negative control must actually strip the call site -- if this fires, automationPanel() " +
    "was renamed or inlined and this control has been silently testing the shipped build",
  );
  const panel = panelOf(renderWith(before, NO_SETTINGS));
  assert.strictEqual(
    panel, null,
    "without the call site there must be no §2b at all -- if a panel still renders, the other " +
    "assertions are not testing this change",
  );
}

async function run() {
  panelRenders();
  absentSettingsFallsBackToDb();
  tapOutranksDb();
  panelOwesNoDecision();
  runLinkMovedNotCopied();
  preChangeHasNoPanel();
}

selfRun(import.meta.url, run);
export default run;
