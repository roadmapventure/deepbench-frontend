// DeepBench v7.0.170 | tests/regression/SES-132-orphan-ask-threads.js | SES-132
// FEATURE: SES-132 -- §9.1 "Answered — your past questions". John's typed lines used to vanish
// from the briefing the moment he decided the card or question they were attached to, because
// `thread()` is reachable only from inside a live target (card() and question(), which
// visionClaim() delegates to) and the rebuild drops decided targets. This test guards the
// renderer that keeps them.
//
// WHY IT RENDERS THE REAL TEMPLATE RATHER THAN A COPY OF THE LOGIC. The thing that broke is a
// property of where a function is CALLED FROM, not of what it computes -- a unit test of an
// extracted `orphanThreads()` would pass just as happily on the broken page, because the bug was
// never in that function's arithmetic. So the test lifts the actual `<script id="code">` block
// out of docs/runbooks/briefing-template.html, runs it against a minimal DOM stub, and reads the
// HTML the page assigns to #page. No network, no browser, no credentials.
//
// THE NEGATIVE CONTROL IS THE POINT (assertion 3). "Would it still pass if the change did
// nothing?" -- so the test reconstructs the PRE-SES-132 script by stripping the marker
// substitution back out, renders the SAME fixture through it, and requires ZERO orphan rows.
// An implementation that simply printed every ask unconditionally would satisfy assertions 1
// and 2 and fail assertion 4, and a no-op change would satisfy 3 and fail 1. Each assertion
// kills a different wrong build.
//
// The fixture is a verbatim-shaped slice of real briefing-state read live from the published
// page on 2026-08-23: `q-ladder-streak-reset` is a genuinely orphaned thread (answered on
// 8/21, absent from every rendered section since), and `q-sample-slug` is the id the template's
// own §9 row renders, so it must NOT be duplicated into §9.1.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, "..", "..", "docs", "runbooks", "briefing-template.html");

const ORPHAN_ID = "q-ladder-streak-reset";
const LIVE_ID = "q-sample-slug"; // the id the template's own §9 question row renders

// A slice of real briefing-state. Both entries carry a question AND an answer, so neither is
// filtered out for being empty -- the only thing separating them is whether a section renders
// their target.
const FIXTURE = {
  items: {},
  directive: "",
  reading: { morning: { fable: "20", all: "18", h5: "5", at: "2026-08-22T13:50Z" } },
  answers: {},
  asks: {
    [ORPHAN_ID]: [
      { q: "which one just keeps the count going? no need to reset - why would i do that?",
        at: "2026-08-21T21:35Z",
        a: "Answering \"No\" is the one that keeps the count going." },
    ],
    [LIVE_ID]: [
      { q: "does a new automation ticket jump the lane?",
        at: "2026-08-21T20:40Z",
        a: "Yes -- min(open lane) - 1, never max + 1." },
    ],
  },
  unblocks: {},
};

// ---------------------------------------------------------------------------
// The DOM stub. Deliberately the smallest surface the template actually uses:
// anything beyond this and the stub starts being a browser nobody verified.
// ---------------------------------------------------------------------------
function renderWith(scriptText, state) {
  const captured = { html: null };
  const noopEl = {
    innerHTML: "", textContent: "", outerHTML: "", value: "",
    addEventListener() {}, querySelector() { return null; },
    querySelectorAll() { return []; },
    getAttribute() { return null; }, setAttribute() {},
    classList: { toggle() { return false; }, add() {}, remove() {} },
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

// Count the §9.1 rows by their DOM id prefix, which orphanThreads() owns.
function orphanRowIds(html) {
  return [...html.matchAll(/id="past-([^"]+)"/g)].map(m => m[1]);
}

const TEMPLATE_HTML = fs.readFileSync(TEMPLATE, "utf8");
const SHIPPED = scriptOf(TEMPLATE_HTML);

// ---------------------------------------------------------------------------
// 1. The orphaned thread renders, and it renders John's words and the answer.
// ---------------------------------------------------------------------------
function orphanRenders() {
  const html = renderWith(SHIPPED, FIXTURE);
  const ids = orphanRowIds(html);
  assert.ok(
    ids.includes(ORPHAN_ID),
    `§9.1 must render the orphaned thread ${ORPHAN_ID}; rendered rows were [${ids}]`,
  );
  assert.ok(
    html.includes("Answered &mdash; your past questions"),
    "the §9.1 heading must be present when there is at least one orphan",
  );
  assert.ok(
    html.includes("no need to reset - why would i do that?"),
    "John's own line must appear in the kept thread, not just a count of it",
  );
  assert.ok(
    html.includes("Answering &quot;No&quot; is the one that keeps the count going."),
    "the runner's answer must appear with it -- a thread showing only the question is half kept",
  );
}

// ---------------------------------------------------------------------------
// 2. A thread whose target still renders is NOT duplicated into §9.1.
// ---------------------------------------------------------------------------
function liveTargetNotDuplicated() {
  const html = renderWith(SHIPPED, FIXTURE);
  const ids = orphanRowIds(html);
  assert.ok(
    !ids.includes(LIVE_ID),
    `${LIVE_ID} still renders in §9, so §9.1 must not repeat it; rendered rows were [${ids}]`,
  );
  const occurrences = html.split("does a new automation ticket jump the lane?").length - 1;
  assert.strictEqual(
    occurrences, 1,
    "a live target's thread must appear exactly once on the page, in its own section",
  );
}

// ---------------------------------------------------------------------------
// 3. NEGATIVE CONTROL -- the pre-change page renders zero orphan rows.
//    Without this, assertions 1 and 2 would pass on a page that had always worked.
// ---------------------------------------------------------------------------
function preChangeRendersNothing() {
  const before = SHIPPED.replace(
    /out\.replace\(ORPHAN_MARK, function\(\)\{ return orphanThreads\(\); \}\)/,
    "out",
  );
  assert.notStrictEqual(
    before, SHIPPED,
    "the negative control must actually strip the substitution -- if this fires, the shipped " +
    "call site was renamed and this control has been silently testing the shipped build",
  );
  const html = renderWith(before, FIXTURE);
  assert.deepStrictEqual(
    orphanRowIds(html), [],
    "before SES-132 an orphaned ask had no renderer at all -- this control proves the test " +
    "can fail, and that the 2 rows above are produced by the change and not by the fixture",
  );
  assert.ok(
    !html.includes("no need to reset - why would i do that?"),
    "John's orphaned line was invisible on the pre-change page -- that is the bug being fixed",
  );
}

// ---------------------------------------------------------------------------
// 4. §9.1 owes John no decision, and an empty state renders no section at all.
// ---------------------------------------------------------------------------
function informationNotDecision() {
  const html = renderWith(SHIPPED, FIXTURE);
  const block = html.slice(html.indexOf('id="pastasks"'));
  const upToNextSection = block.slice(0, block.indexOf("<h2"));
  assert.ok(
    !upToNextSection.includes("data-awaits"),
    "§9.1 rows must not carry data-awaits -- a kept thread is information, and inflating §1's " +
    "counter with it is the masthead-disagrees-with-the-page failure countWaiting() prevents",
  );

  const empty = renderWith(SHIPPED, { ...FIXTURE, asks: {} });
  assert.deepStrictEqual(orphanRowIds(empty), [], "no asks means no rows");
  assert.ok(
    !empty.includes("Answered &mdash; your past questions"),
    "with nothing orphaned the section must not render an empty heading",
  );
  assert.ok(
    !empty.includes("SES132-ORPHAN-SLOT"),
    "the marker must never survive into the published page",
  );
}

export default async function run() {
  orphanRenders();
  liveTargetNotDuplicated();
  preChangeRendersNothing();
  informationNotDecision();
}

selfRun(import.meta.url, run);
